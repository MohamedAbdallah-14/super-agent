# Git-Flow Policy

This document defines the branching model, merge discipline, and changelog rules for the SuperAgent project.

## Branching Model

| Branch | Pattern | Created From | Merges To | Protected |
|--------|---------|-------------|-----------|-----------|
| Main | `main` | — | — | Yes |
| Develop | `develop` | `main` (once) | — | Yes |
| Feature | `feat/<slug>` or `feature/<slug>` | `develop` | `develop` | No |
| Codex | `codex/<slug>` | `develop` | `develop` | No |
| Release | `release/<version>` | `develop` | `main` + `develop` | No |
| Hotfix | `hotfix/<slug>` | `main` | `main` + `develop` | No |

## Merge Rules

- All merges to `develop` and `main` use `--no-ff` to preserve merge commits
- Merges happen only after the full Executor, Verifier, Reviewer gate passes
- No role performs the merge — it is a post-review integration step

## Conventional Commits

All commit messages must follow the conventional commits specification:

```
<type>(<optional scope>): <description>
```

Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`, `build`

## Changelog Rules

- Format: Keep a Changelog (keepachangelog.com)
- Every user-facing change must have an entry under `[Unreleased]`
- Valid categories: Added, Changed, Deprecated, Removed, Fixed, Security
- The executor updates the changelog; the verifier validates it; the reviewer flags quality issues

## Enforcement

- **Tooling:** `superagent validate branches`, `superagent validate commits`, `superagent validate changelog`
- **CI:** All three validators run on pull requests; `--require-entries` blocks feature/codex/hotfix branches without changelog entries
- **Roles:** Each role has documented git-flow responsibilities in its contract
