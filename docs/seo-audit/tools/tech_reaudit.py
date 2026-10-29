#!/usr/bin/env python3
"""TECH-02 static technical sweep of the built site (read-only): canonical, hreflang reciprocity and target checks, sitemap/robots
consistency, duplicate title/description/H1, internal and fragment links, og/twitter tags, JSON-LD (Article fields, visible FAQ,
breadcrumb items, schema URLs). Usage: python3 docs/seo-audit/tools/tech_reaudit.py [--out FILE]
Hreflang is expected only on true translations (homes, checklists); article pages without it are reported as HREFLANG_NONE
(NO_EQUIVALENT_BY_DESIGN, docs/MULTILINGUAL-SEO-AUDIT-20261027.md), as is the documented absence of og:locale."""
import collections, glob, html as H, json, os, re, sys
from xml.etree import ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
SITE = "https://global.rentbikehanoi.com"
issues = collections.defaultdict(list)


def add(code, url, detail=""):
    issues[code].append((url, detail))


def url_of(f):
    rel = os.path.relpath(f, ROOT)
    return "/" + rel[: -len("index.html")] if rel.endswith("index.html") else "/" + rel


def file_of(u):
    p = u.split("#")[0].split("?")[0]
    if not p.startswith("/"):
        return None
    f = os.path.join(ROOT, p.lstrip("/"))
    if p.endswith("/"):
        f = os.path.join(f, "index.html")
    return f


files = [f for f in glob.glob(ROOT + "/**/*.html", recursive=True) if "/node_modules/" not in f and "/reports/" not in f and "/docs/" not in f and "/tests/" not in f and "/scripts/" not in f]
pages = {}
for f in files:
    s = open(f, encoding="utf-8").read()
    u = url_of(f)
    if u.endswith("404.html") or "/.github/" in f:
        continue
    pages[u] = s

attr = lambda tag, a: (re.search(r'\s' + a + r'="([^"]*)"', tag) or [None, None])[1]
meta = {}
for u, s in pages.items():
    head = s.split("</head>")[0]
    robots = [attr(t, "content") for t in re.findall(r"<meta [^>]*name=\"robots\"[^>]*>", head)]
    canon = [attr(t, "href") for t in re.findall(r"<link [^>]*rel=\"canonical\"[^>]*>", head)]
    alts = {attr(t, "hreflang"): attr(t, "href") for t in re.findall(r"<link [^>]*rel=\"alternate\"[^>]*hreflang=[^>]*>", head)}
    lang = (re.search(r"<html[^>]* lang=\"([^\"]+)\"", s) or [None, None])[1]
    title = H.unescape((re.search(r"<title>(.*?)</title>", head, re.S) or [None, ""])[1]).strip()
    desc = H.unescape(attr((re.search(r"<meta name=\"description\"[^>]*>", head) or [""])[0], "content") or "")
    h1 = [H.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<h1[^>]*>(.*?)</h1>", s, re.S)]
    noindex = any("noindex" in (r or "") for r in robots)
    meta[u] = dict(robots=robots, canon=canon, alts=alts, lang=lang, title=title, desc=desc, h1=h1, noindex=noindex, head=head)

# ---- canonical / hreflang ----
for u, m in meta.items():
    if m["noindex"]:
        continue
    if len(m["canon"]) != 1:
        add("CANONICAL_COUNT", u, str(len(m["canon"])))
        continue
    c = m["canon"][0]
    if c != SITE + u:
        add("CANONICAL_NOT_SELF", u, c)
    if not m["alts"]:
        add("HREFLANG_NONE", u)
        continue
    if "x-default" not in m["alts"]:
        add("HREFLANG_NO_XDEFAULT", u)
    if SITE + u not in m["alts"].values():
        add("HREFLANG_NO_SELF", u)
    if m["lang"] and m["alts"].get(m["lang"]) not in (None, SITE + u) and m["lang"] in m["alts"]:
        add("HREFLANG_SELF_LANG_MISMATCH", u, f"{m['lang']} -> {m['alts'].get(m['lang'])}")
    for hl, href in m["alts"].items():
        if not href.startswith(SITE):
            add("HREFLANG_EXTERNAL", u, href)
            continue
        tu = href[len(SITE):]
        tm = meta.get(tu)
        if not tm:
            add("HREFLANG_TARGET_MISSING", u, f"{hl} {href}")
            continue
        if tm["noindex"]:
            add("HREFLANG_TARGET_NOINDEX", u, f"{hl} {href}")
        if tm["canon"] and tm["canon"][0] != href:
            add("HREFLANG_TARGET_NOT_CANONICAL", u, f"{hl} {href} -> {tm['canon'][0]}")
        if hl != "x-default" and SITE + u not in tm["alts"].values():
            add("HREFLANG_NOT_RECIPROCAL", u, f"{hl} {href}")
        if hl != "x-default" and tm["lang"] and not (tm["lang"].lower().startswith(hl.lower().split("-")[0])):
            add("HREFLANG_LANG_VS_TARGET_HTML_LANG", u, f"{hl} {href} html lang={tm['lang']}")
    # same cluster: every alternate should list the same set
    for hl, href in m["alts"].items():
        tm = meta.get(href[len(SITE):]) if href.startswith(SITE) else None
        if tm and tm["alts"] and set(tm["alts"].items()) != set(m["alts"].items()):
            add("HREFLANG_SET_DIFFERS", u, f"vs {href}")
            break

# ---- sitemaps / robots ----
robots_txt = open(ROOT + "/robots.txt", encoding="utf-8").read()
sm_locs = {}
ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
for sm in glob.glob(ROOT + "/sitemap*.xml"):
    t = ET.parse(sm).getroot()
    for loc in t.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}url"):
        l = loc.find("s:loc", ns).text
        lm = loc.find("s:lastmod", ns)
        sm_locs[l] = (os.path.basename(sm), lm.text if lm is not None else None)
        if lm is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}(T[\d:]+(Z|[+-]\d\d:\d\d))?", lm.text):
            add("SITEMAP_LASTMOD_FORMAT", l, lm.text)
for l, (sm, lm) in sm_locs.items():
    u = l[len(SITE):]
    m = meta.get(u)
    if not m:
        add("SITEMAP_URL_NO_FILE", l, sm)
        continue
    if m["noindex"]:
        add("SITEMAP_URL_NOINDEX", l, sm)
    if m["canon"] and m["canon"][0] != l:
        add("SITEMAP_URL_NOT_CANONICAL", l, m["canon"][0])
for u, m in meta.items():
    if not m["noindex"] and m["canon"] and m["canon"][0] == SITE + u and SITE + u not in sm_locs:
        add("INDEXABLE_NOT_IN_SITEMAP", u)
for line in robots_txt.splitlines():
    if line.lower().startswith("disallow:"):
        path = line.split(":", 1)[1].strip()
        if path and path != "/":
            hit = [l for l in sm_locs if l[len(SITE):].startswith(path)]
            if hit:
                add("SITEMAP_URL_DISALLOWED", path, str(len(hit)))

# ---- duplicates ----
for key, code in (("title", "DUP_TITLE"), ("desc", "DUP_DESCRIPTION")):
    seen = collections.defaultdict(list)
    for u, m in meta.items():
        if not m["noindex"] and m[key]:
            seen[m[key]].append(u)
    for v, us in seen.items():
        if len(us) > 1:
            add(code, us[0], f"{len(us)}x: {v[:80]} | {us[1:4]}")
seen = collections.defaultdict(list)
for u, m in meta.items():
    if not m["noindex"] and m["h1"]:
        seen[m["h1"][0]].append(u)
for v, us in seen.items():
    if len(us) > 1:
        add("DUP_H1", us[0], f"{len(us)}x: {v[:80]} | {us[1:4]}")

# ---- links, fragments, og ----
for u, s in pages.items():
    body = s.split("</head>", 1)[-1]
    ids = set(re.findall(r'\sid="([^"]+)"', s))
    for href in re.findall(r'<a [^>]*href="([^"]*)"', body):
        href = H.unescape(href)
        if href.startswith("#"):
            if len(href) > 1 and href[1:] not in ids:
                add("FRAGMENT_MISSING", u, href)
        elif href.startswith("/") and not href.startswith("//"):
            f = file_of(href)
            if f and not os.path.exists(f) and not os.path.exists(f + ".html"):
                add("BROKEN_INTERNAL", u, href)
            elif "#" in href and f and os.path.exists(f):
                frag = href.split("#", 1)[1]
                if frag and f'id="{frag}"' not in open(f, encoding="utf-8").read():
                    add("FRAGMENT_MISSING_OTHER_PAGE", u, href)
        elif href.startswith(SITE):
            f = file_of(href[len(SITE):] or "/")
            if f and not os.path.exists(f):
                add("BROKEN_INTERNAL_ABS", u, href)
        elif href.startswith("http://"):
            add("HTTP_LINK", u, href)
    for t in re.findall(r'<a [^>]*target="_blank"[^>]*>', body):
        rel = attr(t, "rel") or ""
        if "noopener" not in rel and "noreferrer" not in rel:
            add("BLANK_NO_NOOPENER", u, t[:100])
    for src in re.findall(r'<(?:img|script|link)[^>]+(?:src|href)="(http://[^"]+)"', s):
        add("MIXED_CONTENT", u, src)
    for src in re.findall(r'<img [^>]*src="(/[^"]+)"', s):
        if not os.path.exists(ROOT + src.split("?")[0]):
            add("IMG_MISSING", u, src)
    m = meta[u]
    head = m["head"]
    if not m["noindex"]:
        ogu = (re.search(r'<meta property="og:url" content="([^"]*)"', head) or [None, None])[1]
        if m["canon"] and ogu != m["canon"][0]:
            add("OG_URL_NE_CANONICAL", u, str(ogu))
        for p in ("og:title", "og:description", "og:image", "og:type", "og:locale"):
            if f'property="{p}"' not in head:
                add("OG_MISSING_" + p.split(":")[1].upper(), u)
        if 'name="twitter:card"' not in head:
            add("TWITTER_CARD_MISSING", u)
        ogi = (re.search(r'<meta property="og:image" content="([^"]*)"', head) or [None, None])[1]
        if ogi and ogi.startswith(SITE) and not os.path.exists(ROOT + ogi[len(SITE):]):
            add("OG_IMAGE_MISSING_FILE", u, ogi)

# ---- JSON-LD ----
def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


for u, s in pages.items():
    m = meta[u]
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    if not blocks and not m["noindex"]:
        add("JSONLD_NONE", u)
    text = H.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"</?(?:a|strong|em|b|i|span|code|abbr|sup|sub)(?:\s[^>]*)?>", "", s.split("</head>", 1)[-1])))
    text = re.sub(r"\s+", " ", text)
    for b in blocks:
        try:
            j = json.loads(b)
        except Exception as e:
            add("JSONLD_INVALID", u, str(e)[:80])
            continue
        for n in walk(j):
            t = n.get("@type")
            ts = t if isinstance(t, list) else [t]
            if "Article" in ts or "BlogPosting" in ts:
                hl = n.get("headline", "")
                if len(hl) > 110:
                    add("ARTICLE_HEADLINE_GT110", u, str(len(hl)))
                for k in ("image", "datePublished", "dateModified", "author"):
                    if not n.get(k):
                        add("ARTICLE_MISSING_" + k, u)
                if n.get("datePublished") and n.get("dateModified") and n["dateModified"] < n["datePublished"]:
                    add("ARTICLE_MODIFIED_BEFORE_PUBLISHED", u)
                if n.get("inLanguage") and m["lang"] and n["inLanguage"].split("-")[0] != m["lang"].split("-")[0]:
                    add("ARTICLE_INLANGUAGE_MISMATCH", u, n["inLanguage"])
            if "FAQPage" in ts:
                for q in n.get("mainEntity", []):
                    name = re.sub(r"\s+", " ", q.get("name", "")).strip()
                    if name and name not in text:
                        add("FAQ_QUESTION_NOT_VISIBLE", u, name[:80])
                    a = re.sub(r"<[^>]+>", " ", (q.get("acceptedAnswer") or {}).get("text", ""))
                    a = re.sub(r"\s+", " ", H.unescape(a)).strip()
                    if a and a[:60] not in text:
                        add("FAQ_ANSWER_NOT_VISIBLE", u, a[:60])
            if "BreadcrumbList" in ts:
                items = n.get("itemListElement", [])
                for i, it in enumerate(items, 1):
                    if it.get("position") != i:
                        add("BREADCRUMB_POSITION", u, str(it.get("position")))
                    iu = it.get("item")
                    iu = iu.get("@id") if isinstance(iu, dict) else iu
                    if iu and iu.startswith(SITE):
                        tm = meta.get(iu[len(SITE):])
                        if not tm:
                            add("BREADCRUMB_ITEM_MISSING", u, iu)
                        elif tm["noindex"]:
                            add("BREADCRUMB_ITEM_NOINDEX", u, iu)
                    elif i < len(items) and not iu:
                        add("BREADCRUMB_ITEM_EMPTY", u, str(i))
            for k in ("url", "@id"):
                v = n.get(k)
                if isinstance(v, str) and v.startswith(SITE) and "#" not in v:
                    tu = v[len(SITE):] or "/"
                    if not tu.endswith("/") and "." in tu.rsplit("/", 1)[-1]:
                        if not os.path.exists(ROOT + tu):
                            add("SCHEMA_URL_FILE_MISSING", u, v)
                    elif tu not in meta:
                        add("SCHEMA_URL_PAGE_MISSING", u, f"{t} {k} {v}")

print("pages", len(pages), "indexable", sum(1 for m in meta.values() if not m["noindex"]), "sitemap urls", len(sm_locs))
for code in sorted(issues, key=lambda c: -len(issues[c])):
    v = issues[code]
    print(f"{code}: {len(v)}")
    for u, d in v[:4]:
        print("   ", u, "|", d)
if "--out" in sys.argv:
    json.dump({k: v for k, v in issues.items()}, open(sys.argv[sys.argv.index("--out") + 1], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
