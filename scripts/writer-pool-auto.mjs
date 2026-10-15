#!/usr/bin/env node
/**
 * Trusted post-Writer-QA coordinator. Execute ONLY on main in the
 * workflow_run "Global Dynamic Writer Autopilot" after a successful
 * same-repository Writer QA PUSH. Reads branch drafts as DATA, never executes
 * source from the Writer branch. No model API and NO article publication.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {randomUUID,createHash} from "node:crypto";
import {autoAdvance,applyRevisions,takeRepairTickets} from "./writer-pool-auto-core.mjs";
import {repairQueue,ticketValid} from "./repair-queue-core.mjs";
import {validateRequest} from "./writer-request-core.mjs";
import {verifyPacket,checkDuplicates} from "./writer-lanes.mjs";
import {emptySlots,slotView,signalSlot,validateSlots} from "./writer-slots-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const repo="thuexemayhanoi/global";
const ledgerFile="factory/external-writers/claims.json";
const slotsFile="factory/external-writers/slots.json";
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const shell=(cmd,args)=>execFileSync(cmd,args,{cwd:ROOT,encoding:"utf8",timeout:24000,maxBuffer:8*1024*1024}).trim();
const git=(...args)=>shell("git",args);
// Byte-exact article evidence: unlike shell(), git show must NOT trim whitespace.
const gitRaw=(...args)=>execFileSync("git",args,{cwd:ROOT,encoding:"utf8",timeout:24000,maxBuffer:8*1024*1024});
const flags=args=>{const r={};for(let i=0;i<args.length;i++){if(!args[i].startsWith("--"))throw Error("Unexpected parameter "+args[i]);r[args[i].slice(2)]=args[++i];}return r;};
function assertAuthorized(){
 if(process.env.GITHUB_ACTIONS!=="true"||process.env.GITHUB_WORKFLOW!=="Global Dynamic Writer Autopilot")
  throw Error("AUTO_POOL_REFUSED: must execute only in trusted post-QA GitHub Actions");
 if(git("branch","--show-current")!=="main")throw Error("AUTO_POOL_REFUSED: main checkout required");
 if(git("status","--porcelain"))throw Error("AUTO_POOL_REFUSED: main working tree must start clean");
}
function repoPR(branch){
 const raw=shell("gh",["pr","list","--repo",repo,"--head",branch,"--state","open","--json","number,headRefName"]);
 const prs=JSON.parse(raw);
 return prs.find(p=>p.headRefName===branch);
}
function parseRequestFromCommit(sha,branch){
 const writer=branch.slice("writer/".length,"writer/w1".length).toUpperCase();
 if(!["W1","W2","W3"].includes(writer))throw Error("Invalid Writer branch "+branch);
 const names=git("ls-tree","-r","--name-only",sha,"--","factory/external-writers/requests/")
   .split("\n").filter(Boolean);
 // Never activate a branch whose request belongs to another lane.
 if(names.some(p=>!p.startsWith("factory/external-writers/requests/"+writer+"/")))
  throw Error("Cross-lane request file is forbidden");
 if(!names.length)return null; // Legacy PR push without opt-in, safely ignored.
 if(names.length!==1)throw Error("Exactly one Writer request per branch required");
 const file=names[0],obj=JSON.parse(git("show",sha+":"+file));
 return validateRequest(obj,file,branch);
}
function draftSet(sha,claims,request,matrix,board,locales,ledger,registry){
 const verified=new Set(),evidence=new Map(),packets=[];
 for(const claim of claims){
  const file="factory/external-writers/inbox/"+request.writer+"/"+claim.id+".json";
  let raw;
  try{raw=gitRaw("show",sha+":"+file);}catch{continue;} // Incomplete pair, not a failed submit.
  let packet;
  try{packet=JSON.parse(raw);}catch{throw Error("Malformed submitted JSON "+file);}
  if(packet.matrix_id!==claim.id||packet.writer_session!==request.session)
   throw Error("Submitted article has wrong ID/session "+file);
  const qc=verifyPacket(packet,request.writer,matrix,board,locales,ledger,registry);
  if(!qc.passed)throw Error("Article failed main-source QA "+file+": "+qc.errors.join("; "));
  verified.add(claim.id);
  evidence.set(claim.id,{source_sha256:createHash("sha256").update(raw).digest("hex"),source_commit:sha});
  packets.push({writer:request.writer,id:claim.id,path:file,packet});
 }
 const dups=checkDuplicates(packets);
 if(dups.length)throw Error(dups.join("; "));
 return {verified,evidence};
}
function main(){
 const o=flags(process.argv.slice(2)),branch=o.branch,sha=o.sha;
 assertAuthorized();
 if(!/^writer\/w[123]-[A-Za-z0-9_-]+$/.test(branch||""))throw Error("Invalid Writer source branch");
 if(!/^[0-9a-f]{40}$/.test(sha||""))throw Error("Expected exact 40-char green CI commit SHA");
 // Trust exact remote branch commit only. Older superseded push runs may finish
 // after newer ones and must not update the shared ledger from stale content.
 git("fetch","--no-tags","origin","refs/heads/"+branch+":refs/remotes/origin/"+branch);
 const latest=git("rev-parse","refs/remotes/origin/"+branch);
 if(latest!==sha){
  console.log("AUTO_POOL_STALE_GREEN_RUN_SKIP source="+sha+" latest="+latest);
  return;
 }
 const request=parseRequestFromCommit(sha,branch);
 if(!request){
  console.log("AUTO_POOL_NOT_OPTED_IN: branch has no Writer start request");return;
 }
 const matrix=read("data/seo/master-matrix.json"),ledger=read(ledgerFile),
   registry=read("factory/external-writers/protected-drafts.json"),
   board=read("factory/external-writers/assignments.json"),
   locales=read("content/locales.json");
 const inProgress=ledger.claims.filter(c=>c.status==="CLAIMED"&&c.writer===request.writer&&c.session===request.session&&c.branch===branch);
 const {verified,evidence}=draftSet(sha,inProgress,request,matrix,board,locales,ledger,registry);
 // Submission is immutable: every later push must preserve the exact remote
 // bytes of all previously submitted packets, or fail closed. Protected
 // legacy draft IDs use separate protection and are not rewritten.
 const own=ledger.claims.filter(c=>c.status==="SUBMITTED"&&c.branch===branch&&c.writer===request.writer&&c.session===request.session&&c.source_sha256);
 for(const c of own){
  // The current version and every superseded version stay byte-identical on the branch.
  for(const v of [{source_sha256:c.source_sha256,source_path:c.source_path},...(c.revisions||[])]){
   const file=v.source_path||"factory/external-writers/inbox/"+(c.handoffs?.[0]?.writer||request.writer)+"/"+c.id+".json";
   // Cross-writer sources retain their exact commit/SHA but are not present on
   // the new holder's branch. Never mistake their absence for changed bytes.
   if(!file.startsWith("factory/external-writers/inbox/"+request.writer+"/"))continue;
   let prior;
   try{prior=gitRaw("show",sha+":"+file);}
   catch{throw Error("Submitted draft disappeared from Writer branch: "+file);}
   if(createHash("sha256").update(prior).digest("hex")!==v.source_sha256)throw Error("IMMUTABLE_SUBMITTED_DRAFT_CHANGED "+file+": restore exact committed content; revise via revisions/<ID>.rN.json");
  }
 }
 // Revisions: new files only, for strict auto-QA FAIL tickets bound to the immutable source SHA.
 const revs=[];
 const revNames=git("ls-tree","-r","--name-only",sha,"--","factory/external-writers/inbox/"+request.writer+"/revisions/").split("\n").filter(Boolean);
 const report=revNames.length||request.repair_take===true?read("factory/publisher/report.json"):null;
 if(report&&report.version!==2)throw Error("REPAIR_REPORT_STALE: trusted publisher has not emitted hash-bound repair tickets");
 const allTickets=report?repairQueue(report,ledger,{writer:request.writer,session:request.session,includeHeld:true}):[];
 const repairTasks=new Map(allTickets.filter(t=>t.state==="REPAIR").map(t=>[t.id,t]));
 for(const file of revNames){
  const m=file.match(/\/revisions\/([A-Z]{2}-[HS][0-9]{2,4})\.r([0-9]+)\.json$/);
  if(!m)throw Error("Invalid revision file "+file);
  const c=own.find(x=>x.id===m[1]);
  if(c&&(c.source_path===file||(c.revisions||[]).some(v=>v.source_path===file)))continue; // already recorded
  if(!c){console.log("REVISION_IGNORED "+file+": "+m[1]+" is not a SUBMITTED draft of this session (Writer QA reports this too)");continue;}
  const ticket=repairTasks.get(c.id);
  if(!ticket||!ticketValid(ticket,c)){
   const held=allTickets.find(t=>t.id===c.id);
   throw Error("REPAIR_TICKET_REQUIRED: "+c.id+" has "+(held?"state "+held.state:"no current machine QA failure for its exact hash")+"; a revision is accepted only for a REPAIR ticket of this writer and session");
  }
  if(file!==ticket.revision_path||Number(m[2])!==ticket.next_revision)throw Error("REPAIR_VERSION_REFUSED: expected "+ticket.revision_path);
  const raw=gitRaw("show",sha+":"+file);
  let packet;try{packet=JSON.parse(raw);}catch{throw Error("Malformed revision JSON "+file);}
  if(packet.matrix_id!==c.id||packet.writer_session!==request.session)throw Error("Revision has wrong ID/session "+file);
  const qc=verifyPacket(packet,request.writer,matrix,board,locales,ledger,registry);
  if(!qc.passed)throw Error("Revision failed main-source QA "+file+": "+qc.errors.join("; "));
  revs.push({id:c.id,revision:Number(m[2]),source_sha256:createHash("sha256").update(raw).digest("hex"),source_commit:sha,source_path:file,review_verdict:"QA_FAIL",repair_basis_sha256:ticket.source_sha256,repair_gates:ticket.fixable});
 }
 // Only real green Writer PRs may enter the immutable SUBMITTED queue.
 // Initial branch/request may claim without a PR; the outside AI must open a
 // draft PR once before pushing its first completed pair.
 if(verified.size||revs.length){
  if(!repoPR(branch))throw Error("AUTO_POOL_WAIT_PR: Open a Writer draft PR to main once, then push a small updated commit; no manual Actions button needed");
 }
 // Slot signal comes only from the agent's own request file on its own green branch commit.
 const now=new Date().toISOString();
 const slotsBefore=fs.existsSync(path.join(ROOT,slotsFile))?read(slotsFile):emptySlots();
 const slotErr=validateSlots(slotsBefore);if(slotErr.length)throw Error(slotErr.join("; "));
 let slots=slotsBefore;
 const wanted=request.slot_state||"ACTIVE",view=slotView(ledger,slots)[request.writer];
 const signal=wanted==="RECOVERING"&&!["PAUSED_QUOTA","OFFLINE"].includes(view.state)?"ACTIVE":wanted;
 const rec=slots.slots[request.writer];
 if(rec.state!==signal||rec.session!==request.session||rec.branch!==branch||(request.agent&&rec.agent!==request.agent))
  slots=signalSlot(ledger,slots,{writer:request.writer,session:request.session,branch,state:signal,reason:request.slot_reason||"",agent:request.agent||null,source:"agent",now});
 const revised=applyRevisions(matrix,ledger,registry,{writer:request.writer,session:request.session,branch},revs,{now});
 const result=autoAdvance(matrix,revised.ledger,registry,request,{verifiedDraftIds:verified,verifiedDraftEvidence:evidence,
   now,nonce:randomUUID(),refill:["ACTIVE","RECOVERING"].includes(signal)&&request.claim_new!==false});
 if(revised.applied.length){result.changed=true;console.log("REVISIONS_RECORDED "+revised.applied.join(","));}
 if(request.repair_take===true&&["ACTIVE","RECOVERING"].includes(signal)){
  // Transfer only when the current report and claims ledger match exactly.
  // The next Publisher scan issues fresh tickets for the new sole owner.
  const transfer=takeRepairTickets(matrix,result.ledger,registry,report,request,{now,max:10});
  if(transfer.changed){
   result.ledger=transfer.ledger;result.changed=true;
   console.log("CROSS_REPAIR_TRANSFERRED "+transfer.transferred.join(","));
  }else console.log("CROSS_REPAIR_NOOP "+transfer.reason);
 }
 if(slots!==slotsBefore)fs.writeFileSync(path.join(ROOT,slotsFile),JSON.stringify(slots,null,2)+"\n");
 if(!result.changed){
  console.log(JSON.stringify({mode:"AUTO_POOL_NO_MUTATION",status:result.status,
    session:request.session,claimed:result.claimed,missing:result.missing_ids||[],message:result.message}));
  return;
 }
 fs.writeFileSync(path.join(ROOT,ledgerFile),JSON.stringify(result.ledger,null,2)+"\n");
 console.log(JSON.stringify({mode:"AUTO_POOL_LEDGER_STAGED",status:result.status,
   session:request.session,writer:request.writer,branch,sha,
   submitted:result.submitted,claimed:result.claimed,new_claims:result.new_claims||[],revision:result.ledger.revision,
   article_publication:false,model_calls:0}));
}
try{main()}catch(e){console.error("AUTO_POOL_REFUSED "+e.message);process.exitCode=1;}
