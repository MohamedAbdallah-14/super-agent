# Dependency Management Anti-Patterns

> **Domain:** Code
> **Purpose:** Comprehensive reference for identifying, understanding, and preventing dependency
> management anti-patterns that cause build failures, security breaches, legal liability, and
> maintenance nightmares across software projects.
>
> **Last updated:** 2026-03-08
> **Documented incidents span:** 2016 -- 2026

---

## Incident Context: Why This Matters

Dependency management failures have caused some of the most consequential incidents in modern
software engineering. A single 11-line utility package brought down thousands of builds worldwide.
A social-engineering attack on a popular streaming library stole Bitcoin from cryptocurrency
wallets. A researcher proved he could infiltrate Apple, Microsoft, and Tesla through name
collisions in public registries. These are not hypotheticals -- they are documented, real events.

The average JavaScript project pulls in over 1,600 transitive dependencies. Each one is an
attack surface, a license obligation, and a maintenance commitment. The anti-patterns catalogued
here represent the most common and costly mistakes teams make when managing that surface area.

---

## Anti-Pattern Catalogue

---

### AP-01: Left-Pad Syndrome (Trivial Dependencies)

**One-line summary:** Importing an entire package for functionality achievable in a few lines of code.

**Severity:** Medium
**Frequency:** Very High
**Detection difficulty:** Low

**Description:**
Developers import micro-packages for trivial operations -- padding a string, checking if a number
is even, flattening an array -- instead of writing the 1-10 lines of code themselves. Each trivial
dependency adds a node in the dependency graph that must be downloaded, audited, maintained, and
trusted. When any one of those nodes disappears or is compromised, every project depending on it
breaks or is exposed.

**Real-world incident:**
On March 22, 2016, developer Azer Koculu unpublished 273 npm packages -- including `left-pad`, an
11-line string-padding function -- after a trademark dispute with Kik Messenger. Because `left-pad`
was a transitive dependency of Babel, React, and thousands of other projects, builds across the
JavaScript ecosystem began failing with 404 errors. npm restored the package from backup within
two hours and changed its unpublish policy: packages older than 24 hours with dependents can no
longer be removed.

**The anti-pattern in code:**

```json
// package.json -- 3 trivial dependencies for one-liner operations
{
  "dependencies": {
    "is-odd": "^3.0.1",
    "is-even": "^1.0.0",
    "left-pad": "^1.1.3"
  }
}
```

**What to do instead:**

```javascript
// Write the trivial logic yourself -- zero dependencies, zero risk
function leftPad(str, len, ch = ' ') {
  return String(str).padStart(len, ch);
}
function isEven(n) {
  return n % 2 === 0;
}
```

**Detection signals:**
- `node_modules` folder contains packages under 20 lines of source
- Package name describes a single native language operation (is-number, is-string, to-array)
- `npm ls --all | wc -l` returns a number disproportionate to project complexity

**Root cause:** Cargo-cult adoption of "small modules" philosophy without weighing the cost of each
new dependency against the cost of writing the equivalent code inline.

---

### AP-02: Unpinned Dependency Versions

**One-line summary:** Using loose version ranges that allow untested versions to enter production.

**Severity:** High
**Frequency:** High
**Detection difficulty:** Low

**Description:**
Specifying `"^2.0.0"` or `"*"` or `"latest"` in a manifest file allows the package manager to
resolve any compatible version, including ones never tested with the project. A patch release with
a regression or a minor release with a breaking behavioral change can silently corrupt builds.

**The anti-pattern in code:**

```json
{
  "dependencies": {
    "express": "*",
    "lodash": ">=4.0.0",
    "axios": "latest"
  }
}
```

**What to do instead:**

```json
{
  "dependencies": {
    "express": "4.18.2",
    "lodash": "4.17.21",
    "axios": "1.6.7"
  }
}
```

Use exact versions in package.json and rely on lock files for reproducibility. Update deliberately
with `npm update --save-exact` after running the test suite.

**Detection signals:**
- `*`, `latest`, or `>=` operators in dependency version fields
- CI builds that pass locally but fail on fresh installs
- "Works on my machine" reports that trace to version differences

**Root cause:** Convenience bias -- developers want the latest features automatically and
underestimate the risk of untested code entering the build.

---

### AP-03: Missing or Ignored Lock Files

**One-line summary:** Not committing lock files to version control, or deleting them to "fix" conflicts.

**Severity:** High
**Frequency:** High
**Detection difficulty:** Low

**Description:**
Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Gemfile.lock`, `poetry.lock`)
record the exact resolved versions of every direct and transitive dependency. Without them, two
developers running `npm install` on the same `package.json` can get different dependency trees.
CI/CD pipelines produce non-reproducible builds. A common anti-pattern is deleting the lock file
to "resolve" merge conflicts, which silently upgrades every transitive dependency.

**The anti-pattern in action:**

```gitignore
# .gitignore -- NEVER do this for applications
package-lock.json
yarn.lock
```

```bash
# "Fixing" merge conflicts by deleting and regenerating
rm package-lock.json
npm install
# Result: every transitive dependency upgraded to latest compatible version
```

**What to do instead:**

- Always commit lock files for applications (libraries may choose not to).
- Resolve lock file conflicts with `npm install --package-lock-only` (npm 5.7+) which
  auto-merges lock file conflicts after fixing `package.json` conflicts manually.
- Install `npm-merge-driver` to handle lock file merges automatically.
- In CI, use `npm ci` (not `npm install`) to enforce the exact lock file contents.

**Detection signals:**
- Lock file listed in `.gitignore`
- CI uses `npm install` instead of `npm ci`
- Frequent "it works on my machine" issues after pulling latest

**Root cause:** Lock files produce noisy diffs in code review and cause merge conflicts. Teams
choose short-term convenience over reproducibility.

---

### AP-04: Dependency Confusion

**One-line summary:** Internal package names that collide with public registry names, allowing
attackers to inject malicious code.

**Severity:** Critical
**Frequency:** Medium
**Detection difficulty:** Medium

**Description:**
When a project depends on a private/internal package (e.g., `@company/utils`) but the package
manager also checks public registries, an attacker can publish a higher-version package with the
same name to the public registry. Most package managers prefer the higher version, pulling in
the attacker's code instead of the internal package.

**Real-world incident:**
In February 2021, security researcher Alex Birsan demonstrated this attack against Apple,
Microsoft, Tesla, Yelp, Uber, and over 30 other companies. By publishing packages to npm, PyPI,
and RubyGems with the same names as internal packages found in public source code, he achieved
code execution on internal build systems. The eight-month ethical hacking project earned Birsan
over $130,000 in bug bounties.

**The anti-pattern in configuration:**

```json
{
  "dependencies": {
    "company-auth-utils": "^1.0.0"
  }
}
```

```ini
# .npmrc -- no registry scoping, checks public npm first
registry=https://registry.npmjs.org/
```

**What to do instead:**

```ini
# .npmrc -- scope internal packages to private registry
@company:registry=https://npm.company.internal/
registry=https://registry.npmjs.org/
```

```json
{
  "dependencies": {
    "@company/auth-utils": "1.0.0"
  }
}
```

Additionally: register placeholder packages on public registries for all internal package names,
or use tools like `socket.dev` or `npm audit signatures` to verify package provenance.

**Detection signals:**
- Internal packages without scoped names (`@org/package`)
- `.npmrc` or pip config without explicit registry scoping
- Private package names discoverable in public repositories or error messages

**Root cause:** Package managers default to public registries. Teams assume internal names are
safe because they are not publicly documented, treating obscurity as security.

---

### AP-05: Not Auditing Dependencies

**One-line summary:** Installing packages without checking for known vulnerabilities.

**Severity:** High
**Frequency:** Very High
**Detection difficulty:** Low

**Description:**
Every dependency inherits the security posture of its entire transitive tree. Running `npm install`
without following up with `npm audit` (or equivalent) means known CVEs in dependencies go
undetected. Teams that never audit accumulate a growing backlog of exploitable vulnerabilities
that attackers can find by simply checking public advisory databases.

**Real-world incident:**
In October 2021, the npm package `ua-parser-js` -- with nearly 8 million weekly downloads and
1,200 dependents -- was hijacked for approximately 4 hours. Three versions (0.7.29, 0.8.0, 1.0.0)
were published containing a cryptominer and credential-stealing malware targeting Windows and Linux.
CISA issued an official advisory. The attacker had reportedly offered access to the compromised
account on a Russian hacking forum for $20,000 prior to the incident.

**What to do instead:**

```bash
# Run after every install
npm audit

# In CI pipelines -- fail the build on critical/high vulnerabilities
npm audit --audit-level=high

# Use dedicated tools for deeper analysis
npx socket optimize     # Socket.dev supply chain analysis
snyk test               # Snyk vulnerability scanning
```

Integrate Dependabot, Renovate, or Snyk into the repository to receive automated PRs for
vulnerable dependencies.

**Detection signals:**
- No `npm audit` step in CI pipeline
- `npm audit` output shows high/critical vulnerabilities with no tracking issues
- No dependency scanning tool configured in the repository

**Root cause:** Audit output is noisy and overwhelming. Teams defer action because fixing one
vulnerability often requires cascading upgrades, and no one owns the process.

---

### AP-06: Using Deprecated or Unmaintained Packages

**One-line summary:** Depending on packages that are no longer maintained, receiving no security
patches or bug fixes.

**Severity:** High
**Frequency:** High
**Detection difficulty:** Medium

**Description:**
A package that has not received a commit in 2+ years, has unresolved security advisories, or is
explicitly marked as deprecated is a liability. It will not receive patches when vulnerabilities
are discovered, and it may depend on other unmaintained packages. The longer it stays in the
dependency tree, the harder it becomes to remove because application code grows around its API.

**Real-world incident:**
The `event-stream` package was effectively abandoned by its original maintainer, Dominic Tarr, who
had lost interest in maintaining it. In September 2018, a new contributor (operating under the
username `right9ctrl`) offered to take over maintenance. Tarr handed over publishing rights. The
new maintainer added `flatmap-stream` as a dependency -- which contained encrypted malicious code
targeting the Copay Bitcoin wallet. The malware attempted to steal Bitcoin from wallets holding
over 100 BTC or 1,000 BCH. The attack went undetected for over two months.

**Detection signals:**
- `npm outdated` shows packages multiple major versions behind
- `npm ls` includes packages with `(deprecated)` annotations
- Package GitHub repository archived or last commit > 2 years ago
- Open security advisories with no maintainer response

**What to do instead:**
- Run `npm outdated` regularly and track deprecated packages
- Evaluate package health before adoption: check commit frequency, open issues/PRs ratio,
  number of maintainers, and bus factor
- Use `npx is-website-vulnerable` or `npm-check` to identify stale dependencies
- Plan migration paths before packages reach end-of-life

**Root cause:** Initial selection was based on popularity or tutorial recommendations without
evaluating long-term maintenance viability. Once integrated, migration cost grows with each
line of code that touches the package API.

---

### AP-07: Typosquatting Vulnerability

**One-line summary:** Installing a malicious package due to a typo in the package name.

**Severity:** Critical
**Frequency:** Medium
**Detection difficulty:** Medium

**Description:**
Attackers publish packages with names that are slight misspellings of popular packages:
`coffe-script` instead of `coffee-script`, `crossenv` instead of `cross-env`, `electorn`
instead of `electron`. When a developer types the wrong name in `npm install`, they pull in
malicious code that may exfiltrate environment variables, install backdoors, or deploy
cryptominers.

**Real-world incidents:**
- **crossenv (2017):** The user `hacktask` published `crossenv` and over 30 other typosquatted
  packages that stole environment variables (including npm tokens and CI credentials) from
  victims' machines.
- **SANDWORM_MODE (2026):** 19 typosquatted npm packages impersonating popular utilities
  including AI coding tools and crypto libraries. Once imported, the packages exfiltrated API
  keys, SSH keys, environment variables, and cryptocurrency wallet keys. The malware was
  self-spreading, infecting other projects on the developer's machine.

**The anti-pattern in action:**

```bash
# One character off -- pulls in malicious package
npm install expresss
npm install cross-env.js
npm install loadash
```

**What to do instead:**

```bash
# Always verify the exact package name on npmjs.com before installing
# Use copy-paste from the official package page
# After install, verify with:
npm ls <package-name>
# Check the package README and repository link match expectations
```

- Use `socket.dev` or npm's built-in typosquat detection
- Require PR review for any new dependency additions to `package.json`
- Use an allowlist of approved packages in enterprise environments

**Detection signals:**
- Package name is a near-homograph of a popular package
- Package has very few downloads but was installed recently
- Package README is empty or copied from the legitimate package
- Package repository URL points to a different project

**Root cause:** Command-line installation provides no visual confirmation of which package will
be installed. The typo goes unnoticed because the install succeeds without error.

---

### AP-08: Diamond Dependency Problem

**One-line summary:** Two dependencies requiring incompatible versions of the same transitive
dependency, causing resolution failures or runtime bugs.

**Severity:** High
**Frequency:** Medium
**Detection difficulty:** High

**Description:**
When package A depends on package C v1.x and package B depends on package C v2.x, and your
project depends on both A and B, the package manager must resolve a conflict. npm may install
two copies of C (bloating bundles and causing subtle bugs when `instanceof` checks fail across
versions). Other ecosystems (Java, Python) may force a single version, causing one consumer to
break. The problem is NP-complete in the general case and becomes intractable in deep dependency
trees.

**The anti-pattern in code:**

```json
{
  "dependencies": {
    "library-a": "^2.0.0",
    "library-b": "^3.0.0"
  }
}
// library-a requires react@16.x
// library-b requires react@18.x
// Result: two copies of React, broken hooks, mysterious runtime errors
```

**What to do instead:**

- Before adding a dependency, check its peer dependency requirements against your existing tree
- Use `npm ls <package>` to detect duplicate installations
- Prefer libraries that declare peer dependencies instead of bundling their own copies
- Use `npm dedupe` to flatten the tree where version ranges overlap
- In monorepos, enforce a single version of shared dependencies via workspace constraints

**Detection signals:**
- `npm ls` shows the same package at multiple version levels
- Bundle size unexpectedly large
- `instanceof` checks or singleton patterns fail across module boundaries
- Runtime errors about "hooks can only be called inside a function component" (React-specific)

**Root cause:** Each library author independently specifies version ranges without coordinating
with the broader ecosystem, and semantic versioning provides insufficient guarantees about
behavioral compatibility.

---

### AP-09: Phantom Dependencies

**One-line summary:** Importing modules that exist in `node_modules` but are not listed in
your `package.json`.

**Severity:** Medium
**Frequency:** High
**Detection difficulty:** Medium

**Description:**
npm and Yarn hoist transitive dependencies to the root `node_modules` directory, making them
importable even though your project never declared them. This creates a phantom dependency: code
that works today but will break silently when the transitive parent upgrades, removes, or
replaces the hoisted package. The breakage is non-deterministic -- it depends on the install
order and tree structure.

**The anti-pattern in code:**

```javascript
// Your package.json only lists "express"
// But you directly import a transitive dependency of express:
const qs = require('qs');           // hoisted from express's dependency tree
const debug = require('debug');     // hoisted from express's dependency tree
// These work today but will break unpredictably
```

**What to do instead:**

```bash
# Explicitly declare every package you import
npm install qs debug --save

# Or switch to pnpm, which enforces strict dependency isolation
# pnpm creates a non-flat node_modules that prevents phantom access
npm install -g pnpm
pnpm install
```

**Detection signals:**
- `require()` or `import` statements for packages not in `package.json`
- Code that breaks after switching from npm to pnpm
- Lint rules like `import/no-extraneous-dependencies` (eslint-plugin-import) flagging violations
- Builds that work locally but fail in clean CI environments

**Root cause:** npm's flat `node_modules` structure makes every transitive dependency
accessible by design. The convenience masks the coupling.

---

### AP-10: Ignoring Security Advisories

**One-line summary:** Seeing `npm audit` warnings and choosing not to act on them.

**Severity:** Critical
**Frequency:** Very High
**Detection difficulty:** Low

**Description:**
Teams run `npm audit`, see dozens of advisories, feel overwhelmed, and defer action indefinitely.
The advisories accumulate. Eventually, a critical vulnerability in a deeply nested transitive
dependency is exploited in production. The audit output had been warning about it for months.

**Real-world incident:**
The Log4Shell vulnerability (CVE-2021-44228, December 2021) in Java's Log4j library was present
in thousands of applications as a transitive dependency. Organizations that had ignored dependency
audit tooling or lacked a process for triaging advisories scrambled for weeks to identify and
patch all affected systems. The vulnerability enabled remote code execution with a single
crafted log message.

**What to do instead:**

- Triage advisories by severity: fix critical/high immediately, track medium/low in backlog
- Use `npm audit fix` for automatic compatible upgrades
- For breaking fixes: `npm audit fix --force` (test thoroughly after)
- Configure CI to fail on high/critical: `npm audit --audit-level=high`
- Assign dependency security as a rotating team responsibility
- Use Dependabot or Renovate for automated upgrade PRs with CI checks

**Detection signals:**
- `npm audit` returns critical/high vulnerabilities with no open tracking issues
- Audit output suppressed or piped to `/dev/null` in CI scripts
- Security advisories older than 30 days with no resolution plan

**Root cause:** Alert fatigue. The volume of advisories (many in transitive dependencies the
team does not directly control) creates a sense of helplessness that leads to inaction.

---

### AP-11: Protestware and Maintainer Sabotage Risk

**One-line summary:** Depending on packages whose sole maintainer may sabotage them in protest
or frustration.

**Severity:** Critical
**Frequency:** Low
**Detection difficulty:** High

**Description:**
Open-source maintainers sometimes deliberately corrupt their own packages as protest against
perceived exploitation by corporations, as political statements, or due to burnout. When the
sabotaged package is deeply embedded in the dependency tree, the blast radius can affect
millions of projects.

**Real-world incident:**
In January 2022, Marak Squires -- the sole maintainer of `colors.js` (3.3 billion lifetime
downloads, 19,000 dependents) and `faker.js` (272 million lifetime downloads, 2,500 dependents)
-- deliberately sabotaged both packages. `colors.js` received a release containing an infinite
loop that printed "LIBERTY" and ASCII art to the console, hanging any process that imported it.
`faker.js` version 6.6.6 was published as an empty package with all source code removed.
Squires had previously warned in November 2020 that he would stop supporting corporations who
profited from his free work without compensation. GitHub suspended his account.

**Detection signals:**
- Critical dependency maintained by a single individual
- Maintainer has expressed burnout or frustration publicly
- No corporate backing or foundation governance for the package
- Package has no succession plan or co-maintainers

**What to do instead:**

- Evaluate bus factor before adopting a dependency (minimum 2 active maintainers preferred)
- Favor packages backed by foundations (OpenJS, Apache) or companies
- Pin exact versions and review changelogs before upgrading
- For critical dependencies, maintain an internal fork as a fallback
- Consider contributing financially to maintainers via GitHub Sponsors, Open Collective, or
  Tidelift to support sustainable maintenance

**Root cause:** The open-source sustainability crisis. Maintainers of critical infrastructure
packages often work unpaid, and the ecosystem provides no governance safeguards against
unilateral action by a sole maintainer.

---

### AP-12: Auto-Updating Major Versions

**One-line summary:** Configuring automated tools to merge major version bumps without human review.

**Severity:** High
**Frequency:** Medium
**Detection difficulty:** Low

**Description:**
Dependabot, Renovate, or similar tools can be configured to auto-merge dependency updates.
While this is reasonable for patch versions with good test coverage, auto-merging major version
bumps is dangerous. Major versions signal intentional breaking changes: removed APIs, changed
default behaviors, dropped platform support. Auto-merging them bypasses the human judgment
needed to evaluate migration impact.

**The anti-pattern in configuration:**

```json
// renovate.json -- auto-merging everything
{
  "extends": ["config:base"],
  "automerge": true,
  "major": {
    "automerge": true
  }
}
```

**What to do instead:**

```json
// renovate.json -- auto-merge patches only, require review for major/minor
{
  "extends": ["config:base"],
  "patch": {
    "automerge": true
  },
  "minor": {
    "automerge": false
  },
  "major": {
    "automerge": false,
    "labels": ["breaking-change", "needs-review"]
  }
}
```

**Detection signals:**
- Major version bumps merged without changelog review
- Production breakages that trace to auto-merged dependency updates
- Renovate/Dependabot configured with blanket `automerge: true`

**Root cause:** Teams want to reduce dependency maintenance toil and assume that CI tests will
catch all breaking changes. Tests cover application behavior, not every edge case of every
dependency's API surface.

---

### AP-13: Vendoring Without Updating

**One-line summary:** Copying dependency source code into the repository and never updating it.

**Severity:** High
**Frequency:** Medium
**Detection difficulty:** Medium

**Description:**
Vendoring (copying dependency source into the repo) provides isolation from registry outages
and ensures reproducibility. But vendored code goes stale silently. Without the package manager's
update mechanism, security patches and bug fixes never arrive. The vendored copy drifts further
from upstream with each release, making eventual updates exponentially harder.

**The anti-pattern in practice:**

```
vendor/
  lodash/        # copied in 2021, now 47 CVEs behind
  moment/        # deprecated in 2020, vendored copy still used
  leftpad.js     # copied from npm in 2016, never touched again
```

**What to do instead:**

- If vendoring, maintain a manifest mapping each vendored package to its upstream version
- Schedule quarterly vendor refresh cycles
- Run vulnerability scanners against vendor directories (not just `node_modules`)
- Consider using lock files instead of vendoring -- they solve the reproducibility problem
  without the maintenance burden of keeping copies in sync

**Detection signals:**
- `vendor/` directory with no update log or version manifest
- Vendored packages multiple major versions behind upstream
- Security scanners that skip `vendor/` directories
- Git blame shows vendored files untouched for years

**Root cause:** Vendoring front-loads reproducibility at the cost of ongoing maintenance.
Teams that vendor rarely budget for the maintenance, and the staleness is invisible until a
CVE surfaces.

---

### AP-14: Circular Dependencies

**One-line summary:** Two or more packages depending on each other, creating import cycles that
cause load-order bugs and make the code untestable.

**Severity:** Medium
**Frequency:** Medium
**Detection difficulty:** Medium

**Description:**
When module A imports module B and module B imports module A (directly or transitively), the
result is a circular dependency. In Node.js, this produces partially initialized modules --
the `require()` call returns an incomplete exports object, leading to `undefined is not a
function` errors that only manifest at runtime and depend on which module loads first. Circular
dependencies also make it impossible to test modules in isolation and signal tangled
architectural boundaries.

**The anti-pattern in code:**

```javascript
// user.js
const Order = require('./order');
class User {
  getOrders() { return Order.findByUser(this.id); }
}

// order.js
const User = require('./user');
class Order {
  getUser() { return User.findById(this.userId); }
}
// Result: one of these will get an empty object from require()
```

**What to do instead:**

```javascript
// Extract shared logic into a third module, or use dependency inversion
// user-repository.js -- depends on nothing
// order-repository.js -- depends on nothing
// user-service.js -- depends on both repositories (no cycle)
```

- Use `madge --circular` to detect circular dependencies in JavaScript/TypeScript
- Configure ESLint rule `import/no-cycle` to prevent new cycles
- Apply the Dependency Inversion Principle: both modules depend on an abstraction

**Detection signals:**
- `madge --circular src/` reports cycles
- `undefined is not a function` errors that appear only in certain import orders
- Modules that cannot be unit tested without importing half the application
- ESLint `import/no-cycle` violations

**Root cause:** Organic growth without architectural review. Each developer adds the import
they need without checking whether it creates a cycle.

---

### AP-15: Heavy Framework for Simple Task

**One-line summary:** Installing a large framework when a small library or native API suffices.

**Severity:** Medium
**Frequency:** High
**Detection difficulty:** Low

**Description:**
Pulling in a 500KB framework to solve a 5-line problem. Using Moment.js (330KB minified) to
format a single date. Installing Lodash (530 functions) to use `_.get()`. Adding jQuery to
toggle a CSS class. The framework brings hundreds of transitive dependencies, increases bundle
size, slows installation, and expands the attack surface -- all for functionality the platform
provides natively.

**The anti-pattern in code:**

```javascript
// Installing 72KB to check if a value is deeply nested
import _ from 'lodash';
const value = _.get(obj, 'a.b.c.d', 'default');

// Installing 330KB to format one date
import moment from 'moment';
const formatted = moment().format('YYYY-MM-DD');
```

**What to do instead:**

```javascript
// Native optional chaining (0 bytes, 0 dependencies)
const value = obj?.a?.b?.c?.d ?? 'default';

// Native Intl.DateTimeFormat (0 bytes, 0 dependencies)
const formatted = new Date().toISOString().split('T')[0];

// If you need a date library, use a lightweight alternative
// date-fns: tree-shakeable, import only what you use
import { format } from 'date-fns';
```

**Detection signals:**
- `npm ls --all | wc -l` disproportionate to project complexity
- Bundle analysis shows large packages contributing < 5% utilized exports
- `import-cost` VS Code extension showing large import sizes for simple operations
- `webpack-bundle-analyzer` showing dominant chunks from underused libraries

**Root cause:** Familiarity bias. Developers reach for the framework they know rather than
checking whether native APIs or lighter alternatives exist. Tutorial-driven development
reinforces framework defaults.

---

### AP-16: Not Checking Dependency Licenses

**One-line summary:** Using dependencies with incompatible or viral licenses that create
legal liability.

**Severity:** High
**Frequency:** High
**Detection difficulty:** Medium

**Description:**
Every npm package has a license. GPL-licensed dependencies in a proprietary product may legally
require releasing the entire application's source code. AGPL extends this obligation to
server-side usage. SSPL restricts cloud deployment. A single React app setup involves ~1,600
dependencies, each with its own license. Ignoring license compliance can result in litigation,
forced open-sourcing of proprietary code, or injunctions against distribution.

**Real-world consequence:**
Orange S.A. was ordered to pay over 900,000 EUR in damages for modifying and distributing
GPL-licensed Lasso software without complying with the GPL's copyleft requirements.

**What to do instead:**

```bash
# Audit licenses across all dependencies
npx license-checker --summary
npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0;SSPL-1.0"

# Use FOSSA or Snyk for continuous license compliance monitoring
# Define an approved license allowlist in CI
```

Maintain a license policy document. Classify licenses into: approved (MIT, BSD, Apache-2.0,
ISC), restricted (GPL, AGPL, SSPL -- require legal review), and banned. Automate enforcement
in CI.

**Detection signals:**
- No license audit step in CI pipeline
- `license-checker` output contains GPL/AGPL packages in a proprietary project
- No legal review process for new dependency additions
- `package.json` contains packages with `UNLICENSED` or missing license fields

**Root cause:** License compliance is perceived as a legal team responsibility, not a
development concern. Most developers never read the license field of the packages they install.

---

### AP-17: Running npm install with Elevated Privileges

**One-line summary:** Using `sudo npm install` gives untrusted package scripts root access
to the system.

**Severity:** Critical
**Frequency:** Medium
**Detection difficulty:** Low

**Description:**
When `npm install` runs, it executes any `preinstall`, `install`, and `postinstall` scripts
defined in each package. Running this as root means those scripts execute with full system
privileges. A malicious or compromised package can modify system files, install rootkits, create
new user accounts, or exfiltrate sensitive data from anywhere on the filesystem. Additionally,
`sudo npm install` creates root-owned files in the npm cache and `node_modules`, causing
EACCES permission errors on subsequent non-sudo installs.

**The anti-pattern in action:**

```bash
# NEVER do this
sudo npm install -g some-package
sudo npm install
```

**What to do instead:**

```bash
# Use a Node version manager -- no sudo needed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
npm install -g some-package  # no sudo required

# Or change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add ~/.npm-global/bin to PATH
```

**Detection signals:**
- CI/CD scripts containing `sudo npm`
- Developer documentation instructing `sudo npm install`
- Permission errors (EACCES) appearing on developer machines
- Root-owned files in `~/.npm` or project `node_modules`

**Root cause:** Default Node.js installations place global packages in system directories
(`/usr/local/lib`) requiring root access. Developers reach for `sudo` as the quick fix instead
of configuring proper directory ownership or using nvm.

---

### AP-18: Copy-Paste Dependency Adoption

**One-line summary:** Adding dependencies found in Stack Overflow answers or blog tutorials
without evaluating them.

**Severity:** Medium
**Frequency:** Very High
**Detection difficulty:** Low

**Description:**
A developer searches for "how to parse CSV in Node.js," finds a Stack Overflow answer
recommending `obscure-csv-parser`, runs `npm install`, and moves on. The package may be
unmaintained, have known vulnerabilities, or be a typosquatted version of the legitimate
package. Tutorial-driven development leads to dependency sprawl because each tutorial recommends
its own preferred packages, and developers accumulate them without deduplication.

**The anti-pattern in action:**

```bash
# From a 2019 Stack Overflow answer -- package abandoned since 2020
npm install csv-parse-easy
# From a blog post -- typosquatted name
npm install expresss-validator
# From a tutorial -- entire framework for one feature
npm install full-framework-x
```

**What to do instead:**

Before installing any new dependency, evaluate:

1. **Necessity:** Can this be done with native APIs or existing dependencies?
2. **Maintenance:** Last commit date? Open issues? Active maintainers?
3. **Popularity:** Weekly downloads? Dependents? Stars (as a rough signal)?
4. **Security:** `npm audit` results? Known CVEs? Socket.dev analysis?
5. **License:** Compatible with your project's license?
6. **Size:** What is the install size and transitive dependency count?

Use `npm info <package>` and check npmjs.com before every `npm install`.

**Detection signals:**
- Package additions with no corresponding evaluation comment in the PR
- Dependencies that duplicate functionality already available in the project
- Packages with < 100 weekly downloads in a production project

**Root cause:** Time pressure and the "someone else solved this" mindset. Evaluating a
dependency takes 5-10 minutes; copy-pasting an `npm install` command takes 5 seconds.

---

### AP-19: Not Reading Dependency Source Code

**One-line summary:** Trusting package code sight-unseen because it has many downloads or stars.

**Severity:** High
**Frequency:** Very High
**Detection difficulty:** High

**Description:**
Downloads and stars are vanity metrics, not security guarantees. The `event-stream` attack
succeeded because no one reviewed the `flatmap-stream` dependency that was added -- despite the
package having 2 million weekly downloads at the time. Reading the source code of direct
dependencies (at minimum) and auditing `install` scripts catches malicious code, unnecessary
complexity, and quality issues that no automated tool detects.

**Real-world incident:**
The `event-stream` malware went undetected for over two months (September to November 2018)
despite the package's enormous download numbers. The malicious code in `flatmap-stream` was
encrypted and only decrypted at runtime when specific conditions were met (the Copay Bitcoin
wallet was present), making static analysis detection difficult. It was eventually discovered
by a developer who happened to investigate a deprecation warning.

**What to do instead:**

```bash
# Review install scripts before installing
npm pack <package-name>   # downloads tarball without executing scripts
tar -xzf <package>.tgz   # extract and review contents

# Or view source on npm
npm view <package-name> repository.url
# Visit the repository and read the code

# Disable install scripts for untrusted packages
npm install --ignore-scripts <package-name>
# Then review and run scripts manually
```

**Detection signals:**
- New dependencies added to `package.json` without code review comments
- `install` scripts in `package.json` that download or execute remote code
- Minified or obfuscated source in published npm packages
- Package source on npm differs from source in the linked repository

**Root cause:** Scale makes manual review seem impractical. Teams rationalize that "if it had
malware, someone else would have found it by now," creating a bystander effect across millions
of users.

---

### AP-20: Too Many Dependencies for Simple Projects

**One-line summary:** A project with minimal business logic but hundreds of dependencies,
creating an outsized attack surface and maintenance burden.

**Severity:** Medium
**Frequency:** High
**Detection difficulty:** Low

**Description:**
A simple REST API server with 5 endpoints should not have 1,200 transitive dependencies.
Each dependency is a potential point of failure: a supply chain attack vector, a license
obligation, a source of breaking changes, and a CI/CD performance drag. Dependency bloat
often stems from framework defaults (create-react-app installs ~1,600 packages) and a culture
of reaching for packages instead of writing code.

**The anti-pattern in numbers:**

```bash
$ npm ls --all | wc -l
1847
$ wc -l src/**/*.js
312 total
# 1,847 dependencies for 312 lines of application code
```

**What to do instead:**

- Start with zero dependencies and add them only when justified
- Use native APIs: `fetch()` instead of `axios`, `URL` instead of `url-parse`,
  `crypto.randomUUID()` instead of `uuid`
- Choose focused libraries over kitchen-sink frameworks
- Periodically audit: `npx depcheck` identifies unused dependencies
- Track dependency count as a project health metric

**Detection signals:**
- Dependency-to-application-code ratio exceeding 100:1
- `npx depcheck` listing multiple unused dependencies
- `npm install` taking minutes for a project with a few source files
- `node_modules` larger than the application source by orders of magnitude

**Root cause:** The npm ecosystem's culture of extreme modularity combined with
framework scaffolding tools that install hundreds of packages by default. Teams never
question the defaults.

---

## Root Cause Analysis

The twenty anti-patterns above cluster around five systemic root causes:

### 1. The Convenience Trap
Package managers make installation frictionless (`npm install` takes seconds) but provide no
friction for evaluation. The asymmetry between ease of adding and cost of maintaining creates
an accumulation problem.

### 2. The Trust Assumption
Developers treat the npm registry as a trusted source, but it is an open publishing platform
with minimal vetting. The assumption that "popular means safe" has been disproven by
event-stream (2M weekly downloads, compromised), ua-parser-js (8M weekly downloads, hijacked),
and colors.js (3.3B lifetime downloads, sabotaged).

### 3. The Externality Problem
The cost of a dependency is distributed across the entire team and lifetime of the project, but
the benefit (saved developer time) is captured immediately by one individual. This creates a
tragedy of the commons where everyone adds dependencies and no one audits or removes them.

### 4. The Sustainability Crisis
Critical infrastructure packages are maintained by unpaid individuals with no governance
structure. When a maintainer burns out, abandons the project, or acts unilaterally, the
ecosystem has no fallback. The event-stream and colors.js incidents are symptoms of this
structural problem.

### 5. The Visibility Gap
Transitive dependencies are invisible to most developers. The packages they consciously chose
represent a fraction of their actual dependency tree. Tools like `npm ls --all` exist but are
rarely used, creating a false sense of control over a dependency surface that is orders of
magnitude larger than perceived.

---

## Self-Check Questions

Use these questions during code review, architecture review, or dependency audit sessions:

### Before Adding a Dependency
- [ ] Can this be done in < 20 lines with native APIs or existing dependencies?
- [ ] Does this package have at least 2 active maintainers?
- [ ] When was the last release? Is the package actively maintained?
- [ ] What is the transitive dependency count? (`npm info <pkg> dependencies`)
- [ ] What license does it use? Is it compatible with our project?
- [ ] Have I checked `npm audit` after adding it?
- [ ] Have I read the package's `install` scripts?
- [ ] Does the package name exactly match what I intended? (typosquatting check)

### During Ongoing Maintenance
- [ ] Is `npm audit` integrated into our CI pipeline with a fail threshold?
- [ ] Are lock files committed and is CI using `npm ci`?
- [ ] Do we have a process for triaging and resolving security advisories?
- [ ] Are Dependabot/Renovate PRs being reviewed and merged regularly?
- [ ] When did we last run `npx depcheck` to find unused dependencies?
- [ ] Are any dependencies deprecated or unmaintained?
- [ ] Do we have license compliance automation in CI?

### Architecture-Level Checks
- [ ] Are internal packages scoped (`@org/package`) to prevent dependency confusion?
- [ ] Is our `.npmrc` configured to route scoped packages to our private registry?
- [ ] Do we have a phantom dependency detection mechanism (pnpm or ESLint rule)?
- [ ] Is our dependency-to-code ratio reasonable for the project's complexity?
- [ ] Are we vendoring anything? If so, is there a scheduled update cycle?
- [ ] Are circular dependencies being detected and prevented?

---

## Code Smell Quick Reference

| Smell | Anti-Pattern | Severity | Quick Check |
|---|---|---|---|
| `node_modules` > 500MB for a simple project | AP-20: Too Many Dependencies | Medium | `du -sh node_modules` |
| `*` or `latest` in version field | AP-02: Unpinned Versions | High | `grep '"*"\|"latest"' package.json` |
| Lock file in `.gitignore` | AP-03: Missing Lock Files | High | `grep lock .gitignore` |
| `sudo npm install` in docs or scripts | AP-17: Elevated Privileges | Critical | `grep -r "sudo npm" .` |
| Packages with < 20 lines of source | AP-01: Left-Pad Syndrome | Medium | Manual review of small deps |
| `require()` of undeclared package | AP-09: Phantom Dependencies | Medium | `npx depcheck` or ESLint rule |
| Internal package without `@scope` | AP-04: Dependency Confusion | Critical | Review `.npmrc` and `package.json` |
| `npm audit` showing ignored criticals | AP-10: Ignoring Advisories | Critical | `npm audit --audit-level=critical` |
| Same package at multiple versions in tree | AP-08: Diamond Dependency | High | `npm ls <pkg>` |
| `madge --circular` reporting cycles | AP-14: Circular Dependencies | Medium | `npx madge --circular src/` |
| Lodash/Moment for one function | AP-15: Heavy Framework | Medium | Bundle analyzer |
| GPL/AGPL in proprietary project | AP-16: License Non-Compliance | High | `npx license-checker --summary` |
| Vendored dir with no update log | AP-13: Stale Vendors | High | `git log --oneline vendor/` |
| Sole maintainer on critical dep | AP-11: Protestware Risk | Critical | Check npm/GitHub maintainer list |
| Auto-merge on major versions | AP-12: Auto-Update Majors | High | Review Renovate/Dependabot config |
| Dependency added without PR discussion | AP-18: Copy-Paste Adoption | Medium | PR review process |
| Package with obfuscated source | AP-19: Unreviewed Source | High | `npm pack` and inspect |
| Near-homograph package name | AP-07: Typosquatting | Critical | Verify name on npmjs.com |
| Deprecated packages in `npm ls` | AP-06: Unmaintained Packages | High | `npm outdated` |
| Blanket `automerge: true` in Renovate | AP-12: Auto-Update Majors | High | Review bot config |

---

## Recommended Tooling

| Tool | Purpose | Integration |
|---|---|---|
| `npm audit` | Known vulnerability detection | CLI, CI |
| `npm ci` | Reproducible installs from lock file | CI |
| `npx depcheck` | Detect unused dependencies | CLI, CI |
| `npx license-checker` | License compliance auditing | CLI, CI |
| `npx madge --circular` | Circular dependency detection | CLI, CI |
| `socket.dev` | Supply chain attack detection | GitHub App |
| Snyk | Vulnerability and license scanning | CLI, CI, GitHub |
| Dependabot | Automated dependency update PRs | GitHub native |
| Renovate | Configurable automated updates | GitHub App, self-hosted |
| pnpm | Strict dependency isolation (prevents phantoms) | Package manager |
| `import-cost` (VS Code) | Inline dependency size display | IDE |
| `webpack-bundle-analyzer` | Visual bundle composition analysis | Build tool |
| FOSSA | Enterprise license compliance | CI, SaaS |
| `npm-merge-driver` | Automatic lock file conflict resolution | Git driver |

---

## Key Takeaways

1. **Every dependency is a liability.** It is code you did not write, do not control, and are
   responsible for. Treat `npm install` with the same scrutiny as a `git merge` from an
   unknown contributor.

2. **Supply chain attacks are escalating.** From event-stream (2018) to ua-parser-js (2021)
   to SANDWORM_MODE (2026), the frequency and sophistication of attacks through package
   registries is increasing. Defense requires active auditing, not passive trust.

3. **The ecosystem's strengths are its weaknesses.** Easy publishing enables innovation but
   also enables typosquatting, dependency confusion, and protestware. Flat `node_modules`
   enables convenience but enables phantom dependencies. Semantic versioning enables
   compatibility ranges but enables untested code in production.

4. **Automation is necessary but insufficient.** `npm audit`, Dependabot, and Snyk catch known
   vulnerabilities. They do not catch social engineering, protestware, or zero-day supply chain
   attacks. Human review of new dependencies and major updates remains essential.

5. **Dependency management is a team discipline, not an individual task.** It requires policy
   (approved licenses, maximum dependency count), process (audit triage rotation, update
   cadence), and tooling (CI gates, automated scanning) working together.

---

## Sources

- [npm left-pad incident -- Wikipedia](https://en.wikipedia.org/wiki/Npm_left-pad_incident)
- [How one developer broke Node, Babel and thousands of projects -- The Register](https://www.theregister.com/2016/03/23/npm_left_pad_chaos/)
- [kik, left-pad, and npm -- npm Blog](https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm)
- [Details about the event-stream incident -- npm Blog](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident)
- [Dependency Confusion: How I Hacked Into Apple, Microsoft -- Alex Birsan](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
- [Understanding and Preventing Dependency Confusion Attacks -- FOSSA](https://fossa.com/blog/dependency-confusion-understanding-preventing-attacks/)
- [Typosquatting attacks -- Snyk Blog](https://snyk.io/blog/typosquatting-attacks/)
- [SANDWORM_MODE: Typosquatted npm Packages -- Wiz](https://threats.wiz.io/all-incidents/sandwormmode-typosquatted-npm-packages-used-to-hijack-ci-workflows)
- [npm Libraries colors and faker Sabotaged -- Sonatype](https://www.sonatype.com/blog/npm-libraries-colors-and-faker-sabotaged-in-protest-by-their-maintainer-what-to-do-now)
- [Open source maintainer pulls the plug on colors and faker -- Snyk](https://snyk.io/blog/open-source-npm-packages-colors-faker/)
- [NPM Library ua-parser-js Hijacked -- Rapid7](https://www.rapid7.com/blog/post/2021/10/25/npm-library-ua-parser-js-hijacked-what-you-need-to-know/)
- [Malware Discovered in Popular NPM Package ua-parser-js -- CISA](https://www.cisa.gov/news-events/alerts/2021/10/22/malware-discovered-popular-npm-package-ua-parser-js)
- [Phantom dependencies -- Rush](https://rushjs.io/pages/advanced/phantom_deps/)
- [Phantom Dependencies -- Socket.dev](https://docs.socket.dev/docs/phantom-dependencies)
- [A Solution to the Diamond Dependency Problem -- The Solution Space](https://solutionspace.blog/2023/02/20/a-solution-to-the-diamond-dependency-problem/)
- [What is a diamond dependency conflict? -- JLBP](http://jlbp.dev/what-is-a-diamond-dependency-conflict)
- [The Nine Circles of Dependency Hell -- Sourcegraph](https://sourcegraph.com/blog/nine-circles-of-dependency-hell)
- [Dependency hell -- Wikipedia](https://en.wikipedia.org/wiki/Dependency_hell)
- [Software Engineering at Google: Dependency Management](https://abseil.io/resources/swe-book/html/ch21.html)
- [Open Source License Compliance Lessons -- FOSSID](https://fossid.com/articles/open-source-license-compliance-lessons-from-two-landmark-court-cases/)
- [Open Source Licenses: Understanding the Risk Factors -- Checkmarx](https://checkmarx.com/blog/open-source-licenses-understanding-the-risk-factors/)
- [Lockfiles Killed Vendoring -- Andrew Nesbitt](https://nesbitt.io/2026/02/10/lockfiles-killed-vendoring.html)
- [Vulnerabilities in Vendored Dependencies -- OpenSSF](https://best.openssf.org/Vendored-Dependencies-Guide.html)
- [Don't use sudo with npm install -- DEV Community](https://dev.to/brylie/don-t-use-sudo-with-npm-install-56p9)
- [npm Threats and Mitigations -- npm Docs](https://docs.npmjs.com/threats-and-mitigations/)
- [Solving conflicts in package-lock.json -- TkDodo](https://tkdodo.eu/blog/solving-conflicts-in-package-lock-json)
- [Detect and prevent dependency confusion attacks -- Snyk](https://snyk.io/blog/detect-prevent-dependency-confusion-attacks-npm-supply-chain-security/)
