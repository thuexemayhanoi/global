# Zero-click external Writer — pointer (LEGACY page, updated 2026-10-15)

Follow `docs/CURRENT-WORKFLOW.md` (operating manual) and `AGENTS.md` § CURRENT PRODUCTION WORKFLOW (binding rules).

"Zero-click" still means: no per-batch GitHub Run button. A Writer pushes 1–10 QA-green drafts to its own branch; Writer QA and the Autopilot submit them and refill the slot to ten; the Auto Publisher then publishes eligible drafts two at a time with Live QA. One active W1 can cover every eligible topic; W2/W3 are optional concurrent slots.

Corrections to earlier versions of this page:

- Publication is no longer "owner manifest only": the standing-policy Auto Publisher publishes drafts that pass automated QA G1–G5 + G7. The owner-manifest path (`scripts/seo/publish-batch.mjs`) remains as the manual path.
- W1's first ES-H01/KO-H01 claims were submitted on 2026-10-14; there is no outstanding pair to finish first. The 14 legacy W1 drafts (PR #17) and the EN-H01/DE-H01 editorial pilots remain protected.
- Before new topics, every active Writer handles its own repair tickets (`docs/AI-WRITER-REPAIR-LOOP.md`).

One-time bootstrap and health checks: `node scripts/writer-request.mjs start --writer Wn --session s --branch writer/wn-s`, `node scripts/writer-pool.mjs slots`, `node scripts/writer-refill.mjs status`. Refill PROPOSALS are not Matrix rows, URLs or permission to publish; never fake SERP evidence or source checks. If network or quota ends, resume the same branch and session; stop only on real blockers, an empty queue or an explicit STOP.
