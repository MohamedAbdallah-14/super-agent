import fs from 'node:fs';
import path from 'node:path';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pathStaysInside(parentDir, candidatePath) {
  const relativePath = path.relative(parentDir, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function getRunPaths(stateRoot, runId) {
  const runRoot = path.join(stateRoot, 'runs', runId);
  const capturesDir = path.join(runRoot, 'captures');

  return {
    runRoot,
    capturesDir,
    statusPath: path.join(runRoot, 'status.json'),
    eventsPath: path.join(runRoot, 'events.ndjson'),
    summaryPath: path.join(runRoot, 'summary.md'),
    usagePath: path.join(runRoot, 'usage.json'),
  };
}

export function ensureRunDirectories(runPaths) {
  ensureDirectory(runPaths.runRoot);
  ensureDirectory(runPaths.capturesDir);
}

export function readStatus(runPaths) {
  if (!fs.existsSync(runPaths.statusPath)) {
    throw new Error(`Run status not found: ${runPaths.statusPath}`);
  }

  return JSON.parse(fs.readFileSync(runPaths.statusPath, 'utf8'));
}

export function writeStatus(runPaths, status) {
  ensureRunDirectories(runPaths);
  fs.writeFileSync(runPaths.statusPath, `${JSON.stringify(status, null, 2)}\n`);
}

export function appendEvent(runPaths, event) {
  ensureRunDirectories(runPaths);
  fs.appendFileSync(runPaths.eventsPath, `${JSON.stringify(event)}\n`);
}

function sanitizeCaptureName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'capture';
}

function normalizeSuffix(suffix) {
  if (!suffix) {
    return '.log';
  }

  return suffix.startsWith('.') ? suffix : `.${suffix}`;
}

export function createCaptureTarget(runPaths, options = {}) {
  ensureRunDirectories(runPaths);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = normalizeSuffix(options.suffix);
  const fileName = `${timestamp}-${sanitizeCaptureName(options.name ?? 'capture')}${suffix}`;
  const capturePath = path.join(runPaths.capturesDir, fileName);
  fs.writeFileSync(capturePath, '');
  return capturePath;
}

export function resolveCapturePath(runPaths, capturePath, fallback = {}) {
  if (!capturePath) {
    return createCaptureTarget(runPaths, fallback);
  }

  const resolvedPath = path.resolve(capturePath);

  if (!pathStaysInside(runPaths.capturesDir, resolvedPath)) {
    throw new Error(`capture-path must stay inside ${runPaths.capturesDir}`);
  }

  ensureRunDirectories(runPaths);
  ensureDirectory(path.dirname(resolvedPath));
  return resolvedPath;
}

export function writeCaptureOutput(targetPath, content) {
  fs.writeFileSync(targetPath, content);
}

export function writeSummary(runPaths, content) {
  ensureRunDirectories(runPaths);
  fs.writeFileSync(runPaths.summaryPath, content);
  return runPaths.summaryPath;
}
