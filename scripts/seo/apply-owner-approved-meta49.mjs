#!/usr/bin/env node
/**
 * One-time, owner-approved application of the 49 reviewed-on-GitHub SEO title/meta
 * proposals in vi,en,de,fr,es,nl,pt (S01..S07 only).
 * Run ONLY on seo/v10-approved-meta49-20261021, never directly on main.
 * Preflight is fail-closed, and the wrapper workflow commits only after full QA.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {listProposalFiles,loadPackets,validateProposal} from "./apply-meta-proposals.mjs";
import {buildRegistry} from "./seo-guard-core.mjs";
import {collectHtml} from "./seo-guard.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
process.chdir(ROOT);
const REQUIRED=["vi","en","de","fr","es","nl","pt"];
const REGISTRY="data/seo/url-freeze.json";
const prefix="docs/seo-v10/proposals";
const fsRead=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const old=fsRead(REGISTRY);
// The frozen content snapshots predate merged Pillar/checklist additions (#82/#89).
// Compare against the CURRENT, deterministic committed HTML, not outdated old
// word-count/H2 snapshots. The existing seo-guard below still protects the
// original freeze from content loss and changed SEO fingerprint.
const currentMatrix=fsRead("data/seo/master-matrix.json");
const currentLocales=fsRead("content/locales.json");
const currentBaseline=buildRegistry({matrix:currentMatrix,locales:currentLocales,files:collectHtml(),previous:old});
const baselineUrl=new Map(currentBaseline.urls.map(x=>[x.url,x]));
const originalPackets=loadPackets();
const expected=[];
for(const locale of REQUIRED){
 const proposalFile=path.join(ROOT,prefix,`meta-${locale}.json`);
 if(!fs.existsSync(proposalFile))throw Error("Missing owner-approved proposal file: "+proposalFile);
 const proposals=JSON.parse(fs.readFileSync(proposalFile,"utf8"));
 if(proposals.length!==7)throw Error(locale+" must have exactly seven proposals, found "+proposals.length);
 const ids=Array.from({length:7},(_,i)=>`${locale.toUpperCase()}-S${String(i+1).padStart(2,"0")}`);
 if(JSON.stringify(proposals.map(p=>p.id).sort())!==JSON.stringify(ids.sort()))
  throw Error("Unexpected IDs in "+locale+" proposal set");
 for(const p of proposals){
  const record=originalPackets.get(p.id)?.packet;
  if(!record||record.locale!==locale||record.proposed_url!==p.url)
   throw Error("Article/URL/locale mismatch: "+p.id);
  const errs=validateProposal(p,record);
  if(errs.length)throw Error(p.id+": "+errs.join("; "));
  if(p.title_len!==record.title.length||p.meta_description_len!==record.meta_description.length||
   p.proposed_title_len!==(p.proposed_title?.length??null)||
   p.proposed_description_len!==(p.proposed_description?.length??null))
   throw Error("Proposal length drift: "+p.id);
  expected.push({id:p.id,url:p.url,title:p.proposed_title,description:p.proposed_description});
 }
}
if(listProposalFiles().length!==7||expected.length!==49)throw Error("Unexpected active proposal files / batch size");
const byUrl=new Map(expected.map(p=>[p.url,p]));
const previousUrl=new Map(old.urls.map(p=>[p.url,p]));
for(const p of expected)if(!previousUrl.has(p.url))throw Error("Not frozen: "+p.url);
const run=(cmd,args)=>{
 console.log("RUN",cmd,...args);
 execFileSync(cmd,args,{cwd:ROOT,stdio:"inherit",env:{...process.env,CI:"true"}});
};
// Preflight finished. Apply the exact reviewed packet text.
run("node",["scripts/build.mjs","--check"]);
run("node",["scripts/seo/seo-guard.mjs"]);
run("node",["scripts/seo/content-graph.mjs","--check"]);
run("node",["scripts/seo/apply-meta-proposals.mjs","--apply"]);
for(const p of expected){
 const after=fsRead("content/articles/"+p.id+".json");
 const before=originalPackets.get(p.id).packet;
 if(after.h1!==before.h1||after.proposed_url!==before.proposed_url||
    after.body_markdown!==before.body_markdown||after.locale!==before.locale)
    throw Error("Non-metadata article field changed: "+p.id);
 if(after.title!==(p.title??before.title)||after.meta_description!==p.description)
    throw Error("Proposed metadata does not match exactly: "+p.id);
}
// Archive the now-applied proposal files (so future dry-run QA does not flag stale data).
const archive=path.join(ROOT,prefix,"applied-20261021-49");
fs.mkdirSync(archive,{recursive:true});
for(const locale of REQUIRED)
 fs.renameSync(path.join(ROOT,prefix,`meta-${locale}.json`),path.join(archive,`meta-${locale}.json`));
run("node",["scripts/build.mjs"]);
run("node",["scripts/seo/content-graph.mjs","--write"]);
// Verify all non-approved frozen URL fingerprints and every protected field before re-freezing.
const matrix=fsRead("data/seo/master-matrix.json");
const locales=fsRead("content/locales.json");
const built=buildRegistry({matrix,locales,files:collectHtml(),previous:old});
if(built.urls.length!==old.urls.length)throw Error("Published frozen URL count changed");
for(const page of built.urls){
 const original=baselineUrl.get(page.url);
 if(!original)throw Error("New URL appeared: "+page.url);
 const approval=byUrl.get(page.url);
 if(!approval){
  if(JSON.stringify(page)!==JSON.stringify(original)){
   const fpChanges=Object.keys(page.fingerprint).filter(k=>JSON.stringify(page.fingerprint[k])!==JSON.stringify(original.fingerprint[k]));
   const cBefore=original.content,cAfter=page.content;
   throw Error("Unapproved frozen page changed: "+page.url+" fingerprintKeys="+JSON.stringify(fpChanges)+" contentBefore="+JSON.stringify(cBefore)+" contentAfter="+JSON.stringify(cAfter));
  }
  continue;
 }
 if(page.id!==original.id||page.locale!==original.locale||page.role!==original.role||
    JSON.stringify(page.content)!==JSON.stringify(original.content))
   throw Error("Frozen structural/content fields changed: "+page.url);
 for(const [k,v] of Object.entries(page.fingerprint)){
  if(k==="title"||k==="description")continue;
  if(JSON.stringify(v)!==JSON.stringify(original.fingerprint[k]))
   throw Error("Frozen field "+k+" changed: "+page.url);
 }
 if(page.fingerprint.description!==approval.description)
  throw Error("Rendered description not approved: "+page.url);
 if(approval.title && !page.fingerprint.title.includes(approval.title))
  throw Error("Rendered title not approved: "+page.url);
}
if(built.frozen_count!==old.frozen_count||JSON.stringify(built.retired)!==JSON.stringify(old.retired)||
 JSON.stringify(built.noindex_utilities)!==JSON.stringify(old.noindex_utilities))
 throw Error("Unapproved freeze registry structural change");
run("node",["scripts/seo/seo-guard.mjs","--write"]);
if(JSON.stringify(fsRead(REGISTRY))!==JSON.stringify(built))
 throw Error("Re-frozen registry differs from independently checked registry");
// Fail if the builder touches an unrelated or protected file. This also checks untracked files.
const changed=execFileSync("git",["status","--porcelain","-uall"],{encoding:"utf8"}).trim().split("\n").filter(Boolean).map(x=>x.slice(3).split(" -> ").at(-1));
const allowed=p=>
  /^content\/articles\/(VI|EN|DE|FR|ES|NL|PT)-S0[1-7]\.json$/.test(p)||
  /^(vi|en|de|fr|es|nl|pt)\/guides\/[a-z0-9-]+\/index\.html$/.test(p)||
  /^assets\/search-index\//.test(p)||
  /^docs\/seo-v10\/proposals\/(meta-(vi|en|de|fr|es|nl|pt)\.json|applied-20261021-49\/meta-(vi|en|de|fr|es|nl|pt)\.json)$/.test(p)||
  ["data/seo/url-freeze.json","data/seo/content-graph.json","docs/GLOBAL-SITE-MATRIX.md"].includes(p);
const unexpected=changed.filter(p=>!allowed(p));
if(unexpected.length)throw Error("Unexpected changed files: "+unexpected.join(", "));
console.log("Approved source packets:",expected.length,"changed paths:",changed.length);
// Final checks, including no data or URL inventions, and deterministic build output.
run("node",["scripts/build.mjs","--check"]);
run("node",["scripts/seo/content-graph.mjs","--check"]);
run("node",["scripts/seo/validate-plan.mjs"]);
run("node",["scripts/seo/seo-guard.mjs"]);
run("node",["scripts/seo/fact-guard.mjs"]);
run("node",["scripts/nav-qa.mjs"]);
run("node",["--test","tests/meta-proposals.test.mjs","tests/meta-review-status.test.mjs","tests/seo-v10.test.mjs","tests/seo-site-qa.test.mjs","tests/seo-guard.test.mjs"]);
run("git",["diff","--check"]);
console.log("OWNER_APPROVED_49_METADATA_APPLIED_LOCALLY_AND_CHECKED");
