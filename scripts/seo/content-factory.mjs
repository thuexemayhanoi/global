#!/usr/bin/env node
/**
 * Secure planning and QA shell for a human-supervised AI writing factory.
 * This tool NEVER invokes AI APIs, changes published URLs, commits or deploys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8"));
const cfg=JSON.parse(fs.readFileSync(path.join(root,"config/content-factory.json"),"utf8"));
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1]};
const mode=process.argv[2]||"plan";
const safeWrite=(output,content)=>{
 if(!output||output.startsWith("/")||output.includes(".."))throw Error("Output must be a safe repo-relative path");
 const full=path.join(root,output);
 fs.mkdirSync(path.dirname(full),{recursive:true});
 fs.writeFileSync(full,JSON.stringify(content,null,2)+"\n");
};
const locale=arg("--locale","de"),count=Number(arg("--count",String(cfg.default_batch_size)));
function plan(){
 if(!matrix.locales.includes(locale))throw Error("Invalid locale: "+locale);
 if(!Number.isInteger(count)||count<1||count>cfg.max_batch_size)throw Error("Batch size must be 1.."+cfg.max_batch_size);
 const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.id));
 const candidates=matrix.rows.filter(r=>r.locale===locale&&r.status==="IDEA"&&published.has(r.parent_id))
 .sort((a,b)=>a.priority-b.priority).slice(0,count);
 const out={mode:"PLANNING_ONLY",locale,batch_size:candidates.length,owner_review_required:true,may_publish:false,source:"data/seo/master-matrix.json",notices:["No real SERP research has been done in this plan","Queries are hypotheses, not verified keyword opportunities","Never copy draft content between languages without independent research"],items:candidates.map(r=>({matrix_id:r.id,role:r.role,cluster:r.cluster,proposed_url:r.url,target_query_hypothesis:r.primary_query,working_title:r.working_title,parent_id:r.parent_id,draft_requirements:{native_language:true,minimum_words:cfg.minimum_words,original_research:true,explicit_source_list:true,human_fact_check:true,link_only_to_published_urls:true,metadata_and_schema_qa:true}}))};
 if(arg("--out",null))safeWrite(arg("--out",null),out);
 console.log(JSON.stringify(out,null,2));
}
function validate(){
 const filename=arg("--file",null);
 if(!filename||filename.startsWith("/")||filename.includes(".."))throw Error("Pass a safe --file relative path for a proposed article JSON");
 const draft=JSON.parse(fs.readFileSync(path.join(root,filename),"utf8"));
 const errors=[],warnings=[];
 const row=matrix.rows.find(r=>r.id===draft.matrix_id);
 if(!row)errors.push("Unknown matrix_id");
 else {
  if(row.status==="PUBLISHED")errors.push("Refusing to overwrite a PUBLISHED article");
  if(row.status==="BLOCKED")errors.push("Blocked topic may not proceed");
  if(row.url!==draft.proposed_url)errors.push("Proposed URL is not the Matrix URL");
  if(row.locale!==draft.locale)errors.push("Locale mismatch");
 }
 if(!matrix.locales.includes(draft.locale))errors.push("Unsupported language");
 const text=String(draft.body_markdown||"");
 const words=["zh","ja","ko"].includes(draft.locale)?[...new Intl.Segmenter(draft.locale,{granularity:"word"}).segment(text)].filter(w=>w.isWordLike).length:text.trim().split(/\s+/).filter(Boolean).length;
 if(words<cfg.minimum_words)errors.push("Insufficient substantial text: "+words+" words; minimum "+cfg.minimum_words);
 if(!draft.title||draft.title.length<16||draft.title.length>100)errors.push("Title missing or implausible length");
 if(!draft.meta_description||draft.meta_description.length<80||draft.meta_description.length>200)errors.push("Meta description length outside 80..200");
 if(!draft.h1||draft.h1.length<12)errors.push("Missing H1");
 if((text.match(/^##\s+/gm)||[]).length<3)errors.push("Need at least three genuine content sections");
 if(!Array.isArray(draft.sources)||draft.sources.length<2)errors.push("At least two traceable sources required");
 else for(const [i,s] of draft.sources.entries()){
  if(!/^https:\/\//.test(s.url||"")||!s.title||!s.checked_on)errors.push("Source "+i+" needs HTTPS URL, title and checked_on date");
  if(s.url?.includes("example.com"))errors.push("Example URL cannot be cited as a source");
 }
 if(!draft.serp_intent_checked)errors.push("SERP intent research must be confirmed explicitly");
 if(!draft.facts_reviewed_by_human)errors.push("Human fact-check flag is required for QA approval");
 if(/\b(PLACEHOLDER|TODO|LOREM IPSUM|TBD)\b/i.test(text))errors.push("Draft contains placeholders");
 const urls=[...text.matchAll(/\]\((\/[^)]+)\)/g)].map(m=>m[1].split("#")[0]);
 const publishedPaths=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url));
 for(const u of urls)if(!publishedPaths.has(u))errors.push("Link points to a non-published local path: "+u);
 if(!draft.editorial_notes)warnings.push("Editorial notes missing: consider recording methodology, date and uncertain claims");
 const outcome={type:"LOCAL_DRAFT_QA_NO_PUBLISH",matrix_id:draft.matrix_id,locale:draft.locale,words,passed:errors.length===0,errors,warnings,next_step:errors.length?"Revise offline draft and rerun":"Human editor should approve a separately reviewed PR; this validator cannot publish"};
 if(arg("--out",null))safeWrite(arg("--out",null),outcome);
 console.log(JSON.stringify(outcome,null,2));
 if(errors.length)process.exitCode=1;
}
try{if(mode==="plan")plan();else if(mode==="validate")validate();else throw Error("Usage: content-factory.mjs plan --locale en --count 2 OR validate --file path.json");}
catch(e){console.error("Content Factory: "+e.message);process.exitCode=2;}
