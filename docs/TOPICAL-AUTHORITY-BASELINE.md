# Topical Authority — baseline audit snapshot (2026-10-14)

Taken before any change on branch `claude/topical-authority-seo-expansion-wi7nh1`. Facts below were observed in this session; anything not observed is marked as such.

## Repository and deployment

| Item | Observed |
|---|---|
| main HEAD | `84257e0ed9a6c5c19d1d3f93e1e75be03a9b79fc` (Turbo 10 Writer pool) |
| CI on main HEAD | Static SEO QA run 38549719360 — success; pages build and deployment run 38549719403 — success |
| CNAME | `global.rentbikehanoi.com` (unchanged) |
| Local QA at baseline | `build --check` (53 files), `validate-plan`, `content-graph --check`, `nav-qa`, `writer-refill status`, `writer-pool status` — all pass |
| Open PRs | #17 W1 drafts VI-H01/VI-H04 + protected drafts (draft); #12 five WebP gateway images; #10 rebased desktop mega-menu fix; #6 publish EN/DE vehicle-choice Hubs (25 → 27, unmerged); #5 editorial review EN/DE Hubs (draft) |
| Writer ledger | revision 1; W1 `w1-vibe-20261014` holds CLAIMED ES-H01 + KO-H01; 0 SUBMITTED |
| Protected drafts | 14 (PR #17) + 2 editorial holds (EN-H01, DE-H01) |

## Production (live) check

Direct egress from this container is blocked (proxy 403), so production was fetched through Firecrawl:

- `https://global.rentbikehanoi.com/sitemap.xml` → HTTP 200, a sitemap index with `sitemap-main.xml` + 10 locale shards, identical to the repository.
- `https://global.rentbikehanoi.com/en/` → HTTP 200; `lang="en"`, self canonical, 10 hreflang + `x-default`, WebPage JSON-LD, 4 Hub menus with 8 disabled "Coming soon" labels — identical to the repository build.
- **Not verified in this session:** HTTP status of the other 23 live URLs, rendered desktop/mobile screenshots, Core Web Vitals, Search Console coverage, rankings, search volume, backlinks or AI citations. Use the manual `post-publish-qa.yml` workflow and real Search Console data for those.

## Inventory by state

25 PUBLISHED URLs = 1 language selector + 10 locale Entity Hubs + 10 checklists + 4 utilities (About, Contact, Privacy, Terms). `/search/` is a real `noindex,follow` utility outside the sitemap. Matrix: 145 rows (25 PUBLISHED + 120 IDEA = 40 Hub + 80 Supporting).

| Locale | PUBLISHED | REVIEW | WRITING | SUBMITTED | PLANNED | PROPOSED (new) | ARCH_BLOCKED (new) |
|---|---|---|---|---|---|---|---|
| vi | 2 | 2 | 0 | 0 | 10 | 19 | 2 |
| en | 2 | 2 | 0 | 0 | 10 | 19 | 2 |
| de | 2 | 2 | 0 | 0 | 10 | 17 | 2 |
| fr | 2 | 2 | 0 | 0 | 10 | 18 | 2 |
| es | 2 | 1 | 1 | 0 | 10 | 17 | 2 |
| nl | 2 | 1 | 0 | 0 | 11 | 17 | 2 |
| zh | 2 | 2 | 0 | 0 | 10 | 18 | 2 |
| pt | 2 | 1 | 0 | 0 | 11 | 17 | 2 |
| ko | 2 | 1 | 1 | 0 | 10 | 17 | 2 |
| ja | 2 | 2 | 0 | 0 | 10 | 17 | 2 |
| **Total** | **20** | **16** | **2** | **0** | **102** | **176** | **20** |

PUBLISHED here counts Entity Hub + checklist per locale (root and utilities are site-wide). PROPOSED/ARCH_BLOCKED are topical-map capacity added by this branch, **not** pages or Matrix rows.

## Gaps found

| Priority | Finding | Action in this branch | Remaining |
|---|---|---|---|
| P0 | No regression guard on live URLs beyond a hard-coded count of 25 | `data/seo/url-freeze.json` + `scripts/seo/seo-guard.mjs` + CI | — |
| P0 | `.gitignore` held a literal `\n`, so `reports/` and `private-drafts/` were **not** ignored (engine reports and private Markdown drafts could be committed) | Fixed to two real lines; nothing had been committed there | — |
| P1 | Topical depth per locale is 2 live pages; 0 of 40 Hubs published | 196-candidate native backlog + gated promotion path | Publish Hubs via reviewed PRs (#6 first); Supporting publication needs a PUBLISHED Hub |
| P1 | 7 of the 15 open clusters (16 minus the checklist-reserved one) had no planned coverage in any locale (models, trip-fit, extra costs, insurance, papers, gear, city riding) | Every locale now has 0 uncovered clusters in the map | Real SERP validation before promotion |
| P1 | Navigation build threw if a Hub ever had ≠ 2 Supporting rows, blocking any Matrix growth | `menuChildren()` keeps 2 featured labels (PUBLISHED first); byte-identical output today | — |
| P1 | Writer tests hard-coded 104/120 IDEA rows, so any Matrix growth broke CI | Counts derived from the Matrix with a 120-row floor | — |
| P2 | Pillar JSON-LD is WebPage only (no BreadcrumbList, no `about`) | Documented in `architecture.json` schema rules | Separate reviewed generator change; guard will require a deliberate re-freeze |
| P2 | Pillars declare `x-default` → `/`, but `/` carries no hreflang cluster | Not changed (live pages untouched) | Consider adding the 10-locale cluster + `x-default` on `/` in a reviewed change |
| P2 | Keyword hypotheses have no demand data | Kept `NOT_VALIDATED` | Validate per market with real data (OpenSEO 500 credits and Ubersuggest 3 reports/day are connected but were not spent) |

## Verified research inputs

22 references in `data/seo/topical-authority/references.json`, each returned HTTP 200 on 2026-10-14: native travel advice for all 10 locales (zh via the Beijing FAO republication of the embassy reminder), WHO road-traffic fact sheet, UN Treaty Collection 1968 Convention status, Law 36/2024/QH15, Directive 20/CT-TTg, the Ring Road 1 low-emission-zone announcement, Decrees 67/2023 and 220/2026, NCHMF, Honda Vietnam's range and Petrolimex. Notable for editors:

- The Ring Road 1 measure is a **phased low-emission zone**: pilot from 2026-07-01 in parts of Hoàn Kiếm ward, full Ring Road 1 in 2028–2029 — not a blanket ban from July 2026. Titles were framed accordingly.
- Decree 67/2023 is amended by Decree 220/2026 (listed effective 2026-07-01).
- Japanese MOFA and the Embassy of Japan state that Japanese-issued international permits are not valid in Vietnam.
