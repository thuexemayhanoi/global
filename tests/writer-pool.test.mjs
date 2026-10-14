import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {poolCandidates,poolStatus,transitionPool,validatePool,ensureIdentity} from "../scripts/writer-pool-core.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
const currentLedger=JSON.parse(fs.readFileSync("factory/external-writers/claims.json","utf8"));
const original={version:1,revision:0,claims:[]};
test("real currently committed ledger is valid independent of synthetic test state",()=>{
 assert.deepEqual(validatePool(matrix,currentLedger,registry),[]);
});
const writer=(w)=>({writer:w,session:w.toLowerCase()+"-test",branch:"writer/"+w.toLowerCase()+"-test"});
const options=(id)=>({now:"2026-10-14T00:00:00.000Z",nonce:id});
test("actual PR #17's fourteen draft IDs are protected from every writer including original W1",()=>{
 assert.deepEqual(validatePool(matrix,original,registry),[]);
 assert.equal(registry.protected.length,14);
 assert.equal(new Set(registry.protected.map(x=>x.id)).size,14);
 for(const p of registry.protected)assert.ok(!poolCandidates(matrix,original,registry).some(r=>r.id===p.id),p.id);
 const state=poolStatus(matrix,original,registry,{writer:"W1"});
 assert.equal(state.status,"CLAIM_REQUIRED");
 assert.equal(state.protected_drafts,14);
 assert.equal(state.available_now,26);
 assert.equal(state.blocked_by_parent,80);
});

test("a single W1 can write every remaining topic, including former W2/W3-owned topics",()=>{
 let ledger=structuredClone(original),claimed=[];
 const originalOwners=JSON.parse(fs.readFileSync("factory/external-writers/assignments.json","utf8"));
 const owners=new Map(originalOwners.entries.map(e=>[e.id,e.writer]));
 for(let n=0;n<13;n++){
  const a=transitionPool(matrix,ledger,registry,"claim",{...writer("W1"),count:2},options("c"+n));
  assert.equal(a.ids.length,2);claimed.push(...a.ids);ledger=a.ledger;
  const b=transitionPool(matrix,ledger,registry,"submit",{...writer("W1"),ids:a.ids.join(",")},options("s"+n));ledger=b.ledger;
 }
 assert.equal(new Set(claimed).size,26);
 assert.ok(claimed.some(id=>owners.get(id)==="W2"));
 assert.ok(claimed.some(id=>owners.get(id)==="W3"));
 assert.equal(poolCandidates(matrix,ledger,registry).length,0); // Hub parents still unpublished
 const afterHubs=structuredClone(matrix);
 for(const row of afterHubs.rows)if(row.role==="HUB")row.status="PUBLISHED";
 for(let n=0;n<40;n++){
  const a=transitionPool(afterHubs,ledger,registry,"claim",{...writer("W1"),count:2},options("more"+n));
  assert.equal(a.ids.length,2);claimed.push(...a.ids);ledger=a.ledger;
  const b=transitionPool(afterHubs,ledger,registry,"submit",{...writer("W1"),ids:a.ids.join(",")},options("done"+n));ledger=b.ledger;
 }
 assert.equal(claimed.length,106);
 assert.equal(new Set(claimed).size,106);
 assert.ok(claimed.every(id=>!registry.protected.some(p=>p.id===id)));
 assert.equal(poolCandidates(afterHubs,ledger,registry).length,0);
});

test("three concurrent Writer sessions receive disjoint pairs from one serialized ledger",()=>{
 let ledger=structuredClone(original);
 const all=[];
 for(const w of ["W1","W2","W3"]){
  const a=transitionPool(matrix,ledger,registry,"claim",{...writer(w),count:2},options(w));
  assert.equal(a.ids.length,2);all.push(...a.ids);ledger=a.ledger;
 }
 assert.equal(new Set(all).size,6);
 assert.equal(ledger.claims.filter(c=>c.status==="CLAIMED").length,6);
 assert.throws(()=>transitionPool(matrix,ledger,registry,"claim",{...writer("W1"),branch:"writer/w1-newbranch"},options("x")),/another branch/);
 // Second request by same active session always resumes existing IDs, not claims more.
 const again=transitionPool(matrix,ledger,registry,"claim",{...writer("W1"),count:2},options("again"));
 assert.deepEqual(again.ids,all.slice(0,2));
 assert.equal(again.revision,ledger.revision,"Retrying claim must not increment revision or consume more IDs");
});

test("submitted claims cannot be stolen and cannot be released for redistribution",()=>{
 const a=transitionPool(matrix,original,registry,"claim",{...writer("W2"),count:2},options("first"));
 const b=transitionPool(matrix,a.ledger,registry,"submit",{...writer("W2"),ids:a.ids.join(",")},options("submitted"));
 const c=transitionPool(matrix,b.ledger,registry,"claim",{...writer("W1"),count:2},options("second"));
 assert.ok(c.ids.every(id=>!a.ids.includes(id)));
 assert.throws(()=>transitionPool(matrix,b.ledger,registry,"release",{...writer("W2"),ids:a.ids[0],confirmed:true,reason:"Approved release after branch review"},options("no")),/Cannot release/);
});

test("claim release requires explicit review and never steals someone else's work",()=>{
 const a=transitionPool(matrix,original,registry,"claim",{...writer("W2"),count:1},options("first"));
 assert.throws(()=>transitionPool(matrix,a.ledger,registry,"release",{...writer("W1"),ids:a.ids[0],confirmed:true,reason:"Coordinator approved after review"},options("bad")),/Cannot release/);
 assert.throws(()=>transitionPool(matrix,a.ledger,registry,"release",{...writer("W2"),ids:a.ids[0]},options("bad2")),/confirmed/);
 const b=transitionPool(matrix,a.ledger,registry,"release",{...writer("W2"),ids:a.ids[0],confirmed:true,reason:"Confirmed branch contains no article"},options("good"));
 const c=transitionPool(matrix,b.ledger,registry,"claim",{...writer("W1"),count:2},options("another"));
 assert.ok(c.ids.includes(a.ids[0]));
});
test("rejects malformed writers/branches and unconfirmed authorship",()=>{
 assert.throws(()=>ensureIdentity("W4","w4-test","writer/w4-test"));
 assert.throws(()=>ensureIdentity("W1","w1-test","writer/w2-test"));
 assert.throws(()=>transitionPool(matrix,original,registry,"submit",{...writer("W1"),ids:"VI-H01"},options("bad")),/No matching active claim/);
});
