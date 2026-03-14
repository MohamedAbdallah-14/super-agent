# session_start

> `PreToolUse` · Observability · Initializes run-local status capture and injects the skill bootstrap at every session start.

| Property | Value |
|---|---|
| **Hook ID** | `session_start` |
| **Trigger event** | Session begins |
| **Failure mode** | `capture` — always exits 0, never blocks the session |
| **Exit codes** | `0` always |
| **Script** | `hooks/session-start` |

## What It Guards

`session_start` does two things: it bootstraps skill discovery by injecting the `sa:using-skills` skill content into the agent's system context, and it initializes the run-local `status.json` file that all other capture hooks write to throughout the session.

Without this hook firing correctly:
- Skills are not auto-discovered — the agent operates without the skill framework.
- Capture hooks have no status file to append to — observability is broken.

## Trigger Event

Fires once at the start of every session, before any tool or agent response.

## Logic

1. **Resolve skill file** — locate `skills/using-skills/SKILL.md` relative to the hooks directory.
2. **Read skill content** — read the full `SKILL.md` file.
3. **Write to stdout** — emit the skill content wrapped in `<EXTREMELY_IMPORTANT>` tags so the host injects it as a system-level instruction.
4. **Exit 0** — session proceeds regardless of outcome.

If `SKILL.md` is not found:
1. Write a `<system-reminder>` warning to stdout indicating the skill is missing.
2. Exit 0 — session proceeds without skill bootstrap.

## Configuration

| Parameter | Source | Description |
|---|---|---|
| `project_root` | Runtime (resolved from script location) | Root of the SuperAgent repo |
| `run_id` | Runtime (session context) | Unique identifier for this session run |
| Skill file path | Hardcoded relative: `skills/using-skills/SKILL.md` | Location of the bootstrap skill |

## What Happens on Violation

This hook does not block. It always exits 0. Failure modes:

| Condition | Outcome |
|---|---|
| `SKILL.md` not found | Warning emitted to stdout; session proceeds without skill bootstrap |
| Script parse/runtime error | Error written to stderr; session proceeds |

**Side effects produced:**

| Artifact | Location | Description |
|---|---|---|
| `status.json` | `~/.superagent/projects/<slug>/status.json` | Run-local status file, initialized for this session |
| Skill content | Agent system context | Full `sa:using-skills` skill injected as `<EXTREMELY_IMPORTANT>` |

## Example

**Normal operation:**

```bash
node hooks/session-start
# Stdout:
<EXTREMELY_IMPORTANT>
You have skills.

**Below is the full content of your 'sa:using-skills' skill:**

---
name: sa:using-skills
...
</EXTREMELY_IMPORTANT>
```

**Missing skill file:**

```bash
# After removing skills/using-skills/SKILL.md
node hooks/session-start
# Stdout:
<system-reminder>
WARNING: sa:using-skills skill not found at /path/to/skills/using-skills/SKILL.md
The SuperAgent skill bootstrap is not available. Skills will not be auto-discovered.
Run: check that skills/using-skills/SKILL.md exists.
</system-reminder>
```

## Testing

```bash
# Verify normal operation
node hooks/session-start | head -3
# Expected: <EXTREMELY_IMPORTANT>

# Verify skill content is present
node hooks/session-start | grep "sa:using-skills"
# Expected: name: sa:using-skills

# Verify graceful degradation
mv skills/using-skills/SKILL.md /tmp/SKILL.md.bak
node hooks/session-start | grep "WARNING"
# Expected: WARNING: sa:using-skills skill not found
mv /tmp/SKILL.md.bak skills/using-skills/SKILL.md

# Validate hook definition against schema
node tooling/src/cli.js validate hooks
```

## Host Fallback

| Host | Fallback |
|---|---|
| Claude | `native_hook` |
| Codex | `wrapper_command` |
| Gemini | `wrapper_command` |
| Cursor | `native_or_wrapper` |
