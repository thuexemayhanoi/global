# Global Writer Coordinator (Writer Autopilot)

Canonical runbooks: `docs/CURRENT-WORKFLOW.md` and `docs/GLOBAL-CONTENT-FACTORY-TURBO.md`.

The trusted **Global Dynamic Writer Autopilot** (`writer-pool-auto.yml`) runs main code only, after a green same-repository PUSH run of External Writer Draft QA on a `writer/wN-*` branch, serialized with the manual pool workflow. It:

- reads the branch's request file and drafts as DATA at the exact green commit (stale runs are skipped);
- transitions only verified own draft IDs to SUBMITTED with remote commit + SHA-256 evidence, keeps partial unfinished claims, refills to a maximum of TEN;
- refuses any change to an already SUBMITTED file and accepts a revision only for a current REPAIR ticket of that exact hash, Writer and session (`REPAIR_TICKET_REQUIRED` otherwise);
- records the slot signal from the agent's own request file;
- commits only `claims.json`/`slots.json` with up to three compare-and-swap retries; never force-pushes.

W1 alone can write every eligible topic; W2 and W3 are optional concurrent slots. The 14 W1 legacy drafts (PR #17) and the EN-H01/DE-H01 editorial pilots are reserved. Publication is not done here: the Auto Publisher evaluates SUBMITTED drafts with automated QA and publishes eligible ones two at a time. No AI model runs in any of these workflows.
