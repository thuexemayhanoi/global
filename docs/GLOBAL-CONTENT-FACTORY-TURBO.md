# GLOBAL CONTENT FACTORY — TURBO 10 + RECOVERY + REFILL

Repository ONLY: thuexemayhanoi/global — https://global.rentbikehanoi.com/
Architecture reference: thuexemayhanoi/blog. Borrow mechanisms, NEVER merge repositories or copy article content.

## What changes

1. An external AI Writer session uses W1, W2 or W3 and may write any eligible topic in the SAME shared 10-language Matrix. Running only W1 is enough; W2/W3 optional.
2. Turbo can CLAIM up to 10 topics per active Writer session. One Writer push may include 1..10 completed article JSON drafts. Green Writer QA automatically SUBMITS the verified completed subset and refills that Writer's unfinished slot back up to 10. Incomplete claims keep the SAME owner/session/branch. Do not write preview IDs. Do not request per-batch GitHub Run clicks.
3. Old W1's two outstanding ES-H01 + KO-H01 claims stay in place. Finish those two first; next successful push automatically expands the slot toward 10. Do not reset, release, rewrite or pretend either is complete.
4. New SUBMITTED drafts record source commit and SHA256 of exact source JSON, checked on future Writer pushes. A changed submitted draft is refused; editorial changes require a reviewed branch. Retry/collision means re-fetch latest main and recompute ledger, bounded to three attempts without force push.
5. All 14 W1 PR #17 drafts + EN-H01/DE-H01 editorial pilots remain reserved; never redraft these. Each Writer uses exactly one unfinished session per W1/W2/W3 lane.

## Continuous Writer execution

For existing W1 use branch writer/w1-vibe-20261014, session w1-vibe-20261014 and open PR #17. Fetch and MERGE main, never reset/force push. Read AGENTS.md and this guide.

One-time activation only if missing:
node scripts/writer-request.mjs start --writer W1 --session w1-vibe-20261014 --branch writer/w1-vibe-20261014
Commit/push the exact request JSON on the Writer branch (not main). Writer push QA green triggers Global Dynamic Writer Autopilot to claim up to ten.

Then LOOP without asking the owner again:
- Fetch/merge newest origin/main.
- Confirm real assigned IDs:
  node scripts/continuous-writer.mjs assigned --writer W1 --session w1-vibe-20261014 --branch writer/w1-vibe-20261014
- Write only confirmed IDs into factory/external-writers/inbox/W1/<ID>.json. Native-language factual sources, >=1000 validator words, 4+ genuine H2s, 2+ researched HTTPS sources. Human review flags MUST remain false.
- QA:
  node scripts/writer-lanes.mjs verify-all
  node --test tests/external-writers.test.mjs tests/continuous-writer.test.mjs tests/writer-pool.test.mjs tests/writer-pool-auto.test.mjs tests/writer-refill.test.mjs
- Commit/push 1–10 valid drafts to SAME W1 branch, maintain existing open Writer PR, wait exact commit Writer QA green + Autopilot green.
- Automatic coordinator safely marks only finished ID(s) SUBMITTED, records immutable commit/hash evidence and refills Writer slot. Fetch main and immediately repeat while the external AI remains available.
- A green CI response is not an article publication. No model API runs in Actions and no AI chat restarts automatically after its external provider ends.

W2/W3 use their OWN stable writer/w2-* or writer/w3-* branches/sessions and inbox. Never use another Writer's session or write its draft files.

## Why the publisher is still gated

Submitted drafts are not indexed or live. Publication via scripts/seo/publish-batch.mjs remains owner-approval-manifest gated, with real fact/SERP/natural-language review. Supporting drafts may be written while Hub awaits review; Supporting PUBLICATION requires its own Hub already PUBLISHED. Never edit CNAME, sitemap, canonical, noindex search utility, prices, NAP, live URLs or other repos while writing.

## Refill preparation (early warning + independent editorial review)

Run node scripts/writer-refill.mjs status. When free Matrix ideas fall under 30 (planning target 120), the external Writer should RESEARCH original non-overlapping long-tail Supporting topics under existing same-locale Hubs. Stage up to 50 JSON proposals per file at factory/topic-refill/proposals/W1/<batch>.json, with W2/W3 variants for other lanes. Verify:
node scripts/writer-refill.mjs validate --writer W1 --branch writer/w1-vibe-20261014

Required JSON batch:
{
 "version":1, "repo":"thuexemayhanoi/global", "purpose":"SEO_IDEA_RESEARCH",
 "status":"PROPOSED", "writer":"W1",
 "topics":[{
  "candidate_id":"REFILL-EN-70001", "locale":"en", "role":"SUPPORT",
  "parent_id":"EN-H02", "cluster":"rental-costs",
  "slug":"weekly-monthly-motorbike-rental-agreements",
  "primary_query":"comparing weekly versus monthly motorbike rental contracts in Hanoi",
  "working_title":"Weekly vs Monthly Motorbike Rental Agreements in Hanoi: What to Check",
  "search_intent":"informational", "word_target":1600,
  "intent_rationale":"Addresses the specific decisions and contract risks a rider comparing weekly and monthly rental terms must assess, rather than repeating the general prices topic.",
  "references":[
   {"url":"https://www.gov.uk/foreign-travel-advice/vietnam","title":"UK Vietnam travel advice","checked_on":"2026-10-14"},
   {"url":"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries","title":"WHO traffic safety guidance","checked_on":"2026-10-14"}
  ],"status":"IDEA","serp_evidence":"NOT_VALIDATED","source_verification":"NOT_STARTED"
 }]
}

Eight gates G1–G8 check repo/schema, batch size/writer, parent/locale/cluster, URL uniqueness, query/intent overlap, title/slug quality, research references, and unverified IDEA governance. Source URLs and SERP intent are structural INPUTS, not independently validated facts or a ranking forecast.

IMPORTANT: Refills currently stage for editorial acceptance. They DO NOT secretly append rows into the Matrix, change the Writer Board or publish pages. A separate reviewed Matrix expansion must regenerate content-graph, navigation/sitemaps and QA together. Do not promise 10,000 ready topics or publish unreviewed keyword proposals.

## When to stop

Stop for no accepted topic remaining, owner publication gate, unrecoverable GitHub/permission/claim conflict, exhausted external AI quota/runtime or explicit STOP. Do not stop after one successful draft batch; if network fails, resume same session/branch and exact unfinished claims. Production writing and actual live publication are always distinct.
