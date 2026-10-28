# Global SEO A–Z — execution ledger and dashboard

Status: **IN_PROGRESS (fixes awaiting production verification)** · generated 2026-10-28 · baseline audit 2026-10-27 (PR #119) · re-audit 2026-10-28 at the merged state of every batch below.

Outcome per finding is computed by `docs/seo-audit/tools/ledger.py` from the baseline findings, the re-audit, `execution/batches.json` and `execution/outcomes.json`. Full rows: [`execution/execution-ledger.csv`](execution/execution-ledger.csv) (933 findings) and [`execution/task-ledger.csv`](execution/task-ledger.csv) (95 tasks). Workbook: [`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx) (sheets EXECUTION LEDGER, OWNER ACTIONS, BEFORE vs AFTER).

## Outcomes

| Outcome | Findings |
|---|---:|
| FIXED_VERIFIED | 222 |
| FIXED_PENDING_LIVE | 13 |
| VALIDATED_NO_FIX | 686 |
| DUPLICATE | 0 |
| EXTERNAL_DEPENDENCY | 11 |
| BLOCKED | 1 |
| **Total** | **933** |

Tasks: 95 — BLOCKED 1, DONE 48, IN_PROGRESS 3, NOT_APPLICABLE 36, OWNER_DECISION 7.

## Before / after (same analyzer, measured rules)

Findings: **933 → 733** reported by the re-audit; 0 new. A finding that is still reported can be fixed (e.g. a description brought to the accepted CJK band) or validated; the outcome column decides, not the count.

| Rule | Baseline | Re-audit | Outcomes |
|---|---:|---:|---|
| S-ARTICLE-NO-IMAGE | 1 | 0 | FIXED_PENDING_LIVE 1 |
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
| S-PILLAR-HEAD-TERM | 10 | 0 | FIXED_PENDING_LIVE 10 |
| S-PQ-SENTENCE | 1 | 1 | EXTERNAL_DEPENDENCY 1 |
| S-PRICE-FRESHNESS | 1 | 1 | FIXED_VERIFIED 1 |
| S-PSI-MOBILE | 1 | 0 | FIXED_VERIFIED 1 |
| S-PT-VARIANT | 1 | 0 | FIXED_VERIFIED 1 |
| S-RAIL-ANCHOR | 10 | 0 | FIXED_VERIFIED 10 |
| S-REDIRECT-HEADERS | 1 | 0 | VALIDATED_NO_FIX 1 |
| S-SITEMAP-LASTMOD | 1 | 0 | FIXED_VERIFIED 1 |
| U-ANCHOR-DIVERSITY | 197 | 197 | VALIDATED_NO_FIX 197 |
| U-DESC-LONG | 241 | 194 | VALIDATED_NO_FIX 169, FIXED_VERIFIED 72 |
| U-DESC-SHORT | 8 | 0 | FIXED_VERIFIED 6, FIXED_PENDING_LIVE 2 |
| U-GRAPH-REVIEW | 13 | 0 | FIXED_VERIFIED 13 |
| U-GRAPH-UPGRADE | 9 | 1 | FIXED_VERIFIED 8, VALIDATED_NO_FIX 1 |
| U-NO-OFFICIAL-SOURCE | 66 | 63 | VALIDATED_NO_FIX 66 |
| U-PQ-WEAK | 123 | 103 | VALIDATED_NO_FIX 100, FIXED_VERIFIED 23 |
| U-PRICE-REVIEW | 95 | 95 | VALIDATED_NO_FIX 86, FIXED_VERIFIED 9 |
| U-TITLE-LONG | 55 | 0 | FIXED_VERIFIED 55 |
| U-TITLE-SIMILAR | 33 | 33 | VALIDATED_NO_FIX 33 |

## Progress by language

| Locale | Baseline findings | Fixed (verified) | Fixed (pending live) | Validated | External | Blocked | Re-audit remaining |
|---|---:|---:|---:|---:|---:|---:|---:|
| vi | 45 | 6 | 1 | 37 | 1 | 0 | 40 |
| en | 77 | 11 | 3 | 62 | 1 | 0 | 64 |
| de | 194 | 23 | 1 | 168 | 2 | 0 | 172 |
| fr | 44 | 7 | 1 | 35 | 1 | 0 | 36 |
| es | 48 | 9 | 1 | 38 | 0 | 0 | 36 |
| nl | 53 | 8 | 1 | 44 | 0 | 0 | 46 |
| zh | 114 | 16 | 1 | 97 | 0 | 0 | 101 |
| pt | 42 | 7 | 1 | 34 | 0 | 0 | 34 |
| ko | 152 | 69 | 1 | 81 | 1 | 0 | 91 |
| ja | 151 | 61 | 1 | 88 | 1 | 0 | 105 |

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
| E1 | Re-audit gaps: checklist Article image, Japanese FAQ questions | — | pending | pending | pending |
| E2 | Privacy and terms meta descriptions | — | pending | pending | pending |
| E3 | Re-audit regression fixes: 3 query-aligned titles, KO Pillar description | — | pending | pending | pending |
| G | Commercial head terms per locale; Pillar H1/description alignment (owner directive 2026-10-28) | — | pending | pending | pending |

## OWNER_ACTION_REQUIRED

1. Connect Google Search Console for https://global.rentbikehanoi.com/ (a google-site-verification meta tag is already on /), submit /sitemap.xml and share access with the SEO tooling (OpenSEO). _(rules: S-CWV-FIELD, S-GSC-NOT-CONNECTED)_
2. Decide on analytics (GA4 or a privacy-light alternative); if yes, provide the measurement ID and approve the privacy-policy update. _(rules: S-GA4-NOT-CONNECTED)_
3. Approve an off-page plan (citations from travel communities, partner links, digital PR); re-measure visibility in 4–8 weeks. _(rules: S-LOW-VISIBILITY)_
4. Provide keyword-tool credits (nl, pt, zh and the remaining markets) or GSC data so long-tail queries can be validated. _(rules: S-KW-NO-DEMAND, S-PQ-SENTENCE)_
5. Optional: name a human editor/reviewer if one will actually review guides; only then can bylines be added. _(rules: S-AUTHOR-ORG-ONLY)_
6. Run Writer sessions (W1–W3) for es/nl/pt/ko/ja/zh/vi to bring them toward the DE count. _(rules: S-LOCALE-IMBALANCE)_
7. Resolve C1 (hours 08:00–21:30 vs 09:00–21:00), C2 (delivery threshold) and C3 (GBP name) in data/business/reference.json via a reviewed PR with dated evidence. _(rules: S-BUSINESS-CONFLICTS)_

## Verification limits

- The audit container cannot reach global.rentbikehanoi.com (egress 403); production is verified by the repository's read-only GitHub Actions (live-markup-qa: every PUBLISHED URL byte-identical to the build; post-publish-qa: status, canonical, sitemap, fingerprints, NAP guard, host probes).
- No Google Search Console, GA4 or CrUX data is connected: indexation, impressions, rankings and field Core Web Vitals are NOT_CONNECTED. PageSpeed figures are lab data (Ubersuggest/Lighthouse).
- Keyword volumes exist only for the markets the tools returned (vi, en, fr, ko, ja full; de, es head terms); nl, pt and zh demand is NOT_CHECKED.
- Third-party prices were verified on 2026-10-28; shops change them. source-recheck.yml re-runs the check; fact-guard keeps a standing WARN.
- Authority/backlink figures are a third-party index estimate (Ubersuggest), not Google data; visibility changes need weeks after indexing.
