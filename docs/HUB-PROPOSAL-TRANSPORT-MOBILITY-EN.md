# Hub proposal: Transportation & Urban Mobility (EN first)

> **Superseded on 2026-10-25 by [`docs/HUB-ARCHITECTURE-DECISION-20261025.md`](HUB-ARCHITECTURE-DECISION-20261025.md).** The evidence there covers all 10 locales (11 `transport-mobility` candidates per locale on main `5e5594aad076`, not 10 EN-only) and all six research-open domains, and lists the owner decisions. Two points below are out of date: an EN-only Hub (option A) fails validator gates T2/T9 for the other nine locales, and domain status in `policy.json` is global, not per locale. The rest of this file is kept unchanged as history. Still not approved.

Status: **PROPOSAL FOR OWNER REVIEW, not approved.** This document changes no Matrix row, URL, sitemap, navigation, hreflang or generated HTML. It records the evidence and the decisions needed before the `transport-mobility` Hub from `data/seo/topical-authority/architecture.json` can become a live Topic Pillar. Dated 2026-10-15.

## Why this proposal exists

`docs/TOPIC-FACTORY.md` requires "a reviewed architecture PR (with at least eight unique validated Supporting candidates for each new Hub, appropriate locale Hub mapping, and passing URL/SEO/build checks)" before a research-open Hub and its Supporting topics are promoted. The `transportation-mobility` domain (`data/seo/topic-factory/policy.json`) is the first research-open domain that meets the candidate threshold in one locale:

| Locale | ARCHITECTURE_BLOCKED candidates under `transport-mobility` | Eight-candidate threshold |
|---|---|---|
| en | 10 | met |
| other 9 locales | 0 | not met |

Counts come from `data/seo/topical-authority/<locale>.json` on main at the time of writing. The threshold is a precondition, not an approval.

## Proposed architecture (Entity Hub → Topic Pillar → Cluster → Supporting)

- **Entity Hub (PILLAR, live):** `/en/` (unchanged).
- **Topic Pillar (new HUB, proposed):** working title *Getting Around Hanoi and Vietnam: Transit, Trains and Transfers*, proposed URL `/en/topics/getting-around-hanoi/`. The URL does not occur in `data/seo/master-matrix.json` or `data/seo/url-freeze.json`.
- **Clusters (sections of the Pillar, never URLs):** `mob-urban-transit`, `mob-intercity`, `mob-last-mile`, as already defined in `architecture.json`.
- **Supporting guides (the 10 validated candidates):**

| TA ID | Cluster | Proposed slug | Primary query (NOT_VALIDATED) |
|---|---|---|---|
| TA-EN-0022 | mob-urban-transit | hanoi-metro-line-2a-cat-linh-ha-dong | hanoi metro line 2a cat linh ha dong |
| TA-EN-0023 | mob-urban-transit | hanoi-metro-line-3-nhon-cau-giay | hanoi metro line 3 nhon cau giay |
| TA-EN-0024 | mob-urban-transit | how-to-take-the-bus-in-hanoi | how to take the bus in hanoi |
| TA-EN-0025 | mob-urban-transit | vinbus-electric-bus-routes-hanoi | vinbus electric bus routes hanoi |
| TA-EN-0026 | mob-last-mile | noi-bai-airport-to-old-quarter-by-bus | noi bai airport to old quarter by bus |
| TA-EN-0031 | mob-last-mile | ride-hailing-apps-in-hanoi | ride hailing apps in hanoi |
| TA-EN-0027 | mob-intercity | hanoi-long-distance-bus-stations | hanoi long distance bus stations |
| TA-EN-0028 | mob-intercity | hanoi-to-sapa-by-train-via-lao-cai | hanoi to sapa by train |
| TA-EN-0029 | mob-intercity | hanoi-to-ninh-binh-by-train | hanoi to ninh binh by train |
| TA-EN-0030 | mob-intercity | hanoi-to-ha-long-by-bus | hanoi to ha long by bus |

Keyword evidence for every row stays `NOT_VALIDATED`: no search volume, ranking or traffic is claimed.

### Duplicate and cannibalisation check

None of the 55 EN Matrix rows on main targets buses, metro, trains, airport transfers, stations or ride-hailing. The closest live intent, EN-S12 (riding a motorbike in Hanoi traffic), is about riding, not public transport. The ten candidates passed the research gates L1–L5 and T1–T10 at intake. A fresh `node scripts/seo/validate-plan.mjs` run is required in the implementation PR after the rows exist.

### Scope boundary

The Hub is informational travel and mobility content. It must not become a rental storefront, must not compete with transactional rental queries owned by rentbikehanoi.com and thuexemaynguyentu.com, and must not state fares, timetables or operator availability without a dated, inline source, as the G3 money and evidence gates already require.

## Decisions the owner needs to make

1. **Approve or reject the Hub.** Without approval, nothing in this document is implemented.
2. **EN-only or wait for all locales.** Navigation currently renders exactly four Hub labels per locale, and the Ultra and premium tests assert four topic cards (`tests/premium.test.mjs`, `tests/ultra.test.mjs`). Options:
   - **A. EN first:** add a fifth Hub only for EN. This is the fastest route, but navigation and tests must handle a variable number of Hubs per locale. Other locales keep four until they reach eight candidates.
   - **B. All locales together:** research eight or more candidates per locale first (about 70 more topics), then add the Hub everywhere at once. This keeps navigation symmetric and takes longer.
   - Recommendation: **B for navigation symmetry, with A acceptable** if the owner prefers to start with EN. Either way, no hreflang is claimed between distinct Hub pages unless they are true equivalents.
3. **Hub URL and title.** Confirm `/en/topics/getting-around-hanoi/` or provide another slug. Once published it is frozen by `seo-guard`.

## Implementation plan after approval (separate PR)

1. `data/seo/topical-authority/architecture.json`: move `transport-mobility` from `proposed_hubs` to `hubs` (status live) and keep its three clusters.
2. `data/seo/taxonomy.json` and `data/seo/topic-factory/policy.json`: add the topic and switch the domain from `RESEARCH_OPEN` to `ACTIVE` for the approved locale(s).
3. `data/seo/master-matrix.json`: add the Hub row (role HUB, status IDEA) and promote the ten candidates to IDEA rows through the documented promotion path (`node scripts/seo/topical-authority.mjs promote --manifest <owner manifest> --apply` on a clean non-main branch). Nothing becomes PUBLISHED by this step.
4. `scripts/navigation.mjs` and the premium and Ultra components: support the agreed Hub count without breaking the four-Hub locales.
5. Regenerate the derived files with their own tools; never hand-edit them: `node scripts/build.mjs`, `node scripts/seo/content-graph.mjs --write`, `node scripts/seo/fact-guard.mjs --write`, and update `seo-guard` only through `--add-new` at publication.
6. Hub and Supporting texts are then written by Writer sessions and published only through the Auto Publisher gates (G1–G5, G7, live QA), never by this PR.

## Verification checklist for the implementation PR

- `node scripts/build.mjs --check`
- `node scripts/seo/validate-plan.mjs`
- `node scripts/seo/topical-authority.mjs validate`
- `node scripts/seo/seo-guard.mjs`
- `node scripts/seo/fact-guard.mjs`
- `node scripts/nav-qa.mjs`
- `node scripts/topic-factory.mjs status` (domain counts move from ARCHITECTURE_BLOCKED to Matrix)
- `node --test tests/*.test.mjs`, including `tests/premium.test.mjs`, `tests/ultra.test.mjs`, `tests/sitemaps.test.mjs`, `tests/topic-factory.test.mjs` and `tests/writer-slots.test.mjs`
- No IDEA row in the sitemap, navigation links or hreflang; CNAME unchanged; every frozen URL unchanged.

## What this proposal does not do

It does not add a Matrix row, URL, sitemap entry, navigation link or hreflang relation; it does not change any validator, gate or protection; it does not approve itself. The owner's review of this PR is the decision point.
