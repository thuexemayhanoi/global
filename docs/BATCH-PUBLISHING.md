# Manual Publisher — owner-manifest path (10 languages)

> **Status (2026-10-15):** this is the **MANUAL PATH**. The current default is the standing-policy Auto Publisher (`docs/AUTO-PUBLISHER.md`), which publishes drafts that pass automated QA two per run with Live QA. Use this manual path for content the owner wants to approve explicitly in a reviewed PR (for example the protected EN-H01/DE-H01 pilots of PR #6) or for anything the Auto Publisher holds for a human.

## Scope

Static article pages are generated only from article JSON packets in `content/articles/`, each 1:1 with a PUBLISHED Matrix row. No AI API is connected; an external AI Writer may prepare a draft but **may not mark it owner-approved**.

## Workflow

1. Prepare an editorially researched draft JSON with `matrix_id`, `locale`, `proposed_url`, title, H1, description, original Markdown, references, review flags and editorial notes. Keep it in `private-drafts/` (gitignored).
2. A human editor checks every claim, source, intent and the target URL: at least two verified references; official current sources for regulations. Never fabricate prices, regulations, stock, ratings or testimonials.
3. Dry-run:
```bash
node scripts/seo/publish-batch.mjs --file private-drafts/DE-H01.json
```
4. The owner provides `private-drafts/approval.json` listing the approved Matrix IDs with the phrase `I_APPROVE_THESE_ARTICLES`, confirmed in the PR. The manifest is not a cryptographic guarantee; reviewers verify the approval.
5. On a fresh non-main branch:
```bash
node scripts/seo/publish-batch.mjs --file private-drafts/DE-H01.json --apply --approval-file private-drafts/approval.json
```
6. Verify pages, canonical URLs, schema, sitemap coverage, internal links, navigation/footer and tests:
```bash
node scripts/build.mjs --check
node scripts/seo/validate-plan.mjs
node scripts/nav-qa.mjs
node scripts/seo/audit-static.mjs --fail-p0
node --test tests/content-publisher.test.mjs
```
7. Open a PR; GitHub Actions must pass and the owner reviews before merge. Merging to `main` triggers GitHub Pages; then run `post-publish-qa.yml`.

`publish-batch --apply` also runs `seo-guard --add-new` (freezes only the new URLs) and the strict fact guard, and restores the registry on failure.

## Technical SEO and intent

- Each article renders an accessible H1, descriptive title/meta, Article & BreadcrumbList JSON-LD, self canonical, links to PUBLISHED pages only, a References section and an optional rights-verified local cover image.
- Hub parent links point to the published Pillar; Supporting children wait for a published Hub (or are included in the same approved batch).
- No blind hreflang between unrelated native-language topics; real translations need explicit mapping, review and reciprocal links.
- Header/footer derive from the Matrix and from the generated HTML; sitemaps list generated public pages only.
- No scheduling, broad cleanup, deletion or cross-repo writes from this path.

## Rollback
Before merge, close the PR. After merge, revert the publication commit through a PR and re-run QA. Do not delete or move a published URL without a redirect and SEO migration plan.
