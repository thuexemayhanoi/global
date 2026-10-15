/**
 * Shared pool advancement, borrowed from /blog's write-ahead queue model.
 *
 * - One session per W1/W2/W3 and up to ten unfinished claims per Writer.
 * - Green Writer push may submit any nonempty subset with verified draft data,
 *   then refill the same Writer back to ten items. Unfinished IDs remain owned.
 * - Replaying a green event is idempotent; submitted/protected IDs never
 *   return to the candidates pool.
 * - Deterministic core: no network, filesystem, AI, publishing or timer.
 */
import {transitionPool,poolCandidates,validatePool,MAX_BATCH} from "./writer-pool-core.mjs";
export function autoAdvance(matrix,ledger,registry,request,{
 verifiedDraftIds=new Set(),verifiedDraftEvidence=new Map(),now="2026-10-14T00:00:00Z",nonce="auto",maxBatch=MAX_BATCH,refill=true
}={}){
 const errors=validatePool(matrix,ledger,registry);
 if(errors.length)throw Error(errors.join("; "));
 if(!Number.isInteger(maxBatch)||maxBatch<1||maxBatch>MAX_BATCH)throw Error("Invalid turbo batch target");
 const {writer,session,branch}=request,identity={writer,session,branch};
 let state=ledger,changed=false,submitted=[];
 const inProgress=state.claims.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&c.session===session&&c.branch===branch);
 const verified=inProgress.filter(c=>verifiedDraftIds.has(c.id)).map(c=>c.id);
 if(verified.length){
  const result=transitionPool(matrix,state,registry,"submit",{...identity,ids:verified.join(","),
   evidence:Object.fromEntries(verified.filter(id=>verifiedDraftEvidence.has(id)).map(id=>[id,verifiedDraftEvidence.get(id)]))},{now,nonce:nonce+"-submitted"});
  state=result.ledger;submitted=result.ids;changed=true;
 }
 const unfinished=state.claims.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&c.session===session&&c.branch===branch);
 if(unfinished.length>=maxBatch){
  return {status:submitted.length?"PARTIAL_SUBMITTED_WAITING_FOR_NEXT_PUSH":"WAITING_FOR_DRAFTS",
   submitted,claimed:unfinished.map(c=>c.id),missing_ids:unfinished.map(c=>c.id),ledger:state,changed,
   message:"Resume unfinished claims on the same branch/session, never rewrite submitted or protected IDs."};
 }
 // A slot that reported PAUSED_QUOTA/OFFLINE submits finished work but takes no new topics.
 if(!refill){
  return {status:submitted.length?"SUBMITTED_SLOT_PAUSED":"SLOT_PAUSED_NO_REFILL",submitted,claimed:unfinished.map(c=>c.id),
   missing_ids:unfinished.map(c=>c.id),ledger:state,changed,
   message:"Slot paused by its own signal: finished drafts recorded, no new claims until it reports ACTIVE/RECOVERING."};
 }
 const candidates=poolCandidates(matrix,state,registry);
 if(!candidates.length){
  return {status:unfinished.length?"WAITING_FOR_DRAFTS":submitted.length?"BATCH_SUBMITTED_FOR_AUTO_QA":"NO_ELIGIBLE_TOPICS",
   submitted,claimed:unfinished.map(c=>c.id),missing_ids:unfinished.map(c=>c.id),ledger:state,changed,
   message:"No more eligible new draft topics. Keep unfinished claims until written; completed draft packets await strict automated QA, not independent AI review."};
 }
 const next=transitionPool(matrix,state,registry,"claim",{...identity,count:maxBatch},{now,nonce:nonce+"-claimed"});
 state=next.ledger;changed=changed||!next.idempotent;
 return {status:submitted.length?"SUBMITTED_AND_NEXT_BATCH":inProgress.length?"RESUMED_AND_REFILLED":"NEXT_BATCH_CLAIMED",
   submitted,claimed:next.ids,new_claims:next.ids.filter(id=>!unfinished.some(c=>c.id===id)),
   ledger:state,changed,
   message:"Fetch/merge latest main, write only confirmed IDs. A green 1–10 draft push automatically submits completed draft(s) and refills the active Writer slot up to ten. No public publication."};
}

/**
 * Record AI Writer revisions only for a matching machine-generated QA FAIL ticket.
 * The previous immutable version moves to `revisions` history; nothing is overwritten or deleted.
 * `revs`: [{id, revision, source_sha256, source_commit, source_path, review_verdict:"QA_FAIL", repair_basis_sha256, repair_gates}]
 */
export function applyRevisions(matrix,ledger,registry,{writer,session,branch},revs,{now}){
 if(!revs.length)return {ledger,applied:[]};
 const next=structuredClone(ledger),applied=[];
 for(const r of revs){
  const c=next.claims.find(x=>x.id===r.id&&x.status==="SUBMITTED"&&x.writer===writer&&x.session===session&&x.branch===branch);
  if(!c)throw Error("REVISION_REFUSED: no SUBMITTED claim of this session for "+r.id);
  if(r.review_verdict!=="QA_FAIL"||r.repair_basis_sha256!==c.source_sha256||!Array.isArray(r.repair_gates)||!r.repair_gates.length)
   throw Error("REVISION_REFUSED: "+r.id+" needs current strict QA failure evidence matching the exact source hash");
  if((c.revisions||[]).length>=3)throw Error("REVISION_REFUSED: "+r.id+" exceeded three automatic repairs; escalate");
  const expected=(c.revisions||[]).length+2;
  if(r.revision!==expected)throw Error("REVISION_REFUSED: "+r.id+" expects r"+expected);
  if(r.source_sha256===c.source_sha256)throw Error("REVISION_REFUSED: "+r.id+" revision is byte-identical");
  c.revisions=[...(c.revisions||[]),{source_sha256:c.source_sha256,source_commit:c.source_commit,...(c.source_path?{source_path:c.source_path}:{}),review_verdict:"QA_FAIL",repair_gates:r.repair_gates,superseded_at:now}];
  c.source_sha256=r.source_sha256;c.source_commit=r.source_commit;c.source_path=r.source_path;c.revision=r.revision;
  c.phase="REVISED_AWAITING_AUTO_QA";c.updated_at=now;applied.push(r.id);
 }
 next.revision++;
 const e=validatePool(matrix,next,registry);if(e.length)throw Error(e.join("; "));
 return {ledger:next,applied};
}
