#!/usr/bin/env python3
"""Global SEO A-Z audit: read-only data collector.

Reads the committed site build, the SEO Matrix, articles, sitemaps, URL freeze,
content graph, topical maps, claims ledger and the raw outputs of the repo's own
QA guards, and writes per-URL audit datasets to reports/seo/data/.

It never writes site content, Matrix rows, claims or production settings.
Usage:  python3 docs/seo-audit/tools/collect.py [--raw-dir DIR]
"""
import argparse, collections, glob, hashlib, json, os, re, statistics, sys, unicodedata
from urllib.parse import urlparse
from bs4 import BeautifulSoup

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ORIGIN = "https://global.rentbikehanoi.com"
LOCALES = ["vi", "en", "de", "fr", "es", "nl", "zh", "pt", "ko", "ja"]
CJK = re.compile(r"[぀-ヿ㐀-鿿豈-﫿]")
AUDIT_DATE = os.environ.get("AUDIT_DATE", "2026-10-27")  # re-audits pass the run date

OFFICIAL = re.compile(r"(\.gov(\.[a-z]{2})?$|gov\.vn$|chinhphu\.vn$|quochoi\.vn$|vbpl\.vn$|\.gouv\.fr$|"
                      r"auswaertiges-amt\.de$|bundesregierung\.de$|admin\.ch$|\.int$|europa\.eu$|gov\.uk$|"
                      r"rijksoverheid\.nl$|nederlandwereldwijd\.nl$|\.go\.jp$|\.go\.kr$|\.gov\.cn$|gc\.ca$|"
                      r"smartraveller\.gov\.au$|diplomatie\.gouv\.fr$|portaldiplomatico\.mne\.gov\.pt$|"
                      r"exteriores\.gob\.es$|\.gob\.[a-z]{2}$|\.gob$|vietnamtourism\.gov\.vn$|hanoi\.gov\.vn$|\.govt\.[a-z]{2}$|dgt\.es$)")
LEGAL_DB = re.compile(r"(thuvienphapluat\.vn|luatvietnam\.vn|vanban\.chinhphu\.vn|congbao\.chinhphu\.vn)$")


def rel(*p):
    return os.path.join(ROOT, *p)


def load(p):
    with open(rel(p), encoding="utf-8") as f:
        return json.load(f)


def width(s):
    """Display width: East Asian wide/fullwidth characters count 2 (SERP pixel proxy)."""
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in s or "")


def url_to_file(u):
    p = urlparse(u).path if u.startswith("http") else u
    if p.endswith("/"):
        p += "index.html"
    return rel(p.lstrip("/"))


def norm_tokens(s, loc):
    s = (s or "").lower()
    if loc in ("zh", "ja"):
        chars = [c for c in s if CJK.match(c) or c.isalnum()]
        return {"".join(chars[i:i + 2]) for i in range(len(chars) - 1)}
    return {t for t in re.findall(r"[\wÀ-ɏḀ-ỿ가-힯]+", s) if len(t) > 1}


def coverage(query, text, loc):
    q = norm_tokens(query, loc)
    if not q:
        return None
    t = norm_tokens(text, loc)
    return round(len(q & t) / len(q), 2)


def trigrams(s):
    s = re.sub(r"\s+", " ", (s or "").lower())
    return {s[i:i + 3] for i in range(len(s) - 2)}


def jacc(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def text_units(text, loc):
    if loc in ("zh", "ja"):
        return len(CJK.findall(text)) + len(re.findall(r"[A-Za-z0-9]+", text))
    return len(re.findall(r"\S+", text))


def source_class(host):
    host = (host or "").lower().removeprefix("www.")
    if OFFICIAL.search(host):
        return "official"
    if LEGAL_DB.search(host):
        return "legal_database"
    return "third_party"


def parse_page(path, loc):
    html = open(path, encoding="utf-8").read()
    soup = BeautifulSoup(html, "lxml")
    head = soup.head
    g = lambda sel, attr="content": (soup.select_one(sel) or {}).get(attr) if soup.select_one(sel) else None
    d = {}
    d["bytes"] = len(html.encode("utf-8"))
    d["sha256"] = hashlib.sha256(html.encode("utf-8")).hexdigest()
    d["doctype"] = html.lstrip().lower().startswith("<!doctype html>")
    d["html_lang"] = soup.html.get("lang") if soup.html else None
    d["title"] = soup.title.get_text().strip() if soup.title else None
    d["title_count"] = len(soup.find_all("title"))
    d["description"] = g('meta[name="description"]')
    d["desc_count"] = len(soup.select('meta[name="description"]'))
    d["robots"] = g('meta[name="robots"]') or "index,follow (default)"
    canon = soup.select('link[rel="canonical"]')
    d["canonical_count"] = len(canon)
    d["canonical"] = canon[0].get("href") if canon else None
    d["hreflang"] = {l.get("hreflang"): l.get("href") for l in soup.select('link[rel="alternate"][hreflang]')}
    d["og_url"] = g('meta[property="og:url"]')
    d["og_title"] = g('meta[property="og:title"]')
    d["og_image"] = g('meta[property="og:image"]')
    d["og_type"] = g('meta[property="og:type"]')
    d["twitter_card"] = g('meta[name="twitter:card"]')
    d["viewport"] = g('meta[name="viewport"]')
    d["css_files"] = len(soup.select('link[rel="stylesheet"]'))
    d["head_blocking_js"] = len([s for s in (head.find_all("script", src=True) if head else []) if not (s.has_attr("defer") or s.has_attr("async") or s.get("type") == "module")])
    d["js_files"] = len(soup.find_all("script", src=True))
    d["preload"] = len(soup.select('link[rel="preload"]'))
    # headings
    hs = [(int(h.name[1]), h.get_text(" ", strip=True)) for h in soup.find_all(re.compile(r"^h[1-6]$"))]
    d["h1_count"] = sum(1 for l, _ in hs if l == 1)
    d["h1"] = next((t for l, t in hs if l == 1), None)
    for i in range(2, 7):
        d[f"h{i}_count"] = sum(1 for l, _ in hs if l == i)
    skips = 0
    main = soup.find("main")
    mh = [int(h.name[1]) for h in (main.find_all(re.compile(r"^h[1-6]$")) if main else [])]
    for a, b in zip(mh, mh[1:]):
        if b > a + 1:
            skips += 1
    d["heading_skips"] = skips
    d["h2_outline"] = [t for l, t in hs if l == 2][:30]
    # schema
    types, ok, inlang, dates, faq, crumbs, author_types = [], True, set(), {}, False, 0, set()
    article_with_image = False
    for s in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(s.string or "")
        except Exception:
            ok = False
            continue
        stack = [data]
        while stack:
            n = stack.pop()
            if isinstance(n, list):
                stack.extend(n)
            elif isinstance(n, dict):
                t = n.get("@type")
                if t:
                    types.extend(t if isinstance(t, list) else [t])
                if n.get("inLanguage") and isinstance(n.get("inLanguage"), str):
                    inlang.add(n["inLanguage"])
                for k in ("datePublished", "dateModified"):
                    if n.get(k):
                        dates[k] = n[k]
                if (t == "Article" or isinstance(t, list) and "Article" in t) and n.get("image"):
                    article_with_image = True
                if t == "FAQPage":
                    faq = True
                if t == "BreadcrumbList":
                    crumbs = len(n.get("itemListElement") or [])
                if isinstance(n.get("author"), dict):
                    author_types.add(n["author"].get("@type"))
                stack.extend(v for v in n.values() if isinstance(v, (dict, list)))
    d["schema_types"] = sorted(set(types))
    d["article_image_in_schema"] = article_with_image
    d["schema_valid_json"] = ok
    d["schema_blocks"] = len(soup.select('script[type="application/ld+json"]'))
    d["schema_inlanguage"] = sorted(inlang)
    d["date_published"] = dates.get("datePublished")
    d["date_modified"] = dates.get("dateModified")
    d["faq_schema"] = faq
    # related-guides rail link back to the locale home (S-RAIL-ANCHOR) and pt-BR noun next to pt-PT text (S-PT-VARIANT)
    rail_home = soup.select_one('nav.premium-related a[href="/' + loc + '/"]')
    d["rail_home_anchor"] = rail_home.get_text(" ", strip=True) if rail_home else None
    d["pt_br_aluguel"] = len(re.findall(r"\baluguel\b", html, re.I)) if loc == "pt" else 0
    d["breadcrumb_items"] = crumbs
    d["author_types"] = sorted(a for a in author_types if a)
    # visible faq / provenance / sources
    # an FAQ section heading in the page language (2026-10-28: the first audit matched any heading containing
    # "questions"/"Fragen", e.g. "The decision in five questions", which is not an FAQ block)
    d["faq_visible"] = any(re.search(r"\bFAQ\b|frequently asked|häufige fragen|questions fréquentes|preguntas frecuentes|perguntas frequentes|"
                                     r"veelgestelde vragen|câu hỏi thường gặp|よくある質問|자주 묻는 질문|常见问题", t, re.I) for _, t in hs)
    d["provenance_note"] = bool(soup.select_one(".article-provenance"))
    d["visual_breadcrumb"] = bool(soup.select_one("nav.crumb"))
    # links
    def is_internal(h):
        return h.startswith("/") and not h.startswith("//") or h.startswith(ORIGIN)
    all_a = soup.find_all("a", href=True)
    d["links_total"] = len(all_a)
    internal_all = set()
    ext_hosts = collections.Counter()
    empty_anchor = 0
    for a in all_a:
        h = a["href"]
        if h.startswith("#") or h.startswith("mailto:") or h.startswith("tel:"):
            continue
        if not a.get_text(strip=True) and not a.get("aria-label") and not a.find("img", alt=True):
            empty_anchor += 1
        if is_internal(h):
            internal_all.add(urlparse(h).path or "/")
        else:
            ext_hosts[urlparse(h).netloc.lower().removeprefix("www.")] += 1
    d["empty_anchors"] = empty_anchor
    d["internal_links_unique"] = len(internal_all)
    d["internal_targets"] = sorted(internal_all)
    art = soup.select_one("main article") or main
    ctx_targets, ctx_anchor = set(), {}
    content_root = None
    if art:
        content_root = BeautifulSoup(str(art), "lxml")
        for x in content_root.select("nav.premium-toc, details.ultra-mobile-toc, nav.crumb, .ultra-reading-tools"):
            x.decompose()
        for a in content_root.find_all("a", href=True):
            h = a["href"]
            if is_internal(h) and not h.startswith("#"):
                p = urlparse(h).path or "/"
                ctx_targets.add(p)
                ctx_anchor.setdefault(p, a.get_text(" ", strip=True))
    d["contextual_internal_targets"] = sorted(ctx_targets)
    d["main_internal_targets"] = sorted({urlparse(a["href"]).path or "/" for a in (main.find_all("a", href=True) if main else []) if is_internal(a["href"]) and not a["href"].startswith("#")})
    d["contextual_anchors"] = ctx_anchor
    d["external_links"] = sum(ext_hosts.values())
    d["external_hosts"] = dict(ext_hosts)
    refs = soup.select("section.article-references a[href]")
    d["references"] = len(refs)
    cls = collections.Counter(source_class(urlparse(a["href"]).netloc) for a in refs)
    d["ref_official"], d["ref_legal_db"], d["ref_third_party"] = cls["official"], cls["legal_database"], cls["third_party"]
    # images
    imgs = soup.find_all("img")
    d["img_count"] = len(imgs)
    d["img_missing_alt_attr"] = sum(1 for i in imgs if not i.has_attr("alt"))
    d["img_empty_alt"] = sum(1 for i in imgs if i.has_attr("alt") and not i["alt"].strip())
    d["img_no_dimensions"] = sum(1 for i in imgs if not (i.get("width") and i.get("height")))
    d["img_lazy"] = sum(1 for i in imgs if i.get("loading") == "lazy")
    d["img_modern_format"] = sum(1 for i in imgs if re.search(r"\.(webp|avif)(\?|$)", i.get("src", "")))
    # main text
    if content_root:
        for x in content_root.select("nav, aside, section.article-references, .article-provenance, .premium-author, script, style"):
            x.decompose()
        text = content_root.get_text(" ", strip=True)
    else:
        text = ""
    d["main_text_chars"] = len(text)
    d["content_units"] = text_units(text, loc)
    d["unit_kind"] = "cjk_chars" if loc in ("zh", "ja") else "words"
    # accessibility / html
    ids = [t.get("id") for t in soup.find_all(id=True)]
    d["duplicate_ids"] = len(ids) - len(set(ids))
    d["main_count"] = len(soup.find_all("main"))
    d["skip_link"] = bool(soup.select_one('a[href="#main"]'))
    d["buttons_no_name"] = sum(1 for b in soup.find_all("button") if not b.get_text(strip=True) and not b.get("aria-label"))
    d["inline_style_attrs"] = len(soup.select("[style]"))
    d["lang_switch_links"] = len(soup.select("a[hreflang]"))
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-dir", default=rel("reports", "seo", "data", "raw"))
    args = ap.parse_args()
    out = rel("reports", "seo", "data")
    os.makedirs(out, exist_ok=True)

    matrix = load("data/seo/master-matrix.json")["rows"]
    by_id = {r["id"]: r for r in matrix}
    by_url = {r["url"]: r for r in matrix}
    freeze = {u["url"]: u for u in load("data/seo/url-freeze.json")["urls"]}
    graph = load("data/seo/content-graph.json")
    gnodes = {n["id"]: n for n in graph["nodes"]}
    claims = {}
    for c in load("factory/external-writers/claims.json")["claims"]:
        claims[c["id"]] = c
    pub_state = {p["id"]: p for p in load("factory/publisher/state.json").get("published", [])}
    articles = {}
    for f in glob.glob(rel("content", "articles", "*.json")):
        a = json.load(open(f, encoding="utf-8"))
        articles[a["matrix_id"]] = a

    # sitemaps
    sm = {}
    sitemap_files = sorted(glob.glob(rel("sitemap-*.xml")))
    for f in sitemap_files:
        x = open(f, encoding="utf-8").read()
        for blk in re.findall(r"<url>(.*?)</url>", x, re.S):
            loc = re.search(r"<loc>(.*?)</loc>", blk).group(1)
            lm = re.search(r"<lastmod>(.*?)</lastmod>", blk)
            path = loc.replace(ORIGIN, "")
            sm.setdefault(path, []).append({"shard": os.path.basename(f), "lastmod": lm.group(1) if lm else None})
    index = open(rel("sitemap.xml"), encoding="utf-8").read()
    shards_in_index = re.findall(r"<loc>(.*?)</loc>", index)

    # every html page on disk
    html_files = []
    for f in glob.glob(rel("**", "index.html"), recursive=True) + [rel("404.html")]:
        r = os.path.relpath(f, ROOT)
        if r.split(os.sep)[0] in ("node_modules", "reports", "examples", "private-drafts", "factory", "docs", "tests", "scripts", "content", "data", "approvals", "schemas", "config"):
            continue
        html_files.append(r)
    pages = {}
    for r in sorted(html_files):
        url = "/404.html" if r == "404.html" else "/" + r[: -len("index.html")]
        url = url if url != "/./" else "/"
        seg = url.strip("/").split("/")[0]
        loc = seg if seg in LOCALES else "root"
        pages[url] = parse_page(rel(r), loc if loc != "root" else "en")
        pages[url]["locale_dir"] = loc

    # inbound links
    inbound_all = collections.Counter()
    inbound_ctx = collections.Counter()
    anchors_in = collections.defaultdict(list)
    for u, p in pages.items():
        for t in p["internal_targets"]:
            if t != u:
                inbound_all[t] += 1
        for t in p["contextual_internal_targets"]:
            if t != u:
                inbound_ctx[t] += 1
                anchors_in[t].append(p["contextual_anchors"].get(t, ""))
    broken = []
    for u, p in pages.items():
        for t in p["internal_targets"]:
            if t in pages or os.path.exists(rel(t.lstrip("/"))) or os.path.exists(url_to_file(t)):
                continue
            broken.append({"from": u, "to": t})

    # raw guard outputs
    def readraw(n):
        p = os.path.join(args.raw_dir, n)
        return open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    seo_warn = collections.defaultdict(list)
    for m in re.finditer(r"^WARN (\S+) (\S+) — (.*)$", readraw("seo-guard.txt"), re.M):
        seo_warn[m.group(2)].append({"rule": m.group(1), "detail": m.group(3)})
    fact_warn = collections.defaultdict(list)
    for m in re.finditer(r"^WARN (\S+) content/articles/([A-Z0-9-]+)\.json#(\S+) — (.*)$", readraw("fact-guard.txt"), re.M):
        fact_warn[m.group(2)].append({"rule": m.group(1), "field": m.group(3), "detail": m.group(4)})
    fact_warn_other = [l for l in readraw("fact-guard.txt").splitlines() if l.startswith("WARN") and "content/articles/" not in l]

    review_pairs = graph.get("review_pairs", [])
    rp_by = collections.defaultdict(list)
    for rp in review_pairs:
        rp_by[rp["a"]].append(rp)
        rp_by[rp["b"]].append(rp)

    # unit medians per locale/role for thin-content detection
    med = {}
    for loc in LOCALES:
        for role in ("HUB", "SUPPORT"):
            vals = [pages[r["url"]]["content_units"] for r in matrix if r["status"] == "PUBLISHED" and r["locale"] == loc and r["role"] == role and r["url"] in pages]
            med[(loc, role)] = statistics.median(vals) if vals else 0

    # title/description duplicates and title similarity
    pub_urls = [r["url"] for r in matrix if r["status"] == "PUBLISHED"]
    title_c = collections.Counter(pages[u]["title"] for u in pub_urls if u in pages)
    desc_c = collections.Counter(pages[u]["description"] for u in pub_urls if u in pages)
    h1_c = collections.Counter((by_url[u]["locale"], pages[u]["h1"]) for u in pub_urls if u in pages)
    sim_pairs = []
    for loc in LOCALES:
        us = [u for u in pub_urls if by_url[u]["locale"] == loc and by_url[u]["role"] == "SUPPORT" and u in pages]
        tg = {u: trigrams(pages[u]["h1"] or pages[u]["title"]) for u in us}
        for i, a in enumerate(us):
            for b in us[i + 1:]:
                s = jacc(tg[a], tg[b])
                if s >= 0.5:
                    sim_pairs.append({"locale": loc, "a": by_url[a]["id"], "b": by_url[b]["id"], "url_a": a, "url_b": b, "title_trigram_jaccard": round(s, 3)})

    # ---------- inventory ----------
    inventory = []
    for r in matrix:
        u = r["url"]
        p = pages.get(u)
        art = articles.get(r["id"], {})
        c = claims.get(r["id"])
        node = gnodes.get(r["id"], {})
        if r["status"] == "PUBLISHED":
            pipeline = "PUBLISHED"
        elif c and c.get("status") == "CLAIMED":
            pipeline = "CLAIMED"
        elif c and c.get("status") == "SUBMITTED":
            pipeline = "SUBMITTED"
        else:
            pipeline = "READY"  # unclaimed IDEA row in the shared queue
        parent = by_id.get(r.get("parent_id") or "", {})
        rec = {
            "matrix_id": r["id"], "content_id": r.get("topical_candidate_id") or r["id"], "locale": r["locale"],
            "url": u, "abs_url": ORIGIN + u, "role": r["role"], "page_type": {"LANGUAGE_SELECTOR": "Language selector", "PILLAR": "Pillar (locale home)", "HUB": "Hub", "SUPPORT": "Supporting", "UTILITY": "Utility"}.get(r["role"], r["role"]),
            "parent_id": r.get("parent_id"), "parent_url": parent.get("url"), "cluster": r.get("cluster"), "subcluster": r.get("subcluster"),
            "matrix_status": r["status"], "pipeline_status": pipeline, "claim_writer": (c or {}).get("writer"), "claim_status": (c or {}).get("status"),
            "primary_query": r.get("primary_query"), "search_intent": r.get("search_intent"), "serp_evidence": r.get("serp_evidence"),
            "source_verification": r.get("source_verification"), "distinct_from": r.get("distinct_from"), "priority": r.get("priority"),
            "graph_action": node.get("action"), "graph_qa_status": node.get("qa_status"),
            "html_exists": bool(p), "frozen": u in freeze, "in_sitemap": u in sm, "sitemap_shard": ",".join(x["shard"] for x in sm.get(u, [])),
            "sitemap_lastmod": ",".join(x["lastmod"] or "" for x in sm.get(u, [])),
            "secondary_queries": None,
        }
        if p:
            rec.update({k: p[k] for k in ("title", "description", "h1", "h1_count", "h2_count", "h3_count", "h4_count", "h5_count", "h6_count", "heading_skips",
                                         "canonical", "canonical_count", "robots", "html_lang", "og_url", "og_image", "twitter_card", "schema_types", "schema_valid_json",
                                         "schema_inlanguage", "date_published", "date_modified", "faq_schema", "faq_visible", "breadcrumb_items", "author_types",
                                         "article_image_in_schema", "rail_home_anchor", "pt_br_aluguel",
                                         "content_units", "unit_kind", "main_text_chars", "links_total", "internal_links_unique", "external_links", "references",
                                         "ref_official", "ref_legal_db", "ref_third_party", "img_count", "img_missing_alt_attr", "img_empty_alt", "img_no_dimensions",
                                         "img_lazy", "bytes", "css_files", "js_files", "head_blocking_js", "duplicate_ids", "empty_anchors", "provenance_note",
                                         "visual_breadcrumb", "skip_link", "buttons_no_name", "sha256")})
            rec["hreflang_count"] = len(p["hreflang"])
            rec["hreflang"] = p["hreflang"]
            rec["x_default"] = p["hreflang"].get("x-default")
            rec["title_len"] = len(p["title"] or "")
            rec["title_width"] = width(p["title"])
            rec["desc_len"] = len(p["description"] or "")
            rec["desc_width"] = width(p["description"])
            rec["canonical_self"] = p["canonical"] == ORIGIN + u
            rec["indexable"] = "noindex" not in (p["robots"] or "") and rec["canonical_self"]
            rec["contextual_outlinks"] = len(p["contextual_internal_targets"])
            pu = parent.get("url")
            rec["links_to_parent"] = (pu in p["internal_targets"]) if pu else None
            rec["parent_links_here"] = (u in pages[pu]["main_internal_targets"]) if pu and pu in pages else None
            rec["linked_from_pillar"] = any(u in pages[x]["internal_targets"] for x in (f"/{r['locale']}/",) if x in pages)
            rec["inbound_internal_all"] = inbound_all.get(u, 0)
            rec["inbound_contextual"] = inbound_ctx.get(u, 0)
            rec["inbound_anchor_variants"] = len(set(a.lower() for a in anchors_in.get(u, []) if a))
            rec["pq_cov_title"] = coverage(r.get("primary_query"), p["title"], r["locale"])
            rec["pq_cov_h1"] = coverage(r.get("primary_query"), p["h1"], r["locale"])
            rec["pq_cov_desc"] = coverage(r.get("primary_query"), p["description"], r["locale"])
            rec["locale_role_median_units"] = med.get((r["locale"], r["role"]))
            rec["h2_outline"] = p["h2_outline"]
        else:
            rec["indexable"] = None
        if art:
            rec["article_sources"] = len(art.get("sources") or [])
            rec["writer_session"] = art.get("writer_session")
            pub = art.get("publication") or {}
            rec["publication_mode"] = pub.get("mode") or ("OWNER_MANIFEST" if r["status"] == "PUBLISHED" else None)
            rec["publication_stage"] = pub.get("stage")
            rec["publication_commit"] = pub.get("source_commit")
            rec["facts_reviewed_by_human"] = art.get("facts_reviewed_by_human")
            rec["serp_intent_checked"] = art.get("serp_intent_checked")
        live = pub_state.get(r["id"])
        rec["publisher_live_qa"] = (live or {}).get("live_qa")
        rec["publisher_live_qa_at"] = (live or {}).get("live_qa_at")
        rec["seo_guard_warns"] = seo_warn.get(u, [])
        rec["fact_guard_warns"] = len(fact_warn.get(r["id"], []))
        rec["review_pairs"] = [{"other": rp["b"] if rp["a"] == r["id"] else rp["a"], "score": rp["score"], "level": rp.get("level")} for rp in rp_by.get(r["id"], [])]
        inventory.append(rec)
    # topical candidates for secondary queries
    sec = {}
    for loc in LOCALES:
        t = load(f"data/seo/topical-authority/{loc}.json")
        for pr in t.get("proposals", []):
            sec[pr["candidate_id"]] = pr
    for rec in inventory:
        pr = sec.get(rec["content_id"])
        if pr:
            rec["secondary_queries"] = pr.get("secondary_queries")
            rec["word_target"] = pr.get("word_target")
            rec["intent_rationale"] = pr.get("intent_rationale")

    # non-matrix html pages
    extra = []
    for u, p in pages.items():
        if u not in by_url:
            extra.append({"url": u, "robots": p["robots"], "canonical": p["canonical"], "title": p["title"], "in_sitemap": u in sm, "html_lang": p["html_lang"]})

    # topical candidates (capacity, never URLs)
    candidates = []
    for loc in LOCALES:
        t = load(f"data/seo/topical-authority/{loc}.json")
        for pr in t.get("proposals", []):
            candidates.append({k: pr.get(k) for k in ("candidate_id", "locale", "role", "parent_id", "cluster", "subcluster", "primary_query", "working_title", "search_intent", "status", "priority", "word_target")})
    for c in graph["candidates"]:
        if c.get("pipeline_state") == "ARCHITECTURE_BLOCKED" and not any(x["candidate_id"] == c["id"] for x in candidates):
            candidates.append({"candidate_id": c["id"], "locale": c["locale"], "role": c.get("level"), "parent_id": c.get("parent_id"), "cluster": c.get("hub"), "subcluster": c.get("silo"),
                               "primary_query": c.get("primary_query_hypothesis"), "working_title": c.get("working_title"), "search_intent": c.get("intent"), "status": "ARCHITECTURE_BLOCKED", "priority": None, "word_target": None})

    data = {
        "audit_date": AUDIT_DATE,
        "head_commit": os.popen(f"git -C {ROOT} merge-base HEAD origin/main").read().strip() or os.popen(f"git -C {ROOT} rev-parse HEAD").read().strip(),
        "inventory": inventory,
        "non_matrix_pages": extra,
        "broken_internal_links": broken,
        "sitemap": {"index_shards": shards_in_index, "shard_files": [os.path.basename(f) for f in sitemap_files], "urls": len(sm),
                    "dupes": [u for u, v in sm.items() if len(v) > 1], "not_published": [u for u in sm if by_url.get(u, {}).get("status") != "PUBLISHED"],
                    "lastmod_missing": sum(1 for v in sm.values() for x in v if not x["lastmod"])},
        "title_dupes": {t: n for t, n in title_c.items() if n > 1},
        "desc_dupes": {t: n for t, n in desc_c.items() if n > 1},
        "h1_dupes": {f"{k[0]}|{k[1]}": n for k, n in h1_c.items() if n > 1},
        "title_similarity_pairs": sim_pairs,
        "graph_review_pairs": review_pairs,
        "graph_counts": graph.get("counts"),
        "candidates": candidates,
        "fact_warn_by_article": {k: v for k, v in fact_warn.items()},
        "fact_warn_other": fact_warn_other,
        "medians": {f"{k[0]}|{k[1]}": v for k, v in med.items()},
        "claims_counts": dict(collections.Counter(c.get("status") for c in claims.values())),
        "publisher": {k: v for k, v in load("factory/publisher/state.json").items() if k != "published"},
    }
    with open(os.path.join(out, "audit-data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"), default=list)
    print(json.dumps({"inventory": len(inventory), "published": sum(1 for r in inventory if r["matrix_status"] == "PUBLISHED"), "html_pages": len(pages),
                      "non_matrix_pages": len(extra), "broken_internal": len(broken), "sitemap_urls": len(sm), "title_dupes": len(data["title_dupes"]),
                      "desc_dupes": len(data["desc_dupes"]), "sim_pairs": len(sim_pairs), "candidates": len(candidates)}))


if __name__ == "__main__":
    main()
