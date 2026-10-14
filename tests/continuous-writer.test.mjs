import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {decideNext} from "../scripts/continuous-writer.mjs";
import {transitionPool} from "../scripts/writer-pool-core.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const board=JSON.parse(fs.readFileSync("factory/external-writers/assignments.json","utf8"));
const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
const ledger={version:1,revision:0,claims:[]};
const empty={files:[],errors:[]};
const session="w1-test";
const branch="writer/w1-test";
const opts={writer:"W1",session,branch,registry};
test("read-only preview cannot authorize writing without a real committed claim",()=>{
 const status=decideNext(matrix,board,ledger,empty,opts);
 assert.equal(status.status,"CLAIM_REQUIRED");
 assert.equal(status.batch_size,0);
 assert.equal(status.items.length,2);
 assert.ok(status.claim_required);
 assert.ok(status.items.every(x=>!registry.protected.some(p=>p.id===x.id)));
});
test("confirmed claims authorize one pair for any Writer, including foreign legacy owners",()=>{
 const a=transitionPool(matrix,ledger,registry,"claim",{writer:"W1",session,branch,count:2},{nonce:"testing",now:"2026-10-14T00:00:00Z"});
 const status=decideNext(matrix,board,a.ledger,empty,opts);
 assert.equal(status.status,"WRITE_NEXT_PAIR");
 assert.equal(status.batch_size,2);
 assert.deepEqual(status.items.map(x=>x.id),a.ids);
});
test("missing or invalid drafted packet blocks further writing, not silently skipped",()=>{
 const claimed=transitionPool(matrix,ledger,registry,"claim",{writer:"W1",session,branch,count:2},{nonce:"repair",now:"2026-10-14T00:00:00Z"});
 const id=claimed.ids[0];
 const inbox={files:[{id,writer:"W1",path:"factory/external-writers/inbox/W1/"+id+".json",packet:{matrix_id:id}}],errors:[]};
 const r=decideNext(matrix,board,claimed.ledger,inbox,opts);
 assert.equal(r.status,"REPAIR_DRAFT");
 assert.ok(r.bad_drafts[0].errors.length);
});
test("three sessions see only their own confirmed IDs and never mistake a preview for a claim",()=>{
 let state=structuredClone(ledger);
 const all=new Set();
 for(const w of ["W1","W2","W3"]){
  const session=w.toLowerCase()+"-test",branch="writer/"+w.toLowerCase()+"-test";
  const out=transitionPool(matrix,state,registry,"claim",{writer:w,session,branch,count:2},{nonce:w,now:"2026-10-14T00:00:00Z"});
  state=out.ledger;for(const id of out.ids){assert.ok(!all.has(id));all.add(id);}
  const p=decideNext(matrix,board,state,empty,{writer:w,session,branch,registry});
  assert.equal(p.status,"WRITE_NEXT_PAIR");
  assert.deepEqual(p.items.map(x=>x.id),out.ids);
 }
 assert.equal(all.size,6);
 const none=decideNext(matrix,board,state,empty,{writer:"W1",session:"new-w1",branch:"writer/w1-new-w1",registry});
 assert.equal(none.status,"CLAIM_REQUIRED");
});
test("Supporting drafts are available after Hub drafts even before parent publication",()=>{
 let ledgerState=structuredClone(ledger);
 let claimed=[];
 for(let n=0;n<52;n++){
  const pair=transitionPool(matrix,ledgerState,registry,"claim",{writer:"W1",session,branch,count:2},{nonce:"loop"+n,now:"2026-10-14T00:00:00Z"});
  ledgerState=pair.ledger;claimed.push(...pair.ids);
  const submitted=transitionPool(matrix,ledgerState,registry,"submit",{writer:"W1",session,branch,ids:pair.ids.join(",")},{nonce:"submit"+n,now:"2026-10-14T00:00:00Z"});
  ledgerState=submitted.ledger;
 }
 assert.equal(claimed.length,104);
 assert.ok(claimed.some(id=>matrix.rows.find(r=>r.id===id).role==="SUPPORT"));
 const r=decideNext(matrix,board,ledgerState,empty,opts);
 assert.equal(r.status,"AWAIT_CLAIMS_OR_REVIEW");
});
test("invalid batch / unknown Writer always fails closed",()=>{
 assert.throws(()=>decideNext(matrix,board,ledger,empty,{...opts,count:8}),/pair size/);
 assert.throws(()=>decideNext(matrix,board,ledger,empty,{...opts,writer:"W4"}));
});
