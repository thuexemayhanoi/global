#!/usr/bin/env python3
"""Verify that the current Global SEO execution exports honor the owner's independent strategy.

Read-only validator; never rewrites any Matrix, site content, or workbook.
"""
import csv
import json
import pathlib
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
REPORT = ROOT / "reports/seo"
FORBIDDEN = (
    "transactional rental keywords belong to the commercial sites",
    "keep the rental head term on thuexemaynguyentu.com",
    "no /global page competes for the sister sites",
    "re-target each pillar to an informational",
    "policy assigns to the sister rental sites",
    "owner decides the domain split",
    "no /global page competes for the",
)

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def scan(value, where):
    lowered = str(value).casefold()
    for stale in FORBIDDEN:
        check(stale not in lowered, f"Legacy instruction in {where}: {stale}")

policy = json.loads((ROOT / "approvals/owner-directive-20261028-independent-seo.json").read_text())
check(policy.get("seo_execution", {}).get("authorized") is True, "Owner directive must authorize SEO execution")
matrix = json.loads((ROOT / "data/seo/master-matrix.json").read_text())
pillars = [r for r in matrix["rows"] if r.get("role") == "PILLAR" and r.get("status") == "PUBLISHED"]
check(len(pillars) == 10, f"Expected 10 published Pillars, found {len(pillars)}")
check({r["locale"] for r in pillars} == set("vi en de fr es nl zh pt ko ja".split()), "All 10 locales required")
check(all(r.get("search_intent") in ("commercial", "commercial_investigation", "transactional") for r in pillars), "Pillar intent must support commercial keyword competition")
for path in ("tasks.csv", "findings.csv", "audit-master-matrix.csv"):
    file = REPORT / "data" / path
    with file.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        n = 0
        for row in reader:
            n += 1
            check(row.get("rule_id") != "S-PILLAR-TRANSACTIONAL", f"Deprecated cross-site rule found in {path}")
            for key in ("title", "action", "expected_result", "done_criteria", "detail", "verification"):
                if row.get(key):
                    scan(row[key], f"{path}:{n}:{key}")
    check(n > 0, f"{path} unexpectedly empty")
analysis = json.loads((REPORT / "data/analysis.json").read_text())
check(len(analysis["tasks"]) > 0, "No tasks: audit generation failed?")
check(all(f["rule_id"] != "S-PILLAR-TRANSACTIONAL" for f in analysis["findings"]), "Owner-superseded rule remains in findings")
workbook = REPORT / "GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx"
with zipfile.ZipFile(workbook) as z:
    sheetroot = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheets = sheetroot.findall(".//x:sheet", ns)
    names = [sh.get("name") for sh in sheets]
    az_sheets = ["IMAGE SEO MATRIX", "CONTENT SEO MATRIX", "SEO TASK BOARD"]
    check(len([n for n in names if n not in az_sheets]) == 16, f"Expected the original 16 sheets, found {names}")
    check(all(n in names for n in az_sheets), "SEO A–Z matrix sheets missing (docs/seo-matrix, az_matrix.py)")
    for name in z.namelist():
        if name == "xl/sharedStrings.xml" or name.startswith("xl/worksheets/sheet") and name.endswith(".xml"):
            raw = z.read(name).decode("utf-8")
            scan(raw, name)
            check("S-PILLAR-TRANSACTIONAL" not in raw, f"Old cross-domain task in {name}")
print(f"PASS: owner-independent strategy, {len(pillars)} Pillars, {len(analysis['findings'])} findings, {len(analysis['tasks'])} active tasks, {len(sheets)} Excel sheets (16 + {len(az_sheets)} A–Z matrix sheets)")
