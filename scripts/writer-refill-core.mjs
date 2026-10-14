/**
 * Content-topic refill intake, inspired by /blog's refill safety gates.
 * This is PROPOSAL QA ONLY. It never edits Matrix, live URLs, sitemap,
 * navigation, writer claims, or publication flags.
 *
 * G1 repo/schema, G2 batch size and identity, G3 locale/parent/taxonomy,
 * G4 URL safety and uniqueness, G5 search query and intent uniqueness,
 * G6 title/slug content standards, G7 traceable topic research,
 * G8 SEO governance: unverified IDEA, no auto-publication.
 */
import {poolCandidates,protectedSet,validatePool,WRITERS} from "./writer-pool-core.mjs";
export const REFILL_MIN_READY=30;
export const REFILL_TARGET=120;
export const REFILL_BATCH_MAX=50;
const intents=new Set(["informational","commercial_investigation","navigational","transactional"]);
const normalize=s=>String(s||"").normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/gu," ").trim();
const slugValid=s=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s||"");
const queryKey=r=>r.locale+"::"+normalize(r.primary_query);
const titleKey=r=>r.locale+"::"+normalize(r.working_title);
const htmlSafe=s=>typeof s==="string"&&!/[<>{}]/.test(s)&&!/TBD|TODO|lorem ipsum|placeholder/i.test(s);
export function topicURL(item){return "/"+item.locale+"/guides/"+item.slug+"/";}
export function refillHealth(matrix,ledger,registry,{minReady=REFILL_MIN_READY,target=REFILL_TARGET}={}){
 const problems=validatePool(matrix,ledger,registry);
 if(problems.length)throw Error(problems.join("; "));
 const free=poolCandidates(matrix,ledger,registry);
 const active=ledger.claims.filter(c=>c.status==="CLAIMED");
 const submitted=ledger.claims.filter(c=>c.status==="SUBMITTED");
 const protectedCount=protectedSet(registry).size;
 const status=free.length===0?"QUEUE_EMPTY_REVIEW_REQUIRED":free.length<minReady?
  "REFILL_RESEARCH_RECOMMENDED":"HEALTHY";
 return {status,free_ideas:free.length,unfinished_claims:active.length,submitted_drafts:submitted.length,
  protected_drafts:protectedCount,threshold:minReady,target,propose_count:status==="HEALTHY"?0:Math.min(REFILL_BATCH_MAX,Math.max(0,target-free.length)),
  meaning:"Propose original researched topics on a Writer PR. Validation is structural and cannot prove live SERP intent. Human editorial acceptance is required before Matrix import.",
  publish_allowed:false,auto_materialize:false};
}
export function validateProposalBatch(matrix,batch,writer,{otherProposals=[]}={}){
 const issues=[],warn=[],errors=(gate,id,reason)=>issues.push({gate,id,reason});
 if(batch?.version!==1||batch?.repo!=="thuexemayhanoi/global"||batch?.purpose!=="SEO_IDEA_RESEARCH"||
    batch?.status!=="PROPOSED")errors("G1","batch","Incorrect repository, schema or review status");
 if(!WRITERS.includes(writer)||batch?.writer!==writer)errors("G2","batch","Writer lane mismatch");
 if(!Array.isArray(batch?.topics)||batch.topics.length<1||batch.topics.length>REFILL_BATCH_MAX)
  errors("G2","batch","Require 1.."+REFILL_BATCH_MAX+" researched candidate ideas");
 if(issues.length)return {passed:false,issues,warnings:warn,count:0};
 const allowedLocales=new Set(matrix.locales),byId=new Map(matrix.rows.map(x=>[x.id,x]));
 const urls=new Set(matrix.rows.map(x=>x.url)),queries=new Set(matrix.rows.map(queryKey));
 const titles=new Set(matrix.rows.map(titleKey)),ids=new Set();
 for(const p of otherProposals){
  if(p?.candidate_id)ids.add(p.candidate_id);
  if(p?.locale&&p?.primary_query)queries.add(queryKey(p));
  if(p?.locale&&p?.working_title)titles.add(titleKey(p));
  if(p?.locale&&p?.slug)urls.add(topicURL(p));
 }
 for(const [i,r]of batch.topics.entries()){
  const id=r?.candidate_id||"row-"+i;
  if(!r||typeof r!=="object"||Array.isArray(r)){errors("G2",id,"Candidate must be a JSON object");continue;}
  if(!/^REFILL-(VI|EN|DE|FR|ES|NL|ZH|PT|KO|JA)-\d{5,8}$/.test(id)||ids.has(id)||byId.has(id))
   errors("G2",id,"Invalid or duplicate candidate ID");
  ids.add(id);
  const p=byId.get(r?.parent_id);
  if(!allowedLocales.has(r?.locale)||!p||p.role!=="HUB"||p.locale!==r.locale||r.cluster!==p.cluster)
   errors("G3",id,"Parent must be a same-locale existing Hub and cluster must match");
  if(r.role!=="SUPPORT")errors("G3",id,"Proposals may extend Supporting topics only; adding Hub requires separate architecture review");
  const url=topicURL(r);
  if(!slugValid(r.slug)||url.length>150||urls.has(url))
   errors("G4",id,"Unsafe or duplicate localized guide URL");
  urls.add(url);
  const q=queryKey(r);
  if(!htmlSafe(r.primary_query)||r.primary_query.trim().length<12||queries.has(q)||!intents.has(r.search_intent))
   errors("G5",id,"Invalid search intent or duplicate/short keyword hypothesis");
  queries.add(q);
  const t=titleKey(r);
  if(!htmlSafe(r.working_title)||r.working_title.trim().length<20||r.working_title.length>115||titles.has(t))
   errors("G6",id,"Duplicate or invalid topic title");
  titles.add(t);
  if(!Number.isInteger(r.word_target)||r.word_target<1000||r.word_target>5000)
   errors("G6",id,"Topic target word count must be 1000..5000");
  if(!htmlSafe(r.intent_rationale)||r.intent_rationale.trim().length<60)
   errors("G7",id,"Require substantive search-intent and audience research notes");
  if(!Array.isArray(r.references)||r.references.length<2||r.references.some(s=>
   !/^https:\/\/[^/]+\//i.test(s?.url||"")||/example\.(?:com|org|net)/i.test(s.url||"")||
   !htmlSafe(s.title)||!s.title?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(s.checked_on||"")))
   errors("G7",id,"Require 2+ traceable HTTPS research references with checked_on date (not proof they were accessed)");
  if(r.status!=="IDEA"||r.serp_evidence!=="NOT_VALIDATED"||r.source_verification!=="NOT_STARTED"||
     r.owner_approved===true||r.publish===true)
   errors("G8",id,"Proposed ideas must stay unverified and unapproved; never publish from refill");
  // Simple same-locale, same-parent token similarity is a warning for
  // editorial review, not a made-up SERP cannibalization determination.
  const tokens=v=>new Set(normalize(v).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2));
  const a=tokens(r.primary_query);
  for(const existing of matrix.rows){
   if(existing.locale!==r.locale||existing.parent_id!==r.parent_id||a.size===0)continue;
   const b=tokens(existing.primary_query);
   const union=new Set([...a,...b]).size,inter=[...a].filter(x=>b.has(x)).length;
   if(union&&inter/union>=0.75)warn.push({id,warning:"SIMILAR_PARENT_INTENT_REVIEW",compared_to:existing.id});
  }
 }
 return {passed:issues.length===0,issues,warnings:warn,count:batch.topics.length,
  review_required:true,auto_materialize:false,auto_publish:false};
}
