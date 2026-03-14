# SuperAgent README Index

> 60 world-class README files covering every feature, workflow, role, skill, hook, and package.

## Main README

| File | Description |
|------|-------------|
| [`/README.md`](../../README.md) | Root landing page — 738-line comprehensive project README |

## Features

### Roles (`features/roles/`)
| File | Description |
|------|-------------|
| [README.md](features/roles/README.md) | Roles system overview — pipeline diagram, all 10 roles, design principles |
| [clarifier.md](features/roles/clarifier.md) | Clarifier role — turns vague requests into precise specifications |
| [researcher.md](features/roles/researcher.md) | Researcher role — fills knowledge gaps before planning |
| [specifier.md](features/roles/specifier.md) | Specifier role — writes formal spec artifacts with acceptance criteria |
| [designer.md](features/roles/designer.md) | Designer role — produces implementation designs and visual wireframes |
| [content-author.md](features/roles/content-author.md) | Content Author role — writes microcopy, i18n keys, glossary, and seed data |
| [planner.md](features/roles/planner.md) | Planner role — breaks designs into ordered, verifiable task plans |
| [executor.md](features/roles/executor.md) | Executor role — implements plans with TDD and conventional commits |
| [verifier.md](features/roles/verifier.md) | Verifier role — proves every acceptance criterion is met |
| [reviewer.md](features/roles/reviewer.md) | Reviewer role — scores artifacts for quality and completeness |
| [learner.md](features/roles/learner.md) | Learner role — extracts learnings and prevents future drift |

### Workflows (`features/workflows/`)
| File | Description |
|------|-------------|
| [README.md](features/workflows/README.md) | Workflows overview — full pipeline diagram, phase reference table |
| [clarify.md](features/workflows/clarify.md) | Phase 1: Clarify — resolve ambiguity before doing anything |
| [discover.md](features/workflows/discover.md) | Phase 2: Discover — research the problem space |
| [specify.md](features/workflows/specify.md) | Phase 3: Specify — produce a formal spec artifact |
| [spec-challenge.md](features/workflows/spec-challenge.md) | Phase 4: Spec Challenge — adversarial spec hardening |
| [author.md](features/workflows/author.md) | Phase 5: Author — write microcopy, i18n keys, and content artifacts |
| [design.md](features/workflows/design.md) | Phase 6: Design — create implementation designs |
| [design-review.md](features/workflows/design-review.md) | Phase 7: Design Review — validate designs before planning |
| [plan.md](features/workflows/plan.md) | Phase 8: Plan — break design into ordered tasks |
| [plan-review.md](features/workflows/plan-review.md) | Phase 9: Plan Review — validate the plan before execution |
| [execute.md](features/workflows/execute.md) | Phase 10: Execute — TDD implementation with commits |
| [verify.md](features/workflows/verify.md) | Phase 11: Verify — prove every acceptance criterion |
| [review.md](features/workflows/review.md) | Phase 12: Review — quality gate and scoring |
| [learn.md](features/workflows/learn.md) | Phase 13: Learn — extract and persist learnings |
| [prepare-next.md](features/workflows/prepare-next.md) | Phase 14: Prepare Next — clean state for next cycle |
| [run-audit.md](features/workflows/run-audit.md) | Out-of-band: Run Audit — on-demand quality audits |

### Skills (`features/skills/`)
| File | Description |
|------|-------------|
| [README.md](features/skills/README.md) | Skills system overview — all 11 skills, type table, invocation rules |
| [using-skills.md](features/skills/using-skills.md) | Bootstrap skill — enforces skill-check-before-action |
| [brainstorming.md](features/skills/brainstorming.md) | Design gate skill — ideas into designs before implementation |
| [writing-plans.md](features/skills/writing-plans.md) | Plan production skill — specs into bite-sized task files |
| [tdd.md](features/skills/tdd.md) | TDD skill — RED/GREEN/REFACTOR for every sub-task |
| [debugging.md](features/skills/debugging.md) | Debugging skill — systematic 4-phase debug protocol |
| [verification.md](features/skills/verification.md) | Verification skill — evidence before completion claims |
| [design.md](features/skills/design.md) | Design skill — open-pencil MCP visual design workflow |
| [scan-project.md](features/skills/scan-project.md) | Scan project skill — builds project profile for auto-resolution |
| [run-audit.md](features/skills/run-audit.md) | Run audit skill — 6-step interactive audit pipeline |
| [self-audit.md](features/skills/self-audit.md) | Self-audit skill — worktree-isolated drift detection |
| [prepare-next.md](features/skills/prepare-next.md) | Prepare next skill — clean handoff between sessions |

### Hooks (`features/hooks/`)
| File | Description |
|------|-------------|
| [README.md](features/hooks/README.md) | Hooks system overview — full roster, categories, exit codes |
| [session-start.md](features/hooks/session-start.md) | Session Start hook — skill bootstrap injection on session init |
| [pre-tool-capture-route.md](features/hooks/pre-tool-capture-route.md) | Pre Tool Capture Route hook — routes tool output to capture |
| [post-tool-capture.md](features/hooks/post-tool-capture.md) | Post Tool Capture hook — streams tool events to session log |
| [pre-compact-summary.md](features/hooks/pre-compact-summary.md) | Pre Compact Summary hook — persists summary before compaction |
| [stop-handoff-harvest.md](features/hooks/stop-handoff-harvest.md) | Stop Handoff Harvest hook — harvests session artifacts at stop |
| [protected-path-write-guard.md](features/hooks/protected-path-write-guard.md) | Protected Path Write Guard — blocks writes to canonical files |
| [loop-cap-guard.md](features/hooks/loop-cap-guard.md) | Loop Cap Guard — stops runaway agent loops |
| [post-tool-lint.md](features/hooks/post-tool-lint.md) | Post Tool Lint — syntax-checks JS files after every write |

### Other Features
| File | Description |
|------|-------------|
| [expertise/README.md](features/expertise/README.md) | Expertise system — 255 modules across 11 domains |
| [schemas/README.md](features/schemas/README.md) | Schema system — 16 JSON schemas for artifact validation |
| [tooling/README.md](features/tooling/README.md) | CLI tooling — all commands with options and examples |
| [exports/README.md](features/exports/README.md) | Host exports — Claude, Codex, Gemini, Cursor packages |

## Packages (`packages/`)

| File | Package | Description |
|------|---------|-------------|
| [README.md](packages/README.md) | — | Package index with versions and reading order |
| [ajv.md](packages/ajv.md) | `ajv@^8.18.0` | JSON Schema 2020-12 validation |
| [gray-matter.md](packages/gray-matter.md) | `gray-matter@^4.0.3` | YAML frontmatter parsing for skill files |
| [yaml.md](packages/yaml.md) | `yaml@^2.0.0` | YAML 1.2 serialization for manifests |
| [node-test.md](packages/node-test.md) | `node:test` | Zero-dependency built-in test runner |
| [context-mode.md](packages/context-mode.md) | `context-mode` plugin | Context compression for large outputs |

## Research

| File | Description |
|------|-------------|
