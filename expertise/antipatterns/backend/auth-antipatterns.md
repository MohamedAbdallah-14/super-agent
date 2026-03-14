# Authentication & Authorization Anti-Patterns
> A catalog of authentication and authorization mistakes that lead to account takeovers, data breaches,
> and privilege escalation. Each entry documents the pattern, its real-world consequences, and concrete fixes.
> Broken Access Control is the #1 vulnerability in the OWASP Top 10 (2021 and 2025), found in 94% of
> applications tested. These anti-patterns are not theoretical -- they are extracted from breaches,
> CVEs, and bug bounty reports spanning the last fifteen years.
> **Domain:** Backend
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

---

## Anti-Patterns

### AP-01: Rolling Your Own Crypto

**Also known as:** Homebrew authentication, DIY encryption, custom token scheme
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
```python
import hashlib, time, base64

def generate_token(user_id):
    raw = f"{user_id}:{time.time()}:{MY_APP_SECRET}"
    return base64.b64encode(hashlib.sha256(raw.encode()).digest()).decode()

def verify_token(token, user_id):
    # "We'll just regenerate and compare"
    # But time.time() has moved on, so this never actually works
    # Developer adds a 60-second window... then 5 minutes... then gives up and skips verification
    return True
```

**Why developers do it:**
They want full control, consider standard libraries "overkill" for their use case, or do not understand the complexity beneath JWT/OAuth/session libraries. Sometimes the motivation is avoiding a dependency.

**What goes wrong:**
Custom schemes lack peer review, formal verification, and adversarial testing. The CSL Dualcom CS2300-R alarm system used a hybrid roll-your-own crypto implementation that researchers broke trivially, putting physical security of shops and offices at risk. Research from a 2021 empirical study found that 37.2% of vulnerabilities in cryptographic libraries are memory safety issues, not even cryptographic ones -- homebrew implementations inherit both classes of bugs. AES-GCM nonce reuse, predictable IVs, and wrong-mode-of-operation errors are the most common categories.

**The fix:**
```python
# Use established libraries: PyJWT, authlib, passlib, or your framework's auth module
import jwt

def generate_token(user_id):
    return jwt.encode(
        {"sub": user_id, "exp": datetime.utcnow() + timedelta(hours=1)},
        settings.SECRET_KEY,
        algorithm="HS256"
    )

def verify_token(token):
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
```

**Detection rule:**
Flag any import of `hashlib` or `hmac` used in conjunction with session/token generation logic. Flag custom `encrypt`/`decrypt` functions that do not delegate to established libraries (libsodium, OpenSSL wrappers, AWS KMS).

---

### AP-02: Plaintext or Weak Password Hashing

**Also known as:** MD5 passwords, unsalted hashes, reversible encryption for passwords
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
```python
# Plaintext
def store_password(user, password):
    db.execute("INSERT INTO users (email, password) VALUES (?, ?)", user.email, password)

# Weak hash
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# Unsalted SHA1
hashed = hashlib.sha1(password.encode()).hexdigest()
```

**Why developers do it:**
Speed of implementation, unfamiliarity with password hashing algorithms, or the assumption that "hashing is hashing." Some developers confuse message-digest functions (MD5, SHA1) with password hashing functions (bcrypt, scrypt, Argon2).

**What goes wrong:**
- **RockYou (2009):** 32 million passwords stored in plaintext. The leaked dataset became the foundation of the `rockyou.txt` wordlist used in virtually every password cracking operation since.
- **LinkedIn (2012):** 6.5 million passwords hashed with unsalted SHA1, cracked within hours using rainbow tables. The full dump later revealed 117 million credentials.
- **Adobe (2013):** 153 million accounts breached. Passwords were encrypted with 3DES in ECB mode (not hashed), and plaintext hints were stored alongside them. Identical passwords produced identical ciphertexts, enabling mass decryption via frequency analysis.
- **Yahoo (2014):** Used MD5 for password hashing before migrating to bcrypt.

A modern GPU can compute 10 billion MD5 hashes per second and hundreds of millions of SHA1 hashes per second.

**The fix:**
```python
# Use bcrypt (or Argon2id for new projects)
from passlib.hash import bcrypt

def store_password(password):
    return bcrypt.using(rounds=12).hash(password)

def verify_password(password, stored_hash):
    return bcrypt.verify(password, stored_hash)
```

**Detection rule:**
Grep for `hashlib.md5`, `hashlib.sha1`, `hashlib.sha256` adjacent to `password` variables. Flag any `INSERT` statement where a password column receives an unhashed value. Flag absence of bcrypt/scrypt/argon2 in dependency manifests.

---

### AP-03: JWT Stored in localStorage

**Also known as:** XSS-accessible tokens, client-side token exposure
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```javascript
// After login
fetch('/api/login', { method: 'POST', body: JSON.stringify(credentials) })
  .then(res => res.json())
  .then(data => {
    localStorage.setItem('token', data.jwt);  // Accessible to any JS on the page
  });

// On every request
fetch('/api/data', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});
```

**Why developers do it:**
SPA tutorials universally demonstrate this pattern. localStorage is persistent across tabs, survives page reloads, and the API is trivial. Developers are unaware that any JavaScript running on the page (including XSS payloads, compromised npm packages, or injected analytics scripts) can read localStorage.

**What goes wrong:**
A single XSS vulnerability allows an attacker to exfiltrate every token in localStorage. Unlike httpOnly cookies, there is no browser-level protection. The token can be sent to an attacker-controlled server and replayed from any location. The blast radius expands if the JWT has a long lifetime (see AP-16).

**The fix:**
```javascript
// Server sets the token as an httpOnly, Secure, SameSite cookie
// Response from POST /api/login:
// Set-Cookie: token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600

// Client code needs no token handling -- the browser sends the cookie automatically
fetch('/api/data', { credentials: 'include' });
```

If you must use a bearer token (e.g., cross-origin API), store it in a JavaScript closure or in-memory variable, and accept that it will not survive page reloads.

**Detection rule:**
Grep for `localStorage.setItem` or `sessionStorage.setItem` with token/jwt/auth keywords. Flag absence of `HttpOnly` and `Secure` flags on authentication cookies in `Set-Cookie` headers.

---

### AP-04: Not Validating JWT Signature or Expiration

**Also known as:** JWT bypass, `alg: none` attack, algorithm confusion
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```python
# Decoding without verification
import base64, json

def get_user_from_token(token):
    payload = token.split('.')[1]
    payload += '=' * (4 - len(payload) % 4)  # Fix padding
    return json.loads(base64.urlsafe_b64decode(payload))
    # No signature check. No expiration check. Attacker can forge any payload.
```

```python
# Accepting any algorithm the token claims
jwt.decode(token, secret, algorithms=None)  # Will accept "none" algorithm
```

**Why developers do it:**
Developers treat JWTs as opaque session IDs rather than signed claims. Some copy decode-only snippets from Stack Overflow. Others configure JWT libraries permissively to "get it working" during development and never tighten the configuration.

**What goes wrong:**
- **`alg: none` attack:** Attacker sets the algorithm header to `"none"` and removes the signature. Early versions of many JWT libraries accepted this as valid. Auth0 disclosed critical vulnerabilities in multiple JWT libraries in 2015 enabling this exact attack.
- **Algorithm confusion (RS256 to HS256):** Attacker changes the algorithm from RS256 (asymmetric) to HS256 (symmetric) and signs the token with the server's public key (which is public). The server, configured to accept HS256, validates the signature using the public key as the HMAC secret. This was a widespread vulnerability class disclosed in 2015 affecting libraries across Node.js, PHP, Java, and Python.
- **CVE-2025-4692, CVE-2025-30144, CVE-2025-27371:** Critical JWT library bypass vulnerabilities affecting cloud platforms and SaaS stacks in 2025, exposing millions of users to remote code execution.

**The fix:**
```python
# Always specify allowed algorithms explicitly
import jwt

def verify_token(token):
    return jwt.decode(
        token,
        settings.PUBLIC_KEY,
        algorithms=["RS256"],           # Whitelist algorithms
        options={
            "verify_exp": True,         # Enforce expiration
            "verify_aud": True,         # Verify audience
            "require": ["exp", "sub", "aud"]  # Require mandatory claims
        },
        audience="my-api"
    )
```

**Detection rule:**
Flag `jwt.decode` calls where `algorithms` is `None`, empty, or includes `"none"`. Flag JWT decode calls that do not verify the signature (`verify=False`, `options={"verify_signature": False}`). Flag absence of `exp` claim validation.

---

### AP-05: Missing Authorization Checks (IDOR)

**Also known as:** Insecure Direct Object Reference, horizontal privilege escalation, broken object-level authorization
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
```python
# User can access any invoice by changing the ID
@app.route('/api/invoices/<invoice_id>')
@login_required
def get_invoice(invoice_id):
    invoice = db.invoices.find_one({"_id": invoice_id})
    return jsonify(invoice)  # No check: does this invoice belong to the requesting user?
```

```
GET /api/invoices/1001  -> User's own invoice
GET /api/invoices/1002  -> Another user's invoice (returned without error)
GET /api/invoices/1003  -> Another user's invoice (returned without error)
```

**Why developers do it:**
Authentication is treated as sufficient. Developers verify "is this a logged-in user?" but not "does this user have access to this specific resource?" This is especially common in CRUD generators and ORM-backed REST APIs where routes are auto-generated.

**What goes wrong:**
IDOR is the most common access control vulnerability in web applications.
- **Snapchat (2015):** Personal information exposed via IDOR when attackers manipulated user ID parameters in API requests.
- **Uber (2017):** Attackers manipulated price parameters in ride-booking API to modify fares.
- **US Department of Defense (2020):** A researcher discovered an IDOR that allowed changing passwords on DoD web servers.
- **PayPal:** IDOR allowed Business Account owners to assign secondary users from other accounts.
- **Vimeo:** IDOR in password reset allowed full account takeover.

OWASP found Broken Access Control in 94% of applications tested, with over 318,000 occurrences in their contributed dataset.

**The fix:**
```python
@app.route('/api/invoices/<invoice_id>')
@login_required
def get_invoice(invoice_id):
    invoice = db.invoices.find_one({
        "_id": invoice_id,
        "owner_id": current_user.id   # Scope query to the authenticated user
    })
    if not invoice:
        abort(404)  # Return 404, not 403 (don't reveal existence)
    return jsonify(invoice)
```

**Detection rule:**
Flag any database query in an authenticated endpoint that uses a user-supplied ID without including the authenticated user's ID in the query filter. Flag route handlers that accept resource IDs but do not reference `current_user`, `request.user`, or equivalent.

---

### AP-06: Client-Side Only Authorization

**Also known as:** UI-only access control, front-end gating, hidden button security
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```javascript
// React component
function AdminPanel() {
  const { user } = useAuth();
  if (user.role !== 'admin') return <Redirect to="/dashboard" />;

  return <AdminDashboard />;
}

// But the API has no role check:
app.get('/api/admin/users', authenticateToken, (req, res) => {
  // Any authenticated user can call this endpoint directly
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});
```

**Why developers do it:**
The developer sees the admin panel hidden in the UI and assumes the protection is complete. In SPA architectures, it is natural to gate routes on the client. The server-side check is forgotten or deferred.

**What goes wrong:**
Any user with a valid token can call the admin API directly using curl, Postman, or browser dev tools. CWE-602 (Client-Side Enforcement of Server-Side Security) and CWE-603 (Use of Client-Side Authentication) document this pattern formally. OWASP Mobile Top 10 ranks Insecure Authentication/Authorization as M3, noting that "developers should assume all client-side authorization controls can be bypassed."

A 2026 write-up demonstrated how applications returning user context objects containing role and permission fields allowed privilege escalation through simple request manipulation when the backend consumed those fields directly without server-side recalculation.

**The fix:**
```javascript
// Server-side middleware enforces authorization
function requireRole(role) {
  return (req, res, next) => {
    // Role comes from the server session/token, NOT from the request body
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});
```

**Detection rule:**
Flag API routes that lack authorization middleware. Compare the set of front-end route guards against server-side middleware to find gaps. Flag any endpoint under `/admin` or `/internal` paths that only has authentication (not authorization) middleware.

---

### AP-07: Hardcoded Credentials and API Keys

**Also known as:** Committed secrets, embedded credentials, config-in-code
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
```python
# In source code
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
DATABASE_URL = "postgresql://admin:P@ssw0rd123@prod-db.internal:5432/app"

# In a config file checked into git
# config/settings.py
STRIPE_SECRET_KEY = "REDACTED_STRIPE_KEY"
```

**Why developers do it:**
It is the fastest path from "not working" to "working." Environment variables and secret managers add setup friction. Developers intend to move secrets out "later" and forget or deprioritize it.

**What goes wrong:**
- **Uber (2016):** Hackers found AWS credentials on a private GitHub repo, used them to access an S3 bucket with data on 57 million customers and drivers.
- **GitHub (2023):** GitGuardian reported over 12.8 million secrets leaked in public GitHub repositories in a single year.
- **GitHub (2024):** 39 million API keys and credentials exposed across public repos. 91.6% of leaked secrets remained valid after five days. Only 2.6% were revoked within the first hour.
- **AI companies (2025):** 65% of 50 AI companies examined by Wiz had verified secrets leaked on GitHub, exposing models and training data.

Once committed, secrets persist in Git history even after deletion from the current branch.

**The fix:**
```python
# Use environment variables
import os
AWS_ACCESS_KEY = os.environ["AWS_ACCESS_KEY"]

# Or use a secret manager
from aws_secretsmanager import get_secret
db_password = get_secret("prod/db/password")

# Pre-commit hook to prevent commits
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    hooks:
      - id: gitleaks
```

**Detection rule:**
Run gitleaks, truffleHog, or GitGuardian on every commit. Flag string literals matching known key patterns (AWS `AKIA*`, Stripe `sk_live_*`, GitHub `ghp_*`). Flag any variable named `password`, `secret`, `api_key`, or `token` assigned a string literal.

---

### AP-08: Session Fixation

**Also known as:** Pre-set session ID, session adoption
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```python
# Login handler that does NOT regenerate the session ID
@app.route('/login', methods=['POST'])
def login():
    user = authenticate(request.form['username'], request.form['password'])
    if user:
        session['user_id'] = user.id  # Set user in EXISTING session
        # The session ID in the cookie remains the same as before login
        return redirect('/dashboard')
```

Attack flow:
1. Attacker visits the site, receives session ID `abc123`.
2. Attacker sends victim a link: `https://app.com/login?sid=abc123`.
3. Victim logs in. Server associates `abc123` with the victim's account.
4. Attacker uses `abc123` to access the victim's authenticated session.

**Why developers do it:**
Session regeneration is not the default in many frameworks. Developers are unaware that the session ID is security-critical and must change at authentication boundaries.

**What goes wrong:**
- **Schneider Electric EcoStruxure PME:** A session fixation vulnerability allowed attackers to send a crafted link with a predefined session ID. When the victim logged in via that link, the attacker used the same session ID to hijack the authenticated session -- without needing credentials.
- This pattern has been found in routers, industrial control systems, and enterprise applications where session management is handled manually.

**The fix:**
```python
@app.route('/login', methods=['POST'])
def login():
    user = authenticate(request.form['username'], request.form['password'])
    if user:
        # Regenerate session ID on authentication state change
        session.regenerate()  # Framework-specific: Flask-Session, Django, etc.
        session['user_id'] = user.id
        return redirect('/dashboard')
```

In Django this is automatic. In Express.js: `req.session.regenerate(callback)`. In Spring Security: `sessionFixationProtection="newSession"`.

**Detection rule:**
Flag login handlers that set session/user data without calling session regeneration. Search for `session['user']` or `req.session.user =` assignments not preceded by `session.regenerate()`, `session.invalidate()`, or equivalent.

---

### AP-09: Missing CSRF Protection

**Also known as:** Cross-site request forgery, session riding, one-click attack
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```html
<!-- Attacker's page at evil.com -->
<form action="https://bank.com/transfer" method="POST" id="exploit">
  <input type="hidden" name="to" value="attacker-account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById('exploit').submit();</script>
```

```python
# Server has no CSRF token validation
@app.route('/transfer', methods=['POST'])
@login_required
def transfer():
    # The browser sends the session cookie automatically
    # No CSRF token is checked
    process_transfer(request.form['to'], request.form['amount'])
```

**Why developers do it:**
API-first architectures using JSON and bearer tokens are naturally CSRF-resistant (the browser does not auto-attach bearer tokens). But when authentication uses cookies -- which is common and recommended for XSS protection (see AP-03) -- CSRF protection becomes mandatory. Developers switching from bearer-token to cookie-based auth forget this trade-off.

**What goes wrong:**
- **Tesla (2017):** A CSRF vulnerability in Tesla's web interface allowed forged requests to issue remote vehicle commands -- unlock doors, control climate systems. If a Tesla owner visited a malicious site while logged in, the attacker could silently control the vehicle.
- **Ubiquiti routers:** CSRF in the router admin interface allowed attackers to change DNS settings or push firmware if a user visited a malicious site while authenticated (which was almost always, since users rarely log out of router panels).

**The fix:**
```python
# Use framework CSRF middleware
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)

# In templates
<form method="post">
  {{ csrf_token() }}
  ...
</form>

# For AJAX with cookies, use SameSite attribute
# Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict
```

**Detection rule:**
Flag POST/PUT/DELETE endpoints that use cookie authentication but do not validate a CSRF token. Flag cookie `Set-Cookie` headers missing `SameSite=Strict` or `SameSite=Lax`. Flag forms without a hidden CSRF token field.

---

### AP-10: OAuth Misconfiguration

**Also known as:** Open redirect in OAuth, redirect URI bypass, state parameter omission
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```python
# Accepting any redirect_uri
@app.route('/oauth/authorize')
def authorize():
    redirect_uri = request.args.get('redirect_uri')
    # No validation against a whitelist
    code = generate_auth_code(request.user)
    return redirect(f"{redirect_uri}?code={code}")

# Missing state parameter
def start_oauth():
    return redirect(
        f"https://provider.com/auth?client_id={CLIENT_ID}"
        f"&redirect_uri={CALLBACK_URL}"
        # No &state=<random> parameter -> CSRF on the OAuth flow
    )
```

**Why developers do it:**
OAuth 2.0 is a framework, not a protocol -- it has many moving parts and the spec is permissive about implementation details. Developers follow "happy path" tutorials that skip security parameters. Wildcard redirect URIs are convenient during development.

**What goes wrong:**
- **Booking.com (2022):** Salt Labs found flaws in Booking.com's OAuth redirect URI handling that allowed attackers to redirect users to attacker-controlled domains and steal authorization codes.
- **Expo platform:** Researchers manipulated the `returnURL` parameter to redirect OAuth tokens to attacker-controlled domains, enabling account takeover on any app using Expo's OAuth.
- **Keycloak (CVE-2023-6927):** Bypass of redirect URI validation via wildcard matching, enabling authorization code theft in all Keycloak versions < 23.0.4.
- **Spring Security OAuth (CVE-2019-3778):** Open redirect vulnerability in versions prior to 2.3.6 leaking authorization codes.
- **Gradio (CVE-2026-28415):** Open redirect in OAuth login/logout endpoints in versions < 6.6.0.

**The fix:**
```python
ALLOWED_REDIRECT_URIS = {
    "https://app.example.com/callback",
    "https://app.example.com/oauth/callback",
}

@app.route('/oauth/authorize')
def authorize():
    redirect_uri = request.args.get('redirect_uri')
    if redirect_uri not in ALLOWED_REDIRECT_URIS:
        abort(400, "Invalid redirect_uri")

    state = generate_csrf_state()
    session['oauth_state'] = state
    # ... include state in the flow and validate on callback
```

Always use exact-match redirect URI validation (no wildcards, no subdomain matching). Always validate the `state` parameter on callback. Use PKCE for public clients.

**Detection rule:**
Flag OAuth authorize endpoints that do not validate `redirect_uri` against a whitelist. Flag OAuth flows missing the `state` parameter. Flag redirect URI registrations using wildcards (`*`) or broad patterns.

---

### AP-11: Sequential and Guessable IDs for Access Control

**Also known as:** Enumerable identifiers, auto-increment exposure, predictable resource IDs
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```
GET /api/users/1001/profile
GET /api/users/1002/profile  # Just increment
GET /api/users/1003/profile  # Keep going

GET /api/documents/00000001
GET /api/documents/00000002  # Enumerate all documents
```

```python
# Database uses auto-increment primary keys exposed directly in URLs
class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
```

**Why developers do it:**
Auto-increment integer IDs are the default in every ORM and database. They are simple, indexable, and human-readable. Developers expose them in URLs because REST conventions encourage resource identification via URL path.

**What goes wrong:**
Sequential IDs make IDOR exploitation trivial. An attacker does not need to guess -- they just iterate. Combined with missing authorization checks (AP-05), this pattern enables automated scraping of entire databases. The Snapchat IDOR breach involved sequential user ID manipulation in API requests. Financial applications have been compromised via sequential transaction reference numbers.

Even with proper authorization, sequential IDs leak information: total user count, creation rate, and relative account age.

**The fix:**
```python
import uuid

class Invoice(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # External ID: 550e8400-e29b-41d4-a716-446655440000
    # Non-sequential, non-guessable

# For higher performance, use UUIDv7 (time-ordered but not sequential) or ULID
# Still enforce authorization checks -- UUIDs are defense-in-depth, not access control
```

**Detection rule:**
Flag API endpoints that expose integer IDs in URL paths where the backing model uses auto-increment. Flag endpoints accepting integer path parameters that lack authorization middleware.

---

### AP-12: Not Implementing Account Lockout

**Also known as:** Unlimited login attempts, missing brute-force protection, no rate limiting on login
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```python
@app.route('/login', methods=['POST'])
def login():
    user = User.query.filter_by(email=request.form['email']).first()
    if user and user.check_password(request.form['password']):
        login_user(user)
        return redirect('/dashboard')
    return render_template('login.html', error='Invalid credentials')
    # No attempt counting. No delay. No lockout. No CAPTCHA.
```

**Why developers do it:**
Account lockout adds complexity (lockout duration, unlock mechanisms, user communication). Developers fear locking out legitimate users. Rate limiting requires infrastructure (Redis, middleware). In early-stage products, security features are deprioritized.

**What goes wrong:**
Without rate limiting or lockout, attackers can attempt thousands of passwords per second via credential stuffing or brute force. OWASP API Security Top 10 (API2:2023) identifies Broken Authentication as a top risk, specifically noting that "anti-brute force mechanisms should be implemented and should be stricter than regular rate limiting." HackerOne reports document missing rate limits on login endpoints at Weblate and Acronis, among others.

**The fix:**
```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=get_remote_address)

@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute")  # Rate limit per IP
def login():
    user = User.query.filter_by(email=request.form['email']).first()
    if user:
        if user.failed_attempts >= 5:
            if user.locked_until and user.locked_until > datetime.utcnow():
                abort(429, "Account temporarily locked")
            user.failed_attempts = 0  # Reset after lockout period

        if user.check_password(request.form['password']):
            user.failed_attempts = 0
            user.save()
            login_user(user)
            return redirect('/dashboard')

        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        user.save()

    # Generic error to prevent username enumeration
    return render_template('login.html', error='Invalid credentials'), 401
```

**Detection rule:**
Flag login endpoints that lack rate-limiting middleware. Flag authentication handlers that do not track or check failed attempt counts. Flag absence of rate-limiting libraries in project dependencies.

---

### AP-13: Password Reset Token Reuse

**Also known as:** Non-expiring reset tokens, predictable reset tokens, reset link hijacking
**Frequency:** Occasional
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```python
def request_password_reset(email):
    user = User.query.filter_by(email=email).first()
    # Token is MD5 of the email -- deterministic, reusable, predictable
    token = hashlib.md5(email.encode()).hexdigest()
    send_email(email, f"https://app.com/reset?token={token}")

def reset_password(token, new_password):
    # Token is never invalidated after use
    user = User.query.filter_by(reset_token=token).first()
    user.password = hash_password(new_password)
    user.save()
    # reset_token is still valid -- attacker can use it again
```

**Why developers do it:**
Token generation and lifecycle management are treated as an afterthought. Developers generate a token, send it, and check it -- but forget to invalidate it on use, set an expiration, or use a cryptographically random generator.

**What goes wrong:**
- **Vikunja (CVE-2026-28268):** Password reset tokens could be reused indefinitely due to a failure to invalidate tokens upon use and a bug in the token cleanup cron job. An attacker who intercepted a single reset token could perform persistent account takeover at any point in the future.
- **Mavenlink (HackerOne):** The application generated password reset links based on the `Host` header, allowing attackers to redirect reset links to their domain and steal tokens.
- Applications using `MD5(email)` or `MD5(timestamp)` as reset tokens allow attackers who understand the generation mechanism to forge valid tokens for any account.

**The fix:**
```python
import secrets
from datetime import datetime, timedelta

def request_password_reset(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        return  # Don't reveal whether the email exists

    token = secrets.token_urlsafe(32)  # Cryptographically random
    user.reset_token = hash_token(token)  # Store hashed, not raw
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    user.save()
    send_email(email, f"https://app.com/reset?token={token}")

def reset_password(token, new_password):
    user = User.query.filter_by(reset_token=hash_token(token)).first()
    if not user or user.reset_token_expires < datetime.utcnow():
        abort(400, "Invalid or expired token")

    user.password = hash_password(new_password)
    user.reset_token = None          # Invalidate immediately
    user.reset_token_expires = None
    user.save()
```

**Detection rule:**
Flag password reset handlers that do not nullify the token after use. Flag token generation using `md5`, `sha1`, or `time.time()` as sole entropy sources. Flag reset tokens without expiration timestamps.

---

### AP-14: Missing Multi-Factor Authentication for Sensitive Operations

**Also known as:** No MFA, single-factor-only for critical actions, missing step-up authentication
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```python
@app.route('/api/account/change-email', methods=['POST'])
@login_required
def change_email():
    # Changes email (and thus password reset target) with no re-authentication
    current_user.email = request.json['new_email']
    current_user.save()
    return jsonify({"status": "ok"})

@app.route('/api/transfers', methods=['POST'])
@login_required
def wire_transfer():
    # Initiates a wire transfer with only a session cookie
    process_wire(request.json)
    return jsonify({"status": "ok"})
```

**Why developers do it:**
MFA adds user friction. Product teams push back on requiring re-authentication for "low-friction" user experience. Step-up authentication is architecturally complex -- it requires storing auth levels in the session and prompting conditionally.

**What goes wrong:**
- **Facebook (2018):** Attackers exploited the "View As" feature to steal access tokens for 50 million accounts. Without step-up authentication on sensitive operations, stolen tokens had full account access.
- **CircleCI (2023):** Malware on an engineer's laptop stole a valid, 2FA-backed SSO session. The session granted full access without re-authentication for sensitive operations.

Relying solely on password-based authentication means threat actors need only one credential -- which can be phished, purchased on the dark web, brute-forced, or guessed.

**The fix:**
```python
def require_recent_auth(max_age_seconds=300):
    """Require re-authentication for sensitive operations."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            last_auth = session.get('last_auth_time')
            if not last_auth or (time.time() - last_auth) > max_age_seconds:
                return jsonify({"error": "Re-authentication required"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator

@app.route('/api/account/change-email', methods=['POST'])
@login_required
@require_recent_auth(max_age_seconds=300)  # Must have re-authed within 5 min
def change_email():
    current_user.email = request.json['new_email']
    current_user.save()
```

**Detection rule:**
Flag endpoints for password change, email change, phone change, MFA change, fund transfer, and API key generation that lack step-up authentication middleware.

---

### AP-15: Excessive Token Lifetimes

**Also known as:** Long-lived JWTs, tokens that never expire, week-long sessions
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```python
# Token valid for 30 days
token = jwt.encode({
    "sub": user.id,
    "exp": datetime.utcnow() + timedelta(days=30)
}, SECRET_KEY, algorithm="HS256")

# Or worse: no expiration at all
token = jwt.encode({"sub": user.id}, SECRET_KEY, algorithm="HS256")
```

**Why developers do it:**
Long-lived tokens reduce the frequency of re-authentication, which improves user experience. Implementing token refresh flows adds complexity (refresh token storage, rotation, revocation). Developers default to "long enough that nobody complains."

**What goes wrong:**
A stolen token with a 30-day lifetime gives an attacker 30 days of access. With JWTs, there is no server-side revocation by default -- the token is valid until it expires. Organizations with proper token lifecycle management experience 47% fewer credential-compromise incidents according to SailPoint research.

Azure/Entra ID access tokens cannot be revoked once issued -- the only mitigation is short lifetimes. This architectural constraint has been exploited by attackers who steal tokens and maintain access even after the user changes their password.

**The fix:**
```python
# Short-lived access token + long-lived refresh token
access_token = jwt.encode({
    "sub": user.id,
    "exp": datetime.utcnow() + timedelta(minutes=15),  # 15-minute access token
    "type": "access"
}, SECRET_KEY, algorithm="HS256")

refresh_token = secrets.token_urlsafe(32)
# Store refresh token server-side (database), associated with the user
# Refresh tokens can be revoked by deleting the database entry
store_refresh_token(user.id, refresh_token, expires=timedelta(days=7))
```

**Detection rule:**
Flag JWT creation where `exp` exceeds 1 hour for access tokens. Flag JWTs without an `exp` claim. Flag refresh tokens with lifetimes exceeding 30 days.

---

### AP-16: Not Revoking Tokens on Password Change

**Also known as:** Stale sessions after credential change, zombie tokens, ghost access
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```python
@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    current_user.password = hash_password(request.json['new_password'])
    current_user.save()
    return jsonify({"status": "password changed"})
    # All existing tokens, sessions, and refresh tokens remain valid
    # If the password was changed because the account was compromised,
    # the attacker still has access via existing tokens
```

**Why developers do it:**
Session invalidation requires tracking all active sessions/tokens per user. With stateless JWTs, server-side revocation requires maintaining a blocklist or version counter -- which undermines the "stateless" advantage. Developers implement the password change and consider it done.

**What goes wrong:**
- **Cloudflare (2023):** After the Okta breach, Cloudflare was attacked using tokens and service account credentials that had not been rotated post-compromise. The nation-state attacker maintained access because credentials from the prior breach were still valid.
- **General pattern:** Google explicitly revokes OAuth 2.0 tokens when a user's password changes (documented as a security feature). Many applications do not implement this, leaving a window where compromised sessions persist indefinitely.

A user who changes their password because they suspect compromise expects all other sessions to terminate. When they do not, the password change is security theater.

**The fix:**
```python
@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    current_user.password = hash_password(request.json['new_password'])
    current_user.token_version += 1  # Increment token version
    current_user.save()

    # Invalidate all refresh tokens
    RefreshToken.query.filter_by(user_id=current_user.id).delete()

    # Invalidate all sessions
    Session.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()

    # Issue a new token for the current session only
    new_token = generate_token(current_user)
    return jsonify({"status": "password changed", "token": new_token})

# In token verification, check token_version
def verify_token(token):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user = User.query.get(payload['sub'])
    if user.token_version != payload.get('tv'):
        raise InvalidTokenError("Token revoked")
    return payload
```

**Detection rule:**
Flag password-change handlers that do not invalidate sessions, refresh tokens, or increment a token version counter. Flag JWT verification logic that does not check a per-user version or revocation list.

---

### AP-17: Role-Based Access Without Resource-Level Checks

**Also known as:** Coarse-grained authorization, vertical-only access control, role-is-enough fallacy
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
```python
@app.route('/api/projects/<project_id>/settings', methods=['PUT'])
@login_required
@require_role('manager')  # Checks that user is a manager...
def update_project_settings(project_id):
    # ...but not that they manage THIS project
    project = Project.query.get(project_id)
    project.settings = request.json
    project.save()
    return jsonify(project.settings)
```

**Why developers do it:**
Role-based access control (RBAC) is the most commonly taught authorization model. Frameworks make role checks easy. The mental model is "managers can manage things" rather than "this manager can manage these specific things." Resource-level (or attribute-based) access control requires more data in the authorization decision.

**What goes wrong:**
A manager in Team A can modify settings for Team B's projects. This is horizontal privilege escalation within a role. The fix for AP-05 (IDOR) addresses unauthenticated/unauthorized access, but this pattern is subtler: the user has the right role but not the right scope. This is especially dangerous in multi-tenant SaaS applications where a role in Tenant A should grant zero access to Tenant B.

**The fix:**
```python
@app.route('/api/projects/<project_id>/settings', methods=['PUT'])
@login_required
@require_role('manager')
def update_project_settings(project_id):
    # Check resource-level access, not just role
    project = Project.query.get(project_id)
    if not project:
        abort(404)
    if current_user.id not in project.manager_ids:
        abort(403)
    project.settings = request.json
    project.save()
    return jsonify(project.settings)
```

For complex scenarios, use a policy engine (OPA, Casbin, Cedar) that evaluates `(subject, action, resource)` tuples rather than `(subject, role)` alone.

**Detection rule:**
Flag endpoints that call role-check middleware but do not subsequently verify the relationship between the authenticated user and the specific resource being accessed. Flag authorization logic that does not reference the resource ID.

---

### AP-18: Trusting Client-Provided User Identity

**Also known as:** User ID in request body, role from the client, self-declared identity
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```python
@app.route('/api/orders', methods=['POST'])
def create_order():
    # User ID comes from the request body, not from the authenticated session
    order = Order(
        user_id=request.json['user_id'],   # Attacker sets any user_id
        items=request.json['items']
    )
    db.session.add(order)
    db.session.commit()
```

```javascript
// Client sends role claim in request
fetch('/api/admin/action', {
  method: 'POST',
  body: JSON.stringify({ userId: 42, role: 'admin', action: 'delete_user' })
});
```

**Why developers do it:**
During development, it is convenient to pass the user ID from the client. The developer intends to "fix it later" when auth is fully implemented. In some architectures, the user context is passed between frontend and backend without server-side verification.

**What goes wrong:**
Any user can impersonate any other user by changing the user_id field. CWE-602 and CWE-603 explicitly categorize this as a vulnerability. The OWASP Authorization Cheat Sheet states: "Access control checks must be performed server-side. Authorization and authentication controls must be re-enforced on the server-side."

**The fix:**
```python
@app.route('/api/orders', methods=['POST'])
@login_required
def create_order():
    order = Order(
        user_id=current_user.id,  # Always from the server session, never from the request
        items=request.json['items']
    )
    db.session.add(order)
    db.session.commit()
```

**Detection rule:**
Flag request body fields named `user_id`, `userId`, `user`, `role`, or `permissions` that are used in authorization decisions. Flag any endpoint where `request.json['user_id']` or `request.body.userId` is assigned to a model without comparison to the session user.

---

### AP-19: Missing Rate Limiting on Auth Endpoints

**Also known as:** Unrestricted authentication, no throttling, open credential stuffing target
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```python
# All auth endpoints wide open
@app.route('/api/login', methods=['POST'])
def login():
    return attempt_login(request.json)

@app.route('/api/register', methods=['POST'])
def register():
    return create_account(request.json)

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    return send_reset_email(request.json['email'])

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    return check_otp(request.json)
    # Attacker can brute-force 6-digit OTP (1 million combinations) in minutes
```

**Why developers do it:**
Rate limiting is infrastructure, not application logic. Developers expect it to be handled by the API gateway, load balancer, or CDN -- but nobody configures it. Application-level rate limiting requires Redis or similar state storage, which adds deployment complexity.

**What goes wrong:**
OWASP API Security Top 10 (API2:2023 Broken Authentication) explicitly calls out that "anti-brute force mechanisms should be implemented to mitigate credential stuffing, dictionary attacks, and brute force attacks on authentication endpoints." Without rate limiting:
- Login endpoints enable credential stuffing at scale.
- Password reset endpoints enable token enumeration.
- OTP endpoints enable brute-force bypass of MFA (a 6-digit OTP has only 1 million combinations).
- Registration endpoints enable mass account creation for spam.

**The fix:**
```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=get_remote_address, storage_uri="redis://localhost:6379")

@app.route('/api/login', methods=['POST'])
@limiter.limit("5/minute", key_func=lambda: request.json.get('email', get_remote_address()))
def login():
    return attempt_login(request.json)

@app.route('/api/forgot-password', methods=['POST'])
@limiter.limit("3/hour")
def forgot_password():
    return send_reset_email(request.json['email'])

@app.route('/api/verify-otp', methods=['POST'])
@limiter.limit("5/minute")
def verify_otp():
    return check_otp(request.json)
```

Rate limit by both IP and account identifier. Use exponential backoff on repeated failures.

**Detection rule:**
Flag authentication endpoints (login, register, forgot-password, verify-otp, verify-mfa) that lack rate-limiting middleware. Flag absence of rate-limiting infrastructure (Redis, Memcached) in deployment configs when cookie/session auth is used.

---

### AP-20: Logging Sensitive Authentication Data

**Also known as:** Credentials in logs, PII leakage to observability, debug logging in production
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```python
@app.route('/login', methods=['POST'])
def login():
    logger.info(f"Login attempt: email={request.form['email']}, password={request.form['password']}")
    # Password is now in plaintext in log files, shipped to Splunk/ELK/CloudWatch
    # Accessible to ops team, log aggregation service, anyone with log access

    user = authenticate(request.form['email'], request.form['password'])
    if user:
        token = generate_token(user)
        logger.info(f"Login success: user={user.id}, token={token}")
        # Token is now in logs -- anyone with log access can impersonate this user
```

**Why developers do it:**
Debug logging during development includes everything for easy troubleshooting. When code moves to production, nobody audits log statements. Structured logging libraries that auto-serialize request objects can inadvertently capture sensitive fields.

**What goes wrong:**
- **Twitter (2018):** Disclosed that a bug caused user passwords to be written to an internal log in plaintext. All 330 million users were asked to change their passwords.
- **Facebook (2019):** Discovered that hundreds of millions of passwords were stored in readable format in internal data storage systems. Engineers had logged passwords during authentication.

OWASP's logging guidelines explicitly prohibit logging: authentication passwords, session identification values, access tokens, database connection strings, encryption keys, and bank account or payment card holder data.

**The fix:**
```python
import re

SENSITIVE_FIELDS = {'password', 'token', 'secret', 'api_key', 'authorization', 'cookie', 'ssn', 'credit_card'}

class SanitizingFormatter(logging.Formatter):
    def format(self, record):
        msg = super().format(record)
        for field in SENSITIVE_FIELDS:
            msg = re.sub(
                rf'({field}\s*[=:]\s*)([^\s,;]+)',
                rf'\1[REDACTED]',
                msg,
                flags=re.IGNORECASE
            )
        return msg

# Application logging
logger.info(f"Login attempt: email={request.form['email']}")
# Never log: passwords, tokens, session IDs, API keys
```

**Detection rule:**
Grep log statements for variables named `password`, `token`, `secret`, `api_key`, `authorization`, `session_id`, `credit_card`. Flag `logger.*` calls that interpolate request body or header fields without a sanitization filter. Flag structured loggers configured to auto-serialize entire request objects.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns | Frequency |
|---|---|---|
| **Treating auth as a one-time setup** | AP-05, AP-06, AP-17 | Very High |
| **Prioritizing speed over security** | AP-02, AP-07, AP-12, AP-18 | Very High |
| **Misunderstanding crypto primitives** | AP-01, AP-02, AP-04 | High |
| **Following outdated tutorials** | AP-03, AP-04, AP-10 | High |
| **Missing lifecycle management** | AP-13, AP-15, AP-16 | High |
| **Assuming the client is trusted** | AP-06, AP-09, AP-18 | High |
| **Security features deferred to "later"** | AP-07, AP-12, AP-14, AP-19 | Very High |
| **Confusing authentication with authorization** | AP-05, AP-06, AP-17 | High |
| **Insufficient logging hygiene** | AP-20 | Medium |
| **Framework defaults accepted uncritically** | AP-08, AP-11 | Medium |

---

## Self-Check Questions

Use these questions during code review or architecture review to surface auth anti-patterns:

1. **Password storage:** Are passwords hashed with bcrypt, scrypt, or Argon2id? Can you confirm MD5/SHA1/SHA256 are NOT used for password hashing?

2. **Token storage:** Where are authentication tokens stored on the client? If localStorage, what is the XSS mitigation strategy? Are cookies marked HttpOnly, Secure, and SameSite?

3. **JWT validation:** Does the server explicitly whitelist allowed JWT algorithms? Is `"none"` rejected? Are `exp`, `aud`, and `iss` claims validated?

4. **Resource-level authorization:** For every endpoint that takes a resource ID, does the query/check verify the authenticated user has access to that specific resource (not just the right role)?

5. **Credential rotation:** What happens to existing sessions and tokens when a user changes their password? Are they invalidated?

6. **Secret management:** Are there any API keys, database passwords, or signing secrets in the source code or configuration files checked into version control? Is a pre-commit scanner configured?

7. **Rate limiting:** What happens if an attacker sends 10,000 login requests in one minute? What about 10,000 password reset requests? What about 1 million OTP verification attempts?

8. **Session lifecycle:** Is the session ID regenerated after login? Does the session expire? Can a user see and terminate other active sessions?

9. **OAuth flow:** Are redirect URIs validated against an exact-match whitelist? Is the `state` parameter generated and validated? Is PKCE used for public clients?

10. **Reset tokens:** Are password reset tokens cryptographically random, single-use, time-limited, and stored hashed? Can a used token be replayed?

11. **MFA coverage:** Which sensitive operations require re-authentication or step-up MFA? Is MFA enforced for password change, email change, API key creation, and fund transfers?

12. **Logging:** Do log statements capture passwords, tokens, session IDs, or API keys? Are request objects auto-serialized without field-level filtering?

13. **Authorization enforcement:** For every client-side route guard or UI visibility check, is there a corresponding server-side authorization check on the API endpoint?

14. **Token lifetime:** What is the access token lifetime? Is it under 1 hour? Are refresh tokens stored server-side and revocable?

---

## Code Smell Quick Reference

| Code Smell | Likely Anti-Pattern | Severity |
|---|---|---|
| `hashlib.md5(password)` or `hashlib.sha1(password)` | AP-02: Weak password hashing | Critical |
| `localStorage.setItem('token', ...)` | AP-03: XSS-accessible tokens | High |
| `jwt.decode(token, verify=False)` | AP-04: Unverified JWT | Critical |
| `jwt.decode(token, algorithms=None)` | AP-04: Algorithm confusion risk | Critical |
| `db.query(Model).get(request_param_id)` without user filter | AP-05: IDOR | Critical |
| API route with `@login_required` but no role/resource check | AP-06/AP-17: Missing authorization | High |
| String literal matching `AKIA*`, `sk_live_*`, `ghp_*` | AP-07: Hardcoded credentials | Critical |
| `session['user'] = ...` without `session.regenerate()` | AP-08: Session fixation | High |
| POST handler with cookie auth and no CSRF token check | AP-09: Missing CSRF protection | High |
| `redirect_uri` accepted from query params without whitelist validation | AP-10: OAuth open redirect | Critical |
| Auto-increment integer IDs in API URLs | AP-11: Enumerable identifiers | High |
| Login handler without attempt counting or rate-limit decorator | AP-12/AP-19: No brute-force protection | High |
| `hashlib.md5(email)` as reset token | AP-13: Predictable reset token | Critical |
| Password change endpoint without session invalidation | AP-16: Zombie tokens | High |
| `request.json['user_id']` used in data model assignment | AP-18: Trusting client identity | Critical |
| `logger.info(f"...password={password}...")` | AP-20: Credentials in logs | High |
| `timedelta(days=30)` in JWT `exp` claim | AP-15: Excessive token lifetime | High |
| `jwt.encode({...}, SECRET)` without `exp` claim | AP-15: Non-expiring token | High |
| Sensitive endpoint without `@require_mfa` or re-auth check | AP-14: Missing step-up auth | High |

---

*Researched: 2026-03-08 | Sources: OWASP Top 10 (2021, 2025), OWASP API Security Top 10, OWASP Cheat Sheet Series, Auth0 JWT vulnerability disclosure (2015), GitGuardian State of Secrets Sprawl (2023, 2024), Have I Been Pwned (Adobe, LinkedIn, RockYou), Portswigger Web Security Academy, PentesterLab JWT Guide, Salt Labs (Booking.com), CVE-2023-6927 (Keycloak), CVE-2026-28415 (Gradio), CVE-2026-28268 (Vikunja), CVE-2019-3778 (Spring Security OAuth), HackerOne reports (Weblate, Acronis, Mavenlink), CWE-602, CWE-603, Schneier on Security, Cybernews (RockYou2024), BleepingComputer, Wiz AI secrets research*
