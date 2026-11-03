#!/usr/bin/env python3
"""Global SEO A–Z deep audit (re-audit 2026-11-01): the per-URL checks the first audit (collect.py, analyze.py,
tech_reaudit.py) did not run. Read-only: reads the committed build and repository data, writes
reports/seo/data/deep-audit.json. It never edits site HTML, the Matrix, claims, sitemaps or settings.

Checks
  link graph      click depth from / (all links and links inside <main>), internal PageRank, internal links that
                  are not in canonical form (would be redirected), outbound link hygiene (rel, target, http://)
  trust/E-E-A-T   visible publication/update date, rendered reference dates vs `checked_on` in the article packet
                  (the About page promises both), JSON-LD date consistency (dateModified, sitemap lastmod, future dates)
  duplication     near-duplicate body text inside a locale (5-word / 8-character shingles: Jaccard and containment),
                  primary-query overlap between published URLs, FAQ questions repeated on several pages
  freshness       superseded Vietnamese legal instruments cited without their replacement (Decree 100/2019 →
                  168/2024; Road Traffic Law 23/2008 → 36/2024; Circular 12/2017/TT-BGTVT and 12/2025/TT-BCA →
                  108/2026/TT-BCA) and the pre-2025 licence class A1 ≤ 175 cm³ (A1 is ≤ 125 cm³ since 1 Jan 2025)
  multilingual    template strings left in English on other locales, slug script/language per locale, topic
                  slots that exist in every locale (hreflang candidates, never auto-paired), silo coverage per locale
  keyword         primary-query coverage in the lead paragraph and H2s, intent labels of rental-intent Hubs
Usage: AUDIT_DATE=2026-11-01 python3 docs/seo-audit/tools/deep_audit.py
"""
import collections, datetime, glob, json, os, re, unicodedata, zlib
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ORIGIN = "https://global.rentbikehanoi.com"
LOCALES = ["vi", "en", "de", "fr", "es", "nl", "zh", "pt", "ko", "ja"]
AUDIT_DATE = os.environ.get("AUDIT_DATE", "2026-11-01")
CJK = re.compile(r"[぀-ヿ㐀-鿿豈-﫿가-힯]")
OUT = os.path.join(ROOT, "reports", "seo", "data", "deep-audit.json")


def rel(*p):
    return os.path.join(ROOT, *p)


def load(p):
    with open(rel(p), encoding="utf-8") as f:
        return json.load(f)


def page_file(u):
    return rel("404.html") if u == "/404.html" else rel(u.lstrip("/"), "index.html")


def norm_path(href):
    """Internal href → site path, or None for external/fragment/mail links."""
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    if href.startswith("//"):
        return None
    if href.startswith("http://") or href.startswith("https://"):
        p = urlparse(href)
        if p.netloc.lower() not in ("global.rentbikehanoi.com",):
            return None
        return p.path or "/"
    if href.startswith("/"):
        return urlparse(href).path or "/"
    return None


matrix = load("data/seo/master-matrix.json")["rows"]
by_url = {r["url"]: r for r in matrix}
pub = [r for r in matrix if r["status"] == "PUBLISHED"]
pub_urls = [r["url"] for r in pub]
packets = {}
for f in glob.glob(rel("content", "articles", "*.json")):
    a = json.load(open(f, encoding="utf-8"))
    packets[a["matrix_id"]] = a
sitemap_lastmod = {}
for f in glob.glob(rel("sitemap-*.xml")):
    for loc, lm in re.findall(r"<url><loc>(.*?)</loc>(?:<lastmod>(.*?)</lastmod>)?</url>", open(f, encoding="utf-8").read()):
        sitemap_lastmod[loc.replace(ORIGIN, "")] = lm or None

pages = pub_urls + ["/search/", "/404.html"]
STRIP = ("nav", "aside", "script", "style", ".topic-guides", ".article-references", ".article-provenance", ".premium-author",
         ".ultra-reading-tools", "details.ultra-mobile-toc", "section.premium-featured", "section.ultra-next-reads", ".info-band",
         "nav.crumb", ".overline")
FAQ_HEAD = re.compile(r"\bFAQ\b|frequently asked|häufige fragen|questions fréquentes|preguntas frecuentes|perguntas frequentes|"
                      r"veelgestelde vragen|câu hỏi thường gặp|よくある質問|자주 묻는 질문|常见问题", re.I)
DATE_LABEL = re.compile(r"(updated|published|last reviewed|cập nhật|đăng ngày|xuất bản|aktualisiert|veröffentlicht|stand:|mis à jour|publié|"
                        r"actualizado|publicado|bijgewerkt|gepubliceerd|更新|发布|發布|atualizado|업데이트|게시|수정일|公開)", re.I)
DATE_VALUE = re.compile(r"(20\d\d-\d\d-\d\d|\d{1,2}[./]\d{1,2}[./]20\d\d|20\d\d年\d{1,2}月\d{1,2}日|20\d\d\.\s?\d{1,2}\.\s?\d{1,2}|"
                        r"\d{1,2}\.? (januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember) 20\d\d|"
                        r"(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2},? 20\d\d|"
                        r"\d{1,2} (january|february|march|april|may|june|july|august|september|october|november|december) 20\d\d)", re.I)


def date_forms(iso):
    """Ways a checked_on date (YYYY-MM-DD) could be printed next to a reference."""
    y, m, d = iso.split("-")
    mi, di = int(m), int(d)
    return {iso, f"{di}/{mi}/{y}", f"{d}/{m}/{y}", f"{di}.{mi}.{y}", f"{d}.{m}.{y}", f"{y}年{mi}月{di}日", f"{y}. {mi}. {di}", f"{y}.{m}.{d}"}


def body_root(soup):
    el = soup.select_one("div.article-copy") or soup.select_one("main article.article") or soup.select_one("main article.legal") or soup.find("main")
    if not el:
        return None
    el = BeautifulSoup(str(el), "lxml")
    for sel in STRIP:
        for x in el.select(sel):
            x.decompose()
    return el


def words(text, loc):
    if loc in ("zh", "ja"):
        s = re.sub(r"[\s\W_]+", "", text.lower())
        return [s[i:i + 8] for i in range(0, max(0, len(s) - 7))]
    toks = re.findall(r"[\wÀ-ɏḀ-ỿ가-힯]+", text.lower())
    return [" ".join(toks[i:i + 5]) for i in range(0, max(0, len(toks) - 4))]


def shingles(text, loc):
    return {zlib.crc32(s.encode("utf-8")) for s in words(text, loc)}


def qtokens(s, loc):
    s = (s or "").lower()
    if loc in ("zh", "ja"):
        chars = [c for c in s if CJK.match(c) or c.isalnum()]
        return {"".join(chars[i:i + 2]) for i in range(len(chars) - 1)}
    return {t for t in re.findall(r"[\wÀ-ɏḀ-ỿ가-힯]+", s) if len(t) > 1}


def coverage(q, text, loc):
    a = qtokens(q, loc)
    return round(len(a & qtokens(text, loc)) / len(a), 2) if a else None


# ------------------------------------------------------------------ parse every page once
P = {}
for u in pages:
    f = page_file(u)
    if not os.path.exists(f):
        continue
    html = open(f, encoding="utf-8").read()
    soup = BeautifulSoup(html, "lxml")
    row = by_url.get(u, {})
    loc = row.get("locale") if row.get("locale") in LOCALES else ("en" if u != "/" else "en")
    main = soup.find("main")
    main_ids = {id(a) for a in (main.find_all("a", href=True) if main else [])}
    links_all, links_main, noncanon, outbound = [], [], [], []
    for a in soup.find_all("a", href=True):
        h = a["href"].strip()
        p = norm_path(h)
        if p is not None:
            links_all.append(p)
            if id(a) in main_ids:
                links_main.append(p)
            issue = None
            last = p.rstrip("/").split("/")[-1]
            if h.startswith("http://"):
                issue = "http-absolute"
            elif "index.html" in p:
                issue = "index.html"
            elif "?" in h and not h.startswith("/search/"):
                issue = "query-string"
            elif p != "/" and not p.endswith("/") and "." not in last:
                issue = "no-trailing-slash (301)"
            elif p != p.lower():
                issue = "uppercase"
            if issue:
                noncanon.append({"href": h, "issue": issue})
        elif h.startswith(("http://", "https://", "//")):
            relv = set((a.get("rel") or []))
            outbound.append({"host": urlparse(h if not h.startswith("//") else "https:" + h).netloc.lower(), "http": h.startswith("http://"),
                             "rel": sorted(relv), "blank": a.get("target") == "_blank", "noopener": "noopener" in relv or "noreferrer" in relv})
    # JSON-LD
    graph = []
    for s in soup.select('script[type="application/ld+json"]'):
        try:
            d = json.loads(s.string or "")
        except Exception:
            continue
        graph.extend(d.get("@graph", [d]) if isinstance(d, dict) else d)
    art = next((n for n in graph if n.get("@type") in ("Article", "BlogPosting", "NewsArticle")), None)
    dated = art or next((n for n in graph if n.get("@type") in ("WebPage", "AboutPage", "ContactPage") and n.get("dateModified")), None)
    crumbs = next((n for n in graph if n.get("@type") == "BreadcrumbList"), None)
    faq = next((n for n in graph if n.get("@type") == "FAQPage"), None)
    canon = (soup.select_one('link[rel="canonical"]') or {}).get("href") if soup.select_one('link[rel="canonical"]') else None
    # the page's own visible date: a <time> element or a labelled date in the byline/meta elements (dates inside the
    # body or inside reference titles belong to the cited sources, not to the page)
    meta_text = " ".join(el.get_text(" ", strip=True) for el in soup.select(".premium-author, .ultra-reading-tools, .article-meta, .byline, .article-provenance"))
    visible_date = bool(soup.find("time")) or any(DATE_VALUE.search(meta_text[m.end():m.end() + 40]) for m in DATE_LABEL.finditer(meta_text))
    refs = soup.select("section.article-references li")
    refs_text = " ".join(li.get_text(" ", strip=True) for li in refs)
    pkt_sources = (packets.get(row.get("id"), {}).get("sources") or []) if row else []
    ref_dated = sum(1 for s in pkt_sources if s.get("checked_on") and any(f in refs_text for f in date_forms(s["checked_on"])))
    # since CONTENT-04 each reference prints its check date in a <time datetime> element (localized text, ISO attribute)
    checked = {s["checked_on"] for s in pkt_sources if s.get("checked_on")}
    ref_dated = max(ref_dated, sum(1 for li in refs if any(t.get("datetime", "")[:10] in checked for t in li.select("time"))))
    # body text
    br = body_root(soup)
    body = br.get_text(" ", strip=True) if br else ""
    lead = soup.select_one("p.article-lead") or soup.select_one("p.lead") or (soup.find("main").find("p") if soup.find("main") else None)
    h2s = [h.get_text(" ", strip=True) for h in (main.find_all("h2") if main else [])]
    faq_q = [q.get("name", "").strip() for q in (faq or {}).get("mainEntity", []) if isinstance(q, dict)]
    # template strings (compared across locales below)
    tmpl = {}
    for key, sel in (("skip", "a.skip"), ("back_top", ".premium-back-top"), ("reading_tools", ".ultra-reading-tools"), ("toc_head", "nav.premium-toc > :first-child"),
                     ("related_head", "nav.premium-related > :first-child"), ("refs_head", "section.article-references h2"), ("siblings_head", "section.topic-guides h2"),
                     ("search_link", ".premium-search-link"), ("author_line", ".premium-author"), ("provenance", ".article-provenance"),
                     ("footer_legal", ".nav2-legal"), ("mobile_toc", "details.ultra-mobile-toc summary"), ("drawer", "details.nav2-drawer summary")):
        el = soup.select_one(sel)
        if el:
            tmpl[key] = el.get_text(" ", strip=True)
    for i, el in enumerate(soup.select("[aria-label]")):
        tmpl[f"aria:{el.name}:{' '.join(el.get('class', [])[:1])}:{i}"] = el["aria-label"].strip()
    alts = [i.get("alt", "") for i in soup.find_all("img")]
    og = soup.select_one('meta[property="og:image"]')
    og_url = og.get("content") if og else None
    og_meta = tuple(int((soup.select_one(f'meta[property="og:image:{k}"]') or {}).get("content") or 0) for k in ("width", "height")) if og else (0, 0)
    og_file = rel(urlparse(og_url).path.lstrip("/")) if og_url and og_url.startswith(ORIGIN) else None
    og_real = Image.open(og_file).size if og_file and os.path.exists(og_file) else None
    P[u] = {"loc": loc, "row": row, "links_all": links_all, "links_main": links_main, "noncanon": noncanon, "outbound": outbound,
            "art": art, "dated": dated, "crumbs": crumbs, "faq_q": faq_q, "canonical": canon, "visible_date": visible_date, "time_tags": len(soup.find_all("time")),
            "refs": len(refs), "refs_dated": ref_dated, "body": body, "lead": lead.get_text(" ", strip=True) if lead else "", "h2s": h2s,
            "tmpl": tmpl, "alts": alts, "faq_visible": any(FAQ_HEAD.search(h) for h in h2s),
            "og_image": og_url, "og_image_meta": og_meta, "og_image_real": og_real}

# ------------------------------------------------------------------ link graph: click depth and PageRank
def bfs(key):
    depth, frontier = {"/": 0}, ["/"]
    while frontier:
        nxt = []
        for u in frontier:
            for t in set(P.get(u, {}).get(key, [])):
                if t in P and t not in depth:
                    depth[t] = depth[u] + 1
                    nxt.append(t)
        frontier = nxt
    return depth


depth_all, depth_main = bfs("links_all"), bfs("links_main")
nodes = [u for u in P if u not in ("/404.html",)]
out_edges = {u: sorted({t for t in P[u]["links_all"] if t in P and t != u and t != "/404.html"}) for u in nodes}
pr = {u: 1 / len(nodes) for u in nodes}
for _ in range(60):
    nxt = {u: (1 - 0.85) / len(nodes) for u in nodes}
    for u in nodes:
        outs = out_edges[u] or nodes
        share = 0.85 * pr[u] / len(outs)
        for t in outs:
            nxt[t] += share
    pr = nxt
inbound_any = collections.Counter(t for u in nodes for t in out_edges[u])

# ------------------------------------------------------------------ duplication inside a locale
sh = {u: shingles(P[u]["body"], P[u]["loc"]) for u in pub_urls if u in P and P[u]["row"].get("role") in ("HUB", "SUPPORT", "PILLAR")}
near = collections.defaultdict(list)
closest = {}  # url -> (containment, jaccard, other url): the most similar page of the locale, whatever the score
dup_pairs = []
for loc in LOCALES:
    us = [u for u in sh if P[u]["loc"] == loc and len(sh[u]) >= 50]
    for i, a in enumerate(us):
        A = sh[a]
        for b in us[i + 1:]:
            B = sh[b]
            inter = len(A & B)
            if not inter:
                continue
            jac = inter / len(A | B)
            con = inter / min(len(A), len(B))
            for x, y in ((a, b), (b, a)):
                if con > closest.get(x, (0,))[0]:
                    closest[x] = (round(con, 3), round(jac, 3), y)
            if jac >= 0.15 or con >= 0.3:
                rec = {"locale": loc, "a": a, "b": b, "jaccard": round(jac, 3), "containment": round(con, 3), "shared_shingles": inter,
                       "a_id": by_url[a]["id"], "b_id": by_url[b]["id"]}
                dup_pairs.append(rec)
                near[a].append(rec)
                near[b].append(rec)
dup_pairs.sort(key=lambda r: -r["containment"])

# primary-query overlap between published URLs of a locale (parent/child pairs excluded)
q_pairs = []
for loc in LOCALES:
    rows = [r for r in pub if r["locale"] == loc and r["role"] in ("HUB", "SUPPORT")]
    toks = {r["id"]: qtokens(r.get("primary_query"), loc) for r in rows}
    # tokens used by more than 6% of the locale's queries (vietnam, hanoi, motorbike, rental, rules …) carry no intent
    df = collections.Counter(t for v in toks.values() for t in v)
    generic = {t for t, n in df.items() if n > 0.06 * len(rows)}
    for i, a in enumerate(rows):
        for b in rows[i + 1:]:
            if a.get("parent_id") == b["id"] or b.get("parent_id") == a["id"]:
                continue
            A, B = toks[a["id"]], toks[b["id"]]
            if not A or not B:
                continue
            j = len(A & B) / len(A | B)
            dA, dB = A - generic, B - generic
            dj = len(dA & dB) / len(dA | dB) if dA and dB else (1.0 if not dA and not dB else 0.0)
            if j >= 0.5 or dj >= 0.6:
                q_pairs.append({"locale": loc, "a_id": a["id"], "b_id": b["id"], "a_url": a["url"], "b_url": b["url"], "query_a": a["primary_query"],
                                "query_b": b["primary_query"], "jaccard": round(j, 2), "distinctive_jaccard": round(dj, 2),
                                "distinctive_shared": sorted(dA & dB), "distinct_from_a": bool(a.get("distinct_from")),
                                "distinct_from_b": bool(b.get("distinct_from"))})
q_pairs.sort(key=lambda r: (-r["distinctive_jaccard"], -r["jaccard"]))

# FAQ questions repeated on several pages of a locale
faq_rep = collections.defaultdict(list)
for u in pub_urls:
    if u in P:
        for q in P[u]["faq_q"]:
            faq_rep[(P[u]["loc"], re.sub(r"\s+", " ", q.casefold()).strip(" ?？"))].append(u)
faq_dupes = [{"locale": k[0], "question": k[1], "urls": v} for k, v in faq_rep.items() if len(set(v)) > 1]

# ------------------------------------------------------------------ legal freshness
SUPERSEDED = [
    ("DECREE_100_2019", re.compile(r"100/2019"), re.compile(r"168/2024"), "Decree 100/2019/NĐ-CP (traffic penalties) was replaced by Decree 168/2024/NĐ-CP from 1 Jan 2025"),
    ("DECREE_123_2021", re.compile(r"123/2021"), re.compile(r"168/2024"), "Decree 123/2021/NĐ-CP amended 100/2019; road-traffic penalties are in Decree 168/2024/NĐ-CP since 1 Jan 2025"),
    ("LAW_23_2008", re.compile(r"23/2008(/QH12)?|Luật Giao thông đường bộ (năm )?2008|Road Traffic Law (of )?2008|2008 Road Traffic Law"), re.compile(r"36/2024"),
     "Road Traffic Law 23/2008/QH12 was replaced on 1 Jan 2025 by Law 36/2024/QH15 (road traffic order and safety) and Law 35/2024/QH15 (roads)"),
    ("CIRCULAR_12_2017", re.compile(r"12/2017/TT-BGTVT"), re.compile(r"35/2024/TT-BGTVT|12/2025/TT-BCA|108/2026"), "Circular 12/2017/TT-BGTVT (driving licences) is superseded"),
    ("CIRCULAR_12_2025", re.compile(r"12/2025/TT-BCA"), re.compile(r"108/2026"), "Circular 12/2025/TT-BCA was replaced by Circular 108/2026/TT-BCA from 1 Jul 2026 (some testing clauses run to 28 Feb 2027)"),
]
SENT = re.compile(r"[^.!?。！？\n]+[.!?。！？]?")
legal = {}
for u in pub_urls:
    if u not in P:
        continue
    full = P[u]["body"] + " " + " ".join(P[u]["faq_q"])
    hits = []
    for code, old, new, note in SUPERSEDED:
        if old.search(full):
            hits.append({"code": code, "replacement_cited": bool(new.search(full)), "note": note,
                         "sentences": [s.strip()[:300] for s in SENT.findall(full) if old.search(s)][:3]})
    a1 = [s.strip()[:300] for s in SENT.findall(full) if re.search(r"\bA1\b", s) and re.search(r"\b175\s?(cc|cm|ccm|cm³|cm3|phân khối)", s, re.I)]
    if a1:
        hits.append({"code": "A1_175CC", "replacement_cited": bool(re.search(r"\b125\s?(cc|cm|ccm|cm³|cm3|phân khối)", full, re.I)),
                     "note": "Since 1 Jan 2025 (Law 36/2024/QH15) class A1 covers motorcycles up to 125 cm³ / 11 kW; up to 175 cm³ was the old A1",
                     "sentences": a1[:3]})
    if hits:
        legal[u] = hits

# ------------------------------------------------------------------ template strings left in English on other locales
en_tmpl = collections.defaultdict(collections.Counter)
for u, p in P.items():
    if p["loc"] == "en" and u.startswith("/en/"):
        for k, v in p["tmpl"].items():
            en_tmpl[k.split(":")[0] if k.startswith("aria") else k][v] += 1
BRAND = re.compile(r"VIETNAM\s*/\s*WHEELS|Vietnam Two-Wheel Guide", re.I)
ui_leaks = collections.defaultdict(list)
for u, p in P.items():
    if p["loc"] == "en" or not u.startswith(tuple(f"/{l}/" for l in LOCALES)):
        continue
    for k, v in p["tmpl"].items():
        base = k.split(":")[0] if k.startswith("aria") else k
        cleaned = BRAND.sub("", v).strip(" ·|/-")
        if len(re.findall(r"[A-Za-z]", cleaned)) < 3:
            continue
        if v in en_tmpl.get(base, {}) and not re.search(r"^(VI|EN|DE|FR|ES|NL|ZH|PT|KO|JA)$", v):
            ui_leaks[u].append({"slot": k, "text": v[:120]})

# ------------------------------------------------------------------ slugs
VI_SYL = re.compile(r"^(ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|[bcdghklmnprstvx])?[aeiouy]{1,3}(ch|ng|nh|[cmnpt])?$")
PINYIN = re.compile(r"^(?:(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(?:iang|iong|uang|ang|eng|ing|ong|uai|uan|ian|iao|ai|ei|ao|ou|an|en|in|un|ia|ie|iu|ua|uo|ui|ue|ve|er|a|e|i|o|u|v|n|ng))+$")
RR_KO = re.compile(r"^(?:(?:kk|tt|pp|ss|jj|ch|[gndrmbsjkthp])?(?:yae|yeo|wae|ae|ya|eo|ye|wa|oe|yo|wo|we|wi|yu|eu|ui|a|e|o|u|i)(?:ng|[kntlmp])?)+$")
ROMAJI = re.compile(r"^(?:(?:ky|gy|sh|sy|j|ch|ts|ny|hy|by|py|my|ry|[kgsztdnhbpmyrwf])?(?:ou|uu|a|i|u|e|o)|n)+$")
en_vocab = collections.Counter(t for u in pub_urls if u.startswith("/en/") for t in u.strip("/").split("/")[-1].split("-"))
NEUTRAL = re.compile(r"^(\w*\d\w*|wave|vision|air|blade|lead|sh|vario|nvx|exciter|winner|janus|grande|latte|freego|lexi|nmax|xmax|pcx|cub|dream|future|sirius|jupiter|raider|satria|vespa|liberty|medley|beverly|mp3|smart|key|vietnam|hanoi|honda|yamaha|vespa|suzuki|sym|piaggio|vinfast|grab|bmw|ktm|ducati|triumph|harley|kawasaki|a1|a2|b1|b2|cc|ev|gps|sim|ha|giang|sapa|hue|da|nang|hoi|an|ninh|binh|ho|chi|minh|saigon|mai|chau|cao|bang|ba|be|cat|ba|lang|son|mu|cang|chai)$")


def slug_class(slug, loc):
    toks = [t for t in slug.split("-") if t]
    native = {"vi": VI_SYL, "zh": PINYIN, "ko": RR_KO, "ja": ROMAJI}.get(loc)
    n_en = n_nat = n_neu = 0
    for t in toks:
        if NEUTRAL.match(t):
            n_neu += 1
        elif t in en_vocab and not (native and native.match(t) and len(t) <= 4):
            n_en += 1
        elif native and native.match(t):
            n_nat += 1
    scored = max(1, len(toks) - n_neu)
    if native is None:
        return "LOCAL_LATIN", n_en, len(toks)
    if n_en / scored >= 0.6:
        return "ENGLISH", n_en, len(toks)
    if n_nat / scored >= 0.6:
        return "NATIVE_ROMANIZED", n_en, len(toks)
    return "MIXED", n_en, len(toks)


slugs = {}
for r in pub:
    parts = r["url"].strip("/").split("/")
    if len(parts) >= 3:
        s = parts[-1]
        cls, n_en, n_tok = slug_class(s, r["locale"])
        slugs[r["url"]] = {"slug": s, "section": parts[1], "chars": len(s), "tokens": n_tok, "ascii": s.isascii(),
                           "diacritics": any(unicodedata.combining(c) for c in unicodedata.normalize("NFD", s)), "class": cls, "english_tokens": n_en}

# ------------------------------------------------------------------ topic slots present in every locale (hreflang candidates)
slot = collections.defaultdict(dict)
for r in pub:
    m = re.match(r"^[A-Z]{2}-((H|S)\d+)$", r["id"])
    if m:
        slot[m.group(1)][r["locale"]] = r


def refset(mid):
    return {s["url"].rstrip("/") for s in (packets.get(mid, {}).get("sources") or [])}


eq = []
for sid, locs in sorted(slot.items(), key=lambda kv: (kv[0][0], int(kv[0][1:]))):
    if len(locs) < 10:
        continue
    clusters = collections.Counter(r["cluster"] for r in locs.values())
    subs = collections.Counter(r.get("subcluster") for r in locs.values())
    ids = [r["id"] for r in locs.values()]
    jac = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            A, B = refset(a), refset(b)
            if A and B:
                jac.append(len(A & B) / len(A | B))
    med_j = round(sorted(jac)[len(jac) // 2], 2) if jac else None
    # Only the launch set (Hubs H01–H04, Supporting S01–S08) was planned as the same topic in every locale; later slot
    # numbers are independent per locale. Same cluster+subcluster everywhere and ≥ 0.6 shared references = strong evidence.
    pilot = sid.startswith("H") or int(sid[1:]) <= 8
    agree = clusters.most_common(1)[0][1] == len(locs) and subs.most_common(1)[0][1] == len(locs)
    level = ("STRONG" if (med_j or 0) >= 0.6 else "TOPIC_ONLY") if pilot and agree else "NOT_EQUIVALENT"
    eq.append({"slot": sid, "locales": len(locs), "cluster_agreement": clusters.most_common(1)[0][1], "cluster": clusters.most_common(1)[0][0],
               "subcluster_agreement": subs.most_common(1)[0][1], "median_shared_refs_jaccard": med_j, "equivalence": level,
               "urls": {l: r["url"] for l, r in locs.items()}, "titles": {l: r["working_title"] for l, r in locs.items()}})
eq_by_url = {u: (e["slot"], e["equivalence"]) for e in eq for u in e["urls"].values() if e["equivalence"] != "NOT_EQUIVALENT"}
# TECH-10 decision (data/seo/hreflang-equivalents.json): translation groups carry reciprocal hreflang; the other
# versions of a reviewed slot are independent articles. Reviewed slots are no longer open candidates.
_eqf = os.path.join(ROOT, "data", "seo", "hreflang-equivalents.json")
eq_groups = json.load(open(_eqf, encoding="utf-8"))["groups"] if os.path.exists(_eqf) else []
grouped_ids = {i for g in eq_groups for i in g["ids"]}
reviewed_slots = {g["slot"] for g in eq_groups} | ({e["slot"] for e in eq} if eq_groups else set())
for e in eq:
    e["reviewed"] = e["slot"] in reviewed_slots
    e["hreflang_groups"] = [g["ids"] for g in eq_groups if g["slot"] == e["slot"]]

# ------------------------------------------------------------------ silo coverage per locale
silo_cov = collections.defaultdict(lambda: collections.Counter())
for r in pub:
    if r["role"] == "SUPPORT":
        silo_cov[r["cluster"]][r["locale"]] += 1

# ------------------------------------------------------------------ intent labels on Hubs whose query names a rental/price action
RENTAL = re.compile(r"thuê|giá thuê|rent|rental|hire|mieten|miete|louer|location|alquil|huur|huren|租|alug|aluguer|렌트|대여|レンタル", re.I)
intent_review = [{"id": r["id"], "url": r["url"], "locale": r["locale"], "primary_query": r["primary_query"], "search_intent": r["search_intent"]}
                 for r in pub if r["role"] == "HUB" and r.get("search_intent") == "informational" and RENTAL.search(r.get("primary_query") or "")]

# ------------------------------------------------------------------ per-URL records
today = datetime.date.fromisoformat(AUDIT_DATE)
per_url = {}
pr_rank = {}
for loc in LOCALES:
    us = sorted((u for u in pub_urls if u in P and P[u]["loc"] == loc), key=lambda u: -pr.get(u, 0))
    for i, u in enumerate(us, 1):
        pr_rank[u] = i
for u in pub_urls:
    if u not in P:
        continue
    p, r = P[u], by_url[u]
    art = p["art"] or {}
    dp, dm = (p["dated"] or {}).get("datePublished"), (p["dated"] or {}).get("dateModified")
    lm = sitemap_lastmod.get(u)
    issues = []
    try:
        dpd = datetime.date.fromisoformat(dp[:10]) if dp else None
        dmd = datetime.date.fromisoformat(dm[:10]) if dm else None
    except ValueError:
        dpd = dmd = None
        issues.append("unparseable date")
    if dpd and dmd and dmd < dpd:
        issues.append("dateModified before datePublished")
    if dmd and dmd > today:
        issues.append("dateModified in the future")
    if dm and lm and lm[:10] != dm[:10]:
        issues.append(f"sitemap lastmod {lm} ≠ dateModified {dm[:10]}")
    if p["dated"] and not dm:
        issues.append("no dateModified")
    if art and art.get("mainEntityOfPage") not in (p["canonical"], {"@id": p["canonical"]}):
        issues.append("mainEntityOfPage ≠ canonical")
    img = (art.get("image") or {}).get("url") if isinstance(art.get("image"), dict) else art.get("image")
    if art and img and img.startswith(ORIGIN) and not os.path.exists(rel(img.replace(ORIGIN, "").lstrip("/"))):
        issues.append("Article image file missing")
    if art and len(art.get("headline", "")) > 110:
        issues.append("headline > 110 characters")
    items = (p["crumbs"] or {}).get("itemListElement") or []
    if items and r["role"] in ("HUB", "SUPPORT") and items[-1].get("item") != p["canonical"]:
        issues.append("BreadcrumbList does not end at the page")
    pkt = packets.get(r["id"], {})
    best = closest.get(u)
    ext = p["outbound"]
    per_url[u] = {
        "matrix_id": r["id"], "locale": r["locale"], "role": r["role"],
        "click_depth": depth_all.get(u), "click_depth_main": depth_main.get(u), "inbound_pages_any": inbound_any.get(u, 0),
        "internal_pagerank": round(pr.get(u, 0) * 1000, 4), "pagerank_rank_in_locale": pr_rank.get(u),
        "noncanonical_internal_links": len(p["noncanon"]), "noncanonical_examples": p["noncanon"][:3],
        "outbound_links": len(ext), "outbound_hosts": len({e["host"] for e in ext}), "outbound_http": sum(e["http"] for e in ext),
        "outbound_blank_no_noopener": sum(1 for e in ext if e["blank"] and not e["noopener"]), "outbound_nofollow": sum(1 for e in ext if "nofollow" in e["rel"]),
        "visible_date": p["visible_date"], "time_tags": p["time_tags"], "refs_rendered": p["refs"], "refs_checked_on_rendered": p["refs_dated"],
        "packet_sources": len(pkt.get("sources") or []), "packet_sources_checked_on": sum(1 for s in (pkt.get("sources") or []) if s.get("checked_on")),
        "date_published": dp, "date_modified": dm, "sitemap_lastmod": lm, "schema_issues": issues,
        "dup_best_url": best[2] if best else None, "dup_best_jaccard": best[1] if best else 0, "dup_best_containment": best[0] if best else 0,
        "lead_pq_cov": coverage(r.get("primary_query"), p["lead"], r["locale"]), "h2_pq_cov": coverage(r.get("primary_query"), " ".join(p["h2s"]), r["locale"]),
        "body_units": len(p["body"].split()) if r["locale"] not in ("zh", "ja") else len(CJK.findall(p["body"])),
        "faq_questions": len(p["faq_q"]), "legal_flags": [h["code"] + ("" if h["replacement_cited"] else "*") for h in legal.get(u, [])],
        "ui_untranslated": len(ui_leaks.get(u, [])), "slug": slugs.get(u, {}).get("slug"), "slug_class": slugs.get(u, {}).get("class"),
        "og_image_check": ("MISSING_FILE" if p["og_image"] and not p["og_image_real"] else
                           ("DIMENSION_MISMATCH" if p["og_image_real"] and p["og_image_meta"] != (0, 0) and tuple(p["og_image_real"]) != p["og_image_meta"] else "OK")),
        "og_image_size": "x".join(map(str, p["og_image_real"])) if p["og_image_real"] else None,
        "hreflang_class": ("TRUE_EQUIVALENT (hreflang)" if r["role"] in ("PILLAR", "LANGUAGE_SELECTOR") or r["id"].endswith("-CHECKLIST") or r["id"] in grouped_ids
                           else (f"REVIEWED_INDEPENDENT ({eq_by_url[u][0]})" if u in eq_by_url and eq_by_url[u][0] in reviewed_slots
                                 else (f"EQUIVALENT_CANDIDATE_{eq_by_url[u][1]} ({eq_by_url[u][0]})" if u in eq_by_url else "NO_EQUIVALENT_BY_DESIGN"))),
    }

summary = {
    "pages_parsed": len(P), "published": len(pub_urls),
    "click_depth_all": dict(collections.Counter(depth_all.get(u) for u in pub_urls)), "click_depth_main": dict(collections.Counter(depth_main.get(u) for u in pub_urls)),
    "unreachable_all": [u for u in pub_urls if u not in depth_all], "unreachable_main": [u for u in pub_urls if u not in depth_main],
    "no_inbound": [u for u in pub_urls if u != "/" and inbound_any.get(u, 0) == 0],
    "noncanonical_links": sum(len(P[u]["noncanon"]) for u in P), "noncanonical_by_issue": dict(collections.Counter(x["issue"] for u in P for x in P[u]["noncanon"])),
    "outbound_links": sum(len(P[u]["outbound"]) for u in pub_urls if u in P), "outbound_http": sum(x["outbound_http"] for x in per_url.values()),
    "outbound_blank_no_noopener": sum(x["outbound_blank_no_noopener"] for x in per_url.values()),
    "outbound_rel": dict(collections.Counter(" ".join(e["rel"]) or "(none)" for u in pub_urls if u in P for e in P[u]["outbound"])),
    "visible_date_pages": sum(1 for x in per_url.values() if x["visible_date"]), "time_tags": sum(x["time_tags"] for x in per_url.values()),
    "articles_with_refs": sum(1 for x in per_url.values() if x["refs_rendered"]), "refs_rendered": sum(x["refs_rendered"] for x in per_url.values()),
    "refs_checked_on_rendered": sum(x["refs_checked_on_rendered"] for x in per_url.values()),
    "packet_sources": sum(x["packet_sources"] for x in per_url.values()), "packet_sources_checked_on": sum(x["packet_sources_checked_on"] for x in per_url.values()),
    "schema_issue_pages": sum(1 for x in per_url.values() if x["schema_issues"]), "schema_issues": dict(collections.Counter(i.split(" ")[0] if i.startswith("sitemap") else i for x in per_url.values() for i in x["schema_issues"])),
    "dup_pairs": len(dup_pairs), "dup_pairs_containment_ge_0_5": sum(1 for d in dup_pairs if d["containment"] >= 0.5),
    "dup_max_containment": max((v[0] for v in closest.values()), default=0), "dup_max_jaccard": max((v[1] for v in closest.values()), default=0),
    "query_overlap_pairs": len(q_pairs), "query_overlap_without_distinct_from": sum(1 for q in q_pairs if not (q["distinct_from_a"] or q["distinct_from_b"])),
    "query_distinctive_overlap_ge_0_8": sum(1 for q in q_pairs if q["distinctive_jaccard"] >= 0.8),
    "hreflang_classes": dict(collections.Counter(x["hreflang_class"].split(" (")[0] for x in per_url.values())),
    "equivalence_slots": {e["slot"]: e["equivalence"] for e in eq if e["equivalence"] != "NOT_EQUIVALENT"},
    "faq_repeated_questions": len(faq_dupes), "legal_pages": len(legal),
    "legal_by_code": dict(collections.Counter(h["code"] + ("" if h["replacement_cited"] else " (replacement not cited)") for v in legal.values() for h in v)),
    "ui_leak_pages": len(ui_leaks), "ui_leak_slots": dict(collections.Counter(x["slot"].split(":")[0] if x["slot"].startswith("aria") else x["slot"] for v in ui_leaks.values() for x in v)),
    "slug_classes": {loc: dict(collections.Counter(v["class"] for u, v in slugs.items() if by_url[u]["locale"] == loc)) for loc in LOCALES},
    "path_sections": dict(collections.Counter(v["section"] for v in slugs.values())),
    "og_image_checks": dict(collections.Counter(x["og_image_check"] for x in per_url.values())),
    "og_image_sizes": dict(collections.Counter(x["og_image_size"] for x in per_url.values())),
    "topic_slots_all_locales": len(eq), "intent_review_hubs": len(intent_review),
}
data = {"audit_date": AUDIT_DATE, "head_commit": os.popen(f"git -C {ROOT} rev-parse HEAD").read().strip(), "summary": summary, "per_url": per_url,
        "dup_pairs": dup_pairs, "query_overlap_pairs": q_pairs, "faq_dupes": faq_dupes, "legal": legal, "ui_leaks": ui_leaks, "slugs": slugs,
        "equivalence_slots": eq, "silo_coverage": {k: dict(v) for k, v in silo_cov.items()}, "intent_review": intent_review}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(summary, ensure_ascii=False, indent=1))
