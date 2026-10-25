#!/usr/bin/env node
/**
 * Read-only, ZERO-DATA progress tracker for the multilingual SEO metadata review.
 * Reads published packets and editorial proposals; never edits packets, the URL
 * freeze, generated HTML or the publisher. Character limits are editorial
 * review triggers, not Google's fixed snippet/title limits.
 */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {loadPackets,listProposalFiles,validateProposal,TITLE_MAX} from "./apply-meta-proposals.mjs";

export const LOCALES=["vi","en","de","fr","es","nl","zh","pt","ko","ja"];
const empty=()=>({articles:0,title_over_60:0,title_over_70:0,description_over_165:0,reviewed_items:0,proposed_titles:0,proposed_descriptions:0,unreviewed_titles:0,unreviewed_descriptions:0});
const sum=(stats,k)=>LOCALES.reduce((n,l)=>n+stats[l][k],0);

export function summarizeMetaReview(packets,proposalGroups=new Map()){
  const locales=Object.fromEntries(LOCALES.map(l=>[l,empty()]));
  const errors=[],seen=new Set();
  for(const [id,entry] of packets){
    const p=entry.packet??entry;
    if(!LOCALES.includes(p.locale))continue;
    if(typeof p.title!=="string"||typeof p.meta_description!=="string"){
      errors.push(id+": missing title/description");continue;
    }
    const s=locales[p.locale];s.articles++;
    if(p.title.length>TITLE_MAX)s.title_over_60++;
    if(p.title.length>70)s.title_over_70++;
    if(p.meta_description.length>165)s.description_over_165++;
  }
  for(const [locale,items] of proposalGroups){
    if(!LOCALES.includes(locale)){errors.push("unknown proposal locale "+locale);continue;}
    if(!Array.isArray(items)){errors.push(locale+": proposal data must be an array");continue;}
    for(const item of items){
      const id=item?.id;
      if(seen.has(id)){errors.push("duplicate proposal ID "+id);continue;}
      seen.add(id);
      const entry=packets.get(id),p=entry?.packet??entry;
      if(!p){errors.push("missing published packet "+id);continue;}
      if(p.locale!==locale){errors.push("wrong proposal locale "+id);continue;}
      const itemErrors=validateProposal(item,p);
      if(item.url!==p.proposed_url)itemErrors.push("proposed_url mismatch");
      if(item.title_len!==p.title.length)itemErrors.push("title_len mismatch");
      if(item.meta_description_len!==p.meta_description.length)itemErrors.push("meta_description_len mismatch");
      if(item.proposed_title_len!==(item.proposed_title?.length??null))itemErrors.push("proposed_title_len mismatch");
      if(item.proposed_description_len!==(item.proposed_description?.length??null))itemErrors.push("proposed_description_len mismatch");
      if(itemErrors.length){errors.push(id+": "+itemErrors.join("; "));continue;}
      const s=locales[locale];s.reviewed_items++;
      if(item.proposed_title!==null)s.proposed_titles++;
      if(item.proposed_description!==null)s.proposed_descriptions++;
    }
  }
  for(const s of Object.values(locales)){
    s.unreviewed_titles=Math.max(0,s.title_over_60-s.proposed_titles);
    s.unreviewed_descriptions=Math.max(0,s.description_over_165-s.proposed_descriptions);
  }
  const totals=Object.fromEntries(Object.keys(empty()).map(k=>[k,sum(locales,k)]));
  return {mode:"READ_ONLY_ZERO_DATA",status:"EDITORIAL_PROPOSALS_NOT_APPLIED",
    guidance:"Google has no fixed title/meta character limit. Prioritize reader value, local intent and SERP evidence; zh/ja/ko require visual-width review.",
    locales,totals,errors};
}
function main(){
  const packets=loadPackets();
  const groups=new Map(listProposalFiles().map(file=>[path.basename(file).match(/^meta-([a-z]{2})\.json$/)[1],JSON.parse(fs.readFileSync(file,"utf8"))]));
  const result=summarizeMetaReview(packets,groups);
  if(process.argv.includes("--json"))console.log(JSON.stringify(result,null,2));
  else{
    for(const [locale,v] of Object.entries(result.locales))console.log(locale+" articles="+v.articles+" >70title="+v.title_over_70+" >165desc="+v.description_over_165+" proposed="+v.reviewed_items+" pendingTitle="+v.unreviewed_titles+" pendingDesc="+v.unreviewed_descriptions);
    console.log("TOTAL "+JSON.stringify(result.totals)+" errors="+result.errors.length);
    if(result.errors.length)console.error(result.errors.join("\n"));
  }
  if(result.errors.length)process.exitCode=1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main();
