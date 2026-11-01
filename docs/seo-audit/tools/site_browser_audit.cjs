// Full-site browser audit on a local static server (re-audit 2026-11-01): every page of the committed build, which live
// markup QA proves is byte-identical in production. Per page: axe-core WCAG 2.x A/AA violations, horizontal overflow,
// console errors, failed same-origin requests, the LCP element, whether a lazy image is the LCP or sits in the first
// viewport. Mobile 390×844 for every page; desktop 1366×900 for the pages listed in DESKTOP (one file, one URL per line).
// Usage: AXE_PATH=…/axe.min.js OUT=out.json [DESKTOP=urls.txt] node docs/seo-audit/tools/site_browser_audit.cjs PORT urls.txt
// (serve the repository root first, e.g. python3 -m http.server PORT; axe-core and Playwright are not repo dependencies)
const {chromium} = require("playwright");
const fs = require("fs");
const AXE = fs.readFileSync(process.env.AXE_PATH, "utf8");
const [port, listFile] = process.argv.slice(2);
const base = "http://127.0.0.1:" + port;
const urls = fs.readFileSync(listFile, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
const desktop = new Set(process.env.DESKTOP ? fs.readFileSync(process.env.DESKTOP, "utf8").split("\n").map(s => s.trim()).filter(Boolean) : []);
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(ctx, u) {
  const page = await ctx.newPage();
  const consoleErrors = [], failed = [];
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));
  page.on("response", r => { if (r.url().startsWith(base) && r.status() >= 400) failed.push(r.status() + " " + r.url().replace(base, "")); });
  await page.addInitScript(() => {
    window.__lcp = null;
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e; }).observe({type: "largest-contentful-paint", buffered: true});
  });
  await page.goto(base + u, {waitUntil: "load", timeout: 60000});
  await page.waitForTimeout(250);
  const info = await page.evaluate(() => {
    const e = window.__lcp, el = e && e.element;
    const imgs = [...document.images].map(i => { const r = i.getBoundingClientRect(); return {src: (i.currentSrc || i.src).split("/").pop(), lazy: i.loading === "lazy", top: Math.round(r.top + scrollY), inView: r.top < innerHeight && r.bottom > 0}; });
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      lcp: e ? {t: Math.round(e.startTime), tag: el ? el.tagName : null, cls: el ? String(el.className).split(" ")[0] : null, src: el && el.currentSrc ? el.currentSrc.split("/").pop() : null, lazy: el ? el.loading === "lazy" : null} : null,
      lazyInFirstViewport: imgs.filter(i => i.lazy && i.inView).map(i => i.src),
      images: imgs.length,
    };
  });
  await page.addScriptTag({content: AXE});
  const axe = await page.evaluate(async tags => {
    const res = await axe.run(document, {runOnly: {type: "tag", values: tags}, resultTypes: ["violations", "incomplete"]});
    const map = v => ({id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 2).map(n => n.target.join(" "))});
    return {violations: res.violations.map(map), incomplete: res.incomplete.map(map)};
  }, TAGS);
  await page.close();
  return {...info, axe, consoleErrors, failed};
}

(async () => {
  const browser = await chromium.launch();
  const mobile = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
  const desk = await browser.newContext({viewport: {width: 1366, height: 900}, deviceScaleFactor: 1});
  const out = [];
  let i = 0;
  for (const u of urls) {
    const rec = {url: u};
    try { rec.mobile = await audit(mobile, u); } catch (e) { rec.mobile = {error: String(e).slice(0, 200)}; }
    if (desktop.has(u)) { try { rec.desktop = await audit(desk, u); } catch (e) { rec.desktop = {error: String(e).slice(0, 200)}; } }
    out.push(rec);
    if (++i % 50 === 0) { process.stdout.write(i + " "); fs.writeFileSync(process.env.OUT, JSON.stringify(out)); }
  }
  await browser.close();
  fs.writeFileSync(process.env.OUT, JSON.stringify(out));
  console.log("\nDONE", out.length);
})().catch(e => { console.error(e); process.exit(1); });
