import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadReference,validateReference,localizeReference,extractAmounts,extractPhones,scanText,scanHtml,allowedAmounts} from "../scripts/seo/fact-guard-core.mjs";
import {runFactGuard} from "../scripts/seo/fact-guard.mjs";
import {checkArticle} from "../scripts/articles.mjs";
const ref=loadReference();
const codes=list=>list.filter(f=>f.level==="FAIL").map(f=>f.code);
const LOCALES=JSON.parse(fs.readFileSync("content/locales.json","utf8")).map(l=>l.code);

test("reference is internally consistent, evidenced and its 10-language rendering is in sync",()=>{
 const v=validateReference(ref);
 assert.deepEqual(v.errors,[]);
 assert.ok(v.warnings.some(w=>/C1-hours/.test(w)),"known hours conflict stays visible");
 assert.equal(ref.publication.site_display_approved,false);
 assert.equal(ref.publication.business_schema_approved,false);
 const loc=localizeReference(ref,LOCALES);
 assert.equal(fs.readFileSync("data/business/reference.localized.json","utf8"),JSON.stringify(loc,null,2)+"\n");
 const allowed=allowedAmounts(ref);
 for(const code of LOCALES){
  const L=loc.locales[code];
  const text=[L.title,L.address,L.phone,L.hours,L.daily,L.weekly,L.monthly,L.deposit,L.delivery,L.late_return,...L.models.map(m=>[m.daily,m.weekly,m.monthly,m.deposit].filter(Boolean).join(", "))].join("\n\n");
  assert.deepEqual(scanText(text,{locale:code,ref}),[],code);
  const values=extractAmounts(text,code).flatMap(a=>a.values);
  assert.ok(values.length>=15&&values.every(v=>allowed.has(v)),code);
 }
});

test("amounts parse across scripts, separators, multipliers and ranges",()=>{
 const v=(s,l)=>extractAmounts(s,l).flatMap(a=>a.values);
 assert.deepEqual(v("Giá 150.000đ/ngày, cọc 2–5 triệu, 150k","vi"),[150000,2000000,5000000,150000]);
 assert.deepEqual(v("대략 1,100,000동에서 1,400,000동","ko"),[1100000,1400000]);
 assert.deepEqual(v("罰金は40万~60万ベトナムドン","ja"),[400000,600000]);
 assert.deepEqual(v("Kaution 2–5 Millionen VND, Jahr 2026, 50cc","de"),[2000000,5000000]);
 assert.deepEqual(v("150 000 VND et 2 000 000 VND","fr"),[150000,2000000]);
 assert.deepEqual(v("Top 10 150,000 VND","en"),[150000]);
 assert.equal(extractAmounts("about $6 or 40元","en").every(a=>a.currency==="FOREIGN"),true);
 assert.deepEqual(extractPhones("Gọi 0942 467 674 hoặc +84 24 3826 1234; 113").map(p=>p.digits),["0942467674","02438261234"]);
});

test("wrong Nguyễn Tú prices, phone, address, hours or contradictions always fail",()=>{
 const f=(s,l="vi")=>codes(scanText(s,{locale:l,mode:"warn",ref}));
 assert.deepEqual(f("Nguyễn Tú cho thuê Honda Wave 150.000đ/ngày, Vision 200.000đ/ngày."),[]);
 assert.ok(f("Nguyễn Tú cho thuê Honda Wave 120.000đ/ngày.").includes("BRAND_PRICE_MISMATCH"));
 assert.ok(f("Nguyen Tu Motorbike Rental charges about $6 a day.","en").includes("BRAND_FOREIGN_CURRENCY"));
 assert.ok(f("Liên hệ Nguyễn Tú: 0942 467 675.").includes("PHONE_MISMATCH"));
 assert.ok(f("Thuê Xe Máy Hà Nội Nguyễn Tú ở 115 Nguyễn Văn Cừ.").includes("ADDRESS_MISMATCH"));
 assert.deepEqual(f("Giờ cao điểm trên đường lớn như Nguyễn Văn Cừ rất đông xe."),[]);
 assert.ok(f("Nguyễn Tú giờ mở cửa 08:00–21:30 hằng ngày.").includes("HOURS_MISMATCH"));
 assert.deepEqual(f("Nguyễn Tú giờ mở cửa 09:00–21:00 hằng ngày."),[]);
 assert.ok(f("Nguyen Tu Motorbike Rental: no deposit needed.","en").includes("BRAND_CONTRADICTION"));
});

test("unsourced amounts fail strictly, warn for drafts; cited third-party prices only warn",()=>{
 const s="Most shops charge 130,000 VND per day.";
 assert.ok(codes(scanText(s,{mode:"strict",ref})).includes("UNSOURCED_AMOUNT"));
 assert.deepEqual(codes(scanText(s,{mode:"warn",ref})),[]);
 const cited="Rental shops list 130,000 VND per day ([price list](https://example.org/prices)).";
 const r=scanText(cited,{mode:"strict",ref});
 assert.deepEqual(codes(r),[]);
 assert.ok(r.some(x=>x.code==="THIRD_PARTY_PRICE_REVIEW"));
 assert.deepEqual(scanText("Fines under Decree 168/2024 are 400,000–600,000 VND.",{mode:"strict",ref}).filter(x=>x.level==="FAIL"),[]);
 assert.deepEqual(scanText("See [report](https://x.vn/a-0261722607.htm)",{mode:"strict",ref}),[],"digits inside URLs are not phones");
});

test("pages may not show NAP or business schema until the owner flags allow it",()=>{
 const page='<html><body><main><p>Call 0942 467 674</p></main><script type="application/ld+json">{"@type":"AutoRental","telephone":"+84942467674","address":{"streetAddress":"112 Nguyễn Văn Cừ"}}</script></body></html>';
 const blocked=codes(scanHtml(page,{locale:"en",ref}));
 assert.ok(blocked.includes("NAP_DISPLAY_NOT_APPROVED")&&blocked.includes("BUSINESS_SCHEMA_NOT_APPROVED"));
 const approved={...ref,publication:{site_display_approved:true,business_schema_approved:true}};
 assert.deepEqual(codes(scanHtml(page,{locale:"en",ref:approved})),[]);
 assert.ok(codes(scanHtml(page.replace('"+84942467674"','"+84900000000"'),{locale:"en",ref:approved})).includes("SCHEMA_PHONE_MISMATCH"));
});

test("reference self-checks catch contradictory data",()=>{
 const bad=structuredClone(ref);
 bad.price_summary.weekly.max=5000000;
 bad.owner_stated["Honda Wave daily"]=120000;
 bad.phone.e164="+84942467600";
 const e=validateReference(bad).errors.join(" | ");
 assert.match(e,/Weekly range/);assert.match(e,/Owner statement/);assert.match(e,/Phone/);
});

test("article QA: Writer mode warns on unsourced amounts, publisher mode fails; brand errors always fail",()=>{
 const locales=[{code:"en",htmlLang:"en",name:"English"}];
 const matrix={rows:[{id:"EN-HOME",url:"/en/",status:"PUBLISHED",role:"PILLAR",locale:"en",working_title:"Home"},{id:"EN-H01",url:"/en/topics/vehicle-choice/",status:"IDEA",role:"HUB",locale:"en",parent_id:"EN-HOME",working_title:"Choose a bike"}]};
 const body=["## Overview","Read [the existing overview](/en/).","## Practical points",...Array(70).fill("Compare handling, comfort, luggage and safe use of the motorcycle before making a decision."),"## Costs","Most shops charge 130,000 VND per day.","## Questions to ask","Confirm terms before accepting any vehicle."].join("\n\n");
 const packet={matrix_id:"EN-H01",locale:"en",proposed_url:"/en/topics/vehicle-choice/",title:"Choosing a Suitable Rental Motorbike in Hanoi",meta_description:"Learn how to assess different rental motorbike styles according to riding experience, route, luggage and rental conditions in Hanoi.",h1:"Choosing a rental motorbike in Hanoi",body_markdown:body,sources:[{url:"https://www.who.int/a",title:"WHO",checked_on:"2026-10-14"},{url:"https://www.gov.uk/b",title:"FCDO",checked_on:"2026-10-14"}],serp_intent_checked:true,facts_reviewed_by_human:true,editorial_notes:"test"};
 const draft=checkArticle(packet,matrix,locales);
 assert.equal(draft.passed,true);
 assert.ok(draft.warnings.some(w=>/UNSOURCED_AMOUNT/.test(w)));
 assert.ok(checkArticle(packet,matrix,locales,{factMode:"strict"}).errors.some(e=>/UNSOURCED_AMOUNT/.test(e)));
 const lie={...packet,body_markdown:body+"\n\nNguyen Tu Motorbike Rental rents a Honda Vision for 180,000 VND a day."};
 assert.ok(checkArticle(lie,matrix,locales).errors.some(e=>/BRAND_PRICE_MISMATCH/.test(e)));
});

test("the whole repository passes the fact guard",()=>{
 const r=runFactGuard();
 assert.equal(r.fail,0,JSON.stringify(r.findings.filter(f=>f.level==="FAIL").slice(0,5)));
});
