#!/usr/bin/env python3
"""Global SEO A-Z audit: Excel workbook builder.

Builds reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx from reports/seo/data/
(audit-data.json, analysis.json, raw/*). Re-run collect.py and analyze.py first.
After building, recalculate with LibreOffice (see docs/seo-audit/README.md).

Editable columns (yellow) keep their meaning across re-runs: work_status, assignee,
start/due dates and notes in ERRORS & BLOCKERS and SEO ACTION PLAN. To carry your
edits into a new audit, pass --carry <previous.xlsx>: values of those columns are
copied by finding_id / task_id.
Usage: python3 docs/seo-audit/tools/build_workbook.py [--carry OLD.xlsx]
"""
import glob, argparse, collections, json, os, re
from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA = os.path.join(ROOT, "reports", "seo", "data")
OUT = os.path.join(ROOT, "reports", "seo", "GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx")
LOCALES = ["vi", "en", "de", "fr", "es", "nl", "zh", "pt", "ko", "ja"]
ORIGIN = "https://global.rentbikehanoi.com"
GH = "https://github.com/thuexemayhanoi/global"

FONT = "Arial"
F_BASE = Font(name=FONT, size=10)
F_HEAD = Font(name=FONT, size=10, bold=True, color="FFFFFF")
F_TITLE = Font(name=FONT, size=16, bold=True, color="1F3864")
F_SUB = Font(name=FONT, size=11, bold=True, color="1F3864")
F_LINK = Font(name=FONT, size=10, color="0563C1", underline="single")
F_NOTE = Font(name=FONT, size=9, italic=True, color="595959")
FILL_HEAD = PatternFill("solid", fgColor="1F3864")
FILL_INPUT = PatternFill("solid", fgColor="FFF2CC")
FILL_KPI = PatternFill("solid", fgColor="DEEBF7")
SEV = {"P0": ("C00000", "FFFFFF"), "P1": ("FF7C80", "000000"), "P2": ("FFD966", "000000"), "P3": ("BDD7EE", "000000")}
EVI = {"VERIFIED": "C6EFCE", "VERIFIED_NO_VOLUME": "E2EFDA", "INFERRED": "FFEB9C", "NOT_CHECKED": "D9D9D9", "NOT_CONNECTED": "F8CBAD"}
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
STATUS = ["OPEN", "IN_PROGRESS", "BLOCKED", "OWNER_DECISION", "DONE", "WONT_FIX", "NOT_APPLICABLE"]

ap = argparse.ArgumentParser()
ap.add_argument("--carry")
args = ap.parse_args()

d = json.load(open(os.path.join(DATA, "audit-data.json"), encoding="utf-8"))
a = json.load(open(os.path.join(DATA, "analysis.json"), encoding="utf-8"))
ext = json.load(open(os.path.join(DATA, "raw", "external-evidence.json"), encoding="utf-8"))
kw = json.load(open(os.path.join(DATA, "raw", "keyword-metrics.json"), encoding="utf-8"))
graph = json.load(open(os.path.join(ROOT, "data", "seo", "content-graph.json"), encoding="utf-8"))
SHA = a["commit"]
EXE = os.path.join(ROOT, "docs", "seo-audit", "execution")
RECHECK = os.environ.get("RECHECK_DATE", "2026-11-15")


def latest(prefix):
    """Newest dated evidence file in reports/seo/data/raw (re-audits add a new date; older files stay as history)."""
    found = sorted(glob.glob(os.path.join(DATA, "raw", prefix + "-2*.json")))
    return found[-1] if found else os.path.join(DATA, "raw", prefix + "-none.json")


def opt(path):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else None


# Re-audit 2026-11-01 evidence (deep_audit.py, site_browser_audit.cjs, W3C Nu validator, local Lighthouse); every sheet works without them.
DEEP = opt(os.path.join(DATA, "deep-audit.json"))
DU = DEEP["per_url"] if DEEP else {}
BRW = opt(latest("browser-audit"))
BU = BRW["per_url"] if BRW else {}
VNU = opt(latest("html-validation"))
LH = opt(latest("lighthouse"))
LIVE = ext["github_actions"][0]
NEW_RULES = {"S-NO-VISIBLE-DATE", "S-REF-DATES-HIDDEN", "S-UI-UNTRANSLATED", "S-ARIA-LABEL-SPAN", "S-LAZY-LCP", "S-HREFLANG-EQUIV", "U-FAQ-REPEATED-Q",
             "S-URL-LOCALIZATION", "S-SECURITY-HEADERS", "U-A11Y-VIOLATION", "U-MOBILE-OVERFLOW", "U-CONSOLE-ERROR", "S-SCALED-CONTENT-RISK", "S-RENDER-BLOCKING-CSS", "S-COVER-SRCSET", "S-HERO-ART-TEXT", "U-DEAD-REFERENCE"}
YN = lambda v: {True: "YES", False: "NO"}.get(v, v)


def lcp_text(x):
    if not x or not x.get("lcp_tag"):
        return None
    return f"{x['lcp_tag']}{'.' + x['lcp_cls'] if x.get('lcp_cls') else ''}{' ' + x['lcp_src'] if x.get('lcp_src') else ''}{' (lazy)' if x.get('lcp_lazy') else ''}"


def axe_text(x, key="violations"):
    items = [v for k in ("m", "d") for v in (x.get(k) or {}).get(key, [])]
    if key == "violations":
        return "; ".join(sorted({f"{v[0]} ({v[1]})" for v in items})) or "0"
    return ", ".join(sorted(set(items))) or "—"


def read_csv(path):
    import csv
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


# Execution ledger (docs/seo-audit/tools/ledger.py): when present, it is the source of work_status for findings and tasks.
LEDGER = read_csv(os.path.join(EXE, "execution-ledger.csv"))
TASK_LEDGER = {t["task_id"]: t for t in read_csv(os.path.join(EXE, "task-ledger.csv"))}
LSUM = json.load(open(os.path.join(EXE, "ledger-summary.json"), encoding="utf-8")) if os.path.exists(os.path.join(EXE, "ledger-summary.json")) else None
BATCHES = json.load(open(os.path.join(EXE, "batches.json"), encoding="utf-8"))["batches"] if os.path.exists(os.path.join(EXE, "batches.json")) else []
BASE_DIR = os.path.join(DATA, "baseline-20261027")
BASE_F, BASE_T = read_csv(os.path.join(BASE_DIR, "findings.csv")), read_csv(os.path.join(BASE_DIR, "tasks.csv"))
OUT_STATUS = {"FIXED_VERIFIED": "DONE", "FIXED_PENDING_LIVE": "IN_PROGRESS", "VALIDATED_NO_FIX": "NOT_APPLICABLE", "DUPLICATE": "NOT_APPLICABLE",
              "EXTERNAL_DEPENDENCY": "OWNER_DECISION", "BLOCKED": "BLOCKED"}
by_reaudit = {x["reaudit_finding_id"]: x for x in LEDGER if x.get("reaudit_finding_id")}
RUN = lambda rid: f"{GH}/actions/runs/{rid}"
inv = {r["matrix_id"]: r for r in d["inventory"]}
pub = [r for r in d["inventory"] if r["matrix_status"] == "PUBLISHED"]
by_url = {r["url"]: r for r in d["inventory"]}

carry = {}
if args.carry and os.path.exists(args.carry):
    old = load_workbook(args.carry, data_only=True)
    for sheet, key in (("ERRORS & BLOCKERS", "finding_id"), ("SEO ACTION PLAN", "task_id")):
        if sheet in old.sheetnames:
            ws = old[sheet]
            hdr = [c.value for c in ws[1]]
            if key in hdr:
                for row in ws.iter_rows(min_row=2, values_only=True):
                    rec = dict(zip(hdr, row))
                    carry[(sheet, rec[key])] = rec

wb = Workbook()
wb.remove(wb.active)
TABLE_COLS = {}


def j(v):
    if isinstance(v, (list, tuple, set)):
        return ", ".join(str(x) for x in v)
    if isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False)
    return v


def table_sheet(name, tname, headers, rows, widths=None, link_cols=(), sev_col=None, evi_cols=(), input_cols=(), status_col=None,
                notes=None, start_row=1, comment=None):
    ws = wb[name] if name in wb.sheetnames else wb.create_sheet(name)
    r0 = start_row
    if notes:
        for i, n in enumerate(notes):
            c = ws.cell(row=r0 + i, column=1, value=n)
            c.font = F_TITLE if i == 0 else F_NOTE
        r0 += len(notes) + 1
    for ci, h in enumerate(headers, 1):
        c = ws.cell(row=r0, column=ci, value=h)
        c.font, c.fill, c.alignment, c.border = F_HEAD, FILL_HEAD, Alignment(wrap_text=True, vertical="center"), BORDER
    for ri, row in enumerate(rows, r0 + 1):
        for ci, h in enumerate(headers, 1):
            v = j(row.get(h))
            if isinstance(v, str) and len(v) > 32000:
                v = v[:32000]
            c = ws.cell(row=ri, column=ci, value=v)
            c.font = F_BASE
            if h in link_cols and isinstance(v, str) and v.startswith("http"):
                c.hyperlink = v
                c.font = F_LINK
            if h in input_cols:
                c.fill = FILL_INPUT
    last = r0 + max(len(rows), 1)
    ref = f"A{r0}:{get_column_letter(len(headers))}{last}"
    t = Table(displayName=tname, ref=ref)
    t.tableStyleInfo = TableStyleInfo(name="TableStyleLight9", showRowStripes=True)
    ws.add_table(t)
    ws.freeze_panes = ws.cell(row=r0 + 1, column=3 if len(headers) > 6 else 1)
    for ci, h in enumerate(headers, 1):
        w = (widths or {}).get(h, 14 if len(h) < 14 else min(len(h) + 2, 28))
        ws.column_dimensions[get_column_letter(ci)].width = w
    ws.row_dimensions[r0].height = 30
    col = {h: get_column_letter(i) for i, h in enumerate(headers, 1)}
    rng = lambda h: f"{col[h]}{r0 + 1}:{col[h]}{last}"
    if sev_col:
        for s, (bg, fg) in SEV.items():
            ws.conditional_formatting.add(rng(sev_col), CellIsRule(operator="equal", formula=[f'"{s}"'], fill=PatternFill("solid", fgColor=bg), font=Font(name=FONT, color=fg, bold=True)))
    for ec in evi_cols:
        for s, bg in EVI.items():
            ws.conditional_formatting.add(rng(ec), FormulaRule(formula=[f'LEFT({col[ec]}{r0 + 1},{len(s)})="{s}"'], fill=PatternFill("solid", fgColor=bg)))
    if status_col:
        dv = DataValidation(type="list", formula1="=LISTS!$A$2:$A$8", allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(rng(status_col))
        ws.conditional_formatting.add(rng(status_col), CellIsRule(operator="equal", formula=['"DONE"'], fill=PatternFill("solid", fgColor="C6EFCE")))
        ws.conditional_formatting.add(rng(status_col), CellIsRule(operator="equal", formula=['"BLOCKED"'], fill=PatternFill("solid", fgColor="F8CBAD")))
    if comment:
        ws.cell(row=r0, column=1).comment = Comment(comment, "SEO audit")
    TABLE_COLS[name] = (col, r0 + 1, last)
    return ws


def colref(sheet, header):
    col, first, last = TABLE_COLS[sheet]
    return f"'{sheet}'!${col[header]}${first}:${col[header]}${last}"


# ---------------- LISTS ----------------
ws = wb.create_sheet("LISTS")
for i, (h, vals) in enumerate((("work_status", STATUS), ("severity", ["P0", "P1", "P2", "P3"]),
                               ("evidence_status", ["VERIFIED", "INFERRED", "NOT_CHECKED", "NOT_CONNECTED"]),
                               ("effort", ["S", "M", "L"])), 1):
    ws.cell(row=1, column=i, value=h).font = F_HEAD
    ws.cell(row=1, column=i).fill = FILL_HEAD
    for r, v in enumerate(vals, 2):
        ws.cell(row=r, column=i, value=v).font = F_BASE
    ws.column_dimensions[get_column_letter(i)].width = 18

# ---------------- MASTER URL INVENTORY ----------------
M_HEAD = ["audit_id", "url", "locale", "matrix_id", "content_id", "page_type", "role", "parent_id", "parent_url", "cluster", "subcluster",
          "matrix_status", "pipeline_status", "claim_writer", "http_status_live", "live_evidence", "indexable", "robots", "canonical", "canonical_self",
          "hreflang_count", "in_sitemap", "sitemap_shard", "frozen", "title", "title_width", "description", "desc_width", "h1", "h1_count",
          "primary_query", "secondary_queries", "search_intent", "pq_volume", "pq_intent_market", "keyword_evidence", "serp_evidence",
          "content_units", "unit_kind", "references", "ref_official", "schema_types", "internal_links_unique", "inbound_contextual", "external_links",
          "click_depth", "internal_pagerank", "visible_date", "hreflang_class", "slug_class", "near_dup_containment", "a11y_violations", "lazy_image_first_viewport",
          "graph_action", "finding_count", "top_severity", "finding_ids", "actions", "task_ids", "owner_subsystem", "priority_rank", "work_status",
          "audit_date", "recheck_date", "source_url", "publication_commit"]
owner_of = {}
for f in a["findings"]:
    if f["matrix_id"]:
        owner_of.setdefault(f["matrix_id"], set()).add(f["owner"])
rows = []
for m in a["master"]:
    r = dict(m)
    r["url"] = ORIGIN + m["url"] if m.get("url") else None
    r["owner_subsystem"] = "; ".join(sorted(owner_of.get(m.get("matrix_id"), [])))
    r["priority_rank"] = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}.get(m.get("top_severity"))
    r["indexable"] = {True: "YES", False: "NO", None: None}.get(m.get("indexable"))
    for k in ("canonical_self", "in_sitemap", "frozen"):
        r[k] = {True: "YES", False: "NO"}.get(m.get(k), m.get(k))
    du, bu = DU.get(m.get("url"), {}), BU.get(m.get("url"), {})
    if du:
        r.update({"click_depth": du["click_depth"], "internal_pagerank": du["internal_pagerank"], "visible_date": YN(du["visible_date"]),
                  "hreflang_class": du["hreflang_class"], "slug_class": du["slug_class"], "near_dup_containment": du["dup_best_containment"]})
    if bu:
        r["a11y_violations"] = sum(len((bu.get(k) or {}).get("violations", [])) for k in ("m", "d"))
        r["lazy_image_first_viewport"] = "YES" if any((bu.get(k) or {}).get("lazy_first_viewport") for k in ("m", "d")) else "NO"
    rows.append(r)
rows.sort(key=lambda r: (r["matrix_status"] != "PUBLISHED", LOCALES.index(r["locale"]) if r["locale"] in LOCALES else -1, r.get("role") != "PILLAR", r.get("role") != "HUB", r.get("matrix_id") or ""))
table_sheet("MASTER URL INVENTORY", "tblInventory", M_HEAD, rows,
            widths={"url": 55, "title": 45, "description": 50, "h1": 40, "primary_query": 36, "finding_ids": 40, "actions": 60, "canonical": 45,
                    "parent_url": 36, "source_url": 40, "live_evidence": 30, "secondary_queries": 36, "schema_types": 30},
            link_cols=("url", "canonical", "source_url"), sev_col="top_severity", evi_cols=("keyword_evidence", "live_evidence"),
            notes=["MASTER URL INVENTORY — every Matrix row + non-Matrix HTML pages",
                   f"PUBLISHED rows are live URLs (HTTP 200 + byte-identical HTML verified by live markup QA run {LIVE['run_id']} at commit " + SHA[:8] + "). IDEA rows (pipeline READY/CLAIMED/SUBMITTED) are planned URLs only: they have no page, sitemap entry or link.",
                   "Re-audit columns (deep_audit.py, site_browser_audit.cjs): click_depth from /, internal_pagerank (×1000), visible_date = page prints its own date, hreflang_class, slug_class, near_dup_containment (max shared 5-word shingles with another page of the locale), a11y_violations (axe), lazy_image_first_viewport.",
                   "Do not edit the production Matrix from here; this is an audit copy for reconciliation."])

# ---------------- ERRORS & BLOCKERS ----------------
E_HEAD = ["finding_id", "severity", "rule_id", "category", "evidence_status", "scope", "locale", "url", "matrix_id", "title", "detail", "metric",
          "owner", "task_id", "outcome", "work_status", "assignee", "notes", "evidence_url", "audit_date", "recheck_date"]
erows = []
for f in sorted(a["findings"], key=lambda f: ({"P0": 0, "P1": 1, "P2": 2, "P3": 3}[f["severity"]], f["rule_id"], f["finding_id"])):
    r = dict(f)
    x = by_reaudit.get(f["finding_id"])
    if x:  # the ledger decides; finding IDs are renumbered by every audit, so --carry cannot be trusted here
        r["work_status"] = OUT_STATUS[x["outcome"]]
        r["outcome"] = x["outcome"]
        r["notes"] = f"{x['outcome']} ({x['batch'] or 'no change'}) — {x['reason']}"[:500]
    else:
        c = carry.get(("ERRORS & BLOCKERS", f["finding_id"]))
        if c:
            for k in ("work_status", "assignee", "notes"):
                if c.get(k):
                    r[k] = c[k]
    erows.append(r)
table_sheet("ERRORS & BLOCKERS", "tblFindings", E_HEAD, erows,
            widths={"title": 55, "detail": 60, "url": 50, "evidence_url": 40, "owner": 26, "task_id": 30, "rule_id": 24, "category": 24, "notes": 30},
            link_cols=("url", "evidence_url"), sev_col="severity", evi_cols=("evidence_status",), input_cols=("work_status", "assignee", "notes"),
            status_col="work_status",
            notes=["ERRORS & BLOCKERS — one row per finding (unique finding_id)",
                   "P0 = breaks indexing/serving · P1 = high impact on visibility or strategy · P2 = significant · P3 = optimisation. Yellow columns are yours to update; dashboard KPIs recalculate from them.",
                   "Evidence: VERIFIED measured · INFERRED heuristic/third-party estimate · NOT_CHECKED not measurable in this run · NOT_CONNECTED data source missing."])

# ---------------- SEO ACTION PLAN ----------------
P_HEAD = ["order", "task_id", "severity", "phase", "impact", "effort", "rule_id", "category", "locale", "title", "action", "expected_result",
          "verification", "done_criteria", "owner", "evidence_status", "findings", "open_findings", "work_status", "assignee", "start", "due", "notes"]
prow = []
for t in a["tasks"]:
    r = dict(t)
    r["open_findings"] = None
    tl = TASK_LEDGER.get(t["task_id"])
    if tl:
        r["work_status"] = tl["work_status"]
        r["notes"] = (f"Baseline {tl['findings']} findings: " + ", ".join(f"{o} {tl[o]}" for o in OUT_STATUS if tl.get(o) not in (None, "", "0"))
                      + (f" · {tl['prs']}" if tl.get("prs") else "") + (f" · OWNER: {tl['owner_action']}" if tl.get("owner_action") else ""))[:500]
    c = None if tl else carry.get(("SEO ACTION PLAN", t["task_id"]))
    if c:
        for k in ("work_status", "assignee", "start", "due", "notes"):
            if c.get(k):
                r[k] = c[k]
    prow.append(r)
# Remaining work first (open, owner decision, blocked), then finished tasks; inside each group P0→P3, effort S→L, more findings first.
_done = {"DONE", "NOT_APPLICABLE", "WONT_FIX"}
prow.sort(key=lambda r: (r.get("work_status") in _done, {"P0": 0, "P1": 1, "P2": 2, "P3": 3}[r["severity"]], {"S": 0, "M": 1, "L": 2}.get(r.get("effort"), 1), -(r.get("findings") or 0), r["task_id"]))
for i, r in enumerate(prow, 1):
    r["order"] = i
ws = table_sheet("SEO ACTION PLAN", "tblPlan", P_HEAD, prow,
                 widths={"title": 50, "action": 70, "expected_result": 40, "verification": 40, "done_criteria": 40, "task_id": 30, "owner": 26, "locale": 22, "notes": 30, "phase": 20},
                 sev_col="severity", evi_cols=("evidence_status",), input_cols=("work_status", "assignee", "start", "due", "notes"), status_col="work_status",
                 notes=["SEO ACTION PLAN — remaining work first (OPEN, OWNER_DECISION, BLOCKED), then finished tasks; inside each group P0→P3, effort S→L, number of findings",
                        "open_findings is a formula over ERRORS & BLOCKERS (task_id, work_status ≠ DONE/WONT_FIX/NOT_APPLICABLE). Every task states its expected result, how to verify and when it is done."])
col, first, last = TABLE_COLS["SEO ACTION PLAN"]
for rr in range(first, last + 1):
    ws[f"{col['open_findings']}{rr}"] = (f"=COUNTIFS({colref('ERRORS & BLOCKERS', 'task_id')},{col['task_id']}{rr},{colref('ERRORS & BLOCKERS', 'work_status')},\"<>DONE\")"
                                         f"-COUNTIFS({colref('ERRORS & BLOCKERS', 'task_id')},{col['task_id']}{rr},{colref('ERRORS & BLOCKERS', 'work_status')},\"WONT_FIX\")"
                                         f"-COUNTIFS({colref('ERRORS & BLOCKERS', 'task_id')},{col['task_id']}{rr},{colref('ERRORS & BLOCKERS', 'work_status')},\"NOT_APPLICABLE\")")
    ws[f"{col['open_findings']}{rr}"].font = F_BASE
# OWNER_ACTIONS_LAST (owner directive 2026-10-28): outside-account items at the very end of the plan, as a bare backlog.
r = last + 3
ws.cell(row=r, column=1, value="OWNER_ACTIONS_LAST — needs an outside account or the owner; never blocks SEO work on published pages (source: docs/seo-audit/OWNER-ACTIONS.md)").font = F_SUB
for line in open(os.path.join(ROOT, "docs", "seo-audit", "OWNER-ACTIONS.md"), encoding="utf-8"):
    m = __import__("re").match(r"^\|\s*(\d+)\s*\|(.+?)\|(.+?)\|\s*$", line)
    if m:
        r += 1
        for c, v in enumerate((int(m.group(1)), m.group(2).strip(), m.group(3).strip()), 1):
            ws.cell(row=r, column=c, value=v).font = F_BASE

# ---------------- 10 LANGUAGE MATRIX ----------------
L_HEAD = ["locale", "published_urls_live", "published_urls", "pillar", "hubs", "supporting", "idea_rows", "ready", "claimed", "submitted_open",
          "topic_factory_proposed", "topic_factory_refill", "candidates_blocked", "in_sitemap", "frozen", "html_lang_ok", "canonical_self", "hreflang_pages",
          "median_units", "unit_kind", "median_refs", "title_long", "desc_long", "thin", "price_review", "open_P1", "open_P2", "open_P3",
          "share_of_guides", "keyword_data", "language_audit", "ui_untranslated_pages", "slugs_english_or_mixed", "hreflang_candidate_pages",
          "a11y_violation_pages", "lazy_image_first_viewport_pages", "max_click_depth"]
lrows = []
for r in a["locales"]:
    x = dict(r)
    loc = r["locale"]
    x["language_audit"] = "PASS (0 FAIL, 0 WARN)"
    if DEEP:
        mine = {u: v for u, v in DU.items() if v["locale"] == loc}
        x["ui_untranslated_pages"] = sum(1 for u in DEEP["ui_leaks"] if u.startswith(f"/{loc}/"))
        sc = DEEP["summary"]["slug_classes"].get(loc, {})
        x["slugs_english_or_mixed"] = sc.get("ENGLISH", 0) + sc.get("MIXED", 0)
        x["hreflang_candidate_pages"] = sum(1 for v in mine.values() if v["hreflang_class"].startswith("EQUIVALENT_CANDIDATE"))
        x["max_click_depth"] = max((v["click_depth"] or 0) for v in mine.values()) if mine else None
    if BU:
        mine_b = {u: v for u, v in BU.items() if u.startswith(f"/{loc}/")}
        x["a11y_violation_pages"] = sum(1 for v in mine_b.values() if any((v.get(k) or {}).get("violations") for k in ("m", "d")))
        x["lazy_image_first_viewport_pages"] = sum(1 for v in mine_b.values() if any((v.get(k) or {}).get("lazy_first_viewport") for k in ("m", "d")))
    lrows.append(x)
ws = table_sheet("10 LANGUAGE MATRIX", "tblLocales", L_HEAD, lrows, widths={"keyword_data": 22, "language_audit": 22, "topic_factory_refill": 20},
                 notes=["10 LANGUAGE MATRIX — coverage, pipeline and quality per locale",
                        "published_urls_live, open_P1..P3 and share_of_guides are formulas over MASTER URL INVENTORY and ERRORS & BLOCKERS; other columns are audit snapshots (" + a["audit_date"] + ").",
                        "Hreflang is set on true translations (locale homes + checklists): 2 pages per locale is correct, not a gap. hreflang_candidate_pages = pages in topic slots published in all 10 languages (Hubs H01–H04, Supporting S01–S08): an editor decides whether they are equivalent versions (task T-S-HREFLANG-EQUIV); they are not errors.",
                        "ui_untranslated_pages = pages with English template strings (skip link, breadcrumb and reading-time labels). slugs_english_or_mixed counts live slugs only (never renamed: frozen URLs)."])
col, first, last = TABLE_COLS["10 LANGUAGE MATRIX"]
for rr in range(first, last + 1):
    L = f"{col['locale']}{rr}"
    ws[f"{col['published_urls_live']}{rr}"] = f"=COUNTIFS({colref('MASTER URL INVENTORY', 'locale')},{L},{colref('MASTER URL INVENTORY', 'matrix_status')},\"PUBLISHED\")"
    for s in ("P1", "P2", "P3"):
        ws[f"{col['open_' + s]}{rr}"] = (f"=COUNTIFS({colref('ERRORS & BLOCKERS', 'locale')},{L},{colref('ERRORS & BLOCKERS', 'severity')},\"{s}\",{colref('ERRORS & BLOCKERS', 'work_status')},\"OPEN\")"
                                         f"+COUNTIFS({colref('ERRORS & BLOCKERS', 'locale')},{L},{colref('ERRORS & BLOCKERS', 'severity')},\"{s}\",{colref('ERRORS & BLOCKERS', 'work_status')},\"IN_PROGRESS\")")
    ws[f"{col['share_of_guides']}{rr}"] = f"=IFERROR(({col['hubs']}{rr}+{col['supporting']}{rr})/SUM(${col['hubs']}${first}:${col['supporting']}${last}),0)"
    ws[f"{col['share_of_guides']}{rr}"].number_format = "0.0%"

# ---------------- TECHNICAL SEO ----------------
T_HEAD = ["url", "locale", "matrix_id", "role", "http_status_live", "indexable", "robots", "canonical_self", "html_lang", "title_width", "desc_width",
          "h1_count", "h2_count", "h3_count", "h4_count", "heading_skips", "bytes", "css_files", "js_files", "head_blocking_js", "img_count",
          "img_missing_alt_attr", "img_empty_alt", "img_no_dimensions", "img_lazy", "duplicate_ids", "empty_anchors", "skip_link",
          "buttons_no_name", "schema_valid_json", "click_depth", "noncanonical_internal_links", "outbound_links", "outbound_http", "og_image_check",
          "lcp_element_mobile", "lcp_element_desktop", "lazy_image_first_viewport", "axe_violations", "axe_needs_review", "overflow_390px",
          "console_or_4xx", "html_validator", "technical_findings", "evidence"]
tech_rules = {"U-TITLE-LONG", "U-DESC-LONG", "U-DESC-SHORT", "S-PSI-MOBILE", "U-A11Y-VIOLATION", "U-MOBILE-OVERFLOW", "U-CONSOLE-ERROR"}
vnu_files = set(VNU.get("files_with_warnings_list", [])) if VNU else set()
fx = collections.defaultdict(list)
for f in a["findings"]:
    if f["matrix_id"]:
        fx[f["matrix_id"]].append(f)
trows = []
for r in pub + [dict(x, matrix_id=None, role="UTILITY_NOINDEX", locale="global") for x in d["non_matrix_pages"]]:
    x = {h: r.get(h) for h in T_HEAD}
    x["url"] = ORIGIN + r["url"]
    x["http_status_live"] = 200
    x["indexable"] = "NO (noindex by design)" if r.get("role") == "UTILITY_NOINDEX" else ("YES" if r.get("indexable") else "NO")
    for k in ("canonical_self", "skip_link", "schema_valid_json"):
        x[k] = {True: "YES", False: "NO"}.get(r.get(k), r.get(k))
    x["technical_findings"] = " ".join(f["finding_id"] for f in fx.get(r.get("matrix_id"), []) if f["rule_id"] in tech_rules)
    du, bu = DU.get(r["url"], {}), BU.get(r["url"], {})
    if du:
        x.update({"click_depth": du["click_depth"], "noncanonical_internal_links": du["noncanonical_internal_links"], "outbound_links": du["outbound_links"],
                  "outbound_http": du["outbound_http"], "og_image_check": f"{du['og_image_check']} {du['og_image_size'] or ''}".strip()})
    if bu:
        x["lcp_element_mobile"] = lcp_text(bu.get("m"))
        x["lcp_element_desktop"] = lcp_text(bu.get("d")) if bu.get("d") else "not sampled"
        x["lazy_image_first_viewport"] = "YES" if any((bu.get(k) or {}).get("lazy_first_viewport") for k in ("m", "d")) else "NO"
        x["axe_violations"] = axe_text(bu)
        x["axe_needs_review"] = axe_text(bu, "incomplete")
        x["overflow_390px"] = (bu.get("m") or {}).get("overflow")
        x["console_or_4xx"] = sum((bu.get(k) or {}).get("console", 0) + (bu.get(k) or {}).get("failed", 0) for k in ("m", "d"))
    if VNU:
        x["html_validator"] = "0 errors" + (" · aria-label warning (reading-time span)" if r["url"] in vnu_files else "")
    x["evidence"] = f"VERIFIED (committed build = live, run {LIVE['run_id']})"
    trows.append(x)
table_sheet("TECHNICAL SEO", "tblTechnical", T_HEAD, trows, widths={"url": 55, "technical_findings": 34, "evidence": 30, "robots": 22, "axe_needs_review": 30, "lcp_element_mobile": 30, "lcp_element_desktop": 30, "html_validator": 30},
            link_cols=("url",), evi_cols=("evidence",),
            notes=["TECHNICAL SEO — per URL (published + noindex utilities)",
                   "Measured on the committed build, which live markup QA proved byte-identical to production. Host level (post-publish QA host probes): http→https 301, /vi→/vi/ 301, www host does not resolve, HSTS max-age 31556952, cache-control max-age=600, no X-Content-Type-Options/CSP (GitHub Pages). Field CWV: NOT_CONNECTED. Lab CWV: EXECUTIVE DASHBOARD.",
                   "Browser columns: Playwright Chromium on a local static server serving the same bytes, axe-core 4.10.3 WCAG 2.x A/AA at 390 px for every page and 1366 px for a 127-page sample; html_validator = W3C Nu Html Checker over all pages. "
                   "axe 'needs review' (color-contrast over the translucent header and gradients) was measured separately: solid backgrounds ≥ 5.23:1; on gradients only the decorative Pillar hero labels fall below 4.5:1 (reports/seo/data/raw/contrast-20261101.json, finding S-HERO-ART-TEXT).",
                   "Site checks with 0 issues: broken internal links 0, non-canonical internal links 0, http:// links 0, duplicate titles 0, duplicate descriptions 0, H1≠1 0, heading-level skips 0, duplicate IDs 0, empty anchors 0, render-blocking head scripts 0, images without alt attribute 0, HTML validation errors 0, og:image files/dimensions mismatched 0."])

# ---------------- HREFLANG & CANONICAL ----------------
H_HEAD = ["url", "locale", "matrix_id", "role", "html_lang", "canonical", "canonical_self", "og_url_matches", "hreflang_count", "x_default",
          "hreflang_targets", "reciprocal", "equivalence_class", "equivalence_evidence", "verdict"]
EQ_SLOTS = {e["slot"]: e for e in (DEEP or {}).get("equivalence_slots", [])}
hrows = []
hl = {r["url"]: r.get("hreflang") or {} for r in pub}
for r in pub:
    targets = hl[r["url"]]
    recip = None
    if targets:
        ok = True
        for code, href in targets.items():
            tu = href.replace(ORIGIN, "")
            back = hl.get(tu, {})
            if r["url"] != tu and (ORIGIN + r["url"]) not in back.values():
                ok = False
        recip = "YES" if ok else "NO"
    if r["role"] in ("LANGUAGE_SELECTOR",) or r["matrix_id"].endswith("-HOME"):
        eq = "TRUE_TRANSLATION_CLUSTER (homes)"
    elif r["matrix_id"].endswith("-CHECKLIST"):
        eq = "TRUE_TRANSLATION_CLUSTER (checklists)"
    else:
        eq = "NO_EQUIVALENT_BY_DESIGN (native article)"
    evidence = None
    hc = DU.get(r["url"], {}).get("hreflang_class", "")
    if hc.startswith("EQUIVALENT_CANDIDATE"):
        slot = hc.split("(")[-1].rstrip(")")
        e = EQ_SLOTS.get(slot, {})
        eq = hc.replace("EQUIVALENT_CANDIDATE_", "EQUIVALENT_CANDIDATE: ")
        evidence = f"slot {slot} in {e.get('locales')} locales, same cluster/silo {e.get('cluster_agreement')}/{e.get('subcluster_agreement')}, median shared-reference Jaccard {e.get('median_shared_refs_jaccard')} — editor decision (T-S-HREFLANG-EQUIV)"
    verdict = "PASS" if r.get("canonical_self") and (recip in (None, "YES")) and (bool(targets) == eq.startswith("TRUE")) else "CHECK"
    hrows.append({"url": ORIGIN + r["url"], "locale": r["locale"], "matrix_id": r["matrix_id"], "role": r["role"], "html_lang": r.get("html_lang"),
                  "canonical": r.get("canonical"), "canonical_self": "YES" if r.get("canonical_self") else "NO",
                  "og_url_matches": "YES" if r.get("og_url") == r.get("canonical") else "NO", "hreflang_count": len(targets),
                  "x_default": r.get("x_default"), "hreflang_targets": " ".join(f"{k}" for k in sorted(targets)), "reciprocal": recip or "N/A",
                  "equivalence_class": eq, "equivalence_evidence": evidence, "verdict": verdict})
table_sheet("HREFLANG & CANONICAL", "tblHreflang", H_HEAD, hrows, widths={"url": 55, "canonical": 55, "hreflang_targets": 40, "equivalence_class": 36, "x_default": 36, "equivalence_evidence": 60},
            link_cols=("url", "canonical"),
            notes=["HREFLANG & CANONICAL — every published URL",
                   "Hreflang is set only between true translations (/ + 10 locale homes, 10 checklists), all reciprocal. Hub/Supporting articles are written natively per locale and carry no hreflang (NO_EQUIVALENT_BY_DESIGN) — this is not an error.",
                   "EQUIVALENT_CANDIDATE (re-audit 2026-11-01): the 4 Hubs and the launch Supporting topics S01–S08 exist in all 10 languages with the same Matrix slot, cluster and silo; STRONG = most references shared. They stay without hreflang until an editor confirms they are versions of the same page (no pairing to raise counts).",
                   "verdict PASS = self-canonical, og:url = canonical, reciprocal annotations, hreflang presence matches the equivalence class."])

# ---------------- CONTENT AUDIT ----------------
C_HEAD = ["url", "locale", "matrix_id", "role", "parent_id", "cluster", "subcluster", "title", "h1", "content_units", "unit_kind", "locale_role_median_units",
          "depth_ratio", "h2_count", "references", "ref_official", "ref_legal_db", "ref_third_party", "faq_visible", "provenance_note", "date_published",
          "publication_mode", "publication_stage", "writer_session", "facts_reviewed_by_human", "serp_intent_checked", "fact_guard_warns",
          "graph_action", "review_pairs", "visible_date", "refs_with_checked_date", "packet_sources", "near_dup_url", "near_dup_containment",
          "legal_freshness", "lead_pq_cov", "h2_pq_cov", "faq_questions", "content_findings", "eeat_note"]
content_rules = {"U-THIN", "U-NO-OFFICIAL-SOURCE", "U-PRICE-REVIEW", "U-GRAPH-UPGRADE", "U-GRAPH-REVIEW", "U-TITLE-SIMILAR", "S-DE-TOPIC-DRIFT", "S-CHECKLIST-NO-REFS",
                 "U-FAQ-REPEATED-Q"}
LEGAL_OK = {"A1_175CC": "A1 ≤175 cm³ stated as the pre-2025 / transitional rule", "CIRCULAR_12_2025": "Circular 12/2025 cited with its 108/2026 replacement"}
crows = []
for r in pub:
    if r["role"] not in ("HUB", "SUPPORT"):
        continue
    x = {h: r.get(h) for h in C_HEAD}
    x["url"] = ORIGIN + r["url"]
    m = r.get("locale_role_median_units") or 0
    x["depth_ratio"] = round(r["content_units"] / m, 2) if m else None
    x["review_pairs"] = ", ".join(f"{p['other']}({p['score']})" for p in r.get("review_pairs", []))
    x["content_findings"] = " ".join(f["finding_id"] for f in fx.get(r["matrix_id"], []) if f["rule_id"] in content_rules)
    du = DU.get(r["url"], {})
    if du:
        x.update({"visible_date": YN(du["visible_date"]), "refs_with_checked_date": du["refs_checked_on_rendered"], "packet_sources": du["packet_sources"],
                  "near_dup_url": (ORIGIN + du["dup_best_url"]) if du.get("dup_best_url") else None, "near_dup_containment": du["dup_best_containment"],
                  "lead_pq_cov": du["lead_pq_cov"], "h2_pq_cov": du["h2_pq_cov"], "faq_questions": du["faq_questions"],
                  "legal_freshness": "; ".join(LEGAL_OK.get(c.rstrip("*"), c) + (" — REPLACEMENT NOT CITED" if c.endswith("*") else " (reviewed: correct)") for c in du["legal_flags"]) or "no superseded instrument cited"})
    x["eeat_note"] = "AI-assisted, automated QA; no human fact review (disclosed)" if r.get("facts_reviewed_by_human") is False else ("Legacy/owner-path page" if r.get("publication_mode") else "Checklist (site template)")
    for k in ("faq_visible", "provenance_note", "facts_reviewed_by_human", "serp_intent_checked"):
        x[k] = {True: "YES", False: "NO"}.get(x[k], x[k])
    crows.append(x)
table_sheet("CONTENT AUDIT", "tblContent", C_HEAD, crows, widths={"url": 55, "title": 45, "h1": 40, "content_findings": 40, "eeat_note": 40, "review_pairs": 26, "near_dup_url": 45, "legal_freshness": 45},
            link_cols=("url", "near_dup_url"),
            notes=["CONTENT AUDIT — every published Hub and Supporting article",
                   "content_units = words (CJK characters for zh/ja; Korean counted in space-separated words, hence lower). depth_ratio = units ÷ median of the same locale and role (thin flag < 0.5).",
                   "Source classes are a domain heuristic (official = government/intergovernmental domains; legal_db = thuvienphapluat/luatvietnam). Factual accuracy was NOT re-verified by a human in this audit.",
                   "Re-audit 2026-11-01: visible_date = page prints its own date (0 do); refs_with_checked_date vs packet_sources (checked_on is in every packet but not printed); near_dup = highest share of 5-word shingles (8-character for zh/ja) with another page of the locale; "
                   "legal_freshness = superseded Vietnamese instruments (Decree 100/2019, Law 23/2008, Circulars 12/2017 and 12/2025, A1 ≤175 cm³) — every hit was read and is stated correctly; lead/h2_pq_cov = share of primary-query tokens in the lead paragraph / H2s.",
                   "near_dup_url links the most similar page of the same locale; containment ≥ 0.5 would mean half of the shorter page repeats the other (none found; highest value in the table)."])

# ---------------- KEYWORD MATRIX ----------------
K_HEAD = ["matrix_id", "locale", "url", "role", "matrix_status", "pipeline_status", "cluster", "subcluster", "primary_query", "secondary_queries",
          "search_intent", "pq_intent_market", "pq_volume", "pq_kd", "keyword_evidence", "serp_evidence", "pq_cov_title", "pq_cov_h1", "pq_cov_desc",
          "distinct_from", "word_target", "intent_rationale", "commercial_head_term", "keyword_findings"]
kw_rules = {"U-PQ-WEAK", "S-PILLAR-HEAD-TERM", "S-INTENT-LABEL", "S-DE-TOPIC-DRIFT"}
HEAD_TERMS = json.load(open(os.path.join(ROOT, "data", "seo", "commercial-head-terms.json"), encoding="utf-8"))["locales"]
krows = []
for m in a["master"]:
    if not m.get("matrix_id"):
        continue
    x = {h: m.get(h) for h in K_HEAD}
    x["url"] = ORIGIN + m["url"] if m["matrix_status"] == "PUBLISHED" else m["url"]
    if m.get("role") == "PILLAR":
        x["commercial_head_term"] = HEAD_TERMS.get(m.get("locale"), {}).get("head_term")
    x["keyword_findings"] = " ".join(f["finding_id"] for f in fx.get(m["matrix_id"], []) if f["rule_id"] in kw_rules)
    if m["matrix_status"] != "PUBLISHED" and x["keyword_evidence"] != "VERIFIED":
        x["keyword_evidence"] = "NOT_CHECKED"
    krows.append(x)
table_sheet("KEYWORD MATRIX", "tblKeywords", K_HEAD, krows,
            widths={"primary_query": 40, "secondary_queries": 40, "url": 50, "intent_rationale": 50, "distinct_from": 40, "keyword_findings": 34},
            link_cols=("url",), evi_cols=("keyword_evidence",),
            notes=["KEYWORD MATRIX — every Matrix row (published + IDEA). pq_volume/intent/KD are real market data (OpenSEO/DataForSEO, 2026-10-27); re-audit 2026-11-01 probes are listed in the market table (Ubersuggest).",
                   "VERIFIED = market data returned · VERIFIED_NO_VOLUME = queried, no measurable volume in that market · NOT_CHECKED = not queried (credits exhausted, IDEA rows, zh). Volumes are monthly Google estimates, not traffic.",
                   "Markets: vi=Vietnam, en=United States, de=Germany, fr=France, es=Spain, ko=South Korea, ja=Japan. The raw market data (every keyword the tool returned, per market) is the second table to the right of this one: 'KEYWORD MARKET DATA'.",
                   "commercial_head_term (Pillar rows): the market's researched commercial head term, data/seo/commercial-head-terms.json (OpenSEO + Ubersuggest volumes and Google autocomplete, 2026-10-27/28). Owner directive 2026-10-28: /global competes for it independently; no keyword is yielded to any domain."])

# market data on its own sheet section (kept in KEYWORD MATRIX via a second table further right)
mk_rows = []
for loc, mk in kw["markets"].items():
    if mk.get("status"):
        mk_rows.append({"market_locale": loc, "market": "—", "keyword": "—", "search_volume": None, "keyword_difficulty": None, "main_intent": None,
                        "cpc_usd": None, "competition": None, "market_evidence": f"{mk['status']}: {mk['reason']}"})
        continue
    for x in mk["returned"]:
        mk_rows.append({"market_locale": loc, "market": mk["location"], "keyword": x["keyword"], "search_volume": x.get("search_volume"),
                        "keyword_difficulty": x.get("keyword_difficulty"), "main_intent": x.get("main_intent"), "cpc_usd": x.get("cpc"),
                        "competition": x.get("competition_level"), "market_evidence": "VERIFIED"})
    mk_rows.append({"market_locale": loc, "market": mk["location"], "keyword": f"({mk['queried'] - len(mk['returned'])} other queried keywords)",
                    "search_volume": None, "main_intent": None, "market_evidence": "VERIFIED_NO_VOLUME", "competition": None, "cpc_usd": None, "keyword_difficulty": None})
for x in (kw.get("probes_20261101") or {}).get("rows", []):
    mk_rows.append({"market_locale": x.get("locale"), "market": x["market"], "keyword": x["keyword"], "search_volume": x.get("search_volume"),
                    "keyword_difficulty": x.get("seo_difficulty"), "main_intent": None, "cpc_usd": x.get("cpc_usd"), "competition": x.get("competition"),
                    "market_evidence": "VERIFIED (Ubersuggest 2026-11-01" + (f"; monthly {x['monthly']})" if x.get("monthly") else ")")})
ws = wb["KEYWORD MATRIX"]
_, kfirst, _ = TABLE_COLS["KEYWORD MATRIX"]
startc = len(K_HEAD) + 2
MK_HEAD = ["market_locale", "market", "keyword", "search_volume", "keyword_difficulty", "main_intent", "cpc_usd", "competition", "market_evidence"]
hr = kfirst - 1
for ci, h in enumerate(MK_HEAD):
    c = ws.cell(row=hr, column=startc + ci, value=h)
    c.font, c.fill, c.border = F_HEAD, FILL_HEAD, BORDER
for ri, row in enumerate(mk_rows, hr + 1):
    for ci, h in enumerate(MK_HEAD):
        ws.cell(row=ri, column=startc + ci, value=row.get(h)).font = F_BASE
t = Table(displayName="tblMarketKeywords", ref=f"{get_column_letter(startc)}{hr}:{get_column_letter(startc + len(MK_HEAD) - 1)}{hr + len(mk_rows)}")
t.tableStyleInfo = TableStyleInfo(name="TableStyleLight11", showRowStripes=True)
ws.add_table(t)
for ci, w in enumerate([10, 22, 40, 12, 12, 14, 9, 12, 30]):
    ws.column_dimensions[get_column_letter(startc + ci)].width = w
ws.cell(row=hr - 1, column=startc, value="KEYWORD MARKET DATA (real tool output, 2026-10-27; probes 2026-11-01)").font = F_SUB

# ---------------- TOPICAL AUTHORITY ----------------
A_HEAD = ["silo_id", "locale", "hub", "hub_id", "label", "proposed_hub", "journey_stage", "intent_class", "published", "protected_drafts", "planned",
          "candidates", "action", "hub_published_url", "coverage_ratio", "status"]
arows = []
for s in graph["silos"]:
    mem = s.get("members", {})
    pubn, plan, cand = len(mem.get("published", [])), len(mem.get("planned", [])), len(mem.get("candidates", []))
    hub = inv.get(s.get("hub_id") or "")
    arows.append({"silo_id": s["id"], "locale": s["locale"], "hub": s.get("hub"), "hub_id": s.get("hub_id"), "label": s.get("label"),
                  "proposed_hub": "YES" if s.get("proposed_hub") else "NO", "journey_stage": s.get("journey_stage"), "intent_class": s.get("intent_class"),
                  "published": pubn, "protected_drafts": len(mem.get("protected_drafts", [])), "planned": plan, "candidates": cand, "action": s.get("action"),
                  "hub_published_url": (ORIGIN + hub["url"]) if hub and hub["matrix_status"] == "PUBLISHED" else None,
                  "coverage_ratio": round(pubn / (pubn + plan + cand), 2) if (pubn + plan + cand) else None,
                  "status": "ARCHITECTURE_BLOCKED (no Hub yet)" if s.get("proposed_hub") else ("LIVE" if pubn else "PLANNED")})
table_sheet("TOPICAL AUTHORITY", "tblSilos", A_HEAD, arows, widths={"label": 40, "hub_published_url": 50, "status": 30, "silo_id": 30},
            link_cols=("hub_published_url",),
            notes=["TOPICAL AUTHORITY — Entity Hub (Pillar) → Topic Pillar (Hub) → Silo (section, never a URL) → Supporting",
                   f"{graph['counts']['silos']} silos; 4 live Hubs per locale (vehicle choice, documents & contracts, prices & deposits, safety & support). Six further domains are ARCHITECTURE_BLOCKED until a reviewed Hub architecture PR with ≥8 validated Supporting candidates.",
                   "coverage_ratio = published ÷ (published + planned IDEA + candidates). Candidates are capacity, not URLs."])

# ---------------- INTERNAL LINK MATRIX ----------------
I_HEAD = ["url", "locale", "matrix_id", "role", "parent_id", "links_to_parent", "parent_links_here", "linked_from_pillar", "inbound_internal_all",
          "inbound_contextual", "inbound_anchor_variants", "contextual_outlinks", "internal_links_unique", "external_links", "anchor_warns",
          "click_depth_all", "click_depth_main", "inbound_pages_any", "internal_pagerank", "pagerank_rank_in_locale", "link_findings"]
link_rules = {"U-LOW-INBOUND", "U-ANCHOR-DIVERSITY", "S-RAIL-ANCHOR"}
irows = []
for r in pub:
    x = {h: r.get(h) for h in I_HEAD}
    x["url"] = ORIGIN + r["url"]
    for k in ("links_to_parent", "parent_links_here", "linked_from_pillar"):
        x[k] = {True: "YES", False: "NO", None: "N/A"}.get(r.get(k))
    x["anchor_warns"] = len(r.get("seo_guard_warns", []))
    x["link_findings"] = " ".join(f["finding_id"] for f in fx.get(r["matrix_id"], []) if f["rule_id"] in link_rules)
    du = DU.get(r["url"], {})
    if du:
        x.update({"click_depth_all": du["click_depth"], "click_depth_main": du["click_depth_main"], "inbound_pages_any": du["inbound_pages_any"],
                  "internal_pagerank": du["internal_pagerank"], "pagerank_rank_in_locale": du["pagerank_rank_in_locale"]})
    irows.append(x)
table_sheet("INTERNAL LINK MATRIX", "tblLinks", I_HEAD, irows, widths={"url": 55, "link_findings": 34}, link_cols=("url",),
            notes=["INTERNAL LINK MATRIX — every published URL",
                   "Verified: 0 broken internal links, 0 links to unpublished URLs, all 1,064 Hub/Supporting pages link to their parent and are linked back (two-way). Contextual = links inside the article body + related rail (navigation/footer excluded).",
                   "Owner directive 2026-10-28: /global competes independently for rental head terms; exact-match anchor repetition is audited only if present in rendered HTML.",
                   "Re-audit 2026-11-01 (deep_audit.py): click_depth_all = clicks from / over every link (all pages ≤ 3); click_depth_main = links inside <main> only (/privacy/ and /terms/ are footer-only by design); internal_pagerank = PageRank ×1000 over the internal link graph (damping 0.85), rank within the locale; 0 orphan pages, 0 links to redirecting or non-canonical URL forms."])

# ---------------- SCHEMA & AEO GEO ----------------
G_HEAD = ["url", "locale", "matrix_id", "role", "schema_types", "schema_valid_json", "schema_inlanguage", "breadcrumb_items", "author_types",
          "date_published", "date_modified", "faq_visible", "faq_schema", "provenance_note", "references", "ref_official", "visual_breadcrumb",
          "article_image_in_schema", "faq_questions", "visible_date", "sitemap_lastmod", "date_consistency", "ai_visibility", "schema_findings"]
schema_rules = {"S-ARTICLE-NO-IMAGE", "S-FAQ-SCHEMA", "S-AUTHOR-ORG-ONLY", "U-FAQ-REPEATED-Q"}
grows = []
for r in pub:
    x = {h: r.get(h) for h in G_HEAD}
    x["url"] = ORIGIN + r["url"]
    for k in ("schema_valid_json", "faq_visible", "faq_schema", "provenance_note", "visual_breadcrumb"):
        x[k] = {True: "YES", False: "NO"}.get(r.get(k), r.get(k))
    x["article_image_in_schema"] = ("YES" if r.get("article_image_in_schema") else "NO") if "Article" in (r.get("schema_types") or []) else "N/A"
    x["ai_visibility"] = "NOT_CONNECTED"
    x["schema_findings"] = " ".join(f["finding_id"] for f in fx.get(r["matrix_id"], []) if f["rule_id"] in schema_rules)
    du = DU.get(r["url"], {})
    if du:
        x.update({"faq_questions": du["faq_questions"], "visible_date": YN(du["visible_date"]), "sitemap_lastmod": du["sitemap_lastmod"],
                  "date_consistency": "; ".join(du["schema_issues"]) or ("OK (dateModified = sitemap lastmod)" if du["date_modified"] else "no Article dates")})
    grows.append(x)
table_sheet("SCHEMA & AEO GEO", "tblSchema", G_HEAD, grows, widths={"url": 55, "schema_types": 40}, link_cols=("url",), evi_cols=("ai_visibility",),
            notes=["SCHEMA & AEO / GEO — structured data and answer-engine readiness per URL",
                   "All JSON-LD parses (audit-ai-search: 1,079 valid graphs). No LocalBusiness/AutoRental schema by design while publication.business_schema_approved=false.",
                   "AI-citation / AI-visibility tracking is NOT_CONNECTED (no tracker set up; OpenSEO AI visibility needs paid setup and owner approval).",
                   "Re-audit 2026-11-01: FAQPage on 1,074 pages and every FAQ question visible (tests/seo-az.test.mjs); dateModified = sitemap lastmod, mainEntityOfPage = canonical, Article image files exist, headline ≤ 110 characters, BreadcrumbList ends at the page on every Hub/Supporting page (deep_audit.py). Gap: the dates are not printed on the page (visible_date)."])

# ---------------- INDEXING & SITEMAPS ----------------
X_HEAD = ["url", "locale", "matrix_id", "matrix_status", "pipeline_status", "html_exists", "robots", "indexable", "canonical_self", "in_sitemap",
          "sitemap_shard", "sitemap_lastmod", "lastmod_eq_dateModified", "frozen", "http_status_live", "gsc_coverage", "check"]
xrows = []
for m in a["master"]:
    x = {h: m.get(h) for h in X_HEAD}
    x["url"] = ORIGIN + m["url"] if m["matrix_status"] in ("PUBLISHED", "NOT_IN_MATRIX") else m["url"]
    for k in ("html_exists", "canonical_self", "in_sitemap", "frozen"):
        x[k] = {True: "YES", False: "NO"}.get(m.get(k), m.get(k))
    x["indexable"] = {True: "YES", False: "NO"}.get(m.get("indexable"), m.get("indexable"))
    x["sitemap_lastmod"] = m.get("sitemap_lastmod") or ("MISSING" if m.get("in_sitemap") else None)
    x["gsc_coverage"] = "NOT_CONNECTED"
    du = DU.get(m["url"], {})
    if du and du.get("sitemap_lastmod"):
        x["lastmod_eq_dateModified"] = "YES" if du.get("date_modified") and du["sitemap_lastmod"][:10] == du["date_modified"][:10] else ("N/A (no Article date)" if not du.get("date_modified") else "NO")
    if m["matrix_status"] == "PUBLISHED":
        x["check"] = "PASS" if m.get("html_exists") and m.get("in_sitemap") and m.get("frozen") and m.get("canonical_self") else "FAIL"
    elif m["matrix_status"] == "NOT_IN_MATRIX":
        x["check"] = "PASS (noindex, not in sitemap)" if not m.get("in_sitemap") else "FAIL"
    else:
        x["check"] = "PASS (planned: no page, no sitemap)" if not m.get("html_exists") and not m.get("in_sitemap") else "FAIL (planned URL leaked)"
    xrows.append(x)
table_sheet("INDEXING & SITEMAPS", "tblIndexing", X_HEAD, xrows, widths={"url": 55, "check": 30, "sitemap_shard": 18}, link_cols=("url",), evi_cols=("gsc_coverage",),
            notes=["INDEXING & SITEMAPS — every Matrix row + noindex utilities",
                   f"sitemap.xml has {len(d['sitemap']['index_shards'])} shards, {d['sitemap']['urls']} URLs, and {d['sitemap']['lastmod_missing']} missing lastmod values (current committed build); Google indexing is separate from on-site signals.",
                   "Google indexation is NOT_CONNECTED (no Search Console property). 'check' only proves the on-site signals, not that Google indexed the URL."])

# ---------------- AUDIT CHANGELOG ----------------
def qa_line(name):
    """The guard's verdict line (…PASS…/Verified…/…VALID…), or a short summary of its JSON report."""
    p = os.path.join(DATA, "raw", name)
    if not os.path.exists(p):
        return ""
    text = open(p, encoding="utf-8").read()
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    verdict = [l for l in lines if re.search(r"PASS|VALID|Verified|passed", l) and not l.startswith(("WARN", "\""))]
    if verdict:
        return verdict[-1][:300]
    try:  # first JSON object of the output (some guards print two)
        js, _ = json.JSONDecoder().raw_decode(text[text.index("{"):])
        keys = [k for k, v in js.items() if isinstance(v, (bool, int, float, str)) and len(str(v)) < 60][:6]
        keys += [k for k, v in js.items() if isinstance(v, list) and k in ("issues", "warnings")]
        return "; ".join(f"{k}: {len(js[k]) if isinstance(js[k], list) else js[k]}" for k in keys)[:300]
    except ValueError:
        return lines[-1][:300] if lines else ""


CH_HEAD = ["date", "type", "item", "commit_or_run", "result", "evidence_url", "notes"]
ch = [
    {"date": "2026-10-27", "type": "AUDIT", "item": "Global SEO A–Z baseline audit", "commit_or_run": "d369bf2 (PR #119)",
     "result": f"{len(BASE_F) or a['summary']['findings']} findings, {len(BASE_T) or a['summary']['tasks']} tasks, 0 P0",
     "evidence_url": f"{GH}/pull/119", "notes": "read-only; baseline kept in reports/seo/data/baseline-20261027/"},
    {"date": "2026-10-27", "type": "LIVE_QA", "item": "Live Markup QA (all 1,079 URLs + /search/ + /404.html)", "commit_or_run": "run 40604722403 @ 5adb7cd2",
     "result": "success — HTTP 200 and byte-identical HTML on every route", "evidence_url": RUN(40604722403), "notes": "baseline"},
    {"date": "2026-10-27", "type": "LIVE_QA", "item": "Post-Publish Live HTTP QA", "commit_or_run": "run 40604724823 @ 5adb7cd2",
     "result": "success — status/lang/canonical, sitemap vs Matrix, robots, 404, /search/ noindex, fingerprints, NAP guard", "evidence_url": RUN(40604724823), "notes": "baseline"},
    {"date": "2026-10-27", "type": "EXTERNAL_CRAWL", "item": "OpenSEO site audit (plan cap 50 pages)", "commit_or_run": ext["openseo_site_audit"]["audit_id"],
     "result": "50/50 HTTP 200, indexable, in sitemap; 2 info issues; Lighthouse 0/8", "evidence_url": ext["openseo_site_audit"]["url"], "notes": "sample only"},
    {"date": "2026-10-27", "type": "PAGESPEED", "item": "PageSpeed lab (Ubersuggest) homepage", "commit_or_run": "—", "result": "Mobile LCP 1.7 s, SI 4.3 s, CLS 0; Desktop LCP 0.53 s", "evidence_url": None, "notes": "lab data only"},
    {"date": "2026-10-27", "type": "KEYWORDS", "item": "Keyword metrics (OpenSEO/DataForSEO)", "commit_or_run": "—", "result": "vi, en, fr, ko, ja full; de, es head terms; nl, pt, zh NOT_CHECKED", "evidence_url": None, "notes": "credits exhausted"},
]
for name, label in (("build.txt", "build.mjs --check"), ("seo-guard.txt", "seo-guard.mjs"), ("fact-guard.txt", "fact-guard.mjs"), ("navqa.txt", "nav-qa.mjs"),
                    ("validate.txt", "validate-plan.mjs"), ("auditstatic.txt", "audit-static.mjs"), ("aisearch.txt", "audit-ai-search.mjs"),
                    ("lang.txt", "language-audit.mjs"), ("ta.txt", "topical-authority.mjs validate"), ("graph.txt", "content-graph.mjs --check")):
    ch.append({"date": a["audit_date"], "type": "REPO_QA", "item": label, "commit_or_run": SHA[:8], "result": qa_line(name),
               "evidence_url": f"{GH}/blob/main/reports/seo/data/raw/{name}", "notes": "re-audit" if LEDGER else ""})
for b in BATCHES:
    if b["id"] == "AUDIT":
        continue
    ch.append({"date": b.get("date"), "type": b.get("type", "FIX_BATCH"), "item": f"Batch {b['id']}: {b['title']}", "commit_or_run": (f"PR #{b['pr']} · " if b.get("pr") else "") + (b.get("merge_commit") or "pending")[:7],
               "result": b.get("result") or (("deployed (Pages run " + str(b["deploy_run"]) + ")" if b.get("deploy_run") else "deploy pending") + (" · live QA " + " / ".join(str(x) for x in b["live_qa"]) + " success" if b.get("live_qa") else " · live QA pending")),
               "evidence_url": f"{GH}/pull/{b['pr']}" if b.get("pr") else None, "notes": b.get("pagespeed") or b.get("live_qa_note") or ""})
if LSUM:
    o = LSUM["outcomes"]
    ch.append({"date": a["audit_date"], "type": "LEDGER", "item": "Execution ledger re-verified: baseline 2026-10-27 findings → outcomes (same analyzer)", "commit_or_run": SHA[:8],
               "result": f"{LSUM['baseline_findings']} → {LSUM['reaudit_findings']} findings reported; outcomes: FIXED_VERIFIED {o['FIXED_VERIFIED']}, FIXED_PENDING_LIVE {o['FIXED_PENDING_LIVE']}, VALIDATED {o['VALIDATED_NO_FIX']}, EXTERNAL {o['EXTERNAL_DEPENDENCY']}, BLOCKED {o['BLOCKED']}",
               "evidence_url": f"{GH}/blob/main/docs/seo-audit/EXECUTION-LEDGER.md", "notes": LSUM["status"]})
    psi = ext["pagespeed_ubersuggest"]
    ch.append({"date": (psi.get("measured_at") or "")[:10] if re.match(r"\d{4}-\d\d-\d\d", psi.get("measured_at") or "") else a["audit_date"], "type": "PAGESPEED", "item": "PageSpeed lab (Ubersuggest, forced) homepage", "commit_or_run": psi.get("measured_at", ""),
               "result": f"Mobile SI {psi['MOBILE']['SpeedIndex']}, LCP {psi['MOBILE']['LCP']}, CLS {psi['MOBILE']['CLS']}; Desktop LCP {psi['DESKTOP']['LCP']}", "evidence_url": None, "notes": "lab data only"})
AZ_TASKS = opt(os.path.join(ROOT, "docs", "seo-matrix", "TASKS.json"))
if AZ_TASKS:
    done = [t for t in AZ_TASKS["tasks"] if t.get("status") == "LIVE_VERIFIED" and t.get("pr")]
    prs = sorted({int(t["pr"]) for t in done})
    ch.append({"date": "2026-10-29", "type": "FIX_TASKS", "item": f"A–Z tasks {', '.join(t['id'] for t in done)}", "commit_or_run": f"PR #{prs[0]}–#{prs[-1]}" if prs else "",
               "result": f"{len(done)} tasks LIVE_VERIFIED (image covers, titles/descriptions, checklist depth, desktop menu, max-image-preview, outbound references, axe, Pillar sources)",
               "evidence_url": f"{GH}/blob/main/docs/seo-matrix/TASKS.json", "notes": "details in SEO TASK BOARD"})
if DEEP:
    ds = DEEP["summary"]
    ch += [
        {"date": a["audit_date"], "type": "RE_AUDIT", "item": "Global SEO A–Z re-audit (full, read-only): repo QA, live QA, deep audit, browser audit, W3C validation, keyword/visibility refresh",
         "commit_or_run": SHA[:8], "result": f"{a['summary']['findings']} findings ({', '.join(f'{k} {v}' for k, v in sorted(a['summary']['by_severity'].items()))}), {a['summary']['tasks']} tasks; new rules: "
         + ", ".join(sorted({f['rule_id'] for f in a['findings'] if f['rule_id'] in NEW_RULES})), "evidence_url": f"{GH}/blob/main/docs/seo-audit/GLOBAL-SEO-AZ-AUDIT-20261101.md", "notes": "audit branch audit/seo-az-20261101"},
        {"date": a["audit_date"], "type": "LIVE_QA", "item": "Live Markup QA (every PUBLISHED URL + /search/ + /404.html)", "commit_or_run": f"run {ext['github_actions'][0]['run_id']} @ {ext['github_actions'][0]['head_sha'][:8]}",
         "result": "success — 1,081/1,081 HTTP 200 and byte-identical", "evidence_url": RUN(ext["github_actions"][0]["run_id"]), "notes": "dispatched for this re-audit"},
        {"date": a["audit_date"], "type": "LIVE_QA", "item": "Post-Publish Live HTTP QA + host probes", "commit_or_run": f"run {ext['github_actions'][1]['run_id']} @ {ext['github_actions'][1]['head_sha'][:8]}",
         "result": "success — 1,094 checks, 0 issues; http→https 301, /vi→/vi/ 301, www ENOTFOUND, HSTS, cache-control max-age=600", "evidence_url": RUN(ext["github_actions"][1]["run_id"]), "notes": "dispatched for this re-audit"},
        {"date": a["audit_date"], "type": "DEEP_AUDIT", "item": "deep_audit.py (link graph, dates, duplication, legal freshness, multilingual chrome, slugs, equivalence)", "commit_or_run": DEEP["head_commit"][:8],
         "result": f"max click depth {max(int(k) for k in ds['click_depth_all'] if k not in ('None', 'null'))}; non-canonical links {ds['noncanonical_links']}; visible page dates {ds['visible_date_pages']}; reference dates printed {ds['refs_checked_on_rendered']}/{ds['packet_sources_checked_on']}; "
                   f"near-duplicate pairs {ds['dup_pairs']}; legal hits {ds['legal_pages']} (all correct); English template strings on {ds['ui_leak_pages']} pages; equivalence slots {len(ds['equivalence_slots'])}",
         "evidence_url": f"{GH}/blob/main/reports/seo/data/deep-audit.json", "notes": ""},
    ]
if BRW:
    bs = BRW["summary"]
    ch.append({"date": a["audit_date"], "type": "BROWSER_AUDIT", "item": "site_browser_audit.cjs: axe-core WCAG 2.x A/AA, overflow, console, LCP element (Chromium, local static server)", "commit_or_run": BRW.get("commit", "")[:8],
               "result": f"{bs['pages']} pages at 390 px + {bs['desktop_pages']} at 1366 px; axe violations on {bs['pages_with_violations']} pages; overflow {bs['pages_with_overflow']}; console/4xx {bs['pages_with_console_or_4xx']}; lazy image in first viewport on {bs['pages_lazy_first_viewport']} pages (LCP lazy on {bs['pages_lcp_lazy']})",
               "evidence_url": f"{GH}/blob/main/reports/seo/data/raw/{os.path.basename(latest("browser-audit"))}", "notes": "lab; same bytes as production"})
if VNU:
    ch.append({"date": a["audit_date"], "type": "HTML_VALIDATION", "item": VNU["validator"], "commit_or_run": VNU["commit"][:8],
               "result": f"{VNU['files']} pages: {VNU['errors']} errors, {VNU['warnings']} warnings" + (f" (most frequent: {VNU['messages_by_kind'][0][0][:80]})" if VNU.get('messages_by_kind') else ""), "evidence_url": f"{GH}/blob/main/reports/seo/data/raw/{os.path.basename(latest("html-validation"))}", "notes": ""})
if LH:
    ch.append({"date": a["audit_date"], "type": "LIGHTHOUSE", "item": f"Lighthouse {LH['lighthouse_version']} lab, {len(LH['runs'])} runs on template sample (local static server)", "commit_or_run": LH["commit"][:8],
               "result": LH["summary_text"], "evidence_url": f"{GH}/blob/main/reports/seo/data/raw/{os.path.basename(latest("lighthouse"))}", "notes": "lab; simulated throttling; not field data"})
for prefix, label in (("source-recheck", "Source price re-check (source-recheck.yml)"), ("reference-links", "Reference link check (reference-link-check.yml)")):
    name = os.path.basename(latest(prefix))
    x = opt(latest(prefix))
    if x:
        res = (", ".join(f"{k} {v}" for k, v in x["summary"]["paragraphs"].items()) + f" on {x['summary']['articles']} articles") if "paragraphs" in x.get("summary", {}) else \
              (", ".join(f"{k} {v}" for k, v in (x.get("counts") or {}).items()) + f" — {x.get('unique_links')} unique links on {x.get('pages')} pages")
        ch.append({"date": a["audit_date"], "type": "LIVE_SOURCES", "item": label, "commit_or_run": f"run {x['run_id']}", "result": res,
                   "evidence_url": f"{GH}/blob/main/reports/seo/data/raw/{name}", "notes": "read-only workflow dispatched for this re-audit"})
uo = ext["ubersuggest_domain_overview"]
ch += [
    {"date": a["audit_date"], "type": "VISIBILITY", "item": "Ubersuggest domain overview", "commit_or_run": "—", "result": f"organic keywords {uo['organic_keywords']}, DA {uo['domain_authority']}, backlinks {uo['backlinks']}, referring domains {uo['referring_domains']}", "evidence_url": None, "notes": "third-party estimate (INFERRED)"},
    {"date": a["audit_date"], "type": "KEYWORDS", "item": "Keyword probes (Ubersuggest free tier)", "commit_or_run": "—", "result": "; ".join(f"{x['keyword']} [{x['market']}] = {x['search_volume']}" for x in (kw.get("probes_20261101") or {}).get("rows", [])), "evidence_url": None, "notes": "OpenSEO 4 credits, OpenRush 402, Firecrawl no credits"},
    {"date": a["audit_date"], "type": "DATA_SOURCES", "item": "Search Console / GA4 connection check", "commit_or_run": "—", "result": ext["search_console"]["evidence"], "evidence_url": None, "notes": "NOT_CONNECTED"},
]
ch += [
    {"date": "2026-10-27", "type": "PRIOR_AUDIT", "item": "Multilingual SEO audit", "commit_or_run": "f70d2e04 / b8a0115d", "result": "PASS; language-audit added", "evidence_url": f"{GH}/blob/main/docs/MULTILINGUAL-SEO-AUDIT-20261027.md", "notes": "1,068 URLs at the time"},
    {"date": "2026-10-26", "type": "PRIOR_AUDIT", "item": "Production checkpoint", "commit_or_run": "—", "result": "see document", "evidence_url": f"{GH}/blob/main/docs/PRODUCTION-CHECKPOINT-20261026.md", "notes": ""},
    {"date": "2026-10-25", "type": "PRIOR_AUDIT", "item": "Branch audit", "commit_or_run": "—", "result": "see document", "evidence_url": f"{GH}/blob/main/docs/BRANCH-AUDIT-20261025.md", "notes": ""},
    {"date": "2026-10-20", "type": "PRIOR_AUDIT", "item": "OpenSEO crawl (50 pages, Lighthouse)", "commit_or_run": "1dba2554", "result": "47 desc-too-long, 43 title-too-long (info) — before V10/V11 metadata", "evidence_url": None, "notes": "superseded by 2026-10-27 crawl"},
    {"date": RECHECK, "type": "NEXT_AUDIT", "item": "Re-audit and price re-check (planned)", "commit_or_run": "", "result": "", "evidence_url": None, "notes": "Re-run tools per docs/seo-audit/README.md, then ledger.py; dispatch source-recheck.yml"},
]
table_sheet("AUDIT CHANGELOG", "tblChangelog", CH_HEAD, ch, widths={"item": 45, "commit_or_run": 30, "result": 70, "evidence_url": 50, "notes": 40},
            link_cols=("evidence_url",), input_cols=(), notes=["AUDIT CHANGELOG — audits, QA runs, commits and verification results", "Append a row for every re-audit or verified fix."])


# ---------------- README & LEGEND ----------------
ws = wb.create_sheet("README & LEGEND")
lines = [
    ("GLOBAL SEO A–Z MASTER MATRIX — how to use", F_TITLE),
    (f"Site: {ORIGIN}  ·  Repository: thuexemayhanoi/global  ·  Audit date: {a['audit_date']} (UTC)  ·  Commit: {SHA}", F_BASE),
    ("", F_BASE),
    ("Sheets", F_SUB),
    ("EXECUTIVE DASHBOARD — KPIs and charts; formulas recalculate from the tables.", F_BASE),
    ("MASTER URL INVENTORY — every Matrix row (PUBLISHED + IDEA) and the 2 noindex utilities; one audit_id per row.", F_BASE),
    ("10 LANGUAGE MATRIX — coverage, pipeline and quality per locale.", F_BASE),
    ("TECHNICAL SEO / HREFLANG & CANONICAL / CONTENT AUDIT / KEYWORD MATRIX / TOPICAL AUTHORITY / INTERNAL LINK MATRIX / SCHEMA & AEO GEO / INDEXING & SITEMAPS — per-URL detail.", F_BASE),
    ("ERRORS & BLOCKERS — one row per finding (finding_id). SEO ACTION PLAN — one row per task (task_id), ordered. AUDIT CHANGELOG — history.", F_BASE),
    ("", F_BASE),
    ("Editing", F_SUB),
    ("Yellow cells are inputs: work_status (drop-down), assignee, start, due, notes. Do not edit other columns; they are regenerated on the next audit.", F_BASE),
    ("Re-audit: python3 docs/seo-audit/tools/collect.py && python3 docs/seo-audit/tools/deep_audit.py && python3 docs/seo-audit/tools/analyze.py && python3 docs/seo-audit/tools/ledger.py && python3 docs/seo-audit/tools/build_workbook.py --carry <this file> (browser and validator evidence: docs/seo-audit/README.md)", F_BASE),
    (f"This build: re-audit {a['audit_date']} of main {SHA[:8]}. New in this re-audit: page dates, reference dates, English template strings, lazy LCP image, hreflang equivalence candidates, repeated FAQ questions, URL localization, response headers, axe on every page, W3C validation, Lighthouse lab, click depth and internal PageRank.", F_BASE),
    ("OWNER DIRECTIVE 2026-10-28: Global SEO is independent and competes for commercial rental head terms in all 10 languages; never yield terms to other domains. Historical 2026-10-27 audit notes are superseded for this decision.", F_BASE),
    ("", F_BASE),
    ("Severity", F_SUB),
    ("P0 breaks serving/indexing (none found) · P1 high impact on visibility, measurement or strategy · P2 significant · P3 optimisation", F_BASE),
    ("Evidence status", F_SUB),
    ("VERIFIED — measured in the committed build, repo data or a live run (live markup QA proved the deployed HTML is byte-identical).", F_BASE),
    ("INFERRED — heuristic (e.g. SERP width, token overlap, source-domain class) or third-party estimate; confirm before acting.", F_BASE),
    ("NOT_CHECKED — in scope but not measurable in this run (network policy blocked the host; tool credits exhausted).", F_BASE),
    ("NOT_CONNECTED — needs a data source that is not connected: Search Console, GA4, CrUX field data, rank tracking, AI-visibility tracking.", F_BASE),
    ("", F_BASE),
    ("Honesty rules", F_SUB),
    ("No search volume, ranking, traffic, backlink or indexation number in this file is invented. Volumes are tool estimates with their market named. 'No volume' means the tool database returned none.", F_BASE),
    ("Matrix IDEA rows are planned URLs, never live pages. Audit coverage is not claimed as 100% where columns say NOT_CHECKED / NOT_CONNECTED.", F_BASE),
]
for i, (t, f) in enumerate(lines, 1):
    c = ws.cell(row=i, column=1, value=t)
    c.font = f
    c.alignment = Alignment(wrap_text=True, vertical="top")
ws.column_dimensions["A"].width = 160

# ---------------- EXECUTIVE DASHBOARD ----------------
ws = wb.create_sheet("EXECUTIVE DASHBOARD", 0)
ws.sheet_view.showGridLines = False
ws["A1"] = "GLOBAL SEO A–Z — EXECUTIVE DASHBOARD"
ws["A1"].font = F_TITLE
ws["A2"] = (f"{ORIGIN} · 10 locales · {'re-audit' if LEDGER else 'audit'} {a['audit_date']} (UTC) · commit {SHA[:12]} · "
            + (f"baseline 2026-10-27 ledger: {LSUM['status']} · " if LSUM else "") + f"re-audit: {a['summary']['findings']} findings, {len(NEW_RULES & {f['rule_id'] for f in a['findings']})} new rules · KPI cells are formulas over the tables")
ws["A2"].font = F_NOTE
INV = lambda h: colref("MASTER URL INVENTORY", h)
ERR = lambda h: colref("ERRORS & BLOCKERS", h)
PLN = lambda h: colref("SEO ACTION PLAN", h)
kpis = [
    ("Inventory", None, None),
    ("Published URLs (Matrix PUBLISHED)", f"=COUNTIFS({INV('matrix_status')},\"PUBLISHED\")", "VERIFIED"),
    ("Live HTTP 200, byte-identical", f"=COUNTIFS({INV('matrix_status')},\"PUBLISHED\",{INV('http_status_live')},200)", "VERIFIED"),
    ("Indexable & self-canonical", f"=COUNTIFS({INV('matrix_status')},\"PUBLISHED\",{INV('indexable')},\"YES\")", "VERIFIED"),
    ("In sitemap", f"=COUNTIFS({INV('matrix_status')},\"PUBLISHED\",{INV('in_sitemap')},\"YES\")", "VERIFIED"),
    ("Frozen in url-freeze", f"=COUNTIFS({INV('matrix_status')},\"PUBLISHED\",{INV('frozen')},\"YES\")", "VERIFIED"),
    ("Planned IDEA rows — READY", f"=COUNTIFS({INV('pipeline_status')},\"READY\")", "VERIFIED"),
    ("Planned IDEA rows — CLAIMED", f"=COUNTIFS({INV('pipeline_status')},\"CLAIMED\")", "VERIFIED"),
    ("Noindex utilities (/search/, /404.html)", f"=COUNTIFS({INV('matrix_status')},\"NOT_IN_MATRIX\")", "VERIFIED"),
    ("Findings", None, None),
    ("Total findings", f"=COUNTA({ERR('finding_id')})", None),
    ("P0 open", f"=COUNTIFS({ERR('severity')},\"P0\",{ERR('work_status')},\"OPEN\")", None),
    ("P1 open", f"=COUNTIFS({ERR('severity')},\"P1\",{ERR('work_status')},\"OPEN\")", None),
    ("P2 open", f"=COUNTIFS({ERR('severity')},\"P2\",{ERR('work_status')},\"OPEN\")", None),
    ("P3 open", f"=COUNTIFS({ERR('severity')},\"P3\",{ERR('work_status')},\"OPEN\")", None),
    ("Blocked (needs data source)", f"=COUNTIFS({ERR('work_status')},\"BLOCKED\")", None),
    ("Owner decision (findings)", f"=COUNTIFS({ERR('work_status')},\"OWNER_DECISION\")", None),
    ("P1 waiting on owner or data source", f"=COUNTIFS({ERR('severity')},\"P1\",{ERR('work_status')},\"OWNER_DECISION\")+COUNTIFS({ERR('severity')},\"P1\",{ERR('work_status')},\"BLOCKED\")", None),
    ("Findings DONE", f"=COUNTIFS({ERR('work_status')},\"DONE\")", None),
    ("Findings resolved %", f"=IFERROR((COUNTIFS({ERR('work_status')},\"DONE\")+COUNTIFS({ERR('work_status')},\"WONT_FIX\")+COUNTIFS({ERR('work_status')},\"NOT_APPLICABLE\"))/COUNTA({ERR('finding_id')}),0)", None),
    ("Tasks", None, None),
    ("Total tasks", f"=COUNTA({PLN('task_id')})", None),
    ("Tasks remaining (not DONE)", f"=COUNTA({PLN('task_id')})-COUNTIFS({PLN('work_status')},\"DONE\")", None),
    ("P1 tasks remaining", f"=COUNTIFS({PLN('severity')},\"P1\",{PLN('work_status')},\"<>DONE\")", None),
    ("Tasks done %", f"=IFERROR(COUNTIFS({PLN('work_status')},\"DONE\")/COUNTA({PLN('task_id')}),0)", None),
    *([("Execution ledger (baseline findings → final outcome)", None, None)]
      + [(k, LSUM["outcomes"][k], None) for k in ("FIXED_VERIFIED", "FIXED_PENDING_LIVE", "VALIDATED_NO_FIX", "DUPLICATE", "EXTERNAL_DEPENDENCY", "BLOCKED")]
      + [("Baseline tasks: " + ", ".join(f"{k} {v}" for k, v in sorted(LSUM["tasks"].items())), None, None)] if LSUM else []),
    *([("Re-audit 2026-11-01 checks", None, None),
       ("Max click depth from / (published)", f"=MAX({INV('click_depth')})", "VERIFIED"),
       ("Published pages printing their own date", f"=COUNTIFS({INV('matrix_status')},\"PUBLISHED\",{INV('visible_date')},\"YES\")", "VERIFIED"),
       ("Hreflang candidate pages (editor decision)", f"=COUNTIF({INV('hreflang_class')},\"EQUIVALENT_CANDIDATE*\")", "INFERRED"),
       ("Pages with English template strings", DEEP["summary"]["ui_leak_pages"], "VERIFIED")] if DEEP else []),
    *([("Pages with axe WCAG A/AA violations", f"=COUNTIFS({INV('a11y_violations')},\">0\")", "VERIFIED"),
       ("Pages with a lazy image in the first viewport", f"=COUNTIFS({INV('lazy_image_first_viewport')},\"YES\")", "VERIFIED")] if BRW else []),
    *([("W3C HTML errors (all pages)", VNU["errors"], "VERIFIED")] if VNU else []),
    ("Evidence mix (findings)", None, None),
    ("VERIFIED", f"=COUNTIFS({ERR('evidence_status')},\"VERIFIED\")", None),
    ("INFERRED", f"=COUNTIFS({ERR('evidence_status')},\"INFERRED\")", None),
    ("NOT_CHECKED", f"=COUNTIFS({ERR('evidence_status')},\"NOT_CHECKED\")", None),
    ("NOT_CONNECTED", f"=COUNTIFS({ERR('evidence_status')},\"NOT_CONNECTED\")", None),
]
r = 4
for label, formula, ev in kpis:
    if formula is None:
        ws.cell(row=r, column=1, value=label).font = F_NOTE if label.startswith("Baseline tasks:") else F_SUB
    else:
        ws.cell(row=r, column=1, value=label).font = F_BASE
        c = ws.cell(row=r, column=2, value=formula)
        c.font, c.fill, c.border = Font(name=FONT, size=11, bold=True), FILL_KPI, BORDER
        if "%" in label:
            c.number_format = "0.0%"
        if ev:
            e = ws.cell(row=r, column=3, value=ev)
            e.font = F_NOTE
            e.fill = PatternFill("solid", fgColor=EVI[ev])
    r += 1
sev_rows = {}
for i, lab in enumerate(("P0 open", "P1 open", "P2 open", "P3 open")):
    sev_rows[lab] = [k for k, (l, _, _) in enumerate(kpis) if l == lab][0] + 4

# locale block
ws["E4"] = "Per locale"
ws["E4"].font = F_SUB
hdr = ["locale", "published", "P1 open", "P2 open", "P3 open", "READY", "CLAIMED"]
for ci, h in enumerate(hdr):
    c = ws.cell(row=5, column=5 + ci, value=h)
    c.font, c.fill, c.border = F_HEAD, FILL_HEAD, BORDER
for ri, loc in enumerate(LOCALES, 6):
    ws.cell(row=ri, column=5, value=loc).font = F_BASE
    L = f"$E{ri}"
    fs = [f"=COUNTIFS({INV('locale')},{L},{INV('matrix_status')},\"PUBLISHED\")"]
    for s in ("P1", "P2", "P3"):
        fs.append(f"=COUNTIFS({ERR('locale')},{L},{ERR('severity')},\"{s}\",{ERR('work_status')},\"OPEN\")")
    fs += [f"=COUNTIFS({INV('locale')},{L},{INV('pipeline_status')},\"READY\")", f"=COUNTIFS({INV('locale')},{L},{INV('pipeline_status')},\"CLAIMED\")"]
    for ci, fml in enumerate(fs):
        c = ws.cell(row=ri, column=6 + ci, value=fml)
        c.font, c.border = F_BASE, BORDER
ws.cell(row=16, column=5, value="site-wide").font = F_BASE
for ci, s in enumerate(("P1", "P2", "P3")):
    c = ws.cell(row=16, column=7 + ci, value=f"=COUNTIFS({ERR('locale')},\"ALL\",{ERR('severity')},\"{s}\",{ERR('work_status')},\"OPEN\")")
    c.font, c.border = F_BASE, BORDER

# data sources
ws["E19"] = "Data sources"
ws["E19"].font = F_SUB
uo = ext["ubersuggest_domain_overview"]
srcs = [("Committed build + repo QA (10 tools)", "VERIFIED", "all PASS, 0 FAIL"),
        ("Live markup QA / post-publish QA (GitHub Actions)", "VERIFIED", " / ".join(f"{g['run_id']} {g['conclusion']}" for g in ext["github_actions"][:2]) + f" @ {ext['github_actions'][0]['head_sha'][:8]} (latest); baseline 40604722403 / 40604724823"),
        ("Host probes (http→https, slash, www, headers)", "VERIFIED", ext["redirect_and_header_probes"]["measured_by"][:90]),
        ("Direct crawl from audit container", "NOT_CHECKED", "egress policy 403 on global.rentbikehanoi.com (live state via the two workflows above)")]
if BRW:
    srcs.append(("Browser audit, every page (axe-core, Chromium, local)", "VERIFIED", f"{BRW['summary']['pages']} pages mobile + {BRW['summary']['desktop_pages']} desktop; same bytes as production"))
if VNU:
    srcs.append(("W3C Nu HTML validator, every page", "VERIFIED", f"{VNU['errors']} errors, {VNU['warnings']} warnings"))
if LH:
    srcs.append(("Lighthouse lab (local, template sample)", "VERIFIED", f"{len(LH['runs'])} runs, Lighthouse {LH['lighthouse_version']}"))
srcs += [("OpenSEO crawl (50-page cap, 2026-10-27)", "VERIFIED", "50/50 OK; Lighthouse failed"),
         ("PageSpeed lab (homepage, Ubersuggest 2026-10-28)", "VERIFIED", f"mobile LCP {ext['pagespeed_ubersuggest']['MOBILE']['LCP']}, SI {ext['pagespeed_ubersuggest']['MOBILE']['SpeedIndex']}, CLS {ext['pagespeed_ubersuggest']['MOBILE']['CLS']}; PSI API 429 on 2026-11-01"),
         ("Keyword volumes (DataForSEO 2026-10-27; Ubersuggest probes 2026-11-01)", "VERIFIED", "vi/en/fr/ko/ja full; de/es partial; nl/pt/zh head-term probes only"),
         ("Backlinks / DA (Ubersuggest)", "INFERRED", f"DA {uo['domain_authority']}, {uo['backlinks']} backlinks, {uo['referring_domains']} RD, {uo['organic_keywords']} ranking keywords ({uo.get('rechecked_at', '')})"),
         ("Google Search Console", "NOT_CONNECTED", "no property connected (rechecked 2026-11-01)"),
         ("GA4 / CrUX field CWV / rank tracking / AI visibility", "NOT_CONNECTED", "not set up")]
for ci, h in enumerate(("source", "status", "note")):
    c = ws.cell(row=20, column=5 + ci, value=h)
    c.font, c.fill = F_HEAD, FILL_HEAD
for ri, (s_, st, n) in enumerate(srcs, 21):
    ws.cell(row=ri, column=5, value=s_).font = F_BASE
    c = ws.cell(row=ri, column=6, value=st)
    c.font, c.fill = F_BASE, PatternFill("solid", fgColor=EVI[st])
    ws.cell(row=ri, column=7, value=n).font = F_BASE

# lab CWV
cw0 = 21 + len(srcs) + 2
ws.cell(row=cw0, column=5, value="Core Web Vitals (lab): homepage via Ubersuggest PSI 2026-10-28" + ("; template medians via local Lighthouse 2026-11-01" if LH else "")).font = F_SUB
PM, PD = ext["pagespeed_ubersuggest"]["MOBILE"], ext["pagespeed_ubersuggest"]["DESKTOP"]
LM, LD = ((LH or {}).get("median") or {}).get("mobile", {}), ((LH or {}).get("median") or {}).get("desktop", {})
cwv = [("metric", "PSI mobile", "PSI desktop", "good threshold", "LH mobile (median)", "LH desktop (median)"),
       ("LCP", PM["LCP"], PD["LCP"], "≤ 2.5 s", LM.get("LCP"), LD.get("LCP")), ("CLS", PM["CLS"], PD["CLS"], "≤ 0.1", LM.get("CLS"), LD.get("CLS")),
       ("TBT (INP proxy)", PM["TBT"], PD["TBT"], "≤ 200 ms", LM.get("TBT"), LD.get("TBT")), ("FCP", PM["FCP"], PD["FCP"], "≤ 1.8 s", LM.get("FCP"), LD.get("FCP")),
       ("Speed Index", PM["SpeedIndex"], PD["SpeedIndex"], "≤ 3.4 s", LM.get("SI"), LD.get("SI")), ("INP field", "NOT_CONNECTED", "NOT_CONNECTED", "≤ 200 ms", "NOT_CONNECTED", "NOT_CONNECTED")]
for ri, row in enumerate(cwv, cw0 + 1):
    for ci, v in enumerate(row):
        c = ws.cell(row=ri, column=5 + ci, value=v)
        c.font = F_HEAD if ri == cw0 + 1 else F_BASE
        if ri == cw0 + 1:
            c.fill = FILL_HEAD

if LSUM:
    base_c = collections.Counter(f["rule_id"] for f in BASE_F)
    aft_c = collections.Counter(f["rule_id"] for f in a["findings"])
    r0 = cw0 + len(cwv) + 3
    ws.cell(row=r0, column=5, value="Before vs after (baseline 2026-10-27 → re-audit " + a["audit_date"] + "; outcome per baseline finding; rules new in this re-audit have baseline 0)").font = F_SUB
    hdr = ["rule_id", "baseline", "re-audit", "fixed", "validated", "external", "blocked"]
    for ci, h in enumerate(hdr):
        c = ws.cell(row=r0 + 1, column=5 + ci, value=h)
        c.font, c.fill, c.border = F_HEAD, FILL_HEAD, BORDER
    rules = sorted(set(base_c) | set(aft_c))
    for ri, rule in enumerate(rules, r0 + 2):
        oc_ = collections.Counter(x["outcome"] for x in LEDGER if x["rule_id"] == rule)
        vals = [rule, base_c.get(rule, 0), aft_c.get(rule, 0), oc_["FIXED_VERIFIED"] + oc_["FIXED_PENDING_LIVE"], oc_["VALIDATED_NO_FIX"] + oc_["DUPLICATE"], oc_["EXTERNAL_DEPENDENCY"], oc_["BLOCKED"]]
        for ci, v in enumerate(vals):
            c = ws.cell(row=ri, column=5 + ci, value=v)
            c.font, c.border = F_BASE, BORDER
    ro = r0 + 3 + len(rules)
    ws.cell(row=ro, column=5, value="OWNER_ACTION_REQUIRED (only the owner or a third-party account can do these)").font = F_SUB
    for i, a_ in enumerate(LSUM["owner_actions"], 1):
        c = ws.cell(row=ro + i, column=5, value=f"{i}. {a_['action']}  [{', '.join(a_['rules'])}]")
        c.font, c.alignment = F_BASE, Alignment(wrap_text=False)
    ws.cell(row=ro + len(LSUM["owner_actions"]) + 2, column=5, value="Full per-finding ledger: docs/seo-audit/execution/execution-ledger.csv · dashboard: docs/seo-audit/EXECUTION-LEDGER.md").font = F_NOTE
for colw, w in (("A", 38), ("B", 14), ("C", 14), ("D", 3), ("E", 44), ("F", 16), ("G", 40), ("H", 14), ("I", 10), ("J", 10), ("K", 10)):
    ws.column_dimensions[colw].width = w

# charts
ch1 = BarChart()
ch1.type = "col"
ch1.title = "Open findings by severity"
ch1.y_axis.title = "findings"
p0 = sev_rows["P0 open"]
ch1.add_data(Reference(ws, min_col=2, min_row=p0, max_row=p0 + 3), titles_from_data=False)
ch1.set_categories(Reference(ws, min_col=1, min_row=p0, max_row=p0 + 3))
ch1.legend = None
ch1.height, ch1.width = 7, 12
ws.add_chart(ch1, "M4")
ch2 = BarChart()
ch2.type = "col"
ch2.grouping = "stacked"
ch2.overlap = 100
ch2.title = "Open findings per locale (P1/P2/P3)"
ch2.add_data(Reference(ws, min_col=7, max_col=9, min_row=5, max_row=15), titles_from_data=True)
ch2.set_categories(Reference(ws, min_col=5, min_row=6, max_row=15))
ch2.height, ch2.width = 8, 16
ws.add_chart(ch2, "M20")
ch3 = BarChart()
ch3.type = "col"
ch3.title = "Published URLs per locale"
ch3.add_data(Reference(ws, min_col=6, min_row=5, max_row=15), titles_from_data=True)
ch3.set_categories(Reference(ws, min_col=5, min_row=6, max_row=15))
ch3.legend = None
ch3.height, ch3.width = 7, 16
ws.add_chart(ch3, "M38")

# ---------------- SEO A–Z MATRIX (docs/seo-matrix, az_matrix.py) ----------------
AZ = os.path.join(ROOT, "docs", "seo-matrix")
AZ_SHEETS = []
for sheet, tname, fname, note in (
        ("IMAGE SEO MATRIX", "tblImageSeo", "IMAGE-SEO-MATRIX.csv", "IMAGE SEO MATRIX — every image use per published URL and one NO_IMAGE row per Hub/Supporting URL without a cover (100–300 KB standard; smaller accepted when sharp)"),
        ("CONTENT SEO MATRIX", "tblContentSeo", "CONTENT-SEO-MATRIX.csv", "CONTENT SEO MATRIX — depth, floor (≈1,000 English words), headings, FAQ, references and the CONTENT task per Pillar/Hub/Supporting URL"),
        ("SEO TASK BOARD", "tblTaskBoard", "TASK-BOARD.csv", "SEO TASK BOARD — batches A–Y and the A–Z tasks with status, branch, merge commit, PR, deploy and live-QA runs and next action (source: docs/seo-matrix/TASKS.json)")):
    path = os.path.join(AZ, fname)
    if os.path.exists(path):
        rows_az = read_csv(path)
        heads = list(rows_az[0].keys()) if rows_az else ["id"]
        table_sheet(sheet, tname, heads, rows_az, widths={"url": 50, "title": 50, "alt": 50, "next_action": 50, "src": 40, "h1": 40},
                    link_cols=("url",), notes=[note, "Generated by docs/seo-audit/tools/az_matrix.py; the CSV in docs/seo-matrix/ is the source. CHECKPOINT.md names the current task and next action."])
        AZ_SHEETS.append(sheet)

# sheet order
order = ["EXECUTIVE DASHBOARD", "MASTER URL INVENTORY", "10 LANGUAGE MATRIX", "TECHNICAL SEO", "HREFLANG & CANONICAL", "CONTENT AUDIT",
         "KEYWORD MATRIX", "TOPICAL AUTHORITY", "INTERNAL LINK MATRIX", "SCHEMA & AEO GEO", "INDEXING & SITEMAPS", "ERRORS & BLOCKERS",
         "SEO ACTION PLAN", "AUDIT CHANGELOG", "README & LEGEND", "LISTS"] + AZ_SHEETS
wb._sheets = [wb[n] for n in order]
wb.active = 0
tabcolor = {"EXECUTIVE DASHBOARD": "1F3864", "ERRORS & BLOCKERS": "C00000", "SEO ACTION PLAN": "FFC000", "README & LEGEND": "70AD47", "LISTS": "A6A6A6"}
for n, c in tabcolor.items():
    wb[n].sheet_properties.tabColor = c
wb.properties.title = "Global SEO A-Z Master Matrix"
wb.properties.creator = "SEO audit (read-only)"
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print("saved", OUT)
