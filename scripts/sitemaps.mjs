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
const NS="http://www.sitemaps.org/schemas/sitemap/0.9";
const XML_HEAD='<?xml version="1.0" encoding="UTF-8"?>\n';
const escapeXML=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const decodeXML=s=>s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
const urlset=urls=>XML_HEAD+'<urlset xmlns="'+NS+'">\n'+urls.map(url=>"<url><loc>"+escapeXML(url)+"</loc></url>").join("\n")+'\n</urlset>\n';
const indexXml=children=>XML_HEAD+'<sitemapindex xmlns="'+NS+'">\n'+children.map(name=>"<sitemap><loc>"+escapeXML(SITEMAP_ORIGIN+"/"+name)+"</loc></sitemap>").join("\n")+'\n</sitemapindex>\n';

export function htmlKeyToURL(key,origin=SITEMAP_ORIGIN){
 if(!/^(?:index\.html|[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/index\.html)$/.test(key))throw Error("Invalid sitemap HTML key "+key);
 return origin+"/"+(key==="index.html"?"":key.slice(0,-10));
}

function splitShards(urls){
 const shards=[],headBytes=Buffer.byteLength(XML_HEAD+'<urlset xmlns="'+NS+'">\n</urlset>\n');
 let current=[],bytes=headBytes;
 for(const url of urls){
  const increment=Buffer.byteLength("<url><loc>"+escapeXML(url)+"</loc></url>\n");
  if(increment+headBytes>SITEMAP_MAX_BYTES)throw Error("Individual URL too long for sitemap");
  if(current.length&&(current.length>=SITEMAP_LIMIT||bytes+increment>SITEMAP_MAX_BYTES)){
   shards.push(current);current=[];bytes=headBytes;
  }
  current.push(url);bytes+=increment;
 }
 if(current.length)shards.push(current);
 return shards;
}
export function generateSitemaps(pageKeys,localeCodes,origin=SITEMAP_ORIGIN){
 if(origin!==SITEMAP_ORIGIN)throw Error("Unexpected sitemap origin");
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
  for(const [index,urls]of splitShards(items.sort()).entries()){
   const name="sitemap-"+group+(index?"-"+(index+1):"")+".xml";
   files[name]=urlset(urls);
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
  if(!/^sitemap-(?:main|[a-z]{2})(?:-[2-9][0-9]*)?\.xml$/.test(name)||seen.has(name))throw Error("Invalid or duplicate sitemap child "+name);
  seen.add(name);return name;
 });
}
export function parseSitemapUrlset(xml,origin=SITEMAP_ORIGIN){
 if(!xml.includes('<urlset xmlns="'+NS+'">')||xml.includes("<sitemapindex"))throw Error("Not a URL sitemap");
 const matches=[...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<\/url>/g)];
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
  const match=name.match(/^sitemap-(main|[a-z]{2})(?:-[2-9][0-9]*)?\.xml$/);
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
