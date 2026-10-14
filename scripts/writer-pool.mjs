#!/usr/bin/env node
/**
 * Dynamic shared Writer Pool CLI. Actions on main is the ONLY claims writer.
 * External AI agents invoke workflow_dispatch, then read confirmed claims.
 * NO LLM/API, no automatic article publication.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {randomUUID,createHash} from "node:crypto";
import {poolStatus,transitionPool,validatePool,WRITERS} from "./writer-pool-core.mjs";
import {verifyPacket,checkDuplicates} from "./writer-lanes.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ROOT_REPO="thuexemayhanoi/global";
const FILE="factory/external-writers/claims.json";
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const argsOf=argv=>{
 const out={};
 for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith("--"))throw Error("Unexpected argument "+argv[i]);
  const key=argv[i].slice(2),next=argv[i+1];
  if(Object.hasOwn(out,key))throw Error("Duplicate argument --"+key);
  out[key]=next&&!next.startsWith("--")?argv[++i]:true;
 }
 return out;
};
function shell(cmd,args){return execFileSync(cmd,args,{cwd:ROOT,encoding:"utf8",timeout:20000,maxBuffer:4*1024*1024}).trim();}
function assertMainCoordinator(){
 if(process.env.GITHUB_ACTIONS!=="true"||process.env.GITHUB_WORKFLOW!=="Global Dynamic Writer Pool")throw Error("Claims must be mutated by the serialized Global Dynamic Writer Pool workflow");
 if(shell("git",["branch","--show-current"])!=="main")throw Error("Claims must be committed on main, never a Writer PR");
 if(shell("git",["status","--porcelain"])!=="")throw Error("Coordinator requires clean checkout");
}
function verifySubmittedFiles(ids,opts,matrix,board,locales,ledger,registry){
 // A draft becomes SUBMITTED only if its branch contains real valid JSON and
 // an open PR on the same repository; a writer cannot forge human review.
 const branch=opts.branch;
 const prText=shell("gh",["pr","list","--repo",ROOT_REPO,"--head",branch,"--state","open","--json","number"]);
 const prs=JSON.parse(prText);
 if(!Array.isArray(prs)||!prs.length)throw Error("Submit needs an open Writer draft PR: "+branch);
 // Enforce an actual green Writer QA check for this open PR, not merely
 // a syntactically valid article packet or a self-reported success.
 const checks=JSON.parse(shell("gh",["pr","checks",branch,"--repo",ROOT_REPO,"--json","name,state,workflow"]));
 const scoped=checks.filter(c=>c.name==="check"&&String(c.workflow||"").includes("External Writer Draft QA"));
 if(!scoped.length||scoped.some(c=>c.state!=="SUCCESS"))
  throw Error("Submit blocked until the remote PR's External Writer Draft QA is green");
 if(checks.some(c=>c.state==="FAILURE"||c.state==="ERROR"||c.state==="CANCELLED"))
  throw Error("Submit blocked by failed PR CI checks");

 shell("git",["fetch","--no-tags","origin",branch+":refs/remotes/origin/"+branch]);
 const packets=[],evidence={};
 for(const id of ids){
  const file="factory/external-writers/inbox/"+opts.writer+"/"+id+".json";
  let raw;
  try{raw=shell("git",["show","refs/remotes/origin/"+branch+":"+file]);}
  catch{throw Error("Missing claimed article JSON on remote branch "+branch+" "+id);}
  let p;
  try{p=JSON.parse(raw);}catch{throw Error("Invalid article JSON "+file);}
  if(p.matrix_id!==id||p.writer_session!==opts.session)throw Error("Article identity/session mismatch "+file);
  const qa=verifyPacket(p,opts.writer,matrix,board,locales,ledger,registry);
  if(!qa.passed)throw Error("Claimed draft QA failed "+id+": "+qa.errors.join("; "));
  evidence[id]={source_sha256:createHash("sha256").update(raw).digest("hex"),
    source_commit:shell("git",["rev-parse","refs/remotes/origin/"+branch])};
  packets.push({writer:opts.writer,id,path:file,packet:p});
 }
 const duplicates=checkDuplicates(packets);
 if(duplicates.length)throw Error(duplicates.join("; "));
 return evidence;
}
function main(){
 const [action="status",...argv]=process.argv.slice(2);
 const opts=argsOf(argv);
 const matrix=read("data/seo/master-matrix.json"),ledger=read(FILE),registry=read("factory/external-writers/protected-drafts.json");
 const board=read("factory/external-writers/assignments.json"),locales=read("content/locales.json");
 const faults=validatePool(matrix,ledger,registry);
 if(faults.length)throw Error(faults.join("; "));
 if(action==="status"||action==="next"||action==="assigned"){
  const data=poolStatus(matrix,ledger,registry,{writer:opts.writer,session:opts.session,branch:opts.branch,locale:opts.locale});
  if(action==="assigned"&&data.status!=="WRITE_NEXT_PAIR")throw Error("NO CONFIRMED CLAIMS. Dispatch writer-pool.yml action=claim first and fetch fresh main; never write preview IDs.");
  console.log(JSON.stringify({...data,claim_revision:ledger.revision,mode:action==="next"?"READ_ONLY_PREVIEW":"CONFIRMED_LEDGER_READ"},null,2));return;
 }
 if(!["claim","submit","release"].includes(action))throw Error("Actions: status | next | assigned | claim | submit | release");
 if(!WRITERS.includes(opts.writer))throw Error("Unknown Writer");
 const request={writer:opts.writer,session:opts.session,branch:opts.branch,locale:opts.locale,
   count:opts.count?Number(opts.count):10,ids:opts.ids,reason:opts.reason,confirmed:opts.confirmed=== "true" };
 const nonce=randomUUID();
 let output=transitionPool(matrix,ledger,registry,action,request,{nonce});
 if(!opts.apply){
  console.log(JSON.stringify({mode:"DRY_RUN_ONLY",revision:output.revision,action,ids:output.ids,
    next:"Only GitHub Actions writer-pool.yml may commit claims on main. Do not write before confirmed claim."},null,2));return;
 }
 assertMainCoordinator();
 if(action==="submit"){
  const evidence=verifySubmittedFiles(output.ids,opts,matrix,board,locales,ledger,registry);
  output=transitionPool(matrix,ledger,registry,action,{...request,evidence},{nonce});
 }
 // Release is coordinator-only: workflow refuses to release if a branch still
 // contains the article, preventing accidental redistribution of WIP.
 if(action==="release"){
  const file="factory/external-writers/inbox/"+opts.writer+"/"+output.ids[0]+".json";
  try{shell("git",["fetch","--no-tags","origin",opts.branch+":refs/remotes/origin/"+opts.branch]);}
  catch{throw Error("Release blocked: cannot inspect original Writer branch");}
  let draftExists=false;
  try{execFileSync("git",["cat-file","-e","refs/remotes/origin/"+opts.branch+":"+file],{cwd:ROOT,stdio:"ignore",timeout:8000});draftExists=true;}
  catch(e){if(e.status!==1&&e.status!==128)throw e;}
  if(draftExists)throw Error("Release blocked: draft still exists "+file);
 }
 fs.writeFileSync(path.join(ROOT,FILE),JSON.stringify(output.ledger,null,2)+"\n","utf8");
 console.log(JSON.stringify({mode:"STAGED_CLAIMS_ON_MAIN",action,revision:output.revision,
   confirmed_ids:output.ids,writer:opts.writer,session:opts.session,branch:opts.branch,
   publication_allowed:false},null,2));
}
try{main()}catch(e){console.error("WRITER_POOL_REFUSED "+e.message);process.exitCode=1;}
