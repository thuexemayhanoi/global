#!/usr/bin/env node
/**
 * Read-only live post-publish verification. Never runs on technical PR builds.
 * Fetches public HTML through GitHub Pages; no credentials or external AI APIs.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
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
export async function inspectProduction(fetcher=fetch,origin="https://global.rentbikehanoi.com",matrix,locales){
 const issues=[],evidence=[];
 const get=async (route,headers={})=>{
  let lastError;
  for(let i=0;i<3;i++){
   try{
    const response=await fetcher(origin+route,{headers,signal:AbortSignal.timeout(20000)});
    return{response,text:await response.text()};
   }catch(e){lastError=e;if(i<2)await new Promise(resolve=>setTimeout(resolve,1100*(i+1)));}
  }
  throw lastError;
 };
 for(const r of matrix.rows.filter(x=>x.status==="PUBLISHED")){
  try{
   const {response,text}=await get(r.url);
   const l=locales.find(x=>x.code===r.locale);
   if(response.status!==200)issues.push("Unexpected HTTP status "+response.status+" "+r.url);
   else issues.push(...inspectHTML(text,r.url,l?.htmlLang||null));
   evidence.push({route:r.url,http_status:response.status,bytes:Buffer.byteLength(text)});
  }catch(e){issues.push("Fetch failed "+r.url+": "+e.message)}
 }
 try{
  const {response,text}=await get("/search/");
  if(response.status!==200||!text.includes('name="robots" content="noindex,follow"'))issues.push("Search utility not deployed/noindex");
  evidence.push({route:"/search/",http_status:response.status,noindex:text.includes('noindex,follow')});
 }catch(e){issues.push("Search utility unavailable "+e.message)}
 try{
  const {response,text}=await get("/sitemap.xml");
  const entries=[...text.matchAll(/<loc>https:\/\/global\.rentbikehanoi\.com([^<]+)<\/loc>/g)].map(m=>m[1]);
  const urls=new Set(matrix.rows.filter(x=>x.status==="PUBLISHED").map(x=>x.url));
  if(response.status!==200||entries.length!==urls.size||entries.some(x=>!urls.has(x)))issues.push("Live sitemap does not match reviewed PUBLISHED Matrix");
  evidence.push({route:"/sitemap.xml",http_status:response.status,entries:entries.length});
 }catch(e){issues.push("Live sitemap unavailable "+e.message)}
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
 const report=await inspectProduction(fetch,"https://global.rentbikehanoi.com",matrix,locales);
 fs.mkdirSync(path.join(ROOT,"reports"),{recursive:true});
 fs.writeFileSync(path.join(ROOT,"reports/post-publish-qa.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({passed:report.passed,issues:report.issues,checked:report.evidence.length,report:"reports/post-publish-qa.json"},null,2));
 if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error("POST_PUBLISH_QA "+e.message);process.exitCode=1});
