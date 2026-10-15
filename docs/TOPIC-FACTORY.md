# Topic Factory 10K

The Topic Factory keeps the shared Writer queue supplied with researched, non-duplicate topics. Its planning ceiling is 1,000 Hub and Supporting articles per locale (10,000 in total). That is a ceiling, not a quota: a locale only grows while there are genuinely distinct search intents.

## Pipeline

```
AI research agent ──push research/*──▶ Topic Research QA (read-only)
        │                                   │ green
        ▼                                   ▼
factory/topic-research/batches/*.json   Global Topic Factory (main code only)
                                            ├─ ingest  → data/seo/topical-authority/<locale>.json  (PROPOSED, TA IDs)
                                            ├─ refill  → Matrix IDEA rows (standing policy, ≤50 per run)
                                            └─ dashboard → docs/CONTENT-FACTORY-DASHBOARD.md
                                                       ▼
                                   Shared Writer Pool (W1/W2/W3 claim from IDEA)
```

It runs every six hours, on manual dispatch, and after every green research push. Each run commits only factory data with a compare-and-swap push to `main` (three retries, never a force-push). Any change outside its path allowlist stops the run.

## Refill rule (per locale)

| Condition | Action |
|---|---|
| READY (claimable IDEA) ≥ 100 | `HEALTHY` – nothing promoted |
| READY < 100 and validated PROPOSED candidates exist | promote up to `min(250 − READY, remaining to 1000)`, balanced round-robin across locales, ≤50 per run |
| READY < 100 and no eligible candidates | `RESEARCH_NEEDED` – listed on the dashboard for research agents |
| accepted = 1000 | `TARGET_REACHED` |

## Gates

- **T1–T10:** identity, hierarchy, URL, query/cannibalization, reserved intents, title, claims, research inputs, governance, localization (`scripts/seo/topical-authority-core.mjs`).
- **F1–F8:** topical gates clean, existing same-locale Hub parent, one of the 8 owner-approved domains, no transactional rental intent, duplicate layers, per-locale target, research inputs, governance flags (`scripts/topic-factory-core.mjs`).
- **Duplicate layers:**
  - L1 exact keyword
  - L2 diacritic-folded keyword
  - L3 intent-token overlap ≥0.66
  - L4 title trigram ≥0.85
  - L5 topic signature ≥0.6

  L5 is lexical, because no embedding model is connected, and it is reported as such. A `distinct_from` reason of at least 40 characters can only excuse L3–L5. Draft and published-content similarity (L6/L7) runs in the Auto Publisher. Cross-URL cannibalization (L8) runs in `validate-plan` and the content graph.

## Approval

Promotion uses `approvals/standing-policy-20261015.json`, which records the owner's 2026-10-15 instruction. Each run writes a machine manifest to `approvals/auto/topic-promotion-NNNN.json` with `approval_mode: STANDING_POLICY`. The manifest names the policy and never impersonates a personal owner approval.

Each run also appends to `data/seo/topic-factory/promotion-log.json`. **All eight domains now accept research batches.** Six `RESEARCH_OPEN` domains without an existing Hub ingest into locale maps as `ARCHITECTURE_BLOCKED`; they are **not** Matrix IDEA rows, cannot be claimed by Writers, and cannot publish. A reviewed architecture PR (with at least eight unique validated Supporting candidates for each new Hub, appropriate locale Hub mapping, and passing URL/SEO/build checks) is required before a new Hub and its Supporting topics are promoted.

### Mistral — research for all six newly open domains

Push sequential JSON batches of 25–50 (or fewer for final partial batch) on `research/mistral-<session>`, under `factory/topic-research/batches/`. For a proposed Hub specify `parent_id:null`, its `domain_id`, and an allowed proposed-Hub `subcluster` from `data/seo/topical-authority/architecture.json`. Existing Hubs continue to specify their real same-locale parent IDs. QA and ingest create unique TA IDs, keep research references, and record these six domains as `ARCHITECTURE_BLOCKED` until their real Hub PR passes. Do not mark blocked candidates READY, invent existing Hub IDs, or add unpublished URLs to sitemap.

## Commands

```
node scripts/topic-factory.mjs status [--json] [--markdown docs/CONTENT-FACTORY-DASHBOARD.md]
node scripts/topic-factory.mjs validate-batches       # cumulative dry run across all branch batch files
node scripts/topic-factory.mjs validate-batch --file factory/topic-research/batches/<file>.json
node scripts/topic-factory.mjs refill                    # dry run
node scripts/topic-factory.mjs refill --apply --local    # rehearsal on a clean non-main branch
node --test tests/topic-factory.test.mjs
```

The dashboard (`docs/CONTENT-FACTORY-DASHBOARD.md`) is regenerated from data by this workflow and by every Auto Publisher run. Besides topic counts it shows every SUBMITTED draft in exactly one publication-queue state (AWAITING QA, APPROVED_BY_POLICY, REPAIR, HUMAN_REVIEW_REQUIRED, WAIT_PARENT, WAIT_STAGE, ESCALATED, BLOCKED), the publisher's live states (PUBLISH_STAGED, LIVE_QA_PASS/FAIL/INCONCLUSIVE) and the Writer slot states. Never edit it by hand.

## Honest limits

The factory cannot research by itself. GitHub Actions has no model provider, so new topics only arrive when an AI agent with web access pushes a research batch. `validate-batches` is a cumulative dry run: research files are validated against prior accepted files and the 1,000-per-locale research+Matrix planning cap before any merge, without fabricating topics or writing state.

Keyword evidence stays `NOT_VALIDATED` until real market or SERP data is attached. The factory never infers search volume, rankings or traffic.
