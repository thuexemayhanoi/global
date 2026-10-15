#!/usr/bin/env node
/**
 * Owner-approved multi-language content staging, dry-run by default.
 * --apply only works on a non-main Git branch and never calls APIs or git push.
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {checkArticle,articlePath} from "../articles.mjs";
import {readLocalSitemapInventory} from "../sitemaps.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const args=process.argv.slice(2);
const values=key=>args.flatMap((a,i)=>a===key?[args[i+1]]:[]);
const first=key=>values(key)[0];
const apply=args.includes("--apply");
const approvalPath=first("--approval-file");
const draftPaths=values("--file");
const safePath=p=>{
 if(!p||typeof p!=="string"||path.isAbsolute(p)||p.split(/[\\/]/).includes(".."))throw Error("Unsafe or missing file path");
 const resolved=path.resolve(root,p);
 if(!resolved.startsWith(root+path.sep))throw Error("Path must remain under repo");
 return resolved;
};
function run(script,...argv){
 const r=spawnSync(process.execPath,[script,...argv],{cwd:root,encoding:"utf8",maxBuffer:8*1024*1024,timeout:120000});
 if(r.status!==0)throw Error(script+" failed:\n"+(r.stderr||r.stdout).slice(-5000));
 return r.stdout.trim();
}
function branch(){
 const r=spawnSync("git",["branch","--show-current"],{cwd:root,encoding:"utf8"});
 const name=(r.stdout||"").trim();
 if(r.status!==0||!name||["main","master"].includes(name))throw Error("Apply requires a checked-out named feature branch, never main/master");
 const dirty=spawnSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"});
 if(dirty.status!==0||dirty.stdout.trim())throw Error("Apply requires a clean feature branch; commit or stash existing changes first");
 return name;
}
try{
 if(!draftPaths.length||draftPaths.length>5)throw Error("Pass 1..5 --file draft JSON paths");
 if(new Set(draftPaths).size!==draftPaths.length)throw Error("Duplicate draft paths");
 const matrixPath=path.join(root,"data/seo/master-matrix.json");
 const matrix=JSON.parse(fs.readFileSync(matrixPath,"utf8"));
 const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8"));
 const packets=draftPaths.map(p=>JSON.parse(fs.readFileSync(safePath(p),"utf8")));
 const ids=packets.map(p=>p.matrix_id);
 if(new Set(ids).size!==ids.length)throw Error("Duplicate Matrix IDs in batch");
 const pending=new Set(ids);
 const failures=[];
 for(const p of packets){
  const qa=checkArticle(p,matrix,locales,{pending,assetsRoot:root,factMode:"strict"});
  if(!qa.passed)failures.push({id:p.matrix_id,errors:qa.errors});
  const output=matrix.rows.find(r=>r.id===p.matrix_id)?.url;
  if(output){
   const target=path.join(root,articlePath(output));
   if(fs.existsSync(target))failures.push({id:p.matrix_id,errors:["Refusing to replace existing HTML: "+output]});
  }
  const articleJson=path.join(root,"content/articles",p.matrix_id+".json");
  if(fs.existsSync(articleJson))failures.push({id:p.matrix_id,errors:["Article JSON already exists"]});
 }
 if(failures.length){console.error(JSON.stringify({passed:false,failures},null,2));process.exit(1);}
 const plan={mode:apply?"APPROVED_STAGING":"DRY_RUN",languages:[...new Set(packets.map(p=>p.locale))],articles:packets.map(p=>({id:p.matrix_id,url:p.proposed_url,title:p.title})),count:packets.length,changes:["Stage approved article JSON","Promote exactly selected Matrix rows to PUBLISHED","Regenerate static HTML, navigation, footer and sitemap","Run QA checks"],no_external_api:true};
 if(!apply){console.log(JSON.stringify({...plan,next_step:"Ask owner to review every packet; prepare explicit approval file, then run on clean feature branch with --apply"},null,2));process.exit(0);}
 const current=branch();
 const approval=JSON.parse(fs.readFileSync(safePath(approvalPath),"utf8"));
 if(approval.approval_phrase!=="I_APPROVE_THESE_ARTICLES"||approval.approved_by!=="owner"||!/^\d{4}-\d{2}-\d{2}$/.test(approval.approved_on||""))throw Error("Owner approval manifest missing or invalid");
 const approved=approval.approved_ids;
 if(!Array.isArray(approved)||approved.length!==ids.length||approved.some((id,i)=>id!==ids[i]))throw Error("Approval manifest must list exact IDs in the supplied order");
 const original=fs.readFileSync(matrixPath,"utf8");
 const freezePath=path.join(root,"data/seo/url-freeze.json");
 const originalFreeze=fs.existsSync(freezePath)?fs.readFileSync(freezePath,"utf8"):null;
 const stagedJson=[];
 const htmlPaths=packets.map(p=>path.join(root,articlePath(p.proposed_url)));
 try{
  const altered=structuredClone(matrix);
  for(const p of packets)altered.rows.find(r=>r.id===p.matrix_id).status="PUBLISHED";
  for(const p of packets){
   const target=path.join(root,"content/articles",p.matrix_id+".json");
   fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.writeFileSync(target,JSON.stringify(p,null,2)+"\n");
   stagedJson.push(target);
  }
  fs.writeFileSync(matrixPath,JSON.stringify(altered,null,2)+"\n");
  run("scripts/build.mjs");
  run("scripts/seo/content-graph.mjs","--write");
  // Freeze only the newly published URLs; refuses if any SEO guard check fails.
  run("scripts/seo/seo-guard.mjs","--add-new");
  run("scripts/seo/fact-guard.mjs");
  for(const [file,extra] of [["scripts/build.mjs",["--check"]],["scripts/seo/validate-plan.mjs",[]],["scripts/nav-qa.mjs",[]],["scripts/seo/audit-static.mjs",["--fail-p0"]],["tests/content-publisher.test.mjs",[]]]){
   if(file.startsWith("tests/"))continue;
   run(file,...extra);
  }
  const sitemapInventory=readLocalSitemapInventory(root,locales.map(l=>l.code));
  for(const p of packets){
   if(!sitemapInventory.urls.includes(p.proposed_url))throw Error("Missing sitemap entry for "+p.matrix_id);
  }
  console.log(JSON.stringify({...plan,branch:current,passed:true,ready_for_review:true,published_on_live_site:false,next_step:"Review git diff, run Node tests, open and merge approved PR after GitHub QA"},null,2));
 }catch(e){
  fs.writeFileSync(matrixPath,original);
  if(originalFreeze!==null)fs.writeFileSync(freezePath,originalFreeze);
  for(const f of stagedJson)if(fs.existsSync(f))fs.unlinkSync(f);
  try{run("scripts/build.mjs");run("scripts/seo/content-graph.mjs","--write")}catch(restoreError){console.error("Rollback regeneration needs manual review: "+restoreError.message);}
  for(const f of htmlPaths)if(fs.existsSync(f))fs.unlinkSync(f);
  throw e;
 }
}catch(error){console.error("PUBLISH BATCH REFUSED: "+error.message);process.exitCode=1;}
