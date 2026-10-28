/**
 * Deterministic, multilingual XML sitemap generator and inventory verifier.
 *
 * sitemap.xml is an INDEX; sitemap-main.xml contains root/utility pages.
 * Each supported locale owns sitemap-<locale>.xml, with numbered shards when
 * a locale exceeds the conservative 40,000 URLs / 40 MiB per-file cap.
 * Only actual generated index.html pages are admitted by the caller.
 */
import fs from "node:fs";
import path from "node:path";

export const SITEMAP_ORIGIN="https://global.rentbikehanoi.com";
export const SITEMAP_LIMIT=40000;
export const SITEMAP_MAX_BYTES=40*1024*1024;
// One child-name grammar for every reader: sitemap-main.xml, sitemap-<ll>.xml, sitemap-<ll>-<n>.xml (n ≥ 2).
export const SITEMAP_CHILD=/^sitemap-(main|[a-z]{2})(?:-(?:[2-9]|[1-9][0-9]+))?\.xml$/;
// The same grammar restricted to the configured locales: the set of root files the build owns and may delete when stale.
export const sitemapFilePattern=codes=>new RegExp("^sitemap-(?:main|"+codes.map(c=>c.replace(/[^a-z]/g,"")).join("|")+")(?:-(?:[2-9]|[1-9][0-9]+))?\\.xml$");
const NS="http://www.sitemaps.org/schemas/sitemap/0.9";
const XML_HEAD='<?xml version="1.0" encoding="UTF-8"?>\n';
const escapeXML=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const decodeXML=s=>s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
// <lastmod> only when the caller knows a real dated event for the URL (W3C date); never invented.
const LASTMOD=/^\d{4}-\d{2}-\d{2}$/;
const urlEntry=(url,lastmod)=>"<url><loc>"+escapeXML(url)+"</loc>"+(lastmod?"<lastmod>"+lastmod+"</lastmod>":"")+"</url>";
const urlset=(urls,lastmod=new Map())=>XML_HEAD+'<urlset xmlns="'+NS+'">\n'+urls.map(url=>urlEntry(url,lastmod.get(url))).join("\n")+'\n</urlset>\n';
const indexXml=children=>XML_HEAD+'<sitemapindex xmlns="'+NS+'">\n'+children.map(name=>"<sitemap><loc>"+escapeXML(SITEMAP_ORIGIN+"/"+name)+"</loc></sitemap>").join("\n")+'\n</sitemapindex>\n';

export function htmlKeyToURL(key,origin=SITEMAP_ORIGIN){
 if(!/^(?:index\.html|[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/index\.html)$/.test(key))throw Error("Invalid sitemap HTML key "+key);
 return origin+"/"+(key==="index.html"?"":key.slice(0,-10));
}

function splitShards(urls,lastmod=new Map()){
 const shards=[],headBytes=Buffer.byteLength(XML_HEAD+'<urlset xmlns="'+NS+'">\n</urlset>\n');
 let current=[],bytes=headBytes;
 for(const url of urls){
  const increment=Buffer.byteLength(urlEntry(url,lastmod.get(url))+"\n");
  if(increment+headBytes>SITEMAP_MAX_BYTES)throw Error("Individual URL too long for sitemap");
  if(current.length&&(current.length>=SITEMAP_LIMIT||bytes+increment>SITEMAP_MAX_BYTES)){
   shards.push(current);current=[];bytes=headBytes;
  }
  current.push(url);bytes+=increment;
 }
 if(current.length)shards.push(current);
 return shards;
}
/**
 * <lastmod> from real dated events only: an article's recorded publication approval and, for a Hub, the latest
 * publication among itself and its PUBLISHED children (its "Guides in this topic" list changed then). Pages
 * without a recorded date (Pillars, checklists, utilities) get no lastmod rather than an invented one.
 */
export function publicationLastmod(root,matrix){
 const lastmod=new Map(),rowById=new Map(matrix.rows.map(r=>[r.id,r]));
 const bump=(row,date)=>{const u=SITEMAP_ORIGIN+row.url;if(!lastmod.has(u)||lastmod.get(u)<date)lastmod.set(u,date);};
 const dir=path.join(root,"content/articles");
 for(const f of fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>n.endsWith(".json")).sort():[]){
  const p=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")),row=rowById.get(p.matrix_id);
  const date=String(p.publication?.approved_at||"").slice(0,10);
  if(!row||row.status!=="PUBLISHED"||!LASTMOD.test(date))continue;
  bump(row,date);
  const parent=rowById.get(row.parent_id);
  if(row.role==="SUPPORT"&&parent?.role==="HUB"&&parent.status==="PUBLISHED")bump(parent,date);
 }
 return lastmod;
}
/**
 * Reviewed content updates of pages without an article packet (locale Pillars, checklists), recorded with their real
 * date and evidence in data/seo/page-updates.json. Returns url -> {published, modified}; refuses malformed entries.
 */
export function reviewedPageDates(root){
 const file=path.join(root,"data/seo/page-updates.json");
 if(!fs.existsSync(file))return new Map();
 const out=new Map();
 for(const [url,e] of Object.entries(JSON.parse(fs.readFileSync(file,"utf8")).pages||{})){
  const dates=[e.published,...(e.updates||[]).map(u=>u.date)];
  if(!/^\/[a-z0-9\/-]*\/$/.test(url)||dates.some(d=>!LASTMOD.test(String(d)))||!String(e.published_evidence||"").trim()||(e.updates||[]).some(u=>String(u.evidence||"").trim().length<10))
   throw Error("Invalid page-updates entry for "+url);
  out.set(url,{published:e.published,modified:dates.slice().sort().pop()});
 }
 return out;
}
/** Every real <lastmod>: article publications (and their Hubs) plus reviewed Pillar/checklist changes. */
export function siteLastmod(root,matrix){
 const lastmod=publicationLastmod(root,matrix);
 for(const [p,d] of reviewedPageDates(root)){const u=SITEMAP_ORIGIN+p;if(!lastmod.has(u)||lastmod.get(u)<d.modified)lastmod.set(u,d.modified);}
 return lastmod;
}
export function generateSitemaps(pageKeys,localeCodes,origin=SITEMAP_ORIGIN,lastmod=new Map()){
 if(origin!==SITEMAP_ORIGIN)throw Error("Unexpected sitemap origin");
 for(const [url,date]of lastmod)if(!LASTMOD.test(String(date)))throw Error("Invalid lastmod "+date+" for "+url);
 if(!Array.isArray(localeCodes)||new Set(localeCodes).size!==localeCodes.length||localeCodes.some(code=>!/^[a-z]{2}$/.test(code)))throw Error("Invalid locale codes");
 const groups=new Map([["main",[]],...localeCodes.map(code=>[code,[]])]);
 const seen=new Set();
 for(const key of pageKeys){
  if(key==="search/index.html")throw Error("Noindex search may not enter sitemaps");
  const absolute=htmlKeyToURL(key,origin);
  if(seen.has(absolute))throw Error("Duplicate sitemap URL "+absolute);
  seen.add(absolute);
  const pathname=absolute.slice(origin.length);
  const code=pathname.split("/")[1];
  const group=groups.has(code)?code:"main";
  groups.get(group).push(absolute);
 }
 const files={},children=[];
 for(const [group,items]of groups){
  for(const [index,urls]of splitShards(items.sort(),lastmod).entries()){
   const name="sitemap-"+group+(index?"-"+(index+1):"")+".xml";
   files[name]=urlset(urls,lastmod);
   children.push(name);
  }
 }
 if(!children.length)throw Error("Cannot generate empty sitemap index");
 files["sitemap.xml"]=indexXml(children);
 return files;
}
function xmlLocs(xml){
 const elements=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>decodeXML(match[1]));
 if(elements.length!==(xml.match(/<loc>/g)||[]).length)throw Error("Malformed <loc> elements");
 return elements;
}
function safeURL(raw,origin){
 let u;
 try{u=new URL(raw);}catch{throw Error("Invalid absolute URL "+raw);}
 if(u.origin!==origin||u.search||u.hash||u.username||u.password)throw Error("Noncanonical sitemap URL "+raw);
 if(raw!==origin+u.pathname)throw Error("Noncanonical URL serialization "+raw);
 return u.pathname;
}
export function parseSitemapIndex(xml,origin=SITEMAP_ORIGIN){
 if(!xml.includes('<sitemapindex xmlns="'+NS+'">')||xml.includes("<urlset"))throw Error("Not a sitemap index");
 const matches=[...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*<\/sitemap>/g)];
 if(!matches.length||matches.length!==(xml.match(/<sitemap>/g)||[]).length)throw Error("Invalid or empty sitemap index");
 const seen=new Set();
 return matches.map(m=>{
  const value=decodeXML(m[1]),pathname=safeURL(value,origin),name=pathname.slice(1);
  if(!SITEMAP_CHILD.test(name)||seen.has(name))throw Error("Invalid or duplicate sitemap child "+name);
  seen.add(name);return name;
 });
}
/**
 * Absolute same-origin URL of a child named in the sitemap index.
 * parseSitemapIndex returns bare file names; a bare name such as "sitemap-main.xml"
 * is not a fetchable URL (live QA run 38668639207 failed on exactly that).
 * Only names matching SITEMAP_CHILD resolve, so traversal, other hosts, queries
 * and encoded paths are refused before any request is made.
 */
export function sitemapChildURL(name,origin=SITEMAP_ORIGIN){
 const base=new URL(origin);
 if(base.protocol!=="https:"||base.username||base.password||base.pathname!=="/"||base.search||base.hash)throw Error("Invalid sitemap origin "+origin);
 if(typeof name!=="string"||!SITEMAP_CHILD.test(name))throw Error("Invalid sitemap child "+name);
 const url=new URL("/"+name,base.origin);
 if(url.origin!==base.origin||url.pathname!=="/"+name)throw Error("Sitemap child escapes origin "+name);
 return url.href;
}
/**
 * Read the LIVE sitemap index and every child shard through get(absoluteUrl) → {status,text}.
 * Checks HTTP 200, XML grammar, canonical same-origin <loc>s, a shard group for main and
 * every locale, locale placement, cross-shard duplicates and protocol size limits.
 * Faults in the served files throw errors tagged kind:"SITE"; errors raised by `get`
 * propagate unchanged, so callers can tell a broken sitemap from a failed request.
 */
export async function fetchSitemapInventory(get,{origin=SITEMAP_ORIGIN,localeCodes,query=""}={}){
 const site=msg=>Object.assign(Error(msg),{kind:"SITE"});
 const expected=new Set(["main",...localeCodes]);
 const index=await get(new URL("/sitemap.xml",origin).href+query);
 if(index.status!==200)throw site("HTTP "+index.status+" /sitemap.xml");
 let children;
 try{children=parseSitemapIndex(index.text,origin);}catch(e){throw site("sitemap index invalid: "+e.message);}
 const urls=new Set(),groups=new Set(),byChild={};
 for(const name of children){
  const group=name.match(SITEMAP_CHILD)[1];
  if(!expected.has(group))throw site("Unrecognized sitemap child "+name);
  groups.add(group);
  const shard=await get(sitemapChildURL(name,origin)+query);
  if(shard.status!==200)throw site("HTTP "+shard.status+" /"+name);
  let entries;
  try{entries=parseSitemapUrlset(shard.text,origin);}catch(e){throw site(name+" invalid: "+e.message);}
  if(entries.length>SITEMAP_LIMIT||Buffer.byteLength(shard.text)>SITEMAP_MAX_BYTES)throw site("Sitemap shard exceeds safe size "+name);
  for(const url of entries){
   const prefix=url.split("/")[1],belongs=expected.has(prefix)?prefix:"main";
   if(belongs!==group)throw site("URL in wrong locale shard "+url+" "+name);
   if(urls.has(url))throw site("Duplicate across sitemap shards "+url);
   urls.add(url);
  }
  byChild[name]=entries;
 }
 for(const group of expected)if(!groups.has(group))throw site("Missing locale sitemap "+group);
 return {children,urls:[...urls].sort(),byChild};
}
export function parseSitemapUrlset(xml,origin=SITEMAP_ORIGIN){
 if(!xml.includes('<urlset xmlns="'+NS+'">')||xml.includes("<sitemapindex"))throw Error("Not a URL sitemap");
 const matches=[...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>)?\s*<\/url>/g)];
 if(!matches.length||matches.length!==(xml.match(/<url>/g)||[]).length)throw Error("Invalid or empty URL sitemap");
 const seen=new Set();
 return matches.map(m=>{
  const pathname=safeURL(decodeXML(m[1]),origin);
  if(seen.has(pathname))throw Error("Duplicate sitemap URL "+pathname);
  seen.add(pathname);return pathname;
 });
}
export function readLocalSitemapInventory(root,localeCodes,origin=SITEMAP_ORIGIN){
 const index=parseSitemapIndex(fs.readFileSync(path.join(root,"sitemap.xml"),"utf8"),origin);
 const expectedGroups=new Set(["main",...localeCodes]);
 const seen=new Set(),byChild={},groupsSeen=new Set();
 for(const name of index){
  const match=name.match(SITEMAP_CHILD);
  const group=match?.[1];
  if(!expectedGroups.has(group))throw Error("Unrecognized sitemap locale "+name);
  groupsSeen.add(group);
  const entries=parseSitemapUrlset(fs.readFileSync(path.join(root,name),"utf8"),origin);
  if(entries.length>SITEMAP_LIMIT)throw Error("Too many URLs in "+name);
  if(fs.statSync(path.join(root,name)).size>SITEMAP_MAX_BYTES)throw Error("Too many bytes in "+name);
  for(const url of entries){
   const locale=url.split("/")[1];
   const belongs=expectedGroups.has(locale)?locale:"main";
   if(group!==belongs)throw Error("URL in wrong language sitemap "+url+" "+name);
   if(seen.has(url))throw Error("URL repeated across sitemaps "+url);
   seen.add(url);
  }
  byChild[name]=entries;
 }
 for(const group of expectedGroups)if(!groupsSeen.has(group))throw Error("Missing language sitemap "+group);
 return {indexFiles:index,urls:[...seen].sort(),byChild};
}
