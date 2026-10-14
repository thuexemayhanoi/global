import fs from "node:fs";
import path from "node:path";
import {scanPacket} from "./seo/fact-guard-core.mjs";
import {loadTopicalMap} from "./seo/topical-authority-core.mjs";

const SITE="https://global.rentbikehanoi.com";
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const localeCodes=new Set(["vi","en","de","fr","es","nl","zh","pt","ko","ja"]);
const topicStatus=new Set(["IDEA","RESEARCHED","DRAFT","QA_APPROVED","PUBLISHED"]);
const protectedSlugs=new Set(["index.html","404.html","robots.txt","sitemap.xml","about","contact","privacy","terms"]);
const htmlPagePath=url=>{
 if(!/^\/[a-z]{2}\/(?:topics|guides)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url))throw Error("Unsafe article URL: "+url);
 return url.slice(1)+"index.html";
};
export const articlePath=htmlPagePath;

function countWords(text,locale){
 if(["zh","ja","ko"].includes(locale))return [...new Intl.Segmenter(locale,{granularity:"word"}).segment(text)].filter(w=>w.isWordLike).length;
 return text.trim().split(/\s+/u).filter(Boolean).length;
}
function collectMarkdownTargets(text){
 return [...text.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)].map(m=>m[1].trim());
}
function isPublishedLinked(pathname,matrix,pending){
 return matrix.rows.some(r=>r.url===pathname && (r.status==="PUBLISHED"||pending.has(r.id)));
}
export function checkArticle(packet,matrix,locales,{minimumWords=550,allowPublished=false,pending=new Set(),assetsRoot=null,allowUnpublishedParentForDraft=false,factMode="warn"}={}){
 const errors=[], warnings=[];
 const row=matrix.rows.find(r=>r.id===packet?.matrix_id);
 const locale=locales.find(l=>l.code===packet?.locale);
 if(!row)errors.push("Unknown matrix_id");
 if(!locale)errors.push("Unknown locale");
 if(row){
  if(row.role!=="HUB"&&row.role!=="SUPPORT")errors.push("Only Hub/Supporting articles can be published");
  if(!topicStatus.has(row.status))errors.push("Invalid matrix status");
  if(row.status==="PUBLISHED"&&!allowPublished)errors.push("Overwrite of published URL forbidden");
  if(row.status==="BLOCKED")errors.push("Topic is blocked");
  if(row.url!==packet.proposed_url)errors.push("URL must match approved Matrix row");
  if(row.locale!==packet.locale)errors.push("Locale must match Matrix row");
  if(row.parent_id){
   const parent=matrix.rows.find(r=>r.id===row.parent_id);
   // Drafts may be researched before parent publication, but publishing
   // still requires a PUBLISHED parent (or co-published parent in pending).
   if(!parent||(!allowUnpublishedParentForDraft&&parent.status!=="PUBLISHED"&&!pending.has(parent.id)))
    errors.push("Parent Hub/Pillar must be published before its child");
  }
  try{htmlPagePath(row.url)}catch(e){errors.push(e.message)}
 }
 for(const [field,min,max]of [["title",16,110],["meta_description",80,205],["h1",12,140]]){
  const len=String(packet?.[field]??"").trim().length;
  if(len<min||len>max)errors.push(field+" length must be "+min+".."+max);
 }
 const body=String(packet?.body_markdown??"");
 const words=countWords(body,packet?.locale||"en");
 if(words<minimumWords)errors.push("Insufficient article text: "+words+" words (minimum "+minimumWords+")");
 if((body.match(/^##\s+\S/gm)||[]).length<3)errors.push("Article needs three substantial H2 sections");
 if(/^#\s+/m.test(body))errors.push("Do not put an H1 in body_markdown; use packet.h1");
 if(/\b(?:TODO|TBD|LOREM IPSUM|PLACEHOLDER)\b/i.test(body))errors.push("Draft contains placeholder content");
 if(/<\s*(?:script|style|iframe|form|img|a|p|h[1-6]|div)\b/i.test(body))errors.push("Raw HTML is not allowed; use Markdown");
 if(packet?.serp_intent_checked!==true)errors.push("SERP search-intent confirmation is required");
 if(packet?.facts_reviewed_by_human!==true)errors.push("Human editorial fact review is required");
 if(!Array.isArray(packet?.sources)||packet.sources.length<2)errors.push("At least two traceable references are required");
 else for(let i=0;i<packet.sources.length;i++){
  const s=packet.sources[i];
  if(!s||typeof s.url!=="string"||!/^https:\/\//i.test(s.url)||!s.title||!/^\d{4}-\d{2}-\d{2}$/.test(s.checked_on||""))errors.push("Source "+(i+1)+" needs HTTPS URL, title and checked_on YYYY-MM-DD");
  if(/example\.(?:com|org)/i.test(s?.url||""))errors.push("Example URLs are not evidence");
 }
 for(const href of collectMarkdownTargets(body)){
  if(/^(?:javascript:|data:|file:)/i.test(href))errors.push("Unsafe markdown URL: "+href);
  if(href.startsWith("/")){
   const url=href.split("#")[0].split("?")[0];
   if(!isPublishedLinked(url,matrix,pending))errors.push("Unpublished internal link: "+url);
  }else if(!/^https:\/\//i.test(href))errors.push("Markdown links must be HTTPS or root-relative: "+href);
 }
 if(packet?.cover_image){
  const p=packet.cover_image;
  if(!/^\/assets\/articles\/[a-z0-9][\w\/-]*\.(?:webp|png|jpe?g)$/i.test(p))errors.push("Cover must be a local /assets/articles/ image");
  if(!packet.cover_alt||String(packet.cover_alt).length<16)errors.push("Cover alt text needs a description");
  if(!packet.image_credit||String(packet.image_credit).length<4)errors.push("Cover image needs provenance/license note");
  if(assetsRoot&&/^\/assets\/articles\//.test(p)){
   const abs=path.join(assetsRoot,p.slice(1));
   if(!fs.existsSync(abs))errors.push("Cover image file is missing: "+p);
  }
 }
 // Anti-fabrication: wrong Nguyễn Tú prices/NAP/hours always fail; unsourced
 // amounts or phones fail in strict (publisher) mode and warn in Writer QA.
 for(const f of scanPacket(packet,factMode)){
  const line="Fact guard "+f.code+" in "+f.where+": "+f.message+(f.excerpt?" «"+f.excerpt+"»":"");
  (f.level==="FAIL"?errors:warnings).push(line);
 }
 if(!packet?.editorial_notes)warnings.push("Add editorial methodology or verification notes");
 return {passed:errors.length===0,words,errors,warnings,row_id:row?.id??null};
}
function inline(text){
 const re=/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
 let cursor=0,result="";
 for(const match of text.matchAll(re)){
  const token=match[0],at=match.index;
  result+=esc(text.slice(cursor,at));
  if(token.startsWith("**"))result+="<strong>"+esc(token.slice(2,-2))+"</strong>";
  else {
   const m=token.match(/^\[([^\]]+)\]\(([^)]+)\)$/),href=m[2].trim();
   const safe=/^https:\/\//i.test(href)||href.startsWith("/")?href:null;
   result+=safe?'<a href="'+esc(safe)+'"'+(/^https:\/\//i.test(safe)?' rel="noopener noreferrer"':'')+'>'+esc(m[1])+'</a>':esc(m[1]);
  }
  cursor=at+token.length;
 }
 return result+esc(text.slice(cursor));
}
export function renderMarkdown(markdown){
 const lines=String(markdown).replace(/\r\n/g,"\n").split("\n");
 const out=[];let paragraph=[],list=[];
 const flushPara=()=>{if(paragraph.length){out.push("<p>"+inline(paragraph.join(" "))+"</p>");paragraph=[];}};
 const flushList=()=>{if(list.length){out.push("<ul>"+list.map(x=>"<li>"+inline(x)+"</li>").join("")+"</ul>");list=[];}};
 for(const raw of lines){
  const l=raw.trim();
  if(!l){flushPara();flushList();continue;}
  const h=l.match(/^(#{2,3})\s+(.*)$/);
  if(h){flushPara();flushList();out.push("<h"+h[1].length+">"+inline(h[2])+"</h"+h[1].length+">");continue;}
  const bullet=l.match(/^[-*]\s+(.+)$/);
  if(bullet){flushPara();list.push(bullet[1]);continue;}
  flushList();paragraph.push(l);
 }
 flushPara();flushList();
 return out.join("\n");
}
// [topic guides, more in this topic, references, other guides] per locale.
const ARTICLE_LABELS={
 vi:["Các hướng dẫn trong chủ đề này","Hướng dẫn khác trong chủ đề","Tài liệu tham khảo","Hướng dẫn khác"],
 en:["Guides in this topic","More in this topic","References","Other guides"],
 de:["Ratgeber zu diesem Thema","Mehr zu diesem Thema","Quellen","Weitere Ratgeber"],
 fr:["Guides de cette rubrique","À lire dans cette rubrique","Sources","Autres guides"],
 es:["Guías de este tema","Más sobre este tema","Referencias","Otras guías"],
 nl:["Gidsen in dit onderwerp","Meer over dit onderwerp","Bronnen","Andere gidsen"],
 zh:["本主题指南","同主题更多指南","参考资料","其他指南"],
 pt:["Guias deste tema","Mais sobre este tema","Referências","Outros guias"],
 ko:["이 주제의 가이드","같은 주제의 다른 가이드","참고 자료","기타 가이드"],
 ja:["このテーマのガイド","同じテーマの関連ガイド","参考資料","その他のガイド"]
};
/**
 * Hub → every PUBLISHED child grouped by silo (no orphan Supporting pages);
 * Supporting → up to six PUBLISHED siblings, same silo first. PUBLISHED only.
 */
export function topicLinks(row,matrix,topical,code){
 const L=ARTICLE_LABELS[code]||ARTICLE_LABELS.en,tl=topical?.locales?.[code];
 const siloOf=r=>tl?.existing?.[r.id]||r.subcluster||"";
 const order=(a,b)=>(a.priority??99)-(b.priority??99)||a.id.localeCompare(b.id);
 const pub=matrix.rows.filter(r=>r.status==="PUBLISHED"&&r.role==="SUPPORT"&&r.locale===code&&r.id!==row.id);
 const item=r=>'<li><a href="'+esc(r.url)+'">'+esc(r.working_title)+'</a></li>';
 if(row.role==="HUB"){
  const kids=pub.filter(r=>r.parent_id===row.id).sort(order);
  if(!kids.length)return "";
  const groups=new Map();
  for(const k of kids){const s=siloOf(k);if(!groups.has(s))groups.set(s,[]);groups.get(s).push(k);}
  const many=groups.size>1;
  return '<section class="topic-guides"><h2>'+esc(L[0])+'</h2>'+[...groups].map(([s,list])=>
   (many?'<h3>'+esc(tl?.cluster_labels?.[s]||L[3])+'</h3>':'')+'<ul>'+list.map(item).join("")+'</ul>').join("")+'</section>';
 }
 if(row.role==="SUPPORT"){
  const own=siloOf(row);
  const sib=pub.filter(r=>r.parent_id===row.parent_id).sort((a,b)=>(siloOf(a)===own?0:1)-(siloOf(b)===own?0:1)||order(a,b)).slice(0,6);
  return sib.length?'<section class="topic-guides topic-guides--siblings"><h2>'+esc(L[1])+'</h2><ul>'+sib.map(item).join("")+'</ul></section>':"";
 }
 return "";
}
export function renderArticle(packet,locale,row,matrix,topical=null){
 const htmlLang=locale.htmlLang||locale.code,url=SITE+row.url;
 const parent=matrix.rows.find(r=>r.id===row.parent_id);
 const parentURL=parent?.status==="PUBLISHED"?parent.url:"/"+locale.code+"/";
 const parentLabel=parent?.status==="PUBLISHED"?parent.working_title:locale.name;
 const data={"@context":"https://schema.org","@graph":[{"@type":"Article","headline":packet.title,"description":packet.meta_description,"inLanguage":htmlLang,"mainEntityOfPage":url,"author":{"@type":"Organization","name":"Vietnam Two-Wheel Guide"}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":locale.name,"item":SITE+"/"+locale.code+"/"},{"@type":"ListItem","position":2,"name":parentLabel,"item":SITE+parentURL},{"@type":"ListItem","position":3,"name":packet.title,"item":url}]}]};
 const sources=packet.sources.map(s=>'<li><a href="'+esc(s.url)+'" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join("");
 const cover=packet.cover_image?'<figure><img src="'+esc(packet.cover_image)+'" alt="'+esc(packet.cover_alt)+'" loading="lazy" decoding="async"><figcaption>'+esc(packet.image_credit)+'</figcaption></figure>':"";
 const json=JSON.stringify(data).replace(/</g,"\\u003c");
 return '<!doctype html>\n<html lang="'+esc(htmlLang)+'"><head>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+esc(packet.title)+'</title>\n<meta name="description" content="'+esc(packet.meta_description)+'">\n<link rel="canonical" href="'+esc(url)+'">\n<meta property="og:type" content="article"><meta property="og:title" content="'+esc(packet.title)+'"><meta property="og:description" content="'+esc(packet.meta_description)+'"><meta property="og:url" content="'+esc(url)+'">\n<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">\n<link rel="stylesheet" href="/assets/styles.css">\n<link rel="stylesheet" href="/assets/navigation.css">\n<script type="application/ld+json">'+json+'</script>\n</head><body><a class="skip" href="#main">Skip to content</a><main id="main"><div class="container"><nav class="crumb" aria-label="Breadcrumb"><a href="/'+esc(locale.code)+'/">'+esc(locale.name)+'</a> <span aria-hidden="true">›</span> <a href="'+esc(parentURL)+'">'+esc(parentLabel)+'</a></nav><article class="article"><h1>'+esc(packet.h1)+'</h1><p class="article-lead">'+esc(packet.meta_description)+'</p>'+cover+'<div class="article-copy">'+renderMarkdown(packet.body_markdown)+'</div>'+topicLinks(row,matrix,topical,locale.code)+'<section class="article-references"><h2>'+esc((ARTICLE_LABELS[locale.code]||ARTICLE_LABELS.en)[2])+'</h2><ol>'+sources+'</ol></section><p><a href="'+esc(parentURL)+'">← '+esc(parentLabel)+'</a></p></article></div></main></body></html>\n';
}
export function generateApprovedArticles(root,matrix,locales){
 const dir=path.join(root,"content/articles");
 const pages={};
 if(!fs.existsSync(dir))return pages;
 const topical=loadTopicalMap(root);
 for(const file of fs.readdirSync(dir).sort()){
  if(!file.endsWith(".json"))continue;
  if(!/^[A-Z]{2}-[HS]\d{2,4}\.json$/.test(file))throw Error("Unexpected article filename: "+file);
  const packet=JSON.parse(fs.readFileSync(path.join(dir,file),"utf8"));
  const row=matrix.rows.find(r=>r.id===packet.matrix_id),locale=locales.find(l=>l.code===packet.locale);
  if(!row||row.status!=="PUBLISHED")throw Error("Article must have PUBLISHED Matrix row: "+file);
  if(file!==packet.matrix_id+".json")throw Error("Filename / Matrix ID mismatch");
  const qa=checkArticle(packet,matrix,locales,{allowPublished:true,assetsRoot:root,factMode:"strict"});
  if(!qa.passed)throw Error("Stored article QA failed "+file+": "+qa.errors.join("; "));
  const generated=htmlPagePath(row.url);
  if(pages[generated])throw Error("Article URL collision "+generated);
  pages[generated]=renderArticle(packet,locale,row,matrix,topical);
 }
 return pages;
}
