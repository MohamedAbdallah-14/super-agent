# run-audit

> Interactive structured codebase audit — security, quality, architecture, performance, dependencies, or custom. Produces a source-backed findings report or actionable fix plan.

| Property | Value |
|---|---|
| **ID** | `run-audit` |
| **Type** | Flexible |
| **Trigger** | Explicit operator request: "audit this codebase" or `/run-audit` |
| **Output modes** | Report (findings only) or Plan (findings → implementation tasks) |

## Purpose

`run-audit` runs a disciplined, multi-step audit pipeline on a codebase. It collects three parameters interactively (type, scope, output mode), then executes a research-based analysis using audit-specific expertise modules. Every finding is backed by source citations — no speculation, no summary without evidence.

The audit operates through the `researcher` role composed with `audit-*` expertise modules. No new canonical role is introduced.

## When to Invoke

- Operator requests a security, quality, architecture, performance, or dependency review.
- Before a major refactor — establish a baseline of known issues.
- After merging a large feature branch — verify no quality regression.
- As part of a scheduled review cadence.

> [!WARNING]
> Pre-flight: the project must be a git repository. If there are uncommitted changes, the agent warns before proceeding — audit accuracy depends on a stable working tree.

## When NOT to Invoke

- You want a self-audit of the SuperAgent project itself — use `self-audit` instead.
- You need a quick project overview — use `scan-project` instead.
- Implementation is already in progress and you need to fix a specific known issue — use `sa:debugging`.

## Phases

### Step 1: Collect Audit Type

Prompts the operator to choose one of six audit types:

| # | Type | Focus |
|---|---|---|
| 1 | Security | Vulnerabilities, secrets, OWASP, dependency risks |
| 2 | Code Quality | Complexity, duplication, dead code, naming |
| 3 | Architecture | Coupling, layering, design doc adherence |
| 4 | Performance | Bottlenecks, memory, inefficient patterns |
| 5 | Dependencies | Outdated, vulnerable, unused packages |
| 6 | Custom | Operator-described focus |

### Step 2: Collect Scope

| # | Scope | Description |
|---|---|---|
| 1 | Whole project | Scan entire codebase |
| 2 | Specific branch | Diff against base branch |
| 3 | Specific paths/files | Audit only named directories or files |

### Step 3: Collect Output Mode

| # | Mode | Description |
|---|---|---|
| 1 | Report | Structured findings, analysis only |
| 2 | Plan | Findings become implementation tasks via `sa:writing-plans` |

### Step 4: Confirm and Start

Summarizes parameters, waits for operator confirmation before proceeding.

### Step 5: Research + Audit (Autonomous)

Composes a `researcher` agent with the relevant `audit-*` expertise modules from `expertise/composition-map.yaml`:

| Audit Type | Expertise Module |
|---|---|
| Security | `audit-security` |
| Code Quality | `audit-code-quality` |
| Architecture | `audit-architecture` |
| Performance | `audit-performance` |
| Dependencies | `audit-dependencies` |
| Custom | All `audit-*` modules combined |

The researcher scans the project, categorizes findings by severity (critical / high / medium / low / info), and produces evidence-backed findings with location (`file:line`), code snippets, and remediation guidance.

### Step 6: Output

**Report mode:** Presents findings directly to the operator. Operator can copy or request a save.

**Plan mode:**
1. Presents findings for approval.
2. On approval, saves findings to `docs/plans/YYYY-MM-DD-audit-<type>-findings.md`.
3. Invokes `sa:writing-plans` to produce an implementation plan from the approved findings.

## Input

- Git repository (required)
- Operator-selected: type, scope, output mode
- Audit parameters (passed as context to researcher — not written to `input/`)

## Output

### Report Format

```markdown
# Security Audit Report — 2026-03-13

## Summary
- Scope: whole project
- Total findings: 7 (Critical: 1, High: 2, Medium: 3, Low: 1)

## Findings

### Critical

#### [C-001] Hardcoded JWT secret in source
- Category: Secrets exposure
- Location: src/auth/jwt.js:14
- Evidence: `const secret = "hardcoded-secret-do-not-use";`
- Remediation: Move to environment variable, rotate the secret
```

## Example

**Scenario:** Security audit of a Node.js API before a production launch.

```
Agent: What would you like to audit?
Operator: 1 (Security)

Agent: What scope?
Operator: 1 (Whole project)

Agent: What output?
Operator: 2 (Plan)

Agent: Audit Summary:
  Type: security | Scope: whole-project | Output: plan
  Proceed? (y/n)
Operator: y

[Researcher composes with audit-security expertise]
[Scans entire codebase]
[Produces 7 findings]

Agent: Found 7 findings (1 critical, 2 high...). Approve as fix plan basis?
Operator: y

[Saves to docs/plans/2026-03-13-audit-security-findings.md]
[Invokes sa:writing-plans]
[Produces docs/plans/2026-03-13-audit-security-implementation.md]
```

## Integration

`run-audit` feeds into `sa:writing-plans` in plan mode, completing the loop:

```
run-audit (findings approved) → sa:writing-plans → sa:tdd → sa:verification
```

For SuperAgent self-audits specifically, use `self-audit` instead — it adds worktree isolation and automated fix-verify cycles.
