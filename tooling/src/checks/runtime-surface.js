import fs from 'node:fs';
import path from 'node:path';

import { readJsonFile } from '../loaders.js';

const EXCLUDED_DOC_DIRS = new Set([]);
const EXCLUDED_DOC_FILES = new Set([
  'terminology-policy.md',
]);

const FORBIDDEN_TEXT_PATTERNS = [
  { label: '.agent-os path', regex: /\.agent-os\//g },
  { label: 'tasks/input path', regex: /\btasks\/input\//g },
  { label: 'tasks/clarified path', regex: /\btasks\/clarified\//g },
  { label: 'legacy run wrapper', regex: /\/run-(clarifier|orchestrator|opus-reviewer)\b/g },
  { label: 'legacy daemon binary', regex: /\bagent-os-(daemon|run|review|orchestrate)\b/g },
  { label: 'legacy npx invocation', regex: /\bnpx agent-os-[a-z-]+\b/g },
  { label: 'daemon workflow config', regex: /daemon\/WORKFLOW\.md/g },
];

const FORBIDDEN_DEPENDENCIES = new Set(['express', 'fastify', 'koa', 'socket.io']);
const EXCLUDED_CHECK_PATHS = new Set([
  'tooling/src/checks/runtime-surface.js',
  'tooling/src/checks/brand-truth.js',
]);

function toProjectRelativePath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function walkMarkdownFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DOC_DIRS.has(entry.name)) {
        walkMarkdownFiles(path.join(dirPath, entry.name), files);
      }
      continue;
    }

    if (entry.name.endsWith('.md') && !EXCLUDED_DOC_FILES.has(entry.name)) {
      files.push(path.join(dirPath, entry.name));
    }
  }

  return files;
}

function walkFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkFiles(absolutePath, files);
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function collectRuntimeSurfaceFiles(projectRoot) {
  return [
    path.join(projectRoot, 'README.md'),
    path.join(projectRoot, 'CLAUDE.md'),
    path.join(projectRoot, 'AGENTS.md'),
    path.join(projectRoot, 'CHANGELOG.md'),
    ...walkMarkdownFiles(path.join(projectRoot, 'docs')),
    ...walkFiles(path.join(projectRoot, 'expertise')),
    ...walkFiles(path.join(projectRoot, 'examples')),
    ...walkFiles(path.join(projectRoot, 'roles')),
    ...walkFiles(path.join(projectRoot, 'workflows')),
    ...walkFiles(path.join(projectRoot, 'skills')),
    path.join(projectRoot, 'hooks', 'README.md'),
    path.join(projectRoot, 'hooks', 'session-start'),
    path.join(projectRoot, 'templates', 'README.md'),
    ...walkFiles(path.join(projectRoot, 'templates', 'artifacts')),
    ...walkFiles(path.join(projectRoot, 'tooling', 'src')),
    ...walkFiles(path.join(projectRoot, 'exports', 'hosts')),
  ]
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile())
    .filter((filePath) => !EXCLUDED_CHECK_PATHS.has(toProjectRelativePath(projectRoot, filePath)));
}

function normalizeAllowedLegacyReferences(content) {
  return content
    .replace(/archive\/legacy-agent-os\/[^\s)`]*/g, 'archive/<legacy>')
    .replace(/archive\/v5\.1-agent-os-daemon\/[^\s)`]*/g, 'archive/<legacy>')
    .replace(/migration\/v5\.1-agent-os-to-superagent\.md/g, 'migration/<legacy>');
}

function assertGlobalPatternConfiguration() {
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (!pattern.regex.global) {
      throw new Error(`Runtime surface pattern "${pattern.label}" must use a global regex so lastIndex resets are reliable.`);
    }
  }
}

export function validateRuntimeSurfaceAtProjectRoot(projectRoot) {
  assertGlobalPatternConfiguration();
  const errors = [];
  const packageJson = readJsonFile(path.join(projectRoot, 'package.json'));
  const dependencyNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);

  if (Object.keys(packageJson.bin ?? {}).some((binName) => binName !== 'superagent')) {
    errors.push('package.json: only the "superagent" bin is allowed on the active surface');
  }

  if (Object.values(packageJson.bin ?? {}).some((binPath) => String(binPath).includes('daemon'))) {
    errors.push('package.json: active bin paths must not point at daemon entrypoints');
  }

  for (const dependencyName of dependencyNames) {
    if (FORBIDDEN_DEPENDENCIES.has(dependencyName)) {
      errors.push(`package.json: forbidden runtime dependency "${dependencyName}" is present on the active surface`);
    }
  }

  for (const filePath of collectRuntimeSurfaceFiles(projectRoot)) {
    const relativePath = path.relative(projectRoot, filePath);
    const content = normalizeAllowedLegacyReferences(fs.readFileSync(filePath, 'utf8'));

    for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
      pattern.regex.lastIndex = 0;

      if (pattern.regex.test(content)) {
        errors.push(`${relativePath}: contains forbidden runtime-surface pattern "${pattern.label}"`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      exitCode: 1,
      stderr: `Runtime surface validation failed:\n- ${errors.join('\n- ')}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: 'Runtime surface validation passed.\n',
  };
}
