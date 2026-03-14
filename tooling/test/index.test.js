import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getIndexDatabasePath } from '../src/state-root.js';
import * as storage from '../src/index/storage.js';

function createTempStateRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-storage-'));
  return { stateRoot: dir, cleanup() { fs.rmSync(dir, { recursive: true, force: true }); } };
}

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CLI_PATH = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const BASE_MANIFEST_PATHS = {
  input: 'input',
  artifacts_repo: 'artifacts_repo',
  roles: 'roles',
  workflows: 'workflows',
  skills: 'skills',
  hooks: 'hooks',
  templates: 'templates',
  schemas: 'schemas',
  expertise: 'expertise',
  docs: 'docs',
  exports: 'exports',
  tooling: 'tooling',
  memory: 'memory',
  examples: 'examples',
  archive: 'archive',
  state_root_default: '~/.superagent/projects/{project_slug}',
};

function runCli(args, options = {}) {
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...args], {
      encoding: 'utf8',
      cwd: options.cwd,
    });

    return {
      exitCode: 0,
      stdout,
      stderr: '',
    };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}

function createIndexFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-index-'));
  const stateRoot = path.join(fixtureRoot, '.state-root');

  for (const relativePath of Object.values(BASE_MANIFEST_PATHS)) {
    if (relativePath.startsWith('~') || relativePath.includes('{')) {
      continue;
    }

    fs.mkdirSync(path.join(fixtureRoot, relativePath), { recursive: true });
  }

  fs.mkdirSync(path.join(fixtureRoot, 'src'), { recursive: true });

  const manifest = {
    manifest_version: 2,
    project: {
      name: 'fixture-index',
      display_name: 'Fixture Index',
      version: '0.1.0',
      description: 'Fixture manifest for index tests.',
      license: 'MIT',
    },
    versioning_policy: {
      strategy: 'semver',
      stability: 'pre-1.0-alpha',
      compatibility: 'additive_changes_only_until_manifest_bump',
    },
    paths: BASE_MANIFEST_PATHS,
    hosts: ['claude'],
    workflows: ['clarify'],
    phases: ['clarify'],
    roles: ['clarifier'],
    export_targets: ['claude'],
    required_hooks: ['session_start'],
    protected_paths: ['input'],
    prohibited_terms: ['agent-os', 'daemon'],
    adapters: {
      context_mode: {
        enabled_by_default: false,
        required: false,
        install_mode: 'external',
        package_presence: 'optional',
      },
    },
    index: {
      core_parsers: [],
      optional_language_plugins: [],
    },
    validation_checks: [],
  };

  fs.writeFileSync(
    path.join(fixtureRoot, 'superagent.manifest.yaml'),
    JSON.stringify(manifest, null, 2),
  );

  fs.writeFileSync(
    path.join(fixtureRoot, 'docs', 'guide.md'),
    [
      '# Guide',
      'Intro line',
      '## Install',
      'Install details',
      '## Usage',
      'Usage details',
      '',
    ].join('\n'),
  );

  fs.writeFileSync(
    path.join(fixtureRoot, 'src', 'widget.js'),
    [
      'export function makeWidget(name) {',
      '  return { name };',
      '}',
      '',
      'export class WidgetStore {',
      '  get(name) {',
      '    return makeWidget(name);',
      '  }',
      '}',
      '',
    ].join('\n'),
  );

  fs.writeFileSync(
    path.join(fixtureRoot, 'schemas', 'shape.json'),
    JSON.stringify({ title: 'Shape', type: 'object' }, null, 2),
  );

  return {
    fixtureRoot,
    stateRoot,
    cleanup() {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    },
  };
}

describe('superagent index and recall commands', () => {
  test('builds an index and reports stats', () => {
    const fixture = createIndexFixture();

    try {
      const buildResult = runCli(['index', 'build', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(buildResult.exitCode, 0);

      const buildSummary = JSON.parse(buildResult.stdout);
      assert.ok(buildSummary.file_count >= 3);
      assert.ok(buildSummary.symbol_count >= 2);
      assert.ok(buildSummary.outline_count >= 3);

      const statsResult = runCli(['index', 'stats', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(statsResult.exitCode, 0);

      const stats = JSON.parse(statsResult.stdout);
      assert.strictEqual(stats.file_count, buildSummary.file_count);
      assert.strictEqual(stats.symbol_count, buildSummary.symbol_count);
    } finally {
      fixture.cleanup();
    }
  });

  test('returns exact markdown outlines from the built index', () => {
    const fixture = createIndexFixture();

    try {
      const buildResult = runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(buildResult.exitCode, 0);

      const outlineResult = runCli(
        ['index', 'get-file-outline', 'docs/guide.md', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(outlineResult.exitCode, 0);

      const outline = JSON.parse(outlineResult.stdout);
      assert.deepStrictEqual(
        outline.entries.map((entry) => entry.label),
        ['Guide', 'Install', 'Usage'],
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('searches symbols and recalls an exact symbol slice', () => {
    const fixture = createIndexFixture();

    try {
      const buildResult = runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(buildResult.exitCode, 0);

      const searchResult = runCli(
        ['index', 'search-symbols', 'makeWidget', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(searchResult.exitCode, 0);
      const matches = JSON.parse(searchResult.stdout);
      assert.strictEqual(matches.results.length, 1);
      assert.strictEqual(matches.results[0].name, 'makeWidget');

      const recallResult = runCli(
        ['recall', 'symbol', 'makeWidget', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(recallResult.exitCode, 0);
      const recall = JSON.parse(recallResult.stdout);
      assert.match(recall.slice, /export function makeWidget/);
      assert.strictEqual(recall.line_start, 1);
    } finally {
      fixture.cleanup();
    }
  });

  test('refreshes changed files without a full rebuild', () => {
    const fixture = createIndexFixture();

    try {
      const buildResult = runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(buildResult.exitCode, 0);

      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        [
          'export function makeWidget(name) {',
          '  return { name };',
          '}',
          '',
          'export function makeWidgetFromId(id) {',
          '  return makeWidget(String(id));',
          '}',
          '',
        ].join('\n'),
      );

      const refreshResult = runCli(['index', 'refresh', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(refreshResult.exitCode, 0);
      const refreshSummary = JSON.parse(refreshResult.stdout);
      assert.ok(refreshSummary.updated_file_count >= 1);

      const searchResult = runCli(
        ['index', 'search-symbols', 'makeWidgetFromId', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(searchResult.exitCode, 0);
      const matches = JSON.parse(searchResult.stdout);
      assert.strictEqual(matches.results[0].name, 'makeWidgetFromId');
    } finally {
      fixture.cleanup();
    }
  });
});

// 20 specified tests
describe('summary storage primitives', () => {
  test('schema creates summaries and symbol_summaries tables with indexes', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('summaries', 'symbol_summaries') ORDER BY name",
      ).all();
      assert.deepStrictEqual(
        tables.map((r) => r.name),
        ['summaries', 'symbol_summaries'],
      );

      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('idx_summaries_file_id', 'idx_symbol_summaries_file_id') ORDER BY name",
      ).all();
      assert.deepStrictEqual(
        indexes.map((r) => r.name),
        ['idx_summaries_file_id', 'idx_symbol_summaries_file_id'],
      );

      // Verify summaries table columns
      const summCols = db.prepare('PRAGMA table_info(summaries)').all();
      const summColNames = summCols.map((c) => c.name).sort();
      assert.deepStrictEqual(summColNames, [
        'content', 'content_hash', 'file_id', 'generated_at',
        'generator', 'source_hash', 'summary_id', 'tier',
      ]);

      // Verify symbol_summaries table columns
      const symCols = db.prepare('PRAGMA table_info(symbol_summaries)').all();
      const symColNames = symCols.map((c) => c.name).sort();
      assert.deepStrictEqual(symColNames, [
        'content', 'content_hash', 'file_id', 'generated_at',
        'generator', 'source_hash', 'summary_id', 'symbol_id', 'tier',
      ]);

      db.close();
    } finally {
      tmp.cleanup();
    }
  });

  test('upsertFileSummary and readFileSummary round-trip in standalone mode', () => {
    const tmp = createTempStateRoot();

    try {
      // First, create a file record so the FK constraint is satisfied
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/app.js', 'javascript', 100, 10, 'abc123', '2024-01-01T00:00:00.000Z')
      `).run();
      db.close();

      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L0', 'File summary content', 'abc123', 'heuristic');

      const result = storage.readFileSummary(tmp.stateRoot, 'f1', 'L0');
      assert.ok(result, 'should return a row');
      assert.strictEqual(result.content, 'File summary content');
      assert.strictEqual(result.source_hash, 'abc123');
      assert.strictEqual(result.generator, 'heuristic');
      assert.strictEqual(result.tier, 'L0');
      assert.ok(result.generated_at, 'should have generated_at timestamp');
      assert.ok(result.summary_id, 'should have summary_id');
      assert.ok(result.content_hash, 'should have content_hash');
    } finally {
      tmp.cleanup();
    }
  });

  test('upsertFileSummary overwrites existing summary for same file_id and tier', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/app.js', 'javascript', 100, 10, 'abc123', '2024-01-01T00:00:00.000Z')
      `).run();
      db.close();

      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L0', 'First version', 'abc123', 'heuristic');
      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L0', 'Updated version', 'def456', 'heuristic');

      const result = storage.readFileSummary(tmp.stateRoot, 'f1', 'L0');
      assert.strictEqual(result.content, 'Updated version');
      assert.strictEqual(result.source_hash, 'def456');
    } finally {
      tmp.cleanup();
    }
  });

  test('readFileSummary returns null for non-existent row', () => {
    const tmp = createTempStateRoot();

    try {
      const result = storage.readFileSummary(tmp.stateRoot, 'no-such-file', 'L0');
      assert.strictEqual(result, null);
    } finally {
      tmp.cleanup();
    }
  });

  test('upsertSymbolSummary and readSymbolSummary round-trip in standalone mode', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/app.js', 'javascript', 100, 10, 'abc123', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/app.js', 'myFunc', 'function', 'function myFunc()', 1, 5)
      `).run();
      db.close();

      storage.upsertSymbolSummary(tmp.stateRoot, 's1', 'L1', 'Symbol summary text', 'abc123', 'heuristic');

      const result = storage.readSymbolSummary(tmp.stateRoot, 's1', 'L1');
      assert.ok(result, 'should return a row');
      assert.strictEqual(result.content, 'Symbol summary text');
      assert.strictEqual(result.source_hash, 'abc123');
      assert.strictEqual(result.generator, 'heuristic');
      assert.strictEqual(result.tier, 'L1');
      assert.strictEqual(result.file_id, 'f1');
      assert.ok(result.summary_id, 'should have summary_id');
      assert.ok(result.content_hash, 'should have content_hash');
      assert.ok(result.generated_at, 'should have generated_at timestamp');
    } finally {
      tmp.cleanup();
    }
  });

  test('upsertSymbolSummary overwrites existing summary for same symbol_id and tier', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/app.js', 'javascript', 100, 10, 'abc123', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/app.js', 'myFunc', 'function', 'function myFunc()', 1, 5)
      `).run();
      db.close();

      storage.upsertSymbolSummary(tmp.stateRoot, 's1', 'L0', 'First version', 'abc123', 'heuristic');
      storage.upsertSymbolSummary(tmp.stateRoot, 's1', 'L0', 'Updated version', 'def456', 'heuristic');

      const result = storage.readSymbolSummary(tmp.stateRoot, 's1', 'L0');
      assert.strictEqual(result.content, 'Updated version');
      assert.strictEqual(result.source_hash, 'def456');
    } finally {
      tmp.cleanup();
    }
  });

  test('readSymbolSummary returns null for non-existent row', () => {
    const tmp = createTempStateRoot();

    try {
      const result = storage.readSymbolSummary(tmp.stateRoot, 'no-such-symbol', 'L0');
      assert.strictEqual(result, null);
    } finally {
      tmp.cleanup();
    }
  });

  test('readSummaryStats returns null when no summaries exist', () => {
    const tmp = createTempStateRoot();

    try {
      const result = storage.readSummaryStats(tmp.stateRoot);
      assert.strictEqual(result, null);
    } finally {
      tmp.cleanup();
    }
  });

  test('readSummaryStats returns correct counts after inserting summaries', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f2', 'src/b.js', 'javascript', 200, 20, 'h2', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/a.js', 'fn1', 'function', 'function fn1()', 1, 3)
      `).run();
      db.close();

      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L0', 'summary f1 L0', 'h1', 'heuristic');
      storage.upsertFileSummary(tmp.stateRoot, 'f2', 'L0', 'summary f2 L0', 'h2', 'heuristic');
      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L1', 'summary f1 L1', 'h1', 'heuristic');
      storage.upsertSymbolSummary(tmp.stateRoot, 's1', 'L0', 'sym summary', 'h1', 'heuristic');

      const stats = storage.readSummaryStats(tmp.stateRoot);
      assert.ok(stats, 'should not be null');
      assert.deepStrictEqual(stats.file_summaries, { L0: 2, L1: 1 });
      assert.deepStrictEqual(stats.symbol_summaries, { L0: 1, L1: 0 });
      assert.deepStrictEqual(stats.generators, { heuristic: 4 });
    } finally {
      tmp.cleanup();
    }
  });

  test('listIndexedFiles returns all file rows', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f2', 'src/b.js', 'javascript', 200, 20, 'h2', '2024-01-01T00:00:00.000Z')
      `).run();
      db.close();

      const files = storage.listIndexedFiles(tmp.stateRoot);
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0].file_id, 'f1');
      assert.strictEqual(files[0].relative_path, 'src/a.js');
      assert.strictEqual(files[0].content_hash, 'h1');
      assert.strictEqual(files[0].language, 'javascript');
      assert.strictEqual(files[0].line_count, 10);
      assert.strictEqual(files[1].file_id, 'f2');
    } finally {
      tmp.cleanup();
    }
  });

  test('listSymbolsForFile returns correct symbols for a file', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/a.js', 'fn1', 'function', 'function fn1()', 1, 3)
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s2', 'f1', 'src/a.js', 'fn2', 'function', 'function fn2()', 5, 8)
      `).run();
      db.close();

      const symbols = storage.listSymbolsForFile(tmp.stateRoot, 'f1');
      assert.strictEqual(symbols.length, 2);
      assert.strictEqual(symbols[0].symbol_id, 's1');
      assert.strictEqual(symbols[0].name, 'fn1');
      assert.strictEqual(symbols[1].symbol_id, 's2');
      assert.strictEqual(symbols[1].name, 'fn2');
    } finally {
      tmp.cleanup();
    }
  });

  test('listFilesNeedingSummaries returns files with no summaries', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f2', 'src/b.js', 'javascript', 200, 20, 'h2', '2024-01-01T00:00:00.000Z')
      `).run();
      db.close();

      // Both files have no summaries, so both should appear
      const needing = storage.listFilesNeedingSummaries(tmp.stateRoot);
      const ids = needing.map((r) => r.file_id).sort();
      assert.deepStrictEqual(ids, ['f1', 'f2']);
    } finally {
      tmp.cleanup();
    }
  });

  test('listFilesNeedingSummaries returns files with stale summaries', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'newhash', '2024-01-01T00:00:00.000Z')
      `).run();
      db.close();

      // Insert summary with old source_hash
      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L0', 'old summary', 'oldhash', 'heuristic');
      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L1', 'old summary L1', 'oldhash', 'heuristic');

      const needing = storage.listFilesNeedingSummaries(tmp.stateRoot);
      assert.strictEqual(needing.length, 1);
      assert.strictEqual(needing[0].file_id, 'f1');
    } finally {
      tmp.cleanup();
    }
  });

  test('listFilesNeedingSummaries excludes files with fresh complete summaries', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.close();

      // Insert summaries with matching source_hash for both tiers
      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L0', 'summary L0', 'h1', 'heuristic');
      storage.upsertFileSummary(tmp.stateRoot, 'f1', 'L1', 'summary L1', 'h1', 'heuristic');

      const needing = storage.listFilesNeedingSummaries(tmp.stateRoot);
      assert.strictEqual(needing.length, 0);
    } finally {
      tmp.cleanup();
    }
  });

  test('findSymbol returns file_id in results', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/a.js', 'myFunction', 'function', 'function myFunction()', 1, 3)
      `).run();
      db.close();

      // Test exact name match
      const byName = storage.findSymbol(tmp.stateRoot, 'myFunction');
      assert.ok(byName, 'should find symbol by name');
      assert.strictEqual(byName.file_id, 'f1');

      // Test exact id match
      const byId = storage.findSymbol(tmp.stateRoot, 's1');
      assert.ok(byId, 'should find symbol by id');
      assert.strictEqual(byId.file_id, 'f1');

      // Test fuzzy match
      const byFuzzy = storage.findSymbol(tmp.stateRoot, 'myFunc');
      assert.ok(byFuzzy, 'should find symbol by fuzzy match');
      assert.strictEqual(byFuzzy.file_id, 'f1');
    } finally {
      tmp.cleanup();
    }
  });

  test('CASCADE: deleting a file removes its summaries and symbol_summaries', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/a.js', 'fn1', 'function', 'function fn1()', 1, 3)
      `).run();

      storage.upsertFileSummary(db, 'f1', 'L0', 'file summary', 'h1', 'heuristic');
      storage.upsertSymbolSummary(db, 's1', 'L0', 'symbol summary', 'h1', 'heuristic');

      // Verify summaries exist before delete
      assert.ok(storage.readFileSummary(db, 'f1', 'L0'), 'file summary should exist before delete');
      assert.ok(storage.readSymbolSummary(db, 's1', 'L0'), 'symbol summary should exist before delete');

      // Delete the file row
      db.prepare('DELETE FROM files WHERE file_id = ?').run('f1');

      // Verify CASCADE deleted both summaries
      assert.strictEqual(storage.readFileSummary(db, 'f1', 'L0'), null, 'file summary should be gone after CASCADE');
      assert.strictEqual(storage.readSymbolSummary(db, 's1', 'L0'), null, 'symbol summary should be gone after file CASCADE');

      db.close();
    } finally {
      tmp.cleanup();
    }
  });

  test('CASCADE: deleting a symbol removes its symbol_summaries', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
        VALUES ('s1', 'f1', 'src/a.js', 'fn1', 'function', 'function fn1()', 1, 3)
      `).run();

      storage.upsertSymbolSummary(db, 's1', 'L0', 'symbol summary', 'h1', 'heuristic');

      // Verify it exists
      assert.ok(storage.readSymbolSummary(db, 's1', 'L0'), 'symbol summary should exist before delete');

      // Delete the symbol (simulating what upsertFileIndex does)
      db.prepare('DELETE FROM symbols WHERE file_id = ?').run('f1');

      // Verify CASCADE deleted the symbol summary
      assert.strictEqual(storage.readSymbolSummary(db, 's1', 'L0'), null, 'symbol summary should be gone after symbol CASCADE');

      // File summary should still exist if we had one
      db.close();
    } finally {
      tmp.cleanup();
    }
  });

  test('CASCADE: upsertFileIndex with changed content cascades symbol_summaries', () => {
    const fixture = createIndexFixture();

    try {
      // Build the index
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');

      // Find the symbol for makeWidget
      const sym = storage.findSymbol(fixture.stateRoot, 'makeWidget');
      assert.ok(sym, 'makeWidget symbol should exist');

      // Add a symbol summary
      storage.upsertSymbolSummary(fixture.stateRoot, sym.symbol_id, 'L0', 'widget summary', 'oldhash', 'heuristic');
      assert.ok(storage.readSymbolSummary(fixture.stateRoot, sym.symbol_id, 'L0'), 'symbol summary should exist');

      // Modify the source file to change the symbol (triggers delete+reinsert of symbols in upsertFileIndex)
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        [
          'export function makeWidget(name, color) {',
          '  return { name, color };',
          '}',
          '',
        ].join('\n'),
      );

      // Refresh the index — this will delete old symbols and reinsert new ones
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'refresh');

      // The old symbol_id is gone (content changed => new symbol_id), so the summary should be cascaded away
      const oldSummary = storage.readSymbolSummary(fixture.stateRoot, sym.symbol_id, 'L0');
      assert.strictEqual(oldSummary, null, 'old symbol summary should be gone after file refresh');
    } finally {
      fixture.cleanup();
    }
  });

  test('upsertFileSummary works in db-handle mode inside transaction (AC-7)', () => {
    const tmp = createTempStateRoot();

    try {
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.prepare(`
        INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
        VALUES ('f1', 'src/a.js', 'javascript', 100, 10, 'h1', '2024-01-01T00:00:00.000Z')
      `).run();

      db.exec('BEGIN');
      storage.upsertFileSummary(db, 'f1', 'L0', 'inside txn', 'h1', 'heuristic');
      db.exec('COMMIT');

      const result = storage.readFileSummary(db, 'f1', 'L0');
      assert.strictEqual(result.content, 'inside txn');

      db.close();
    } finally {
      tmp.cleanup();
    }
  });

  test('openIndexDatabase uses busy timeout allowing concurrent access', () => {
    const tmp = createTempStateRoot();

    try {
      const db1 = storage.openIndexDatabase(tmp.stateRoot);

      // Begin a non-exclusive transaction on db1 so db2 can still read/schema
      db1.exec('BEGIN');
      db1.exec("INSERT INTO retrieval_logs (log_id, type, query, result_count, created_at) VALUES ('t1', 'test', 'q', 0, '2024-01-01')");

      // Second connection should succeed — timeout allows waiting for locks
      const db2 = storage.openIndexDatabase(tmp.stateRoot);
      assert.ok(db2, 'second connection should open without error');

      // db2 can read while db1 has an open transaction (WAL or shared-cache mode)
      const count = db2.prepare('SELECT COUNT(*) AS c FROM retrieval_logs').get();
      assert.strictEqual(typeof count.c, 'number');

      db1.exec('ROLLBACK');
      db1.close();
      db2.close();
    } finally {
      tmp.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// Heuristic summarizers — Task 2
// ---------------------------------------------------------------------------
import {
  isBinaryContent,
  generateFileL0,
  generateFileL1,
  generateSymbolL0,
  generateSymbolL1,
} from '../src/index/summarizers.js';

// 5 specified tests
describe('isBinaryContent', () => {
  test('returns false for normal text content', () => {
    assert.strictEqual(isBinaryContent('Hello, world!\nThis is a test.'), false);
  });

  test('returns true for content with null bytes (binary)', () => {
    assert.strictEqual(isBinaryContent('binary\x00content\x00here'), true);
  });

  test('returns false for UTF-16 LE BOM content (even with null bytes)', () => {
    // UTF-16 LE BOM: 0xFF 0xFE followed by null bytes typical of UTF-16
    const content = '\xFF\xFE\x00some text';
    assert.strictEqual(isBinaryContent(content), false);
  });

  test('returns false for UTF-16 BE BOM content (even with null bytes)', () => {
    // UTF-16 BE BOM: 0xFE 0xFF followed by null bytes typical of UTF-16
    const content = '\xFE\xFF\x00some text';
    assert.strictEqual(isBinaryContent(content), false);
  });

  test('returns false for empty string', () => {
    assert.strictEqual(isBinaryContent(''), false);
  });
});

// 8 specified tests
describe('generateFileL0', () => {
  test('code file with symbols produces correct format', () => {
    const symbols = [
      { name: 'makeWidget', kind: 'function', signature: 'export function makeWidget(name)' },
      { name: 'WidgetStore', kind: 'class', signature: 'export class WidgetStore' },
    ];
    const content = 'export function makeWidget(name) {\n  return { name };\n}\n\nexport class WidgetStore {\n}\n';
    const result = generateFileL0('javascript', 100, symbols, content);
    assert.strictEqual(result, 'javascript file (100 lines) -- makeWidget, WidgetStore');
  });

  test('markdown file uses heading and first paragraph', () => {
    const content = '# Guide\nThis is the intro.\n## Install\nInstall details\n';
    const result = generateFileL0('markdown', 4, [], content);
    assert.ok(result.includes('Guide'), 'should contain heading text');
    assert.ok(result.includes('This is the intro.'), 'should contain first paragraph');
  });

  test('json file lists top-level keys', () => {
    const content = '{\n  "title": "Shape",\n  "type": "object",\n  "properties": {}\n}';
    const result = generateFileL0('json', 5, [], content);
    assert.ok(result.includes('title'), 'should contain key: title');
    assert.ok(result.includes('type'), 'should contain key: type');
    assert.ok(result.includes('properties'), 'should contain key: properties');
  });

  test('yaml file lists top-level keys', () => {
    const content = 'name: test\nversion: 1.0\ndescription: A test\n';
    const result = generateFileL0('yaml', 3, [], content);
    assert.ok(result.includes('name'), 'should contain key: name');
    assert.ok(result.includes('version'), 'should contain key: version');
  });

  test('empty file (0 lines) returns language file (empty)', () => {
    const result = generateFileL0('javascript', 0, [], '');
    assert.strictEqual(result, 'javascript file (empty)');
  });

  test('single line file returns trimmed content', () => {
    const result = generateFileL0('javascript', 1, [], 'const x = 42;');
    assert.strictEqual(result, 'javascript file (1 line) -- const x = 42;');
  });

  test('code file with no symbols uses first non-empty line', () => {
    const content = '\n\n// Configuration file\nconst x = 1;\n';
    const result = generateFileL0('javascript', 4, [], content);
    assert.ok(result.includes('// Configuration file'), 'should fallback to first non-empty line');
  });

  test('output is capped at 400 characters', () => {
    const longName = 'a'.repeat(500);
    const symbols = [{ name: longName, kind: 'function', signature: `function ${longName}()` }];
    const result = generateFileL0('javascript', 10, symbols, `function ${longName}() {}`);
    assert.ok(result.length <= 400, `expected <= 400 chars, got ${result.length}`);
  });
});

// 5 specified tests
describe('generateFileL1', () => {
  test('code file includes imports and symbol signatures', () => {
    const content = [
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      '',
      'export function buildIndex(root) {',
      '  return root;',
      '}',
      '',
      'export class IndexStore {',
      '  get() {}',
      '}',
    ].join('\n');
    const symbols = [
      { name: 'buildIndex', kind: 'function', signature: 'export function buildIndex(root)' },
      { name: 'IndexStore', kind: 'class', signature: 'export class IndexStore' },
    ];
    const result = generateFileL1('javascript', symbols, content);
    assert.ok(result.includes("import fs from 'node:fs'"), 'should include import');
    assert.ok(result.includes('function buildIndex'), 'should include function signature');
    assert.ok(result.includes('class IndexStore'), 'should include class signature');
  });

  test('markdown file produces heading outline', () => {
    const content = '# Guide\nIntro text.\n## Install\nInstall details.\n## Usage\nUsage details.\n### Advanced\nAdvanced.\n';
    const result = generateFileL1('markdown', [], content);
    assert.ok(result.includes('# Guide'), 'should include h1');
    assert.ok(result.includes('## Install'), 'should include h2 Install');
    assert.ok(result.includes('## Usage'), 'should include h2 Usage');
    assert.ok(result.includes('### Advanced'), 'should include h3');
  });

  test('json file lists top-level keys with value previews', () => {
    const content = JSON.stringify({ title: 'Shape', type: 'object', properties: { x: 1 } }, null, 2);
    const result = generateFileL1('json', [], content);
    assert.ok(result.includes('title'), 'should include key title');
    assert.ok(result.includes('Shape'), 'should include value preview');
    assert.ok(result.includes('properties'), 'should include key properties');
  });

  test('code file caps imports at 10', () => {
    const imports = Array.from({ length: 15 }, (_, i) => `import mod${i} from 'mod${i}';`);
    const content = imports.join('\n') + '\nexport function fn() {}\n';
    const symbols = [{ name: 'fn', kind: 'function', signature: 'export function fn()' }];
    const result = generateFileL1('javascript', symbols, content);
    assert.ok(result.includes('mod9'), 'should include 10th import');
    assert.ok(!result.includes('mod10'), 'should not include 11th import');
  });

  test('output is capped at 8000 characters', () => {
    const bigSig = 'x'.repeat(500);
    const symbols = Array.from({ length: 30 }, (_, i) => ({
      name: `fn${i}`,
      kind: 'function',
      signature: `function fn${i}(${bigSig})`,
    }));
    const content = symbols.map((s) => `${s.signature} {}`).join('\n');
    const result = generateFileL1('javascript', symbols, content);
    assert.ok(result.length <= 8000, `expected <= 8000 chars, got ${result.length}`);
  });
});

// 4 specified tests
describe('generateSymbolL0', () => {
  test('function symbol produces correct format', () => {
    const symbol = { name: 'buildIndex', kind: 'function', signature: 'export function buildIndex(root, state)' };
    const result = generateSymbolL0(symbol);
    assert.strictEqual(result, 'function buildIndex -- export function buildIndex(root, state)');
  });

  test('class symbol produces correct format', () => {
    const symbol = { name: 'WidgetStore', kind: 'class', signature: 'export class WidgetStore' };
    const result = generateSymbolL0(symbol);
    assert.strictEqual(result, 'class WidgetStore -- export class WidgetStore');
  });

  test('json key symbol uses key prefix', () => {
    const symbol = { name: 'title', kind: 'key', signature: '"title": "Shape"' };
    const result = generateSymbolL0(symbol);
    assert.strictEqual(result, 'key title -- "title": "Shape"');
  });

  test('output is capped at 400 characters', () => {
    const longSig = 'x'.repeat(500);
    const symbol = { name: 'fn', kind: 'function', signature: `function fn(${longSig})` };
    const result = generateSymbolL0(symbol);
    assert.ok(result.length <= 400, `expected <= 400 chars, got ${result.length}`);
  });
});

// 5 specified tests
describe('generateSymbolL1', () => {
  test('code symbol with JSDoc comment includes signature and comment', () => {
    const fileContent = [
      '/**',
      ' * Build an index from the project root.',
      ' * @param {string} root - Project root path.',
      ' * @param {object} state - State object.',
      ' */',
      'export function buildIndex(root, state) {',
      '  return root;',
      '}',
    ].join('\n');
    const symbol = {
      name: 'buildIndex',
      kind: 'function',
      signature: 'export function buildIndex(root, state)',
      line_start: 6,
      line_end: 8,
    };
    const result = generateSymbolL1(symbol, fileContent);
    assert.ok(result.includes('export function buildIndex(root, state)'), 'should include signature');
    assert.ok(result.includes('Build an index from the project root'), 'should include JSDoc comment');
    assert.ok(result.includes('@param'), 'should include @param');
  });

  test('code symbol without comment returns signature only', () => {
    const fileContent = [
      'const x = 1;',
      '',
      'export function simple() {',
      '  return x;',
      '}',
    ].join('\n');
    const symbol = {
      name: 'simple',
      kind: 'function',
      signature: 'export function simple()',
      line_start: 3,
      line_end: 5,
    };
    const result = generateSymbolL1(symbol, fileContent);
    assert.ok(result.includes('export function simple()'), 'should include signature');
  });

  test('json key symbol returns key with value preview', () => {
    const fileContent = JSON.stringify({ title: 'A long title for testing', type: 'object' }, null, 2);
    const symbol = {
      name: 'title',
      kind: 'key',
      signature: '"title": "A long title for testing"',
      line_start: 2,
      line_end: 2,
    };
    const result = generateSymbolL1(symbol, fileContent);
    assert.ok(result.includes('title'), 'should include key name');
    assert.ok(result.includes('A long title for testing'), 'should include value preview');
  });

  test('code symbol output is capped at 2000 characters', () => {
    const longComment = '/** ' + 'x'.repeat(2500) + ' */';
    const fileContent = longComment + '\nfunction big() {}';
    const symbol = {
      name: 'big',
      kind: 'function',
      signature: 'function big()',
      line_start: 2,
      line_end: 2,
    };
    const result = generateSymbolL1(symbol, fileContent);
    assert.ok(result.length <= 2000, `expected <= 2000 chars, got ${result.length}`);
  });

  test('json key symbol output is capped at 800 characters', () => {
    const longValue = 'v'.repeat(1000);
    const fileContent = `{\n  "bigkey": "${longValue}"\n}`;
    const symbol = {
      name: 'bigkey',
      kind: 'key',
      signature: `"bigkey": "${longValue}"`,
      line_start: 2,
      line_end: 2,
    };
    const result = generateSymbolL1(symbol, fileContent);
    assert.ok(result.length <= 800, `expected <= 800 chars, got ${result.length}`);
  });
});

// 6 specified tests
describe('heuristic summarizers integration', () => {
  const WIDGET_JS = [
    "import { EventEmitter } from 'node:events';",
    '',
    '/**',
    ' * Create a new widget instance.',
    ' * @param {string} name - Widget name.',
    ' */',
    'export function makeWidget(name) {',
    '  return { name };',
    '}',
    '',
    'export class WidgetStore {',
    '  get(name) {',
    '    return makeWidget(name);',
    '  }',
    '}',
    '',
  ].join('\n');

  const WIDGET_SYMBOLS = [
    { name: 'makeWidget', kind: 'function', signature: 'export function makeWidget(name)', line_start: 7, line_end: 9 },
    { name: 'WidgetStore', kind: 'class', signature: 'export class WidgetStore', line_start: 11, line_end: 15 },
  ];

  const GUIDE_MD = [
    '# Guide',
    'Intro line',
    '## Install',
    'Install details',
    '## Usage',
    'Usage details',
    '',
  ].join('\n');

  const SHAPE_JSON = JSON.stringify({ title: 'Shape', type: 'object', properties: { x: 1 } }, null, 2);

  test('widget.js file L0 includes symbol names', () => {
    const result = generateFileL0('javascript', 16, WIDGET_SYMBOLS, WIDGET_JS);
    assert.ok(result.includes('makeWidget'), 'should mention makeWidget');
    assert.ok(result.includes('WidgetStore'), 'should mention WidgetStore');
    assert.ok(result.includes('16 lines'), 'should mention line count');
    assert.ok(result.length <= 400);
  });

  test('widget.js file L1 includes import and both symbol signatures', () => {
    const result = generateFileL1('javascript', WIDGET_SYMBOLS, WIDGET_JS);
    assert.ok(result.includes("import { EventEmitter } from 'node:events'"), 'should include import');
    assert.ok(result.includes('function makeWidget'), 'should include makeWidget signature');
    assert.ok(result.includes('class WidgetStore'), 'should include WidgetStore signature');
    assert.ok(result.length <= 8000);
  });

  test('widget.js symbol L0 for makeWidget matches expected format', () => {
    const result = generateSymbolL0(WIDGET_SYMBOLS[0]);
    assert.strictEqual(result, 'function makeWidget -- export function makeWidget(name)');
  });

  test('widget.js symbol L1 for makeWidget includes JSDoc', () => {
    const result = generateSymbolL1(WIDGET_SYMBOLS[0], WIDGET_JS);
    assert.ok(result.includes('Create a new widget instance'), 'should include JSDoc description');
    assert.ok(result.includes('@param {string} name'), 'should include @param');
    assert.ok(result.includes('export function makeWidget(name)'), 'should include signature');
    assert.ok(result.length <= 2000);
  });

  test('guide.md file L0 includes heading and intro', () => {
    const result = generateFileL0('markdown', 7, [], GUIDE_MD);
    assert.ok(result.includes('Guide'), 'should include heading');
    assert.ok(result.includes('Intro line'), 'should include first paragraph');
    assert.ok(result.length <= 400);
  });

  test('shape.json file L0 lists top-level keys', () => {
    const lineCount = SHAPE_JSON.split('\n').length;
    const result = generateFileL0('json', lineCount, [], SHAPE_JSON);
    assert.ok(result.includes('title'), 'should include key title');
    assert.ok(result.includes('type'), 'should include key type');
    assert.ok(result.includes('properties'), 'should include key properties');
    assert.ok(result.length <= 400);
  });
});

// ---------------------------------------------------------------------------
// index summarize CLI + orchestrator -- Task 4
// ---------------------------------------------------------------------------

// 4 specified tests
describe('index summarize command', () => {
  test('CLI: index summarize --json produces correct output shape', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(['index', 'summarize', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.summarized_files >= 3);
      assert.ok(output.summarized_symbols >= 2);
      assert.strictEqual(output.skipped_stale, 0);
      assert.strictEqual(output.skipped_missing, 0);
      assert.strictEqual(output.skipped_binary, 0);
      assert.ok(output.total_files >= 3);
    } finally {
      fixture.cleanup();
    }
  });

  test('CLI: index stats includes summary_counts after summarize', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      runCli(['index', 'summarize', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(['index', 'stats', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const stats = JSON.parse(result.stdout);
      assert.ok(stats.summary_counts, 'stats should include summary_counts');
      assert.ok(stats.summary_counts.file_summaries, 'should have file_summaries');
      assert.ok(stats.summary_counts.file_summaries.L0 >= 3, 'should have L0 file summaries');
      assert.ok(stats.summary_counts.file_summaries.L1 >= 3, 'should have L1 file summaries');
      assert.ok(stats.summary_counts.generators, 'should have generators breakdown');
      assert.ok(stats.summary_counts.generators.heuristic > 0, 'heuristic count should be > 0');
    } finally {
      fixture.cleanup();
    }
  });

  test('CLI: index stats omits summary_counts when no summaries exist', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(['index', 'stats', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const stats = JSON.parse(result.stdout);
      assert.strictEqual(stats.summary_counts, undefined, 'should not include summary_counts when none exist');
    } finally {
      fixture.cleanup();
    }
  });

  test('CLI: index summarize --tier L0 only generates L0 summaries', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(['index', 'summarize', '--tier', 'L0', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.summarized_files >= 3);

      // Verify only L0 summaries exist
      const stats = storage.readSummaryStats(fixture.stateRoot);
      assert.ok(stats.file_summaries.L0 >= 3, 'should have L0 file summaries');
      assert.strictEqual(stats.file_summaries.L1, 0, 'should have no L1 file summaries');
    } finally {
      fixture.cleanup();
    }
  });
});

// 3 specified tests
describe('summarize --refresh + --tier interaction', () => {
  test('--refresh --tier L0 only refreshes L0 summaries', () => {
    const fixture = createIndexFixture();

    try {
      // Build index and generate all summaries
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');
      storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, { tier: 'all', refresh: false });

      // Verify both tiers exist
      const statsBefore = storage.readSummaryStats(fixture.stateRoot);
      assert.ok(statsBefore.file_summaries.L0 >= 3);
      assert.ok(statsBefore.file_summaries.L1 >= 3);

      // Modify a file and refresh the index
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        'export function updatedWidget() { return 1; }\n',
      );
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'refresh');

      // Refresh only L0 summaries
      const result = storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, {
        tier: 'L0',
        refresh: true,
      });

      assert.ok(result.summarized_files >= 1, 'should refresh at least the modified file');

      // Verify L0 summaries were updated but L1 count hasn't increased
      const statsAfter = storage.readSummaryStats(fixture.stateRoot);
      assert.ok(statsAfter.file_summaries.L0 >= 3, 'L0 should still have summaries');
      // L1 count should be the same as before since we only refreshed L0
      assert.strictEqual(statsAfter.file_summaries.L1, statsBefore.file_summaries.L1,
        'L1 count should not change when only L0 is refreshed');
    } finally {
      fixture.cleanup();
    }
  });

  test('--refresh --tier L1 only refreshes L1 summaries', () => {
    const fixture = createIndexFixture();

    try {
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');
      storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, { tier: 'all', refresh: false });

      const statsBefore = storage.readSummaryStats(fixture.stateRoot);

      // Modify a file and refresh the index
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        'export function updatedWidget() { return 2; }\n',
      );
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'refresh');

      // Refresh only L1 summaries
      const result = storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, {
        tier: 'L1',
        refresh: true,
      });

      assert.ok(result.summarized_files >= 1, 'should refresh at least the modified file');

      const statsAfter = storage.readSummaryStats(fixture.stateRoot);
      assert.ok(statsAfter.file_summaries.L1 >= 3, 'L1 should still have summaries');
      assert.strictEqual(statsAfter.file_summaries.L0, statsBefore.file_summaries.L0,
        'L0 count should not change when only L1 is refreshed');
    } finally {
      fixture.cleanup();
    }
  });

  test('--refresh with default tier refreshes both L0 and L1', () => {
    const fixture = createIndexFixture();

    try {
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');
      storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, { tier: 'all', refresh: false });

      // Modify a file and refresh the index
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        'export function updatedWidget() { return 3; }\n',
      );
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'refresh');

      // Refresh both tiers (default)
      const result = storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, {
        tier: 'all',
        refresh: true,
      });

      assert.ok(result.summarized_files >= 1, 'should refresh at least the modified file');

      const statsAfter = storage.readSummaryStats(fixture.stateRoot);
      assert.ok(statsAfter.file_summaries.L0 >= 3, 'L0 should have summaries');
      assert.ok(statsAfter.file_summaries.L1 >= 3, 'L1 should have summaries');
    } finally {
      fixture.cleanup();
    }
  });
});

// 4 specified tests
describe('summarize error and edge cases', () => {
  test('all files skipped (stale) produces exit code 1', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // Modify ALL source files on disk without refreshing
      // (including the manifest which is indexed as a .yaml file)
      const indexedFiles = storage.listIndexedFiles(fixture.stateRoot);
      for (const file of indexedFiles) {
        fs.writeFileSync(
          path.join(fixture.fixtureRoot, file.relative_path),
          `changed-${file.relative_path}\n`,
        );
      }

      const result = runCli(['index', 'summarize', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('index refresh'), 'error should mention running index refresh');
    } finally {
      fixture.cleanup();
    }
  });

  test('missing file on disk is counted in skipped_missing', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // Delete one file from disk without refreshing
      fs.unlinkSync(path.join(fixture.fixtureRoot, 'docs', 'guide.md'));

      const result = runCli(['index', 'summarize', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.skipped_missing >= 1, `expected >= 1 skipped_missing, got ${output.skipped_missing}`);
    } finally {
      fixture.cleanup();
    }
  });

  test('binary file is counted in skipped_binary', () => {
    const fixture = createIndexFixture();

    try {
      // Create a file with null bytes that will be indexed (has valid extension)
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'binary.js'),
        'const x = 1;\x00\x00binary content\n',
      );

      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(['index', 'summarize', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.skipped_binary >= 1, `expected >= 1 skipped_binary, got ${output.skipped_binary}`);
    } finally {
      fixture.cleanup();
    }
  });

  test('empty index (no indexed files) produces error', () => {
    const tmp = createTempStateRoot();

    try {
      // Open DB to create schema but don't index any files
      const db = storage.openIndexDatabase(tmp.stateRoot);
      db.close();

      // summarizeIndex should throw because no files to summarize
      assert.throws(
        () => storage.summarizeIndex('/nonexistent', tmp.stateRoot, { tier: 'all', refresh: false }),
        { message: /No files summarized/ },
      );
    } finally {
      tmp.cleanup();
    }
  });
});

// 2 specified tests (+ 4 CLI tests, 3 tier interaction tests, 4 edge case tests above)
describe('summarizeIndex orchestrator', () => {
  test('generates L0 and L1 summaries for all indexed files and symbols', () => {
    const fixture = createIndexFixture();

    try {
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');

      const result = storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, {
        tier: 'all',
        refresh: false,
      });

      assert.ok(result.summarized_files >= 3, `expected >= 3 summarized files, got ${result.summarized_files}`);
      assert.ok(result.summarized_symbols >= 2, `expected >= 2 summarized symbols, got ${result.summarized_symbols}`);
      assert.strictEqual(result.skipped_stale, 0);
      assert.strictEqual(result.skipped_missing, 0);
      assert.strictEqual(result.skipped_binary, 0);
      assert.ok(result.total_files >= 3);

      // Verify summaries are actually written to DB
      const stats = storage.readSummaryStats(fixture.stateRoot);
      assert.ok(stats, 'summary stats should not be null after summarize');
      assert.ok(stats.file_summaries.L0 >= 3, 'should have L0 file summaries');
      assert.ok(stats.file_summaries.L1 >= 3, 'should have L1 file summaries');
    } finally {
      fixture.cleanup();
    }
  });

  test('skips files with stale content hash', () => {
    const fixture = createIndexFixture();

    try {
      storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');

      // Modify a file on disk without refreshing the index
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        'export function changed() { return true; }\n',
      );

      const result = storage.summarizeIndex(fixture.fixtureRoot, fixture.stateRoot, {
        tier: 'all',
        refresh: false,
      });

      assert.ok(result.skipped_stale >= 1, `expected >= 1 skipped_stale, got ${result.skipped_stale}`);
    } finally {
      fixture.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// Tiered recall with freshness checking -- Task 5
// ---------------------------------------------------------------------------

// 3 specified tests
describe('recall --tier flag validation', () => {
  test('--tier with invalid value returns error', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L2', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('--tier must be L0 or L1'), `expected tier validation error, got: ${result.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });

  test('--tier is mutually exclusive with --start-line', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--start-line', '1', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('mutually exclusive'), `expected mutual exclusion error, got: ${result.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });

  test('--tier is mutually exclusive with --end-line and --context', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const resultEndLine = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--end-line', '5', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(resultEndLine.exitCode, 1);
      assert.ok(resultEndLine.stderr.includes('mutually exclusive'), `expected mutual exclusion error for --end-line, got: ${resultEndLine.stderr}`);

      const resultContext = runCli(
        ['recall', 'symbol', 'makeWidget', '--tier', 'L0', '--context', '3', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(resultContext.exitCode, 1);
      assert.ok(resultContext.stderr.includes('mutually exclusive'), `expected mutual exclusion error for --context, got: ${resultContext.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });
});

// 3 specified tests
describe('tiered file recall', () => {
  test('returns summary with fresh: true when file is unchanged', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      runCli(['index', 'summarize', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.relative_path, 'src/widget.js');
      assert.strictEqual(output.tier, 'L0');
      assert.strictEqual(typeof output.slice, 'string');
      assert.ok(output.slice.length > 0, 'slice should not be empty');
      assert.strictEqual(output.generator, 'heuristic');
      assert.strictEqual(typeof output.generated_at, 'string');
      assert.strictEqual(output.fresh, true);
    } finally {
      fixture.cleanup();
    }
  });

  test('returns summary with fresh: false when file has been modified', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      runCli(['index', 'summarize', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // Modify the file on disk after summarization
      fs.writeFileSync(
        path.join(fixture.fixtureRoot, 'src', 'widget.js'),
        'export function changedWidget() { return 42; }\n',
      );

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.fresh, false);
      // Summary content is still returned even when stale
      assert.strictEqual(typeof output.slice, 'string');
      assert.ok(output.slice.length > 0);
    } finally {
      fixture.cleanup();
    }
  });

  test('returns error when no summary exists for the tier', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // Do NOT summarize -- directly try tiered recall
      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('No L0 summary found'), `expected missing summary error, got: ${result.stderr}`);
      assert.ok(result.stderr.includes('index summarize'), `should suggest running index summarize, got: ${result.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });
});

// 2 specified tests
describe('tiered symbol recall', () => {
  test('returns symbol summary with identity fields and fresh: true', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      runCli(['index', 'summarize', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'symbol', 'makeWidget', '--tier', 'L0', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.relative_path, 'src/widget.js');
      assert.strictEqual(output.name, 'makeWidget');
      assert.strictEqual(output.kind, 'function');
      assert.strictEqual(typeof output.signature, 'string');
      assert.strictEqual(output.tier, 'L0');
      assert.strictEqual(typeof output.slice, 'string');
      assert.ok(output.slice.length > 0, 'slice should not be empty');
      assert.strictEqual(output.generator, 'heuristic');
      assert.strictEqual(typeof output.generated_at, 'string');
      assert.strictEqual(output.fresh, true);
    } finally {
      fixture.cleanup();
    }
  });

  test('returns error when no symbol summary exists for the tier', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // Do NOT summarize
      const result = runCli(
        ['recall', 'symbol', 'makeWidget', '--tier', 'L0', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('No L0 summary found'), `expected missing summary error, got: ${result.stderr}`);
      assert.ok(result.stderr.includes('index summarize'), `should suggest running index summarize, got: ${result.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });
});

// 5 specified tests
describe('tiered recall backward compatibility and error contracts', () => {
  test('recall file without --tier works exactly as before (line-bounded)', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--start-line', '1', '--end-line', '3', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.relative_path, 'src/widget.js');
      assert.strictEqual(output.line_start, 1);
      assert.strictEqual(output.line_end, 3);
      assert.strictEqual(typeof output.slice, 'string');
      // Should NOT have tier/fresh fields
      assert.strictEqual(output.tier, undefined);
      assert.strictEqual(output.fresh, undefined);
      assert.strictEqual(output.generator, undefined);
    } finally {
      fixture.cleanup();
    }
  });

  test('recall symbol without --tier works exactly as before', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'symbol', 'makeWidget', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.name, 'makeWidget');
      assert.strictEqual(typeof output.slice, 'string');
      assert.match(output.slice, /export function makeWidget/);
      // Should NOT have tier/fresh fields
      assert.strictEqual(output.tier, undefined);
      assert.strictEqual(output.fresh, undefined);
      assert.strictEqual(output.generator, undefined);
    } finally {
      fixture.cleanup();
    }
  });

  test('missing summary returns helpful error mentioning index summarize', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // File recall without summaries
      const fileResult = runCli(
        ['recall', 'file', 'docs/guide.md', '--tier', 'L1', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(fileResult.exitCode, 1);
      assert.ok(fileResult.stderr.includes('No L1 summary found'), `got: ${fileResult.stderr}`);
      assert.ok(fileResult.stderr.includes('index summarize'), `got: ${fileResult.stderr}`);

      // Symbol recall without summaries
      const symResult = runCli(
        ['recall', 'symbol', 'WidgetStore', '--tier', 'L1', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(symResult.exitCode, 1);
      assert.ok(symResult.stderr.includes('No L1 summary found'), `got: ${symResult.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });

  test('deleted file on disk returns "File not found on disk" error', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      runCli(['index', 'summarize', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      // Delete the file after indexing and summarizing
      fs.unlinkSync(path.join(fixture.fixtureRoot, 'src', 'widget.js'));

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('File not found on disk'), `expected file not found error, got: ${result.stderr}`);
      assert.ok(result.stderr.includes('src/widget.js'), `should mention file path, got: ${result.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });

  test('mutual exclusion error message is clear', () => {
    const fixture = createIndexFixture();

    try {
      runCli(['index', 'build', '--state-root', fixture.stateRoot], {
        cwd: fixture.fixtureRoot,
      });

      const result = runCli(
        ['recall', 'file', 'src/widget.js', '--tier', 'L0', '--start-line', '1', '--end-line', '5', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('--tier is mutually exclusive'), `got: ${result.stderr}`);
      assert.ok(result.stderr.includes('--start-line'), `should mention --start-line, got: ${result.stderr}`);
      assert.ok(result.stderr.includes('--end-line'), `should mention --end-line, got: ${result.stderr}`);
      assert.ok(result.stderr.includes('--context'), `should mention --context, got: ${result.stderr}`);
    } finally {
      fixture.cleanup();
    }
  });
});

// 1 specified test
describe('hashContent export', () => {
  test('returns a 64-character hex string (SHA-256)', () => {
    const hash = storage.hashContent('hello world');
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
    // SHA-256 of 'hello world' is deterministic
    const hash2 = storage.hashContent('hello world');
    assert.strictEqual(hash, hash2);
    // Different content produces different hash
    const hash3 = storage.hashContent('different content');
    assert.notStrictEqual(hash, hash3);
  });
});

// ---------------------------------------------------------------------------
// Build-mode atomicity -- Task 3
// ---------------------------------------------------------------------------

// 1 specified test
describe('build-mode atomicity', () => {
  test('failed rebuild preserves all original data after ROLLBACK', () => {
    const fixture = createIndexFixture();
    let unreadablePath = null;

    try {
      // Step 1: Build an initial index
      const buildResult = storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build');
      assert.ok(buildResult.file_count > 0, 'initial build should index files');
      assert.ok(buildResult.symbol_count > 0, 'initial build should find symbols');

      // Step 2: Add summaries via storage primitives
      const db = storage.openIndexDatabase(fixture.stateRoot);
      const files = storage.listIndexedFiles(db);
      assert.ok(files.length > 0, 'should have indexed files');

      // Add a file summary to the first indexed file
      const targetFile = files[0];
      storage.upsertFileSummary(db, targetFile.file_id, 'L0', 'test file summary', targetFile.content_hash, 'heuristic');

      // Find a symbol to add a symbol summary
      const symbols = storage.listSymbolsForFile(db, targetFile.file_id);
      let targetSymbol = null;
      if (symbols.length > 0) {
        targetSymbol = symbols[0];
        storage.upsertSymbolSummary(db, targetSymbol.symbol_id, 'L0', 'test symbol summary', targetFile.content_hash, 'heuristic');
      }
      db.close();

      // Snapshot counts before the failed rebuild
      const dbBefore = storage.openIndexDatabase(fixture.stateRoot);
      const fileCountBefore = dbBefore.prepare('SELECT COUNT(*) AS c FROM files').get().c;
      const symbolCountBefore = dbBefore.prepare('SELECT COUNT(*) AS c FROM symbols').get().c;
      const summaryCountBefore = dbBefore.prepare('SELECT COUNT(*) AS c FROM summaries').get().c;
      const symbolSummaryCountBefore = dbBefore.prepare('SELECT COUNT(*) AS c FROM symbol_summaries').get().c;
      dbBefore.close();

      assert.ok(fileCountBefore > 0, 'should have files before rebuild');
      assert.ok(summaryCountBefore > 0, 'should have summaries before rebuild');

      // Step 3: Make a source file unreadable to trigger a failure during rebuild
      unreadablePath = path.join(fixture.fixtureRoot, 'src', 'widget.js');
      fs.chmodSync(unreadablePath, 0o000);

      // Step 4: Attempt rebuild -- should fail because readFileSync throws on unreadable file
      assert.throws(
        () => storage.buildOrRefreshIndex(fixture.fixtureRoot, fixture.stateRoot, 'build'),
        { code: 'EACCES' },
        'rebuild should fail with EACCES on unreadable file',
      );

      // Step 5: Verify ROLLBACK preserved all original data
      const dbAfter = storage.openIndexDatabase(fixture.stateRoot);
      const fileCountAfter = dbAfter.prepare('SELECT COUNT(*) AS c FROM files').get().c;
      const symbolCountAfter = dbAfter.prepare('SELECT COUNT(*) AS c FROM symbols').get().c;
      const summaryCountAfter = dbAfter.prepare('SELECT COUNT(*) AS c FROM summaries').get().c;
      const symbolSummaryCountAfter = dbAfter.prepare('SELECT COUNT(*) AS c FROM symbol_summaries').get().c;
      dbAfter.close();

      assert.strictEqual(fileCountAfter, fileCountBefore, 'files should be preserved after failed rebuild');
      assert.strictEqual(symbolCountAfter, symbolCountBefore, 'symbols should be preserved after failed rebuild');
      assert.strictEqual(summaryCountAfter, summaryCountBefore, 'file summaries should be preserved after failed rebuild');
      assert.strictEqual(symbolSummaryCountAfter, symbolSummaryCountBefore, 'symbol summaries should be preserved after failed rebuild');
    } finally {
      // Step 6: Restore file permissions before cleanup
      if (unreadablePath) {
        try { fs.chmodSync(unreadablePath, 0o644); } catch { /* ignore if already gone */ }
      }
      fixture.cleanup();
    }
  });
});
