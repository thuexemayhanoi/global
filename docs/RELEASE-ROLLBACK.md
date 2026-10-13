# Production release and rollback procedure — /global only

## Before merge
- Verify PR branch HEAD and main HEAD at the same moment; resolve competing AI changes rather than overwriting main.
- Run GitHub Static SEO QA, External Writer QA if writer files changed, content graph and SEO checks; check that CNAME is `global.rentbikehanoi.com`.
- Inspect the PR diff for URLs deleted, altered canonical/hreflang, changes to approved editorial status or accidental AI API secrets. Refuse merge on unexpected changes.
- **Do not merge without the owner's explicit separate production approval.**

## After approved merge
1. Wait for GitHub Pages `pages build and deployment` to succeed on that exact merge SHA.
2. In Actions, manually run `Post-Publish Live HTTP QA (manual, read-only)`. It compares actual live HTML for all PUBLISHED Matrix URLs, sitemap, search noindex, robots and real unknown-path 404.
3. Inspect UI at desktop 1440×900 and iPhone 390×844, including the desktop menu previously hidden by closed details. Test nested menu, TOC anchors, language switch, back-to-top, search query/locale/pagination and footer.
4. Measure LCP/INP/CLS from Lighthouse/CrUX if available. Do not mark Core Web Vitals completed from desktop screenshots.
5. Only after QA and Pages deployment do dashboards count new articles as **live**. A PR's staged PUBLISHED state is not proof of live publication.

## Rollback without force-push
1. Identify the bad merge SHA in GitHub and the last good release.
2. Create a NEW rollback branch from latest main; use `git revert <bad-merge-commit> -m 1` for a merge commit only after reviewing conflicts. Do not reset hard or force-push `main`.
3. Run full generator, static SEO and content graph QA. Ensure no unintentional deletion of user content merged since that release.
4. Open rollback PR and obtain approval; merge through normal review.
5. Wait for Pages deploy and rerun live post-publish QA; record result in checkpoint.

**Critical:** Reverting published article URLs may hurt SEO or break incoming links; get specific approval and a redirect strategy first. Prefer reverting broken layout/CSS without deleting indexed URLs. If a bad release introduced a new URL, investigate indexing before removing it. Never auto-rollback another writer's code blindly.

## State recovery
- `docs/MASTERWORK-CHECKPOINT.json` records technical PR branch and last verified SHA.
- External Writer claims are stored in `factory/external-writers/claims.json` with manually reviewed session changes.
- Never invent task completion, actual indexed pages or external AI Writer heartbeat.
