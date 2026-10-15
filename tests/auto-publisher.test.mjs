import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {classify,editorial,contentDuplicates,shingles,validateReview,eligibility,publicationRecord,nextStage,isOfficial,REVIEW_CHECKS} from "../scripts/auto-publisher-core.mjs";
import {checkArticle,renderArticle,validatePublicationRecord} from "../scripts/articles.mjs";
import {scanHtml} from "../scripts/seo/fact-guard-core.mjs";

const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const matrix=read("data/seo/master-matrix.json"),locales=read("content/locales.json");
const policy=read("data/seo/topic-factory/policy.json"),standing=read("approvals/standing-policy-20261015.json");
const hub=matrix.rows.find(r=>r.locale==="en"&&r.role==="HUB"&&r.cluster==="vehicle-choice");
const legalHub=matrix.rows.find(r=>r.locale==="en"&&r.role==="HUB"&&r.cluster==="documents-contracts");
const H="a".repeat(64),C="b".repeat(40);
// Deterministic varied fixture prose (the gates under test reject repetitive templates, as they should).
const VOCAB=("scooter semi-automatic clutch gearbox throttle brake tyre mirror helmet rain jacket backpack rack strap fuel tank range hill pass valley "+
 "ring road traffic junction roundabout market alley bridge river lake temple museum morning evening weekend holiday route loop village mountain "+
 "experience beginner rider passenger luggage weight height comfort seat suspension engine battery charge station petrol electric quiet noise "+
 "rental shop owner contract deposit photo video record scratch dent receipt question answer plan budget map phone signal parking ticket guard "+
 "night light lamp horn indicator lane bus truck taxi bicycle pedestrian crossing signal sign speed limit caution distance gap patience").split(" ");
const STOPW=["the","and","you","for","with","that","your","are"];
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const sentence=()=>{const w=[];for(let i=0;i<14;i++)w.push(i%3===1?STOPW[Math.floor(rnd()*STOPW.length)]:VOCAB[Math.floor(rnd()*VOCAB.length)]);return w.join(" ").replace(/^./,c=>c.toUpperCase())+".";};
const para=n=>Array.from({length:n},sentence).join(" ");
function packet(extra={}){
 const body=["Choosing a bike type starts with honest questions about your experience. Read the [rental checklist](/en/checklist/) and the [English guide](/en/) first.",
  "## Scooter or semi-automatic",para(12),"## Engine size and licence",
  "Vietnam's Law 36/2024/QH15, Article 57, puts two-wheelers up to 125 cm³ in class A1 and larger ones in class A, as the [government portal](https://xaydungchinhsach.chinhphu.vn/x.htm) explains.",
  "## Routes and luggage",para(20),"## Electric or petrol",para(18),
  "## Before you ride",para(12),"Further reading: [FCDO](https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security) and [Smartraveller](https://www.smartraveller.gov.au/destinations/asia/vietnam)."].join("\n\n");
 return {matrix_id:hub.id,locale:"en",proposed_url:hub.url,title:"Choosing a Rental Motorbike in Hanoi: Scooter, Semi-Auto or Clutch",
  meta_description:"How to choose between a scooter, a semi-automatic and a clutch motorbike in Hanoi by experience, route, luggage and licence class before renting.",
  h1:"Choosing a rental motorbike in Hanoi",body_markdown:body,
  sources:[{url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"FCDO",checked_on:"2026-10-15"},{url:"https://www.smartraveller.gov.au/destinations/asia/vietnam",title:"Smartraveller",checked_on:"2026-10-15"}],
  serp_intent_checked:false,facts_reviewed_by_human:false,editorial_notes:"test",writer_session:"w9-test",...extra};
}
const claim={id:hub.id,writer:"W1",session:"w1-writer",branch:"writer/w1-writer",status:"SUBMITTED",source_sha256:H,source_commit:C};
const review=(extra={})=>({version:1,purpose:"EDITORIAL_REVIEW",matrix_id:hub.id,source_sha256:H,reviewer:{agent:"independent-ai",session:"review-ai-01",human:false},
 reviewed_on:"2026-10-15",checks:Object.fromEntries(REVIEW_CHECKS.map(k=>[k,"PASS"])),verdict:"PASS",sources_checked:["https://www.gov.uk/"],
 notes:"Checked the licence-class statement against the cited government page and the route advice against FCDO; language reads natively.",...extra});
const ctx=(extra={})=>({packet:packet(),claim,row:hub,matrix,locales,policy,standing,protectedIds:new Set(),corpus:[],review:review(),state:{stage:"PILOT",published:[]},...extra});

test("official evidence allowlist: governments, UN treaties and statute-text databases yes; blogs no",()=>{
 for(const u of ["https://www.gov.uk/x","https://travel.state.gov/x","https://chinhphu.vn/x","https://xaydungchinhsach.chinhphu.vn/x","https://www.vn.emb-japan.go.jp/x","https://0404.go.kr/x","https://treaties.un.org/x","https://luatvietnam.vn/x","https://www.detran.sp.gov.br/x"])assert.ok(isOfficial(u),u);
 for(const u of ["https://hagiangtrips.com/x","https://vexere.com/x","https://example.com/gov.uk","not a url"])assert.ok(!isOfficial(u),u);
});

test("hard legal claims need an official citation in the same paragraph; plain advice does not",()=>{
 const p=packet({body_markdown:"Check which categories are printed on your licence before you choose.\n\nRiding without the right class can mean a fine or jail after a crash.\n\nUnder Decree 168/2024/ND-CP the [fine is set by the government](https://chinhphu.vn/x)."});
 const c=classify(p,hub,policy);
 assert.equal(c.sensitive_paragraphs,2);
 assert.equal(c.unsupported.length,1);
 assert.match(c.unsupported[0],/fine or jail/);
 assert.equal(classify(packet({body_markdown:"Mopeds under 50 cc need no licence, per a [blog](https://someblog.com/x)."}),hub,policy).unsupported.length,1);
 assert.equal(classify(packet({body_markdown:"A deposit of 3,000,000 VND is common."}),hub,policy).money_paragraphs,1);
 assert.equal(classify(packet(),legalHub,policy).topicClass,"LEGAL");
});

test("editorial heuristics catch wrong language, repeated paragraphs, keyword stuffing and missing internal context links",()=>{
 assert.equal(editorial(packet(),hub).passed,true,JSON.stringify(editorial(packet(),hub).issues));
 const deText=Array.from({length:40},(_,i)=>"Der Roller ist für die Stadt gut, und die Fahrerin prüft das Licht nicht nur am Abend, sondern auch bei Regen Nummer "+i+".").join(" ");
 const de=packet({body_markdown:"Siehe die [Checkliste](/en/checklist/).\n\n## Eins\n\n"+deText+"\n\n## Zwei\n\n"+deText.replace(/Nummer/g,"Tag")+"\n\n## Drei\n\nText\n\n## Vier\n\nText"});
 assert.ok(editorial(de,hub).issues.some(i=>i.startsWith("E1")));
 const dup="This exact paragraph is long enough to count and it repeats itself word for word in the article body.";
 assert.ok(editorial(packet({body_markdown:packet().body_markdown+"\n\n"+dup+"\n\n"+dup}),hub).issues.some(i=>i.startsWith("E2")));
 const stuffed=packet({body_markdown:packet().body_markdown+"\n\n"+Array(8).fill(hub.primary_query).join(". ")});
 assert.ok(editorial(stuffed,hub).issues.some(i=>i.startsWith("E4")));
 assert.ok(editorial(packet({body_markdown:packet().body_markdown.replace(/\]\(\/en\/(?:checklist\/)?\)/g,"](https://x.gov.uk/)")}),hub).issues.some(i=>i.startsWith("E6")));
});

test("content duplicate layers L6/L7: near-copies fail, distinct articles pass",()=>{
 const p=packet();
 const copy={id:"EN-S99",locale:"en",kind:"published",body_markdown:p.body_markdown.replace("Choosing","Picking")};
 const other={id:"EN-S98",locale:"en",kind:"draft",body_markdown:"Insurance in Vietnam works differently. "+para(3).replace(/Riders/g,"Insurers")};
 const hits=contentDuplicates(p,[copy,other]);
 assert.equal(hits.find(h=>h.with==="EN-S99").level,"FAIL");
 assert.ok(!hits.some(h=>h.with==="EN-S98"&&h.level==="FAIL"));
 assert.ok(shingles("中文内容测试中文内容测试中文内容测试","zh").size>0);
});

test("independent review must match the exact draft hash, come from another session and never claim to be human",()=>{
 const pk=packet();
 assert.deepEqual(validateReview(review(),{packet:pk,claim}),[]);
 assert.ok(validateReview(review({source_sha256:"c".repeat(64)}),{packet:pk,claim}).some(e=>/hash/.test(e)));
 assert.ok(validateReview(review({reviewer:{agent:"same",session:"w9-test"}}),{packet:pk,claim}).some(e=>/independent/.test(e)));
 assert.ok(validateReview(review({reviewer:{agent:"x",session:"review-ai-01",human:true}}),{packet:pk,claim}).some(e=>/human/.test(e)));
 assert.ok(validateReview(review({checks:{...review().checks,factual_accuracy:"FAIL"}}),{packet:pk,claim}).length);
});

test("eligibility: automated QA approves without reviewer; still blocks bad facts, parent, stage, protected",()=>{
 const ok=eligibility(ctx());
 assert.equal(ok.decision,"APPROVED_BY_POLICY",JSON.stringify(ok.gates.filter(g=>!g.passed)));
 assert.equal(eligibility(ctx({review:null})).decision,"APPROVED_BY_POLICY");
 assert.equal(eligibility(ctx({row:legalHub,packet:packet({matrix_id:legalHub.id,proposed_url:legalHub.url})})).decision,"REVIEW_REQUIRED");
 assert.equal(eligibility(ctx({packet:packet({body_markdown:packet().body_markdown+"\n\nA typical deposit is 3,000,000 VND per [Vexere](https://vexere.com/x)."})})).decision,"REVIEW_REQUIRED");
 assert.equal(eligibility(ctx({protectedIds:new Set([hub.id])})).decision,"BLOCKED");
 assert.equal(eligibility(ctx({state:{stage:"PILOT",published:[{locale:"en"},{locale:"en"}]}})).decision,"WAIT_STAGE");
 const child=matrix.rows.find(r=>r.locale==="en"&&r.role==="SUPPORT"&&r.parent_id===hub.id&&r.status==="IDEA");
 if(child)assert.equal(eligibility(ctx({row:child,packet:packet({matrix_id:child.id,proposed_url:child.url}),review:review({matrix_id:child.id})})).decision,"WAIT_PARENT");
 assert.equal(eligibility(ctx({packet:packet({body_markdown:"## a\n\nshort"})})).decision,"REJECTED");
});

test("source titles are fact-checked like the rendered reference list, so the pre-commit fact guard cannot pause the queue",()=>{
 const priced=packet({sources:[{url:"https://vietnamnews.vn/economy/1724202/swap.html",title:"Vietnam News: battery swap costs 200,000 VND per month",checked_on:"2026-10-15"},
  {url:"https://www.smartraveller.gov.au/destinations/asia/vietnam",title:"Smartraveller",checked_on:"2026-10-15"}]});
 // The published page lists source titles; the site fact guard that runs before the publish commit reads them.
 const rec=publicationRecord({claim,reviewSha:null,now:"2026-10-15T01:00:00.000Z",stage:"PILOT"});
 const html=renderArticle({...priced,publication:rec},locales.find(l=>l.code==="en"),{...hub,status:"PUBLISHED"},matrix);
 assert.ok(scanHtml(html,{locale:"en"}).some(f=>f.level==="FAIL"&&f.code==="UNSOURCED_AMOUNT"),"this page would fail the pre-commit fact guard");
 // Eligibility stops that one draft with a repairable G1 failure instead of approving it.
 const e=eligibility(ctx({packet:priced}));
 assert.equal(e.decision,"REJECTED");
 assert.ok(e.gates.some(g=>g.gate==="G1_DRAFT_QA"&&!g.passed&&/UNSOURCED_AMOUNT in sources\[0\]\.title/.test(g.detail)),JSON.stringify(e.gates.filter(g=>!g.passed)));
 // Writer QA (warn mode) only warns before submission.
 const w=checkArticle({...priced,serp_intent_checked:true,facts_reviewed_by_human:true},matrix,locales,{factMode:"warn",allowUnpublishedParentForDraft:true});
 assert.ok(!w.errors.some(x=>/sources\[0\]/.test(x)),w.errors.join("; "));
 assert.ok(w.warnings.some(x=>/UNSOURCED_AMOUNT in sources\[0\]\.title/.test(x)));
 assert.equal(eligibility(ctx()).decision,"APPROVED_BY_POLICY","plain source titles are unaffected");
});

test("stored policy articles: honest record accepted, human-review claims refused, provenance note rendered",()=>{
 const rec=publicationRecord({claim,reviewSha:null,now:"2026-10-15T01:00:00.000Z",stage:"PILOT"});
 assert.equal(rec.qa_mode,"AUTOMATED_G1_G5_G7");
 assert.equal(rec.review_sha256,null);
 assert.ok(validatePublicationRecord({...rec,qa_mode:"UNKNOWN"}).length);
 assert.deepEqual(validatePublicationRecord(rec),[]);
 const art={...packet(),publication:rec};
 const pend=new Set([hub.id]);
 const qa=checkArticle(art,matrix,locales,{pending:pend,factMode:"strict",assetsRoot:"."});
 assert.ok(!qa.errors.some(e=>/Human editorial|SERP|policy/i.test(e)),qa.errors.join("; "));
 assert.ok(checkArticle({...art,facts_reviewed_by_human:true},matrix,locales,{pending:pend}).errors.some(e=>/keep human-review/.test(e)));
 assert.ok(validatePublicationRecord({...rec,human_review:true}).length);
 assert.ok(checkArticle(packet(),matrix,locales,{pending:pend}).errors.some(e=>/Human editorial fact review/.test(e)),"no record → old owner gate still applies");
 const html=renderArticle(art,locales.find(l=>l.code==="en"),{...hub,status:"PUBLISHED"},matrix);
 assert.match(html,/class="article-provenance">This guide was drafted with AI assistance/);
 assert.doesNotMatch(renderArticle({...art,publication:undefined},locales.find(l=>l.code==="en"),{...hub,status:"PUBLISHED"},matrix),/article-provenance/);
});

test("stages advance only after clean live runs and never while paused",()=>{
 assert.equal(nextStage({stage:"PILOT",clean_runs:1},standing),"PILOT");
 assert.equal(nextStage({stage:"PILOT",clean_runs:2},standing),"RAMP");
 assert.equal(nextStage({stage:"RAMP",clean_runs:10},standing),"CONTINUOUS");
 assert.equal(nextStage({stage:"PILOT",clean_runs:5,paused:true},standing),"PILOT");
 assert.equal(standing.publication.max_per_run,2);
});

test("mutating publisher commands refuse outside the trusted workflow",()=>{
 for(const args of [["publish","--max","2","--apply"],["pause","--reason","testing the refusal path"],["ingest-reviews","--branch","review/x","--sha","a".repeat(40)]]){
  const r=spawnSync(process.execPath,["scripts/auto-publisher.mjs",...args],{encoding:"utf8",env:{...process.env,GITHUB_ACTIONS:"",GITHUB_WORKFLOW:""}});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/PUBLISHER_REFUSED/);
 }
});

test("legacy reviewer records remain verifiable but cannot block automated QA",async()=>{
 const {reviewApproves,reviewFile,REVIEW_FILE}=await import("../scripts/auto-publisher-core.mjs");
 const pk=packet();
 const revise=review({verdict:"REVISE",checks:{...review().checks,factual_accuracy:"FAIL"},issues:["Model list not in cited source"]});
 assert.deepEqual(validateReview(revise,{packet:pk,claim}),[]);
 assert.equal(reviewApproves(revise),false);
 assert.ok(validateReview(review({verdict:"REVISE"}),{packet:pk,claim}).some(e=>/list the issues/.test(e)));
 assert.equal(eligibility(ctx({review:revise})).decision,"APPROVED_BY_POLICY");
 assert.equal(eligibility(ctx({review:review({verdict:"FAIL",issues:["Unsafe advice"],checks:{...review().checks,search_intent:"FAIL"}})})).decision,"APPROVED_BY_POLICY");
 assert.equal(reviewFile("NL-H01","4846d24d0cb9846348"),"factory/editorial-reviews/NL-H01.4846d24d0cb9.json");
 assert.ok(REVIEW_FILE.test("NL-H01.4846d24d0cb9.json"));
 assert.ok(!REVIEW_FILE.test("NL-H01.json"));
});
