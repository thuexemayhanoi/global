#!/usr/bin/env node
/**
 * Anti-fabrication QA for prices, NAP, hours and business schema.
 *   node scripts/seo/fact-guard.mjs           # check (CI)
 *   node scripts/seo/fact-guard.mjs --write   # regenerate data/business/reference.localized.json
 * Strict for live pages, site copy, Matrix, topical map and approved articles;
 * Writer drafts get warnings except for wrong Nguyễn Tú facts, which always fail.
 * Read-only apart from --write; never edits pages, NAP, prices or other repositories.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadReference,validateReference,localizeReference,scanText,scanHtml,scanPacket,LOCALIZED_PATH} from "./fact-guard-core.mjs";
import {collectHtml} from "./seo-guard.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const jsonFiles=dir=>{
 const abs=path.join(ROOT,dir),out=[];
 if(!fs.existsSync(abs))return out;
 for(const e of fs.readdirSync(abs,{withFileTypes:true})){
  const rel=dir+"/"+e.name;
  if(e.isDirectory())out.push(...jsonFiles(rel));else if(e.name.endsWith(".json"))out.push(rel);
 }
 return out.sort();
};
const strings=(v,acc=[])=>{if(typeof v==="string")acc.push(v);else if(Array.isArray(v))v.forEach(x=>strings(x,acc));else if(v&&typeof v==="object")Object.values(v).forEach(x=>strings(x,acc));return acc;};
const localeOfPage=key=>key.match(/^([a-z]{2})\//)?.[1]||"en";

export function runFactGuard(root=ROOT){
 const ref=loadReference(root);
 const locales=read("content/locales.json").map(l=>l.code);
 const findings=[];
 const add=(list,where)=>{for(const f of list)findings.push({...f,where:where+(f.where?"#"+f.where:"")});};
 const v=validateReference(ref);
 for(const e of v.errors)findings.push({level:"FAIL",code:"REFERENCE_INCONSISTENT",where:"data/business/reference.json",message:e});
 for(const w of v.warnings)findings.push({level:"WARN",code:"KNOWN_CONFLICT",where:"data/business/reference.json",message:w});
 if(ref){
  const want=JSON.stringify(localizeReference(ref,locales),null,2)+"\n";
  const p=path.join(root,LOCALIZED_PATH);
  if(!fs.existsSync(p)||fs.readFileSync(p,"utf8")!==want)findings.push({level:"FAIL",code:"LOCALIZED_REFERENCE_DRIFT",where:LOCALIZED_PATH,message:"Run node scripts/seo/fact-guard.mjs --write"});
 }
 // Live/generated pages: text, NAP display and business schema.
 for(const [key,html] of Object.entries(collectHtml(root)))add(scanHtml(html,{locale:localeOfPage(key),ref,where:""}),key);
 // Site copy and planning data: strict.
 const site=read("content/locales.json");
 for(const l of site)add(scanText(strings(l).join("\n\n"),{locale:l.code,mode:"strict",ref}),"content/locales.json["+l.code+"]");
 const matrix=read("data/seo/master-matrix.json");
 for(const r of matrix.rows)add(scanText([r.primary_query,r.working_title].join("\n\n"),{locale:r.locale,mode:"strict",ref}),"master-matrix:"+r.id);
 for(const rel of jsonFiles("data/seo/topical-authority").filter(f=>/\/[a-z]{2}\.json$/.test(f))){
  const data=read(rel);
  for(const p of data.proposals||[])add(scanText([p.primary_query,p.working_title,...(p.secondary_queries||[])].join("\n\n"),{locale:data.locale,mode:"strict",ref}),rel+":"+p.candidate_id);
 }
 // Approved articles: strict. Writer drafts and refill proposals: warn (wrong Nguyễn Tú facts still fail).
 for(const rel of jsonFiles("content/articles"))add(scanPacket(read(rel),"strict",ref),rel);
 for(const rel of jsonFiles("factory/external-writers/inbox"))add(scanPacket(read(rel),"warn",ref),rel);
 for(const rel of jsonFiles("factory/topic-refill/proposals")){
  const b=read(rel);
  for(const t of b.topics||[])add(scanText([t.primary_query,t.working_title].join("\n\n"),{locale:t.locale,mode:"warn",ref}),rel+":"+t.candidate_id);
 }
 return {findings,fail:findings.filter(f=>f.level==="FAIL").length,warn:findings.filter(f=>f.level==="WARN").length};
}

function main(){
 const args=new Set(process.argv.slice(2));
 for(const a of args)if(!["--write","--json"].includes(a))throw Error("Unknown option "+a);
 if(args.has("--write")){
  const ref=loadReference();
  const errors=validateReference(ref).errors;
  if(errors.length)throw Error("Reference inconsistent: "+errors.join("; "));
  const locales=read("content/locales.json").map(l=>l.code);
  fs.writeFileSync(path.join(ROOT,LOCALIZED_PATH),JSON.stringify(localizeReference(ref,locales),null,2)+"\n");
  console.log("LOCALIZED_REFERENCE_WRITTEN "+locales.length+" locales");
  return;
 }
 const r=runFactGuard();
 if(args.has("--json"))console.log(JSON.stringify(r,null,2));
 else{
  for(const f of r.findings)console[f.level==="FAIL"?"error":"log"](f.level+" "+f.code+" "+f.where+" — "+f.message+(f.excerpt?" «"+f.excerpt+"»":""));
  console.log((r.fail?"FACT_GUARD_FAILED ":"FACT_GUARD_PASS ✓ ")+JSON.stringify({fail:r.fail,warn:r.warn,mode:"READ_ONLY_ANTI_FABRICATION"}));
 }
 if(r.fail)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("FACT_GUARD_REFUSED "+e.message);process.exitCode=1;}
}
