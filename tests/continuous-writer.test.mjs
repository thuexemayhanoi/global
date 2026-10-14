import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {decideNext} from "../scripts/continuous-writer.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const board=JSON.parse(fs.readFileSync("factory/external-writers/assignments.json","utf8"));
const ledger={version:1,revision:0,claims:[]};
const empty={files:[],errors:[]};
test("three writers have disjoint deterministic next pairs",()=>{
 const picks=["W1","W2","W3"].map(writer=>decideNext(matrix,board,ledger,empty,{writer,session:"test-session"}));
 assert.ok(picks.every(p=>p.status==="WRITE_NEXT_PAIR"&&p.batch_size===2&&p.auto_publish===false));
 assert.equal(new Set(picks.flatMap(p=>p.items.map(x=>x.id))).size,6);
 assert.ok(picks.flatMap(p=>p.items).every(i=>i.role==="HUB"));
 assert.equal(picks.reduce((n,p)=>n+p.assigned,0),120);
});
test("after drafts land, next excludes their ids",()=>{
 const a=decideNext(matrix,board,ledger,empty,{writer:"W1"});
 const fakeInbox={files:a.items.slice(0,1).map(i=>({id:i.id,writer:"W1",path:i.output,packet:{matrix_id:i.id}})),errors:[]};
 // Existing invalid draft is a hard QA blocker, never silently skipped.
 const b=decideNext(matrix,board,ledger,fakeInbox,{writer:"W1"});
 assert.equal(b.status,"REPAIR_DRAFT");
 assert.equal(b.batch_size,undefined);
});
test("same-session claims are eligible, foreign claims are withheld",()=>{
 const a=decideNext(matrix,board,ledger,empty,{writer:"W1",session:"writer-session"});
 const id=a.items[0].id;
 const state={version:1,revision:1,claims:[{id,writer:"W1",session:"different-session",status:"CLAIMED"}]};
 const b=decideNext(matrix,board,state,empty,{writer:"W1",session:"writer-session"});
 assert.equal(b.items.some(item=>item.id===id),false);
 const c=decideNext(matrix,board,state,empty,{writer:"W1",session:"different-session"});
 assert.equal(c.items.some(item=>item.id===id),true);
});
test("never drafts supporting pages while hub parents remain unpublished",()=>{
 const draftOnly=structuredClone(matrix);
 for(const row of draftOnly.rows)if(row.role==="HUB")row.status="DRAFT";
 const out=decideNext(draftOnly,board,ledger,empty,{writer:"W2"});
 assert.equal(out.status,"WAIT_PARENT_PUBLICATION");
 assert.equal(out.batch_size,0);
 assert.ok(out.blocked_by_parent>0);
});
test("fails closed on invalid writer and batch count",()=>{
 assert.throws(()=>decideNext(matrix,board,ledger,empty,{writer:"W4"}));
 assert.throws(()=>decideNext(matrix,board,ledger,empty,{writer:"W1",count:10}));
});
