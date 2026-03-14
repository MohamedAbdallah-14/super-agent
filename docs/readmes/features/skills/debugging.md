# sa:debugging

> Observe. Hypothesize. Test. Fix. In that order, every time. No guesswork.

| Property | Value |
|---|---|
| **ID** | `sa:debugging` |
| **Type** | Rigid |
| **Trigger** | Behavior is wrong, verification fails, or a test produces unexpected output |
| **Failure mode** | Random fixes applied without a hypothesis, producing noise and masking root causes |

## Purpose

`sa:debugging` replaces guesswork with a disciplined four-step loop. The core insight is that most debugging failures are not failures of knowledge — they are failures of process. Agents (and humans) reach for fixes before they have clearly stated what is failing, why they think it's failing, and what experiment would prove or disprove that hypothesis. This skill enforces the correct order.

## When to Invoke

- A test fails unexpectedly during `sa:tdd` GREEN or REFACTOR.
- `sa:verification` produces a failure.
- A command returns an unexpected exit code or output.
- Behavior in production or test diverges from specification.

> [!TIP]
> `sa:using-skills` routes "Fix this bug" and "Why is this failing?" directly here. If you find yourself changing code without having first written down the exact failure and a ranked list of hypotheses, invoke this skill.

## When NOT to Invoke

- The failure is fully explained by a known, simple cause (e.g., a missing import you just identified). Fix it directly and rerun verification.
- You are exploring intentionally open-ended behavior — use `scan-project` instead.

## Phases

### 1. Observe

Record the exact failure state before touching anything.

| Observe item | Example |
|---|---|
| Exact failure message | `TypeError: Cannot read properties of undefined (reading 'tokens')` |
| Reproduction path | `npm test -- --grep rate-limit` → line 42 |
| Command output | Full stderr/stdout captured |
| Current assumptions | "Redis client is initialized before middleware runs" |

Do not skip this step to "save time". Vague failure descriptions produce vague fixes.

### 2. Hypothesize

List 2-3 plausible root causes and rank them by likelihood.

```
Hypothesis 1 (most likely): Redis client not yet connected when middleware invoked — race condition on startup
Hypothesis 2: Test setup calls middleware before Redis mock is initialized
Hypothesis 3: `tokens` property missing from bucket response shape (API change)
```

Do not proceed to testing with only one hypothesis. If you only have one, you are already anchored — generate two more.

### 3. Test

Design the **smallest discriminating check** that confirms or rejects the top hypothesis.

- One change at a time.
- The check must be able to falsify the hypothesis — if the result would be the same either way, it's not a discriminating check.

```bash
# Testing Hypothesis 1: Add connection-ready log before middleware
# If log never prints before the error, hypothesis 1 is confirmed
```

Run the check. Record the result. Update your hypothesis ranking.

### 4. Fix

Apply the minimum corrective change.

- Do not fix adjacent issues at the same time.
- Rerun the originally failing check after the fix.
- Rerun the broader relevant verification set.

```bash
npm test -- --grep rate-limit   # originally failing check
npm test                        # broader set
```

## Rules

| Rule | Why |
|---|---|
| Change one thing at a time | Multiple simultaneous changes make it impossible to know what fixed the problem |
| Keep evidence for each failed hypothesis | Audit trail prevents re-investigating the same dead ends |
| If three cycles fail, record the blocker | Inventing certainty after three failed cycles produces confident wrong answers |

## Three-Cycle Limit

If three complete Observe → Hypothesize → Test → Fix cycles have not resolved the failure:

1. Do not apply a fourth speculative fix.
2. Record the blocker in the active execution artifact or handoff:
   - What was tried
   - What each attempt produced
   - What remains unknown
3. Escalate to operator or flag for manual investigation.

## Input

- Failing command output (exact)
- Reproduction steps
- Current codebase state

## Output

| Artifact | Description |
|---|---|
| Observed failure (documented) | Exact failure, reproduction path, assumptions |
| Hypothesis log | Ranked hypotheses, test results per hypothesis |
| Fix applied | Minimum corrective change |
| Verification result | Passing check output |

## Example

**Scenario:** `npm test -- --grep "rate-limit returns 429"` fails with `expected 200 to equal 429`.

```
1. OBSERVE
   Failure: middleware returns 200 instead of 429 when bucket empty
   Command: npm test -- --grep "rate-limit returns 429"
   Output: AssertionError: expected 200 to equal 429
   Assumption: exhaustBucket() correctly empties the Redis key

2. HYPOTHESIZE
   H1: exhaustBucket() in test setup is not actually writing to the mock Redis store
   H2: Middleware reads tokens before bucket is exhausted (async issue)
   H3: Token bucket logic has an off-by-one — allows one extra request

3. TEST H1
   Add console.log in exhaustBucket to print the mock store state after calling it
   Result: mock store shows tokens = 1, not 0 — H1 is the problem

4. FIX
   exhaustBucket() was calling set() with tokens=1 instead of 0 (copy-paste error)
   Fix: change exhaustBucket to set tokens=0
   Rerun: npm test -- --grep "rate-limit returns 429" → 1 passing
   Rerun: npm test → all passing
```

## Integration

`sa:debugging` activates whenever `sa:tdd` or `sa:verification` encounters a failure it cannot immediately explain. After debugging resolves the issue, return to the interrupted skill (TDD or verification) and continue from where it was interrupted.
