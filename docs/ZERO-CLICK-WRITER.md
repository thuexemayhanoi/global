# ZERO-CLICK EXTERNAL WRITER — TURBO 10

The canonical LIVE protocol is docs/GLOBAL-CONTENT-FACTORY-TURBO.md. Read it and AGENTS.md first.

**No per-batch GitHub Run workflow button.** A single W1 can handle every eligible Matrix idea. W2/W3 optional. Up to 10 unfinished CLAIMED topics per Writer lane, push 1–10 QA-green drafts at a time, and let GitHub Autopilot submit only completed packets and refill to ten on main.

For active W1 use writer/w1-vibe-20261014 and w1-vibe-20261014 (PR #17). Preserve 14 existing W1 drafts and two EN-H01/DE-H01 editorial pilots. Active old ES-H01/KO-H01 claims must be finished or validly resumed before any new work.

Fetch+merge main → confirm assigned IDs → write up to 10 factual, language-specific article JSON drafts → check QA → push OWN Writer branch → wait Writer QA green and AutoPool green → fetch+merge main → repeat. It is okay to push 1–9 valid drafts if the session cannot complete all ten; unfinished claims stay owned. New SUBMITTED article JSON is hash-locked.

One-time bootstrap if needed:
node scripts/writer-request.mjs start --writer W1 --session w1-vibe-20261014 --branch writer/w1-vibe-20261014

Read-only health:
node scripts/writer-refill.mjs status

At <30 FREE ideas, prepare unique source-researched Supporting topic PROPOSALS in factory/topic-refill/proposals/W1/<batch>.json, validate via node scripts/writer-refill.mjs validate --writer W1 --branch writer/w1-vibe-20261014, and submit for editorial acceptance. Refill PROPOSALS are NOT approved Matrix rows, indexed URLs or permission to publish. Do not fake SERP evidence or source checking.

No AI API or text generation inside GitHub Actions. No automatic article publication. Owner-reviewed source/fact/SERP approval manifest remains mandatory; Supporting PUBLICATION needs its Hub already PUBLISHED.

If network or quota ends, resume the same Writer branch/session and unfinished claims; don't start a new lane with the same ID. Stop only on real blockers/empty approved queue or explicit STOP.
