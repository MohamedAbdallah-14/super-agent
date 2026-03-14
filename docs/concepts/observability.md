# Observability

SuperAgent observability is file-based and host-native. All observability requires no external services.

## Current observability surfaces

Implemented now:

- `superagent status --run <id> [--json]`
- canonical hook definitions for status, capture, compaction, and handoff events
- external state-root policy for run-local files
- `superagent capture init` for `status.json` and `events.ndjson` bootstrap
- `superagent capture event` for event append and status updates
- `superagent capture route` and `superagent capture output` for large-output artifact capture
- `superagent capture summary` for `summary.md` and stop-time or compaction summaries

Planned next:

- host-specific native-hook or wrapper wiring that calls the capture commands automatically

## Current status path

The status command reads:

- `<state-root>/runs/<run-id>/status.json`

Use `--state-root <path>` to target a fixture or non-default state location.

The capture command family writes under:

- `<state-root>/runs/<run-id>/status.json`
- `<state-root>/runs/<run-id>/events.ndjson`
- `<state-root>/runs/<run-id>/summary.md`
- `<state-root>/runs/<run-id>/captures/*`

## Design rules

- run-local observability lives outside the repo by default
- machine-readable status must exist without any server
- captured output should reduce context flooding, not increase it
- summaries must point back to captured files instead of pretending the full output stayed in context
