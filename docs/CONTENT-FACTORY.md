# AI Content Factory — local planning and draft QA harness

> **Status (2026-10-15):** this page describes the original planning/QA harness (`scripts/seo/content-factory.mjs`) from before the standing policy. It is still valid as a local tool. The production pipeline (W1/W2/W3 → Writer QA → repair queue → Auto Publisher → Live QA) is in `docs/CURRENT-WORKFLOW.md`. Corrections: the Matrix now holds more than the original 120 IDEA rows (counts are derived, never fixed), and published articles are rendered by `scripts/articles.mjs` (the "adapter not implemented yet" note of the first version is obsolete).

This is a content production contract and a local QA harness, not an LLM integration. The repository contains no AI API keys and never runs a paid or self-hosted model. IDEA entries are unresearched topic hypotheses until a Writer researches them.

### Choose a batch (read-only)
```bash
node scripts/seo/content-factory.mjs plan --locale de --count 2
node scripts/seo/content-factory.mjs plan --locale en --count 2 --out reports/en-batch.json
```

Only topics with PUBLISHED parents are offered. Supporting content waits for its Hub. Default batch size is 2; hard cap is 10.

### External AI writer workflow

1. Research the SERP in the article's own language, intended country and intent. Do not invent search volume, rankings or citations.
2. Gather independently verified facts with original references and check dates. If legal or price information cannot be validated, leave the claim out.
3. Write a new native-language article with original, useful detail, not a translation.
4. Export JSON that follows `schemas/article-draft.schema.json`. Never put personal data, keys or unapproved content into public directories.
5. Local draft QA:
```bash
node scripts/seo/content-factory.mjs validate --file private-drafts/article.json
```
6. In production, drafts enter through a Writer slot and Writer QA (`docs/CURRENT-WORKFLOW.md`); the Auto Publisher decides publication with automated QA, or the owner uses the manual path (`docs/BATCH-PUBLISHING.md`). A Matrix row becomes PUBLISHED only together with its generated HTML, canonical, structured data and working internal links.

### Non-negotiable production guards

- No unreviewed mass publishing, DNS edits, redirects, deletions or cross-repo actions. The Auto Publisher is limited to 2 NEW URLs per run behind every gate.
- IDEA titles displayed in the menu are **not** URLs.
- Legal/vehicle rules and prices change only with verified official or provider sources; such topics stay held for a human.
- About/Contact and business details follow `data/business/reference.json` and its publication flags.
