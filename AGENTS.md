# SuperAgent Agent Instructions

## Role-Based Workflow System

SuperAgent uses canonical roles and phased workflows. Role contracts are in `roles/`. Workflow definitions are in `workflows/`.

### Canonical Roles

1. **clarifier** — disambiguate intent, extract acceptance criteria
2. **researcher** — gather evidence, prior art, domain context
3. **specifier** — write precise specs from clarified requirements
4. **designer** — produce architecture and interface designs
5. **content-author** — create documentation, guides, and prose artifacts
6. **planner** — break specs into ordered, testable tasks
7. **executor** — implement code following the plan
8. **verifier** — run tests, linting, and validation gates
9. **reviewer** — final quality review against acceptance criteria
10. **learner** — capture lessons learned and update knowledge base

See `roles/` for full contracts. See `superagent.manifest.yaml` for the authoritative list.

### Entering a Workflow

1. **Clarifier:** read and follow `~/.claude/agents/clarifier.md` — tasks are in `input/`
2. **Subsequent phases:** the workflow system assigns roles per phase. See `workflows/` for phase sequence.
3. **Review:** read and follow `~/.claude/agents/reviewer.md` — run all review phases

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm test` | Run full test suite (node:test) |
| `superagent validate` | Validate manifest, hooks, docs, brand, runtime, branches, commits, changelog |
| `superagent doctor` | Check environment health |
| `superagent export build` | Build host-native packages |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Usage / argument error |
| 42 | Validation failure (non-fatal) |
| 43 | Gate rejection (hard stop) |

## Code Style

- Pure JavaScript — no TypeScript, no JSX, no transpilation
- Node.js >= 20
- ES modules (`import` / `export`)
- Test framework: `node:test` + `node:assert`
- Zero runtime dependencies in the core kit

### Test Pattern

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('featureName', () => {
  it('should behave correctly', () => {
    const result = featureName();
    assert.strictEqual(result, expected);
  });
});
```

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `roles/` | Canonical role contracts (one file per role) |
| `workflows/` | Phase-based workflow definitions and entry points |
| `expertise/` | Domain knowledge modules consumed by roles |
| `skills/` | Reusable skill definitions (prefixed `sa:`) |
| `hooks/` | Lifecycle hooks (pre-commit, pre-push, gates) |
| `tooling/` | CLI source, tests, and internal utilities |
| `exports/` | Generated host-native packages (do not edit) |
| `templates/` | Scaffold and boilerplate templates |
| `schemas/` | JSON / YAML schemas for validation |
| `docs/` | Architecture docs, guides, and references |

## Git Workflow

- **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Isolated feature branches** — never commit directly to `main`
- **TDD cycle:** failing test -> implement -> verify -> commit

## Boundaries

- Never edit files in `exports/` directly — they are generated from canonical sources
- Never modify pipeline input files — they are read-only task input
- Never skip `superagent doctor` before starting work
- Never add runtime dependencies to the core kit
- Never use TypeScript, JSX, or any transpilation step
- Never commit without running `npm test` first
- Never bypass validation gates (`superagent validate`)

## Operating Constraints

- Use `roles/` as the source of truth for role contracts
- Keep default live run state outside the repo under `~/.superagent/projects/<project-slug>/`
- Preserve evidence-first execution, TDD, verification, and conventional commits
- Use isolated feature branches
- Reference `superagent.manifest.yaml` for the project manifest and schema
