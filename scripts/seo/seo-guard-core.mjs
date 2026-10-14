/**
 * SEO protection guard — pure functions, no I/O.
 *
 * Freezes every live (PUBLISHED) URL together with an SEO fingerprint of the
 * signals Google and AI search engines read first: lang, canonical, robots,
 * title, meta description, H1, hreflang cluster and JSON-LD types.
 *
 * A frozen URL may never disappear silently. Removing or moving one requires a
 * reviewed `retired` entry naming a PUBLISHED replacement. A changed
 * fingerprint fails until the registry is deliberately re-frozen in a
 * reviewed commit, so accidental generator regressions cannot ship.
 */
export const ORIGIN="https://global.rentbikehanoi.com";
export const FINGERPRINT_FIELDS=["lang","canonical","robots","title","description","h1","h1_count","hreflang","schema_types"];
const decode=s=>String(s||"").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const text=s=>decode(String(s||"").replace(/<[^>]+>/g," ")).replace(/\s+/gu," ").trim();
const attr=(tag,name)=>tag.match(new RegExp("\\b"+name+"=\"([^\"]*)\"","i"))?.[1]??null;
export const pageFile=url=>url==="/"?"index.html":url.slice(1)+"index.html";

function schemaTypes(html){
 const types=new Set();
 for(const m of html.matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi)){
  let data;
  try{data=JSON.parse(m[1]);}catch{types.add("INVALID_JSON_LD");continue;}
  const nodes=Array.isArray(data)?data:Array.isArray(data?.["@graph"])?data["@graph"]:[data];
  for(const n of nodes){const t=n?.["@type"];for(const x of Array.isArray(t)?t:[t])if(typeof x==="string")types.add(x);}
 }
 return [...types].sort();
}

export function fingerprint(html){
 const tags=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
 const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
 const canonical=tags.filter(t=>/\brel="canonical"/i.test(t)).map(t=>attr(t,"href"));
 const hreflang=tags.filter(t=>/\brel="alternate"/i.test(t)&&/\bhreflang="/i.test(t))
  .map(t=>[attr(t,"hreflang"),attr(t,"href")]).sort((a,b)=>a[0].localeCompare(b[0]));
 const robots=metas.find(t=>/\bname="robots"/i.test(t));
 const description=metas.find(t=>/\bname="description"/i.test(t));
 const h1s=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
 return {
  lang:html.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1]??null,
  canonical:canonical.length===1?canonical[0]:canonical.length?"MULTIPLE:"+canonical.join("|"):null,
  robots:robots?attr(robots,"content"):"index,follow (default)",
  title:text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1])||null,
  description:description?decode(attr(description,"content")):null,
  h1:h1s.length?text(h1s[0][1]):null,
  h1_count:h1s.length,
  hreflang:Object.fromEntries(hreflang),
  schema_types:schemaTypes(html)
 };
}
const indexable=fp=>!/noindex/i.test(fp.robots||"");
const mainOf=html=>(String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[,""])[1];
const CJK=new Set(["zh","ja","ko"]);
/** Published-content snapshot: main-text size and H2 outline (additions allowed, losses fail). */
export function contentSnapshot(html,locale){
 const main=mainOf(html);
 const t=text(main.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," "));
 const words=CJK.has(locale)?[...new Intl.Segmenter(locale,{granularity:"word"}).segment(t)].filter(w=>w.isWordLike).length:t.split(/\s+/u).filter(Boolean).length;
 return {main_words:words,h2:[...main.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m=>text(m[1])).filter(Boolean)};
}
export const CONTENT_LOSS_TOLERANCE=0.9;

/**
 * Build a registry from the current build. `previous` keeps reviewed
 * `retired` entries and refuses to drop a frozen URL that has no retirement.
 */
export function buildRegistry({matrix,locales,files,previous=null}){
 const published=matrix.rows.filter(r=>r.status==="PUBLISHED").sort((a,b)=>a.url.localeCompare(b.url));
 const retired=previous?.retired||[];
 const retiredUrls=new Set(retired.map(r=>r.url));
 const errors=[];
 const urls=published.map(r=>{
  const html=files[pageFile(r.url)];
  if(typeof html!=="string"){errors.push("PUBLISHED HTML missing for "+r.url);return null;}
  return {url:r.url,id:r.id,locale:r.locale,role:r.role,fingerprint:fingerprint(html),content:contentSnapshot(html,r.locale)};
 }).filter(Boolean);
 const now=new Set(urls.map(u=>u.url));
 for(const old of previous?.urls||[])if(!now.has(old.url)&&!retiredUrls.has(old.url))
  errors.push("Refusing to unfreeze "+old.url+": add a reviewed retired entry with a PUBLISHED redirect_to first");
 if(errors.length)throw Error(errors.join("; "));
 const utilities=Object.keys(files).filter(k=>k.endsWith("index.html")).map(k=>k==="index.html"?"/":"/"+k.slice(0,-10))
  .filter(u=>!now.has(u)).filter(u=>!indexable(fingerprint(files[pageFile(u)]))).sort()
  .map(u=>({url:u,robots:fingerprint(files[pageFile(u)]).robots}));
 return {
  version:1,origin:ORIGIN,
  policy:"Every frozen URL must stay PUBLISHED, indexable, self-canonical and in the sitemap with an unchanged SEO fingerprint, keep its frozen H2 outline and at least 90% of its main-text words. Change fingerprints only through a reviewed `node scripts/seo/seo-guard.mjs --write` commit. Removal or moves need a reviewed retired entry with a PUBLISHED redirect_to; GitHub Pages has no server 301, so a retired path must keep a static HTML redirect stub.",
  locales:locales.map(l=>l.code),
  frozen_count:urls.length,
  urls,
  retired,
  noindex_utilities:utilities
 };
}

/**
 * Publisher mode: append newly PUBLISHED URLs to the registry without touching
 * any existing frozen entry, retirement or utility.
 */
export function addNewToRegistry({previous,matrix,locales,files}){
 const fresh=buildRegistry({matrix,locales,files,previous});
 const known=new Set(previous.urls.map(u=>u.url));
 const added=fresh.urls.filter(u=>!known.has(u.url));
 const urls=[...previous.urls,...added].sort((a,b)=>a.url.localeCompare(b.url));
 const utilities=[...previous.noindex_utilities];
 for(const u of fresh.noindex_utilities)if(!utilities.some(x=>x.url===u.url))utilities.push(u);
 utilities.sort((a,b)=>a.url.localeCompare(b.url));
 return {registry:{...previous,frozen_count:urls.length,urls,noindex_utilities:utilities},added:added.map(u=>u.url)};
}

/**
 * Compare the current build to the frozen registry.
 * planned = URLs that must never be linked/indexed (IDEA rows, topical proposals).
 */
export function checkGuard({registry,matrix,locales,files,sitemapUrls,cname,robots,planned=[],searchShards=[]}){
 const findings=[];
 const fail=(code,url,message)=>findings.push({level:"FAIL",code,url,message});
 const warn=(code,url,message)=>findings.push({level:"WARN",code,url,message});
 const publishedRows=matrix.rows.filter(r=>r.status==="PUBLISHED");
 const published=new Set(publishedRows.map(r=>r.url));
 const sitemap=new Set(sitemapUrls);
 const htmlLang=Object.fromEntries(locales.map(l=>[l.code,l.htmlLang]));
 const retired=new Map((registry.retired||[]).map(r=>[r.url,r]));
 if(registry?.version!==1||registry.origin!==ORIGIN||!Array.isArray(registry.urls))fail("REGISTRY_INVALID","/","Frozen URL registry is missing or malformed");
 if(cname!=="global.rentbikehanoi.com")fail("CNAME_CHANGED","/CNAME","CNAME must stay exactly global.rentbikehanoi.com");
 if(!/^User-agent: \*/m.test(robots)||!robots.includes(ORIGIN+"/sitemap.xml")||/^Disallow:\s*\/\s*$/m.test(robots))
  fail("ROBOTS_UNSAFE","/robots.txt","robots.txt must allow crawling and advertise the sitemap index");
 for(const r of registry.retired||[]){
  if(!published.has(r.redirect_to)||!String(r.reason||"").trim()||!String(r.approved_by||"").trim())
   fail("RETIREMENT_INVALID",r.url,"Retired URL needs reason, approved_by and a PUBLISHED redirect_to");
  if(published.has(r.url))fail("RETIREMENT_CONFLICT",r.url,"URL is both retired and PUBLISHED");
  if(sitemap.has(r.url))fail("RETIRED_IN_SITEMAP",r.url,"Retired URL is still listed in the sitemap");
 }
 // 1. Frozen URLs: existence, publication, sitemap, fingerprint.
 for(const frozen of registry.urls||[]){
  const {url}=frozen;
  if(retired.has(url))continue;
  const html=files[pageFile(url)];
  if(!published.has(url))fail("FROZEN_URL_UNPUBLISHED",url,"Live URL is no longer PUBLISHED in the Matrix (needs a reviewed retirement plan)");
  if(typeof html!=="string"){fail("FROZEN_URL_MISSING",url,"Live HTML disappeared from the build");continue;}
  if(!sitemap.has(url))fail("FROZEN_URL_NOT_IN_SITEMAP",url,"Live URL dropped from the sitemap index");
  const now=fingerprint(html);
  for(const k of FINGERPRINT_FIELDS){
   const a=JSON.stringify(frozen.fingerprint?.[k]),b=JSON.stringify(now[k]);
   if(a!==b)fail("FINGERPRINT_CHANGED",url,k+" changed: "+a+" → "+b+" (re-freeze with --write only after review)");
  }
  if(frozen.content){
   const c=contentSnapshot(html,frozen.locale);
   if(c.main_words<Math.floor(frozen.content.main_words*CONTENT_LOSS_TOLERANCE))fail("CONTENT_LOSS",url,"Main text fell from "+frozen.content.main_words+" to "+c.main_words+" words (>10% loss)");
   for(const h of frozen.content.h2)if(!c.h2.includes(h))fail("HEADING_REMOVED",url,"Published H2 section removed: "+h);
  }
 }
 const frozenUrls=new Set((registry.urls||[]).map(u=>u.url));
 // 2. Every published page: canonical, lang, indexability, uniqueness, hreflang.
 const titles=new Map(),descriptions=new Map(),prints=new Map();
 for(const row of publishedRows){
  const html=files[pageFile(row.url)];
  if(typeof html!=="string"){fail("PUBLISHED_HTML_MISSING",row.url,"Matrix PUBLISHED row has no generated HTML");continue;}
  const fp=fingerprint(html);prints.set(row.url,fp);
  if(!frozenUrls.has(row.url))warn("UNFROZEN_PUBLISHED_URL",row.url,"New PUBLISHED URL is not frozen yet; run node scripts/seo/seo-guard.mjs --write in the reviewed publication PR");
  if(fp.canonical!==ORIGIN+row.url)fail("CANONICAL_NOT_SELF",row.url,"Canonical must self-reference "+ORIGIN+row.url+", found "+fp.canonical);
  if(!indexable(fp))fail("PUBLISHED_NOINDEX",row.url,"PUBLISHED page carries noindex");
  if(htmlLang[row.locale]&&fp.lang!==htmlLang[row.locale])fail("LANG_MISMATCH",row.url,"Expected lang "+htmlLang[row.locale]+", found "+fp.lang);
  if(fp.h1_count!==1)fail("H1_COUNT",row.url,"Expected exactly one H1, found "+fp.h1_count);
  if(!fp.title)fail("TITLE_MISSING",row.url,"Missing title");
  if(!fp.description)fail("DESCRIPTION_MISSING",row.url,"Missing meta description");
  if(fp.schema_types.includes("INVALID_JSON_LD"))fail("SCHEMA_INVALID",row.url,"A JSON-LD block does not parse");
  const tk=String(fp.title||"").toLocaleLowerCase(),dk=String(fp.description||"").toLocaleLowerCase();
  if(tk){if(titles.has(tk))fail("DUPLICATE_TITLE",row.url,"Title duplicates "+titles.get(tk));else titles.set(tk,row.url);}
  if(dk){if(descriptions.has(dk))fail("DUPLICATE_DESCRIPTION",row.url,"Meta description duplicates "+descriptions.get(dk));else descriptions.set(dk,row.url);}
 }
 // 3. hreflang: targets published, language code correct, self-reference, reciprocity.
 const codeOk=(code,url)=>{
  const loc=url.match(/^\/([a-z]{2})\//)?.[1];
  return loc?htmlLang[loc]===code:false;
 };
 for(const [url,fp] of prints){
  const entries=Object.entries(fp.hreflang);
  if(!entries.length)continue;
  if(!entries.some(([,href])=>href===ORIGIN+url))fail("HREFLANG_NO_SELF",url,"hreflang cluster lacks a self reference");
  for(const [code,href] of entries){
   if(!href?.startsWith(ORIGIN+"/")){fail("HREFLANG_OFFSITE",url,code+" points off-site: "+href);continue;}
   const target=href.slice(ORIGIN.length);
   if(!published.has(target)){fail("HREFLANG_UNPUBLISHED_TARGET",url,code+" → "+target+" is not a PUBLISHED URL");continue;}
   if(code==="x-default")continue;
   if(!codeOk(code,target))fail("HREFLANG_CODE_MISMATCH",url,code+" does not match the language of "+target);
   const back=prints.get(target);
   if(back&&!Object.values(back.hreflang).includes(ORIGIN+url))fail("HREFLANG_NOT_RECIPROCAL",url,target+" does not return-link to "+url);
  }
 }
 // 4. Sitemap must only contain indexable PUBLISHED URLs.
 for(const u of sitemap){
  if(!published.has(u))fail("SITEMAP_UNPUBLISHED",u,"Sitemap lists a URL that is not PUBLISHED");
  const fp=prints.get(u);if(fp&&!indexable(fp))fail("SITEMAP_NOINDEX",u,"Sitemap lists a noindex page");
 }
 for(const util of registry.noindex_utilities||[]){
  const html=files[pageFile(util.url)];
  if(typeof html!=="string"){fail("UTILITY_MISSING",util.url,"Noindex utility page disappeared");continue;}
  if(indexable(fingerprint(html)))fail("UTILITY_INDEXABLE",util.url,"Utility page lost its noindex directive");
  if(sitemap.has(util.url))fail("UTILITY_IN_SITEMAP",util.url,"Noindex utility listed in the sitemap");
 }
 // 5. Planned/proposed URLs must never leak into HTML links, hreflang, canonical, sitemap or search shards.
 const plannedSet=new Set(planned.filter(u=>!published.has(u)));
 for(const [key,html] of Object.entries(files)){
  if(!key.endsWith(".html"))continue;
  for(const m of html.matchAll(/\bhref="([^"#?]+)/g)){
   const href=m[1].startsWith(ORIGIN)?m[1].slice(ORIGIN.length):m[1];
   if(plannedSet.has(href))fail("PLANNED_URL_LEAK",href,"Unpublished planned URL linked from "+key);
  }
 }
 for(const u of plannedSet)if(sitemap.has(u))fail("PLANNED_URL_IN_SITEMAP",u,"Unpublished planned URL is in the sitemap");
 const shardUrls=new Set();
 for(const shard of searchShards){
  let data;try{data=JSON.parse(shard);}catch{fail("SEARCH_SHARD_INVALID","/assets/search-index/","A search index file is not valid JSON");continue;}
  if(Array.isArray(data))for(const v of data)if(v&&typeof v.u==="string")shardUrls.add(v.u);
 }
 for(const u of plannedSet)if(shardUrls.has(u))fail("PLANNED_URL_IN_SEARCH",u,"Unpublished planned URL in search index shard");
 findings.push(...checkLinks({matrix,files}));
 return findings;
}

const GENERIC_ANCHORS=new Set(["click here","here","read more","more","read","learn more","link","this page","xem thêm","tại đây","bấm vào đây","hier","mehr","weiterlesen","ici","cliquez ici","en savoir plus","aquí","leer más","más","klik hier","lees meer","aqui","leia mais","saiba mais","点击这里","这里","更多","여기","더보기","こちら","詳しくはこちら","もっと見る"]);
const anchorText=s=>text(s).replace(/[→←↗↓↑›»«⌄✳·|]/g," ").replace(/\s+/g," ").trim().toLocaleLowerCase();
function anchors(html){
 return [...String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(m=>({
  href:(m[1].match(/\bhref="([^"]*)"/i)||[])[1]||"",text:anchorText(m[2]),aria:(m[1].match(/\baria-label="([^"]*)"/i)||[])[1]||""
 })).map(a=>({...a,path:a.href.startsWith(ORIGIN)?a.href.slice(ORIGIN.length):a.href})).filter(a=>a.path.startsWith("/"))
  .map(a=>({...a,path:a.path.split("#")[0].split("?")[0]})).filter(a=>a.path);
}
/**
 * Internal-link audit over PUBLISHED pages: two-way parent/child links,
 * orphans, empty/ambiguous/generic anchors and anchor diversity.
 */
export function checkLinks({matrix,files}){
 const findings=[];
 const fail=(code,url,message)=>findings.push({level:"FAIL",code,url,message});
 const warn=(code,url,message)=>findings.push({level:"WARN",code,url,message});
 const rows=matrix.rows.filter(r=>r.status==="PUBLISHED"&&typeof files[pageFile(r.url)]==="string");
 const byId=new Map(rows.map(r=>[r.id,r])),byUrl=new Map(rows.map(r=>[r.url,r]));
 const all=new Map(),main=new Map(),inbound=new Map(rows.map(r=>[r.url,new Set()])),contextual=new Map(rows.map(r=>[r.url,[]]));
 for(const r of rows){
  const html=files[pageFile(r.url)];
  all.set(r.url,anchors(html));main.set(r.url,anchors(mainOf(html)));
  for(const a of all.get(r.url))if(a.path!==r.url&&inbound.has(a.path))inbound.get(a.path).add(r.url);
  for(const a of main.get(r.url))if(a.path!==r.url&&contextual.has(a.path))contextual.get(a.path).push({from:r.url,text:a.text});
 }
 for(const r of rows){
  if(r.url!=="/"&&!inbound.get(r.url).size)fail("ORPHAN_PAGE",r.url,"No PUBLISHED page links to this URL");
  const parent=byId.get(r.parent_id);
  if(parent&&parent.role!=="LANGUAGE_SELECTOR"&&(r.role==="HUB"||r.role==="SUPPORT")){
   if(!main.get(parent.url).some(a=>a.path===r.url))fail("PARENT_MISSING_CHILD_LINK",parent.url,"Parent "+parent.id+" has no in-content link to published child "+r.id);
   if(!all.get(r.url).some(a=>a.path===parent.url))fail("CHILD_MISSING_PARENT_LINK",r.url,r.id+" does not link back to its parent "+parent.id);
  }
  const seen=new Map();
  for(const a of main.get(r.url)){
   if(!a.text&&!a.aria)fail("EMPTY_ANCHOR",r.url,"Internal link to "+a.path+" has no text or aria-label");
   if(GENERIC_ANCHORS.has(a.text)&&byUrl.has(a.path))warn("GENERIC_ANCHOR",r.url,"Generic anchor '"+a.text+"' → "+a.path);
   if(a.text&&byUrl.has(a.path)){
    if(seen.has(a.text)&&seen.get(a.text)!==a.path)warn("AMBIGUOUS_ANCHOR",r.url,"Anchor '"+a.text+"' points to "+seen.get(a.text)+" and "+a.path);
    else seen.set(a.text,a.path);
   }
  }
 }
 for(const [url,list] of contextual){
  const pages=new Set(list.map(x=>x.from)),texts=new Set(list.map(x=>x.text).filter(Boolean));
  if(pages.size>=3&&texts.size===1)warn("ANCHOR_DIVERSITY",url,pages.size+" pages link here with the identical anchor '"+[...texts][0]+"'");
 }
 return findings;
}
