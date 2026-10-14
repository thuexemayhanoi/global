#!/usr/bin/env node
/** Read-only SEO Engineer: Audit -> Matrix -> QA -> Report; no site edits. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const a=(name,def)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:def};
const locale=a("--locale","de"),count=Number(a("--count","2"));
if(!["vi","en","de","fr","es","nl","zh","pt","ko","ja"].includes(locale)||!Number.isInteger(count)||count<1||count>10){console.error("Invalid locale or count");process.exit(2);}
fs.mkdirSync(path.join(root,"reports"),{recursive:true});
const steps=[
["Generated page drift",["scripts/build.mjs","--check"]],
["SEO Matrix validation",["scripts/seo/validate-plan.mjs"]],
["Content graph coherence",["scripts/seo/content-graph.mjs","--check"]],
["Menu and footer QA",["scripts/nav-qa.mjs"]],
["SEO protection guard",["scripts/seo/seo-guard.mjs"]],
["Topical authority gates",["scripts/seo/topical-authority.mjs","validate"]],
["Technical SEO audit",["scripts/seo/audit-static.mjs","--out","reports/technical-audit.json","--fail-p0"]],
["AI Search signals",["scripts/seo/audit-ai-search.mjs","--out","reports/ai-search-audit.json"]],
["Next content research batch",["scripts/seo/content-factory.mjs","plan","--locale",locale,"--count",String(count),"--out","reports/writer-batch.json"]]
];
const results=steps.map(([name,args])=>{const r=spawnSync(process.execPath,args,{cwd:root,encoding:"utf8",maxBuffer:8*1024*1024,timeout:120000});console.log((r.status===0?"PASS ":"FAIL ")+name);if(r.status!==0)console.error(r.stderr||r.stdout);return {name,passed:r.status===0,exit_code:r.status};});
const matrix=JSON.parse(fs.readFileSync(path.join(root,"data/seo/master-matrix.json"),"utf8"));
const p=path.join(root,"reports/technical-audit.json"),audit=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):null;
const actions=[...(audit?.findings||[]).map((f,i)=>({id:"FIX-"+String(i+1).padStart(4,"0"),priority:f.priority,issue:f.code,url:f.url,fix:f.recommendation,status:"REQUIRES_REVIEW"})),...matrix.rows.filter(x=>x.role==="HUB"&&x.status==="IDEA").map(r=>({id:"GAP-"+r.id,priority:"P2",issue:"UNPUBLISHED_HUB",url:r.url,fix:"Verify locale-specific search intent and write useful original content",status:"UNVALIDATED_IDEA"}))];
const report={generated_at:new Date().toISOString(),scope:"read-only local repository",production_modified:false,external_ai_calls:false,checks:results,severity:audit?.severity_count||{},actions,limitations:["No live external crawl or Google Search Console","No rankings, search volumes, backlink metrics or AI citation tracking","No automatic publishing or production modification"]};
fs.writeFileSync(path.join(root,"reports/seo-engineer-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length,actions:actions.length,report:"reports/seo-engineer-report.json"},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
