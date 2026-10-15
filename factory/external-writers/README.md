# External Writers W1/W2/W3 — shared dynamic pool

Read `AGENTS.md` § CURRENT PRODUCTION WORKFLOW and `docs/CURRENT-WORKFLOW.md` first. Prompts to paste into an AI session: `prompts/W1.md`, `prompts/W2.md`, `prompts/W3.md`.

- W1/W2/W3 are seats for external AI sessions (any provider). One session per slot, each holding 1–10 unfinished claims on its own stable branch `writer/wN-<session>`; slots work concurrently and never receive the same ID. One active W1 can write every eligible topic.
- Write only confirmed IDs after fetching `main`; push 1–10 native-language drafts into your own `inbox/Wn/`. Green Writer QA lets the Autopilot submit the verified drafts (with SHA-256 evidence) and refill to ten. Keep one draft PR open for your branch; it is never merged.
- A draft that fails Writer QA before submission is fixed in place. A SUBMITTED draft is immutable (Writer QA locks it by hash); its corrections come only from repair tickets as `inbox/Wn/revisions/<ID>.rN.json` (`docs/AI-WRITER-REPAIR-LOOP.md`).
- Publication is done by the standing-policy Auto Publisher after automated QA, two URLs per run with Live QA, never by a Writer.
- Preserve the 14 protected legacy drafts and the EN-H01/DE-H01 editorial pilots (`protected-drafts.json`). Never force-push or edit `claims.json`/`slots.json` from a Writer branch.
- Below 30 free topics a Writer may stage researched proposals in `factory/topic-refill/proposals/<Wn>/<batch>.json` (validated by `scripts/writer-refill.mjs`); they do not become Matrix rows on their own.
- No model API in Actions; no NAP, price, sitemap or URL edits.
