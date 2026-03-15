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

## Cursor Cloud specific instructions

This is a pure JS CLI project — no web server, no database, no Docker. Setup is `npm ci` and you're ready.

**Running the CLI locally:** Use `node tooling/src/cli.js <command>` instead of the `superagent` binary (the bin link may not be in PATH without a global install).

**Known test caveat:** The test `runs all validators when called without a subcommand` in `tooling/test/validate.test.js` will fail if the current branch name doesn't match the allowed patterns (`main`, `develop`, `feat/*`, `feature/*`, `codex/*`, `release/*`, `hotfix/*`). Cloud agent branches like `cursor/*` trigger this. This is expected — the other 240 tests should all pass.

**Key commands** (see Build Commands table above for full list):
- `npm test` — run the full test suite (node:test, ~7s)
- `node tooling/src/cli.js doctor` — verify environment health
- `node tooling/src/cli.js validate manifest` — validate project manifest
- `node tooling/src/cli.js export build` — regenerate host-native packages
- `node tooling/src/cli.js export --check` — check for export drift
