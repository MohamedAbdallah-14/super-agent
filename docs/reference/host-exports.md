# Host Exports

SuperAgent now includes a canonical export compiler for host packages under:

- `exports/hosts/claude/`
- `exports/hosts/codex/`
- `exports/hosts/gemini/`
- `exports/hosts/cursor/`

## Current commands

- `superagent export build`
- `superagent export --check`

## What `build` does

The compiler currently:

- validates the manifest
- validates canonical hook definitions
- reads canonical role files
- reads canonical workflow files
- writes host-specific package files under `exports/hosts/*`
- writes `host-package.json`
- writes `export.manifest.json`
- records source hashes for drift detection

## What `--check` does

The drift check:

- verifies the generated package metadata exists for every host
- verifies the listed generated files still exist
- compares current source hashes against each host export manifest
- fails non-zero when canonical sources changed after the last export

## Current host package shapes

Current generated highlights:

- Claude: `CLAUDE.md`, `.claude/settings.json`, `.claude/agents/*`, `.claude/commands/*`
- Codex: `AGENTS.md`
- Gemini: `GEMINI.md`
- Cursor: `.cursor/rules/superagent-core.mdc`, `.cursor/hooks.json`

## Scope note

The compiler generates the canonical host packages under `exports/hosts/*`.

The only root host bootstrap retained is `.claude/settings.json`, which mirrors the generated Claude settings contract.
