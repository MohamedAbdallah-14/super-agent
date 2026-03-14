# Troubleshooting

This guide covers the SuperAgent CLI and host-native tooling surface.

## `superagent validate manifest` fails

Common causes:

- required canonical paths are missing
- a manifest path resolves outside the project root
- manifest fields no longer match `schemas/superagent-manifest.schema.json`

What to check:

- `superagent.manifest.yaml`
- `schemas/superagent-manifest.schema.json`
- directory names under the repo root

## `superagent validate hooks` fails

Common causes:

- hook YAML parses to `null` or another non-object shape
- hook file name and `id` do not match
- required hooks in the manifest do not match files in `hooks/definitions/`
- a host fallback entry is missing for one of the declared hosts

What to check:

- `hooks/definitions/*.yaml`
- `schemas/hook.schema.json`
- `superagent.manifest.yaml`

## `superagent index build` or `refresh` does not index what you expect

Current ignore rules skip common generated or dependency trees such as:

- `.git/`
- `.worktrees/`
- `node_modules/`
- `dist/`
- `build/`
- `coverage/`
- `.next/`

Also note:

- only the current built-in text/code extractor set is indexed
- the chosen state root is skipped if it lives inside the repo
- use `--state-root <path>` in tests or custom setups

## `superagent recall file` or `recall symbol` fails

Common causes:

- the index was never built
- the file or symbol is not present in the current index
- the wrong state root is being queried

Recommended sequence:

1. `superagent index build --state-root <path>`
2. `superagent index stats --state-root <path>`
3. `superagent index search-symbols <query> --state-root <path>`
4. retry the recall command with the same state root

## `superagent doctor` fails

Current doctor checks:

- manifest validation
- hook validation
- external default state-root policy
- required host export directories under `exports/hosts/`

If doctor fails, inspect the returned check list and fix the specific failing surface instead of bypassing the command.

## Guard hook blocks a write or loop

Current guard wrapper exit codes:

- `42` from `hooks/protected-path-write-guard`
- `43` from `hooks/loop-cap-guard`

Typical causes:

- trying to write under `input/` or generated host export paths without an approved regeneration flow
- phase loop counts in run status already meeting the configured cap

## `superagent status --run <id>` fails

The status command reads:

- `<state-root>/runs/<run-id>/status.json`

If it says the run status is missing:

- confirm the run ID
- confirm the state root
- confirm the file exists on disk
- use `--json` for machine-readable output during automation
