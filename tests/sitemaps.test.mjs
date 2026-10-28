import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {generateSitemaps,parseSitemapIndex,parseSitemapUrlset,readLocalSitemapInventory,publicationLastmod,SITEMAP_ORIGIN,SITEMAP_LIMIT} from "../scripts/sitemaps.mjs";

const langs=JSON.parse(fs.readFileSync("content/locales.json","utf8")).map(x=>x.code);
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const published=matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url).sort();
const toHtml=url=>url==="/"?"index.html":url.slice(1)+"index.html";

test("one sitemap index contains ten language shards and global pages, no IDEA or search",()=>{
 const found=readLocalSitemapInventory(process.cwd(),langs);
 assert.deepEqual(found.indexFiles,["sitemap-main.xml",...langs.map(code=>"sitemap-"+code+".xml")]);
 assert.equal(found.urls.length,published.length);
 assert.deepEqual(found.urls,published);
 assert.ok(!found.urls.includes("/search/"));
 for(const row of matrix.rows.filter(x=>x.status==="IDEA"))assert.ok(!found.urls.includes(row.url),row.id);
 for(const code of langs)assert.equal(found.byChild["sitemap-"+code+".xml"].length,matrix.rows.filter(r=>r.status==="PUBLISHED"&&r.url.startsWith("/"+code+"/")).length);
 assert.equal(found.byChild["sitemap-main.xml"].length,published.filter(u=>!langs.some(code=>u.startsWith("/"+code+"/"))).length);
});

test("sitemap bytes are deterministic derived state of only published generated pages",()=>{
 const expected=generateSitemaps(published.map(toHtml),langs,SITEMAP_ORIGIN,publicationLastmod(process.cwd(),matrix));
 const actualIndex=fs.readFileSync("sitemap.xml","utf8");
 assert.equal(expected["sitemap.xml"],actualIndex);
 for(const [name,xml]of Object.entries(expected))assert.equal(fs.readFileSync(name,"utf8"),xml,name);
 assert.equal(Object.keys(expected).length,12);
});

test("a newly approved localized article appears only in its own language shard",()=>{
 const files=generateSitemaps(["index.html","vi/index.html","en/index.html","en/topics/rental-bike-selection/index.html"],["vi","en"]);
 const children=parseSitemapIndex(files["sitemap.xml"]);
 assert.deepEqual(children,["sitemap-main.xml","sitemap-vi.xml","sitemap-en.xml"]);
 assert.deepEqual(parseSitemapUrlset(files["sitemap-en.xml"]),["/en/","/en/topics/rental-bike-selection/"]);
 assert.deepEqual(parseSitemapUrlset(files["sitemap-vi.xml"]),["/vi/"]);
 assert.deepEqual(parseSitemapUrlset(files["sitemap-main.xml"]),["/"]);
});

test("large locales shard automatically below protocol limits",()=>{
 const pages=["index.html","en/index.html"];
 for(let i=0;i<SITEMAP_LIMIT;i++)pages.push("en/guides/guide-"+String(i).padStart(6,"0")+"/index.html");
 const files=generateSitemaps(pages,["en"]);
 assert.deepEqual(parseSitemapIndex(files["sitemap.xml"]),["sitemap-main.xml","sitemap-en.xml","sitemap-en-2.xml"]);
 assert.equal(parseSitemapUrlset(files["sitemap-en.xml"]).length,SITEMAP_LIMIT);
 assert.equal(parseSitemapUrlset(files["sitemap-en-2.xml"]).length,1);
});

test("refuses unsafe URLs, duplicates and noindex utility pages",()=>{
 assert.throws(()=>generateSitemaps(["index.html","index.html"],["en"]),/Duplicate/);
 assert.throws(()=>generateSitemaps(["index.html","search/index.html"],["en"]),/Noindex/);
 assert.throws(()=>generateSitemaps(["../index.html"],["en"]),/Invalid/);
 assert.throws(()=>parseSitemapIndex('<?xml version="1.0"?><urlset></urlset>'),/Not a sitemap index/);
 const example=generateSitemaps(["index.html","vi/index.html"],["vi"]);
 assert.throws(()=>parseSitemapUrlset(example["sitemap.xml"]),/Not a URL sitemap/);
 assert.throws(()=>parseSitemapUrlset(example["sitemap-vi.xml"].replace(SITEMAP_ORIGIN,"https://other.example")),/Noncanonical/);
});
