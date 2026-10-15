import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {drainDecision,selectForPublication} from "../scripts/auto-publisher-core.mjs";
const standing=JSON.parse(fs.readFileSync("approvals/standing-policy-20261015.json","utf8"));

test("ten queued QA-eligible drafts drain in five pairs of two without inventing more work",()=>{
 let waiting=Array.from({length:10},(_,i)=>"EN-S"+String(i+1).padStart(2,"0"));
 const published=[];
 for(let i=0;i<5;i++){
  const state={paused:false,published:published.map(id=>({id,live_qa:"PASS"}))};
  const decision=drainDecision({state,eligible:waiting});
  assert.equal(decision.continue,true);
  assert.equal(decision.next_ids.length,2);
  assert.deepEqual(decision.next_ids,waiting.slice(0,2));
  published.push(...decision.next_ids);
  waiting=waiting.slice(2);
 }
 assert.equal(published.length,10);
 assert.deepEqual(waiting,[]);
 const done=drainDecision({state:{paused:false,published:[]},eligible:waiting});
 assert.equal(done.continue,false);
 assert.equal(done.reason,"QUEUE_DRAINED_OR_HELD");
});

test("never dispatch when paused, live QA pending, or queue empty",()=>{
 assert.equal(drainDecision({state:{paused:true},eligible:["NL-H01"]}).reason,"PAUSED");
 const pending=drainDecision({state:{published:[{id:"PT-H01",live_qa:"PENDING"}]},eligible:["NL-H01"]});
 assert.equal(pending.continue,false);
 assert.equal(pending.reason,"LIVE_QA_PENDING");
 assert.deepEqual(pending.outstanding,["PT-H01"]);
 assert.equal(drainDecision({state:{},eligible:[]}).continue,false);
});

test("workflow serializes runs, checks live QA before dispatch and never bypasses eligibility",()=>{
 const y=fs.readFileSync(".github/workflows/auto-publisher.yml","utf8");
 const cli=fs.readFileSync("scripts/auto-publisher.mjs","utf8");
 assert.match(y,/queue: max/);
 assert.match(y,/actions: write/);
 assert.match(y,/id: finalize/);
 assert.match(y,/steps\.live\.outcome == 'success' && steps\.finalize\.outcome == 'success'/);
 assert.match(y,/node scripts\/auto-publisher\.mjs drain-decision/);
 assert.match(y,/gh workflow run auto-publisher\.yml --ref main -f action=publish -f max=2/);
 assert.match(cli,/function cmdDrainDecision\(\)/);
 // Drain and publish use the same selection, so the drain never promises a pair the publisher would refuse.
 assert.match(cli,/const ready=selectForPublication\(rs,\{state:c\.state,standing:c\.standing,max:2\}\)/);
 assert.match(cli,/selectForPublication\(rs,\{state:c\.state,standing:c\.standing,max,only:/);
 assert.match(cli,/drainDecision\(\{state:c\.state,eligible:ready\}\)/);
 assert.match(y,/cron: '41 \* \* \* \*'/); // low-frequency fallback if a run is interrupted
});

test("selection: Hubs first, at most two, stage cap per locale, and failing drafts never block eligible ones",()=>{
 const r=(id,locale,role,decision="APPROVED_BY_POLICY",priority=1)=>({id,locale,role,decision,priority});
 const results=[r("EN-S01","en","SUPPORT"),r("NL-H01","nl","HUB"),r("PT-H01","pt","HUB"),r("ES-H01","es","HUB","REJECTED"),r("KO-H01","ko","HUB","REVIEW_REQUIRED")];
 assert.deepEqual(selectForPublication(results,{state:{stage:"PILOT",published:[]},standing,max:2}).map(x=>x.id),["NL-H01","PT-H01"]);
 assert.deepEqual(selectForPublication(results,{state:{stage:"PILOT",published:[{locale:"nl"},{locale:"nl"}]},standing,max:2}).map(x=>x.id),["PT-H01","EN-S01"]);
 assert.deepEqual(selectForPublication(results,{state:{stage:"PILOT",published:[]},standing,max:2,only:["EN-S01"]}).map(x=>x.id),["EN-S01"]);
 assert.deepEqual(selectForPublication([r("ES-H01","es","HUB","REJECTED")],{state:{},standing,max:2}),[]);
});
