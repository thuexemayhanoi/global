import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {inspectHTML,inspectProduction} from "../scripts/seo/post-publish-qa.mjs";
test("live HTML check refuses wrong lang, canonical or missing shared UI",()=>{
 const bad='<html lang="de"><head><link rel="canonical" href="https://wrong.site/en/"></head><body><h1>Title</h1><main><p>Text</p></main></body></html>';
 const issues=inspectHTML(bad,"/en/","en");
 assert.ok(issues.some(e=>e.includes("Canonical")));
 assert.ok(issues.some(e=>e.includes("Wrong language")));
 assert.ok(issues.some(e=>e.includes("Shared navigation")));
});
test("valid HTML source can be verified offline before live fetch",()=>{
 const html='<html lang="en"><head><link rel="canonical" href="https://global.rentbikehanoi.com/en/"><link rel="stylesheet" href="/assets/premium.css"></head><body><header data-nav-version="2"></header><h1>Heading</h1><main><p>Substantial descriptive text.</p></main><footer data-footer-version="2"></footer></body></html>';
 assert.deepEqual(inspectHTML(html,"/en/","en"),[]);
});
const localFetcher=(mutate=(r,t)=>t)=>async url=>{
 const route=new URL(url).pathname;
 const file=route==="/"?"index.html":route.endsWith("/")?route.slice(1)+"index.html":route.slice(1);
 if(!fs.existsSync(file))return {status:404,text:async()=>"not found"};
 return {status:200,text:async()=>mutate(route,fs.readFileSync(file,"utf8"))};
};
test("whole live QA passes against the reviewed build and catches repo↔production drift",async()=>{
 const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8")),locales=JSON.parse(fs.readFileSync("content/locales.json","utf8"));
 const registry=JSON.parse(fs.readFileSync("data/seo/url-freeze.json","utf8"));
 const ok=await inspectProduction(localFetcher(),"https://global.rentbikehanoi.com",matrix,locales,registry);
 assert.deepEqual(ok.issues,[]);
 assert.ok(ok.evidence.filter(e=>e.fingerprint_checked).length>=25);
 const drift=await inspectProduction(localFetcher((r,t)=>r==="/fr/"?t.replace(/<title>[^<]*/,"<title>Changed live"):r==="/de/"?t.replace("</main>","<p>Tel 0942 467 674</p></main>"):t),"https://global.rentbikehanoi.com",matrix,locales,registry);
 assert.ok(drift.issues.some(i=>/fingerprint drift \/fr\/: title/.test(i)));
 assert.ok(drift.issues.some(i=>/NAP_DISPLAY_NOT_APPROVED \/de\//.test(i)));
});

test("a transient 5xx answer is retried; a persistent one is still reported",async()=>{
 const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8")),locales=JSON.parse(fs.readFileSync("content/locales.json","utf8"));
 const registry=JSON.parse(fs.readFileSync("data/seo/url-freeze.json","utf8"));
 const target=matrix.rows.find(r=>r.status==="PUBLISHED"&&r.role==="SUPPORT").url;
 const flaky=(failures)=>{const seen=new Map();const base=localFetcher();return async(url,opts)=>{const route=new URL(url).pathname;
  if(route===target){const n=(seen.get(route)||0)+1;seen.set(route,n);if(n<=failures)return {status:503,text:async()=>"Service Unavailable"};}
  return base(url,opts);};};
 const once=await inspectProduction(flaky(1),"https://global.rentbikehanoi.com",matrix,locales,registry);
 assert.deepEqual(once.issues,[]);
 const always=await inspectProduction(flaky(3),"https://global.rentbikehanoi.com",matrix,locales,registry);
 assert.ok(always.issues.includes("Unexpected HTTP status 503 "+target));
});
