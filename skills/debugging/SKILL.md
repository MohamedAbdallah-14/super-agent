---
name: sa:debugging
description: Use when behavior is wrong or verification fails. Follow an observe-hypothesize-test-fix loop instead of guesswork.
---

# Debugging

Follow this order:

1. Observe
Record the exact failure, reproduction path, command output, and current assumptions.

2. Hypothesize
List 2-3 plausible root causes and rank them.

3. Test
Run the smallest discriminating check that can confirm or reject the top hypothesis.

4. Fix
Apply the minimum corrective change, then rerun the failing check and the relevant broader verification set.

Rules:

- change one thing at a time
- keep evidence for each failed hypothesis
- if three cycles fail, record the blocker in the active execution artifact or handoff instead of inventing certainty
