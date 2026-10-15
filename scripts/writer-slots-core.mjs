/**
 * Universal Writer slots: W1/W2/W3 are seats, not AI providers.
 *
 * Any AI agent (ChatGPT, Claude, Gemini, …) with quota and repository access
 * can take a slot that holds no unfinished claims, write from the shared
 * queue in any locale it can write natively, and keep its session/branch
 * across restarts. Deterministic, no I/O.
 *
 * States
 *   AVAILABLE    no unfinished claims: any new session may claim
 *   ACTIVE       a session holds claims and is writing
 *   PAUSED_QUOTA the holding session reported exhausted quota
 *   OFFLINE      the holding session reported/was confirmed ended
 *   RECOVERING   the paused session came back and is resuming its claims
 *
 * State only changes on a trusted signal: the agent's own request file on its
 * own branch (read by the post-QA coordinator), or a confirmed coordinator
 * dispatch. No timer or timeout ever releases or transfers a claim.
 */
import {WRITERS,validatePool} from "./writer-pool-core.mjs";
export const SLOT_STATES=["AVAILABLE","ACTIVE","PAUSED_QUOTA","OFFLINE","RECOVERING"];
const SIGNALS=new Set(["ACTIVE","PAUSED_QUOTA","OFFLINE","RECOVERING"]);
const SESSION=/^[A-Za-z0-9_-]{3,80}$/;

export function emptySlots(){
 return {version:1,revision:0,slots:Object.fromEntries(WRITERS.map(w=>[w,{state:"AVAILABLE",session:null,branch:null,agent:null,reason:null,updated_at:null}]))};
}
export function validateSlots(slots){
 const e=[];
 if(slots?.version!==1||!Number.isInteger(slots?.revision)||!slots?.slots)return ["Invalid slots registry"];
 for(const w of WRITERS){
  const s=slots.slots[w];
  if(!s||!SLOT_STATES.includes(s.state))e.push("Invalid slot "+w);
  else if(s.state!=="AVAILABLE"&&(!SESSION.test(s.session||"")||typeof s.branch!=="string"))e.push("Slot "+w+" state needs session and branch");
  if(s?.agent!==null&&s?.agent!==undefined&&(typeof s.agent!=="string"||s.agent.length>60||/[<>{}]/.test(s.agent)))e.push("Slot "+w+" agent label invalid");
 }
 for(const k of Object.keys(slots.slots))if(!WRITERS.includes(k))e.push("Unknown slot "+k);
 return e;
}
/** Effective view: claims decide occupancy; the registry only refines an occupied slot's state. */
export function slotView(ledger,slots){
 const out={};
 for(const w of WRITERS){
  const open=ledger.claims.filter(c=>c.writer===w&&c.status==="CLAIMED");
  const rec=slots?.slots?.[w]||{};
  const holder=open[0]?{session:open[0].session,branch:open[0].branch}:null;
  let state="AVAILABLE";
  if(holder)state=rec.session===holder.session&&SIGNALS.has(rec.state)?rec.state:"ACTIVE";
  out[w]={state,session:holder?.session||null,branch:holder?.branch||null,agent:holder&&rec.session===holder.session?rec.agent||null:null,
   claimed:open.map(c=>c.id),submitted:ledger.claims.filter(c=>c.writer===w&&c.status==="SUBMITTED").length,
   accepts_new_claims:state==="AVAILABLE"||state==="ACTIVE"||state==="RECOVERING",
   reason:holder&&rec.session===holder.session?rec.reason||null:null};
 }
 return out;
}
/** Agent self-report (its own session) or confirmed coordinator report. */
export function signalSlot(ledger,slots,{writer,session,branch,state,reason="",agent=null,source,confirmed=false,now}){
 if(!WRITERS.includes(writer))throw Error("Unknown slot "+writer);
 if(!SIGNALS.has(state))throw Error("Signal must be ACTIVE, PAUSED_QUOTA, OFFLINE or RECOVERING");
 if(!SESSION.test(session||"")||typeof branch!=="string"||!branch.startsWith("writer/"+writer.toLowerCase()+"-"))throw Error("Signal needs the slot's session and writer/"+writer.toLowerCase()+"-* branch");
 const view=slotView(ledger,slots)[writer];
 if(source==="agent"){
  if(view.session&&view.session!==session)throw Error("SLOT_HELD_BY_OTHER_SESSION: only "+view.session+" may report for "+writer);
 }else if(source==="coordinator"){
  if(confirmed!==true||String(reason).trim().length<12)throw Error("Coordinator signal needs confirmed:true and a reason ≥12 chars");
  if(!["OFFLINE","PAUSED_QUOTA"].includes(state))throw Error("Coordinator may only record OFFLINE or PAUSED_QUOTA");
  if(view.session!==session)throw Error("Coordinator signal must name the session that holds the slot");
 }else throw Error("Signal source must be agent or coordinator");
 if(state==="RECOVERING"&&!["PAUSED_QUOTA","OFFLINE"].includes(view.state))throw Error("RECOVERING only follows PAUSED_QUOTA or OFFLINE");
 const next=structuredClone(slots);
 next.slots[writer]={state,session,branch,agent:agent??slots.slots[writer]?.agent??null,reason:String(reason).trim()||null,updated_at:now};
 next.revision++;
 const e=validateSlots(next);if(e.length)throw Error(e.join("; "));
 return next;
}
/**
 * Coordinated handover of a PAUSED_QUOTA/OFFLINE slot: release only the
 * claimed IDs that have NO draft on the holder's branch (caller verifies the
 * branch at an exact commit). Drafted-but-unsubmitted IDs stay owned so no
 * written work is lost or rewritten; SUBMITTED drafts are never touched.
 */
export function handover(matrix,ledger,slots,registry,{writer,session,branch,draftedIds,reason,confirmed,now}){
 const view=slotView(ledger,slots)[writer];
 if(!view||!["PAUSED_QUOTA","OFFLINE"].includes(view.state))throw Error("HANDOVER_REFUSED: slot "+writer+" is "+(view?.state||"unknown")+"; the holder must be PAUSED_QUOTA or OFFLINE");
 if(view.session!==session||view.branch!==branch)throw Error("HANDOVER_REFUSED: session/branch must match the slot holder");
 if(confirmed!==true||String(reason||"").trim().length<12)throw Error("HANDOVER_REFUSED: confirmed:true and reason ≥12 chars required");
 if(!(draftedIds instanceof Set))throw Error("HANDOVER_REFUSED: caller must inspect the branch and pass drafted IDs");
 const next=structuredClone(ledger),released=[],kept=[];
 for(const c of next.claims){
  if(c.writer!==writer||c.session!==session||c.status!=="CLAIMED")continue;
  if(draftedIds.has(c.id)){kept.push(c.id);continue;}
  c.status="RELEASED";c.phase="COORDINATED_HANDOVER";c.reason=String(reason).trim();c.updated_at=now;released.push(c.id);
 }
 if(!released.length)throw Error("HANDOVER_NOOP: every claimed ID already has a draft on the branch; resume the session instead");
 next.revision++;
 const e=validatePool(matrix,next,registry);if(e.length)throw Error(e.join("; "));
 return {ledger:next,released,kept};
}
/** Compare-and-swap guard mirroring the git push check used by every coordinator. */
export function casCommit(current,expectedRevision,proposed){
 if(current.revision!==expectedRevision)return {ok:false,reason:"STALE_REVISION "+expectedRevision+"→"+current.revision+": recompute from latest main"};
 return {ok:true,ledger:proposed};
}
