#!/usr/bin/env node
// "start" creates ONE branch-local request. "validate" is used by Writer QA.
// No credentials, API, claims or publishing actions are performed here.
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {newRequest,validateRequest,requestPath} from "./writer-request-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function flag(argv,k){const i=argv.indexOf("--"+k);return i>=0?argv[i+1]:null;}
function git(...args){return execFileSync("git",args,{cwd:ROOT,encoding:"utf8",timeout:15000}).trim();}
function main(){
 const [cmd,...args]=process.argv.slice(2),writer=flag(args,"writer"),branch=flag(args,"branch");
 if(!["start","validate"].includes(cmd))throw Error("Use start or validate");
 if(!writer||!branch)throw Error("Require --writer W1|W2|W3 and --branch writer/w1-...");
 const own=path.join(ROOT,"factory/external-writers/requests",writer);
 if(cmd==="start"){
  const session=flag(args,"session");
  const req=newRequest(writer,session,branch),name=requestPath(writer,session),abs=path.join(ROOT,name);
  if(git("branch","--show-current")!==branch)throw Error("Switch to the exact Writer branch before creating the request");
  fs.mkdirSync(own,{recursive:true});
  if(fs.existsSync(abs)){
   const existing=JSON.parse(fs.readFileSync(abs,"utf8"));
   validateRequest(existing,name,branch);
   console.log("WRITER_AUTOPILOT_ALREADY_ENABLED "+name);return;
  }
  fs.writeFileSync(abs,JSON.stringify(req,null,2)+"\n");
  console.log("WRITER_AUTOPILOT_REQUEST_READY "+name);
  console.log("Commit/push this one new file to your Writer branch. Writer QA success will trigger the coordinator without any manual GitHub Run click.");
  return;
 }
 // Writer CI validates EVERY request file (including other-W lanes, if any).
 const base=path.join(ROOT,"factory/external-writers/requests");
 const found=[];
 for(const w of ["W1","W2","W3"]){
  const dir=path.join(base,w);
  if(!fs.existsSync(dir))continue;
  for(const file of fs.readdirSync(dir)){
   if(!/^[A-Za-z0-9_-]{3,80}\.json$/.test(file))throw Error("Invalid request filename "+w+"/"+file);
   const name="factory/external-writers/requests/"+w+"/"+file;
   const req=JSON.parse(fs.readFileSync(path.join(dir,file),"utf8"));
   validateRequest(req,name,branch);
   if(req.writer!==writer)throw Error("Writer branch contains request owned by another lane: "+name);
   found.push(name);
  }
 }
 if(found.length>1)throw Error("A Writer branch must have only one active session request");
 console.log("WRITER_REQUEST_QA_PASS requests="+found.length+" branch="+branch);
}
try{main()}catch(e){console.error("WRITER_REQUEST_REFUSED "+e.message);process.exitCode=1;}
