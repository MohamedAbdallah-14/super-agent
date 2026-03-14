import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { listYamlFiles, readJsonFile, readYamlFile } from '../loaders.js';
import { findProjectRoot } from '../project-root.js';
import { validateAgainstSchema } from '../schema-validator.js';
import { validateDocsAtProjectRoot } from '../checks/docs-truth.js';
import { validateBrandTruthAtProjectRoot } from '../checks/brand-truth.js';
import { validateRuntimeSurfaceAtProjectRoot } from '../checks/runtime-surface.js';
import { validateBranchName } from '../checks/branches.js';
import { validateCommits } from '../checks/commits.js';
import { validateChangelog } from '../checks/changelog.js';

function success(stdout) {
  return { exitCode: 0, stdout: `${stdout}\n` };
}

function failure(stderr, exitCode = 1) {
  return { exitCode, stderr: `${stderr}\n` };
}

function notImplemented(name) {
  return failure(`${name} is not implemented yet`, 2);
}

function resolveRepoPath(projectRoot, relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const projectRelativePath = path.relative(projectRoot, absolutePath);
  const escapesProjectRoot = (
    projectRelativePath === '..' ||
    projectRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(projectRelativePath)
  );

  return {
    absolutePath,
    escapesProjectRoot,
  };
}

function workflowFileName(workflowId) {
  return `${workflowId.replaceAll('_', '-')}.md`;
}

function createTermPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startsWithWord = /^\w/.test(term);
  const endsWithWord = /\w$/.test(term);
  const prefix = startsWithWord ? '\\b' : '';
  const suffix = endsWithWord ? '\\b' : '';
  return new RegExp(`${prefix}${escaped}${suffix}`, 'i');
}

function collectDeclaredContentFiles(projectRoot, manifest) {
  const files = [
    ...manifest.roles.map((role) => path.join(projectRoot, 'roles', `${role}.md`)),
    ...manifest.workflows.map((workflow) => path.join(projectRoot, 'workflows', workflowFileName(workflow))),
  ];

  return files;
}

export function validateManifestAtProjectRoot(projectRoot) {
  const manifestPath = path.join(projectRoot, 'superagent.manifest.yaml');
  const schemaPath = path.join(projectRoot, 'schemas', 'superagent-manifest.schema.json');
  const manifest = readYamlFile(manifestPath);
  const schema = readJsonFile(schemaPath);

  if (manifest?.manifest_version === 1) {
    return failure(
      'Manifest version check failed:\n' +
      '- manifest_version 1 is no longer supported; migrate to manifest_version 2\n' +
      '- add required fields: project.description, versioning_policy, workflows, export_targets, prohibited_terms\n' +
      '- prohibited_terms enforcement in v2 applies only to manifest-declared role and workflow files',
    );
  }

  const result = validateAgainstSchema(schema, manifest);

  if (!result.valid) {
    return failure(`Manifest schema validation failed:\n- ${result.errors.join('\n- ')}`);
  }

  const missingPaths = Object.entries(manifest.paths)
    .filter(([, relativePath]) => (
      typeof relativePath === 'string' &&
      !relativePath.startsWith('~') &&
      !path.isAbsolute(relativePath) &&
      !relativePath.includes('{')
    ))
    .map(([name, relativePath]) => ({
      name,
      relativePath,
      ...resolveRepoPath(projectRoot, relativePath),
    }));

  const escapedPaths = missingPaths.filter(({ escapesProjectRoot }) => escapesProjectRoot);

  if (escapedPaths.length > 0) {
    return failure(`Manifest path check failed:\n- ${escapedPaths.map(({ name, relativePath }) => `${name}: ${relativePath} resolves outside the project root`).join('\n- ')}`);
  }

  const nonexistentPaths = missingPaths.filter(({ absolutePath }) => !fs.existsSync(absolutePath));

  if (nonexistentPaths.length > 0) {
    return failure(`Manifest path check failed:\n- ${nonexistentPaths.map(({ name, absolutePath }) => `${name}: missing ${absolutePath}`).join('\n- ')}`);
  }

  const missingRoleFiles = manifest.roles
    .map((role) => path.join(projectRoot, 'roles', `${role}.md`))
    .filter((filePath) => !fs.existsSync(filePath));

  if (missingRoleFiles.length > 0) {
    return failure(`Manifest role check failed:\n- ${missingRoleFiles.map((filePath) => path.relative(projectRoot, filePath)).join('\n- ')}`);
  }

  const missingWorkflowFiles = manifest.workflows
    .map((workflow) => path.join(projectRoot, 'workflows', workflowFileName(workflow)))
    .filter((filePath) => !fs.existsSync(filePath));

  if (missingWorkflowFiles.length > 0) {
    return failure(`Manifest workflow check failed:\n- ${missingWorkflowFiles.map((filePath) => path.relative(projectRoot, filePath)).join('\n- ')}`);
  }

  const invalidExportTargets = manifest.export_targets
    .filter((target) => !manifest.hosts.includes(target));

  if (invalidExportTargets.length > 0) {
    return failure(`Manifest export target check failed:\n- ${invalidExportTargets.map((target) => `${target}: export target must also be declared in hosts`).join('\n- ')}`);
  }

  const prohibitedTermMatches = [];

  for (const filePath of collectDeclaredContentFiles(projectRoot, manifest)) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const term of manifest.prohibited_terms ?? []) {
      if (createTermPattern(term).test(content)) {
        prohibitedTermMatches.push(`${path.relative(projectRoot, filePath)}: contains prohibited term "${term}"`);
      }
    }
  }

  if (prohibitedTermMatches.length > 0) {
    return failure(`Manifest prohibited term check failed:\n- ${prohibitedTermMatches.join('\n- ')}`);
  }

  return success('Manifest is valid.');
}

export function validateHooksAtProjectRoot(projectRoot) {
  const manifestPath = path.join(projectRoot, 'superagent.manifest.yaml');
  const manifest = readYamlFile(manifestPath);
  const schemaPath = path.join(projectRoot, 'schemas', 'hook.schema.json');
  const schema = readJsonFile(schemaPath);
  const hooksDir = path.join(projectRoot, 'hooks', 'definitions');
  const hookFiles = listYamlFiles(hooksDir);
  const errors = [];
  const actualHookIds = [];

  for (const hookFile of hookFiles) {
    const hook = readYamlFile(hookFile);
    const hookFileId = path.basename(hookFile, path.extname(hookFile));
    const validation = validateAgainstSchema(schema, hook);

    if (!validation.valid) {
      errors.push(`${hookFileId}: ${validation.errors.join('; ')}`);
    }

    if (!hook || typeof hook !== 'object' || Array.isArray(hook)) {
      continue;
    }

    if (hook.id !== hookFileId) {
      errors.push(`${hookFileId}: hook id "${hook.id}" does not match filename`);
    }

    for (const host of manifest.hosts) {
      if (!hook.host_fallback?.[host]) {
        errors.push(`${hookFileId}: missing host_fallback.${host}`);
      }
    }

    actualHookIds.push(hook.id);
  }

  const missingRequiredHooks = manifest.required_hooks.filter((hookId) => !actualHookIds.includes(hookId));
  const unexpectedHooks = actualHookIds.filter((hookId) => !manifest.required_hooks.includes(hookId));

  if (missingRequiredHooks.length > 0) {
    errors.push(`Missing required hook definitions: ${missingRequiredHooks.join(', ')}`);
  }

  if (unexpectedHooks.length > 0) {
    errors.push(`Unexpected hook definitions not declared in manifest: ${unexpectedHooks.join(', ')}`);
  }

  if (errors.length > 0) {
    return failure(`Hook validation failed:\n- ${errors.join('\n- ')}`);
  }

  return success(`Hooks are valid. Checked ${hookFiles.length} definition files.`);
}

function extractFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

export function runValidateCommand(parsed, context = {}) {
  const projectRoot = findProjectRoot(context.cwd ?? process.cwd());

  switch (parsed.subcommand) {
    case 'manifest':
      return validateManifestAtProjectRoot(projectRoot);
    case 'hooks':
      return validateHooksAtProjectRoot(projectRoot);
    case 'artifacts':
      return notImplemented('superagent validate artifacts');
    case 'docs':
      return validateDocsAtProjectRoot(projectRoot);
    case 'brand':
      return validateBrandTruthAtProjectRoot(projectRoot);
    case 'runtime':
      return validateRuntimeSurfaceAtProjectRoot(projectRoot);
    case 'branches':
      return validateBranchName(extractFlag(parsed.args, '--branch'));
    case 'commits':
      return validateCommits({
        base: extractFlag(parsed.args, '--base'),
        head: extractFlag(parsed.args, '--head'),
        cwd: projectRoot,
      });
    case 'changelog':
      return validateChangelog(projectRoot, {
        head: extractFlag(parsed.args, '--head'),
        base: extractFlag(parsed.args, '--base'),
        requireEntries: hasFlag(parsed.args, '--require-entries'),
      });
    default: {
      if (parsed.subcommand != null) {
        return failure(`Unknown validator: ${parsed.subcommand}\nUsage: superagent validate <manifest|hooks|docs|brand|runtime|branches|commits|changelog>`);
      }

      if (parsed.args.length > 0) {
        return failure('Flags require a subcommand. Specify a subcommand, e.g.: superagent validate commits --base HEAD~5');
      }

      const hasGit = (() => {
        try {
          execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: projectRoot, stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      })();
      const hasChangelog = fs.existsSync(path.join(projectRoot, 'CHANGELOG.md'));

      const validators = [
        { name: 'manifest', fn: () => validateManifestAtProjectRoot(projectRoot) },
        { name: 'hooks', fn: () => validateHooksAtProjectRoot(projectRoot) },
        { name: 'docs', fn: () => validateDocsAtProjectRoot(projectRoot) },
        { name: 'brand', fn: () => validateBrandTruthAtProjectRoot(projectRoot) },
        { name: 'runtime', fn: () => validateRuntimeSurfaceAtProjectRoot(projectRoot) },
        { name: 'branches', fn: () => validateBranchName(), available: hasGit },
        { name: 'commits', fn: () => validateCommits({ cwd: projectRoot }), available: hasGit },
        { name: 'changelog', fn: () => validateChangelog(projectRoot, {}), available: hasChangelog },
      ];

      const lines = [];
      let failed = false;

      for (const { name, fn, available } of validators) {
        if (available === false) {
          lines.push(`SKIP ${name}: prerequisite not available`);
          continue;
        }
        let result;
        try {
          result = fn();
        } catch (error) {
          failed = true;
          lines.push(`FAIL ${name}: ${error.message}`);
          continue;
        }
        const status = result.exitCode === 0 ? 'PASS' : 'FAIL';
        if (result.exitCode !== 0) failed = true;
        lines.push(`${status} ${name}: ${(result.stdout || result.stderr || '').trim()}`);
      }

      const output = lines.join('\n');
      return failed ? failure(output) : success(output);
    }
  }
}
