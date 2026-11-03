// Premium Ultra layout: deterministic, indexable HTML enhancements.
// Only decorative structure and links to already published pages or in-page anchors.
import {cardAlt} from "./images/scenes.mjs";
import {localDate} from "./dates.mjs";
import {ui} from "./ui-strings.mjs";
const clean=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const plaintext=s=>String(s||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<[^>]+>/g," ").replace(/&[a-z]+;/gi," ").replace(/\s+/g," ").trim();
const micro={
 vi:["Lên kế hoạch","Chọn loại xe","Kiểm tra điều khoản","Nhận xe an toàn","4 chủ đề thiết yếu","Xem mục này","Tham khảo nguồn","Sao chép liên kết","Tập trung đọc","Mục lục bài","Đọc tiếp"],
 en:["Your rental plan","Choose a vehicle","Review the agreement","Check at pickup","4 essential topics","Jump to topic","Check sources","Copy link","Focus reading","Quick contents","Keep reading"],
 de:["Ihr Mietplan","Fahrzeug wählen","Vertrag prüfen","Bei Übergabe prüfen","4 wichtige Themen","Zum Thema","Quellen prüfen","Link kopieren","Lesemodus","Inhalt","Weiterlesen"],
 fr:["Votre parcours","Choisir le véhicule","Vérifier le contrat","Contrôler à la remise","4 thèmes essentiels","Voir la rubrique","Vérifier les sources","Copier le lien","Lecture ciblée","Sommaire","Continuer"],
 es:["Tu plan de alquiler","Elegir vehículo","Revisar contrato","Comprobar entrega","4 temas esenciales","Ir al tema","Consultar fuentes","Copiar enlace","Lectura enfocada","Índice","Seguir leyendo"],
 nl:["Je huurplan","Kies een voertuig","Controleer contract","Inspecteer bij afgifte","4 belangrijke onderwerpen","Ga naar onderwerp","Controleer bronnen","Link kopiëren","Rustig lezen","Inhoud","Verder lezen"],
 zh:["租车计划","选择车型","核对条款","交车前检查","4 个核心主题","查看主题","核对信息来源","复制链接","专注阅读","内容目录","继续阅读"],
 pt:["O seu plano","Escolher veículo","Verificar contrato","Inspeção na entrega","4 temas essenciais","Ver tema","Consultar fontes","Copiar ligação","Leitura focada","Índice","Continuar"],
 ko:["렌트 계획","차종 선택","계약 확인","인수 시 점검","4가지 주요 주제","주제로 이동","출처 확인","링크 복사","집중 읽기","목차","계속 읽기"],
 ja:["レンタルの準備","車種を選ぶ","契約を確認","受け取り時の点検","4つの重要テーマ","トピックへ","情報源を確認","リンクをコピー","集中して読む","目次","続きを読む"]
};
const origin="https://global.rentbikehanoi.com";
const publishedUrl=(row,files)=>row&&row.status==="PUBLISHED"&&Object.prototype.hasOwnProperty.call(files,row.url==="/"? "index.html":row.url.slice(1)+"index.html");
const classes=(code)=>micro[code]||micro.en;

const globalPhotoAssets=[{"path":"/topic-choose-bike.webp","title":"Choose your vehicle","desc":"Find a vehicle that fits your experience, route and needs."},{"path":"/topic-prices-deposits.webp","title":"Prices & deposits","desc":"Compare the full rental terms, not just the daily rate."},{"path":"/topic-documents.webp","title":"Documents & contracts","desc":"Know which questions to ask before signing."},{"path":"/topic-safety.webp","title":"Safety & pickup checks","desc":"Check the condition of the bike before riding."}];
// The hero is content and gets alt text describing the artwork (Hanoi-inspired illustration, not a photo of a shop).
// Gallery and topic-card images describe what the artwork shows in the page language (scripts/images/scenes.mjs,
// Matrix task IMG-00), never the topic name the card heading already gives, so screen readers hear no repetition.
const HERO_ALT="Illustration of a scooter rider on a lakeside street in Hanoi at sunset";
// Responsive hero: the LCP candidate of the root page (the only page that renders this photo; locale homes
// use the CSS artwork). The 1600×900 original stays the social preview image; the 800w and 1200w files are
// ImageMagick resizes of it, so phones no longer download the full-size file.
export const HERO_SRC="/hero-hanoi.webp";
export const HERO_SRCSET="/hero-hanoi-800.webp 800w, /hero-hanoi-1200.webp 1200w, /hero-hanoi.webp 1600w";
// Rendered width of .ultra-hero-photo per assets/ultra.css: up to 767px the hero grid is one column and the
// figure spans the .container (100vw - 36px); 768–880px it is still one column but capped at 520px; from 881px
// it sits in the second grid column (minmax(270px,.8fr) of a ≤1150px container), which never exceeds 470px.
export const HERO_SIZES="(max-width: 767px) calc(100vw - 36px), (max-width: 880px) 520px, 470px";
export function heroPreloadLink(){
 return '<link rel="preload" as="image" href="'+HERO_SRC+'" imagesrcset="'+HERO_SRCSET+'" imagesizes="'+HERO_SIZES+'" fetchpriority="high">';
}
// Topic photos: 960×720 originals stay the social/Article images; the 320w, 480w, 520w, 600w and 720w files are resizes for smaller slots.
// Rendered widths measured in Chromium at 300–1920 px, in 1 px steps around every breakpoint (task IMG-TOPIC-SIZES,
// 2026-11-03). Root gallery cards: viewport − 30px up to 350px, − 38px up to 575px, 538px up to 767px, then two
// columns ((viewport − 56px) / 2) up to 1023px, four ((viewport − 98px) / 4) up to 1186px and 272px from 1187px.
// Locale-home topic cards: viewport − 74px up to 760px, (viewport − 132px) / 2 up to 767px, (viewport − 168px) / 2
// up to 1186px, then 509px. The boxes are 4:3 or wider, so object-fit: cover never draws the image wider than the box.
export const TOPIC_SIZES={gallery:"(max-width: 350px) calc(100vw - 30px), (max-width: 575px) calc(100vw - 38px), (max-width: 767px) 538px, (max-width: 1023px) calc(50vw - 28px), (max-width: 1186px) calc(25vw - 24.5px), 272px",card:"(max-width: 760px) calc(100vw - 74px), (max-width: 767px) calc(50vw - 66px), (max-width: 1186px) calc(50vw - 84px), 509px"};
// 320w, 520w and 600w (Lanczos, WebP q80, method 6, the method that reproduces the 480w files byte for byte) leave a file
// close to every slot on 1× to 3× screens; 520w is the 509px desktop topic card at 1×.
const topicSrcset=path=>[320,480,520,600,720].map(w=>path.replace(/\.webp$/,"-"+w+".webp")+" "+w+"w").concat(path+" 960w").join(", ");
const topicImg=(path,sizes,code)=>'<img src="'+clean(path)+'" srcset="'+clean(topicSrcset(path))+'" sizes="'+sizes+'" width="960" height="720" loading="lazy" decoding="async" alt="'+clean(cardAlt(code,path))+'">';
function globalHeroPhoto(){
 return '<figure class="ultra-hero-photo"><img src="'+HERO_SRC+'" srcset="'+HERO_SRCSET+'" sizes="'+HERO_SIZES+'" width="1600" height="900" alt="'+clean(HERO_ALT)+'" fetchpriority="high" loading="eager" decoding="async"><figcaption><span>✳</span> HANOI-INSPIRED • TWO-WHEEL TRAVEL</figcaption></figure>';
}
function injectGatewayGallery(html){
 if(html.includes('class="ultra-gateway-gallery"'))return html;
 const gallery='<section class="ultra-gateway-gallery" aria-labelledby="ultra-gallery-heading"><div class="container"><div class="ultra-gallery-heading"><div><p class="ultra-gallery-overline">TRAVEL EDITORIAL</p><h2 id="ultra-gallery-heading">Discover our four guide topics</h2></div><p>Choose a language above to explore guidance on each topic.</p></div><div class="ultra-gallery-grid">'+globalPhotoAssets.map((item,i)=>'<article class="ultra-gallery-card"><div class="ultra-gallery-image">'+topicImg(item.path,TOPIC_SIZES.gallery,"en")+'</div><div class="ultra-gallery-content"><span class="ultra-gallery-count">0'+(i+1)+'</span><h3>'+clean(item.title)+'</h3><p>'+clean(item.desc)+'</p></div></article>').join("")+'</div></div></section>';
 return html.replace('</main>',gallery+'</main>');
}
function addTopicPhotos(html,code){
 if(html.includes('class="ultra-topic-image"'))return html;
 let idx=0;
 html=html.replace(/(<article class="topic ultra-topic-card" id="ultra-topic-\d+">)/g,head=>{
  const a=globalPhotoAssets[idx++];
  if(!a)throw Error("No image assigned to topic card "+idx);
  return head+'<div class="ultra-topic-image">'+topicImg(a.path,TOPIC_SIZES.card,code)+'</div>';
 });
 if(idx!==4)throw Error("Expected 4 images for all four topic cards, got "+idx);
 return html;
}

function heroArtwork(code){
 const tr=classes(code);
 return '<div class="ultra-hero-art" aria-hidden="true"><div class="ultra-art-glow"></div><div class="ultra-art-card"><div class="ultra-art-top"><span class="ultra-art-monogram">VW<span>✳</span></span><span class="ultra-art-pill">VIETNAM / WHEELS</span></div><p class="ultra-art-eyebrow">'+clean(tr[0])+'</p><div class="ultra-art-steps">'+[tr[1],tr[2],tr[3]].map((x,i)=>'<div class="ultra-art-step"><span>'+String(i+1).padStart(2,"0")+'</span><strong>'+clean(x)+'</strong><span class="ultra-art-check">↗</span></div>').join("")+'</div><div class="ultra-art-line"></div><div class="ultra-art-bottom"><span>'+clean(ui(code).langs)+'</span><span>'+clean(ui(code).hubs)+'</span></div></div><div class="ultra-art-satellite ultra-art-satellite--one">✦</div><div class="ultra-art-satellite ultra-art-satellite--two">◉</div></div>';
}
function heroMarkup(html,code){
 return html.replace(/<section class="hero"><div class="container hero-inner">([\s\S]*?)<\/div><\/section>/,(whole,inside)=>{
  const body=inside+(code===null?'<div class="ultra-hero-actions"><a href="#languages" class="ultra-outline-link">Explore languages ↓</a><a href="/search/" class="ultra-outline-link">Search guides ↗</a></div>':"");
  return '<section class="hero ultra-hero"><div class="container hero-inner ultra-hero-grid"><div class="ultra-hero-copy">'+body+'</div>'+(code===null?globalHeroPhoto():heroArtwork(code))+'</div></section>';
 });
}
function injectHome(html,code,matrix,files){
 if(html.includes('class="ultra-topic-tabs"'))return html;
 const tr=classes(code),l=code;
 const links=matrix.rows.filter(x=>x.locale===l&&x.role==="HUB").sort((a,b)=>a.priority-b.priority).slice(0,4);
 if(links.length!==4)throw Error("Ultra expects 4 hubs for "+code);
 let i=0;
 html=html.replace(/<article class="topic">/g,()=>'<article class="topic ultra-topic-card" id="ultra-topic-'+(++i)+'">');
 if(i!==4)throw Error("Homepage topic inventory drift: "+code+"="+i);
 html=addTopicPhotos(html,code);
 const chips='<nav class="ultra-topic-tabs" aria-label="'+clean(tr[4])+'">'+links.map((r,i)=>'<a href="#ultra-topic-'+(i+1)+'"><span>'+String(i+1).padStart(2,"0")+'</span>'+clean(r.working_title)+'</a>').join("")+'</nav>';
 html=html.replace('<div class="topic-grid">',chips+'<div class="topic-grid">');
 // A genuine internal-navigation section only. No IDEA slug becomes a URL.
 const available=matrix.rows.filter(r=>r.locale===l&&publishedUrl(r,files)&&(r.role==="HUB"||r.role==="SUPPORT")).slice(0,3);
 if(available.length>0){
  const region='<section class="ultra-next-reads" aria-label="'+clean(tr[10])+'"><div class="container"><div class="ultra-next-heading"><span class="ultra-kicker">EDITORIAL</span><h2>'+clean(tr[10])+'</h2></div><div class="ultra-next-grid">'+available.map(r=>'<a class="ultra-next-card" href="'+clean(r.url)+'"><span class="ultra-next-type">'+clean(r.role)+'</span><strong>'+clean(r.working_title)+'</strong><span>↗</span></a>').join("")+'</div></div></section>';
  html=html.replace('</main>',region+'</main>');
 }
 return html;
}
// Visible publication and update dates (Matrix task CONTENT-03). They are read from the page's own JSON-LD
// (datePublished/dateModified), the same source as sitemap <lastmod>, so the printed date never differs from them.
const DATE_LABELS={vi:["Đăng ngày","Cập nhật"],en:["Published","Updated"],de:["Veröffentlicht am","aktualisiert am"],fr:["Publié le","mis à jour le"],
 es:["Publicado el","actualizado el"],nl:["Gepubliceerd op","bijgewerkt op"],zh:["发布于","更新于"],pt:["Publicado em","atualizado em"],ko:["게시일","업데이트"],ja:["公開日","更新日"]};
export function pageDates(html,code){
 const m=html.match(/"datePublished":"([^"]+)","dateModified":"([^"]+)"/);
 if(!m)return "";
 const [pub,mod]=[m[1],m[2]],[lp,lu]=DATE_LABELS[code]||DATE_LABELS.en;
 const t=v=>'<time datetime="'+clean(v)+'">'+localDate(v,code)+'</time>';
 return '<span class="ultra-reading-dates"><span>'+lp+' '+t(pub)+'</span>'+(mod.slice(0,10)>pub.slice(0,10)?' <span>· '+lu+' '+t(mod)+'</span>':'')+'</span>';
}
function articleDecor(html,code){
 if(html.includes('class="ultra-reading-tools"'))return html;
 if(!html.includes('premium-article-grid'))return html;
 const tr=classes(code),match=html.match(/<nav class="premium-toc" aria-label="([^"]+)"><strong>[^<]+<\/strong><ol>([\s\S]*?)<\/ol><\/nav>/);
 const article=html.match(/<div class="premium-reading-content">([\s\S]*?)<\/div><aside class="premium-rail">/);
 if(!article)return html;
 // Reference check-date notes (CONTENT-04) are not reading matter: leave them out of the estimate.
 const estimated=Math.max(1,Math.ceil(plaintext(article[1].replace(/ <span class="ref-checked">[\s\S]*?<\/span>/g,"")).split(/\s+/).filter(Boolean).length/210));
 const top='<div class="ultra-reading-tools"><span class="ultra-reading-time"><span aria-hidden="true">◷ </span>'+clean(ui(code).read(estimated))+'</span>'+pageDates(html,code)+'<div class="ultra-reading-buttons"><button type="button" data-ultra-copy hidden>'+clean(tr[7])+'</button><button type="button" data-ultra-focus hidden aria-pressed="false">'+clean(tr[8])+'</button></div><span class="ultra-copy-feedback" aria-live="polite"></span></div>';
 const mobile=match?'<details class="ultra-mobile-toc"><summary>☷ '+clean(tr[9])+' <span aria-hidden="true">⌄</span></summary><nav aria-label="'+clean(match[1])+'"><ol>'+match[2]+'</ol></nav></details>':"";
 // Reading tools and mobile contents appear AFTER the meaningful article intro.
 if(html.includes('class="article-lead"'))html=html.replace(/(<p class="article-lead">[\s\S]*?<\/p>)/,'$1'+top+mobile);
 else html=html.replace(/(<div class="premium-reading-content">[\s\S]*?<h1[^>]*>[\s\S]*?<\/h1>)/,'$1'+top+mobile);
 return html;
}
function enhanceRoot(html){
 html=html.replace('<div class="language-grid" id="languages">','<div class="language-grid ultra-language-grid" id="languages">');
 const kicker='<div class="ultra-root-values" role="list"><div role="listitem"><span>01</span><strong>10 native-language guides</strong><small>Browse the site in your preferred language.</small></div><div role="listitem"><span>02</span><strong>Practical rental decisions</strong><small>Compare vehicle, documents, deposits and safety.</small></div><div role="listitem"><span>03</span><strong>Only real published pages</strong><small>Planned topics remain clearly marked as upcoming.</small></div></div>';
 html=html.replace('<section class="section"><div class="container"><h2>Choose your language</h2>',kicker+'<section class="section ultra-root-selector"><div class="container"><h2>Choose your language</h2>');
 return html;
}
export function applyUltra(files,matrix,locales){
 const known=new Set(locales.map(l=>l.code));
 for(const p of Object.keys(files).filter(p=>p.endsWith(".html"))){
  let html=files[p],locale=p.match(/^([a-z]{2})\//)?.[1]||null;
  if(locale&&!known.has(locale))locale=null;
  if(p==="index.html"){html=heroMarkup(html,null);html=enhanceRoot(html);html=injectGatewayGallery(html);}
  else if(locale&&p===locale+"/index.html"){html=heroMarkup(html,locale);html=injectHome(html,locale,matrix,files);}
  if(locale)html=articleDecor(html,locale);
  // Place the existing search control inside the same header flex container.
  if(html.includes('nav2-head-inner'))html=html.replace(/<\/div>(<a class="premium-search-link"[^>]*>[\s\S]*?<\/a>)<\/header>/,'$1</div></header>');
  if(p==="404.html")html=html.replace('<a class="btn" href="/">Browse languages →</a>','<div class="ultra-404-actions"><a class="btn" href="/">Browse languages →</a><a class="btn secondary" href="/search/">Search published guides ↗</a></div>');
  if(!html.includes('href="/assets/ultra.css?v=responsive-20261029-1"')&&!html.includes('href="/assets/site.css?v='))html=html.replace('</head>','<link rel="stylesheet" href="/assets/ultra.css?v=responsive-20261029-1"><script defer src="/assets/ultra.js"></script></head>');
  files[p]=html;
 }
 return files;
}
