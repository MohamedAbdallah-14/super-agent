# sa:using-skills

> The skill discovery bootstrap. Fires before any response. Makes every other skill reachable.

| Property | Value |
|---|---|
| **ID** | `sa:using-skills` |
| **Type** | Rigid |
| **Trigger** | Session start — every new conversation |
| **Failure mode** | Silent degradation (skills not discovered) |

## Purpose

`sa:using-skills` establishes the rule that skill invocation must happen **before any response** — including clarifying questions. Without this skill firing at session start, an agent may answer confidently from memory instead of consulting the live, current skill definitions. Skills evolve; memory does not.

This skill is not optional scaffolding. It is the enforcement mechanism that makes all other skills reachable and current.

## When to Invoke

- At the start of every session, automatically via the `session-start` hook.
- Any time there is even a 1% chance another skill applies to the current task.

> [!WARNING]
> These thoughts indicate you are rationalizing your way out of skill invocation:
> - "This is just a simple question" — questions are tasks, check for skills.
> - "I need more context first" — skill check comes BEFORE clarifying questions.
> - "I remember this skill" — skills evolve. Read the current version.
> - "I know what that means" — knowing the concept is not the same as invoking the skill.

## When NOT to Invoke

There is no situation where this skill should be suppressed. It is the meta-skill that governs all others.

## Phases

1. **Session hook fires** — the `hooks/session-start` script runs, reads `skills/using-skills/SKILL.md`, and injects the full content into the agent's system context as `<EXTREMELY_IMPORTANT>`.
2. **Agent receives skill** — the agent now knows the skill invocation rule and the skill priority order.
3. **On every user message** — agent checks: might any skill apply?
4. **Invoke Skill tool** — if yes (even 1%), invoke via the `Skill` tool before any other action.
5. **Announce** — state "Using [skill] to [purpose]".
6. **Follow the loaded skill** — if the invoked skill has a checklist, create a TodoWrite item per item.

## Input

- Session start event (automatic via hook)
- Any user message (manual check)

## Output

- Agent operating with current skill definitions loaded
- Skill invocation announcement before any response

## Example

```
User: "Help me fix this test that's failing"

Agent (internal): Might a skill apply? "fix failing test" -> sa:debugging (100%)
Agent: Invoking sa:debugging skill...
Agent: "Using sa:debugging to diagnose the failing test via observe-hypothesize-test-fix loop."
[Follows sa:debugging exactly from here]
```

Without `sa:using-skills` active, the agent might skip straight to guessing the fix — bypassing the disciplined debugging loop entirely.

## Integration

`sa:using-skills` is the gateway skill. It does not perform work itself — it ensures the right skill is invoked for every piece of work:

| Situation | Skill invoked via sa:using-skills |
|---|---|
| About to enter plan mode | `sa:brainstorming` (if not yet brainstormed) |
| Implementation task | `sa:tdd` |
| Bug / unexpected behavior | `sa:debugging` |
| Claiming work is done | `sa:verification` |
| End of session | `prepare-next` |

## Skill Priority Order

1. Process skills (`sa:brainstorming`, `sa:debugging`) — determine HOW to approach.
2. Implementation skills (`sa:tdd`, `sa:design`) — guide execution.

## Testing

Verify the hook fires correctly:

```bash
node hooks/session-start
# Should print: <EXTREMELY_IMPORTANT>You have skills...
```

If `skills/using-skills/SKILL.md` is missing, the script emits a WARNING and exits 0 — the session proceeds without skill bootstrap.
