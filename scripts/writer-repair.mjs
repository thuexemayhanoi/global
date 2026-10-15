#!/usr/bin/env node
/**
 * External AI Writer repair worklist. Read-only. No model SDK, credentials,
 * source rewrites, or bypass of original QA. An active external AI session
 * MUST perform the actual research/correction and push a new revision file.
 *   queue [--writer Wn --session s] [--include-held true]   overview (any or own tickets)
 *   next  --writer Wn --session s                           own next REPAIR ticket
 *   check --writer Wn --session s --file <revision_path>    local preflight of a revision
 */
import fs from "node:fs";
import {repairQueue,MAX_REPAIR_ATTEMPTS,HUMAN_HOLD_GATES,REPAIR_GATES} from "./repair-queue-core.mjs";
import {eligibility} from "./auto-publisher-core.mjs";
import {inboxChecks} from "./writer-lanes.mjs";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const REVISION=new RegExp("^factory/external-writers/inbox/W[123]/revisions/[A-Z]{2}-[HS]\\d{2,4}\\.r(?:"+Array.from({length:MAX_REPAIR_ATTEMPTS},(_,i)=>i+2).join("|")+")\\.json$");
function main(){
 const cmd=process.argv[2]||"queue";
 const params=process.argv.slice(3).reduce((a,k,i,x)=>{if(k.startsWith("--"))a[k.slice(2)]=x[i+1];return a;},{});
 if(!["queue","next","check"].includes(cmd))throw Error("Use queue|next|check");
 if(cmd!=="queue"){
  // A ticket belongs to exactly one Writer session; never hand another slot's work to the caller.
  if(!/^W[123]$/.test(params.writer||"")||!/^[A-Za-z0-9_-]{3,80}$/.test(params.session||""))
   throw Error(cmd+" needs your own --writer W1|W2|W3 and --session <your stable session>");
 }
 const ledger=read("factory/external-writers/claims.json");
 const report=read("factory/publisher/report.json");
 if(report.version!==2)throw Error("REPAIR_REPORT_STALE: wait for trusted Publisher to regenerate version 2 report");
 const filter={writer:params.writer||null,session:params.session||null};
 const tickets=repairQueue(report,ledger,{...filter,includeHeld:params["include-held"]==="true"});
 const checks={
  command:"An active AI Writer must keep the same session and branch, read the exact ticket, research and correct the content, write a NEW revisions/<ID>.rN.json (never overwrite the submitted original), run Writer QA, push its own branch, then fetch main and re-check the queue. Up to "+MAX_REPAIR_ATTEMPTS+" accepted revisions. Stop/escalate if still failing; NEVER lower QA thresholds, invent citations, or claim human review.",
  report_ledger_revision:report.ledger_revision,ledger_revision:ledger.revision,
  auto_model_calls:0,repair_ticket_count:tickets.filter(t=>t.state==="REPAIR").length
 };
 if(cmd==="queue"){console.log(JSON.stringify({...checks,tickets},null,2));return;}
 if(cmd==="next"){console.log(JSON.stringify({...checks,ticket:tickets.find(t=>t.state==="REPAIR")||null},null,2));return;}
 const p=params.file;
 if(!p||!REVISION.test(p))throw Error("check needs --file factory/external-writers/inbox/Wn/revisions/<ID>.rN.json (N = 2.."+(MAX_REPAIR_ATTEMPTS+1)+")");
 const packet=read(p),id=packet.matrix_id;
 const claim=ledger.claims.find(c=>c.id===id&&c.status!=="RELEASED");
 if(!claim||claim.writer!==params.writer||claim.session!==params.session)throw Error("NOT_YOUR_DRAFT: "+id+" is not held by "+params.writer+"/"+params.session+"; never repair another Writer's draft");
 if(claim.status!=="SUBMITTED")throw Error("NOT_SUBMITTED: "+id+" is still CLAIMED. Fix factory/external-writers/inbox/"+claim.writer+"/"+id+".json in place and run node scripts/writer-lanes.mjs verify-all; no revision file is needed before submission");
 const ticket=repairQueue(report,ledger,{...filter,includeHeld:true}).find(t=>t.id===id);
 if(!ticket)throw Error("NO_CURRENT_TICKET: the publisher has not evaluated "+id+" at its current hash yet (report ledger revision "+report.ledger_revision+", ledger "+ledger.revision+"); wait for the next Publisher run");
 if(ticket.state!=="REPAIR")throw Error("NOT_REPAIRABLE: "+id+" is "+ticket.state+(ticket.holds.length?" ("+ticket.holds.join(", ")+")":"")+"; a revision would be refused");
 if(p!==ticket.revision_path)throw Error("WRONG_REVISION_PATH: this ticket expects "+ticket.revision_path);
 const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json");
 const locales=read("content/locales.json"),registry=read("factory/external-writers/protected-drafts.json");
 const m=p.match(/\.r(\d+)\.json$/);
 const [local]=inboxChecks([{id,writer:ticket.writer,path:p,revision:Number(m[1]),packet,raw:fs.readFileSync(p,"utf8")}],matrix,board,locales,ledger,registry);
 const row=matrix.rows.find(r=>r.id===ticket.id),policy=read("data/seo/topic-factory/policy.json");
 const standing=read("approvals/standing-policy-20261015.json");
 const protectedIds=new Set([...(registry.protected||[]).map(x=>x.id),...(registry.held_ids||[]).map(x=>x.id)]);
 const corp=fs.existsSync("content/articles")?fs.readdirSync("content/articles").filter(x=>x.endsWith(".json")).map(x=>read("content/articles/"+x)).map(x=>({id:x.matrix_id,locale:x.locale,kind:"published",body_markdown:x.body_markdown})):[];
 const qa=eligibility({packet,claim,row,matrix,locales,policy,standing,protectedIds,corpus:corp,state:read("factory/publisher/state.json")});
 // A ticket only exists without holds, so a hold here was introduced by the revision (e.g. a new money amount).
 const blocking=qa.failed.filter(g=>REPAIR_GATES.has(g)||HUMAN_HOLD_GATES.has(g));
 console.log(JSON.stringify({id:ticket.id,path:p,local_qa:local,preflight_decision:qa.decision,failed_gates:qa.failed,blocking_gates:blocking,
  issues:qa.gates.filter(g=>!g.passed),hint:"WAIT_PARENT / WAIT_STAGE are not text problems. Publisher rechecks draft hashes, every other SUBMITTED draft, and all gates after the coordinator records a green revised Writer push; local preflight is not publication approval."},null,2));
 if(!local.passed||blocking.length)process.exitCode=1;
}
try{main()}catch(e){console.error("WRITER_REPAIR_REFUSED "+e.message);process.exitCode=1;}
