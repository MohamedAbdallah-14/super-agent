export function isEnabled(config) {
  if (process.env.SUPERAGENT_DISABLE_CONTEXT_MODE === '1') {
    return false;
  }

  if (!config || typeof config !== 'object') {
    return false;
  }

  return config.context_mode?.enabled === true;
}

export function bridgeResearcherFetch(config, url, source) {
  if (!isEnabled(config)) {
    return null;
  }

  return {
    tool: 'mcp__plugin_context-mode_context-mode__fetch_and_index',
    args: { url, source },
  };
}

export function bridgeFileRead(config, filePath, intent) {
  if (!isEnabled(config)) {
    return null;
  }

  return {
    tool: 'mcp__plugin_context-mode_context-mode__execute_file',
    args: {
      path: filePath,
      language: 'shell',
      code: 'cat "$FILE_CONTENT_PATH"',
      intent,
    },
  };
}

export function collectStats(config) {
  if (!isEnabled(config)) {
    return null;
  }

  return {
    should_collect: true,
    tool: 'mcp__plugin_context-mode_context-mode__stats',
    args: {},
  };
}
