# specify

**Phase 3 — The contract that every phase downstream will be judged against.**

![Phase](https://img.shields.io/badge/phase-3%20of%2014-blue)
![Role](https://img.shields.io/badge/role-specifier-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Turn clarified scope and source-backed research into a measurable spec: explicit acceptance criteria, named assumptions, and documented non-goals that all downstream phases treat as law.

---

## Pipeline Position

```
  DISCOVER
    │
    ▼
┌─────────┐
│ SPECIFY │  ◄── YOU ARE HERE
└─────────┘
    │
    ▼
  SPEC-CHALLENGE  ★ gate
    │
    ▼
  DESIGN / PLAN ...
```

---

## Role Responsible

`specifier`

The specifier transforms research into requirements. It does not invent requirements from nothing — it synthesizes what clarification identified and what research confirmed into a form that can be tested, challenged, and implemented. A specifier who writes acceptance criteria that cannot be verified has produced a spec in name only.

---

## Trigger

Both of the following artifacts are available in run state:

- Clarification artifact (complete, no unresolved blocking questions)
- Research artifact (all findings cited; no unsupported hypotheses flowing forward)

---

## Steps

1. **Load clarification and research artifacts.** The spec is synthesized from these two sources. Do not introduce requirements not traceable to either.

2. **Write the problem statement.** One paragraph. What is being built and why. Crisp enough that a reviewer who has read neither brief nor research can orient.

3. **Write acceptance criteria.** Each criterion must be:
   - Testable (can be confirmed true or false with a concrete action)
   - Specific (no weasel words like "should feel fast" or "works on mobile")
   - Bounded (scoped to this work, not aspirationally future)

4. **Document assumptions.** Explicitly record every assumption the spec depends on. If the spec is later found to be wrong because an assumption was wrong, the assumption list is the audit trail.

5. **Document non-goals.** State explicitly what this work does NOT do. Non-goals prevent scope creep in planning and execution.

6. **Note open items.** If any advisory question from clarification was not resolved by research, document it here as a spec assumption or escalate to the operator.

7. **Produce the spec artifact.** One document containing problem statement, acceptance criteria, assumptions, and non-goals.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Clarification artifact | Run state | Yes |
| Research artifact | Run state | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Spec artifact | Problem statement, acceptance criteria, assumptions, non-goals |
| Acceptance criteria | Flat testable list extracted from spec (used by verifier) |
| Assumptions list | Named assumptions the spec depends on |

---

## Approval Gate

> [!IMPORTANT]
> **Explicit human approval is required before planning begins.** The spec is the contract. Once approved, the planner treats it as immutable. Changes to the spec after approval invalidate the plan and require a new planning run.

The approval gate is hard. An unapproved spec cannot be handed to the planner. The `spec-challenge` workflow runs before final approval to adversarially test the spec — do not conflate spec-challenge with final approval. Both must occur.

---

## Example Run

**Research artifact inputs (summary):**
- CSS custom properties pattern established in codebase
- `useLocalStorage` hook already exists for persistence
- Mobile breakpoint at 768px
- No brand color constraints found (assumption required)

**Spec artifact produced:**

```
## Problem Statement
Add a dark mode color scheme to the main dashboard (/dashboard). Users should be
able to toggle between light and dark mode. Preference persists across sessions
via localStorage. Dark mode must render correctly at the 768px mobile breakpoint.

## Acceptance Criteria
AC-1: A toggle control is visible on the /dashboard page at all viewport widths.
AC-2: Activating the toggle switches the page to a dark color scheme within one
      render cycle (no page reload).
AC-3: The dark mode preference survives a page reload (localStorage persistence).
AC-4: At 768px viewport width, the toggle is accessible and the dark scheme
      renders without layout breakage.
AC-5: Toggling from dark back to light restores the original light scheme.
AC-6: No existing light mode styles are broken by the dark mode implementation.

## Assumptions
A-1: Dark color palette will be defined by the designer; no pre-existing brand
     dark palette doc exists.
A-2: Server-side preference sync is out of scope for this work.
A-3: Admin panel (/admin) is not in scope.

## Non-Goals
- OS-level prefers-color-scheme auto-detection (future work)
- Dark mode for any page other than /dashboard
- Account-level server-side preference storage
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Writing untestable acceptance criteria | Verifier cannot confirm completion | Each AC must be verifiable with a concrete action and observable outcome |
| Introducing requirements not in clarification or research | Scope creep before planning even starts | Trace every AC to a clarification item or research finding |
| Omitting non-goals | Executor and planner add scope during execution | Name non-goals explicitly; "we considered X and excluded it" |
| Writing assumptions as facts | When an assumption is wrong, there is no audit trail | Mark every assumption clearly as an assumption |
| Merging spec with design decisions | Spec is what; design is how | AC-6 above is correct ("no existing styles broken"); "use CSS variables" belongs in the plan |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: discover](discover.md)
- [Next: spec-challenge](spec-challenge.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
