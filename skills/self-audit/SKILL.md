---
name: self-audit
description: Run a self-audit loop in an isolated git worktree — validates, audits, fixes, verifies, and merges back only on green. Safe self-improvement that cannot break the main working tree.
---

# Self-Audit — Worktree-Isolated Audit-Fix Loop

## Overview

This skill runs a structured self-audit of the SuperAgent project itself, operating entirely in an isolated git worktree. It validates the project against all canonical checks, performs deeper structural analysis, fixes issues found, verifies the fixes pass, and only merges back on all-green.

**Safety guarantee:** The main worktree is never modified until all checks pass in isolation.

## Trigger

On-demand: operator invokes `/self-audit` or requests a self-audit loop.

## Worktree Isolation Model

```
main worktree (untouched)
  └── agent spawns in isolated worktree (git worktree)
        ├── Phase 1: Validate (run all checks)
        ├── Phase 2: Deep audit (structural analysis)
        ├── Phase 3: Fix (remediate findings)
        ├── Phase 4: Verify (re-run all checks)
        └── Phase 5: Report (commit in worktree if green)
```

If any Phase 4 check fails, the worktree is discarded — no changes reach main.

## Phase 1: CLI Validation Sweep

Run every validation check and capture results:

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

Collect pass/fail for each. Any failure is a finding.

## Phase 2: Deep Structural Audit

Beyond CLI checks, inspect for:

1. **Cross-reference consistency**
   - Every role in `superagent.manifest.yaml` has a file in `roles/`
   - Every workflow in manifest has a file in `workflows/`
   - Every skill directory has a `SKILL.md`
   - Every schema referenced in docs exists in `schemas/`
   - Composition map concerns reference existing expertise modules

2. **Documentation drift**
   - `docs/architecture.md` component table matches actual directory structure
   - `docs/roles-and-workflows.md` role/workflow lists match manifest
   - README claims match actual project state

3. **Export freshness**
   - Generated exports match canonical sources (via `export --check`)
   - Host export directories contain expected structure

4. **Schema coverage**
   - Every workflow that produces artifacts has a corresponding schema
   - Schema files are valid JSON

5. **Hook integrity**
   - Hook scripts referenced in `.claude/settings.json` exist and are executable
   - Hook definitions in `hooks/definitions/` cover all manifest-required hooks

6. **Skill structure**
   - Each skill dir under `skills/` has a well-formed `SKILL.md` with frontmatter
   - Skills referenced in documentation actually exist

## Phase 3: Fix

For each finding from Phases 1-2:

1. Categorize as **auto-fixable** or **manual-required**
2. Auto-fixable issues: apply the fix directly
   - Missing files → create stubs or fix references
   - Stale exports → run `export build`
   - Documentation drift → update docs to match reality
   - Permission issues → `chmod +x` hook scripts
   - Schema formatting → auto-format
3. Manual-required issues: document in the audit report with remediation guidance

**Fix constraints:**
- Never modify `input/` (read-only operator surface)
- Prefer updating docs to match code (code is truth) unless the code is clearly wrong
- Keep fixes minimal — one concern per change

## Phase 4: Verify

Re-run the entire Phase 1 validation sweep. All checks must pass.

If any check fails after fixes:
- Revert the failing fix
- Document the revert and the root cause
- Re-verify

## Phase 5: Report & Commit

Produce a structured report:

```markdown
# Self-Audit Report — Loop N — <date>

## Validation Sweep
| Check | Before | After |
|-------|--------|-------|
| manifest | PASS/FAIL | PASS |
| hooks | PASS/FAIL | PASS |
| ... | ... | ... |

## Findings
### Auto-Fixed (N)
- [F-001] <description> — fixed by <change>
- ...

### Manual Required (N)
- [M-001] <description> — remediation: <guidance>
- ...

## Changes Made
- <file>: <what changed>
- ...

## Verification
All checks: PASS/FAIL
```

If all checks pass, commit changes in the worktree with:
```
fix(self-audit): loop N — <summary of fixes>
```

The worktree agent returns its results. If changes were made, the caller can merge them.

## Loop Behavior

When running multiple loops:
- Loop 1 audits the current state, fixes what it finds
- Loop 2 audits the result of Loop 1, catches anything missed or introduced
- Each loop is independent and runs in its own fresh worktree
- Convergence: if Loop N finds 0 issues, the project is clean
