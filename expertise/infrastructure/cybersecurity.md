# Cybersecurity — Expertise Module

> A cybersecurity specialist in software development embeds security into every phase of the SDLC — from threat modeling and secure design through implementation, testing, deployment, and incident response. The scope spans application security (AppSec), infrastructure hardening, identity and access management, supply chain integrity, compliance, and continuous monitoring across cloud-native and traditional environments.

---

## Core Patterns & Conventions

### Secure Development Lifecycle (SDL / SSDLC)

The Secure Software Development Lifecycle integrates security activities into each phase:

1. **Planning** — Threat modeling (STRIDE, PASTA), security requirements, abuse case analysis
2. **Design** — Secure architecture review, trust boundary identification, least-privilege design
3. **Implementation** — Secure coding standards (OWASP Secure Coding Practices), peer review
4. **Testing** — SAST, DAST, SCA, penetration testing, fuzz testing
5. **Deployment** — Hardened configurations, secrets injection, infrastructure scanning
6. **Operations** — Runtime monitoring, incident response, vulnerability management
7. **Decommission** — Data sanitization, credential revocation, access removal

Reference: Microsoft SDL, NIST SP 800-218 (SSDF), OWASP SAMM.

### OWASP Top 10 (2021 / 2025)

The OWASP Top 10 was updated in 2025 with significant changes. Key vulnerabilities and prevention patterns:

| # | Vulnerability | Prevention Pattern |
|---|---|---|
| A01 | **Broken Access Control** | Deny by default; enforce server-side access checks; use RBAC/ABAC; disable directory listing; log access failures; rate-limit APIs |
| A02 | **Security Misconfiguration** (moved to #2 in 2025) | Automated hardening; minimal installs; disable unused features; review cloud IAM policies; use CIS Benchmarks |
| A03 | **Software Supply Chain Failures** (new in 2025, expands A06:2021) | Generate SBOMs (SPDX, CycloneDX); sign artifacts with Sigstore; enforce SLSA provenance; pin dependencies; use lockfiles |
| A04 | **Cryptographic Failures** (was #2 in 2021) | Enforce TLS 1.2+; use AES-256-GCM or ChaCha20-Poly1305; hash passwords with Argon2id; never roll custom crypto; classify data sensitivity |
| A05 | **Injection** (was #3 in 2021) | Parameterized queries; ORM usage; input validation (allowlist); output encoding; CSP headers |
| A06 | **Insecure Design** | Threat model early; use secure design patterns; establish paved roads; integrate security user stories |
| A07 | **Identification & Authentication Failures** | MFA enforcement; WebAuthn/passkeys; rate-limit login; use proven IdP libraries; ban common passwords (NIST SP 800-63B) |
| A08 | **Software & Data Integrity Failures** | Verify signatures on updates and dependencies; protect CI/CD pipelines; use Subresource Integrity (SRI) for CDN assets |
| A09 | **Security Logging & Monitoring Failures** | Log authentication, access control, and input validation failures; centralize logs (SIEM); set up alerting; retain logs per compliance |
| A10 | **Mishandling of Exceptional Conditions** (new in 2025) | Never expose stack traces; fail closed (not open); handle all error paths; use typed errors; test edge cases |

Source: OWASP Top 10:2021, OWASP Top 10:2025.

### Authentication Patterns

**OAuth 2.1** consolidates best practices from OAuth 2.0 extensions:
- Mandatory PKCE for all clients (not just public clients)
- Refresh token rotation with sender-constrained tokens
- No implicit grant; no ROPC grant
- Exact redirect URI matching required

**OpenID Connect (OIDC)** adds identity layer atop OAuth 2.1:
- ID tokens for authentication; access tokens for authorization
- Use `nonce` parameter to prevent replay attacks
- Validate `iss`, `aud`, `exp`, `iat` claims server-side

**WebAuthn / Passkeys (FIDO2):**
- Cryptographic key pairs bound to specific origin (phishing-resistant by design)
- Passkeys synced across devices via platform authenticators (Apple, Google, Microsoft)
- Recommended as primary auth for consumer and enterprise apps in 2025-2026
- Use as MFA factor or standalone passwordless authentication

**Multi-Factor Authentication (MFA):**
- Prefer hardware keys (YubiKey) or passkeys over TOTP over SMS
- SMS-based MFA vulnerable to SIM-swap attacks — use only as fallback
- Enforce MFA for all privileged accounts and administrative access

### Authorization Models

**RBAC (Role-Based Access Control):**
- Assign permissions to roles, roles to users
- Best for: stable permission structures, small number of well-defined roles
- Limitation: "role explosion" when permissions become context-dependent

**ABAC (Attribute-Based Access Control):**
- Evaluate attributes of user, resource, action, and environment
- Best for: complex conditional logic (time, location, data classification)
- Implementation: Open Policy Agent (OPA), Cedar (AWS), Casbin

**ReBAC (Relationship-Based Access Control):**
- Permissions derived from entity relationships (owner-of, member-of, parent-of)
- Best for: hierarchical data (documents, organizations, projects)
- Implementation: Google Zanzibar model, SpiceDB, Ory Keto, Authzed

**Best practice (2025):** Start with RBAC; layer ABAC for context-dependent rules; add ReBAC for relationship-driven resources. Use a dedicated authorization service rather than embedding logic in application code.

### Cryptography Best Practices

**Hashing:**
- Passwords: Argon2id (preferred), bcrypt (cost >= 12), scrypt
- Data integrity: SHA-256 or SHA-3; never MD5 or SHA-1
- HMAC for message authentication: HMAC-SHA256 minimum

**Symmetric Encryption:**
- AES-256-GCM (authenticated encryption) for data at rest
- ChaCha20-Poly1305 for environments without AES hardware acceleration
- Never use ECB mode — it leaks plaintext patterns

**Asymmetric Encryption:**
- RSA: minimum 2048-bit keys (3072+ recommended by NIST for post-2030)
- Ed25519 for signatures (faster, shorter keys than RSA)
- X25519 for key exchange

**Key Management:**
- Rotate encryption keys periodically (90 days for high-sensitivity)
- Use envelope encryption (encrypt data key with master key)
- Store master keys in HSMs or cloud KMS (AWS KMS, GCP KMS, Azure Key Vault)
- Never hardcode keys in source code

Reference: NIST SP 800-175B, NIST SP 800-131A Rev 2.

### Secure API Design

- **Input validation:** Validate all inputs server-side using schema validation (JSON Schema, Zod, Joi). Allowlist expected patterns; reject everything else.
- **Output encoding:** Encode data based on output context (HTML, URL, JavaScript, CSS). Use framework-provided auto-escaping.
- **Rate limiting:** Apply per-user and per-endpoint limits. Use token bucket or sliding window algorithms. Return `429 Too Many Requests` with `Retry-After` header.
- **Authentication:** Require bearer tokens (JWT or opaque) on all non-public endpoints. Use short-lived access tokens (5-15 min) with refresh token rotation.
- **Transport:** TLS 1.2+ mandatory; prefer TLS 1.3. HSTS header with `max-age >= 31536000; includeSubDomains; preload`.
- **Versioning:** Version APIs to allow security fixes without breaking clients.
- **Error handling:** Return generic error messages to clients; log detailed errors server-side.

### Supply Chain Security

- **SBOM generation:** Use Syft or Trivy to produce SBOMs in SPDX or CycloneDX format at build time
- **Artifact signing:** Sign container images and binaries with Sigstore (cosign + Fulcio + Rekor) using keyless signing via OIDC identity
- **SLSA framework:** Aim for SLSA Build Level 2+ (scripted build, version-controlled, authenticated provenance)
- **Dependency management:** Pin exact versions in lockfiles; enable Dependabot or Renovate for automated updates; review changelogs before merging
- **Registry security:** Use private registries with access control; enable vulnerability scanning on push; verify image signatures with Kyverno or Connaisseur
- **CI/CD pipeline protection:** Require MFA for pipeline configuration changes; restrict who can modify build scripts; use ephemeral build environments

Reference: OpenSSF Scorecard, SLSA 1.0 specification, CISA SBOM guidance.

### Zero Trust Architecture

Core principles per NIST SP 800-207:

1. **Never trust, always verify** — Authenticate and authorize every request regardless of network location
2. **Assume breach** — Design as if the attacker is already inside the perimeter
3. **Least-privilege access** — Grant minimum permissions for minimum duration
4. **Micro-segmentation** — Isolate workloads; enforce east-west traffic controls
5. **Continuous verification** — Re-evaluate trust based on device posture, user behavior, and context
6. **Encrypt everything** — mTLS for service-to-service; TLS for client-to-service
7. **Comprehensive logging** — Log all access decisions for audit and anomaly detection

**Seven pillars:** Identity, Devices, Networks, Applications, Data, Infrastructure, Analytics/Visibility.

Implementation: Start with identity (strong MFA + SSO), then device trust (MDM + posture checks), then micro-segmentation, then continuous monitoring.

Reference: NIST SP 800-207, DoD Zero Trust Reference Architecture, CISA Zero Trust Maturity Model.

---

## Anti-Patterns & Pitfalls

### 1. Hardcoded Secrets in Source Code
**Why dangerous:** Secrets in Git history persist forever, even after deletion. Bots scrape public repositories for AWS keys within minutes of exposure.
**Consequence:** The 2022 Uber breach started with hardcoded credentials in a PowerShell script. AWS key exposure costs companies an average of $28,000 per incident.
**Fix:** Use environment variables, secrets managers (Vault, AWS Secrets Manager), and pre-commit hooks (git-secrets, gitleaks).

### 2. Trusting Client-Side Validation Only
**Why dangerous:** Attackers bypass the browser entirely using curl, Postman, or custom scripts. Client validation is UX, not security.
**Consequence:** SQL injection, XSS, and business logic bypasses in production despite "validated" forms.
**Fix:** Always validate and sanitize server-side. Treat all client input as untrusted.

### 3. Rolling Your Own Cryptography
**Why dangerous:** Cryptographic primitives have subtle implementation requirements. Timing attacks, padding oracles, and nonce reuse can silently break security.
**Consequence:** Homebrew encryption has led to complete data exposure in numerous breaches. ECB mode usage leaked data patterns in the Adobe breach (153 million records).
**Fix:** Use well-audited libraries (libsodium, OpenSSL, Web Crypto API). Use high-level APIs (NaCl secretbox, AES-GCM).

### 4. Excessive Permissions and Privilege Creep
**Why dangerous:** Over-privileged accounts amplify blast radius when compromised. Cloud IAM policies with `*:*` permissions grant full account access.
**Consequence:** The Capital One breach (2019) exploited an overly permissive IAM role to access 100+ million records.
**Fix:** Enforce least privilege. Use IAM Access Analyzer. Conduct quarterly access reviews. Time-bound elevated access (just-in-time).

### 5. Ignoring Dependency Vulnerabilities
**Why dangerous:** 80%+ of modern application code comes from dependencies. A single vulnerable transitive dependency can compromise the entire application.
**Consequence:** Log4Shell (CVE-2021-44228) affected virtually every Java application. The event-stream npm compromise injected a cryptocurrency stealer.
**Fix:** Enable automated SCA scanning (Snyk, Dependabot, Socket). Monitor advisories. Update promptly. Generate and audit SBOMs.

### 6. Missing or Inadequate Logging
**Why dangerous:** Without logs, breaches go undetected for months. The average time to identify a breach is 194 days (IBM Cost of a Data Breach 2024).
**Consequence:** Attackers operate undetected, exfiltrating data over extended periods.
**Fix:** Log authentication events, access control decisions, input validation failures, and administrative actions. Centralize in SIEM. Set up alerting.

### 7. Using Outdated or Deprecated Protocols
**Why dangerous:** TLS 1.0/1.1, SSLv3, and weak cipher suites have known exploits (POODLE, BEAST, CRIME).
**Consequence:** Man-in-the-middle attacks; PCI DSS non-compliance; data interception.
**Fix:** Enforce TLS 1.2+ (prefer 1.3). Disable weak ciphers. Test with SSL Labs (aim for A+ rating). Enable HSTS.

### 8. SQL Injection via String Concatenation
**Why dangerous:** Directly embedding user input in SQL queries allows arbitrary database commands.
**Consequence:** Remains the most exploited web vulnerability class. The Heartland Payment Systems breach (2008) compromised 130 million cards via SQL injection.
**Fix:** Use parameterized queries or prepared statements exclusively. Use ORMs. Never concatenate user input into queries.

### 9. Storing Passwords in Plaintext or Weak Hashes
**Why dangerous:** MD5 and SHA-1 are fast hashes designed for integrity, not password storage. Modern GPUs crack billions of MD5 hashes per second.
**Consequence:** The RockYou breach exposed 32 million plaintext passwords. LinkedIn breach (2012) exposed SHA-1 hashed passwords, which were rapidly cracked.
**Fix:** Use Argon2id, bcrypt, or scrypt with appropriate work factors. Never use MD5, SHA-1, or unsalted hashes for passwords.

### 10. Overly Permissive CORS Configuration
**Why dangerous:** `Access-Control-Allow-Origin: *` with credentials allows any site to make authenticated requests to your API.
**Consequence:** Cross-origin data theft, session hijacking, unauthorized API access.
**Fix:** Allowlist specific origins. Never reflect the `Origin` header without validation. Never combine `*` with `credentials: true`.

### 11. Disabling Security Features for "Convenience"
**Why dangerous:** Turning off CSRF protection, disabling TLS verification, or using `--no-verify` in Git bypasses critical safeguards.
**Consequence:** CSRF attacks, MITM attacks, malicious code pushed past security hooks.
**Fix:** Fix the root cause instead of disabling protections. Document any temporary exceptions with expiration dates.

### 12. Improper Error Handling (Fail Open)
**Why dangerous:** When authentication or authorization checks fail with an exception, "fail open" designs grant access by default.
**Consequence:** Authentication bypass, authorization escalation, data exposure during outages.
**Fix:** Always fail closed. Wrap security checks in try/catch that defaults to deny. Test error paths explicitly.

### 13. Blindly Trusting AI-Generated Code
**Why dangerous:** Research shows 86% of AI-generated code fails XSS defenses (Veracode 2025). LLMs optimize for "working" code, not secure code.
**Consequence:** Validation shortcuts, insecure defaults, missing `await` on security checks (race conditions), and injection vulnerabilities.
**Fix:** Review all AI-generated code for security. Run SAST on AI outputs. Treat AI code with the same scrutiny as junior developer code.

---

## Testing Strategy

### SAST (Static Application Security Testing)

| Tool | Strengths | Languages | Pricing |
|---|---|---|---|
| **Semgrep** | Fast (10s median CI scans), transparent YAML rules, customizable | 40+ languages | Free CE; Teams $35/dev/mo |
| **CodeQL** | Semantic analysis, low false positives, GitHub-native | C/C++, C#, Go, Java, JS/TS, Python | Free for public repos; GHAS for private |
| **SonarQube** | Quality + security combined, broad ecosystem | 30+ languages | Community Edition free; Developer $150/yr |
| **Snyk Code** | Real-time IDE scanning, AI-powered fixes, unified platform | 15+ languages | Free tier; Teams $25/dev/mo |

**Recommendation:** Run Semgrep in CI on every PR for speed; use CodeQL for deep analysis on merges to main.

### DAST (Dynamic Application Security Testing)

| Tool | Use Case | Key Feature |
|---|---|---|
| **OWASP ZAP** | Open-source DAST | Active/passive scanning, API scanning, CI integration |
| **Burp Suite Pro** | Manual + automated testing | Crawler, intruder, repeater; gold standard for pen testers |
| **Nuclei** | Template-based scanning | 8000+ community templates; fast; CI-friendly |

### SCA (Software Composition Analysis)

| Tool | Strengths | Integration |
|---|---|---|
| **Snyk** | Deep vulnerability database, fix PRs, container + IaC scanning | GitHub, GitLab, CI/CD, IDEs |
| **Dependabot** | GitHub-native, automated PRs for updates | GitHub Actions |
| **Socket** | Detects supply chain attacks (typosquatting, install scripts) | npm, PyPI; GitHub App |
| **Trivy** | All-in-one (SCA + container + IaC + SBOM) | CLI, CI/CD, Kubernetes |

### Penetration Testing Methodology

Follow OWASP Testing Guide v4.2 or PTES:
1. **Reconnaissance** — Subdomain enumeration, port scanning, technology fingerprinting
2. **Mapping** — Identify attack surface, authentication flows, API endpoints
3. **Discovery** — Automated scanning + manual testing for OWASP Top 10
4. **Exploitation** — Validate findings with proof-of-concept; assess business impact
5. **Reporting** — Risk-rated findings with reproduction steps, evidence, and remediation
6. **Retest** — Verify fixes after remediation

Frequency: Annual pen test minimum; continuous for high-risk applications. Engage CREST or OSCP-certified testers.

### Security Unit Testing Patterns

- Test authentication bypass (missing tokens, expired tokens, tampered tokens)
- Test authorization boundary (user A accessing user B's resources)
- Test input validation (SQL injection payloads, XSS vectors, path traversal)
- Test rate limiting (verify 429 responses after threshold)
- Test CSRF token validation (missing, invalid, reused tokens)
- Test error handling (verify no stack traces or internal details in responses)

### Bug Bounty Programs

Platforms: HackerOne, Bugcrowd, Intigriti.
- Define clear scope (in-scope domains, out-of-scope areas)
- Start with a private program (invite-only) before going public
- Set competitive bounty ranges ($500-$50,000+ based on severity)
- Provide a safe harbor clause in your vulnerability disclosure policy
- Response SLA: triage within 48 hours; remediation timeline by severity

---

## Performance Considerations

### Security vs. Performance Tradeoffs

| Security Feature | Performance Impact | Mitigation |
|---|---|---|
| TLS encryption | 1-2ms latency per handshake | TLS 1.3 (1-RTT), session resumption, 0-RTT for repeat connections |
| Password hashing (Argon2id) | 100-500ms per hash | Offload to async workers; tune cost parameters to target ~250ms |
| JWT validation | Microseconds (symmetric) to ~1ms (asymmetric) | Cache public keys; use symmetric HMAC for internal services |
| Input validation | Negligible for most patterns | Avoid catastrophic regex backtracking (ReDoS); use RE2 engine |
| WAF inspection | 1-5ms per request | Tune rules to minimize false positives; bypass for health checks |

### Rate Limiting Implementation

**Token Bucket:**
- Tokens added at fixed rate; each request consumes one token
- Allows controlled bursts up to bucket capacity
- Best for: APIs needing burst tolerance with a sustained average limit
- Implementation: Redis + Lua script for atomic operations

**Sliding Window Log:**
- Track timestamps of all requests in the window
- Most accurate but highest memory usage
- Best for: strict per-user fairness requirements

**Sliding Window Counter:**
- Hybrid of fixed window and sliding window
- Weighted count from current and previous window
- Best for: balance of accuracy and memory efficiency

**Best practice:** Implement at API gateway level (Kong, Envoy, AWS API Gateway). Use per-user + per-endpoint limits. Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.

### WAF Configuration Without Blocking Legitimate Traffic

- Start in detection mode (log-only) for 2-4 weeks before enforcement
- Tune rules based on false positive analysis of logged traffic
- Allowlist known-good patterns (e.g., specific Content-Types, internal IPs)
- Use managed rule sets (AWS WAF Managed Rules, Cloudflare OWASP) as baseline
- Create custom rules for application-specific threats
- Monitor false positive rate and adjust; target < 0.1% false positives

### TLS Performance Optimization

- **TLS 1.3:** 1-RTT handshake (vs 2-RTT in 1.2); 0-RTT for resumed sessions
- **Cipher selection:** Prefer AES-128-GCM (faster than AES-256 with negligible security difference for most use cases); use ChaCha20-Poly1305 for mobile clients without AES-NI
- **OCSP Stapling:** Eliminate client-side certificate revocation check latency
- **Session tickets:** Enable for TLS 1.2; TLS 1.3 handles resumption natively
- **Hardware acceleration:** Ensure servers have AES-NI support; use kernel TLS (kTLS) for offloading
- **Certificate chain:** Minimize intermediate certificates; keep chain short

Reference: Mozilla SSL Configuration Generator, Qualys SSL Labs best practices.

---

## Security Considerations (Deep Dive)

### Secrets Management

**HashiCorp Vault:**
- Dynamic secrets with automatic rotation (database credentials, cloud IAM)
- Transit secrets engine for encryption-as-a-service
- Kubernetes Vault Secrets Operator for pod injection without persistent storage
- Best for: multi-cloud, large-scale, dynamic secret requirements
- Requires operational expertise and dedicated platform team

**AWS Secrets Manager:**
- Native AWS integration; automatic rotation for RDS, Redshift, DocumentDB
- Cross-account sharing via resource policies
- Best for: AWS-only environments wanting zero operational overhead
- Limitation: rotation for non-AWS services requires custom Lambda functions

**SOPS (Secrets OPerationS):**
- Encrypts values in-place within YAML, JSON, ENV, INI files
- Integrates with AWS KMS, GCP KMS, Azure Key Vault, age, PGP
- Best for: GitOps workflows, small teams, static secrets in version control
- Limitation: no dynamic secrets or automatic rotation

**2025 Best Practice:** Eliminate long-lived secrets where possible. Use Workload Identity Federation, cloud IAM roles, and short-lived tokens. For remaining secrets, use Vault or cloud-native secrets managers with External Secrets Operator for Kubernetes bridging.

### Certificate Management and Rotation

- Automate certificate issuance with ACME protocol (Let's Encrypt, ZeroSSL)
- Use cert-manager in Kubernetes for automatic TLS certificate lifecycle
- Set certificate lifetime to 90 days maximum (Let's Encrypt default)
- Monitor certificate expiry with alerting at 30, 14, and 7 days
- Use Certificate Transparency (CT) logs to detect unauthorized certificates for your domains
- Implement CAA DNS records to restrict which CAs can issue certificates

### Container Security

**Image Security:**
- Use distroless or Alpine base images (minimal attack surface)
- Scan images with Trivy, Grype, or Snyk Container in CI pipeline
- Never use `latest` tag; pin to digest for reproducibility
- Multi-stage builds to exclude build tools from runtime image

**Runtime Security:**
- Deploy Falco (CNCF graduated project) for syscall-based threat detection
- Alert on: shell spawned in production container, unexpected network connections, file modifications in read-only containers
- Use Seccomp profiles to restrict available system calls
- Apply AppArmor or SELinux profiles for mandatory access control
- Run containers read-only (`readOnlyRootFilesystem: true`)

**Registry Security:**
- Use private registries with access control and vulnerability scanning on push
- Sign images with cosign (Sigstore); verify signatures at admission (Kyverno, Connaisseur)
- Enable content trust / image signing policies

### Cloud Security Posture Management (CSPM)

- Tools: Wiz, Prisma Cloud, AWS Security Hub, Prowler (open source)
- Continuously assess cloud configurations against CIS Benchmarks
- Monitor for: public S3 buckets, open security groups, unencrypted databases, excessive IAM permissions
- Automate remediation for critical findings (e.g., auto-close public S3 buckets)

### Incident Response Planning

Per NIST SP 800-61 Rev. 3 (finalized April 2025):

**Preparation Phase:**
- Govern: Establish IR policy, define roles (incident commander, triage, comms)
- Identify: Asset inventory, threat intelligence feeds, risk assessment
- Protect: Hardening, patching, backup verification, tabletop exercises

**Response Phase:**
- Detect: SIEM alerting, endpoint detection (EDR), network monitoring
- Respond: Contain (isolate affected systems), eradicate (remove threat), communicate (stakeholders, legal, regulators)
- Recover: Restore from backups, verify integrity, monitor for recurrence

**Post-Incident:**
- Conduct blameless post-mortem within 72 hours
- Update playbooks based on lessons learned
- Report to relevant authorities within regulatory timeframes (72 hours for GDPR)

### Compliance Frameworks

| Framework | Scope | Key Requirements |
|---|---|---|
| **SOC 2** | SaaS/cloud service providers | 5 Trust Service Criteria: security, availability, processing integrity, confidentiality, privacy |
| **GDPR** | EU personal data | Consent, right to erasure, DPIAs, 72-hour breach notification, Data Protection Officer |
| **HIPAA** | US healthcare data (PHI) | Access controls, audit logs, encryption, BAAs with vendors, breach notification |
| **PCI DSS v4.0** | Payment card data | Network segmentation, encryption, vulnerability management, access control, logging, annual pen test |
| **ISO 27001** | Information security management | Risk assessment, Annex A controls, continuous improvement, annual audits |

**Cross-framework mapping:** ISO 27001 controls overlap significantly with SOC 2 and GDPR, enabling efficient multi-framework compliance. Use automation platforms (Vanta, Drata, Sprinto) for continuous compliance monitoring.

---

## Integration Patterns

### Security in CI/CD Pipelines (Shift-Left Security)

```
commit → pre-commit hooks → build → test → deploy → monitor
  │         │                  │       │       │        │
  │    gitleaks/git-secrets  Semgrep  DAST   Checkov  Falco
  │    (secrets detection)   CodeQL   ZAP    cosign   SIEM
  │                          Trivy          Kyverno
  │                          (SCA+SBOM)
```

**Pipeline stages:**
1. **Pre-commit:** Secret detection (gitleaks), linting (eslint-plugin-security)
2. **Build:** SAST (Semgrep), SCA (Trivy), license compliance
3. **Test:** DAST (ZAP), security unit tests, contract tests
4. **Pre-deploy:** IaC scanning (Checkov), image scanning (Trivy), SBOM generation
5. **Deploy:** Image signature verification (Kyverno), admission control
6. **Runtime:** Monitoring (Falco), log aggregation, anomaly detection

**2025-2026 trend:** "Shift smart" over "shift left" — focus on actionable, contextual findings rather than flooding developers with low-impact alerts. Prioritize reachability analysis and exploit probability.

### SIEM Integration

| Platform | Strengths | Best For |
|---|---|---|
| **Splunk** | Mature ecosystem, SOAR capabilities | Large enterprises, complex correlation |
| **ELK Stack** (Elastic) | Open source, flexible, cost-effective | Mid-size teams, custom dashboards |
| **Datadog Security** | Unified observability + security | DevOps-centric teams, cloud-native |
| **Microsoft Sentinel** | Azure-native, AI-driven analytics | Azure-heavy environments |

Key integration points: application logs, WAF logs, authentication events, container runtime events, cloud audit trails, vulnerability scan results.

### Identity Providers

| Provider | Strengths | Best For |
|---|---|---|
| **Auth0** (Okta) | Developer experience, extensive SDKs, adaptive MFA | SaaS applications |
| **Keycloak** | Open source, self-hosted, full OIDC/SAML | On-prem or sovereignty requirements |
| **Okta Workforce** | Enterprise SSO, lifecycle management | Large enterprise IAM |
| **AWS Cognito** | AWS-native, user pools + federated identities | AWS-centric applications |

Best practice: Never build authentication from scratch. Use a proven IdP. Externalize authentication to reduce attack surface.

### API Gateway Security Patterns

- **Authentication termination:** Validate tokens at the gateway; pass verified claims to backends
- **Rate limiting:** Enforce at gateway to protect all downstream services
- **Request/response validation:** Schema validation against OpenAPI spec at gateway
- **mTLS termination:** Gateway handles TLS; internal traffic can use mTLS or service mesh
- **IP allowlisting/blocklisting:** First line of defense at gateway level
- Tools: Kong, Envoy, AWS API Gateway, Cloudflare API Shield

### Service Mesh Security (mTLS)

- **Istio / Linkerd / Cilium:** Automatic mTLS between all services in the mesh
- Zero-trust networking: every service-to-service call authenticated and encrypted
- **Authorization policies:** Define which services can communicate (equivalent to network policies at L7)
- **Certificate rotation:** Handled automatically by mesh control plane (typically every 24 hours)
- **Observability:** Mesh provides encrypted traffic visibility without application changes

---

## DevOps & Deployment (DevSecOps)

### Container Hardening

**Distroless Images:**
- Contain only the application and runtime dependencies
- No shell, no package manager, no utilities — attacker cannot spawn a shell or install tools
- Available for: Java, Python, Node.js, Go, .NET, Rust (gcr.io/distroless)

**Rootless Containers:**
- Run container daemon and containers as non-root user
- Container breakout less likely to yield root-on-host
- Supported in Docker 20.10+, Podman (default), containerd

**Hardening Checklist:**
- Drop all capabilities: `securityContext.capabilities.drop: ["ALL"]`
- Add back only needed caps (rare): e.g., `NET_BIND_SERVICE`
- Read-only root filesystem: `readOnlyRootFilesystem: true`
- No privilege escalation: `allowPrivilegeEscalation: false`
- Run as non-root: `runAsNonRoot: true; runAsUser: 65534`
- Resource limits: set CPU and memory limits to prevent resource exhaustion

### Kubernetes Security

**Pod Security Standards (PSS):**
- **Privileged:** Unrestricted (only for system-level workloads)
- **Baseline:** Prevents known privilege escalations; suitable for most workloads
- **Restricted:** Hardened best practices; recommended for security-sensitive applications

Enforce via Pod Security Admission (built-in since K8s 1.25) at namespace level:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

**Network Policies:**
- Default deny all ingress and egress traffic
- Explicitly allow required communication paths
- Use Cilium Network Policies for L7 (HTTP, gRPC) filtering
- Enforce DNS policies to prevent data exfiltration via DNS

**RBAC:**
- Avoid `cluster-admin` for application workloads
- Use namespace-scoped Roles over ClusterRoles
- Audit RBAC with `kubectl auth can-i --list` and rbac-lookup tool
- Disable anonymous authentication to the API server

**Secrets:**
- Enable encryption at rest for etcd (EncryptionConfiguration)
- Use External Secrets Operator to sync from Vault/AWS Secrets Manager
- Never store secrets in ConfigMaps or environment variables in pod specs

### Infrastructure Security Scanning

| Tool | Scope | Status (2026) |
|---|---|---|
| **Checkov** | Terraform, CloudFormation, K8s, Helm, Docker | Active; 1000+ built-in rules; graph-based analysis |
| **Trivy** (successor to tfsec) | Terraform, K8s, Docker, CloudFormation, ARM | Active; absorbed tfsec rule library in 2024 |
| **KICS** | Terraform, CloudFormation, Ansible, Docker, K8s | Active; Checkmarx-maintained |
| **Terrascan** | (archived Nov 2025) | Migrate to Checkov, KICS, or Trivy |

**Implementation:** Run Checkov or Trivy in CI on every PR for IaC changes. Fail the build on HIGH/CRITICAL findings. Suppress known false positives with inline annotations.

### Runtime Protection

- **Falco:** Kernel-level syscall monitoring; detect anomalous behavior (unexpected process execution, file access, network connections)
- **eBPF-based tools:** Tetragon (Cilium), Tracee (Aqua) — lower overhead than kernel modules
- **Read-only filesystems:** Detect unauthorized file modifications
- **Network monitoring:** Detect unexpected outbound connections (C2 callbacks, data exfiltration)
- **Drift detection:** Alert when running container diverges from its image

### Audit Logging and Monitoring

**What to log (per OWASP Logging Cheat Sheet):**
- Authentication successes and failures
- Authorization failures (access denied)
- Input validation failures
- Application errors and exceptions
- Administrative operations (user creation, permission changes)
- Data access for sensitive resources

**Log format:** Structured JSON with timestamp, severity, user ID, source IP, action, resource, result, correlation ID.

**Retention:** Per compliance requirements (SOC 2: 1 year, PCI DSS: 1 year, HIPAA: 6 years, GDPR: as needed for purpose).

**Monitoring:** Set up alerts for brute-force attempts (>5 failed logins), privilege escalation, anomalous data access patterns, and security scan failures in CI.

---

## Decision Trees

### Which Authentication Method?

```
Is this a consumer-facing application?
├── Yes
│   ├── High security (banking, healthcare)?
│   │   ├── Yes → WebAuthn/Passkeys (primary) + MFA fallback (TOTP)
│   │   └── No → Social login (OIDC) + optional passkey enrollment
│   └── Mobile-first?
│       ├── Yes → Passkeys (synced) + biometric local auth
│       └── No → Email magic link + optional passkey enrollment
├── No (B2B / Enterprise)
│   ├── Enterprise SSO required?
│   │   ├── Yes → SAML 2.0 / OIDC federation with customer IdP
│   │   └── No → OIDC with your IdP (Auth0, Keycloak, Okta)
│   └── Machine-to-machine?
│       ├── Yes → OAuth 2.1 Client Credentials + mTLS or signed JWTs
│       └── No → API keys (low sensitivity) or OAuth 2.1 (high sensitivity)
└── Privileged / Admin access?
    └── Always → Hardware security key (FIDO2) + session time limits
```

### Which Secrets Management Solution?

```
What is your infrastructure?
├── AWS-only, small team, no dynamic secrets needed?
│   └── AWS Secrets Manager (zero ops overhead, native rotation for AWS services)
├── Multi-cloud or hybrid?
│   ├── Have a platform team to operate it?
│   │   ├── Yes → HashiCorp Vault (dynamic secrets, transit engine, multi-cloud)
│   │   └── No → Managed Vault (HCP Vault) or Infisical (SaaS)
│   └── Using GitOps with static secrets?
│       └── SOPS + cloud KMS (encrypt in-repo, decrypt at deploy)
├── Kubernetes-native?
│   └── External Secrets Operator + backend (Vault, AWS SM, GCP SM)
└── Small project / MVP?
    └── Environment variables in CI/CD (GitHub Secrets, GitLab CI vars)
    └── Migrate to proper secrets manager before production
```

### When to Use WAF vs. Application-Level Security?

```
What is the threat?
├── Generic web attacks (SQLi, XSS, known CVE exploits)?
│   └── WAF (first line of defense) + application validation (defense in depth)
├── Business logic attacks (account takeover, price manipulation)?
│   └── Application-level security (WAF cannot understand business logic)
├── DDoS / volumetric attacks?
│   └── WAF + CDN (Cloudflare, AWS Shield) at network edge
├── API abuse (scraping, credential stuffing)?
│   └── WAF rate limiting + application-level bot detection + CAPTCHA
├── Zero-day / targeted attacks?
│   └── WAF (virtual patching for quick mitigation) + application fix (permanent)
└── Compliance requirement (PCI DSS, etc.)?
    └── WAF required by compliance + application security (both mandatory)

Rule of thumb: WAF is a safety net, not a replacement for secure code.
Application-level security is always required. WAF adds defense in depth.
```

---

## Code Examples

### 1. Parameterized SQL Queries (Preventing Injection)

```python
# WRONG - SQL injection vulnerability
def get_user_bad(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)  # Attacker input: ' OR '1'='1

# CORRECT - Parameterized query
def get_user_safe(username):
    query = "SELECT * FROM users WHERE username = %s"
    cursor.execute(query, (username,))  # Driver handles escaping
    return cursor.fetchone()

# CORRECT - Using an ORM (SQLAlchemy)
def get_user_orm(username):
    return db.session.query(User).filter(User.username == username).first()
```

### 2. Password Hashing with Argon2id

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher(
    time_cost=3,        # Number of iterations
    memory_cost=65536,   # 64 MB memory usage
    parallelism=4,       # Parallel threads
    hash_len=32,         # Output hash length
    salt_len=16          # Salt length
)

def hash_password(password: str) -> str:
    return ph.hash(password)  # Salt generated automatically

def verify_password(stored_hash: str, password: str) -> bool:
    try:
        ph.verify(stored_hash, password)
        # Check if rehash needed (params changed)
        if ph.check_needs_rehash(stored_hash):
            return True  # Signal caller to update stored hash
        return True
    except VerifyMismatchError:
        return False
```

### 3. Secure JWT Handling (Node.js)

```javascript
const jose = require('jose');

// WRONG - common JWT mistakes
// 1. Using 'none' algorithm
// 2. Not validating issuer/audience
// 3. Accepting both symmetric and asymmetric algorithms

// CORRECT - Secure JWT verification
async function verifyToken(token) {
  const JWKS = jose.createRemoteJWKS(
    new URL('https://auth.example.com/.well-known/jwks.json')
  );

  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: 'https://auth.example.com',   // Validate issuer
    audience: 'https://api.example.com',   // Validate audience
    algorithms: ['RS256'],                  // Restrict algorithms explicitly
    maxTokenAge: '15 minutes',              // Enforce max age
    clockTolerance: '30 seconds',           // Allow minor clock skew
  });

  return payload;
}

// CORRECT - Token creation with short expiry
async function createToken(userId, privateKey) {
  return new jose.SignJWT({ sub: userId, scope: 'read write' })
    .setProtectedHeader({ alg: 'RS256', kid: 'key-2025-03' })
    .setIssuer('https://auth.example.com')
    .setAudience('https://api.example.com')
    .setIssuedAt()
    .setExpirationTime('15m')  // Short-lived access token
    .setJti(crypto.randomUUID())  // Unique token ID for revocation
    .sign(privateKey);
}
```

### 4. Content Security Policy Headers

```javascript
// Express.js middleware - strict CSP
const helmet = require('helmet');

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'strict-dynamic'"],  // strict-dynamic for nonce-based
    styleSrc: ["'self'", "'unsafe-inline'"],     // Consider nonces for styles too
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'", "https://api.example.com"],
    frameSrc: ["'none'"],                         // Prevent clickjacking
    objectSrc: ["'none'"],                        // Block plugins
    baseUri: ["'self'"],                          // Prevent base tag hijacking
    formAction: ["'self'"],                       // Restrict form submissions
    upgradeInsecureRequests: [],                  // Force HTTPS
  },
}));

// Additional security headers
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.noSniff());  // X-Content-Type-Options: nosniff
```

### 5. Input Validation with Schema (TypeScript / Zod)

```typescript
import { z } from 'zod';

// Define strict schema for user registration
const UserRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')  // Prevent bcrypt DoS (72-byte limit)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  username: z.string()
    .min(3).max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only alphanumeric, underscore, hyphen allowed'),
  role: z.enum(['user', 'editor']),  // Allowlist — never accept 'admin' from client
});

// Usage in Express route
app.post('/api/register', async (req, res) => {
  const result = UserRegistrationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      // Return field errors, never expose internal details
      details: result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  const validated = result.data;  // Typed, validated, transformed
  // ... proceed with registration
});
```

---

*Researched: 2026-03-07 | Sources: [OWASP Top 10:2021](https://owasp.org/Top10/2021/), [OWASP Top 10:2025](https://owasp.org/Top10/2025/), [NIST SP 800-207 Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final), [NIST SP 800-61r3 Incident Response](https://csrc.nist.gov/pubs/sp/800/61/r3/final), [NIST Implementing ZTA](https://pages.nist.gov/zero-trust-architecture/), [Sigstore](https://www.sigstore.dev), [SLSA Framework](https://slsa.dev), [OpenSSF](https://openssf.org), [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/), [CNCF Falco](https://falco.org), [Semgrep](https://semgrep.dev), [Snyk](https://snyk.io), [Trivy](https://trivy.dev), [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/), [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks), [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org), [JWT Best Practices (Curity)](https://curity.io/resources/learn/jwt-best-practices/)*
