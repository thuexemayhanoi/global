# AI Writer self-repair — /global (W1/W2/W3)

**Objective:** an active AI Writer session corrects its own QA failures without a second AI Reviewer and without asking the website owner to approve every edit. Keep the same slot, session and Writer branch. Never touch other Writers' claims, protected drafts or published content. Full operating manual: `docs/CURRENT-WORKFLOW.md`.

## Two different situations

| When QA fails | What it is | What the Writer does |
|---|---|---|
| **Before submission** — `node scripts/writer-lanes.mjs verify-all` or the Writer QA check fails on a draft that is still CLAIMED | a normal draft fix | edit the **same** file `factory/external-writers/inbox/Wn/<ID>.json`, re-run QA, push. No revision file, no ticket. |
| **After submission** — the Auto Publisher's automated QA fails a SUBMITTED draft | a repair | write a NEW revision `factory/external-writers/inbox/Wn/revisions/<ID>.rN.json` for a repair ticket. The submitted file is never edited (Writer QA rejects it with `IMMUTABLE_SUBMITTED_DRAFT_CHANGED`). |

## Work cycle for every ACTIVE Writer

1. Fetch and merge the latest `main`; keep every submitted file byte-identical.
2. Handle repair tickets **before** claiming or drafting new topics:

   ```sh
   node scripts/writer-repair.mjs queue --writer W2 --session w2-live
   node scripts/writer-repair.mjs next  --writer W2 --session w2-live
   ```

   Use your **own** slot and session; both are required, and the CLI never shows another Writer's ticket for `next`/`check`. Tickets come from `factory/publisher/report.json`, written only by the trusted publisher, and are bound to the exact source SHA-256. If the CLI says `REPAIR_REPORT_STALE` or `NO_CURRENT_TICKET`, wait for the next publisher run; never write or edit a report.
3. For `state=REPAIR`: read the submitted text at the ticket's `source_commit` and `current_source_path`, its Matrix row and the ticket's `details`. Use your own model to research and **genuinely rewrite** only what failed. For a legal/safety claim, cite a real official source in the same paragraph or remove the claim. Never invent a source, add a price, dilute safety advice, pad words, game the duplicate check or change QA thresholds.
4. Save the corrected article at exactly the ticket's `revision_path` (r2, then r3, then r4). Keep `matrix_id`, `proposed_url`, `locale`, `writer_session` and the truthful flags. Never overwrite the submitted draft or an earlier revision.
5. Check:

   ```sh
   node scripts/writer-repair.mjs check --writer W2 --session w2-live --file factory/external-writers/inbox/W2/revisions/<ID>.r2.json
   node scripts/writer-lanes.mjs verify-all
   ```

   `check` runs Writer QA plus a local preflight of every publisher gate. It fails when Writer QA fails, when a fixable gate still fails, or when the revision introduces a human-review hold (for example a money amount). It refuses another Writer's draft (`NOT_YOUR_DRAFT`), an unsubmitted draft (`NOT_SUBMITTED`: fix it in place), a held/escalated draft (`NOT_REPAIRABLE`) and a wrong path (`WRONG_REVISION_PATH`). If it fails, the **same** session reads `issues`, rewrites and checks again.
6. Push the revision on your own `writer/wN-…` branch (request file present, Writer PR open). After green Writer QA the trusted **Global Dynamic Writer Autopilot** accepts it only for a current REPAIR ticket with the exact hash, Writer and session; it records the new SHA-256 and keeps the history. The Auto Publisher then re-evaluates G1–G5 and G7 against current published and queued content; the revision publishes only if it truly passes.
7. Refresh `main`; repeat until no ticket is left, then continue with new topics while the session has quota.

## Rules and stop conditions

- Maximum three **accepted** repairs per article (r2–r4). Then `ESCALATED_MAX_ATTEMPTS`; no endless rewrite loop.
- `HUMAN_REVIEW_REQUIRED` (LEGAL/SAFETY/PRICE topic or money amounts) stops automated publication; a human with real evidence decides. Never forge an approval. `WAIT_PARENT` and `WAIT_STAGE` are not text problems.
- A Writer that runs out of quota signals `PAUSED_QUOTA`; its tickets wait for the **same** session. Another agent may take a free slot but can never take over a submitted draft or its repair.
- A failed live deployment is an infrastructure problem: the publisher PAUSE and any rollback stay until diagnosis and a confirmed resume. Never rewrite a correct article because of a deployment or QA-tool error.
- GitHub Actions computes QA, routing, immutable evidence and publishing; **it has no AI generation API**. Repairs happen only inside an active external AI Writer session. A truly unattended rewriting agent would need a model service, credentials and budget, which this repository deliberately does not have. Never claim otherwise.
