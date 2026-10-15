# Global Auto Publisher

The Auto Publisher turns SUBMITTED Writer drafts into **new** live URLs without a per-article owner click. It acts only under `approvals/standing-policy-20261015.json` and only when automated QA and every safety/SEO gate pass. The owner retired the independent AI Reviewer on 2026-10-15: automated QA (G1–G5 + G7) decides eligibility, and W1/W2/W3 remain concurrent Writers. It never deletes, renames or redirects a URL, and never edits NAP, prices, business schema, or a PUBLISHED, frozen or protected page. Current operating manual: `docs/CURRENT-WORKFLOW.md`.

| Path | Status | Approval |
|---|---|---|
| Standing-policy Auto Publisher (this page, `auto-publisher.yml`) | **CURRENT** | standing policy; gates G1–G5 + G7; ≤2 per run; Live QA |
| Manual Publisher (`scripts/seo/publish-batch.mjs`, `docs/BATCH-PUBLISHING.md`) | MANUAL PATH | exact owner approval manifest on a reviewed feature branch |

## Continuous queue drain: write up to 10 → Writer QA → publish 2 → Live QA → next 2

```
Writer slot pushes 1–10 drafts ─▶ Writer QA ─▶ Autopilot (SUBMITTED + exact SHA-256, refill)
                                                     │ workflow_run
hourly schedule / dispatch ──────────────────────────┤
                                                     ▼
                                       Global Auto Publisher (main code only)
   unverified earlier publication? ─▶ re-check it first (LIVE_QA_RECOVERY), stage nothing new
   scan → gates G1–G5 + G7 → ≤2 APPROVED_BY_POLICY → build + every SEO/fact gate → commit main (CAS ×3)
   → request Pages build → Live QA (≤20 min) → verdict
        PASS          → record → re-scan latest main → dispatch the next run if a pair is eligible
        FAIL          → git revert the publish commit + PAUSE
        INCONCLUSIVE  → PAUSE, production untouched, re-checked by later runs
```

Writers never wait for publication; the publisher picks drafts up as soon as they become eligible. Each successful run evaluates `node scripts/auto-publisher.mjs drain-decision` against a fresh checkout of `main` and, if another pair is eligible and nothing is paused or unverified, dispatches the next 2-article run with the built-in `GITHUB_TOKEN` (no AI key). Runs are serialized (`concurrency: global-auto-publisher`, `queue: max`); the hourly schedule is only a best-effort fallback (GitHub may delay or skip scheduled runs, and none had fired in this repository by 2026-10-15), so an operator dispatches `action=publish` instead of waiting for it. Ten eligible drafts are consumed as five runs of 2+2+2+2+2. A failing draft, a review hold, an unpublished parent or a stage cap never blocks another eligible draft and is never bypassed. The workflow cannot write article prose.

## Gates

| Gate | Checks | On failure |
|---|---|---|
| G1 draft QA | strict fact guard (no unsourced amounts, NAP) on title, description, H1, body and source titles (the page's reference list), structure, sources, links, ≥900 words | REJECTED → repair ticket |
| G2 Matrix | IDEA row, new URL, not protected/held, PUBLISHED parent, immutable ledger evidence | BLOCKED / WAIT_PARENT |
| G3 sensitivity | LEGAL / SAFETY / PRICE topics and money amounts (human review); a hard legal claim (law/article reference, penalty, licence-class threshold) without an official or statute-text citation in the same paragraph (repairable) | REVIEW_REQUIRED |
| G4 editorial | native language, duplicated paragraphs, lexical variety, keyword stuffing, ≥4 H2, contextual internal link | REJECTED → repair ticket |
| G5 content duplicates | L6 other drafts, L7 published articles (shingle Jaccard ≥0.45 fail, ≥0.30 warn) | REJECTED → repair ticket |
| G7 stage | PILOT 2 per locale → RAMP 10 → CONTINUOUS; advance after 2 / 10 clean live runs; any failure pauses and resets | WAIT_STAGE |

There is no G6: the independent reviewer gate was retired and must not come back (`tests/no-ai-api.test.mjs`). An exception while evaluating one draft marks only that draft BLOCKED (`EVALUATION_ERROR`).

After staging, the build runs `seo-guard --add-new` (freezes only the new URLs), then fact-guard, `build --check`, validate-plan, nav-qa, the static audit (P0), the content graph check and a sitemap inventory check. Any failure rolls back every file and pauses publication.

## Live QA

`node scripts/auto-publisher.mjs live-qa --ids A,B --record --out <file>` (`scripts/publisher-live-qa.mjs`):

- **Pages:** HTTP 200, `lang`, H1, self-canonical, shared navigation/footer, stylesheet, crawlable text, exact title, no `noindex` (meta or `X-Robots-Tag`), AI-provenance note.
- **Sitemaps:** the index and **every** child (main + all 10 locale shards), each requested as an absolute same-origin URL built by `sitemapChildURL()`; HTTP 200, valid XML, canonical `<loc>`s, locale placement, no cross-shard duplicates, size limits; the new URLs must be listed.
- **Cache and deploy lag:** every request carries a `?qa=<time>` cache-buster, so the CDN cannot serve a stale copy; failures caused by deploy lag are re-polled every 20 s for up to 20 minutes.
- **Classification:** SITE (production served something wrong), NETWORK (the request failed), TOOL (the QA code could not build a request or crashed). Verdict: **PASS**, **FAIL** if any SITE issue remains at the end, **INCONCLUSIVE** if only NETWORK/TOOL issues remain. A TOOL-only result stops polling immediately.

| Verdict | Workflow action |
|---|---|
| PASS | record (clean run, maybe stage advance), dispatch the next pair |
| FAIL on a fresh publication | revert the publish commit, record-failure, PAUSE (if the revert conflicts: PAUSE and name the commit for an operator) |
| INCONCLUSIVE, or any result of a recovery re-check | PAUSE, production untouched, no rollback |

Publications whose live result is PENDING (a run died before recording) or INCONCLUSIVE are **unverified**: they block new staging and the drain; every later run re-checks them first (`LIVE_QA_RECOVERY`) and records the new result. Recovery never lifts a pause.

History: on 2026-10-15 run 38668639207 passed both new pages but fetched the bare sitemap child name `sitemap-main.xml`, which `fetch()` rejects ("Failed to parse URL from sitemap-main.xml"). The tool error reverted NL-H01/PT-H01 and paused publication. The absolute-URL builder, the verdict classification and the regression test in `tests/live-qa.test.mjs` prevent both the error and the false rollback.

## Honest provenance

- Published packets keep `facts_reviewed_by_human: false` and `serp_intent_checked: false`.
- A `publication` record is added with mode `STANDING_POLICY`, the source commit and SHA-256, `qa_mode: AUTOMATED_G1_G5_G7`, and `review_sha256: null`. It also sets `human_review: false` and `serp_validated: false`.
- The page shows a localized note saying the guide was drafted with AI assistance and published after automated checks, without human editorial review.

## Operations

```
node scripts/auto-publisher.mjs scan                    # every SUBMITTED draft and its decision (read-only)
node scripts/auto-publisher.mjs drain-decision          # next pair eligibility (read-only)
node --test tests/auto-publisher.test.mjs tests/live-qa.test.mjs tests/publisher-drain.test.mjs tests/workflow-scenarios.test.mjs
```

- **Pause or resume:** dispatch `auto-publisher.yml` with `action=pause|resume`. Resume needs `confirmed=true` and a reason of at least 12 characters. Before resuming, verify the latest Pages deployment and run `post-publish-qa.yml` (`docs/CURRENT-WORKFLOW.md` § 8).
- **State:** `factory/publisher/state.json` holds the stage, pause flag and reason, the published list with each live QA result, and the last successful deployment.
- **Report:** `factory/publisher/report.json` (version 2) lists every failed gate per draft hash with Writer, session, branch, source commit and SHA-256. It is rewritten by every run, even while paused, and is the only source of repair tickets.
- **Dashboard:** each run also regenerates `docs/CONTENT-FACTORY-DASHBOARD.md` from data: in the publish commit (the pair shows as PUBLISH_STAGED) and again once the live QA result (PASS, pause or revert) is on `main`. The second refresh is a separate best-effort step; it never changes the verdict, the revert or the drain decision.
- **Rollback:** after a live FAIL the workflow reverts the publish commit and pauses. To reverse a publication manually, revert its `publish(global): …` commit and freeze-registry entry in a reviewed PR. Publication never deletes or redirects URLs on its own.

## Repair tickets (QA FAIL → owning AI Writer → re-QA)

No independent AI Reviewer and no fake human approvals.

- Only genuine fixable failures (`G1_DRAFT_QA`, `G1_DEPTH`, `G3_OFFICIAL_EVIDENCE`, `G4_EDITORIAL`, `G5_CONTENT_DUPLICATES`) become `REPAIR` tickets. Protected/blocked URLs and any `G3_TOPIC_CLASS` or `G3_NO_PRICES` hold need appropriate human factual approval and never auto-pass.
- The **active external AI Writer** that submitted the draft runs `node scripts/writer-repair.mjs next --writer Wn --session <its session>`, fixes the named gates with real research and writes **a new immutable revision** at the ticket's `revision_path`. The submitted source bytes stay unchanged.
- It verifies with `node scripts/writer-repair.mjs check --writer Wn --session <session> --file <revision_path>` and `node scripts/writer-lanes.mjs verify-all`, then pushes its own branch. Green Writer QA triggers the Autopilot, which accepts the revision only for a current REPAIR ticket of that exact hash, Writer and session, and appends the revision history; the publisher then re-runs every gate.
- Up to **three repairs** (`r2/r3/r4`); after that `ESCALATED_MAX_ATTEMPTS`, and the Writer stops and reports. Missing official evidence cannot be invented. Other Writers' drafts are never taken over.
- A draft that fails Writer QA **before** submission is not a repair: it is fixed in place.

GitHub Actions contains no model provider: the repair ticket is created automatically, but rewriting is done by an **actively running AI Writer session**. See `docs/AI-WRITER-REPAIR-LOOP.md`.

LEGAL / SAFETY / PRICE topics and any unsourced sensitive money or hard legal claims are **not automatically publishable**, even if the owner asks for the whole backlog. Do not impersonate human fact review. Historical reviewer helpers (`validate-reviews`, `ingest-reviews`) remain as inert compatibility code; nothing depends on them.
