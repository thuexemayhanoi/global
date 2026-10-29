#!/usr/bin/env node
/**
 * Read-only health check of the outbound reference links cited on published pages (Matrix task TECH-05).
 * Collects every external https link inside <main> of each published page, fetches each unique URL once
 * (HEAD, falling back to GET when a server refuses HEAD) and classifies the answer. It never edits content
 * and never fails the build; it writes evidence for a reviewed fix PR:
 *   node scripts/seo/reference-link-check.mjs --confirm-live      (GitHub Actions: reference-link-check.yml)
 *   node scripts/seo/reference-link-check.mjs                     (offline: inventory only)
 * Only BROKEN (404/410 or a host that no longer resolves) is a defect to fix; BLOCKED (401/403/429/451),
 * SERVER_ERROR and NETWORK answers are often bot protection or geo-blocking and need a manual look first.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const SITE="https://global.rentbikehanoi.com";
const UA="Mozilla/5.0 (compatible; GlobalReferenceCheck/1.0; +https://global.rentbikehanoi.com/about/)";

/** External http(s) links inside <main>, without fragment, deduplicated, in page order. */
export function externalLinks(html){
 const main=String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||"";
 const out=[];
 for(const m of main.matchAll(/<a\b[^>]*\shref="(https?:\/\/[^"]+)"/gi)){
  const url=m[1].replace(/&amp;/g,"&").split("#")[0];
  if(!url.startsWith(SITE)&&!out.includes(url))out.push(url);
 }
 return out;
}

/** Class of one fetch result: {status} from the last answer, or {error} (Node fetch cause code). */
export function classify({status,error,finalUrl,url}){
 if(error)return /ENOTFOUND|ERR_INVALID_URL/.test(error)?"BROKEN":"NETWORK";
 if(status===404||status===410)return "BROKEN";
 if([401,403,429,451].includes(status))return "BLOCKED";
 if(status>=500)return "SERVER_ERROR";
 if(status>=200&&status<400){
  // A deep link that lands on the site's home page usually means the cited page was removed.
  try{const a=new URL(url),b=new URL(finalUrl||url);if(a.pathname.length>1&&b.pathname==="/"&&a.host.replace(/^www\./,"")===b.host.replace(/^www\./,""))return "SOFT_404_SUSPECT";}catch{}
  return "OK";
 }
 return "OTHER";
}

/** Published pages and the external links each cites. */
export function inventory(root=ROOT){
 const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8"));
 const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8"));
 const urls=[...new Set([...matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url),...locales.flatMap(l=>["/"+l.code+"/","/"+l.code+"/checklist/"]),"/about/","/contact/"])];
 const cited=new Map();
 for(const url of urls){
  const file=path.join(root,url.slice(1),"index.html");
  if(!fs.existsSync(file))continue;
  for(const link of externalLinks(fs.readFileSync(file,"utf8"))){if(!cited.has(link))cited.set(link,[]);cited.get(link).push(url);}
 }
 return {pages:urls.length,cited};
}

async function probe(url,fetcher){
 let last={url,status:0,error:"not tried"};
 for(let attempt=0;attempt<2;attempt++){
  for(const method of ["HEAD","GET"]){
   try{
    const r=await fetcher(url,{method,redirect:"follow",headers:{"user-agent":UA,"accept":"text/html,application/pdf,*/*"},signal:AbortSignal.timeout(25000)});
    if(method==="GET")await r.body?.cancel?.();
    last={url,status:r.status,finalUrl:r.url||url,method};
    // Some servers answer HEAD with an error but serve GET; only a GET answer is final for a failure.
    if(method==="HEAD"&&!(r.status>=200&&r.status<400))continue;
    break;
   }catch(e){last={url,error:String(e?.cause?.code||e?.name||e).slice(0,80),method};}
  }
  if(last.status&&last.status<500&&last.status!==429)break;
  await new Promise(r=>setTimeout(r,3000));
 }
 return {...last,class:classify(last)};
}

export async function checkAll(cited,fetcher=fetch,{concurrency=8,perHost=2}={}){
 const queue=[...cited.keys()],active=new Map(),results=[];
 const host=u=>{try{return new URL(u).host;}catch{return u;}};
 async function worker(){
  while(queue.length){
   const i=queue.findIndex(u=>(active.get(host(u))||0)<perHost);
   if(i<0){await new Promise(r=>setTimeout(r,200));continue;}
   const url=queue.splice(i,1)[0],h=host(url);
   active.set(h,(active.get(h)||0)+1);
   try{results.push({...await probe(url,fetcher),pages:cited.get(url)});}finally{active.set(h,active.get(h)-1);}
  }
 }
 await Promise.all(Array.from({length:concurrency},worker));
 return results.sort((a,b)=>a.url.localeCompare(b.url));
}

async function main(){
 const {pages,cited}=inventory();
 const live=process.argv.includes("--confirm-live");
 const report={generated:new Date().toISOString(),pages,unique_links:cited.size,hosts:new Set([...cited.keys()].map(u=>{try{return new URL(u).host;}catch{return u;}})).size,live};
 if(live){
  const results=await checkAll(cited);
  report.counts=results.reduce((a,r)=>(a[r.class]=(a[r.class]||0)+1,a),{});
  report.results=results;
  for(const cls of ["BROKEN","SOFT_404_SUSPECT","SERVER_ERROR","BLOCKED","NETWORK","OTHER"])
   for(const r of results.filter(x=>x.class===cls))console.log(cls,r.status||r.error,r.url,"->",r.finalUrl||"","| pages:",r.pages.length,r.pages.slice(0,6).join(" "));
 }
 fs.mkdirSync(path.join(ROOT,"reports"),{recursive:true});
 fs.writeFileSync(path.join(ROOT,"reports/reference-links.json"),JSON.stringify(report,null,1)+"\n");
 console.log("REFERENCE_LINK_CHECK",JSON.stringify({pages,unique_links:report.unique_links,hosts:report.hosts,live,counts:report.counts||null}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exit(1);});
