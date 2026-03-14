# sa:tdd

> RED → GREEN → REFACTOR. No shortcuts. Every behavioral change earns a failing test first.

| Property | Value |
|---|---|
| **ID** | `sa:tdd` |
| **Type** | Rigid |
| **Trigger** | Any implementation work that changes behavior |
| **Failure mode** | Code written without test coverage, or tests rewritten to fit broken behavior |

## Purpose

`sa:tdd` enforces the test-driven development discipline for every behavioral change. It prevents the two most common AI coding failures: (1) confident implementation with no verification path, and (2) retrofitted tests written to confirm broken behavior rather than specify correct behavior. The discipline is the point — it cannot be adapted away.

## When to Invoke

- Implementing any new feature or behavioral change.
- Fixing a bug where automated verification is feasible.
- Any task in an implementation plan that changes how code behaves.

> [!TIP]
> If the implementation plan has been written by `sa:writing-plans`, each plan task becomes a RED → GREEN → REFACTOR cycle. Work through the plan one task at a time.

## When NOT to Invoke

- Pure documentation changes with no code impact.
- Configuration changes with no behavioral implications.
- Environments where automated testing is explicitly infeasible (document this explicitly — do not silently skip).

> [!WARNING]
> "I'll write the tests after" is not TDD. The failing test must exist before the implementation. If you skip RED, you are not following this skill — you are rationalizing around it.

## Phases

### 1. RED

Write or update a test that expresses the new behavior or the bug being fixed.

- The test must **fail** when you run it. Confirm failure explicitly.
- A test that passes before the implementation is not a test — it is noise.
- Record the failure output as evidence.

```bash
npm test -- --grep "new behavior"
# Must show: 1 failing
```

### 2. GREEN

Write the **smallest** implementation change that makes the failing test pass.

- Do not write more code than the test requires.
- Do not solve adjacent problems.
- Run the test. Confirm it now passes.

```bash
npm test -- --grep "new behavior"
# Must show: 1 passing
```

### 3. REFACTOR

Improve the structure of the implementation without changing behavior.

- Run the full relevant test set after each structural change.
- All tests must remain green throughout refactor.
- Stop when the code is clean — do not gold-plate.

```bash
npm test
# Must show: all passing
```

## Rules

| Rule | Enforcement |
|---|---|
| Do not skip the failing-test step when automated verification is feasible | RED is mandatory |
| Do not rewrite tests to fit broken behavior | Tests specify behavior; code must satisfy tests |
| Rerun verification after each meaningful refactor | REFACTOR must not break GREEN |

## Input

- Implementation plan task (from `sa:writing-plans`)
- Existing test suite
- Acceptance criteria from the plan section

## Output

| Artifact | Description |
|---|---|
| Failing test (RED) | Test expressing the new behavior, confirmed failing |
| Passing implementation (GREEN) | Minimum code to satisfy the test |
| Clean codebase (REFACTOR) | Improved structure with full test suite green |

## Example

**Task from plan:** "Rate limit middleware returns 429 when token bucket is exhausted."

```javascript
// RED: Write the failing test
describe('rate-limit middleware', () => {
  it('returns 429 when token bucket exhausted', async () => {
    await exhaustBucket('token-abc');
    const res = await request(app).get('/api/data').set('Authorization', 'Bearer token-abc');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
// Run: 1 failing — ReferenceError: exhaustBucket is not defined (or 200 returned)
```

```javascript
// GREEN: Write minimum implementation
// src/middleware/rate-limit.js — add 429 return when bucket empty
if (tokens <= 0) {
  res.set('Retry-After', ttl);
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
// Run: 1 passing
```

```javascript
// REFACTOR: Extract magic numbers to config
// Run full suite: all passing
```

## Integration

`sa:tdd` is the execution engine of the delivery chain:

```
sa:writing-plans (plan) → sa:tdd (RED/GREEN/REFACTOR per task) → sa:verification (completion proof)
```

When a test fails unexpectedly during GREEN or REFACTOR, invoke `sa:debugging` to diagnose before continuing.
