import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {transition,validateLedger} from "../scripts/seo/writer-claims.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const board=JSON.parse(fs.readFileSync("factory/external-writers/assignments.json","utf8"));
const published=matrix.rows.find(r=>r.status==="PUBLISHED"&&r.role==="PILLAR");
const row=board.entries.map(x=>matrix.rows.find(r=>r.id===x.id)).find(r=>r.role==="HUB"&&matrix.rows.find(p=>p.id===r.parent_id)?.status==="PUBLISHED");
const writer=board.entries.find(e=>e.id===row.id).writer;
const initial={version:1,revision:0,claims:[]};
test("manual claim is bounded, exclusive and resumable",()=>{
 const a=transition(initial,matrix,board,"claim",{writer,id:row.id,session:"session-A",now:"2026-10-14T00:00:00Z"});
 assert.equal(a.revision,1);assert.equal(a.claims[0].status,"CLAIMED");assert.deepEqual(validateLedger(a,board),[]);
 assert.throws(()=>transition(a,matrix,board,"claim",{writer,id:row.id,session:"session-B"}),/Already claimed/);
 assert.throws(()=>transition(a,matrix,board,"release",{writer,id:row.id,session:"wrong"}),/No matching/);
 const b=transition(a,matrix,board,"heartbeat",{writer,id:row.id,session:"session-A"});
 assert.equal(b.claims[0].status,"CLAIMED");
 const c=transition(b,matrix,board,"submit",{writer,id:row.id,session:"session-A"});
 assert.equal(c.claims[0].status,"SUBMITTED");assert.equal(c.revision,3);
 assert.throws(()=>transition(c,matrix,board,"claim",{writer,id:row.id,session:"session-new"}),/Submitted draft/);
});
test("writer cannot claim foreign assigned topic or unpublished parent",()=>{
 const other=["W1","W2","W3"].find(w=>w!==writer);
 assert.throws(()=>transition(initial,matrix,board,"claim",{writer:other,id:row.id,session:"session-A"}),/not the permanent owner/);
 const child=board.entries.map(x=>matrix.rows.find(r=>r.id===x.id)).find(r=>r.role==="SUPPORT"&&matrix.rows.find(p=>p.id===r.parent_id)?.status!=="PUBLISHED");
 const owner=board.entries.find(e=>e.id===child.id).writer;
 assert.throws(()=>transition(initial,matrix,board,"claim",{writer:owner,id:child.id,session:"session-A"}),/parent not published/);
});
