# Continuous AI Research Refill — Global Content Factory

This runbook is for active external AI research sessions (Mistral, Claude, ChatGPT, Gemini). It **does not** add an AI model to GitHub Actions. `AGENTS.md` is authoritative.

## Trigger, goals and truth

- Current standing policy: `ready_threshold = 100` and `ready_target = 250` **per locale**, for all 10 locales; the limit of 1,000 valid topic slots per locale remains unchanged. These are *targets*, never claims that 250 topics have been researched.
- Read the generated `docs/CONTENT-FACTORY-DASHBOARD.md` → **AI research demand** for the current priority locales, READY shortfall and eligible existing-Hub PROPOSED stock. Or run `node scripts/topic-factory.mjs status --json` on fresh `main`.
- An external AI session should research while another Writer writes when possible. Within one Writer session, **repair tickets and existing claimed topics take priority** over beginning another research batch. Never steal or overwrite W1/W2/W3 claims.
- Each green research branch push triggers **Topic Research QA → Global Topic Factory intake → promotion of eligible PROPOSED ideas under standing policy** (at most 50 per run). Schedules are only fallback, not an AI writing engine.

## Repeatable research loop

1. Synchronize `main` and read `AGENTS.md`, `data/seo/topic-factory/policy.json`, `factory/topic-research/README.md`, `docs/TOPIC-RESEARCH-CHECKPOINT.md`, and topical architecture. Inspect Matrix and research log for duplicates.
2. Work on your own **`research/<agent>-<session>`** branch, never `writer/w1-*`, `writer/w2-*` or `writer/w3-*`. For a terminal-enabled session: `node scripts/topic-research.mjs hints`, then `node scripts/topic-research.mjs resume --agent <agent> --session <session> --apply`.
3. Research **10 actual distinct, native-language topics** at a time, prioritize undersupplied locales, maintain diversity across eight domains. For each, confirm at least two genuine HTTPS sources, truthful `checked_on`, distinct search intent, noncommercial angle and safe slug; never invent traffic/search volume/ranking or fabricate sources.
4. Run `node scripts/topic-research.mjs check --agent <agent> --session <session> --draft <file>`, correct all rejections, then `node scripts/topic-research.mjs commit --agent <agent> --session <session> --draft <file>`. Require `SAVED` confirmation and a green remote **Topic Research QA** result before counting intake. A short final 1–9-topic batch needs `--final`.
5. When terminal is unavailable, the agent may upload a complete validated `factory/topic-research/batches/<agent>-<session>-NNNN.json` through GitHub API to its **research branch**. Green GitHub QA is mandatory; never report success based solely on an unverified push.
6. Inspect latest `main` dashboard after the Topic Factory ingestion, verify newly approved **Matrix IDEA / READY** rows really exist, and let the normal Writer Autopilot allocate them. Repeat until an active AI session runs out of quota, respecting protected URLs and source QA. Checkpoint all progress before ending the session.

## Six unopened Hub architectures

Two domains are ACTIVE today: **Motorbike Rental & Vehicle Selection** and **Traffic Laws, Licensing & Riding Safety**. The **six** other domains are RESEARCH_OPEN: **Hanoi & Vietnam Travel Guides**, **Vietnam Road Trips & Travel Routes**, **Transportation & Urban Mobility**, **Destinations & Local Experiences**, **Travel Planning/Budget/Itineraries**, **Electric Motorbikes & Sustainable Mobility**.

Research candidates for those six categories are allowed now but become **ARCHITECTURE_BLOCKED**, not Writer READY. A reviewed architecture PR for each new Hub with at least eight distinct validated supporting candidates in the appropriate locale is necessary before any of those can be promoted. Do not bypass that to inflate the ready number.

## Verification and safety

- Check the generated dashboard's truthful READY, CLAIMED, SUBMITTED, PROPOSED, BLOCKED and per-locale research deficits.
- Research must satisfy R1–R8, F1–F8, T1–T10 and duplicate layers L1–L5. No manual mass Matrix injection.
- Keep published content, CNAME, URLs, canonical, hreflang, sitemap, NAP, prices, QA and rollback unchanged.
- GitHub Actions itself **cannot research or write when all external AI sessions are offline** under the user's no-AI-API constraint.
