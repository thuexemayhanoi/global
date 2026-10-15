import test from "node:test";
import assert from "node:assert/strict";
import {repairQueue,repairTicket,ticketValid} from "../scripts/repair-queue-core.mjs";

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
test("sensitive PRICE/LEGAL topic requires human factual checks, never AI auto-pass",()=>{
 const t=repairTicket({...item,failed:["G3_TOPIC_CLASS","G3_NO_PRICES","G4_EDITORIAL"]},claim);
 assert.equal(t.state,"HUMAN_REVIEW_REQUIRED");
 assert.equal(ticketValid(t,claim),false);
 assert.equal(repairQueue({items:[{...item,failed:["G3_TOPIC_CLASS"]}]},{claims:[claim]}).length,0);
});
test("repair retry budget is bounded to r2/r3/r4 and then escalates",()=>{
 const once=repairTicket(item,{...claim,revisions:[{source_sha256:"c".repeat(64)}]});
 assert.equal(once.next_revision,3);
 const twice=repairTicket(item,{...claim,revisions:[{},{},{}]});
 assert.equal(twice.state,"ESCALATED_MAX_ATTEMPTS");
 assert.equal(ticketValid(twice,claim),false);
});
test("parent/stage waits are not treated as text rewrite failures",()=>{
 assert.equal(repairTicket({...item,failed:["G2_PARENT_PUBLISHED"]},claim).state,"WAIT_PARENT");
 assert.equal(repairTicket({...item,failed:["G7_STAGE_CAP"]},claim).state,"WAIT_STAGE");
 assert.equal(repairTicket({...item,failed:["G2_NOT_PROTECTED","G4_EDITORIAL"]},claim).state,"BLOCKED");
});
