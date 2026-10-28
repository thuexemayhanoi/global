# Gap Matrix — Topical Authority + SEO Protection (2026-10-14)

Audit → Gap Matrix → P0/P1/P2 → Fix → Test → PR → CI → Merge → Production QA. Only gaps with evidence were changed. Statuses: **DONE** (built and verified), **PARTIAL**, **MISSING**, **BROKEN** (defect with evidence), **PROTECTED** (working or important data, kept unchanged), **OWNER** (needs an owner decision), **BLOCKED** (no data source or permission).

Merged PRs: #24 guard + topical map · #25 business reference + fact guard · #26 site matrix + knowledge graph + duplicate gate · #27 links, content protection, publisher freeze, scale · #28 live technical SEO + live drift QA · #29 scale hot paths + production evidence.

## Objectives

| ID | Pri | Area | Before (evidence) | Now | Evidence |
|---|---|---|---|---|---|
| GM-01 | P1 | Keyword mapping, intent, cannibalization, coverage ×10 locales | PARTIAL: only exact-duplicate queries checked; 7 of 15 open clusters had no coverage in any locale | DONE (structural) | 196 native candidates; gates T1–T10; multi-signal overlap; 0 unjustified competing intents (#24, #26) |
| GM-01b | P1 | Real search demand / SERP per market | MISSING | BLOCKED / OWNER | No Search Console property for global.rentbikehanoi.com in the connected tools (no first-party demand or performance data). The connected third-party keyword tools spend paid credits per market, so they need the owner's approval (decision 3). Queries stay `NOT_VALIDATED` |
| GM-02 | P1 | Homepage → Pillar → Hub → Silo → Supporting + knowledge graph | PARTIAL: 145 graph nodes, no silos, entities or typed edges. BROKEN: menu build crashed if a Hub ever had ≠ 2 children | DONE | 180 silos, 40 entities, typed edges, growth-safe menu (#24, #26) |
| GM-03 | P0 | Two-way internal links, orphans, anchors | MISSING (only broken-link check). BROKEN at scale: published Hubs did not link their guides (benchmark) | DONE | Link audit in `seo-guard`; Hub child lists + sibling links; verified at 10,000 articles (#27) |
| GM-04 | P1 | Entities, schema, breadcrumbs, AEO/GEO | PARTIAL: Pillars had WebPage only; checklist breadcrumb schema skipped the "Global" level; article "References" heading English in all 10 locales | DONE | Pillar WebPage + BreadcrumbList + `about` Hanoi (Wikidata Q1858); 3-level checklist breadcrumb; localized references (#27, #28) |
| GM-04b | P2 | Citable sources on live pages | 25/25 live pages have no outbound source links (`audit-ai-search`) | OWNER (editorial UPGRADE) | 22 verified references ready in `data/seo/topical-authority/references.json`; adding them changes live copy |
| GM-05 | P0 | Canonical, hreflang, indexability, robots, sitemap index/shards | PARTIAL: checks existed but nothing froze live SEO; root `/` did not return the Pillars' `x-default` hreflang | DONE | Frozen fingerprints, reciprocity, noindex, robots, CNAME, sitemap checks (#24); root hreflang cluster (#28) |
| GM-06 | P1 | Matrix expansion + duplicate detection before Writer claims | PARTIAL: refill proposals only; exact-match duplicates only | DONE | Owner-manifest promotion; near-duplicate gate in `validate-plan` (#24, #26) |
| GM-07 | P0 | QA at thousands of URLs, manifest drift, index sync | BROKEN: 11 tests failed on the first real publication (hard-coded 25/20/2/120); IDs capped at 99 guides per locale; metadata-only benchmark | DONE | Derived invariants (#26); 2–4 digit IDs, full-pipeline benchmark to 10,000 (#27); live fingerprint drift check (#28) |
| GM-08 | P0 | SEO regression tests for URLs, metadata, published content, in-flight work | PARTIAL: exact counts, no content-loss protection | DONE | Frozen registry + H2/text-loss checks + `--add-new` in publisher; merge simulations against open PRs |
| GM-09 | P2 | Build performance and long-term scale | PARTIAL: untested beyond metadata; superlinear build at 10,000 articles (81 s) | DONE up to 10,000 URLs (measured) | #29 indexes Matrix lookups per build, folds fact-guard keywords once and speeds up overlap ordering. At 10,000 articles: build 81 → 24 s, fact-guard 59 → 24 s, content-graph 51 → 30 s, all gates 310 → 135 s. Output is byte-identical (20,166 files) and cost per article is flat. Beyond ~10,000 URLs, shard `url-freeze`/`content-graph` by locale; CI size alarms at 25 MB enforce this (`docs/PERFORMANCE-LIMITS.md`) |
| GM-10 | P0 | Writer / Turbo / Refill / Publisher integration | Unverified | DONE | W1 branch + #25 merge simulation: 14 drafts pass; publisher rehearsal of EN-H01 passes 108/108 tests unaided; refill shows topical backlog |
| GM-11 | P1 | Global Content Cannibalization Matrix (KEEP/UPGRADE/REVIEW/CREATE) | MISSING | DONE | `docs/GLOBAL-SITE-MATRIX.md`: 5 KEEP, 20 UPGRADE, 0 REVIEW, 316 CREATE |
| GM-12 | P1 | Topical gap analysis (core, sub-topics, FAQ, intents, local, journey, entities) | MISSING | DONE (structural) | Silo × locale coverage, search journey, intent classes, live FAQ map; performance signals `NOT_CONNECTED` |
| GM-13 | P1 | Knowledge Hub parent/child categories | MISSING | DONE (architecture) | Silos are Hub sections + graph nodes, never thin URLs. A silo landing page needs ≥ 12 published guides with a distinct intent and an owner decision |
| GM-14 | P0 | Business NAP/prices reference ×10 + anti-fabrication | MISSING | DONE | `data/business/` + `fact-guard` (#25); evidence from Google Business Profile, official site and listings |
| GM-14b | P1 | Conflicting public business facts | Not tracked | OWNER | C1 site hours 08:00–21:30 vs 09:00–21:00; C2 delivery threshold 800,000 VND; C3 GBP title |
| GM-15 | P1 | Depth of live pages | Not measured | OWNER (editorial UPGRADE) | Pillars 282–516 words, checklists 176–383 words, below targets; content changes go through the editorial gate |
| GM-16 | P0 | Production verification | Live check of 2 URLs only | DONE | Post-publish QA now checks fingerprint drift and runs the fact gate. Live run 38579335957 passed with 0 issues on all 25 URLs (see "Production QA") |

## Defects found and fixed (BROKEN → DONE)

| Defect | Evidence | Fix |
|---|---|---|
| `.gitignore` held a literal `\n`, so `reports/` and `private-drafts/` were not ignored | `git check-ignore` returned nothing | #24 |
| Navigation build threw when a Hub had ≠ 2 Supporting rows | `navHead` guard | #24 (`menuChildren`) |
| 11 tests broke on the first real publication | Publisher rehearsal | #26 |
| Reworded duplicate intents passed `validate-plan` | Injected DE-S99 passed the old exact check | #26 |
| Published Supporting guides became orphans | 400-article benchmark: ORPHAN_PAGE / PARENT_MISSING_CHILD_LINK | #27 |
| IDs capped at 99 guides per locale | Filename regex `\d{2}` | #27 |
| O(n²) overlap checks, 31 MB graph at 2,000 articles | Benchmark timings | #27 |
| Checklist breadcrumb schema skipped the visible "Global" level; root not returning `x-default` | Live HTML | PR-5 (#28) |
| Every page re-scanned the whole Matrix for its header/footer, related links and article links (O(pages × rows)); fact guard re-folded text per keyword | CPU profile at 10,000 articles: build 81 s, fact-guard 59 s | #29 |
| Benchmark artefact: Latin pseudo-text in zh/ja/ko made every CJK page a near-duplicate of every other (499,500 pairs per locale) | Instrumented `similarPairs` on the 10,000-article fixture | #29 (native-script CJK text) |

## PROTECTED (verified unchanged)

CNAME `global.rentbikehanoi.com`; all 25 live URLs and their canonicals/lang; 10 locales; navigation/footer UI (byte-identical; #28 changed `<head>` only; #29 output byte-identical); claims ledger (never read or written); protected drafts in PR #17 (all 14 pass the new QA); EN-H01/DE-H01 in PR #5/#6; checkpoints; no owner approval written on the owner's behalf; no other repository touched.

## Open PRs not owned by this work

- #6 (publish EN/DE Hubs) and #10 (old desktop-nav fix) already conflicted with `main` before this work: they are 40–62 commits behind, with generated HTML and sitemap conflicts. #10 also gains a one-line adjacent conflict in `scripts/nav-qa.mjs`; #29 edits different lines of `scripts/navigation.mjs` than #10 and adds no conflict. Both need a rebase by their owner. After rebasing, #6 will pass the new guards, and `publish-batch` freezes its URLs automatically.
- #5, #12 and #17 merge cleanly.

## Production QA

PR #28 (PR-5, merge `baf0ae7`) went live on 2026-10-14:

| Check | Run / method | Result |
|---|---|---|
| Static SEO QA on `main` | Actions run 38579134775 | success |
| GitHub Pages build and deployment | Actions run 38579133780 (14:17–14:18 UTC) | success |
| Live post-publish QA (`post-publish-qa.yml`, read-only) | Actions run 38579335957, artifact `global-live-post-publish-qa` | **passed, 0 issues, 40 checks.** All 25 PUBLISHED URLs return HTTP 200 with the right lang, canonical, H1 and shared nav/footer. Their live SEO fingerprints equal the frozen registry, with no fact-guard failure. `/search/` is noindex. The sitemap index and its 11 shards equal the PUBLISHED Matrix. robots.txt passes, and unknown routes return HTTP 404. |
| Independent uncached fetch | `/` and `/ja/` | `/` serves the 10 hreflang alternates plus `x-default` → `/`. `/ja/` serves WebPage (`about` Hanoi, Wikidata Q1858) plus BreadcrumbList Global › 日本語. |

These checks prove what the site serves, not Google indexation, rankings or AI citations.

## Workflow final fix (2026-10-15)

Audit with evidence: `docs/WORKFLOW-AUDIT-20261015.md`. Contract: `AGENTS.md` § CURRENT PRODUCTION WORKFLOW; manual: `docs/CURRENT-WORKFLOW.md`.

| ID | Pri | Area | Before (evidence) | Now (evidence) |
|---|---|---|---|---|
| WF-01 | P0 | Live QA sitemap check | BROKEN: run 38668639207 fetched the bare name `sitemap-main.xml` ("Failed to parse URL"), reverting NL-H01/PT-H01 | DONE (code + tests): absolute same-origin shard URLs; regression test fails on the old behaviour (`tests/live-qa.test.mjs`) |
| WF-02 | P0 | False rollback on QA-tool errors | BROKEN: any error reverted | DONE (code + tests): PASS / FAIL / INCONCLUSIVE; only FAIL reverts; unverified publications re-checked before new staging |
| WF-03 | P1 | Writer QA after publication | BROKEN (latent): a published draft turned its Writer branch red | DONE (code + tests): SUBMITTED drafts hash-locked (`tests/writer-qa-lock.test.mjs`) |
| WF-04 | P1 | Repair CLI identity, holds, guidance | BROKEN/PARTIAL | DONE (code + tests): `tests/repair-queue.test.mjs` |
| WF-05 | P1 | CI coverage, no-AI guard, scenarios | PARTIAL | DONE: repair/lock suites in every workflow that runs the code; `tests/no-ai-api.test.mjs`; ten scenarios in `tests/workflow-scenarios.test.mjs` |
| WF-06 | P1 | Dashboard + docs | OBSOLETE | DONE: queue states generated from data; AGENTS.md contract; legacy docs marked |
| WF-07 | P0 | Production resume | PAUSED since 2026-10-15T02:20Z | DONE (production): PR #40 merged as `eedb4ba`; Pages run 38680346553 success; Post-Publish Live HTTP QA 38680440442 passed (40 checks, 0 issues); confirmed resume 38680501986 (`c565664`); pilot run 38680543606 published NL-H01 + PT-H01 (`3980926`), Live QA PASS in 41 s with 11 sitemap files and 27 URLs (`40ab77f`); Post-Publish Live HTTP QA 38680674431 on `40ab77f` passed (42 checks, 0 issues). Stage PILOT, clean_runs 1; the drain stopped with `QUEUE_DRAINED_OR_HELD` (no third eligible draft) |
| WF-08 | P2 | Dashboard after live QA | STALE: the committed dashboard kept the pilot pair as PUBLISH_STAGED after the PASS was recorded (only `state.json` was committed) | DONE (workflow + test): separate best-effort step regenerates it from `main` after the live result (`tests/dashboard.test.mjs`) |
| WF-09 | P2 | Scheduled triggers | `schedule` never fired: 0 `schedule` events in the repository's run history by 2026-10-15 04:57 UTC (Auto Publisher hourly cron since 01:28 UTC; the 04:41 slot also did not fire; both workflows `active`, default branch `main`) | OPEN (GitHub side, not repository code): docs no longer rely on schedules; Writer push → Autopilot → Auto Publisher, research batch → Topic Factory, drain dispatch and operator dispatch are the working triggers |
| WF-10 | P0 | Pre-commit fact guard vs G1 | BROKEN: 2026-10-15 04:51 the publisher approved ES-H01 + KO-H01, then the site fact guard refused KO-H01's page (`UNSOURCED_AMOUNT «15 원»` from a source title) and paused the whole queue; NL-S02 (source title "200.000 dong per maand") would have done the same. Source titles are rendered but G1 never checked them | DONE (code + test): `checkArticle` fact-checks source titles (strict for both publication paths, warnings in Writer QA), so such a draft gets a repair ticket instead of pausing every run. Rehearsal on `38ec146` (after #42): NL-S02 + PT-S02 still rolled back and paused; with this fix NL-S02 is REJECTED (repair) and PT-S02 stages cleanly. 12 W1 drafts carry real amounts in source titles. Nothing was published; the pause stays until a confirmed resume |
| WF-11 | P1 | G3 money detection | INCONSISTENT: `G3_NO_PRICES` misses amounts the fact guard recognises ("2 a 4 millones de dong", "200万〜400万ドン", "200만~400만 동", "200.000 dong"); cited fine amounts therefore pass G3 (ES-H01, JA-S01, KO-S01) | OWNER: using the fact guard's extractor adds `G3_NO_PRICES` to 27 drafts (ledger revision 57, after #42); 7 of them are not held today (ES-H01, KO-H01, NL-S02, JA-S01, KO-S01, DE-S02, ES-S02) and would move to human review. Whether cited fines count as "money amounts" under the standing policy is an owner decision |
| WF-12 | P2 | Fact guard false positive | `extractAmounts("…36/2024/QH15 원문")` → «15 원» (원문 = original text) blocked KO-H01 | DONE in #42 (`38ec146`): 원 counts as won only before a non-letter or a Korean particle; KO-H01 is APPROVED_BY_POLICY again |

## Owner decisions (OWNER)

1. ~~First topical promotion manifest~~ Done 2026-10-14: `approvals/topical-20261014.json` promoted 50 candidates (5 per locale) as IDEA rows; 126 PROPOSED remain for later manifests.
2. The fifth `routes-trips` Hub (Ha Giang / Ninh Binh).
3. Real keyword/SERP validation per market (connect Search Console for global.rentbikehanoi.com and/or approve keyword-tool credits).
4. Resolve business conflicts C1–C3, and decide whether /global may display NAP/prices or business schema (`publication.*_approved`).
5. Editorial UPGRADE of 20 live pages (depth + citations).
6. Rebase and publish PR #6.
7. ~~Whether /global hands commercial intent to thuexemaynguyentu.com (positioning).~~ Decided 2026-10-28 by the owner: /global competes independently for commercial and informational keywords (`approvals/owner-directive-20261028-independent-seo.json`).
