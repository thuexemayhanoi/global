import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {readLocalSitemapInventory} from "../scripts/sitemaps.mjs";
import {buildRegistry,checkGuard,fingerprint,ORIGIN} from "../scripts/seo/seo-guard-core.mjs";
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
 assert.deepEqual(registry.noindex_utilities.map(u=>u.url),["/search/"]);
 assert.deepEqual(codes(checkGuard(base())),[]);
 // Re-freezing the unchanged build must be byte-stable.
 assert.deepEqual(buildRegistry({matrix,locales,files,previous:registry}),registry);
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
 ctx.searchShards=['[{"url":"'+idea+'"}]'];
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
