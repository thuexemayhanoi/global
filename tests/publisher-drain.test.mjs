import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {drainDecision} from "../scripts/auto-publisher-core.mjs";

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
 assert.match(cli,/const ready=pick\(rs,c,2,null\)/);
 assert.match(cli,/drainDecision\(\{state:c\.state,eligible:ready\}\)/);
 assert.match(y,/cron: '41 \* \* \* \*'/); // low-frequency fallback if a run is interrupted
});
