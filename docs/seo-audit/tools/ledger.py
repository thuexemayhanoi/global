#!/usr/bin/env python3
"""Global SEO A–Z execution ledger: one final outcome for every baseline finding and task.

Reads the baseline audit (reports/seo/data/baseline-20261027/findings.csv, tasks.csv), the re-audit
(reports/seo/data/findings.csv, produced by collect.py + analyze.py), the batch record
(docs/seo-audit/execution/batches.json) and the per-rule classification (docs/seo-audit/execution/outcomes.json).

A baseline finding that the re-audit no longer reports is RESOLVED: it gets the rule's resolved outcome and the
batch that fixed it; FIXED_VERIFIED only when every batch involved has a successful live QA run recorded,
otherwise FIXED_PENDING_LIVE. A finding the re-audit still reports is REMAINING and gets the rule's remaining
outcome (VALIDATED_NO_FIX, EXTERNAL_DEPENDENCY or BLOCKED) with its recorded reason.

Writes docs/seo-audit/execution/execution-ledger.csv, task-ledger.csv, ledger-summary.json and the dashboard
docs/seo-audit/EXECUTION-LEDGER.md. It never edits site content.
Usage: python3 docs/seo-audit/tools/ledger.py
"""
import collections, csv, glob, json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA = os.path.join(ROOT, "reports", "seo", "data")
EXE = os.path.join(ROOT, "docs", "seo-audit", "execution")
GH = "https://github.com/thuexemayhanoi/global"
LOCALES = ["vi", "en", "de", "fr", "es", "nl", "zh", "pt", "ko", "ja"]
FINAL = ["FIXED_VERIFIED", "FIXED_PENDING_LIVE", "VALIDATED_NO_FIX", "DUPLICATE", "EXTERNAL_DEPENDENCY", "BLOCKED"]


def rows(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key(f):
    extra = ""
    if f["rule_id"] == "U-TITLE-SIMILAR":
        m = re.match(r"vs (\S+)", f.get("detail") or "")
        extra = m.group(1) if m else ""
    return (f["rule_id"], f.get("locale") or "", f.get("url") or "", f.get("matrix_id") or "", extra)


base = rows(os.path.join(DATA, "baseline-20261027", "findings.csv"))
base_tasks = rows(os.path.join(DATA, "baseline-20261027", "tasks.csv"))
after = rows(os.path.join(DATA, "findings.csv"))
cfg = json.load(open(os.path.join(EXE, "outcomes.json"), encoding="utf-8"))
batches = {b["id"]: b for b in json.load(open(os.path.join(EXE, "batches.json"), encoding="utf-8"))["batches"]}


def reviewed(pattern):
    out = {}
    for f in sorted(glob.glob(os.path.join(EXE, pattern))):
        for r in json.load(open(f, encoding="utf-8")):
            out[r["id"]] = r
    return out


round_c = reviewed("metadata-reviews.json")
round_d2 = reviewed("metadata-reviews-d2.json")
desc_changed_c = {i for i, r in round_c.items() if r["before_description"] != r["after_description"]}
title_changed_c = {i for i, r in round_c.items() if r["before_title"] != r["after_title"]}
title_changed_d2 = set(round_d2)
price_fixed = set(cfg["overrides"]["U-PRICE-REVIEW"]["fixed_ids"])

remaining = collections.Counter(key(f) for f in after)
after_by_key = collections.defaultdict(list)
for f in after:
    after_by_key[key(f)].append(f["finding_id"])


def batch_for(f, rule):
    mid = f.get("matrix_id") or ""
    if rule == "U-DESC-SHORT" and mid in ("PRIVACY", "TERMS"):
        return ["E2"]
    if rule == "S-ARTICLE-NO-IMAGE":
        return ["B", "E1"]
    if rule == "U-PQ-WEAK":
        return ["D2"] if mid in title_changed_d2 else (["C"] if mid in title_changed_c else [])
    if rule in ("U-DESC-LONG", "U-TITLE-LONG", "U-DESC-SHORT", "U-TITLE-SIMILAR"):
        return ["C"] if (mid in round_c) else (["D2"] if mid in round_d2 else [cfg["rules"][rule]["batch"]])
    b = cfg["rules"][rule]["batch"]
    return [] if b == "-" else [b]


def verified(bs):
    return bool(bs) and all(batches.get(b, {}).get("live_qa") for b in bs)


ledger = []
for f in base:
    rule, mid = f["rule_id"], f.get("matrix_id") or ""
    rc = cfg["rules"][rule]
    k = key(f)
    present = remaining[k] > 0
    if present:
        remaining[k] -= 1
    bs = batch_for(f, rule)
    owner = rc.get("owner_action", "")
    if not present:
        outcome, reason = rc["resolved_outcome"], rc["why_resolved"]
        if outcome == "FIXED_VERIFIED" and not verified(bs):
            outcome = "FIXED_PENDING_LIVE"
        if rule == "U-PQ-WEAK" and not bs:
            outcome, reason = "VALIDATED_NO_FIX", "No longer weak after the metadata rounds changed nearby wording; no direct change to this row."
    else:
        outcome, reason = rc["remaining_outcome"], rc["why_remaining"]
        if rule == "U-DESC-LONG" and mid in desc_changed_c:
            outcome, reason, bs = "FIXED_VERIFIED", "Description shortened from over 200 to the accepted 166–200 half-width band in reviewed round C (PR #122); the >165 heuristic still counts it.", ["C"]
        elif rule == "U-PQ-WEAK" and mid in title_changed_d2:
            outcome, reason, bs = "FIXED_VERIFIED", "Title aligned with the primary query in round D2 (PR #124); the plain token heuristic still scores the synonym/variant below 0.5.", ["D2"]
        elif rule == "U-PRICE-REVIEW":
            if mid in price_fixed:
                outcome, reason, bs = "FIXED_VERIFIED", "Corrected after the 2026-10-28 source re-check (PR #125); fact-guard keeps the price WARN by design.", ["D3"]
            else:
                bs = ["D3"]
        elif rule in ("S-PRICE-FRESHNESS", "S-FAQ-SCHEMA"):
            pass
        else:
            bs = [] if outcome in ("VALIDATED_NO_FIX", "EXTERNAL_DEPENDENCY", "BLOCKED") else bs
        if outcome == "FIXED_VERIFIED" and not verified(bs):
            outcome = "FIXED_PENDING_LIVE"
    prs = [batches[b]["pr"] for b in bs if b in batches and batches[b].get("pr")]
    qa = sorted({r for b in bs for r in batches.get(b, {}).get("live_qa", [])})
    ledger.append({
        "finding_id": f["finding_id"], "rule_id": rule, "severity": f["severity"], "locale": f.get("locale"), "url": f.get("url"),
        "matrix_id": mid, "task_id": f["task_id"], "baseline_detail": f.get("detail"),
        "reaudit": "REMAINING" if present else "RESOLVED", "reaudit_finding_id": after_by_key[k][0] if present and after_by_key[k] else "",
        "outcome": outcome, "batch": "+".join(bs), "pr": " ".join(f"#{p}" for p in prs),
        "merge_commit": " ".join(batches[b]["merge_commit"][:7] for b in bs if b in batches and batches[b].get("merge_commit")),
        "live_qa_runs": " ".join(str(r) for r in qa), "reason": reason, "owner_action": owner if outcome in ("EXTERNAL_DEPENDENCY", "BLOCKED") or (owner and rule == "S-AUTHOR-ORG-ONLY") else "",
        "outcome_date": "2026-10-28"})

new_after = []  # re-audit findings left unmatched by any baseline finding
for f in after:
    if remaining[key(f)] > 0:
        remaining[key(f)] -= 1
        new_after.append(f)

# tasks
by_task = collections.defaultdict(list)
for x in ledger:
    by_task[x["task_id"]].append(x)
task_rows = []
for t in base_tasks:
    xs = by_task.get(t["task_id"], [])
    c = collections.Counter(x["outcome"] for x in xs)
    if c["BLOCKED"]:
        status = "BLOCKED"
    elif c["EXTERNAL_DEPENDENCY"]:
        status = "OWNER_DECISION"
    elif c["FIXED_PENDING_LIVE"]:
        status = "IN_PROGRESS"
    elif c["FIXED_VERIFIED"]:
        status = "DONE"
    else:
        status = "NOT_APPLICABLE"
    task_rows.append({"task_id": t["task_id"], "rule_id": t["rule_id"], "severity": t["severity"], "locale": t["locale"], "title": t["title"],
                      "findings": len(xs), **{o: c[o] for o in FINAL}, "work_status": status,
                      "batches": " ".join(sorted({x["batch"] for x in xs if x["batch"]})), "prs": " ".join(sorted({p for x in xs for p in x["pr"].split() if p})),
                      "owner_action": next((x["owner_action"] for x in xs if x["owner_action"]), "")})


def write(name, data):
    keys = list(dict.fromkeys(k for r in data for k in r))
    with open(os.path.join(EXE, name), "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=keys)
        w.writeheader()
        w.writerows(data)


write("execution-ledger.csv", ledger)
write("task-ledger.csv", task_rows)

oc = collections.Counter(x["outcome"] for x in ledger)
tc = collections.Counter(t["work_status"] for t in task_rows)
by_rule = {}
for x in ledger:
    by_rule.setdefault(x["rule_id"], collections.Counter())[x["outcome"]] += 1
loc_rows = []
for loc in LOCALES:
    xs = [x for x in ledger if x["locale"] == loc]
    c = collections.Counter(x["outcome"] for x in xs)
    loc_rows.append({"locale": loc, "baseline": len(xs), **{o: c[o] for o in FINAL},
                     "reaudit_remaining": sum(1 for f in after if f.get("locale") == loc)})
owner_actions = collections.OrderedDict()
for x in ledger:
    if x["owner_action"]:
        owner_actions.setdefault(x["owner_action"], set()).add(x["rule_id"])
pending = oc["FIXED_PENDING_LIVE"]
complete = pending == 0 and all(x["outcome"] in FINAL for x in ledger)
summary = {"generated": "2026-10-28", "baseline_findings": len(base), "baseline_tasks": len(base_tasks), "reaudit_findings": len(after),
           "new_in_reaudit": len(new_after), "outcomes": {o: oc[o] for o in FINAL}, "tasks": dict(tc),
           "fixed_total": oc["FIXED_VERIFIED"] + oc["FIXED_PENDING_LIVE"], "complete": complete,
           "status": "SEO_AZ_MATRIX_COMPLETE" if complete else "IN_PROGRESS (fixes awaiting production verification)",
           "by_rule": {r: dict(c) for r, c in sorted(by_rule.items())}, "locales": loc_rows,
           "owner_actions": [{"action": a, "rules": sorted(r)} for a, r in owner_actions.items()]}
json.dump(summary, open(os.path.join(EXE, "ledger-summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Markdown dashboard
L = []
L.append("# Global SEO A–Z — execution ledger and dashboard\n")
L.append(f"Status: **{summary['status']}** · generated {summary['generated']} · baseline audit 2026-10-27 (PR #119) · re-audit 2026-10-28 at the merged state of every batch below.\n")
L.append("Outcome per finding is computed by `docs/seo-audit/tools/ledger.py` from the baseline findings, the re-audit, "
         "`execution/batches.json` and `execution/outcomes.json`. Full rows: [`execution/execution-ledger.csv`](execution/execution-ledger.csv) "
         "(933 findings) and [`execution/task-ledger.csv`](execution/task-ledger.csv) (95 tasks). Workbook: "
         "[`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx) (sheets EXECUTION LEDGER, OWNER ACTIONS, BEFORE vs AFTER).\n")
L.append("## Outcomes\n")
L.append("| Outcome | Findings |\n|---|---:|")
for o in FINAL:
    L.append(f"| {o} | {oc[o]} |")
L.append(f"| **Total** | **{len(ledger)}** |\n")
L.append(f"Tasks: {len(task_rows)} — " + ", ".join(f"{k} {v}" for k, v in sorted(tc.items())) + ".\n")
L.append("## Before / after (same analyzer, measured rules)\n")
L.append(f"Findings: **{len(base)} → {len(after)}** reported by the re-audit; {len(new_after)} new. A finding that is still reported can be fixed "
         "(e.g. a description brought to the accepted CJK band) or validated; the outcome column decides, not the count.\n")
L.append("| Rule | Baseline | Re-audit | Outcomes |\n|---|---:|---:|---|")
base_c = collections.Counter(f["rule_id"] for f in base)
aft_c = collections.Counter(f["rule_id"] for f in after)
for r in sorted(base_c):
    L.append(f"| {r} | {base_c[r]} | {aft_c.get(r, 0)} | " + ", ".join(f"{o} {n}" for o, n in by_rule[r].most_common()) + " |")
L.append("\n## Progress by language\n")
L.append("| Locale | Baseline findings | Fixed (verified) | Fixed (pending live) | Validated | External | Blocked | Re-audit remaining |\n|---|---:|---:|---:|---:|---:|---:|---:|")
for r in loc_rows:
    L.append(f"| {r['locale']} | {r['baseline']} | {r['FIXED_VERIFIED']} | {r['FIXED_PENDING_LIVE']} | {r['VALIDATED_NO_FIX']} | {r['EXTERNAL_DEPENDENCY']} | {r['BLOCKED']} | {r['reaudit_remaining']} |")
L.append("\nSite-wide findings (locale ALL/global) are counted in the totals above, not per language.\n")
L.append("## Batches, PRs, deployments and production checks\n")
L.append("| Batch | Scope | PR | Merge | Pages deploy | Live QA |\n|---|---|---|---|---|---|")
for b in batches.values():
    qa = " ".join(f"[{r}]({GH}/actions/runs/{r})" for r in b.get("live_qa", [])) or ("n/a (read-only audit)" if b["id"] == "AUDIT" else "pending")
    dep = f"[{b['deploy_run']}]({GH}/actions/runs/{b['deploy_run']})" if b.get("deploy_run") else "pending"
    pr = f"[#{b['pr']}]({GH}/pull/{b['pr']})" if b.get("pr") else "—"
    L.append(f"| {b['id']} | {b['title']} | {pr} | {b.get('merge_commit', '')[:7] or 'pending'} | {dep} | {qa} |")
L.append("\n## OWNER_ACTION_REQUIRED\n")
for i, (a, r) in enumerate(owner_actions.items(), 1):
    L.append(f"{i}. {a} _(rules: {', '.join(sorted(r))})_")
L.append("\n## Verification limits\n")
for line in [
    "The audit container cannot reach global.rentbikehanoi.com (egress 403); production is verified by the repository's read-only GitHub Actions (live-markup-qa: every PUBLISHED URL byte-identical to the build; post-publish-qa: status, canonical, sitemap, fingerprints, NAP guard, host probes).",
    "No Google Search Console, GA4 or CrUX data is connected: indexation, impressions, rankings and field Core Web Vitals are NOT_CONNECTED. PageSpeed figures are lab data (Ubersuggest/Lighthouse).",
    "Keyword volumes exist only for the markets the tools returned (vi, en, fr, ko, ja full; de, es head terms); nl, pt and zh demand is NOT_CHECKED.",
    "Third-party prices were verified on 2026-10-28; shops change them. source-recheck.yml re-runs the check; fact-guard keeps a standing WARN.",
    "Authority/backlink figures are a third-party index estimate (Ubersuggest), not Google data; visibility changes need weeks after indexing.",
]:
    L.append(f"- {line}")
open(os.path.join(ROOT, "docs", "seo-audit", "EXECUTION-LEDGER.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print(json.dumps({k: summary[k] for k in ("baseline_findings", "reaudit_findings", "new_in_reaudit", "outcomes", "tasks", "status")}, indent=1))
