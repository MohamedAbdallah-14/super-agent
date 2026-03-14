# Task Definition Schema

Canonical reference for the YAML front-matter block prepended to each `tasks/clarified/task-NN/spec.md` file. The clarifier produces this block in Phase 8.

## task_definition

| Field | Type | Required | Valid Values | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | `"task-NN"` | Unique task identifier |
| `title` | string | yes | — | Short imperative title |
| `type` | string | yes | `feature`, `bugfix`, `refactor`, `config`, `docs` | Task category |
| `platforms` | list | yes | auto-detected | Target platforms from `files_touched` and project scan |
| `languages` | list | yes | auto-detected | Languages from file extensions in `files_touched` |
| `files_touched` | list | yes | glob patterns | Paths affected by this task |
| `complexity` | string | yes | `low`, `medium`, `high` | From Phase 5 assessment |
| `test_types` | list | yes* | `unit`, `widget`, `integration`, `e2e` | From tagged test sub-tasks. *Empty allowed if `type == docs` |
| `security_critical` | boolean | yes | `true`, `false` | True if auth, payments, PII, or crypto |
| `needs_research` | boolean | yes | `true`, `false` | True if research briefs were referenced |
| `research_topics` | list | yes* | topic identifiers | From matched research briefs. *Non-empty when `needs_research == true` |
| `acceptance_criteria_count` | integer | yes | — | Must match actual AC count in spec body |
| `sub_task_count` | integer | yes | — | Must match actual sub-task count in spec body |
| `model_tier` | string | yes | `opus`, `codex`, `pro`, `flash` | Auto-assigned from tier rules |
| `required_roles` | list | yes | `executor`, `reviewer`, `verifier` | Per-task roles the orchestrator dispatches |

### required_roles

Controls which roles the orchestrator dispatches for this task. Only per-task roles are valid — upstream roles (clarifier, researcher, specifier, planner) and downstream roles (learner) are batch-level and not included.

**Constraints:**
- `verifier` must always be present (mandatory QA safety gate)
- If `security_critical: true`, `reviewer` must be present
- Default when absent: `[executor, reviewer, verifier]` (all per-task roles)

**Auto-detection rules (first match wins per role inclusion):**

| Task type | Required roles | Rationale |
|-----------|---------------|-----------|
| `feature` | `[executor, reviewer, verifier]` | Full pipeline |
| `bugfix` | `[executor, reviewer, verifier]` | Full pipeline |
| `refactor` | `[executor, reviewer, verifier]` | Full pipeline |
| `docs` | `[executor, verifier]` | No adversarial review needed |
| `config` | `[executor, verifier]` | No adversarial review needed |

If `security_critical: true`, `reviewer` is added regardless of type.

### model_tier

Auto-assigned by the clarifier. First matching rule wins:

| Condition | Tier |
|-----------|------|
| `security_critical == true` | `opus` |
| `complexity == high` | `codex` |
| `complexity == medium` | `pro` |
| `complexity == low` and `type == docs` | `flash` |
| `complexity == low` | `pro` |

The clarifier may override with a comment explaining why.

## composition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stack` | list | yes | Technology stacks from `expertise/composition-map.yaml` |
| `concerns` | list | yes | Cross-cutting concerns from `expertise/composition-map.yaml` |

Populated in Phase 9. Used by the orchestrator's composition engine to resolve expertise modules per role.

## Example

```yaml
---
task_definition:
  id: "task-01"
  title: "Add user authentication endpoint"
  type: feature
  platforms: [node]
  languages: [typescript]
  files_touched:
    - "src/auth/**"
    - "test/auth/**"
  complexity: medium
  test_types: [unit, integration]
  security_critical: true
  needs_research: false
  research_topics: []
  acceptance_criteria_count: 5
  sub_task_count: 4
  model_tier: opus
  required_roles:
    - executor
    - reviewer
    - verifier

composition:
  stack: [node]
  concerns: [security-auth]
---
```
