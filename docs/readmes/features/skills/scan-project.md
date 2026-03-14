# scan-project

> Build an evidence-based project profile from the repo's actual surfaces — before clarification or planning begins.

| Property | Value |
|---|---|
| **ID** | `scan-project` |
| **Type** | Flexible |
| **Trigger** | `discover` phase start — or any time a project profile is needed |
| **Failure mode** | Planning from assumptions instead of evidence |

## Purpose

`scan-project` replaces assumption-based project understanding with a minimal, targeted scan of the surfaces that actually describe what a project is and how it works. It answers five specific questions — no more — using manifests, scripts, CI config, and active documentation rather than guesswork.

The output is a concise profile with file references, not a comprehensive audit. It is the starting point for clarification and planning, not an end in itself.

## When to Invoke

- At the start of the `discover` phase.
- When an operator asks "what kind of project is this?" before making changes.
- Before `sa:brainstorming` when the codebase is unfamiliar.
- When returning to a project after a gap and needing to re-establish context.

## When NOT to Invoke

- The project profile is already current and no new surfaces have changed.
- A deep structural audit is needed — use `run-audit` instead.
- You are mid-execution and already have a verified project profile — do not re-scan.

> [!TIP]
> `scan-project` answers "what is this?" — `run-audit` answers "what is wrong with this?". Do not substitute one for the other.

## The Five Questions

This skill answers exactly these five questions:

| Question | Sources to prefer |
|---|---|
| What kind of project is this? | `package.json`, `*.manifest.yaml`, `README.md` |
| Which languages and toolchains are active? | Lock files, CI config, build scripts |
| How is verification expected to work? | `npm test`, CI pipeline, test runner config |
| Where are the relevant product and architecture docs? | `docs/`, `ARCHITECTURE.md`, `CONTRIBUTING.md` |
| What constraints appear in `input/`? | Everything in the `input/` directory |

## Phases

1. **Read `input/`** — operator-supplied constraints and requirements first.
2. **Read manifests** — `package.json`, `*.yaml` manifests, lock files.
3. **Read CI config** — `.github/workflows/`, `.circleci/`, `Makefile`, build scripts.
4. **Read key docs** — `README.md`, `docs/architecture.md` if present.
5. **Identify verification path** — what command proves the project is working?
6. **Compile profile** — concise summary with file references and open unknowns.

## Rules

- Prefer manifests, scripts, CI config, and current docs over assumptions.
- Treat inactive surfaces (dead code, archived docs) as historical context only — do not let them shape the profile.
- Inspect the **smallest** set of surfaces needed. Depth is `run-audit`'s job.

## Input

- Project repository
- `input/` directory contents

## Output

| Artifact | Description |
|---|---|
| Project profile | Concise summary answering the five questions, with file references |
| Open unknowns | Things that require research or clarification to resolve |

## Example

**Scenario:** New conversation on a TypeScript API project.

```
Agent: Invoking scan-project for the discover phase.

Scanning:
  input/          → found: requirements.md (API endpoints spec)
  package.json    → TypeScript, Express, Jest, ts-jest
  .github/        → CI runs npm test on push to main
  README.md       → "REST API for task management, PostgreSQL backend"
  docs/           → architecture.md exists, last updated 2026-02-01

Profile:
  Type:          REST API (Node.js / TypeScript / Express)
  Languages:     TypeScript (primary)
  Verification:  npm test (Jest + ts-jest, ~120 tests)
  Key docs:      docs/architecture.md, README.md
  Constraints:   input/requirements.md — 5 new endpoints needed, auth via JWT

Open unknowns:
  - Database migration strategy not documented — needs clarification
  - No staging environment mentioned in CI — deployment path unknown
```

This profile feeds directly into `sa:brainstorming` as context for the design phase.

## Integration

`scan-project` is the opening move of the discover phase:

```
discover: scan-project → sa:brainstorming (design) → sa:writing-plans (plan) → execute
```

The open unknowns it produces become the clarifying questions for the `clarify` phase, and the verification path it identifies becomes the test command used throughout `sa:tdd` and `sa:verification`.
