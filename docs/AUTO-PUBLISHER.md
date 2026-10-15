# Global Auto Publisher

The Auto Publisher turns SUBMITTED Writer drafts into **new** live URLs without a per-article owner click. It acts only under `approvals/standing-policy-20261015.json` and only when automated QA and all safety/SEO gates pass. The owner retired the mandatory independent AI Reviewer on 2026-10-15; W1/W2/W3 remain concurrent Writers. It never deletes, renames or redirects a URL, and never edits NAP, prices, business schema, or a PUBLISHED, frozen or protected page.

## Loop: write 2 → QA → publish 2 → live QA → repeat

```
Writer slot pushes 1–2 drafts ─▶ Writer QA ─▶ Autopilot (SUBMITTED + exact SHA-256, refill)
                                                     │ workflow_run
hourly schedule / dispatch ──────────────────────────┤
                                                     ▼
                                       Global Auto Publisher (main code only)
          scan → gates G1–G5 + G7 → ≤2 APPROVED_BY_POLICY → build + every SEO/fact gate → commit main
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
| G7 stage | PILOT 2 per locale → RAMP 10 → CONTINUOUS; advance after 2 / 10 clean live runs; any failure pauses and resets | WAIT_STAGE |

After staging, the build runs `seo-guard --add-new` (freezes only the new URLs), then fact-guard, `build --check`, validate-plan, nav-qa, the static audit (P0), the content graph check and a sitemap inventory check. Any failure rolls back every file and pauses publication.

## Honest provenance

- Published packets keep `facts_reviewed_by_human: false` and `serp_intent_checked: false`.
- A `publication` record is added with mode `STANDING_POLICY`, the source commit and SHA-256, `qa_mode: AUTOMATED_G1_G5_G7`, and `review_sha256: null`. It also sets `human_review: false` and `serp_validated: false`.
- The page shows a localized note saying the guide was drafted with AI assistance and published after automated checks, without human editorial review.

## Operations

```
node scripts/auto-publisher.mjs scan                    # every SUBMITTED draft and its decision (read-only)
node --test tests/auto-publisher.test.mjs
```

- **Pause or resume:** dispatch `auto-publisher.yml` with `action=pause|resume`. A resume needs `confirmed=true` and a reason.
- **State:** `factory/publisher/state.json` holds the stage, pause flag, published list and last successful deployment.
- **Revision queue:** `factory/publisher/report.json` lists every failed gate per draft, so the responsible Writer knows what to fix. Sensitive/price/legal topics remain held for qualified factual review.
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

## Owner-approved automatic QA (without an AI Reviewer)

The workflow never requires a second AI session. A Writer publishes a draft to its immutable SUBMITTED ledger, then the publisher checks G1 (strict draft QA), G2 (Matrix, parent and URL protection), G3 (legal/safety/price claims and official citations), G4 (editorial language, structure and internal links), G5 (L6/L7 duplicates), and G7 (safe stage caps). It publishes **only eligible** drafts and runs build, fact/SEO guards, sitemap validation, deploy, live HTTP QA and rollback protections.

LEGAL / SAFETY / PRICE topics and any unsourced sensitive money or hard legal claims are **not automatically publishable**, even if the owner requests publication of the entire backlog. Do not impersonate human fact review. Historical independent reviewer helpers may still exist as inert compatibility code; the G6 requirement and its workflow trigger are retired.
