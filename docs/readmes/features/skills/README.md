# Skills

> Reusable in-host procedures that enforce disciplined engineering work across every AI agent session.

Skills are the **operational layer** of SuperAgent. Where roles define who acts and workflows define what phases exist, skills define exactly how work gets done — step by step, with explicit rules and required outputs.

## Skill Roster

| Skill | ID | Type | Purpose |
|---|---|---|---|
| [Using Skills](using-skills.md) | `sa:using-skills` | Rigid | Skill discovery bootstrap — must fire before any response |
| [Brainstorming](brainstorming.md) | `sa:brainstorming` | Rigid | Turn briefings into approved designs before implementation |
| [Writing Plans](writing-plans.md) | `sa:writing-plans` | Rigid | Produce execution-grade implementation plans from approved designs |
| [TDD](tdd.md) | `sa:tdd` | Rigid | Enforce RED → GREEN → REFACTOR with evidence at each step |
| [Debugging](debugging.md) | `sa:debugging` | Rigid | Observe-hypothesize-test-fix loop instead of guesswork |
| [Verification](verification.md) | `sa:verification` | Rigid | Require fresh command evidence before any completion claim |
| [Design](design.md) | `sa:design` | Flexible | Guide designer role through open-pencil MCP visual design workflow |
| [Scan Project](scan-project.md) | `scan-project` | Flexible | Build an evidence-based project profile from repo surfaces |
| [Run Audit](run-audit.md) | `run-audit` | Flexible | Interactive structured codebase audit with report or fix-plan output |
| [Self-Audit](self-audit.md) | `self-audit` | Flexible | Worktree-isolated audit-fix loop — safe self-improvement |
| [Prepare Next](prepare-next.md) | `prepare-next` | Flexible | Produce a clean next-run handoff without stale context bleed |

## Skill Types

| Type | Meaning |
|---|---|
| **Rigid** | Follow exactly. The discipline is the point — do not adapt away the structure. |
| **Flexible** | Adapt principles to context. The skill guides; judgment fills gaps. |

## How Skills Work

Skills are invoked via the `Skill` tool in Claude Code. When invoked, the skill's content is loaded and presented to the agent, which then follows it directly. Skills are **never** read via the `Read` tool on skill files — that bypasses the invocation contract.

```
User message received
    → Check: might any skill apply? (even 1% chance = yes)
    → Invoke Skill tool
    → Announce: "Using [skill] to [purpose]"
    → Follow skill exactly
    → Respond
```

## Skill Priority

When multiple skills could apply:

1. **Process skills first** — `sa:brainstorming`, `sa:debugging` determine HOW to approach the task.
2. **Implementation skills second** — `sa:tdd`, `sa:design` guide execution.

## Rules

- Skills must reference `input/`, canonical roles/workflows, or external state-root conventions.
- Skills must not instruct running background services outside the canonical workflow surface.
- When a skill contradicts the current operating model, it is removed — not left conflicting.
- Only active skills belong in `skills/`.

## Integration with Workflows

```
clarify → discover (scan-project) → specify → design (sa:design) → plan (sa:brainstorming + sa:writing-plans) → execute (sa:tdd) → verify (sa:verification) → review → learn → prepare-next
```

Skills activate within phases. A phase entrypoint does not replace skill invocation — both operate simultaneously.
