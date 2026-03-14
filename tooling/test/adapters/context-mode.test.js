import { describe, test } from 'node:test';
import assert from 'node:assert';

import {
  isEnabled,
  bridgeResearcherFetch,
  bridgeFileRead,
  collectStats,
} from '../../src/adapters/context-mode.js';

describe('isEnabled', () => {
  test('returns true when config has context_mode.enabled = true', () => {
    assert.strictEqual(isEnabled({ context_mode: { enabled: true } }), true);
  });

  test('returns false when config has context_mode.enabled = false', () => {
    assert.strictEqual(isEnabled({ context_mode: { enabled: false } }), false);
  });

  test('returns false when config has no context_mode key', () => {
    assert.strictEqual(isEnabled({}), false);
  });

  test('returns false when config is null or undefined', () => {
    assert.strictEqual(isEnabled(null), false);
    assert.strictEqual(isEnabled(undefined), false);
  });

  test('returns false when SUPERAGENT_DISABLE_CONTEXT_MODE is set', () => {
    const prev = process.env.SUPERAGENT_DISABLE_CONTEXT_MODE;
    try {
      process.env.SUPERAGENT_DISABLE_CONTEXT_MODE = '1';
      assert.strictEqual(isEnabled({ context_mode: { enabled: true } }), false);
    } finally {
      if (prev === undefined) {
        delete process.env.SUPERAGENT_DISABLE_CONTEXT_MODE;
      } else {
        process.env.SUPERAGENT_DISABLE_CONTEXT_MODE = prev;
      }
    }
  });
});

describe('bridgeResearcherFetch', () => {
  const enabledConfig = { context_mode: { enabled: true } };
  const disabledConfig = { context_mode: { enabled: false } };

  test('returns hint object when enabled', () => {
    const hint = bridgeResearcherFetch(enabledConfig, 'https://example.com/docs', 'react-docs');
    assert.strictEqual(hint.tool, 'mcp__plugin_context-mode_context-mode__fetch_and_index');
    assert.deepStrictEqual(hint.args, { url: 'https://example.com/docs', source: 'react-docs' });
  });

  test('returns null when disabled', () => {
    assert.strictEqual(bridgeResearcherFetch(disabledConfig, 'https://example.com', 'docs'), null);
  });

  test('returns null when config is null', () => {
    assert.strictEqual(bridgeResearcherFetch(null, 'https://example.com', 'docs'), null);
  });
});

describe('bridgeFileRead', () => {
  const enabledConfig = { context_mode: { enabled: true } };
  const disabledConfig = { context_mode: { enabled: false } };

  test('returns hint object when enabled', () => {
    const hint = bridgeFileRead(enabledConfig, 'src/main.js', 'find the entry point');
    assert.strictEqual(hint.tool, 'mcp__plugin_context-mode_context-mode__execute_file');
    assert.strictEqual(hint.args.path, 'src/main.js');
    assert.strictEqual(hint.args.intent, 'find the entry point');
    assert.strictEqual(hint.args.language, 'shell');
  });

  test('returns null when disabled', () => {
    assert.strictEqual(bridgeFileRead(disabledConfig, 'src/main.js', 'read'), null);
  });
});

describe('collectStats', () => {
  test('returns null when disabled', () => {
    const result = collectStats({ context_mode: { enabled: false } });
    assert.strictEqual(result, null);
  });

  test('returns null when config is missing', () => {
    assert.strictEqual(collectStats(null), null);
  });

  test('returns collection hint when enabled', () => {
    const result = collectStats({ context_mode: { enabled: true } });
    assert.strictEqual(result.should_collect, true);
    assert.strictEqual(result.tool, 'mcp__plugin_context-mode_context-mode__stats');
  });
});
