import path from 'node:path';

import { findProjectRoot } from '../project-root.js';
import {
  validateHooksAtProjectRoot,
  validateManifestAtProjectRoot,
} from '../commands/validate.js';
import {
  buildHostExports,
  checkHostExportDrift,
} from './compiler.js';

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

export function runExportCommand(parsed, context = {}) {
  try {
    const projectRoot = findProjectRoot(context.cwd ?? process.cwd());
    const wantsJson = parsed.args.includes('--json');
    const wantsCheck = parsed.args.includes('--check');

    const manifestResult = validateManifestAtProjectRoot(projectRoot);
    if (manifestResult.exitCode !== 0) {
      return manifestResult;
    }

    const hooksResult = validateHooksAtProjectRoot(projectRoot);
    if (hooksResult.exitCode !== 0) {
      return hooksResult;
    }

    if (parsed.subcommand === 'build') {
      const summary = buildHostExports(projectRoot);
      return success(summary, {
        json: wantsJson,
        formatText: (value) => {
          const warningSuffix = value.warnings?.length
            ? ` Warnings: ${value.warnings.join('; ')}.`
            : '';
          return `Generated host exports for ${value.hosts.join(', ')}.${warningSuffix}`;
        },
      });
    }

    if (wantsCheck && !parsed.subcommand) {
      const drifts = checkHostExportDrift(projectRoot);

      if (drifts.length > 0) {
        return failure(`Export drift detected:\n- ${drifts.join('\n- ')}`);
      }

      return success('Export drift check passed.');
    }

    return failure('Usage: superagent export build [--json] | superagent export --check', 2);
  } catch (error) {
    return failure(error.message);
  }
}
