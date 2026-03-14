# Pre-Release Contract Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix three documentation/CLI contract drift issues before v0.1.0 goes public.

**Architecture:** All fixes are surface-level — one badge edit, one new aggregate code path, and one usage string cleanup. No new files, no new dependencies, no schema changes.

**Tech Stack:** Node.js (node:test), pure JS, shield badges (Markdown)

---

## Issues

1. **README badge says Node >=18, but `package.json` requires >=20** — users install the wrong Node version and get silent failures.
2. **`superagent validate` (no subcommand) returns an error** — AGENTS.md and docs advertise it as a top-level command that runs all validators, but the CLI requires a subcommand.
3. **Usage string lists `artifacts` as a valid subcommand** — but `validate artifacts` is intentionally not implemented (exits 2). The usage string should only list working subcommands.

## Tasks

| ID | Title | Size | Files |
|----|-------|------|-------|
| 1 | Fix README Node version badge | micro | `README.md` |
| 2 | Implement aggregate `superagent validate` | small | `tooling/src/commands/validate.js`, `tooling/test/validate.test.js` |
| 3 | Remove `artifacts` from validate usage string | micro | `tooling/src/commands/validate.js` |

Tasks 2 and 3 both modify `validate.js` — they must run sequentially. Task 1 is independent.
