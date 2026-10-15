/**
 * Topic Factory 10K — deterministic core (no I/O, no network, no AI).
 *
 * Research (AI agents with web access) → research batch → intake validation →
 * topical map PROPOSED candidate → factory gates → standing-policy promotion
 * to Matrix IDEA rows → shared Writer queue. Publication is never decided here.
 *
 * Gates on every promotion candidate (on top of topical gates T1–T10):
 *  F1 topical gates clean   F2 existing same-locale HUB parent   F3 domain scope
 *  F4 no transactional/commercial intent   F5 duplicate layers L1–L5
 *  F6 per-locale target    F7 research inputs (≥2 references, rationale, angle)
 *  F8 governance flags stay unvalidated (never publish/approve from planning)
 * Duplicate layers: L1 exact keyword, L2 diacritic-folded keyword, L3 intent
 * token overlap, L4 title character-trigram similarity, L5 topic signature
 * (query+title+variants). L6/L7 draft and published content similarity run
 * in the Auto Publisher; L8 cross-URL cannibalization lives in validate-plan
 * and the content graph. No embedding model is connected, so L5 is lexical
 * and reported as such — never presented as semantic certainty.
 */
import {createHash} from "node:crypto";
import {validateTopicalMap,allProposals,normalize,tokens,planPromotion} from "./seo/topical-authority-core.mjs";
import {poolCandidates,protectedSet,validatePool,WRITERS} from "./writer-pool-core.mjs";
import {repairTicket} from "./repair-queue-core.mjs";
import {slotView} from "./writer-slots-core.mjs";

export const STANDING_STATEMENT="I approve adding these topical-map candidates to the SEO Matrix as unpublished IDEA rows. This is not publication approval.";
export const RESEARCH_PURPOSE="TOPIC_RESEARCH_BATCH";
const LOCALES=["vi","en","de","fr","es","nl","zh","pt","ko","ja"];
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const unsafe=s=>typeof s!=="string"||/[<>{}]/.test(s)||/\b(?:TBD|TODO|lorem ipsum|placeholder)\b/i.test(s);

export const fold=s=>normalize(s).normalize("NFKD").replace(/\p{M}+/gu,"").replace(/đ/g,"d");
export function trigrams(s){
 const c=[...fold(s).replace(/[^\p{L}\p{N}]+/gu,"")],out=new Set();
 if(c.length<3){if(c.length)out.add(c.join(""));return out;}
 for(let i=0;i<c.length-2;i++)out.add(c[i]+c[i+1]+c[i+2]);
 return out;
}
export function dice(a,b){
 if(!a.size||!b.size)return 0;
 let i=0;for(const x of a)if(b.has(x))i++;
 return 2*i/(a.size+b.size);
}
export function jaccard(a,b){
 if(!a.size||!b.size)return 0;
 let i=0;for(const x of a)if(b.has(x))i++;
 return i/(a.size+b.size-i);
}
export const sensitivityOf=(policy,cluster)=>policy?.sensitivity?.clusters?.[cluster]||policy?.sensitivity?.default||"STANDARD";
export const domainOf=(policy,cluster)=>(policy?.domains||[]).find(d=>d.clusters.includes(cluster))?.id||null;

export function validatePolicy(policy,standing){
 const e=[];
 if(policy?.version!==1||policy?.repo!=="thuexemayhanoi/global")e.push("Factory policy must be version 1 for thuexemayhanoi/global");
 const t=policy?.targets,r=policy?.refill,d=policy?.duplicates;
 if(!Number.isInteger(t?.per_locale)||t.per_locale<1||t.per_locale>1000)e.push("per_locale target must be 1..1000 (raising it needs a new owner request)");
 if(JSON.stringify(t?.locales)!==JSON.stringify(LOCALES))e.push("Factory locales must be the 10 site locales");
 if(!(r?.ready_threshold>0&&r.ready_target>r.ready_threshold&&r.batch_min>=1&&r.batch_max<=50&&r.max_promotions_per_run<=50))e.push("Invalid refill thresholds");
 for(const k of ["intent_overlap_fail","title_trigram_fail","signature_fail","draft_shingle_fail","draft_shingle_warn"])if(!(d?.[k]>0&&d[k]<1))e.push("Invalid duplicate threshold "+k);
 if(!Array.isArray(policy?.domains)||policy.domains.length!==8)e.push("Scope needs the 8 owner-defined domains");
 if(standing){
  if(standing.purpose!=="STANDING_AUTOMATION_POLICY"||standing.repo!=="thuexemayhanoi/global"||!DATE.test(standing.granted_on||""))e.push("Standing policy file is malformed");
  if(standing.topic_promotion?.authorized!==true||standing.topic_promotion?.statement!==STANDING_STATEMENT)e.push("Standing policy does not authorize topic promotion");
 }
 return e;
}

/** Per-locale dashboard counts: what is published, in drafting, queued, proposed or blocked. */
export function factoryStatus({matrix,map,ledger,registry,policy}){
 const problems=validatePool(matrix,ledger,registry);
 if(problems.length)throw Error(problems.join("; "));
 const live=new Map();
 for(const c of ledger.claims)if(c.status!=="RELEASED")live.set(c.id,c);
 const prot=protectedSet(registry),free=new Set(poolCandidates(matrix,ledger,registry).map(r=>r.id));
 const roles=new Set(policy.targets.counted_roles),target=policy.targets.per_locale;
 const locales={},totals={target:0,published:0,submitted:0,claimed:0,review:0,ready:0,waiting:0,proposed:0,blocked:0,accepted:0,remaining:0};
 for(const code of policy.targets.locales){
  const rows=matrix.rows.filter(r=>r.locale===code&&roles.has(r.role));
  const s={target,published:0,submitted:0,claimed:0,review:0,ready:0,waiting:0,proposed:0,blocked:0};
  for(const r of rows){
   const c=live.get(r.id);
   if(r.status==="PUBLISHED")s.published++;
   else if(r.status==="BLOCKED")s.blocked++;
   else if(c?.status==="SUBMITTED")s.submitted++;
   else if(c?.status==="CLAIMED")s.claimed++;
   else if(prot.has(r.id))s.review++;
   else if(free.has(r.id))s.ready++;
   else s.waiting++;
  }
  for(const p of map.locales[code]?.proposals||[]){
   if(p.status==="PROPOSED")s.proposed++;
   else if(p.status==="ARCHITECTURE_BLOCKED")s.blocked++;
  }
  s.accepted=rows.filter(r=>r.status!=="BLOCKED").length;
  s.remaining=Math.max(0,target-s.accepted);
  const need=s.ready<policy.refill.ready_threshold?Math.max(0,Math.min(policy.refill.ready_target-s.ready,s.remaining)):0;
  s.refill=s.remaining===0?"TARGET_REACHED":need===0?"HEALTHY":s.proposed?"REFILL_FROM_PROPOSED":"RESEARCH_NEEDED";
  s.refill_need=need;
  locales[code]=s;
  for(const k of Object.keys(totals))totals[k]+=k==="target"?target:s[k]||0;
 }
 const writers={};
 for(const w of WRITERS){
  const mine=ledger.claims.filter(c=>c.writer===w);
  writers[w]={submitted:mine.filter(c=>c.status==="SUBMITTED").length,claimed:mine.filter(c=>c.status==="CLAIMED").length,
   released:mine.filter(c=>c.status==="RELEASED").length,sessions:[...new Set(mine.filter(c=>c.status==="CLAIMED").map(c=>c.session))]};
 }
 return {ledger_revision:ledger.revision,locales,totals,writers,
  domains:(policy.domains||[]).map(d=>({id:d.id,label:d.label,status:d.status,clusters:d.clusters})),
  note:"Counts are repository state. Keyword evidence stays NOT_VALIDATED until real market/SERP data is attached; rankings and traffic are not inferred."};
}

function prepared(o,locale,stop){
 return {id:o.id,locale,primary_query:o.primary_query,
  q:normalize(o.primary_query),fq:fold(o.primary_query),
  qt:tokens(o.primary_query,locale,stop),tt:trigrams(o.working_title||""),
  sig:tokens([o.primary_query,o.working_title,...(o.secondary_queries||[])].join(" "),locale,stop)};
}
/** L1–L5 against a prepared corpus. distinct_from (≥40 chars) can only justify overlap layers L3–L5. */
export function duplicateLayers(candidate,corpus,{stop=[],thresholds,distinctMin=40}){
 const c=prepared(candidate,candidate.locale,stop),hits=[];
 const justified=id=>(candidate.distinct_from||[]).some(d=>d?.id===id&&String(d.reason||"").length>=distinctMin);
 for(const o of corpus){
  if(o.id===c.id||o.locale!==c.locale)continue;
  if(o.q===c.q){hits.push({layer:"L1_EXACT_KEYWORD",with:o.id,score:1});continue;}
  if(o.fq===c.fq){hits.push({layer:"L2_NORMALIZED_KEYWORD",with:o.id,score:1});continue;}
  if(justified(o.id))continue;
  const io=jaccard(c.qt,o.qt);
  if(io>=thresholds.intent_overlap_fail){hits.push({layer:"L3_INTENT_OVERLAP",with:o.id,score:+io.toFixed(2)});continue;}
  const td=dice(c.tt,o.tt);
  if(td>=thresholds.title_trigram_fail){hits.push({layer:"L4_TITLE_SIMILARITY",with:o.id,score:+td.toFixed(2)});continue;}
  const so=jaccard(c.sig,o.sig);
  if(so>=thresholds.signature_fail)hits.push({layer:"L5_TOPIC_SIGNATURE_LEXICAL",with:o.id,score:+so.toFixed(2)});
 }
 return hits;
}
export const prepareCorpus=(items,locale,stop)=>items.map(o=>prepared(o,locale,stop));

const byPriority=(a,b)=>(a.priority??99)-(b.priority??99)||String(a.candidate_id).localeCompare(String(b.candidate_id));
/** Choose PROPOSED candidates for standing-policy promotion, round-robin by locale need. */
export function selectRefill({matrix,map,ledger,registry,policy,validation,limit}){
 const status=factoryStatus({matrix,map,ledger,registry,policy});
 const issuesBy=new Map();
 for(const i of validation.issues)issuesBy.set(i.id,[...(issuesBy.get(i.id)||[]),i.gate+": "+i.reason]);
 const thr=policy.duplicates,locales={},queues={},rejected=[];
 for(const code of policy.targets.locales){
  const s=status.locales[code],L=map.locales[code];
  const stop=L?.stop_tokens||[];
  const rows=matrix.rows.filter(r=>r.locale===code&&["PILLAR","HUB","SUPPORT"].includes(r.role));
  const corpus=prepareCorpus(rows,code,stop),ok=[];
  for(const p of (L?.proposals||[]).filter(p=>p.status==="PROPOSED").sort(byPriority)){
   const id=p.candidate_id,why=[];
   if(issuesBy.has(id))why.push({gate:"F1_TOPICAL_GATES",detail:issuesBy.get(id).join(" | ")});
   const parent=matrix.rows.find(r=>r.id===p.parent_id);
   if(!parent||parent.role!=="HUB"||parent.locale!==code||parent.status==="BLOCKED")why.push({gate:"F2_PARENT",detail:"Needs an existing same-locale HUB parent"});
   if(!domainOf(policy,p.cluster))why.push({gate:"F3_SCOPE",detail:"Cluster "+p.cluster+" is outside the 8 approved domains"});
   if((policy.forbidden_intents||[]).includes(p.search_intent))why.push({gate:"F4_COMMERCIAL_INTENT",detail:"Transactional rental intent belongs to the commercial sites"});
   const dups=duplicateLayers({...p,id},[...corpus,...ok],{stop,thresholds:thr,distinctMin:thr.distinct_reason_min});
   if(dups.length)why.push({gate:"F5_DUPLICATE",detail:dups.map(d=>d.layer+"~"+d.with+"("+d.score+")").join(", ")});
   if(!Array.isArray(p.references)||p.references.length<2||String(p.intent_rationale||"").length<60)why.push({gate:"F7_RESEARCH",detail:"Needs ≥2 references and a researched intent rationale"});
   if(p.publish===true||p.owner_approved===true||p.serp_evidence!=="NOT_VALIDATED")why.push({gate:"F8_GOVERNANCE",detail:"Planning records never carry publish/approval or invented evidence"});
   if(why.length)rejected.push({candidate_id:id,locale:code,reasons:why});
   else ok.push(prepared({...p,id},code,stop));
  }
  const need=Math.min(s.refill_need,s.remaining);
  queues[code]=ok.map(o=>o.id).slice(0,need);
  locales[code]={ready:s.ready,need,eligible:ok.length,refill:s.refill,research_gap:Math.max(0,need-ok.length)};
 }
 const cap=Math.min(limit??policy.refill.max_promotions_per_run,policy.refill.max_promotions_per_run,50),selected=[];
 const order=[...policy.targets.locales].sort((a,b)=>locales[b].need-locales[a].need||a.localeCompare(b));
 for(let round=0;selected.length<cap;round++){
  let took=false;
  for(const code of order){
   if(selected.length>=cap)break;
   const id=queues[code][round];
   if(id){selected.push(id);took=true;}
  }
  if(!took)break;
 }
 for(const code of policy.targets.locales)locales[code].selected=selected.filter(id=>id.startsWith("TA-"+code.toUpperCase()+"-")).length;
 return {status,locales,selected,rejected,
  research_needed:policy.targets.locales.filter(c=>locales[c].research_gap>0)};
}

/** A machine-written manifest that names the standing policy instead of impersonating the owner. */
export function standingManifest(ids,{policyPath,date}){
 if(!DATE.test(date||""))throw Error("Manifest date must be YYYY-MM-DD");
 return {version:1,repo:"thuexemayhanoi/global",purpose:"TOPICAL_MAP_PROMOTION",approval_mode:"STANDING_POLICY",
  policy:policyPath,approved_by:"STANDING_POLICY "+policyPath+" (machine-applied; not a personal owner approval)",
  approved_on:date,statement:STANDING_STATEMENT,candidate_ids:[...ids]};
}
export function planStandingPromotion({map,matrix,board,ids,policyPath,date,validation}){
 if(!ids.length)return null;
 const manifest=standingManifest(ids,{policyPath,date});
 return {manifest,plan:planPromotion({map,matrix,board,manifest,validation})};
}

/* ---------- Research batch intake (agents propose; CI validates; main ingests) ---------- */
const REF_LIMIT=8;
export function refKey(url){return "rx-"+createHash("sha256").update(String(url)).digest("hex").slice(0,12);}
export function validateResearchBatch(batch,{matrix,map,policy}){
 const issues=[],fail=(index,gate,reason)=>issues.push({index,gate,reason});
 if(batch?.version!==1||batch?.repo!=="thuexemayhanoi/global"||batch?.purpose!==RESEARCH_PURPOSE)fail(-1,"R1","Batch must be version 1, repo thuexemayhanoi/global, purpose "+RESEARCH_PURPOSE);
 if(!batch?.agent||unsafe(batch.agent.name)||!/^[A-Za-z0-9_-]{3,80}$/.test(batch.agent.session||""))fail(-1,"R1","agent.name and a stable agent.session are required");
 if(!DATE.test(batch?.researched_on||""))fail(-1,"R1","researched_on must be YYYY-MM-DD");
 const list=batch?.candidates;
 if(!Array.isArray(list)||list.length<1||list.length>policy.refill.batch_max)fail(-1,"R2","Provide 1.."+policy.refill.batch_max+" candidates");
 if(issues.length)return {passed:false,issues,accepted:[]};
 const clusters=new Map();
 for(const h of map.architecture?.hubs||[])for(const c of h.clusters)clusters.set(c.id,{hub:h.id,reserved:!!c.reserved_by,proposed:false});
 for(const h of map.architecture?.proposed_hubs||[])for(const c of h.clusters)clusters.set(c.id,{hub:h.id,reserved:!!c.reserved_by,proposed:true});
 const accepted=[],seen=new Map();
 for(const [i,c] of list.entries()){
  const before=issues.length;
  if(!c||typeof c!=="object"){fail(i,"R2","Candidate must be an object");continue;}
  if("search_volume" in c||"ranking" in c||"traffic" in c)fail(i,"R8","Do not submit volumes, rankings or traffic; keyword evidence stays NOT_VALIDATED");
  const parent=matrix.rows.find(r=>r.id===c.parent_id);
  const cl=clusters.get(c.subcluster);
  const domain=(policy.domains||[]).find(d=>d.id===c.domain_id);
  const researchOnly=c.parent_id===null&&cl?.proposed===true&&
    domain?.status==="RESEARCH_OPEN"&&domain.clusters.includes(cl.hub);
  if(!LOCALES.includes(c.locale)||(!researchOnly&&(!parent||parent.role!=="HUB"||parent.locale!==c.locale)))
   fail(i,"R3","Use an existing same-locale HUB or parent_id:null with RESEARCH_OPEN domain_id and proposed-Hub subcluster");
  if(!cl||cl.reserved||(researchOnly?!!parent:cl.proposed||!parent||cl.hub!==parent.cluster))
   fail(i,"R3","subcluster must belong to the existing Hub or the research-open proposed Hub");
  if(c.parent_id===null&&!researchOnly)fail(i,"R3","Unparented research requires an explicitly RESEARCH_OPEN domain and matching proposed Hub");
  if(!SLUG.test(c.slug||"")||c.slug.length>80)fail(i,"R4","slug must be lowercase ASCII kebab-case ≤80 chars");
  for(const k of ["primary_query","working_title","intent_rationale","content_angle"])if(unsafe(c[k]))fail(i,"R5",k+" missing or unsafe");
  if(String(c.intent_rationale||"").trim().length<60)fail(i,"R5","intent_rationale needs ≥60 chars");
  if(String(c.content_angle||"").trim().length<40)fail(i,"R5","content_angle needs ≥40 chars describing the unique value");
  if(!Array.isArray(c.secondary_queries)||c.secondary_queries.length<2||c.secondary_queries.length>6||c.secondary_queries.some(unsafe))fail(i,"R5","2–6 secondary queries");
  if(c.entities!==undefined&&(!Array.isArray(c.entities)||c.entities.length>12||c.entities.some(unsafe)))fail(i,"R5","entities must be ≤12 safe strings");
  if(!["informational","commercial_investigation","navigational"].includes(c.search_intent))fail(i,"R6","search_intent must be informational, commercial_investigation or navigational");
  if(!Number.isInteger(c.word_target)||c.word_target<1000||c.word_target>5000)fail(i,"R5","word_target 1000..5000");
  const refs=c.references;
  if(!Array.isArray(refs)||refs.length<2||refs.length>REF_LIMIT||refs.some(r=>!/^https:\/\/[^/\s]+\/?\S*$/i.test(r?.url||"")||/example\.(?:com|org|net)/i.test(r.url)||unsafe(r.title)||!DATE.test(r.checked_on||"")))
   fail(i,"R7","2–"+REF_LIMIT+" references, each https URL + title + checked_on");
  if(c.keyword_evidence!==undefined&&!["NOT_VALIDATED","AGENT_OBSERVED_SERP"].includes(c.keyword_evidence))fail(i,"R8","keyword_evidence is NOT_VALIDATED or AGENT_OBSERVED_SERP");
  const key=c.locale+"::"+fold(c.primary_query||"");
  if(seen.has(key))fail(i,"R5","Duplicate primary_query inside the batch (index "+seen.get(key)+")");
  seen.set(key,i);
  if(issues.length===before)accepted.push({index:i,candidate:c});
 }
 return {passed:issues.length===0,issues,accepted};
}
/**
 * Append accepted research candidates to the topical map as PROPOSED with new
 * TA IDs, then drop any that fail topical gates or factory duplicate layers.
 * Returns a new map (input untouched) plus per-candidate outcome.
 */
/** A proposal consumes a planning slot until it is promoted into the Matrix.
 * PROMOTED is counted via its Matrix row, never twice.
 * Blocked architecture research also consumes a planning slot, not an article. */
export function researchUsage({matrix,map,policy},locale){
 const roles=new Set(policy.targets.counted_roles);
 const rows=matrix.rows.filter(r=>r.locale===locale&&roles.has(r.role)).length;
 const pending=(map.locales[locale]?.proposals||[]).filter(p=>p.status!=="PROMOTED").length;
 return {locale,target:policy.targets.per_locale,rows,pending,total:rows+pending,available:Math.max(0,policy.targets.per_locale-rows-pending)};
}
export function ingestResearch(batch,{matrix,map,policy,source,frozenUrls=[]}){
 const v=validateResearchBatch(batch,{matrix,map,policy});
 const next=structuredClone(map),added=[],rejected=v.issues.filter(x=>x.index>=0).map(x=>({index:x.index,gate:x.gate,reason:x.reason}));
 if(v.issues.some(x=>x.index<0))return {map,added,rejected:v.issues,batch_error:true};
 const refs=next.references.references;
 for(const {index,candidate:c} of v.accepted){
  const L=next.locales[c.locale];
  const usage=researchUsage({matrix,map:next,policy},c.locale);
  if(usage.available===0){
   rejected.push({index,gate:"F6_LOCALE_CAP",reason:"Locale "+c.locale+" has "+usage.total+"/"+usage.target+
    " reserved planning slots (Matrix + unpromoted research); no new candidate admitted"});
   continue;
  }
  const nums=L.proposals.map(p=>Number(String(p.candidate_id).split("-")[2])||0);
  const id="TA-"+c.locale.toUpperCase()+"-"+String(1+Math.max(0,...nums)).padStart(4,"0");
  const keys=[];
  for(const r of c.references){
   const k=refs.find(x=>x.url===r.url)?.key||refKey(r.url);
   if(!refs.some(x=>x.key===k))refs.push({key:k,url:r.url,title:r.title,locale:r.locale||c.locale,page_language:r.locale||c.locale,
    covers:"Research reference submitted with "+id+" by "+batch.agent.name+".",topics:[],checked_on:r.checked_on,
    verified_by:"research agent "+batch.agent.name+" / "+batch.agent.session+" (not re-fetched by CI)"});
   if(!keys.includes(k))keys.push(k);
  }
  const parent=matrix.rows.find(r=>r.id===c.parent_id);
  const researchOnly=c.parent_id===null;
  const hub=researchOnly?(policy.domains||[]).find(d=>d.id===c.domain_id)?.clusters?.[0]:parent?.cluster;
  const proposal={candidate_id:id,locale:c.locale,role:"SUPPORT",parent_id:researchOnly?null:c.parent_id,cluster:hub,subcluster:c.subcluster,
   slug:c.slug,primary_query:c.primary_query.trim(),secondary_queries:c.secondary_queries,working_title:c.working_title.trim(),
   search_intent:c.search_intent,word_target:c.word_target,priority:50,intent_rationale:c.intent_rationale.trim(),
   content_angle:c.content_angle.trim(),...(c.entities?{entities:c.entities}:{}),references:keys,
   ...(Array.isArray(c.distinct_from)&&c.distinct_from.length?{distinct_from:c.distinct_from}:{}),
   status:researchOnly?"ARCHITECTURE_BLOCKED":"PROPOSED",serp_evidence:"NOT_VALIDATED",source_verification:"NOT_STARTED",
   research:{agent:batch.agent.name,session:batch.agent.session,researched_on:batch.researched_on,keyword_evidence:c.keyword_evidence||"NOT_VALIDATED",source}};
  // Factory duplicate layers against the Matrix and every live proposal in the locale.
  const stop=L.stop_tokens||[];
  const corpus=prepareCorpus([...matrix.rows.filter(r=>r.locale===c.locale&&["PILLAR","HUB","SUPPORT"].includes(r.role)),
   ...L.proposals.filter(p=>p.status!=="PROMOTED").map(p=>({...p,id:p.candidate_id}))],c.locale,stop);
  const dups=duplicateLayers({...proposal,id},corpus,{stop,thresholds:policy.duplicates,distinctMin:policy.duplicates.distinct_reason_min});
  if(dups.length){rejected.push({index,gate:"F5_DUPLICATE",reason:dups.map(d=>d.layer+"~"+d.with).join(", ")});continue;}
  L.proposals.push(proposal);added.push({index,candidate_id:id,locale:c.locale});
 }
 // Topical gates T1–T10 decide last; failing new candidates are removed, never forced in.
 for(let pass=0;pass<3&&added.length;pass++){
  const val=validateTopicalMap({map:next,matrix,frozenUrls});
  const bad=new Set(val.issues.map(i=>i.id).filter(id=>added.some(a=>a.candidate_id===id)));
  if(!bad.size)break;
  for(const a of [...added]){
   if(!bad.has(a.candidate_id))continue;
   const L=next.locales[a.locale];
   L.proposals=L.proposals.filter(p=>p.candidate_id!==a.candidate_id);
   rejected.push({index:a.index,gate:"T_GATES",reason:val.issues.filter(i=>i.id===a.candidate_id).map(i=>i.gate+": "+i.reason).join(" | ")});
   added.splice(added.indexOf(a),1);
  }
 }
 // Drop reference entries that no surviving proposal uses.
 const used=new Set(allProposals(next).flatMap(p=>p.references||[]));
 next.references.references=refs.filter(r=>!r.key.startsWith("rx-")||used.has(r.key));
 return {map:next,added,rejected,batch_error:false};
}

/** Validate multiple research files against one cumulative simulated map.
 * The actual repo remains unchanged; duplicate/intent and locale-cap gates
 * include every previously accepted batch, not just individual JSON files. */
export function validateResearchSequence(files,{matrix,map,policy,frozenUrls=[]}){
 let next=map;
 const results=[];
 for(const {file,batch} of files){
  const v=validateResearchBatch(batch,{matrix,map:next,policy});
  const dry=ingestResearch(batch,{matrix,map:next,policy,source:file,frozenUrls});
  const passed=v.passed&&!dry.batch_error&&dry.rejected.length===0&&dry.added.length===batch?.candidates?.length;
  results.push({file,passed,would_add:dry.added.length,rejected:dry.rejected});
  if(passed)next=dry.map;
 }
 return {passed:results.every(r=>r.passed),results,map:next};
}

/** Markdown dashboard from status + publisher state; data-derived only, no timestamps. */
/** Queue states for a SUBMITTED draft that is not live yet; every draft lands in exactly one. */
export const QUEUE_STATES=["AWAITING_QA","APPROVED_BY_POLICY","REPAIR","HUMAN_REVIEW_REQUIRED","WAIT_PARENT","WAIT_STAGE","ESCALATED","BLOCKED"];
/**
 * Publication pipeline from repository data only (pure): claims ledger, the trusted
 * publisher report (decision per draft hash) and publisher state (live QA results).
 * A report row counts only for the exact hash it evaluated; anything newer (a fresh
 * submission or an accepted revision) is AWAITING_QA until the next publisher run.
 * A SUBMITTED draft is never counted as live: only Matrix PUBLISHED rows are.
 */
export function publicationQueue({matrix,ledger,report=null,state=null}){
 const rows=new Map(matrix.rows.map(r=>[r.id,r]));
 const items=new Map((report?.version===2?report.items||[]:[]).map(i=>[i.id,i]));
 const zero=()=>Object.fromEntries(QUEUE_STATES.map(s=>[s,0]));
 const totals=zero(),byLocale={},byWriter={};
 let submittedLive=0,claimed=0;
 for(const c of ledger.claims){
  if(c.status==="CLAIMED"){claimed++;continue;}
  if(c.status!=="SUBMITTED")continue;
  const row=rows.get(c.id);
  if(row?.status==="PUBLISHED"){submittedLive++;continue;}
  const item=items.get(c.id);
  let s="AWAITING_QA";
  if(item&&item.source_sha256===c.source_sha256){
   if(item.decision==="APPROVED_BY_POLICY")s="APPROVED_BY_POLICY";
   else{
    const t=repairTicket(item,c);
    s=t?({ESCALATED_MAX_ATTEMPTS:"ESCALATED",WAIT:"BLOCKED"}[t.state]||t.state):"AWAITING_QA";
   }
  }
  const loc=row?.locale||c.id.slice(0,2).toLowerCase();
  (byLocale[loc]??=zero())[s]++;
  (byWriter[c.writer]??=zero())[s]++;
  totals[s]++;
 }
 const published=(state?.published||[]);
 const live={PUBLISH_STAGED:0,LIVE_QA_PASS:0,LIVE_QA_FAIL:0,LIVE_QA_INCONCLUSIVE:0};
 for(const p of published){
  if(p.live_qa==="PENDING")live.PUBLISH_STAGED++;
  else if(p.live_qa==="PASS")live.LIVE_QA_PASS++;
  else if(p.live_qa==="FAIL")live.LIVE_QA_FAIL++;
  else if(p.live_qa==="INCONCLUSIVE")live.LIVE_QA_INCONCLUSIVE++;
 }
 const matrixPublished=matrix.rows.filter(r=>r.status==="PUBLISHED"&&["HUB","SUPPORT"].includes(r.role)).length;
 return {ledger_revision:ledger.revision,report_ledger_revision:report?.version===2?report.ledger_revision:null,
  claimed,submitted_open:Object.values(totals).reduce((a,b)=>a+b,0),submitted_live:submittedLive,
  totals,byLocale,byWriter,live,policy_published_ids:published.map(p=>p.id),matrix_published_hub_support:matrixPublished,
  stage:state?.stage||null,paused:state?.paused??null,pause_reason:state?.pause_reason||null,
  last_successful_deployment:state?.last_successful_deployment||null};
}
export function dashboardMarkdown(status,{publisher=null,refill=null,rejectedTotal=0,queue=null,slots=null,ledger=null}={}){
 const L=status.locales,t=status.totals;
 const row=(code,s)=>"| "+code+" | "+s.target+" | "+s.published+" | "+s.submitted+" | "+s.claimed+" | "+s.review+" | "+s.ready+" | "+s.proposed+" | "+s.blocked+" | "+s.remaining+" | "+s.refill+" |";
 const sources="claims ledger revision "+status.ledger_revision+(queue?", publisher report of ledger revision "+(queue.report_ledger_revision??"none")+", publisher state":"");
 const out=["# Global Content Factory dashboard","",
  "Generated by `node scripts/topic-factory.mjs status --markdown` from repository data ("+sources+"). Never edit by hand. Topics, drafts, review holds and live pages are counted separately; a SUBMITTED draft is not a live page, and nothing here infers rankings or traffic.","",
  "## Topics and Writers","",
  "| Locale | Target | PUBLISHED | SUBMITTED | CLAIMED | REVIEW HOLD | READY | PROPOSED | BLOCKED | Remaining | Refill |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ...Object.entries(L).map(([c,s])=>row(c,s)),
  "| **all** | "+t.target+" | "+t.published+" | "+t.submitted+" | "+t.claimed+" | "+t.review+" | "+t.ready+" | "+t.proposed+" | "+t.blocked+" | "+t.remaining+" | |","",
  "- READY = Matrix IDEA rows free to claim; PROPOSED = researched candidates not yet in the Matrix; REVIEW HOLD = protected legacy drafts.",
  "- Accepted topics (Matrix Hub/Supporting rows): **"+t.accepted+" / "+t.target+"**. The target is a planning ceiling, not progress.",
  "- PUBLISHED Hub/Supporting URLs in the Matrix: **"+t.published+"** (including the original locale checklists).",
  "- Duplicate or gate-rejected candidates (current factory run): "+rejectedTotal,""];
 if(queue){
  const cols=QUEUE_STATES,head=["AWAITING QA","APPROVED_BY_POLICY (publish queue)","REPAIR","HUMAN_REVIEW_REQUIRED","WAIT_PARENT","WAIT_STAGE","ESCALATED","BLOCKED"];
  const line=(name,s)=>"| "+name+" | "+cols.map(k=>s?.[k]||0).join(" | ")+" |";
  out.push("## Publication queue (SUBMITTED drafts not live yet)","",
   "Every open SUBMITTED draft is in exactly one state. AWAITING QA = the publisher has not evaluated this exact draft hash yet. REPAIR = automated QA failed on a fixable gate; the same Writer session writes the next revision. HUMAN_REVIEW_REQUIRED = LEGAL/SAFETY/PRICE topic or money amounts; never auto-published. ESCALATED = three accepted repairs did not pass.","",
   "| Locale | "+head.join(" | ")+" |","|---|"+cols.map(()=>"---:").join("|")+"|",
   ...Object.keys(L).map(code=>line(code,queue.byLocale[code])),line("**all**",queue.totals),"",
   "- Writer CLAIMED (being written): **"+queue.claimed+"** · SUBMITTED and still open: **"+queue.submitted_open+"** · SUBMITTED and now live: **"+queue.submitted_live+"**","",
   "## Auto Publisher","",
   "- Stage: **"+(queue.stage||"PILOT")+"**"+(queue.paused?" — **PAUSED**: "+queue.pause_reason:" — running"),
   "","| PUBLISH_STAGED (committed, live QA pending) | LIVE_QA_PASS | LIVE_QA_FAIL | LIVE_QA_INCONCLUSIVE |","|---:|---:|---:|---:|",
   "| "+queue.live.PUBLISH_STAGED+" | "+queue.live.LIVE_QA_PASS+" | "+queue.live.LIVE_QA_FAIL+" | "+queue.live.LIVE_QA_INCONCLUSIVE+" |","",
   "- Standing-policy publications on record: "+(queue.policy_published_ids.join(", ")||"none"),
   "- Last successful deployment: "+(queue.last_successful_deployment?.at||"none yet"),"");
 }else if(publisher)out.push("## Auto Publisher","","- Stage: "+publisher.stage+(publisher.paused?" — **PAUSED**: "+publisher.pause_reason:""),
  "- Published by standing policy: "+(publisher.published||[]).length,
  "- Last successful deployment: "+(publisher.last_successful_deployment?.at||"none yet"),"");
 const view=ledger&&slots?slotView(ledger,slots):null;
 out.push("## Writer slots","","W1/W2/W3 are seats for external AI sessions (any provider). A slot only writes while its session is active; GitHub Actions never writes prose.","",
  "| Slot | State | Session | Claimed | Submitted | Released | REPAIR | HUMAN_REVIEW_REQUIRED | ESCALATED |","|---|---|---|---:|---:|---:|---:|---:|---:|",
  ...Object.entries(status.writers).map(([w,s])=>{
   const v=view?.[w],q=queue?.byWriter?.[w]||{};
   const state=v?v.state+(v.state==="AVAILABLE"&&slots?.slots?.[w]?.state&&slots.slots[w].state!=="AVAILABLE"?" (last report: "+slots.slots[w].state+")":""):"—";
   return "| "+w+" | "+state+" | "+(v?.session||slots?.slots?.[w]?.session||s.sessions.join(", ")||"—")+" | "+s.claimed+" | "+s.submitted+" | "+s.released+" | "+(q.REPAIR||0)+" | "+(q.HUMAN_REVIEW_REQUIRED||0)+" | "+(q.ESCALATED||0)+" |";
  }),"",
  "## Scope domains","",...status.domains.map(d=>"- "+d.label+" — "+d.status+(d.clusters.length?" ("+d.clusters.join(", ")+")":"")),"");
 if(refill)out.push("## Topic refill","",
  "- Gate-clean PROPOSED candidates the next standing-policy refill would promote to IDEA (≤50 per run): "+refill.selected.length,
  "- Locales whose READY deficit is larger than the researched candidates available (more research needed): "+(refill.research_needed.join(", ")||"none"),"");
 return out.join("\n")+"\n";
}
