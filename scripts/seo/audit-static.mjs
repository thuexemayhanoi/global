#!/usr/bin/env node
/**
 * Read-only static-site SEO audit. This audits repository HTML, not Google indexation,
 * keyword volumes, rankings, backlinks, or external server availability.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {readLocalSitemapInventory} from "../sitemaps.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const locales=JSON.parse(read("content/locales.json"));
const origin="https://global.rentbikehanoi.com";
const findings=[];
const issue=(priority,code,url,message,fix)=>findings.push({priority,code,url,message,recommendation:fix});
const published=matrix.rows.filter(r=>r.status==="PUBLISHED");
const idea=matrix.rows.filter(r=>r.status==="IDEA");
const canonicalFile=url=>url==="/"? "index.html":url.slice(1)+"index.html";
const publishedURLs=new Set(published.map(r=>r.url));
let sitemapURLs=[];
try{
 const sitemapInventory=readLocalSitemapInventory(root,locales.map(l=>l.code));
 sitemapURLs=sitemapInventory.urls.map(url=>origin+url);
}catch(e){issue("P0","SITEMAP_INDEX_INVALID","/sitemap.xml",e.message,"Regenerate all sitemap shards and index");}
const expectedCanonical=url=>origin+url;
const normalizedHref=(href,from)=>{
 try {const u=new URL(href,origin+from); return u.origin===origin?u.pathname:null;}catch{return null;}
};
const htmlText=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const first=(src,pattern)=>src.match(pattern)?.[1]?.trim()||"";
const metadata=[];
for(const row of published){
 const pathname=canonicalFile(row.url),abs=path.join(root,pathname);
 if(!fs.existsSync(abs)){issue("P0","MISSING_LIVE_HTML",row.url,"Matrix marks this page PUBLISHED but HTML is missing","Restore original page or correct state only after review");continue;}
 const html=fs.readFileSync(abs,"utf8");
 const title=first(html,/<title>([\s\S]*?)<\/title>/i);
 const desc=first(html,/<meta\s+name="description"\s+content="([^"]*)"/i);
 const lang=first(html,/<html\s+lang="([^"]+)"/i);
 const canonical=first(html,/<link\s+rel="canonical"\s+href="([^"]+)"/i);
 const h1=(html.match(/<h1\b[^>]*>/gi)||[]).length;
 const schemas=[...html.matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 metadata.push({url:row.url,locale:row.locale,title,description:desc,lang,canonical,h1,schema_blocks:schemas.length});
 if(!title)issue("P1","MISSING_TITLE",row.url,"No HTML title","Write a unique descriptive native-language title");
 if(!desc)issue("P2","MISSING_DESCRIPTION",row.url,"Missing meta description","Add concise natural-language summary");
 if(h1!==1)issue("P1","H1_COUNT",row.url,"Expected exactly one H1, found "+h1,"Use a unique visible H1");
 if(!lang)issue("P1","MISSING_LANGUAGE",row.url,"HTML lang is missing","Match the content language");
 const expectedLang=locales.find(x=>x.code===row.locale)?.htmlLang;
 if(expectedLang&&lang!==expectedLang)issue("P1","LANG_MISMATCH",row.url,"Expected "+expectedLang+", got "+lang,"Use real document language");
 if(canonical!==expectedCanonical(row.url))issue("P0","CANONICAL_DRIFT",row.url,"Canonical does not match its published URL","Preserve self-referencing canonical for this page");
 for(const [idx,json]of schemas.entries()){try{JSON.parse(json);}catch{issue("P1","SCHEMA_JSON_INVALID",row.url,"JSON-LD block "+(idx+1)+" cannot be parsed","Repair JSON-LD");}}
 if(!schemas.length)issue("P2","NO_JSONLD",row.url,"No structured data present","Consider WebPage/Article schema supported by the visible page");
 const hasAlternate=(html.match(/hreflang="/g)||[]).length;
 if(["PILLAR","SUPPORT"].includes(row.role)&&row.url.includes("checklist/")===false&&row.role==="PILLAR"&&hasAlternate===0)issue("P2","MISSING_HREFLANG",row.url,"Localized pillar has no alternate-language annotations","Add reciprocal hreflang only for equivalent pages");
 for(const match of html.matchAll(/href="([^"]+)"/gi)){
  const href=match[1];
  if(/^(?:mailto:|tel:|https?:|javascript:|data:|#)/i.test(href))continue;
  const target=normalizedHref(href,row.url);
  if(target===null)continue;
  if(target.startsWith("/assets/")){if(!fs.existsSync(path.join(root,target.slice(1))))issue("P1","MISSING_ASSET",row.url,"Referenced asset not found: "+target,"Restore the asset");continue;}
  if(!publishedURLs.has(target)&&target!=="/"&&!(target==="/search/"&&fs.existsSync(path.join(root,"search/index.html"))&&fs.readFileSync(path.join(root,"search/index.html"),"utf8").includes('name="robots" content="noindex,follow"'))){issue("P1","BROKEN_INTERNAL_LINK",row.url,"Internal link points outside published inventory: "+target,"Remove/repair this link before publishing");}
 }
}
for(const url of publishedURLs)if(!sitemapURLs.includes(expectedCanonical(url)))issue("P0","SITEMAP_MISSING_PUBLISHED",url,"Published URL missing from sitemap","Regenerate the sitemap");
for(const url of sitemapURLs)if(!publishedURLs.has(url.replace(origin,"")))issue("P0","SITEMAP_EXTRA",url,"Sitemap references a non-published URL","Remove until HTML is approved");
const titleMap=new Map(),queryMap=new Map();
for(const m of metadata){const key=m.locale+"::"+m.title.toLowerCase().trim();if(m.title){if(titleMap.has(key))issue("P1","DUPLICATE_TITLE",m.url,"Title duplicates "+titleMap.get(key),"Resolve intent ownership and title");else titleMap.set(key,m.url);}}
for(const r of matrix.rows.filter(r=>r.locale&&r.primary_query)){
 const key=r.locale+"::"+r.primary_query.toLowerCase().replace(/\s+/g," ").trim();
 if(queryMap.has(key))issue("P1","KEYWORD_OVERLAP_CANDIDATE",r.url,"Primary query duplicates "+queryMap.get(key),"Resolve cannibalization at Matrix level");else queryMap.set(key,r.url);
}
if(read("CNAME").trim()!=="global.rentbikehanoi.com")issue("P0","CNAME_CHANGED","/","CNAME is inconsistent","Restore approved production domain");
if(!read("robots.txt").includes(origin+"/sitemap.xml"))issue("P1","ROBOTS_SITEMAP","/robots.txt","robots.txt missing canonical sitemap location","Add sitemap directive");
const indexHtml=read("index.html");
for(const l of locales)if(!indexHtml.includes('href="/'+l.code+'/'))issue("P1","MISSING_LOCALE_NAV","/",l.code+" missing from selector","Restore language navigation");
const report={generated_at:new Date().toISOString(),site:origin,audit_type:"static_repository_read_only",observed:{published_pages:published.length,html_scanned:metadata.length,unpublished_ideas:idea.length,locales:locales.length,unique_published_urls:publishedURLs.size,sitemap_urls:sitemapURLs.length},limitations:["No Search Console, rankings, backlinks, real SERP volumes, external HTTP status or Core Web Vitals","Matrix IDEA rows are keyword hypotheses, not confirmed demand","A metadata check does not prove content is correct or indexed"],content_gaps:locales.map(l=>({locale:l.code,missing_planned_hubs:idea.filter(r=>r.locale===l.code&&r.role==="HUB").length,missing_planned_supporting:idea.filter(r=>r.locale===l.code&&r.role==="SUPPORT").length})),findings:findings.sort((a,b)=>["P0","P1","P2","P3"].indexOf(a.priority)-["P0","P1","P2","P3"].indexOf(b.priority)),severity_count:Object.fromEntries(["P0","P1","P2","P3"].map(p=>[p,findings.filter(i=>i.priority===p).length])),pages:metadata};
const outIndex=process.argv.indexOf("--out");
if(outIndex>=0){const out=process.argv[outIndex+1];if(!out||out.startsWith("/")||out.includes("..")){console.error("Output must be a local relative path");process.exit(2)}fs.mkdirSync(path.dirname(path.join(root,out)),{recursive:true});fs.writeFileSync(path.join(root,out),JSON.stringify(report,null,2)+"\n");}
console.log(JSON.stringify({summary:report.observed,severity_count:report.severity_count,report_file:outIndex>=0?process.argv[outIndex+1]:null,limitations:report.limitations},null,2));
if(process.argv.includes("--fail-p0")&&findings.some(f=>f.priority==="P0"))process.exitCode=1;
