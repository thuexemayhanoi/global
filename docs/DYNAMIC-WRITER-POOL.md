# DYNAMIC WRITER POOL — refer to docs/ZERO-CLICK-WRITER.md

This document describes the manual **fallback** mechanism. The DEFAULT workflow is now zero-click: one-time branch Writer request push triggers GitHub Actions Writer QA and automatic centralized claim; every subsequent green pair push submits current draft pair and reserves the next pair.

DO NOT instruct an external AI to wait for its owner to press "Run workflow" for claim/submit. Read docs/ZERO-CLICK-WRITER.md instead. This manual workflow is for recovery only; no human per-batch approval is needed for DRAFT creation. Publication still requires genuine editorial/owner approval.

# DYNAMIC WRITER POOL — /global

## One Writer or three Writers
One shared queue contains 120 planned Matrix IDs across 10 languages. A single W1, W2, or W3 session may claim ANY eligible topic irrespective of historical assignments.json (40 each). If multiple sessions are active they claim from the same serialized ledger on main.

Existing 14 W1 drafts on writer/w1-vibe-20261014 (PR #17) are protected by factory/external-writers/protected-drafts.json. Never reassign, rewrite, reset or delete them. Original assignments.json is historical provenance only, NOT an exclusive lock.

The canonical claim ledger is factory/external-writers/claims.json on main. ONLY GitHub Actions workflow Global Dynamic Writer Pool may modify it. The workflow serializes all claim/submit requests. A preview, local unmerged claim, or chat message does NOT reserve an ID.

## Live external AI loop
Set a stable W1/W2/W3 writer lane, session label and a matching writer/w1-*, writer/w2-* or writer/w3-* branch. Resume an existing branch/session after any interruption. For W1 legacy PR, resume writer/w1-vibe-20261014 with session w1-vibe-20261014.

1. Fetch and merge the latest origin/main into your existing Writer branch without force push or reset. Read AGENTS.md, this document, the current Matrix and your own inbox.
2. Preview: node scripts/continuous-writer.mjs next --writer W1 --session w1-mistral-20261014 --branch writer/w1-mistral-20261014
3. If CLAIM_REQUIRED, dispatch serialized reservation on main:
   gh workflow run writer-pool.yml --ref main -f action=claim -f writer=W1 -f session=w1-mistral-20261014 -f branch=writer/w1-mistral-20261014 -f count=2
4. WAIT for this exact GitHub Actions run to conclude SUCCESS. On error read the log and retry safely. Never write preview IDs.
5. Fetch/merge origin/main again and confirm:
   node scripts/continuous-writer.mjs assigned --writer W1 --session w1-mistral-20261014 --branch writer/w1-mistral-20261014
6. Only if WRITE_NEXT_PAIR, write the confirmed 1–2 IDs in factory/external-writers/inbox/W1/<ID>.json using natural native-language researched content. The historical legacy owner of the ID does not matter.
7. Run node scripts/writer-lanes.mjs verify-all and the Writer pool / continuous / external tests; fix QA, preserve false human-review flags.
8. Commit and push ONLY your own Writer inbox JSON, open/update a PR against main, wait for exact pushed SHA writer-qa GREEN. Do not merge or publish.
9. Mark submitted only after real draft JSON exists on remote branch AND the draft PR is open:
   gh workflow run writer-pool.yml --ref main -f action=submit -f writer=W1 -f session=w1-mistral-20261014 -f branch=writer/w1-mistral-20261014 -f ids=EN-H02,FR-H02
   Replace example IDs with the ACTUAL confirmed claimed ID(s). Wait Actions SUCCESS.
10. Fetch/merge main and IMMEDIATELY repeat from step 2 while the AI session is active and eligible topics exist. Do not stop after a pair, report, push or green CI.

For W2/W3 substitute the appropriate writer, branch and session. All three use the SAME shared queue and main ledger.

## Safeguards and statuses
- CLAIM_REQUIRED = only a suggestion; MUST reserve via main Actions first.
- WRITE_NEXT_PAIR = confirmed claimed topics; writer may produce drafts.
- REPAIR_DRAFT = QA failed; fix, never skip.
- SUBMIT_CLAIMS = drafts exist, QA/push/open PR then action=submit.
- WAIT_PARENT_PUBLICATION = remaining Supporting need their parent Hub PUBLISHED, not merely drafted. Do not spin endlessly.
- AWAIT_CLAIMS_OR_REVIEW = topics reserved or awaiting editorial action; do not steal or guess.
- COMPLETE = all 120 Matrix topics genuinely PUBLISHED, NOT merely in an inbox.

Repeated claim by the same session resumes outstanding IDs; SUBMITTED remains permanently protected from duplicate assignment until coordinator action. Release needs explicit coordinator review, reason and confirmation, and cannot release an ID with a draft still on the original branch. Do not force push, reset, publish unpublished content, edit production URLs, sitemap, CNAME or other repositories.

Publisher stays gated by owner-verified facts, search intent and exact approval manifest. No LLM is called in GitHub Actions. The external AI session must be alive for writing to continue; Github cannot revive expired chat sessions.
