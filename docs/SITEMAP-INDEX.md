# Multilingual sitemap index — production contract

Repository: thuexemayhanoi/global | Domain: https://global.rentbikehanoi.com/

## Entry point

- Submit **only** https://global.rentbikehanoi.com/sitemap.xml to Google Search Console.
- robots.txt advertises that same URL; it remains crawl-allowed.
- sitemap.xml is a **sitemapindex**, not a flat URL set.
- sitemap-main.xml holds root + site-wide utilities (/about/, /contact/, /privacy/, /terms/).
- sitemap-vi.xml, sitemap-en.xml, sitemap-de.xml, sitemap-fr.xml, sitemap-es.xml, sitemap-nl.xml, sitemap-zh.xml, sitemap-pt.xml, sitemap-ko.xml, sitemap-ja.xml hold PUBLISHED URLs in each locale.
- When any language exceeds 40,000 URLs or 40 MiB uncompressed, the generator creates sitemap-<locale>-2.xml (and numbered additional shards as needed). All shards appear in the root index.
- No speculative lastmod values; add lastmod only if a true content-modification source becomes available.
- HTML hreflang continues to describe genuinely equivalent pages. A split by locale does NOT mean every page has a cross-language equivalent, and does not require speculative hreflang in XML.

## Single source of truth

Do not edit generated XML by hand. scripts/build.mjs assembles only actual approved/generated index.html URLs, explicitly excludes the /search/ noindex utility, and calls scripts/sitemaps.mjs. IDEA, unapproved Writer drafts and unbuilt URLs never enter the index.

Every owner-approved publication through scripts/seo/publish-batch.mjs already runs scripts/build.mjs, refreshing the correct locale shard, index and robots.txt without any extra manual steps. GitHub Pages serves generated files after the reviewed PR is merged.

## QA

Run:
\`\`\`sh
node scripts/build.mjs
node scripts/build.mjs --check
node --test tests/sitemaps.test.mjs tests/premium.test.mjs tests/post-publish.test.mjs
node scripts/seo/validate-plan.mjs
node scripts/seo/audit-static.mjs --fail-p0
\`\`\`

Local validation checks every shard path and file, sorted/unique URLs, correct language ownership, size limits, actual published inventory and no stray indexable IDEA. The builder detects/removes stale generated shards after shrink or move. After a production deployment, use manual post-publish-qa.yml to check HTTP 200 for the root index and every shard against the reviewed Matrix; every Auto Publisher run performs the same live inventory check for its new URLs.

Live readers (`post-publish-qa.mjs`, the Auto Publisher's Live QA) go through `fetchSitemapInventory()` in `scripts/sitemaps.mjs`: child names from the index (`sitemap-main.xml`, `sitemap-<ll>.xml`, `sitemap-<ll>-<n>.xml`, one grammar in `SITEMAP_CHILD`) are turned into absolute same-origin URLs by `sitemapChildURL()`, which refuses traversal, other hosts, queries and encoded names. Requests carry a `?qa=` cache-buster so the CDN cannot hide a fresh deploy. Never pass a bare child name to `fetch()`: that is the defect behind Actions run 38668639207 (`tests/live-qa.test.mjs`).

## Limits

A sitemap is a discovery signal, **not** a guarantee of indexing, rankings or bot visitation. Search Console requires property verification and explicit submission by the property owner; this repository does not control Search Console. Publishing or revising a sitemap does not authorize unsupervised article publication, changed URLs or new keyword IDs.
