# Cross-Site Request Forgery (CSRF) — Security Expertise Module

> **CWE-352** | OWASP Top 10 2021: A01 Broken Access Control
> Last updated: 2026-03-08
> Sources: OWASP CSRF Prevention Cheat Sheet, PortSwigger Web Security Academy,
> MITRE CWE, MDN Web Security, OWASP ASVS 5.0

---

## 1. Threat Landscape

### 1.1 How CSRF Works

CSRF forces an authenticated user's browser to send a forged HTTP request — including
session cookies — to a vulnerable web application. The attacker tricks the browser into
making a state-changing request indistinguishable from a legitimate one.

**Attack flow:** Victim authenticates and receives a session cookie. Victim visits a
malicious page. That page submits a hidden form/fetch to the target site. The browser
attaches the session cookie automatically. The server processes it as legitimate.

Unlike XSS, CSRF does not inject code into the target. The attacker never sees the
response — only the side effect (state change) matters.

### 1.2 Real-World CSRF Exploits

| Year | Target | Impact |
|------|--------|--------|
| 2006 | Netflix | Account takeover — change shipping address, alter login credentials |
| 2007 | Gmail | Filter injection silently forwarding all email to attacker |
| 2008 | ING Direct | Unauthorized money transfers from authenticated banking sessions over SSL |
| 2008 | YouTube | Nearly all user actions exploitable — favorites, messages, flagging |
| 2012 | Consumer routers | Mass DNS setting changes redirecting to phishing sites |
| 2019 | WordPress plugins | Admin action exposure via CSRF enabling privilege escalation |
| 2025 | WordPress plugin (CVE) | CSRF flaw exploited in the wild for unauthorized actions |
| 2025 | Global retailer | Third-party pixel exfiltrated CSRF and auth tokens to remote servers |

### 1.3 CSRF in Financial Applications

Financial apps are high-value targets: state changes carry monetary impact (wire
transfers, beneficiary additions); regulatory exposure (PCI-DSS violations); long-lived
sessions widen the attack window; multi-step workflows can be chained with social
engineering when confirmation steps lack independent authentication.

### 1.4 Trends: SameSite Cookies and Evolving Risk

Browsers now default to `SameSite=Lax` (Chrome since 2020, Firefox/Edge followed),
significantly reducing POST-based CSRF. However, risk persists:

- GET requests with side effects remain exploitable under Lax.
- Bypass techniques exist: method override, sibling domain attacks, client-side
  redirects, 2-minute cookie refresh window.
- Legacy apps explicitly setting `SameSite=None` re-enable full CSRF exposure.
- Mobile WebViews may not enforce SameSite consistently.

### 1.5 CSRF in APIs

- **Bearer token auth** (Authorization header) is inherently immune — browser does not
  auto-attach the token.
- **Cookie-authenticated APIs** require explicit CSRF protection.
- **GraphQL** accepting mutations via GET is especially vulnerable.
- **WebSocket** handshakes carry cookies without CORS preflight.

---

## 2. Core Security Principles

### 2.1 Synchronizer Token Pattern (Stateful)

Server generates a CSPRNG token, stores it in the session, embeds it in forms/headers.
Every state-changing request must include the token; server validates against session.

**Strengths:** Strong, well-understood, framework-supported.
**Weaknesses:** Requires server-side session state.

### 2.2 Double-Submit Cookie Pattern (Stateless)

Server sets a random value in both a cookie and a request parameter. Server verifies
they match. Attacker cannot read the cookie cross-origin, so cannot forge the parameter.

**Signed variant (recommended):** HMAC-SHA256 with server secret, binding to session ID:
```
token = nonce + "." + HMAC-SHA256(secret, session_id + nonce)
```
Without session binding, the pattern remains vulnerable to cookie injection attacks.

### 2.3 SameSite Cookie Attribute

| Value | Behavior | CSRF Protection |
|-------|----------|-----------------|
| `Strict` | Never sent cross-site | Strong, but breaks legitimate cross-site nav |
| `Lax` | Sent on top-level GET only | Good default; blocks POST-based CSRF |
| `None` | Always sent (requires `Secure`) | No protection |

Use `SameSite=Lax` as baseline. Never rely on it as sole defense.

### 2.4 Origin/Referer Validation

Check `Origin` or `Referer` on incoming requests; reject unexpected origins. Use as
defense-in-depth only — headers can be stripped by privacy extensions, absent on some
requests, or missing from older clients.

### 2.5 Custom Request Headers

Require a custom header (e.g., `X-Requested-With`) on state-changing requests. Cross-
origin requests with custom headers trigger CORS preflight, which the attacker's domain
fails. Effective only when CORS is correctly configured.

### 2.6 Fetch Metadata Headers

Modern browsers send `Sec-Fetch-Site` (`same-origin`/`same-site`/`cross-site`/`none`),
`Sec-Fetch-Mode`, and `Sec-Fetch-Dest`. Servers can implement a Resource Isolation
Policy rejecting cross-site state-changing requests. Supported 97%+ of browsers (all
major browsers since March 2023).

### 2.7 Defense-in-Depth Strategy

1. **Primary:** CSRF tokens (synchronizer or signed double-submit)
2. **Secondary:** `SameSite=Lax` or `Strict` cookies
3. **Tertiary:** Origin/Referer validation, Fetch Metadata checks
4. **Foundation:** Eliminate XSS — XSS defeats all CSRF defenses

---

## 3. Implementation Patterns

### 3.1 CSRF Token Requirements (OWASP)

- At least 128 bits of entropy (32 hex chars), generated by CSPRNG
- Unique per user session; transmitted via hidden form field or custom header, never URL
- Validate with constant-time comparison; reject missing tokens (not treat as valid)
- Regenerate on authentication; invalidate on logout

### 3.2 SameSite Cookie Configuration

```
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
```
Always pair `SameSite=None` with `Secure`. Audit all cookies for appropriate SameSite.

### 3.3 Framework Built-in CSRF Protection

**Express.js** — `csurf` deprecated (Sept 2022, security issues). Use `csrf-csrf`:
```typescript
import { doubleCsrf } from "csrf-csrf";
const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: "__Host-csrf",
  cookieOptions: { httpOnly: true, sameSite: "lax", secure: true, path: "/" },
  getTokenFromRequest: (req) => req.headers["x-csrf-token"] as string,
});
app.use(doubleCsrfProtection);
```

**Django** — `CsrfViewMiddleware` enabled by default. Uses double-submit cookie with
HMAC masking (BREACH-resistant). Configure: `CSRF_COOKIE_SECURE = True`,
`CSRF_COOKIE_SAMESITE = "Lax"`, `CSRF_TRUSTED_ORIGINS = ["https://app.example.com"]`.

**Spring Security** — CSRF enabled by default via `CsrfFilter`. Uses Synchronizer Token
with `HttpSessionCsrfTokenRepository`. For SPAs, use `CookieCsrfTokenRepository`:
```java
http.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()));
```

**Rails** — `protect_from_forgery` enabled by default. Synchronizer Token in session.
**Laravel** — `VerifyCsrfToken` middleware enabled by default. Synchronizer Token.

### 3.4 CSRF Protection for SPAs

**Cookie-to-Header pattern:** Backend sets non-HttpOnly cookie with CSRF token. SPA
reads from `document.cookie`, sends as `X-CSRF-Token` header. Backend validates match.

**Token endpoint pattern:** SPA calls `GET /api/csrf-token` on init, stores token
in-memory (not localStorage — XSS-vulnerable), attaches to request headers.

**Bearer token auth (CSRF-immune):** If SPA uses JWT/OAuth tokens in the `Authorization`
header stored in memory (not cookies), CSRF protection is unnecessary.

### 3.5 Stateless CSRF (HMAC-Based)

For horizontally scaled or serverless architectures:
```
token = timestamp + ":" + nonce + ":" + HMAC(secret, timestamp + nonce + session_id)
```
Server validates by recomputing HMAC. Timestamp enables expiration without storage.

---

## 4. Vulnerability Catalog

### V-CSRF-01: Missing CSRF Token on State-Changing Endpoints
**CWE-352** | Severity: High
POST/PUT/DELETE endpoints accepting cookie-authenticated requests without CSRF tokens.
Fix: Apply CSRF middleware to all state-changing routes.

### V-CSRF-02: Token Present but Not Validated Server-Side
**CWE-352** | Severity: High
Form includes a token field, but server ignores it. Creates false sense of security.
Fix: Ensure middleware validates the token and rejects invalid/missing values.

### V-CSRF-03: GET Requests with Side Effects
**CWE-352** | Severity: High
State-changing GET endpoints bypass `SameSite=Lax` (allows cookies on top-level GET).
Fix: Use POST/PUT/DELETE for state changes. GET must be safe and idempotent (RFC 7231).

### V-CSRF-04: CORS Misconfiguration Enabling CSRF
**CWE-346, CWE-352** | Severity: Critical
Reflecting any Origin with credentials or using wildcard + credentials allows cross-
origin authenticated requests. Fix: Explicit origin allowlist; never reflect blindly.

### V-CSRF-05: SameSite=None Without Secure Flag
**CWE-1275** | Severity: Medium
Modern browsers reject this, but older browsers silently ignore SameSite entirely.
Fix: Always pair `SameSite=None` with `Secure`.

### V-CSRF-06: Login CSRF
**CWE-352** | Severity: Medium
Unprotected login forms let attackers log victims into the attacker's account, capturing
sensitive data (payment methods, search history). Fix: CSRF-protect login forms.

### V-CSRF-07: JSON Content-Type CSRF
**CWE-352** | Severity: Medium
JSON APIs may appear immune (HTML forms cannot submit JSON), but `navigator.sendBeacon()`
or misconfigured CORS can enable cross-origin JSON requests.
Fix: Validate Content-Type strictly, require custom headers, validate CSRF tokens.

### V-CSRF-08: Token Leakage via URL or Referer
**CWE-598** | Severity: Medium
Tokens in URL query parameters leak via server logs, browser history, Referer header.
Fix: Transmit tokens in request bodies or custom headers only.

### V-CSRF-09: Subdomain Takeover Enabling CSRF
**CWE-352** | Severity: High
Compromised subdomains bypass `SameSite=Lax` (same-site) and can inject cookies for
double-submit attacks. Fix: Audit DNS for dangling records. Use `__Host-` cookie prefix.

### V-CSRF-10: Method Override Bypassing SameSite=Lax
**CWE-352** | Severity: Medium
Frameworks supporting `_method` override let GET requests (allowed by Lax) appear as
POST. Fix: Disable method override in production or validate CSRF on overridden method.

### V-CSRF-11: Token Not Bound to Session
**CWE-352** | Severity: Medium
Globally valid tokens let attackers reuse tokens from their own session.
Fix: Bind tokens to session ID via HMAC.

### V-CSRF-12: Missing Protection on File Upload Endpoints
**CWE-352** | Severity: High
Multipart endpoints excluded from CSRF middleware due to parsing complexity.
Fix: Ensure CSRF middleware handles multipart; order middleware correctly.

### V-CSRF-13: WebSocket Initiation CSRF
**CWE-352** | Severity: Medium
WebSocket Upgrade carries cookies without CORS preflight.
Fix: Validate Origin header during handshake; require CSRF token as first message.

### V-CSRF-14: OAuth State Parameter Missing
**CWE-352** | Severity: High
Missing `state` in OAuth flow lets attacker link their external account to victim's app.
Fix: Use cryptographic random `state` bound to session; validate on callback.

---

## 5. Security Checklist

### Token Management
- [ ] **CS-01**: All state-changing endpoints require a valid CSRF token
- [ ] **CS-02**: Tokens use CSPRNG with at least 128 bits of entropy
- [ ] **CS-03**: Server validates tokens using constant-time comparison
- [ ] **CS-04**: Tokens bound to user session (HMAC or session storage)
- [ ] **CS-05**: Tokens regenerated on auth, invalidated on logout
- [ ] **CS-06**: Tokens never in URL query parameters

### Cookie Configuration
- [ ] **CS-07**: Session cookies use `SameSite=Lax` or `Strict`
- [ ] **CS-08**: Any `SameSite=None` cookie also has `Secure`
- [ ] **CS-09**: Session cookies use `HttpOnly` and `Secure`
- [ ] **CS-10**: `__Host-` prefix on session cookies

### HTTP and Origin
- [ ] **CS-11**: GET requests are safe and idempotent (no side effects)
- [ ] **CS-12**: HTTP method override disabled or CSRF-validated
- [ ] **CS-13**: Origin/Referer validated as defense-in-depth
- [ ] **CS-14**: CORS uses explicit allowlist (no wildcard + credentials)
- [ ] **CS-15**: Fetch Metadata (`Sec-Fetch-Site`) checked where supported

### Framework and Architecture
- [ ] **CS-16**: Framework built-in CSRF protection enabled, not bypassed
- [ ] **CS-17**: Login and logout forms include CSRF protection
- [ ] **CS-18**: File upload endpoints covered by CSRF middleware
- [ ] **CS-19**: WebSocket handshakes validate Origin header
- [ ] **CS-20**: OAuth flows use cryptographic `state` parameter

---

## 6. Tools and Automation

### 6.1 Testing Tools

| Tool | Purpose | Context |
|------|---------|---------|
| **Burp Suite Pro** | CSRF PoC generation, automated scanning | Pen testing |
| **Burp CSRF Token Tracker** | Handle rotating tokens during scanning | Extension |
| **OWASP ZAP** | Automated CSRF scanning | CI/CD, pen testing |
| **Postman/Insomnia** | Manual API CSRF testing | Dev/QA |

**Burp CSRF PoC workflow:** Capture request in Proxy/Repeater. Right-click, select
Engagement tools > Generate CSRF PoC. Burp auto-generates HTML that replays the request.
CSRF Token Tracker extension handles token rotation during Intruder/Scanner runs.

### 6.2 Static Analysis — Semgrep

```yaml
rules:
  - id: flask-csrf-disabled
    patterns:
      - pattern: WTF_CSRF_CHECK_DEFAULT = False
    message: "CSRF protection disabled. Set WTF_CSRF_CHECK_DEFAULT to True."
    severity: ERROR
    languages: [python]
    metadata:
      cwe: "CWE-352"
```

Semgrep also provides rules for detecting missing CSRF middleware in Express, Django
`@csrf_exempt` overuse, and Spring Security CSRF disabled configurations.

### 6.3 Framework CSRF Middleware Summary

| Framework | Built-in | Mechanism | Default |
|-----------|----------|-----------|---------|
| Django | Yes | Double-submit + HMAC masking | On |
| Spring Security | Yes | Synchronizer Token (session) | On |
| Rails | Yes | Synchronizer Token (session) | On |
| Laravel | Yes | Synchronizer Token (session) | On |
| Express.js | No | Use `csrf-csrf` package | N/A |
| ASP.NET Core | Yes | Synchronizer Token | Opt-in |
| Flask | Via Flask-WTF | Double-submit cookie | Opt-in |
| Next.js / FastAPI | No | Custom implementation needed | N/A |

---

## 7. Platform-Specific Guidance

### 7.1 Traditional Server-Rendered Apps

Use the framework's built-in synchronizer token. Embed via template helpers (Django:
`{% csrf_token %}`, Rails: `form_authenticity_token`, Laravel: `@csrf`). Validate on
every POST/PUT/DELETE. Set `SameSite=Lax` on session cookies.

### 7.2 Single Page Applications (SPAs)

If using cookie-based auth: CSRF protection is mandatory. Use double-submit cookie with
non-HttpOnly cookie. Store token in-memory, send via custom header. If using bearer
token auth (JWT in Authorization header, stored in memory): CSRF protection unnecessary.
If JWTs are stored in cookies, CSRF protection is still required.

### 7.3 Mobile App APIs

Native HTTP clients are generally CSRF-immune (no automatic cookie attachment, bearer
token auth). **Exceptions:** APIs shared with web apps using cookie auth; WebViews
loading web content with cookie sessions; requests from mobile browsers.

### 7.4 GraphQL APIs

Reject mutations on GET. Require custom header (`X-GraphQL-Request`). Apply standard
CSRF token validation for cookie-authenticated GraphQL endpoints.

### 7.5 Microservices

Apply CSRF validation at the API gateway, not individual services. Internal service-to-
service calls do not need CSRF protection. Gateway validates tokens before forwarding.

---

## 8. Incident Patterns

### 8.1 Detection Signals

**WAF/proxy logs:** State-changing requests with missing/mismatched Origin/Referer;
POST/PUT/DELETE where `Sec-Fetch-Site: cross-site`; requests to sensitive endpoints
without CSRF token; unusual volume of state changes from one session.

**Application logs:** Spike in 403s on state-changing endpoints (token validation
failures); account changes without corresponding UI clickstream; privileged actions
immediately after external site visits.

**SIEM/XDR:** Cross-reference state changes with user behavior analytics; alert on
privilege-sensitive operations without multi-step confirmation.

### 8.2 Response Steps

1. **Contain** — Enforce re-authentication for high-value actions; set `SameSite=Strict`
   as emergency measure.
2. **Identify** — Review access logs; find sessions with suspicious Referer/Origin.
3. **Scope** — Determine affected accounts and unauthorized state changes (transfers,
   email changes, privilege escalations).
4. **Remediate** — Deploy CSRF tokens on affected endpoints; invalidate all sessions for
   affected users; revert unauthorized changes.
5. **Recover** — Notify users; reset compromised credentials; restore from backups.
6. **Harden** — Implement full defense-in-depth; add monitoring for token failures.
7. **Post-mortem** — Document vector, gap, timeline. Update threat model.

---

## 9. Compliance and Standards

### 9.1 OWASP

- **Top 10 (2021):** CSRF under A01 Broken Access Control (#1 position).
- **ASVS 5.0 (2025):** Section 4.3.3 — CSRF protection verification. L1: basic; L2:
  token validation on all state-changing requests; L3: defense-in-depth.
- **Prevention Cheat Sheet:** Updated for HMAC tokens and Fetch Metadata headers.
- **Testing Guide:** WSTG-SESS-05 covers CSRF testing methodology.

### 9.2 CWE-352

- **CWE-352:** Canonical identifier. Related: CWE-346 (Origin Validation Error),
  CWE-613 (Insufficient Session Expiration), CWE-598 (GET with Sensitive Query Strings),
  CWE-1275 (Improper SameSite Attribute).
- **CAPEC:** CAPEC-62 (CSRF), CAPEC-111 (JSON Hijacking), CAPEC-462 (Cross-Domain
  Search Timing).

### 9.3 PCI-DSS

- **Requirement 6.2.4:** Protection against CSRF for apps processing cardholder data.
- **Requirement 6.4:** WAF must detect/block CSRF for public-facing web apps.
- ASVS L2 compliance covers substantial PCI-DSS Requirement 6 web app requirements.

### 9.4 NIST and ISO

- **NIST SP 800-53 Rev. 5:** SC-23 (Session Authenticity) covers CSRF.
- **ISO 27001:2022:** Annex A.8.26 (Application Security Requirements).

---

## 10. Code Examples

### 10.1 CSRF Token Middleware (TypeScript / Express)

```typescript
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.CSRF_SECRET!;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

function generateToken(sessionId: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const ts = Date.now().toString(36);
  const payload = `${ts}.${nonce}`;
  const sig = crypto.createHmac("sha256", SECRET)
    .update(`${sessionId}:${payload}`).digest("hex");
  return `${payload}.${sig}`;
}

function validateToken(token: string, sessionId: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ts, nonce, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET)
    .update(`${sessionId}:${ts}.${nonce}`).digest("hex");
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const sid = req.session?.id;
  if (!sid) { res.status(403).json({ error: "No session" }); return; }

  if (SAFE_METHODS.has(req.method)) {
    const token = generateToken(sid);
    res.cookie("__Host-csrf", token, {
      httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 3600_000,
    });
    res.setHeader("X-CSRF-Token", token);
    return next();
  }

  const headerToken = req.headers["x-csrf-token"] as string | undefined;
  if (!headerToken) { res.status(403).json({ error: "CSRF token missing" }); return; }
  if (!validateToken(headerToken, sid)) {
    res.status(403).json({ error: "CSRF token invalid" }); return;
  }
  next();
}
```

### 10.2 SPA CSRF Client (TypeScript)

```typescript
let csrfToken: string | null = null;

export async function initCsrf(): Promise<void> {
  const res = await fetch("/api/csrf-token", { credentials: "include" });
  csrfToken = (await res.json()).token;
}

export async function secureFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers = new Headers(opts.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  return fetch(url, { ...opts, headers, credentials: "include" });
}
```

### 10.3 Fetch Metadata Resource Isolation (TypeScript / Express)

```typescript
export function fetchMetadataPolicy(req: Request, res: Response, next: NextFunction) {
  const site = req.headers["sec-fetch-site"] as string | undefined;
  if (!site) return next(); // Browser doesn't send Fetch Metadata
  if (["same-origin", "same-site", "none"].includes(site)) return next();
  if (site === "cross-site" && req.headers["sec-fetch-mode"] === "navigate"
      && req.method === "GET") return next();
  res.status(403).json({ error: "Cross-site request blocked" });
}
```

### 10.4 Vulnerable vs. Secure Comparison

```typescript
// --- VULNERABLE ---
app.use(cors({ origin: true, credentials: true }));  // Reflects any origin
app.post("/api/transfer", (req, res) => {             // No CSRF check
  processTransfer(req.session!.userId, req.body.to, req.body.amount);
  res.json({ success: true });
});
// No SameSite on cookies, no Origin validation, no Fetch Metadata check

// --- SECURE ---
app.use(cors({ origin: ["https://app.example.com"], credentials: true }));
app.use(session({ cookie: { secure: true, httpOnly: true, sameSite: "lax" } }));
app.use(fetchMetadataPolicy);
app.use(csrfProtection);
app.post("/api/transfer", (req, res) => {
  // CSRF validated by middleware chain before reaching handler
  processTransfer(req.session!.userId, req.body.to, req.body.amount);
  res.json({ success: true });
});
```

---

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Attack Description](https://owasp.org/www-community/attacks/csrf)
- [PortSwigger — CSRF](https://portswigger.net/web-security/csrf)
- [PortSwigger — Bypassing SameSite Restrictions](https://portswigger.net/web-security/csrf/bypassing-samesite-restrictions)
- [MDN Web Security — CSRF](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)
- [CWE-352](https://cwe.mitre.org/data/definitions/352.html)
- [web.dev — Fetch Metadata](https://web.dev/articles/fetch-metadata)
- [csrf-csrf npm package](https://www.npmjs.com/package/csrf-csrf)
- [Django CSRF docs](https://docs.djangoproject.com/en/5.2/howto/csrf/)
- [Spring Security CSRF docs](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html)
- [The Hacker News — CSRF Case Study: Global Retailer (2025)](https://thehackernews.com/2025/04/new-case-study-global-retailer.html)
- [Intigriti — CSRF Advanced Exploitation Guide](https://www.intigriti.com/researchers/blog/hacking-tools/csrf-a-complete-guide-to-exploiting-advanced-csrf-vulnerabilities)
- [Wikipedia — CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery)
