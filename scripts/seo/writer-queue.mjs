#!/usr/bin/env node
import fs from "node:fs";
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const arg=(flag,fallback)=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:fallback};
const locale=arg("--locale","de"),count=Number(arg("--count","2"));
if(!matrix.locales.includes(locale)||!Number.isInteger(count)||count<1||count>10){console.error("Usage: node scripts/seo/writer-queue.mjs --locale de --count 2 (1..10)");process.exit(2)}
const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.id));
const all=matrix.rows.filter(r=>r.locale===locale&&r.status==="IDEA").sort((a,b)=>a.priority-b.priority);
const ready=all.filter(r=>published.has(r.parent_id));
const chosen=ready.slice(0,count);
const manifest={repository:"thuexemayhanoi/global",locale,mode:"RESEARCH_ONLY_NO_PUBLISH",generated_from:"data/seo/master-matrix.json",next_actions:["Verify SERP intent and search demand without inventing numbers","Gather credible current sources for each factual claim","Verify whether intent overlaps existing canonical URLs","Prepare a distinct native-language outline and draft","Perform human review before changing status or publishing"],items:chosen.map(r=>({id:r.id,proposed_url:r.url,primary_query_hypothesis:r.primary_query,working_title:r.working_title,cluster:r.cluster,role:r.role,parent_id:r.parent_id,serp_evidence:r.serp_evidence,source_verification:r.source_verification})),blocked_dependent_ideas:all.length-ready.length};
console.log(JSON.stringify(manifest,null,2));
if(!chosen.length)console.error("No eligible planning items: research / publish the required parent hub first");