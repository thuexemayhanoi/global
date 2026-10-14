# Repository contract · thuexemayhanoi/global

- This repository alone serves `https://global.rentbikehanoi.com/` through GitHub Pages.
- Preserve the `CNAME` content exactly: `global.rentbikehanoi.com`.
- Do not touch `thuexemayhanoi/lab`, `/german`, WordPress, domains or DNS.
- Homepage language switcher uses real URL paths. Do not replace with JS-only translation.
- `content/locales.json` is canonical for the initial locale pages. Regenerate with `node scripts/build.mjs` and confirm `node scripts/build.mjs --check`.
- Maintain self-canonical, correct `lang`, equivalent-only hreflang, descriptive metadata, schema, breadcrumbs and sitemap coverage.
- No invented prices, local premises, reviews, licence rules, or statements of service availability.
- No unreviewed mass auto-publishing. Add researched topic/keyword matrix, scoped QA and safe batch publishing before scaling.
- Do not remove or rename a live URL without a redirect/SEO plan.

## Phase 2 matrix rules

- Read `docs/MULTILINGUAL-SEO-MATRIX.md`, `data/seo/taxonomy.json`, and `data/seo/master-matrix.json` before any topic expansion.
- `IDEA` is merely a keyword hypothesis. Do not render it as a page or reference it in a sitemap/navigation/hreflang.
- Run `node scripts/seo/validate-plan.mjs` after changes to the matrix or deployment files; run `node scripts/seo/writer-queue.mjs --locale de --count 2` for a **read-only** research queue.
- First publish pilots must be separately approved and verified before enabling a recurring writer. Never silently publish proposed topics.

## Full Menu & Footer (approved)

- `scripts/navigation.mjs` is the single source of rendered site-wide menus and footers; `data/seo/master-matrix.json` is the taxonomy source.
- All 4 parent Hub labels and 8 child topic labels per locale are displayed, but IDEA rows must NOT be clickable or placed in sitemap/hreflang. This owner-approved preview only displays category names until their actual pages are approved and published.
- After adding published content or changing Matrix, run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node scripts/nav-qa.mjs`.
- Preserve CNAME and all 25 URLs; do not overwrite unrelated repositories.

## Five-weapon governance

- Run `node scripts/seo/engine.mjs --locale de --count 2` for Audit→Matrix→QA→Report. It must only write gitignored reports, never site content or production settings.
- Never infer actual rankings, Google indexation, backlinks, AI citations or search volume from static audit outputs.
- AI Writer is currently a native-language research/QA scaffold without API connection; no auto-publishing.
- Protect CNAME, published URLs and other repos; propose fixes through QA-reviewed PRs.

## Publishing adapter contract

- `content/articles/<MATRIX-ID>.json` is a source-of-truth for articles the owner has explicitly approved in a reviewed branch/PR. It must correspond 1:1 with a Matrix row marked PUBLISHED.
- `scripts/seo/publish-batch.mjs` defaults to dry-run. --apply must require an exact owner approval manifest, a non-main work branch, complete editorial QA, and must not replace an existing live page.
- Run `node --test tests/content-publisher.test.mjs` and `node scripts/build.mjs --check` in CI.
- Do not auto-generate AI text, approve articles on the owner's behalf, or modify production DNS/CNAME/other repositories.

## Zero-click continuous Writer Autopilot (approved)

- Canonical active-session runbook: docs/ZERO-CLICK-WRITER.md. A SINGLE user instruction lets outside AI Writer write eligible ideas continuously while its session runs. **No per-two-article Run workflow click.**
- Each Writer creates ONE branch-local JSON request with scripts/writer-request.mjs start and pushes its own request. Green Writer Draft QA on PUSH then triggers Global Dynamic Writer Autopilot via workflow_run. It commits serialized claims on main; subsequent green draft pair pushes automatically SUBMIT and reserve next 1–2 IDs.
- Do not trust previews or manually edit claims.json. AI MUST fetch/merge main and verify assigned IDs before drafting. The branch must be active and request matched to the session. Editor review and separately approved public publication remain mandatory.
- Protect 14 original W1 drafts in PR #17 PLUS the already written EN-H01 and DE-H01 editorial pilots in PRs #5/#6; none may be drafted again. Supporting rows require real PUBLISHED Hub.
- Workflow_run uses trusted main code only and reads Writer branches as data. No AI calls or automatic production publication, no cross-repo writes. Existing manual writer-pool.yml is RECOVERY only.
- Keep own branch/PR and stop only for actual blockers or an ended chat. Never force push/reset or bypass disabled Actions token permissions.

## Dynamic shared Writer Pool — owner approved

- Source of truth: docs/DYNAMIC-WRITER-POOL.md and Global Dynamic Writer Pool (writer-pool.yml). Shared queue of 120 planned topics across 10 languages; **ANY one Writer W1, W2, W3 may claim any unreserved eligible topic**. Two or three active sessions share the same serialized queue. No 40-topic ownership ceiling.
- Historical assignments.json is retained only as provenance/initial distribution, not an exclusion fence. protected-drafts.json permanently protects 14 already written W1 drafts on PR #17. Do not rewrite, overwrite, release or delete these without explicit coordinator review.
- Claims are authoritative ONLY when committed to main by writer-pool.yml action=claim after successful GitHub Actions run. Preview/pack output is NOT a reservation. Writer branches write ONLY their own inbox, with exact confirmed claim and writer_session, preserving false human-review flags. New Writer drafts without confirmed claims fail QA; 14 legacy W1 drafts are grandfathered.
- Protocol: fetch+merge main → preview → serialized claim → wait successful Actions → fetch+merge main → confirm claimed IDs → write native-language research-backed 2 articles → verify QA → push own writer branch → open/update draft PR → writer CI green → serialized action=submit → next pair. Continue while active and eligible; no stop after successful batch. No force push, no direct Writer push to main.
- Do not auto-expire or steal claims on network loss; resume same session/branch, or coordinator explicitly inspects remote before release. Supporting requires actual published Hub; no bypass.
- GitHub Actions never runs a model or auto-publishes. Publishing remains separate owner-reviewed approval manifest and feature PR. Preserve production CNAME, all URLs, sitemap index/children and canonical/hreflang.

## Premium Master Work branch safeguards

- `docs/GLOBAL_MASTER_MATRIX.md` and `docs/MASTERWORK-CHECKPOINT.json` document current P0–P3 gaps and resumable state. Do not claim branch features are deployed.
- Search at `/search/` is a nonindex technical utility: valid internal navigation target with real static HTML; intentionally absent from SEO Matrix's PUBLISHED set and sitemap. It must carry `noindex,follow` and must not produce query-parameter SEO URLs.
- Homepage language equivalents and truly translated checklist equivalents retain reciprocal hreflang. Distinct new Hub/supporting articles must not auto-claim hreflang.
- `data/seo/content-graph.json` is deterministic/derived; regenerate `node scripts/seo/content-graph.mjs --write` whenever the Matrix or Writer assignment changes; CI verifies byte-exact --check.
- All current dynamic Writer claims are serialized by the dedicated GitHub Actions dispatcher into main claims.json; local writer-claims.mjs is historical/test-only and must not be used for new claim mutations.
- Markdown writer intake accepts strict JSON frontmatter and writes only ignored private drafts; neither import nor AI writer scripts may publish automatically.
- Do not merge this technical branch, merge publication PR #6 or deploy without the owner's separate explicit production approval.

## Premium Ultra component boundary

- Render site-wide Ultra visuals in `scripts/ultra.mjs` after navigation + `applyPremium`; styles in `assets/ultra.css`; optional progressive interactions in `assets/ultra.js`.
- Never directly patch locale HTML after build: generate with `node scripts/build.mjs` and verify `node scripts/build.mjs --check`.
- Preserve the 10 locales, 25 published URLs, 120 IDEA rows and CNAME. Use only on-page anchors or PUBLISHED URLs; no extra indexable archive/category stubs.
- Keep essential reading and navigation functional without JS. Reader controls remain `hidden` until event handlers are installed.
- Run `node --test tests/ultra.test.mjs` and full QA. No merging this branch without the owner's production approval.

## Continuous external Writer sessions (shared pool)

- Read docs/DYNAMIC-WRITER-POOL.md and docs/CONTINUOUS-WRITER.md. One AI session can exhaust all unclaimed eligible articles regardless of old W1/W2/W3 assignment; concurrent Writers use main serialized claim dispatcher.
- node scripts/continuous-writer.mjs next is READ ONLY: CLAIM_REQUIRED previews must not be written until writer-pool.yml action=claim succeeds and main ledger is fetched. After writing and QA, push, PR, submit IDs through writer-pool.yml and get next confirmed pair immediately.
- Genuine blockers (parent Hub not PUBLISHED, 26 remaining Hub claimed, editorial review, chat/network timeout) are stop points requiring reconciliation, not excuses to fabricate drafts. No model runs in Actions.
- Do not mutate production or other repositories and do not bypass editorial approval.

## Multilingual sitemap index (approved 2026-10-14)

- Read `docs/SITEMAP-INDEX.md` before editing sitemap, build scripts or SEO validation. `sitemap.xml` is now a sitemap INDEX referencing 10 locale shards plus `sitemap-main.xml` for shared utilities.
- Only PUBLISHED HTML URLs are included, never IDEA, noindex search, unpublished content or 404. The generator in `scripts/sitemaps.mjs` automatically shards a large language at <=40,000 URLs / <=40 MiB, avoids duplicate URLs and reuses `robots.txt` for discovery.
- Never manually patch the sitemap files. Run `node scripts/build.mjs`, `node scripts/build.mjs --check`, `node --test tests/sitemaps.test.mjs`, `node scripts/seo/validate-plan.mjs`, and live post-publish QA after an approved deployment.
- Updating sitemaps does not approve drafts or bypass existing Writer/Coordinator gates, nor guarantee bot indexing.
