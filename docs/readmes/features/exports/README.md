# Host Exports

SuperAgent's export system compiles canonical role, workflow, and hook sources into
ready-to-deploy host packages for **Claude, Codex, Gemini, and Cursor**. Each host
gets a package shaped for its native integration model — no manual copying, no hand-
editing, no drift.

---

## What Host Exports Are

Every AI host has its own convention for loading agent instructions:

- Claude reads `CLAUDE.md`, `.claude/agents/`, and `.claude/commands/`
- Codex reads `AGENTS.md`
- Gemini reads `GEMINI.md`
- Cursor reads `.cursor/rules/` and `.cursor/hooks.json`

The export system generates all of these from a single set of canonical sources.
The canonical sources are the ground truth. The exports are derived artifacts.

**You never edit files in `exports/hosts/*` by hand.** Run `superagent export build`
and the compiler overwrites them from the canonical sources.

---

## Supported Hosts

| Host | Output path | Key files |
|---|---|---|
| Claude | `exports/hosts/claude/` | `CLAUDE.md`, `.claude/agents/*`, `.claude/commands/*`, `.claude/settings.json` |
| Codex | `exports/hosts/codex/` | `AGENTS.md` |
| Gemini | `exports/hosts/gemini/` | `GEMINI.md` |
| Cursor | `exports/hosts/cursor/` | `.cursor/rules/superagent-core.mdc`, `.cursor/hooks.json` |

---

## How Packages Are Generated

```
superagent export build
        │
        ▼
1. Validate superagent.manifest.yaml
        │
        ▼
2. Validate canonical hook definitions
        │
        ▼
3. Collect canonical sources
   ┌────────────────────────────────┐
   │ superagent.manifest.yaml       │
   │ roles/*.md  (9 role files)     │
   │ workflows/*.md (13 workflows)  │
   │ hooks/definitions/*.yaml       │
   └────────────────────────────────┘
        │
        ▼
4. SHA-256 hash each source file
        │
        ▼
5. For each host in export_targets:
   ├── Render host-specific package files
   ├── Write host-package.json  (sources + file list)
   └── Write export.manifest.json  (source hashes)
        │
        ▼
   exports/hosts/<host>/
```

The compiler (`tooling/src/export/compiler.js`) does not template files — it reads the
canonical Markdown directly and writes it into the host-appropriate directory structure.
This means roles and workflows appear verbatim in each host package.

---

## What Is Included in Each Package

### Claude

```
exports/hosts/claude/
  CLAUDE.md                      Project bootstrap + canonical facts
  .claude/agents/clarifier.md
  .claude/agents/designer.md
  .claude/agents/executor.md
  .claude/agents/learner.md
  .claude/agents/planner.md
  .claude/agents/researcher.md
  .claude/agents/reviewer.md
  .claude/agents/specifier.md
  .claude/agents/verifier.md
  .claude/commands/clarify.md
  .claude/commands/design.md
  .claude/commands/design-review.md
  .claude/commands/discover.md
  .claude/commands/execute.md
  .claude/commands/learn.md
  .claude/commands/plan.md
  .claude/commands/plan-review.md
  .claude/commands/prepare-next.md
  .claude/commands/review.md
  .claude/commands/spec-challenge.md
  .claude/commands/specify.md
  .claude/commands/verify.md
  .claude/settings.json
  export.manifest.json           Source hashes for drift detection
  host-package.json              Source list + generated file list
```

### Codex

```
exports/hosts/codex/
  AGENTS.md                      Single combined instruction file
  export.manifest.json
  host-package.json
```

### Gemini

```
exports/hosts/gemini/
  GEMINI.md                      Single combined instruction file
  export.manifest.json
  host-package.json
```

### Cursor

```
exports/hosts/cursor/
  .cursor/rules/superagent-core.mdc
  .cursor/hooks.json
  export.manifest.json
  host-package.json
```

---

## Drift Detection

Every export includes `export.manifest.json` — a map of canonical source paths to
their SHA-256 hashes at the time of the last build:

```json
{
  "host": "claude",
  "source_hashes": {
    "superagent.manifest.yaml": "63d162af...",
    "roles/clarifier.md": "5e59e8e7...",
    "workflows/clarify.md": "93034dce...",
    ...
  }
}
```

`superagent export --check` re-hashes the current canonical sources and compares them
against the stored hashes. If any source has changed since the last build, the check
fails non-zero — catching stale exports before they reach CI or production.

**Recommended CI workflow:**

```bash
# In CI, after any change to roles/, workflows/, or hooks/
superagent export --check
# Fails if exports are out of date — developer must run `export build` and commit
```

---

## Using Exports in Your Project

### Claude

Copy the contents of `exports/hosts/claude/` into your project root:

```bash
cp -r exports/hosts/claude/.claude /your/project/
cp exports/hosts/claude/CLAUDE.md /your/project/
```

Claude will automatically load `CLAUDE.md` as its system context and discover agents
and commands under `.claude/`.

### Codex

```bash
cp exports/hosts/codex/AGENTS.md /your/project/
```

### Gemini

```bash
cp exports/hosts/gemini/GEMINI.md /your/project/
```

### Cursor

```bash
cp -r exports/hosts/cursor/.cursor /your/project/
```

---

## Protected Paths

`exports/hosts/` is declared as a protected path in `superagent.manifest.yaml`. The
`protected_path_write_guard` hook prevents agents from writing directly to this
directory. All changes must flow through `superagent export build`.

---

## Commands

| Command | Description |
|---|---|
| `superagent export build` | Compile all host packages from canonical sources |
| `superagent export --check` | Verify packages are current; exits non-zero on drift |

Both commands resolve the project root automatically by walking upward to find
`superagent.manifest.yaml`.
