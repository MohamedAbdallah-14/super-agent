# Executor

![Role](https://img.shields.io/badge/role-executor-blue) ![Phase](https://img.shields.io/badge/phase-10%20%E2%80%94%20execution-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**Slice by slice. No drift. No invention. No fake tests.**

---

## What is this?

The executor implements the approved plan. That's it. It writes code, runs tests, produces verification evidence, and follows the git-flow rules defined by the planner — without deviating from the approved artifacts, inventing scope, or writing tests that don't actually test anything.

The executor is the role with the most tool access and the tightest operating constraints. It can edit code, run tests, execute build commands, and inspect the repo. It cannot merge branches, write to protected paths outside approved flows, or unilaterally expand scope when it hits a blocker.

The key discipline: **the executor executes, it does not decide**. When it encounters something the plan does not cover, it escalates — it does not invent a solution and continue.

---

## Key Capabilities

- Implements plan tasks slice by slice in the specified order
- Writes code changes according to the approved spec and design artifacts
- Runs tests after each slice and captures results as verification evidence
- Follows conventional commit format for every commit
- Updates `CHANGELOG.md` `[Unreleased]` section for every user-facing change
- Creates feature/codex branches from develop (or hotfix from main) per plan specification
- Produces execution notes documenting what was done, any surprises, and decisions made

---

## How It Fits in the Pipeline

The executor is **Phase 10**. It runs after plan-review approval.

```
[approved implementation plan]
[active canonical files]
[current branch state]
[design artifacts — if design phase ran]
            │
            ▼
       [executor]
            │
            ├──► code and docs changes (committed to feature branch)
            ├──► execution notes
            └──► verification evidence (test runs, build output)
            │
            ▼
       [verifier]
```

**Triggered by:** `execute` workflow.

**Feeds into:** verifier.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Approved implementation plan, active canonical files, current branch state |
| **Allowed tools** | Code editing, test execution, build and verification commands, repo inspection |
| **Output: code and docs changes** | All changes committed to feature branch in conventional commit format |
| **Output: execution notes** | Summary of what was implemented, deviations from plan (escalated), surprises |
| **Output: verification evidence** | Actual command output from test and build runs — not summaries |

---

## Example

Executing Task 2 from the rate limiting plan:

**Execution notes (excerpt):**

```markdown
## Task 2: Rate limit middleware

### Branch
feature/rate-limiting (created from develop at commit a3f9b2c)

### Work Done
- Created src/middleware/rateLimit.ts
  - Token bucket via rate-limiter-flexible RateLimiterRedis
  - Fail-open on Redis connection errors (logs to alerting)
  - Injects X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset on all responses
  - Returns 429 + Retry-After when bucket exhausted
- Applied middleware in src/api/routes/index.ts at line 47
  (after auth middleware, before route handlers — matches plan spec)
- Updated src/middleware/index.ts to export rateLimit

### Commit
feat(api): add per-key token bucket rate limiting middleware

### Verification Evidence
$ npm test src/middleware/rateLimit.test.ts
  ✓ allows 100 requests within window (234ms)
  ✓ blocks 101st request with 429 (12ms)
  ✓ includes X-RateLimit-* headers on all responses (8ms)
  ✓ fail-open when Redis unavailable (45ms)
  4 passing (299ms)

### Surprises / Notes
- Existing auth middleware already attaches req.apiKey — no additional
  extraction needed. Plan assumption confirmed.
- rate-limiter-flexible requires explicit keyPrefix to avoid Redis key
  collisions with session store. Added keyPrefix: 'rl:' — within spec scope.
```

---

## Git-Flow Responsibilities

The executor is the role that actually produces commits. Its git-flow rules are strict:

```bash
# Branch naming (specified in plan)
git checkout -b feature/rate-limiting

# Every commit uses conventional format
git commit -m "feat(api): add per-key token bucket rate limiting middleware"

# CHANGELOG update for every user-facing change
# Add to CHANGELOG.md [Unreleased] section before committing

# Do NOT merge — merges happen post-review
# Do NOT push to develop or main directly
```

| Rule | Why |
|------|-----|
| Conventional commit format | Enables automated changelog generation and `superagent validate commits` |
| CHANGELOG update per user-facing change | `superagent validate changelog --require-entries` will fail if missing |
| No merge to develop/main | Review and merge happen after verifier and reviewer sign off |
| No writes to protected paths | `protected_path_write_guard` hook enforces this at runtime |

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `loop_cap_guard` hook | `hooks/` | Caps execution iterations; prevents runaway loops |
| `protected_path_write_guard` hook | `hooks/` | Blocks writes to `input/`, `roles/`, `workflows/`, `schemas/`, `exports/hosts/` |
| `post_tool_capture` hook | `hooks/` | Routes all tool outputs to capture for audit trail |
| Protected paths | `superagent.manifest.yaml` → `protected_paths` | Defines which paths are off-limits |

---

## When to Use / When NOT to Use

**Use the executor when:**
- You have an approved implementation plan and are ready to write code
- All upstream artifacts (spec, plan, optionally design) have been reviewed and approved
- The feature branch has been created and the working environment is clean

**Do NOT invoke the executor when:**
- The plan is not approved — executing from an unapproved plan is a contract violation
- You want to "quickly hack something in" outside the pipeline — go back to clarifier
- The plan has gaps that would require invention — resolve the gaps in plan-review first

> [!WARNING]
> **Fake tests are an unconditional failure condition.** A test that is structured to pass regardless of whether the feature works — empty assertions, hard-coded expected values, skipped assertions — is worse than no test at all. It produces false verification evidence that corrupts every downstream role's decisions.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Plan drift | Executor implements something not in the spec; reviewer will reject |
| Unwired paths | Code exists but is not connected to anything; feature doesn't work in production |
| Fake tests | False verification evidence corrupts verifier and reviewer decisions |
| Writes to protected paths outside approved flows | Hook violation; execution is blocked |

---

## Related

- [Roles Overview](README.md)
- [planner](planner.md) — upstream role (produces the approved plan)
- [verifier](verifier.md) — downstream role (validates the executor's output)
- [reviewer](reviewer.md) — adversarial review after verification
- [Execute Workflow](../workflows/execute.md) _(coming soon)_
