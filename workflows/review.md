# review

## Purpose

Run adversarial review against the changed implementation and its evidence.

## Inputs

- changed files
- verification proof
- approved spec and plan
- design artifact (when design phase was used)

## Primary Role

- `reviewer`

## Outputs

- findings
- no-findings verdict when applicable

## Approval Gate

- unresolved blocking findings must stop completion

## Failure Conditions

- vague review or uncited findings
- design-implementation mismatch not flagged (when design artifact exists)
