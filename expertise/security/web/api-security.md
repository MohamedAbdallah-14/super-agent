# API Security — Comprehensive Expertise Module

> **Purpose:** Reference for AI agents during planning and implementation to secure APIs by default.
> **Last updated:** 2026-03-08
> **Sources:** OWASP API Security Top 10 2023, real-world breaches 2021-2025, NIST, PCI DSS 4.0

---

## 1. Threat Landscape

### 1.1 Scale

APIs are the dominant attack surface. In Q1 2025, 99% of surveyed organizations experienced at
least one API security issue. BOLA and injection attacks made up over one-third of all incidents.
India saw a 3,000% increase in API cyberattacks in Q3 2024 (271M+ attacks). Akamai reported
~26 billion credential stuffing attempts monthly in 2024.

### 1.2 OWASP API Security Top 10 2023

| # | Risk | Key Concern |
|---|------|-------------|
| API1 | Broken Object Level Authorization (BOLA) | Accessing other users' objects by ID manipulation |
| API2 | Broken Authentication | Weak/missing auth on API endpoints |
| API3 | Broken Object Property Level Authorization | Excessive data exposure + mass assignment |
| API4 | Unrestricted Resource Consumption | No rate limiting / resource quotas |
| API5 | Broken Function Level Authorization | Unauthorized access to admin functions |
| API6 | Unrestricted Access to Sensitive Business Flows | Automated abuse of business logic |
| API7 | Server Side Request Forgery (SSRF) | Fetching attacker-controlled URLs from server |
| API8 | Security Misconfiguration | Missing hardening, verbose errors, open CORS |
| API9 | Improper Inventory Management | Shadow/zombie APIs, undocumented endpoints |
| API10 | Unsafe Consumption of APIs | Trusting third-party API responses without validation |

### 1.3 Real-World Breaches

**Optus (Sep 2022) — Unauthenticated API, 10M records.** Endpoint `api.www.optus.com.au`
was publicly accessible since 2019 due to a coding error. Customer IDs were sequential
(predictable IDOR). No rate limiting. Attackers scraped names, DOBs, passport and license
numbers. Root causes: no auth, predictable IDs, no rate limiting.
*(Source: ACMA filings, Salt Security)*

**Peloton (May 2021) — BOLA, 3M users exposed.** API allowed unauthenticated requests for
user data regardless of privacy settings. Initial fix only required authentication but still let any
user access any other user's data — trading API2 (Broken Auth) for API1 (BOLA).
*(Source: Pen Test Partners, TechCrunch)*

**T-Mobile (Jan 2023) — API abuse, 37M records.** Attackers exploited a vulnerable API for 6
weeks (Nov 2022 - Jan 2023), extracting names, billing addresses, emails, phone numbers, DOBs,
and account numbers. Root causes: insufficient monitoring, weak access controls.
*(Source: Krebs on Security, BleepingComputer)*

**Dell (May 2024) — Partner portal API, 49M records.** Attackers registered fake partner
accounts (approved in 24-48h without verification), then scraped by generating service tags at
5,000 req/min for 3 weeks. No rate limiting, no per-tag authorization.
*(Source: BleepingComputer, Salt Security)*

**DeepSeek (Jan 2025) — Open database via API.** ClickHouse database publicly accessible
without authentication. Over 1M log entries exposed including chat histories, API keys, backend
details. Anyone could execute SQL queries directly.
*(Source: Wiz Research)*

### 1.4 Attack Trends

- BOLA remains #1 since 2019, appearing in ~40% of all API attacks
- Automated API abuse (scraping, credential stuffing) is the fastest-growing vector
- Shadow/zombie APIs are a blind spot — organizations average 3x more APIs than inventoried
- Supply chain attacks through third-party API consumption are emerging
- AI-powered attack tools are lowering the barrier for API exploitation

---

## 2. Core Security Principles

### 2.1 Authentication

| Method | Use Case | Key Risk |
|--------|----------|----------|
| API Keys | Service-to-service identification | Not true auth — identifies, doesn't authenticate. Easily leaked |
| OAuth 2.0 + OIDC | User-facing apps, delegated access | Complex to implement correctly |
| JWT (Bearer) | Stateless API auth | Algorithm confusion attacks (CVE-2024-54150). Must pin algorithm |
| mTLS | Service mesh, zero-trust internal | Certificate management overhead |

**Rule:** API keys are NOT authentication. Always combine with OAuth/JWT for sensitive operations.

### 2.2 Authorization at Every Endpoint

- Implement checks at object level, not just endpoint level (prevents BOLA)
- Never rely on client-supplied object IDs without verifying ownership
- Use RBAC/ABAC consistently; authorization logic must live server-side

### 2.3 Input Validation

- Validate all input against strict schemas (type, length, format, range)
- Allowlists over denylists; validate Content-Type headers; reject unexpected fields

### 2.4 Rate Limiting

- Per user/key, per IP, and per endpoint; stricter for auth endpoints
- Return `429` with `Retry-After` header; graduated response: warn, throttle, block, alert

### 2.5 Response Filtering

- Never return more data than needed; explicit response schemas with allowlisted fields
- Strip internal IDs, debug info, stack traces from production responses

### 2.6 API Versioning Security

- Deprecate old versions on clear timelines; max 2 active versions
- Old versions often lack security fixes — enforce migration

---

## 3. Implementation Patterns

### 3.1 JWT Validation Middleware (TypeScript)

```typescript
// VULNERABLE: No algorithm enforcement, no signature verification
const decoded = jwt.decode(token); // DANGEROUS: decode without verify
req.user = decoded;
```

```typescript
// SECURE: Full JWT validation with algorithm pinning
import jwt, { JwtPayload } from 'jsonwebtoken';

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), publicKey, {
      algorithms: ['RS256'],          // Pin algorithm — prevents confusion attacks
      issuer: 'https://auth.example.com',
      audience: 'https://api.example.com',
      clockTolerance: 30,
      complete: true,
    }) as { payload: JwtPayload };
    if (!decoded.payload.sub) return res.status(401).json({ error: 'Missing subject' });
    req.user = {
      id: decoded.payload.sub,
      scopes: decoded.payload.scope?.split(' ') ?? [],
    };
    next();
  } catch (err) {
    const msg = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}
```

### 3.2 OAuth 2.0 Scope Enforcement

```typescript
function requireScopes(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const has = req.user?.scopes ?? [];
    if (!required.every(s => has.includes(s))) {
      return res.status(403).json({ error: 'Insufficient scope', required });
    }
    next();
  };
}
router.delete('/users/:id', requireScopes('users:delete', 'admin'), deleteUser);
```

### 3.3 Rate Limiting (Token Bucket with Redis)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 15 * 60 * 1000, max: 10,  // 10 attempts per 15 min
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
});
// Standard limit for data endpoints
const apiLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 1000, max: 100,      // 100 req/min per user
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
});
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);
```

### 3.4 Input Validation with Zod (Mass Assignment Prevention)

```typescript
// VULNERABLE: Passes raw body to ORM — mass assignment
app.post('/api/users', (req, res) => { db.users.create(req.body); });
```

```typescript
// SECURE: Strict schema validation
import { z } from 'zod';
const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(100),
  password: z.string().min(12).max(128),
}).strict(); // Rejects unexpected fields — prevents mass assignment

app.post('/api/users', validateBody(CreateUserSchema), async (req, res) => {
  const user = await db.users.create({
    ...req.validatedBody,
    role: 'user',       // Server-controlled, never from input
    isAdmin: false,     // Server-controlled, never from input
  });
  res.status(201).json(toPublicUser(user));
});
```

### 3.5 BOLA Prevention

```typescript
// VULNERABLE: Any authenticated user can see any order
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  res.json(order);
});
```

```typescript
// SECURE: Ownership enforced at query level
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.orders.findOne({
    _id: req.params.id,
    userId: req.user.id,   // Ownership check in query
  });
  if (!order) return res.status(404).json({ error: 'Not found' }); // 404, not 403
  res.json(filterOrderResponse(order));
});
```

### 3.6 GraphQL Security

```typescript
import { createYoga } from 'graphql-yoga';
import { useDepthLimit } from '@envelop/depth-limit';
import { costLimitPlugin } from '@escape.tech/graphql-armor-cost-limit';
import { maxAliasesPlugin } from '@escape.tech/graphql-armor-max-aliases';

const yoga = createYoga({
  schema,
  plugins: [
    useDepthLimit({ maxDepth: 7 }),          // Prevent deep nesting attacks
    costLimitPlugin({ maxCost: 5000 }),       // Query complexity limit
    maxAliasesPlugin({ n: 15 }),              // Prevent alias-based DoS
  ],
});
```

GraphQL-specific threats: query depth attacks, batch query abuse, introspection in production
(disable `__schema`/`__type`), field suggestion leakage, alias-based rate limit bypass.

### 3.7 API Gateway Pattern

| Concern | Gateway Enforcement |
|---------|-------------------|
| Authentication | Validate JWT/OAuth before request reaches backend |
| Rate limiting | Token bucket per API key/IP |
| Request validation | Validate against OpenAPI schema |
| TLS termination | TLS at gateway, mTLS to backends |
| Logging | Centralized audit trail |

Key gateways: **Kong** (plugin-based), **AWS API Gateway** (Lambda authorizers),
**Envoy** (service mesh), **Nginx** (reverse proxy + `limit_req`).

---

## 4. Vulnerability Catalog — OWASP API Top 10 2023 with CWE

| # | Vulnerability | CWE | Fix |
|---|---------------|-----|-----|
| API1 | BOLA | CWE-285, CWE-639 | Ownership checks at query level; UUIDs over sequential IDs; return 404 not 403 |
| API2 | Broken Authentication | CWE-287, CWE-306 | OAuth 2.0/OIDC; MFA for sensitive ops; pin JWT algorithms |
| API3 | Broken Object Property Level Auth | CWE-213, CWE-915 | Explicit response schemas; `.strict()` validation; never pass raw body to ORM |
| API4 | Unrestricted Resource Consumption | CWE-770, CWE-400, CWE-799 | Rate limiting per user/IP; size limits; pagination caps; timeouts |
| API5 | Broken Function Level Auth | CWE-285 | Deny by default; RBAC/ABAC at every function; separate admin/user paths |
| API6 | Unrestricted Sensitive Business Flows | CWE-799 | CAPTCHA; device fingerprinting; anomaly detection; per-action rate limits |
| API7 | SSRF | CWE-918 | URL allowlists; block RFC 1918 ranges; disable redirects; DNS rebinding protection |
| API8 | Security Misconfiguration | CWE-2, CWE-16, CWE-209, CWE-942 | Harden defaults; no DEBUG; restrict CORS; enforce HTTPS; remove unused endpoints |
| API9 | Improper Inventory Management | CWE-1059 | API inventory; auto-discover via traffic; deprecate old versions; gateway visibility |
| API10 | Unsafe Consumption of APIs | CWE-20, CWE-918 | Validate third-party responses; timeouts; circuit breakers; same input validation rules |

---

## 5. Security Checklist (28 items)

### Authentication & Authorization
- [ ] All endpoints require authentication (no unauthenticated data access)
- [ ] JWT algorithm pinned server-side (RS256/ES256) — never trust `alg` from header
- [ ] JWT claims validated: `iss`, `aud`, `exp`, `nbf`, `sub`
- [ ] OAuth scopes enforced at each endpoint
- [ ] Object-level authorization on every data access (BOLA prevention)
- [ ] Function-level auth separates user and admin paths
- [ ] API keys hashed in storage, shown once at creation, rotatable

### Input & Output
- [ ] All requests validated against strict schemas (Zod/Joi/Pydantic)
- [ ] `.strict()` / `extra="forbid"` rejects unexpected fields (mass assignment prevention)
- [ ] Response schemas allowlist returned fields — no ORM leaking
- [ ] Content-Type validated; file uploads checked for type, size, and content
- [ ] Query params validated for type, range, injection patterns

### Rate Limiting & Abuse
- [ ] Rate limiting per user/key AND per IP
- [ ] Auth endpoints: stricter limits (10-20 attempts/15 min)
- [ ] Rate limit headers: `RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`
- [ ] Pagination enforced (max 100 items/page); max pagination depth
- [ ] Request body size limits (e.g., 1MB max)
- [ ] GraphQL: depth, complexity, alias, and token limits

### Infrastructure
- [ ] HTTPS enforced; HSTS header set
- [ ] CORS restricted to specific origins (never `*` for authenticated APIs)
- [ ] Errors never leak stack traces, SQL, or internal paths
- [ ] Unused HTTP methods disabled
- [ ] Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- [ ] API inventory maintained; all endpoints documented and monitored
- [ ] Old API versions deprecated with sunset dates

### Monitoring
- [ ] Access logs: timestamp, user ID, endpoint, status, IP, user-agent
- [ ] Anomaly detection for rate spikes, geo shifts, auth failures
- [ ] Alerting on repeated 401/403 from same source

---

## 6. Tools & Automation

### Security Scanners

| Tool | Type | Strength |
|------|------|----------|
| **42Crunch** | SAST+DAST | 300+ checks on OpenAPI contracts; low false positives; CI/CD |
| **StackHawk** | DAST | Developer-friendly; CI native; REST + GraphQL OWASP coverage |
| **Snyk API** | SAST+DAST | Integrated API+web DAST; fits existing Snyk workflows |
| **Akto** | Inventory+Testing | Auto-discovers APIs from traffic; tests BOLA, auth issues |
| **APIsec** | Automated pentest | AI-driven test generation from OpenAPI specs |

### API Gateways

| Gateway | Key Security Features |
|---------|----------------------|
| **Kong** | Plugin ecosystem: rate-limit, key-auth, jwt, cors, bot-detection |
| **AWS API Gateway** | IAM auth, Cognito, Lambda authorizers; per-key throttling; WAF |
| **Envoy** | mTLS, external auth filters, rate limiting service (Istio mesh) |
| **Nginx** | `limit_req_zone` rate limiting, IP filtering, request size limits |

### Rate Limiting Libraries

| Library | Platform | Notes |
|---------|----------|-------|
| `express-rate-limit` | Node.js | Fixed/sliding window with Redis stores |
| `slowapi` | FastAPI | Sliding window, decorator-based |
| `bucket4j` | Spring Boot | Token bucket, distributed stores |
| Nginx `limit_req` | Infrastructure | Leaky bucket at proxy level |

### Static Analysis

Semgrep rulesets for API security: `p/jwt` (JWT misuse), `p/owasp-top-ten`, `p/nodejs`
(Express patterns). Custom rules for BOLA, mass assignment, missing auth middleware.

### OpenAPI Validation

**42Crunch Audit**, **Spectral** (Stoplight), **vacuum** (daveshanley) — lint OpenAPI specs
for missing security schemes, incomplete schemas, and security misconfigurations.

---

## 7. Platform-Specific Guidance

### REST — Express.js Hardening

```typescript
import helmet from 'helmet';
import cors from 'cors';
app.use(helmet());
app.use(cors({
  origin: ['https://app.example.com'], // Explicit origins, never '*'
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');
```

### REST — FastAPI Hardening

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field
from slowapi import Limiter

app = FastAPI(docs_url=None, redoc_url=None)  # Disable docs in production
limiter = Limiter(key_func=get_remote_address)

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    class Config:
        extra = "forbid"  # Mass assignment prevention
```

### REST — Spring Boot Hardening

```java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/**").authenticated()
    .anyRequest().denyAll()      // Deny by default
).oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
    .decoder(jwtDecoder())       // Pinned algorithm decoder
));
```

### GraphQL Security Checklist

- Disable introspection in production
- Use persisted/allowlisted queries (Apollo APQ)
- Field-level auth via directives or resolver checks
- Limit batch operations (max 5-10 per request)
- Cost analysis with per-field weights

### gRPC Security

- Always use TLS; mTLS for service-to-service
- Auth/authz via server interceptors (not per-handler)
- Set `maxRecvMsgSize`/`maxSendMsgSize` limits
- Disable server reflection in production
- Use short-lived certificates (90 days), automate rotation

---

## 8. Incident Patterns

### 8.1 API Abuse Detection Signals

- Request rate >10x baseline from single key/IP
- Sequential ID enumeration (`/users/1001`, `/users/1002`, ...)
- Geographic impossibility (same user, two continents, minutes apart)
- High 4xx error ratio from single source (>50% with 20+ requests)
- Requests to deprecated/undocumented endpoints
- Off-hours access patterns for business APIs

### 8.2 Credential Stuffing via APIs

~26 billion attempts/month in 2024 (Akamai). Detection: high volume of failed logins from
distributed IPs, sub-100ms inter-request timing (bot), uniform patterns, alphabetical usernames.

**Prevention stack:** (1) Rate limit auth endpoints aggressively, (2) MFA on all accounts,
(3) CAPTCHA after 3 failures, (4) Check passwords against breach DBs (HaveIBeenPwned,
k-anonymity), (5) Device fingerprinting, (6) Temporary account lockout with notification.

### 8.3 Data Exfiltration via APIs

Patterns: slow low-volume scraping under rate limits, pagination enumeration, compromised API
keys, abusing export endpoints, maximum-depth GraphQL queries.

**Prevention:** Monitor cumulative data volume per key; field-level access control; max
pagination depth (e.g., page 100 cap); log and alert on bulk download patterns.

---

## 9. Compliance & Standards

### 9.1 OWASP API Security Top 10 2023

Published July 2023. Key changes from 2019: API3 combines Excessive Data Exposure + Mass
Assignment into BOPLA; API6 (Sensitive Business Flows), API7 (SSRF), API10 (Unsafe API
Consumption) are new. Compliance: map each endpoint to risks; test during review; automate
with 42Crunch, StackHawk, or Semgrep.

### 9.2 PCI DSS 4.0

First version to explicitly mention APIs (released March 2022, mandatory March 2025).
- **Req 6.2.3:** Secure development and testing for APIs before production
- **Req 6.3:** Code reviews of APIs before deployment
- **Req 6.5:** Validate API documentation / OpenAPI schema accuracy
- **Req 11.6.1:** Change-detection on payment pages and APIs

### 9.3 SOC 2

| Criteria | API Relevance |
|----------|---------------|
| Security | Auth, authz, encryption in transit, rate limiting |
| Availability | API uptime SLAs, DDoS protection, circuit breakers |
| Processing Integrity | Input validation, idempotency, error handling |
| Confidentiality | Response filtering, field-level ACL, data classification |
| Privacy | PII in responses, data minimization, consent enforcement |

Controls: API logs retained 12+ months; key rotation policy enforced; incident response covers
API breaches; change management includes API schema review; third-party APIs risk-assessed annually.

### 9.4 Other Standards

- **NIST SP 800-204/204B:** Microservices security, ABAC for APIs
- **RFC 8725:** JWT Best Current Practices (algorithm pinning, claim validation)
- **RFC 6749/6750:** OAuth 2.0 framework and bearer token usage

---

## 10. Code Examples — SSRF and Response Filtering

### 10.1 SSRF Prevention

```typescript
// VULNERABLE: User-controlled URL fetched server-side
app.post('/api/preview', async (req, res) => {
  const response = await fetch(req.body.url); // SSRF — can hit internal services
  res.json(await response.json());
});
```

```typescript
// SECURE: URL validation blocking internal networks
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

async function validateExternalUrl(input: string): Promise<URL> {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('HTTPS only');
  if (['metadata.google.internal', '169.254.169.254'].includes(url.hostname)) {
    throw new Error('Blocked host');
  }
  const addrs = await dns.resolve4(url.hostname);
  for (const addr of addrs) {
    const range = ipaddr.parse(addr).range();
    if (['private', 'loopback', 'linkLocal'].includes(range)) {
      throw new Error('Internal network blocked');
    }
  }
  return url;
}

app.post('/api/preview', jwtAuthMiddleware, async (req, res) => {
  const url = await validateExternalUrl(req.body.url);
  const resp = await fetch(url.toString(), {
    redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  res.json(await resp.json());
});
```

### 10.2 Response Filtering

```typescript
// VULNERABLE: Returns entire DB object
app.get('/api/users/:id', async (req, res) => {
  res.json(await db.users.findById(req.params.id));
  // Leaks: passwordHash, resetToken, internalNotes
});
```

```typescript
// SECURE: Explicit allowlist
function toPublicUser(u: DbUser) {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl };
}
app.get('/api/users/:id', jwtAuthMiddleware, async (req, res) => {
  const user = await db.users.findOne({
    _id: req.params.id, orgId: req.user.tenantId,
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(toPublicUser(user));
});
```

---

## References

- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- PCI DSS 4.0: https://www.pcisecuritystandards.org/
- RFC 8725 — JWT Best Current Practices: https://datatracker.ietf.org/doc/html/rfc8725
- GraphQL Security — OWASP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- OWASP Credential Stuffing Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html
- NIST SP 800-204: https://csrc.nist.gov/pubs/sp/800/204/final
- gRPC Auth Guide: https://grpc.io/docs/guides/auth/
- Salt Security Breach Reviews: https://salt.security/blog
- 42Crunch API Security: https://42crunch.com/
