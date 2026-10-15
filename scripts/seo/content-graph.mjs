#!/usr/bin/env node
/**
 * Deterministic SEO knowledge graph + Global Content Cannibalization Matrix.
 * Sources: Matrix, Writer board, protected drafts, topical-authority map and the
 * generated PUBLISHED HTML. The volatile claims ledger is intentionally NOT an
 * input, so autopilot commits never make --check drift (live pipeline states:
 * node scripts/seo/topical-authority.mjs status).
 *
 * Hierarchy: Homepage (/) → Pillar (/{locale}/) → Hub (/topics/) → Silo
 * (cluster section, no URL) → Supporting (/guides/).
 * Actions: KEEP · UPGRADE · REVIEW · CREATE — structural and on-page evidence
 * only; no SERP, ranking or Search Console data is claimed.
 *
 *   node scripts/seo/content-graph.mjs --check | --write
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadTopicalMap,tokens,similarPairs,proposalURL} from "./topical-authority-core.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
export const GRAPH_PATH="data/seo/content-graph.json";
export const REPORT_PATH="docs/GLOBAL-SITE-MATRIX.md";
export const MAX_OVERLAPS=5,MAX_REVIEW_LISTED=200;
export const THRESHOLDS={
 PILLAR:{words:600,h2:3,faq:3},HUB:{words:1000,h2:4,faq:0},SUPPORT:{words:800,h2:4,faq:0},
 overlap_review:0.66,overlap_review_same_silo_intent:0.5,overlap_note:0.5,content_overlap_review:0.5
};
const LEVEL={LANGUAGE_SELECTOR:"HOMEPAGE",PILLAR:"PILLAR",HUB:"HUB",SUPPORT:"SUPPORT",UTILITY:"UTILITY"};
const q=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim();
const pageFile=url=>url==="/"?"index.html":url.slice(1)+"index.html";
const CJK=new Set(["zh","ja","ko"]);
function words(text,locale){
 if(CJK.has(locale))return [...new Intl.Segmenter(locale,{granularity:"word"}).segment(text)].filter(w=>w.isWordLike).length;
 return text.split(/\s+/u).filter(Boolean).length;
}
export function contentTokens(text,locale){
 const t=q(text);
 if(CJK.has(locale)){const c=[...t.replace(/[\s\p{P}]/gu,"")],out=new Set();for(let i=0;i<c.length-1;i++)out.add(c[i]+c[i+1]);return out;}
 // Vietnamese whitespace separates syllables, not lexical words. A one-syllable overlap
 // overcounts generic rental vocabulary; adjacent syllable pairs preserve near-copy detection.
 if(locale==="vi"){const w=t.split(/[^\p{L}\p{N}]+/u).filter(Boolean),out=new Set();for(let i=0;i<w.length-1;i++)out.add(w[i]+" "+w[i+1]);return out;}
 return new Set(t.split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2));
}
const mainOf=html=>(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[,""])[1];
const textOf=html=>html.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&[a-z#0-9]+;/gi," ").replace(/\s+/g," ").trim();
const hrefs=html=>[...html.matchAll(/\bhref="([^"#?]*)/g)].map(m=>m[1].replace(/^https:\/\/global\.rentbikehanoi\.com/,"")).filter(h=>h.startsWith("/"));

export function buildGraph(root=ROOT){
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
 const matrix=read("data/seo/master-matrix.json"),board=read("factory/external-writers/assignments.json");
 const registry=read("factory/external-writers/protected-drafts.json");
 const map=loadTopicalMap(root),arch=map.architecture;
 const rows=matrix.rows,byId=new Map(rows.map(r=>[r.id,r])),byUrl=new Map(rows.map(r=>[r.url,r]));
 const owner=new Map(board.entries.map(r=>[r.id,r.writer]));
 const protectedIds=new Set([...registry.protected.map(p=>p.id),...(registry.held_ids||[]).map(p=>p.id)]);
 const clusters=new Map();
 for(const h of [...(arch?.hubs||[]),...(arch?.proposed_hubs||[])])for(const c of h.clusters)clusters.set(c.id,{...c,hub:h.id,proposed_hub:Boolean(arch.proposed_hubs?.includes(h))});
 const errors=[];
 for(const r of rows)if((r.role==="HUB"||r.role==="SUPPORT")&&!owner.has(r.id)&&r.id.endsWith("-CHECKLIST")===false)errors.push("Unassigned article ID "+r.id);
 const children=new Map(rows.map(r=>[r.id,[]]));
 for(const r of rows)if(r.parent_id&&children.has(r.parent_id))children.get(r.parent_id).push(r.id);
 const published=r=>r.status==="PUBLISHED";
 // Published HTML evidence.
 const html=new Map();
 for(const r of rows.filter(published)){
  const f=path.join(root,pageFile(r.url));
  if(!fs.existsSync(f)){errors.push("Missing published HTML "+r.id);continue;}
  html.set(r.id,fs.readFileSync(f,"utf8"));
 }
 const metrics=new Map(),edges=[],contentTok=new Map(),metricsOut=new Map();
 const inbound=new Map(rows.map(r=>[r.id,{main:new Set(),any:new Set()}]));
 for(const [id,h] of html){
  const r=byId.get(id),main=mainOf(h),text=textOf(main);
  metrics.set(id,{words:words(text,r.locale==="global"?"en":r.locale),h2:(main.match(/<h2\b/gi)||[]).length,faq:(main.match(/<details\b/gi)||[]).length});
  contentTok.set(id,contentTokens(text,r.locale));
  const mainLinks=new Set(hrefs(main)),all=new Set(hrefs(h));
  for(const u of all){const t=byUrl.get(u);if(!t||t.id===id||!published(t))continue;inbound.get(t.id).any.add(id);if(mainLinks.has(u))inbound.get(t.id).main.add(id);}
  metricsOut.set(id,[...mainLinks].filter(u=>{const t=byUrl.get(u);return t&&t.id!==id&&published(t);}).length);
  for(const m of h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/global\.rentbikehanoi\.com([^"]*)">/g)){
   const t=byUrl.get(m[2]);if(t&&t.id!==id&&m[1]!=="x-default")edges.push([id,"hreflang_equivalent",t.id]);
  }
 }
 for(const [id,m] of metrics){m.inbound_pages=inbound.get(id).any.size;m.inbound_contextual=inbound.get(id).main.size;m.outbound_contextual=metricsOut.get(id)||0;}
 // Silo membership from topical locale maps.
 const siloOf=new Map(),siloLabel=new Map();
 for(const [code,L] of Object.entries(map.locales)){
  for(const [id,c] of Object.entries(L.existing||{}))siloOf.set(id,c);
  for(const [c,label] of Object.entries(L.cluster_labels||{}))siloLabel.set(code+"::"+c,label);
 }
 const items=[];// overlap universe: HUB/SUPPORT rows + live candidates
 for(const r of rows.filter(r=>r.role==="HUB"||r.role==="SUPPORT"))items.push({id:r.id,locale:r.locale,query:r.primary_query,silo:siloOf.get(r.id)||r.subcluster||null,intent:r.search_intent,parent:r.parent_id,distinct:new Map((r.distinct_from||[]).map(d=>[d.id,d.reason]))});
 for(const L of Object.values(map.locales))for(const p of L.proposals||[])if(p.status!=="PROMOTED")
  items.push({id:p.candidate_id,locale:p.locale,query:p.primary_query,silo:p.subcluster,intent:p.search_intent,parent:p.parent_id,distinct:new Map((p.distinct_from||[]).map(d=>[d.id,d.reason]))});
 const overlaps=new Map(items.map(i=>[i.id,[]])),review=[];
 for(const code of matrix.locales){
  const set=items.filter(i=>i.locale===code),stop=map.locales[code]?.stop_tokens||[];
  for(const [a,b,s] of similarPairs(set.map(i=>tokens(i.query,code,stop)),0.34)){
   const x=set[a],y=set[b];
   const parentChild=x.parent===y.id||y.parent===x.id;
   const sameSilo=Boolean(x.silo)&&x.silo===y.silo,sameIntent=x.intent===y.intent;
   const justified=String(x.distinct.get(y.id)||y.distinct.get(x.id)||"").length>=40;
   const high=s>=THRESHOLDS.overlap_review||(s>=THRESHOLDS.overlap_review_same_silo_intent&&sameSilo&&sameIntent);
   const level=parentChild?"PARENT_CHILD_EXPECTED":justified?"JUSTIFIED_DISTINCT":high?"HIGH":s>=THRESHOLDS.overlap_note||(sameSilo&&sameIntent)?"MEDIUM":null;
   if(!level)continue;
   const rec={score:Number(s.toFixed(2)),same_silo:sameSilo,same_intent:sameIntent,level};
   overlaps.get(x.id).push({id:y.id,...rec});overlaps.get(y.id).push({id:x.id,...rec});
   if(level==="HIGH")review.push({a:x.id,b:y.id,...rec,basis:"query"});
  }
 }
 // Published content overlap (actual text), same locale, excluding the language selector.
 const contentOverlap=new Map();
 for(const code of matrix.locales){
  const pub=rows.filter(r=>r.locale===code&&published(r)&&contentTok.has(r.id)&&r.role!=="LANGUAGE_SELECTOR"&&r.role!=="UTILITY");
  for(const [a,b,s] of similarPairs(pub.map(r=>contentTok.get(r.id)),THRESHOLDS.content_overlap_review)){
   const x=pub[a],y=pub[b];
   contentOverlap.set(x.id,Math.max(contentOverlap.get(x.id)||0,s));contentOverlap.set(y.id,Math.max(contentOverlap.get(y.id)||0,s));
   review.push({a:x.id,b:y.id,score:Number(s.toFixed(2)),level:"HIGH",basis:"published_content"});
  }
 }
 const reviewIds=new Set(review.flatMap(r=>[r.a,r.b]));
 const entitiesOf=silo=>clusters.get(silo)?.entities||[];
 const nodes=rows.map(r=>{
  const silo=siloOf.get(r.id)||r.subcluster||null,c=clusters.get(silo);
  const links=rows.filter(x=>published(x)&&x.locale===r.locale&&(x.role==="PILLAR"||x.id===r.parent_id||x.role==="SUPPORT"&&x.id.endsWith("-CHECKLIST"))&&x.id!==r.id).map(x=>x.url);
  const p=published(r)?(r.role==="PILLAR"?"P0":"P1"):r.role==="HUB"?"P1":"P2";
  const level=LEVEL[r.role]||r.role,m=metrics.get(r.id)||null;
  let action="CREATE",reasons=[];
  if(published(r)){
   const t=THRESHOLDS[r.role];
   if(!t){action="KEEP";reasons.push("Utility or language selector: outside topical depth targets");}
   else{
    if(m.words<t.words)reasons.push("Main content "+m.words+" words < "+t.words+" target for "+level);
    if(m.h2<t.h2)reasons.push(m.h2+" H2 sections < "+t.h2);
    if(m.faq<t.faq)reasons.push(m.faq+" visible FAQ items < "+t.faq);
    const pubChildren=(children.get(r.id)||[]).map(id=>byId.get(id)).filter(x=>x&&published(x));
    for(const ch of pubChildren)if(!inbound.get(ch.id).main.has(r.id))reasons.push("No in-content link to published child "+ch.id);
    action=reviewIds.has(r.id)?"REVIEW":reasons.length?"UPGRADE":"KEEP";
    if(!reasons.length)reasons.push("Meets depth and linking targets");
   }
  }else if(reviewIds.has(r.id)){action="REVIEW";reasons.push("Unjustified high intent overlap — resolve before a Writer claims it");}
  else reasons.push(protectedIds.has(r.id)?"Gap with an authored draft under editorial review":"Evidence-free gap: no PUBLISHED page owns this intent");
  const ov=overlaps.get(r.id)||[];
  return{
   id:r.id,locale:r.locale,role:r.role,cluster:r.cluster,primary_query_hypothesis:r.primary_query,
   intent:r.search_intent,working_title:r.working_title,parent_id:r.parent_id,
   child_ids:(children.get(r.id)||[]).sort(),proposed_url:r.url,
   published_url:published(r)?r.url:null,editorial_status:r.status,
   qa_status:published(r)?(html.has(r.id)?"PUBLISHED_HTML_EXISTS_REQUIRES_CONTENT_REVIEW":"MISSING_PUBLISHED_HTML"):"NOT_RUN",
   source_verification:r.source_verification||"UNVERIFIED",serp_evidence:r.serp_evidence||"NOT_VALIDATED",
   cannibalization_risk:reviewIds.has(r.id)?"REVIEW_STRUCTURAL_OVERLAP":ov.some(o=>o.level==="PARENT_CHILD_EXPECTED")?"PARENT_CHILD_EXPECTED":ov.length?"NOTED_STRUCTURAL_OVERLAP":"NONE_DETECTED_STRUCTURAL",
   internal_link_targets_published:links.sort(),writer_lane:owner.get(r.id)||null,
   implementation_priority:p,priority_value:r.priority,
   level,pipeline_state:published(r)?"PUBLISHED":protectedIds.has(r.id)?"PROTECTED_DRAFT":r.status,
   action,action_reasons:reasons,silo:silo,journey_stage:r.role==="PILLAR"?"awareness":r.role==="HUB"?arch?.hub_journey?.[r.cluster]||null:c?.journey_stage||null,
   intent_class:c?.intent_class||(r.role==="PILLAR"?"commercial":null),entities:r.role==="PILLAR"?[arch?.central_entity?.id].filter(Boolean):entitiesOf(silo),
   overlaps:ov.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,MAX_OVERLAPS),overlap_count:ov.length,
   content_metrics:m?{...m,max_content_overlap:Number((contentOverlap.get(r.id)||0).toFixed(2))}:null,
   performance:"NOT_CONNECTED"
  };
 });
 for(const node of nodes)if(node.qa_status==="MISSING_PUBLISHED_HTML")errors.push("Missing published HTML "+node.id);
 const candidates=[];
 for(const [code,L] of Object.entries(map.locales))for(const p of L.proposals||[]){
  if(p.status==="PROMOTED")continue;
  const c=clusters.get(p.subcluster),blocked=p.status==="ARCHITECTURE_BLOCKED";
  candidates.push({id:p.candidate_id,locale:code,level:"SUPPORT",silo:p.subcluster,hub:c?.hub||null,parent_id:p.parent_id,proposed_url:proposalURL(p),
   primary_query_hypothesis:p.primary_query,working_title:p.working_title,intent:p.search_intent,journey_stage:c?.journey_stage||null,intent_class:c?.intent_class||null,
   pipeline_state:p.status,action:reviewIds.has(p.candidate_id)?"REVIEW":"CREATE",blocked_by:blocked?"ARCHITECTURE_REVIEW":"OWNER_PROMOTION_MANIFEST",
   overlaps:(overlaps.get(p.candidate_id)||[]).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,MAX_OVERLAPS),performance:"NOT_CONNECTED"});
 }
 const nodeById=new Map(nodes.map(n=>[n.id,n]));
 const silos=[];
 for(const code of matrix.locales)for(const [cid,c] of clusters){
  const U=code.toUpperCase(),hub=rows.find(r=>r.locale===code&&r.role==="HUB"&&r.cluster===c.hub)||null;
  const members=nodes.filter(n=>n.locale===code&&n.silo===cid&&n.role!=="HUB"),cands=candidates.filter(x=>x.locale===code&&x.silo===cid);
  const pubM=members.filter(n=>n.pipeline_state==="PUBLISHED");
  const action=c.reserved_by?(pubM.some(n=>n.action==="UPGRADE")?"UPGRADE":pubM.length?"KEEP":"CREATE"):
   pubM.length?(pubM.some(n=>n.action!=="KEEP")?"UPGRADE":"KEEP"):members.length||cands.length?"CREATE":"GAP";
  silos.push({id:U+"-"+cid,locale:code,silo:cid,label:siloLabel.get(code+"::"+cid)||cid,hub_id:hub?.id||null,hub:c.hub,proposed_hub:c.proposed_hub,
   journey_stage:c.journey_stage||null,intent_class:c.intent_class||null,entities:c.entities||[],reserved_by:c.reserved_by||null,url:null,
   members:{published:pubM.map(n=>n.id),protected_drafts:members.filter(n=>n.pipeline_state==="PROTECTED_DRAFT").map(n=>n.id),
    planned:members.filter(n=>n.pipeline_state==="IDEA").map(n=>n.id),candidates:cands.map(x=>x.id)},action});
 }
 // Typed edges: hierarchy, silo membership, entities.
 const root0=rows.find(r=>r.role==="LANGUAGE_SELECTOR");
 for(const r of rows){
  if(r.role==="PILLAR"&&root0)edges.push([root0.id,"has_pillar",r.id]);
  if(r.role==="HUB")edges.push([r.parent_id,"has_hub",r.id]);
  if(r.role==="PILLAR"&&arch?.central_entity)edges.push([r.id,"about",arch.central_entity.id]);
 }
 for(const s of silos){
  if(s.hub_id)edges.push([s.hub_id,"has_silo",s.id]);
  for(const id of [...s.members.published,...s.members.protected_drafts,...s.members.planned,...s.members.candidates])edges.push([s.id,"contains",id]);
  for(const e of s.entities)edges.push([s.id,"about",e]);
 }
 const entities=[];
 if(arch?.central_entity)entities.push({id:arch.central_entity.id,label_en:arch.central_entity.label_en,kind:"central"});
 const seenE=new Set(entities.map(e=>e.id));
 for(const [cid,c] of [...clusters].sort((a,b)=>a[0].localeCompare(b[0])))for(const e of c.entities||[])if(!seenE.has(e)){seenE.add(e);entities.push({id:e,kind:"cluster_entity",first_silo:cid});}
 const edgeKey=e=>e.join("\u0000");
 const uniqEdges=[...new Map(edges.map(e=>[edgeKey(e),e])).values()].sort((a,b)=>edgeKey(a).localeCompare(edgeKey(b)));
 const all=[...nodes,...candidates];
 const tally=(list,key)=>list.reduce((o,x)=>(o[x[key]]=(o[x[key]]||0)+1,o),{});
 const graph={version:2,site:"https://global.rentbikehanoi.com",source:"data/seo/master-matrix.json",writer_source:"factory/external-writers/assignments.json",
  topical_source:"data/seo/topical-authority/",
  disclaimer:"Keyword volume/rankings and SERP intent are unverified; flags are only content planning signals.",
  hierarchy:"Homepage (/) → Pillar (/{locale}/) → Hub (/topics/) → Silo (cluster section, no URL) → Supporting (/guides/)",
  performance_signals:{status:"NOT_CONNECTED",detail:"No Search Console property for global.rentbikehanoi.com is connected (connected Search Console accounts cover thuexemaynguyentu.com only). Actions use structure and on-page evidence; never infer rankings or traffic."},
  thresholds:THRESHOLDS,live_answers:arch?.live_answers||null,
  counts:{rows:nodes.length,published:nodes.filter(x=>x.editorial_status==="PUBLISHED").length,idea:nodes.filter(x=>x.editorial_status==="IDEA").length,locales:matrix.locales.length,
   candidates:candidates.length,silos:silos.length,entities:entities.length,edges:uniqEdges.length,
   actions:tally(all,"action"),silo_actions:tally(silos,"action"),review_pairs:review.length},
  review_pairs:review.sort((a,b)=>b.score-a.score||a.a.localeCompare(b.a)||a.b.localeCompare(b.b)).slice(0,MAX_REVIEW_LISTED),
  nodes,silos,candidates,entities,edges:uniqEdges};
 return {graph,errors};
}

/** Pretty JSON, but arrays of primitives (ids, edges, entity lists) stay on one line. */
export function stringify(v,indent=""){
 const next=indent+"  ";
 if(Array.isArray(v)){
  if(!v.length)return "[]";
  if(v.every(x=>x===null||typeof x!=="object"||(Array.isArray(x)&&x.every(y=>y===null||typeof y!=="object"))))
   return "["+v.map(x=>JSON.stringify(x)).join(", ")+"]";
  return "[\n"+v.map(x=>next+stringify(x,next)).join(",\n")+"\n"+indent+"]";
 }
 if(v&&typeof v==="object"){
  const keys=Object.keys(v).filter(k=>v[k]!==undefined);
  if(!keys.length)return "{}";
  return "{\n"+keys.map(k=>next+JSON.stringify(k)+": "+stringify(v[k],next)).join(",\n")+"\n"+indent+"}";
 }
 return JSON.stringify(v);
}
const pct=(a,b)=>b?Math.round(100*a/b)+"%":"–";
export function renderReport(graph){
 const L=[...new Set(graph.nodes.map(n=>n.locale).filter(l=>l!=="global"))];
 const out=[];
 out.push("# Global Site Matrix — knowledge graph, cannibalization and topical gaps","",
  "Generated by `node scripts/seo/content-graph.mjs --write` from the Matrix, topical map and live HTML. Do not edit by hand.","",
  "Hierarchy: "+graph.hierarchy+".","",
  "**Performance signals:** "+graph.performance_signals.status+" — "+graph.performance_signals.detail,"",
  "Actions: **KEEP** (meets targets) · **UPGRADE** (published but below depth/linking targets; content changes go through the editorial gate) · **REVIEW** (unjustified high intent overlap) · **CREATE** (evidence-free gap: no published page owns the intent).","");
 out.push("## Summary","","| Set | KEEP | UPGRADE | REVIEW | CREATE |","|---|---|---|---|---|");
 const row=(name,list)=>{const t=list.reduce((o,x)=>(o[x.action]=(o[x.action]||0)+1,o),{});out.push("| "+name+" | "+(t.KEEP||0)+" | "+(t.UPGRADE||0)+" | "+(t.REVIEW||0)+" | "+(t.CREATE||0)+" |");};
 row("Matrix rows ("+graph.nodes.length+")",graph.nodes);row("Topical candidates ("+graph.candidates.length+")",graph.candidates);row("Silos ("+graph.silos.length+")",graph.silos);
 out.push("","Knowledge graph: "+graph.counts.entities+" entities, "+graph.counts.edges+" typed edges ("+Object.entries(graph.edges.reduce((o,e)=>(o[e[1]]=(o[e[1]]||0)+1,o),{})).map(([k,v])=>k+" "+v).join(", ")+").","");
 out.push("## REVIEW — competing intents","");
 if(!graph.review_pairs.length)out.push("No unjustified high-overlap pair across "+graph.nodes.length+" Matrix rows and "+graph.candidates.length+" candidates (query similarity ≥ "+graph.thresholds.overlap_review+", or ≥ "+graph.thresholds.overlap_review_same_silo_intent+" within the same silo and intent; published text Jaccard ≥ "+graph.thresholds.content_overlap_review+"). Parent/child Hub overlaps are expected and justified pairs carry a written `distinct_from` reason.");
 else{out.push(graph.counts.review_pairs+" pair(s); showing up to "+graph.review_pairs.length+".","","| A | B | Score | Basis |","|---|---|---|---|");for(const r of graph.review_pairs)out.push("| "+r.a+" | "+r.b+" | "+r.score+" | "+r.basis+" |");}
 out.push("","## UPGRADE — live pages below targets","","| ID | URL | Words | H2 | FAQ | Inbound pages | Reasons |","|---|---|---|---|---|---|---|");
 for(const n of graph.nodes.filter(n=>n.action==="UPGRADE"))out.push("| "+n.id+" | "+n.published_url+" | "+n.content_metrics.words+" | "+n.content_metrics.h2+" | "+n.content_metrics.faq+" | "+n.content_metrics.inbound_pages+" | "+n.action_reasons.join("; ")+" |");
 out.push("","Targets: Pillar ≥ "+graph.thresholds.PILLAR.words+" words, ≥ "+graph.thresholds.PILLAR.faq+" FAQ; Supporting ≥ "+graph.thresholds.SUPPORT.words+" words, ≥ "+graph.thresholds.SUPPORT.h2+" H2 (new drafts already need ≥ 1,000 words).","");
 out.push("## Silo coverage (Hub → Silo → Supporting)","","Cell: P published · D protected draft · I planned IDEA · C topical candidates · action.","",
  "| Silo | Journey | Intent | Live FAQ | "+L.join(" | ")+" |","|---|---|---|---|"+L.map(()=>"---").join("|")+"|");
 const siloIds=[...new Set(graph.silos.map(s=>s.silo))];
 for(const sid of siloIds){
  const any=graph.silos.find(s=>s.silo===sid);
  const cells=L.map(l=>{const s=graph.silos.find(x=>x.locale===l&&x.silo===sid);if(!s)return "–";const m=s.members;
   const parts=[m.published.length?"P"+m.published.length:"",m.protected_drafts.length?"D"+m.protected_drafts.length:"",m.planned.length?"I"+m.planned.length:"",m.candidates.length?"C"+m.candidates.length:""].filter(Boolean).join(" ");
   return (parts||"∅")+" "+s.action;});
  const faq=(graph.live_answers?.pillar_faq_silos||[]).includes(sid)?"Pillar FAQ ×10":"–";
  out.push("| "+sid+(any.proposed_hub?" (proposed Hub)":"")+(any.reserved_by?" (reserved: "+any.reserved_by+")":"")+" | "+(any.journey_stage||"")+" | "+(any.intent_class||"")+" | "+faq+" | "+cells.join(" | ")+" |");
 }
 out.push("","## Search journey coverage","","Published / planned (IDEA + drafts) / candidates per stage.","","| Stage | "+L.join(" | ")+" |","|---|"+L.map(()=>"---").join("|")+"|");
 const stages=["awareness","consideration","decision","pickup","riding","return","planning"];
 for(const st of stages){
  out.push("| "+st+" | "+L.map(l=>{
   const n=graph.nodes.filter(x=>x.locale===l&&x.journey_stage===st&&x.role!=="HUB"&&x.role!=="UTILITY");
   const c=graph.candidates.filter(x=>x.locale===l&&x.journey_stage===st);
   return n.filter(x=>x.pipeline_state==="PUBLISHED").length+" / "+n.filter(x=>x.pipeline_state!=="PUBLISHED").length+" / "+c.length;}).join(" | ")+" |");
 }
 out.push("","Every locale checklist also covers the "+(graph.live_answers?.checklist_section_stages||[]).join(" → ")+" steps in short sections; that is breadth, not depth (see UPGRADE). `return` (deposit refund, late return) has no dedicated page and is answered inside the deposit and extra-cost silos rather than a separate silo. Transactional booking intent is deliberately not targeted: /global is an independent guide (owner positioning decision).","");
 out.push("## Locale totals","","| Locale | Rows | Published | Protected drafts | Planned | Candidates | Published depth OK |","|---|---|---|---|---|---|---|");
 for(const l of L){
  const n=graph.nodes.filter(x=>x.locale===l&&x.role!=="UTILITY"),c=graph.candidates.filter(x=>x.locale===l),p=n.filter(x=>x.pipeline_state==="PUBLISHED");
  out.push("| "+l+" | "+n.length+" | "+p.length+" | "+n.filter(x=>x.pipeline_state==="PROTECTED_DRAFT").length+" | "+n.filter(x=>x.pipeline_state==="IDEA").length+" | "+c.length+" | "+pct(p.filter(x=>x.action==="KEEP").length,p.length)+" |");
 }
 out.push("","Live Writer states (CLAIMED/SUBMITTED) change on every autopilot commit and are not part of this file: run `node scripts/seo/topical-authority.mjs status`.","");
 return out.join("\n")+"\n";
}

function main(){
 const arg=process.argv[2]||"--check";
 const {graph,errors}=buildGraph();
 if(errors.length){console.error(errors.join("\n"));process.exit(1)}
 const output=stringify(graph)+"\n",report=renderReport(graph);
 const dest=path.join(ROOT,GRAPH_PATH),rdest=path.join(ROOT,REPORT_PATH);
 if(arg==="--write"){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,output);fs.writeFileSync(rdest,report);}
 else if(arg==="--check"){
  if(!fs.existsSync(dest)||fs.readFileSync(dest,"utf8")!==output||!fs.existsSync(rdest)||fs.readFileSync(rdest,"utf8")!==report){console.error("CONTENT_GRAPH_OUT_OF_SYNC — run node scripts/seo/content-graph.mjs --write");process.exit(1)}
 }else{console.error("Use --check or --write");process.exit(2)}
 console.log("CONTENT_GRAPH_"+(arg==="--check"?"VALID":"WRITTEN")+" "+JSON.stringify({rows:graph.counts.rows,published:graph.counts.published,idea:graph.counts.idea,locales:graph.counts.locales,candidates:graph.counts.candidates,silos:graph.counts.silos,edges:graph.counts.edges,actions:graph.counts.actions,review_pairs:graph.counts.review_pairs}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
