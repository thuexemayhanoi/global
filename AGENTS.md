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
- Production requires either an owner approval manifest via scripts/seo/publish-batch.mjs on a reviewed feature branch, or the Global Auto Publisher under the 2026-10-15 standing policy (`docs/AUTO-PUBLISHER.md`) for NEW URLs that pass automated QA G1–G5 and G7 (independent AI Reviewer G6 retired by owner); LEGAL/SAFETY/PRICE remain human-review-gated. Supporting PUBLICATION needs a genuine PUBLISHED Hub. Writers never publish; never modify CNAME, live URLs, canonical/hreflang/sitemap or unrelated repos while writing.

## Premium Master Work branch safeguards

- `docs/GLOBAL_MASTER_MATRIX.md` and `docs/MASTERWORK-CHECKPOINT.json` document current P0–P3 gaps and resumable state. Do not claim branch features are deployed.
- Search at `/search/` is a nonindex technical utility: valid internal navigation target with real static HTML; intentionally absent from SEO Matrix's PUBLISHED set and sitemap. It must carry `noindex,follow` and must not produce query-parameter SEO URLs.
- Homepage language equivalents and truly translated checklist equivalents retain reciprocal hreflang. Distinct new Hub/supporting articles must not auto-claim hreflang.
- `data/seo/content-graph.json` (knowledge graph: nodes, silos, candidates, entities, typed edges, KEEP/UPGRADE/REVIEW/CREATE actions) and its readable report `docs/GLOBAL-SITE-MATRIX.md` are deterministic/derived; regenerate `node scripts/seo/content-graph.mjs --write` whenever the Matrix, Writer assignment, protected drafts, topical map or generated HTML changes; CI verifies byte-exact --check. They never read the volatile claims ledger.
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
- Only `node scripts/seo/topical-authority.mjs promote --manifest <committed owner manifest> --apply` on a clean non-main branch, or the Topic Factory under the standing policy (below), may add them to the Matrix as IDEA rows. Never write or fake a personal owner manifest; factory manifests in `approvals/auto/` must say `approval_mode: STANDING_POLICY` and name the policy file. New Hubs/domains (including `routes-trips`) need a reviewed architecture PR with ≥8 validated Supporting candidates.
- Navigation shows exactly two featured Supporting labels per Hub (`menuChildren`, PUBLISHED first). Writer tests derive IDEA counts from the Matrix with a 120-row floor.
- Keyword queries stay `NOT_VALIDATED` until real market data/SERP review; never invent volumes, rankings, prices, availability or legal certainty.

## Business reference + fact guard (approved 2026-10-14)

- `data/business/reference.json` is the ONLY source of Thuê Xe Máy Hà Nội Nguyễn Tú NAP, hours and prices; `data/business/reference.localized.json` is generated (`node scripts/seo/fact-guard.mjs --write`). Read `docs/BUSINESS-REFERENCE.md`.
- `node scripts/seo/fact-guard.mjs` (CI) fails wrong Nguyễn Tú facts anywhere, unsourced amounts/phones on live pages, site copy, Matrix, topical map and approved articles, and any NAP display or LocalBusiness-type schema while `publication.*_approved` flags are false. Writer drafts get warnings for unsourced amounts; `publish-batch` is strict.
- Never change NAP, prices, flags or conflicts without dated evidence and owner approval in a reviewed PR. Known conflicts (site hours 08:00–21:30 vs canonical 09:00–21:00, delivery threshold, GBP title) stay listed until the owner resolves them outside this repo.

## Global site matrix + pre-claim duplicate gate

- `docs/GLOBAL-SITE-MATRIX.md` is the Global Content Cannibalization Matrix (Homepage → Pillar → Hub → Silo → Supporting). Silos are graph nodes and Hub-page sections, never URLs. UPGRADE on a live page is an editorial recommendation with metrics; change live content only through the reviewed publication gate.
- `node scripts/seo/validate-plan.mjs` fails any two non-parent/child Hub/Supporting rows with query overlap ≥ 0.66 and no ≥40-char `distinct_from` reason, so a duplicate intent never reaches the Writer pool. Promotion copies candidate `distinct_from` into the Matrix row.
- Performance signals are NOT_CONNECTED (no Search Console property for global.rentbikehanoi.com in the connected tools); never infer rankings or traffic.

## Link integrity, content protection and scale (PR-4)

- `seo-guard` also audits PUBLISHED pages: orphans, two-way parent↔child links (Hub/Pillar in-content link to every published child; child links back), empty anchors (FAIL) and generic/ambiguous/undiverse anchors (WARN). It freezes each live page's H2 outline and main-text size: removing a frozen H2 or losing >10% of main text fails until a reviewed `--write`.
- Published Hub articles render "Guides in this topic" (every published child, grouped by silo label); Supporting articles render up to six published siblings. Only PUBLISHED URLs. Do not remove these sections: at scale they are what prevents orphan guides.
- `publish-batch --apply` runs `seo-guard --add-new` (freezes only new URLs, refuses on any FAIL) and `fact-guard`, and restores the registry on rollback.
- Matrix/article IDs allow 2–4 digits (XX-S100+). Overlap checks use prefix-filtered all-pairs similarity. Benchmark: `node scripts/bench/full-build-scale.mjs --articles N` (temp copy only); CI runs N=300. See docs/PERFORMANCE-LIMITS.md before scaling past 10,000 URLs (shard url-freeze and content-graph by locale).
- Per-page build code must not scan every Matrix row. Use the per-build indexes instead: `rowsIndex` in `scripts/articles.mjs`, `relatedIndex` in `scripts/premium.mjs`, and header/footer rendered once per locale in `scripts/navigation.mjs`. Any optimization must keep `build --check` byte-identical.

## Live structured data + production QA (PR-5)

- Root `/` carries the 10-locale hreflang cluster with `x-default` to itself; Pillars carry WebPage + BreadcrumbList (Global › Language) with `about` Hanoi (Wikidata Q1858); checklists carry a 3-level BreadcrumbList. Never add business (LocalBusiness/AutoRental/NAP) schema while `publication.business_schema_approved` is false.
- After any approved deployment run the manual `post-publish-qa.yml` workflow: it fetches every PUBLISHED URL live and fails on status/lang/canonical issues, sitemap mismatch, any SEO fingerprint drift from `data/seo/url-freeze.json`, or live NAP/business-schema violations.
- `docs/GAP-MATRIX.md` is the current DONE/PARTIAL/OWNER/BLOCKED status of the master work; update it with evidence, never optimistic claims.

## Global Content Factory 10K (owner standing policy 2026-10-15)

- `approvals/standing-policy-20261015.json` records the owner's standing authorization (verbatim quotes). It covers (a) promoting gate-clean topical candidates to Matrix IDEA rows and (b) publishing NEW Hub/Supporting URLs that pass every Auto Publisher gate. It never covers deleting/renaming/redirecting URLs, NAP, prices, business schema or overwriting published/frozen/protected content.
- Scope: /global is a multilingual Vietnam travel & mobility knowledge hub with 8 domains (`data/seo/topic-factory/policy.json`). Transactional rental keywords belong to thuexemaynguyentu.com (vi) and rentbikehanoi.com (en); do not clone them here.
- Topic Factory: read `docs/TOPIC-FACTORY.md`. Target ≤1,000 Hub/Supporting articles per locale; READY <100 triggers refill toward 250 from validated PROPOSED candidates (≤50 per run). Research arrives only from AI agents via `research/*` branches and `factory/topic-research/batches/` (schema in `factory/topic-research/README.md`). Run `node --test tests/topic-factory.test.mjs` and `node scripts/topic-factory.mjs status` after factory/Matrix changes.
- The `Global Topic Factory` workflow is the only automated writer of factory data on main (CAS push, path allowlist, never force-push). Do not hand-edit `approvals/auto/`, `data/seo/topic-factory/*-log.json` or `docs/CONTENT-FACTORY-DASHBOARD.md`.
- Never invent search volume, rankings, traffic or research sources; L5 topic similarity is lexical until a real embedding model is connected.
- Writer slots W1/W2/W3 are seats for any AI agent (`docs/GLOBAL-CONTENT-FACTORY-TURBO.md` § Universal Writer slots, `factory/external-writers/slots.json`). Quota/offline state changes only by the agent's own request-file signal or a confirmed coordinator dispatch; `handover` releases only undrafted claims of a PAUSED_QUOTA/OFFLINE slot. Never use timeouts to move claims, never take a slot held by another session. Run `node --test tests/writer-slots.test.mjs` after pool changes.
- Auto Publisher (`docs/AUTO-PUBLISHER.md`): ≤2 new articles per run (PILOT 2/locale → RAMP 10 → CONTINUOUS after clean live runs). LEGAL/SAFETY/PRICE topics, money amounts and uncited hard legal claims stay REVIEW_REQUIRED for a human. Policy publications keep `facts_reviewed_by_human:false`, carry a `publication` record and render a localized AI-provenance note. Live QA failure reverts the publish commit and pauses (`factory/publisher/state.json`); resume only by confirmed dispatch. Run `node --test tests/auto-publisher.test.mjs` after publisher/article changes.
- Revision loop: REVISE/FAIL reviews send a SUBMITTED draft back; the same writer session adds `inbox/<W>/revisions/<ID>.rN.json` (never edits the original) with `claim_new:false`, the Autopilot records the new hash and keeps history, and the new version needs its own per-hash review (`factory/editorial-reviews/<ID>.<sha12>.json`).
