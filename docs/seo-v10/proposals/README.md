# SEO V10 — native-language title & meta review queue (ZERO-DATA)

Repository: `thuexemayhanoi/global` · production `https://global.rentbikehanoi.com`.

This folder contains **editorial proposals only**. No published article packet, SEO freeze record, generated HTML, Google Search Console data, or live business information is modified by this work.

## State on the PR #86 branch (applied, owner review by merge)

- The seven `meta-<locale>.json` files hold the full V10 proposal set: **632 articles** (vi 86, en 95, de 96, fr 94, es 84, nl 88, pt 89), 546 new titles and 622 new descriptions, every item validated by `apply-meta-proposals.mjs`. They include the 49 articles of the first batch below with re-worded proposals; the first-batch texts stay readable at commit `52bd927e` for comparison.
- PR #86 has already run `--apply`, rebuilt the HTML, re-frozen the 632 URLs and regenerated the content graph, so its diff shows the real packet, HTML and `url-freeze.json` changes. Merging the PR is the owner's approval; nothing is deployed before that. Report: `docs/seo-v10/12-de-xuat-tieu-de-mo-ta.md`.
- `meta-review-status.mjs` recognises an applied proposal (the packet already carries the proposed text) and reports `applied_items` with the status `EDITORIAL_PROPOSALS_APPLIED_IN_REVIEWED_BRANCH` instead of an error.

## First reviewed-source batch (commit `52bd927e`, superseded by the set above)

- `meta-vi.json`, `meta-en.json`, `meta-de.json`, `meta-fr.json`, `meta-es.json`, `meta-nl.json`, `meta-pt.json`: 7 records each, **49 articles** (S01 to S07 of each locale) in that commit.
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
