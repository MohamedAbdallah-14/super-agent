# sa:verification

> No success claim without fresh evidence from the current change. Evidence means a command you ran, not a command you remember running.

| Property | Value |
|---|---|
| **ID** | `sa:verification` |
| **Type** | Rigid |
| **Trigger** | Before any claim that work is complete |
| **Failure mode** | False completion — declaring done without proof, creating silent technical debt |

## Purpose

`sa:verification` closes the loop on every unit of work. AI agents are capable of confidently asserting completion while the implementation is broken, the tests are skipped, or the wrong problem was solved. This skill makes that impossible by requiring a documented proof path — not a plausibility argument — before any completion claim is accepted.

The rule is simple: if you cannot show the output of a command that proves it works, the work is not done.

## When to Invoke

- Before saying "done", "complete", "finished", "working", or any equivalent.
- After each task in a `sa:writing-plans` implementation plan section.
- After every `sa:tdd` REFACTOR cycle.
- After applying a fix from `sa:debugging`.
- Before handing off to `prepare-next`.

> [!WARNING]
> "It should work" is not verification. "I tested it earlier" is not verification. "The logic looks correct" is not verification. Only fresh command output from the current change state counts.

## When NOT to Invoke

- You are still mid-implementation (RED or GREEN phase of TDD) — verification applies to completed work.
- The task is explicitly documentation-only and has no executable verification path — document this explicitly rather than silently skipping.

## Phases

1. **Identify what to verify** — every completion claim must state what is being verified.
2. **Determine the verification path** — a specific command, or a deterministic manual check if commands are not available.
3. **Run the verification** — execute it now, against the current state of the change.
4. **Record the result** — actual output, exit code, or observable outcome.
5. **Pass or fail** — if pass, the completion claim is valid. If fail, fix and re-verify.

## Input

- The work claimed to be complete
- The acceptance criteria for that work (from the implementation plan, if one exists)

## Output

A verification record with three required fields:

| Field | Description |
|---|---|
| What was verified | The specific behavior, output, or state confirmed |
| The exact command or check | Reproducible by anyone reading the record |
| The actual result | Not the expected result — the actual output |

## Verification Record Format

```
Verified: rate-limit middleware returns 429 when token bucket is exhausted
Command:  npm test -- --grep "rate-limit returns 429"
Result:   1 passing (34ms)
```

## Example

**Scenario:** Implementation plan Section 2 (rate-limit middleware) is complete.

```
Agent: Invoking sa:verification before claiming Section 2 complete.

What to verify: middleware returns 429 + Retry-After header when bucket exhausted
Command: npm test -- --grep rate-limit
Result:
  rate-limit middleware
    ✓ allows request when bucket has tokens (12ms)
    ✓ returns 429 when bucket exhausted (18ms)
    ✓ sets Retry-After header (8ms)
  3 passing (38ms)

Section 2: VERIFIED. Proceeding to Section 3.
```

**Failure scenario:**

```
Agent: Invoking sa:verification.
Command: npm test
Result:
  1) rate-limit middleware — returns 429 when bucket exhausted
     AssertionError: expected 200 to equal 429

Verification FAILED. Invoking sa:debugging.
[Debugging cycle resolves the issue]
[Re-running verification]
Command: npm test
Result: 4 passing
Verification PASSED. Completion claim now valid.
```

## When Verification Fails

1. Do not mark the work complete.
2. Do not adjust the acceptance criteria to match the failure.
3. Fix the issue — invoke `sa:debugging` if the cause is unclear.
4. Re-run verification after the fix.
5. Only claim completion after verification passes.

## Integration

`sa:verification` is the mandatory exit gate for every execution unit:

```
sa:tdd (GREEN) → sa:verification → move to next task
sa:tdd (REFACTOR) → sa:verification → section complete
fix applied → sa:verification → sa:debugging if still failing
execution phase done → sa:verification → prepare-next
```

Verification records become the evidence trail in `prepare-next` handoffs and `stop_handoff_harvest` observability data.
