#!/usr/bin/env node
/**
 * A–Z reviewed metadata batches (owner directive 2026-10-28, audit PR #119). Reuses the V11 application unchanged:
 * every row passes the V11 validator (no new numeric claim, packet bounds, no duplicate final title/description,
 * explicit review basis) and `applyBatch` proves that each rebuilt page differs only by the approved metadata echoes,
 * preserves the visible lead, re-freezes only the changed title/description fields and rolls back on any failure.
 * Unlike V11 it does not require a review row for every packet: only the reviewed rows are planned.
 *   node scripts/seo/metadata-az.mjs check
 *   node scripts/seo/metadata-az.mjs plan --write
 *   node scripts/seo/metadata-az.mjs apply --batch=N
 * The helper does not generate prose, publish, commit, push or merge.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {validateReviews,applyBatch,LOCALES} from "./metadata-v11.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const DIR="docs/seo-audit/execution";
const REVIEWS=DIR+"/metadata-reviews.json",PLAN=DIR+"/metadata-plan.json",RECEIPTS=DIR+"/batches";
export const SCOPE="AZ_REVIEWED_METADATA_ONLY";
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const stableBody=p=>{const {title,meta_description,...rest}=p;return JSON.stringify(rest);};
const fail=errors=>{if(errors.length)throw Error(errors.join("\n"));};

function readPackets(root){
 const m=new Map();
 for(const name of fs.readdirSync(path.join(root,"content/articles")).filter(n=>n.endsWith(".json")).sort()){
  const packet=JSON.parse(fs.readFileSync(path.join(root,"content/articles",name),"utf8"));
  m.set(packet.matrix_id,{packet});
 }
 return m;
}
/** Deterministic batches of at most 50 OPTIMIZE rows, ordered by locale then ID. */
export function createAzPlan(packets,reviews,{size=50,baseCommit=""}={}){
 if(!Number.isInteger(size)||size<1||size>50)throw Error("batch size must be 1..50");
 fail(validateReviews(packets,reviews,{requireCoverage:false}));
 const records=[...reviews].sort((a,b)=>LOCALES.indexOf(a.locale)-LOCALES.indexOf(b.locale)||a.id.localeCompare(b.id))
  .map(r=>({...r,protected_packet_sha256:sha(stableBody(packets.get(r.id).packet))}));
 const pending=records.filter(r=>r.decision==="OPTIMIZE"),batches=[];
 for(let at=0;at<pending.length;at+=size)batches.push({batch:batches.length+1,ids:pending.slice(at,at+size).map(r=>r.id)});
 return {version:1,scope:SCOPE,base_commit:baseCommit,batch_size:size,reviewed:records.length,optimized:pending.length,batches,records};
}
function main(argv){
 const command=argv[0]||"check";
 if(command==="apply"){
  const n=Number(argv.find(a=>a.startsWith("--batch="))?.slice(8));
  if(!Number.isInteger(n)||n<1)throw Error("apply needs --batch=N");
  const plan=JSON.parse(fs.readFileSync(path.join(ROOT,PLAN),"utf8"));
  const r=applyBatch(ROOT,plan,n,{scope:SCOPE,receiptDir:RECEIPTS,requireCoverage:false});
  console.log(JSON.stringify({batch:r.batch,status:r.status,urls:r.ids.length,titles:r.titles_changed,descriptions:r.descriptions_changed},null,2));
  return;
 }
 if(!["check","plan"].includes(command))throw Error("usage: metadata-az.mjs [check|plan --write|apply --batch=N]");
 const reviews=JSON.parse(fs.readFileSync(path.join(ROOT,REVIEWS),"utf8"));
 const plan=createAzPlan(readPackets(ROOT),reviews,{baseCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8"}).trim()});
 if(command==="plan"&&argv.includes("--write")){
  if(fs.existsSync(path.join(ROOT,PLAN)))throw Error("plan already exists; recover it instead of replacing");
  fs.writeFileSync(path.join(ROOT,PLAN),JSON.stringify(plan,null,2)+"\n");
 }
 console.log(JSON.stringify({status:"VALID",reviewed:plan.reviewed,optimized:plan.optimized,batches:plan.batches.map(b=>b.ids.length)}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main(process.argv.slice(2));}catch(e){console.error("METADATA_AZ_REFUSED "+e.message);process.exitCode=1;}
