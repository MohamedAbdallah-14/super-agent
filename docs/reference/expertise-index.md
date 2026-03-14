# Expertise Index

This reference documents the expertise module system and anti-pattern catalog.

## Metadata

Top-level expertise metadata lives in:

- `expertise/index.yaml`

That index records domain, use cases, review applicability, and freshness date so loading can stay scoped instead of brute-force.

## Module locations

- Domain expertise modules: `expertise/` (organized by domain subdirectory)
- Anti-pattern modules: `expertise/antipatterns/`
- Research source material: `docs/research/`

## Loading policy

| Phase | Loads from |
|-------|-----------|
| `clarify`, `discover` | `input/`, active docs, `docs/research/` |
| `specify`, `plan` | Relevant expertise slices based on stack and risks |
| `review` | `expertise/antipatterns/` first, then broader domain modules |
| `learn` | Can propose updates to expertise (not silently rewrite) |

## Anti-pattern catalog

The `expertise/antipatterns/` directory contains modules that catch:

- **Fake completion** — claiming done without evidence
- **Unwired abstractions** — interfaces defined but never connected
- **Shallow tests** — tests that pass without exercising real behavior
- **Security theater** — security measures that look good but do not protect
- **Architecture drift** — implementation diverging from documented architecture
- **AI-coding failure modes** — patterns specific to LLM-generated code

## Rules

- Expertise modules must be scoped by domain and use case
- Anti-patterns are always loaded before domain modules during review
- The composition engine enforces a maximum of 15 modules per dispatch
- Token budget is enforced per dispatch

For conceptual understanding of how the composition engine works, see [Composition Engine](../concepts/composition-engine.md).
