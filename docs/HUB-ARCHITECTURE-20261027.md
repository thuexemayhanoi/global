# Hub architecture: six new Hubs in all 10 locales (2026-10-27)

**Status:** implemented. This is the owner decision that `docs/HUB-ARCHITECTURE-DECISION-20261025.md` (branch of PR #72) asked for, recorded verbatim in `approvals/hub-architecture-20261027.json`. It supersedes PR #72, whose EN-only transport proposal is folded into the `transport-mobility` Hub below.

## Decision

The owner authorized the six research-open domains as real Hubs in all 10 locales, on these conditions:
- every Hub meets the content, source, architecture and SEO criteria;
- no empty or thin category;
- the four live Hubs are kept;
- research and Supporting guides come before a Hub is published.

| Decision box (2026-10-25 doc) | Resolution |
|---|---|
| G1 Which Hubs, in which order | All six. Matrix IDs and priority: H05 `routes-trips` (18), H06 `transport-mobility` (20), H07 `destinations-experiences` (22), H08 `travel-planning` (24), H09 `travel-guides` (26), H10 `electric-mobility` (28). |
| G2 Rollout scope | All 10 locales together, for every Hub. |
| G3 Navigation contract | The 4 original Hubs keep their fixed menu groups, labels, footer columns and homepage cards. A later Hub appears only once PUBLISHED, as a link in a "More topics" group (header and footer). The Pillar links every published Hub. Until then the generated HTML is byte-identical. |
| G4 Promotion of Supporting candidates | Standing-policy Topic Factory refill, extended: every Hub with fewer than `refill.hub_min_supporting` (3) Supporting rows is topped up first, even when READY is healthy (≤50 per run). The first 3 topics per Hub and locale carry priority 40, so Writers claim them right after the Hub. No personal owner manifest was written. |
| G5 hreflang between new Hub pages | No. They are distinct native articles, consistent with the live Hubs and the frozen-fingerprint rule. |
| G6 "four topics" copy | Unchanged. The root gallery keeps the 4 original topics; no frozen heading changes. |
| Sensitivity | `routes-trips` SAFETY; `travel-planning` and `electric-mobility` LEGAL (at least one dated official source per draft); the other three STANDARD. Price and official-evidence gates apply to all. |

## No empty category

1. Hub rows are unpublished IDEA rows. They appear in no sitemap, menu, search shard or link, and an IDEA Hub renders nothing.
2. The Writer pool claims HUB rows before Supporting rows (unchanged `sortRows`), then the priority-40 first topics of each new Hub.
3. The Auto Publisher holds a Hub with fewer than 3 published-or-ready Supporting guides. "Ready" means the draft passes every gate except the unpublished parent. The Hub stays WAIT_PARENT with gate `G2_HUB_SUPPORT_READY` (`requireHubSupport` in `scripts/auto-publisher-core.mjs`). When the Hub goes live, its first Supporting guides follow in the next runs, and the Hub page lists them under "Guides in this topic" with native sub-cluster labels.

## URLs

| Hub | ID | vi | en | de | fr | es | nl | zh | pt | ko | ja |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `routes-trips` | `XX-H05` | `/vi/topics/cung-duong-tu-ha-noi/` | `/en/topics/road-trips-from-hanoi/` | `/de/topics/motorradtouren-ab-hanoi/` | `/fr/topics/itineraires-moto-depuis-hanoi/` | `/es/topics/rutas-en-moto-desde-hanoi/` | `/nl/topics/motorroutes-vanuit-hanoi/` | `/zh/topics/hanoi-qixing-luxian/` | `/pt/topics/roteiros-de-moto-desde-hanoi/` | `/ko/topics/hanoi-chulbal-ohtobai-yeohaeng/` | `/ja/topics/hanoi-hatsu-touring/` |
| `transport-mobility` | `XX-H06` | `/vi/topics/di-lai-o-ha-noi/` | `/en/topics/getting-around-hanoi/` | `/de/topics/unterwegs-in-hanoi/` | `/fr/topics/se-deplacer-a-hanoi/` | `/es/topics/moverse-por-hanoi/` | `/nl/topics/vervoer-in-hanoi/` | `/zh/topics/hanoi-chuxing-jiaotong/` | `/pt/topics/deslocar-se-em-hanoi/` | `/ko/topics/hanoi-gyotong-idong/` | `/ja/topics/hanoi-no-idou/` |
| `destinations-experiences` | `XX-H07` | `/vi/topics/diem-den-trai-nghiem/` | `/en/topics/destinations-and-experiences/` | `/de/topics/reiseziele-und-erlebnisse/` | `/fr/topics/destinations-et-experiences/` | `/es/topics/destinos-y-experiencias/` | `/nl/topics/bestemmingen-en-belevenissen/` | `/zh/topics/mudidi-tiyan/` | `/pt/topics/destinos-e-experiencias/` | `/ko/topics/yeohaengji-cheheom/` | `/ja/topics/mokutekichi-taiken/` |
| `travel-planning` | `XX-H08` | `/vi/topics/len-ke-hoach-chuyen-di/` | `/en/topics/trip-planning-and-budget/` | `/de/topics/reiseplanung-und-budget/` | `/fr/topics/preparer-son-voyage/` | `/es/topics/planificar-el-viaje/` | `/nl/topics/reis-plannen/` | `/zh/topics/xingcheng-guihua/` | `/pt/topics/planear-a-viagem/` | `/ko/topics/yeohaeng-gyehoek/` | `/ja/topics/ryokou-keikaku/` |
| `travel-guides` | `XX-H09` | `/vi/topics/cam-nang-ha-noi/` | `/en/topics/hanoi-travel-guide/` | `/de/topics/hanoi-reisefuehrer/` | `/fr/topics/guide-de-hanoi/` | `/es/topics/guia-de-hanoi/` | `/nl/topics/reisgids-hanoi/` | `/zh/topics/hanoi-lvyou-zhinan/` | `/pt/topics/guia-de-hanoi/` | `/ko/topics/hanoi-yeohaeng-gaideu/` | `/ja/topics/hanoi-ryokou-guide/` |
| `electric-mobility` | `XX-H10` | `/vi/topics/xe-may-dien/` | `/en/topics/electric-motorbikes/` | `/de/topics/elektroroller-und-e-mobilitaet/` | `/fr/topics/mobilite-electrique/` | `/es/topics/motos-electricas/` | `/nl/topics/elektrische-scooters/` | `/zh/topics/diandong-motuoche/` | `/pt/topics/motas-eletricas/` | `/ko/topics/jeongi-ohtobai/` | `/ja/topics/denki-bike/` |

| ID | Title (working_title) |
|---|---|
| VI-H05 | Cung đường đi xe máy từ Hà Nội: vòng phía Bắc và chuyến đi trong ngày |
| EN-H05 | Road Trips from Hanoi: Northern Loops and Day Rides |
| DE-H05 | Motorradtouren ab Hanoi: Rundtouren im Norden und Tagesausflüge |
| FR-H05 | Itinéraires à moto depuis Hanoï : boucles du Nord et sorties d'une journée |
| ES-H05 | Rutas en moto desde Hanói: circuitos del norte y escapadas de un día |
| NL-H05 | Motorroutes vanuit Hanoi: rondritten in het noorden en dagtochten |
| ZH-H05 | 从河内出发的摩托车骑行路线：北部环线与一日游 |
| PT-H05 | Roteiros de mota a partir de Hanói: circuitos do norte e passeios de um dia |
| KO-H05 | 하노이 출발 오토바이 여행 코스: 북부 루프와 당일치기 |
| JA-H05 | ハノイ発バイクツーリング：北部周遊ルートと日帰りコース |
| VI-H06 | Đi lại ở Hà Nội và liên tỉnh: xe buýt, metro, tàu hỏa và đưa đón sân bay |
| EN-H06 | Getting Around Hanoi and Vietnam: Transit, Trains and Transfers |
| DE-H06 | Unterwegs in Hanoi und Vietnam: Nahverkehr, Bahn und Transfers |
| FR-H06 | Se déplacer à Hanoï et au Vietnam : transports en commun, trains et transferts |
| ES-H06 | Cómo moverse por Hanói y Vietnam: transporte público, trenes y traslados |
| NL-H06 | Vervoer in Hanoi en Vietnam: openbaar vervoer, trein en transfers |
| ZH-H06 | 河内与越南出行指南：公共交通、火车与接驳 |
| PT-H06 | Como se deslocar em Hanói e no Vietname: transportes públicos, comboios e transferes |
| KO-H06 | 하노이와 베트남 교통 이동 가이드: 대중교통, 기차, 공항 이동 |
| JA-H06 | ハノイとベトナムの移動ガイド：公共交通・鉄道・空港アクセス |
| VI-H07 | Điểm đến và trải nghiệm quanh Hà Nội và miền Bắc |
| EN-H07 | Destinations and Local Experiences in Northern Vietnam |
| DE-H07 | Reiseziele und Erlebnisse rund um Hanoi und in Nordvietnam |
| FR-H07 | Destinations et expériences autour de Hanoï et dans le nord du Vietnam |
| ES-H07 | Destinos y experiencias cerca de Hanói y en el norte de Vietnam |
| NL-H07 | Bestemmingen en belevenissen rond Hanoi en in Noord-Vietnam |
| ZH-H07 | 河内周边与越南北部的目的地和当地体验 |
| PT-H07 | Destinos e experiências perto de Hanói e no norte do Vietname |
| KO-H07 | 하노이 근교와 베트남 북부 여행지와 현지 체험 |
| JA-H07 | ハノイ近郊とベトナム北部の見どころと体験 |
| VI-H08 | Lên kế hoạch chuyến đi: lịch trình, chi phí và giấy tờ cần chuẩn bị |
| EN-H08 | Planning a Vietnam Trip: Itineraries, Budget and Logistics |
| DE-H08 | Vietnamreise planen: Route, Budget und Organisation |
| FR-H08 | Préparer un voyage au Vietnam : itinéraire, budget et formalités |
| ES-H08 | Planificar un viaje a Vietnam: itinerario, presupuesto y trámites |
| NL-H08 | Een reis naar Vietnam plannen: route, budget en praktische zaken |
| ZH-H08 | 越南旅行规划：行程、预算与出行准备 |
| PT-H08 | Planear uma viagem ao Vietname: roteiro, orçamento e formalidades |
| KO-H08 | 베트남 여행 계획: 일정, 예산, 준비와 절차 |
| JA-H08 | ベトナム旅行の計画：日程・予算・準備 |
| VI-H09 | Cẩm nang du lịch Hà Nội: khu phố, mùa đi và phép lịch sự |
| EN-H09 | Hanoi Travel Guide: Neighbourhoods, Seasons and Etiquette |
| DE-H09 | Hanoi-Reiseführer: Stadtviertel, Reisezeit und Umgangsformen |
| FR-H09 | Guide de Hanoï : quartiers, saisons et savoir-vivre |
| ES-H09 | Guía de Hanói: barrios, mejor época y costumbres |
| NL-H09 | Reisgids Hanoi: wijken, beste reistijd en omgangsvormen |
| ZH-H09 | 河内旅游指南：街区、旅行季节与当地礼仪 |
| PT-H09 | Guia de Hanói: bairros, melhor época e costumes locais |
| KO-H09 | 하노이 여행 가이드: 동네, 여행 시기, 현지 예절 |
| JA-H09 | ハノイ旅行ガイド：エリア・ベストシーズン・マナー |
| VI-H10 | Xe máy điện ở Việt Nam: chọn xe, sạc pin và đi lại xanh |
| EN-H10 | Electric Motorbikes in Vietnam: Choosing, Charging and Greener Travel |
| DE-H10 | Elektroroller in Vietnam: Auswahl, Laden und nachhaltig unterwegs |
| FR-H10 | Scooters et motos électriques au Vietnam : choisir, recharger, voyager autrement |
| ES-H10 | Motos eléctricas en Vietnam: elegir, cargar y moverse de forma sostenible |
| NL-H10 | Elektrische scooters in Vietnam: kiezen, opladen en duurzaam reizen |
| ZH-H10 | 越南电动摩托车：选车、充电与绿色出行 |
| PT-H10 | Motas elétricas no Vietname: escolher, carregar e viajar de forma sustentável |
| KO-H10 | 베트남 전기 오토바이: 차량 선택, 충전, 친환경 이동 |
| JA-H10 | ベトナムの電動バイク：選び方・充電・環境にやさしい移動 |

## Topical map changes

- `architecture.json`: the six `proposed_hubs` moved into `hubs`, each with `activated_on` and `approval`, and `hub_journey` gained a stage for each. `proposed_hubs` is now empty.
- `data/seo/topic-factory/policy.json`: the six domains are now `ACTIVE`, with the sensitivity classes above and `refill.hub_min_supporting: 3`.
- The 690 ARCHITECTURE_BLOCKED candidates (69 per locale) were updated:
  - 669 became PROPOSED under their locale's new Hub.
  - 21 became **WITHDRAWN**. This status is new: the record stays as research evidence, is never promoted and is excluded from overlap checks. It requires `withdrawn_on` and a ≥40-char reason.
- Withdrawn, because a live Hub already owns the intent:
  - the "do electric motorbikes need a licence" family (`TA-EN-0147` and its 9 locale counterparts), owned by the published 50 cc versus electric guides and the licence guides;
  - the "October 2026 battery and motor standards" family (`TA-EN-0148` and its 9 locale counterparts), owned by vehicle-choice / vc-power;
  - `TA-DE-0150` (July 2027 emissions testing), which duplicates the German row `DE-S299`.
- `distinct_from` was added in the native language for the boundary pairs of the 2026-10-25 decision document:
  - Ninh Binh by train vs by motorbike (vi, de);
  - what to wear in winter vs riding in winter (fr, es, ko);
  - the Hoan Kiem walking street vs riding to Hoan Kiem at weekends (es, nl, pt, ko, ja).
  - 23 T4 overlap warnings remain (0.50–0.60, the gate fails at 0.66). They are all pairs inside one Hub or between a Hub and its own topics.
- Native `cluster_labels` were added for the 15 new sub-clusters in all 10 locales, plus the existing `rt-*` ones.
- `factory/external-writers/assignments.json` has 60 Hub entries. `data/seo/content-graph.json` and `docs/GLOBAL-SITE-MATRIX.md` were regenerated.

## Writing a new Hub page (Topic Pillar)

A Hub draft is a native overview of its domain for this locale, not a list of links:
- what the topic covers, organised by its sub-clusters;
- the decisions a traveller faces;
- the official or primary sources that matter;
- links to the Pillar or checklist, and to relevant guides that are already PUBLISHED.

It must pass the same Writer QA and publisher gates as any article: at least 900 words, at least 4 H2, sources with real `checked_on` dates, no NAP or business prices, no unpublished link targets. SAFETY and LEGAL Hubs must cite a dated official source inline. Supporting guides published later are listed on the Hub page automatically.

## Verification (this PR)

- `node --test tests/*.test.mjs` (316 pass). Tests were updated for the new state:
  - all eight domains are ACTIVE;
  - the research-only path is now exercised by simulating a pending domain;
  - menus apply to the four original Hubs;
  - the refill bootstrap is covered;
  - the WITHDRAWN status is covered.
- Gates that pass: `build --check` (no HTML change), `nav-qa`, `seo-guard`, `fact-guard`, `validate-plan`, `topical-authority validate` (0 issues), `content-graph --check`, `topic-factory validate-batches`, `language-audit --fail`, `writer-lanes verify-all`.
- `scripts/bench/full-build-scale.mjs --articles 300` passes. It marks every Hub PUBLISHED, which exercises the "More topics" group and the Pillar links.
