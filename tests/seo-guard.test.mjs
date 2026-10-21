import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {readLocalSitemapInventory} from "../scripts/sitemaps.mjs";
import {buildRegistry,checkGuard,fingerprint,ORIGIN,checkLinks,addNewToRegistry,contentSnapshot} from "../scripts/seo/seo-guard-core.mjs";
import {collectHtml} from "../scripts/seo/seo-guard.mjs";
const read=p=>fs.readFileSync(p,"utf8");
const matrix=JSON.parse(read("data/seo/master-matrix.json"));
const locales=JSON.parse(read("content/locales.json"));
const registry=JSON.parse(read("data/seo/url-freeze.json"));
const files=collectHtml(process.cwd());
const sitemapUrls=readLocalSitemapInventory(process.cwd(),locales.map(l=>l.code)).urls;
const base=()=>({registry:structuredClone(registry),matrix:structuredClone(matrix),locales,files:{...files},sitemapUrls:[...sitemapUrls],
 cname:read("CNAME").trim(),robots:read("robots.txt"),planned:matrix.rows.filter(r=>r.status!=="PUBLISHED").map(r=>r.url),searchShards:[]});
const codes=findings=>findings.filter(f=>f.level==="FAIL").map(f=>f.code);

test("every live URL is frozen with its current SEO fingerprint and the guard passes",()=>{
 const published=matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url).sort();
 assert.deepEqual(registry.urls.map(u=>u.url).sort(),published);
 assert.ok(registry.urls.length>=25);
 assert.ok(fs.statSync("data/seo/url-freeze.json").size<25e6,"shard the registry by locale before ~25,000 URLs (docs/PERFORMANCE-LIMITS.md)");
 assert.deepEqual(registry.noindex_utilities.map(u=>u.url),["/search/"]);
 assert.deepEqual(codes(checkGuard(base())),[]);
 // Re-freezing must reproduce every frozen SEO fingerprint (content snapshots may only grow after publication).
 const fresh=buildRegistry({matrix,locales,files,previous:registry});
 for(const u of registry.urls){
  const f=fresh.urls.find(x=>x.url===u.url);
  assert.deepEqual(f.fingerprint,u.fingerprint,u.url);
  if(u.content)assert.ok(f.content.main_words>=Math.floor(u.content.main_words*0.9),u.url);
 }
});

test("fingerprint reads lang, canonical, robots, title, description, H1, hreflang and schema types",()=>{
 const fp=fingerprint(files["de/index.html"]);
 assert.equal(fp.lang,"de");
 assert.equal(fp.canonical,ORIGIN+"/de/");
 assert.equal(fp.h1_count,1);
 assert.equal(fp.hreflang["zh-CN"],ORIGIN+"/zh/");
 assert.equal(fp.hreflang["x-default"],ORIGIN+"/");
 assert.ok(fp.schema_types.includes("WebPage"));
 assert.match(fingerprint(files["search/index.html"]).robots,/noindex/);
});

test("accidental title, canonical or lang regressions on a live page fail",()=>{
 const ctx=base();
 ctx.files["en/index.html"]=ctx.files["en/index.html"].replace(/<title>[^<]*<\/title>/,"<title>Changed</title>");
 ctx.files["fr/index.html"]=ctx.files["fr/index.html"].replace('<html lang="fr"','<html lang="en"');
 ctx.files["ja/checklist/index.html"]=ctx.files["ja/checklist/index.html"].replace(ORIGIN+"/ja/checklist/\">",ORIGIN+"/ja/\">");
 const c=codes(checkGuard(ctx));
 assert.ok(c.includes("FINGERPRINT_CHANGED"));
 assert.ok(c.includes("LANG_MISMATCH"));
 assert.ok(c.includes("CANONICAL_NOT_SELF"));
});

test("a live URL can never disappear, be unpublished or drop out of the sitemap silently",()=>{
 const ctx=base();
 delete ctx.files["ko/checklist/index.html"];
 ctx.matrix.rows.find(r=>r.url==="/nl/").status="IDEA";
 ctx.sitemapUrls=ctx.sitemapUrls.filter(u=>u!=="/pt/");
 const c=codes(checkGuard(ctx));
 assert.ok(c.includes("FROZEN_URL_MISSING"));
 assert.ok(c.includes("FROZEN_URL_UNPUBLISHED"));
 assert.ok(c.includes("FROZEN_URL_NOT_IN_SITEMAP"));
 const shrunk={...matrix,rows:matrix.rows.filter(r=>r.url!=="/vi/checklist/")};
 assert.throws(()=>buildRegistry({matrix:shrunk,locales,files,previous:registry}),/Refusing to unfreeze \/vi\/checklist\//);
});

test("retirement needs a reviewed reason, approver and a PUBLISHED redirect target",()=>{
 const ctx=base();
 ctx.registry.retired=[{url:"/old-page/",redirect_to:"/nowhere/",reason:"",approved_by:""}];
 assert.ok(codes(checkGuard(ctx)).includes("RETIREMENT_INVALID"));
 ctx.registry.retired=[{url:"/old-page/",redirect_to:"/en/",reason:"Merged into English pillar after review",approved_by:"owner"}];
 assert.deepEqual(codes(checkGuard(ctx)),[]);
});

test("planned or proposed URLs never leak into links, sitemap or search shards",()=>{
 const ctx=base();
 const idea=matrix.rows.find(r=>r.status==="IDEA").url;
 ctx.files["en/index.html"]=ctx.files["en/index.html"].replace("</main>",'<a href="'+idea+'">x</a></main>');
 ctx.sitemapUrls.push(idea);
 ctx.searchShards=['[{"u":"'+idea+'","t":"x","d":"x","type":"SUPPORT"}]'];
 const c=codes(checkGuard(ctx));
 for(const code of ["PLANNED_URL_LEAK","PLANNED_URL_IN_SITEMAP","PLANNED_URL_IN_SEARCH","SITEMAP_UNPUBLISHED"])assert.ok(c.includes(code),code);
});

test("hreflang must stay reciprocal, published and correctly coded",()=>{
 const ctx=base();
 ctx.files["de/checklist/index.html"]=ctx.files["de/checklist/index.html"].replace('<link rel="alternate" hreflang="en" href="'+ORIGIN+'/en/checklist/">',"");
 ctx.files["es/index.html"]=ctx.files["es/index.html"].replace('hreflang="ko" href="'+ORIGIN+'/ko/"','hreflang="ko" href="'+ORIGIN+'/ko/topics/x/"');
 const c=codes(checkGuard(ctx));
 assert.ok(c.includes("HREFLANG_NOT_RECIPROCAL"));
 assert.ok(c.includes("HREFLANG_UNPUBLISHED_TARGET"));
});

test("noindex utility, CNAME and robots are protected; new published URLs only warn until frozen",()=>{
 const ctx=base();
 ctx.files["search/index.html"]=ctx.files["search/index.html"].replace('<meta name="robots" content="noindex,follow">',"");
 ctx.cname="example.com";
 ctx.robots="User-agent: *\nDisallow: /\n";
 const c=codes(checkGuard(ctx));
 for(const code of ["UTILITY_INDEXABLE","CNAME_CHANGED","ROBOTS_UNSAFE"])assert.ok(c.includes(code),code);
 const grow=base();
 grow.registry.urls=grow.registry.urls.filter(u=>u.url!=="/about/");
 const f=checkGuard(grow);
 assert.deepEqual(codes(f),[]);
 assert.ok(f.some(x=>x.level==="WARN"&&x.code==="UNFROZEN_PUBLISHED_URL"&&x.url==="/about/"));
});

test("duplicate titles or descriptions across published pages fail",()=>{
 const ctx=base();
 const d=fingerprint(ctx.files["en/index.html"]).description;
 ctx.files["de/index.html"]=ctx.files["de/index.html"].replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+d+'">');
 assert.ok(codes(checkGuard(ctx)).includes("DUPLICATE_DESCRIPTION"));
});

test("published content cannot silently shrink or lose a section",()=>{
 const ctx=base();
 const en=ctx.files["en/index.html"];
 ctx.files["en/index.html"]=en.replace(/<section class="section"><div class="container"><p class="overline">FAQ<\/p>[\s\S]*?<\/section>/,"");
 const c=codes(checkGuard(ctx));
 assert.ok(c.includes("HEADING_REMOVED"),c.join());
 const shrink=base();
 // Compare loss with the current document, including reviewed additive upgrades.
 // An older frozen minimum can be shorter than the text left by this mutation.
 shrink.registry=buildRegistry({matrix,locales,files,previous:registry});
 shrink.files["ja/checklist/index.html"]=shrink.files["ja/checklist/index.html"].replace(/<p>[^<]{20,}<\/p>/g,"<p>短</p>");
 assert.ok(codes(checkGuard(shrink)).includes("CONTENT_LOSS"));
 const grow=base();
 grow.files["de/index.html"]=grow.files["de/index.html"].replace("</main>","<section><h2>Neu</h2><p>Zusätzlicher Inhalt für Leser.</p></section></main>");
 assert.ok(!codes(checkGuard(grow)).some(x=>x==="CONTENT_LOSS"||x==="HEADING_REMOVED"));
 assert.ok(contentSnapshot(files["zh/index.html"],"zh").main_words>100,"CJK text is segmented, not split on spaces");
});

test("internal links: orphans, two-way parent/child links and anchor quality",()=>{
 assert.deepEqual(checkLinks({matrix,files}).filter(f=>f.level==="FAIL"),[]);
 const m=structuredClone(matrix),f={...files};
 m.rows.push({id:"EN-H01X",locale:"en",url:"/en/topics/test-hub/",role:"HUB",status:"PUBLISHED",parent_id:"EN-HOME",cluster:"vehicle-choice"});
 f["en/topics/test-hub/index.html"]='<html><body><main><h1>Hub</h1><p>No links.</p><a href="/de/">here</a><a href="/en/checklist/">Guide</a><a href="/fr/">Guide</a><a href="/es/"></a></main></body></html>';
 const r=checkLinks({matrix:m,files:f}),c=r.map(x=>x.level+":"+x.code);
 for(const code of ["FAIL:ORPHAN_PAGE","FAIL:PARENT_MISSING_CHILD_LINK","FAIL:CHILD_MISSING_PARENT_LINK","FAIL:EMPTY_ANCHOR","WARN:GENERIC_ANCHOR","WARN:AMBIGUOUS_ANCHOR"])assert.ok(c.includes(code),code);
});

test("publisher freezing adds only new URLs and never re-freezes existing ones",()=>{
 const m=structuredClone(matrix),f={...files};
 m.rows.push({id:"EN-H01X",locale:"en",url:"/en/topics/test-hub/",role:"HUB",status:"PUBLISHED",parent_id:"EN-HOME",cluster:"vehicle-choice"});
 f["en/topics/test-hub/index.html"]=files["en/checklist/index.html"].replace(ORIGIN+"/en/checklist/",ORIGIN+"/en/topics/test-hub/");
 f["en/index.html"]=files["en/index.html"].replace(/<title>[^<]*/,"<title>Drifted");
 const {registry:next,added}=addNewToRegistry({previous:registry,matrix:m,locales,files:f});
 assert.deepEqual(added,["/en/topics/test-hub/"]);
 assert.equal(next.frozen_count,registry.frozen_count+1);
 assert.deepEqual(next.urls.find(u=>u.url==="/en/").fingerprint,registry.urls.find(u=>u.url==="/en/").fingerprint,"existing fingerprints are never overwritten");
 assert.ok(fs.readFileSync("scripts/seo/publish-batch.mjs","utf8").includes('run("scripts/seo/seo-guard.mjs","--add-new")'));
});
