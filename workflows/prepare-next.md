# prepare-next

## Purpose

Prepare the next run or next execution slice without silently carrying stale context forward.

## Inputs

- current run summary
- accepted learnings where explicitly enabled

## Primary Role

- `planner`

## Outputs

- next-step handoff
- scoped context summary

## Approval Gate

- no implicit carry-forward of unapproved learnings

## Failure Conditions

- stale context treated as current truth
