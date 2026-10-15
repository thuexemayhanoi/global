/**
 * Owner constraint (2026-10-15): no AI Reviewer, no self-hosted/open-source model and no AI API.
 * W1/W2/W3 are external AI sessions; everything in this repository is Node.js + GitHub Actions QA.
 * This guard fails CI if code or workflows start calling a model provider or need an AI key.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const code=[...walk("scripts").filter(f=>f.endsWith(".mjs")),...walk(".github/workflows").filter(f=>/\.ya?ml$/.test(f)),...(fs.existsSync("package.json")?["package.json"]:[])];
const PROVIDERS=[/\bopenai\b/i,/api\.openai\.com/i,/@anthropic-ai\//i,/api\.anthropic\.com/i,/generativelanguage\.googleapis\.com/i,/@google\/(?:generative-ai|genai)\b/i,
 /\bollama\b/i,/\bvllm\b/i,/huggingface|\bhf\.co\//i,/api\.mistral\.ai|@mistralai\//i,/api\.groq\.com/i,/api\.cohere\.(?:ai|com)/i,/api\.replicate\.com/i,/api\.together\.(?:xyz|ai)/i,
 /\b(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE_AI|MISTRAL|HF|HUGGINGFACE|GROQ|COHERE)_(?:API_)?(?:KEY|TOKEN)\b/];

test("no model provider SDK, endpoint or AI key anywhere in scripts or workflows",()=>{
 assert.ok(code.length>40,"scan really covers the repository code");
 const hits=[];
 for(const f of code){const text=fs.readFileSync(f,"utf8");for(const re of PROVIDERS)if(re.test(text))hits.push(f+" ~ "+re);}
 assert.deepEqual(hits,[]);
});

test("workflows use only the built-in GITHUB_TOKEN, never another secret",()=>{
 for(const f of walk(".github/workflows")){
  const secrets=[...fs.readFileSync(f,"utf8").matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(secrets)].filter(s=>s!=="GITHUB_TOKEN"),[],f);
 }
});

test("no independent AI reviewer gate: publication eligibility never requires a review file",()=>{
 const standing=JSON.parse(fs.readFileSync("approvals/standing-policy-20261015.json","utf8"));
 assert.equal(standing.publication.independent_ai_reviewer_required,false);
 assert.ok(!fs.existsSync(".github/workflows/editorial-review-qa.yml"),"the retired reviewer workflow stays retired");
 const core=fs.readFileSync("scripts/auto-publisher-core.mjs","utf8");
 assert.doesNotMatch(core,/add\("G6/,"no G6 gate is evaluated");
});
