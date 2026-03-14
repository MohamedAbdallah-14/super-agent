# design-review

**Phase 7 — Adversarial validation of the design before a single task is planned.**

![Phase](https://img.shields.io/badge/phase-7%20of%2014-blue)
![Role](https://img.shields.io/badge/role-reviewer-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Optional](https://img.shields.io/badge/optional-skippable-yellow)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Validate the design artifact against the approved spec, checking visual consistency, accessibility compliance, and spec coverage before the design is locked in as the source of truth for planning and execution.

---

## Pipeline Position

```
  DESIGN
    │
    ▼
┌───────────────┐
│ DESIGN-REVIEW │  ◄── YOU ARE HERE
└───────────────┘
    │
    ▼
  PLAN  ★ gate (blocking findings stop planning)
    │
    ▼
  PLAN-REVIEW ...
```

---

## Role Responsible

`reviewer`

The reviewer is structurally independent from the designer who produced the artifact. This is the same structural separation as `spec-challenge`: the person who challenges the work did not produce it. A reviewer who designed the artifact cannot review it — that is not adversarial review, that is self-approval.

---

## Trigger

All of the following are true:

- Design artifact exists (`.fig`, exports, tokens, screenshots)
- Human approval of design direction was given at the design gate
- Design phase was not skipped (if design was skipped, this phase is also skipped)

---

## Steps

1. **Load the design artifact and the approved spec.** Open the screenshots and review the exported scaffolds alongside the acceptance criteria.

2. **Check spec coverage.** Does the design address every acceptance criterion that has a visual component? For each visual AC, identify whether the design satisfies it. Flag any AC not addressed.

3. **Check design-spec consistency.** Does the design introduce anything not in the spec? Visual scope additions that are not in the AC are a red flag — they will cause plan scope creep.

4. **Check accessibility.** At minimum:
   - Color contrast ratios for text on dark and light backgrounds (WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text)
   - Focus states are visible on interactive elements
   - Touch target sizes at mobile breakpoints (minimum 44x44px)

5. **Check visual consistency.** Do the design tokens form a consistent system? Is the dark mode palette coherent with the light mode palette (same spacing, same type scale)?

6. **Check exported code.** Do the exported scaffolds match the designs? Mismatches between `.fig` and exported code are a failure at this phase, not an implementation concern.

7. **Produce findings with severity.** Each finding must include:
   - Severity: `blocking` (planning cannot proceed) or `advisory` (proceed with awareness)
   - Which AC, design component, or export it applies to
   - Visual evidence reference (screenshot filename, canvas element, or token name)
   - Required resolution

8. **Issue a verdict.** No-findings verdict if all checks pass. Blocking verdict if any blocking finding exists.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Design artifact | Run state | Yes |
| Approved spec artifact | Run state | Yes |
| Accessibility guidelines | Repo or external | Optional (WCAG 2.1 AA assumed if absent) |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Design review findings | Structured list of findings with severity, visual evidence, and required resolution |
| No-findings verdict | Explicit statement that all checks passed (if applicable) |

---

## Approval Gate

> [!IMPORTANT]
> **Unresolved blocking findings must stop progression to planning.** Planning consumes the design artifact as a source of truth. If the design artifact has known defects, the plan will encode those defects into implementation tasks.

Advisory findings may proceed to planning with explicit acknowledgement. If a finding is advisory but the designer elects to address it, the design artifact must be updated before planning begins.

---

## Example Run

**Design artifact under review:**

```
screenshots/
  dashboard-dark-desktop.png
  dashboard-dark-mobile-768.png
  toggle-states.png
exports/
  DarkModeToggle.tsx
  tokens.json
```

**Design review findings:**

```
## Finding 1 — BLOCKING
AC-4 requires the toggle to be accessible at 768px.
dashboard-dark-mobile-768.png shows the toggle as a 32x32px icon with no visible
focus ring. Touch target is below the 44x44px minimum. Focus state is absent.
Visual evidence: dashboard-dark-mobile-768.png (toggle, top-right)
Resolution: Redesign toggle at mobile to minimum 44x44px touch target with explicit
focus ring (2px offset, --color-focus token).

## Finding 2 — BLOCKING
tokens.json defines --color-text-dark as #999999 on --color-bg-dark (#1a1a1a).
Contrast ratio: 3.8:1. Fails WCAG 2.1 AA (4.5:1 required for body text).
Visual evidence: tokens.json lines 12–14
Resolution: Adjust --color-text-dark to minimum #b3b3b3 (4.6:1 ratio).

## Finding 3 — ADVISORY
DarkModeToggle.tsx export uses inline styles for transition timing rather than
the transition tokens in tokens.json. This won't cause an AC failure but breaks
token system consistency.
Visual evidence: exports/DarkModeToggle.tsx:34
Resolution: Move transition-duration to tokens.json --transition-toggle.

## Verdict: BLOCKING — design requires revision before planning.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Rubber-stamp approval without checking accessibility | Accessibility failures ship to production | Always check contrast ratios and focus states — these are not optional |
| Generating vague findings without visual evidence | Designer cannot action the finding | Every finding must cite a screenshot, canvas element, or token name |
| Checking only the happy path screens | Edge case designs block execution review | Check all exported screenshots, not just the hero screens |
| Conflating design preferences with spec compliance | Findings noise drowns out real issues | Block only on AC failures and accessibility violations; flag preferences as advisory |
| Approving when exported code diverges from designs | Executor implements the wrong component | Code scaffolds are part of the design artifact; review them |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: design](design.md)
- [Next: plan](plan.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
