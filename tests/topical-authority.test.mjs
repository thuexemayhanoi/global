import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadTopicalMap,validateTopicalMap,coverage,linkPlan,planPromotion,similarity,tokens,allProposals,proposalURL,similarPairs} from "../scripts/seo/topical-authority-core.mjs";
import {menuChildren} from "../scripts/navigation.mjs";
import {readLocalSitemapInventory} from "../scripts/sitemaps.mjs";
import {rewindPromotions} from "./support/promotion-fixture.mjs";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
// The factory may have promoted every PROPOSED candidate; rewind the latest promotion per locale in memory.
const {matrix,map}=rewindPromotions({matrix:read("data/seo/master-matrix.json"),map:loadTopicalMap(process.cwd())});
const board=read("factory/external-writers/assignments.json");
const frozen=read("data/seo/url-freeze.json").urls.map(u=>u.url);
const fails=(m,mx=matrix)=>validateTopicalMap({map:m,matrix:mx,frozenUrls:frozen}).issues;
const clone=()=>structuredClone(map);
const first=(m,locale)=>m.locales[locale].proposals.find(p=>p.status==="PROPOSED");
const MANIFEST={version:1,repo:"thuexemayhanoi/global",purpose:"TOPICAL_MAP_PROMOTION",approved_by:"Test owner",approved_on:"2026-10-14",
 statement:"I approve adding these topical-map candidates to the SEO Matrix as unpublished IDEA rows. This is not publication approval.",candidate_ids:[first(map,"de").candidate_id,first(map,"en").candidate_id]};
// Next free Supporting ID per locale, so the test stays valid after real promotions.
const nextS=code=>code.toUpperCase()+"-S"+String(1+Math.max(0,...matrix.rows.filter(r=>r.locale===code&&/^[A-Z]{2}-S\d+$/.test(r.id)).map(r=>Number(r.id.split("-S")[1])))).padStart(2,"0");

test("the committed 10-locale topical map passes every gate and stays out of the live site",()=>{
 const v=validateTopicalMap({map,matrix,frozenUrls:frozen});
 assert.deepEqual(v.issues,[]);
 assert.equal(Object.keys(map.locales).length,10);
 assert.deepEqual(Object.keys(map.locales).sort(),[...matrix.locales].sort());
 // Capacity per locale: PROPOSED shrinks as owner manifests promote candidates (PROMOTED keeps the count).
 for(const code of matrix.locales)assert.ok(map.locales[code].proposals.filter(p=>p.status==="PROPOSED"||p.status==="PROMOTED").length>=15,code);
 assert.equal(v.auto_publish,false);
 const live=new Set(readLocalSitemapInventory(process.cwd(),matrix.locales).urls);
 const matrixUrls=new Set(matrix.rows.map(r=>r.url));
 for(const p of allProposals(map)){
  const url=proposalURL(p);
  if(p.status==="PROMOTED"){
   // Promoted is a Matrix row, and can legitimately become a published page
   // after the Auto Publisher's independent source, content and live QA.
   const row=matrix.rows.find(r=>r.id===p.matrix_id&&r.url===url);
   assert.ok(row,p.candidate_id+" promoted without its matching Matrix row");
   assert.equal(live.has(url),row.status==="PUBLISHED",p.candidate_id);
  }else{
   assert.ok(!live.has(url),p.candidate_id);
   assert.ok(!matrixUrls.has(url),p.candidate_id);
  }
  assert.equal(p.serp_evidence,"NOT_VALIDATED");
 }
 for(const r of map.references.references)assert.match(r.url,/^https:\/\/[^&]*(?:&(?!amp;)[^&]*)*$/,r.key);
});

test("overlap scoring removes head-entity words and uses bigrams for Chinese and Japanese",()=>{
 assert.deepEqual([...tokens("thuê xe máy xem giá","vi",["xe","thuê"])].sort(),["giá","máy","xem"]);
 assert.ok(tokens("河内长租摩托车","zh",["河内","摩托车"]).has("长租"));
 assert.equal(similarity("Hanoi motorbike rental deposit","motorbike rental deposit Hanoi","en",["hanoi","motorbike","rental"]),1);
 assert.ok(similarity("ハノイ バイク 事故 対応","ベトナム レンタルバイク 故障","ja",["ハノイ","ベトナム","レンタルバイク","バイク"])<0.5);
});

test("cannibalization: exact or near-duplicate intents fail unless explicitly differentiated",()=>{
 const m=clone(),p=first(m,"de");
 p.primary_query="Kaution Motorrad mieten Hanoi Rückzahlung";
 assert.ok(fails(m).some(i=>i.gate==="T4"&&/Exact query collision with DE-S04/.test(i.reason)));
 const n=clone(),q=first(n,"de");
 q.primary_query="motorrad mieten hanoi rückzahlung kaution prüfen";
 assert.ok(fails(n).some(i=>i.gate==="T4"&&/Cannibalization risk vs DE-S04/.test(i.reason)));
 q.distinct_from=[{id:"DE-S04",reason:"Test-only justification long enough to pass the forty char rule."}];
 assert.ok(!fails(n).some(i=>i.gate==="T4"&&/DE-S04/.test(i.reason)));
});

test("a distinct_from reason covers the pair from both sides, also after the later candidate is promoted",()=>{
 const m=clone(),a=first(m,"de"),list=m.locales.de.proposals;
 const next=1+Math.max(...list.map(p=>Number(p.candidate_id.split("-")[2])));
 const b={...structuredClone(a),candidate_id:"TA-DE-"+String(next).padStart(4,"0"),slug:a.slug+"-pruefen",
  working_title:a.working_title.slice(0,100)+" prüfen",primary_query:a.primary_query+" prüfen",secondary_queries:a.secondary_queries.map(q=>q+" prüfen")};
 list.push(b);
 assert.ok(fails(m).some(i=>i.gate==="T4"&&i.id===b.candidate_id&&i.reason.includes(a.candidate_id)));
 b.distinct_from=[{id:a.candidate_id,reason:"Test-only justification long enough to pass the forty char rule."}];
 assert.deepEqual(fails(m),[]);
 // Promotion puts b's Matrix row ahead of every queued proposal in the comparison pool, so the pair is
 // now judged from a's side; the reason b carried (copied onto its row) must still explain it.
 const plan=planPromotion({map:m,matrix,board,manifest:{...MANIFEST,candidate_ids:[b.candidate_id]},validation:validateTopicalMap({map:m,matrix,frozenUrls:frozen})});
 for(const {candidate_id,matrix_id} of plan.promoted){const p=allProposals(m).find(x=>x.candidate_id===candidate_id);p.status="PROMOTED";p.matrix_id=matrix_id;}
 assert.deepEqual(fails(m,plan.matrix),[]);
 // A reason shorter than 40 characters explains nothing, on either side.
 const row=plan.matrix.rows.find(r=>r.id===plan.promoted[0].matrix_id);
 row.distinct_from=[{id:a.candidate_id,reason:"too short"}];
 assert.ok(fails(m,plan.matrix).some(i=>i.gate==="T4"&&i.id===a.candidate_id&&i.reason.includes(row.id)));
});

test("reserved live intents, money amounts, unsupported claims and wrong scripts are refused",()=>{
 const m=clone();
 first(m,"en").working_title="Hanoi pickup checklist for rental scooters explained";
 first(m,"vi").primary_query="thuê xe máy 150k một ngày hà nội";
 first(m,"fr").working_title="Le scooter le moins cher de Hanoï pour les voyageurs";
 first(m,"ja").working_title="Honda Wave rental guide for Hanoi riders";
 first(m,"zh").primary_query="ハノイ バイク 中国";
 const gates=fails(m).map(i=>i.gate+":"+i.id);
 assert.ok(gates.includes("T5:"+first(m,"en").candidate_id));
 assert.ok(gates.includes("T7:"+first(m,"vi").candidate_id));
 assert.ok(gates.includes("T7:"+first(m,"fr").candidate_id));
 assert.ok(gates.includes("T10:"+first(m,"ja").candidate_id));
 assert.ok(gates.includes("T10:"+first(m,"zh").candidate_id));
});

test("hierarchy, governance and research gates fail closed",()=>{
 const m=clone(),p=first(m,"nl");
 p.parent_id="DE-H01";
 const q=m.locales.ko.proposals.find(x=>x.status==="ARCHITECTURE_BLOCKED");q.status="PROPOSED";
 const r=first(m,"es");r.publish=true;
 const s=first(m,"pt");s.references=["pt-portal-comunidades"];
 const t=m.locales.en.proposals[1],copied=m.locales.de.proposals[1];t.primary_query=copied.primary_query;t.working_title=copied.working_title;
 const issues=fails(m),has=(g,id)=>issues.some(i=>i.gate===g&&i.id===id);
 assert.ok(has("T2",p.candidate_id));
 assert.ok(has("T2",q.candidate_id));
 assert.ok(has("T9",r.candidate_id));
 assert.ok(has("T8",s.candidate_id));
 assert.ok(has("T10",t.candidate_id)||has("T10",copied.candidate_id)); // flagged on whichever locale is checked second
});

test("coverage separates live, pipeline and capacity states without double counting",()=>{
 const cov=coverage({map,matrix,claims:read("factory/external-writers/claims.json"),protectedData:read("factory/external-writers/protected-drafts.json")});
 const pipeline=["PUBLISHED","REVIEW","SUBMITTED","WRITING","PLANNED","BLOCKED"].reduce((a,k)=>a+cov.totals[k],0);
 assert.equal(pipeline,matrix.rows.filter(r=>["PILLAR","HUB","SUPPORT"].includes(r.role)).length);
 assert.equal(cov.totals.PROPOSED+cov.totals.ARCHITECTURE_BLOCKED,allProposals(map).filter(p=>p.status!=="PROMOTED").length);
 for(const code of matrix.locales)assert.deepEqual(cov.locales[code].gaps,[],code);
});

test("link plans only render PUBLISHED targets",()=>{
 const plan=linkPlan({map,matrix,id:"TA-EN-0010"});
 assert.equal(plan.hub,"documents-contracts");
 assert.ok(plan.planned.some(x=>x.relation==="topic_pillar"&&x.id==="EN-H03"));
 const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url));
 assert.ok(plan.renderable_now.every(u=>published.has(u)));
 assert.throws(()=>linkPlan({map,matrix,id:"NOPE"}),/Unknown ID/);
});

test("promotion needs the exact owner manifest and only adds balanced IDEA rows",()=>{
 const validation=validateTopicalMap({map,matrix,frozenUrls:frozen});
 const before=JSON.stringify(matrix);
 const plan=planPromotion({map,matrix,board,manifest:MANIFEST,validation});
 assert.equal(JSON.stringify(matrix),before);
 assert.deepEqual(plan.added.map(r=>r.id),[nextS("de"),nextS("en")]);
 assert.ok(plan.added.every(r=>r.status==="IDEA"&&r.serp_evidence==="NOT_VALIDATED"&&r.role==="SUPPORT"));
 assert.equal(plan.publish,false);
 const counts=["W1","W2","W3"].map(w=>plan.board.entries.filter(e=>e.writer===w).length);
 assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
 assert.throws(()=>planPromotion({map,matrix,board,manifest:{...MANIFEST,statement:"yes"},validation}),/exact approval sentence/);
 assert.throws(()=>planPromotion({map,matrix,board,manifest:{...MANIFEST,approved_by:""},validation}),/approved_by/);
 const blocked=allProposals(map).find(p=>p.status==="ARCHITECTURE_BLOCKED").candidate_id;
 assert.throws(()=>planPromotion({map,matrix,board,manifest:{...MANIFEST,candidate_ids:[blocked]},validation}),/ARCHITECTURE_BLOCKED/);
 assert.throws(()=>planPromotion({map,matrix,board,manifest:MANIFEST,validation:{passed:false}}),/failing gates/);
 // After promotion the candidate validates as PROMOTED against its own new row.
 const promoted=clone();
 for(const {candidate_id,matrix_id} of plan.promoted){const p=allProposals(promoted).find(x=>x.candidate_id===candidate_id);p.status="PROMOTED";p.matrix_id=matrix_id;}
 assert.deepEqual(fails(promoted,plan.matrix),[]);
});

test("menus keep exactly two featured Supporting labels per Hub, PUBLISHED first",()=>{
 for(const hub of matrix.rows.filter(r=>r.role==="HUB"))assert.equal(menuChildren(matrix,hub.id).length,2,hub.id);
 const grown=structuredClone(matrix);
 // EN-H01's real children get published over time; keep them IDEA here so the newcomer's PUBLISHED status is what ranks it.
 for(const r of grown.rows)if(r.parent_id==="EN-H01")r.status="IDEA";
 grown.rows.push({...grown.rows.find(r=>r.id==="EN-S01"),id:"EN-S99",url:"/en/guides/test/",status:"PUBLISHED",priority:90});
 assert.deepEqual(menuChildren(grown,"EN-H01").map(r=>r.id),["EN-S99","EN-S01"]);
});

test("prefix-filtered similarPairs returns exactly the brute-force pairs and scores",()=>{
 let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 for(let round=0;round<200;round++){
  const vocab=2+Math.floor(rnd()*60),n=1+Math.floor(rnd()*30);
  const sets=Array.from({length:n},()=>{const s=new Set(),k=Math.floor(rnd()*Math.min(vocab,25));for(let i=0;i<k;i++)s.add("t"+Math.floor(rnd()*vocab));return s;});
  for(const t of [0.34,0.5,0.66]){
   const brute=[];
   for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    const a=sets[i],b=sets[j];if(!a.size||!b.size)continue;
    let inter=0;for(const x of a)if(b.has(x))inter++;
    const s=inter/(a.size+b.size-inter);if(s>=t)brute.push([i,j,Number(s.toFixed(12))]);
   }
   assert.deepEqual(similarPairs(sets,t).map(([i,j,s])=>[i,j,Number(s.toFixed(12))]),brute,"round "+round+" threshold "+t);
  }
 }
});
