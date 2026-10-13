# Repository contract · thuexemayhanoi/global

- This repository alone serves `https://global.rentbikehanoi.com/` through GitHub Pages.
- Preserve the `CNAME` content exactly: `global.rentbikehanoi.com`.
- Do not touch `thuexemayhanoi/lab`, `/german`, WordPress, domains or DNS.
- Homepage language switcher uses real URL paths. Do not replace with JS-only translation.
- `content/locales.json` is canonical for the initial locale pages. Regenerate with `node scripts/build.mjs` and confirm `node scripts/build.mjs --check`.
- Maintain self-canonical, correct `lang`, equivalent-only hreflang, descriptive metadata, schema, breadcrumbs and sitemap coverage.
- No invented prices, local premises, reviews, licence rules, or statements of service availability.
- No unreviewed mass auto-publishing. Add researched topic/keyword matrix, scoped QA and safe batch publishing before scaling.
- Do not remove or rename a live URL without a redirect/SEO plan.

## Phase 2 matrix rules

- Read `docs/MULTILINGUAL-SEO-MATRIX.md`, `data/seo/taxonomy.json`, and `data/seo/master-matrix.json` before any topic expansion.
- `IDEA` is merely a keyword hypothesis. Do not render it as a page or reference it in a sitemap/navigation/hreflang.
- Run `node scripts/seo/validate-plan.mjs` after changes to the matrix or deployment files; run `node scripts/seo/writer-queue.mjs --locale de --count 2` for a **read-only** research queue.
- First publish pilots must be separately approved and verified before enabling a recurring writer. Never silently publish proposed topics.

## Full Menu & Footer (approved)

- `scripts/navigation.mjs` is the single source of rendered site-wide menus and footers; `data/seo/master-matrix.json` is the taxonomy source.
- All 4 parent Hub labels and 8 child topic labels per locale are displayed, but IDEA rows must NOT be clickable or placed in sitemap/hreflang. This owner-approved preview only displays category names until their actual pages are approved and published.
- After adding published content or changing Matrix, run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node scripts/nav-qa.mjs`.
- Preserve CNAME and all 25 URLs; do not overwrite unrelated repositories.

## Five-weapon governance

- Run `node scripts/seo/engine.mjs --locale de --count 2` for Audit→Matrix→QA→Report. It must only write gitignored reports, never site content or production settings.
- Never infer actual rankings, Google indexation, backlinks, AI citations or search volume from static audit outputs.
- AI Writer is currently a native-language research/QA scaffold without API connection; no auto-publishing.
- Protect CNAME, published URLs and other repos; propose fixes through QA-reviewed PRs.

## Publishing adapter contract

- `content/articles/<MATRIX-ID>.json` is a source-of-truth for articles the owner has explicitly approved in a reviewed branch/PR. It must correspond 1:1 with a Matrix row marked PUBLISHED.
- `scripts/seo/publish-batch.mjs` defaults to dry-run. --apply must require an exact owner approval manifest, a non-main work branch, complete editorial QA, and must not replace an existing live page.
- Run `node --test tests/content-publisher.test.mjs` and `node scripts/build.mjs --check` in CI.
- Do not auto-generate AI text, approve articles on the owner's behalf, or modify production DNS/CNAME/other repositories.

## External three-Writer manual protocol (source /total, adapted /global)

- Actual /total production pattern at the time of reference: **1 external Writer + 2 supervisors**. /global now uses **3 exclusive external writer lanes** W1/W2/W3 for simultaneous human-operated AI applications.
- The Writer Board is `factory/external-writers/assignments.json`, validated against SEO Matrix. Never reassign existing IDs without explicit coordinator migration.
- Run `node scripts/writer-lanes.mjs pack --writer W1 --count 2` for a bounded read-only work pack. Use W2/W3 analogously.
- External Writer can only add `factory/external-writers/inbox/<W>/<ID>.json` on its own feature branch and submit PR. No direct Matrix edits, no generated HTML or public-site changes.
- Writer must keep human review flags false, 1,000–5,000 words and four meaningful H2. Static CI verifies drafted content but does not assert facts are true.
- No API, no LLM running in GitHub Actions, no autonomous publish or background model. Coordinator moves genuinely reviewed/approved content through existing `scripts/seo/publish-batch.mjs`, as a separate PR.
- Do not copy `/total`'s auto-publish-on-main behavior into `/global`; it could bypass human approval. Never edit /total.
