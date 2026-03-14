# pre_tool_capture_route

> `PreToolUse` · Capture · Routes large command output away from model context before the tool runs.

| Property | Value |
|---|---|
| **Hook ID** | `pre_tool_capture_route` |
| **Trigger event** | Before a tool execution that may produce large output |
| **Failure mode** | `warn` — exits 0, never blocks tool execution |
| **Exit codes** | `0` always |

## What It Guards

`pre_tool_capture_route` prevents large tool outputs from flooding the model's context window. When a command is about to run that could produce substantial output (test suites, build logs, audit results), this hook registers a capture target so the output is written to disk rather than injected directly into the model's active context.

Without this hook, large outputs can consume the context window, degrade response quality, and trigger expensive context compaction cycles.

## Trigger Event

Fires before each tool execution, evaluated against the command being run to determine whether capture routing is needed.

## Logic

1. **Receive command** — the incoming tool's command string is passed as input.
2. **Evaluate output size risk** — assess whether the command is likely to produce large output (e.g., full test suites, build systems, log tails, dependency scans).
3. **Register capture target** — if routing is warranted, create a capture path where output will be written (a file under the run's state directory).
4. **Emit capture path** — return the `capture_path` so the tool execution layer knows where to redirect output.
5. **Exit 0** — tool execution proceeds in all cases.

## Configuration

| Parameter | Required | Description |
|---|---|---|
| `command` | Yes | The command string about to be executed |

## What Happens on Violation

This hook does not block. On failure or when routing is not needed:

| Condition | Outcome |
|---|---|
| Command unlikely to produce large output | No capture path registered; output goes to context normally |
| Hook encounters an error | Warning emitted; tool proceeds without capture routing |

**Side effects produced:**

| Artifact | Location | Description |
|---|---|---|
| `capture_path` | State root | File path where captured output will be written |
| Capture target registration | Session state | Records the intent to capture for this command |

## Example

**Scenario:** Agent is about to run a full test suite.

```
Pre-tool hook fires with: { "command": "npm test" }

Hook evaluates: npm test likely produces > 500 lines of output
Hook creates capture target: ~/.superagent/projects/myapp/captures/run-42/npm-test-001.txt
Hook returns: { "capture_path": "~/.superagent/projects/myapp/captures/run-42/npm-test-001.txt" }

Tool execution proceeds, output routed to capture path.
Model context receives a summary reference rather than raw test output.
```

**Scenario:** Agent runs a small targeted command.

```
Pre-tool hook fires with: { "command": "node --version" }

Hook evaluates: single-line output, no capture needed.
No capture path registered.
Output goes directly to context normally.
```

## Testing

```bash
# Validate hook definition
node tooling/src/cli.js validate hooks

# Test capture init (which pre_tool_capture_route depends on)
superagent capture init

# Test capture route registration
superagent capture route --path /tmp/test-capture.txt
```

> [!TIP]
> The `post_tool_capture` hook is the counterpart to this hook — it writes the actual captured output after tool execution. Both hooks must be registered for the capture pipeline to work end-to-end.

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_hook` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `native_or_wrapper` |
