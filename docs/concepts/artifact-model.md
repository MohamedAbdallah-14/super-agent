# Artifact Model

SuperAgent separates operator input, committed repo artifacts, and live run state.

## Human Truth

- `input/` is the read-only operator briefing surface.

## Default Live Run State

Default run state lives outside the repo:

- `~/.superagent/projects/<project-slug>/runs/<run-id>/`

Typical run contents:

- `manifest.json`
- `sources.json`
- phase subdirectories such as `clarify/`, `plan/`, `verify/`, `review/`
- `status.json`
- `events.ndjson`
- `summary.md`

## Committed Repo Artifacts

Use `artifacts/` only for committed evidence such as:

- release evidence
- checked-in examples

## Artifact Rules

- every artifact should declare phase, role, run ID, timestamp, sources, status, and loop number
- non-trivial claims must cite a source file, source URL, or verification command
- approval-gated artifacts must record approval status and approver when relevant
- scratch work must not be confused with durable artifacts
- learnings belong in `memory/`, not in fresh-run source truth

## Templates

Canonical starting points live under:

- `templates/artifacts/*.md`
- `templates/artifacts/*.json`

Those templates define the minimum metadata for clarification, research, specs, plan review, execution notes, verification, review, learning promotion, and next-run handoff artifacts.

## Repo-Local Override

Repo-local run state is opt-in only. If an operator deliberately uses a repo-local override, the recommended path is:

- `.superagent-state/`

That path must remain gitignored so a normal run still leaves `git status` clean.

## Retention

- keep committed `artifacts/` focused on release evidence and checked-in examples
- archive stale or disproven learnings instead of rewriting history in place
- prune external run-state captures when they no longer provide audit or debugging value
