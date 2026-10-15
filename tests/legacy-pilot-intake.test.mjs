import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {PILOT_IDS,PILOT_SOURCE,PILOT_OWNERS,legacyPilotOriginal,normalizeLegacyPilot} from "../scripts/legacy-pilot-core.mjs";
import {adoptPilot} from "../scripts/legacy-pilot-intake.mjs";
import {validatePool} from "../scripts/writer-pool-core.mjs";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const matrix=read("data/seo/master-matrix.json");
const ledger=read("factory/external-writers/claims.json");
const registry=read("factory/external-writers/protected-drafts.json");
const hash=s=>createHash("sha256").update(s).digest("hex");
const SHA="a".repeat(40);
function fixture(id="EN-H01"){
 const owner=PILOT_OWNERS[id];
 const m=structuredClone(matrix),l=structuredClone(ledger),r=structuredClone(registry);
 m.rows.find(x=>x.id===id).status="IDEA";
 l.claims=l.claims.filter(x=>x.id!==id);
 r.protected=r.protected.filter(x=>x.id!==id);
 r.held_ids=r.held_ids.filter(x=>x.id!==id);
 r.held_ids.push({id,source_pr:5,publication_pr:6,branch:"editorial/pilot-hubs-en-de"});
 const packet={matrix_id:id,locale:id.slice(0,2).toLowerCase(),
  proposed_url:m.rows.find(x=>x.id===id).url,
  title:"Legacy pilot Hub original",
  meta_description:"A long description of the original editorial draft kept without publication approval.",
  body_markdown:"## Source\n"+("The original manuscript stays unchanged. ".repeat(28)),
  sources:[{url:"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",checked_on:"2026-10-15"}],
  facts_reviewed_by_human:true,serp_intent_checked:true};
 const raw=JSON.stringify(packet,null,2)+"\n";
 const pending={id,status:"SUBMITTED",writer:owner.writer,session:owner.session,
  branch:owner.branch,source_branch:PILOT_SOURCE,source_path:"content/articles/"+id+".json",
  legacy_pilot:{source_pr:6,source_ref:PILOT_SOURCE},source_sha256:hash(raw),source_commit:SHA};
 return {matrix:m,ledger:l,registry:r,packet,raw,sha:SHA,id,
  now:"2026-10-15T09:55:00.000Z",pending};
}
test("owner manifest names exactly the two PR6 pilot manuscripts, no PR17 sources",()=>{
 const policy=read("approvals/legacy-pilot-intake-20261015.json");
 assert.deepEqual(policy.ids,PILOT_IDS);
 assert.equal(policy.source_branch,PILOT_SOURCE);
 assert.equal(policy.source_pr,6);
 assert.deepEqual(policy.ownership,PILOT_OWNERS);
 assert.deepEqual(policy.metadata_normalization,{facts_reviewed_by_human:false,serp_intent_checked:false});
 for(const id of PILOT_IDS)assert.ok(!read("approvals/legacy-hub-intake-20261015.json").ids.includes(id));
});
test("original PR6 bytes remain cryptographically untouched, false review flags truthful",()=>{
 const x=fixture(),before=x.raw;
 assert.ok(legacyPilotOriginal(x.pending));
 const normalized=normalizeLegacyPilot(x.packet,x.pending);
 assert.notEqual(normalized,x.packet);
 assert.equal(normalized.facts_reviewed_by_human,false);
 assert.equal(normalized.serp_intent_checked,false);
 assert.equal(normalized.writer_session,PILOT_OWNERS[x.id].session);
 for(const k of ["matrix_id","locale","proposed_url","title","meta_description","body_markdown","sources"])
  assert.deepEqual(normalized[k],x.packet[k],k+" must not be rewritten");
 assert.equal(x.raw,before);
 assert.equal(hash(x.raw),x.pending.source_sha256);
 assert.equal(x.packet.facts_reviewed_by_human,true,"legacy flag is historical, not evidence");
 assert.throws(()=>normalizeLegacyPilot(x.packet,{...x.pending,source_branch:"writer/w2-live"}),/UNAUTHORIZED/);
 assert.throws(()=>normalizeLegacyPilot(x.packet,{...x.pending,source_path:"content/articles/OTHER.json"}),/UNAUTHORIZED/);
});
test("pilot adoption converts held entry to one immutable claim, without mutable source or URL",()=>{
 const x=fixture(),baseline=JSON.stringify({ledger:x.ledger,registry:x.registry});
 assert.deepEqual(validatePool(x.matrix,x.ledger,x.registry),[]);
 const a=adoptPilot(x),c=a.claim;
 assert.equal(c.id,x.id);
 assert.equal(c.status,"SUBMITTED");
 assert.equal(c.source_commit,SHA);
 assert.equal(c.source_sha256,hash(x.raw));
 assert.equal(c.source_path,"content/articles/EN-H01.json");
 assert.equal(c.source_branch,PILOT_SOURCE);
 assert.ok(legacyPilotOriginal(c));
 assert.equal(c.writer,"W2");
 assert.equal(c.session,"w2-live");
 assert.equal(a.ledger.revision,x.ledger.revision+1);
 assert.ok(!a.registry.held_ids.some(p=>p.id===x.id));
 assert.equal(JSON.stringify({ledger:x.ledger,registry:x.registry}),baseline);
 assert.deepEqual(validatePool(x.matrix,a.ledger,a.registry),[]);
 assert.throws(()=>adoptPilot({...x,ledger:a.ledger,registry:a.registry}),/UNAUTHORIZED_OR_DUPLICATE/);
});
test("invalid identity, published content, missing hold and mutated claims all refuse",()=>{
 const x=fixture("DE-H01");
 assert.equal(adoptPilot(x).claim.writer,"W3");
 assert.throws(()=>adoptPilot({...x,packet:{...x.packet,matrix_id:"EN-H01"}}),/UNAUTHORIZED/);
 assert.throws(()=>adoptPilot({...x,sha:"invalid"}),/UNAUTHORIZED/);
 assert.throws(()=>adoptPilot({...x,matrix:{...x.matrix,rows:x.matrix.rows.map(r=>r.id===x.id?{...r,status:"PUBLISHED"}:r)}}),/UNAUTHORIZED/);
 assert.throws(()=>adoptPilot({...x,registry:{...x.registry,held_ids:[]}}),/UNAUTHORIZED/);
 assert.throws(()=>adoptPilot({...x,registry:{...x.registry,protected:[...x.registry.protected,{id:x.id}]}}),/UNAUTHORIZED/);
});
