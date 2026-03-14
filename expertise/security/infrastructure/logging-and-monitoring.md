# Security Logging and Monitoring

> **Expertise Module** — Security Infrastructure
> **Purpose:** Comprehensive guidance for AI agents implementing security logging, monitoring, alerting, and audit trail systems.
> **Last Updated:** 2026-03-08

---

## 1. Threat Landscape

### The Detection Gap

Security logging and monitoring failures represent one of the most critical yet underappreciated
vulnerabilities in modern systems. Without adequate logging and monitoring, breaches go undetected
for extended periods, dramatically increasing damage and cost.

**Key statistics (IBM Cost of a Data Breach Report 2024):**
- Average time to identify a breach: **194 days**
- Average time to contain a breach: **64 days**
- Combined breach lifecycle: **258 days** (7-year low, down from 277 days)
- Breaches involving stolen credentials: **292 days** average lifecycle
- Breaches exceeding 200 days cost **$4.87M** vs **$3.61M** for those contained within 200 days

### OWASP A09:2021 — Security Logging and Monitoring Failures

Insufficient logging, detection, monitoring, and active response allows attackers to further attack
systems, maintain persistence, pivot to more systems, and tamper with, extract, or destroy data.
This category moved up from A10:2017 to A09:2021, reflecting its growing criticality. It remains
at A09 in OWASP Top 10:2025.

**What constitutes failure:**
- Auditable events (logins, failed logins, high-value transactions) not logged
- Warnings and errors generate no, inadequate, or unclear log messages
- Logs not monitored for suspicious activity
- Logs stored only locally (no centralization)
- Alerting thresholds and response escalation processes absent or ineffective
- Penetration testing and scans do not trigger alerts
- Application unable to detect, escalate, or alert for active attacks in real time

### Real-World Breach Case Studies

**Equifax (2017) — 76 Days Undetected:**
- Attackers exploited Apache Struts vulnerability (CVE-2017-5638) starting mid-May 2017
- Breach went undetected for **76 days** until July 29, 2017
- Root cause: An **expired SSL certificate** (expired November 2016) disabled network traffic
  inspection tools — the very tools meant to detect data exfiltration
- Once the certificate was renewed, the monitoring tool immediately flagged suspicious traffic
- **147.9 million** Americans, 15.2 million British, and 19,000 Canadian citizens compromised
- Lesson: Monitoring infrastructure must itself be monitored — certificate expiry, agent health,
  pipeline throughput. A single expired certificate created a 10-month blind spot.

**SolarWinds / SUNBURST (2020) — Months Undetected:**
- Attackers (APT29/Cozy Bear) compromised the Orion build pipeline as early as January 2019
- Malicious code shipped in legitimate software updates starting March 2020
- Went undetected until December 2020 — discovered by FireEye, not SolarWinds
- Detection trigger: An anomalous remote login from an unknown device with suspicious IP
- The malware checked for security tools and disabled them, evading EDR
- Organizations with **SIEM and centralized logging** were better prepared to investigate
- Lesson: Behavioral analytics and anomaly detection catch what signature-based tools miss.
  Log retention policies must be long enough to support retrospective investigation.

**Log4Shell / CVE-2021-44228 (2021) — Logging as Attack Surface:**
- Zero-day in Apache Log4j (versions 2.0–2.14.1), CVSS score **10.0**
- Affected **35,000+ Java packages** (8% of Maven Central)
- Logging frameworks themselves became the attack vector — JNDI lookup injection
- Most organizations did not know they used Log4j (buried in transitive dependencies)
- Lesson: Logging libraries are part of the attack surface. Maintain a Software Bill of
  Materials (SBOM). Never process untrusted input in log format strings.

### Attacker Techniques Against Logging (MITRE ATT&CK)

| Technique | ATT&CK ID | Description |
|-----------|-----------|-------------|
| Indicator Removal: Clear Logs | T1070.001 | Attacker clears Windows Event, Linux syslog, or application logs |
| Indicator Removal: Timestomp | T1070.006 | Modifying file timestamps to confuse forensic timeline |
| Impair Defenses: Disable Logging | T1562.002 | Disabling audit logging, syslog, or cloud trail logging |
| Log Enumeration | T1654 | Attacker reads logs to understand defenses and detection gaps |
| Impair Defenses: Indicator Blocking | T1562.006 | Preventing security events from being written to logs |

---

## 2. Core Security Principles

### 2.1 Log Everything Security-Relevant

Every security-meaningful event must generate a log entry. The cost of over-logging is storage;
the cost of under-logging is an undetected breach.

**Mandatory event categories:**
- Authentication events (success, failure, lockout, MFA challenge)
- Authorization failures (access denied, privilege escalation attempts)
- Input validation failures (SQLi attempts, XSS payloads, malformed requests)
- Administrative actions (user creation, role changes, config modifications)
- Data access events (read/write to sensitive resources)
- System events (startup, shutdown, errors, configuration changes)
- API activity (rate limit hits, unusual patterns, deprecated endpoint usage)

### 2.2 Protect Log Integrity

Logs are forensic evidence. If attackers can modify logs, they can erase their tracks.

- Write logs to append-only storage (WORM — Write Once Read Many)
- Use centralized logging — logs leave the compromised system immediately
- Implement cryptographic verification (hash chains, digital signatures)
- Restrict log access — separate log admin role from system admin role
- Monitor for log deletion or modification events (meta-monitoring)
- Synchronize time across all systems using NTP (critical for correlation)

### 2.3 Centralize Logs

Local-only logs are lost when systems are compromised, destroyed, or rotated.

- Ship logs to a centralized, hardened log aggregation system in real time
- Use secure transport (TLS) for log transmission
- Implement buffering and retry logic to prevent log loss during outages
- Maintain geographic redundancy for log storage
- Ensure log pipeline can handle burst traffic (10x normal volume during incidents)

### 2.4 Alert on Anomalies

Logs without alerting are write-only storage — forensically useful only after the fact.

- Define alerting rules for known attack patterns (brute force, privilege escalation)
- Implement anomaly detection for behavioral deviations (unusual time, location, volume)
- Escalate alerts through defined channels (PagerDuty, Slack, email, phone)
- Tune alerts to minimize false positives while maintaining detection coverage
- Test alerting regularly — an alert that has never fired might not work

### 2.5 Retain for Compliance

Different regulations mandate different retention periods:

| Standard | Minimum Retention | Notes |
|----------|-------------------|-------|
| PCI-DSS Req. 10 | 12 months (3 months immediately accessible) | Cardholder data environment |
| SOC 2 | 12 months typical | Depends on trust service criteria |
| HIPAA | 6 years | Audit logs for PHI access |
| GDPR | As long as necessary, but minimize | Balance with data minimization |
| NIST 800-92 | Risk-based, organization-defined | Federal agency guidance |

### 2.6 Never Log Sensitive Data

Logs themselves become a data breach vector if they contain sensitive information.

**NEVER log:**
- Passwords, password hashes, or password reset tokens
- Session tokens, API keys, or authentication credentials
- Credit card numbers (PCI-DSS violation)
- Social Security Numbers or government IDs
- Full PII (use masking: `user email: j***@e***.com`)
- Encryption keys or secrets
- Health information (HIPAA)
- Raw request bodies that may contain any of the above

**ALWAYS log:**
- User ID (not username in sensitive contexts)
- Action performed
- Resource accessed
- Timestamp (ISO 8601, UTC)
- Source IP address
- Request ID / Correlation ID
- Outcome (success/failure)
- Reason for failure

---

## 3. Implementation Patterns

### 3.1 Structured Logging (JSON)

Unstructured text logs are difficult to parse, query, and correlate. Structured JSON logging is
the modern standard.

```typescript
// VULNERABLE: Unstructured logging
console.log(`User ${username} logged in from ${ip} at ${new Date()}`);
// Problems: unparseable, injectable, no correlation, inconsistent format

// SECURE: Structured JSON logging
logger.info({
  event: 'authentication.success',
  userId: user.id,            // Never log username in auth events
  sourceIp: request.ip,
  userAgent: request.headers['user-agent'],
  correlationId: request.id,
  timestamp: new Date().toISOString(),
  metadata: {
    mfaUsed: true,
    loginMethod: 'password',
  }
});
```

**Structured logging advantages:**
- Machine-parseable — enables automated analysis and SIEM ingestion
- Consistent schema — every event has the same queryable fields
- Injection-resistant — JSON serialization escapes control characters
- Correlation-ready — correlation IDs link related events across services
- Filterable — query by event type, severity, user, time range

### 3.2 Security Event Types to Log

```typescript
enum SecurityEventType {
  // Authentication
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILURE = 'auth.login.failure',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_MFA_CHALLENGE = 'auth.mfa.challenge',
  AUTH_MFA_FAILURE = 'auth.mfa.failure',
  AUTH_PASSWORD_CHANGE = 'auth.password.change',
  AUTH_PASSWORD_RESET = 'auth.password.reset',
  AUTH_ACCOUNT_LOCKED = 'auth.account.locked',
  AUTH_TOKEN_REFRESH = 'auth.token.refresh',

  // Authorization
  AUTHZ_ACCESS_DENIED = 'authz.access.denied',
  AUTHZ_PRIVILEGE_ESCALATION = 'authz.privilege.escalation',
  AUTHZ_ROLE_CHANGE = 'authz.role.change',

  // Data Access
  DATA_READ_SENSITIVE = 'data.read.sensitive',
  DATA_EXPORT = 'data.export',
  DATA_DELETE = 'data.delete',
  DATA_BULK_ACCESS = 'data.bulk.access',

  // Input Validation
  INPUT_VALIDATION_FAILURE = 'input.validation.failure',
  INPUT_SQLI_ATTEMPT = 'input.sqli.attempt',
  INPUT_XSS_ATTEMPT = 'input.xss.attempt',

  // System
  SYSTEM_CONFIG_CHANGE = 'system.config.change',
  SYSTEM_ADMIN_ACTION = 'system.admin.action',
  SYSTEM_ERROR = 'system.error',
  SYSTEM_STARTUP = 'system.startup',
  SYSTEM_SHUTDOWN = 'system.shutdown',

  // API
  API_RATE_LIMIT_HIT = 'api.rate_limit.hit',
  API_KEY_CREATED = 'api.key.created',
  API_KEY_REVOKED = 'api.key.revoked',
}
```

### 3.3 Centralized Logging Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  App Server  │  │  App Server  │  │  App Server  │
│  (Pino/      │  │  (Winston/   │  │  (Python     │
│   Winston)   │  │   Bunyan)    │  │   logging)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │    Secure Transport (TLS)         │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────┐
│         Log Aggregator / Shipper             │
│    (Fluentd / Fluent Bit / Filebeat /        │
│     CloudWatch Agent / Vector)               │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│         Central Log Store / SIEM             │
│    (Elasticsearch / Splunk / Sentinel /      │
│     CloudWatch Logs / GCP Cloud Logging)     │
├──────────────────────────────────────────────┤
│  Alerting Engine    │  Dashboards            │
│  (ElastAlert /      │  (Kibana / Grafana /   │
│   Splunk Alerts /   │   Sentinel Workbooks)  │
│   CloudWatch        │                        │
│   Alarms)           │                        │
├─────────────────────┴────────────────────────┤
│  Long-Term Archive (S3 / GCS / Azure Blob)   │
│  WORM / Immutable Storage                    │
└──────────────────────────────────────────────┘
```

### 3.4 SIEM Integration

**Key SIEM platforms and their strengths:**

| Platform | Strengths | Best For |
|----------|-----------|----------|
| Splunk | Mature, powerful SPL query language, extensive app ecosystem | Large enterprises |
| Microsoft Sentinel | Native Azure/M365 integration, KQL, built-in SOAR | Azure-centric orgs |
| Elastic SIEM | Open-source core, prebuilt detection rules, ECS schema | Cost-conscious teams |
| Google Chronicle | Petabyte-scale, YARA-L rules, VirusTotal integration | Google Cloud orgs |
| Datadog Security | APM + security unified, cloud-native | DevSecOps teams |

**Detection rule categories:**
- **Threshold rules:** Alert when event count exceeds N in time window T
- **Correlation rules:** Alert when multiple related events occur in sequence
- **Anomaly rules:** Alert on statistical deviation from baseline behavior
- **Indicator rules:** Alert on known IOCs (IPs, domains, file hashes)

### 3.5 Alerting Rules — Examples

```yaml
# Example: Brute force detection rule (SIEM-agnostic pseudo-config)
- rule: brute_force_detection
  description: "Detect brute force login attempts"
  condition:
    event_type: "auth.login.failure"
    threshold: 10
    window: "5m"
    group_by: ["sourceIp", "targetUserId"]
  severity: high
  actions:
    - notify: security-team-slack
    - notify: pagerduty-oncall
    - enrich: geoip-lookup
    - auto_respond: block-ip-30m

- rule: privilege_escalation
  description: "Detect unauthorized privilege escalation"
  condition:
    event_type: "authz.role.change"
    where: "actor.role != 'admin'"
  severity: critical
  actions:
    - notify: security-team-slack
    - notify: pagerduty-oncall
    - create_incident: true

- rule: impossible_travel
  description: "Login from geographically impossible locations"
  condition:
    event_type: "auth.login.success"
    where: "geo_distance(prev_login.location, current.location) / time_diff > 1000 km/h"
  severity: high
  actions:
    - notify: security-team-slack
    - force_mfa: true

- rule: off_hours_admin
  description: "Administrative action outside business hours"
  condition:
    event_type: "system.admin.action"
    where: "hour(timestamp) NOT BETWEEN 6 AND 22"
  severity: medium
  actions:
    - notify: security-team-slack

- rule: data_exfiltration
  description: "Unusually large data export"
  condition:
    event_type: "data.export"
    where: "record_count > baseline_avg * 10"
  severity: critical
  actions:
    - notify: security-team-slack
    - notify: pagerduty-oncall
    - auto_respond: suspend-api-key
```

### 3.6 Correlation IDs

Every request entering the system should receive a unique correlation ID that propagates through
all downstream service calls. This enables reconstructing the full request path during incident
investigation.

```typescript
// Middleware: Assign or propagate correlation ID
function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'] as string
    || req.headers['x-request-id'] as string
    || crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Attach to async context for automatic propagation
  asyncLocalStorage.run({ correlationId }, () => next());
}
```

### 3.7 Honeypots and Canary Tokens

Deception technology creates high-fidelity detection signals with near-zero false positive rates.

**Canary tokens (Thinkst Canary):**
- Embed tripwire files in sensitive directories (fake AWS credentials, documents)
- Any access triggers an immediate alert — legitimate users have no reason to touch them
- Zero infrastructure overhead, no tuning required
- Types: DNS tokens, HTTP tokens, document tokens, AWS key tokens, SQL tokens

**Application-level honeypots:**
```typescript
// Honey endpoint — no legitimate user should ever call this
app.all('/admin/debug/console', (req, res) => {
  securityLogger.critical({
    event: 'honeypot.triggered',
    path: '/admin/debug/console',
    sourceIp: req.ip,
    headers: sanitizeHeaders(req.headers),
    correlationId: req.correlationId,
  });

  // Alert immediately — this is ALWAYS malicious
  alertSecurityTeam('HONEYPOT TRIGGERED', { ip: req.ip, path: req.path });

  // Return believable response to keep attacker engaged
  res.status(403).json({ error: 'Insufficient privileges' });
});

// Honey database record — triggers alert when queried
// Insert fake admin account "sysadmin_backup" that no real query should ever retrieve
// Monitor: SELECT queries returning this record indicate unauthorized data access
```

---

## 4. Vulnerability Catalog

### V1: No Authentication Event Logging

**CWE-778: Insufficient Logging**
**Severity: HIGH**

```typescript
// VULNERABLE: No logging of authentication events
async function login(username: string, password: string): Promise<User> {
  const user = await db.findUser(username);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    throw new UnauthorizedError('Invalid credentials');
  }
  return user;
}

// SECURE: Comprehensive authentication logging
async function login(username: string, password: string, req: Request): Promise<User> {
  const user = await db.findUser(username);
  if (!user) {
    securityLogger.warn({
      event: SecurityEventType.AUTH_LOGIN_FAILURE,
      reason: 'user_not_found',
      attemptedUsername: username,   // OK to log username for failed lookups
      sourceIp: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!await bcrypt.compare(password, user.passwordHash)) {
    securityLogger.warn({
      event: SecurityEventType.AUTH_LOGIN_FAILURE,
      reason: 'invalid_password',
      userId: user.id,              // Log user ID, NOT the attempted password
      sourceIp: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      failedAttempts: user.failedLoginAttempts + 1,
    });

    await db.incrementFailedAttempts(user.id);
    if (user.failedLoginAttempts + 1 >= MAX_ATTEMPTS) {
      await db.lockAccount(user.id);
      securityLogger.warn({
        event: SecurityEventType.AUTH_ACCOUNT_LOCKED,
        userId: user.id,
        sourceIp: req.ip,
        correlationId: req.correlationId,
      });
    }
    throw new UnauthorizedError('Invalid credentials');
  }

  securityLogger.info({
    event: SecurityEventType.AUTH_LOGIN_SUCCESS,
    userId: user.id,
    sourceIp: req.ip,
    userAgent: req.headers['user-agent'],
    correlationId: req.correlationId,
    mfaUsed: false,
  });

  return user;
}
```

### V2: PII / Sensitive Data in Logs

**CWE-532: Insertion of Sensitive Information into Log File**
**Severity: HIGH**

```typescript
// VULNERABLE: Logging sensitive data
logger.info(`User registered: ${JSON.stringify(user)}`);
// Logs: {"name":"John","email":"john@example.com","ssn":"123-45-6789","password":"secret"}

logger.debug(`Payment processed: card=${cardNumber}, amount=${amount}`);
// Logs full credit card number — PCI-DSS violation

logger.error(`Auth failed for token: ${authToken}`);
// Logs the authentication token — attacker reading logs gains access

// SECURE: Sanitized logging with PII redaction
logger.info({
  event: 'user.registered',
  userId: user.id,
  email: maskEmail(user.email),     // j***@e***.com
});

logger.info({
  event: 'payment.processed',
  userId: user.id,
  cardLast4: cardNumber.slice(-4),  // Only last 4 digits
  amount: amount,
  currency: 'USD',
});
```

### V3: Log Injection (CWE-117)

**CWE-117: Improper Output Neutralization for Logs**
**Severity: MEDIUM**

```typescript
// VULNERABLE: Log injection via CRLF
const username = req.body.username;
logger.info(`Login attempt for user: ${username}`);
// Attacker sends: "admin\n2026-03-08 INFO Login successful for user: admin"
// Forges a fake "successful login" log entry

// VULNERABLE: Log injection via format strings
logger.info(`Search query: ${userInput}`);
// Attacker sends input containing format specifiers or control characters

// SECURE: Structured logging prevents injection
logger.info({
  event: 'auth.login.attempt',
  username: username,  // JSON serialization escapes \n, \r, etc.
  sourceIp: req.ip,
});

// SECURE: Explicit sanitization for text loggers
function sanitizeForLog(input: string): string {
  return input
    .replace(/[\r\n]/g, ' ')          // Remove CRLF
    .replace(/[\x00-\x1f\x7f]/g, '')  // Remove control characters
    .substring(0, 1000);               // Limit length
}
```

### V4: Logs Not Centralized

**Severity: HIGH**

When logs exist only on application servers, a compromised server means compromised logs.
Attackers routinely clear local logs (MITRE ATT&CK T1070.001) to cover their tracks.

**Impact:** Complete loss of forensic evidence after system compromise.
**Fix:** Ship logs in real time via Fluentd/Fluent Bit/Filebeat to a centralized system
with separate access controls.

### V5: No Alerting on Security Events

**Severity: CRITICAL**

Logs without alerts are forensic-only — useful after the breach, not during it.
The Equifax breach went undetected for 76 days despite logs existing.

**Fix:** Define alert rules for all critical security events. Test alerts regularly.
Ensure the alerting pipeline is monitored for failures.

### V6: Insufficient Log Retention

**Severity: MEDIUM**

If logs are rotated before an investigation begins, evidence is permanently lost.
The average breach takes 194 days to detect — 30-day log retention means 164 days of lost data.

**Fix:** Retain logs for at least 12 months (PCI-DSS) with 90 days immediately searchable.
Archive older logs to cold storage (S3 Glacier, GCS Coldline).

### V7: Log Tampering Possible

**Severity: HIGH**

If application processes can delete or modify their own logs, so can an attacker who
compromises the application.

**Fix:** Write logs to append-only storage. Use separate credentials for log writing
vs. log deletion. Enable log file integrity monitoring (AIDE, OSSEC, Tripwire).

### V8: Missing Correlation IDs

**Severity: MEDIUM**

Without correlation IDs, it is impossible to trace a single request across multiple
microservices during incident investigation.

**Fix:** Generate a UUID at the API gateway / entry point. Propagate via
`X-Correlation-ID` header. Include in every log entry.

### V9: Verbose Error Logging Exposing Internals

**CWE-209: Generation of Error Message Containing Sensitive Information**
**Severity: MEDIUM**

```typescript
// VULNERABLE: Stack trace with internals exposed in logs accessible to monitoring
logger.error(`Database error: ${err.stack}`);
// May contain: connection strings, table names, query parameters, file paths

// SECURE: Structured error logging with controlled detail
logger.error({
  event: 'system.error',
  errorCode: 'DB_CONNECTION_FAILED',
  errorMessage: err.message,         // Generic message only
  correlationId: req.correlationId,
  // Store full stack trace only in secure, access-controlled debug logs
});
```

### V10: No Rate Limit Monitoring

**Severity: MEDIUM**

API rate limiting without logging means brute force and enumeration attacks go unnoticed.

**Fix:** Log every rate limit event. Alert when a single source triggers rate limits
across multiple endpoints (reconnaissance pattern).

### V11: Clock Skew Between Systems

**Severity: MEDIUM**

If servers have unsynchronized clocks, log correlation becomes unreliable.
Event ordering during incident reconstruction fails.

**Fix:** Use NTP on all systems. Log timestamps in UTC ISO 8601 format.
Monitor NTP drift — alert if skew exceeds 1 second.

### V12: Logging Disabled in Production

**Severity: CRITICAL**

Some teams disable debug/info logging in production for performance, inadvertently
disabling security event logging.

**Fix:** Use log levels correctly. Security events should be INFO or WARN level,
never DEBUG. Security logging must never be disabled regardless of environment.

### V13: No Monitoring of the Monitoring System

**Severity: HIGH**

The Equifax breach demonstrates this perfectly — when the monitoring tool fails,
no one notices.

**Fix:** Implement heartbeat monitoring for log pipelines. Alert when expected
log volume drops below threshold (dead man's switch / watchdog timer).

---

## 5. Security Checklist

### Logging Configuration
- [ ] All authentication events logged (success, failure, lockout, MFA)
- [ ] All authorization failures logged with user context
- [ ] All administrative actions logged with before/after state
- [ ] Input validation failures logged (including suspected attack payloads, sanitized)
- [ ] System lifecycle events logged (startup, shutdown, config changes)
- [ ] API rate limit events logged
- [ ] Data access to sensitive resources logged
- [ ] Structured JSON format used (not unstructured text)
- [ ] Correlation IDs assigned at entry point and propagated

### Data Protection
- [ ] No passwords, tokens, or API keys in logs (verified by automated scan)
- [ ] No PII in logs without masking (email, SSN, phone, address)
- [ ] No credit card numbers in logs (PCI-DSS violation)
- [ ] Log sanitization applied to all user-controlled input (CWE-117 prevention)
- [ ] Error messages do not expose stack traces or internal paths

### Infrastructure
- [ ] Logs shipped to centralized system in real time (not local-only)
- [ ] Log transport encrypted (TLS)
- [ ] Log storage uses append-only / immutable configuration
- [ ] Log access restricted to authorized personnel only (separate from app admin)
- [ ] Time synchronization (NTP) configured on all systems
- [ ] Log pipeline monitored for failures (dead man's switch)

### Alerting & Response
- [ ] Alerting rules defined for brute force, privilege escalation, data exfiltration
- [ ] Alert escalation path defined (Slack -> PagerDuty -> phone)
- [ ] Alerts tested regularly (at least monthly)
- [ ] False positive rate tracked and alert rules tuned quarterly
- [ ] Honeypot endpoints / canary tokens deployed

### Compliance & Retention
- [ ] Log retention meets regulatory requirements (12 months for PCI-DSS)
- [ ] 90 days of logs immediately searchable
- [ ] Log archival to cold storage configured with lifecycle policies
- [ ] Log access audit trail maintained (who accessed which logs)
- [ ] Compliance dashboard showing logging coverage gaps

---

## 6. Tools & Automation

### SIEM & Log Management

| Tool | Type | Key Features |
|------|------|-------------|
| **Splunk Enterprise** | Commercial SIEM | SPL query language, 1000+ apps, ML Toolkit |
| **Microsoft Sentinel** | Cloud SIEM | Native Azure/M365, KQL, built-in SOAR, threat intelligence |
| **Elastic SIEM** | Open-core SIEM | ECS schema, prebuilt detection rules, ML anomaly detection |
| **Google Chronicle** | Cloud SIEM | Petabyte-scale, YARA-L, VirusTotal integration |
| **Datadog Security** | Cloud monitoring | APM + Security unified, cloud-native, real-time |

### Log Shippers & Aggregators

| Tool | Language | Best For |
|------|----------|----------|
| **Fluentd** | Ruby/C | Kubernetes-native, CNCF graduated, plugin ecosystem |
| **Fluent Bit** | C | Lightweight, embedded/edge, low resource usage |
| **Filebeat** | Go | Elastic ecosystem, lightweight, modules for common apps |
| **Vector** | Rust | High performance, observability pipelines, transform capabilities |
| **AWS CloudWatch Agent** | Go | AWS-native, unified metrics + logs |

### Cloud-Native Security Logging

**AWS:**
- **CloudTrail** — API activity logging for all AWS services
- **GuardDuty** — ML-based threat detection analyzing CloudTrail, VPC Flow Logs, DNS logs
- **CloudWatch Logs** — Centralized log storage with Insights query language
- **Security Hub** — Aggregates findings from GuardDuty, Inspector, Macie
- **Config** — Resource configuration change logging and compliance

**GCP:**
- **Cloud Audit Logs** — Admin activity, data access, system event, policy denied logs
- **Security Command Center (SCC)** — Centralized security and risk management
- **Cloud Logging** — Centralized log storage with query language
- **Chronicle** — Enterprise-scale SIEM

**Azure:**
- **Azure Monitor Logs** — Centralized log analytics with KQL
- **Microsoft Sentinel** — Cloud-native SIEM + SOAR
- **Azure Activity Log** — Subscription-level operation logging
- **Defender for Cloud** — Unified security management

### Runtime Security & Host-Based Detection

| Tool | Type | Key Features |
|------|------|-------------|
| **Falco** | Runtime security | eBPF-based, CNCF incubating, Kubernetes-native, syscall monitoring |
| **OSSEC** | HIDS | Log analysis, file integrity, rootkit detection, active response |
| **Wazuh** | XDR/SIEM | OSSEC fork, container security, compliance dashboards, Kubernetes audit |
| **Osquery** | Endpoint | SQL-based system queries, fleet management |

### Deception Technology

| Tool | Type | Key Features |
|------|------|-------------|
| **Thinkst Canary** | Honeypot platform | Hardware/cloud canaries, canarytokens.org (free), near-zero FP rate |
| **Canarytokens.org** | Free canary tokens | DNS, HTTP, AWS key, document, SQL tokens |

---

## 7. Platform-Specific Guidance

### 7.1 Node.js — Pino (Recommended for Performance)

```typescript
import pino from 'pino';

// Production security logger configuration
const securityLogger = pino({
  name: 'security',
  level: 'info',
  // JSON output by default (NDJSON)
  formatters: {
    level(label: string) {
      return { level: label };  // Use string labels, not numeric levels
    },
  },
  // Redact sensitive fields automatically
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
    ],
    censor: '[REDACTED]',
  },
  // Serializers for consistent formatting
  serializers: {
    req: pino.stdSerializers.req,
    err: pino.stdSerializers.err,
  },
  // Ship to centralized logging
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: { destination: '/var/log/app/security.log' },
      },
      {
        target: 'pino-socket',  // Real-time log shipping
        options: { address: 'logstash.internal', port: 5044, mode: 'tcp' },
      },
    ],
  },
});

// Usage with child loggers for context propagation
function createRequestLogger(req: Request): pino.Logger {
  return securityLogger.child({
    correlationId: req.correlationId,
    sourceIp: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
  });
}
```

### 7.2 Node.js — Winston (Recommended for Flexibility)

```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: false }),  // No stack traces in security logs
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Local file (backup)
    new winston.transports.File({
      filename: '/var/log/app/security.log',
      maxsize: 100 * 1024 * 1024,  // 100MB rotation
      maxFiles: 10,
    }),
    // Centralized logging (primary)
    new winston.transports.Http({
      host: 'logstash.internal',
      port: 8080,
      ssl: true,
    }),
  ],
});

// NEVER log to console in production (performance + potential injection)
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }));
}
```

### 7.3 Python — Standard Logging Module

```python
import logging
import json
import re
from datetime import datetime, timezone

class SecurityJsonFormatter(logging.Formatter):
    """JSON formatter with PII redaction for security logs."""

    PII_PATTERNS = {
        'email': re.compile(r'[\w.-]+@[\w.-]+\.\w+'),
        'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
        'credit_card': re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'event': getattr(record, 'event', record.msg),
            'logger': record.name,
            'correlation_id': getattr(record, 'correlation_id', None),
        }

        # Merge extra fields
        if hasattr(record, 'security_context'):
            log_entry.update(record.security_context)

        # Sanitize all string values
        log_entry = self._sanitize(log_entry)
        return json.dumps(log_entry, default=str)

    def _sanitize(self, data: dict) -> dict:
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                for pii_type, pattern in self.PII_PATTERNS.items():
                    value = pattern.sub(f'[REDACTED-{pii_type.upper()}]', value)
            elif isinstance(value, dict):
                value = self._sanitize(value)
            sanitized[key] = value
        return sanitized


# Configuration
security_logger = logging.getLogger('security')
security_logger.setLevel(logging.INFO)

handler = logging.FileHandler('/var/log/app/security.log')
handler.setFormatter(SecurityJsonFormatter())
security_logger.addHandler(handler)

# Usage
security_logger.info(
    'auth.login.success',
    extra={
        'event': 'auth.login.success',
        'correlation_id': request_id,
        'security_context': {
            'user_id': user.id,
            'source_ip': request.remote_addr,
            'mfa_used': True,
        }
    }
)
```

### 7.4 Kubernetes Logging

```yaml
# Kubernetes audit policy — log security-relevant API server events
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all authentication failures at RequestResponse level
  - level: RequestResponse
    users: ["system:anonymous"]
    resources:
      - group: ""
        resources: ["*"]

  # Log all changes to RBAC resources
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Log Secret access
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]

  # Log pod exec (potential container escape)
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach"]

  # Log service account token requests
  - level: Metadata
    resources:
      - group: ""
        resources: ["serviceaccounts/token"]

  # Default: log metadata for all other requests
  - level: Metadata
```

```yaml
# Falco rule — detect sensitive file access in containers
- rule: Read sensitive file in container
  desc: Detect reading of sensitive files within a container
  condition: >
    open_read and container and
    (fd.name startswith /etc/shadow or
     fd.name startswith /etc/passwd or
     fd.name startswith /root/.ssh or
     fd.name startswith /run/secrets)
  output: >
    Sensitive file read in container
    (user=%user.name file=%fd.name container=%container.name
     image=%container.image.repository command=%proc.cmdline)
  priority: WARNING
  tags: [filesystem, mitre_credential_access]

- rule: Unexpected outbound connection
  desc: Detect unexpected outbound network connections from containers
  condition: >
    outbound and container and
    not (fd.sport in (80, 443, 53, 8080, 8443)) and
    not proc.name in (allowed_outbound_procs)
  output: >
    Unexpected outbound connection from container
    (user=%user.name command=%proc.cmdline connection=%fd.name
     container=%container.name image=%container.image.repository)
  priority: NOTICE
  tags: [network, mitre_exfiltration]
```

### 7.5 Container Logging Best Practices

- Log to **stdout/stderr** (not files) — let the container runtime handle collection
- Use a **sidecar pattern** or **DaemonSet** (Fluent Bit) for log collection
- Include **container metadata** in every log entry (pod name, namespace, image, node)
- Set log **size limits** to prevent disk exhaustion attacks via log flooding
- Never store secrets in container environment variables that get logged on crash

---

## 8. Incident Patterns — Log-Based Detection

### 8.1 Attack Timeline Reconstruction

When investigating a security incident, logs enable building a forensic timeline.

**Reconstruction process:**
1. **Identify the indicator** — Alert trigger, anomalous event, or external report
2. **Establish pivot points** — Find the correlation ID, user ID, source IP, or session
3. **Expand the timeline** — Search for all events from that pivot in a +/- 24h window
4. **Trace lateral movement** — Follow the actor across systems via correlation IDs
5. **Identify the entry point** — Work backward from the first malicious action
6. **Determine scope** — What data/systems were accessed during the attack window
7. **Establish containment** — Verify no further malicious activity after response

```
# Example: Reconstructing a credential stuffing attack

# Step 1: Alert fires — brute force detection
2026-03-08T14:32:00Z ALERT brute_force_detection sourceIp=203.0.113.42 failures=47 window=5m

# Step 2: Pivot on source IP — show all activity
2026-03-08T14:28:12Z auth.login.failure userId=1042 sourceIp=203.0.113.42
2026-03-08T14:28:13Z auth.login.failure userId=8391 sourceIp=203.0.113.42
... (45 more failures across different userIds)
2026-03-08T14:31:44Z auth.login.success userId=5573 sourceIp=203.0.113.42  # <-- BREACH
2026-03-08T14:31:45Z auth.login.success userId=12904 sourceIp=203.0.113.42 # <-- BREACH

# Step 3: Pivot on compromised users — what did they do?
2026-03-08T14:31:50Z data.read.sensitive userId=5573 resource=/api/profile
2026-03-08T14:31:52Z auth.password.change userId=5573 sourceIp=203.0.113.42  # Persistence
2026-03-08T14:32:01Z data.export userId=5573 resource=/api/transactions count=2847

# Step 4: Scope — 2 accounts compromised, 1 had data exported
# Step 5: Response — block IP, reset passwords, revoke sessions, notify users
```

### 8.2 Common Detection Patterns

| Pattern | Indicators in Logs | Severity |
|---------|-------------------|----------|
| **Credential Stuffing** | Many auth failures across different usernames from same IP | High |
| **Account Takeover** | Login success after multiple failures, followed by password change | Critical |
| **Privilege Escalation** | Role change or admin action by non-admin user | Critical |
| **Data Exfiltration** | Bulk data export, unusual download volume, off-hours access | Critical |
| **API Abuse** | Rate limit hits, enumeration patterns, parameter fuzzing | High |
| **Insider Threat** | Access to resources outside job function, off-hours bulk access | High |
| **Lateral Movement** | Authentication from internal IP not associated with user's workstation | High |
| **Reconnaissance** | 404 errors across many paths, sequential resource ID access | Medium |
| **Log Tampering** | Log gaps, timestamp inconsistencies, log service restarts | Critical |

### 8.3 Forensic Log Analysis

**Key forensic questions logs must answer:**
- **Who?** — User ID, service account, API key identity
- **What?** — Action performed, resource accessed, data volume
- **When?** — Precise timestamp (millisecond resolution, UTC)
- **Where?** — Source IP, geographic location, device fingerprint
- **How?** — Authentication method, API endpoint, client tool
- **Outcome?** — Success/failure, error code, response size

**Log integrity for legal proceedings:**
- Logs may be required as evidence in legal or regulatory proceedings
- Chain of custody must be maintained — who accessed logs, when
- Hash verification proves logs have not been tampered with
- Time synchronization proves event ordering is accurate
- Centralized, immutable storage proves completeness

---

## 9. Compliance & Standards

### 9.1 OWASP A09:2021 — Security Logging and Monitoring Failures

**Requirements:**
- All login, access control, and input validation failures logged with sufficient context
- Logs generated in a format easily consumed by log management solutions
- High-value transactions have audit trail with integrity controls
- Effective monitoring and alerting established to detect suspicious activity in timely fashion
- Incident response and recovery plan exists

**Testing guidance:**
- Review application for insufficient logging, monitoring, and alerting
- Test if log entries include adequate detail to identify attacker activity
- Confirm logs are sent to centralized management and not just stored locally

### 9.2 NIST SP 800-92 — Guide to Computer Security Log Management

**Key recommendations:**
- Establish log management policies defining what to log, retention, and roles
- Prioritize log management based on risk assessment
- Create and maintain log management infrastructure
- Establish standard log management operational processes
- Perform log analysis (review, correlation, long-term analysis)
- Initial response to identified threats based on log analysis

NIST SP 800-92 Rev. 1 (2023 draft) adds emphasis on:
- Cloud-native logging considerations
- Zero trust architecture logging requirements
- Automation of log analysis and response
- Supply chain log integrity

### 9.3 PCI-DSS v4.0 Requirement 10

**Requirement 10: Log and Monitor All Access to System Components and Cardholder Data**

| Sub-Requirement | Description |
|-----------------|-------------|
| 10.1 | Processes and mechanisms for logging and monitoring are defined and documented |
| 10.2 | Audit logs are implemented to support detection of anomalies and suspicious activity |
| 10.3 | Audit logs are protected from destruction and unauthorized modifications |
| 10.4 | Audit logs are reviewed to identify anomalies or suspicious activity |
| 10.5 | Audit log history is retained and available for analysis |
| 10.6 | Time-synchronization mechanisms support consistent time across all systems |
| 10.7 | Failures of critical security control systems are detected, reported, and responded to |

**Specific logging requirements:**
- All individual user access to cardholder data
- All actions taken by any individual with root or administrative privileges
- Access to all audit trails
- Invalid logical access attempts
- Use of and changes to identification and authentication mechanisms
- Initialization, stopping, or pausing of the audit logs
- Creation and deletion of system-level objects
- Retain audit trail history for at least 12 months, with minimum 3 months immediately available

### 9.4 SOC 2 Logging Controls

SOC 2 Trust Service Criteria relevant to logging:

- **CC6.1** — Logical access security over information assets
- **CC6.8** — Controls to prevent or detect unauthorized software
- **CC7.1** — Detection and monitoring procedures for new vulnerabilities
- **CC7.2** — Monitoring of system components for anomalies
- **CC7.3** — Evaluation of security events to determine if they are incidents
- **CC7.4** — Incident response procedures

### 9.5 GDPR Logging Requirements

GDPR creates a tension between logging (for security) and data minimization (for privacy):

- **Article 5(1)(f)** — Appropriate security measures including logging
- **Article 30** — Records of processing activities
- **Article 33** — Breach notification within 72 hours (requires detection capability)
- **Article 32** — Ability to restore availability and access to data in timely manner

**GDPR-compliant logging guidelines:**
- Log access to personal data for accountability
- Do NOT log personal data content in log messages
- Apply retention limits to logs containing personal data identifiers
- Document the legal basis for logging (legitimate interest — security)
- Include logging in your Records of Processing Activities (ROPA)
- Pseudonymize user identifiers in logs where possible

---

## 10. Code Examples

### 10.1 Complete Structured Security Logger (TypeScript)

```typescript
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Types
interface SecurityEvent {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sourceIp?: string;
  resource?: string;
  outcome: 'success' | 'failure';
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface RequestContext {
  correlationId: string;
  userId?: string;
  sourceIp?: string;
  sessionId?: string;
}

// Async context storage for automatic correlation ID propagation
const asyncContext = new AsyncLocalStorage<RequestContext>();

// PII patterns for automatic redaction
const PII_PATTERNS: Record<string, RegExp> = {
  email: /[\w.-]+@[\w.-]+\.\w+/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  jwt: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
};

function redactPII(value: string): string {
  let redacted = value;
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, `[REDACTED:${type}]`);
  }
  return redacted;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '[INVALID_EMAIL]';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

// Create the base logger
const baseLogger = pino({
  name: 'security-audit',
  level: 'info',
  redact: {
    paths: [
      'password', 'token', 'secret', 'apiKey', 'authorization',
      'cookie', 'creditCard', 'ssn', 'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) { return { level: label }; },
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});

// Security logger with context enrichment
export const securityLogger = {
  log(event: SecurityEvent): void {
    const ctx = asyncContext.getStore();
    const enrichedEvent = {
      ...event,
      correlationId: ctx?.correlationId,
      userId: event.userId || ctx?.userId,
      sourceIp: event.sourceIp || ctx?.sourceIp,
      service: process.env.SERVICE_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
    };

    const level = event.severity === 'critical' || event.severity === 'high'
      ? 'warn' : 'info';

    baseLogger[level](enrichedEvent);
  },

  authSuccess(userId: string, method: string, mfaUsed: boolean): void {
    this.log({
      event: 'auth.login.success',
      severity: 'low',
      userId,
      outcome: 'success',
      metadata: { method, mfaUsed },
    });
  },

  authFailure(userId: string | undefined, reason: string): void {
    this.log({
      event: 'auth.login.failure',
      severity: 'medium',
      userId,
      outcome: 'failure',
      reason,
    });
  },

  accessDenied(userId: string, resource: string, action: string): void {
    this.log({
      event: 'authz.access.denied',
      severity: 'high',
      userId,
      resource,
      outcome: 'failure',
      reason: `unauthorized_${action}`,
    });
  },

  dataAccess(userId: string, resource: string, recordCount?: number): void {
    this.log({
      event: 'data.access',
      severity: recordCount && recordCount > 100 ? 'high' : 'low',
      userId,
      resource,
      outcome: 'success',
      metadata: { recordCount },
    });
  },

  adminAction(userId: string, action: string, target: string): void {
    this.log({
      event: 'system.admin.action',
      severity: 'high',
      userId,
      outcome: 'success',
      metadata: { action, target },
    });
  },

  honeypotTriggered(path: string): void {
    this.log({
      event: 'honeypot.triggered',
      severity: 'critical',
      resource: path,
      outcome: 'failure',
      reason: 'deception_triggered',
    });
  },

  // Expose async context for middleware
  runWithContext<T>(ctx: RequestContext, fn: () => T): T {
    return asyncContext.run(ctx, fn);
  },
};
```

### 10.2 Audit Trail Middleware (Express)

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { securityLogger } from './security-logger';

// Assign correlation ID and establish security context
export function securityContextMiddleware(
  req: Request, res: Response, next: NextFunction
): void {
  const correlationId = (req.headers['x-correlation-id'] as string)
    || (req.headers['x-request-id'] as string)
    || crypto.randomUUID();

  res.setHeader('x-correlation-id', correlationId);

  const ctx = {
    correlationId,
    userId: req.user?.id,
    sourceIp: req.ip || req.socket.remoteAddress || 'unknown',
    sessionId: req.sessionID,
  };

  securityLogger.runWithContext(ctx, () => next());
}

// Log all requests with security context
export function auditTrailMiddleware(
  req: Request, res: Response, next: NextFunction
): void {
  const startTime = Date.now();

  // Capture response
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log security-relevant requests
    if (isSecurityRelevant(req, statusCode)) {
      securityLogger.log({
        event: 'http.request',
        severity: statusCode >= 400 ? 'medium' : 'low',
        userId: req.user?.id,
        sourceIp: req.ip,
        resource: `${req.method} ${req.route?.path || req.path}`,
        outcome: statusCode < 400 ? 'success' : 'failure',
        metadata: {
          method: req.method,
          path: req.path,            // Actual path
          route: req.route?.path,    // Route pattern (no params)
          statusCode,
          duration,
          contentLength: res.getHeader('content-length'),
          userAgent: req.headers['user-agent'],
        },
      });
    }

    return originalEnd.apply(res, args);
  } as any;

  next();
}

function isSecurityRelevant(req: Request, statusCode: number): boolean {
  // Always log: auth endpoints, admin routes, errors, sensitive data access
  return (
    req.path.startsWith('/auth') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/users') ||
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode >= 500 ||
    req.method !== 'GET'  // All mutations
  );
}
```

### 10.3 Log Sanitization — PII Redaction Middleware

```typescript
import pino from 'pino';

// Custom Pino transport that redacts PII before writing
export function createSanitizingTransport(): pino.TransportSingleOptions {
  return {
    target: './pii-redaction-transport',
    options: {
      destination: '/var/log/app/security.log',
      sensitiveKeys: [
        'password', 'token', 'secret', 'apiKey', 'authorization',
        'cookie', 'ssn', 'creditCard', 'dateOfBirth',
      ],
      piiPatterns: {
        email: { pattern: '[\\w.-]+@[\\w.-]+\\.\\w+', replacement: '[EMAIL]' },
        ssn: { pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', replacement: '[SSN]' },
        creditCard: { pattern: '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b', replacement: '[CC]' },
      },
    },
  };
}

// Synchronous PII scrubber for log objects (defense in depth)
export function scrubLogObject(obj: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = new Set([
    'password', 'passwd', 'pwd', 'secret', 'token', 'apikey',
    'api_key', 'authorization', 'auth', 'cookie', 'session',
    'ssn', 'social_security', 'credit_card', 'creditcard', 'cvv',
    'card_number', 'private_key', 'privatekey',
  ]);

  const scrubbed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(lowerKey)) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      scrubbed[key] = redactPIIFromString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      scrubbed[key] = scrubLogObject(value as Record<string, unknown>);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

function redactPIIFromString(value: string): string {
  return value
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CC]')
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]');
}
```

### 10.4 CloudTrail Analysis — Detect Suspicious AWS Activity

```python
"""
Analyze CloudTrail logs for suspicious AWS activity patterns.
Intended for Lambda function triggered by CloudWatch Events.
"""
import json
import boto3
from datetime import datetime, timezone

sns_client = boto3.client('sns')
ALERT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789:security-alerts'

# High-risk events that should always trigger alerts
CRITICAL_EVENTS = {
    'ConsoleLogin',                    # Root or unusual console login
    'StopLogging',                     # CloudTrail disabled — evasion
    'DeleteTrail',                     # CloudTrail deleted — evasion
    'PutBucketPolicy',                 # S3 bucket policy change
    'AuthorizeSecurityGroupIngress',   # Security group opened
    'CreateAccessKey',                 # New access key — persistence
    'AttachUserPolicy',                # IAM policy change — escalation
    'AttachRolePolicy',                # IAM role change — escalation
    'PutRolePolicy',                   # Inline policy — escalation
    'CreateUser',                      # New IAM user — persistence
    'DeleteFlowLogs',                  # VPC flow logs deleted — evasion
    'DisableKey',                      # KMS key disabled — impact
}

# Events indicating potential reconnaissance
RECON_EVENTS = {
    'DescribeInstances', 'ListBuckets', 'GetBucketAcl',
    'ListUsers', 'ListRoles', 'ListAccessKeys',
    'DescribeSecurityGroups', 'GetCallerIdentity',
}


def handler(event: dict, context) -> dict:
    """Process CloudTrail event from CloudWatch Events."""
    detail = event.get('detail', {})
    event_name = detail.get('eventName', '')
    user_identity = detail.get('userIdentity', {})
    source_ip = detail.get('sourceIPAddress', '')
    user_agent = detail.get('userAgent', '')
    event_time = detail.get('eventTime', '')

    # CRITICAL: CloudTrail logging being disabled
    if event_name in ('StopLogging', 'DeleteTrail', 'DeleteFlowLogs'):
        alert(
            severity='CRITICAL',
            title=f'Logging evasion detected: {event_name}',
            detail=detail,
        )
        return {'action': 'alert_sent', 'severity': 'critical'}

    # Root account usage (should be extremely rare)
    if user_identity.get('type') == 'Root':
        alert(
            severity='CRITICAL',
            title=f'Root account used: {event_name}',
            detail=detail,
        )
        return {'action': 'alert_sent', 'severity': 'critical'}

    # High-risk IAM changes
    if event_name in CRITICAL_EVENTS:
        alert(
            severity='HIGH',
            title=f'Critical security event: {event_name}',
            detail=detail,
        )

    # Detect reconnaissance bursts
    if event_name in RECON_EVENTS:
        # In production, check against a sliding window counter
        # (e.g., DynamoDB or ElastiCache) for burst detection
        pass

    # Detect access from unusual source IPs
    if source_ip and not is_known_ip(source_ip):
        alert(
            severity='MEDIUM',
            title=f'Activity from unknown IP: {source_ip}',
            detail=detail,
        )

    return {'action': 'processed'}


def alert(severity: str, title: str, detail: dict) -> None:
    """Send security alert via SNS."""
    message = {
        'severity': severity,
        'title': title,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'event_name': detail.get('eventName'),
        'user': detail.get('userIdentity', {}).get('arn', 'unknown'),
        'source_ip': detail.get('sourceIPAddress'),
        'region': detail.get('awsRegion'),
    }

    sns_client.publish(
        TopicArn=ALERT_TOPIC_ARN,
        Subject=f'[{severity}] {title}',
        Message=json.dumps(message, indent=2),
    )


def is_known_ip(ip: str) -> bool:
    """Check if IP is in the known corporate/VPN CIDR ranges."""
    # In production: check against a maintained allowlist
    # stored in Parameter Store or DynamoDB
    return False  # Default deny — alert on all unknown IPs
```

---

## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [OWASP A09:2021 — Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)
- [NIST SP 800-92 — Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final)
- [NIST SP 800-92 Rev. 1 (Draft) — Cybersecurity Log Management Planning Guide](https://csrc.nist.gov/pubs/sp/800/92/r1/ipd)
- [IBM Cost of a Data Breach Report 2024](https://newsroom.ibm.com/2024-07-30-ibm-report-escalating-data-breach-disruption-pushes-costs-to-new-highs)
- [MITRE ATT&CK — Indicator Removal T1070](https://attack.mitre.org/techniques/T1070/)
- [MITRE ATT&CK — Impair Defenses T1562](https://attack.mitre.org/techniques/T1562/)
- [CWE-117: Improper Output Neutralization for Logs](https://cwe.mitre.org/data/definitions/117.html)
- [CWE-778: Insufficient Logging](https://cwe.mitre.org/cgi-bin/index.cgi)
- [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/cgi-bin/index.cgi)
- [PCI DSS v4.0 Requirement 10](https://pcidssguide.com/pci-dss-logging-requirements/)
- [2017 Equifax Data Breach — Wikipedia](https://en.wikipedia.org/wiki/2017_Equifax_data_breach)
- [SolarWinds Attack — Aqua Security](https://www.aquasec.com/cloud-native-academy/supply-chain-security/solarwinds-attack/)
- [Log4Shell — CISA Guidance](https://www.cisa.gov/news-events/news/apache-log4j-vulnerability-guidance)
- [AWS CloudTrail Security Best Practices](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html)
- [Amazon GuardDuty Best Practices](https://aws.github.io/aws-security-services-best-practices/guides/guardduty/)
- [Falco — CNCF Runtime Security](https://www.sysdig.com/opensource/falco)
- [Wazuh — Cloud Native Security](https://wazuh.com/blog/cloud-native-security-with-wazuh-and-falco/)
- [Thinkst Canary](https://canary.tools/)
