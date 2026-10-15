# Repository contract · thuexemayhanoi/global

## CURRENT PRODUCTION WORKFLOW — AUTHORITATIVE CONTRACT

Effective 2026-10-15 (owner standing policy `approvals/standing-policy-20261015.json` and the owner's instructions of 2026-10-15). This section is the single source of truth for how content is written, checked and published on /global. If anything later in this file, in an older runbook or in a Writer prompt conflicts with it, **this section wins**; the later sections stay binding for the protections they describe. Operational runbook for every AI Writer: `docs/CURRENT-WORKFLOW.md`.

### Pipeline

```
Topic Factory → Shared Topic Queue → W1/W2/W3 → Writer QA ─┬─ FAIL before submission → same Writer fixes the draft in place
                                                           └─ PASS → SUBMITTED (immutable SHA) → Automated QA (G1–G5, G7)
      Automated QA ─┬─ fixable FAIL → Repair Queue → same Writer session writes rN → Writer QA → Automated QA again
                    ├─ LEGAL / SAFETY / PRICE / money → HUMAN_REVIEW_REQUIRED (never auto-published)
                    └─ PASS → Publish Queue → Publish 2 → deploy → Live QA PASS → next 2 → repeat
```

1. **Topic Factory** (`docs/TOPIC-FACTORY.md`) promotes gate-clean researched candidates to Matrix IDEA rows under the standing policy (≤50 per run). IDEA rows are the shared topic queue. Never invent search volume, rankings or sources.
2. **W1/W2/W3** are three independent seats for external AI sessions (Claude, ChatGPT, Gemini or any agent with repository access and quota). Any active session with a valid request file on its own `writer/wN-*` branch may hold a free slot. Each slot holds at most **10 unfinished claims**; slots work concurrently and never receive the same ID (claims are serialized on `main` by the Writer Autopilot with compare-and-swap).
3. **Writer QA** (`writer-qa.yml`, Node.js only) checks every new draft. A draft that fails **before submission** is fixed in place by the same session and re-checked; no revision file is involved. A green push lets the **Writer Autopilot** mark the verified drafts SUBMITTED with their exact source commit and SHA-256 (immutable from then on) and refill the slot.
4. **Automated QA decides eligibility** (`scripts/auto-publisher-core.mjs`, gates G1–G5 + G7). There is **no AI Reviewer**: no independent AI evaluator, judge or G6 gate exists, and none may be added.
5. **Repair Queue**: a fixable QA FAIL (G1_DRAFT_QA, G1_DEPTH, G3_OFFICIAL_EVIDENCE, G4_EDITORIAL, G5_CONTENT_DUPLICATES) creates a repair ticket bound to the draft's exact SHA, Writer and session. Only that session writes the next revision `factory/external-writers/inbox/<W>/revisions/<ID>.rN.json`; the SUBMITTED file is never edited. At most **3 accepted revisions** (r2–r4), then ESCALATED. A repair never skips G3/G5: every revision is re-checked by all gates.
6. **Publish Queue**: APPROVED_BY_POLICY drafts. The **Auto Publisher** (`auto-publisher.yml`) publishes at most **2 NEW URLs per run** (stage caps PILOT 2/locale → RAMP 10 → CONTINUOUS), runs every build, SEO and fact gate, deploys, and starts the next pair only after **Live QA PASS**. A failing draft never blocks other eligible drafts.
7. **Live QA verdicts**: PASS → record, then dispatch the next pair. FAIL (production serves something wrong) → revert the publish commit and PAUSE. INCONCLUSIVE (the QA tool or the network could not decide) → PAUSE without rollback; an unverified publication is re-checked before anything new is staged. A pause is lifted only by a confirmed `resume` dispatch with a reason. **Nothing auto-resumes.**

### Mandatory rules

- **GitHub Actions is not an AI Writer.** No model API, SDK, key, endpoint, self-hosted or open-source model, and no prose generation in Actions (`tests/no-ai-api.test.mjs`). Text is written or repaired only by an ACTIVE external Writer session; when no session is active, nothing gets written or repaired. Never claim that the system writes 24/7.
- Never fake human review, SERP validation, verified sources, approvals, live results or completion. Policy publications keep `facts_reviewed_by_human:false` and `serp_intent_checked:false`, carry a `publication` record and render the AI-provenance note.
- LEGAL / SAFETY / PRICE topics, money amounts and uncited hard legal claims stay HUMAN_REVIEW_REQUIRED; a Writer may not "repair" them into a pass and a pass may not be forced.
- Writers never publish, never edit `main`, never touch another Writer's files or claims, and never take a slot held by another session. A PAUSED_QUOTA/OFFLINE slot is handed over only through a confirmed `writer-pool.yml` handover (undrafted claims only); SUBMITTED drafts are never transferred, so their repairs wait for the same session.
- Protections stay in force: CNAME, every PUBLISHED and frozen URL (`data/seo/url-freeze.json`), canonical/hreflang/sitemap generation, NAP, prices and business schema (`data/business/`), protected drafts, rollback, compare-and-swap pushes and **no force-push**.
- Supporting publication needs a PUBLISHED parent Hub (WAIT_PARENT otherwise; that is not a text problem).

### Two publication paths

| Path | Status | Who | Gate |
|---|---|---|---|
| Standing-policy Auto Publisher | **CURRENT** | `auto-publisher.yml` on `main` | G1–G5 + G7, build/SEO/fact gates, Live QA, ≤2 per run |
| Manual Publisher (`scripts/seo/publish-batch.mjs`) | MANUAL PATH | owner, reviewed feature branch + PR | exact owner approval manifest |

### Superseded instructions (LEGACY — do not follow)

Older text below or in older docs that conflicts with this contract is LEGACY:
- "No auto-publishing / no automatic article publication / publication remains owner-manifest gated" → superseded by the standing-policy Auto Publisher. Unreviewed **mass** publishing stays forbidden (≤2 per run, every gate, live QA).
- "Every article needs an owner approval manifest" → only the MANUAL PATH needs one.
- "Independent AI Reviewer / G6 / per-hash review in `factory/editorial-reviews/`" → retired 2026-10-15; historical only.
- "120 IDEA rows" and "25 URLs" → counts of 2026-10-14. The Matrix grows by promotion and publication; tests derive counts (120-row floor).
- Branch- and PR-specific instructions (premium master work branch, Ultra branch, PR #6, PR #17's first ES-H01/KO-H01 pair) apply only to those historical branches and PRs.

---

## Base rules

- This repository alone serves `https://global.rentbikehanoi.com/` through GitHub Pages.
- Preserve the `CNAME` content exactly: `global.rentbikehanoi.com`.
- Do not touch `thuexemayhanoi/lab`, `/german`, WordPress, domains or DNS.
- Homepage language switcher uses real URL paths. Do not replace with JS-only translation.
- `content/locales.json` is canonical for the initial locale pages. Regenerate with `node scripts/build.mjs` and confirm `node scripts/build.mjs --check`.
- Maintain self-canonical, correct `lang`, equivalent-only hreflang, descriptive metadata, schema, breadcrumbs and sitemap coverage.
- No invented prices, local premises, reviews, licence rules, or statements of service availability.
- No unreviewed mass auto-publishing: the only automatic path is the gated Auto Publisher in the contract above (≤2 NEW URLs per run).
- Do not remove or rename a live URL without a redirect/SEO plan.

## Phase 2 matrix rules

- Read `docs/MULTILINGUAL-SEO-MATRIX.md`, `data/seo/taxonomy.json`, and `data/seo/master-matrix.json` before any topic expansion.
- `IDEA` is merely a keyword hypothesis. Do not render it as a page or reference it in a sitemap/navigation/hreflang.
- Run `node scripts/seo/validate-plan.mjs` after changes to the matrix or deployment files; run `node scripts/seo/writer-queue.mjs --locale de --count 2` for a **read-only** research queue.
- Never silently publish proposed topics. (LEGACY: "first publish pilots must be separately approved before a recurring writer" — the Auto Publisher's PILOT stage now implements the pilot.)

## Full Menu & Footer (approved)

- `scripts/navigation.mjs` is the single source of rendered site-wide menus and footers; `data/seo/master-matrix.json` is the taxonomy source.
- All 4 parent Hub labels and 8 child topic labels per locale are displayed, but IDEA rows must NOT be clickable or placed in sitemap/hreflang. Category names stay labels until their pages are PUBLISHED.
- After adding published content or changing Matrix, run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node scripts/nav-qa.mjs`.
- Preserve CNAME and every PUBLISHED URL (25 on 2026-10-14; the set grows only through the publication gates); do not overwrite unrelated repositories.

## Five-weapon governance

- Run `node scripts/seo/engine.mjs --locale de --count 2` for Audit→Matrix→QA→Report. It must only write gitignored reports, never site content or production settings.
- Never infer actual rankings, Google indexation, backlinks, AI citations or search volume from static audit outputs.
- Writers are external AI sessions; this repository has no AI API connection. Publication happens only through the two paths in the contract above.
- Protect CNAME, published URLs and other repos; propose code fixes through QA-reviewed PRs.

## Publishing adapter contract (MANUAL PATH + shared article rules)

- `content/articles/<MATRIX-ID>.json` is the source of truth for every published article and corresponds 1:1 with a Matrix row marked PUBLISHED: either owner-approved in a reviewed PR (manual path) or published by the standing-policy Auto Publisher with a `publication` record.
- `scripts/seo/publish-batch.mjs` defaults to dry-run. --apply must require an exact owner approval manifest, a non-main work branch, complete editorial QA, and must not replace an existing live page.
- Run `node --test tests/content-publisher.test.mjs` and `node scripts/build.mjs --check` in CI.
- Do not auto-generate AI text, approve articles on the owner's behalf, or modify production DNS/CNAME/other repositories.

## Global Turbo Content Factory (owner-approved; /global ONLY)

- Runbooks: `docs/CURRENT-WORKFLOW.md` (current operation) and `docs/GLOBAL-CONTENT-FACTORY-TURBO.md` (slot and claim mechanics). This repository is NOT /blog and must NEVER copy its posts or import /blog checkpoint, lease state or publishing policy.
- Shared queue, up to THREE independent external Writer sessions W1/W2/W3 (one live session per slot), each may claim up to TEN unfinished draft topics across all 10 locales. One active W1 can write every topic. (Historical: the first W1 ES-H01 + KO-H01 claims were SUBMITTED on 2026-10-14.)
- Each Writer uses the SAME stable session/branch across restarts. Request activation ONCE on the Writer branch. GREEN Writer QA after push triggers the Global Dynamic Writer Autopilot; no per-batch GitHub Run click. Writer fetches+merges main, confirms exact 1–10 IDs, creates original native-language draft JSON, verifies QA, pushes OWN inbox, then the Autopilot submits the verified subset and refills up to 10. Partial green pushes of 1–9 are supported.
- The main claims ledger is the sole ownership source; preview is NEVER authorization. The trusted coordinator (main code only) records source commit+SHA256 for new SUBMITTED drafts. Those packets are immutable on Writer branches (Writer QA locks them by hash). Incomplete claims remain owned; no auto-expiry or silent transfer. Concurrent main writes recompute from latest main with bounded CAS retries and NEVER force push.
- Protect 14 W1 legacy drafts in PR #17 and EN-H01/DE-H01 in editorial PRs #5/#6 (`factory/external-writers/protected-drafts.json`). Claims are not publication, QA PASS is not human review, no model APIs or AI text generation in Actions.
- Writer-side topic refill: `node scripts/writer-refill.mjs status`; below 30 free IDEA topics an outside Writer may stage researched Supporting proposals in its OWN `factory/topic-refill/proposals/Wn/`. G1–G8 are strict structural gates; these proposals stay editorial-review-only and DO NOT become Matrix rows or URLs by themselves. (Matrix growth runs through the Topic Factory research intake, below.)
- Production publication: see the contract above (standing-policy Auto Publisher, or the manual publish-batch path). Supporting publication needs a genuinely PUBLISHED Hub. Writers never publish; never modify CNAME, live URLs, canonical/hreflang/sitemap or unrelated repos while writing.

## Premium Master Work branch safeguards (LEGACY branch notes; protections still apply)

- `docs/GLOBAL_MASTER_MATRIX.md` and `docs/MASTERWORK-CHECKPOINT.json` are dated audit snapshots of that work. Do not claim branch features are deployed unless verified live.
- Search at `/search/` is a nonindex technical utility: valid internal navigation target with real static HTML; intentionally absent from SEO Matrix's PUBLISHED set and sitemap. It must carry `noindex,follow` and must not produce query-parameter SEO URLs.
- Homepage language equivalents and truly translated checklist equivalents retain reciprocal hreflang. Distinct new Hub/supporting articles must not auto-claim hreflang.
- `data/seo/content-graph.json` (knowledge graph: nodes, silos, candidates, entities, typed edges, KEEP/UPGRADE/REVIEW/CREATE actions) and its readable report `docs/GLOBAL-SITE-MATRIX.md` are deterministic/derived; regenerate `node scripts/seo/content-graph.mjs --write` whenever the Matrix, Writer assignment, protected drafts, topical map or generated HTML changes; CI verifies byte-exact --check. They never read the volatile claims ledger.
- All current dynamic Writer claims are serialized by the dedicated GitHub Actions dispatcher into main claims.json; local writer-claims.mjs is historical/test-only and must not be used for new claim mutations.
- Markdown writer intake accepts strict JSON frontmatter and writes only ignored private drafts; neither import nor AI writer scripts may publish automatically.
- LEGACY: "do not merge this technical branch, merge publication PR #6 or deploy without the owner's separate explicit production approval" referred to `feat/global-premium-masterwork-v1` and PR #6. PR #6 is still a manual-path publication that needs the owner's approval.

## Premium Ultra component boundary

- Render site-wide Ultra visuals in `scripts/ultra.mjs` after navigation + `applyPremium`; styles in `assets/ultra.css`; optional progressive interactions in `assets/ultra.js`.
- Never directly patch locale HTML after build: generate with `node scripts/build.mjs` and verify `node scripts/build.mjs --check`.
- Preserve the 10 locales, every PUBLISHED URL and CNAME (25 URLs and 120 IDEA rows were the 2026-10-14 counts). Use only on-page anchors or PUBLISHED URLs; no extra indexable archive/category stubs.
- Keep essential reading and navigation functional without JS. Reader controls remain `hidden` until event handlers are installed.
- Run `node --test tests/ultra.test.mjs` and full QA. (LEGACY: "no merging this branch without production approval" referred to the Ultra branch.)

## QA-fail automatic repair (owner-approved, /global only)

- Active W1/W2/W3 agents MUST inspect `node scripts/writer-repair.mjs next --writer Wn --session <own-session>` before claiming more ideas. A Publisher-issued QA FAIL ticket bound to the immutable source SHA authorizes one NEW revision; it does not authorize overwriting the submitted source. The CLI refuses to run without your own `--writer` and `--session`.
- After fixing, run `node scripts/writer-repair.mjs check --writer Wn --session <own-session> --file <ticket.revision_path>` and the normal Writer QA. Only a green push from the same Writer branch/session and a matching trusted Publisher ticket may update the ledger. Maximum 3 accepted self-repairs; no independent AI Reviewer.
- A draft that fails Writer QA BEFORE it is SUBMITTED is not a repair: fix the draft file in place and re-run `node scripts/writer-lanes.mjs verify-all`.
- The strict QA and human holds for sensitive legal/price/safety claims remain. No fake human approval or fabricated references. GitHub Actions cannot rewrite prose on its own; the **active** external AI Writer performs actual editing. See `docs/AI-WRITER-REPAIR-LOOP.md`.
- A publisher PAUSE after a live deploy failure is an infrastructure state; repair work does not lift it.

## Continuous external Writer sessions — Turbo

- Read `docs/CURRENT-WORKFLOW.md` for the current loop; `docs/DYNAMIC-WRITER-POOL.md` is only a manual recovery pointer.
- Write-ahead queue: active Writer W1/W2/W3 → repair tickets first → confirmed claims (up to 10) → 1–10 QA-verified drafts → push own branch → auto SUBMITTED/sha journal + refill → fetch main → repeat. No user approval per DRAFT batch.
- Recovery: do NOT skip or steal incomplete claims; resume same session/branch and replay green QA. If no real topics or CI/approval/quota genuinely blocks, stop and report. Never fabricate reviewed sources or mark proposed IDEA as PUBLISHED.

## Multilingual sitemap index (approved 2026-10-14)

- Read `docs/SITEMAP-INDEX.md` before editing sitemap, build scripts or SEO validation. `sitemap.xml` is a sitemap INDEX referencing 10 locale shards plus `sitemap-main.xml` for shared utilities.
- Only PUBLISHED HTML URLs are included, never IDEA, noindex search, unpublished content or 404. The generator in `scripts/sitemaps.mjs` automatically shards a large language at <=40,000 URLs / <=40 MiB, avoids duplicate URLs and reuses `robots.txt` for discovery.
- Live checks read sitemap children only through `sitemapChildURL()` / `fetchSitemapInventory()` (absolute same-origin URLs); never fetch a bare child name.
- Never manually patch the sitemap files. Run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node --test tests/sitemaps.test.mjs`, `node scripts/seo/validate-plan.mjs`, and live post-publish QA after an approved deployment.
- Updating sitemaps does not approve drafts or bypass existing Writer/Coordinator gates, nor guarantee bot indexing.

## Topical Authority + SEO protection (merged; applies on main)

- Runbook: `docs/TOPICAL-AUTHORITY.md`; baseline audit: `docs/TOPICAL-AUTHORITY-BASELINE.md`. Hierarchy Entity Hub (PILLAR) → Topic Pillar (HUB) → Cluster (section, never a URL) → Supporting (SUPPORT). Do not rename live Matrix roles.
- `data/seo/url-freeze.json` freezes every live URL's lang, canonical, robots, title, description, H1, hreflang and JSON-LD types. Run `node scripts/seo/seo-guard.mjs` after any build/generator/Matrix change. Re-freeze with `--write` only in a reviewed commit; never remove a frozen URL without a reviewed `retired` entry pointing at a PUBLISHED `redirect_to`. A publication freezes its new URL (`seo-guard --add-new` in both publication paths).
- `data/seo/topical-authority/` (architecture, verified references, 10 native locale maps) is CAPACITY, not content: PROPOSED/ARCHITECTURE_BLOCKED candidates never enter sitemap, navigation, hreflang, search shards or HTML links, and are not claimable. Run `node scripts/seo/topical-authority.mjs validate` (gates T1–T10) after editing them; do not machine-translate one locale into another.
- Only `node scripts/seo/topical-authority.mjs promote --manifest <committed owner manifest> --apply` on a clean non-main branch, or the Topic Factory under the standing policy (below), may add them to the Matrix as IDEA rows. Never write or fake a personal owner manifest; factory manifests in `approvals/auto/` must say `approval_mode: STANDING_POLICY` and name the policy file. New Hubs/domains (including `routes-trips`) need a reviewed architecture PR with ≥8 validated Supporting candidates.
- Navigation shows exactly two featured Supporting labels per Hub (`menuChildren`, PUBLISHED first). Writer tests derive IDEA counts from the Matrix with a 120-row floor.
- Keyword queries stay `NOT_VALIDATED` until real market data/SERP review; never invent volumes, rankings, prices, availability or legal certainty.

## Business reference + fact guard (approved 2026-10-14)

- `data/business/reference.json` is the ONLY source of Thuê Xe Máy Hà Nội Nguyễn Tú NAP, hours and prices; `data/business/reference.localized.json` is generated (`node scripts/seo/fact-guard.mjs --write`). Read `docs/BUSINESS-REFERENCE.md`.
- `node scripts/seo/fact-guard.mjs` (CI) fails wrong Nguyễn Tú facts anywhere, unsourced amounts/phones on live pages, site copy, Matrix, topical map and approved articles, and any NAP display or LocalBusiness-type schema while `publication.*_approved` flags are false. Writer drafts get warnings for unsourced amounts; both publication paths are strict.
- Never change NAP, prices, flags or conflicts without dated evidence and owner approval in a reviewed PR. Known conflicts (site hours 08:00–21:30 vs canonical 09:00–21:00, delivery threshold, GBP title) stay listed until the owner resolves them outside this repo.

## Global site matrix + pre-claim duplicate gate

- `docs/GLOBAL-SITE-MATRIX.md` is the Global Content Cannibalization Matrix (Homepage → Pillar → Hub → Silo → Supporting). Silos are graph nodes and Hub-page sections, never URLs. UPGRADE on a live page is an editorial recommendation with metrics; change live content only through a reviewed PR (the Auto Publisher never edits a published page).
- `node scripts/seo/validate-plan.mjs` fails any two non-parent/child Hub/Supporting rows with query overlap ≥ 0.66 and no ≥40-char `distinct_from` reason, so a duplicate intent never reaches the Writer pool. Promotion copies candidate `distinct_from` into the Matrix row.
- Performance signals are NOT_CONNECTED (no Search Console property for global.rentbikehanoi.com in the connected tools); never infer rankings or traffic.

## Link integrity, content protection and scale (PR-4)

- `seo-guard` also audits PUBLISHED pages: orphans, two-way parent↔child links (Hub/Pillar in-content link to every published child; child links back), empty anchors (FAIL) and generic/ambiguous/undiverse anchors (WARN). It freezes each live page's H2 outline and main-text size: removing a frozen H2 or losing >10% of main text fails until a reviewed `--write`.
- Published Hub articles render "Guides in this topic" (every published child, grouped by silo label); Supporting articles render up to six published siblings. Only PUBLISHED URLs. Do not remove these sections: at scale they are what prevents orphan guides.
- Both publication paths run `seo-guard --add-new` (freezes only new URLs, refuses on any FAIL) and `fact-guard`, and restore the registry on rollback.
- Matrix/article IDs allow 2–4 digits (XX-S100+). Overlap checks use prefix-filtered all-pairs similarity. Benchmark: `node scripts/bench/full-build-scale.mjs --articles N` (temp copy only); CI runs N=300. See docs/PERFORMANCE-LIMITS.md before scaling past 10,000 URLs (shard url-freeze and content-graph by locale).
- Per-page build code must not scan every Matrix row. Use the per-build indexes instead: `rowsIndex` in `scripts/articles.mjs`, `relatedIndex` in `scripts/premium.mjs`, and header/footer rendered once per locale in `scripts/navigation.mjs`. Any optimization must keep `build --check` byte-identical.

## Live structured data + production QA (PR-5)

- Root `/` carries the 10-locale hreflang cluster with `x-default` to itself; Pillars carry WebPage + BreadcrumbList (Global › Language) with `about` Hanoi (Wikidata Q1858); checklists carry a 3-level BreadcrumbList. Never add business (LocalBusiness/AutoRental/NAP) schema while `publication.business_schema_approved` is false.
- After any deployment you may run the manual `post-publish-qa.yml` workflow: it fetches every PUBLISHED URL live (cache-busted) and fails on status/lang/canonical issues, sitemap mismatch, any SEO fingerprint drift from `data/seo/url-freeze.json`, or live NAP/business-schema violations. The Auto Publisher runs its own live QA on every publication.
- `docs/GAP-MATRIX.md` is the DONE/PARTIAL/OWNER/BLOCKED status of the master work; update it with evidence, never optimistic claims.

## Global Content Factory 10K (owner standing policy 2026-10-15)

- `approvals/standing-policy-20261015.json` records the owner's standing authorization (verbatim quotes). It covers (a) promoting gate-clean topical candidates to Matrix IDEA rows and (b) publishing NEW Hub/Supporting URLs that pass every Auto Publisher gate. It never covers deleting/renaming/redirecting URLs, NAP, prices, business schema or overwriting published/frozen/protected content.
- Scope: /global is a multilingual Vietnam travel & mobility knowledge hub with 8 domains (`data/seo/topic-factory/policy.json`). Transactional rental keywords belong to thuexemaynguyentu.com (vi) and rentbikehanoi.com (en); do not clone them here.
- Topic Factory: read `docs/TOPIC-FACTORY.md`. Target ≤1,000 Hub/Supporting articles per locale (a planning ceiling, not progress); READY <100 triggers refill toward 250 from validated PROPOSED candidates (≤50 per run). Research arrives only from AI agents via `research/*` branches and `factory/topic-research/batches/` (schema in `factory/topic-research/README.md`). Run `node --test tests/topic-factory.test.mjs` and `node scripts/topic-factory.mjs status` after factory/Matrix changes.
- The `Global Topic Factory` workflow is the only automated writer of factory topic data on main (CAS push, path allowlist, never force-push). Do not hand-edit `approvals/auto/`, `data/seo/topic-factory/*-log.json` or `docs/CONTENT-FACTORY-DASHBOARD.md`; the dashboard is regenerated from data by the Topic Factory and the Auto Publisher.
- Never invent search volume, rankings, traffic or research sources; L5 topic similarity is lexical until a real embedding model is connected.
- Writer slots W1/W2/W3 are seats for any AI agent (`docs/GLOBAL-CONTENT-FACTORY-TURBO.md` § Universal Writer slots, `factory/external-writers/slots.json`). Quota/offline state changes only by the agent's own request-file signal or a confirmed coordinator dispatch; `handover` releases only undrafted claims of a PAUSED_QUOTA/OFFLINE slot. Never use timeouts to move claims, never take a slot held by another session. Run `node --test tests/writer-slots.test.mjs` after pool changes.
- Auto Publisher (`docs/AUTO-PUBLISHER.md`): ≤2 new articles per run (PILOT 2/locale → RAMP 10 → CONTINUOUS after clean live runs). LEGAL/SAFETY/PRICE topics, money amounts and uncited hard legal claims stay REVIEW_REQUIRED for a human. Policy publications keep `facts_reviewed_by_human:false`, carry a `publication` record and render a localized AI-provenance note. Live QA FAIL reverts the publish commit and pauses; INCONCLUSIVE pauses without rollback (`factory/publisher/state.json`); resume only by confirmed dispatch. Run `node --test tests/auto-publisher.test.mjs tests/live-qa.test.mjs` after publisher/article changes.
- LEGACY (retired 2026-10-15): "REVISE/FAIL reviews from an independent reviewer send a draft back; the new version needs its own per-hash review in `factory/editorial-reviews/`". Revisions now come only from automated repair tickets (contract above); `factory/editorial-reviews/` is historical.
