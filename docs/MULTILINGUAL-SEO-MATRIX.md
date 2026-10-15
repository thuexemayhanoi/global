# Global multilingual SEO Master Matrix — planning contract

> **Dated snapshot (2026-10-13).** Counts and publication rules on this page describe that date. Current rules: `AGENTS.md` § CURRENT PRODUCTION WORKFLOW and `docs/CURRENT-WORKFLOW.md`.

## Status · 2026-10-13

Live site: https://global.rentbikehanoi.com/  
Repo: `thuexemayhanoi/global`  
Languages: vi, en, de, fr, es, nl, zh-CN (/zh/), pt, ko, ja.

**Current inventory:** 25 existing public HTML URLs + 120 **IDEA only** proposals = 145 matrix rows.
IDEA items are *not pages*, are *not indexed*, and must not enter sitemap, navigation, content indexes or hreflang.

## Pillar > Hub > Silo/Support

- PILLAR: the existing `/{locale}/` overview, one per language.
- HUB: four future first-level topic hubs per language: `vehicle-choice`, `rental-costs`, `documents-contracts`, `safety-support`.
- SUPPORT: eight independently researched supporting questions per language (two per hub).
- EXISTING: `/{locale}/checklist/` already owns rental pickup inspection intent. New proposed safety content must not target the exact same query.
- SITE: `/` is the language selector; `/privacy/` and `/terms/` are utility pages.

Every idea has its own native-language query hypothesis, intent, unique proposed URL, ownership ID and parent. Slugs in `/topics/` and `/guides/` are provisional **until each language's local SERP audit**.

## Production state machine

`IDEA → RESEARCHED → DRAFT → QA_APPROVED → PUBLISHED`, or `BLOCKED`.
No state automatically changes during CI. Only a human-approved operator can promote to published after source and live-URL QA. The first batches should be **2 pages per language at most**, and reviewed individually before enabling any recurring writer.

### Before advancing IDEA

1. Inspect organic SERPs in the **actual search language and target market** and validate intent. No fabricated search volume or keyword difficulty.
2. Confirm duplicate-intent and cannibalization boundaries against every existing and proposed locale URL.
3. Produce a research packet: current and authoritative references for legal rules; verifiable provider info for prices, deposits and availability; dated citations where appropriate.
4. Draft original, reader-first content tailored to the locale. Do not turn one English template into ten near-identical articles.
5. Quality gate: grounded factual statements, title/H1/description, localized prose, accessibility, image rights, helpful FAQs, internal links to **published** URL targets only.
6. Stage preview and verify 200 response, sitemap/canonical, `lang`, internal links, mobile display, duplicate title check, no orphan URL. For genuinely equivalent pages only, add reciprocal hreflang.
7. Publish and then update Matrix status; regenerate sitemap **only with real HTML pages**. Do not claim Google indexed a page without independent evidence.

## Writer queue (read-only)

```bash
node scripts/seo/validate-plan.mjs
node scripts/seo/writer-queue.mjs --locale de --count 2
```

Writer queue prints only *research candidates*. It does **not** modify files, invoke AI services, use paid APIs, create drafts, claim work, or publish.
Supporting rows stay blocked from queue selection until their parent HUB is genuinely published. This avoids writing 80 disconnected articles.
The editor should expand this Matrix only after real user/search-intent research.

## Technical safety

- GitHub Pages root deployment and `CNAME=global.rentbikehanoi.com` are frozen.
- The `scripts/build.mjs` generator owns the 25 live URLs, and this Matrix is observational/planning only.
- Keep WordPress sites, `/lab`, `/german`, and their NAP/SEO out of scope.
- No generic 404 redirects to the homepage; decide migrations with evidence.
- Use locale-appropriate `html lang`, self canonical, correct sitemap and no speculative structured claims.
- Protect existing 25 URLs from deletion and retain linkability throughout future expansions.

## Research taxonomy and roles

See `data/seo/taxonomy.json` for intent clusters and prohibited unsupported factual claims.
See `data/seo/master-matrix.json` for the complete canonical proposal inventory.
