/**
 * Topical Authority engine — data model, gates and planners.
 *
 * The topical map (data/seo/topical-authority/) is a staged backlog of
 * native-language keyword HYPOTHESES grouped Entity Hub → Topic Pillar →
 * Cluster → Supporting. It is never rendered, linked, indexed or claimable.
 * Only an exact owner promotion manifest applied on a reviewed non-main
 * branch can turn PROPOSED candidates into Matrix IDEA rows; publication
 * stays behind scripts/seo/publish-batch.mjs.
 *
 * Gates
 *  T1 identity/schema     T2 hierarchy (same-locale HUB, cluster/sub-cluster)
 *  T3 URL safety/unique   T4 query uniqueness + cannibalization similarity
 *  T5 reserved intents    T6 title quality/uniqueness
 *  T7 claim safety        T8 research inputs (verified reference keys)
 *  T9 governance flags    T10 localization (script, cross-locale copies)
 */
import fs from "node:fs";
import path from "node:path";

export const TA_DIR="data/seo/topical-authority";
export const PROPOSAL_STATES=new Set(["PROPOSED","ARCHITECTURE_BLOCKED","PROMOTED"]);
export const INTENTS=new Set(["informational","commercial_investigation","navigational","transactional"]);
export const SIMILARITY_FAIL=0.66;
export const SIMILARITY_WARN=0.5;
const ID=/^TA-(VI|EN|DE|FR|ES|NL|ZH|PT|KO|JA)-\d{4}$/;
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CJK_BIGRAM=new Set(["zh","ja"]);
const SCRIPT={
 ja:{test:s=>/[぀-ヿ]/u.test(s)||/[一-鿿]/u.test(s),label:"Japanese kana/kanji"},
 zh:{test:s=>/[一-鿿]/u.test(s)&&!/[぀-ヿ]/u.test(s),label:"Chinese Han without kana"},
 ko:{test:s=>/[가-힯]/u.test(s),label:"Hangul"}
};
const VI_DIACRITIC=/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu;
// Global unsafe-claim patterns: concrete money amounts and absolute promises.
const MONEY=/\d[\d.,\s]*(?:k\b|vnd|vnđ|đ\b|đồng|usd|us\$|\$|€|eur\b|円|元|원|dong)/iu;
const unsafeText=s=>typeof s!=="string"||/[<>{}]/.test(s)||/TBD|TODO|lorem ipsum|placeholder/i.test(s);
export const normalize=s=>String(s||"").normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/gu," ").trim();
export const proposalURL=p=>"/"+p.locale+"/guides/"+p.slug+"/";
const readJSON=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),"utf8"));

export function loadTopicalMap(root){
 const dir=path.join(root,TA_DIR);
 if(!fs.existsSync(dir))return {architecture:null,references:{references:[]},locales:{}};
 const architecture=readJSON(root,TA_DIR+"/architecture.json");
 const references=fs.existsSync(path.join(dir,"references.json"))?readJSON(root,TA_DIR+"/references.json"):{references:[]};
 const locales={};
 for(const name of fs.readdirSync(dir).sort()){
  const m=name.match(/^([a-z]{2})\.json$/);
  if(m)locales[m[1]]=readJSON(root,TA_DIR+"/"+name);
 }
 return {architecture,references,locales};
}
export const allProposals=map=>Object.values(map.locales).flatMap(l=>Array.isArray(l.proposals)?l.proposals:[]);
export const proposalUrls=map=>allProposals(map).filter(p=>p?.locale&&p?.slug).map(proposalURL);

function clusterIndex(architecture){
 const idx=new Map();
 for(const hub of architecture?.hubs||[])for(const c of hub.clusters)idx.set(c.id,{hub:hub.id,cluster:c,proposed:false});
 for(const hub of architecture?.proposed_hubs||[])for(const c of hub.clusters)idx.set(c.id,{hub:hub.id,cluster:c,proposed:true,status:hub.status});
 return idx;
}

/** Tokens for overlap scoring: head-entity stop terms removed; CJK uses character bigrams. */
export function tokens(text,locale,stop=[]){
 const stops=[...stop].map(normalize).filter(Boolean).sort((a,b)=>b.length-a.length);
 if(CJK_BIGRAM.has(locale)){
  let s=normalize(text);
  for(const t of stops)s=s.split(t).join(" ");
  const out=new Set();
  for(const run of s.split(/[\s\p{P}]+/u).filter(Boolean)){
   const chars=[...run];
   if(chars.length===1)out.add(chars[0]);
   for(let i=0;i<chars.length-1;i++)out.add(chars[i]+chars[i+1]);
  }
  return out;
 }
 // Whole-word/phrase stop removal so "xe" never strips the inside of "xem".
 let s=" "+normalize(text).replace(/[^\p{L}\p{N}']+/gu," ")+" ";
 for(const t of stops){const needle=" "+t.replace(/[^\p{L}\p{N}']+/gu," ")+" ";while(s.includes(needle))s=s.replace(needle," ");}
 return new Set(s.split(" ").filter(x=>x.length>1));
}
export function similarity(a,b,locale,stop){
 const x=tokens(a,locale,stop),y=tokens(b,locale,stop);
 const union=new Set([...x,...y]).size;
 if(!union)return 0;
 return [...x].filter(t=>y.has(t)).length/union;
}

export function validateTopicalMap({map,matrix,frozenUrls=[]}){
 const issues=[],warnings=[];
 const fail=(gate,id,reason)=>issues.push({gate,id,reason});
 const warn=(gate,id,reason)=>warnings.push({gate,id,reason});
 const arch=map.architecture;
 if(arch?.version!==1||arch?.repo!=="thuexemayhanoi/global"||!Array.isArray(arch?.hubs))fail("T1","architecture","Architecture file missing or malformed");
 const clusters=clusterIndex(arch);
 const refs=new Map((map.references?.references||[]).map(r=>[r.key,r]));
 for(const r of refs.values())if(!/^https:\/\/[^/]+/i.test(r.url||"")||!/^\d{4}-\d{2}-\d{2}$/.test(r.checked_on||"")||!r.title||unsafeText(r.title))
  fail("T8",r.key||"reference","Reference registry entry needs an https URL, title and checked_on date");
 const rows=matrix.rows,byId=new Map(rows.map(r=>[r.id,r]));
 // Owner maps let a PROMOTED candidate coexist with the Matrix row it became.
 const urls=new Map([...frozenUrls.map(u=>[u,"FROZEN"]),...rows.map(r=>[r.url,r.id])]);
 const queries=new Map(rows.map(r=>[r.locale+"::"+normalize(r.primary_query),r.id]));
 const titles=new Map(rows.map(r=>[r.locale+"::"+normalize(r.working_title),r.id]));
 const ids=new Set(),crossQuery=new Map(),crossTitle=new Map();
 for(const code of Object.keys(map.locales))if(!matrix.locales.includes(code))fail("T1",code,"Locale file for unknown locale");
 for(const code of matrix.locales){
  const L=map.locales[code];
  if(!L){fail("T1",code,"Missing locale topical map "+TA_DIR+"/"+code+".json");continue;}
  if(L.version!==1||L.locale!==code||!Array.isArray(L.proposals)||!Array.isArray(L.stop_tokens)||!Array.isArray(L.reserved_terms)||!Array.isArray(L.forbidden_claim_terms))
   fail("T1",code,"Locale file needs version 1, locale, stop_tokens, reserved_terms, forbidden_claim_terms and proposals");
  if(!String(L.market_notes||"").trim()||String(L.market_notes).length<80)fail("T10",code,"Locale needs substantive market_notes explaining localization");
  for(const [id,cluster] of Object.entries(L.existing||{})){
   const row=byId.get(id);
   if(!row||row.locale!==code)fail("T2",id,"Existing mapping references a row outside this locale");
   else if(!clusters.has(cluster)&&cluster!==row.cluster)fail("T2",id,"Unknown cluster "+cluster);
   else if(clusters.has(cluster)&&clusters.get(cluster).hub!==row.cluster)fail("T2",id,"Mapped cluster "+cluster+" is outside the row's hub "+row.cluster);
  }
  const stop=L.stop_tokens||[];
  const localRows=rows.filter(r=>r.locale===code&&["PILLAR","HUB","SUPPORT"].includes(r.role));
  const seen=[];
  for(const [i,p] of (L.proposals||[]).entries()){
   const id=p?.candidate_id||code+"-row-"+i;
   if(!p||typeof p!=="object"){fail("T1",id,"Proposal must be an object");continue;}
   const self=p.status==="PROMOTED"?p.matrix_id:undefined;
   const clash=(map,key)=>map.has(key)&&map.get(key)!==self;
   // T1
   if(!ID.test(id)||!id.startsWith("TA-"+code.toUpperCase()+"-")||ids.has(id))fail("T1",id,"Invalid or duplicate candidate_id");
   ids.add(id);
   if(p.locale!==code)fail("T1",id,"Proposal locale differs from file locale");
   if(p.role!=="SUPPORT")fail("T2",id,"Topical proposals extend Supporting guides only; new Hubs need an architecture decision");
   // T2
   const c=clusters.get(p.subcluster);
   const parent=byId.get(p.parent_id);
   if(!c)fail("T2",id,"Unknown sub-cluster "+p.subcluster);
   else if(c.proposed){
    if(p.status!=="ARCHITECTURE_BLOCKED"||p.parent_id!==null||p.cluster!==c.hub)fail("T2",id,"Topics under a proposed Hub must be ARCHITECTURE_BLOCKED with parent_id null and cluster "+c.hub);
   }else{
    if(!parent||parent.role!=="HUB"||parent.locale!==code)fail("T2",id,"Parent must be a same-locale Matrix HUB");
    else if(parent.cluster!==p.cluster||c.hub!==p.cluster)fail("T2",id,"cluster/sub-cluster must match parent Hub "+parent.cluster);
    if(c.cluster.reserved_by)fail("T5",id,"Sub-cluster "+p.subcluster+" is reserved by the live "+c.cluster.reserved_by+" page");
    if(p.status==="ARCHITECTURE_BLOCKED")fail("T9",id,"ARCHITECTURE_BLOCKED is only for proposed Hubs");
   }
   // T3
   const url=p.slug?proposalURL(p):null;
   if(!SLUG.test(p.slug||"")||p.slug.length>80||!url||url.length>150)fail("T3",id,"Slug must be lowercase ASCII kebab-case ≤80 chars");
   else if(clash(urls,url))fail("T3",id,"URL collides with a Matrix/frozen/proposed URL "+url);
   if(url)urls.set(url,id);
   // T4
   if(unsafeText(p.primary_query)||normalize(p.primary_query).length<(CJK_BIGRAM.has(code)||code==="ko"?6:12))fail("T4",id,"primary_query missing, unsafe or too short");
   if(!INTENTS.has(p.search_intent))fail("T4",id,"Invalid search_intent");
   const qk=code+"::"+normalize(p.primary_query);
   if(clash(queries,qk))fail("T4",id,"Exact query collision with "+queries.get(qk));
   queries.set(qk,id);
   if(!Array.isArray(p.secondary_queries)||p.secondary_queries.length<2||p.secondary_queries.length>6||p.secondary_queries.some(unsafeText))
    fail("T4",id,"Provide 2–6 native secondary query variants");
   const distinct=new Map((p.distinct_from||[]).map(d=>[d?.id,d?.reason]));
   for(const other of [...localRows,...seen]){
    const oid=other.id||other.candidate_id;
    if(oid===self)continue;
    const score=similarity(p.primary_query,other.primary_query,code,stop);
    const justified=String(distinct.get(oid)||"").length>=40;
    if(justified)continue;
    if(score>=SIMILARITY_FAIL)fail("T4",id,"Cannibalization risk vs "+oid+" (overlap "+score.toFixed(2)+"); merge, re-scope or justify in distinct_from");
    else if(score>=SIMILARITY_WARN)warn("T4",id,"Review intent overlap vs "+oid+" (overlap "+score.toFixed(2)+")");
   }
   for(const d of p.distinct_from||[])if(!byId.has(d?.id)&&!seen.some(s=>s.candidate_id===d?.id)||String(d?.reason||"").length<40)
    fail("T4",id,"distinct_from must name an existing ID with a ≥40 char reason");
   // T5
   const hay=normalize(p.primary_query+" "+p.working_title+" "+p.slug.replace(/-/g," "));
   for(const term of L.reserved_terms||[])if(term&&hay.includes(normalize(term)))fail("T5",id,"Targets reserved live intent '"+term+"' owned by an existing URL");
   // T6
   const minTitle=CJK_BIGRAM.has(code)||code==="ko"?8:20;
   if(unsafeText(p.working_title)||[...p.working_title].length<minTitle||[...p.working_title].length>110)fail("T6",id,"working_title must be "+minTitle+"–110 chars and safe");
   const tk=code+"::"+normalize(p.working_title);
   if(clash(titles,tk))fail("T6",id,"Title duplicates "+titles.get(tk));
   titles.set(tk,id);
   if(!Number.isInteger(p.word_target)||p.word_target<1000||p.word_target>5000)fail("T6",id,"word_target must be 1000..5000");
   // T7
   const claimText=[p.primary_query,p.working_title,...(p.secondary_queries||[])].join(" ");
   if(MONEY.test(claimText))fail("T7",id,"Concrete money amounts are not allowed in planning keywords or titles");
   for(const term of L.forbidden_claim_terms||[])if(term&&normalize(p.working_title).includes(normalize(term)))fail("T7",id,"Title makes an unsupported claim: '"+term+"'");
   // T8
   const keys=Array.isArray(p.references)?p.references:[];
   if(keys.length<2||keys.some(k=>!refs.has(k))||new Set(keys).size!==keys.length)fail("T8",id,"Need ≥2 distinct keys from references.json (verified inputs, not proof of facts)");
   else if(!keys.some(k=>[code,"global"].includes(refs.get(k).locale)))warn("T8",id,"No native-language or global reference attached");
   if(unsafeText(p.intent_rationale)||String(p.intent_rationale||"").trim().length<60)fail("T8",id,"intent_rationale needs ≥60 chars of audience/intent reasoning");
   // T9
   if(!PROPOSAL_STATES.has(p.status))fail("T9",id,"Invalid status "+p.status);
   if(p.serp_evidence!=="NOT_VALIDATED"||p.source_verification!=="NOT_STARTED"||p.publish===true||p.owner_approved===true)
    fail("T9",id,"Proposals stay NOT_VALIDATED / NOT_STARTED and never carry publish or approval flags");
   if(p.status==="PROMOTED"&&!(byId.get(p.matrix_id)?.url===url))fail("T9",id,"PROMOTED proposal must point at its Matrix row with the same URL");
   if(p.status!=="PROMOTED"&&p.matrix_id!==undefined)fail("T9",id,"matrix_id is only set by promotion");
   if(!Number.isInteger(p.priority)||p.priority<38||p.priority>99)fail("T9",id,"priority must be 38..99 (existing Supporting topics own 30..37)");
   // T10
   const sc=SCRIPT[code];
   if(sc&&(!sc.test(p.primary_query)||!sc.test(p.working_title)))fail("T10",id,"Query and title must be written in "+sc.label);
   if(code==="vi"&&!VI_DIACRITIC.test(p.working_title))fail("T10",id,"Vietnamese title must use diacritics");
   const ck=normalize(p.primary_query),ct=normalize(p.working_title);
   if(crossQuery.has(ck)&&crossQuery.get(ck)!==code)fail("T10",id,"Same query text as a "+crossQuery.get(ck)+" proposal — localize, do not copy");
   if(crossTitle.has(ct)&&crossTitle.get(ct)!==code)fail("T10",id,"Same title as a "+crossTitle.get(ct)+" proposal — localize, do not copy");
   crossQuery.set(ck,code);crossTitle.set(ct,code);
   seen.push({...p,id});
  }
 }
 const proposals=allProposals(map);
 return {passed:issues.length===0,issues,warnings,
  counts:{locales:Object.keys(map.locales).length,proposals:proposals.length,
   proposed:proposals.filter(p=>p.status==="PROPOSED").length,
   architecture_blocked:proposals.filter(p=>p.status==="ARCHITECTURE_BLOCKED").length,
   promoted:proposals.filter(p=>p.status==="PROMOTED").length,references:refs.size},
  auto_materialize:false,auto_publish:false};
}

/** Per-locale, per-cluster state coverage across Matrix, Writer ledger and topical map. */
export function coverage({map,matrix,claims={claims:[]},protectedData={protected:[],held_ids:[]}}){
 const clusters=clusterIndex(map.architecture);
 const review=new Set([...(protectedData.protected||[]).map(p=>p.id),...(protectedData.held_ids||[]).map(p=>p.id)]);
 const live=new Map();
 for(const c of claims.claims||[])if(c.status!=="RELEASED")live.set(c.id,c.status);
 const stateOf=r=>r.status==="PUBLISHED"?"PUBLISHED":review.has(r.id)?"REVIEW":live.get(r.id)==="SUBMITTED"?"SUBMITTED":live.get(r.id)==="CLAIMED"?"WRITING":r.status==="BLOCKED"?"BLOCKED":"PLANNED";
 const empty=()=>({PUBLISHED:0,REVIEW:0,SUBMITTED:0,WRITING:0,PLANNED:0,BLOCKED:0,PROPOSED:0,ARCHITECTURE_BLOCKED:0});
 const out={totals:empty(),locales:{}};
 for(const code of matrix.locales){
  const L=map.locales[code]||{existing:{},proposals:[]};
  const loc={totals:empty(),clusters:{}};
  for(const [cid] of clusters)loc.clusters[cid]=empty();
  for(const r of matrix.rows.filter(r=>r.locale===code&&["HUB","SUPPORT","PILLAR"].includes(r.role))){
   const s=stateOf(r);loc.totals[s]++;out.totals[s]++;
   const cid=L.existing?.[r.id];
   if(cid&&loc.clusters[cid])loc.clusters[cid][s]++;
  }
  for(const p of L.proposals||[]){
   if(p.status==="PROMOTED")continue; // counted through its Matrix row
   const s=p.status==="ARCHITECTURE_BLOCKED"?"ARCHITECTURE_BLOCKED":"PROPOSED";
   loc.totals[s]++;out.totals[s]++;
   if(loc.clusters[p.subcluster])loc.clusters[p.subcluster][s]++;
  }
  loc.gaps=Object.entries(loc.clusters).filter(([cid,v])=>!clusters.get(cid).proposed&&!clusters.get(cid).cluster.reserved_by&&
   v.PUBLISHED+v.REVIEW+v.SUBMITTED+v.WRITING+v.PLANNED+v.PROPOSED===0).map(([cid])=>cid);
  out.locales[code]=loc;
 }
 return out;
}

/** Internal-link plan for a Matrix row or proposal; renderable_now lists PUBLISHED targets only. */
export function linkPlan({map,matrix,id}){
 const rows=matrix.rows,byId=new Map(rows.map(r=>[r.id,r]));
 const prop=allProposals(map).find(p=>p.candidate_id===id);
 const node=byId.get(id)||(prop&&{id:prop.candidate_id,locale:prop.locale,role:"SUPPORT",parent_id:prop.parent_id,url:proposalURL(prop),status:prop.status});
 if(!node)throw Error("Unknown ID "+id);
 const L=map.locales[node.locale]||{existing:{},proposals:[]};
 const sub=prop?prop.subcluster:L.existing?.[node.id];
 const clusters=clusterIndex(map.architecture);
 const hub=sub?clusters.get(sub)?.hub:node.role==="HUB"?node.cluster:null;
 const subOf=x=>x.candidate_id?x.subcluster:L.existing?.[x.id];
 const pool=[...rows.filter(r=>r.locale===node.locale&&r.role==="SUPPORT"&&r.id!==node.id),
  ...(L.proposals||[]).filter(p=>p.status!=="PROMOTED"&&p.candidate_id!==node.id).map(p=>({...p,id:p.candidate_id,url:proposalURL(p)}))];
 const planned=[];
 const add=(rel,t)=>{if(t)planned.push({relation:rel,id:t.id,url:t.url,state:t.status,renderable:t.status==="PUBLISHED"});};
 const pillar=rows.find(r=>r.locale===node.locale&&r.role==="PILLAR");
 if(node.role!=="PILLAR")add("entity_hub",pillar);
 if(node.parent_id&&byId.get(node.parent_id)?.role==="HUB")add("topic_pillar",byId.get(node.parent_id));
 if(node.role==="HUB")for(const r of pool.filter(x=>x.parent_id===node.id))add("child_supporting",r);
 if(node.role==="SUPPORT"&&sub){
  for(const r of pool.filter(x=>subOf(x)===sub).slice(0,3))add("same_cluster",r);
  for(const r of pool.filter(x=>subOf(x)!==sub&&clusters.get(subOf(x))?.hub===hub).slice(0,2))add("adjacent_cluster",r);
 }
 return {id:node.id,locale:node.locale,sub_cluster:sub||null,hub,planned,
  renderable_now:planned.filter(p=>p.renderable).map(p=>p.url),
  rule:"Only renderable_now targets may appear as HTML links; the rest are editorial intent until PUBLISHED."};
}

/**
 * Pure promotion planner: turns owner-approved PROPOSED candidates into Matrix
 * IDEA rows plus balanced Writer-board entries. Throws on any refusal.
 */
export function planPromotion({map,matrix,board,manifest,validation}){
 if(manifest?.version!==1||manifest?.repo!=="thuexemayhanoi/global"||manifest?.purpose!=="TOPICAL_MAP_PROMOTION")
  throw Error("Manifest must be version 1, repo thuexemayhanoi/global, purpose TOPICAL_MAP_PROMOTION");
 if(!String(manifest.approved_by||"").trim()||!/^\d{4}-\d{2}-\d{2}$/.test(manifest.approved_on||""))throw Error("Manifest needs approved_by and approved_on (YYYY-MM-DD)");
 if(manifest.statement!=="I approve adding these topical-map candidates to the SEO Matrix as unpublished IDEA rows. This is not publication approval.")
  throw Error("Manifest statement must match the exact approval sentence");
 const wanted=manifest.candidate_ids;
 if(!Array.isArray(wanted)||!wanted.length||wanted.length>50||new Set(wanted).size!==wanted.length)throw Error("candidate_ids must list 1..50 unique IDs");
 if(!validation?.passed)throw Error("Topical map has failing gates; fix them before promotion");
 const byCandidate=new Map(allProposals(map).map(p=>[p.candidate_id,p]));
 const rows=[...matrix.rows],entries=[...board.entries];
 const nextS=code=>1+Math.max(0,...rows.filter(r=>r.locale===code&&/^[A-Z]{2}-S\d+$/.test(r.id)).map(r=>Number(r.id.split("-S")[1])));
 const counts=w=>entries.filter(e=>e.writer===w).length;
 const added=[],promoted=[];
 for(const cid of wanted){
  const p=byCandidate.get(cid);
  if(!p)throw Error("Unknown candidate "+cid);
  if(p.status!=="PROPOSED")throw Error(cid+" is "+p.status+"; only PROPOSED candidates under an existing Hub can be promoted");
  const code=p.locale,id=code.toUpperCase()+"-S"+String(nextS(code)).padStart(2,"0");
  const row={id,locale:code,url:proposalURL(p),role:"SUPPORT",cluster:p.cluster,parent_id:p.parent_id,
   primary_query:p.primary_query,working_title:p.working_title,search_intent:p.search_intent,status:"IDEA",
   serp_evidence:"NOT_VALIDATED",source_verification:"NOT_STARTED",priority:p.priority,subcluster:p.subcluster,topical_candidate_id:cid};
  rows.push(row);
  const writer=["W1","W2","W3"].sort((a,b)=>counts(a)-counts(b)||a.localeCompare(b))[0];
  entries.push({id,writer,url:row.url,locale:code,role:"SUPPORT",parent_id:row.parent_id,cluster:row.cluster});
  added.push(row);promoted.push({candidate_id:cid,matrix_id:id});
 }
 return {matrix:{...matrix,rows},board:{...board,entries},added,promoted,
  next:["node scripts/seo/content-graph.mjs --write","node scripts/build.mjs","node scripts/build.mjs --check","node scripts/nav-qa.mjs","node scripts/seo/validate-plan.mjs","node scripts/seo/seo-guard.mjs","node scripts/seo/topical-authority.mjs validate"],
  publish:false};
}
