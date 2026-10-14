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

## External three-Writer manual protocol (source /total, adapted /global)

- Actual /total production pattern at the time of reference: **1 external Writer + 2 supervisors**. /global now uses **3 exclusive external writer lanes** W1/W2/W3 for simultaneous human-operated AI applications.
- The Writer Board is `factory/external-writers/assignments.json`, validated against SEO Matrix. Never reassign existing IDs without explicit coordinator migration.
- Run `node scripts/writer-lanes.mjs pack --writer W1 --count 2` for a bounded read-only work pack. Use W2/W3 analogously.
- External Writer can only add `factory/external-writers/inbox/<W>/<ID>.json` on its own feature branch and submit PR. No direct Matrix edits, no generated HTML or public-site changes.
- Writer must keep human review flags false, 1,000–5,000 words and four meaningful H2. Static CI verifies drafted content but does not assert facts are true.
- No API, no LLM running in GitHub Actions, no autonomous publish or background model. Coordinator moves genuinely reviewed/approved content through existing `scripts/seo/publish-batch.mjs`, as a separate PR.
- Do not copy `/total`'s auto-publish-on-main behavior into `/global`; it could bypass human approval. Never edit /total.

## Premium Master Work branch safeguards

- `docs/GLOBAL_MASTER_MATRIX.md` and `docs/MASTERWORK-CHECKPOINT.json` document current P0–P3 gaps and resumable state. Do not claim branch features are deployed.
- Search at `/search/` is a nonindex technical utility: valid internal navigation target with real static HTML; intentionally absent from SEO Matrix's PUBLISHED set and sitemap. It must carry `noindex,follow` and must not produce query-parameter SEO URLs.
- Homepage language equivalents and truly translated checklist equivalents retain reciprocal hreflang. Distinct new Hub/supporting articles must not auto-claim hreflang.
- `data/seo/content-graph.json` is deterministic/derived; regenerate `node scripts/seo/content-graph.mjs --write` whenever the Matrix or Writer assignment changes; CI verifies byte-exact --check.
- Three external Writer lane claims are coordinator-owned and persisted as `factory/external-writers/claims.json` via reviewed commits. Git PRs must resolve collisions; local filesystem locks are not a cross-clone distributed service.
- Markdown writer intake accepts strict JSON frontmatter and writes only ignored private drafts; neither import nor AI writer scripts may publish automatically.
- Do not merge this technical branch, merge publication PR #6 or deploy without the owner's separate explicit production approval.

## Premium Ultra component boundary

- Render site-wide Ultra visuals in `scripts/ultra.mjs` after navigation + `applyPremium`; styles in `assets/ultra.css`; optional progressive interactions in `assets/ultra.js`.
- Never directly patch locale HTML after build: generate with `node scripts/build.mjs` and verify `node scripts/build.mjs --check`.
- Preserve the 10 locales, 25 published URLs, 120 IDEA rows and CNAME. Use only on-page anchors or PUBLISHED URLs; no extra indexable archive/category stubs.
- Keep essential reading and navigation functional without JS. Reader controls remain `hidden` until event handlers are installed.
- Run `node --test tests/ultra.test.mjs` and full QA. No merging this branch without the owner's production approval.

## Continuous external Writer sessions (approved technical loop)

- Read `docs/CONTINUOUS-WRITER.md` before using W1/W2/W3. Reference design: `/vanchinh/docs/CONTINUOUS-WRITER.md`; do NOT copy `/vanchinh` auto-publication semantics.
- Each *active external AI session* must repeat: refresh main → resume/repair → `node scripts/continuous-writer.mjs next --writer W1 --session <session> --count 2` → write own 2 JSON drafts → local QA → safe commit/push to own `writer/w1-*` branch → wait for the exact SHA's `writer-qa.yml` GREEN → refresh main → next pair, until no eligible row or genuine blocker. W2/W3 follow same pattern.
- No stopping after a successful pair, QA, PR update, or commit while eligible work remains and the agent session is active. Keep the same writer branch for unmerged drafts so they are not reissued. A PR may be updated by subsequent writer-only commits; only editor may merge/review it.
- `WAIT_PARENT_PUBLICATION`/`AWAIT_EDITORIAL_REVIEW` are real gates, not permission to write unpublished child hubs or publish unreviewed content. Runtime/network/quota limits stop the external session safely; GitHub does not keep an LLM running.
- No force push, no direct writer push to main, no auto merge, no automatic publication, no human fact/intent approval by Writer. `content/articles`, Matrix, CNAME, sitemap and website outputs are unchanged by this loop.
