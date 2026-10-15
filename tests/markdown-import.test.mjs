import test from "node:test";
import assert from "node:assert/strict";
import {parseMarkdownPacket} from "../scripts/seo/import-markdown.mjs";
const good='---\n'+JSON.stringify({matrix_id:"EN-H01",locale:"en",proposed_url:"/en/topics/choosing-a-rental-bike/",title:"Useful H1",sources:[],serp_intent_checked:false,facts_reviewed_by_human:false})+'\n---\n'+"## Heading\n"+'meaningful original draft '.repeat(20);
test("imports Markdown with strict JSON frontmatter into editor-review packet",()=>{
 const r=parseMarkdownPacket(good);
 assert.equal(r.matrix_id,"EN-H01");assert.ok(r.body_markdown.includes("## Heading"));
 assert.equal(r.facts_reviewed_by_human,false);
});
test("does not allow writer to duplicate or spoof body within frontmatter",()=>{
 assert.throws(()=>parseMarkdownPacket('---\n'+JSON.stringify({body_markdown:"fake"})+'\n---\n'+("content ".repeat(100))),/body_markdown/);
 assert.throws(()=>parseMarkdownPacket("---\nfoo: bar\n---\n"+("content ".repeat(100))),/strict JSON/);
});
