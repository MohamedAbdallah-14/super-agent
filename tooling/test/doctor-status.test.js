import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function createDoctorFixture(options = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-doctor-'));
  const stateRoot = path.join(fixtureRoot, '.state-root');

  for (const relativePath of Object.values(BASE_MANIFEST_PATHS)) {
    if (relativePath.startsWith('~') || relativePath.includes('{')) {
      continue;
    }

    fs.mkdirSync(path.join(fixtureRoot, relativePath), { recursive: true });
  }

  fs.mkdirSync(path.join(fixtureRoot, 'hooks', 'definitions'), { recursive: true });

  const manifest = {
    manifest_version: 2,
    project: {
      name: 'fixture-doctor',
      display_name: 'Fixture Doctor',
      version: '0.1.0',
      description: 'Fixture manifest for doctor tests.',
      license: 'MIT',
    },
    versioning_policy: {
      strategy: 'semver',
      stability: 'pre-1.0-alpha',
      compatibility: 'additive_changes_only_until_manifest_bump',
    },
    paths: BASE_MANIFEST_PATHS,
    hosts: ['claude', 'codex'],
    workflows: ['clarify'],
    phases: ['clarify'],
    roles: ['clarifier'],
    export_targets: ['claude', 'codex'],
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
      core_parsers: ['builtin-heuristic-markdown'],
      optional_language_plugins: [],
    },
    validation_checks: [],
  };

  fs.writeFileSync(
    path.join(fixtureRoot, 'superagent.manifest.yaml'),
    JSON.stringify(manifest, null, 2),
  );
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'superagent-manifest.schema.json'),
    path.join(fixtureRoot, 'schemas', 'superagent-manifest.schema.json'),
  );
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'hook.schema.json'),
    path.join(fixtureRoot, 'schemas', 'hook.schema.json'),
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'hooks', 'definitions', 'session_start.yaml'),
    JSON.stringify({
      id: 'session_start',
      trigger: 'session_start',
      description: 'Fixture hook',
      input_contract: { required: ['project_root'] },
      allowed_side_effects: ['create_status_file'],
      output_contract: { produces: ['status.json'] },
      failure_behavior: { mode: 'capture', exit_code: 0 },
      host_fallback: { claude: 'native_hook', codex: 'wrapper_command' },
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'roles', 'clarifier.md'),
    '# Clarifier\n\nFixture clarifier role.\n',
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'workflows', 'clarify.md'),
    '# Clarify\n\nFixture clarify workflow.\n',
  );
  fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'claude'), { recursive: true });

  if (!options.breakExports) {
    fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'codex'), { recursive: true });
  }

  fs.mkdirSync(path.join(stateRoot, 'runs', 'run-123'), { recursive: true });
  fs.writeFileSync(
    path.join(stateRoot, 'runs', 'run-123', 'status.json'),
    JSON.stringify({
      run_id: 'run-123',
      phase: 'execute',
      status: 'running',
      updated_at: '2026-03-11T00:00:00.000Z',
    }, null, 2),
  );

  return {
    fixtureRoot,
    stateRoot,
    cleanup() {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    },
  };
}

describe('superagent doctor command', () => {
  test('passes on a healthy fixture repo', () => {
    const fixture = createDoctorFixture();

    try {
      const result = runCli(['doctor', '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const report = JSON.parse(result.stdout);
      assert.strictEqual(report.healthy, true);
      assert.ok(report.checks.every((check) => check.status === 'pass'));
    } finally {
      fixture.cleanup();
    }
  });

  test('fails when required host export directories are missing', () => {
    const fixture = createDoctorFixture({ breakExports: true });

    try {
      const result = runCli(['doctor', '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 1);
      const report = JSON.parse(result.stdout);
      assert.strictEqual(report.healthy, false);
      assert.ok(report.checks.some((check) => check.name === 'host-exports' && check.status === 'fail'));
    } finally {
      fixture.cleanup();
    }
  });
});

describe('superagent status command', () => {
  test('reads a run status file from the configured state root', () => {
    const fixture = createDoctorFixture();

    try {
      const result = runCli(['status', '--run', 'run-123', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const status = JSON.parse(result.stdout);
      assert.strictEqual(status.run_id, 'run-123');
      assert.strictEqual(status.phase, 'execute');
    } finally {
      fixture.cleanup();
    }
  });

  test('fails cleanly when the run status file is missing', () => {
    const fixture = createDoctorFixture();

    try {
      const result = runCli(['status', '--run', 'missing-run', '--state-root', fixture.stateRoot, '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /run status not found/i);
    } finally {
      fixture.cleanup();
    }
  });
});
