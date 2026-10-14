/**
 * Zero-click Writer coordinator decision engine.
 * Called only after the Writer branch push has passed GitHub Writer QA;
 * the trusted runner validates all remote draft files before calling this.
 * No human approval, site publishing or LLM calls occur here.
 */
import {transitionPool,poolCandidates,validatePool} from "./writer-pool-core.mjs";
export function autoAdvance(matrix,ledger,registry,request,{verifiedDraftIds=new Set(),now="2026-10-14T00:00:00Z",nonce="auto"}={}){
 const errors=validatePool(matrix,ledger,registry);
 if(errors.length)throw Error(errors.join("; "));
 const {writer,session,branch}=request,identity={writer,session,branch};
 let state=ledger,changed=false;
 let submitted=[],claimed=[];
 const inProgress=state.claims.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&c.session===session&&c.branch===branch);
 // A partial pair stays locked to the original session. Do not skip or steal it.
 if(inProgress.length){
  const ids=inProgress.map(c=>c.id);
  if(ids.some(id=>!verifiedDraftIds.has(id)))return {
    status:"WAITING_FOR_COMPLETE_PAIR",submitted,claimed:ids,
    missing_ids:ids.filter(id=>!verifiedDraftIds.has(id)),ledger:state,changed:false,
    message:"Continue writing the same claimed pair. Push both valid JSON drafts. No manual action needed."
  };
  const submit=transitionPool(matrix,state,registry,"submit",{...identity,ids:ids.join(",")},{now,nonce:nonce+"-submitted"});
  state=submit.ledger;submitted=submit.ids;changed=true;
 }
 const eligible=poolCandidates(matrix,state,registry);
 if(!eligible.length){
  return {status:submitted.length?"BATCH_SUBMITTED_WAITING_FOR_HUB":"NO_ELIGIBLE_TOPICS",
   submitted,claimed,ledger:state,changed,
   message:"No eligible unclaimed Hub or Supporting topic. Do not bypass actual Hub PUBLISHED/owner editorial gates."};
 }
 const next=transitionPool(matrix,state,registry,"claim",{...identity,count:2},{now,nonce:nonce+"-claimed"});
 state=next.ledger;claimed=next.ids;changed=changed||!next.idempotent;
 return {status:submitted.length?"SUBMITTED_AND_NEXT_PAIR":"NEXT_PAIR_CLAIMED",submitted,claimed,
   ledger:state,changed,message:"Fetch/merge fresh main; write these confirmed IDs, QA and push. GitHub will automatically submit and claim the next pair."};
}
