# Threat Modeling — Security Expertise Module

> Audience: AI agents performing threat modeling during planning and design phases.
> Scope: Methodologies, tools, vulnerability catalogs, compliance mapping, and code examples.
> Sources: OWASP, NIST SP 800-154, Microsoft SDL, Shostack Four-Question Framework,
> MITRE ATT&CK, IBM Cost of a Data Breach 2025, Security Compass, Threagile, pytm.

---

## 1. Threat Landscape

### 1.1 Why Threat Modeling Matters

Threat modeling is the structured process of identifying, quantifying, and addressing
security threats to a system. It belongs in the earliest design phases — before code is
written — because architectural flaws are orders of magnitude more expensive to fix
after deployment than during design.

**Key statistics (IBM Cost of a Data Breach Report 2025):**

- Average cost of a data breach: **$4.88 million** globally.
- Organizations with high DevSecOps adoption saved **$1.13 million** per breach.
- AI and automation in prevention workflows yield **$2.2 million** in savings.
- Incident response planning saves **$1.23 million** on average.
- Encryption lowers breach costs by approximately **$360,000**.
- Organizations using threat intelligence saved **$211,906** per breach.

**ROI of threat modeling (Security Compass):**

A 2-hour threat modeling session that prevents a design flaw requiring 100 hours of
refactoring results in $10,000 saved for a $200 investment — an ROI of 4,900%.
A system without threat modeling faces roughly a 20% annual probability of a $500K breach.

### 1.2 Breaches That Threat Modeling Would Have Prevented

| Breach | Year | Root Cause | Threat Model Gap |
|---|---|---|---|
| Equifax | 2017 | Unpatched Apache Struts, flat network | No network segmentation model; no patch-management threat identified |
| Capital One | 2019 | Misconfigured WAF/firewall in AWS | No cloud trust-boundary analysis; SSRF not modeled |
| SolarWinds | 2020 | Compromised build pipeline | No supply-chain threat model; build integrity not in scope |
| Target | 2013 | HVAC vendor credential compromise | Third-party trust boundary missing; lateral movement unmodeled |
| Uber | 2016 | Hardcoded AWS keys in GitHub repo | No secrets-in-code threat; no data flow for CI/CD assets |
| Log4Shell | 2021 | JNDI injection in Log4j | Deserialization/injection threat absent from library DFD |

Each of these incidents involved architectural or design-level weaknesses that a
structured threat model — applied during the design phase — would have surfaced.

---

## 2. Core Security Principles

### 2.1 Think Like an Attacker

Adopt an adversarial mindset. For every component, ask: "How would I abuse this?"
Consider both external attackers and malicious insiders.

### 2.2 Identify Trust Boundaries

A trust boundary exists wherever the level of trust changes — between a public network
and a private subnet, between a user's browser and the API gateway, between
microservices in different security domains. Every trust boundary crossing is a
potential attack surface.

### 2.3 Map Data Flows

Document how data moves through the system: ingress points, processing stages,
storage locations, and egress points. Use Data Flow Diagrams (DFDs) at minimum.
Classify data by sensitivity (public, internal, confidential, restricted).

### 2.4 Enumerate Threats Systematically

Use a structured methodology (STRIDE, PASTA, LINDDUN) rather than ad-hoc
brainstorming. Structured approaches ensure coverage and repeatability.

### 2.5 Prioritize by Risk

Risk = Likelihood x Impact. Use a consistent scoring model:

| Likelihood | Description |
|---|---|
| 5 — Almost Certain | Exploit is publicly available, no auth required |
| 4 — Likely | Known vulnerability, moderate skill needed |
| 3 — Possible | Requires insider knowledge or chained exploits |
| 2 — Unlikely | Requires significant resources or zero-day |
| 1 — Rare | Theoretical, no known exploit path |

| Impact | Description |
|---|---|
| 5 — Critical | Full system compromise, mass data exfiltration |
| 4 — High | Significant data loss, major service disruption |
| 3 — Moderate | Limited data exposure, partial service impact |
| 2 — Low | Minor information leak, degraded performance |
| 1 — Negligible | No data loss, cosmetic impact only |

Risk Score = Likelihood x Impact. Scores 15-25: immediate mitigation required.
Scores 8-14: planned mitigation. Scores 1-7: accept with documentation.

### 2.6 Mitigate or Accept with Documentation

Every identified threat must have a disposition: mitigate (implement control),
transfer (insurance, SLA), accept (documented risk acceptance with sign-off),
or avoid (remove the feature/component).

---

## 3. Implementation Patterns

### 3.1 STRIDE Methodology

Developed by Microsoft. Maps six threat categories to system components.

| Category | Threat | Property Violated | Example |
|---|---|---|---|
| **S**poofing | Impersonating a user or system | Authentication | Attacker uses stolen JWT to call API as admin |
| **T**ampering | Modifying data in transit or at rest | Integrity | Man-in-the-middle alters API response payloads |
| **R**epudiation | Denying an action occurred | Non-repudiation | User disputes a financial transaction; no audit log exists |
| **I**nformation Disclosure | Exposing data to unauthorized parties | Confidentiality | Database backup stored in public S3 bucket |
| **D**enial of Service | Making system unavailable | Availability | Amplification attack floods API gateway |
| **E**levation of Privilege | Gaining unauthorized access level | Authorization | IDOR allows regular user to access admin endpoints |

**How to apply STRIDE:**

1. Draw a DFD of the system (processes, data stores, data flows, external entities).
2. For each element in the DFD, walk through all six STRIDE categories.
3. For each applicable threat, document: threat description, attack vector,
   affected component, risk score, and proposed mitigation.
4. Review with development and security teams.

### 3.2 PASTA — Process for Attack Simulation and Threat Analysis

PASTA is a seven-stage risk-centric methodology that connects technical threats
to business impact. Developed by VerSprite.

**Stage 1 — Define Objectives:**
Identify business objectives, security requirements, compliance mandates
(HIPAA, GDPR, PCI-DSS), and data classification of assets in scope.

**Stage 2 — Define Technical Scope:**
Inventory all components: servers, databases, APIs, third-party services,
network segments, cloud resources. Map the full technology stack.

**Stage 3 — Application Decomposition / Data Flow Analysis:**
Create DFDs, identify trust boundaries, enumerate entry points,
map data flows across components.

**Stage 4 — Threat Analysis:**
Identify threats using threat intelligence feeds, MITRE ATT&CK,
CAPEC attack patterns, and analyst expertise. Correlate threats
with the attack surface identified in stages 2-3.

**Stage 5 — Vulnerability Analysis:**
Map known vulnerabilities (CVEs) to system components. Perform
vulnerability scanning. Correlate vulnerabilities with threats from stage 4.

**Stage 6 — Attack Modeling and Simulation:**
Build attack trees. Identify viable attack paths by mapping vulnerabilities
to threat scenarios. Simulate attacks to validate exploitability.

**Stage 7 — Risk and Impact Analysis:**
Quantify business impact of each viable attack path. Calculate residual risk.
Prioritize countermeasures by risk-adjusted ROI. Produce actionable
remediation plan with owners and deadlines.

### 3.3 LINDDUN — Privacy Threat Modeling

LINDDUN focuses specifically on privacy threats. Essential for GDPR, HIPAA,
and CCPA compliance.

| Category | Privacy Threat |
|---|---|
| **L**inkability | Ability to link two or more items of interest related to a data subject |
| **I**dentifiability | Ability to identify a data subject from a data set |
| **N**on-repudiation | Inability to deny having performed an action (privacy concern) |
| **D**etectability | Ability to detect whether an item of interest exists |
| **D**isclosure of information | Exposure of personal data to unauthorized parties |
| **U**nawareness | Data subject is unaware of data collection and processing |
| **N**on-compliance | Failure to comply with legislation, regulations, or policy |

**When to use LINDDUN:** Any system that processes personal data, health records,
financial information, or operates under privacy regulations.

### 3.4 Data Flow Diagrams (DFDs)

DFDs are the foundational artifact of threat modeling. Use standard notation:

```
Element Symbols:
  [External Entity]    = Rectangle       (users, third-party systems)
  (Process)            = Circle           (application logic, services)
  [=Data Store=]       = Parallel lines   (databases, file systems, caches)
  --> Data Flow -->     = Arrow            (HTTP request, DB query, message)
  --- Trust Boundary -- = Dashed line      (network perimeter, auth boundary)
```

**Levels of DFD detail:**

- **Level 0 (Context):** Single process, all external entities, major data flows.
- **Level 1 (System):** Major subsystems decomposed, trust boundaries shown.
- **Level 2 (Component):** Individual services, databases, queues, caches.

### 3.5 Attack Trees

Formalized by Bruce Schneier (1999). Attack trees model the goal of an attacker
as the root node and decompose it into sub-goals using AND/OR logic.

```
Root: Steal User Credentials
├── OR: Phishing Attack
│   ├── AND: Craft convincing email
│   └── AND: Host fake login page
├── OR: Credential Stuffing
│   ├── AND: Obtain breached credential list
│   └── AND: Automate login attempts
├── OR: SQL Injection on Login Form
│   └── AND: Find unparameterized query
└── OR: Intercept Network Traffic
    ├── AND: Perform ARP spoofing
    └── AND: Capture TLS-downgraded session
```

Assign attributes to leaf nodes: cost, time, skill level, detectability.
Propagate values up: OR nodes take the minimum (easiest path);
AND nodes take the sum (all steps required).

### 3.6 Threat Modeling for APIs

APIs are the primary attack surface in modern architectures. Key threats:

1. **Broken Object Level Authorization (BOLA):** Accessing other users' resources
   by manipulating object IDs in API calls.
2. **Broken Authentication:** Weak token validation, missing rate limiting on auth
   endpoints, token leakage in URLs or logs.
3. **Excessive Data Exposure:** API returns full object when client only needs
   subset of fields. Sensitive fields leak to unauthorized consumers.
4. **Lack of Rate Limiting:** No throttling enables brute-force, credential
   stuffing, and denial-of-service attacks.
5. **Mass Assignment:** API accepts and binds parameters the client should not
   control (e.g., `role`, `isAdmin`).
6. **SSRF via API:** API fetches user-supplied URLs without validation, enabling
   access to internal services and metadata endpoints.

### 3.7 Threat Modeling for Microservices

Microservices amplify the attack surface through inter-service communication,
distributed data stores, and dynamic service discovery.

**Unique microservices threats:**

- **Service-to-service impersonation:** Without mTLS, any pod can call any service.
- **Lateral movement:** Compromising one service grants network access to others.
- **Data inconsistency attacks:** Exploiting eventual consistency windows.
- **Sidecar proxy bypass:** Direct container-to-container calls skip Envoy/Istio policies.
- **Container escape:** Breaking out of container isolation to host OS.
- **Supply chain (base image) compromise:** Malicious layers in container images.
- **Secrets sprawl:** Each microservice needs credentials; more services = more secrets.

**Mitigations:** Zero-trust networking (mTLS everywhere), network policies
(Kubernetes NetworkPolicy or Calico), service mesh authorization policies,
runtime security (Falco), image scanning (Trivy, Grype), secrets management
(Vault, AWS Secrets Manager).

### 3.8 Lightweight Threat Modeling — The Four-Question Framework

Developed by Adam Shostack, endorsed by the Threat Modeling Manifesto.
Suitable for agile teams and rapid iteration.

**The Four Questions:**

1. **What are we working on?**
   Draw a diagram. Identify components, data flows, trust boundaries.

2. **What can go wrong?**
   Use STRIDE, kill chains, or brainstorming. Focus on realistic threats.

3. **What are we going to do about it?**
   For each threat: mitigate, accept, transfer, or avoid. Assign owners.

4. **Did we do a good enough job?**
   Review completeness. Test assumptions. Update after changes.

This framework can be completed in a 60-90 minute session and produces
actionable results for a single feature or service.

### 3.9 Threat Modeling as Code

Treat threat models as version-controlled artifacts alongside source code.
Benefits: diffable, reviewable in PRs, CI/CD integration, automated updates.

Tools: Threagile (YAML), pytm (Python), HCL-TM (Terraform-native).

---

## 4. Vulnerability Catalog

### 4.1 Common Threats by Component

#### Web Server / Reverse Proxy

| # | Threat | STRIDE | Risk | Mitigation |
|---|---|---|---|---|
| 1 | TLS downgrade attack | Information Disclosure | High | Enforce TLS 1.2+, HSTS with preload, disable weak ciphers |
| 2 | HTTP request smuggling | Tampering | Critical | Normalize parsing between proxy and backend, reject ambiguous requests |
| 3 | Directory traversal via path manipulation | Information Disclosure | High | Chroot web root, canonicalize paths, deny `..` sequences |

#### Database

| # | Threat | STRIDE | Risk | Mitigation |
|---|---|---|---|---|
| 4 | SQL injection | Tampering, Info Disclosure | Critical | Parameterized queries exclusively, WAF rules, least-privilege DB accounts |
| 5 | Unencrypted data at rest | Information Disclosure | High | TDE or application-level encryption, KMS-managed keys |
| 6 | Excessive privileges on service account | Elevation of Privilege | High | Principle of least privilege, separate read/write accounts |

#### API Gateway

| # | Threat | STRIDE | Risk | Mitigation |
|---|---|---|---|---|
| 7 | Missing rate limiting enables DDoS | Denial of Service | High | Token bucket rate limiter, per-client quotas, WAF integration |
| 8 | JWT algorithm confusion (none/HS256 vs RS256) | Spoofing | Critical | Enforce algorithm in server config, reject `alg: none` |
| 9 | API key leaked in client-side code | Spoofing | High | Use OAuth2 flows, rotate keys, monitor for leaked credentials |

#### Authentication Service

| # | Threat | STRIDE | Risk | Mitigation |
|---|---|---|---|---|
| 10 | Credential stuffing | Spoofing | High | Rate limiting, CAPTCHA, breached-password checking (HaveIBeenPwned API) |
| 11 | Session fixation | Spoofing | Medium | Regenerate session ID after authentication, bind to client fingerprint |
| 12 | Missing MFA | Spoofing | High | Enforce TOTP/WebAuthn for sensitive operations |

#### File Storage (S3, GCS, Azure Blob)

| # | Threat | STRIDE | Risk | Mitigation |
|---|---|---|---|---|
| 13 | Public bucket misconfiguration | Information Disclosure | Critical | Block public access by default, SCPs/org policies, continuous scanning |
| 14 | Unrestricted file upload (web shell) | Elevation of Privilege | Critical | Validate MIME type + magic bytes, store outside web root, virus scan |

#### Message Queue (Kafka, RabbitMQ, SQS)

| # | Threat | STRIDE | Risk | Mitigation |
|---|---|---|---|---|
| 15 | Message injection / poisoning | Tampering | High | Schema validation, message signing (HMAC), consumer input validation |

---

## 5. Security Checklist

Use this checklist when conducting a threat modeling session.

### Preparation
- [ ] Identify the system or feature in scope
- [ ] Gather architectural documentation, deployment diagrams, API specs
- [ ] Identify stakeholders: architect, developer, security engineer, product owner
- [ ] Choose methodology (STRIDE for security, LINDDUN for privacy, PASTA for risk)
- [ ] Schedule 60-90 minute session

### During the Session
- [ ] Draw or validate the Data Flow Diagram (DFD)
- [ ] Mark all trust boundaries on the DFD
- [ ] Classify data flows by sensitivity (public, internal, confidential, restricted)
- [ ] Walk through each DFD element against chosen threat categories
- [ ] For each identified threat, document: description, attack vector, affected component
- [ ] Score each threat: Likelihood (1-5) x Impact (1-5) = Risk Score
- [ ] Identify existing controls that already mitigate each threat
- [ ] Determine residual risk after existing controls
- [ ] Assign disposition: mitigate, accept, transfer, or avoid
- [ ] For mitigations: define specific countermeasures with owners and deadlines

### Post-Session
- [ ] Document the threat model in version control
- [ ] Create tickets/issues for all mitigations with risk-based priority
- [ ] Review threat model with stakeholders who could not attend
- [ ] Validate that mitigations are implemented before release
- [ ] Schedule periodic review (quarterly or on major architecture changes)
- [ ] Update threat model after any security incident
- [ ] Cross-reference with compliance requirements (PCI-DSS, HIPAA, SOC 2)
- [ ] Verify DFD accuracy matches deployed architecture
- [ ] Check for new threats from updated threat intelligence feeds
- [ ] Archive threat model artifacts with version and date

---

## 6. Tools and Automation

### 6.1 Microsoft Threat Modeling Tool

- **Platform:** Windows desktop application (free).
- **Methodology:** STRIDE-based.
- **Features:** DFD drawing canvas, auto-generated threat list based on element types,
  customizable threat templates, HTML/CSV report generation.
- **Best for:** Teams in Microsoft ecosystem, Azure-hosted applications.
- **Limitations:** Windows-only, limited CI/CD integration, manual process.

### 6.2 OWASP Threat Dragon

- **Platform:** Cross-platform desktop app and web application (free, open source).
- **Features:** DFD and STRIDE-per-element analysis, threat rule engine, JSON model
  storage (Git-friendly), integration with GitHub/GitLab for model storage.
- **Best for:** Teams wanting an open-source, cross-platform visual tool.
- **Repository:** https://github.com/OWASP/threat-dragon

### 6.3 IriusRisk

- **Platform:** SaaS and on-premises (commercial).
- **Features:** Questionnaire-driven threat identification, rules engine, integration
  with Jira/Azure DevOps/Jenkins, import from Microsoft TMT, library of threat
  patterns, compliance mapping (PCI-DSS, HIPAA, GDPR).
- **Best for:** Enterprise teams needing compliance automation and workflow integration.

### 6.4 Threagile — Threat Modeling as Code

- **Platform:** Cross-platform CLI, Docker image (free, open source).
- **Input:** YAML model file checked into version control.
- **Features:** 40+ built-in risk rules, custom rule support, generates PDF/Excel
  risk reports, risk tracking, data flow diagrams, CI/CD pipeline integration.
- **Best for:** DevSecOps teams wanting threat models in the same repo as code.
- **Repository:** https://github.com/Threagile/threagile

### 6.5 pytm — Pythonic Threat Modeling

- **Platform:** Python 3, cross-platform (free, open source, OWASP project).
- **Input:** Python source file defining the architecture model.
- **Features:** Auto-generates DFDs (via Graphviz), sequence diagrams, and threat
  reports. Extensible threat library. Elements: TM, Server, ExternalEntity,
  Datastore, Actor, Process, Dataflow, Boundary, Lambda.
- **Best for:** Developer-centric teams comfortable with Python.
- **Repository:** https://github.com/OWASP/pytm

### 6.6 draw.io Templates

- **Platform:** Browser-based, desktop app, VS Code extension (free).
- **Usage:** Use the built-in "Threat Modeling" shape library or import
  custom stencils for DFD notation. Export as XML (diffable in Git).
- **Best for:** Quick visual threat models without dedicated tooling.

---

## 7. Platform-Specific Guidance

### 7.1 Web Application Threat Model Template

```
SYSTEM: E-commerce Web Application
TRUST BOUNDARIES:
  TB1: Internet <-> WAF/CDN
  TB2: WAF <-> Application Load Balancer
  TB3: ALB <-> Application Servers (private subnet)
  TB4: Application Servers <-> Database (isolated subnet)
  TB5: Application Servers <-> Payment Gateway (external API)

KEY THREATS:
  1. XSS via user-generated content    -> CSP, output encoding, DOMPurify
  2. CSRF on state-changing actions     -> SameSite cookies, CSRF tokens
  3. SQL injection on search/filter     -> Parameterized queries, ORM
  4. Session hijacking                  -> Secure/HttpOnly cookies, short TTL
  5. Payment data interception          -> TLS 1.3, PCI-DSS tokenization
  6. Account takeover via cred stuffing -> Rate limiting, MFA, breached-pw check
  7. Admin panel exposure               -> IP allowlist, separate auth, MFA
```

### 7.2 Mobile Application Threat Model

```
SYSTEM: Mobile Banking App (iOS + Android)
TRUST BOUNDARIES:
  TB1: Device <-> Cellular/WiFi network
  TB2: Network <-> API Gateway
  TB3: API Gateway <-> Backend Services
  TB4: Backend <-> Core Banking System

KEY THREATS:
  1. Reverse engineering of app binary  -> Code obfuscation, root/jailbreak detection
  2. Insecure local data storage        -> iOS Keychain / Android Keystore, no plaintext
  3. Man-in-the-middle on public WiFi   -> Certificate pinning, TLS 1.2+
  4. Screenshot/screen recording leak   -> Redact sensitive views in app switcher
  5. Biometric bypass                   -> Server-side validation, fallback to PIN
  6. Deep link hijacking                -> Validate deep link schemes, use App Links
  7. Push notification data leakage     -> No sensitive data in notification payload
```

### 7.3 API Threat Model

```
SYSTEM: RESTful API with OAuth2
TRUST BOUNDARIES:
  TB1: Public Internet <-> API Gateway
  TB2: API Gateway <-> Microservices
  TB3: Microservices <-> Databases
  TB4: Microservices <-> Third-party APIs

KEY THREATS:
  1. BOLA (IDOR)                       -> Object-level authorization checks
  2. Broken function-level auth         -> Role-based endpoint access control
  3. Mass assignment                   -> Explicit allowlists for bindable fields
  4. Excessive data exposure           -> Response filtering, field-level permissions
  5. SSRF via URL parameters           -> URL validation, deny internal ranges
  6. GraphQL query depth attack         -> Query depth/complexity limits
  7. API versioning exposure           -> Deprecate and remove old versions
  8. Rate limiting bypass              -> Distributed rate limiting (Redis-backed)
```

### 7.4 Microservices Threat Model

```
SYSTEM: Kubernetes-based Microservices Platform
TRUST BOUNDARIES:
  TB1: Internet <-> Ingress Controller
  TB2: Ingress <-> Service Mesh (Istio/Envoy)
  TB3: Service Mesh <-> Individual Pods
  TB4: Pods <-> Managed Databases (VPC peering)
  TB5: Pods <-> External SaaS APIs

KEY THREATS:
  1. Service impersonation              -> mTLS via service mesh, SPIFFE identities
  2. Lateral movement post-compromise   -> Network policies, microsegmentation
  3. Container escape                   -> Seccomp profiles, no privileged containers
  4. Image supply chain attack          -> Signed images (cosign), admission controllers
  5. Secrets in environment variables   -> External secrets operator, Vault integration
  6. Sidecar proxy bypass               -> Strict mTLS mode, deny direct pod access
  7. Resource exhaustion (noisy neighbor)-> Resource quotas, pod disruption budgets
  8. etcd data exposure                 -> Encrypt etcd at rest, restrict API server access
```

### 7.5 Cloud Infrastructure Threat Model

```
SYSTEM: AWS Multi-Account Landing Zone
TRUST BOUNDARIES:
  TB1: Internet <-> Public subnets (ALB, CloudFront)
  TB2: Public subnets <-> Private subnets (app tier)
  TB3: Private subnets <-> Isolated subnets (data tier)
  TB4: AWS Account A <-> AWS Account B (cross-account)
  TB5: AWS <-> On-premises (VPN/Direct Connect)

KEY THREATS:
  1. IAM privilege escalation           -> SCPs, permission boundaries, least privilege
  2. S3 bucket misconfiguration         -> S3 Block Public Access, bucket policies
  3. Metadata service (IMDS) abuse      -> IMDSv2 required, hop limit = 1
  4. Cross-account role assumption      -> External ID requirement, condition keys
  5. CloudTrail tampering               -> Org trail, log file validation, S3 MFA delete
  6. VPC flow log gaps                  -> Enable all subnets, central logging account
  7. KMS key policy misconfiguration    -> Key policies + IAM, no wildcard principals
```

---

## 8. Incident Patterns

### 8.1 Using Threat Models for Incident Response

When an incident occurs, the threat model is a critical response accelerant:

1. **Rapid scoping:** The DFD immediately shows which components, data flows,
   and trust boundaries are affected by the compromised component.
2. **Impact assessment:** Data classification in the threat model tells responders
   what data may have been exposed and its sensitivity level.
3. **Lateral movement prediction:** Trust boundary analysis reveals which
   adjacent systems the attacker could pivot to.
4. **Control validation:** The threat model documents expected controls;
   responders can quickly check which controls failed.
5. **Communication template:** The threat model's asset inventory feeds
   regulatory notification (which data, which users, which jurisdictions).

### 8.2 Post-Incident Threat Model Updates

After every security incident, update the threat model:

1. **Add the realized threat** to the catalog if it was not previously modeled.
2. **Recalibrate risk scores** — the threat is now "proven," so likelihood increases.
3. **Document the actual attack path** and compare it to modeled attack trees.
4. **Identify blind spots** — which DFD elements, trust boundaries, or data flows
   were missing from the model?
5. **Update mitigations** — document the controls that were added post-incident.
6. **Share lessons learned** — feed findings into the organization's threat library
   so other teams benefit.
7. **Re-run automated rules** (Threagile/pytm) against the updated model to
   check for newly introduced risks from incident response changes.

---

## 9. Compliance and Standards

### 9.1 NIST SP 800-154 — Guide to Data-Centric System Threat Modeling

NIST 800-154 provides a four-step data-centric threat modeling approach:

1. **Identify and characterize** the system and data of interest.
2. **Identify and select** the attack vectors to be included in the model.
3. **Characterize the security controls** for mitigating the attack vectors.
4. **Analyze the threat model** — determine likelihood and impact, calculate risk.

Key principle: Focus on protecting specific data types rather than only system
components. This complements component-centric methods like STRIDE.

### 9.2 OWASP Threat Modeling

OWASP provides multiple resources:

- **Threat Modeling Cheat Sheet** — concise guidance for developers.
- **Threat Modeling Manifesto** — values and principles for the discipline.
- **OWASP Threat Dragon** — open-source modeling tool.
- **pytm** — programmatic threat modeling framework.
- **OWASP Top 10** — threat catalog for web applications.
- **OWASP API Security Top 10** — threat catalog for APIs.

### 9.3 PCI-DSS Threat Assessment

PCI-DSS v4.0 requires threat-informed risk assessment:

- **Requirement 6.3:** Identify and manage security vulnerabilities through
  a vulnerability management program informed by threat intelligence.
- **Requirement 6.5:** Address common coding vulnerabilities (informed by
  threat modeling of payment flows).
- **Requirement 11.3:** Penetration testing scope informed by threat model.
- **Requirement 12.2:** Risk assessment at least annually and upon significant
  changes; threat modeling feeds directly into this requirement.

Threat models for PCI-DSS must cover: cardholder data flows, segmentation
boundaries, payment channel trust boundaries, and third-party processor
connections.

### 9.4 ISO 27001 Risk Assessment

ISO 27001:2022 Clause 6.1.2 requires organizations to:

- Define a risk assessment process that identifies risks to confidentiality,
  integrity, and availability.
- Identify risk owners.
- Assess the likelihood and consequences of identified risks.
- Determine risk treatment options.

Threat modeling satisfies these requirements when:
- The DFD maps to the ISO 27001 asset inventory.
- STRIDE categories align with CIA triad properties.
- Risk scores map to the organization's risk criteria.
- Threat dispositions map to ISO 27001 Annex A controls.

### 9.5 SOC 2 and Threat Modeling

SOC 2 Trust Services Criteria (CC3.2) requires risk assessment that includes
identification of threats. A documented threat model demonstrates:
- Systematic threat identification methodology.
- Risk scoring and prioritization.
- Mitigation tracking.
- Periodic review and update cadence.

---

## 10. Code Examples

### 10.1 Threagile YAML Model

```yaml
# threagile.yaml — Threat Model for Web Application
threagile_version: 1.0.0

title: E-Commerce Platform Threat Model
date: 2026-03-08
author:
  name: Security Team
  homepage: https://internal.example.com/security

business_criticality: critical

management_summary_comment: >
  This threat model covers the e-commerce platform including
  the web frontend, API gateway, order service, payment service,
  and PostgreSQL database.

business_overview:
  description: Online retail platform processing customer orders and payments.
  images: []

technical_overview:
  description: >
    React SPA served via CDN, API Gateway (Kong), microservices on
    Kubernetes, PostgreSQL on RDS, Redis cache, Stripe payment integration.
  images: []

questions:
  How are secrets managed?: >
    AWS Secrets Manager with automatic rotation. No environment variables.
  How is inter-service auth handled?: >
    mTLS via Istio service mesh with SPIFFE identities.

abuse_cases:
  Credential Stuffing: >
    Attacker uses breached credential lists to attempt login
    via the /api/auth/login endpoint at high volume.
  Payment Fraud: >
    Attacker manipulates order total by tampering with client-side
    price data before checkout submission.

security_requirements:
  Input Validation: All API inputs validated against OpenAPI schema.
  Authentication: OAuth2 + PKCE for SPA, API keys for service-to-service.
  Encryption: TLS 1.3 in transit, AES-256 at rest for PII.

# --- Data Assets ---
data_assets:
  Customer PII:
    id: customer-pii
    usage: business
    quantity: many
    confidentiality: confidential
    integrity: critical
    availability: operational
    justification_cia_rating: >
      Names, emails, addresses used for order fulfillment.

  Payment Tokens:
    id: payment-tokens
    usage: business
    quantity: many
    confidentiality: strictly-confidential
    integrity: mission-critical
    availability: important
    justification_cia_rating: >
      Stripe tokenized payment references. No raw card data stored.

  Order Data:
    id: order-data
    usage: business
    quantity: many
    confidentiality: internal
    integrity: critical
    availability: operational

# --- Technical Assets ---
technical_assets:
  API Gateway:
    id: api-gateway
    type: process
    usage: business
    used_as_client_by_human: false
    out_of_scope: false
    technology: api-gateway
    internet: true
    machine: container
    encryption: none
    multi_tenant: false
    redundant: true
    data_assets_processed:
      - customer-pii
      - order-data
    data_assets_stored: []
    data_formats_accepted:
      - json

  Order Service:
    id: order-service
    type: process
    usage: business
    technology: web-service-rest
    internet: false
    machine: container
    encryption: none
    multi_tenant: false
    data_assets_processed:
      - customer-pii
      - order-data
    data_assets_stored: []

  PostgreSQL Database:
    id: postgres-db
    type: datastore
    usage: business
    technology: database
    internet: false
    machine: virtual
    encryption: transparent
    multi_tenant: false
    data_assets_stored:
      - customer-pii
      - order-data
      - payment-tokens

# --- Trust Boundaries ---
trust_boundaries:
  Internet Boundary:
    id: internet-boundary
    type: network-cloud-provider
    technical_assets_inside:
      - api-gateway
    trust_boundaries_nested: []

  Internal Network:
    id: internal-network
    type: network-dedicated-hoster
    technical_assets_inside:
      - order-service
      - postgres-db
    trust_boundaries_nested: []
```

Run with:
```bash
docker run --rm -v "$(pwd)":/app/work threagile/threagile \
  -verbose -model /app/work/threagile.yaml -output /app/work/output
```

### 10.2 pytm Python Threat Model

```python
#!/usr/bin/env python3
"""Threat model for a web application using OWASP pytm."""

from pytm import (
    TM, Actor, Boundary, Dataflow, Datastore,
    ExternalEntity, Lambda, Process, Server,
)

# --- Define the Threat Model ---
tm = TM("E-Commerce Platform")
tm.description = "Threat model for an online retail platform"
tm.isOrdered = True
tm.mergeResponses = True

# --- Trust Boundaries ---
internet = Boundary("Internet")
dmz = Boundary("DMZ")
internal = Boundary("Internal Network")
data_tier = Boundary("Data Tier")

# --- Actors and External Entities ---
customer = Actor("Customer")
customer.inBoundary = internet

payment_provider = ExternalEntity("Stripe API")
payment_provider.inBoundary = internet

# --- Servers and Processes ---
cdn = Server("CDN / WAF")
cdn.inBoundary = dmz
cdn.OS = "Linux"
cdn.isHardened = True

api_gw = Server("API Gateway")
api_gw.inBoundary = dmz
api_gw.OS = "Linux"
api_gw.isHardened = True
api_gw.sanitizesInput = True
api_gw.encodesOutput = True

order_svc = Process("Order Service")
order_svc.inBoundary = internal
order_svc.handlesResources = True
order_svc.sanitizesInput = True

auth_svc = Process("Auth Service")
auth_svc.inBoundary = internal
auth_svc.handlesResources = True
auth_svc.implementsAuthenticationScheme = True
auth_svc.authorizesSource = True

# --- Data Stores ---
user_db = Datastore("User Database")
user_db.inBoundary = data_tier
user_db.isEncrypted = True
user_db.isSQL = True
user_db.isSigned = False

order_db = Datastore("Order Database")
order_db.inBoundary = data_tier
order_db.isEncrypted = True
order_db.isSQL = True

cache = Datastore("Redis Cache")
cache.inBoundary = internal
cache.isEncrypted = False
cache.isSQL = False

# --- Data Flows ---
customer_to_cdn = Dataflow(customer, cdn, "HTTPS Request")
customer_to_cdn.protocol = "HTTPS"
customer_to_cdn.isEncrypted = True

cdn_to_gw = Dataflow(cdn, api_gw, "Filtered Request")
cdn_to_gw.protocol = "HTTPS"
cdn_to_gw.isEncrypted = True

gw_to_auth = Dataflow(api_gw, auth_svc, "Auth Check")
gw_to_auth.protocol = "gRPC"
gw_to_auth.isEncrypted = True

gw_to_orders = Dataflow(api_gw, order_svc, "Order Request")
gw_to_orders.protocol = "gRPC"
gw_to_orders.isEncrypted = True

auth_to_db = Dataflow(auth_svc, user_db, "User Lookup")
auth_to_db.protocol = "PostgreSQL"
auth_to_db.isEncrypted = True

orders_to_db = Dataflow(order_svc, order_db, "Order CRUD")
orders_to_db.protocol = "PostgreSQL"
orders_to_db.isEncrypted = True

orders_to_cache = Dataflow(order_svc, cache, "Cache Read/Write")
orders_to_cache.protocol = "Redis"
orders_to_cache.isEncrypted = False

orders_to_stripe = Dataflow(order_svc, payment_provider, "Payment Request")
orders_to_stripe.protocol = "HTTPS"
orders_to_stripe.isEncrypted = True

if __name__ == "__main__":
    tm.process()
```

Generate outputs:
```bash
# Data Flow Diagram
python3 tm.py --dfd | dot -Tpng -o dfd.png

# Sequence Diagram
python3 tm.py --seq | dot -Tpng -o seq.png

# Threat Report
python3 tm.py --report threats.html
```

### 10.3 DFD Template (Text-Based)

```
+------------------------------------------------------------------+
|                        INTERNET (Untrusted)                       |
|  [User Browser]  [Mobile App]  [Third-Party Webhook]              |
+--------|-----------------|--------------------|------------------+
         |  HTTPS          |  HTTPS              |  HTTPS
- - - - -|- - - - - - - - -|- - - - - - - - - - -|- - - - - - - - -
         |           TRUST BOUNDARY: DMZ                            |
         v                 v                     v
   (WAF / CDN) -------> (API Gateway) <----- (Webhook Receiver)
         |                 |                     |
- - - - -|- - - - - - - - -|- - - - - - - - - - -|- - - - - - - - -
         |       TRUST BOUNDARY: Internal Network                   |
         v                 v                     v
   (Static Assets)  (Auth Service)         (Event Processor)
                          |                     |
                          v                     v
                   [=User DB=]           [=Event Queue=]
                                               |
- - - - - - - - - - - - - - - - - - - - - - - -|- - - - - - - - - -
                   TRUST BOUNDARY: Data Tier    |
                                               v
                                        [=Analytics DB=]
```

### 10.4 Threat Model Report Template

```markdown
# Threat Model Report

## Metadata
- **System:** [Name]
- **Version:** [Architecture version]
- **Date:** [YYYY-MM-DD]
- **Author(s):** [Names]
- **Methodology:** [STRIDE / PASTA / LINDDUN]
- **Review Status:** [Draft / Reviewed / Approved]

## System Description
[Brief description of the system, its purpose, and key users.]

## Architecture Diagram
[Embed or link DFD — Level 0 and Level 1 minimum.]

## Data Classification
| Data Asset | Classification | Regulations |
|---|---|---|
| [Asset name] | [Public/Internal/Confidential/Restricted] | [GDPR/PCI/HIPAA/None] |

## Trust Boundaries
| ID | Boundary | Components Inside | Components Outside |
|---|---|---|---|
| TB1 | [Name] | [List] | [List] |

## Threat Catalog
| ID | Threat | STRIDE Category | Component | Likelihood | Impact | Risk Score | Mitigation | Status | Owner |
|---|---|---|---|---|---|---|---|---|---|
| T001 | [Description] | [S/T/R/I/D/E] | [Component] | [1-5] | [1-5] | [1-25] | [Control] | [Open/Mitigated/Accepted] | [Name] |

## Risk Summary
- **Critical (20-25):** [Count] threats
- **High (15-19):** [Count] threats
- **Medium (8-14):** [Count] threats
- **Low (1-7):** [Count] threats

## Assumptions and Exclusions
- [List assumptions made during modeling]
- [List components or threats explicitly excluded and why]

## Action Items
| Priority | Action | Owner | Deadline | Ticket |
|---|---|---|---|---|
| [Critical/High/Medium/Low] | [Description] | [Name] | [Date] | [JIRA-123] |

## Revision History
| Version | Date | Author | Changes |
|---|---|---|---|
```

### 10.5 Example: Complete Threat Model for a Login Flow

```
SYSTEM: User Authentication Flow
SCOPE: Login endpoint, session management, password reset

DATA FLOW:
  User -> [HTTPS] -> API Gateway -> [gRPC/mTLS] -> Auth Service -> [TLS] -> User DB
  Auth Service -> [TLS] -> Redis (session store)
  Auth Service -> [HTTPS] -> Email Service (password reset)

THREATS:
  T001: Credential stuffing on /api/auth/login
    Category: Spoofing
    Likelihood: 5 (public endpoint, automated tools readily available)
    Impact: 4 (account takeover, data access)
    Risk: 20 (Critical)
    Mitigation: Rate limiting (10 req/min per IP), CAPTCHA after 3 failures,
                breached-password check via k-anonymity API, account lockout
                after 10 failures with exponential backoff.

  T002: Session token theft via XSS
    Category: Information Disclosure
    Likelihood: 3 (requires XSS vulnerability in application)
    Impact: 4 (session hijacking, account takeover)
    Risk: 12 (Medium)
    Mitigation: HttpOnly + Secure + SameSite=Strict cookies,
                Content-Security-Policy header, session binding to
                client fingerprint (IP + User-Agent hash).

  T003: Password reset token brute-force
    Category: Spoofing
    Likelihood: 2 (tokens are 128-bit random)
    Impact: 4 (account takeover)
    Risk: 8 (Medium)
    Mitigation: Cryptographically random tokens (min 128 bits),
                15-minute expiry, single-use, rate limit reset requests.

  T004: Timing attack on login response
    Category: Information Disclosure
    Likelihood: 3 (measurable over network with statistical analysis)
    Impact: 2 (username enumeration)
    Risk: 6 (Low)
    Mitigation: Constant-time password comparison, identical response
                for valid/invalid usernames, same response time.

  T005: Missing audit trail for login events
    Category: Repudiation
    Likelihood: 4 (if logging is not implemented)
    Impact: 3 (inability to investigate incidents)
    Risk: 12 (Medium)
    Mitigation: Log all auth events (success, failure, lockout, reset)
                with timestamp, IP, user-agent, user ID. Ship to SIEM.
                Retain for 90 days minimum.
```

---

## References

- OWASP Threat Modeling Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
- OWASP Threat Modeling Project: https://owasp.org/www-project-threat-modeling/
- NIST SP 800-154 (Draft): https://csrc.nist.gov/pubs/sp/800/154/ipd
- Shostack, A. "Threat Modeling: Designing for Security" (Wiley, 2014)
- Schneier, B. "Attack Trees" (Dr. Dobb's Journal, 1999): https://www.schneier.com/academic/archives/1999/12/attack_trees.html
- PASTA Threat Modeling: https://versprite.com/blog/what-is-pasta-threat-modeling/
- LINDDUN Privacy Threat Modeling: https://linddun.org/
- Threagile: https://github.com/Threagile/threagile
- OWASP pytm: https://github.com/OWASP/pytm
- OWASP Threat Dragon: https://github.com/OWASP/threat-dragon
- IBM Cost of a Data Breach 2025: https://www.ibm.com/reports/data-breach
- Security Compass — Threat Modeling ROI: https://www.securitycompass.com/blog/measuring-threat-modeling-roi/
- MITRE ATT&CK: https://attack.mitre.org/
- Threat Modeling Manifesto: https://www.threatmodelingmanifesto.org/
