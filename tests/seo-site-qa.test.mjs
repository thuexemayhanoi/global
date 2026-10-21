/**
 * Consolidated static QA of the whole generated site, all 10 locales, no network and no AI.
 *
 * Every PUBLISHED Matrix row (data/seo/master-matrix.json) is read exactly once into an
 * index; the tests then assert html lang, canonical + og:url, a single H1, metadata presence
 * and per-locale uniqueness, internal link resolution (never a planned IDEA URL), indexability
 * (noindex only on /search/ and 404.html), JSON-LD validity (Article, BreadcrumbList),
 * hreflang reciprocity, sitemap coverage and image attributes. It complements seo-guard
 * (frozen fingerprints), seo-v10 (engine-specific output) and hero-perf (root hero srcset)
 * with site-wide rules that must hold for every page the site will ever publish. Runs in qa.yml.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {SITEMAP_CHILD,SITEMAP_ORIGIN as ORIGIN} from "../scripts/sitemaps.mjs";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const locales=JSON.parse(read("content/locales.json"));
const frozen=new Map(JSON.parse(read("data/seo/url-freeze.json")).urls.map(u=>[u.url,u.fingerprint]));
const htmlLangOf=new Map(locales.map(l=>[l.code,l.htmlLang]));
const published=matrix.rows.filter(r=>r.status==="PUBLISHED");
const publishedUrls=new Set(published.map(r=>r.url));
const plannedUrls=new Set(matrix.rows.filter(r=>r.status!=="PUBLISHED").map(r=>r.url));
const pageOf=url=>url==="/"?"index.html":url.slice(1)+"index.html";
const attr=(tag,name)=>tag.match(new RegExp("\\s"+name+'="([^"]*)"',"i"))?.[1]??null;
const decode=s=>String(s??"").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const types=node=>[].concat(node?.["@type"]??[]);
const idOf=value=>typeof value==="string"?value:value?.["@id"]??null;
// A decorative card illustration may stay silent (alt="") only when its card heading names it at once:
// after the <img> nothing but wrapper tags and the card counter may precede a non-empty <h3>.
const DECORATIVE_CARD=/^(?:\s*<\/?(?:div|figure|a|span)\b[^>]*>|\s*\d{1,2}\s*)*\s*<h3\b[^>]*>\s*[^<\s]/;

/**
 * Expected <html lang>: the htmlLang of the row's locale in content/locales.json. The only row
 * outside the content locales is the language selector `/` (Matrix locale "global"); it has no
 * translation of its own, so its lang is the one frozen for the live URL in data/seo/url-freeze.json
 * (currently "en", like the English-locale utilities /about/ /contact/ /privacy/ /terms/).
 */
function expectedLang(row){
 if(htmlLangOf.has(row.locale))return htmlLangOf.get(row.locale);
 assert.equal(row.role,"LANGUAGE_SELECTOR",row.id+" has locale "+row.locale+" which is not in content/locales.json");
 const fp=frozen.get(row.url);
 assert.ok(fp?.lang,row.url+" must be frozen with a lang in data/seo/url-freeze.json");
 return fp.lang;
}

// Why a site-relative target (href, src or srcset candidate) does not resolve to a committed file; null when it does.
const resolution=new Map();
function targetProblem(target){
 if(!resolution.has(target)){
  const file=target.endsWith("/")?target.slice(1)+"index.html":target.slice(1);
  let reason=null;
  try{
   const st=fs.statSync(path.join(root,file));
   if(st.isDirectory())reason="is a directory linked without a trailing slash (redirect hop)";
   else if(!st.isFile())reason="is not a file";
  }catch{reason="does not exist in the repository ("+file+")";}
  resolution.set(target,reason);
 }
 return resolution.get(target);
}
const imageSources=tag=>[attr(tag,"src"),...String(attr(tag,"srcset")??"").split(",").map(c=>c.trim().split(/\s+/)[0])].filter(s=>s&&s.startsWith("/"));

// One pass over every published page: read once, keep only what the assertions need.
function indexPage(row){
 const file=pageOf(row.url),html=read(file);
 const headEnd=html.indexOf("</head>");
 const head=headEnd>0?html.slice(0,headEnd):"";
 const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
 const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
 return {
  url:row.url,row,file,hasHead:headEnd>0,
  langs:[...html.matchAll(/<html\b[^>]*>/gi)].map(m=>attr(m[0],"lang")),
  canonical:links.filter(t=>/\brel="canonical"/i.test(t)).map(t=>attr(t,"href")),
  ogUrl:metas.filter(t=>/\bproperty="og:url"/i.test(t)).map(t=>attr(t,"content")),
  titleTags:(head.match(/<title\b/gi)||[]).length,
  titles:[...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(m=>m[1]),
  descriptions:metas.filter(t=>/\bname="description"/i.test(t)).map(t=>attr(t,"content")),
  robots:metas.filter(t=>/\bname="robots"/i.test(t)).map(t=>attr(t,"content")),
  h1:(html.match(/<h1\b[^>]*>/gi)||[]).length,
  hrefs:[...html.matchAll(/\bhref="([^"]*)"/g)].map(m=>m[1]).filter(h=>h.startsWith("/")),
  anchors:[...html.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/gi)].length,
  ld:[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>m[1]),
  hreflang:links.filter(t=>/\brel="alternate"/i.test(t)&&attr(t,"hreflang")!==null).map(t=>[attr(t,"hreflang"),attr(t,"href")]),
  imgs:[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>({tag:m[0],after:html.slice(m.index+m[0].length,m.index+m[0].length+400)}))
 };
}
const pages=new Map(published.map(r=>[r.url,indexPage(r)]));
const robotsOf=html=>[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).filter(t=>/\bname="robots"/i.test(t)).map(t=>attr(t,"content"));

test("every published page declares exactly one <html lang> equal to its Matrix locale",()=>{
 assert.ok(pages.size>=25,"the PUBLISHED set never shrinks below the 2026-10-14 baseline");
 for(const p of pages.values()){
  assert.ok(p.hasHead,p.file+" has no </head>");
  assert.equal(p.langs.length,1,p.file+" must have exactly one <html> tag");
  assert.equal(p.langs[0],expectedLang(p.row),p.file+" <html lang>");
 }
});

test("canonical and og:url are the page's own absolute URL, exactly once",()=>{
 for(const p of pages.values()){
  assert.deepEqual(p.canonical,[ORIGIN+p.url],p.file+" canonical");
  assert.deepEqual(p.ogUrl,[ORIGIN+p.url],p.file+" og:url must equal the canonical");
 }
});

test("every published page has exactly one <h1>",()=>{
 for(const p of pages.values())assert.equal(p.h1,1,p.file+" h1 count");
});

test("every published page has exactly one non-empty <title> and one non-empty meta description",()=>{
 for(const p of pages.values()){
  assert.equal(p.titleTags,1,p.file+" must have exactly one <title> in <head>");
  assert.ok(decode(p.titles[0]).trim(),p.file+" empty <title>");
  assert.equal(p.descriptions.length,1,p.file+" must have exactly one meta description");
  assert.ok(decode(p.descriptions[0]).trim(),p.file+" empty meta description");
 }
});

test("titles and meta descriptions are unique within each locale",()=>{
 const titles=new Map(),descriptions=new Map();
 for(const p of pages.values()){
  const t=p.row.locale+" | "+decode(p.titles[0]).trim(),d=p.row.locale+" | "+decode(p.descriptions[0]).trim();
  assert.ok(!titles.has(t),"duplicate title in locale "+p.row.locale+": "+p.url+" and "+titles.get(t)+" share "+JSON.stringify(decode(p.titles[0])));
  assert.ok(!descriptions.has(d),"duplicate description in locale "+p.row.locale+": "+p.url+" and "+descriptions.get(d));
  titles.set(t,p.url);descriptions.set(d,p.url);
 }
});

test("internal hrefs resolve to committed files and never point at a planned (IDEA) URL",()=>{
 for(const p of pages.values()){
  for(const raw of p.hrefs){
   if(raw.startsWith("//"))continue; // protocol-relative = another host, not an internal link
   const target=raw.split(/[?#]/)[0]||"/";
   assert.ok(!plannedUrls.has(target),p.file+" links the unpublished Matrix URL "+raw);
   const reason=targetProblem(target);
   assert.equal(reason,null,p.file+" internal link "+raw+" "+reason);
  }
 }
});

test("noindex appears only on /search/ and 404.html, and those two carry it",()=>{
 for(const p of pages.values())assert.ok(!p.robots.some(c=>/\b(?:noindex|none)\b/i.test(c??"")),p.file+" must stay indexable, robots="+JSON.stringify(p.robots));
 for(const file of ["search/index.html","404.html"]){
  const robots=robotsOf(read(file));
  assert.equal(robots.length,1,file+" must carry exactly one robots meta");
  assert.match(robots[0],/\bnoindex\b/,file+" must be noindex");
  assert.doesNotMatch(robots[0],/\bnofollow\b/,file+" stays follow so its links are crawled");
 }
 for(const url of ["/search/","/404.html"])assert.ok(!publishedUrls.has(url),url+" is a noindex utility, never a PUBLISHED row");
});

test("JSON-LD parses everywhere; Article nodes are complete; breadcrumbs are unique and end on the page",()=>{
 for(const p of pages.values()){
  const nodes=[];
  for(const block of p.ld){
   let parsed;
   try{parsed=JSON.parse(block);}catch(e){assert.fail(p.file+" has invalid JSON-LD: "+e.message);}
   nodes.push(...(Array.isArray(parsed)?parsed:parsed["@graph"]??[parsed]));
  }
  const articles=nodes.filter(n=>types(n).includes("Article")),crumbs=nodes.filter(n=>types(n).includes("BreadcrumbList"));
  if(p.row.role==="HUB"||p.row.role==="SUPPORT"){
   assert.equal(articles.length,1,p.file+" must carry exactly one Article node");
   assert.equal(crumbs.length,1,p.file+" must carry exactly one BreadcrumbList");
  }
  if(p.row.role==="PILLAR")assert.equal(crumbs.length,1,p.file+" pillar must carry exactly one BreadcrumbList");
  for(const a of articles){
   for(const key of ["headline","inLanguage","mainEntityOfPage","author","publisher"])assert.ok(a[key],p.file+" Article lacks "+key);
   assert.equal(idOf(a.mainEntityOfPage),ORIGIN+p.url,p.file+" Article mainEntityOfPage must be the canonical URL");
   assert.equal(a.inLanguage,expectedLang(p.row),p.file+" Article inLanguage must match <html lang>");
   for(const key of ["author","publisher"])assert.ok(typeof a[key]==="object"&&String(a[key].name||"").trim(),p.file+" Article "+key+" needs a name");
  }
  for(const c of crumbs){
   const items=c.itemListElement??[];
   assert.ok(items.length>=1,p.file+" empty BreadcrumbList");
   items.forEach((it,i)=>{
    assert.equal(it.position,i+1,p.file+" breadcrumb positions must run 1..n");
    assert.ok(String(it.name||"").trim(),p.file+" breadcrumb item "+(i+1)+" has no name");
   });
   const urls=items.map(it=>idOf(it.item));
   assert.equal(new Set(urls).size,urls.length,p.file+" breadcrumb repeats a URL: "+urls.join(" "));
   assert.equal(urls[urls.length-1],ORIGIN+p.url,p.file+" breadcrumb must end on the page itself");
   for(const u of urls)assert.ok(typeof u==="string"&&u.startsWith(ORIGIN+"/")&&publishedUrls.has(u.slice(ORIGIN.length)),p.file+" breadcrumb item is not a PUBLISHED URL: "+u);
  }
 }
});

test("hreflang clusters target PUBLISHED URLs with the target's language code and link back",()=>{
 const clusters=new Map([...pages.values()].map(p=>[p.url,new Map(p.hreflang)]));
 for(const p of pages.values()){
  if(!p.hreflang.length)continue;
  const codes=p.hreflang.map(([code])=>code);
  assert.equal(new Set(codes).size,codes.length,p.file+" repeats an hreflang code");
  assert.ok(p.hreflang.some(([,href])=>href===ORIGIN+p.url),p.file+" hreflang cluster lacks a self reference");
  // A locale page is referenced by its own language code; the language selector `/` only through x-default.
  const own=htmlLangOf.get(p.row.locale)??"x-default";
  for(const [code,href] of p.hreflang){
   assert.ok(typeof href==="string"&&href.startsWith(ORIGIN+"/"),p.file+" hreflang "+code+" points off-site: "+href);
   const target=href.slice(ORIGIN.length);
   assert.ok(publishedUrls.has(target),p.file+" hreflang "+code+" targets an unpublished URL "+target);
   if(code==="x-default")continue;
   assert.equal(code,htmlLangOf.get(pages.get(target).row.locale),p.file+" hreflang code for "+target+" must be the target's htmlLang");
   assert.equal(clusters.get(target).get(own),ORIGIN+p.url,target+" must link back to "+p.url+" as hreflang "+own);
  }
 }
});

test("sitemap index references every shard on disk and the shards cover exactly the PUBLISHED URLs",()=>{
 const index=read("sitemap.xml");
 assert.ok(index.includes("<sitemapindex")&&!index.includes("<urlset"),"sitemap.xml must be a sitemap index");
 const names=[...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1])).map(loc=>{
  assert.ok(loc.startsWith(ORIGIN+"/"),"sitemap index child off-site: "+loc);
  return loc.slice(ORIGIN.length+1);
 });
 for(const name of names)assert.match(name,SITEMAP_CHILD,"sitemap child outside the SITEMAP_CHILD grammar: "+name);
 const onDisk=fs.readdirSync(root).filter(f=>/^sitemap-.*\.xml$/.test(f)).sort();
 assert.deepEqual([...names].sort(),onDisk,"sitemap.xml must reference every sitemap-*.xml on disk and nothing else");
 const seen=new Map();
 for(const name of names){
  const xml=read(name);
  assert.ok(xml.includes("<urlset")&&!xml.includes("<sitemapindex"),name+" must be a URL set");
  const group=name.match(SITEMAP_CHILD)[1];
  for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
   const loc=decode(m[1]);
   assert.ok(loc.startsWith(ORIGIN+"/"),name+" lists an off-site <loc> "+loc);
   const url=loc.slice(ORIGIN.length);
   assert.ok(!seen.has(url),url+" is listed twice: "+seen.get(url)+" and "+name);
   seen.set(url,name);
   assert.equal(group,htmlLangOf.has(url.split("/")[1])?url.split("/")[1]:"main",url+" sits in the wrong shard "+name);
  }
 }
 const missing=[...publishedUrls].filter(u=>!seen.has(u)),extra=[...seen.keys()].filter(u=>!publishedUrls.has(u));
 assert.deepEqual(missing,[],"PUBLISHED URLs missing from the sitemap shards");
 assert.deepEqual(extra,[],"sitemap URLs that are not PUBLISHED (search, 404, IDEA or stale)");
 assert.equal(seen.size,publishedUrls.size);
});

test("every <img> declares alt, integer width and height and committed sources; empty alt only on card illustrations named by their <h3>",()=>{
 for(const p of pages.values())for(const {tag,after} of p.imgs){
  const alt=attr(tag,"alt");
  assert.ok(alt!==null,p.file+" image without an alt attribute: "+tag);
  for(const dim of ["width","height"])assert.match(attr(tag,dim)??"",/^[1-9][0-9]*$/,p.file+" image without an integer "+dim+": "+tag);
  if(!decode(alt).trim())assert.match(after,DECORATIVE_CARD,p.file+" empty alt is only allowed on a decorative card illustration immediately followed by its <h3>: "+tag);
  for(const src of imageSources(tag))assert.equal(targetProblem(src),null,p.file+" image source "+src+" "+targetProblem(src));
 }
 const [hero]=pages.get("/").imgs;
 assert.ok(hero,"the language selector renders its hero illustration");
 assert.ok(decode(attr(hero.tag,"alt")).trim().length>=3,"the root hero keeps descriptive alt text: "+hero.tag);
});

test("per-locale coverage summary (informational, printed for CI logs)",()=>{
 const summary={};
 for(const key of ["global",...locales.map(l=>l.code)])summary[key]={pages:0,hreflang_pages:0,images:0,internal_links:0};
 for(const p of pages.values()){
  const s=summary[p.row.locale]??={pages:0,hreflang_pages:0,images:0,internal_links:0};
  s.pages++;
  if(p.hreflang.length)s.hreflang_pages++;
  s.images+=p.imgs.length;
  s.internal_links+=p.anchors;
 }
 const total={pages:0,hreflang_pages:0,images:0,internal_links:0};
 for(const s of Object.values(summary))for(const k of Object.keys(total))total[k]+=s[k];
 console.log(JSON.stringify({seo_site_qa:{...summary,total}}));
});
