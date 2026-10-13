import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const read=p=>fs.readFileSync(p,"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const langs=JSON.parse(read("content/locales.json"));
const map=new Map(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>[r.url,r]));
const pageOf=url=>url==="/"? "index.html":url.slice(1)+"index.html";
const parseLinks=html=>[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
test("25 existing public content URLs stay indexed and canonical",()=>{
 const sitemap=read("sitemap.xml");
 assert.equal(map.size,25);
 assert.equal((sitemap.match(/<loc>/g)||[]).length,map.size);
 assert.ok(!sitemap.includes("<loc>https://global.rentbikehanoi.com/search/</loc>"));
 for(const [url,r] of map){
  const f=pageOf(url),h=read(f);
  assert.ok(sitemap.includes("<loc>https://global.rentbikehanoi.com"+url+"</loc>"),url);
  assert.ok(h.includes('<link rel="canonical" href="https://global.rentbikehanoi.com'+url+'">'),f);
  assert.equal((h.match(/<h1[\s>]/g)||[]).length,1,f);
  const lang=langs.find(x=>x.code===r.locale);
  if(lang)assert.ok(h.includes('<html lang="'+lang.htmlLang+'"'),f);
  assert.ok(h.includes('href="/assets/premium.css"'),f);
  assert.ok(h.includes('href="/search/"'),f);
 }
});
test("real technical search page noindexed with metadata-only language-sharded index",()=>{
 const h=read("search/index.html"),manifest=JSON.parse(read("assets/search-index/manifest.json"));
 assert.ok(h.includes('name="robots" content="noindex,follow"'));
 assert.ok(h.includes('id="premium-search-form"'));
 assert.ok(h.includes('src="/assets/search.js"'));
 assert.equal(Object.keys(manifest.locales).length,10);
 const all=new Set();
 for(const locale of langs){
  const entry=manifest.locales[locale.code];
  assert.ok(entry.count>=2);
  for(const item of entry.shards){
   const data=JSON.parse(read(item.slice(1)));assert.ok(data.length<=150);
   for(const v of data){assert.deepEqual(Object.keys(v).sort(),["d","t","type","u"]);assert.ok(map.has(v.u));assert.ok(!all.has(v.u));all.add(v.u);}
  }
 }
 assert.equal(all.size,20);
});
test("desktop menu visibly open without JS, mobile accordion exists and CSS breakpoint",()=>{
 for(const l of langs){
  const h=read(l.code+"/index.html");
  assert.ok(h.includes('class="nav2-drawer" open'),l.code);
  assert.equal((h.match(/class="nav2-topic"/g)||[]).length,4,l.code);
  assert.ok(h.includes('class="premium-featured"'),l.code);
 }
 const css=read("assets/premium.css");
 assert.ok(css.includes(".nav2-head{position:sticky"));
 assert.ok(css.includes("@media(max-width:760px)"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(read("assets/premium.js").includes('window.matchMedia("(max-width:760px)")'));
});
test("article checklists have server-rendered TOCs, reading progress, related real links",()=>{
 for(const l of langs){
  const h=read(l.code+"/checklist/index.html");
  assert.ok(h.includes('class="premium-toc"'),l.code);
  assert.ok(h.includes('id="premium-reading-progress"'),l.code);
  assert.ok(h.includes('class="premium-related"'),l.code);
  assert.ok(h.includes('href="#section-1"'),l.code);
  assert.ok(h.includes('id="section-1"'),l.code);
  assert.ok(h.includes('href="/about/"'),l.code);
 }
});
test("reciprocal hreflang only for equivalent locale homepage/checklist",()=>{
 for(const suffix of ["","checklist/"]){
  for(const a of langs){
   const h=read(a.code+"/"+suffix+"index.html");
   if(suffix==="checklist/")assert.ok(!h.includes('hreflang="x-default"'),"Checklist root selector is not an equivalent checklist page");
   for(const b of langs){
    const target="https://global.rentbikehanoi.com/"+b.code+"/"+suffix;
    assert.ok(h.includes('hreflang="'+b.htmlLang+'" href="'+target+'"'),a.code+"->"+b.code);
   }
  }
 }
});
test("all discovered internal destinations and static assets resolve",()=>{
 const staticFiles=new Set(["404.html","search/index.html","assets/favicon.svg","assets/styles.css","assets/navigation.css","assets/premium.css","assets/premium.js","assets/search.js"]);
 for(const url of map.keys())staticFiles.add(pageOf(url));
 for(const f of staticFiles){
  if(!f.endsWith(".html"))continue;
  const html=read(f);
  for(const raw of parseLinks(html)){
   if(!raw.startsWith("/"))continue;
   const u=raw.split(/[?#]/)[0];if(!u)continue;
   const file=u.endsWith("/")?u.slice(1)+"index.html":u.slice(1);
   const final=file||"index.html";
   assert.ok(fs.existsSync(final),"Broken target "+raw+" from "+f);
  }
  for(const match of html.matchAll(/<script\s+src="([^"]+)"[^>]*>/g))assert.ok(fs.existsSync(match[1].replace(/^\//,"")),f+" missing script "+match[1]);
 }
});
test("404 source is noindex and unknown route is delegated to GitHub Pages",()=>{
 const h=read("404.html");assert.ok(h.includes('name="robots" content="noindex,follow"'));
 assert.ok(!h.includes('rel="canonical"'));
});
