# Anthropic Best Practices for Skill Authoring

Reference guide for writing effective skills. These principles come from Anthropic's official guidance on custom instructions and skill files.

## Core Principles

### 1. Concise is Key -- Context Window is a Public Good

Every token in a skill competes with the user's actual task for context window space. Treat context like a shared resource:

- Cut ruthlessly. If a sentence doesn't change agent behavior, remove it.
- Prefer tables and lists over prose paragraphs.
- One clear statement beats three hedged ones.
- If the skill is over 200 lines, ask whether every section earns its tokens.

### 2. Default Assumption: The Agent is Already Very Smart

Do not explain things the agent already knows. Skills should add knowledge the agent lacks, not reiterate common programming practices.

- Skip "what is TDD" -- explain YOUR TDD requirements.
- Skip "why testing matters" -- specify WHICH tests to run and WHEN.
- Focus on project-specific decisions, not general wisdom.

### 3. Set Appropriate Degrees of Freedom

Match the specificity of your instructions to the fragility of the task:

| Degree | When to Use | Example |
|--------|-------------|---------|
| **Low (rigid)** | Exact output format matters, safety-critical steps, commit message conventions | "Run `npm test` before every commit" |
| **Medium** | General approach matters but details are flexible | "Write tests before implementation" |
| **High (flexible)** | Creative tasks, exploratory work, agent judgment is valuable | "Improve the error messages" |

Wrong degree of freedom is the most common skill authoring mistake. Too rigid on creative tasks kills quality. Too flexible on critical steps invites shortcuts.

## SKILL.md Format

```yaml
---
name: skill-name          # 64 chars max, lowercase-kebab-case
description: When to use  # 1024 chars max -- this is the discovery mechanism
---
```

**The description field is the most important line in the file.** Agents use it to decide whether to invoke the skill. A vague description means the skill is never used. An overly broad description means it fires when it shouldn't.

Good descriptions:
- "Use when creating new skills, editing existing skills, or verifying skills work before deployment"
- "Use for implementation work that changes behavior. Follow RED -> GREEN -> REFACTOR with evidence at each step."

Bad descriptions:
- "A skill for development" (too vague -- when exactly?)
- "Use always" (no discrimination)

## Authoring Rules

### Only Add Context the Agent Doesn't Already Have

Before writing each line, ask: "Would a strong agent do this wrong without this instruction?" If the answer is no, cut the line.

### Challenge Each Piece for Token Cost

Every instruction has a cost (tokens consumed) and a benefit (behavior changed). Instructions that don't change behavior are pure cost:

- **Keep:** "STOP. Run tests. Read output. Do not proceed until green." (changes behavior)
- **Cut:** "Testing is an important part of software development." (agent already knows this)

### Use Code Blocks for Precise Operations

When exact commands or formats matter, use code blocks. Text instructions are interpreted; code blocks are followed literally.

```bash
# Precise -- agent will run this exact command
git diff --stat HEAD~1

# Imprecise -- agent will improvise
"Check what changed in the last commit"
```

### Use Text Instructions for Flexible Guidance

When the agent needs judgment, write in natural language. Code blocks for judgment calls create brittle, over-fitted behavior.

### Match Specificity to Task Fragility

High-stakes steps (verification, commit, deploy) need rigid instructions. Low-stakes steps (naming, comments, code organization) need flexible guidance.

## Testing Skills

Writing a skill is not enough. You must verify it works:

1. **Test with real usage** -- set up scenarios where the skill would be needed.
2. **Check discovery** -- does the agent find and invoke the skill at the right time?
3. **Verify compliance** -- does the agent follow the skill's instructions?
4. **Test edge cases** -- what happens at the boundaries?
5. **Test pressure** -- does the skill hold up when the agent is under time pressure or facing complexity?

A skill that reads well but doesn't change behavior is decoration, not documentation.

## Structure Guidelines

### Prefer Flat Over Nested

Deeply nested headers (h4, h5) signal a skill that's trying to do too much. Split into multiple skills or flatten the hierarchy.

### Put the Most Important Rule First

Agents weight early content more heavily. Lead with the behavior you most need to change.

### Use Tables for Decision Logic

Tables are denser than if/else prose and easier for agents to parse:

| Situation | Action |
|-----------|--------|
| Tests fail | Fix before proceeding |
| Tests pass | Continue to next step |
| Tests flaky | Investigate root cause |

### End with a Quick Reference

For longer skills, a condensed summary at the bottom helps agents that loaded the skill but need a fast reminder.
