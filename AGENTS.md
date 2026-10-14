# Repository contract · thuexemayhanoi/global

- This repository alone serves `https://global.rentbikehanoi.com/` through GitHub Pages.
- Preserve the `CNAME` content exactly: `global.rentbikehanoi.com`.
- Do not touch `thuexemayhanoi/lab`, `/german`, WordPress, domains or DNS.
- Homepage language switcher uses real URL paths. Do not replace with JS-only translation.
- `content/locales.json` is canonical for the initial locale pages. Regenerate with `node scripts/build.mjs` and confirm `node scripts/build.mjs --check`.
- Maintain self-canonical, correct `lang`, equivalent-only hreflang, descriptive metadata, schema, breadcrumbs and sitemap coverage.
- No invented prices, local premises, reviews, licence rules, or statements of service availability.
- No unreviewed mass auto-publishing. Add researched topic/keyword matrix, scoped QA and safe batch publishing before scaling.
- Do not remove or rename a live URL without a redirect/SEO plan.

## Phase 2 matrix rules

- Read `docs/MULTILINGUAL-SEO-MATRIX.md`, `data/seo/taxonomy.json`, and `data/seo/master-matrix.json` before any topic expansion.
- `IDEA` is merely a keyword hypothesis. Do not render it as a page or reference it in a sitemap/navigation/hreflang.
- Run `node scripts/seo/validate-plan.mjs` after changes to the matrix or deployment files; run `node scripts/seo/writer-queue.mjs --locale de --count 2` for a **read-only** research queue.
- First publish pilots must be separately approved and verified before enabling a recurring writer. Never silently publish proposed topics.

## Full Menu & Footer (approved)

- `scripts/navigation.mjs` is the single source of rendered site-wide menus and footers; `data/seo/master-matrix.json` is the taxonomy source.
- All 4 parent Hub labels and 8 child topic labels per locale are displayed, but IDEA rows must NOT be clickable or placed in sitemap/hreflang. This owner-approved preview only displays category names until their actual pages are approved and published.
- After adding published content or changing Matrix, run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node scripts/nav-qa.mjs`.
- Preserve CNAME and all 25 URLs; do not overwrite unrelated repositories.

## Five-weapon governance

- Run `node scripts/seo/engine.mjs --locale de --count 2` for Audit→Matrix→QA→Report. It must only write gitignored reports, never site content or production settings.
- Never infer actual rankings, Google indexation, backlinks, AI citations or search volume from static audit outputs.
- AI Writer is currently a native-language research/QA scaffold without API connection; no auto-publishing.
- Protect CNAME, published URLs and other repos; propose fixes through QA-reviewed PRs.

## Publishing adapter contract

- `content/articles/<MATRIX-ID>.json` is a source-of-truth for articles the owner has explicitly approved in a reviewed branch/PR. It must correspond 1:1 with a Matrix row marked PUBLISHED.
- `scripts/seo/publish-batch.mjs` defaults to dry-run. --apply must require an exact owner approval manifest, a non-main work branch, complete editorial QA, and must not replace an existing live page.
- Run `node --test tests/content-publisher.test.mjs` and `node scripts/build.mjs --check` in CI.
- Do not auto-generate AI text, approve articles on the owner's behalf, or modify production DNS/CNAME/other repositories.

## Global Turbo Content Factory (owner-approved; /global ONLY)

- Canonical runbook: docs/GLOBAL-CONTENT-FACTORY-TURBO.md. This repository is NOT /blog and must NEVER copy its posts or import /blog checkpoint, lease state or publishing policy.
- Shared queue, up to THREE independent external Writer sessions W1/W2/W3 (one live session per lane), each may claim up to TEN unfinished draft topics across all 10 locales. One active W1 can write every topic. Existing ES-H01 + KO-H01 W1 claims remain valid and finish before Turbo refills.
- Each Writer uses the SAME stable session/branch across restarts. Request activation ONCE on Writer branch. GREEN Writer QA after push triggers Global Dynamic Writer Autopilot; no per-batch GitHub Run click. Writer fetches+merges main, confirms exact 1–10 IDs, creates original native-language draft JSON, verifies QA, pushes OWN inbox, then auto submits verified subset and refills up to 10. Up to ten drafts per push; partial green push of 1–9 is supported.
- Main claims ledger is the sole ownership source; preview is NEVER authorization. Trusted coordinator (main code only) records source commit+SHA256 for new SUBMITTED drafts. Those packets are immutable on Writer branches. Incomplete claims remain owned; no auto-expiry or silent transfer. Concurrent main writes recompute from latest main with bounded CAS retries and NEVER force push.
- Protect 14 W1 legacy drafts in PR #17 and EN-H01/DE-H01 in editorial PRs #5/#6. Claims are not publication, QA PASS is not human review, no model APIs or AI text generation in Actions.
- Topic refill planning: run scripts/writer-refill.mjs status; below 30 free IDEA topics, outside Writer may stage researched Supporting proposals in its OWN factory/topic-refill/proposals/Wn/ directory. G1–G8 are strict structural gates; real sources/SERP still need review. Proposals remain editorial-review-only and DO NOT silently become Matrix rows or live URLs.
- Production requires owner approval manifest via scripts/seo/publish-batch.mjs on reviewed feature branch. Supporting DRAFTS can precede parent publication, but Supporting PUBLICATION needs a genuine PUBLISHED Hub. No automatic publication; never modify CNAME, live URLs, canonical/hreflang/sitemap or unrelated repos while writing.

## Premium Master Work branch safeguards

- `docs/GLOBAL_MASTER_MATRIX.md` and `docs/MASTERWORK-CHECKPOINT.json` document current P0–P3 gaps and resumable state. Do not claim branch features are deployed.
- Search at `/search/` is a nonindex technical utility: valid internal navigation target with real static HTML; intentionally absent from SEO Matrix's PUBLISHED set and sitemap. It must carry `noindex,follow` and must not produce query-parameter SEO URLs.
- Homepage language equivalents and truly translated checklist equivalents retain reciprocal hreflang. Distinct new Hub/supporting articles must not auto-claim hreflang.
- `data/seo/content-graph.json` is deterministic/derived; regenerate `node scripts/seo/content-graph.mjs --write` whenever the Matrix or Writer assignment changes; CI verifies byte-exact --check.
- All current dynamic Writer claims are serialized by the dedicated GitHub Actions dispatcher into main claims.json; local writer-claims.mjs is historical/test-only and must not be used for new claim mutations.
- Markdown writer intake accepts strict JSON frontmatter and writes only ignored private drafts; neither import nor AI writer scripts may publish automatically.
- Do not merge this technical branch, merge publication PR #6 or deploy without the owner's separate explicit production approval.

## Premium Ultra component boundary

- Render site-wide Ultra visuals in `scripts/ultra.mjs` after navigation + `applyPremium`; styles in `assets/ultra.css`; optional progressive interactions in `assets/ultra.js`.
- Never directly patch locale HTML after build: generate with `node scripts/build.mjs` and verify `node scripts/build.mjs --check`.
- Preserve the 10 locales, 25 published URLs, 120 IDEA rows and CNAME. Use only on-page anchors or PUBLISHED URLs; no extra indexable archive/category stubs.
- Keep essential reading and navigation functional without JS. Reader controls remain `hidden` until event handlers are installed.
- Run `node --test tests/ultra.test.mjs` and full QA. No merging this branch without the owner's production approval.

## Continuous external Writer sessions — Turbo

- Read docs/GLOBAL-CONTENT-FACTORY-TURBO.md for current default; docs/DYNAMIC-WRITER-POOL.md is only a manual recovery pointer.
- Write-ahead queue: active Writer W1/W2/W3 → confirmed claims (up to 10) → 1–10 QA-verified drafts → push own branch → auto SUBMITTED/sha journal + refill → fetch main → repeat. No user approval per DRAFT batch.
- Recovery: do NOT skip or steal incomplete claims; resume same session/branch and replay green QA. If no real topics or CI/approval/quota genuinely blocks, stop and report. Never fabricate reviewed sources or mark proposed IDEA as PUBLISHED.

## Multilingual sitemap index (approved 2026-10-14)

- Read `docs/SITEMAP-INDEX.md` before editing sitemap, build scripts or SEO validation. `sitemap.xml` is now a sitemap INDEX referencing 10 locale shards plus `sitemap-main.xml` for shared utilities.
- Only PUBLISHED HTML URLs are included, never IDEA, noindex search, unpublished content or 404. The generator in `scripts/sitemaps.mjs` automatically shards a large language at <=40,000 URLs / <=40 MiB, avoids duplicate URLs and reuses `robots.txt` for discovery.
- Never manually patch the sitemap files. Run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node --test tests/sitemaps.test.mjs`, `node scripts/seo/validate-plan.mjs`, and live post-publish QA after an approved deployment.
- Updating sitemaps does not approve drafts or bypass existing Writer/Coordinator gates, nor guarantee bot indexing.

## Topical Authority + SEO protection (branch claude/topical-authority-seo-expansion-wi7nh1)

- Runbook: `docs/TOPICAL-AUTHORITY.md`; baseline audit: `docs/TOPICAL-AUTHORITY-BASELINE.md`. Hierarchy Entity Hub (PILLAR) → Topic Pillar (HUB) → Cluster (section, never a URL) → Supporting (SUPPORT). Do not rename live Matrix roles.
- `data/seo/url-freeze.json` freezes every live URL's lang, canonical, robots, title, description, H1, hreflang and JSON-LD types. Run `node scripts/seo/seo-guard.mjs` after any build/generator/Matrix change. Re-freeze with `--write` only in a reviewed commit; never remove a frozen URL without a reviewed `retired` entry pointing at a PUBLISHED `redirect_to`. A publication PR freezes its new URL with `--write`.
- `data/seo/topical-authority/` (architecture, verified references, 10 native locale maps) is CAPACITY, not content: PROPOSED/ARCHITECTURE_BLOCKED candidates never enter sitemap, navigation, hreflang, search shards or HTML links, and are not claimable. Run `node scripts/seo/topical-authority.mjs validate` (gates T1–T10) after editing them; do not machine-translate one locale into another.
- Only `node scripts/seo/topical-authority.mjs promote --manifest <committed owner manifest> --apply` on a clean non-main branch may add them to the Matrix as IDEA rows. Never write or fake that manifest on the owner's behalf. The `routes-trips` Hub needs a separate owner architecture decision first.
- Navigation shows exactly two featured Supporting labels per Hub (`menuChildren`, PUBLISHED first). Writer tests derive IDEA counts from the Matrix with a 120-row floor.
- Keyword queries stay `NOT_VALIDATED` until real market data/SERP review; never invent volumes, rankings, prices, availability or legal certainty.
