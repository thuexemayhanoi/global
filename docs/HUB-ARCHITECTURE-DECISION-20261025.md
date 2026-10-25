# Hub architecture decision: the six research-open domains

**Status: DECISION DOCUMENT FOR THE OWNER. Nothing in it is approved.** It changes no Matrix row, topical map, URL, sitemap, navigation, hreflang, validator or generated HTML. It supersedes the EN-only `docs/HUB-PROPOSAL-TRANSPORT-MOBILITY-EN.md` (2026-10-15) and extends the evidence to all 10 locales and all six proposed Hubs.

- Evidence commit: `main` at `5e5594aad076e51e20af0f6ae09ddd829c72efdf` (2026-10-25 18:30 UTC). Every count in this document was measured on that commit; re-measure before implementing.
- Why the owner decides: `approvals/standing-policy-20261015.json` → `topic_promotion.not_authorized` lists *"New Hub rows or architecture changes without a separate reviewed architecture decision"*. The eight-candidate threshold in `docs/TOPIC-FACTORY.md` is a precondition, not an approval.
- Keyword evidence for every candidate stays `NOT_VALIDATED` and `source_verification` stays `NOT_STARTED`. No search volume, ranking or traffic is claimed anywhere below.

## 0. Decision box

### 0.1 Decisions that apply to every Hub you approve

| # | Decision | Options | Constraint found in the repository | Recommendation (non-binding) |
|---|---|---|---|---|
| G1 | Which Hubs, in which order | any subset of the six; one implementation PR per Hub | Each approved Hub changes the header and footer of every locale page as soon as its IDEA Hub rows enter the Matrix (`scripts/navigation.mjs` renders every HUB row; an IDEA Hub becomes a menu group whose link falls back to `/xx/#topics` and whose children are disabled labels). | Start with `transport-mobility` alone; decide the next Hub after its Hub pages pass Live QA. |
| G2 | Rollout scope | all 10 locales together, or EN only | Moving a Hub from `proposed_hubs` to `hubs` applies to every locale: gate T2 then requires a same-locale Matrix HUB parent for every candidate and T9 rejects `ARCHITECTURE_BLOCKED` under a live Hub (`scripts/seo/topical-authority-core.mjs`). Domain `status` in `data/seo/topic-factory/policy.json` is global, not per locale. An EN-only Hub fails validation for the other 9 locales unless the validators are changed or their 99 researched candidates are removed. | All 10 locales together (the topic sets are already parallel, see §1.3). |
| G3 | Navigation contract | keep 4 Hubs; or 4 → N Hubs in header drawer, footer and homepage topic cards | AGENTS.md "Full Menu & Footer (approved)" fixes 4 Hub labels + 8 child labels per locale. Hard-coded: `scripts/navigation.mjs` (throws unless exactly 4 Hubs × 2 children; Hub labels are positional strings), `scripts/nav-qa.mjs` (4 / 8), `scripts/ultra.mjs` (4 topic cards and images), `content/locales.json` (4 `topics` per locale), `tests/premium.test.mjs`, `tests/ultra.test.mjs`. | Approve the target Hub count explicitly; require a label-per-Hub-ID menu design reviewed on mobile in the implementation PR. |
| G4 | Promotion of Supporting candidates | owner-signed `TOPICAL_MAP_PROMOTION` manifest(s), or wait for the standing-policy refill | Navigation needs exactly 2 Supporting rows per Hub at build time. `promote --apply` takes only an exact owner manifest (≤50 IDs, exact statement, clean non-main branch). The Topic Factory refill promotes only when READY < 100 per locale; READY is 101–123 in every locale at `5e5594aad076`, so it would not promote the new candidates now. | Sign one manifest with 2 IDs per locale (20 IDs) for the menu, or three manifests for all 110 `transport-mobility` candidates. An agent must never write this manifest for you. |
| G5 | hreflang between the new Hub pages | yes / no | None of the 40 live Hubs carries hreflang (`data/seo/url-freeze.json`). hreflang is a frozen fingerprint field: when a sibling locale publishes later, the frozen hreflang of the already-live sibling changes and seo-guard fails `FINGERPRINT_CHANGED`; the Auto Publisher only freezes new URLs (`--add-new`). Yes therefore means a reviewed `seo-guard --write` after every locale publication, or a manual all-locale publication. | No (consistent with the live Hubs). |
| G6 | Copy that names "four" topics or motorbike rental | keep, or change in the implementation PR | `/` has the frozen H2 "Discover our four guide topics"; changing it fails `HEADING_REMOVED` until a reviewed re-freeze. Pillar titles read "… Motorbike Rental Guide". Changing frozen titles or headings is outside the standing policy. | Re-word the `/` gallery heading with a reviewed re-freeze of `/` only; leave Pillar titles and H1s unchanged. |

### 0.2 Decisions per proposed Hub

| Hub (architecture id) | Domain (policy.json) | Approve / reject / defer | Hub Matrix IDs | Sensitivity class (today → options) | Nav position | Boundary rulings needed before promotion |
|---|---|---|---|---|---|---|
| `transport-mobility` (PR #72) | Transportation & Urban Mobility (`transportation-mobility`, RESEARCH_OPEN) | approve / reject / defer | `XX-H05` if approved first, then the next free number | today STANDARD (default; not listed). Recommend STANDARD: fares/timetables are already gated by G3_PRICE_EVIDENCE; `mob-last-mile` has no `G3` official source, so LEGAL/SAFETY would force every airport/ride-hailing draft to find one. | after the live Hubs unless you choose otherwise | Ninh Binh/Sapa train vs `routes-trips`; airport, free bus and motorbike-taxi topics vs `safety-support`; itinerary/budget vs `travel-planning` |
| `travel-guides` | Hanoi & Vietnam Travel Guides (`hanoi-vietnam-travel`, RESEARCH_OPEN) | approve / reject / defer | `XX-H05` if approved first, then the next free number | today STANDARD (default; not listed). Recommend STANDARD: seasons, neighbourhoods and etiquette; few legal statements. | after the live Hubs unless you choose otherwise | winter clothing and Hoan Kiem walking street vs `safety-support`; Tet vs `travel-planning` |
| `routes-trips` | Vietnam Road Trips & Travel Routes (`road-trips-routes`, RESEARCH_OPEN) | approve / reject / defer | `XX-H05` if approved first, then the next free number | today STANDARD (listed explicitly). Recommend SAFETY: every topic is riding a rented motorbike on mountain or highway roads; two topics per locale already cite that locale's foreign-ministry advice, so `G3` sources exist in all 10 locales. | after the live Hubs unless you choose otherwise | Ha Giang IDEA rows under `documents-contracts` and `safety-support`; corridors vs `transport-mobility`; rental-term Ha Giang query vs commercial sites |
| `destinations-experiences` | Destinations & Local Experiences (`destinations-experiences`, RESEARCH_OPEN) | approve / reject / defer | `XX-H05` if approved first, then the next free number | today STANDARD (default; not listed). Recommend STANDARD: site access and opening information; ticket prices are already gated by G3_PRICE_EVIDENCE. | after the live Hubs unless you choose otherwise | itineraries vs `travel-planning`; day rides vs `routes-trips`; three internal near-pairs |
| `travel-planning` | Travel Planning, Budget & Itineraries (`travel-planning`, RESEARCH_OPEN) | approve / reject / defer | `XX-H05` if approved first, then the next free number | today STANDARD (default; not listed). Recommend LEGAL: e-visa, visa exemption, overstay penalties, customs allowances and SIM registration are legal statements; `G3` official hosts exist in all three clusters. | after the live Hubs unless you choose otherwise | passport, vaccine and QR-parking rows under live Hubs; itinerary/budget duplication of transport and destination facts |
| `electric-mobility` | Electric Motorbikes & Sustainable Mobility (`electric-mobility`, RESEARCH_OPEN) | approve / reject / defer | `XX-H05` if approved first, then the next free number | today STANDARD (default; not listed). Recommend LEGAL: licence rules, QCVN standards, emissions testing and battery-recycling rules; `G3` hosts (moc.gov.vn, mae.gov.vn, legal databases) exist in all three clusters. | after the live Hubs unless you choose otherwise | electric scooters already owned by `vehicle-choice`/`vc-power` (published in 10 locales; Oct-2026 standards topic duplicated); e-bike licence vs `documents-contracts` |

Notes: Hub IDs are the next free `XX-Hnn` per locale in approval order (H01–H04 are live, no H05 exists anywhere at `5e5594aad076`). Nav position follows the Hub row `priority` (live Hubs use 10, 12, 14, 16). Sensitivity class is per Hub (`policy.json` → `sensitivity.clusters`): only `LEGAL` and `SAFETY` change gating (gate `G3_SENSITIVE_SOURCES`: every draft must cite at least one declared, dated official source inline); `G3_PRICE_EVIDENCE` and `G3_OFFICIAL_EVIDENCE` apply to every class (`scripts/auto-publisher-core.mjs`).

### 0.3 Per-locale form for `transport-mobility` (the subject of PR #72)

Each locale needs a Hub URL slug, a title (and primary query) and a short native nav label. Only the EN slug and title were proposed (PR #72); `/en/topics/getting-around-hanoi/` is free in the Matrix and in `url-freeze.json` at `5e5594aad076`. The other cells are open. Option: the owner approves the Hub in principle and delegates these cells to the implementation PR, where a native reviewer checks them before merge (AGENTS.md: never machine-translate one locale into another).

| Locale | Hub ID | URL slug `/xx/topics/<slug>/` | Title | Nav label | Existing Hub slug convention (H01) | Existing nav label (H01) |
|---|---|---|---|---|---|---|
| vi | `VI-H05` (if first) | open | open | open | `chon-loai-xe` | Chọn loại xe |
| en | `EN-H05` (if first) | `getting-around-hanoi` (PR #72 proposal) | Getting Around Hanoi and Vietnam: Transit, Trains and Transfers (PR #72 proposal) | open | `choosing-a-rental-bike` | Choose a vehicle |
| de | `DE-H05` (if first) | open | open | open | `motorroller-und-motorrad-waehlen` | Fahrzeugwahl |
| fr | `FR-H05` (if first) | open | open | open | `choisir-moto-scooter` | Choisir un véhicule |
| es | `ES-H05` (if first) | open | open | open | `elegir-moto` | Elegir vehículo |
| nl | `NL-H05` (if first) | open | open | open | `motor-of-scooter-kiezen` | Voertuig kiezen |
| zh | `ZH-H05` (if first) | open | open | open | `chexing-xuanze` | 车型选择 |
| pt | `PT-H05` (if first) | open | open | open | `escolher-moto` | Escolher veículo |
| ko | `KO-H05` (if first) | open | open | open | `chajong-seontaek` | 차종 선택 |
| ja | `JA-H05` (if first) | open | open | open | `sharyou-erabi` | 車種の選び方 |

The same 10-row form is needed for each other Hub you approve; nothing is proposed for them yet.

## 1. Evidence snapshot (`main` 5e5594aad076)

### 1.1 Validator status

- `node scripts/seo/topical-authority.mjs validate`: **passed**, 0 failing issues, 2540 warnings (T8 2367, T4 173) over 3196 candidates (643 PROPOSED, 690 ARCHITECTURE_BLOCKED, 1863 PROMOTED) and 1308 registry references.
- Of the 690 ARCHITECTURE_BLOCKED candidates, 597 carry a T8 warning and 19 carry a T4 warning (overlap ≥ 0.50 with an earlier row or candidate of the same locale; ≥ 0.66 would fail). None fails a gate.
- T1–T10 do not compare candidates across Hubs by meaning: several cross-Hub duplicates in §2 score below 0.50 and are only visible by reading the topics.
- Every candidate: `serp_evidence: NOT_VALIDATED`, `source_verification: NOT_STARTED`, `parent_id: null`, `role: SUPPORT`.

### 1.2 ARCHITECTURE_BLOCKED candidates per domain and locale

Read from `data/seo/topical-authority/<locale>.json` (`status: ARCHITECTURE_BLOCKED`, grouped by `cluster`). The figures match `docs/CONTENT-FACTORY-DASHBOARD.md` "Research intake by domain and language" at the same commit.

| Domain | Proposed Hub | vi | en | de | fr | es | nl | zh | pt | ko | ja | Total | Locales ≥ 8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `transportation-mobility`: Transportation & Urban Mobility | `transport-mobility` | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 110 | 10/10 |
| `hanoi-vietnam-travel`: Hanoi & Vietnam Travel Guides | `travel-guides` | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 110 | 10/10 |
| `road-trips-routes`: Vietnam Road Trips & Travel Routes | `routes-trips` | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 90 | 10/10 |
| `destinations-experiences`: Destinations & Local Experiences | `destinations-experiences` | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 160 | 10/10 |
| `travel-planning`: Travel Planning, Budget & Itineraries | `travel-planning` | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 120 | 10/10 |
| `electric-mobility`: Electric Motorbikes & Sustainable Mobility | `electric-mobility` | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 100 | 10/10 |
| **all six** |  | **69** | **69** | **69** | **69** | **69** | **69** | **69** | **69** | **69** | **69** | **690** |  |

Sub-cluster counts are identical in all 10 locales:

| Hub | Sub-cluster | Candidates per locale | Native `cluster_labels` |
|---|---|---|---|
| `transport-mobility` | `mob-urban-transit` | 4 | 0/10 |
| `transport-mobility` | `mob-intercity` | 5 | 0/10 |
| `transport-mobility` | `mob-last-mile` | 2 | 0/10 |
| `travel-guides` | `travel-neighborhoods` | 4 | 0/10 |
| `travel-guides` | `travel-seasons` | 5 | 0/10 |
| `travel-guides` | `travel-etiquette` | 2 | 0/10 |
| `routes-trips` | `rt-northern-loops` | 5 | 10/10 |
| `routes-trips` | `rt-day-trips` | 4 | 10/10 |
| `destinations-experiences` | `dest-northern` | 5 | 0/10 |
| `destinations-experiences` | `dest-local` | 5 | 0/10 |
| `destinations-experiences` | `dest-landscapes` | 6 | 0/10 |
| `travel-planning` | `plan-itineraries` | 2 | 0/10 |
| `travel-planning` | `plan-budget` | 2 | 0/10 |
| `travel-planning` | `plan-logistics` | 8 | 0/10 |
| `electric-mobility` | `electric-choice` | 6 | 0/10 |
| `electric-mobility` | `electric-infrastructure` | 2 | 0/10 |
| `electric-mobility` | `electric-sustainability` | 2 | 0/10 |

### 1.3 What the data shows across all six Hubs

- **Parallel topic sets.** Every Hub has the same topic set in all 10 locales: each locale candidate shares its reference keys with exactly one EN candidate (the one exception, `TA-VI-0020`, is matched by sub-cluster: both are the Ha Giang Loop). The text is localized (T10 passes), but the localization rule in `architecture.json` ("the same Cluster may hold different questions in different languages") is not used yet; there are no market-specific topics in these sets.
- **References are mostly Vietnamese- or English-tagged.** T8 warns ("No native-language or global reference attached") for 597 of the 690 candidates. Outside `vi` and `en`, every candidate of five Hubs warns; `routes-trips` is a partial exception because 2 of its 9 topics per locale cite that locale's foreign-ministry travel advice.
- **Research provenance.** Research records name external AI research sessions: `transport-mobility`: `research-claude-20261015-mobility`, `research-claude-20261018b`, researched 2026-10-15–2026-10-20; `travel-guides`: `research-claude-20261018b`, researched 2026-10-18–2026-10-20; `routes-trips`: `research-claude-20261018b`, researched 2026-10-18–2026-10-19 (20 earlier candidates have no `research` record); `destinations-experiences`: `research-claude-20261018b`, researched 2026-10-18–2026-10-20; `travel-planning`: `research-claude-20261018b`, researched 2026-10-19–2026-10-20; `electric-mobility`: `research-claude-20261018b`, researched 2026-10-19. They cite 239 distinct registry references, `checked_on` 2026-10-14 to 2026-10-20; 227 of them are marked "not re-fetched by CI" in `references.json`.
- **Reference classes used below.** `G3` = host accepted by `isOfficial()` in `scripts/auto-publisher-core.mjs` (the list the publication gate uses for legal/safety evidence). `PRIMARY` = operator, intergovernmental body or manufacturer writing about its own service (hostname classification made for this document; not a gate). `MEDIA` = news outlets, including state media. `OTHER` = commercial travel sites, encyclopedias, blogs. A reference is a research input, not proof (`references.json` → `method`).

### 1.4 Readiness summary

| Hub | Per locale | Clusters (per locale) | Thin clusters (< 3) | Distinct refs (G3 / PRIMARY / MEDIA / OTHER) | T8 warnings | T4 warnings (own / pointing at it) | Clusters without a `G3` host | Main open issue |
|---|---|---|---|---|---|---|---|---|
| `transport-mobility` | 11 | `mob-urban-transit` 4, `mob-intercity` 5, `mob-last-mile` 2 | `mob-last-mile` | 36 (2 / 9 / 13 / 12) | 93/110 | 4 / 0 | `mob-last-mile` | Boundaries with `safety-support` and `routes-trips`; no official source for last-mile |
| `travel-guides` | 11 | `travel-neighborhoods` 4, `travel-seasons` 5, `travel-etiquette` 2 | `travel-etiquette` | 35 (4 / 4 / 21 / 6) | 99/110 | 8 / 5 | none | Overlaps with published/IDEA `safety-support` rows (up to 0.63) |
| `routes-trips` | 9 | `rt-northern-loops` 5, `rt-day-trips` 4 | none | 38 (18 / 6 / 8 / 6) | 63/90 | 2 / 3 | none | Rental-term Ha Giang query; Ha Giang rows already under two live Hubs |
| `destinations-experiences` | 16 | `dest-northern` 5, `dest-local` 5, `dest-landscapes` 6 | none | 64 (18 / 28 / 16 / 2) | 144/160 | 4 / 0 | none | Overlap with itineraries; no blocker found |
| `travel-planning` | 12 | `plan-itineraries` 2, `plan-budget` 2, `plan-logistics` 8 | `plan-itineraries`, `plan-budget` | 46 (19 / 10 / 17 / 0) | 108/120 | 1 / 1 | none | Legal-heavy cluster; two thin clusters |
| `electric-mobility` | 10 | `electric-choice` 6, `electric-infrastructure` 2, `electric-sustainability` 2 | `electric-infrastructure`, `electric-sustainability` | 36 (8 / 7 / 17 / 4) | 90/100 | 0 / 3 | none | Duplicates `vehicle-choice`/`vc-power` topics in every locale |

## 2. Hub by Hub

The internal-link pattern is the same for every Hub and is written once here; each Hub section lists only its specific cross-links.

- **Pillar → Hub.** `seo-guard` fails `PARENT_MISSING_CHILD_LINK` unless the Pillar `/xx/` links to each PUBLISHED Hub inside `<main>`. Today that link comes from `scripts/premium.mjs`, which shows the first 8 PUBLISHED Hub/Supporting rows in Matrix order; a new Hub row appended to the Matrix would not be among them, so the publication of the first new Hub would fail `seo-guard --add-new` and pause the Auto Publisher. The implementation PR must make the Pillar list every PUBLISHED Hub.
- **Hub → Supporting.** The Hub article renders "Guides in this topic" with every PUBLISHED child, grouped by `cluster_labels` (`scripts/articles.mjs`). Native `cluster_labels` exist only for the two `routes-trips` sub-clusters; the other 15 proposed sub-clusters have none in any locale and would all fall back to one generic heading.
- **Supporting → Hub, Pillar and siblings.** Breadcrumb back-links plus up to six PUBLISHED siblings, own cluster first (`scripts/articles.mjs`; `architecture.json` → `link_rules`).
- **Cross-Hub links** only between PUBLISHED pages, with anchors in the target's native query wording; no cross-locale body links.

### 2.1 `transport-mobility`: Transportation & Urban Mobility (PR #72)

**Scope and positioning.** `architecture.json`: "Transportation & Urban Mobility research within Vietnam/Hanoi travel and local mobility, independent of rental storefronts". The Hub explains how a visitor uses the metro, city buses, trains, long-distance buses, airport transfers and ride-hailing apps. All 110 candidates are `informational`; none uses a rental term in its query or title. Transactional rental queries stay with thuexemaynguyentu.com (vi) and rentbikehanoi.com (en) (`policy.json` → `positioning`). Fares, timetables and operator availability need a dated inline source (`G3_PRICE_EVIDENCE`), and the Hub page itself should link to the operators rather than restate fares.

**Clusters and candidates** (IDs are `TA-<LOCALE>-<number>`; the EN query identifies the topic):

| # | Cluster | Topic (EN primary query) | vi | en | de | fr | es | nl | zh | pt | ko | ja | G3 + PRIMARY hosts | MEDIA / OTHER hosts (n) | T8 | T4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `mob-urban-transit` | hanoi metro line 2a cat linh ha dong | 0094 | 0022 | 0097 | 0098 | 0086 | 0095 | 0095 | 0095 | 0094 | 0094 | hanoicapital.chinhphu.vn, metrohanoi.vn | 1 / 1 | 8/10 | 0 |
| 2 | `mob-urban-transit` | hanoi metro line 3 nhon cau giay | 0095 | 0023 | 0098 | 0099 | 0087 | 0096 | 0096 | 0096 | 0095 | 0095 | eib.org, metrohanoi.vn | 2 / 0 | 8/10 | 0 |
| 3 | `mob-urban-transit` | how to take the bus in hanoi | 0096 | 0024 | 0099 | 0100 | 0088 | 0097 | 0097 | 0097 | 0096 | 0096 | transerco.com.vn | 2 / 0 | 8/10 | 0 |
| 4 | `mob-urban-transit` | vinbus electric bus routes hanoi | 0097 | 0025 | 0100 | 0101 | 0089 | 0098 | 0098 | 0098 | 0097 | 0097 | none | 3 / 0 | 9/10 | 0 |
| 5 | `mob-last-mile` | noi bai airport to old quarter by bus | 0098 | 0026 | 0101 | 0102 | 0090 | 0099 | 0099 | 0099 | 0098 | 0098 | vietnamairlines.com | 2 / 0 | 9/10 | 0 |
| 6 | `mob-intercity` | hanoi long distance bus stations | 0099 | 0027 | 0102 | 0103 | 0091 | 0100 | 0100 | 0100 | 0099 | 0099 | none | 2 / 1 | 8/10 | 0 |
| 7 | `mob-intercity` | hanoi to sapa by train | 0100 | 0028 | 0103 | 0104 | 0092 | 0101 | 0101 | 0101 | 0100 | 0100 | giotaugiave.dsvn.vn, vetau.com.vn | 0 / 2 | 8/10 | 0 |
| 8 | `mob-intercity` | hanoi to ninh binh by train | 0101 | 0029 | 0104 | 0105 | 0093 | 0102 | 0102 | 0102 | 0101 | 0101 | vetau.com.vn | 0 / 3 | 8/10 | 4 |
| 9 | `mob-intercity` | hanoi to ha long by bus | 0102 | 0030 | 0105 | 0106 | 0094 | 0103 | 0103 | 0103 | 0102 | 0102 | none | 0 / 3 | 9/10 | 0 |
| 10 | `mob-last-mile` | ride hailing apps in hanoi | 0103 | 0031 | 0106 | 0107 | 0095 | 0104 | 0104 | 0104 | 0103 | 0103 | none | 1 / 2 | 9/10 | 0 |
| 11 | `mob-intercity` | Vietnam train travel rules tickets ID checks children luggage | 0163 | 0167 | 0166 | 0167 | 0155 | 0164 | 0164 | 0164 | 0163 | 0163 | thuvienphapluat.vn, dsvn.vn, vr.com.vn | 0 / 0 | 9/10 | 0 |

**Fact sources per cluster** (distinct reference keys across the 10 locales):

| Cluster | Distinct refs | G3 official hosts | PRIMARY hosts | MEDIA hosts (n) | OTHER hosts | Reference locale tags | `checked_on` |
|---|---|---|---|---|---|---|---|
| `mob-urban-transit` | 13 | hanoicapital.chinhphu.vn | eib.org, metrohanoi.vn, transerco.com.vn | 8 | vinwonders.com | en, vi | 2026-10-15 – 2026-10-18 |
| `mob-intercity` | 17 | thuvienphapluat.vn | dsvn.vn, giotaugiave.dsvn.vn, vetau.com.vn, vr.com.vn | 2 | geckoroutes.com, kimkim.com, legendtravelgroup.com, north-vietnam.com, sanhotelseries.com, vietnamtourism.com, vinpearl.com, vinwonders.com | en, vi | 2026-10-15 – 2026-10-20 |
| `mob-last-mile` | 6 | **none** | vietnamairlines.com | 3 | b-company.jp, expatfocus.com | en | 2026-10-15 |

**Boundaries.**

| Against | Evidence at `5e5594aad076` | Ruling needed |
|---|---|---|
| `safety-support` (live) | "Ride a motorbike to Noi Bai airport" is an IDEA row in all 10 locales (`EN-S111`, `VI-S107`, `DE-S110`, `FR-S111`, `ES-S99`, `NL-S108`, `ZH-S108`, `PT-S108`, `KO-S107`, `JA-S107`) next to the airport-by-bus topic. "Park outside Ring Road 1 and take the free bus" is `DE-S219` (IDEA) and PROPOSED as `TA-VI-0277`, `TA-EN-0281`, `TA-FR-0281`, `TA-ES-0269`. "Is a motorbike taxi or app ride safe" is PROPOSED as `TA-VI-0293`, `TA-EN-0297`, `TA-FR-0297`, `TA-ES-0285`, `TA-KO-0293`, `TA-JA-0293`, next to the ride-hailing topic. Lexical overlap is 0.06–0.33 (EN), below the T4 warning level, so no validator flags these pairs. | `safety-support` keeps riding your own bike and passenger safety; `transport-mobility` keeps how to use the mode (where to board, tickets, apps, routes). Add `distinct_from` on both sides when the rows coexist. |
| `routes-trips` (proposed) | Ninh Binh by train vs Ninh Binh by motorbike: T4 0.50 for `TA-VI-0101`↔`TA-VI-0021` and `TA-DE-0104`↔`TA-DE-0019`; the other 8 locales already carry `distinct_from`. Sapa by train (`TA-EN-0028` family) vs Sapa by motorbike (`TA-EN-0115` family): overlap 0.40 in EN, no `distinct_from` in any locale. | Split by mode. Add `distinct_from` for Sapa in 10 locales and Ninh Binh in vi/de. |
| `travel-planning` (proposed) | "One week in northern Vietnam by train and bus" (`TA-EN-0142` family) and "Hanoi trip budget: official price pages" (`TA-EN-0143` family) share reference keys with this Hub (20 candidates). | Itineraries and budgets link to the transport guides for schedules and fares and do not restate them. |
| `destinations-experiences` (proposed) | Ha Long by bus (`mob-intercity`) vs "Ha Long Bay vs Lan Ha Bay" (`dest-northern`). | Different intents (getting there vs choosing a bay); link, do not merge. |
| `electric-mobility` (proposed) | VinBus electric buses sit in `mob-urban-transit`. | `electric-mobility` covers two-wheelers only; electric buses stay here. |
| `vehicle-choice`, `rental-costs`, `documents-contracts` (live) | No overlapping query found (keyword scan of the Matrix and T4). | None. |

**Hub-specific cross-links once both ends are PUBLISHED:** airport by bus ↔ "ride a motorbike to Noi Bai airport"; Ninh Binh and Sapa by train ↔ their `routes-trips` motorbike equivalents; ride-hailing apps ↔ motorbike-taxi safety; city bus ↔ "park outside Ring Road 1 and take the free bus".

**Known gaps.**
- **T8 (no native-language or global reference):** 93 of 110 candidates (vi 4, en 1, de 11, fr 11, es 11, nl 11, zh 11, pt 11, ko 11, ja 11).
- **T4 overlap warnings:** `TA-VI-0101`↔`TA-VI-0021` 0.50 (routes-trips, ARCHITECTURE_BLOCKED); `TA-DE-0104`↔`TA-DE-0019` 0.50 (routes-trips, ARCHITECTURE_BLOCKED); `TA-KO-0101`↔`TA-KO-0100` 0.60; `TA-JA-0101`↔`TA-JA-0100` 0.50. Each needs a reword or `distinct_from` before promotion; 0.66 fails.
- **Thin clusters (< 3 candidates per locale):** `mob-last-mile` (2). A Hub section with two guides is allowed but thin; research more or merge clusters.
- **No `G3` official source** in `mob-last-mile`.
- **Commercial or third-party sources outweigh official ones** in `mob-intercity` (9 OTHER vs 6 official/primary), `mob-last-mile` (2 OTHER vs 1 official/primary); Writers should cite operators instead.
- **No native `cluster_labels`** for `mob-urban-transit`, `mob-intercity`, `mob-last-mile` in any locale.
- **Placeholder entities** (`Vietnam`, `Hanoi`) on every cluster in `architecture.json`; real entities are needed for the Hub schema `about`.
- No `hub_journey` entry (content graph journey stage stays empty).

### 2.2 `travel-guides`: Hanoi & Vietnam Travel Guides

**Scope and positioning.** Neighbourhood orientation, seasons and festivals, and visitor etiquette in Hanoi; informational travel knowledge, no rental intent (0 candidates use a rental term).

| # | Cluster | Topic (EN primary query) | vi | en | de | fr | es | nl | zh | pt | ko | ja | G3 + PRIMARY hosts | MEDIA / OTHER hosts (n) | T8 | T4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `travel-seasons` | hanoi weather by month | 0112 | 0116 | 0115 | 0116 | 0104 | 0113 | 0113 | 0113 | 0112 | 0112 | vietnam.travel | 0 / 3 | 9/10 | 0 |
| 2 | `travel-seasons` | what to wear in hanoi in winter | 0113 | 0117 | 0116 | 0117 | 0105 | 0114 | 0114 | 0114 | 0113 | 0113 | vietnam.travel | 0 / 2 | 9/10 | 3 |
| 3 | `travel-seasons` | what is open in hanoi during tet | 0114 | 0118 | 0117 | 0118 | 0106 | 0115 | 0115 | 0115 | 0114 | 0114 | none | 3 / 0 | 9/10 | 0 |
| 4 | `travel-seasons` | mid-autumn festival in hanoi where to go | 0115 | 0119 | 0118 | 0119 | 0107 | 0116 | 0116 | 0116 | 0115 | 0115 | vietnamtourism.gov.vn, vietnam.travel | 2 / 0 | 9/10 | 0 |
| 5 | `travel-neighborhoods` | hoan kiem lake weekend walking street | 0116 | 0120 | 0119 | 0120 | 0108 | 0117 | 0117 | 0117 | 0116 | 0116 | vietnamtourism.gov.vn | 2 / 0 | 9/10 | 5 |
| 6 | `travel-neighborhoods` | hanoi old quarter 36 streets names | 0117 | 0121 | 0120 | 0121 | 0109 | 0118 | 0118 | 0118 | 0117 | 0117 | vietnamairlines.com | 1 / 1 | 9/10 | 0 |
| 7 | `travel-neighborhoods` | hanoi french quarter and opera house | 0118 | 0122 | 0121 | 0122 | 0110 | 0119 | 0119 | 0119 | 0118 | 0118 | english.bvhttdl.gov.vn | 1 / 1 | 9/10 | 0 |
| 8 | `travel-neighborhoods` | things to do around west lake hanoi | 0119 | 0123 | 0122 | 0123 | 0111 | 0120 | 0120 | 0120 | 0119 | 0119 | none | 2 / 1 | 9/10 | 0 |
| 9 | `travel-etiquette` | temple and pagoda etiquette in vietnam | 0120 | 0124 | 0123 | 0124 | 0112 | 0121 | 0121 | 0121 | 0120 | 0120 | vietnam.travel | 2 / 0 | 9/10 | 0 |
| 10 | `travel-etiquette` | visiting the ho chi minh mausoleum hours | 0121 | 0125 | 0124 | 0125 | 0113 | 0122 | 0122 | 0122 | 0121 | 0121 | vietnamtourism.gov.vn | 2 / 0 | 9/10 | 0 |
| 11 | `travel-seasons` | Hanoi lotus season West Lake when do lotus bloom | 0162 | 0166 | 0165 | 0166 | 0154 | 0163 | 0163 | 0163 | 0162 | 0162 | none | 3 / 0 | 9/10 | 0 |

| Cluster | Distinct refs | G3 official hosts | PRIMARY hosts | MEDIA hosts (n) | OTHER hosts | Reference locale tags | `checked_on` |
|---|---|---|---|---|---|---|---|
| `travel-neighborhoods` | 13 | english.bvhttdl.gov.vn, vietnamtourism.gov.vn | vietnamairlines.com | 3 | en.wikipedia.org, lonelyplanet.com, vietnamtourism.org.vn | vi | 2026-10-18 |
| `travel-seasons` | 16 | vietnamtourism.gov.vn | vietnam.travel | 7 | britannica.com, climatestotravel.com, timeanddate.com | vi | 2026-10-18 – 2026-10-20 |
| `travel-etiquette` | 6 | vietnamtourism.gov.vn | vietnam.travel | 4 | none | vi | 2026-10-18 |

**Boundaries.** Against `safety-support` (live): "What to wear in Hanoi in winter" overlaps the published winter-riding guides at T4 0.50 (`TA-FR-0117`↔`FR-S33`, `TA-ES-0105`↔`ES-S32`, `TA-KO-0113`↔`KO-S32`), and "Hoan Kiem weekend walking street" overlaps the IDEA rows about riding to Hoan Kiem at weekends at 0.50–0.63 (`ES-S100`, `NL-S109`, `PT-S109`, `KO-S108`, `JA-S108`). Ruling: `travel-guides` = the visitor on foot or in general; `safety-support` = the rider; add `distinct_from` (the 0.63 pair is close to the 0.66 failure line). Against `travel-planning`: 20 candidates share reference keys (Tet `TA-EN-0118` family vs public holidays `TA-EN-0138` family; neighbourhoods vs the 3-day itinerary `TA-EN-0141` family); the guide covers what is open and where to go, the planning page covers dates and schedules. Against `destinations-experiences`: etiquette vs site visits (Mausoleum, temples) link, do not merge.

**Known gaps.**
- **T8 (no native-language or global reference):** 99 of 110 candidates (vi 0, en 11, de 11, fr 11, es 11, nl 11, zh 11, pt 11, ko 11, ja 11).
- **T4 overlap warnings:** `TA-FR-0117`↔`FR-S33` 0.50 (safety-support, PUBLISHED); `TA-FR-0117`↔`TA-FR-0027` 0.50 (safety-support, PROMOTED); `TA-ES-0105`↔`ES-S32` 0.50 (safety-support, PUBLISHED); `TA-ES-0105`↔`TA-ES-0026` 0.50 (safety-support, PROMOTED); `TA-ES-0108`↔`ES-S100` 0.60 (safety-support, IDEA); `TA-NL-0117`↔`NL-S109` 0.50 (safety-support, IDEA); `TA-PT-0117`↔`PT-S109` 0.60 (safety-support, IDEA); `TA-KO-0113`↔`KO-S32` 0.50 (safety-support, PUBLISHED); `TA-KO-0113`↔`TA-KO-0026` 0.50 (safety-support, PROMOTED); `TA-KO-0116`↔`KO-S108` 0.63 (safety-support, IDEA); `TA-JA-0116`↔`JA-S108` 0.60 (safety-support, IDEA). Pointing at this Hub from other clusters: `TA-ES-0160` (safety-support, PROMOTED as `ES-S100`)↔`TA-ES-0108` 0.60; `TA-NL-0169` (safety-support, PROMOTED as `NL-S109`)↔`TA-NL-0117` 0.50; `TA-PT-0169` (safety-support, PROMOTED as `PT-S109`)↔`TA-PT-0117` 0.60; `TA-KO-0168` (safety-support, PROMOTED as `KO-S108`)↔`TA-KO-0116` 0.63; `TA-JA-0168` (safety-support, PROMOTED as `JA-S108`)↔`TA-JA-0116` 0.60. Each needs a reword or `distinct_from` before promotion; 0.66 fails.
- **Thin clusters (< 3 candidates per locale):** `travel-etiquette` (2). A Hub section with two guides is allowed but thin; research more or merge clusters.
- **No native `cluster_labels`** for `travel-neighborhoods`, `travel-seasons`, `travel-etiquette` in any locale.
- **Placeholder entities** (`Vietnam`, `Hanoi`) on every cluster in `architecture.json`; real entities are needed for the Hub schema `about`.
- No `hub_journey` entry (content graph journey stage stays empty).

### 2.3 `routes-trips`: Vietnam Road Trips & Travel Routes

**Scope and positioning.** Riding out of Hanoi on a rented bike: northern loops and day rides. This is the only proposed Hub whose content is motorbike riding itself, so it is closest to the live Hubs; its candidates share references (government travel advice, Law 36/2024/QH15) with 334 candidates of the four live Hubs. In all 10 locales the Ha Giang Loop candidate is `commercial_investigation` and uses a rental term in its primary query (e.g. `TA-EN-0020` "ha giang loop motorbike rental from hanoi", `TA-VI-0020` "thuê xe máy hà nội đi hà giang"): allowed by policy (only `transactional` is forbidden), but it is the closest any proposed topic comes to the commercial sites' queries.

| # | Cluster | Topic (EN primary query) | vi | en | de | fr | es | nl | zh | pt | ko | ja | G3 + PRIMARY hosts | MEDIA / OTHER hosts (n) | T8 | T4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `rt-northern-loops` | ha giang loop motorbike rental from hanoi | 0020 | 0020 | 0018 | 0019 | 0018 | 0018 | 0019 | 0018 | 0018 | 0018 | gov.uk, chinhphu.vn, nchmf.gov.vn, auswaertiges-amt.de, diplomatie.gouv.fr, exteriores.gob.es, nederlandwereldwijd.nl, wb.beijing.gov.cn, portaldascomunidades.mne.gov.pt, 0404.go.kr, anzen.mofa.go.jp, who.int | 0 / 0 | 0/10 | 0 |
| 2 | `rt-day-trips` | hanoi to ninh binh by motorbike | 0021 | 0021 | 0019 | 0020 | 0019 | 0019 | 0020 | 0019 | 0019 | 0019 | gov.uk, nchmf.gov.vn, chinhphu.vn, auswaertiges-amt.de, diplomatie.gouv.fr, exteriores.gob.es, nederlandwereldwijd.nl, wb.beijing.gov.cn, portaldascomunidades.mne.gov.pt, 0404.go.kr, anzen.mofa.go.jp | 0 / 0 | 0/10 | 0 |
| 3 | `rt-day-trips` | hanoi to ba vi national park by motorbike | 0106 | 0110 | 0109 | 0110 | 0098 | 0107 | 0107 | 0107 | 0106 | 0106 | vuonquocgiabavi.com.vn, vietnamairlines.com | 0 / 1 | 9/10 | 0 |
| 4 | `rt-day-trips` | hanoi to perfume pagoda by motorbike | 0107 | 0111 | 0110 | 0111 | 0099 | 0108 | 0108 | 0108 | 0107 | 0107 | vietnamtourism.gov.vn | 1 / 1 | 9/10 | 0 |
| 5 | `rt-northern-loops` | hanoi to cao bang ban gioc waterfall motorbike loop | 0108 | 0112 | 0111 | 0112 | 0100 | 0109 | 0109 | 0109 | 0108 | 0108 | english.bvhttdl.gov.vn, unesco.org | 1 / 0 | 9/10 | 0 |
| 6 | `rt-day-trips` | hanoi to tam dao by motorbike | 0109 | 0113 | 0112 | 0113 | 0101 | 0110 | 0110 | 0110 | 0109 | 0109 | vietnamtourism.gov.vn, thuvienphapluat.vn, vietnamairlines.com | 1 / 0 | 9/10 | 1 |
| 7 | `rt-northern-loops` | hanoi to mai chau and pu luong by motorbike | 0110 | 0114 | 0113 | 0114 | 0102 | 0111 | 0111 | 0111 | 0110 | 0110 | vietnam.travel | 1 / 2 | 9/10 | 1 |
| 8 | `rt-northern-loops` | hanoi to sapa by motorbike without the expressway | 0111 | 0115 | 0114 | 0115 | 0103 | 0112 | 0112 | 0112 | 0111 | 0111 | static3.luatvietnam.vn, laocai.gov.vn | 1 / 1 | 9/10 | 0 |
| 9 | `rt-northern-loops` | Hanoi to Moc Chau by motorbike route and season | 0150 | 0154 | 0153 | 0154 | 0142 | 0151 | 0151 | 0151 | 0150 | 0150 | thongtindoingoai.sonla.gov.vn | 2 / 1 | 9/10 | 0 |

| Cluster | Distinct refs | G3 official hosts | PRIMARY hosts | MEDIA hosts (n) | OTHER hosts | Reference locale tags | `checked_on` |
|---|---|---|---|---|---|---|---|
| `rt-northern-loops` | 28 | 0404.go.kr, anzen.mofa.go.jp, auswaertiges-amt.de, chinhphu.vn, diplomatie.gouv.fr, english.bvhttdl.gov.vn, exteriores.gob.es, gov.uk, laocai.gov.vn, nchmf.gov.vn, nederlandwereldwijd.nl, portaldascomunidades.mne.gov.pt, static3.luatvietnam.vn, thongtindoingoai.sonla.gov.vn, wb.beijing.gov.cn | unesco.org, vietnam.travel, who.int | 4 | maichauhideaway.com, vegatravel.vn, vietnamparadisetravel.com, vietnamtourism.com | de, en, es, fr, global, ja, ko, nl, pt, vi, zh | 2026-10-14 – 2026-10-19 |
| `rt-day-trips` | 21 | 0404.go.kr, anzen.mofa.go.jp, auswaertiges-amt.de, chinhphu.vn, diplomatie.gouv.fr, exteriores.gob.es, gov.uk, nchmf.gov.vn, nederlandwereldwijd.nl, portaldascomunidades.mne.gov.pt, thuvienphapluat.vn, vietnamtourism.gov.vn, wb.beijing.gov.cn | vietnamairlines.com, vuonquocgiabavi.com.vn | 2 | en.wikipedia.org, vietnamtourism.com | de, en, es, fr, ja, ko, nl, pt, vi, zh | 2026-10-14 – 2026-10-18 |

**Boundaries.** Ha Giang: every locale already has two Ha Giang IDEA rows under live Hubs (border-area permit in `documents-contracts`, e.g. `EN-S115`; easy-rider rules in `safety-support`, e.g. `EN-S169`); the loop guide must link to them, not repeat them. Against `transport-mobility`: same corridors by a different mode (see §2.1). Against `destinations-experiences`: Ba Vi by motorbike vs Cuc Phuong from Hanoi (T4 0.50 in ko). Alternative for the owner: reject a separate Hub and keep these topics as new clusters of an existing Hub; that is also an architecture change.

**Known gaps.**
- **T8 (no native-language or global reference):** 63 of 90 candidates (vi 0, en 7, de 7, fr 7, es 7, nl 7, zh 7, pt 7, ko 7, ja 7).
- **T4 overlap warnings:** `TA-KO-0109`↔`TA-KO-0106` 0.50; `TA-KO-0110`↔`TA-KO-0109` 0.50. Pointing at this Hub from other clusters: `TA-VI-0101` (transport-mobility, ARCHITECTURE_BLOCKED)↔`TA-VI-0021` 0.50; `TA-DE-0104` (transport-mobility, ARCHITECTURE_BLOCKED)↔`TA-DE-0019` 0.50; `TA-KO-0130` (destinations-experiences, ARCHITECTURE_BLOCKED)↔`TA-KO-0106` 0.50. Each needs a reword or `distinct_from` before promotion; 0.66 fails.
- No `hub_journey` entry (content graph journey stage stays empty).

### 2.4 `destinations-experiences`: Destinations & Local Experiences

**Scope and positioning.** Independent access guides to heritage sites, craft villages, national parks and geoparks; no first-hand claims, no rental intent (0 candidates use a rental term). It has the most candidates (16 per locale) and the most operator/intergovernmental sources (UNESCO, Ramsar, site management boards).

| # | Cluster | Topic (EN primary query) | vi | en | de | fr | es | nl | zh | pt | ko | ja | G3 + PRIMARY hosts | MEDIA / OTHER hosts (n) | T8 | T4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `dest-local` | visiting the imperial citadel of thang long hanoi | 0122 | 0126 | 0125 | 0126 | 0114 | 0123 | 0123 | 0123 | 0122 | 0122 | whc.unesco.org, hoangthanhthanglong.vn | 0 / 0 | 9/10 | 0 |
| 2 | `dest-local` | visiting the temple of literature hanoi | 0123 | 0127 | 0126 | 0127 | 0115 | 0124 | 0124 | 0124 | 0123 | 0123 | vanmieu.gov.vn | 0 / 0 | 9/10 | 0 |
| 3 | `dest-local` | water puppet show in hanoi thang long theatre | 0124 | 0128 | 0127 | 0128 | 0116 | 0125 | 0125 | 0125 | 0124 | 0124 | nhahatmuaroithanglong.vn | 1 / 1 | 9/10 | 1 |
| 4 | `dest-local` | visiting bat trang ceramic village from hanoi | 0125 | 0129 | 0128 | 0129 | 0117 | 0126 | 0126 | 0126 | 0125 | 0125 | vietnamtourism.gov.vn, nongthon.vietnamtourism.gov.vn | 1 / 0 | 9/10 | 0 |
| 5 | `dest-northern` | visiting duong lam ancient village from hanoi | 0126 | 0130 | 0129 | 0130 | 0118 | 0127 | 0127 | 0127 | 0126 | 0126 | vietnamtourism.gov.vn, vietnamairlines.com | 1 / 1 | 9/10 | 0 |
| 6 | `dest-northern` | visiting the trang an landscape complex unesco site | 0127 | 0131 | 0130 | 0131 | 0119 | 0128 | 0128 | 0128 | 0127 | 0127 | whc.unesco.org, vietnam.travel | 0 / 0 | 9/10 | 0 |
| 7 | `dest-northern` | ha long bay vs lan ha bay difference | 0128 | 0132 | 0131 | 0132 | 0120 | 0129 | 0129 | 0129 | 0128 | 0128 | whc.unesco.org, vietnam.travel | 0 / 0 | 9/10 | 0 |
| 8 | `dest-landscapes` | mu cang chai rice terraces by season | 0129 | 0133 | 0132 | 0133 | 0121 | 0130 | 0130 | 0130 | 0129 | 0129 | vietnamtourism.gov.vn, vietnam.travel | 0 / 0 | 9/10 | 0 |
| 9 | `dest-landscapes` | visiting cuc phuong national park from hanoi | 0130 | 0134 | 0133 | 0134 | 0122 | 0131 | 0131 | 0131 | 0130 | 0130 | vietnam.travel | 1 / 0 | 9/10 | 1 |
| 10 | `dest-landscapes` | visiting ba be national park and lake | 0131 | 0135 | 0134 | 0135 | 0123 | 0132 | 0132 | 0132 | 0131 | 0131 | vietnamtourism.gov.vn, rsis.ramsar.org, asean.chm-cbd.net, vietnam.travel | 0 / 0 | 9/10 | 1 |
| 11 | `dest-landscapes` | Dong Van Karst Plateau UNESCO Global Geopark what to see | 0156 | 0160 | 0159 | 0160 | 0148 | 0157 | 0157 | 0157 | 0156 | 0156 | vietnamtourism.gov.vn, unesco.org, globalgeopark.org | 2 / 0 | 9/10 | 0 |
| 12 | `dest-northern` | Yen Tu Vinh Nghiem Con Son Kiep Bac UNESCO World Heritage complex what to see | 0158 | 0162 | 0161 | 0162 | 0150 | 0159 | 0159 | 0159 | 0158 | 0158 | quangninh.gov.vn, vietnamtourism.gov.vn, whc.unesco.org | 1 / 0 | 9/10 | 0 |
| 13 | `dest-northern` | visiting the Ho Dynasty Citadel in Thanh Hoa from Hanoi | 0159 | 0163 | 0162 | 0163 | 0151 | 0160 | 0160 | 0160 | 0159 | 0159 | vietnamtourism.gov.vn, whc.unesco.org | 1 / 0 | 9/10 | 0 |
| 14 | `dest-local` | visiting Co Loa Citadel in Hanoi what to see | 0160 | 0164 | 0163 | 0164 | 0152 | 0161 | 0161 | 0161 | 0160 | 0160 | vietnamtourism.gov.vn, dsvh.gov.vn | 2 / 0 | 9/10 | 0 |
| 15 | `dest-landscapes` | Phong Nha-Ke Bang and Hin Nam No UNESCO World Heritage site what to see | 0164 | 0168 | 0167 | 0168 | 0156 | 0165 | 0165 | 0165 | 0164 | 0164 | whc.unesco.org, unesdoc.unesco.org | 1 / 0 | 9/10 | 0 |
| 16 | `dest-landscapes` | Lang Son UNESCO Global Geopark what to see caves Bac Son | 0166 | 0170 | 0169 | 0170 | 0158 | 0167 | 0167 | 0167 | 0166 | 0166 | vietnamtourism.gov.vn, unesco.org, langsongeopark.com.vn | 2 / 0 | 9/10 | 1 |

| Cluster | Distinct refs | G3 official hosts | PRIMARY hosts | MEDIA hosts (n) | OTHER hosts | Reference locale tags | `checked_on` |
|---|---|---|---|---|---|---|---|
| `dest-northern` | 21 | quangninh.gov.vn, vietnamtourism.gov.vn | vietnam.travel, vietnamairlines.com, whc.unesco.org | 3 | vietnamtourism.org.vn | vi | 2026-10-18 – 2026-10-20 |
| `dest-local` | 20 | dsvh.gov.vn, nongthon.vietnamtourism.gov.vn, vanmieu.gov.vn, vietnamtourism.gov.vn | hoangthanhthanglong.vn, nhahatmuaroithanglong.vn, whc.unesco.org | 4 | thanglongwaterpuppet.org | vi | 2026-10-18 – 2026-10-20 |
| `dest-landscapes` | 23 | vietnamtourism.gov.vn | asean.chm-cbd.net, globalgeopark.org, langsongeopark.com.vn, rsis.ramsar.org, unesco.org, unesdoc.unesco.org, vietnam.travel, whc.unesco.org | 5 | none | vi | 2026-10-18 – 2026-10-20 |

**Boundaries.** Against `travel-planning`: the itineraries share references with 30 of these candidates; itineraries link to the destination guides. Against `routes-trips`: day rides vs visiting the same place (Ba Vi, Ninh Binh/Trang An). Internal near-pairs at T4 0.50–0.58 (`TA-VI-0131`↔`TA-VI-0130`, `TA-DE-0127`↔`TA-DE-0125`, `TA-ZH-0167`↔`TA-ZH-0157`) are different places with similar query patterns; reword or add `distinct_from`.

**Known gaps.**
- **T8 (no native-language or global reference):** 144 of 160 candidates (vi 0, en 16, de 16, fr 16, es 16, nl 16, zh 16, pt 16, ko 16, ja 16).
- **T4 overlap warnings:** `TA-VI-0131`↔`TA-VI-0130` 0.50; `TA-DE-0127`↔`TA-DE-0125` 0.50; `TA-ZH-0167`↔`TA-ZH-0157` 0.58; `TA-KO-0130`↔`TA-KO-0106` 0.50 (routes-trips, ARCHITECTURE_BLOCKED). Each needs a reword or `distinct_from` before promotion; 0.66 fails.
- **No native `cluster_labels`** for `dest-northern`, `dest-local`, `dest-landscapes` in any locale.
- **Placeholder entities** (`Vietnam`, `Hanoi`) on every cluster in `architecture.json`; real entities are needed for the Hub schema `about`.
- No `hub_journey` entry (content graph journey stage stays empty).

### 2.5 `travel-planning`: Travel Planning, Budget & Itineraries

**Scope and positioning.** Entry rules (e-visa, visa exemption, overstay, customs), health preparation, public holidays, payments and SIM cards, budgets and itineraries. Eight of the 12 topics are in `plan-logistics` and most of them make legal statements; it has the largest pool of `G3` official sources.

| # | Cluster | Topic (EN primary query) | vi | en | de | fr | es | nl | zh | pt | ko | ja | G3 + PRIMARY hosts | MEDIA / OTHER hosts (n) | T8 | T4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `plan-logistics` | how to apply for a vietnam e-visa on the official portal | 0132 | 0136 | 0135 | 0136 | 0124 | 0133 | 0133 | 0133 | 0132 | 0132 | evisa.gov.vn | 1 / 0 | 9/10 | 0 |
| 2 | `plan-logistics` | vietnam 45 day visa exemption who qualifies | 0133 | 0137 | 0136 | 0137 | 0125 | 0134 | 0134 | 0134 | 0133 | 0133 | vietnamtourism.gov.vn, evisa.gov.vn | 1 / 0 | 9/10 | 0 |
| 3 | `plan-logistics` | vietnam public holidays 2027 trip planning | 0134 | 0138 | 0137 | 0138 | 0126 | 0135 | 0135 | 0135 | 0134 | 0134 | none | 3 / 0 | 9/10 | 0 |
| 4 | `plan-logistics` | travel health preparation for vietnam vaccines | 0135 | 0139 | 0138 | 0139 | 0127 | 0136 | 0136 | 0136 | 0135 | 0135 | cdc.gov, wwwnc.cdc.gov | 0 / 0 | 9/10 | 0 |
| 5 | `plan-budget` | paying in vietnam as a tourist cash cards and qr codes | 0136 | 0140 | 0139 | 0140 | 0128 | 0137 | 0137 | 0137 | 0136 | 0136 | vietnamtourism.gov.vn, en.napas.com.vn | 1 / 0 | 9/10 | 1 |
| 6 | `plan-itineraries` | 3 days in hanoi first visit itinerary | 0137 | 0141 | 0140 | 0141 | 0129 | 0138 | 0138 | 0138 | 0137 | 0137 | vanmieu.gov.vn, vietnamtourism.gov.vn, whc.unesco.org, nhahatmuaroithanglong.vn | 1 / 0 | 9/10 | 0 |
| 7 | `plan-itineraries` | one week in northern vietnam by train and bus | 0138 | 0142 | 0141 | 0142 | 0130 | 0139 | 0139 | 0139 | 0138 | 0138 | whc.unesco.org, vetau.com.vn, giotaugiave.dsvn.vn | 1 / 0 | 9/10 | 0 |
| 8 | `plan-budget` | hanoi trip budget official price pages to check | 0139 | 0143 | 0142 | 0143 | 0131 | 0140 | 0140 | 0140 | 0139 | 0139 | evisa.gov.vn, metrohanoi.vn, transerco.com.vn, nhahatmuaroithanglong.vn | 0 / 0 | 9/10 | 0 |
| 9 | `plan-logistics` | buying a SIM card in Vietnam as a tourist passport registration | 0157 | 0161 | 0160 | 0161 | 0149 | 0158 | 0158 | 0158 | 0157 | 0157 | beta-en.mic.gov.vn, thuvienphapluat.vn | 3 / 0 | 9/10 | 0 |
| 10 | `plan-logistics` | what can you bring into Vietnam customs duty free allowance | 0161 | 0165 | 0164 | 0165 | 0153 | 0162 | 0162 | 0162 | 0161 | 0161 | xaydungchinhsach.chinhphu.vn, customs.gov.vn, kv03.customs.gov.vn, thuvienphapluat.vn | 0 / 0 | 9/10 | 0 |
| 11 | `plan-logistics` | Vietnam visa overstay penalties foreigners new decree hotel registration of foreign guests | 0165 | 0169 | 0168 | 0169 | 0157 | 0166 | 0166 | 0166 | 0165 | 0165 | congan.ninhbinh.gov.vn, bocongan.gov.vn, congan.cantho.gov.vn | 1 / 0 | 9/10 | 0 |
| 12 | `plan-logistics` | is 24 November a public holiday in Vietnam Culture Day | 0180 | 0184 | 0183 | 0184 | 0172 | 0181 | 0181 | 0181 | 0180 | 0180 | vietnamtourism.gov.vn, xaydungchinhsach.chinhphu.vn | 4 / 0 | 9/10 | 0 |

| Cluster | Distinct refs | G3 official hosts | PRIMARY hosts | MEDIA hosts (n) | OTHER hosts | Reference locale tags | `checked_on` |
|---|---|---|---|---|---|---|---|
| `plan-itineraries` | 10 | vanmieu.gov.vn, vietnamtourism.gov.vn | giotaugiave.dsvn.vn, nhahatmuaroithanglong.vn, vetau.com.vn, whc.unesco.org | 2 | none | vi | 2026-10-18 |
| `plan-budget` | 8 | evisa.gov.vn, vietnamtourism.gov.vn | en.napas.com.vn, metrohanoi.vn, nhahatmuaroithanglong.vn, transerco.com.vn | 1 | none | vi | 2026-10-18 – 2026-10-19 |
| `plan-logistics` | 30 | beta-en.mic.gov.vn, bocongan.gov.vn, cdc.gov, congan.cantho.gov.vn, congan.ninhbinh.gov.vn, customs.gov.vn, evisa.gov.vn, kv03.customs.gov.vn, thuvienphapluat.vn, vietnamtourism.gov.vn, wwwnc.cdc.gov, xaydungchinhsach.chinhphu.vn | none | 9 | none | vi | 2026-10-18 – 2026-10-20 |

**Boundaries.** Against `documents-contracts` and `safety-support` (live): passport carrying (`EN-S171`), vaccines before riding (`EN-S159`), QR payment for parking (`TA-VI-0136`↔`TA-VI-0227`/`VI-S166`, T4 0.50). Ruling: `travel-planning` = the traveller; the live Hubs = the rider and the rental. Against `transport-mobility` and `destinations-experiences`: itineraries and budgets link out instead of repeating schedules, fares or site details.

**Known gaps.**
- **T8 (no native-language or global reference):** 108 of 120 candidates (vi 0, en 12, de 12, fr 12, es 12, nl 12, zh 12, pt 12, ko 12, ja 12).
- **T4 overlap warnings:** `TA-VI-0136`↔`VI-S166` 0.50 (safety-support, IDEA). Pointing at this Hub from other clusters: `TA-VI-0227` (safety-support, PROMOTED as `VI-S166`)↔`TA-VI-0136` 0.50. Each needs a reword or `distinct_from` before promotion; 0.66 fails.
- **Thin clusters (< 3 candidates per locale):** `plan-itineraries` (2), `plan-budget` (2). A Hub section with two guides is allowed but thin; research more or merge clusters.
- **No native `cluster_labels`** for `plan-itineraries`, `plan-budget`, `plan-logistics` in any locale.
- **Placeholder entities** (`Vietnam`, `Hanoi`) on every cluster in `architecture.json`; real entities are needed for the Hub schema `about`.
- No `hub_journey` entry (content graph journey stage stays empty).

### 2.6 `electric-mobility`: Electric Motorbikes & Sustainable Mobility

**Scope and positioning.** Electric two-wheelers: brands and models, battery swapping and charging, licence rules, technical standards, emissions testing and battery recycling.

| # | Cluster | Topic (EN primary query) | vi | en | de | fr | es | nl | zh | pt | ko | ja | G3 + PRIMARY hosts | MEDIA / OTHER hosts (n) | T8 | T4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `electric-infrastructure` | how battery swapping for electric scooters works in vietnam | 0140 | 0144 | 0143 | 0144 | 0132 | 0141 | 0141 | 0141 | 0140 | 0140 | vinfastauto.us | 3 / 0 | 9/10 | 0 |
| 2 | `electric-infrastructure` | charging an electric scooter in a hanoi apartment building and public charging stations | 0141 | 0145 | 0144 | 0145 | 0133 | 0142 | 0142 | 0142 | 0141 | 0141 | moc.gov.vn | 2 / 0 | 9/10 | 0 |
| 3 | `electric-choice` | vinfast electric scooter lineup battery swap and licence rules | 0142 | 0146 | 0145 | 0146 | 0134 | 0143 | 0143 | 0143 | 0142 | 0142 | sec.gov, vinfastauto.us | 0 / 0 | 9/10 | 0 |
| 4 | `electric-choice` | do electric motorbikes need a licence in vietnam | 0143 | 0147 | 0146 | 0147 | 0135 | 0144 | 0144 | 0144 | 0143 | 0143 | static3.luatvietnam.vn | 3 / 1 | 9/10 | 0 |
| 5 | `electric-choice` | electric motorbike battery and motor standards QCVN 30 QCVN 31 from October 2026 | 0144 | 0148 | 0147 | 0148 | 0136 | 0145 | 0145 | 0145 | 0144 | 0144 | moc.gov.vn, thuvienphapluat.vn | 1 / 0 | 9/10 | 0 |
| 6 | `electric-choice` | total cost of ownership electric scooter versus petrol motorbike in Vietnam | 0145 | 0149 | 0148 | 0149 | 0137 | 0146 | 0146 | 0146 | 0145 | 0145 | documents1.worldbank.org | 0 / 2 | 9/10 | 0 |
| 7 | `electric-choice` | Honda electric scooters in Vietnam ICON e: CUV e: UC3 battery options | 0146 | 0150 | 0149 | 0150 | 0138 | 0147 | 0147 | 0147 | 0146 | 0146 | honda.com.vn | 3 / 0 | 9/10 | 0 |
| 8 | `electric-sustainability` | motorbike emissions testing in Hanoi from July 2027 who is covered | 0147 | 0151 | 0150 | 0151 | 0139 | 0148 | 0148 | 0148 | 0147 | 0147 | moc.gov.vn | 3 / 0 | 9/10 | 0 |
| 9 | `electric-choice` | electric motorbike brands in Vietnam Dat Bike Yadea Pega Selex compared | 0148 | 0152 | 0151 | 0152 | 0140 | 0149 | 0149 | 0149 | 0148 | 0148 | dat.bike, selex.vn | 1 / 1 | 9/10 | 0 |
| 10 | `electric-sustainability` | electric scooter battery recycling rules in Vietnam extended producer responsibility | 0149 | 0153 | 0152 | 0153 | 0141 | 0150 | 0150 | 0150 | 0149 | 0149 | en.mae.gov.vn, iea.org | 1 / 0 | 9/10 | 0 |

| Cluster | Distinct refs | G3 official hosts | PRIMARY hosts | MEDIA hosts (n) | OTHER hosts | Reference locale tags | `checked_on` |
|---|---|---|---|---|---|---|---|
| `electric-choice` | 23 | moc.gov.vn, sec.gov, static3.luatvietnam.vn, thuvienphapluat.vn | dat.bike, documents1.worldbank.org, honda.com.vn, selex.vn, vinfastauto.us | 5 | europepmc.org, theicct.org, wavemaker.vc | vi | 2026-10-18 – 2026-10-19 |
| `electric-infrastructure` | 7 | moc.gov.vn | vinfastauto.us | 5 | none | vi | 2026-10-19 |
| `electric-sustainability` | 7 | en.mae.gov.vn, moc.gov.vn | iea.org | 4 | none | vi | 2026-10-19 |

**Boundaries (largest conflict of the six).** The live `vehicle-choice` Hub already owns electric scooters in its `vc-power` cluster ("Engine capacity and electric drive … electric scooters"): a published range-and-charging guide exists in every locale (`VI-S73`, `EN-S77`, `DE-S76`, `FR-S76`, `ES-S65`, `NL-S73`, `ZH-S73`, `PT-S74`, `KO-S73`, `JA-S74`), and the "new battery and motor standards from October 2026" topic is already a Matrix IDEA row in de (`DE-S213`) and PROPOSED under `vehicle-choice` in 8 more locales (`TA-EN-0275`, `TA-FR-0275`, `TA-ES-0263`, `TA-NL-0272`, `TA-ZH-0272`, `TA-PT-0272`, `TA-KO-0271`, `TA-JA-0271`), while the same topic is ARCHITECTURE_BLOCKED here in all 10 locales (T4 0.54–0.60 in en/zh/ja; the other locales score lower only because of wording). Licence rules for electric bikes (`TA-EN-0308` PROPOSED under `documents-contracts`) sit next to `TA-EN-0147`. "Motorbike emissions testing in Hanoi from July 2027" sits next to the published "petrol motorbike ban Ring Road 1" (`EN-S13`). Ruling needed: either move electric topics out of `vc-power` or drop the duplicates from this Hub; one of each pair must yield before promotion.

**Known gaps.**
- **T8 (no native-language or global reference):** 90 of 100 candidates (vi 0, en 10, de 10, fr 10, es 10, nl 10, zh 10, pt 10, ko 10, ja 10).
- **T4 overlap warnings:** none on this Hub's candidates. Pointing at this Hub from other clusters: `TA-EN-0275` (vehicle-choice, PROPOSED)↔`TA-EN-0148` 0.60; `TA-ZH-0272` (vehicle-choice, PROPOSED)↔`TA-ZH-0145` 0.59; `TA-JA-0271` (vehicle-choice, PROPOSED)↔`TA-JA-0144` 0.54. Each needs a reword or `distinct_from` before promotion; 0.66 fails.
- **Thin clusters (< 3 candidates per locale):** `electric-infrastructure` (2), `electric-sustainability` (2). A Hub section with two guides is allowed but thin; research more or merge clusters.
- **No native `cluster_labels`** for `electric-choice`, `electric-infrastructure`, `electric-sustainability` in any locale.
- **Placeholder entities** (`Vietnam`, `Hanoi`) on every cluster in `architecture.json`; real entities are needed for the Hub schema `about`.
- No `hub_journey` entry (content graph journey stage stays empty).

## 3. Implementation plan after approval (separate PR per Hub, not this PR)

Order matters: the build throws as soon as a Hub row exists without the navigation change and two Supporting children.

| Step | Files | What changes | Verification |
|---|---|---|---|
| 1. Rendering for N Hubs | `scripts/navigation.mjs`, `scripts/nav-qa.mjs`, `scripts/ultra.mjs`, `scripts/premium.mjs`, `content/locales.json`, one decorative topic image, `assets/*.css` if the drawer needs it | Hub labels keyed by Hub ID (native, 10 locales); count derived from the Matrix; homepage topic card per Hub; Pillar `<main>` links every PUBLISHED Hub (fixes the `PARENT_MISSING_CHILD_LINK` trap in §2) | `node scripts/build.mjs --check`, `node scripts/nav-qa.mjs`, `node --test tests/premium.test.mjs tests/ultra.test.mjs` (assertions updated from 4) |
| 2. Architecture data | `data/seo/topical-authority/architecture.json` | Move the Hub from `proposed_hubs` to `hubs`; replace placeholder entities (`Vietnam`, `Hanoi`) with real entities; add `hub_journey`; update the hierarchy note | `node scripts/seo/topical-authority.mjs validate` |
| 3. Policy and taxonomy | `data/seo/topic-factory/policy.json`, `data/seo/taxonomy.json` | Domain `RESEARCH_OPEN` → `ACTIVE` (global); `sensitivity.clusters` entry; taxonomy topic with `hub_intent`, `focus`, `must_not_claim` | `node --test tests/topic-factory.test.mjs` (update the 6 / 6 / 2 counts) |
| 4. Hub rows | `data/seo/master-matrix.json` | 10 hand-written HUB IDEA rows (`XX-H05`, parent `XX-HOME`, approved slug/title/query, `informational`, priority per G1/§0.2, `NOT_VALIDATED` / `NOT_STARTED`). `promote` cannot create Hub rows. | `node scripts/seo/validate-plan.mjs` (Hub parent and overlap gates) |
| 5. Locale maps | `data/seo/topical-authority/<10 locales>.json` | Each candidate of the Hub: `ARCHITECTURE_BLOCKED` → `PROPOSED`, `parent_id` = the locale's new Hub; native `cluster_labels`; the `distinct_from` entries from the boundary rulings | `node scripts/seo/topical-authority.mjs validate` (T2/T4/T9 must pass) |
| 6. Promotion | owner manifest(s) committed under `approvals/` (format: `examples/topical-promotion-manifest.sample.json`), then `node scripts/seo/topical-authority.mjs promote --manifest <file> --apply` on a clean non-main branch | ≥2 Supporting IDEA rows per locale (menu), up to all candidates; `content-graph` is regenerated by the command | `node scripts/seo/validate-plan.mjs`, `node scripts/seo/content-graph.mjs --check` |
| 7. Regenerate and guard | generated HTML, sitemaps, search shards, `data/seo/content-graph.json`, `docs/GLOBAL-SITE-MATRIX.md` | `node scripts/build.mjs`; header and footer of every locale page change (IDEA Hub groups link only to `/xx/#topics`; their children stay disabled labels) | `node scripts/build.mjs --check`, `node scripts/seo/seo-guard.mjs` (expected clean: nav is outside `<main>`; only `/` needs a reviewed `--write` if its gallery heading changes), `node scripts/seo/fact-guard.mjs`, `node --test tests/*.test.mjs` |
| 8. Docs | `docs/TOPICAL-AUTHORITY.md` (still says one fifth Hub with 20 candidates; now 90), `docs/MENU-ARCHITECTURE.md`, AGENTS.md menu section | Describe the approved Hub count | review |
| 9. After merge | none (automation) | Writer pool sorts HUB rows first, so `XX-H05` is claimed before its Supporting rows. Supporting drafts that pass QA before their Hub is live wait as `WAIT_PARENT`, which blocks nothing else. The Auto Publisher (stage `CONTINUOUS`, 465 clean runs, not paused at `5e5594aad076`) publishes ≤2 new URLs per run with Live QA; each new URL is frozen with `seo-guard --add-new`. | dashboard, Live QA |

**Risks.**

| Risk | Effect | Mitigation |
|---|---|---|
| Header/footer regeneration on all ~930 pages | Visual or mobile menu regression on every live page | Review the menu on mobile; `nav-qa`; header is outside `<main>`, so frozen fingerprints do not change |
| Pillar does not link the new Hub | `PARENT_MISSING_CHILD_LINK` → `seo-guard --add-new` refuses → publication run fails and pauses | Step 1 (Pillar lists every PUBLISHED Hub) |
| Hub row without 2 children | `Expected 4 hubs with 8 children` build error | Steps 4–6 in one PR; manifest decision G4 |
| Fares and timetables change | `G3_PRICE_EVIDENCE` repairs; stale facts | Hub links to operators; Supporting cites dated sources |
| Cross-Hub cannibalization | Two URLs for one intent | §2 boundary rulings as `distinct_from` before promotion |
| Missing native sources (T8) | Weaker non-vi/en articles | Writers add native sources; keep `G3` official sources inline |
| Positioning drift | Pillars still titled "Motorbike Rental Guide" | Decision G6; titles unchanged by this decision |

## 4. Not authorized by the standing policy: waits for the owner

1. Approving any of the six Hubs, adding Hub rows or moving a domain from `RESEARCH_OPEN` to `ACTIVE` (`topic_promotion.not_authorized`).
2. Changing the approved 4-Hub / 8-child menu contract in AGENTS.md and the navigation code.
3. Re-freezing any frozen URL (`seo-guard --write`), including the `/` gallery heading, and any change to frozen titles, H1s or hreflang (`publication.not_authorized`: overwriting a PUBLISHED or frozen page).
4. hreflang between the new Hub pages (G5).
5. The per-locale Hub slugs, titles and nav labels (§0.3), and the sensitivity class of each Hub.
6. The boundary rulings in §2, including which of the duplicated electric-scooter topics yields.
7. A personal `TOPICAL_MAP_PROMOTION` manifest: only the owner signs it; agents never write or fake one.

What the standing policy covers once a Hub is approved and implemented: promotion of gate-clean PROPOSED candidates under that Hub to Matrix IDEA rows by the Topic Factory (≤50 per run, only while READY < 100 per locale), and publication of its new Hub and Supporting URLs through the Auto Publisher gates (G1–G5, G7, Live QA, ≤2 per run).

## Appendix A: the 110 `transport-mobility` candidates

Warnings are the current output of `node scripts/seo/topical-authority.mjs validate --verbose`. Reference classes as in §1.3.

| Locale | ID | Cluster | Slug | Primary query | Intent | References (host: class) | Warnings |
|---|---|---|---|---|---|---|---|
| vi | `TA-VI-0094` | `mob-urban-transit` | `tau-dien-cat-linh-ha-dong-cac-ga-loai-ve-cach-di` | tàu điện Cát Linh Hà Đông các ga và loại vé | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | none |
| vi | `TA-VI-0095` | `mob-urban-transit` | `metro-nhon-ga-ha-noi-doan-tren-cao-dang-chay` | metro Nhổn ga Hà Nội đoạn trên cao | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | none |
| vi | `TA-VI-0096` | `mob-urban-transit` | `cach-di-xe-buyt-o-ha-noi-thanh-toan-khong-tien-mat` | cách đi xe buýt ở Hà Nội cho người mới | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | none |
| vi | `TA-VI-0097` | `mob-urban-transit` | `xe-buyt-dien-vinbus-ha-noi-cac-tuyen-chinh` | xe buýt điện VinBus Hà Nội các tuyến | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| vi | `TA-VI-0098` | `mob-last-mile` | `tu-san-bay-noi-bai-ve-pho-co-bang-xe-buyt` | từ sân bay Nội Bài về phố cổ bằng xe buýt | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| vi | `TA-VI-0099` | `mob-intercity` | `ben-xe-khach-duong-dai-o-ha-noi-ben-nao-di-huong-nao` | các bến xe khách đường dài ở Hà Nội | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | none |
| vi | `TA-VI-0100` | `mob-intercity` | `di-tau-tu-ha-noi-len-sa-pa-tau-dem-den-lao-cai` | đi tàu từ Hà Nội lên Sapa | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | none |
| vi | `TA-VI-0101` | `mob-intercity` | `di-tau-tu-ha-noi-den-ninh-binh-thoi-gian-ga-den` | đi tàu từ Hà Nội đến Ninh Bình | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T4 0.50 vs `TA-VI-0021` |
| vi | `TA-VI-0102` | `mob-intercity` | `di-xe-khach-tu-ha-noi-den-ha-long-xe-tuyen-limousine` | đi xe khách từ Hà Nội đến Hạ Long | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| vi | `TA-VI-0103` | `mob-last-mile` | `ung-dung-goi-xe-o-ha-noi-grab-xanh-sm-be` | ứng dụng gọi xe ở Hà Nội cho khách nước ngoài | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| vi | `TA-VI-0163` | `mob-intercity` | `di-tau-hoa-o-viet-nam-quy-dinh-duong-sat-ve-giay-to-tre-em-hanh-ly` | quy định đi tàu hỏa ở Việt Nam vé điện tử giấy tờ tùy thân trẻ em hành lý | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | none |
| en | `TA-EN-0022` | `mob-urban-transit` | `hanoi-metro-line-2a-cat-linh-ha-dong` | hanoi metro line 2a cat linh ha dong | informational | hanoicapital.chinhphu.vn: G3; english.vtv.vn: MEDIA | none |
| en | `TA-EN-0023` | `mob-urban-transit` | `hanoi-metro-line-3-nhon-cau-giay` | hanoi metro line 3 nhon cau giay | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA | none |
| en | `TA-EN-0024` | `mob-urban-transit` | `how-to-take-the-bus-in-hanoi` | how to take the bus in hanoi | informational | vietnamnet.vn: MEDIA; m.hanoitimes.vn: MEDIA | none |
| en | `TA-EN-0025` | `mob-urban-transit` | `vinbus-electric-bus-routes-hanoi` | vinbus electric bus routes hanoi | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | none |
| en | `TA-EN-0026` | `mob-last-mile` | `noi-bai-airport-to-old-quarter-by-bus` | noi bai airport to old quarter by bus | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | none |
| en | `TA-EN-0027` | `mob-intercity` | `hanoi-long-distance-bus-stations` | hanoi long distance bus stations | informational | m.hanoitimes.vn: MEDIA; vinwonders.com: OTHER | none |
| en | `TA-EN-0028` | `mob-intercity` | `hanoi-to-sapa-by-train-via-lao-cai` | hanoi to sapa by train | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER | none |
| en | `TA-EN-0029` | `mob-intercity` | `hanoi-to-ninh-binh-by-train` | hanoi to ninh binh by train | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER | distinct_from `TA-EN-0021` |
| en | `TA-EN-0030` | `mob-intercity` | `hanoi-to-ha-long-by-bus` | hanoi to ha long by bus | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | none |
| en | `TA-EN-0031` | `mob-last-mile` | `ride-hailing-apps-in-hanoi` | ride hailing apps in hanoi | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | none |
| en | `TA-EN-0167` | `mob-intercity` | `vietnam-train-travel-official-rules-tickets-id-children-luggage` | Vietnam train travel rules tickets ID checks children luggage | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| de | `TA-DE-0097` | `mob-urban-transit` | `hanoi-metro-linie-2a-cat-linh-ha-dong-stationen-tickets` | Hanoi Metro Linie 2A Cat Linh Ha Dong Stationen und Tickets | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| de | `TA-DE-0098` | `mob-urban-transit` | `hanoi-metro-linie-3-nhon-cau-giay-hochbahnabschnitt` | Hanoi Metro Linie 3 Nhon Cau Giay Hochbahnabschnitt | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| de | `TA-DE-0099` | `mob-urban-transit` | `mit-dem-bus-in-hanoi-fahren-linien-bezahlung-apps` | mit dem Bus in Hanoi fahren Linien Bezahlung App | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| de | `TA-DE-0100` | `mob-urban-transit` | `elektrobusse-vinbus-hanoi-linien-und-anbindung` | Elektrobusse VinBus Hanoi Linien | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| de | `TA-DE-0101` | `mob-last-mile` | `flughafen-noi-bai-in-die-altstadt-von-hanoi-mit-dem-bus` | Flughafen Noi Bai Altstadt Hanoi mit dem Bus | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| de | `TA-DE-0102` | `mob-intercity` | `fernbusbahnhoefe-in-hanoi-welcher-bahnhof-wohin` | Fernbusbahnhöfe in Hanoi welcher Bahnhof wohin | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| de | `TA-DE-0103` | `mob-intercity` | `mit-dem-zug-von-hanoi-nach-sapa-nachtzug-lao-cai` | mit dem Zug von Hanoi nach Sapa | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| de | `TA-DE-0104` | `mob-intercity` | `mit-dem-zug-von-hanoi-nach-ninh-binh-fahrzeit-bahnhof` | mit dem Zug von Hanoi nach Ninh Binh | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; T4 0.50 vs `TA-DE-0019` |
| de | `TA-DE-0105` | `mob-intercity` | `mit-dem-bus-von-hanoi-nach-ha-long-linienbus-limousine` | mit dem Bus von Hanoi nach Ha Long | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| de | `TA-DE-0106` | `mob-last-mile` | `fahrdienst-apps-in-hanoi-grab-xanh-sm-be-vergleich` | Fahrdienst Apps Hanoi Grab Xanh SM Be Vergleich | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| de | `TA-DE-0166` | `mob-intercity` | `zugfahren-in-vietnam-regeln-fahrkarten-ausweis-kinder-gepaeck` | Zugreisen in Vietnam Regeln Fahrkarten Ausweiskontrolle Kinder Gepäck | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| fr | `TA-FR-0098` | `mob-urban-transit` | `metro-hanoi-ligne-2a-cat-linh-ha-dong-stations-billets` | métro de Hanoï ligne 2A Cat Linh Ha Dong stations et billets | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| fr | `TA-FR-0099` | `mob-urban-transit` | `metro-hanoi-ligne-3-nhon-cau-giay-troncon-aerien` | métro de Hanoï ligne 3 Nhon Cau Giay tronçon aérien | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| fr | `TA-FR-0100` | `mob-urban-transit` | `prendre-le-bus-a-hanoi-lignes-paiement-sans-especes` | prendre le bus à Hanoï lignes paiement application | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| fr | `TA-FR-0101` | `mob-urban-transit` | `bus-electriques-vinbus-hanoi-lignes-et-reseau` | bus électriques VinBus Hanoï lignes | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| fr | `TA-FR-0102` | `mob-last-mile` | `aeroport-noi-bai-vers-le-vieux-quartier-de-hanoi-en-bus` | aéroport de Noi Bai vieux quartier de Hanoï en bus | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| fr | `TA-FR-0103` | `mob-intercity` | `gares-routieres-longue-distance-hanoi-laquelle-pour-quelle-region` | gares routières longue distance de Hanoï laquelle pour quelle région | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| fr | `TA-FR-0104` | `mob-intercity` | `train-de-hanoi-a-sapa-train-de-nuit-lao-cai` | train de Hanoï à Sapa | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| fr | `TA-FR-0105` | `mob-intercity` | `train-de-hanoi-a-ninh-binh-duree-gare-tam-coc` | train de Hanoï à Ninh Binh | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; distinct_from `TA-FR-0020` |
| fr | `TA-FR-0106` | `mob-intercity` | `bus-de-hanoi-a-ha-long-car-de-ligne-et-limousine` | bus de Hanoï à Ha Long | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| fr | `TA-FR-0107` | `mob-last-mile` | `applications-vtc-hanoi-grab-xanh-sm-be-comparatif` | applications de VTC à Hanoï Grab Xanh SM Be comparatif | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| fr | `TA-FR-0167` | `mob-intercity` | `train-au-vietnam-regles-billets-identite-enfants-bagages` | voyager en train au Vietnam règles billets contrôle d'identité enfants bagages | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| es | `TA-ES-0086` | `mob-urban-transit` | `metro-hanoi-linea-2a-cat-linh-ha-dong-estaciones-billetes` | metro de Hanói línea 2A Cat Linh Ha Dong estaciones y billetes | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| es | `TA-ES-0087` | `mob-urban-transit` | `metro-hanoi-linea-3-nhon-cau-giay-tramo-elevado` | metro de Hanói línea 3 Nhon Cau Giay tramo elevado | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| es | `TA-ES-0088` | `mob-urban-transit` | `como-usar-el-autobus-en-hanoi-lineas-pago-sin-efectivo` | cómo usar el autobús en Hanói líneas pago aplicación | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| es | `TA-ES-0089` | `mob-urban-transit` | `autobuses-electricos-vinbus-hanoi-lineas-y-red` | autobuses eléctricos VinBus Hanói líneas | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| es | `TA-ES-0090` | `mob-last-mile` | `aeropuerto-noi-bai-al-casco-antiguo-de-hanoi-en-autobus` | del aeropuerto de Noi Bai al casco antiguo de Hanói en autobús | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| es | `TA-ES-0091` | `mob-intercity` | `estaciones-de-autobuses-larga-distancia-hanoi-cual-para-cada-region` | estaciones de autobuses de larga distancia de Hanói cuál para cada región | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| es | `TA-ES-0092` | `mob-intercity` | `tren-de-hanoi-a-sapa-tren-nocturno-lao-cai` | tren de Hanói a Sapa | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| es | `TA-ES-0093` | `mob-intercity` | `tren-de-hanoi-a-ninh-binh-duracion-estacion-tam-coc` | tren de Hanói a Ninh Binh | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; distinct_from `TA-ES-0019` |
| es | `TA-ES-0094` | `mob-intercity` | `autobus-de-hanoi-a-ha-long-linea-regular-y-limusina` | autobús de Hanói a Ha Long | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| es | `TA-ES-0095` | `mob-last-mile` | `aplicaciones-de-transporte-hanoi-grab-xanh-sm-be-comparativa` | aplicaciones de transporte con conductor en Hanói Grab Xanh SM Be comparativa | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| es | `TA-ES-0155` | `mob-intercity` | `tren-en-vietnam-normas-billetes-identidad-ninos-equipaje` | viajar en tren en Vietnam normas billetes control de identidad niños equipaje | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| nl | `TA-NL-0095` | `mob-urban-transit` | `metrolijn-2a-hanoi-cat-linh-ha-dong-stations-tickets` | metrolijn 2A Hanoi Cat Linh Ha Dong stations en tickets | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| nl | `TA-NL-0096` | `mob-urban-transit` | `metrolijn-3-hanoi-nhon-cau-giay-bovengronds-traject` | metrolijn 3 Hanoi Nhon Cau Giay bovengronds traject | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| nl | `TA-NL-0097` | `mob-urban-transit` | `met-de-bus-in-hanoi-lijnen-betalen-zonder-contant-geld` | met de bus in Hanoi lijnen betalen app | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| nl | `TA-NL-0098` | `mob-urban-transit` | `elektrische-bussen-vinbus-hanoi-lijnen-en-netwerk` | elektrische bussen VinBus Hanoi lijnen | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| nl | `TA-NL-0099` | `mob-last-mile` | `van-vliegveld-noi-bai-naar-de-oude-wijk-van-hanoi-met-de-bus` | van vliegveld Noi Bai naar de oude wijk van Hanoi met de bus | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| nl | `TA-NL-0100` | `mob-intercity` | `busstations-langeafstandsbussen-hanoi-welk-station-voor-welke-regio` | busstations voor langeafstandsbussen in Hanoi welk station voor welke regio | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| nl | `TA-NL-0101` | `mob-intercity` | `met-de-trein-van-hanoi-naar-sapa-nachttrein-lao-cai` | met de trein van Hanoi naar Sapa | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| nl | `TA-NL-0102` | `mob-intercity` | `met-de-trein-van-hanoi-naar-ninh-binh-reistijd-station` | met de trein van Hanoi naar Ninh Binh | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; distinct_from `TA-NL-0019` |
| nl | `TA-NL-0103` | `mob-intercity` | `met-de-bus-van-hanoi-naar-ha-long-lijnbus-en-limousinebus` | met de bus van Hanoi naar Ha Long | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| nl | `TA-NL-0104` | `mob-last-mile` | `taxi-apps-in-hanoi-grab-xanh-sm-be-vergelijking` | taxi-apps in Hanoi Grab Xanh SM Be vergelijking | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| nl | `TA-NL-0164` | `mob-intercity` | `trein-in-vietnam-regels-tickets-identiteit-kinderen-bagage` | treinreizen in Vietnam regels tickets identiteitscontrole kinderen bagage | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| zh | `TA-ZH-0095` | `mob-urban-transit` | `hanoi-ditie-2a-xian-jiling-hedong-zhandian-piaowu` | 河内地铁2A线吉灵河东站点和票务 | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| zh | `TA-ZH-0096` | `mob-urban-transit` | `hanoi-ditie-3-hao-xian-gaojia-duan-nhon-cau-giay` | 河内地铁3号线高架段 Nhon Cau Giay | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| zh | `TA-ZH-0097` | `mob-urban-transit` | `hanoi-gongjiao-zenme-zuo-xianlu-zhifu-yingyong` | 河内公交乘坐方法和支付方式 | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| zh | `TA-ZH-0098` | `mob-urban-transit` | `hanoi-vinbus-diandong-gongjiao-xianlu` | 河内 VinBus 电动公交线路 | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| zh | `TA-ZH-0099` | `mob-last-mile` | `neipai-jichang-zuo-gongjiao-dao-hanoi-laocheng` | 从内排机场坐公交去河内老城区 | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| zh | `TA-ZH-0100` | `mob-intercity` | `hanoi-changtu-qichezhan-nage-zhan-qu-nali` | 河内长途汽车站有哪些哪个站去哪个方向 | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| zh | `TA-ZH-0101` | `mob-intercity` | `hanoi-dao-shaba-zuo-huoche-yexing-laojie` | 河内到沙巴坐火车 | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| zh | `TA-ZH-0102` | `mob-intercity` | `hanoi-dao-ningping-zuo-huoche-shijian-chezhan` | 河内到宁平坐火车 | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; distinct_from `TA-ZH-0020` |
| zh | `TA-ZH-0103` | `mob-intercity` | `hanoi-dao-xialong-zuo-daba-banche-xiaoba` | 河内到下龙坐大巴 | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| zh | `TA-ZH-0104` | `mob-last-mile` | `hanoi-dache-ruanjian-grab-xanh-sm-be-duibi` | 河内打车软件 Grab Xanh SM Be 对比 | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| zh | `TA-ZH-0164` | `mob-intercity` | `yuenan-huoche-guiding-chepiao-zhengjian-ertong-xingli` | 越南 火车 乘车规定 车票 身份证件 儿童 行李 | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| pt | `TA-PT-0095` | `mob-urban-transit` | `metro-hanoi-linha-2a-cat-linh-ha-dong-estacoes-bilhetes` | metro de Hanói linha 2A Cat Linh Ha Dong estações e bilhetes | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| pt | `TA-PT-0096` | `mob-urban-transit` | `metro-hanoi-linha-3-nhon-cau-giay-troco-elevado` | metro de Hanói linha 3 Nhon Cau Giay troço elevado | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| pt | `TA-PT-0097` | `mob-urban-transit` | `como-andar-de-autocarro-em-hanoi-linhas-pagamento-sem-dinheiro` | como andar de autocarro em Hanói linhas pagamento aplicação | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| pt | `TA-PT-0098` | `mob-urban-transit` | `autocarros-eletricos-vinbus-hanoi-linhas-e-rede` | autocarros elétricos VinBus Hanói linhas | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| pt | `TA-PT-0099` | `mob-last-mile` | `aeroporto-noi-bai-ao-bairro-antigo-de-hanoi-de-autocarro` | do aeroporto de Noi Bai ao bairro antigo de Hanói de autocarro | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| pt | `TA-PT-0100` | `mob-intercity` | `estacoes-de-autocarros-longa-distancia-hanoi-qual-serve-cada-regiao` | estações de autocarros de longa distância de Hanói qual serve cada região | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| pt | `TA-PT-0101` | `mob-intercity` | `comboio-de-hanoi-para-sapa-comboio-noturno-lao-cai` | comboio de Hanói para Sapa | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| pt | `TA-PT-0102` | `mob-intercity` | `comboio-de-hanoi-para-ninh-binh-duracao-estacao-tam-coc` | comboio de Hanói para Ninh Binh | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; distinct_from `TA-PT-0019` |
| pt | `TA-PT-0103` | `mob-intercity` | `autocarro-de-hanoi-para-ha-long-linha-regular-e-limusina` | autocarro de Hanói para Ha Long | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| pt | `TA-PT-0104` | `mob-last-mile` | `aplicacoes-de-transporte-hanoi-grab-xanh-sm-be-comparacao` | aplicações de transporte privado em Hanói Grab Xanh SM Be comparação | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| pt | `TA-PT-0164` | `mob-intercity` | `comboio-no-vietname-regras-bilhetes-identificacao-criancas-bagagem` | viajar de comboio no Vietname regras bilhetes controlo de identidade crianças bagagem | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| ko | `TA-KO-0094` | `mob-urban-transit` | `hanoi-jihacheol-2a-hoseon-yeok-tiket-iyongbeop` | 하노이 지하철 2A호선 깟린 하동 역과 티켓 | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| ko | `TA-KO-0095` | `mob-urban-transit` | `hanoi-jihacheol-3-hoseon-gogagugan-nhon-cau-giay` | 하노이 지하철 3호선 고가 구간 Nhon Cau Giay | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| ko | `TA-KO-0096` | `mob-urban-transit` | `hanoi-sinaebeoseu-taneun-beop-noseon-gyeolje` | 하노이 시내버스 타는 법 노선 결제 앱 | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| ko | `TA-KO-0097` | `mob-urban-transit` | `hanoi-binbeoseu-jeongibeoseu-noseon` | 하노이 빈버스 전기버스 노선 | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| ko | `TA-KO-0098` | `mob-last-mile` | `noibai-gonghang-hanoi-gusigaji-beoseu` | 노이바이 공항에서 하노이 구시가지 버스 | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| ko | `TA-KO-0099` | `mob-intercity` | `hanoi-jangeori-beoseuteominal-eoneu-teominal` | 하노이 장거리 버스터미널 어느 터미널이 어디로 가나 | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| ko | `TA-KO-0100` | `mob-intercity` | `hanoi-sapa-gicha-taneun-beop-yahaengyeolcha` | 하노이에서 사파 기차 타는 법 | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| ko | `TA-KO-0101` | `mob-intercity` | `hanoi-ninbin-gicha-taneun-beop-sososhigan` | 하노이에서 닌빈 기차 타는 법 | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; T4 0.60 vs `TA-KO-0100`; distinct_from `TA-KO-0019` |
| ko | `TA-KO-0102` | `mob-intercity` | `hanoi-halong-beoseu-taneun-beop-limujin-baen` | 하노이에서 하롱 버스 타는 법 | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| ko | `TA-KO-0103` | `mob-last-mile` | `hanoi-taeksi-aep-grab-xanh-sm-be-bigyo` | 하노이 택시 앱 Grab Xanh SM Be 비교 | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| ko | `TA-KO-0163` | `mob-intercity` | `beteunam-gicha-gyujeong-seungchagwon-sinbun-eorini-sumulpum` | 베트남 기차 이용 규정 승차권 신분 확인 어린이 수하물 | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |
| ja | `TA-JA-0094` | `mob-urban-transit` | `hanoi-metro-2a-gosen-eki-chiketto-noribakata` | ハノイ メトロ 2A号線 駅とチケットの買い方 | informational | hanoicapital.chinhphu.vn: G3; metrohanoi.vn: PRIMARY; vinwonders.com: OTHER | T8 |
| ja | `TA-JA-0095` | `mob-urban-transit` | `hanoi-metro-3-gosen-kokaku-kukan-nhon-cau-giay` | ハノイ メトロ 3号線 高架区間 Nhon Cau Giay | informational | en.vneconomy.vn: MEDIA; eib.org: PRIMARY; news.tuoitre.vn: MEDIA; metrohanoi.vn: PRIMARY | T8 |
| ja | `TA-JA-0096` | `mob-urban-transit` | `hanoi-rosen-basu-noribakata-shiharai-apuri` | ハノイ 路線バス 乗り方 支払い アプリ | informational | vietnamnet.vn: MEDIA; transerco.com.vn: PRIMARY | T8 |
| ja | `TA-JA-0097` | `mob-urban-transit` | `hanoi-binbasu-denki-basu-rosen` | ハノイ ビンバス 電気バス 路線 | informational | vietnamnews.vn: MEDIA; hanoitimes.vn: MEDIA; en.qdnd.vn: MEDIA | T8 |
| ja | `TA-JA-0098` | `mob-last-mile` | `noibai-kuko-kyutaun-basu-de-iku` | ノイバイ空港から旧市街 バスで行く方法 | informational | vietnamairlines.com: PRIMARY; vietnamnews.vn: MEDIA; bizhub.vietnamnews.vn: MEDIA | T8 |
| ja | `TA-JA-0099` | `mob-intercity` | `hanoi-chokyori-basu-taminaru-dokoyuki` | ハノイ 長距離バスターミナル どのターミナルがどこ行き | informational | vinwonders.com: OTHER; vietnamnet.vn: MEDIA | T8 |
| ja | `TA-JA-0100` | `mob-intercity` | `hanoi-kara-sapa-densha-yako-ressha-laocai` | ハノイからサパへ電車で行く方法 | informational | vinwonders.com: OTHER; legendtravelgroup.com: OTHER; giotaugiave.dsvn.vn: PRIMARY; vetau.com.vn: PRIMARY | T8 |
| ja | `TA-JA-0101` | `mob-intercity` | `hanoi-kara-ninbin-densha-shoyo-jikan-eki` | ハノイからニンビンへ電車で行く方法 | informational | kimkim.com: OTHER; sanhotelseries.com: OTHER; geckoroutes.com: OTHER; vetau.com.vn: PRIMARY | T8; T4 0.50 vs `TA-JA-0100`; distinct_from `TA-JA-0019` |
| ja | `TA-JA-0102` | `mob-intercity` | `hanoi-kara-harong-basu-rosen-rimujin-ban` | ハノイからハロンへバスで行く方法 | informational | vietnamtourism.com: OTHER; north-vietnam.com: OTHER; vinpearl.com: OTHER | T8 |
| ja | `TA-JA-0103` | `mob-last-mile` | `hanoi-haisha-apuri-grab-xanh-sm-be-hikaku` | ハノイ 配車アプリ Grab Xanh SM Be 比較 | informational | vietcetera.com: MEDIA; b-company.jp: OTHER; expatfocus.com: OTHER | T8 |
| ja | `TA-JA-0163` | `mob-intercity` | `betonamu-ressha-ruru-joshaken-honnin-kakunin-kodomo-nimotsu` | ベトナム 列車 利用 ルール 乗車券 本人確認 子ども 荷物 | informational | dsvn.vn: PRIMARY ×2; vr.com.vn: PRIMARY; thuvienphapluat.vn: G3 | T8 |

## Appendix B: how the numbers were produced

Read-only Node over the files at `5e5594aad076`: `data/seo/topical-authority/<locale>.json` (proposals with `status: ARCHITECTURE_BLOCKED`), `references.json` (reference keys → URL, locale tag, `checked_on`), `architecture.json`, `data/seo/master-matrix.json`, `data/seo/url-freeze.json`, `data/seo/topic-factory/policy.json`, and `validateTopicalMap()` from `scripts/seo/topical-authority-core.mjs` for the warnings. Topic groups pair each locale candidate with the EN candidate that shares the most reference keys. Cross-Hub overlaps not flagged by T4 come from a keyword scan of Matrix rows and candidates; their lexical scores use `similarity()` from the same module.
