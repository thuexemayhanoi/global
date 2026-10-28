#!/usr/bin/env python3
"""Global SEO A-Z audit: rule engine.

Reads reports/seo/data/audit-data.json (from collect.py) and the raw evidence in
reports/seo/data/raw/, and writes the audit Master Matrix, findings, tasks and
locale matrix to reports/seo/data/. Read-only towards the site and the Matrix.

Every finding carries an evidence status:
  VERIFIED      measured directly in the committed build, the repo data or a live run
  INFERRED      derived by a heuristic or a third-party estimate; needs confirmation
  NOT_CHECKED   in scope but not measurable in this run (tool/network limits)
  NOT_CONNECTED needs a data source that is not connected (GSC, GA4, CrUX, ranks)
Usage: python3 docs/seo-audit/tools/analyze.py
"""
import collections, csv, json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA = os.path.join(ROOT, "reports", "seo", "data")
LOCALES = ["vi", "en", "de", "fr", "es", "nl", "zh", "pt", "ko", "ja"]
GH = "https://github.com/thuexemayhanoi/global"
ORIGIN = "https://global.rentbikehanoi.com"
AUDIT_DATE = "2026-10-27"
RECHECK = "2026-11-10"

d = json.load(open(os.path.join(DATA, "audit-data.json"), encoding="utf-8"))
ext = json.load(open(os.path.join(DATA, "raw", "external-evidence.json"), encoding="utf-8"))
kw = json.load(open(os.path.join(DATA, "raw", "keyword-metrics.json"), encoding="utf-8"))
SHA = d["head_commit"]
inv = d["inventory"]
pub = [r for r in inv if r["matrix_status"] == "PUBLISHED"]
articles = [r for r in pub if r["role"] in ("HUB", "SUPPORT") and not r["matrix_id"].endswith("CHECKLIST")]


def blob(path):
    return f"{GH}/blob/{SHA}/{path}"


LIVE_RUN = ext["github_actions"][0]["url"]
POST_RUN = ext["github_actions"][1]["url"]

# ---------- rule catalogue ----------
# id: (severity, category, evidence, owner/subsystem, title, action, expected, verify, done)
RULES = {
    "S-PILLAR-TRANSACTIONAL": ("P1", "Keyword / cross-site cannibalization", "VERIFIED", "Owner + Matrix (reviewed PR)",
        "Locale Pillars and the vehicle-choice Hubs target transactional rental head terms that the policy assigns to the sister rental sites",
        "Owner decides the domain split. Recommended: re-target each Pillar to an informational 'Hanoi/Vietnam motorbike guide' intent, keep the rental head term on thuexemaynguyentu.com (vi) / rentbikehanoi.com (en) and link to it; change Matrix primary_query/search_intent and the frozen title/H1 only in a reviewed PR with seo-guard --write.",
        "Each Pillar targets one informational query; no /global page competes for the sister sites' money keywords.",
        "Matrix diff + keyword data re-run; GSC (once connected) shows /global not ranking for the transactional head term.",
        "Owner decision recorded; Matrix rows and frozen fingerprints updated in a reviewed PR; seo-guard PASS."),
    "S-RAIL-ANCHOR": ("P2", "Internal linking / anchor text", "VERIFIED", "scripts/premium.mjs (build)",
        "Every article's 'Related guides' rail links the locale home with the same exact-match transactional anchor",
        "In scripts/premium.mjs use a descriptive, non-transactional localized anchor (e.g. the Pillar's guide name) for the home link; regenerate with build.mjs and verify build --check / seo-guard.",
        "No sitewide exact-match money anchor; anchor describes the guide hub.",
        "grep the rail markup across 1,054 pages; seo-guard ANCHOR checks.",
        "Reviewed PR merged; build --check, seo-guard, nav-qa PASS; live markup QA identical."),
    "S-GSC-NOT-CONNECTED": ("P1", "Measurement / indexing", "NOT_CONNECTED", "Owner (Google Search Console)",
        "No Search Console property is connected for global.rentbikehanoi.com; indexation, queries and coverage are unknown",
        "Verify a Domain property for global.rentbikehanoi.com, submit https://global.rentbikehanoi.com/sitemap.xml, connect it in OpenSEO (project f8184d9f…).",
        "Coverage, indexed count, queries and CWV field data become measurable.",
        "OpenSEO list_search_console_sites shows the property; URL Inspection works for sample URLs.",
        "Property verified, sitemap submitted and processed without errors; first coverage report stored in this workbook."),
    "S-GA4-NOT-CONNECTED": ("P2", "Measurement", "NOT_CONNECTED", "Owner (GA4)",
        "No analytics source is connected; organic traffic and engagement are unknown",
        "Decide whether to add privacy-compliant analytics (privacy page must be updated first); connect GA4 to OpenSEO if added.",
        "Organic landing-page traffic measurable per locale.", "OpenSEO GA4 tools return data.", "Owner decision recorded; data flowing or NOT_CONNECTED accepted."),
    "S-LOW-VISIBILITY": ("P1", "Off-page / visibility", "INFERRED", "Owner + Off-page",
        "Third-party index shows 0 ranking keywords, Domain Authority 2, 37 backlinks from 32 domains",
        "After GSC is connected, confirm visibility. Build a real off-page plan: links from the sister sites' relevant guides, travel-forum answers, partner/embassy-style resource pages; no paid or PBN links.",
        "Measured organic impressions and growing referring domains.", "GSC performance + backlink tool re-run monthly.",
        "Baseline captured in GSC; referring domains trend recorded in AUDIT CHANGELOG."),
    "S-KW-NO-DEMAND": ("P2", "Keyword research", "VERIFIED", "Topic Factory / Matrix",
        "Most Matrix primary queries are long-tail hypotheses with no measurable search volume (serp_evidence NOT_VALIDATED)",
        "Before promoting new IDEA rows, score candidates with real keyword data per market; keep long-tail question topics for AEO but order the Writer queue by demand and topical gap.",
        "Writer queue ordered by validated demand + topical need.", "keyword-metrics.json re-run per market each month.",
        "Topic Factory stores keyword metrics per candidate; ≥1 validated head/body query per Hub."),
    "S-SITEMAP-LASTMOD": ("P2", "Indexing / sitemaps", "VERIFIED", "scripts/sitemaps.mjs (build)",
        "No <lastmod> on any of the sitemap URLs",
        "Emit lastmod from the article dateModified (or publication date) in scripts/sitemaps.mjs; keep values truthful (change only when content changes).",
        "Every sitemap URL carries an accurate W3C date.", "node --test tests/sitemaps.test.mjs + grep lastmod count = URL count.",
        "Reviewed PR merged; sitemaps regenerated; post-publish QA PASS."),
    "S-ARTICLE-NO-IMAGE": ("P3", "Structured data", "VERIFIED", "scripts/articles.mjs / premium.mjs (build)",
        "Article JSON-LD has no image property (only the publisher logo)",
        "Add an image (existing hero/topic WebP, ≥1200px wide) to Article JSON-LD; JSON-LD types are frozen fingerprints, adding a property is not a type change but verify seo-guard.",
        "Article markup eligible for image-rich display.", "Rich Results Test on 3 sample URLs.", "Reviewed PR merged; audit-ai-search PASS."),
    "S-OG-IMAGE-SINGLE": ("P3", "Social / CTR", "VERIFIED", "scripts/premium.mjs (build)",
        "All published pages share the same og:image",
        "Use the four existing topic images per Hub silo (and keep the hero for Pillars).", "Distinct share previews per topic.",
        "grep og:image distribution.", "≥4 distinct og:image values across Hubs/Supporting."),
    "S-AUTHOR-ORG-ONLY": ("P2", "E-E-A-T", "VERIFIED", "Owner (editorial policy)",
        "Every article's author is the Organization; no human review (facts_reviewed_by_human=false) — correctly disclosed by the AI-provenance note",
        "Keep the honest provenance note. If the owner adds real human fact review, record reviewer identity and date per article; never invent bylines. Strengthen the About page with editorial method and correction policy.",
        "Trust signals improve without fabricated reviews.", "About page + per-article review metadata.", "Owner decision recorded."),
    "S-LOCALE-IMBALANCE": ("P2", "Multilingual coverage", "VERIFIED", "Writer slots / Topic Factory",
        "Coverage is uneven: DE has ~2.7× the published guides of other locales; ES has the fewest",
        "Steer Writer claims toward ES/VI/NL/ZH/PT/KO/JA READY rows; DE refill is RESEARCH_NEEDED anyway.",
        "Each locale within ±25% of the median guide count.", "topic-factory status per locale.", "Locale spread recorded monthly."),
    "S-PT-VARIANT": ("P3", "Multilingual / language variant", "VERIFIED", "Matrix + scripts/premium.mjs",
        "Portuguese bodies are European Portuguese, but the PT Pillar query, rail anchor and some titles use Brazilian forms (aluguel, Vietnã)",
        "Pick one variant (body evidence says pt-PT) and align the Pillar query, nav/rail anchors and titles in a reviewed PR.",
        "Consistent pt-PT vocabulary sitewide.", "Term count script over /pt/.", "Reviewed PR merged; language-audit PASS."),
    "S-DE-TOPIC-DRIFT": ("P2", "Topical authority", "INFERRED", "Topic Factory / Owner",
        "32 DE guides compare big-bike model ranges (BMW, Triumph, Harley, Kawasaki…) with weak relation to Hanoi rental/mobility intent and no measured demand",
        "Review these against the Hub scope; keep only models actually rented in Vietnam; stop promoting more model-range comparisons until demand is validated.",
        "DE topical map stays inside the travel-mobility scope.", "Matrix review of DE vehicle-choice silo.", "Owner/editor decision recorded per page."),
    "S-PQ-SENTENCE": ("P3", "Keyword research", "VERIFIED", "Topic Factory / Matrix",
        "80 DE primary queries are full natural-language questions over 80 characters, not keywords",
        "Store a short head/body query plus the question as secondary/FAQ phrasing in future promotions; do not rewrite published rows without review.",
        "Primary queries usable for rank tracking.", "Matrix length check.", "Future promotions comply."),
    "S-INTENT-LABEL": ("P3", "Keyword / intent", "VERIFIED", "Matrix",
        "Pillar rows are labelled 'informational' although market data classifies their queries as commercial/transactional",
        "Correct search_intent with the re-targeting decision (S-PILLAR-TRANSACTIONAL).", "Intent labels match SERP/keyword data.", "validate-plan.", "Matrix updated in reviewed PR."),
    "S-PRICE-FRESHNESS": ("P2", "Content accuracy", "VERIFIED", "Writers via reviewed PR",
        "fact-guard flags sourced third-party prices that need a dated re-check",
        "Re-check each flagged amount against its source; update date/source or remove the amount in a reviewed content PR (Auto Publisher never edits published pages).",
        "No stale third-party prices.", "fact-guard WARN count for the article = 0.", "WARN cleared or documented."),
    "S-PSI-MOBILE": ("P3", "Performance", "VERIFIED", "Build / hosting",
        "Lab mobile Speed Index 4.3 s on the homepage; PSI reports a redirect costing ~630 ms",
        "Identify the redirect (likely the tested start URL); make sure internal links and canonical/sitemap URLs use the final https URL with trailing slash; review hero/CSS weight for Speed Index.",
        "Mobile Speed Index < 3.4 s.", "Re-run PageSpeed on 5 template types.", "Two consecutive runs within target."),
    "S-CWV-FIELD": ("P3", "Performance", "NOT_CONNECTED", "Owner (GSC/CrUX)",
        "No field Core Web Vitals (CrUX) or INP data available", "Connect GSC; CrUX appears once traffic is sufficient.",
        "Field LCP/INP/CLS measurable.", "GSC Core Web Vitals report.", "Field data recorded or 'insufficient data' documented."),
    "S-REDIRECT-HEADERS": ("P3", "Technical", "NOT_CHECKED", "Audit (next run)",
        "http→https, www, non-slash redirects and response headers were not measurable from this audit environment",
        "Re-run from a network that can reach the host (or add a read-only header probe to post-publish-qa.yml).",
        "Redirect map and headers documented.", "curl -I matrix of 6 variants.", "Variants return a single 301 to the canonical URL."),
    "S-BUSINESS-CONFLICTS": ("P3", "Business data", "VERIFIED", "Owner",
        "Business reference has open owner conflicts (C1 hours, C2 delivery threshold, C3 GBP title)",
        "Owner resolves outside this repo; /global keeps the canonical column and shows no NAP while flags are false.",
        "Conflicts closed in docs/BUSINESS-REFERENCE.md.", "fact-guard.", "Conflict rows set to RESOLVED in a reviewed PR."),
    "S-FAQ-SCHEMA": ("P3", "Schema / AEO", "INFERRED", "scripts/articles.mjs (build)",
        "Pages with a visible FAQ section have no FAQPage markup (Google shows FAQ rich results mainly for government/health sites, so the gain is AEO/answer extraction only)",
        "Optional: add FAQPage only where the visible Q&A matches exactly; do not expect rich results.",
        "Machine-readable Q&A for answer engines.", "Rich Results Test / schema validator.", "Decision recorded."),
    "S-CHECKLIST-NO-REFS": ("P3", "E-E-A-T", "VERIFIED", "Reviewed content PR",
        "The 10 checklist pages cite no sources", "Add the official sources the checklist relies on (licence, insurance, registration).",
        "Checklist claims sourced.", "references count > 0.", "Reviewed PR merged."),
    "U-TITLE-LONG": ("P3", "On-page / CTR", "INFERRED", "Reviewed metadata PR",
        "Title likely truncated in SERPs (display width > 65; CJK/Hangul counted double)",
        "Shorten to ≤ 60 display width, front-load the topic; titles are frozen — change only in a reviewed metadata PR.",
        "Full title visible in SERP.", "Width check in this workbook.", "Width ≤ 65 after reviewed PR."),
    "U-DESC-LONG": ("P3", "On-page / CTR", "INFERRED", "Reviewed metadata PR",
        "Meta description likely truncated (display width > 165)", "Tighten to ~120–160 width (≈ 60–80 CJK characters).",
        "Complete snippet.", "Width check.", "Width ≤ 165 after reviewed PR."),
    "U-DESC-SHORT": ("P3", "On-page / CTR", "INFERRED", "Reviewed metadata PR",
        "Meta description short (display width < 100)", "Expand with the page's answer and qualifier.", "Fuller snippet.", "Width check.", "Width ≥ 100."),
    "U-THIN": ("P2", "Content depth", "INFERRED", "Reviewed content PR",
        "Main text below 50% of the median for its locale and role", "Check intent coverage; expand or merge with a sibling if the topic is narrow.",
        "Page fully answers its intent.", "content_units vs locale median.", "≥ 50% of median or merge decision recorded."),
    "U-NO-OFFICIAL-SOURCE": ("P3", "E-E-A-T / sources", "INFERRED", "Reviewed content PR",
        "No reference on an official (government) domain detected by the audit heuristic",
        "If the page makes legal/safety claims, add the official source (law/decree portal); otherwise ignore.",
        "Legal claims trace to official sources.", "references classification.", "≥1 official source or N/A recorded."),
    "U-LOW-INBOUND": ("P3", "Internal linking", "VERIFIED", "scripts/articles.mjs / premium.mjs",
        "Fewer than 3 contextual inbound links from other pages", "Add the page to relevant sibling 'related' sets or Hub sections.",
        "Page reachable from ≥3 contextual links.", "inbound_contextual.", "≥ 3."),
    "U-PQ-WEAK": ("P3", "Keyword targeting", "INFERRED", "Reviewed metadata PR",
        "Primary query terms weakly present in title and H1 (< 50% token overlap)", "Verify the query is the right target; align title/H1 wording if it is.",
        "Title/H1 reflect the target query.", "pq_cov_title / pq_cov_h1.", "≥ 0.5 or query re-targeted."),
    "U-PRICE-REVIEW": ("P2", "Content accuracy", "VERIFIED", "Reviewed content PR",
        "fact-guard: sourced third-party prices need a dated re-check", "Re-check against the cited source and date.",
        "Prices current and dated.", "fact-guard WARN count.", "0 WARN for this article."),
    "U-GRAPH-UPGRADE": ("P2", "Topical authority", "VERIFIED", "Reviewed content PR",
        "Content graph recommends UPGRADE", "Apply the graph recommendation (depth/links) in a reviewed PR.", "Node turns KEEP.", "content-graph --check.", "Action KEEP."),
    "U-GRAPH-REVIEW": ("P2", "Cannibalization", "VERIFIED", "Editor (reviewed PR)",
        "Content graph flags REVIEW (overlap with another URL)", "Decide differentiate / merge+redirect plan; never delete a live URL without a reviewed redirect.",
        "Distinct intents per URL.", "review_pairs.", "Decision recorded; graph action KEEP."),
    "U-TITLE-SIMILAR": ("P3", "Cannibalization", "INFERRED", "Editor",
        "H1/title trigram similarity ≥ 0.5 with another Supporting page in the same locale", "Confirm the intents differ; sharpen titles if they do.",
        "Distinguishable titles.", "title_similarity_pairs.", "Reviewed."),
    "U-ANCHOR-DIVERSITY": ("P3", "Internal linking", "VERIFIED", "scripts/premium.mjs",
        "seo-guard: many pages link here with the identical anchor", "Vary related-list anchors (short title variant).", "Diverse anchors.", "seo-guard WARN.", "WARN cleared."),
}

findings, seq = [], collections.Counter()


def add(rule, scope, locale, url=None, matrix_id=None, detail="", evidence_url=None, metric=None):
    sev, cat, ev, owner, title, action, expected, verify, done = RULES[rule]
    seq[rule] += 1
    fid = f"F-{rule}-{seq[rule]:04d}"
    task = f"T-{rule}" + (f"-{locale.upper()}" if locale and locale not in ("ALL", "global") and rule.startswith("U-") else "")
    findings.append({"finding_id": fid, "rule_id": rule, "severity": sev, "category": cat, "evidence_status": ev, "scope": scope, "locale": locale,
                     "url": (ORIGIN + url) if url else None, "matrix_id": matrix_id, "title": title, "detail": detail, "metric": metric,
                     "owner": owner, "task_id": task, "work_status": "OPEN" if ev != "NOT_CONNECTED" else "BLOCKED",
                     "evidence_url": evidence_url, "audit_date": AUDIT_DATE, "recheck_date": RECHECK})


# ---------- site-level ----------
kwm = kw["markets"]
vi_hit = {x["keyword"]: x for x in kwm["vi"]["returned"]}
en_hit = {x["keyword"]: x for x in kwm["en"]["returned"]}
for r in pub:
    if r["role"] == "PILLAR":
        q = r["primary_query"]
        data = {"vi": vi_hit.get("thuê xe máy hà nội"), "en": en_hit.get("motorbike rental hanoi")}.get(r["locale"])
        m = f"{data['search_volume']}/mo, intent {data['main_intent']}" if data else "market data: see KEYWORD MATRIX"
        add("S-PILLAR-TRANSACTIONAL", "URL", r["locale"], r["url"], r["matrix_id"], f"primary_query '{q}' ({m})", blob("data/seo/master-matrix.json"), m)
        add("S-INTENT-LABEL", "URL", r["locale"], r["url"], r["matrix_id"], f"search_intent={r['search_intent']} for '{q}'", blob("data/seo/master-matrix.json"))
rail_counts = collections.Counter(r["locale"] for r in articles)
for loc in LOCALES:
    add("S-RAIL-ANCHOR", "LOCALE", loc, f"/{loc}/", f"{loc.upper()}-HOME", f"~{rail_counts[loc]} articles link /{loc}/ with the Pillar's transactional query as anchor", blob("scripts/premium.mjs"))
add("S-GSC-NOT-CONNECTED", "SITE", "ALL", detail=ext["search_console"]["evidence"])
add("S-GA4-NOT-CONNECTED", "SITE", "ALL")
u = ext["ubersuggest_domain_overview"]
add("S-LOW-VISIBILITY", "SITE", "ALL", detail=f"organic keywords {u['organic_keywords']}, DA {u['domain_authority']}, backlinks {u['backlinks']}, referring domains {u['referring_domains']} (Ubersuggest, {u['months_reported']})", metric=f"RD={u['referring_domains']}")
for loc, mk in kwm.items():
    if mk.get("status") == "NOT_CHECKED" or mk.get("queried", 0) < 50:
        continue
    vol = [x for x in mk["returned"] if x.get("search_volume")]
    add("S-KW-NO-DEMAND", "LOCALE", loc, detail=f"{mk['location']}: {len(vol)} of {mk['queried']} primary queries have measurable volume", metric=f"{len(vol)}/{mk['queried']}")
add("S-SITEMAP-LASTMOD", "SITE", "ALL", "/sitemap.xml", detail=f"{d['sitemap']['lastmod_missing']} of {d['sitemap']['urls']} URL entries without lastmod", evidence_url=blob("scripts/sitemaps.mjs"), metric=d["sitemap"]["lastmod_missing"])
add("S-ARTICLE-NO-IMAGE", "SITE", "ALL", detail=f"{len([r for r in pub if 'Article' in (r.get('schema_types') or [])])} Article graphs without image", evidence_url=blob("scripts/premium.mjs"))
add("S-OG-IMAGE-SINGLE", "SITE", "ALL", detail=f"{len(pub)} pages use {ORIGIN}/hero-hanoi.webp")
add("S-AUTHOR-ORG-ONLY", "SITE", "ALL", detail=f"{len([r for r in pub if r.get('author_types') == ['Organization']])} Article graphs with Organization author; provenance note present on {sum(1 for r in pub if r.get('provenance_note'))} pages")
counts = {loc: sum(1 for r in articles if r["locale"] == loc) for loc in LOCALES}
med = sorted(counts.values())[len(counts) // 2]
for loc, n in counts.items():
    if abs(n - med) / med > 0.25:
        add("S-LOCALE-IMBALANCE", "LOCALE", loc, f"/{loc}/", detail=f"{n} Hub/Supporting guides vs locale median {med}", metric=n)
add("S-PT-VARIANT", "LOCALE", "pt", "/pt/", "PT-HOME", "Body text is pt-PT on 91/91 pages (vietname, conduzir, travão, telemóvel); Pillar query 'aluguel de motos Hanói' and the rail anchor use pt-BR", blob("data/seo/master-matrix.json"))
for r in pub:
    if r["locale"] == "de" and "Unterschiede" in (r["primary_query"] or ""):
        add("S-DE-TOPIC-DRIFT", "URL", "de", r["url"], r["matrix_id"], r["primary_query"][:120])
long_pq = [r for r in pub if len(r["primary_query"] or "") > 80]
add("S-PQ-SENTENCE", "LOCALE", "de", detail=f"{len(long_pq)} published rows with primary_query > 80 characters", evidence_url=blob("data/seo/master-matrix.json"), metric=len(long_pq))
fw = sum(r["fact_guard_warns"] for r in pub)
add("S-PRICE-FRESHNESS", "SITE", "ALL", detail=f"{fw} WARN on {sum(1 for r in pub if r['fact_guard_warns'])} published articles", evidence_url=blob("scripts/seo/fact-guard.mjs"), metric=fw)
add("S-PSI-MOBILE", "URL", "global", "/", "ROOT", "Mobile: FCP 1.3 s, LCP 1.7 s, SI 4.3 s, TBT 14 ms, CLS 0; Desktop LCP 529 ms; redirect opportunity 630 ms (mobile)", metric="SI 4.3 s")
add("S-CWV-FIELD", "SITE", "ALL")
add("S-REDIRECT-HEADERS", "SITE", "ALL", detail=ext["redirect_and_header_probes"]["reason"])
add("S-BUSINESS-CONFLICTS", "SITE", "ALL", detail="C1-hours, C2-delivery, C3-name", evidence_url=blob("docs/BUSINESS-REFERENCE.md"))
add("S-FAQ-SCHEMA", "SITE", "ALL", detail=f"{sum(1 for r in pub if r.get('faq_visible'))} pages with a visible FAQ heading; 0 FAQPage graphs")
for r in pub:
    if r["matrix_id"].endswith("-CHECKLIST") and r.get("references", 0) == 0:
        add("S-CHECKLIST-NO-REFS", "URL", r["locale"], r["url"], r["matrix_id"], "0 references")

# ---------- per-URL ----------
for r in pub:
    loc = r["locale"] if r["locale"] != "global" else "global"
    if r.get("title_width", 0) > 65:
        add("U-TITLE-LONG", "URL", loc, r["url"], r["matrix_id"], r["title"], metric=r["title_width"])
    if r.get("desc_width", 0) > 165:
        add("U-DESC-LONG", "URL", loc, r["url"], r["matrix_id"], f"width {r['desc_width']}", metric=r["desc_width"])
    elif r.get("desc_width", 999) < 100:
        add("U-DESC-SHORT", "URL", loc, r["url"], r["matrix_id"], r["description"], metric=r["desc_width"])
    if r in articles:
        m = r.get("locale_role_median_units") or 0
        if m and r["content_units"] < 0.5 * m:
            add("U-THIN", "URL", loc, r["url"], r["matrix_id"], f"{r['content_units']} {r['unit_kind']} vs median {m}", metric=r["content_units"])
        if r.get("references", 0) > 0 and r.get("ref_official", 0) == 0:
            add("U-NO-OFFICIAL-SOURCE", "URL", loc, r["url"], r["matrix_id"], f"{r['references']} refs: {r['ref_legal_db']} legal DB, {r['ref_third_party']} third-party", metric=r["references"])
        if r.get("inbound_contextual", 0) < 3:
            add("U-LOW-INBOUND", "URL", loc, r["url"], r["matrix_id"], f"{r['inbound_contextual']} contextual inbound", metric=r["inbound_contextual"])
        if (r.get("pq_cov_title") or 0) < 0.5 and (r.get("pq_cov_h1") or 0) < 0.5:
            add("U-PQ-WEAK", "URL", loc, r["url"], r["matrix_id"], f"'{r['primary_query']}' title {r.get('pq_cov_title')} / H1 {r.get('pq_cov_h1')}", metric=r.get("pq_cov_title"))
    if r["fact_guard_warns"]:
        add("U-PRICE-REVIEW", "URL", loc, r["url"], r["matrix_id"], f"{r['fact_guard_warns']} THIRD_PARTY_PRICE_REVIEW", blob(f"content/articles/{r['matrix_id']}.json"), r["fact_guard_warns"])
    if r.get("graph_action") == "UPGRADE":
        add("U-GRAPH-UPGRADE", "URL", loc, r["url"], r["matrix_id"], r.get("graph_qa_status") or "", blob("docs/GLOBAL-SITE-MATRIX.md"))
    if r.get("graph_action") == "REVIEW" or r.get("review_pairs"):
        pairs = ", ".join(f"{p['other']} ({p['score']})" for p in r.get("review_pairs", []))
        add("U-GRAPH-REVIEW", "URL", loc, r["url"], r["matrix_id"], f"overlap with {pairs}" if pairs else (r.get("graph_qa_status") or ""), blob("data/seo/content-graph.json"))
    for w in r.get("seo_guard_warns", []):
        add("U-ANCHOR-DIVERSITY", "URL", loc, r["url"], r["matrix_id"], w["detail"][:200])
byid = {r["matrix_id"]: r for r in inv}
for p in d["title_similarity_pairs"]:
    add("U-TITLE-SIMILAR", "URL", p["locale"], p["url_a"], p["a"], f"vs {p['b']} {p['url_b']} (Jaccard {p['title_trigram_jaccard']})", metric=p["title_trigram_jaccard"])

# ---------- tasks ----------
tasks = {}
prio_rank = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
effort = {"S-PILLAR-TRANSACTIONAL": "M", "S-RAIL-ANCHOR": "S", "S-GSC-NOT-CONNECTED": "S", "S-GA4-NOT-CONNECTED": "S", "S-LOW-VISIBILITY": "L",
          "S-KW-NO-DEMAND": "M", "S-SITEMAP-LASTMOD": "S", "S-ARTICLE-NO-IMAGE": "S", "S-OG-IMAGE-SINGLE": "S", "S-AUTHOR-ORG-ONLY": "M",
          "S-LOCALE-IMBALANCE": "L", "S-PT-VARIANT": "S", "S-DE-TOPIC-DRIFT": "M", "S-PQ-SENTENCE": "S", "S-INTENT-LABEL": "S", "S-PRICE-FRESHNESS": "L",
          "S-PSI-MOBILE": "M", "S-CWV-FIELD": "S", "S-REDIRECT-HEADERS": "S", "S-BUSINESS-CONFLICTS": "S", "S-FAQ-SCHEMA": "M", "S-CHECKLIST-NO-REFS": "S"}
impact = {"P1": "High", "P2": "Medium", "P3": "Low"}
phase = {"P1": "Phase 1 (0–2 weeks)", "P2": "Phase 2 (2–6 weeks)", "P3": "Phase 3 (6–12 weeks)"}
for f in findings:
    t = tasks.setdefault(f["task_id"], {"task_id": f["task_id"], "rule_id": f["rule_id"], "severity": f["severity"], "category": f["category"],
                                        "locale": f["locale"] if f["rule_id"].startswith("U-") else ("ALL" if f["scope"] == "SITE" else "MULTI"),
                                        "title": RULES[f["rule_id"]][4], "action": RULES[f["rule_id"]][5], "expected_result": RULES[f["rule_id"]][6],
                                        "verification": RULES[f["rule_id"]][7], "done_criteria": RULES[f["rule_id"]][8], "owner": f["owner"],
                                        "evidence_status": f["evidence_status"], "findings": 0, "impact": impact[f["severity"]],
                                        "effort": effort.get(f["rule_id"], "S" if f["rule_id"].startswith("U-") else "M"),
                                        "phase": phase[f["severity"]], "work_status": f["work_status"], "start": None, "due": None})
    t["findings"] += 1
    if t["locale"] == "MULTI" and f["locale"] not in ("ALL",):
        t.setdefault("_locs", set()).add(f["locale"])
eff_rank = {"S": 0, "M": 1, "L": 2}
order = sorted(tasks.values(), key=lambda t: (prio_rank[t["severity"]], eff_rank[t["effort"]], -t["findings"], t["task_id"]))
for i, t in enumerate(order, 1):
    t["order"] = i
    if "_locs" in t:
        t["locale"] = ",".join(sorted(t.pop("_locs")))

# ---------- locale matrix ----------
tf = {}
txt = open(os.path.join(DATA, "raw", "tf.txt"), encoding="utf-8").read()
try:
    tf = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
except Exception:
    tf = {}
locale_rows = []
for loc in LOCALES:
    P = [r for r in pub if r["locale"] == loc]
    A = [r for r in articles if r["locale"] == loc]
    I = [r for r in inv if r["locale"] == loc and r["matrix_status"] != "PUBLISHED"]
    F = [f for f in findings if f["locale"] == loc]
    tl = tf.get("locales", {}).get(loc, {})
    locale_rows.append({
        "locale": loc, "published_urls": len(P), "pillar": sum(r["role"] == "PILLAR" for r in P), "hubs": sum(r["role"] == "HUB" for r in P),
        "supporting": sum(r["role"] == "SUPPORT" for r in P), "idea_rows": len(I), "ready": sum(r["pipeline_status"] == "READY" for r in I),
        "claimed": sum(r["pipeline_status"] == "CLAIMED" for r in I), "submitted_open": sum(r["pipeline_status"] == "SUBMITTED" for r in I),
        "topic_factory_proposed": tl.get("proposed"), "topic_factory_refill": tl.get("refill"),
        "candidates_blocked": sum(1 for c in d["candidates"] if c["locale"] == loc and c.get("status") == "ARCHITECTURE_BLOCKED"),
        "in_sitemap": sum(r["in_sitemap"] for r in P), "frozen": sum(r["frozen"] for r in P), "html_lang_ok": sum(1 for r in P if r.get("html_lang") and r["html_lang"].split("-")[0] == loc),
        "canonical_self": sum(1 for r in P if r.get("canonical_self")), "hreflang_pages": sum(1 for r in P if r.get("hreflang_count")),
        "median_units": sorted(r["content_units"] for r in A)[len(A) // 2] if A else 0, "unit_kind": "cjk_chars" if loc in ("zh", "ja") else "words",
        "median_refs": sorted(r["references"] for r in A)[len(A) // 2] if A else 0,
        "title_long": sum(1 for f in F if f["rule_id"] == "U-TITLE-LONG"), "desc_long": sum(1 for f in F if f["rule_id"] == "U-DESC-LONG"),
        "thin": sum(1 for f in F if f["rule_id"] == "U-THIN"), "price_review": sum(1 for f in F if f["rule_id"] == "U-PRICE-REVIEW"),
        "findings_P1": sum(1 for f in F if f["severity"] == "P1"), "findings_P2": sum(1 for f in F if f["severity"] == "P2"), "findings_P3": sum(1 for f in F if f["severity"] == "P3"),
        "keyword_data": (kwm.get(loc, {}).get("status") or f"{len([x for x in kwm.get(loc, {}).get('returned', []) if x.get('search_volume')])}/{kwm.get(loc, {}).get('queried')} with volume"),
    })

# ---------- audit master matrix (one row per URL / Matrix row) ----------
fx = collections.defaultdict(list)
for f in findings:
    if f["matrix_id"]:
        fx[f["matrix_id"]].append(f)
kw_by = {}
for loc, mk in kwm.items():
    for x in mk.get("returned", []):
        kw_by[(loc, x["keyword"].lower())] = x
master = []
for r in inv + [{"matrix_id": None, "url": x["url"], "locale": "global", "role": "UTILITY_NOINDEX", "matrix_status": "NOT_IN_MATRIX", "pipeline_status": "NOINDEX_UTILITY", **x} for x in d["non_matrix_pages"]]:
    fs = fx.get(r.get("matrix_id"), [])
    sev = min((f["severity"] for f in fs), default=None, key=lambda s: prio_rank[s])
    k = kw_by.get((r["locale"], (r.get("primary_query") or "").lower()))
    published = r["matrix_status"] == "PUBLISHED"
    master.append({**{k2: v for k2, v in r.items() if k2 not in ("h2_outline", "hreflang", "review_pairs", "seo_guard_warns", "sha256")},
                   "audit_id": f"A-{r.get('matrix_id') or r['url'].strip('/').replace('/', '-').upper() or 'ROOT'}",
                   "http_status_live": 200 if published or r["matrix_status"] == "NOT_IN_MATRIX" else None,
                   "live_evidence": "VERIFIED (live markup QA run 40604722403)" if published or r["matrix_status"] == "NOT_IN_MATRIX" else "N/A (not a URL yet)",
                   "pq_volume": k.get("search_volume") if k else None, "pq_intent_market": k.get("main_intent") if k else None,
                   "pq_kd": k.get("keyword_difficulty") if k else None,
                   "keyword_evidence": ("VERIFIED" if k else ("VERIFIED_NO_VOLUME" if kwm.get(r["locale"], {}).get("queried", 0) >= 50 and published else "NOT_CHECKED")),
                   "finding_ids": " ".join(f["finding_id"] for f in fs), "finding_count": len(fs), "top_severity": sev,
                   "actions": " | ".join(sorted({RULES[f["rule_id"]][4][:70] for f in fs})),
                   "task_ids": " ".join(sorted({f["task_id"] for f in fs})),
                   "work_status": ("OPEN" if fs else ("OK" if published else "NOT_PUBLISHED")),
                   "audit_date": AUDIT_DATE, "recheck_date": RECHECK if published else None,
                   "source_url": blob(f"content/articles/{r['matrix_id']}.json") if r.get("matrix_id") and published and r["role"] in ("HUB", "SUPPORT") and not r["matrix_id"].endswith("CHECKLIST") else blob("data/seo/master-matrix.json")})

out = {"audit_date": AUDIT_DATE, "commit": SHA, "findings": findings, "tasks": order, "locales": locale_rows, "master": master,
       "summary": {"findings": len(findings), "by_severity": dict(collections.Counter(f["severity"] for f in findings)),
                   "by_evidence": dict(collections.Counter(f["evidence_status"] for f in findings)), "tasks": len(order),
                   "by_rule": dict(collections.Counter(f["rule_id"] for f in findings))}}
json.dump(out, open(os.path.join(DATA, "analysis.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), default=list)
for name, rows in (("findings.csv", findings), ("tasks.csv", order), ("locale-matrix.csv", locale_rows), ("audit-master-matrix.csv", master)):
    keys = list(dict.fromkeys(k for row in rows for k in row))
    with open(os.path.join(DATA, name), "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=keys)
        w.writeheader()
        for row in rows:
            w.writerow({k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v) for k, v in row.items()})
print(json.dumps(out["summary"], indent=1))
