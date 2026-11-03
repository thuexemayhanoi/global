# SEO A–Z checkpoint

Generated 2026-11-03 by `docs/seo-audit/tools/az_matrix.py` from `TASKS.json`. GitHub (main) is the source of truth.

## Current task

- **IMG-TOPIC-SIZES** (IMG): Topic illustrations on the locale Pillars and the root page: sizes does not match the rendered width and no file is close to the slot, so pages load larger (desktop, Moto G) or smaller (root gallery on high-DPR phones) images than they show
- Status: **TODO** · branch `-` · PR - · merge `-` · deploy - · live QA -
- NEXT_ACTION: Set TOPIC_SIZES to the measured widths; add 320w and 600w WebP variants of the four illustrations (same image, Lanczos) to the srcset; build --check; test the chosen file at 360-1920 px and DPR 1-3; Lighthouse on the Pillar/root sample; PR, merge, deploy, live QA

## Next TODO

(none)

## URL status counts

| Dimension | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED | OK | NOT_FORCED | NOT_NEEDED |
|---|---|---|---|---|---|---|---|---|---|---|
| img_status | 0 | 0 | 0 | 0 | 0 | 1064 | 0 | 11 | 0 | 4 |
| meta_status | 0 | 0 | 0 | 0 | 0 | 29 | 0 | 1045 | 5 | 0 |
| content_status | 0 | 0 | 0 | 0 | 0 | 20 | 0 | 1054 | 5 | 0 |
| tech_status | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1079 | 0 | 0 |
| status | 0 | 0 | 0 | 0 | 0 | 1074 | 0 | 5 | 0 | 0 |

## Task board counts

| Phase | TODO | IN_PROGRESS | FIXED | MERGED | DEPLOYED | LIVE_VERIFIED | BLOCKED |
|---|---|---|---|---|---|---|---|
| HISTORY | 0 | 0 | 0 | 2 | 2 | 25 | 0 |
| MATRIX | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| TECH | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| IMG | 1 | 0 | 0 | 0 | 0 | 25 | 0 |
| META | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| CONTENT | 0 | 0 | 0 | 0 | 0 | 6 | 0 |

## Resume rule

On 'tiếp tục': read docs/seo-matrix/CHECKPOINT.json and TASKS.json on main, check the current task's branch/PR/CI/deploy, finish it, then take next_todo. Never redo LIVE_VERIFIED tasks.

Blocked tasks: none. Owner-only items: docs/seo-audit/OWNER-ACTIONS.md (OWNER_ACTIONS_LAST).
