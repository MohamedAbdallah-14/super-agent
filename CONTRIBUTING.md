# Contributing

SuperAgent is a host-native engineering OS kit. Contributions that strengthen the product surface are welcome.

## Ground rules

- follow the architecture in `docs/concepts/architecture.md`
- keep the product host-native — roles, workflows, skills, hooks, and host exports
- prefer evidence:
  - TDD for behavior changes
  - verification commands before completion claims
  - no fake green paths

## Local setup

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/MohamedAbdallah-14/super-agent.git
   cd super-agent
   npm install
   ```
   You should see output ending with something like:
   ```
   added XX packages in Xs
   ```
2. Run the test suite:
   ```bash
   npm test
   ```
   Expected output:
   ```
   TAP version 13
   # ... test descriptions ...
   ok
   ```
   All tests must pass before you submit a PR.
3. Regenerate host packages when export logic or canonical sources change:
   ```bash
   superagent export build
   ```
4. Check export drift:
   ```bash
   superagent export --check
   ```
5. Validate the project structure:
   ```bash
   superagent validate
   ```

## Testing expectations

- **What to test:** Every behavior change, new CLI command, hook behavior, or schema change must have accompanying tests.
- **How to run tests:**
  ```bash
  npm test              # run the full suite
  ```
- **Coverage:** Tests live alongside the code they verify. If you add a new module in `tooling/src/`, add a corresponding test in `tooling/test/`. If you add a new skill in `skills/`, include a test script or verification step in the skill directory.
- **TDD is mandatory:** Write the failing test first, then implement the feature or fix.

## Your first contribution

New to SuperAgent? Start here:

1. Browse issues labeled [`good first issue`](https://github.com/MohamedAbdallah-14/super-agent/labels/good%20first%20issue)
2. Fork the repository and create a branch: `git checkout -b feat/your-change`
3. Make your change, add tests, run `npm test`
4. Open a pull request using the PR template

### Good first issues

Good first issues are small, well-scoped tasks that help you learn the codebase. They typically involve:

- Fixing a typo or improving clarity in documentation
- Adding a missing validation or error message to the CLI
- Writing tests for an existing module that lacks coverage
- Updating a role contract or workflow description to match current behavior

Look for the `good first issue` label, and feel free to comment on the issue to claim it before starting work.

Not sure where to start? Open a [Discussion](https://github.com/MohamedAbdallah-14/super-agent/discussions) and we'll help you find something.

## Change expectations

- keep docs current with the actual behavior you changed
- update `CHANGELOG.md`
- add or update tests for new CLI behavior, hook behavior, or schemas
- avoid adding dependencies unless they materially reduce correctness risk

## Pull requests

- explain the problem, the change, and the verification you ran
- call out any remaining gaps or follow-up work explicitly
- if a review tool was unavailable, say so rather than implying review happened

## PR review process

1. **Automated checks:** When you open a PR, CI runs `npm test` and `superagent validate`. Both must pass before review begins.
2. **Human review:** A maintainer will review your PR for correctness, test coverage, documentation, and alignment with the architecture.
3. **Feedback:** If changes are requested, push additional commits to the same branch. Avoid force-pushing during review so that reviewers can see incremental changes.
4. **Merge:** Once approved and all checks pass, a maintainer will merge your PR using a squash merge with a conventional commit message.
5. **Timeline:** We aim to provide initial review feedback within a few days. If your PR has been open for more than a week without a response, feel free to leave a comment or ping in Discussions.
