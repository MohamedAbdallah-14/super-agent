---
name: scan-project
description: Build a project profile from manifests, docs, tests, and `input/` so clarification and planning start from evidence.
---

# Scan Project

Inspect the smallest set of repo surfaces needed to answer:

- what kind of project this is
- which languages and toolchains are active
- how verification is expected to work
- where the relevant product and architecture docs live
- what constraints appear in `input/`

Required output:

- a concise project profile with file references
- open unknowns that require research or clarification

Rules:

- prefer manifests, scripts, CI config, and current docs over assumptions
- treat inactive surfaces as historical context only
