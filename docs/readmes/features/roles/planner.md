# Planner

![Role](https://img.shields.io/badge/role-planner-blue) ![Phase](https://img.shields.io/badge/phase-8%20%E2%80%94%20planning-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**No surprises during execution. The planner turns an approved spec into a task list so complete that the executor never has to guess.**

---

## What is this?

The planner converts the approved spec (and optional design artifacts) into an implementation plan — an ordered, dependency-aware, verification-per-section task list that the executor can follow without ambiguity.

A good implementation plan eliminates the most damaging pattern in AI-assisted engineering: the executor who goes off-piste because the plan had gaps. The planner's job is to close every gap in advance. If a step requires an invention that was not in the spec, that is an escalation, not an assumption.

---

## Key Capabilities

- Reads the approved spec, research artifacts, and current repo state to ground the plan in reality
- Produces an ordered task list with explicit dependencies (no hidden coupling)
- Assigns verification criteria per task section — not just at the end
- Inspects the live codebase to avoid planning work that has already been done or that conflicts with existing structure
- Specifies target branch per task (feature/codex from develop, hotfix from main)
- Includes `commit_message` in task frontmatter using conventional commit format
- Escalates when dependencies, sequencing, or feasibility require guessing

---

## How It Fits in the Pipeline

The planner is **Phase 8**. It runs after spec-challenge, author, and design-review approval (author and design phases are optional).

```
[approved spec artifact]
[research artifacts]
[design artifacts — optional]
[current repo state]
            │
            ▼
       [planner]
            │
            ├──► implementation plan artifact
            ├──► ordered task list (with dependencies)
            └──► verification plan per section
            │
            ▼
  [plan-review]  ──► reviewer validates plan against spec
            │
            ▼
       [executor]
```

**Triggered by:** `plan` workflow.

**Feeds into:** `plan-review` workflow (reviewer role), then executor.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Approved spec, research artifacts, current repo state |
| **Allowed tools** | Local file reads, codebase inspection, source-backed comparison with approved references |
| **Output: implementation plan artifact** | Full task plan with order, dependencies, branch, and commit message per task |
| **Output: ordered task list** | Each task numbered, with explicit depends-on references |
| **Output: verification plan** | Per-section verification commands and pass criteria |

---

## Example

Building on the rate limiting spec:

**Implementation plan (excerpt):**

```markdown
# Implementation Plan: Per-User API Rate Limiting

## Target Branch
feature/rate-limiting — branch from develop

## Tasks

### Task 1: Install and configure rate-limiter-flexible
- depends_on: []
- commit_message: "chore(deps): add rate-limiter-flexible ^3.0.0"
- work:
  - npm install rate-limiter-flexible
  - Add Redis client config for rate limiter in src/infrastructure/rateLimiter.ts
- verification:
  - `npm ls rate-limiter-flexible` shows correct version
  - TypeScript compiles without errors: `npm run build`

### Task 2: Implement rate limit middleware
- depends_on: [Task 1]
- commit_message: "feat(api): add per-key token bucket rate limiting middleware"
- work:
  - Create src/middleware/rateLimit.ts
  - Apply to public API router in src/api/routes/index.ts
  - Inject X-RateLimit-* headers on every response
  - Return 429 + Retry-After when limit is exceeded
  - Fail-open when Redis unavailable, emit metric
- verification:
  - Unit tests pass: `npm test src/middleware/rateLimit.test.ts`
  - Integration test: 101 requests in 60s window — expect 1× 429
  - Redis failure test: mock Redis down — expect pass-through + alert

### Task 3: Update CHANGELOG
- depends_on: [Task 2]
- commit_message: "docs(changelog): record rate limiting feature under [Unreleased]"
- work:
  - Add entry to CHANGELOG.md [Unreleased] section

## Verification Plan Summary
- All unit tests green: `npm test`
- Integration suite: `npm run test:integration`
- Branch naming: `superagent validate branches`
- Commit format: `superagent validate commits`
- Changelog entries: `superagent validate changelog --require-entries`
```

---

## Git-Flow Responsibilities

The planner does not commit code, but it is responsible for specifying the git-flow structure that the executor will follow:

- Specify `target_branch` in every task definition
- Use `feature/codex` branches for features, `hotfix` for critical fixes from main
- Include `commit_message` in task frontmatter in conventional commit format
- The executor may not merge to develop or main — the planner's task list ends at the PR

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `plan-review` workflow | `workflows/` | Gates execution behind plan review |
| `verification-proof` validation check | `superagent.manifest.yaml` | Requires verification plan to exist before execution |
| Branch naming rules | `hooks/` | `loop_cap_guard` enforces iteration caps; `protected_path_write_guard` enforces path rules |

---

## When to Use / When NOT to Use

**Use the planner when:**
- You have an approved spec and need a concrete, ordered, verifiable task list before execution begins
- The implementation touches multiple files, layers, or systems with non-obvious dependencies
- You need to ensure the executor doesn't have to make architectural decisions mid-flight
- A plan-review gate is required before code is written

**Do NOT invoke the planner when:**
- The spec is not yet approved — plan from an unapproved spec is wasted work
- You want to plan incrementally during execution — the plan must be complete before execution starts
- The task is trivial enough that a plan adds more overhead than value (single-file, single-function fixes)

> [!NOTE]
> Hidden coupling is the planner's most dangerous failure mode. If Task 3 secretly depends on a side-effect of Task 1 that is not documented as a dependency, the executor will hit an invisible wall. Every dependency must be explicit in the task list.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Hidden coupling | Executor hits unexpected blockers; may make unapproved scope decisions to unblock |
| Missing verification | Verifier has no plan to run; proof bundle will be incomplete |
| Step gaps that require invention during execution | Executor must invent solutions not in the spec — plan drift begins |

---

## Related

- [Roles Overview](README.md)
- [specifier](specifier.md) — upstream role (produces the approved spec)
- [designer](designer.md) — upstream role when design phase is present
- [executor](executor.md) — downstream role that implements the plan
- [reviewer](reviewer.md) — validates plan in `plan-review` workflow
- [Plan Workflow](../workflows/plan.md) _(coming soon)_
- [Plan-Review Workflow](../workflows/plan-review.md) _(coming soon)_
