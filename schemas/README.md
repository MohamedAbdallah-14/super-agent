# schemas/

This directory holds machine-verifiable schemas for SuperAgent control files and artifacts.

Allowed:

- manifest schema
- hook schema
- artifact schemas
- export package schemas

Not allowed:

- prose-only contracts without machine validation
- generated runtime state

Rules:

- Canonical control files and artifacts validate here before export or release.
- Schema changes require corresponding template and docs updates.
- Additive changes should preserve existing valid artifacts and keep `manifest_version` stable.
- Breaking schema or manifest contract changes must update `manifest_version`, docs, templates, and verification in the same change.
- Breaking manifest bumps must also ship explicit upgrade guidance so older manifests fail with actionable errors instead of opaque schema-only messages.
- Schema-backed examples under `templates/examples/` must stay valid under automated tests.
