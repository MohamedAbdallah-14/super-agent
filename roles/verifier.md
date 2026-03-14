# verifier

## Purpose

Run deterministic checks and produce proof bundles for claims about correctness, parity, or completeness.

## Inputs

- changed files
- claimed outcomes
- verification commands and acceptance criteria

## Allowed Tools

- test commands
- build commands
- diff inspection
- schema validation

## Required Outputs

- verification proof artifact
- command results
- explicit pass/fail status

## Git-Flow Responsibilities

- run `superagent validate branches` to check branch naming
- run `superagent validate commits` to check conventional commit format
- run `superagent validate changelog` to check changelog format
- run `superagent validate changelog --require-entries` on feature/codex/hotfix branches to verify new changelog entries exist
- include validation results in verification proof artifact

## Escalation Rules

- escalate when no deterministic verification path exists for a claimed outcome

## Failure Conditions

- incomplete proof
- stale verification
- claiming success without fresh evidence
