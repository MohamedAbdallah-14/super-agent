# SuperAgent Workflows

**The complete engineering pipeline — from raw idea to production-grade code.**

![Phase Count](https://img.shields.io/badge/phases-14-blue)
![Roles](https://img.shields.io/badge/roles-10-purple)
![Status](https://img.shields.io/badge/status-stable-green)

SuperAgent workflows are the sequencing backbone of the engineering OS. Every workflow is a canonical phase entrypoint: host-neutral, artifact-driven, and gated by explicit approval contracts. You don't skip phases. You don't merge ambiguity forward. You ship code that is provably correct against a spec that was adversarially challenged before a line was written.

---

## The Full Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                     SUPERAGENT PIPELINE                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT                                                           │
│    │                                                             │
│    ▼                                                             │
│  [1] CLARIFY ──────── clarifier ──── scope + questions          │
│    │                                                             │
│    ▼                                                             │
│  [2] DISCOVER ─────── researcher ─── cited findings             │
│    │                                                             │
│    ▼                                                             │
│  [3] SPECIFY ──────── specifier ──── spec + AC           ★ GATE │
│    │                                                             │
│    ▼                                                             │
│  [4] SPEC-CHALLENGE ─ reviewer ───── challenge findings  ★ GATE │
│    │                                                             │
│    ▼                                                             │
│  [5] AUTHOR ───────── content-author microcopy + i18n    ★ GATE │
│    │                                                             │
│    ▼                                                             │
│  [6] DESIGN ───────── designer ───── .fig + tokens + code ★ GATE│
│    │                                                             │
│    ▼                                                             │
│  [7] DESIGN-REVIEW ── reviewer ───── review findings     ★ GATE │
│    │                                                             │
│    ▼                                                             │
│  [8] PLAN ─────────── planner ────── impl. plan          ★ GATE │
│    │                                                             │
│    ▼                                                             │
│  [9] PLAN-REVIEW ──── reviewer ───── plan findings       ★ GATE │
│    │                                                             │
│    ▼                                                             │
│ [10] EXECUTE ──────── executor ───── code + docs                │
│    │                                                             │
│    ▼                                                             │
│ [11] VERIFY ──────── verifier ────── proof artifact      ★ GATE │
│    │                                                             │
│    ▼                                                             │
│ [12] REVIEW ──────── reviewer ────── findings + verdict  ★ GATE │
│    │                                                             │
│    ▼                                                             │
│ [13] LEARN ───────── learner ─────── learning artifacts  ★ GATE │
│    │                                                             │
│    ▼                                                             │
│ [14] PREPARE-NEXT ── planner ─────── handoff                    │
│    │                                                             │
│    ▼                                                             │
│  NEXT RUN / DONE                                                 │
│                                                                  │
│  ★ = explicit human approval gate                                │
└──────────────────────────────────────────────────────────────────┘
```

> [!NOTE]
> The `author`, `design`, and `design-review` phases are skippable. `author` is skipped when a project has no user-facing content needs. `design` and `design-review` are skipped when a project has no visual design needs or when the open-pencil MCP adapter is not available. All other phases are mandatory.

---

## Workflow Reference Table

| # | Workflow | Role | Trigger | Key Outputs | Approval Gate |
|---|----------|------|---------|-------------|---------------|
| 1 | [clarify](clarify.md) | `clarifier` | Input briefing files arrive | Clarification artifact, unresolved questions, scope summary | Soft — escalate material ambiguity |
| 2 | [discover](discover.md) | `researcher` | Clarified scope approved | Research artifact, cited findings | Soft — unsupported research blocked |
| 3 | [specify](specify.md) | `specifier` | Research artifacts ready | Spec artifact, acceptance criteria, assumptions | **Hard — human approval required** |
| 4 | [spec-challenge](spec-challenge.md) | `reviewer` | Draft spec produced | Challenge findings | **Hard — findings must be resolved** |
| 5 | [author](author.md) | `content-author` | Spec challenge closed | Microcopy, i18n keys, glossary, seed data, coverage matrix | **Hard — human approval required** |
| 6 | [design](design.md) | `designer` | Author approved (or skipped) | `.fig` file, exported code, design tokens, screenshots | **Hard — human approval required** |
| 7 | [design-review](design-review.md) | `reviewer` | Design artifact produced | Review findings with severity | **Hard — blocking findings stop planning** |
| 8 | [plan](plan.md) | `planner` | Design reviewed (or skipped) | Implementation plan, ordered tasks | **Hard — human approval required** |
| 9 | [plan-review](plan-review.md) | `reviewer` | Draft plan produced | Plan findings, revised tasks | **Hard — blocking findings stop execution** |
| 10 | [execute](execute.md) | `executor` | Plan approved | Code changes, docs changes, execution notes | Soft — no new scope without approval |
| 11 | [verify](verify.md) | `verifier` | Execution batch complete | Verification proof artifact | **Hard — no completion claim without proof** |
| 12 | [review](review.md) | `reviewer` | Verification proof produced | Findings, no-findings verdict | **Hard — blocking findings stop completion** |
| 13 | [learn](learn.md) | `learner` | Review verdict accepted | Proposed learning artifacts, experiment summaries | **Hard — explicit review + scope tags required** |
| 14 | [prepare-next](prepare-next.md) | `planner` | Learn phase complete | Next-step handoff, scoped context summary | Soft — no implicit carry-forward |

### Bonus Workflow

| Workflow | Role | Purpose |
|----------|------|---------|
| [run-audit](run-audit.md) *(coming soon)* | `researcher` | Structured codebase/branch audit — produces findings report or plan doc |

---

## Philosophy: Why This Pipeline Exists

### Problems It Solves

Most AI coding loops fail in the same five ways:

1. **Ambiguity laundering** — unclear requirements get papered over and explode in execution
2. **Spec-less planning** — plans are written before acceptance criteria exist
3. **Rubber-stamp review** — review phases that generate no findings because the reviewer is also the implementor
4. **Completion theater** — "done" is declared without runnable proof
5. **Context rot** — stale assumptions from prior runs silently corrupt the next

SuperAgent's pipeline is designed to make each of these failure modes structurally impossible or explicitly visible.

### Design Principles

**Artifact-driven handoff.** Every phase produces a named artifact. The next phase consumes it. Nothing is passed via vibes or conversation history.

**Adversarial review at three chokepoints.** `spec-challenge`, `plan-review`, and `review` are all run by the `reviewer` role — never the phase author. Red-teaming is structural, not optional.

**Hard gates before irreversible work.** Approval gates sit precisely at the points where rework cost spikes: before writing a spec into a plan, before writing a plan into code, before declaring code complete.

**Host-neutral contracts.** Workflow files contain zero host-specific syntax. Host adapters (Claude, Codex, Gemini, Cursor) are generated from these canonical contracts at export time.

**No implicit carry-forward.** The `prepare-next` workflow exists precisely to make context handoff explicit. You cannot silently carry stale learnings into the next run.

---

## Entering and Exiting the Pipeline

### Full run (greenfield feature)

Start at `clarify`. Run every phase in order. All gates must be passed.

### Mid-pipeline entry (approved spec exists)

If a spec artifact already exists and has been approved, enter at `author` (or `design` if author is skipped, or `plan` if both are skipped). You must still have valid upstream artifacts — the pipeline checks inputs, not just phase names.

### Execution-only entry (plan exists)

If an approved plan exists from a prior run, enter at `execute`. Wire the plan artifact as the execute input. Do not re-run planning without invalidating the existing plan.

### Audit entry (out-of-band)

`run-audit` is an independent workflow. It does not require prior pipeline state. It produces a report artifact or a plan doc in `docs/plans/` for handoff to `plan`.

### Exiting early

You may exit after any gate with a formal partial-completion artifact. The next session enters at the point of exit. `prepare-next` must always run before session end if the pipeline is incomplete.

---

## Artifact Locations

State and artifacts live outside the repo by default:

```
~/.superagent/projects/<project-slug>/
  runs/
    <run-id>/
      clarification.md
      research.md
      spec.md
      spec-challenge.md
      author/
      design/
      design-review.md
      plan.md
      plan-review.md
      execution-notes.md
      verification-proof.md
      review-findings.md
      learnings.md
      prepare-next.md
```

---

## Related

- [Architecture](../../../concepts/architecture.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
- [Skills](../../../reference/skills.md)
- [Hooks](../../../reference/hooks.md)
