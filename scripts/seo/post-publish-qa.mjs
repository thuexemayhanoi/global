#!/usr/bin/env node
/**
 * Read-only live post-publish verification. Never runs on technical PR builds.
 * Fetches public HTML through GitHub Pages; no credentials or external AI APIs.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fetchSitemapInventory} from "../sitemaps.mjs";
import {fingerprint,FINGERPRINT_FIELDS} from "./seo-guard-core.mjs";
import {scanHtml} from "./fact-guard-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
export function inspectHTML(html,url,expectedLang=null){
 const errors=[];
 if(!/<html\s+lang="[^"]+"/i.test(html))errors.push("Missing html lang "+url);
 if(!/<h1[\s>]/i.test(html))errors.push("Missing real H1 "+url);
 if(!html.includes('<link rel="canonical" href="https://global.rentbikehanoi.com'+url+'">'))errors.push("Canonical mismatch "+url);
 if(expectedLang&&!html.includes('<html lang="'+expectedLang+'"'))errors.push("Wrong language "+url);
 if(!html.includes('data-nav-version="2"')||!html.includes('data-footer-version="2"'))errors.push("Shared navigation/footer missing "+url);
 if(!html.includes('href="/assets/premium.css"'))errors.push("Premium CSS missing "+url);
 if(url!=="/"&&!/<main\b[^>]*>[\s\S]*?<p\b/i.test(html))errors.push("No crawlable visible description "+url);
 return errors;
}
/**
 * `cacheBust` (e.g. "?qa=<timestamp>") is appended to every request so the CDN
 * serves the deployed origin copy rather than a cached one; GitHub Pages ignores
 * the query, and canonical/fingerprint checks read the HTML, not the request URL.
 */
export async function inspectProduction(fetcher=fetch,origin="https://global.rentbikehanoi.com",matrix,locales,registry=null,{cacheBust=""}={}){
 const frozen=new Map((registry?.urls||[]).map(u=>[u.url,u]));
 const issues=[],evidence=[];
 const getURL=async (url,headers={})=>{
  let lastError;
  for(let i=0;i<3;i++){
   try{
    const response=await fetcher(url,{headers,signal:AbortSignal.timeout(20000)});
    return{response,status:response.status,text:await response.text()};
   }catch(e){lastError=e;if(i<2)await new Promise(resolve=>setTimeout(resolve,1100*(i+1)));}
  }
  throw lastError;
 };
 const get=(route,headers={})=>getURL(origin+route+cacheBust,headers);
 for(const r of matrix.rows.filter(x=>x.status==="PUBLISHED")){
  try{
   const {response,text}=await get(r.url);
   const l=locales.find(x=>x.code===r.locale);
   if(response.status!==200)issues.push("Unexpected HTTP status "+response.status+" "+r.url);
   else{
    issues.push(...inspectHTML(text,r.url,l?.htmlLang||null));
    // Production must equal the reviewed, frozen SEO state (no repo↔live drift).
    const f=frozen.get(r.url);
    if(f){const live=fingerprint(text);for(const k of FINGERPRINT_FIELDS)if(JSON.stringify(live[k])!==JSON.stringify(f.fingerprint[k]))issues.push("Live SEO fingerprint drift "+r.url+": "+k);}
    else if(registry)issues.push("Live PUBLISHED URL is not frozen "+r.url);
    for(const x of scanHtml(text,{locale:r.locale,where:r.url}))if(x.level==="FAIL")issues.push("Live fact guard "+x.code+" "+r.url);
   }
   evidence.push({route:r.url,http_status:response.status,bytes:Buffer.byteLength(text),fingerprint_checked:frozen.has(r.url)});
  }catch(e){issues.push("Fetch failed "+r.url+": "+e.message)}
 }
 try{
  const {response,text}=await get("/search/");
  if(response.status!==200||!text.includes('name="robots" content="noindex,follow"'))issues.push("Search utility not deployed/noindex");
  evidence.push({route:"/search/",http_status:response.status,noindex:text.includes('noindex,follow')});
 }catch(e){issues.push("Search utility unavailable "+e.message)}
 try{
  // Same reader as the Auto Publisher's live QA: child names resolve to absolute same-origin URLs.
  const inv=await fetchSitemapInventory(url=>getURL(url),{origin,localeCodes:locales.map(l=>l.code),query:cacheBust});
  for(const [name,entries] of Object.entries(inv.byChild))evidence.push({route:"/"+name,http_status:200,entries:entries.length});
  const published=new Set(matrix.rows.filter(x=>x.status==="PUBLISHED").map(x=>x.url));
  if(inv.urls.length!==published.size||inv.urls.some(url=>!published.has(url)))issues.push("Live sitemap shards do not match reviewed PUBLISHED Matrix");
  evidence.push({route:"/sitemap.xml",http_status:200,sitemap_children:inv.children.length,published_urls:inv.urls.length});
 }catch(e){issues.push("Live sitemap index/shards invalid: "+e.message)}

 try{
  const {response,text}=await get("/robots.txt",{"User-Agent":"OAI-SearchBot"});
  if(response.status!==200||!/Sitemap:\s*https:\/\/global\.rentbikehanoi\.com\/sitemap\.xml/.test(text))issues.push("Live robots or sitemap directive invalid");
  if(/User-agent:\s*(?:GPTBot|OAI-SearchBot|ChatGPT-User)[\s\S]*?Disallow:\s*\//i.test(text))issues.push("AI crawler-specific disallow found; review crawler policy");
  evidence.push({route:"/robots.txt",http_status:response.status,allow_all:/User-agent:\s*\*[\s\S]*?Allow:\s*\//i.test(text)});
 }catch(e){issues.push("Live robots unavailable "+e.message)}
 try{
  const {response}=await get("/no-such-public-global-qa-404-20261014/");
  if(response.status!==404)issues.push("Unknown route did not respond HTTP 404; check GitHub Pages");
  evidence.push({route:"/no-such-public-global-qa-404-20261014/",http_status:response.status});
 }catch(e){issues.push("404 response unavailable "+e.message)}
 return{scope:"LIVE_HTTP_READ_ONLY",origin,checked_at:new Date().toISOString(),passed:issues.length===0,issues,evidence,limitations:["No Lighthouse/CrUX LCP, INP or CLS data","HTTP checks alone do not prove Google indexation or AI citations","Search page is deliberately noindex and excluded from sitemap"]};
}
async function cli(){
 if(!process.argv.includes("--confirm-live"))throw Error("Explicit --confirm-live is required; do not run on PR before approved Pages deployment");
 const matrix=JSON.parse(fs.readFileSync(path.join(ROOT,"data/seo/master-matrix.json"),"utf8"));
 const locales=JSON.parse(fs.readFileSync(path.join(ROOT,"content/locales.json"),"utf8"));
 const registry=JSON.parse(fs.readFileSync(path.join(ROOT,"data/seo/url-freeze.json"),"utf8"));
 const report=await inspectProduction(fetch,"https://global.rentbikehanoi.com",matrix,locales,registry,{cacheBust:"?qa="+Date.now()});
 fs.mkdirSync(path.join(ROOT,"reports"),{recursive:true});
 fs.writeFileSync(path.join(ROOT,"reports/post-publish-qa.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({passed:report.passed,issues:report.issues,checked:report.evidence.length,report:"reports/post-publish-qa.json"},null,2));
 if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error("POST_PUBLISH_QA "+e.message);process.exitCode=1});
