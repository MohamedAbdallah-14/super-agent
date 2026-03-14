# Release Process

## Tag Naming

SuperAgent uses semantic versioning: `v{MAJOR}.{MINOR}.{PATCH}`

Legacy tags (V5.1, V6.x, etc.) are historical artifacts and are ignored by validators.

## Release Workflow

1. Create `release/<version>` branch from `develop`
2. Update `CHANGELOG.md`: move `[Unreleased]` entries to `[<version>] - YYYY-MM-DD`
3. Add a fresh empty `[Unreleased]` section at the top
4. Update version in `superagent.manifest.yaml` and `package.json`
5. Commit: `chore: prepare release <version>`
6. Merge to `main` with `--no-ff`
7. Tag: `git tag -a v<version> -m "v<version>"`
8. Merge `main` back to `develop` with `--no-ff`
9. Delete the release branch

## Hotfix Workflow

1. Create `hotfix/<slug>` branch from `main`
2. Fix the issue with conventional commits
3. Update `CHANGELOG.md` with the fix under `[Unreleased]`
4. Follow the same merge/tag/merge-back pattern as releases
5. Delete the hotfix branch

## Bootstrap (First SuperAgent Release)

When no SuperAgent release tag exists yet:
- Diff-aware changelog validation diffs against the initial commit or `develop` creation point
- Legacy tags are not considered release boundaries
- The first release tag will be `v1.0.0` (or `v0.1.0` if pre-stable)
