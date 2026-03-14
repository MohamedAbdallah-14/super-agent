import fs from 'node:fs';
import path from 'node:path';

import { parseCommandOptions } from '../command-options.js';
import { readYamlFile } from '../loaders.js';
import { findProjectRoot } from '../project-root.js';
import { resolveStateRoot } from '../state-root.js';

function success(payload, options = {}) {
  if (options.json) {
    return {
      exitCode: 0,
      stdout: `${JSON.stringify(payload, null, 2)}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: `${payload.run_id} ${payload.phase} ${payload.status}\n`,
  };
}

export function runStatusCommand(parsed, context = {}) {
  try {
    if (parsed.subcommand) {
      return {
        exitCode: 1,
        stderr: 'Usage: superagent status --run <id> [--state-root <path>] [--json]\n',
      };
    }

    const { options } = parseCommandOptions(parsed.args, {
      boolean: ['json'],
      string: ['run', 'state-root'],
    });

    if (!options.run) {
      return {
        exitCode: 1,
        stderr: 'superagent status requires --run <id>\n',
      };
    }

    const projectRoot = findProjectRoot(context.cwd ?? process.cwd());
    const manifest = readYamlFile(path.join(projectRoot, 'superagent.manifest.yaml'));
    const stateRoot = resolveStateRoot(projectRoot, manifest, {
      cwd: context.cwd ?? process.cwd(),
      override: options.stateRoot,
    });
    const statusPath = path.join(stateRoot, 'runs', options.run, 'status.json');

    if (!fs.existsSync(statusPath)) {
      return {
        exitCode: 1,
        stderr: `Run status not found: ${statusPath}\n`,
      };
    }

    const payload = {
      ...JSON.parse(fs.readFileSync(statusPath, 'utf8')),
      status_path: statusPath,
    };

    return success(payload, { json: options.json });
  } catch (error) {
    return {
      exitCode: 1,
      stderr: `${error.message}\n`,
    };
  }
}
