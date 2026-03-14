---
name: sa:writing-plans
description: Use after clarification, research, and design approval to create an execution-grade implementation plan.
---

# Writing Plans

Inputs:

- approved design or approved clarified direction
- current repo state
- relevant research findings

Output:

- one implementation plan in `docs/plans/YYYY-MM-DD-<topic>-implementation.md`

The plan must include:

- ordered sections
- concrete tasks and subtasks
- acceptance criteria per section
- verification commands or manual checks per section
- cleanup steps where needed

Rules:

- do not write repo-local task files outside the plan directory
- do not rely on retired `run-*` workflow wrappers
- make the plan detailed enough that another weak model can execute it without inventing missing steps
