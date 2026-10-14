#!/usr/bin/env node
/**
 * Full-pipeline scale benchmark (synthetic, never committed, never published).
 * Copies the repository to a temporary directory, publishes N synthetic
 * articles there (all 40 Hubs + Supporting rows under them), then times the
 * real build and every SEO gate. The working tree is not modified.
 *
 *   node scripts/bench/full-build-scale.mjs --articles 1000 [--keep]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>=0?process.argv[i+1]:d;};
const N=Number(arg("--articles","1000"));
if(!Number.isInteger(N)||N<40||N>40000)throw Error("--articles 40..40000");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"global-scale-"));
fs.cpSync(ROOT,dir,{recursive:true,filter:s=>!/[\\/](?:\.git|node_modules|reports)(?:[\\/]|$)/.test(s)});
const read=p=>JSON.parse(fs.readFileSync(path.join(dir,p),"utf8"));
const write=(p,v)=>fs.writeFileSync(path.join(dir,p),JSON.stringify(v,null,2)+"\n");
const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json");
const hubs=matrix.rows.filter(r=>r.role==="HUB");
const perHub=Math.max(0,Math.ceil((N-hubs.length)/hubs.length));
// Distinct pseudo-words per article so published-text overlap reflects real, non-templated content.
const word=(i,k)=>createHash("sha1").update(i+":"+k).digest("hex").slice(0,8).replace(/[0-9]/g,d=>"ghijklmnop"[d]);
const filler=(i,lang)=>Array.from({length:70},(_,k)=>Array.from({length:9},(_,w)=>word(i,k*9+w)).join(" ")+".").join("\n\n");
const article=(row,i)=>({matrix_id:row.id,locale:row.locale,proposed_url:row.url,
 title:"Benchmark article "+i+" "+row.locale+" synthetic title",meta_description:"Synthetic benchmark description number "+i+" for "+row.locale+" used only to measure static build and SEO gate throughput.",
 h1:"Benchmark article "+i+" heading",body_markdown:"## Part one\n\n"+filler(i,row.locale)+"\n\n## Part two\n\nMore text.\n\n## Part three\n\nEnd.",
 sources:[{url:"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",title:"WHO",checked_on:"2026-10-14"},{url:"https://www.gov.uk/foreign-travel-advice/vietnam",title:"FCDO",checked_on:"2026-10-14"}],
 serp_intent_checked:true,facts_reviewed_by_human:true,editorial_notes:"synthetic benchmark"});
fs.mkdirSync(path.join(dir,"content/articles"),{recursive:true});
let n=0;
for(const h of hubs){h.status="PUBLISHED";write("content/articles/"+h.id+".json",article(h,n++));}
const counters={};
for(const h of hubs)for(let k=0;k<perHub&&n<N;k++){
 const code=h.locale,U=code.toUpperCase();counters[code]=(counters[code]||100)+1;
 const id=U+"-S"+counters[code],row={id,locale:code,url:"/"+code+"/guides/bench-"+counters[code]+"/",role:"SUPPORT",cluster:h.cluster,parent_id:h.id,
  primary_query:"bench "+createHash("sha1").update(id).digest("hex").slice(0,14).replace(/[0-9]/g,d=>"ghijklmnop"[d]),working_title:"Benchmark topic "+counters[code]+" "+code,search_intent:"informational",status:"PUBLISHED",serp_evidence:"NOT_VALIDATED",source_verification:"NOT_STARTED",priority:90};
 matrix.rows.push(row);board.entries.push({id,writer:["W1","W2","W3"][n%3],url:row.url,locale:code,role:"SUPPORT",parent_id:h.id,cluster:h.cluster});
 write("content/articles/"+id+".json",article(row,n++));
}
write("data/seo/master-matrix.json",matrix);write("factory/external-writers/assignments.json",board);
const steps=[["build",["scripts/build.mjs"]],["build --check",["scripts/build.mjs","--check"]],["seo-guard --add-new",["scripts/seo/seo-guard.mjs","--add-new"]],
 ["seo-guard check",["scripts/seo/seo-guard.mjs"]],["fact-guard",["scripts/seo/fact-guard.mjs"]],["content-graph --write",["scripts/seo/content-graph.mjs","--write"]],
 ["validate-plan",["scripts/seo/validate-plan.mjs"]],["nav-qa",["scripts/nav-qa.mjs"]],["topical validate",["scripts/seo/topical-authority.mjs","validate"]],
 ["audit-static",["scripts/seo/audit-static.mjs","--fail-p0"]]];
const results=[];
for(const [name,argv] of steps){
 const t=process.hrtime.bigint();
 const r=spawnSync(process.execPath,argv,{cwd:dir,encoding:"utf8",maxBuffer:256*1024*1024,timeout:1800000});
 const ms=Number(process.hrtime.bigint()-t)/1e6;
 results.push({step:name,ms:Math.round(ms),ok:r.status===0,tail:r.status===0?undefined:(r.stderr||r.stdout).slice(-600)});
 if(r.status!==0&&name.startsWith("build"))break;
}
const size=p=>fs.existsSync(path.join(dir,p))?fs.statSync(path.join(dir,p)).size:0;
const html=fs.readdirSync(path.join(dir,"en/guides")).length;
const out={mode:"SYNTHETIC_FULL_PIPELINE_BENCHMARK",node:process.version,articles:n,supporting_per_hub:perHub,en_guides_dirs:html,
 published_urls:matrix.rows.filter(r=>r.status==="PUBLISHED").length,sitemap_en_bytes:size("sitemap-en.xml"),content_graph_bytes:size("data/seo/content-graph.json"),
 url_freeze_bytes:size("data/seo/url-freeze.json"),results,limits:"Synthetic text; measures generator and gate throughput only, not Core Web Vitals, crawl budget or ranking.",tmp:process.argv.includes("--keep")?dir:"removed"};
if(!process.argv.includes("--keep"))fs.rmSync(dir,{recursive:true,force:true});
console.log(JSON.stringify(out,null,2));
if(results.some(r=>!r.ok))process.exitCode=1;
