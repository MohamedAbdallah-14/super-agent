# Clarifier

![Role](https://img.shields.io/badge/role-clarifier-blue) ![Phase](https://img.shields.io/badge/phase-1%20%E2%80%94%20entry-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**The first gate every task must pass through — turning noise into a scoped, question-resolved brief.**

---

## What is this?

The clarifier is the entry-point role in the SuperAgent pipeline. Its job is to take raw operator input — a briefing file, a feature request, a problem statement — and produce a clarification artifact that resolves ambiguity, documents open questions, and defines a viable path forward.

Every task that enters the pipeline must be clarified before any research, specification, or implementation begins. This isn't bureaucracy — it's the difference between building the right thing and building the wrong thing fast. Ambiguity caught at clarification costs minutes. Ambiguity caught at review costs days.

---

## Key Capabilities

- Reads and processes `input/` briefing files without mutating them
- Extracts and categorizes open questions by impact (architecture, feasibility, acceptance criteria)
- Produces a scope summary with cited sources, not invented assumptions
- Identifies constraints — technical, temporal, organisational — from available evidence
- Maps viable paths forward when multiple approaches exist
- Escalates immediately when ambiguity would change architecture or acceptance criteria

---

## How It Fits in the Pipeline

The clarifier is **Phase 1**. It is the first role invoked by the `clarify` workflow and has no upstream role dependency.

```
[operator input / briefing files]
            │
            ▼
       [clarifier]
            │
            ├──► clarification artifact
            ├──► unresolved questions list
            └──► scope summary with citations
            │
            ▼
       [researcher]  (if open questions require research)
       [specifier]   (if scope is already clear)
```

**Triggered by:** `clarify` workflow, or `prepare-next` workflow at the start of a new iteration.

**Feeds into:** researcher (if knowledge gaps exist), specifier (if scope is clear and research is not required).

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | `input/` briefing files, prior approved artifacts for the current run |
| **Allowed tools** | Local file reads, scoped repo inspection, source-backed research inputs |
| **Output: clarification artifact** | Resolved scope, constraints, assumptions, citations |
| **Output: unresolved questions list** | Every open question that still needs an answer, with impact assessment |
| **Output: scope summary** | A concise statement of what is in scope, what is out, and why |

---

## Example

Given this briefing in `input/brief.md`:

```markdown
Add rate limiting to the public API. We've had some abuse.
Users should not be able to make more than X requests per minute.
```

The clarifier produces:

**Clarification artifact (excerpt):**

```markdown
## Scope
Add per-user rate limiting to the public API.

## Resolved Constraints
- Feature branch off `develop`
- Must not break existing authenticated client integrations

## Open Questions
1. What is the value of X? (BLOCKING — affects acceptance criteria)
   Impact: Cannot write testable acceptance criteria without this.
2. Should rate limit headers (X-RateLimit-*) be exposed to clients?
   Impact: Affects API surface. Default: yes, per RFC 6585.
3. Is the limit per-IP, per-API-key, or per-user-account?
   Impact: Affects data model and storage choice.

## Viable Paths
A. Token bucket in Redis (recommended for distributed deployments)
B. Fixed window counter in DB (simpler, suitable for low-scale)
C. In-process sliding window (only viable for single-instance deployments)

## Cited Sources
- input/brief.md
- src/api/routes/index.ts (current route structure, read-only inspection)
```

---

## Configuration

The clarifier does not have runtime configuration options. Its behavior is governed by:

| Setting | Location | Effect |
|---------|----------|--------|
| `protected_path_write_guard` hook | `hooks/` | Prevents clarifier from writing to `input/` |
| `input/` path | `superagent.manifest.yaml` → `paths.input` | Canonical location of briefing files |
| Escalation threshold | `roles/clarifier.md` | Ambiguity that changes architecture, feasibility, or acceptance criteria triggers escalation |

---

## When to Use / When NOT to Use

**Use the clarifier when:**
- Starting any new task, feature, or investigation
- Resuming a task after a significant gap or scope change
- The briefing is ambiguous, incomplete, or contains conflicting requirements
- You need to establish a shared understanding of scope before spending time on research or spec

**Do NOT invoke the clarifier when:**
- The task is already fully clarified with an approved clarification artifact
- You are mid-execution and need a small decision — escalate from the executor instead
- You want to use it as a stalling tactic; if the scope is clear, move to specifier

> [!NOTE]
> The clarifier **must not** invent constraints or facts. Every constraint in the clarification artifact must be traceable to a source (briefing file, existing code, operator statement). Invented constraints are a failure condition.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Leaves material ambiguity unresolved without escalation | Downstream roles will build on false assumptions |
| Mutates `input/` | Briefing files are the operator's immutable record of intent |
| Invents constraints or facts without evidence | Corrupts the artifact chain with untraceable assumptions |

---

## Related

- [Roles Overview](README.md)
- [researcher](researcher.md) — next role if knowledge gaps exist
- [specifier](specifier.md) — next role if scope is clear
- [Clarify Workflow](../workflows/clarify.md) _(coming soon)_
- [Prepare-Next Workflow](../workflows/prepare-next.md) _(coming soon)_
