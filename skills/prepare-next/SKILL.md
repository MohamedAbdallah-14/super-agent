---
name: prepare-next
description: Use after a run or execution slice completes to produce a clean next-run handoff without auto-applying stale context.
---

# Prepare Next

Create a next-run handoff that captures:

- current status
- completed work
- unresolved blockers
- required approvals
- explicitly accepted learnings only

Rules:

- do not mutate `input/`
- do not auto-load proposed or unreviewed learnings into the next run
- write the handoff using the `templates/artifacts/next-run-handoff.md` structure
