# Dynamic Writer Pool — manual recovery fallback only

Current protocol: `docs/CURRENT-WORKFLOW.md`; slot and claim mechanics: `docs/GLOBAL-CONTENT-FACTORY-TURBO.md`.

Normal operation is zero-click per Writer push: the Writer Autopilot claims (up to TEN unfinished per slot), submits verified drafts with immutable evidence and refills. The manual **Global Dynamic Writer Pool** workflow (`writer-pool.yml`) is only for recovery and operator actions:

- `status` / `slots` — read-only views.
- `signal` with `confirmed=true` — record `OFFLINE` or `PAUSED_QUOTA` for the real holder when the agent cannot push its own signal.
- `handover` with `confirmed=true` and a reason — release only undrafted claims of a `PAUSED_QUOTA`/`OFFLINE` slot.
- `release` with `confirmed=true` and a reason — release one unsubmitted claim.
- `claim` / `submit` — manual equivalents of what the Autopilot does.

It never runs an AI model, never publishes and never transfers SUBMITTED drafts.
