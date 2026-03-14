# Indexing and Recall

SuperAgent ships a built-in local indexer so context reduction does not depend on an external commercial tool.

## Current implementation

- storage engine: built-in `node:sqlite`
- index location: `<state-root>/index/index.sqlite`
- default state root: `~/.superagent/projects/{project_slug}`
- override: `--state-root <path>`
- refresh model: hash-based incremental refresh
- retrieval model: exact file slices and symbol slices read back from the working tree

## Context tiers

SuperAgent supports three context tiers for recall, enabling token-efficient context loading:

| Tier | Target size | Content | Use case |
| --- | --- | --- | --- |
| L0 | ~100 tokens | One-line identifier summary (name, kind, language, line range) | Inventory scans, bulk listing, deciding what to load |
| L1 | ~500-2k tokens | Structural summary (signature, key fields, purpose, dependencies) | Understanding shape and role without full source |
| L2 | Full content | Exact line-bounded source slice | Implementation details, debugging, code review |

L2 is the default recall behavior (exact slices). L0 and L1 require summaries to be generated first via `index summarize`.

## Summary generation

The `superagent index summarize` command generates L0 and L1 heuristic summaries for all indexed files and symbols.

```
superagent index summarize [--state-root <path>] [--refresh]
```

- Generates summaries for every file and symbol currently in the index
- Summaries are stored in the index database alongside the source metadata
- The `--refresh` flag regenerates summaries even if they already exist
- Summary generation is heuristic-based (no external LLM calls required)
- Each summary records the content hash at generation time for freshness checking

## Tiered recall

The `--tier` flag on `recall file` and `recall symbol` switches from full-content (L2) recall to summary recall:

```
superagent recall file <path> --tier L0
superagent recall file <path> --tier L1
superagent recall symbol <name> --tier L0
superagent recall symbol <name> --tier L1
```

- `--tier` is mutually exclusive with `--start`/`--end` line-range options
- When `--tier` is specified, the response includes the summary text and a `fresh` field
- Without `--tier`, recall behaves exactly as before (L2 exact slices)

## Freshness checking

When summaries are recalled via `--tier`, the response includes a `fresh` boolean field:

- `fresh: true` -- the content hash at summary generation time matches the current file hash on disk
- `fresh: false` -- the file has been modified since the summary was generated; the summary may be stale

Consumers should treat stale summaries as approximate and consider re-running `index summarize --refresh` or falling back to L2 recall for critical decisions.

## Current commands

Implemented now:

- `superagent index build`
- `superagent index refresh`
- `superagent index stats`
- `superagent index summarize`
- `superagent index search-symbols`
- `superagent index get-symbol`
- `superagent index get-file-outline`
- `superagent recall file`
- `superagent recall symbol`

Reserved for later host/runtime work:

- adapter-backed summary generation (LLM-powered summaries via optional adapters)
- directory-level summaries (roll up file summaries into directory-level context)
- adapter activation flows
- richer parser inventories

## Extractor coverage

The current core extractor roster is heuristic and built in-repo:

- `builtin-heuristic-javascript`
- `builtin-heuristic-typescript`
- `builtin-heuristic-python`
- `builtin-heuristic-go`
- `builtin-heuristic-rust`
- `builtin-heuristic-java`
- `builtin-heuristic-sql`
- `builtin-heuristic-json`
- `builtin-heuristic-yaml`
- `builtin-heuristic-markdown`

Behavior:

- supported files get file metadata, hashes, outlines, and best-effort symbol extraction
- unsupported text files can still be added later, but should not claim symbol precision they do not provide
- markdown headings and top-level structured keys are first-class outline targets

## Output model

The index stores:

- files
- symbols
- outlines
- hashes
- ingestion runs
- retrieval logs

Recall returns:

- exact line-bounded slice
- exact source path
- exact line start and line end
- optional surrounding context window

## Ignore and hygiene rules

The built-in index currently skips common non-source or generated trees such as:

- `.git/`
- `.worktrees/`
- `node_modules/`
- `dist/`
- `build/`
- `coverage/`
- `.next/`

If the chosen state root lives inside the repo, SuperAgent skips indexing that path so it does not index its own artifacts.

## Adapter stance

The built-in index is the default and required path.

The optional `context-mode` adapter remains:

- disabled by default
- external
- non-required for default install or test paths

See the adapter docs for current status and constraints.
