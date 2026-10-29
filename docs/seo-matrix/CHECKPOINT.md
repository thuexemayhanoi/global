# SEO A–Z checkpoint

Generated 2026-10-29 by `docs/seo-audit/tools/az_matrix.py` from `TASKS.json`. GitHub (main) is the source of truth.

## Current task

- **IMG-11** (IMG): Cover image batch 11: unique 1200×675 + 640 WebP cover from the page's own H1/H2 over its topic illustration, localized alt, og:image and Article image (64 URLs)
- Status: **FIXED** · branch `seo/az-img-11` · PR - · merge `-` · deploy - · live QA -
- NEXT_ACTION: Merge after CI, deploy, live QA; record runs in the next PR

## Next TODO

1. **META-01**: Titles and meta descriptions outside the display bands (vi, en, de, fr, es, nl, pt): title truncation risk or under 45 characters; description under 140 or over 160 characters
2. **META-02**: zh, ja, ko titles and descriptions checked by display width (full-width characters count double)
3. **CONTENT-01**: Supporting pages under the 1,000-word equivalent (Latin words < 1000; Korean words < 750; Chinese/Japanese characters < 1500): expand toward 1,600+ words where the topic and reliable sources support it
4. **TECH-02**: A–Z technical re-audit: canonical, hreflang, sitemap, schema, lab Core Web Vitals, accessibility, broken links, duplicates and cannibalization in 10 languages

## URL status counts

| Dimension | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED | OK | NOT_FORCED | NOT_NEEDED |
|---|---|---|---|---|---|---|---|---|---|---|
| img_status | 0 | 0 | 64 | 0 | 0 | 1000 | 0 | 11 | 0 | 4 |
| meta_status | 155 | 0 | 0 | 0 | 0 | 0 | 0 | 919 | 5 | 0 |
| content_status | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 1056 | 15 | 0 |
| tech_status | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1079 | 0 | 0 |
| status | 143 | 0 | 64 | 0 | 0 | 864 | 0 | 8 | 0 | 0 |

## Task board counts

| Phase | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED |
|---|---|---|---|---|---|---|---|
| HISTORY | 0 | 0 | 0 | 2 | 2 | 25 | 0 |
| MATRIX | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| TECH | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| IMG | 0 | 0 | 1 | 0 | 0 | 11 | 0 |
| META | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| CONTENT | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

## Resume rule

On 'tiếp tục': read docs/seo-matrix/CHECKPOINT.json and TASKS.json on main, check the current task's branch/PR/CI/deploy, finish it, then take next_todo. Never redo LIVE_VERIFIED tasks.

Blocked tasks: none. Owner-only items: docs/seo-audit/OWNER-ACTIONS.md (OWNER_ACTIONS_LAST).
