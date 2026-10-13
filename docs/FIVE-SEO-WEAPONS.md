# Five SEO weapons — global.rentbikehanoi.com
**Current snapshot:** 10 languages, 25 published URLs, 120 unverified IDEA rows in SEO Matrix.

| Weapon | Delivered | Next dependency |
|---|---|---|
| 01 Master Blog Builder | Home, locale guides, published FAQ sections, privacy, terms, 4 Hub / 8 Support structure per language, responsive menu/footer | About/Contact need verified editorial identity + contact channel; Hub articles need independent research |
| 02 SEO Audit Matrix A-Z | Static repository audits for canonical, HTML, sitemap, schema, internal links, keyword duplicates and P0–P3 prioritized findings | Real SERP/GSC/CWV/backlinks require connected sources and actual monitoring |
| 03 AI Content Factory | 2-article read-only planning queue, draft contract + human fact check, source QA, duplicate and internal link guards | LLM/API writer and HTML publication adapter not yet enabled; no mass publication |
| 04 AI Search Optimizer | Source-visible FAQ, schema, entity/answer summaries structural audit, reference gap checks | No claimed AI citation or ranking until empirically verified |
| 05 Autonomous SEO Engineer | Audit -> Matrix -> QA -> Report on GitHub CI, no production modifications | Automated fixes only through reviewed PR, separate authorization |

## Safe commands
```bash
node scripts/seo/engine.mjs --locale de --count 2
node scripts/seo/audit-static.mjs --out reports/technical-audit.json --fail-p0
node scripts/seo/audit-ai-search.mjs --out reports/ai-search-audit.json
node scripts/seo/content-factory.mjs plan --locale en --count 2
node scripts/seo/content-factory.mjs validate --file private-drafts/article.json
```

**Protection:** No automatic writer, URL changes, deletion, DNS changes, CNAME changes, or unreviewed publishing. All IDEA URL slugs remain provisional until validated. Reports stay as ephemeral workflow artifacts or local ignored files.
