// Global reusable chrome, search metadata shards and article reading UX.
// Must be applied AFTER shared navigation and BEFORE sitemap generation.
const HOST="https://global.rentbikehanoi.com";
const safe=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const strip=s=>String(s||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
const langUI={
 vi:["Tìm kiếm","Bài đã xuất bản","Mục lục","Bài liên quan","Lên đầu trang","Nguồn biên tập"],
 en:["Search","Published guides","On this page","Related guides","Back to top","Editorial team"],
 de:["Suche","Veröffentlichte Ratgeber","Inhalt","Weitere Ratgeber","Nach oben","Redaktion"],
 fr:["Recherche","Guides publiés","Sommaire","Guides associés","Retour en haut","Rédaction"],
 es:["Buscar","Guías publicadas","En esta página","Guías relacionadas","Volver arriba","Redacción"],
 nl:["Zoeken","Gepubliceerde gidsen","Inhoud","Gerelateerde gidsen","Terug naar boven","Redactie"],
 zh:["搜索","已发布的指南","目录","相关文章","返回顶部","编辑团队"],
 pt:["Pesquisar","Guias publicados","Nesta página","Guias relacionados","Voltar ao topo","Equipa editorial"],
 ko:["검색","게시된 가이드","목차","관련 가이드","맨 위로","편집팀"],
 ja:["検索","公開中のガイド","目次","関連記事","ページ上部へ","編集部"]
};
function makeSearchPage(locales){
 const opts=locales.map(l=>'<option value="'+safe(l.code)+'">'+safe(l.flag+" "+l.name)+'</option>').join("");
 const ld={"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Vietnam Two-Wheel Guide","url":HOST+"/"},{"@type":"WebPage","name":"Search published guides","url":HOST+"/search/","isPartOf":{"@id":HOST+"/"}}]};
 const json=JSON.stringify(ld).replace(/</g,"\\u003c");
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Search Multilingual Guides | Vietnam Two-Wheel Guide</title><meta name="description" content="Search published Vietnam motorbike rental guides by keyword and language. Search results use a bounded static metadata index.">'+
 '<link rel="canonical" href="'+HOST+'/search/"><meta property="og:type" content="website"><meta property="og:title" content="Search Vietnam Two-Wheel Guide"><meta property="og:url" content="'+HOST+'/search/">'+
 '<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><script type="application/ld+json">'+json+'</script></head>'+
 '<body><a class="skip" href="#main">Skip to content</a><header class="header"><div class="container header-in"><a class="brand" href="/">VIETNAM / WHEELS</a></div></header>'+
 '<main id="main"><section class="premium-search-hero"><div class="container"><p class="eyebrow">10 languages · published guides only</p><h1>Find a practical guide</h1><p>Search article titles and summaries in one language at a time. Unpublished topics never appear in results.</p>'+
 '<form id="premium-search-form" class="premium-search-form" role="search" action="/search/" method="get"><label for="premium-q">Your search</label><input id="premium-q" name="q" type="search" placeholder="e.g. helmet, deposit, motorcycle" minlength="2" maxlength="120" autocomplete="off">'+
 '<label for="premium-locale">Language</label><select id="premium-locale" name="lang">'+opts+'</select><button type="submit" class="btn">Search</button></form>'+
 '<p class="premium-search-hint">The search index contains metadata only. Articles load when you open a result.</p></div></section>'+
 '<section class="section"><div class="container"><h2>Results</h2><p id="premium-search-status" role="status" aria-live="polite">Enter a search term and choose a language.</p><div id="premium-search-results" class="premium-search-results"></div><nav id="premium-search-pages" aria-label="Search result pages"></nav><noscript>Enable JavaScript to search; you can still browse the 10 languages from the home page.</noscript></div></section></main>'+
 '<footer class="footer"><div class="container"><a href="/">Home</a><a href="/about/">About</a></div></footer></body></html>';
}
function addSearchMetadata(files,matrix,locales){
 const siteItems=matrix.rows.filter(r=>r.status==="PUBLISHED"&&r.locale!=="global"&&r.role!=="UTILITY");
 const size=150;const manifest={version:1,builtFrom:"PUBLISHED_HTML_ONLY",shardSize:size,locales:{}};
 for(const l of locales){
  const items=[];
  for(const r of siteItems.filter(r=>r.locale===l.code)){
   const page=r.url==="/"? "index.html":r.url.slice(1)+"index.html";
   const html=files[page];if(!html)throw Error("Published search entry missing HTML "+r.id);
   const match=(re)=>strip(html.match(re)?.[1]||"");
   items.push({u:r.url,t:match(/<title>([\s\S]*?)<\/title>/i),d:match(/<meta\s+name="description"\s+content="([^"]*)"/i),type:r.role});
  }
  items.sort((a,b)=>a.u.localeCompare(b.u));
  const shards=[];
  for(let n=0;n<items.length;n+=size){
   const id="assets/search-index/"+l.code+"-"+String(n/size).padStart(4,"0")+".json";
   files[id]=JSON.stringify(items.slice(n,n+size))+"\n";
   shards.push("/"+id);
  }
  manifest.locales[l.code]={count:items.length,shards};
 }
 files["assets/search-index/manifest.json"]=JSON.stringify(manifest,null,2)+"\n";
}
function enhanceArticle(html,route,matrix){
 const m=route.match(/^([a-z]{2})\/(?:checklist|topics\/[a-z0-9-]+|guides\/[a-z0-9-]+)\/index\.html$/);
 if(!m||!html.includes('<article class="article">'))return html;
 const code=m[1],tr=langUI[code]||langUI.en;
 const articleMatch=html.match(/<article class="article">([\s\S]*?)<\/article>/);
 if(!articleMatch)return html;
 let contents=articleMatch[1];const headings=[];const used=new Set();
 contents=contents.replace(/<h2(?:\s+[^>]*)?>([\s\S]*?)<\/h2>/gi,(full,label)=>{
  const labelText=strip(label);
  let id="section-"+String(headings.length+1);
  if(used.has(id))id+="-alt";used.add(id);
  headings.push({id,title:labelText});
  return '<h2 id="'+id+'">'+label+'</h2>';
 });
 const pRow=matrix.rows.find(r=>r.url==="/"+route.replace(/index\.html$/,""));
 const related=matrix.rows.filter(r=>r.status==="PUBLISHED"&&r.locale===code&&r.url!==pRow?.url&&r.role!=="UTILITY"&&r.role!=="LANGUAGE_SELECTOR"&&(r.parent_id===pRow?.parent_id||r.parent_id===pRow?.id||r.role==="PILLAR")).slice(0,5);
 const menu=headings.length>=2?'<nav class="premium-toc" aria-label="'+safe(tr[2])+'"><strong>'+safe(tr[2])+'</strong><ol>'+headings.map(h=>'<li><a href="#'+h.id+'">'+safe(h.title)+'</a></li>').join("")+'</ol></nav>':"";
 const relatedNav=related.length?'<nav class="premium-related" aria-label="'+safe(tr[3])+'"><strong>'+safe(tr[3])+'</strong>'+related.map(r=>'<a href="'+safe(r.url)+'">'+safe(r.working_title)+'</a>').join("")+'</nav>':"";
 const signature='<p class="premium-author">'+safe(tr[5])+': <a href="/about/">Vietnam Two-Wheel Guide</a> · <a href="/contact/">Contact / corrections</a></p>';
 const rebuilt='<article class="article premium-article-grid"><div class="premium-reading-content">'+contents+signature+'</div><aside class="premium-rail">'+menu+relatedNav+'</aside></article>';
 return html.replace(articleMatch[0],rebuilt);
}
export function applyPremium(files,matrix,locales){
 files["search/index.html"]=makeSearchPage(locales);
 const routes=Object.keys(files).filter(p=>p.endsWith(".html"));
 const published=matrix.rows.filter(x=>x.status==="PUBLISHED");
 for(const p of routes){
  let h=files[p];
  if(!h.includes('href="/assets/premium.css"'))h=h.replace('</head>','<link rel="stylesheet" href="/assets/premium.css"><script src="/assets/premium.js" defer></script>'+ (p==="search/index.html"?'<script src="/assets/search.js" defer></script>':"")+'</head>');
  h=enhanceArticle(h,p,matrix);
  if(!h.includes('id="top"'))h=h.replace('<body>','<body id="top">');
  const l=p.match(/^([a-z]{2})\//)?.[1],tr=langUI[l]||langUI.en;
  if(!h.includes('class="premium-search-link"')){
   const link='<a class="premium-search-link" href="/search/" aria-label="'+safe(tr[0])+'">⌕ <span>'+safe(tr[0])+'</span></a>';
   h=h.replace('</div></header>','</div></header>'); // No-op fallback for pages without a shared header.
   if(h.includes('class="nav2-head-inner"'))h=h.replace(/(<\/div><\/header>)/,link+'$1');
   else h=h.replace('</header>',link+'</header>');
  }
  if(!h.includes('class="premium-back-top"'))h=h.replace('</body>','<a class="premium-back-top" href="#top" aria-label="'+safe(tr[4])+'">↑ <span>'+safe(tr[4])+'</span></a></body>');
  if(h.includes('premium-article-grid')&&!h.includes('id="premium-reading-progress"'))h=h.replace('</head>','</head>').replace('<body id="top">','<body id="top"><div id="premium-reading-progress" aria-hidden="true"></div>');
  files[p]=h;
 }
 addSearchMetadata(files,matrix,locales);
 return files;
}
