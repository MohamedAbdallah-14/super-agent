import fs from 'node:fs';
import path from 'node:path';

import { parseCommandOptions, parsePositiveInteger } from '../command-options.js';
import { readYamlFile } from '../loaders.js';
import { findProjectRoot } from '../project-root.js';
import { resolveStateRoot } from '../state-root.js';
import {
  findSymbol,
  hashContent,
  logRetrieval,
  readFileSummary,
  readIndexedFile,
  readSymbolSummary,
} from '../index/storage.js';

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
    stateRoot,
  };
}

function readSlice(projectRoot, relativePath, lineStart, lineEnd, contextLines = 0) {
  const absolutePath = path.join(projectRoot, relativePath);
  const lines = fs.readFileSync(absolutePath, 'utf8').split('\n');
  const boundedStart = Math.max(1, lineStart);
  const boundedEnd = Math.min(lines.length, lineEnd);
  const expandedStart = Math.max(1, boundedStart - contextLines);
  const expandedEnd = Math.min(lines.length, boundedEnd + contextLines);

  return {
    relative_path: relativePath,
    line_start: boundedStart,
    line_end: boundedEnd,
    slice: lines.slice(boundedStart - 1, boundedEnd).join('\n'),
    context_before: lines.slice(expandedStart - 1, boundedStart - 1).join('\n'),
    context_after: lines.slice(boundedEnd, expandedEnd).join('\n'),
  };
}

export function runRecallCommand(parsed, context = {}) {
  try {
    const { positional, options } = parseCommandOptions(parsed.args, {
      boolean: ['json'],
      string: ['state-root', 'start-line', 'end-line', 'context', 'tier'],
    });

    if (options.tier && options.tier !== 'L0' && options.tier !== 'L1') {
      return failure('--tier must be L0 or L1');
    }

    if (options.tier && (options.startLine || options.endLine || options.context)) {
      return failure('--tier is mutually exclusive with --start-line, --end-line, and --context');
    }

    const { projectRoot, stateRoot } = loadProjectContext(context, options.stateRoot);
    const contextLines = options.context ? parsePositiveInteger(options.context, '--context') : 0;

    switch (parsed.subcommand) {
      case 'file': {
        const relativePath = positional[0];

        if (!relativePath) {
          return failure('Usage: superagent recall file <relative-path> --start-line <n> --end-line <n> [--context <n>] [--state-root <path>] [--json]');
        }

        const fileRecord = readIndexedFile(stateRoot, relativePath);

        if (!fileRecord) {
          return failure(`File is not indexed: ${relativePath}`);
        }

        if (options.tier) {
          const summary = readFileSummary(stateRoot, fileRecord.file_id, options.tier);

          if (!summary) {
            return failure(`No ${options.tier} summary found for ${relativePath}. Run 'superagent index summarize' first.`);
          }

          let liveContent;
          try {
            liveContent = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
          } catch (err) {
            if (err.code === 'ENOENT') {
              return failure(`File not found on disk: ${relativePath}`);
            }
            return failure(`Cannot read file: ${relativePath}: ${err.message}`);
          }

          const liveHash = hashContent(liveContent);
          const fresh = liveHash === summary.source_hash;

          logRetrieval(stateRoot, 'recall-file', relativePath, 1);
          return success({
            relative_path: relativePath,
            tier: options.tier,
            slice: summary.content,
            generator: summary.generator,
            generated_at: summary.generated_at,
            fresh,
          }, {
            json: options.json,
            formatText: (value) => value.slice,
          });
        }

        if (!options.startLine || !options.endLine) {
          return failure('superagent recall file requires --start-line and --end-line');
        }

        const slice = readSlice(
          projectRoot,
          relativePath,
          parsePositiveInteger(options.startLine, '--start-line'),
          parsePositiveInteger(options.endLine, '--end-line'),
          contextLines,
        );
        logRetrieval(stateRoot, 'recall-file', relativePath, 1);
        return success(slice, {
          json: options.json,
          formatText: (value) => value.slice,
        });
      }
      case 'symbol': {
        const query = positional[0];

        if (!query) {
          return failure('Usage: superagent recall symbol <name-or-id> [--context <n>] [--state-root <path>] [--json]');
        }

        const symbol = findSymbol(stateRoot, query);

        if (!symbol) {
          return failure(`No indexed symbol found for "${query}"`);
        }

        if (options.tier) {
          const summary = readSymbolSummary(stateRoot, symbol.symbol_id, options.tier);

          if (!summary) {
            return failure(`No ${options.tier} summary found for ${symbol.name}. Run 'superagent index summarize' first.`);
          }

          let liveContent;
          try {
            liveContent = fs.readFileSync(path.join(projectRoot, symbol.relative_path), 'utf8');
          } catch (err) {
            if (err.code === 'ENOENT') {
              return failure(`File not found on disk: ${symbol.relative_path}`);
            }
            return failure(`Cannot read file: ${symbol.relative_path}: ${err.message}`);
          }

          const liveHash = hashContent(liveContent);
          const fresh = liveHash === summary.source_hash;

          logRetrieval(stateRoot, 'recall-symbol', query, 1);
          return success({
            relative_path: symbol.relative_path,
            name: symbol.name,
            kind: symbol.kind,
            signature: symbol.signature,
            tier: options.tier,
            slice: summary.content,
            generator: summary.generator,
            generated_at: summary.generated_at,
            fresh,
          }, {
            json: options.json,
            formatText: (value) => value.slice,
          });
        }

        const slice = readSlice(
          projectRoot,
          symbol.relative_path,
          symbol.line_start,
          symbol.line_end,
          contextLines,
        );
        logRetrieval(stateRoot, 'recall-symbol', query, 1);
        return success({
          ...symbol,
          ...slice,
        }, {
          json: options.json,
          formatText: (value) => value.slice,
        });
      }
      default:
        return failure('Usage: superagent recall <file|symbol> [options]');
    }
  } catch (error) {
    return failure(error.message);
  }
}
