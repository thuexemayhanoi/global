#!/usr/bin/env node
/**
 * External AI session advisor: READ ONLY. Actual shared claims are reserved by
 * serialized GitHub Actions writer-pool.yml. There is no unattended AI in CI.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {poolStatus,validatePool,MAX_BATCH} from "./writer-pool-core.mjs";
import {validateBoard,inboxFiles,checkDuplicates,inboxChecks} from "./writer-lanes.mjs";
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
export function decideNext(matrix,board,ledger,inbox,{writer,session=null,branch=null,locale=null,count=MAX_BATCH,registry=null,locales=null}={}){
 if(!writer)throw Error("Supply --writer W1, W2 or W3");
 if(!Number.isInteger(Number(count))||Number(count)<1||Number(count)>MAX_BATCH)throw Error("External Writer turbo target must be 1.."+MAX_BATCH);
 const registrations=registry||read("factory/external-writers/protected-drafts.json");
 const languages=locales||read("content/locales.json");
 const matrixErrors=validateBoard(matrix,board),poolErrors=validatePool(matrix,ledger,registrations);
 if(matrixErrors.length||poolErrors.length||inbox.errors?.length)throw Error([...matrixErrors,...poolErrors,...(inbox.errors||[])].join("; "));
 const duplicates=checkDuplicates(inbox.files);
 if(duplicates.length)throw Error("Duplicate Writer draft: "+duplicates.join("; "));
 const mine=inbox.files.filter(f=>f.writer===writer);
 // Locked SUBMITTED drafts are the publisher's business now; only open work can block writing.
 const bad=inboxChecks(mine,matrix,board,languages,ledger,registrations).filter(x=>!x.passed);
 if(bad.length)return {status:"REPAIR_DRAFT",writer,session,branch,items:[],bad_drafts:bad.map(x=>({id:x.id,file:x.file,errors:x.errors})),auto_publish:false,
  next_action:"Fix these drafts BEFORE pushing: a draft that is not SUBMITTED yet is edited in place and re-checked with node scripts/writer-lanes.mjs verify-all (no revision file). Never edit a SUBMITTED draft; its corrections come only from a repair ticket (node scripts/writer-repair.mjs next)."};
 const data=poolStatus(matrix,ledger,registrations,{writer,session,branch,locale});
 if(data.status==="WRITE_NEXT_BATCH"){
  const toWrite=data.items.filter(x=>!mine.some(f=>f.id===x.id));
  return {...data,items:toWrite,batch_size:toWrite.length,
   status:toWrite.length?"WRITE_NEXT_BATCH":"SUBMIT_CLAIMS",
   next_action:toWrite.length?"Write only these claimed IDs (up to 10). QA, push, then green CI automatically submits the completed subset and refills the Writer slot.":"Claimed drafts exist: QA then push and wait for zero-click Autopilot; it records completed drafts and refills without manual dispatch."};
 }
 return {...data,batch_size:0,mode:"PREVIEW_NOT_RESERVED",
   next_action:data.status==="CLAIM_REQUIRED"?"This is a preview, not ownership. Start/push one Writer session request; the green Writer QA push auto-claims up to 10. Fetch main before writing.":data.next_action};
}
function main(){
 const [command="status",...argv]=process.argv.slice(2),o=argsOf(argv);
 if(!["status","next","assigned"].includes(command))throw Error("Use status, next, assigned");
 const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json"),
   ledger=read("factory/external-writers/claims.json"),inbox=inboxFiles();
 const writers=command==="status"&&!o.writer?["W1","W2","W3"]:[o.writer];
 const r=writers.map(writer=>decideNext(matrix,board,ledger,inbox,{writer,session:o.session||null,
  branch:o.branch||null,locale:o.locale||null,count:Number(o.count||MAX_BATCH)}));
 if(command==="assigned"&&r[0]?.status!=="WRITE_NEXT_BATCH"&&r[0]?.status!=="SUBMIT_CLAIMS")
  throw Error("NO CONFIRMED CLAIM; wait for green Writer QA + Autopilot, then fetch main and retry; never draft previews");
 console.log(JSON.stringify(command==="status"&&!o.writer?{mode:"DYNAMIC_SHARED_POOL",writers:r}:r[0],null,2));
 if(r.some(x=>x.status==="REPAIR_DRAFT"))process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("CONTINUOUS_WRITER_REFUSED "+e.message);process.exitCode=1;}
}
