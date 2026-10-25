import test from "node:test";
import assert from "node:assert/strict";
import {summarizeMetaReview,LOCALES} from "../scripts/seo/meta-review-status.mjs";

const basePacket={matrix_id:"EN-S01",locale:"en",proposed_url:"/en/guides/example/",
  title:"T".repeat(80),meta_description:"D".repeat(180),body_markdown:"One real article, no numeric claims."};
const packetMap=()=>new Map([["EN-S01",{packet:basePacket}]]);
const proposal=()=>({id:"EN-S01",url:basePacket.proposed_url,
  title:basePacket.title,title_len:80,proposed_title:"A clear topic title",
  proposed_title_len:19,meta_description:basePacket.meta_description,
  meta_description_len:180,proposed_description:"A".repeat(130),
  proposed_description_len:130,note:"Owner editorial review required"});

test("ten locales remain present even with zero data",()=>{
  const s=summarizeMetaReview(new Map());
  assert.deepEqual(Object.keys(s.locales),LOCALES);
  assert.equal(s.totals.articles,0);
  assert.equal(s.status,"EDITORIAL_PROPOSALS_NOT_APPLIED");
});
test("pending work subtracts only valid, un-applied proposals",()=>{
  const initial=summarizeMetaReview(packetMap());
  assert.equal(initial.totals.title_over_70,1);
  assert.equal(initial.totals.description_over_165,1);
  assert.equal(initial.totals.unreviewed_titles,1);
  const proposed=summarizeMetaReview(packetMap(),new Map([["en",[proposal()]]]));
  assert.deepEqual(proposed.errors,[]);
  assert.equal(proposed.totals.reviewed_items,1);
  assert.equal(proposed.totals.proposed_titles,1);
  assert.equal(proposed.totals.proposed_descriptions,1);
  assert.equal(proposed.totals.unreviewed_titles,0);
  assert.equal(proposed.totals.unreviewed_descriptions,0);
});
test("refuse stale source, malformed length, duplicate and wrong locale",()=>{
  const a=proposal(),b={...proposal(),title:"changed"};
  const duplicate=summarizeMetaReview(packetMap(),new Map([["en",[a,a]]]));
  assert.ok(duplicate.errors.some(e=>e.includes("duplicate")));
  const stale=summarizeMetaReview(packetMap(),new Map([["en",[b]]]));
  assert.ok(stale.errors.some(e=>e.includes("drifted")));
  const wrong=summarizeMetaReview(packetMap(),new Map([["vi",[a]]]));
  assert.ok(wrong.errors.some(e=>e.includes("locale")));
  const badLen=summarizeMetaReview(packetMap(),new Map([["en",[{...a,proposed_title_len:99}]]]));
  assert.ok(badLen.errors.some(e=>e.includes("proposed_title_len")));
});
