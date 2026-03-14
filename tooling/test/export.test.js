import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHostExports } from '../src/export/compiler.js';

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

function withPatchedMethod(target, methodName, createReplacement, callback) {
  const original = target[methodName];
  target[methodName] = createReplacement(original);

  try {
    return callback();
  } finally {
    target[methodName] = original;
  }
}

function createExportFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-export-'));

  for (const relativePath of Object.values(BASE_MANIFEST_PATHS)) {
    if (relativePath.startsWith('~') || relativePath.includes('{')) {
      continue;
    }

    fs.mkdirSync(path.join(fixtureRoot, relativePath), { recursive: true });
  }

  fs.mkdirSync(path.join(fixtureRoot, 'hooks', 'definitions'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'claude'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'codex'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'gemini'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'exports', 'hosts', 'cursor'), { recursive: true });

  const manifest = {
    manifest_version: 2,
    project: {
      name: 'fixture-export',
      display_name: 'Fixture Export',
      version: '0.1.0',
      description: 'Fixture manifest for export tests.',
      license: 'MIT',
    },
    versioning_policy: {
      strategy: 'semver',
      stability: 'pre-1.0-alpha',
      compatibility: 'additive_changes_only_until_manifest_bump',
    },
    paths: BASE_MANIFEST_PATHS,
    hosts: ['claude', 'codex', 'gemini', 'cursor'],
    workflows: ['clarify', 'review'],
    phases: ['clarify', 'review'],
    roles: ['clarifier', 'reviewer'],
    export_targets: ['claude', 'codex', 'gemini', 'cursor'],
    required_hooks: ['session_start', 'protected_path_write_guard', 'loop_cap_guard'],
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
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'host-export-package.schema.json'),
    path.join(fixtureRoot, 'schemas', 'host-export-package.schema.json'),
  );
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'export-manifest.schema.json'),
    path.join(fixtureRoot, 'schemas', 'export-manifest.schema.json'),
  );

  fs.writeFileSync(path.join(fixtureRoot, 'roles', 'clarifier.md'), '# Clarifier\n\nClarify the work.\n');
  fs.writeFileSync(path.join(fixtureRoot, 'roles', 'reviewer.md'), '# Reviewer\n\nReview the work.\n');
  fs.writeFileSync(path.join(fixtureRoot, 'workflows', 'clarify.md'), '# Clarify\n\nClarify workflow.\n');
  fs.writeFileSync(path.join(fixtureRoot, 'workflows', 'review.md'), '# Review\n\nReview workflow.\n');
  fs.writeFileSync(path.join(fixtureRoot, 'workflows', 'run-orchestrator.md'), '# Legacy\n\nShould stay out of exports.\n');

  const hookDefinitions = {
    'session_start.yaml': {
      id: 'session_start',
      trigger: 'session_start',
      description: 'Start hook',
      input_contract: { required: ['project_root'] },
      allowed_side_effects: ['create_status_file'],
      output_contract: { produces: ['status.json'] },
      failure_behavior: { mode: 'capture', exit_code: 0 },
      host_fallback: { claude: 'native_hook', codex: 'wrapper_command', gemini: 'wrapper_command', cursor: 'native_or_wrapper' },
    },
    'protected_path_write_guard.yaml': {
      id: 'protected_path_write_guard',
      trigger: 'protected_path_write_guard',
      description: 'Protected path guard',
      input_contract: { required: ['target_path'] },
      allowed_side_effects: ['block_write'],
      output_contract: { produces: ['guard_decision'] },
      failure_behavior: { mode: 'block', exit_code: 42 },
      host_fallback: { claude: 'native_or_wrapper', codex: 'wrapper_command', gemini: 'wrapper_command', cursor: 'native_or_wrapper' },
    },
    'loop_cap_guard.yaml': {
      id: 'loop_cap_guard',
      trigger: 'loop_cap_guard',
      description: 'Loop cap guard',
      input_contract: { required: ['run_id', 'phase'] },
      allowed_side_effects: ['read_status', 'block_execution'],
      output_contract: { produces: ['guard_decision'] },
      failure_behavior: { mode: 'block', exit_code: 43 },
      host_fallback: { claude: 'native_or_wrapper', codex: 'wrapper_command', gemini: 'wrapper_command', cursor: 'native_or_wrapper' },
    },
  };

  for (const [fileName, contents] of Object.entries(hookDefinitions)) {
    fs.writeFileSync(path.join(fixtureRoot, 'hooks', 'definitions', fileName), JSON.stringify(contents, null, 2));
  }

  return {
    fixtureRoot,
    cleanup() {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    },
  };
}

describe('superagent export command', () => {
  test('keeps the root Claude bootstrap settings in sync with the generated Claude host package', () => {
    const rootSettings = fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8');
    const generatedSettings = fs.readFileSync(
      path.join(ROOT, 'exports', 'hosts', 'claude', '.claude', 'settings.json'),
      'utf8',
    );

    assert.strictEqual(rootSettings.trim(), generatedSettings.trim());
  });

  test('builds host export packages and manifests for every supported host', () => {
    const fixture = createExportFixture();

    try {
      const result = runCli(['export', 'build', '--json'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(result.exitCode, 0);
      const summary = JSON.parse(result.stdout);
      assert.deepStrictEqual(summary.hosts, ['claude', 'codex', 'gemini', 'cursor']);

      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', 'CLAUDE.md')));
      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', '.claude', 'settings.json')));
      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'codex', 'AGENTS.md')));
      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'gemini', 'GEMINI.md')));
      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'cursor', '.cursor', 'rules', 'superagent-core.mdc')));
      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', 'export.manifest.json')));

      const claudePackage = JSON.parse(
        fs.readFileSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', 'host-package.json'), 'utf8'),
      );
      const claudeManifest = JSON.parse(
        fs.readFileSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', 'export.manifest.json'), 'utf8'),
      );

      assert.ok(!claudePackage.files.includes(path.join('.claude', 'commands', 'run-orchestrator.md')));
      assert.ok(!Object.hasOwn(claudeManifest.source_hashes, 'workflows/run-orchestrator.md'));
    } finally {
      fixture.cleanup();
    }
  });

  test('passes export drift checks immediately after generation', () => {
    const fixture = createExportFixture();

    try {
      const buildResult = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(buildResult.exitCode, 0);

      const checkResult = runCli(['export', '--check'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(checkResult.exitCode, 0);
    } finally {
      fixture.cleanup();
    }
  });

  test('rebuilds host exports deterministically when canonical inputs are unchanged', () => {
    const fixture = createExportFixture();

    try {
      const firstBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(firstBuild.exitCode, 0);

      const hostPackagePath = path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', 'host-package.json');
      const exportManifestPath = path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', 'export.manifest.json');
      const hostPackageBefore = fs.readFileSync(hostPackagePath, 'utf8');
      const exportManifestBefore = fs.readFileSync(exportManifestPath, 'utf8');

      const secondBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(secondBuild.exitCode, 0);

      assert.strictEqual(fs.readFileSync(hostPackagePath, 'utf8'), hostPackageBefore);
      assert.strictEqual(fs.readFileSync(exportManifestPath, 'utf8'), exportManifestBefore);
    } finally {
      fixture.cleanup();
    }
  });

  test('fails export drift checks when canonical source files change after generation', () => {
    const fixture = createExportFixture();

    try {
      const buildResult = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(buildResult.exitCode, 0);

      fs.appendFileSync(path.join(fixture.fixtureRoot, 'roles', 'clarifier.md'), '\nChanged after export.\n');

      const checkResult = runCli(['export', '--check'], {
        cwd: fixture.fixtureRoot,
      });

      assert.strictEqual(checkResult.exitCode, 1);
      assert.match(checkResult.stderr, /drift detected/i);
    } finally {
      fixture.cleanup();
    }
  });

  test('removes obsolete generated workflow files after canonical workflow retirement', () => {
    const fixture = createExportFixture();

    try {
      const manifestPath = path.join(fixture.fixtureRoot, 'superagent.manifest.yaml');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.workflows = ['clarify', 'review', 'run_orchestrator'];
      manifest.phases = ['clarify', 'review', 'run_orchestrator'];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      const firstBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(firstBuild.exitCode, 0);
      assert.ok(fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', '.claude', 'commands', 'run-orchestrator.md')));

      manifest.workflows = ['clarify', 'review'];
      manifest.phases = ['clarify', 'review'];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      const secondBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(secondBuild.exitCode, 0);
      assert.ok(!fs.existsSync(path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude', '.claude', 'commands', 'run-orchestrator.md')));
    } finally {
      fixture.cleanup();
    }
  });

  test('preserves the previous host export package when staged metadata writing fails', () => {
    const fixture = createExportFixture();

    try {
      const initialBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(initialBuild.exitCode, 0);

      const claudeDir = path.join(fixture.fixtureRoot, 'exports', 'hosts', 'claude');
      const claudeReadmePath = path.join(claudeDir, 'CLAUDE.md');
      const hostPackagePath = path.join(claudeDir, 'host-package.json');
      const exportsRoot = path.join(fixture.fixtureRoot, 'exports', 'hosts');
      const claudeReadmeBefore = fs.readFileSync(claudeReadmePath, 'utf8');
      const hostPackageBefore = fs.readFileSync(hostPackagePath, 'utf8');
      withPatchedMethod(fs, 'writeFileSync', (originalWriteFileSync) => function patchedWriteFileSync(filePath, ...args) {
        if (
          String(filePath).includes(`${path.sep}exports${path.sep}hosts${path.sep}.claude.staged-`) &&
          String(filePath).endsWith(`${path.sep}host-package.json`)
        ) {
          throw new Error('simulated staged metadata failure');
        }

        return originalWriteFileSync.call(this, filePath, ...args);
      }, () => {
        assert.throws(
          () => buildHostExports(fixture.fixtureRoot),
          /simulated staged metadata failure/,
        );
      });

      assert.ok(fs.existsSync(claudeDir));
      assert.strictEqual(fs.readFileSync(claudeReadmePath, 'utf8'), claudeReadmeBefore);
      assert.strictEqual(fs.readFileSync(hostPackagePath, 'utf8'), hostPackageBefore);
      assert.deepStrictEqual(
        fs.readdirSync(exportsRoot).filter((entry) => entry.startsWith('.claude.')),
        [],
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('restores the previous host export package when the staged swap fails', () => {
    const fixture = createExportFixture();

    try {
      const initialBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(initialBuild.exitCode, 0);

      const exportsRoot = path.join(fixture.fixtureRoot, 'exports', 'hosts');
      const claudeDir = path.join(exportsRoot, 'claude');
      const claudeReadmePath = path.join(claudeDir, 'CLAUDE.md');
      const claudeReadmeBefore = fs.readFileSync(claudeReadmePath, 'utf8');
      withPatchedMethod(fs, 'renameSync', (originalRenameSync) => function patchedRenameSync(sourcePath, destinationPath) {
        const source = String(sourcePath);
        const destination = String(destinationPath);

        if (
          source.includes(`${path.sep}exports${path.sep}hosts${path.sep}.claude.staged-`) &&
          destination.endsWith(`${path.sep}exports${path.sep}hosts${path.sep}claude`)
        ) {
          throw new Error('simulated staged swap failure');
        }

        return originalRenameSync.call(this, sourcePath, destinationPath);
      }, () => {
        assert.throws(
          () => buildHostExports(fixture.fixtureRoot),
          /simulated staged swap failure/,
        );
      });

      assert.ok(fs.existsSync(claudeDir));
      assert.strictEqual(fs.readFileSync(claudeReadmePath, 'utf8'), claudeReadmeBefore);
      assert.deepStrictEqual(
        fs.readdirSync(exportsRoot).filter((entry) => entry.startsWith('.claude.')),
        [],
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('reports rollback failures without masking the original swap error', () => {
    const fixture = createExportFixture();

    try {
      const initialBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(initialBuild.exitCode, 0);

      withPatchedMethod(fs, 'renameSync', (originalRenameSync) => function patchedRenameSync(sourcePath, destinationPath) {
        const source = String(sourcePath);
        const destination = String(destinationPath);

        if (
          source.includes(`${path.sep}exports${path.sep}hosts${path.sep}.claude.staged-`) &&
          destination.endsWith(`${path.sep}exports${path.sep}hosts${path.sep}claude`)
        ) {
          throw new Error('simulated staged swap failure');
        }

        if (
          source.includes(`${path.sep}exports${path.sep}hosts${path.sep}.claude.backup-`) &&
          destination.endsWith(`${path.sep}exports${path.sep}hosts${path.sep}claude`)
        ) {
          throw new Error('simulated rollback failure');
        }

        return originalRenameSync.call(this, sourcePath, destinationPath);
      }, () => {
        assert.throws(
          () => buildHostExports(fixture.fixtureRoot),
          /simulated staged swap failure.*Rollback also failed: simulated rollback failure/i,
        );
      });
    } finally {
      fixture.cleanup();
    }
  });

  test('rolls back earlier host commits when a later host swap fails', () => {
    const fixture = createExportFixture();

    try {
      const initialBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(initialBuild.exitCode, 0);

      const manifestPath = path.join(fixture.fixtureRoot, 'superagent.manifest.yaml');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.project.display_name = 'Fixture Export Updated';
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      const exportsRoot = path.join(fixture.fixtureRoot, 'exports', 'hosts');
      const claudeReadmePath = path.join(exportsRoot, 'claude', 'CLAUDE.md');
      const codexAgentsPath = path.join(exportsRoot, 'codex', 'AGENTS.md');
      const claudeBefore = fs.readFileSync(claudeReadmePath, 'utf8');
      const codexBefore = fs.readFileSync(codexAgentsPath, 'utf8');
      withPatchedMethod(fs, 'renameSync', (originalRenameSync) => function patchedRenameSync(sourcePath, destinationPath) {
        const source = String(sourcePath);
        const destination = String(destinationPath);

        if (
          source.includes(`${path.sep}exports${path.sep}hosts${path.sep}.codex.staged-`) &&
          destination.endsWith(`${path.sep}exports${path.sep}hosts${path.sep}codex`)
        ) {
          throw new Error('simulated later-host swap failure');
        }

        return originalRenameSync.call(this, sourcePath, destinationPath);
      }, () => {
        assert.throws(
          () => buildHostExports(fixture.fixtureRoot),
          /simulated later-host swap failure/,
        );
      });

      assert.strictEqual(fs.readFileSync(claudeReadmePath, 'utf8'), claudeBefore);
      assert.strictEqual(fs.readFileSync(codexAgentsPath, 'utf8'), codexBefore);
      assert.deepStrictEqual(
        fs.readdirSync(exportsRoot).filter((entry) => entry.startsWith('.claude.') || entry.startsWith('.codex.')),
        [],
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('cleans up stale host scratch directories before rebuilding exports', () => {
    const fixture = createExportFixture();

    try {
      const initialBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(initialBuild.exitCode, 0);

      const exportsRoot = path.join(fixture.fixtureRoot, 'exports', 'hosts');
      const staleBackupDir = path.join(exportsRoot, '.claude.backup-stale');
      const staleStagedDir = path.join(exportsRoot, '.claude.staged-stale');
      fs.mkdirSync(staleBackupDir, { recursive: true });
      fs.mkdirSync(staleStagedDir, { recursive: true });
      fs.writeFileSync(
        path.join(staleBackupDir, '.superagent-export-scratch.json'),
        JSON.stringify({ kind: 'backup', host: 'claude' }, null, 2),
      );
      fs.writeFileSync(
        path.join(staleStagedDir, '.superagent-export-scratch.json'),
        JSON.stringify({ kind: 'staged', host: 'claude' }, null, 2),
      );
      fs.writeFileSync(path.join(staleBackupDir, 'stale.txt'), 'backup');
      fs.writeFileSync(path.join(staleStagedDir, 'stale.txt'), 'staged');

      const rebuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(rebuild.exitCode, 0);

      assert.ok(!fs.existsSync(staleBackupDir));
      assert.ok(!fs.existsSync(staleStagedDir));
    } finally {
      fixture.cleanup();
    }
  });

  test('does not delete unmarked sibling directories that only match the scratch naming pattern', () => {
    const fixture = createExportFixture();

    try {
      const initialBuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(initialBuild.exitCode, 0);

      const exportsRoot = path.join(fixture.fixtureRoot, 'exports', 'hosts');
      const userDir = path.join(exportsRoot, '.claude.backup-user-data');
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(path.join(userDir, 'notes.txt'), 'keep me');

      const rebuild = runCli(['export', 'build'], {
        cwd: fixture.fixtureRoot,
      });
      assert.strictEqual(rebuild.exitCode, 0);

      assert.ok(fs.existsSync(userDir));
      assert.strictEqual(fs.readFileSync(path.join(userDir, 'notes.txt'), 'utf8'), 'keep me');
    } finally {
      fixture.cleanup();
    }
  });
});

describe('claude export includes design integration files', () => {
  test('claude export includes designer agent', () => {
    const agentPath = path.join(ROOT, 'exports', 'hosts', 'claude', '.claude', 'agents', 'designer.md');
    assert.ok(fs.existsSync(agentPath), 'designer agent not exported for Claude');
  });

  test('claude export includes design workflow commands', () => {
    const designPath = path.join(ROOT, 'exports', 'hosts', 'claude', '.claude', 'commands', 'design.md');
    const reviewPath = path.join(ROOT, 'exports', 'hosts', 'claude', '.claude', 'commands', 'design-review.md');
    assert.ok(fs.existsSync(designPath), 'design command not exported');
    assert.ok(fs.existsSync(reviewPath), 'design-review command not exported');
  });
});
