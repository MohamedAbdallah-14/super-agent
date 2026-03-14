import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function runHook(scriptName, payload) {
  const scriptPath = path.join(ROOT, 'hooks', scriptName);

  try {
    const stdout = execFileSync(scriptPath, [], {
      encoding: 'utf8',
      input: JSON.stringify(payload),
      cwd: ROOT,
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

function createGuardFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-guards-'));
  const stateRoot = path.join(fixtureRoot, '.state-root');

  fs.mkdirSync(path.join(fixtureRoot, 'input'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'claude'), { recursive: true });
  fs.mkdirSync(path.join(stateRoot, 'runs', 'run-1'), { recursive: true });

  const manifest = {
    manifest_version: 2,
    project: {
      name: 'fixture-guards',
      display_name: 'Fixture Guards',
      version: '0.1.0',
      description: 'Fixture manifest for guard hook tests.',
      license: 'MIT',
    },
    versioning_policy: {
      strategy: 'semver',
      stability: 'pre-1.0-alpha',
      compatibility: 'additive_changes_only_until_manifest_bump',
    },
    paths: {
      input: 'input',
      artifacts_repo: 'artifacts',
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
    },
    hosts: ['claude'],
    workflows: ['clarify'],
    phases: ['clarify'],
    roles: ['clarifier'],
    export_targets: ['claude'],
    required_hooks: ['protected_path_write_guard', 'loop_cap_guard'],
    protected_paths: ['input', 'exports/hosts'],
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
    path.join(stateRoot, 'runs', 'run-1', 'status.json'),
    JSON.stringify({
      run_id: 'run-1',
      phase_loop_counts: {
        review: 2,
        verify: 1,
      },
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

describe('protected-path-write-guard hook', () => {
  test('blocks writes into protected canonical paths', () => {
    const fixture = createGuardFixture();

    try {
      const result = runHook('protected-path-write-guard', {
        project_root: fixture.fixtureRoot,
        target_path: 'input/brief.md',
      });

      assert.strictEqual(result.exitCode, 42);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.guard_decision.allowed, false);
    } finally {
      fixture.cleanup();
    }
  });

  test('allows writes outside protected paths', () => {
    const fixture = createGuardFixture();

    try {
      const result = runHook('protected-path-write-guard', {
        project_root: fixture.fixtureRoot,
        target_path: 'notes/scratch.md',
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.guard_decision.allowed, true);
    } finally {
      fixture.cleanup();
    }
  });

  test('allows approved regeneration flows for protected export targets', () => {
    const fixture = createGuardFixture();

    try {
      const result = runHook('protected-path-write-guard', {
        project_root: fixture.fixtureRoot,
        target_path: 'exports/hosts/claude/AGENTS.md',
        approved_flow: 'host_export_regeneration',
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.guard_decision.allowed, true);
    } finally {
      fixture.cleanup();
    }
  });
});

describe('loop-cap-guard hook', () => {
  test('blocks when the current phase loop count reaches the cap', () => {
    const fixture = createGuardFixture();

    try {
      const result = runHook('loop-cap-guard', {
        run_id: 'run-1',
        phase: 'review',
        state_root: fixture.stateRoot,
        loop_cap: 2,
      });

      assert.strictEqual(result.exitCode, 43);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.guard_decision.allowed, false);
    } finally {
      fixture.cleanup();
    }
  });

  test('allows execution when the phase loop count is still below the cap', () => {
    const fixture = createGuardFixture();

    try {
      const result = runHook('loop-cap-guard', {
        run_id: 'run-1',
        phase: 'verify',
        state_root: fixture.stateRoot,
        loop_cap: 2,
      });

      assert.strictEqual(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.guard_decision.allowed, true);
    } finally {
      fixture.cleanup();
    }
  });
});
