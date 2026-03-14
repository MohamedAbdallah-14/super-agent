# SuperAgent CLI

The `superagent` CLI is minimal on purpose. It exists to validate and export the host-native OS kit.

## Current command surface

| Command | Status | Behavior |
| --- | --- | --- |
| `superagent validate manifest` | implemented | Validates `superagent.manifest.yaml` against its schema and checks required repo paths exist. |
| `superagent validate hooks` | implemented | Validates canonical hook definitions against `schemas/hook.schema.json` and the manifest hook roster. |
| `superagent validate docs` | implemented | Validates `docs/truth-claims.yaml`, checks documented command claims against the active CLI surface, and rejects broken local doc links. |
| `superagent validate brand` | implemented | Enforces canonical product naming on the SuperAgent surface. |
| `superagent validate runtime` | implemented | Rejects non-canonical runtime wrappers, repo-local task/state paths, and forbidden runtime-only package surfaces. |
| `superagent validate branches` | implemented | Validates the current (or `--branch`-specified) branch name against the allowed git-flow patterns. |
| `superagent validate commits` | implemented | Validates conventional commit format for commits in the range `--base..--head` (or auto-detected base to HEAD). |
| `superagent validate changelog` | implemented | Validates `CHANGELOG.md` structure; with `--require-entries` and `--base`, enforces new entries since the base. |
| `superagent validate artifacts` | reserved | Exits `2` until artifact-template and example validation expands. |
| `superagent export build` | implemented | Generates host packages under `exports/hosts/*` from canonical sources. |
| `superagent export --check` | implemented | Verifies generated host packages still match current canonical source hashes. |
| `superagent index build` | implemented | Builds a local SQLite-backed index under the configured state root. |
| `superagent index refresh` | implemented | Refreshes indexed files using stored content hashes. |
| `superagent index stats` | implemented | Reports file, symbol, outline, and summary_counts for the current index. |
| `superagent index summarize` | implemented | Generates L0/L1 heuristic summaries for all indexed files and symbols. |
| `superagent index search-symbols` | implemented | Searches indexed symbol names. |
| `superagent index get-symbol` | implemented | Returns a stored symbol record by name or ID. |
| `superagent index get-file-outline` | implemented | Returns indexed outline entries for a file. |
| `superagent recall file` | implemented | Returns an exact line-bounded slice from an indexed file. Supports `--tier L0\|L1` for summary recall. |
| `superagent recall symbol` | implemented | Returns an exact slice for an indexed symbol match. Supports `--tier L0\|L1` for summary recall. |
| `superagent doctor` | implemented | Validates the active repo surface for manifest, hooks, state-root policy, and host export directory presence. |
| `superagent status` | implemented | Reads run status directly from `<state-root>/runs/<run-id>/status.json`. |
| `superagent capture init` | implemented | Creates a run ledger with `status.json`, `events.ndjson`, and a captures directory under the configured state root. |
| `superagent capture event` | implemented | Appends a run event and can update phase, status, and loop counts in `status.json`. |
| `superagent capture route` | implemented | Reserves a run-local capture file path for large tool output. |
| `superagent capture output` | implemented | Writes captured tool output to a run-local file and records a `post_tool_capture` event. |
| `superagent capture summary` | implemented | Writes `summary.md` and records the chosen summary or handoff event. |

## Exit codes

- `0`: requested check passed
- `1`: invalid input or validation failure
- `2`: command surface exists but the implementation is intentionally not complete yet

## Root discovery

The CLI resolves the project root by walking upward from the current working directory until it finds `superagent.manifest.yaml`. This keeps checks usable from nested directories inside the repo.

## State-root override

Indexing and recall commands accept `--state-root <path>` so operators can keep index state wherever they want. If omitted, SuperAgent uses the manifest default outside the repo.

`superagent status` accepts the same override when reading run-local status files.

`superagent capture *` accepts the same override when writing run-local status, events, summaries, and captured output files.

`superagent export build` and `superagent export --check` work from the current project root and write under `exports/hosts/*`.

## Current scope limits

- The CLI is a validation and export tool with no background processes.
- Validation is the first active capability because it prevents fake green states while the rest of the kit is still being rebuilt.
- Reserved commands are documented here so adopters can tell the difference between real behavior and planned behavior.

## Docs truth source

Executable documentation claims are registered in:

- `docs/truth-claims.yaml`

`superagent validate docs` uses that file plus active markdown link checks to prevent stale command and path claims from silently drifting.
