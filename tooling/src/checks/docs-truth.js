import fs from 'node:fs';
import path from 'node:path';

import { readJsonFile, readYamlFile } from '../loaders.js';
import { validateAgainstSchema } from '../schema-validator.js';
import { SUPPORTED_COMMAND_SUBJECTS } from './command-registry.js';

const EXCLUDED_DOC_DIRS = new Set(['daemon', 'plans', 'research', 'audit']);

function walkMarkdownFiles(dirPath, files = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DOC_DIRS.has(entry.name)) {
        walkMarkdownFiles(path.join(dirPath, entry.name), files);
      }
      continue;
    }

    if (entry.name.endsWith('.md')) {
      files.push(path.join(dirPath, entry.name));
    }
  }

  return files;
}

function listActiveDocFiles(projectRoot) {
  return [
    path.join(projectRoot, 'README.md'),
    ...walkMarkdownFiles(path.join(projectRoot, 'docs')),
  ].filter((filePath) => fs.existsSync(filePath));
}

function normalizeCommandSubject(commandText) {
  const tokens = commandText.trim().split(/\s+/).filter(Boolean);

  if (tokens[0] !== 'superagent' || tokens.length < 2) {
    return null;
  }

  const family = tokens[1];
  const thirdToken = tokens[2];

  if (!thirdToken || thirdToken === '...' || thirdToken === '*') {
    return `superagent ${family}`;
  }

  if (thirdToken === '--check' && family === 'export') {
    return 'superagent export --check';
  }

  if (thirdToken.startsWith('--') || thirdToken.startsWith('<')) {
    return `superagent ${family}`;
  }

  return `superagent ${family} ${thirdToken}`;
}

function extractCommandSubjects(content) {
  const subjects = new Set();
  const pattern = /`([^`\n]+)`/g;

  for (const match of content.matchAll(pattern)) {
    const codeSpan = match[1].trim();

    if (!codeSpan.startsWith('superagent ')) {
      continue;
    }

    const subject = normalizeCommandSubject(codeSpan);

    if (subject) {
      subjects.add(subject);
    }
  }

  return subjects;
}

function extractLocalLinks(content) {
  const links = [];
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const match of content.matchAll(pattern)) {
    const rawTarget = match[1].trim();

    if (
      !rawTarget ||
      rawTarget.startsWith('#') ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:')
    ) {
      continue;
    }

    links.push(rawTarget.split('#', 1)[0]);
  }

  return links;
}

function loadClaims(projectRoot) {
  const claimsPath = path.join(projectRoot, 'docs', 'truth-claims.yaml');
  const rawClaims = readYamlFile(claimsPath);

  if (!Array.isArray(rawClaims)) {
    throw new Error('docs/truth-claims.yaml must be a YAML array of claim objects');
  }

  const schema = readJsonFile(path.join(projectRoot, 'schemas', 'docs-claim.schema.json'));
  const errors = [];
  const seenIds = new Set();
  const claims = [];

  for (const claim of rawClaims) {
    const validation = validateAgainstSchema(schema, claim);

    if (!validation.valid) {
      errors.push(`docs claim ${(claim && claim.id) || '<missing-id>'}: ${validation.errors.join('; ')}`);
      continue;
    }

    if (seenIds.has(claim.id)) {
      errors.push(`duplicate docs claim id: ${claim.id}`);
      continue;
    }

    seenIds.add(claim.id);
    claims.push(claim);
  }

  return { claimsPath, claims, errors };
}

export function validateDocsAtProjectRoot(projectRoot) {
  const errors = [];
  const { claimsPath, claims, errors: claimErrors } = loadClaims(projectRoot);
  errors.push(...claimErrors);

  const activeDocFiles = listActiveDocFiles(projectRoot);
  const documentedCommandSubjects = new Set();

  for (const filePath of activeDocFiles) {
    const relativeFilePath = path.relative(projectRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    for (const subject of extractCommandSubjects(content)) {
      documentedCommandSubjects.add(subject);
    }

    for (const linkTarget of extractLocalLinks(content)) {
      const resolvedTarget = path.resolve(path.dirname(filePath), linkTarget);

      if (!fs.existsSync(resolvedTarget)) {
        errors.push(`${relativeFilePath}: local doc link target missing ${linkTarget}`);
      }
    }
  }

  const commandClaims = claims.filter((claim) => claim.claim_type === 'command');

  for (const subject of documentedCommandSubjects) {
    if (!commandClaims.some((claim) => claim.subject === subject)) {
      errors.push(`missing docs truth claim for documented command: ${subject}`);
    }
  }

  for (const claim of commandClaims) {
    if (!SUPPORTED_COMMAND_SUBJECTS.has(claim.subject)) {
      errors.push(`${claim.id}: unsupported command subject ${claim.subject}`);
    }

    if (!documentedCommandSubjects.has(claim.subject)) {
      errors.push(`${claim.id}: undocumented command claim ${claim.subject}`);
    }
  }

  for (const claim of claims) {
    const absoluteSubjectPath = path.resolve(projectRoot, claim.subject);

    if (claim.claim_type === 'path' || claim.claim_type === 'generated_file' || claim.claim_type === 'example' || claim.claim_type === 'host_quickstart') {
      if (!fs.existsSync(absoluteSubjectPath)) {
        errors.push(`${claim.id}: missing claimed path ${claim.subject}`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      exitCode: 1,
      stderr: `Docs truth validation failed:\n- ${errors.join('\n- ')}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: `Docs truth validation passed. Checked ${claims.length} claims across ${activeDocFiles.length} active docs.\n`,
  };
}

