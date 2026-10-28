# Global SEO A–Z — execution ledger and dashboard

Status: **IN_PROGRESS (fixes awaiting production verification)** · generated 2026-10-28 · baseline audit 2026-10-27 (PR #119) · re-audit 2026-10-28 at the merged state of every batch below.

Outcome per finding is computed by `docs/seo-audit/tools/ledger.py` from the baseline findings, the re-audit, `execution/batches.json` and `execution/outcomes.json`. Full rows: [`execution/execution-ledger.csv`](execution/execution-ledger.csv) (933 findings) and [`execution/task-ledger.csv`](execution/task-ledger.csv) (95 tasks). Workbook: [`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx) (sheets EXECUTION LEDGER, OWNER ACTIONS, BEFORE vs AFTER).

## Outcomes

| Outcome | Findings |
|---|---:|
| FIXED_VERIFIED | 235 |
| FIXED_PENDING_LIVE | 2 |
| VALIDATED_NO_FIX | 684 |
| DUPLICATE | 0 |
| EXTERNAL_DEPENDENCY | 11 |
| BLOCKED | 1 |
| **Total** | **933** |

Tasks: 95 — BLOCKED 1, DONE 49, IN_PROGRESS 2, NOT_APPLICABLE 36, OWNER_DECISION 7.

## Before / after (same analyzer, measured rules)

Findings: **933 → 731** reported by the re-audit; 0 new. A finding that is still reported can be fixed (e.g. a description brought to the accepted CJK band) or validated; the outcome column decides, not the count.

| Rule | Baseline | Re-audit | Outcomes |
|---|---:|---:|---|
| S-ARTICLE-NO-IMAGE | 1 | 0 | FIXED_VERIFIED 1 |
| S-AUTHOR-ORG-ONLY | 1 | 1 | VALIDATED_NO_FIX 1 |
| S-BUSINESS-CONFLICTS | 1 | 1 | BLOCKED 1 |
| S-CHECKLIST-NO-REFS | 10 | 0 | FIXED_VERIFIED 10 |
| S-CWV-FIELD | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-DE-TOPIC-DRIFT | 32 | 32 | VALIDATED_NO_FIX 32 |
| S-FAQ-SCHEMA | 1 | 1 | FIXED_VERIFIED 1 |
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
| U-GRAPH-UPGRADE | 9 | 1 | FIXED_VERIFIED 8, VALIDATED_NO_FIX 1 |
| U-NO-OFFICIAL-SOURCE | 66 | 63 | VALIDATED_NO_FIX 66 |
| U-PQ-WEAK | 123 | 101 | VALIDATED_NO_FIX 98, FIXED_VERIFIED 23, FIXED_PENDING_LIVE 2 |
| U-PRICE-REVIEW | 95 | 95 | VALIDATED_NO_FIX 86, FIXED_VERIFIED 9 |
| U-TITLE-LONG | 55 | 0 | FIXED_VERIFIED 55 |
| U-TITLE-SIMILAR | 33 | 33 | VALIDATED_NO_FIX 33 |

## Progress by language

| Locale | Baseline findings | Fixed (verified) | Fixed (pending live) | Validated | External | Blocked | Re-audit remaining |
|---|---:|---:|---:|---:|---:|---:|---:|
| vi | 45 | 7 | 0 | 37 | 1 | 0 | 40 |
| en | 77 | 14 | 0 | 62 | 1 | 0 | 64 |
| de | 194 | 24 | 1 | 167 | 2 | 0 | 171 |
| fr | 44 | 8 | 0 | 35 | 1 | 0 | 36 |
| es | 48 | 10 | 0 | 38 | 0 | 0 | 36 |
| nl | 53 | 9 | 1 | 43 | 0 | 0 | 45 |
| zh | 114 | 17 | 0 | 97 | 0 | 0 | 101 |
| pt | 42 | 8 | 0 | 34 | 0 | 0 | 34 |
| ko | 152 | 70 | 0 | 81 | 1 | 0 | 91 |
| ja | 151 | 62 | 0 | 88 | 1 | 0 | 105 |

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
| P | Price Hubs (rental-costs) in vi, de, nl, fr, es: titles lead with the commercial head term + price modifier from the Matrix primary query and dated autocomplete evidence; H1 and descriptions unchanged; separates VI-H02 from VI-S17 and ES-H02 from ES-S03 (reviewed set metadata-reviews-p.json) | — | pending | pending | pending |

## OWNER_ACTION_REQUIRED

1. Search Console data for global.rentbikehanoi.com (backlog item 1, OWNER-ACTIONS.md). _(rules: S-CWV-FIELD, S-GSC-NOT-CONNECTED)_
2. Analytics decision (backlog item 2, OWNER-ACTIONS.md). _(rules: S-GA4-NOT-CONNECTED)_
3. Off-page links from real accounts per COMPETITOR-GAP-AND-OFFPAGE-PLAN.md; rank tracking (backlog items 3-4, OWNER-ACTIONS.md). _(rules: S-LOW-VISIBILITY)_
4. Keyword volumes for es, zh, pt, nl and exact ko/ja variants (backlog item 4, OWNER-ACTIONS.md). _(rules: S-KW-NO-DEMAND, S-PQ-SENTENCE)_
5. Optional named human editor (backlog item 6, OWNER-ACTIONS.md). _(rules: S-AUTHOR-ORG-ONLY)_
6. Deferred by the owner's SEO-only directive of 2026-10-28: no new articles, so the locale imbalance stays until article production resumes. _(rules: S-LOCALE-IMBALANCE)_
7. Business data conflicts C1-C3 in data/business/reference.json (backlog item 5, OWNER-ACTIONS.md). _(rules: S-BUSINESS-CONFLICTS)_

## Verification limits

- The audit container cannot reach global.rentbikehanoi.com (egress 403); production is verified by the repository's read-only GitHub Actions (live-markup-qa: every PUBLISHED URL byte-identical to the build; post-publish-qa: status, canonical, sitemap, fingerprints, NAP guard, host probes).
- No Google Search Console, GA4 or CrUX data is connected: indexation, impressions, rankings and field Core Web Vitals are NOT_CONNECTED. PageSpeed figures are lab data (Ubersuggest/Lighthouse).
- Keyword volumes exist only for the markets the tools returned (vi, en, fr, ko, ja full; de, es head terms); nl, pt and zh demand is NOT_CHECKED.
- Third-party prices were verified on 2026-10-28; shops change them. source-recheck.yml re-runs the check; fact-guard keeps a standing WARN.
- Authority/backlink figures are a third-party index estimate (Ubersuggest), not Google data; visibility changes need weeks after indexing.
