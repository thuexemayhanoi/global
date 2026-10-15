/**
 * Throw-away GitHub stand-in for the research CLI tests: a bare "origin" repository seeded with the real
 * tooling and data, plus any number of independent clones ("machines"). Nothing here touches the real repo.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {root} from "./topic-research-fixtures.mjs";

export const NOW="2026-10-15T10:00:00.000Z";
const SEED=["scripts","data","approvals","factory","AGENTS.md","docs/TOPIC-FACTORY.md","CNAME",".github/workflows/topic-research-qa.yml",".github/workflows/topic-factory.yml"];
export const gitEnv=(extra={})=>({...process.env,GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_TERMINAL_PROMPT:"0",
 GIT_AUTHOR_NAME:"seed",GIT_AUTHOR_EMAIL:"seed@example.invalid",GIT_COMMITTER_NAME:"seed",GIT_COMMITTER_EMAIL:"seed@example.invalid",
 TOPIC_RESEARCH_NOW:NOW,TOPIC_RESEARCH_RETRY_MS:"1",...extra});
export function git(cwd,args,{allow=false,env={}}={}){
 const r=spawnSync("git",args,{cwd,encoding:"utf8",env:gitEnv(env),maxBuffer:64*1024*1024});
 if(r.status!==0&&!allow)throw Error("git "+args.join(" ")+" failed in "+cwd+": "+(r.stderr||r.stdout));
 return r.stdout.trim();
}
export function makeEnv(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"topic-research-"));
 const origin=path.join(dir,"origin.git"),seed=path.join(dir,"seed");
 git(dir,["init","--bare","-b","main",origin]);
 fs.mkdirSync(seed);
 git(seed,["init","-q","-b","main"]);
 for(const rel of SEED){
  const from=path.join(root,rel);
  if(!fs.existsSync(from))continue;
  fs.mkdirSync(path.dirname(path.join(seed,rel)),{recursive:true});
  fs.cpSync(from,path.join(seed,rel),{recursive:true,filter:s=>!s.includes(path.join("topic-research","drafts"))});
 }
 git(seed,["add","-A"]);
 git(seed,["commit","-q","-m","seed main"]);
 git(seed,["remote","add","origin",origin]);
 git(seed,["push","-q","origin","main"]);
 // Server side: pre-receive injects outages and races, post-receive audits every ref update that really landed.
 const hooks=path.join(origin,"hooks");
 fs.mkdirSync(hooks,{recursive:true});
 fs.writeFileSync(path.join(hooks,"pre-receive"),`#!/bin/sh
if [ -f ./interleave ]; then
  cmd=$(cat ./interleave); rm -f ./interleave
  unset GIT_DIR GIT_QUARANTINE_PATH GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_PUSH_OPTION_COUNT
  sh -c "$cmd" > ./interleave.out 2>&1
  if [ -f ./interleave-reject ]; then cat ./interleave-reject >&2; rm -f ./interleave-reject; exit 1; fi
fi
if [ -f ./fail-count ]; then n=$(cat ./fail-count); if [ "$n" -gt 0 ]; then echo $((n-1)) > ./fail-count; if [ -f ./fail-message ]; then cat ./fail-message >&2; else echo "error: RPC failed; HTTP 502 curl 22 The requested URL returned error: 502" >&2; fi; exit 1; fi; fi
exit 0
`,{mode:0o755});
 fs.writeFileSync(path.join(hooks,"post-receive"),`#!/bin/sh
while read old new ref; do echo "$old $new $ref" >> ./push-audit.log; done
exit 0
`,{mode:0o755});
 let n=0;
 const env={dir,origin,seed,
  clone(name=null,{shallow=false}={}){
   const where=path.join(dir,name||"machine"+(++n));
   git(dir,["clone","-q",...(shallow?["--depth","1","file://"+origin]:[origin]),where]);
   return where;
  },
  /** Run the CLI of a clone as a research agent would. */
  cli(where,args,{env:extra={},json=true}={}){
   const r=spawnSync(process.execPath,["scripts/topic-research.mjs",...args,...(json&&!args.includes("--json")?["--json"]:[])],{cwd:where,encoding:"utf8",env:gitEnv(extra),maxBuffer:64*1024*1024});
   let data=null;try{data=JSON.parse(r.stdout);}catch{/* human output */}
   return {status:r.status,stdout:r.stdout,stderr:r.stderr,data};
  },
  draft(where,name,value){
   const f=path.join(where,"draft-"+name+".json");
   fs.writeFileSync(f,JSON.stringify(value,null,2));
   return f;
  },
  /** The next n pushes fail with an HTTP 502 outage, or with the given wording (to test unrecognised messages). */
  failNextPushes(n,message=null){
   fs.writeFileSync(path.join(origin,"fail-count"),String(n));
   const f=path.join(origin,"fail-message");
   if(message===null)fs.rmSync(f,{force:true});else fs.writeFileSync(f,message+"\n");
  },
  /**
   * Run a shell command on the server side of the NEXT push, before its refs update: a real concurrent writer.
   * With {reject} the push then fails with that wording (whatever the git version would have said).
   */
  interleaveOnNextPush(command,{reject=null}={}){
   fs.writeFileSync(path.join(origin,"interleave"),command);
   if(reject!==null)fs.writeFileSync(path.join(origin,"interleave-reject"),reject+"\n");
  },
  interleaveOutput(){const f=path.join(origin,"interleave.out");return fs.existsSync(f)?fs.readFileSync(f,"utf8"):"";},
  /** Every ref update origin accepted: [{old,new,ref}]. */
  pushAudit(){
   const f=path.join(origin,"push-audit.log");
   return fs.existsSync(f)?fs.readFileSync(f,"utf8").split("\n").filter(Boolean).map(l=>{const [o,nw,ref]=l.split(" ");return {old:o,new:nw,ref};}):[];
  },
  remoteTip(branch){return git(origin,["rev-parse","--verify","--quiet","refs/heads/"+branch],{allow:true});},
  remoteFile(branch,file){const r=spawnSync("git",["cat-file","blob",branch+":"+file],{cwd:origin,encoding:"utf8",env:gitEnv()});return r.status===0?r.stdout:null;},
  remoteFiles(branch,dir){return git(origin,["ls-tree","-r","--name-only",branch,"--",dir],{allow:true}).split("\n").filter(Boolean);},
  remoteChangedPaths(branch){return git(origin,["diff","--name-only","main...refs/heads/"+branch]).split("\n").filter(Boolean);},
  isAncestor(a,b){return spawnSync("git",["merge-base","--is-ancestor",a,b],{cwd:origin,env:gitEnv()}).status===0;},
  /** Make origin unreachable (a network outage) and bring it back. */
  breakRemote(where){git(where,["remote","set-url","origin",path.join(dir,"does-not-exist.git")]);},
  fixRemote(where){git(where,["remote","set-url","origin",origin]);},
  cleanup(){fs.rmSync(dir,{recursive:true,force:true});}
 };
 return env;
}
