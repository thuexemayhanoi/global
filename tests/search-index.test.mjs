import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("static metadata indexing has real shards for each supported locale",()=>{
 const m=JSON.parse(fs.readFileSync("assets/search-index/manifest.json","utf8"));
 assert.equal(m.shardSize,150);
 assert.equal(Object.keys(m.locales).length,10);
 const listed=Object.values(m.locales).reduce((n,l)=>n+l.count,0);
 const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
 assert.equal(listed,matrix.rows.filter(r=>r.status==="PUBLISHED"&&["PILLAR","HUB","SUPPORT"].includes(r.role)).length);
 const source=fs.readFileSync("assets/search.js","utf8");
 assert.ok(source.includes("const LIMIT=12"));
 assert.ok(source.includes("await fetch(file)"));
 assert.ok(!source.includes("https://cdn."));
});
