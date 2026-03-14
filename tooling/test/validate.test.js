import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readYamlFile } from '../src/loaders.js';

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
      cwd: options.cwd ?? ROOT,
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

function createFixture(options = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-validate-'));
  const manifestPaths = {
    ...BASE_MANIFEST_PATHS,
    ...(options.manifestPaths ?? {}),
  };

  for (const relativePath of Object.values(BASE_MANIFEST_PATHS)) {
    if (relativePath.startsWith('~') || relativePath.includes('{')) {
      continue;
    }

    fs.mkdirSync(path.join(fixtureRoot, relativePath), { recursive: true });
  }

  fs.mkdirSync(path.join(fixtureRoot, 'hooks', 'definitions'), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'superagent-manifest.schema.json'),
    path.join(fixtureRoot, 'schemas', 'superagent-manifest.schema.json'),
  );
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'hook.schema.json'),
    path.join(fixtureRoot, 'schemas', 'hook.schema.json'),
  );

  const manifest = {
    manifest_version: 2,
    project: {
      name: 'fixture',
      display_name: 'Fixture',
      version: '0.1.0',
      description: 'Fixture manifest for validate tests.',
      license: 'MIT',
    },
    versioning_policy: {
      strategy: 'semver',
      stability: 'pre-1.0-alpha',
      compatibility: 'additive_changes_only_until_manifest_bump',
    },
    paths: manifestPaths,
    hosts: options.hosts ?? ['claude'],
    workflows: ['clarify'],
    phases: ['clarify'],
    roles: ['clarifier'],
    export_targets: options.hosts ?? ['claude'],
    required_hooks: options.requiredHooks ?? ['session_start'],
    protected_paths: ['input'],
    prohibited_terms: ['Agent OS', 'daemon'],
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

  const hookFiles = options.hookFiles ?? {
    'session_start.yaml': JSON.stringify({
      id: 'session_start',
      trigger: 'session_start',
      description: 'Fixture hook',
      input_contract: { required: ['project_root'] },
      allowed_side_effects: ['create_status_file'],
      output_contract: { produces: ['status.json'] },
      failure_behavior: { mode: 'capture', exit_code: 0 },
      host_fallback: { claude: 'native_hook' },
    }, null, 2),
  };

  for (const [fileName, contents] of Object.entries(hookFiles)) {
    fs.writeFileSync(path.join(fixtureRoot, 'hooks', 'definitions', fileName), contents);
  }

  fs.writeFileSync(path.join(fixtureRoot, 'README.md'), '# Fixture\n');
  fs.writeFileSync(
    path.join(fixtureRoot, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      version: '0.1.0',
      bin: {
        superagent: 'tooling/src/cli.js',
      },
    }, null, 2),
  );
  fs.writeFileSync(path.join(fixtureRoot, 'docs', 'tooling-cli.md'), '# Tooling\n');
  fs.writeFileSync(
    path.join(fixtureRoot, 'roles', 'clarifier.md'),
    '# Clarifier\n\nFixture clarifier role.\n',
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'workflows', 'clarify.md'),
    '# Clarify\n\nFixture clarify workflow.\n',
  );
  fs.copyFileSync(
    path.join(ROOT, 'schemas', 'docs-claim.schema.json'),
    path.join(fixtureRoot, 'schemas', 'docs-claim.schema.json'),
  );

  return fixtureRoot;
}

describe('superagent validate command', () => {
  test('validates the manifest from a nested working directory', () => {
    const result = runCli(['validate', 'manifest'], {
      cwd: path.join(ROOT, 'tooling'),
    });

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /manifest is valid/i);
  });

  test('validates canonical hook definitions', () => {
    const result = runCli(['validate', 'hooks']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /hooks are valid/i);
  });

  test('validates docs truth claims for the active repo', () => {
    const result = runCli(['validate', 'docs']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /docs truth validation passed/i);
  });

  test('validates active brand surfaces for the active repo', () => {
    const result = runCli(['validate', 'brand']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /brand truth validation passed/i);
  });

  test('validates active runtime surfaces for the active repo', () => {
    const result = runCli(['validate', 'runtime']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /runtime surface validation passed/i);
  });

  test('fails when a documented command lacks a registered truth claim', () => {
    const fixtureRoot = createFixture();

    fs.writeFileSync(
      path.join(fixtureRoot, 'docs', 'tooling-cli.md'),
      [
        '# Tooling',
        '',
        '- `superagent validate manifest`',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'docs', 'truth-claims.yaml'),
      JSON.stringify([], null, 2),
    );

    try {
      const result = runCli(['validate', 'docs'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /missing docs truth claim/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('reports malformed hook files as validation failures instead of crashing', () => {
    const fixtureRoot = createFixture({
      requiredHooks: ['empty'],
      hookFiles: {
        'empty.yaml': '',
      },
    });

    try {
      const result = runCli(['validate', 'hooks'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /hook validation failed/i);
      assert.doesNotMatch(result.stderr, /cannot read properties/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects manifest paths that escape the project root', () => {
    const fixtureRoot = createFixture({
      manifestPaths: {
        input: '..',
      },
    });

    try {
      const result = runCli(['validate', 'manifest'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /outside the project root/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects manifest_version 1 with targeted migration guidance', () => {
    const fixtureRoot = createFixture();

    const manifestPath = path.join(fixtureRoot, 'superagent.manifest.yaml');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.manifest_version = 1;
    delete manifest.project.description;
    delete manifest.versioning_policy;
    delete manifest.workflows;
    delete manifest.export_targets;
    delete manifest.prohibited_terms;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    try {
      const result = runCli(['validate', 'manifest'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /manifest_version 1 is no longer supported/i);
      assert.match(result.stderr, /migrate to manifest_version 2/i);
      assert.match(result.stderr, /manifest-declared role and workflow files/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects export targets that are not declared as supported hosts', () => {
    const fixtureRoot = createFixture({
      hosts: ['claude'],
    });

    const manifestPath = path.join(fixtureRoot, 'superagent.manifest.yaml');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.export_targets = ['claude', 'cursor'];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    try {
      const result = runCli(['validate', 'manifest'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /export target must also be declared in hosts/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects prohibited terms in declared active content files', () => {
    const fixtureRoot = createFixture({
      hosts: ['claude'],
    });

    fs.writeFileSync(
      path.join(fixtureRoot, 'roles', 'clarifier.md'),
      '# Clarifier\n\nThis role still calls itself Agent OS.\n',
    );

    try {
      const result = runCli(['validate', 'manifest'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /prohibited term/i);
      assert.match(result.stderr, /Agent OS/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('allows manifest prose that only contains larger words around prohibited terms', () => {
    const fixtureRoot = createFixture({
      hosts: ['claude'],
    });

    fs.writeFileSync(
      path.join(fixtureRoot, 'roles', 'clarifier.md'),
      '# Clarifier\n\nThis role documents daemonize behavior without using the standalone banned term.\n',
    );

    try {
      const result = runCli(['validate', 'manifest'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 0);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects forbidden brand terms in active surfaces', () => {
    const fixtureRoot = createFixture();

    fs.writeFileSync(
      path.join(fixtureRoot, 'docs', 'overview.md'),
      '# Overview\n\nThis active guide still calls the product Agent OS.\n',
    );

    try {
      const result = runCli(['validate', 'brand'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /brand truth validation failed/i);
      assert.match(result.stderr, /Agent OS/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects forbidden brand terms in expertise and changelog surfaces', () => {
    const fixtureRoot = createFixture();

    fs.writeFileSync(
      path.join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\nLegacy Agent OS naming leaked into the active changelog.\n',
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'expertise', 'review-notes.md'),
      '# Review Notes\n\nKeep SuperAgent focused and do not call it Symphony.\n',
    );

    try {
      const result = runCli(['validate', 'brand'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /CHANGELOG\.md: contains forbidden brand term "Agent OS"/i);
      assert.match(result.stderr, /expertise\/review-notes\.md: contains forbidden brand term "Symphony"/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects legacy runtime wrapper references in active surfaces', () => {
    const fixtureRoot = createFixture();

    fs.writeFileSync(
      path.join(fixtureRoot, 'docs', 'overview.md'),
      '# Overview\n\nRun `/run-orchestrator` when the plan is ready.\n',
    );

    try {
      const result = runCli(['validate', 'runtime'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /runtime surface validation failed/i);
      assert.match(result.stderr, /legacy run wrapper/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('rejects forbidden runtime references in non-self tooling checks and changelog surfaces', () => {
    const fixtureRoot = createFixture();

    fs.mkdirSync(path.join(fixtureRoot, 'tooling', 'src', 'checks'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'tooling', 'src', 'checks', 'custom-check.js'),
      'export const note = ".agent-os/state.sqlite is forbidden on the active surface."; \n',
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\nRemoved old tasks/input/ guidance from the active docs.\n',
    );

    try {
      const result = runCli(['validate', 'runtime'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /tooling\/src\/checks\/custom-check\.js: contains forbidden runtime-surface pattern ".agent-os path"/i);
      assert.match(result.stderr, /CHANGELOG\.md: contains forbidden runtime-surface pattern "tasks\/input path"/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('manifest with open_pencil adapter passes validation', () => {
    const fixture = createFixture();
    const manifestPath = path.join(fixture, 'superagent.manifest.yaml');
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    manifest.adapters.open_pencil = {
      enabled_by_default: false,
      required: false,
      install_mode: 'external',
      package_presence: 'optional',
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const result = runCli(['validate', 'manifest'], { cwd: fixture });
    assert.strictEqual(result.exitCode, 0, result.stderr);
    fs.rmSync(fixture, { recursive: true, force: true });
  });

  test('ignores reserved built-in checker file paths when validating runtime surfaces', () => {
    const fixtureRoot = createFixture();

    fs.mkdirSync(path.join(fixtureRoot, 'tooling', 'src', 'checks'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'tooling', 'src', 'checks', 'runtime-surface.js'),
      'export const patterns = [".agent-os/", "tasks/input/"]; \n',
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'tooling', 'src', 'checks', 'brand-truth.js'),
      'export const legacy = ["archive/v5.1-agent-os-daemon/README.md"]; \n',
    );

    try {
      const result = runCli(['validate', 'runtime'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 0);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test('runs all validators when called without a subcommand', () => {
    const result = runCli(['validate']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /manifest/i);
    assert.match(result.stdout, /hooks/i);
    assert.match(result.stdout, /docs/i);
    assert.match(result.stdout, /brand/i);
    assert.match(result.stdout, /runtime/i);
    assert.match(result.stdout, /branches/i);
    assert.match(result.stdout, /commits/i);
    assert.match(result.stdout, /changelog/i);
  });

  test('returns exit code 1 with unknown subcommand', () => {
    const result = runCli(['validate', 'nonexistent']);

    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /unknown validator/i);
  });

  test('rejects flags without a subcommand', () => {
    const result = runCli(['validate', '--base', 'HEAD~1']);

    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /specify a subcommand/i);
  });

  test('skips git-dependent validators gracefully in non-git environments', () => {
    const fixtureRoot = createFixture();
    fs.writeFileSync(
      path.join(fixtureRoot, 'docs', 'truth-claims.yaml'),
      JSON.stringify([], null, 2),
    );

    try {
      const result = runCli(['validate'], { cwd: fixtureRoot });

      assert.strictEqual(result.exitCode, 0);
      assert.match(result.stdout, /PASS manifest/i);
      assert.match(result.stdout, /SKIP branches: prerequisite/i);
      assert.match(result.stdout, /SKIP commits: prerequisite/i);
      assert.match(result.stdout, /SKIP changelog: prerequisite/i);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

// 1 specified test
describe('manifest declares designer role and design workflows', () => {
  test('manifest declares designer role and design workflows', () => {
    const manifest = readYamlFile(path.join(ROOT, 'superagent.manifest.yaml'));
    assert.ok(manifest.roles.includes('designer'), 'designer role missing');
    assert.ok(manifest.workflows.includes('design'), 'design workflow missing');
    assert.ok(manifest.workflows.includes('design_review'), 'design_review workflow missing');
    assert.ok(manifest.phases.includes('design'), 'design phase missing');
    assert.ok(manifest.phases.includes('design_review'), 'design_review phase missing');
    assert.ok(manifest.adapters.open_pencil, 'open_pencil adapter missing');
  });
});

// 7 specified tests
describe('design-artifact schema', () => {
  const schemaPath = path.join(ROOT, 'schemas', 'design-artifact.schema.json');

  test('design-artifact schema file exists and is valid JSON', () => {
    assert.ok(fs.existsSync(schemaPath), 'schemas/design-artifact.schema.json missing');
    const raw = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(raw);
    assert.strictEqual(schema.type, 'object');
  });

  test('requires standard artifact envelope fields', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const envelope = ['phase', 'role', 'run_id', 'created_at', 'sources', 'status', 'loop_number'];
    for (const field of envelope) {
      assert.ok(schema.required.includes(field), `missing envelope field: ${field}`);
    }
  });

  test('requires design-specific fields', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const designFields = ['design_file', 'exported_code', 'design_tokens', 'screenshots', 'spec_reference'];
    for (const field of designFields) {
      assert.ok(schema.required.includes(field), `missing design field: ${field}`);
    }
  });

  test('constrains phase to design and role to designer', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schema.properties.phase.const, 'design');
    assert.strictEqual(schema.properties.role.const, 'designer');
  });

  test('screenshots requires at least one item', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schema.properties.screenshots.type, 'array');
    assert.strictEqual(schema.properties.screenshots.minItems, 1);
  });

  test('validates a correct artifact with all required fields', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const validArtifact = {
      phase: 'design',
      role: 'designer',
      run_id: 'test-run-001',
      created_at: '2026-03-12T00:00:00Z',
      sources: ['spec-v1'],
      status: 'complete',
      loop_number: 1,
      design_file: 'design.fig',
      exported_code: { jsx: 'design-export.jsx', html: 'design-export.html' },
      design_tokens: 'design-tokens.json',
      screenshots: ['screenshots/home.png'],
      spec_reference: 'spec-v1',
    };
    assert.ok(schema.required.every(key => key in validArtifact),
      `Missing keys: ${schema.required.filter(k => !(k in validArtifact))}`);
  });

  test('rejects artifact missing screenshots', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.ok(schema.required.includes('screenshots'),
      'screenshots must be a required field');
    assert.strictEqual(schema.properties.screenshots.minItems, 1,
      'screenshots must require at least one item');
  });
});

// 4 specified tests
describe('open-pencil expertise module', () => {
  test('open-pencil expertise module exists and has required sections', () => {
    const modPath = path.join(ROOT, 'expertise', 'design', 'tooling', 'open-pencil.md');
    assert.ok(fs.existsSync(modPath), 'expertise/design/tooling/open-pencil.md missing');
    const content = fs.readFileSync(modPath, 'utf8');
    assert.ok(content.includes('## Setup'), 'missing Setup section');
    assert.ok(content.includes('## Tool Categories'), 'missing Tool Categories section');
    assert.ok(content.includes('## Effective Patterns'), 'missing Effective Patterns section');
    assert.ok(content.includes('## Limitations'), 'missing Limitations section');
  });

  test('documents all 90 MCP tools across categories', () => {
    const modPath = path.join(ROOT, 'expertise', 'design', 'tooling', 'open-pencil.md');
    const content = fs.readFileSync(modPath, 'utf8');
    assert.ok(content.includes('90'), 'should reference 90 total tools');
    assert.ok(content.includes('Document (3)'), 'missing Document category');
    assert.ok(content.includes('Read (16)'), 'missing Read category');
    assert.ok(content.includes('Create (8)'), 'missing Create category');
    assert.ok(content.includes('Modify (25)'), 'missing Modify category');
    assert.ok(content.includes('Structure (12)'), 'missing Structure category');
    assert.ok(content.includes('Variables (9)'), 'missing Variables category');
    assert.ok(content.includes('Export (2)'), 'missing Export category');
    assert.ok(content.includes('Analyze (4)'), 'missing Analyze category');
    assert.ok(content.includes('Diff (2)'), 'missing Diff category');
  });

  test('includes MCP server config for both stdio and HTTP transports', () => {
    const modPath = path.join(ROOT, 'expertise', 'design', 'tooling', 'open-pencil.md');
    const content = fs.readFileSync(modPath, 'utf8');
    assert.ok(content.includes('openpencil-mcp'), 'missing stdio MCP command');
    assert.ok(content.includes('openpencil-mcp-http'), 'missing HTTP transport command');
    assert.ok(content.includes('mcpServers'), 'missing MCP server config block');
  });

  test('includes CLI usage examples', () => {
    const modPath = path.join(ROOT, 'expertise', 'design', 'tooling', 'open-pencil.md');
    const content = fs.readFileSync(modPath, 'utf8');
    assert.ok(content.includes('open-pencil tree'), 'missing CLI tree command');
    assert.ok(content.includes('open-pencil find'), 'missing CLI find command');
    assert.ok(content.includes('open-pencil export'), 'missing CLI export command');
    assert.ok(content.includes('--json'), 'missing --json flag reference');
  });
});

// 1 specified test
describe('design workflow', () => {
  test('design workflow file exists and has required sections', () => {
    const wfPath = path.join(ROOT, 'workflows', 'design.md');
    assert.ok(fs.existsSync(wfPath), 'workflows/design.md missing');
    const content = fs.readFileSync(wfPath, 'utf8');
    assert.ok(content.includes('## Purpose'), 'missing Purpose');
    assert.ok(content.includes('## Inputs'), 'missing Inputs');
    assert.ok(content.includes('## Primary Role'), 'missing Primary Role');
    assert.ok(content.includes('## Outputs'), 'missing Outputs');
    assert.ok(content.includes('## Failure Conditions'), 'missing Failure Conditions');
  });
});

// 1 specified test
describe('review workflow design checking', () => {
  test('review workflow references design artifacts', () => {
    const wfPath = path.join(ROOT, 'workflows', 'review.md');
    const content = fs.readFileSync(wfPath, 'utf8');
    assert.ok(content.includes('design artifact'), 'review workflow should reference design artifacts in inputs');
  });
});

// 1 specified test
describe('design-review workflow', () => {
  test('design-review workflow file exists and has required sections', () => {
    const wfPath = path.join(ROOT, 'workflows', 'design-review.md');
    assert.ok(fs.existsSync(wfPath), 'workflows/design-review.md missing');
    const content = fs.readFileSync(wfPath, 'utf8');
    assert.ok(content.includes('## Purpose'), 'missing Purpose');
    assert.ok(content.includes('## Inputs'), 'missing Inputs');
    assert.ok(content.includes('## Outputs'), 'missing Outputs');
    assert.ok(content.includes('## Failure Conditions'), 'missing Failure Conditions');
  });
});

// 3 specified tests
describe('composition map design-tooling concern', () => {
  const map = readYamlFile(path.join(ROOT, 'expertise', 'composition-map.yaml'));

  test('design-tooling concern exists with designer role key', () => {
    assert.ok(map.concerns['design-tooling'], 'design-tooling concern missing');
    assert.ok(map.concerns['design-tooling'].designer, 'designer role key missing in design-tooling');
  });

  test('designer role maps to open-pencil expertise module', () => {
    assert.ok(
      map.concerns['design-tooling'].designer.includes('design/tooling/open-pencil.md'),
      'designer should include design/tooling/open-pencil.md',
    );
  });

  test('design-tooling includes reviewer and verifier role mappings', () => {
    assert.ok(map.concerns['design-tooling'].reviewer, 'reviewer role key missing');
    assert.ok(map.concerns['design-tooling'].verifier, 'verifier role key missing');
    assert.ok(
      map.concerns['design-tooling'].verifier.includes('antipatterns/design/ui-antipatterns.md'),
      'verifier should include ui-antipatterns',
    );
    assert.ok(
      map.concerns['design-tooling'].verifier.includes('antipatterns/design/ux-antipatterns.md'),
      'verifier should include ux-antipatterns',
    );
  });
});

// 1 specified test
describe('design skill', () => {
  test('design skill file exists and has frontmatter', () => {
    const skillPath = path.join(ROOT, 'skills', 'design', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'skills/design/SKILL.md missing');
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(content.startsWith('---'), 'missing YAML frontmatter');
    assert.ok(content.includes('name: design'), 'missing name in frontmatter');
    assert.ok(content.includes('description:'), 'missing description in frontmatter');
    assert.ok(content.includes('## Prerequisites'), 'missing Prerequisites section');
    assert.ok(content.includes('## Workflow'), 'missing Workflow section');
    assert.ok(content.includes('## Key MCP Tools'), 'missing Key MCP Tools section');
    assert.ok(content.includes('## Required Outputs'), 'missing Required Outputs section');
    assert.ok(content.includes('## When Open-Pencil is Unavailable'), 'missing fallback section');
    assert.ok(content.includes('## Rules'), 'missing Rules section');
  });
});

// 6 specified tests
describe('indexing-and-recall.md documents tiered context loading', () => {
  const docPath = path.join(ROOT, 'docs', 'concepts', 'indexing-and-recall.md');

  test('contains context tiers section explaining L0, L1, L2', () => {
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(content.includes('## Context tiers'), 'missing "## Context tiers" section');
    assert.ok(content.includes('L0'), 'must mention L0');
    assert.ok(content.includes('L1'), 'must mention L1');
    assert.ok(content.includes('L2'), 'must mention L2');
  });

  test('contains summary generation section for index summarize', () => {
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(content.includes('## Summary generation'), 'missing "## Summary generation" section');
    assert.ok(content.includes('index summarize'), 'must mention index summarize command');
  });

  test('contains tiered recall section for --tier flag', () => {
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(content.includes('## Tiered recall'), 'missing "## Tiered recall" section');
    assert.ok(content.includes('--tier'), 'must mention --tier flag');
  });

  test('contains freshness checking section', () => {
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(content.includes('## Freshness checking'), 'missing "## Freshness checking" section');
    assert.ok(content.includes('fresh'), 'must mention fresh field');
  });

  test('removes "token-budgeted summary renderers" from reserved items', () => {
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(
      !content.includes('token-budgeted summary renderers'),
      'must remove "token-budgeted summary renderers" (now partially implemented)',
    );
  });

  test('does not use prohibited terms', () => {
    const content = fs.readFileSync(docPath, 'utf8');
    const prohibited = ['Agent OS', 'daemon', 'HTTP control plane', 'web UI', 'OpenAI Symphony', 'Elixir'];
    for (const term of prohibited) {
      assert.ok(!content.includes(term), `doc must not use prohibited term: "${term}"`);
    }
  });
});

// 4 specified tests
describe('tooling-cli.md documents index summarize and --tier flag', () => {
  test('tooling-cli.md lists superagent index summarize command', () => {
    const content = fs.readFileSync(path.join(ROOT, 'docs', 'reference', 'tooling-cli.md'), 'utf8');
    assert.ok(
      content.includes('superagent index summarize'),
      'tooling-cli.md must document superagent index summarize',
    );
  });

  test('recall file description mentions --tier flag', () => {
    const content = fs.readFileSync(path.join(ROOT, 'docs', 'reference', 'tooling-cli.md'), 'utf8');
    const recallFileLine = content.split('\n').find(l => l.includes('superagent recall file'));
    assert.ok(recallFileLine, 'must have recall file row');
    assert.ok(
      recallFileLine.includes('--tier'),
      'recall file description must mention --tier flag',
    );
  });

  test('recall symbol description mentions --tier flag', () => {
    const content = fs.readFileSync(path.join(ROOT, 'docs', 'reference', 'tooling-cli.md'), 'utf8');
    const recallSymbolLine = content.split('\n').find(l => l.includes('superagent recall symbol'));
    assert.ok(recallSymbolLine, 'must have recall symbol row');
    assert.ok(
      recallSymbolLine.includes('--tier'),
      'recall symbol description must mention --tier flag',
    );
  });

  test('index stats description mentions summary_counts', () => {
    const content = fs.readFileSync(path.join(ROOT, 'docs', 'reference', 'tooling-cli.md'), 'utf8');
    const statsLine = content.split('\n').find(l => l.includes('superagent index stats'));
    assert.ok(statsLine, 'must have index stats row');
    assert.ok(
      statsLine.includes('summary_counts'),
      'index stats description must mention summary_counts',
    );
  });
});

// 1 specified test
describe('truth claims include index summarize', () => {
  test('truth-claims.yaml contains command-index-summarize entry', () => {
    const claimsPath = path.join(ROOT, 'docs', 'truth-claims.yaml');
    const claims = readYamlFile(claimsPath);
    const entry = claims.find(c => c.id === 'command-index-summarize');
    assert.ok(entry, 'truth-claims.yaml must contain command-index-summarize entry');
    assert.strictEqual(entry.file, 'docs/reference/tooling-cli.md');
    assert.strictEqual(entry.claim_type, 'command');
    assert.strictEqual(entry.subject, 'superagent index summarize');
    assert.strictEqual(entry.verifier, 'command_registry');
    assert.strictEqual(entry.required, true);
  });
});

// 1 specified test
describe('command registry includes index summarize', () => {
  test('SUPPORTED_COMMAND_SUBJECTS contains superagent index summarize', async () => {
    const { SUPPORTED_COMMAND_SUBJECTS } = await import('../src/checks/command-registry.js');
    assert.ok(
      SUPPORTED_COMMAND_SUBJECTS.has('superagent index summarize'),
      'command registry must include "superagent index summarize"',
    );
  });
});

describe('superagent export command', () => {
  test('runs export drift checks against generated host packages', () => {
    const result = runCli(['export', '--check']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /drift check passed/i);
  });
});

// 3 specified tests
describe('composition-map content-author concern wiring', () => {
  const map = readYamlFile(path.join(ROOT, 'expertise', 'composition-map.yaml'));

  const expectedContentAuthor = {
    'rtl': ['content/foundations/content-modeling.md', 'content/foundations/editorial-standards.md'],
    'rtl-advanced': ['content/patterns/sample-content.md'],
    'i18n': ['content/foundations/content-modeling.md', 'content/foundations/editorial-standards.md'],
    'i18n-content': ['content/foundations/terminology-governance.md', 'content/patterns/sample-content.md'],
    'i18n-translation': ['content/foundations/content-modeling.md'],
    'accessibility': ['content/patterns/accessibility-copy.md'],
    'design-tooling': ['content/patterns/state-copy.md', 'content/foundations/microcopy.md'],
    'onboarding-ux': ['content/patterns/state-copy.md', 'content/foundations/microcopy.md'],
    'forms-ux': ['content/foundations/microcopy.md', 'content/patterns/state-copy.md'],
    'navigation-ux': ['content/foundations/microcopy.md'],
    'notifications-ux': ['content/patterns/notification-content.md'],
    'e-commerce': ['content/foundations/microcopy.md', 'content/patterns/sample-content.md', 'content/foundations/terminology-governance.md'],
    'auth-flows': ['content/patterns/state-copy.md', 'content/foundations/microcopy.md'],
    'platform-mobile': ['content/foundations/microcopy.md'],
    'platform-web': ['content/foundations/microcopy.md'],
    'social': ['content/patterns/notification-content.md'],
    'data-display': ['content/foundations/microcopy.md', 'content/patterns/state-copy.md'],
    'mobile-arch': ['content/foundations/microcopy.md'],
    'offline': ['content/patterns/state-copy.md'],
    'realtime': ['content/patterns/notification-content.md'],
  };

  test('all 20 concerns have content-author key with correct modules', () => {
    for (const [concern, modules] of Object.entries(expectedContentAuthor)) {
      assert.ok(map.concerns[concern], `concern "${concern}" missing from composition-map`);
      assert.ok(
        map.concerns[concern]['content-author'],
        `concern "${concern}" missing content-author key`,
      );
      assert.deepStrictEqual(
        map.concerns[concern]['content-author'],
        modules,
        `concern "${concern}" content-author mismatch`,
      );
    }
  });

  test('all content-author module paths reference existing files', () => {
    const allModules = new Set(Object.values(expectedContentAuthor).flat());
    for (const mod of allModules) {
      const fullPath = path.join(ROOT, 'expertise', mod);
      assert.ok(
        fs.existsSync(fullPath),
        `content module "${mod}" does not exist at ${fullPath}`,
      );
    }
  });

  test('no concerns have duplicate content-author entries', () => {
    for (const [concern, modules] of Object.entries(expectedContentAuthor)) {
      const unique = new Set(modules);
      assert.strictEqual(
        unique.size,
        modules.length,
        `concern "${concern}" has duplicate content-author entries`,
      );
    }
  });
});
