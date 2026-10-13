#!/usr/bin/env node
/* Read-only AEO/GEO readiness checks. Does NOT predict inclusion in AI answers. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const pages=[];
for(const r of matrix.rows.filter(x=>x.status==="PUBLISHED")){
 const file=r.url==="/"? "index.html":r.url.slice(1)+"index.html";
 const html=read(file);
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||"";
 const head=main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"";
 const paras=[...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>x[1].replace(/<[^>]*>/g,"").trim());
 const structured=[...html.matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi)].map(x=>{try{return JSON.parse(x[1])}catch{return null}}).filter(Boolean);
 const signals={clear_h1:!!head,has_direct_summary:paras.some(p=>p.length>100),has_descriptive_title:html.includes("<title>"),schema_valid:structured.length>0,visible_faq:main.includes("<details"),has_citation_links:/<a\b[^>]*href="https?:\/\//i.test(main),has_article_dates:/<time\b|datePublished|dateModified/.test(html)};
 const gap=Object.entries(signals).filter(([key,value])=>!value).map(([key])=>key);
 pages.push({url:r.url,locale:r.locale,role:r.role,signals,opportunities:gap});
}
const out={generated_at:new Date().toISOString(),type:"static_aeo_geo_readiness",scope:"structural signals only",warning:"These checks do not measure AI search visibility or guarantee citations. Source quality and entity verification require research.",pages};
const idx=process.argv.indexOf("--out");if(idx!==-1){const p=process.argv[idx+1];if(!p||p.startsWith("/")||p.includes(".."))process.exit(2);fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(out,null,2)+"\n");}
console.log(JSON.stringify({pages:pages.length,pages_missing_source_links:pages.filter(p=>!p.signals.has_citation_links).length,schemas_valid:pages.filter(p=>p.signals.schema_valid).length,warning:out.warning},null,2));
