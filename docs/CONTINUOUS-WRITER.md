# /global Continuous Writer — pointer (LEGACY page, updated 2026-10-15)

The current loop is in `docs/CURRENT-WORKFLOW.md`; the binding rules are in `AGENTS.md` § CURRENT PRODUCTION WORKFLOW. Slot and claim mechanics: `docs/GLOBAL-CONTENT-FACTORY-TURBO.md`.

Summary of what is still true from this page's earlier versions:

- W1/W2/W3 share one dynamic pool; each slot holds up to TEN unfinished claims. There is no mandatory pair of two.
- External AI session loop: fetch + merge `main` → repair tickets first (`node scripts/writer-repair.mjs next --writer Wn --session s`) → confirmed IDs (`node scripts/continuous-writer.mjs assigned …`) → original native-language drafts (1–10) → Writer QA → push the same own Writer branch → Autopilot submits and refills → repeat. No GitHub Run click per batch.
- Unfinished claims survive network failures and quota pauses and are resumed by the SAME session and branch. SUBMITTED drafts are hash-locked; corrections only through repair tickets (`docs/AI-WRITER-REPAIR-LOOP.md`).
- The Autopilot never generates text and never publishes. Publication is done by the standing-policy Auto Publisher (`docs/AUTO-PUBLISHER.md`) after automated QA, two URLs per run with Live QA; Supporting pages wait for a PUBLISHED Hub.
