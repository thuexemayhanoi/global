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
