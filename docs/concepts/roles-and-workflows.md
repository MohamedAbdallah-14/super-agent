# Roles and Workflows

SuperAgent defines explicit canonical roles and explicit phase workflows. Understanding why these exist and how they interact is key to using the system effectively.

## Why roles?

Roles are isolation boundaries, not personas. Each role has defined inputs, allowed tools, required outputs, escalation rules, and failure conditions. An agent inside a role cannot write to protected paths, cannot skip required outputs, and must escalate when ambiguity conditions are met. The discipline is structural, not instructional.

Separating concerns into roles means that the entity implementing a task is never the same entity reviewing it. This adversarial separation is what makes quality enforcement structural rather than aspirational.

## Why phases?

Phases are artifact checkpoints, not conversation stages. Every phase consumes a named artifact from the previous phase and produces a named artifact for the next. Nothing flows via conversation history. A session can end, a new agent can pick up the artifacts, and delivery continues — because the handoff is explicit, structured, and schema-validated.

## The phase model

The canonical workflow sequence is:

1. **clarify** — resolve ambiguity before committing to a spec
2. **discover** — gather research and prior art
3. **specify** — produce a measurable spec with acceptance criteria
4. **spec-challenge** — adversarial review of the spec
5. **author** — finalize content, microcopy, and i18n keys
6. **design** — produce visual designs from the approved spec
7. **design-review** — validate designs against spec, accessibility, and visual consistency
8. **plan** — create an implementation plan from the approved spec and designs
9. **plan-review** — adversarial review of the plan
10. **execute** — implement the plan
11. **verify** — QA hard gate with fresh proof
12. **review** — adversarial quality review
13. **learn** — capture scoped learnings
14. **prepare-next** — produce a clean handoff for the next run

## Role routing

The orchestrator dispatches three roles per task: `executor`, `reviewer`, and `verifier`. By default, all three run for every task. The `required_roles` field in a task's YAML frontmatter controls which roles are dispatched, allowing the orchestrator to skip unnecessary roles and save context window budget.

### Auto-detection

The clarifier assigns `required_roles` based on task type:

| Task type | Required roles | Rationale |
|-----------|---------------|-----------|
| `feature` | `[executor, reviewer, verifier]` | Full pipeline |
| `bugfix` | `[executor, reviewer, verifier]` | Full pipeline |
| `refactor` | `[executor, reviewer, verifier]` | Full pipeline |
| `docs` | `[executor, verifier]` | No adversarial review needed |
| `config` | `[executor, verifier]` | No adversarial review needed |

If `security_critical: true`, `reviewer` is always included.

### Constraints

- `verifier` is always present — it is the QA hard gate and cannot be removed
- Default when `required_roles` is absent: `[executor, reviewer, verifier]` (backward compatible)

## Canonical source

Use the files under `roles/` and `workflows/` as the canonical source for role contracts and phase entrypoints. For exact role and workflow tables, see the [Roles Reference](../reference/roles-reference.md).
