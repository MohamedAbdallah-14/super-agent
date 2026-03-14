# post_tool_capture

> `PostToolUse` · Capture · Appends tool execution events and captures output metadata after every tool run.

| Property | Value |
|---|---|
| **Hook ID** | `post_tool_capture` |
| **Trigger event** | After every tool execution completes |
| **Failure mode** | `capture` — exits 0, never interrupts the agent |
| **Exit codes** | `0` always |

## What It Guards

`post_tool_capture` is the write half of the capture pipeline. After every tool executes, this hook appends a structured event record to `events.ndjson`, writes any captured output to the registered capture path, and updates `status.json` with the latest tool execution state.

This creates a complete, queryable record of every tool call in a session — the raw material for `pre_compact_summary` and `stop_handoff_harvest`.

## Trigger Event

Fires after every tool execution, receiving the command and exit code as inputs.

## Logic

1. **Receive execution result** — command string and exit code from the completed tool.
2. **Write captured output** — if a capture path was registered by `pre_tool_capture_route`, write the output to that file.
3. **Append event** — append a structured event to `events.ndjson` with timestamp, command, exit code, and capture path reference.
4. **Update status** — write latest tool execution state to `status.json`.
5. **Exit 0** — agent proceeds in all cases.

## Configuration

| Parameter | Required | Description |
|---|---|---|
| `command` | Yes | The command that just executed |
| `exit_code` | Yes | The exit code from the tool execution |

## What Happens on Violation

This hook does not block. On failure:

| Condition | Outcome |
|---|---|
| Write fails (disk full, permissions) | Error logged to stderr; agent proceeds |
| `status.json` not initialized | Event append attempted, may fail silently |
| No capture path registered | Output not written to file; event still recorded |

**Side effects produced:**

| Artifact | Location | Description |
|---|---|---|
| `events.ndjson` | `~/.superagent/projects/<slug>/events.ndjson` | Newline-delimited JSON event stream |
| Capture file | Registered capture path | Raw tool output (if capture was routed) |
| `status.json` | `~/.superagent/projects/<slug>/status.json` | Updated run status |

## Event Record Format

Each appended event has this shape:

```json
{
  "ts": "2026-03-13T10:23:45.123Z",
  "type": "tool_execution",
  "command": "npm test",
  "exit_code": 0,
  "capture_path": "~/.superagent/projects/myapp/captures/run-42/npm-test-001.txt"
}
```

## Example

**Scenario:** Full session showing the capture pipeline in action.

```
1. session_start fires → status.json initialized

2. Agent runs: npm test
   pre_tool_capture_route → capture_path registered: captures/run-42/npm-test-001.txt
   Tool executes: npm test (exit 0, 127 tests passing)
   post_tool_capture fires:
     → Writes test output to captures/run-42/npm-test-001.txt (47KB)
     → Appends to events.ndjson: { "command": "npm test", "exit_code": 0, ... }
     → Updates status.json: { "last_command": "npm test", "status": "ok" }

3. Agent runs: node --version
   pre_tool_capture_route → no capture needed
   Tool executes: node --version (exit 0)
   post_tool_capture fires:
     → No capture file to write
     → Appends to events.ndjson: { "command": "node --version", "exit_code": 0 }
     → Updates status.json

4. pre_compact_summary fires → reads events.ndjson, produces summary.md
```

## Testing

```bash
# Initialize a test run
superagent capture init

# Simulate an event append
superagent capture event --command "npm test" --exit-code 0

# Check the events file
cat ~/.superagent/projects/superagent/events.ndjson

# Validate hook definition
node tooling/src/cli.js validate hooks
```

> [!TIP]
> The events.ndjson file is the authoritative session audit trail. `pre_compact_summary` and `stop_handoff_harvest` both read from it to produce their summaries.

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_hook` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `native_or_wrapper` |
