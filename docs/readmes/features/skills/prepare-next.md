# prepare-next

> Produce a clean next-run handoff without auto-loading stale context, unreviewed learnings, or unresolved ambiguities into the next session.

| Property | Value |
|---|---|
| **ID** | `prepare-next` |
| **Type** | Flexible |
| **Trigger** | After a run or execution slice completes |
| **Failure mode** | Stale context or unreviewed learnings silently poisoning the next session |

## Purpose

`prepare-next` closes a session cleanly. It captures what happened — completed work, blockers, required approvals, and explicitly accepted learnings — and packages this into a structured handoff that the next session can consume without ambiguity.

The key discipline: it does not auto-apply anything. Proposed learnings, unresolved decisions, and speculative improvements are documented as pending — not silently promoted into the next run's starting assumptions. A poisoned handoff is worse than no handoff at all.

## When to Invoke

- After a run or execution slice completes (all planned work for the session is done or blocked).
- Before context compaction would cause loss of session state.
- Before switching from one implementation phase to another.
- As the final step before disconnecting from a long-running task.

> [!TIP]
> The `stop_handoff_harvest` hook fires at session end and captures final observability data. `prepare-next` is the skill-level complement — it produces the structured human-readable handoff document that the hook captures.

## When NOT to Invoke

- Mid-task: do not interrupt execution to produce a handoff. Finish the current task unit first (or explicitly note the interruption point).
- Nothing meaningful has happened: an empty handoff is not useful. If nothing was completed, note what was attempted and why it was blocked.

> [!WARNING]
> Do not mutate `input/`. The `input/` directory is operator-supplied truth. Handoff documents belong in `docs/plans/` or the state root (`~/.superagent/projects/<project-slug>/`), not in `input/`.

## Phases

1. **Inventory completed work** — what was finished, with verification evidence.
2. **Inventory blockers** — what could not be completed and why.
3. **List required approvals** — decisions the operator needs to make before the next run can proceed.
4. **Identify accepted learnings** — only learnings that have been explicitly reviewed and accepted by the operator go in the handoff. Proposed learnings are listed separately as pending.
5. **Write the handoff** — using the `templates/artifacts/next-run-handoff.md` structure.

## Input

- Session history: what was planned, what was done, what failed
- Verification records from `sa:verification`
- Any blockers or open questions from `sa:debugging`
- Operator-reviewed learnings only

## Output

One handoff document using the `templates/artifacts/next-run-handoff.md` structure.

### Required Handoff Sections

| Section | Content |
|---|---|
| Current status | One-line summary of where the run ended |
| Completed work | Finished tasks with verification evidence |
| Unresolved blockers | What is blocking progress and why |
| Required approvals | Decisions needed from the operator |
| Accepted learnings | Only explicitly reviewed/approved learnings |
| Pending review | Proposed learnings or observations awaiting operator review |

## Rules

- Do not mutate `input/`.
- Do not auto-load proposed or unreviewed learnings into the next run.
- Do not mark work as complete in the handoff if `sa:verification` has not passed for it.

## Example

**Scenario:** Session ends after completing 3 of 5 plan sections.

```markdown
# Next-Run Handoff — 2026-03-13

## Current Status
Completed sections 1-3 of rate-limiting implementation plan. Blocked on section 4 (Redis integration test environment).

## Completed Work
- Section 1: Redis client setup — VERIFIED (npm test → 3 passing)
- Section 2: Rate-limit middleware — VERIFIED (npm test → 7 passing)
- Section 3: Router wiring — VERIFIED (npm test → 12 passing)

## Unresolved Blockers
- Section 4 requires a Redis test container — CI environment does not have Docker. Options documented in debugging log.

## Required Approvals
- Operator decision needed: use mock Redis for test environment OR add Docker to CI?

## Accepted Learnings
(none — operator has not reviewed the proposed learnings below)

## Pending Review
- Proposed: Redis client should use connection pooling (observed latency spike under load in manual test).
  Status: PROPOSED — not yet reviewed. Do not apply automatically.
```

## Integration

`prepare-next` is the terminal step of any execution session:

```
sa:tdd → sa:verification → prepare-next → [operator reviews] → next session starts clean
```

The `stop_handoff_harvest` hook captures the handoff document at session end. The `pre_compact_summary` hook summarizes captured state before context compaction — both hooks consume the data that `prepare-next` produces.
