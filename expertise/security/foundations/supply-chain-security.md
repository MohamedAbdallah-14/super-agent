# Software Supply Chain Security

> Threat landscape, defensive strategies, tooling, compliance, and incident response
> for software supply chain attacks. For teams depending on third-party packages,
> open-source libraries, and CI/CD pipelines.

---

## 1. Threat Landscape

### 1.1 Attack Vectors

**Dependency Confusion / Namespace Hijacking** — Attackers register a public
package with the same name as an internal private package but with a higher
version number. Package managers pull the malicious public package instead.
Alex Birsan (2021) demonstrated this against Apple, Microsoft, and PayPal.
49% of organizations remain vulnerable (Orca Security, 2024).

**Typosquatting** — Packages with names similar to popular libraries (e.g.,
`lodahs` instead of `lodash`). Over 500,000 malicious packages detected in
public registries in 2024 (Sonatype).

**Compromised Maintainer Accounts** — Credential stuffing, phishing, or social
engineering to take over maintainer accounts. See ua-parser-js (2021) and
event-stream (2018).

**Backdoored Packages via Long-Term Social Engineering** — Attackers spend
months or years building trust, eventually gaining commit access. XZ Utils
(CVE-2024-3094): attacker "Jia Tan" spent ~3 years building credibility.

**Compromised Build Infrastructure** — Targeting CI/CD systems or build servers
to inject malicious code during the build process. SolarWinds (2020) and
Codecov (2021) used this approach.

**Malicious Post-Install Scripts** — Package managers like npm execute lifecycle
scripts automatically. Attackers use these hooks for arbitrary code execution
on developer machines and CI/CD systems.

### 1.2 Major Supply Chain Attacks — Timeline

**event-stream / flatmap-stream (November 2018)**
- A new maintainer (@right9ctrl) took over the event-stream npm package
  (~2 million weekly downloads) from the original author
- Added a dependency on `flatmap-stream` containing obfuscated code targeting
  the Copay Bitcoin wallet, designed to steal cryptocurrency
- The malicious dependency was present for approximately 3 days before removal
- Impact: Unknown financial losses; demonstrated the risk of maintainer handover
- CWE-506 (Embedded Malicious Code)
- Source: GitHub issue #116 on dominictarr/event-stream

**SolarWinds / SUNBURST (December 2020)**
- Threat actor UNC2452 (attributed to Russian SVR) compromised SolarWinds'
  build infrastructure and injected the SUNBURST backdoor into Orion platform
  updates (versions 2019.4 HF5 through 2020.2.1)
- 18,000 customers downloaded trojanized updates; ~100 organizations actively
  exploited including US Treasury, Commerce, DHS, and FireEye
- Attack persisted undetected for approximately 14 months
- Impact: Estimated $100+ billion in damages across government and enterprise
- Source: CISA Alert AA20-352A; Mandiant/FireEye disclosure

**Codecov Bash Uploader (April 2021)**
- Attackers modified Codecov's Bash Uploader script via a Docker image
  creation flaw, exfiltrating environment variables (tokens, keys, credentials)
  from CI/CD environments
- The compromise went undetected for over 2 months (January 31 to April 1, 2021)
- Impact: Credentials leaked from thousands of CI pipelines
- Source: Codecov Security Notice, April 2021

**ua-parser-js (October 2021)**
- The npm package ua-parser-js (~7 million weekly downloads) was hijacked;
  malicious versions (0.7.29, 0.8.0, 1.0.0) were published containing
  cryptominer and credential-stealing malware
- Subsequently, similar attacks hit npm packages `coa` and `rc` in November 2021
- Impact: Millions of downstream projects exposed
- Source: GitHub Advisory GHSA-pjwm-rvh2-c87w

**Log4Shell / CVE-2021-44228 (December 2021)**
- Critical RCE vulnerability in Apache Log4j2, a ubiquitous Java logging library
- Not a supply chain *attack* per se, but demonstrated how a single transitive
  dependency vulnerability can cascade across millions of applications
- CVSS 10.0; affected an estimated 35,000+ Java packages (8% of Maven Central)
- Impact: Exploitation began within hours of disclosure; remediation ongoing
  for years due to transitive dependency depth
- Source: NIST NVD CVE-2021-44228

**XZ Utils / CVE-2024-3094 (March 2024)**
- A pseudonymous contributor "Jia Tan" spent ~3 years gaining co-maintainer
  trust on the xz-utils project, a compression library used by virtually all
  Linux distributions
- Injected a sophisticated backdoor into liblzma (versions 5.6.0 and 5.6.1)
  that subverted OpenSSH authentication, enabling remote code execution
- Discovered on March 29, 2024 by Andres Freund (Microsoft/PostgreSQL) who
  noticed anomalous SSH CPU usage and valgrind errors
- CVSS 10.0; affected Fedora 40 beta, Debian unstable, Kali Linux, Arch Linux
- Widely assessed as a state-sponsored operation
- Impact: Averted catastrophe due to early detection before reaching stable distros
- Source: NIST NVD CVE-2024-3094; Datadog Security Labs analysis

**npm Ecosystem Compromise / "Shai-Hulud" (September 2025)**
- Self-propagating malware compromised 500+ npm packages via credential theft
  and automated malicious package publishing
- Used TruffleHog to harvest CI/CD secrets and environment variables
- CISA issued advisory on September 23, 2025
- Socket.dev identified and tracked the campaign in real time
- Source: CISA Alert; Socket.dev advisory; Trend Micro analysis

### 1.3 Scale of the Problem (2024-2025)

- 512,847 malicious packages detected in 2024 (156% year-over-year increase) —
  Sonatype
- 30% of breaches involve a third party (doubled from 15%) — Verizon DBIR 2025
- 75% of organizations experienced a supply chain attack in 2024 — BlackBerry
- Supply chain attacks projected to cost $60 billion globally by 2025 —
  Cybersecurity Ventures
- October 2025 set a new record with 41 supply chain attacks in a single month,
  30% above the previous peak — Cyble

---

## 2. Core Security Principles

### 2.1 Verify Before You Trust

- **Provenance verification**: Verify build provenance via SLSA attestations or Sigstore
- **Integrity checking**: Validate checksums/hashes of all downloaded artifacts
- **Author verification**: Assess maintainer identity and track record before adopting
- **Reproducible builds**: Building from source produces identical artifacts

### 2.2 Pin Versions and Lock Dependencies

- Use exact version pins (`1.2.3`) not ranges (`^1.2.3` or `~1.2.3`) in production
- Commit lock files (`package-lock.json`, `yarn.lock`, `pubspec.lock`, etc.) to VCS
- Review lock file changes in code review — they represent real code changes

### 2.3 Audit Regularly and Continuously

- Run `npm audit`, `pip-audit`, `bundler-audit` as part of CI/CD
- Subscribe to security advisories for critical dependencies
- Periodically review dependency trees, especially transitive dependencies

### 2.4 Generate and Maintain SBOMs

- Generate SBOMs in CycloneDX or SPDX format during every build
- Store SBOMs alongside release artifacts
- Use SBOMs for vulnerability impact analysis — when a CVE drops, query SBOMs
  to determine exposure within minutes, not days

### 2.5 Minimize the Dependency Surface

- Evaluate whether a dependency is truly needed before adding it
- Prefer well-maintained libraries with active security response teams
- Remove unused dependencies regularly (`depcheck`, `deptry`)
- Audit transitive trees — one direct dep can pull hundreds of transitive ones

### 2.6 SLSA Framework Levels

SLSA (pronounced "salsa") defines progressive build integrity levels:

| Level | Requirements | Guarantees |
|-------|-------------|------------|
| L0 | None | No provenance |
| L1 | Build process generates provenance automatically | Provenance exists and is distributable |
| L2 | Hosted build service; signed provenance | Tamper-evident provenance |
| L3 | Hardened build platform; isolated builds | Tamper-resistant provenance; prevents insider threats |

Target SLSA L2 minimum; L3 for critical software. Latest spec: v1.2 (2025).

---

## 3. Implementation Patterns

### 3.1 Lock Files and Deterministic Installs

| Ecosystem | Lock File | Deterministic Install |
|-----------|-----------|----------------------|
| npm | `package-lock.json` | `npm ci` |
| Yarn | `yarn.lock` | `yarn install --frozen-lockfile` |
| pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| Python/pip | `requirements.txt` (pinned) | `pip install -r requirements.txt --require-hashes` |
| Python/Poetry | `poetry.lock` | `poetry install --no-update` |
| Dart/Flutter | `pubspec.lock` | `dart pub get` (respects lock) |
| Ruby | `Gemfile.lock` | `bundle install --frozen` |
| Go | `go.sum` | `go mod verify` |
| Maven | (use enforcer plugin) | `mvn dependency:resolve` |

### 3.2 Dependency Update Automation

- **Dependabot** (GitHub native): broad ecosystem support, low config
- **Renovate** (Mend): flexible config, monorepo support, auto-merge policies
- **Snyk**: combined vulnerability scanning + update PRs

Best practice: auto-merge patch updates with passing CI; require human review
for minor/major version bumps.

### 3.3 SBOM Generation

| Standard | Maintainer | Strength | Formats | Tooling |
|----------|-----------|----------|---------|---------|
| CycloneDX | OWASP | Security use cases, VEX | JSON, XML | `cdxgen`, `syft`, `trivy` |
| SPDX | Linux Foundation | License compliance, ISO standard | JSON, RDF, YAML | `syft`, `spdx-sbom-generator` |

### 3.4 Artifact Signing with Sigstore

- **cosign**: Signs/verifies container images, blobs, and SBOMs
- **Rekor**: Immutable transparency log for signatures
- **Fulcio**: Short-lived certificates tied to OIDC identity (keyless signing)

### 3.5 Dependency Confusion Prevention

1. **Scope packages**: Use npm scopes (`@yourorg/package-name`)
2. **Configure registry priority**: Route scoped packages to private registry in `.npmrc`
3. **Claim names**: Register internal names on public registries as placeholders (PyPI)
4. **Use registry proxies**: Artifactory or Nexus as single package entry point

### 3.6 CI/CD Pipeline Hardening

- Pin CI action versions by full SHA, not tags (tags are mutable)
- Use read-only tokens and ephemeral build containers
- Verify artifact signatures before deployment
- Use OIDC-based cloud auth instead of long-lived keys

---

## 4. Vulnerability Catalog

### 4.1 Dependency Management Vulnerabilities

| # | Vulnerability | CWE | Risk | Mitigation |
|---|--------------|-----|------|------------|
| 1 | No lock file committed | CWE-1104 | Non-deterministic builds install arbitrary versions | Commit lock files; use `npm ci` / `--frozen-lockfile` |
| 2 | Unpinned dependency versions | CWE-1104 | Automatic upgrades may pull compromised versions | Pin exact versions in production manifests |
| 3 | Typosquatting packages installed | CWE-506 | Malicious code executed via misspelled package name | Use `socket.dev`, lockfile review, allowlists |
| 4 | Dependency confusion | CWE-427 | Public package overrides private package of same name | Scope packages, configure `.npmrc`, claim public names |
| 5 | Unreviewed lock file changes | CWE-829 | Malicious transitive dependency added silently | Require lock file diff review in PRs |

### 4.2 Build and Distribution Vulnerabilities

| # | Vulnerability | CWE | Risk | Mitigation |
|---|--------------|-----|------|------------|
| 6 | Compromised post-install scripts | CWE-506 | Arbitrary code runs on `npm install` | Use `--ignore-scripts`, audit scripts before install |
| 7 | Mutable CI action tags | CWE-829 | Attacker replaces action content behind same tag | Pin GitHub Actions by full commit SHA |
| 8 | Unsigned build artifacts | CWE-345 | Cannot verify artifact integrity or provenance | Sign with cosign/Sigstore; verify before deploy |
| 9 | Build secrets leaked in logs | CWE-532 | Credentials exposed in CI output | Mask secrets; use short-lived OIDC tokens |

### 4.3 Maintenance and Governance Vulnerabilities

| # | Vulnerability | CWE | Risk | Mitigation |
|---|--------------|-----|------|------------|
| 10 | Abandoned/unmaintained packages | CWE-1104 | No security patches; potential maintainer takeover | Monitor OpenSSF Scorecard; set maintenance thresholds |
| 11 | Excessive transitive dependencies | CWE-1104 | Deep trees increase attack surface exponentially | Audit with `npm ls --all`; prefer minimal libraries |
| 12 | No SBOM generated | CWE-1059 | Cannot assess impact of new CVEs on your software | Generate CycloneDX/SPDX SBOMs in CI |
| 13 | Missing vulnerability scanning | CWE-1104 | Known CVEs persist in deployed software | Integrate Snyk/Trivy/Grype in CI pipeline |
| 14 | Unverified third-party CI actions | CWE-829 | Malicious actions exfiltrate secrets or modify builds | Fork and vendor critical actions; pin by SHA |
| 15 | No provenance attestation | CWE-345 | Cannot verify where/how artifact was built | Implement SLSA L2+; use SLSA GitHub generator |

---

## 5. Security Checklist

### Dependency Management
- [ ] All lock files (`package-lock.json`, `yarn.lock`, etc.) committed to VCS
- [ ] Production dependencies pinned to exact versions
- [ ] Lock file diffs reviewed as part of code review process
- [ ] `npm ci` or `--frozen-lockfile` used in CI/CD (never `npm install`)
- [ ] Transitive dependency tree audited quarterly for depth and risk
- [ ] Unused dependencies removed (verified with `depcheck` or equivalent)

### Vulnerability Scanning
- [ ] `npm audit` / `pip-audit` / equivalent runs in every CI build
- [ ] Snyk, Socket.dev, or Trivy integrated for continuous monitoring
- [ ] Critical/high vulnerabilities block deployment (CI gate)
- [ ] Security advisories subscribed for top 20 dependencies
- [ ] Known-vulnerable packages prevented from installation

### SBOM and Provenance
- [ ] SBOM generated in CycloneDX or SPDX format on every release build
- [ ] SBOMs stored alongside release artifacts and accessible to consumers
- [ ] Build provenance attestations generated (SLSA L1 minimum)
- [ ] Artifact signatures verified before deployment (cosign verify)

### Build Pipeline
- [ ] GitHub Actions (or equivalent) pinned by full commit SHA
- [ ] Post-install scripts disabled by default (`--ignore-scripts`)
- [ ] CI environment uses ephemeral, isolated build containers
- [ ] Secrets injected via CI secret management (never hardcoded)
- [ ] OIDC used for cloud authentication (no long-lived keys in CI)

### Registry and Namespace
- [ ] Private packages use scoped names (`@org/pkg`)
- [ ] `.npmrc` configured to route scoped packages to private registry
- [ ] Internal package names claimed on public registries (PyPI, npm)
- [ ] Registry proxy (Artifactory/Nexus) used as single package source
- [ ] Package publication requires MFA and is restricted to authorized accounts

### Governance
- [ ] OpenSSF Scorecard evaluated for critical open-source dependencies
- [ ] New dependency adoption requires security review
- [ ] Dependency update automation configured (Dependabot/Renovate)
- [ ] Incident response plan covers supply chain compromise scenarios

---

## 6. Tools and Automation

### 6.1 Vulnerability Scanning

| Tool | Type | Ecosystems | Key Features |
|------|------|-----------|--------------|
| `npm audit` | Built-in | npm | Free; integrated into npm CLI; checks GitHub Advisory DB |
| Snyk | SCA | npm, PyPI, Maven, Go, Ruby, .NET | Fix PRs, license compliance, container scanning |
| Socket.dev | Behavioral | npm, PyPI | Detects suspicious behavior (network, filesystem, eval); not just CVEs |
| Trivy | Scanner | OS packages, language deps, containers, IaC | Open source (Aqua); broad coverage; SBOM generation |
| Grype | Scanner | OS packages, language deps, containers | Open source (Anchore); pairs with Syft for SBOM |
| OSV-Scanner | Scanner | npm, PyPI, Go, Maven, Rust, Ruby | Open source (Google); uses OSV.dev database |

### 6.2 SBOM Generation

| Tool | Formats | Ecosystems | Notes |
|------|---------|-----------|-------|
| Syft (Anchore) | CycloneDX, SPDX, Syft JSON | All major | De facto standard; pairs with Grype |
| `cdxgen` | CycloneDX | npm, Python, Java, Go, .NET | OWASP project; CycloneDX-native |
| Trivy | CycloneDX, SPDX | All major | SBOM + vulnerability scan in one tool |
| `spdx-sbom-generator` | SPDX | Go, Java, Node, Python, Ruby | Linux Foundation project |

### 6.3 Dependency Update Automation

| Tool | Provider | Strengths |
|------|----------|-----------|
| Dependabot | GitHub | Native GitHub integration; low config; broad ecosystem support |
| Renovate | Mend (open source) | Highly configurable; monorepo support; auto-merge policies; custom managers |
| Snyk | Snyk | Combined vuln scan + update PRs; prioritized by exploitability |

### 6.4 Signing and Verification

| Tool | Purpose | Notes |
|------|---------|-------|
| cosign (Sigstore) | Sign/verify images, blobs, SBOMs | Keyless OIDC-based signing; transparency log |
| Notation (Notary v2) | Sign/verify OCI artifacts | CNCF project; cloud-provider-neutral |
| GPG | Sign commits, tags, artifacts | Traditional; requires key management |

### 6.5 Policy and Compliance

| Tool | Purpose | Notes |
|------|---------|-------|
| OpenSSF Scorecard | Assess open-source project health | 19 automated checks; GitHub Action available |
| StepSecurity Harden-Runner | CI/CD runtime security | Detects anomalous network/process activity in CI |
| OPA/Gatekeeper | Policy enforcement | Block deployments missing signatures or SBOMs |

---

## 7. Platform-Specific Guidance

### 7.1 npm / Node.js

**Key risks**: Post-install scripts, typosquatting, dependency confusion, massive
transitive dependency trees (average npm project pulls ~700 transitive deps).

**Hardening measures**:
- Use `npm ci` in CI (deterministic, respects lock file exactly)
- Set `ignore-scripts=true` in `.npmrc`; explicitly allow trusted scripts
- Scope all internal packages under `@yourorg/`
- Enable npm provenance (`--provenance` flag on `npm publish`)
- Use `npm audit signatures` to verify registry-signed packages
- Consider Socket.dev for behavioral analysis beyond CVE matching

### 7.2 PyPI / Python

**Key risks**: No native namespace scoping; typosquatting is rampant;
`setup.py` execution during install enables arbitrary code execution.

**Hardening measures**:
- Use `pip install --require-hashes` with pinned `requirements.txt`
- Migrate to `pyproject.toml` and `pip-compile` (pip-tools) for lock files
- Claim internal package names on PyPI as empty placeholders
- Use `pip-audit` for vulnerability scanning
- Consider Trusted Publishers for PyPI (OIDC-based publishing)
- Migrate from `setup.py` to declarative `pyproject.toml` where possible

### 7.3 Maven / Java

**Key risks**: Transitive dependency resolution via "nearest wins"; Log4Shell
demonstrated how deeply embedded a single transitive dependency can be;
dependency mediation can silently downgrade secure versions.

**Hardening measures**:
- Use Maven Enforcer Plugin to ban known-bad dependencies
- Enable `<dependencyManagement>` to control transitive versions
- Use `mvn dependency:tree` regularly to audit the full tree
- Sign artifacts with GPG; verify signatures on consumption
- Use OSSRH (Sonatype) staging rules and release policies
- Scan with `mvn org.owasp:dependency-check-maven:check`

### 7.4 pub / Dart (Flutter)

**Key risks**: Smaller ecosystem means less security tooling; `pubspec.lock`
is sometimes .gitignored in library packages (by convention).

**Hardening measures**:
- Always commit `pubspec.lock` for applications
- Use `dart pub outdated` to track dependency freshness
- Pin versions in `pubspec.yaml` for production applications
- Audit transitive dependencies with `dart pub deps`
- Use `pana` (pub.dev analysis) scores to evaluate package health
- Monitor pub.dev verified publisher badges

### 7.5 CocoaPods / iOS

**Key risks**: Centralized Specs repository; trunk account compromise can
replace any pod version; post-install hooks in Podfiles.

**Hardening measures**:
- Commit `Podfile.lock` to version control
- Use `pod install` (never `pod update`) in CI
- Audit `Podfile` for `post_install` hooks performing network access
- Consider Swift Package Manager (SPM) as an alternative with better
  integrity checking
- Use private Spec repos for internal pods
- Verify pod checksums in `Podfile.lock`

### 7.6 GitHub Actions

**Key risks**: Actions are code that runs with access to your repository
secrets, GITHUB_TOKEN, and OIDC tokens. A compromised action can exfiltrate
secrets, modify code, or publish malicious artifacts.

**Hardening measures**:
- Pin all actions by full commit SHA (not `@v4`, which is a mutable tag)
- Fork critical third-party actions into your organization
- Use `permissions:` to apply least-privilege to GITHUB_TOKEN
- Enable Dependabot for GitHub Actions version updates
- Use StepSecurity Harden-Runner to monitor network egress
- Prefer GitHub's official actions (`actions/checkout`, `actions/setup-node`)

---

## 8. Incident Patterns

### 8.1 Malicious Package Detection

**Indicators of compromise**: obfuscated/minified code in non-build packages,
network calls in install scripts, env var enumeration, binary downloads during
install, sudden maintainer changes, version jumps with minimal changelog.

**Detection**: Run Socket.dev behavioral analysis on new deps, monitor
`npm audit` in CI, alert on maintainer changes, review lock file diffs in PRs.

### 8.2 Compromised Dependency Response

1. **Identify scope**: Query SBOMs for affected package/version across all environments
2. **Contain**: Pin to last known-good version; block compromised version in registry proxy
3. **Assess impact**: Determine if malicious code executed in build/staging/production
4. **Rotate credentials**: Assume all secrets accessible to affected builds are compromised
5. **Notify downstream**: Alert consumers if you publish artifacts including the compromised dep
6. **Post-incident**: Update allowlists; review whether the dependency is still needed

### 8.3 SBOM-Based Impact Analysis

When a critical CVE drops: query SBOM repository across all products, generate
exposure report in minutes, prioritize by deployment context (internet-facing
first), track remediation via SBOM diffs, produce compliance evidence.

---

## 9. Compliance and Standards

### 9.1 NIST SSDF (SP 800-218)

Four practice groups: Prepare the Organization (PO), Protect the Software (PS),
Produce Well-Secured Software (PW), Respond to Vulnerabilities (RV). Federal
software vendors must submit signed self-attestation of SSDF compliance (2024).

### 9.2 Executive Order 14028 (May 2021)

- Software vendors must provide SBOMs to federal agency customers
- Led to SSDF v1.1, CISA SBOM guidance, SLSA framework adoption
- Defines SBOM as "formal record containing details and supply chain
  relationships of components used in building software"

### 9.3 CISA SBOM Minimum Elements (2025 Update)

Required metadata: component name/version/supplier, unique identifiers (CPE,
PURL), dependency relationships, provenance/authenticity fields, timestamps.

### 9.4 SLSA

OpenSSF project defining progressive build integrity levels (see Section 2.6).
Hosted build requirement (L2+), hardened platforms (L3). Spec v1.2 (2025).

### 9.5 OpenSSF Scorecard

19 automated checks: branch protection, code review, CI tests, fuzzing,
dependency updates, SAST, signed releases, SBOM, dangerous workflows.
Score 0-10 per check. Below 5 on critical checks warrants evaluation.

### 9.6 EU Cyber Resilience Act (CRA)

Adopted 2024. Requires SBOM generation, vulnerability handling, security updates
for product lifetime. Compliance deadline: 2027.

---

## 10. Code Examples

### 10.1 .npmrc Configuration (Dependency Confusion Prevention)

```ini
# .npmrc — prevent dependency confusion and harden npm behavior

# Route scoped packages to private registry
@yourorg:registry=https://npm.yourorg.com/

# Always use exact versions when saving
save-exact=true

# Disable post-install scripts by default (enable per-package as needed)
ignore-scripts=true

# Require lock file for installs (fail if lock file is missing or outdated)
package-lock=true

# Enforce strict SSL for registry connections
strict-ssl=true

# Set audit level to fail on moderate+ vulnerabilities
audit-level=moderate
```

### 10.2 Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly", day: "monday" }
    open-pull-requests-limit: 10
    reviewers: ["security-team"]
    labels: ["dependencies", "security"]
    groups:
      production-deps:
        patterns: ["*"]
        update-types: ["minor", "patch"]

  - package-ecosystem: "github-actions"  # Pin actions by SHA
    directory: "/"
    schedule: { interval: "weekly" }
    labels: ["ci", "dependencies"]

  - package-ecosystem: "docker"
    directory: "/"
    schedule: { interval: "weekly" }
```

### 10.3 GitHub Actions with Pinned SHAs

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

permissions:
  contents: read  # Least-privilege GITHUB_TOKEN

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Pin actions by full commit SHA — never use @v4 (mutable tag)
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: "20"
          cache: "npm"

      # Deterministic install from lock file
      - run: npm ci --ignore-scripts

      # Audit for known vulnerabilities
      - run: npm audit --audit-level=moderate

      # Verify npm package provenance signatures
      - run: npm audit signatures

      # Run tests
      - run: npm test
```

### 10.4 SBOM Generation in CI

```yaml
# .github/workflows/sbom.yml
name: SBOM Generation
on:
  push:
    tags: ["v*"]

permissions:
  contents: write
  id-token: write  # Required for Sigstore keyless signing

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      # Install Syft for SBOM generation
      - uses: anchore/sbom-action@fc46e51e3555f3b6b3318a1461a89fc1add9170b # v0.18.0
        with:
          format: cyclonedx-json
          output-file: sbom.cyclonedx.json

      # Install cosign for signing
      - uses: sigstore/cosign-installer@3454372be43a5bdb07b09b3c0c3c6e38233e1aa9 # v3.8.2

      # Sign the SBOM with keyless Sigstore
      - run: cosign sign-blob --yes sbom.cyclonedx.json --bundle sbom.cyclonedx.json.bundle

      # Upload SBOM as release artifact
      - uses: softprops/action-gh-release@da05d552573ad5aba039eaac05058a918a7bf631 # v2.2.2
        with:
          files: |
            sbom.cyclonedx.json
            sbom.cyclonedx.json.bundle
```

### 10.5 Cosign Verification

```bash
#!/usr/bin/env bash
# verify-artifact.sh — Verify a signed container image or blob

set -euo pipefail

IMAGE="ghcr.io/yourorg/yourapp:latest"

# Verify container image signature (keyless / OIDC identity)
cosign verify "$IMAGE" \
  --certificate-identity="https://github.com/yourorg/yourapp/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Verify an SBOM blob signature
cosign verify-blob sbom.cyclonedx.json \
  --bundle sbom.cyclonedx.json.bundle \
  --certificate-identity="https://github.com/yourorg/yourapp/.github/workflows/sbom.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

echo "Verification successful — artifact provenance confirmed."
```

### 10.6 Renovate Configuration (Supply Chain Hardening)

```json5
// renovate.json5
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests", ":pinVersions"],
  "vulnerabilityAlerts": { "enabled": true, "labels": ["security"] },
  "packageRules": [
    { "matchUpdateTypes": ["patch"], "matchCurrentVersion": "!/^0/",
      "automerge": true, "platformAutomerge": true },
    { "matchUpdateTypes": ["major"], "reviewers": ["team:security"],
      "labels": ["major-update", "needs-review"] },
    { "matchManagers": ["github-actions"], "groupName": "GitHub Actions" }
  ]
}
```

### 10.7 Python Requirements with Hash Verification

```text
# requirements.txt — Install with: pip install -r requirements.txt --require-hashes
# Generated with: pip-compile --generate-hashes requirements.in
requests==2.32.3 \
    --hash=sha256:70761cfe03c773ceb22aa2f671b4757976145175cdfca038c02654d061d6dcc6
certifi==2024.8.30 \
    --hash=sha256:922820b53db7a7257ffbda3f597266d435245903d80737e34f8a45ff3e3230d8
```

---

## References

- [XZ Utils Backdoor (CVE-2024-3094) — Datadog](https://securitylabs.datadoghq.com/articles/xz-backdoor-cve-2024-3094/)
- [CVE-2024-3094 — CrowdStrike](https://www.crowdstrike.com/en-us/blog/cve-2024-3094-xz-upstream-supply-chain-attack/)
- [event-stream Incident Analysis](https://es-incident.github.io/paper.html)
- [NPM Supply Chain Compromise — CISA](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem)
- [Codecov Breach — Sonatype](https://www.sonatype.com/blog/what-you-need-to-know-about-the-codecov-incident-a-supply-chain-attack-gone-undetected-for-2-months)
- [SLSA Framework](https://slsa.dev/) | [Spec v1.2](https://slsa.dev/spec/v1.2/)
- [NIST SP 800-218 — SSDF](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1)
- [CISA 2025 SBOM Minimum Elements](https://www.cisa.gov/resources-tools/resources/2025-minimum-elements-software-bill-materials-sbom)
- [OpenSSF Scorecard](https://scorecard.dev/) | [Checks](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- [Sonatype State of the Software Supply Chain 2024](https://www.sonatype.com/state-of-the-software-supply-chain/2024/10-year-look)
- [Supply Chain Attack Statistics 2025 — DeepStrike](https://deepstrike.io/blog/supply-chain-attack-statistics-2025)
- [Sigstore Cosign — SBOM Signing](https://edu.chainguard.dev/open-source/sigstore/cosign/how-to-sign-an-sbom-with-cosign/)
- [Dependency Confusion Prevention — Snyk](https://snyk.io/blog/detect-prevent-dependency-confusion-attacks-npm-supply-chain-security/)
- [EO 14028 and Supply Chain Transparency — NetRise](https://www.netrise.io/xiot-security-blog/what-eo-14028-eu-cra-and-nist-csf-2.0-mean-for-software-supply-chain-transparency)
