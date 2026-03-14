import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs } from '../src/cli.js';

const CLI_PATH = fileURLToPath(new URL('../src/cli.js', import.meta.url));

describe('superagent cli parser', () => {
  test('parses top-level command and subcommand', () => {
    const parsed = parseArgs(['validate', 'manifest']);
    assert.deepStrictEqual(parsed, {
      command: 'validate',
      subcommand: 'manifest',
      args: [],
      help: false
    });
  });

  test('treats --help as help mode', () => {
    const parsed = parseArgs(['--help']);
    assert.deepStrictEqual(parsed, {
      command: null,
      subcommand: null,
      args: [],
      help: true
    });
  });
});

describe('superagent cli executable', () => {
  test('prints help text with active command families', () => {
    const out = execFileSync('node', [CLI_PATH, '--help'], { encoding: 'utf8' });

    assert.match(out, /superagent/i);
    assert.match(out, /export/);
    assert.match(out, /validate/);
    assert.match(out, /doctor/);
    assert.match(out, /index/);
    assert.match(out, /recall/);
    assert.match(out, /status/);
    assert.match(out, /capture/);
  });

  test('runs when invoked through a launcher symlink', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'superagent-cli-'));
    const launcherPath = path.join(tempDir, 'superagent');

    fs.symlinkSync(CLI_PATH, launcherPath);

    try {
      const out = execFileSync('node', [launcherPath, '--help'], { encoding: 'utf8' });

      assert.match(out, /superagent/i);
      assert.match(out, /export/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
