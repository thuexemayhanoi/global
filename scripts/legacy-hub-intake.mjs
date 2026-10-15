#!/usr/bin/env node
/**
 * Trusted owner-approved legacy Hub intake. The original W1/PR17 draft bytes
 * are never modified: claims point to exact git commit and SHA-256 evidence.
 * New claims are SUBMITTED only after full Writer QA; Auto Publisher retains
 * independent source, legal, duplicate, editorial and live-HTTP gates.
 *
 * --apply only under "Global Legacy Hub Intake" on a clean main checkout.
 * Default is read-only; max two accepted claims per invocation.
 */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {verifyPacket} from "./writer-lanes.mjs";
import {validatePool} from "./writer-pool-core.mjs";
import {articlePath} from "./articles.mjs";

const ROOT=process.cwd(),read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const git=(...args)=>execFileSync("git",args,{cwd:ROOT,encoding:"utf8",timeout:60000,maxBuffer:64*1024*1024});
const MANIFEST="approvals/legacy-hub-intake-20261015.json";
const CLAIMS="factory/external-writers/claims.json";
const REGISTRY="factory/external-writers/protected-drafts.json";
const SOURCE_RE=/^writer\/w[123]-[A-Za-z0-9_-]+$/;
const SHA=/^[0-9a-f]{40}$/;
export function adoptLegacyHub({ledger,registry,matrix,entry,packet,raw,sha,now}){
 const problems=[];
 if(!entry||entry.writer!=="W1"||entry.source_pr!==17)problems.push("Wrong protected source entry");
 const row=matrix.rows.find(r=>r.id===entry?.id);
 if(!row||row.role!=="HUB"||row.status!=="IDEA")problems.push("Hub must be an unpublished IDEA row");
 if(!SOURCE_RE.test(entry?.branch||""))problems.push("Invalid legacy branch");
 if(!SHA.test(sha||""))problems.push("Invalid exact source commit");
 if(typeof raw!=="string"||raw.length<400||packet?.matrix_id!==entry?.id||
    packet?.writer_session!==entry?.session||packet?.proposed_url!==row?.url)
  problems.push("Mismatch with immutable source, Matrix or session");
 if(ledger.claims.some(c=>c.id===entry?.id))problems.push("Existing claim ID");
 if(!(registry.protected||[]).some(p=>p.id===entry?.id&&p.branch===entry?.branch))
  problems.push("No matching protected legacy source");
 if((registry.held_ids||[]).some(p=>p.id===entry?.id))problems.push("Editorial hold cannot be imported");
 if(problems.length)throw Error(problems.join("; "));
 const hash=createHash("sha256").update(raw).digest("hex");
 const nextLedger=structuredClone(ledger),nextRegistry=structuredClone(registry);
 nextLedger.claims.push({
  id:entry.id,writer:entry.writer,session:entry.session,branch:entry.branch,
  claim_id:"legacy-intake-"+entry.id+"-"+sha.slice(0,12),
  status:"SUBMITTED",phase:"LEGACY_IMMUTABLE_QA_INTAKE",at:now,updated_at:now,
  source_sha256:hash,source_commit:sha
 });
 nextRegistry.protected=nextRegistry.protected.filter(p=>p.id!==entry.id);
 nextLedger.revision++;
 const invalid=validatePool(matrix,nextLedger,nextRegistry);
 if(invalid.length)throw Error("IMPORT_INVARIANT_FAILURE "+invalid.join("; "));
 return {ledger:nextLedger,registry:nextRegistry,sha256:hash};
}
function main(){
 const apply=process.argv.includes("--apply");
 if(apply&&(process.env.GITHUB_ACTIONS!=="true"||
    process.env.GITHUB_WORKFLOW!=="Global Legacy Hub Intake"||
    git("branch","--show-current").trim()!=="main"))
  throw Error("TRUSTED_MAIN_WORKFLOW_ONLY");
 const manifest=read(MANIFEST);
 if(manifest.repo!=="thuexemayhanoi/global"||manifest.version!==1||
    manifest.kind!=="LEGACY_HUB_SOURCE_INTAKE"||
    manifest.owner_approved_on!=="2026-10-15"||manifest.source_pr!==17||
    !SOURCE_RE.test(manifest.source_branch)||manifest.batch_size!==2||
    !Array.isArray(manifest.ids)||new Set(manifest.ids).size!==manifest.ids.length||
    manifest.ids.length!==14)
  throw Error("INVALID_OWNER_APPROVAL_MANIFEST");
 const matrix=read("data/seo/master-matrix.json");
 const board=read("factory/external-writers/assignments.json");
 const locales=read("content/locales.json");
 let ledger=read(CLAIMS),registry=read(REGISTRY);
 const baseline=validatePool(matrix,ledger,registry);
 if(baseline.length)throw Error("CURRENT_POOL_INVALID "+baseline.join("; "));
 git("fetch","--no-tags","origin","refs/heads/"+manifest.source_branch+
   ":refs/remotes/origin/"+manifest.source_branch);
 const sha=git("rev-parse","refs/remotes/origin/"+manifest.source_branch).trim();
 if(!SHA.test(sha))throw Error("NO_EXACT_SOURCE_COMMIT");
 const accepted=[],skipped=[],already=[];
 for(const id of manifest.ids){
  if(ledger.claims.some(c=>c.id===id)){
   already.push(id);continue;
  }
  const entry=registry.protected.find(p=>p.id===id&&p.branch===manifest.source_branch);
  if(!entry){skipped.push({id,reason:"MISSING_OR_DIFFERENT_PROTECTION"});continue;}
  const row=matrix.rows.find(x=>x.id===id);
  if(row?.role!=="HUB"||row?.status!=="IDEA"||fs.existsSync(articlePath(row.url))||
     fs.existsSync("content/articles/"+id+".json")){
   skipped.push({id,reason:"NOT_A_NEW_UNPUBLISHED_HUB"});continue;
  }
  if(accepted.length===manifest.batch_size){skipped.push({id,reason:"NEXT_BATCH"});continue;}
  const file="factory/external-writers/inbox/"+entry.writer+"/"+id+".json";
  let raw,packet;
  try{raw=git("show",sha+":"+file);packet=JSON.parse(raw);}
  catch{skipped.push({id,reason:"MISSING_OR_MALFORMED_IMMUTABLE_SOURCE"});continue;}
  const qa=verifyPacket(packet,entry.writer,matrix,board,locales,ledger,registry);
  if(!qa.passed){
   skipped.push({id,reason:"WRITER_QA_FAIL",errors:qa.errors.slice(0,8)});continue;
  }
  try{
   const next=adoptLegacyHub({ledger,registry,matrix,entry,packet,raw,sha,now:new Date().toISOString()});
   ledger=next.ledger;registry=next.registry;
   accepted.push({id,writer:entry.writer,branch:entry.branch,source_commit:sha,
     source_sha256:next.sha256,words:qa.words});
  }catch(e){skipped.push({id,reason:String(e.message).slice(0,300)});}
 }
 if(apply&&accepted.length){
  fs.writeFileSync(CLAIMS,JSON.stringify(ledger,null,2)+"\n");
  fs.writeFileSync(REGISTRY,JSON.stringify(registry,null,2)+"\n");
 }
 console.log(JSON.stringify({mode:apply?"TRUSTED_IMPORT":"READ_ONLY_DRY_RUN",
  claim_revision:ledger.revision,accepted,already,skipped,
  ready_to_publish:false,publisher_gates_required:true,no_ai_api:true},null,2));
}
if(process.argv[1]&&process.argv[1]===fileURLToPath(import.meta.url)){
 try{main();}catch(e){console.error("LEGACY_HUB_INTAKE_REFUSED "+e.message);process.exitCode=1;}
}
