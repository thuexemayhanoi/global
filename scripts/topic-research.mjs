#!/usr/bin/env node
/**
 * Crash-safe topic research CLI — Auto Push & Recovery for AI research sessions.
 *
 *   hints        [--taken <locale>]                  where to research next (read-only)
 *   sessions                                          research sessions on GitHub and their checkpoints (read-only)
 *   resume       --agent A --session S [--apply]      recovery plan from GitHub content; --apply prepares the local branch
 *   check        --agent A --session S --draft F      four-phase QA of a draft batch (read-only)
 *   commit       --agent A --session S --draft F      QA -> batch + checkpoint in ONE commit -> push -> verify -> SAVED
 *   push-pending --agent A --session S                QA and push commits that never reached GitHub, then verify
 *   checkpoint   --agent A --session S [--note ...]   checkpoint-only commit (notes, blockers, abandon, Topic Factory IDs)
 *   verify       --agent A --session S                GitHub branch == local branch == checkpoint?
 *   verify-tree  [--branch b] [--base ref]            CI: checkpoint/batch consistency of the checked-out tree
 *
 * Commits are built with git plumbing on refs/heads/research/<agent>-<session>: the working tree, the index
 * and the checked-out branch are never touched, so a dirty clone or a lost environment cannot corrupt a
 * session. GitHub content is the truth. The only push is a plain non-force push of that one branch; the only
 * files written are the session's own checkpoint and numbered batches. Nothing here calls a model or an API
 * and nothing here writes the Matrix, topical map, claims or URLs (the Topic Factory on main does that).
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import {validatePolicy} from "./topic-factory-core.mjs";
import {BATCH_DIR,CHECKPOINT_DIR,RESEARCH_LOG,BATCH_SIZE,sessionIds,idsFromBranch,batchFile,parseBatchFile,managedBatchOwner,checkpointOwner,isAllowedPath,
 assertAllowedPaths,pushArgs,normalizeDraft,evaluateDraft,decideBatch,passingBatch,quarantineEntries,newCheckpoint,applyBatch,applyUpdate,rebuildCheckpoint,
 resolveTaIds,validateCheckpoint,verifyCheckpointContent,planResume,planningHints,localeCapacity,topicSummary,topicKey,inFlightItems,canonical,sha256,
 classifyPushFailure,TRANSIENT_RE} from "./topic-research-core.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const POLICY_PATH="data/seo/topic-factory/policy.json";
const ZERO="0".repeat(40);
const TA_DIR="data/seo/topical-authority";
const now=()=>process.env.TOPIC_RESEARCH_NOW||new Date().toISOString();
const short=s=>String(s||"").slice(0,12);
const fail=(code,message,extra={})=>Object.assign(new Error(code+": "+message),{code,...extra});
const sleep=ms=>{if(ms>0)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);};

/* ------------------------------------------------------------------ arguments */

const SPEC={
 hints:{bool:["json","offline","no-others"],val:["taken","remote","agent","session","branch"]},
 sessions:{bool:["json","offline"],val:["remote"]},
 resume:{bool:["json","offline","apply"],val:["agent","session","branch","remote"]},
 check:{bool:["json","offline","final","quarantine-failures"],val:["agent","session","branch","draft","remote"]},
 commit:{bool:["json","final","quarantine-failures","no-push"],val:["agent","session","branch","draft","remote"],multi:["note","trailer"]},
 "push-pending":{bool:["json"],val:["agent","session","branch","remote"],multi:["trailer"]},
 checkpoint:{bool:["json","sync-ids","no-push"],val:["agent","session","branch","remote"],multi:["note","blocker","abandon","trailer"]},
 verify:{bool:["json","offline"],val:["agent","session","branch","remote"]},
 "verify-tree":{bool:["json"],val:["branch","base"]}
};
export function parseArgs(cmd,argv){
 const spec=SPEC[cmd];
 if(!spec)throw fail("USAGE","unknown command "+(cmd||"(none)")+"; use one of "+Object.keys(SPEC).join(", "));
 const o={_:[]};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(!a.startsWith("--")){o._.push(a);continue;}
  const k=a.slice(2);
  if(spec.bool.includes(k)){o[k]=true;continue;}
  if(spec.val.includes(k)||(spec.multi||[]).includes(k)){
   const v=argv[++i];
   if(v===undefined||v.startsWith("--"))throw fail("USAGE","--"+k+" needs a value");
   if((spec.multi||[]).includes(k))(o[k]=o[k]||[]).push(v);else o[k]=v;
   continue;
  }
  throw fail("USAGE","unknown option --"+k+" for "+cmd+" (allowed: "+[...spec.bool,...spec.val,...(spec.multi||[])].map(x=>"--"+x).join(" ")+")");
 }
 return o;
}
function sessionFrom(o){
 if(o.branch){const ids=idsFromBranch(o.branch);if(!ids)throw fail("USAGE","--branch must be research/<agent>-<session>");return ids;}
 if(!o.agent||!o.session)throw fail("USAGE","--agent and --session are required (or --branch research/<agent>-<session>)");
 try{return sessionIds({agent:o.agent,session:o.session});}catch(e){throw fail("USAGE",e.message);}
}
const trailersOf=o=>{
 const t=o.trailer||[];
 for(const x of t)if(!/^[A-Za-z][A-Za-z0-9-]*: [^\r\n]+$/.test(x))throw fail("USAGE","--trailer must look like 'Key: value' on one line, got "+JSON.stringify(x));
 return t;
};

/* ------------------------------------------------------------------ git plumbing */

function run(args,{input,env,allow=false,cwd=ROOT}={}){
 const r=spawnSync("git",args,{cwd,encoding:"utf8",input,maxBuffer:512*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:"0",...env}});
 if(r.error)throw r.error;
 if(r.status!==0&&!allow)throw fail("GIT_FAILED","git "+args.join(" ")+" -> "+String(r.stderr||r.stdout).trim().slice(-700),{stderr:r.stderr});
 return r;
}
const out=(args,o)=>run(args,o).stdout;
const refSha=ref=>{const r=run(["rev-parse","--verify","--quiet",ref+"^{commit}"],{allow:true});return r.status===0?r.stdout.trim():null;};
const blobAt=(ref,p)=>{const r=run(["cat-file","blob",ref+":"+p],{allow:true});return r.status===0?r.stdout:null;};
const treeFiles=(ref,dir)=>out(["ls-tree","-r","--name-only",ref,"--",dir]).split("\n").filter(Boolean);
const isAncestor=(a,b)=>run(["merge-base","--is-ancestor",a,b],{allow:true}).status===0;
const commitShaOf=(tip,file)=>{const r=run(["log","-1","--format=%H","--diff-filter=A",tip,"--",file],{allow:true});return r.status===0&&/^[0-9a-f]{40}$/.test(r.stdout.trim())?r.stdout.trim():null;};
const isShallow=()=>out(["rev-parse","--is-shallow-repository"]).trim()==="true";
const gitDir=()=>path.resolve(ROOT,out(["rev-parse","--git-common-dir"]).trim());
const currentBranch=()=>run(["symbolic-ref","--short","-q","HEAD"],{allow:true}).stdout.trim();

function retrying(fn){
 const delays=process.env.TOPIC_RESEARCH_RETRY_MS!==undefined?[Number(process.env.TOPIC_RESEARCH_RETRY_MS),Number(process.env.TOPIC_RESEARCH_RETRY_MS)]:[1500,4000,9000];
 for(let i=0;;i++){
  try{return fn();}catch(e){
   if(i>=delays.length||!TRANSIENT_RE.test(String(e.message)))throw e;
   sleep(delays[i]);
  }
 }
}
function fetchMain(remote){
 const args=["fetch","--no-tags","--quiet",...(isShallow()?["--depth=1"]:[]),remote,"+refs/heads/main:refs/remotes/"+remote+"/main"];
 try{retrying(()=>run(args));}catch(e){throw fail("FETCH_FAILED","cannot fetch "+remote+"/main ("+String(e.message).slice(0,300)+"); check network access or use --offline for read-only commands");}
}
function fetchBranches(remote,branches,depth){
 for(let i=0;i<branches.length;i+=40){
  const chunk=branches.slice(i,i+40);
  const args=["fetch","--no-tags","--quiet",...(depth&&isShallow()?["--depth="+depth]:[]),remote,...chunk.map(b=>"+refs/heads/"+b+":refs/remotes/"+remote+"/"+b)];
  retrying(()=>run(args));
 }
}
function lsRemote(remote,pattern){
 const r=retrying(()=>run(["ls-remote","--heads",remote,pattern]));
 const m=new Map();
 for(const line of r.stdout.split("\n")){const x=/^([0-9a-f]{40})\t(refs\/heads\/.+)$/.exec(line);if(x)m.set(x[2],x[1]);}
 return m;
}
function relation(l,r){
 if(l===r)return "EQUAL";
 if(isAncestor(l,r))return "BEHIND";
 if(isAncestor(r,l))return "AHEAD";
 const mb=run(["merge-base",l,r],{allow:true});
 return mb.status===0&&mb.stdout.trim()?"DIVERGED":"UNRELATED";
}
function assertNotCheckedOut(ids){
 const heads=out(["worktree","list","--porcelain"]).split("\n").filter(l=>l.startsWith("branch "));
 if(heads.some(l=>l.slice(7)==="refs/heads/"+ids.branch)||currentBranch()===ids.branch)
  throw fail("BRANCH_CHECKED_OUT",ids.branch+" is checked out here. The tool commits with git plumbing and never touches your working tree: switch to another branch first (git switch main).");
}
const setRef=(ids,sha,old)=>{assertNotCheckedOut(ids);run(["update-ref","-m","topic-research","refs/heads/"+ids.branch,sha,old||ZERO]);};
const backupRef=(ids,sha)=>{
 const name="refs/backup/"+ids.branch+"/"+now().replace(/[^0-9A-Za-z]/g,"");
 run(["update-ref",name,sha]);
 return name;
};

/* ------------------------------------------------------------------ lock */

function withLock(fn){
 const file=path.join(gitDir(),"topic-research.lock");
 const take=()=>{
  try{fs.writeFileSync(file,JSON.stringify({pid:process.pid,at:Date.now()}),{flag:"wx"});return true;}catch(e){if(e.code!=="EEXIST")throw e;return false;}
 };
 if(!take()){
  let held={};try{held=JSON.parse(fs.readFileSync(file,"utf8"));}catch{/* unreadable lock is stale */}
  let alive=false;
  if(held.pid){try{process.kill(held.pid,0);alive=true;}catch(e){alive=e.code==="EPERM";}}
  if(alive&&Date.now()-(held.at||0)<30*60*1000)throw fail("LOCKED","another topic-research command (pid "+held.pid+") is running in this clone; wait for it to finish");
  fs.rmSync(file,{force:true});
  if(!take())throw fail("LOCKED","could not take the session lock "+file);
 }
 try{return fn();}finally{fs.rmSync(file,{force:true});}
}

/* ------------------------------------------------------------------ facts from GitHub */

function readMain(M,ids){
 const json=(p,fb)=>{const raw=blobAt(M,p);if(raw===null){if(fb!==undefined)return fb;throw fail("NO_FILE",p+" is missing on main");}return JSON.parse(raw);};
 const policy=json(POLICY_PATH);
 const standing=json(policy.standing_policy);
 const errs=validatePolicy(policy,standing);
 if(errs.length)throw fail("FACTORY_POLICY_INVALID",errs.join("; "));
 const matrix=json("data/seo/master-matrix.json");
 const map={architecture:json(TA_DIR+"/architecture.json"),references:json(TA_DIR+"/references.json",{references:[]}),locales:{}};
 for(const f of treeFiles(M,TA_DIR)){
  const m=/\/([a-z]{2})\.json$/.exec(f);
  if(m)map.locales[m[1]]=JSON.parse(blobAt(M,f));
 }
 const frozen=(json("data/seo/url-freeze.json",{urls:[]}).urls||[]).map(u=>u.url);
 const log=json(RESEARCH_LOG,{version:1,batches:[]});
 const contract={agents_md_sha256:sha256(blobAt(M,"AGENTS.md")||""),topic_factory_md_sha256:sha256(blobAt(M,"docs/TOPIC-FACTORY.md")||"")};
 const sessionTopics=[];
 for(const [code,L] of Object.entries(map.locales))for(const p of L.proposals||[])
  if(ids&&p.research?.agent===ids.agent&&p.research?.session===ids.batchSession)
   sessionTopics.push({ta_id:p.candidate_id,locale:p.locale||code,slug:p.slug,key:topicKey({locale:p.locale||code,primary_query:p.primary_query}),status:p.status});
 return {policy,matrix,map,frozen,log,contract,sessionTopics};
}
function readOwnAt(ids,sha){
 const files=treeFiles(sha,BATCH_DIR).filter(f=>parseBatchFile(f,ids)!==null).sort();
 const batches=files.map(f=>({file:f,raw:blobAt(sha,f)})).filter(x=>x.raw!==null);
 const cp=blobAt(sha,ids.checkpointPath);
 return {batches,checkpoint:cp===null?null:{raw:cp}};
}
function bindingOf(ids,sha,cpRaw){
 let cp;try{cp=JSON.parse(cpRaw);}catch{return "UNKNOWN";}
 const last=cp?.last_commit_sha;
 if(!last)return "UNKNOWN";
 const r=run(["log","-1","--format=%H%n%P",sha,"--",ids.checkpointPath],{allow:true});
 if(r.status!==0)return "UNKNOWN";
 const [c,parents]=r.stdout.trim().split("\n");
 const ps=(parents||"").split(" ").filter(Boolean);
 if(!c||!ps.length)return "UNKNOWN";
 return ps.includes(last)?"OK":"MISMATCH";
}
function readOthers(ids,remote,o,ignore=[]){
 const net=o.offline!==true;
 let heads;
 if(net)heads=lsRemote(remote,"refs/heads/research/*");
 else{
  heads=new Map();
  for(const line of out(["for-each-ref","--format=%(objectname) %(refname)","refs/remotes/"+remote+"/research/"]).split("\n").filter(Boolean)){
   const [sha,ref]=line.split(" ");heads.set("refs/heads/"+ref.slice(("refs/remotes/"+remote+"/").length),sha);
  }
 }
 const want=[],names=[];
 for(const [ref,sha] of heads){
  const b=ref.slice("refs/heads/".length);
  if(b===ids?.branch||ignore.includes(b))continue;
  names.push(b);
  if(net&&refSha("refs/remotes/"+remote+"/"+b)!==sha)want.push(b);
 }
 if(want.length)fetchBranches(remote,want,1);
 return names.map(b=>{
  const ref="refs/remotes/"+remote+"/"+b;
  if(!refSha(ref))return {branch:b,batches:[]};
  const files=treeFiles(ref,BATCH_DIR).filter(f=>f.endsWith(".json")).sort();
  return {branch:b,batches:files.map(f=>({file:f,raw:blobAt(ref,f)})).filter(x=>x.raw!==null)};
 });
}

/** Everything a command needs, read from GitHub (and the local clone's refs): never from the working tree. */
function gather(ids,o,{others=false}={}){
 const remote=o.remote||process.env.TOPIC_RESEARCH_REMOTE||"origin";
 const net=o.offline!==true;
 const t=now(),today=t.slice(0,10);
 if(net)fetchMain(remote);
 const M=refSha("refs/remotes/"+remote+"/main");
 if(!M)throw fail("NO_MAIN","refs/remotes/"+remote+"/main is missing; run `git fetch "+remote+" main` with network access");
 const main=readMain(M,ids);
 const tracking="refs/remotes/"+remote+"/"+ids.branch;
 let remoteSha=null;
 if(net){
  const rs=lsRemote(remote,"refs/heads/"+ids.branch).get("refs/heads/"+ids.branch)||null;
  if(rs){fetchBranches(remote,[ids.branch],1000);remoteSha=refSha(tracking);if(remoteSha!==rs&&!isAncestor(rs,remoteSha||rs))throw fail("FETCH_MISMATCH","GitHub reports "+rs+" for "+ids.branch+" but fetch produced "+remoteSha);}
  else if(refSha(tracking))run(["update-ref","-d",tracking]);
 }else remoteSha=refSha(tracking);
 let remoteState={exists:false};
 if(remoteSha){
  const at=readOwnAt(ids,remoteSha);
  remoteState={exists:true,sha:remoteSha,...at,binding:at.checkpoint?bindingOf(ids,remoteSha,at.checkpoint.raw):"UNKNOWN"};
 }
 const lsha=refSha("refs/heads/"+ids.branch);
 const localState=lsha?{exists:true,sha:lsha,relation:remoteSha?relation(lsha,remoteSha):"NO_REMOTE",onBranch:currentBranch()===ids.branch,
  batches:readOwnAt(ids,lsha).batches}:{exists:false,relation:"NONE",batches:[]};
 const othersBranches=others?readOthers(ids,remote,o,[]):[];
 const facts={ids,now:t,contract:{current:main.contract},main:{sha:M,log:main.log,sessionTopics:main.sessionTopics},
  ctx:{policy:main.policy,matrix:main.matrix},remote:remoteState,local:localState,others:othersBranches};
 const plan=planResume(facts);
 const remoteDigests=new Set((remoteState.batches||[]).map(b=>sha256(b.raw)));
 const localOnlyFiles=(localState.batches||[]).filter(b=>!remoteDigests.has(sha256(b.raw))).sort((a,b)=>parseBatchFile(a.file,ids)-parseBatchFile(b.file,ids));
 const ownByName=new Map((remoteState.batches||[]).map(b=>[b.file,b]));
 for(const b of localOnlyFiles)if(!ownByName.has(b.file))ownByName.set(b.file,b);
 return {ids,remote,now:t,today,M,main,facts,plan,remoteState,localState,remoteFiles:remoteState.batches||[],localOnlyFiles,
  ownFiles:[...ownByName.values()].sort((a,b)=>a.file<b.file?-1:1),tip:lsha?{sha:lsha}:null,othersBranches,net};
}

/* ------------------------------------------------------------------ QA, checkpoint building, commits */

function keysOf(files,ids){
 const m=new Map();
 for(const f of files){
  let b;try{b=JSON.parse(f.raw);}catch{continue;}
  const seq=String(parseBatchFile(f.file,ids)??"?").padStart(4,"0");
  for(const c of b.candidates||[])if(c&&typeof c==="object"&&c.locale&&c.primary_query)m.set(topicKey(c),"batch "+seq+" of this session");
 }
 return m;
}
function qa(ids,st,batch,newFile){
 const ownKeys=keysOf(st.ownFiles,ids);
 for(const t of st.main.sessionTopics)if(!ownKeys.has(t.key))ownKeys.set(t.key,"ingested by main as "+t.ta_id);
 const others=inFlightItems(st.othersBranches,{log:st.main.log,exclude:ids.branch});
 return evaluateDraft({batch,matrix:st.main.matrix,map:st.main.map,policy:st.main.policy,frozen:st.main.frozen,priorFiles:st.ownFiles,log:st.main.log,
  ownKeys,others,today:st.today,newFile});
}
const phaseSummary=results=>Object.fromEntries(["duplicate","intent","source","schema"].map(p=>{
 const v=results.filter(r=>r.verdict!=="SKIP_ALREADY_ACCEPTED").map(r=>r.phases[p]);
 return [p,v.includes("FAIL")?"FAIL":v.length&&v.every(x=>x==="PASS")?"PASS":v.length?"NOT_EVALUATED":"SKIPPED"];
}));
function qaReport(ids,st,ev,decision,extra={}){
 return {session:{agent:ids.agent,session:ids.session,branch:ids.branch},phase_summary:phaseSummary(ev.results),
  context:{main_sha:st.M,source:"ORIGIN_MAIN",research_log_batches:(st.main.log.batches||[]).length,in_flight_branches:st.othersBranches.length},
  decision,counts:ev.counts,
  results:ev.results.map(r=>({ref:r.ref,verdict:r.verdict,phases:r.phases,accepted_as:r.accepted_as,
   issues:r.issues.map(i=>({gate:i.gate,phase:i.phase,severity:i.severity,reason:i.reason}))})),
  batch_issues:ev.batchIssues,prior_failures:ev.priorFailures,next:st.plan.next,warnings:st.plan.warnings,...extra};
}
function currentCheckpoint(ids,st,at){
 const tipSha=st.tip?.sha;
 const raw=tipSha?blobAt(tipSha,ids.checkpointPath):null;
 let cp=null;
 if(raw!==null){try{cp=JSON.parse(raw);}catch{cp=null;}}
 if(raw===null&&!st.ownFiles.length)return {cp:newCheckpoint(ids,{now:at,mainSha:st.M,parentSha:tipSha||st.M,contract:st.main.contract}),rebuilt:false};
 const trusted=cp&&validateCheckpoint(cp,{ids}).length===0&&verifyCheckpointContent(cp,st.ownFiles,ids).length===0;
 if(trusted)return {cp,rebuilt:false};
 const pushed=new Set(st.remoteFiles.map(b=>sha256(b.raw)));
 return {cp:rebuildCheckpoint(ids,{files:st.ownFiles,previous:cp,now:at,mainSha:st.M,parentSha:tipSha||st.M,contract:st.main.contract,
  ctx:{policy:st.main.policy,matrix:st.main.matrix},pushedDigests:pushed,
  commitShaByFile:tipSha?Object.fromEntries(st.remoteFiles.map(b=>[b.file,commitShaOf(tipSha,b.file)])):{}}),rebuilt:true};
}
/** Commit SHAs of the batches a new checkpoint will settle (COMMITTED -> PUSHED). */
const settledCommits=(cp,tipSha)=>Object.fromEntries((cp.batches||[]).filter(b=>b.state==="COMMITTED"&&tipSha).map(b=>[b.file,commitShaOf(tipSha,b.file)]));
const proposalMap=st=>new Map(st.main.sessionTopics.map(t=>[t.locale+":"+t.slug,{candidate_id:t.ta_id}]));
function identityEnv(ids,at){
 const cfg=k=>run(["config","--get",k],{allow:true}).stdout.trim();
 const name=cfg("user.name")||"research-"+ids.agent,email=cfg("user.email")||ids.agent+"-research@users.noreply.github.com";
 const date="@"+Math.floor(Date.parse(at)/1000)+" +0000";
 return {GIT_AUTHOR_NAME:name,GIT_AUTHOR_EMAIL:email,GIT_COMMITTER_NAME:name,GIT_COMMITTER_EMAIL:email,GIT_AUTHOR_DATE:date,GIT_COMMITTER_DATE:date};
}
/** commit-tree on top of `parent`, writing only the given files into a temporary index. */
function plumbingCommit(ids,parent,files,message,at){
 assertAllowedPaths(files.map(f=>f.path),ids);
 const idx=path.join(gitDir(),"topic-research.index."+process.pid);
 const env={GIT_INDEX_FILE:idx};
 try{
  run(["read-tree",parent],{env});
  for(const f of files){
   const blob=out(["hash-object","-w","--stdin"],{input:f.raw}).trim();
   run(["update-index","--add","--cacheinfo","100644,"+blob+","+f.path],{env});
  }
  const tree=out(["write-tree"],{env}).trim();
  return out(["-c","commit.gpgsign=false","commit-tree",tree,"-p",parent,"-F","-"],{input:message,env:identityEnv(ids,at)}).trim();
 }finally{fs.rmSync(idx,{force:true});}
}
const withTrailers=(msg,trailers)=>msg.trimEnd()+(trailers.length?"\n\n"+trailers.join("\n"):"")+"\n";

/** A push that failed without recognisable wording is a lost race when GitHub's branch is not an ancestor of ours. */
function remoteMoved(ids,remote){
 try{
  const theirs=lsRemote(remote,"refs/heads/"+ids.branch).get("refs/heads/"+ids.branch);
  const ours=refSha("refs/heads/"+ids.branch);
  return !!theirs&&theirs!==ours&&!isAncestor(theirs,ours);
 }catch{return false;}
}
function pushOnce(ids,remote){
 const r=run(pushArgs(remote,ids.branch),{allow:true});
 if(r.status===0)return {ok:true};
 const text=String(r.stderr+"\n"+r.stdout);
 let kind=classifyPushFailure(text);
 if(kind==="UNKNOWN"&&remoteMoved(ids,remote))kind="REJECTED";
 return {ok:false,kind,message:text.trim().slice(-800)};
}
function pushBranch(ids,remote){
 const delays=process.env.TOPIC_RESEARCH_RETRY_MS!==undefined?[Number(process.env.TOPIC_RESEARCH_RETRY_MS),Number(process.env.TOPIC_RESEARCH_RETRY_MS)]:[1500,4000,9000];
 let last;
 for(let i=0;i<=delays.length;i++){
  last=pushOnce(ids,remote);
  if(last.ok||last.kind!=="TRANSIENT")return last;
  sleep(delays[i]);
 }
 return last;
}
/** SAVED means: GitHub itself reports our commit (or a descendant) and the bytes there are the bytes we meant to write. */
function verifyRemote(ids,remote,commit,expect){
 const heads=retrying(()=>lsRemote(remote,"refs/heads/"+ids.branch));
 const rsha=heads.get("refs/heads/"+ids.branch);
 if(!rsha)return {ok:false,reason:"GitHub does not list "+ids.branch+" after the push"};
 retrying(()=>fetchBranches(remote,[ids.branch],1000));
 const tracking=refSha("refs/remotes/"+remote+"/"+ids.branch);
 if(tracking!==rsha&&!isAncestor(rsha,tracking||rsha))return {ok:false,reason:"fetched tip "+short(tracking)+" differs from GitHub tip "+short(rsha)};
 if(rsha!==commit&&!isAncestor(commit,tracking))return {ok:false,reason:"GitHub tip "+short(rsha)+" does not contain our commit "+short(commit)};
 for(const f of expect){
  const got=blobAt(commit,f.path);
  if(got===null||sha256(got)!==sha256(f.raw))return {ok:false,reason:f.path+" at "+short(commit)+" is not the intended content"};
 }
 const cpFile=expect.find(f=>f.path===ids.checkpointPath);
 if(cpFile){
  const at=readOwnAt(ids,commit),cp=JSON.parse(cpFile.raw);
  const bad=[...validateCheckpoint(cp,{ids}),...verifyCheckpointContent(cp,at.batches,ids)];
  if(bad.length)return {ok:false,reason:"checkpoint on GitHub does not verify: "+bad.map(i=>i.code).join(", ")};
 }
 return {ok:true,github_sha:rsha};
}

/**
 * The one write path: QA is already done. Writes the batch and the checkpoint in ONE commit on top of the
 * current tip (or main), moves the local ref, pushes without force and verifies on GitHub.
 */
function writeAndPush(ids,st,{files,message,summary},o,{noPush=false}={}){
 const parent=st.tip?st.tip.sha:st.M;
 const sha=plumbingCommit(ids,parent,files,message,st.now);
 setRef(ids,sha,st.tip?.sha||null);
 if(noPush)return {ok:true,status:"COMMITTED_LOCAL",sha,parent,summary,message:"Committed locally only (--no-push); nothing is on GitHub yet"};
 const p=pushBranch(ids,st.remote);
 if(!p.ok)return {ok:false,status:p.kind==="REJECTED"?"PUSH_REJECTED":"NOT_SAVED",sha,parent,summary,kind:p.kind,
  message:"Push failed ("+p.kind+"): "+p.message+" — the commit is kept locally; run push-pending after fixing the cause"};
 const v=verifyRemote(ids,st.remote,sha,files);
 if(!v.ok)return {ok:false,status:"NOT_VERIFIED",sha,parent,summary,message:"Pushed, but verification on GitHub failed: "+v.reason};
 return {ok:true,status:"SAVED",sha,parent,github_sha:v.github_sha,summary};
}
function batchCommitMessage(ids,seq,batch,digest,ev,mainSha,extra=[]){
 const per={};for(const c of batch.candidates)per[c.locale]=(per[c.locale]||0)+1;
 return "research("+ids.stem+"): batch "+String(seq).padStart(4,"0")+" - "+batch.candidates.length+" topics, QA PASS\n\n"+
  "Branch: "+ids.branch+"\nBatch: "+batchFile(ids,seq)+"\nBatch SHA-256: "+digest+"\nTopics: "+Object.entries(per).map(([k,v])=>k+" "+v).join(", ")+"\n"+
  "QA: duplicate PASS, intent PASS, source PASS, schema PASS (main@"+short(mainSha)+")\nCheckpoint: "+ids.checkpointPath+(extra.length?"\n"+extra.join("\n"):"");
}

/**
 * QA a draft and, when it passes, commit + push it. Used by `commit` and by the replay of local-only batches.
 * Returns {ok,status,...}; status: SAVED | COMMITTED_LOCAL | NOOP | REFUSED | QUARANTINED | PUSH_REJECTED | NOT_SAVED | NOT_VERIFIED.
 */
function commitDraft(ids,st,batch,flags,o){
 const seq=st.plan.next.seq,newFile=batchFile(ids,seq);
 const ev=qa(ids,st,batch,newFile);
 const decision=decideBatch(ev,{final:flags.final,quarantine:flags.quarantine,replay:flags.replay});
 const report=qaReport(ids,st,ev,decision);
 if(decision.action==="REFUSE")return {ok:false,status:"REFUSED",decision,report};
 if(decision.action==="NOOP")return {ok:true,status:"NOOP",decision,report};
 const {cp:base,rebuilt}=currentCheckpoint(ids,st,st.now);
 const failed=quarantineEntries(batch,ev.results,st.now);
 const parentSha=st.tip?.sha||st.M;
 const common={ids,now:st.now,mainSha:st.M,parentSha,contract:st.main.contract,commitShaByFile:settledCommits(base,st.tip?.sha)};
 let cp,files,message,summary;
 if(decision.action==="QUARANTINE_ONLY"){
  cp=applyUpdate(base,{...common,quarantine:failed,notes:flags.note?[flags.note]:[]});
  cp=resolveTaIds(cp,proposalMap(st)).checkpoint;
  files=[{path:ids.checkpointPath,raw:canonical(cp)}];
  message=withTrailers("research("+ids.stem+"): record "+failed.length+" QA FAIL candidate(s) in the checkpoint\n\nNo batch was written; failing topics stay out of the intake until they pass QA.\n"+
   "Branch: "+ids.branch+"\nCheckpoint: "+ids.checkpointPath,flags.trailers);
  summary={kind:"CHECKPOINT_ONLY",qa_fail_recorded:failed.length};
 }else{
  const pass=passingBatch(batch,ev.results),raw=canonical(pass);
  const summaries=pass.candidates.map(c=>topicSummary(c,{policy:st.main.policy,matrix:st.main.matrix}));
  cp=applyBatch(base,{...common,seq,raw,batch:pass,summaries,failed,note:flags.note||null});
  cp=resolveTaIds(cp,proposalMap(st)).checkpoint;
  files=[{path:newFile,raw},{path:ids.checkpointPath,raw:canonical(cp)}];
  message=withTrailers(batchCommitMessage(ids,seq,pass,sha256(raw),ev,st.M,failed.length?["QA FAIL kept in checkpoint: "+failed.length]:[]),flags.trailers);
  summary={kind:"BATCH",seq,file:newFile,topics:pass.candidates.length,sha256:sha256(raw),qa_fail_recorded:failed.length,decision:decision.code,
   skipped_already_accepted:ev.counts.skipped,checkpoint_rebuilt:rebuilt};
 }
 const bad=[...validateCheckpoint(cp,{ids}),...verifyCheckpointContent(cp,[...st.ownFiles,...files.filter(f=>f.path!==ids.checkpointPath).map(f=>({file:f.path,raw:f.raw}))],ids)];
 if(bad.length)throw fail("CHECKPOINT_INVALID","refusing to commit an inconsistent checkpoint: "+bad.map(i=>i.code+" "+i.message).join("; "));
 const w=writeAndPush(ids,st,{files,message,summary},o,{noPush:flags.noPush});
 return {...w,decision,report,checkpoint:{totals:cp.totals,last_batch:cp.last_batch,next_batch:cp.next_batch}};
}

/* ------------------------------------------------------------------ sync (recovery actions) */

function pushPending(ids,st,o,log){
 let prior=[...st.remoteFiles],clean=true;
 for(const b of st.localOnlyFiles){
  let batch;try{batch=JSON.parse(b.raw);}catch{clean=false;break;}
  if(batch.agent?.name!==ids.agent||batch.agent?.session!==ids.batchSession){clean=false;break;}
  const ev=qa(ids,{...st,ownFiles:prior},batch,b.file);
  if(ev.counts.fail||ev.counts.skipped||ev.priorFailures.length||ev.batchIssues.length){clean=false;break;}
  prior=[...prior,b];
 }
 const cpRaw=blobAt(st.localState.sha,ids.checkpointPath);
 let cp=null;try{cp=cpRaw&&JSON.parse(cpRaw);}catch{/* rebuilt below */}
 if(clean&&!(cp&&validateCheckpoint(cp,{ids}).length===0&&verifyCheckpointContent(cp,prior,ids).length===0))clean=false;
 if(!clean){
  log.push("PUSH_PENDING_RECHECK_FAILED: the unpushed batch no longer passes QA or its checkpoint is inconsistent -> replay by content");
  return replayUnpushed(ids,st,o,log);
 }
 const p=pushBranch(ids,st.remote);
 if(!p.ok){
  if(p.kind==="REJECTED")return replayUnpushed(ids,st,o,log);
  return {ok:false,status:"NOT_SAVED",kind:p.kind,message:"Push failed ("+p.kind+"): "+p.message};
 }
 const files=[{path:ids.checkpointPath,raw:cpRaw},...st.localOnlyFiles.map(b=>({path:b.file,raw:b.raw}))];
 const v=verifyRemote(ids,st.remote,st.localState.sha,files);
 if(!v.ok)return {ok:false,status:"NOT_VERIFIED",message:"Pushed, but verification on GitHub failed: "+v.reason};
 log.push("PUSHED_PENDING "+st.localOnlyFiles.length+" batch(es) -> "+short(st.localState.sha)+" verified on GitHub");
 return {ok:true,status:"SAVED",sha:st.localState.sha};
}
function carryOver(ids,st,localCpRaw,o,log){
 let old;try{old=JSON.parse(localCpRaw);}catch{return null;}
 if(!old||!Array.isArray(old.unresolved))return null;
 const {cp:base}=currentCheckpoint(ids,st,st.now);
 const have=new Set(base.unresolved.map(u=>u.id));
 const accepted=new Set(base.batches.flatMap(b=>b.topics.map(t=>t.key)));
 const quarantine=old.unresolved.filter(u=>u.kind==="QA_FAIL"&&!have.has(u.id)&&!accepted.has(u.key)).map(u=>({key:u.key,locale:u.locale,slug:u.slug,gates:u.gates,candidate:u.candidate}));
 const notes=old.unresolved.filter(u=>u.kind==="NOTE"&&!have.has(u.id)).map(u=>u.message);
 const blockers=old.unresolved.filter(u=>u.kind==="BLOCKER"&&!have.has(u.id)).map(u=>u.message);
 if(!quarantine.length&&!notes.length&&!blockers.length)return null;
 const cp=applyUpdate(base,{ids,now:st.now,mainSha:st.M,parentSha:st.tip?.sha||st.M,contract:st.main.contract,commitShaByFile:settledCommits(base,st.tip?.sha),quarantine,notes,blockers});
 const files=[{path:ids.checkpointPath,raw:canonical(cp)}];
 const message=withTrailers("research("+ids.stem+"): carry over "+(quarantine.length+notes.length+blockers.length)+" unresolved checkpoint entr"+((quarantine.length+notes.length+blockers.length)===1?"y":"ies")+" after replay\n\nBranch: "+ids.branch,[]);
 const w=writeAndPush(ids,st,{files,message,summary:{kind:"CHECKPOINT_ONLY",carried_over:quarantine.length+notes.length+blockers.length}},o);
 log.push("CARRY_OVER unresolved entries: "+w.status);
 return w;
}
/** Diverged branch / push conflict: keep GitHub's history, re-apply only the missing batches by content. */
function replayUnpushed(ids,st,o,log){
 const localOnly=st.localOnlyFiles;
 const localCp=blobAt(st.localState.sha,ids.checkpointPath);
 const backup=backupRef(ids,st.localState.sha);
 log.push("REPLAY_UNPUSHED: local branch saved as "+backup+"; local ref reset to GitHub "+short(st.remoteState.sha)+" (nothing pushed is touched)");
 setRef(ids,st.remoteState.sha,st.localState.sha);
 let cur=gather(ids,o,{others:true});
 for(const b of localOnly){
  let batch;try{batch=JSON.parse(b.raw);}catch{log.push("REPLAY_SKIP "+b.file+": malformed JSON (kept in "+backup+")");continue;}
  if(batch.agent?.name!==ids.agent||batch.agent?.session!==ids.batchSession){log.push("REPLAY_SKIP "+b.file+": names another agent/session (kept in "+backup+")");continue;}
  const r=commitDraft(ids,cur,batch,{final:true,quarantine:true,replay:true,note:"replayed "+b.file+" (sha256 "+sha256(b.raw).slice(0,12)+") after the branch diverged",trailers:[]},o);
  log.push("REPLAY "+b.file+": "+r.status+(r.summary?.seq?" -> batch "+String(r.summary.seq).padStart(4,"0")+" ("+r.summary.topics+" topics)":"")+
   (r.report?.counts?" ["+r.report.counts.pass+" pass, "+r.report.counts.fail+" fail, "+r.report.counts.skipped+" already accepted]":""));
  if(!r.ok&&r.status!=="NOOP")return {...r,backup};
  cur=gather(ids,o,{others:true});
 }
 if(localCp){const c=carryOver(ids,cur,localCp,o,log);if(c&&!c.ok)return {...c,backup};}
 return {ok:true,status:"SAVED",backup};
}
function syncOwn(ids,st0,o,log){
 let st=st0;
 for(let i=0;i<6;i++){
  const a=st.plan.branch.action;
  if(a==="NONE"||a==="CREATE_FROM_MAIN")return {ok:true,st};
  if(a==="CREATE_FROM_REMOTE"){setRef(ids,st.remoteState.sha,null);log.push("CREATE_FROM_REMOTE: local branch created at GitHub "+short(st.remoteState.sha));}
  else if(a==="FAST_FORWARD"){setRef(ids,st.remoteState.sha,st.localState.sha);log.push("FAST_FORWARD: local branch moved to GitHub "+short(st.remoteState.sha));}
  else if(a==="RESET_TO_REMOTE"){
   const r=replayUnpushed(ids,gather(ids,o,{others:true}),o,log);
   if(!r.ok)return {ok:false,st,failure:r};
  }
  else if(a==="PUSH_PENDING"){
   const r=pushPending(ids,gather(ids,o,{others:true}),o,log);
   if(!r.ok)return {ok:false,st,failure:r};
  }else if(a==="REPLAY_UNPUSHED"){
   const r=replayUnpushed(ids,gather(ids,o,{others:true}),o,log);
   if(!r.ok)return {ok:false,st,failure:r};
  }else throw fail("INTERNAL","unknown branch action "+a);
  st=gather(ids,o,{others:true});
 }
 throw fail("SYNC_LOOP","the branch could not be reconciled after 6 attempts; nothing was lost (see refs/backup/"+ids.branch+"/ and GitHub)");
}

/* ------------------------------------------------------------------ output */

const emit=(o,value,human)=>{console.log(o.json?JSON.stringify(value,null,2):human(value));};
const bullets=(title,items,max=12)=>items.length?title+"\n"+items.slice(0,max).map(x=>"  - "+x).join("\n")+(items.length>max?"\n  ... "+(items.length-max)+" more (use --json)":""):"";
function humanPlan(p){
 const cp=p.checkpoint;
 const lines=[
  "SESSION "+p.session.branch+" - "+p.state+" (source of truth: "+p.source_of_truth+")",
  "Checkpoint: "+cp.trust+(cp.recorded?" - "+cp.recorded.totals.researched+" researched, "+cp.recorded.totals.qa_pass+" QA PASS, "+cp.recorded.totals.qa_fail_open+" open QA FAIL, "+cp.recorded.totals.pushed+" pushed":" (none on GitHub)"),
  "GitHub: "+p.derived.pushed+" topics in "+p.batches.length+" batch file(s); local-only: "+p.derived.pending_push+" topics; ingested by main: "+p.derived.ingested_by_main,
  "Branch: action "+p.branch.action+" (remote "+short(p.branch.remote_sha)+", local "+short(p.branch.local_sha)+", relation "+p.branch.relation+")",
  "Do NOT research again: "+p.do_not_research.count+" topics (--json lists the keys)",
  "Next batch: "+String(p.next.seq).padStart(4,"0")+" ("+p.next.size+" topics) -> "+p.next.file
 ];
 const b=p.batches.map(x=>String(x.seq).padStart(4,"0")+" "+x.candidates+" topics "+x.ingest);
 return [lines.join("\n"),bullets("Batches on GitHub:",b),bullets("Unresolved:",p.unresolved.map(u=>u.kind+" "+u.id+(u.key?" "+u.key:"")+(u.message?" "+u.message:""))),
  bullets("Applied:",p.applied||[]),bullets("Warnings:",p.warnings),bullets("Actions:",p.actions)].filter(Boolean).join("\n");
}
function humanQa(r){
 const lines=["QA "+r.session.branch+" against main@"+short(r.context.main_sha)+" ("+r.context.in_flight_branches+" other research branch(es) in flight)"];
 for(const x of r.results){
  const bad=x.issues.filter(i=>i.severity==="FAIL");
  lines.push(" "+(x.verdict==="PASS"?"PASS":x.verdict==="FAIL"?"FAIL":"SKIP")+"  "+x.ref+(x.verdict==="SKIP_ALREADY_ACCEPTED"?"  (already accepted: "+x.accepted_as+")":"  "+Object.entries(x.phases).map(([k,v])=>k+" "+v).join(" | ")));
  for(const i of bad)lines.push("        ["+i.phase+"] "+i.gate+": "+i.reason);
  for(const i of x.issues.filter(i=>i.severity!=="FAIL"))lines.push("        (warning) "+i.gate+": "+i.reason);
 }
 for(const i of r.batch_issues)lines.push(" BATCH "+i.gate+": "+i.reason);
 for(const i of r.prior_failures)lines.push(" PRIOR "+i.file+" "+i.gate+": "+i.reason);
 lines.push("Phases: "+Object.entries(r.phase_summary).map(([k,v])=>k[0].toUpperCase()+k.slice(1)+" QA "+v).join(" | "));
 lines.push("Result: "+r.counts.pass+" PASS, "+r.counts.fail+" FAIL, "+r.counts.skipped+" already accepted -> "+r.decision.action+" "+r.decision.code+(r.decision.message?": "+r.decision.message:""));
 for(const w of r.warnings)lines.push("Warning: "+w);
 return lines.join("\n");
}
function humanResult(r){
 const head=r.status==="SAVED"?"SAVED "+r.branch+" @ "+short(r.sha)+(r.summary?.kind==="BATCH"?" - batch "+String(r.summary.seq).padStart(4,"0")+" ("+r.summary.topics+" topics, sha256 "+r.summary.sha256.slice(0,12)+") verified on GitHub (ls-remote + exact bytes)":
  r.summary?.kind==="CHECKPOINT_ONLY"?" - checkpoint update verified on GitHub":" verified on GitHub"):
  r.status==="NOOP"?"NOTHING TO WRITE - "+(r.decision?.message||r.message||""):
  r.status==="COMMITTED_LOCAL"?"COMMITTED LOCALLY @ "+short(r.sha)+" - NOT on GitHub yet (run push-pending)":
  "NOT SAVED ("+r.status+"): "+(r.message||r.decision?.message||"");
 const tail=[];
 if(r.checkpoint)tail.push("Checkpoint: "+r.checkpoint.totals.researched+" researched, "+r.checkpoint.totals.qa_pass+" QA PASS, "+r.checkpoint.totals.qa_fail_open+" open QA FAIL, "+r.checkpoint.totals.pushed+" settled as pushed, "+r.checkpoint.totals.pending_push+" newest (this commit)");
 if(r.checkpoint&&r.status==="SAVED")tail.push("Next: batch "+String(r.checkpoint.next_batch.seq).padStart(4,"0")+" ("+BATCH_SIZE+" topics)");
 return [head,...tail,bullets("Recovery steps taken:",r.applied||[])].filter(Boolean).join("\n");
}

/* ------------------------------------------------------------------ commands */

function loadDraft(o,ids,today){
 if(!o.draft)throw fail("USAGE","--draft <file.json> is required (an array of candidates or {candidates:[...]})");
 let input;
 try{input=JSON.parse(fs.readFileSync(path.resolve(process.cwd(),o.draft),"utf8"));}catch(e){throw fail("DRAFT_UNREADABLE",o.draft+": "+e.message);}
 const n=normalizeDraft(input,ids,today);
 if(n.errors.length)throw fail("DRAFT_INVALID",n.errors.join("; "));
 return n.batch;
}
function cmdHints(o){
 const ids=o.agent||o.session||o.branch?sessionFrom(o):null; // with a session, its own branch is not "another session"
 const remote=o.remote||process.env.TOPIC_RESEARCH_REMOTE||"origin";
 if(o.offline!==true)fetchMain(remote);
 const M=refSha("refs/remotes/"+remote+"/main");
 if(!M)throw fail("NO_MAIN","refs/remotes/"+remote+"/main is missing");
 const main=readMain(M,ids);
 const others=o["no-others"]||o.offline?[]:readOthers(ids,remote,o);
 const flight=inFlightItems(others,{log:main.log});
 const inFlight={};for(const f of flight)inFlight[f.locale]=(inFlight[f.locale]||0)+1;
 const value={main_sha:M,domains:planningHints({matrix:main.matrix,map:main.map,policy:main.policy}),locales:localeCapacity({...main,inFlight}),
  rules:{batch_size:BATCH_SIZE,per_locale_cap:main.policy.targets.per_locale,no_invented_metrics:true,research_only_domains:"parent_id null + domain_id + proposed-Hub subcluster -> ARCHITECTURE_BLOCKED"}};
 if(o.taken){
  const loc=o.taken;
  value.taken={locale:loc,matrix:main.matrix.rows.filter(r=>r.locale===loc).map(r=>r.primary_query).filter(Boolean),
   topical_map:(main.map.locales[loc]?.proposals||[]).filter(p=>p.status!=="PROMOTED").map(p=>p.primary_query),in_flight_other_sessions:flight.filter(f=>f.locale===loc).map(f=>f.primary_query)};
 }
 emit(o,value,v=>{
  const rows=v.domains.map(d=>"  "+d.id.padEnd(26)+d.status.padEnd(14)+(d.placement.mode==="EXISTING_HUB"?"existing Hubs "+Object.keys(d.placement.hubs).join(", "):"proposed Hub subclusters "+d.placement.subclusters.join(", "))+"  ["+d.total+" topics]");
  const cap=Object.entries(v.locales).map(([k,c])=>k+" "+c.available+" free of "+c.target+(c.in_flight_other_sessions?" (-"+c.in_flight_other_sessions+" in flight)":""));
  return ["Research targets against main@"+short(v.main_sha),"Domains:",...rows,"Capacity per language: "+cap.join(" | "),
   "Rules: "+BATCH_SIZE+" topics per batch; never invent volume/ranking/traffic; research-only domains use parent_id null + domain_id.",
   v.taken?"Already taken in "+v.taken.locale+": "+(v.taken.matrix.length+v.taken.topical_map.length+v.taken.in_flight_other_sessions.length)+" queries (use --json)":""].filter(Boolean).join("\n");
 });
}
function cmdSessions(o){
 const remote=o.remote||process.env.TOPIC_RESEARCH_REMOTE||"origin";
 if(o.offline!==true)fetchMain(remote);
 const M=refSha("refs/remotes/"+remote+"/main");
 if(!M)throw fail("NO_MAIN","refs/remotes/"+remote+"/main is missing");
 const log=JSON.parse(blobAt(M,RESEARCH_LOG)||'{"batches":[]}');
 const byDigest=new Map((log.batches||[]).filter(b=>b.sha256).map(b=>[b.sha256,b]));
 const branches=readOthers(null,remote,o);
 const sessions=branches.map(b=>{
  const ids=idsFromBranch(b.branch),ref="refs/remotes/"+remote+"/"+b.branch;
  const row={branch:b.branch,tip:short(refSha(ref)),managed:!!ids,batch_files:b.batches.length,
   ingest:{accepted:0,partial:0,rejected:0,pending:0}};
  for(const f of b.batches){
   const e=byDigest.get(sha256(f.raw));
   if(!e)row.ingest.pending++;else if(e.error||!(e.added||[]).length)row.ingest.rejected++;else if((e.rejected||[]).length)row.ingest.partial++;else row.ingest.accepted++;
  }
  if(ids){
   const raw=blobAt(ref,ids.checkpointPath);
   if(raw!==null){
    try{const cp=JSON.parse(raw);row.checkpoint={updated_at:cp.updated_at,totals:cp.totals,last_batch:cp.last_batch?.seq||0,unresolved:(cp.unresolved||[]).length,valid:validateCheckpoint(cp,{ids}).length===0};}
    catch{row.checkpoint={valid:false};}
   }else row.checkpoint=null;
   row.resume=`node scripts/topic-research.mjs resume --agent ${ids.agent} --session ${ids.session} --apply`;
  }
  return row;
 });
 emit(o,{main_sha:M,sessions},v=>["Research sessions on GitHub (main@"+short(v.main_sha)+"):",...v.sessions.map(s=>"  "+s.branch.padEnd(34)+" tip "+s.tip+" - "+s.batch_files+" batch file(s); intake "+JSON.stringify(s.ingest)+
  (s.checkpoint?" - checkpoint "+(s.checkpoint.valid?"OK":"INVALID")+" "+(s.checkpoint.totals?s.checkpoint.totals.researched+" researched / "+s.checkpoint.totals.pushed+" pushed":""):s.managed?" - no checkpoint":" - legacy branch"))].join("\n"));
}
function cmdResume(o){
 const ids=sessionFrom(o);
 const body=()=>{
  if(o.apply)assertNotCheckedOut(ids);
  let st=gather(ids,o);
  const applied=[];
  let failure=null;
  if(o.apply){
   const r=syncOwn(ids,st,o,applied);
   st=r.ok?r.st:gather(ids,o);
   failure=r.ok?null:r.failure;
  }
  const plan={...st.plan,applied,ok:!failure};
  if(failure)plan.failure={status:failure.status,message:failure.message};
  emit(o,plan,humanPlan);
  if(failure){console.error("NOT SAVED: "+failure.message);process.exitCode=1;}
 };
 return o.apply?withLock(body):body();
}
function cmdCheck(o){
 const ids=sessionFrom(o);
 const st=gather(ids,o,{others:true});
 const batch=loadDraft(o,ids,st.today);
 const ev=qa(ids,st,batch,batchFile(ids,st.plan.next.seq));
 const decision=decideBatch(ev,{final:o.final===true,quarantine:o["quarantine-failures"]===true});
 const sync=["NONE","CREATE_FROM_MAIN","FAST_FORWARD","CREATE_FROM_REMOTE"].includes(st.plan.branch.action)?null:st.plan.branch.action;
 const report=qaReport(ids,st,ev,decision,sync?{sync_required:sync}:{});
 emit(o,report,r=>humanQa(r)+(sync?"\nNote: branch action "+sync+" is pending; commit performs it automatically before writing.":""));
 if(decision.action==="REFUSE"||decision.action==="QUARANTINE_ONLY")process.exitCode=1;
}
function cmdCommit(o){
 const ids=sessionFrom(o);
 const trailers=trailersOf(o);
 return withLock(()=>{
  assertNotCheckedOut(ids);
  const flags={final:o.final===true,quarantine:o["quarantine-failures"]===true,note:(o.note||[]).join(" | ")||null,trailers,noPush:o["no-push"]===true};
  let result=null,applied=[];
  const draftText=o.draft;
  for(let attempt=1;attempt<=3;attempt++){
   let st=gather(ids,o,{others:true});
   const batch=loadDraft({draft:draftText},ids,st.today);
   const synced=syncOwn(ids,st,o,applied);
   if(!synced.ok){result={...synced.failure,ok:false,branch:ids.branch};break;}
   st=synced.st;
   result=commitDraft(ids,st,batch,flags,o);
   if(result.status==="PUSH_REJECTED"){applied.push("PUSH_REJECTED: GitHub moved while we pushed (attempt "+attempt+"); reconciling by content and retrying");continue;}
   break;
  }
  result.branch=ids.branch;result.applied=applied;
  if(result.status==="REFUSED"){
   emit(o,result.report,humanQa);
   console.error("NOT SAVED: "+result.decision.message);
   process.exitCode=1;return;
  }
  if(result.status==="NOOP"&&applied.some(a=>/^REPLAY|^PUSHED_PENDING|PUSH_REJECTED/.test(a))){result.status="NOOP";result.message="Every topic of this draft is already on GitHub (saved by the replay above).";}
  const {report,...rest}=result;
  emit(o,o.json?{...rest,qa:report?.counts}:rest,humanResult);
  if(!result.ok&&result.status!=="NOOP")process.exitCode=1;
 });
}
function cmdPushPending(o){
 const ids=sessionFrom(o);
 return withLock(()=>{
  assertNotCheckedOut(ids);
  const st=gather(ids,o,{others:true});
  const applied=[];
  const r=syncOwn(ids,st,o,applied);
  const st2=r.ok?r.st:st;
  const value={ok:r.ok,branch:ids.branch,applied,plan:{branch:st2.plan.branch,derived:st2.plan.derived,next:st2.plan.next},failure:r.ok?null:{status:r.failure.status,message:r.failure.message}};
  emit(o,value,v=>[v.ok?(applied.length?"DONE "+ids.branch+" is in sync with GitHub":"NOTHING TO PUSH - "+ids.branch+" is already in sync with GitHub"):"NOT SAVED: "+v.failure.message,bullets("Steps taken:",applied)].filter(Boolean).join("\n"));
  if(!r.ok)process.exitCode=1;
 });
}
function cmdCheckpoint(o){
 const ids=sessionFrom(o);
 const trailers=trailersOf(o);
 return withLock(()=>{
  assertNotCheckedOut(ids);
  const applied=[];
  let st=gather(ids,o,{others:true});
  const synced=syncOwn(ids,st,o,applied);
  if(!synced.ok){emit(o,{ok:false,failure:synced.failure,applied},()=> "NOT SAVED: "+synced.failure.message);process.exitCode=1;return;}
  st=synced.st;
  const {cp:base,rebuilt}=currentCheckpoint(ids,st,st.now);
  const ta=o["sync-ids"]?resolveTaIds(base,proposalMap(st)):{checkpoint:base,changed:0};
  const wants=(o.note||[]).length||(o.blocker||[]).length||(o.abandon||[]).length||ta.changed||rebuilt;
  if(!wants){emit(o,{ok:true,status:"NOOP",message:"The checkpoint on GitHub is already current and verified"},v=>"NOTHING TO WRITE - "+v.message);return;}
  const cp=applyUpdate(ta.checkpoint,{ids,now:st.now,mainSha:st.M,parentSha:st.tip?.sha||st.M,contract:st.main.contract,commitShaByFile:settledCommits(base,st.tip?.sha),notes:o.note||[],blockers:o.blocker||[],abandon:o.abandon||[]});
  const bad=[...validateCheckpoint(cp,{ids}),...verifyCheckpointContent(cp,st.ownFiles,ids)];
  if(bad.length)throw fail("CHECKPOINT_INVALID",bad.map(i=>i.code+" "+i.message).join("; "));
  const files=[{path:ids.checkpointPath,raw:canonical(cp)}];
  const message=withTrailers("research("+ids.stem+"): checkpoint update\n\nBranch: "+ids.branch+"\nCheckpoint: "+ids.checkpointPath+(ta.changed?"\nTopic Factory IDs resolved: "+ta.changed:"")+(rebuilt?"\nRe-derived from the batch files on GitHub":""),trailers);
  const w=writeAndPush(ids,st,{files,message,summary:{kind:"CHECKPOINT_ONLY",ta_ids_resolved:ta.changed,rebuilt}},o,{noPush:o["no-push"]===true});
  const value={...w,branch:ids.branch,applied,checkpoint:{totals:cp.totals,last_batch:cp.last_batch,next_batch:cp.next_batch}};
  emit(o,value,humanResult);
  if(!w.ok)process.exitCode=1;
 });
}
function cmdVerify(o){
 const ids=sessionFrom(o);
 const st=gather(ids,o);
 const p=st.plan;
 const checks={
  branch_on_github:st.remoteState.exists,
  local_matches_github:!st.localState.exists||st.localState.relation==="EQUAL",
  nothing_unpushed:st.localOnlyFiles.length===0,
  checkpoint_verified:p.checkpoint.trust==="VERIFIED",
  batches_recorded:st.remoteFiles.length===0||p.checkpoint.issues.every(i=>i.code!=="CONTENT_UNRECORDED")
 };
 const ok=Object.values(checks).every(Boolean);
 const value={ok,branch:ids.branch,github_sha:st.remoteState.sha||null,local_sha:st.localState.sha||null,checks,checkpoint_issues:p.checkpoint.issues,
  derived:p.derived,batches:p.batches,warnings:p.warnings};
 emit(o,value,v=>[(v.ok?"VERIFIED ":"NOT VERIFIED ")+ids.branch+" (GitHub "+short(v.github_sha)+", local "+short(v.local_sha)+")",
  ...Object.entries(v.checks).map(([k,x])=>"  "+(x?"ok  ":"FAIL")+" "+k),bullets("Checkpoint issues:",v.checkpoint_issues.map(i=>i.code+": "+i.message)),bullets("Warnings:",v.warnings)].filter(Boolean).join("\n"));
 if(!ok)process.exitCode=1;
}

/** CI (no network): the checked-out research branch must carry a consistent checkpoint for its own batches. */
function cmdVerifyTree(o){
 const branch=o.branch||process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||currentBranch();
 const ids=idsFromBranch(branch);
 const result={branch,managed:!!ids,issues:[],warnings:[]};
 const finish=()=>{
  emit(o,result,v=>(v.managed?(v.issues.length?"FAIL":"PASS")+" research tree "+v.branch:"SKIP "+v.branch+" is not a managed research/<agent>-<session> branch")+
   "\n"+[...v.issues.map(i=>"  FAIL "+i.code+": "+i.message),...v.warnings.map(w=>"  warn "+w)].join("\n"));
  if(result.issues.length)process.exitCode=1;
 };
 if(!ids)return finish();
 const list=dir=>fs.existsSync(path.join(ROOT,dir))?fs.readdirSync(path.join(ROOT,dir)).filter(f=>f.endsWith(".json")).sort().map(f=>dir+f):[];
 const batches=list(BATCH_DIR),cps=list(CHECKPOINT_DIR);
 const add=(code,message)=>result.issues.push({code,message});
 const base=o.base||"origin/main";
 // A file that is byte-identical on the base branch was not written by this branch (an older session that was
 // merged is not this session's doing); only what this branch adds or changes is judged.
 const inherited=f=>{const b=blobAt(base,f);return b!==null&&b===fs.readFileSync(path.join(ROOT,f),"utf8");};
 const own=batches.filter(f=>parseBatchFile(f,ids)!==null);
 for(const f of batches){
  const m=managedBatchOwner(f);
  if(m&&m.stem!==ids.stem){if(!inherited(f))add("TREE_FOREIGN_BATCH",f+" belongs to another research session; a session never writes another session's files");}
  else if(!m)result.warnings.push(f+" is a legacy-named batch (allowed; it has no checkpoint coverage)");
 }
 for(const f of cps)if(checkpointOwner(f)!==ids.stem&&!inherited(f))add("TREE_FOREIGN_CHECKPOINT",f+" belongs to another research session");
 const cpPath=ids.checkpointPath;
 const cpRaw=fs.existsSync(path.join(ROOT,cpPath))?fs.readFileSync(path.join(ROOT,cpPath),"utf8"):null;
 if(own.length&&cpRaw===null)add("TREE_CHECKPOINT_MISSING","batches exist but "+cpPath+" is missing; the checkpoint is committed with every batch");
 if(cpRaw!==null){
  let cp=null;try{cp=JSON.parse(cpRaw);}catch{add("CP_JSON",cpPath+" is not valid JSON");}
  if(cp){
   for(const i of [...validateCheckpoint(cp,{ids}),...verifyCheckpointContent(cp,own.map(f=>({file:f,raw:fs.readFileSync(path.join(ROOT,f),"utf8")})),ids)])add(i.code,i.message);
  }
 }
 // Sessions that use the checkpoint protocol (an own numbered batch or checkpoint on the branch) are held to the
 // path allowlist; a plain legacy session keeps its old contract (validate-batches) and only gets warnings.
 const adopted=own.length>0||cpRaw!==null;
 const diff=run(["diff","--name-only","--no-renames",base+"...HEAD"],{allow:true});
 if(diff.status!==0)result.warnings.push("could not diff against "+base+" (shallow checkout?); the path allowlist was not checked here");
 else for(const f of diff.stdout.split("\n").filter(Boolean)){
  if(isAllowedPath(f,ids))continue;
  if(f.startsWith(BATCH_DIR)&&!managedBatchOwner(f))continue;
  const msg=f+" changed on this research branch; a session writes only "+cpPath+" and "+batchFile(ids,1).replace("0001","NNNN");
  if(adopted)add("TREE_PATH_NOT_ALLOWED",msg);else result.warnings.push("legacy session (no checkpoint): "+msg);
 }
 finish();
}

/* ------------------------------------------------------------------ main */

export function main(argv){
 try{
  const [cmd,...rest]=argv;
  const o=parseArgs(cmd,rest);
  ({hints:cmdHints,sessions:cmdSessions,resume:cmdResume,check:cmdCheck,commit:cmdCommit,"push-pending":cmdPushPending,checkpoint:cmdCheckpoint,verify:cmdVerify,"verify-tree":cmdVerifyTree})[cmd](o);
 }catch(e){
  console.error("TOPIC_RESEARCH_ERROR: "+(String(e.message).startsWith(e.code+":")?e.message:(e.code?e.code+": ":"")+e.message));
  process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2));
