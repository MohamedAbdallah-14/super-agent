import path from 'node:path';

import { parseCommandOptions } from '../command-options.js';
import { readYamlFile } from '../loaders.js';
import { findProjectRoot } from '../project-root.js';
import { resolveStateRoot } from '../state-root.js';
import {
  buildOrRefreshIndex,
  findSymbol,
  readFileOutline,
  readIndexStats,
  searchSymbols,
  summarizeIndex,
} from './storage.js';

function success(payload, options = {}) {
  if (options.json) {
    return {
      exitCode: 0,
      stdout: `${JSON.stringify(payload, null, 2)}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: `${options.formatText ? options.formatText(payload) : String(payload)}\n`,
  };
}

function failure(message, exitCode = 1) {
  return {
    exitCode,
    stderr: `${message}\n`,
  };
}

function loadProjectContext(context, stateRootOverride) {
  const projectRoot = findProjectRoot(context.cwd ?? process.cwd());
  const manifest = readYamlFile(path.join(projectRoot, 'superagent.manifest.yaml'));
  const stateRoot = resolveStateRoot(projectRoot, manifest, {
    cwd: context.cwd ?? process.cwd(),
    override: stateRootOverride,
  });

  return {
    projectRoot,
    manifest,
    stateRoot,
  };
}

export function runIndexCommand(parsed, context = {}) {
  try {
    const { positional, options } = parseCommandOptions(parsed.args, {
      boolean: ['json', 'refresh'],
      string: ['state-root', 'tier'],
    });
    const { projectRoot, stateRoot } = loadProjectContext(context, options.stateRoot);

    switch (parsed.subcommand) {
      case 'build': {
        const summary = buildOrRefreshIndex(projectRoot, stateRoot, 'build');
        return success(summary, {
          json: options.json,
          formatText: (value) => `Indexed ${value.file_count} files, ${value.symbol_count} symbols, and ${value.outline_count} outlines.`,
        });
      }
      case 'refresh': {
        const summary = buildOrRefreshIndex(projectRoot, stateRoot, 'refresh');
        return success(summary, {
          json: options.json,
          formatText: (value) => `Refreshed index: ${value.updated_file_count} files updated, ${value.removed_file_count} removed.`,
        });
      }
      case 'stats': {
        const stats = readIndexStats(stateRoot);
        return success(stats, {
          json: options.json,
          formatText: (value) => `Index stats: ${value.file_count} files, ${value.symbol_count} symbols, ${value.outline_count} outlines.`,
        });
      }
      case 'search-symbols': {
        const query = positional[0];

        if (!query) {
          return failure('Usage: superagent index search-symbols <query> [--state-root <path>] [--json]');
        }

        const results = searchSymbols(stateRoot, query);
        return success(results, {
          json: options.json,
          formatText: (value) => value.results
            .map((entry) => `${entry.name} (${entry.kind}) ${entry.relative_path}:${entry.line_start}`)
            .join('\n') || 'No symbol matches found.',
        });
      }
      case 'get-symbol': {
        const query = positional[0];

        if (!query) {
          return failure('Usage: superagent index get-symbol <name-or-id> [--state-root <path>] [--json]');
        }

        const symbol = findSymbol(stateRoot, query);

        if (!symbol) {
          return failure(`No indexed symbol found for "${query}"`);
        }

        return success(symbol, {
          json: options.json,
          formatText: (value) => `${value.name} (${value.kind}) ${value.relative_path}:${value.line_start}-${value.line_end}`,
        });
      }
      case 'get-file-outline': {
        const relativePath = positional[0];

        if (!relativePath) {
          return failure('Usage: superagent index get-file-outline <relative-path> [--state-root <path>] [--json]');
        }

        const outline = readFileOutline(stateRoot, relativePath);
        return success(outline, {
          json: options.json,
          formatText: (value) => value.entries
            .map((entry) => `${'#'.repeat(entry.level)} ${entry.label} (${entry.line_start}-${entry.line_end})`)
            .join('\n') || 'No outline entries found.',
        });
      }
      case 'summarize': {
        const tier = options.tier ?? 'all';

        if (!['L0', 'L1', 'all'].includes(tier)) {
          return failure('--tier must be L0, L1, or all');
        }

        const summary = summarizeIndex(projectRoot, stateRoot, {
          tier,
          refresh: options.refresh ?? false,
        });
        return success(summary, {
          json: options.json,
          formatText: (value) => `Summarized ${value.summarized_files} files and ${value.summarized_symbols} symbols.`,
        });
      }
      default:
        return failure('Usage: superagent index <build|refresh|stats|search-symbols|get-symbol|get-file-outline|summarize> [options]');
    }
  } catch (error) {
    return failure(error.message);
  }
}
