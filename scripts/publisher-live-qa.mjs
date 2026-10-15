/**
 * Post-deploy live HTTP QA for Auto Publisher runs. Network access only through an
 * injected fetcher, so tests run offline. Every problem is classified:
 *   SITE     production served something wrong (HTTP status, HTML, sitemap content)
 *   NETWORK  the request itself failed (DNS, TLS, reset, timeout)
 *   TOOL     the QA code could not build a valid request, or crashed
 * Verdict: PASS (no issue) · FAIL (at least one SITE issue) · INCONCLUSIVE (only
 * NETWORK/TOOL issues). Only FAIL justifies reverting a publication; INCONCLUSIVE
 * pauses the publisher without touching production, so a defect in this tool can
 * never roll back correct pages again (run 38668639207 did exactly that).
 */
import {inspectHTML} from "./seo/post-publish-qa.mjs";
import {fetchSitemapInventory,SITEMAP_ORIGIN} from "./sitemaps.mjs";

export const VERDICTS=["PASS","FAIL","INCONCLUSIVE"];
const tag=(kind,message)=>Object.assign(Error(message),{kind});
const escapeHTML=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;

/** Absolute same-origin URL for a published route such as /nl/topics/x/. */
export function pageURL(route,origin=SITEMAP_ORIGIN){
 const base=new URL(origin);
 if(typeof route!=="string"||!ROUTE.test(route))throw tag("TOOL","Invalid page route "+route);
 const url=new URL(route,base.origin);
 if(url.origin!==base.origin)throw tag("TOOL","Route escapes origin "+route);
 return url.href;
}
export function liveVerdict(issues){
 if(!issues.length)return "PASS";
 return issues.some(i=>i.kind==="SITE")?"FAIL":"INCONCLUSIVE";
}
const issueOf=(scope,e)=>({kind:["SITE","NETWORK","TOOL"].includes(e?.kind)?e.kind:"TOOL",scope,detail:String(e?.message||e).slice(0,300)});

/**
 * One pass over the new pages, then (only if they pass) the live sitemap index and
 * every shard. `targets`: [{id,url,title,lang}].
 */
export async function liveCheckOnce({targets,origin=SITEMAP_ORIGIN,localeCodes,fetcher,stamp=Date.now()}){
 const issues=[],query="?qa="+stamp,base=new URL(origin);
 const get=async url=>{
  let parsed;
  try{parsed=new URL(url);}catch{throw tag("TOOL","QA built an invalid URL: "+url);}
  if(parsed.origin!==base.origin)throw tag("TOOL","QA URL outside the production origin: "+url);
  let response;
  try{response=await fetcher(parsed.href,{headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(20000)});}
  catch(e){throw tag("NETWORK","fetch "+parsed.pathname+" failed: "+(e?.cause?.code||e?.message||e));}
  let text;
  try{text=await response.text();}catch(e){throw tag("NETWORK","read "+parsed.pathname+" failed: "+(e?.message||e));}
  return {status:response.status,text,robots:response.headers?.get?.("x-robots-tag")||""};
 };
 const site=(scope,detail)=>({kind:"SITE",scope,detail});
 for(const t of targets){
  try{
   const {status,text,robots}=await get(pageURL(t.url,origin)+query);
   if(status!==200){issues.push(site(t.id,"HTTP "+status+" "+t.url));continue;}
   for(const e of inspectHTML(text,t.url,t.lang))issues.push(site(t.id,e));
   if(!text.includes("<title>"+escapeHTML(t.title)+"</title>"))issues.push(site(t.id,"title mismatch"));
   if(/name="robots" content="[^"]*noindex/i.test(text)||/noindex/i.test(robots))issues.push(site(t.id,"unexpected noindex"));
   if(!text.includes('class="article-provenance"'))issues.push(site(t.id,"AI provenance note missing"));
  }catch(e){issues.push(issueOf(t.id,e));}
 }
 let sitemap=null;
 if(!issues.length){
  try{
   const inv=await fetchSitemapInventory(get,{origin,localeCodes,query});
   sitemap={children:inv.children.length,urls:inv.urls.length};
   for(const t of targets)if(!inv.urls.includes(t.url))issues.push(site(t.id,"not in live sitemap "+t.url));
  }catch(e){issues.push(issueOf("sitemap",e));}
 }
 return {issues,sitemap};
}

/**
 * Poll until PASS or timeout. Deployment lag and CDN staleness show up as SITE
 * issues that clear on a later pass; a TOOL-only result cannot improve by waiting,
 * so it ends the loop at once as INCONCLUSIVE.
 */
export async function runLiveQA({targets,origin=SITEMAP_ORIGIN,localeCodes,fetcher,timeoutMs=1200000,intervalMs=20000,
 clock=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const started=clock();
 let attempts=0,last={issues:[],sitemap:null};
 for(;;){
  attempts++;
  last=await liveCheckOnce({targets,origin,localeCodes,fetcher,stamp:clock()});
  if(!last.issues.length)break;
  if(!last.issues.some(i=>i.kind==="SITE")&&last.issues.some(i=>i.kind==="TOOL"))break;
  if(clock()-started+intervalMs>timeoutMs)break;
  await sleep(intervalMs);
 }
 return {verdict:liveVerdict(last.issues),issues:last.issues,sitemap:last.sitemap,attempts,seconds:Math.round((clock()-started)/1000)};
}
