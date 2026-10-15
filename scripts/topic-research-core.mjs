/**
 * Crash-safe topic research sessions — deterministic core (no I/O, no network, no AI).
 *
 * One research session = one AI agent on one branch `research/<agent>-<session>`.
 * Everything that must survive the loss of the agent's machine lives on GitHub:
 *
 *   factory/topic-research/batches/<agent>-<session>-NNNN.json    research batch (existing intake contract)
 *   factory/topic-research/checkpoints/<agent>-<session>.json      progress record, committed WITH each batch
 *
 * The checkpoint is a progress ledger for the agent. It is never a Matrix row, topical-map
 * proposal, sitemap entry or article, and the Topic Factory never ingests it (it ingests
 * `batches/` only). Quality gates are the existing intake gates (R1–R8, F5/F6, T1–T10); this
 * module only adds the four QA phases around them, cross-session duplicate detection and the
 * recovery planner. Nothing here writes data, publishes, claims Writer slots or calls a model.
 *
 * Truth model: GitHub content decides. A checkpoint is trusted only while it matches the batch
 * files (SHA-256) and the commit it was written with; otherwise state is re-derived from content.
 */
import {createHash} from "node:crypto";
import {fold,domainOf,duplicateLayers,prepareCorpus,ingestResearch,researchUsage,RESEARCH_PURPOSE} from "./topic-factory-core.mjs";

export const REPO="thuexemayhanoi/global";
export const CHECKPOINT_VERSION=1;
export const CHECKPOINT_PURPOSE="TOPIC_RESEARCH_CHECKPOINT";
export const BATCH_DIR="factory/topic-research/batches/";
export const CHECKPOINT_DIR="factory/topic-research/checkpoints/";
export const RESEARCH_LOG="data/seo/topic-factory/research-log.json";
export const BATCH_SIZE=10;
export const HISTORY_LIMIT=25;
export const LOCALES=["vi","en","de","fr","es","nl","zh","pt","ko","ja"];
export const PHASES=["duplicate","intent","source","schema"];
export const PARTIAL_NOTE="1-9 topics are allowed only when the session is ending (--final); never pad a batch";
const AGENT=/^[a-z][a-z0-9]{1,23}$/;
const SESSION=/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/;
const SHA256=/^[0-9a-f]{64}$/;
const SHA1=/^[0-9a-f]{40}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const METRICS=["search_volume","ranking","traffic"];
const norm=s=>String(s??"").normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/gu," ").trim();

export const sha256=text=>createHash("sha256").update(text).digest("hex");
export const canonical=value=>JSON.stringify(value,null,2)+"\n";
export const topicKey=c=>String(c?.locale)+"::"+fold(c?.primary_query||"");
export const addDays=(day,n)=>{const d=new Date(day+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};

/* ------------------------------------------------------------------ identity and paths */

export function sessionIds({agent,session}){
 if(!AGENT.test(agent||""))throw Error("agent must be lowercase letters/digits (2-24 chars, no hyphen), e.g. claude, mistral, gemini");
 if(!SESSION.test(session||""))throw Error("session must be 2-40 chars of A-Z a-z 0-9 _ - (start alphanumeric), e.g. 20261015 or run2");
 const stem=agent+"-"+session;
 return {agent,session,stem,branch:"research/"+stem,checkpointPath:CHECKPOINT_DIR+stem+".json",
  batchPrefix:BATCH_DIR+stem+"-",batchSession:"research-"+stem};
}
export function idsFromBranch(branch){
 const m=/^research\/([a-z][a-z0-9]{1,23})-([A-Za-z0-9][A-Za-z0-9_-]{1,39})$/.exec(branch||"");
 return m?sessionIds({agent:m[1],session:m[2]}):null;
}
export const batchFile=(ids,seq)=>ids.batchPrefix+String(seq).padStart(4,"0")+".json";
export function parseBatchFile(file,ids){
 if(typeof file!=="string"||!file.startsWith(ids.batchPrefix))return null;
 const m=/^(\d{4})\.json$/.exec(file.slice(ids.batchPrefix.length));
 return m?Number(m[1]):null;
}
/** Any managed batch name (any session): <agent>-<session>-NNNN.json → {stem, seq}. */
export function managedBatchOwner(file){
 const m=/^factory\/topic-research\/batches\/([a-z][a-z0-9]{1,23}-[A-Za-z0-9][A-Za-z0-9_-]{1,39})-(\d{4})\.json$/.exec(file||"");
 return m?{stem:m[1],seq:Number(m[2])}:null;
}
export function checkpointOwner(file){
 const m=/^factory\/topic-research\/checkpoints\/([a-z][a-z0-9]{1,23}-[A-Za-z0-9][A-Za-z0-9_-]{1,39})\.json$/.exec(file||"");
 return m?m[1]:null;
}
export const idsFromStem=stem=>{
 const m=/^([a-z][a-z0-9]{1,23})-(.+)$/.exec(stem||"");
 return m?sessionIds({agent:m[1],session:m[2]}):null;
};
/** A session may write exactly its own checkpoint and its own numbered batches — nothing else. */
export const isAllowedPath=(p,ids)=>p===ids.checkpointPath||parseBatchFile(p,ids)!==null;
export function assertAllowedPaths(paths,ids){
 const bad=paths.filter(p=>!isAllowedPath(p,ids));
 if(bad.length)throw Object.assign(Error("PATH_NOT_ALLOWED: a research session writes only its own batch and checkpoint files; refused "+bad.join(", ")),{code:"PATH_NOT_ALLOWED"});
}
/* ------------------------------------------------------------------ push failure wording */

const DENIED_RE=/denied|forbidden|\b403\b|permission|protected branch|repository rule|authentication failed|could not read Username/i;
const REJECTED_RE=/non-fast-forward|\[rejected\]|fetch first|failed to update ref|stale info|reference already exists|incorrect old value|is at [0-9a-f]{7,40} but expected/i;
export const TRANSIENT_RE=/RPC failed|HTTP [5]\d\d|\b50[234]\b|Could not resolve|Connection (?:reset|timed out|refused)|timed out|early EOF|unexpected disconnect|remote end hung up|Temporary failure|TLS|SSL_|GnuTLS|\b413\b|Service Unavailable|Gateway/i;
/**
 * Classify the output of a failed `git push`: DENIED (credentials/rules: stop and report), REJECTED (GitHub's branch
 * moved: reconcile by content and retry), UNREACHABLE (no such remote), TRANSIENT (network/5xx: retry) or UNKNOWN.
 * Git's wording differs between versions and servers, so UNKNOWN is judged by the remote's state by the caller.
 */
export function classifyPushFailure(text){
 const t=String(text||"");
 if(DENIED_RE.test(t))return "DENIED";
 if(REJECTED_RE.test(t))return "REJECTED";
 if(/does not appear to be a git repository/i.test(t))return "UNREACHABLE";
 if(TRANSIENT_RE.test(t)||/Could not read from remote/i.test(t))return "TRANSIENT";
 return "UNKNOWN";
}

/**
 * The only git push shape the tooling uses: no force, no delete, a research branch only. Commits are built
 * with plumbing on the branch ref, so the refspec never depends on what the clone has checked out.
 */
export function pushArgs(remote,branch){
 if(!idsFromBranch(branch))throw Error("PUSH_REFUSED: only research/<agent>-<session> branches may be pushed, never "+branch);
 return ["push",remote,"refs/heads/"+branch+":refs/heads/"+branch];
}

/* ------------------------------------------------------------------ draft → batch */

export function normalizeDraft(input,ids,today){
 const errors=[];
 let candidates=[],researchedOn=today;
 if(Array.isArray(input))candidates=input;
 else if(input&&typeof input==="object"&&Array.isArray(input.candidates)){
  candidates=input.candidates;
  if(input.researched_on!==undefined){
   if(!DAY.test(input.researched_on||""))errors.push("researched_on must be YYYY-MM-DD");
   else if(input.researched_on>addDays(today,1))errors.push("researched_on is in the future");
   else researchedOn=input.researched_on;
  }
  if(input.agent!==undefined&&(input.agent?.name!==ids.agent||input.agent?.session!==ids.batchSession))
   errors.push("DRAFT_AGENT_MISMATCH: the draft names another agent/session; a session never writes for another one");
  if(input.purpose!==undefined&&input.purpose!==RESEARCH_PURPOSE)errors.push("purpose must be "+RESEARCH_PURPOSE);
  if(input.repo!==undefined&&input.repo!==REPO)errors.push("repo must be "+REPO);
 }else errors.push("The draft must be an array of candidates or {candidates:[…]}");
 return {errors,batch:{version:1,repo:REPO,purpose:RESEARCH_PURPOSE,agent:{name:ids.agent,session:ids.batchSession},researched_on:researchedOn,candidates}};
}

export function topicSummary(c,{policy,matrix}={}){
 const parent=c?.parent_id&&matrix?matrix.rows.find(r=>r.id===c.parent_id):null;
 const domain=c?.domain_id||(parent&&policy?domainOf(policy,parent.cluster):null)||null;
 return {ref:c.locale+":"+c.slug,locale:c.locale,slug:c.slug,domain_id:domain,parent_id:c.parent_id??null,
  subcluster:c.subcluster??null,key:topicKey(c),ta_id:null};
}

/* ------------------------------------------------------------------ QA phases */

/** Which of the four owner QA phases a gate belongs to. */
export function classifyGate(gate,reason=""){
 const g=String(gate||"");
 if(/^(F5_DUPLICATE|F6_LOCALE_CAP|X_DUP)/.test(g))return "duplicate";
 if(g==="R5")return /Duplicate primary_query/i.test(reason)?"duplicate":/intent_rationale|content_angle/.test(reason)?"intent":"schema";
 if(g==="R6"||g==="F4_COMMERCIAL_INTENT"||g==="T5"||/^X_INTENT/.test(g))return "intent";
 if(g==="R7"||g==="R8"||g==="T8"||g==="F7_RESEARCH"||/^X_SRC/.test(g))return "source";
 if(g==="T4")return /Invalid search_intent/.test(reason)?"intent":/collision|Cannibalization|distinct_from/.test(reason)?"duplicate":"schema";
 if(g==="T10"&&/Same (query|title)/.test(reason))return "duplicate";
 return "schema";
}
const splitGates=(gate,reason)=>gate==="T_GATES"
 ?String(reason).split(" | ").map(s=>{const m=/^(T\d+):\s*([\s\S]*)$/.exec(s);return m?{gate:m[1],reason:m[2]}:{gate,reason:s};})
 :[{gate,reason}];

export function extraChecks(c,{today,researchedOn}={}){
 const out=[],refs=Array.isArray(c?.references)?c.references:[],urls=new Set(),hosts=new Set();
 const key=u=>{try{const x=new URL(u);return x.host.toLowerCase()+x.pathname.replace(/\/+$/,"")+x.search;}catch{return String(u);}};
 for(const r of refs){
  const k=key(r?.url||"");
  if(urls.has(k))out.push({gate:"X_SRC_DUPLICATE_URL",severity:"FAIL",reason:"The same source is listed twice ("+r.url+"); two distinct sources are required"});
  urls.add(k);
  try{hosts.add(new URL(r.url).host.toLowerCase());}catch{/* R7 reports malformed URLs */}
  if(DAY.test(r?.checked_on||"")){
   if(today&&r.checked_on>addDays(today,1))out.push({gate:"X_SRC_FUTURE_DATE",severity:"FAIL",reason:"checked_on "+r.checked_on+" is in the future"});
   else if(researchedOn&&r.checked_on>researchedOn)out.push({gate:"X_SRC_AFTER_RESEARCH",severity:"FAIL",reason:"checked_on "+r.checked_on+" is after researched_on "+researchedOn});
  }
 }
 if(refs.length>=2&&hosts.size===1)out.push({gate:"X_SRC_SINGLE_HOST",severity:"WARN",reason:"All sources come from one host; add an independent source where one exists"});
 if(norm(c?.content_angle)&&norm(c?.content_angle)===norm(c?.intent_rationale))
  out.push({gate:"X_INTENT_ANGLE_COPY",severity:"FAIL",reason:"content_angle repeats intent_rationale; state the unique value separately"});
 return out;
}

/** In-flight topics of OTHER research sessions (not yet ingested by main) as a duplicate corpus. */
export function inFlightItems(branches,{log={batches:[]},exclude=null}={}){
 const ingested=new Set((log.batches||[]).map(b=>b.sha256).filter(Boolean)),items=[];
 for(const b of branches||[]){
  if(b.branch===exclude)continue;
  for(const f of b.batches||[]){
   if(ingested.has(sha256(f.raw)))continue;
   let parsed;try{parsed=JSON.parse(f.raw);}catch{continue;}
   if(parsed?.purpose!==RESEARCH_PURPOSE||!Array.isArray(parsed.candidates))continue;
   for(const c of parsed.candidates)if(c&&typeof c==="object"&&c.locale&&c.primary_query)
    items.push({id:b.branch+"#"+(c.slug||"?"),locale:c.locale,primary_query:c.primary_query,working_title:c.working_title||"",
     secondary_queries:Array.isArray(c.secondary_queries)?c.secondary_queries:[]});
  }
 }
 return items;
}
export function crossSessionDuplicates(candidate,items,{stop=[],thresholds,distinctMin=40}){
 const list=items.filter(o=>o.locale===candidate.locale);
 if(!list.length)return [];
 // A pending foreign topic has no Matrix/TA id yet, so no distinct_from reason can excuse an overlap.
 const probe={...candidate,id:"__candidate__",distinct_from:undefined};
 return duplicateLayers(probe,prepareCorpus(list,candidate.locale,stop),{stop,thresholds,distinctMin});
}

/**
 * Four-phase QA of a draft batch against the cumulative state a research branch would have on
 * GitHub: main's map + every earlier batch file (replay-aware) + other sessions' in-flight topics.
 * Pure: never mutates its inputs. Per-candidate verdicts are PASS, FAIL or SKIP_ALREADY_ACCEPTED.
 */
export function evaluateDraft({batch,matrix,map,policy,frozen=[],priorFiles=[],log={batches:[]},ownKeys=new Map(),others=[],today,newFile="draft.json"}){
 const byDigest=new Map((log.batches||[]).filter(b=>b.sha256).map(b=>[b.sha256,b]));
 const priorFailures=[],own=new Map(ownKeys);
 let cur=map;
 for(const f of [...priorFiles].sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0)){
  let b;try{b=JSON.parse(f.raw);}catch{priorFailures.push({file:f.file,gate:"R0",reason:"Malformed JSON"});continue;}
  const replay=byDigest.get(sha256(f.raw));
  if(replay){
   const rej=Array.isArray(replay.rejected)?replay.rejected:[];
   if(replay.error||rej.length)priorFailures.push({file:f.file,gate:"R_REPLAY",reason:String(replay.error||"Previously rejected research batch")});
   continue;
  }
  const dry=ingestResearch(b,{matrix,map:cur,policy,source:f.file,frozenUrls:frozen});
  if(dry.batch_error||dry.rejected.length||dry.added.length!==(b.candidates||[]).length){
   priorFailures.push({file:f.file,gate:"PRIOR_BATCH",reason:"An earlier batch file no longer passes: "+JSON.stringify(dry.rejected).slice(0,300)});continue;
  }
  cur=dry.map;
 }
 const list=Array.isArray(batch.candidates)?batch.candidates:[];
 const results=list.map((c,index)=>({index,ref:c&&typeof c==="object"?c.locale+":"+c.slug:"#"+index,
  key:c&&typeof c==="object"?topicKey(c):"#"+index,verdict:"PASS",issues:[]}));
 const sub=[],subIndex=[];
 for(const r of results){
  const k=own.get(r.key);
  if(k&&list[r.index]&&typeof list[r.index]==="object"){r.verdict="SKIP_ALREADY_ACCEPTED";r.accepted_as=k;continue;}
  sub.push(list[r.index]);subIndex.push(r.index);
 }
 const batchIssues=[];
 if(sub.length){
  const dry=ingestResearch({...batch,candidates:sub},{matrix,map:cur,policy,source:newFile,frozenUrls:frozen});
  const simId=new Map(dry.added.map(a=>[a.candidate_id,results[subIndex[a.index]].ref]));
  const rewrite=s=>String(s).replace(/TA-[A-Z]{2}-\d{4}/g,m=>simId.has(m)?"candidate "+simId.get(m)+" in this batch":m);
  for(const x of dry.rejected){
   if(x.index<0){batchIssues.push({gate:x.gate,reason:rewrite(x.reason)});continue;}
   const r=results[subIndex[x.index]];
   for(const g of splitGates(x.gate,rewrite(x.reason)))r.issues.push({...g,phase:classifyGate(g.gate,g.reason),severity:"FAIL"});
   if(/^R\d/.test(x.gate))r.structural=true;
  }
  for(const r of results){
   if(r.verdict==="SKIP_ALREADY_ACCEPTED")continue;
   const c=list[r.index];
   if(!c||typeof c!=="object"){if(!r.issues.some(i=>i.gate==="R2"))r.issues.push({gate:"R2",phase:"schema",severity:"FAIL",reason:"Candidate must be an object"});continue;}
   for(const x of extraChecks(c,{today,researchedOn:batch.researched_on}))r.issues.push({...x,phase:classifyGate(x.gate,x.reason)});
   const hits=crossSessionDuplicates(c,others,{stop:map.locales?.[c.locale]?.stop_tokens||[],thresholds:policy.duplicates,distinctMin:policy.duplicates.distinct_reason_min});
   for(const h of hits)r.issues.push({gate:"X_DUP_CROSS_SESSION",phase:"duplicate",severity:"FAIL",
    reason:h.layer+" with "+h.with+" ("+h.score+"): another research session already has this topic in flight; pick a different topic or wait until it is ingested"});
  }
 }
 for(const r of results){
  if(r.verdict==="SKIP_ALREADY_ACCEPTED"){r.phases=Object.fromEntries(PHASES.map(p=>[p,"SKIPPED"]));continue;}
  r.verdict=r.issues.some(i=>i.severity==="FAIL")?"FAIL":"PASS";
  r.phases=Object.fromEntries(PHASES.map(p=>[p,r.issues.some(i=>i.phase===p&&i.severity==="FAIL")?"FAIL":
   p==="duplicate"&&r.structural?"NOT_EVALUATED":"PASS"]));
 }
 const counts={pass:0,fail:0,skipped:0};
 for(const r of results)r.verdict==="PASS"?counts.pass++:r.verdict==="FAIL"?counts.fail++:counts.skipped++;
 return {results,counts,batchIssues,priorFailures,map:cur};
}

/** Size/atomicity rules of the Auto Push loop. */
export function decideBatch({counts,batchIssues=[],priorFailures=[]},{final=false,quarantine=false,replay=false}={}){
 if(priorFailures.length)return {action:"REFUSE",code:"PRIOR_FILES_FAIL",message:"An earlier batch file on this branch fails QA; GitHub would reject the whole branch. Run resume and fix it first."};
 if(batchIssues.length)return {action:"REFUSE",code:"BATCH_INVALID",message:"The draft as a whole is invalid: "+batchIssues.map(i=>i.gate+": "+i.reason).join("; ")};
 if(!counts.pass){
  if(counts.skipped&&!counts.fail)return {action:"NOOP",code:"ALL_ALREADY_ACCEPTED",message:"Every topic in the draft was already accepted by this session; nothing new to push."};
  if(quarantine&&counts.fail)return {action:"QUARANTINE_ONLY",code:"QUARANTINE_ONLY",message:"No topic passed; only the failures are recorded in the checkpoint (no batch is written)."};
  return {action:"REFUSE",code:"NO_PASSING_TOPICS",message:"No topic passed QA; fix the failures below (never forced)."};
 }
 if(counts.fail&&!quarantine)return {action:"REFUSE",code:"QA_FAIL_BLOCKS_BATCH",message:counts.fail+" topic(s) failed QA. Fix them and resubmit the whole batch (or use --quarantine-failures to push only the passing topics and keep the failures in the checkpoint)."};
 if(replay)return {action:"WRITE",code:"REPLAY"};
 if(counts.pass>BATCH_SIZE)return {action:"REFUSE",code:"BATCH_TOO_LARGE",message:"Push "+BATCH_SIZE+" topics per batch ("+counts.pass+" passed); split the draft."};
 if(counts.pass<BATCH_SIZE&&!final)return {action:"REFUSE",code:"BATCH_INCOMPLETE",message:"Only "+counts.pass+" topic(s) passed; a normal batch has "+BATCH_SIZE+". Research more, or use --final when the session is ending."};
 return {action:"WRITE",code:counts.pass<BATCH_SIZE?"PARTIAL_FINAL":"FULL_BATCH"};
}

/** The batch that will be committed: the PASS candidates, in draft order. */
export function passingBatch(batch,results){
 const keep=new Set(results.filter(r=>r.verdict==="PASS").map(r=>r.index));
 return {...batch,candidates:batch.candidates.filter((_,i)=>keep.has(i))};
}
export function quarantineEntries(batch,results,now){
 return results.filter(r=>r.verdict==="FAIL").map(r=>{
  const c=structuredClone(batch.candidates[r.index]);
  if(c&&typeof c==="object")for(const k of METRICS)delete c[k];
  return {key:r.key,locale:c?.locale??null,slug:c?.slug??null,candidate:c,
   gates:r.issues.filter(i=>i.severity==="FAIL").map(i=>({gate:i.gate,phase:i.phase,reason:i.reason})),seen_at:now};
 });
}

/* ------------------------------------------------------------------ checkpoint */

export function newCheckpoint(ids,{now,mainSha=null,parentSha=null,contract=null}){
 return {version:CHECKPOINT_VERSION,purpose:CHECKPOINT_PURPOSE,repo:REPO,agent:ids.agent,session:ids.session,branch:ids.branch,
  batch_session:ids.batchSession,created_at:now,updated_at:now,base_main_sha:mainSha,last_commit_sha:parentSha,contract,
  totals:{researched:0,qa_pass:0,qa_fail:0,qa_fail_open:0,pushed:0,pending_push:0},
  coverage:{locales:{},domains:{}},last_batch:null,batches:[],
  next_batch:{seq:1,file:batchFile(ids,1),size:BATCH_SIZE,partial_allowed:PARTIAL_NOTE},unresolved:[],history:[]};
}
export function deriveTotals(cp,qaFail=cp.totals?.qa_fail||0){
 const pass=cp.batches.reduce((n,b)=>n+b.candidates,0);
 const pushed=cp.batches.filter(b=>b.state==="PUSHED").reduce((n,b)=>n+b.candidates,0);
 const open=cp.unresolved.filter(u=>u.kind==="QA_FAIL").length;
 const locales={},domains={};
 for(const b of cp.batches)for(const t of b.topics){
  locales[t.locale]=(locales[t.locale]||0)+1;
  domains[t.domain_id||"unmapped"]=(domains[t.domain_id||"unmapped"]||0)+1;
 }
 return {totals:{researched:pass+open,qa_pass:pass,qa_fail:Math.max(qaFail,open),qa_fail_open:open,pushed,pending_push:pass-pushed},
  coverage:{locales,domains}};
}
const history=(cp,entry)=>[...(cp.history||[]),entry].slice(-HISTORY_LIMIT);
function settle(next,{ids,now,mainSha,parentSha,contract,commitShaByFile={}}){
 // The caller only gets here after the previous push was verified on GitHub (see the CLI sync step).
 for(const b of next.batches)if(b.state==="COMMITTED"){b.state="PUSHED";b.commit_sha=commitShaByFile[b.file]||b.commit_sha||null;}
 next.updated_at=now;next.base_main_sha=mainSha??next.base_main_sha??null;next.last_commit_sha=parentSha??null;
 next.contract=contract??next.contract??null;
 return next;
}
/** Add one batch to the checkpoint — the result is committed in the SAME commit as the batch file. */
export function applyBatch(cp,{ids,seq,raw,batch,summaries,failed=[],now,mainSha,parentSha,contract,commitShaByFile={},note=null}){
 const next=settle(structuredClone(cp),{ids,now,mainSha,parentSha,contract,commitShaByFile});
 const file=batchFile(ids,seq),digest=sha256(raw);
 if(next.batches.some(b=>b.file===file))throw Error("BATCH_SEQ_TAKEN: "+file+" is already recorded");
 next.batches.push({seq,file,sha256:digest,candidates:batch.candidates.length,state:"COMMITTED",commit_sha:null,
  researched_on:batch.researched_on,topics:summaries});
 const passed=new Set(summaries.map(s=>s.key));
 next.unresolved=next.unresolved.filter(u=>!(u.kind==="QA_FAIL"&&passed.has(u.key)));
 let fresh=0;
 for(const f of failed){
  const open=next.unresolved.find(u=>u.kind==="QA_FAIL"&&u.key===f.key);
  if(open){open.attempts=(open.attempts||1)+1;open.last_seen=now;open.gates=f.gates;open.candidate=f.candidate;continue;}
  next.unresolved.push({id:"qf-"+sha256(f.key).slice(0,8),kind:"QA_FAIL",key:f.key,locale:f.locale,slug:f.slug,attempts:1,
   first_seen:now,last_seen:now,gates:f.gates,candidate:f.candidate});
  fresh++;
 }
 if(note)next.unresolved.push({id:"note-"+sha256(now+"|"+note).slice(0,8),kind:"NOTE",message:String(note).slice(0,500),at:now});
 Object.assign(next,deriveTotals(next,(cp.totals?.qa_fail||0)+fresh));
 next.last_batch={seq,file,sha256:digest,topics:batch.candidates.length,state:"COMMITTED"};
 next.next_batch={seq:seq+1,file:batchFile(ids,seq+1),size:BATCH_SIZE,partial_allowed:PARTIAL_NOTE};
 next.history=history(next,{at:now,event:"BATCH_COMMITTED",seq,topics:batch.candidates.length,sha256:digest});
 return next;
}
/** Checkpoint-only update (notes, blockers, abandoning a stuck QA FAIL, final state). */
export function applyUpdate(cp,{ids,now,mainSha,parentSha,contract,commitShaByFile={},notes=[],blockers=[],resolve=[],abandon=[],quarantine=[]}){
 const next=settle(structuredClone(cp),{ids,now,mainSha,parentSha,contract,commitShaByFile});
 const gone=new Set([...resolve,...abandon]);
 for(const id of resolve){
  const u=next.unresolved.find(x=>x.id===id);
  if(!u)throw Error("UNKNOWN_UNRESOLVED_ID: "+id);
  if(u.kind==="QA_FAIL")throw Error("A QA_FAIL entry is resolved by passing QA in a batch, or abandoned explicitly with --abandon");
 }
 for(const id of abandon){
  const u=next.unresolved.find(x=>x.id===id);
  if(!u||u.kind!=="QA_FAIL")throw Error("UNKNOWN_QA_FAIL_ID: "+id);
  next.history=history(next,{at:now,event:"QA_FAIL_ABANDONED",id,key:u.key});
 }
 next.unresolved=next.unresolved.filter(u=>!gone.has(u.id));
 for(const f of quarantine)if(!next.unresolved.some(u=>u.kind==="QA_FAIL"&&u.key===f.key))
  next.unresolved.push({id:"qf-"+sha256(f.key).slice(0,8),kind:"QA_FAIL",key:f.key,locale:f.locale,slug:f.slug,attempts:1,first_seen:now,last_seen:now,gates:f.gates,candidate:f.candidate});
 for(const m of notes)next.unresolved.push({id:"note-"+sha256(now+"|"+m).slice(0,8),kind:"NOTE",message:String(m).slice(0,500),at:now});
 for(const m of blockers)next.unresolved.push({id:"blk-"+sha256(now+"|"+m).slice(0,8),kind:"BLOCKER",message:String(m).slice(0,500),at:now});
 const fresh=quarantine.filter(f=>!cp.unresolved.some(u=>u.kind==="QA_FAIL"&&u.key===f.key)).length;
 Object.assign(next,deriveTotals(next,(cp.totals?.qa_fail||0)+fresh));
 next.history=history(next,{at:now,event:"CHECKPOINT_UPDATED"});
 return next;
}
/**
 * Re-derive a checkpoint from the batch files that really exist. Used when the recorded checkpoint is
 * missing, invalid or does not match the tree: content is the truth, so counters and digests are
 * recomputed, while unresolved QA FAIL entries, notes, blockers and the QA FAIL tally are carried over.
 */
export function rebuildCheckpoint(ids,{files,previous=null,now,mainSha=null,parentSha=null,contract=null,ctx={},pushedDigests=new Set(),commitShaByFile={}}){
 const cp=newCheckpoint(ids,{now,mainSha,parentSha,contract});
 if(previous&&typeof previous==="object"){
  if(ISO.test(previous.created_at||""))cp.created_at=previous.created_at;
  if(Array.isArray(previous.unresolved))cp.unresolved=previous.unresolved.filter(u=>u&&typeof u==="object"&&u.id&&["QA_FAIL","NOTE","BLOCKER"].includes(u.kind));
  if(Number.isInteger(previous.totals?.qa_fail)&&previous.totals.qa_fail>=0)cp.totals.qa_fail=previous.totals.qa_fail;
  if(Array.isArray(previous.history))cp.history=previous.history.filter(h=>h&&typeof h==="object").slice(-HISTORY_LIMIT);
 }
 const ordered=(files||[]).filter(f=>parseBatchFile(f.file,ids)!==null).sort((a,b)=>parseBatchFile(a.file,ids)-parseBatchFile(b.file,ids));
 for(const f of ordered){
  let parsed;try{parsed=JSON.parse(f.raw);}catch{continue;}
  const topics=(parsed.candidates||[]).filter(c=>c&&typeof c==="object").map(c=>topicSummary(c,ctx));
  if(!topics.length)continue;
  const digest=sha256(f.raw);
  const pushed=pushedDigests.has(digest);
  cp.batches.push({seq:parseBatchFile(f.file,ids),file:f.file,sha256:digest,candidates:topics.length,state:pushed?"PUSHED":"COMMITTED",
   commit_sha:pushed?commitShaByFile[f.file]||null:null,researched_on:DAY.test(parsed.researched_on||"")?parsed.researched_on:now.slice(0,10),topics});
 }
 const have=new Set(cp.batches.flatMap(b=>b.topics.map(t=>t.key)));
 cp.unresolved=cp.unresolved.filter(u=>!(u.kind==="QA_FAIL"&&have.has(u.key)));
 // A PUSHED batch may not follow a COMMITTED one; keep the suffix rule even for odd trees.
 let seenCommitted=false;
 for(const b of cp.batches){if(b.state==="COMMITTED")seenCommitted=true;else if(seenCommitted)b.state="COMMITTED";}
 Object.assign(cp,deriveTotals(cp,cp.totals.qa_fail));
 const last=cp.batches[cp.batches.length-1];
 cp.last_batch=last?{seq:last.seq,file:last.file,sha256:last.sha256,topics:last.candidates,state:last.state}:null;
 const seq=(last?.seq||0)+1;
 cp.next_batch={seq,file:batchFile(ids,seq),size:BATCH_SIZE,partial_allowed:PARTIAL_NOTE};
 cp.history=history(cp,{at:now,event:"CHECKPOINT_REBUILT_FROM_CONTENT",batches:cp.batches.length});
 return cp;
}
/** Fill Topic Factory IDs once main has ingested a topic (looked up by locale+slug; never guessed). */
export function resolveTaIds(cp,proposals){
 const next=structuredClone(cp);let changed=0;
 for(const b of next.batches)for(const t of b.topics){
  if(t.ta_id)continue;
  const p=proposals.get(t.locale+":"+t.slug);
  if(p?.candidate_id){t.ta_id=p.candidate_id;changed++;}
 }
 return {checkpoint:next,changed};
}

export function validateCheckpoint(cp,{ids=null}={}){
 const issues=[],add=(code,message)=>issues.push({code,message});
 if(!cp||typeof cp!=="object"||Array.isArray(cp)){return [{code:"CP_SHAPE",message:"Checkpoint must be a JSON object"}];}
 if(cp.version!==CHECKPOINT_VERSION||cp.purpose!==CHECKPOINT_PURPOSE||cp.repo!==REPO)add("CP_HEADER","version 1, purpose "+CHECKPOINT_PURPOSE+" and repo "+REPO+" are required");
 let own=ids;
 try{own=own||sessionIds({agent:cp.agent,session:cp.session});}catch(e){add("CP_IDENTITY",e.message);return issues;}
 if(cp.agent!==own.agent||cp.session!==own.session)add("CP_IDENTITY","agent/session do not match the checkpoint file");
 if(cp.branch!==own.branch)add("CP_BRANCH","branch must be "+own.branch);
 if(cp.batch_session!==own.batchSession)add("CP_BATCH_SESSION","batch_session must be "+own.batchSession);
 for(const k of ["created_at","updated_at"])if(!ISO.test(cp[k]||""))add("CP_TIME",k+" must be an ISO UTC timestamp");
 for(const k of ["base_main_sha","last_commit_sha"])if(cp[k]!==null&&cp[k]!==undefined&&!SHA1.test(cp[k]))add("CP_SHA",k+" must be a 40-hex commit SHA or null");
 const t=cp.totals;
 if(!t||["researched","qa_pass","qa_fail","qa_fail_open","pushed","pending_push"].some(k=>!Number.isInteger(t[k])||t[k]<0))add("CP_TOTALS","totals need non-negative integers");
 if(!Array.isArray(cp.batches)||!Array.isArray(cp.unresolved))add("CP_SHAPE","batches and unresolved must be arrays");
 if(issues.length&&(!Array.isArray(cp.batches)||!Array.isArray(cp.unresolved)))return issues;
 const keys=new Set(),refs=new Set();
 cp.batches.forEach((b,i)=>{
  if(!Number.isInteger(b.seq)||b.seq<1||(i&&b.seq<=cp.batches[i-1].seq))add("CP_SEQ","batch sequence numbers must be positive and strictly increasing (found "+b.seq+" at position "+(i+1)+")");
  if(b.file!==batchFile(own,b.seq))add("CP_FILE","batch "+b.seq+" must be "+batchFile(own,b.seq));
  if(!SHA256.test(b.sha256||""))add("CP_DIGEST","batch "+b.seq+" needs a SHA-256");
  if(!["COMMITTED","PUSHED"].includes(b.state))add("CP_STATE","batch "+b.seq+" state must be COMMITTED or PUSHED");
  if(b.state==="PUSHED"&&cp.batches.slice(0,i).some(x=>x.state==="COMMITTED"))add("CP_STATE","a PUSHED batch cannot follow a COMMITTED one");
  if(b.commit_sha!==null&&b.commit_sha!==undefined&&!SHA1.test(b.commit_sha))add("CP_SHA","batch "+b.seq+" commit_sha must be a 40-hex SHA or null");
  if(!Array.isArray(b.topics)||b.topics.length!==b.candidates||b.candidates<1)add("CP_TOPICS","batch "+b.seq+" must list exactly its topics");
  for(const x of b.topics||[]){
   if(!LOCALES.includes(x.locale)||!x.slug||x.ref!==x.locale+":"+x.slug)add("CP_TOPIC","batch "+b.seq+" has a malformed topic entry");
   if(keys.has(x.key))add("CP_DUP_TOPIC","topic "+x.ref+" appears twice in this session's batches");
   keys.add(x.key);refs.add(x.ref);
  }
 });
 for(const u of cp.unresolved){
  if(!["QA_FAIL","NOTE","BLOCKER"].includes(u.kind)||!u.id)add("CP_UNRESOLVED","unresolved entries need id and kind QA_FAIL, NOTE or BLOCKER");
  if(u.kind==="QA_FAIL"){
   if(!u.key||!u.candidate||!Array.isArray(u.gates)||!u.gates.length)add("CP_UNRESOLVED","QA_FAIL entry "+u.id+" needs key, candidate and gates");
   if(keys.has(u.key))add("CP_UNRESOLVED","topic "+u.key+" is both accepted and unresolved");
   for(const k of METRICS)if(u.candidate&&k in u.candidate)add("CP_METRICS","unresolved candidate "+u.id+" carries "+k);
  }
 }
 const d=deriveTotals(cp);
 for(const k of ["researched","qa_pass","qa_fail_open","pushed","pending_push"])if(t&&t[k]!==d.totals[k])add("CP_COUNTERS","totals."+k+" is "+t[k]+" but the batches say "+d.totals[k]);
 if(t&&t.qa_fail<t.qa_fail_open)add("CP_COUNTERS","qa_fail cannot be smaller than qa_fail_open");
 const last=cp.batches[cp.batches.length-1];
 if(last?(cp.last_batch?.seq!==last.seq||cp.last_batch?.sha256!==last.sha256):cp.last_batch!==null)add("CP_LAST_BATCH","last_batch must describe the newest batch");
 const nextSeq=(last?.seq||0)+1;
 if(cp.next_batch?.seq!==nextSeq||cp.next_batch?.file!==batchFile(own,nextSeq)||cp.next_batch?.size!==BATCH_SIZE)add("CP_NEXT_BATCH","next_batch must be sequence "+nextSeq+" of "+BATCH_SIZE+" topics");
 if(JSON.stringify(cp.coverage)!==JSON.stringify(d.coverage))add("CP_COVERAGE","coverage does not match the batches");
 if(JSON.stringify(cp).length>4_000_000)add("CP_SIZE","checkpoint exceeds 4 MB");
 return issues;
}

/** Compare a checkpoint with the batch files that really exist (SHA-256 of the exact bytes). */
export function verifyCheckpointContent(cp,files,ids){
 const issues=[],add=(code,message)=>issues.push({code,message});
 const own=new Map((files||[]).filter(f=>parseBatchFile(f.file,ids)!==null).map(f=>[f.file,f]));
 for(const b of cp.batches||[]){
  const f=own.get(b.file);
  if(!f){add("CONTENT_MISSING",b.file+" is recorded in the checkpoint but is not in the tree");continue;}
  if(sha256(f.raw)!==b.sha256){add("CONTENT_DIGEST",b.file+" does not match its recorded SHA-256");continue;}
  let parsed;try{parsed=JSON.parse(f.raw);}catch{add("CONTENT_JSON",b.file+" is not valid JSON");continue;}
  if(parsed.agent?.name!==ids.agent||parsed.agent?.session!==ids.batchSession)add("CONTENT_SESSION",b.file+" names another agent/session");
  const got=(parsed.candidates||[]).map(topicKey);
  if(got.length!==b.candidates||got.some((k,i)=>k!==b.topics[i]?.key))add("CONTENT_TOPICS",b.file+" topics differ from the checkpoint");
 }
 for(const [file] of own)if(!(cp.batches||[]).some(b=>b.file===file))add("CONTENT_UNRECORDED",file+" is not recorded in the checkpoint (it must be committed together with it)");
 return issues;
}

/* ------------------------------------------------------------------ resume planning */

/**
 * Decide how to continue after an interruption, from facts the CLI read from GitHub and the
 * local clone. Pure and deterministic. See docs/TOPIC-RESEARCH-CHECKPOINT.md § Recovery.
 *
 * facts: {ids, now, contract:{current}, main:{sha, log, sessionTopics:[{ta_id,locale,slug,key,status}]},
 *   ctx:{policy,matrix}, remote:{exists,sha,checkpoint:{raw}|null,batches:[{file,raw}],binding},
 *   local:{exists,sha,relation,dirty,onBranch,batches:[{file,raw}]}, others:[{branch,batches}]}
 */
export function planResume(f){
 const {ids}=f,warnings=[],actions=[];
 const remote=f.remote||{exists:false},local=f.local||{exists:false,relation:"NONE",batches:[]};
 const logBatches=f.main?.log?.batches||[];
 const byDigest=new Map(logBatches.filter(b=>b.sha256).map(b=>[b.sha256,b]));
 const ingestOf=digest=>{
  const e=byDigest.get(digest);
  if(!e)return {status:"PENDING",added:[],rejected:0};
  const rej=Array.isArray(e.rejected)?e.rejected:[];
  return {status:e.error?"ERROR":rej.length===0?"ACCEPTED":(e.added?.length?"PARTIAL":"REJECTED"),added:e.added||[],rejected:rej.length};
 };
 const describe=(files,onRemote)=>(files||[]).filter(x=>parseBatchFile(x.file,ids)!==null).sort((a,b)=>a.file<b.file?-1:1).map(x=>{
  const digest=sha256(x.raw),row={file:x.file,seq:parseBatchFile(x.file,ids),sha256:digest,on_remote:onRemote};
  let parsed;try{parsed=JSON.parse(x.raw);}catch{return {...row,error:"Malformed JSON",candidates:0,topics:[],ingest:ingestOf(digest)};}
  const topics=(parsed.candidates||[]).filter(c=>c&&typeof c==="object").map(c=>topicSummary(c,f.ctx||{}));
  return {...row,candidates:topics.length,topics,ingest:ingestOf(digest)};
 });
 const remoteBatches=describe(remote.batches,true);
 const remoteDigests=new Set(remoteBatches.map(b=>b.sha256));
 const localOnly=describe(local.batches,false).filter(b=>!remoteDigests.has(b.sha256));

 // Checkpoint trust: valid + content matches + bound to the commit it was written with.
 let checkpoint={found:false,trust:"NONE",issues:[]},cp=null;
 if(remote.exists&&remote.checkpoint){
  checkpoint.found=true;
  try{cp=JSON.parse(remote.checkpoint.raw);}catch{checkpoint.issues.push({code:"CP_JSON",message:"Checkpoint is not valid JSON"});}
  if(cp){
   checkpoint.issues.push(...validateCheckpoint(cp,{ids}),...verifyCheckpointContent(cp,remote.batches,ids));
   checkpoint.binding=remote.binding||"UNKNOWN";
   if(checkpoint.binding==="MISMATCH")checkpoint.issues.push({code:"CP_COMMIT_BINDING",message:"last_commit_sha is not in this branch's history (rewritten history?)"});
   checkpoint.trust=checkpoint.issues.length===0?"VERIFIED":"CONTENT_ONLY";
  }else checkpoint.trust="CONTENT_ONLY";
 }
 // Content is the truth: every batch file on the remote branch counts, whatever the checkpoint says.
 const taByKey=new Map((f.main?.sessionTopics||[]).map(t=>[t.key,t.ta_id]));
 const accepted=new Map();
 for(const b of remoteBatches)for(const t of b.topics){
  t.ta_id=taByKey.get(t.key)||null;
  accepted.set(t.key,{source:"batch "+String(b.seq).padStart(4,"0")+" on GitHub",ta_id:t.ta_id});
 }
 for(const t of f.main?.sessionTopics||[])if(!accepted.has(t.key))accepted.set(t.key,{source:"ingested by main as "+t.ta_id,ta_id:t.ta_id});
 const unpushed=new Set(localOnly.flatMap(b=>b.topics.map(t=>t.key)));

 const logSeqs=logBatches.filter(b=>b.branch===ids.branch).map(b=>{const m=/-(\d{4})\.json$/.exec(b.file||"");return m?Number(m[1]):0;});
 const maxSeq=Math.max(0,...remoteBatches.map(b=>b.seq),...localOnly.map(b=>b.seq),...logSeqs,cp?.last_batch?.seq||0);

 // Branch handling.
 let state,action,source;
 if(!remote.exists&&!local.exists){state=logBatches.some(b=>b.branch===ids.branch)||accepted.size?"RESUME":"FRESH";action="CREATE_FROM_MAIN";source=accepted.size?"MAIN_LOG_ONLY":"NONE";}
 else if(!local.exists){state="RESUME";action="CREATE_FROM_REMOTE";source="REMOTE_BRANCH";}
 else if(!remote.exists){state=localOnly.length?"RESUME":"FRESH";action=localOnly.length?"PUSH_PENDING":"NONE";source=localOnly.length?"LOCAL_ONLY":"NONE";}
 else{
  state="RESUME";source="REMOTE_BRANCH";
  const r=local.relation;
  if(r==="EQUAL")action="NONE";
  else if(r==="BEHIND")action="FAST_FORWARD";
  else if(r==="AHEAD")action="PUSH_PENDING"; // batches and/or checkpoint-only commits that GitHub does not have yet
  else action=localOnly.length?"REPLAY_UNPUSHED":"RESET_TO_REMOTE"; // DIVERGED / UNRELATED: replay by content, never by history
 }
 if(action==="PUSH_PENDING")actions.push("PUSH_PENDING: "+(localOnly.length?localOnly.length+" batch file(s) and/or checkpoint updates are":"checkpoint updates are")+" committed locally but not on GitHub — QA, push and verify them before new research");
 if(action==="REPLAY_UNPUSHED")actions.push("REPLAY_UNPUSHED: local and GitHub diverged; "+localOnly.length+" local-only batch(es) will be re-applied on top of GitHub (renumbered, duplicate-checked, QA re-run); nothing already pushed is touched");
 if(action==="RESET_TO_REMOTE")warnings.push("Local branch history is unrelated to GitHub but holds no unpushed batch; it will be reset to the GitHub branch");
 if(checkpoint.found&&checkpoint.trust!=="VERIFIED")warnings.push("CHECKPOINT_NOT_TRUSTED: state was re-derived from the batch files on GitHub; the next checkpoint commit rewrites the record ("+checkpoint.issues.map(i=>i.code).join(", ")+")");
 for(const b of remoteBatches)if(b.ingest.status==="PARTIAL"||b.ingest.status==="REJECTED"||b.ingest.status==="ERROR")
  warnings.push("INGEST_"+b.ingest.status+": "+b.file+" ("+b.ingest.rejected+" rejected) — the exact bytes stay failed; correct the topics in a NEW batch");
 const pending=remoteBatches.filter(b=>b.ingest.status==="PENDING");
 if(pending.length)warnings.push("INGEST_PENDING: "+pending.length+" pushed batch(es) are not in main's research log yet (Topic Research QA / Global Topic Factory still running, red, or the run was superseded); data is safe on GitHub");
 const cur=f.contract?.current,was=cp?.contract;
 if(cur&&was&&(cur.agents_md_sha256!==was.agents_md_sha256||cur.topic_factory_md_sha256!==was.topic_factory_md_sha256))
  warnings.push("CONTRACT_CHANGED: AGENTS.md or docs/TOPIC-FACTORY.md changed since the last checkpoint — re-read them before continuing");
 if(!byDigest.size)warnings.push("NO_RESEARCH_LOG: main has not ingested any research batch yet (data/seo/topic-factory/research-log.json is absent)");
 const open=(cp?.unresolved||[]);
 if(open.some(u=>u.kind==="QA_FAIL"))actions.push("FIX_UNRESOLVED: "+open.filter(u=>u.kind==="QA_FAIL").length+" QA FAIL candidate(s) are kept in the checkpoint; repair them (never force) and include them in a later batch");
 for(const u of open.filter(x=>x.kind==="BLOCKER"))actions.push("BLOCKER: "+u.message);
 const nextSeq=maxSeq+1;
 actions.push("READ_CONTRACT: re-read AGENTS.md and docs/TOPIC-FACTORY.md on main"+(f.main?.sha?"@"+f.main.sha.slice(0,12):"")+" before researching (the research contract is authoritative)");
 actions.push("CONTINUE: research the next "+BATCH_SIZE+" topics → batch "+String(nextSeq).padStart(4,"0")+" (skip every topic in do_not_research)");

 return {session:{agent:ids.agent,session:ids.session,branch:ids.branch,checkpoint:ids.checkpointPath},
  state,source_of_truth:source,
  branch:{action,remote_sha:remote.sha||null,local_sha:local.sha||null,relation:local.exists?(remote.exists?local.relation:"NO_REMOTE"):"NONE"},
  checkpoint:{...checkpoint,recorded:cp?{totals:cp.totals,last_commit_sha:cp.last_commit_sha,updated_at:cp.updated_at}:null},
  batches:remoteBatches.map(b=>({seq:b.seq,file:b.file,sha256:b.sha256,candidates:b.candidates,ingest:b.ingest.status,ta_ids:b.ingest.added})),
  local_only_batches:localOnly.map(b=>({seq:b.seq,file:b.file,sha256:b.sha256,candidates:b.candidates})),
  derived:{qa_pass:remoteBatches.reduce((n,b)=>n+b.candidates,0),pushed:remoteBatches.reduce((n,b)=>n+b.candidates,0),
   pending_push:localOnly.reduce((n,b)=>n+b.candidates,0),ingested_by_main:[...accepted.values()].filter(a=>a.ta_id).length},
  unresolved:open.map(u=>({id:u.id,kind:u.kind,key:u.key||null,message:u.message||null,gates:u.gates?.map(g=>g.gate)||null})),
  do_not_research:{count:accepted.size+unpushed.size,keys:[...accepted.keys(),...unpushed]},
  next:{seq:nextSeq,file:batchFile(ids,nextSeq),size:BATCH_SIZE},
  actions,warnings};
}

/* ------------------------------------------------------------------ planning aid */

/** Domain × locale counts and exactly where a candidate of each domain is placed (never invents Hubs). */
export function planningHints({matrix,map,policy}){
 const arch=map.architecture||{hubs:[],proposed_hubs:[]};
 return (policy.domains||[]).map(d=>{
  const per_locale={};let total=0;
  for(const code of policy.targets.locales){
   const rows=matrix.rows.filter(r=>r.locale===code&&policy.targets.counted_roles.includes(r.role)&&d.clusters.includes(r.cluster)).length;
   const research=(map.locales[code]?.proposals||[]).filter(p=>d.clusters.includes(p.cluster)&&p.status!=="PROMOTED").length;
   per_locale[code]={matrix:rows,research};total+=rows+research;
  }
  let placement;
  if(d.status==="ACTIVE"){
   placement={mode:"EXISTING_HUB",hubs:Object.fromEntries(d.clusters.map(cl=>[cl,{
    parents:Object.fromEntries(matrix.rows.filter(r=>r.role==="HUB"&&r.cluster===cl&&r.status!=="BLOCKED").map(r=>[r.locale,r.id])),
    subclusters:(arch.hubs.find(h=>h.id===cl)?.clusters||[]).filter(c=>!c.reserved_by).map(c=>c.id)}]))};
  }else{
   placement={mode:"PROPOSED_HUB",domain_id:d.id,parent_id:null,
    subclusters:(arch.proposed_hubs.find(h=>h.id===d.clusters[0])?.clusters||[]).map(c=>c.id),
    note:"Stored as ARCHITECTURE_BLOCKED research; never a Matrix row, claim or URL until a reviewed Hub architecture PR"};
  }
  return {id:d.id,label:d.label,status:d.status,placement,total,per_locale};
 });
}
export function localeCapacity({matrix,map,policy,inFlight={}}){
 return Object.fromEntries(policy.targets.locales.map(code=>{
  const u=researchUsage({matrix,map,policy},code);
  return [code,{target:u.target,matrix_rows:u.rows,research_pending:u.pending,in_flight_other_sessions:inFlight[code]||0,
   available:Math.max(0,u.available-(inFlight[code]||0))}];
 }));
}
