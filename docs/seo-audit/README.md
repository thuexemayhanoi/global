# SEO A–Z audit toolkit

Read-only tooling that produces the Global SEO A–Z Master Matrix. It never writes site HTML, the production Matrix (`data/seo/master-matrix.json`), claims, sitemaps or production settings.

- Report: [`GLOBAL-SEO-AZ-AUDIT-20261027.md`](GLOBAL-SEO-AZ-AUDIT-20261027.md) · execution dashboard: [`EXECUTION-LEDGER.md`](EXECUTION-LEDGER.md)
- Workbook: [`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx)
- Data: `reports/seo/data/` (`audit-data.json`, `analysis.json`, CSV exports, `raw/` evidence)

## Pipeline

| Step | Command | Output |
|---|---|---|
| 1. Repo QA evidence | run the 10 guards and save each output to `reports/seo/data/raw/<name>.txt` (see below) | raw guard output |
| 2. Collect | `python3 docs/seo-audit/tools/collect.py` | `reports/seo/data/audit-data.json` |
| 3. Analyze | `python3 docs/seo-audit/tools/analyze.py` | `analysis.json`, `findings.csv`, `tasks.csv`, `locale-matrix.csv`, `audit-master-matrix.csv` |
| 4. Workbook | `python3 docs/seo-audit/tools/build_workbook.py --carry <previous.xlsx>` | the `.xlsx` |
| 5. Recalculate | open in Excel and save, or run LibreOffice headless recalculation | cached formula values |
| 6. Execution ledger | `python3 docs/seo-audit/tools/ledger.py` (before step 4 on a re-audit) | `execution/execution-ledger.csv`, `task-ledger.csv`, `ledger-summary.json`, [`EXECUTION-LEDGER.md`](EXECUTION-LEDGER.md) |

Re-audits: set `AUDIT_DATE` (and `RECHECK_DATE`) in the environment for steps 2–3, keep the baseline in `reports/seo/data/baseline-20261027/`, run step 6, then step 4 — the workbook takes `work_status` from the ledger (finding IDs are renumbered by every audit, so `--carry` is only used where no ledger row exists) and adds the sheets EXECUTION LEDGER, TASK LEDGER, OWNER ACTIONS and BEFORE vs AFTER. Batches and their PR / deploy / live QA runs are recorded in `execution/batches.json`; per-rule outcomes and reasons in `execution/outcomes.json`.

Raw guard files read by the tools: `seo-guard.txt` (`node scripts/seo/seo-guard.mjs`), `fact-guard.txt` (`node scripts/seo/fact-guard.mjs`), `tf.txt` (`node scripts/topic-factory.mjs status`), plus `build.txt`, `navqa.txt`, `validate.txt`, `auditstatic.txt`, `aisearch.txt`, `lang.txt`, `ta.txt`, `graph.txt` for the changelog. Live and third-party evidence goes into `raw/external-evidence.json` and `raw/keyword-metrics.json`. Update them with the new run IDs and tool results. Never type in numbers that no tool returned.

Requirements: Python 3 with `beautifulsoup4`, `lxml` and `openpyxl`.

## Updating the workbook between audits

- Yellow columns in **ERRORS & BLOCKERS** (`work_status`, `assignee`, `notes`) and **SEO ACTION PLAN** (`work_status`, `assignee`, `start`, `due`, `notes`) are for people. `--carry` copies them into the next build by `finding_id` / `task_id`.
- Finding IDs are `F-<rule>-<nnnn>`, task IDs are `T-<rule>[-<LOCALE>]`. A finding that disappears in the next audit has been fixed. Record the fix in **AUDIT CHANGELOG**.
- Dashboard KPIs, `open_findings`, and the per-locale counts are formulas, so they update as soon as statuses change.

## Evidence vocabulary

`VERIFIED` (measured), `INFERRED` (heuristic or third-party estimate), `NOT_CHECKED` (in scope, not measurable this run), `NOT_CONNECTED` (data source missing: GSC, GA4, CrUX, rank or AI-visibility tracking).

## Live checks

The audit container may be unable to reach the production host. Live state is verified by the repo's read-only workflows, which a person or agent dispatches manually:

- `live-markup-qa.yml`: every PUBLISHED URL, HTTP 200 and byte-identical HTML.
- `post-publish-qa.yml`: status, lang, canonical, sitemap, robots, 404, fingerprints and the NAP guard.

Record their run IDs in `raw/external-evidence.json`.
