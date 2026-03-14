# execute

**Phase 10 — Implement the plan. Nothing more, nothing less.**

![Phase](https://img.shields.io/badge/phase-10%20of%2014-blue)
![Role](https://img.shields.io/badge/role-executor-orange)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Implement the approved plan in ordered, verified batches — producing code and documentation changes that are provably traceable to spec acceptance criteria, with zero unauthorized scope additions.

---

## Pipeline Position

```
  PLAN-REVIEW
    │
    ▼
┌─────────┐
│ EXECUTE │  ◄── YOU ARE HERE
└─────────┘
    │
    ▼
  VERIFY  ★ gate
    │
    ▼
  REVIEW ...
```

---

## Role Responsible

`executor`

The executor implements. It does not plan, design, spec, or review. It works the approved task queue in order and verifies each task before moving to the next. The executor's job is to make the plan real with zero improvisation on scope and zero tolerance for hidden failures.

---

## Trigger

All of the following are true:

- Implementation plan artifact exists and is approved
- Plan-review findings are resolved (no outstanding blocking findings)
- Working branch is clean and ready

---

## Steps

1. **Load the approved implementation plan.** The plan is the contract. Read every task before starting. Understand the full sequence and all dependencies.

2. **Work tasks in sequence.** Start at Task 1. Complete it fully (including its verification step) before starting Task 2. Do not batch tasks without verifying each one.

3. **For each task:**
   a. Implement the change (file edits, new files, etc.)
   b. Run the task's verification step
   c. If verification passes — move to the next task
   d. If verification fails — diagnose and fix before proceeding; do not move forward on a failing task

4. **Log execution notes.** For each task, record: what was changed, what verification was run, and the outcome. This becomes the execution notes artifact consumed by `verify` and `review`.

5. **No new scope.** If you identify something the plan did not address that appears to be a bug or gap, log it in execution notes as an out-of-scope observation. Do not fix it in this run without explicit approval.

6. **Flag plan deviations.** If a task cannot be completed as written (e.g., a file does not exist as expected), stop, document the deviation, and surface it before proceeding. Do not silently substitute an alternative approach.

7. **Produce the execution output.** Code changes on the working branch, docs changes, and execution notes artifact.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Approved implementation plan | Run state | Yes |
| Current branch state | Repo | Yes |
| Design artifact (code scaffolds) | Run state | Required if design phase ran |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Code changes | All file edits and new files on the working branch |
| Docs changes | Any documentation updates required by the plan |
| Execution notes | Per-task log of changes made, verification run, and outcome |

---

## Approval Gate

> [!NOTE]
> Execute has a soft gate rather than a hard pre-execution gate. However:

> [!IMPORTANT]
> **No new scope may be added without explicit operator approval.** If mid-execution you identify work that was not in the plan, stop and surface it. The `loop_cap_guard` hook enforces maximum iteration counts to prevent runaway execution. Execution that silently expands scope is plan drift — the primary failure mode of this phase.

---

## Example Run

**Approved plan (abbreviated):**
```
Task 1 — Extend CSS tokens
Task 2 — Implement useDarkMode hook
Task 3 — Implement DarkModeToggle component
Task 4 — Wire toggle into dashboard nav
Task 5 — Regression check
```

**Execution notes produced:**

```
## Task 1 — Extend CSS tokens
Changed: src/styles/tokens.css
Added [data-theme="dark"] selector with 12 token overrides from tokens.json.
Verification: `npm run lint:css` ✓ (0 errors)
Status: COMPLETE

## Task 2 — Implement useDarkMode hook
Created: src/hooks/useDarkMode.ts
Wraps useLocalStorage('theme', 'light'). Applies data-theme attribute to
document.documentElement on change. SSR guard added (typeof window check).
Verification: `npm test src/hooks/useDarkMode.test.ts` ✓ (6 tests, 6 pass)
Status: COMPLETE

## Task 3 — Implement DarkModeToggle component
Created: src/components/DarkModeToggle.tsx (from design scaffold)
Updated: src/components/DarkModeToggle.test.tsx
Touch target confirmed 44x44px at 768px. Focus ring applied via tokens.
Verification: `npm test DarkModeToggle` ✓ (4 tests, 4 pass)
Status: COMPLETE

## Task 4 — Wire toggle into dashboard nav
Changed: src/layouts/DashboardLayout.tsx (import + placement at line 47)
Created: src/layouts/DashboardLayout.integration.test.tsx
Verification: `npm test DashboardLayout.integration` ✓ (2 tests, 2 pass)
Status: COMPLETE

## Task 5 — Regression check
Verification: `npm test` ✓ (147 tests, 147 pass, 0 skipped)
Status: COMPLETE

## Out-of-scope observations
None.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Skipping a task's verification step | Failures accumulate silently; verifier finds cascading issues | Verify each task before moving to the next — always |
| Adding "while I'm in here" fixes | Scope expands without approval; plan diverges | Log all out-of-scope observations; fix nothing without approval |
| Moving to the next task when verification fails | Downstream tasks build on broken foundations | A failing verification step is a full stop; diagnose and fix first |
| Not logging execution notes | Verifier has no audit trail to confirm against | Execution notes are a required output, not optional commentary |
| Silently substituting an alternative when a task assumption is wrong | Plan deviation is invisible; review cannot catch it | Flag plan deviations explicitly in execution notes before substituting |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: plan-review](plan-review.md)
- [Next: verify](verify.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
