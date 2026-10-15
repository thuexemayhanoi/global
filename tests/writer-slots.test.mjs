import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {autoAdvance} from "../scripts/writer-pool-auto-core.mjs";
import {transitionPool,poolCandidates,validatePool} from "../scripts/writer-pool-core.mjs";
import {newRequest,validateRequest,requestPath} from "../scripts/writer-request-core.mjs";
import {emptySlots,slotView,signalSlot,handover,casCommit,validateSlots} from "../scripts/writer-slots-core.mjs";

const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
const empty={version:1,revision:0,claims:[]};
const HELD=new Set([...registry.protected,...(registry.held_ids||[])].map(x=>x.id));
const DRAFTABLE=matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&r.status==="IDEA"&&!HELD.has(r.id)).length;
const at=i=>"2026-10-15T00:"+String(i%60).padStart(2,"0")+":00.000Z";
// Agents are free-form: the provider is a label, never part of the slot identity.
const req=(w,agent,extra={})=>({...newRequest(w,w.toLowerCase()+"-"+agent,"writer/"+w.toLowerCase()+"-"+agent),...extra});
const open=(l,w)=>l.claims.filter(c=>c.status==="CLAIMED"&&c.writer===w);
const live=l=>l.claims.filter(c=>c.status!=="RELEASED").map(c=>c.id);
function cycle(ledger,writers,i,opts={}){
 // Each active writer finishes everything it holds, then the coordinator refills it.
 for(const r of writers){
  const done=new Set(open(ledger,r.writer).filter(c=>c.session===r.session).map(c=>c.id));
  ledger=autoAdvance(matrix,ledger,registry,r,{now:at(i),nonce:"n"+i+r.writer,verifiedDraftIds:done,...opts}).ledger;
 }
 return ledger;
}

test("request accepts an optional self-reported slot signal and agent label, nothing else",()=>{
 const r=req("W2","gemini-01",{slot_state:"PAUSED_QUOTA",slot_reason:"provider quota exhausted",agent:"gemini"});
 assert.deepEqual(validateRequest(r,requestPath("W2",r.session),r.branch),r);
 assert.throws(()=>validateRequest({...r,slot_state:"SLEEPING"},requestPath("W2",r.session),r.branch),/slot_state/);
 assert.throws(()=>validateRequest({...r,api_key:"x"},requestPath("W2",r.session),r.branch),/Unexpected/);
});

test("only W1 active: one agent drains the whole shared queue across all locales",()=>{
 const w1=req("W1","chatgpt-solo");
 let ledger=empty;
 for(let i=0;i<Math.ceil(DRAFTABLE/10)+3;i++)ledger=cycle(ledger,[w1],i);
 assert.equal(ledger.claims.filter(c=>c.status==="SUBMITTED").length,DRAFTABLE);
 assert.equal(new Set(live(ledger)).size,live(ledger).length);
 const locales=new Set(ledger.claims.map(c=>matrix.rows.find(r=>r.id===c.id).locale));
 assert.equal(locales.size,10,"a single slot writes every locale");
 const v=slotView(ledger,emptySlots());
 assert.equal(v.W2.state,"AVAILABLE");assert.equal(v.W3.state,"AVAILABLE");
});

test("W1 and W3 active together, then all three: claims stay unique and nobody waits for an absent slot",()=>{
 const w1=req("W1","claude-a"),w2=req("W2","gemini-b"),w3=req("W3","chatgpt-c");
 let ledger=cycle(empty,[w1,w3],0);
 assert.equal(open(ledger,"W1").length,10);assert.equal(open(ledger,"W3").length,10);assert.equal(open(ledger,"W2").length,0);
 ledger=cycle(ledger,[w1,w2,w3],1);
 const ids=live(ledger);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(validatePool(matrix,ledger,registry),[]);
});

test("W2 runs out of quota mid-batch: finished drafts are submitted, no refill, unwritten claims hand over to active slots",()=>{
 const w1=req("W1","claude-a"),w2=req("W2","gemini-b");
 let ledger=cycle(empty,[w1,w2],0),slots=emptySlots();
 const w2Claims=open(ledger,"W2").map(c=>c.id);
 // W2 wrote three drafts, then its provider reported exhausted quota in its own request file.
 const written=new Set(w2Claims.slice(0,3));
 slots=signalSlot(ledger,slots,{writer:"W2",session:w2.session,branch:w2.branch,state:"PAUSED_QUOTA",reason:"provider quota exhausted",agent:"gemini",source:"agent",now:at(1)});
 const r=autoAdvance(matrix,ledger,registry,w2,{now:at(2),nonce:"p",verifiedDraftIds:new Set([...written].slice(0,2)),refill:false});
 assert.equal(r.status,"SUBMITTED_SLOT_PAUSED");
 assert.equal(r.submitted.length,2);
 ledger=r.ledger;
 assert.equal(open(ledger,"W2").length,8,"no new claims while paused");
 assert.equal(slotView(ledger,slots).W2.state,"PAUSED_QUOTA");
 assert.equal(slotView(ledger,slots).W2.accepts_new_claims,false);
 // No timeout path exists: handover needs the paused state, an explicit confirmation and a branch inspection.
 assert.throws(()=>handover(matrix,ledger,slots,registry,{writer:"W2",session:w2.session,branch:w2.branch,draftedIds:new Set(),reason:"short",confirmed:true,now:at(3)}),/reason/);
 assert.throws(()=>handover(matrix,ledger,emptySlots(),registry,{writer:"W2",session:w2.session,branch:w2.branch,draftedIds:new Set(),reason:"coordinator verified quota pause",confirmed:true,now:at(3)}),/PAUSED_QUOTA or OFFLINE/);
 const h=handover(matrix,ledger,slots,registry,{writer:"W2",session:w2.session,branch:w2.branch,draftedIds:written,reason:"coordinator verified quota pause",confirmed:true,now:at(3)});
 assert.deepEqual(h.kept,[...written].slice(2),"the drafted-but-unsubmitted ID stays owned by W2");
 assert.equal(h.released.length,7);
 ledger=h.ledger;
 // W1 (another provider) picks the released topics up from the shared queue.
 const free=new Set(poolCandidates(matrix,ledger,registry).map(r=>r.id));
 assert.ok(h.released.every(id=>free.has(id)));
 ledger=cycle(ledger,[w1],4);
 const w1Now=new Set(open(ledger,"W1").map(c=>c.id));
 assert.ok(h.released.some(id=>w1Now.has(id)),"released topics are reassigned to an active slot");
 assert.equal(new Set(live(ledger)).size,live(ledger).length);
 // W2 recovers: same session/branch, resumes its kept draft, then takes new work.
 slots=signalSlot(ledger,slots,{writer:"W2",session:w2.session,branch:w2.branch,state:"RECOVERING",reason:"quota restored",source:"agent",now:at(5)});
 assert.equal(slotView(ledger,slots).W2.state,"RECOVERING");
 const back=autoAdvance(matrix,ledger,registry,w2,{now:at(6),nonce:"r",verifiedDraftIds:new Set(h.kept)});
 assert.ok(back.submitted.includes(h.kept[0]));
 assert.ok(open(back.ledger,"W2").length>0,"refilled after recovery");
 assert.deepEqual(validatePool(matrix,back.ledger,registry),[]);
});

test("another session cannot report for, or take, a slot held by a different session",()=>{
 const w2=req("W2","gemini-b");
 const ledger=cycle(empty,[w2],0);
 assert.throws(()=>signalSlot(ledger,emptySlots(),{writer:"W2",session:"w2-intruder",branch:"writer/w2-intruder",state:"OFFLINE",source:"agent",now:at(1)}),/SLOT_HELD_BY_OTHER_SESSION/);
 assert.throws(()=>transitionPool(matrix,ledger,registry,"claim",{writer:"W2",session:"w2-intruder",branch:"writer/w2-intruder",count:2},{now:at(1),nonce:"x"}),/WRITER_SLOT_HELD/);
 // A confirmed coordinator report can mark the real holder OFFLINE; then a free slot is a free slot for any agent.
 const slots=signalSlot(ledger,emptySlots(),{writer:"W2",session:w2.session,branch:w2.branch,state:"OFFLINE",reason:"agent session ended, checkpoint verified",source:"coordinator",confirmed:true,now:at(2)});
 const h=handover(matrix,ledger,slots,registry,{writer:"W2",session:w2.session,branch:w2.branch,draftedIds:new Set(),reason:"agent session ended, checkpoint verified",confirmed:true,now:at(3)});
 const next=transitionPool(matrix,h.ledger,registry,"claim",{writer:"W2",session:"w2-newagent",branch:"writer/w2-newagent",count:10},{now:at(4),nonce:"y"});
 assert.equal(next.ids.length,10);
 assert.equal(slotView(next.ledger,slots).W2.session,"w2-newagent");
 assert.equal(slotView(next.ledger,slots).W2.state,"ACTIVE");
 assert.deepEqual(validateSlots(slots),[]);
});

test("two writers claiming at the same time: compare-and-swap rejects the stale write, recompute stays duplicate-free",()=>{
 const base=cycle(empty,[req("W1","claude-a")],0);
 const a=transitionPool(matrix,base,registry,"claim",{writer:"W2",session:"w2-x",branch:"writer/w2-x",count:10},{now:at(1),nonce:"a"});
 const b=transitionPool(matrix,base,registry,"claim",{writer:"W3",session:"w3-y",branch:"writer/w3-y",count:10},{now:at(1),nonce:"b"});
 assert.deepEqual(a.ids,b.ids,"both computed from the same snapshot would pick the same topics");
 const first=casCommit(base,base.revision,a.ledger);
 assert.equal(first.ok,true);
 const stale=casCommit(first.ledger,base.revision,b.ledger);
 assert.equal(stale.ok,false);
 const retry=transitionPool(matrix,first.ledger,registry,"claim",{writer:"W3",session:"w3-y",branch:"writer/w3-y",count:10},{now:at(2),nonce:"b2"});
 assert.equal(retry.ids.filter(id=>a.ids.includes(id)).length,0);
 // A merge of both stale results would be caught by the pool validator.
 const merged={...a.ledger,claims:[...a.ledger.claims,...b.ledger.claims.filter(c=>c.writer==="W3")]};
 assert.ok(validatePool(matrix,merged,registry).some(e=>/Duplicate live claim/.test(e)));
});

test("network failure: replaying a claim dispatch or a green push is idempotent and loses no draft",()=>{
 const w1=req("W1","claude-a");
 const first=transitionPool(matrix,empty,registry,"claim",{...w1,count:10},{now:at(1),nonce:"c"});
 const replay=transitionPool(matrix,first.ledger,registry,"claim",{...w1,count:10},{now:at(2),nonce:"c2"});
 assert.equal(replay.idempotent,true);
 assert.deepEqual(replay.ids,first.ids);
 const done=new Set(first.ids.slice(0,2));
 const pushed=autoAdvance(matrix,first.ledger,registry,w1,{now:at(3),nonce:"g",verifiedDraftIds:done});
 const again=autoAdvance(matrix,pushed.ledger,registry,w1,{now:at(4),nonce:"g2",verifiedDraftIds:done});
 assert.equal(again.submitted.length,0,"already submitted drafts are not submitted twice");
 assert.equal(pushed.ledger.claims.filter(c=>c.status==="SUBMITTED").length,again.ledger.claims.filter(c=>c.status==="SUBMITTED").length);
 assert.equal(open(again.ledger,"W1").length,10);
});

test("revisions append a new version and keep every earlier hash; only REVISE/FAIL-reviewed drafts can be revised",async()=>{
 const {applyRevisions}=await import("../scripts/writer-pool-auto-core.mjs");
 const w=req("W2","gemini-b");
 let ledger=cycle(empty,[w],0);
 const id=open(ledger,"W2")[0].id;
 ledger=autoAdvance(matrix,ledger,registry,w,{now:at(1),nonce:"s",verifiedDraftIds:new Set([id]),
  verifiedDraftEvidence:new Map([[id,{source_sha256:"a".repeat(64),source_commit:"b".repeat(40)}]])}).ledger;
 const rev={id,revision:2,source_sha256:"c".repeat(64),source_commit:"d".repeat(40),source_path:"factory/external-writers/inbox/W2/revisions/"+id+".r2.json",review_verdict:"REVISE"};
 const ident={writer:"W2",session:w.session,branch:w.branch};
 const r=applyRevisions(matrix,ledger,registry,ident,[rev],{now:at(2)});
 const c=r.ledger.claims.find(x=>x.id===id&&x.status==="SUBMITTED");
 assert.equal(c.source_sha256,"c".repeat(64));
 assert.equal(c.revisions[0].source_sha256,"a".repeat(64));
 assert.equal(c.phase,"REVISED_AWAITING_REVIEW");
 assert.deepEqual(validatePool(matrix,r.ledger,registry),[]);
 assert.throws(()=>applyRevisions(matrix,ledger,registry,ident,[{...rev,revision:3}],{now:at(2)}),/expects r2/);
 assert.throws(()=>applyRevisions(matrix,ledger,registry,ident,[{...rev,review_verdict:"PASS"}],{now:at(2)}),/REVISE\/FAIL/);
 assert.throws(()=>applyRevisions(matrix,ledger,registry,{...ident,session:"w2-other"},[rev],{now:at(2)}),/no SUBMITTED claim/);
 assert.throws(()=>applyRevisions(matrix,ledger,registry,ident,[{...rev,source_sha256:"a".repeat(64)}],{now:at(2)}),/byte-identical/);
 const bad=structuredClone(r.ledger);bad.claims.find(x=>x.id===id&&x.status==="SUBMITTED").source_path="factory/external-writers/inbox/W1/"+id+".json";
 assert.ok(validatePool(matrix,bad,registry).some(e=>/revision source path/.test(e)));
 assert.doesNotThrow(()=>validateRequest({...w,claim_new:false},requestPath("W2",w.session),w.branch));
});
