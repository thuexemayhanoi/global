# SEO A–Z checkpoint

Generated 2026-10-29 by `docs/seo-audit/tools/az_matrix.py` from `TASKS.json`. GitHub (main) is the source of truth.

## Current task

- None: every task on the board is LIVE_VERIFIED or BLOCKED.
- NEXT_ACTION: Re-run the audit pipeline (collect → analyze → ledger → az_matrix → workbook) and docs/seo-audit/tools/tech_reaudit.py on current main; add a task to TASKS.json only for a verified new finding on an existing URL; otherwise monitor (indexing and rankings stay unmeasured without Search Console)

## Next TODO

(none)

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
| TECH | 0 | 0 | 0 | 0 | 0 | 7 | 0 |
| IMG | 0 | 0 | 0 | 0 | 0 | 12 | 0 |
| META | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| CONTENT | 0 | 0 | 0 | 0 | 0 | 2 | 0 |

## Resume rule

On 'tiếp tục': read docs/seo-matrix/CHECKPOINT.json and TASKS.json on main, check the current task's branch/PR/CI/deploy, finish it, then take next_todo. Never redo LIVE_VERIFIED tasks.

Blocked tasks: none. Owner-only items: docs/seo-audit/OWNER-ACTIONS.md (OWNER_ACTIONS_LAST).
