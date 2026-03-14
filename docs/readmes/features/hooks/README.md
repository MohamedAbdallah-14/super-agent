# Hooks

> Canonical hook contracts that enforce protected paths, loop caps, capture routing, and session observability across every AI host.

Hooks are **product contracts first**. Each hook definition in `hooks/definitions/*.yaml` specifies the authoritative behavior. Host-specific native hooks or wrapper scripts must preserve that behavior — they cannot relax it.

## Hook Roster

| Hook ID | Type | Event | Failure Mode |
|---|---|---|---|
| [session_start](session-start.md) | Observability | Session begins | capture |
| [pre_tool_capture_route](pre-tool-capture-route.md) | Capture | Before large tool runs | warn |
| [post_tool_capture](post-tool-capture.md) | Capture | After every tool execution | capture |
| [pre_compact_summary](pre-compact-summary.md) | Observability | Before context compaction | warn |
| [stop_handoff_harvest](stop-handoff-harvest.md) | Observability | Session ends | capture |
| [protected_path_write_guard](protected-path-write-guard.md) | Guard | Write to protected path attempted | **block (exit 42)** |
| [loop_cap_guard](loop-cap-guard.md) | Guard | Phase iteration limit exceeded | **block (exit 43)** |

## Hook Categories

| Category | Members | Purpose |
|---|---|---|
| **Guards** | `protected_path_write_guard`, `loop_cap_guard` | Hard blocks — prevent unsafe actions |
| **Capture** | `pre_tool_capture_route`, `post_tool_capture` | Route and persist tool output outside model context |
| **Observability** | `session_start`, `pre_compact_summary`, `stop_handoff_harvest` | Session lifecycle events and handoff data |

## Guard Exit Codes

| Hook | Allowed | Blocked |
|---|---|---|
| `protected_path_write_guard` | `0` | `42` |
| `loop_cap_guard` | `0` | `43` |

## Source of Truth

```
hooks/definitions/*.yaml     — canonical hook contracts
schemas/hook.schema.json     — validation schema
superagent.manifest.yaml     — required_hooks roster
```

Validate with:
```bash
node tooling/src/cli.js validate hooks
```

## Host Fallback Policy

Every hook definition specifies `host_fallback` guidance for Claude, Codex, Gemini, and Cursor. Fallbacks must preserve:

- The same trigger intent
- The same protected-path policy
- The same loop-cap policy
- The same observable outputs (or a documented equivalent)

| Hook ID | Claude | Codex | Gemini | Cursor |
|---|---|---|---|---|
| `session_start` | native_hook | wrapper | wrapper | native_or_wrapper |
| `pre_tool_capture_route` | native_hook | wrapper | wrapper | native_or_wrapper |
| `post_tool_capture` | native_hook | wrapper | wrapper | native_or_wrapper |
| `pre_compact_summary` | native_or_wrapper | wrapper | wrapper | wrapper |
| `stop_handoff_harvest` | native_hook | wrapper | wrapper | native_or_wrapper |
| `protected_path_write_guard` | native_or_wrapper | wrapper | wrapper | native_or_wrapper |
| `loop_cap_guard` | native_or_wrapper | wrapper | wrapper | native_or_wrapper |

## Protected Paths

The following paths are protected by `protected_path_write_guard`:

```
input/
roles/
workflows/
schemas/
exports/hosts/
```

Writes to these paths outside approved regeneration flows are blocked with exit code `42`.

## CLI Capture Commands

Capture hooks are backed by these CLI commands:

```bash
superagent capture init      # initialize status.json for the run
superagent capture event     # append an event to events.ndjson
superagent capture route     # register a capture target path
superagent capture output    # write captured tool output
superagent capture summary   # produce summary.md before compaction
```

## Implementation Status

| Component | Status |
|---|---|
| Canonical hook definitions | Implemented |
| Schema validation | Implemented |
| CLI capture commands | Implemented |
| `protected-path-write-guard` script | Implemented |
| `loop-cap-guard` script | Implemented |
| `session-start` script | Implemented |
| `post-tool-lint` script | Implemented |
| Native execution helpers | Planned |
