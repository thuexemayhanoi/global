// SEO V10 regression tests: breadcrumb integrity, social/schema metadata, spread of internal links,
// image alt text and the sitemap file grammar. They read the committed generated HTML like the other site tests.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {renderArticle,topicLinks,SOCIAL_IMAGE} from "../scripts/articles.mjs";
import {sitemapFilePattern,SITEMAP_CHILD} from "../scripts/sitemaps.mjs";
import {loadTopicalMap} from "../scripts/seo/topical-authority-core.mjs";

const root=process.cwd();
const SITE="https://global.rentbikehanoi.com";
const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8"));
const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8"));
const read=url=>fs.readFileSync(path.join(root,url.slice(1),"index.html"),"utf8");
const graph=html=>{const j=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);return j["@graph"]||[j];};
const published=matrix.rows.filter(r=>r.status==="PUBLISHED");
const articles=published.filter(r=>(r.role==="HUB"||r.role==="SUPPORT")&&/^\/[a-z]{2}\/(?:topics|guides)\//.test(r.url));

test("Hub breadcrumbs run Global › Language › Hub and never list one URL twice",()=>{
 for(const hub of published.filter(r=>r.role==="HUB")){
  const html=read(hub.url);
  const crumb=graph(html).find(n=>n["@type"]==="BreadcrumbList");
  const items=crumb.itemListElement.map(i=>i.item);
  assert.equal(items.length,3,hub.id);
  assert.equal(new Set(items).size,3,hub.id+" repeats a breadcrumb URL");
  assert.equal(items[0],SITE+"/",hub.id);
  assert.equal(items[1],SITE+"/"+hub.locale+"/",hub.id);
  assert.equal(items[2],SITE+hub.url,hub.id);
  assert.match(html,/<nav class="crumb" aria-label="Breadcrumb"><a href="\/">Global<\/a>/,hub.id);
 }
});

test("Supporting breadcrumbs run Language › Hub › Guide and end on the page itself",()=>{
 for(const r of articles.filter(r=>r.role==="SUPPORT")){
  const items=graph(read(r.url)).find(n=>n["@type"]==="BreadcrumbList").itemListElement.map(i=>i.item);
  assert.equal(items.length,3,r.id);
  assert.equal(new Set(items).size,3,r.id);
  assert.equal(items[2],SITE+r.url,r.id);
 }
});

test("every Hub and Supporting page carries site name, social image, card type and a publisher-backed Article",()=>{
 for(const r of articles){
  const html=read(r.url);
  assert.ok(html.includes('<meta property="og:site_name" content="Vietnam Two-Wheel Guide">'),r.id);
  assert.ok(html.includes('<meta property="og:image" content="'+SITE+SOCIAL_IMAGE.path+'">'),r.id);
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'),r.id);
  const article=graph(html).find(n=>n["@type"]==="Article");
  assert.equal(article.publisher?.name,"Vietnam Two-Wheel Guide",r.id);
  assert.equal(article.isPartOf?.url,SITE+"/",r.id);
  const packetPath=path.join(root,"content/articles",r.id+".json");
  if(fs.existsSync(packetPath)){
   const packet=JSON.parse(fs.readFileSync(packetPath,"utf8"));
   if(packet.publication?.approved_at){
    assert.equal(article.datePublished,packet.publication.approved_at,r.id+" datePublished must be the recorded approval time");
    assert.equal(article.dateModified,packet.publication.approved_at,r.id);
   }else assert.equal(article.datePublished,undefined,r.id+" must not invent a date");
  }
 }
});

test("sibling links keep the silo first and still spread across each Hub",()=>{
 const topical=loadTopicalMap(root);
 const silo=r=>topical.locales?.[r.locale]?.existing?.[r.id]||r.subcluster||"";
 const guides=published.filter(r=>r.role==="SUPPORT"&&r.url.includes("/guides/"));
 const byParent=new Map(),byUrl=new Map(guides.map(g=>[g.url,g]));
 for(const g of guides){if(!byParent.has(g.parent_id))byParent.set(g.parent_id,[]);byParent.get(g.parent_id).push(g);}
 const mates=g=>byParent.get(g.parent_id).filter(r=>r.id!==g.id&&silo(r)===silo(g)).length;
 const inbound=new Map(guides.map(g=>[g.url,0]));
 for(const g of guides){
  const html=read(g.url);
  const section=html.match(/<section class="topic-guides topic-guides--siblings">([\s\S]*?)<\/section>/);
  const n=byParent.get(g.parent_id).length;
  if(n===1){assert.equal(section,null,g.id+" has no siblings and must not render an empty section");continue;}
  assert.ok(section,g.id+" must list siblings");
  const hrefs=[...section[1].matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(hrefs.length,Math.min(6,n-1),g.id);
  assert.equal(new Set(hrefs).size,hrefs.length,g.id+" repeats a sibling");
  assert.ok(!hrefs.includes(g.url),g.id+" links itself");
  for(const h of hrefs){assert.ok(inbound.has(h),g.id+" links a non-guide "+h);inbound.set(h,inbound.get(h)+1);}
  const sameSilo=hrefs.filter(h=>silo(byUrl.get(h))===silo(g)).length;
  assert.equal(sameSilo,Math.min(6,mates(g)),g.id+" must link its silo-mates before other silos");
 }
 const counts=[];
 for(const g of guides){
  const got=inbound.get(g.url);counts.push(got);
  assert.ok(got>=Math.min(6,mates(g)),g.id+" has only "+got+" inbound sibling links for "+mates(g)+" silo-mates");
 }
 counts.sort((a,b)=>a-b);
 console.log("sibling inbound: guides="+counts.length+" min="+counts[0]+" median="+counts[Math.floor(counts.length/2)]+" max="+counts[counts.length-1]);
});

test("topicLinks keeps the same-silo-first order for a guide and walks a cyclic window",()=>{
 const topical={locales:{en:{existing:{"EN-S01":"a","EN-S02":"a","EN-S03":"a","EN-S04":"b","EN-S05":"b","EN-S06":"b","EN-S07":"b","EN-S08":"b"},cluster_labels:{a:"A",b:"B"}}}};
 const row=(id,i)=>({id,locale:"en",role:"SUPPORT",parent_id:"EN-H01",status:"PUBLISHED",priority:30+i,url:"/en/guides/"+id.toLowerCase()+"/",working_title:"Title "+id});
 const rows=[{id:"EN-HOME",locale:"en",role:"PILLAR",parent_id:null,status:"PUBLISHED",priority:1,url:"/en/",working_title:"home"},{id:"EN-H01",locale:"en",role:"HUB",parent_id:"EN-HOME",status:"PUBLISHED",priority:2,url:"/en/topics/h/",working_title:"hub"},...Array.from({length:8},(_,i)=>row("EN-S0"+(i+1),i))];
 const m={rows};
 const links=id=>[...topicLinks(rows.find(r=>r.id===id),m,topical,"en").matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(links("EN-S01"),["/en/guides/en-s02/","/en/guides/en-s03/","/en/guides/en-s04/","/en/guides/en-s05/","/en/guides/en-s06/","/en/guides/en-s07/"],"same silo first, then the next silo in order");
 assert.deepEqual(links("EN-S08"),["/en/guides/en-s04/","/en/guides/en-s05/","/en/guides/en-s06/","/en/guides/en-s07/","/en/guides/en-s03/","/en/guides/en-s01/"],"the last guide of a silo still links every silo-mate, then wraps into the other silo at its own offset");
 const inbound={};
 for(const r of rows.slice(2))for(const h of links(r.id))inbound[h]=(inbound[h]||0)+1;
 assert.equal(Object.values(inbound).reduce((a,b)=>a+b,0),48,"six links per guide");
 for(const r of rows.slice(2)){const mates=(topical.locales.en.existing[r.id]==="a"?3:5)-1;assert.ok(inbound[r.url]>=Math.min(6,mates)&&inbound[r.url]>=5,r.id+" "+inbound[r.url]);}
});

test("renderArticle builds a three-level trail for Hubs and guides without repeating URLs",()=>{
 const locale={code:"de",htmlLang:"de",name:"Deutsch"};
 const pillar={id:"DE-HOME",locale:"de",role:"PILLAR",status:"PUBLISHED",url:"/de/",working_title:"Motorrad mieten Hanoi"};
 const hub={id:"DE-H01",locale:"de",role:"HUB",parent_id:"DE-HOME",status:"PUBLISHED",url:"/de/topics/x/",working_title:"Hub X"};
 const guide={id:"DE-S01",locale:"de",role:"SUPPORT",parent_id:"DE-H01",status:"PUBLISHED",url:"/de/guides/y/",working_title:"Guide Y"};
 const m={rows:[pillar,hub,guide]};
 const packet=t=>({title:t,meta_description:"Beschreibung "+t,h1:t,body_markdown:"## A\n\ntext",sources:[{url:"https://a.example/x",title:"A"}]});
 const hubHtml=renderArticle(packet("Hub X Titel für den Test"),locale,hub,m,null);
 const hubCrumb=graph(hubHtml).find(n=>n["@type"]==="BreadcrumbList").itemListElement;
 assert.deepEqual(hubCrumb.map(i=>i.item),[SITE+"/",SITE+"/de/",SITE+"/de/topics/x/"]);
 assert.deepEqual(hubCrumb.map(i=>i.name),["Global","Deutsch","Hub X Titel für den Test"]);
 assert.ok(hubHtml.includes('<nav class="crumb" aria-label="Breadcrumb"><a href="/">Global</a> <span aria-hidden="true">›</span> <a href="/de/">Deutsch</a></nav>'));
 const guideHtml=renderArticle({...packet("Guide Y Titel für den Test"),publication:{approved_at:"2026-10-15T10:29:56.537Z"}},locale,guide,m,null);
 const g=graph(guideHtml);
 assert.deepEqual(g.find(n=>n["@type"]==="BreadcrumbList").itemListElement.map(i=>i.item),[SITE+"/de/",SITE+"/de/topics/x/",SITE+"/de/guides/y/"]);
 const article=g.find(n=>n["@type"]==="Article");
 assert.equal(article.datePublished,"2026-10-15T10:29:56.537Z");
 assert.equal(article.publisher.logo.url,SITE+"/assets/favicon.svg");
 assert.equal(graph(hubHtml).find(n=>n["@type"]==="Article").datePublished,undefined,"no publication record, no date");
 assert.ok(guideHtml.includes('<meta property="og:image:width" content="1600">'));
});

test("the related rail starts at the locale home, never repeats or self-links, and holds at most five links",()=>{
 for(const r of articles){
  const html=read(r.url);
  const rail=html.match(/<nav class="premium-related"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(rail,r.id);
  const hrefs=[...rail[1].matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(hrefs[0],"/"+r.locale+"/",r.id);
  assert.ok(hrefs.length<=5,r.id);
  assert.equal(new Set(hrefs).size,hrefs.length,r.id);
  assert.ok(!hrefs.includes(r.url),r.id);
 }
});

test("the hero describes its artwork; gallery and topic-card images stay decorative next to their headings",()=>{
 const pages=["/",...locales.map(l=>"/"+l.code+"/")];
 for(const p of pages){
  const html=p==="/"?fs.readFileSync(path.join(root,"index.html"),"utf8"):read(p);
  const imgs=[...html.matchAll(/<img [^>]*>/g)];
  assert.ok(imgs.length>=4,p);
  for(const m of imgs){
   const img=m[0],alt=img.match(/\salt="([^"]*)"/);
   assert.ok(alt,p+" every image declares alt: "+img.slice(0,80));
   if(img.includes('src="/hero-hanoi'))assert.ok(alt[1].length>=20,p+" hero alt must describe the artwork");
   else{
    assert.equal(alt[1],"",p+" decorative illustration must not repeat its heading: "+img.slice(0,80));
    assert.ok(/<h3>/.test(html.slice(m.index,m.index+img.length+400)),p+" a decorative image must sit next to the heading that names it");
   }
  }
 }
 assert.ok(fs.readFileSync(path.join(root,"index.html"),"utf8").includes('src="/hero-hanoi.webp"'),"root renders the hero");
});

test("the build owns every shard name the sitemap grammar can produce for its locales, and nothing else",()=>{
 const own=sitemapFilePattern(locales.map(l=>l.code));
 for(const f of ["sitemap-main.xml","sitemap-en.xml","sitemap-ja-2.xml","sitemap-vi-10.xml","sitemap-de-123.xml"]){assert.ok(own.test(f),f);assert.ok(SITEMAP_CHILD.test(f),f);}
 for(const f of ["sitemap.xml","sitemap-xx.xml","sitemap-en-1.xml","sitemap-en-01.xml","sitemap-main-2.xml.bak","sitemap-en.xml.gz"])assert.ok(!own.test(f),f);
});
