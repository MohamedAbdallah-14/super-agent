# discover

**Phase 2 — Source-backed research that eliminates planning risk before it becomes implementation debt.**

![Phase](https://img.shields.io/badge/phase-2%20of%2014-blue)
![Role](https://img.shields.io/badge/role-researcher-orange)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Gather cited, source-backed research on every open question and risk identified during clarification, so the specifier can write an artifact grounded in fact rather than assumption.

---

## Pipeline Position

```
  CLARIFY
    │
    ▼
┌──────────┐
│ DISCOVER │  ◄── YOU ARE HERE
└──────────┘
    │
    ▼
  SPECIFY
    │
    ▼
  SPEC-CHALLENGE ...
```

---

## Role Responsible

`researcher`

The researcher's job is to find what is actually true — about the codebase, the domain, the constraints, and the open questions — and to prove it with citations. A researcher who produces findings without sources is producing opinion, not research. Opinion cannot flow forward.

---

## Trigger

The clarification artifact is complete. Specifically:

- The scope summary is written
- Explicit requirements are listed
- Unresolved questions exist (at minimum: advisory items; blocking items must have been escalated and answered)

If the clarification artifact has no open questions and no research gaps, `discover` can complete very quickly — but it must still run and produce a research artifact, even if brief.

---

## Steps

1. **Load the clarification artifact.** Parse the unresolved questions list and scope summary. These are your research agenda.

2. **Investigate the current codebase.** For questions about existing behavior, existing constraints, or current implementation state — the codebase is the primary source. Cite file paths and line numbers.

3. **Research external dependencies and APIs.** If the scope involves third-party services, libraries, or protocols, find the current version, known constraints, and relevant documentation sections.

4. **Investigate domain knowledge gaps.** If the scope involves a domain the agent is not expert in, research current best practice with citations.

5. **Assess risk factors.** For each finding, assess implementation risk: is this a known-stable API, a deprecated path, a common footgun?

6. **Resolve open questions.** For every unresolved question from clarification, produce a finding with a source. Mark questions that remain open after research.

7. **Produce the research artifact.** One document. All findings. All citations. No finding without a source.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Clarification artifact | Run state | Yes |
| Unresolved questions list | Run state | Yes |
| Codebase | Repo | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Research artifact | All findings with citations (file:line for codebase, URL/doc for external) |
| Cited findings | Flat list of key facts the specifier will use as constraints |

---

## Approval Gate

There is no formal hard gate after `discover`. However:

> [!IMPORTANT]
> **Unsupported research cannot flow forward.** Any finding without a citation is not a finding — it is a hypothesis. Hypotheses must be clearly labelled as such. The specifier will reject uncited input.

The fail condition for this phase is not "finding the wrong answer." It is producing findings that cannot be verified because they have no source.

---

## Example Run

**Open questions from clarify:**

```
[BLOCKING] Does dark mode require persistent user preference or per-session toggle?
[ADVISORY] Are there brand color constraints — is there a design system doc?
```

**Research artifact produced:**

```
## Finding 1 — Current theme implementation
File: src/styles/tokens.css, lines 1–47
The app uses CSS custom properties (--color-bg, --color-text, etc.) declared on :root.
No existing dark mode variant exists. A [data-theme="dark"] override pattern is viable
without breaking existing styles.
Citation: src/styles/tokens.css:1–47

## Finding 2 — User preference persistence
File: src/hooks/useLocalStorage.ts
The codebase already has a useLocalStorage hook used by 3 components.
localStorage persistence is the established pattern. No server-side preference
storage exists currently.
Citation: src/hooks/useLocalStorage.ts:1–38; src/components/Sidebar.tsx:14

## Finding 3 — Brand color constraints
No design system documentation found in repo. No external design system URL
in README or package.json. This remains open — spec should note assumption
that dark palette will be defined by designer from scratch.
Status: OPEN (not resolvable from current sources)

## Finding 4 — Mobile breakpoints
File: src/styles/breakpoints.css
Mobile breakpoint is defined at 768px (--breakpoint-md). Dark mode toggle
component must be tested at this breakpoint.
Citation: src/styles/breakpoints.css:3
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Producing findings without citations | Specifier cannot validate the finding | Cite every finding with file:line or external URL |
| Researching only external sources while ignoring the codebase | Spec diverges from actual codebase reality | Always check the codebase first for in-repo constraints |
| Marking open questions as resolved | Spec is built on false confidence | If a question cannot be answered, mark it OPEN explicitly |
| Over-researching low-risk items | Bloat; important findings get buried | Focus research effort on blocking questions and high-risk areas |
| Producing a research artifact organized as prose | Specifier has to re-parse findings manually | Use structured finding entries: finding, source, risk rating |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: clarify](clarify.md)
- [Next: specify](specify.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
