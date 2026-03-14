# First Run

This tutorial walks you through installing SuperAgent, validating your environment, building host exports, and exploring the generated structure.

## What you'll build

A SuperAgent-enabled project with a validated environment, built host exports, and a confirmed-healthy repo surface.

## Prerequisites

- **Node.js >= 18** (20+ recommended)
- **git**
- A terminal (bash, zsh, or similar)
- A project directory where you want to use SuperAgent

## Step 1: Clone and install

Clone the SuperAgent repository and install dependencies:

```bash
git clone https://github.com/MohamedAbdallah-14/super-agent.git
cd super-agent
npm install
```

Expected output (last lines):

```
added XX packages in Xs
```

This installs the minimal runtime dependencies (`ajv`, `yaml`, `gray-matter`) and the built-in CLI tooling.

## Step 2: Run doctor check

The `doctor` command validates the active repo surface in one pass:

```bash
npx superagent doctor
```

Expected output:

```
PASS manifest: Manifest is valid.
PASS hooks: Hook definitions are valid.
PASS host-exports: All required host export directories exist.
```

Doctor checks three things:
1. The manifest (`superagent.manifest.yaml`) is valid against its schema
2. Canonical hook definitions match the manifest's required hook roster
3. Host export directories exist under `exports/hosts/`

If any check fails, doctor tells you exactly which surface to fix.

## Step 3: Validate canonical sources

You can also run individual validators for more detail:

```bash
npx superagent validate manifest
```

Expected output:

```
PASS: Manifest is valid.
```

```bash
npx superagent validate hooks
```

Expected output:

```
PASS: Hook definitions are valid.
```

```bash
npx superagent validate docs
```

This checks `docs/truth-claims.yaml` for stale command claims and broken local doc links.

## Step 4: Build host exports

Generate native host packages for Claude, Codex, Gemini, and Cursor:

```bash
npx superagent export build
```

Expected output:

```
Generated host exports for claude, codex, gemini, cursor.
```

This reads canonical role files, workflow files, and the manifest, then writes host-specific packages under `exports/hosts/`:

- **Claude:** `CLAUDE.md`, `.claude/settings.json`, `.claude/agents/*`, `.claude/commands/*`
- **Codex:** `AGENTS.md`
- **Gemini:** `GEMINI.md`
- **Cursor:** `.cursor/rules/superagent-core.mdc`, `.cursor/hooks.json`

## Step 5: Verify exports are fresh

Check that generated host packages match current canonical sources:

```bash
npx superagent export --check
```

If this passes with exit code 0, your exports are in sync. If canonical sources changed after the last export, the check fails and tells you to re-run `export build`.

## Step 6: Explore the generated structure

Key directories to understand:

```
super-agent/
  roles/              # Canonical role contracts (10 roles)
  workflows/          # Phase entrypoints (14 workflows)
  skills/             # Reusable in-host procedures
  hooks/              # Hook contracts and guard scripts
  expertise/          # 255 curated domain knowledge modules
  templates/          # Artifact templates and example payloads
  schemas/            # Validation schemas (JSON Schema)
  exports/hosts/      # Generated host packages
  tooling/            # CLI source
  docs/               # Documentation (you are here)
  input/              # Operator briefing surface (read-only)
  memory/             # Learnings and experiments
```

## What's next

- **Deploy to your project:** Copy the relevant host export to your project directory. For Claude: `cp -r exports/hosts/claude/.claude ~/your-project/ && cp exports/hosts/claude/CLAUDE.md ~/your-project/`
- **For Codex:** `cp exports/hosts/codex/AGENTS.md ~/your-project/`
- **For Gemini:** `cp exports/hosts/gemini/GEMINI.md ~/your-project/`
- **For Cursor:** `cp -r exports/hosts/cursor/.cursor ~/your-project/`

Then open your AI host in your project directory. Your agent now operates with 10 canonical roles, a 14-phase delivery pipeline, and the full expertise composition engine.

## Host-specific notes

| Host | Primary export | Notes |
|------|---------------|-------|
| Claude | `CLAUDE.md` + `.claude/` | Full support including settings, agents, and commands |
| Codex | `AGENTS.md` | Single-file operating model |
| Gemini | `GEMINI.md` | Single-file operating model |
| Cursor | `.cursor/` | Rules file + hooks JSON |

Claude is the primary development host. Codex, Gemini, and Cursor exports are generated from the same canonical sources and maintain behavioral parity.
