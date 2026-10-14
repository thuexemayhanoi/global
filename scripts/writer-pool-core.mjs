/**
 * Safe dynamic pool for external human-operated AI sessions.
 * Data-only planner: ALL writes are serialized by writer-pool.yml on main.
 * This module performs no I/O and never publishes articles.
 */
export const WRITERS=["W1","W2","W3"];
// Shared cap across one active session per lane. Writer may push 1..10 drafts;
// QA/publisher still processes each packet independently, never auto-publishes.
export const MAX_BATCH=10;
const ACTIVE=new Set(["CLAIMED","SUBMITTED"]);
const VALID=new Set(["CLAIMED","SUBMITTED","RELEASED"]);
const PLANNED=new Set(["IDEA","RESEARCHED"]);
const SESSION=/^[A-Za-z0-9_-]{3,80}$/;
const SORT_ROLES={HUB:0,SUPPORT:1};
const sortRows=(a,b)=>(SORT_ROLES[a.role]??9)-(SORT_ROLES[b.role]??9)||
 (Number(a.priority)||99)-(Number(b.priority)||99)||
 a.locale.localeCompare(b.locale)||a.id.localeCompare(b.id);

export function validatePool(matrix,ledger,protectedData){
 const errors=[];
 if(!Array.isArray(matrix?.rows)||!Array.isArray(matrix?.locales))errors.push("Invalid SEO Matrix");
 if(ledger?.version!==1||!Number.isInteger(ledger?.revision)||!Array.isArray(ledger?.claims))errors.push("Invalid claims schema");
 if(protectedData?.version!==1||!Array.isArray(protectedData?.protected))errors.push("Invalid protected drafts registry");
 if(errors.length)return errors;
 const rows=new Map(matrix.rows.map(r=>[r.id,r]));
 const held=protectedData.held_ids||[];
 if(!Array.isArray(held))errors.push("Invalid additional editorial holds");
 const reserved=new Set();
 for(const p of held){
  if(!rows.has(p.id)||!Number.isInteger(p.source_pr)||typeof p.branch!=="string")errors.push("Bad editorial hold "+p.id);
  if(reserved.has(p.id))errors.push("Duplicate protected ID "+p.id);
  reserved.add(p.id);
 }
 for(const p of protectedData.protected){
  if(!rows.has(p.id)||!WRITERS.includes(p.writer)||!SESSION.test(p.session||"")||
   !new RegExp("^writer/"+String(p.writer).toLowerCase()+"-[A-Za-z0-9_-]+$").test(p.branch||""))errors.push("Bad protected draft "+p.id);
  if(reserved.has(p.id))errors.push("Duplicate protected ID "+p.id);
  reserved.add(p.id);
 }
 const active=new Set(),claimIds=new Set(),claimedSessions=new Map(),unfinishedPerLane=new Map();
 for(const c of ledger.claims){
  if(!rows.has(c.id)||!WRITERS.includes(c.writer)||!SESSION.test(c.session||"")||
     !VALID.has(c.status)||typeof c.branch!=="string"||
     !c.branch.startsWith("writer/"+c.writer.toLowerCase()+"-"))errors.push("Invalid claim "+c.id);
  if(!c.claim_id||!c.at||!c.updated_at)errors.push("Incomplete claim "+c.id);
  if(c.source_sha256!==undefined||c.source_commit!==undefined){
   if(c.status!=="SUBMITTED"||!/^[0-9a-f]{64}$/.test(c.source_sha256||"")||
      !/^[0-9a-f]{40}$/.test(c.source_commit||""))errors.push("Invalid immutable submitted draft evidence "+c.id);
  }
  if(c.status!=="RELEASED"){
   if(active.has(c.id))errors.push("Duplicate live claim "+c.id);
   if(reserved.has(c.id))errors.push("Claim overlaps protected existing draft "+c.id);
   active.add(c.id);
  }
  if(c.status==="CLAIMED"){
   const sessionKey=c.session+"::"+c.branch;
   if(claimedSessions.has(c.writer)&&claimedSessions.get(c.writer)!==sessionKey)errors.push("Concurrent sessions on the same Writer lane "+c.writer);
   claimedSessions.set(c.writer,sessionKey);
   unfinishedPerLane.set(c.writer,(unfinishedPerLane.get(c.writer)||0)+1);
   if(unfinishedPerLane.get(c.writer)>MAX_BATCH)errors.push("Writer exceeds ten unfinished claims "+c.writer);
  }
  if(c.claim_id&&claimIds.has(c.claim_id))errors.push("Duplicate claim token");
  claimIds.add(c.claim_id);
 }
 return errors;
}
export function ensureIdentity(writer,session,branch){
 if(!WRITERS.includes(writer))throw Error("Writer must be W1, W2 or W3");
 if(!SESSION.test(session||""))throw Error("Use stable --session (3-80 safe chars)");
 if(typeof branch!=="string"||!new RegExp("^writer/"+writer.toLowerCase()+"-[A-Za-z0-9_-]+$").test(branch))
  throw Error("Use own branch writer/"+writer.toLowerCase()+"-*");
}
export function protectedSet(registry){
 return new Set([...registry.protected.map(p=>p.id),...(registry.held_ids||[]).map(p=>p.id)]);
}
export function poolCandidates(matrix,ledger,registry,opts={}){
 const unavailable=new Set([...protectedSet(registry),...ledger.claims.filter(c=>ACTIVE.has(c.status)).map(c=>c.id),...(opts.inboxIds||[])]);
 return matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&
  PLANNED.has(r.status)&&!unavailable.has(r.id)&&(!opts.locale||r.locale===opts.locale)&&
  // Supporting may be DRAFTED before parent Hub publication. Publisher
  // still independently refuses to publish them until that gate passes.
  (!r.parent_id||matrix.rows.some(p=>p.id===r.parent_id)))
  .sort(sortRows);
}
export function poolStatus(matrix,ledger,registry,{writer,session,branch,locale}={}){
 const problems=validatePool(matrix,ledger,registry);
 if(problems.length)throw Error(problems.join("; "));
 if(writer&&!WRITERS.includes(writer))throw Error("Unknown writer "+writer);
 if(locale&&!matrix.locales.includes(locale))throw Error("Unknown locale "+locale);
 const active=ledger.claims.filter(c=>ACTIVE.has(c.status));
 const mine=active.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&c.session===session&&(!branch||c.branch===branch));
 const assigned=mine.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).map(c=>matrix.rows.find(r=>r.id===c.id));
 const candidates=poolCandidates(matrix,ledger,registry,{locale});
 const pending=matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&PLANNED.has(r.status));
 const waitingParent=pending.filter(r=>r.parent_id&&matrix.rows.find(p=>p.id===r.parent_id)?.status!=="PUBLISHED");
 const unblockedWithoutFree= pending.length-waitingParent.length-candidates.length;
 const pub=matrix.rows.filter(r=>r.status==="PUBLISHED"&&["HUB","SUPPORT"].includes(r.role)).length;
 let status=assigned.length?"WRITE_NEXT_BATCH":candidates.length?"CLAIM_REQUIRED":pending.length?
   waitingParent.length===pending.length?"WAIT_PARENT_PUBLICATION":"AWAIT_CLAIMS_OR_REVIEW":
   pub===matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)).length?"COMPLETE":"AWAIT_EDITORIAL_REVIEW";
 if(!writer&&status==="WRITE_NEXT_BATCH")status="CLAIM_REQUIRED";
 return {status,writer:writer||null,session:session||null,branch:branch||null,locale:locale||null,
  published:pub,protected_drafts:registry.protected.length+(registry.held_ids||[]).length,submitted:active.filter(c=>c.status==="SUBMITTED").length,
  active_claims:active.filter(c=>c.status==="CLAIMED").length,
  available_now:candidates.length,blocked_by_parent:0,parents_unpublished_for_publish:waitingParent.length,waiting_for_review_or_claim:Math.max(0,pending.length-candidates.length),
  items:(assigned.length?assigned:candidates.slice(0,MAX_BATCH)).map(r=>({
   id:r.id,locale:r.locale,role:r.role,title:r.working_title,query:r.primary_query,url:r.url,
   parent_id:r.parent_id,legacy_owner:null,
   output:writer?"factory/external-writers/inbox/"+writer+"/"+r.id+".json":null
  })),claim_required:!assigned.length&&candidates.length>0,
  next_action:assigned.length?"Write only confirmed claim IDs (max 10). QA and push your own Writer branch; green CI automatically submits valid drafts and refills slots.":candidates.length?
   "Request a serialized claim using writer-pool.yml and read the confirmed ledger before writing.":
   "No unclaimed eligible topic. Wait for editorial publication, reconcile claims or resume after safe release.",
  auto_publish:false};
}
export function transitionPool(matrix,ledger,registry,action,input,{now=new Date().toISOString(),nonce="claim"}={}){
 const {writer,session,branch}=input;ensureIdentity(writer,session,branch);
 const problems=validatePool(matrix,ledger,registry);
 if(problems.length)throw Error(problems.join("; "));
 const next=structuredClone(ledger);
 let items=[];
 if(action==="claim"){
  const count=Number(input.count??2);
  if(!Number.isInteger(count)||count<1||count>MAX_BATCH)throw Error("Claim batch size must be 1.."+MAX_BATCH);
  if(input.locale&&!matrix.locales.includes(input.locale))throw Error("Unknown locale");
  const other=next.claims.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&c.session!==session);
  if(other.length)throw Error("WRITER_SLOT_HELD: "+writer+" has active unfinished claims in a different session; resume it or obtain explicit coordinator release");
  const active=next.claims.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&c.session===session);
  if(active.some(c=>c.branch!==branch))throw Error("Session has claims on another branch; resume original branch");
  if(active.length>count)throw Error("Too many unfinished claims; submit before next batch");
  items=active.map(c=>c.id);
  const newIds=poolCandidates(matrix,next,registry,{locale:input.locale}).slice(0,count-items.length).map(r=>r.id);
  for(const id of newIds){
   const claim={id,writer,session,branch,claim_id:nonce+"-"+String(next.revision+1)+"-"+id,
     status:"CLAIMED",at:now,updated_at:now,phase:"WRITING"};
   next.claims.push(claim);items.push(id);
  }
  if(!items.length)throw Error("No eligible unclaimed topics: inspect parent Hub publication and protected drafts");
  // Re-dispatch after a network timeout must resume the same batch, not
  // change ledger revision or consume another pair.
  if(!newIds.length)return {ledger:next,ids:items,action,revision:next.revision,idempotent:true};
 }else if(action==="submit"){
  const ids=String(input.ids||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!ids.length||ids.length>MAX_BATCH||new Set(ids).size!==ids.length)throw Error("Submit exactly 1.."+MAX_BATCH+" unique IDs");
  for(const id of ids){
   const c=next.claims.find(c=>c.id===id&&c.status==="CLAIMED");
   if(!c||c.writer!==writer||c.session!==session||c.branch!==branch)throw Error("No matching active claim "+id);
   c.status="SUBMITTED";c.phase="WAITING_EDITORIAL_REVIEW";c.updated_at=now;
   const evidence=input.evidence?.[id];
   if(evidence){
    if(!/^[0-9a-f]{64}$/.test(evidence.source_sha256||"")||!/^[0-9a-f]{40}$/.test(evidence.source_commit||""))
     throw Error("Invalid remote draft evidence for "+id);
    c.source_sha256=evidence.source_sha256;c.source_commit=evidence.source_commit;
   }
   items.push(id);
  }
 }else if(action==="release"){
  const id=String(input.ids||"").trim();
  if(!id||id.includes(","))throw Error("Release requires exactly one ID");
  if(input.confirmed!==true||String(input.reason||"").trim().length<12)
   throw Error("Release requires explicit confirmed:true and reason >=12 chars");
  const c=next.claims.find(c=>c.id===id&&c.status==="CLAIMED");
  if(!c||c.writer!==writer||c.session!==session||c.branch!==branch)throw Error("Cannot release unowned/unclaimed or submitted item");
  c.status="RELEASED";c.phase="COORDINATOR_RELEASE";c.reason=input.reason.trim();c.updated_at=now;items.push(id);
 }else throw Error("Unsupported action "+action);
 next.revision++;
 const errs=validatePool(matrix,next,registry);
 if(errs.length)throw Error(errs.join("; "));
 return {ledger:next,ids:items,action,revision:next.revision};
}
