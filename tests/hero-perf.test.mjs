// Hero LCP regression (root page): the illustration ships as three WebP sizes behind a truthful srcset/sizes
// pair, the only page that renders it carries exactly one matching preload hint, and no other page carries
// any. Reads the committed generated HTML like the other site tests.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {HERO_SRC,HERO_SRCSET,HERO_SIZES,heroPreloadLink} from "../scripts/ultra.mjs";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=JSON.parse(read("content/locales.json"));
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const pageOf=url=>url==="/"?"index.html":url.slice(1)+"index.html";
const PRELOAD='<link rel="preload" as="image" href="/hero-hanoi.webp" imagesrcset="'+HERO_SRCSET+'" imagesizes="'+HERO_SIZES+'" fetchpriority="high">';

/** Pixel size of a WebP file read from its container header (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(buf){
 assert.equal(buf.toString("latin1",0,4),"RIFF");
 assert.equal(buf.toString("latin1",8,12),"WEBP");
 const chunk=buf.toString("latin1",12,16);
 if(chunk==="VP8 "){assert.equal(buf.readUIntLE(23,3),0x2a019d,"VP8 key-frame start code");return {width:buf.readUInt16LE(26)&0x3fff,height:buf.readUInt16LE(28)&0x3fff};}
 if(chunk==="VP8L"){const b=buf.readUInt32LE(21);return {width:(b&0x3fff)+1,height:((b>>>14)&0x3fff)+1};}
 if(chunk==="VP8X")return {width:buf.readUIntLE(24,3)+1,height:buf.readUIntLE(27,3)+1};
 throw new Error("unknown WebP chunk "+chunk);
}

test("the hero ships as 800w, 1200w and 1600w WebP files whose real widths match the srcset descriptors",()=>{
 const expected={"hero-hanoi-800.webp":[800,450],"hero-hanoi-1200.webp":[1200,675],"hero-hanoi.webp":[1600,900]};
 const bytes={};
 for(const [file,[width,height]] of Object.entries(expected)){
  const buf=fs.readFileSync(path.join(root,file));
  assert.ok(buf.length>0,file);
  assert.deepEqual(webpSize(buf),{width,height},file);
  bytes[file]=buf.length;
 }
 assert.ok(bytes["hero-hanoi-800.webp"]<bytes["hero-hanoi-1200.webp"]&&bytes["hero-hanoi-1200.webp"]<bytes["hero-hanoi.webp"],"each smaller variant must weigh less than the next");
 assert.equal(HERO_SRC,"/hero-hanoi.webp");
 assert.equal(HERO_SRCSET,"/hero-hanoi-800.webp 800w, /hero-hanoi-1200.webp 1200w, /hero-hanoi.webp 1600w");
 for(const [file,[width]] of Object.entries(expected))assert.ok(HERO_SRCSET.split(", ").includes("/"+file+" "+width+"w"),file+" descriptor must equal its real width");
});

test("sizes mirrors the real hero layout in assets/ultra.css and the generated container width",()=>{
 assert.equal(HERO_SIZES,"(max-width: 767px) calc(100vw - 36px), (max-width: 880px) 520px, 470px");
 const ultra=read("assets/ultra.css"),base=read("assets/styles.css");
 assert.ok(base.includes(".container{width:min(1150px,calc(100% - 36px));margin-inline:auto}"),"18px gutter on each side");
 assert.ok(ultra.includes(".hero-inner.ultra-hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(270px,.78fr)"),"two columns above 880px");
 assert.ok(ultra.includes("@media(max-width:880px){.hero-inner.ultra-hero-grid{grid-template-columns:1fr"),"one column up to 880px");
 assert.ok(ultra.includes("@media(max-width:1023px){.ultra-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ultra-hero-photo{max-width:520px}"),"520px cap below 1024px");
 const phone=ultra.indexOf("@media(max-width:767px){");
 assert.ok(phone>0&&ultra.indexOf(".ultra-hero-photo{width:100%;max-width:100%;aspect-ratio:16/10}")>phone,"full container width up to 767px");
});

test("the root page renders the responsive hero and preloads exactly the same candidates before any stylesheet",()=>{
 const html=read("index.html");
 const img=(html.match(/<img [^>]*>/g)||[]).filter(t=>t.includes('src="/hero-hanoi.webp"'));
 assert.equal(img.length,1,"one hero image on the root page");
 assert.ok(img[0].includes('srcset="'+HERO_SRCSET+'" sizes="'+HERO_SIZES+'"'),img[0]);
 assert.ok(img[0].includes('width="1600" height="900"'),"intrinsic size keeps CLS at zero");
 assert.ok(img[0].includes('fetchpriority="high" loading="eager" decoding="async"'),img[0]);
 assert.match(img[0],/\salt="[^"]{3,}"/,"descriptive alt text stays");
 assert.equal(heroPreloadLink(),PRELOAD);
 assert.equal(html.split(PRELOAD).length-1,1,"exactly one hero preload hint");
 assert.equal(html.split('rel="preload"').length-1,1,"no other preload hints");
 const at=html.indexOf(PRELOAD);
 assert.ok(at>html.indexOf("<head>")&&at<html.indexOf("</head>"),"preload sits in the head");
 assert.ok(at<html.indexOf('<link rel="stylesheet"'),"preload precedes the first stylesheet");
 assert.ok(html.includes('<meta property="og:image" content="https://global.rentbikehanoi.com/hero-hanoi.webp">'),"social preview still uses the 1600×900 original");
});

test("no other page renders the hero photo or carries a preload hint (locale homes, checklists, utilities, articles)",()=>{
 const pages=new Set([
  ...locales.map(l=>l.code+"/index.html"),
  ...locales.map(l=>l.code+"/checklist/index.html"),
  "search/index.html","404.html","about/index.html","contact/index.html","privacy/index.html","terms/index.html",
  ...matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>pageOf(r.url))
 ]);
 pages.delete("index.html");
 let checked=0,articles=0;
 for(const p of pages){
  if(!fs.existsSync(path.join(root,p)))continue;
  const html=read(p);checked++;
  assert.ok(!html.includes('src="/hero-hanoi.webp"'),p+" must not render the root hero");
  assert.ok(!html.includes('rel="preload"'),p+" must not preload the hero");
  if(/\/(?:topics|guides)\//.test(p))articles++;
 }
 assert.ok(checked>=26,"locale homes, checklists and utility pages were checked");
 assert.ok(articles>0,"article pages were checked");
});
