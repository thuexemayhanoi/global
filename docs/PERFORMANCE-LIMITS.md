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

## Future P2 work
1. Profile Node build with 1k, 10k and 40k representative actual article HTML fixtures (not only search metadata).
2. Cache normalized article index entries and regenerate only affected shards.
3. Scope internal-link QA to the currently published batch; periodically run a complete crawl.
4. Validate desktop/iPhone visual regressions and Lighthouse in production after approved deployment.
