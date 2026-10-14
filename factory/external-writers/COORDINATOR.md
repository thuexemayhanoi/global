# Coordinator protocol — Dynamic Shared Writer Pool

1. Source of truth: docs/DYNAMIC-WRITER-POOL.md. W1/W2/W3 may claim ANY eligible shared topic. Old assignments.json (40 each) are only historical reference.
2. Existing 14 W1 drafts in PR #17 are protected, not published. Never reassign or rewrite without verified owner intervention.
3. Claims on main are mutated exclusively by serialized GitHub Actions Global Dynamic Writer Pool: claim → Writer QA/remote PR → submit. Other Writer sessions cannot steal active or submitted claims.
4. Coordinator may release a genuinely abandoned UNFINISHED claim only with explicit reason and confirmation after inspecting PR/branch. Never auto-timeout a legitimate writing session or release SUBMITTED content.
5. Writer can only touch own inbox files; irrespective of historical topic origin. Writer cannot set facts_reviewed_by_human or serp_intent_checked true.
6. Human editorial review of research sources, legal claims, intent, factual pricing, NAP and links remains mandatory. QA PASS is not verified factual correctness.
7. Publishing via scripts/seo/publish-batch.mjs requires separate exact owner approval manifest on clean feature branch. No automatic publish, direct Writer merge, Matrix/sitemap/CNAME edits.
8. Supporting remains gated by actual PUBLISHED Hub. On claimed backlog exhaustion, review/approve Hub batches first; do not bypass.
9. Never touch /total, /vanchinh, /japan, WordPress, DNS or other sites while operating /global.
