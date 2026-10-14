# Topical Authority Expansion + SEO Protection — runbook

Repository: `thuexemayhanoi/global` → https://global.rentbikehanoi.com/ (this repo only; `/blog` is read-only reference and never copied).

This layer adds two things on top of the existing Matrix, Writer pool and publisher:

1. **SEO protection guard** — every live URL is frozen with its SEO fingerprint so no build, refactor or publication can silently remove, de-index, re-canonicalise or re-language a working page.
2. **Topical authority map** — a validated, native-language backlog of Supporting topics for all 10 locales, organised Entity Hub → Topic Pillar → Cluster → Supporting, that feeds the Matrix only through an owner-approved promotion manifest.

Nothing in this layer publishes, links, indexes or claims anything. See `docs/TOPICAL-AUTHORITY-BASELINE.md` for the 2026-10-14 audit snapshot.

## 1. Hierarchy (no live role renamed)

| Level | Name | Matrix role | URL | Notes |
|---|---|---|---|---|
| 0 | Entity Hub | `PILLAR` | `/{locale}/` | Owns the head query (e.g. *thuê xe máy Hà Nội*, *Motorrad mieten Hanoi*). Live, frozen. |
| 1 | Topic Pillar | `HUB` | `/{locale}/topics/{slug}/` | 4 per locale: vehicle-choice, rental-costs, documents-contracts, safety-support. |
| 2 | Cluster | — | none | 16 semantic sub-topics (`data/seo/topical-authority/architecture.json`). Rendered as sections of the Topic Pillar, never as their own URL (no thin category stubs). |
| 3 | Supporting | `SUPPORT` | `/{locale}/guides/{slug}/` | One question, one intent, one URL. |

The live checklist (`/{locale}/checklist/`) owns the reserved `ss-pickup` cluster (handover inspection); proposals may not target it (gate T5).

A fifth Hub, `routes-trips` (Ha Giang Loop, Ninh Binh day rides), is modelled as `ARCHITECTURE_REVIEW`. Its 20 candidates are `ARCHITECTURE_BLOCKED` and cannot be promoted until the owner approves a five-Hub architecture (taxonomy, navigation and Matrix contract all assume four).

## 2. State machine (what is real vs capacity)

| State | Where | Meaning |
|---|---|---|
| PUBLISHED | Matrix + HTML + sitemap | Live. Frozen in `data/seo/url-freeze.json`. |
| REVIEW | Matrix IDEA held in `protected-drafts.json` | Authored draft in an unmerged PR (#17, #5/#6). |
| SUBMITTED | Matrix IDEA + `claims.json` SUBMITTED | Writer draft with immutable SHA evidence awaiting editorial review. |
| WRITING | Matrix IDEA + `claims.json` CLAIMED | Active Writer claim. |
| PLANNED | Matrix IDEA | Free in the shared Writer pool. |
| PROPOSED | `data/seo/topical-authority/<locale>.json` | Capacity only. Not in the Matrix, not claimable, not linkable. |
| ARCHITECTURE_BLOCKED | same | Capacity under the proposed routes Hub. |

`node scripts/seo/topical-authority.mjs status` prints these counts per locale and per cluster from the live files (claims change on main, so counts are computed, never committed).

## 3. Localization rules

Each locale file carries its own `market_notes`, native `stop_tokens` (head-entity words ignored for overlap scoring), `reserved_terms`, `forbidden_claim_terms`, native `cluster_labels`, and its own candidate list. The same Cluster can hold different questions per market, for example:

- **vi** — CCCD as deposit, licence classes A1/A under Law 36/2024/QH15, clutch bikes (côn tay), parking and Old Quarter riding, long-term rental for students.
- **ja** — licence conversion (MOFA and the Embassy of Japan state Japanese-issued permits are not valid in Vietnam), 海外旅行保険 vs クレジットカード付帯保険.
- **zh** — whether a mainland licence can be used at all; 押护照 deposits.
- **fr** — permis B + formation 125; assurance carte bancaire.
- **nl / de** — travel insurance tied to the matching licence class.
- **pt** — European Portuguese titles with Brazilian query variants (CNH, PID, Vietnã).

Gate T10 rejects wrong scripts (ja/zh/ko), Vietnamese titles without diacritics, and identical query or title text across locales (untranslated copies).

## 4. Gates T1–T10 (`node scripts/seo/topical-authority.mjs validate`)

| Gate | Checks |
|---|---|
| T1 | Schema, locale file identity, unique `TA-XX-0000` IDs |
| T2 | Parent is a same-locale Matrix HUB; cluster/sub-cluster belong to it; proposed-Hub topics are ARCHITECTURE_BLOCKED |
| T3 | ASCII kebab slug; `/{locale}/guides/{slug}/` unique against Matrix, frozen URLs and other proposals |
| T4 | Native primary + 2–6 secondary queries; no exact duplicate; overlap ≥ 0.66 (word tokens, CJK bigrams, head words removed) fails unless `distinct_from` names the row with a ≥40-char reason; ≥ 0.5 warns |
| T5 | No reserved live intent (pickup checklist) |
| T6 | Title length/uniqueness; word target 1000–5000 |
| T7 | No money amounts; no locale-specific unsupported claims (cheapest, no deposit, guaranteed, free…) |
| T8 | ≥ 2 keys from `references.json` (each verified HTTP 200 on its `checked_on` date); substantive intent rationale |
| T9 | `serp_evidence: NOT_VALIDATED`, `source_verification: NOT_STARTED`, no publish/approval flags, priority 38–99 |
| T10 | Localization (script, diacritics, cross-locale copies) |

Validation is structural. It does **not** prove search demand, SERP intent, rankings or facts. `research_gap` notes flag candidates whose verified references are still thin.

## 5. Promotion into the Matrix (owner-gated)

```sh
node scripts/seo/topical-authority.mjs backlog --count 10          # read-only shortlist
cp examples/topical-promotion-manifest.sample.json approvals/topical-YYYYMMDD.json   # owner edits, then commits it
node scripts/seo/topical-authority.mjs promote --manifest approvals/topical-YYYYMMDD.json          # dry run
# --apply refuses main/master and any dirty tree, so the committed manifest is part of the reviewed PR
node scripts/seo/topical-authority.mjs promote --manifest approvals/topical-YYYYMMDD.json --apply  # clean non-main branch only
node scripts/build.mjs && node scripts/build.mjs --check && node scripts/nav-qa.mjs
node scripts/seo/validate-plan.mjs && node scripts/seo/seo-guard.mjs && node --test tests/*.test.mjs
```

The manifest must carry the exact sentence *"I approve adding these topical-map candidates to the SEO Matrix as unpublished IDEA rows. This is not publication approval."*, `approved_by`, `approved_on` and 1–50 PROPOSED candidate IDs. `--apply`:

- appends IDEA rows (`XX-S09`, `XX-S10`…) with `subcluster` and `topical_candidate_id`,
- adds balanced Writer-board entries (max–min ≤ 1),
- marks candidates `PROMOTED` with their `matrix_id`,
- regenerates `data/seo/content-graph.json`.

It never edits HTML, sitemap, canonical, hreflang, CNAME or claims. After the reviewed PR merges, the Turbo Writer pool can claim the new rows like any other IDEA. Menus keep exactly two featured Supporting labels per Hub (`menuChildren` in `scripts/navigation.mjs`: PUBLISHED first, then priority), so the owner-approved 4 × 2 menu stays stable as Hubs grow. Writer tests derive counts from the Matrix with a 120-IDEA floor, so promotion does not require test edits.

A full rehearsal (5 candidates across de/en/ja/vi/zh, in a throwaway copy) kept `build --check`, nav QA, `validate-plan`, content graph, the guard, topical gates, `writer-lanes verify-all` and all tests green.

**Refill integration:** `node scripts/writer-refill.mjs status` now reports `topical_map_backlog`. When free IDEA rows drop below 30, promote from this validated backlog first; Writer-lane proposals under `factory/topic-refill/proposals/` remain a second source with gates G1–G8.

## 6. Internal-link plan

`node scripts/seo/topical-authority.mjs links --id <MATRIX-ID|TA-XX-0000>` lists the intended Entity Hub, Topic Pillar, same-cluster (≤3) and adjacent-cluster (≤2) targets and marks which are `renderable_now`. Only PUBLISHED targets may become HTML links (enforced by nav QA and the guard). Anchor text uses the target's native query or title; no cross-locale body links.

## 7. SEO protection guard (`node scripts/seo/seo-guard.mjs`)

Frozen per live URL: `lang`, canonical, robots, title, meta description, H1 (+count), hreflang map and JSON-LD types. It fails CI when:

- a frozen URL disappears, is unpublished or leaves the sitemap without a reviewed `retired` entry (reason, approver, PUBLISHED `redirect_to`; GitHub Pages has no server 301, so a retired path keeps a static redirect stub);
- any fingerprint field changes (re-freeze with `--write` only in a reviewed commit, so the diff shows exactly what moved);
- a PUBLISHED page is not self-canonical, carries noindex, has the wrong `lang`, ≠1 H1, missing title/description, invalid JSON-LD, or duplicates another page's title/description;
- hreflang points to an unpublished/off-site URL, mismatches the target language, lacks self-reference or is not reciprocal;
- the sitemap lists an unpublished or noindex URL; `/search/` loses `noindex,follow` or enters the sitemap;
- any IDEA row or topical candidate URL appears as an `href`, in the sitemap or in search shards;
- CNAME changes or robots.txt stops allowing crawl / advertising the sitemap index.

A newly published URL only **warns** (`UNFROZEN_PUBLISHED_URL`) so the publisher flow is not blocked; the publication PR runs `node scripts/seo/seo-guard.mjs --write` to freeze it. `--strict` turns that warning into a failure.

## 8. Entity, schema and AEO/GEO rules for writers

From `architecture.json`: Supporting guides open with a 2–3 sentence direct answer; one question-shaped H2 per sub-question; define entities on first mention; cite current official sources inline with the date checked; visible FAQ only when present on the page. Schema: Article + BreadcrumbList (+FAQPage only for a visible FAQ); never Product, Offer, Review, AggregateRating, LocalBusiness, price or availability.

## 9. Boundaries

- No model APIs, no AI text generation, no auto-publication, no fabricated sources, search volume, rankings, reviews, prices, premises or availability.
- Paid keyword tools (OpenSEO, Ubersuggest) were **not** used; queries are hypotheses until validated with real SERP/volume data in the target market and language.
- Never edit CNAME, live URLs, canonical/hreflang/sitemap by hand; never touch `/blog`, `/lab`, WordPress, DNS or other repositories.
