# clarify

**Phase 1 — Turn noise into signal before anything else moves.**

![Phase](https://img.shields.io/badge/phase-1%20of%2014-blue)
![Role](https://img.shields.io/badge/role-clarifier-orange)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Convert raw operator input into a clarified scope, an explicit question list, and a usable problem frame that every downstream phase can trust.

---

## Pipeline Position

```
  INPUT
    │
    ▼
┌─────────┐
│ CLARIFY │  ◄── YOU ARE HERE
└─────────┘
    │
    ▼
  DISCOVER
    │
    ▼
  SPECIFY ...
```

---

## Role Responsible

`clarifier`

The clarifier's sole job is honest problem framing. It does not solve the problem. It does not propose solutions. It surfaces what is actually known, what is assumed, and what remains genuinely open. A clarifier that fabricates certainty to move faster is a clarifier that has failed.

---

## Trigger

One or more briefing files appear in `input/`. This can be:

- A plain-text feature request
- A bug report
- A product brief
- A user story or ticket dump
- A conversation transcript handed off from a prior session

If the `session_start` hook fires and `input/` is non-empty, the `clarify` workflow is the correct entry point.

---

## Steps

1. **Ingest all input files.** Read every file in `input/`. Do not skim. Missing a buried constraint in a long brief is a clarify failure.

2. **Extract explicit requirements.** List what the operator has actually stated — not implied, not inferred. Use the operator's exact language where possible.

3. **Surface implicit assumptions.** Identify what the brief takes for granted. These become candidate assumptions in the spec.

4. **Enumerate unresolved questions.** For every material ambiguity, write a question. Questions must be concrete and answerable — not philosophical.

5. **Scope the problem frame.** Write a concise scope summary (1–3 paragraphs) that a reviewer who has not read the brief can use to understand the problem being solved.

6. **Flag escalation items.** If any question is so fundamental that downstream phases cannot proceed without an answer, escalate explicitly. Do not pretend it can be deferred.

7. **Produce the clarification artifact.** Combine explicit requirements, assumptions, questions, and scope summary into a single structured artifact.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Operator briefing | `input/` | Yes — at least one file |
| Active research (prior run) | run state | Optional |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Clarification artifact | Structured document: requirements, assumptions, questions, scope summary |
| Unresolved questions list | Flat list of open items, marked by severity (blocking / advisory) |
| Scope summary | 1–3 paragraph problem frame for downstream consumption |

---

## Approval Gate

There is no formal hard gate after `clarify`. However:

> [!IMPORTANT]
> If any question is **materially blocking** — meaning the discover or specify phases cannot produce a correct output without its answer — the clarifier MUST escalate before proceeding. Hiding ambiguity as false certainty is the primary failure mode of this phase.

Downstream phases treat the clarification artifact as the authoritative problem frame. Errors introduced here compound through every phase that follows.

---

## Example Run

**Input brief** (`input/brief.md`):

> "Add dark mode support to the dashboard. Users have been asking for it. Should work on mobile too."

**Clarification artifact produced:**

```
## Explicit Requirements
- Dark mode toggle on the dashboard
- Mobile compatibility required

## Implicit Assumptions
- "Dark mode" means a CSS-variable-driven color scheme toggle (not OS-level detection only)
- "Mobile" means responsive breakpoints already in use (< 768px)
- Dashboard refers to /dashboard route, not the admin panel

## Unresolved Questions
[BLOCKING] Does "dark mode" require persistent user preference (localStorage / account setting),
           or is per-session toggle sufficient?
[ADVISORY] Should the toggle appear in the nav bar, user settings, or both?
[ADVISORY] Are there brand color constraints for dark palette — is there a design system doc?

## Scope Summary
Add a dark mode color scheme to the main dashboard view with mobile compatibility.
The primary ambiguity is persistence model for the user preference. All other
requirements are inferable from current system state once that is resolved.
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Treating inferred requirements as explicit | Spec built on false foundations | Use operator's exact language; mark everything else as assumption |
| Writing vague questions | Questions cannot be answered | Make every question concrete and answerable in one sentence |
| Hiding a blocking question as advisory | Downstream phases proceed on bad assumptions | If in doubt, escalate as blocking |
| Skipping briefing files in `input/` | Missing constraints emerge in execution | Read every input file — even the ones that look like noise |
| Writing the scope summary as a solution | The clarifier is not the specifier | Scope summaries describe the problem, not the answer |

---

## Related

- [Overview — All Workflows](README.md)
- [Next: discover](discover.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
