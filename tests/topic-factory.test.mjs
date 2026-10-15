import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadTopicalMap,validateTopicalMap,planPromotion} from "../scripts/seo/topical-authority-core.mjs";
import {factoryStatus,duplicateLayers,prepareCorpus,selectRefill,standingManifest,validatePolicy,validateResearchBatch,ingestResearch,fold,dashboardMarkdown,STANDING_STATEMENT} from "../scripts/topic-factory-core.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const policy=read("data/seo/topic-factory/policy.json"),standing=read(policy.standing_policy);
const matrix=read("data/seo/master-matrix.json"),map=loadTopicalMap(root);
const ledger=read("factory/external-writers/claims.json"),registry=read("factory/external-writers/protected-drafts.json");
const frozen=read("data/seo/url-freeze.json").urls.map(u=>u.url);
const ctx={matrix,map,ledger,registry,policy};
const validation=validateTopicalMap({map,matrix,frozenUrls:frozen});
const enHub=matrix.rows.find(r=>r.locale==="en"&&r.role==="HUB"&&r.cluster==="vehicle-choice");

test("policy encodes the owner scope: 10 locales x 1000, 8 domains, refill 100 -> 250, standing policy authorizes promotion only",()=>{
 assert.deepEqual(validatePolicy(policy,standing),[]);
 assert.equal(policy.targets.per_locale,1000);
 assert.equal(policy.refill.ready_threshold,100);
 assert.equal(policy.refill.ready_target,250);
 assert.equal(policy.domains.length,8);
 assert.equal(standing.topic_promotion.statement,STANDING_STATEMENT);
 assert.ok(standing.publication.not_authorized.some(x=>/redirect/i.test(x)));
 assert.ok(validatePolicy({...policy,targets:{...policy.targets,per_locale:5000}},standing).length);
});

test("status counts are disjoint and remaining = target - accepted per locale",()=>{
 const s=factoryStatus(ctx);
 for(const [code,l] of Object.entries(s.locales)){
  const rows=matrix.rows.filter(r=>r.locale===code&&["HUB","SUPPORT"].includes(r.role)&&r.status!=="BLOCKED").length;
  assert.equal(l.published+l.submitted+l.claimed+l.review+l.ready+l.waiting,rows,code);
  assert.equal(l.remaining,Math.max(0,1000-l.accepted));
 }
 assert.equal(s.totals.target,10000);
 const md=dashboardMarkdown(s,{});
 assert.match(md,/\| Locale \| Target \| PUBLISHED \| SUBMITTED \| CLAIMED/);
 assert.doesNotMatch(md,/(ranking|traffic|search volume)\s*[:=]\s*\d/i);
});

test("duplicate layers L1–L5 catch exact, folded, overlapping and look-alike topics; distinct_from only excuses L3–L5",()=>{
 const t=policy.duplicates,stop=[];
 const corpus=prepareCorpus([{id:"X1",locale:"vi",primary_query:"thuê xe máy ở hà nội cần bằng gì",working_title:"Thuê xe máy ở Hà Nội cần bằng lái gì?"}],"vi",stop);
 const hit=(q,title,extra={})=>duplicateLayers({id:"C",locale:"vi",primary_query:q,working_title:title,...extra},corpus,{stop,thresholds:t});
 assert.equal(hit("thuê xe máy ở hà nội cần bằng gì","Khác hẳn")[0].layer,"L1_EXACT_KEYWORD");
 assert.equal(hit("thue xe may o ha noi can bang gi","Khác hẳn")[0].layer,"L2_NORMALIZED_KEYWORD");
 assert.equal(hit("thuê xe máy hà nội cần bằng gì ạ","Tiêu đề hoàn toàn mới")[0].layer,"L3_INTENT_OVERLAP");
 assert.equal(hit("giấy tờ cho người nước ngoài","Thuê xe máy ở Hà Nội cần bằng lái gì vậy?")[0].layer,"L4_TITLE_SIMILARITY");
 const why=[{id:"X1",reason:"X1 answers the licence class question; this covers the foreigner paperwork route."}];
 assert.equal(hit("thuê xe máy hà nội cần bằng gì ạ","Tiêu đề hoàn toàn mới",{distinct_from:why}).length,0);
 assert.equal(hit("thue xe may o ha noi can bang gi","Khác",{distinct_from:why})[0].layer,"L2_NORMALIZED_KEYWORD");
 assert.equal(fold("Đường Hà Nội"),"duong ha noi");
 assert.equal(hit("lịch trình hà giang ba ngày","Lịch trình Hà Giang ba ngày bằng xe máy").length,0);
});

test("refill selects at most 50 gate-clean PROPOSED candidates round-robin by locale need and never transactional or duplicate ones",()=>{
 const sel=selectRefill({...ctx,validation});
 assert.ok(sel.selected.length<=50);
 assert.equal(new Set(sel.selected).size,sel.selected.length);
 const props=new Map(Object.values(map.locales).flatMap(l=>l.proposals).map(p=>[p.candidate_id,p]));
 for(const id of sel.selected){
  const p=props.get(id);
  assert.equal(p.status,"PROPOSED");
  assert.notEqual(p.search_intent,"transactional");
 }
 const perLocale=Object.values(sel.locales).map(l=>l.selected);
 assert.ok(Math.max(...perLocale)-Math.min(...perLocale)<=1,"round robin keeps locales balanced");
 // A copy of an existing Matrix query and a transactional twin are rejected, not promoted.
 const fake=structuredClone(map),L=fake.locales.en;
 const base=L.proposals.find(p=>p.status==="PROPOSED");
 L.proposals.push({...base,candidate_id:"TA-EN-9990",slug:"copy-of-existing-query",primary_query:enHub.primary_query,working_title:"A different title for a copied query"});
 L.proposals.push({...base,candidate_id:"TA-EN-9991",slug:"rent-now-transactional",primary_query:"book motorbike rental hanoi online deposit today",working_title:"Book a Hanoi motorbike online with a deposit today",search_intent:"transactional"});
 const s2=selectRefill({...ctx,map:fake,validation:validateTopicalMap({map:fake,matrix,frozenUrls:frozen}),limit:50});
 assert.ok(!s2.selected.includes("TA-EN-9990")&&!s2.selected.includes("TA-EN-9991"));
 const why=Object.fromEntries(s2.rejected.map(r=>[r.candidate_id,r.reasons.map(x=>x.gate)]));
 assert.ok(why["TA-EN-9990"].includes("F5_DUPLICATE")||why["TA-EN-9990"].includes("F1_TOPICAL_GATES"));
 assert.ok(why["TA-EN-9991"].includes("F4_COMMERCIAL_INTENT"));
});

test("standing manifest names the policy, keeps the exact statement and is accepted by the existing promotion planner",()=>{
 const ids=selectRefill({...ctx,validation,limit:3}).selected;
 const m=standingManifest(ids,{policyPath:policy.standing_policy,date:"2026-10-15"});
 assert.equal(m.approval_mode,"STANDING_POLICY");
 assert.match(m.approved_by,/not a personal owner approval/);
 const plan=planPromotion({map,matrix,board:read("factory/external-writers/assignments.json"),manifest:m,validation});
 assert.equal(plan.added.length,ids.length);
 assert.ok(plan.added.every(r=>r.status==="IDEA"&&r.serp_evidence==="NOT_VALIDATED"));
 assert.equal(plan.publish,false);
});

const batch=(cands,extra={})=>({version:1,repo:"thuexemayhanoi/global",purpose:"TOPIC_RESEARCH_BATCH",
 agent:{name:"test-agent",session:"test-session-01"},researched_on:"2026-10-15",candidates:cands,...extra});
const good={locale:"en",parent_id:enHub.id,subcluster:"vc-trip-fit",slug:"scooter-luggage-capacity-hanoi",
 primary_query:"how much luggage fits on a rental scooter",secondary_queries:["scooter luggage rack vietnam","backpack on motorbike vietnam"],
 search_intent:"informational",word_target:1400,working_title:"How Much Luggage Fits on a Rental Scooter in Vietnam",
 intent_rationale:"Travellers carrying a backpack between cities ask whether a scooter can safely carry it before choosing a bike type.",
 content_angle:"Practical load, rack and strap guidance tied to bike families, not a rental pitch.",
 references:[{url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"FCDO Vietnam safety",checked_on:"2026-10-15"},
  {url:"https://www.smartraveller.gov.au/destinations/asia/vietnam",title:"Smartraveller Vietnam",checked_on:"2026-10-15"}]};

test("research intake rejects invented metrics, missing evidence, new domains without a Hub, transactional intent and in-batch duplicates",()=>{
 const v=validateResearchBatch(batch([
  {...good,search_volume:5400},
  {...good,slug:"x-one",primary_query:"only one reference for this idea",references:[good.references[0]]},
  {...good,slug:"x-two",primary_query:"pho street food tour hanoi evening",parent_id:"EN-NEW-HUB"},
  {...good,slug:"x-three",primary_query:"book scooter hanoi now cheapest",search_intent:"transactional"},
  {...good,slug:"x-four"},{...good,slug:"x-five"}
 ]),{matrix,map,policy});
 const gates=v.issues.map(i=>i.index+":"+i.gate);
 for(const g of ["0:R8","1:R7","2:R3","3:R6","5:R5"])assert.ok(gates.includes(g),g+" in "+gates);
 assert.ok(validateResearchBatch(batch([good],{purpose:"OTHER"}),{matrix,map,policy}).issues.some(i=>i.gate==="R1"));
});

test("six research-open domains accept research-only batches but never enter Writer Matrix before reviewed Hubs",()=>{
 const pending=policy.domains.filter(d=>d.status==="RESEARCH_OPEN");
 assert.equal(pending.length,6);
 assert.equal(map.architecture.proposed_hubs.length,6);
 assert.equal(policy.domains.filter(d=>d.status==="ACTIVE").length,2);
 for(const d of pending){
  const h=map.architecture.proposed_hubs.find(x=>x.id===d.clusters[0]);
  assert.ok(h&&h.clusters.length>=2,d.id);
  const c={...good,domain_id:d.id,parent_id:null,subcluster:h.clusters[0].id,
   slug:"research-"+d.id+"-options",
   primary_query:"independent visitor travel questions about "+d.label.toLowerCase()+" in vietnam",
   working_title:"Independent Travel Planning for "+d.label+" in Vietnam",
   intent_rationale:"Visitors researching this specific Vietnam travel domain need options, location context and realistic independent planning decisions rather than transactional bike booking.",
   content_angle:"Distinct planning questions for independent visitors, grounded in sources and transport context, without imaginary rentals or reviews."};
  const v=validateResearchBatch(batch([c]),{matrix,map,policy});
  assert.equal(v.passed,true,JSON.stringify({domain:d.id,issues:v.issues}));
  const ing=ingestResearch(batch([c]),{matrix,map,policy,source:"test.json",frozenUrls:frozen});
  assert.equal(ing.added.length,1,JSON.stringify({domain:d.id,rejected:ing.rejected}));
  const p=ing.map.locales.en.proposals.find(x=>x.candidate_id===ing.added[0].candidate_id);
  assert.equal(p.status,"ARCHITECTURE_BLOCKED");
  assert.equal(p.parent_id,null);
  assert.equal(p.cluster,h.id);
  const checked=validateTopicalMap({map:ing.map,matrix,frozenUrls:frozen});
  assert.equal(checked.issues.filter(x=>x.id===p.candidate_id).length,0,JSON.stringify({domain:d.id,issues:checked.issues.filter(x=>x.id===p.candidate_id)}));
  const refill=selectRefill({...ctx,map:ing.map,validation:checked});
  assert.ok(!refill.selected.includes(p.candidate_id),"unparented research is not publishable or claimable");
  assert.ok(validateResearchBatch(batch([{...c,parent_id:"EN-NOT-A-HUB"}]),{matrix,map,policy}).issues.some(x=>x.gate==="R3"));
  assert.ok(validateResearchBatch(batch([{...c,domain_id:"motorbike-rental"}]),{matrix,map,policy}).issues.some(x=>x.gate==="R3"));
 }
});

test("ingest assigns the next TA ID, registers references, passes T1–T10 and is replay-safe",()=>{
 const r=ingestResearch(batch([good]),{matrix,map,policy,source:"test.json",frozenUrls:frozen});
 assert.equal(r.added.length,1,JSON.stringify(r.rejected));
 const id=r.added[0].candidate_id,nums=map.locales.en.proposals.map(p=>Number(p.candidate_id.split("-")[2]));
 assert.equal(id,"TA-EN-"+String(Math.max(...nums)+1).padStart(4,"0"));
 const p=r.map.locales.en.proposals.find(x=>x.candidate_id===id);
 assert.equal(p.status,"PROPOSED");assert.equal(p.serp_evidence,"NOT_VALIDATED");
 assert.ok(p.references.every(k=>r.map.references.references.some(x=>x.key===k)));
 assert.equal(validateTopicalMap({map:r.map,matrix,frozenUrls:frozen}).issues.filter(i=>i.id===id).length,0);
 assert.equal(map.locales.en.proposals.some(x=>x.candidate_id===id),false,"input map untouched");
 const again=ingestResearch(batch([{...good,slug:"scooter-luggage-capacity-hanoi-2"}]),{matrix,map:r.map,policy,source:"test.json",frozenUrls:frozen});
 assert.equal(again.added.length,0);
 assert.ok(again.rejected.some(x=>x.gate==="F5_DUPLICATE"));
});

test("trusted-only mutations: ingest and refill --apply refuse outside the Topic Factory workflow",()=>{
 for(const args of [["ingest","--branch","research/x","--sha","a".repeat(40)],["refill","--apply"]]){
  const r=spawnSync(process.execPath,["scripts/topic-factory.mjs",...args],{cwd:root,encoding:"utf8",env:{...process.env,GITHUB_ACTIONS:"",GITHUB_WORKFLOW:""}});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/FACTORY_REFUSED/);
 }
});

test("scale: 10 locales x 1000 synthetic candidates are deduplicated and selected within budget",()=>{
 const words="river mountain market temple coffee bridge island valley lake pass trail village night morning rain season museum lantern bay cave".split(" ");
 const big=structuredClone(map);
 let n=0;
 for(const code of policy.targets.locales){
  const L=big.locales[code],hub=matrix.rows.find(r=>r.locale===code&&r.role==="HUB"&&r.cluster==="vehicle-choice");
  const base=L.proposals.find(p=>p.status==="PROPOSED"&&p.parent_id===hub.id)||L.proposals.find(p=>p.status==="PROPOSED");
  for(let i=0;i<1000;i++){
   const a=words[i%20],b=words[Math.floor(i/20)%20],c=words[Math.floor(i/400)%20];
   L.proposals.push({...base,candidate_id:"TA-"+code.toUpperCase()+"-"+String(5000+i),slug:"synthetic-"+code+"-"+i,
    primary_query:"synthetic "+a+" "+b+" "+c+" "+i,working_title:"Synthetic topic "+a+" "+b+" "+c+" number "+i,distinct_from:undefined});
   n++;
  }
 }
 const t0=Date.now();
 const sel=selectRefill({...ctx,map:big,validation:{issues:[]},limit:50});
 const ms=Date.now()-t0;
 assert.equal(n,10000);
 assert.equal(sel.selected.length,50);
 assert.ok(ms<60000,"selection over 10k candidates took "+ms+"ms");
});
