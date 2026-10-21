# V11 reviewed metadata batch helper

The owner authorized the remaining metadata edits in the V11 task. The review arrays record the precise source values, final values and per-URL editorial decision; they are not evidence of human fact review or deployment. The helper does not generate prose, acquire Writer seats, publish, commit, push or merge.

```bash
node scripts/seo/metadata-v11.mjs check
node scripts/seo/metadata-v11.mjs plan --write --size=40
node scripts/seo/metadata-v11.mjs apply --batch=1
```

All ten `docs/seo-v11/reviews/<locale>.json` arrays must cover every article packet before planning. Each row uses `id`, `url`, `locale`, `before_title`, `before_description`, `after_title`, `after_description`, `decision`, `reason`, `candidate_source`, `body_reviewed: true`, and optional `width_review`. Accepted decisions are KEEP, KEEP_APPROVED, OPTIMIZE and BLOCKED; the latter three non-editing decisions preserve both values. PR #90/#91 IDs S01–S10 in vi/en/de/fr/es/nl/pt must be KEEP_APPROVED. Duplicate IDs, stale or partially applied pairs, new numeric claims, unapproved keys and duplicate final title/descriptions are refused before mutation. Existing packet bounds remain enforced; the helper does not impose new fixed Google snippet limits.

`inventory.json` binds every packet's protected fields by SHA-256, retains all before/after decisions and fixes deterministic batches of at most 50. It is never overwritten automatically. Subsequent batches accept earlier fully applied pairs; mixed application within a batch is refused. A completely applied batch is reported as ALREADY_APPLIED, never as deployed or verified.

Application requires a named feature branch and a passing pre-change build/SEO Guard. It preserves each changed description's existing visible introduction through `content/article-leads.json`. It rewrites only selected packet title/meta fields, rebuilds the site and verifies byte-exact HTML expectations: title, HTML/Open Graph description, Article headline/description and the current page's BreadcrumbList label may follow approved metadata. H1, visible lead, article copy, links, remaining schema fields and every unselected HTML file must stay byte-identical. It updates only the selected title/description fields in the old URL-freeze registry, retaining every content snapshot and unrelated fingerprint. The content graph and search shards are derived outputs. No blanket re-freeze is performed.

Build consistency, strict SEO Protection Guard, Fact Guard, Content Graph, plan validation, navigation QA and the static audit run before a batch receipt is written. Any failure restores the pre-application tracked bytes and the lead sidecar. A receipt says LOCAL_GATES_PASSED_AWAITING_CI_DEPLOY; the coordinator must still run the complete tests/Actions, review the exact diff, merge only when all mandatory gates pass, verify Pages at the merge commit, perform live HTML QA and append production evidence. Local success is not deployment, indexing or ranking evidence.

The renderer historically reused meta descriptions as visible article introductions. The lead sidecar separates those values so authorized metadata edits do not rewrite published body text. Article schema title/description and breadcrumb labels remain generated from approved metadata; their URLs, types and other properties remain intact.
