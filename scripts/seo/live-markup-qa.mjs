#!/usr/bin/env node
/**
 * Read-only live markup verification. Fetches every PUBLISHED URL (plus "/search/" and "/404.html") from
 * GitHub Pages and compares each response byte for byte with the committed HTML, so every generated field
 * (schema properties, social tags, breadcrumbs, srcset) is proven live, not only the frozen fingerprint
 * that post-publish-qa.mjs checks. No credentials, no external AI APIs. Never runs on PR builds.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ORIGIN="https://global.rentbikehanoi.com";
export const localFile=route=>route==="/404.html"?"404.html":path.join(route.slice(1),"index.html");
/** First differing line between the live and the committed HTML, or null when they are identical. */
export function firstDifference(live,committed){
 if(live===committed)return null;
 const a=live.split("\n"),b=committed.split("\n"),n=Math.max(a.length,b.length);
 for(let i=0;i<n;i++)if(a[i]!==b[i])return{line:i+1,live:(a[i]??"").slice(0,200),committed:(b[i]??"").slice(0,200)};
 return{line:n,live:"",committed:""};
}
/** "/" first, then every PUBLISHED URL in Matrix order, then the two non-indexed utilities; `limit` keeps a prefix. */
export function routesToCheck(matrix,limit=0){
 const routes=["/",...matrix.rows.filter(r=>r.status==="PUBLISHED"&&r.url!=="/").map(r=>r.url),"/search/","/404.html"];
 return limit>0?routes.slice(0,limit):routes;
}
/**
 * `cacheBust` (e.g. "?qa=<timestamp>") makes the CDN serve the deployed origin copy; GitHub Pages ignores the query.
 * Every route is fetched at most three times: a network error or a 5xx answer (GitHub Pages returns a transient 503 while a
 * deployment propagates) is retried with a short delay; a route that never answers or keeps failing is reported, never skipped.
 */
export async function compareLiveMarkup(fetcher,routes,{origin=ORIGIN,root=ROOT,cacheBust="",concurrency=6}={}){
 const results=[];
 const getText=async url=>{
  let last;
  for(let i=0;i<3;i++){
   try{
    const r=await fetcher(url,{signal:AbortSignal.timeout(20000)}),out={status:r.status,text:await r.text()};
    if(r.status<500||i===2)return out;
    last=out;
   }catch(e){last=e;if(i===2)throw e;}
   await new Promise(res=>setTimeout(res,1100*(i+1)));
  }
  if(last instanceof Error)throw last;
  return last;
 };
 let next=0;
 const worker=async()=>{
  while(next<routes.length){
   const route=routes[next++],file=path.join(root,localFile(route));
   const committed=fs.existsSync(file)?fs.readFileSync(file,"utf8"):null;
   try{
    const {status,text}=await getText(origin+route+cacheBust);
    const diff=committed===null?{line:0,live:"",committed:"(no committed file)"}:firstDifference(text,committed);
    results.push({route,http_status:status,bytes:Buffer.byteLength(text),identical:status===200&&diff===null,...(diff?{diff}:{})});
   }catch(e){results.push({route,http_status:0,identical:false,error:e.message});}
  }
 };
 await Promise.all(Array.from({length:Math.max(1,Math.min(concurrency,routes.length))},worker));
 results.sort((a,b)=>routes.indexOf(a.route)-routes.indexOf(b.route));
 const mismatched=results.filter(r=>!r.identical);
 return{scope:"LIVE_HTTP_READ_ONLY_BYTE_COMPARE",origin,checked_at:new Date().toISOString(),passed:mismatched.length===0,checked:results.length,identical:results.length-mismatched.length,mismatched,results,
  limitations:["Proves that production serves the committed HTML; it does not measure indexing, rankings or Core Web Vitals"]};
}
async function cli(){
 if(!process.argv.includes("--confirm-live"))throw Error("Explicit --confirm-live is required; do not run on PR before approved Pages deployment");
 const limit=Number((process.argv.find(a=>a.startsWith("--limit="))||"--limit=0").slice(8))||0;
 const matrix=JSON.parse(fs.readFileSync(path.join(ROOT,"data/seo/master-matrix.json"),"utf8"));
 const report=await compareLiveMarkup(fetch,routesToCheck(matrix,limit),{cacheBust:"?qa="+Date.now()});
 fs.mkdirSync(path.join(ROOT,"reports"),{recursive:true});
 fs.writeFileSync(path.join(ROOT,"reports/live-markup-qa.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({passed:report.passed,checked:report.checked,identical:report.identical,mismatched:report.mismatched.map(m=>({route:m.route,http_status:m.http_status,line:m.diff?.line,live:m.diff?.live,committed:m.diff?.committed,error:m.error}))},null,2));
 if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error("LIVE_MARKUP_QA "+e.message);process.exitCode=1});
