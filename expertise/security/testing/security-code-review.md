# Security Code Review

> Comprehensive guide to identifying, preventing, and remediating security
> vulnerabilities through systematic code review — combining manual expertise
> with automated tooling for defense-in-depth assurance.

---

## 1. Threat Landscape

### Why Security Code Review Matters

Security code review is the practice of systematically examining source code to
identify vulnerabilities, logic flaws, and insecure patterns before they reach
production. It is one of the highest-ROI security activities an organization
can perform.

### Cost of Catching Bugs: Review vs. Production

| Stage Detected       | Relative Cost | Typical Fix Time |
|----------------------|---------------|------------------|
| Code review / PR     | 1x            | 30 minutes       |
| QA / staging         | 5-10x         | 2-4 hours        |
| Production (pre-breach) | 30x        | 15+ hours        |
| Post-breach          | 100-680x      | Weeks to months  |

- A vulnerability caught in a pull request costs roughly **30 minutes** of
  developer time with proper guidance. The same vulnerability caught in
  post-production testing months later requires **15+ hours** of triage and
  troubleshooting (Source: HackerOne).
- The average cost of a data breach in the US reached **$9.44 million** in
  2024 (Source: IBM / Ponemon Institute).
- A planning-stage bug fix costs ~$100; in production, that same bug can
  escalate to $10,000+ due to ripple effects across systems.

### Breaches Traced to Code-Level Vulnerabilities

| Incident               | Year  | Root Cause                        | Impact                         |
|-------------------------|-------|-----------------------------------|--------------------------------|
| Log4Shell (CVE-2021-44228) | 2021 | Unsafe JNDI lookup in logging   | Millions of systems exposed    |
| MOVEit Transfer         | 2023  | SQL injection in file transfer   | 2,500+ orgs, 90M+ records     |
| US Treasury breach      | 2024  | Leaked/hardcoded API key         | Government systems compromised |
| Equifax                 | 2017  | Unpatched Struts deserialization | 147M records, $700M settlement |
| SolarWinds              | 2020  | Backdoor in build pipeline       | 18,000+ organizations          |
| React Server Components | 2025  | Deserialization infinite loop    | DoS on server processes        |

Log4Shell remains on the list of most commonly exploited vulnerabilities
(position #8 as of 2025), demonstrating that code-level flaws persist for
years. In 2025 alone, 21,500+ CVEs were recorded in the first half of the
year, and attackers routinely exploit disclosed vulnerabilities within 24-48
hours.

### Security Bugs Commonly Missed in Review

1. **Business logic flaws** — authorization bypass via parameter manipulation
2. **Race conditions** — TOCTOU in file operations and financial transactions
3. **Second-order injection** — stored payloads triggering in different contexts
4. **Implicit trust** — internal service calls without authentication
5. **Cryptographic misuse** — correct algorithm, wrong mode or parameters
6. **Error information leakage** — stack traces, SQL errors in responses

---

## 2. Core Security Principles

### 2.1 Defense in Depth Review

Every layer of the application must independently enforce security controls.
A code reviewer must verify each layer, not assume upstream protection.

#### Input Validation
- All external inputs validated at entry points (type, length, range, format)
- Allowlist validation preferred over denylist
- Validation applied server-side regardless of client-side checks
- Structured data parsed with strict schemas (JSON Schema, Zod, Pydantic)

#### Output Encoding
- Context-appropriate encoding applied at the point of output
- HTML entities for HTML context, URL encoding for URLs, parameterized queries
  for SQL
- Template engines configured with auto-escaping enabled by default
- Raw/unescaped output explicitly justified and reviewed

#### Authentication Checks
- Every endpoint enforcing authentication unless explicitly public
- Authentication middleware applied at the framework level, not per-route
- Token validation checking signature, expiry, issuer, and audience
- Credential comparison using constant-time functions

#### Authorization Checks
- Authorization enforced on every request, not cached from session creation
- Object-level authorization (IDOR prevention) for all data access
- Role/permission checks using centralized policy engine
- Principle of least privilege in service-to-service calls

### 2.2 Trust Boundary Verification

Identify where data crosses trust boundaries and verify controls at each:

```
[Browser] --HTTPS--> [API Gateway] --mTLS--> [Service] --TLS--> [Database]
    ^                      ^                      ^                  ^
    |                      |                      |                  |
  Input validation    Auth + AuthZ           Service auth       Query params
  CSP headers         Rate limiting          Input re-validation  Row-level sec
  CSRF tokens         Request logging        Output encoding     Audit logging
```

Review checklist for trust boundaries:
- Data re-validated when crossing from one trust zone to another
- No implicit trust between microservices
- External API responses treated as untrusted input
- Database query results sanitized before rendering

### 2.3 Sensitive Data Handling

- Credentials, tokens, and PII never logged or included in error messages
- Sensitive fields masked in serialization (`toJSON()`, `__repr__()`)
- Memory cleared after processing secrets (where language allows)
- Data classification labels applied and enforced in code

### 2.4 Cryptographic Usage Review

| Check                    | Secure                          | Insecure                    |
|--------------------------|---------------------------------|-----------------------------|
| Hashing passwords        | bcrypt, Argon2id, scrypt        | MD5, SHA-1, SHA-256 (plain) |
| Symmetric encryption     | AES-256-GCM                     | AES-ECB, DES, RC4           |
| Asymmetric encryption    | RSA-OAEP (2048+), ECDSA P-256  | RSA-PKCS1v15 (1024)         |
| Random number generation | crypto.randomBytes, os.urandom  | Math.random, random.random  |
| Key derivation           | HKDF, PBKDF2 (600k+ rounds)    | PBKDF1, single-pass hash    |
| TLS version              | TLS 1.2+ with strong ciphers   | SSLv3, TLS 1.0/1.1          |

### 2.5 Error Handling Review

- Exceptions caught at appropriate granularity (not blanket catch-all)
- Error messages safe for external consumption (no stack traces, no SQL)
- Failure states default to deny (fail-closed, not fail-open)
- Resource cleanup guaranteed (finally blocks, defer, using/with statements)
- Error responses consistent (same format for 401/403/404 to prevent enumeration)

---

## 3. Implementation Patterns

### 3.1 Security Review Process

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Automated   │    │   Manual     │    │   Focused    │
│  SAST Scan   │───>│  Code Review │───>│  Threat      │
│  (CI gate)   │    │  (PR review) │    │  Assessment  │
└──────────────┘    └──────────────┘    └──────────────┘
       │                    │                    │
       v                    v                    v
  Block on critical    Approve/Request     Update threat
  findings             changes             model
```

**Phase 1: Automated Pre-screening**
- SAST tools run on every PR (Semgrep, CodeQL, Bandit)
- Secret scanning blocks commits with credentials
- Dependency scanning flags known-vulnerable packages
- License compliance checks

**Phase 2: Manual Security Review**
- Triggered for security-sensitive changes (auth, crypto, input handling)
- Reviewer follows structured checklist (see Section 5)
- Focus on logic flaws that automated tools miss
- Business context applied to technical findings

**Phase 3: Focused Threat Assessment**
- For significant architectural changes
- Threat model updated with new attack surfaces
- Penetration testing scope adjusted

### 3.2 Review Focus Areas by File Type

| File Type / Pattern         | Security Focus                                    |
|-----------------------------|---------------------------------------------------|
| Route handlers / controllers | Auth, authz, input validation, rate limiting      |
| Database queries / ORM      | Injection, parameterization, access control        |
| Template files              | XSS, auto-escaping, context-aware encoding         |
| Authentication modules      | Credential handling, session management, MFA       |
| API client code             | TLS verification, credential storage, error handling|
| Configuration files         | Secrets exposure, debug settings, CORS policy      |
| Infrastructure as Code      | Public access, encryption at rest, IAM policies    |
| Serialization / parsing     | Deserialization safety, schema validation           |
| File I/O operations         | Path traversal, symlink attacks, permission checks |
| Cryptographic code          | Algorithm choice, key management, randomness        |
| CI/CD pipeline definitions  | Script injection, secret exposure, dependency pins |

### 3.3 Taint Analysis

Taint analysis tracks data from untrusted **sources** to sensitive **sinks**
through the application. During manual review, trace the data flow:

```
Source (untrusted)          Propagation                Sink (sensitive)
─────────────────          ───────────                ────────────────
req.body                   → variable assignment      → db.query()
req.query                  → string concatenation     → res.send()
req.headers                → function parameters      → exec()
req.files                  → object properties        → fs.readFile()
process.env (user-set)     → array elements           → eval()
database results           → template interpolation   → redirect()
third-party API responses  → deserialization          → child_process
```

**Review questions for taint analysis:**
1. Where does this data originate? (source identification)
2. Is the data validated/sanitized before use? (sanitizer presence)
3. Does the sanitization match the sink context? (context-appropriate)
4. Can the sanitization be bypassed? (completeness check)
5. Are there indirect paths that skip sanitization? (bypass routes)

### 3.4 Dangerous Function Identification

#### JavaScript / TypeScript
```javascript
// DANGEROUS — review any usage carefully
eval()                    // Code injection
Function()                // Code injection via constructor
setTimeout(string)        // Implicit eval
setInterval(string)       // Implicit eval
document.write()          // DOM XSS
innerHTML                 // DOM XSS
outerHTML                 // DOM XSS
child_process.exec()      // Command injection (use execFile instead)
vm.runInNewContext()       // Sandbox escape
new RegExp(userInput)     // ReDoS
require(userInput)        // Arbitrary module loading
```

#### Python
```python
# DANGEROUS — review any usage carefully
eval()                    # Code injection
exec()                    # Code injection
os.system()               # Command injection (use subprocess with list args)
subprocess.shell=True     # Command injection
pickle.loads()            # Insecure deserialization
yaml.load()               # Use yaml.safe_load()
__import__(user_input)    # Arbitrary module loading
input() (Python 2)        # Evaluates expressions
compile()                 # Code injection
marshal.loads()           # Insecure deserialization
```

#### SQL (Any Language)
```sql
-- DANGEROUS — string concatenation in queries
"SELECT * FROM users WHERE id = " + userId        -- SQL injection
f"DELETE FROM orders WHERE id = {order_id}"        -- SQL injection
`UPDATE products SET name = '${name}'`             -- SQL injection
```

### 3.5 Framework-Specific Patterns

#### Express.js / Node.js
```javascript
// REVIEW: Is body parser size-limited?
app.use(express.json({ limit: '100kb' }));  // Good
app.use(express.json());                     // Missing limit — DoS risk

// REVIEW: Helmet headers applied?
app.use(helmet());

// REVIEW: CORS properly restricted?
app.use(cors({ origin: 'https://app.example.com' }));  // Good
app.use(cors());                                         // Allows all — bad

// REVIEW: Rate limiting on auth endpoints?
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 100 }));
```

#### Django / Flask
```python
# REVIEW: CSRF protection enabled?
MIDDLEWARE = ['django.middleware.csrf.CsrfViewMiddleware']  # Good

# REVIEW: Auto-escaping in templates?
# Django: enabled by default, review {% autoescape off %} blocks
# Flask/Jinja2: review | safe filter usage

# REVIEW: SQL using ORM or parameterized queries?
User.objects.filter(id=user_id)                    # Good — ORM
cursor.execute("SELECT * FROM users WHERE id=%s", [user_id])  # Good
cursor.execute(f"SELECT * FROM users WHERE id={user_id}")      # BAD
```

### 3.6 Security PR Review Template

```markdown
## Security Review Checklist

### Authentication & Authorization
- [ ] All endpoints require authentication (or explicitly marked public)
- [ ] Authorization checked for the specific resource being accessed
- [ ] No privilege escalation paths via parameter manipulation

### Input Handling
- [ ] All external inputs validated (type, length, range, format)
- [ ] Validation occurs server-side
- [ ] File uploads validated (type, size, content, filename sanitized)

### Output Encoding
- [ ] Context-appropriate encoding applied at output points
- [ ] No raw HTML rendering of user-supplied data
- [ ] API responses do not leak internal details

### Data Protection
- [ ] No secrets or credentials in code, configs, or logs
- [ ] PII handled according to data classification policy
- [ ] Sensitive data encrypted in transit and at rest

### Error Handling
- [ ] Errors fail closed (deny by default)
- [ ] No sensitive data in error messages or logs
- [ ] Resources properly cleaned up on failure

### Dependencies
- [ ] No known-vulnerable dependencies introduced
- [ ] Dependencies pinned to specific versions
- [ ] New dependencies reviewed for security posture

### Reviewer Sign-off
- Reviewer: _______________
- Date: _______________
- Risk Level: [ ] Low [ ] Medium [ ] High [ ] Critical
```

---

## 4. Vulnerability Catalog

### 4.1 SQL Injection (CWE-89)

**Risk:** Arbitrary database queries, data exfiltration, data modification.

```javascript
// VULNERABLE
app.get('/user', (req, res) => {
  const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  db.query(query);  // Attacker: name=' OR '1'='1
});

// SECURE
app.get('/user', (req, res) => {
  db.query('SELECT * FROM users WHERE name = $1', [req.query.name]);
});
```

### 4.2 Cross-Site Scripting — XSS (CWE-79)

**Risk:** Session hijacking, credential theft, defacement.

```javascript
// VULNERABLE — Reflected XSS
app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${req.query.q}</h1>`);
});

// SECURE
import { escape } from 'lodash';
app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${escape(req.query.q)}</h1>`);
});
// Better: use a template engine with auto-escaping (React, Handlebars, etc.)
```

### 4.3 Command Injection (CWE-78)

**Risk:** Arbitrary OS command execution, full server compromise.

```python
# VULNERABLE
import os
def convert_image(filename):
    os.system(f"convert {filename} output.png")  # ; rm -rf /

# SECURE
import subprocess
def convert_image(filename):
    subprocess.run(["convert", filename, "output.png"], check=True)
    # List form prevents shell interpretation
```

### 4.4 Path Traversal (CWE-22)

**Risk:** Arbitrary file read/write, configuration exposure, code execution.

```javascript
// VULNERABLE
app.get('/file', (req, res) => {
  const filePath = path.join('/uploads', req.query.name);
  res.sendFile(filePath);  // name=../../etc/passwd
});

// SECURE
app.get('/file', (req, res) => {
  const basePath = path.resolve('/uploads');
  const filePath = path.resolve('/uploads', req.query.name);
  if (!filePath.startsWith(basePath)) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(filePath);
});
```

### 4.5 Hardcoded Secrets (CWE-798)

**Risk:** Credential exposure, unauthorized access, lateral movement.

GitGuardian's 2025 report found **23.8 million secrets** exposed on GitHub
in 2024 — a 25% increase over the previous year.

```python
# VULNERABLE
API_KEY = "sk-live-4eC39HqLyjWDarjtT1zdp7dc"
db_password = "super_secret_password_123"

# SECURE
import os
API_KEY = os.environ["API_KEY"]
db_password = os.environ["DB_PASSWORD"]
# Or use a secrets manager: AWS Secrets Manager, HashiCorp Vault, etc.
```

### 4.6 Insecure Deserialization (CWE-502)

**Risk:** Remote code execution, DoS, privilege escalation.

```python
# VULNERABLE
import pickle
def load_session(data):
    return pickle.loads(base64.b64decode(data))  # RCE via crafted payload

# SECURE
import json
def load_session(data):
    return json.loads(base64.b64decode(data))  # JSON is data-only
    # If complex objects needed, use schema validation after parsing
```

```java
// VULNERABLE — Java deserialization
ObjectInputStream ois = new ObjectInputStream(inputStream);
Object obj = ois.readObject();  // Gadget chain RCE

// SECURE — Use allowlist-based deserialization filter (Java 9+)
ObjectInputFilter filter = ObjectInputFilter.Config
    .createFilter("com.example.safe.*;!*");
ois.setObjectInputFilter(filter);
```

### 4.7 Race Conditions / TOCTOU (CWE-367)

**Risk:** Double-spending, privilege escalation, data corruption.

```python
# VULNERABLE — Time-of-Check-to-Time-of-Use
import os
def safe_delete(filepath):
    if os.path.isfile(filepath):     # Check
        # Attacker replaces file with symlink here
        os.remove(filepath)           # Use — may delete wrong file

# SECURE — Use atomic operations or locks
import fcntl
def safe_delete(filepath):
    fd = os.open(filepath, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        os.unlink(filepath)
    finally:
        os.close(fd)
```

```javascript
// VULNERABLE — Balance race condition
async function transfer(from, to, amount) {
  const balance = await getBalance(from);
  if (balance >= amount) {
    // Concurrent request can pass this check before deduction
    await deduct(from, amount);
    await credit(to, amount);
  }
}

// SECURE — Use database transaction with row locking
async function transfer(from, to, amount) {
  await db.transaction(async (trx) => {
    const { balance } = await trx('accounts')
      .where({ id: from })
      .forUpdate()  // Row-level lock
      .first();
    if (balance < amount) throw new Error('Insufficient funds');
    await trx('accounts').where({ id: from }).decrement('balance', amount);
    await trx('accounts').where({ id: to }).increment('balance', amount);
  });
}
```

### 4.8 Server-Side Request Forgery — SSRF (CWE-918)

**Risk:** Internal network scanning, cloud metadata theft, service exploitation.

```python
# VULNERABLE
import requests
def fetch_url(url):
    return requests.get(url).text  # url=http://169.254.169.254/latest/meta-data/

# SECURE
from urllib.parse import urlparse
import ipaddress

BLOCKED_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
]

def fetch_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError("Invalid scheme")
    ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
    if any(ip in net for net in BLOCKED_NETWORKS):
        raise ValueError("Blocked address")
    return requests.get(url, allow_redirects=False, timeout=5).text
```

### 4.9 Broken Access Control — IDOR (CWE-639)

**Risk:** Unauthorized data access, data modification, privilege escalation.

```javascript
// VULNERABLE — No ownership check
app.get('/api/orders/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.json(order);  // Any authenticated user can access any order
});

// SECURE — Ownership verified
app.get('/api/orders/:id', auth, async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id  // Scoped to authenticated user
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});
```

### 4.10 Mass Assignment (CWE-915)

**Risk:** Privilege escalation, data tampering.

```javascript
// VULNERABLE
app.put('/api/profile', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, req.body);
  // Attacker sends: { "role": "admin", "name": "attacker" }
});

// SECURE — Allowlist fields
app.put('/api/profile', auth, async (req, res) => {
  const { name, email, avatar } = req.body;  // Only allowed fields
  await User.findByIdAndUpdate(req.user.id, { name, email, avatar });
});
```

### 4.11 Insufficient Logging (CWE-778)

**Risk:** Undetected breaches, failed forensic analysis, compliance violations.

```python
# VULNERABLE — No security logging
def login(username, password):
    user = db.get_user(username)
    if not verify_password(password, user.hash):
        return {"error": "Invalid credentials"}  # Silent failure

# SECURE — Security event logging
import logging
security_log = logging.getLogger("security")

def login(username, password):
    user = db.get_user(username)
    if not verify_password(password, user.hash):
        security_log.warning(
            "auth.failure",
            extra={
                "username": username,
                "ip": request.remote_addr,
                "user_agent": request.headers.get("User-Agent"),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        return {"error": "Invalid credentials"}
    security_log.info("auth.success", extra={"username": username})
```

### 4.12 XML External Entity — XXE (CWE-611)

**Risk:** File disclosure, SSRF, DoS.

```python
# VULNERABLE
from lxml import etree
def parse_xml(data):
    return etree.fromstring(data)  # Processes external entities

# SECURE
from defusedxml import ElementTree
def parse_xml(data):
    return ElementTree.fromstring(data)  # External entities disabled
```

### 4.13 Open Redirect (CWE-601)

**Risk:** Phishing, credential theft, trust exploitation.

```javascript
// VULNERABLE
app.get('/redirect', (req, res) => {
  res.redirect(req.query.url);  // url=https://evil.com/fake-login
});

// SECURE
const ALLOWED_HOSTS = ['app.example.com', 'docs.example.com'];
app.get('/redirect', (req, res) => {
  const url = new URL(req.query.url, 'https://app.example.com');
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(400).send('Invalid redirect');
  }
  res.redirect(url.toString());
});
```

### 4.14 Prototype Pollution (CWE-1321)

**Risk:** Property injection, DoS, RCE in Node.js applications.

```javascript
// VULNERABLE
function merge(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      target[key] = merge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
// Attacker: {"__proto__": {"isAdmin": true}}

// SECURE
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {  // Own properties only
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;  // Skip dangerous keys
    }
    if (typeof source[key] === 'object' && source[key] !== null) {
      target[key] = safeMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
```

### 4.15 Regex Denial of Service — ReDoS (CWE-1333)

**Risk:** Application DoS via catastrophic backtracking.

```javascript
// VULNERABLE — Catastrophic backtracking
const EMAIL_REGEX = /^([a-zA-Z0-9]+)+@example\.com$/;
// Input: "aaaaaaaaaaaaaaaaaaaaaaaaaaaa!" causes exponential time

// SECURE — Use linear-time patterns or RE2
const EMAIL_REGEX = /^[a-zA-Z0-9]+@example\.com$/;  // No nested quantifiers
// Or use Google's RE2 engine which guarantees linear time
import RE2 from 're2';
const pattern = new RE2('^[a-zA-Z0-9]+@example\\.com$');
```

### 4.16 Insecure Randomness (CWE-330)

```javascript
// VULNERABLE
const token = Math.random().toString(36).substring(2);  // Predictable

// SECURE
import crypto from 'crypto';
const token = crypto.randomBytes(32).toString('hex');
```

### 4.17 Missing Security Headers

```javascript
// VULNERABLE — No security headers
app.get('/', (req, res) => res.send(html));

// SECURE — Using Helmet.js
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 5. Security Checklist

### Input Validation (7 items)
- [ ] All external inputs validated for type, length, range, and format
- [ ] Server-side validation present regardless of client-side checks
- [ ] Allowlist validation used over denylist where possible
- [ ] File uploads validated: type, size, content sniffing, filename sanitized
- [ ] JSON/XML/YAML parsing uses safe parsers with strict schemas
- [ ] Regular expressions reviewed for ReDoS (no nested quantifiers)
- [ ] URL inputs validated against SSRF (block internal/metadata addresses)

### Authentication (5 items)
- [ ] All non-public endpoints require authentication
- [ ] Password hashing uses bcrypt/Argon2id with appropriate cost factor
- [ ] Multi-factor authentication available for sensitive operations
- [ ] Account lockout or rate limiting on authentication endpoints
- [ ] Session tokens generated with cryptographic randomness

### Authorization (5 items)
- [ ] Authorization checked on every request (not cached from login)
- [ ] Object-level authorization prevents IDOR on all data endpoints
- [ ] Function-level authorization prevents privilege escalation
- [ ] Mass assignment prevented (allowlist of modifiable fields)
- [ ] Default deny — new endpoints require explicit authorization rules

### Cryptography (4 items)
- [ ] No deprecated algorithms (MD5, SHA-1, DES, RC4, ECB mode)
- [ ] Keys and secrets stored in environment variables or secrets manager
- [ ] Random values generated using cryptographic RNG
- [ ] TLS 1.2+ enforced for all external communications

### Error Handling (4 items)
- [ ] Errors fail closed (deny access on failure)
- [ ] No stack traces, SQL errors, or internal paths in responses
- [ ] Error responses consistent across 401/403/404 (prevent enumeration)
- [ ] Resources cleaned up in all error paths (connections, file handles)

### Logging & Monitoring (4 items)
- [ ] Authentication failures logged with IP, timestamp, user agent
- [ ] Authorization failures logged with resource and principal
- [ ] No sensitive data (passwords, tokens, PII) in log output
- [ ] Tampering attempts logged (input validation failures, CSRF mismatches)

### Data Protection (4 items)
- [ ] No hardcoded secrets, API keys, or passwords in source code
- [ ] PII encrypted at rest and masked in logs
- [ ] Sensitive data cleared from memory after use (where applicable)
- [ ] HTTP responses include appropriate cache-control for sensitive data

### Dependencies (3 items)
- [ ] No known-vulnerable dependencies (checked via npm audit, pip-audit, etc.)
- [ ] Dependencies pinned to specific versions (lockfile committed)
- [ ] New dependencies reviewed for maintainer reputation and security history

---

## 6. Tools & Automation

### 6.1 Semgrep

Semgrep is an open-source static analysis tool supporting 30+ languages
with a pattern-matching approach that makes custom rules straightforward
to write.

**Installation and basic usage:**
```bash
# Install
pip install semgrep

# Run with community rules
semgrep --config=auto .

# Run specific security rulesets
semgrep --config=p/security-audit .
semgrep --config=p/owasp-top-ten .
semgrep --config=p/javascript .

# Run with custom rules
semgrep --config=.semgrep/ .
```

**Custom Semgrep rule — Detect missing auth decorator (Python/Flask):**
```yaml
rules:
  - id: flask-route-missing-auth
    patterns:
      - pattern: |
          @app.route(...)
          def $FUNC(...):
              ...
      - pattern-not: |
          @login_required
          @app.route(...)
          def $FUNC(...):
              ...
      - pattern-not: |
          @app.route(...)
          @login_required
          def $FUNC(...):
              ...
    message: "Route $FUNC is missing @login_required decorator"
    severity: WARNING
    languages: [python]
    metadata:
      category: security
      cwe: CWE-306
      owasp: A01:2021 Broken Access Control
```

**Custom Semgrep rule — Detect SQL injection (JavaScript):**
```yaml
rules:
  - id: node-sql-injection
    patterns:
      - pattern-either:
          - pattern: $DB.query(`...${$INPUT}...`)
          - pattern: $DB.query("..." + $INPUT + "...")
          - pattern: $DB.query(`...` + $INPUT)
    message: |
      Potential SQL injection. Use parameterized queries instead of
      string interpolation: $DB.query('SELECT ... WHERE id = $1', [$INPUT])
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: CWE-89
      owasp: A03:2021 Injection
```

**Custom Semgrep rule — Detect hardcoded secrets:**
```yaml
rules:
  - id: hardcoded-secret
    patterns:
      - pattern-either:
          - pattern: $KEY = "...AKIA..."
          - pattern: $KEY = "sk-live-..."
          - pattern: $KEY = "ghp_..."
          - pattern: $KEY = "glpat-..."
      - metavariable-regex:
          metavariable: $KEY
          regex: (?i)(api_key|secret|token|password|credential)
    message: "Hardcoded secret detected in $KEY"
    severity: ERROR
    languages: [python, javascript, typescript, java, go]
    metadata:
      cwe: CWE-798
```

**CI/CD integration (GitHub Actions):**
```yaml
# .github/workflows/semgrep.yml
name: Semgrep Security Scan
on: [pull_request]
jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            .semgrep/
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

### 6.2 CodeQL

CodeQL treats code as data, building a relational database from source
code that can be queried for vulnerability patterns. Over **400 CVEs**
have been identified using CodeQL variant analysis.

**GitHub Actions setup:**
```yaml
# .github/workflows/codeql.yml
name: CodeQL Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday scan
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    strategy:
      matrix:
        language: ['javascript', 'python']
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-extended
      - uses: github/codeql-action/analyze@v3
```

**Custom CodeQL query — Find unvalidated redirects (JavaScript):**
```ql
/**
 * @name Unvalidated URL redirect
 * @description Finds redirects using user-controlled URLs without validation
 * @kind path-problem
 * @problem.severity error
 * @security-severity 6.1
 * @id js/unvalidated-redirect
 * @tags security
 */

import javascript
import semmle.javascript.security.dataflow.ServerSideUrlRedirectQuery

from ServerSideUrlRedirect::Configuration cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "Untrusted URL redirection from $@.", source.getNode(),
  "user input"
```

### 6.3 SonarQube

```bash
# Docker setup for local scanning
docker run -d --name sonarqube -p 9000:9000 sonarqube:community

# Scan a project
sonar-scanner \
  -Dsonar.projectKey=myapp \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=$SONAR_TOKEN \
  -Dsonar.qualitygate.wait=true
```

**Quality gate configuration for security:**
- 0 blocker issues (critical vulnerabilities)
- 0 critical issues (high-severity vulnerabilities)
- Security rating must be A
- Security hotspots reviewed > 80%

### 6.4 Bandit (Python)

```bash
# Install and run
pip install bandit

# Scan a project
bandit -r ./src -f json -o bandit-report.json

# With configuration
bandit -r ./src -c .bandit.yml -ll  # Only medium+ severity
```

**Configuration file (.bandit.yml):**
```yaml
# .bandit.yml
skips:
  - B101  # assert_used (acceptable in tests)
exclude_dirs:
  - tests
  - venv
tests:
  - B301  # pickle
  - B302  # marshal
  - B303  # insecure hash (MD5, SHA1)
  - B304  # insecure cipher (DES)
  - B305  # insecure cipher mode
  - B306  # mktemp
  - B307  # eval
  - B308  # mark_safe (Django)
  - B601  # paramiko shell
  - B602  # subprocess with shell=True
  - B608  # SQL injection
  - B703  # Django mark_safe XSS
```

### 6.5 ESLint Security Plugins

```bash
# Install security plugins
npm install --save-dev eslint-plugin-security eslint-plugin-no-unsanitized
```

```javascript
// eslint.config.js (flat config)
import security from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  {
    plugins: { security, 'no-unsanitized': noUnsanitized },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-child-process': 'warn',
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
    },
  },
];
```

### 6.6 GitHub Advanced Security

GitHub Advanced Security provides three integrated capabilities:

1. **Code scanning** — CodeQL-powered SAST on every PR
2. **Secret scanning** — Detects 200+ secret patterns in commits
3. **Dependency review** — Flags vulnerable dependencies in PRs

```yaml
# Enable secret scanning push protection
# In repository Settings > Code security and analysis
# Secret scanning: Enabled
# Push protection: Enabled

# Dependency review action
- uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: moderate
    deny-licenses: GPL-3.0, AGPL-3.0
```

### 6.7 Snyk Code

```bash
# Install and authenticate
npm install -g snyk
snyk auth

# Test for vulnerabilities
snyk code test          # SAST scan
snyk test               # Dependency scan
snyk container test     # Container scan
snyk iac test           # IaC scan

# Monitor in CI
snyk monitor --all-projects
```

### 6.8 Tool Comparison Matrix

| Tool          | Type        | Languages     | CI Integration | Custom Rules | Cost       |
|---------------|-------------|---------------|----------------|--------------|------------|
| Semgrep       | SAST        | 30+           | Native         | YAML (easy)  | Free/Paid  |
| CodeQL        | SAST        | 12            | GitHub Actions | QL (moderate)| Free (OSS) |
| SonarQube     | SAST + Lint | 30+           | Plugin-based   | Java (hard)  | Free/Paid  |
| Bandit        | SAST        | Python only   | Any CI         | Python       | Free       |
| ESLint-security| Lint       | JS/TS only    | Any CI         | JS (easy)    | Free       |
| Snyk Code     | SAST + SCA  | 10+           | Native         | Limited      | Free/Paid  |
| GitHub GHAS   | SAST + SCA  | 12 (CodeQL)   | Native         | QL           | Paid       |

---

## 7. Platform-Specific Guidance

### 7.1 TypeScript / Node.js

**Common vulnerability patterns:**
```typescript
// 1. Prototype pollution via object spread
// REVIEW: Does this accept __proto__ or constructor keys?
const config = { ...defaults, ...userInput };

// 2. Path traversal in file serving
// REVIEW: Is the path normalized and confined to allowed directory?
const file = path.join(uploadDir, req.params.filename);

// 3. NoSQL injection in MongoDB
// VULNERABLE
const user = await User.findOne({ username: req.body.username });
// If req.body.username = { "$ne": "" }, returns first user

// SECURE
const username = String(req.body.username);  // Coerce to string
const user = await User.findOne({ username });

// 4. SSRF via user-controlled URLs
// REVIEW: Any fetch/axios/got call using user input as URL?

// 5. Template literal injection
// REVIEW: Is user input interpolated into template literals
// used for SQL, HTML, or shell commands?
```

**Node.js security review checklist additions:**
- `--experimental-permissions` flag used in production (Node 20+)
- `npm audit` clean or all findings triaged
- `helmet` middleware applied for HTTP security headers
- `express-rate-limit` on authentication and expensive endpoints
- No use of `eval()`, `Function()`, `vm.runInNewContext()` with user input

### 7.2 Python

**Common vulnerability patterns:**
```python
# 1. Pickle deserialization — always flag
pickle.loads(user_data)       # RCE
yaml.load(user_data)          # RCE — use yaml.safe_load()
marshal.loads(user_data)      # RCE

# 2. Format string injection
# VULNERABLE
log.info(user_input)          # If user_input contains %(...)s
# SECURE
log.info("%s", user_input)

# 3. Django ORM bypass
# REVIEW: Any use of .raw(), .extra(), or RawSQL?
User.objects.raw(f"SELECT * FROM users WHERE name = '{name}'")  # BAD
User.objects.raw("SELECT * FROM users WHERE name = %s", [name]) # OK

# 4. Jinja2 SSTI
# VULNERABLE
template = Template(user_input)  # Server-side template injection
# SECURE — Never use user input as template source

# 5. os.path.join with absolute user input
os.path.join("/safe/dir", "/etc/passwd")  # Returns "/etc/passwd"!
# REVIEW: Validate that result starts with expected base path
```

**Python security review checklist additions:**
- `bandit` scan clean or findings triaged
- `safety check` or `pip-audit` for dependency vulnerabilities
- No `pickle`, `marshal`, `shelve` with untrusted data
- Django: `DEBUG = False` in production, `ALLOWED_HOSTS` configured
- Flask: `SECRET_KEY` from environment, not hardcoded

### 7.3 Kotlin / Swift (Mobile)

**Kotlin (Android) review patterns:**
```kotlin
// 1. Insecure data storage
// REVIEW: Is sensitive data stored in SharedPreferences without encryption?
// VULNERABLE
val prefs = getSharedPreferences("auth", MODE_PRIVATE)
prefs.edit().putString("token", authToken).apply()

// SECURE — Use EncryptedSharedPreferences
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
val prefs = EncryptedSharedPreferences.create(
    context, "auth", masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// 2. WebView JavaScript bridge
// REVIEW: Is addJavascriptInterface used? Check API level and interface scope
webView.addJavascriptInterface(BridgeObject(), "bridge")
// Vulnerable on API < 17: all public methods exposed

// 3. Intent handling
// REVIEW: Are exported activities/services properly protected?
// Check AndroidManifest.xml: exported="true" without permission guards

// 4. Certificate pinning
// REVIEW: Is certificate pinning implemented for sensitive APIs?
```

**Swift (iOS) review patterns:**
```swift
// 1. Keychain usage
// REVIEW: Is sensitive data stored in Keychain, not UserDefaults?
// VULNERABLE
UserDefaults.standard.set(token, forKey: "authToken")

// SECURE
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "authToken",
    kSecValueData as String: token.data(using: .utf8)!,
    kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
]
SecItemAdd(query as CFDictionary, nil)

// 2. ATS (App Transport Security)
// REVIEW: Any NSAllowsArbitraryLoads exceptions in Info.plist?

// 3. URL scheme handling
// REVIEW: Is URL scheme input validated before processing?
func application(_ app: UIApplication, open url: URL, options: ...) -> Bool {
    guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
          components.scheme == "myapp",
          let action = components.host else { return false }
    // Validate action against allowlist
}

// 4. Biometric authentication
// REVIEW: Is LAContext properly configured with fallback handling?
```

### 7.4 Infrastructure as Code (IaC) Review

```hcl
# Terraform — Common security issues to review

# 1. Public S3 bucket
# VULNERABLE
resource "aws_s3_bucket" "data" {
  bucket = "company-data"
  acl    = "public-read"  # FLAG: Public access
}

# SECURE
resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. Overly permissive IAM
# VULNERABLE
resource "aws_iam_policy" "admin" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "*"        # FLAG: Wildcard actions
      Resource = "*"        # FLAG: Wildcard resources
    }]
  })
}

# 3. Unencrypted storage
# REVIEW: Is encryption_configuration present for RDS, EBS, S3, DynamoDB?

# 4. Security group rules
# VULNERABLE
resource "aws_security_group_rule" "ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]  # FLAG: Open to world
}
```

**IaC scanning tools:**
```bash
# Checkov
pip install checkov
checkov -d . --framework terraform

# tfsec
brew install tfsec
tfsec .

# Trivy (multi-purpose)
trivy config .
```

---

## 8. Incident Patterns

### 8.1 Post-Incident Code Review Process

When a security incident traces back to a code-level vulnerability, conduct
a structured post-incident code review:

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Identify   │    │   Variant    │    │   Process    │    │  Prevention  │
│  Root Cause │───>│   Analysis   │───>│   Gap        │───>│  Measures    │
│             │    │              │    │   Analysis   │    │              │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Step 1: Root Cause Identification**
- Identify the exact vulnerable code (commit, file, line)
- Determine when the vulnerability was introduced (git blame)
- Identify what review process the code went through
- Document the attack vector and exploitation method

**Step 2: Variant Analysis**
- Search the entire codebase for the same vulnerability pattern
- Use CodeQL or Semgrep to write a query for the specific pattern
- Check third-party dependencies for the same class of issue
- Review related modules that handle similar data flows

**Step 3: Process Gap Analysis**
- Was there a code review? Did the reviewer have security training?
- Were automated tools running? Did they miss this class of bug?
- Was the threat model up to date? Did it cover this attack surface?
- Were there existing tests that should have caught this?

**Step 4: Prevention Measures**
- Write automated rules (Semgrep/CodeQL) to detect the pattern
- Add the pattern to the team's security review checklist
- Create regression tests for the specific vulnerability
- Update security training materials with this example

### 8.2 Root Cause Analysis Template

```markdown
## Security Incident RCA — Code Review Findings

### Incident Summary
- **Date discovered:** YYYY-MM-DD
- **Severity:** Critical / High / Medium / Low
- **CVE (if applicable):** CVE-YYYY-NNNNN
- **Affected systems:** [list]

### Vulnerability Details
- **CWE classification:** CWE-XXX
- **Vulnerable code location:** file:line
- **Introduced in commit:** [hash]
- **Introduced date:** YYYY-MM-DD
- **Introduced by:** [developer — for process, not blame]

### Why It Was Missed
- [ ] No code review performed
- [ ] Code review performed but reviewer lacked security knowledge
- [ ] Automated tools not configured for this vulnerability class
- [ ] Vulnerability in third-party dependency
- [ ] Complex multi-step vulnerability hard to spot in review
- [ ] Business logic flaw not detectable by automated tools

### Remediation
- **Immediate fix:** [PR link]
- **Variant scan results:** [N similar issues found]
- **Automated rule created:** [rule ID / link]
- **Regression test added:** [test file link]

### Process Improvements
1. [Specific improvement with owner and deadline]
2. [...]
```

### 8.3 Security Regression Prevention

```yaml
# Example: Semgrep rule created after an incident
rules:
  - id: incident-2024-042-sql-concat
    message: |
      SQL string concatenation detected. This pattern caused incident
      INC-2024-042. Use parameterized queries instead.
      See: https://wiki.internal/incidents/INC-2024-042
    patterns:
      - pattern-either:
          - pattern: $DB.query("..." + $VAR + "...")
          - pattern: $DB.query(f"...{$VAR}...")
    severity: ERROR
    languages: [python]
    metadata:
      incident: INC-2024-042
      cwe: CWE-89
```

**Regression test example:**
```python
# test_security_regressions.py
"""
Security regression tests — each test corresponds to a past incident.
DO NOT DELETE these tests without security team approval.
"""

def test_inc_2024_042_sql_injection():
    """Regression: SQL injection via order search (INC-2024-042)"""
    malicious_input = "'; DROP TABLE orders; --"
    response = client.get(f"/api/orders?search={malicious_input}")
    assert response.status_code == 200
    # Verify orders table still exists
    assert Order.objects.count() > 0

def test_inc_2024_051_idor_order_access():
    """Regression: IDOR in order endpoint (INC-2024-051)"""
    # User A should not access User B's orders
    client.login(user_a)
    response = client.get(f"/api/orders/{user_b_order_id}")
    assert response.status_code == 404  # Not 200
```

---

## 9. Compliance & Standards

### 9.1 OWASP Code Review Guide

The OWASP Code Review Guide (v2.0) provides a structured methodology:

1. **Understand the application** — Architecture, data flows, trust boundaries
2. **Identify high-risk code** — Auth, crypto, input handling, file operations
3. **Review against OWASP Top 10** — Each category has specific code patterns
4. **Document findings** — Severity, location, remediation guidance
5. **Verify fixes** — Re-review remediated code

**OWASP Top 10 (2025) code review mapping:**

| Risk Category                          | Code Review Focus                         |
|----------------------------------------|-------------------------------------------|
| A01: Broken Access Control             | AuthZ checks on every endpoint, IDOR      |
| A02: Cryptographic Failures            | Algorithm choice, key management           |
| A03: Injection                         | Parameterized queries, input validation    |
| A04: Insecure Design                   | Threat modeling, security requirements     |
| A05: Security Misconfiguration         | Debug flags, default credentials, headers  |
| A06: Vulnerable Components             | Dependency versions, known CVEs            |
| A07: Authentication Failures           | Credential handling, session management    |
| A08: Software/Data Integrity Failures  | Deserialization, CI/CD pipeline security   |
| A09: Logging/Monitoring Failures       | Security event logging, log injection      |
| A10: SSRF                              | URL validation, network segmentation       |
| NEW: Supply Chain Failures             | Dependency provenance, lockfile integrity  |
| NEW: Mishandling Exceptional Conditions| Error handling, fail-closed patterns       |

### 9.2 NIST Secure Software Development Framework (SSDF)

NIST SP 800-218 defines four practice groups relevant to code review:

| Practice Group          | Code Review Relevance                             |
|-------------------------|---------------------------------------------------|
| PO: Prepare             | Define security requirements, training reviewers  |
| PS: Protect Software    | Secure development environment, access controls   |
| PW: Produce Well-Secured| Code review as verification, SAST integration     |
| RV: Respond to Vulns    | Incident response, patch process, variant analysis|

**Key SSDF practices for code review (PW category):**
- **PW.7.1** — Acquire and maintain well-secured components
- **PW.7.2** — Verify components have no known vulnerabilities
- **PW.8.1** — Review code for security vulnerabilities using human review
- **PW.8.2** — Review code using automated tools (SAST)
- **PW.9.1** — Test executable code for vulnerabilities

### 9.3 CERT Coding Standards

SEI CERT provides language-specific rules prioritized by severity,
likelihood, and remediation cost:

**CERT C Secure Coding Standard (selected high-priority rules):**
- **STR31-C** — Guarantee storage for strings has sufficient space
- **INT32-C** — Ensure integer operations do not overflow
- **FIO30-C** — Exclude user input from format strings
- **MSC33-C** — Do not pass invalid data to the asctime() function
- **MEM35-C** — Allocate sufficient memory for an object

**CERT Java Secure Coding Standard (selected rules):**
- **IDS00-J** — Prevent SQL injection
- **IDS01-J** — Normalize strings before validating them
- **SER01-J** — Do not deviate from the proper signatures of serialization methods
- **MSC02-J** — Generate strong random numbers
- **ENV02-J** — Do not trust the values of environment variables

**CERT rules integrate with tools:**
- Semgrep has CERT-mapped rules in the community registry
- SonarQube maps findings to CERT identifiers
- CodeQL provides CERT-aligned query suites

### 9.4 Compliance Framework Mapping

| Framework   | Code Review Requirement                           | Control ID      |
|-------------|---------------------------------------------------|-----------------|
| PCI DSS 4.0 | Secure coding training, code review for vulns     | 6.2.3, 6.2.4    |
| SOC 2       | Change management, peer review of code changes    | CC8.1            |
| HIPAA       | Access controls, audit logging in application      | 164.312(a)(1)   |
| ISO 27001   | Secure development policy, code review process     | A.8.25-A.8.28   |
| FedRAMP     | SAST scanning, vulnerability remediation           | SA-11, SI-10    |

---

## 10. Code Examples: Vulnerable to Secure Patterns

### Example 1: JWT Validation (TypeScript)

```typescript
// VULNERABLE — No signature verification
import jwt from 'jsonwebtoken';
function getUser(token: string) {
  const payload = jwt.decode(token);  // Decodes WITHOUT verifying
  return payload;
}

// SECURE — Full validation
function getUser(token: string) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],     // Restrict algorithms
      issuer: 'auth.example.com',
      audience: 'api.example.com',
      maxAge: '1h',
      clockTolerance: 30,
    });
    return payload;
  } catch (err) {
    throw new AuthenticationError('Invalid token');
  }
}
```

### Example 2: Password Reset (Python)

```python
# VULNERABLE — Predictable token, no expiry
import hashlib
def create_reset_token(user_id):
    token = hashlib.md5(str(user_id).encode()).hexdigest()
    db.save_reset_token(user_id, token)  # No expiry set
    return token

# SECURE — Cryptographic token, expiry, single-use
import secrets
from datetime import datetime, timedelta

def create_reset_token(user_id):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db.save_reset_token(
        user_id=user_id,
        token_hash=token_hash,  # Store hash, not plaintext
        expires_at=datetime.utcnow() + timedelta(hours=1),
        used=False
    )
    return token  # Send plaintext to user via email

def verify_reset_token(token):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = db.get_reset_token(token_hash)
    if not record or record.used or record.expires_at < datetime.utcnow():
        raise InvalidTokenError()
    db.mark_token_used(token_hash)  # Single-use
    return record.user_id
```

### Example 3: File Download (Go)

```go
// VULNERABLE — Path traversal
func downloadHandler(w http.ResponseWriter, r *http.Request) {
    filename := r.URL.Query().Get("file")
    http.ServeFile(w, r, filepath.Join("./uploads", filename))
    // file=../../../etc/passwd
}

// SECURE — Sanitized path with confinement check
func downloadHandler(w http.ResponseWriter, r *http.Request) {
    filename := filepath.Base(r.URL.Query().Get("file")) // Strip directory
    if filename == "." || filename == "/" {
        http.Error(w, "Invalid filename", http.StatusBadRequest)
        return
    }
    fullPath := filepath.Join("./uploads", filename)
    absPath, err := filepath.Abs(fullPath)
    if err != nil || !strings.HasPrefix(absPath, "/app/uploads") {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
    http.ServeFile(w, r, absPath)
}
```

### Example 4: API Rate Limiting (TypeScript)

```typescript
// VULNERABLE — No rate limiting on sensitive endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  // Unlimited brute force attempts possible
  const user = await authenticate(email, password);
  res.json({ token: generateToken(user) });
});

// SECURE — Rate limiting with progressive delays
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const loginLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || req.ip,  // Per-account limiting
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

app.post('/api/login', loginLimiter, async (req, res) => {
  // ... authentication logic
});
```

### Example 5: Secure Cookie Configuration (TypeScript)

```typescript
// VULNERABLE — Insecure session cookie
app.use(session({
  secret: 'keyboard cat',  // Weak, hardcoded secret
  cookie: {}                // Default: httpOnly false, secure false
}));

// SECURE — Hardened session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,   // Strong, from environment
  name: '__Host-sid',                    // Cookie prefix for extra protection
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                      // No JavaScript access
    secure: true,                        // HTTPS only
    sameSite: 'strict',                  // CSRF protection
    maxAge: 3600000,                     // 1 hour
    domain: undefined,                   // No cross-subdomain
    path: '/',
  },
  store: new RedisStore({ client: redisClient }),  // Server-side storage
}));
```

### Example 6: Semgrep Custom Rule — Detect Dangerous Deserialization

```yaml
rules:
  - id: dangerous-deserialization
    message: |
      Deserialization of untrusted data detected. This can lead to
      remote code execution. Use JSON or a safe serialization format.
    patterns:
      - pattern-either:
          # Python
          - pattern: pickle.loads(...)
          - pattern: pickle.load(...)
          - pattern: yaml.load(...)
          - pattern: marshal.loads(...)
          - pattern: shelve.open(...)
          # Java
          - pattern: (ObjectInputStream $X).readObject()
          - pattern: (XMLDecoder $X).readObject()
          # Ruby
          - pattern: Marshal.load(...)
          - pattern: YAML.load(...)
          # PHP
          - pattern: unserialize(...)
    severity: ERROR
    languages: [python, java, ruby, php]
    metadata:
      cwe: CWE-502
      owasp: A08:2021 Software and Data Integrity Failures
      references:
        - https://owasp.org/www-community/vulnerabilities/Insecure_Deserialization
```

### Example 7: Semgrep Custom Rule — Missing CSRF Protection

```yaml
rules:
  - id: express-missing-csrf
    message: |
      State-changing route handler without CSRF protection.
      Add CSRF middleware (csurf or csrf-csrf) to POST/PUT/DELETE routes.
    patterns:
      - pattern-either:
          - pattern: app.post($PATH, ..., $HANDLER)
          - pattern: app.put($PATH, ..., $HANDLER)
          - pattern: app.delete($PATH, ..., $HANDLER)
          - pattern: router.post($PATH, ..., $HANDLER)
          - pattern: router.put($PATH, ..., $HANDLER)
          - pattern: router.delete($PATH, ..., $HANDLER)
      - pattern-not: app.$METHOD($PATH, ..., csrfProtection, ..., $HANDLER)
      - pattern-not: router.$METHOD($PATH, ..., csrfProtection, ..., $HANDLER)
    severity: WARNING
    languages: [javascript, typescript]
    metadata:
      cwe: CWE-352
      owasp: A01:2021 Broken Access Control
```

### Example 8: Secure Logging Configuration (Python)

```python
# VULNERABLE — Sensitive data in logs
import logging
logger = logging.getLogger(__name__)

def process_payment(card_number, amount):
    logger.info(f"Processing payment: card={card_number}, amount={amount}")
    # Logs: "Processing payment: card=4111111111111111, amount=99.99"

# SECURE — Sensitive data masked
import re

class SensitiveDataFilter(logging.Filter):
    PATTERNS = [
        (re.compile(r'\b\d{13,16}\b'), '[CARD_REDACTED]'),
        (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
         '[EMAIL_REDACTED]'),
        (re.compile(r'(?i)(password|secret|token|key)\s*[=:]\s*\S+'),
         r'\1=[REDACTED]'),
    ]

    def filter(self, record):
        msg = record.getMessage()
        for pattern, replacement in self.PATTERNS:
            msg = pattern.sub(replacement, msg)
        record.msg = msg
        record.args = ()
        return True

logger.addFilter(SensitiveDataFilter())

def process_payment(card_number, amount):
    masked_card = f"****{card_number[-4:]}"
    logger.info(f"Processing payment: card={masked_card}, amount={amount}")
```

---

## References

- [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/)
- [OWASP Secure Code Review Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html)
- [NIST SP 800-218 — Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf)
- [SEI CERT Coding Standards](https://wiki.sei.cmu.edu/confluence/display/seccode)
- [Semgrep Rule Registry](https://semgrep.dev/explore)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [CWE/SANS Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)
- [HackerOne — Cost Savings of Fixing Security Flaws in Development](https://www.hackerone.com/blog/cost-savings-fixing-security-flaws)
- [GitGuardian State of Secrets Sprawl 2025](https://www.gitguardian.com/state-of-secrets-sprawl-report)
- [GitHub Advanced Security](https://github.com/security/advanced-security)
- [OWASP Top 10 2025](https://owasp.org/www-project-top-ten/)
- [Bandit — Python Security Linter](https://bandit.readthedocs.io/)
- [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)
