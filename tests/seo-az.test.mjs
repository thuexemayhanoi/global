// SEO A–Z execution regressions (audit PR #119): FAQPage from visible FAQ text, sitemap lastmod from real dates,
// selective re-freeze, the Pillar rail label, the no-shift phone drawer, checklist references and host probes.
// They read the committed generated HTML like the other site tests.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {faqEntries,FAQ_HEADINGS,socialImageFor} from "../scripts/articles.mjs";
import {generateSitemaps,parseSitemapUrlset} from "../scripts/sitemaps.mjs";
import {selectiveRefreeze} from "../scripts/seo/selective-refreeze.mjs";
import {JS_FLAG} from "../scripts/navigation.mjs";
import {probeRedirectsAndHeaders} from "../scripts/seo/post-publish-qa.mjs";

const root=process.cwd();
const SITE="https://global.rentbikehanoi.com";
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const locales=JSON.parse(read("content/locales.json"));
const page=url=>read(url.slice(1)+"index.html");
const graph=html=>{const j=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);return j["@graph"]||[j];};
const published=matrix.rows.filter(r=>r.status==="PUBLISHED");
const packets=fs.readdirSync(path.join(root,"content/articles")).filter(f=>f.endsWith(".json")).map(f=>JSON.parse(read("content/articles/"+f)));

test("faqEntries reads bold-question and H3 FAQ blocks, keeps continuation paragraphs and needs two pairs",()=>{
 const md="## Intro\n\ntext\n\n## "+FAQ_HEADINGS.en+"\n\n**Can I rent?** Yes, [with a licence](https://example.gov/x).\n\nAsk first.\n\n**Kurz gesagt:** no question\n\n**Is a deposit normal?** Usually.\n\n## Next\n\n**Not in FAQ?** ignored";
 assert.deepEqual(faqEntries(md,"en"),[["Can I rent?","Yes, with a licence. Ask first. Kurz gesagt: no question"],["Is a deposit normal?","Usually."]]);
 const h3="## "+FAQ_HEADINGS.ja+"\n\n### 免許は必要？\n\n必要です。\n\n### 保証金は？\n\n店によります。";
 assert.deepEqual(faqEntries(h3,"ja"),[["免許は必要？","必要です。"],["保証金は？","店によります。"]]);
 assert.deepEqual(faqEntries("## "+FAQ_HEADINGS.en+"\n\n**Only one?** yes","en"),[],"one pair is not an FAQ page");
 assert.deepEqual(faqEntries("## FAQ\n\n**A?** b\n\n**C?** d","en"),[],"only the locale's FAQ heading counts");
});

test("FAQPage markup exists exactly where the page shows at least two FAQ pairs, and repeats visible questions",()=>{
 let pages=0;
 for(const p of packets){
  const row=published.find(r=>r.id===p.matrix_id);
  const html=page(row.url),faq=graph(html).find(n=>n["@type"]==="FAQPage"),pairs=faqEntries(p.body_markdown,p.locale);
  assert.equal(Boolean(faq),pairs.length>=2,p.matrix_id);
  if(!faq)continue;
  pages++;
  const visible=html.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ");
  for(const q of faq.mainEntity){
   assert.equal(q["@type"],"Question");
   assert.ok(visible.includes(q.name),p.matrix_id+" question not visible: "+q.name);
   assert.ok(q.acceptedAnswer.text.length>0,p.matrix_id);
  }
 }
 assert.ok(pages>300,"FAQ markup on the articles with visible FAQ sections ("+pages+")");
 for(const l of locales){
  const faq=graph(page("/"+l.code+"/")).find(n=>n["@type"]==="FAQPage");
  assert.deepEqual(faq.mainEntity.map(q=>q.name),l.faq.map(([q])=>q),l.code+" Pillar FAQPage mirrors its visible FAQ");
 }
});

test("sitemap <lastmod> is a real W3C date: each article's approval date, Hubs no older than their newest child",()=>{
 const files=generateSitemaps(["index.html","en/index.html","en/guides/a/index.html"],["en"],SITE,new Map([[SITE+"/en/guides/a/","2026-10-15"]]));
 assert.match(files["sitemap-en.xml"],/<url><loc>https:\/\/global\.rentbikehanoi\.com\/en\/guides\/a\/<\/loc><lastmod>2026-10-15<\/lastmod><\/url>/);
 assert.match(files["sitemap-en.xml"],/<url><loc>https:\/\/global\.rentbikehanoi\.com\/en\/<\/loc><\/url>/,"no invented date");
 assert.deepEqual(parseSitemapUrlset(files["sitemap-en.xml"]),["/en/","/en/guides/a/"]);
 assert.throws(()=>generateSitemaps(["en/index.html"],["en"],SITE,new Map([[SITE+"/en/","yesterday"]])),/Invalid lastmod/);
 const live=new Map();
 for(const f of fs.readdirSync(root).filter(n=>/^sitemap-[a-z]{2}\.xml$/.test(n)))
  for(const m of read(f).matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g))live.set(m[1],m[2]||null);
 const byId=new Map(published.map(r=>[r.id,r]));
 for(const p of packets){
  const row=byId.get(p.matrix_id),date=live.get(SITE+row.url);
  if(row.role==="SUPPORT")assert.equal(date,p.publication.approved_at.slice(0,10),row.id);
  else assert.ok(date>=p.publication.approved_at.slice(0,10),row.id);
 }
 for(const l of locales)assert.equal(live.get(SITE+"/"+l.code+"/"),null,l.code+" Pillar has no recorded date, so no lastmod");
});

test("selective re-freeze accepts only the reviewed additions and exact before/after pairs",()=>{
 const html=(title,types)=>'<html lang="en"><head><title>'+title+'</title><link rel="canonical" href="'+SITE+'/en/x/"><meta name="description" content="d"><script type="application/ld+json">'+JSON.stringify({"@graph":types.map(t=>({"@type":t}))})+'</script></head><body><h1>H</h1></body></html>';
 const reg={version:1,urls:[{url:"/en/x/",fingerprint:{lang:"en",canonical:SITE+"/en/x/",robots:"index,follow (default)",title:"Old",description:"d",h1:"H",h1_count:1,hreflang:{},schema_types:["Article"]},content:{main_words:1,h2:[]}}]};
 const ok=selectiveRefreeze(reg,{"en/x/index.html":html("New",["Article","FAQPage"])},{schemaAdd:["FAQPage"],changes:[{url:"/en/x/",field:"title",before:"Old",after:"New"}]});
 assert.deepEqual(ok.errors,[]);
 assert.deepEqual(ok.registry.urls[0].fingerprint.schema_types,["Article","FAQPage"]);
 assert.equal(ok.registry.urls[0].fingerprint.title,"New");
 assert.deepEqual(ok.registry.urls[0].content,reg.urls[0].content,"content snapshot untouched");
 assert.ok(selectiveRefreeze(reg,{"en/x/index.html":html("New",["Article"])},{schemaAdd:["FAQPage"]}).errors.length,"unreviewed title change refused");
 assert.ok(selectiveRefreeze(reg,{"en/x/index.html":html("Old",["Article","HowTo"])},{schemaAdd:["FAQPage"]}).errors.length,"unlisted type refused");
 assert.ok(selectiveRefreeze(reg,{"en/x/index.html":html("Old",[])},{schemaAdd:["FAQPage"]}).errors.length,"lost type refused");
});

test("articles preview their topic picture and name it as the Article image; the rail names the Pillar guide",()=>{
 for(const r of published.filter(r=>/^\/[a-z]{2}\/(?:topics|guides)\//.test(r.url))){
  const html=page(r.url),img=socialImageFor(r);
  assert.ok(html.includes('<meta property="og:image" content="'+SITE+img.path+'">'),r.id);
  const rail=html.match(/<nav class="premium-related"[^>]*>[\s\S]*?<a href="\/[a-z]{2}\/">([^<]+)<\/a>/);
  const pillar=published.find(p=>p.id===r.locale.toUpperCase()+"-HOME");
  assert.ok(rail,r.id);
  assert.notEqual(rail[1].toLowerCase(),pillar.primary_query.toLowerCase(),r.id+" rail anchor is the guide name, not the bare head keyword");
 }
});

test("the phone drawer starts collapsed with JavaScript (no layout shift) and stays open without it",()=>{
 assert.match(read("assets/navigation.css"),/\.js \.nav2-drawer:not\(\[data-nav-ready\]\)>\.nav2-main\{display:none\}/);
 assert.ok(read("assets/premium.js").includes('menu.setAttribute("data-nav-ready","")'));
 for(const r of published){
  const html=page(r.url);
  if(!html.includes('class="nav2-drawer"'))continue;
  assert.ok(html.includes('<details class="nav2-drawer" open>'),r.id+" no-JS drawer stays open");
  const head=html.slice(0,html.indexOf("</head>"));
  assert.equal(head.split(JS_FLAG).length-1,1,r.id+" one js flag in the head");
 }
});

test("each locale checklist cites official HTTPS references in a references section",()=>{
 for(const l of locales){
  const html=page("/"+l.code+"/checklist/");
  const refs=html.match(/<section class="article-references"><h2[^>]*>[^<]+<\/h2><ol>([\s\S]*?)<\/ol><\/section>/);
  assert.ok(refs,l.code);
  const hrefs=[...refs[1].matchAll(/href="(https:\/\/[^"]+)"/g)].map(m=>m[1]);
  assert.ok(hrefs.length>=4,l.code);
  assert.ok(hrefs.some(h=>/chinhphu\.vn/.test(h)),l.code+" cites the Vietnamese government portal");
 }
});

test("host probes report advisories and never throw",async()=>{
 const res=(status,headers={})=>({status,headers:{get:k=>headers[k.toLowerCase()]??null}});
 const fetcher=async(url)=>{
  if(url.startsWith("http://"))return res(301,{location:SITE+"/"});
  if(url===SITE+"/vi")return res(301,{location:SITE+"/vi/"});
  if(url.includes("www."))throw Object.assign(Error("fetch failed"),{cause:{code:"ENOTFOUND"}});
  return res(200,{"content-type":"text/html; charset=utf-8"});
 };
 const out=await probeRedirectsAndHeaders(fetcher,SITE);
 assert.ok(out.advisories.some(a=>/www\./.test(a)&&/ENOTFOUND/.test(a)));
 assert.ok(out.advisories.some(a=>/Strict-Transport-Security/.test(a)));
 assert.ok(!out.advisories.some(a=>a.includes("http://global")),"HTTPS redirect accepted");
 assert.equal(out.evidence.length,4);
});
