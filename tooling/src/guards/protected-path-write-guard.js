import path from 'node:path';

import { readYamlFile } from '../loaders.js';

const APPROVED_FLOWS = new Set([
  'host_export_regeneration',
]);

function resolveRelativePath(projectRoot, targetPath) {
  const absoluteTargetPath = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(projectRoot, targetPath);

  return path.relative(projectRoot, absoluteTargetPath);
}

export function evaluateProtectedPathWriteGuard(payload) {
  const projectRoot = payload.project_root ?? process.cwd();
  const targetPath = payload.target_path;

  if (!targetPath) {
    throw new Error('target_path is required');
  }

  const manifest = readYamlFile(path.join(projectRoot, 'superagent.manifest.yaml'));
  const relativeTargetPath = resolveRelativePath(projectRoot, targetPath);
  const outsideProject = relativeTargetPath === '..'
    || relativeTargetPath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeTargetPath);

  if (outsideProject) {
    return {
      allowed: true,
      reason: 'Target is outside the project root.',
      relative_target_path: relativeTargetPath,
    };
  }

  const protectedPath = manifest.protected_paths.find((protectedEntry) => (
    relativeTargetPath === protectedEntry
      || relativeTargetPath.startsWith(`${protectedEntry}${path.sep}`)
  ));

  if (!protectedPath) {
    return {
      allowed: true,
      reason: 'Target path is not protected.',
      relative_target_path: relativeTargetPath,
    };
  }

  if (APPROVED_FLOWS.has(payload.approved_flow)) {
    return {
      allowed: true,
      reason: `Approved flow "${payload.approved_flow}" may write protected path ${protectedPath}.`,
      relative_target_path: relativeTargetPath,
    };
  }

  return {
    allowed: false,
    reason: `Protected path blocked: ${relativeTargetPath}`,
    protected_path: protectedPath,
    relative_target_path: relativeTargetPath,
  };
}
