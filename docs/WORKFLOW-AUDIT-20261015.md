# Workflow audit — 2026-10-15 (snapshot)

Scope: the complete /global pipeline Topic Factory → W1/W2/W3 → Writer QA → Repair Queue / Publish Queue → Auto Publisher → Live QA → queue drain, plus AGENTS.md and the runbooks. Audited on `main` at `fdb6b04` (after PRs #37, #38 and #39). Statuses: **DONE** (works, verified), **BROKEN** (defect with evidence), **MISSING**, **OBSOLETE** (contradicts the current contract). "Fix" names the change in this work.

## State at audit time

| Item | Value (evidence) |
|---|---|
| Matrix | 245 rows: 25 PUBLISHED (root, 10 Pillars, 10 checklists, 4 utility), 40 HUB IDEA, 180 SUPPORT IDEA |
| Claims ledger | revision 55: 114 SUBMITTED (W1 30, W2 20, W3 64), 10 RELEASED (W2 handover), 0 CLAIMED, 0 revisions |
| Writer slots | W1 AVAILABLE · W2 last report OFFLINE (owner P0 override, session `w2-live`) · W3 AVAILABLE; request files and draft PRs #17/#30/#31 present on all three Writer branches |
| Publisher report | version 2, ledger revision 55: 93 REVIEW_REQUIRED, 19 REJECTED, 2 APPROVED_BY_POLICY (NL-H01, PT-H01) |
| Repair queue | 12 REPAIR tickets (W1 9, W3 3), 100 HUMAN_REVIEW_REQUIRED, 0 ESCALATED |
| Publisher state | PILOT, **PAUSED** after the revert of NL-H01/PT-H01 (run 38668639207), no publication on record |
| GitHub Pages | latest `pages build and deployment` success (run 38675351638, `fdb6b04`) |
| Tests / gates | 145/145 tests, build --check, validate-plan, seo-guard, fact-guard, content-graph, nav-qa all green |

## Findings

| # | Area | Status | Evidence | Fix |
|---|---|---|---|---|
| 1 | Live QA sitemap check | **BROKEN (P0)** | run 38668639207: `sitemap: Failed to parse URL from sitemap-main.xml`; `parseSitemapIndex()` returns bare names, `cmdLiveQA` passed them to `fetch()`. Both pages had passed; the tool error alone reverted NL-H01/PT-H01 (`f257e24` → `7d9797c`) and paused | `sitemapChildURL()` + shared `fetchSitemapInventory()`; regression test reproduces the exact error with real `fetch()` URL parsing |
| 2 | Live QA failure handling | **MISSING** | any error, including a QA-tool error, led to revert + pause | issues classified SITE / NETWORK / TOOL; verdict PASS / FAIL / INCONCLUSIVE; only FAIL reverts |
| 3 | CDN staleness of live sitemaps | **MISSING** | pages were cache-busted, sitemap requests were not | `?qa=` on every live request (publisher and post-publish QA) |
| 4 | Unverified publications | **MISSING** | a run dying between push and the live result left `PENDING`; the hourly run would publish another pair regardless | `publishGate()`: unverified (PENDING/INCONCLUSIVE) entries block staging and the drain; the next run re-checks them (`LIVE_QA_RECOVERY`) |
| 5 | Workflow pushes | **PARTIAL** | publish: CAS conflict meant "wait an hour"; finalize: one `pull --rebase`; pause/resume: plain push | bounded CAS loop (3 recomputations) for publish; retried state pushes; revert conflict pauses and names the commit |
| 6 | Writer QA after a publication | **BROKEN (latent)** | `verify-all` re-validated SUBMITTED drafts; with NL-H01 PUBLISHED, `writer/w2-live` + `main` failed "Topic already reserved or published", so that Writer could never push again | SUBMITTED drafts locked by SHA-256 (`submittedLock`); edits fail early with `IMMUTABLE_SUBMITTED_DRAFT_CHANGED` |
| 7 | Session advisor after a publication | **BROKEN (latent)** | same root cause: `continuous-writer assigned` reported the published draft as REPAIR_DRAFT | uses the same locked checks |
| 8 | Revision for an unsubmitted ID | **BROKEN (silent)** | passed Writer QA, silently ignored by the coordinator | Writer QA error with fix-in-place guidance; coordinator logs `REVISION_IGNORED` |
| 9 | `writer-repair next` without identity | **BROKEN** | returned the first REPAIR ticket of any Writer | `next`/`check` require `--writer` and `--session` |
| 10 | Repair preflight and new holds | **PARTIAL** | `check` exited 0 when a revision added money amounts (G3_NO_PRICES) | `check` fails on any hold; explicit NOT_SUBMITTED / NOT_YOUR_DRAFT / NOT_REPAIRABLE / NO_CURRENT_TICKET / WRONG_REVISION_PATH |
| 11 | Repair ticket content | **PARTIAL** | no source commit in the ticket | `source_commit` added; attempt limit is one constant |
| 12 | Repair core: SHA binding, holds, max 3, escalation | **DONE** | `tests/repair-queue.test.mjs`; traced coordinator path for W1/W3 (request file, open PR, ticket, `verifyPacket`, `applyRevisions`) | scenario tests S3/S4 added |
| 13 | One failing draft blocks others | **PARTIAL** | an exception in `eligibility()` would abort the whole scan | per-draft guard → `BLOCKED` (`EVALUATION_ERROR`) |
| 14 | Repair handover of an absent Writer's SUBMITTED drafts | **MISSING (by design)** | handover releases only undrafted claims | documented: tickets wait for the same session; owner decision if a transfer is ever wanted |
| 15 | CI coverage of repair code | **PARTIAL** | Writer QA and the Autopilot ran the repair code without its tests | repair, lock and slot suites in Writer QA (push + PR paths), Autopilot, Static SEO QA and publisher |
| 16 | AI API / reviewer constraints | **DONE** | only `GITHUB_TOKEN`; no SDK or endpoint; G6 retired in #37 | enforced by `tests/no-ai-api.test.mjs` |
| 17 | Dashboard | **OBSOLETE** | generated at ledger revision 54; showed ten W2 claims already RELEASED; no queue states | `publicationQueue()`; every state generated from data; refreshed by Topic Factory and Auto Publisher |
| 18 | AGENTS.md | **OBSOLETE / conflicting** | "no auto-publishing", "25 URLs", "120 IDEA", per-hash reviewer revisions, branch-specific merge bans next to the standing policy | CURRENT PRODUCTION WORKFLOW — AUTHORITATIVE CONTRACT at the top; legacy rules marked in place |
| 19 | Runbooks and prompts | **OBSOLETE** | TURBO "publication remains owner-manifest gated", ZERO-CLICK "no automatic article publication", prompts "finish ES-H01/KO-H01 first", `control.json` `auto_publish:false` | `docs/CURRENT-WORKFLOW.md`; docs, prompts and `control.json` aligned |
| 20 | `factory/editorial-reviews/` | **OBSOLETE** | G6 retired; workflow removed in #37 | marked historical |
| 21 | Claims, slots, CAS, idempotent replay | **DONE** | `tests/writer-pool*.test.mjs`, `tests/writer-slots.test.mjs` | scenario tests S1, S5, S6 |
| 22 | Queue drain 2+2+2+2+2 | **DONE** | PR #38, `tests/publisher-drain.test.mjs` | scenario S2 covers stages and caps |
| 23 | Dashboard after a live QA result | **BROKEN (found after the pilot)** | the PASS commit `40ab77f` recorded only `state.json`; the committed dashboard still showed NL-H01/PT-H01 as PUBLISH_STAGED and "Last successful deployment: none yet" | separate best-effort step regenerates the dashboard from `main` after PASS, pause or revert; `tests/dashboard.test.mjs` |
| 24 | Scheduled triggers | **BROKEN (GitHub side)** | 0 `schedule` events in the run history by 2026-10-15 04:57 UTC, although the hourly Auto Publisher cron exists since 01:28 UTC | docs stop relying on schedules; the event and dispatch triggers carry the pipeline |
| 25 | One draft paused the whole queue | **BROKEN (found 04:51)** | pre-commit fact guard refused KO-H01's source title after G1 had passed it; every resume would re-select the same pair. After #42 the same still happens with NL-S02 (real amounts in a source title; rehearsal on `38ec146`) | G1 fact-checks source titles; `tests/auto-publisher.test.mjs` fails on the old logic |
| 26 | G3 money detection | **INCONSISTENT (owner decision)** | misses multiplier/word forms of dong that the fact guard catches | GAP-MATRIX WF-11 |
| 27 | Fact guard false positive | **DONE (#42)** | "QH15 원문" read as 15 won | GAP-MATRIX WF-12 |

## Not changed

No URL, canonical, hreflang, sitemap content, NAP, price, CNAME, published page or Matrix row was changed. No topic expansion (the 10,000-topic plan is separate). No AI API, model, key or reviewer was added.

Post-merge production evidence (Pages deployment, Post-Publish Live HTTP QA, confirmed resume and pilot) is recorded in `docs/GAP-MATRIX.md` § Workflow final fix (WF-07) and in `factory/publisher/state.json`.
