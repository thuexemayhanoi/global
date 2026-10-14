# Performance & scalability benchmark — scope and limits

## Current platform
- GitHub Pages root-deployed static HTML, 10 locale directories. Build uses Node 22 and generates complete site on each run (`scripts/build.mjs`), so overall build time grows **linearly with all published articles**.
- CSS and JS are local files and system fonts only; no Google Fonts, trackers, paid APIs or AI model requests in front-end.
- Search is a client-side progressive enhancement and loads **only the chosen language's metadata shards** when the user submits a query. Each shard is capped at **150 short metadata records**, not article text.
- Search results paginate at 12; no full 40k article bodies are bundled into the initial page.
- Mobile footer suppresses unpublished child labels because they are accessible in the full mobile menu.

## Reproducible metadata benchmark
```sh
node scripts/bench/search-scale.mjs
```
This synthesizes 10k and 40k short title/description entries over 10 locales, times the local JSON sharding, counts shards and byte sizes. **It does not prove** production can compile, store or serve 40k complete long-form articles efficiently.

## Known scale limits
- As the number of published documents climbs above several thousand per language, scanning every metadata shard on each search can grow costly. Introduce a locale-specific inverted keyword/prefix index before very large scale.
- Full-site regeneration on every content batch is O(N), suitable for present small scale but not yet tested with a 40k-page fixture. A separate incremental build/cache design and benchmark will be required before claiming 40k readiness.
- Browser Core Web Vitals depend on device/network and must be measured on production using Lighthouse/CrUX/real-user data. This repository contains no credible LCP, INP or CLS field dataset.
- GitHub Pages bandwidth/build/storage limits and caching are service-specific; do not promise unlimited traffic, no failover or instant cache invalidation.
- The new premium design's page weight should be audited after owner-approved deployment, without mistaking pre-merge branch QA for real live user experience.

## Full-pipeline benchmark (2026-10-14, Node 22, synthetic articles)

`node scripts/bench/full-build-scale.mjs --articles N` copies the repository to a temporary directory, publishes N synthetic articles there (all 40 Hubs plus Supporting guides, IDs past XX-S100), then times the real build and every SEO gate. The working tree is never modified. CI runs N=300 on every PR.

| Step | 400 articles (425 URLs) | 2,000 articles (2,025 URLs) | 10,000 articles (10,025 URLs) |
|---|---|---|---|
| build | 1.7 s | 9.0 s | 83.5 s |
| build --check | 1.5 s | 8.4 s | 68.7 s |
| seo-guard --add-new / check | 0.6 / 0.7 s | 3.0 / 2.6 s | 12.3 / 12.1 s |
| fact-guard | 2.5 s | 10.6 s | 51.5 s |
| content-graph --write | 1.7 s | 5.8 s | 57.0 s |
| validate-plan | 0.5 s | 0.2 s | 0.65 s |
| nav-qa / topical validate / audit-static | 0.1 / 0.6 / 0.2 s | 0.1 / 0.3 / 0.9 s | 0.2 / 1.3 / 5.2 s |
| content-graph.json / url-freeze.json | 2.4 MB / 0.4 MB | 3.3 MB / 1.8 MB | 14.8 MB / 8.9 MB |

Defects this benchmark found and fixed before any article went live:
- Published Hub pages did not link their Supporting guides, so most guides were orphans. Hubs now list every published child by silo, and guides link up to 6 siblings.
- Article and inbox IDs were limited to two digits, which capped each locale at 99 Supporting guides. IDs now allow 2–4 digits.
- Overlap checks were O(n²): at 2,000 articles `validate-plan` took 7.3 s and the graph build 16.8 s. They now use prefix-filtered all-pairs similarity.
- The content graph reached 31 MB at 2,000 articles because of pair lists and per-link edges. Lists are now capped, link edges are replaced by counts, and arrays are compact.

All gates pass at 10,000 articles. Build and graph time grow faster than linear between 2,000 and 10,000 articles. The cause is per-page lookups that scan every Matrix row (related links, Hub child lists, graph link targets). Index rows by locale/parent before going much beyond 10,000 URLs; 40,000 is not yet proven.

Sharding trigger: `url-freeze.json` (~0.9 KB per URL) and `content-graph.json` (~1.6 KB per URL) should be split per locale before ~10,000 published URLs. CI fails if the graph exceeds 25 MB.

## Future P2 work
1. Profile Node build with 1k, 10k and 40k representative actual article HTML fixtures (not only search metadata).
2. Cache normalized article index entries and regenerate only affected shards.
3. Scope internal-link QA to the currently published batch; periodically run a complete crawl.
4. Validate desktop/iPhone visual regressions and Lighthouse in production after approved deployment.
