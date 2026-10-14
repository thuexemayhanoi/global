#!/usr/bin/env node
/**
 * SEO protection guard for live URLs.
 *   node scripts/seo/seo-guard.mjs            # check (default, CI)
 *   node scripts/seo/seo-guard.mjs --strict   # also fail on unfrozen new PUBLISHED URLs
 *   node scripts/seo/seo-guard.mjs --write    # re-freeze after a reviewed change
 *   node scripts/seo/seo-guard.mjs --add-new  # publisher: freeze only new PUBLISHED URLs, never re-freeze
 * Reads repository files only; never touches the network, Matrix, CNAME or pages.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {readLocalSitemapInventory} from "../sitemaps.mjs";
import {buildRegistry,checkGuard,addNewToRegistry} from "./seo-guard-core.mjs";
import {loadTopicalMap,proposalUrls} from "./topical-authority-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const REGISTRY="data/seo/url-freeze.json";
const SKIP=new Set([".git",".github","node_modules","reports","private-drafts","factory","content","data","docs","scripts","tests","examples","schemas","config"]);
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
export function collectHtml(root=ROOT){
 const files={};
 const walk=rel=>{
  for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){
   const r=rel?rel+"/"+e.name:e.name;
   if(e.isDirectory()){if(!SKIP.has(e.name))walk(r);}
   else if(e.name.endsWith(".html"))files[r]=fs.readFileSync(path.join(root,r),"utf8");
  }
 };
 walk("");
 return files;
}
function searchShards(){
 const dir=path.join(ROOT,"assets/search-index");
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir).filter(n=>n.endsWith(".json")).sort().map(n=>fs.readFileSync(path.join(dir,n),"utf8"));
}
function main(){
 const args=new Set(process.argv.slice(2));
 for(const a of args)if(!["--write","--add-new","--strict","--json"].includes(a))throw Error("Unknown option "+a);
 const matrix=JSON.parse(read("data/seo/master-matrix.json"));
 const locales=JSON.parse(read("content/locales.json"));
 const files=collectHtml();
 const previous=fs.existsSync(path.join(ROOT,REGISTRY))?JSON.parse(read(REGISTRY)):null;
 if(args.has("--write")){
  const registry=buildRegistry({matrix,locales,files,previous});
  fs.writeFileSync(path.join(ROOT,REGISTRY),JSON.stringify(registry,null,2)+"\n");
  console.log("URL_FREEZE_WRITTEN "+JSON.stringify({frozen:registry.frozen_count,retired:registry.retired.length,noindex_utilities:registry.noindex_utilities.length}));
  return;
 }
 if(!previous)throw Error(REGISTRY+" missing — run --write in a reviewed commit");
 const sitemapUrls=readLocalSitemapInventory(ROOT,locales.map(l=>l.code)).urls;
 const planned=[...matrix.rows.filter(r=>r.status!=="PUBLISHED").map(r=>r.url),...proposalUrls(loadTopicalMap(ROOT))];
 const findings=checkGuard({registry:previous,matrix,locales,files,sitemapUrls,
  cname:read("CNAME").trim(),robots:read("robots.txt"),planned,searchShards:searchShards()});
 if(args.has("--add-new")){
  const blocking=findings.filter(f=>f.level==="FAIL");
  if(blocking.length)throw Error("Refusing to freeze new URLs while checks fail: "+blocking.map(f=>f.code+" "+f.url).join(", "));
  const {registry,added}=addNewToRegistry({previous,matrix,locales,files});
  fs.writeFileSync(path.join(ROOT,REGISTRY),JSON.stringify(registry,null,2)+"\n");
  console.log("URL_FREEZE_ADDED "+JSON.stringify({added,frozen:registry.frozen_count}));
  return;
 }
 const fails=findings.filter(f=>f.level==="FAIL"||(args.has("--strict")&&f.code==="UNFROZEN_PUBLISHED_URL"));
 const summary={mode:"SEO_PROTECTION_GUARD_READ_ONLY",frozen_urls:previous.urls.length,published_urls:matrix.rows.filter(r=>r.status==="PUBLISHED").length,
  planned_urls_guarded:new Set(planned).size,html_scanned:Object.keys(files).length,fail:fails.length,warn:findings.length-fails.length};
 if(args.has("--json"))console.log(JSON.stringify({...summary,findings},null,2));
 else{
  for(const f of findings)console[f.level==="FAIL"?"error":"log"](f.level+" "+f.code+" "+f.url+" — "+f.message);
  console.log((fails.length?"SEO_GUARD_FAILED ":"SEO_GUARD_PASS ✓ ")+JSON.stringify(summary));
 }
 if(fails.length)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("SEO_GUARD_REFUSED "+e.message);process.exitCode=1;}
}
