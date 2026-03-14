# Cross-Site Scripting (XSS) Security Expertise Module

> **Purpose:** Reference module for AI agents during planning and implementation to prevent XSS vulnerabilities.
> **Last Updated:** 2026-03-08
> **OWASP Classification:** A03:2021 - Injection | CWE-79
> **Severity:** High to Critical (CVSS 6.1 - 9.6 depending on context)

---

## 1. Threat Landscape

### 1.1 XSS Types

**Reflected XSS (Non-Persistent)**
The malicious script is embedded in a URL or request parameter and reflected back in the server response without proper encoding. The victim must click a crafted link. This remains the most commonly reported XSS variant in bug bounty programs.

**Stored XSS (Persistent)**
The malicious payload is persisted in the application's data store (database, file system, cache) and served to every user who views the affected content. Stored XSS is the most dangerous variant because it requires no victim interaction beyond normal browsing and can affect all users simultaneously.

**DOM-Based XSS**
The vulnerability exists entirely in client-side code. The server response is benign, but client-side JavaScript processes attacker-controlled data (URL fragments, `postMessage` data, `localStorage`) and writes it to a dangerous sink (`innerHTML`, `document.write`). DOM XSS has become the predominant threat in modern single-page applications (SPAs) because the exploit bypasses server-side protections entirely.

**Mutation XSS (mXSS)**
The payload is initially benign and passes sanitization, but the browser's HTML parser mutates the DOM structure during rendering, transforming safe markup into executable script. mXSS exploits the gap between how sanitizers parse HTML and how browsers actually render it. This is an active area of research with new bypasses discovered regularly:

- **CVE-2024-47875:** DOMPurify <= 3.1.0 bypass via deep DOM nesting causing node flattening (discovered by @IcesFont, April 2024).
- **CVE-2025-26791:** DOMPurify < 3.2.4 bypass via regex parsing bug allowing mXSS at render time.
- **CVE-2024-52595:** lxml_html_clean bypass via `<noscript>` tag interpretation differences between sanitizer and browser.

### 1.2 Real-World Breaches

**British Airways Magecart Attack (2018)**
Attackers compromised BA's network via stolen third-party supplier credentials, then injected 22 lines of malicious JavaScript into the payment page. The script copied payment card data (name, address, card number, CVV) to an attacker-controlled domain. 429,612 individuals were affected, including full card details for 244,000 customers. The UK Information Commissioner's Office (ICO) fined BA 20 million GBP. This attack demonstrated how a single JavaScript injection point can enable massive financial data exfiltration.
*Source: ICO Penalty Notice, October 2020; RiskIQ/Magecart research*

**Fortnite Account Takeover (2019)**
Check Point researchers discovered XSS vulnerabilities in Epic Games' legacy subdomains. An attacker could craft a link that, when clicked, would capture the victim's authentication token via an OAuth flow -- no credentials required. The attacker gained full account access: purchasing in-game currency, accessing contacts, and eavesdropping on conversations. Over 200 million registered accounts were potentially at risk. Epic Games was subsequently hit with a class-action lawsuit.
*Source: Check Point Research, January 2019*

**eBay Stored XSS (2015-2017)**
eBay allowed sellers to include custom HTML/JavaScript in auction listing descriptions. Attackers injected malicious scripts that redirected buyers to spoofed login pages, stealing credentials. Compromised accounts were then used to create more fraudulent high-value listings (primarily vehicles). Some malicious listings persisted for over six weeks before removal. The vulnerability was repeatedly exploited across multiple years.
*Source: Netcraft Research, 2017; Bitdefender analysis*

### 1.3 Current Trends (2024-2025)

- **DOM XSS dominance:** With the shift to SPAs, DOM-based XSS has overtaken reflected XSS as the primary client-side threat vector.
- **Scale:** 22,254 CVEs were reported by mid-2024 (30% increase from 2023). Microsoft MSRC alone mitigated over 970 XSS cases since January 2024.
- **Supply chain XSS:** Attackers compromise third-party scripts (analytics, ads, chat widgets) to inject XSS into thousands of sites simultaneously.
- **Framework escape hatches:** Despite auto-escaping in React/Vue/Angular, developers routinely use unsafe APIs (`dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrust*`) that reintroduce XSS.
- **AI-assisted attacks:** 93% of security executives anticipated daily AI-driven attacks by mid-2025, with XSS as a component in 78% of predicted attack vectors.

---

## 2. Core Security Principles

### 2.1 Output Encoding (Context-Specific)

The single most important XSS defense. Data must be encoded for the specific rendering context:

| Context | Encoding Method | Example |
|---------|----------------|---------|
| HTML body | HTML entity encoding | `&lt;` `&gt;` `&amp;` `&quot;` `&#x27;` |
| HTML attribute | Attribute encoding + quoting | Always quote attribute values |
| JavaScript | JavaScript hex/unicode encoding | `\x3C` `\u003C` |
| URL parameter | Percent encoding | `%3C` `%3E` `%22` |
| CSS value | CSS hex encoding | `\3C` `\3E` |

**Why it matters:** Most XSS vulnerabilities arise not because input was not validated, but because output was not properly encoded for its rendering context. A value safe in HTML body context can be dangerous in a JavaScript string or URL context.

### 2.2 Content Security Policy (CSP)

CSP is a browser-enforced HTTP header that restricts which scripts can execute, which resources can load, and where data can be sent. It acts as a defense-in-depth layer -- it does not prevent the vulnerability itself but limits the damage an attacker can achieve.

**Why it matters:** Even if an XSS vulnerability exists, a strict CSP can prevent the injected script from executing, loading external resources, or exfiltrating data.

### 2.3 Trusted Types

A browser API (CSP directive) that prevents DOM XSS by requiring all values assigned to dangerous sinks (`innerHTML`, `document.write`) to pass through a developer-defined policy function first. The browser blocks any assignment that has not been processed by a Trusted Types policy.

**Why it matters:** Trusted Types shift XSS prevention from post-hoc detection to compile-time/runtime enforcement. They make it impossible to accidentally pass unsanitized strings to dangerous DOM APIs.

### 2.4 Input Validation

Validate all input against strict allowlists (expected format, length, character set). Input validation alone is NOT sufficient to prevent XSS -- it is a first layer, not a complete defense. Always combine with output encoding.

**Why it matters:** Reduces the attack surface by rejecting obviously malicious input early, but cannot catch all encoding-based bypass techniques.

### 2.5 HTTPOnly / Secure / SameSite Cookies

- **HTTPOnly:** Prevents JavaScript from reading session cookies via `document.cookie`, blocking the most common XSS exploitation path (session hijacking).
- **Secure:** Ensures cookies are only sent over HTTPS, preventing interception.
- **SameSite=Lax/Strict:** Limits cross-origin cookie transmission, reducing CSRF and some XSS exploitation chains.

**Why it matters:** Even if XSS exists, HTTPOnly cookies prevent attackers from stealing session tokens, significantly limiting impact.

### 2.6 Defense-in-Depth Layering

No single defense is sufficient. Effective XSS prevention requires:

```
Input Validation  -->  Output Encoding  -->  CSP  -->  Trusted Types  -->  HTTPOnly Cookies
   (first layer)     (primary defense)   (fallback)   (DOM protection)    (impact reduction)
```

---

## 3. Implementation Patterns

### 3.1 Context-Specific Output Encoding

```typescript
// VULNERABLE: No encoding
function renderUserName(name: string): string {
  return `<span>${name}</span>`;
}

// SECURE: HTML entity encoding
function renderUserName(name: string): string {
  return `<span>${htmlEncode(name)}</span>`;
}

function htmlEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// For JavaScript context
function jsEncode(str: string): string {
  return str.replace(/[^\w. ]/gi, (c) => {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

// For URL parameter context
function urlEncode(str: string): string {
  return encodeURIComponent(str);
}
```

### 3.2 Content Security Policy (Nonce-Based)

```typescript
// Server-side: Generate unique nonce per request
import crypto from 'crypto';

function generateCSPNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Express middleware example
function cspMiddleware(req: Request, res: Response, next: NextFunction): void {
  const nonce = generateCSPNonce();
  res.locals.cspNonce = nonce;

  res.setHeader('Content-Security-Policy', [
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `report-uri /csp-report`,
    `report-to csp-endpoint`,
  ].join('; '));

  next();
}

// In HTML template, use the nonce on every script tag
// <script nonce="<%= cspNonce %>">...</script>
```

**Critical CSP rules:**
- Never use `unsafe-inline` or `unsafe-eval` in production.
- Use `strict-dynamic` to allow trusted scripts to load child scripts without individual nonces.
- Generate a cryptographically random nonce (minimum 128 bits) per request. Never reuse nonces.
- Deploy in `Content-Security-Policy-Report-Only` first, monitor violations, then enforce.
- Never accept nonce values from user input or query parameters.

### 3.3 Trusted Types Implementation

```typescript
// Define a Trusted Types policy
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const sanitizerPolicy = trustedTypes.createPolicy('app-sanitizer', {
    createHTML: (input: string): string => {
      return DOMPurify.sanitize(input, {
        RETURN_TRUSTED_TYPE: false,
      });
    },
    createScriptURL: (input: string): string => {
      const url = new URL(input, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.toString();
      }
      throw new TypeError(`Blocked script URL: ${input}`);
    },
  });
}

// CSP header to enforce Trusted Types
// Content-Security-Policy: require-trusted-types-for 'script'; trusted-types app-sanitizer
```

**Deployment strategy:**
1. Start with report-only: `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'`
2. Identify all DOM sinks in your application that trigger violations.
3. Create policies that sanitize input for each sink.
4. Switch to enforcement mode once all violations are resolved.

### 3.4 DOMPurify Sanitization

```typescript
import DOMPurify from 'dompurify';

// Basic usage -- secure default
const cleanHTML = DOMPurify.sanitize(dirtyHTML);

// Profile-based configuration (recommended starting point)
const cleanHTML = DOMPurify.sanitize(dirtyHTML, {
  USE_PROFILES: { html: true },
});

// Strict configuration for user-generated content
const cleanHTML = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'title', 'target'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
});

// CRITICAL: Keep DOMPurify updated -- mXSS bypasses are found regularly
// CVE-2024-47875 (v3.1.0), CVE-2025-26791 (v3.2.4)
```

**DOMPurify anti-patterns to avoid:**
- Never modify sanitized output after sanitization (voids the protection).
- Never use overly permissive `ALLOWED_URI_REGEXP` (can allow `javascript:` URIs).
- Never add `script` or `style` to `ALLOWED_TAGS`.
- Never pass sanitized HTML through another library that may re-parse it.
- Always pin and regularly update the DOMPurify version.

### 3.5 Framework Auto-Escaping

**React (JSX auto-escaping):**
```tsx
// SAFE: React auto-escapes JSX expressions
function UserGreeting({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;  // Auto-escaped
}

// VULNERABLE: dangerouslySetInnerHTML bypasses auto-escaping
function UserBio({ bioHtml }: { bioHtml: string }) {
  return <div dangerouslySetInnerHTML={{ __html: bioHtml }} />;  // XSS risk
}

// SECURE: Sanitize before using dangerouslySetInnerHTML
function UserBio({ bioHtml }: { bioHtml: string }) {
  const cleanHtml = DOMPurify.sanitize(bioHtml, {
    USE_PROFILES: { html: true },
  });
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
```

**Vue (template auto-escaping):**
```vue
<!-- SAFE: Double-brace interpolation auto-escapes -->
<template>
  <p>{{ userInput }}</p>
</template>

<!-- VULNERABLE: v-html renders raw HTML -->
<template>
  <div v-html="userContent"></div>
</template>

<!-- SECURE: Sanitize in computed property -->
<script setup lang="ts">
import DOMPurify from 'dompurify';
import { computed } from 'vue';

const props = defineProps<{ userContent: string }>();
const safeContent = computed(() => DOMPurify.sanitize(props.userContent));
</script>
<template>
  <div v-html="safeContent"></div>
</template>
```

**Angular (DomSanitizer):**
```typescript
// Angular sanitizes by default. NEVER bypass without sanitization:
// VULNERABLE:
this.domSanitizer.bypassSecurityTrustHtml(userInput);

// SECURE: Use DOMPurify before bypassing Angular sanitizer
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
this.safeHtml = this.domSanitizer.bypassSecurityTrustHtml(clean);
```

---

## 4. Vulnerability Catalog

### V-01: Reflected XSS via URL Parameters
**CWE:** CWE-79 (Reflected)
**Risk:** High

```typescript
// VULNERABLE: Search query reflected without encoding
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Results for: ${query}</h1>`);
});

// SECURE: HTML-encode before reflecting
app.get('/search', (req, res) => {
  const query = htmlEncode(String(req.query.q || ''));
  res.send(`<h1>Results for: ${query}</h1>`);
});
```

### V-02: Stored XSS in User-Generated Content
**CWE:** CWE-79 (Stored)
**Risk:** Critical

```typescript
// VULNERABLE: Storing and rendering raw user HTML
async function saveComment(content: string): Promise<void> {
  await db.comments.insert({ content }); // Raw HTML stored
}
function renderComment(content: string): string {
  return `<div class="comment">${content}</div>`; // Rendered unsanitized
}

// SECURE: Sanitize on output (preferred) or on input
function renderComment(content: string): string {
  const clean = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
  return `<div class="comment">${clean}</div>`;
}
```

### V-03: DOM XSS via innerHTML
**CWE:** CWE-79 (DOM-based)
**Risk:** High

```typescript
// VULNERABLE: Setting innerHTML with user-controlled data
const userInput = new URLSearchParams(location.search).get('name');
document.getElementById('greeting')!.innerHTML = `Hello, ${userInput}`;

// SECURE: Use textContent for text-only rendering
document.getElementById('greeting')!.textContent = `Hello, ${userInput}`;

// SECURE: If HTML is needed, sanitize first
document.getElementById('greeting')!.innerHTML =
  `Hello, ${DOMPurify.sanitize(userInput)}`;
```

### V-04: DOM XSS via document.write
**CWE:** CWE-79 (DOM-based)
**Risk:** High

```typescript
// VULNERABLE: document.write with user data
document.write('<div>' + location.hash.slice(1) + '</div>');

// SECURE: Never use document.write. Use DOM APIs instead.
const container = document.createElement('div');
container.textContent = decodeURIComponent(location.hash.slice(1));
document.body.appendChild(container);
```

### V-05: XSS via javascript: URLs
**CWE:** CWE-79
**Risk:** High

```tsx
// VULNERABLE: User-controlled href without protocol validation
function UserLink({ url }: { url: string }) {
  return <a href={url}>Visit</a>;
}

// SECURE: Validate URL protocol
function UserLink({ url }: { url: string }) {
  const safeUrl = sanitizeUrl(url);
  return <a href={safeUrl}>Visit</a>;
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    // Invalid URL
  }
  return '#';
}
```

### V-06: XSS in SVG and MathML Elements
**CWE:** CWE-79
**Risk:** High
**Reference:** CVE-2025-66412 (Angular SVG/MathML XSS)

SVG elements can contain `<script>` tags and event handlers. MathML elements can reference external resources. Both can be used as XSS vectors when user content is rendered as SVG/MathML.

```typescript
// VULNERABLE: Rendering user-provided SVG
element.innerHTML = userSvgContent;

// SECURE: Sanitize with SVG-aware configuration
const cleanSvg = DOMPurify.sanitize(userSvgContent, {
  USE_PROFILES: { svg: true },
  ADD_TAGS: ['use'],
  FORBID_TAGS: ['script'],
  FORBID_ATTR: ['onload', 'onerror', 'onclick'],
});
```

### V-07: Mutation XSS (mXSS) Through Sanitizer Bypass
**CWE:** CWE-79
**Risk:** Critical

mXSS occurs when the browser's parser mutates sanitized HTML into executable content. The sanitizer sees safe markup, but the browser renders it differently.

**Defense:**
- Keep sanitization libraries updated to the latest version.
- Use DOMPurify >= 3.2.4 (patches CVE-2025-26791).
- Prefer `textContent` over `innerHTML` when possible.
- Monitor DOMPurify's GitHub for new advisories.
- Consider Trusted Types as an additional enforcement layer.

### V-08: XSS via CSS Injection
**CWE:** CWE-79
**Risk:** Medium

```typescript
// VULNERABLE: User-controlled CSS values
element.style.cssText = `background: ${userInput}`;

// SECURE: Validate CSS values against allowlist
const SAFE_COLORS = /^#[0-9a-f]{3,6}$/i;
if (SAFE_COLORS.test(userInput)) {
  element.style.backgroundColor = userInput;
}
```

### V-09: postMessage XSS
**CWE:** CWE-79 (DOM-based)
**Risk:** High

```typescript
// VULNERABLE: No origin validation on message handler
window.addEventListener('message', (event) => {
  document.getElementById('output')!.innerHTML = event.data.html;
});

// SECURE: Validate origin and sanitize data
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-domain.com') {
    return; // Reject messages from untrusted origins
  }
  const clean = DOMPurify.sanitize(String(event.data.html));
  document.getElementById('output')!.innerHTML = clean;
});

// IMPORTANT: Never use indexOf() or search() for origin validation
// VULNERABLE: event.origin.indexOf('trusted-domain.com')
// Can be bypassed with: trusted-domain.com.attacker.com
```

### V-10: XSS via Template Injection (Server-Side)
**CWE:** CWE-79
**Risk:** Critical

```typescript
// VULNERABLE: String concatenation in server templates
app.get('/profile', (req, res) => {
  res.send(`<div>${req.query.bio}</div>`);
});

// SECURE: Use template engine with auto-escaping
// EJS: <%= userBio %> (auto-escapes)
// Pug: p= userBio (auto-escapes)
// Handlebars: {{userBio}} (auto-escapes)
// NEVER use unescaped output: <%- %>, !{}, {{{}}}, v-html
```

### V-11: XSS via JSON Injection in Script Tags
**CWE:** CWE-79
**Risk:** High

```typescript
// VULNERABLE: Embedding user data in inline script
app.get('/page', (req, res) => {
  const userData = getUserData(req.user.id);
  res.send(`
    <script>
      window.__DATA__ = ${JSON.stringify(userData)};
    </script>
  `);
  // If userData contains </script>, the script block breaks
  // and attacker-controlled HTML/JS can follow
});

// SECURE: Encode closing tags and dangerous sequences
function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
```

### V-12: XSS via File Upload (SVG, HTML)
**CWE:** CWE-79 (Stored)
**Risk:** High

```typescript
// VULNERABLE: Serving uploaded SVG files from same origin
app.use('/uploads', express.static('uploads'));
// An uploaded SVG with embedded script runs in the application's origin

// SECURE: Serve user uploads from a separate domain or with
// Content-Disposition: attachment header
app.get('/uploads/:file', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.join(uploadsDir, req.params.file));
});
```

### V-13: XSS via Dynamic Code Execution
**CWE:** CWE-95 (Code Injection)
**Risk:** Critical

Dynamic code execution APIs such as `eval()`, `setTimeout()` with string arguments, and `Function()` constructor with dynamic strings are extremely dangerous when used with any user-controlled input. These APIs should NEVER be used with untrusted data.

```typescript
// SECURE alternative: Use function references with setTimeout
setTimeout(() => processData(userData), 1000);

// SECURE alternative: Use JSON.parse for data deserialization
const parsed = JSON.parse(trustedJsonString);
```

### V-14: XSS via HTTP Header Injection
**CWE:** CWE-113
**Risk:** Medium

```typescript
// VULNERABLE: User input in redirect URL without validation
res.redirect(req.query.returnUrl);

// SECURE: Validate redirect targets
function safeRedirect(url: string, allowedHosts: string[]): string {
  try {
    const parsed = new URL(url, 'https://self.example.com');
    if (allowedHosts.includes(parsed.hostname)) {
      return parsed.pathname + parsed.search;
    }
  } catch {}
  return '/';
}
```

### V-15: XSS via WebSocket Messages
**CWE:** CWE-79 (DOM-based)
**Risk:** High

```typescript
// VULNERABLE: Rendering WebSocket messages as HTML
socket.onmessage = (event) => {
  chatDiv.innerHTML += `<p>${event.data}</p>`;
};

// SECURE: Use textContent or sanitize
socket.onmessage = (event) => {
  const p = document.createElement('p');
  p.textContent = event.data;
  chatDiv.appendChild(p);
};
```

---

## 5. Security Checklist

### Output Encoding & Rendering
- [ ] All dynamic output is context-encoded (HTML, JS, URL, CSS) before rendering
- [ ] Template engines are configured with auto-escaping enabled by default
- [ ] No use of raw/unescaped output directives without explicit sanitization
- [ ] JSON data embedded in `<script>` tags is encoded to prevent `</script>` breakout
- [ ] User-controlled URLs are validated against protocol allowlist (`http:`, `https:`, `mailto:`)

### Input Validation
- [ ] All input is validated for expected type, length, format, and character set
- [ ] Input validation uses allowlists (not blocklists) for acceptable values
- [ ] File uploads are validated for type, size, and content; never served from same origin as app

### Content Security Policy
- [ ] CSP header is deployed with nonce-based `script-src` and `strict-dynamic`
- [ ] `unsafe-inline` and `unsafe-eval` are not present in CSP directives
- [ ] `object-src 'none'` and `base-uri 'none'` are set
- [ ] CSP violation reporting is configured (`report-uri` / `report-to`)
- [ ] CSP was tested with Google CSP Evaluator before deployment

### Trusted Types
- [ ] Trusted Types enforcement is deployed or in report-only mode
- [ ] All DOM sink assignments go through defined Trusted Types policies
- [ ] Trusted Types violations are monitored and triaged

### Cookie Security
- [ ] Session cookies have `HttpOnly` flag set
- [ ] Session cookies have `Secure` flag set
- [ ] Session cookies use `SameSite=Lax` or `SameSite=Strict`

### Sanitization
- [ ] DOMPurify (or equivalent) is used for all user-supplied HTML rendering
- [ ] DOMPurify is updated to latest version (check for mXSS advisories)
- [ ] Sanitized output is not modified or re-parsed after sanitization
- [ ] SVG and MathML content is sanitized with appropriate profiles

### Framework-Specific
- [ ] React: No `dangerouslySetInnerHTML` without DOMPurify sanitization
- [ ] Vue: No `v-html` without DOMPurify sanitization
- [ ] Angular: No `bypassSecurityTrust*` without DOMPurify sanitization
- [ ] Server templates: Auto-escaping enabled, no raw output with user data

### DOM Security
- [ ] No use of `document.write()` or `document.writeln()`
- [ ] No use of dynamic code execution APIs with string arguments from user input
- [ ] `innerHTML` assignments use sanitized content only; `textContent` preferred for text
- [ ] `postMessage` handlers validate `event.origin` with strict equality (not `indexOf`)
- [ ] WebSocket message content is not rendered as HTML

### Headers & Configuration
- [ ] `X-Content-Type-Options: nosniff` is set on all responses
- [ ] `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'` is set
- [ ] User-uploaded files are served with `Content-Disposition: attachment`

---

## 6. Tools & Automation

### Static Analysis

**Semgrep**
Semgrep provides 20,000+ rules including XSS-specific patterns. It detects `dangerouslySetInnerHTML`, `v-html`, `innerHTML` assignments, dynamic code execution, and missing CSP headers. Custom rules can be written to match project-specific XSS patterns.

```bash
# Run Semgrep with security ruleset
semgrep --config p/javascript --config p/typescript --config p/react
semgrep --config p/xss  # XSS-specific rules
```

**ESLint Security Plugins**
- `eslint-plugin-security`: Detects dynamic code execution, `innerHTML`, `document.write` usage.
- `eslint-plugin-no-unsanitized`: Mozilla's plugin that flags `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `document.write` with unsanitized content.
- `@microsoft/eslint-plugin-sdl`: Microsoft's SDL rules including XSS prevention patterns.

```json
{
  "plugins": ["security", "no-unsanitized"],
  "rules": {
    "security/detect-eval-with-expression": "error",
    "no-unsanitized/property": "error",
    "no-unsanitized/method": "error"
  }
}
```

### Dynamic Analysis & Testing

**Burp Suite**
Burp Scanner includes comprehensive XSS detection covering reflected, stored, and DOM-based XSS. The active scanner fuzzes parameters with context-aware payloads and detects responses where injected content is rendered without encoding.

**OWASP ZAP**
Open-source alternative to Burp with active and passive XSS scanning. Can be integrated into CI/CD pipelines via the ZAP Docker image.

**Browser DevTools -- Trusted Types Violations**
Chrome DevTools reports Trusted Types violations in the console. Enable report-only CSP header to discover all DOM sinks in your application before enforcement:
```
Content-Security-Policy-Report-Only: require-trusted-types-for 'script'
```

### CSP Evaluation

**Google CSP Evaluator** (https://csp-evaluator.withgoogle.com/)
Analyzes CSP headers and identifies weaknesses (missing directives, overly permissive sources, `unsafe-inline` usage). Should be used before deploying any CSP policy.

### Dependency Auditing

```bash
# Check for known vulnerabilities in DOMPurify and other dependencies
npm audit
# Automated patching
npm audit fix
# Monitor DOMPurify specifically
npm ls dompurify
```

---

## 7. Platform-Specific Guidance

### 7.1 React Applications

**Default protections:** JSX auto-escapes all embedded expressions before DOM insertion. Values are converted to strings and HTML entities are encoded.

**Known escape hatches (XSS vectors):**
- `dangerouslySetInnerHTML`: Bypasses all React escaping. Must be paired with DOMPurify.
- `ref.current.innerHTML = ...`: Direct DOM manipulation bypasses React's virtual DOM escaping.
- `href={userUrl}`: Accepts `javascript:` URLs. Validate protocol.
- `src` attributes on `<iframe>`, `<script>`: Can load attacker-controlled content.
- Server-side rendering (SSR): If user data is serialized into `<script>` tags for hydration, it can break out of the JSON context.

**React-specific rule:** Treat every use of `dangerouslySetInnerHTML` as a security-critical code path requiring review and DOMPurify sanitization.

### 7.2 Vue Applications

**Default protections:** Double-brace interpolation (`{{ }}`) auto-escapes HTML.

**Known escape hatches:**
- `v-html` directive: Renders raw HTML. Must be paired with DOMPurify.
- Server-side template mixing: If Vue templates are generated server-side with user data, template injection can occur.
- Dynamic component rendering with user-controlled component names.

**Vue-specific rule:** Ban `v-html` in ESLint config (`vue/no-v-html`) and require explicit exemption with DOMPurify.

### 7.3 Angular Applications

**Default protections:** Angular sanitizes HTML, styles, URLs, and resource URLs by default. The `DomSanitizer` service strips dangerous content automatically.

**Known escape hatches:**
- `bypassSecurityTrustHtml()`: Marks content as safe, skipping sanitization.
- `bypassSecurityTrustScript()`: Marks script content as safe.
- `bypassSecurityTrustUrl()`: Marks URLs as safe.
- `bypassSecurityTrustResourceUrl()`: Marks resource URLs as safe.
- SVG animation attributes (`<animate>`, `<set>`) can bypass sanitization for `href`/`xlink:href` (CVE-2025-66412).

**Angular-specific rule:** Audit all uses of `bypassSecurityTrust*`. Each should have a corresponding DOMPurify call or strict validation.

### 7.4 Server-Rendered Applications

**Template engine configuration:**
- EJS: `<%= %>` auto-escapes; `<%- %>` outputs raw (never use with user data).
- Pug/Jade: `= ` escapes; `!= ` outputs raw.
- Handlebars: `{{ }}` escapes; `{{{ }}}` outputs raw.
- Jinja2: Auto-escapes by default (when `autoescape=True`).
- Twig: Auto-escapes by default. `|raw` filter disables (never use with user data).

**Server-rendered rule:** Enable auto-escaping globally. Grep the codebase for raw output patterns and audit each occurrence.

### 7.5 Mobile WebViews

**iOS WKWebView:**
- Disable JavaScript if not needed: `configuration.preferences.javaScriptEnabled = false`.
- Use `loadHTMLString` with sanitized content only.
- Implement `WKNavigationDelegate` to validate URLs before navigation.
- Never expose native APIs to JavaScript via `WKScriptMessageHandler` without strict input validation.

**Android WebView:**
- Disable JavaScript if not needed: `webView.settings.javaScriptEnabled = false`.
- Never use `addJavascriptInterface` without `@JavascriptInterface` annotation (Android 4.2+).
- Set `WebViewClient.shouldOverrideUrlLoading` to validate navigation URLs.
- Use `WebSettings.setAllowFileAccess(false)` to prevent file:// access.

**WebView rule:** WebViews that render user content must apply the same XSS defenses as web applications: CSP, sanitization, and output encoding.

---

## 8. Incident Patterns

### 8.1 XSS Attack Chain: Injection to Account Takeover

```
1. RECONNAISSANCE
   Attacker identifies input field rendered without encoding
   (search box, comment field, profile bio, URL parameter)

2. INJECTION
   Attacker submits payload via the vulnerable input
   (stored: save to DB; reflected: craft URL; DOM: manipulate fragment)

3. EXECUTION
   Victim's browser executes the injected script
   in the application's origin context

4. EXFILTRATION
   Script steals session token (document.cookie if not HTTPOnly),
   captures keystrokes, or reads sensitive DOM content

5. ACCOUNT TAKEOVER
   Attacker uses stolen session token to impersonate victim,
   change credentials, exfiltrate data, or escalate privileges

6. LATERAL MOVEMENT
   If victim is admin, attacker may access admin panels,
   modify application code, or compromise other users
```

### 8.2 WAF Detection Patterns

Web Application Firewalls detect XSS through:
- **Signature matching:** Known patterns like `<script>`, `onerror=`, `javascript:`.
- **Heuristic analysis:** Detecting encoded variants, mixed case, and obfuscation.
- **Behavioral analysis:** Identifying unusual sequences of special characters in parameters.

**WAF limitations:** WAFs are a supplementary defense, not a primary one. Skilled attackers can bypass WAFs through encoding tricks, mutation XSS, DOM-only payloads (never reach the server), and context-specific evasion. Never rely on a WAF as your sole XSS defense.

### 8.3 CSP Violation Reporting

```typescript
// Server-side CSP report endpoint
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];
  logger.warn('CSP Violation', {
    blockedUri: report['blocked-uri'],
    violatedDirective: report['violated-directive'],
    documentUri: report['document-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
    columnNumber: report['column-number'],
  });
  res.status(204).end();
});

// Reporting-Endpoints header (newer API)
// Reporting-Endpoints: csp-endpoint="https://example.com/csp-report"
// Content-Security-Policy: ...; report-to csp-endpoint
```

**Triage CSP reports:**
- High priority: Violations from your own origin (possible XSS or misconfiguration).
- Medium priority: Violations from known third-party scripts (may need nonce/hash).
- Low priority: Violations from browser extensions (common, usually benign).

### 8.4 Monitoring Indicators of XSS Exploitation

- Unusual outbound requests from client to unknown domains (data exfiltration).
- Spike in CSP violation reports from a specific page or endpoint.
- Session tokens appearing in server logs from unexpected IP addresses.
- User reports of unexpected redirects or login prompts.
- Anomalous DOM mutations detected by MutationObserver-based monitoring.

---

## 9. Compliance & Standards

### 9.1 OWASP A03:2021 - Injection

XSS falls under OWASP Top 10 A03:2021 (Injection), which covers cross-site scripting alongside SQL injection, command injection, and other injection flaws. CWE-79 is the primary weakness identifier for XSS.

**Key OWASP requirements:**
- Use safe APIs that parameterize queries and avoid interpreters.
- Validate all input on the server side.
- Escape/encode output for the specific rendering context.
- Use CSP as a defense-in-depth measure.

### 9.2 CWE-79 and Related Weaknesses

| CWE ID | Description |
|--------|-------------|
| CWE-79 | Improper Neutralization of Input During Web Page Generation (XSS) |
| CWE-80 | Improper Neutralization of Script-Related HTML Tags |
| CWE-83 | Improper Neutralization of Script in Attributes |
| CWE-84 | Improper Neutralization of Encoded URI Schemes |
| CWE-85 | Doubled Character XSS Manipulations |
| CWE-86 | Improper Neutralization of Invalid Characters in Identifiers |
| CWE-87 | Improper Neutralization of Alternate XSS Syntax |
| CWE-95 | Improper Neutralization of Directives in Dynamically Evaluated Code |

### 9.3 PCI-DSS Requirements

PCI-DSS v4.0 requires:
- **Requirement 6.2.4:** Software engineering techniques prevent common software attacks, including XSS (injection flaws).
- **Requirement 6.3.1:** Security vulnerabilities are identified and managed, including public security vulnerability databases (CVEs).
- **Requirement 6.4.1:** Public-facing web applications are protected against attacks (WAF or code review for XSS).
- **Requirement 6.4.2:** Automated technical solutions to detect and prevent web-based attacks, including XSS, for public-facing web applications.

**PCI-DSS compliance note:** Organizations handling payment card data must demonstrate XSS prevention controls. The British Airways breach (Magecart) resulted in both regulatory fines and PCI-DSS compliance consequences.

### 9.4 Additional Standards

- **NIST SP 800-53:** SI-10 (Information Input Validation), SI-15 (Information Output Filtering).
- **ISO 27001:** A.14.2.5 (Secure system engineering principles), including XSS prevention in SDLC.
- **SOC 2:** CC6.1 (Logical and Physical Access Controls) -- XSS can be a vector for unauthorized access.

---

## 10. Code Examples

### 10.1 Complete CSP Implementation (Express.js + TypeScript)

```typescript
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Middleware: Generate nonce and set CSP headers
export function cspMiddleware(req: Request, res: Response, next: NextFunction): void {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  const policy = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic' https:`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `media-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    `report-uri /api/csp-report`,
  ].join('; ');

  res.setHeader('Content-Security-Policy', policy);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}
```

### 10.2 DOMPurify with Trusted Types (Browser)

```typescript
import DOMPurify from 'dompurify';

// Create a Trusted Types policy backed by DOMPurify
let sanitizePolicy: TrustedTypePolicy | null = null;

if (typeof window !== 'undefined' && window.trustedTypes?.createPolicy) {
  sanitizePolicy = window.trustedTypes.createPolicy('dompurify', {
    createHTML: (input: string) =>
      DOMPurify.sanitize(input, {
        USE_PROFILES: { html: true },
        RETURN_TRUSTED_TYPE: false,
      }) as string,
  });
}

// Safe HTML rendering function
export function renderSanitizedHTML(
  element: HTMLElement,
  untrustedHTML: string,
): void {
  if (sanitizePolicy) {
    element.innerHTML = sanitizePolicy.createHTML(untrustedHTML) as unknown as string;
  } else {
    element.innerHTML = DOMPurify.sanitize(untrustedHTML, {
      USE_PROFILES: { html: true },
    });
  }
}

// Safe text rendering (preferred when HTML is not needed)
export function renderText(element: HTMLElement, untrustedText: string): void {
  element.textContent = untrustedText;
}
```

### 10.3 Context-Specific Encoding Utility (TypeScript)

```typescript
/**
 * Context-specific output encoding utilities.
 * Use the appropriate encoder for each rendering context.
 */
export const XSSEncoder = {
  /**
   * HTML entity encoding for content placed in HTML body.
   * Use for: <div>{encoded}</div>
   */
  html(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (ch) => map[ch]);
  },

  /**
   * Attribute encoding. Always quote the attribute value.
   * Use for: <div title="{encoded}">
   */
  attr(str: string): string {
    return str.replace(/[^\w.\-]/g, (ch) => {
      return `&#x${ch.charCodeAt(0).toString(16).padStart(2, '0')};`;
    });
  },

  /**
   * JavaScript string encoding.
   * Use for: var x = '{encoded}';
   */
  js(str: string): string {
    return str.replace(/[^\w ]/g, (ch) => {
      return `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
  },

  /**
   * URL parameter encoding.
   * Use for: /search?q={encoded}
   */
  url(str: string): string {
    return encodeURIComponent(str);
  },

  /**
   * CSS value encoding.
   * Use for: style="color: {encoded}"
   */
  css(str: string): string {
    return str.replace(/[^\w]/g, (ch) => {
      return `\\${ch.charCodeAt(0).toString(16)} `;
    });
  },
} as const;
```

### 10.4 React Component: Secure Rich Text Renderer

```tsx
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

interface RichTextProps {
  content: string;
  allowedTags?: string[];
}

/**
 * Secure rich text renderer that sanitizes HTML before rendering.
 * Uses DOMPurify with strict defaults.
 */
export function RichText({ content, allowedTags }: RichTextProps) {
  const sanitizedContent = useMemo(() => {
    const config: DOMPurify.Config = {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: allowedTags ?? [
        'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
        'a', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target'],
    };

    // Force all links to open in new tab with noopener
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    const clean = DOMPurify.sanitize(content, config);
    DOMPurify.removeHook('afterSanitizeAttributes');
    return clean;
  }, [content, allowedTags]);

  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
```

### 10.5 URL Validation Utility

```typescript
/**
 * Validates and sanitizes URLs to prevent javascript: and data: XSS.
 * Returns the sanitized URL or a safe fallback.
 */
export function sanitizeUrl(
  url: string,
  options: {
    allowedProtocols?: string[];
    allowedHosts?: string[];
    fallback?: string;
  } = {},
): string {
  const {
    allowedProtocols = ['http:', 'https:', 'mailto:'],
    allowedHosts,
    fallback = '#',
  } = options;

  try {
    const parsed = new URL(url, window.location.origin);

    if (!allowedProtocols.includes(parsed.protocol)) {
      return fallback;
    }

    if (allowedHosts && !allowedHosts.includes(parsed.hostname)) {
      return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}
```

---

## References

- OWASP XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP DOM-Based XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- OWASP A03:2021 Injection: https://owasp.org/Top10/2021/A03_2021-Injection/
- CWE-79: https://cwe.mitre.org/data/definitions/79.html
- Trusted Types API (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
- Trusted Types (web.dev): https://web.dev/trusted-types/
- DOMPurify: https://github.com/cure53/DOMPurify
- Google CSP Evaluator: https://csp-evaluator.withgoogle.com/
- Strict CSP (Google): https://csp.withgoogle.com/docs/strict-csp.html
- British Airways ICO Fine: https://www.theregister.com/2020/10/16/british_airways_ico_fine_20m/
- Fortnite Vulnerability (Check Point): https://research.checkpoint.com/2019/hacking-fortnite/
- eBay Stored XSS (Netcraft): https://www.netcraft.com/blog/hackers-still-exploiting-ebays-stored-xss-vulnerabilities-in-2017
- Microsoft MSRC on XSS: https://www.microsoft.com/en-us/msrc/blog/2025/09/why-xss-still-matters-msrcs-perspective-on-a-25-year-old-threat
- DOMPurify CVE-2024-47875: https://portswigger.net/research/bypassing-dompurify-again-with-mutation-xss
- DOMPurify CVE-2025-26791: https://www.cve.news/cve-2025-26791/
- Angular SVG/MathML XSS CVE-2025-66412: https://github.com/advisories/GHSA-v4hv-rgfq-gp49
- Vue Security Guide: https://vuejs.org/guide/best-practices/security
- CSP (MDN): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
