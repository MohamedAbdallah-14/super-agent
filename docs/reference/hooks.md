# Hooks Reference

SuperAgent defines canonical hook contracts in `hooks/definitions/*.yaml`.

These hook definitions are product contracts first. Host-specific native hooks or wrapper commands must preserve the same behavior.

## Canonical hook roster

| Hook ID | Purpose | Failure mode |
| --- | --- | --- |
| `session_start` | Initialize run-local status capture and bootstrap summaries | capture |
| `pre_tool_capture_route` | Route large tool output away from model context | warn |
| `post_tool_capture` | Append tool execution events and captured output metadata | capture |
| `pre_compact_summary` | Summarize captured state before compaction or handoff | warn |
| `stop_handoff_harvest` | Persist final handoff and stop-time observability data | capture |
| `protected_path_write_guard` | Block writes to protected canonical paths outside approved flows | block |
| `loop_cap_guard` | Block extra iterations after the configured loop cap | block |

## Source of truth

- hook contracts: `hooks/definitions/*.yaml`
- schema: `schemas/hook.schema.json`
- required hook roster: `superagent.manifest.yaml`
- validation command: `superagent validate hooks`

## Host fallback policy

Every canonical hook definition includes `host_fallback` guidance for:

- Claude
- Codex
- Gemini
- Cursor

Fallbacks may be native hooks or wrapper commands, but they must preserve:

- the same trigger intent
- the same protected-path policy
- the same loop-cap policy
- the same observable outputs or an explicitly documented equivalent

## Current implementation status

Implemented now:

- canonical hook definitions and schema validation
- manifest-level required hook roster
- CLI validation through `superagent validate hooks`
- capture/status file writers through:
  - `superagent capture init`
  - `superagent capture event`
  - `superagent capture route`
  - `superagent capture output`
  - `superagent capture summary`
- wrapper guard scripts:
  - `hooks/protected-path-write-guard`
  - `hooks/loop-cap-guard`

Planned next:

- wrapper/native execution helpers

## Guardrail note

Hook definitions are the authoritative product contracts. The canonical definitions above take precedence over any other hook documentation.

## Current guard exit codes

- `hooks/protected-path-write-guard`
  - `0` allow
  - `42` block
- `hooks/loop-cap-guard`
  - `0` allow
  - `43` block
