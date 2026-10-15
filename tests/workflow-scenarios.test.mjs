/**
 * End-to-end workflow scenarios, simulated with the real pure modules:
 * Topic queue → W1/W2/W3 claims → Writer QA → SUBMITTED → Auto Publisher gates →
 * Repair Queue (QA FAIL) or Publish Queue (PASS) → 2 per run → live QA → next 2.
 * No network, no AI model: the "writing" here is fixture text, as in the other suites.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {autoAdvance,applyRevisions} from "../scripts/writer-pool-auto-core.mjs";
import {transitionPool,poolCandidates,validatePool} from "../scripts/writer-pool-core.mjs";
import {newRequest} from "../scripts/writer-request-core.mjs";
import {emptySlots,slotView,signalSlot,handover,casCommit} from "../scripts/writer-slots-core.mjs";
import {repairTicket,repairQueue,ticketValid,MAX_REPAIR_ATTEMPTS} from "../scripts/repair-queue-core.mjs";
import {eligibility,drainDecision,selectForPublication,recordLiveQA,publishGate,applyControl,nextStage} from "../scripts/auto-publisher-core.mjs";

const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const matrix=read("data/seo/master-matrix.json"),registry=read("factory/external-writers/protected-drafts.json");
const locales=read("content/locales.json"),policy=read("data/seo/topic-factory/policy.json"),standing=read("approvals/standing-policy-20261015.json");
const empty={version:1,revision:0,claims:[]};
const at=i=>"2026-10-15T0"+(Math.floor(i/60)%10)+":"+String(i%60).padStart(2,"0")+":00.000Z";
const req=(w,s,extra={})=>({...newRequest(w,w.toLowerCase()+"-"+s,"writer/"+w.toLowerCase()+"-"+s),...extra});
const open=(l,w)=>l.claims.filter(c=>c.status==="CLAIMED"&&c.writer===w);
const hex=(c,n)=>c.repeat(n);
const shaOf=i=>(i.toString(16).padStart(2,"0")).repeat(32);

// Realistic, varied English article fixture that passes every automated gate (same construction as tests/auto-publisher.test.mjs).
const VOCAB=("scooter semi-automatic clutch gearbox throttle brake tyre mirror helmet rain jacket backpack rack strap fuel tank range hill pass valley "+
 "ring road traffic junction roundabout market alley bridge river lake temple museum morning evening weekend holiday route loop village mountain "+
 "experience beginner rider passenger luggage weight height comfort seat suspension engine battery charge station petrol electric quiet noise "+
 "rental shop owner contract deposit photo video record scratch dent receipt question answer plan budget map phone signal parking ticket guard").split(" ");
const STOPW=["the","and","you","for","with","that","your","are"];
let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const sentence=()=>{const w=[];for(let i=0;i<14;i++)w.push(i%3===1?STOPW[Math.floor(rnd()*STOPW.length)]:VOCAB[Math.floor(rnd()*VOCAB.length)]);return w.join(" ").replace(/^./,c=>c.toUpperCase())+".";};
const para=n=>Array.from({length:n},sentence).join(" ");
// Fixture rows get their status forced here, so the scenarios do not depend on what is live today.
const HELD=new Set([...registry.protected,...(registry.held_ids||[])].map(x=>x.id));
const hub=matrix.rows.find(r=>r.locale==="en"&&r.role==="HUB"&&r.cluster==="vehicle-choice");
const child=matrix.rows.find(r=>r.locale==="en"&&r.role==="SUPPORT"&&r.parent_id===hub.id&&!HELD.has(r.id));
const variant=hubStatus=>{const m=structuredClone(matrix);m.rows.find(r=>r.id===hub.id).status=hubStatus;m.rows.find(r=>r.id===child.id).status="IDEA";return m;};
// Ledger scenarios use an unprotected Supporting row: under an unpublished Hub (draftMatrix) or a published one (liveMatrix).
const draftMatrix=variant("IDEA"),liveMatrix=variant("PUBLISHED");
function article(row,{sections=5}={}){
 const parts=["Choosing well starts with honest questions about your experience. Read the [rental checklist](/en/checklist/) and the [English guide](/en/) first."];
 const heads=["Scooter or semi-automatic","Engine size and licence","Routes and luggage","Electric or petrol","Before you ride"];
 for(let i=0;i<sections;i++){
  parts.push("## "+heads[i],i===1?"Vietnam's Law 36/2024/QH15, Article 57, puts two-wheelers up to 125 cm³ in class A1 and larger ones in class A, as the [government portal](https://xaydungchinhsach.chinhphu.vn/x.htm) explains.":para(26));
  if(i===1)parts.push(para(20));
 }
 parts.push("Further reading: [FCDO](https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security) and [Smartraveller](https://www.smartraveller.gov.au/destinations/asia/vietnam).");
 return {matrix_id:row.id,locale:"en",proposed_url:row.url,title:"Choosing a Rental Motorbike in Hanoi: Scooter, Semi-Auto or Clutch "+row.id,
  meta_description:"How to choose between a scooter, a semi-automatic and a clutch motorbike in Hanoi by experience, route, luggage and licence class before renting.",
  h1:"Choosing a rental motorbike in Hanoi",body_markdown:parts.join("\n\n"),
  sources:[{url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"FCDO",checked_on:"2026-10-15"},{url:"https://www.smartraveller.gov.au/destinations/asia/vietnam",title:"Smartraveller",checked_on:"2026-10-15"}],
  serp_intent_checked:false,facts_reviewed_by_human:false,editorial_notes:"scenario fixture",writer_session:"w1-scn"};
}
const submitted=(row,extra={})=>({id:row.id,writer:"W1",session:"w1-scn",branch:"writer/w1-scn",claim_id:"scn-"+row.id,status:"SUBMITTED",
 at:at(0),updated_at:at(0),source_sha256:hex("a",64),source_commit:hex("b",40),...extra});
const evaluate=(packet,claim,row,m=matrix,state={stage:"PILOT",published:[]})=>
 eligibility({packet,claim,row:m.rows.find(r=>r.id===row.id),matrix:m,locales,policy,standing,protectedIds:new Set(),corpus:[],state});
const reportItem=(claim,result)=>({id:claim.id,decision:result.decision,failed:result.failed,writer:claim.writer,session:claim.session,branch:claim.branch,
 source_sha256:claim.source_sha256,source_commit:claim.source_commit,details:result.gates.filter(g=>!g.passed).map(g=>g.gate+": "+g.detail)});

test("S1 three Writers claim at the same time: serialized ledger, thirty unique IDs, stale write refused",()=>{
 const W=[req("W1","claude"),req("W2","chatgpt"),req("W3","gemini")];
 let ledger=empty;
 for(const [i,r] of W.entries())ledger=autoAdvance(matrix,ledger,registry,r,{now:at(i),nonce:"s1-"+i}).ledger;
 const ids=ledger.claims.map(c=>c.id);
 assert.equal(ids.length,30);
 assert.equal(new Set(ids).size,30,"no ID is claimed twice");
 for(const r of W)assert.equal(open(ledger,r.writer).length,10);
 assert.deepEqual(validatePool(matrix,ledger,registry),[]);
 // Two coordinators computed from the same revision: only the first write lands; the other recomputes.
 const base=autoAdvance(matrix,empty,registry,W[0],{now:at(9),nonce:"race-a"}).ledger;
 const competing=autoAdvance(matrix,empty,registry,W[1],{now:at(9),nonce:"race-b"}).ledger;
 assert.equal(casCommit(base,empty.revision,competing).ok,false);
 const recomputed=autoAdvance(matrix,base,registry,W[1],{now:at(10),nonce:"race-c"}).ledger;
 assert.equal(new Set(recomputed.claims.map(c=>c.id)).size,20);
 // A second session can never take a lane another session holds.
 assert.throws(()=>transitionPool(matrix,ledger,registry,"claim",{...req("W1","intruder"),count:1},{now:at(11)}),/WRITER_SLOT_HELD/);
});

test("S2 ten QA-eligible drafts are published as five runs of two, each gated by live QA",()=>{
 // Ten eligible Hubs in ten locales (PILOT allows 2 per locale) …
 const hubs=locales.map((l,i)=>({id:l.code.toUpperCase()+"-H9"+i,locale:l.code}));
 assert.equal(hubs.length,10);
 let results=hubs.map((r,i)=>({id:r.id,locale:r.locale,role:"HUB",decision:"APPROVED_BY_POLICY",priority:i}));
 let state={version:1,stage:"PILOT",paused:false,clean_runs:0,published:[],runs:[]},runs=[];
 for(let run=1;run<=10;run++){
  if(!publishGate(state).allowed)break;
  const chosen=selectForPublication(results,{state,standing,max:2});
  if(!chosen.length)break;
  state.published.push(...chosen.map(r=>({id:r.id,locale:r.locale,live_qa:"PENDING"})));
  assert.equal(drainDecision({state,eligible:["X"]}).reason,"LIVE_QA_PENDING","no next pair before live QA");
  state=recordLiveQA(state,{ids:chosen.map(r=>r.id),verdict:"PASS",now:at(run),standing});
  results=results.filter(r=>!chosen.includes(r));
  runs.push(chosen.map(r=>r.id));
  const next=drainDecision({state,eligible:selectForPublication(results,{state,standing,max:2}).map(r=>r.id)});
  assert.equal(next.continue,results.length>0);
 }
 assert.deepEqual(runs.map(r=>r.length),[2,2,2,2,2]);
 assert.equal(state.published.length,10);
 assert.ok(state.published.every(p=>p.live_qa==="PASS"));
 assert.equal(state.stage,"RAMP","two clean PILOT runs advance to RAMP");
 assert.equal(drainDecision({state,eligible:[]}).reason,"QUEUE_DRAINED_OR_HELD");
 // … and ten Supporting drafts of ONE locale under RAMP (10 per locale) also drain 2+2+2+2+2.
 const en=Array.from({length:10},(_,i)=>({id:"EN-S9"+String(i).padStart(2,"0")}));
 let queue=en.map((r,i)=>({id:r.id,locale:"en",role:"SUPPORT",decision:"APPROVED_BY_POLICY",priority:i})),st={stage:"RAMP",published:[],runs:[]},pairs=0;
 while(queue.length){const c=selectForPublication(queue,{state:st,standing,max:2});st.published.push(...c.map(r=>({id:r.id,locale:"en",live_qa:"PASS"})));queue=queue.filter(r=>!c.includes(r));pairs++;}
 assert.equal(pairs,5);
 // PILOT caps one locale at two: the rest wait (WAIT_STAGE), they are not dropped or forced.
 assert.equal(selectForPublication(en.map(r=>({id:r.id,locale:"en",role:"SUPPORT",decision:"APPROVED_BY_POLICY"})),{state:{stage:"PILOT",published:[{locale:"en"},{locale:"en"}]},standing,max:2}).length,0);
});

test("S3 QA FAIL → repair ticket → AI Writer revision r2 → QA PASS → publishable",()=>{
 const claim=submitted(child);
 const shallow=evaluate(article(child,{sections:3}),claim,child,liveMatrix);
 assert.equal(shallow.decision,"REJECTED");
 assert.ok(shallow.failed.includes("G4_EDITORIAL"));
 const ticket=repairTicket(reportItem(claim,shallow),claim);
 assert.equal(ticket.state,"REPAIR");
 assert.equal(ticket.revision_path,"factory/external-writers/inbox/W1/revisions/"+child.id+".r2.json");
 assert.equal(ticket.source_commit,claim.source_commit);
 assert.ok(ticket.details.some(d=>/E5 depth/.test(d)),"the ticket carries the exact failing check");
 assert.ok(ticketValid(ticket,claim));
 const ledger={version:1,revision:7,claims:[claim]};
 const rev={id:child.id,revision:2,source_sha256:hex("c",64),source_commit:hex("d",40),source_path:ticket.revision_path,
  review_verdict:"QA_FAIL",repair_basis_sha256:ticket.source_sha256,repair_gates:ticket.fixable};
 const after=applyRevisions(matrix,ledger,registry,{writer:"W1",session:"w1-scn",branch:"writer/w1-scn"},[rev],{now:at(5)});
 const c2=after.ledger.claims[0];
 assert.equal(c2.source_sha256,hex("c",64));
 assert.equal(c2.revisions[0].source_sha256,hex("a",64),"the submitted original stays in history, untouched");
 assert.equal(repairTicket(reportItem(claim,shallow),c2),null,"the old ticket dies with the old hash");
 const fixed=evaluate(article(child),c2,child,liveMatrix);
 assert.equal(fixed.decision,"APPROVED_BY_POLICY",JSON.stringify(fixed.gates.filter(g=>!g.passed)));
 assert.equal(repairQueue({version:2,items:[reportItem(c2,fixed)]},after.ledger).length,0);
 assert.equal(selectForPublication([{...fixed,priority:1}],{state:{stage:"PILOT",published:[]},standing,max:2}).length,1);
});

test("S4 QA keeps failing: r2, r3, r4 are accepted, then ESCALATED and no endless loop",()=>{
 let claim=submitted(child),ledger={version:1,revision:1,claims:[claim]};
 const failing={decision:"REJECTED",failed:["G4_EDITORIAL"],gates:[{gate:"G4_EDITORIAL",passed:false,detail:"E5 depth"}]};
 for(let n=2;n<=MAX_REPAIR_ATTEMPTS+1;n++){
  const t=repairTicket(reportItem(claim,failing),claim);
  assert.equal(t.state,"REPAIR");assert.equal(t.next_revision,n);
  ledger=applyRevisions(matrix,ledger,registry,{writer:"W1",session:"w1-scn",branch:"writer/w1-scn"},
   [{id:child.id,revision:n,source_sha256:shaOf(n),source_commit:hex("e",40),source_path:t.revision_path,review_verdict:"QA_FAIL",repair_basis_sha256:claim.source_sha256,repair_gates:t.fixable}],{now:at(n)}).ledger;
  claim=ledger.claims[0];
 }
 assert.equal(claim.revisions.length,MAX_REPAIR_ATTEMPTS);
 const last=repairTicket(reportItem(claim,failing),claim);
 assert.equal(last.state,"ESCALATED_MAX_ATTEMPTS");
 assert.equal(ticketValid(last,claim),false);
 assert.throws(()=>applyRevisions(matrix,ledger,registry,{writer:"W1",session:"w1-scn",branch:"writer/w1-scn"},
  [{id:child.id,revision:5,source_sha256:shaOf(9),source_commit:hex("e",40),source_path:"factory/external-writers/inbox/W1/revisions/"+child.id+".r5.json",review_verdict:"QA_FAIL",repair_basis_sha256:claim.source_sha256,repair_gates:["G4_EDITORIAL"]}],{now:at(9)}),/exceeded 3/);
 // PRICE / LEGAL holds never become text-repair tickets, however often they fail.
 assert.equal(repairTicket(reportItem(claim,{decision:"REVIEW_REQUIRED",failed:["G3_NO_PRICES","G4_EDITORIAL"],gates:[]}),claim).state,"HUMAN_REVIEW_REQUIRED");
});

test("S5 a Writer runs out of quota mid-batch: finished drafts land, nothing is lost, others continue",()=>{
 const w2=req("W2","gemini-q"),w1=req("W1","claude-q");
 let ledger=autoAdvance(matrix,empty,registry,w2,{now:at(1),nonce:"q1"}).ledger;
 const mine=open(ledger,"W2").map(c=>c.id),finished=new Set(mine.slice(0,4));
 const paused=autoAdvance(matrix,ledger,registry,w2,{now:at(2),nonce:"q2",verifiedDraftIds:finished,refill:false});
 assert.equal(paused.status,"SUBMITTED_SLOT_PAUSED");
 assert.equal(paused.submitted.length,4);
 assert.equal(open(paused.ledger,"W2").length,6,"unfinished claims stay with their writer, no timer moves them");
 let slots=signalSlot(paused.ledger,emptySlots(),{writer:"W2",session:w2.session,branch:w2.branch,state:"PAUSED_QUOTA",source:"agent",now:at(2)});
 assert.equal(slotView(paused.ledger,slots).W2.accepts_new_claims,false);
 const drafted=new Set(mine.slice(4,6));
 const ho=handover(matrix,paused.ledger,slots,registry,{writer:"W2",session:w2.session,branch:w2.branch,draftedIds:drafted,reason:"quota exhausted, operator confirmed",confirmed:true,now:at(3)});
 assert.deepEqual(new Set(ho.kept),drafted,"drafted-but-unsubmitted work stays owned");
 assert.equal(ho.released.length,4);
 const w1run=autoAdvance(matrix,ho.ledger,registry,w1,{now:at(4),nonce:"q3"});
 assert.ok(ho.released.some(id=>w1run.claimed.includes(id)),"released topics return to the shared queue");
 assert.deepEqual(validatePool(matrix,w1run.ledger,registry),[]);
});

test("S6 a Writer goes offline and resumes the SAME session; nobody else can take its slot meanwhile",()=>{
 const w3=req("W3","gemini-o");
 let ledger=autoAdvance(matrix,empty,registry,w3,{now:at(1),nonce:"o1"}).ledger;
 const ids=open(ledger,"W3").map(c=>c.id);
 let slots=signalSlot(ledger,emptySlots(),{writer:"W3",session:w3.session,branch:w3.branch,state:"OFFLINE",source:"agent",now:at(2)});
 assert.equal(slotView(ledger,slots).W3.state,"OFFLINE");
 const intruder=req("W3","other-o");
 assert.throws(()=>signalSlot(ledger,slots,{writer:"W3",session:intruder.session,branch:intruder.branch,state:"ACTIVE",source:"agent",now:at(3)}),/SLOT_HELD_BY_OTHER_SESSION/);
 assert.throws(()=>autoAdvance(matrix,ledger,registry,intruder,{now:at(3),nonce:"o2"}),/WRITER_SLOT_HELD/);
 slots=signalSlot(ledger,slots,{writer:"W3",session:w3.session,branch:w3.branch,state:"RECOVERING",source:"agent",now:at(4)});
 const resumed=autoAdvance(matrix,ledger,registry,w3,{now:at(5),nonce:"o3",verifiedDraftIds:new Set(ids.slice(0,3))});
 assert.deepEqual(resumed.submitted.sort(),ids.slice(0,3).sort());
 assert.equal(open(resumed.ledger,"W3").length,10,"the resumed session keeps its unfinished claims and refills to ten");
 assert.ok(ids.slice(3).every(id=>open(resumed.ledger,"W3").some(c=>c.id===id)));
});

test("S7 queue empty: no claims to hand out, no run to dispatch, nothing forced",()=>{
 let ledger=empty,i=0;
 const writer=req("W1","drain");
 while(poolCandidates(matrix,ledger,registry).length&&i<200){
  const open1=new Set(open(ledger,"W1").map(c=>c.id));
  ledger=autoAdvance(matrix,ledger,registry,writer,{now:at(i),nonce:"e"+i++,verifiedDraftIds:open1}).ledger;
 }
 const done=autoAdvance(matrix,ledger,registry,writer,{now:at(i+1),nonce:"end",verifiedDraftIds:new Set(open(ledger,"W1").map(c=>c.id))});
 assert.equal(done.claimed.length,0);
 assert.ok(["NO_ELIGIBLE_TOPICS","BATCH_SUBMITTED_FOR_AUTO_QA"].includes(done.status));
 assert.equal(drainDecision({state:{stage:"PILOT",published:[]},eligible:[]}).continue,false);
 assert.deepEqual(selectForPublication([],{state:{},standing,max:2}),[]);
});

test("S8 parent Hub not PUBLISHED: Supporting waits (no rewrite ticket), then becomes publishable",()=>{
 const claim=submitted(child,{id:child.id});
 const waiting=evaluate(article(child),claim,child,draftMatrix);
 assert.equal(waiting.decision,"WAIT_PARENT",JSON.stringify(waiting.gates.filter(g=>!g.passed)));
 assert.equal(repairTicket(reportItem(claim,waiting),claim).state,"WAIT_PARENT");
 assert.equal(repairQueue({version:2,items:[reportItem(claim,waiting)]},{claims:[claim]}).length,0,"waiting is not a text failure");
 assert.equal(evaluate(article(child),claim,child,liveMatrix).decision,"APPROVED_BY_POLICY");
});

test("S9 live QA tool defect (the sitemap bug): INCONCLUSIVE pause without rollback, recovery verifies, operator resumes",()=>{
 const now="2026-10-15T12:00:00.000Z",ids=["NL-H01","PT-H01"];
 let st={version:1,stage:"PILOT",paused:false,clean_runs:0,published:ids.map(id=>({id,locale:id.slice(0,2).toLowerCase(),live_qa:"PENDING"})),runs:[]};
 st=recordLiveQA(st,{ids,verdict:"INCONCLUSIVE",now,standing,issues:[{kind:"TOOL",scope:"sitemap",detail:"QA built an invalid URL: sitemap-main.xml"}]});
 assert.equal(st.paused,true);
 assert.equal(st.published.length,2,"pages are kept: no revert for a tool defect");
 assert.equal(publishGate(st).reason,"LIVE_QA_RECOVERY");
 st=recordLiveQA(st,{ids,verdict:"PASS",now,standing,recovery:true});
 assert.deepEqual(st.published.map(p=>p.live_qa),["PASS","PASS"]);
 assert.equal(publishGate(st).reason,"PAUSED","verification alone never resumes");
 assert.throws(()=>applyControl(st,"resume",{reason:"sitemap QA fixed in PR",confirmed:false,now}),/confirmed/);
 assert.throws(()=>applyControl(st,"resume",{reason:"short",confirmed:true,now}),/reason/);
 st=applyControl(st,"resume",{reason:"Live QA tool fixed; production verified",confirmed:true,now});
 assert.equal(publishGate(st).allowed,true);
});

test("S10 production really broken: FAIL → revert + PAUSE; nothing advances or resumes on its own",()=>{
 const now="2026-10-15T13:00:00.000Z",ids=["NL-H01","PT-H01"];
 let st={version:1,stage:"PILOT",paused:false,clean_runs:1,published:ids.map(id=>({id,locale:"nl",live_qa:"PENDING"})),runs:[]};
 st=recordLiveQA(st,{ids,verdict:"FAIL",now,standing,issues:[{kind:"SITE",scope:"NL-H01",detail:"HTTP 404"}]});
 assert.equal(st.paused,true);assert.equal(st.clean_runs,0);
 st=applyControl(st,"record-failure",{reason:"Live QA failed after deploy; publish commit reverted",ids,now});
 assert.equal(st.published.length,0,"reverted pages leave the published list");
 assert.equal(publishGate(st).reason,"PAUSED");
 assert.equal(drainDecision({state:st,eligible:["ES-H01"]}).reason,"PAUSED");
 assert.equal(nextStage({...st,clean_runs:99},standing),"PILOT","no stage change while paused");
 assert.equal(recordLiveQA(st,{ids:[],verdict:"PASS",now,standing,recovery:true}).paused,true);
});
