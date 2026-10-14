# External Writer Pool — /global (10 languages, 1–3 active AI sessions)

Canonical instructions: docs/DYNAMIC-WRITER-POOL.md and AGENTS.md.
Production: https://global.rentbikehanoi.com/ — NO auto AI API inside GitHub, NO automatic article publishing.

## Shared allocation, NOT 40-topic hard lanes
- There are 120 existing Matrix ideas: 40 Hub and 80 Supporting across vi,en,de,fr,es,nl,zh,pt,ko,ja. Historical assignments.json (40 each) is provenance only.
- W1 alone can claim all eligible unreserved IDs. W2 alone or W3 alone can too. When multiple external chats are alive, they claim exclusive pairs from the same central ledger.
- Existing 14 W1 Hub drafts in writer/w1-vibe-20261014 / PR #17 remain protected in protected-drafts.json. These must not be rewritten or redistributed.
- Only main/claims.json, updated by the serialized Global Dynamic Writer Pool workflow, authorizes claims. A preview is NOT a claim. After claim SUCCESS, fetch main to confirm actual IDs.
- The external AI writes only its OWN lane inbox directory on its own writer/w1-*, writer/w2-*, or writer/w3-* branch. It can write IDs historically assigned to OTHER lanes ONLY when ledger confirms its ownership.

## Continuous 2-article cycle
1. Fetch/merge main safely; resume original own writer branch.
2. Preview with node scripts/continuous-writer.mjs next --writer W1 --session w1-live --branch writer/w1-live.
3. If CLAIM_REQUIRED dispatch Global Dynamic Writer Pool action=claim, count=2, with writer, stable session and branch. WAIT Actions success.
4. Fetch/merge main; call ... assigned using matching writer/session/branch. Write only the confirmed IDs into own inbox in native language, 1000–5000 validator words, >=4 H2 sections, >=2 verified sources and false human-review flags.
5. node scripts/writer-lanes.mjs verify-all, node --test tests/external-writers.test.mjs tests/continuous-writer.test.mjs tests/writer-pool.test.mjs.
6. Commit/push only own inbox, open/update the SAME Writer draft PR. Wait writer QA GREEN for exact SHA.
7. Dispatch action=submit through writer-pool.yml with actual claimed ids, after open draft PR and remote valid JSON. Wait SUCCESS.
8. Fetch/merge main, next pair immediately. DO NOT stop after push/QA/PR when eligible IDs remain. On network/quota loss, resume same branch/session and claims next time.

## Strict gates
- Supporting IDs cannot be claimed until their Hub parent is PUBLISHED; editor-reviewed drafts do not count.
- Coordinator human review of source claims, factual accuracy and SERP intent is separate from deterministic JSON QA. Writer never changes review flags to true.
- Publishing remains owner-approved via scripts/seo/publish-batch.mjs on a feature branch and reviewed PR; no direct Writer merge or auto publication.
- No inventing price, legal rights, deposits, insurance, delivery, local office details or third-party citations. No duplicate URLs/content.
- Do not auto-release claims just because a chat disconnects. Coordinator may release a verified empty branch claim with explicit reason; SUBMITTED and protected legacy drafts remain reserved.
- Preserve CNAME, existing URLs, canonical, hreflang, sitemap index, 10 locale structures and other repos. Never reset, force push or delete PR #17.

## Deprecated commands
node scripts/writer-lanes.mjs pack is a READ-ONLY preview, not a reservation. The old scripts/seo/writer-claims.mjs must NOT be used to mutate claims after dynamic pool activation. Use GitHub Actions Global Dynamic Writer Pool to mutate main ledger. This also avoids conflicting standalone clones of the old static 40-topic ownership model.

For Mistral/Claude/Gemini prompts, use prompts/W1.md, prompts/W2.md or prompts/W3.md, and always read docs/DYNAMIC-WRITER-POOL.md.
