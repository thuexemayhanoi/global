#!/usr/bin/env node
/**
 * Manual coordinator-owned Writer claims and checkpoint ledger. No LLM/API.
 * Local atomic writes and explicit Git review, NOT a cross-clone distributed lock.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const STATE="factory/external-writers/claims.json";
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const getArgs=a=>{const x={};for(let i=0;i<a.length;i++)if(a[i].startsWith("--")){const k=a[i].slice(2);x[k]=a[i+1]&&!a[i+1].startsWith("--")?a[++i]:true;}return x;};
const WRITERS=["W1","W2","W3"],terminal=new Set(["SUBMITTED","RELEASED"]);
export function validateLedger(state,board){
 const errors=[],seen=new Set();
 if(state.version!==1||!Number.isInteger(state.revision)||!Array.isArray(state.claims))errors.push("Invalid ledger schema");
 for(const c of state.claims||[]){
  if(seen.has(c.id)&&c.status==="CLAIMED")errors.push("Duplicate active claim for "+c.id);
  if(c.status==="CLAIMED")seen.add(c.id);
  if(!WRITERS.includes(c.writer)||!["CLAIMED","SUBMITTED","RELEASED"].includes(c.status))errors.push("Bad writer/claim state "+c.id);
  if(board.entries.find(e=>e.id===c.id)?.writer!==c.writer)errors.push("Claim not owned by assigned writer "+c.id);
  if(!c.session||!c.claim_id||!c.at)errors.push("Incomplete claim "+c.id);
 }
 return errors;
}
export function transition(state,matrix,board,op,{writer,id,session,now=new Date().toISOString()}){
 const next=structuredClone(state),row=matrix.rows.find(x=>x.id===id),entry=board.entries.find(x=>x.id===id);
 if(!entry||entry.writer!==writer||!WRITERS.includes(writer))throw Error("Writer is not the permanent owner of ID "+id);
 if(!session||!/^[a-zA-Z0-9_-]{3,80}$/.test(session))throw Error("A stable, nonsecret --session label is required");
 const open=next.claims.filter(c=>c.id===id&&c.status==="CLAIMED");
 if(open.length>1)throw Error("Corrupt double-claimed ID "+id);
 if(op==="claim"){
  if(!row||!["IDEA","RESEARCHED"].includes(row.status))throw Error("Cannot claim already published/reviewed ID "+id);
  if(row.parent_id&&matrix.rows.find(p=>p.id===row.parent_id)?.status!=="PUBLISHED")throw Error("Claim refused: parent not published");
  if(open.length)throw Error("Already claimed by "+open[0].writer+"/"+open[0].session);
  if(next.claims.some(c=>c.id===id&&c.status==="SUBMITTED"))throw Error("Submitted draft is awaiting review: "+id);
  const claim={id,writer,session,claim_id:randomUUID(),status:"CLAIMED",at:now,updated_at:now,phase:"RESEARCH",note:"Manual external writer; no model task scheduled"};
  next.claims.push(claim);
 }else if(["submit","release","heartbeat"].includes(op)){
  const c=open[0];
  if(!c||c.writer!==writer||c.session!==session)throw Error("No matching active claim or session "+id);
  if(op==="submit"){c.status="SUBMITTED";c.phase="WAITING_EDITORIAL_REVIEW";}
  else if(op==="release"){c.status="RELEASED";c.phase="RELEASED_BY_COORDINATOR";}
  else c.phase="WRITING_OR_RESEARCH";
  c.updated_at=now;
 }else throw Error("Supported commands: claim, submit, heartbeat, release");
 next.revision++;
 const errors=validateLedger(next,board);
 if(errors.length)throw Error(errors.join("; "));
 return next;
}
function featureBranchOnly(){
 const r=spawnSync("git",["branch","--show-current"],{cwd:ROOT,encoding:"utf8"});
 if(r.status!==0||!r.stdout.trim()||["main","master"].includes(r.stdout.trim()))throw Error("Mutation allowed only on checked-out feature branch, never main/master");
 const dirty=spawnSync("git",["status","--porcelain"],{cwd:ROOT,encoding:"utf8"});
 if(dirty.status!==0||dirty.stdout.trim())throw Error("Mutation requires clean feature branch; commit or stash changes");
 return r.stdout.trim();
}
function atomicWrite(next){
 const target=path.join(ROOT,STATE),guard=target+".writerlock";
 fs.mkdirSync(path.dirname(target),{recursive:true});
 let handle;
 try{
  handle=fs.openSync(guard,"wx");
  // Re-read under local exclusion; Git branch/PR is the cross-clone conflict gate.
  const disk=read(STATE);
  if(disk.revision!==next.revision-1)throw Error("Ledger revision conflict; refresh main");
  const temp=target+"."+process.pid+".tmp";
  fs.writeFileSync(temp,JSON.stringify(next,null,2)+"\n");
  fs.renameSync(temp,target);
 }finally{
  if(handle!==undefined){fs.closeSync(handle);fs.unlinkSync(guard);}
 }
}
function main(){
 const op=process.argv[2]||"status",args=getArgs(process.argv.slice(3));
 const control=read("factory/external-writers/control.json");
 if(control.mode==="dynamic-pool"&&!["status","resume"].includes(op)){
  throw Error("LEGACY_CLAIMS_DISABLED: use serialized GitHub Actions writer-pool.yml; do NOT mutate static-owner claims.");
 }
 const state=read(STATE),board=read("factory/external-writers/assignments.json"),matrix=read("data/seo/master-matrix.json");
 const invalid=validateLedger(state,board);if(invalid.length)throw Error(invalid.join("; "));
 if(op==="status"||op==="resume"){
  const subset=state.claims.filter(c=>op==="status"||c.session===args.session&&c.writer===args.writer);
  console.log(JSON.stringify({version:state.version,revision:state.revision,repo:"thuexemayhanoi/global",claims:subset,pending:state.claims.filter(c=>c.status==="CLAIMED").length,notice:"No background Writer process exists; stale leases must be released explicitly by coordinator."},null,2));return;
 }
 if(op==="submit"&&!fs.existsSync(path.join(ROOT,"factory/external-writers/inbox",args.writer||"",String(args.id||"")+".json")))throw Error("Submit requires a real review JSON in writer inbox");
 const next=transition(state,matrix,board,op,{writer:args.writer,id:args.id,session:args.session});
 if(!args.apply){console.log(JSON.stringify({mode:"DRY_RUN",branchOnly:true,action:op,revision:next.revision,claim:next.claims.at(-1)},null,2));return;}
 const br=featureBranchOnly();
 atomicWrite(next);
 console.log(JSON.stringify({mode:"STAGED_FOR_REVIEW_NOT_PUBLISHED",branch:br,action:op,revision:next.revision,id:args.id,ready_for_PR:true},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("CLAIM_REFUSED "+e.message);process.exitCode=1;}
}
