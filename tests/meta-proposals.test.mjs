// Title / meta description proposals (docs/seo-v10/proposals/meta-<locale>.json) stay machine-checkable:
// every proposal respects the length limits, matches the live packet it targets and invents no number.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {listProposalFiles,loadPackets,validateProposal,TITLE_MAX,DESC_MIN,DESC_MAX} from "../scripts/seo/apply-meta-proposals.mjs";

const files=listProposalFiles();
const packets=loadPackets();

test("proposal files, when present, validate item by item against the published packets",{skip:files.length?false:"no proposal files"},()=>{
 const seen=new Set();
 for(const file of files){
  const items=JSON.parse(fs.readFileSync(file,"utf8"));
  assert.ok(Array.isArray(items)&&items.length,file+" is a non-empty array");
  const locale=file.match(/meta-([a-z]{2})\.json$/)[1];
  for(const item of items){
   assert.ok(!seen.has(item.id),item.id+" proposed twice");seen.add(item.id);
   const entry=packets.get(item.id);
   assert.ok(entry,item.id+" has no published packet");
   assert.equal(entry.packet.locale,locale,item.id+" sits in the wrong locale file");
   assert.deepEqual(validateProposal(item,entry.packet),[],item.id);
  }
 }
});

test("validateProposal enforces the limits and the null rule",()=>{
 const packet={title:"A".repeat(70),meta_description:"B".repeat(170),body_markdown:"text 2025"};
 const base={id:"X",url:"/x/",title:packet.title,title_len:70,meta_description:packet.meta_description,meta_description_len:170,note:""};
 const ok={...base,proposed_title:"Short title",proposed_title_len:11,proposed_description:"C".repeat(130),proposed_description_len:130};
 assert.deepEqual(validateProposal(ok,packet),[]);
 assert.ok(validateProposal({...ok,proposed_title:"T".repeat(TITLE_MAX+1)},packet).some(e=>/> 60/.test(e)));
 assert.ok(validateProposal({...ok,proposed_description:"C".repeat(DESC_MIN-1)},packet).some(e=>/outside/.test(e)));
 assert.ok(validateProposal({...ok,proposed_description:"C".repeat(DESC_MAX+1)},packet).some(e=>/outside/.test(e)));
 assert.ok(validateProposal({...ok,proposed_title:"Title with 2026 invented"},packet).some(e=>/number 2026/.test(e)));
 assert.deepEqual(validateProposal({...ok,proposed_title:"Title with 2025 from the body"},packet),[]);
 const short={...base,title:"Fine",title_len:4,proposed_title:"Other",proposed_title_len:5};
 assert.ok(validateProposal(short,{...packet,title:"Fine"}).some(e=>/must have null/.test(e)));
});
