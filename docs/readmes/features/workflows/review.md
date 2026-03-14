# review

**Phase 12 — The adversarial post-implementation review that stands between your code and completion.**

![Phase](https://img.shields.io/badge/phase-12%20of%2014-blue)
![Role](https://img.shields.io/badge/role-reviewer-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Run a hard adversarial review of the changed implementation and its evidence — checking correctness against spec, design alignment, verification quality, and code integrity — before declaring the work done.

---

## Pipeline Position

```
  VERIFY
    │
    ▼
┌────────┐
│ REVIEW │  ◄── YOU ARE HERE
└────────┘
    │
    ▼
  LEARN  ★ gate (blocking findings stop completion)
    │
    ▼
  PREPARE-NEXT ...
```

---

## Role Responsible

`reviewer`

This is the fourth structural adversarial checkpoint in the pipeline. The reviewer examines the full evidence set — changed files, verification proof, spec, plan, and design artifact — and produces findings. The reviewer's job is not to be satisfied with good intentions; it is to be satisfied with evidence.

---

## Trigger

All of the following are true:

- Execution batch(es) are complete
- Verification proof artifact is fresh (produced against current branch state)
- All upstream artifacts are available (spec, plan, design artifact if applicable)

---

## Steps

1. **Load all review inputs.** Changed files, verification proof, approved spec, approved plan, and design artifact (if the design phase ran).

2. **Verify the proof is fresh.** Confirm the verification proof was produced against the current branch state. If the proof is stale, stop and require fresh proof before continuing.

3. **Review changed files against the spec.** For each acceptance criterion, confirm that the changed code satisfies it — not just that a test claims it does. Read the relevant code.

4. **Review changed files against the plan.** Was execution faithful to the plan? Any task that was deviated from, skipped, or silently substituted is a finding.

5. **Review for design-implementation alignment (when design phase ran).** Compare the implemented UI against the design artifact screenshots and exported scaffolds. Visual drift from the design that is not documented in execution notes is a finding.

6. **Review the verification proof for completeness.** Does every AC have mapped proof? Is any AC "assumed passing" without evidence? Incomplete proof is itself a finding.

7. **Review code quality within scope.** The review is not a free-form code audit — focus on correctness, safety, and spec compliance. Note structural issues as advisory findings.

8. **Produce findings with severity.** Each finding must include:
   - Severity: `blocking` (completion cannot proceed) or `advisory` (proceed with awareness)
   - Which AC, task, or code change it applies to
   - Specific file, line, or evidence reference
   - Required resolution

9. **Issue a verdict.** No-findings verdict if all checks pass. Blocking verdict if any blocking finding exists.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Changed files | Repo (working branch) | Yes |
| Verification proof artifact | Run state | Yes |
| Approved spec artifact | Run state | Yes |
| Approved plan artifact | Run state | Yes |
| Design artifact | Run state | Required if design phase ran |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Review findings | Structured findings with severity, evidence reference, and resolution |
| No-findings verdict | Explicit statement that all checks passed (if applicable) |

---

## Approval Gate

> [!IMPORTANT]
> **Unresolved blocking findings must stop completion.** Work cannot be declared done while blocking findings remain open. Advisory findings may be acknowledged and carried forward (as candidates for the `learn` phase or future work).

If blocking findings require code changes, the executor must address them, a new verification proof must be produced, and review re-runs for the affected areas.

---

## Example Run

**Review inputs:**
- 147/147 tests passing (verification proof)
- Changed files: tokens.css, useDarkMode.ts, DarkModeToggle.tsx, DashboardLayout.tsx
- Design screenshots: dashboard-dark-desktop.png, dashboard-dark-mobile-768.png

**Review findings:**

```
## Finding 1 — BLOCKING
AC-6 (no existing light mode styles broken) has a passing test suite, but
tokens.css review reveals that the [data-theme="dark"] block was added
inside the @media (prefers-color-scheme: dark) query rather than as a
standalone data attribute selector. This means dark mode only activates when
the OS-level setting is also dark — it will not respond to the toggle alone.
File: src/styles/tokens.css:48–72
Resolution: Move [data-theme="dark"] block outside the @media query.
Re-run verification after fix.

## Finding 2 — ADVISORY
DarkModeToggle.tsx does not implement the aria-pressed attribute on the
toggle button. Screen readers cannot convey toggle state to visually
impaired users. This does not block a spec AC (accessibility standard was
marked advisory in design-review) but should be addressed before shipping.
File: src/components/DarkModeToggle.tsx:22
Resolution: Add aria-pressed={isDark} to the button element.

## Finding 3 — ADVISORY
Execution notes for Task 5 (regression check) list `npm test` as the
verification command but do not include the captured output in the notes.
The verification proof artifact does include the output — this is a
documentation gap, not a proof gap.
Resolution: Note for future runs: execution notes should echo test output,
not just state the command.

## Verdict: BLOCKING — fix required before completion.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Accepting stale verification proof | Review is validating a different state than what will ship | Always check proof timestamp and branch against current state |
| Skipping design-implementation alignment check | Design drift ships silently | When a design artifact exists, compare screenshots to running implementation |
| Vague findings without file/line citations | Executor cannot action the finding | Every finding needs a specific file reference or evidence anchor |
| Reviewing code style outside AC scope | Findings noise drowns real issues | Keep blocking findings to spec correctness, proof gaps, and safety issues |
| Issuing a no-findings verdict too quickly | Defects reach completion | Take the time the review requires; a slow review that catches a bug is better than a fast one that misses it |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: verify](verify.md)
- [Next: learn](learn.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
