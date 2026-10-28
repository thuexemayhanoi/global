# Claude — /global SEO-only standing directive (2026-10-28)

## Start here — highest priority
The owner has **stopped new article production for this repo**. Follow `approvals/owner-directive-20261028-seo-only.json` and top of `AGENTS.md` over older writer-factory obligations. Your role is now **independent SEO A–Z execution on existing URLs in all 10 languages**. No routine questions, no GA4/GSC tutorials, no paid-API proposals, no new articles and no new public URLs.

### Mandatory autonomous loop
1. Read current `main`, `docs/seo-audit/EXECUTION-LEDGER.md`, `docs/seo-audit/execution/ledger-summary.json`, `docs/seo-audit/execution/task-ledger.csv`, `data/seo/commercial-head-terms.json`, `docs/seo-audit/COMPETITOR-GAP-AND-OFFPAGE-PLAN.md`, and the independent SEO directive in `approvals/owner-directive-20261028-independent-seo.json`.
2. Inspect current published URLs, Matrix assignments, actual content, metadata, route and runtime. Select high-impact, **verified** on-page and technical opportunities. Do not confuse an already-reviewed/no-fix finding with unresolved work. Never mark a task FIXED merely to increase counts.
3. Execute real improvements to existing pages only: stronger unique commercial-intent Pillar/Hub copy; distinctive supporting context; useful internal links; canonical and actual-equivalent hreflang; robots and sitemap; mobile accessibility/performance; accurate schema, image alt and social metadata; E-E-A-T / AEO / GEO through truthful source-supported text; verify potential keyword cannibalization across existing URLs.
4. Respect factual protections and frozen existing URLs. No new article pages, new Hubs, new URLs, Writer batches, draft refills, topic promotion for publication, or publication of already-submitted drafts. Do not merge PR #118 while in SEO-only mode; preserve it for later.
5. For each tightly scoped change, run the applicable Node, SEO, fact, localization and build checks; use an ordinary PR/merge workflow, then verify deployment and live HTML. If QA fails, repair the change and retry; never force-push or bypass QA. Keep 10-language intent and independent ranking strategy (including commercial head terms), without copying sibling sites.
6. Update the A–Z matrix, evidence ledger, 16-sheet Excel workbook (where appropriate) and task status accurately after implementation and live verification. Distinguish onsite completion from unmeasured Google indexing/rankings; top 1–3 is a competitive goal, not a verified outcome.
7. Continue to next executable SEO issue without asking for confirmation. When the work cannot proceed without another party or account, **write it as a blocker in the final report and move on**. Google Analytics 4 (GA4), Google Search Console (GSC), third-party credits, true customer testimonials, legally verifiable NAP/prices and unobservable rankings must never interrupt independent SEO tasks.
8. Keep the final report minimal and factual: executed PRs + verified checks + what changed, then **ONLY AT THE VERY END** section `OWNER_ACTIONS_LAST` with unresolved outside-account or administrator tasks as a bare backlog. Do not ask questions or provide setup/how-to instructions.
9. On the owner's next `tiếp tục`, re-read the current ledger and resume the next unfinished SEO-only task rather than writing articles. Do not erase earlier SEO work.

### Operational note
The Auto Publisher's `factory/publisher/state.json.paused` flag is a publication safety gate for new URLs. It does **not** mean SEO maintenance and deployment of existing URLs should stop. Do not resume Auto Publisher for SEO work.

### Standard quality gates
```sh
node scripts/build.mjs --check
node scripts/seo/seo-guard.mjs
node scripts/seo/fact-guard.mjs
node scripts/seo/content-graph.mjs --check
node scripts/nav-qa.mjs
node --test tests/*.test.mjs
```
Use the repo's full Static SEO QA / Pages workflow and published-page live verification. Do not declare a successful deployment while actions are still pending.
