# SEO V10 — native-language title & meta review queue (ZERO-DATA)

Repository: `thuexemayhanoi/global` · production `https://global.rentbikehanoi.com`.

This folder contains **editorial proposals only**. No published article packet, SEO freeze record, generated HTML, Google Search Console data, or live business information is modified by this work.

## First reviewed-source batch

- `meta-vi.json`, `meta-en.json`, `meta-de.json`, `meta-fr.json`, `meta-es.json`, `meta-nl.json`, `meta-pt.json`: 7 records each, **49 articles**.
- Proposed titles: only where existing title length exceeds the current *repository's editorial review threshold* of 60 characters; otherwise `null`.
- Proposed descriptions: 49 individually worded, page-specific summaries, each 120–155 characters to satisfy the existing proposal validator.
- Every proposal includes the exact published packet's ID, URL, current title and description, before/after character counts and an owner-review note.
- No URLs, H1s, canonicals, hreflang, structured data, publisher queue or NAP change.
- All proposal text should be reviewed by a fluent editor in the relevant language before approval. A test passing is not proof of language quality.

## Why not automatically rewrite all 321 / 622?

The historical appendix `docs/seo-v10/11-phu-luc-url-can-xu-ly.md` lists **321 titles longer than 70 characters** and **622 descriptions longer than 165**. The current proposal application tool uses a different title threshold (60 characters), which also covers titles in the 61–70 group. These are **review flags, not confirmed SEO defects**. Google does not impose fixed 60-character title or 155-character snippet limits; title links and snippets can vary by query and device.

For `zh`, `ko`, `ja`, short character counts must not trigger artificial padding. Inspect title appearance, script correctness and intent before proposing a change. These locales remain part of the ten-locale audit.

## Read-only status

```bash
node scripts/seo/meta-review-status.mjs
node scripts/seo/meta-review-status.mjs --json
node scripts/seo/apply-meta-proposals.mjs     # dry run only
node --test tests/meta-proposals.test.mjs tests/meta-review-status.test.mjs
```

`meta-review-status` reports the full published-packet backlog, validated staged proposals and outstanding flags per locale; it exits non-zero on stale or malformed proposals. It **never applies** changes.

## Owner-approved application (separate, deliberate PR)

1. Review every new title and description with source article, language intent and topical uniqueness. Check factual and legal claims against the article's authoritative sources; no new numbers.
2. Approve exact IDs and text in a separate PR. Obtain the required approval for frozen SEO fields.
3. On a clean, non-`main` branch, run the existing apply script with `--apply`, regenerate from source, inspect *every* resulting diff, and intentionally update the URL-freeze baseline **only for the reviewed change set** under the repository's reviewed-commit procedure.
4. Run all SEO/fact/test/nav/content-graph gates, merge only when green and approved, then run production Live QA.
5. Report actual commits, QA and number of applied records; never mark proposed data as deployed.

## Restrictions

ZERO-DATA: no Search Console / ranking / traffic figures are inferred; no NAP, prices, reviews, business schema or external source claims are created. No automatic mass production and no direct edits to `main`.
