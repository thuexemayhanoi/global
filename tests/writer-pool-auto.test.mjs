import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {autoAdvance} from "../scripts/writer-pool-auto-core.mjs";
import {newRequest,validateRequest,requestPath} from "../scripts/writer-request-core.mjs";
import {poolCandidates,validatePool} from "../scripts/writer-pool-core.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
const empty={version:1,revision:0,claims:[]};
const opts={now:"2026-10-14T00:00:00.000Z",nonce:"auto-test"};
const req=w=>newRequest(w,w.toLowerCase()+"-mistral-test","writer/"+w.toLowerCase()+"-mistral-test");
test("start request is one file in exact Writer lane/session and has no secrets",()=>{
 const x=req("W1");
 assert.deepEqual(validateRequest(x,requestPath("W1",x.session),x.branch),x);
 assert.throws(()=>validateRequest({...x,branch:"writer/w2-wrong"},requestPath("W1",x.session),x.branch),/Writer|branch/);
 assert.throws(()=>validateRequest({...x,api_key:"secret"},requestPath("W1",x.session),x.branch),/Unexpected/);
 assert.throws(()=>validateRequest({...x,enabled:false},requestPath("W1",x.session),x.branch),/Invalid/);
 assert.throws(()=>validateRequest(x,"factory/external-writers/requests/W2/"+x.session+".json",x.branch),/filename/);
});
test("protect all 14 W1 and two EN-DE previously researched Hub drafts",()=>{
 assert.equal(registry.protected.length,14);
 assert.equal(registry.held_ids.length,2);
 assert.deepEqual(validatePool(matrix,empty,registry),[]);
 assert.equal(poolCandidates(matrix,empty,registry).length,104);
 const ids=poolCandidates(matrix,empty,registry).map(x=>x.id);
 for(const id of [...registry.protected,...registry.held_ids].map(x=>x.id))
  assert.ok(!ids.includes(id),id);
});
test("first green request automatically claims two; same green replay never double-allocates",()=>{
 const request=req("W1"),a=autoAdvance(matrix,empty,registry,request,opts);
 assert.equal(a.status,"NEXT_PAIR_CLAIMED");
 assert.equal(a.claimed.length,2);
 assert.equal(a.submitted.length,0);
 assert.equal(a.ledger.claims.filter(x=>x.status==="CLAIMED").length,2);
 const b=autoAdvance(matrix,a.ledger,registry,request,opts);
 assert.equal(b.status,"WAITING_FOR_COMPLETE_PAIR");
 assert.equal(b.changed,false);
 assert.deepEqual(b.claimed,a.claimed);
 const partial=autoAdvance(matrix,a.ledger,registry,request,{...opts,verifiedDraftIds:new Set([a.claimed[0]])});
 assert.equal(partial.status,"WAITING_FOR_COMPLETE_PAIR");
 assert.deepEqual(partial.missing_ids,[a.claimed[1]]);
 assert.deepEqual(a.ledger,b.ledger);
});
test("green two-draft push AUTO-SUBMITS original IDs and AUTO-CLAIMS next pair",()=>{
 const request=req("W1"),a=autoAdvance(matrix,empty,registry,request,opts);
 const b=autoAdvance(matrix,a.ledger,registry,request,{...opts,verifiedDraftIds:new Set(a.claimed)});
 assert.equal(b.status,"SUBMITTED_AND_NEXT_PAIR");
 assert.deepEqual(b.submitted,a.claimed);
 assert.equal(b.claimed.length,2);
 assert.ok(b.claimed.every(id=>!a.claimed.includes(id)));
 assert.equal(b.ledger.claims.filter(c=>c.status==="SUBMITTED").length,2);
 assert.equal(b.ledger.claims.filter(c=>c.status==="CLAIMED").length,2);
});
test("ONE Writer auto-drafts all 104 remaining Hub and Supporting topics without publishing parents",()=>{
 let ledger=empty,request=req("W1"),submitted=[];
 for(let i=0;i<52;i++){
  const state=autoAdvance(matrix,ledger,registry,request,{...opts,nonce:"auto-"+i,
    verifiedDraftIds:i===0?new Set():new Set(ledger.claims.filter(c=>c.status==="CLAIMED").map(c=>c.id))});
  if(i===0){
   assert.equal(state.status,"NEXT_PAIR_CLAIMED");
  }else{
   assert.equal(state.status,"SUBMITTED_AND_NEXT_PAIR");
   submitted.push(...state.submitted);
  }
  ledger=state.ledger;
 }
 const last=autoAdvance(matrix,ledger,registry,request,{...opts,nonce:"end",
  verifiedDraftIds:new Set(ledger.claims.filter(c=>c.status==="CLAIMED").map(c=>c.id))});
 submitted.push(...last.submitted);
 assert.equal(last.status,"BATCH_SUBMITTED_AWAIT_EDITORIAL_REVIEW");
 assert.equal(submitted.length,104);
 assert.equal(new Set(submitted).size,104);
 assert.equal(last.ledger.claims.filter(c=>c.status==="CLAIMED").length,0);
 assert.equal(last.ledger.claims.filter(c=>c.status==="SUBMITTED").length,104);
 const support=submitted.filter(id=>matrix.rows.find(r=>r.id===id).role==="SUPPORT");
 assert.equal(support.length,80);
 assert.equal(matrix.rows.filter(r=>r.role==="HUB"&&r.status==="PUBLISHED").length,0);
});
test("three Writers receive unique batches; no one steals protected, claimed or submitted topics",()=>{
 let ledger=empty,first=[];
 for(const writer of ["W1","W2","W3"]){
  const state=autoAdvance(matrix,ledger,registry,req(writer),{...opts,nonce:writer});
  assert.equal(state.status,"NEXT_PAIR_CLAIMED");first.push(...state.claimed);ledger=state.ledger;
 }
 assert.equal(new Set(first).size,6);
 const next=autoAdvance(matrix,ledger,registry,req("W1"),{...opts,verifiedDraftIds:new Set(first.slice(0,2))});
 assert.ok(next.submitted.every(x=>first.slice(0,2).includes(x)));
 assert.ok(next.claimed.every(x=>!first.includes(x)));
 assert.equal(new Set(ledger.claims.filter(c=>c.status==="CLAIMED").map(c=>c.id)).size,6);
});
