# spec-challenge

**Phase 4 — Adversarial review of the spec before a single line of design or code is written.**

![Phase](https://img.shields.io/badge/phase-4%20of%2014-blue)
![Role](https://img.shields.io/badge/role-reviewer-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Stress-test the draft spec for contradictions, silent omissions, untestable criteria, and fake completeness — before design, planning, or implementation locks in the spec's mistakes.

---

## Pipeline Position

```
  SPECIFY
    │
    ▼
┌───────────────┐
│ SPEC-CHALLENGE│  ◄── YOU ARE HERE
└───────────────┘
    │
    ▼
  DESIGN  ★ gate (findings must be resolved first)
    │
    ▼
  PLAN ...
```

---

## Role Responsible

`reviewer`

The reviewer is structurally independent from the specifier. This is the mechanism: the person who challenges the spec did not write it. The reviewer's job is to find every crack in the spec before it costs the project a full design-plan-execute cycle to discover.

---

## Trigger

A draft spec artifact exists in run state. The spec has not yet been handed to the designer or planner. `spec-challenge` runs immediately after `specify` completes.

---

## Steps

1. **Load the spec artifact and research artifact.** The research artifact is the ground truth. The spec must be consistent with it.

2. **Check each acceptance criterion for testability.** Can every AC be confirmed true or false with a concrete, reproducible action? Flag any AC that relies on subjective judgment, undefined thresholds, or out-of-scope dependencies.

3. **Check for contradictions.** Do any acceptance criteria contradict each other? Does any AC contradict an assumption? Does any assumption contradict a research finding?

4. **Check for silent omissions.** What does the spec not address that the research suggests it should? What edge cases are conspicuously absent?

5. **Check for fake completeness.** Does the spec appear thorough but actually defer all the hard decisions to the planner? Planners should receive a spec that is specific, not one that requires them to re-invent the requirements.

6. **Check non-goals for correctness.** Are non-goals genuinely out of scope, or are they requirements being silently dropped?

7. **Produce the challenge findings.** Each finding must include:
   - Severity: `blocking` (spec cannot proceed) or `advisory` (proceed with awareness)
   - Which AC, assumption, or section it applies to
   - What the problem is
   - What resolution is required

8. **Issue a verdict.** Either: all findings are advisory and spec can proceed with acknowledgement; or: one or more blocking findings require spec revision before progression.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Draft spec artifact | Run state | Yes |
| Research artifact | Run state | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Spec challenge findings | Structured list of findings with severity, location, and required resolution |

---

## Approval Gate

> [!IMPORTANT]
> **The spec cannot be treated as approved until all blocking challenge findings are resolved or explicitly accepted by the operator.** Advisory findings may proceed with acknowledgement. A rubber-stamp review — one that generates no findings at all — is itself a failure mode. Every spec has something worth questioning.

If blocking findings require spec revision, the specifier must update the spec artifact and re-submit for challenge. This loop may iterate.

---

## Example Run

**Spec under challenge (abbreviated):**

```
AC-3: The dark mode preference survives a page reload.
AC-4: At 768px viewport width, the toggle is accessible and the dark scheme
      renders without layout breakage.
A-2: Server-side preference sync is out of scope.
```

**Challenge findings produced:**

```
## Finding 1 — BLOCKING
AC-3 says preference "survives a page reload" but does not specify the persistence
mechanism. Research (Finding 2) established localStorage as the existing pattern,
but the spec does not reference this. If an implementor uses sessionStorage instead,
AC-3 would pass on a reload within the same tab but fail on a new tab.
Resolution: Amend AC-3 to explicitly state "persists in localStorage across
sessions and new tabs."

## Finding 2 — ADVISORY
AC-4 references "accessible" but does not define the accessibility standard.
Does this mean WCAG 2.1 AA contrast ratio compliance on the toggle control itself?
If so, add this as an explicit sub-criterion. If not, the verifier has no basis
for confirming compliance.
Resolution: Clarify or explicitly descope accessibility standard compliance.

## Finding 3 — ADVISORY
Non-goal A-2 (server-side preference sync) is correct but A-3 (admin panel) is
not present in non-goals. Research did not cover the admin panel at all.
If the admin panel shares the CSS token system, dark mode tokens may inadvertently
render on /admin.
Resolution: Add explicit non-goal: "Dark mode tokens must not apply to /admin routes."

## Verdict: BLOCKING — spec requires revision before proceeding.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Generating zero findings | Challenge is pure theater; spec defects survive into planning | Every non-trivial spec has something worth questioning. If you find nothing, look harder. |
| Marking all findings as advisory | Blocking defects proceed silently | Use blocking severity when a defect would cause a verifier or reviewer to reach a wrong conclusion |
| Challenging style, not substance | Findings waste review bandwidth | Challenge correctness, completeness, and testability — not phrasing preferences |
| Not loading the research artifact | Challenge ignores ground truth | Always compare spec claims against research findings for consistency |
| Closing the loop without revising the spec | The spec remains defective | Blocking findings require an updated spec artifact, not just an acknowledgement |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: specify](specify.md)
- [Next: author](author.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
