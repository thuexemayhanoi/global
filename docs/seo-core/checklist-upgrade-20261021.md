# Core SEO: six seed groups across ten languages

Date: 2026-10-21. Base: `b64c76c2dd56e2cb2e8a307df0fb0afca58fb3d9`.

## Implemented scope

The existing ten rental checklists had five short preparation sections. Each now has four additional native-language sections: automatic/50cc vehicle checks, monthly term and maintenance questions, an itemised quote comparison, and an exact Old Quarter pickup agreement. These are questions to establish with a provider, not statements of local availability, legal exemptions or current rental prices. Planning sections follow the existing booking section; signing, handover, riding and return sections remain intact.

Only `content/locales.json` changes site copy. The builder regenerates ten checklist HTML files; the derived content graph and readable site matrix are refreshed. No new URL, article, keyword ownership, claim, sitemap, menu, metadata, canonical, hreflang, schema, business reference or freeze-registry change is included. PR #86's metadata proposals remain separate.

## Mapping and remaining research

`matrix-20261021.json` is a 60-row audit companion, **not** the canonical publication matrix or a Writer queue. It maps six commercial seed hypotheses to existing informational targets. It does not assign those transactional keywords to /global. All seeds remain NOT_VALIDATED; markets are not inferred from languages. All mapped IDs are PUBLISHED in the base inventory, but target articles have not undergone a fresh full factual review in this change.

Core → locale home; Scooter → vehicle-choice Hub; Monthly → day/week/month Supporting; Prices → costs Hub; 50cc → 50cc/electric Supporting; Old Quarter → pickup section within the checklist. The Old Quarter mapping covers pickup only. Parking, street restrictions and a broader Old Quarter guide still require sources and an architecture decision. Existing prices or legal statements in linked articles are not re-endorsed by this mapping.

Global GSC is NOT_CONNECTED. There are no new search-volume, ranking, traffic or indexation claims. The live keyword matrix and published article source packets are unchanged.

## Validation before PR

- `node scripts/build.mjs` then `--check`: 954 static files, deterministic.
- `node scripts/seo/validate-plan.mjs`: PASS, 926 PUBLISHED URLs, 1,032 IDEA rows.
- `node scripts/seo/seo-guard.mjs`: 0 failures, 159 warnings. All 926 frozen URL fingerprints pass; the registry is unchanged.
- `node scripts/seo/fact-guard.mjs`: 0 failures, 709 warnings from existing sourced third-party prices and other review findings. No price amounts or business claims added.
- `node scripts/seo/content-graph.mjs --check`: PASS.
- `node scripts/nav-qa.mjs`: PASS for all ten locales; no IDEA links.
- `node scripts/seo/audit-static.mjs --out reports/core-static-audit.json --fail-p0`: PASS.
- `node --test tests/*.test.mjs`: 298 passed, 0 failed, 0 skipped.
- `git diff --check`: PASS.

The content-loss mutation test originally compared the shortened current Japanese page against an older, much smaller frozen baseline. The added text made its residual text exceed that old minimum. The test now derives its fixture registry from the current document **in memory** before shortening it. It still asserts CONTENT_LOSS; production guard code and `url-freeze.json` are untouched.

## Production evidence

Not deployed at the time of this pre-merge record. Exact PR head, deployment and live byte-comparison results must be recorded separately after they exist. Passing local QA does not establish production state or Google performance.
