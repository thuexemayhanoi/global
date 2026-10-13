# Safe publication pipeline (10 languages)

## Scope

The GitHub Pages site still serves the exact existing 25 URLs. The new adapter supports future articles in 10 languages, with local HTML generated only from approved article JSON packets.
No AI API is connected; an external AI writer (Claude, Mistral, ChatGPT) may prepare a draft but **may not mark it owner-approved**.

## Workflow

1. Produce an editorially researched draft JSON with `matrix_id`, `locale`, `proposed_url`, title, H1, description, original Markdown, factual references, reviewed flags and editorial notes. Save inside `private-drafts/` (gitignored).
2. Human editor checks every claim, source, intent and target URL. Require a minimum of two verified reference URLs and factual accuracy before approval. For sensitive regulations, find official current government sources. Do not fabricate prices, regulations, provider stock, ratings or reader testimonials.
3. Dry-run:
```bash
node scripts/seo/publish-batch.mjs --file private-drafts/DE-H01.json
```
4. The owner provides a separate manifest `private-drafts/approval.json` with the explicit list of approved Matrix IDs and phrase `I_APPROVE_THESE_ARTICLES`, signed off in the PR description/message. The manifest is not a cryptographic guarantee; reviewers must verify the approval.
5. On a fresh non-main branch:
```bash
node scripts/seo/publish-batch.mjs --file private-drafts/DE-H01.json --apply --approval-file private-drafts/approval.json
```
6. Verify all generated pages, canonical URLs, schema, sitemap coverage, internal links, navigation/footer, and tests:
```bash
node scripts/build.mjs --check
node scripts/seo/validate-plan.mjs
node scripts/nav-qa.mjs
node scripts/seo/audit-static.mjs --fail-p0
node --test tests/content-publisher.test.mjs
```
7. Open PR, review before merge. GitHub Actions must pass. Merging to `main` triggers GitHub Pages deployment.

A topic stays IDEA/RESEARCHED/DRAFT until an exact HTML page is generated and reviewed in a PR. The publisher will mark it PUBLISHED only when the JSON packet is staged and all local validations pass.

## Technical SEO and intent

- Each article renders an accessible H1, descriptive title/meta, Article & BreadcrumbList JSON-LD, self canonical, local links to PUBLISHED pages, an explicit References section and optional rights-verified locally stored cover image.
- Hub parent links point to the published Pillar; Supporting children must wait for a published Hub (or can be included in the same separately approved batch).
- No blind hreflang between unrelated native-language topics; actual equivalent translations require explicit mapping, review, and reciprocal links in a subsequent feature.
- Header/footer updates derive from Matrix and from existence of the generated HTML file; sitemap only lists generated public pages.
- No auto publish scheduling, no broad filesystem cleanup or deletion, no cross-repo writes.

## Rollback
Publication changes live in a separate PR branch; before merge simply close it. After merge, revert the publication commit by PR and re-run QA. Do not delete or alter published URL paths without a redirect and SEO migration plan.
