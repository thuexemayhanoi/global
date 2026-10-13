# GLOBAL MASTER MATRIX — Premium Multilingual Publishing Platform

Repository: `thuexemayhanoi/global` — GitHub Pages: `global.rentbikehanoi.com`. **This is an engineering execution matrix, not the keyword inventory** (`data/seo/master-matrix.json`). Only mark DONE with the evidence required below.

## Baseline — 2026-10-14, refreshed from main HEAD

- Baseline commit **b1e75ce8bad7975910feea783c015a59329394ba**. CNAME exactly `global.rentbikehanoi.com`. `main` remains protected by separate review.
- **25 PUBLISHED HTML URLs**: 1 language directory root, 10 locale Pillars, 10 locale checklists, 4 global utility pages (About, Contact, Privacy, Terms).
- **120 IDEA** = 40 planned Hub + 80 planned Supporting articles; total **145 Matrix rows**, 10 locale codes (vi, en, de, fr, es, nl, zh, pt, ko, ja). IDEA ≠ published page or verified keyword volume.
- Shared generated navigation/footer, owner-approved editorial contact, Node static generator, read-only SEO/AEO audits, 3 external-Writer ownership lanes (40 each), manual dry-run publishing adapter.
- GitHub Actions: latest pre-work `Static SEO QA` and GitHub Pages deployment successful, commit b1e75ce.
- PR #5: editorial review drafts, **open/draft**. PR #6: two EN/DE Hub publication candidates, **open/unmerged**. They must not be double-counted as published or merged silently.
- Live smartphone/desktop screenshot verification is **PENDING** until separate browser evidence is recorded.
- No real Search Console, GSC impressions, backlink dataset, Core Web Vitals measurement or AI crawler citations were supplied. Do not invent metrics.

## Priority matrix

| ID | Priority | Feature / proven gap | Status | Evidence / acceptance |
|---|---|---|---|---|
| G-001 | P0 | Current-state inventory, stale 23/143 counts & protection contract | IN_PROGRESS | Update docs to 25/145 without modifying CNAME or SEO routes; verify Matrix/sitemap |
| G-002 | P0 | Generator/QA state drift and build completeness | OPEN | Deterministic byte-exact `build --check`; verify all published HTML files with P0 fail |
| G-003 | P0 | Publishing guards: reviewed PR only, no fabricated owner approval | EXISTING_GUARD | CI proves unapproved drafts cannot be published; preserve no-API Writer contract |
| G-004 | P0 | Three-Writer unique ownership, claims and interrupted-session recovery | PARTIAL | Writer status/pack ownership tested; add explicit checkpoint/claim/recovery with collision refusal |
| G-005 | P1 | Premium design tokens, sticky header, responsive menu/footer & readability | PARTIAL | Shared CSS/JS for desktop/mobile; linkable categories only when published; focused nav QA |
| G-006 | P1 | Article layout: TOC, accessible breadcrumbs, references, related published pages, scroll progress | OPEN | Visible only for real article routes; TOC anchors work; no newly broken links |
| G-007 | P1 | Global public search, per-locale pagination, bounded index payload | OPEN | Search UI works with static shards, no all-article download on initial page; no phantom results |
| G-008 | P1 | Canonical/hreflang reciprocity, metadata, schema & internal link/orphan audits | PARTIAL | 25/25 baseline checked; CI validates reciprocal equivalents and no IDEA URLs |
| G-009 | P1 | Root/locale homepages & featured modules / localized nav labels | PARTIAL | Homepage/10 locale landing pages polished; no empty category pages |
| G-010 | P1 | AI content pipeline: draft schema, staged batches, no-API writers and content QA | PARTIAL | Dry-run, owner review, real generated HTML, safe stage, state-invariant/rollback tests |
| G-011 | P1 | CI/CD regression, accessibility heuristics and security/asset integrity | PARTIAL | Tests for responsive rules, keyboard nav, references, build, SEO, hreflang; green on PR |
| G-012 | P1 | Real content pilot EN/DE | REVIEW_READY | PR #6 has two prepared Hub pages; remains unmerged until owner-approved production gate & fresh QA |
| G-013 | P2 | Editorial author identity, editorial methodology and fact-source policy | PARTIAL | Organization author linked to real About/contact, no invented business details |
| G-014 | P2 | High-scale incremental search/content index 10k–40k articles | OPEN | Bounded shard generation and documented benchmark; do not claim 40k tested without benchmark |
| G-015 | P2 | Core Web Vitals, responsive/screenshots on production desktop/iPhone | NEEDS_LIVE_DATA | Browser screenshots and/or Lighthouse with actual measured LCP/INP/CLS; avoid invented scores |
| G-016 | P2 | Per-topic intent/cannibalization, research and sources for 120 IDEA | INCOMPLETE | Keep each topic marked NOT_VALIDATED until real independent SERP research |
| G-017 | P2 | Localized FAQ / category landing pages per market | PARTIAL | Existing localized visible FAQs; add only indexable substantial pages when ready |
| G-018 | P3 | Pagination, site authors, archive navigation / aesthetic refinements | OPEN | Grounded UX tests and completed features only; no boilerplate stub SEO URLs |

Status must be one of OPEN, PARTIAL, IN_PROGRESS, REVIEW_READY, NEEDS_LIVE_DATA, INCOMPLETE, BLOCKED, DONE, EXISTING_GUARD; do not equate QA code presence with live verification.

## Non-negotiable operational safeguards

1. **Only this repo**; no change to /total, /blog, /lab, WP, DNS or CNAME.
2. Work in `feat/global-premium-masterwork-v1`; frequent small commits; this branch is NOT production and must NOT be auto-merged.
3. Do not invent SEO volumes, rankings, source text, business facts, legal advice or owner approval.
4. No change or deletion of existing published URLs without a separate approved migration.
5. Static IDEA nav labels may show as disabled; never create an href, sitemap item, canonical, or schema URL for an unpublished IDEA.
6. Writer source drafts and publication QA remain distinct. PR #6 isn't integrated until a fresh branch-safe review and explicit authorization.
7. Checkpoint `docs/MASTERWORK-CHECKPOINT.json` after each implementation batch, including tested commit and remaining tasks. Make only evidence-backed DONE updates.

## Verification commands (Node 22)

```sh
node scripts/build.mjs --check
node scripts/seo/validate-plan.mjs
node scripts/nav-qa.mjs
node scripts/seo/audit-static.mjs --fail-p0
node scripts/seo/audit-ai-search.mjs
node --test tests/*.test.mjs
node scripts/writer-lanes.mjs status
```

**Rollback:** Close technical PR if unmerged. If a merged change causes regressions, revert the specific merged commit in a reviewed PR, regenerate pages and rerun all checks. Do not force-push main.

## Implementation evidence — PR #8 (technical, NOT production)

- **Baseline audit:** 25 PUBLISHED URLs, 10 locale pairs of home/checklist, 120 IDEA, 145 Matrix rows; source file `data/seo/master-matrix.json`. Browser audit 2026-10-14 observed desktop menu hidden on /en/ and /de/, mobile footer tall, no search/TOC; unknown URL returns real HTTP 404, explicit /404.html returns HTTP 200 due to static hosting.
- **P0 desktop fix:** `scripts/navigation.mjs` emits SSR-open desktop disclosure, with `assets/premium.js` collapsing drawer on smartphone. Pre-merge checks assert existence; real deployment visual QA **still pending**.
- **Global search:** `scripts/premium.mjs`, `assets/search.js`, `assets/search-index/manifest.json`; 10 locale-specific shards, only title/description/URL/role; article text never bundled. Noindex /search/ intentionally excluded from the unchanged 25-URL sitemap.
- **Reading UX:** server-side TOC anchors, sticky reading rail, related PUBLISHED-only links, branded author contact, reading progress and back-to-top controls. Shared CSS no third-party font requests.
- **Content graph:** 145 deterministic nodes in `data/seo/content-graph.json` linked to the original Matrix and 3 Writer assignments; external SERP/volume left unverified.
- **Claims and editorial intake:** `writer-claims.mjs` local atomic write, manual PR review, session/revision, claim refusal; `import-markdown.mjs` JSON frontmatter to private JSON, no model API or automatic publication.
- **CI:** Premium nav/search/hreflang/schema checks, claim refusal tests, article QA, content-graph consistency and metadata benchmark; latest confirmed green before final additions: Static SEO QA run 38447466810 and Writer Draft QA run 38447466782. Need fresh green run after current commit before approving PR.
- **Non-goals / limits:** No merge/main write, no new published SEO URL, no CVW field data, no 40k full HTML build test, no automatic Writer/API, no mass translated content. Independent PR #6 still open and not deployed.

## Release evidence and remaining gates

- **Live read-only QA:** `scripts/seo/post-publish-qa.mjs --confirm-live`, manual workflow `post-publish-qa.yml` must be executed **after an owner-approved deployment**. The branch-level tests cover only offline error-detection behavior; live new UI behavior is not yet verified.
- **Rollback:** `docs/RELEASE-ROLLBACK.md` prescribes a reviewed git revert PR and post-deploy smoke test. Never force-reset main or silently delete indexed article URLs.
- **Search metadata benchmark:** GitHub QA run 38448335439, Node 22.23.3: synthetic 10k → 70 shards, 2,190,070 bytes, 14.1 ms; synthetic 40k → 270 shards, 8,760,270 bytes, 59.7 ms. Max shard size 32,851 bytes, **not a complete HTML 40k build or user CWV measurement**.
