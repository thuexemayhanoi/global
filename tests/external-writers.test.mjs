import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {validateBoard,pack,verifyPacket,checkDuplicates} from "../scripts/writer-lanes.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const board=JSON.parse(fs.readFileSync("factory/external-writers/assignments.json","utf8"));
const locales=JSON.parse(fs.readFileSync("content/locales.json","utf8"));
const W=["W1","W2","W3"];
test("all Matrix topics have exactly one immutable owner",()=>{
 assert.deepEqual(validateBoard(matrix,board),[]);
 assert.equal(board.entries.length,matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&(r.url.includes("/topics/")||r.url.includes("/guides/"))).length);
 assert.ok(Math.max(...W.map(w=>board.entries.filter(r=>r.writer===w).length))-Math.min(...W.map(w=>board.entries.filter(r=>r.writer===w).length))<=1);
 assert.equal(new Set(board.entries.map(r=>r.id)).size,board.entries.length);
 assert.equal(new Set(board.entries.map(r=>r.url)).size,board.entries.length);
});
test("each writer pack is disjoint, deterministic and bounded",()=>{
 for(const w of W){
  const a=pack(matrix,board,w,new Set(),5);
  const b=pack(matrix,board,w,new Set(),5);
  assert.deepEqual(a.map(x=>x.id),b.map(x=>x.id));
  assert.ok(a.length<=5);
  assert.ok(a.every(x=>board.entries.find(e=>e.id===x.id)?.writer===w));
  assert.ok(a.every(x=>matrix.rows.find(y=>y.id===x.parent_id)?.status==="PUBLISHED"));
  assert.throws(()=>pack(matrix,board,w,new Set(),6));
 }
 const taken=new Set(pack(matrix,board,"W1",new Set(),1).map(x=>x.id));
 assert.ok(pack(matrix,board,"W1",taken,1).every(x=>!taken.has(x.id)));
});
test("unpublished supporting content waits for published hub",()=>{
 for(const w of W)assert.ok(pack(matrix,board,w,new Set(),5).every(r=>matrix.rows.find(p=>p.id===r.parent_id)?.status==="PUBLISHED"));
 const boardBad=structuredClone(board);boardBad.entries[0].url="/broken/";
 assert.ok(validateBoard(matrix,boardBad).some(e=>e.includes("drift")));
});
const fixtureMatrix=structuredClone(matrix);
const firstHub=board.entries.find(e=>e.role==="HUB"&&e.locale==="en")||board.entries.find(e=>e.role==="HUB");
const row=fixtureMatrix.rows.find(r=>r.id===firstHub.id);row.status="IDEA";
const owner=firstHub.writer;
const prose=["## First assessment","Choosing a rental motorcycle starts with experience, route and legal eligibility.",
 "## Compare vehicle styles","Assess the specific machine and your comfort with the operating controls.",
 "## Rental contract","Ask for written terms that explain deposits, handover and breakage.",
 "## Safe handover","Confirm braking, lighting, tyres and the fit of your helmet.",
 ...Array(110).fill("Rider training, appropriate driving entitlement, safe road conditions and well maintained equipment should matter more than a low headline rental price.")
].join("\n");
const good={matrix_id:row.id,locale:row.locale,proposed_url:row.url,title:"Choosing a suitable Hanoi rental motorcycle safely",
 meta_description:"Compare automatic and manual motorcycle rentals in Hanoi by experience, vehicle condition, legal eligibility and clear handover terms.",
 h1:"Choosing a rental motorcycle in Hanoi",
 body_markdown:prose,
 sources:[{url:"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",title:"WHO Road traffic injuries",checked_on:"2026-10-14"},{url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"UK Vietnam travel safety advice",checked_on:"2026-10-14"}],
 serp_intent_checked:false,facts_reviewed_by_human:false,editorial_notes:"Fixture; requires owner review."
};
test("external writer can submit a substantial UNAPPROVED review draft",()=>{
 const check=verifyPacket(good,owner,fixtureMatrix,board,locales);
 assert.equal(check.passed,true,JSON.stringify(check.errors));
 assert.ok(check.words>=1000&&check.words<=5000);
});
test("cannot masquerade as human reviewer or another writer",()=>{
 const other=W.find(w=>w!==owner);
 assert.equal(verifyPacket(good,other,fixtureMatrix,board,locales).passed,false);
 assert.equal(verifyPacket({...good,facts_reviewed_by_human:true},owner,fixtureMatrix,board,locales).passed,false);
 assert.equal(verifyPacket({...good,serp_intent_checked:true},owner,fixtureMatrix,board,locales).passed,false);
});
test("blocks too-short draft, unassigned or published ID",()=>{
 assert.equal(verifyPacket({...good,body_markdown:"## One\nshort"},owner,matrix,board,locales).passed,false);
 const m=structuredClone(fixtureMatrix);m.rows.find(x=>x.id===row.id).status="PUBLISHED";
 assert.equal(verifyPacket(good,owner,m,board,locales).passed,false);
});
test("detects duplicate prose across writer lanes, even when IDs differ",()=>{
 const list=[{path:"a",packet:good},{path:"b",packet:{...good,matrix_id:"DE-H01",locale:"de",title:"A different heading"}}];
 assert.ok(checkDuplicates(list).some(x=>x.includes("Duplicated body")));
});
