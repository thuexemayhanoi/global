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

test("sitemap <lastmod> is a real W3C date: each article's approval date, Hubs no older than their newest child, Pillars/checklists their last reviewed change",()=>{
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
  const reviewed=JSON.parse(read("data/seo/page-updates.json")).pages[row.url];
  const approved=p.publication.approved_at.slice(0,10),modified=reviewed?[approved,...reviewed.updates.map(u=>u.date)].sort().pop():approved;
  // A Supporting page's lastmod is its approval date, or its last reviewed body change recorded in page-updates.json.
  if(row.role==="SUPPORT")assert.equal(date,modified,row.id);
  else assert.ok(date>=p.publication.approved_at.slice(0,10),row.id);
 }
 const updates=JSON.parse(read("data/seo/page-updates.json")).pages;
 for(const l of locales)for(const p of ["/"+l.code+"/","/"+l.code+"/checklist/"]){
  const e=updates[p],modified=[e.published,...e.updates.map(u=>u.date)].sort().pop();
  assert.equal(live.get(SITE+p),modified,p+" lastmod is its last reviewed content change (data/seo/page-updates.json)");
  const html=read(p.slice(1)+"index.html");
  assert.ok(html.includes('"datePublished":"'+e.published+'"')&&html.includes('"dateModified":"'+modified+'"'),p+" JSON-LD carries the recorded dates");
 }
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
 // --robots: a default-robots URL may gain exactly the reviewed value; anything restricting indexing is refused (TECH-01).
 const withRobots=v=>html("Old",["Article"]).replace("<head>",'<head><meta name="robots" content="'+v+'">');
 const r=selectiveRefreeze(reg,{"en/x/index.html":withRobots("max-image-preview:large")},{robots:"max-image-preview:large"});
 assert.deepEqual(r.errors,[]);assert.equal(r.registry.urls[0].fingerprint.robots,"max-image-preview:large");
 assert.ok(selectiveRefreeze(reg,{"en/x/index.html":withRobots("noindex")},{robots:"noindex"}).errors.length,"noindex refused");
 assert.ok(selectiveRefreeze(reg,{"en/x/index.html":withRobots("max-snippet:0")},{robots:"max-image-preview:large"}).errors.length,"other robots value refused");
 // h2: one frozen heading may take the exact reviewed wording (a factual correction); the rest of the outline stays protected.
 const withH2=(...hs)=>html("Old",["Article"]).replace("<h1>H</h1>","<main><h1>H</h1>"+hs.map(h=>"<h2>"+h+"</h2>").join("")+"</main>");
 const regH={...reg,urls:[{...reg.urls[0],content:{main_words:1,h2:["12 steps","Keep"]}}]};
 const h2ok=selectiveRefreeze(regH,{"en/x/index.html":withH2("11 steps","Keep")},{changes:[{url:"/en/x/",field:"h2",before:"12 steps",after:"11 steps"}]});
 assert.deepEqual(h2ok.errors,[]);assert.deepEqual(h2ok.registry.urls[0].content.h2,["11 steps","Keep"]);
 assert.ok(selectiveRefreeze(regH,{"en/x/index.html":withH2("Eleven","Keep")},{changes:[{url:"/en/x/",field:"h2",before:"12 steps",after:"11 steps"}]}).errors.length,"rendered H2 must be the reviewed after-value");
 assert.ok(selectiveRefreeze(regH,{"en/x/index.html":withH2("11 steps","Keep")},{changes:[{url:"/en/x/",field:"h2",before:"13 steps",after:"11 steps"}]}).errors.length,"before-value must be frozen");
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

test("A–Z reviewed metadata rows are applied, within width limits, frozen and keep the visible lead",()=>{
 const width=s=>[...s].reduce((n,c)=>n+(/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u.test(c)?2:1),0);
 const dir="docs/seo-audit/execution/",sets=fs.readdirSync(path.join(root,dir)).filter(f=>/^metadata-reviews(-[a-z0-9-]+)?\.json$/.test(f));
 // A later round (metadata-reviews-<name>.json, applied after the unnamed first round) supersedes an earlier row for the same URL.
 const latest=new Map();
 for(const f of sets.sort((a,b)=>(a==="metadata-reviews.json"?-1:b==="metadata-reviews.json"?1:a.localeCompare(b))))for(const r of JSON.parse(read(dir+f)))latest.set(r.id,r);
 const reviews=[...latest.values()];
 const freeze=new Map(JSON.parse(read("data/seo/url-freeze.json")).urls.map(u=>[u.url,u.fingerprint]));
 const leads=JSON.parse(read("content/article-leads.json")).leads;
 assert.ok(reviews.length>=100);
 for(const r of reviews){
  const p=JSON.parse(read("content/articles/"+r.id+".json"));
  assert.equal(p.title,r.after_title,r.id);
  assert.equal(p.meta_description,r.after_description,r.id);
  if(r.after_title!==r.before_title)assert.ok(width(r.after_title)<=60,r.id+" title width");
  if(r.after_description!==r.before_description){
   assert.ok(width(r.after_description)<=200&&r.after_description.length>=80,r.id+" description bounds");
   assert.ok(typeof leads[r.id]==="string"&&leads[r.id].trim(),r.id+" visible lead kept in the sidecar");
   const lead=page(r.url).match(/<p class="article-lead">([^<]*)<\/p>/)[1].replace(/&amp;/g,"&").replace(/&quot;/g,'"');
   assert.equal(lead,leads[r.id],r.id+" page shows the preserved lead, not the new description");
  }
  assert.equal(freeze.get(r.url).title,r.after_title,r.id+" frozen title");
  assert.equal(freeze.get(r.url).description,r.after_description,r.id+" frozen description");
 }
});

test("source re-check finds the priced paragraphs and classifies each against the live source (offline mock)",async()=>{
 const {pricedParagraphs,recheck}=await import("../scripts/seo/source-recheck.mjs");
 const packet={matrix_id:"EN-X",locale:"en",body_markdown:"## Costs\n\nRental from 150,000 VND per day at [Shop](https://shop.example.vn/p) and a deposit of 2,000,000 VND.\n\n## Other\n\nNo price here."};
 const paras=pricedParagraphs(packet);
 assert.equal(paras.length,1);
 assert.deepEqual(paras[0].urls,["https://shop.example.vn/p"]);
 const html=body=>({status:200,headers:{get:()=>"text/html; charset=utf-8"},text:async()=>body});
 const partial=await recheck([packet],async()=>html("<p>Giá thuê từ 150.000 đồng/ngày</p>"));
 assert.equal(partial.results[0].paragraphs[0].outcome,"PARTIAL");
 const all=await recheck([packet],async()=>html("<p>150.000đ/ngày, đặt cọc 2.000.000đ</p>"));
 assert.equal(all.results[0].paragraphs[0].outcome,"VERIFIED");
 const {sourceAmounts}=await import("../scripts/seo/source-recheck.mjs");
 assert.ok(sourceAmounts("Battery rental is set at VNĐ200,000 per month; swaps VNĐ9,000","en").has(200000),"VNĐ prefix is read");
 assert.ok(sourceAmounts("Phạt tiền từ 8 triệu đồng đến 10 triệu đồng","vi").has(10000000),"triệu amounts are read");
 const down=await recheck([packet],async()=>{throw Object.assign(Error("fetch failed"),{cause:{code:"ECONNRESET"}});});
 assert.equal(down.results[0].paragraphs[0].outcome,"UNREACHABLE");
 assert.ok(read(".github/workflows/source-recheck.yml").includes("contents: read"),"read-only workflow");
});

test("PT pages keep one Portuguese variant: European Portuguese body, variant-neutral Pillar wording (S-PT-VARIANT)",()=>{
 const files=[];
 const walk=d=>{for(const e of fs.readdirSync(path.join(root,d),{withFileTypes:true}))e.isDirectory()?walk(d+"/"+e.name):e.name.endsWith(".html")&&files.push(d+"/"+e.name);};
 walk("pt");
 assert.ok(files.length>=90);
 for(const f of files)assert.ok(!/\baluguel\b/i.test(read(f)),f+" uses the pt-BR noun 'aluguel' next to pt-PT body text");
 assert.match(read("pt/index.html"),/<title>Alugar moto em Hanói: guia e checklist<\/title>/);
 assert.ok(read("pt/guides/dia-semana-mes/index.html").includes(">Guia para alugar moto em Hanói</a>"),"rail anchor to the Pillar");
});

test("selective re-freeze is idempotent for an already applied reviewed change",()=>{
 const html='<html lang="pt"><head><title>B</title></head><body><h1>H</h1></body></html>';
 const reg={urls:[{url:"/pt/x/",fingerprint:{title:"B"}}]};
 const once=selectiveRefreeze(reg,{"pt/x/index.html":html},{changes:[{url:"/pt/x/",field:"title",before:"A",after:"B"}]});
 assert.ok(!once.errors.some(e=>/title/.test(e)),"already applied title change is not an error");
 assert.ok(!once.changed.some(c=>c.field==="title"),"and is not counted as a new change");
});

test("topic photos ship 480w and 720w variants with srcset/sizes on the root gallery and the locale topic cards (S-PSI-MOBILE)",async()=>{
 const {TOPIC_SIZES}=await import("../scripts/ultra.mjs");
 for(const n of ["topic-choose-bike","topic-prices-deposits","topic-documents","topic-safety"]){
  const small=fs.readFileSync(path.join(root,n+"-480.webp")),big=fs.readFileSync(path.join(root,n+".webp"));
  assert.equal(small.toString("ascii",8,12),"WEBP",n);
  assert.ok(small.length<big.length/2,n+" variant is at least half the size");
  assert.equal(fs.readFileSync(path.join(root,n+"-720.webp")).toString("ascii",8,12),"WEBP",n+" 720w");
  const srcset='srcset="/'+n+'-480.webp 480w, /'+n+'-720.webp 720w, /'+n+'.webp 960w"';
  assert.ok(read("index.html").includes(srcset+' sizes="'+TOPIC_SIZES.gallery+'"'),n+" root gallery");
  for(const code of ["vi","en","de","fr","es","nl","zh","pt","ko","ja"])assert.ok(read(code+"/index.html").includes(srcset+' sizes="'+TOPIC_SIZES.card+'"'),n+" "+code+" topic card");
 }
});

test("Japanese FAQ questions ending in か。 are recognised; checklist Article graphs carry an image",async()=>{
 const md="## よくある質問\n\n**ヘルメットは必要ですか。** はい、必要です。\n\n**子どもも乗れますか。** 条件があります。\n";
 assert.equal(faqEntries(md,"ja").length,2);
 assert.equal(faqEntries("## よくある質問\n\n**これは説明です。** 本文。\n\n**もう一つの文。** 本文。\n","ja").length,0,"a plain sentence is not a question");
 for(const code of ["vi","en","de","fr","es","nl","zh","pt","ko","ja"]){
  const graph=JSON.parse(page("/"+code+"/checklist/").match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  const article=graph.find(n=>n["@type"]==="Article");
  assert.equal(article.image["@type"],"ImageObject",code);
 }
});

test("execution ledger gives every baseline finding exactly one final outcome",()=>{
 const csv=f=>{const [h,...rows]=read(f).replace(/^﻿/,"").trim().split(/\r?\n/);return {h:h.split(","),n:rows.length};};
 const base=read("reports/seo/data/baseline-20261027/findings.csv").replace(/^﻿/,"").trim().split(/\r?\n/).slice(1).map(l=>l.split(",")[0]);
 const summary=JSON.parse(read("docs/seo-audit/execution/ledger-summary.json"));
 assert.equal(summary.baseline_findings,base.length);
 const total=Object.values(summary.outcomes).reduce((a,b)=>a+b,0);
 assert.equal(total,base.length,"every baseline finding has an outcome");
 assert.equal(csv("docs/seo-audit/execution/execution-ledger.csv").n>=base.length,true);
 const allowed=new Set(["FIXED_VERIFIED","FIXED_PENDING_LIVE","VALIDATED_NO_FIX","DUPLICATE","EXTERNAL_DEPENDENCY","BLOCKED"]);
 for(const k of Object.keys(summary.outcomes))assert.ok(allowed.has(k),k);
 assert.equal(summary.complete,summary.outcomes.FIXED_PENDING_LIVE===0,"complete only when nothing waits for production");
});

test("each locale Pillar targets its researched commercial head term in title and H1 (S-PILLAR-HEAD-TERM, owner directive 2026-10-28)",()=>{
 const terms=JSON.parse(fs.readFileSync(path.join(root,"data/seo/commercial-head-terms.json"),"utf8")).locales;
 const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8"));
 const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8")).rows;
 const fold=(s,loc)=>{const t=String(s||"").toLowerCase().replace(/đ/g,"d").replace(/\s+/g," ").trim();return loc==="zh"||loc==="ja"?t.replace(/ /g,""):t;};
 assert.equal(locales.length,10);
 for(const l of locales){
  const ht=terms[l.code];
  assert.ok(ht?.head_term,"head term for "+l.code);
  assert.ok(ht.evidence.length&&ht.evidence.every(e=>e.keyword&&e.source),"evidence with a source for "+l.code);
  const variants=[ht.head_term,...ht.title_variants].map(v=>fold(v,l.code));
  const pillar=matrix.find(r=>r.role==="PILLAR"&&r.locale===l.code);
  assert.match(pillar.search_intent,/^commercial/);
  for(const [field,value] of [["primary_query",pillar.primary_query],["title",l.title],["h1",l.h1]])
   assert.ok(variants.some(v=>fold(value,l.code).includes(v)),`${l.code} ${field} "${value}" lacks the head term`);
  const html=fs.readFileSync(path.join(root,l.code,"index.html"),"utf8");
  assert.ok(html.includes(">"+l.h1.replace(/&/g,"&amp;").replace(/'/g,"&#39;")+"<")||html.includes(l.h1),l.code+" H1 rendered");
 }
});

test("each locale Pillar answers the commercial-investigation questions: ordered rental steps, provider criteria and FAQPage = visible FAQ (batch I)",()=>{
 const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8"));
 for(const l of locales){
  const html=fs.readFileSync(path.join(root,l.code,"index.html"),"utf8");
  const steps=html.match(/<ol class="section-list section-steps">([\s\S]*?)<\/ol>/);
  assert.ok(steps,l.code+" ordered steps rendered");
  assert.ok((steps[1].match(/<li>/g)||[]).length>=5,l.code+" at least five steps");
  assert.ok(l.extraSections.length>=3&&l.extraSections.some(s=>(s.bullets||[]).length>=5),l.code+" provider criteria section");
  assert.ok(l.faq.length>=5,l.code+" five FAQ entries");
  assert.equal((html.match(/"@type":"Question"/g)||[]).length,l.faq.length,l.code+" FAQPage mirrors the visible FAQ");
 }
});

test("each locale price Hub (rental-costs) names its commercial head term in the title, distinct from the Pillar title (batch P)",()=>{
 const terms=JSON.parse(read("data/seo/commercial-head-terms.json")).locales;
 const fold=(s,loc)=>{const t=String(s||"").toLowerCase().replace(/đ/g,"d").replace(/\s+/g," ").trim();return loc==="zh"||loc==="ja"?t.replace(/ /g,""):t;};
 for(const l of locales){
  const hub=matrix.rows.find(r=>r.role==="HUB"&&r.locale===l.code&&r.cluster==="rental-costs");
  const p=packets.find(x=>x.matrix_id===hub.id),ht=terms[l.code];
  const variants=[ht.head_term,...ht.title_variants].map(v=>fold(v,l.code));
  assert.ok(variants.some(v=>fold(p.title,l.code).includes(v)),`${hub.id} title "${p.title}" lacks the head term`);
  assert.notEqual(fold(p.title,l.code),fold(l.title,l.code),hub.id+" title differs from the Pillar title");
  assert.ok(page(hub.url).includes("<title>"+p.title.replace(/&/g,"&amp;").replace(/'/g,"&#39;")),hub.id+" title rendered");
 }
});

test("the site-wide menu names each published Hub by its Matrix title, never a generic 'current guide' label (batch R)",()=>{
 const generic=["Xem hướng dẫn","Current guide","Aktueller Ratgeber","Guide disponible","Guía disponible","Bestaande gids","当前指南","Guia disponível","현재 가이드","公開中のガイド"];
 const enc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 for(const l of locales){
  const hubs=matrix.rows.filter(r=>r.locale===l.code&&r.role==="HUB"&&r.status==="PUBLISHED");
  assert.equal(hubs.length,4,l.code);
  const supporting=published.find(r=>r.locale===l.code&&r.role==="SUPPORT");
  for(const html of [page("/"+l.code+"/"),page(supporting.url)]){
   for(const hub of hubs)
    assert.ok(html.includes('<a class="nav2-parent-link" href="'+hub.url+'">'+enc(hub.working_title)+' <span aria-hidden="true">→</span></a>'),hub.id+" menu link names the Hub");
   const links=html.match(/<a class="nav2-parent-link"[^>]*>[^<]*/g)||[];
   assert.equal(links.length,4,l.code);
   assert.ok(links.every(a=>!generic.some(g=>a.includes(">"+g))),l.code+" no generic Hub anchor");
  }
 }
});

test("every Hub answers three or more visible FAQ questions, mirrored by FAQPage, with no number the body does not state (batch S)",()=>{
 const hubs=published.filter(r=>r.role==="HUB");
 assert.equal(hubs.length,40);
 for(const hub of hubs){
  const p=packets.find(x=>x.matrix_id===hub.id),faq=faqEntries(p.body_markdown,hub.locale);
  assert.ok(faq.length>=3,hub.id+" visible FAQ");
  const html=page(hub.url),node=graph(html).find(n=>n["@type"]==="FAQPage");
  assert.equal(node?.mainEntity.length,faq.length,hub.id+" FAQPage mirrors the visible FAQ");
  const heading="## "+FAQ_HEADINGS[hub.locale],start=p.body_markdown.indexOf(heading),after=p.body_markdown.indexOf("\n## ",start+heading.length);
  const rest=p.body_markdown.slice(0,start)+(after<0?"":p.body_markdown.slice(after));
  const stated=new Set(rest.match(/\d+/g)||[]);
  for(const [q,a] of faq)for(const n of (q+" "+a).match(/\d+/g)||[])assert.ok(stated.has(n),hub.id+" FAQ number "+n+" is stated elsewhere in the body");
 }
});

test("every price/deposit and documents/contract Supporting page answers visible FAQ questions, mirrored by FAQPage, with no number the body does not state (batches T, U)",()=>{
 const pages=published.filter(r=>r.role==="SUPPORT"&&["rental-costs","documents-contracts"].includes(r.cluster)&&packets.some(x=>x.matrix_id===r.id));
 assert.ok(pages.length>=59+172);
 const added=new Set(["t","u"].flatMap(x=>Object.keys(JSON.parse(read("docs/seo-audit/execution/support-faq-"+x+".json")).pages)));
 assert.equal(added.size,57+114);
 for(const row of pages){
  const p=packets.find(x=>x.matrix_id===row.id),faq=faqEntries(p.body_markdown,row.locale);
  assert.ok(faq.length>=2,row.id+" visible FAQ");
  assert.equal(graph(page(row.url)).find(n=>n["@type"]==="FAQPage")?.mainEntity.length,faq.length,row.id+" FAQPage mirrors the visible FAQ");
  const heading="## "+FAQ_HEADINGS[row.locale],start=p.body_markdown.indexOf(heading),after=p.body_markdown.indexOf("\n## ",start+heading.length);
  const stated=new Set((p.body_markdown.slice(0,start)+(after<0?"":p.body_markdown.slice(after))).match(/\d+/g)||[]);
  // Number grounding applies to the FAQ sections batches T and U added (older FAQs predate this rule).
  if(added.has(row.id))for(const [q,a] of faq)for(const n of (q+" "+a).match(/\d+/g)||[])assert.ok(stated.has(n),row.id+" FAQ number "+n+" is stated elsewhere in the body");
 }
});

test("no page presents the replaced licence Circular 12/2025/TT-BCA without its successor 108/2026/TT-BCA (batch V)",()=>{
 const stale=packets.filter(p=>p.body_markdown.includes("12/2025/TT-BCA")&&!p.body_markdown.includes("108/2026/TT-BCA")).map(p=>p.matrix_id);
 assert.deepEqual(stale,[],"pages still citing only Circular 12/2025/TT-BCA");
});

test("every vehicle-choice page that batch W extended shows at least three FAQ pairs mirrored by FAQPage, and its new answers state no number the body does not (batch W)",()=>{
 const source=JSON.parse(read("docs/seo-audit/execution/support-faq-w.json")).pages;
 assert.equal(Object.keys(source).length,114);
 for(const [id,entry] of Object.entries(source)){
  const row=published.find(r=>r.id===id),p=packets.find(x=>x.matrix_id===id),faq=faqEntries(p.body_markdown,row.locale);
  assert.ok(faq.length>=3,id+" visible FAQ");
  assert.equal(graph(page(row.url)).find(n=>n["@type"]==="FAQPage")?.mainEntity.length,faq.length,id+" FAQPage mirrors the visible FAQ");
  for(const {q,a} of entry.faq){
   const pair="**"+q+"** "+a;
   assert.ok(p.body_markdown.includes(pair),id+" pair is in the body");
   const stated=new Set(p.body_markdown.replace(pair,"").match(/\d+/g)||[]);
   for(const n of (q+" "+a).match(/\d+/g)||[])assert.ok(stated.has(n),id+" FAQ number "+n+" is stated elsewhere in the body");
  }
 }
});

test("every safety-and-support page that batch X extended shows at least three FAQ pairs mirrored by FAQPage, and its new answers state no number the body does not (batch X)",()=>{
 const receipt=JSON.parse(read("docs/seo-audit/execution/support-faq-x.json")),source=receipt.pages;
 assert.equal(Object.keys(source).length,227+101);
 for(const id of [...Object.keys(source),...receipt.formatted]){
  const row=published.find(r=>r.id===id),p=packets.find(x=>x.matrix_id===id),faq=faqEntries(p.body_markdown,row.locale);
  assert.ok(faq.length>=3,id+" visible FAQ");
  assert.equal(graph(page(row.url)).find(n=>n["@type"]==="FAQPage")?.mainEntity.length,faq.length,id+" FAQPage mirrors the visible FAQ");
  for(const {q,a} of source[id]?.faq??[]){
   const pair="**"+q+"** "+a;
   assert.ok(p.body_markdown.includes(pair),id+" pair is in the body");
   const stated=new Set(p.body_markdown.replace(pair,"").match(/\d+/g)||[]);
   for(const n of (q+" "+a).match(/\d+/g)||[])assert.ok(stated.has(n),id+" FAQ number "+n+" is stated elsewhere in the body");
  }
 }
});

test("no Latin-script article carries stray Chinese, Japanese or Korean characters in its text (DE-S07 drafting leftover, batch X)",()=>{
 const latin=new Set(["vi","en","de","fr","es","nl","pt"]),cjk=/[぀-ヿ㐀-鿿가-힯]/u;
 const stray=packets.filter(p=>latin.has(p.locale)).filter(p=>[p.title,p.meta_description,p.h1,p.body_markdown.replace(/\]\([^)]*\)/g,"]")].some(t=>cjk.test(t||""))).map(p=>p.matrix_id);
 assert.deepEqual(stray,[]);
});

test("each locale checklist shows a visible FAQ mirrored by FAQPage, built only from the checklist's own text (batch Y)",()=>{
 for(const l of locales){
  const html=page("/"+l.code+"/checklist/"),faq=l.guideFaq||[];
  assert.equal(faq.length,3,l.code+" checklist FAQ pairs");
  const node=graph(html).find(n=>n["@type"]==="FAQPage");
  assert.deepEqual(node?.mainEntity.map(e=>[e.name,e.acceptedAnswer.text]),faq,l.code+" FAQPage mirrors the visible FAQ");
  const text=[l.guideIntro,...l.guideSections.flat()].join(" "),stated=new Set(text.match(/\d+/g)||[]);
  for(const [q,a] of faq){
   assert.ok(html.includes("<h3>"+q.replace(/&/g,"&amp;")+"</h3>"),l.code+" question is visible as H3");
   assert.doesNotMatch(q+a,/[\[\]*]|https?:/,l.code+" plain-text pair");
   for(const n of (q+" "+a).match(/\d+/g)||[])assert.ok(stated.has(n),l.code+" FAQ number "+n+" is stated in the checklist");
  }
 }
});

test("the SEO A–Z Matrix on GitHub covers every published URL once, uses only the agreed statuses and names a resumable checkpoint (M0)",()=>{
 const csvRows=f=>{const [head,...lines]=read("docs/seo-matrix/"+f).trim().split("\n");const cols=head.split(",");return {cols,count:lines.length,ids:lines.map(l=>l.split(",")[0])};};
 const board=JSON.parse(read("docs/seo-matrix/TASKS.json")),cp=JSON.parse(read("docs/seo-matrix/CHECKPOINT.json"));
 const allowed=new Set(["TODO","IN_PROGRESS","FIXED","MERGED","DEPLOYED","LIVE_VERIFIED","BLOCKED"]);
 for(const t of board.tasks){
  assert.ok(allowed.has(t.status),t.id+" status");
  assert.ok(t.next_action,t.id+" next_action");
  if(t.status==="LIVE_VERIFIED")assert.ok(t.pr&&t.commit&&t.deploy_run&&t.live_qa.length,t.id+" live verification needs PR, merge commit, deploy and live-QA runs");
 }
 const master=csvRows("MASTER-SEO-MATRIX.csv"),pub=published.map(r=>r.id).sort();
 assert.deepEqual([...master.ids].sort(),pub,"one Matrix row per published URL");
 for(const c of ["url","locale","primary_query","search_intent","title","description","h1","content_units","featured_image","og_image","tech_issues","img_status","meta_status","content_status","tech_status","status","branch","commit","pr","actions","qa_evidence","next_action"])assert.ok(master.cols.includes(c),"MASTER column "+c);
 assert.ok(csvRows("IMAGE-SEO-MATRIX.csv").cols.includes("size_check")&&csvRows("CONTENT-SEO-MATRIX.csv").cols.includes("content_check"));
 // The checkpoint names the open board task, or none (with a resume action) once every task is LIVE_VERIFIED or BLOCKED.
 if(board.tasks.some(t=>!["LIVE_VERIFIED","BLOCKED"].includes(t.status)))assert.ok(cp.current_task&&board.tasks.some(t=>t.id===cp.current_task.id),"checkpoint names a board task");
 else assert.ok(cp.current_task===null&&cp.next_action.length>40,"no open task: checkpoint says how to resume");
 // Every Hub/Supporting URL belongs to exactly one image batch of at most 100 URLs.
 const img=board.tasks.filter(t=>/^IMG-\d\d$/.test(t.id)&&t.id!=="IMG-00"),seen=new Map();
 for(const t of img){assert.ok(t.scope.length<=100,t.id+" ≤100 images");for(const id of t.scope){assert.ok(!seen.has(id),id+" in one batch only");seen.set(id,t.id);}}
 assert.deepEqual([...seen.keys()].sort(),published.filter(r=>r.role==="HUB"||r.role==="SUPPORT").map(r=>r.id).sort());
});

test("every reviewed cover is a 1200×675 WebP of at most 300 KB with a 640 px variant, shown lazily after the opening paragraph and used as og:image and Article image (IMG-*)",()=>{
 const covers=JSON.parse(read("data/seo/image-covers.json")).covers;
 const webpSize=f=>{const b=fs.readFileSync(path.join(root,f.slice(1)));assert.equal(b.toString("ascii",0,4)+b.toString("ascii",8,12),"RIFFWEBP",f);const k=b.toString("ascii",12,16);
  return k==="VP8X"?[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)]:k==="VP8 "?[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff]:[(b.readUInt32LE(21)&0x3fff)+1,((b.readUInt32LE(21)>>14)&0x3fff)+1];};
 const attrEsc=s=>s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 assert.ok(Object.keys(covers).length>0);
 for(const [id,c] of Object.entries(covers)){
  const row=published.find(r=>r.id===id);
  assert.ok(row&&row.url===c.url,id+" is a published Matrix row");
  assert.deepEqual(webpSize(c.src),[1200,675],id);assert.deepEqual(webpSize(c.src640),[640,360],id);
  const bytes=fs.statSync(path.join(root,c.src.slice(1))).size;
  assert.ok(bytes<=300*1024&&bytes===c.bytes,id+" main image ≤300 KB and as recorded");
  assert.ok(c.alt.startsWith(c.h1)&&c.alt.length>c.h1.length+10,id+" alt names the page and describes the illustration");
  const html=page(row.url),fig=html.match(/<figure class="article-cover"><img [^>]*><\/figure>/)?.[0];
  assert.ok(fig,id+" shows its cover");
  assert.ok(fig.includes('src="'+c.src+'"')&&fig.includes(c.src640+" 640w")&&fig.includes('width="1200" height="675"')&&fig.includes('loading="lazy"')&&fig.includes('alt="'+attrEsc(c.alt)+'"'),id+" cover markup");
  assert.ok(html.indexOf(fig)>html.indexOf('class="article-lead"'),id+" cover follows the lead");
  assert.ok(html.includes('<meta property="og:image" content="'+SITE+c.src+'">')&&html.includes('<meta property="og:image:width" content="1200">'),id+" og:image");
  assert.equal(graph(html).find(n=>n["@type"]==="Article").image.url,SITE+c.src,id+" Article image");
 }
 // A batch recorded as FIXED or later has a cover for every URL in its scope.
 for(const t of JSON.parse(read("docs/seo-matrix/TASKS.json")).tasks.filter(t=>/^IMG-(0[1-9]|1\d)$/.test(t.id)&&t.status!=="TODO"&&t.status!=="IN_PROGRESS"))
  for(const id of t.scope)assert.ok(covers[id],t.id+" covers "+id);
});

test("topic illustrations on the locale homes and the root page carry alt text in the page language (IMG-00)",()=>{
 for(const url of ["/",...locales.map(l=>"/"+l.code+"/")]){
  const imgs=page(url).match(/<img src="\/topic-[^"]+"[^>]*>/g)||[];
  assert.equal(imgs.length,4,url);
  for(const tag of imgs)assert.match(tag,/\salt="[^"]{20,}"/,url+" "+tag.slice(0,60));
 }
});

test("the expanded rental checklists reach the content floor and render every section and reference (CONTENT-01)",()=>{
 const t=JSON.parse(read("docs/seo-matrix/TASKS.json")).tasks.find(x=>x.id==="CONTENT-01");
 // Minimal CSV reader (quoted fields may hold commas, doubled quotes and line breaks).
 const parse=s=>{const out=[];let row=[],f="",q=false;for(let i=0;i<s.length;i++){const c=s[i];
  if(q){if(c==='"'&&s[i+1]==='"'){f+='"';i++;}else if(c==='"')q=false;else f+=c;}
  else if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);out.push(row);row=[];f="";}else if(c!=="\r")f+=c;}
  if(f||row.length){row.push(f);out.push(row);}return out;};
 const [cols,...lines]=parse(read("docs/seo-matrix/CONTENT-SEO-MATRIX.csv"));
 const rows=new Map(lines.map(v=>[v[0],Object.fromEntries(cols.map((c,i)=>[c,v[i]]))]));
 assert.equal(t.scope.length,8);
 for(const id of t.scope){
  const l=locales.find(x=>x.code===id.split("-")[0].toLowerCase()),html=page("/"+l.code+"/checklist/");
  assert.equal(rows.get(id).content_check,"OK",id+" meets the floor");
  const heads=l.guideSections.map(s=>s[0]);
  assert.equal(new Set(heads).size,heads.length,id+" section headings are unique");
  for(const h of heads)assert.ok(html.includes(">"+h.replace(/&/g,"&amp;")+"</h2>"),id+" renders "+h);
  for(const r of l.guideReferences)assert.ok(html.includes('href="'+r.url.replace(/&/g,"&amp;")+'"'),id+" cites "+r.url);
 }
});

test("the desktop menu wraps inside its own column instead of overlapping the brand and language switcher (TECH-04)",()=>{
 assert.match(read("assets/ultra.css"),/@media\(min-width:1181px\)\{\.nav2-main\{flex-wrap:wrap;justify-content:center;row-gap:0\}\}/);
});

test("the reference link check reads only external links inside main and classifies answers conservatively (TECH-05)",async()=>{
 const {externalLinks,classify,checkAll}=await import("../scripts/seo/reference-link-check.mjs");
 const html='<header><a href="https://nav.example/">x</a></header><main><p><a href="https://a.example/doc#p2">a</a> <a href="/en/guides/x/">in</a> <a href="https://global.rentbikehanoi.com/en/">self</a> <a href="https://b.example/?a=1&amp;b=2">b</a> <a href="https://a.example/doc">dup</a></p></main>';
 assert.deepEqual(externalLinks(html),["https://a.example/doc","https://b.example/?a=1&b=2"]);
 assert.equal(classify({url:"https://x.gov/a",status:404}),"BROKEN");
 assert.equal(classify({url:"https://x.gov/a",error:"ENOTFOUND"}),"BROKEN");
 assert.equal(classify({url:"https://x.gov/a",status:403}),"BLOCKED");
 assert.equal(classify({url:"https://x.gov/a",error:"UND_ERR_CONNECT_TIMEOUT"}),"NETWORK");
 assert.equal(classify({url:"https://x.gov/a/b",status:200,finalUrl:"https://www.x.gov/"}),"SOFT_404_SUSPECT");
 assert.equal(classify({url:"https://x.gov/a/b",status:200,finalUrl:"https://x.gov/c"}),"OK");
 // HEAD failures are confirmed with GET before a link is called broken.
 const calls=[];
 const fake=async (url,{method})=>{calls.push(method+" "+url);const status=url.includes("gone")?404:method==="HEAD"?405:200;return {status,url,body:{cancel:async()=>{}}};};
 const res=await checkAll(new Map([["https://a.example/ok",["/en/"]],["https://a.example/gone",["/de/"]]]),fake);
 assert.deepEqual(res.map(r=>[r.url,r.class]),[["https://a.example/gone","BROKEN"],["https://a.example/ok","OK"]]);
 assert.ok(calls.includes("GET https://a.example/gone")&&calls.includes("GET https://a.example/ok"));
 const wf=read(".github/workflows/reference-link-check.yml");
 assert.match(wf,/workflow_dispatch/);assert.match(wf,/contents: read/);assert.doesNotMatch(wf,/contents: write|secrets\./);
});

test("references found dead by the TECH-05 link check are no longer linked from any page, and their replacements are listed as sources",()=>{
 const dead=["https://piaggiogroup.azureedge.net/piaggio/media/zfgpvj2d/piaggio_beverly_s_400.pdf","https://sovhtt.hanoi.gov.vn/en/resolution-on-the-reorganization-of-commune-level-administrative-units-in-hanoi-a-historic-turning-point/",
  "https://www.cdc.gov/disasters/extremeheat/warning.html","https://www.honda.com.vn/xe-may/san-pham/sh160i125i","https://www.honda.com.vn/xe-may/san-pham/sh160i125i?category=2","https://www.honda.com.vn/xe-may/san-pham/sh160i125i?version=100",
  "https://www.kawasaki.eu/en/Motorcycles/Adventure/KLE500_2026.html","https://www.triumphmotorcycles.co.uk/motorcycles/adventure/tiger-1200/tiger-1200-gt-explorer-2024",
  "https://www.triumphmotorcycles.co.uk/motorcycles/adventure/tiger-1200/tiger-1200-rally-explorer-2024","https://www.triumphmotorcycles.co.uk/motorcycles/adventure/tiger-1200/tiger-1200-rally-pro-2024",
  "https://www.triumphmotorcycles.co.uk/motorcycles/adventure/tiger-sport-660/tiger-sport-660","https://www.triumphmotorcycles.co.uk/motorcycles/sport/daytona-660",
  "https://znews.vn/o-nhiem-khong-khi-tang-cao-bo-y-te-ban-hanh-huong-dan-moi-post1608395.html","https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=170620"];
 const esc=u=>u.replace(/&/g,"&amp;");
 for(const r of published){
  const html=page(r.url);
  for(const u of dead)assert.ok(!html.includes('href="'+esc(u)+'"'),r.url+" still links "+u);
 }
 for(const p of packets.filter(p=>p.publication&&p.sources))for(const s of p.sources)assert.ok(!dead.includes(s.url),p.matrix_id+" source "+s.url);
 // Every link in a fixed article body is listed among its sources.
 for(const id of ["DE-S259","DE-S249","DE-S236","DE-S183","DE-S161","DE-S190","DE-H01","EN-H01","ZH-S76","DE-S123","DE-S124","VI-S60"]){
  const p=packets.find(x=>x.matrix_id===id),src=new Set(p.sources.map(s=>s.url));
  for(const m of p.body_markdown.matchAll(/\]\((https:\/\/web\.archive\.org\/web\/\d{14}\/[^)\s]+|https:\/\/triumph-mediakits\.com\/[^)\s]+|https:\/\/www\.cdc\.gov\/extreme-heat\/[^)\s]+)\)/g))assert.ok(src.has(m[1]),id+" lists "+m[1]);
 }
});

test("the back link on the privacy and terms pages is underlined, not told apart by colour alone (TECH-06, axe link-in-text-block)",()=>{
 assert.match(read("assets/styles.css"),/\.legal>a\{text-decoration:underline/);
 for(const u of ["/privacy/","/terms/"])assert.match(page(u),/<div class="legal"><a href="\/">/);
});
