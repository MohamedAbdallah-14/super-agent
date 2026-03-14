# Memory and Learnings

SuperAgent keeps learning durable but scoped.

## Memory Layout

- `memory/learnings/proposed/`
- `memory/learnings/accepted/`
- `memory/learnings/archived/`
- `memory/experiments/`
- `memory/anti-pattern-observations/`
- `memory/summaries/`

## Rules

- new learnings start as proposed
- accepted learnings require explicit review and scope tags
- fresh runs do not auto-load learnings by default
- experiments must record whether they improved, regressed, or were neutral
- every learning or experiment must cite the artifacts or verification that justify it
- stale proposed learnings should be archived instead of silently lingering as pending truth

## Guardrails

- do not silently rewrite canonical guidance from a learning
- do not broaden a learning beyond its proven scope
- archive stale or disproven learnings instead of letting them drift

## Promotion Path

1. Capture a proposed learning with scope, evidence, and confidence.
2. Review it explicitly.
3. Promote it to `memory/learnings/accepted/` only when the scope and evidence are durable.
4. Move disproven or obsolete learnings to `memory/learnings/archived/`.
