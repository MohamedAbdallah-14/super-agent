import os from 'node:os';
import path from 'node:path';

function expandHomeDir(filePath) {
  if (filePath === '~') {
    return os.homedir();
  }

  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

function slugifyProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'superagent-project';
}

export function resolveStateRoot(projectRoot, manifest, context = {}) {
  const cwd = context.cwd ?? process.cwd();
  const override = context.override;

  if (override) {
    return path.resolve(cwd, override);
  }

  const template = manifest.paths.state_root_default;
  const projectSlug = slugifyProjectName(manifest.project.name || path.basename(projectRoot));
  const interpolated = template.replace('{project_slug}', projectSlug);

  return path.resolve(expandHomeDir(interpolated));
}

export function getIndexDatabasePath(stateRoot) {
  return path.join(stateRoot, 'index', 'index.sqlite');
}
