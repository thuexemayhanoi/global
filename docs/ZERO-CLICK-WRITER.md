# ZERO-CLICK CONTINUOUS WRITER — /global

**One user instruction starts the Writer session. NO GitHub Actions Run workflow clicks per batch.**

Source: thuexemayhanoi/global. This is for outside AI assistants with GitHub/terminal access. GitHub Actions coordinates draft IDs but does NOT call an AI model or publish articles.

## One-time session activation (per Writer branch)
- Use W1 alone for all eligible IDs, or launch independent W2/W3. Each Writer has its own stable branch, session and inbox. Existing W1 must use branch writer/w1-vibe-20261014 and session w1-vibe-20261014, preserving 14 existing drafts on PR #17.
- Fetch/merge latest origin/main into your Writer branch (NO force reset). Example branch writer/w1-vibe-20261014 must be current before start.
- Run: node scripts/writer-request.mjs start --writer W1 --session w1-vibe-20261014 --branch writer/w1-vibe-20261014
- Commit and push ONLY the newly created factory/external-writers/requests/W1/w1-vibe-20261014.json.
- This push runs External Writer Draft QA. When it succeeds, Global Dynamic Writer Autopilot automatically reserves two Hub ideas centrally in main/claims.json. **Do not press Run workflow.**
- On a new Writer branch, create a draft PR to main once after the first Writer draft batch. Keep updating the same PR; no repeated PR creation.
- If the GitHub repo is configured to deny GITHUB_TOKEN write, the automated coordinator will FAIL and report a permissions blocker; do not fabricate confirmed claims.

## Uninterrupted writing loop (as long as your external AI session is alive)
1. Wait for green Writer Draft QA and green Global Dynamic Writer Autopilot **from the push**.
2. Fetch and merge origin/main safely. Confirm current pair using:
   node scripts/continuous-writer.mjs assigned --writer W1 --session w1-vibe-20261014 --branch writer/w1-vibe-20261014
3. Only write the 1–2 confirmed IDs to factory/external-writers/inbox/W1/<ID>.json; use original native-language content, >=1000 validator words, >=4 H2 sections, genuine researched sources, and facts_reviewed_by_human=false / serp_intent_checked=false.
4. Run node scripts/writer-lanes.mjs verify-all and node --test tests/external-writers.test.mjs tests/continuous-writer.test.mjs tests/writer-pool.test.mjs tests/writer-pool-auto.test.mjs.
5. Commit/push ONLY your own inbox JSON to SAME branch. Keep/update one open Writer draft PR (not production PR). **Writer Draft QA PASS automatically triggers Autopilot to submit this pair and claim next eligible pair in one atomic main-ledger commit.** No manual Run click.
6. Wait Autopilot SUCCESS; fetch/merge main; immediately return to step 2. Don't stop after two drafts, CI green or a push.
7. On flaky network/CI red, repair/retry and refresh main rather than guessing ownership or writing duplicates. If an outdated push's CI completes after newer changes, autopilot ignores it.
8. After Hub drafts, continue automatically with Supporting DRAFTS, even if Hub is still awaiting editorial publication. Do NOT add unpublished Hub links. The separately reviewed PUBLISHER still requires a PUBLISHED parent Hub before any Supporting URL goes live.

## Exactly what is automatic
- A successful QA push on an opted-in Writer branch triggers an automatic serialized GitHub workflow_run with repository-owned write permissions. It reads Writer branch content as DATA (never executes branch code).
- New request push -> shared claim of 2.
- Green 2-draft push + open Writer PR -> validate actual remote JSON -> SUBMITTED claim(s) -> claim next pair on main.
- Requests and protected drafts remain unavailable to other Writers. There is no silent timeout or lease stealing; W2/W3 can claim from same queue safely.
- 14 W1 drafts from PR #17 and EN-H01/DE-H01 from editorial PR #5 / publication PR #6 are permanently excluded while pending review.
- Legacy manual Global Dynamic Writer Pool workflow remains available as recovery but is NOT part of normal Writer loop.

## What still needs external/human action
- An external AI must actually stay active, call git/connector and write prose; GitHub Actions does not generate text. Chat quota or connectivity may end the session.
- Writer must create an open PR once to allow safe automatic SUBMITTED transitions; editor keeps reviewing that PR. If Writer forgot PR, create it and push a new commit; no manual GitHub Actions button needed.
- All live publication stays subject to true factual/editorial approval, owner manifest and separate protected publisher. No auto merge or publication, no change to site URL, SEO, CNAME, sitemap, WordPress or unrelated repositories.
- Claim counters measure **drafts**, not published pages. Never tell the user 120 articles are live merely because Writer generated drafts.

## Status or fallback
- CI logs: External Writer Draft QA (read-only), then Global Dynamic Writer Autopilot.
- CLI: node scripts/writer-pool.mjs status
- Confirm: node scripts/continuous-writer.mjs assigned --writer W1 --session w1-vibe-20261014 --branch writer/w1-vibe-20261014
- If no eligible draft item remains, stop the tight loop and report AWAIT_EDITORIAL_REVIEW. Never fabricate a success or spin indefinitely.
