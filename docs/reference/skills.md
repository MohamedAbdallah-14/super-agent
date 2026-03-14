# Skills

SuperAgent uses skills as reusable in-host procedures.

The active thesis is:

- use SuperAgent inside your AI host
- keep the operating model in canonical repo skills

## Active Skills

These skills remain on the active surface:

| Skill | Purpose |
| --- | --- |
| `sa:using-skills` | Ensures skill discovery happens before work starts |
| `sa:brainstorming` | Turns briefings into approved designs before implementation |
| `scan-project` | Builds a project profile from the repo and `input/` |
| `sa:writing-plans` | Produces execution-grade implementation plans |
| `sa:debugging` | Runs a disciplined observe-hypothesize-test-fix loop |
| `sa:tdd` | Enforces RED -> GREEN -> REFACTOR for implementation work |
| `sa:verification` | Requires fresh proof before completion claims |
| `sa:design` | Guides the designer role through open-pencil MCP workflow to produce design artifacts |
| `prepare-next` | Produces a clean next-run handoff without auto-loading stale context |
| `run-audit` | Runs a structured codebase audit producing source-backed findings with remediation |
| `self-audit` | Runs a worktree-isolated audit-fix loop — validates, audits, fixes, verifies, and merges back only on green |

## Rules

- Skills must reference `input/`, canonical roles/workflows, or external state-root conventions.
- Skills must not instruct users to run background services or wrapper scripts that are not part of the canonical workflow surface.
- When a skill becomes contradictory to the current operating model, remove it from `skills/`.
