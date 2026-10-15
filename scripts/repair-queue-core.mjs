/**
 * Fail-closed deterministic repair queue shared by publisher and external Writers.
 * No AI/model call is made here: an active W1/W2/W3 agent reads the ticket and
 * writes a genuinely corrected NEW revision, preserving the submitted bytes.
 */
export const MAX_REPAIR_ATTEMPTS=3;
export const REPAIR_GATES=new Set([
 "G1_DRAFT_QA","G1_DEPTH","G3_OFFICIAL_EVIDENCE","G3_PRICE_EVIDENCE","G3_SENSITIVE_SOURCES","G4_EDITORIAL","G5_CONTENT_DUPLICATES"
]);
export const HUMAN_HOLD_GATES=new Set(); // deprecated: no mandatory manual review
const sourceHash=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
export function repairTicket(item,claim,{maxAttempts=MAX_REPAIR_ATTEMPTS}={}){
 if(!item||!claim||item.id!==claim.id||claim.status!=="SUBMITTED"||!sourceHash(claim.source_sha256))return null;
 if(item.source_sha256!==claim.source_sha256||item.writer!==claim.writer||item.session!==claim.session||item.branch!==claim.branch)return null;
 const failed=Array.isArray(item.failed)?item.failed:[];
 const fixable=failed.filter(g=>REPAIR_GATES.has(g)),holds=failed.filter(g=>HUMAN_HOLD_GATES.has(g));
 const attempts=(claim.revisions||[]).length;
 const permanent=failed.filter(g=>g==="G2_NOT_PROTECTED"||g==="G2_IMMUTABLE_SOURCE"||g==="G2_NEW_URL"||g==="SOURCE");
 let state="WAIT";if(permanent.length)state="BLOCKED";
 else if(fixable.length&&attempts>=maxAttempts)state="ESCALATED_MAX_ATTEMPTS";
 else if(fixable.length)state="REPAIR";
 else if(failed.includes("G2_PARENT_PUBLISHED"))state="WAIT_PARENT";
 else if(failed.includes("G7_STAGE_CAP"))state="WAIT_STAGE";
 const next_revision=attempts+2;
 const prefix="factory/external-writers/inbox/"+claim.writer+"/revisions/";
 const actions={
  G1_DRAFT_QA:"Fix exact structural/metadata/source/factual errors. Do not claim human review.",
  G1_DEPTH:"Expand with useful, original, non-repetitive research, never padding.",
  G3_OFFICIAL_EVIDENCE:"Verify every hard legal/safety assertion with an official citation in the SAME paragraph; otherwise remove or qualify the unsupported claim.",
  G3_PRICE_EVIDENCE:"For each amount cite an actual dated source in the same paragraph, list its exact HTTPS URL in packet.sources, or remove the claim.",
  G3_SENSITIVE_SOURCES:"Cite at least one authoritative official source inline in a LEGAL/SAFETY article and list it with a real checked_on date.",
  G4_EDITORIAL:"Fix native-language fluency, real H2 depth, repeated text, keyword stuffing and contextual internal links.",
  G5_CONTENT_DUPLICATES:"Rewrite with distinct reader intent and researched original value; never paraphrase a near-duplicate just to bypass similarity."
 };
 return {id:claim.id,writer:claim.writer,session:claim.session,branch:claim.branch,source_sha256:claim.source_sha256,
  source_commit:claim.source_commit||item.source_commit||null,
  state,attempts,max_attempts:maxAttempts,next_revision,revision_path:prefix+claim.id+".r"+next_revision+".json",
  failed,fixable,holds,details:Array.isArray(item.details)?item.details:[],
  instructions:fixable.map(g=>actions[g]),current_source_path:claim.source_path||"factory/external-writers/inbox/"+claim.writer+"/"+claim.id+".json"};
}
export function ticketValid(ticket,claim){
 return Boolean(ticket&&ticket.state==="REPAIR"&&ticket.id===claim.id&&ticket.writer===claim.writer&&
  ticket.session===claim.session&&ticket.branch===claim.branch&&ticket.source_sha256===claim.source_sha256&&
  ticket.attempts<ticket.max_attempts&&ticket.fixable.length);
}
export function repairQueue(report,ledger,{writer=null,session=null,includeHeld=false}={}){
 const items=Array.isArray(report?.items)?report.items:[],claims=Array.isArray(ledger?.claims)?ledger.claims:[];
 const byId=new Map(claims.map(c=>[c.id,c]));
 const out=[];
 for(const item of items){
  const c=byId.get(item.id),ticket=repairTicket(item,c);
  if(!ticket||(writer&&ticket.writer!==writer)||(session&&ticket.session!==session))continue;
  if(ticket.state==="REPAIR"||includeHeld&&ticket.state!=="WAIT")out.push(ticket);
 }
 const rank={REPAIR:0,ESCALATED_MAX_ATTEMPTS:2,BLOCKED:3};
 return out.sort((a,b)=>(rank[a.state]??9)-(rank[b.state]??9)||a.attempts-b.attempts||a.id.localeCompare(b.id));
}
