# AI Writer Self-Repair — /global (W1/W2/W3)

**Objective:** An active AI Writer session corrects QA failures without a second AI Reviewer and without asking the website owner to approve every edit. Keep the same assigned slot, session, and Writer branch. Do not touch other Writers' claims, protected pages or published content.

## Work cycle for every ACTIVE Writer

1. Fetch/merge latest main safely, preserving your Writer branch's immutable original source files.
2. Prioritize current machine QA FAIL tickets **before** claiming and drafting another 10 new topics:

   ```sh
   node scripts/writer-repair.mjs queue --writer W2 --session w2-live
   node scripts/writer-repair.mjs next --writer W2 --session w2-live
   ```

   Replace W2/session with your **actual** confirmed identity. The tickets in `factory/publisher/report.json` come from the trusted main Publisher and include exact failed gates and immutable source SHA. If report says `REPAIR_REPORT_STALE`, the publisher needs to regenerate it; never construct an approval or modify a report by hand.

3. For `state=REPAIR`: read the current source at `current_source_path` from the exact source commit, read its Matrix row and the ticket's `details`. Use your own active AI model to research and **genuinely rewrite** only what failed. For legal/safety claims, corroborate with real official sources cited in the same paragraph, or remove an unsupported claim. Never invent a source, fabricate a price, dilute safety advice, pad words, manipulate semantic duplicates or alter QA thresholds.
4. Save a NEW JSON article at the exact `revision_path` shown by the ticket (r2, then r3, then r4 on subsequent genuine failures). Preserve `matrix_id`, `proposed_url`, locale, writer_session, truthful flags and contextual structure. NEVER overwrite the original SUBMITTED draft or an earlier revision.
5. Run:
   ```sh
   node scripts/writer-repair.mjs check --writer W2 --session w2-live --file factory/external-writers/inbox/W2/revisions/EN-H01.r2.json
   node scripts/writer-lanes.mjs verify-all
   ```
   Use the **actual file path** reported by the repair ticket. If QA fails, the **same active AI** must read `issues`, rewrite, and re-run QA, rather than changing the scoring code or pretending PASS.
6. Push the corrected revision on your own `writer/wN-...` branch with its existing request file, under a real open Writer PR. The trusted `Global Dynamic Writer Autopilot` only accepts a green Writer QA commit and matches `REPAIR` task + exact current SHA + same Writer/session. The coordinator records the new immutable SHA in claims; then the Auto Publisher re-evaluates G1–G5 and G7 with current published/queued content. The corrected article only enters the publish queue if truly eligible.
7. Refresh main, repeat until no repair tickets remain. Then continue the normal batch of up to 10 new topics while quota/session is active.

## Rules and stop conditions

- Maximum three **accepted** repairs per article. Then `ESCALATED_MAX_ATTEMPTS`, not an infinite AI rewrite loop.
- `HUMAN_REVIEW_REQUIRED` (PRICE/LEGAL/SAFETY) means stop automated publication; arrange genuine facts approval, never forge one. `WAIT_PARENT` and `WAIT_STAGE` do not call for rewriting the text.
- A Writer that reaches quota may signal `PAUSED_QUOTA`; another provider may claim a legitimately available W1/W2/W3 slot but cannot silently steal the source of a submitted article. The same session resumes its own pending repair once active.
- A failed live site deployment is an infrastructure problem: publisher PAUSE and rollback stay in effect until diagnosis and authorized resumption. Never treat a site deployment error as a reason to rewrite a correct article.
- GitHub Actions computes QA, routing, immutable evidence and publishing; **it has no AI generation API**. This is autonomous correction *inside an active external AI Writer session*. A truly unattended self-writing/rewrite agent additionally needs a configured model service, credentials, budget, and a permitted runner. Do not claim such a service already exists.
