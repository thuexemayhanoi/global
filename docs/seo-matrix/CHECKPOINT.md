# SEO A–Z checkpoint

Generated 2026-11-01 by `docs/seo-audit/tools/az_matrix.py` from `TASKS.json`. GitHub (main) is the source of truth.

## Current task

- **IMG-SRCSET** (IMG): Cover srcset offers only 640w and 1200w: add an intermediate width so phones stop downloading the 1200 px file
- Status: **IN_PROGRESS** · branch `-` · PR - · merge `-` · deploy - · live QA -
- NEXT_ACTION: Work the open IMG-SRCSET-nn batch: python3 scripts/images/cover_widths.py --batch=IMG-nn; node scripts/build.mjs; QA; PR; merge; deploy; live QA

## Next TODO

1. **IMG-SRCSET-09**: 800 px cover variant in srcset, batch 9 (the 100 URLs of IMG-09)
2. **IMG-SRCSET-10**: 800 px cover variant in srcset, batch 10 (the 100 URLs of IMG-10)
3. **IMG-SRCSET-11**: 800 px cover variant in srcset, batch 11 (the 64 URLs of IMG-11)
4. **CONTENT-03**: No page prints its own publication or update date: show a localized 'Published · Updated' line with <time> from the dates that already feed JSON-LD and sitemap lastmod
5. **CONTENT-04**: The About page promises that each guide lists the date its references were checked, but no reference shows it: print each source's checked_on

## URL status counts

| Dimension | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED | OK | NOT_FORCED | NOT_NEEDED |
|---|---|---|---|---|---|---|---|---|---|---|
| img_status | 0 | 0 | 0 | 0 | 0 | 1064 | 0 | 11 | 0 | 4 |
| meta_status | 0 | 0 | 0 | 0 | 0 | 29 | 0 | 1045 | 5 | 0 |
| content_status | 0 | 0 | 0 | 0 | 0 | 18 | 0 | 1056 | 5 | 0 |
| tech_status | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1079 | 0 | 0 |
| status | 0 | 0 | 0 | 0 | 0 | 1074 | 0 | 5 | 0 | 0 |

## Task board counts

| Phase | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED |
|---|---|---|---|---|---|---|---|
| HISTORY | 0 | 0 | 0 | 2 | 2 | 25 | 0 |
| MATRIX | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| TECH | 3 | 0 | 0 | 0 | 0 | 7 | 0 |
| IMG | 3 | 1 | 1 | 0 | 0 | 20 | 0 |
| META | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| CONTENT | 4 | 0 | 0 | 0 | 0 | 2 | 0 |

## Resume rule

On 'tiếp tục': read docs/seo-matrix/CHECKPOINT.json and TASKS.json on main, check the current task's branch/PR/CI/deploy, finish it, then take next_todo. Never redo LIVE_VERIFIED tasks.

Blocked tasks: none. Owner-only items: docs/seo-audit/OWNER-ACTIONS.md (OWNER_ACTIONS_LAST).
