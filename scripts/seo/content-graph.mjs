#!/usr/bin/env node
/**
 * Deterministic SEO knowledge/content graph. No live SERP queries are claimed.
 * Source-of-truth: Matrix + exclusive Writer Board + PUBLISHED HTML.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const matrix=read("data/seo/master-matrix.json");
const board=read("factory/external-writers/assignments.json");
const rows=matrix.rows;
const byId=new Map(rows.map(r=>[r.id,r]));
const owner=new Map(board.entries.map(r=>[r.id,r.writer]));
const eligible=r=>r.status==="PUBLISHED";
const pageFile=url=>url==="/"? "index.html":url.slice(1)+"index.html";
const q=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim();
const ownerKeys=new Map();
const children=new Map(rows.map(r=>[r.id,[]]));
for(const r of rows)if(r.parent_id&&children.has(r.parent_id))children.get(r.parent_id).push(r.id);
const errors=[];
for(const r of rows)if((r.role==="HUB"||r.role==="SUPPORT")&&!owner.has(r.id)&&r.id.endsWith("-CHECKLIST")===false)errors.push("Unassigned article ID "+r.id);
const nodes=rows.map(r=>{
 const k=r.locale+"::"+q(r.primary_query);
 const contenders=ownerKeys.get(k)||[];contenders.push(r.id);ownerKeys.set(k,contenders);
 const parent=byId.get(r.parent_id);
 const links=rows.filter(x=>eligible(x)&&x.locale===r.locale&&(x.role==="PILLAR"||x.id===r.parent_id||x.role==="SUPPORT"&&x.id.endsWith("-CHECKLIST"))&&x.id!==r.id).map(x=>x.url);
 const p=r.status==="PUBLISHED"? (r.role==="PILLAR"?"P0":"P1") : r.role==="HUB"?"P1":"P2";
 const publishedHTML=eligible(r)&&fs.existsSync(path.join(ROOT,pageFile(r.url)));
 return{
  id:r.id,locale:r.locale,role:r.role,cluster:r.cluster,primary_query_hypothesis:r.primary_query,
  intent:r.search_intent,working_title:r.working_title,parent_id:r.parent_id,
  child_ids:(children.get(r.id)||[]).sort(),proposed_url:r.url,
  published_url:eligible(r)?r.url:null,editorial_status:r.status,
  qa_status:eligible(r)?(publishedHTML?"PUBLISHED_HTML_EXISTS_REQUIRES_CONTENT_REVIEW":"MISSING_PUBLISHED_HTML"):"NOT_RUN",
  source_verification:r.source_verification||"UNVERIFIED",serp_evidence:r.serp_evidence||"NOT_VALIDATED",
  cannibalization_risk:"NOT_DETERMINED_WITHOUT_REAL_SERP",
  internal_link_targets_published:links.sort(),writer_lane:owner.get(r.id)||null,
  implementation_priority:p,priority_value:r.priority
 };
});
for(const node of nodes)if(node.qa_status==="MISSING_PUBLISHED_HTML")errors.push("Missing published HTML "+node.id);
for(const ids of ownerKeys.values())if(ids.length>1)for(const id of ids){
 const found=nodes.find(n=>n.id===id);found.cannibalization_risk="EXACT_QUERY_COLLISION_REVIEW";
}
const graph={version:1,site:"https://global.rentbikehanoi.com",source:"data/seo/master-matrix.json",writer_source:"factory/external-writers/assignments.json",disclaimer:"Keyword volume/rankings and SERP intent are unverified; flags are only content planning signals.",counts:{rows:nodes.length,published:nodes.filter(x=>x.editorial_status==="PUBLISHED").length,idea:nodes.filter(x=>x.editorial_status==="IDEA").length,locales:matrix.locales.length},nodes};
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
const output=JSON.stringify(graph,null,2)+"\n";
const dest=path.join(ROOT,"data/seo/content-graph.json");
const arg=process.argv[2]||"--check";
if(arg==="--write"){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,output);}
else if(arg==="--check"){if(!fs.existsSync(dest)||fs.readFileSync(dest,"utf8")!==output){console.error("CONTENT_GRAPH_OUT_OF_SYNC — run node scripts/seo/content-graph.mjs --write");process.exit(1)}}
else{console.error("Use --check or --write");process.exit(2)}
console.log("CONTENT_GRAPH_"+(arg==="--check"?"VALID":"WRITTEN")+" "+JSON.stringify(graph.counts));
