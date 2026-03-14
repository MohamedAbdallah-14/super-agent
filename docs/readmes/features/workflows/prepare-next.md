# prepare-next

**Phase 14 — Close the current run cleanly so the next one starts from truth, not stale context.**

![Phase](https://img.shields.io/badge/phase-14%20of%2014-blue)
![Role](https://img.shields.io/badge/role-planner-orange)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Produce an explicit, scoped handoff artifact for the next run or next execution slice — capturing exactly what was done, what remains, what was learned, and what context is safe to carry forward — so that nothing stale, ambiguous, or unapproved silently poisons the next session.

---

## Pipeline Position

```
  LEARN
    │
    ▼
┌──────────────┐
│ PREPARE-NEXT │  ◄── YOU ARE HERE
└──────────────┘
    │
    ▼
  NEXT RUN (or session end)
```

---

## Role Responsible

`planner`

The planner who closes a run is often the same role that will open the next one. But the job here is not planning — it is handoff. The planner summarizes what is true now, what is open, and what the next session needs to know. Nothing is assumed. Nothing is carried forward silently.

---

## Trigger

One of:

1. **Full completion** — All 14 phases are done, review is accepted, learnings are proposed. Prepare the next feature's starting point.
2. **Partial completion** — The session is ending before the pipeline finishes. Prepare a mid-pipeline handoff so the next session can resume.
3. **Slice boundary** — The approved plan is being executed in multiple slices. Prepare the handoff between slices.

`prepare-next` must run before any session end where the pipeline is incomplete. It is not optional.

---

## Steps

1. **Summarize what was completed.** List every task, phase, or acceptance criterion that reached a verified, accepted state in this run.

2. **Summarize what remains.** List every task, phase, or acceptance criterion that is open, blocked, or unstarted.

3. **Capture the current artifact state.** What is the state of each artifact (spec, plan, verification proof, etc.)? Is it final, draft, or superseded?

4. **Identify context that is safe to carry forward.** Which facts, decisions, and constraints remain valid for the next run? Explicitly name them.

5. **Identify context that is NOT safe to carry forward.** Which assumptions have been proven wrong? Which constraints have changed? Which artifacts are now stale?

6. **Include accepted learnings (only).** If any proposed learnings from the `learn` phase were accepted by the operator in this session, include them in the handoff. Proposed-but-unreviewed learnings must not be included.

7. **Produce the handoff artifact.** One document. Completion summary, open items, artifact state, safe context, unsafe context, accepted learnings.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Current run summary | Run state | Yes |
| Accepted learnings | Run state | Only if any were accepted |
| All current run artifacts | Run state | Yes (to assess artifact state) |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Next-step handoff | Full handoff document: what's done, what's open, artifact state, context |
| Scoped context summary | Distilled facts safe to carry into the next session |

---

## Approval Gate

> [!NOTE]
> There is no hard approval gate for `prepare-next` itself. However:

> [!IMPORTANT]
> **No implicit carry-forward of unapproved learnings.** If a proposed learning was not explicitly reviewed and accepted by the operator in this session, it must not appear in the handoff artifact. Carrying forward unreviewed learnings causes context drift — future sessions act on unvalidated observations as though they were established facts.

---

## Example Run

**Scenario:** Dark mode feature partially complete. AC-1 through AC-5 verified. AC-6 regression test found a conflict with the admin panel CSS that was not caught in-scope. Session ending.

**Handoff artifact produced:**

```
## Completion Summary
AC-1: VERIFIED ✓ (DashboardLayout.integration.test.tsx)
AC-2: VERIFIED ✓ (DarkModeToggle.test.tsx)
AC-3: VERIFIED ✓ (useDarkMode.test.ts)
AC-4: VERIFIED ✓ (DarkModeToggle 768px snapshot)
AC-5: VERIFIED ✓ (useDarkMode.test.ts)
AC-6: BLOCKED — see open items

## Open Items
AC-6: tokens.css [data-theme="dark"] selector is leaking into /admin routes
because AdminLayout.tsx imports from the same tokens.css. Requires a scoping
fix (either namespace the dark tokens or exclude admin from the data-theme
attribute application).
Blocker introduced: Review Finding 1 (tokens.css selector placement).

## Artifact State
spec.md: FINAL (approved, challenge resolved)
plan.md: FINAL (approved, review passed)
verification-proof.md: PARTIAL (AC-1–5 verified; AC-6 blocked)
review-findings.md: ACTIVE (Finding 1 blocking; Finding 2–3 advisory)
learnings/proposed/: 3 proposed artifacts (none accepted this session)

## Context Safe to Carry Forward
- useLocalStorage hook is the established persistence pattern (src/hooks/useLocalStorage.ts)
- [data-theme] attribute approach is confirmed working for /dashboard
- Dark palette tokens are defined and in use (tokens.json)
- Current branch: feature/dark-mode-dashboard

## Context NOT Safe to Carry Forward
- Assumption A-3 ("dark mode does not affect /admin") is now invalidated —
  the token scoping issue proves /admin is affected. Spec A-3 must be updated.

## Accepted Learnings
None accepted this session. 3 proposed learnings in run state (pending review).

## Next Session Entry Point
Enter at EXECUTE — resume at AC-6 fix.
Required: load plan.md (Task 1 fix: scope tokens.css selector) and
review-findings.md (Finding 1).
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Skipping prepare-next at session end | Next session inherits stale context and must re-discover state | Always run prepare-next before session end if the pipeline is open |
| Carrying forward proposed (unreviewed) learnings | Future sessions treat hypotheses as facts | Only accepted learnings appear in the handoff |
| Vague "what remains" section | Next session wastes time re-discovering open items | Name each open AC, task, or blocker explicitly |
| Not invalidating stale assumptions | Next session operates on disproved context | Explicitly list context that is NOT safe to carry forward |
| Treating handoff as a narrative summary | Next session has to parse prose to recover structured state | Handoff must be structured: completion status, open items, artifact state |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: learn](learn.md)
- [First phase of next run: clarify](clarify.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
