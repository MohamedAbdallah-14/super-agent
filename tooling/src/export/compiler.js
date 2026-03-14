import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { readJsonFile, readYamlFile } from '../loaders.js';
import { validateAgainstSchema } from '../schema-validator.js';

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function listMarkdownFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.md'))
    .sort()
    .map((entry) => path.join(dirPath, entry));
}

function listHookDefinitions(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.yaml'))
    .sort()
    .map((entry) => path.join(dirPath, entry));
}

function workflowFileName(workflowId) {
  return `${workflowId.replaceAll('_', '-')}.md`;
}

function listDeclaredRoleFiles(projectRoot, manifest) {
  return manifest.roles
    .map((role) => path.join(projectRoot, 'roles', `${role}.md`))
    .sort();
}

function listDeclaredWorkflowFiles(projectRoot, manifest) {
  return manifest.workflows
    .map((workflow) => path.join(projectRoot, 'workflows', workflowFileName(workflow)))
    .sort();
}

function collectCanonicalSources(projectRoot, manifest) {
  return [
    path.join(projectRoot, 'superagent.manifest.yaml'),
    ...listDeclaredRoleFiles(projectRoot, manifest),
    ...listDeclaredWorkflowFiles(projectRoot, manifest),
    ...listHookDefinitions(path.join(projectRoot, 'hooks', 'definitions')),
  ];
}

function toRelativeMap(projectRoot, filePaths) {
  return Object.fromEntries(
    filePaths.map((filePath) => {
      const relativePath = path.relative(projectRoot, filePath);
      return [relativePath, hashContent(fs.readFileSync(filePath, 'utf8'))];
    }),
  );
}

function renderCommonInstructions(host, manifest) {
  return [
    `# ${manifest.project.display_name} for ${host[0].toUpperCase()}${host.slice(1)}`,
    '',
    `This host package is generated from the canonical SuperAgent sources.`,
    '',
    '## Canonical facts',
    '',
    `- project: ${manifest.project.display_name}`,
    `- hosts: ${manifest.hosts.join(', ')}`,
    `- phases: ${manifest.phases.join(', ')}`,
    `- roles: ${manifest.roles.join(', ')}`,
    `- protected paths: ${manifest.protected_paths.join(', ')}`,
    `- state root default: ${manifest.paths.state_root_default}`,
    '',
    '## Source of truth',
    '',
    '- `superagent.manifest.yaml`',
    '- `roles/*.md`',
    '- `workflows/*.md`',
    '- `hooks/definitions/*.yaml`',
    '',
  ].join('\n');
}

function renderClaudeSettings() {
  return JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: './hooks/protected-path-write-guard',
            },
          ],
        },
      ],
      SessionStart: [
        {
          hooks: [
            {
              type: 'command',
              command: './hooks/loop-cap-guard',
            },
          ],
        },
        {
          matcher: 'startup|resume|clear|compact',
          hooks: [
            {
              type: 'command',
              command: './hooks/session-start',
            },
          ],
        },
      ],
    },
  }, null, 2);
}

function renderCursorHooks() {
  return JSON.stringify({
    hooks: [
      {
        name: 'protected-path-write-guard',
        command: './hooks/protected-path-write-guard',
      },
      {
        name: 'loop-cap-guard',
        command: './hooks/loop-cap-guard',
      },
      {
        name: 'session-start',
        command: './hooks/session-start',
      },
    ],
  }, null, 2);
}

function generateHostFiles(projectRoot, manifest, host) {
  const common = renderCommonInstructions(host, manifest);
  const files = {};
  const roleFiles = listDeclaredRoleFiles(projectRoot, manifest);
  const workflowFiles = listDeclaredWorkflowFiles(projectRoot, manifest);

  if (host === 'claude') {
    files['CLAUDE.md'] = common;
    files['.claude/settings.json'] = renderClaudeSettings();

    for (const roleFile of roleFiles) {
      files[path.join('.claude', 'agents', path.basename(roleFile))] = fs.readFileSync(roleFile, 'utf8');
    }

    for (const workflowFile of workflowFiles) {
      files[path.join('.claude', 'commands', path.basename(workflowFile))] = fs.readFileSync(workflowFile, 'utf8');
    }
  } else if (host === 'codex') {
    files['AGENTS.md'] = common;
  } else if (host === 'gemini') {
    files['GEMINI.md'] = common;
  } else if (host === 'cursor') {
    files[path.join('.cursor', 'rules', 'superagent-core.mdc')] = common;
    files[path.join('.cursor', 'hooks.json')] = renderCursorHooks();
  }

  return files;
}

function validateGeneratedMetadata(schemas, hostPackage, exportManifest) {
  const hostValidation = validateAgainstSchema(schemas.hostSchema, hostPackage);
  const exportValidation = validateAgainstSchema(schemas.exportSchema, exportManifest);

  if (!hostValidation.valid) {
    throw new Error(`Generated host package failed schema validation: ${hostValidation.errors.join('; ')}`);
  }

  if (!exportValidation.valid) {
    throw new Error(`Generated export manifest failed schema validation: ${exportValidation.errors.join('; ')}`);
  }
}

function loadGeneratedMetadataSchemas(projectRoot) {
  const hostSchemaPath = path.join(projectRoot, 'schemas', 'host-export-package.schema.json');
  const exportSchemaPath = path.join(projectRoot, 'schemas', 'export-manifest.schema.json');

  try {
    return {
      hostSchema: readJsonFile(hostSchemaPath),
      exportSchema: readJsonFile(exportSchemaPath),
    };
  } catch (error) {
    throw new Error(
      `Failed to load generated export schemas: ${hostSchemaPath}, ${exportSchemaPath}. ${error.message}`,
      { cause: error },
    );
  }
}

const SCRATCH_MARKER_FILE = '.superagent-export-scratch.json';

function writeScratchMarker(rootDir, payload) {
  fs.writeFileSync(
    path.join(rootDir, SCRATCH_MARKER_FILE),
    JSON.stringify(payload, null, 2),
  );
}

function deleteScratchMarker(rootDir) {
  fs.rmSync(path.join(rootDir, SCRATCH_MARKER_FILE), { force: true });
}

function hasScratchMarker(rootDir) {
  return fs.existsSync(path.join(rootDir, SCRATCH_MARKER_FILE));
}

function createStagedDirectory(hostDir) {
  const parentDir = path.dirname(hostDir);
  const hostName = path.basename(hostDir);
  const stagedDir = path.join(parentDir, `.${hostName}.staged-${process.pid}-${Date.now()}`);
  fs.rmSync(stagedDir, { recursive: true, force: true });
  fs.mkdirSync(stagedDir, { recursive: true });
  writeScratchMarker(stagedDir, { kind: 'staged', host: hostName });
  return stagedDir;
}

function cleanupHostScratchDirectories(hostDir) {
  const parentDir = path.dirname(hostDir);
  const hostName = path.basename(hostDir);

  if (!fs.existsSync(parentDir)) {
    return;
  }

  for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const isScratchDir = (
      entry.name.startsWith(`.${hostName}.staged-`) ||
      entry.name.startsWith(`.${hostName}.backup-`)
    );

    if (isScratchDir && hasScratchMarker(path.join(parentDir, entry.name))) {
      fs.rmSync(path.join(parentDir, entry.name), { recursive: true, force: true });
    }
  }
}

function writeGeneratedTree(rootDir, generatedFiles) {
  const generatedRelativePaths = [];

  for (const [relativeFilePath, content] of Object.entries(generatedFiles)) {
    const absoluteFilePath = path.join(rootDir, relativeFilePath);
    fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
    fs.writeFileSync(absoluteFilePath, content);
    generatedRelativePaths.push(relativeFilePath);
  }

  return generatedRelativePaths.sort();
}

function createBackupDirectory(targetDir) {
  const parentDir = path.dirname(targetDir);
  const hostName = path.basename(targetDir);
  const backupDir = path.join(parentDir, `.${hostName}.backup-${process.pid}-${Date.now()}`);
  const hadTargetDir = fs.existsSync(targetDir);

  if (hadTargetDir) {
    fs.renameSync(targetDir, backupDir);
    try {
      writeScratchMarker(backupDir, { kind: 'backup', host: hostName });
    } catch (error) {
      try {
        fs.renameSync(backupDir, targetDir);
      } catch (rollbackError) {
        throw new Error(
          `Failed to mark backup directory for ${targetDir}: ${error.message}. Rollback also failed: ${rollbackError.message}`,
          { cause: error },
        );
      }

      throw new Error(
        `Failed to mark backup directory for ${targetDir}: ${error.message}`,
        { cause: error },
      );
    }
  }

  return {
    backupDir,
    hadTargetDir,
  };
}

function restoreBackupDirectory(targetDir, backupDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.renameSync(backupDir, targetDir);
}

function stageHostExport(projectRoot, manifest, sourceHashes, schemas, host) {
  const hostDir = path.join(projectRoot, 'exports', 'hosts', host);
  cleanupHostScratchDirectories(hostDir);
  const generatedFiles = generateHostFiles(projectRoot, manifest, host);
  const stagedHostDir = createStagedDirectory(hostDir);

  try {
    const generatedRelativePaths = writeGeneratedTree(stagedHostDir, generatedFiles);
    const hostPackage = {
      host,
      sources: Object.keys(sourceHashes),
      files: generatedRelativePaths.sort(),
    };
    const exportManifest = {
      host,
      source_hashes: sourceHashes,
    };

    validateGeneratedMetadata(schemas, hostPackage, exportManifest);

    fs.writeFileSync(
      path.join(stagedHostDir, 'host-package.json'),
      JSON.stringify(hostPackage, null, 2),
    );
    fs.writeFileSync(
      path.join(stagedHostDir, 'export.manifest.json'),
      JSON.stringify(exportManifest, null, 2),
    );

    return {
      host,
      hostDir,
      stagedHostDir,
    };
  } catch (error) {
    fs.rmSync(stagedHostDir, { recursive: true, force: true });
    throw error;
  }
}

function commitPreparedHost(preparedHost) {
  let backup = {
    backupDir: null,
    hadTargetDir: false,
  };

  try {
    backup = createBackupDirectory(preparedHost.hostDir);
    deleteScratchMarker(preparedHost.stagedHostDir);
    fs.renameSync(preparedHost.stagedHostDir, preparedHost.hostDir);
    return {
      ...preparedHost,
      ...backup,
    };
  } catch (error) {
    fs.rmSync(preparedHost.stagedHostDir, { recursive: true, force: true });

    if (backup.hadTargetDir && fs.existsSync(backup.backupDir) && !fs.existsSync(preparedHost.hostDir)) {
      try {
        restoreBackupDirectory(preparedHost.hostDir, backup.backupDir);
      } catch (rollbackError) {
        throw new Error(
          `Failed to replace ${preparedHost.hostDir}: ${error.message}. Rollback also failed: ${rollbackError.message}`,
          { cause: error },
        );
      }
    }

    throw error;
  }
}

function cleanupPreparedHosts(preparedHosts) {
  for (const preparedHost of preparedHosts) {
    fs.rmSync(preparedHost.stagedHostDir, { recursive: true, force: true });
  }
}

function rollbackCommittedHosts(committedHosts) {
  const rollbackErrors = [];

  for (const committedHost of [...committedHosts].reverse()) {
    if (!committedHost.hadTargetDir) {
      fs.rmSync(committedHost.hostDir, { recursive: true, force: true });
      continue;
    }

    try {
      restoreBackupDirectory(committedHost.hostDir, committedHost.backupDir);
    } catch (error) {
      rollbackErrors.push(`${committedHost.host}: ${error.message}`);
    }
  }

  return rollbackErrors;
}

function cleanupCommittedBackups(committedHosts) {
  const cleanupErrors = [];

  for (const committedHost of committedHosts) {
    if (!committedHost.hadTargetDir || !fs.existsSync(committedHost.backupDir)) {
      continue;
    }

    try {
      fs.rmSync(committedHost.backupDir, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(`${committedHost.host}: ${error.message}`);
    }
  }

  return cleanupErrors;
}

export function buildHostExports(projectRoot) {
  const manifest = readYamlFile(path.join(projectRoot, 'superagent.manifest.yaml'));
  const sourceFiles = collectCanonicalSources(projectRoot, manifest);
  const sourceHashes = toRelativeMap(projectRoot, sourceFiles);
  const schemas = loadGeneratedMetadataSchemas(projectRoot);
  const hosts = [];
  const preparedHosts = [];

  try {
    for (const host of manifest.hosts) {
      preparedHosts.push(stageHostExport(projectRoot, manifest, sourceHashes, schemas, host));
      hosts.push(host);
    }
  } catch (error) {
    cleanupPreparedHosts(preparedHosts);
    throw error;
  }

  const committedHosts = [];

  try {
    for (let index = 0; index < preparedHosts.length; index += 1) {
      committedHosts.push(commitPreparedHost(preparedHosts[index]));
    }
  } catch (error) {
    cleanupPreparedHosts(preparedHosts.slice(committedHosts.length));
    const rollbackErrors = rollbackCommittedHosts(committedHosts);

    if (rollbackErrors.length > 0) {
      throw new Error(
        `Host export build failed: ${error.message}. Cross-host rollback also failed: ${rollbackErrors.join('; ')}`,
        { cause: error },
      );
    }

    throw error;
  }

  const backupCleanupErrors = cleanupCommittedBackups(committedHosts);

  return {
    hosts,
    source_count: Object.keys(sourceHashes).length,
    warnings: backupCleanupErrors,
  };
}

export function checkHostExportDrift(projectRoot) {
  const manifest = readYamlFile(path.join(projectRoot, 'superagent.manifest.yaml'));
  const sourceHashes = toRelativeMap(projectRoot, collectCanonicalSources(projectRoot, manifest));
  const schemas = loadGeneratedMetadataSchemas(projectRoot);
  const drifts = [];

  for (const host of manifest.hosts) {
    const hostDir = path.join(projectRoot, 'exports', 'hosts', host);
    const packagePath = path.join(hostDir, 'host-package.json');
    const manifestPath = path.join(hostDir, 'export.manifest.json');

    if (!fs.existsSync(packagePath) || !fs.existsSync(manifestPath)) {
      drifts.push(`${host}: export package is missing`);
      continue;
    }

    const hostPackage = readJsonFile(packagePath);
    const exportManifest = readJsonFile(manifestPath);
    validateGeneratedMetadata(schemas, hostPackage, exportManifest);

    for (const relativeSourcePath of Object.keys(sourceHashes)) {
      if (exportManifest.source_hashes[relativeSourcePath] !== sourceHashes[relativeSourcePath]) {
        drifts.push(`${host}: drift detected for ${relativeSourcePath}`);
      }
    }

    for (const generatedFile of hostPackage.files) {
      if (!fs.existsSync(path.join(hostDir, generatedFile))) {
        drifts.push(`${host}: generated file missing ${generatedFile}`);
      }
    }
  }

  return drifts;
}
