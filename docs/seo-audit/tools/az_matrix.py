#!/usr/bin/env python3
"""SEO A–Z working matrices: one row per published URL, per image use and per content page, plus the task board
and the resume checkpoint, written to docs/seo-matrix/ so the programme state lives on GitHub, not in a session.

Inputs (all in the repository):
  reports/seo/data/audit-master-matrix.csv   per-URL audit facts (collect.py)
  data/seo/master-matrix.json                Matrix roles, clusters, primary queries
  data/seo/image-covers.json                 reviewed cover images (optional until the first image batch)
  docs/seo-matrix/TASKS.json                 hand-maintained task board (statuses, branches, PRs, runs, next actions)
  docs/seo-audit/execution/batches.json      earlier batches A–Y (imported as history)
  built HTML pages and image files           <img>, og:image, file bytes and pixel size (WebP/PNG/JPEG headers)

Usage:  python3 docs/seo-audit/tools/az_matrix.py [--check]
        --check exits 1 when a committed matrix file differs from a fresh generation.
"""
import csv
import io
import json
import os
import re
import struct
import sys
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "docs", "seo-matrix")


def _default_date():
    """The run date: AUDIT_DATE, else the date of the committed checkpoint (keeps --check reproducible)."""
    cp = os.path.join(OUT, "CHECKPOINT.json")
    if os.path.exists(cp):
        with open(cp, encoding="utf-8") as fh:
            return json.load(fh).get("generated", "")
    return ""


AUDIT_DATE = os.environ.get("AUDIT_DATE") or _default_date()
STATUSES = ["TODO", "IN_PROGRESS", "FIXED", "MERGED", "DEPLOYED", "LIVE_VERIFIED", "BLOCKED"]
DONE = {"LIVE_VERIFIED"}
OPEN = {"IN_PROGRESS", "FIXED", "MERGED", "DEPLOYED"}
CJK = {"zh", "ja", "ko"}
LATIN = {"vi", "en", "de", "fr", "es", "nl", "pt"}
# Content depth below which a Supporting page is an upgrade candidate (≈1,000 English words).
CONTENT_FLOOR = {"words": 1000, "ko_words": 750, "cjk_chars": 1500}
IMG_MAX, IMG_MIN = 300 * 1024, 100 * 1024


def rel(*p):
    return os.path.join(ROOT, *p)


def load_json(path, default=None):
    p = rel(path)
    if not os.path.exists(p):
        return default
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def page_file(url):
    return rel("index.html") if url == "/" else rel(url.lstrip("/"), "index.html")


def image_info(src, cache={}):
    """Format, pixel size and bytes of a local image, read from its header (no imaging library needed)."""
    if src in cache:
        return cache[src]
    path = rel(src.split("?")[0].lstrip("/"))
    info = {"file": src, "exists": os.path.exists(path), "bytes": 0, "format": "", "width": 0, "height": 0}
    if info["exists"]:
        info["bytes"] = os.path.getsize(path)
        with open(path, "rb") as fh:
            head = fh.read(64)
        if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
            info["format"] = "webp"
            kind = head[12:16]
            if kind == b"VP8X":
                info["width"] = 1 + int.from_bytes(head[24:27], "little")
                info["height"] = 1 + int.from_bytes(head[27:30], "little")
            elif kind == b"VP8 ":
                info["width"], info["height"] = (struct.unpack("<HH", head[26:30])[0] & 0x3FFF, struct.unpack("<HH", head[26:30])[1] & 0x3FFF)
            elif kind == b"VP8L":
                b = int.from_bytes(head[21:25], "little")
                info["width"], info["height"] = (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
        elif head[:8] == b"\x89PNG\r\n\x1a\n":
            info["format"], (info["width"], info["height"]) = "png", struct.unpack(">II", head[16:24])
        elif head[:2] == b"\xff\xd8":
            info["format"] = "jpeg"
        elif path.endswith(".svg"):
            info["format"] = "svg"
        elif head[4:12] in (b"ftypavif", b"ftypavis"):
            info["format"] = "avif"
    cache[src] = info
    return info


ATTR = re.compile(r'([a-zA-Z_:-]+)\s*=\s*"([^"]*)"')


def page_images(html):
    imgs = []
    for m in re.finditer(r"<img\b[^>]*>", html):
        a = dict(ATTR.findall(m.group(0)))
        a["_alt_present"] = " alt=" in m.group(0)
        start = html.rfind("<figure", 0, m.start())
        a["_cover"] = start >= 0 and 'class="article-cover"' in html[start:m.start()] and "</figure>" not in html[start:m.start()]
        imgs.append(a)
    og = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    return imgs, (og.group(1) if og else "")


def text_units(s):
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in s)


NARROW, WIDE = set("ijlrtfI.,;:!'|()[] "), set("mwMW@%")


def title_px(s):
    """Rough Arial 20 px width of a SERP title (Google truncates near 600 px)."""
    px = 0.0
    for ch in s:
        if unicodedata.east_asian_width(ch) in ("W", "F"):
            px += 20
        elif ch in NARROW:
            px += 5.6
        elif ch in WIDE:
            px += 16
        elif ch.isupper() or ch.isdigit():
            px += 12.5
        else:
            px += 10.2
    return round(px)


def title_check(title, locale):
    px, n = title_px(title), len(title)
    if px > 600:
        return "LONG_TRUNCATION_RISK", px
    if (locale in CJK and n < 15) or (locale not in CJK and n < 45):
        return "SHORT_REVIEW", px
    return "OK", px


def desc_check(desc, locale):
    n = len(desc)
    if locale in CJK:
        return ("SHORT_REVIEW" if n < 60 else "LONG_REVIEW" if n > 120 else "OK"), n
    return ("SHORT" if n < 120 else "SHORT_REVIEW" if n < 140 else "LONG_REVIEW" if n > 160 else "OK"), n


def content_check(row):
    if row["role"] not in ("SUPPORT", "HUB"):
        return "NOT_FORCED", ""
    units, kind = int(float(row.get("content_units") or 0)), row.get("unit_kind")
    floor = CONTENT_FLOOR["cjk_chars"] if kind == "cjk_chars" else CONTENT_FLOOR["ko_words"] if row["locale"] == "ko" else CONTENT_FLOOR["words"]
    return ("UPGRADE_TODO" if units < floor else "OK"), floor


def size_check(info):
    if not info["exists"]:
        return "MISSING_FILE"
    if info["bytes"] > IMG_MAX:
        return "OVER_300KB"
    return "OK_100_300KB" if info["bytes"] >= IMG_MIN else "OK_UNDER_100KB"


def task_status(t):
    if t.get("status") == "BLOCKED":
        return "BLOCKED"
    if t.get("live_qa"):
        return "LIVE_VERIFIED"
    if t.get("deploy_run"):
        return "DEPLOYED"
    if t.get("commit"):
        return "MERGED"
    return t.get("status") or "TODO"


def build():
    audit = [r for r in csv.DictReader(io.open(rel("reports", "seo", "data", "audit-master-matrix.csv"), encoding="utf-8-sig")) if r["matrix_status"] == "PUBLISHED"]
    mrows = {r["id"]: r for r in load_json("data/seo/master-matrix.json")["rows"]}
    covers = (load_json("data/seo/image-covers.json", {"covers": {}}) or {}).get("covers", {})
    board = load_json("docs/seo-matrix/TASKS.json")
    tasks = board["tasks"]
    for t in tasks:
        t["status"] = task_status(t)
        if t["status"] not in STATUSES:
            raise SystemExit(f"Unknown status {t['status']} in {t['id']}")
    history = []
    for b in load_json("docs/seo-audit/execution/batches.json")["batches"]:
        history.append({"id": "AZ-" + b["id"], "phase": "HISTORY", "title": b["title"], "scope": "", "status": task_status({"live_qa": b.get("live_qa"), "deploy_run": b.get("deploy_run"), "commit": b.get("merge_commit"), "status": "FIXED" if b.get("pr") else "TODO"}),
                        "branch": "", "commit": b.get("merge_commit") or "", "pr": b.get("pr") or "", "deploy_run": b.get("deploy_run") or "", "live_qa": b.get("live_qa") or [], "evidence": "docs/seo-audit/execution/batches.json", "next_action": ""})
    by_scope = {}
    for t in tasks:
        if isinstance(t.get("scope"), list):
            for mid in t["scope"]:
                by_scope.setdefault((t["phase"], mid), t)
    phase_task = {p: next((t for t in tasks if t["id"] == i), None) for p, i in (("META-L", "META-01"), ("META-C", "META-02"), ("CONTENT", "CONTENT-01"), ("TECH", "TECH-02"), ("ROBOTS", "TECH-01"))}

    master, images, content = [], [], []
    for r in sorted(audit, key=lambda r: (r["locale"], r["role"], r["matrix_id"])):
        mid, loc, url = r["matrix_id"], r["locale"], r["url"]
        html = open(page_file(url), encoding="utf-8").read() if os.path.exists(page_file(url)) else ""
        imgs, og = page_images(html)
        cover = covers.get(mid)
        itask = by_scope.get(("IMG", mid))
        # ---- images of this URL ----
        cover_img = next((a for a in imgs if a.get("_cover")), None)
        for a in imgs:
            info = image_info(a.get("src", ""))
            role = "cover" if a.get("_cover") else ("hero" if "hero" in a.get("src", "") else "topic-card")
            alt = a.get("alt", "")
            alt_check = "OK" if alt.strip() else ("MISSING_ATTR" if not a["_alt_present"] else "EMPTY")
            t = itask if role == "cover" else None if role == "hero" else next((x for x in tasks if x["id"] == "IMG-00"), None)
            ok = alt_check == "OK" and size_check(info) != "OVER_300KB" and info["exists"]
            images.append({"matrix_id": mid, "locale": loc, "url": url, "image_role": role, "src": a.get("src", ""), "format": info["format"], "width": info["width"], "height": info["height"],
                           "bytes": info["bytes"], "kb": round(info["bytes"] / 1024, 1), "size_check": size_check(info), "alt": alt, "alt_check": alt_check,
                           "srcset": a.get("srcset", ""), "sizes": a.get("sizes", ""), "width_attr": a.get("width", ""), "height_attr": a.get("height", ""),
                           "loading": a.get("loading", "eager"), "decoding": a.get("decoding", ""), "fetchpriority": a.get("fetchpriority", ""),
                           "task": (t or {}).get("id", ""), "status": ((t or {}).get("status", "") if (t and t["status"] in OPEN | DONE) else ("OK" if ok else (t or {}).get("status", "TODO"))),
                           "next_action": "" if ok and (not t or t["status"] in DONE) else ((t or {}).get("next_action", "") if t else "")})
        if r["role"] in ("SUPPORT", "HUB") and not cover_img:
            images.append({"matrix_id": mid, "locale": loc, "url": url, "image_role": "cover", "src": "", "format": "", "width": 0, "height": 0, "bytes": 0, "kb": 0,
                           "size_check": "NO_IMAGE", "alt": "", "alt_check": "NO_IMAGE", "srcset": "", "sizes": "", "width_attr": "", "height_attr": "", "loading": "", "decoding": "",
                           "fetchpriority": "", "task": (itask or {}).get("id", ""), "status": (itask or {}).get("status", "TODO"), "next_action": (itask or {}).get("next_action", "")})
        og_info = image_info(og.replace("https://global.rentbikehanoi.com", "")) if og else {"width": 0, "height": 0, "bytes": 0}
        og_check = "UNIQUE_COVER" if cover and og.endswith(cover["src"]) else ("SHARED_TOPIC_IMAGE" if og else "MISSING")
        if r["role"] in ("SUPPORT", "HUB"):
            img_state = "OK" if cover_img and og_check == "UNIQUE_COVER" else "TODO"
            img_status = (itask or {}).get("status", "TODO") if img_state != "OK" or (itask and itask["status"] in OPEN | DONE) else "OK"
            img_task = (itask or {}).get("id", "")
        elif r["role"] in ("PILLAR", "LANGUAGE_SELECTOR"):
            t0 = next((x for x in tasks if x["id"] == "IMG-00"), None)
            empty = sum(1 for a in imgs if not a.get("alt", "").strip())
            img_status, img_task = (("OK" if not empty and t0["status"] not in OPEN else t0["status"]) if empty == 0 else t0["status"]), "IMG-00"
        else:
            img_status, img_task = "NOT_NEEDED", ""
        # ---- metadata ----
        tc, tpx = title_check(r["title"], loc)
        dc, dlen = desc_check(r["description"], loc)
        mt = phase_task["META-C" if loc in CJK else "META-L"]
        meta_ok = tc == "OK" and dc == "OK"
        meta_status = "NOT_FORCED" if r["role"] in ("UTILITY", "LANGUAGE_SELECTOR") else ("OK" if meta_ok else mt["status"])
        # ---- content ----
        cc, floor = content_check(r)
        ct = phase_task["CONTENT"]
        content_status = cc if cc == "NOT_FORCED" else ("OK" if cc == "OK" else ct["status"])
        # ---- technical ----
        issues = []
        if r["canonical_count"] != "1":
            issues.append("canonical_count=" + r["canonical_count"])
        if r["h1_count"] != "1":
            issues.append("h1_count=" + r["h1_count"])
        if r["heading_skips"] not in ("0", ""):
            issues.append("heading_skips=" + r["heading_skips"])
        if r["schema_valid_json"] != "True":
            issues.append("schema_invalid")
        if r["in_sitemap"] != "True" and r["robots"].startswith("index"):
            issues.append("not_in_sitemap")
        for k in ("img_missing_alt_attr", "img_no_dimensions", "duplicate_ids", "empty_anchors", "head_blocking_js"):
            if r.get(k) not in ("0", "", None):
                issues.append(f"{k}={r[k]}")
        if "max-image-preview:large" not in html and r["robots"].startswith("index"):
            issues.append("no_max_image_preview_large")
        robots_t = phase_task["ROBOTS"]
        tech_status = "OK" if not issues else ("OK" if issues == ["no_max_image_preview_large"] and robots_t["status"] in OPEN | DONE else robots_t["status"] if issues == ["no_max_image_preview_large"] else phase_task["TECH"]["status"])
        # ---- next action: first open phase in programme order ----
        steps = [("IMG", img_status, img_task), ("META", meta_status, mt["id"]), ("CONTENT", content_status, ct["id"]), ("TECH", tech_status, robots_t["id"] if issues == ["no_max_image_preview_large"] else phase_task["TECH"]["id"])]
        nxt = next(((p, s, tid) for p, s, tid in steps if s not in ("OK", "NOT_FORCED", "NOT_NEEDED", "LIVE_VERIFIED")), None)
        tmap = {t["id"]: t for t in tasks}
        if nxt:
            t = tmap.get(nxt[2], {})
            overall, next_action = nxt[1], f"{nxt[2]}: {t.get('next_action', '')}"
            branch, commit, pr, runs = t.get("branch") or "", t.get("commit") or "", t.get("pr") or "", " ".join(str(x) for x in ([t.get("deploy_run")] if t.get("deploy_run") else []) + list(t.get("live_qa") or []))
        else:
            overall, next_action, branch, commit, pr, runs = "LIVE_VERIFIED" if any(s == "LIVE_VERIFIED" for _, s, _ in steps) else "OK", "MONITOR: no open on-page task; indexing and rankings are unmeasured (Search Console not connected)", "", "", "", ""
        mrow = mrows.get(mid, {})
        master.append({"matrix_id": mid, "locale": loc, "url": url, "role": r["role"], "cluster": mrow.get("cluster", r.get("cluster", "")), "primary_query": r["primary_query"], "search_intent": r["search_intent"],
                       "title": r["title"], "title_chars": len(r["title"]), "title_px_est": tpx, "title_check": tc, "description": r["description"], "desc_chars": dlen, "desc_check": dc,
                       "h1": r["h1"], "h2_count": r["h2_count"], "h3_count": r["h3_count"], "content_units": r["content_units"], "unit_kind": r["unit_kind"], "content_check": cc,
                       "faq_visible": r["faq_visible"], "faq_schema": r["faq_schema"], "internal_links_unique": r["internal_links_unique"], "references": r["references"],
                       "featured_image": cover_img.get("src", "") if cover_img else "", "image_count": len(imgs), "og_image": og, "og_image_px": f"{og_info['width']}x{og_info['height']}", "og_check": og_check,
                       "tech_issues": ";".join(issues), "priority": r["priority"], "img_task": img_task, "img_status": img_status, "meta_task": mt["id"], "meta_status": meta_status,
                       "content_task": ct["id"], "content_status": content_status, "tech_status": tech_status, "status": overall, "branch": branch, "commit": commit, "pr": pr, "actions": runs,
                       "qa_evidence": "live-markup-qa + post-publish-qa runs in 'actions'" if runs else "", "next_action": next_action})
        if r["role"] in ("SUPPORT", "HUB", "PILLAR"):
            content.append({"matrix_id": mid, "locale": loc, "url": url, "role": r["role"], "primary_query": r["primary_query"], "search_intent": r["search_intent"], "h1": r["h1"],
                            "content_units": r["content_units"], "unit_kind": r["unit_kind"], "floor": floor, "content_check": cc, "h2_count": r["h2_count"], "h3_count": r["h3_count"],
                            "faq_visible": r["faq_visible"], "references": r["references"], "ref_official": r["ref_official"], "internal_links_unique": r["internal_links_unique"],
                            "graph_action": r["graph_action"], "task": ct["id"] if cc == "UPGRADE_TODO" else "", "status": content_status,
                            "next_action": (ct["next_action"] if cc == "UPGRADE_TODO" else ("Pillar depth is judged by the content graph (KEEP), not by a word floor" if cc == "NOT_FORCED" else ""))})
    board_rows = history + tasks
    counts = {}
    for t in board_rows:
        counts.setdefault(t["phase"], {}).setdefault(t["status"], 0)
        counts[t["phase"]][t["status"]] += 1
    url_counts = {k: {} for k in ("img_status", "meta_status", "content_status", "tech_status", "status")}
    for m in master:
        for k in url_counts:
            url_counts[k][m[k]] = url_counts[k].get(m[k], 0) + 1
    order = {p: i for i, p in enumerate(["MATRIX", "IMG", "TECH", "META", "CONTENT"])}
    current = next((t for t in tasks if t["status"] in OPEN), None) or next((t for t in tasks if t["status"] == "TODO"), None)
    after = [t for t in tasks if t["status"] == "TODO" and t is not current]
    checkpoint = {"generated": AUDIT_DATE, "programme": "Finish open work → push Matrix → image SEO → title/meta → content upgrade → technical SEO; QA → merge → deploy → live verification → Matrix sync",
                  "resume_rule": "On 'tiếp tục': read docs/seo-matrix/CHECKPOINT.json and TASKS.json on main, check the current task's branch/PR/CI/deploy, finish it, then take next_todo. Never redo LIVE_VERIFIED tasks.",
                  "current_task": {k: current.get(k) for k in ("id", "phase", "title", "status", "branch", "commit", "pr", "deploy_run", "live_qa", "next_action")} if current else None,
                  "next_todo": [{"id": t["id"], "title": t["title"], "next_action": t["next_action"]} for t in after[:5]],
                  "blocked": [t["id"] for t in tasks if t["status"] == "BLOCKED"], "owner_actions": "docs/seo-audit/OWNER-ACTIONS.md (OWNER_ACTIONS_LAST)",
                  "task_counts": counts, "url_counts": url_counts,
                  "standards": {"image_bytes": "100–300 KB per main image (smaller accepted when sharp; responsive variants are smaller by design; over 300 KB must be re-encoded or justified)",
                                "image_format": "WebP (AVIF optional)", "title": "fits ~600 px (≈50–65 Latin characters, ≈30 CJK characters); short titles reviewed, never padded",
                                "description": "140–160 characters (Latin); 60–120 characters (zh/ja/ko)", "content_floor": CONTENT_FLOOR}}
    return master, images, content, board_rows, checkpoint


def to_csv(rows, headers):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore", lineterminator="\n")
    w.writeheader()
    for r in rows:
        w.writerow({k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v) for k, v in r.items()})
    return buf.getvalue()


def checkpoint_md(cp):
    c = cp["current_task"] or {}
    lines = ["# SEO A–Z checkpoint", "", f"Generated {cp['generated']} by `docs/seo-audit/tools/az_matrix.py` from `TASKS.json`. GitHub (main) is the source of truth.", "",
             "## Current task", "", f"- **{c.get('id')}** ({c.get('phase')}): {c.get('title')}", f"- Status: **{c.get('status')}** · branch `{c.get('branch') or '-'}` · PR {('#' + str(c['pr'])) if c.get('pr') else '-'} · merge `{(c.get('commit') or '-')[:7]}` · deploy {c.get('deploy_run') or '-'} · live QA {' '.join(map(str, c.get('live_qa') or [])) or '-'}",
             f"- NEXT_ACTION: {c.get('next_action')}", "", "## Next TODO", ""]
    lines += [f"{i}. **{t['id']}**: {t['title']}" for i, t in enumerate(cp["next_todo"], 1)] or ["(none)"]
    lines += ["", "## URL status counts", "", "| Dimension | " + " | ".join(STATUSES + ["OK", "NOT_FORCED", "NOT_NEEDED"]) + " |", "|---|" + "---|" * (len(STATUSES) + 3)]
    for k, v in cp["url_counts"].items():
        lines.append(f"| {k} | " + " | ".join(str(v.get(s, 0)) for s in STATUSES + ["OK", "NOT_FORCED", "NOT_NEEDED"]) + " |")
    lines += ["", "## Task board counts", "", "| Phase | " + " | ".join(STATUSES) + " |", "|---|" + "---|" * len(STATUSES)]
    for p, v in cp["task_counts"].items():
        lines.append(f"| {p} | " + " | ".join(str(v.get(s, 0)) for s in STATUSES) + " |")
    lines += ["", "## Resume rule", "", cp["resume_rule"], "", "Blocked tasks: " + (", ".join(cp["blocked"]) or "none") + ". Owner-only items: " + cp["owner_actions"] + ".", ""]
    return "\n".join(lines)


MASTER_H = ["matrix_id", "locale", "url", "role", "cluster", "primary_query", "search_intent", "title", "title_chars", "title_px_est", "title_check", "description", "desc_chars", "desc_check",
            "h1", "h2_count", "h3_count", "content_units", "unit_kind", "content_check", "faq_visible", "faq_schema", "internal_links_unique", "references", "featured_image", "image_count",
            "og_image", "og_image_px", "og_check", "tech_issues", "priority", "img_task", "img_status", "meta_task", "meta_status", "content_task", "content_status", "tech_status", "status",
            "branch", "commit", "pr", "actions", "qa_evidence", "next_action"]
IMAGE_H = ["matrix_id", "locale", "url", "image_role", "src", "format", "width", "height", "bytes", "kb", "size_check", "alt", "alt_check", "srcset", "sizes", "width_attr", "height_attr",
           "loading", "decoding", "fetchpriority", "task", "status", "next_action"]
CONTENT_H = ["matrix_id", "locale", "url", "role", "primary_query", "search_intent", "h1", "content_units", "unit_kind", "floor", "content_check", "h2_count", "h3_count", "faq_visible",
             "references", "ref_official", "internal_links_unique", "graph_action", "task", "status", "next_action"]
TASK_H = ["id", "phase", "title", "status", "scope_urls", "branch", "commit", "pr", "deploy_run", "live_qa", "evidence", "next_action"]


def outputs():
    master, images, content, board, cp = build()
    for t in board:
        t["scope_urls"] = len(t["scope"]) if isinstance(t.get("scope"), list) else t.get("scope", "")
    return {"MASTER-SEO-MATRIX.csv": to_csv(master, MASTER_H), "IMAGE-SEO-MATRIX.csv": to_csv(images, IMAGE_H), "CONTENT-SEO-MATRIX.csv": to_csv(content, CONTENT_H),
            "TASK-BOARD.csv": to_csv(board, TASK_H), "CHECKPOINT.json": json.dumps(cp, ensure_ascii=False, indent=1) + "\n", "CHECKPOINT.md": checkpoint_md(cp)}


if __name__ == "__main__":
    files = outputs()
    if "--check" in sys.argv:
        stale = [n for n, body in files.items() if not os.path.exists(os.path.join(OUT, n)) or open(os.path.join(OUT, n), encoding="utf-8").read() != body]
        print("AZ_MATRIX_STALE " + ", ".join(stale) if stale else "AZ_MATRIX_FRESH")
        sys.exit(1 if stale else 0)
    os.makedirs(OUT, exist_ok=True)
    for n, body in files.items():
        with open(os.path.join(OUT, n), "w", encoding="utf-8") as fh:
            fh.write(body)
    cp = json.loads(files["CHECKPOINT.json"])
    print("AZ_MATRIX_WRITTEN", json.dumps({"urls": sum(cp["url_counts"]["status"].values()), "current": (cp["current_task"] or {}).get("id"), "url_status": cp["url_counts"]["status"]}, ensure_ascii=False))
