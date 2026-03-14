# sa:brainstorming

> Turn operator briefings into approved designs with explicit trade-offs — before a single line of implementation code is written.

| Property | Value |
|---|---|
| **ID** | `sa:brainstorming` |
| **Type** | Rigid |
| **Trigger** | "About to enter plan mode" OR any implementation request without an approved design |
| **Failure mode** | Coding without a reviewed design — produces unvalidated output |

## Purpose

`sa:brainstorming` creates a mandatory design gate between "I want X" and "I'm building X". It forces the agent to surface trade-offs, resolve ambiguities that affect scope or architecture, and get operator approval before implementation starts. This prevents the most expensive failure mode in AI-assisted engineering: confident, well-executed work that solves the wrong problem.

## When to Invoke

- Any time the agent is about to enter plan mode and no approved design exists.
- When an operator briefing describes a feature, change, or fix with architectural implications.
- When the task scope is unclear and the ambiguity could change what gets built.

> [!TIP]
> `sa:using-skills` will route you here automatically when "Let's build X" or similar phrases appear. If you find yourself reaching for an editor before a design doc exists, this skill has not fired.

## When NOT to Invoke

- A trivial, fully-specified, single-file fix where no design decision exists (e.g., "fix the typo on line 14").
- The design has already been approved and written to `docs/plans/` — proceed to `sa:writing-plans`.
- Documentation-only changes with no behavioral implications.

> [!WARNING]
> Do not skip brainstorming because the implementation "feels obvious". The value is in surfacing the 20% of the problem that turns a clean solution into a rework cycle.

## Phases

1. **Read `input/`** — understand operator constraints, requirements, and context before touching the repo.
2. **Inspect repo surfaces** — read only the minimum surfaces needed to understand the request (do not do a full scan).
3. **Ask clarifying questions** — only for ambiguities that change scope, architecture, or acceptance criteria. One round only.
4. **Propose 2-3 approaches** — each with trade-offs and a recommendation. Make the recommendation explicit.
5. **Operator review** — wait for approval. Do not proceed past this point autonomously.
6. **Write approved design** — to `docs/plans/YYYY-MM-DD-<topic>-design.md`.
7. **Hand off** — invoke `sa:writing-plans` with the approved design as input.

## Input

- `input/` directory — operator-supplied requirements, constraints, context
- Relevant repo surfaces (minimum necessary)

## Output

| Artifact | Location | Required |
|---|---|---|
| Design document | `docs/plans/YYYY-MM-DD-<topic>-design.md` | Yes |
| Trade-off summary | Within design doc | Yes |
| Open questions / resolved assumptions | Within design doc | Yes |
| Explicit recommendation + rejected alternatives | Within design doc | Yes |

## Example

**Scenario:** Operator says "Add rate limiting to the API."

```
Agent: Invoking sa:brainstorming skill.
Agent: "Using sa:brainstorming to turn the rate limiting briefing into an approved design."

[Reads input/ — finds: target endpoint, expected traffic ~1k req/s, Redis available]
[Reads src/api/ — finds Express middleware pattern already in use]

Agent: "One clarifying question: should rate limiting apply per-IP, per-auth-token, or both?"
Operator: "Per-auth-token."

Agent proposes:
  Option A: In-process sliding window (simple, no external dep, loses state on restart)
  Option B: Redis token bucket (stateful, accurate, requires Redis client setup)
  Option C: Upstream proxy-level (nginx, zero app code, loses per-token granularity)

  Recommendation: Option B — Redis is already in the stack, token-based accuracy matches the stated need.

[Operator approves Option B]

Agent: Writing design to docs/plans/2026-03-13-rate-limiting-design.md
Agent: Invoking sa:writing-plans...
```

## Integration

`sa:brainstorming` is the mandatory first step in the plan → execute chain:

```
sa:brainstorming (design approved)
    → sa:writing-plans (implementation plan produced)
        → sa:tdd (RED/GREEN/REFACTOR execution)
            → sa:verification (completion proof)
```

It also feeds `run-audit` in plan mode: when audit findings are approved by the operator, they become the equivalent of a brainstorming-approved design and flow directly into `sa:writing-plans`.
