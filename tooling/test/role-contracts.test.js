// 6 specified tests — one per role contract
import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const ROLE_FILES = [
  'roles/planner.md',
  'roles/executor.md',
  'roles/verifier.md',
  'roles/reviewer.md',
  'roles/learner.md',
  'roles/designer.md',
];

describe('role contract git-flow sections', () => {
  for (const roleFile of ROLE_FILES) {
    test(`${roleFile} contains a Git-Flow Responsibilities section`, () => {
      const content = fs.readFileSync(path.join(ROOT, roleFile), 'utf8');
      assert.match(content, /^## Git-Flow Responsibilities$/m,
        `${roleFile} is missing "## Git-Flow Responsibilities" section`);
    });
  }
});

describe('role contract git-flow section placement', () => {
  for (const roleFile of ROLE_FILES) {
    test(`${roleFile} has Git-Flow Responsibilities after Required Outputs`, () => {
      const content = fs.readFileSync(path.join(ROOT, roleFile), 'utf8');
      const requiredOutputsIndex = content.indexOf('## Required Outputs');
      const gitFlowIndex = content.indexOf('## Git-Flow Responsibilities');

      assert.ok(requiredOutputsIndex !== -1, `${roleFile} missing Required Outputs section`);
      assert.ok(gitFlowIndex !== -1, `${roleFile} missing Git-Flow Responsibilities section`);
      assert.ok(gitFlowIndex > requiredOutputsIndex,
        `${roleFile}: Git-Flow Responsibilities must appear after Required Outputs`);
    });
  }
});

describe('role contract git-flow content', () => {
  test('planner.md includes target branch and commit_message responsibilities', () => {
    const content = fs.readFileSync(path.join(ROOT, 'roles/planner.md'), 'utf8');
    assert.match(content, /specify target branch/);
    assert.match(content, /commit_message.*field/);
  });

  test('executor.md includes branch creation, conventional commits, changelog, and no-merge responsibilities', () => {
    const content = fs.readFileSync(path.join(ROOT, 'roles/executor.md'), 'utf8');
    assert.match(content, /create feature\/codex branch/);
    assert.match(content, /conventional commit format/);
    assert.match(content, /CHANGELOG\.md/);
    assert.match(content, /do NOT merge/);
  });

  test('verifier.md includes validate branches, commits, changelog responsibilities', () => {
    const content = fs.readFileSync(path.join(ROOT, 'roles/verifier.md'), 'utf8');
    assert.match(content, /superagent validate branches/);
    assert.match(content, /superagent validate commits/);
    assert.match(content, /superagent validate changelog/);
    assert.match(content, /--require-entries/);
  });

  test('reviewer.md includes changelog quality and commit content quality responsibilities', () => {
    const content = fs.readFileSync(path.join(ROOT, 'roles/reviewer.md'), 'utf8');
    assert.match(content, /changelog entries/);
    assert.match(content, /commit messages accurately describe/);
  });

  test('learner.md includes violation recording and pattern tracking responsibilities', () => {
    const content = fs.readFileSync(path.join(ROOT, 'roles/learner.md'), 'utf8');
    assert.match(content, /git-flow violations/);
    assert.match(content, /track patterns of violations/);
  });

  test('designer.md includes conventional commit format and state directory responsibilities', () => {
    const content = fs.readFileSync(path.join(ROOT, 'roles/designer.md'), 'utf8');
    assert.match(content, /feat\(design\)/);
    assert.match(content, /run-local state directory/);
  });
});

describe('designer role contract', () => {
  test('designer role file exists and has required sections', () => {
    const rolePath = path.join(ROOT, 'roles', 'designer.md');
    assert.ok(fs.existsSync(rolePath), 'roles/designer.md missing');
    const content = fs.readFileSync(rolePath, 'utf8');
    assert.ok(content.includes('## Purpose'), 'missing Purpose section');
    assert.ok(content.includes('## Inputs'), 'missing Inputs section');
    assert.ok(content.includes('## Required Outputs'), 'missing Required Outputs section');
    assert.ok(content.includes('## Failure Conditions'), 'missing Failure Conditions section');
  });
});
