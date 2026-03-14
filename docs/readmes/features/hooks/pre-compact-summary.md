# pre_compact_summary

> `PreCompact` · Observability · Summarizes captured session state before context compaction or handoff so nothing is lost when the context window shrinks.

| Property | Value |
|---|---|
| **Hook ID** | `pre_compact_summary` |
| **Trigger event** | Before context compaction or session handoff |
| **Failure mode** | `warn` — exits 0, compaction proceeds even if summary fails |
| **Exit codes** | `0` always |

## What It Guards

Context compaction discards detail to make room. `pre_compact_summary` runs immediately before compaction and writes a structured summary of everything captured in the current run — tool executions, outcomes, findings — so that information survives the compaction in human-readable form.

Without this hook, compaction discards the raw `events.ndjson` detail and the next agent turn starts with no record of what was executed or what happened.

## Trigger Event

Fires immediately before the host performs context compaction or before a session handoff is initiated.

## Logic

1. **Receive run ID** — identify the current session's state directory.
2. **Read `events.ndjson`** — load the complete event stream for this run.
3. **Read any capture files** — load content from capture paths registered during the run.
4. **Produce summary** — synthesize events and captures into a structured `summary.md`.
5. **Write `summary.md`** — persist to the run state directory.
6. **Exit 0** — compaction proceeds regardless.

## Configuration

| Parameter | Required | Description |
|---|---|---|
| `run_id` | Yes | The current session run identifier |

## What Happens on Violation

This hook does not block. On failure:

| Condition | Outcome |
|---|---|
| `events.ndjson` not found | Warning emitted; summary written with "no events captured" note |
| Write fails | Warning to stderr; compaction proceeds without summary |
| Hook encounters an error | Warning emitted; compaction proceeds |

**Side effects produced:**

| Artifact | Location | Description |
|---|---|---|
| `summary.md` | `~/.superagent/projects/<slug>/summary.md` | Structured summary of session captured state |

## Summary Format

```markdown
# Session Summary — run-42 — 2026-03-13T10:45:00Z

## Tool Executions (7)
| Command | Exit | Capture |
|---------|------|---------|
| npm test | 0 | captures/npm-test-001.txt (47KB, 127 passing) |
| node tooling/src/cli.js validate hooks | 0 | — |
| git diff | 0 | captures/git-diff-001.txt (12KB) |

## Key Findings
- All 127 tests passing after rate-limit middleware implementation
- Hook validation: all 7 hooks validated

## Captures
- captures/npm-test-001.txt — full test run output (47KB)
- captures/git-diff-001.txt — diff of changes in session (12KB)
```

## Example

**Scenario:** Long implementation session is about to compact.

```
Agent has run 7 commands during the session. Context is 85% full.
Host triggers context compaction.

pre_compact_summary fires:
  → Reads events.ndjson (7 events)
  → Reads 3 capture files
  → Produces summary.md:
       7 tool executions
       2 capture files (60KB total)
       All verifications passed
  → Writes to ~/.superagent/projects/myapp/summary.md

Context compacts. Raw event detail discarded.
Next agent turn reads summary.md — session continuity preserved.
```

## Testing

```bash
# Initialize and add test events
superagent capture init
superagent capture event --command "npm test" --exit-code 0

# Run the summary
superagent capture summary

# Check the output
cat ~/.superagent/projects/superagent/summary.md

# Validate hook definition
node tooling/src/cli.js validate hooks
```

> [!TIP]
> The `stop_handoff_harvest` hook also produces a `summary.md` — but at session end, not at compaction time. `pre_compact_summary` may fire multiple times in a long session; `stop_handoff_harvest` fires exactly once.

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_or_wrapper` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `wrapper_command` |
