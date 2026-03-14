# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- 8 new skills ported from superpowers into native `sa:` skill system:
  - `sa:executing-plans` — sequential plan execution with review checkpoints
  - `sa:subagent-driven-development` — fresh subagent per task with two-stage review (+ 3 templates: implementer-prompt, spec-reviewer-prompt, code-quality-reviewer-prompt)
  - `sa:dispatching-parallel-agents` — concurrent subagent dispatch for independent tasks
  - `sa:requesting-code-review` — pre-review checklist and code-reviewer subagent dispatch (+ template)
  - `sa:receiving-code-review` — technical rigor in responding to review feedback
  - `sa:using-git-worktrees` — isolated workspaces for feature work
  - `sa:finishing-a-development-branch` — structured branch completion (merge/PR/keep/discard)
  - `sa:writing-skills` — meta-skill for creating new skills via TDD (+ anthropic-best-practices, persuasion-principles)
- `agents/code-reviewer.md` — senior code reviewer agent definition for plan alignment, code quality, architecture, and documentation review
- `agents/` directory registered in manifest paths

### Changed

- `sa:using-superpowers` renamed to `sa:using-skills` — removes superpowers branding from bootstrap skill
- Session-start hook updated to reference `sa:using-skills` and output "You have skills"

### Removed

- `jcodemunch` adapter removed from manifest, schema, example, and all test fixtures — superpowers is no longer an external plugin dependency
- `docs/readmes/packages/superpowers.md` and `docs/adapters/jcodemunch.md` deleted
- All documentation updated to remove superpowers-as-external-dependency references
- React Native expertise module (`expertise/frontend/react-native.md`, 1160 lines) — Expo-first, TypeScript, TanStack Query + Zustand, Expo Router v4 Guarded Groups, FlashList v2, Reanimated 4, EAS CI/CD, 14 anti-patterns, 5 code examples, 4 decision trees; wired into composition map, frontend index, and PROGRESS tracking
- Designer role (`roles/designer.md`) for visual design via open-pencil MCP
- Design workflow phase (`workflows/design.md`) between specify and plan
- Design-review workflow phase (`workflows/design-review.md`) for pre-planning design validation
- Design artifact JSON Schema (`schemas/design-artifact.schema.json`)
- Design skill (`skills/design/SKILL.md`) with open-pencil MCP workflow guide
- open-pencil expertise module (`expertise/design/tooling/open-pencil.md`)
- `design-tooling` concern in composition map
- `open_pencil` adapter in manifest (optional, external)
- Self-audit skill for worktree-isolated audit-fix loops
- Project logo (SVG, light + dark variants) in `assets/`
- shields.io badge row in README (CI, license, version, Node.js, PRs welcome + 4 host badges)
- "Why SuperAgent?" refined positioning section in README
- Mermaid component architecture diagram in README (supplements ASCII pipeline)
- Community placeholder section in README
- "Your First Contribution" section in CONTRIBUTING.md with onboarding guide
- Launch announcement drafts for Hacker News, Twitter/X, and Reddit in `drafts/`

### Changed

- README.md refined with viral-ready patterns from docs/readmes/RESEARCH.md (hero section, SEO keywords, copywriting, documentation categories)
- Expertise module count updated from 247 to 298 across README

### Removed

- Legacy hook scripts `compact-reinject`, `score-threshold`, `subagent-harvest` — referenced obsolete `tasks/` paths incompatible with SuperAgent's state model

### Fixed

- Wired `validate branches`, `validate commits`, and `validate changelog` into CLI and CI
- Documentation drift in skills and hooks references

## [0.1.0] — 2026-03-12

### Added

- Canonical roles: clarifier, researcher, specifier, planner, executor, verifier, reviewer, learner
- Phase workflows: clarify, discover, specify, spec_challenge, plan, plan_review, execute, verify, review, learn, prepare_next
- Reusable skills for TDD, debugging, verification, brainstorming, and more
- Hook contracts: session start, capture routing, compact summary, protected path guards, loop cap guards
- 279 expertise modules across architecture, security, performance, design, frontend, backend, infrastructure, and quality
- Artifact templates for phase outputs, learning promotion, and handoff
- Schema validation for manifest, hooks, artifacts, and exports
- `superagent` CLI with validate, export, doctor, status, capture, index, and recall commands
- Generated host export packages for Claude, Codex, Gemini, and Cursor
- SQLite-backed local indexing and recall
- Export drift detection and CI enforcement
- Docs-truth validation gate
- Open-source essentials: MIT license, contributing guide, code of conduct, security policy, governance, support
