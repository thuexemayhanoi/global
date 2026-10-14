# Continuous Writer — /global (W1 / W2 / W3)

Source model: `thuexemayhanoi/vanchinh/docs/CONTINUOUS-WRITER.md`. /global keeps its **different production safety contract**: external AI writes review drafts, not public HTML. GitHub Actions validates; only owner-reviewed publication may update Matrix/site.

## Always-on *while the external AI session is active*

**DO NOT end the agent task after one successful pair, one PR update, one CI-green run or one checkpoint.** Each of W1, W2 and W3 keeps working through its assigned IDs as long as (a) the AI session and GitHub connection work, and (b) `next` has eligible items. Never claim that GitHub Actions itself runs a model or restarts expired sessions.

Continuous active-session loop:

```text
FETCH fresh origin/main + read AGENTS, Matrix, Board, claims, inbox
  → RESUME unfinished own draft / repair failed own QA
  → NEXT PAIR (exact 2 eligible IDs of assigned writer)
  → RESEARCH in the native language; WRITE original JSON to own inbox
  → LOCAL QA (verify-all + tests)
  → COMMIT / PUSH to writer/w1-* or writer/w2-* or writer/w3-* branch
  → WAIT writer-qa on that SHA; if red: repair and push, do not bypass
  → KEEP/UPDATE the same open writer draft PR; NEVER merge or publish yourself
  → FETCH origin/main; non-force merge fresh main into the writer branch
  → NEXT PAIR immediately, while session is still working
  → REPEAT
```

**Checkpoint is the last pushed writer-branch commit**, so an interruption does not discard drafts. `main` is still the canonical Matrix/approved content. If draft PR is unmerged, **continue on the same writer branch** so local inbox tracking prevents reassigning already drafted IDs. Do NOT discard the branch and restart from an unchanged `main`. Do NOT use `git reset --hard` or force push. If another process modifies the branch, stop and reconcile before proceeding.

## Commands for an AI agent with GitHub/terminal access

```bash
git fetch origin main
node scripts/continuous-writer.mjs status
node scripts/continuous-writer.mjs next --writer W1 --session w1-live --count 2
# AI writes exactly these 2 JSON article drafts, with genuine researched text.
node scripts/writer-lanes.mjs verify-all
node --test tests/external-writers.test.mjs tests/continuous-writer.test.mjs
# git add only factory/external-writers/inbox/W1/<ID>.json
# commit and push own writer/w1-* branch; check exact pushed SHA's writer-qa.yml
git fetch origin main
# If safe, merge origin/main into the same writer branch (not a reset).
node scripts/continuous-writer.mjs next --writer W1 --session w1-live --count 2
# Repeat until the returned status is no longer WRITE_NEXT_PAIR.
```

Use W2/W3 analogously. W1/W2/W3 are immutable assignment lanes (40 ideas each) across all 10 locales; never assign the same ID to two sessions or edit other writers' inboxes.

A batch is **2 drafts** except when only 1 eligible topic remains. The existing writer QA rules still require 1,000–5,000 meaningful words, >=4 H2 headings, >=2 authentic checked sources, and review flags `false`. Do not invent factual or commercial claims. A blocked QA result means **repair, not skip**.

## Return statuses

- `WRITE_NEXT_PAIR`: write selected IDs now; after green QA immediately run `next` again. A PR creation or CI-green event is NOT an instruction to stop.
- `REPAIR_DRAFT`: existing draft fails deterministic QA; repair it before more drafts.
- `WAIT_PARENT_PUBLICATION`: remaining supporting topics are blocked until their Hub parent is actually PUBLISHED. No busy waiting; resume after editorial publication is recorded.
- `WAIT_CLAIM_OR_REVIEW`: existing claims or editorial review must be reconciled. Do not take somebody else's claim.
- `AWAIT_EDITORIAL_REVIEW`: no unsubmitted eligible writing remains; review/merge is the next external step, not a license to self-approve.
- `COMPLETE`: assigned topics have truly reached PUBLISHED in the Matrix (not just a set of AI drafts).

When an external session loses network, runs out of quota or stops, there is NO background writer. Resume from its own Git branch and the latest main on the next session. Retry temporary network/CI failures with backoff; do not hot-spin or fabricate a green run.

## What is and is not automatic

- Automatic: topic ownership/next-pair selection, hard QA checks, CI on pushes to writer branches, no need to ask the user after *each draft batch*.
- Not automatic: AI prose inside GitHub Actions, merging a PR or publication, SERP/fact editorial approval, restarting disconnected agent sessions, or creating new Matrix topics.
- Preserve all 25 PUBLISHED URLs, CNAME, canonical, hreflang, robots, sitemap, assets and production branch. Existing `publish-batch.mjs` owner approval remains mandatory.

This is deliberately **an active-session writer loop**, not /vanchinh's production auto-publisher. Never misreport draft commits as live published pages.
