# plan-review

**Phase 9 — The last adversarial checkpoint before code gets written.**

![Phase](https://img.shields.io/badge/phase-9%20of%2014-blue)
![Role](https://img.shields.io/badge/role-reviewer-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Adversarially review the implementation plan before execution starts — finding sequence gaps, missing verifications, scope mismatches, and unresolvable dependencies before they cost a full execution cycle.

---

## Pipeline Position

```
  PLAN
    │
    ▼
┌─────────────┐
│ PLAN-REVIEW │  ◄── YOU ARE HERE
└─────────────┘
    │
    ▼
  EXECUTE  ★ gate (blocking findings stop execution)
    │
    ▼
  VERIFY ...
```

---

## Role Responsible

`reviewer`

The reviewer is structurally independent from the planner. This is the third structural adversarial checkpoint in the pipeline (after `spec-challenge` and `design-review`). The reviewer's goal is to find execution blockers before they surface mid-implementation, when rework is expensive.

---

## Trigger

A draft implementation plan artifact exists in run state. The plan has not yet been handed to the executor. `plan-review` runs immediately after `plan` completes.

---

## Steps

1. **Load the draft plan and the approved spec.** The spec is the correctness baseline. The plan is correct when its tasks collectively satisfy every acceptance criterion.

2. **Check AC coverage.** Does every acceptance criterion have at least one task that addresses it? Flag any AC with no corresponding task.

3. **Check task sequence for gaps.** Are there tasks that depend on a file or function that a prior task has not yet created? Can every task be executed with only what exists before it in the sequence?

4. **Check verification steps.** Does every task have a concrete, runnable verification step? Flag tasks where verification is "it should work" or "check visually" without a specific artifact.

5. **Check for scope drift.** Does the plan introduce any tasks not traceable to a spec AC? Scope additions in planning are a red flag — they indicate the planner invented requirements.

6. **Check for missing dependencies.** Does the plan assume library availability, environment configuration, or file existence that is not confirmed by the research artifact?

7. **Check task granularity.** Are any tasks so large that a single task failure mid-execution leaves the codebase in an ambiguous intermediate state? Flag over-large tasks.

8. **Produce findings with severity.** Each finding must include:
   - Severity: `blocking` (execution cannot start) or `advisory` (proceed with awareness)
   - Which task(s) are affected
   - What the problem is
   - Required resolution (task revision, re-sequencing, or verification addition)

9. **Issue a verdict.** No-findings verdict if all checks pass. Blocking verdict if any blocking finding exists.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Draft implementation plan | Run state | Yes |
| Approved spec artifact | Run state | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Plan review findings | Structured findings with severity, task reference, and required resolution |
| Revised tasks | Updated task definitions when findings require task rewrites |

---

## Approval Gate

> [!IMPORTANT]
> **Execution cannot begin until all blocking findings are closed or explicitly accepted by the operator.** Advisory findings may proceed with acknowledgement. A plan that survives `plan-review` with blocking findings silently accepted is a plan that will generate execution failures.

If blocking findings require plan revision, the planner must update the plan artifact and re-submit for review. This loop may iterate but must converge.

---

## Example Run

**Plan under review (abbreviated tasks):**

```
Task 3 — Implement DarkModeToggle component
  Verification: npm test DarkModeToggle passes; Storybook renders at 768px.

Task 4 — Wire toggle into dashboard nav
  Verification: Integration test: toggle visible at 320px and 1280px.
```

**Plan review findings:**

```
## Finding 1 — BLOCKING
Task 4 references an integration test that does not exist in the current codebase
(research artifact confirms: no integration tests for DashboardLayout.tsx).
If Task 4 verification requires a new integration test to be written, that test
must be part of Task 4's definition — otherwise the verification step cannot
be completed as written.
Resolution: Add sub-step to Task 4: "Write integration test for toggle visibility
at 320px and 1280px before implementing the wiring."

## Finding 2 — BLOCKING
AC-6 (no existing light mode styles broken) has no dedicated task and no
regression verification step. Task 5 addresses this but is listed after
Task 4 — however, Task 3's component implementation could break light mode
styles at import time if the CSS token extension in Task 1 is not complete.
The sequence implicitly assumes Task 1 completes before Task 3's import runs,
but this is not stated as a dependency.
Resolution: Add explicit dependency note: "Task 3 requires Task 1 complete."

## Finding 3 — ADVISORY
Task 2's unit test description ("preference persists across simulated page reload")
is ambiguous — what is the simulation mechanism? jsdom localStorage mock or actual
window.location reload?
Resolution: Specify test method in Task 2 verification step.

## Verdict: BLOCKING — plan requires revision before execution.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Approving a plan that has no coverage for one AC | That AC fails verification; review finds it; execution must restart | Map every AC to at least one task; flag gaps explicitly |
| Missing sequence dependency analysis | Executor hits "file not found" mid-implementation | Trace every task's file dependencies to earlier tasks in the sequence |
| Accepting "visual check" as a verification step | Verifier has no deterministic proof | Visual checks are acceptable only when paired with a screenshot comparison command |
| Skimming the plan quickly | Sequence gaps and missing verifications survive into execution | Review each task individually, then review the sequence as a whole |
| Not loading the research artifact | Missing dependencies go undetected | Research confirms what is available; plan must stay within those bounds |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: plan](plan.md)
- [Next: execute](execute.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
