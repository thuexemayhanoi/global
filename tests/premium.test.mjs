import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const locales=JSON.parse(read("content/locales.json"));
const manifest=JSON.parse(read("assets/search-index/manifest.json"));
const published=matrix.rows.filter(r=>r.status==="PUBLISHED");
const ideas=matrix.rows.filter(r=>r.status==="IDEA");
const sitemap=new Set([...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]));
const url=path=>"https://global.rentbikehanoi.com"+path;
const page=r=>r.url==="/"? "index.html":r.url.slice(1)+"index.html";
test("index and sitemap contain exactly 25 real published URLs, not search or IDEA",()=>{
 assert.equal(published.length,25);
 assert.equal(sitemap.size,25);
 for(const r of published)assert.ok(sitemap.has(url(r.url)),r.id);
 for(const r of ideas)assert.ok(!sitemap.has(url(r.url)),r.id);
 assert.equal(sitemap.has(url("/search/")),false);
 assert.equal(sitemap.has(url("/404.html")),false);
 assert.match(read("search/index.html"),/<meta name="robots" content="noindex,follow">/);
 assert.match(read("404.html"),/<meta name="robots" content="noindex,follow">/);
});
test("no broken published HTML, canonical mismatch, invalid JSON-LD or missing H1",()=>{
 for(const r of published){
  const html=read(page(r));
  assert.ok(html.includes('<link rel="canonical" href="'+url(r.url)+'">'),r.id);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,r.id);
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(m[1]),r.id);
  assert.match(html,/href="\/assets\/premium\.css"/,r.id);
 }
});
test("10 native-language landing pages and checklists keep equivalent-only reciprocal hreflang",()=>{
 assert.equal(locales.length,10);
 for(const l of locales){
  const paths=[l.code+"/index.html",l.code+"/checklist/index.html"];
  for(const p of paths){
   const html=read(p);
   assert.ok(html.includes('<html lang="'+l.htmlLang+'">'),p);
   for(const to of locales){
    const target="/"+to.code+(p.includes("/checklist/")?"/checklist/":"/");
    assert.ok(html.includes('hreflang="'+to.htmlLang+'" href="'+url(target)+'"'),p+" -> "+to.code);
   }
  }
 }
});
test("desktop nav is visible structurally; mobile starts collapsed and has all 4 hubs",()=>{
 for(const l of locales){
  for(const path of [l.code+"/index.html",l.code+"/checklist/index.html"]){
   const h=read(path);
   assert.match(h,/<nav class="nav2-desktop"/,path);
   assert.match(h,/<details class="nav2-drawer">/,path);
   assert.doesNotMatch(h,/<details class="nav2-drawer" open>/,path);
   assert.equal((h.match(/class="nav2-topic"/g)||[]).length,8,path);
   for(const row of ideas)assert.ok(!h.includes('href="'+row.url+'"'),path+" -> "+row.id);
  }
 }
 const css=read("assets/premium.css");
 assert.match(css,/\.nav2-desktop\{display:flex/);
 assert.match(css,/@media\(max-width:1220px\)/);
 assert.match(css,/\.nav2-drawer\{display:block/);
});
test("search index is bounded, locale-sharded, metadata-only and uses real published paths",()=>{
 const publishedLocale=published.filter(r=>locales.some(l=>l.code===r.locale)&&r.role!=="UTILITY");
 assert.equal(manifest.shardSize,150);
 assert.equal(Object.keys(manifest.locales).length,10);
 let rows=0;
 for(const l of locales){
  const data=manifest.locales[l.code];
  const actual=publishedLocale.filter(r=>r.locale===l.code);
  assert.equal(data.count,actual.length);
  for(const src of data.shards){
   assert.ok(src.startsWith("/assets/search-index/"+l.code+"-"),src);
   const list=JSON.parse(read(src.slice(1)));assert.ok(list.length<=150);
   for(const item of list){
    assert.deepEqual(Object.keys(item).sort(),["d","t","type","u"].sort());
    assert.ok(actual.some(r=>r.url===item.u),item.u);
    assert.ok(item.t&&item.d);
    rows++;
   }
  }
 }
 assert.equal(rows,publishedLocale.length);
 assert.ok(read("search/index.html").includes('src="/assets/search.js"'));
});
test("each published localized checklist gets TOC, internal anchor targets and reading progress",()=>{
 for(const l of locales){
  const h=read(l.code+"/checklist/index.html");
  assert.ok(h.includes('id="premium-reading-progress"'),l.code);
  assert.ok(h.includes('class="premium-article-grid"'),l.code);
  assert.ok(h.includes('class="premium-toc"'),l.code);
  const anchors=[...h.matchAll(/href="#(section-[0-9]+)"/g)].map(x=>x[1]);
  assert.ok(anchors.length>=2,l.code);
  for(const id of anchors)assert.ok(h.includes('id="'+id+'"'),l.code+" "+id);
  assert.ok(h.includes('class="premium-back-top"'),l.code);
 }
});
