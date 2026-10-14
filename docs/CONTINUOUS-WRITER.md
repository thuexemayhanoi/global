# Continuous Writer — ZERO-CLICK is the default

Follow docs/ZERO-CLICK-WRITER.md, not the old manual GitHub workflow_dispatch sequence. A Writer activates once by committing a requests/W<lane>/<session>.json on its own branch. Every green Writer QA PUSH auto-triggers Global Dynamic Writer Autopilot which serially manages claims and draft submission on main. No user button per batch.

# Continuous Writer (shared dynamic pool) — /global

The authoritative live instructions are in docs/DYNAMIC-WRITER-POOL.md and AGENTS.md. This replaces the old fixed W1/W2/W3 assignment protocol. One active W1 can write all remaining eligible ideas; W2/W3 are optional parallel accelerators, not mandatory quotas.

Each active external AI session must FETCH main → preview → atomically CLAIM via writer-pool.yml → WAIT success → fetch/merge main → confirm claimed 2 IDs → WRITE original native-language drafts into its own inbox → VERIFY all QA → PUSH to its writer/* branch → open/update PR → WAIT exact writer CI green → SUBMIT claimed IDs via writer-pool.yml → FETCH main → NEXT pair immediately.

Preview is NEVER permission to write. Only successfully committed main claims authorize new Writer drafts. The 14 already written W1 draft IDs from PR #17 are reserved in protected-drafts.json and must not be rewritten. Resume your own original branch/session across interruptions without reset or force push.

Continuous means keep working while the external AI chat has tools/network/quota and eligible topics remain. GitHub Actions does NOT generate content or revive stopped sessions. WAIT_PARENT_PUBLICATION and AWAIT_CLAIMS_OR_REVIEW are genuine gating states; they require approved editorial publication or coordinator reconciliation, not infinite spinning.

A green Writer PR is NOT an approved live article. Preserve separate owner editorial review, approval manifest and safe publisher, all 10 languages, URLs, sitemap index, canonical/hreflang and CNAME.
