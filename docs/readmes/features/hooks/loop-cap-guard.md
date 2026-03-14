# loop_cap_guard

> `PreToolUse` · Guard · Stops additional loop iterations after the configured phase cap is reached. Hard stop — exit 43.

| Property | Value |
|---|---|
| **Hook ID** | `loop_cap_guard` |
| **Trigger event** | Before each phase iteration, after the cap threshold is reached |
| **Failure mode** | `block` — exits `43` on violation |
| **Exit codes** | `0` allow · `43` block |
| **Script** | `hooks/loop-cap-guard` |

## What It Guards

`loop_cap_guard` prevents runaway iteration. AI agents in a loop — debugging, verification retries, re-planning cycles — can iterate indefinitely when not constrained. This guard reads the current loop count from `status.json` and blocks the iteration if the configured cap for the current phase has been exceeded.

This is a hard block. Exit code `43` causes the host to reject the next iteration and surface the situation to the operator for a decision.

## Why Loop Caps Matter

| Without loop_cap_guard | With loop_cap_guard |
|---|---|
| Debug loop runs 20+ cycles, no resolution | Debug loop capped at 3 — unresolved after cap is reported |
| Verification retries forever on a flaky test | Verification retries capped — flakiness documented, escalated |
| Re-planning cycles consume entire context window | Re-planning capped — operator is asked to unblock |
| No way to distinguish "working hard" from "spinning" | Cap breach is an explicit signal: escalation needed |

## Trigger Event

Fires before each new iteration of a phase loop. Receives `run_id` and `phase` as inputs and reads the current iteration count from `status.json`.

## Logic

1. **Read payload** — `run_id` and `phase` from stdin.
2. **Read `status.json`** — load the current loop count for the phase.
3. **Load phase cap** — look up the configured cap for this phase.
4. **Evaluate** — is `current_count >= cap`?
5. **If under cap** — allow. Emit `{ "guard_decision": { "allowed": true } }`. Exit `0`.
6. **If at or over cap** — block. Emit `{ "guard_decision": { "allowed": false } }`. Exit `43`.

```javascript
// Decision shapes
{ "guard_decision": { "allowed": true } }
{ "guard_decision": { "allowed": false, "reason": "loop cap exceeded for phase: debug (cap: 3, current: 3)" } }
```

## Configuration

| Parameter | Required | Source | Description |
|---|---|---|---|
| `run_id` | Yes | Payload | Current session run identifier |
| `phase` | Yes | Payload | Phase name being iterated (e.g., `debug`, `verify`) |
| Phase caps | Yes | Status/config | Per-phase iteration limits |

## What Happens on Violation

When the loop cap is exceeded:

1. Guard emits `{ "guard_decision": { "allowed": false } }` to stdout.
2. Script exits `43`.
3. The host rejects the next iteration.
4. The agent receives a block notification.
5. The agent must surface the situation to the operator.

When the agent receives a `43` exit:
- Do not retry the blocked iteration.
- Do not invent certainty about what would have happened next.
- Record the block in the active execution artifact or handoff.
- Present the unresolved state and the evidence gathered so far to the operator.
- Ask the operator to decide: continue (with a raised cap), investigate differently, or defer.

> [!WARNING]
> A loop cap breach is not a failure of the agent — it is a signal that human judgment is needed. The correct response is escalation with evidence, not a workaround.

## Example

**Scenario:** Debugging loop reaches 3 cycles without resolving the issue.

```
Loop 1: sa:debugging cycle — hypothesis H1 tested, rejected
Loop 2: sa:debugging cycle — hypothesis H2 tested, rejected
Loop 3: sa:debugging cycle — hypothesis H3 tested, rejected

Loop 4 attempted:
loop_cap_guard fires:
  Input: { "run_id": "run-42", "phase": "debug" }
  Reads status.json: { "debug_loop_count": 3 }
  Configured cap for "debug": 3
  3 >= 3 → BLOCK
  Output: { "guard_decision": { "allowed": false, "reason": "loop cap exceeded..." } }
  Exit: 43

Host blocks Loop 4.
Agent responds:
  "I've completed 3 debugging cycles without resolving the failure. The loop cap has been reached.

  Evidence gathered:
  - H1: Redis not connected (rejected — connection log shows it is connected)
  - H2: Test setup race condition (rejected — added await, same failure)
  - H3: Off-by-one in token count (rejected — manual inspection shows correct math)

  Unresolved: I don't know why the middleware returns 200 instead of 429.
  Next step options:
  1. Add verbose debug logging and re-run with cap raised
  2. Escalate to a human reviewer with the evidence above
  3. Defer and open an issue"
```

## Testing

```bash
# Test the guard script
echo '{"run_id":"test-run","phase":"debug"}' | node hooks/loop-cap-guard
# With no status file: should allow (exit 0) — no loop count yet

# Test with a status file showing cap exceeded
# (requires setting up a status.json with loop count at cap)

# Validate hook definition
node tooling/src/cli.js validate hooks

# Doctor check (includes loop cap guard status)
node tooling/src/cli.js doctor --json
```

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_or_wrapper` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `native_or_wrapper` |
