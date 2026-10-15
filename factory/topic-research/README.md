# Topic research intake (any AI agent)

Research is the only part of the Topic Factory that needs live web access, so it is done by AI agents (ChatGPT, Claude, Gemini or any compatible agent) with real search/scrape tools. The factory itself never invents topics, volumes or rankings.

## Contribute a batch

1. Branch from latest `main` as `research/<agent>-<session>` (for example `research/claude-20261015`).
2. Add one JSON file per batch under `factory/topic-research/batches/` (25–50 candidates is the normal size, 1–50 accepted).
3. Run `node scripts/topic-factory.mjs validate-batches` to check **all files together**, including duplicate intents across different batch JSONs and the 1,000-topic planning-slot cap per locale. For the first isolated file, `validate-batch --file <file>` is also available. Fix every rejection before push.
4. Push the branch. **Topic Research QA** validates it; on green, **Global Topic Factory** (main code only) ingests the batch as DATA, assigns `TA-XX-NNNN` IDs, registers the references and, when a locale's READY backlog is below 100, promotes gate-clean candidates to Matrix `IDEA` rows under `approvals/standing-policy-20261015.json`.

No PR or owner click is needed for intake. Replaying the same batch is a no-op (SHA-256 log in `data/seo/topic-factory/research-log.json`).

## Batch schema

```json
{
  "version": 1,
  "repo": "thuexemayhanoi/global",
  "purpose": "TOPIC_RESEARCH_BATCH",
  "agent": {"name": "claude", "session": "research-claude-20261015"},
  "researched_on": "2026-10-15",
  "candidates": [{
    "locale": "en",
    "parent_id": "EN-H01",
    "subcluster": "vc-trip-fit",
    "slug": "scooter-luggage-capacity",
    "primary_query": "how much luggage fits on a rental scooter",
    "secondary_queries": ["scooter luggage rack vietnam", "backpack on motorbike vietnam"],
    "entities": ["Hanoi", "luggage rack"],
    "search_intent": "informational",
    "intent_rationale": "≥60 chars: who searches this, why, what they need to decide",
    "content_angle": "≥40 chars: the unique value versus existing pages",
    "working_title": "How Much Luggage Fits on a Rental Scooter in Vietnam",
    "word_target": 1400,
    "references": [{"url": "https://…", "title": "…", "checked_on": "2026-10-15"}],
    "keyword_evidence": "NOT_VALIDATED",
    "distinct_from": [{"id": "EN-S03", "reason": "≥40 chars explaining the different intent"}]
  }]
}
```

## Six-domain Mistral research example

For the six new domains, replace the existing-Hub parent fields in each candidate with:

```json
{"domain_id":"hanoi-vietnam-travel","parent_id":null,"subcluster":"travel-neighborhoods"}
```

Other examples: `road-trips-routes` → `rt-day-trips`, `transportation-mobility` → `mob-urban-transit`, `destinations-experiences` → `dest-local`, `travel-planning` → `plan-logistics`, `electric-mobility` → `electric-choice`. Subclusters and Hub status live in `data/seo/topical-authority/architecture.json` and allowed domains in `data/seo/topic-factory/policy.json`. All normal language, intent, evidence, source, duplicate and factual checks remain in force. Run `node scripts/topic-factory.mjs validate-batch --file <path>` and push each batch; do not wait to build 10,000 records in memory.

## Rules the factory enforces

- Native-language queries and titles per locale; never copy another locale's text (T10).
- At least two traceable HTTPS references with `checked_on`; they are research inputs, not proof of facts.
- No `search_volume`, `ranking` or `traffic` fields; keyword evidence stays `NOT_VALIDATED` (or `AGENT_OBSERVED_SERP` when the agent actually looked at a results page).
- All eight domains are open for research: existing Hub topics use a real same-locale `parent_id`; a new proposed-Hub topic uses `parent_id:null`, matching `domain_id` and a valid `subcluster` from the six `RESEARCH_OPEN` domains. These are recorded as `ARCHITECTURE_BLOCKED` only; no Matrix promotion until its reviewed new-Hub architecture PR (at least eight distinct validated supporting candidates).
- No transactional rental intent: commercial rental keywords belong to thuexemaynguyentu.com and rentbikehanoi.com.
- Duplicate layers L1–L5 (exact, diacritic-folded, intent overlap, title trigram, topic signature) plus topical gates T1–T10 decide; **validation is cumulative across all files on the branch**. A locale cannot exceed 1,000 Matrix + research slots, including ARCHITECTURE_BLOCKED candidates (PROMOTED proposals count only through their Matrix row). Rejections are logged, never forced in.
