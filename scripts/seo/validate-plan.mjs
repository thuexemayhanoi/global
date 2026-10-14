#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {readLocalSitemapInventory} from "../sitemaps.mjs";
import {loadTopicalMap,similarity,SIMILARITY_FAIL} from "./topical-authority-core.mjs";
const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8"));
const taxonomy=JSON.parse(fs.readFileSync(path.join(root,"data/seo/taxonomy.json"),"utf8"));
const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8")).map(l=>l.code);
const errors=[];
const err=m=>errors.push(m);
if(matrix.base_url!=="https://global.rentbikehanoi.com")err("Base URL changed unexpectedly");
if(JSON.stringify(matrix.locales)!==JSON.stringify(locales))err("Locale list differs from live site");
const ids=new Map(),urls=new Set(),queries=new Set();
const allowStatus=new Set(taxonomy.states),allowRole=new Set(taxonomy.roles);
for(const r of matrix.rows){
 if(!r.id||ids.has(r.id))err("Duplicate/missing ID "+r.id);else ids.set(r.id,r);
 if(!r.url||urls.has(r.url))err("Duplicate/missing URL "+r.url);else urls.add(r.url);
 if(!/^\/[a-zA-Z0-9\/_-]*$/.test(r.url))err("Unsafe URL "+r.url);
 if(!allowStatus.has(r.status))err("Invalid status "+r.id);
 if(!allowRole.has(r.role))err("Invalid role "+r.id);
 if(!r.primary_query?.trim()||!r.working_title?.trim())err("Missing query or title "+r.id);
 const searchKey=r.locale+"::"+r.primary_query?.toLowerCase().trim();
 if(queries.has(searchKey))err("Query cannibalization candidate "+r.id);else queries.add(searchKey);
 const globalUtility=r.role==="UTILITY"&&r.parent_id==="ROOT"&&r.locale==="en";
 if(r.id!=="ROOT"&&!globalUtility&&!r.url.startsWith("/"+r.locale+"/"))err("Locale path mismatch "+r.id);
 if(r.status==="IDEA"&&(r.serp_evidence!=="NOT_VALIDATED"||r.source_verification!=="NOT_STARTED"))err("Unverified keyword claims "+r.id);
}
for(const r of matrix.rows){
 if(r.parent_id){const p=ids.get(r.parent_id);if(!p)err("Unknown parent "+r.id);else if(p.locale!==r.locale&&p.id!=="ROOT")err("Cross-language parent "+r.id)}
 if(r.role==="HUB"&&r.parent_id!==r.locale.toUpperCase()+"-HOME")err("Hub parent mismatch "+r.id);
 if(r.role==="SUPPORT"&&r.status==="IDEA"&&!ids.get(r.parent_id)?.id?.endsWith("H"+r.parent_id?.slice(-2)))err("Support parent mismatch "+r.id);
}
// Pre-claim duplicate gate: an unjustified high intent overlap between two
// Hub/Supporting rows must be resolved before any Writer can claim either one.
const topical=loadTopicalMap(root);
for(const l of matrix.locales){
 const rs=matrix.rows.filter(r=>r.locale===l&&(r.role==="HUB"||r.role==="SUPPORT")),stop=topical.locales[l]?.stop_tokens||[];
 for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){
  const a=rs[i],b=rs[j];
  if(a.parent_id===b.id||b.parent_id===a.id)continue;
  const justified=[...(a.distinct_from||[]),...(b.distinct_from||[])].some(d=>[a.id,b.id].includes(d?.id)&&String(d?.reason||"").length>=40);
  const score=similarity(a.primary_query,b.primary_query,l,stop);
  if(score>=SIMILARITY_FAIL&&!justified)err("Cannibalization candidate "+a.id+" vs "+b.id+" (overlap "+score.toFixed(2)+"): merge, re-scope or add distinct_from before any Writer claim");
 }
}
let sitemapInventory={urls:[]};
try{sitemapInventory=readLocalSitemapInventory(root,locales);}
catch(e){err("Sitemap index or locale shard invalid: "+e.message);}
const indexed=new Set(sitemapInventory.urls);
const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url));
for(const u of published)if(!indexed.has(u))err("Published URL absent from sitemap "+u);
for(const u of indexed)if(!published.has(u))err("Unmapped sitemap URL "+u);
for(const r of matrix.rows.filter(r=>r.status==="IDEA"))if(indexed.has(r.url))err("IDEA indexed without approval "+r.id);
for(const r of matrix.rows.filter(r=>r.status==="PUBLISHED")){
 const p=path.join(root,r.url===" / "?"index.html":r.url.slice(1),"index.html");
 const full=r.url==="/"?path.join(root,"index.html"):path.join(root,r.url.slice(1),"index.html");
 if(!fs.existsSync(full))err("PUBLISHED page not found "+r.url);
}
const group=Object.fromEntries(matrix.locales.map(l=>[l,{published:0,ideas:0}]));
for(const r of matrix.rows)if(group[r.locale])group[r.locale][r.status==="PUBLISHED"?"published":"ideas"]++;
if(matrix.rows.length<145)err("Unexpected matrix inventory count "+matrix.rows.length);
if(published.size<25)err("Unexpected published inventory count "+published.size);
if(errors.length){for(const e of errors)console.error("FAIL:",e);process.exit(1)}
console.log("SEO MATRIX VALID ✓",JSON.stringify({rows:matrix.rows.length,published:published.size,planned:matrix.rows.length-published.size,group},null,2));