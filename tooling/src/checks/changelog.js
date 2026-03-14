import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const VALID_CATEGORIES = new Set([
  'Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security',
]);

const UNRELEASED_PATTERN = /^## \[Unreleased\]/m;
const ENTRY_PATTERN = /^- .+$/m;
// Lowercase v + three-component semver. Filters out legacy tags like V5.1, V6.1 (capital V, two-component).
const SEMVER_TAG_PATTERN = /^v\d+\.\d+\.\d+$/;

function parseChangelog(content) {
  const errors = [];

  if (!UNRELEASED_PATTERN.test(content)) {
    errors.push('Missing [Unreleased] section');
  }

  // Validate categories and check for empty ones
  const categoryRegex = /^### (.+)$/gm;
  let match;
  while ((match = categoryRegex.exec(content)) !== null) {
    const category = match[1].trim();
    if (!VALID_CATEGORIES.has(category)) {
      errors.push(`Invalid category "${category}" — allowed: ${[...VALID_CATEGORIES].join(', ')}`);
    } else {
      // Check if category has at least one entry before next heading or EOF
      const afterCategory = content.slice(match.index + match[0].length);
      const nextHeading = afterCategory.search(/^##/m);
      const block = nextHeading === -1 ? afterCategory : afterCategory.slice(0, nextHeading);
      if (!ENTRY_PATTERN.test(block)) {
        errors.push(`Empty category "${category}" — remove it or add entries`);
      }
    }
  }

  return errors;
}

function getUnreleasedEntries(content) {
  const unreleasedIdx = content.search(UNRELEASED_PATTERN);
  if (unreleasedIdx === -1) return [];

  const afterUnreleased = content.slice(unreleasedIdx + '## [Unreleased]'.length);
  const nextSection = afterUnreleased.search(/^## \[/m);
  const unreleasedBlock = nextSection === -1 ? afterUnreleased : afterUnreleased.slice(0, nextSection);

  const entries = [];
  const entryRegex = /^- (.+)$/gm;
  let m;
  while ((m = entryRegex.exec(unreleasedBlock)) !== null) {
    entries.push(m[1].trim());
  }
  return entries;
}

function getLatestSemverTag(cwd) {
  try {
    const tags = execFileSync('git', ['tag', '--sort=-creatordate'], {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
    }).trim().split('\n').filter(Boolean);

    return tags.find((tag) => SEMVER_TAG_PATTERN.test(tag)) || null;
  } catch {
    return null;
  }
}

function getFirstCommit(cwd) {
  try {
    return execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
    }).trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

function getCommitTypesSinceRef(ref, head, cwd) {
  const range = head ? `${ref}..${head}` : `${ref}..HEAD`;
  try {
    const output = execFileSync('git', ['log', range, '--format=%s'], {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
    });
    const messages = output.trim().split('\n').filter(Boolean);
    const types = messages.map((msg) => {
      const m = msg.match(/^(feat|fix|docs|chore|refactor|test|ci|perf|build)/);
      return m ? m[1] : null;
    }).filter(Boolean);
    return { types, count: messages.length };
  } catch {
    return { types: [], count: 0 };
  }
}

function getChangelogContentAtRef(ref, cwd) {
  return execFileSync(
    'git', ['show', `${ref}:CHANGELOG.md`],
    { encoding: 'utf8', cwd, stdio: ['pipe', 'pipe', 'pipe'] },
  );
}

function countNewEntriesSinceBase(projectRoot, base, head) {
  // Read head changelog: use git show if head is explicit, else read worktree
  const headContent = head
    ? execFileSync('git', ['show', `${head}:CHANGELOG.md`], { encoding: 'utf8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] })
    : fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  const headEntries = getUnreleasedEntries(headContent);

  // Read base changelog — if base has no CHANGELOG.md, that's a real error
  // unless this is the initial commit (no parent)
  let baseEntries;
  try {
    const baseContent = getChangelogContentAtRef(base, projectRoot);
    baseEntries = new Set(getUnreleasedEntries(baseContent));
  } catch (err) {
    // Safe cases: base doesn't have CHANGELOG.md at all (first creation)
    // git show errors: "does not exist" or "exists on disk, but not in '<ref>'"
    const stderr = err.stderr?.toString() || '';
    if (err.status && (stderr.includes('does not exist') || stderr.includes('exists on disk, but not in'))) {
      return headEntries.length; // All entries are new
    }
    throw err; // Surface the actual error
  }

  // Exact-match subtraction (reorder-safe, rename counts as new — documented limitation)
  return headEntries.filter((e) => !baseEntries.has(e)).length;
}

function readChangelogContent(projectRoot, head) {
  if (head) {
    // When --head is specified, read changelog at that commit (not worktree)
    return execFileSync(
      'git', ['show', `${head}:CHANGELOG.md`],
      { encoding: 'utf8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] },
    );
  }
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return null;
  return fs.readFileSync(changelogPath, 'utf8');
}

export function validateChangelog(projectRoot, options = {}) {
  let content;
  try {
    content = readChangelogContent(projectRoot, options.head);
  } catch (err) {
    return {
      exitCode: 1,
      stderr: `Changelog validation failed:\n- Could not read CHANGELOG.md at "${options.head}": ${err.message}\n`,
    };
  }

  if (content === null) {
    return {
      exitCode: 1,
      stderr: 'Changelog validation failed:\n- CHANGELOG.md not found\n',
    };
  }

  const errors = parseChangelog(content);

  if (errors.length > 0) {
    return {
      exitCode: 1,
      stderr: `Changelog validation failed:\n- ${errors.join('\n- ')}\n`,
    };
  }

  // --require-entries: diff-aware — compares entries against base branch
  if (options.requireEntries) {
    const base = options.base;
    if (base) {
      try {
        const newEntryCount = countNewEntriesSinceBase(projectRoot, base, options.head);
        if (newEntryCount === 0) {
          return {
            exitCode: 1,
            stderr: 'Changelog validation failed:\n- No entries in [Unreleased] section since base branch (--require-entries was set)\n',
          };
        }
      } catch (err) {
        return {
          exitCode: 1,
          stderr: `Changelog validation failed:\n- Could not diff changelog against base "${base}": ${err.message}\n`,
        };
      }
    } else if (getUnreleasedEntries(content).length === 0) {
      return {
        exitCode: 1,
        stderr: 'Changelog validation failed:\n- No entries in [Unreleased] section (--require-entries was set)\n',
      };
    }
  }

  // Diff-aware gap detection (warning only, does not fail)
  const warnings = [];
  const diffRef = options.base || getLatestSemverTag(projectRoot) || getFirstCommit(projectRoot);
  if (diffRef) {
    try {
      const { types } = getCommitTypesSinceRef(diffRef, options.head, projectRoot);
      const userFacingTypes = types.filter((t) => t === 'feat' || t === 'fix');
      if (userFacingTypes.length > 0) {
        // Check for new entries relative to base, not just non-empty
        let newCount;
        try {
          newCount = countNewEntriesSinceBase(projectRoot, diffRef, options.head);
        } catch {
          newCount = getUnreleasedEntries(content).length;
        }
        if (newCount === 0) {
          warnings.push(`${userFacingTypes.length} feat/fix commit(s) since "${diffRef}" but no new [Unreleased] entries`);
        }
      }
    } catch (err) {
      warnings.push(`Could not perform diff-aware check: ${err.message}`);
    }
  }

  const warningText = warnings.length > 0 ? `\nWarnings:\n- ${warnings.join('\n- ')}\n` : '';

  return {
    exitCode: 0,
    stdout: `Changelog validation passed.${warningText}\n`,
  };
}
