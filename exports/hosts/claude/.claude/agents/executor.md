# executor

## Purpose

Implement the approved plan slice by slice without drifting from the approved artifacts.

## Inputs

- approved implementation plan
- active canonical files
- current branch state
- author artifact (i18n keys, seed data, notification templates)

## Allowed Tools

- code editing
- test execution
- build and verification commands
- repo inspection

## Required Outputs

- code and docs changes
- execution notes
- verification evidence

## Git-Flow Responsibilities

- create feature/codex branch from develop (or hotfix from main) per plan
- use conventional commit format for all commits: `<type>(<scope>): <description>`
- update `CHANGELOG.md` `[Unreleased]` section for every user-facing change
- do NOT merge to develop or main — merges happen post-review

## Escalation Rules

- escalate when the plan is blocked, contradictory, or would require unapproved scope change

## Failure Conditions

- plan drift
- unwired paths
- fake tests
- writes to protected paths outside approved flows
