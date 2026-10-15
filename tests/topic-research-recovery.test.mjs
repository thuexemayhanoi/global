/**
 * Integration tests for the crash-safe research loop against a throw-away "GitHub" (a bare repository
 * with a push-audit hook). Real git, real CLI, real intake gates and the real Topic Factory ingest.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {root} from "./topic-research-fixtures.mjs";
import {enTopic,enTopics,batchOf} from "./topic-research-fixtures.mjs";
import {makeEnv,git,gitEnv,NOW} from "./topic-research-env.mjs";
import {sessionIds,validateCheckpoint,verifyCheckpointContent,sha256,topicKey,batchFile} from "../scripts/topic-research-core.mjs";

const ids=sessionIds({agent:"claude",session:"t1"});
const id2=sessionIds({agent:"mistral",session:"run2"});
const A=(i)=>["--agent",i.agent,"--session",i.session];
const cmd=(name,i,...rest)=>[name,...A(i),...rest];
const BATCHES=ids.batchPrefix.replace(/claude-t1-$/,"");
const readCp=(env,i=ids)=>JSON.parse(env.remoteFile(i.branch,i.checkpointPath));
const remoteBatchFiles=(env,i=ids)=>env.remoteFiles(i.branch,"factory/topic-research/batches/");
const remoteBatchTopics=(env,i=ids)=>remoteBatchFiles(env,i).flatMap(f=>JSON.parse(env.remoteFile(i.branch,f)).candidates.map(topicKey));
/** Fresh environment per scenario; always cleaned up. */
async function scenario(name,fn){
 await test(name,async()=>{
  const env=makeEnv();
  try{await fn(env);}finally{env.cleanup();}
 });
}
function expectSaved(r,msg=""){
 assert.equal(r.status,0,msg+"\nstdout:"+r.stdout+"\nstderr:"+r.stderr);
 assert.equal(r.data.status,"SAVED",msg+r.stdout);
 return r.data;
}
function assertGithubConsistent(env,i=ids){
 const cp=readCp(env,i);
 const files=remoteBatchFiles(env,i).map(f=>({file:f,raw:env.remoteFile(i.branch,f)}));
 assert.deepEqual(validateCheckpoint(cp,{ids:i}),[]);
 assert.deepEqual(verifyCheckpointContent(cp,files,i),[]);
 return cp;
}
/** No force push, no delete, nothing but research branches, ever. */
function assertCleanPushHistory(env){
 const zero="0".repeat(40);
 for(const u of env.pushAudit()){
  assert.match(u.ref,/^refs\/heads\/(?:research\/[a-z][a-z0-9]+-[A-Za-z0-9_-]+|main)$/,"only research branches (or the simulated Factory on main): "+u.ref);
  assert.notEqual(u.new,zero,"no branch deletion");
  if(u.old!==zero)assert.ok(env.isAncestor(u.old,u.new),"fast-forward only: "+u.ref+" "+u.old+" -> "+u.new);
 }
}

/* ------------------------------------------------------------------ happy path */

await scenario("Auto Push: 10 topics -> QA -> ONE commit with batch + checkpoint -> push -> verified SAVED, twice, without touching the working tree",async env=>{
 const w=env.clone();
 const first=env.cli(w,cmd("resume",ids));
 assert.equal(first.data.state,"FRESH");assert.equal(first.data.branch.action,"CREATE_FROM_MAIN");assert.equal(first.data.next.seq,1);
 const d1=env.draft(w,"b1",enTopics(0,10));
 const chk=env.cli(w,cmd("check",ids,"--draft",d1));
 assert.equal(chk.status,0,chk.stdout);
 assert.deepEqual(chk.data.decision,{action:"WRITE",code:"FULL_BATCH"});
 assert.deepEqual(chk.data.counts,{pass:10,fail:0,skipped:0});
 assert.deepEqual(chk.data.phase_summary,{duplicate:"PASS",intent:"PASS",source:"PASS",schema:"PASS"},"the four QA phases are reported");
 assert.equal(env.remoteTip(ids.branch),"","check is read-only: nothing pushed");
 assert.equal(git(w,["rev-parse","--verify","--quiet","refs/heads/"+ids.branch],{allow:true}),"","check created no local branch");

 const c1=expectSaved(env.cli(w,cmd("commit",ids,"--draft",d1,"--trailer","Co-Authored-By: Test Agent <agent@example.invalid>")));
 assert.equal(c1.summary.seq,1);assert.equal(c1.summary.topics,10);
 assert.equal(env.remoteTip(ids.branch),c1.sha,"GitHub tip is exactly the commit we report");
 assert.deepEqual(remoteBatchFiles(env),[batchFile(ids,1)]);
 const cp1=assertGithubConsistent(env);
 assert.equal(cp1.totals.researched,10);assert.equal(cp1.totals.qa_pass,10);assert.equal(cp1.totals.qa_fail,0);
 assert.equal(cp1.batches[0].sha256,sha256(env.remoteFile(ids.branch,batchFile(ids,1))),"checkpoint records the SHA-256 of the exact batch bytes");
 assert.equal(cp1.last_commit_sha,c1.parent,"checkpoint is bound to the parent commit it was written on");
 assert.equal(cp1.agent,"claude");assert.equal(cp1.session,"t1");assert.equal(cp1.branch,ids.branch);
 assert.ok(cp1.base_main_sha&&cp1.contract.agents_md_sha256);
 const batch=JSON.parse(env.remoteFile(ids.branch,batchFile(ids,1)));
 assert.equal(batch.purpose,"TOPIC_RESEARCH_BATCH");assert.deepEqual(batch.agent,{name:"claude",session:"research-claude-t1"});assert.equal(batch.candidates.length,10);
 const msg=git(env.origin,["log","-1","--format=%B",ids.branch]);
 assert.match(msg,/^research\(claude-t1\): batch 0001 - 10 topics, QA PASS/);
 assert.match(msg,/Batch SHA-256: [0-9a-f]{64}/);assert.match(msg,/Co-Authored-By: Test Agent/);
 assert.deepEqual(env.remoteChangedPaths(ids.branch).sort(),[batchFile(ids,1),ids.checkpointPath].sort(),"only the session's own batch and checkpoint changed");
 // The clone's checkout and files are untouched (plumbing only).
 assert.equal(git(w,["branch","--show-current"]),"main");
 assert.equal(git(w,["status","--porcelain"]).split("\n").filter(l=>l&&!l.includes("draft-")).length,0);

 const d2=env.draft(w,"b2",enTopics(10,10));
 const c2=expectSaved(env.cli(w,cmd("commit",ids,"--draft",d2)));
 assert.equal(c2.summary.seq,2);
 assert.ok(env.isAncestor(c1.sha,c2.sha),"history only grows");
 const cp2=assertGithubConsistent(env);
 assert.deepEqual(cp2.batches.map(b=>b.state),["PUSHED","COMMITTED"]);
 assert.equal(cp2.batches[0].commit_sha,c1.sha,"a settled batch records the commit that carries it");
 assert.equal(cp2.batches[1].commit_sha,null,"the newest batch is bound by its parent until the next commit settles it");
 assert.equal(cp2.totals.researched,20);assert.equal(cp2.totals.pushed,10);
 assert.equal(cp2.last_commit_sha,c2.parent);
 assert.equal(new Set(remoteBatchTopics(env)).size,20,"no duplicate topic across batches");
 const v=env.cli(w,cmd("verify",ids));
 assert.equal(v.status,0,v.stdout);assert.equal(v.data.ok,true);assert.equal(v.data.github_sha,c2.sha);
 assertCleanPushHistory(env);
 assert.equal(env.pushAudit().length,2);
 // Human output carries the SAVED line only after verification.
 const human=env.cli(w,cmd("verify",ids),{json:false});
 assert.match(human.stdout,/^VERIFIED research\/claude-t1/);
});

/* ------------------------------------------------------------------ QA FAIL is never pushed */

await scenario("QA FAIL is fixed first, never forced: nothing is pushed or written; the failures are explained per phase",async env=>{
 const w=env.clone();
 const bad=enTopic(9,{references:[enTopic(9).references[0]]});
 const d=env.draft(w,"bad",[...enTopics(0,9),bad]);
 const chk=env.cli(w,cmd("check",ids,"--draft",d));
 assert.equal(chk.status,1);
 assert.equal(chk.data.decision.code,"QA_FAIL_BLOCKS_BATCH");
 const failed=chk.data.results.filter(r=>r.verdict==="FAIL");
 assert.equal(failed.length,1);assert.equal(failed[0].phases.source,"FAIL");
 assert.equal(chk.data.phase_summary.source,"FAIL");assert.equal(chk.data.phase_summary.schema,"PASS");
 const c=env.cli(w,cmd("commit",ids,"--draft",d));
 assert.equal(c.status,1);
 assert.match(c.stderr,/NOT SAVED/);
 assert.equal(env.remoteTip(ids.branch),"");
 assert.equal(git(w,["rev-parse","--verify","--quiet","refs/heads/"+ids.branch],{allow:true}),"");
 assert.equal(env.pushAudit().length,0);
 // After the fix the same batch goes through.
 const fixed=env.draft(w,"fixed",enTopics(0,10));
 expectSaved(env.cli(w,cmd("commit",ids,"--draft",fixed)));
});

await scenario("--quarantine-failures pushes only the passing topics; failures stay in the checkpoint (never in a batch or the intake)",async env=>{
 const w=env.clone();
 const bad=enTopic(10,{references:[]});
 const d=env.draft(w,"mixed",[...enTopics(0,10),bad]);
 const c=expectSaved(env.cli(w,cmd("commit",ids,"--draft",d,"--quarantine-failures")));
 assert.equal(c.summary.topics,10);assert.equal(c.summary.qa_fail_recorded,1);
 const cp=assertGithubConsistent(env);
 assert.equal(cp.totals.qa_pass,10);assert.equal(cp.totals.qa_fail,1);assert.equal(cp.totals.qa_fail_open,1);
 const open=cp.unresolved.find(u=>u.kind==="QA_FAIL");
 assert.ok(open.candidate&&open.gates.some(g=>g.phase==="source"));
 assert.ok(!remoteBatchTopics(env).includes(open.key),"the failing topic is not in any batch");
 // All-fail draft: checkpoint-only commit, no batch file at all.
 const allBad=env.draft(w,"allbad",[enTopic(11,{references:[]}),enTopic(12,{search_intent:"transactional",primary_query:"book a scooter in hanoi now with deposit"})]);
 const q=expectSaved(env.cli(w,cmd("commit",ids,"--draft",allBad,"--quarantine-failures")));
 assert.equal(q.summary.kind,"CHECKPOINT_ONLY");
 assert.deepEqual(remoteBatchFiles(env),[batchFile(ids,1)]);
 const cp2=assertGithubConsistent(env);
 assert.equal(cp2.totals.qa_fail_open,3);assert.equal(cp2.totals.qa_fail,3);
 // The recovery plan tells the next session about them and the checkpoint can abandon a stuck one.
 const plan=env.cli(w,cmd("resume",ids));
 assert.equal(plan.data.unresolved.filter(u=>u.kind==="QA_FAIL").length,3);
 assert.ok(plan.data.actions.some(a=>/^FIX_UNRESOLVED: 3/.test(a)));
 const gone=expectSaved(env.cli(w,cmd("checkpoint",ids,"--abandon",open.id)));
 assert.equal(gone.summary.kind,"CHECKPOINT_ONLY");
 assert.equal(assertGithubConsistent(env).totals.qa_fail_open,2);
 assertCleanPushHistory(env);
});

await scenario("batch size rules: 9 topics are refused unless the session is ending; 11 are refused; the short final batch is never padded",async env=>{
 const w=env.clone();
 const nine=env.draft(w,"nine",enTopics(0,9));
 const r=env.cli(w,cmd("commit",ids,"--draft",nine));
 assert.equal(r.status,1);assert.equal(r.data.decision.code,"BATCH_INCOMPLETE");
 assert.equal(env.remoteTip(ids.branch),"");
 const eleven=env.draft(w,"eleven",enTopics(0,11));
 assert.equal(env.cli(w,cmd("commit",ids,"--draft",eleven)).data.decision.code,"BATCH_TOO_LARGE");
 const fin=expectSaved(env.cli(w,cmd("commit",ids,"--draft",nine,"--final")));
 assert.equal(fin.summary.topics,9);assert.equal(fin.summary.decision,"PARTIAL_FINAL");
 assert.equal(assertGithubConsistent(env).totals.researched,9);
 const dup=env.cli(w,cmd("commit",ids,"--draft",nine,"--final"));
 assert.equal(dup.status,0,"re-running the same draft is a no-op, not an error");
 assert.equal(dup.data.status,"NOOP");
 assert.equal(env.pushAudit().length,1);
});

/* ------------------------------------------------------------------ environment loss */

await scenario("environment lost: a brand-new machine recovers everything from GitHub alone and continues without re-researching",async env=>{
 const a=env.clone("machine-a");
 expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"b1",enTopics(0,10)))));
 expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"b2",enTopics(10,10)))));
 const tip=env.remoteTip(ids.branch);
 fs.rmSync(a,{recursive:true,force:true}); // the whole local environment is gone

 const b=env.clone("machine-b");
 const plan=env.cli(b,cmd("resume",ids));
 assert.equal(plan.status,0,plan.stderr);
 assert.equal(plan.data.state,"RESUME");assert.equal(plan.data.source_of_truth,"REMOTE_BRANCH");
 assert.equal(plan.data.branch.action,"CREATE_FROM_REMOTE");
 assert.equal(plan.data.checkpoint.trust,"VERIFIED");
 assert.equal(plan.data.derived.pushed,20);assert.equal(plan.data.do_not_research.count,20);
 assert.equal(plan.data.next.seq,3);
 assert.ok(enTopics(0,20).every(c=>plan.data.do_not_research.keys.includes(topicKey(c))));
 assert.equal(git(b,["rev-parse","--verify","--quiet","refs/heads/"+ids.branch],{allow:true}),"","a read-only resume changes nothing locally");
 const apply=env.cli(b,cmd("resume",ids,"--apply"));
 assert.equal(apply.status,0,apply.stderr);
 assert.ok(apply.data.applied.some(x=>/^CREATE_FROM_REMOTE/.test(x)));
 assert.equal(git(b,["rev-parse","refs/heads/"+ids.branch]),tip);

 // The next draft re-includes three topics already on GitHub: they are skipped, only new ones are written.
 const draft=env.draft(b,"b3",[...enTopics(0,3),...enTopics(20,4)]);
 const chk=env.cli(b,cmd("check",ids,"--draft",draft,"--final"));
 assert.deepEqual(chk.data.counts,{pass:4,fail:0,skipped:3});
 assert.equal(chk.data.results.filter(r=>r.verdict==="SKIP_ALREADY_ACCEPTED").length,3);
 const c3=expectSaved(env.cli(b,cmd("commit",ids,"--draft",draft,"--final")));
 assert.equal(c3.summary.seq,3);assert.equal(c3.summary.topics,4);assert.equal(c3.summary.skipped_already_accepted,3);
 assert.ok(env.isAncestor(tip,c3.sha));
 const cp=assertGithubConsistent(env);
 assert.equal(cp.totals.researched,24);
 assert.equal(new Set(remoteBatchTopics(env)).size,24,"nothing researched twice");
 assertCleanPushHistory(env);
});

await scenario("a plain `commit` on a fresh clone recovers the session by itself (no separate resume needed)",async env=>{
 const a=env.clone();
 expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"b1",enTopics(0,10)))));
 fs.rmSync(a,{recursive:true,force:true});
 const b=env.clone();
 const c=expectSaved(env.cli(b,cmd("commit",ids,"--draft",env.draft(b,"b2",enTopics(10,10)))));
 assert.equal(c.summary.seq,2);
 assert.ok(c.applied.some(x=>/CREATE_FROM_REMOTE/.test(x)));
 assert.equal(assertGithubConsistent(env).totals.researched,20);
});

await scenario("a missing, edited or lying checkpoint is never trusted: state comes from the batch files and the next commit repairs it",async env=>{
 const a=env.clone();
 const c1=expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"b1",enTopics(0,10)))));
 // Another machine edits the checkpoint on GitHub by hand (a lie), and later deletes it.
 const m=env.clone("manual");
 git(m,["fetch","-q","origin",ids.branch]);
 git(m,["switch","-q","-c",ids.branch,"FETCH_HEAD"]);
 const cpFile=path.join(m,ids.checkpointPath);
 const lying=JSON.parse(fs.readFileSync(cpFile,"utf8"));lying.totals.researched=999;lying.totals.pushed=999;
 fs.writeFileSync(cpFile,JSON.stringify(lying,null,2)+"\n");
 git(m,["commit","-q","-am","tamper with checkpoint"]);
 git(m,["push","-q","origin","HEAD:refs/heads/"+ids.branch]);
 const plan=env.cli(a,cmd("resume",ids));
 assert.equal(plan.data.checkpoint.trust,"CONTENT_ONLY");
 assert.ok(plan.data.warnings.some(w=>/CHECKPOINT_NOT_TRUSTED/.test(w)));
 assert.equal(plan.data.derived.pushed,10,"counted from the batch files, not from the lie");
 assert.equal(plan.data.next.seq,2);
 assert.equal(plan.data.do_not_research.count,10);
 assert.equal(env.cli(a,cmd("verify",ids)).status,1,"verify refuses an untrusted checkpoint");
 // The next batch rewrites the checkpoint from content.
 const c2=expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"b2",enTopics(10,10)))));
 assert.equal(c2.summary.checkpoint_rebuilt,true);
 const cp=assertGithubConsistent(env);
 assert.equal(cp.totals.researched,20);
 assert.equal(cp.batches[0].state,"PUSHED");assert.equal(cp.batches[0].commit_sha,c1.sha,"the rebuilt checkpoint re-learns the commit of each pushed batch from GitHub history");
 assert.equal(env.cli(a,cmd("verify",ids)).status,0);
 // Deleting the checkpoint is survivable too.
 git(m,["fetch","-q","origin",ids.branch]);
 git(m,["reset","-q","--hard","FETCH_HEAD"]);
 git(m,["rm","-q",ids.checkpointPath]);
 git(m,["commit","-q","-m","delete checkpoint"]);
 git(m,["push","-q","origin","HEAD:refs/heads/"+ids.branch]);
 const none=env.cli(a,cmd("resume",ids));
 assert.equal(none.data.checkpoint.trust,"NONE");assert.equal(none.data.derived.pushed,20);assert.equal(none.data.next.seq,3);
 const cp2=expectSaved(env.cli(a,cmd("checkpoint",ids,"--note","checkpoint restored from GitHub content")));
 assert.ok(cp2.summary.rebuilt);
 assert.equal(assertGithubConsistent(env).totals.researched,20);
 assert.ok(env.isAncestor(c1.sha,env.remoteTip(ids.branch)));
 assertCleanPushHistory(env);
});

/* ------------------------------------------------------------------ crash and outage */

await scenario("crash after the commit but before the push: the next run QA-checks and pushes it first; nothing is lost or duplicated",async env=>{
 const w=env.clone();
 const local=env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)),"--no-push"));
 assert.equal(local.data.status,"COMMITTED_LOCAL");
 assert.equal(env.remoteTip(ids.branch),"","not on GitHub yet, and it says so");
 const plan=env.cli(w,cmd("resume",ids));
 assert.equal(plan.data.branch.action,"PUSH_PENDING");
 assert.equal(plan.data.local_only_batches.length,1);
 assert.equal(plan.data.derived.pending_push,10);
 assert.equal(plan.data.do_not_research.count,10,"unpushed topics are protected from duplicate research too");
 assert.equal(env.cli(w,cmd("verify",ids)).status,1,"verify must not claim a session is saved while commits are local only");
 // Continue with the NEXT batch without pushing explicitly: pending work goes first.
 const c2=expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b2",enTopics(10,10)))));
 assert.ok(c2.applied.some(x=>/PUSHED_PENDING/.test(x)));
 assert.deepEqual(remoteBatchFiles(env),[batchFile(ids,1),batchFile(ids,2)]);
 assertGithubConsistent(env);
 assert.equal(env.cli(w,cmd("verify",ids)).status,0);
 assertCleanPushHistory(env);
});

await scenario("push-pending pushes a local-only commit and verifies it on GitHub",async env=>{
 const w=env.clone();
 env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)),"--no-push"));
 const r=env.cli(w,cmd("push-pending",ids));
 assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(r.data.ok,true);
 assert.ok(r.data.applied.some(x=>/PUSHED_PENDING 1 batch/.test(x)));
 assertGithubConsistent(env);
 const again=env.cli(w,cmd("push-pending",ids));
 assert.equal(again.status,0);assert.deepEqual(again.data.applied,[],"nothing to do the second time");
});

await scenario("flaky network: transient push failures are retried; an outage is reported as NOT SAVED and recovered later",async env=>{
 const w=env.clone();
 env.failNextPushes(2); // two 502s, then success
 const ok=expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)))));
 assert.equal(env.remoteTip(ids.branch),ok.sha);
 // A longer outage exhausts the retries: the commit stays local and the tool refuses to say SAVED.
 env.failNextPushes(50);
 const d2=env.draft(w,"b2",enTopics(10,10));
 const down=env.cli(w,cmd("commit",ids,"--draft",d2));
 assert.equal(down.status,1);
 assert.notEqual(down.data.status,"SAVED");
 assert.equal(down.data.status,"NOT_SAVED");
 assert.match(down.data.message,/kept locally; run push-pending/);
 assert.equal(env.remoteTip(ids.branch),ok.sha,"GitHub still has only the first batch");
 const plan=env.cli(w,cmd("resume",ids));
 assert.equal(plan.data.branch.action,"PUSH_PENDING");
 // The outage ends.
 env.failNextPushes(0);
 const pp=env.cli(w,cmd("push-pending",ids));
 assert.equal(pp.status,0,pp.stdout+pp.stderr);
 assert.deepEqual(remoteBatchFiles(env),[batchFile(ids,1),batchFile(ids,2)]);
 assertGithubConsistent(env);
 assertCleanPushHistory(env);
});

await scenario("an unreachable remote stops before anything is written; nothing is reported saved",async env=>{
 const w=env.clone();
 env.breakRemote(w);
 const r=env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10))));
 assert.equal(r.status,1);
 assert.match(r.stderr,/FETCH_FAILED/);
 assert.doesNotMatch(r.stdout,/"status": "SAVED"/);
 assert.equal(git(w,["rev-parse","--verify","--quiet","refs/heads/"+ids.branch],{allow:true}),"");
 env.fixRemote(w);
 expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)))));
 // Read-only commands still work offline from the last fetch.
 env.breakRemote(w);
 const off=env.cli(w,cmd("resume",ids,"--offline"));
 assert.equal(off.status,0,off.stderr);assert.equal(off.data.derived.pushed,10);
});

/* ------------------------------------------------------------------ divergence and conflicts */

await scenario("two machines on one session: the diverged branch is reconciled by content replay (renumbered, deduplicated, nothing pushed is touched)",async env=>{
 const a=env.clone("machine-a"),b=env.clone("machine-b");
 // B commits first but is cut off before pushing; its batch overlaps A's by five topics.
 const bd=env.draft(b,"b",enTopics(5,10));
 assert.equal(env.cli(b,cmd("commit",ids,"--draft",bd,"--no-push")).data.status,"COMMITTED_LOCAL");
 // Meanwhile A pushes batch 1.
 const ca=expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"a",enTopics(0,10)))));
 const aRaw=env.remoteFile(ids.branch,batchFile(ids,1));
 // B resumes: both machines wrote batch 0001 with different content.
 const plan=env.cli(b,cmd("resume",ids));
 assert.equal(plan.data.branch.action,"REPLAY_UNPUSHED");
 assert.equal(plan.data.branch.relation,"DIVERGED");
 const pp=env.cli(b,cmd("push-pending",ids));
 assert.equal(pp.status,0,pp.stdout+pp.stderr);
 assert.ok(pp.data.applied.some(x=>/REPLAY_UNPUSHED/.test(x)));
 assert.ok(pp.data.applied.some(x=>/REPLAY .*5 pass, 0 fail, 5 already accepted/.test(x)),pp.data.applied.join("\n"));
 assert.ok(env.isAncestor(ca.sha,env.remoteTip(ids.branch)),"A's pushed history is kept");
 assert.equal(env.remoteFile(ids.branch,batchFile(ids,1)),aRaw,"A's batch is byte-identical");
 const second=JSON.parse(env.remoteFile(ids.branch,batchFile(ids,2)));
 assert.equal(second.candidates.length,5,"only the 5 missing topics were replayed");
 assert.equal(new Set(remoteBatchTopics(env)).size,15);
 const cp=assertGithubConsistent(env);
 assert.equal(cp.totals.researched,15);
 assert.ok(git(b,["for-each-ref","refs/backup/"]).includes("refs/backup/"+ids.branch),"B's old local branch is kept as a backup ref");
 assert.equal(env.cli(b,cmd("verify",ids)).status,0);
 assertCleanPushHistory(env);
});

await scenario("a replayed topic that now fails QA is quarantined in the checkpoint, never lost and never pushed as a batch topic",async env=>{
 const a=env.clone("machine-a"),b=env.clone("machine-b");
 const clash=enTopic(3,{slug:"sirius-versus-future-beginner-guide",primary_query:"yamaha sirius vs honda future for beginners"}); // near-duplicate of A's topic 3
 const bd=env.draft(b,"b",[...enTopics(10,9),clash]);
 env.cli(b,cmd("commit",ids,"--draft",bd,"--no-push"));
 expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"a",enTopics(0,10)))));
 const pp=env.cli(b,cmd("push-pending",ids));
 assert.equal(pp.status,0,pp.stdout+pp.stderr);
 const cp=assertGithubConsistent(env);
 assert.equal(cp.totals.qa_pass,19);
 assert.equal(cp.totals.qa_fail_open,1);
 const open=cp.unresolved.find(u=>u.kind==="QA_FAIL");
 assert.equal(open.candidate.slug,"sirius-versus-future-beginner-guide");
 assert.ok(open.gates.some(g=>g.phase==="duplicate"));
 assert.equal(new Set(remoteBatchTopics(env)).size,19);
 assertCleanPushHistory(env);
});

await scenario("a stale local branch fast-forwards to GitHub before new work is written",async env=>{
 const a=env.clone("machine-a"),b=env.clone("machine-b");
 expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"a1",enTopics(0,10)))));
 env.cli(b,cmd("resume",ids,"--apply"));
 expectSaved(env.cli(a,cmd("commit",ids,"--draft",env.draft(a,"a2",enTopics(10,10)))));
 // B's local branch is one batch behind GitHub; its next batch is written on top of GitHub's tip.
 const c=expectSaved(env.cli(b,cmd("commit",ids,"--draft",env.draft(b,"b3",enTopics(20,4)),"--final")));
 assert.equal(c.summary.seq,3);
 assert.ok(c.applied.some(x=>/FAST_FORWARD/.test(x)));
 assert.equal(assertGithubConsistent(env).totals.researched,24);
 assertCleanPushHistory(env);
});

await scenario("a REAL push race (another machine lands a batch while ours is being pushed): rejected without force, reconciled by content, saved exactly once",async env=>{
 const a=env.clone("machine-a"),b=env.clone("machine-b");
 const da=env.draft(a,"a1",enTopics(0,10));
 const db=env.draft(b,"b1",enTopics(10,10));
 // The moment B's push reaches GitHub, machine A pushes its own batch 0001 first.
 env.interleaveOnNextPush("cd "+a+" && node scripts/topic-research.mjs commit --agent claude --session t1 --draft "+da+" --json");
 const r=env.cli(b,cmd("commit",ids,"--draft",db));
 assert.match(env.interleaveOutput(),/"status": "SAVED"/,"machine A really pushed during B's push: "+env.interleaveOutput());
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.ok(r.data.applied.some(x=>/PUSH_REJECTED/.test(x)),r.data.applied.join("\n"));
 assert.ok(r.data.applied.some(x=>/REPLAY_UNPUSHED/.test(x)));
 assert.equal(r.data.status,"NOOP");assert.match(r.data.message,/already on GitHub/);
 assert.deepEqual(remoteBatchFiles(env),[batchFile(ids,1),batchFile(ids,2)]);
 assert.equal(JSON.parse(env.remoteFile(ids.branch,batchFile(ids,1))).candidates[0].slug,enTopic(0).slug,"A's batch 0001 is untouched");
 assert.equal(JSON.parse(env.remoteFile(ids.branch,batchFile(ids,2))).candidates[0].slug,enTopic(10).slug,"B's batch was replayed as 0002");
 assert.equal(new Set(remoteBatchTopics(env)).size,20);
 assertGithubConsistent(env);
 assert.equal(env.cli(b,cmd("verify",ids)).status,0);
 assertCleanPushHistory(env);
});

/* ------------------------------------------------------------------ cross-session duplicates */

await scenario("topics in flight on another session's branch block duplicates before they are ingested",async env=>{
 const w1=env.clone(),w2=env.clone();
 expectSaved(env.cli(w1,cmd("commit",ids,"--draft",env.draft(w1,"s1",enTopics(0,10)))));
 const d=env.draft(w2,"s2",enTopics(5,10));
 const chk=env.cli(w2,cmd("check",id2,"--draft",d));
 assert.equal(chk.status,1);
 assert.equal(chk.data.counts.fail,5);
 const dup=chk.data.results.filter(r=>r.verdict==="FAIL");
 assert.ok(dup.every(r=>r.phases.duplicate==="FAIL"&&r.issues.some(i=>i.gate==="X_DUP_CROSS_SESSION")));
 assert.equal(chk.data.context.in_flight_branches,1);
 const c=env.cli(w2,cmd("commit",id2,"--draft",d,"--final","--quarantine-failures"));
 assert.equal(c.status,0,c.stdout+c.stderr);assert.equal(c.data.status,"SAVED");
 assert.equal(c.data.summary.topics,5);
 const both=[...remoteBatchTopics(env,ids),...remoteBatchTopics(env,id2)];
 assert.equal(new Set(both).size,both.length,"no topic exists on two research branches");
 assertGithubConsistent(env,id2);
 const hints=env.cli(w2,["hints","--taken","en",...A(id2)]);
 assert.equal(hints.status,0,hints.stderr);
 assert.equal(hints.data.taken.in_flight_other_sessions.length,10);
 assert.equal(hints.data.locales.en.in_flight_other_sessions,10);
 const sessions=env.cli(w2,["sessions"]);
 assert.deepEqual(sessions.data.sessions.map(s=>s.branch).sort(),[ids.branch,id2.branch].sort());
 assertCleanPushHistory(env);
});

/* ------------------------------------------------------------------ the real intake accepts what was pushed */

await scenario("rehearsal against the REAL Topic Factory ingest: pushed batches are accepted, the checkpoint is never ingested, and recovery sees the TA IDs",async env=>{
 const w=env.clone();
 const c1=expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)))));
 const c2=expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b2",enTopics(10,10)))));
 // The Factory's job, run for real on a clone of main (trusted-workflow env), then committed to main like the workflow does.
 const f=env.clone("factory");
 const run=spawnSync(process.execPath,["scripts/topic-factory.mjs","ingest","--branch",ids.branch,"--sha",c2.sha],{cwd:f,encoding:"utf8",
  env:gitEnv({GITHUB_ACTIONS:"true",GITHUB_WORKFLOW:"Global Topic Factory"})});
 assert.equal(run.status,0,run.stdout+run.stderr);
 assert.match(run.stdout,/INGESTED factory\/topic-research\/batches\/claude-t1-0001\.json added=10 rejected=0/);
 assert.match(run.stdout,/INGESTED factory\/topic-research\/batches\/claude-t1-0002\.json added=10 rejected=0/);
 const log=JSON.parse(fs.readFileSync(path.join(f,"data/seo/topic-factory/research-log.json"),"utf8"));
 assert.equal(log.batches.length,2);
 assert.ok(log.batches.every(b=>b.file.startsWith("factory/topic-research/batches/")),"only batch files reach the intake; the checkpoint never does");
 assert.deepEqual(log.batches.map(b=>b.sha256),[sha256(env.remoteFile(ids.branch,batchFile(ids,1))),sha256(env.remoteFile(ids.branch,batchFile(ids,2)))]);
 git(f,["add","-A","data/seo"]);git(f,["commit","-q","-m","factory(global): research intake"]);git(f,["push","-q","origin","HEAD:main"]);
 // The Matrix, claims and URLs were not touched by the intake of research-only/proposed topics.
 assert.equal(git(f,["diff","--name-only","HEAD~1","--","data/seo/master-matrix.json","factory/external-writers"]),"");

 const plan=env.cli(w,cmd("resume",ids));
 assert.deepEqual(plan.data.batches.map(b=>b.ingest),["ACCEPTED","ACCEPTED"]);
 assert.equal(plan.data.derived.ingested_by_main,20);
 assert.ok(!plan.data.warnings.some(x=>/INGEST_PENDING|NO_RESEARCH_LOG/.test(x)));
 assert.ok(plan.data.batches.every(b=>b.ta_ids.length===10&&b.ta_ids.every(t=>/^TA-EN-\d{4}$/.test(t))));
 // Own topics are skipped (not duplicates of themselves); other duplicates of ingested topics fail against main's map.
 const chk=env.cli(w,cmd("check",ids,"--draft",env.draft(w,"again",[...enTopics(0,2),enTopic(2,{slug:"another-clutch-article"}),...enTopics(20,4)]),"--final"));
 assert.equal(chk.data.counts.skipped,3,"same-session topics are recognised as already accepted");
 const other=env.cli(w,cmd("check",id2,"--draft",env.draft(w,"other",enTopics(0,3))));
 assert.equal(other.data.counts.fail,3,"another session cannot re-research what main ingested");
 // The Topic Factory IDs land in the checkpoint with the next write.
 const synced=expectSaved(env.cli(w,cmd("checkpoint",ids,"--sync-ids")));
 assert.equal(synced.summary.ta_ids_resolved,20);
 const cp=assertGithubConsistent(env);
 assert.ok(cp.batches.every(b=>b.topics.every(t=>/^TA-EN-\d{4}$/.test(t.ta_id))));
 assert.equal(env.cli(w,cmd("checkpoint",ids,"--sync-ids")).data.status,"NOOP","nothing left to resolve");
 // Next batch after ingest: counters keep adding up.
 const c3=expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b3",enTopics(20,4)),"--final")));
 assert.equal(c3.summary.seq,3);
 assert.equal(assertGithubConsistent(env).totals.researched,24);
 assertCleanPushHistory(env);
});

/* ------------------------------------------------------------------ safety rails */

await scenario("the working tree never matters: dirty clones, stray files and shallow clones all work; a checked-out session branch is refused",async env=>{
 const w=env.clone(null,{shallow:true});
 assert.equal(git(w,["rev-parse","--is-shallow-repository"]),"true","the agent's clone starts shallow");
 // Garbage where the batch would go, plus unrelated local edits: the commit is built from blobs, not from the tree.
 fs.mkdirSync(path.join(w,"factory/topic-research/batches"),{recursive:true});
 fs.writeFileSync(path.join(w,batchFile(ids,1)),"{ half written by a crashed process");
 fs.writeFileSync(path.join(w,"README.md"),"local edit\n");
 const c=expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)))));
 assert.equal(JSON.parse(env.remoteFile(ids.branch,batchFile(ids,1))).candidates.length,10);
 assert.equal(fs.readFileSync(path.join(w,"README.md"),"utf8"),"local edit\n");
 assert.equal(fs.readFileSync(path.join(w,batchFile(ids,1)),"utf8"),"{ half written by a crashed process");
 assertGithubConsistent(env);
 expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b2",enTopics(10,10)))));
 // Checking the session branch out would let plumbing move a checked-out ref: refuse with a clear message.
 git(w,["stash","-u","-q"],{allow:true});
 git(w,["switch","-q",ids.branch],{allow:true});
 const refused=env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b3",enTopics(20,4)),"--final"));
 assert.equal(refused.status,1);assert.match(refused.stderr,/BRANCH_CHECKED_OUT/);
 assert.equal(c.ok,true);
});

await scenario("the session lock serialises commands; a stale lock from a dead process is cleared",async env=>{
 const w=env.clone();
 const lock=path.join(w,".git","topic-research.lock");
 fs.writeFileSync(lock,JSON.stringify({pid:process.pid,at:Date.now()}));
 const d=env.draft(w,"b1",enTopics(0,10));
 const locked=env.cli(w,cmd("commit",ids,"--draft",d));
 assert.equal(locked.status,1);assert.match(locked.stderr,/LOCKED/);
 assert.equal(env.remoteTip(ids.branch),"");
 fs.writeFileSync(lock,JSON.stringify({pid:2147483000,at:Date.now()}));
 expectSaved(env.cli(w,cmd("commit",ids,"--draft",d)));
 assert.ok(!fs.existsSync(lock),"the lock is released");
});

await scenario("a session can only write its own files: foreign agent drafts and odd names are refused",async env=>{
 const w=env.clone();
 const foreign=env.draft(w,"foreign",{...batchOf(id2,enTopics(0,10))});
 const r=env.cli(w,cmd("commit",ids,"--draft",foreign));
 assert.equal(r.status,1);assert.match(r.stderr,/DRAFT_AGENT_MISMATCH/);
 assert.equal(env.cli(w,["commit","--agent","Claude","--session","t1","--draft",foreign]).status,1);
 assert.equal(env.cli(w,["commit","--agent","claude","--session","t1","--draft",foreign,"--force"]).status,1,"there is no --force");
 assert.match(env.cli(w,["commit","--agent","claude","--session","t1","--draft",foreign,"--trailer","not a trailer"]).stderr,/USAGE/);
 assert.equal(env.pushAudit().length,0);
});

/* ------------------------------------------------------------------ CI tree verification */

await scenario("verify-tree (CI): a research branch must carry a consistent checkpoint, only its own files, and nothing outside the allowlist",async env=>{
 const w=env.clone();
 expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b1",enTopics(0,10)))));
 expectSaved(env.cli(w,cmd("commit",ids,"--draft",env.draft(w,"b2",enTopics(10,10)))));
 git(w,["switch","-q",ids.branch]);
 const vt=(...x)=>env.cli(w,["verify-tree","--branch",ids.branch,"--base","origin/main",...x]);
 const ok=vt();
 assert.equal(ok.status,0,ok.stdout+ok.stderr);assert.equal(ok.data.managed,true);assert.deepEqual(ok.data.issues,[]);
 // Non-managed branches (feature branches, legacy research names) are skipped.
 assert.equal(env.cli(w,["verify-tree","--branch","feature/anything"]).data.managed,false);
 assert.equal(env.cli(w,["verify-tree","--branch","research/legacy"]).status,0);
 const codes=r=>r.data.issues.map(i=>i.code);
 // 1. batch bytes changed after the checkpoint was written
 const b1=path.join(w,batchFile(ids,1));
 const keep=fs.readFileSync(b1,"utf8");
 fs.writeFileSync(b1,keep+" ");
 assert.ok(codes(vt()).includes("CONTENT_DIGEST"));
 fs.writeFileSync(b1,keep);
 // 2. a batch without any checkpoint
 const cpPath=path.join(w,ids.checkpointPath),cpKeep=fs.readFileSync(cpPath,"utf8");
 fs.rmSync(cpPath);
 assert.ok(codes(vt()).includes("TREE_CHECKPOINT_MISSING"));
 fs.writeFileSync(cpPath,cpKeep);
 // 3. a batch the checkpoint does not know (checkpoint and batch must travel in one commit)
 const extra=path.join(w,batchFile(ids,3));
 fs.writeFileSync(extra,canonicalOf(batchOf(ids,enTopics(20,2))));
 assert.ok(codes(vt()).includes("CONTENT_UNRECORDED"));
 fs.rmSync(extra);
 // 4. another session's files on this branch
 fs.writeFileSync(path.join(w,batchFile(id2,1)),keep);
 fs.writeFileSync(path.join(w,id2.checkpointPath),cpKeep);
 const foreign=codes(vt());
 assert.ok(foreign.includes("TREE_FOREIGN_BATCH")&&foreign.includes("TREE_FOREIGN_CHECKPOINT"));
 fs.rmSync(path.join(w,batchFile(id2,1)));fs.rmSync(path.join(w,id2.checkpointPath));
 assert.equal(vt().status,0);
 // 5. a committed change outside the allowlist (Matrix, claims, workflow, pages) is refused; legacy-named batches only warn
 fs.writeFileSync(path.join(w,"data/seo/master-matrix.json"),"{}");
 fs.writeFileSync(path.join(w,"factory/topic-research/batches/legacy-notes.json"),"{}");
 git(w,["add","data/seo/master-matrix.json","factory/topic-research/batches/legacy-notes.json"]);git(w,["commit","-q","-m","out of bounds"]);
 const out=vt();
 assert.equal(out.status,1);
 assert.deepEqual(out.data.issues.filter(i=>i.code==="TREE_PATH_NOT_ALLOWED").map(i=>i.message.split(" ")[0]),["data/seo/master-matrix.json"]);
 assert.ok(out.data.warnings.some(x=>/legacy-notes\.json is a legacy-named batch/.test(x)));
});
function canonicalOf(v){return JSON.stringify(v,null,2)+"\n";}

/* ------------------------------------------------------------------ no AI, no new secrets */

test("the research tooling calls no model, no API and uses no secret",()=>{
 for(const f of ["scripts/topic-research.mjs","scripts/topic-research-core.mjs"]){
  const src=fs.readFileSync(path.join(root,f),"utf8");
  assert.doesNotMatch(src,/\bfetch\s*\(|node:https?|XMLHttpRequest|process\.env\.[A-Z_]*(?:KEY|TOKEN|SECRET)/,f);
 }
 const src=fs.readFileSync(path.join(root,"scripts/topic-research.mjs"),"utf8");
 assert.doesNotMatch(src,/--force|push.*-f\b|\+refs\/heads\/research/,"no force push anywhere in the CLI");
 assert.ok([...src.matchAll(/process\.env\.([A-Z_]+)/g)].every(m=>["TOPIC_RESEARCH_NOW","TOPIC_RESEARCH_REMOTE","TOPIC_RESEARCH_RETRY_MS","GITHUB_HEAD_REF","GITHUB_REF_NAME"].includes(m[1])),"only documented env hooks");
 assert.ok(NOW.startsWith("2026-"));
});
