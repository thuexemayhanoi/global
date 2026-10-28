import fs from "node:fs";
import path from "node:path";
import {scanPacket,scanText} from "./seo/fact-guard-core.mjs";
import {loadTopicalMap} from "./seo/topical-authority-core.mjs";
import {reviewedPageDates} from "./sitemaps.mjs";

const SITE="https://global.rentbikehanoi.com";
export const BRAND="Vietnam Two-Wheel Guide";
// Site-wide social preview image (the root hero illustration); article packets carry no cover images yet.
export const SOCIAL_IMAGE={path:"/hero-hanoi.webp",width:1600,height:900};
// One existing root illustration per Hub cluster (960×720 WebP, already served): a guide previews with its topic's
// picture and names it as the Article image; rows outside these clusters keep the site hero.
export const TOPIC_IMAGES={
 "vehicle-choice":{path:"/topic-choose-bike.webp",width:960,height:720},
 "documents-contracts":{path:"/topic-documents.webp",width:960,height:720},
 "rental-costs":{path:"/topic-prices-deposits.webp",width:960,height:720},
 "safety-support":{path:"/topic-safety.webp",width:960,height:720}
};
export const socialImageFor=row=>TOPIC_IMAGES[row?.cluster]||SOCIAL_IMAGE;
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
/**
 * One pass over the Matrix (first row wins per id, as with rows.find). The build
 * passes it to every article so lookups stay O(1) instead of O(articles × rows).
 */
export function rowsIndex(matrix){
 const byId=new Map(),byUrl=new Map(),pubSupport=new Map();
 const add=(map,key,r)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(r);};
 for(const r of matrix.rows){
  if(!byId.has(r.id))byId.set(r.id,r);
  add(byUrl,r.url,r);
  if(r.status==="PUBLISHED"&&r.role==="SUPPORT")add(pubSupport,r.parent_id,r);
 }
 return {byId,byUrl,pubSupport};
}
function isPublishedLinked(pathname,ix,pending){
 return (ix.byUrl.get(pathname)||[]).some(r=>r.status==="PUBLISHED"||pending.has(r.id));
}
export const STANDING_POLICY_PATH="approvals/standing-policy-20261015.json";
/** Honest record for articles published under the owner's standing policy (never claims human review). */
export function validatePublicationRecord(p){
 const e=[];
 if(p?.mode!=="STANDING_POLICY"||p?.policy!==STANDING_POLICY_PATH)e.push("Unknown publication policy");
 const validSource=/^[0-9a-f]{64}$/.test(p?.source_sha256||"")&&/^[0-9a-f]{40}$/.test(p?.source_commit||"");
 const reviewed=/^[0-9a-f]{64}$/.test(p?.review_sha256||"");
 const autoQA=p?.qa_mode==="AUTOMATED_G1_G5_G7"&&p?.review_sha256===null;
 if(!validSource||!(reviewed||autoQA))e.push("Publication record needs immutable source evidence and reviewed hash OR explicit automated-QA provenance");
 if(p?.human_review!==false||p?.serp_validated!==false)e.push("Policy publication must not claim human review or SERP validation");
 if(!/^\d{4}-\d{2}-\d{2}T/.test(p?.approved_at||""))e.push("approved_at timestamp required");
 return e;
}
export function checkArticle(packet,matrix,locales,{minimumWords=550,allowPublished=false,pending=new Set(),assetsRoot=null,allowUnpublishedParentForDraft=false,factMode="warn",index=null}={}){
 const errors=[], warnings=[];
 const ix=index||rowsIndex(matrix);
 const row=ix.byId.get(packet?.matrix_id);
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
   const parent=ix.byId.get(row.parent_id);
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
 // Owner-reviewed packets set both flags; standing-policy packets keep them false and carry a verified publication record.
 const policyRecord=packet?.publication!==undefined;
 if(policyRecord){
  const pe=validatePublicationRecord(packet.publication);
  errors.push(...pe);
  if(assetsRoot&&!fs.existsSync(path.join(assetsRoot,STANDING_POLICY_PATH)))errors.push("Standing policy file missing");
  if(packet.facts_reviewed_by_human!==false||packet.serp_intent_checked!==false)errors.push("Policy publications must keep human-review and SERP flags false");
 }else{
  if(packet?.serp_intent_checked!==true)errors.push("SERP search-intent confirmation is required");
  if(packet?.facts_reviewed_by_human!==true)errors.push("Human editorial fact review is required");
 }
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
   if(!isPublishedLinked(url,ix,pending))errors.push("Unpublished internal link: "+url);
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
 // Source titles are rendered as the page's reference list, which the site
 // fact guard reads too, so they are checked here as well.
 const sourceTitles=Array.isArray(packet?.sources)?packet.sources.flatMap((s,i)=>s?.title?scanText(String(s.title),{locale:packet.locale,mode:factMode,where:"sources["+i+"].title"}):[]):[];
 for(const f of [...scanPacket(packet,factMode),...sourceTitles]){
  const line="Fact guard "+f.code+" in "+f.where+": "+f.message+(f.excerpt?" «"+f.excerpt+"»":"");
  (f.level==="FAIL"?errors:warnings).push(line);
 }
 if(!packet?.editorial_notes)warnings.push("Add editorial methodology or verification notes");
 return {passed:errors.length===0,words,errors,warnings,row_id:row?.id??null};
}
// The locale's visible FAQ H2 in an article body. Under it, each "**Question?** answer" paragraph or "### Question?"
// block is one pair; continuation paragraphs belong to the open answer. FAQPage markup repeats exactly that visible
// text (links reduced to their anchor text) and is emitted only for at least two complete pairs.
export const FAQ_HEADINGS={vi:"Câu hỏi thường gặp",en:"Frequently asked questions",de:"Häufige Fragen",fr:"Questions fréquentes",es:"Preguntas frecuentes",nl:"Veelgestelde vragen",zh:"常见问题",pt:"Perguntas frequentes",ko:"자주 묻는 질문",ja:"よくある質問"};
// Older pages opened a one-question section with the singular heading; questions later added under it are the same FAQ.
const FAQ_SINGULAR={en:"Frequently asked question",de:"Häufige Frage",fr:"Question fréquente",es:"Pregunta frecuente",nl:"Veelgestelde vraag",pt:"Pergunta frequente"};
const plainText=s=>String(s).replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/^[-*]\s+/gm,"").replace(/\s+/gu," ").trim();
// Japanese questions often end with the particle か and a full stop (…ますか。) instead of a question mark.
const isQuestion=s=>/(?:[?？]|か。)$/u.test(String(s).trim());
export function faqEntries(markdown,code){
 const heading=FAQ_HEADINGS[code];
 const lines=String(markdown??"").replace(/\r\n/g,"\n").split("\n");
 const start=heading?lines.findIndex(l=>l.trim()==="## "+heading||(FAQ_SINGULAR[code]&&l.trim()==="## "+FAQ_SINGULAR[code])):-1;
 if(start<0)return [];
 const section=[];
 for(let i=start+1;i<lines.length&&!/^##\s/.test(lines[i].trim());i++)section.push(lines[i]);
 const pairs=[];let open=null;
 for(const block of section.join("\n").split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean)){
  const h3=block.match(/^###\s+(.+?)\s*(?:\n([\s\S]*))?$/),bold=block.match(/^\*\*([^*]+)\*\*\s*([\s\S]*)$/);
  if(h3&&isQuestion(plainText(h3[1]))){open={q:plainText(h3[1]),a:[h3[2]||""]};pairs.push(open);}
  else if(bold&&isQuestion(plainText(bold[1]))){open={q:plainText(bold[1]),a:[bold[2]]};pairs.push(open);}
  else if(/^###\s/.test(block))open=null;
  else if(open)open.a.push(block);
 }
 const out=pairs.map(p=>[p.q,plainText(p.a.join(" "))]).filter(([q,a])=>q&&a);
 return out.length>=2?out:[];
}
export const faqPageNode=pairs=>({"@type":"FAQPage","mainEntity":pairs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))});
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
// Shown on standing-policy publications only: honest provenance, no claim of human review.
const AI_DISCLOSURE={
 vi:"Bài viết được soạn với sự hỗ trợ của AI và xuất bản sau các bước kiểm tra tự động về chất lượng, nguồn và trùng lặp; chưa được biên tập viên con người duyệt.",
 en:"This guide was drafted with AI assistance and published after automated quality, source and duplication checks; it has not been reviewed by a human editor.",
 de:"Dieser Ratgeber wurde mit KI-Unterstützung erstellt und nach automatischen Prüfungen von Qualität, Quellen und Dubletten veröffentlicht; eine menschliche Redaktion hat ihn nicht geprüft.",
 fr:"Ce guide a été rédigé avec l'aide de l'IA et publié après des contrôles automatiques de qualité, de sources et de doublons ; il n'a pas été relu par un rédacteur humain.",
 es:"Esta guía se redactó con ayuda de IA y se publicó tras controles automáticos de calidad, fuentes y duplicados; no la ha revisado un editor humano.",
 nl:"Deze gids is met hulp van AI geschreven en gepubliceerd na automatische controles op kwaliteit, bronnen en dubbele inhoud; een menselijke redacteur heeft hem niet nagekeken.",
 pt:"Este guia foi redigido com apoio de IA e publicado após verificações automáticas de qualidade, fontes e duplicação; não foi revisto por um editor humano.",
 zh:"本指南在人工智能协助下撰写，经过质量、来源和重复内容的自动检查后发布，尚未经过人工编辑审核。",
 ko:"이 가이드는 AI의 도움으로 작성되었으며 품질, 출처, 중복 여부에 대한 자동 검사를 거쳐 게시되었습니다. 사람 편집자의 검토는 거치지 않았습니다.",
 ja:"このガイドはAIの支援を受けて作成され、品質・出典・重複の自動チェックを経て公開されました。人間の編集者による確認は行われていません。"
};
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
// One sibling plan per Hub and locale, memoised per build index. Every guide links its silo-mates first (a cyclic
// window inside the silo, so a silo with more than seven guides still spreads), fills the rest of its six slots from
// the other silos starting k entries further for the i-th guide of its silo (a silo fans out instead of pointing at
// the same first rows), and a balancing pass then moves surplus other-silo links to guides still under
// min(6, n-1) inbound links. Mate links are never moved, so the silo-first order survives the balancing.
const SIBLING_PLANS=new WeakMap();
function siblingPlan(cycle,siloOf,ix,key){
 let plans=SIBLING_PLANS.get(ix);
 if(!plans){plans=new Map();SIBLING_PLANS.set(ix,plans);}
 if(plans.has(key))return plans.get(key);
 const n=cycle.length,target=Math.min(6,n-1),links=new Map(),inbound=new Map(cycle.map(r=>[r.id,0]));
 cycle.forEach((row,at)=>{
  const own=siloOf(row),ring=cycle.slice(at+1).concat(cycle.slice(0,at));
  const mates=ring.filter(r=>siloOf(r)===own),others=ring.filter(r=>siloOf(r)!==own);
  const take=Math.min(6,mates.length),k=6-take,i=cycle.slice(0,at).filter(r=>siloOf(r)===own).length;
  const start=others.length?(i*k)%others.length:0;
  const list=mates.slice(0,take).concat(others.slice(start).concat(others.slice(0,start)).slice(0,k));
  links.set(row.id,list);for(const r of list)inbound.set(r.id,inbound.get(r.id)+1);
 });
 const by=sign=>(a,b)=>sign*(inbound.get(a.id)-inbound.get(b.id))||a.id.localeCompare(b.id);
 for(let guard=0;guard<6*n;guard++){
  const short=cycle.filter(r=>inbound.get(r.id)<target).sort(by(1))[0];
  if(!short)break;
  let moved=false;
  for(const t of cycle.filter(r=>inbound.get(r.id)>target).sort(by(-1))){
   const g=cycle.find(g=>g.id!==short.id&&siloOf(g)!==siloOf(t)&&links.get(g.id).some(r=>r.id===t.id)&&!links.get(g.id).some(r=>r.id===short.id));
   if(!g)continue;
   const list=links.get(g.id);list[list.findIndex(r=>r.id===t.id)]=short;
   inbound.set(t.id,inbound.get(t.id)-1);inbound.set(short.id,inbound.get(short.id)+1);moved=true;break;
  }
  if(!moved)break;
 }
 plans.set(key,links);
 return links;
}
/**
 * Hub → every PUBLISHED child grouped by silo (no orphan Supporting pages);
 * Supporting → up to six PUBLISHED siblings, same silo first. PUBLISHED only.
 */
export function topicLinks(row,matrix,topical,code,ix=rowsIndex(matrix)){
 const L=ARTICLE_LABELS[code]||ARTICLE_LABELS.en,tl=topical?.locales?.[code];
 const siloOf=r=>tl?.existing?.[r.id]||r.subcluster||"";
 const order=(a,b)=>(a.priority??99)-(b.priority??99)||a.id.localeCompare(b.id);
 // PUBLISHED Supporting rows under one parent, in Matrix order (filter copies, so sorting never touches the index).
 const under=id=>(ix.pubSupport.get(id)||[]).filter(r=>r.locale===code&&r.id!==row.id);
 const item=r=>'<li><a href="'+esc(r.url)+'">'+esc(r.working_title)+'</a></li>';
 if(row.role==="HUB"){
  const kids=under(row.id).sort(order);
  if(!kids.length)return "";
  const groups=new Map();
  for(const k of kids){const s=siloOf(k);if(!groups.has(s))groups.set(s,[]);groups.get(s).push(k);}
  const many=groups.size>1;
  return '<section class="topic-guides"><h2>'+esc(L[0])+'</h2>'+[...groups].map(([s,list])=>
   (many?'<h3>'+esc(tl?.cluster_labels?.[s]||L[3])+'</h3>':'')+'<ul>'+list.map(item).join("")+'</ul>').join("")+'</section>';
 }
 if(row.role==="SUPPORT"){
  const own=siloOf(row);
  const cycle=(ix.pubSupport.get(row.parent_id)||[]).filter(r=>r.locale===code).sort((a,b)=>siloOf(a).localeCompare(siloOf(b))||order(a,b));
  // A row that is not (yet) a PUBLISHED guide of this Hub (draft previews) gets the plain silo-first list instead of a plan slot.
  const sib=siblingPlan(cycle,siloOf,ix,row.parent_id+"|"+code).get(row.id)||[...cycle.filter(r=>siloOf(r)===own),...cycle.filter(r=>siloOf(r)!==own)].filter(r=>r.id!==row.id).slice(0,6);
  return sib.length?'<section class="topic-guides topic-guides--siblings"><h2>'+esc(L[1])+'</h2><ul>'+sib.map(item).join("")+'</ul></section>':"";
 }
 return "";
}
export function renderArticle(packet,locale,row,matrix,topical=null,ix=rowsIndex(matrix),displayLead=packet.meta_description,reviewedUpdate=null){
 const htmlLang=locale.htmlLang||locale.code,url=SITE+row.url;
 const parent=ix.byId.get(row.parent_id);
 const home="/"+locale.code+"/";
 const parentURL=parent?.status==="PUBLISHED"?parent.url:home;
 const parentLabel=parent?.status==="PUBLISHED"?parent.working_title:locale.name;
 // A Hub's parent is the locale Pillar itself, so its trail is Global › Language › Hub; a guide's is Language › Hub › Guide.
 // Either way no URL appears twice in the BreadcrumbList.
 const trail=parentURL===home?[{name:"Global",url:"/"},{name:locale.name,url:home}]:[{name:locale.name,url:home},{name:parentLabel,url:parentURL}];
 const crumbs=trail.map((c,i)=>({"@type":"ListItem","position":i+1,"name":c.name,"item":SITE+c.url})).concat([{"@type":"ListItem","position":trail.length+1,"name":packet.title,"item":url}]);
 const org={"@type":"Organization","name":BRAND,"url":SITE+"/about/"};
 const img=socialImageFor(row);
 const article={"@type":"Article","headline":packet.title,"description":packet.meta_description,"inLanguage":htmlLang,"mainEntityOfPage":url,"image":{"@type":"ImageObject","url":SITE+img.path,"width":img.width,"height":img.height},"isPartOf":{"@type":"WebSite","name":BRAND,"url":SITE+"/"},"author":org,"publisher":{...org,"logo":{"@type":"ImageObject","url":SITE+"/assets/favicon.svg"}}};
 // The publication record's approval timestamp is the only dated event the repository holds for a page; no edit history is invented.
 if(packet.publication?.approved_at){article.datePublished=packet.publication.approved_at;article.dateModified=packet.publication.approved_at;}
 // A reviewed body change after publication (data/seo/page-updates.json) is the page's real modification date.
 if(article.datePublished&&reviewedUpdate&&reviewedUpdate>article.datePublished.slice(0,10))article.dateModified=reviewedUpdate;
 const data={"@context":"https://schema.org","@graph":[article,{"@type":"BreadcrumbList","itemListElement":crumbs}]};
 const faq=faqEntries(packet.body_markdown,locale.code);
 if(faq.length)data["@graph"].push(faqPageNode(faq));
 const sources=packet.sources.map(s=>'<li><a href="'+esc(s.url)+'" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join("");
 const cover=packet.cover_image?'<figure><img src="'+esc(packet.cover_image)+'" alt="'+esc(packet.cover_alt)+'" loading="lazy" decoding="async"><figcaption>'+esc(packet.image_credit)+'</figcaption></figure>':"";
 const json=JSON.stringify(data).replace(/</g,"\\u003c");
 const social='<meta property="og:site_name" content="'+esc(BRAND)+'"><meta property="og:image" content="'+SITE+img.path+'"><meta property="og:image:width" content="'+img.width+'"><meta property="og:image:height" content="'+img.height+'">\n<meta name="twitter:card" content="summary_large_image">';
 const crumbNav=trail.map(c=>'<a href="'+esc(c.url)+'">'+esc(c.name)+'</a>').join(' <span aria-hidden="true">›</span> ');
 return '<!doctype html>\n<html lang="'+esc(htmlLang)+'"><head>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+esc(packet.title)+'</title>\n<meta name="description" content="'+esc(packet.meta_description)+'">\n<link rel="canonical" href="'+esc(url)+'">\n<meta property="og:type" content="article"><meta property="og:title" content="'+esc(packet.title)+'"><meta property="og:description" content="'+esc(packet.meta_description)+'"><meta property="og:url" content="'+esc(url)+'">\n'+social+'\n<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">\n<link rel="stylesheet" href="/assets/styles.css">\n<link rel="stylesheet" href="/assets/navigation.css">\n<script type="application/ld+json">'+json+'</script>\n</head><body><a class="skip" href="#main">Skip to content</a><main id="main"><div class="container"><nav class="crumb" aria-label="Breadcrumb">'+crumbNav+'</nav><article class="article"><h1>'+esc(packet.h1)+'</h1><p class="article-lead">'+esc(displayLead)+'</p>'+cover+'<div class="article-copy">'+renderMarkdown(packet.body_markdown)+'</div>'+topicLinks(row,matrix,topical,locale.code,ix)+'<section class="article-references"><h2>'+esc((ARTICLE_LABELS[locale.code]||ARTICLE_LABELS.en)[2])+'</h2><ol>'+sources+'</ol></section>'+(packet.publication?'<p class="article-provenance">'+esc(AI_DISCLOSURE[locale.code]||AI_DISCLOSURE.en)+'</p>':'')+'<p><a href="'+esc(parentURL)+'">← '+esc(parentLabel)+'</a></p></article></div></main></body></html>\n';
}
export function generateApprovedArticles(root,matrix,locales){
 const dir=path.join(root,"content/articles");
 const pages={};
 if(!fs.existsSync(dir))return pages;
 // Keep the published lead independent of later metadata-only editorial changes.
 const leadFile=path.join(root,"content/article-leads.json");
 const leads=fs.existsSync(leadFile)?JSON.parse(fs.readFileSync(leadFile,"utf8")).leads:{};
 if(!leads||typeof leads!=="object"||Array.isArray(leads))throw Error("Invalid published article leads");
 const topical=loadTopicalMap(root),ix=rowsIndex(matrix),pageDates=reviewedPageDates(root);
 for(const file of fs.readdirSync(dir).sort()){
  if(!file.endsWith(".json"))continue;
  if(!/^[A-Z]{2}-[HS]\d{2,4}\.json$/.test(file))throw Error("Unexpected article filename: "+file);
  const packet=JSON.parse(fs.readFileSync(path.join(dir,file),"utf8"));
  const row=ix.byId.get(packet.matrix_id),locale=locales.find(l=>l.code===packet.locale);
  if(!row||row.status!=="PUBLISHED")throw Error("Article must have PUBLISHED Matrix row: "+file);
  if(file!==packet.matrix_id+".json")throw Error("Filename / Matrix ID mismatch");
  const qa=checkArticle(packet,matrix,locales,{allowPublished:true,assetsRoot:root,factMode:"strict",index:ix});
  if(!qa.passed)throw Error("Stored article QA failed "+file+": "+qa.errors.join("; "));
  const generated=htmlPagePath(row.url);
  if(pages[generated])throw Error("Article URL collision "+generated);
  if(Object.hasOwn(leads,packet.matrix_id)&&(typeof leads[packet.matrix_id]!=="string"||!leads[packet.matrix_id].trim()))throw Error("Invalid published lead: "+packet.matrix_id);
  pages[generated]=renderArticle(packet,locale,row,matrix,topical,ix,leads[packet.matrix_id]??packet.meta_description,pageDates.get(row.url)?.modified??null);
 }
 return pages;
}
