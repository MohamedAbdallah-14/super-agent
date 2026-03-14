// 9 specified tests
import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'yaml';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CI_PATH = path.join(ROOT, '.github', 'workflows', 'ci.yml');

function loadCI() {
  const raw = fs.readFileSync(CI_PATH, 'utf8');
  return yaml.parse(raw);
}

describe('CI workflow — branch triggers', () => {
  test('push triggers include main, develop, codex/**, release/**, hotfix/**', () => {
    const ci = loadCI();
    const branches = ci.on.push.branches;
    assert.ok(Array.isArray(branches), 'on.push.branches must be an array');
    for (const expected of ['main', 'develop', 'codex/**', 'release/**', 'hotfix/**']) {
      assert.ok(branches.includes(expected), `Missing push branch trigger: ${expected}`);
    }
  });

  test('pull_request trigger is present', () => {
    const ci = loadCI();
    assert.ok(ci.on.pull_request !== undefined, 'pull_request trigger must exist');
  });
});

describe('CI workflow — checkout configuration', () => {
  test('checkout uses fetch-depth: 0 for full history', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const checkout = steps.find(s => s.uses && s.uses.startsWith('actions/checkout'));
    assert.ok(checkout, 'checkout step must exist');
    assert.strictEqual(checkout.with['fetch-depth'], 0, 'fetch-depth must be 0');
  });
});

describe('CI workflow — validation steps', () => {
  test('has "Validate branch name" step with PR-only condition and --branch flag', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const step = steps.find(s => s.name === 'Validate branch name');
    assert.ok(step, 'Validate branch name step must exist');
    assert.match(step.if, /pull_request/, 'must run only on pull_request');
    assert.match(step.run, /validate branches --branch/, 'must use validate branches --branch');
    // github.head_ref passed via env var for injection safety
    assert.ok(step.env, 'must have env block');
    const envStr = JSON.stringify(step.env);
    assert.match(envStr, /github\.head_ref/, 'env must reference github.head_ref');
  });

  test('has "Validate conventional commits" step with PR-only condition and SHA refs', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const step = steps.find(s => s.name === 'Validate conventional commits');
    assert.ok(step, 'Validate conventional commits step must exist');
    assert.match(step.if, /pull_request/, 'must run only on pull_request');
    assert.match(step.run, /validate commits/, 'must use validate commits');
    assert.match(step.run, /--base/, 'must use --base flag');
    assert.match(step.run, /--head/, 'must use --head flag');
    // SHA refs passed via env vars for safety
    assert.ok(step.env, 'must have env block');
    const envStr = JSON.stringify(step.env);
    assert.match(envStr, /pull_request\.base\.sha/, 'env must reference base SHA');
    assert.match(envStr, /pull_request\.head\.sha/, 'env must reference head SHA');
  });

  test('has "Validate changelog format" step for PRs with --head SHA', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const step = steps.find(s => s.name === 'Validate changelog format');
    assert.ok(step, 'Validate changelog format step must exist');
    assert.match(step.if, /pull_request/, 'must run only on pull_request');
    assert.match(step.run, /validate changelog/, 'must use validate changelog');
    assert.match(step.run, /--head/, 'must use --head flag');
    // SHA ref passed via env var for safety
    assert.ok(step.env, 'must have env block');
    const envStr = JSON.stringify(step.env);
    assert.match(envStr, /pull_request\.head\.sha/, 'env must reference head SHA');
  });

  test('has "Validate changelog format (push)" step for push events without --head', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const step = steps.find(s => s.name === 'Validate changelog format (push)');
    assert.ok(step, 'Validate changelog format (push) step must exist');
    assert.match(step.if, /push/, 'must run only on push');
    assert.doesNotMatch(step.run, /--head/, 'push variant must NOT use --head');
    assert.match(step.run, /validate changelog/, 'must use validate changelog');
  });

  test('has "Require changelog entries" step for feat/feature/codex/hotfix PRs', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const step = steps.find(s => s.name === 'Require changelog entries');
    assert.ok(step, 'Require changelog entries step must exist');
    assert.match(step.if, /pull_request/, 'must run only on pull_request');
    assert.match(step.run, /--require-entries/, 'must use --require-entries flag');
    assert.match(step.run, /--base/, 'must use --base flag');
    assert.match(step.run, /--head/, 'must use --head flag');
    // Check branch prefix conditions
    const ifCond = step.if;
    for (const prefix of ['feat/', 'feature/', 'codex/', 'hotfix/']) {
      assert.match(ifCond, new RegExp(prefix.replace('/', '\\/')), `if condition must check ${prefix} prefix`);
    }
  });
});

describe('CI workflow — step ordering', () => {
  test('validation steps come after "Verify generated exports are committed"', () => {
    const ci = loadCI();
    const steps = ci.jobs.verify.steps;
    const names = steps.map(s => s.name).filter(Boolean);
    const exportsIdx = names.indexOf('Verify generated exports are committed');
    const branchIdx = names.indexOf('Validate branch name');
    assert.ok(exportsIdx >= 0, 'Verify generated exports step must exist');
    assert.ok(branchIdx >= 0, 'Validate branch name step must exist');
    assert.ok(branchIdx > exportsIdx, 'Validation steps must come after exports verification');
  });
});
