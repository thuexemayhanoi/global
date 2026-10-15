# Topic research: crash-safe checkpoint, auto push and recovery

Research sessions run in AI agents (Claude, Mistral, ChatGPT, Gemini …) whose environment can vanish at any moment. This runbook makes the loop **research 10 topics → QA → commit → push → verify → checkpoint → next 10** survive that. It does not change the Topic Factory: the intake schema, gates R1–R8 / F1–F8 / T1–T10, duplicate layers L1–L5, the 1,000-per-locale cap, the SHA-256 research log, Writer claims, the Matrix and publishing are untouched. Nothing here calls a model or an API, and no secret beyond the git credentials the agent already uses.

**GitHub is the only source of truth.** A local clone, a chat transcript or a remembered plan is never trusted over what is on the research branch.

## The loop

```
node scripts/topic-research.mjs hints                                   # where research is still needed (read-only)
node scripts/topic-research.mjs resume  --agent claude --session 20261015 # first thing in every session, also after a crash
… research 10 real topics with real sources into a draft file …
node scripts/topic-research.mjs check   --agent claude --session 20261015 --draft drafts/b.json   # read-only QA
node scripts/topic-research.mjs commit  --agent claude --session 20261015 --draft drafts/b.json   # QA + commit + push + verify
```

`commit` runs four QA phases, writes **one commit holding the batch file and the checkpoint**, pushes `research/<agent>-<session>` without force, and prints `SAVED` only after GitHub itself confirms it (see below). Then start the next 10.

- A normal batch is exactly **10 real topics**. A short batch (1–9) is accepted only with `--final` when the session is about to end; it is never padded and never filled with invented data.
- Drafts are an array of candidates (or `{candidates:[…]}`) in the schema of `factory/topic-research/README.md`. Keep them outside the tree or in `factory/topic-research/drafts/` (git-ignored). The agent name and session in the branch decide who the batch belongs to; a draft naming another session is refused.
- A topic that already exists (in main's research log, in a pushed batch of this session, or in another session's in-flight batch) is skipped and reported, never researched or written twice.
- **QA FAIL is fixed first.** Nothing is committed or pushed while a candidate fails, unless `--quarantine-failures` is given: then only the passing topics are pushed and each failure stays in the checkpoint under `unresolved` (never in a batch, never in the intake) until it is repaired or explicitly `--abandon`ed.

### The four QA phases

| Phase | Checks (existing gates plus a few cross-batch ones) |
|---|---|
| Duplicate | F5 layers L1–L5 against the Matrix, the topical map, published URLs, main's research log, earlier batches of this session and other sessions' un-ingested batches (`X_DUP_CROSS_SESSION`) |
| Intent | search intent, `intent_rationale`, `content_angle` (and `X_INTENT_ANGLE_COPY`: the angle must not just repeat the title or rationale), no transactional rental intent, reserved intents |
| Source | ≥2 traceable HTTPS references with `checked_on`, no future or post-research dates, no repeated URL (`X_SRC_*`), keyword evidence stays `NOT_VALIDATED` |
| Schema | batch/candidate schema, locale and domain rules, Hub or `ARCHITECTURE_BLOCKED` placement, per-locale cap, T1–T10 |

Failing topics are explained per phase in `check` output (`--json` for tooling).

## What `SAVED` means

`SAVED` is printed only when all of this holds after the push: `git ls-remote` shows the branch at our commit (or a descendant of it), the batch and checkpoint blobs on GitHub have the digests we wrote, and the checkpoint verifies against the batch bytes. Transient failures (HTTP 5xx, resets, locks) are retried with back-off. If GitHub cannot be reached or refuses, the result is `NOT_SAVED` / `COMMITTED_LOCAL` with the reason and exit code 1, and the next command pushes it first. Never tell anyone data is saved before you have seen `SAVED` (or `verify` exit 0).

## Files

| Path | Purpose |
|---|---|
| `factory/topic-research/batches/<agent>-<session>-NNNN.json` | the batch, byte-identical to what the Topic Factory ingests (one file per 10 topics) |
| `factory/topic-research/checkpoints/<agent>-<session>.json` | the session checkpoint; **never ingested, never a Matrix row or article**, written in the same commit as each batch |
| `data/seo/topic-factory/research-log.json` (main) | the Factory's SHA-256 log of ingested batches; the authority on what main has accepted |

Checkpoint fields: `agent`, `session`, `branch`, `totals` (`researched`, `qa_pass`, `qa_fail`, `qa_fail_open`, `pushed`, `pending_push`), `coverage` per locale and domain, `last_batch`, `batches[]` (`seq`, `file`, `sha256`, `candidates`, `state` `COMMITTED`→`PUSHED`, `commit_sha`, per-topic locale/domain/`ta_id`), `last_commit_sha` (the parent of the commit that wrote it), `base_main_sha`, `contract` (SHA-256 of `AGENTS.md` and this factory doc at the time), `next_batch`, `unresolved` (QA FAIL, blockers, notes), `history`, `updated_at`.

## Recovery after a lost session or machine

Start with **`resume`** in every session. It fetches `main` and the research branches, reads `AGENTS.md`, the checkpoint and the research log, compares them with the real files on GitHub and prints what to do. It only reads; `--apply` prepares the local branch.

```
node scripts/topic-research.mjs sessions                                   # which sessions exist and how far they got
node scripts/topic-research.mjs resume --agent claude --session 20261015 --apply
```

What it decides, and why you can trust it:

- **The checkpoint is trusted only if it is valid, its recorded SHA-256 matches the batch bytes and it is bound to the commit history.** Otherwise the state is re-derived from the batch files on GitHub (`CONTENT_ONLY`), and the next commit rewrites the checkpoint. A checkpoint that disagrees with GitHub is never believed.
- **Ingested batches** are recognised by SHA-256 in main's research log; their TA IDs flow back into the checkpoint (`checkpoint --sync-ids`).
- **`do_not_research`** lists every topic key already accepted, pushed, or in flight; those are never researched again, and only the missing topics continue from the next batch number.
- **Lost environment:** a fresh clone + `resume --apply` recreates the local branch from GitHub (`CREATE_FROM_REMOTE`). Only unpushed local work is lost, and `commit` always pushes before the next batch.
- **Crash after commit, before push:** the local-only commit is QA-checked again and pushed first (`push-pending`, or automatically at the next `commit`).
- **Stale local branch:** fast-forwarded to GitHub. **Diverged or unrelated history** (two machines on one session, a rewritten branch): the local ref is backed up under `refs/backup/<branch>/<time>`, local is reset to GitHub, and the local-only batches are replayed by content, renumbered, de-duplicated and re-QA'd (a replayed topic that now fails is quarantined in the checkpoint). Pushed history is never rewritten and nothing already on GitHub is deleted.
- **Push race:** a rejected push is reconciled by content and retried; never forced.
- **Factory has not ingested yet:** `INGEST_PENDING` is only a warning; the data is safe on GitHub. The Factory ingests a branch's not-yet-logged batch files whenever a push to that branch passes Topic Research QA (replay-safe by SHA-256). If a Factory run was superseded by another session's run, push a checkpoint-only commit (`checkpoint --note "re-trigger ingest"`): it passes QA again and the Factory picks the batch up. The scheduled six-hourly run does not ingest research branches.
- **Contract changed** (`CONTRACT_CHANGED`) or **READ_CONTRACT** action: re-read `AGENTS.md` and `docs/TOPIC-FACTORY.md` on main before researching.

`verify --agent … --session …` exits 0 only if the branch exists on GitHub, local equals GitHub, nothing is unpushed and the checkpoint is verified.

## Safety invariants

- One branch per session, `research/<agent>-<session>`, written only by plain (non-force) pushes; no tag, no delete, no other ref. `--force` does not exist.
- A session writes only its own `<agent>-<session>-NNNN.json` batches and its own checkpoint. It never touches another session's files, `main`, the Matrix, Writer claims, locale maps, URLs or `PUBLISHED` content.
- Commits are made with git plumbing on the session ref, so the working tree, the index and the checked-out branch are never modified. If the session branch is checked out, the CLI refuses (`BRANCH_CHECKED_OUT`).
- QA data always comes from a fresh `origin/main`; there is no merge of main into research branches.
- A QA-failed batch is never imported: Topic Research QA stays read-only and the Factory ingests only green pushes.
- Concurrent commands on one clone are serialised by a lock file in `.git` (stale locks from dead processes are cleared).

## CI

`Topic Research QA` runs `validate-batches` (unchanged) and then `verify-tree`: on a `research/<agent>-<session>` branch that uses a checkpoint, its own batches and checkpoint must agree byte for byte, it may not carry another session's changed files, and it may change nothing outside its own two kinds of file. Files inherited unchanged from `main` are not blamed on the branch. A legacy session (hand-pushed batch, no checkpoint) keeps its old contract and only gets warnings. Non-research branches are skipped.

`tests/topic-research-core.test.mjs` (pure logic) and `tests/topic-research-recovery.test.mjs` (real git, the real CLI and the real Topic Factory ingest against a throw-away origin with injected outages and concurrent writers) cover environment loss, recovery, commit conflicts, replay, quarantine, duplicates across batches and sessions, and the no-force / own-files-only guarantees. Both run in `Static SEO QA`.

## Honest limits

- GitHub Actions cannot research or write. New topics exist only when an AI session with live web access produces them; this tooling makes that work durable, it does not create any.
- A session that dies between two commits loses only the topics it had not yet committed (at most 9–10 researched but unpushed topics): that is why every batch is pushed immediately and drafts are never accumulated.
- Layer L5 similarity is lexical; keyword evidence stays `NOT_VALIDATED`; never invent volumes, rankings or sources, and never pad a batch to reach 10.
- Pushing to a research branch needs write permission for that branch. If the credentials are denied the CLI reports `NOT_SAVED` and the exact git error; it does not pretend completion.
