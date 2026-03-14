import { execFileSync } from 'node:child_process';

const CONVENTIONAL_PATTERN = /^(feat|fix|docs|chore|refactor|test|ci|perf|build)(\(.+\))?!?:\s.+/;
const MERGE_PATTERN = /^Merge\s/;

function getCommitsSinceBase(base, head, cwd) {
  const range = head ? `${base}..${head}` : `${base}..HEAD`;
  try {
    const output = execFileSync('git', ['log', range, '--format=%s'], {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

function getCurrentBranch(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
    }).trim();
  } catch {
    return null;
  }
}

function refExists(ref, cwd) {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function detectBase(cwd) {
  const branch = getCurrentBranch(cwd);

  // Hotfix branches diff against main per git-flow
  if (branch && branch.startsWith('hotfix/')) {
    for (const ref of ['main', 'origin/main']) {
      if (refExists(ref, cwd)) return ref;
    }
  }

  // Everything else diffs against develop, falling back to main
  for (const ref of ['develop', 'origin/develop', 'main', 'origin/main']) {
    if (refExists(ref, cwd)) return ref;
  }

  return null;
}

export function validateCommits(options = {}) {
  const base = options.base || detectBase(options.cwd);

  if (!base) {
    return {
      exitCode: 1,
      stderr: 'Commit validation failed:\n- Could not determine base branch (tried develop, main)\n',
    };
  }

  const commits = getCommitsSinceBase(base, options.head, options.cwd);

  if (commits === null) {
    return {
      exitCode: 1,
      stderr: `Commit validation failed:\n- Could not read git log for range "${base}..${options.head || 'HEAD'}"\n`,
    };
  }

  if (commits.length === 0) {
    return {
      exitCode: 0,
      stdout: `Commit validation passed: no commits to check since "${base}"\n`,
    };
  }

  const failures = commits.filter(
    (msg) => !CONVENTIONAL_PATTERN.test(msg) && !MERGE_PATTERN.test(msg),
  );

  if (failures.length > 0) {
    return {
      exitCode: 1,
      stderr: `Commit validation failed:\n- ${failures.map((msg) => `Non-conventional: "${msg}"`).join('\n- ')}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: `Commit validation passed: ${commits.length} commit(s) checked against "${base}"\n`,
  };
}
