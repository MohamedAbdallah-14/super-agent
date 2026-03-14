# Composition Engine

SuperAgent uses a composition engine to assemble the right expertise into each role's context at each phase.

## How expertise loading works

- `clarify` and `discover` start from `input/`, active docs, and `docs/research/`
- `specify` and `plan` pull only the expertise slices relevant to the stack and risks
- `review` always considers `expertise/antipatterns/` before broader domain modules
- `learn` can propose updates to expertise, but may not silently rewrite it

## Anti-patterns first

`expertise/antipatterns/` is first-class review input. It exists to catch:

- fake completion
- unwired abstractions
- shallow tests
- security theater
- architecture drift
- AI-coding failure modes

Anti-patterns are loaded into reviewer context before any other domain modules. This ordering ensures that known failure modes are the first lens through which review happens.

## Why scoped loading matters

Brute-force loading of all expertise modules would flood the context window. The composition engine resolves which modules to load based on the task's declared stack and concerns, keeping context tight and relevant. Max 15 modules per dispatch, with token budget enforcement.

## Source material

- Research findings: `docs/research/`
- Expertise modules: `expertise/`
- Anti-pattern catalog: `expertise/antipatterns/`
- Expertise metadata: `expertise/index.yaml`

For the complete module listing and anti-pattern catalog, see the [Expertise Index reference](../reference/expertise-index.md).
