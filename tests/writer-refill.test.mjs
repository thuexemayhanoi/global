import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {refillHealth,validateProposalBatch,topicURL,REFILL_MIN_READY,REFILL_TARGET} from "../scripts/writer-refill-core.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("factory/external-writers/claims.json","utf8"));
const hub=matrix.rows.find(x=>x.role==="HUB"&&x.locale==="vi");
const make=(n=1)=>({
 version:1,repo:"thuexemayhanoi/global",purpose:"SEO_IDEA_RESEARCH",status:"PROPOSED",writer:"W1",
 topics:Array.from({length:n},(_,i)=>({
  candidate_id:"REFILL-VI-"+String(70001+i).padStart(5,"0"),
  locale:"vi",parent_id:hub.id,role:"SUPPORT",cluster:hub.cluster,
  slug:"huong-dan-kiem-tra-kinh-nghiem-chuyen-sau-"+String(70001+i),
  primary_query:"hướng dẫn kiểm tra kỹ năng điều khiển xe chuyên sâu tại Hà Nội lần "+(70001+i),
  working_title:"Hướng dẫn thực hành lựa chọn và lái xe an toàn tại Hà Nội — tập "+(70001+i),
  search_intent:"informational",word_target:1600,
  intent_rationale:"Bài viết giải đáp một vấn đề thực tế khác biệt của người thuê xe, phân tích đối tượng, tình huống và ý định tìm kiếm không trùng Hub cha.",
  references:[
   {url:"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",title:"WHO road traffic injury safety",checked_on:"2026-10-14"},
   {url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"Vietnam travel guidance from UK FCDO",checked_on:"2026-10-14"}],
  status:"IDEA",serp_evidence:"NOT_VALIDATED",source_verification:"NOT_STARTED"
 }))
});
test("refill health shows real free ideas; capacity is not content",()=>{
 const h=refillHealth(matrix,ledger,registry);
 assert.equal(h.threshold,REFILL_MIN_READY);
 assert.equal(h.target,REFILL_TARGET);
 assert.equal(h.publish_allowed,false);
 assert.equal(h.auto_materialize,false);
 const held=new Set([...registry.protected,...(registry.held_ids||[])].map(x=>x.id));
 const topics=matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&["IDEA","PUBLISHED"].includes(r.status));
 assert.ok(topics.length>=120); // 120 original topics is a floor; promotion adds rows, publication moves IDEA to PUBLISHED
 const live=new Set(ledger.claims.filter(c=>c.status!=="RELEASED").map(c=>c.id));
 assert.equal(h.free_ideas,topics.filter(r=>r.status==="IDEA"&&!held.has(r.id)&&!live.has(r.id)).length); // Source-of-truth changes safely as Writer progresses
 const allClaimed=structuredClone(ledger);
 for(const row of matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&r.status==="IDEA"))
  if(!allClaimed.claims.some(c=>c.id===row.id)&&![...registry.protected,...registry.held_ids].some(p=>p.id===row.id))
   allClaimed.claims.push({id:row.id,writer:"W2",session:"w2-test",branch:"writer/w2-test",claim_id:"test-"+row.id,
    status:"SUBMITTED",at:"2026-10-14T00:00:00Z",updated_at:"2026-10-14T00:00:00Z"});
 const emptyHealth=refillHealth(matrix,allClaimed,registry);
 assert.equal(emptyHealth.status,"QUEUE_EMPTY_REVIEW_REQUIRED");
 assert.equal(emptyHealth.free_ideas,0);
});
test("valid refill batch passes all eight structural gates but never authorizes publication",()=>{
 const b=make(10),v=validateProposalBatch(matrix,b,"W1");
 assert.equal(v.passed,true,JSON.stringify(v.issues));
 assert.equal(v.count,10);
 assert.equal(v.review_required,true);
 assert.equal(v.auto_materialize,false);
 assert.equal(v.auto_publish,false);
 assert.equal(topicURL(b.topics[0]),"/vi/guides/"+b.topics[0].slug+"/");
});
test("refuse wrong repo, identity, oversized batches and nonexistent parent",()=>{
 for(const edit of [
  x=>x.repo="thuexemayhanoi/blog",
  x=>x.writer="W2",
  x=>x.topics=Array.from({length:51},(_,i)=>make(1).topics[0]),
  x=>x.topics[0].parent_id="VI-H99",
  x=>x.topics[0].role="HUB",
  x=>x.topics[0].cluster="not-the-parent"
 ]){
  const p=make();edit(p);
  assert.equal(validateProposalBatch(matrix,p,"W1").passed,false);
 }
});
test("G4/G5/G6 fail on duplicate slug, canonical, query, title, invalid locale",()=>{
 const duplicate=make(2);duplicate.topics[1].slug=duplicate.topics[0].slug;
 assert.ok(validateProposalBatch(matrix,duplicate,"W1").issues.some(x=>x.gate==="G4"));
 const badQuery=make();badQuery.topics[0].primary_query=matrix.rows.find(r=>r.id===hub.id).primary_query;
 assert.ok(validateProposalBatch(matrix,badQuery,"W1").issues.some(x=>x.gate==="G5"));
 const badTitle=make();badTitle.topics[0].working_title=hub.working_title;
 assert.ok(validateProposalBatch(matrix,badTitle,"W1").issues.some(x=>x.gate==="G6"));
 const badLocale=make();badLocale.topics[0].locale="xyz";
 assert.ok(validateProposalBatch(matrix,badLocale,"W1").issues.some(x=>x.gate==="G3"));
 const duplicateFromOther=validateProposalBatch(matrix,make(),"W1",{otherProposals:make().topics});
 assert.ok(duplicateFromOther.issues.length>0);
});
test("G7/G8 reject missing sources or attempts to mark an idea approved/published",()=>{
 const missing=make();missing.topics[0].references=[];
 assert.ok(validateProposalBatch(matrix,missing,"W1").issues.some(x=>x.gate==="G7"));
 const invented=make();invented.topics[0].references[0].url="https://example.com/fake";
 assert.ok(validateProposalBatch(matrix,invented,"W1").issues.some(x=>x.gate==="G7"));
 const auto=make();auto.topics[0].status="PUBLISHED";auto.topics[0].owner_approved=true;
 assert.ok(validateProposalBatch(matrix,auto,"W1").issues.some(x=>x.gate==="G8"));
});
