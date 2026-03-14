# plan

**Phase 8 — Translate the approved spec into an execution-grade implementation plan with no ambiguity left for the executor to resolve.**

![Phase](https://img.shields.io/badge/phase-8%20of%2014-blue)
![Role](https://img.shields.io/badge/role-planner-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Translate the approved spec (and design artifact, if present) into an ordered, dependency-resolved implementation plan where every task has a verification step — so that the executor has nothing left to decide except how to type.

---

## Pipeline Position

```
  DESIGN-REVIEW (or SPEC-CHALLENGE if design skipped)
    │
    ▼
┌──────┐
│ PLAN │  ◄── YOU ARE HERE
└──────┘
    │
    ▼
  PLAN-REVIEW  ★ gate
    │
    ▼
  EXECUTE ...
```

---

## Role Responsible

`planner`

The planner works from the approved spec and design artifact. It does not invent requirements — it sequences their implementation. A plan that introduces implementation decisions not grounded in the spec or design is a plan that has exceeded its mandate. A plan that is too high-level to execute is a plan that has failed its purpose.

---

## Trigger

All of the following are true:

- Spec artifact exists, approved, challenge findings resolved
- Design artifact exists and design-review passed (or design phase was explicitly skipped)
- Current repo state is available (branch, file structure, test coverage status)

---

## Steps

1. **Load all upstream artifacts.** Spec, research, and design artifact (if present). The plan must be traceable to these sources.

2. **Assess current repo state.** What is the current branch? What files are relevant? What tests currently pass? What is the existing code structure that implementation will touch?

3. **Identify all implementation tasks.** For each acceptance criterion, enumerate the concrete code changes required. Tasks are specific file-and-function level, not feature-level.

4. **Sequence tasks by dependency.** A task that depends on another task must come after it. Sequence gaps are a plan failure mode — `plan-review` will catch them, but the planner should find them first.

5. **Assign verification steps to each task.** Every task must have a concrete verification step: a test command, a visual check, a lint check. "It should work" is not a verification step.

6. **Identify risks and mitigations.** For each high-risk task, note the risk and the mitigation strategy.

7. **Produce the implementation plan artifact.** Structured document: ordered tasks, per-task verification, risk notes, and traceability back to AC numbers.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Approved spec artifact | Run state | Yes |
| Research artifact | Run state | Yes |
| Design artifact | Run state | Required if design phase ran |
| Current repo state | Repo | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Implementation plan artifact | Ordered tasks with verification steps and AC traceability |
| Task list | Flat ordered list of tasks (used by executor as the execution queue) |

---

## Approval Gate

> [!IMPORTANT]
> **Explicit human approval is required before execution begins.** The plan is the binding execution contract. Once approved, the executor implements only what is in the plan. New scope requires a new approval cycle — no executor-side plan expansion.

Plan approval follows `plan-review`. Both the plan and the plan-review findings must be resolved before execution starts.

---

## Example Run

**Spec inputs (abbreviated):**
- AC-1: Toggle visible at all viewport widths
- AC-2: Toggle switches scheme within one render cycle
- AC-3: Preference persists in localStorage across sessions and new tabs
- AC-4: Correct rendering at 768px breakpoint
- AC-5: Toggling back to light restores original scheme
- AC-6: No existing light mode styles broken

**Design artifact:** `dashboard-dark-mode.fig`, `DarkModeToggle.tsx`, `tokens.json`

**Implementation plan produced:**

```
## Task Sequence

### Task 1 — Extend CSS tokens (AC-2, AC-5, AC-6)
File: src/styles/tokens.css
Add [data-theme="dark"] selector with dark token overrides.
Use tokens from design artifact tokens.json.
Verification: `npm run lint:css` passes; visual diff of /dashboard in both themes.

### Task 2 — Implement useDarkMode hook (AC-2, AC-3)
File: src/hooks/useDarkMode.ts (new file)
Wraps useLocalStorage (existing hook). Sets/reads 'theme' key.
Applies [data-theme] attribute to document.documentElement.
Verification: Unit test: preference persists across simulated page reload.

### Task 3 — Implement DarkModeToggle component (AC-1, AC-4)
File: src/components/DarkModeToggle.tsx
Use design artifact export as scaffold. 44x44 touch target at mobile.
Aria-label: "Toggle dark mode". Focus ring per tokens.
Verification: `npm test DarkModeToggle` passes; Storybook renders at 768px.

### Task 4 — Wire toggle into dashboard nav (AC-1, AC-4)
File: src/layouts/DashboardLayout.tsx
Import DarkModeToggle; place in nav bar top-right.
Verification: Integration test: toggle visible at 320px and 1280px.

### Task 5 — Regression check (AC-6)
Run full test suite. Visual regression on /dashboard light mode.
Verification: `npm test` all green; no visual diff on light theme screenshots.

## Risks
R1: useLocalStorage hook — if it uses JSON.stringify, 'light' string must
    not be double-encoded. Verify at Task 2.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Tasks at feature granularity, not file granularity | Executor has to decompose the plan mid-execution (plan drift) | Each task names a specific file and a specific change |
| Missing verification steps | Executor cannot confirm task completion; verifier has no checkpoints | Every task has a runnable verification command or explicit visual check |
| No AC traceability in tasks | Verifier cannot map proof to acceptance criteria | Tag each task with the AC(s) it addresses |
| Sequencing tasks without dependency analysis | Executor hits a blocker because a dependency is missing | Draw the dependency graph before writing the sequence |
| Plan introduces new requirements | Scope expands silently; spec is now wrong | Every task must trace to a spec AC or a non-goal removal |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: design-review](design-review.md)
- [Next: plan-review](plan-review.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
