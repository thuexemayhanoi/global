import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {inboxChecks,submittedLock} from "../scripts/writer-lanes.mjs";
import {decideNext} from "../scripts/continuous-writer.mjs";

const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json");
const locales=read("content/locales.json"),registry=read("factory/external-writers/protected-drafts.json");
const HELD=new Set([...registry.protected,...(registry.held_ids||[])].map(x=>x.id));
const row=matrix.rows.find(r=>r.role==="HUB"&&r.status==="IDEA"&&r.locale==="en"&&!HELD.has(r.id));
const other=matrix.rows.find(r=>r.role==="SUPPORT"&&r.status==="IDEA"&&r.locale==="en"&&!HELD.has(r.id));
const sha=s=>createHash("sha256").update(s).digest("hex");
const prose=["## First assessment","Choosing a rental motorcycle starts with experience, route and legal eligibility.",
 "## Compare vehicle styles","Assess the specific machine and your comfort with the operating controls.",
 "## Rental contract","Ask for written terms that explain deposits, handover and breakage.",
 "## Safe handover","Confirm braking, lighting, tyres and the fit of your helmet.",
 ...Array(110).fill("Rider training, appropriate driving entitlement, safe road conditions and well maintained equipment should matter more than a low headline rental price.")].join("\n");
const packet=(r,extra={})=>({matrix_id:r.id,locale:r.locale,proposed_url:r.url,title:"Choosing a suitable Hanoi rental motorcycle safely "+r.id,
 meta_description:"Compare automatic and manual motorcycle rentals in Hanoi by experience, vehicle condition, legal eligibility and clear handover terms.",
 h1:"Choosing a rental motorcycle in Hanoi",body_markdown:prose,writer_session:"w1-lock",
 sources:[{url:"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",title:"WHO Road traffic injuries",checked_on:"2026-10-14"},{url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"UK Vietnam travel safety advice",checked_on:"2026-10-14"}],
 serp_intent_checked:false,facts_reviewed_by_human:false,editorial_notes:"Fixture.",...extra});
const file=(r,p=packet(r),path="factory/external-writers/inbox/W1/"+r.id+".json")=>{const raw=JSON.stringify(p,null,2)+"\n";return {id:r.id,writer:"W1",path,packet:p,raw};};
const claim=(r,status,extra={})=>({id:r.id,writer:"W1",session:"w1-lock",branch:"writer/w1-lock",claim_id:"lock-"+r.id,status,at:"2026-10-15T00:00:00.000Z",updated_at:"2026-10-15T00:00:00.000Z",...extra});
const C40="c".repeat(40);

test("a SUBMITTED draft is locked evidence: its page going live never turns the Writer branch red",()=>{
 const f=file(row),ledger={version:1,revision:3,claims:[claim(row,"SUBMITTED",{source_sha256:sha(f.raw),source_commit:C40})]};
 assert.deepEqual(submittedLock(f,ledger),{state:"LOCKED",sha256:sha(f.raw)});
 const live=structuredClone(matrix);live.rows.find(r=>r.id===row.id).status="PUBLISHED";
 const [c]=inboxChecks([f],live,board,locales,ledger,registry);
 assert.equal(c.passed,true,JSON.stringify(c.errors));
 assert.equal(c.locked,"IMMUTABLE_SUBMITTED");
 // Without the lock the same file fails exactly the way Writer QA used to fail after publication.
 const [old]=inboxChecks([{...f,raw:undefined}],live,board,locales,ledger,registry);
 assert.ok(old.errors.some(e=>/already reserved or published/.test(e)));
});

test("editing a SUBMITTED draft fails early with the immutable-evidence error",()=>{
 const f=file(row),ledger={version:1,revision:3,claims:[claim(row,"SUBMITTED",{source_sha256:sha(f.raw),source_commit:C40})]};
 const edited={...f,raw:f.raw.replace("safely","carefully")};
 assert.equal(submittedLock(edited,ledger).state,"CHANGED");
 const [c]=inboxChecks([edited],matrix,board,locales,ledger,registry);
 assert.equal(c.passed,false);
 assert.match(c.errors[0],/IMMUTABLE_SUBMITTED_DRAFT_CHANGED/);
});

test("revision history: original and recorded revisions stay locked, the next revision gets full QA",()=>{
 const orig=file(row),r2=file(row,packet(row,{title:"Choosing a rental motorcycle in Hanoi, revised "+row.id}),"factory/external-writers/inbox/W1/revisions/"+row.id+".r2.json");
 r2.revision=2;
 const ledger={version:1,revision:4,claims:[claim(row,"SUBMITTED",{source_sha256:sha(r2.raw),source_commit:C40,source_path:r2.path,revision:2,
  revisions:[{source_sha256:sha(orig.raw),source_commit:"d".repeat(40),review_verdict:"QA_FAIL",repair_gates:["G4_EDITORIAL"]}]})]};
 assert.equal(submittedLock(orig,ledger).state,"LOCKED");
 assert.equal(submittedLock(r2,ledger).state,"LOCKED");
 const r3=file(row,packet(row,{title:"Choosing a rental motorcycle in Hanoi, third version "+row.id}),"factory/external-writers/inbox/W1/revisions/"+row.id+".r3.json");r3.revision=3;
 assert.equal(submittedLock(r3,ledger),null,"an unrecorded revision is new work");
 const [ok]=inboxChecks([r3],matrix,board,locales,ledger,registry);
 assert.equal(ok.passed,true,JSON.stringify(ok.errors));
 const [skip]=inboxChecks([{...r3,revision:4,path:r3.path.replace(".r3.",".r4.")}],matrix,board,locales,ledger,registry);
 assert.ok(skip.errors.some(e=>/REVISION_NUMBER .* is r3/.test(e)));
 const [stranger]=inboxChecks([{...r3,packet:packet(row,{writer_session:"w1-other",title:"x "+row.id})}],matrix,board,locales,ledger,registry);
 assert.equal(stranger.passed,false);
});

test("before submission a failing draft is fixed in place; a revision file for it is refused with guidance",()=>{
 const ledger={version:1,revision:2,claims:[claim(other,"CLAIMED")]};
 const bad=file(other,packet(other,{body_markdown:"## One\nToo short."}));
 const [c]=inboxChecks([bad],matrix,board,locales,ledger,registry);
 assert.equal(c.passed,false,"an unsubmitted draft is never locked");
 assert.equal(c.locked,undefined);
 const [fixed]=inboxChecks([file(other)],matrix,board,locales,ledger,registry);
 assert.equal(fixed.passed,true,JSON.stringify(fixed.errors));
 const rev={...file(other,packet(other),"factory/external-writers/inbox/W1/revisions/"+other.id+".r2.json"),revision:2};
 const [r]=inboxChecks([rev],matrix,board,locales,ledger,registry);
 assert.ok(r.errors.some(e=>/REVISION_WITHOUT_SUBMITTED_DRAFT .*fixed in place/.test(e)));
});

test("a protected legacy draft whose page was published through the manual path is archived, not re-judged",()=>{
 const p=registry.protected[0],r=matrix.rows.find(x=>x.id===p.id);
 const live=structuredClone(matrix);live.rows.find(x=>x.id===p.id).status="PUBLISHED";
 const f={...file(r,packet(r,{writer_session:p.session})),writer:p.writer,path:"factory/external-writers/inbox/"+p.writer+"/"+p.id+".json"};
 const [c]=inboxChecks([f],live,board,locales,{version:1,revision:1,claims:[]},registry);
 assert.equal(c.passed,true);
 assert.equal(c.locked,"PUBLISHED_LEGACY_DRAFT");
});

test("the session advisor does not send a Writer to repair a draft that is already live",()=>{
 const f=file(row),ledger={version:1,revision:3,claims:[claim(row,"SUBMITTED",{source_sha256:sha(f.raw),source_commit:C40})]};
 const live=structuredClone(matrix);live.rows.find(r=>r.id===row.id).status="PUBLISHED";
 const d=decideNext(live,board,ledger,{files:[f],errors:[],revisions:[]},{writer:"W1",session:"w1-lock",branch:"writer/w1-lock",registry,locales});
 assert.notEqual(d.status,"REPAIR_DRAFT");
 const broken=decideNext(matrix,board,{version:1,revision:2,claims:[claim(other,"CLAIMED")]},
  {files:[file(other,packet(other,{body_markdown:"## One\nToo short."}))],errors:[],revisions:[]},{writer:"W1",session:"w1-lock",branch:"writer/w1-lock",registry,locales});
 assert.equal(broken.status,"REPAIR_DRAFT");
 assert.match(broken.next_action,/edited in place/);
});
