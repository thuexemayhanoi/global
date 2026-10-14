#!/usr/bin/env node
/**
 * Topical Authority CLI (read-only unless `promote --apply` with an owner manifest).
 *   status                       coverage by state × locale × cluster, gaps
 *   validate                     gates T1–T10 over the 10 locale topical maps
 *   links --id <ID>              internal-link plan for a Matrix row or candidate
 *   backlog [--locale xx]        next promotable PROPOSED candidates (refill source)
 *   promote --manifest <file>    dry-run promotion of approved candidates to Matrix IDEA
 *   promote --manifest <file> --apply   (clean non-main branch only)
 * Never publishes, never edits pages, sitemap, CNAME, claims or other repositories.
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadTopicalMap,validateTopicalMap,coverage,linkPlan,planPromotion,allProposals,proposalURL,TA_DIR} from "./topical-authority-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const optional=(p,fallback)=>fs.existsSync(path.join(ROOT,p))?read(p):fallback;
function options(argv){
 const o={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(!k.startsWith("--")||k.slice(2) in o)throw Error("Invalid or repeated option "+k);
  o[k.slice(2)]=argv[i+1]&&!argv[i+1].startsWith("--")?argv[++i]:true;
 }
 return o;
}
function context(){
 const matrix=read("data/seo/master-matrix.json");
 const map=loadTopicalMap(ROOT);
 const frozen=optional("data/seo/url-freeze.json",{urls:[]}).urls.map(u=>u.url);
 return {matrix,map,frozen,validation:validateTopicalMap({map,matrix,frozenUrls:frozen})};
}
function safeRel(p){
 if(typeof p!=="string"||path.isAbsolute(p)||p.split(/[\\/]/).includes(".."))throw Error("Use a repo-relative manifest path");
 return p;
}
function cleanFeatureBranch(){
 const b=spawnSync("git",["branch","--show-current"],{cwd:ROOT,encoding:"utf8"});
 const name=(b.stdout||"").trim();
 if(b.status!==0||!name||["main","master"].includes(name))throw Error("--apply requires a named non-main branch");
 const d=spawnSync("git",["status","--porcelain"],{cwd:ROOT,encoding:"utf8"});
 if(d.status!==0||d.stdout.trim())throw Error("--apply requires a clean working tree");
 return name;
}
function main(){
 const [cmd="status",...argv]=process.argv.slice(2),o=options(argv);
 const {matrix,map,frozen,validation}=context();
 if(cmd==="validate"){
  console.log(JSON.stringify({mode:"TOPICAL_MAP_QA_ONLY",...validation,warnings_count:validation.warnings.length,
   warnings:o.verbose?validation.warnings:validation.warnings.slice(0,25)},null,2));
  if(!validation.passed)process.exitCode=1;
  return;
 }
 if(cmd==="status"){
  const cov=coverage({map,matrix,claims:optional("factory/external-writers/claims.json",{claims:[]}),
   protectedData:optional("factory/external-writers/protected-drafts.json",{protected:[],held_ids:[]})});
  const locales=Object.fromEntries(Object.entries(cov.locales).map(([k,v])=>[k,{totals:v.totals,gaps:v.gaps,
   ...(o.locale===k||o.verbose?{clusters:v.clusters}:{})}]));
  console.log(JSON.stringify({repo:"thuexemayhanoi/global",mode:"READ_ONLY_COVERAGE",gates_passed:validation.passed,
   totals:cov.totals,locales,frozen_live_urls:frozen.length,
   meaning:"PUBLISHED is live; REVIEW/SUBMITTED/WRITING/PLANNED are Matrix IDEA rows in the Writer pipeline; PROPOSED and ARCHITECTURE_BLOCKED exist only in the topical map (capacity, not pages)."},null,2));
  return;
 }
 if(cmd==="links"){
  if(typeof o.id!=="string")throw Error("Use links --id <MATRIX-ID|TA-XX-0000>");
  console.log(JSON.stringify(linkPlan({map,matrix,id:o.id}),null,2));
  return;
 }
 if(cmd==="backlog"){
  if(o.locale&&!matrix.locales.includes(o.locale))throw Error("Unknown locale");
  const count=Number(o.count||10);
  if(!Number.isInteger(count)||count<1||count>50)throw Error("--count 1..50");
  const items=allProposals(map).filter(p=>p.status==="PROPOSED"&&(!o.locale||p.locale===o.locale))
   .sort((a,b)=>a.priority-b.priority||a.locale.localeCompare(b.locale)||a.candidate_id.localeCompare(b.candidate_id)).slice(0,count)
   .map(p=>({candidate_id:p.candidate_id,locale:p.locale,parent_id:p.parent_id,subcluster:p.subcluster,proposed_url:proposalURL(p),primary_query:p.primary_query,working_title:p.working_title,priority:p.priority}));
  console.log(JSON.stringify({mode:"PROMOTION_CANDIDATES_READ_ONLY",gates_passed:validation.passed,items,
   next:"Owner reviews SERP intent, then lists chosen candidate_ids in a promotion manifest (see examples/topical-promotion-manifest.sample.json)."},null,2));
  return;
 }
 if(cmd==="promote"){
  const manifest=read(safeRel(o.manifest));
  const board=read("factory/external-writers/assignments.json");
  const plan=planPromotion({map,matrix,board,manifest,validation});
  if(!o.apply){
   console.log(JSON.stringify({mode:"DRY_RUN",would_add:plan.added.map(r=>({id:r.id,url:r.url,parent_id:r.parent_id,from:r.topical_candidate_id})),next:plan.next,publish:false},null,2));
   return;
  }
  const branch=cleanFeatureBranch();
  fs.writeFileSync(path.join(ROOT,"data/seo/master-matrix.json"),JSON.stringify(plan.matrix,null,2)+"\n");
  fs.writeFileSync(path.join(ROOT,"factory/external-writers/assignments.json"),JSON.stringify(plan.board,null,2)+"\n");
  const byLocale=new Map();
  for(const p of plan.promoted){const loc=p.candidate_id.slice(3,5).toLowerCase();if(!byLocale.has(loc))byLocale.set(loc,[]);byLocale.get(loc).push(p);}
  for(const [loc,list] of byLocale){
   const rel=TA_DIR+"/"+loc+".json",data=read(rel);
   for(const {candidate_id,matrix_id} of list){const p=data.proposals.find(x=>x.candidate_id===candidate_id);p.status="PROMOTED";p.matrix_id=matrix_id;}
   fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(data,null,2)+"\n");
  }
  const graph=spawnSync(process.execPath,["scripts/seo/content-graph.mjs","--write"],{cwd:ROOT,encoding:"utf8"});
  if(graph.status!==0)throw Error("content-graph regeneration failed: "+graph.stderr);
  console.log(JSON.stringify({mode:"APPLIED_TO_WORKING_TREE",branch,added:plan.added.map(r=>r.id),next:plan.next.slice(1),
   reminder:"Review the diff and open a PR. Promotion adds unpublished IDEA rows only; nothing is published or linked."},null,2));
  return;
 }
 throw Error("Unknown command "+cmd);
}
try{main()}catch(e){console.error("TOPICAL_AUTHORITY_REFUSED "+e.message);process.exitCode=1;}
