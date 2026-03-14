# node:test

> The built-in test runner shipped with Node.js since v18, providing `describe`, `test`, and `assert` without any external dependencies.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org/api/test.html)
[![Built-in](https://img.shields.io/badge/built--in-no%20install-blue)]()

## What is node:test?

`node:test` is the test runner built directly into Node.js. It was stabilized in Node.js v18 and provides the same structural primitives that Jest and Mocha users expect — `describe` for grouping, `test` for individual cases, `before`/`after` lifecycle hooks — but ships as part of the Node.js standard library with zero npm dependencies.

Tests are run by invoking `node --test <file>...` directly. Node discovers test files, runs them in parallel by default, and reports results in TAP (Test Anything Protocol) format or as human-readable output depending on the `--reporter` flag. There is no config file, no plugin system to configure, and no babel/esbuild transform pipeline — it runs your files exactly as Node would run any other module.

`node:assert` (also a built-in) provides the assertion library. The key methods are `assert.strictEqual`, `assert.deepStrictEqual`, `assert.match` (regex matching), `assert.ok`, `assert.throws`, and `assert.doesNotMatch`. These cover virtually every assertion SuperAgent's test suite requires.

## Why SuperAgent Uses node:test

SuperAgent is a CLI tooling package with a `"type": "module"` ESM codebase. The team chose `node:test` deliberately rather than defaulting to Jest or Vitest:

1. **Zero dependencies**: SuperAgent's `package.json` has exactly three runtime dependencies (ajv, gray-matter, yaml). A test runner adds only dev-time weight at best, but `node:test` adds nothing at all — not even a dev dependency. This keeps the package surface minimal and install times fast.

2. **No transform layer**: Jest requires either Babel or `--experimental-vm-modules` to work with ESM. Vitest handles ESM natively but bundles an entire Vite pipeline. `node --test` runs SuperAgent's ESM source files directly, exactly as `node src/cli.js` would. There is no separate build step, no source map configuration, and no module resolution differences between test and production.

3. **Built-in with the platform**: SuperAgent targets developers who already have Node.js. There is nothing to install, no version pinning to manage, and no possibility of the test runner becoming incompatible with a future Node.js release while the production code works fine.

4. **Sufficient API surface**: SuperAgent's tests are integration-style CLI tests and unit tests for pure functions. The `describe`/`test`/`assert` surface is everything needed. Mocking, snapshot testing, and parallel async test suites are not required.

## How SuperAgent Uses It

Every test file in `tooling/test/` imports from `node:test` and `node:assert`:

```js
import { describe, test } from 'node:test';
import assert from 'node:assert';
```

Tests are organized with `describe` blocks grouping related scenarios, and `test` for individual assertions:

```js
describe('superagent validate command', () => {
  test('validates the manifest from a nested working directory', () => {
    const result = runCli(['validate', 'manifest'], {
      cwd: path.join(ROOT, 'tooling'),
    });

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /manifest is valid/i);
  });

  test('rejects manifest_version 1 with targeted migration guidance', () => {
    // ...
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /manifest_version 1 is no longer supported/i);
    assert.match(result.stderr, /migrate to manifest_version 2/i);
  });
});
```

The `package.json` test script runs all active test files in a single `node --test` invocation:

```json
"test:active": "node --test tooling/test/cli.test.js tooling/test/validate.test.js tooling/test/index.test.js tooling/test/doctor-status.test.js tooling/test/guard-hooks.test.js tooling/test/export.test.js tooling/test/capture.test.js tooling/test/schema-examples.test.js tooling/test/git-flow-docs.test.js tooling/test/role-contracts.test.js tooling/test/ci-workflow.test.js"
```

Integration tests use `execFileSync` to spawn the CLI as a child process and verify its stdout, stderr, and exit code — a common pattern across all test files:

```js
function runCli(args, options = {}) {
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...args], {
      encoding: 'utf8',
      cwd: options.cwd ?? ROOT,
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}
```

Fixture setup and teardown use `try/finally` blocks because `node:test` does not have an `afterEach` that runs on failure unless you use the full lifecycle hooks API. The `finally` block ensures `fs.rmSync` always cleans up temp directories even when assertions throw.

## Key Concepts

**`node --test`**: The CLI entry point. Pass one or more file paths explicitly. Node runs each file and aggregates results. Exits with code `0` on all-pass, non-zero on any failure.

**`describe`**: A grouping block. Tests inside a `describe` share a label prefix in the output. Nesting is supported.

**`test`**: An individual test case. Receives a callback. Passes if the callback returns without throwing; fails if an assertion throws an `AssertionError` or any other error is thrown.

**`assert.strictEqual(actual, expected)`**: Uses `===` comparison. This is distinct from `assert.equal`, which uses `==`. SuperAgent always uses `strictEqual`.

**`assert.match(string, regexp)`**: Passes if the string matches the regex. Used heavily for CLI output assertions where exact text is not required but a pattern must appear.

**`assert.deepStrictEqual(actual, expected)`**: Recursively compares objects and arrays with `===` semantics for primitives. Used for structured output assertions like JSON payloads.

## API Reference (SuperAgent-relevant subset)

| API | Usage in SuperAgent |
|-----|---------------------|
| `describe(label, fn)` | Groups related tests in every test file |
| `test(label, fn)` | Every individual test case |
| `assert.strictEqual(a, b)` | Exit code checks, string equality |
| `assert.match(str, re)` | CLI stdout/stderr pattern matching |
| `assert.deepStrictEqual(a, b)` | JSON output structure assertions |
| `assert.ok(value, msg)` | Boolean truthy assertions with a message |
| `assert.throws(fn, re)` | Error-throwing assertions in `export.test.js` |
| `assert.doesNotMatch(str, re)` | Negative pattern assertions |

## Common Patterns

**CLI integration tests via `execFileSync`**: Spawn the real CLI binary, capture stdout/stderr, assert on exit code and output text. This tests the full system including argument parsing, file I/O, and error formatting — not just individual functions.

**Temp fixture directories**: Use `fs.mkdtempSync` to create isolated project roots per test, populate them with the minimal required files, run the CLI against them, and clean up with `fs.rmSync` in a `finally` block.

**`try/finally` cleanup**: Because `node:test` does not run `afterEach` on assertion failures without explicit lifecycle hook usage, wrap each fixture test in `try { ... } finally { fs.rmSync(...) }`.

**`assert.match` for CLI output**: Prefer regex over exact string comparison for CLI messages. Messages evolve; patterns are stable.

## Alternatives Considered

| Package | Why not chosen |
|---------|---------------|
| Jest | Requires Babel or `--experimental-vm-modules` for ESM; heavy dependency tree |
| Vitest | Excellent ESM support but bundles Vite, adding significant install weight |
| Mocha + Chai | Two packages instead of zero; needs ESM configuration |
| tap | TAP-native but external; `node:test` outputs TAP natively anyway |

## Resources

- [Node.js test runner documentation](https://nodejs.org/api/test.html)
- [Node.js assert documentation](https://nodejs.org/api/assert.html)
- [Node.js blog: built-in test runner](https://nodejs.org/en/blog/announcements/v18-release-announce)
