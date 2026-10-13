#!/usr/bin/env node
// /global three external AI lanes: deterministic, read-only dispatch and draft QA.
// No provider SDK, model API, background job, or automatic article publishing.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {checkArticle} from "./articles.mjs";
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
 const files=[],errors=[],ids=new Set();
 for(const w of W){
  const d=path.join(ROOT,INBOX,w);
  if(!fs.existsSync(d))continue;
  for(const file of fs.readdirSync(d)){
   if(file===".gitkeep")continue;
   if(!/^[A-Z]{2}-[HS][0-9]{2}\.json$/.test(file)){errors.push("Invalid inbox filename "+w+"/"+file);continue;}
   const id=file.slice(0,-5),rel=INBOX+"/"+w+"/"+file;
   if(ids.has(id))errors.push("Same ID appears twice "+id);
   ids.add(id);
   try{files.push({id,writer:w,path:rel,packet:read(rel)});}catch(e){errors.push("Unreadable JSON "+rel);}
  }
 }
 return {files,errors};
}
export function pack(matrix,board,writer,claimed=new Set(),count=2,locale=null){
 if(!W.includes(writer))throw Error("Valid writers: W1,W2,W3");
 if(!Number.isInteger(count)||count<1||count>5)throw Error("Batch size 1–5");
 if(locale&&!matrix.locales.includes(locale))throw Error("Unknown locale");
 const rows=board.entries.filter(e=>e.writer===writer).map(e=>matrix.rows.find(x=>x.id===e.id));
 return rows.filter(r=>r&&(r.status==="IDEA"||r.status==="RESEARCHED")&&!claimed.has(r.id)&&(!locale||r.locale===locale)&&(!r.parent_id||matrix.rows.find(x=>x.id===r.parent_id)?.status==="PUBLISHED")).sort((a,b)=>(a.role==="HUB"?0:1)-(b.role==="HUB"?0:1)||matrix.locales.indexOf(a.locale)-matrix.locales.indexOf(b.locale)||a.priority-b.priority||a.id.localeCompare(b.id)).slice(0,count);
}
export function verifyPacket(packet,writer,matrix,board,locales){
 const errors=[],entry=board.entries.find(e=>e.id===packet?.matrix_id),r=matrix.rows.find(e=>e.id===packet?.matrix_id);
 if(!entry||entry.writer!==writer)errors.push("Writer does not own this ID");
 if(!r||!["IDEA","RESEARCHED"].includes(r.status))errors.push("Topic already reserved or published");
 if(packet?.facts_reviewed_by_human!==false)errors.push("Writer must leave human fact review false");
 if(packet?.serp_intent_checked!==false)errors.push("Writer must leave SERP review false for coordinator");
 const checked=checkArticle(packet,matrix,locales,{minimumWords:1000});
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
 const reserved=claims.claims.filter(c=>c.status==="CLAIMED"||c.status==="SUBMITTED");
 const taken=new Set([...inbox.files.map(f=>f.id),...reserved.filter(c=>c.session!==opt.session||c.status==="SUBMITTED").map(c=>c.id)]);
 if(cmd==="status"){
  const status={mode:control.mode,ai_api_calls:0,auto_publish:false};
  for(const w of W){
   const assigned=board.entries.filter(e=>e.writer===w),remaining=assigned.map(e=>matrix.rows.find(r=>r.id===e.id));
   status[w]={assigned:assigned.length,published:remaining.filter(r=>r.status==="PUBLISHED").length,inbox:assigned.filter(e=>taken.has(e.id)).length,next_batch_eligible:pack(matrix,board,w,taken,5).length,blocked_by_parent:remaining.filter(r=>r.status!=="PUBLISHED"&&!taken.has(r.id)&&r.parent_id&&matrix.rows.find(p=>p.id===r.parent_id)?.status!=="PUBLISHED").length};
  }
  console.log(JSON.stringify(status,null,2));return;
 }
 if(cmd==="pack"){
  if(!W.includes(opt.writer))throw Error("Supply --writer W1|W2|W3");
  const rows=pack(matrix,board,opt.writer,taken,Number(opt.count||2),opt.locale||null);
  const brief={repo:"thuexemayhanoi/global",writer:opt.writer,session:opt.session||null,claim_revision:claims.revision,mode:"EXTERNAL_MANUAL_NO_API",max_batch:5,safety:"No automatic publishing; writer claims no human approval",rules:["Read AGENTS.md and factory/external-writers/README.md","Use coordinator claim --session and refresh main before writing; do not start a topic locked by another session","Work only in own inbox; do not edit Matrix or generated HTML","Use researched original writing, between 1,000 and 5,000 useful words and at least 4 substantive H2 sections","At least two genuinely consulted source URLs; never invent legal/price details","Keep facts_reviewed_by_human=false and serp_intent_checked=false; editor will check","Open PR from writer branch; no merge; run writer-lanes verify"],items:rows.map(r=>({id:r.id,locale:r.locale,role:r.role,cluster:r.cluster,primary_query_hypothesis:r.primary_query,title:r.working_title,search_intent:r.search_intent,parent_id:r.parent_id,url:r.url,exact_output:INBOX+"/"+opt.writer+"/"+r.id+".json",writer_session:opt.session||null,related_published:matrix.rows.filter(x=>x.locale===r.locale&&x.status==="PUBLISHED"&&(x.role==="PILLAR"||x.id.endsWith("-CHECKLIST"))).map(x=>({url:x.url,title:x.working_title}))}))};
  console.log(JSON.stringify(brief,null,2));return;
 }
 if(cmd==="verify"||cmd==="verify-all"){
  const chosen=cmd==="verify-all"?inbox.files:inbox.files.filter(f=>f.writer===opt.writer&&f.path===opt.file);
  if(!chosen.length&&cmd==="verify")throw Error("Exact --writer and --file inside your inbox required");
  const checks=chosen.map(f=>{
   const check=verifyPacket(f.packet,f.writer,matrix,board,locales);
   const claim=reserved.find(c=>c.id===f.id);
   if(claim&&claim.session!==f.packet.writer_session){check.errors.push("Draft session does not match coordinator claim");check.passed=false;}
   return {...check,file:f.path};
  });
  const dup=checkDuplicates(inbox.files),passed=checks.every(x=>x.passed)&&dup.length===0;
  console.log(JSON.stringify({mode:"DRAFT_QA_ONLY",passed,checked:checks.length,checks,duplicates:dup,publish_allowed:false},null,2));
  if(!passed)process.exitCode=1;return;
 }
 throw Error("Commands: status | pack --writer W1 --count 2 [--locale en] | verify --writer W1 --file factory/external-writers/inbox/W1/EN-H01.json | verify-all");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("WRITER_LANE_REFUSED "+e.message);process.exitCode=1}
}
