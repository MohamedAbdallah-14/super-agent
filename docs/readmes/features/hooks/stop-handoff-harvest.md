# stop_handoff_harvest

> `PostToolUse` / Session end · Observability · Harvests final handoff notes and persists stop-time observability data when a session ends.

| Property | Value |
|---|---|
| **Hook ID** | `stop_handoff_harvest` |
| **Trigger event** | Session ends (agent stop event) |
| **Failure mode** | `capture` — exits 0, session ends regardless |
| **Exit codes** | `0` always |

## What It Guards

`stop_handoff_harvest` is the final observability event in every session. When the agent stops, this hook ensures that the handoff document and stop-time state are persisted to the run's state directory — so the next session can start with full context rather than reconstructing what happened from memory.

Without this hook, session state is lost at disconnect. The next session starts cold.

## Trigger Event

Fires once when the agent session ends — immediately before the process terminates or the connection closes.

## Logic

1. **Receive run ID** — identify the current session's state directory.
2. **Read current `status.json`** — capture the final run state.
3. **Append a stop event** — write a terminal event to `events.ndjson` with timestamp and session summary.
4. **Write `summary.md`** — produce a structured stop-time handoff summary.
5. **Exit 0** — session ends cleanly.

## Configuration

| Parameter | Required | Description |
|---|---|---|
| `run_id` | Yes | The current session run identifier |

## What Happens on Violation

This hook does not block — session termination is not affected by hook behavior.

| Condition | Outcome |
|---|---|
| State directory not found | Warning logged; session ends |
| Write fails | Error to stderr; handoff data may be partial |
| Hook encounters an error | Session ends; handoff data may not be persisted |

**Side effects produced:**

| Artifact | Location | Description |
|---|---|---|
| `events.ndjson` (stop event) | `~/.superagent/projects/<slug>/events.ndjson` | Final stop event appended |
| `summary.md` | `~/.superagent/projects/<slug>/summary.md` | Stop-time handoff summary |

## Summary Format

The stop-time `summary.md` produced by this hook:

```markdown
# Session Handoff — run-42 — stopped 2026-03-13T11:30:00Z

## Status at Stop
- Phase: execute (section 3 of 5 complete)
- Last verified: Section 3 — router wiring (PASS)

## Completed This Session
- Section 1: Redis client setup — VERIFIED
- Section 2: Rate-limit middleware — VERIFIED
- Section 3: Router wiring — VERIFIED

## Blocked / Incomplete
- Section 4: Redis integration tests — blocked (no Docker in CI)
- Section 5: Load test — not started

## Required Approvals for Next Session
- Decision: mock Redis in tests OR add Docker to CI

## Total Tool Executions: 12
## Captures: 3 files (72KB)
```

## Example

**Scenario:** Agent disconnects mid-plan after completing 3 of 5 sections.

```
Session running. Agent completes sections 1-3.
Section 4 blocked (no Docker). Agent session ends.

stop_handoff_harvest fires:
  → Reads status.json (phase: execute, loop: 3)
  → Reads events.ndjson (12 events)
  → Appends stop event: { "type": "session_stop", "ts": "...", "run_id": "run-42" }
  → Writes summary.md with completed work, blockers, approvals needed

Next session starts:
  → Agent reads ~/.superagent/projects/myapp/summary.md
  → Immediately knows: sections 1-3 done, section 4 needs Docker decision
  → No cold start reconstruction needed
```

## Testing

```bash
# Initialize a session and simulate stop
superagent capture init
superagent capture event --command "npm test" --exit-code 0
superagent capture summary

# Verify summary.md exists
cat ~/.superagent/projects/superagent/summary.md

# Validate hook definition
node tooling/src/cli.js validate hooks
```

> [!TIP]
> `stop_handoff_harvest` and the `prepare-next` skill are complementary. `prepare-next` is the agent-authored structured handoff document. `stop_handoff_harvest` is the machine-generated observability record. Use both.

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_hook` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `native_or_wrapper` |
