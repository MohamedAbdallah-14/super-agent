# Roles Reference

This is the lookup reference for canonical roles, workflows, and their contracts.

## Canonical roles

| Role | Purpose |
|------|---------|
| `clarifier` | Resolves ambiguity before spec production |
| `researcher` | Gathers source-backed findings and prior art |
| `specifier` | Produces measurable specs with acceptance criteria |
| `content-author` | Produces finalized i18n keys, microcopy, glossary, state coverage, and accessibility copy |
| `designer` | Transforms approved spec into visual designs using open-pencil MCP tools. Produces `.fig` files, exported code scaffolds, and design tokens |
| `planner` | Creates implementation plans from approved spec and designs |
| `executor` | Implements the plan (orchestrator "Dev" phase) |
| `verifier` | QA hard gate — always mandatory (orchestrator "QA" phase) |
| `reviewer` | Adversarial quality review (orchestrator "Reviewer" phase) |
| `learner` | Captures scoped learnings for future runs |

## Canonical workflows

| Workflow | Runs after | Description |
|----------|-----------|-------------|
| `clarify` | — | Resolve ambiguity |
| `discover` | `clarify` | Gather research |
| `specify` | `discover` | Produce spec |
| `spec-challenge` | `specify` | Adversarial spec review |
| `author` | `spec-challenge` | Content authoring |
| `design` | `author` | Visual design from approved spec |
| `design-review` | `design` | Validate designs against spec, accessibility, visual consistency |
| `plan` | `design-review` | Create implementation plan |
| `plan-review` | `plan` | Adversarial plan review |
| `execute` | `plan-review` | Implement the plan |
| `verify` | `execute` | QA hard gate |
| `review` | `verify` | Adversarial quality review |
| `learn` | `review` | Capture scoped learnings |
| `prepare-next` | `learn` | Produce clean next-run handoff |

## Role routing valid values

- `executor` — implements the task (orchestrator "Dev" phase)
- `reviewer` — adversarial quality review (orchestrator "Reviewer" phase)
- `verifier` — QA hard gate, always mandatory (orchestrator "QA" phase)

## Contract source files

- Role contracts: `roles/<role-name>.md`
- Workflow entrypoints: `workflows/<workflow-name>.md`
- Manifest roster: `superagent.manifest.yaml`

For conceptual understanding of how roles and workflows interact, see [Roles and Workflows concepts](../concepts/roles-and-workflows.md).
