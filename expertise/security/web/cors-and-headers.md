# CORS and Security Headers

> Expertise module for AI agents configuring secure HTTP headers and CORS policies.

---

## 1. Threat Landscape

CORS misconfigurations are among the most prevalent web vulnerabilities. In 2025, research indicated nearly 90% of successful API attacks exploited poorly configured CORS as their initial vector. The root cause: developers implement CORS as a quick fix to cross-origin errors without understanding security implications.

**Real-world exploits:**
- **Bitcoin Wallet Theft (PortSwigger Research):** CORS misconfigurations on cryptocurrency exchanges allowed stealing encrypted wallet backups via cross-origin requests, enabling offline brute-force of wallet passwords.
- **Financial Services API Compromise (2025):** Reflected origins with credentials enabled led to compromise of 35 financial APIs, affecting 2M+ users.
- **Admin Account Creation (Bug Bounty):** A login endpoint reflected Origin, accepted null, and returned wildcard -- attackers crafted sandboxed iframes causing victims to unknowingly create admin accounts.

| Missing Header          | Attack Enabled                   | Impact                |
|-------------------------|----------------------------------|-----------------------|
| CSP                     | Cross-site scripting (XSS)       | Full account takeover |
| X-Frame-Options         | Clickjacking                     | UI redress, phishing  |
| HSTS                    | Protocol downgrade, cookie theft | Session hijacking     |
| X-Content-Type-Options  | MIME sniffing                    | Code execution        |
| Referrer-Policy         | URL data leakage                 | Token/PII exposure    |
| Permissions-Policy      | Unauthorized API access          | Privacy violation     |
| CORS (misconfigured)    | Cross-origin data theft          | Full data exfiltration|

CORS misconfiguration maps to OWASP Top 10 2021 **A05: Security Misconfiguration**. Missing CSP enabling XSS maps to **A03: Injection**.

---

## 2. Core Security Principles

### Same-Origin Policy (SOP)
Two URLs share an origin only when **scheme**, **host**, and **port** all match. SOP prevents scripts on one origin from reading responses from another. CORS is the controlled relaxation of SOP -- every CORS header is a hole in SOP that must be justified.

### CORS Headers

| Header                             | Purpose                                   |
|-------------------------------------|-------------------------------------------|
| Access-Control-Allow-Origin         | Which origins may read the response        |
| Access-Control-Allow-Credentials    | Whether cookies/auth headers are sent      |
| Access-Control-Allow-Methods        | Permitted HTTP methods                     |
| Access-Control-Allow-Headers        | Permitted request headers                  |
| Access-Control-Expose-Headers       | Response headers readable by client        |
| Access-Control-Max-Age              | Preflight cache duration (seconds)         |

**Critical rule:** When `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Origin` MUST NOT be `*`. Servers that reflect arbitrary origins with credentials create an equivalent vulnerability.

### Defense Headers

- **CSP:** Defines allowlist of content sources; second layer of XSS defense even when injection exists. Without it, any XSS is trivially exploitable.
- **HSTS:** Forces HTTPS-only connections. Without it, MITM can intercept the first HTTP request and steal session cookies. Recommended: `max-age=63072000; includeSubDomains; preload`.
- **X-Frame-Options:** Prevents clickjacking. Use `DENY` or `SAMEORIGIN`. Prefer CSP `frame-ancestors` for modern browsers.
- **X-Content-Type-Options:** `nosniff` prevents MIME-sniffing, blocking execution of disguised uploaded files.
- **Referrer-Policy:** `strict-origin-when-cross-origin` prevents leaking full URLs (with tokens/IDs) to third parties.
- **Permissions-Policy:** Disables unused browser APIs (camera, microphone, geolocation). Limits XSS payload capabilities.

---

## 3. Implementation Patterns

### 3.1 CORS Whitelist Middleware (TypeScript)

```typescript
import cors from 'cors';

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) callback(null, true);
    else callback(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,
}));
```

**Anti-patterns:** `origin: true` (reflects any), regex without anchoring (`/example\.com/` matches `evil-example.com`), allowing null origin.

### 3.2 CSP with Nonces

```typescript
import crypto from 'crypto';

function cspMiddleware(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;
  res.setHeader('Content-Security-Policy', [
    `default-src 'none'`, `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'nonce-${nonce}'`, `img-src 'self' https:`, `connect-src 'self'`,
    `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`,
  ].join('; '));
  res.setHeader('Cache-Control', 'no-store'); // CRITICAL: prevent nonce caching
  next();
}
```

Nonce rules: generate per-request (128+ bits entropy), never accept from user input, disable HTML caching, use `strict-dynamic` for dependency loading.

### 3.3 Helmet.js for Express

```typescript
import helmet from 'helmet';
import crypto from 'crypto';

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: [(req, res) => `'nonce-${res.locals.nonce}'`, "'strict-dynamic'"],
      styleSrc: [(req, res) => `'nonce-${res.locals.nonce}'`],
      imgSrc: ["'self'", 'https:'], connectSrc: ["'self'"],
      frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'self'"],
    },
  },
  strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Permissions-Policy (not included in Helmet)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});
```

### 3.4 Nginx Security Headers

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none';" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
server_tokens off;
```

**Pitfall:** Nginx `add_header` in an inner block (e.g., `location`) drops ALL parent-block headers. Use the `always` parameter and consider `headers-more-nginx-module`.

### 3.5 Subresource Integrity (SRI)

```html
<script src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux"
  crossorigin="anonymous"></script>
```

Use sha384/sha512, always include `crossorigin="anonymous"`, regenerate hashes on version updates. Generate: `curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A`.

---

## 4. Vulnerability Catalog

### VULN-01: Wildcard Origin with Credentials
**CWE-942.** `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true`. Browsers block this, but developers "fix" it by reflecting origin (VULN-02).

### VULN-02: Reflected Origin Without Validation
**CWE-346.** Server copies request `Origin` into response ACAO header. Any origin is trusted; attacker page reads authenticated responses.
```javascript
// VULNERABLE
res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

### VULN-03: Null Origin Bypass
**CWE-346.** Server allows `Access-Control-Allow-Origin: null`. Exploited via sandboxed iframes: `<iframe sandbox="allow-scripts" srcdoc="<script>fetch(url,{credentials:'include'})</script>">`.

### VULN-04: Regex Origin Bypass
**CWE-942.** `origin.includes('example.com')` matches `evil-example.com`. Fix: exact match or anchored regex `^https:\/\/[\w-]+\.example\.com$`.

### VULN-05: Preflight Cache Poisoning
**CWE-942.** Long `Access-Control-Max-Age` with dynamic origin. Cached preflight may allow stale origin bypass.

### VULN-06: Missing CSP
**CWE-693.** No defense-in-depth against XSS. Any injection vulnerability is trivially exploitable.

### VULN-07: CSP with unsafe-inline
**CWE-693.** `script-src 'unsafe-inline'` defeats CSP entirely. Use nonces instead.

### VULN-08: Missing HSTS
**CWE-319.** Protocol downgrade via MITM on first visit. Session cookies intercepted over HTTP.

### VULN-09: Clickjacking (Missing Frame Protection)
**CWE-1021.** Attacker frames target page with transparent iframe overlay. Fix: `X-Frame-Options: DENY` AND `frame-ancestors 'none'`.

### VULN-10: MIME Sniffing
**CWE-430.** Missing `X-Content-Type-Options: nosniff`. Uploaded files executed as HTML/JS.

### VULN-11: Referrer Leakage
**CWE-200.** Missing Referrer-Policy. Full URLs with tokens sent to third parties.

### VULN-12: Overly Permissive Permissions-Policy
**CWE-276.** XSS can activate camera, microphone, geolocation.

### VULN-13: Missing Cross-Origin Isolation
**CWE-693.** Missing COOP/COEP/CORP headers. Spectre-type side-channel attacks possible.

### VULN-14: CSP Report-Only Without Enforcement
**CWE-693.** Only `Content-Security-Policy-Report-Only` set. Monitoring without blocking = zero protection.

### VULN-15: No SRI for CDN Resources
**CWE-353.** Compromised CDN serves malicious scripts. Magecart-style card skimmer injection.

---

## 5. Security Checklist

### CORS
- [ ] No wildcard `*` in ACAO when credentials are used
- [ ] Origin validated against explicit allowlist (not substring/regex)
- [ ] Null origin NOT in allowlist
- [ ] Allow-Methods restricted to required methods only
- [ ] Allow-Headers restricted to required headers only
- [ ] Max-Age set reasonably (< 86400)
- [ ] Preflight responses contain no sensitive data
- [ ] `Vary: Origin` set when ACAO changes per request

### Headers
- [ ] CSP enforced (not just report-only) with nonces, no `unsafe-inline`
- [ ] CSP `default-src 'none'` with explicit per-directive allowlists
- [ ] CSP `frame-ancestors 'none'` or specific origins
- [ ] HSTS with `max-age >= 31536000` and `includeSubDomains`
- [ ] `X-Frame-Options: DENY` set
- [ ] `X-Content-Type-Options: nosniff` set
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` or stricter
- [ ] Permissions-Policy disables unused browser APIs
- [ ] `X-Powered-By` and server version headers removed
- [ ] COOP/CORP headers set to `same-origin`

### Deployment
- [ ] CSP violations reported to monitoring endpoint
- [ ] Headers applied on ALL response paths (including errors, redirects)
- [ ] CDN resources include SRI hashes
- [ ] HTML with nonces sets `Cache-Control: no-store`
- [ ] Headers verified after every deployment (CI/CD scan)
- [ ] CSP deployed in report-only first, then enforced

---

## 6. Tools and Automation

| Tool                  | URL / Package                          | Purpose                              |
|-----------------------|----------------------------------------|--------------------------------------|
| SecurityHeaders.com   | https://securityheaders.com            | A-F grade for HTTP security headers  |
| Mozilla Observatory   | https://developer.mozilla.org/en-US/observatory | 20+ header checks with guidance |
| CSP Evaluator         | https://csp-evaluator.withgoogle.com   | CSP bypass risk analysis             |
| HSTS Preload          | https://hstspreload.org                | Preload eligibility check            |
| Qualys SSL Labs       | https://www.ssllabs.com/ssltest/       | TLS + HSTS verification              |
| helmet (npm)          | https://helmetjs.github.io/            | 13+ security headers for Express     |
| cors (npm)            | npmjs.com/package/cors                 | CORS middleware with validation       |
| django-cors-headers   | pypi.org/project/django-cors-headers   | CORS for Django                      |
| report-uri.com        | https://report-uri.com                 | CSP violation aggregation/alerting   |
| Sentry CSP            | sentry.io                              | CSP reports in error tracking        |

CI/CD integration:
```bash
# Observatory CLI
observatory --host staging.example.com --min-grade B
# curl header check
curl -sI https://staging.example.com | grep -i 'strict-transport-security'
```

---

## 7. Platform-Specific Guidance

### Django (django-cors-headers)
```python
# settings.py
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', ...]  # BEFORE CommonMiddleware
CORS_ALLOWED_ORIGINS = ['https://app.example.com']
CORS_ALLOW_CREDENTIALS = True
# NEVER: CORS_ALLOW_ALL_ORIGINS = True

SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

### Spring Boot (CorsConfiguration)
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://app.example.com"));  // NOT "*"
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowCredentials(true);
    config.setMaxAge(86400L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```
**Important:** With Spring Security present, configure CORS via `HttpSecurity.cors()`, not `WebMvcConfigurer` -- the Security filter chain runs first and may silently ignore MVC CORS.

### CDN: Cloudflare Workers
```javascript
async function handleRequest(request) {
  const response = await fetch(request);
  const headers = new Headers(response.headers);
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.delete('X-Powered-By');
  return new Response(response.body, { status: response.status, headers });
}
```

### CDN: AWS CloudFront
Use Response Headers Policies (preferred over Lambda@Edge): configure HSTS, X-Frame-Options, CSP, Referrer-Policy, and X-Content-Type-Options in the CloudFront console or via CloudFormation.

### Mobile WebView
- Android: `Origin: null` from `file://`. Use `WebViewAssetLoader` for virtual https origin. Set `setAllowUniversalAccessFromFileURLs(false)`.
- iOS: Use `WKURLSchemeHandler` for local content. WKWebView enforces CORS for XHR/fetch.
- Never relax server CORS for WebView quirks. Use token auth, not cookies.

---

## 8. Incident Patterns

### CORS Exploitation Chain
1. **Recon:** Attacker sends requests with various Origin headers (attacker.com, null, target.com.attacker.com)
2. **Discovery:** API reflects origin with `Access-Control-Allow-Credentials: true`
3. **Weaponization:** Craft page with `fetch()` using `credentials: 'include'`
4. **Delivery:** Phishing/watering hole sends victim to attacker page
5. **Exfiltration:** Victim's browser sends credentialed request; JS reads response, forwards to attacker
6. **Impact:** Account data, API keys, financial data stolen

### CSP Violation Monitoring
Report via `report-uri` or `report-to` directive. Monitor `violated-directive`, `blocked-uri`, `source-file`. Filter browser extension noise (`chrome-extension://`, `moz-extension://`). Spike in `inline` violations may indicate active XSS attempt -- correlate with WAF logs.

### Response Playbook
1. **Immediate:** Fix header at CDN/reverse proxy (fastest deployment path)
2. **Verify:** Scan ALL endpoints (error pages, redirects -- headers often missing there)
3. **Prevent:** Add header checks to CI/CD pipeline

---

## 9. Compliance and Standards

| Standard                    | Relevant Section                                         |
|-----------------------------|----------------------------------------------------------|
| OWASP Top 10 (2021)        | A05: Security Misconfiguration                           |
| OWASP ASVS v4.0            | V14: HTTP Security Configuration                         |
| OWASP Secure Headers       | Full header taxonomy and recommended values              |
| OWASP WSTG                 | WSTG-CONF-07 (HSTS), WSTG-CLNT-04 (CORS)               |
| NIST SP 800-53 SC-8        | Transmission confidentiality (HSTS)                      |
| NIST SP 800-53 SI-10       | Input validation (CSP)                                   |
| PCI DSS 4.0 Req 6.4.3      | CSP mandatory for payment pages (anti-Magecart)          |
| GDPR Art. 32 / HIPAA       | "Appropriate technical measures" -- headers are baseline |

---

## 10. Code Examples: Vulnerable vs. Secure

### CORS Middleware (Full Secure Version)
```typescript
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://app.example.com', 'https://admin.example.com',
]);

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin'); // CRITICAL for caching correctness
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
}
```

### Automated Header Check (CI/CD Script)
```bash
#!/usr/bin/env bash
set -euo pipefail
URL="${1:?Usage: $0 <url>}"
PASS=true
check() {
  local h="$1" exp="$2"
  local v; v=$(curl -sI "$URL" | grep -i "^${h}:" | head -1 | cut -d: -f2- | xargs)
  if [[ -z "$v" ]]; then echo "FAIL: ${h} MISSING"; PASS=false
  else echo "PASS: ${h}"; fi
}
check "Strict-Transport-Security" "max-age="
check "Content-Security-Policy" "default-src"
check "X-Frame-Options" ""
check "X-Content-Type-Options" "nosniff"
check "Referrer-Policy" ""
if curl -sI "$URL" | grep -qi "^X-Powered-By:"; then
  echo "FAIL: X-Powered-By should be removed"; PASS=false
fi
$PASS && echo "ALL PASSED" || { echo "FAILURES DETECTED"; exit 1; }
```

---

## References

- OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- PortSwigger CORS Research: https://portswigger.net/research/exploiting-cors-misconfigurations-for-bitcoins-and-bounties
- PortSwigger Web Security Academy: https://portswigger.net/web-security/cors
- Google Strict CSP: https://csp.withgoogle.com/docs/strict-csp.html
- MDN CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- MDN SRI Guide: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity
- Helmet.js: https://helmetjs.github.io/
- CWE-942: https://cwe.mitre.org/data/definitions/942.html
- CWE-346: https://cwe.mitre.org/data/definitions/346.html
- HackTricks CORS Bypass: https://book.hacktricks.xyz/pentesting-web/cors-bypass
- AWS CloudFront Security Headers: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example-function-add-security-headers.html
- Intigriti CORS Exploitation Guide: https://www.intigriti.com/researchers/blog/hacking-tools/exploiting-cors-misconfiguration-vulnerabilities
