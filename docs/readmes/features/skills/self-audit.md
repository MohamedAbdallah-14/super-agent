# self-audit

> Worktree-isolated audit-fix loop for the SuperAgent project itself. Validates, audits, fixes, verifies, and merges only on all-green. The main worktree is never touched until every check passes.

| Property | Value |
|---|---|
| **ID** | `self-audit` |
| **Type** | Flexible |
| **Trigger** | `/self-audit` or explicit operator request for a self-audit loop |
| **Safety guarantee** | Main worktree untouched until all Phase 4 checks pass in isolation |

## Purpose

`self-audit` is `run-audit` with an important difference: it operates on the SuperAgent project itself, using git worktree isolation to guarantee that fixes are safe before they reach the main working tree. No partial fix state ever lands on main — the worktree is discarded if Phase 4 verification fails.

It also goes beyond a standard audit by running every CLI validation check and performing a deep structural consistency analysis that CLI checks alone cannot catch.

## When to Invoke

- Before a release or major merge.
- When documentation drift is suspected (roles, workflows, skills out of sync with manifest).
- After a batch of changes to validate overall project coherence.
- On a scheduled review cadence.
- Explicitly: operator invokes `/self-audit`.

## When NOT to Invoke

- You want to audit a non-SuperAgent codebase — use `run-audit`.
- You are making a known targeted fix — make the fix directly, then run `sa:verification`.

> [!WARNING]
> Never run self-audit on the main worktree directly. The skill's safety guarantee depends on worktree isolation. If the isolation step is skipped, fixes may leave the project in a broken intermediate state.

## Worktree Isolation Model

```
main worktree (untouched throughout)
  └── agent spawns in isolated git worktree
        ├── Phase 1: CLI Validation Sweep
        ├── Phase 2: Deep Structural Audit
        ├── Phase 3: Fix (auto-fixable issues)
        ├── Phase 4: Verify (re-run all checks — must be all-green)
        └── Phase 5: Report + commit in worktree (if green)
                          ↓
              caller merges back to main (on green)
```

If Phase 4 fails: worktree is discarded. Main is unchanged.

## Phase 1: CLI Validation Sweep

Runs every validation check and captures pass/fail:

```bash
node tooling/src/cli.js validate manifest
node tooling/src/cli.js validate hooks
node tooling/src/cli.js validate docs
node tooling/src/cli.js validate brand
node tooling/src/cli.js validate runtime
node tooling/src/cli.js validate changelog
node tooling/src/cli.js validate commits
node tooling/src/cli.js doctor --json
node tooling/src/cli.js export --check
```

Any failure is a finding that goes into the audit report.

## Phase 2: Deep Structural Audit

Six categories of structural checks that CLI validation does not cover:

| Category | What Is Checked |
|---|---|
| Cross-reference consistency | Every manifest role/workflow has a corresponding file; every skill dir has `SKILL.md`; composition map concerns reference existing modules |
| Documentation drift | `docs/architecture.md` component table vs. actual dirs; `docs/roles-and-workflows.md` vs. manifest; README claims vs. actual state |
| Export freshness | Generated exports match canonical sources via `export --check` |
| Schema coverage | Every workflow that produces artifacts has a corresponding schema; all schema files are valid JSON |
| Hook integrity | Hook scripts in `.claude/settings.json` exist and are executable; hook definitions cover all manifest-required hooks |
| Skill structure | Each `skills/` directory has well-formed `SKILL.md` with frontmatter; referenced skills exist |

## Phase 3: Fix

For each finding:

| Category | Action |
|---|---|
| Auto-fixable | Apply fix directly (missing stubs, stale exports, doc drift, permission issues, schema formatting) |
| Manual-required | Document in audit report with remediation guidance |

Fix constraints:
- Never modify `input/` (read-only operator surface)
- Prefer updating docs to match code (code is truth) unless code is clearly wrong
- Keep fixes minimal — one concern per change

## Phase 4: Verify

Re-runs the entire Phase 1 CLI sweep. **All checks must pass.**

If any check fails after fixes:
1. Revert the failing fix.
2. Document the revert and root cause.
3. Re-verify.
4. If still failing, mark as manual-required and proceed with remaining passing checks.

## Phase 5: Report and Commit

Produces a structured report:

```markdown
# Self-Audit Report — Loop N — 2026-03-13

## Validation Sweep
| Check    | Before | After |
|----------|--------|-------|
| manifest | FAIL   | PASS  |
| hooks    | PASS   | PASS  |

## Auto-Fixed (2)
- [F-001] skills/scan-project/SKILL.md missing frontmatter — added name/description fields
- [F-002] docs/architecture.md component count was 8, actual is 9 — updated count

## Manual Required (1)
- [M-001] schema for `design_review` workflow missing — create schemas/design-review.schema.json

## Verification
All checks: PASS
```

On all-green: commits in the worktree with `fix(self-audit): loop N — <summary>`. Caller merges back.

## Loop Behavior

Multiple loops converge to clean:

```
Loop 1: finds 5 issues, fixes 4, 1 manual → all checks green → commit
Loop 2: finds 1 issue (introduced by Loop 1), fixes it → all checks green → commit
Loop 3: finds 0 issues → project is clean
```

Each loop runs in a fresh worktree, independent of previous loops.

## Example

**Scenario:** Running self-audit before a 0.2.0 release tag.

```
Operator: /self-audit

Agent: Spawning isolated worktree for self-audit Loop 1...
Phase 1: Running CLI validation sweep...
  validate manifest: PASS
  validate hooks: FAIL — session_start definition missing loop_cap field
  validate docs: FAIL — skills count in README is 10, actual is 11
  ...

Phase 2: Deep structural audit...
  F-003: skills/using-skills referenced in docs/skills.md but directory has sa:using-skills prefix — DRIFT
  ...

Phase 3: Fixing auto-fixable issues...
  F-001: Added loop_cap to session_start.yaml
  F-002: Updated README skill count to 11
  F-003: Aligned docs/skills.md reference to match actual skill ID

Phase 4: Re-running validation sweep...
  All checks: PASS

Phase 5: Committed — fix(self-audit): loop 1 — fix hook schema, skill count drift, doc reference alignment

Worktree ready for merge.
```

## Integration

`self-audit` is the SuperAgent equivalent of `run-audit` — it is the loop that keeps the OS kit itself coherent. After merge, the resulting commit can be used as a clean baseline for `prepare-next` handoffs.
