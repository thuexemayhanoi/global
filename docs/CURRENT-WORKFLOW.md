# Current workflow — /global (effective 2026-10-15)

The binding rules are in `AGENTS.md` § CURRENT PRODUCTION WORKFLOW — AUTHORITATIVE CONTRACT. This page is the operating manual for every external AI Writer (Claude, ChatGPT, Gemini or any other agent) and for the operator. Repository: `thuexemayhanoi/global` only. Production: https://global.rentbikehanoi.com/.

## 1. The pipeline

```
Topic Factory ──▶ shared topic queue (Matrix IDEA rows)
                          │ claim ≤10 per slot (Writer Autopilot, serialized on main)
                          ▼
            W1 / W2 / W3 external AI sessions write drafts on their own branch
                          │ push
                          ▼
            Writer QA (Node.js) ── FAIL before submission → same Writer fixes the draft in place
                          │ PASS
                          ▼
            Writer Autopilot: SUBMITTED + exact commit/SHA-256, refill the slot
                          │
                          ▼
            Auto Publisher: automated QA G1–G5 + G7 on every SUBMITTED draft
              ├─ fixable FAIL ─▶ Repair Queue ─▶ same session writes revisions/<ID>.rN.json ─▶ back to Writer QA
              ├─ LEGAL / SAFETY / PRICE / money ─▶ HUMAN_REVIEW_REQUIRED (held for a human)
              ├─ WAIT_PARENT / WAIT_STAGE ─▶ waits, no rewriting
              └─ APPROVED_BY_POLICY ─▶ Publish Queue
                          │ ≤2 NEW URLs per run
                          ▼
            build + SEO/fact gates → commit main → GitHub Pages → Live QA
              ├─ PASS ─▶ next 2 (dispatched at once) ─▶ … until the queue is empty
              ├─ FAIL ─▶ revert the publish commit, PAUSE
              └─ INCONCLUSIVE ─▶ PAUSE without rollback, re-check later
```

### What runs by itself and what needs an AI session

| Step | Runs automatically (GitHub Actions, Node.js only) | Needs an ACTIVE external AI Writer session |
|---|---|---|
| Topic refill | Topic Factory after each green research batch (and a 6-hourly schedule), ≤50 IDEA rows per run, from already-researched candidates | new research batches (`research/*` branches) |
| Claims and refill | Writer Autopilot after each green Writer push | the push |
| Writing drafts | — | **yes** |
| Writer QA | `writer-qa.yml` on every Writer push | run it locally before pushing |
| Automated QA, repair tickets | Auto Publisher after every Autopilot run (and an hourly schedule) | — |
| Repairing a draft | — | **yes**, the session that submitted it |
| Publishing 2 + Live QA + next 2 | Auto Publisher | — |
| Lifting a PAUSE | — | operator: confirmed `resume` dispatch |

There is no AI model in GitHub Actions. When no Writer session is active, already-eligible drafts are still published, but **no new text is written and no repair is made**. The system does not write 24/7 on its own.

Schedules are a fallback only. GitHub runs `schedule` triggers best effort (it may delay or skip them), and by 2026-10-15 04:22 UTC no scheduled run had fired in this repository at all. The triggers that actually move work are a Writer push (Writer QA → Autopilot → Auto Publisher), a research batch (Topic Research QA → Topic Factory), the publisher's own drain dispatch, and an operator dispatch. Never wait on a schedule: dispatch the workflow.

## 2. Writer slots

W1, W2 and W3 are seats, not providers. Any agent with repository access and quota can take a free seat and write in every locale it writes natively.

| State | Meaning | New claims |
|---|---|---|
| `AVAILABLE` | no unfinished claims | any new session may take it |
| `ACTIVE` | the holding session is writing | yes |
| `PAUSED_QUOTA` | the holder reported exhausted quota | no; finished drafts are still submitted |
| `OFFLINE` | the holder reported (or the operator confirmed) that the session ended | no |
| `RECOVERING` | the paused holder came back on the same session and branch | yes |

- One session per slot. A slot holds at most **10 unfinished claims**. Slots write at the same time and never receive the same ID.
- Your identity is fixed for the life of the session: slot `Wn`, a stable session id (3–80 of `A-Za-z0-9_-`), branch `writer/wn-<session>`, request file `factory/external-writers/requests/Wn/<session>.json`.
- `node scripts/writer-pool.mjs slots` shows the live view. Never take a slot whose open claims belong to another session.

## 3. Start a new session

```sh
node scripts/writer-pool.mjs slots                                   # pick an AVAILABLE slot, e.g. W3
git fetch origin main && git checkout -b writer/w3-<session> origin/main
node scripts/writer-request.mjs start --writer W3 --session <session> --branch writer/w3-<session>
git add factory/external-writers/requests/W3/<session>.json && git commit -m "W3: start session" && git push -u origin writer/w3-<session>
```

Open one draft PR from your branch to `main` (it is never merged; the Autopilot needs it before it records drafts). Wait for **External Writer Draft QA** and then **Global Dynamic Writer Autopilot** to go green: you now hold up to 10 claims.

Optional request fields: `"agent": "claude"` (label), `"slot_state"`, `"slot_reason"`, `"claim_new": false` (submit/repair without taking new topics).

## 4. The loop (repeat while the session has quota)

1. `git fetch origin main && git merge origin/main` (never rebase, reset or force-push your branch).
2. **Repairs first:** `node scripts/writer-repair.mjs next --writer W3 --session <session>`. If it returns a ticket, do § 5 before new topics.
3. Confirm your IDs: `node scripts/continuous-writer.mjs assigned --writer W3 --session <session> --branch writer/w3-<session>`. Write **only** these IDs; a preview is never a claim.
4. Write 1–10 drafts as `factory/external-writers/inbox/W3/<ID>.json`: original native-language research, ≥1,000 words, ≥4 real H2 sections, ≥2 HTTPS sources you actually read, a contextual link to `/<ll>/` or `/<ll>/checklist/`, `facts_reviewed_by_human:false`, `serp_intent_checked:false`, `writer_session` = your session.
   - Nguyễn Tú NAP, hours and prices only by copying your locale's lines from `data/business/reference.localized.json`.
   - Any other price, fine, law/article number, licence-class threshold or penalty needs an **official** source linked in the **same paragraph**; otherwise leave it out. Money amounts and LEGAL/SAFETY/PRICE topics are held for a human in any case.
5. QA: `node scripts/writer-lanes.mjs verify-all` and `node --test tests/external-writers.test.mjs tests/continuous-writer.test.mjs tests/writer-pool.test.mjs tests/writer-pool-auto.test.mjs tests/writer-refill.test.mjs tests/writer-qa-lock.test.mjs`.
6. **A draft that fails before submission is fixed in place** (same file) and re-checked. No revision file, no ticket.
7. Commit and push your own branch. Wait for Writer QA and the Autopilot (both green). The finished drafts become SUBMITTED, the slot refills to 10. Go to step 1.

## 5. Repairs after submission

A SUBMITTED draft is immutable: Writer QA locks it by its SHA-256 and the publisher judges it from then on. If automated QA fails it on a fixable gate, the publisher issues a **repair ticket** for the session that submitted it.

| Ticket / situation | Meaning | What you do |
|---|---|---|
| `REPAIR` | G1_DRAFT_QA, G1_DEPTH, G3_OFFICIAL_EVIDENCE, G4_EDITORIAL or G5_CONTENT_DUPLICATES failed | write the next revision (below) |
| `HUMAN_REVIEW_REQUIRED` | LEGAL/SAFETY/PRICE topic or money amounts | nothing; a human decides with real evidence |
| `ESCALATED` | three accepted revisions still failed | stop and report; no fourth attempt |
| `WAIT_PARENT` / `WAIT_STAGE` | parent Hub not live / stage cap | nothing; this is not a text problem |
| `BLOCKED` | protected draft, missing source evidence | nothing; operator issue |

Repair steps:

```sh
node scripts/writer-repair.mjs next --writer W1 --session <session>      # ticket: id, gates, details, source_commit, revision_path
git show <source_commit>:<current_source_path>                            # the exact submitted text
# write a corrected copy at <revision_path>, e.g. factory/external-writers/inbox/W1/revisions/ES-H01.r2.json
node scripts/writer-repair.mjs check --writer W1 --session <session> --file <revision_path>
node scripts/writer-lanes.mjs verify-all
git add <revision_path> && git commit -m "W1: repair ES-H01 r2" && git push
```

- Fix exactly what the ticket names, with real research. Never invent a citation, pad words, soften safety advice or paraphrase only to dodge the duplicate check. If an official source cannot be found, remove or qualify the claim.
- Keep `matrix_id`, `proposed_url`, `locale` and `writer_session`. Never edit the submitted file or an earlier revision.
- After the green push the Autopilot records the new hash (history kept) and the publisher re-runs every gate (G1–G5, G7) on the revision. A repair never skips G3 or G5.
- At most r2, r3, r4. `check` refuses another Writer's draft, an unsubmitted draft, a held draft and a wrong path, and fails if your revision introduces a new hold (for example a money amount).

## 6. Example: ten drafts, published 2+2+2+2+2

1. W1 pushes 10 Hub drafts (ten locales, STANDARD topics). Writer QA is green; the Autopilot marks all 10 SUBMITTED with their SHA-256 and refills W1 with 10 new claims. W1 keeps writing.
2. The Autopilot's success starts an Auto Publisher run. Automated QA approves the drafts that pass every gate. The run takes **two** (Hubs first, then Matrix priority), commits them, deploys to GitHub Pages (about a minute in recent runs) and runs Live QA: both pages, the sitemap index and all 11 shards (main + 10 locales), every request cache-busted against the CDN, polling up to 20 minutes for deploy lag.
3. Live QA PASS is recorded; the run re-evaluates the queue from the latest `main` and immediately dispatches the next run. Runs 2, 3, 4 and 5 publish the other pairs the same way. Ten eligible drafts make five runs: 2+2+2+2+2. There is no hourly wait between pairs; the hourly schedule is only a fallback.
4. If two of the ten fail automated QA, they get repair tickets for W1 and the remaining eight publish as 2+2+2+2. The repaired drafts join a later pair once their revision passes.
5. Stage caps: PILOT allows 2 per locale; two clean live runs advance to RAMP (10 per locale), ten more to CONTINUOUS. A locale at its cap waits (`WAIT_STAGE`); its drafts are not dropped.

## 7. Quota, offline, resume, handover

- **Quota running out:** set `"slot_state":"PAUSED_QUOTA"`, a short `"slot_reason"` and `"claim_new":false` in your request file and push it together with any finished drafts. Finished drafts are submitted; no new topics come in; your unfinished claims stay yours.
- **Session ending:** the same with `"slot_state":"OFFLINE"`. If the agent cannot push any more, the operator records it with `writer-pool.yml` (`action=signal`, `state=OFFLINE`, `confirmed=true`, reason).
- **Coming back:** the **same** session on the **same** branch sets `"slot_state":"RECOVERING"` (or removes the field), merges `main`, does its repairs and finishes its claims. Nothing expired while it was away; no timer ever moves a claim.
- **Handover:** for a `PAUSED_QUOTA`/`OFFLINE` slot the operator runs `writer-pool.yml` with `action=handover`, `confirmed=true` and a reason. Only claims without a draft on the holder's branch are released to the shared queue; drafted work stays with its owner. SUBMITTED drafts and their repair tickets are never transferred: they wait for the same session.
- **Another agent wants to write:** take another `AVAILABLE` slot. Never write into another session's slot, inbox or claims.

## 8. Auto Publisher operations (operator)

| Live QA verdict | Meaning | Automatic action |
|---|---|---|
| PASS | pages, sitemap index and every shard are correct | record, dispatch the next pair |
| FAIL | production serves something wrong (HTTP, canonical, lang, noindex, title, provenance, sitemap) | revert the publish commit, PAUSE |
| INCONCLUSIVE | the QA tool or the network could not decide | PAUSE without rollback; the next runs re-check the pages (`LIVE_QA_RECOVERY`) and record the result, but never resume |

**Resume after a pause** (`factory/publisher/state.json` → `pause_reason`):

1. Find and fix the cause. Confirm the latest `pages build and deployment` run succeeded.
2. Run **Post-Publish Live HTTP QA** (`post-publish-qa.yml`) and check it passes: every PUBLISHED URL, the sitemap index and all shards, robots, 404, frozen SEO fingerprints.
3. Dispatch **Global Auto Publisher** with `action=resume`, `confirmed=true` and a reason of at least 12 characters.
4. Dispatch `action=publish` (do not wait for the hourly schedule) and watch the pilot pair through Live QA.

Other actions: `action=pause` (reason), `action=scan` (read-only eligibility), `action=publish` with optional `ids`.

| Path | Status | Approval |
|---|---|---|
| Standing-policy Auto Publisher (`auto-publisher.yml`) | **CURRENT** | `approvals/standing-policy-20261015.json`; G1–G5 + G7, ≤2 per run, Live QA |
| Manual Publisher (`scripts/seo/publish-batch.mjs`, `docs/BATCH-PUBLISHING.md`) | MANUAL PATH | exact owner approval manifest on a reviewed feature branch |

## 9. Troubleshooting

| Message | Cause | Fix |
|---|---|---|
| `FORBIDDEN WRITER PATH` | your branch changes files outside your own inbox/request/proposals | remove those changes; merge `main` |
| `IMMUTABLE_SUBMITTED_DRAFT_CHANGED` | you edited a SUBMITTED draft | restore it: `git checkout <source_commit> -- <file>`; corrections go through a repair ticket |
| `REVISION_WITHOUT_SUBMITTED_DRAFT` | revision file for a draft that is not SUBMITTED | fix the draft in place; if it was submitted, merge `main` first |
| `REVISION_NUMBER` / `WRONG_REVISION_PATH` | wrong rN | merge `main`, use the ticket's `revision_path` |
| `NO_CURRENT_TICKET` / `REPAIR_REPORT_STALE` | the publisher has not evaluated the current hash yet | wait for the publisher run that follows your Autopilot run (the hourly schedule is best effort) |
| `NOT_REPAIRABLE` / `REPAIR_TICKET_REQUIRED` | the draft is held, escalated or waiting | do not revise; remove the revision file |
| `NOT_SUBMITTED` | the draft is still CLAIMED | fix it in place, no revision |
| `AUTO_POOL_WAIT_PR` | no open PR for your Writer branch | open one draft PR to `main`, push again |
| `AUTO_POOL_NOT_OPTED_IN` | no request file on the branch | `writer-request.mjs start …`, push |
| `SLOT_HELD_BY_OTHER_SESSION` / `WRITER_SLOT_HELD` | the slot belongs to another session | pick an `AVAILABLE` slot |
| Autopilot `SAFE_STOP: retry budget exhausted` | `main` moved three times during your run | push a small new commit to the same branch later |
| `WAIT_PARENT` | the parent Hub is not live | write/repair the Hub; the Supporting draft publishes after it |
| `WAIT_STAGE` | stage cap for that locale | wait for clean live runs |
| `HUMAN_REVIEW_REQUIRED` | LEGAL/SAFETY/PRICE or money amounts | owner/human with real evidence; not a Writer task |
| Publisher `PAUSED` | Live QA FAIL/INCONCLUSIVE, a failed gate, or an operator pause | § 8 |
| `LIVE_QA_RECOVERY` | an earlier publication has no recorded live result | nothing; the run re-checks it before staging anything new |
| `CONCURRENT_MAIN_UPDATE` | another workflow pushed to `main` | automatic recompute (three attempts), never a force-push |

## 10. Commands

```sh
node scripts/writer-pool.mjs slots                     # slot states
node scripts/continuous-writer.mjs assigned --writer Wn --session s --branch writer/wn-s
node scripts/writer-lanes.mjs verify-all               # Writer QA
node scripts/writer-repair.mjs next  --writer Wn --session s
node scripts/writer-repair.mjs check --writer Wn --session s --file <revision_path>
node scripts/writer-repair.mjs queue --include-held true   # every ticket, read-only
node scripts/auto-publisher.mjs scan                   # eligibility of every SUBMITTED draft, read-only
node scripts/auto-publisher.mjs drain-decision         # would the next pair start? read-only
node scripts/topic-factory.mjs status                  # topics + publication queue, read-only
```

## 11. Where the state lives

| File | Written by | Content |
|---|---|---|
| `factory/external-writers/claims.json` | Writer Autopilot / `writer-pool.yml` | claims, SUBMITTED hashes, revision history |
| `factory/external-writers/slots.json` | same | slot states |
| `factory/publisher/report.json` | Auto Publisher | decision and failed gates per draft hash (source of repair tickets) |
| `factory/publisher/state.json` | Auto Publisher | stage, pause, publications and their live QA results |
| `data/seo/master-matrix.json` | Topic Factory / publishers | topics and PUBLISHED URLs |
| `docs/CONTENT-FACTORY-DASHBOARD.md` | Topic Factory and Auto Publisher (in the publish commit and again once the live QA result is on `main`), from data | every queue state; never edit by hand |

## 12. Legacy documents

Kept for history; where they conflict with this page, this page and `AGENTS.md` win: `docs/GLOBAL-CONTENT-FACTORY-TURBO.md` (slot/claim mechanics, still accurate), `docs/CONTINUOUS-WRITER.md`, `docs/ZERO-CLICK-WRITER.md`, `docs/DYNAMIC-WRITER-POOL.md`, `docs/CONTENT-FACTORY.md` and `docs/BATCH-PUBLISHING.md` (manual path), `factory/editorial-reviews/` (retired AI reviewer). The audit behind this version: `docs/WORKFLOW-AUDIT-20261015.md`.
