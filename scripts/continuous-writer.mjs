#!/usr/bin/env node
/**
 * Deterministic coordinator for ACTIVE external AI chat sessions.
 * This program never calls a model, publishes an article, or loops unattended.
 * After each pair/QA/push, the external agent invokes "next" again.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {validateBoard, pack, inboxFiles, checkDuplicates, verifyPacket} from "./writer-lanes.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const WRITERS=new Set(["W1","W2","W3"]);
const ongoing=new Set(["IDEA","RESEARCHED"]);
const active=new Set(["CLAIMED","SUBMITTED"]);

export function decideNext(matrix,board,ledger,inbox,opts){
 const {writer,session=null,locale=null,count=2}=opts;
 if(!WRITERS.has(writer))throw Error("Use --writer W1|W2|W3");
 if(!Number.isInteger(count)||count!==2)throw Error("Continuous factory uses exactly --count 2 (last available item may be single)");
 if(locale&&!matrix.locales.includes(locale))throw Error("Unknown locale: "+locale);
 const conflicts=validateBoard(matrix,board);
 if(conflicts.length)throw Error("Matrix/Writer assignment drift: "+conflicts.join("; "));
 if(inbox.errors?.length)throw Error("Malformed inbox: "+inbox.errors.join("; "));
 if(ledger.version!==1||!Array.isArray(ledger.claims))throw Error("Invalid writer claims ledger");
 const duplicates=checkDuplicates(inbox.files);
 if(duplicates.length)throw Error("Duplicate drafts: "+duplicates.join("; "));
 const rows=board.entries.filter(e=>e.writer===writer&&(!locale||e.locale===locale)).map(e=>matrix.rows.find(r=>r.id===e.id));
 const mine=inbox.files.filter(f=>f.writer===writer);
 const drafted=new Set(inbox.files.map(f=>f.id));
 const live=ledger.claims.filter(c=>active.has(c.status));
 const heldByOthers=new Set(live.filter(c=>c.status==="SUBMITTED"||!session||c.session!==session||c.writer!==writer).map(c=>c.id));
 const unavailable=new Set([...drafted,...heldByOthers]);
 const existing=mine.filter(f=>rows.some(r=>r.id===f.id));
 const badDrafts=existing.map(f=>({file:f.path,check:verifyPacket(f.packet,writer,matrix,board,load("content/locales.json"))})).filter(x=>!x.check.passed);
 if(badDrafts.length)return {status:"REPAIR_DRAFT",writer,session,items:[],bad_drafts:badDrafts.map(x=>({file:x.file,errors:x.check.errors})),auto_publish:false};
 const reservedBySession=live.filter(c=>c.status==="CLAIMED"&&c.writer===writer&&session&&c.session===session&&!drafted.has(c.id)).map(c=>c.id);
 const first=pack(matrix,board,writer,unavailable,2,locale);
 const reserved=first.filter(r=>reservedBySession.includes(r.id));
 const selected=[...reserved,...first.filter(r=>!reservedBySession.includes(r.id))].slice(0,2);
 const remaining=rows.filter(r=>ongoing.has(r.status)&&!drafted.has(r.id));
 const waitingParent=remaining.filter(r=>r.parent_id&&matrix.rows.find(p=>p.id===r.parent_id)?.status!=="PUBLISHED");
 const pendingReview=rows.filter(r=>drafted.has(r.id)||live.some(c=>c.id===r.id&&c.status==="SUBMITTED"));
 const published=rows.filter(r=>r.status==="PUBLISHED");
 const status=selected.length?"WRITE_NEXT_PAIR":remaining.length?(waitingParent.length===remaining.length?"WAIT_PARENT_PUBLICATION":"WAIT_CLAIM_OR_REVIEW"):(published.length===rows.length?"COMPLETE":"AWAIT_EDITORIAL_REVIEW");
 return {status,writer,session,locale,assigned:rows.length,published:published.length,drafts:pendingReview.length,
  blocked_by_parent:waitingParent.length,remaining_not_drafted:remaining.length,claim_revision:ledger.revision,
  batch_size:selected.length,items:selected.map(r=>({id:r.id,locale:r.locale,role:r.role,title:r.working_title,query:r.primary_query,url:r.url,
    parent_id:r.parent_id,output:"factory/external-writers/inbox/"+writer+"/"+r.id+".json"})),
  next_action:selected.length?"Research and write these items; verify -> commit/push -> wait for writer QA of exact SHA -> refresh main -> call next again, IN THE SAME SESSION.":"Do not invent topics or spin in a busy loop. Resume after editorial publication, claim reconciliation or restored session.",
  auto_publish:false,ai_inside_github_actions:false};
}
function argsOf(argv){
 const opts={};
 for(let i=0;i<argv.length;i++){if(!argv[i].startsWith("--"))throw Error("Unexpected argument "+argv[i]);const k=argv[i].slice(2);opts[k]=argv[i+1]&&!argv[i+1].startsWith("--")?argv[++i]:true;}
 return opts;
}
function main(){
 const [cmd="next",...argv]=process.argv.slice(2),o=argsOf(argv);
 if(!["next","status"].includes(cmd))throw Error("Use next or status");
 const matrix=load("data/seo/master-matrix.json"),board=load("factory/external-writers/assignments.json");
 const ledger=load("factory/external-writers/claims.json"),inbox=inboxFiles();
 const writers=cmd==="status"&&!o.writer?["W1","W2","W3"]:[o.writer];
 const results=writers.map(writer=>decideNext(matrix,board,ledger,inbox,{writer,session:o.session||null,locale:o.locale||null,count:Number(o.count||2)}));
 console.log(JSON.stringify(cmd==="status"&&!o.writer?{writers:results,mode:"ACTIVE_EXTERNAL_SESSIONS_ONLY"}:results[0],null,2));
 if(results.some(x=>x.status==="REPAIR_DRAFT"))process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error("CONTINUOUS_WRITER_REFUSED "+e.message);process.exitCode=1;}
}
