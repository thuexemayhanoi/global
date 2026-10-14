#!/usr/bin/env node
/**
 * Safe Writer topic refill intake. It NEVER imports to Matrix, allocates
 * claims, runs AI, changes live pages, or approves topic evidence.
 * Proposal JSON stays on own Writer branch for independent editor review.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {refillHealth,validateProposalBatch,REFILL_BATCH_MAX} from "./writer-refill-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const argsOf=argv=>{
 const options={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(!k.startsWith("--")||options[k.slice(2)])throw Error("Invalid or repeated option "+k);
  options[k.slice(2)]=argv[i+1]&&!argv[i+1].startsWith("--")?argv[++i]:true;
 }
 return options;
};
const DIR="factory/topic-refill/proposals";
function allBatches(writer){
 const base=path.join(ROOT,DIR,writer),batches=[];
 if(!fs.existsSync(base))return batches;
 for(const name of fs.readdirSync(base).sort()){
  if(!/^[a-z0-9][a-z0-9_-]{2,75}\.json$/.test(name))throw Error("Unsafe refill file name "+name);
  const rel=DIR+"/"+writer+"/"+name;
  batches.push({rel,batch:read(rel)});
 }
 return batches;
}
function main(){
 const [cmd="status",...argv]=process.argv.slice(2),o=argsOf(argv);
 const matrix=read("data/seo/master-matrix.json"),ledger=read("factory/external-writers/claims.json"),
   protectedData=read("factory/external-writers/protected-drafts.json");
 if(cmd==="status"){
  const health=refillHealth(matrix,ledger,protectedData);
  console.log(JSON.stringify({repo:"thuexemayhanoi/global",...health},null,2));return;
 }
 if(cmd!=="validate"||!["W1","W2","W3"].includes(o.writer)||typeof o.branch!=="string"||
    !new RegExp("^writer/"+o.writer.toLowerCase()+"-[A-Za-z0-9_-]+$").test(o.branch))
  throw Error("Use validate --writer W1|W2|W3 --branch writer/w1-... on own Writer branch");
 const results=[],all=[];
 for(const {rel,batch} of allBatches(o.writer)){
  const result=validateProposalBatch(matrix,batch,o.writer,{otherProposals:all});
  results.push({file:rel,...result});
  if(Array.isArray(batch?.topics))all.push(...batch.topics);
 }
 const passed=results.every(r=>r.passed);
 console.log(JSON.stringify({mode:"RESEARCHED_TOPIC_PROPOSAL_QA_ONLY",writer:o.writer,
  checked_files:results.length,total_topics:all.length,max_per_file:REFILL_BATCH_MAX,
  passed,results,review_required:true,production_writes:0},null,2));
 if(!passed)process.exitCode=1;
}
try{main()}catch(e){console.error("TOPIC_REFILL_REFUSED "+e.message);process.exitCode=1;}
