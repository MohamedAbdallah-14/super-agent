# Superpowers Project: Comprehensive Analysis

**Analyzed:** 2026-03-14
**Repository:** https://github.com/obra/superpowers
**Version:** 5.0.2
**Author:** Jesse Vincent (jesse@fsck.com)
**License:** MIT
**Stars:** ~82.5k | **Forks:** ~6.4k | **Commits:** 355

---

## Table of Contents

1. [What It Is](#1-what-it-is)
2. [Architecture & Core Concepts](#2-architecture--core-concepts)
3. [Complete Skills Inventory](#3-complete-skills-inventory)
4. [How Skills Work](#4-how-skills-work)
5. [Skill Format & Schema](#5-skill-format--schema)
6. [Hook System](#6-hook-system)
7. [Plugin System & Platform Adapters](#7-plugin-system--platform-adapters)
8. [Agents](#8-agents)
9. [Commands (Deprecated)](#9-commands-deprecated)
10. [Testing Infrastructure](#10-testing-infrastructure)
11. [Project Structure](#11-project-structure)
12. [Key Design Decisions & Philosophy](#12-key-design-decisions--philosophy)
13. [Comparison with SuperAgent](#13-comparison-with-superagent)

---

## 1. What It Is

Superpowers is self-described as **"an agentic skills framework & software development methodology that works."** It is a complete software development workflow for coding agents, built on composable "skills" and initial instructions that ensure agents use them.

### Core Value Proposition

When an agent starts a session with Superpowers installed, it does NOT jump into writing code. Instead:

1. It steps back and asks the user what they are trying to do (brainstorming)
2. It teases out a spec through collaborative dialogue
3. It presents the spec in digestible chunks for approval
4. It creates a detailed implementation plan (written for "an enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing")
5. It launches subagent-driven development, dispatching agents to work through each task, inspecting and reviewing their work
6. The agent can work autonomously for hours without deviating from the plan

### What Makes It Different

- **Skills trigger automatically** -- users do not need to do anything special
- **Multi-platform** -- works with Claude Code, Cursor, Codex, OpenCode, and Gemini CLI
- **Methodology, not just tooling** -- encodes specific software engineering practices (TDD, YAGNI, DRY) as enforceable behavioral constraints
- **Subagent architecture** -- uses fresh subagents per task to prevent context pollution

---

## 2. Architecture & Core Concepts

### Conceptual Model

Superpowers operates as a **behavioral layer** injected into coding agents at session start. It consists of:

1. **Skills** -- Markdown documents that define processes, rules, and behavioral constraints
2. **A bootstrap mechanism** -- The `using-superpowers` skill is injected at session start via a hook, teaching the agent HOW to discover and use other skills
3. **Instruction priority hierarchy**:
   - User's explicit instructions (CLAUDE.md, GEMINI.md, AGENTS.md) -- highest priority
   - Superpowers skills -- override default system behavior
   - Default system prompt -- lowest priority

### Workflow Pipeline

```
Brainstorming --> Spec Document --> Writing Plans --> Executing Plans / Subagent-Driven Development --> Finishing Branch
```

The full workflow is:

1. **Brainstorming** -- Socratic dialogue to refine ideas into designs
2. **Spec writing** -- Design document saved to `docs/superpowers/specs/`
3. **Spec review loop** -- Automated subagent reviews spec for completeness (max 5 iterations)
4. **User review gate** -- Human approves spec before proceeding
5. **Writing plans** -- Detailed task-by-task implementation plan
6. **Executing plans** -- Either sequential (executing-plans) or parallel (subagent-driven-development)
7. **Two-stage review** -- Per-task: spec compliance review, then code quality review
8. **Finishing branch** -- Merge, PR, keep, or discard

### Key Architectural Principle: Context Isolation

Superpowers is deeply invested in context isolation. Subagents never inherit the parent session's history. Instead, the orchestrator "precisely crafts" the subagent's instructions and context. This:
- Keeps subagents focused on their specific task
- Prevents context pollution from accumulating over long sessions
- Preserves the orchestrator's context for coordination work

---

## 3. Complete Skills Inventory

### 3.1 Testing Skills

#### test-driven-development
- **File:** `skills/test-driven-development/SKILL.md`
- **Supporting files:** `testing-anti-patterns.md`
- **Description:** Enforces strict RED-GREEN-REFACTOR TDD cycle
- **Iron Law:** "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"
- **Key rules:**
  - Write code before test? Delete it. Start over. No exceptions.
  - Every test must be watched to fail before implementing
  - Minimal code to pass the test -- nothing more
  - Covers: new features, bug fixes, refactoring, behavior changes
  - Exceptions (must ask human): throwaway prototypes, generated code, config files
- **Anti-patterns reference** covers: testing mock behavior, test-only methods in production, mocking without understanding dependencies

### 3.2 Debugging Skills

#### systematic-debugging
- **File:** `skills/systematic-debugging/SKILL.md`
- **Supporting files:** `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`, `condition-based-waiting-example.ts`, `find-polluter.sh`, `CREATION-LOG.md`
- **Description:** 4-phase root cause debugging process
- **Iron Law:** "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"
- **Four Phases:**
  1. Root Cause Investigation (read errors, reproduce, check recent changes, gather evidence, trace data flow)
  2. Hypothesis Formation
  3. Targeted Fix
  4. Verification (regression test, broader testing)
- **Sub-techniques:**
  - **root-cause-tracing** -- Trace bugs backward through call stack
  - **defense-in-depth** -- Add validation at multiple layers after finding root cause
  - **condition-based-waiting** -- Replace arbitrary timeouts with condition polling
  - **find-polluter.sh** -- Script to find test pollution in suites

#### verification-before-completion
- **File:** `skills/verification-before-completion/SKILL.md`
- **Description:** Prevents claiming work is done without proof
- **Iron Law:** "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE"
- **Gate function:** Identify -> Run -> Read -> Verify -> Claim
- **Key patterns:**
  - Tests: Run command, see "34/34 pass", THEN claim "all tests pass"
  - Regression tests: Write -> Run (pass) -> Revert fix -> Run (MUST FAIL) -> Restore -> Run (pass)
  - Forbidden phrases: "should work now", "looks correct", "I'm confident"
  - Rationalization prevention table maps excuses to required actions

### 3.3 Collaboration Skills

#### brainstorming
- **File:** `skills/brainstorming/SKILL.md`
- **Supporting files:** `spec-document-reviewer-prompt.md`, `visual-companion.md`, `scripts/` directory
- **Description:** Socratic design refinement process
- **Key features:**
  - Anti-pattern: "This Is Too Simple To Need A Design" -- EVERY project goes through the process
  - 9-step checklist: explore context -> offer visual companion -> clarify -> propose 2-3 approaches -> present design -> write design doc -> spec review loop -> user reviews spec -> transition to implementation
  - **Visual Companion:** Browser-based companion for showing mockups/diagrams (optional, consent-required)
  - **Spec review loop:** Dispatches spec-document-reviewer subagent; max 5 iterations before surfacing to human
  - **User review gate:** User must approve written spec before proceeding
  - Terminal state: invoking writing-plans skill (no other implementation skill)

#### writing-plans
- **File:** `skills/writing-plans/SKILL.md`
- **Description:** Creates detailed implementation plans for agentic workers
- **Key features:**
  - Plans assume the engineer has zero codebase context and questionable taste
  - Bite-sized task granularity (2-5 minutes per step)
  - Required plan header with Goal, Architecture, Tech Stack
  - File structure mapping before task decomposition
  - Each step is ONE action: "Write failing test" / "Run it" / "Implement minimal code" / "Run tests" / "Commit"
  - Plans saved to `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`
  - Emphasizes YAGNI, DRY, TDD

#### executing-plans
- **File:** `skills/executing-plans/SKILL.md`
- **Description:** Sequential plan execution with review checkpoints
- **Process:** Load plan -> Review critically -> Execute tasks -> Complete development
- **Note:** Recommends using subagent-driven-development instead if subagents are available
- **Integration:** Requires using-git-worktrees (before) and finishing-a-development-branch (after)

#### dispatching-parallel-agents
- **File:** `skills/dispatching-parallel-agents/SKILL.md`
- **Description:** Concurrent subagent workflows for independent tasks
- **When to use:** 3+ test files failing with different root causes, multiple independent subsystems broken
- **Pattern:** Identify independent domains -> Create focused tasks -> Dispatch in parallel -> Review and integrate
- **Agent prompt structure:** Focused, self-contained, scoped, constraint-aware

#### requesting-code-review
- **File:** `skills/requesting-code-review/SKILL.md`
- **Supporting files:** `code-reviewer.md` (template)
- **Description:** Pre-review checklist for dispatching code review subagent
- **When mandatory:** After each task in SDD, after major feature, before merge to main
- **Process:** Get git SHAs -> Dispatch code-reviewer subagent with template -> Act on feedback
- **Template placeholders:** `{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`

#### receiving-code-review
- **File:** `skills/receiving-code-review/SKILL.md`
- **Description:** How to respond to code review feedback with technical rigor
- **Key rules:**
  - Forbidden responses: "You're absolutely right!", "Great point!", "Let me implement that now" (before verification)
  - Required: Restate technical requirement, ask clarifying questions, push back if wrong
  - YAGNI check: If reviewer suggests "implementing properly", grep codebase for actual usage first
  - Implementation order: Clarify unclear items FIRST, then blocking issues, then improvements

#### using-git-worktrees
- **File:** `skills/using-git-worktrees/SKILL.md`
- **Description:** Creates isolated workspaces for feature work
- **Directory priority:** `.worktrees` (hidden) > `worktrees` > CLAUDE.md preference > ask user
- **Safety:** MUST verify directory is in .gitignore before creating
- **Auto-detects:** npm/cargo/pip/poetry/go and runs appropriate setup
- **Cleanup patterns:** Prune worktrees, remove stale branches

#### finishing-a-development-branch
- **File:** `skills/finishing-a-development-branch/SKILL.md`
- **Description:** Structured completion of development work
- **Process:** Verify tests pass -> Present 4 options (merge locally, create PR, keep as-is, discard) -> Execute choice -> Cleanup worktree
- **Always verifies tests before offering options**

#### subagent-driven-development
- **File:** `skills/subagent-driven-development/SKILL.md`
- **Supporting files:** `implementer-prompt.md`, `spec-reviewer-prompt.md`, `code-quality-reviewer-prompt.md`
- **Description:** The flagship execution skill. Fresh subagent per task with two-stage review.
- **Process per task:**
  1. Dispatch implementer subagent (using implementer-prompt.md template)
  2. Implementer implements, tests, commits, self-reviews
  3. Dispatch spec reviewer subagent (spec-reviewer-prompt.md)
  4. If spec issues: implementer fixes; re-review
  5. Dispatch code quality reviewer subagent (code-quality-reviewer-prompt.md)
  6. If quality issues: implementer fixes; re-review
  7. Mark task complete
- **Key principle:** Subagents never inherit session context -- orchestrator constructs exactly what they need
- **Implementer prompt features:**
  - Full task text pasted in prompt (subagent should NOT need to read the plan file)
  - Encouraged to ask questions before starting
  - "It is always OK to stop and say 'this is too hard for me'"
  - Self-review checklist before reporting back
  - Status options: DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT
- **Spec reviewer:** Explicitly told NOT to trust the implementer's report -- must read actual code
- **Code quality reviewer:** Uses code-reviewer.md template, checks for file responsibility, decomposition, plan adherence

### 3.4 Meta Skills

#### writing-skills
- **File:** `skills/writing-skills/SKILL.md`
- **Supporting files:** `anthropic-best-practices.md`, `graphviz-conventions.dot`, `persuasion-principles.md`, `render-graphs.js`, `testing-skills-with-subagents.md`, `examples/` directory
- **Description:** How to create new skills following TDD methodology
- **Key concepts:**
  - Skill creation IS TDD applied to process documentation
  - RED: Run pressure scenario without skill, document what agent does wrong
  - GREEN: Write minimal skill that fixes observed violations
  - REFACTOR: Find new rationalizations, plug loopholes, re-verify
  - Pressure types: time, sunk cost, authority, exhaustion
  - Skill types: Technique, Pattern, Reference
  - Personal skills location: `~/.claude/skills` (Claude Code), `~/.agents/skills/` (Codex)

#### using-superpowers
- **File:** `skills/using-superpowers/SKILL.md`
- **Description:** The bootstrap skill -- loaded at session start, teaches agent how to find and use all other skills
- **The Rule:** "Invoke relevant or requested skills BEFORE any response or action. Even a 1% chance a skill might apply means that you should invoke the skill."
- **Skill invocation:** Use the `Skill` tool in Claude Code; `activate_skill` in Gemini CLI
- **Announcement pattern:** When using a skill, say "Using [skill] to [purpose]"
- **Checklist integration:** If a skill has a checklist, create TodoWrite items per step

---

## 4. How Skills Work

### Loading Mechanism

1. **Session Start:** The `SessionStart` hook fires, executing `hooks/session-start`
2. **Bootstrap Injection:** The session-start script reads `skills/using-superpowers/SKILL.md` and injects its FULL content as `additionalContext` in the hook response
3. **Agent receives instructions:** The agent now knows it has superpowers and how to invoke other skills
4. **On-demand loading:** For ALL other skills, the agent uses the `Skill` tool to load them. Skills are NOT pre-loaded -- only their metadata (name + description) is available at startup
5. **Skill activation:** When the Skill tool is invoked, the skill's `SKILL.md` content is loaded and presented to the agent

### Discovery

- The agent checks if a skill might apply (even 1% chance) before every response
- If a skill applies, the agent MUST invoke it -- "This is not negotiable. This is not optional."
- Skills can reference other skills: `**REQUIRED SUB-SKILL:** Use superpowers:test-driven-development`
- Never use `@` syntax to reference skills (force-loads, burns context)

### Naming Convention

- Skills use `superpowers:<skill-name>` namespace
- Skill names use kebab-case: `test-driven-development`, `using-git-worktrees`
- Gerund form preferred: `brainstorming`, `writing-plans`, `executing-plans`
- Names should be action-oriented and descriptive

### Execution Flow

```
User message received
  --> Does a skill apply? (even 1% chance)
      --> YES: Invoke Skill tool
          --> Announce: "Using [skill] to [purpose]"
          --> Has checklist? Create TodoWrite items
          --> Follow skill exactly
      --> NO: Respond normally
```

---

## 5. Skill Format & Schema

### Directory Structure

```
skills/
  <skill-name>/
    SKILL.md                    # Main reference (REQUIRED)
    supporting-file.md          # Optional: heavy reference, templates
    supporting-script.js        # Optional: reusable tools
    examples/                   # Optional: example files
```

- Flat namespace -- all skills at same level
- One directory per skill
- `SKILL.md` is the only required file

### SKILL.md Frontmatter

```yaml
---
name: <skill-name>          # 64 characters max
description: <description>  # 1024 characters max - when to use this skill
---
```

Only two fields: `name` and `description`. The description is critical because it controls when the agent decides to invoke the skill -- it is the discovery mechanism.

### SKILL.md Body

No rigid schema for the body, but conventions observed across all skills:

1. **Overview section** with core principle and Iron Law (for behavioral skills)
2. **When to Use** section with clear triggers
3. **The Iron Law** -- an absolute, non-negotiable rule (e.g., "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST")
4. **Process/Steps** -- the main procedure
5. **Common Failures / Red Flags** -- what can go wrong
6. **Rationalization Prevention** -- tables mapping excuses to correct actions
7. **Integration** -- references to related/required skills
8. **Graphviz flowcharts** (dot notation) for decision points

### Persuasion Patterns Used in Skills

Skills are written to be behaviorally compelling to LLMs. They employ:
- **Iron Laws** -- absolute statements that cannot be rationalized around
- **Gate Functions** -- conditional checks that MUST pass before proceeding
- **Rationalization Prevention Tables** -- pre-empt common excuses
- **Explicit anti-patterns** -- "NEVER do X" with concrete examples
- **Spirit over letter** -- "Different words so rule doesn't apply" mapped to "Spirit over letter"
- **Pressure scenario testing** -- skills are tested with subagents under pressure to find loopholes

---

## 6. Hook System

### hooks.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ]
  }
}
```

### Hook Details

- **Only one hook:** `SessionStart` (fires on startup, resume, clear, compact)
- **Synchronous:** `async: false` -- blocks until complete
- **Uses `CLAUDE_PLUGIN_ROOT`** environment variable set by the host platform
- **Cross-platform:** `run-hook.cmd` is a polyglot (CMD on Windows, bash on Unix)

### session-start Script

The session-start hook does the following:

1. Determines plugin root directory
2. Checks for legacy skills directory (`~/.config/superpowers/skills`) and builds a warning if found
3. Reads the full content of `skills/using-superpowers/SKILL.md`
4. Escapes the content for JSON embedding
5. Outputs JSON with the skill content as `additionalContext`

**Platform-specific output:**
- **Claude Code** (detects `CLAUDE_PLUGIN_ROOT`): Emits `hookSpecificOutput.additionalContext`
- **Cursor/Other platforms:** Emits `additional_context` at top level
- Both paths never emit simultaneously to avoid double injection

### run-hook.cmd

A polyglot script that:
- On Windows: Tries Git for Windows bash, then PATH bash, then exits silently
- On Unix: Directly executes the named bash script

---

## 7. Plugin System & Platform Adapters

### Claude Code Plugin

**Directory:** `.claude-plugin/`
- `plugin.json` -- Plugin metadata (name, version, description, author, license, keywords)
- `marketplace.json` -- Dev marketplace registration

**Installation:**
```bash
# Official marketplace
/plugin install superpowers@claude-plugins-official

# Dev marketplace
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### Cursor Plugin

**Directory:** `.cursor-plugin/`
- `plugin.json` -- Cursor-specific plugin metadata

**Installation:**
```text
/add-plugin superpowers
```

### Codex

**Directory:** `.codex/`
- `INSTALL.md` -- Installation instructions

**Installation:** Clone repo, symlink `skills/` to `~/.agents/skills/superpowers`
```bash
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.agents/skills
ln -s ~/.codex/superpowers/skills ~/.agents/skills/superpowers
```

### OpenCode

**Directory:** `.opencode/`
- `INSTALL.md` -- Installation instructions
- `plugins/` -- Plugin configuration

### Gemini CLI

```bash
gemini extensions install https://github.com/obra/superpowers
gemini extensions update superpowers
```

### Platform Adaptation

Skills use Claude Code tool names. For non-CC platforms:
- Codex: See `references/codex-tools.md` for tool equivalents
- Gemini CLI: Tool mapping loaded automatically via `GEMINI.md`
- Skills designed to be platform-agnostic in content, platform-specific in tool invocation

---

## 8. Agents

**Directory:** `agents/`

### code-reviewer (only agent)

- **File:** `agents/code-reviewer.md`
- **Frontmatter fields:** `name`, `description` (with detailed usage examples), `model: inherit`
- **Role:** Senior Code Reviewer -- reviews completed project steps against original plans
- **Capabilities:**
  1. Plan Alignment Analysis
  2. Code Quality Assessment
  3. Architecture and Design Review
  4. Documentation and Standards
  5. Issue Identification (Critical / Important / Suggestions)
- **Issue categorization:** Critical (must fix), Important (should fix), Suggestions (nice to have)
- **Output format:** Structured review with strengths, issues by severity, recommendations, summary

### Agent Frontmatter Schema

```yaml
---
name: <agent-name>
description: |
  <detailed description with usage examples showing Context/user/assistant patterns>
model: inherit  # or specific model name
---
```

The `description` field uses rich example patterns to help the agent understand WHEN to dispatch this agent type.

---

## 9. Commands (Deprecated)

**Directory:** `commands/`

All three commands are deprecated stubs pointing to their skill equivalents:

| Command | Replacement Skill |
|---------|-------------------|
| `brainstorm.md` | `superpowers:brainstorming` |
| `execute-plan.md` | `superpowers:executing-plans` |
| `write-plan.md` | `superpowers:writing-plans` |

Each contains frontmatter with `description: "Deprecated - use the superpowers:<skill> skill instead"` and a message to tell the user about the deprecation.

---

## 10. Testing Infrastructure

### Test Structure

```
tests/
  brainstorm-server/        # Server tests for visual companion
    package.json
    package-lock.json
    server.test.js
    ws-protocol.test.js
  claude-code/              # Integration tests for Claude Code
    test-helpers.sh
    test-subagent-driven-development-integration.sh
    analyze-token-usage.py
  explicit-skill-requests/  # Tests for explicit skill invocation
  opencode/                 # OpenCode-specific tests
  skill-triggering/         # Tests for skill trigger conditions
  subagent-driven-dev/      # SDD-specific tests
```

### Integration Testing Approach

Tests execute **real Claude Code sessions** in headless mode and verify behavior through session transcripts:

1. **Setup:** Creates temporary project with minimal implementation plan
2. **Execution:** Runs Claude Code headless with the skill
3. **Verification:** Parses `.jsonl` session transcripts to verify:
   - Skill tool was invoked
   - Subagents were dispatched (Task tool)
   - TodoWrite was used for tracking
   - Implementation files were created
   - Tests pass
   - Git commits show proper workflow
4. **Token Analysis:** Shows token usage breakdown by subagent

**Requirements:**
- Must run from the superpowers plugin directory
- Claude Code must be installed as `claude` command
- Local dev marketplace enabled in `~/.claude/settings.json`
- Tests can take 10-30 minutes (real agent execution)

### Skill Testing Methodology (from writing-skills)

Skills themselves are tested using a TDD-adapted approach:
1. **RED:** Run pressure scenario with subagent WITHOUT the skill
2. **GREEN:** Add skill and verify agent complies
3. **REFACTOR:** Find new rationalizations, plug loopholes

Pressure types used: time pressure, sunk cost fallacy, authority pressure, exhaustion simulation.

---

## 11. Project Structure

```
superpowers/
  .claude-plugin/
    plugin.json                 # Plugin metadata (v5.0.2)
    marketplace.json            # Dev marketplace config
  .codex/
    INSTALL.md                  # Codex installation guide
  .cursor-plugin/
    plugin.json                 # Cursor plugin metadata
  .github/                     # GitHub configuration
  .opencode/
    INSTALL.md
    plugins/                   # OpenCode plugin config
  agents/
    code-reviewer.md           # The only agent definition
  commands/
    brainstorm.md              # DEPRECATED -> brainstorming skill
    execute-plan.md            # DEPRECATED -> executing-plans skill
    write-plan.md              # DEPRECATED -> writing-plans skill
  docs/
    plans/                     # Project plans
    superpowers/               # Superpowers-specific docs
    windows/                   # Windows-specific docs
    README.codex.md            # Codex documentation
    README.opencode.md         # OpenCode documentation
    testing.md                 # Testing documentation
  hooks/
    hooks.json                 # Hook definitions (SessionStart only)
    run-hook.cmd               # Cross-platform hook runner (polyglot)
    session-start              # Bootstrap script -- injects using-superpowers
  skills/
    brainstorming/
      SKILL.md
      spec-document-reviewer-prompt.md
      visual-companion.md
      scripts/
    dispatching-parallel-agents/
      SKILL.md
    executing-plans/
      SKILL.md
    finishing-a-development-branch/
      SKILL.md
    receiving-code-review/
      SKILL.md
    requesting-code-review/
      SKILL.md
      code-reviewer.md         # Review dispatch template
    subagent-driven-development/
      SKILL.md
      implementer-prompt.md
      spec-reviewer-prompt.md
      code-quality-reviewer-prompt.md
    systematic-debugging/
      SKILL.md
      CREATION-LOG.md
      condition-based-waiting.md
      condition-based-waiting-example.ts
      defense-in-depth.md
      find-polluter.sh
      root-cause-tracing.md
    test-driven-development/
      SKILL.md
      testing-anti-patterns.md
    using-git-worktrees/
      SKILL.md
    using-superpowers/
      SKILL.md
    verification-before-completion/
      SKILL.md
    writing-skills/
      SKILL.md
      anthropic-best-practices.md
      graphviz-conventions.dot
      persuasion-principles.md
      render-graphs.js
      testing-skills-with-subagents.md
      examples/
  tests/
    brainstorm-server/
    claude-code/
    explicit-skill-requests/
    opencode/
    skill-triggering/
    subagent-driven-dev/
  .gitattributes
  LICENSE
  README.md
```

---

## 12. Key Design Decisions & Philosophy

### 1. Skills as Behavioral Constraints, Not Just Documentation

Skills are not passive reference docs. They are designed to **constrain and direct agent behavior**. They use:
- Iron Laws (absolute rules)
- Gate Functions (mandatory checks)
- Rationalization Prevention (pre-empting excuses)
- TDD-tested with pressure scenarios

### 2. Flat Skill Namespace

All skills live at `skills/<name>/SKILL.md`. No nested categories, no hierarchy. This makes discovery simple -- the agent just needs to know skill names.

### 3. Bootstrap via Hook, Discover via Tool

Only `using-superpowers` is injected at session start. All other skills are loaded on-demand via the `Skill` tool. This conserves context window space -- a critical resource.

### 4. Subagent Context Isolation

Subagents NEVER inherit session history. The orchestrator constructs precisely what each subagent needs. This prevents context pollution and keeps subagents focused.

### 5. Two-Stage Review Pipeline

Every task goes through spec compliance review (did you build what was asked?) before code quality review (did you build it well?). This separation catches different types of issues.

### 6. Plans Written for "Bad" Engineers

Plans are intentionally written as if the executor has "poor taste, no judgement, no project context, and an aversion to testing." This over-specification prevents agentic drift.

### 7. Methodology Enforcement Over Convention

Superpowers doesn't suggest TDD -- it demands it with Iron Laws, explicit deletion of pre-test code, and rationalization prevention tables.

### 8. Cross-Platform Portability

The skill content is platform-agnostic markdown. Platform-specific concerns are isolated to:
- Hook output format (Claude Code vs Cursor)
- Tool name mapping (Skill tool vs activate_skill)
- Installation mechanism (plugin marketplace vs symlinks)

---

## 13. Comparison with SuperAgent

### Conceptual Overlaps

| Concept | Superpowers | SuperAgent |
|---------|-------------|------------|
| Role-based behavior | Skills (flat namespace, auto-triggered) | Roles (hierarchical, phase-routed) |
| Workflow pipeline | Brainstorm -> Plan -> Execute -> Review | Phases 0-9 with role routing |
| Plan execution | executing-plans / SDD skills | Phase entrypoints in workflows/ |
| Code review | code-reviewer agent + templates | Not yet formalized |
| TDD enforcement | Dedicated skill with Iron Laws | CLAUDE.md rule |
| Context injection | SessionStart hook with bootstrap skill | CLAUDE.md + role definitions |
| Platform support | Claude Code, Cursor, Codex, OpenCode, Gemini | Claude Code (primary) |
| Skill/role format | Markdown with YAML frontmatter (name, description) | Markdown roles in roles/ |
| Subagent architecture | Fresh subagents with crafted context | Not yet formalized |
| Hooks | SessionStart only (via hooks.json) | Hook definitions in hooks/ |

### What SuperAgent Could Absorb

1. **Skill testing methodology** -- TDD approach to testing behavioral documents (RED-GREEN-REFACTOR with pressure scenarios)
2. **Subagent prompt templates** -- The implementer, spec-reviewer, and code-quality-reviewer prompt patterns
3. **Two-stage review pipeline** -- Spec compliance then code quality
4. **Rationalization prevention patterns** -- Iron Laws, Gate Functions, excuse-mapping tables
5. **Verification-before-completion** as a universal gate
6. **Visual companion** concept for brainstorming

### What SuperAgent Already Does Better

1. **Phase-based architecture** with explicit routing vs flat skill namespace
2. **Role specialization** -- 10 canonical roles vs single flat skill set
3. **Structured task definitions** with schemas
4. **Tooling layer** with CLI, capture system, adapters
5. **Multi-project state management** via `~/.superagent/projects/`

### Key Differences in Approach

- **Superpowers is monolithic:** One plugin, all skills loaded into one agent session
- **SuperAgent is distributed:** Roles are separate agents with distinct contexts and responsibilities
- **Superpowers enforces methodology:** TDD, YAGNI, DRY as Iron Laws
- **SuperAgent enforces structure:** Phase contracts, role boundaries, task schemas
- **Superpowers uses `Skill` tool:** On-demand loading from flat namespace
- **SuperAgent uses role files:** Pre-loaded into agent context per phase

---

## Sources

- [GitHub Repository](https://github.com/obra/superpowers) -- Main repo, project structure, README
- [plugin.json](https://raw.githubusercontent.com/obra/superpowers/main/.claude-plugin/plugin.json) -- Version 5.0.2, metadata
- [hooks.json](https://raw.githubusercontent.com/obra/superpowers/main/hooks/hooks.json) -- SessionStart hook definition
- [session-start](https://raw.githubusercontent.com/obra/superpowers/main/hooks/session-start) -- Bootstrap mechanism
- [using-superpowers SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/using-superpowers/SKILL.md) -- Bootstrap skill
- [test-driven-development SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/test-driven-development/SKILL.md) -- TDD skill
- [systematic-debugging SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/systematic-debugging/SKILL.md) -- Debugging skill
- [verification-before-completion SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/verification-before-completion/SKILL.md) -- Verification gate skill
- [brainstorming SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/brainstorming/SKILL.md) -- Brainstorming/design skill
- [writing-plans SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/writing-plans/SKILL.md) -- Plan creation skill
- [executing-plans SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/executing-plans/SKILL.md) -- Plan execution skill
- [subagent-driven-development SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/subagent-driven-development/SKILL.md) -- SDD skill
- [dispatching-parallel-agents SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/dispatching-parallel-agents/SKILL.md) -- Parallel dispatch skill
- [requesting-code-review SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/requesting-code-review/SKILL.md) -- Review request skill
- [receiving-code-review SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/receiving-code-review/SKILL.md) -- Review reception skill
- [using-git-worktrees SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/using-git-worktrees/SKILL.md) -- Worktree skill
- [finishing-a-development-branch SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/finishing-a-development-branch/SKILL.md) -- Branch completion skill
- [writing-skills SKILL.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/writing-skills/SKILL.md) -- Meta skill for creating skills
- [anthropic-best-practices.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/writing-skills/anthropic-best-practices.md) -- Official skill authoring guide
- [testing-anti-patterns.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/test-driven-development/testing-anti-patterns.md) -- TDD anti-patterns reference
- [code-reviewer.md agent](https://raw.githubusercontent.com/obra/superpowers/main/agents/code-reviewer.md) -- Code reviewer agent definition
- [implementer-prompt.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/subagent-driven-development/implementer-prompt.md) -- Implementer subagent template
- [spec-reviewer-prompt.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/subagent-driven-development/spec-reviewer-prompt.md) -- Spec reviewer template
- [code-quality-reviewer-prompt.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/subagent-driven-development/code-quality-reviewer-prompt.md) -- Code quality reviewer template
- [spec-document-reviewer-prompt.md](https://raw.githubusercontent.com/obra/superpowers/main/skills/brainstorming/spec-document-reviewer-prompt.md) -- Spec document reviewer template
- [code-reviewer template](https://raw.githubusercontent.com/obra/superpowers/main/skills/requesting-code-review/code-reviewer.md) -- Code review dispatch template
- [docs/testing.md](https://raw.githubusercontent.com/obra/superpowers/main/docs/testing.md) -- Testing infrastructure documentation
- [.codex/INSTALL.md](https://raw.githubusercontent.com/obra/superpowers/main/.codex/INSTALL.md) -- Codex installation guide
