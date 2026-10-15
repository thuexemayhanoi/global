# Global Auto Publisher

The Auto Publisher turns SUBMITTED Writer drafts into **new** live URLs without a per-article owner click. It acts only under `approvals/standing-policy-20261015.json` and only when automated QA and all safety/SEO gates pass. The owner retired the mandatory independent AI Reviewer on 2026-10-15; W1/W2/W3 remain concurrent Writers. It never deletes, renames or redirects a URL, and never edits NAP, prices, business schema, or a PUBLISHED, frozen or protected page.

## Continuous Queue Drain: write up to 10 → Writer QA → publish 2 → live QA → next 2

```
Writer slot pushes 1–10 drafts ─▶ Writer QA ─▶ Autopilot (SUBMITTED + exact SHA-256, refill)
                                                     │ workflow_run
hourly schedule / dispatch ──────────────────────────┤
                                                     ▼
                                       Global Auto Publisher (main code only)
          scan → gates G1–G5 + G7 → ≤2 APPROVED_BY_POLICY → build + every SEO/fact gate → commit main
          → request Pages build → live HTTP QA (≤20 min) → record PASS → re-scan latest main\n          → if another pair is eligible, workflow_dispatch next run (repeat 2+2+2...)
                                     └─ failure → git revert the publish commit + PAUSE
```

Writers never wait for publication; the publisher picks drafts up as soon as they become eligible.

**Queue Drain (15 October 2026):** Each successful publication run performs live HTTP QA and records PASS before evaluating `node scripts/auto-publisher.mjs drain-decision` against a fresh checkout of main. If at least one additional article is eligible and no live QA is pending or publisher is paused, the same trusted workflow dispatches the **next** 2-article run using the built-in `GITHUB_TOKEN` (no external AI key). Runs are serialized with `concurrency: {group: global-auto-publisher, cancel-in-progress: false, queue: max}`; the hourly trigger remains a fallback. A queued batch of 10 eligible drafts will therefore be consumed in up to five separate 2-article publish/live-QA runs, without waiting an hour between pairs. A failed QA gate, review hold, unpublished parent, or stage cap is never bypassed, and blocked articles do not stop an otherwise eligible pair. The loops stop cleanly when no eligible articles remain. Three external AI Writer sessions may continue drafting concurrently, but the workflow itself cannot generate article prose.

## Gates

| Gate | Checks | On failure |
|---|---|---|
| G1 draft QA | strict fact guard (no unsourced amounts, NAP), structure, sources, links, ≥900 words | REJECTED → revise |
| G2 Matrix | IDEA row, new URL, not protected/held, PUBLISHED parent, immutable ledger evidence | BLOCKED / WAIT_PARENT |
| G3 sensitivity | LEGAL / SAFETY / PRICE topics, any money amount, or a hard legal claim (law/article reference, penalty, licence-class threshold) without an official or statute-text citation in the same paragraph | REVIEW_REQUIRED |
| G4 editorial | native language, duplicated paragraphs, lexical variety, keyword stuffing, ≥4 H2, contextual internal link | REJECTED |
| G5 content duplicates | L6 other drafts, L7 published articles (shingle Jaccard ≥0.45 fail, ≥0.30 warn) | REJECTED |
| G7 stage | PILOT 2 per locale → RAMP 10 → CONTINUOUS; advance after 2 / 10 clean live runs; any failure pauses and resets | WAIT_STAGE |

After staging, the build runs `seo-guard --add-new` (freezes only the new URLs), then fact-guard, `build --check`, validate-plan, nav-qa, the static audit (P0), the content graph check and a sitemap inventory check. Any failure rolls back every file and pauses publication.

## Honest provenance

- Published packets keep `facts_reviewed_by_human: false` and `serp_intent_checked: false`.
- A `publication` record is added with mode `STANDING_POLICY`, the source commit and SHA-256, `qa_mode: AUTOMATED_G1_G5_G7`, and `review_sha256: null`. It also sets `human_review: false` and `serp_validated: false`.
- The page shows a localized note saying the guide was drafted with AI assistance and published after automated checks, without human editorial review.

## Operations

```
node scripts/auto-publisher.mjs scan                    # every SUBMITTED draft and its decision (read-only)
node scripts/auto-publisher.mjs drain-decision          # next pair eligibility (read-only)
node --test tests/auto-publisher.test.mjs
```

- **Pause or resume:** dispatch `auto-publisher.yml` with `action=pause|resume`. A resume needs `confirmed=true` and a reason.
- **State:** `factory/publisher/state.json` holds the stage, pause flag, published list and last successful deployment.
- **Revision queue:** `factory/publisher/report.json` lists every failed gate per draft, so the responsible Writer knows what to fix. Sensitive/price/legal topics remain held for qualified factual review.
- **Rollback:** after a live failure the workflow reverts the publish commit and pauses. To reverse a publication manually, revert its `publish(global): …` commit and freeze-registry entry in a reviewed PR. Publication never deletes or redirects URLs on its own.

## Automated repair tickets (QA FAIL → owning AI Writer → re-QA)

No independent AI Reviewer and no fake human approvals. Every trusted Publisher attempt (including while publication is PAUSED) recomputes `factory/publisher/report.json` version 2 with the exact source SHA-256 and W1/W2/W3 owner/session/branch.

- Only genuine fixable failures (`G1_DRAFT_QA`, `G1_DEPTH`, `G3_OFFICIAL_EVIDENCE`, `G4_EDITORIAL`, `G5_CONTENT_DUPLICATES`) become `REPAIR` tickets. Protected/blocked URLs and any `G3_TOPIC_CLASS` or `G3_NO_PRICES` require appropriate factual approval and never auto-pass.
- The **active external AI Writer** calls `node scripts/writer-repair.mjs next --writer W2 --session w2-live` (use its own lane/session), uses the ticket's concrete QA failure details, researches/fixes the article and creates **a new immutable revision** at the given `revision_path`. Original SUBMITTED source bytes remain unchanged.
- Verify with `node scripts/writer-repair.mjs check --writer W2 --session w2-live --file factory/external-writers/inbox/W2/revisions/<ID>.r2.json`, then `node scripts/writer-lanes.mjs verify-all`. After the Writer pushes to its original branch, green Writer QA triggers trusted Autopilot to verify same-owner, exact-source-hash repair evidence and append revision history; Publisher re-runs every content/safety/SEO gate.
- Up to **three repairs** (`r2/r3/r4`); beyond that status `ESCALATED_MAX_ATTEMPTS` and the AI must stop and report why. Missing official evidence cannot be invented. Other Writers' held or protected drafts are never taken over.
- One bad article never blocks unrelated QA-approved articles from publishing in a separate pair. Publisher rollback/pause after failed live deploy is separate from *content repair* and is **never auto-resumed** by the Writer.

GitHub Actions does not contain a model provider: the repair ticket is created automatically, but natural-language rewriting is performed by an **actively running AI Writer session**, not by GitHub Actions itself. See `docs/AI-WRITER-REPAIR-LOOP.md`.

## Owner-approved automatic QA (without an AI Reviewer)

The workflow never requires a second AI session. A Writer publishes a draft to its immutable SUBMITTED ledger, then the publisher checks G1 (strict draft QA), G2 (Matrix, parent and URL protection), G3 (legal/safety/price claims and official citations), G4 (editorial language, structure and internal links), G5 (L6/L7 duplicates), and G7 (safe stage caps). It publishes **only eligible** drafts and runs build, fact/SEO guards, sitemap validation, deploy, live HTTP QA and rollback protections.

LEGAL / SAFETY / PRICE topics and any unsourced sensitive money or hard legal claims are **not automatically publishable**, even if the owner requests publication of the entire backlog. Do not impersonate human fact review. Historical independent reviewer helpers may still exist as inert compatibility code; the G6 requirement and its workflow trigger are retired.
