import test from "node:test";
import assert from "node:assert/strict";
import {inspectHTML} from "../scripts/seo/post-publish-qa.mjs";
test("live HTML check refuses wrong lang, canonical or missing shared UI",()=>{
 const bad='<html lang="de"><head><link rel="canonical" href="https://wrong.site/en/"></head><body><h1>Title</h1><main><p>Text</p></main></body></html>';
 const issues=inspectHTML(bad,"/en/","en");
 assert.ok(issues.some(e=>e.includes("Canonical")));
 assert.ok(issues.some(e=>e.includes("Wrong language")));
 assert.ok(issues.some(e=>e.includes("Shared navigation")));
});
test("valid HTML source can be verified offline before live fetch",()=>{
 const html='<html lang="en"><head><link rel="canonical" href="https://global.rentbikehanoi.com/en/"><link rel="stylesheet" href="/assets/premium.css"></head><body><header data-nav-version="2"></header><h1>Heading</h1><main><p>Substantial descriptive text.</p></main><footer data-footer-version="2"></footer></body></html>';
 assert.deepEqual(inspectHTML(html,"/en/","en"),[]);
});
