import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {repairQueue,repairTicket,ticketValid} from "../scripts/repair-queue-core.mjs";
import {takeRepairTickets,applyRevisions,autoAdvance} from "../scripts/writer-pool-auto-core.mjs";
import {validatePool} from "../scripts/writer-pool-core.mjs";
import {submittedLock} from "../scripts/writer-lanes.mjs";
import {createHash} from "node:crypto";

const sha="a".repeat(64),commit="b".repeat(40);
const claim={id:"EN-H01",writer:"W2",session:"w2-live",branch:"writer/w2-live",status:"SUBMITTED",source_sha256:sha,source_commit:commit};
const item={id:"EN-H01",writer:"W2",session:"w2-live",branch:"writer/w2-live",source_sha256:sha,source_commit:commit,
  decision:"REJECTED",failed:["G4_EDITORIAL","G1_DEPTH"],details:["G4_EDITORIAL: Need genuine H2 structure","G1_DEPTH: Need >= 900 researched words"]};
test("real publisher QA failures become targeted repair tickets owned by the same Writer",()=>{
 const t=repairTicket(item,claim);
 assert.equal(t.state,"REPAIR");
 assert.equal(t.next_revision,2);
 assert.equal(t.revision_path,"factory/external-writers/inbox/W2/revisions/EN-H01.r2.json");
 assert.deepEqual(t.fixable,["G4_EDITORIAL","G1_DEPTH"]);
 assert.ok(ticketValid(t,claim));
 const q=repairQueue({version:2,items:[item]},{claims:[claim]},{writer:"W2",session:"w2-live"});
 assert.equal(q.length,1);
 assert.equal(repairQueue({items:[item]},{claims:[claim]},{writer:"W1"}).length,0);
});
test("stale SHA, stolen writer identity, and ineligible packets never produce repair authority",()=>{
 assert.equal(repairTicket({...item,source_sha256:"c".repeat(64)},claim),null);
 assert.equal(repairTicket({...item,session:"other"},claim),null);
 assert.equal(repairTicket(item,{...claim,status:"CLAIMED"}),null);
 assert.equal(repairTicket(item,{...claim,source_sha256:"no"}),null);
});
test("missing legal and money source evidence is handled by same-session Writer repair, without Human Review",()=>{
 const t=repairTicket({...item,failed:["G3_SENSITIVE_SOURCES","G3_PRICE_EVIDENCE","G4_EDITORIAL"]},claim);
 assert.equal(t.state,"REPAIR");
 assert.ok(ticketValid(t,claim));
 assert.equal(t.fixable.length,3);
 assert.equal(repairQueue({items:[{...item,failed:["G3_PRICE_EVIDENCE"]}]},{claims:[claim]}).length,1);
});
test("repair retry budget is bounded to r2/r3/r4 and then escalates",()=>{
 const once=repairTicket(item,{...claim,revisions:[{source_sha256:"c".repeat(64)}]});
 assert.equal(once.next_revision,3);
 const twice=repairTicket(item,{...claim,revisions:[{},{},{}]});
 assert.equal(twice.state,"ESCALATED_MAX_ATTEMPTS");
 assert.equal(ticketValid(twice,claim),false);
});
test("tickets carry everything an AI Writer needs: ID, writer, session, source SHA and commit, gates and instructions",()=>{
 const t=repairTicket(item,claim);
 for(const k of ["id","writer","session","branch","source_sha256","source_commit","failed","fixable","details","instructions","revision_path","current_source_path"])assert.ok(t[k]!==undefined&&t[k]!==null,k);
 assert.equal(t.source_commit,commit);
 assert.equal(t.instructions.length,t.fixable.length);
});
test("the repair CLI never hands out another Writer's ticket and guides unsubmitted fixes in place",async()=>{
 const {spawnSync}=await import("node:child_process");
 const run=(...a)=>spawnSync(process.execPath,["scripts/writer-repair.mjs",...a],{encoding:"utf8"});
 const anon=run("next");
 assert.notEqual(anon.status,0);
 assert.match(anon.stderr,/needs your own --writer/);
 assert.match(run("check","--writer","W1","--session","w1-x").stderr,/check needs --file/);
 assert.match(run("check","--writer","W1","--session","w1-x","--file","factory/external-writers/inbox/W1/revisions/EN-H01.r5.json").stderr,/N = 2\.\.4/);
 const own=run("queue");
 assert.equal(own.status,0,own.stderr);
 assert.equal(JSON.parse(own.stdout).auto_model_calls,0);
});
test("every workflow that runs repair code also runs the repair tests",()=>{
 for(const f of [".github/workflows/qa.yml",".github/workflows/writer-qa.yml",".github/workflows/writer-pool-auto.yml",".github/workflows/auto-publisher.yml"])
  assert.match(fs.readFileSync(f,"utf8"),/tests\/repair-queue\.test\.mjs/,f);
 const wq=fs.readFileSync(".github/workflows/writer-qa.yml","utf8");
 for(const p of ["scripts/repair-queue-core.mjs","scripts/writer-repair.mjs","tests/repair-queue.test.mjs"])assert.ok(wq.includes("'"+p+"'"),"writer-qa.yml PR paths include "+p);
});
test("parent/stage waits are not treated as text rewrite failures",()=>{
 assert.equal(repairTicket({...item,failed:["G2_PARENT_PUBLISHED"]},claim).state,"WAIT_PARENT");
 assert.equal(repairTicket({...item,failed:["G7_STAGE_CAP"]},claim).state,"WAIT_STAGE");
 assert.equal(repairTicket({...item,failed:["G2_NOT_PROTECTED","G4_EDITORIAL"]},claim).state,"BLOCKED");
});

test("opt-in W1 receives W3 failed Hub atomically while source stays locked",()=>{
 const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
 // This is an isolated synthetic REPAIR fixture; production may publish this
 // Hub between runs, so do not derive ticket eligibility from live status.
 matrix.rows.find(row=>row.id==="FR-H03").status="IDEA";
 const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
 const id="FR-H03",raw='{"immutable":"original"}\\n';
 const base={id,writer:"W3",session:"w3-live",branch:"writer/w3-live",status:"SUBMITTED",
  source_sha256:createHash("sha256").update(raw).digest("hex"),source_commit:commit,
  claim_id:"handoff-test",at:"2026-10-15T00:00:00Z",updated_at:"2026-10-15T00:00:00Z"};
 const ledger={version:1,revision:8,claims:[base]};
 const qa={version:2,ledger_revision:8,items:[{id,writer:"W3",session:"w3-live",branch:"writer/w3-live",
  source_sha256:base.source_sha256,failed:["G3_OFFICIAL_EVIDENCE"],decision:"REJECTED"}]};
 const who={writer:"W1",session:"w1-current",branch:"writer/w1-current"};
 const out=takeRepairTickets(matrix,ledger,registry,qa,who,{max:2,now:"2026-10-15T09:00:00Z"});
 assert.equal(out.changed,true);assert.deepEqual(out.transferred,[id]);
 assert.equal(ledger.claims[0].writer,"W3","caller cannot mutate old ledger");
 const c=out.ledger.claims[0];
 assert.equal(c.writer,"W1");assert.equal(c.session,who.session);
 assert.equal(c.source_branch,"writer/w3-live");
 assert.equal(c.source_path,"factory/external-writers/inbox/W3/FR-H03.json");
 assert.equal(c.source_sha256,base.source_sha256);
 assert.equal(c.handoffs[0].writer,"W3");
 assert.deepEqual(validatePool(matrix,out.ledger,registry),[]);
 const old={id,writer:"W3",path:c.source_path,raw};
 assert.equal(submittedLock(old,out.ledger).state,"LOCKED");
 assert.equal(submittedLock({...old,raw:raw+"edited"},out.ledger).state,"CHANGED");
 assert.equal(repairQueue(qa,out.ledger,{writer:"W3"}).length,0,"stale old ticket invalid");
 const current={...qa.items[0],writer:"W1",session:"w1-current",branch:"writer/w1-current"};
 const ticket=repairTicket(current,c);
 assert.equal(ticket.state,"REPAIR");
 assert.equal(ticket.revision_path,"factory/external-writers/inbox/W1/revisions/FR-H03.r2.json");
 const revision={id,revision:2,source_path:ticket.revision_path,source_sha256:"c".repeat(64),
  source_commit:"d".repeat(40),review_verdict:"QA_FAIL",repair_basis_sha256:c.source_sha256,
  repair_gates:["G3_OFFICIAL_EVIDENCE"]};
 const accepted=applyRevisions(matrix,out.ledger,registry,who,[revision],{now:"2026-10-15T09:01:00Z"});
 assert.equal(accepted.ledger.claims[0].source_branch,"writer/w1-current");
 assert.equal(accepted.ledger.claims[0].writer,"W1");
 assert.equal(accepted.ledger.claims[0].revisions[0].source_sha256,base.source_sha256);
 assert.equal(submittedLock(old,accepted.ledger).state,"LOCKED");
 assert.deepEqual(validatePool(matrix,accepted.ledger,registry),[]);
});
test("handoff refuses stale report, same Writer, original owner overwrite, and unsafe replay",()=>{
 const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
 // This is an isolated synthetic REPAIR fixture; production may publish this
 // Hub between runs, so do not derive ticket eligibility from live status.
 matrix.rows.find(row=>row.id==="FR-H03").status="IDEA";
 const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
 const c={id:"FR-H03",writer:"W3",session:"w3-live",branch:"writer/w3-live",status:"SUBMITTED",
  source_sha256:sha,source_commit:commit,claim_id:"handoff-test",at:"2026-10-15T00:00:00Z",updated_at:"2026-10-15T00:00:00Z"};
 const ledger={version:1,revision:11,claims:[c]};
 const report={version:2,ledger_revision:10,items:[{...item,id:c.id,writer:c.writer,session:c.session,branch:c.branch,source_sha256:sha}]};
 const who={writer:"W1",session:"w1-current",branch:"writer/w1-current"};
 assert.equal(takeRepairTickets(matrix,ledger,registry,report,who).reason,"REPAIR_REPORT_STALE");
 const current={...report,ledger_revision:11};
 assert.deepEqual(takeRepairTickets(matrix,ledger,registry,current,{writer:"W3",session:"w3-live",branch:"writer/w3-live"}).transferred,[]);
 const first=takeRepairTickets(matrix,ledger,registry,current,who);
 assert.equal(first.transferred.length,1);
 assert.equal(takeRepairTickets(matrix,first.ledger,registry,current,who).reason,"REPAIR_REPORT_STALE");
 assert.equal(first.ledger.claims.filter(x=>x.status==="SUBMITTED").length,1);
});

test("repair takeover goes before new-topic refill and cannot ping-pong",()=>{
 const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
 matrix.rows.find(row=>row.id==="FR-H03").status="IDEA";
 const registry=JSON.parse(fs.readFileSync("factory/external-writers/protected-drafts.json","utf8"));
 const c={id:"FR-H03",writer:"W3",session:"w3-live",branch:"writer/w3-live",status:"SUBMITTED",
  source_sha256:sha,source_commit:commit,claim_id:"repair-sequence",
  at:"2026-10-15T00:00:00Z",updated_at:"2026-10-15T00:00:00Z"};
 const ledger={version:1,revision:21,claims:[c]};
 const report={version:2,ledger_revision:21,items:[{...item,id:c.id,writer:c.writer,session:c.session,branch:c.branch,source_sha256:c.source_sha256}]};
 const receiving={writer:"W2",session:"w2-live",branch:"writer/w2-live"};
 const intake=takeRepairTickets(matrix,ledger,registry,report,receiving);
 assert.deepEqual(intake.transferred,[c.id],"the report is fresh before any new claims mutate the ledger");
 const after=autoAdvance(matrix,intake.ledger,registry,receiving,{
  now:"2026-10-15T09:50:00Z",refill:!intake.changed});
 assert.equal(after.ledger.claims.filter(x=>x.status==="CLAIMED"&&x.writer==="W2").length,0,
  "Writer must repair transferred source before taking ten additional draft topics");
 const assigned=intake.ledger.claims[0],updated={...report,ledger_revision:intake.ledger.revision,
  items:[{...report.items[0],writer:"W2",session:"w2-live",branch:"writer/w2-live"}]};
 const bounce=takeRepairTickets(matrix,intake.ledger,registry,updated,
  {writer:"W1",session:"w1-live",branch:"writer/w1-live"});
 assert.deepEqual(bounce.transferred,[],"a newly transferred ticket must not be stolen again");
 assert.equal(assigned.writer,"W2");
 assert.equal(assigned.handoffs.length,1);
});
