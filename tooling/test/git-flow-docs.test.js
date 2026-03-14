// 8 specified tests
import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const GIT_FLOW_PATH = path.join(ROOT, 'docs', 'reference', 'git-flow.md');
const RELEASE_PROCESS_PATH = path.join(ROOT, 'docs', 'reference', 'release-process.md');

describe('docs/git-flow.md', () => {
  test('file exists', () => {
    assert.ok(fs.existsSync(GIT_FLOW_PATH), 'docs/git-flow.md must exist');
  });

  test('contains branching model table with all required branch types', () => {
    const content = fs.readFileSync(GIT_FLOW_PATH, 'utf8');
    assert.match(content, /## Branching Model/);
    for (const branch of ['Main', 'Develop', 'Feature', 'Codex', 'Release', 'Hotfix']) {
      assert.match(content, new RegExp(`\\|\\s*${branch}\\s*\\|`), `Missing branch type: ${branch}`);
    }
  });

  test('contains merge rules, conventional commits, changelog rules, and enforcement sections', () => {
    const content = fs.readFileSync(GIT_FLOW_PATH, 'utf8');
    for (const section of ['## Merge Rules', '## Conventional Commits', '## Changelog Rules', '## Enforcement']) {
      assert.match(content, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Missing section: ${section}`);
    }
  });

  test('does not contain forbidden brand terms', () => {
    const content = fs.readFileSync(GIT_FLOW_PATH, 'utf8');
    const forbidden = ['Agent OS', 'Symphony', 'daemon'];
    for (const term of forbidden) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      assert.doesNotMatch(content, regex, `Forbidden brand term found: ${term}`);
    }
  });
});

describe('docs/release-process.md', () => {
  test('file exists', () => {
    assert.ok(fs.existsSync(RELEASE_PROCESS_PATH), 'docs/release-process.md must exist');
  });

  test('contains tag naming, release workflow, hotfix workflow, and bootstrap sections', () => {
    const content = fs.readFileSync(RELEASE_PROCESS_PATH, 'utf8');
    for (const section of ['## Tag Naming', '## Release Workflow', '## Hotfix Workflow', '## Bootstrap']) {
      assert.match(content, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Missing section: ${section}`);
    }
  });

  test('references semantic versioning pattern', () => {
    const content = fs.readFileSync(RELEASE_PROCESS_PATH, 'utf8');
    assert.match(content, /v\{MAJOR\}\.\{MINOR\}\.\{PATCH\}/, 'Must reference semver pattern');
  });

  test('does not contain forbidden brand terms', () => {
    const content = fs.readFileSync(RELEASE_PROCESS_PATH, 'utf8');
    const forbidden = ['Agent OS', 'Symphony', 'daemon'];
    for (const term of forbidden) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      assert.doesNotMatch(content, regex, `Forbidden brand term found: ${term}`);
    }
  });
});
