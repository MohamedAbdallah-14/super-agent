# Architecture

SuperAgent is a host-native engineering OS kit. The host environment (Claude, Codex, Gemini, Cursor) remains the execution container. SuperAgent supplies the operating model, guardrails, and artifact contracts.

## Core components

| Component | Purpose |
|-----------|---------|
| Roles | Canonical contracts defining what each agent role does and produces |
| Workflows | Phase entrypoints that sequence roles through delivery |
| Skills | Reusable procedures (sa:tdd, sa:debugging, sa:verification, sa:brainstorming) |
| Hooks | Guardrails enforcing protected paths, loop caps, and capture routing |
| Expertise | 255 curated knowledge modules composed into agent prompts |
| Templates | Artifact templates for phase outputs and handoff |
| Schemas | Validation schemas for manifest, hooks, artifacts, and exports |
| Exports | Generated host packages tailored per supported host |
| Tooling | CLI for validation, indexing, recall, capture, and status |

## Design influences

| Source | What SuperAgent keeps |
|--------|----------------------|
| SuperAgent skill system | Disciplined workflows, TDD, verification, review rigor, skill ergonomics |
| Spec-Kit | Spec-first development, explicit artifacts, approval gates |
| Oh My Claude | Host-native prompt structure and operator ergonomics |
| autoresearch | Research loops, experiment tracking, self-improvement discipline |

## Context and indexing

SuperAgent ships a built-in local index and recall surface. The context-mode integration is an optional adapter — off by default, never required for core install, build, or test paths.

## Design Phase

The design phase runs after specification and before planning. The `designer` role uses open-pencil MCP tools to produce visual designs from the approved spec. Outputs include a `.fig` design file, exported Tailwind JSX/HTML+CSS scaffolds, design tokens JSON, and screenshot PNGs.

The `design-review` workflow validates designs against the spec before planning begins. The existing `review` workflow also checks design-vs-implementation alignment after execution.

open-pencil is integrated as an optional adapter (`open_pencil`) — it is not required for core SuperAgent functionality.

## Key references

- [Roles & Workflows](roles-and-workflows.md)
- [Artifact Model](artifact-model.md)
- [Host Exports](../reference/host-exports.md)
- [Hooks](../reference/hooks.md)
- [Expertise & Antipatterns](composition-engine.md)
