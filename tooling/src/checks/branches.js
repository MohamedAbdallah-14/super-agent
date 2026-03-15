import { execFileSync } from 'node:child_process';

const ALLOWED_PATTERNS = [
  /^main$/,
  /^develop$/,
  /^feat\/.+$/,
  /^feature\/.+$/,
  /^fix\/.+$/,
  /^chore\/.+$/,
  /^codex\/.+$/,
  /^release\/.+$/,
  /^hotfix\/.+$/,
];

function getCurrentBranch() {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

export function validateBranchName(branchName) {
  const branch = branchName || getCurrentBranch();

  if (!branch) {
    return {
      exitCode: 1,
      stderr: 'Branch name validation failed:\n- Could not determine current branch name\n',
    };
  }

  const isAllowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(branch));

  if (!isAllowed) {
    return {
      exitCode: 1,
      stderr: `Branch name validation failed:\n- "${branch}" does not match any allowed pattern: main, develop, feat/*, feature/*, fix/*, chore/*, codex/*, release/*, hotfix/*\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: `Branch name validation passed: "${branch}"\n`,
  };
}
