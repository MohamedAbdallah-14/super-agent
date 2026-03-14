import fs from 'node:fs';
import path from 'node:path';

import { readYamlFile } from '../loaders.js';
import { findProjectRoot } from '../project-root.js';
import { resolveStateRoot } from '../state-root.js';
import {
  validateHooksAtProjectRoot,
  validateManifestAtProjectRoot,
} from '../commands/validate.js';

function success(payload, options = {}) {
  if (options.json) {
    return {
      exitCode: payload.healthy ? 0 : 1,
      stdout: `${JSON.stringify(payload, null, 2)}\n`,
    };
  }

  const lines = payload.checks.map((check) => `${check.status.toUpperCase()} ${check.name}: ${check.detail}`);
  return {
    exitCode: payload.healthy ? 0 : 1,
    stdout: `${lines.join('\n')}\n`,
  };
}

export function runDoctorCommand(parsed, context = {}) {
  try {
    if (parsed.subcommand) {
      return {
        exitCode: 1,
        stderr: 'Usage: superagent doctor [--json]\n',
      };
    }

    const wantsJson = parsed.args.includes('--json');
    const projectRoot = findProjectRoot(context.cwd ?? process.cwd());
    const manifest = readYamlFile(path.join(projectRoot, 'superagent.manifest.yaml'));
    const defaultStateRoot = resolveStateRoot(projectRoot, manifest, {
      cwd: context.cwd ?? process.cwd(),
    });
    const checks = [];

    const manifestResult = validateManifestAtProjectRoot(projectRoot);
    checks.push({
      name: 'manifest',
      status: manifestResult.exitCode === 0 ? 'pass' : 'fail',
      detail: manifestResult.exitCode === 0 ? 'Manifest is valid.' : manifestResult.stderr.trim(),
    });

    const hooksResult = validateHooksAtProjectRoot(projectRoot);
    checks.push({
      name: 'hooks',
      status: hooksResult.exitCode === 0 ? 'pass' : 'fail',
      detail: hooksResult.exitCode === 0 ? 'Hook definitions are valid.' : hooksResult.stderr.trim(),
    });

    const defaultStateInsideRepo = !path.relative(projectRoot, defaultStateRoot).startsWith('..');
    checks.push({
      name: 'state-root',
      status: defaultStateInsideRepo ? 'fail' : 'pass',
      detail: defaultStateInsideRepo
        ? `${defaultStateRoot} resolves inside the project root`
        : `${defaultStateRoot} stays outside the project root`,
    });

    const missingHostExports = manifest.hosts.filter((host) => {
      const exportPath = path.join(projectRoot, 'exports', 'hosts', host);
      return !fs.existsSync(exportPath);
    });
    checks.push({
      name: 'host-exports',
      status: missingHostExports.length === 0 ? 'pass' : 'fail',
      detail: missingHostExports.length === 0
        ? 'All required host export directories exist.'
        : `Missing export directories for: ${missingHostExports.join(', ')}`,
    });

    return success({
      healthy: checks.every((check) => check.status === 'pass'),
      project_root: projectRoot,
      state_root_default: defaultStateRoot,
      checks,
    }, { json: wantsJson });
  } catch (error) {
    return {
      exitCode: 1,
      stderr: `${error.message}\n`,
    };
  }
}
