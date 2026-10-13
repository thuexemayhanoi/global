# Vietnam Two-Wheel Guide · Global

Production website: https://global.rentbikehanoi.com/

GitHub Pages repository: https://github.com/thuexemayhanoi/global

## Architecture

One GitHub Pages site with ten locale directories: `/vi/`, `/en/`, `/de/`, `/fr/`, `/es/`, `/nl/`, `/zh/`, `/pt/`, `/ko/`, `/ja/`.
Each locale has an independently indexable homepage and a structured rental checklist. Pages use server-rendered static HTML; a language switcher links to actual HTML, not client-side translation.

## Regenerate and verify

- `node scripts/build.mjs` regenerates HTML, CSS-independent routes, robots and sitemap from `content/locales.json`.
- `node scripts/build.mjs --check` validates generated outputs without changing files (also runs on GitHub Actions).
- Generated HTML is committed in the repository root for existing GitHub Pages branch deployment; do not change Pages source without a separately reviewed migration.

## SEO policy

- Each URL has one search intent and an explicit locale.
- Locale homepages and corresponding checklist pages use self canonical + hreflang equivalents.
- For *new, genuinely distinct topics*, do not add hreflang unless equivalent pages actually exist.
- Update the sitemap only for real published pages; never publish empty category stubs.
- Use independently researched content, no speculative prices, legal claims, reviews, availability or business details.
- Protect `CNAME` (global.rentbikehanoi.com) and existing URLs. Never import or overwrite WordPress or /lab projects.

Pilot stage: 10 localized overviews and 10 localized practical checklists. Broader hub/silo clusters will be added incrementally only with useful content and QA.

## Phase 2 — multilingual SEO Master Matrix

The planning inventory covers all 25 current public URLs and 120 non-published native-language topic candidates across 10 locales. `IDEA` items are **not** generated pages or verified search-demand opportunities. See [Multilingual SEO Matrix](docs/MULTILINGUAL-SEO-MATRIX.md).

```sh
node scripts/seo/validate-plan.mjs
node scripts/seo/writer-queue.mjs --locale de --count 2
```

All new content awaits research, intent validation, QA and a separate publishing decision. This commit does not modify the sitemap or create new public pages.

## Full synchronized navigation

The shared `scripts/navigation.mjs` renders responsive 4-Hub menus and 8 Supporting topics for every locale, with footer taxonomy generated from the same Matrix. Nonpublished topics are labeled coming soon without creating broken URLs. The menu is a dropdown on desktop and an accordion drawer on mobile. Use `node scripts/build.mjs` then `node scripts/build.mjs --check` and `node scripts/nav-qa.mjs`.

## Five SEO tools

Read [Five SEO weapons](docs/FIVE-SEO-WEAPONS.md). Run `node scripts/seo/engine.mjs --locale de --count 2` for read-only auditing, QA, a research queue and P0–P3 report. No article writing APIs or auto-publishing are enabled.

## Publishing actual articles (pilot)
The `scripts/articles.mjs` adapter generates localized static article pages from approved, source-backed packets in `content/articles/`. No AI provider or API key is connected. The `scripts/seo/publish-batch.mjs` command performs a strict dry-run by default and only stages content on a non-main branch after an owner approval manifest; a reviewed PR merge triggers GitHub Pages publication.

See [Content Factory](docs/CONTENT-FACTORY.md) and [Batch Publishing](docs/BATCH-PUBLISHING.md).

## Three external AI Writers — no API

The /total-inspired manual writer lanes are documented in [Three External Writers](factory/external-writers/README.md). Fixed W1/W2/W3 assignments cover the currently planned Hub and Supporting IDs without duplicates. Generate a bounded copy/pasteable brief using `node scripts/writer-lanes.mjs pack --writer W1 --count 2` or GitHub Actions → **Manual Writer Pack**. A separate read-only Writer Draft QA verifies incoming JSON through PRs. No external model is invoked or auto-published; the editorial/publisher approval process stays intact.
