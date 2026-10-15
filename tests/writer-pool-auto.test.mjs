import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {autoAdvance} from "../scripts/writer-pool-auto-core.mjs";
import {newRequest,validateRequest,requestPath} from "../scripts/writer-request-core.mjs";
import {poolCandidates,validatePool,MAX_BATCH} from "../scripts/writer-pool-core.mjs";
import {PILOT_IDS,PILOT_OWNERS,PILOT_SOURCE,legacyPilotOriginal} from "../scripts/legacy-pilot-core.mjs";
import {checkArticle} from "../scripts/articles.mjs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
const empty={version:1,revision:0,claims:[]};
// Custody, not phase: after a publisher repair ticket the pilot claim points at its SHA-bound revision, while the
// original PR6 manuscript stays the first entry of its revision history and owner, session and branch never change.
const revisedPilot=c=>{const o=PILOT_OWNERS[c.id],first=c.revisions?.[0];
 return Boolean(o&&c.status==="SUBMITTED"&&c.legacy_pilot?.source_pr===6&&c.legacy_pilot.source_ref===PILOT_SOURCE&&
  c.writer===o.writer&&c.session===o.session&&c.branch===o.branch&&first?.source_path==="content/articles/"+c.id+".json"&&
  /^[0-9a-f]{64}$/.test(first.source_sha256||"")&&/^[0-9a-f]{40}$/.test(first.source_commit||""));};
const immutablePilot=c=>(legacyPilotOriginal(c)||revisedPilot(c))&&/^[0-9a-f]{64}$/.test(c.source_sha256||"")&&/^[0-9a-f]{40}$/.test(c.source_commit||"");
const validatePilotCustody=(ledger,registry,candidates)=>{
 for(const id of PILOT_IDS){
  const held=(registry.held_ids||[]).filter(p=>p.id===id);
  const imported=ledger.claims.filter(c=>c.id===id&&immutablePilot(c));
  assert.equal(held.length+imported.length,1,id+" must be either held or immutably adopted, never both");
  assert.ok(!candidates.some(r=>r.id===id),id+" cannot be claimed again");
 }
};
// 120 original topics is a floor for IDEA + PUBLISHED Hub/Supporting rows: promotion adds rows, publication moves IDEA to PUBLISHED.
const HELD=new Set([...registry.protected,...(registry.held_ids||[])].map(x=>x.id));
const IDEAS=matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&r.status==="IDEA");
const DRAFTABLE=IDEAS.filter(r=>!HELD.has(r.id)).length;
const SUPPORT_DRAFTABLE=IDEAS.filter(r=>r.role==="SUPPORT"&&!HELD.has(r.id)).length;
const opts={now:"2026-10-14T00:00:00.000Z",nonce:"auto-test"};
const req=w=>newRequest(w,w.toLowerCase()+"-mistral-test","writer/"+w.toLowerCase()+"-mistral-test");
const open=(l,w="W1")=>l.claims.filter(c=>c.status==="CLAIMED"&&c.writer===w);
test("activation request is a single exact branch/session, no secrets",()=>{
 const x=req("W1");
 assert.deepEqual(validateRequest(x,requestPath("W1",x.session),x.branch),x);
 assert.throws(()=>validateRequest({...x,branch:"writer/w2-wrong"},requestPath("W1",x.session),x.branch),/Writer|branch/);
 assert.throws(()=>validateRequest({...x,api_key:"secret"},requestPath("W1",x.session),x.branch),/Unexpected/);
 assert.throws(()=>validateRequest({...x,enabled:false},requestPath("W1",x.session),x.branch),/Invalid/);
});
test("W1 legacy drafts and both PR6 Hubs remain protected or immutably adopted",()=>{
 // The legacy Hub intake moves a PR #17 draft from the protected registry into the claims ledger as a SUBMITTED
 // claim locked to its source SHA-256 and commit; it never becomes claimable again, whatever its later phase.
 const ledger=JSON.parse(fs.readFileSync("factory/external-writers/claims.json","utf8"));
 const legacy=new Set(JSON.parse(fs.readFileSync("approvals/legacy-hub-intake-20261015.json","utf8")).ids);
 assert.equal(legacy.size,14);
 const adopted=ledger.claims.filter(c=>legacy.has(c.id)&&c.status==="SUBMITTED"&&/^[0-9a-f]{64}$/.test(c.source_sha256||"")&&/^[0-9a-f]{40}$/.test(c.source_commit||""));
 for(const id of legacy)assert.equal(registry.protected.some(p=>p.id===id)+adopted.filter(c=>c.id===id).length,1,id+" has exactly one safe custody state");
 validatePilotCustody(ledger,registry,poolCandidates(matrix,ledger,registry));
 assert.deepEqual(validatePool(matrix,empty,registry),[]);
 assert.deepEqual(validatePool(matrix,ledger,registry),[]);
 assert.ok(IDEAS.length+matrix.rows.filter(r=>["HUB","SUPPORT"].includes(r.role)&&r.status==="PUBLISHED").length>=120);
 assert.equal(poolCandidates(matrix,empty,registry).length,DRAFTABLE);
 const candidates=new Set(poolCandidates(matrix,ledger,registry).map(r=>r.id));
 for(const id of [...legacy,...PILOT_IDS,...registry.held_ids.map(x=>x.id)])
  assert.ok(!candidates.has(id),"Protected or adopted ID "+id);
});
test("first green push claims TEN, old CI replay is idempotent",()=>{
 const a=autoAdvance(matrix,empty,registry,req("W1"),opts);
 assert.equal(MAX_BATCH,10);
 assert.equal(a.status,"NEXT_BATCH_CLAIMED");
 assert.equal(a.claimed.length,10);
 const b=autoAdvance(matrix,a.ledger,registry,req("W1"),opts);
 assert.equal(b.status,"WAITING_FOR_DRAFTS");
 assert.equal(b.changed,false);
 assert.deepEqual(b.ledger,a.ledger);
});
test("partial green push submits only actual verified drafts and refills free slots",()=>{
 const a=autoAdvance(matrix,empty,registry,req("W1"),opts);
 const completed=a.claimed.slice(0,3);
 const b=autoAdvance(matrix,a.ledger,registry,req("W1"),{...opts,verifiedDraftIds:new Set(completed)});
 assert.equal(b.status,"SUBMITTED_AND_NEXT_BATCH");
 assert.deepEqual(b.submitted,completed);
 assert.equal(open(b.ledger).length,10);
 assert.equal(b.ledger.claims.filter(c=>c.status==="SUBMITTED").length,3);
 assert.ok(a.claimed.slice(3).every(id=>open(b.ledger).some(c=>c.id===id)));
 assert.ok(open(b.ledger).every(c=>!completed.includes(c.id)));
 const replay=autoAdvance(matrix,b.ledger,registry,req("W1"),opts);
 assert.equal(replay.changed,false);
 assert.equal(replay.status,"WAITING_FOR_DRAFTS");
});
test("one Writer can draft every remaining Matrix idea (104 at baseline) using turbo, without publishing",()=>{
 const matrixBefore=JSON.stringify(matrix);
 let ledger=autoAdvance(matrix,empty,registry,req("W1"),opts).ledger;
 const done=[];
 // Bound scales with the Matrix: the Topic Factory keeps adding IDEA rows.
 for(let i=0;i<Math.ceil(DRAFTABLE/10)+2;i++){
  const ids=open(ledger).map(c=>c.id);
  if(!ids.length)break;
  const a=autoAdvance(matrix,ledger,registry,req("W1"),{...opts,nonce:"cycle-"+i,verifiedDraftIds:new Set(ids)});
  done.push(...a.submitted);
  ledger=a.ledger;
 }
 assert.equal(done.length,DRAFTABLE);
 assert.equal(new Set(done).size,DRAFTABLE);
 assert.equal(open(ledger).length,0);
 assert.equal(ledger.claims.filter(c=>c.status==="SUBMITTED").length,DRAFTABLE);
 assert.equal(poolCandidates(matrix,ledger,registry).length,0);
 assert.equal(done.filter(id=>matrix.rows.find(r=>r.id===id).role==="SUPPORT").length,SUPPORT_DRAFTABLE);
 assert.equal(JSON.stringify(matrix),matrixBefore); // the Turbo loop never publishes or edits the Matrix
});
test("three Writers each claim up to ten unique article IDs, W1 continues without W2/W3",()=>{
 let ledger=empty,seen=new Set();
 for(const w of ["W1","W2","W3"]){
  const a=autoAdvance(matrix,ledger,registry,req(w),{...opts,nonce:w});
  assert.equal(a.claimed.length,10);
  for(const id of a.claimed){assert.ok(!seen.has(id));seen.add(id);}
  ledger=a.ledger;
 }
 assert.equal(seen.size,30);
 const a=autoAdvance(matrix,ledger,registry,req("W1"),{...opts,verifiedDraftIds:new Set(open(ledger,"W1").map(c=>c.id))});
 assert.equal(a.submitted.length,10);
 assert.equal(open(a.ledger,"W1").length,10);
 assert.ok(open(a.ledger,"W1").every(c=>!seen.has(c.id)));
});
test("source SHA+content hash are recorded on submitted drafts and cannot be malformed",()=>{
 const first=autoAdvance(matrix,empty,registry,req("W1"),opts);
 const id=first.claimed[0];
 const proof=new Map([[id,{source_sha256:"a".repeat(64),source_commit:"b".repeat(40)}]]);
 const next=autoAdvance(matrix,first.ledger,registry,req("W1"),{...opts,verifiedDraftIds:new Set([id]),verifiedDraftEvidence:proof});
 const entry=next.ledger.claims.find(c=>c.id===id);
 assert.equal(entry.source_sha256,"a".repeat(64));
 assert.equal(entry.source_commit,"b".repeat(40));
 assert.deepEqual(validatePool(matrix,next.ledger,registry),[]);
 const corrupted=structuredClone(next.ledger);
 corrupted.claims.find(c=>c.id===id).source_sha256="bad";
 assert.ok(validatePool(matrix,corrupted,registry).some(x=>x.includes("immutable submitted")));
});
test("Supporting drafts can pass prepublication parent test; publisher still refuses",()=>{
 // Every Hub may already be live; force one Supporting row and its parent Hub to IDEA on a copy (fixture only).
 const matrix=structuredClone(JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8")));
 const row=matrix.rows.find(x=>x.role==="SUPPORT"&&matrix.rows.find(p=>p.id===x.parent_id)?.role==="HUB");
 assert.ok(row);
 row.status="IDEA";matrix.rows.find(p=>p.id===row.parent_id).status="IDEA";
 const locales=JSON.parse(fs.readFileSync("content/locales.json","utf8"));
 const packet={matrix_id:row.id,locale:row.locale,proposed_url:row.url,
  title:"A comprehensive guide to staying safe while renting a motorbike in Hanoi",
  meta_description:"Practical tips for planning your motorbike rental, understanding the rental agreement and navigating Vietnamese traffic safely.",
  h1:"Guide for safe rental decisions in Hanoi",body_markdown:"## Preparation\nRead the terms carefully.\n## Safety\nCheck your vehicle.\n## Prices\nConfirm with rental provider.\n## Contract\nRead the complete agreement.",
  sources:[],serp_intent_checked:false,facts_reviewed_by_human:false};
 assert.ok(checkArticle(packet,matrix,locales).errors.some(x=>x.includes("Parent Hub/Pillar must be published")));
 assert.ok(!checkArticle(packet,matrix,locales,{allowUnpublishedParentForDraft:true}).errors.some(x=>x.includes("Parent Hub/Pillar must be published")));
});
