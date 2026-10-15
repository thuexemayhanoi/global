import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {generateSitemaps,parseSitemapIndex,parseSitemapUrlset,sitemapChildURL,fetchSitemapInventory,SITEMAP_ORIGIN} from "../scripts/sitemaps.mjs";
import {liveCheckOnce,runLiveQA,liveVerdict,pageURL} from "../scripts/publisher-live-qa.mjs";
import {recordLiveQA,publishGate,drainDecision,unverifiedLive} from "../scripts/auto-publisher-core.mjs";

const ORIGIN=SITEMAP_ORIGIN;
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const matrix=read("data/seo/master-matrix.json"),locales=read("content/locales.json"),standing=read("approvals/standing-policy-20261015.json");
const langs=locales.map(l=>l.code);
const published=matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url).sort();
const toKey=url=>url==="/"?"index.html":url.slice(1)+"index.html";
// Synthetic target: never a real Matrix URL, so the fixture stays valid after real publications.
const NEW={id:"NL-H999",url:"/nl/topics/live-qa-regression-fixture/",title:"Scooter & motor: welke tweewieler?",lang:"nl"};
assert.ok(!published.includes(NEW.url));
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const page=(t,extra="")=>'<!doctype html><html lang="'+t.lang+'"><head><title>'+esc(t.title)+'</title><link rel="canonical" href="'+ORIGIN+t.url+'">'+
 '<link rel="stylesheet" href="/assets/premium.css"></head><body><header data-nav-version="2"></header><main><h1>'+esc(t.title)+'</h1><p>Body text.</p>'+
 '<p class="article-provenance">AI assisted.</p>'+extra+'</main><footer data-footer-version="2"></footer></body></html>';
const sitemapFiles=(urls=[...published,NEW.url])=>generateSitemaps(urls.map(toKey),langs);

/**
 * Fake production. URL parsing goes through `new Request()`, exactly like the real
 * fetch(): a bare "sitemap-main.xml" throws "Failed to parse URL from sitemap-main.xml".
 */
function production({files=sitemapFiles(),pages={[NEW.url]:page(NEW)},override=()=>null}={}){
 const calls=[];
 const fetcher=async (input,init)=>{
  const req=new Request(input,init);
  const u=new URL(req.url);calls.push(u.href);
  const forced=override(u,calls.length);
  if(forced instanceof Error)throw forced;
  if(forced)return {status:forced.status,text:async()=>forced.text??"",headers:new Headers(forced.headers||{})};
  const name=u.pathname.slice(1);
  if(files[name]!==undefined)return {status:200,text:async()=>files[name],headers:new Headers()};
  if(pages[u.pathname]!==undefined)return {status:200,text:async()=>pages[u.pathname],headers:new Headers()};
  return {status:404,text:async()=>"Not found",headers:new Headers()};
 };
 fetcher.calls=calls;
 return fetcher;
}
const fastClock=()=>{let t=0;return {clock:()=>t,sleep:async ms=>{t+=ms;}};};
const qa=(fetcher,extra={})=>runLiveQA({targets:[NEW],origin:ORIGIN,localeCodes:langs,fetcher,...fastClock(),...extra});

test("P0 regression (run 38668639207): the old loop fetched bare sitemap names and could never pass",async()=>{
 const fetcher=production();
 // Verbatim shape of the pre-fix code: parseSitemapIndex() names went straight into fetch().
 const legacy=async()=>{
  const get=async url=>{const r=await fetcher(url,{headers:{"cache-control":"no-cache"}});return {status:r.status,text:await r.text()};};
  const idx=await get(ORIGIN+"/sitemap.xml"),urls=new Set();
  for(const s of parseSitemapIndex(idx.text,ORIGIN)){const r=await get(s);for(const u of parseSitemapUrlset(r.text,ORIGIN))urls.add(u);}
  return urls;
 };
 await assert.rejects(legacy(),/Failed to parse URL from sitemap-main\.xml/);
 const r=await qa(fetcher);
 assert.equal(r.verdict,"PASS",JSON.stringify(r.issues));
 assert.equal(r.sitemap.children,1+langs.length);
 assert.ok(fetcher.calls.every(u=>u.startsWith(ORIGIN+"/")),"every request stays on the production origin");
 for(const name of Object.keys(sitemapFiles()).filter(n=>n!=="sitemap.xml"))assert.ok(fetcher.calls.some(u=>u.startsWith(ORIGIN+"/"+name+"?qa=")),name+" fetched as an absolute URL");
});

test("sitemap child names resolve only to the production origin; traversal, hosts, queries and encodings are refused",()=>{
 assert.equal(sitemapChildURL("sitemap-main.xml"),ORIGIN+"/sitemap-main.xml");
 assert.equal(sitemapChildURL("sitemap-ja-12.xml"),ORIGIN+"/sitemap-ja-12.xml");
 for(const name of parseSitemapIndex(fs.readFileSync("sitemap.xml","utf8")))assert.equal(sitemapChildURL(name),ORIGIN+"/"+name);
 for(const bad of ["../sitemap-en.xml","/sitemap-en.xml","sitemap-en.xml?x=1","sitemap-en.xml#a","https://evil.example/sitemap-en.xml","//evil.example/sitemap-en.xml",
  "sitemap-%2e%2e.xml","sitemap-EN.xml","sitemap-en-1.xml","sitemap-en-01.xml","sitemap-en.xml/..",""," sitemap-en.xml",null,undefined,42])
  assert.throws(()=>sitemapChildURL(bad),/Invalid sitemap child/,String(bad));
 for(const origin of ["http://global.rentbikehanoi.com","https://u:p@global.rentbikehanoi.com","https://global.rentbikehanoi.com/x/","not a url"])
  assert.throws(()=>sitemapChildURL("sitemap-en.xml",origin),String(origin));
 assert.equal(pageURL(NEW.url),ORIGIN+NEW.url);
 for(const bad of ["nl/x/","/nl/../x/","//evil.example/","/nl/x","https://evil.example/"])assert.throws(()=>pageURL(bad),/Invalid page route/,bad);
});

test("live sitemap inventory covers main + all ten locale shards and rejects broken live sitemaps",async()=>{
 const local=generateSitemaps(published.map(toKey),langs);
 const get=async url=>{const n=new URL(url).pathname.slice(1);return local[n]!==undefined?{status:200,text:local[n]}:{status:404,text:""};};
 const inv=await fetchSitemapInventory(get,{origin:ORIGIN,localeCodes:langs});
 assert.deepEqual(inv.urls,published);
 assert.deepEqual(inv.children,["sitemap-main.xml",...langs.map(c=>"sitemap-"+c+".xml")]);
 const broken=async (mutate,re)=>{
  const files=structuredClone(local);mutate(files);
  const g=async url=>{const n=new URL(url).pathname.slice(1);return files[n]!==undefined?{status:200,text:files[n]}:{status:404,text:""};};
  await assert.rejects(fetchSitemapInventory(g,{origin:ORIGIN,localeCodes:langs}),e=>e.kind==="SITE"&&re.test(e.message));
 };
 await broken(f=>{delete f["sitemap-ko.xml"];},/HTTP 404 \/sitemap-ko\.xml/);
 await broken(f=>{f["sitemap.xml"]=f["sitemap.xml"].replace(/<sitemap><loc>[^<]*sitemap-ja\.xml<\/loc><\/sitemap>\n?/,"");},/Missing locale sitemap ja/);
 await broken(f=>{f["sitemap-de.xml"]=f["sitemap-de.xml"].replace("/de/checklist/","/fr/checklist/");},/wrong locale shard|Duplicate/);
 await broken(f=>{f["sitemap-en.xml"]="<html>not xml</html>";},/sitemap-en\.xml invalid/);
 await broken(f=>{f["sitemap.xml"]="<urlset></urlset>";},/sitemap index invalid/);
});

test("deployment lag and CDN staleness are retried until production catches up, then PASS",async()=>{
 // Pages deploy lags: the new page 404s for the first three polls.
 let pagePolls=0;
 const lag=production({override:u=>u.pathname===NEW.url&&++pagePolls<=3?{status:404,text:"Not found"}:null});
 const r1=await qa(lag);
 assert.equal(r1.verdict,"PASS");
 assert.equal(r1.attempts,4);
 // CDN serves a cached sitemap without the new URL unless the request is cache-busted.
 const stale=sitemapFiles(published);
 const cdn=production({override:u=>/^\/sitemap/.test(u.pathname)&&!u.search?{status:200,text:stale[u.pathname.slice(1)]}:null});
 assert.equal((await qa(cdn)).verdict,"PASS","sitemap requests carry ?qa= and bypass the stale CDN copy");
 // A sitemap that is stale at the origin for the whole window is a real SITE failure.
 const never=production({files:stale});
 const r3=await qa(never,{timeoutMs:120000,intervalMs:20000});
 assert.equal(r3.verdict,"FAIL");
 assert.ok(r3.issues.some(i=>i.kind==="SITE"&&/not in live sitemap/.test(i.detail)));
 assert.ok(r3.attempts>1);
});

test("verdicts: wrong production content FAILs (rollback); tool or network trouble is INCONCLUSIVE (no rollback)",async()=>{
 const wrong=production({pages:{[NEW.url]:page(NEW).replace('class="article-provenance"',"")}});
 const f=await qa(wrong,{timeoutMs:40000});
 assert.equal(f.verdict,"FAIL");
 assert.ok(f.issues.some(i=>/provenance/.test(i.detail)));
 const noindex=production({override:u=>u.pathname===NEW.url?{status:200,text:page(NEW),headers:{"x-robots-tag":"noindex"}}:null});
 assert.equal((await qa(noindex,{timeoutMs:20000})).verdict,"FAIL");
 // Network down for the whole window: no evidence that the site is wrong.
 const down=production({override:()=>Object.assign(new TypeError("fetch failed"),{cause:{code:"ECONNRESET"}})});
 const n=await qa(down,{timeoutMs:60000});
 assert.equal(n.verdict,"INCONCLUSIVE");
 assert.ok(n.issues.every(i=>i.kind==="NETWORK"));
 // A QA-tool defect (here: an unbuildable route) stops at once and never blames production.
 const t=await qa(production(),{targets:[{...NEW,url:"nl/no-leading-slash/"}]});
 assert.equal(t.verdict,"INCONCLUSIVE");
 assert.equal(t.attempts,1);
 assert.equal(t.issues[0].kind,"TOOL");
 assert.equal(liveVerdict([]),"PASS");
 assert.equal(liveVerdict([{kind:"TOOL"},{kind:"SITE"}]),"FAIL");
 assert.equal(liveVerdict([{kind:"TOOL"},{kind:"NETWORK"}]),"INCONCLUSIVE");
 const once=await liveCheckOnce({targets:[NEW],origin:ORIGIN,localeCodes:langs,fetcher:production()});
 assert.deepEqual(once.issues,[]);
});

test("recorded verdicts: PASS counts a clean run; FAIL and INCONCLUSIVE pause; nothing auto-resumes",()=>{
 const base={version:1,stage:"PILOT",paused:false,clean_runs:0,published:[{id:"NL-H01",locale:"nl",live_qa:"PENDING"},{id:"PT-H01",locale:"pt",live_qa:"PENDING"}],runs:[]};
 const now="2026-10-15T10:00:00.000Z",ids=["NL-H01","PT-H01"];
 const pass=recordLiveQA(base,{ids,verdict:"PASS",now,standing,commit:"c".repeat(40)});
 assert.equal(pass.clean_runs,1);assert.equal(pass.paused,false);
 assert.deepEqual(pass.published.map(p=>p.live_qa),["PASS","PASS"]);
 assert.equal(pass.last_successful_deployment.commit,"c".repeat(40));
 const second=recordLiveQA({...pass,published:[...pass.published,{id:"ES-H01",locale:"es",live_qa:"PENDING"}]},{ids:["ES-H01"],verdict:"PASS",now,standing});
 assert.equal(second.stage,"RAMP","PILOT advances after two clean live runs");
 const fail=recordLiveQA(base,{ids,verdict:"FAIL",now,standing,issues:[{kind:"SITE",scope:"NL-H01",detail:"HTTP 404"}]});
 assert.equal(fail.paused,true);assert.match(fail.pause_reason,/Live QA failed .*HTTP 404/);
 const inc=recordLiveQA(base,{ids,verdict:"INCONCLUSIVE",now,standing,issues:[{kind:"TOOL",scope:"sitemap",detail:"bad URL"}]});
 assert.equal(inc.paused,true);assert.match(inc.pause_reason,/inconclusive.*no rollback/);
 assert.deepEqual(unverifiedLive(inc),ids,"inconclusive publications stay unverified");
 assert.deepEqual(publishGate(inc),{allowed:false,reason:"LIVE_QA_RECOVERY",recover:ids});
 assert.equal(drainDecision({state:{...inc,paused:false},eligible:["ES-H01"]}).reason,"LIVE_QA_PENDING");
 // Hourly recovery re-checks add no churn while the answer is unchanged, and never resume.
 assert.equal(recordLiveQA(inc,{ids,verdict:"INCONCLUSIVE",now:"2026-10-15T11:00:00.000Z",standing,recovery:true}),inc);
 const healed=recordLiveQA(inc,{ids,verdict:"PASS",now,standing,recovery:true});
 assert.deepEqual(healed.published.map(p=>p.live_qa),["PASS","PASS"]);
 assert.equal(healed.paused,true,"a verified recovery never lifts the pause; resume needs a confirmed dispatch");
 assert.equal(healed.clean_runs,0);
 assert.deepEqual(publishGate(healed),{allowed:false,reason:"PAUSED",recover:[]});
 assert.deepEqual(publishGate({...healed,paused:false}),{allowed:true,reason:"OPEN",recover:[]});
 assert.throws(()=>recordLiveQA(base,{ids,verdict:"MAYBE",now,standing}),/Unknown live QA verdict/);
});

test("workflow: only a FAIL verdict on a fresh publication reverts; INCONCLUSIVE and recovery never do",()=>{
 const y=fs.readFileSync(".github/workflows/auto-publisher.yml","utf8");
 assert.match(y,/live-qa --ids "\$PUB_IDS" --timeout-seconds 1200 --commit "\$PUB_SHA" --record --out "\$RUNNER_TEMP\/live-qa\.json"/);
 assert.match(y,/live-qa --ids "\$RECOVER_IDS" --timeout-seconds 600 --recovery --record --out "\$RUNNER_TEMP\/live-qa\.json"/);
 assert.match(y,/if \[ "\$verdict" = "INCONCLUSIVE" \] \|\| \[ -z "\$PUB_IDS" \]; then/);
 const inconclusive=y.slice(y.indexOf('if [ "$verdict" = "INCONCLUSIVE" ]'),y.indexOf("# FAIL on a fresh publication"));
 assert.doesNotMatch(inconclusive,/git revert/);
 assert.match(y.slice(y.indexOf("# FAIL on a fresh publication")),/git revert --no-edit "\$PUB_SHA"/);
 assert.match(y,/catch\{console\.log\("INCONCLUSIVE"\)\}/,"a missing verdict file is never treated as FAIL");
 assert.doesNotMatch(y,/--origin/);
});
