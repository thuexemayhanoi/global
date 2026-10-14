#!/usr/bin/env node
/**
 * External AI session advisor: READ ONLY. Actual shared claims are reserved by
 * serialized GitHub Actions writer-pool.yml. There is no unattended AI in CI.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {poolStatus,validatePool} from "./writer-pool-core.mjs";
import {validateBoard,inboxFiles,checkDuplicates,verifyPacket} from "./writer-lanes.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
function argsOf(argv){
 const opts={};
 for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith("--"))throw Error("Unexpected "+argv[i]);
  const key=argv[i].slice(2);
  opts[key]=argv[i+1]&&!argv[i+1].startsWith("--")?argv[++i]:true;
 }
 return opts;
}
export function decideNext(matrix,board,ledger,inbox,{writer,session=null,branch=null,locale=null,count=2,registry=null,locales=null}={}){
 if(!writer)throw Error("Supply --writer W1, W2 or W3");
 if(Number(count)!==2)throw Error("External Writer pair size must be 2; last confirmed claim may have 1");
 const registrations=registry||read("factory/external-writers/protected-drafts.json");
 const languages=locales||read("content/locales.json");
 const matrixErrors=validateBoard(matrix,board),poolErrors=validatePool(matrix,ledger,registrations);
 if(matrixErrors.length||poolErrors.length||inbox.errors?.length)throw Error([...matrixErrors,...poolErrors,...(inbox.errors||[])].join("; "));
 const duplicates=checkDuplicates(inbox.files);
 if(duplicates.length)throw Error("Duplicate Writer draft: "+duplicates.join("; "));
 const mine=inbox.files.filter(f=>f.writer===writer);
 const bad=mine.map(f=>({id:f.id,file:f.path,qa:verifyPacket(f.packet,writer,matrix,board,languages,ledger,registrations)})).filter(x=>!x.qa.passed);
 if(bad.length)return {status:"REPAIR_DRAFT",writer,session,branch,items:[],bad_drafts:bad.map(x=>({id:x.id,file:x.file,errors:x.qa.errors})),auto_publish:false};
 const data=poolStatus(matrix,ledger,registrations,{writer,session,branch,locale});
 if(data.status==="WRITE_NEXT_PAIR"){
  const toWrite=data.items.filter(x=>!mine.some(f=>f.id===x.id));
  return {...data,items:toWrite,batch_size:toWrite.length,
   status:toWrite.length?"WRITE_NEXT_PAIR":"SUBMIT_CLAIMS",
   next_action:toWrite.length?"Write ONLY these confirmed claimed IDs. QA, push to own Writer branch, open/update PR, then submit the pair.":"All claimed drafts exist. Run QA, push, open/update PR, dispatch writer-pool.yml action=submit, and request the next pair."};
 }
 return {...data,batch_size:0,mode:"PREVIEW_NOT_RESERVED",
   next_action:data.status==="CLAIM_REQUIRED"?"Do not write preview IDs. Dispatch serialized GitHub Actions action=claim, wait success, fetch main and run next again.":data.next_action};
}
function main(){
 const [command="status",...argv]=process.argv.slice(2),o=argsOf(argv);
 if(!["status","next","assigned"].includes(command))throw Error("Use status, next, assigned");
 const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json"),
   ledger=read("factory/external-writers/claims.json"),inbox=inboxFiles();
 const writers=command==="status"&&!o.writer?["W1","W2","W3"]:[o.writer];
 const r=writers.map(writer=>decideNext(matrix,board,ledger,inbox,{writer,session:o.session||null,
  branch:o.branch||null,locale:o.locale||null,count:Number(o.count||2)}));
 if(command==="assigned"&&r[0]?.status!=="WRITE_NEXT_PAIR"&&r[0]?.status!=="SUBMIT_CLAIMS")
  throw Error("NO CONFIRMED CLAIM; action=claim via writer-pool.yml and refresh main first");
 console.log(JSON.stringify(command==="status"&&!o.writer?{mode:"DYNAMIC_SHARED_POOL",writers:r}:r[0],null,2));
 if(r.some(x=>x.status==="REPAIR_DRAFT"))process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("CONTINUOUS_WRITER_REFUSED "+e.message);process.exitCode=1;}
}
