// Live markup QA: the comparison is exact, reports the first differing line, and never skips a route it could not read.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {firstDifference,routesToCheck,compareLiveMarkup,localFile} from "../scripts/seo/live-markup-qa.mjs";

const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8"));
const origin="https://global.rentbikehanoi.com";
const serve=mutate=>async url=>{
 const route=url.replace(origin,"").replace(/\?.*$/,"");
 const file=path.join(root,localFile(route));
 if(!fs.existsSync(file))return{status:404,text:async()=>"<!doctype html>missing"};
 const text=mutate(route,fs.readFileSync(file,"utf8"));
 return{status:200,text:async()=>text};
};

test("routesToCheck starts at the root, covers every PUBLISHED URL once and ends with the two utilities",()=>{
 const routes=routesToCheck(matrix);
 const published=matrix.rows.filter(r=>r.status==="PUBLISHED").length;
 assert.equal(routes[0],"/");
 assert.equal(routes.length,published+2);
 assert.equal(new Set(routes).size,routes.length);
 assert.deepEqual(routes.slice(-2),["/search/","/404.html"]);
 assert.deepEqual(routesToCheck(matrix,3).length,3);
});

test("firstDifference is null for identical text and names the first changed line otherwise",()=>{
 assert.equal(firstDifference("a\nb\nc","a\nb\nc"),null);
 assert.deepEqual(firstDifference("a\nb\nc","a\nB\nc"),{line:2,live:"b",committed:"B"});
 assert.equal(firstDifference("a\nb","a\nb\nc").line,3);
});

test("the committed build passes against itself and a single changed byte on one page fails with its line",async()=>{
 const routes=routesToCheck(matrix,12);
 const clean=await compareLiveMarkup(serve((r,t)=>t),routes,{origin,root,cacheBust:"?qa=1"});
 assert.equal(clean.passed,true);
 assert.equal(clean.checked,12);
 assert.equal(clean.identical,12);
 const drift=await compareLiveMarkup(serve((r,t)=>r===routes[5]?t.replace("<title>","<title>LIVE "):t),routes,{origin,root});
 assert.equal(drift.passed,false);
 assert.deepEqual(drift.mismatched.map(m=>m.route),[routes[5]]);
 assert.ok(drift.mismatched[0].diff.line>0&&drift.mismatched[0].diff.live.includes("LIVE "));
});

test("a route that cannot be fetched or returns the wrong status is reported, never skipped",async()=>{
 const routes=["/","/no-such-route/"];
 const report=await compareLiveMarkup(serve((r,t)=>t),routes,{origin,root});
 assert.equal(report.checked,2);
 assert.equal(report.passed,false);
 assert.equal(report.mismatched[0].route,"/no-such-route/");
 assert.equal(report.mismatched[0].http_status,404);
 const broken=await compareLiveMarkup(async()=>{throw new Error("ECONNRESET");},["/"],{origin,root});
 assert.equal(broken.mismatched[0].error,"ECONNRESET");
});

test("a transient 5xx answer is retried and a persistent one is reported with its status",async()=>{
 const routes=routesToCheck(matrix,2);
 const calls=new Map();
 const flaky=serve((r,t)=>t);
 const fetcher=async(url,opts)=>{
  const n=(calls.get(url)||0)+1;calls.set(url,n);
  if(n===1)return{status:503,text:async()=>""};
  return flaky(url,opts);
 };
 const report=await compareLiveMarkup(fetcher,routes,{origin,root,cacheBust:"?qa=1"});
 assert.equal(report.passed,true,"one 503 followed by 200 is identical");
 assert.ok([...calls.values()].every(n=>n===2));
 const down=await compareLiveMarkup(async()=>({status:503,text:async()=>""}),routes,{origin,root,cacheBust:"?qa=1"});
 assert.equal(down.passed,false);
 assert.equal(down.mismatched.length,routes.length);
 assert.ok(down.mismatched.every(m=>m.http_status===503));
});
