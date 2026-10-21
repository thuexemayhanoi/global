#!/usr/bin/env node
// Applies owner-approved <title> / meta description proposals (docs/seo-v10/proposals/meta-<locale>.json)
// to the published article packets in content/articles/. Dry-run by default: it only validates and prints
// what would change. --apply rewrites the packets; title, description and H1 are frozen SEO fields, so the
// rebuild and `node scripts/seo/seo-guard.mjs --write` that follow must land in a reviewed commit, never on main directly.
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const PROPOSALS=path.join(root,"docs/seo-v10/proposals");
export const TITLE_MAX=60,DESC_MIN=120,DESC_MAX=155;
const KEYS=["id","url","title","title_len","proposed_title","proposed_title_len","meta_description","meta_description_len","proposed_description","proposed_description_len","note"];

export function listProposalFiles(dir=PROPOSALS){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir).filter(f=>/^meta-[a-z]{2}\.json$/.test(f)).sort().map(f=>path.join(dir,f));
}
export function validateProposal(item,packet){
 const errors=[];
 for(const k of KEYS)if(!(k in item))errors.push("missing key "+k);
 if(!packet)errors.push("no published packet");
 else{
  // A packet that already carries the proposed value is an applied proposal, not drift.
  if(item.title!==packet.title&&packet.title!==item.proposed_title)errors.push("current title drifted from packet");
  if(item.meta_description!==packet.meta_description&&packet.meta_description!==item.proposed_description)errors.push("current description drifted from packet");
 }
 const t=item.proposed_title,d=item.proposed_description;
 if(item.title_len>TITLE_MAX){
  if(typeof t!=="string"||!t.trim())errors.push("title over "+TITLE_MAX+" needs a proposal");
  else if(t.length>TITLE_MAX)errors.push("proposed title "+t.length+" > "+TITLE_MAX);
  else if(t===item.title)errors.push("proposed title equals current");
 }else if(t!==null)errors.push("title within limit must have null proposal");
 if(item.meta_description_len>165){
  if(typeof d!=="string"||!d.trim())errors.push("description over 165 needs a proposal");
  else if(d.length<DESC_MIN||d.length>DESC_MAX)errors.push("proposed description "+d.length+" outside "+DESC_MIN+"-"+DESC_MAX);
  else if(d===item.meta_description)errors.push("proposed description equals current");
 }else if(d!==null)errors.push("description within limit must have null proposal");
 const digits=s=>String(s||"").match(/\d+/g)||[];
 const allowed=new Set([...digits(item.title),...digits(item.meta_description),...digits(packet?.body_markdown)]);
 for(const n of [...digits(t),...digits(d)])if(!allowed.has(n))errors.push("number "+n+" not present in the page");
 return errors;
}
export function loadPackets(dir=path.join(root,"content/articles")){
 const map=new Map();
 for(const f of fs.readdirSync(dir)){if(!f.endsWith(".json"))continue;const p=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));map.set(p.matrix_id,{file:path.join(dir,f),packet:p});}
 return map;
}
export function run(argv=process.argv.slice(2)){
 const apply=argv.includes("--apply");
 const onlyLocale=(argv.find(a=>a.startsWith("--locale="))||"").slice(9);
 const packets=loadPackets();
 const report={mode:apply?"APPLY":"DRY_RUN",files:0,items:0,titles:0,descriptions:0,errors:[]};
 for(const file of listProposalFiles()){
  const locale=path.basename(file,".json").slice(5);
  if(onlyLocale&&locale!==onlyLocale)continue;
  report.files++;
  const items=JSON.parse(fs.readFileSync(file,"utf8"));
  for(const item of items){
   report.items++;
   const entry=packets.get(item.id);
   const errors=validateProposal(item,entry?.packet);
   if(errors.length){report.errors.push({id:item.id,errors});continue;}
   if(item.proposed_title)report.titles++;
   if(item.proposed_description)report.descriptions++;
   if(apply&&entry){
    let changed=false;
    if(item.proposed_title&&entry.packet.title!==item.proposed_title){entry.packet.title=item.proposed_title;changed=true;}
    if(item.proposed_description&&entry.packet.meta_description!==item.proposed_description){entry.packet.meta_description=item.proposed_description;changed=true;}
    if(changed)fs.writeFileSync(entry.file,JSON.stringify(entry.packet,null,2)+"\n");
   }
  }
 }
 if(report.errors.length&&apply)report.mode="APPLY_WITH_SKIPPED_ITEMS";
 return report;
}
if(import.meta.url===`file://${process.argv[1]}`){
 const report=run();
 console.log(JSON.stringify(report,null,1));
 if(report.mode!=="DRY_RUN")console.log("Next: node scripts/build.mjs && node scripts/seo/seo-guard.mjs --write && node scripts/build.mjs --check (reviewed commit only)");
 process.exit(report.errors.length?1:0);
}
