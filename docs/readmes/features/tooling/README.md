# SuperAgent CLI

The `superagent` CLI is the validation, indexing, and export tool for the SuperAgent
engineering OS kit. It has no background processes and no server — it is a stateless
command-line utility that operates on the repo and a configurable state root.

**Design principle:** validation is the primary capability. Every command either prevents
a fake-green state (validate/doctor/export --check) or supports structured run tracking
(capture/status/index/recall).

---

## Installation

```bash
# From the repo root
npm install

# The CLI is available as:
npx superagent <command>

# Or via the package bin after global install:
npm install -g .
superagent <command>
```

Requires Node.js 18+. No external services required.

---

## Root Discovery

The CLI walks upward from the current working directory until it finds
`superagent.manifest.yaml`. This means all commands work correctly from any nested
subdirectory inside the project.

---

## Command Reference

### Validate

Validate sub-commands enforce correctness of the manifest, hooks, docs, and code
hygiene. All exit `0` on pass, `1` on failure, `2` for reserved/incomplete commands.

```bash
superagent validate manifest
```
Validates `superagent.manifest.yaml` against `schemas/superagent-manifest.schema.json`
and checks that all required repo paths declared in the manifest actually exist.

```bash
superagent validate hooks
```
Validates every hook definition in `hooks/definitions/` against `schemas/hook.schema.json`
and checks the manifest hook roster for completeness.

```bash
superagent validate docs
```
Validates `docs/truth-claims.yaml`, cross-checks documented CLI commands against the
active CLI surface, and rejects broken local Markdown links.

```bash
superagent validate brand
```
Enforces canonical product naming across the SuperAgent surface — rejects prohibited
terms listed in the manifest's `prohibited_terms` array.

```bash
superagent validate runtime
```
Rejects non-canonical runtime wrappers, repo-local task/state paths, and forbidden
runtime-only package surfaces.

```bash
superagent validate branches [--branch <name>]
```
Validates the current (or specified) branch name against allowed git-flow patterns.

```bash
superagent validate commits [--base <ref>] [--head <ref>]
```
Validates conventional commit format for commits in the specified range (or auto-detected
base to HEAD).

```bash
superagent validate changelog [--require-entries] [--base <ref>]
```
Validates `CHANGELOG.md` structure. With `--require-entries` and `--base`, enforces that
new entries have been added since the base ref.

```bash
superagent validate artifacts   # reserved — exits 2
```

---

### Export

```bash
superagent export build
```
Compiles host packages from canonical sources into `exports/hosts/*`. Validates the
manifest and hooks first, then reads all declared role and workflow files, writes
host-specific files, and records SHA-256 source hashes for drift detection.

```bash
superagent export --check
```
Drift check: re-hashes current canonical sources and compares against the stored hashes
in each `exports/hosts/<host>/export.manifest.json`. Exits non-zero when any source has
changed since the last build.

---

### Doctor

```bash
superagent doctor
```
Full surface health check: runs manifest validation, hooks validation, state-root policy
check, and verifies host export directory presence. Recommended before any release or
major merge.

---

### Index

The index stores a SQLite-backed symbol and outline map under the configured state root.
Useful for agents that need fast symbol lookup without reading every file.

```bash
superagent index build [--state-root <path>]
```
Builds the local index from scratch. Parses supported languages (JS, TS, Python, Go,
Rust, Java, SQL, JSON, YAML, Markdown) using built-in heuristic parsers.

```bash
superagent index refresh [--state-root <path>]
```
Incrementally refreshes indexed files using stored content hashes — skips unchanged files.

```bash
superagent index stats [--state-root <path>]
```
Reports file count, symbol count, and outline entry count for the current index.

```bash
superagent index search-symbols <query> [--state-root <path>]
```
Searches indexed symbol names.

```bash
superagent index get-symbol <name-or-id> [--state-root <path>]
```
Returns a stored symbol record by name or ID.

```bash
superagent index get-file-outline <file-path> [--state-root <path>]
```
Returns indexed outline entries for a file.

---

### Recall

```bash
superagent recall file <file-path> --start <line> --end <line> [--state-root <path>]
```
Returns an exact line-bounded slice from an indexed file without reading the whole file
into context.

```bash
superagent recall symbol <name-or-id> [--state-root <path>]
```
Returns an exact slice for an indexed symbol match — file path, line range, and content.

---

### Status

```bash
superagent status --run-id <id> [--state-root <path>]
```
Reads run status directly from `<state-root>/runs/<run-id>/status.json` and prints
current phase, status, and loop counts.

---

### Capture

The capture commands support structured run tracking. Agents use these to maintain an
auditable ledger of events, phase transitions, and large tool outputs.

```bash
superagent capture init --run-id <id> [--state-root <path>]
```
Creates a run ledger: `status.json`, `events.ndjson`, and a `captures/` directory under
`<state-root>/runs/<run-id>/`.

```bash
superagent capture event --run-id <id> --type <event-type> [--phase <phase>] \
  [--status <status>] [--state-root <path>]
```
Appends a structured event to `events.ndjson` and can update `phase`, `status`, and
loop counts in `status.json`.

```bash
superagent capture route --run-id <id> --name <capture-name> [--state-root <path>]
```
Reserves a run-local capture file path for large tool output — returns the path so the
agent knows where to write.

```bash
superagent capture output --run-id <id> --name <capture-name> --content <content> \
  [--state-root <path>]
```
Writes captured tool output to the reserved file and records a `post_tool_capture` event.

```bash
superagent capture summary --run-id <id> --content <content> [--state-root <path>]
```
Writes `summary.md` and records the chosen summary or handoff event.

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Check passed / command succeeded |
| `1` | Invalid input or validation failure |
| `2` | Command surface exists but implementation is intentionally incomplete |

---

## State Root

All index, recall, status, and capture commands accept `--state-root <path>` to override
where run state lives. The default is `~/.superagent/projects/<project-slug>/` as declared
in `superagent.manifest.yaml`.

This keeps all run-time state outside the repo, preventing accidental commits of agent
session data.

---

## Common Workflows

**Before merging a PR:**
```bash
superagent validate manifest
superagent validate hooks
superagent validate docs
superagent export --check
```

**Full health check:**
```bash
superagent doctor
```

**After editing roles or workflows, rebuild exports:**
```bash
superagent export build
superagent export --check   # verify no drift
```

**Start a new agent run:**
```bash
superagent capture init --run-id run-$(date +%s)
```

---

## Extending the CLI

1. Add a new check file to `tooling/src/checks/` following the pattern of existing
   check modules.
2. Register it in `tooling/src/checks/command-registry.js`.
3. Wire it into `tooling/src/commands/validate.js` as a sub-command.
4. Document the new command in `docs/tooling-cli.md`.
5. Add a truth claim entry to `docs/truth-claims.yaml` so `superagent validate docs`
   can verify the documented command matches the implemented behavior.
6. Add a test in `tooling/tests/` — all commands must have automated coverage before
   they leave `reserved` status.

---

## Source Layout

```
tooling/src/
  cli.js                  Entry point, argument parsing, command dispatch
  loaders.js              YAML/JSON file readers
  schema-validator.js     AJV-backed validator (JSON Schema Draft 2020-12)
  project-root.js         Upward manifest discovery
  state-root.js           State root resolution with --state-root override
  command-options.js      Shared option definitions
  commands/
    validate.js           Validate sub-command dispatcher
  checks/
    command-registry.js   Registry of all validate sub-commands
    manifest.js           manifest check
    branches.js           branch name check
    commits.js            conventional commit check
    changelog.js          changelog structure check
    docs-truth.js         docs truth-claims check
    brand-truth.js        brand naming check
    runtime-surface.js    runtime wrapper check
  export/
    command.js            export build / --check entry
    compiler.js           canonical source collector + host package writer
  index/                  SQLite index build/refresh/search
  recall/                 Line-bounded file and symbol recall
  capture/                Run ledger: init/event/route/output/summary
  doctor/                 Full surface health check
  status/                 Run status reader
```
