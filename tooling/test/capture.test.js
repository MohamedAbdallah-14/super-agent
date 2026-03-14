import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
      input: options.input,
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

function createCaptureFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-capture-'));
  const stateRoot = path.join(fixtureRoot, '.state-root');

  for (const relativePath of Object.values(BASE_MANIFEST_PATHS)) {
    if (relativePath.startsWith('~') || relativePath.includes('{')) {
      continue;
    }

    fs.mkdirSync(path.join(fixtureRoot, relativePath), { recursive: true });
  }

  const manifest = {
    manifest_version: 2,
    project: {
      name: 'fixture-capture',
      display_name: 'Fixture Capture',
      version: '0.1.0',
      description: 'Fixture manifest for capture tests.',
      license: 'MIT',
    },
    versioning_policy: {
      strategy: 'semver',
      stability: 'pre-1.0-alpha',
      compatibility: 'additive_changes_only_until_manifest_bump',
    },
    paths: BASE_MANIFEST_PATHS,
    hosts: ['codex'],
    workflows: ['clarify', 'verify', 'review'],
    phases: ['clarify', 'verify', 'review'],
    roles: ['clarifier', 'verifier', 'reviewer'],
    export_targets: ['codex'],
    required_hooks: [
      'session_start',
      'pre_tool_capture_route',
      'post_tool_capture',
      'pre_compact_summary',
      'stop_handoff_harvest',
    ],
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

  return {
    fixtureRoot,
    stateRoot,
    cleanup() {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    },
  };
}

function readNdjson(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('superagent capture command', () => {
  test('initializes a run ledger with status and session-start event output', () => {
    const fixture = createCaptureFixture();

    try {
      const result = runCli(
        ['capture', 'init', '--run', 'run-123', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const payload = JSON.parse(result.stdout);
      assert.strictEqual(payload.run_id, 'run-123');

      const statusPath = path.join(fixture.stateRoot, 'runs', 'run-123', 'status.json');
      const eventsPath = path.join(fixture.stateRoot, 'runs', 'run-123', 'events.ndjson');
      const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      const events = readNdjson(eventsPath);

      assert.strictEqual(status.phase, 'clarify');
      assert.strictEqual(status.status, 'running');
      assert.strictEqual(status.artifacts.events_path, eventsPath);
      assert.strictEqual(events[0].event, 'session_start');
    } finally {
      fixture.cleanup();
    }
  });

  test('appends an event and updates status loop counts', () => {
    const fixture = createCaptureFixture();

    try {
      const initResult = runCli(
        ['capture', 'init', '--run', 'run-123', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );
      assert.strictEqual(initResult.exitCode, 0);

      const eventResult = runCli(
        ['capture', 'event', '--run', 'run-123', '--event', 'phase_transition', '--phase', 'verify', '--status', 'running', '--loop-count', '2', '--message', 'verification started', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(eventResult.exitCode, 0);
      const payload = JSON.parse(eventResult.stdout);
      assert.strictEqual(payload.event, 'phase_transition');

      const status = JSON.parse(fs.readFileSync(path.join(fixture.stateRoot, 'runs', 'run-123', 'status.json'), 'utf8'));
      const events = readNdjson(path.join(fixture.stateRoot, 'runs', 'run-123', 'events.ndjson'));
      const lastEvent = events.at(-1);

      assert.strictEqual(status.phase, 'verify');
      assert.strictEqual(status.phase_loop_counts.verify, 2);
      assert.strictEqual(lastEvent.message, 'verification started');
      assert.strictEqual(lastEvent.loop_count, 2);
    } finally {
      fixture.cleanup();
    }
  });

  test('routes and captures tool output into run-local artifacts', () => {
    const fixture = createCaptureFixture();

    try {
      const initResult = runCli(
        ['capture', 'init', '--run', 'run-123', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );
      assert.strictEqual(initResult.exitCode, 0);

      const routeResult = runCli(
        ['capture', 'route', '--run', 'run-123', '--name', 'npm-test', '--suffix', '.txt', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(routeResult.exitCode, 0);
      const routePayload = JSON.parse(routeResult.stdout);
      assert.match(routePayload.capture_path, /captures\/.*npm-test\.txt$/);

      const outputResult = runCli(
        ['capture', 'output', '--run', 'run-123', '--capture-path', routePayload.capture_path, '--command', 'npm test', '--exit-code', '0', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot, input: 'all tests passed\nwith details\n' },
      );

      assert.strictEqual(outputResult.exitCode, 0);
      const outputPayload = JSON.parse(outputResult.stdout);
      const events = readNdjson(path.join(fixture.stateRoot, 'runs', 'run-123', 'events.ndjson'));

      assert.strictEqual(outputPayload.capture_path, routePayload.capture_path);
      assert.strictEqual(fs.readFileSync(routePayload.capture_path, 'utf8'), 'all tests passed\nwith details\n');
      assert.strictEqual(events.at(-1).event, 'post_tool_capture');
      assert.strictEqual(events.at(-1).capture_path, routePayload.capture_path);
    } finally {
      fixture.cleanup();
    }
  });

  test('writes a markdown summary artifact and records the summary event', () => {
    const fixture = createCaptureFixture();

    try {
      const initResult = runCli(
        ['capture', 'init', '--run', 'run-123', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );
      assert.strictEqual(initResult.exitCode, 0);

      const summaryResult = runCli(
        ['capture', 'summary', '--run', 'run-123', '--event', 'stop_handoff_harvest', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot, input: '# Handoff\n- keep going\n' },
      );

      assert.strictEqual(summaryResult.exitCode, 0);
      const payload = JSON.parse(summaryResult.stdout);
      const summaryPath = path.join(fixture.stateRoot, 'runs', 'run-123', 'summary.md');
      const status = JSON.parse(fs.readFileSync(path.join(fixture.stateRoot, 'runs', 'run-123', 'status.json'), 'utf8'));
      const events = readNdjson(path.join(fixture.stateRoot, 'runs', 'run-123', 'events.ndjson'));

      assert.strictEqual(payload.summary_path, summaryPath);
      assert.strictEqual(fs.readFileSync(summaryPath, 'utf8'), '# Handoff\n- keep going\n');
      assert.strictEqual(status.artifacts.summary_path, summaryPath);
      assert.strictEqual(events.at(-1).event, 'stop_handoff_harvest');
    } finally {
      fixture.cleanup();
    }
  });

  test('reports usage data as JSON', () => {
    const fixture = createCaptureFixture();

    try {
      runCli(
        ['capture', 'init', '--run', 'run-usage', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      const usagePath = path.join(fixture.stateRoot, 'runs', 'run-usage', 'usage.json');
      const usage = {
        schema_version: 1,
        run_id: 'run-usage',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phases: {},
        roles: {},
        savings: {
          capture_routing: { raw_bytes: 4000, summary_bytes: 400, estimated_tokens_avoided: 900, strategy: 'byte_heuristic' },
          context_mode: { available: false, raw_kb: 0, context_kb: 0, savings_ratio: '0%', per_tool: {} },
          compaction: { compaction_count: 0, pre_compaction_tokens_est: 0, post_compaction_tokens_est: 0 },
        },
        totals: { total_events: 0, total_capture_bytes_raw: 0, total_capture_bytes_summary: 0, total_estimated_tokens_if_raw: 0, total_estimated_tokens_avoided: 0, savings_percentage: '0%' },
      };
      fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));

      const result = runCli(
        ['capture', 'usage', '--run', 'run-usage', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout);
      assert.strictEqual(parsed.run_id, 'run-usage');
      assert.strictEqual(parsed.savings.capture_routing.raw_bytes, 4000);
    } finally {
      fixture.cleanup();
    }
  });

  test('reports usage data as human-readable text', () => {
    const fixture = createCaptureFixture();

    try {
      runCli(
        ['capture', 'init', '--run', 'run-text', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      const usagePath = path.join(fixture.stateRoot, 'runs', 'run-text', 'usage.json');
      const usage = {
        schema_version: 1,
        run_id: 'run-text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phases: { clarify: { events_count: 5, capture_bytes_raw: 2000, capture_bytes_summary: 200, estimated_tokens_if_raw: 500, estimated_tokens_avoided: 450 } },
        roles: {},
        savings: {
          capture_routing: { raw_bytes: 2000, summary_bytes: 200, estimated_tokens_avoided: 450, strategy: 'byte_heuristic' },
          context_mode: { available: false, raw_kb: 0, context_kb: 0, savings_ratio: '0%', per_tool: {} },
          compaction: { compaction_count: 0, pre_compaction_tokens_est: 0, post_compaction_tokens_est: 0 },
        },
        totals: { total_events: 5, total_capture_bytes_raw: 2000, total_capture_bytes_summary: 200, total_estimated_tokens_if_raw: 500, total_estimated_tokens_avoided: 450, savings_percentage: '90.0%' },
      };
      fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));

      const result = runCli(
        ['capture', 'usage', '--run', 'run-text', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Usage Report'));
      assert.ok(result.stdout.includes('clarify'));
    } finally {
      fixture.cleanup();
    }
  });

  test('usage subcommand returns empty report when no usage.json exists', () => {
    const fixture = createCaptureFixture();

    try {
      runCli(
        ['capture', 'init', '--run', 'run-empty', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      const result = runCli(
        ['capture', 'usage', '--run', 'run-empty', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout);
      assert.strictEqual(parsed.schema_version, 1);
      assert.deepStrictEqual(parsed.phases, {});
    } finally {
      fixture.cleanup();
    }
  });

  test('usage subcommand filters by --phase when provided', () => {
    const fixture = createCaptureFixture();

    try {
      runCli(
        ['capture', 'init', '--run', 'run-phase', '--phase', 'clarify', '--status', 'running', '--state-root', fixture.stateRoot],
        { cwd: fixture.fixtureRoot },
      );

      const usagePath = path.join(fixture.stateRoot, 'runs', 'run-phase', 'usage.json');
      const usage = {
        schema_version: 1,
        run_id: 'run-phase',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phases: {
          clarify: { events_count: 5, capture_bytes_raw: 2000, capture_bytes_summary: 200, estimated_tokens_if_raw: 500, estimated_tokens_avoided: 450 },
          execute: { events_count: 10, capture_bytes_raw: 8000, capture_bytes_summary: 800, estimated_tokens_if_raw: 2000, estimated_tokens_avoided: 1800 },
        },
        roles: {},
        savings: {
          capture_routing: { raw_bytes: 10000, summary_bytes: 1000, estimated_tokens_avoided: 2250, strategy: 'byte_heuristic' },
          context_mode: { available: false, raw_kb: 0, context_kb: 0, savings_ratio: '0%', per_tool: {} },
          compaction: { compaction_count: 0, pre_compaction_tokens_est: 0, post_compaction_tokens_est: 0 },
        },
        totals: { total_events: 15, total_capture_bytes_raw: 10000, total_capture_bytes_summary: 1000, total_estimated_tokens_if_raw: 2500, total_estimated_tokens_avoided: 2250, savings_percentage: '90.0%' },
      };
      fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));

      const result = runCli(
        ['capture', 'usage', '--run', 'run-phase', '--phase', 'clarify', '--state-root', fixture.stateRoot, '--json'],
        { cwd: fixture.fixtureRoot },
      );

      assert.strictEqual(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.phases.clarify, 'should include clarify phase');
      assert.strictEqual(parsed.phases.execute, undefined, 'should NOT include execute phase');
    } finally {
      fixture.cleanup();
    }
  });
});
