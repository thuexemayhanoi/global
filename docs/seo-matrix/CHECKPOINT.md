# SEO A–Z checkpoint

Generated 2026-11-01 by `docs/seo-audit/tools/az_matrix.py` from `TASKS.json`. GitHub (main) is the source of truth.

## Current task

- **CONTENT-06** (CONTENT): Dead reference: Hanoi 115 emergency centre page (capcuu115hanoi.com) answers 404 on two German guides
- Status: **FIXED** · branch `seo/az-content-06` · PR - · merge `-` · deploy - · live QA -
- NEXT_ACTION: Merge, Pages deploy, live markup QA and post-publish QA; then record LIVE_VERIFIED

## Next TODO

1. **CONTENT-03**: No page prints its own publication or update date: show a localized 'Published · Updated' line with <time> from the dates that already feed JSON-LD and sitemap lastmod
2. **CONTENT-04**: The About page promises that each guide lists the date its references were checked, but no reference shows it: print each source's checked_on
3. **CONTENT-05**: Four FAQ questions are repeated word for word on two pages each (de, en, fr, nl): make them self-contained
4. **TECH-08**: English template strings on 977 non-English pages (skip link, breadcrumb aria-label, reading-time label, Pillar hero labels) and aria-label on a <span> without a role
5. **TECH-10**: Hreflang equivalence review for the topic slots published in all 10 languages (Hubs H01–H04, Supporting S01–S08)

## URL status counts

| Dimension | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED | OK | NOT_FORCED | NOT_NEEDED |
|---|---|---|---|---|---|---|---|---|---|---|
| img_status | 0 | 0 | 0 | 0 | 0 | 1064 | 0 | 11 | 0 | 4 |
| meta_status | 0 | 0 | 0 | 0 | 0 | 29 | 0 | 1045 | 5 | 0 |
| content_status | 0 | 0 | 2 | 0 | 0 | 18 | 0 | 1054 | 5 | 0 |
| tech_status | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1079 | 0 | 0 |
| status | 0 | 0 | 2 | 0 | 0 | 1072 | 0 | 5 | 0 | 0 |

## Task board counts

| Phase | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED |
|---|---|---|---|---|---|---|---|
| HISTORY | 0 | 0 | 0 | 2 | 2 | 25 | 0 |
| MATRIX | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| TECH | 3 | 0 | 0 | 0 | 0 | 7 | 0 |
| IMG | 0 | 0 | 0 | 0 | 0 | 25 | 0 |
| META | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| CONTENT | 3 | 0 | 1 | 0 | 0 | 2 | 0 |

## Resume rule

On 'tiếp tục': read docs/seo-matrix/CHECKPOINT.json and TASKS.json on main, check the current task's branch/PR/CI/deploy, finish it, then take next_todo. Never redo LIVE_VERIFIED tasks.

Blocked tasks: none. Owner-only items: docs/seo-audit/OWNER-ACTIONS.md (OWNER_ACTIONS_LAST).
