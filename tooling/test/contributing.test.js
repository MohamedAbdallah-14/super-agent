// 4 specified tests
import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CONTRIBUTING_PATH = path.join(ROOT, 'CONTRIBUTING.md');

describe('CONTRIBUTING.md', () => {
  test('file exists', () => {
    assert.ok(fs.existsSync(CONTRIBUTING_PATH), 'CONTRIBUTING.md must exist');
  });

  test('contains Your first contribution section', () => {
    const content = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    assert.match(content, /## Your first contribution/, 'Missing section: Your first contribution');
  });

  test('Your first contribution section appears after Local setup and before Change expectations', () => {
    const content = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const setupIndex = content.indexOf('## Local setup');
    const firstContribIndex = content.indexOf('## Your first contribution');
    const changeIndex = content.indexOf('## Change expectations');
    assert.ok(setupIndex > -1, 'Local setup section must exist');
    assert.ok(firstContribIndex > -1, 'Your first contribution section must exist');
    assert.ok(changeIndex > -1, 'Change expectations section must exist');
    assert.ok(firstContribIndex > setupIndex, 'Your first contribution must appear after Local setup');
    assert.ok(firstContribIndex < changeIndex, 'Your first contribution must appear before Change expectations');
  });

  test('Your first contribution section contains required content', () => {
    const content = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    assert.match(content, /good first issue/, 'Must mention good first issue label');
    assert.match(content, /MohamedAbdallah-14\/super-agent/, 'Must reference correct repo URL');
    assert.match(content, /Fork the repository/, 'Must mention forking');
    assert.match(content, /Open a pull request/, 'Must mention opening a PR');
    assert.match(content, /Discussion/, 'Must mention Discussions');
  });
});
