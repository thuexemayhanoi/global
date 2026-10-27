#!/usr/bin/env node
/**
 * Global Auto Publisher (owner standing policy 2026-10-15).
 *   scan [--json]                         eligibility of every SUBMITTED draft (read-only)
 *   drain-decision                        should workflow dispatch the next pair? (read-only)
 *   publish --max 2 --apply [--ids A,B]   stage ≤2 APPROVED_BY_POLICY drafts as NEW URLs and run every
 *                                         build/SEO/fact gate (trusted workflow on main, or --local rehearsal)
 *   live-qa --ids A,B [--timeout-seconds N] [--record] [--recovery] [--out file]
 *                                         poll production; verdict PASS | FAIL | INCONCLUSIVE
 *   record-failure --ids A,B --reason "…" pause publication after a failed gate/deploy (trusted)
 *   pause|resume --reason "…" --confirmed true                operator control (trusted)
 *   validate-reviews [--dir path]          schema/hash check of independent editorial reviews
 *   ingest-reviews --branch review/x --sha <40>  copy valid reviews from a green review branch (trusted)
 * Never deletes, renames or redirects URLs; never edits NAP, prices or protected/published pages.
 */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {articlePath,STANDING_POLICY_PATH} from "./articles.mjs";
import {eligibility,validateReview,shingles,publicationRecord,REVIEW_FILE,drainDecision,publishGate,selectForPublication,recordLiveQA,applyControl,requireHubSupport} from "./auto-publisher-core.mjs";
import {readLocalSitemapInventory,SITEMAP_ORIGIN} from "./sitemaps.mjs";
import {runLiveQA} from "./publisher-live-qa.mjs";
import {legacyPilotOriginal,normalizeLegacyPilot} from "./legacy-pilot-core.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW="Global Auto Publisher";
const STATE="factory/publisher/state.json",REVIEWS="factory/editorial-reviews";
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const optional=(p,f)=>fs.existsSync(path.join(ROOT,p))?read(p):f;
const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+"\n");};
const git=(...a)=>execFileSync("git",a,{cwd:ROOT,encoding:"utf8",maxBuffer:32*1024*1024,timeout:60000});
const gitOk=(...a)=>spawnSync("git",a,{cwd:ROOT,encoding:"utf8"}).status===0;
const sha256=s=>createHash("sha256").update(s).digest("hex");
const emptyState=()=>({version:1,stage:"PILOT",paused:false,pause_reason:null,clean_runs:0,published:[],runs:[],last_successful_deployment:null,queue:{}});
function opts(argv){const o={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith("--"))throw Error("Unexpected "+a);o[a.slice(2)]=argv[i+1]&&!argv[i+1].startsWith("--")?argv[++i]:true;}return o;}
function trusted(){
 if(process.env.GITHUB_ACTIONS!=="true"||process.env.GITHUB_WORKFLOW!==WORKFLOW)return false;
 if(git("branch","--show-current").trim()!=="main")throw Error("PUBLISHER_REFUSED: main checkout required");
 return true;
}
function rehearsal(){
 const b=git("branch","--show-current").trim();
 if(!b||["main","master"].includes(b))throw Error("PUBLISHER_REFUSED: --local rehearsal needs a non-main branch");
 if(git("status","--porcelain").trim())throw Error("PUBLISHER_REFUSED: --local rehearsal needs a clean tree");
}
const run=(script,...a)=>{const r=spawnSync(process.execPath,[script,...a],{cwd:ROOT,encoding:"utf8",maxBuffer:64*1024*1024,timeout:600000});if(r.status!==0)throw Error(script+" "+a.join(" ")+" failed: "+(r.stderr||r.stdout).slice(-4000));return r.stdout;};

function context(){
 const matrix=read("data/seo/master-matrix.json"),locales=read("content/locales.json"),ledger=read("factory/external-writers/claims.json");
 const registry=read("factory/external-writers/protected-drafts.json"),policy=read("data/seo/topic-factory/policy.json"),standing=read(STANDING_POLICY_PATH);
 if(standing.publication?.authorized!==true)throw Error("Standing policy does not authorize publication");
 const protectedIds=new Set([...registry.protected.map(p=>p.id),...(registry.held_ids||[]).map(p=>p.id)]);
 return {matrix,locales,ledger,registry,policy,standing,protectedIds,state:optional(STATE,emptyState())};
}
/** Exact SUBMITTED bytes from the Writer branch commit recorded in the ledger. */
function loadDraft(claim,fetched){
 if(!claim.source_commit||!claim.source_sha256)return {error:"No immutable evidence in ledger"};
 if(!gitOk("cat-file","-e",claim.source_commit+"^{commit}")){
  const sourceBranch=claim.source_branch||claim.branch;
 if(!fetched.has(sourceBranch)){fetched.add(sourceBranch);gitOk("fetch","--no-tags","-q","origin","refs/heads/"+sourceBranch+":refs/remotes/origin/"+sourceBranch);}
  if(!gitOk("cat-file","-e",claim.source_commit+"^{commit}"))gitOk("fetch","--no-tags","-q","origin",claim.source_commit);
 }
 const file=claim.source_path||"factory/external-writers/inbox/"+claim.writer+"/"+claim.id+".json";
 let raw;try{raw=git("show",claim.source_commit+":"+file);}catch{return {error:"Draft not reachable at "+claim.source_commit.slice(0,12)};}
 if(sha256(raw)!==claim.source_sha256)return {error:"SHA-256 mismatch with ledger"};
 try{
  const packet=JSON.parse(raw);
  // PR6's old facts_reviewed_by_human=true flag was an editorial placeholder,
  // NOT evidence of review. Only after validating exact original SHA do we
  // normalize review flags to false; manuscript/URL/sources remain untouched.
  return {packet:legacyPilotOriginal(claim)?normalizeLegacyPilot(packet,claim):packet,raw};
 }catch{return {error:"Malformed or unauthorized pilot JSON"};}
}
function evaluate(c){
 const fetched=new Set(),drafts=[];
 for(const claim of c.ledger.claims.filter(x=>x.status==="SUBMITTED")){
  const row=c.matrix.rows.find(r=>r.id===claim.id);
  if(row?.status==="PUBLISHED")continue;
  const d=loadDraft(claim,fetched);
  drafts.push({claim,row,...d});
 }
 const corpus=[];
 for(const d of drafts)if(d.packet)corpus.push({id:d.claim.id,locale:d.packet.locale,kind:"draft",shingles:shingles(d.packet.body_markdown,d.packet.locale)});
 const dir=path.join(ROOT,"content/articles");
 if(fs.existsSync(dir))for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".json"))){const p=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));corpus.push({id:p.matrix_id,locale:p.locale,kind:"published",shingles:shingles(p.body_markdown,p.locale)});}
 const results=[];
 for(const d of drafts){
  if(d.error){results.push({id:d.claim.id,decision:"BLOCKED",failed:["SOURCE"],gates:[{gate:"SOURCE",passed:false,detail:d.error}],_claim:d.claim});continue;}
  // Writer QA and publisher gates are authoritative; no independent AI reviewer dependency.
  // One malformed draft must never stop the evaluation (and publication) of the others.
  let r;
  try{
   r=eligibility({packet:d.packet,claim:d.claim,row:d.row,matrix:c.matrix,locales:c.locales,policy:c.policy,standing:c.standing,
    protectedIds:c.protectedIds,corpus,state:c.state});
  }catch(e){
   results.push({id:d.claim.id,decision:"BLOCKED",failed:["EVALUATION_ERROR"],gates:[{gate:"EVALUATION_ERROR",passed:false,detail:String(e.message).slice(0,240)}],_claim:d.claim});
   continue;
  }
  r.review_sha256=null;
  r.priority=d.row?.priority??99;
  results.push({...r,_packet:d.packet,_claim:d.claim});
 }
 return requireHubSupport(results,c.matrix,c.policy?.refill?.hub_min_supporting);
}
const summary=rs=>{const by={};for(const r of rs)by[r.decision]=(by[r.decision]||0)+1;return by;};
const strip=r=>{const {_packet,_claim,...rest}=r;return rest;};

function cmdScan(o){
 const c=context(),rs=evaluate(c);
 const out={mode:"READ_ONLY",stage:c.state.stage,paused:c.state.paused,counts:summary(rs),
  eligible:rs.filter(r=>r.decision==="APPROVED_BY_POLICY").map(r=>r.id),
  items:o.json?rs.map(strip):rs.map(r=>({id:r.id,decision:r.decision,failed:r.failed}))};
 console.log(JSON.stringify(out,null,2));
}
/** After a confirmed live deploy, decide whether a new publish run should start.
 * Re-evaluates the fresh Matrix/ledger/state rather than trusting stale counts.
 */
function cmdDrainDecision(){
 const c=context(),rs=evaluate(c);
 const ready=selectForPublication(rs,{state:c.state,standing:c.standing,max:2}).map(r=>r.id);
 console.log(JSON.stringify({mode:"READ_ONLY",stage:c.state.stage,...drainDecision({state:c.state,eligible:ready}),counts:summary(rs)},null,2));
}
function cmdPublish(o){
 const max=Math.min(Number(o.max||2),2);
 if(!Number.isInteger(max)||max<1)throw Error("--max must be 1 or 2");
 const apply=o.apply===true,isTrusted=apply&&trusted();
 if(apply&&!isTrusted){if(o.local!==true)throw Error("PUBLISHER_REFUSED: publish --apply runs only in the Global Auto Publisher workflow (or --local rehearsal)");rehearsal();}
 const c=context();
 // Always refresh trusted repair tickets, EVEN WHEN publication is paused.
 // Each ticket is bound to the real immutable Writer source SHA and session.
 const rs=evaluate(c),gate=publishGate(c.state);
 const chosen=gate.allowed?selectForPublication(rs,{state:c.state,standing:c.standing,max,only:o.ids?String(o.ids).split(","):null}):[];
 const now=new Date().toISOString();
 c.state.queue=summary(rs);
 if(apply)write("factory/publisher/report.json",{version:2,ledger_revision:c.ledger.revision,stage:c.state.stage,counts:summary(rs),
  items:rs.map(r=>({id:r.id,decision:r.decision,failed:r.failed,
   writer:r._claim?.writer||null,session:r._claim?.session||null,branch:r._claim?.branch||null,
   source_sha256:r._claim?.source_sha256||null,source_commit:r._claim?.source_commit||null,
   details:(r.gates||[]).filter(g=>!g.passed).map(g=>g.gate+": "+String(g.detail).slice(0,240))}))});
 if(gate.reason==="LIVE_QA_RECOVERY"){
  // An earlier publication has no recorded live result (crashed run, lost state push,
  // or an inconclusive check): verify it before anything new is staged.
  if(apply)write(STATE,c.state);
  console.log(JSON.stringify({mode:"LIVE_QA_RECOVERY",recover:gate.recover,paused:c.state.paused,counts:summary(rs),repair_report_refreshed:apply,published:[]}));
  return;
 }
 if(c.state.paused){
  if(apply)write(STATE,c.state);
  console.log(JSON.stringify({mode:"PAUSED",reason:c.state.pause_reason,counts:summary(rs),repair_report_refreshed:apply,published:[]}));
  return;
 }
 if(!apply||!chosen.length){
  if(apply)write(STATE,c.state);
  console.log(JSON.stringify({mode:apply?"NOTHING_ELIGIBLE":"DRY_RUN",stage:c.state.stage,counts:summary(rs),would_publish:chosen.map(r=>({id:r.id,url:r._packet.proposed_url}))},null,2));
  return;
 }
 const snapshot={matrix:fs.readFileSync(path.join(ROOT,"data/seo/master-matrix.json"),"utf8"),
  freeze:fs.readFileSync(path.join(ROOT,"data/seo/url-freeze.json"),"utf8"),state:JSON.stringify(c.state)};
 const created=[];
 try{
  const matrix=structuredClone(c.matrix);
  for(const r of chosen){
   const row=matrix.rows.find(x=>x.id===r.id);
   if(row.status==="PUBLISHED"||fs.existsSync(path.join(ROOT,articlePath(row.url)))||fs.existsSync(path.join(ROOT,"content/articles",r.id+".json")))throw Error("Refusing to overwrite an existing URL/article "+r.id);
   const article={...r._packet,publication:publicationRecord({claim:r._claim,reviewSha:r.review_sha256,now,stage:c.state.stage})};
   write("content/articles/"+r.id+".json",article);created.push("content/articles/"+r.id+".json");
   created.push(articlePath(row.url));
   row.status="PUBLISHED";
  }
  write("data/seo/master-matrix.json",matrix);
  run("scripts/build.mjs");
  run("scripts/seo/content-graph.mjs","--write");
  run("scripts/seo/seo-guard.mjs","--add-new");
  run("scripts/seo/fact-guard.mjs");
  for(const [s,...a] of [["scripts/build.mjs","--check"],["scripts/seo/validate-plan.mjs"],["scripts/nav-qa.mjs"],["scripts/seo/audit-static.mjs","--fail-p0"],["scripts/seo/content-graph.mjs","--check"],["scripts/seo/seo-guard.mjs"]])run(s,...a);
  const inv=readLocalSitemapInventory(ROOT,c.locales.map(l=>l.code));
  for(const r of chosen)if(!inv.urls.includes(r._packet.proposed_url))throw Error("Sitemap is missing "+r._packet.proposed_url);
  if(fs.readFileSync(path.join(ROOT,"CNAME"),"utf8").trim()!=="global.rentbikehanoi.com")throw Error("CNAME changed");
  for(const r of chosen)c.state.published.push({id:r.id,locale:r.locale,url:r._packet.proposed_url,role:r.role,stage:c.state.stage,
   at:now,source_sha256:r._claim.source_sha256,review_sha256:r.review_sha256,live_qa:"PENDING"});
  c.state.runs.push({at:now,ids:chosen.map(r=>r.id),result:"STAGED"});
  c.state.runs=c.state.runs.slice(-200);
  write(STATE,c.state);
  console.log(JSON.stringify({mode:"PUBLISH_STAGED",stage:c.state.stage,published:chosen.map(r=>({id:r.id,url:r._packet.proposed_url})),
   next:"commit + push main, then live-qa --ids "+chosen.map(r=>r.id).join(",")},null,2));
 }catch(e){
  fs.writeFileSync(path.join(ROOT,"data/seo/master-matrix.json"),snapshot.matrix);
  fs.writeFileSync(path.join(ROOT,"data/seo/url-freeze.json"),snapshot.freeze);
  for(const f of created)if(fs.existsSync(path.join(ROOT,f)))fs.rmSync(path.join(ROOT,f));
  try{run("scripts/build.mjs");run("scripts/seo/content-graph.mjs","--write");}catch(x){console.error("ROLLBACK_REBUILD_NEEDS_REVIEW "+x.message);}
  const st=JSON.parse(snapshot.state);
  st.paused=true;st.pause_reason="Pre-commit gate failed "+now+": "+e.message.slice(0,400);st.clean_runs=0;
  st.runs.push({at:now,ids:chosen.map(r=>r.id),result:"GATE_FAILED"});
  write(STATE,st);
  throw Error("PUBLISH_ROLLED_BACK_AND_PAUSED: "+e.message);
 }
}
/**
 * Live HTTP QA after a deploy (or a recovery re-check with --recovery). The verdict
 * is PASS, FAIL (production served something wrong → the workflow reverts) or
 * INCONCLUSIVE (QA tool/network could not decide → pause, production untouched).
 * A crash of this command itself is recorded as INCONCLUSIVE, never as FAIL.
 */
async function cmdLiveQA(o){
 const ids=String(o.ids||"").split(",").filter(Boolean),origin=SITEMAP_ORIGIN;
 if(!ids.length||ids.some(id=>!/^[A-Z]{2}-[HS]\d{2,4}$/.test(id)))throw Error("live-qa needs --ids with Matrix IDs");
 const timeoutMs=Number(o["timeout-seconds"]||900)*1000,started=Date.now(),recovery=o.recovery===true;
 const c=context();
 let result;
 try{
  const targets=ids.map(id=>{
   const a=read("content/articles/"+id+".json"),l=c.locales.find(x=>x.code===a.locale);
   return {id,url:a.proposed_url,title:a.title,lang:l?.htmlLang||l?.code||a.locale};
  });
  result=await runLiveQA({targets,origin,localeCodes:c.locales.map(l=>l.code),fetcher:fetch,timeoutMs});
 }catch(e){
  result={verdict:"INCONCLUSIVE",issues:[{kind:"TOOL",scope:"live-qa",detail:String(e.message).slice(0,300)}],attempts:0,seconds:Math.round((Date.now()-started)/1000)};
 }
 const now=new Date().toISOString();
 if(o.record===true){
  const st=optional(STATE,emptyState());
  write(STATE,recordLiveQA(st,{ids,verdict:result.verdict,issues:result.issues,commit:o.commit||null,seconds:result.seconds,now,standing:c.standing,recovery}));
 }
 const out={mode:"LIVE_QA",verdict:result.verdict,passed:result.verdict==="PASS",recovery,ids,issues:result.issues,sitemap:result.sitemap||null,attempts:result.attempts,seconds:result.seconds};
 if(typeof o.out==="string")fs.writeFileSync(path.resolve(o.out),JSON.stringify(out,null,2)+"\n");
 console.log(JSON.stringify(out,null,2));
 if(result.verdict!=="PASS")process.exitCode=1;
}
function cmdControl(cmd,o){
 if(!trusted())throw Error("PUBLISHER_REFUSED: "+cmd+" runs only in the Global Auto Publisher workflow");
 const st=applyControl(optional(STATE,emptyState()),cmd,{reason:o.reason===true?"":o.reason,confirmed:o.confirmed,
  ids:String(o.ids||"").split(",").filter(Boolean),now:new Date().toISOString()});
 write(STATE,st);
 console.log(JSON.stringify({mode:cmd.toUpperCase(),paused:st.paused,reason:st.pause_reason}));
}
function reviewIssues(file,raw,c){
 let r;try{r=JSON.parse(raw);}catch{return ["Malformed JSON"];}
 const m=path.basename(file).match(REVIEW_FILE);
 if(!m)return ["Review file must be <ID>.<first 12 hex of draft SHA-256>.json"];
 const claim=c.ledger.claims.find(x=>x.id===m[1]&&x.status==="SUBMITTED");
 if(!claim)return ["No SUBMITTED claim for "+m[1]];
 const known=new Set([claim.source_sha256,...(claim.revisions||[]).map(v=>v.source_sha256)]);
 if(!String(r?.source_sha256||"").startsWith(m[2]))return ["File name hash prefix differs from source_sha256"];
 return validateReview(r,{packet:{matrix_id:m[1],writer_session:claim.session},claim,knownShas:known});
}
function cmdValidateReviews(o){
 const c=context(),dir=o.dir||REVIEWS,abs=path.join(ROOT,dir);
 const files=fs.existsSync(abs)?fs.readdirSync(abs).filter(f=>f.endsWith(".json")):[];
 const res=files.map(f=>({file:dir+"/"+f,issues:reviewIssues(f,fs.readFileSync(path.join(abs,f),"utf8"),c)}));
 console.log(JSON.stringify({mode:"READ_ONLY",reviews:res.length,results:res},null,2));
 if(res.some(r=>r.issues.length))process.exitCode=1;
}
function cmdIngestReviews(o){
 if(!trusted())throw Error("PUBLISHER_REFUSED: ingest-reviews runs only in the Global Auto Publisher workflow");
 if(!/^review\/[A-Za-z0-9_-]+$/.test(o.branch||"")||!/^[0-9a-f]{40}$/.test(o.sha||""))throw Error("Expected review/<name> branch and 40-char SHA");
 git("fetch","--no-tags","origin","refs/heads/"+o.branch+":refs/remotes/origin/"+o.branch);
 if(git("rev-parse","refs/remotes/origin/"+o.branch).trim()!==o.sha){console.log("REVIEW_STALE_RUN_SKIP");return;}
 const c=context(),names=git("ls-tree","-r","--name-only",o.sha,"--",REVIEWS+"/").split("\n").filter(f=>REVIEW_FILE.test(path.basename(f)));
 for(const f of names){
  const raw=git("show",o.sha+":"+f),issues=reviewIssues(path.basename(f),raw,c);
  if(issues.length){console.log("REVIEW_REJECTED "+f+": "+issues.join("; "));continue;}
  if(fs.existsSync(path.join(ROOT,f))&&fs.readFileSync(path.join(ROOT,f),"utf8")===raw)continue;
  if(fs.existsSync(path.join(ROOT,f)))continue; // first accepted review for a draft hash is kept; never overwritten
  fs.mkdirSync(path.dirname(path.join(ROOT,f)),{recursive:true});fs.writeFileSync(path.join(ROOT,f),raw);
  console.log("REVIEW_INGESTED "+f);
 }
}
try{
 const [cmd,...rest]=process.argv.slice(2),o=opts(rest);
 if(cmd==="scan")cmdScan(o);
 else if(cmd==="drain-decision")cmdDrainDecision();
 else if(cmd==="publish")cmdPublish(o);
 else if(cmd==="live-qa")await cmdLiveQA(o);
 else if(["pause","resume","record-failure"].includes(cmd))cmdControl(cmd,o);
 else if(cmd==="validate-reviews")cmdValidateReviews(o);
 else if(cmd==="ingest-reviews")cmdIngestReviews(o);
 else throw Error("Usage: auto-publisher.mjs scan|drain-decision|publish|live-qa|pause|resume|record-failure|validate-reviews|ingest-reviews");
}catch(e){console.error("AUTO_PUBLISHER_ERROR: "+e.message);process.exitCode=1;}
