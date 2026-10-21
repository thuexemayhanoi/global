import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {validateReviews,createPlan,expectedMetadataHtml,selectiveFreeze,applyBatch} from "../scripts/seo/metadata-v11.mjs";
import {fingerprint,pageFile} from "../scripts/seo/seo-guard-core.mjs";

const packet={matrix_id:"EN-S11",locale:"en",proposed_url:"/en/guides/insurance/",title:"Motorbike insurance in Vietnam: questions to ask",meta_description:"Check the questions to ask about motorbike insurance in Vietnam, including exclusions, riding eligibility and how to contact your insurer.",h1:"Motorbike insurance in Vietnam",body_markdown:"Existing factual article body without added claims."};
const packets=()=>new Map([[packet.matrix_id,structuredClone(packet)]]);
const review=()=>({id:packet.matrix_id,url:packet.proposed_url,locale:"en",before_title:packet.title,before_description:packet.meta_description,after_title:"Motorbike insurance in Vietnam: policy checks",after_description:"Questions to ask your insurer about riding a motorbike in Vietnam: policy exclusions, eligibility and claims assistance before you travel.",decision:"OPTIMIZE",reason:"Preserves the source article's insurance checklist intent and avoids promising coverage.",candidate_source:"V11",body_reviewed:true});
function html(r){const url="https://global.rentbikehanoi.com"+r.url;return '<html lang="en"><head><title>'+r.before_title+'</title><meta name="description" content="'+r.before_description+'"><meta property="og:title" content="'+r.before_title+'"><meta property="og:description" content="'+r.before_description+'"><link rel="canonical" href="'+url+'"><script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@graph":[{"@type":"Article",headline:r.before_title,description:r.before_description,mainEntityOfPage:url},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",name:r.before_title,item:url}]}]})+'</script></head><body><main><h1>Existing H1</h1><p class="article-lead">'+r.before_description+'</p><div class="article-copy">Unchanged body.</div></main></body></html>';}

test("reviews require complete coverage and reject duplicate/stale/unauthorized input before planning",()=>{
 assert.deepEqual(validateReviews(packets(),[review()]),[]);
 assert.throws(()=>createPlan(packets(),[]),/unreviewed packet/);
 assert.throws(()=>createPlan(packets(),[review(),review()]),/duplicate review ID/);
 assert.throws(()=>createPlan(packets(),[{...review(),before_title:"stale"}]),/stale/);
 assert.throws(()=>createPlan(packets(),[{...review(),h1:"unauthorized"}]),/unauthorized review field h1/);
 assert.throws(()=>createPlan(packets(),[{...review(),after_title:"Insurance rules changed in 2099"}]),/new numeric claim 2099/);
});
test("earlier approved metadata cannot be changed or relabelled",()=>{
 const p={...packet,matrix_id:"EN-S01"},r={...review(),id:p.matrix_id};
 assert.ok(validateReviews(new Map([[p.matrix_id,p]]),[r]).some(e=>e.includes("protected")));
 r.after_title=r.before_title;r.after_description=r.before_description;r.decision="KEEP_APPROVED";
 assert.deepEqual(validateReviews(new Map([[p.matrix_id,p]]),[r]),[]);
});
test("metadata pair resume accepts fully applied rows but rejects mixed or content drift",()=>{
 const r=review(),plan=createPlan(packets(),[r]);
 assert.deepEqual(validateReviews(new Map([[r.id,{...packet,title:r.after_title,meta_description:r.after_description}]]),[r]),[]);
 assert.ok(validateReviews(new Map([[r.id,{...packet,title:r.after_title}]]),[r]).some(e=>e.includes("partially")));
 assert.equal(plan.batches[0].ids[0],r.id);assert.match(plan.records[0].protected_packet_sha256,/^[a-f0-9]{64}$/);
});
test("final metadata uniqueness is checked across records, independently from character lengths",()=>{
 const r=review(),other={...packet,matrix_id:"EN-S12",proposed_url:"/en/guides/other/",title:"A separate and distinct source article"};
 const s={...r,id:other.matrix_id,url:other.proposed_url,before_title:other.title};
 assert.throws(()=>createPlan(new Map([[packet.matrix_id,packet],[other.matrix_id,other]]),[r,s]),/duplicate final title/);
 const long={...r,after_title:"Motorbike insurance in Vietnam: the practical questions to ask before buying a policy"};
 assert.deepEqual(validateReviews(packets(),[long]),[]);
});
test("HTML expectation updates exact SEO echoes and preserves visible article lead, H1 and copy",()=>{
 const r=review(),old=html(r),now=expectedMetadataHtml(old,r);
 assert.equal(fingerprint(now).title,r.after_title);assert.equal(fingerprint(now).description,r.after_description);
 assert.ok(now.includes('<p class="article-lead">'+r.before_description+'</p>'));
 assert.equal(now.match(/<main>[\s\S]*<\/main>/)[0],old.match(/<main>[\s\S]*<\/main>/)[0]);
 assert.throws(()=>expectedMetadataHtml(old.replace('"headline":"'+r.before_title+'"','"headline":"drift"'),r),/Article metadata drift/);
});
test("selective refreeze changes only target title/meta and keeps original content baseline",()=>{
 const r=review(),old=html(r),now=expectedMetadataHtml(old,r),other=html({...r,url:"/en/guides/other/"});
 const baseline={version:1,urls:[{url:r.url,fingerprint:fingerprint(old),content:{main_words:80,h2:["Keep"]}},{url:"/en/guides/other/",fingerprint:fingerprint(other),content:{main_words:50,h2:[]}}]};
 const files={[pageFile(r.url)]:now,[pageFile("/en/guides/other/")]:other};
 const updated=selectiveFreeze(baseline,files,[r]);assert.equal(updated.urls[0].fingerprint.title,r.after_title);
 assert.deepEqual(updated.urls[0].content,baseline.urls[0].content);assert.deepEqual(updated.urls[1],baseline.urls[1]);
 assert.throws(()=>selectiveFreeze(baseline,{...files,[pageFile(r.url)]:now.replace("Existing H1","Changed H1")},[r]),/unauthorized fingerprint change h1/);
 assert.throws(()=>selectiveFreeze(baseline,{...files,[pageFile("/en/guides/other/")]:other.replace("Existing H1","Changed H1")},[r]),/unauthorized fingerprint change h1/);
});
test("apply refuses stale and unauthorized records without mutating any packet",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"metadata-v11-"));
 try{
  execFileSync("git",["init","-b","metadata-test"],{cwd:root,stdio:"ignore"});fs.mkdirSync(path.join(root,"content/articles"),{recursive:true});
  const file=path.join(root,"content/articles/EN-S11.json"),raw=JSON.stringify(packet,null,2)+"\n";fs.writeFileSync(file,raw);
  const plan=createPlan(packets(),[review()]);plan.records[0].before_title="stale";
  assert.throws(()=>applyBatch(root,plan,1),/stale/);assert.equal(fs.readFileSync(file,"utf8"),raw);
  const valid=createPlan(packets(),[review()]);valid.records[0].body_markdown="unauthorized";
  assert.throws(()=>applyBatch(root,valid,1),/unauthorized review field/);assert.equal(fs.readFileSync(file,"utf8"),raw);
  const drift=createPlan(packets(),[review()]);fs.writeFileSync(file,JSON.stringify({...packet,body_markdown:"Content edited after plan"}));
  const before=fs.readFileSync(file,"utf8");assert.throws(()=>applyBatch(root,drift,1),/non-metadata packet content drifted/);assert.equal(fs.readFileSync(file,"utf8"),before);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
