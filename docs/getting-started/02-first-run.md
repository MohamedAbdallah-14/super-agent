# Your First Run

Walk through the full SuperAgent pipeline: describe a task, clarify it, execute with TDD, and review.

## What you'll do

Take a vague requirement through the full pipeline and see what each role produces.

## Prerequisites

- SuperAgent installed (see [Installation](01-installation.md))
- An AI host open in your project (Claude, Codex, Gemini, or Cursor)

## Step 1: Describe your task

Tell your agent what you want to build. For example:

> "Add a user registration endpoint with email validation"

The clarifier role activates and reads your brief.

## Step 2: Clarify

The clarifier asks questions and produces a structured spec with acceptance criteria. It escalates ambiguity — it never assumes.

**Expected output:**
- Acceptance criteria (testable, specific)
- Open questions resolved
- Scope boundaries defined
- Assumptions and non-goals listed

If the clarifier can't resolve ambiguity, it escalates to you rather than guessing.

## Step 3: Spec Challenge (approval gate)

A reviewer (different from the clarifier) adversarially reviews the spec. The reviewer checks for gaps, contradictions, and unstated assumptions.

**Expected output:** Gate decision — APPROVED or REJECTED with specific reasons.

**Your action:** You must explicitly approve the spec before planning begins. If rejected, it loops back to clarify with the reviewer's feedback.

## Step 4: Plan (approval gate)

The planner breaks the approved spec into ordered, testable tasks with dependencies.

The plan-review phase runs adversarial review on the plan — checking for missing edge cases, incorrect ordering, and scope creep.

**Expected output:** Task breakdown with:
- Implementation order and dependencies
- Test strategy per task
- Estimated complexity

**Your action:** You must explicitly approve the plan before execution begins.

## Step 5: Execute

The executor implements each task with TDD:
1. Write a failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while green (REFACTOR)
4. Commit with conventional message

The composition engine loads role-specific expertise modules automatically — the executor gets modules on how to build, anti-patterns to avoid, and stack-specific guidance.

**Expected output:**
- Test files (failing → passing)
- Implementation code
- Conventional commits at each step

## Step 6: Review

The reviewer (never the executor) performs adversarial review against the acceptance criteria from the spec.

**Expected output:** Review artifact with:
- Pass/fail per acceptance criterion
- Findings with severity and evidence
- Recommendation: APPROVE, REQUEST_CHANGES, or REJECT

## Step 7: Learn

The learner captures what worked and what didn't. Proposed learnings go to `memory/learnings/proposed/` and require explicit review before promotion.

Only learnings whose file patterns overlap the current task are loaded in future runs — the system gets smarter per-project without drifting.

**Expected output:** Proposed learnings with scope tags.

## Under the hood

The 6 steps above map to 14 internal phases:

| User Stage | Internal Phases | Roles |
|------------|----------------|-------|
| **Clarify** | clarify → discover → specify → spec-challenge | clarifier, researcher, specifier, reviewer |
| **Execute** | author → design → design-review → plan → plan-review → execute → verify | content-author, designer, planner, executor, verifier |
| **Review** | review | reviewer |
| **Learn** | learn → prepare-next | learner |

## What's next

- [Architecture](../concepts/architecture.md) — understand why SuperAgent works this way
- [Roles & Workflows](../concepts/roles-and-workflows.md) — deep dive into role contracts
- [Composition Engine](../concepts/composition-engine.md) — how expertise modules are loaded
