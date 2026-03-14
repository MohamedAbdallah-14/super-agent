# run-audit

**Out-of-band — Structured codebase auditing that produces source-backed findings, not opinions.**

![Phase](https://img.shields.io/badge/phase-out--of--band-grey)
![Role](https://img.shields.io/badge/role-researcher-orange)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Perform a structured, source-backed audit of the codebase, a branch, or scoped paths — producing findings with severity, evidence, citations, and remediation — in either report mode (immediate deliverable) or plan mode (feeds the `plan` phase).

---

## Pipeline Position

`run-audit` is an independent workflow. It does not require prior pipeline state and can be triggered at any time.

```
  (any point)
       │
       ▼
┌───────────┐
│ RUN-AUDIT │  ◄── INDEPENDENT ENTRY POINT
└───────────┘
       │
       ├─── report mode ──► Audit report artifact (deliverable)
       │
       └─── plan mode ───► docs/plans/<audit-name>.md
                                   │
                                   ▼
                             PLAN workflow (standard pipeline entry)
```

---

## Role Responsible

`researcher` (composed with audit-specific expertise from `audit-*` concern modules)

The researcher role is used because auditing is fundamentally investigative work: collect evidence, assess against standards, cite sources, produce structured findings. The researcher does not implement fixes — it finds and documents.

---

## Trigger

One of:
- Operator requests a security, code-quality, architecture, performance, or dependency audit
- A scheduled or milestone-triggered audit runs on a branch or scope
- A custom audit scope is defined (specific paths, specific concerns)

No prior pipeline run state is required.

---

## Steps

1. **Receive audit parameters.** Three inputs define the audit:
   - **Audit type**: `security`, `code-quality`, `architecture`, `performance`, `dependencies`, or `custom`
   - **Audit scope**: `whole-project`, `branch` (diff only), or `paths` (explicit file list)
   - **Output mode**: `report` (produce findings artifact) or `plan` (produce approved design doc in `docs/plans/`)

2. **Load audit-specific expertise modules.** The relevant `audit-*` expertise modules are composed into the researcher context for the declared audit type.

3. **Enumerate all files within scope.** Skipping any file within the declared scope is a failure condition. Every file must be examined.

4. **Produce findings.** For each issue found:
   - Assign a severity: `critical`, `high`, `medium`, `low`, `info`
   - Cite evidence: file path, line number, code snippet
   - Justify the severity rating
   - Provide a specific remediation recommendation

5. **Produce the output artifact.**
   - **Report mode**: Structured audit report with artifact metadata (title, date, scope, audit type, findings table, executive summary)
   - **Plan mode**: Approved design doc in `docs/plans/<name>.md` formatted for `sa:writing-plans` handoff into the `plan` workflow

---

## Input Artifacts

| Artifact | Description | Required |
|----------|-------------|----------|
| Audit type | One of the defined audit types | Yes |
| Audit scope | Scope definition (whole-project / branch / paths) | Yes |
| Output mode | `report` or `plan` | Yes |

---

## Output Artifacts

| Mode | Artifact | Description |
|------|----------|-------------|
| Report | Audit report artifact | Structured findings with severity, evidence, citations, remediation |
| Plan | `docs/plans/<name>.md` | Design doc ready for `plan` workflow handoff |

---

## Approval Gate

> [!IMPORTANT]
> **No finding without source-backed evidence.** Every finding must include a file path, line number, code snippet, and citation. Assertions without evidence are not findings.
>
> **No severity rating without justification.** Every severity assignment must state why the finding warrants that severity level. "High because it is a security issue" is not a justification — the specific threat model or impact must be stated.

---

## Audit Types

| Type | What is examined | Expertise modules applied |
|------|-----------------|--------------------------|
| `security` | Auth, input validation, secrets exposure, dependency vulns | `audit-security` |
| `code-quality` | Complexity, dead code, test coverage, naming | `audit-code-quality` |
| `architecture` | Layer separation, coupling, dependency flow, patterns | `audit-architecture` |
| `performance` | Algorithmic complexity, N+1s, bundle size, caching | `audit-performance` |
| `dependencies` | Outdated packages, license compliance, vulnerability flags | `audit-dependencies` |
| `custom` | Operator-defined concern list | Operator-specified modules |

---

## Example Run

**Audit request:**
```
Type: security
Scope: whole-project
Mode: report
```

**Audit report (abbreviated):**

```
# Security Audit — SuperAgent Dashboard
Date: 2026-03-13
Scope: whole-project
Auditor: researcher (audit-security expertise)

## Executive Summary
3 findings: 1 high, 1 medium, 1 low. No critical issues.
Primary concern: localStorage used for session token storage.

## Findings

### F-001 — HIGH
Title: Session token stored in localStorage
File: src/hooks/useAuth.ts:34
Snippet: localStorage.setItem('session_token', token)
Evidence: localStorage is accessible to any JavaScript running on the page,
          making stored tokens vulnerable to XSS attacks.
Citation: OWASP Web Storage Security, §3.2
Severity justification: XSS + localStorage token = full session hijack.
Remediation: Use httpOnly cookies for session tokens. Remove localStorage
             storage of any credential material.

### F-002 — MEDIUM
Title: No Content-Security-Policy header configured
File: src/server/middleware.ts (absent)
Evidence: No CSP middleware found in codebase search.
Citation: OWASP CSP Cheat Sheet
Severity justification: Absence of CSP increases XSS blast radius.
Remediation: Add CSP middleware with strict-dynamic policy.

### F-003 — LOW
Title: .env.example contains non-example credentials
File: .env.example:7
Snippet: STRIPE_SECRET_KEY=sk_test_4eC39Hq...
Evidence: Key prefix sk_test_ indicates a real (test-mode) Stripe key.
Severity justification: Test keys can make real API calls in test mode.
Remediation: Replace with placeholder: STRIPE_SECRET_KEY=<your-stripe-secret-key>
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Producing findings without file/line citations | Finding cannot be actioned or verified | Every finding must have a specific file path and line number |
| Assigning severity without justification | Severity is noise; remediation prioritization fails | State the threat model or impact that drives the severity |
| Skipping files within declared scope | Audit coverage is incomplete; findings are not exhaustive | Enumerate every in-scope file before beginning; confirm all were examined |
| Producing superficial findings ("add tests") | Report is not actionable | Findings must be specific enough to generate a concrete remediation task |
| Using plan mode without knowing the plan workflow | Design doc format is wrong; plan phase cannot consume it | Review `plan` workflow and `sa:writing-plans` skill before selecting plan mode |

---

## Related

- [Overview — All Workflows](README.md)
- [Pipeline entry via plan mode: plan](plan.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
