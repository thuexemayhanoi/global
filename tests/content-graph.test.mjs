import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {buildGraph,renderReport,stringify,GRAPH_PATH,REPORT_PATH} from "../scripts/seo/content-graph.mjs";
const {graph,errors}=buildGraph(process.cwd());
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
 assert.ok(graph.silos.every(s=>s.action!=="GAP"),"no silo without any planned or proposed coverage");
 const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.id));
 for(const [a,t,b] of graph.edges)if(t==="links_in_content"||t==="hreflang_equivalent")assert.ok(published.has(a)&&published.has(b),a+" "+t+" "+b);
});

test("no unjustified competing intents today; an injected duplicate becomes REVIEW",()=>{
 assert.equal(graph.review_pairs.length,0);
 const dir=copyRepo();
 try{
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
  m.rows.push({...src,id:"DE-S99",url:"/de/guides/dup-test/",primary_query:"Führerschein deutscher Motorrad Vietnam",working_title:"Duplicate intent rehearsal title"});
  fs.writeFileSync(file,JSON.stringify(m,null,2));
  const r=spawnSync(process.execPath,["scripts/seo/validate-plan.mjs"],{cwd:dir,encoding:"utf8"});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Cannibalization candidate DE-S05 vs DE-S99/);
  const ok=JSON.parse(JSON.stringify(m));
  ok.rows.find(x=>x.id==="DE-S99").distinct_from=[{id:"DE-S05",reason:"Rehearsal: owner-reviewed distinct audience and intent for this test."}];
  fs.writeFileSync(file,JSON.stringify(ok,null,2));
  const r2=spawnSync(process.execPath,["scripts/seo/validate-plan.mjs"],{cwd:dir,encoding:"utf8"});
  assert.doesNotMatch(r2.stderr,/Cannibalization candidate/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
