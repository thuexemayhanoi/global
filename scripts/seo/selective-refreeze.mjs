#!/usr/bin/env node
/**
 * Selective re-freeze for a reviewed fingerprint change: never a blanket `seo-guard --write`.
 *   node scripts/seo/selective-refreeze.mjs --schema-add=FAQPage
 *   node scripts/seo/selective-refreeze.mjs --changes=docs/seo-audit/execution/metadata-batch-01.json
 * --schema-add: a frozen URL's top-level JSON-LD types may only GAIN the listed types.
 * --changes:    a JSON array of {url, field, before, after} (field: title | description | h1); the rendered value must
 *               equal `after` and the frozen value must equal `before`.
 * --robots:     a frozen URL with the default robots (no meta) may gain exactly this robots value, e.g.
 *               --robots=max-image-preview:large; a value with noindex, nofollow or none is refused.
 * Every other fingerprint field of every frozen URL must already match the build, otherwise nothing is written.
 * Content snapshots (H2 outline, main-text size), retirements and utilities are never changed.
 * Requires a named feature branch; refuses on main.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {collectHtml} from "./seo-guard.mjs";
import {fingerprint,pageFile,FINGERPRINT_FIELDS} from "./seo-guard-core.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const REGISTRY="data/seo/url-freeze.json";
const CHANGE_FIELDS=new Set(["title","description","h1"]);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Pure: returns {registry, changed:[{url,field}], errors}. */
export function selectiveRefreeze(previous,files,{schemaAdd=[],changes=[],robots=null}={}){
 const out=structuredClone(previous),errors=[],changed=[];
 if(robots&&/noindex|nofollow|\bnone\b/i.test(robots))errors.push("robots value may not restrict indexing: "+robots);
 const add=new Set(schemaAdd),byUrl=new Map();
 for(const c of changes){
  if(!CHANGE_FIELDS.has(c?.field)||typeof c.url!=="string"||typeof c.before!=="string"||typeof c.after!=="string"){errors.push("invalid change "+JSON.stringify(c));continue;}
  const key=c.url+"|"+c.field;
  if(byUrl.has(key))errors.push("duplicate change "+key);
  byUrl.set(key,c);
 }
 const frozen=new Set(out.urls.map(u=>u.url));
 for(const c of byUrl.values())if(!frozen.has(c.url))errors.push("change targets an unfrozen URL "+c.url);
 for(const item of out.urls){
  const html=files[pageFile(item.url)];
  if(typeof html!=="string"){errors.push("missing frozen HTML "+item.url);continue;}
  const fp=fingerprint(html);
  for(const field of FINGERPRINT_FIELDS){
   const was=item.fingerprint[field],now=fp[field],c=byUrl.get(item.url+"|"+field);
   if(c){
    if(was===c.after&&now===c.after)continue; // already re-frozen by an earlier run of the same change set
    if(was!==c.before)errors.push(item.url+": frozen "+field+" is not the reviewed before-value");
    else if(now!==c.after)errors.push(item.url+": rendered "+field+" is not the reviewed after-value");
    else{item.fingerprint[field]=c.after;changed.push({url:item.url,field});}
    continue;
   }
   if(equal(was,now))continue;
   if(field==="robots"&&robots&&was==="index,follow (default)"&&now===robots&&!/noindex|nofollow|\bnone\b/i.test(robots)){item.fingerprint[field]=now;changed.push({url:item.url,field});continue;}
   if(field==="schema_types"&&add.size&&Array.isArray(was)&&Array.isArray(now)){
    const gained=now.filter(t=>!was.includes(t)),lost=was.filter(t=>!now.includes(t));
    if(!lost.length&&gained.length&&gained.every(t=>add.has(t))){item.fingerprint[field]=now;changed.push({url:item.url,field,gained});continue;}
   }
   errors.push(item.url+": unauthorized fingerprint change "+field+" "+JSON.stringify(was)+" → "+JSON.stringify(now));
  }
 }
 return {registry:out,changed,errors};
}

function main(argv){
 const branch=execFileSync("git",["branch","--show-current"],{cwd:ROOT,encoding:"utf8"}).trim();
 if(!branch||branch==="main"||branch==="master")throw Error("selective re-freeze requires a named feature branch");
 const schemaAdd=(argv.find(a=>a.startsWith("--schema-add="))?.slice(13)||"").split(",").filter(Boolean);
 const changesFile=argv.find(a=>a.startsWith("--changes="))?.slice(10);
 const changes=changesFile?JSON.parse(fs.readFileSync(path.join(ROOT,changesFile),"utf8")):[];
 const robots=argv.find(a=>a.startsWith("--robots="))?.slice(9)||null;
 if(!schemaAdd.length&&!changes.length&&!robots)throw Error("usage: selective-refreeze.mjs [--schema-add=Type,...] [--changes=file.json] [--robots=value]");
 const previous=JSON.parse(fs.readFileSync(path.join(ROOT,REGISTRY),"utf8"));
 const {registry,changed,errors}=selectiveRefreeze(previous,collectHtml(ROOT),{schemaAdd,changes,robots});
 if(errors.length)throw Error(errors.slice(0,20).join("\n")+(errors.length>20?"\n… "+(errors.length-20)+" more":""));
 fs.writeFileSync(path.join(ROOT,REGISTRY),JSON.stringify(registry,null,2)+"\n");
 const byField={};for(const c of changed)byField[c.field]=(byField[c.field]||0)+1;
 console.log("SELECTIVE_REFREEZE_WRITTEN "+JSON.stringify({urls:new Set(changed.map(c=>c.url)).size,fields:byField,schema_add:schemaAdd,robots}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2));}catch(e){console.error("SELECTIVE_REFREEZE_REFUSED "+e.message);process.exitCode=1;}
}
