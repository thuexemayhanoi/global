#!/usr/bin/env node
/**
 * Owner-approved (2026-10-15) legacy EN/DE pilot provenance intake.
 * Source PR6 manuscript bytes are immutable; older human-reviewed/serp flags
 * were editorial placeholders and are explicitly normalized to FALSE.
 * This prepares SUBMITTED claims only; Auto Publisher + Live QA decide publication.
 */
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {verifyPacket} from "./writer-lanes.mjs";
import {validatePool} from "./writer-pool-core.mjs";
import {articlePath} from "./articles.mjs";
import {PILOT_IDS,PILOT_SOURCE,PILOT_OWNERS,normalizeLegacyPilot} from "./legacy-pilot-core.mjs";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",timeout:60000,maxBuffer:64*1024*1024});
const LEDGER="factory/external-writers/claims.json",REGISTRY="factory/external-writers/protected-drafts.json";
const MANIFEST="approvals/legacy-pilot-intake-20261015.json";
const HASH=/^[0-9a-f]{40}$/;
export function adoptPilot({matrix,ledger,registry,packet,raw,sha,id,now}){
 const owner=PILOT_OWNERS[id],row=matrix.rows.find(x=>x.id===id);
 if(!owner||!row||row.role!=="HUB"||row.status!=="IDEA"||packet.matrix_id!==id||
    packet.locale!==row.locale||packet.proposed_url!==row.url||!HASH.test(sha||"")||
    typeof raw!=="string"||raw.length<500||ledger.claims.some(c=>c.id===id)||
    !registry.held_ids?.some(p=>p.id===id&&p.publication_pr===6)||
    registry.protected.some(p=>p.id===id))
  throw Error("UNAUTHORIZED_OR_DUPLICATE_PILOT_ADOPTION "+id);
 const hash=createHash("sha256").update(raw).digest("hex");
 const claim={id,writer:owner.writer,session:owner.session,branch:owner.branch,
  claim_id:"pilot-manuscript-"+id+"-"+sha.slice(0,12),status:"SUBMITTED",
  phase:"LEGACY_PILOT_QA_INTAKE",at:now,updated_at:now,
  source_sha256:hash,source_commit:sha,
  source_path:"content/articles/"+id+".json",source_branch:PILOT_SOURCE,
  legacy_pilot:{source_pr:6,source_ref:PILOT_SOURCE}};
 const nextLedger=structuredClone(ledger),nextRegistry=structuredClone(registry);
 nextLedger.claims.push(claim);nextLedger.revision++;
 nextRegistry.held_ids=nextRegistry.held_ids.filter(p=>p.id!==id);
 const bad=validatePool(matrix,nextLedger,nextRegistry);
 if(bad.length)throw Error("INVALID_PILOT_CLAIMS "+bad.join("; "));
 return {ledger:nextLedger,registry:nextRegistry,claim};
}
function main(){
 const apply=process.argv.includes("--apply");
 if(apply&&(process.env.GITHUB_ACTIONS!=="true"||
    process.env.GITHUB_WORKFLOW!=="Global Legacy Pilot Hub Intake"||
    git("branch","--show-current").trim()!=="main"))
  throw Error("TRUSTED_WORKFLOW_ONLY");
 const manifest=read(MANIFEST),matrix=read("data/seo/master-matrix.json"),
  board=read("factory/external-writers/assignments.json"),
  locales=read("content/locales.json");
 let ledger=read(LEDGER),registry=read(REGISTRY);
 if(manifest.version!==1||manifest.repo!=="thuexemayhanoi/global"||
    manifest.purpose!=="LEGACY_PILOT_SOURCE_INTAKE"||
    manifest.owner_approved_on!=="2026-10-15"||
    manifest.source_pr!==6||manifest.source_branch!==PILOT_SOURCE||
    JSON.stringify(manifest.ids)!==JSON.stringify(PILOT_IDS)||
    JSON.stringify(manifest.ownership)!==JSON.stringify(PILOT_OWNERS)||
    JSON.stringify(manifest.metadata_normalization)!==
       JSON.stringify({facts_reviewed_by_human:false,serp_intent_checked:false}))
  throw Error("INVALID_PILOT_APPROVAL");
 const baseline=validatePool(matrix,ledger,registry);
 if(baseline.length)throw Error("CURRENT_LEDGER_INVALID "+baseline.join("; "));
 git("fetch","--no-tags","origin","refs/heads/"+PILOT_SOURCE+
     ":refs/remotes/origin/"+PILOT_SOURCE);
 const sha=git("rev-parse","refs/remotes/origin/"+PILOT_SOURCE).trim();
 if(!HASH.test(sha))throw Error("NO_SOURCE_COMMIT");
 const accepted=[],skipped=[];
 for(const id of PILOT_IDS){
  if(ledger.claims.some(c=>c.id===id)){skipped.push({id,reason:"ALREADY_SUBMITTED"});continue;}
  const row=matrix.rows.find(x=>x.id===id);
  if(!row||row.status!=="IDEA"||fs.existsSync(articlePath(row.url))||
     fs.existsSync("content/articles/"+id+".json")){
   skipped.push({id,reason:"NOT_UNPUBLISHED"});continue;
  }
  let raw,packet;
  try{
   raw=git("show",sha+":content/articles/"+id+".json");
   packet=JSON.parse(raw);
  }catch{skipped.push({id,reason:"PILOT_SOURCE_UNAVAILABLE"});continue;}
  // Original flags are explicitly NOT accepted as evidence of review.
  const owner=PILOT_OWNERS[id],candidate={
   id,writer:owner.writer,session:owner.session,branch:owner.branch,
   source_path:"content/articles/"+id+".json",source_branch:PILOT_SOURCE,
   source_commit:sha,source_sha256:createHash("sha256").update(raw).digest("hex"),
   legacy_pilot:{source_pr:6,source_ref:PILOT_SOURCE},status:"SUBMITTED"};
  let normalized;
  try{normalized=normalizeLegacyPilot(packet,candidate);}
  catch(e){skipped.push({id,reason:e.message});continue;}
  // Do not waive Writer QA just because the original PR is old. Use a
  // temporary CLAIMED ticket only for preflight; no mutable work is committed.
  const testLedger=structuredClone(ledger),testRegistry=structuredClone(registry);
  testRegistry.held_ids=testRegistry.held_ids.filter(p=>p.id!==id);
  testLedger.claims.push({id,writer:owner.writer,session:owner.session,branch:owner.branch,
   claim_id:"preflight-"+id,status:"CLAIMED",at:"2026-10-15T00:00:00Z",
   updated_at:"2026-10-15T00:00:00Z"});
  const qa=verifyPacket(normalized,owner.writer,matrix,board,locales,testLedger,testRegistry);
  if(!qa.passed){skipped.push({id,reason:"WRITER_QA_FAIL",issues:qa.errors.slice(0,8)});continue;}
  try{
   const next=adoptPilot({matrix,ledger,registry,packet,raw,sha,id,now:new Date().toISOString()});
   ledger=next.ledger;registry=next.registry;
   accepted.push({id,writer:owner.writer,source_commit:sha,source_sha256:next.claim.source_sha256,words:qa.words});
  }catch(e){skipped.push({id,reason:String(e.message).slice(0,350)});}
 }
 if(apply&&accepted.length){
  fs.writeFileSync(LEDGER,JSON.stringify(ledger,null,2)+"\n");
  fs.writeFileSync(REGISTRY,JSON.stringify(registry,null,2)+"\n");
 }
 console.log(JSON.stringify({mode:apply?"TRUSTED_PILOT_INTAKE":"READ_ONLY_PILOT_QA",
  accepted,skipped,claim_revision:ledger.revision,publication_authorized_by_QA_only:true,
  human_review:false,serp_validated:false,no_external_ai_api:true},null,2));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{main();}catch(e){console.error("PILOT_INTAKE_REFUSED "+e.message);process.exitCode=1;}
}
