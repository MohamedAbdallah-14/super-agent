import fs from 'node:fs';
import path from 'node:path';

const EXCLUDED_DOC_DIRS = new Set([]);
const EXCLUDED_DOC_FILES = new Set([
  'terminology-policy.md',
]);

const BRAND_PATTERNS = [
  { label: 'Agent OS', regex: /\bAgent OS\b/g },
  { label: 'agent-os', regex: /\bagent-os\b/g },
  { label: 'Symphony', regex: /\bSymphony\b/g },
  { label: 'SuperAgent OS', regex: /\bSuperAgent OS\b/g },
];

function normalizeAllowedLegacyReferences(content) {
  return content
    .replace(/archive\/legacy-agent-os\/[^\s)`]*/g, 'archive/<legacy>')
    .replace(/archive\/v5\.1-agent-os-daemon\/[^\s)`]*/g, 'archive/<legacy>')
    .replace(/migration\/v5\.1-agent-os-to-superagent\.md/g, 'migration/<legacy>');
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

function collectBrandSurfaceFiles(projectRoot) {
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
    ...walkFiles(path.join(projectRoot, 'templates', 'artifacts')),
    path.join(projectRoot, 'templates', 'README.md'),
    ...walkFiles(path.join(projectRoot, 'exports', 'hosts')),
  ].filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

export function validateBrandTruthAtProjectRoot(projectRoot) {
  const errors = [];

  for (const filePath of collectBrandSurfaceFiles(projectRoot)) {
    const relativePath = path.relative(projectRoot, filePath);
    const content = normalizeAllowedLegacyReferences(fs.readFileSync(filePath, 'utf8'));

    for (const pattern of BRAND_PATTERNS) {
      pattern.regex.lastIndex = 0;

      if (pattern.regex.test(content)) {
        errors.push(`${relativePath}: contains forbidden brand term "${pattern.label}"`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      exitCode: 1,
      stderr: `Brand truth validation failed:\n- ${errors.join('\n- ')}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: 'Brand truth validation passed.\n',
  };
}
