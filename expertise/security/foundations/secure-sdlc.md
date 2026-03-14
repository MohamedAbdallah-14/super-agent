# Secure Software Development Lifecycle (SDLC)

> Integrating security into every SDLC phase — requirements through operations.
> Covers shift-left security, SAST/DAST/SCA tooling, CI/CD pipeline integration,
> threat modeling, and compliance with NIST SSDF, OWASP SAMM, and Microsoft SDL.

---

## 1. Threat Landscape

### The Cost of Late Security Fixes

Security defects discovered late cost exponentially more to remediate:

| Discovery Phase      | Relative Cost Multiplier | Example Cost per Defect |
|----------------------|--------------------------|-------------------------|
| Requirements         | 1x                       | $100–$500               |
| Design               | 3–6x                     | $500–$3,000             |
| Implementation       | 10x                      | $1,000–$5,000           |
| Testing              | 15–40x                   | $5,000–$25,000          |
| Production           | 30–100x                  | $10,000–$100,000+       |
| Post-breach          | 640x+                    | $4.44M average (2025)   |

**IBM/Ponemon 2025 Cost of a Data Breach Report:**
- Global average breach cost: **$4.44M** (2025); U.S. average: **$10.22M** (all-time high)
- Average time to identify and contain: **241 days** (nine-year low)
- Detection/escalation costs: **$1.47M** average — largest cost driver four years running
- 97% of AI-related breach victims lacked proper access controls
- Study: 600 organizations, 17 industries, 16 countries (IBM/Ponemon 2025)

### Breaches From Skipping Security Phases

| Incident                     | Root Cause (Skipped Phase)                | Impact                          |
|------------------------------|-------------------------------------------|---------------------------------|
| Equifax (2017)               | No SCA — unpatched Apache Struts CVE      | 147M records, $700M settlement  |
| SolarWinds (2020)            | No supply chain security, weak build CI   | 18,000 orgs compromised         |
| Log4Shell (2021)             | No dependency threat modeling             | Millions of systems vulnerable  |
| MOVEit Transfer (2023)       | No DAST on file transfer endpoints        | 2,500+ orgs, 90M individuals    |
| XZ Utils backdoor (2024)     | No supply chain integrity verification    | Near-miss on global SSH infra   |
| npm Shai Hulud attack (2025) | No behavioral SCA / supply chain monitor  | Malicious packages in ecosystem |

---

## 2. Core Security Principles

### Shift-Left Security

Move security as early as possible. Instead of a gate before release, embed it
into every phase starting with requirements:

```
Traditional:  [Dev] → [Dev] → [Dev] → [Test] → [SECURITY] → [Release]
Shift-Left:   [SEC+Dev] → [SEC+Dev] → [SEC+Test] → [SEC+Deploy] → [SEC+Ops]
```

### Security by Design

Security is an architectural property, not a bolt-on. Every design decision must consider:
- **Least privilege** — minimum necessary permissions
- **Fail-safe defaults** — deny by default, allow explicitly
- **Complete mediation** — verify every access attempt
- **Separation of duties** — no single point of compromise
- **Economy of mechanism** — simple, auditable designs

### Defense in Depth at Every Phase

| Phase           | Primary Control              | Secondary Control              | Tertiary Control          |
|-----------------|------------------------------|--------------------------------|---------------------------|
| Requirements    | Security requirements        | Abuse case analysis            | Compliance mapping        |
| Design          | Threat modeling              | Security architecture review   | Attack surface analysis   |
| Implementation  | SAST in IDE                  | Secure coding standards        | Peer code review          |
| Build           | SAST in CI                   | SCA dependency scan            | Secret scanning           |
| Test            | DAST on staging              | Penetration testing            | Fuzz testing              |
| Deploy          | IaC scanning                 | Container image scanning       | Configuration validation  |
| Operations      | Runtime protection (RASP)    | WAF / API gateway              | SIEM / monitoring         |

### Security as Code

Codify security policies so they are version-controlled, reviewable via pull
requests, testable with unit tests, automated in CI/CD, and reproducible.

### Continuous Validation

- Automated scans on every commit (SAST, SCA, secrets)
- Dynamic scans on every staging deployment (DAST)
- Periodic penetration tests (quarterly or after major changes)
- Continuous production monitoring (SIEM, anomaly detection)
- Regular dependency updates and vulnerability patching

### Threat Modeling Before Coding

1. **Decompose** — components and data flows
2. **Identify** — assets, entry points, trust boundaries
3. **Enumerate** — threats using STRIDE or LINDDUN
4. **Rate** — risk using DREAD or CVSS
5. **Mitigate** — specific, testable security controls
6. **Validate** — mitigations through testing

---

## 3. Implementation Patterns

### Security Requirements Gathering

Every feature spec should include security requirements:

```markdown
## Feature: User Profile Update API
### Security Requirements
- [ ] Authentication: Require valid JWT with `profile:write` scope
- [ ] Authorization: Users can only modify own profile (IDOR prevention)
- [ ] Input validation: Display name max 100 chars, alphanumeric + spaces
- [ ] Rate limiting: Max 10 updates per hour per user
- [ ] Audit logging: Log all changes with before/after values
- [ ] Data classification: Email is PII — encrypt at rest, mask in logs
```

### Threat Modeling in Design (STRIDE)

| Category                   | Question                                          | Example Threat                          |
|----------------------------|---------------------------------------------------|-----------------------------------------|
| **S**poofing               | Can attacker impersonate a user or component?     | Stolen JWT used from different IP       |
| **T**ampering              | Can data be modified in transit or at rest?        | MITM on API calls                       |
| **R**epudiation            | Can a user deny performing an action?             | No audit log for financial transactions |
| **I**nformation Disclosure | Can sensitive data leak?                          | Stack traces in error responses         |
| **D**enial of Service      | Can the system be made unavailable?               | Unbounded query on search endpoint      |
| **E**levation of Privilege | Can a user gain unauthorized access?              | Mass assignment on user role field      |

### SAST in CI

**Semgrep** — 20K–100K loc/sec, custom rules look like source code:
```yaml
# .semgrep.yml
rules:
  - id: hardcoded-jwt-secret
    patterns:
      - pattern: jwt.sign($PAYLOAD, "...")
    message: "JWT secret must come from environment variables"
    severity: ERROR
    languages: [javascript, typescript]

  - id: sql-injection-template-literal
    patterns:
      - pattern: $DB.query(`... ${$USER_INPUT} ...`)
    message: "Use parameterized queries instead of template literals"
    severity: ERROR
    languages: [javascript, typescript]
```

**CodeQL** — 88% accuracy, 5% false positive rate. Native to GitHub Advanced
Security. Excels at taint tracking (source-to-sink). Slower but deeper
inter-procedural analysis.

**SonarQube** — ~0.4K loc/sec. Broader scope: code smells, duplication,
coverage, technical debt. Quality gates can block merges below thresholds.

### DAST in Staging

**OWASP ZAP** automation framework configuration:
```yaml
# zap-config.yaml
env:
  contexts:
    - name: "staging-app"
      urls: ["https://staging.example.com"]
      authentication:
        method: "json"
        parameters:
          loginRequestUrl: "https://staging.example.com/api/auth/login"
          loginRequestBody: '{"email":"{%username%}","password":"{%password%}"}'
jobs:
  - type: spider
    parameters: { maxDuration: 5, maxDepth: 10 }
  - type: passiveScan-wait
    parameters: { maxDuration: 10 }
  - type: activeScan
    parameters: { maxRuleDurationInMins: 5 }
  - type: report
    parameters: { template: "sarif-json", reportDir: "/zap/reports" }
    risks: [high, medium]
```

### SCA — Three-Layer Dependency Security

| Layer | Purpose                      | Tools                    | Coverage                     |
|-------|------------------------------|--------------------------|------------------------------|
| 1     | Dependency update automation | Dependabot, Renovate     | Keeps versions current       |
| 2     | CVE vulnerability scanning   | Snyk, npm audit, Trivy   | Known vulnerability database |
| 3     | Malicious package detection  | Socket.dev, Phylum       | Behavioral / supply chain    |

No single tool covers all three layers — build a stack, not buy a solution.

### Security Code Review Checklist

```markdown
### Authentication & Authorization
- [ ] All endpoints require authentication (unless explicitly public)
- [ ] Authorization checks verify resource ownership (no IDOR)

### Input Validation
- [ ] All user input validated server-side
- [ ] SQL uses parameterized queries; output encoding for context

### Data Handling
- [ ] No secrets in code; PII masked in logs
- [ ] Sensitive data encrypted at rest and in transit

### Business Logic
- [ ] Race conditions considered; rate limiting on sensitive endpoints
```

### Penetration Testing Cadence

| Trigger                  | Scope                    | Type               |
|--------------------------|--------------------------|--------------------|
| Quarterly schedule       | Full application         | External pen test  |
| Major feature release    | New feature + interfaces | Targeted pen test  |
| Infrastructure change    | Network / cloud config   | Infrastructure     |
| Post-incident            | Attack vector + surface  | Focused assessment |

### Security Champions Program

1. **Select** one volunteer developer per team
2. **Train** via OWASP, SANS, vendor certifications
3. **Empower** with authority to flag/block security issues
4. **Connect** through cross-team community of practice
5. **Rotate** annually to spread knowledge

---

## 4. Vulnerability Catalog

Process-level vulnerabilities introducing systemic security risk:

| #  | Vulnerability                        | Risk     | Mitigation                                          |
|----|--------------------------------------|----------|-----------------------------------------------------|
| 1  | Missing threat model                 | Critical | Mandatory threat model in design review              |
| 2  | No SAST in CI pipeline               | High     | SAST gate on every PR (Semgrep/CodeQL)               |
| 3  | Insecure defaults in frameworks      | High     | Hardened base configs, env-aware defaults            |
| 4  | Missing security requirements        | Critical | Security requirements template per feature           |
| 5  | Security as afterthought             | Critical | Security review as design phase gate                 |
| 6  | No SCA / dependency scanning         | High     | Automated SCA with blocking on high/critical         |
| 7  | No secret scanning in pipeline       | Critical | Pre-commit hooks + CI secret scanning                |
| 8  | Missing security regression tests    | Medium   | Security test suite on every build                   |
| 9  | No DAST on staging                   | High     | Automated DAST in staging pipeline                   |
| 10 | Shared secrets across environments   | High     | Separate secrets per env, vault-based management     |
| 11 | No security training for developers  | Medium   | Annual secure coding training + champions            |
| 12 | Manual security reviews only         | Medium   | Automated tooling + manual review for high-risk      |
| 13 | No IaC scanning                      | High     | Checkov/tfsec in CI for all infrastructure code      |
| 14 | Missing vulnerability disclosure     | Medium   | Published security.txt + responsible disclosure      |
| 15 | No container image scanning          | High     | Trivy/Grype scan in build pipeline                   |

---

## 5. Security Checklist

### Requirements Phase
- [ ] Security requirements documented for every feature
- [ ] Abuse cases and misuse cases defined
- [ ] Data classification completed (public, internal, confidential, restricted)
- [ ] Compliance requirements mapped (GDPR, PCI-DSS, HIPAA, SOC2)
- [ ] Third-party integration security requirements defined

### Design Phase
- [ ] Threat model created using STRIDE or equivalent
- [ ] Security architecture review completed and signed off
- [ ] Attack surface analysis documented
- [ ] Auth model designed; data flow diagrams include encryption boundaries
- [ ] Secure defaults defined for all configuration parameters

### Implementation Phase
- [ ] Secure coding standards followed (OWASP Secure Coding Practices)
- [ ] SAST integrated in IDE for real-time feedback
- [ ] Pre-commit hooks for secret scanning
- [ ] Parameterized queries for all database operations
- [ ] Server-side input validation; context-appropriate output encoding
- [ ] Error handling does not leak sensitive information
- [ ] Security events logged; sensitive data excluded from logs

### Testing Phase
- [ ] SAST passes with zero high/critical findings
- [ ] SCA — no high/critical CVEs in dependencies
- [ ] DAST on staging (authenticated + unauthenticated)
- [ ] Security regression tests pass
- [ ] Penetration test scheduled for major releases
- [ ] Fuzz testing on parsing and input-handling code

### Deployment Phase
- [ ] IaC security scan passes (Checkov, tfsec)
- [ ] Container images scanned — no critical base image vulnerabilities
- [ ] Secrets injected at runtime, not baked into images
- [ ] TLS with strong ciphers; security headers configured
- [ ] Network segmentation enforced

### Operations Phase
- [ ] Security monitoring/alerting active (SIEM)
- [ ] Incident response plan documented and tested
- [ ] Vulnerability disclosure policy published
- [ ] Dependency update automation enabled
- [ ] Access reviews conducted quarterly

---

## 6. Tools & Automation

### SAST

| Tool        | Speed              | Languages | Best For                          |
|-------------|--------------------|-----------|-----------------------------------|
| Semgrep     | 20K–100K loc/sec   | 30+       | Fast PR scanning, custom rules    |
| CodeQL      | Slower (deep)      | 12        | Taint analysis, semantic bugs     |
| SonarQube   | ~0.4K loc/sec      | 30+       | Code quality + security           |
| Snyk Code   | Fast (AI-assisted) | 10+       | AI-powered fix suggestions        |

### DAST

| Tool        | Type         | Auth    | Best For                          |
|-------------|--------------|---------|-----------------------------------|
| OWASP ZAP   | Open source  | Full    | Free, comprehensive, CI-friendly  |
| Burp Suite  | Commercial   | Full    | Manual + automated pen testing    |
| Nuclei      | Open source  | Template| Fast template-based scanning      |

### SCA

| Tool           | Detection Approach     | Supply Chain | Integration         |
|----------------|------------------------|--------------|---------------------|
| Snyk           | CVE (proprietary+NVD)  | Basic        | CI/CD, IDE, CLI     |
| Socket.dev     | Behavioral analysis    | Deep         | GitHub, npm         |
| Trivy          | CVE (NVD, GitHub)      | Basic        | CI/CD, CLI          |
| Dependabot     | CVE (GitHub Advisory)  | No           | GitHub native       |

### Secret Scanning

| Tool           | Patterns     | Verification     | Pre-commit |
|----------------|-------------|------------------|------------|
| Gitleaks       | 160+ types  | No               | Yes        |
| TruffleHog     | Entropy+pat | Live verification| Yes        |
| GitHub Native  | 200+ types  | Partner verify   | Auto       |

### IaC Scanning

| Tool        | Frameworks                    | Policies | Notes               |
|-------------|-------------------------------|----------|----------------------|
| Checkov     | Terraform, CF, K8s, Docker    | 1000+    | Graph-based analysis |
| tfsec       | Terraform                     | 300+     | Merged into Trivy    |
| Terrascan   | Terraform, K8s, CF, Docker    | 500+     | Rego (OPA) policies  |

---

## 7. Platform-Specific Guidance

### GitHub Actions Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security Pipeline
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday scan

permissions:
  contents: read
  security-events: write

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: semgrep/semgrep-action@v1
        with:
          config: "p/default p/owasp-top-ten p/nodejs"
          generateSarif: "1"
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: semgrep.sarif }

  codeql:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript, queries: security-extended }
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3

  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with: { args: --severity-threshold=high }
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy.sarif'
          severity: 'CRITICAL,HIGH'
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: 'trivy.sarif' }

  iac-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bridgecrewio/checkov-action@master
        with: { directory: ./infrastructure, framework: terraform, soft_fail: false }

  dast:
    runs-on: ubuntu-latest
    needs: [sast, sca, secret-scan]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: zaproxy/action-full-scan@v0.11.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
```

### GitLab CI/CD Security

```yaml
# .gitlab-ci.yml — leverage built-in security templates
include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Secret-Detection.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Security/Container-Scanning.gitlab-ci.yml
  - template: Security/DAST.gitlab-ci.yml

semgrep:
  stage: security
  image: semgrep/semgrep:latest
  script: semgrep ci --config auto --sarif --output semgrep.sarif
  artifacts:
    reports: { sast: semgrep.sarif }
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Security') {
            parallel {
                stage('Secrets')  { steps { sh 'gitleaks detect --source .' } }
                stage('SAST')    { steps { sh 'semgrep ci --config auto' } }
                stage('SCA')     { steps { sh 'snyk test --severity-threshold=high' } }
            }
        }
        stage('IaC')       { steps { sh 'checkov -d infrastructure/' } }
        stage('Container') { steps { sh 'trivy image --severity HIGH,CRITICAL app:${BUILD_NUMBER}' } }
        stage('DAST') {
            when { branch 'main' }
            steps {
                sh 'docker run --rm ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t https://staging.example.com'
            }
        }
    }
}
```

### Azure DevOps

```yaml
# azure-pipelines.yml
stages:
  - stage: SecurityScans
    jobs:
      - job: SAST
        steps:
          - script: semgrep ci --config auto --sarif -o semgrep.sarif
          - task: PublishBuildArtifacts@1
            inputs: { PathtoPublish: semgrep.sarif, ArtifactName: SecurityReports }
      - job: SCA
        steps:
          - task: SnykSecurityScan@1
            inputs: { testType: app, severityThreshold: high, failOnIssues: true }
```

---

## 8. Incident Patterns

### Security Regression Detection

```javascript
// security-regression.test.js — each test maps to a previously discovered vuln
describe('Security Regressions', () => {
  test('VULN-001: user search uses parameterized queries', async () => {
    const malicious = "'; DROP TABLE users; --";
    const res = await request(app)
      .get(`/api/users/search?q=${encodeURIComponent(malicious)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(500);
    const count = await db.query('SELECT COUNT(*) FROM users');
    expect(count.rows[0].count).toBeGreaterThan(0);
  });

  test('VULN-002: cannot download other user invoices', async () => {
    const res = await request(app)
      .get('/api/invoices/other-user-id')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(403);
  });

  test('VULN-003: HTML in comments is sanitized', async () => {
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '<script>alert("xss")</script>' });
    expect(res.body.body).not.toContain('<script>');
  });
});
```

### Vulnerability Disclosure Process

1. **Receive** — Monitor security@company.com, HackerOne, security.txt; auto-ack within 1 business day
2. **Triage (48h)** — Reproduce, assess impact, classify: Critical (24h), High (7d), Medium (30d), Low (90d)
3. **Remediate** — Private advisory, fix in private fork, backport patches, write regression test
4. **Disclose** — Request CVE, coordinate 90-day timeline, publish advisory with CVSS
5. **Post-mortem** — Root cause analysis, update threat model, add SAST/DAST rules, share learnings

### CVE Response Playbook

| Time     | Action                                       | Owner            |
|----------|----------------------------------------------|------------------|
| T+0h     | CVE alert via OSV/Snyk                       | Security tooling |
| T+1h     | Triage: check SBOM for affected components   | Security team    |
| T+2h     | Assess exploitability in our context         | Security + Dev   |
| T+4h     | Internal advisory to affected teams          | Security team    |
| T+24h    | Mitigate: WAF rules, feature flags           | DevOps + Dev     |
| T+48–72h | Patch: update dependency, test, deploy       | Dev team         |
| T+1w     | Verify remediation, update SBOM              | Security team    |

---

## 9. Compliance & Standards

### NIST SSDF SP 800-218

Four practice groups (v1.1 final; v1.2 draft released Dec 2025 per EO 14306):

| Practice Group                    | ID | Key Practices                                      |
|-----------------------------------|----|----------------------------------------------------|
| Prepare the Organization          | PO | Security requirements, roles, tooling, training    |
| Protect the Software              | PS | Code, build, and release integrity                 |
| Produce Well-Secured Software     | PW | Design, code review, test, configure securely      |
| Respond to Vulnerabilities        | RV | Identify, analyze, remediate vulnerabilities       |

**SSDF-to-CI/CD mapping:**
- PO.1 → Security requirements template in issue tracker
- PS.1 → Branch protection, signed commits, CODEOWNERS
- PS.2 → Reproducible builds, SLSA provenance
- PW.5 → SAST + DAST + SCA in pipeline
- RV.1 → Vulnerability scanning, dependency monitoring

### OWASP SAMM v2.0

Five business functions, 15 security practices, 3 maturity levels each:

| Business Function | Security Practices                                          |
|-------------------|-------------------------------------------------------------|
| Governance        | Strategy & Metrics, Policy & Compliance, Education          |
| Design            | Threat Assessment, Security Requirements, Security Architecture |
| Implementation    | Secure Build, Secure Deployment, Defect Management          |
| Verification      | Architecture Assessment, Requirements Testing, Security Testing |
| Operations        | Incident Management, Environment Mgmt, Operational Mgmt    |

### Microsoft SDL

12 practices across the development lifecycle. 2024–2025 updates: six new
requirements, six retired, 19 major updates. New focus: memory-safe languages,
OSS supply chain, responsible AI, AI-assisted security tooling.

**Also relevant:** ISO 27001 (A.8.25–A.8.31), SOC 2 (CC8.1/CC7.1), PCI-DSS 4.0 (Req 6).

---

## 10. Code Examples

### Pre-commit Hook Configuration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks

  - repo: https://github.com/trufflesecurity/trufflehog
    rev: v3.82.13
    hooks:
      - id: trufflehog
        entry: trufflehog git file://. --since-commit HEAD --only-verified --fail

  - repo: https://github.com/semgrep/semgrep
    rev: v1.96.0
    hooks:
      - id: semgrep
        args: ['--config', 'auto', '--error']

  - repo: https://github.com/bridgecrewio/checkov
    rev: 3.2.300
    hooks:
      - id: checkov
        args: ['--framework', 'terraform', '--quiet']

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: detect-private-key
      - id: check-added-large-files
        args: ['--maxkb=500']
      - id: no-commit-to-branch
        args: ['--branch', 'main', '--branch', 'production']
```

### Security PR Template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/security-review.md -->
## Security Impact Assessment

### Change Classification
- [ ] Modifies authentication or authorization logic
- [ ] Handles user input (forms, APIs, file uploads)
- [ ] Modifies database queries or data access
- [ ] Introduces new third-party dependencies
- [ ] Handles sensitive data (PII, credentials, financial)

### Security Checklist
- [ ] Threat model reviewed/updated
- [ ] Input validation for all new user-supplied data
- [ ] Authorization checks verify resource ownership
- [ ] No hardcoded secrets; error responses leak nothing
- [ ] Security regression tests added
```

### DAST Scan Policy for CI Gating

```tsv
# .zap/rules.tsv — ID, action (IGNORE/WARN/FAIL), name
10010	FAIL	Cookie No HttpOnly Flag
10011	FAIL	Cookie Without Secure Flag
10021	FAIL	X-Content-Type-Options Header
10035	FAIL	Strict-Transport-Security Header
10038	FAIL	Content Security Policy Header Not Set
40012	FAIL	Cross Site Scripting (Reflected)
40014	FAIL	Cross Site Scripting (Persistent)
40018	FAIL	SQL Injection
40028	FAIL	Open Redirect
90020	FAIL	Remote OS Command Injection
```

### SBOM Generation

```yaml
# GitHub Actions — SBOM for NIST SSDF PS.3 compliance
- name: Generate CycloneDX SBOM
  uses: CycloneDX/gh-node-module-generatebom@v1
  with: { output: './sbom.cdx.json' }
- name: Scan SBOM for vulnerabilities
  run: trivy sbom sbom.cdx.json --severity HIGH,CRITICAL --exit-code 1
```

---

## References

- NIST SP 800-218 — SSDF v1.1/v1.2 draft (https://csrc.nist.gov/pubs/sp/800/218/final)
- OWASP SAMM v2.0 (https://owaspsamm.org/model/)
- Microsoft SDL (https://www.microsoft.com/en-us/securityengineering/sdl)
- IBM/Ponemon 2025 Cost of a Data Breach (https://www.ibm.com/reports/data-breach)
- OWASP Secure Coding Practices (https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- SLSA (https://slsa.dev/) | CycloneDX (https://cyclonedx.org/)
