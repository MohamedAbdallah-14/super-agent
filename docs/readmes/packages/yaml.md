# yaml

> A fully-featured YAML 1.2 parser and serializer for JavaScript, with support for all YAML types, custom tags, and streaming.

[![npm version](https://img.shields.io/npm/v/yaml)](https://www.npmjs.com/package/yaml)
[![license](https://img.shields.io/npm/l/yaml)](https://github.com/eemeli/yaml/blob/main/LICENSE)
[![downloads](https://img.shields.io/npm/dm/yaml)](https://www.npmjs.com/package/yaml)

## What is yaml?

The `yaml` package (published by Eemeli Aro) is the most complete YAML 1.2 implementation in JavaScript. It goes beyond the YAML 1.1 subset that many older parsers handle and correctly implements the full 1.2 specification — including proper boolean handling (`true`/`false` only, not `yes`/`no`), correct integer/float parsing, null semantics, and multi-document streams.

Unlike `js-yaml`, the `yaml` package provides a full document object model (DOM): you can parse YAML into an AST, inspect and modify nodes, and then serialize back to YAML while preserving comments, formatting hints, and custom tags. For SuperAgent's use case — reading manifest and hook definition files — only the `YAML.parse()` surface is needed, but the underlying fidelity of the parser matters for correctness.

The package is ESM-native, ships with TypeScript types, and has zero runtime dependencies, making it appropriate for a lean CLI tool like SuperAgent that must install and run quickly.

## Why SuperAgent Uses yaml

SuperAgent's primary configuration artifact is `superagent.manifest.yaml` — a YAML file declaring the project's hosts, workflows, phases, roles, protected paths, and adapter configuration. Every validation, export, and status command starts by reading this file with `YAML.parse()`.

The `yaml` package was chosen over alternatives for these reasons:

1. **YAML 1.2 compliance**: `superagent.manifest.yaml` uses plain YAML 1.2 constructs without `yes`/`no` booleans or YAML 1.1 edge cases, but having a parser that correctly handles the spec avoids subtle future bugs as schemas evolve.
2. **ESM native**: SuperAgent's `package.json` declares `"type": "module"`, which means all imports are ESM. The `yaml` package ships a proper ESM entry point (`import YAML from 'yaml'`). `js-yaml` requires an additional import path dance in ESM contexts.
3. **Clear error messages**: When `YAML.parse()` encounters a malformed file, it throws a `YAMLParseError` with a line/column pointer and an excerpt of the offending content — far more actionable than `js-yaml`'s generic messages.
4. **Actively maintained**: The package receives regular updates and the maintainer is responsive to spec compliance issues.

## How SuperAgent Uses It

All YAML file reading is consolidated in a single loader function:

```js
// tooling/src/loaders.js
import YAML from 'yaml';
import fs from 'node:fs';

export function readYamlFile(filePath) {
  return YAML.parse(fs.readFileSync(filePath, 'utf8'));
}
```

This function is imported by every module that needs to read YAML:

- `tooling/src/commands/validate.js` — reads `superagent.manifest.yaml` and all hook definition files in `hooks/definitions/*.yaml`
- `tooling/src/export/compiler.js` — reads `superagent.manifest.yaml` to drive the host export build
- `tooling/test/validate.test.js` and `tooling/test/schema-examples.test.js` — read YAML example templates to validate against schemas

The `listYamlFiles` helper in `loaders.js` pairs with `readYamlFile` to enumerate and read entire directories of YAML files:

```js
export function listYamlFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.yaml') || entry.endsWith('.yml'))
    .sort()
    .map((entry) => path.join(dirPath, entry));
}
```

Hook definition files (`hooks/definitions/*.yaml`) are loaded this way — the validator enumerates all files, reads each with `readYamlFile`, then validates each against the hook JSON Schema.

In the test suite, the YAML example template for the manifest is read and validated end-to-end:

```js
// tooling/test/schema-examples.test.js
['templates/examples/superagent-manifest.example.yaml', 'schemas/superagent-manifest.schema.json', 'yaml'],
// ...
function loadExample(examplePath, kind) {
  return kind === 'yaml' ? readYamlFile(absolutePath) : readJsonFile(absolutePath);
}
```

## Key Concepts

**`YAML.parse(string)`**: The primary API. Parses a YAML string and returns a plain JavaScript value (object, array, string, number, boolean, or null). Throws `YAMLParseError` on invalid input.

**`YAML.stringify(value)`**: Serializes a JavaScript value to a YAML string. SuperAgent does not currently use this, but it is the correct way to write YAML programmatically.

**YAML 1.2 vs 1.1**: The critical difference is boolean parsing. YAML 1.1 treats `yes`, `no`, `on`, `off` as booleans; YAML 1.2 does not. SuperAgent schemas use explicit `true`/`false` to stay 1.2-safe.

**Document object model**: `YAML.parseDocument()` returns a `Document` node with full AST access, preserving comments. SuperAgent does not need this — `YAML.parse()` returning a plain object is sufficient.

## API Reference (SuperAgent-relevant subset)

| API | Usage in SuperAgent |
|-----|---------------------|
| `YAML.parse(string)` | Reads every `.yaml` file in the tooling — manifests, hooks, example templates |
| `YAML.stringify(value)` | Not currently used; available for future YAML generation |
| `YAMLParseError` | Thrown on malformed YAML; surfaces file path and line number in error messages |

## Common Patterns

**Centralized loader**: Never call `YAML.parse()` directly in feature modules. Keep it in `loaders.js` so that error handling, encoding, and the import can be changed in one place.

**Parse-then-validate**: SuperAgent always passes the result of `readYamlFile()` immediately to `validateAgainstSchema()`. YAML parsing catches syntax errors; JSON Schema validation catches semantic errors. These are two distinct failure modes.

**Consistent file sorting**: `listYamlFiles` sorts file names before returning them. This ensures that validation and export produce deterministic results regardless of filesystem ordering, which matters for reproducible builds and test stability.

## Alternatives Considered

| Package | Why not chosen |
|---------|---------------|
| `js-yaml` | YAML 1.1 only, requires import path workaround in strict ESM, less clear parse errors |
| `yamljs` | Abandoned, YAML 1.1, known compliance bugs |
| `@humanwhocodes/momoa` | JSON/JSONC only, not YAML |
| Inline `JSON.parse` with `.yaml` extension | Not YAML — SuperAgent configs use YAML intentionally for readability |

## Resources

- [Official documentation](https://eemeli.org/yaml/)
- [GitHub](https://github.com/eemeli/yaml)
- [npm](https://www.npmjs.com/package/yaml)
- [YAML 1.2 specification](https://yaml.org/spec/1.2.2/)
