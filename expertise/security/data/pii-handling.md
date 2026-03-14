# PII Handling Security Expertise Module

> **Purpose:** Guide AI agents and development teams on securely handling Personally Identifiable
> Information (PII) across the software lifecycle.
>
> **Last Updated:** 2026-03-08

---

## 1. Threat Landscape

### 1.1 Scale

In 2024, the US recorded 3,158 data breaches affecting 1.35 billion individuals. Over 53% of all
breaches involve customer PII. The average US breach cost reached $10.22 million -- an all-time
high. 91% of organizations reported identity-related incidents in the past year (SpyCloud 2025).

### 1.2 Major PII Breaches

| Breach | Year | Records | Root Cause |
|--------|------|---------|------------|
| **Equifax** | 2017 | 147M SSNs | Unpatched Apache Struts (CVE-2017-5638); $700M+ settlement |
| **Facebook** | 2019 | 540M records | PII on publicly accessible S3 buckets |
| **National Public Data** | 2024 | 2.9B records, 272M unique SSNs | Inadequate access controls; company bankrupted |
| **Ticketmaster** | 2024 | 560M | Third-party supply chain compromise |
| **Dell** | 2024 | 49M | API abuse / scraping |
| **Prosper Marketplace** | 2025 | 17.6M | Unauthorized system access |
| **Yale New Haven Health** | 2025 | 5.5M PII+PHI | Ransomware |

**Lessons:** Patch management failures (Equifax), default-deny cloud policies (Facebook/S3),
data broker aggregation risk (NPD), and supply chain due diligence (Ticketmaster) are recurring
themes. Verizon's 2025 DBIR found a 100% increase in third-party attacks.

### 1.3 Common Exposure Vectors

- **Logs:** Stack traces and debug logs containing emails, IPs, session tokens
- **API responses:** Over-fetching full user objects when only a name is needed
- **Error messages:** Database values or user emails exposed in error pages
- **URLs/query strings:** PII captured in browser history, server logs, referrer headers
- **Analytics/telemetry:** User IDs and IPs sent to third parties without masking
- **Backups:** Unencrypted database backups with overly broad access
- **Caches:** Redis/Memcached holding PII without TTL or access restrictions
- **AI prompts:** 8.5% of LLM prompts include PII or credentials (Help Net Security, 2025)
- **Non-production environments:** Production clones with real PII and weaker controls

### 1.4 Enforcement Trends

GDPR fines exceed EUR 4.5B cumulatively. Under 2025 rules, penalties for similar breaches face
doubling. CCPA/CPRA added neural data as sensitive PI in 2025. Credential abuse remains the
top breach vector (22%), with vulnerability exploitation up 34% year-over-year.

---

## 2. Core Security Principles

### 2.1 Data Minimization

Collect only what you need. Store only what you must. Delete when you can. Four pillars:
**Adequacy** (enough for the purpose), **Relevance** (each field serves a documented purpose),
**Limitedness** (minimum volume), **Timeliness** (delete when purpose is fulfilled).

### 2.2 Purpose Limitation and Storage Limitation

PII collected for one purpose cannot be repurposed without consent. Define retention periods
for every category: session tokens (24h), support tickets (2y), payment records (7y),
marketing preferences (until withdrawn), account data (30 days post-deletion).

### 2.3 PII Classification

| Level | Examples | Controls |
|-------|----------|----------|
| **L1 Public** | Display name, public profile | Basic access control |
| **L2 Internal** | Email, phone, employer | Auth required, audit logging |
| **L3 Confidential** | DOB, home address, IP | Encryption at rest, RBAC |
| **L4 Restricted** | SSN, passport, biometrics, health records | Field-level encryption, MFA, audit, masking in non-prod |

NIST SP 800-122 uses Low/Moderate/High impact levels based on identifiability, quantity,
sensitivity, context, obligations, and access patterns.

### 2.4 Pseudonymization vs. Anonymization

**Pseudonymization** (tokenization, hashing, deterministic coding) is reversible and still PII
under GDPR. Preserves data utility for production use. Mapping tables must be secured separately.

**Anonymization** (suppression, generalization, aggregation, k-anonymity, differential privacy)
is irreversible and falls outside GDPR scope. Lower data utility; suited for research and
non-production environments.

### 2.5 Right to Deletion

GDPR Article 17 and CCPA mandate erasure rights. Implementation requires: authenticated request
intake, identity verification, automated cross-system data discovery, dependency checks (legal
holds), hard delete or anonymize, propagation to third-party processors, backup handling
(exclusion from restores or scheduled rotation), confirmation within 30 days (GDPR) or 45 days
(CCPA), and audit records without the PII itself.

---

## 3. Implementation Patterns

### 3.1 PII Field Identification

Maintain a centralized PII data dictionary mapping every field, its classification, purpose,
retention, encryption method, masking strategy, and which systems store it. Tag PII fields in
database schemas, ORM models, and API schemas for automated policy enforcement.

### 3.2 Data Masking in Logs

**Never log raw PII.** Enforce at the framework level:
- Allowlist approach: only log explicitly safe fields; deny by default
- Pattern-based redaction: regex for emails, SSNs, credit cards, phones, IPs
- PII-aware serializers: override `toString()`/`toJSON()` to exclude PII
- Log sink filtering: redaction at Datadog/Splunk/ELK as defense-in-depth

### 3.3 Tokenization

Replace sensitive PII with vault-backed or format-preserving tokens. **Vaulted:** original in
secure vault, token is random UUID. **Format-preserving (FPE):** token matches original format.
**Vaultless:** deterministic encryption, no vault lookup needed. Use for payment cards (PCI DSS),
SSNs, government IDs, and L4-Restricted fields.

### 3.4 Encryption Layers

| Layer | Technique | Protects Against |
|-------|-----------|-----------------|
| In transit | TLS 1.3 minimum | Network sniffing, MITM |
| At rest (volume) | AES-256 disk encryption | Physical theft |
| At rest (field) | AES-256-GCM application-level | DB admin access, SQLi exfiltration, backup exposure |
| In use | Confidential computing / enclaves | Memory dumps, side-channel |

Field-level encryption is critical for L4 data -- volume encryption alone does not protect
against application-layer attacks.

### 3.5 Secure PII APIs

- Reject PII in query parameters; use POST bodies
- Return only authorized PII fields per caller role (allowlist, not denylist)
- Dedicated `/pii` endpoints with stricter auth, rate limiting, and request-reason headers
- Set `Cache-Control: no-store` on PII responses

### 3.6 PII in Analytics

- **K-anonymity:** Each record indistinguishable from k-1 others (k>=5, k>=10 for sensitive)
- **Differential privacy:** Calibrated noise (Laplace/Gaussian) on query results; epsilon 1-3
- **Aggregation:** Report on cohorts (50+ users), not individuals
- **Purpose-built IDs:** Analytics-specific pseudonymous IDs without joinability

### 3.7 Retention and RTBF

Tag every PII record with creation timestamp and retention category. Run automated
deletion jobs. Handle cascading deletions across databases, caches, third parties. Maintain
deletion audit logs (category + timestamp, never the PII). Test that purge jobs actually work
across all storage layers.

---

## 4. Vulnerability Catalog

### V-01: PII in Application Logs
**Severity: High** | Logs accessible to developers, SREs, log services; retained for years.
```typescript
// VULNERABLE
logger.info('User login', { user: req.user }); // logs email, ssn, etc.
// SECURE
logger.info('User login', { userId: req.user.id, action: 'login' });
```

### V-02: PII in Error Messages
```typescript
// VULNERABLE
throw new Error(`User ${email} not found`); // returned to client
// SECURE
throw new AppError('USER_NOT_FOUND', 'The requested account was not found');
```

### V-03: PII in URLs
URLs logged by servers, proxies, CDNs, browsers, and sent via referrer headers.
```
# BAD:  GET /api/users?email=john@example.com&ssn=123-45-6789
# GOOD: POST /api/users/lookup  { "email": "..." }
```

### V-04: Overly Permissive API Responses
```typescript
// VULNERABLE: returns full DB record including ssn, dob, payment info
res.json(await db.users.findById(id));
// SECURE: explicit projection by role
res.json(pick(user, getFieldsByRole(req.auth.role)));
```

### V-05: PII in Analytics/Telemetry
Send hashed anonymous IDs, price ranges, and regions -- never raw emails, names, or addresses.

### V-06: Unmasked PII in Non-Production
Never clone production PII to dev/staging. Use synthetic data (Faker.js, Mimesis), masked
copies, or subset databases with test accounts only.

### V-07: PII in Caches
Cache only non-PII data. If PII must be cached, encrypt values and use short TTLs (60s).

### V-08: PII in Client-Side Storage
Never store L3/L4 PII in localStorage (XSS surface). Use HttpOnly secure cookies for auth,
sessionStorage for non-sensitive display data only.

### V-09: PII in File Exports
Apply same field-level access control to exports. Mask by default, watermark, auto-expire
download links (15-minute TTL).

### V-10: PII in Database Backups
Encrypt all backups (AES-256, KMS-managed keys). Apply same access controls as production.
For RTBF: rotate backups on schedule or maintain deletion ledgers applied on restore.

### V-11: PII in HTTP Headers
Use opaque identifiers (`X-User-Id: uuid`), never raw emails or phones in custom headers.

### V-12: PII in Source Code
Pre-commit hooks scanning for SSN/email/CC patterns. Use obviously fake data in fixtures.

### V-13: PII via GraphQL Introspection
Disable introspection in production. Use field-level auth directives and persisted queries.

### V-14: PII in Message Queues
Include only opaque user IDs in events. Encrypt PII in payloads if unavoidable. Apply
topic-level access controls.

---

## 5. Security Checklist

- [ ] All PII fields inventoried in a centralized data dictionary with classification (L1-L4)
- [ ] Every PII field has documented purpose and legal basis for collection
- [ ] Data flow diagrams map PII through all systems and third parties
- [ ] Automated PII discovery scans run regularly across all data stores
- [ ] Collection follows data minimization -- only necessary fields collected
- [ ] Explicit consent obtained where required (GDPR Art. 6, CCPA opt-out)
- [ ] L3-L4 PII encrypted at rest (AES-256); L4 uses field-level encryption
- [ ] All PII encrypted in transit (TLS 1.2+ minimum, TLS 1.3 preferred)
- [ ] Encryption keys in dedicated KMS with rotation policies
- [ ] Database backups encrypted and access-controlled
- [ ] PII access follows least-privilege RBAC; L4 access requires MFA
- [ ] All PII access audit-logged (user identity, timestamp, purpose)
- [ ] Production PII never in non-production without masking/anonymization
- [ ] Application logs never contain raw PII (framework-level redaction enforced)
- [ ] Error messages never expose PII; PII never in URLs/query params
- [ ] API responses filtered to authorized fields only (allowlist approach)
- [ ] PII API endpoints have rate limiting and anomaly detection
- [ ] Third-party agreements include PII protection requirements
- [ ] Retention periods defined and enforced via automated deletion jobs
- [ ] RTBF requests fulfillable within regulatory timelines (30d GDPR / 45d CCPA)
- [ ] Deletion propagates to all systems: DBs, caches, backups, third parties
- [ ] PII breach response plan exists and tested annually
- [ ] Breach notification meets 72-hour GDPR requirement
- [ ] DSAR processes handle requests within regulatory windows

---

## 6. Tools and Automation

### 6.1 PII Discovery and Scanning

| Tool | Type | Best For |
|------|------|----------|
| **AWS Macie** | Cloud-native | S3 data lakes; ML-based classification and alerting |
| **Google Cloud DLP** | Cloud-native | 150+ detectors; multi-cloud structured/unstructured data |
| **Microsoft Presidio** | Open-source | On-prem; text/image/audio PII detection and anonymization |
| **Microsoft Purview** | Enterprise | M365/Azure ecosystem; endpoint DLP |
| **BigID** | Enterprise DSPM | Complex data landscapes; DSAR automation |
| **Nightfall AI** | SaaS DLP | Slack, GitHub, Jira, email; ML-based real-time detection |

### 6.2 Log Redaction

Datadog Sensitive Data Scanner, Splunk Data Anonymization, Elastic `redact` ingest processor,
Fluentd/Fluent Bit filter plugins, and custom application-level middleware (see Section 10).

### 6.3 Data Masking

Delphix (dynamic/static masking), Informatica Persistent Data Masking, K2View (entity-based),
Tonic.ai (synthetic data), Faker.js/Mimesis/Bogus (open-source fake data generation).

### 6.4 DSAR Automation

OneTrust, TrustArc, Securiti.ai, BigID -- automate intake, identity verification, cross-system
discovery, response generation. Leading platforms reduce DSAR time from weeks to hours.

### 6.5 Pre-Commit Scanning

GitLeaks, TruffleHog, GitHub Secret Scanning (extendable with PII patterns), custom regex
hooks for SSN/CC/email detection in staged diffs (see Section 10).

---

## 7. Platform-Specific Guidance

### 7.1 Web

- `autocomplete="off"` on sensitive fields; `type="password"` for SSN/tax ID inputs
- Never store L3/L4 PII in localStorage/indexedDB; use HttpOnly Secure SameSite=Strict cookies
- CSP headers prevent PII exfiltration via XSS; SRI on third-party scripts
- `Referrer-Policy: strict-origin-when-cross-origin` prevents URL PII leaking via Referer

### 7.2 Mobile

- iOS: Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`; Android: EncryptedSharedPreferences
- Wipe PII from memory on app background; exclude from device backups
- Audit analytics SDKs (many collect IPs/device IDs by default); disable IP collection
- Screenshot protection for PII screens; clear clipboard after PII paste; no PII in push payloads

### 7.3 Backend

- Single logging middleware as the ONLY log emission path; test that PII never appears in output
- API gateway response filtering (allowlist per endpoint/role) as defense-in-depth
- `Cache-Control: no-store` on PII responses; parameterized queries only
- Query-level audit logging for L3/L4 tables; DB views or row-level security by role

### 7.4 Cloud

- Data residency: configure regions per GDPR/regulatory requirements
- Default encryption on all storage; block public access at account level
- Access logging on all PII buckets; pre-signed URLs with short expiry
- IaC scanning (Checkov, tfsec) for misconfigurations exposing PII

---

## 8. Incident Patterns

### 8.1 Detection

Layer multiple detection methods: real-time anomaly monitoring (bulk retrieval, unusual access),
DLP scanning of stores/logs/traffic, dark web monitoring (SpyCloud, HIBP), bug bounty programs,
and CI/CD pipeline checks scanning outputs for PII patterns.

### 8.2 Breach Notification Requirements

| Regulation | Deadline | Who to Notify |
|------------|----------|---------------|
| **GDPR Art. 33** | 72 hours from awareness | Supervisory authority (DPA) |
| **GDPR Art. 34** | Without undue delay | Affected individuals (high risk) |
| **CCPA/CPRA** | Most expedient time possible | AG (500+ CA residents) + individuals |
| **HIPAA** | 60 days | HHS + individuals + media (500+) |
| **PCI DSS** | Immediately | Card brands, acquiring bank |

The GDPR 72-hour clock starts at "sufficient awareness," not full technical details. Partial
notification with follow-up is acceptable.

### 8.3 Response Playbook

**Phase 1 -- Triage (0-4h):** Confirm breach scope, activate IR team, contain (revoke access,
isolate systems), preserve evidence, start regulatory clock.

**Phase 2 -- Investigate (4-48h):** Determine PII fields/individuals affected, identify vector,
assess impact by classification level, check jurisdictional obligations.

**Phase 3 -- Notify (24-72h):** DPA notification (GDPR 72h), assess individual notification
requirement, prepare clear communications, notify card brands if applicable.

**Phase 4 -- Remediate (72h-30d):** Patch vulnerability, implement additional controls, offer
credit monitoring, update risk assessments, document lessons learned.

**Phase 5 -- Post-Incident (30-90d):** Regulatory follow-up, litigation management, process
improvement, targeted training, verification of remediation effectiveness.

---

## 9. Compliance and Standards

### 9.1 GDPR

**Art. 5:** Lawfulness, fairness, transparency; purpose limitation; data minimization; accuracy;
storage limitation; integrity/confidentiality; accountability.
**Art. 6:** Lawful basis required (consent, contract, legal obligation, vital interests, public
task, legitimate interests). **Art. 17:** Right to erasure when data unnecessary, consent
withdrawn, or unlawfully processed. **Art. 32:** Appropriate technical/organizational measures
including pseudonymization, encryption, confidentiality/integrity/availability assurance,
resilience, and regular testing.

### 9.2 CCPA/CPRA

Covers 11 categories: identifiers, protected classifications, commercial info, biometrics,
internet activity, geolocation, sensory data, professional/employment info, education,
inferences, and sensitive PI (government IDs, financial data, precise geolocation,
racial/ethnic origin, biometrics, health, sex life, and neural data as of 2025).

### 9.3 HIPAA PHI

18 identifiers (names, sub-state geography, dates, phone, fax, email, SSN, medical record
numbers, health plan IDs, account numbers, license numbers, vehicle/device IDs, URLs, IPs,
biometrics, photos, other unique IDs). De-identification via Safe Harbor (remove all 18) or
Expert Determination (statistical re-identification risk certified "very small").

### 9.4 PCI DSS 4.0

Effective April 2025. PAN must be unreadable when stored. MFA required for all cardholder data
access. Minimum 12-character passwords. Stronger encryption algorithms mandated. Continuous
automated monitoring required. Risk-based customized approach replaces rigid checklists.
Non-compliance: up to $500K fines plus fraud liability.

### 9.5 NIST SP 800-122

Identify all PII; assign Low/Moderate/High impact levels based on identifiability, quantity,
sensitivity, context, obligations, and access patterns. Apply proportional safeguards. Minimize
PII in testing/development. Conduct privacy impact assessments.

---

## 10. Code Examples

### 10.1 Log Redaction Middleware (TypeScript)

```typescript
const PII_PATTERNS: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  phone: /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
};
const REDACTED_FIELDS = new Set([
  'password','ssn','taxId','creditCard','cardNumber','cvv','dob','passport',
  'driversLicense','bankAccount','routingNumber','biometric',
]);

export function redactPII(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (typeof obj === 'string') {
    let r = obj;
    for (const [name, pat] of Object.entries(PII_PATTERNS))
      r = r.replace(pat, `[REDACTED_${name.toUpperCase()}]`);
    return r;
  }
  if (Array.isArray(obj)) return obj.map(i => redactPII(i, depth + 1));
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>))
      out[k] = REDACTED_FIELDS.has(k.toLowerCase()) ? '[REDACTED]' : redactPII(v, depth + 1);
    return out;
  }
  return obj;
}

// Wrap any logger: createPIISafeLogger(winston.createLogger({...}))
export function createPIISafeLogger(base: any) {
  return Object.fromEntries(
    ['info','warn','error','debug'].map(l => [l, (m: string, meta?: object) =>
      base[l](m, meta ? redactPII(meta) : undefined)])
  );
}
```

### 10.2 PII Field Encryption (TypeScript)

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export class PIIFieldEncryptor {
  private key: Buffer;
  constructor(masterKey: string) {
    this.key = scryptSync(masterKey, process.env.PII_KEY_SALT!, 32);
  }
  encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc}`;
  }
  decrypt(value: string): string {
    const [ivH, tagH, enc] = value.split(':');
    const d = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivH, 'hex'));
    d.setAuthTag(Buffer.from(tagH, 'hex'));
    return d.update(enc, 'hex', 'utf8') + d.final('utf8');
  }
}
// ORM middleware: encrypt before write, decrypt after read for specified fields
```

### 10.3 API Response Filtering (TypeScript)

```typescript
type Role = 'public' | 'user' | 'support' | 'admin' | 'compliance';

const FIELD_POLICIES: Record<string, { roles: Role[]; mask?: (v: string) => string }> = {
  id:          { roles: ['public','user','support','admin','compliance'] },
  displayName: { roles: ['public','user','support','admin','compliance'] },
  email:       { roles: ['user','support','admin','compliance'],
                 mask: v => `${v[0]}***@${v.split('@')[1]}` },
  phone:       { roles: ['user','admin','compliance'],
                 mask: v => `***-***-${v.slice(-4)}` },
  ssn:         { roles: ['compliance'], mask: v => `***-**-${v.slice(-4)}` },
};

export function filterResponse(user: Record<string, any>, role: Role) {
  const out: Record<string, any> = {};
  for (const [field, policy] of Object.entries(FIELD_POLICIES)) {
    if (!(field in user) || !policy.roles.includes(role)) continue;
    out[field] = (policy.mask && role !== 'user') ? policy.mask(user[field]) : user[field];
  }
  return out;
}
// Express middleware: override res.json to apply filterResponse + Cache-Control: no-store
```

### 10.4 Data Masking Utilities (TypeScript)

```typescript
export const mask = {
  email: (v: string) => `${v[0]}${'*'.repeat(v.indexOf('@')-2)}${v.slice(v.indexOf('@')-1)}`,
  phone: (v: string) => `***-***-${v.replace(/\D/g,'').slice(-4)}`,
  ssn: (v: string) => `***-**-${v.replace(/\D/g,'').slice(-4)}`,
  creditCard: (v: string) => `****-****-****-${v.replace(/\D/g,'').slice(-4)}`,
  ip: (v: string) => v.split('.').slice(0,3).join('.') + '.0',
};
```

---

## References

**Breach Reports:** [Secureframe Statistics](https://secureframe.com/blog/data-breach-statistics) |
[IBM NPD Breach](https://www.ibm.com/think/news/national-public-data-breach-publishes-private-data-billions-us-citizens) |
[Troy Hunt NPD](https://www.troyhunt.com/inside-the-3-billion-people-national-public-data-breach/) |
[SpyCloud 2025](https://spycloud.com/resource/report/spycloud-annual-identity-exposure-report-2025/) |
[PKWARE 2025](https://www.pkware.com/blog/recent-data-breaches)

**Regulations:** [GDPR Art. 5](https://gdpr-info.eu/art-5-gdpr/) |
[CCPA](https://oag.ca.gov/privacy/ccpa) |
[NIST 800-122](https://csrc.nist.gov/pubs/sp/800/122/final) |
[HIPAA PHI](https://cphs.berkeley.edu/hipaa/hipaa18.html) |
[PCI DSS 4.0](https://www.scrut.io/hub/pci-dss/pci-dss-4)

**Tools:** [Strac PII Scanners](https://www.strac.io/blog/top-10-data-scanning-tools) |
[Presidio](https://microsoft.github.io/presidio/) |
[AWS Macie](https://aws.amazon.com/macie/) |
[GDPR Breach Guide](https://breachresponsefirms.com/gdpr-breach/)
