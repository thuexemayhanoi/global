# Global SEO A–Z — execution ledger and dashboard

Status: **IN_PROGRESS (fixes awaiting production verification)** · generated 2026-10-28 · baseline audit 2026-10-27 (PR #119) · re-audit 2026-10-28 at the merged state of every batch below.

Outcome per finding is computed by `docs/seo-audit/tools/ledger.py` from the baseline findings, the re-audit, `execution/batches.json` and `execution/outcomes.json`. Full rows: [`execution/execution-ledger.csv`](execution/execution-ledger.csv) (933 findings) and [`execution/task-ledger.csv`](execution/task-ledger.csv) (95 tasks). Workbook: [`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx) (sheets EXECUTION LEDGER, OWNER ACTIONS, BEFORE vs AFTER).

## Outcomes

| Outcome | Findings |
|---|---:|
| FIXED_VERIFIED | 240 |
| FIXED_PENDING_LIVE | 1 |
| VALIDATED_NO_FIX | 680 |
| DUPLICATE | 0 |
| EXTERNAL_DEPENDENCY | 11 |
| BLOCKED | 1 |
| **Total** | **933** |

Tasks: 95 — BLOCKED 1, DONE 51, IN_PROGRESS 1, NOT_APPLICABLE 35, OWNER_DECISION 7.

## Before / after (same analyzer, measured rules)

Findings: **933 → 727** reported by the re-audit; 0 new. A finding that is still reported can be fixed (e.g. a description brought to the accepted CJK band) or validated; the outcome column decides, not the count.

| Rule | Baseline | Re-audit | Outcomes |
|---|---:|---:|---|
| S-ARTICLE-NO-IMAGE | 1 | 0 | FIXED_VERIFIED 1 |
| S-AUTHOR-ORG-ONLY | 1 | 1 | VALIDATED_NO_FIX 1 |
| S-BUSINESS-CONFLICTS | 1 | 1 | BLOCKED 1 |
| S-CHECKLIST-NO-REFS | 10 | 0 | FIXED_VERIFIED 10 |
| S-CWV-FIELD | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-DE-TOPIC-DRIFT | 32 | 32 | VALIDATED_NO_FIX 32 |
| S-FAQ-SCHEMA | 1 | 0 | FIXED_VERIFIED 1 |
| S-GA4-NOT-CONNECTED | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-GSC-NOT-CONNECTED | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-INTENT-LABEL | 10 | 0 | FIXED_VERIFIED 10 |
| S-KW-NO-DEMAND | 5 | 5 | EXTERNAL_DEPENDENCY 5 |
| S-LOCALE-IMBALANCE | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-LOW-VISIBILITY | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-OG-IMAGE-SINGLE | 1 | 0 | FIXED_VERIFIED 1 |
| S-PILLAR-HEAD-TERM | 10 | 0 | FIXED_VERIFIED 10 |
| S-PQ-SENTENCE | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-PRICE-FRESHNESS | 1 | 1 | FIXED_VERIFIED 1 |
| S-PSI-MOBILE | 1 | 0 | FIXED_VERIFIED 1 |
| S-PT-VARIANT | 1 | 0 | FIXED_VERIFIED 1 |
| S-RAIL-ANCHOR | 10 | 0 | FIXED_VERIFIED 10 |
| S-REDIRECT-HEADERS | 1 | 0 | VALIDATED_NO_FIX 1 |
| S-SITEMAP-LASTMOD | 1 | 0 | FIXED_VERIFIED 1 |
| U-ANCHOR-DIVERSITY | 197 | 197 | VALIDATED_NO_FIX 197 |
| U-DESC-LONG | 241 | 194 | VALIDATED_NO_FIX 169, FIXED_VERIFIED 72 |
| U-DESC-SHORT | 8 | 0 | FIXED_VERIFIED 8 |
| U-GRAPH-REVIEW | 13 | 0 | FIXED_VERIFIED 13 |
| U-GRAPH-UPGRADE | 9 | 0 | FIXED_VERIFIED 8, FIXED_PENDING_LIVE 1 |
| U-NO-OFFICIAL-SOURCE | 66 | 63 | VALIDATED_NO_FIX 66 |
| U-PQ-WEAK | 123 | 99 | VALIDATED_NO_FIX 95, FIXED_VERIFIED 28 |
| U-PRICE-REVIEW | 95 | 95 | VALIDATED_NO_FIX 86, FIXED_VERIFIED 9 |
| U-TITLE-LONG | 55 | 0 | FIXED_VERIFIED 55 |
| U-TITLE-SIMILAR | 33 | 33 | VALIDATED_NO_FIX 33 |

## Progress by language

| Locale | Baseline findings | Fixed (verified) | Fixed (pending live) | Validated | External | Blocked | Re-audit remaining |
|---|---:|---:|---:|---:|---:|---:|---:|
| vi | 45 | 7 | 0 | 37 | 1 | 0 | 40 |
| en | 77 | 15 | 0 | 61 | 1 | 0 | 63 |
| de | 194 | 26 | 0 | 166 | 2 | 0 | 170 |
| fr | 44 | 8 | 0 | 35 | 1 | 0 | 36 |
| es | 48 | 10 | 0 | 38 | 0 | 0 | 36 |
| nl | 53 | 10 | 0 | 43 | 0 | 0 | 45 |
| zh | 114 | 17 | 0 | 97 | 0 | 0 | 101 |
| pt | 42 | 8 | 0 | 34 | 0 | 0 | 34 |
| ko | 152 | 70 | 1 | 80 | 1 | 0 | 90 |
| ja | 151 | 63 | 0 | 87 | 1 | 0 | 105 |

Site-wide findings (locale ALL/global) are counted in the totals above, not per language.

## Batches, PRs, deployments and production checks

| Batch | Scope | PR | Merge | Pages deploy | Live QA |
|---|---|---|---|---|---|
| AUDIT | Global SEO A–Z audit, Master Matrix and workbook (read-only) | [#119](https://github.com/thuexemayhanoi/global/pull/119) | d369bf2 | [40610424609](https://github.com/thuexemayhanoi/global/actions/runs/40610424609) | n/a (read-only audit) |
| A | Owner directive, independent SEO positioning, Pillar intent labels | [#120](https://github.com/thuexemayhanoi/global/pull/120) | 268b334 | [40611155294](https://github.com/thuexemayhanoi/global/actions/runs/40611155294) | [40635345660](https://github.com/thuexemayhanoi/global/actions/runs/40635345660) [40635348101](https://github.com/thuexemayhanoi/global/actions/runs/40635348101) |
| B | Technical SEO: CLS fix, FAQPage, sitemap lastmod, topic images, checklist sources, host probes | [#121](https://github.com/thuexemayhanoi/global/pull/121) | d9e1d36 | [40634810514](https://github.com/thuexemayhanoi/global/actions/runs/40634810514) | [40635345660](https://github.com/thuexemayhanoi/global/actions/runs/40635345660) [40635348101](https://github.com/thuexemayhanoi/global/actions/runs/40635348101) |
| C | Reviewed metadata: 55 titles, 78 descriptions | [#122](https://github.com/thuexemayhanoi/global/pull/122) | 84e44e6 | [40635997465](https://github.com/thuexemayhanoi/global/actions/runs/40635997465) | [40636257766](https://github.com/thuexemayhanoi/global/actions/runs/40636257766) [40636260494](https://github.com/thuexemayhanoi/global/actions/runs/40636260494) |
| D1 | Checklist depth, overlap reasons, editorial transparency, source re-check tool | [#123](https://github.com/thuexemayhanoi/global/pull/123) | e971ad2 | [40637416062](https://github.com/thuexemayhanoi/global/actions/runs/40637416062) | [40638975548](https://github.com/thuexemayhanoi/global/actions/runs/40638975548) [40638978172](https://github.com/thuexemayhanoi/global/actions/runs/40638978172) |
| D2 | 21 query-aligned titles, one Portuguese variant on PT pages | [#124](https://github.com/thuexemayhanoi/global/pull/124) | c43d661 | [40638328327](https://github.com/thuexemayhanoi/global/actions/runs/40638328327) | [40638975548](https://github.com/thuexemayhanoi/global/actions/runs/40638975548) [40638978172](https://github.com/thuexemayhanoi/global/actions/runs/40638978172) |
| D3 | Sourced-price re-check: 9 articles corrected, 86 verified | [#125](https://github.com/thuexemayhanoi/global/pull/125) | a34800a | [40639567249](https://github.com/thuexemayhanoi/global/actions/runs/40639567249) | [40640026971](https://github.com/thuexemayhanoi/global/actions/runs/40640026971) [40640030263](https://github.com/thuexemayhanoi/global/actions/runs/40640030263) |
| D4 | Responsive topic photos (480w/720w srcset) | [#126](https://github.com/thuexemayhanoi/global/pull/126) | eac8fe2 | [40639921194](https://github.com/thuexemayhanoi/global/actions/runs/40639921194) | [40640026971](https://github.com/thuexemayhanoi/global/actions/runs/40640026971) [40640030263](https://github.com/thuexemayhanoi/global/actions/runs/40640030263) |
| E1 | Re-audit gaps: checklist Article image, Japanese FAQ questions | [#127](https://github.com/thuexemayhanoi/global/pull/127) | 752edfc | [40685336542](https://github.com/thuexemayhanoi/global/actions/runs/40685336542) | [40685529787](https://github.com/thuexemayhanoi/global/actions/runs/40685529787) [40685533504](https://github.com/thuexemayhanoi/global/actions/runs/40685533504) |
| E2 | Privacy and terms meta descriptions | [#127](https://github.com/thuexemayhanoi/global/pull/127) | 752edfc | [40685336542](https://github.com/thuexemayhanoi/global/actions/runs/40685336542) | [40685529787](https://github.com/thuexemayhanoi/global/actions/runs/40685529787) [40685533504](https://github.com/thuexemayhanoi/global/actions/runs/40685533504) |
| E3 | Re-audit regression fixes: 3 query-aligned titles, KO Pillar description | [#127](https://github.com/thuexemayhanoi/global/pull/127) | 752edfc | [40685336542](https://github.com/thuexemayhanoi/global/actions/runs/40685336542) | [40685529787](https://github.com/thuexemayhanoi/global/actions/runs/40685529787) [40685533504](https://github.com/thuexemayhanoi/global/actions/runs/40685533504) |
| G | Commercial head terms per locale (data/seo/commercial-head-terms.json); Pillar H1/description alignment (owner directive 2026-10-28) | [#127](https://github.com/thuexemayhanoi/global/pull/127) | 752edfc | [40685336542](https://github.com/thuexemayhanoi/global/actions/runs/40685336542) | [40685529787](https://github.com/thuexemayhanoi/global/actions/runs/40685529787) [40685533504](https://github.com/thuexemayhanoi/global/actions/runs/40685533504) |
| H | Production verification of E/F/G; competitor gaps and legitimate off-page plan; final ledger and Excel | [#129](https://github.com/thuexemayhanoi/global/pull/129) | ae9affc | [40686813932](https://github.com/thuexemayhanoi/global/actions/runs/40686813932) | pending |
| I | Pillar commercial-investigation depth in 10 locales: 7-step rental process (ordered list), provider-selection criteria, FAQ 3→5 (FAQPage mirrors it) | [#130](https://github.com/thuexemayhanoi/global/pull/130) | 6b9630a | [40688074681](https://github.com/thuexemayhanoi/global/actions/runs/40688074681) | [40688268258](https://github.com/thuexemayhanoi/global/actions/runs/40688268258) [40688272992](https://github.com/thuexemayhanoi/global/actions/runs/40688272992) |
| J | DE research refill (READY 87 < 100): 20 commercial-investigation topics with verified sources (batches 0001-0002) | — | e363a8a | pending | pending |
| L | Commercial-investigation research in vi, en, fr, es, nl, zh, pt, ko, ja: 90 topics (batches 0003-0011; one-way, hotel/airport delivery, rent vs buy, Easy Rider vs self-ride, platform vs shop, what the price includes, monthly maintenance, late return, damage disputes, test ride) — research data only; under the owner's SEO-only directive (2026-10-28) it is not promoted for publication | — | d8d1262 | pending | pending |
| N | Real dates for locale Pillars and checklists: sitemap <lastmod> and JSON-LD datePublished/dateModified from data/seo/page-updates.json (launch commit ece23a28, PRs #82/#123/#127/#130) | [#133](https://github.com/thuexemayhanoi/global/pull/133) | 5312eaa | [40707292176](https://github.com/thuexemayhanoi/global/actions/runs/40707292176) | [40707742441](https://github.com/thuexemayhanoi/global/actions/runs/40707742441) [40707747550](https://github.com/thuexemayhanoi/global/actions/runs/40707747550) |
| O | Accessibility: language-menu accessible name starts with the visible language name (WCAG 2.5.3 Label in Name) on all pages; owner backlog rewritten as OWNER_ACTIONS_LAST (SEO-only directive) | [#135](https://github.com/thuexemayhanoi/global/pull/135) | 13d77ce | [40708511676](https://github.com/thuexemayhanoi/global/actions/runs/40708511676) | [40709295964](https://github.com/thuexemayhanoi/global/actions/runs/40709295964) [40709301983](https://github.com/thuexemayhanoi/global/actions/runs/40709301983) |
| P | Price Hubs (rental-costs) in vi, de, nl, fr, es: titles lead with the commercial head term + price modifier from the Matrix primary query and dated autocomplete evidence; H1 and descriptions unchanged; separates VI-H02 from VI-S17 and ES-H02 from ES-S03 (reviewed set metadata-reviews-p.json) | [#136](https://github.com/thuexemayhanoi/global/pull/136) | 4e32f01 | [40711358484](https://github.com/thuexemayhanoi/global/actions/runs/40711358484) | [40711950559](https://github.com/thuexemayhanoi/global/actions/runs/40711950559) [40711957461](https://github.com/thuexemayhanoi/global/actions/runs/40711957461) |
| Q | Hubs with a genuinely weak primary-query match (U-PQ-WEAK): EN-H01 'Types of Motorbikes to Rent in Hanoi: How to Choose', DE-H04 'Roller fahren in Hanoi: Sicherheit, Regeln, Panne und Unfall', JA-H04 'ハノイのレンタルバイク安全ガイド：故障・盗難・事故への対応'; dated autocomplete evidence; H1 and descriptions unchanged (reviewed set metadata-reviews-q.json) | [#137](https://github.com/thuexemayhanoi/global/pull/137) | 97e47bd | [40713682673](https://github.com/thuexemayhanoi/global/actions/runs/40713682673) | [40713965958](https://github.com/thuexemayhanoi/global/actions/runs/40713965958) [40713971801](https://github.com/thuexemayhanoi/global/actions/runs/40713971801) |
| R | Site-wide menu: each published Hub is linked by its Matrix title instead of the generic 'current guide' text that all four Hub links shared on every page (10 locales, header of every page); arrow hidden from assistive technology | [#138](https://github.com/thuexemayhanoi/global/pull/138) | 0e8a10f | [40743344189](https://github.com/thuexemayhanoi/global/actions/runs/40743344189) | [40743991798](https://github.com/thuexemayhanoi/global/actions/runs/40743991798) [40743997226](https://github.com/thuexemayhanoi/global/actions/runs/40743997226) |
| S | AEO: visible FAQ (3 Q&A) on all 40 Hubs in 10 languages, built only from facts and source links already in each Hub body; FAQPage mirrors it (selective re-freeze --schema-add=FAQPage); Hub dateModified and sitemap <lastmod> from reviewed page-updates entries | [#139](https://github.com/thuexemayhanoi/global/pull/139) | 42ada9c | [40745992045](https://github.com/thuexemayhanoi/global/actions/runs/40745992045) | [40746175387](https://github.com/thuexemayhanoi/global/actions/runs/40746175387) [40746180879](https://github.com/thuexemayhanoi/global/actions/runs/40746180879) |
| T | AEO on commercial Supporting pages: visible FAQ (3 Q&A) on the 57 price/deposit (rental-costs) articles that had none, in 10 languages, built only from facts and source links already in each body; FAQPage mirrors it (selective re-freeze --schema-add=FAQPage); dateModified and <lastmod> from page-updates entries | [#140](https://github.com/thuexemayhanoi/global/pull/140) | 8948542 | [40749170321](https://github.com/thuexemayhanoi/global/actions/runs/40749170321) | [40749400238](https://github.com/thuexemayhanoi/global/actions/runs/40749400238) [40749405263](https://github.com/thuexemayhanoi/global/actions/runs/40749405263) |
| U | AEO on commercial Supporting pages: visible FAQ (3 Q&A) on the 114 documents/licence/contract (documents-contracts) articles that had none, in 10 languages, built only from facts and source links already in each body; FAQPage mirrors it (selective re-freeze --schema-add=FAQPage); dateModified and <lastmod> from page-updates entries | [#141](https://github.com/thuexemayhanoi/global/pull/141) | d7ab895 | [40754186898](https://github.com/thuexemayhanoi/global/actions/runs/40754186898) | [40754426766](https://github.com/thuexemayhanoi/global/actions/runs/40754426766) [40754431691](https://github.com/thuexemayhanoi/global/actions/runs/40754431691) |
| V | Fact accuracy (E-E-A-T): 13 licence pages in 9 languages still presented Circular 12/2025/TT-BCA as current; they now state that Circular 108/2026/TT-BCA replaced it on 1 July 2026 and give its Art. 24 conversion condition (visa or temporary residence card valid at least 90 days, or permanent residence card), online filing and the 1-day e-licence / 2.5-working-day card timing, citing the 108/2026 text already used on sibling pages | [#142](https://github.com/thuexemayhanoi/global/pull/142) | c25056c | [40755880224](https://github.com/thuexemayhanoi/global/actions/runs/40755880224) | [40756053008](https://github.com/thuexemayhanoi/global/actions/runs/40756053008) [40756056808](https://github.com/thuexemayhanoi/global/actions/runs/40756056808) |
| W | AEO on commercial Supporting pages: visible FAQ (3 Q&A) on the 114 vehicle-choice articles without a usable FAQ, in 10 languages, from facts and source links already in each body; one-question sections keep their frozen heading and gain the pairs (faqEntries now reads the singular heading); FAQPage mirrors it; dateModified and <lastmod> from page-updates | [#143](https://github.com/thuexemayhanoi/global/pull/143) | 65b3451 | [40759650652](https://github.com/thuexemayhanoi/global/actions/runs/40759650652) | [40759827565](https://github.com/thuexemayhanoi/global/actions/runs/40759827565) [40759832625](https://github.com/thuexemayhanoi/global/actions/runs/40759832625) |
| X1 | AEO on safety-and-support Supporting pages, wave 1: visible FAQ (3 Q&A) on the 227 articles in vi, en, fr, es, nl, zh, pt, ko, ja without a usable FAQ, from facts and source links already in each body; one-question sections (incl. 'A common question', 'Een veelgestelde vraag', 'Uma pergunta frequente') keep their frozen heading and gain the pairs; KO-S66's three plain-paragraph questions marked up as Q&A; FAQPage mirrors it; dateModified and <lastmod> from page-updates | [#144](https://github.com/thuexemayhanoi/global/pull/144) | 6689561 | [40764929424](https://github.com/thuexemayhanoi/global/actions/runs/40764929424) | [40765101023](https://github.com/thuexemayhanoi/global/actions/runs/40765101023) [40765105354](https://github.com/thuexemayhanoi/global/actions/runs/40765105354) |
| X2 | AEO on safety-and-support Supporting pages, wave 2: visible FAQ (3 Q&A) on the 101 German articles without a usable FAQ, from facts and source links already in each body; one-question 'Häufige Frage' sections keep their frozen heading and gain the pairs; questions de-duplicated across neighbouring German articles (DE-S40/S199, DE-S37/S216); DE-S07 drafting leftovers and typos removed; FAQPage mirrors it; dateModified and <lastmod> from page-updates | [#145](https://github.com/thuexemayhanoi/global/pull/145) | c3245c5 | [40768840043](https://github.com/thuexemayhanoi/global/actions/runs/40768840043) | [40769008474](https://github.com/thuexemayhanoi/global/actions/runs/40769008474) [40769013581](https://github.com/thuexemayhanoi/global/actions/runs/40769013581) |
| Y | AEO on the commercial rental-checklist page in 10 languages: visible FAQ (3 Q&A on pickup inspection, deposit records and breakdown/accident steps) built only from each checklist's own sections, rendered as H2 + H3 questions before the references, mirrored by FAQPage; dateModified and <lastmod> from page-updates | — | pending | pending | pending |

## Verification limits

- The audit container cannot reach global.rentbikehanoi.com (egress 403); production is verified by the repository's read-only GitHub Actions (live-markup-qa: every PUBLISHED URL byte-identical to the build; post-publish-qa: status, canonical, sitemap, fingerprints, NAP guard, host probes).
- No Google Search Console, GA4 or CrUX data is connected: indexation, impressions, rankings and field Core Web Vitals are NOT_CONNECTED. PageSpeed figures are lab data (Ubersuggest/Lighthouse).
- Keyword volumes exist only for the markets the tools returned (vi, en, fr, ko, ja full; de, es head terms); nl, pt and zh demand is NOT_CHECKED.
- Third-party prices were verified on 2026-10-28; shops change them. source-recheck.yml re-runs the check; fact-guard keeps a standing WARN.
- Authority/backlink figures are a third-party index estimate (Ubersuggest), not Google data; visibility changes need weeks after indexing.

## OWNER_ACTIONS_LAST

Source: [OWNER-ACTIONS.md](OWNER-ACTIONS.md). These never block SEO work on published pages; none is marked done until it is.

1. Google Search Console data for global.rentbikehanoi.com — Rankings, impressions, indexing and field Core Web Vitals are unmeasured; Top 1–3 stays a target, not a verified result
2. Analytics (GA4 or none) — No traffic or conversion data
3. Off-page links from real accounts (plan: `COMPETITOR-GAP-AND-OFFPAGE-PLAN.md`) — Authority stays at DA 2 / 32 referring domains (Ubersuggest, 2026-10-28)
4. Keyword volumes for es, zh, pt and exact ko/ja variants; rank tracking — Head terms for those markets rest on autocomplete and SERP evidence, not volumes
5. Business data conflicts C1–C3 (hours, delivery threshold, GBP name) in `data/business/reference.json` — Business schema and NAP stay unpublished (protected)
6. Named human editor (optional) — Bylines stay organisational
7. New-Hub architecture (`HUB-ARCHITECTURE-PROPOSAL-20261028.md`) and PR #118 — Deferred: SEO-only mode creates no new Hubs or URLs

Ledger rules that wait on these items: Search Console data for global.rentbikehanoi.com (backlog item 1, OWNER-ACTIONS.md). (S-CWV-FIELD, S-GSC-NOT-CONNECTED); Analytics decision (backlog item 2, OWNER-ACTIONS.md). (S-GA4-NOT-CONNECTED); Off-page links from real accounts per COMPETITOR-GAP-AND-OFFPAGE-PLAN.md; rank tracking (backlog items 3-4, OWNER-ACTIONS.md). (S-LOW-VISIBILITY); Keyword volumes for es, zh, pt, nl and exact ko/ja variants (backlog item 4, OWNER-ACTIONS.md). (S-KW-NO-DEMAND, S-PQ-SENTENCE); Optional named human editor (backlog item 6, OWNER-ACTIONS.md). (S-AUTHOR-ORG-ONLY); Deferred by the owner's SEO-only directive of 2026-10-28: no new articles, so the locale imbalance stays until article production resumes. (S-LOCALE-IMBALANCE); Business data conflicts C1-C3 in data/business/reference.json (backlog item 5, OWNER-ACTIONS.md). (S-BUSINESS-CONFLICTS)
