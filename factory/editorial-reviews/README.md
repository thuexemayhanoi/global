# Independent editorial reviews — RETIRED (historical)

On 2026-10-15 the owner retired the independent AI Reviewer (gate G6). Publication eligibility is decided by automated QA (G1–G5 + G7) in `scripts/auto-publisher-core.mjs`; corrections come from automated repair tickets (`docs/AI-WRITER-REPAIR-LOOP.md`). Nothing in the current pipeline reads, requires or waits for a file in this directory, and no workflow ingests reviews any more.

Historical format, kept so old records stay verifiable (`node scripts/auto-publisher.mjs validate-reviews`): one JSON file per draft version, `<MATRIX-ID>.<first 12 hex of the draft SHA-256>.json`, verdict PASS, REVISE or FAIL bound to the exact `source_sha256` of the SUBMITTED draft, written by a session other than the Writer's, never marked as human.

Do not add new reviews here and do not build a replacement AI reviewer, evaluator or judge.
