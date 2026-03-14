# run-audit

## Purpose

Perform a structured audit on the codebase, branch, or scoped paths and produce source-backed findings with severity, evidence, citations, and remediation.

## Inputs

- audit type (security, code-quality, architecture, performance, dependencies, custom)
- audit scope (whole-project, branch, paths)
- output mode (report, plan)

## Primary Role

- `researcher` (composed with audit-specific expertise from `audit-*` concerns)

## Outputs

- structured audit report with artifact metadata (report mode)
- approved design doc in `docs/plans/` for `sa:writing-plans` handoff (plan mode)

## Approval Gate

- no finding without source-backed evidence (file path, line, snippet, citation)
- no severity rating without justification

## Failure Conditions

- superficial findings without verification
- unsupported claims or missing citations
- skipping files within declared scope
