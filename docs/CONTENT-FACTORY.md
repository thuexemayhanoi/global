# AI Content Factory · safe 2-article batches

This is a **content production contract and local QA harness**, not an active LLM API integration. The repo contains no AI API keys and does not run a paid writer automatically. The matrix's 120 IDEA entries are unresearched topic hypotheses.

### Choose the next Hub batch
```bash
node scripts/seo/content-factory.mjs plan --locale de --count 2
node scripts/seo/content-factory.mjs plan --locale en --count 2 --out reports/en-batch.json
```

Only topics with actually PUBLISHED parents are eligible. Supporting content remains blocked until the corresponding Hub is ready. Default batch size is 2; hard cap is 10.

### External AI writer workflow

1. Take a plan item and research the SERP in the article's own language, intended country and intent. Do not invent search volume, rankings or citations.
2. Gather independently verified facts with original references and verification dates. If legal or price information cannot be validated, exclude the claim.
3. Draft a new native-language article with original, human-helpful details, not a generic translation.
4. Export to JSON complying with `schemas/article-draft.schema.json`. Never put personal data, keys or unapproved content into public root directories.
5. Run the draft QA:
```bash
node scripts/seo/content-factory.mjs validate --file private-drafts/article.json
```
6. Correct failures, then have a human review citations and semantic overlap. Stage the publication changes in a PR. Do **not** update matrix to PUBLISHED until the exact HTML exists with canonical, structured data and working internal links. The existing generator does not yet render new articles, so this final publication adapter needs a separate verified implementation.

### Non-negotiable production guards

- No autonomous mass publishing, DNS edits, redirects, deletions or cross-repo actions.
- IDEA titles displayed in the menu are **not** URLs.
- Update legal/vehicle rules and pricing only with verified official or provider sources.
- Keep About/Contact publication pending until the site's editorial identity and legitimate public contact channel are approved.
