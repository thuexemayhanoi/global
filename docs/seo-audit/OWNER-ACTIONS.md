# OWNER_ACTIONS_LAST

Backlog of items that need an outside account, measurement or the owner's identity. Under the owner directive of 2026-10-28 (`approvals/owner-directive-20261028-seo-only.json`) these items never interrupt SEO work: they are listed here, and SEO on published pages continues. No item is marked DONE until it is actually done.

| # | Item | Effect while missing |
|---|---|---|
| 1 | Google Search Console data for global.rentbikehanoi.com | Rankings, impressions, indexing and field Core Web Vitals are unmeasured; Top 1–3 stays a target, not a verified result |
| 2 | Analytics (GA4 or none) | No traffic or conversion data |
| 3 | Off-page links from real accounts (plan: `COMPETITOR-GAP-AND-OFFPAGE-PLAN.md`) | Authority stays low: DA 3 / 53 referring domains, 0 ranking keywords (Ubersuggest, 2026-11-01; was DA 2 / 32 on 2026-10-28) |
| 4 | Keyword volumes for es, zh, pt and exact ko/ja variants; rank tracking | Head terms for those markets rest on autocomplete and SERP evidence, not volumes |
| 5 | Business data conflicts C1–C3 (hours, delivery threshold, GBP name) in `data/business/reference.json` | Business schema and NAP stay unpublished (protected) |
| 6 | Named human editor or fact reviewer (optional), first for legal, fine, insurance and price guides | Bylines stay organisational; none of the 1,054 AI-drafted guides has a human fact review (re-audit 2026-11-01: S-SCALED-CONTENT-RISK) |
| 7 | New-Hub architecture (`HUB-ARCHITECTURE-PROPOSAL-20261028.md`) and PR #118 | Deferred: SEO-only mode creates no new Hubs or URLs |
| 8 | Response headers beyond GitHub Pages defaults (X-Content-Type-Options, Content-Security-Policy) need a CDN or proxy in front of the site (optional) | Only HSTS and cache-control are sent; no SEO impact (re-audit 2026-11-01: S-SECURITY-HEADERS) |
| 9 | Slug convention per locale for future URLs (when article production resumes) | zh, ko and ja keep a mix of English and romanized slugs; live URLs are never renamed (re-audit 2026-11-01: S-URL-LOCALIZATION) |
