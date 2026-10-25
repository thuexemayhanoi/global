# Branch and PR audit — 2026-10-25

Owner instruction of 2026-10-25 ("GLOBAL FINAL CLEANUP → 10.000 ARTICLES"). This file records what was checked, what was done and what still needs the owner. Counts come from repository data at the stated commits; nothing here infers rankings, indexation or traffic.

## 1. Verified baseline (main `e120936`, before any action)

| Item | Value | Source |
|---|---:|---|
| Remote branches besides `main` | 98 | `git branch -r` |
| Open PRs | 11 | GitHub |
| PUBLISHED Hub/Supporting URLs | 911 | `docs/CONTENT-FACTORY-DASHBOARD.md` |
| READY topics | 1,002 | same |
| CLAIMED | 30 (W1 10, W2 10, W3 10) | `factory/external-writers/claims.json` rev 603 |
| SUBMITTED, not live | 0 | same |
| Auto Publisher | CONTINUOUS, not paused, 901 Live QA PASS | `factory/publisher/state.json` |

Local QA on `e120936`: `build --check` (954 files), `content-graph --check`, `validate-plan`, `seo-guard` (926 frozen URLs, 0 fail), `fact-guard` (0 fail), `topical-authority validate`, `nav-qa`, `audit-static --fail-p0`, `audit-ai-search` and `node --test tests/*.test.mjs` (308 tests, 307 pass, 1 skipped) all passed.

## 2. SEO V11 production evidence

- Live Markup QA on the final V11 commit `e120936` (batch 012, #103) had never run; the last run was on batch 011. Dispatched 2026-10-25: run 40206787983 **passed** (every PUBLISHED URL plus `/`, `/search/`, `/404.html` byte-identical to the committed build).
- Post-Publish Live HTTP QA on `e120936`: run 40206789913 **passed** (status, lang, canonical, sitemap index and shards, robots, 404, frozen fingerprints, NAP/business-schema checks).

## 3. Open PRs — outcome

| PR | Outcome | Evidence |
|---|---|---|
| #86 SEO metadata on 632 pages | SUPERSEDED, closed | #90/#91 and V11 #92–#103 reviewed all 901 packets; 433 URLs already carry #86 text, 199 URLs (251 fields) would be overwritten; 809 conflicting paths; `recovery-baseline.json`: "never merge PR86" |
| #75 VI-S88/89/90 owner-approved drafts | Resolved through the Writer pipeline, closed | #105 moved the three IDEA rows to the front of the claim queue; W1 session `w1-claude-20261025` re-verified every source, submitted them; Auto Publisher G1–G5 + G7 and Live QA PASS |
| #72 transport & urban mobility Hub | **BLOCKED — owner architecture decision** | Standing policy excludes "New Hub rows or architecture changes without a separate reviewed architecture decision". The proposal is being updated to a 10-locale decision document; nothing is implemented |
| #74, #31, #17 Writer sessions | LEGACY, closed (branches kept) | Sessions ended (last push 10-19, 10-16, 10-20); official coordinator handover released 30 undrafted claims, 0 drafted work lost; every draft on the branches is SUBMITTED and published |
| #30 Writer `w2-live` | LEGACY, closed (branch kept) | No slot, no claims; all 30 drafts at the tip SUBMITTED and published |
| #12 five WebP images | SUPERSEDED, closed | Same blob SHAs on main (root), integrated by #13, responsive variants in #79 |
| #10 desktop mega menu (base = masterwork branch) | SUPERSEDED, closed | Fixed on main by 74863f7f via #8 (`<details class="nav2-drawer" open>`); base branch already in main |
| #6 / #5 EN-H01, DE-H01 pilot Hubs | SUPERSEDED, closed | Published 2026-10-15 via legacy pilot intake #64 and the Auto Publisher; `publish/pilot-hubs-en-de` kept as PILOT_SOURCE provenance |

## 4. Writer pool recovery

| Step | Result |
|---|---|
| `writer-pool.yml` signal OFFLINE + handover, W1 `w1-vibe-20261014` | 10 claims released, 0 kept (ledger rev 604) |
| same for W2 `w2-claude-20261017` | 10 released, 0 kept (rev 605) |
| same for W3 `w3-live` | 10 released, 0 kept (rev 606) |
| New sessions (agent claude) | W1 `w1-claude-20261025` (#106), W2 `w2-claude-20261025` (#107), W3 `w3-claude-20261025` (#108); draft PRs are never merged |

Every release used `confirmed=true` and a reason citing the owner's 2026-10-25 instruction. No timer moved a claim; no SUBMITTED draft was touched.

## 5. Workflow fixes (Phase D)

- #109: the Writer Autopilot, the manual Writer Pool and the Topic Factory now use `queue: max`. A skipped PR-event run had cancelled W2's pending Autopilot run on 2026-10-25 (GitHub keeps one pending run per concurrency group). Test added.
- Research batch `claude-20261015-mobility-0032` (10 es topics, QA PASS on 2026-10-15) was never ingested: its Topic Factory run (38818904946) aborted on a T4 promotion check that #77 later fixed. The batch passes `validate-batch` on current main. Following `docs/TOPIC-RESEARCH-CHECKPOINT.md`, the research session was resumed and a checkpoint-only commit (9d5b9a45) re-triggered Topic Research QA and the Factory ingest: the batch was ingested on 2026-10-25 as TA-ES-0311 … TA-ES-0320 (0 rejected).

## 6. Fact review of ZH-S73, KO-H01, JA-S05, PT-S23 (+ DE-S07 typos)

Flagged in `docs/seo-v11/out-of-scope.json`. PR #110 corrects them against official sources fetched on 2026-10-25; four independent verifiers re-fetched the sources and their findings are applied. URL, title, description, H1 and H2 outline are unchanged; `facts_reviewed_by_human` is not changed.

| Article | Finding | Official source used |
|---|---|---|
| ZH-S73 | Blanket VinFast range, mandatory 70% rule and "whole day" promise were not supported | VinFast range table (2022, 30 km/h test) and Evo Grand Limited product page |
| KO-H01 (+ KO-S05, KO-S02) | "Korean IDPs are not recognised" is wrong since 23 July 2023 | Official Gazette notice 15/2023/TB-LPQT, agreement text, MOFA 0404.go.kr |
| JA-S05 | Japanese IDPs are issued by the prefectural public safety commission, not JAF | Road Traffic Act art. 107-7 (e-Gov), NPA, Tokyo MPD; Vietnam law art. 57 |
| PT-S23 | Dates correct, but cited from a secondary page about a draft | Circular 50/2025/TT-BCT art. 4 (vanban.chinhphu.vn) |
| DE-S07 | Two German typos | — |

A stray private-use character (JA-S05) and garbled characters (KO-S05) were removed; a scan of every article and lead found no other such characters.

## 7. Open owner decisions

1. Hub architecture for the six research-open domains (PR #72 and its decision document).
2. Optional housekeeping: deleting fully merged branches. Nothing was deleted; writer, research and `publish/pilot-hubs-en-de` branches must stay because the ledger, research log and legacy intake reference them.

## 8. Every branch

Counts: BLOCKED 1, COMPLETED_UNMERGED 1, LEGACY 5, MERGED 85, SUPERSEDED 9, WRITER_ACTIVE 3 (total 104 branches besides main)

| Branch | Class | PR | Ahead/behind main | Last commit | Evidence |
|---|---|---|---|---|---|
| `assets/five-premium-webp-20261014` | SUPERSEDED | #12 closed 2026-10-25 | 1/2078 | 2026-10-14 | Replaced by newer work on main (see PR closing comment) |
| `claude/topical-authority-seo-expansion-wi7nh1` | MERGED | — | 1/2015 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `content/fact-corrections-4-articles-20261025` | COMPLETED_UNMERGED | #110 | 2/2 | 2026-10-25 | Official-source corrections ZH-S73, KO-H01, JA-S05, PT-S23 in review |
| `docs/global-transport-mobility-hub-proposal-20261015` | BLOCKED | #72 draft, open | 1/1554 | 2026-10-15 | Owner Hub architecture decision required; standing policy excludes new Hubs |
| `docs/seo-v10-live-markup-result` | MERGED | #85 merged | 1/44 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `docs/seo-v10-verification` | MERGED | #83 merged | 3/46 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `editorial/pilot-hubs-en-de` | SUPERSEDED | #5 closed 2026-10-25 | 2/2122 | 2026-10-14 | Replaced by newer work on main (see PR closing comment) |
| `feat/content-factory-publish-adapter` | MERGED | #4 merged | 0/2123 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/dynamic-writer-pool-20261014` | MERGED | #20 merged | 27/2065 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/external-three-writer-lanes` | MERGED | #7 merged | 0/2116 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/full-menu-footer-10-locales` | MERGED | #1 merged | 0/2136 | 2026-10-13 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/global-about-contact-email` | MERGED | #3 merged | 0/2127 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/global-five-photos-integration` | MERGED | #13 merged | 0/2075 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/global-premium-masterwork-v1` | MERGED | #8 merged | 0/2094 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/global-queue-drain-loop-20261015` | MERGED | #38 merged | 8/2011 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/global-turbo-recovery-refill-20261014` | MERGED | #23 merged | 36/2061 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/google-site-verification-global-20261014` | MERGED | #19 merged | 4/2066 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/premium-ultra-design-v1` | MERGED | #11 merged | 0/2079 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/research-backlog-orchestration-20261017` | MERGED | #73 merged | 6/181 | 2026-10-17 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/seo-five-weapons-foundation` | MERGED | #2 merged | 0/2132 | 2026-10-13 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feat/topical-architecture-8-domains` | MERGED | — | 0/1978 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/continuous-three-writer-loop-20261014` | MERGED | #16 merged | 11/2068 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/cross-writer-repair-handoff-20261015` | MERGED | #53 merged | 12/1955 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/global-crash-safe-auto-push-20261015` | MERGED | #52 merged | 4/1968 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/global-open-six-domain-research-20261015` | MERGED | #48 merged | 14/1978 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/global-research-settle-checkpoint-20261015` | MERGED | #62 merged | 4/1863 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/global-source-gates-instead-of-human-review-20261015` | MERGED | #45 merged | 6/1986 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/global-topic-research-domain-progress-20261015` | MERGED | #50 merged | 3/1976 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/legacy-hub-intake-qa-20261015` | MERGED | #58 merged | 9/1914 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/legacy-pilot-hubs-intake-20261015` | MERGED | #64 merged | 0/1864 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/multilingual-sitemap-index-20261014` | MERGED | #18 merged | 26/2067 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `feature/zero-click-writer-autopilot-20261014` | MERGED | #22 merged | 41/2063 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/cross-writer-repair-stale-ledger-20261015` | MERGED | #60 merged | 3/1898 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-10k-research-intake-sequential-cap-20261015` | MERGED | #49 merged | 5/1977 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-all-hubs-live-tests-20261015` | MERGED | #69 merged | 1/1736 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-automated-qa-repair-queue-20261015` | MERGED | #39 merged | 15/2008 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-autoqa-publish-without-reviewer-20261015` | MERGED | #37 merged | 9/2013 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-content-graph-vi-tokenization-20261015` | MERGED | #65 merged | 0/1822 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-coordinator-queue-20261025` | MERGED | #109 merged | 1/2 | 2026-10-25 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-dashboard-after-live-qa-20261015` | MERGED | #41 merged | 1/2002 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-fact-guard-currency-word-boundary-20261015` | MERGED | #70 merged | 1/1698 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-fact-guard-html-anchors-20261015` | MERGED | #46 merged | 3/1984 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-fact-guard-korean-won-20261015` | MERGED | #42 merged | 2/1996 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-factory-scale-test-synthetic-variety-20261015` | MERGED | #71 merged | 1/1654 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-factory-tests-live-data-20261015` | SUPERSEDED | #59 closed-unmerged | 1/1900 | 2026-10-15 | PR closed unmerged; equivalent fix on main (#69, #58+#65, aad9664e) |
| `fix/global-legacy-custody-tests-20261015` | MERGED | #63 merged | 1/1869 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-legacy-pilot-custody-tests-20261015` | MERGED | #66 merged | 0/1812 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-mistral-research-replay-safe-20261015` | MERGED | #51 merged | 4/1975 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-pilot-repair-live-tests-20261015` | MERGED | #67 merged | 0/1797 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-pool-auto-synthetic-parent-test-20261015` | SUPERSEDED | #68 closed-unmerged | 1/1736 | 2026-10-15 | PR closed unmerged; equivalent fix on main (#69, #58+#65, aad9664e) |
| `fix/global-premium-desktop-nav-20261014` | SUPERSEDED | #9 closed unmerged | 5/2105 | 2026-10-14 | Replaced by newer work on main (see PR closing comment) |
| `fix/global-premium-desktop-nav-rebased` | SUPERSEDED | #10 closed 2026-10-25 | 3/2100 | 2026-10-14 | Replaced by newer work on main (see PR closing comment) |
| `fix/global-publisher-money-gate-20261015` | MERGED | #44 merged | 2/1995 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-repair-queue-test-fixture-20261015` | SUPERSEDED | #55 closed-unmerged | 1/1950 | 2026-10-15 | PR closed unmerged; equivalent fix on main (#69, #58+#65, aad9664e) |
| `fix/global-scale-test-needy-locales-20261020` | MERGED | #80 merged | 1/62 | 2026-10-20 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-topic-factory-test-staged-research-20261020` | MERGED | #76 merged | 3/131 | 2026-10-20 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-topical-t4-reciprocal-distinct-20261020` | MERGED | #77 merged | 1/117 | 2026-10-20 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/global-workflow-final-a-z-20261015` | MERGED | #40 merged | 8/2006 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/legacy-intake-tests-adaptive-20261015` | MERGED | #61 merged | 2/1889 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/responsive-gallery-mobile-safari` | MERGED | #14 merged | 0/2073 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/topic-factory-standing-manifest-test` | MERGED | #81 merged | 1/54 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/topical-test-slug-limit` | MERGED | #78 merged | 1/93 | 2026-10-20 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/ultra-stylesheet-cache-bust-v2` | MERGED | #15 merged | 0/2069 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `fix/writer-pool-merge-safe-qa-20261014` | MERGED | #21 merged | 5/2064 | 2026-10-14 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `ops/global-price-qa-resume-20261015` | MERGED | #47 merged | 1/1983 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `ops/vi-s88-s90-claim-priority-20261025` | MERGED | #105 merged | 1/18 | 2026-10-25 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `publish/pilot-hubs-en-de` | SUPERSEDED | #6 closed 2026-10-25 | 1/2122 | 2026-10-14 | EN-H01/DE-H01 published via legacy pilot intake #64; PILOT_SOURCE provenance, keep |
| `qa/live-markup-5xx-retry` | MERGED | #104 merged | 1/30 | 2026-10-22 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `recovery/global-publisher-resume-20261015` | MERGED | #43 merged | 1/1995 | 2026-10-15 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `research/chatgpt-20261017` | MERGED | — | 5/179 | 2026-10-17 | Every batch ingested (research-log.json SHA-256 match); research provenance |
| `research/claude-20261015-mobility` | MERGED | — | 42/1271 | 2026-10-25 | All 32 batches ingested; batch 0032 ingested 2026-10-25 (TA-ES-0311..0320) after checkpoint-only re-trigger 9d5b9a45 |
| `research/claude-20261015-mobility2` | MERGED | — | 45/335 | 2026-10-16 | Every batch ingested (research-log.json SHA-256 match); research provenance |
| `research/claude-20261018` | MERGED | — | 9/173 | 2026-10-18 | Every batch ingested (research-log.json SHA-256 match); research provenance |
| `research/claude-20261018b` | MERGED | — | 226/167 | 2026-10-21 | Every batch ingested (research-log.json SHA-256 match); research provenance |
| `review/claude-subagent-20261015` | LEGACY | — | 1/2013 | 2026-10-15 | Retired G6 AI reviewer records (NL-H01/PT-H01, both published) |
| `review/owner-approved-vi-s88-s89-s90-20261019` | MERGED | #75 closed 2026-10-25 | 4/132 | 2026-10-19 | Text published through the Writer pipeline (W1 w1-claude-20261025), Live QA PASS |
| `seo/core-six-checklists-20261021` | MERGED | #89 merged | 1/40 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-approved-meta21-next-20261021` | MERGED | #91 merged | 13/38 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-approved-meta49-20261021` | MERGED | #90 merged | 14/39 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-docs-verify-82` | MERGED | #87 merged | 1/42 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-global-engine-20261020` | MERGED | #79 merged | 13/53 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-live-markup-qa` | MERGED | #84 merged | 1/46 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-meta-editorial-review-20261021` | MERGED | #88 merged | 10/42 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v10-meta-proposals` | SUPERSEDED | #86 closed 2026-10-25 | 5/39 | 2026-10-21 | Replaced by newer work on main (see PR closing comment) |
| `seo/v10-pillar-sections` | MERGED | #82 merged | 12/46 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-002-20261021` | MERGED | #93 merged | 1/36 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-003-20261021` | MERGED | #94 merged | 1/35 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-004-20261021` | MERGED | #95 merged | 1/34 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-005-20261021` | MERGED | #96 merged | 1/33 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-006-20261021` | MERGED | #97 merged | 1/32 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-007-20261021` | MERGED | #98 merged | 1/31 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-008-20261022` | MERGED | #99 merged | 3/30 | 2026-10-22 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-009-20261022` | MERGED | #100 merged | 4/28 | 2026-10-22 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-010-20261022` | MERGED | #101 merged | 5/27 | 2026-10-22 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-011-20261022` | MERGED | #102 merged | 6/26 | 2026-10-22 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-batch-012-20261022` | MERGED | #103 merged | 7/25 | 2026-10-22 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `seo/v11-metadata-final-20261021` | MERGED | #92 merged | 1/37 | 2026-10-21 | PR merged (squash) or ancestor of main; later main commits evolved the files |
| `writer/w1-vibe-20261014` | LEGACY | #17 closed 2026-10-25 | 136/115 | 2026-10-20 | Ended Writer session, handed over 2026-10-25 where it held a slot; all drafts SUBMITTED and published; ledger source_commit provenance |
| `writer/w1-w1-claude-20261025` | WRITER_ACTIVE | #106 draft (Autopilot only) | 4/13 | 2026-10-25 | Current session; holds CLAIMED IDs; never merged |
| `writer/w2-live` | LEGACY | #30 closed 2026-10-25 | 42/1730 | 2026-10-15 | Ended Writer session, handed over 2026-10-25 where it held a slot; all drafts SUBMITTED and published; ledger source_commit provenance |
| `writer/w2-w2-claude-20261017` | LEGACY | #74 closed 2026-10-25 | 8/148 | 2026-10-19 | Ended Writer session, handed over 2026-10-25 where it held a slot; all drafts SUBMITTED and published; ledger source_commit provenance |
| `writer/w2-w2-claude-20261025` | WRITER_ACTIVE | #107 draft (Autopilot only) | 2/17 | 2026-10-25 | Current session; holds CLAIMED IDs; never merged |
| `writer/w3-live` | LEGACY | #31 closed 2026-10-25 | 535/239 | 2026-10-16 | Ended Writer session, handed over 2026-10-25 where it held a slot; all drafts SUBMITTED and published; ledger source_commit provenance |
| `writer/w3-w3-claude-20261025` | WRITER_ACTIVE | #108 draft (Autopilot only) | 2/17 | 2026-10-25 | Current session; holds CLAIMED IDs; never merged |
