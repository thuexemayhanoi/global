import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {validateResearchBatch,RESEARCH_PURPOSE} from "../scripts/topic-factory-core.mjs";
import * as core from "../scripts/topic-research-core.mjs";
import {policy,matrix,map,frozen,enTopic,enTopics,EN_COUNT,batchOf,root} from "./topic-research-fixtures.mjs";

const {sessionIds,idsFromBranch,batchFile,parseBatchFile,managedBatchOwner,checkpointOwner,isAllowedPath,assertAllowedPaths,pushArgs,normalizeDraft,
 evaluateDraft,decideBatch,passingBatch,quarantineEntries,newCheckpoint,applyBatch,applyUpdate,rebuildCheckpoint,validateCheckpoint,verifyCheckpointContent,
 planResume,planningHints,localeCapacity,topicSummary,canonical,sha256,topicKey,resolveTaIds}=core;

const ids=sessionIds({agent:"claude",session:"20261015"});
const NOW="2026-10-15T10:00:00.000Z",TODAY="2026-10-15";
const M="a".repeat(40),P1="b".repeat(40),P2="c".repeat(40);
const CONTRACT={agents_md_sha256:"1".repeat(64),topic_factory_md_sha256:"2".repeat(64)};
const base={matrix,map,policy,frozen,today:TODAY};
const ev=(cands,extra={})=>evaluateDraft({...base,batch:batchOf(ids,cands),...extra});
const file=(seq,cands)=>({file:batchFile(ids,seq),raw:canonical(batchOf(ids,cands))});
const summaries=cands=>cands.map(c=>topicSummary(c,{policy,matrix}));
function commitBatch(cp,seq,cands,at=NOW,parent=P1){
 const batch=batchOf(ids,cands),raw=canonical(batch);
 return {cp:applyBatch(cp,{ids,seq,raw,batch,summaries:summaries(cands),now:at,mainSha:M,parentSha:parent,contract:CONTRACT}),file:{file:batchFile(ids,seq),raw}};
}

/* ------------------------------------------------------------------ identity, paths, push shape */

test("session identity yields one branch, one checkpoint and numbered batches; bad names are refused",()=>{
 assert.equal(ids.branch,"research/claude-20261015");
 assert.equal(ids.checkpointPath,"factory/topic-research/checkpoints/claude-20261015.json");
 assert.equal(batchFile(ids,3),"factory/topic-research/batches/claude-20261015-0003.json");
 assert.equal(ids.batchSession,"research-claude-20261015");
 assert.equal(idsFromBranch("research/claude-20261015").stem,"claude-20261015");
 assert.equal(idsFromBranch("main"),null);
 assert.equal(idsFromBranch("research/Claude 1"),null);
 for(const bad of [{agent:"Claude",session:"x1"},{agent:"cl-aude",session:"x1"},{agent:"claude",session:"a"},{agent:"claude",session:"../x"},{agent:"",session:"x1"}])
  assert.throws(()=>sessionIds(bad),bad.agent+"/"+bad.session);
 assert.equal(parseBatchFile(batchFile(ids,12),ids),12);
 assert.equal(parseBatchFile("factory/topic-research/batches/claude-20261015-12.json",ids),null);
 assert.deepEqual(managedBatchOwner(batchFile(ids,7)),{stem:"claude-20261015",seq:7});
 assert.equal(managedBatchOwner("factory/topic-research/batches/legacy-notes.json"),null);
 assert.equal(checkpointOwner(ids.checkpointPath),"claude-20261015");
});

test("a session may write only its own checkpoint and its own numbered batches",()=>{
 const other=sessionIds({agent:"mistral",session:"run2"});
 assert.ok(isAllowedPath(ids.checkpointPath,ids)&&isAllowedPath(batchFile(ids,1),ids));
 for(const bad of [other.checkpointPath,batchFile(other,1),"data/seo/master-matrix.json","data/seo/topic-factory/research-log.json","factory/external-writers/claims.json",
  "factory/topic-research/README.md","factory/topic-research/batches/free-name.json",".github/workflows/qa.yml","AGENTS.md","en/guides/x/index.html"])
  assert.equal(isAllowedPath(bad,ids),false,bad);
 assert.doesNotThrow(()=>assertAllowedPaths([ids.checkpointPath,batchFile(ids,1)],ids));
 assert.throws(()=>assertAllowedPaths([ids.checkpointPath,"data/seo/master-matrix.json"],ids),/PATH_NOT_ALLOWED/);
 assert.notEqual(core.CHECKPOINT_DIR,core.BATCH_DIR);
});

test("the only push shape is a plain non-force push of a research branch",()=>{
 assert.deepEqual(pushArgs("origin",ids.branch),["push","origin","refs/heads/"+ids.branch+":refs/heads/"+ids.branch]);
 for(const bad of ["main","master","research/x","feature/x","research/claude-20261015/extra","refs/heads/main"])assert.throws(()=>pushArgs("origin",bad),/PUSH_REFUSED/,bad);
 const flat=pushArgs("origin",ids.branch).join(" ");
 assert.doesNotMatch(flat,/--force|--delete|\+refs|-f\b/);
});

test("push failures are classified from git's many wordings; anything unfamiliar stays UNKNOWN (the CLI then judges by GitHub's state)",()=>{
 const table={
  REJECTED:[
   " ! [rejected]        research/claude-t1 -> research/claude-t1 (non-fast-forward)",
   " ! [rejected]        research/claude-t1 -> research/claude-t1 (fetch first)",
   " ! [remote rejected] research/claude-t1 -> research/claude-t1 (failed to update ref)",
   "remote: error: cannot lock ref 'refs/heads/research/claude-t1': reference already exists        \nTo /tmp/x/origin.git\n ! [remote rejected] research/claude-t1 -> research/claude-t1 (reference already exists)",
   "error: cannot lock ref 'refs/heads/research/claude-t1': is at 1234567890abcdef1234567890abcdef12345678 but expected 0000000000000000000000000000000000000000",
   " ! [remote rejected] research/claude-t1 -> research/claude-t1 (incorrect old value provided)",
   " ! [rejected]        research/claude-t1 -> research/claude-t1 (stale info)"],
  DENIED:[
   "remote: Permission to thuexemayhanoi/global.git denied to someone.\nfatal: unable to access 'https://github.com/thuexemayhanoi/global/': The requested URL returned error: 403",
   " ! [remote rejected] research/claude-t1 -> research/claude-t1 (protected branch hook declined)",
   "remote: error: GH013: Repository rule violations found for refs/heads/research/claude-t1.",
   "fatal: Authentication failed for 'https://github.com/thuexemayhanoi/global/'",
   "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
   "git@github.com: Permission denied (publickey)."],
  TRANSIENT:[
   "error: RPC failed; HTTP 502 curl 22 The requested URL returned error: 502",
   "error: RPC failed; HTTP 413 curl 22 The requested URL returned error: 413",
   "fatal: unable to access 'https://github.com/x/y/': Could not resolve host: github.com",
   "send-pack: unexpected disconnect while reading sideband packet",
   "fatal: the remote end hung up unexpectedly",
   "fatal: unable to access 'https://github.com/x/y/': Connection reset by peer",
   "GnuTLS recv error (-110): The TLS connection was non-properly terminated.",
   "ssh: connect to host github.com port 22: Connection timed out\nfatal: Could not read from remote repository."],
  UNREACHABLE:["fatal: '/srv/nope.git' does not appear to be a git repository\nfatal: Could not read from remote repository."],
  UNKNOWN:["","remote: error: a novel server message nobody has ever seen","! [remote rejected] research/claude-t1 -> research/claude-t1 (something else entirely)"]
 };
 for(const [kind,texts] of Object.entries(table))for(const t of texts)assert.equal(core.classifyPushFailure(t),kind,kind+": "+t.slice(0,90));
 assert.equal(core.classifyPushFailure(undefined),"UNKNOWN");
});

test("the checkpoint can never be mistaken for a research batch or reach the Topic Factory intake",()=>{
 const cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M});
 assert.equal(cp.purpose,"TOPIC_RESEARCH_CHECKPOINT");
 assert.notEqual(cp.purpose,RESEARCH_PURPOSE);
 const v=validateResearchBatch(cp,{matrix,map,policy});
 assert.ok(v.issues.some(i=>i.gate==="R1"),"intake validation refuses a checkpoint as a batch");
 assert.equal(isAllowedPath(ids.checkpointPath,ids),true);
 assert.ok(!ids.checkpointPath.startsWith(core.BATCH_DIR),"outside the directory the intake reads");
});

test("the core stays pure: no network, no model, no process or file access",()=>{
 const src=fs.readFileSync(path.join(root,"scripts/topic-research-core.mjs"),"utf8");
 const imports=[...src.matchAll(/from\s+"([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(imports.sort(),["./topic-factory-core.mjs","node:crypto"]);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|node:(?:http|https|net|child_process|fs)|process\.env/);
});

/* ------------------------------------------------------------------ draft normalisation */

test("a draft is an array or {candidates}; the batch identity always comes from the session, never from the draft",()=>{
 const a=normalizeDraft(enTopics(0,2),ids,TODAY);
 assert.deepEqual(a.errors,[]);
 assert.equal(a.batch.purpose,RESEARCH_PURPOSE);
 assert.deepEqual(a.batch.agent,{name:"claude",session:"research-claude-20261015"});
 assert.equal(a.batch.researched_on,TODAY);
 assert.equal(normalizeDraft({candidates:enTopics(0,1),researched_on:"2026-10-14"},ids,TODAY).batch.researched_on,"2026-10-14");
 assert.ok(normalizeDraft({candidates:[],researched_on:"2026-12-31"},ids,TODAY).errors.some(e=>/future/.test(e)));
 assert.ok(normalizeDraft({candidates:[],researched_on:"yesterday"},ids,TODAY).errors.some(e=>/YYYY-MM-DD/.test(e)));
 assert.ok(normalizeDraft({candidates:[],agent:{name:"mistral",session:"research-mistral-run2"}},ids,TODAY).errors.some(e=>/DRAFT_AGENT_MISMATCH/.test(e)));
 assert.ok(normalizeDraft({candidates:[],purpose:"OTHER"},ids,TODAY).errors.some(e=>/purpose/.test(e)));
 assert.ok(normalizeDraft("nope",ids,TODAY).errors.length);
});

/* ------------------------------------------------------------------ four QA phases */

test("ten genuine candidates pass all four phases against the real Matrix and topical map",()=>{
 const r=ev(enTopics(0,10));
 assert.deepEqual(r.counts,{pass:10,fail:0,skipped:0});
 for(const x of r.results){
  assert.equal(x.verdict,"PASS",x.ref+JSON.stringify(x.issues));
  assert.deepEqual(x.phases,{duplicate:"PASS",intent:"PASS",source:"PASS",schema:"PASS"});
 }
 assert.deepEqual(decideBatch(r),{action:"WRITE",code:"FULL_BATCH"});
 assert.equal(passingBatch(batchOf(ids,enTopics(0,10)),r.results).candidates.length,10);
});

test("failures are attributed to the right phase and name the real gate",()=>{
 const existing=map.locales.en.proposals.find(p=>p.status==="PROPOSED")||map.locales.en.proposals.find(p=>p.status==="PROMOTED");
 const r=ev([
  enTopic(0,{primary_query:existing.primary_query,slug:"copy-of-a-proposal"}),                                              // duplicate
  enTopic(1,{search_intent:"transactional",primary_query:"book a scooter in hanoi now with deposit"}),                      // intent
  enTopic(2,{references:[enTopic(2).references[0]]}),                                                                      // source (one reference)
  enTopic(3,{references:[enTopic(3).references[0],enTopic(3).references[0]]}),                                            // source (same URL twice)
  enTopic(4,{references:enTopic(4).references.map(x=>({...x,checked_on:"2026-12-01"}))}),                                // source (future)
  enTopic(5,{slug:"Bad Slug!"}),                                                                                          // schema
  enTopic(6,{content_angle:enTopic(6).intent_rationale}),                                                                 // intent (copy)
  enTopic(7)                                                                                                              // fine
 ]);
 const by=Object.fromEntries(r.results.map(x=>[x.index,x]));
 assert.equal(by[0].phases.duplicate,"FAIL");
 assert.equal(by[1].phases.intent,"FAIL");
 assert.equal(by[2].phases.source,"FAIL");
 assert.equal(by[3].phases.source,"FAIL");
 assert.ok(by[3].issues.some(i=>i.gate==="X_SRC_DUPLICATE_URL"));
 assert.ok(by[4].issues.some(i=>i.gate==="X_SRC_FUTURE_DATE"||i.gate==="R7"));
 assert.equal(by[5].phases.schema,"FAIL");
 assert.equal(by[6].phases.intent,"FAIL");
 assert.ok(by[6].issues.some(i=>i.gate==="X_INTENT_ANGLE_COPY"));
 assert.equal(by[7].verdict,"PASS");
 assert.equal(r.counts.fail,7);
 assert.equal(decideBatch(r).code,"QA_FAIL_BLOCKS_BATCH");
 for(const x of r.results.filter(y=>y.verdict==="FAIL"))assert.ok(x.issues.every(i=>i.phase&&i.gate&&i.reason),"every issue carries phase, gate and reason");
});

test("invented metrics never reach a batch and the intake gate names them",()=>{
 const r=ev([enTopic(0,{search_volume:5400}),enTopic(1)]);
 assert.equal(r.results[0].verdict,"FAIL");
 assert.ok(r.results[0].issues.some(i=>i.gate==="R8"));
 assert.equal(r.results[1].verdict,"PASS");
 const q=quarantineEntries(batchOf(ids,[enTopic(0,{search_volume:5400})]),r.results.slice(0,1),NOW);
 assert.equal(q.length,1);
 assert.ok(!("search_volume" in q[0].candidate),"quarantined copies drop the invented metric");
 assert.ok(q[0].gates.length&&q[0].key.startsWith("en::"));
});

test("source dates must not post-date the research day and a single-host source set is only a warning",()=>{
 const x=core.extraChecks({references:[{url:"https://a.example/x",checked_on:"2026-10-15"},{url:"https://a.example/y",checked_on:"2026-10-15"}]},{today:TODAY,researchedOn:"2026-10-14"});
 assert.ok(x.some(i=>i.gate==="X_SRC_AFTER_RESEARCH"&&i.severity==="FAIL"));
 assert.ok(x.some(i=>i.gate==="X_SRC_SINGLE_HOST"&&i.severity==="WARN"));
 const ok=core.extraChecks({references:[{url:"https://a.example/x",checked_on:"2026-10-14"},{url:"https://b.example/y",checked_on:"2026-10-14"}]},{today:TODAY,researchedOn:"2026-10-14"});
 assert.deepEqual(ok,[]);
});

test("gate classification keeps the four owner phases separate",()=>{
 const c=core.classifyGate;
 assert.equal(c("F5_DUPLICATE"),"duplicate");
 assert.equal(c("F6_LOCALE_CAP"),"duplicate");
 assert.equal(c("R5","Duplicate primary_query in this batch"),"duplicate");
 assert.equal(c("R5","intent_rationale is required"),"intent");
 assert.equal(c("R6"),"intent");
 assert.equal(c("F4_COMMERCIAL_INTENT"),"intent");
 assert.equal(c("R7"),"source");
 assert.equal(c("R8"),"source");
 assert.equal(c("T4","Invalid search_intent"),"intent");
 assert.equal(c("T4","Cannibalization risk with TA-EN-0001"),"duplicate");
 assert.equal(c("R3"),"schema");
 assert.equal(c("T1"),"schema");
});

/* ------------------------------------------------------------------ cross-batch and cross-session duplicates */

test("a later batch is checked against every earlier batch file of the session, not only against main",()=>{
 const first=file(1,enTopics(0,10));
 const again=ev([enTopic(3,{slug:"same-idea-new-slug"}),enTopic(10)],{priorFiles:[first],newFile:batchFile(ids,2)});
 assert.equal(again.priorFailures.length,0);
 assert.equal(again.results[0].verdict,"FAIL");
 assert.equal(again.results[0].phases.duplicate,"FAIL");
 assert.match(again.results[0].issues.map(i=>i.reason).join(" "),/candidate en:|TA-EN-/);
 assert.equal(again.results[1].verdict,"PASS");
 assert.equal(decideBatch(again,{quarantine:true,final:true}).action,"WRITE");
});

test("topics the session already holds are skipped after a crash, never re-researched or double-counted",()=>{
 const first=file(1,enTopics(0,10));
 const own=new Map(enTopics(0,10).map(c=>[topicKey(c),"batch 0001 on GitHub"]));
 const r=ev([...enTopics(0,3),...enTopics(10,7)],{priorFiles:[first],ownKeys:own,newFile:batchFile(ids,2)});
 assert.deepEqual(r.counts,{pass:7,fail:0,skipped:3});
 assert.deepEqual(r.results.slice(0,3).map(x=>x.verdict),["SKIP_ALREADY_ACCEPTED","SKIP_ALREADY_ACCEPTED","SKIP_ALREADY_ACCEPTED"]);
 assert.equal(passingBatch(batchOf(ids,[...enTopics(0,3),...enTopics(10,7)]),r.results).candidates.length,7);
 const none=ev(enTopics(0,3),{priorFiles:[first],ownKeys:own,newFile:batchFile(ids,2)});
 assert.equal(decideBatch(none).code,"ALL_ALREADY_ACCEPTED");
});

test("replay safety: an earlier file already ingested by main is not simulated twice; a rejected one blocks new batches",()=>{
 const first=file(1,enTopics(0,10));
 const digest=sha256(first.raw);
 const ingested={batches:[{file:first.file,sha256:digest,commit:M,branch:ids.branch,added:["TA-EN-0100"],rejected:[]}]};
 const ok=ev(enTopics(10,10),{priorFiles:[first],log:ingested,newFile:batchFile(ids,2)});
 assert.deepEqual(ok.priorFailures,[]);
 assert.equal(ok.counts.pass,10);
 const rejected={batches:[{file:first.file,sha256:digest,commit:M,branch:ids.branch,added:[],rejected:[{index:0,gate:"F5_DUPLICATE",reason:"x"}]}]};
 const blocked=ev(enTopics(10,10),{priorFiles:[first],log:rejected,newFile:batchFile(ids,2)});
 assert.equal(blocked.priorFailures.length,1);
 assert.equal(decideBatch(blocked).code,"PRIOR_FILES_FAIL");
 const broken=ev(enTopics(10,10),{priorFiles:[{file:batchFile(ids,1),raw:"{not json"}],newFile:batchFile(ids,2)});
 assert.equal(decideBatch(broken).code,"PRIOR_FILES_FAIL");
});

test("topics in flight on another research session block duplicates before they are ingested",()=>{
 const theirs={branch:"research/mistral-run2",batches:[{file:"factory/topic-research/batches/mistral-run2-0001.json",
  raw:canonical({...batchOf(ids,[enTopic(0,{slug:"their-luggage-topic"})]),agent:{name:"mistral",session:"research-mistral-run2"}})}]};
 const others=core.inFlightItems([theirs],{log:{batches:[]},exclude:ids.branch});
 assert.equal(others.length,1);
 const r=ev([enTopic(0),enTopic(1)],{others});
 assert.equal(r.results[0].verdict,"FAIL");
 assert.ok(r.results[0].issues.some(i=>i.gate==="X_DUP_CROSS_SESSION"&&i.phase==="duplicate"));
 assert.equal(r.results[1].verdict,"PASS");
 // Own branch and already-ingested batches are not "another session".
 assert.equal(core.inFlightItems([{...theirs,branch:ids.branch}],{exclude:ids.branch}).length,0);
 const digest=sha256(theirs.batches[0].raw);
 assert.equal(core.inFlightItems([theirs],{log:{batches:[{sha256:digest}]}}).length,0);
 // A different locale is never a duplicate.
 assert.equal(core.crossSessionDuplicates({...enTopic(0),locale:"de"},others,{stop:[],thresholds:policy.duplicates,distinctMin:40}).length,0);
});

/* ------------------------------------------------------------------ push-size rules */

test("Auto Push rules: 10 topics per batch, a short batch only when the session is ending, never padded or forced",()=>{
 const R=(pass,fail=0,skipped=0)=>({counts:{pass,fail,skipped},batchIssues:[],priorFailures:[]});
 assert.deepEqual(decideBatch(R(10)),{action:"WRITE",code:"FULL_BATCH"});
 assert.equal(decideBatch(R(9)).code,"BATCH_INCOMPLETE");
 assert.equal(decideBatch(R(9)).action,"REFUSE");
 assert.deepEqual(decideBatch(R(4),{final:true}),{action:"WRITE",code:"PARTIAL_FINAL"});
 assert.equal(decideBatch(R(11)).code,"BATCH_TOO_LARGE");
 assert.equal(decideBatch(R(8,2)).code,"QA_FAIL_BLOCKS_BATCH");
 assert.equal(decideBatch(R(10,2),{quarantine:true}).code,"FULL_BATCH");
 assert.equal(decideBatch(R(0,3)).code,"NO_PASSING_TOPICS");
 assert.equal(decideBatch(R(0,3),{quarantine:true}).action,"QUARANTINE_ONLY");
 assert.equal(decideBatch(R(0,0,2)).code,"ALL_ALREADY_ACCEPTED");
 assert.equal(decideBatch({...R(10),batchIssues:[{gate:"R1",reason:"bad"}]}).code,"BATCH_INVALID");
 assert.equal(decideBatch({...R(10),priorFailures:[{file:"x",gate:"R0",reason:"y"}]}).code,"PRIOR_FILES_FAIL");
 assert.deepEqual(decideBatch(R(3),{replay:true}),{action:"WRITE",code:"REPLAY"});
 assert.equal(decideBatch(R(3,1),{replay:true}).code,"QA_FAIL_BLOCKS_BATCH");
});

/* ------------------------------------------------------------------ checkpoint */

test("the checkpoint records everything the owner asked for and validates",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});
 assert.deepEqual(validateCheckpoint(cp,{ids}),[]);
 const one=commitBatch(cp,1,enTopics(0,10));
 cp=one.cp;
 assert.deepEqual(validateCheckpoint(cp,{ids}),[],JSON.stringify(validateCheckpoint(cp,{ids})));
 assert.equal(cp.agent,"claude");assert.equal(cp.session,"20261015");assert.equal(cp.branch,ids.branch);
 assert.equal(cp.totals.researched,10);assert.equal(cp.totals.qa_pass,10);assert.equal(cp.totals.qa_fail,0);
 assert.equal(cp.totals.pushed,0);assert.equal(cp.totals.pending_push,10);
 assert.equal(cp.last_batch.seq,1);assert.equal(cp.last_batch.state,"COMMITTED");
 assert.equal(cp.batches[0].sha256,sha256(one.file.raw));
 assert.equal(cp.batches[0].topics.length,10);
 const t=cp.batches[0].topics[0];
 assert.deepEqual(Object.keys(t).sort(),["domain_id","key","locale","parent_id","ref","slug","subcluster","ta_id"]);
 assert.equal(t.locale,"en");assert.equal(t.domain_id,"motorbike-rental");assert.equal(t.ta_id,null);
 assert.equal(cp.next_batch.seq,2);assert.equal(cp.next_batch.file,batchFile(ids,2));assert.equal(cp.next_batch.size,10);
 assert.equal(cp.base_main_sha,M);assert.equal(cp.last_commit_sha,P1);
 assert.deepEqual(cp.contract,CONTRACT);
 assert.equal(cp.coverage.locales.en,10);
 assert.ok(cp.updated_at&&cp.created_at);
 // Since the six-Hub activation (2026-10-27) former research-only domains are parented by their Hub.
 const travel=summaries([enTopic(16)])[0];
 assert.equal(travel.parent_id,"EN-H09");
 assert.ok(JSON.stringify(cp).length<20_000,"small enough to commit with every batch");
});

test("each later batch settles the previous one as PUSHED and keeps the counters exact",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});
 cp=commitBatch(cp,1,enTopics(0,10)).cp;
 cp=commitBatch(cp,2,enTopics(10,10),"2026-10-15T11:00:00.000Z",P2).cp;
 assert.deepEqual(validateCheckpoint(cp,{ids}),[]);
 assert.deepEqual(cp.batches.map(b=>b.state),["PUSHED","COMMITTED"]);
 assert.deepEqual({r:cp.totals.researched,p:cp.totals.pushed,n:cp.totals.pending_push},{r:20,p:10,n:10});
 assert.equal(cp.last_commit_sha,P2);
 assert.equal(cp.history.at(-1).event,"BATCH_COMMITTED");
 assert.throws(()=>applyBatch(cp,{ids,seq:2,raw:"{}",batch:{candidates:[]},summaries:[],now:NOW,mainSha:M,parentSha:P2}),/BATCH_SEQ_TAKEN/);
});

test("QA FAIL candidates are kept in the checkpoint until fixed, counted once and never become batch topics",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});
 const bad=enTopic(9,{references:[enTopic(9).references[0]]});
 const r=ev([...enTopics(0,9),bad]);
 const failed=quarantineEntries(batchOf(ids,[...enTopics(0,9),bad]),r.results,NOW);
 assert.equal(failed.length,1);
 const good=enTopics(0,9).filter((_,i)=>r.results[i].verdict==="PASS");
 const batch=batchOf(ids,good),raw=canonical(batch);
 cp=applyBatch(cp,{ids,seq:1,raw,batch,summaries:summaries(good),failed,now:NOW,mainSha:M,parentSha:P1,contract:CONTRACT});
 assert.deepEqual(validateCheckpoint(cp,{ids}),[]);
 assert.equal(cp.totals.qa_pass,good.length);assert.equal(cp.totals.qa_fail,1);assert.equal(cp.totals.qa_fail_open,1);
 assert.equal(cp.totals.researched,good.length+1);
 const open=cp.unresolved.find(u=>u.kind==="QA_FAIL");
 assert.ok(open.candidate&&open.gates.length&&open.attempts===1);
 assert.ok(!cp.batches.some(b=>b.topics.some(t=>t.key===open.key)),"never in a batch");
 // Failing again increments attempts without double counting the open failure.
 const again=applyUpdate(cp,{ids,now:NOW,mainSha:M,parentSha:P2,quarantine:failed});
 assert.equal(again.unresolved.filter(u=>u.kind==="QA_FAIL").length,1);
 // A corrected topic with the same query passes into a later batch and clears the entry; the fail tally is history.
 const fixed=enTopic(9);
 const b2=batchOf(ids,[fixed]);
 const next=applyBatch(cp,{ids,seq:2,raw:canonical(b2),batch:b2,summaries:summaries([fixed]),now:NOW,mainSha:M,parentSha:P2,contract:CONTRACT});
 assert.equal(next.totals.qa_fail_open,0);assert.equal(next.totals.qa_fail,1);
 assert.deepEqual(validateCheckpoint(next,{ids}),[]);
 // Abandoning is explicit and recorded.
 const dropped=applyUpdate(cp,{ids,now:NOW,mainSha:M,parentSha:P2,abandon:[open.id]});
 assert.equal(dropped.totals.qa_fail_open,0);
 assert.ok(dropped.history.some(h=>h.event==="QA_FAIL_ABANDONED"&&h.id===open.id));
 assert.throws(()=>applyUpdate(cp,{ids,now:NOW,mainSha:M,parentSha:P2,resolve:[open.id]}),/QA_FAIL entry/);
 assert.throws(()=>applyUpdate(cp,{ids,now:NOW,mainSha:M,parentSha:P2,abandon:["nope"]}),/UNKNOWN_QA_FAIL_ID/);
});

test("notes and blockers survive in the checkpoint and show up in resume actions",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});
 cp=applyUpdate(cp,{ids,now:NOW,mainSha:M,parentSha:M,notes:["reading list for Ha Giang topics"],blockers:["no source found for ESIM roaming claims"]});
 assert.deepEqual(validateCheckpoint(cp,{ids}),[]);
 assert.deepEqual(cp.unresolved.map(u=>u.kind),["NOTE","BLOCKER"]);
 const plan=planResume({ids,now:NOW,contract:{current:CONTRACT},main:{sha:M,log:{batches:[]},sessionTopics:[]},ctx:{policy,matrix},
  remote:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:[],binding:"OK"},local:{exists:true,sha:P1,relation:"EQUAL",batches:[]},others:[]});
 assert.ok(plan.actions.some(a=>/^BLOCKER: no source found/.test(a)));
});

test("tampering is detected: counters, digests, order, duplicates, metrics, identity",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});
 const a=commitBatch(cp,1,enTopics(0,10));
 const b=commitBatch(a.cp,2,enTopics(10,10),NOW,P2);
 const good=b.cp;
 assert.deepEqual(validateCheckpoint(good,{ids}),[]);
 const codes=mut=>{const c=structuredClone(good);mut(c);return validateCheckpoint(c,{ids}).map(i=>i.code);};
 assert.ok(codes(c=>{c.totals.pushed=20;}).includes("CP_COUNTERS"));
 assert.ok(codes(c=>{c.batches[0].sha256="zz";}).includes("CP_DIGEST"));
 assert.ok(codes(c=>{c.batches[1].seq=1;c.batches[1].file=batchFile(ids,1);}).includes("CP_SEQ"));
 assert.ok(codes(c=>{c.batches[0].topics[0]=structuredClone(c.batches[1].topics[0]);}).includes("CP_DUP_TOPIC"));
 assert.ok(codes(c=>{c.batches[0].state="COMMITTED";c.batches[1].state="PUSHED";}).includes("CP_STATE"));
 assert.ok(codes(c=>{c.agent="mistral";}).includes("CP_IDENTITY"));
 assert.ok(codes(c=>{c.branch="research/other-1";}).includes("CP_BRANCH"));
 assert.ok(codes(c=>{c.last_commit_sha="nope";}).includes("CP_SHA"));
 assert.ok(codes(c=>{c.next_batch.seq=9;}).includes("CP_NEXT_BATCH"));
 assert.ok(codes(c=>{c.last_batch.sha256="0".repeat(64);}).includes("CP_LAST_BATCH"));
 assert.ok(codes(c=>{c.purpose="TOPIC_RESEARCH_BATCH";}).includes("CP_HEADER"));
 assert.ok(codes(c=>{c.coverage.locales.en=99;}).includes("CP_COVERAGE"));
 assert.ok(codes(c=>{c.unresolved.push({id:"qf-1",kind:"QA_FAIL",key:"en::x",gates:[{gate:"R7"}],candidate:{search_volume:100}});}).includes("CP_METRICS"));
 assert.ok(codes(c=>{c.unresolved.push({id:"x",kind:"WAT"});}).includes("CP_UNRESOLVED"));
 assert.deepEqual(validateCheckpoint(null,{ids}).map(i=>i.code),["CP_SHAPE"]);
 // Content verification: the exact bytes on GitHub decide.
 const files=[a.file,b.file];
 assert.deepEqual(verifyCheckpointContent(good,files,ids),[]);
 assert.deepEqual(verifyCheckpointContent(good,[a.file],ids).map(i=>i.code),["CONTENT_MISSING"]);
 assert.deepEqual(verifyCheckpointContent(good,[a.file,{...b.file,raw:b.file.raw+" "}],ids).map(i=>i.code),["CONTENT_DIGEST"]);
 const extra={file:batchFile(ids,3),raw:canonical(batchOf(ids,enTopics(20,2)))};
 assert.deepEqual(verifyCheckpointContent(good,[a.file,b.file,extra],ids).map(i=>i.code),["CONTENT_UNRECORDED"]);
 const foreign={...a.file,raw:canonical({...batchOf(ids,enTopics(0,10)),agent:{name:"mistral",session:"research-mistral-run2"}})};
 const cpForeign=structuredClone(a.cp);cpForeign.batches[0].sha256=sha256(foreign.raw);
 assert.ok(verifyCheckpointContent(cpForeign,[foreign],ids).some(i=>i.code==="CONTENT_SESSION"));
});

test("the checkpoint is rebuilt from the batch files that exist, keeping open failures and notes",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});
 const a=commitBatch(cp,1,enTopics(0,10));
 const b=commitBatch(a.cp,2,enTopics(10,10),NOW,P2);
 const failed=quarantineEntries(batchOf(ids,[enTopic(23,{references:[]})]),[{verdict:"FAIL",index:0,key:topicKey(enTopic(23)),issues:[{severity:"FAIL",gate:"R7",phase:"source",reason:"refs"}]}],NOW);
 const withOpen=applyUpdate(b.cp,{ids,now:NOW,mainSha:M,parentSha:P2,quarantine:failed,notes:["keep this note"]});
 const rebuilt=rebuildCheckpoint(ids,{files:[b.file,a.file],previous:withOpen,now:"2026-10-16T08:00:00.000Z",mainSha:M,parentSha:P2,contract:CONTRACT,ctx:{policy,matrix},
  pushedDigests:new Set([sha256(a.file.raw)])});
 assert.deepEqual(validateCheckpoint(rebuilt,{ids}),[],JSON.stringify(validateCheckpoint(rebuilt,{ids})));
 assert.deepEqual(verifyCheckpointContent(rebuilt,[a.file,b.file],ids),[]);
 assert.deepEqual(rebuilt.batches.map(x=>[x.seq,x.state]),[[1,"PUSHED"],[2,"COMMITTED"]]);
 assert.equal(rebuilt.totals.qa_pass,20);assert.equal(rebuilt.totals.qa_fail_open,1);
 assert.ok(rebuilt.unresolved.some(u=>u.kind==="NOTE"&&u.message==="keep this note"));
 assert.equal(rebuilt.created_at,NOW);
 assert.equal(rebuilt.history.at(-1).event,"CHECKPOINT_REBUILT_FROM_CONTENT");
 assert.equal(rebuilt.next_batch.seq,3);
 // With no previous record at all the state still comes back from content alone.
 const fromNothing=rebuildCheckpoint(ids,{files:[a.file,b.file],now:NOW,mainSha:M,parentSha:P2,contract:CONTRACT,ctx:{policy,matrix}});
 assert.deepEqual(validateCheckpoint(fromNothing,{ids}),[]);
 assert.equal(fromNothing.totals.qa_pass,20);
 // Gaps in numbering (a batch that was never pushed) are fine; only the order must increase.
 const gap=rebuildCheckpoint(ids,{files:[a.file,{file:batchFile(ids,4),raw:b.file.raw}],now:NOW,ctx:{policy,matrix}});
 assert.deepEqual(validateCheckpoint(gap,{ids}),[]);
 assert.equal(gap.next_batch.seq,5);
});

test("Topic Factory IDs are filled in only from what main really ingested",()=>{
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M});
 cp=commitBatch(cp,1,enTopics(0,3)).cp;
 const proposals=new Map([["en:"+enTopic(0).slug,{candidate_id:"TA-EN-0101"}],["en:unknown",{candidate_id:"TA-EN-9999"}]]);
 const r=core.resolveTaIds(cp,proposals);
 assert.equal(r.changed,1);
 assert.equal(r.checkpoint.batches[0].topics[0].ta_id,"TA-EN-0101");
 assert.equal(r.checkpoint.batches[0].topics[1].ta_id,null);
 assert.deepEqual(validateCheckpoint(r.checkpoint,{ids}),[]);
});

/* ------------------------------------------------------------------ resume planning */

const facts=(over={})=>({ids,now:NOW,contract:{current:CONTRACT},main:{sha:M,log:{batches:[]},sessionTopics:[]},ctx:{policy,matrix},
 remote:{exists:false},local:{exists:false,relation:"NONE",batches:[]},others:[],...over});
function session(n){
 let cp=newCheckpoint(ids,{now:NOW,mainSha:M,parentSha:M,contract:CONTRACT});const files=[];
 for(let i=1;i<=n;i++){const r=commitBatch(cp,i,i<3?enTopics((i-1)*10,10):enTopics(20,4),NOW,P1);cp=r.cp;files.push(r.file);}
 return {cp,files};
}

test("a brand-new session starts fresh from main with no work to skip",()=>{
 const p=planResume(facts());
 assert.equal(p.state,"FRESH");assert.equal(p.branch.action,"CREATE_FROM_MAIN");assert.equal(p.source_of_truth,"NONE");
 assert.equal(p.next.seq,1);assert.equal(p.next.file,batchFile(ids,1));
 assert.equal(p.do_not_research.count,0);
 assert.ok(p.warnings.some(w=>/NO_RESEARCH_LOG/.test(w)));
});

test("environment lost: everything is recovered from the GitHub branch alone",()=>{
 const {cp,files}=session(2);
 const p=planResume(facts({remote:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:files,binding:"OK"}}));
 assert.equal(p.state,"RESUME");assert.equal(p.branch.action,"CREATE_FROM_REMOTE");assert.equal(p.source_of_truth,"REMOTE_BRANCH");
 assert.equal(p.checkpoint.trust,"VERIFIED");
 assert.equal(p.derived.pushed,20);assert.equal(p.derived.pending_push,0);
 assert.equal(p.do_not_research.count,20);
 assert.ok(enTopics(0,20).every(c=>p.do_not_research.keys.includes(topicKey(c))));
 assert.equal(p.next.seq,3);assert.equal(p.next.file,batchFile(ids,3));
 assert.deepEqual(p.batches.map(b=>[b.seq,b.ingest]),[[1,"PENDING"],[2,"PENDING"]]);
 assert.ok(p.warnings.some(w=>/INGEST_PENDING: 2/.test(w)));
 assert.ok(p.actions.at(-1).startsWith("CONTINUE: research the next 10 topics → batch 0003"));
});

test("a session that stops after its last batch is told to settle the checkpoint; a settled one is not",()=>{
 const {cp,files}=session(2);
 const taOf=enTopics(0,20).map((c,i)=>({ta_id:"TA-EN-"+(500+i),locale:"en",slug:c.slug,key:topicKey(c),status:"PROPOSED"}));
 const remote=c=>({remote:{exists:true,sha:P1,checkpoint:{raw:canonical(c)},batches:files,binding:"OK"}});
 const open=planResume(facts({...remote(cp),main:{sha:M,log:{batches:[]},sessionTopics:taOf}}));
 assert.equal(open.checkpoint.trust,"VERIFIED");
 assert.deepEqual(open.checkpoint.settle,{unsettled_batches:1,missing_ta_ids:20},"only the newest batch is unsettled; no TA ID recorded yet");
 const hint=open.actions.find(a=>a.startsWith("SETTLE_CHECKPOINT"));
 assert.ok(hint&&/1 pushed batch\(es\) as COMMITTED and lacks 20 TA ID/.test(hint)&&/checkpoint --sync-ids/.test(hint));
 assert.ok(open.actions.at(-1).startsWith("CONTINUE"),"settling never blocks the next batch");
 const proposals=new Map(enTopics(0,20).map((c,i)=>["en:"+c.slug,{candidate_id:"TA-EN-"+(500+i)}]));
 const settled=resolveTaIds(applyUpdate(cp,{ids,now:NOW,mainSha:M,parentSha:P2,commitShaByFile:{[files[1].file]:P2}}),proposals).checkpoint;
 assert.deepEqual(validateCheckpoint(settled,{ids}),[]);
 assert.deepEqual(settled.batches.map(b=>b.state),["PUSHED","PUSHED"]);
 const done=planResume(facts({...remote(settled),main:{sha:M,log:{batches:[]},sessionTopics:taOf}}));
 assert.deepEqual(done.checkpoint.settle,{unsettled_batches:0,missing_ta_ids:0});
 assert.ok(!done.actions.some(a=>a.startsWith("SETTLE_CHECKPOINT")));
});

test("a missing, corrupt or stale checkpoint is never trusted: state is re-derived from the files on GitHub",()=>{
 const {cp,files}=session(2);
 const lying=structuredClone(cp);lying.totals.researched=999;lying.batches[1].sha256="f".repeat(64);
 for(const [name,remote] of Object.entries({
  missing:{exists:true,sha:P1,checkpoint:null,batches:files,binding:"OK"},
  corrupt:{exists:true,sha:P1,checkpoint:{raw:"{oops"},batches:files,binding:"OK"},
  lying:{exists:true,sha:P1,checkpoint:{raw:canonical(lying)},batches:files,binding:"OK"},
  history_rewritten:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:files,binding:"MISMATCH"}
 })){
  const p=planResume(facts({remote}));
  assert.equal(p.derived.pushed,20,name);
  assert.equal(p.next.seq,3,name);
  assert.equal(p.do_not_research.count,20,name);
  if(name!=="missing"){assert.equal(p.checkpoint.trust,"CONTENT_ONLY",name);assert.ok(p.warnings.some(w=>/CHECKPOINT_NOT_TRUSTED/.test(w)),name);}
  else assert.equal(p.checkpoint.trust,"NONE");
 }
 const unrecorded=planResume(facts({remote:{exists:true,sha:P1,checkpoint:{raw:canonical(session(1).cp)},batches:files,binding:"OK"}}));
 assert.equal(unrecorded.checkpoint.trust,"CONTENT_ONLY");
 assert.ok(unrecorded.checkpoint.issues.some(i=>i.code==="CONTENT_UNRECORDED"));
 assert.equal(unrecorded.next.seq,3);
});

test("ingest status comes from main's research log, matched by SHA-256 of the exact bytes",()=>{
 const {cp,files}=session(3);
 const log={batches:[
  {file:files[0].file,sha256:sha256(files[0].raw),commit:P1,branch:ids.branch,added:Array.from({length:10},(_,i)=>"TA-EN-"+(300+i)),rejected:[]},
  {file:files[1].file,sha256:sha256(files[1].raw),commit:P1,branch:ids.branch,added:["TA-EN-0310"],rejected:[{index:1,gate:"F5_DUPLICATE",reason:"x"}]},
  {file:files[2].file,sha256:sha256(files[2].raw),commit:P1,branch:ids.branch,error:"Malformed JSON"}]};
 const p=planResume(facts({main:{sha:M,log,sessionTopics:[]},remote:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:files,binding:"OK"}}));
 assert.deepEqual(p.batches.map(b=>b.ingest),["ACCEPTED","PARTIAL","ERROR"]);
 assert.ok(p.warnings.some(w=>/INGEST_PARTIAL/.test(w)));
 assert.ok(p.warnings.some(w=>/INGEST_ERROR/.test(w)));
 assert.ok(!p.warnings.some(w=>/INGEST_PENDING|NO_RESEARCH_LOG/.test(w)));
 assert.equal(p.next.seq,4);
 assert.equal(p.derived.ingested_by_main,0,"counted from main's topics, not from the log alone");
});

test("topics main already ingested from this session are never researched again",()=>{
 const {cp,files}=session(1);
 const taOf=enTopics(0,10).map((c,i)=>({ta_id:"TA-EN-"+(200+i),locale:"en",slug:c.slug,key:topicKey(c),status:"PROPOSED"}));
 const extra={ta_id:"TA-EN-0299",locale:"en",slug:"older-topic",key:"en::older topic",status:"PROMOTED"};
 const p=planResume(facts({main:{sha:M,log:{batches:[]},sessionTopics:[...taOf,extra]},remote:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:files,binding:"OK"}}));
 assert.equal(p.do_not_research.keys.includes("en::older topic"),true);
 assert.equal(p.do_not_research.count,11);
 assert.equal(p.derived.ingested_by_main,11);
});

test("a local commit that never reached GitHub is pushed before anything new; nothing is lost",()=>{
 const {cp,files}=session(2);
 const onRemote=files.slice(0,1);
 const remoteCp=session(1).cp;
 const p=planResume(facts({remote:{exists:true,sha:P1,checkpoint:{raw:canonical(remoteCp)},batches:onRemote,binding:"OK"},
  local:{exists:true,sha:P2,relation:"AHEAD",batches:files}}));
 assert.equal(p.branch.action,"PUSH_PENDING");
 assert.equal(p.local_only_batches.length,1);assert.equal(p.local_only_batches[0].seq,2);
 assert.equal(p.derived.pending_push,10);
 assert.ok(p.actions[0].startsWith("PUSH_PENDING"));
 assert.equal(p.do_not_research.count,20,"unpushed topics are protected from duplicate research too");
 assert.equal(p.next.seq,3);
 // Local branch exists but was never pushed at all.
 const never=planResume(facts({local:{exists:true,sha:P2,relation:"NONE",batches:files}}));
 assert.equal(never.branch.action,"PUSH_PENDING");assert.equal(never.state,"RESUME");assert.equal(never.source_of_truth,"LOCAL_ONLY");
 // Local clone behind GitHub (another machine continued the session): fast-forward only.
 const behind=planResume(facts({remote:{exists:true,sha:P2,checkpoint:{raw:canonical(cp)},batches:files,binding:"OK"},local:{exists:true,sha:P1,relation:"BEHIND",batches:onRemote}}));
 assert.equal(behind.branch.action,"FAST_FORWARD");
 assert.equal(behind.local_only_batches.length,0);
});

test("a diverged branch is reconciled by content: only the missing batches are replayed, pushed history is untouched",()=>{
 const {cp,files}=session(2);
 // GitHub has batch 1; the local clone built its own batch 1 and 2 on a recreated branch.
 const localOther=[{file:batchFile(ids,1),raw:canonical(batchOf(ids,enTopics(0,3).concat(enTopics(20,3))))},files[1]];
 const p=planResume(facts({remote:{exists:true,sha:P1,checkpoint:{raw:canonical(session(1).cp)},batches:files.slice(0,1),binding:"OK"},
  local:{exists:true,sha:P2,relation:"DIVERGED",batches:localOther}}));
 assert.equal(p.branch.action,"REPLAY_UNPUSHED");
 assert.equal(p.local_only_batches.length,2);
 assert.ok(p.actions.some(a=>/REPLAY_UNPUSHED/.test(a)&&/nothing already pushed is touched/.test(a)));
 assert.equal(p.next.seq,3);
 // Unrelated local history with no unpushed batch is just reset to GitHub.
 const reset=planResume(facts({remote:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:files,binding:"OK"},local:{exists:true,sha:P2,relation:"UNRELATED",batches:[]}}));
 assert.equal(reset.branch.action,"RESET_TO_REMOTE");
});

test("a rewritten contract (AGENTS.md or the factory doc) is surfaced before research continues",()=>{
 const {cp,files}=session(1);
 const p=planResume(facts({contract:{current:{...CONTRACT,agents_md_sha256:"9".repeat(64)}},remote:{exists:true,sha:P1,checkpoint:{raw:canonical(cp)},batches:files,binding:"OK"}}));
 assert.ok(p.warnings.some(w=>/CONTRACT_CHANGED/.test(w)));
});

test("the interrupted session is found even when only main's log remembers it",()=>{
 const log={batches:[{file:batchFile(ids,1),sha256:"d".repeat(64),commit:P1,branch:ids.branch,added:["TA-EN-0400"],rejected:[]}]};
 const p=planResume(facts({main:{sha:M,log,sessionTopics:[{ta_id:"TA-EN-0400",locale:"en",slug:"x",key:"en::x",status:"PROPOSED"}]}}));
 assert.equal(p.state,"RESUME");assert.equal(p.source_of_truth,"MAIN_LOG_ONLY");
 assert.equal(p.next.seq,2,"never reuses a sequence number main has already seen");
 assert.ok(p.do_not_research.keys.includes("en::x"));
});

/* ------------------------------------------------------------------ planning aid */

test("planning hints show where each domain places topics and never invent a Hub for research-only domains",()=>{
 const h=planningHints({matrix,map,policy});
 assert.equal(h.length,8);
 const active=h.filter(d=>d.status==="ACTIVE"),open=h.filter(d=>d.status==="RESEARCH_OPEN");
 assert.equal(active.length+open.length,8);
 for(const d of active){assert.equal(d.placement.mode,"EXISTING_HUB");for(const hubInfo of Object.values(d.placement.hubs))assert.equal(Object.keys(hubInfo.parents).length,10);}
 for(const d of open){assert.equal(d.placement.mode,"PROPOSED_HUB");assert.equal(d.placement.parent_id,null);assert.ok(d.placement.subclusters.length>0);}
 for(const d of h)assert.deepEqual(Object.keys(d.per_locale).sort(),[...policy.targets.locales].sort());
 const cap=localeCapacity({matrix,map,policy,inFlight:{en:5}});
 assert.equal(Object.keys(cap).length,10);
 assert.equal(cap.en.in_flight_other_sessions,5);
 assert.ok(cap.en.available<=cap.de.available+5&&cap.en.target===1000);
});

test("fixtures stay valid research: the shared test topics are within the cap and unique",()=>{
 assert.ok(EN_COUNT>=24);
 assert.equal(new Set(enTopics(0,EN_COUNT).map(topicKey)).size,EN_COUNT);
 assert.equal(new Set(enTopics(0,EN_COUNT).map(c=>c.slug)).size,EN_COUNT);
});
