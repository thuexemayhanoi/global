#!/usr/bin/env node
// /global three external AI lanes: deterministic, read-only dispatch and draft QA.
// No provider SDK, model API, background job, or automatic article publishing.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {checkArticle} from "./articles.mjs";
import {poolStatus,validatePool} from "./writer-pool-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const W=["W1","W2","W3"], INBOX="factory/external-writers/inbox";
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const hash=s=>createHash("sha256").update(String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim()).digest("hex");
const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim();
export function validateBoard(matrix,board){
 const problems=[],ids=new Set(),urls=new Set();
 if(board.repo!=="thuexemayhanoi/global"||board.schemaVersion!==1)problems.push("Wrong board identity");
 if(!Array.isArray(board.entries))return ["Board entries are missing"];
 for(const e of board.entries){
  const r=matrix.rows.find(x=>x.id===e.id);
  if(!W.includes(e.writer))problems.push("Invalid writer "+e.id);
  if(ids.has(e.id)||urls.has(e.url))problems.push("Duplicate assignment "+e.id);
  ids.add(e.id);urls.add(e.url);
  if(!r||["url","locale","role","parent_id","cluster"].some(k=>r[k]!==e[k]))problems.push("Matrix drift "+e.id);
 }
 for(const r of matrix.rows.filter(x=>["HUB","SUPPORT"].includes(x.role)&&/\/(topics|guides)\//.test(x.url)))if(!ids.has(r.id))problems.push("Unassigned topic "+r.id);
 return problems;
}
export function inboxFiles(){
 const files=[],errors=[],ids=new Set(),revisions=[];
 const load=rel=>{const raw=fs.readFileSync(path.join(ROOT,rel),"utf8");return {raw,packet:JSON.parse(raw)};};
 for(const w of W){
  const d=path.join(ROOT,INBOX,w);
  if(!fs.existsSync(d))continue;
  for(const file of fs.readdirSync(d)){
   if(file===".gitkeep")continue;
   if(file==="revisions"){
    for(const rf of fs.readdirSync(path.join(d,file))){
     const m=rf.match(/^([A-Z]{2}-[HS][0-9]{2,4})\.r([0-9]+)\.json$/);
     if(!m){errors.push("Invalid revision filename "+w+"/revisions/"+rf);continue;}
     const rel=INBOX+"/"+w+"/revisions/"+rf;
     try{revisions.push({id:m[1],revision:Number(m[2]),writer:w,path:rel,...load(rel)});}catch{errors.push("Unreadable JSON "+rel);}
    }
    continue;
   }
   if(!/^[A-Z]{2}-[HS][0-9]{2,4}\.json$/.test(file)){errors.push("Invalid inbox filename "+w+"/"+file);continue;}
   const id=file.slice(0,-5),rel=INBOX+"/"+w+"/"+file;
   if(ids.has(id))errors.push("Same ID appears twice "+id);
   ids.add(id);
   try{files.push({id,writer:w,path:rel,...load(rel)});}catch(e){errors.push("Unreadable JSON "+rel);}
  }
 }
 return {files,errors,revisions};
}
const draftPath=(writer,id)=>INBOX+"/"+writer+"/"+id+".json";
/**
 * SUBMITTED drafts are immutable evidence the coordinator already accepted; from then on
 * the Auto Publisher, not Writer QA, judges them (so a draft whose page went live, or an
 * older draft under newer rules, never turns a Writer branch red). A recorded file whose
 * bytes match the ledger hash is LOCKED; a recorded file with other bytes is CHANGED.
 * Unrecorded files (new drafts, new revisions) return null and get full Writer QA.
 */
export function submittedLock(file,ledger){
 if(typeof file?.raw!=="string")return null;
 const c=(ledger?.claims||[]).find(x=>x.id===file.id&&x.status==="SUBMITTED"&&x.source_sha256&&
  (x.writer===file.writer||(x.handoffs||[]).some(h=>h.writer===file.writer)));
 if(!c)return null;
 const original=c.handoffs?.[0]?.writer||c.writer;
 const expected=new Map([[c.source_path||draftPath(c.writer,c.id),c.source_sha256]]);
 for(const v of c.revisions||[])expected.set(v.source_path||draftPath(original,c.id),v.source_sha256);
 // Historical branches stay byte-locked after a handoff, even if another
 // Writer now holds the next repair revision.
 for(const h of c.handoffs||[])if(!expected.has(h.source_path))expected.set(h.source_path,h.source_sha256);
 if(!expected.has(file.path))return null;
 const actual=createHash("sha256").update(file.raw).digest("hex");
 return actual===expected.get(file.path)?{state:"LOCKED",sha256:actual}:{state:"CHANGED",expected:expected.get(file.path),actual};
}
/** Writer QA for inbox drafts and revisions (pure): what `verify-all` and the session advisor report. */
export function inboxChecks(entries,matrix,board,locales,ledger=null,registry=null){
 return entries.map(f=>{
  const base={writer:f.writer,id:f.id,file:f.path,warnings:[]};
  const lock=submittedLock(f,ledger);
  if(lock?.state==="LOCKED")return {...base,passed:true,locked:"IMMUTABLE_SUBMITTED",errors:[]};
  if(lock?.state==="CHANGED")return {...base,passed:false,errors:["IMMUTABLE_SUBMITTED_DRAFT_CHANGED "+f.path+": restore the exact submitted bytes (sha256 "+lock.expected.slice(0,12)+"…); a correction is a NEW revisions/"+f.id+".rN.json written for a repair ticket"]};
  const row=matrix.rows.find(r=>r.id===f.id);
  if(f.revision===undefined&&row?.status==="PUBLISHED"&&registry?.protected?.some(p=>p.id===f.id&&p.writer===f.writer))
   return {...base,passed:true,locked:"PUBLISHED_LEGACY_DRAFT",errors:[]};
  const check=verifyPacket(f.packet,f.writer,matrix,board,locales,ledger,registry);
  const errors=[...check.errors];
  if(f.revision!==undefined&&ledger){
   const c=ledger.claims.find(x=>x.id===f.id&&x.writer===f.writer&&x.status==="SUBMITTED");
   if(!c)errors.push("REVISION_WITHOUT_SUBMITTED_DRAFT "+f.path+": "+f.id+" is not SUBMITTED by "+f.writer+" in this branch's ledger. A draft that was never submitted is fixed in place at "+draftPath(f.writer,f.id)+" (no revision file); if it was submitted, merge main first");
   else{
    if(f.packet?.writer_session!==c.session)errors.push("Revision writer_session must be the submitting session "+c.session);
    const next=(c.revisions||[]).length+2;
    if(f.revision!==next)errors.push("REVISION_NUMBER "+f.path+": the next revision of "+f.id+" is r"+next+" (merge main if the ledger moved)");
   }
  }
  return {...check,...base,warnings:check.warnings||[],passed:errors.length===0,errors};
 });
}
export function pack(matrix,board,writer,claimed=new Set(),count=2,locale=null){
 if(!W.includes(writer))throw Error("Valid writers: W1,W2,W3");
 if(!Number.isInteger(count)||count<1||count>5)throw Error("Batch size 1–5");
 if(locale&&!matrix.locales.includes(locale))throw Error("Unknown locale");
 const rows=board.entries.filter(e=>e.writer===writer).map(e=>matrix.rows.find(x=>x.id===e.id));
 return rows.filter(r=>r&&(r.status==="IDEA"||r.status==="RESEARCHED")&&!claimed.has(r.id)&&(!locale||r.locale===locale)&&(!r.parent_id||matrix.rows.find(x=>x.id===r.parent_id)?.status==="PUBLISHED")).sort((a,b)=>(a.role==="HUB"?0:1)-(b.role==="HUB"?0:1)||matrix.locales.indexOf(a.locale)-matrix.locales.indexOf(b.locale)||a.priority-b.priority||a.id.localeCompare(b.id)).slice(0,count);
}
export function verifyPacket(packet,writer,matrix,board,locales,ledger=null,registry=null){
 const errors=[],entry=board.entries.find(e=>e.id===packet?.matrix_id),r=matrix.rows.find(e=>e.id===packet?.matrix_id);
 if(ledger&&registry){
  const id=packet?.matrix_id;
  const legacy=registry.protected.find(p=>p.id===id&&p.writer===writer&&p.session===packet?.writer_session);
  const live=ledger.claims.filter(c=>c.id===id&&(c.status==="CLAIMED"||c.status==="SUBMITTED"));
  if(!legacy&&!live.some(c=>c.writer===writer&&c.session===packet?.writer_session)){
   errors.push("Missing confirmed dynamic-pool claim or protected legacy Writer draft for "+id);
  }
 }else if(!entry||entry.writer!==writer)errors.push("Writer does not own this ID");
 if(!r||!["IDEA","RESEARCHED"].includes(r.status))errors.push("Topic already reserved or published");
 if(packet?.facts_reviewed_by_human!==false)errors.push("Writer must leave human fact review false");
 if(packet?.serp_intent_checked!==false)errors.push("Writer must leave SERP review false for coordinator");
 const checked=checkArticle(packet,matrix,locales,{minimumWords:1000,allowUnpublishedParentForDraft:true});
 if(checked.words>5000)errors.push("Over 5,000 words; remove repetitive sections");
 if((String(packet?.body_markdown||"").match(/^##\s+\S/gm)||[]).length<4)errors.push("Minimum four meaningful H2 sections required");
 const reserved=new Set(["Human editorial fact review is required","SERP search-intent confirmation is required"]);
 errors.push(...checked.errors.filter(x=>!reserved.has(x)));
 return {passed:errors.length===0,writer,id:packet?.matrix_id,words:checked.words,errors,warnings:checked.warnings,hash:hash(packet?.body_markdown),title:norm(packet?.title)};
}
export function checkDuplicates(files){
 const errors=[],hashes=new Map(),titles=new Map();
 for(const f of files){
  const body=hash(f.packet.body_markdown),title=f.packet.locale+"::"+norm(f.packet.title);
  if(hashes.has(body))errors.push("Duplicated body "+f.path+" and "+hashes.get(body));else hashes.set(body,f.path);
  if(titles.has(title))errors.push("Duplicated locale title "+f.path+" and "+titles.get(title));else titles.set(title,f.path);
 }
 return errors;
}
function flags(argv){
 const args={};for(let i=0;i<argv.length;i++)if(argv[i].startsWith("--")){const k=argv[i].slice(2);args[k]=(argv[i+1]&&!argv[i+1].startsWith("--"))?argv[++i]:true;}return args;
}
export function main(argv=process.argv.slice(2)){
 const cmd=argv[0]||"status",opt=flags(argv.slice(1));
 const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json"),control=read("factory/external-writers/control.json"),locales=read("content/locales.json");
 const claims=read("factory/external-writers/claims.json");
 const boardProblems=validateBoard(matrix,board),inbox=inboxFiles();
 if(boardProblems.length||inbox.errors.length)throw Error([...boardProblems,...inbox.errors].join("; "));
 const registry=read("factory/external-writers/protected-drafts.json");
 const poolFaults=validatePool(matrix,claims,registry);
 if(poolFaults.length)throw Error(poolFaults.join("; "));
 if(cmd==="status"){
  const status={mode:control.mode,ai_api_calls:0,auto_publish:false,claim_revision:claims.revision,protected_drafts:registry.protected.length+(registry.held_ids||[]).length};
  for(const w of W){
   const preview=poolStatus(matrix,claims,registry,{writer:w});
   status[w]={legacy_assignments:board.entries.filter(e=>e.writer===w).length,
    shared_available_now:preview.available_now,published:preview.published,protected_drafts:preview.protected_drafts,
    active_claims:claims.claims.filter(c=>c.writer===w&&c.status==="CLAIMED").length};
  }
  console.log(JSON.stringify(status,null,2));return;
 }
 if(cmd==="pack"){
  if(!W.includes(opt.writer))throw Error("Supply --writer W1|W2|W3");
  const preview=poolStatus(matrix,claims,registry,{writer:opt.writer,session:opt.session,locale:opt.locale});
  const brief={repo:"thuexemayhanoi/global",mode:"READ_ONLY_DYNAMIC_POOL_PREVIEW_NOT_A_CLAIM",writer:opt.writer,
   claim_revision:claims.revision,eligible_shared:preview.available_now,items:preview.items,
   safety:"Preview is not a claim. Start/push a Writer request once; green Writer QA auto-claims up to 10. Fetch main before drafting.",
   auto_publish:false};
  console.log(JSON.stringify(brief,null,2));return;
 }
 if(cmd==="verify"||cmd==="verify-all"){
  const all=[...inbox.files,...(inbox.revisions||[])];
  const chosen=cmd==="verify-all"?all:all.filter(f=>f.writer===opt.writer&&f.path===opt.file);
  if(!chosen.length&&cmd==="verify")throw Error("Exact --writer and --file inside your inbox required");
  const checks=inboxChecks(chosen,matrix,board,locales,claims,registry);
  const dup=checkDuplicates(inbox.files),passed=checks.every(x=>x.passed)&&dup.length===0;
  const locked=checks.filter(x=>x.locked).length;
  console.log(JSON.stringify({mode:"DRAFT_QA_ONLY",passed,checked:checks.length-locked,locked_submitted:locked,checks,duplicates:dup,publish_allowed:false,
   next_action:passed?"Push your own Writer branch; green Writer QA triggers the coordinator.":"Fix the listed errors. A draft that is not SUBMITTED yet is edited in place and re-checked; a SUBMITTED draft is never edited (repairs use revisions/<ID>.rN.json from a repair ticket)."},null,2));
  if(!passed)process.exitCode=1;return;
 }
 throw Error("Commands: status | pack (preview only, claim required) | verify | verify-all");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("WRITER_LANE_REFUSED "+e.message);process.exitCode=1}
}
