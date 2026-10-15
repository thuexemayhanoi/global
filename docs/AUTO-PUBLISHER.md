# Global Auto Publisher

The Auto Publisher turns SUBMITTED Writer drafts into **new** live URLs without a per-article owner click. It acts only under `approvals/standing-policy-20261015.json` and only when every gate passes. It never deletes, renames or redirects a URL, and never edits NAP, prices, business schema, or a PUBLISHED, frozen or protected page.

## Loop: write 2 → QA → publish 2 → live QA → repeat

```
Writer slot pushes 1–2 drafts ─▶ Writer QA ─▶ Autopilot (SUBMITTED + exact SHA-256, refill)
                                                     │ workflow_run
Review agent pushes review/* ─▶ Editorial Review QA ─┤
hourly schedule / dispatch ──────────────────────────┤
                                                     ▼
                                       Global Auto Publisher (main code only)
          scan → gates G1–G7 → ≤2 APPROVED_BY_POLICY → build + every SEO/fact gate → commit main
          → request Pages build → live HTTP QA (≤20 min) → record PASS
                                     └─ failure → git revert the publish commit + PAUSE
```

Writers never wait for publication; the publisher picks drafts up as soon as they become eligible.

## Gates

| Gate | Checks | On failure |
|---|---|---|
| G1 draft QA | strict fact guard (no unsourced amounts, NAP), structure, sources, links, ≥900 words | REJECTED → revise |
| G2 Matrix | IDEA row, new URL, not protected/held, PUBLISHED parent, immutable ledger evidence | BLOCKED / WAIT_PARENT |
| G3 sensitivity | LEGAL / SAFETY / PRICE topics, any money amount, or a hard legal claim (law/article reference, penalty, licence-class threshold) without an official or statute-text citation in the same paragraph | REVIEW_REQUIRED |
| G4 editorial | native language, duplicated paragraphs, lexical variety, keyword stuffing, ≥4 H2, contextual internal link | REJECTED |
| G5 content duplicates | L6 other drafts, L7 published articles (shingle Jaccard ≥0.45 fail, ≥0.30 warn) | REJECTED |
| G6 independent review | `factory/editorial-reviews/<ID>.json` from an AI agent session different from the writer's, bound to the draft SHA-256, all checks PASS, never claims to be human | WAIT_REVIEW |
| G7 stage | PILOT 2 per locale → RAMP 10 → CONTINUOUS; advance after 2 / 10 clean live runs; any failure pauses and resets | WAIT_STAGE |

After staging, the build runs `seo-guard --add-new` (freezes only the new URLs), then fact-guard, `build --check`, validate-plan, nav-qa, the static audit (P0), the content graph check and a sitemap inventory check. Any failure rolls back every file and pauses publication.

## Honest provenance

- Published packets keep `facts_reviewed_by_human: false` and `serp_intent_checked: false`.
- A `publication` record is added with mode `STANDING_POLICY`, the source commit and SHA-256, and the review SHA-256. It also sets `human_review: false` and `serp_validated: false`.
- The page shows a localized note saying the guide was drafted with AI assistance and published after automated checks, without human editorial review.

## Operations

```
node scripts/auto-publisher.mjs scan                    # every SUBMITTED draft and its decision (read-only)
node scripts/auto-publisher.mjs validate-reviews        # review files on a branch
node --test tests/auto-publisher.test.mjs
```

- **Pause or resume:** dispatch `auto-publisher.yml` with `action=pause|resume`. A resume needs `confirmed=true` and a reason.
- **State:** `factory/publisher/state.json` holds the stage, pause flag, published list and last successful deployment.
- **Revision queue:** `factory/publisher/report.json` lists every failed gate per draft, so writers and reviewers know what to fix.
- **Rollback:** after a live failure the workflow reverts the publish commit and pauses. To reverse a publication manually, revert its `publish(global): …` commit and freeze-registry entry in a reviewed PR. Publication never deletes or redirects URLs on its own.

## Revision loop (rejected drafts go back to the writer)

- A review can say `PASS`, `REVISE` or `FAIL`.
  - `REVISE` sets the decision to **REVISION_REQUESTED**.
  - `FAIL` sets it to **REJECTED_BY_REVIEW**.
  - Both are recorded as feedback and show up in `factory/publisher/report.json`.
- The draft's writer session fixes the issues in a **new file**: `factory/external-writers/inbox/<W>/revisions/<ID>.r2.json` (then `.r3`, and so on). The original stays byte-identical.
- A revision-only push sets `"claim_new": false` in the request file so no new topics are claimed.
- After green Writer QA, the Autopilot verifies the revision against main and checks that a REVISE/FAIL review exists for the current hash. It then:
  - moves the old hash into the claim's `revisions` history;
  - points the claim at the new file and hash (`phase: REVISED_AWAITING_REVIEW`).
- The new version needs its **own** independent review. Review files are per draft hash, `<ID>.<first 12 hex of SHA-256>.json`, so an earlier verdict can never approve a later version.

## Independent review intake

Review agents push `factory/editorial-reviews/<ID>.<sha12>.json` on a `review/<agent>-<session>` branch. Editorial Review QA validates the file, then the publisher ingests it as data on its next run. The first accepted review for a draft hash is kept and never overwritten.

```json
{
  "version": 1, "purpose": "EDITORIAL_REVIEW", "matrix_id": "NL-H01",
  "source_sha256": "<exact SUBMITTED hash from the ledger>",
  "reviewer": {"agent": "claude-subagent", "session": "review-…", "human": false},
  "reviewed_on": "2026-10-15",
  "checks": {"native_fluency": "PASS", "search_intent": "PASS", "unique_value": "PASS", "factual_accuracy": "PASS",
             "structure": "PASS", "internal_links": "PASS", "no_duplication": "PASS", "no_fabricated_business_facts": "PASS"},
  "verdict": "PASS | REVISE | FAIL",
  "issues": ["required when REVISE/FAIL"],
  "sources_checked": ["https://…"],
  "notes": "≥80 chars of concrete findings"
}
```

## Limits

GitHub Actions has no model provider. Writing and reviewing need live AI agent sessions; the publisher only decides and deploys. If no agent is active, drafts wait in WAIT_REVIEW. Nothing is published by default.
