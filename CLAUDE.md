# SuperAgent Project Instructions

SuperAgent is a host-native engineering OS kit for Claude, Codex, Gemini, and Cursor.

## Working rules

- `roles/` defines canonical role contracts
- `workflows/` defines phase entrypoints
- default live run state lives outside the repo under `~/.superagent/projects/<project-slug>/`
- generated host exports come from canonical sources
- TDD, conventional commits, and verification-before-completion are mandatory
- use isolated feature branches

## Key references

- `superagent.manifest.yaml` — project manifest and schema
- `docs/concepts/architecture.md` — system architecture
- `docs/concepts/roles-and-workflows.md` — role and phase concepts
- `docs/reference/roles-reference.md` — role and workflow lookup tables
