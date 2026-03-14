# post-tool-lint

> `PostToolUse` · Guard · Validates JavaScript file syntax immediately after any write that produces a `.js` file.

| Property | Value |
|---|---|
| **Script** | `hooks/post-tool-lint` |
| **Trigger event** | After a tool write that produces a `.js` file |
| **Failure mode** | Syntax error blocks — exits `2` |
| **Exit codes** | `0` allow · `2` syntax error |

## What It Guards

`post-tool-lint` catches JavaScript syntax errors the moment a `.js` file is written — before the error can propagate to a test run or a runtime crash. It runs `node --check` on the written file immediately after each write, producing an actionable error message pinpointing exactly which file has the problem.

This is the fastest possible syntax feedback loop: error surfaces at write time, not at execution time.

## Trigger Event

Fires after any tool execution that writes a file. Checks whether the written file path ends in `.js`. If not, exits immediately with `0` (no-op). If yes, runs the syntax check.

## Logic

1. **Read payload** — attempt to parse tool input JSON from stdin; fall back to `CLAUDE_TOOL_FILE_PATH` env variable.
2. **Extract file path** — from `tool_input.file_path` in payload or the env variable.
3. **Check extension** — if not `.js`, exit `0` immediately (no-op for all other file types).
4. **Check file existence** — if the file doesn't exist on disk, exit `0` (write may have been blocked or virtual).
5. **Run `node --check`** — execute syntax-only validation (no execution, no side effects).
6. **If valid** — exit `0`.
7. **If syntax error** — write error details to stderr. Exit `2`.

## Configuration

| Parameter | Source | Description |
|---|---|---|
| File path | `tool_input.file_path` or `CLAUDE_TOOL_FILE_PATH` | The `.js` file to lint |

The hook is stateless — no configuration files or manifests needed.

## What Happens on Violation

When a `.js` file has a syntax error:

1. Script writes a detailed error to stderr:
   ```
   Syntax error in src/middleware/rate-limit.js:
   /path/to/src/middleware/rate-limit.js:23
   const foo = {
                ^
   SyntaxError: Unexpected token '}'
   ```
2. Script exits `2`.
3. The host surfaces the error to the agent.
4. The agent must fix the syntax error and rewrite the file.

> [!WARNING]
> Exit `2` from this hook means the last write produced invalid JavaScript. Do not continue to the next implementation step — fix the syntax error first. A broken `.js` file that passes to the next tool call is harder to debug than one caught immediately.

## Example

**Scenario:** Agent writes a middleware file with a missing closing brace.

```javascript
// Written: src/middleware/rate-limit.js (line 23 has missing brace)
export function rateLimit(options) {
  return (req, res, next) => {
    const tokens = getTokens(req.auth);
    if (tokens <= 0) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    // Missing: closing brace for if block
    next();
  };
}
```

```
post-tool-lint fires:
  File: src/middleware/rate-limit.js
  Extension: .js — proceed with check
  Runs: node --check src/middleware/rate-limit.js

  Syntax error in src/middleware/rate-limit.js:
    ...
    SyntaxError: Unexpected token '}'
    at line 28

  Exit: 2

Agent receives the error:
"Syntax error in the written file. Fixing the missing closing brace in the if block."
[Agent rewrites the file with correct syntax]

post-tool-lint fires again:
  node --check → exits 0
  Exit: 0 — file is valid
```

**Scenario:** Agent writes a markdown file — hook is a no-op.

```
post-tool-lint fires:
  File: docs/plans/2026-03-13-design.md
  Extension: .md — not .js, exit 0 immediately
```

## Testing

```bash
# Test with a valid JS file
echo 'const x = 1;' > /tmp/test-valid.js
CLAUDE_TOOL_FILE_PATH=/tmp/test-valid.js node hooks/post-tool-lint
echo $?  # Expected: 0

# Test with an invalid JS file
echo 'const x = {' > /tmp/test-invalid.js
CLAUDE_TOOL_FILE_PATH=/tmp/test-invalid.js node hooks/post-tool-lint
echo $?  # Expected: 2

# Test with a non-JS file (no-op)
CLAUDE_TOOL_FILE_PATH=/tmp/README.md node hooks/post-tool-lint
echo $?  # Expected: 0

# Test with JSON payload
echo '{"tool_input":{"file_path":"/tmp/test-valid.js"}}' | node hooks/post-tool-lint
echo $?  # Expected: 0
```

## Scope

`post-tool-lint` only checks `.js` files. TypeScript, JSON, YAML, and other file types are not checked by this hook. TypeScript syntax validation requires a separate tsc-based hook.
