#!/usr/bin/env node
/**
 * External AI Writer repair worklist. Read-only. No model SDK, credentials,
 * source rewrites, or bypass of original QA. An active external AI session
 * MUST perform the actual research/correction and push a new revision file.
 */
import fs from "node:fs";
import {repairQueue} from "./repair-queue-core.mjs";
import {eligibility} from "./auto-publisher-core.mjs";
import {verifyPacket} from "./writer-lanes.mjs";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const params=process.argv.slice(3).reduce((a,k,i,x)=>{if(k.startsWith("--"))a[k.slice(2)]=x[i+1];return a;},{});
const cmd=process.argv[2]||"queue";
if(!["queue","next","check"].includes(cmd))throw Error("Use queue|next|check");
const ledger=read("factory/external-writers/claims.json");
const report=read("factory/publisher/report.json");
if(report.version!==2)throw Error("REPAIR_REPORT_STALE: wait for trusted Publisher to regenerate version 2 report");
const tickets=repairQueue(report,ledger,{writer:params.writer||null,session:params.session||null,includeHeld:params["include-held"]==="true"});
const checks={
  command:"An active AI Writer must keep the same session and branch, read the exact ticket, research and correct the content, write a NEW revisions/<ID>.rN.json (never overwrite the submitted original), run Writer QA, push its own branch, then fetch main and re-check the queue. Repeat up to 3 revisions. Stop/escalate if still failing; NEVER lower QA thresholds, invent citations, or claim human review.",
  auto_model_calls:0,repair_ticket_count:tickets.length
};
if(cmd==="queue")console.log(JSON.stringify({...checks,tickets},null,2));
if(cmd==="next")console.log(JSON.stringify({...checks,ticket:tickets.find(t=>t.state==="REPAIR")||null},null,2));
if(cmd==="check"){
 const p=params.file;if(!p||!/^factory\/external-writers\/inbox\/W[123]\/revisions\/[A-Z]{2}-[HS]\d{2,4}\.r[2-4]\.json$/.test(p))throw Error("check needs --file factory/external-writers/inbox/Wn/revisions/ID.rN.json");
 const packet=read(p),ticket=tickets.find(t=>t.id===packet.matrix_id);
 if(!ticket||ticket.state!=="REPAIR"||p!==ticket.revision_path)throw Error("No current source-hash-bound repair ticket for file");
 const claim=ledger.claims.find(c=>c.id===ticket.id);
 const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json");
 const locales=read("content/locales.json"),registry=read("factory/external-writers/protected-drafts.json");
 const local=verifyPacket(packet,ticket.writer,matrix,board,locales,ledger,registry);
 const row=matrix.rows.find(r=>r.id===ticket.id),policy=read("data/seo/topic-factory/policy.json");
 const standing=read("approvals/standing-policy-20261015.json");
 const protectedIds=new Set([...(registry.protected||[]).map(x=>x.id),...(registry.held_ids||[]).map(x=>x.id)]);
 const corp=fs.existsSync("content/articles")?fs.readdirSync("content/articles").filter(x=>x.endsWith(".json")).map(x=>read("content/articles/"+x)).map(x=>({id:x.matrix_id,locale:x.locale,kind:"published",body_markdown:x.body_markdown})):[];
 const qa=eligibility({packet,claim,row,matrix,locales,policy,standing,protectedIds,corpus:corp,state:read("factory/publisher/state.json")});
 console.log(JSON.stringify({id:ticket.id,path:p,local_qa:local,preflight_decision:qa.decision,failed_gates:qa.failed,
  issues:qa.gates.filter(g=>!g.passed),hint:"Publisher rechecks draft hashes, every other SUBMITTED draft, and all gates after Coordinator receives a green revised Writer push; local preflight is not publication approval."},null,2));
 if(!local.passed||qa.failed.some(g=>["G1_DRAFT_QA","G1_DEPTH","G3_OFFICIAL_EVIDENCE","G4_EDITORIAL","G5_CONTENT_DUPLICATES"].includes(g)))process.exitCode=1;
}
