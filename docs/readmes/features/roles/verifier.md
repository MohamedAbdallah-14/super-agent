# Verifier

![Role](https://img.shields.io/badge/role-verifier-blue) ![Phase](https://img.shields.io/badge/phase-11%20%E2%80%94%20verification-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**No proof, no pass. The verifier runs the tests, reads the output, and produces evidence — not opinions.**

---

## What is this?

The verifier produces proof. It runs deterministic checks — tests, builds, diffs, schema validation, branch and commit validation — and assembles the results into a verification proof artifact with an explicit pass/fail status.

The key word is **deterministic**. The verifier does not evaluate subjective quality, architectural merit, or code style. It runs commands and reports what happened. If the tests pass, that is evidence. If the build fails, that is evidence. If a claimed outcome has no deterministic verification path, that is an escalation.

This role exists because "the tests pass" is not evidence — a command output log is evidence. The distinction matters enormously when the reviewer, operator, or a future learner needs to understand whether something actually worked.

---

## Key Capabilities

- Runs the full test suite and captures complete output (not summaries)
- Executes build commands and captures results
- Performs diff inspection to verify that changes match the approved plan
- Validates artifact schemas for correctness
- Runs SuperAgent's own validation commands (branches, commits, changelog)
- Produces a proof bundle with explicit pass/fail status for every claimed outcome
- Escalates when no deterministic verification path exists for a claimed outcome

---

## How It Fits in the Pipeline

The verifier is **Phase 11**. It runs after execution is complete.

```
[changed files]
[claimed outcomes from execution notes]
[verification commands from plan]
[acceptance criteria from spec]
            │
            ▼
       [verifier]
            │
            ├──► verification proof artifact
            ├──► command results (full output, not summaries)
            └──► explicit pass/fail per claimed outcome
            │
            ▼
       [reviewer]
```

**Triggered by:** `verify` workflow.

**Feeds into:** reviewer.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Changed files, claimed outcomes, verification commands from plan, acceptance criteria from spec |
| **Allowed tools** | Test commands, build commands, diff inspection, schema validation |
| **Output: verification proof artifact** | Full proof bundle — every check, its command, and its result |
| **Output: command results** | Actual stdout/stderr output from every verification command |
| **Output: pass/fail status** | Explicit PASS or FAIL for every acceptance criterion and git-flow check |

---

## Example

**Verification proof artifact (excerpt):**

```markdown
# Verification Proof: Per-User API Rate Limiting
Date: 2026-03-13
Branch: feature/rate-limiting
Commit: d7a2f91

## Acceptance Criteria Results

### AC1: 100 requests in 60s window — all HTTP 200
Status: PASS
Command: npm test src/middleware/rateLimit.test.ts -- --grep "allows 100 requests"
Output:
  ✓ allows 100 requests within window (234ms)
  1 passing

### AC2: 101st request — HTTP 429 + Retry-After
Status: PASS
Command: npm test src/middleware/rateLimit.test.ts -- --grep "blocks 101st request"
Output:
  ✓ blocks 101st request with 429 (12ms)
  1 passing

### AC3: Window reset — full quota restored
Status: PASS
Command: npm test src/middleware/rateLimit.test.ts -- --grep "restores quota"
Output:
  ✓ restores full quota after window reset (1204ms)
  1 passing

### AC5: Redis failure — fail-open + alert
Status: PASS
Command: npm test src/middleware/rateLimit.test.ts -- --grep "fail-open"
Output:
  ✓ fail-open when Redis unavailable (45ms)
  1 passing

### AC6: Existing integration tests unchanged
Status: PASS
Command: npm run test:integration
Output:
  43 passing (8.2s)
  0 failing

## Git-Flow Checks

### Branch Naming
Status: PASS
Command: superagent validate branches
Output: ✓ feature/rate-limiting — valid feature branch name

### Commit Format
Status: PASS
Command: superagent validate commits
Output: ✓ 3/3 commits in conventional format

### Changelog Entries
Status: PASS
Command: superagent validate changelog --require-entries
Output: ✓ 1 entry found under [Unreleased]

## Build
Status: PASS
Command: npm run build
Output: Built in 4.2s, 0 errors, 0 warnings

## Overall Status: PASS
All 6 acceptance criteria: PASS
All git-flow checks: PASS
Build: PASS
```

---

## Git-Flow Responsibilities

The verifier runs four SuperAgent validation commands as mandatory checks:

```bash
# Branch naming conventions
superagent validate branches

# Conventional commit format on all commits in branch
superagent validate commits

# Changelog format
superagent validate changelog

# Require at least one new entry on feature/codex/hotfix branches
superagent validate changelog --require-entries
```

All four results must appear in the verification proof artifact.

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `verification-proof` validation check | `superagent.manifest.yaml` | Enforces that proof artifact exists before review |
| `review-loop` validation check | `superagent.manifest.yaml` | Tracks verification loop count |
| `loop_cap_guard` hook | `hooks/` | Caps re-verification iterations to prevent infinite loops |
| Acceptance criteria | spec artifact | Source of truth for what must be verified |
| Verification commands | plan artifact | Specifies exact commands to run |

---

## When to Use / When NOT to Use

**Use the verifier when:**
- Execution is complete and you need a proof bundle before review begins
- Re-running after the reviewer found failures that have been fixed
- You need a formal verification record for audit, compliance, or handoff

**Do NOT invoke the verifier when:**
- Execution is still in progress — verify after the full plan slice is complete
- You want to use it to check work-in-progress — run tests directly; the verifier produces a formal artifact
- You are tempted to write "PASS" based on partial runs — every criterion must be run fresh

> [!WARNING]
> **Stale verification is a failure condition.** If the verifier runs tests, then code is changed, and the proof artifact is not regenerated — the proof is stale and invalid. The reviewer will check commit timestamps against proof timestamps and flag it.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Incomplete proof | Reviewer cannot make a defensible verdict; spec criteria go unvalidated |
| Stale verification | Proof does not reflect actual current state of the code |
| Claiming success without fresh evidence | The most critical failure — signs off on broken work |

---

## Related

- [Roles Overview](README.md)
- [executor](executor.md) — upstream role (produces the code to be verified)
- [reviewer](reviewer.md) — downstream role (consumes the proof bundle)
- [planner](planner.md) — defines verification commands per task
- [specifier](specifier.md) — defines acceptance criteria that verification must cover
- [Verify Workflow](../workflows/verify.md) _(coming soon)_
