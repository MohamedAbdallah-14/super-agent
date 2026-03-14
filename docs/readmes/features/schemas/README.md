# Schema Validation System

SuperAgent enforces artifact quality through a suite of **JSON Schema Draft 2020-12**
schemas. Every phase output — from a clarification through a review — must satisfy its
schema before it can be used as a source for the next phase or included in a host export.

Schemas prevent fake-green states: an artifact that looks complete but is missing required
fields fails loudly at validation time rather than silently corrupting downstream phases.

---

## How It Works

```
Canonical source file                 Schema file
(roles/*.md, artifacts, manifest)     (schemas/*.schema.json)
         │                                      │
         └──────────────┬───────────────────────┘
                        ▼
              schema-validator.js
              (AJV, draft 2020-12)
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
    PASS (exit 0)              FAIL (exit 1)
    artifact accepted          actionable error output
                               with field path + message
```

The validator is called by `superagent validate manifest`, `superagent export build`,
and individual `superagent validate *` checks. It is also exercised by the full test
suite via schema-backed example fixtures in `templates/examples/`.

---

## Schema Catalog

| Schema file | Title | Required by |
|---|---|---|
| `superagent-manifest.schema.json` | SuperAgent Manifest v2 | `validate manifest`, `export build` |
| `hook.schema.json` | Hook Definition | `validate hooks` |
| `spec.schema.json` | Spec Artifact | `specifier` role output |
| `implementation-plan.schema.json` | Implementation Plan Artifact | `planner` role output |
| `review.schema.json` | Review Artifact | `reviewer` role output |
| `verification-proof.schema.json` | Verification Proof | `verifier` role output |
| `design-artifact.schema.json` | Design Artifact | `designer` role output |
| `clarification.schema.json` | Clarification Artifact | `clarifier` role output |
| `research.schema.json` | Research Artifact | `researcher` role output |
| `spec-challenge.schema.json` | Spec Challenge Artifact | `spec_challenge` workflow |
| `run-manifest.schema.json` | Run Manifest | `capture init` |
| `export-manifest.schema.json` | Export Manifest | `export build` output |
| `host-export-package.schema.json` | Host Export Package | per-host `host-package.json` |
| `docs-claim.schema.json` | Docs Truth Claim | `validate docs` + `docs/truth-claims.yaml` |
| `proposed-learning.schema.json` | Proposed Learning | `learner` role output |
| `accepted-learning.schema.json` | Accepted Learning | `learn` workflow approval |

---

## Required Fields Pattern

All artifact schemas share a common envelope of required fields:

```json
{
  "phase":       "specify",           // must match exactly the declaring phase
  "role":        "specifier",         // must match exactly the declaring role
  "run_id":      "abc-123",           // ties the artifact to a specific run
  "created_at":  "2026-03-13T...",    // ISO 8601 datetime
  "sources":     ["input/brief.md"],  // files this artifact was derived from
  "status":      "approved",          // current lifecycle state
  "loop_number": 0                    // tracks refinement iteration
}
```

Phase-specific fields are added on top. For example, `spec.schema.json` also requires
`requirements`, `acceptance_criteria`, and `approval`. `review.schema.json` requires
a `findings` array where each entry carries a `severity` and `title`.

---

## Schema Rules

From `schemas/README.md` — these rules are enforced by convention and CI:

- **Additive changes** preserve existing valid artifacts and keep `manifest_version` stable.
- **Breaking changes** must update `manifest_version`, docs, templates, and verification
  in the same change set.
- **Breaking manifest bumps** must ship explicit upgrade guidance so older manifests fail
  with actionable errors rather than opaque schema-only messages.
- **Schema-backed examples** under `templates/examples/` must stay valid under automated
  tests — they serve as both documentation and regression fixtures.
- **No prose-only contracts** — if a contract cannot be machine-validated, it does not
  belong in `schemas/`.

---

## Validating Against a Schema

**Via CLI (recommended):**

```bash
# Validate the project manifest
superagent validate manifest

# Validate canonical hook definitions
superagent validate hooks

# Validate docs truth claims and markdown links
superagent validate docs

# Run all checks at once
superagent doctor
```

**Programmatic (Node.js):**

```js
import { validateAgainstSchema } from './tooling/src/schema-validator.js';
import { readJsonFile } from './tooling/src/loaders.js';

const artifact = readJsonFile('path/to/my-spec.json');
const result = validateAgainstSchema(artifact, 'spec');
if (!result.valid) {
  console.error(result.errors);
}
```

**With a JSON Schema tool (standalone):**

```bash
npx ajv validate \
  -s schemas/spec.schema.json \
  -d path/to/my-spec.json \
  --spec=draft2020
```

---

## Example Validation Workflow

```
1. specifier produces spec artifact (YAML/JSON)
        │
        ▼
2. superagent validate manifest          ← manifest gates export
        │
        ▼
3. spec artifact validated against       ← spec.schema.json
   spec.schema.json on phase handoff
        │
        ▼
4. planner reads approved spec,
   produces implementation-plan artifact
        │
        ▼
5. plan artifact validated against        ← implementation-plan.schema.json
   implementation-plan.schema.json
        │
        ▼
6. superagent export build               ← validates + hashes all canonical sources
        │
        ▼
7. CI: superagent export --check         ← fails if canonical sources changed since build
```

---

## Adding a New Schema

1. Create `schemas/<artifact-name>.schema.json` using JSON Schema Draft 2020-12.
2. Include the common envelope fields (`phase`, `role`, `run_id`, `created_at`,
   `sources`, `status`, `loop_number`) as required.
3. Add a corresponding example fixture to `templates/examples/` and verify it passes
   under `npm test`.
4. Register any new `validate` sub-command in `tooling/src/checks/command-registry.js`
   and document it in `docs/tooling-cli.md` + `docs/truth-claims.yaml`.
5. If the change is breaking, bump `manifest_version` in `superagent-manifest.schema.json`
   and write upgrade guidance in `docs/`.
