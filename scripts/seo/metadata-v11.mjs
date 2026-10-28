#!/usr/bin/env node
/** V11 reviewed metadata coordinator. No text generation, network, git writes or broad re-freeze. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {collectHtml} from "./seo-guard.mjs";
import {fingerprint,pageFile} from "./seo-guard-core.mjs";

export const LOCALES=["vi","en","de","fr","es","nl","zh","pt","ko","ja"];
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const PLAN="docs/seo-v11/inventory.json";
const FREEZE="data/seo/url-freeze.json";
const LEADS="content/article-leads.json";
const KEYS=new Set(["id","url","locale","before_title","before_description","after_title","after_description","decision","reason","candidate_source","body_reviewed","width_review","review_scope","primary_query","cluster","parent_id","body_sha256","review_basis","source_body_sha256","search_intent","out_of_scope_issue"]);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const stableBody=p=>{const {title,meta_description,...rest}=p;return JSON.stringify(rest);};
const protectedId=id=>/^(?:VI|EN|DE|FR|ES|NL|PT)-S(?:0[1-9]|10)$/.test(id);
const fail=errors=>{if(errors.length)throw Error(errors.join("\n"));};
const tuple=(p,t="title",d="meta_description")=>[p[t],p[d]];
const before=r=>tuple(r,"before_title","before_description");
const after=r=>tuple(r,"after_title","after_description");
const normalized=s=>String(s).normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu," ").trim();

/** Entire inventory is checked before any content mutation. Previously applied pairs are resumable. */
export function validateReviews(packets,reviews,{requireCoverage=true}={}){
 const errors=[],seen=new Set(),titles=new Map(),descriptions=new Map();
 for(const r of reviews){
  if(!r||typeof r!=="object"){errors.push("malformed review");continue;}
  const id=r.id,p=packets.get(id)?.packet??packets.get(id);
  if(seen.has(id))errors.push("duplicate review ID "+id);seen.add(id);
  for(const k of Object.keys(r))if(!KEYS.has(k))errors.push(id+": unauthorized review field "+k);
  if(!p){errors.push("unknown packet "+id);continue;}
  if(r.url!==p.proposed_url||r.locale!==p.locale||!LOCALES.includes(r.locale))errors.push(id+": URL/locale mismatch");
  if(!["KEEP","KEEP_APPROVED","OPTIMIZE","BLOCKED"].includes(r.decision))errors.push(id+": invalid decision");
  if(r.body_reviewed!==true||typeof r.reason!=="string"||r.reason.trim().length<20)errors.push(id+": explicit body review and editorial reason required");
  if(!["PR86","V11","CURRENT"].includes(r.candidate_source))errors.push(id+": invalid candidate source");
  for(const k of ["before_title","before_description","after_title","after_description"])
   if(typeof r[k]!=="string"||!r[k].trim()||r[k]!==r[k].trim())errors.push(id+": invalid "+k);
  if(!equal(tuple(p),before(r))&&!equal(tuple(p),after(r)))errors.push(id+": stale or partially applied metadata pair");
  for(const k of ["body_sha256","source_body_sha256"])if(r[k]&&r[k]!==sha(p.body_markdown))errors.push(id+": source body hash drift");
  const changed=!equal(before(r),after(r));
  if(changed&&r.decision!=="OPTIMIZE")errors.push(id+": non-OPTIMIZE decision changes metadata");
  if(!changed&&r.decision==="OPTIMIZE")errors.push(id+": OPTIMIZE has no change");
  if(protectedId(id)&&(changed||r.decision!=="KEEP_APPROVED"))errors.push(id+": previously approved metadata is protected");
  if(changed){
   // Existing packet constraints, not Google snippet character limits.
   if(r.after_title?.length<16||r.after_title?.length>110||r.after_description?.length<80||r.after_description?.length>205)errors.push(id+": outside existing article packet bounds");
   const allowed=new Set((r.before_title+" "+r.before_description+" "+p.h1+" "+p.body_markdown).match(/\d+/g)||[]);
   for(const n of ((r.after_title||"")+" "+(r.after_description||"")).match(/\d+/g)||[])if(!allowed.has(n))errors.push(id+": new numeric claim "+n);
  }
  for(const [map,key,label]of [[titles,normalized(r.after_title),"title"],[descriptions,normalized(r.after_description),"description"]]){
   const k=r.locale+":"+key;if(map.has(k))errors.push(id+": duplicate final "+label+" with "+map.get(k));else map.set(k,id);
  }
 }
 if(requireCoverage)for(const id of packets.keys())if(!seen.has(id))errors.push("unreviewed packet "+id);
 return errors;
}
export function createPlan(packets,reviews,{size=40,baseCommit=""}={}){
 if(!Number.isInteger(size)||size<1||size>50)throw Error("batch size must be 1..50");
 fail(validateReviews(packets,reviews));
 const records=[...reviews].sort((a,b)=>LOCALES.indexOf(a.locale)-LOCALES.indexOf(b.locale)||a.id.localeCompare(b.id)).map(r=>{
  const p=packets.get(r.id)?.packet??packets.get(r.id);
  return {...r,protected_packet_sha256:sha(stableBody(p))};
 });
 const pending=records.filter(r=>r.decision==="OPTIMIZE");
 const batches=[];for(let at=0;at<pending.length;at+=size)batches.push({batch:batches.length+1,ids:pending.slice(at,at+size).map(r=>r.id)});
 return {version:1,scope:"V11_REVIEWED_METADATA_ONLY",base_commit:baseCommit,batch_size:size,reviewed:records.length,optimized:pending.length,batches,records};
}
function readPackets(root){
 const m=new Map();
 for(const name of fs.readdirSync(path.join(root,"content/articles")).filter(n=>n.endsWith(".json")).sort()){
  const file="content/articles/"+name,raw=fs.readFileSync(path.join(root,file),"utf8"),packet=JSON.parse(raw);
  if(m.has(packet.matrix_id))throw Error("duplicate packet "+packet.matrix_id);
  m.set(packet.matrix_id,{file,raw,packet});
 }
 return m;
}
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const json=v=>JSON.stringify(v).replace(/</g,"\\u003c");
/** Exact expected metadata echoes in the existing renderer; body/heading/link markup stays byte-identical. */
export function expectedMetadataHtml(html,r){
 let expected=html;
 const replacements=[
  ["<title>"+esc(r.before_title)+"</title>","<title>"+esc(r.after_title)+"</title>"],
  ['<meta name="description" content="'+esc(r.before_description)+'">','<meta name="description" content="'+esc(r.after_description)+'">'],
  ['<meta property="og:title" content="'+esc(r.before_title)+'">','<meta property="og:title" content="'+esc(r.after_title)+'">'],
  ['<meta property="og:description" content="'+esc(r.before_description)+'">','<meta property="og:description" content="'+esc(r.after_description)+'">']
 ];
 for(const [a,b]of replacements){if(!expected.includes(a))throw Error(r.id+": expected metadata echo missing");expected=expected.replace(a,b);}
 let article=0,breadcrumb=0;
 expected=expected.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(whole,raw)=>{
  const data=JSON.parse(raw),nodes=Array.isArray(data)?data:Array.isArray(data?.["@graph"])?data["@graph"]:[data];let changed=false;
  for(const n of nodes){
   if(n["@type"]==="Article"&&n.mainEntityOfPage==="https://global.rentbikehanoi.com"+r.url){
    if(n.headline!==r.before_title||n.description!==r.before_description)throw Error(r.id+": Article metadata drift");
    n.headline=r.after_title;n.description=r.after_description;article++;changed=true;
   }
   if(n["@type"]==="BreadcrumbList")for(const item of n.itemListElement||[])if(item.item==="https://global.rentbikehanoi.com"+r.url){
    if(item.name!==r.before_title)throw Error(r.id+": breadcrumb title drift");item.name=r.after_title;breadcrumb++;changed=true;
   }
  }
  return changed?'<script type="application/ld+json">'+json(data)+'</script>':whole;
 });
 if(article!==1||breadcrumb!==1)throw Error(r.id+": expected single Article and breadcrumb metadata echo");
 return expected;
}
/** Preserve the old content baseline and every unrelated fingerprint; never bless a full rebuilt registry. */
export function selectiveFreeze(previous,files,targets){
 const out=structuredClone(previous),byUrl=new Map(targets.map(r=>[r.url,r])),errors=[];
 for(const item of out.urls){
  const source=files[pageFile(item.url)];if(typeof source!=="string"){errors.push("missing frozen HTML "+item.url);continue;}
  const fp=fingerprint(source),r=byUrl.get(item.url);
  for(const key of Object.keys(item.fingerprint)){
   if(r&&["title","description"].includes(key)){
    const wanted=key==="title"?r.after_title:r.after_description;
    if(fp[key]!==wanted)errors.push(item.url+": reviewed "+key+" not rendered");
    item.fingerprint[key]=wanted;
   }else if(!equal(fp[key],item.fingerprint[key]))errors.push(item.url+": unauthorized fingerprint change "+key);
  }
 }
 for(const r of targets)if(!out.urls.some(u=>u.url===r.url))errors.push("target not frozen "+r.url);
 fail(errors);return out;
}
function run(root,script,args=[]){
 const output=execFileSync(process.execPath,[script,...args],{cwd:root,encoding:"utf8",maxBuffer:32*1024*1024});
 return {script,args,output_sha256:sha(output),last_line:output.trim().split("\n").at(-1)};
}
/** `scope`/`receiptDir`/`requireCoverage` let a later reviewed metadata programme (A–Z: AZ_REVIEWED_METADATA_ONLY)
 * reuse the same exact-echo application; V11 defaults are unchanged. */
export function applyBatch(root,plan,batchNumber,{scope="V11_REVIEWED_METADATA_ONLY",receiptDir="docs/seo-v11/batches",requireCoverage=true}={}){
 const branch=execFileSync("git",["branch","--show-current"],{cwd:root,encoding:"utf8"}).trim();
 if(!branch||branch==="main"||branch==="master")throw Error("apply requires a named feature branch");
 if(plan.version!==1||plan.scope!==scope)throw Error("invalid reviewed plan");
 const batch=plan.batches.find(b=>b.batch===batchNumber);if(!batch)throw Error("unknown batch "+batchNumber);
 const packets=readPackets(root),reviews=plan.records.map(({protected_packet_sha256,...r})=>r);
 fail(validateReviews(packets,reviews,{requireCoverage}));
 for(const r of plan.records)if(sha(stableBody(packets.get(r.id).packet))!==r.protected_packet_sha256)throw Error(r.id+": non-metadata packet content drifted since plan");
 const targets=batch.ids.map(id=>plan.records.find(r=>r.id===id));
 if(targets.some(r=>!r||r.decision!=="OPTIMIZE"))throw Error("invalid batch target");
 const statuses=targets.map(r=>equal(tuple(packets.get(r.id).packet),after(r))?"AFTER":"BEFORE");
 if(statuses.every(s=>s==="AFTER"))return {batch:batchNumber,status:"ALREADY_APPLIED",ids:batch.ids};
 if(statuses.some(s=>s==="AFTER"))throw Error("mixed applied/unapplied batch; inspect checkpoint before continuing");
 const checks=[run(root,"scripts/build.mjs",["--check"]),run(root,"scripts/seo/seo-guard.mjs",["--strict"])];
 const htmlBefore=collectHtml(root),registry=JSON.parse(fs.readFileSync(path.join(root,FREEZE),"utf8"));
 const tracked=execFileSync("git",["ls-files","-z"],{cwd:root,encoding:"utf8"}).split("\0").filter(Boolean);
 const snapshot=new Map([...new Set([...tracked,LEADS])].map(f=>[f,fs.readFileSync(path.join(root,f))]));
 const targetPaths=new Set(targets.map(r=>packets.get(r.id).file)),targetHtml=new Map(targets.map(r=>[pageFile(r.url),r]));
 const allowed=new Set([...targetPaths,...targetHtml.keys(),FREEZE,LEADS,"data/seo/content-graph.json","docs/GLOBAL-SITE-MATRIX.md"]);
 const receipt=receiptDir+"/batch-"+String(batchNumber).padStart(3,"0")+".json";
 try{
  const leads=JSON.parse(snapshot.get(LEADS).toString("utf8"));
  if(leads.version!==1||!leads.leads||typeof leads.leads!=="object"||Array.isArray(leads.leads))throw Error("invalid article lead preservation sidecar");
  for(const r of targets)if(r.before_description!==r.after_description){
   if(!Object.hasOwn(leads.leads,r.id))leads.leads[r.id]=r.before_description;
   else if(typeof leads.leads[r.id]!=="string"||!leads.leads[r.id].trim())throw Error("invalid preserved article lead "+r.id);
  }
  fs.writeFileSync(path.join(root,LEADS),JSON.stringify(leads,null,2)+"\n");
  for(const r of targets){const e=packets.get(r.id),p={...e.packet,title:r.after_title,meta_description:r.after_description};fs.writeFileSync(path.join(root,e.file),JSON.stringify(p,null,2)+"\n");}
  checks.push(run(root,"scripts/build.mjs"));
  const htmlAfter=collectHtml(root);
  if(!equal(Object.keys(htmlBefore).sort(),Object.keys(htmlAfter).sort()))throw Error("generated HTML route inventory changed");
  for(const [file,old]of Object.entries(htmlBefore)){
   const r=targetHtml.get(file),expected=r?expectedMetadataHtml(old,r):old;
   if(htmlAfter[file]!==expected)throw Error(file+": generated HTML changed outside exact approved metadata echoes");
  }
  const selective=selectiveFreeze(registry,htmlAfter,targets);
  fs.writeFileSync(path.join(root,FREEZE),JSON.stringify(selective,null,2)+"\n");
  checks.push(run(root,"scripts/seo/content-graph.mjs",["--write"]));
  const fresh=readPackets(root);
  for(const [id,old]of packets){const now=fresh.get(id);if(!now)throw Error("packet disappeared "+id);if(targetPaths.has(old.file)){if(stableBody(now.packet)!==stableBody(old.packet))throw Error("protected packet field changed "+id);}else if(now.raw!==old.raw)throw Error("unselected packet changed "+id);}
  if(fresh.size!==packets.size)throw Error("packet inventory changed");
  const changed=[];
  for(const [file,raw]of snapshot){const now=fs.readFileSync(path.join(root,file));if(raw.equals(now))continue;changed.push(file);if(!allowed.has(file)&&!/^assets\/search-index\/(?:vi|en|de|fr|es|nl|zh|pt|ko|ja)-\d+\.json$/.test(file))throw Error("unauthorized tracked file changed "+file);}
  for(const [script,args]of [["scripts/build.mjs",["--check"]],["scripts/seo/seo-guard.mjs",["--strict"]],["scripts/seo/fact-guard.mjs",[]],["scripts/seo/content-graph.mjs",["--check"]],["scripts/seo/validate-plan.mjs",[]],["scripts/nav-qa.mjs",[]],["scripts/seo/audit-static.mjs",["--fail-p0"]]])checks.push(run(root,script,args));
  const result={batch:batchNumber,status:"LOCAL_GATES_PASSED_AWAITING_CI_DEPLOY",branch,ids:batch.ids,titles_changed:targets.filter(r=>r.before_title!==r.after_title).length,descriptions_changed:targets.filter(r=>r.before_description!==r.after_description).length,changed_files:changed,checks,records:targets,production_verified:false};
  fs.mkdirSync(path.dirname(path.join(root,receipt)),{recursive:true});fs.writeFileSync(path.join(root,receipt),JSON.stringify(result,null,2)+"\n");return result;
 }catch(e){
  // Restore precisely the pre-apply tracked bytes, including any pre-existing coordinator changes.
  for(const [file,raw]of snapshot)fs.writeFileSync(path.join(root,file),raw);
  throw Error("batch rolled back to pre-apply files: "+e.message);
 }
}
function main(argv){
 const command=argv[0]||"check",packets=readPackets(ROOT);
 if(command==="apply"){
  const n=Number(argv.find(a=>a.startsWith("--batch="))?.slice(8));
  if(!Number.isInteger(n)||n<1)throw Error("apply needs --batch=N");
  const result=applyBatch(ROOT,JSON.parse(fs.readFileSync(path.join(ROOT,PLAN),"utf8")),n);
  console.log(JSON.stringify({batch:result.batch,status:result.status,urls:result.ids.length,titles:result.titles_changed,descriptions:result.descriptions_changed},null,2));return;
 }
 if(!["plan","check"].includes(command))throw Error("usage: metadata-v11.mjs [check|plan --write --size=40|apply --batch=N]");
 const reviews=LOCALES.flatMap(locale=>{
  const file=path.join(ROOT,"docs/seo-v11/reviews/"+locale+".json");if(!fs.existsSync(file))throw Error("missing review file "+locale);
  const rows=JSON.parse(fs.readFileSync(file,"utf8"));if(!Array.isArray(rows)||rows.some(r=>r.locale!==locale))throw Error("wrong locale review file "+locale);return rows;
 });
 const plan=createPlan(packets,reviews,{size:Number(argv.find(a=>a.startsWith("--size="))?.slice(7)||40),baseCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8"}).trim()});
 if(command==="plan"&&argv.includes("--write")){
  if(fs.existsSync(path.join(ROOT,PLAN)))throw Error("inventory already exists; recover it instead of replacing");
  fs.writeFileSync(path.join(ROOT,PLAN),JSON.stringify(plan,null,2)+"\n");
 }
 console.log(JSON.stringify({status:"VALID",reviewed:plan.reviewed,optimized:plan.optimized,batches:plan.batches.length,locales:LOCALES.map(locale=>({locale,reviewed:plan.records.filter(r=>r.locale===locale).length,optimized:plan.records.filter(r=>r.locale===locale&&r.decision==="OPTIMIZE").length}))},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main(process.argv.slice(2));}catch(e){console.error("METADATA_V11_REFUSED "+e.message);process.exitCode=1;}
