# context-mode Adapter

Status: implemented (optional, config-driven).

## Position

SuperAgent does not depend on `context-mode` for default operation. All built-in indexing, recall, capture, and hook surfaces stand on their own without this adapter.

When enabled via init-time configuration, the adapter provides:

1. **Researcher bridging** — the researcher role prefers `fetch_and_index` over WebFetch for external documentation. Fetched docs become searchable via FTS5 across all phases.
2. **File read bridging** — large artifact reads can route through `execute_file` so raw content stays in the sandbox, only summaries enter context.
3. **Stats collection** — `ctx_stats` data is read at compaction and session-end, recorded in `usage.json` for savings reporting.

## Configuration

Enabled during project setup:

```json
{
  "context_mode": { "enabled": true }
}
```

Stored in `~/.superagent/projects/<project-slug>/config.json`.

## Adapter API

Module: `tooling/src/adapters/context-mode.js` (pure functions, no side effects)

| Function | Returns when enabled | Returns when disabled |
|----------|---------------------|----------------------|
| `isEnabled(config)` | `true` | `false` |
| `bridgeResearcherFetch(config, url, source)` | `{ tool, args }` hint | `null` |
| `bridgeFileRead(config, path, intent)` | `{ tool, args }` hint | `null` |
| `collectStats(config)` | `{ should_collect, tool, args }` | `null` |

## Constraints

- External only, opt-in only, lazy-loaded
- Must not block install, test, or normal CLI use when absent
- All functions return `null` on any failure — never throw
- `SUPERAGENT_DISABLE_CONTEXT_MODE=1` overrides config to force-disable

## Bridged Tools (2 of 9)

| Tool | Bridge Function | Purpose |
|------|----------------|---------|
| `fetch_and_index` | `bridgeResearcherFetch` | Researcher fetches docs + indexes for FTS5 search |
| `execute_file` | `bridgeFileRead` | Large file reads processed in sandbox |

The remaining 7 context-mode tools (`execute`, `batch_execute`, `index`, `search`, `stats`, `doctor`, `upgrade`) operate independently via context-mode's own hooks.

## Hook Interaction

Context-mode hooks (Claude Code hook system) fire BEFORE SuperAgent CLI commands:
1. context-mode PreToolUse may redirect WebFetch to fetch_and_index
2. SuperAgent captures the RESULT of whatever tool actually executed

SuperAgent's `usage.json` records savings regardless of which tool ran.
