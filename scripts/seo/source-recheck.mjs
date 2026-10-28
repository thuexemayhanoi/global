#!/usr/bin/env node
/**
 * Read-only re-check of sourced third-party prices (fact-guard THIRD_PARTY_PRICE_REVIEW): for every article
 * paragraph that carries such a price, fetch the HTTPS sources cited inline in that paragraph and check whether
 * each cited amount still appears on the source page, parsed with the same amount extractor as the fact guard.
 * It never edits content, never generates text and never fails the build; it writes evidence:
 *   node scripts/seo/source-recheck.mjs --confirm-live [--ids=VI-S01,EN-S02]
 * Outcome per paragraph: VERIFIED (every amount found), PARTIAL, NOT_FOUND (page read, amounts absent),
 * UNREACHABLE (no source answered with readable HTML). A human or Writer acts on NOT_FOUND / PARTIAL.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {scanText,extractAmounts,paragraphs,sections,loadReference} from "./fact-guard-core.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const LINK=/\]\((https:\/\/[^)\s]+)\)/g;
const UA="Mozilla/5.0 (compatible; GlobalSourceRecheck/1.0; +https://global.rentbikehanoi.com/about/)";

/** Paragraphs of a packet that fact-guard flags THIRD_PARTY_PRICE_REVIEW, with their cited URLs and amount values. */
export function pricedParagraphs(packet,ref=loadReference()){
 const out=[];
 for(const section of sections(packet.body_markdown||""))for(const para of paragraphs(section)){
  const flags=scanText(para,{locale:packet.locale,mode:"warn",ref}).filter(f=>f.code==="THIRD_PARTY_PRICE_REVIEW");
  if(!flags.length)continue;
  const urls=[...new Set([...para.matchAll(LINK)].map(m=>m[1]))];
  const amounts=extractAmounts(para.replace(/\[([^\]]*)\]\([^)]*\)/g,"$1"),packet.locale);
  out.push({excerpt:para.slice(0,140),urls,amounts:[...new Set(amounts.flatMap(a=>a.values))],raw:amounts.map(a=>a.raw)});
 }
 return out;
}
const htmlText=html=>String(html).replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")
 .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g," ");
/** Amount values found on a source page, parsed for Vietnamese and the article's locale. */
export function sourceAmounts(text,locale){
 return new Set([...extractAmounts(text,"vi"),...extractAmounts(text,locale)].flatMap(a=>a.values));
}
export async function recheck(packets,fetcher=fetch,{concurrency=4}={}){
 const jobs=packets.map(p=>({id:p.matrix_id,locale:p.locale,paras:pricedParagraphs(p)})).filter(j=>j.paras.length);
 const urls=[...new Set(jobs.flatMap(j=>j.paras.flatMap(p=>p.urls)))],pages=new Map();
 let next=0;
 const worker=async()=>{while(next<urls.length){const url=urls[next++];
  try{const r=await fetcher(url,{headers:{"User-Agent":UA,"Accept":"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(25000),redirect:"follow"});
   const type=r.headers.get("content-type")||"",body=/html|text/i.test(type)?await r.text():"";
   pages.set(url,{status:r.status,text:r.status<400?htmlText(body):""});
  }catch(e){pages.set(url,{status:0,error:e.cause?.code||e.name||e.message,text:""});}}};
 await Promise.all(Array.from({length:Math.min(concurrency,urls.length)||1},worker));
 const results=jobs.map(j=>({id:j.id,paragraphs:j.paras.map(p=>{
  const read=p.urls.filter(u=>pages.get(u)?.text);
  const found=new Set(read.flatMap(u=>[...sourceAmounts(pages.get(u).text,j.locale)]));
  const hit=p.amounts.filter(v=>found.has(v));
  const outcome=!read.length?"UNREACHABLE":hit.length===p.amounts.length?"VERIFIED":hit.length?"PARTIAL":"NOT_FOUND";
  return {outcome,amounts:p.amounts,found:hit,sources:p.urls.map(u=>({url:u,status:pages.get(u)?.status??null,error:pages.get(u)?.error})),excerpt:p.excerpt};
 })}));
 const count=k=>results.reduce((n,r)=>n+r.paragraphs.filter(p=>p.outcome===k).length,0);
 return {scope:"SOURCE_RECHECK_READ_ONLY",checked_at:new Date().toISOString(),articles:results.length,urls:urls.length,
  paragraphs:{VERIFIED:count("VERIFIED"),PARTIAL:count("PARTIAL"),NOT_FOUND:count("NOT_FOUND"),UNREACHABLE:count("UNREACHABLE")},results,
  limitations:["An amount found on the page does not prove it is the same offer, date or vehicle","Sites that block automated requests show as UNREACHABLE","JavaScript-rendered prices are not read"]};
}
async function cli(){
 if(!process.argv.includes("--confirm-live"))throw Error("--confirm-live is required (fetches third-party sources)");
 const ids=new Set((process.argv.find(a=>a.startsWith("--ids="))?.slice(6)||"").split(",").filter(Boolean));
 const dir=path.join(ROOT,"content/articles");
 const packets=fs.readdirSync(dir).filter(f=>f.endsWith(".json")).sort().map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"))).filter(p=>!ids.size||ids.has(p.matrix_id));
 const report=await recheck(packets);
 fs.mkdirSync(path.join(ROOT,"reports"),{recursive:true});
 fs.writeFileSync(path.join(ROOT,"reports/source-recheck.json"),JSON.stringify(report,null,2)+"\n");
 for(const r of report.results)console.log("RECHECK "+JSON.stringify({id:r.id,p:r.paragraphs.map(p=>({o:p.outcome,a:p.amounts,f:p.found,s:p.sources.map(s=>s.status+(s.error?":"+s.error:"")+" "+s.url)}))}));
 console.log("SOURCE_RECHECK_SUMMARY "+JSON.stringify({articles:report.articles,urls:report.urls,paragraphs:report.paragraphs}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error("SOURCE_RECHECK "+e.message);process.exitCode=1;});
