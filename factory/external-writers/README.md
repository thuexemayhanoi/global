# Global Dynamic Writer Pool — TURBO 10

Read AGENTS.md and docs/GLOBAL-CONTENT-FACTORY-TURBO.md first.
One session (W1) can write all eligible topics; W2/W3 optional concurrent lanes. Each owns 1–10 unfinished IDs maximum on its own stable branch/session.

Write only confirmed IDs after fetching main, QA and push 1..10 native-language drafts into own inbox. Green Writer QA automatically submits verified drafts (with SHA evidence) and refills to ten; PR stays OPEN for owner editorial review. Preserve all 16 already-written protected drafts. Do not force push or modify claims.json from a Writer branch.

Low queue threshold <30: write researched PROPOSALS at factory/topic-refill/proposals/<W1|W2|W3>/<batch>.json and validate through scripts/writer-refill.mjs; they do not become Matrix rows automatically. No model API in Actions; no auto live publishing or NAP/sitemap/URL edits.
