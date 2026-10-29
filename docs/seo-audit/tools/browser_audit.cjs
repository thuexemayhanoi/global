// TECH-02 browser audit on a local static server: axe-core (WCAG 2.x A/AA) and lab LCP/CLS under mobile throttling.
// Usage: AXE_PATH=/path/to/axe.min.js OUT=result.json node docs/seo-audit/tools/browser_audit.cjs PORT url1 url2 ...
// (serve the repo first, e.g. python3 -m http.server PORT; axe-core and Playwright are not repo dependencies).
const {chromium} = require("playwright");
const fs = require("fs");
const path = require("path");
const AXE = fs.readFileSync(process.env.AXE_PATH, "utf8");
const [port, ...urls] = process.argv.slice(2);
const base = "http://127.0.0.1:" + port;

(async () => {
  const browser = await chromium.launch();
  const out = [];
  for (const u of urls) {
    const rec = {url: u};
    // ---- axe at mobile and desktop widths ----
    for (const [label, vp] of [["mobile", {width: 390, height: 844}], ["desktop", {width: 1366, height: 900}]]) {
      const ctx = await browser.newContext({viewport: vp, deviceScaleFactor: 1});
      const page = await ctx.newPage();
      await page.goto(base + u, {waitUntil: "load"});
      await page.addScriptTag({content: AXE});
      const r = await page.evaluate(async () => {
        const res = await axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]}, resultTypes: ["violations"]});
        return res.violations.map(v => ({id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(1, 2).join(""))}));
      });
      // horizontal overflow at this width
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      rec["axe_" + label] = r;
      rec["overflow_" + label] = overflow;
      await ctx.close();
    }
    // ---- lab LCP / CLS: mobile, 4x CPU, slow-4G-like network ----
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8});
    await cdp.send("Emulation.setCPUThrottlingRate", {rate: 4});
    await page.addInitScript(() => {
      window.__lcp = null; window.__cls = 0; window.__shifts = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = {t: e.startTime, el: e.element ? (e.element.tagName + (e.element.className ? "." + String(e.element.className).split(" ")[0] : "") + (e.element.currentSrc ? " " + e.element.currentSrc.split("/").pop() : "")) : "", size: e.size}; }).observe({type: "largest-contentful-paint", buffered: true});
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({v: e.value, src: (e.sources || []).map(s => s.node ? (s.node.tagName || "#text") + "." + (s.node.className || "") : "").slice(0, 3)}); } }).observe({type: "layout-shift", buffered: true});
    });
    const t0 = Date.now();
    await page.goto(base + u, {waitUntil: "load", timeout: 120000});
    const loadMs = Date.now() - t0;
    await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
    // scroll to the bottom to surface late shifts (lazy images, fonts)
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
    await page.evaluate(() => new Promise(r => setTimeout(r, 800)));
    const perf = await page.evaluate(() => ({lcp: window.__lcp, cls: window.__cls, shifts: window.__shifts.slice(0, 5),
      bytes: performance.getEntriesByType("resource").reduce((a, e) => a + (e.transferSize || 0), 0) + (performance.getEntriesByType("navigation")[0]?.transferSize || 0),
      requests: performance.getEntriesByType("resource").length + 1,
      renderBlocking: performance.getEntriesByType("resource").filter(e => e.renderBlockingStatus === "blocking").map(e => e.name.replace(location.origin, ""))}));
    rec.lab = {loadMs, ...perf};
    await ctx.close();
    out.push(rec);
    process.stdout.write(".");
  }
  await browser.close();
  fs.writeFileSync(process.env.OUT || "browser-audit.json", JSON.stringify(out, null, 1));
  console.log("\nDONE", out.length);
})().catch(e => { console.error(e); process.exit(1); });
