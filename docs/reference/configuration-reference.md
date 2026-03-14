# Configuration Reference

SuperAgent configuration currently starts from the canonical manifest:

- `superagent.manifest.yaml`

That manifest is the source of truth for:

- project identity
- project description and versioning policy
- canonical repo paths
- supported hosts
- canonical workflows and export targets
- phase and role rosters
- required hooks
- protected paths
- brand-term enforcement for active surfaces
- optional adapters
- validation checks

## Path policy

Repo-managed canonical paths live in the repository:

- `input/`
- `roles/`
- `workflows/`
- `skills/`
- `hooks/`
- `templates/`
- `schemas/`
- `expertise/`
- `docs/`
- `exports/`
- `tooling/`
- `memory/`
- `examples/`

The default external run-state root is declared in the manifest as:

- `~/.superagent/projects/{project_slug}`

That path is intentionally outside the repo so normal runs do not dirty adopters' worktrees.

Indexing and recall commands also accept:

- `--state-root <path>`

Use that override for tests, CI fixtures, or operators who need the index somewhere else.

The status command uses the same state-root resolution rules when reading run-local status files.

## Protected paths

The current protected path roster is declared in `superagent.manifest.yaml`:

- `input`
- `roles`
- `workflows`
- `schemas`
- `exports/hosts`

These paths are reserved for canonical source material or generated host exports and should not be rewritten by ad hoc task output.

Generated host packages live under:

- `exports/hosts/claude`
- `exports/hosts/codex`
- `exports/hosts/gemini`
- `exports/hosts/cursor`

## Dependency policy

The active CLI keeps runtime dependencies small and explicit:

- `ajv` for JSON Schema enforcement
- `yaml` for canonical manifest and hook parsing
- `gray-matter` for frontmatter parsing in library tests

Policy:

- prefer built-in Node APIs unless a library meaningfully reduces correctness risk
- allow small parsing and schema-validation libraries
- do not add framework, server, or web-stack dependencies to the product surface
- keep optional adapter integrations external by default

## Adapter policy

The manifest currently declares one optional adapter:

- `context_mode`

It is:

- disabled by default
- optional
- external-install mode

SuperAgent must remain useful without the adapter present.

## Versioning and naming guardrails

The manifest also records:

- a versioning policy for the active pre-`1.0` line
- export targets for each supported host
- brand-term enforcement rules for active surfaces
- `manifest_version`, currently `2`, for breaking manifest contract changes

Those fields exist to keep the active repo aligned with the SuperAgent product identity.

The required manifest fields are:

- `project.description`
- `versioning_policy`
- `workflows`
- `export_targets`
- `prohibited_terms`

Current enforcement scope:

- manifest-declared role files under `roles/`
- manifest-declared workflow files under `workflows/`

That scope is intentional. The manifest check is a canonical-surface guard for active operating-model content, not a blanket full-repo grep.

Out of scope for this manifest check:

- undeclared helper scripts
- undeclared config files
- scratch files
- generated run artifacts

Maintainers are responsible for policing those surfaces with the separate docs-truth, runtime-surface, and repository review checks.

## Workflows vs phases

- `phases` are the core lifecycle states of the operating model.
- `workflows` are the canonical callable or review-gated entrypoints that drive those phases.

They overlap heavily, but they are not identical:

- `spec_challenge`, `plan_review`, and `prepare_next` are workflows that sit between or around the core execution phases.
- Validators and exports should treat manifest-declared workflows as the canonical workflow file roster.

## Current index parser roster

The active manifest currently declares built-in heuristic extractors for:

- JavaScript
- TypeScript
- Python
- Go
- Rust
- Java
- SQL
- JSON
- YAML
- Markdown
