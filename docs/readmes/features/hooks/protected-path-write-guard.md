# protected_path_write_guard

> `PreToolUse` · Guard · Blocks writes to canonical protected paths outside approved regeneration flows. Hard stop — exit 42.

| Property | Value |
|---|---|
| **Hook ID** | `protected_path_write_guard` |
| **Trigger event** | Any write operation targeting a protected path |
| **Failure mode** | `block` — exits `42` on violation |
| **Exit codes** | `0` allow · `42` block |
| **Script** | `hooks/protected-path-write-guard` |

## What It Guards

`protected_path_write_guard` enforces the boundary between read-only operator truth and agent-modifiable surfaces. Certain paths in the SuperAgent repo are canonical — they define roles, schemas, workflows, and host exports. Modifying them outside of the approved `export build` regeneration flow would silently corrupt the project's source of truth.

This guard is a hard block. Exit code `42` causes the host to reject the write immediately.

## Protected Paths

| Path | Why Protected |
|---|---|
| `input/` | Operator-supplied requirements — read-only by agents |
| `roles/` | Canonical role contracts — modified only by maintainers |
| `workflows/` | Phase entrypoints — modified only by maintainers |
| `schemas/` | Validation schemas — modified only by maintainers |
| `exports/hosts/` | Generated host packages — regenerated only via `export build` |

## Trigger Event

Fires before any file write operation. Receives the target path as input and evaluates it against the protected path list from `superagent.manifest.yaml`.

## Logic

1. **Read target path** from tool input payload.
2. **Load protected paths** from manifest (`superagent.manifest.yaml → protected_paths`).
3. **Evaluate match** — does the target path fall under any protected path prefix?
4. **If no match** — write is allowed. Exit `0`.
5. **If match** — write is blocked. Emit guard decision JSON to stdout. Exit `42`.

```javascript
// Decision shape
{ "guard_decision": { "allowed": false, "reason": "protected path: input/" } }
```

## Configuration

| Parameter | Required | Source | Description |
|---|---|---|---|
| `target_path` | Yes | Tool input payload | The file path being written |
| Protected paths list | Yes | `superagent.manifest.yaml` | `protected_paths` array |

## What Happens on Violation

When a write targets a protected path:

1. Guard emits `{ "guard_decision": { "allowed": false } }` to stdout.
2. Script exits `42`.
3. The host rejects the write operation.
4. The agent receives a block notification.
5. No write occurs.

The agent should respond to a `42` exit by:
- Explaining why the write was blocked.
- Asking the operator if a regeneration flow should be triggered (`export build`) if the intent was to update exports.
- Proceeding without the write if the intent was a direct edit of a protected file.

> [!WARNING]
> Exit code `42` is not an error — it is an intentional block. Do not retry the write. Do not attempt to work around the guard by writing to a temporary path and then moving the file.

## Example

**Scenario:** Agent attempts to directly edit a role file.

```
Agent attempts: Write to roles/executor.md

protected_path_write_guard fires:
  Input: { "target_path": "roles/executor.md" }
  Checks against protected_paths: ["input", "roles", "workflows", "schemas", "exports/hosts"]
  Match found: "roles"
  Output: { "guard_decision": { "allowed": false, "reason": "protected path: roles/" } }
  Exit: 42

Host blocks the write.
Agent receives block notification.
Agent responds: "roles/executor.md is a protected canonical path and cannot be written directly.
To modify role contracts, make changes through the maintainer review process."
```

**Scenario:** Agent writes to an allowed path.

```
Agent attempts: Write to docs/plans/2026-03-13-design.md

protected_path_write_guard fires:
  Input: { "target_path": "docs/plans/2026-03-13-design.md" }
  Checks against protected_paths — no match.
  Output: { "guard_decision": { "allowed": true } }
  Exit: 0

Write proceeds normally.
```

## Testing

```bash
# Test the guard script directly
echo '{"target_path": "input/requirements.md"}' | node hooks/protected-path-write-guard
# Expected exit: 42
# Expected stdout: {"guard_decision":{"allowed":false,...}}

echo '{"target_path": "docs/plans/my-plan.md"}' | node hooks/protected-path-write-guard
# Expected exit: 0
# Expected stdout: {"guard_decision":{"allowed":true}}

# Validate hook definition
node tooling/src/cli.js validate hooks
```

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_or_wrapper` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `native_or_wrapper` |
