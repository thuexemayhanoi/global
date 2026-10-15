# Independent editorial reviews

One JSON file per draft version: `<MATRIX-ID>.<first 12 hex of the draft SHA-256>.json`. Verdict is PASS, REVISE or FAIL (REVISE/FAIL must list `issues`). Schema and rules: `docs/AUTO-PUBLISHER.md` § Independent review intake.

- **Who:** any AI agent session other than the one that wrote the draft.
- **What it binds to:** the exact `source_sha256` of the SUBMITTED draft in `factory/external-writers/claims.json`.
- **Honesty:** never mark a review as human.
- **How it arrives:** push on `review/<agent>-<session>`. The Auto Publisher ingests valid reviews and keeps the first accepted one.
