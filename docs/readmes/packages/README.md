# Package Deep Dives

This directory contains detailed technical documentation for each package and plugin used by SuperAgent. Each document covers what the package is, why SuperAgent chose it specifically, how it is used in the codebase, and key patterns.

## npm Packages

These are declared in `package.json` as runtime dependencies.

| Package | Version | Purpose | README |
|---------|---------|---------|--------|
| `ajv` | `^8.18.0` | JSON Schema validation for manifests and artifacts | [ajv.md](ajv.md) |
| `gray-matter` | `^4.0.3` | YAML front-matter parsing for skill files | [gray-matter.md](gray-matter.md) |
| `yaml` | `^2.0.0` | YAML parsing for manifest and hook definition files | [yaml.md](yaml.md) |

## Built-in Node.js Modules

Used as the test runner and assertion library — zero install required.

| Module | Purpose | README |
|--------|---------|--------|
| `node:test` | Test runner replacing Jest/Vitest | [node-test.md](node-test.md) |
| `node:assert` | Assertion library (used alongside `node:test`) | [node-test.md](node-test.md) |

## Claude Code Plugins

External plugins declared as optional adapters in `superagent.manifest.yaml`. Not required for SuperAgent to function; provides an optional enhancement layer.

| Plugin | Manifest key | Purpose | README |
|--------|-------------|---------|--------|
| context-mode | `context_mode` | Context compression and sandboxed file execution | [context-mode.md](context-mode.md) |

## Dependency Philosophy

SuperAgent intentionally keeps its dependency footprint minimal:

- **Three runtime npm dependencies** — ajv, gray-matter, yaml. No framework, no HTTP client, no ORM.
- **Zero test framework dependencies** — `node:test` and `node:assert` are built-in to Node.js.
- **All plugins are optional** — context-mode is declared as `package_presence: optional` in the manifest schema. SuperAgent's core CLI works without it installed.

This philosophy means `npm install` is fast, the dependency attack surface is small, and there are no version conflicts between the test runner and the production runtime.

## Reading Order

If you are new to the SuperAgent tooling stack, read in this order:

1. [yaml.md](yaml.md) — foundational; everything starts by reading a YAML file
2. [ajv.md](ajv.md) — everything read is validated against a schema
3. [node-test.md](node-test.md) — how the tooling is tested
4. [gray-matter.md](gray-matter.md) — how skill files are structured and parsed
5. [context-mode.md](context-mode.md) — optional context optimization layer
