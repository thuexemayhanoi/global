#!/usr/bin/env node
/**
 * Topic Factory 10K CLI.
 *   status [--json] [--markdown <file>]      per-locale dashboard (read-only unless --markdown)
 *   validate-batch --file <path>             research batch QA + dry-run intake (read-only)
 *   validate-batches                         every batch under factory/topic-research/batches (read-only)
 *   ingest --branch research/<x> --sha <40>  append researched candidates (trusted Actions on main only)
 *   refill [--limit n]                       dry-run standing-policy promotion plan
 *   refill --apply                           promote to Matrix IDEA rows (trusted Actions on main, or
 *                                            --local on a clean non-main branch for rehearsal)
 * Never publishes, never touches live pages, CNAME, claims or other repositories.
 */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadTopicalMap,validateTopicalMap,TA_DIR} from "./seo/topical-authority-core.mjs";
import {factoryStatus,selectRefill,planStandingPromotion,validatePolicy,validateResearchBatch,ingestResearch,validateResearchSequence,dashboardMarkdown,publicationQueue,RESEARCH_PURPOSE} from "./topic-factory-core.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const POLICY="data/seo/topic-factory/policy.json";
const PROMOTION_LOG="data/seo/topic-factory/promotion-log.json";
const RESEARCH_LOG="data/seo/topic-factory/research-log.json";
const BATCH_DIR="factory/topic-research/batches/";
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const optional=(p,f)=>fs.existsSync(path.join(ROOT,p))?read(p):f;
const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+"\n");};
const git=(...a)=>execFileSync("git",a,{cwd:ROOT,encoding:"utf8",maxBuffer:16*1024*1024});
function opts(argv){
 const o={_:[]};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(!a.startsWith("--")){o._.push(a);continue;}
  o[a.slice(2)]=argv[i+1]&&!argv[i+1].startsWith("--")?argv[++i]:true;
 }
 return o;
}
function context(){
 const policy=read(POLICY),standing=read(policyPathOf(policy));
 const errs=validatePolicy(policy,standing);
 if(errs.length)throw Error("FACTORY_POLICY_INVALID: "+errs.join("; "));
 const matrix=read("data/seo/master-matrix.json"),map=loadTopicalMap(ROOT);
 const ledger=read("factory/external-writers/claims.json"),registry=read("factory/external-writers/protected-drafts.json");
 const frozen=optional("data/seo/url-freeze.json",{urls:[]}).urls.map(u=>u.url);
 return {policy,standing,matrix,map,ledger,registry,frozen};
}
function policyPathOf(policy){
 const p=policy.standing_policy;
 if(typeof p!=="string"||!/^approvals\/[a-z0-9-]+\.json$/.test(p))throw Error("standing_policy must be an approvals/*.json path");
 return p;
}
function trustedMain(workflow){
 if(process.env.GITHUB_ACTIONS!=="true"||process.env.GITHUB_WORKFLOW!==workflow)return false;
 if(git("branch","--show-current").trim()!=="main")throw Error("FACTORY_REFUSED: main checkout required");
 return true;
}
function cleanBranch(){
 const b=git("branch","--show-current").trim();
 if(!b||["main","master"].includes(b))throw Error("--local rehearsal needs a named non-main branch");
 if(git("status","--porcelain").trim())throw Error("--local rehearsal needs a clean working tree");
 return b;
}
const run=(script,...a)=>{const r=spawnSync(process.execPath,[script,...a],{cwd:ROOT,encoding:"utf8",maxBuffer:32*1024*1024});if(r.status!==0)throw Error(script+" failed: "+(r.stderr||r.stdout).slice(-3000));return r.stdout;};
function writeMap(map){
 write(TA_DIR+"/references.json",map.references);
 for(const [code,L] of Object.entries(map.locales))write(TA_DIR+"/"+code+".json",L);
}

function cmdStatus(o){
 const c=context();
 const status=factoryStatus(c);
 const validation=validateTopicalMap({map:c.map,matrix:c.matrix,frozenUrls:c.frozen});
 const refill=selectRefill({...c,validation});
 const publisher=optional("factory/publisher/state.json",null);
 const queue=publicationQueue({matrix:c.matrix,ledger:c.ledger,report:optional("factory/publisher/report.json",null),state:publisher});
 const slots=optional("factory/external-writers/slots.json",null);
 if(o.markdown){
  if(typeof o.markdown!=="string"||!/^docs\/[A-Z0-9-]+\.md$/.test(o.markdown))throw Error("--markdown must be docs/<NAME>.md");
  fs.writeFileSync(path.join(ROOT,o.markdown),dashboardMarkdown(status,{publisher,refill,rejectedTotal:refill.rejected.length,queue,slots,ledger:c.ledger}));
 }
 const {byLocale,byWriter,...queueSummary}=queue;
 const out={mode:"READ_ONLY",...status,queue,refill:{selected:refill.selected.length,research_needed:refill.research_needed,locales:refill.locales,rejected:refill.rejected.length}};
 if(o.json||!o.markdown)console.log(JSON.stringify(o.json?out:{totals:out.totals,locales:Object.fromEntries(Object.entries(out.locales).map(([k,v])=>[k,{published:v.published,submitted:v.submitted,claimed:v.claimed,ready:v.ready,proposed:v.proposed,remaining:v.remaining,refill:v.refill}])),queue:queueSummary,refill:out.refill},null,2));
}
function cmdValidateBatch(o){
 const c=context();
 const files=o.file?[o.file]:fs.existsSync(path.join(ROOT,BATCH_DIR))?
  fs.readdirSync(path.join(ROOT,BATCH_DIR)).filter(f=>f.endsWith(".json")).sort().map(f=>BATCH_DIR+f):[];
 for(const f of files)if(path.isAbsolute(f)||f.split(/[\\/]/).includes("..")||!f.startsWith(BATCH_DIR))
  throw Error("Batch files live under "+BATCH_DIR);
 // Use a cumulative dry-run map: every later file is checked against earlier
 // accepted research files. This never writes any map, claim, Matrix or URL.
 const processed=optional(RESEARCH_LOG,{version:1,batches:[]});
 const byDigest=new Map((processed.batches||[]).filter(b=>b.sha256).map(b=>[b.sha256,b]));
 const prepared=files.map(file=>{
  const raw=fs.readFileSync(path.join(ROOT,file),"utf8");
  const digest=createHash("sha256").update(raw).digest("hex");
  return {file,batch:JSON.parse(raw),replay:byDigest.get(digest)||null};
 });
 const checked=validateResearchSequence(prepared,{matrix:c.matrix,map:c.map,policy:c.policy,frozenUrls:c.frozen});
 console.log(JSON.stringify({mode:"READ_ONLY",batches:checked.results.length,
  sequential_validation:true,results:checked.results},null,2));
 if(!checked.passed)process.exitCode=1;
}
function cmdIngest(o){
 if(!trustedMain("Global Topic Factory"))throw Error("FACTORY_REFUSED: ingest runs only in the trusted Global Topic Factory workflow");
 const branch=o.branch,sha=o.sha;
 if(!/^research\/[A-Za-z0-9_-]+$/.test(branch||"")||!/^[0-9a-f]{40}$/.test(sha||""))throw Error("Expected research/<name> branch and 40-char SHA");
 git("fetch","--no-tags","origin","refs/heads/"+branch+":refs/remotes/origin/"+branch);
 if(git("rev-parse","refs/remotes/origin/"+branch).trim()!==sha){console.log("FACTORY_STALE_RUN_SKIP");return;}
 const c=context(),log=optional(RESEARCH_LOG,{version:1,batches:[]});
 const names=git("ls-tree","-r","--name-only",sha,"--",BATCH_DIR).split("\n").filter(f=>f.endsWith(".json"));
 let map=c.map,changed=false;
 for(const file of names){
  const raw=git("show",sha+":"+file),digest=createHash("sha256").update(raw).digest("hex");
  if(log.batches.some(b=>b.sha256===digest))continue; // replay-safe
  let batch;try{batch=JSON.parse(raw);}catch{log.batches.push({file,sha256:digest,commit:sha,branch,error:"Malformed JSON"});changed=true;continue;}
  if(batch?.purpose!==RESEARCH_PURPOSE)continue;
  const r=ingestResearch(batch,{...c,map,source:file+"@"+sha.slice(0,12),frozenUrls:c.frozen});
  map=r.map;changed=true;
  log.batches.push({file,sha256:digest,commit:sha,branch,agent:batch.agent?.name||null,session:batch.agent?.session||null,
   added:r.added.map(a=>a.candidate_id),rejected:r.rejected});
  console.log("INGESTED "+file+" added="+r.added.length+" rejected="+r.rejected.length);
 }
 if(changed){writeMap(map);write(RESEARCH_LOG,log);}
}
function cmdRefill(o){
 const apply=o.apply===true;
 const trusted=apply&&trustedMain("Global Topic Factory");
 if(apply&&!trusted&&o.local!==true)throw Error("FACTORY_REFUSED: refill --apply runs in the trusted workflow, or with --local on a clean non-main branch");
 if(apply&&!trusted)cleanBranch();
 const c=context();
 const validation=validateTopicalMap({map:c.map,matrix:c.matrix,frozenUrls:c.frozen});
 const sel=selectRefill({...c,validation,limit:o.limit?Number(o.limit):undefined});
 const date=(o.date&&/^\d{4}-\d{2}-\d{2}$/.test(o.date))?o.date:new Date().toISOString().slice(0,10);
 const board=read("factory/external-writers/assignments.json");
 const planned=planStandingPromotion({map:c.map,matrix:c.matrix,board,ids:sel.selected,policyPath:policyPathOf(c.policy),date,validation});
 const summary={mode:apply?"APPLY":"DRY_RUN",selected:sel.selected,locales:sel.locales,research_needed:sel.research_needed,
  rejected:sel.rejected.length,would_add:planned?planned.plan.added.map(r=>({id:r.id,url:r.url,from:r.topical_candidate_id})):[]};
 if(!apply||!planned){console.log(JSON.stringify(summary,null,2));return;}
 const {manifest,plan}=planned;
 const log=optional(PROMOTION_LOG,{version:1,entries:[]});
 const runId=log.entries.length+1,manifestPath="approvals/auto/topic-promotion-"+String(runId).padStart(4,"0")+".json";
 write(manifestPath,manifest);
 write("data/seo/master-matrix.json",plan.matrix);
 write("factory/external-writers/assignments.json",plan.board);
 const map=structuredClone(c.map);
 for(const {candidate_id,matrix_id} of plan.promoted){
  const L=map.locales[candidate_id.slice(3,5).toLowerCase()];
  const p=L.proposals.find(x=>x.candidate_id===candidate_id);p.status="PROMOTED";p.matrix_id=matrix_id;
 }
 writeMap(map);
 log.entries.push({run:runId,date,manifest:manifestPath,policy:manifest.policy,promoted:plan.promoted,
  ready_before:Object.fromEntries(Object.entries(sel.locales).map(([k,v])=>[k,v.ready])),rejected:sel.rejected.length,
  research_needed:sel.research_needed});
 write(PROMOTION_LOG,log);
 run("scripts/seo/content-graph.mjs","--write");
 run("scripts/build.mjs");
 for(const [s,...a] of [["scripts/build.mjs","--check"],["scripts/seo/validate-plan.mjs"],["scripts/nav-qa.mjs"],["scripts/seo/seo-guard.mjs"],["scripts/seo/fact-guard.mjs"],["scripts/seo/topical-authority.mjs","validate"],["scripts/seo/content-graph.mjs","--check"]])run(s,...a);
 console.log(JSON.stringify({...summary,promoted:plan.promoted,manifest:manifestPath,publish:false},null,2));
}

try{
 const [cmd,...rest]=process.argv.slice(2),o=opts(rest);
 if(cmd==="status")cmdStatus(o);
 else if(cmd==="validate-batch"||cmd==="validate-batches")cmdValidateBatch(o);
 else if(cmd==="ingest")cmdIngest(o);
 else if(cmd==="refill")cmdRefill(o);
 else throw Error("Usage: topic-factory.mjs status|validate-batch|validate-batches|ingest|refill");
}catch(e){console.error("TOPIC_FACTORY_ERROR: "+e.message);process.exitCode=1;}
