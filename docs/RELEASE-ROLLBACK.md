# Production release and rollback — /global only

Two kinds of change reach production. Their rules differ; the protections are the same.

| Change | How it reaches `main` | Approval |
|---|---|---|
| Code, workflows, docs, site generator ("technical release") | reviewed PR, green CI | per the owner's instruction for that work |
| New article URLs (standing policy) | the Auto Publisher commits directly to `main`, ≤2 per run | `approvals/standing-policy-20261015.json` + automated gates + Live QA |
| New article URLs (manual path) | reviewed PR built with `publish-batch.mjs` | exact owner approval manifest |

## Before merging a technical PR
- Compare the PR head with the latest `main`; resolve competing AI changes rather than overwriting `main`. Never force-push `main`.
- Green Static SEO QA, External Writer QA if Writer files changed, content graph and SEO checks; CNAME is `global.rentbikehanoi.com`.
- Read the diff for deleted URLs, altered canonical/hreflang, changes to published or frozen pages, NAP/prices, or accidental secrets. Refuse the merge on anything unexpected.

## After a technical merge
1. Wait for GitHub Pages `pages build and deployment` to succeed on that merge SHA.
2. Run `Post-Publish Live HTTP QA` (`post-publish-qa.yml`): every PUBLISHED URL, the sitemap index and all shards, `/search/` noindex, robots and a real 404, compared with the frozen SEO registry.
3. Optional visual checks at 1440×900 and 390×844 (menu, TOC anchors, language switch, search, footer). Do not report Core Web Vitals from screenshots.
4. Count new articles as **live** only after Pages deployment and live QA. A staged PUBLISHED state is not proof.

## Standing-policy publications (automatic)
- Every Auto Publisher run verifies its own pair with Live QA (`docs/AUTO-PUBLISHER.md`). FAIL → the workflow reverts the publish commit with a new commit and pauses; INCONCLUSIVE → it pauses without touching production; nothing resumes without a confirmed `resume` dispatch with a reason.
- If an automatic revert conflicts, the run pauses and names the commit; an operator reverts it in a reviewed PR.

## Manual rollback without force-push
1. Identify the bad commit and the last good release.
2. Create a new branch from the latest `main`; `git revert <commit>` (`-m 1` for a merge commit) after reviewing conflicts. Never reset or force-push `main`.
3. Run the generator, static SEO and content-graph QA; make sure nothing merged since that release is lost.
4. Open a rollback PR, get it reviewed, merge normally.
5. Wait for Pages and re-run live post-publish QA; record the result in `docs/GAP-MATRIX.md`.

**Critical:** removing a published article URL can hurt SEO and break links; it needs specific approval and a redirect plan. Prefer reverting broken layout/CSS over deleting indexed URLs. Never auto-rollback another writer's code blindly.

## State recovery
- `factory/external-writers/claims.json` holds Writer claims and immutable draft evidence; `factory/publisher/state.json` holds publication and live QA state.
- `docs/MASTERWORK-CHECKPOINT.json` and similar files are dated snapshots.
- Never invent task completion, indexed pages or a Writer heartbeat.
