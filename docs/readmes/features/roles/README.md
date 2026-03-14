# SuperAgent Roles

![Status](https://img.shields.io/badge/status-alpha-orange) ![Version](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Hosts](https://img.shields.io/badge/hosts-Claude%20%7C%20Codex%20%7C%20Gemini%20%7C%20Cursor-purple)

**Ten canonical roles. One coherent engineering pipeline. Zero ambiguity about who does what.**

---

## What is this?

SuperAgent roles are the backbone of the system. Every role is a **canonical contract** — a precise definition of purpose, allowed tools, required outputs, escalation rules, and failure conditions. They are not personas or guidelines; they are enforceable, machine-readable operating boundaries.

When you run SuperAgent on Claude, Codex, Gemini, or Cursor, the agent is always operating as one of these ten roles. The role determines what the agent is allowed to do, what it must produce, and when it must stop and escalate.

This makes multi-phase, multi-agent engineering work **predictable, auditable, and composable**.

---

## The Ten Roles

| Role | One-Line Purpose | Pipeline Position |
|------|-----------------|-------------------|
| [clarifier](clarifier.md) | Turn operator input into a scoped, question-resolved brief | Phase 1 — Entry |
| [researcher](researcher.md) | Fill knowledge gaps with source-backed findings | Phase 2 — Discovery |
| [specifier](specifier.md) | Produce a measurable, reviewable spec | Phase 3 — Specification |
| [designer](designer.md) | Transform the approved spec into visual designs | Phase 6 — Design |
| [content-author](content-author.md) | Write and package all non-code content artifacts | Phase 5 — Authoring |
| [planner](planner.md) | Convert the approved spec into an execution-grade task plan | Phase 8 — Planning |
| [executor](executor.md) | Implement the approved plan slice by slice | Phase 10 — Execution |
| [verifier](verifier.md) | Run deterministic checks and produce proof bundles | Phase 11 — Verification |
| [reviewer](reviewer.md) | Perform adversarial review for correctness and drift | Phase 12 — Review |
| [learner](learner.md) | Extract durable scoped learnings from the completed run | Phase 13 — Learning |

---

## How Roles Fit the Pipeline

```
operator input
      │
      ▼
 [clarifier]  ──► clarification artifact, open questions
      │
      ▼
 [researcher] ──► research artifact, citations, risks
      │
      ▼
 [specifier]  ──► spec artifact, acceptance criteria, non-goals
      │
      ▼
 [designer]   ──► .fig file, JSX/CSS scaffolds, design tokens
      │
      ▼
 [content-author] ──► microcopy, i18n keys, glossary, seed data
      │
      ▼
  [planner]   ──► implementation plan, ordered tasks, verification plan
      │
      ▼
  [executor]  ──► code changes, execution notes, verification evidence
      │
      ▼
  [verifier]  ──► proof bundle, pass/fail status, command results
      │
      ▼
  [reviewer]  ──► findings with severity, explicit verdict
      │
      ▼
  [learner]   ──► learning artifacts, experiment summaries
```

Each role hands off a **named artifact** to the next. No role invents inputs — everything is traceable to an upstream artifact or operator approval.

---

## Role Contract Structure

Every role contract defines the same six sections:

```
Purpose        — What problem this role solves
Inputs         — What it consumes (artifacts, files, state)
Allowed Tools  — What it is permitted to use
Required Outputs — What it must produce before handing off
Escalation Rules — When to stop and surface a decision
Failure Conditions — What constitutes a broken contract
```

This uniformity makes roles composable. Any agent on any host can pick up a role contract and know exactly what to do and what not to do.

---

## Key Design Principles

**Roles are not phases.** A single workflow phase may invoke multiple roles (e.g., `review` invokes the reviewer; `verify` invokes the verifier). Phases are the entrypoints; roles are the contracts.

**Roles do not self-assign.** The workflow or operator routes an agent into a role. An agent operating as executor cannot unilaterally decide to also act as reviewer.

**Escalation is mandatory, not optional.** Each role has explicit escalation rules. When those conditions are met, the role must surface the decision rather than making an assumption and continuing.

**Protected paths are enforced at the role level.** The clarifier cannot mutate `input/`. The executor cannot write to protected paths outside approved flows. Violations are failure conditions, not warnings.

**Artifacts are the handoff currency.** Roles do not hand off context blobs or verbal summaries — they produce named, schema-validated artifact files. The next role reads those artifacts.

---

## Canonical Source

Role contracts live in `roles/` and are the single source of truth. Host-specific exports are generated from these contracts and must not be edited directly.

```
roles/
  clarifier.md
  researcher.md
  specifier.md
  designer.md
  content-author.md
  planner.md
  executor.md
  verifier.md
  reviewer.md
  learner.md
```

> [!NOTE]
> `roles/` is a **protected path**. The `protected_path_write_guard` hook prevents direct writes from execution phases. All changes to role contracts go through a PR with explicit reviewer approval.

---

## Workflows That Invoke Roles

| Workflow | Primary Role(s) |
|----------|----------------|
| `clarify` | clarifier |
| `discover` | researcher |
| `specify` | specifier |
| `spec-challenge` | specifier + reviewer |
| `author` | content-author |
| `design` | designer |
| `design-review` | reviewer |
| `plan` | planner |
| `plan-review` | reviewer |
| `execute` | executor |
| `verify` | verifier |
| `review` | reviewer |
| `learn` | learner |
| `prepare-next` | learner + clarifier |

---

## Related

- [Architecture](../../../concepts/architecture.md)
- [Roles & Workflows](../../../concepts/roles-and-workflows.md)
- [Workflows](../workflows/) _(coming soon)_
- [Skills](../skills/) _(coming soon)_
- [Hooks](../hooks/) _(coming soon)_
