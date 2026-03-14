# sa:writing-plans

> Transform an approved design into an execution-grade implementation plan — detailed enough that a weaker model can follow it without inventing missing steps.

| Property | Value |
|---|---|
| **ID** | `sa:writing-plans` |
| **Type** | Rigid |
| **Trigger** | After design approval from `sa:brainstorming` or `run-audit` plan mode |
| **Failure mode** | Vague plans that force improvisation during execution |

## Purpose

`sa:writing-plans` converts approved intent into a concrete, ordered execution plan. The bar is explicit: the plan must be detailed enough that another agent — potentially a less capable one — can execute it without needing to invent steps, make scope decisions, or guess at acceptance criteria. Ambiguity left in a plan becomes compounding rework during execution.

## When to Invoke

- Immediately after `sa:brainstorming` produces an operator-approved design.
- After `run-audit` plan mode — when audit findings are approved as a fix basis.
- When a clarified direction has been approved and implementation is ready to start.

> [!WARNING]
> Do not invoke this skill without an approved design or approved direction in `docs/plans/`. Writing a plan from an unreviewed design skips the human approval gate and produces work the operator hasn't signed off on.

## When NOT to Invoke

- No approved design exists yet — invoke `sa:brainstorming` first.
- The task is exploratory research — use `scan-project` or `run-audit` instead.
- You are mid-execution and already have a plan — do not re-plan, execute.

## Phases

1. **Read the approved design** — from `docs/plans/YYYY-MM-DD-<topic>-design.md`.
2. **Read current repo state** — understand what already exists vs. what needs to be created or changed.
3. **Incorporate research findings** — pull in any relevant findings from the discover phase.
4. **Write the implementation plan** — to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
5. **Review plan structure** — verify it satisfies all required sections before handing off to execution.

## Input

| Source | Required |
|---|---|
| Approved design doc in `docs/plans/` | Yes |
| Current repo state | Yes |
| Research findings from discover phase | If available |

## Output

One implementation plan at `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

### Required Plan Sections

| Section | Content |
|---|---|
| Ordered sections | Logical execution sequence with no gaps |
| Concrete tasks and subtasks | Specific, unambiguous actions |
| Acceptance criteria per section | How to know each section is done |
| Verification commands | Exact commands or manual checks per section |
| Cleanup steps | Temp files, stubs, or scaffolding to remove |

## Example

**Scenario:** Design for Redis token-bucket rate limiting has been approved.

```
Plan: docs/plans/2026-03-13-rate-limiting-implementation.md

## Section 1: Redis client setup
- Task: Install ioredis (npm install ioredis)
- Task: Create src/lib/redis-client.js with connection config from env
- Acceptance: `node -e "require('./src/lib/redis-client')"` exits 0
- Verification: `npm test -- --grep redis-client`

## Section 2: Rate limit middleware
- Task: Create src/middleware/rate-limit.js implementing token bucket
  - Subtask: Read token count from Redis key `ratelimit:{token}`
  - Subtask: Decrement and set TTL atomically via Lua script
  - Subtask: Return 429 with Retry-After header when exhausted
- Acceptance: Unit tests cover allow / deny / TTL-reset scenarios
- Verification: `npm test -- --grep rate-limit`

## Section 3: Wire middleware to router
...

## Cleanup
- Remove TODO comment in src/api/router.js added in Section 3
```

## Rules

- Do not write repo-local task files outside `docs/plans/`.
- Do not rely on retired `run-*` workflow wrappers.
- Make tasks concrete enough that no invention is needed during execution.

## Integration

`sa:writing-plans` sits in the middle of the delivery chain:

```
sa:brainstorming → [operator approval] → sa:writing-plans → sa:tdd
                                                          → sa:verification (after execution)
```

Plans produced here are the direct input to the `execute` phase. The `sa:tdd` skill consumes the plan task-by-task, writing a failing test for each task before implementing it.
