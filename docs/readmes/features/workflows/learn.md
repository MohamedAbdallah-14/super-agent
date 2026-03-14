# learn

**Phase 13 — Extract durable intelligence from the run so the next run starts smarter.**

![Phase](https://img.shields.io/badge/phase-13%20of%2014-blue)
![Role](https://img.shields.io/badge/role-learner-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Extract scoped, reviewed, explicitly tagged learnings from this run's artifacts so that genuine improvements to patterns, practices, and process can be preserved — without silently mutating the agent's behavior from accepted knowledge.

---

## Pipeline Position

```
  REVIEW
    │
    ▼
┌───────┐
│ LEARN │  ◄── YOU ARE HERE
└───────┘
    │
    ▼
  PREPARE-NEXT  ★ gate (learnings require explicit review)
    │
    ▼
  NEXT RUN
```

---

## Role Responsible

`learner`

The learner synthesizes the run's artifacts into proposed learning artifacts. The key word is "proposed" — learnings are not automatically applied. They are produced, reviewed, scoped, and either accepted or rejected. The learner extracts signal from noise; it does not update behavior unilaterally.

---

## Trigger

The review verdict is accepted — all blocking findings are resolved and the work is complete (or the run is being closed with a formal partial-completion artifact).

---

## Steps

1. **Load run artifacts.** Spec, execution notes, review findings, verification proof. These are the raw material of the learning.

2. **Identify pattern learnings.** What patterns were used that should be institutionalized? What anti-patterns appeared (even in advisory review findings) that should be flagged for future runs?

3. **Identify process learnings.** Were there points in the pipeline where a step was slower or harder than it needed to be? Where did a phase produce a finding that an earlier phase should have caught?

4. **Identify experiment outcomes.** Were any implementation approaches experimental (not the established pattern)? Did they succeed or fail? What is the confidence level of the outcome?

5. **Write proposed learning artifacts.** Each learning artifact must include:
   - Learning type: `pattern`, `anti-pattern`, `process`, or `experiment`
   - Scope tag: which phase(s), role(s), or technology it applies to
   - Evidence: which run artifact(s) support the learning
   - Proposed action: "add to expertise module X", "update skill Y", "note in process docs"
   - Status: `proposed` (all learnings start here)

6. **Produce experiment summaries.** For experimental approaches, write a structured summary with hypothesis, outcome, conditions, and confidence.

7. **Do not auto-apply.** No learning artifact may modify the codebase, skill files, or expertise modules directly. All changes are proposed. The operator reviews and accepts or rejects each learning.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Run artifacts (full set) | Run state | Yes |
| Review findings | Run state | Yes |
| Verification proof | Run state | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Proposed learning artifacts | Typed, scoped, evidence-backed proposed learnings |
| Experiment summaries | Structured outcomes for experimental approaches used in this run |

---

## Approval Gate

> [!IMPORTANT]
> **Accepted learnings require explicit review and scope tags before any action is taken.** A learning artifact in `proposed` status has no effect. The operator reviews each learning and either:
> - **Accepts** it with a scope tag → triggers a specific action (update expertise module, update skill, add to process docs)
> - **Rejects** it → archived, not applied
> - **Defers** it → carried forward as a candidate for the next applicable run

The failure mode of this phase is "auto-applied learning drift" — when learnings modify behavior without explicit review. This is prevented structurally: proposed learning artifacts cannot modify anything; they only describe.

---

## Example Run

**Run review findings included:**
- Finding 2 (advisory): `aria-pressed` not implemented on toggle
- Finding 3 (advisory): execution notes did not echo test output

**Proposed learning artifacts produced:**

```
## Learning L-001
Type: anti-pattern
Scope: executor role, accessibility, component implementation
Evidence: review-findings.md Finding 2; DarkModeToggle.tsx:22
Summary: Toggle button components without aria-pressed attribute fail
screen-reader state communication. This was not caught in spec-challenge
because the AC did not specify an accessibility standard explicitly.
Proposed action: Add "toggle controls require aria-pressed" to expertise
module accessibility/interactive-controls.md.
Status: proposed

## Learning L-002
Type: process
Scope: executor role, execution notes
Evidence: review-findings.md Finding 3
Summary: Execution notes that state the verification command but do not
include captured output are incomplete. Review had to cross-reference
the verification proof artifact manually. Execution notes should be
self-contained verification records.
Proposed action: Update executor role definition to require output
capture in execution notes, not just command reference.
Status: proposed

## Experiment E-001
Approach: CSS [data-theme] attribute for dark mode (vs. CSS class toggle)
Hypothesis: attribute selector is more resilient than class-based toggle
             because it cannot be accidentally overridden by className manipulation
Outcome: SUCCESS — no conflicts found in 147-test run
Conditions: Single-SPA app, no third-party theme manager present
Confidence: medium (single data point)
Proposed action: Note as preferred pattern in expertise/theming.md.
Status: proposed
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Auto-applying learnings without review | Agent behavior silently mutates from a single run's observations | All outputs are `proposed`; nothing is applied without operator review |
| Extracting lessons without evidence | Learning is opinion, not observation | Every learning must cite a specific run artifact |
| Producing learnings too broadly scoped | Proposed change touches too many areas to be safely applied | Scope tags must be specific: which role, which phase, which technology |
| Skipping the learn phase when review found only advisory issues | Advisory findings are the richest source of process learnings | Advisory findings are not minor — they are the signal the pipeline almost missed |
| Writing experiment summaries without confidence levels | Future runs over-apply low-confidence results | Always state sample size and conditions that limit generalizability |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: review](review.md)
- [Next: prepare-next](prepare-next.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
