# Penetration Testing — Comprehensive Expertise Module

> **Purpose:** Reference for AI agents to understand penetration testing methodology, guide test
> planning and scoping, interpret pen test results, and assist with remediation prioritization.
> This module is strictly DEFENSIVE — it helps teams plan, scope, and act on pen test findings.
> **Last updated:** 2026-03-08
> **Sources:** OWASP Web Security Testing Guide (WSTG) v4.2/v5, PTES, NIST SP 800-115,
> PCI-DSS v4.0 Requirement 11.3, CVSS v3.1/v4.0, HackerOne/Bugcrowd reports 2024-2025

---

## 1. Threat Landscape

### 1.1 Why Penetration Testing Matters

Penetration testing is the controlled simulation of real-world attacks against systems,
applications, and infrastructure — performed by authorized security professionals to discover
vulnerabilities before adversaries do. Unlike automated scanning, pen testing involves human
creativity, chained exploitation, and business-logic analysis that tools alone cannot replicate.

Key statistics underscoring the need:
- Critical vulnerabilities in web applications increased 150% in 2024 (BreachLock PTI Report).
- Over 1,000 high-risk vulnerabilities with CVSSv3 score of 10.0 were discovered since 2024.
- Gartner estimates that through 2025, 99% of cloud breaches result from customer
  misconfigurations — exactly the class of issue pen testing identifies.
- The global penetration testing market is projected to exceed $5 billion USD annually by 2031.
- Organizations that conduct regular pen tests reduce mean time to detect (MTTD) breaches
  by an average of 30-50% compared to those relying solely on automated scanning.

### 1.2 Breaches That Pen Testing Would Have Caught

| Breach | Year | Root Cause | Pen Test Detection Method |
|--------|------|-----------|--------------------------|
| MOVEit Transfer | 2023 | SQL injection in file transfer app | Web app pen test with injection testing |
| Optus | 2022 | Unauthenticated API exposing customer data | API pen test — BOLA/missing auth checks |
| Capital One | 2019 | SSRF in WAF + overprivileged IAM role | Cloud pen test — SSRF + IAM review |
| Equifax | 2017 | Unpatched Apache Struts (CVE-2017-5638) | Infrastructure pen test — patch verification |
| Marriott/Starwood | 2018 | Lateral movement after initial compromise | Internal network pen test — segmentation testing |

### 1.3 Regulatory Requirements for Pen Testing

| Regulation / Standard | Pen Test Requirement | Frequency |
|-----------------------|---------------------|-----------|
| PCI-DSS v4.0 (Req 11.3) | Mandatory external + internal pen test | Annual + after significant changes |
| SOC 2 | Not explicitly required, but strongly recommended for Trust Services Criteria | Annual (best practice) |
| HIPAA | Risk analysis must include technical testing | Annual (best practice) |
| FedRAMP | Required for all cloud service providers | Annual + after major changes |
| ISO 27001 (Annex A.12.6) | Technical vulnerability management including testing | Defined by risk assessment |
| NIST CSF (PR.IP-12) | Penetration testing as part of vulnerability management | Risk-based cadence |
| DORA (EU) | Threat-Led Penetration Testing (TLPT) for financial entities | Every 3 years minimum |
| NIS2 (EU) | Security testing including pen tests for essential entities | Regular, risk-based |

### 1.4 Bug Bounty Program Evolution

Bug bounty programs complement formal pen testing with continuous, crowd-sourced security
research. Their evolution reflects the maturation of the security testing ecosystem:

**Scale and payouts (2024-2025):**
- Google's Vulnerability Reward Program paid out $12 million in 2024.
- Meta awarded over $2.3 million in 2024, bringing lifetime totals to over $20 million.
- GitLab awarded over $1 million across 275 valid reports from 457 researchers in 2024.
- Zoom's average resolution time improved by over 90% from Feb 2024 to Jan 2025.

**Trends:**
- AI systems are now in scope for many bounty programs (prompt injection, model DoS).
- Vendors increasingly pay for full exploit chains, not isolated bug reports.
- Bug bounties and formal pen tests are complementary — bounties provide continuous coverage,
  while pen tests provide structured, time-boxed depth.

---

## 2. Core Security Principles

### 2.1 Authorized Testing Only

**This is the non-negotiable foundation of all penetration testing.**

- NEVER test systems without explicit, written authorization from the asset owner.
- Authorization must cover specific IP ranges, domains, applications, and time windows.
- Unauthorized testing is illegal under the Computer Fraud and Abuse Act (CFAA) in the US,
  the Computer Misuse Act 1990 in the UK, and equivalent laws in most jurisdictions.
- Cloud provider policies add additional constraints (see Section 7).
- "Get out of jail free" letters (authorization documents) must be carried during physical tests.

### 2.2 Scoping and Rules of Engagement (RoE)

A well-defined scope prevents legal issues, operational disruption, and wasted effort.

**Scope definition must include:**
- In-scope systems: IP addresses, CIDR ranges, domain names, application URLs
- Out-of-scope systems: production databases with real customer data, third-party services
- Testing window: dates, times, timezone
- Allowed techniques: scanning, exploitation, social engineering, physical access
- Forbidden techniques: denial of service, data exfiltration of real data, destructive actions
- Emergency contacts: who to call if testing causes an outage
- Data handling: how test data and findings are stored, transmitted, and destroyed
- Retesting clause: included or separate engagement

### 2.3 Testing Approaches

| Approach | Tester Knowledge | Simulates | Best For |
|----------|-----------------|-----------|----------|
| **Black Box** | No prior knowledge of systems | External attacker | Realistic external threat assessment |
| **White Box** | Full access: source code, architecture, credentials | Insider threat / thorough review | Maximum coverage, finding deep issues |
| **Gray Box** | Partial knowledge: credentials, architecture docs | Compromised user / partner | Balance of realism and coverage |

**Recommendation:** Gray box testing provides the best cost-to-coverage ratio for most
organizations. Black box testing alone misses issues that require authenticated access.
White box testing is ideal for high-assurance applications (financial, healthcare, defense).

### 2.4 Risk-Based Testing Priority

Not all assets deserve the same testing depth. Prioritize based on:

1. **Business criticality** — revenue-generating systems, customer-facing applications
2. **Data sensitivity** — systems processing PCI, PHI, PII, or trade secrets
3. **Exposure** — internet-facing vs. internal-only systems
4. **Change velocity** — recently deployed or significantly modified systems
5. **Compliance requirements** — systems in scope for PCI-DSS, HIPAA, SOC 2
6. **Historical findings** — systems with prior critical or high findings

### 2.5 Testing Cadence

| Trigger | Test Type | Rationale |
|---------|-----------|-----------|
| Annual cycle | Full-scope pen test | Baseline compliance, discover drift |
| Significant change | Targeted pen test | New features, architecture changes, migrations |
| Major release | Application pen test | Pre-release security validation |
| Post-incident | Focused pen test | Verify remediation, find related weaknesses |
| Continuous | Bug bounty / PTaaS | Ongoing coverage between formal tests |

### 2.6 Responsible Disclosure

When pen testers (or bug bounty researchers) find vulnerabilities:
- Report immediately to the designated contact per the RoE.
- Critical findings (CVSS >= 9.0) require immediate verbal notification, not just written.
- Never publicly disclose findings without explicit permission from the asset owner.
- Coordinate disclosure timelines (typically 90 days for vendor notification before public).
- Retain evidence securely and destroy per the engagement agreement upon completion.

---

## 3. Implementation Patterns

### 3.1 Pen Test Planning and Scoping

**Phase 0: Pre-Engagement (1-2 weeks before testing)**

```
Pre-Engagement Checklist:
1. Define objectives (compliance, risk reduction, release validation)
2. Identify target systems and environments
3. Document rules of engagement
4. Obtain written authorization (signed by asset owner with legal authority)
5. Define communication channels and escalation procedures
6. Confirm testing window and change freeze (if applicable)
7. Provision test accounts (for gray/white box)
8. Set up secure reporting channel (encrypted email, secure portal)
9. Confirm insurance coverage (tester's professional liability)
10. Distribute emergency contact list to all stakeholders
```

### 3.2 OWASP Testing Guide Methodology

The OWASP Web Security Testing Guide (WSTG) defines a structured approach that is the
industry standard for web application pen testing. The methodology follows these phases:

**Phase 1: Information Gathering / Reconnaissance**
- Passive reconnaissance: OSINT, DNS enumeration, certificate transparency logs,
  WHOIS, Google dorking, Shodan/Censys, social media, GitHub/GitLab leak scanning
- Active reconnaissance: port scanning, service fingerprinting, web spidering,
  technology stack identification (Wappalyzer-style), WAF detection
- Goal: Build a comprehensive map of the attack surface

**Phase 2: Configuration and Deployment Management Testing**
- Test SSL/TLS configuration (cipher suites, certificate validity, HSTS)
- Review HTTP methods (OPTIONS, TRACE, PUT, DELETE)
- Test for default credentials on admin interfaces
- Review file extensions handling and backup files
- Check for information leakage in HTTP headers, error messages, stack traces
- Test platform/framework-specific configuration

**Phase 3: Identity Management and Authentication Testing**
- Test user registration, account provisioning, and account enumeration
- Test credential policies (password complexity, account lockout)
- Test authentication mechanisms (login, MFA, SSO, OAuth flows)
- Test session management (token generation, session fixation, timeout)
- Test password reset flows (token predictability, email verification)
- Test "remember me" and persistent login functionality

**Phase 4: Authorization Testing**
- Test for path traversal and privilege escalation
- Test for IDOR (Insecure Direct Object References)
- Test role-based access control bypass
- Test horizontal privilege escalation (user A accessing user B's data)
- Test vertical privilege escalation (user escalating to admin)
- Test for missing function-level access control

**Phase 5: Input Validation Testing**
- Test for reflected, stored, and DOM-based XSS
- Test for SQL injection (error-based, blind, time-based)
- Test for command injection, LDAP injection, XML injection
- Test for Server-Side Request Forgery (SSRF)
- Test for Server-Side Template Injection (SSTI)
- Test for file inclusion (LFI/RFI)
- Test HTTP parameter pollution and mass assignment

**Phase 6: Business Logic Testing**
- Test workflow bypass (skipping steps in multi-step processes)
- Test for race conditions and TOCTOU vulnerabilities
- Test transaction limits and boundary conditions
- Test for business logic abuse (coupon stacking, negative quantities)
- Test data validation on business rules

**Phase 7: Reporting** (see Section 3.6)

### 3.3 API Testing Workflow

APIs present unique attack surfaces beyond traditional web applications:

```
API Pen Test Flow:
1. Obtain API documentation (OpenAPI/Swagger, GraphQL schema, Postman collections)
2. Map all endpoints, methods, and parameters
3. Identify authentication mechanisms (API keys, OAuth, JWT, mTLS)
4. Test authentication bypass on every endpoint
5. Test BOLA — modify object IDs in requests (IDOR pattern)
6. Test BFLA — access admin/privileged endpoints with low-privilege tokens
7. Test rate limiting and resource consumption
8. Test input validation on all parameters (injection, type confusion)
9. Test mass assignment — send extra fields in POST/PUT requests
10. Test JWT weaknesses (none algorithm, weak signing, claim tampering)
11. Test GraphQL-specific issues (introspection, nested query DoS, batching)
12. Test for excessive data exposure in responses
13. Test CORS configuration and credential handling
14. Check for undocumented/shadow endpoints (wordlist fuzzing)
```

### 3.4 Mobile App Testing Workflow

Mobile pen testing covers the app binary, its network communications, and backend APIs:

```
Mobile Pen Test Flow:
1. Static analysis — decompile/disassemble the app binary
2. Check for hardcoded secrets (API keys, credentials, certificates)
3. Review data storage (Keychain/Keystore usage, SQLite, SharedPreferences/NSUserDefaults)
4. Test certificate pinning implementation and bypass resistance
5. Intercept and analyze network traffic (proxy through Burp/ZAP)
6. Test authentication and session management via the API layer
7. Test local authentication bypass (biometric, PIN)
8. Review inter-process communication (deep links, intents, URL schemes)
9. Test for binary protections (obfuscation, anti-tampering, anti-debugging)
10. Test push notification security
11. Test offline data exposure
12. Verify proper use of platform security features (iOS App Transport Security, Android Network Security Config)
```

### 3.5 Infrastructure and Cloud Testing

**Network Infrastructure Testing:**
- External perimeter scan and vulnerability assessment
- Internal network segmentation testing
- Wireless network testing (if in scope)
- Active Directory / identity provider assessment
- Review firewall rules and ACLs
- Test VPN and remote access security
- Test for lateral movement paths

**Cloud Penetration Testing:**
- IAM policy review (overprivileged roles, unused permissions)
- Storage bucket/blob/object permissions (public access, ACL misconfig)
- Serverless function security (Lambda/Cloud Functions injection, env var leakage)
- Container and Kubernetes security (pod escape, RBAC, network policies)
- Secrets management (hardcoded credentials, insecure parameter stores)
- Network security groups and VPC configuration
- Logging and monitoring gaps

### 3.6 Reporting Format and Severity Ratings

**Report Structure:**

```
Pen Test Report Template:
==========================================

1. EXECUTIVE SUMMARY (1-2 pages)
   - Engagement overview and objectives
   - Scope summary
   - Testing dates and methodology
   - Overall risk rating (Critical/High/Medium/Low)
   - Key findings summary (top 3-5 findings in plain language)
   - Strategic recommendations

2. SCOPE AND METHODOLOGY
   - Systems tested (IPs, URLs, applications)
   - Testing approach (black/gray/white box)
   - Methodologies applied (OWASP WSTG, PTES, NIST 800-115)
   - Tools used
   - Limitations and constraints

3. FINDINGS (per finding)
   - Title
   - Severity (Critical/High/Medium/Low/Informational)
   - CVSS v3.1 score and vector string
   - Affected systems/endpoints
   - Description
   - Evidence (screenshots, request/response pairs — redacted)
   - Business impact
   - Remediation recommendation
   - References (CWE, OWASP, vendor advisories)

4. REMEDIATION ROADMAP
   - Prioritized remediation plan
   - Quick wins vs. strategic improvements
   - Estimated effort per finding
   - Suggested timelines by severity

5. APPENDICES
   - Detailed scan results
   - Testing logs and timeline
   - Tool configuration details
   - Glossary of terms
```

**CVSS v3.1 Severity Ratings:**

| Rating | CVSS Score | Remediation Timeline | Description |
|--------|-----------|---------------------|-------------|
| Critical | 9.0 - 10.0 | 24-72 hours | Immediate risk of exploitation, data breach, or system compromise |
| High | 7.0 - 8.9 | 1-2 weeks | Significant risk requiring prompt attention |
| Medium | 4.0 - 6.9 | 1-3 months | Moderate risk, should be addressed in next maintenance cycle |
| Low | 0.1 - 3.9 | 3-6 months | Minor risk, address during planned updates |
| Informational | 0.0 | Best effort | Security observation, no direct exploitability |

---

## 4. Vulnerability Catalog

The following are the 20 most commonly found vulnerabilities during penetration tests,
based on industry reports from 2023-2025. No working exploit code is provided — only
descriptions, severity ratings, discovery methods, and remediation guidance.

### 4.1 Broken Access Control / IDOR

- **Typical Severity:** High (CVSS 7.5-8.6)
- **Discovery:** Modify object IDs in API requests (e.g., `/api/users/123` to `/api/users/124`);
  compare responses between two authenticated users
- **Remediation:** Implement server-side authorization checks on every object access;
  use indirect references (UUIDs) instead of sequential IDs; apply row-level security

### 4.2 SQL Injection

- **Typical Severity:** Critical (CVSS 9.0-10.0)
- **Discovery:** Input single quotes, boolean conditions, time delays into parameters;
  detected by Burp Scanner, sqlmap (authorized), or manual testing
- **Remediation:** Use parameterized queries / prepared statements exclusively; apply
  input validation; enforce least-privilege database accounts; deploy WAF rules

### 4.3 Cross-Site Scripting (XSS)

- **Typical Severity:** Medium-High (CVSS 4.3-8.1 depending on context)
- **Discovery:** Inject benign script payloads into input fields, URL parameters, headers;
  check if reflected in response without encoding
- **Remediation:** Context-aware output encoding; Content Security Policy (CSP);
  use framework auto-escaping (React, Angular); validate and sanitize input

### 4.4 Broken Authentication

- **Typical Severity:** High-Critical (CVSS 7.5-9.8)
- **Discovery:** Test for credential stuffing resistance, account enumeration via login/reset
  response differences, weak password policies, missing MFA
- **Remediation:** Enforce MFA; implement account lockout / rate limiting; use secure
  session management; normalize error messages

### 4.5 Security Misconfiguration

- **Typical Severity:** Medium-High (CVSS 5.3-7.5)
- **Discovery:** Check default credentials, verbose error pages, directory listings,
  unnecessary HTTP methods, missing security headers, debug endpoints
- **Remediation:** Harden server configurations; disable defaults; automate configuration
  baselines; implement security headers (HSTS, CSP, X-Frame-Options)

### 4.6 Sensitive Data Exposure

- **Typical Severity:** High (CVSS 7.0-8.5)
- **Discovery:** Inspect API responses for excessive data; check TLS configuration;
  look for credentials in source code, comments, or JavaScript files
- **Remediation:** Minimize data in API responses; enforce TLS 1.2+; encrypt sensitive
  data at rest; remove credentials from source code

### 4.7 Server-Side Request Forgery (SSRF)

- **Typical Severity:** High-Critical (CVSS 7.5-9.8)
- **Discovery:** Submit internal URLs (169.254.169.254, localhost, internal hostnames)
  in parameters that trigger server-side requests (webhooks, URL previews, file imports)
- **Remediation:** Allowlist permitted external domains; block requests to internal/metadata
  IPs; validate and sanitize URLs; use network-level controls

### 4.8 Missing or Weak TLS Configuration

- **Typical Severity:** Medium (CVSS 4.3-5.9)
- **Discovery:** SSL/TLS scanner (testssl.sh, sslyze, Nmap ssl-enum-ciphers);
  check for expired certificates, weak ciphers, missing HSTS
- **Remediation:** Enforce TLS 1.2+ only; disable weak cipher suites; implement HSTS
  with includeSubDomains and preload; automate certificate renewal

### 4.9 Cross-Site Request Forgery (CSRF)

- **Typical Severity:** Medium (CVSS 4.3-6.5)
- **Discovery:** Attempt state-changing requests without CSRF tokens; test SameSite
  cookie attribute enforcement; check for referer/origin validation
- **Remediation:** Anti-CSRF tokens (synchronizer token pattern); SameSite=Strict/Lax
  cookies; verify Origin/Referer headers

### 4.10 Insecure Deserialization

- **Typical Severity:** High-Critical (CVSS 7.5-9.8)
- **Discovery:** Identify serialized objects in cookies, hidden fields, API parameters;
  test with modified serialized data
- **Remediation:** Avoid deserializing untrusted data; use safe serialization formats (JSON);
  implement integrity checks; apply allowlisting for deserialization classes

### 4.11 Missing Rate Limiting

- **Typical Severity:** Medium (CVSS 5.3-6.5)
- **Discovery:** Send rapid repeated requests to login, password reset, OTP verification,
  and API endpoints; measure if throttling is applied
- **Remediation:** Implement rate limiting at API gateway and application level;
  use CAPTCHA for sensitive operations; apply progressive delays

### 4.12 JWT Implementation Flaws

- **Typical Severity:** High-Critical (CVSS 7.5-9.8)
- **Discovery:** Test for "none" algorithm acceptance; attempt key confusion attacks
  (RS256 to HS256); check for weak signing keys; test expired token acceptance
- **Remediation:** Validate algorithm in server config (not from token); use strong signing
  keys; validate all claims (exp, iss, aud); rotate keys regularly

### 4.13 Path Traversal / Local File Inclusion

- **Typical Severity:** High (CVSS 7.5-8.6)
- **Discovery:** Insert `../` sequences in file path parameters; test URL-encoded and
  double-encoded variants; look for file download/preview functionality
- **Remediation:** Canonicalize file paths before validation; use allowlists for permitted
  files/directories; avoid passing user input to file system APIs

### 4.14 Privilege Escalation

- **Typical Severity:** High-Critical (CVSS 7.5-9.8)
- **Discovery:** Access admin endpoints with regular user credentials; modify role/privilege
  parameters in requests; test for horizontal and vertical escalation
- **Remediation:** Enforce role-based access control server-side; validate permissions on
  every request; follow principle of least privilege

### 4.15 Subdomain Takeover

- **Typical Severity:** High (CVSS 7.5-8.1)
- **Discovery:** Enumerate subdomains; check for dangling CNAME/DNS records pointing to
  deprovisioned cloud services (S3, Heroku, Azure, GitHub Pages)
- **Remediation:** Audit DNS records regularly; remove dangling records immediately;
  use CNAME verification where supported

### 4.16 Information Disclosure via Error Messages

- **Typical Severity:** Low-Medium (CVSS 2.1-5.3)
- **Discovery:** Trigger errors with malformed input; check for stack traces, database
  errors, internal IP addresses, framework versions in responses
- **Remediation:** Implement custom error pages; log detailed errors server-side only;
  return generic error messages to clients

### 4.17 Insecure Direct Object References in File Upload

- **Typical Severity:** High (CVSS 7.5-9.0)
- **Discovery:** Upload files with manipulated extensions, MIME types, or oversized content;
  test for stored XSS via SVG/HTML upload; test path traversal in filename
- **Remediation:** Validate file type by content (magic bytes), not extension; store files
  outside web root; randomize filenames; scan uploaded files for malware

### 4.18 Missing Security Headers

- **Typical Severity:** Low-Medium (CVSS 2.1-4.3)
- **Discovery:** Inspect HTTP response headers; check for missing CSP, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Remediation:** Configure security headers at the web server or CDN layer; use
  securityheaders.com for validation; deploy CSP in report-only mode first

### 4.19 AWS/Cloud IAM Misconfigurations

- **Typical Severity:** High-Critical (CVSS 7.5-9.8)
- **Discovery:** Enumerate IAM policies for overprivileged roles; check for wildcard
  permissions; test for unused access keys; scan for exposed credentials
- **Remediation:** Apply least-privilege IAM policies; use IAM Access Analyzer;
  rotate credentials regularly; enforce MFA for privileged accounts

### 4.20 Outdated Software with Known CVEs

- **Typical Severity:** Variable (CVSS depends on specific CVE)
- **Discovery:** Version fingerprinting via HTTP headers, error pages, JavaScript library
  versions; Nmap service detection; dependency scanning
- **Remediation:** Establish patch management process; subscribe to vendor security
  advisories; automate dependency updates; use virtual patching for legacy systems

---

## 5. Security Checklist

### 5.1 Pre-Engagement Checklist

```
[ ] 1.  Written authorization obtained and signed by asset owner
[ ] 2.  Scope defined: in-scope IPs, domains, applications documented
[ ] 3.  Out-of-scope systems explicitly listed
[ ] 4.  Rules of engagement agreed and signed
[ ] 5.  Testing window confirmed (dates, times, timezone)
[ ] 6.  Emergency contacts exchanged (tester + client)
[ ] 7.  Communication channels established (encrypted email, secure portal)
[ ] 8.  Test accounts provisioned (for gray/white box)
[ ] 9.  VPN access or network connectivity confirmed
[ ] 10. Insurance and NDA in place
[ ] 11. Data handling and retention policy agreed
[ ] 12. Retesting terms defined
[ ] 13. Stakeholder notification plan confirmed
```

### 5.2 Testing Phases Checklist

```
[ ] 14. Passive reconnaissance completed (OSINT, DNS, certificates)
[ ] 15. Active reconnaissance completed (port scan, service enumeration)
[ ] 16. Attack surface mapped (endpoints, parameters, entry points)
[ ] 17. Authentication testing completed (all auth mechanisms)
[ ] 18. Authorization testing completed (IDOR, privilege escalation)
[ ] 19. Input validation testing completed (injection, XSS, SSRF)
[ ] 20. Business logic testing completed (workflow bypass, race conditions)
[ ] 21. Session management testing completed (fixation, timeout, tokens)
[ ] 22. Cryptography review completed (TLS, key management, hashing)
[ ] 23. Error handling and logging tested (information leakage)
[ ] 24. API-specific testing completed (if APIs in scope)
[ ] 25. Cloud configuration testing completed (if cloud in scope)
[ ] 26. All findings documented with evidence
```

### 5.3 Reporting Checklist

```
[ ] 27. Executive summary written in non-technical language
[ ] 28. Each finding has CVSS score and vector string
[ ] 29. Each finding has clear reproduction steps
[ ] 30. Each finding has evidence (screenshots, redacted request/response)
[ ] 31. Each finding has specific remediation guidance
[ ] 32. Findings sorted by severity (Critical > High > Medium > Low > Info)
[ ] 33. Remediation roadmap included with timelines
[ ] 34. Report delivered via secure channel (encrypted)
[ ] 35. Report walkthrough/debrief meeting scheduled
```

### 5.4 Remediation Verification Checklist

```
[ ] 36. Critical and high findings remediated within agreed timelines
[ ] 37. Remediation evidence collected from development team
[ ] 38. Retest performed to verify fix effectiveness
[ ] 39. Regression testing confirms fixes did not introduce new issues
[ ] 40. Updated report issued with retest results
[ ] 41. Residual risk documented and accepted by stakeholder
[ ] 42. Lessons learned session conducted
[ ] 43. Findings fed into SDLC improvements (secure coding training, etc.)
```

---

## 6. Tools and Automation

### 6.1 Web Application Testing Tools

**Burp Suite Professional**
- Primary use: Web application proxy, scanner, and manual testing platform
- Key features: Intercept and modify HTTP/S traffic, automated scanning, Intruder for
  parameter fuzzing, Repeater for manual request manipulation, Collaborator for OOB testing
- Defensive value: Identifies injection flaws, access control issues, authentication weaknesses
- License: Commercial (Community edition available with limited features)
- Integration: CI/CD via Burp Enterprise, REST API for automation

**OWASP ZAP (Zed Attack Proxy)**
- Primary use: Open-source web application security scanner and proxy
- Key features: Automated scanner, spider, fuzzer, passive scanner, API scan mode,
  Automation Framework for CI/CD integration
- Defensive value: Free alternative to Burp; excellent for CI/CD pipeline integration
- License: Open source (Apache 2.0)
- Integration: Docker images, GitHub Actions, Jenkins plugin, Automation Framework YAML

**Nuclei (ProjectDiscovery)**
- Primary use: Template-based vulnerability scanner
- Key features: YAML-based templates, 4000+ community templates, fast scanning,
  workflow support, CI/CD integration
- Defensive value: Rapid detection of known vulnerabilities and misconfigurations
- License: Open source (MIT)
- Integration: CLI, Docker, GitHub Actions, ProjectDiscovery Cloud

**ffuf (Fuzz Faster U Fool)**
- Primary use: Web fuzzer for directory/file discovery and parameter fuzzing
- Key features: Fast, flexible, supports multiple wordlists, filters by response code/size
- Defensive value: Discovers hidden endpoints, backup files, admin panels
- License: Open source (MIT)

### 6.2 Network and Infrastructure Tools

**Nmap (Network Mapper)**
- Primary use: Network discovery and security auditing
- Key features: Port scanning, service detection, OS fingerprinting, NSE scripting engine,
  vulnerability detection scripts
- Defensive value: Maps attack surface, identifies open ports, detects outdated services
- License: Open source (custom Nmap license)
- Note: Nmap scanning is the reconnaissance phase — always within authorized scope

**Metasploit Framework**
- Primary use: Exploitation framework for validating vulnerabilities
- Key features: Exploit modules, payload generation, post-exploitation, auxiliary scanners
- Defensive value: Validates that vulnerabilities are actually exploitable (not just theoretical);
  demonstrates real business impact to stakeholders
- License: Open source (Framework), Commercial (Metasploit Pro)
- IMPORTANT: Use only in authorized engagements; never use against production systems
  without explicit approval; prefer Metasploit Pro's controlled exploitation features

**sqlmap**
- Primary use: Automated SQL injection detection and exploitation
- Key features: Detection of injection points, database fingerprinting, data extraction
- Defensive value: Validates SQL injection findings, determines actual impact and exploitability
- License: Open source (GPLv2)
- IMPORTANT: Authorized use only; can be destructive; use read-only techniques when possible

### 6.3 Mobile Application Testing Tools

**MobSF (Mobile Security Framework)**
- Primary use: Automated mobile app security assessment
- Key features: Static analysis (APK/IPA), dynamic analysis, API testing, malware analysis
- Defensive value: Rapid identification of hardcoded secrets, insecure storage, weak crypto
- License: Open source (GPLv3)

**Frida**
- Primary use: Dynamic instrumentation toolkit for mobile and desktop apps
- Key features: Runtime hooking, SSL pinning bypass (for authorized testing), method tracing
- Defensive value: Test runtime protections, validate certificate pinning implementation
- License: Open source (wxWindows Library Licence)

### 6.4 Cloud Penetration Testing Tools

**Prowler**
- Primary use: AWS and Azure security assessment
- Key features: CIS Benchmark checks, PCI-DSS compliance, GDPR, HIPAA assessments,
  multi-account support
- Defensive value: Automated discovery of cloud misconfigurations
- License: Open source (Apache 2.0)

**ScoutSuite (NCC Group)**
- Primary use: Multi-cloud security auditing (AWS, Azure, GCP, Oracle Cloud)
- Key features: Service-level findings, risk-based severity, HTML report generation
- Defensive value: Cross-cloud configuration assessment from a single tool
- License: Open source (GPLv2)

**Pacu (Rhino Security Labs)**
- Primary use: AWS exploitation framework
- Key features: IAM enumeration, privilege escalation testing, data exfiltration testing
- Defensive value: Validates IAM policies, tests for lateral movement paths in AWS
- License: Open source (BSD 3-Clause)

### 6.5 Automated Pen Test Platforms

| Platform | Type | Best For |
|----------|------|----------|
| Pentera | Automated pen testing | Continuous internal/external testing |
| Horizon3.ai (NodeZero) | Autonomous pen testing | Validating exploitable attack paths |
| Cobalt | PTaaS (Pen Test as a Service) | On-demand pen tests with human testers |
| HackerOne | Bug bounty + PTaaS | Continuous crowd-sourced testing |
| Bugcrowd | Bug bounty + PTaaS | Managed bug bounty programs |
| Synack | Crowd-sourced pen testing | Vetted researcher community |

---

## 7. Platform-Specific Guidance

### 7.1 Web Application Pen Test Focus Areas

Priority areas for web application testing:

1. **Authentication and session management** — Login, MFA, session tokens, password reset
2. **Authorization / access control** — IDOR, role-based access, privilege escalation
3. **Input validation** — All user-controllable input (forms, URLs, headers, cookies, files)
4. **Business logic** — Workflow manipulation, race conditions, abuse cases
5. **Client-side security** — CSP, XSS, DOM manipulation, postMessage handling
6. **Third-party integrations** — OAuth flows, SSO, payment processing, webhooks
7. **File handling** — Upload, download, processing (ImageMagick, PDF generation)
8. **Caching and CDN** — Cache poisoning, cache deception, CDN bypass

### 7.2 API Pen Test Focus Areas

1. **Authentication** — API key exposure, JWT flaws, OAuth misconfiguration
2. **Object-level authorization** — BOLA/IDOR on all endpoints
3. **Function-level authorization** — Admin endpoints accessible to regular users
4. **Rate limiting** — Brute force on all resource-intensive endpoints
5. **Input validation** — Injection via JSON/XML/GraphQL parameters
6. **Mass assignment** — Extra properties in request bodies accepted by server
7. **Data exposure** — API responses returning more data than needed
8. **GraphQL specifics** — Introspection enabled, nested query depth, batching attacks
9. **API versioning** — Old API versions still accessible with weaker security
10. **Documentation/shadow APIs** — Undocumented endpoints discoverable via fuzzing

### 7.3 Mobile Pen Test Focus Areas

1. **Data storage** — Keychain/Keystore, SQLite, SharedPreferences, logs, clipboard
2. **Network security** — Certificate pinning, TLS configuration, proxy detection
3. **Binary protections** — Obfuscation, root/jailbreak detection, anti-tampering
4. **Authentication** — Biometric bypass, token storage, session management
5. **Inter-process communication** — Deep links, intents, custom URL schemes
6. **Reverse engineering resistance** — Code obfuscation, integrity checks

### 7.4 Cloud Pen Test Scoping — Provider Policies

**Amazon Web Services (AWS):**
- Permitted: Testing your own EC2 instances, RDS, Lambda, API Gateway, CloudFront,
  Elastic Beanstalk, and other customer-owned resources
- Not permitted: Testing AWS infrastructure, DoS/DDoS simulation, DNS zone walking
  against Route 53, port flooding
- Notification: No longer required for most test types (as of 2019); still required for
  simulated events and some specific test types
- Reference: AWS Penetration Testing Policy page

**Google Cloud Platform (GCP):**
- Permitted: Testing your own projects and resources without prior notification
- Not permitted: Testing Google infrastructure, other customers' resources
- Must comply with Google Cloud Acceptable Use Policy
- Reference: GCP Terms of Service, Acceptable Use Policy

**Microsoft Azure:**
- Permitted: Testing your own Azure resources
- Not permitted: DoS testing, port scanning of other customers, testing shared services
- Notification: No longer required (as of 2017) for standard pen testing
- Reference: Microsoft Cloud Penetration Testing Rules of Engagement

### 7.5 Infrastructure Pen Test Focus Areas

1. **External perimeter** — Internet-facing services, exposed management interfaces
2. **Internal network** — Segmentation, lateral movement, Active Directory attacks
3. **Wireless** — Rogue access points, WPA configuration, captive portal bypass
4. **VPN/Remote access** — Authentication, split tunneling, endpoint compliance
5. **Patch management** — Outdated services with known CVEs
6. **DNS** — Zone transfer, subdomain enumeration, DNS rebinding
7. **Email** — SPF/DKIM/DMARC configuration, phishing resistance (if in scope)

---

## 8. Incident Patterns

### 8.1 Pen Test Finding Triage

When a pen test report is received, triage findings systematically:

```
Triage Workflow:
1. Receive report via secure channel
2. Validate findings — can internal team reproduce each finding?
3. Classify by severity (CVSS) and business impact
4. Assign owners for each finding (team, individual)
5. Estimate remediation effort (hours, complexity, dependencies)
6. Create remediation tickets in issue tracker
7. Set deadlines per severity (see timeline table below)
8. Schedule progress check-ins (weekly for Critical/High)
9. Plan retest after remediation
```

### 8.2 Critical Finding Escalation

Critical findings (CVSS >= 9.0) require immediate escalation:

```
Critical Finding Escalation Protocol:
1. IMMEDIATE: Verbal notification to CISO/security lead (do not wait for written report)
2. Within 1 hour: Assess if finding is actively exploitable
3. Within 4 hours: Implement temporary mitigation (WAF rule, network block, feature disable)
4. Within 24 hours: Begin permanent remediation
5. Within 72 hours: Permanent fix deployed or risk acceptance documented by executive
6. Within 1 week: Retest to verify remediation
7. Post-mortem: Why did this vulnerability exist? What process failed?
```

### 8.3 Remediation Timelines by Severity

| Severity | Max Time to Remediate | Progress Check | Retest Window |
|----------|-----------------------|----------------|---------------|
| Critical (9.0-10.0) | 72 hours (temporary), 2 weeks (permanent) | Daily | Within 1 week of fix |
| High (7.0-8.9) | 30 days | Weekly | Within 2 weeks of fix |
| Medium (4.0-6.9) | 90 days | Bi-weekly | Next scheduled test or within 30 days |
| Low (0.1-3.9) | 180 days | Monthly | Next scheduled test |
| Informational (0.0) | Best effort / next release | Quarterly | Next scheduled test |

### 8.4 Common Remediation Failures

Watch for these patterns that indicate remediation was insufficient:

- **Fixing the symptom, not the cause** — Blocking a specific payload instead of fixing
  the underlying injection vulnerability
- **Incomplete fix** — Fixing one endpoint but leaving the same vulnerability in similar
  endpoints
- **Client-side only fix** — Adding JavaScript validation without server-side checks
- **WAF-only mitigation** — Relying solely on WAF rules without fixing application code
- **Regression** — Fix is reverted by a subsequent deployment
- **Scope creep** — New features introduced during remediation create new vulnerabilities

---

## 9. Compliance and Standards

### 9.1 PCI-DSS v4.0 — Requirement 11.3

PCI-DSS Requirement 11.3 mandates penetration testing for any organization that processes,
stores, or transmits cardholder data:

**Key requirements:**
- External penetration test at least annually and after significant infrastructure/application changes
- Internal penetration test at least annually and after significant changes
- Must use industry-accepted methodologies (NIST SP 800-115, OWASP, PTES)
- Must test network segmentation controls (verify cardholder data environment isolation)
- Must test from both inside and outside the network
- Must test the entire CDE (cardholder data environment) perimeter
- Application-layer testing must cover OWASP Top 10 at minimum
- Exploitable vulnerabilities must be corrected and retested
- Testing must be performed by qualified internal or external personnel

**PCI-DSS v4.0 updates (effective March 2025):**
- Requirement 11.3.1.1: Internal pen tests must also evaluate segmentation controls
- Requirement 11.3.1.2: Multi-tenant service providers must support customer pen testing
- Requirement 6.4.1: Public-facing web applications must be protected by automated
  solutions that detect and prevent attacks (WAF or equivalent)

### 9.2 SOC 2 Pen Test Requirements

SOC 2 does not explicitly mandate penetration testing, but:
- Common Criteria CC7.1 requires identification and assessment of vulnerabilities
- CC4.1 requires evaluation of internal controls
- Pen testing is the most efficient way to satisfy multiple Trust Services Criteria
- Most SOC 2 auditors expect or recommend annual pen testing
- Pen test reports serve as strong evidence for the Security Trust Services Criteria

### 9.3 NIST SP 800-115

NIST SP 800-115 "Technical Guide to Information Security Testing and Assessment" provides:

**Four-phase methodology:**
1. **Planning** — Define scope, objectives, approach, obtain authorization
2. **Discovery** — Information gathering, scanning, vulnerability analysis
3. **Attack** — Exploit identified vulnerabilities to validate impact
4. **Reporting** — Document findings, provide remediation recommendations

**Key principles:**
- Testing must be authorized and planned
- Results must be defensible and reproducible
- Evidence handling must follow chain-of-custody practices
- Findings must be classified by risk level
- Reports must include both technical and executive summaries
- Applicable to government agencies and widely adopted by private sector

### 9.4 OWASP Web Security Testing Guide (WSTG)

The OWASP WSTG (currently v4.2, with v5 in development) is the most comprehensive
open-source guide for web application security testing:

**Testing categories (11 categories, 90+ test cases):**

| Category | ID Prefix | Example Tests |
|----------|-----------|---------------|
| Information Gathering | WSTG-INFO | Fingerprint web server, review web content |
| Configuration Management | WSTG-CONF | Test HTTP methods, file extensions |
| Identity Management | WSTG-IDNT | Test user registration, account enumeration |
| Authentication | WSTG-ATHN | Test credentials, lockout, MFA bypass |
| Authorization | WSTG-ATHZ | Test path traversal, privilege escalation |
| Session Management | WSTG-SESS | Test cookies, session fixation, CSRF |
| Input Validation | WSTG-INPV | Test XSS, SQL injection, SSRF, SSTI |
| Error Handling | WSTG-ERRH | Test error codes, stack traces |
| Cryptography | WSTG-CRYP | Test TLS, padding oracle, weak ciphers |
| Business Logic | WSTG-BUSL | Test workflow bypass, data validation |
| Client-Side | WSTG-CLNT | Test DOM XSS, postMessage, clickjacking |

### 9.5 PTES (Penetration Testing Execution Standard)

PTES defines seven phases for a complete penetration test:

1. **Pre-engagement Interactions** — Scoping, RoE, authorization, questionnaires
2. **Intelligence Gathering** — OSINT, active/passive recon, target profiling
3. **Threat Modeling** — Identify business assets, threats, attack vectors
4. **Vulnerability Analysis** — Automated scanning + manual testing, false positive elimination
5. **Exploitation** — Validate vulnerabilities through controlled exploitation
6. **Post-Exploitation** — Determine value of compromised systems, lateral movement,
   data access, persistence (within RoE boundaries)
7. **Reporting** — Executive summary, technical findings, remediation guidance

PTES is particularly valued for its emphasis on pre-engagement clarity, threat modeling
integration, and structured post-exploitation analysis — making it ideal for enterprise-scale
engagements and red team operations.

---

## 10. Code Examples

All examples below are for DEFENSIVE purposes — configuring security scanning tools,
automating detection, and structuring reports. No exploit code or attack payloads are included.

### 10.1 Nuclei Template — Detect Missing Security Headers

```yaml
# nuclei-template: missing-security-headers.yaml
# Purpose: Detect missing security headers on web applications
# Usage: nuclei -t missing-security-headers.yaml -u https://target.example.com

id: missing-security-headers

info:
  name: Missing Security Headers Detection
  author: security-team
  severity: info
  description: |
    Checks for the absence of recommended security headers
    that help protect against common web attacks.
  tags: headers,misconfiguration,best-practice
  reference:
    - https://owasp.org/www-project-secure-headers/

http:
  - method: GET
    path:
      - "{{BaseURL}}"

    matchers-condition: or
    matchers:
      - type: word
        name: missing-csp
        words:
          - "Content-Security-Policy"
        part: header
        negative: true

      - type: word
        name: missing-hsts
        words:
          - "Strict-Transport-Security"
        part: header
        negative: true

      - type: word
        name: missing-x-frame-options
        words:
          - "X-Frame-Options"
        part: header
        negative: true

      - type: word
        name: missing-x-content-type
        words:
          - "X-Content-Type-Options"
        part: header
        negative: true
```

### 10.2 Nuclei Template — Detect Exposed Git Directory

```yaml
# nuclei-template: git-directory-exposed.yaml
# Purpose: Detect exposed .git directories that may leak source code
# Usage: nuclei -t git-directory-exposed.yaml -l targets.txt

id: git-directory-exposed

info:
  name: Exposed Git Directory
  author: security-team
  severity: high
  description: |
    Detects exposed .git directories on web servers that could
    allow attackers to download source code and find credentials.
  tags: exposure,git,misconfiguration
  reference:
    - https://owasp.org/www-project-web-security-testing-guide/

http:
  - method: GET
    path:
      - "{{BaseURL}}/.git/config"

    matchers-condition: and
    matchers:
      - type: word
        words:
          - "[core]"
          - "[remote"
        condition: or

      - type: status
        status:
          - 200

    extractors:
      - type: regex
        regex:
          - 'url = (.+)'
        group: 1
```

### 10.3 ZAP Automation Framework — CI/CD Scan Configuration

```yaml
# zap-automation.yaml
# Purpose: OWASP ZAP Automation Framework configuration for CI/CD pipeline
# Usage: docker run -v $(pwd):/zap/wrk/ owasp/zap2docker-stable \
#        zap.sh -cmd -autorun /zap/wrk/zap-automation.yaml

env:
  contexts:
    - name: "target-app"
      urls:
        - "https://staging.example.com"
      includePaths:
        - "https://staging.example.com/.*"
      excludePaths:
        - "https://staging.example.com/logout.*"
        - "https://staging.example.com/health.*"
      authentication:
        method: "json"
        parameters:
          loginPageUrl: "https://staging.example.com/api/auth/login"
          loginRequestUrl: "https://staging.example.com/api/auth/login"
          loginRequestBody: '{"username":"{%username%}","password":"{%password%}"}'
        verification:
          method: "response"
          loggedInRegex: "\\Qauthorization\\E"
      users:
        - name: "test-user"
          credentials:
            username: "${ZAP_TEST_USER}"
            password: "${ZAP_TEST_PASS}"

jobs:
  - type: passiveScan-config
    parameters:
      maxAlertsPerRule: 10
      scanOnlyInScope: true

  - type: spider
    parameters:
      context: "target-app"
      user: "test-user"
      maxDuration: 5
      maxDepth: 10

  - type: spiderAjax
    parameters:
      context: "target-app"
      user: "test-user"
      maxDuration: 5

  - type: passiveScan-wait
    parameters:
      maxDuration: 10

  - type: activeScan
    parameters:
      context: "target-app"
      user: "test-user"
      maxRuleDurationInMins: 5
      maxScanDurationInMins: 30

  - type: report
    parameters:
      template: "traditional-json"
      reportDir: "/zap/wrk/reports"
      reportFile: "zap-scan-report"
    risks:
      - high
      - medium
      - low
```

### 10.4 Pen Test Report — Finding Template (Markdown)

```markdown
## Finding: [FINDING-ID] — [Title]

**Severity:** [Critical | High | Medium | Low | Informational]
**CVSS v3.1 Score:** [X.X] ([Vector String])
**CWE:** [CWE-XXX — Name]
**OWASP Category:** [e.g., A01:2021 — Broken Access Control]
**Status:** [Open | Remediated | Accepted Risk]

### Affected Assets
- [URL / IP / Application / Endpoint]

### Description
[Clear description of the vulnerability, what it is, and why it matters.
Written for a technical audience but understandable by a security-aware PM.]

### Evidence
[Redacted screenshots, HTTP request/response pairs, or tool output
demonstrating the vulnerability. NEVER include real credentials or PII.]

### Business Impact
[What could an attacker achieve by exploiting this? Data breach, financial
loss, compliance violation, reputational damage, service disruption?]

### Remediation
**Recommended fix:**
[Specific, actionable remediation steps.]

**References:**
- [Link to relevant OWASP page]
- [Link to vendor documentation]
- [Link to CWE entry]

### Retest Results
- **Date:** [YYYY-MM-DD]
- **Result:** [Fixed | Partially Fixed | Not Fixed]
- **Notes:** [Details of retest]
```

### 10.5 Remediation Tracking Template

```markdown
# Pen Test Remediation Tracker

**Engagement:** [Engagement Name]
**Report Date:** [YYYY-MM-DD]
**Retest Target Date:** [YYYY-MM-DD]

## Summary

| Severity | Total | Remediated | In Progress | Open | Accepted Risk |
|----------|-------|------------|-------------|------|---------------|
| Critical | 0     | 0          | 0           | 0    | 0             |
| High     | 0     | 0          | 0           | 0    | 0             |
| Medium   | 0     | 0          | 0           | 0    | 0             |
| Low      | 0     | 0          | 0           | 0    | 0             |
| Info     | 0     | 0          | 0           | 0    | 0             |

## Findings Detail

| ID | Title | Severity | Owner | Status | Deadline | Notes |
|----|-------|----------|-------|--------|----------|-------|
| F-001 | [Title] | Critical | [Team] | Open | [Date] | [Notes] |
| F-002 | [Title] | High | [Team] | In Progress | [Date] | [Notes] |

## Risk Acceptances

| ID | Title | Severity | Accepted By | Date | Justification | Review Date |
|----|-------|----------|-------------|------|---------------|-------------|
| F-XXX | [Title] | [Sev] | [Name/Role] | [Date] | [Why accepted] | [Date] |
```

### 10.6 Nmap Defensive Scan Script

```bash
#!/usr/bin/env bash
# nmap-defensive-scan.sh
# Purpose: Authorized network reconnaissance for pen test scope validation
# Usage: ./nmap-defensive-scan.sh <target-file> <output-dir>
# IMPORTANT: Only run against authorized targets listed in the engagement scope

set -euo pipefail

TARGET_FILE="${1:?Usage: $0 <target-file> <output-dir>}"
OUTPUT_DIR="${2:?Usage: $0 <target-file> <output-dir>}"

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "ERROR: Target file not found: $TARGET_FILE"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[*] Starting authorized scan at $(date)"
echo "[*] Targets: $TARGET_FILE"
echo "[*] Output:  $OUTPUT_DIR"

# Phase 1: TCP SYN scan — top 1000 ports, service detection
echo "[*] Phase 1: TCP service scan"
nmap -sS -sV --top-ports 1000 \
  -oA "$OUTPUT_DIR/tcp-scan-$TIMESTAMP" \
  -iL "$TARGET_FILE" \
  --reason --open

# Phase 2: UDP scan — top 100 ports
echo "[*] Phase 2: UDP service scan"
nmap -sU --top-ports 100 \
  -oA "$OUTPUT_DIR/udp-scan-$TIMESTAMP" \
  -iL "$TARGET_FILE" \
  --reason --open

# Phase 3: NSE vulnerability detection scripts (safe category only)
echo "[*] Phase 3: NSE safe vulnerability checks"
nmap -sV --script=safe \
  -oA "$OUTPUT_DIR/nse-safe-$TIMESTAMP" \
  -iL "$TARGET_FILE" \
  --open

# Phase 4: SSL/TLS configuration check
echo "[*] Phase 4: SSL/TLS configuration audit"
nmap -p 443,8443,8080 --script ssl-enum-ciphers,ssl-cert \
  -oA "$OUTPUT_DIR/ssl-audit-$TIMESTAMP" \
  -iL "$TARGET_FILE"

echo "[*] Scan complete at $(date)"
echo "[*] Results saved to $OUTPUT_DIR/"
```

---

## Quick Reference Card

### Pen Test Types at a Glance

| Type | Target | Methodology | Typical Duration |
|------|--------|-------------|-----------------|
| Web App Pen Test | Web applications | OWASP WSTG | 5-15 days |
| API Pen Test | REST/GraphQL/SOAP APIs | OWASP WSTG + API Top 10 | 3-10 days |
| Mobile Pen Test | iOS/Android apps | OWASP MASTG | 5-10 days |
| Network Pen Test (External) | Internet-facing infra | PTES + NIST 800-115 | 3-7 days |
| Network Pen Test (Internal) | Internal network | PTES + NIST 800-115 | 5-10 days |
| Cloud Pen Test | AWS/GCP/Azure configs | CIS Benchmarks + custom | 5-15 days |
| Red Team Exercise | Full organization | PTES + MITRE ATT&CK | 2-6 weeks |
| Physical Pen Test | Facilities, access control | PTES physical | 1-5 days |
| Social Engineering | Employees (phishing, vishing) | PTES + custom | 1-4 weeks |

### Key Standards Reference

| Standard | Focus | Publisher | Current Version |
|----------|-------|-----------|-----------------|
| OWASP WSTG | Web application testing | OWASP Foundation | v4.2 (v5 in development) |
| PTES | Full pen test lifecycle | PTES.org | 1.0 |
| NIST SP 800-115 | Security testing and assessment | NIST | 2008 (still current) |
| OWASP MASTG | Mobile app testing | OWASP Foundation | v2 |
| OWASP API Top 10 | API security risks | OWASP Foundation | 2023 |
| CVSS | Vulnerability scoring | FIRST.org | v3.1 / v4.0 |
| MITRE ATT&CK | Adversary tactics/techniques | MITRE Corporation | v14+ |
| CIS Benchmarks | Configuration hardening | CIS | Updated regularly |
| PCI-DSS | Payment card security | PCI SSC | v4.0 |

---

## References

- OWASP Web Security Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- PTES (Penetration Testing Execution Standard): http://www.pentest-standard.org/
- NIST SP 800-115: https://csrc.nist.gov/pubs/sp/800/115/final
- PCI-DSS v4.0: https://www.pcisecuritystandards.org/
- CVSS v3.1 Calculator: https://www.first.org/cvss/calculator/3.1
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Mobile Application Security: https://mas.owasp.org/
- Nuclei Templates: https://github.com/projectdiscovery/nuclei-templates
- OWASP ZAP: https://www.zaproxy.org/
- MITRE ATT&CK: https://attack.mitre.org/
