import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {applyUltra} from "../scripts/ultra.mjs";
const read=p=>fs.readFileSync(p,"utf8");
const locales=JSON.parse(read("content/locales.json"));
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const files=[...matrix.rows.filter(x=>x.status==="PUBLISHED").map(x=>x.url==="/"? "index.html":x.url.slice(1)+"index.html"),"search/index.html","404.html"];
test("all generated pages have offline Ultra assets, one H1 and intact canonicals",()=>{
 assert.equal(new Set(files).size,files.length);
 assert.ok(read("assets/ultra.css").length<24000);
 assert.ok(read("assets/ultra.js").length<8000);
 for(const p of files){
  const h=read(p);
  assert.ok(h.includes('href="/assets/ultra.css"'),p);
  assert.ok(h.includes('src="/assets/ultra.js"'),p);
  assert.equal(h.split("<h1").length-1,1,p);
  if(p!=="404.html")assert.ok(h.includes('rel="canonical"'),p);
 }
});
test("all ten native-language homepages have editorial hero and four real anchor navigation targets",()=>{
 for(const l of locales){
  const h=read(l.code+"/index.html");
  assert.ok(h.includes("hero-inner ultra-hero-grid"),l.code);
  assert.ok(h.includes('class="ultra-art-card"'),l.code);
  assert.ok(h.includes('class="ultra-topic-tabs"'),l.code);
  assert.equal(h.split('class="topic ultra-topic-card"').length-1,4,l.code);
  for(let i=1;i<=4;i++){
   assert.ok(h.includes('href="#ultra-topic-'+i+'"'),l.code);
   assert.ok(h.includes('id="ultra-topic-'+i+'"'),l.code);
  }
 }
});
test("Search is inside the shared header flex container and no unpublished links are created",()=>{
 for(const l of locales){
  for(const p of [l.code+"/index.html",l.code+"/checklist/index.html"]){
   const h=read(p),header=h.slice(h.indexOf("<header"),h.indexOf("</header>"));
   const link=header.indexOf('class="premium-search-link"'),lastContainerEnd=header.lastIndexOf("</div>");
   assert.ok(link>=0&&link<lastContainerEnd,p+" search aligned within nav2-head-inner");
   for(const idea of matrix.rows.filter(x=>x.status==="IDEA"))assert.ok(!h.includes('href="'+idea.url+'"'),p+" unbuilt slug "+idea.id);
  }
 }
});
test("all ten checklists have progressive mobile TOC, reading controls and keyboard-safe buttons",()=>{
 for(const l of locales){
  const h=read(l.code+"/checklist/index.html");
  assert.ok(h.includes('class="ultra-mobile-toc"'),l.code);
  assert.ok(h.includes('data-ultra-copy hidden'),l.code);
  assert.ok(h.includes('data-ultra-focus hidden aria-pressed="false"'),l.code);
  assert.ok(h.includes('class="ultra-reading-tools"'),l.code);
  assert.ok(h.indexOf('<h1')<h.indexOf('class="article-lead"')&&h.indexOf('class="article-lead"')<h.indexOf('class="ultra-mobile-toc"'),l.code+' mobile TOC must follow intro');
  assert.ok(h.includes('href="#section-1"'),l.code);
 }
});
test("global homepage has language chooser and readable navigation without external images",()=>{
 const h=read("index.html");
 assert.ok(h.includes('class="ultra-root-values"'));
 assert.ok(h.includes('class="language-grid ultra-language-grid"'));
 assert.ok(h.includes('href="/search/"'));
 assert.ok(h.includes('href="/vi/"'));
 assert.ok(h.includes('href="/ja/"'));
});
test("Ultra renderer is idempotent on the same generated page",()=>{
 const h=read("en/index.html"),again=applyUltra({"en/index.html":h},matrix,locales)["en/index.html"];
 assert.equal(again,h);
});
test("responsive, print, reduced-motion and focus-mode CSS is bundled locally",()=>{
 const css=read("assets/ultra.css");
 assert.ok(css.includes("@media(max-width:760px)"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(css.includes("@media print"));
 assert.ok(css.includes("body.ultra-focus .premium-article-grid"));
});

test("uploaded WebP media is referenced in generated pages without broken paths",()=>{
 const media=["hero-hanoi.webp","topic-choose-bike.webp","topic-prices-deposits.webp","topic-documents.webp","topic-safety.webp"];
 for(const f of media){assert.ok(fs.existsSync(f),"Missing uploaded asset: "+f);const stat=fs.statSync(f);assert.ok(stat.size>1000&&stat.size<350000,"WebP too large or empty: "+f);}
 const root=read("index.html");
 assert.ok(root.includes('src="/hero-hanoi.webp"'));
 assert.equal((root.match(/class="ultra-gallery-card"/g)||[]).length,4);
 for(const f of media.slice(1)){assert.ok(root.includes('src="/'+f+'"'),"Gateway missing "+f);}
 for(const l of locales){const h=read(l.code+"/index.html");assert.equal((h.match(/class="ultra-topic-image"/g)||[]).length,4,l.code);for(const f of media.slice(1))assert.ok(h.includes('src="/'+f+'"'),l.code+" missing "+f);}
});
test("photo layout is responsive and images below the fold are lazy loaded",()=>{
 const style=read("assets/ultra.css"),root=read("index.html");
 assert.ok(style.includes("grid-template-columns:repeat(4,minmax(0,1fr))"));
 assert.ok(style.includes("@media(max-width:1023px)"));
 assert.ok(style.includes("@media(max-width:760px)"));
 assert.ok(root.includes('fetchpriority="high" loading="eager"'));
 assert.equal((root.match(/loading="lazy"/g)||[]).length>=4,true);
 assert.ok(root.indexOf('id="languages"')<root.indexOf('class="ultra-gateway-gallery"'),"Must keep language choice above photos");
});
