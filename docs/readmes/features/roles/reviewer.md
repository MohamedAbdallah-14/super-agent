# Reviewer

![Role](https://img.shields.io/badge/role-reviewer-blue) ![Phase](https://img.shields.io/badge/phase-12%20%E2%80%94%20review-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**Adversarial by design. The reviewer finds what the executor missed and the verifier couldn't see.**

---

## What is this?

The reviewer performs adversarial review. It is not a rubber-stamp; it is the final checkpoint before work is accepted. It reads the diffs, compares against the approved spec and plan, inspects the verification evidence, and produces findings with severity and rationale tied to evidence — not opinions.

The word "adversarial" is intentional. The reviewer's job is to find failures, not to validate effort. A finding that blocks a feature is a success for the pipeline, not a failure. The failure mode is the opposite: vague findings, uncited criticism, or rubber-stamp approval that lets broken or drifted work through.

The reviewer operates in multiple phases: it challenges the spec (`spec-challenge`), validates designs (`design-review`), reviews the plan (`plan-review`), and performs final code review (`review`). Same role contract, different inputs.

---

## Key Capabilities

- Inspects diffs against approved spec and plan to detect drift and unapproved scope
- Reads changed files to assess correctness, wiring, and completeness
- Evaluates verification evidence — checks it is fresh, complete, and accurate
- Uses secondary model review when available for higher-confidence assessments
- Produces findings with severity (blocking, non-blocking, informational)
- Issues an explicit no-findings verdict when applicable — not silence, a positive statement
- Flags git-flow violations: missing/low-quality changelog entries, non-conventional commits, user-facing changes without changelog records

---

## How It Fits in the Pipeline

The reviewer is **Phase 12** in the main flow, but also appears earlier in challenge phases.

```
[changed files]
[approved spec and plan]
[verification evidence]
            │
            ▼
       [reviewer]
            │
            ├──► findings with severity (BLOCKING / NON-BLOCKING / INFO)
            ├──► rationale tied to evidence (file, line, artifact reference)
            └──► explicit verdict (APPROVED / APPROVED WITH CONDITIONS / BLOCKED)
            │
            ▼
  APPROVED: [learner] / merge / deploy
  BLOCKED:  [executor] fixes → [verifier] re-runs → [reviewer] re-reviews
```

**Also invoked in:**
- `spec-challenge` — adversarially challenges the spec artifact
- `design-review` — validates design artifacts against spec and accessibility
- `plan-review` — validates plan against spec, checks for gaps and hidden coupling

**Triggered by:** `review`, `spec-challenge`, `design-review`, or `plan-review` workflows.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Changed files (diffs), approved spec and plan, verification evidence |
| **Allowed tools** | Diff inspection, targeted file reads, source-backed comparison to spec/plan, secondary model review |
| **Output: findings** | Each finding has: severity, description, evidence citation, recommendation |
| **Output: rationale** | Every finding is tied to a specific file, line, artifact section, or command output |
| **Output: verdict** | Explicit APPROVED, APPROVED WITH CONDITIONS, or BLOCKED — never silence |

---

## Example

**Review findings (excerpt):**

```markdown
# Review: Per-User API Rate Limiting
Date: 2026-03-13
Spec: spec/rate-limiting-v1.md
Plan: plan/rate-limiting-v1.md
Verification: proof/rate-limiting-v1-proof.md

## Findings

### FINDING-1 [NON-BLOCKING]
**Description:** X-RateLimit-Reset header returns Unix timestamp; spec does not specify format.
**Evidence:** src/middleware/rateLimit.ts:67 — `headers['X-RateLimit-Reset'] = resetTime.getTime() / 1000`
**Spec reference:** Spec §Behavior — "includes X-RateLimit-Reset header" (format unspecified)
**Recommendation:** Log as assumption in execution notes; follow up in next spec iteration
with explicit format decision (Unix timestamp vs. ISO 8601 vs. delta-seconds per RFC 7231).

### FINDING-2 [BLOCKING]
**Description:** Fail-open path emits to console.log, not to the alerting system described in spec.
**Evidence:** src/middleware/rateLimit.ts:89 — `console.log('Redis unavailable, failing open')`
**Spec reference:** Spec §Behavior — "emit an alert" (not console.log)
**Recommendation:** Replace console.log with the existing alert service at
src/services/alerting.ts. This is a one-line fix.

## Git-Flow Checks
- Commit format: PASS — all 3 commits in conventional format
- Changelog: PASS — [Unreleased] entry present and descriptive
- Changelog quality: NON-BLOCKING — entry describes the feature but omits the
  fail-open behavior. Consider adding: "Fails open when Redis is unavailable."

## Verdict: BLOCKED
1 blocking finding must be resolved before approval.
FINDING-1 is non-blocking and can be addressed in a follow-up task.
```

---

## Severity Guide

| Severity | Meaning | Effect on Verdict |
|----------|---------|-------------------|
| BLOCKING | Correctness failure, spec violation, security issue, fake test, plan drift | Blocks approval |
| NON-BLOCKING | Quality issue, style inconsistency, minor spec ambiguity | Does not block; should be noted |
| INFO | Observation, question, suggestion for future improvement | No action required |

---

## Git-Flow Responsibilities

The reviewer enforces git-flow quality — not just format:

```
- Flag missing changelog entries as BLOCKING if the change is user-facing
- Flag low-quality changelog entries as NON-BLOCKING with a suggested improvement
- Flag user-facing changes without any changelog entry as BLOCKING
- Verify commit message content accurately describes the change (not just format compliance)
```

A commit message that passes `superagent validate commits` on format but says "fix things" when it adds a new API surface is a NON-BLOCKING finding.

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `review-loop` validation check | `superagent.manifest.yaml` | Tracks review iteration count |
| `loop_cap_guard` hook | `hooks/` | Caps review loops to prevent stalemate cycles |
| Secondary model review | host capability | When available, enables two-model review for higher confidence |

---

## When to Use / When NOT to Use

**Use the reviewer when:**
- Any artifact produced by the pipeline needs validation before the next phase begins
- Execution and verification are complete and work needs a formal verdict
- The spec or plan needs adversarial challenge before execution starts

**Do NOT invoke the reviewer when:**
- You want a quick sanity check during execution — that's not adversarial review, it's just reading the code
- You expect approval as a default — the reviewer will BLOCK if evidence supports it
- You want to use it to delay a decision — APPROVED WITH CONDITIONS and INFO findings allow progress

> [!NOTE]
> The reviewer's most important output is a **no-findings verdict**, not a list of findings. An explicit "no findings — APPROVED" is a positive signal that the pipeline is working. Silence is not an approval.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Vague findings | Executor cannot fix what is not precisely described |
| Uncited criticism | Findings without evidence cannot be evaluated or contested |
| Rubber-stamp approval | Broken work ships; the entire pipeline's integrity depends on this role |

---

## Related

- [Roles Overview](README.md)
- [verifier](verifier.md) — upstream role (produces the proof bundle)
- [executor](executor.md) — implements fixes when reviewer blocks
- [learner](learner.md) — downstream role (processes review findings as learning inputs)
- [specifier](specifier.md) — reviewer challenges spec in `spec-challenge`
- [designer](designer.md) — reviewer validates design in `design-review`
- [planner](planner.md) — reviewer validates plan in `plan-review`
- [Review Workflow](../workflows/review.md) _(coming soon)_
