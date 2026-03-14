# ajv

> The fastest JSON Schema validator for Node.js and browsers, supporting JSON Schema drafts 04/06/07/2019/2020.

[![npm version](https://img.shields.io/npm/v/ajv)](https://www.npmjs.com/package/ajv)
[![license](https://img.shields.io/npm/l/ajv)](https://github.com/ajv-validator/ajv/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/ajv)](https://www.npmjs.com/package/ajv)

## What is ajv?

Ajv (Another JSON Validator) is the most widely used JSON Schema validation library in the JavaScript ecosystem. It compiles JSON Schema definitions into highly optimized JavaScript validation functions at startup time rather than interpreting the schema on every call. This compilation step is what makes ajv dramatically faster than interpreted validators — benchmarks consistently show it running 10-100x faster than naive alternatives.

Ajv supports the full JSON Schema specification through multiple drafts. SuperAgent uses the `2020` draft flavor (`ajv/dist/2020.js`), which is the most modern and supports features like `$dynamicRef`, `unevaluatedProperties`, and the updated `prefixItems` array semantics.

Beyond raw validation, ajv provides structured error output via `validate.errors`: an array of objects describing exactly which path in the instance failed, which keyword triggered the failure, and what the expected value was. This makes it practical to report meaningful validation feedback rather than generic "invalid" messages.

## Why SuperAgent Uses ajv

SuperAgent's entire artifact and manifest system rests on JSON Schema contracts. Every phase artifact — from `clarification.json` to `verification-proof.json` — must conform to a schema before it can be accepted. Without reliable, fast schema validation, the system cannot enforce its contracts at the tool boundary.

ajv was chosen over alternatives for three specific reasons:

1. **Compiled validators with caching**: SuperAgent compiles each schema once and caches the resulting function in a `Map` keyed by `schema.$id`. Subsequent validations of the same schema type hit the cache and pay no re-compilation cost.
2. **Draft 2020-12 support**: The schemas in `schemas/` use `$id` URIs in the `https://superagent.dev/schemas/` namespace, a pattern encouraged by the 2020 draft. No other popular validator has first-class 2020 support in as stable a form.
3. **`allErrors` mode**: SuperAgent configures ajv with `allErrors: true` so that a single validation call surfaces every problem in the document, not just the first one. This is essential for developer feedback — when a manifest or artifact is malformed, the operator sees all issues at once.

## How SuperAgent Uses It

The entire ajv surface is encapsulated in a single module:

```js
// tooling/src/schema-validator.js
import Ajv2020 from 'ajv/dist/2020.js';

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});
const validatorCache = new Map();

function formatError(error) {
  const pointer = error.instancePath || '/';
  return `${pointer} ${error.message}`;
}

export function validateAgainstSchema(schema, data) {
  const schemaKey = schema.$id ?? JSON.stringify(schema);
  let validate = validatorCache.get(schemaKey);

  if (!validate) {
    validate = ajv.compile(schema);
    validatorCache.set(schemaKey, validate);
  }

  const valid = validate(data);

  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map(formatError),
  };
}
```

This function is called in two places in production code:

- `tooling/src/commands/validate.js` — validates `superagent.manifest.yaml` and every hook definition YAML against their respective schemas
- `tooling/src/export/compiler.js` — validates the generated `host-package.json` and `export.manifest.json` objects before they are committed to disk

In tests, `schema-examples.test.js` calls `validateAgainstSchema` directly against all 14 example templates to ensure every template document in `templates/examples/` stays in sync with its schema.

## Key Concepts

**Schema compilation**: `ajv.compile(schema)` returns a reusable `validate` function. Calling `compile` is expensive; calling the resulting function is cheap. Always compile once and cache.

**`instancePath`**: In ajv's error objects, `instancePath` is a JSON Pointer (e.g., `/project/version`) pointing to the failing node in the input data. SuperAgent formats this as the primary error label.

**`$id`**: A URI in the schema that uniquely identifies it. SuperAgent uses `$id` as the cache key because it is stable across calls, while `JSON.stringify(schema)` is the fallback for inline schemas without an `$id`.

**`strict: false`**: Disables ajv's strict mode, which would reject schemas using unknown keywords. SuperAgent schemas use standard keywords only, but this option avoids surprises during schema iteration.

**`validateFormats: false`**: Format validation (e.g., `"format": "uri"`) is disabled because it requires an additional package and is not needed for SuperAgent's structural contracts.

## API Reference (SuperAgent-relevant subset)

| API | Usage in SuperAgent |
|-----|---------------------|
| `new Ajv2020(options)` | Instantiated once as a module-level singleton |
| `ajv.compile(schema)` | Called once per unique schema, result cached |
| `validate(data)` | Called on every artifact/manifest to be validated |
| `validate.errors` | Inspected when `validate()` returns `false` |
| `error.instancePath` | Used as the human-readable location prefix in error messages |
| `error.message` | The human-readable failure description from the keyword |

## Common Patterns

**Singleton + compile cache**: Create one `Ajv` instance for the entire process. Cache compiled validators by `$id`. This is the pattern used in `schema-validator.js` and is the recommended production approach.

**Structured error surfacing**: Map `validate.errors` to strings before returning. Never expose the raw ajv error objects to callers — they contain internal implementation details that change across versions.

**Schema-first contracts**: Every artifact type in SuperAgent is defined by a JSON Schema before any code produces or consumes it. The schema is the contract; the validator is the enforcement mechanism.

## Alternatives Considered

| Package | Why not chosen |
|---------|---------------|
| `zod` | TypeScript-first, runtime overhead from object construction, no JSON Schema interoperability |
| `joi` | Custom schema language, not JSON Schema standard, harder to share schemas with non-JS consumers |
| `jsonschema` | Older, slower, no 2020-12 draft support |
| Native `JSON.parse` + manual checks | No schema language, no reuse, no standard tooling |

## Resources

- [Official documentation](https://ajv.js.org/)
- [GitHub](https://github.com/ajv-validator/ajv)
- [npm](https://www.npmjs.com/package/ajv)
- [JSON Schema 2020-12 specification](https://json-schema.org/draft/2020-12/json-schema-core.html)
