import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {adoptLegacyHub} from "../scripts/legacy-hub-intake.mjs";
import {validatePool} from "../scripts/writer-pool-core.mjs";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const baseline=read("data/seo/master-matrix.json");
const originalLedger=read("factory/external-writers/claims.json");
const originalRegistry=read("factory/external-writers/protected-drafts.json");
const id="VI-H01",sha="a".repeat(40),now="2026-10-15T09:35:00.000Z";
function fixture(){
 const matrix=structuredClone(baseline);
 matrix.rows.find(r=>r.id===id).status="IDEA";
 const registry=structuredClone(originalRegistry);
 registry.protected=registry.protected.filter(p=>p.id!==id);
 registry.held_ids=(registry.held_ids||[]).filter(p=>p.id!==id);
 const entry={id,writer:"W1",session:"w1-vibe-20261014",
  branch:"writer/w1-vibe-20261014",source_pr:17,reason:"Fixture original manuscript"};
 registry.protected.push(entry);
 const ledger=structuredClone(originalLedger);
 ledger.claims=ledger.claims.filter(c=>c.id!==id);
 const packet={matrix_id:id,proposed_url:matrix.rows.find(r=>r.id===id).url,
  writer_session:entry.session,locale:"vi",body_markdown:"## Nội dung gốc\n"+("Nguồn gốc vẫn được giữ nguyên. ".repeat(30))};
 const raw=JSON.stringify(packet,null,2)+"\n";
 return {matrix,registry,ledger,entry,packet,raw,sha,now};
}
test("approved manifest enumerates exact 14 protected PR17 Hub IDs; excludes editorial held pilots",()=>{
 const manifest=read("approvals/legacy-hub-intake-20261015.json");
 assert.equal(manifest.ids.length,14);
 assert.equal(new Set(manifest.ids).size,14);
 assert.equal(manifest.source_pr,17);
 const registry=originalRegistry;
 for(const id of manifest.ids){
  assert.ok(registry.protected.some(p=>p.id===id&&p.source_pr===17)||
    originalLedger.claims.some(c=>c.id===id),
    id+" must be protected or already imported");
 }
 for(const p of registry.held_ids||[])assert.ok(!manifest.ids.includes(p.id));
});
test("import keeps immutable manuscript SHA, source branch and no overlap",()=>{
 const f=fixture(),beforeLedger=JSON.stringify(f.ledger),beforeProtected=JSON.stringify(f.registry);
 assert.deepEqual(validatePool(f.matrix,f.ledger,f.registry),[]);
 const result=adoptLegacyHub(f),c=result.ledger.claims.find(x=>x.id===id);
 assert.ok(c);
 assert.equal(c.status,"SUBMITTED");
 assert.equal(c.source_commit,sha);
 assert.equal(c.source_sha256,createHash("sha256").update(f.raw).digest("hex"));
 assert.equal(c.branch,f.entry.branch);
 assert.equal(c.session,f.entry.session);
 assert.equal(c.phase,"LEGACY_IMMUTABLE_QA_INTAKE");
 assert.equal(result.ledger.revision,f.ledger.revision+1);
 assert.ok(!result.registry.protected.some(p=>p.id===id));
 assert.equal(JSON.stringify(f.ledger),beforeLedger);
 assert.equal(JSON.stringify(f.registry),beforeProtected);
 assert.deepEqual(validatePool(f.matrix,result.ledger,result.registry),[]);
 assert.throws(()=>adoptLegacyHub({...f,ledger:result.ledger,registry:result.registry}),/Existing claim ID/);
});
test("fail closed for changed ID, old page or missing source protection",()=>{
 const f=fixture();
 assert.throws(()=>adoptLegacyHub({...f,packet:{...f.packet,matrix_id:"EN-H03"}}),/Mismatch/);
 assert.throws(()=>adoptLegacyHub({...f,matrix:{...f.matrix,rows:f.matrix.rows.map(r=>r.id===id?{...r,status:"PUBLISHED"}:r)}}),/unpublished IDEA/);
 assert.throws(()=>adoptLegacyHub({...f,registry:{...f.registry,protected:[]}}),/No matching protected/);
 assert.throws(()=>adoptLegacyHub({...f,sha:"bad"}),/Invalid exact source commit/);
 assert.throws(()=>adoptLegacyHub({...f,registry:{...f.registry,held_ids:[...(f.registry.held_ids||[]),{id}]}}),/Editorial hold/);
});
