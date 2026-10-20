import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {buildGraph,renderReport,stringify,contentTokens,THRESHOLDS,GRAPH_PATH,REPORT_PATH} from "../scripts/seo/content-graph.mjs";
import {rewindPromotionsInDir} from "./support/promotion-fixture.mjs";

const jaccard=(a,b)=>{let n=0;for(const x of a)if(b.has(x))n++;return n/(a.size+b.size-n);};
test("Vietnamese uses adjacent syllable pairs: distinct topics avoid false review, near copies stay detectable",()=>{
 const prices="Giá thuê xe máy ở Hà Nội phụ thuộc vào dòng xe số ngày thuê và thời điểm thuê. Người thuê nên xác nhận tiền cọc phí giao xe phương thức trả xe chi phí xăng và thời hạn trong hợp đồng.";
 const paperwork="Giấy tờ hợp đồng thuê xe máy ở Hà Nội cần xác định người thuê số giấy phép lái xe địa điểm nhận xe điều kiện thanh toán thời gian hoàn trả cùng trách nhiệm xử lý sự cố và điều khoản bảo hiểm.";
 assert.ok(jaccard(contentTokens(prices,"vi"),contentTokens(paperwork,"vi"))<THRESHOLDS.content_overlap_review);
 const nearCopy=prices.replace("dòng xe","loại xe").replace("chi phí xăng","tiền xăng");
 assert.ok(jaccard(contentTokens(prices,"vi"),contentTokens(nearCopy,"vi"))>=THRESHOLDS.content_overlap_review,"near copy remains REVIEW");
});
const {graph,errors}=buildGraph(process.cwd());
test("known Vietnamese Hub-versus-guide pages do not become false competing-intent alarms",()=>{
 const distinct=[["VI-H03","VI-S05"],["VI-H03","VI-S04"],["VI-H02","VI-H03"]];
 for(const [a,b] of distinct)assert.ok(!graph.review_pairs.some(p=>[p.a,p.b].includes(a)&&[p.a,p.b].includes(b)),a+" vs "+b+" is a false positive");
});
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const copyRepo=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"global-graph-"));
 fs.cpSync(process.cwd(),dir,{recursive:true,filter:src=>!/[\\/](?:\.git|node_modules|reports)(?:[\\/]|$)/.test(src)});
 return dir;
};

test("graph and site-matrix report are deterministic and committed in sync",()=>{
 assert.deepEqual(errors,[]);
 assert.equal(fs.readFileSync(GRAPH_PATH,"utf8"),stringify(graph)+"\n");
 assert.deepEqual(JSON.parse(fs.readFileSync(GRAPH_PATH,"utf8")),JSON.parse(JSON.stringify(graph)),"compact serializer is lossless");
 assert.equal(fs.readFileSync(REPORT_PATH,"utf8"),renderReport(graph));
 assert.equal(graph.performance_signals.status,"NOT_CONNECTED");
 assert.ok(!/"pipeline_state": "(?:CLAIMED|SUBMITTED)"/.test(fs.readFileSync(GRAPH_PATH,"utf8")),"volatile claim states stay out of the committed graph");
 assert.ok(fs.statSync(GRAPH_PATH).size<25e6,"graph must stay far below GitHub file limits (shard by locale before ~10k URLs)");
});

test("every Matrix row keeps its legacy fields and gains level, action and evidence",()=>{
 assert.equal(graph.nodes.length,matrix.rows.length);
 for(const n of graph.nodes){
  for(const k of ["id","locale","role","primary_query_hypothesis","child_ids","proposed_url","published_url","editorial_status","qa_status","cannibalization_risk","internal_link_targets_published","writer_lane","implementation_priority"])assert.ok(k in n,n.id+" "+k);
  assert.ok(["KEEP","UPGRADE","REVIEW","CREATE"].includes(n.action),n.id);
  assert.ok(n.action_reasons.length>0,n.id);
  if(n.editorial_status==="PUBLISHED")assert.ok(n.content_metrics.words>0,n.id);
  else assert.equal(n.content_metrics,null);
 }
 for(const n of graph.nodes.filter(n=>["UTILITY","LANGUAGE_SELECTOR"].includes(n.role)))assert.equal(n.action,"KEEP",n.id);
 for(const n of graph.nodes.filter(n=>n.action==="UPGRADE"))assert.ok(n.action_reasons.some(r=>/words|H2|FAQ|link/.test(r)),n.id);
});

test("silos are graph nodes, never URLs, and cover every Hub in every locale",()=>{
 for(const s of graph.silos)assert.equal(s.url,null);
 for(const hub of matrix.rows.filter(r=>r.role==="HUB"))assert.ok(graph.edges.some(([a,t])=>a===hub.id&&t==="has_silo"),hub.id);
 assert.ok(graph.silos.every(s=>s.action!=="GAP"||s.proposed_hub),"research-only proposed Hubs may have empty silo coverage");
 assert.ok(graph.silos.filter(s=>!s.proposed_hub).every(s=>s.action!=="GAP"),"established Hubs must retain real planned or published coverage");
 const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.id));
 for(const [a,t,b] of graph.edges)if(t==="links_in_content"||t==="hreflang_equivalent")assert.ok(published.has(a)&&published.has(b),a+" "+t+" "+b);
});

test("existing competing intents are explicitly REVIEW, and an injected duplicate stays blocked",()=>{
 // Publication can reveal legitimate overlap between already-published pages.
 // Never hide the findings or silently change live slugs/content to make this pass.
 for(const pair of graph.review_pairs){
  assert.ok(["HIGH","MEDIUM"].includes(pair.level),JSON.stringify(pair));
  for(const id of [pair.a,pair.b]){
   // A pair can join two Matrix rows or two research candidates (same-template route guides), and both stay visible as REVIEW.
   const n=graph.nodes.find(x=>x.id===id),c=graph.candidates.find(x=>x.id===id);
   assert.equal((n||c)?.action,"REVIEW",id+" must remain visible for cannibalization review");
   if(n)assert.match(n.cannibalization_risk||"",/REVIEW/,id);
  }
 }
 const dir=copyRepo();
 try{
  rewindPromotionsInDir(dir,{locales:["de"]}); // a PROPOSED DE candidate even when the factory promoted them all
  const rel="data/seo/topical-authority/de.json",d=JSON.parse(fs.readFileSync(path.join(dir,rel),"utf8"));
  const p=d.proposals.find(x=>x.status==="PROPOSED");
  p.primary_query="Führerschein deutscher Motorrad Vietnam";
  fs.writeFileSync(path.join(dir,rel),JSON.stringify(d,null,2));
  const g=buildGraph(dir).graph;
  assert.ok(g.review_pairs.some(r=>[r.a,r.b].includes("DE-S05")&&[r.a,r.b].includes(p.candidate_id)));
  assert.equal(g.candidates.find(c=>c.id===p.candidate_id).action,"REVIEW");
  assert.equal(g.nodes.find(n=>n.id==="DE-S05").action,"REVIEW");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("validate-plan blocks near-duplicate Matrix rows before any Writer claim",()=>{
 const dir=copyRepo();
 try{
  const file=path.join(dir,"data/seo/master-matrix.json"),m=JSON.parse(fs.readFileSync(file,"utf8"));
  const src=m.rows.find(r=>r.id==="DE-S05");
  // Matrix IDs keep growing (DE-S99 is a real row today), so the rehearsal row takes the next free DE ID.
  const dup="DE-S"+(1+Math.max(...m.rows.filter(r=>/^DE-S\d+$/.test(r.id)).map(r=>Number(r.id.slice(4)))));
  m.rows.push({...src,id:dup,url:"/de/guides/dup-test/",primary_query:"Führerschein deutscher Motorrad Vietnam",working_title:"Duplicate intent rehearsal title"});
  fs.writeFileSync(file,JSON.stringify(m,null,2));
  const r=spawnSync(process.execPath,["scripts/seo/validate-plan.mjs"],{cwd:dir,encoding:"utf8"});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,new RegExp("Cannibalization candidate DE-S05 vs "+dup));
  const ok=JSON.parse(JSON.stringify(m));
  ok.rows.find(x=>x.id===dup).distinct_from=[{id:"DE-S05",reason:"Rehearsal: owner-reviewed distinct audience and intent for this test."}];
  fs.writeFileSync(file,JSON.stringify(ok,null,2));
  const r2=spawnSync(process.execPath,["scripts/seo/validate-plan.mjs"],{cwd:dir,encoding:"utf8"});
  assert.doesNotMatch(r2.stderr,/Cannibalization candidate/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
