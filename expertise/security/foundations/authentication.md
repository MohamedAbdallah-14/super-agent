# Authentication Security

> **Severity:** Critical
> **Applies to:** All (Web, Mobile, Backend, APIs)
> **Last updated:** 2026-03-08
> **Sources:** OWASP Authentication Cheat Sheet, NIST SP 800-63B-4, OWASP ASVS v5.0, PCI DSS 4.0, FIDO Alliance

---

## 1. Threat Landscape

Authentication is the single most targeted attack surface. In 2024-2025, 88% of breaches
involved stolen credentials to bypass network security (Verizon DBIR 2025). Credential-based
attacks are cheap, scalable, and automated. Understanding the threat landscape is prerequisite
to building defenses.

### 1.1 Credential Stuffing

Attackers use username-password pairs leaked from prior breaches and test them across services.
Password reuse makes this devastatingly effective. The median daily percentage of credential
stuffing accounts for 19% of all authentication attempts, rising to 25% in enterprise
environments (Verizon DBIR 2025). IBM X-Force reports an 84% increase in infostealer delivery
via phishing in 2024 versus 2023, with a ~180% jump in early 2025.

**Real breach -- Snowflake (2024):** The hacking group UNC5537/Scattered Spider used
credentials stolen via infostealer malware to access 160+ organizations' Snowflake cloud
environments, including AT&T, Ticketmaster/Live Nation, Santander Bank, and Advance Auto
Parts. 79.7% of compromised accounts used credentials from infostealer campaigns dating back
to 2020. The root cause: no mandatory MFA on Snowflake customer accounts.

### 1.2 MFA Fatigue / Prompt Bombing

Attackers with valid credentials repeatedly trigger MFA push notifications until the victim
approves one out of frustration or confusion.

**Real breach -- Uber (2022):** A Lapsus$ affiliate purchased a contractor's Uber corporate
credentials from the dark web (the contractor's device had been infected with malware). The
attacker bombarded the contractor with MFA push requests and then contacted them on WhatsApp,
impersonating Uber IT, saying the only way to stop the notifications was to accept. Once
approved, the attacker accessed Slack, G-Suite, AWS, Duo, and Uber's HackerOne dashboard.
PAM credentials were found in plaintext PowerShell scripts.

### 1.3 Credential Theft via Compromised Accounts

Inactive, orphaned, or service accounts with static credentials and no MFA are prime targets.

**Real breach -- Colonial Pipeline (2021):** DarkSide ransomware group accessed Colonial
Pipeline's network through an inactive VPN account that had no MFA. The password was found in
a dark web credential dump, likely reused from another breached service. Impact: pipeline
shutdown, $4.4M ransom paid, fuel shortage across the US East Coast.

### 1.4 Identity Provider Compromise

When the authentication provider itself is breached, downstream impact is catastrophic.

**Real breach -- Okta (2023):** An employee saved service account credentials for Okta's
customer support case management system to their personal Google account. When their personal
device was compromised, attackers used those credentials to access support cases containing
HAR files with session tokens. 134 customers were affected; 5 had active sessions hijacked.
All customer support user names and emails were exfiltrated.

### 1.5 Phishing and Adversary-in-the-Middle (AitM)

Modern phishing kits like EvilProxy and Tycoon 2FA operate as real-time reverse proxies,
capturing both credentials and session tokens simultaneously. These bypass traditional MFA
(TOTP, SMS, push) because the attacker relays the legitimate authentication flow. Only
phishing-resistant authenticators (FIDO2/WebAuthn) defeat AitM attacks.

### 1.6 Attacker Motivations and Trends

- **Financial gain:** Ransomware, fraud, cryptocurrency theft
- **Data exfiltration:** PII, healthcare records, financial data for sale on dark web
- **Supply chain access:** Compromise one vendor to reach hundreds of downstream targets
- **AI-assisted attacks:** AI predicts passwords, generates phishing content, automates
  credential stuffing at scale (16% of breaches now involve attacker AI)

---

## 2. Core Security Principles

### 2.1 Password Storage

Passwords must NEVER be stored in plaintext or using reversible encryption. The only acceptable
approach is one-way adaptive hashing with a unique salt per password.

**Algorithm hierarchy (strongest first):**

| Algorithm | Type | Recommendation | Min Parameters |
|-----------|------|---------------|----------------|
| Argon2id | Memory-hard | **Primary choice** (OWASP, NIST) | 19 MiB memory, 2 iterations, 1 parallelism |
| scrypt | Memory-hard | Secondary choice | N=2^17, r=8, p=1 |
| bcrypt | CPU-hard | Legacy systems only | cost factor 12+ |
| PBKDF2-HMAC-SHA256 | CPU-hard | FIPS-compliant environments | 600,000 iterations (OWASP 2025) |

**NEVER use:** MD5, SHA-1, SHA-256 (unsalted), DES-crypt, or any fast hash for passwords.
These can be brute-forced at billions of hashes per second on modern GPUs.

**Why Argon2id wins:** It is the winner of the Password Hashing Competition (2013-2015),
resistant to both GPU attacks (memory-hard) and side-channel attacks (data-independent memory
access in the id variant). NIST SP 800-63B-4 formally recommends Argon2id.

### 2.2 Multi-Factor Authentication (MFA)

MFA is the single most impactful control. Microsoft analysis shows MFA stops 99.9% of
automated account compromises. Factors are categorized as:

- **Something you know:** Password, PIN, security questions (weakest)
- **Something you have:** Hardware key, authenticator app, smart card
- **Something you are:** Fingerprint, face scan, iris scan

**MFA strength hierarchy (strongest first):**

1. **FIDO2/WebAuthn hardware keys** -- Phishing-resistant, no shared secrets
2. **Platform authenticators (passkeys)** -- Synced via cloud, phishing-resistant
3. **TOTP authenticator apps** -- Time-based codes (Google Authenticator, Authy)
4. **Push notifications with number matching** -- Resist MFA fatigue
5. **SMS/Email OTP** -- NIST "restricted" authenticators; vulnerable to SIM swap, interception

### 2.3 Session Management Post-Authentication

Authentication is pointless if session management is broken. Critical rules:

- **Regenerate session ID after login** -- Prevents session fixation (CWE-384)
- **Set secure cookie attributes** -- `Secure`, `HttpOnly`, `SameSite=Strict`
- **Enforce idle timeout** -- 15-minute idle timeout (PCI DSS 4.0)
- **Enforce absolute timeout** -- Maximum session lifetime regardless of activity
- **Bind session to context** -- IP range, user agent, device fingerprint
- **Invalidate on logout** -- Server-side session destruction, not just cookie deletion

### 2.4 Zero-Trust Authentication

Never trust, always verify. Every request must be authenticated and authorized regardless of
network location:

- **No implicit trust from network position** -- Internal services authenticate too
- **Continuous verification** -- Re-authenticate on privilege escalation
- **Least privilege** -- Tokens carry minimum necessary scopes
- **Device posture assessment** -- Check device health before granting access
- **Short-lived credentials** -- Access tokens expire in minutes, not days

---

## 3. Implementation Patterns

### 3.1 Secure Password Hashing

**TypeScript (using argon2 library):**

```typescript
import argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,          // 19 MiB (OWASP minimum)
    timeCost: 2,                // 2 iterations
    parallelism: 1,             // 1 thread
    saltLength: 16,             // 128-bit salt (auto-generated)
  });
}

async function verifyPassword(
  hash: string, password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

**Python (using argon2-cffi):**

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher(
    memory_cost=19456,   # 19 MiB
    time_cost=2,         # 2 iterations
    parallelism=1,       # 1 thread
    hash_len=32,         # 256-bit hash
    salt_len=16,         # 128-bit salt
)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(stored_hash: str, password: str) -> bool:
    try:
        return ph.verify(stored_hash, password)
    except VerifyMismatchError:
        return False
```

### 3.2 TOTP Verification

```typescript
import { TOTP } from 'otpauth';

function createTOTPSecret(issuer: string, accountName: string) {
  const totp = new TOTP({
    issuer,
    label: accountName,
    algorithm: 'SHA1',       // SHA1 is the standard for TOTP (RFC 6238)
    digits: 6,
    period: 30,              // 30-second window
  });
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),    // otpauth:// URI for QR code generation
  };
}

function verifyTOTP(secret: string, token: string): boolean {
  const totp = new TOTP({ secret });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
```

### 3.3 WebAuthn/FIDO2 Registration

```typescript
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const rpName = 'My Application';
const rpID = 'example.com';
const origin = 'https://example.com';

async function startRegistration(user: User) {
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: user.existingCredentials.map(cred => ({
      id: cred.credentialID,
      type: 'public-key',
    })),
  });
  return options;
}

async function finishRegistration(
  user: User, response: RegistrationResponse
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (verification.verified && verification.registrationInfo) {
    await storeCredential(user.id, verification.registrationInfo);
  }
  return verification.verified;
}
```

### 3.4 OAuth 2.0 / OIDC with PKCE

```typescript
import crypto from 'node:crypto';

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

function getAuthorizationURL(clientId: string, redirectUri: string) {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const url = new URL('https://auth.example.com/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { url: url.toString(), verifier, state };
}

async function exchangeCode(code: string, verifier: string) {
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: 'your-client-id',
      redirect_uri: 'https://app.example.com/callback',
    }),
  });
  return response.json();
}
```

### 3.5 Rate Limiting Login Attempts

```typescript
import Redis from 'ioredis';

const redis = new Redis();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

async function checkLoginRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900
): Promise<RateLimitResult> {
  const key = `login_rate:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, now - windowMs);
  multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
  multi.zcard(key);
  multi.expire(key, windowSeconds);

  const results = await multi.exec();
  const currentCount = results?.[2]?.[1] as number;

  if (currentCount > maxAttempts) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs };
  }
  return {
    allowed: true,
    remaining: maxAttempts - currentCount,
    retryAfterMs: 0,
  };
}
```

### 3.6 Account Lockout Policy

Implement progressive delays, not permanent lockout (which enables denial-of-service):

- **5 failed attempts:** 1-minute soft lockout
- **10 failed attempts:** 5-minute lockout + CAPTCHA required
- **20 failed attempts:** 30-minute lockout + account owner notified
- **50 failed attempts:** Account locked pending manual review

Always allow unlock via verified email/phone to prevent attacker-induced denial of service.

---

## 4. Vulnerability Catalog

### V1. Plaintext Password Storage
- **CWE-256:** Plaintext Storage of a Password
- **Impact:** Total account compromise on any data leak
- **Fix:** Use Argon2id hashing (see Section 3.1)

```python
# VULNERABLE
user.password = request.form['password']
db.save(user)

# SECURE
user.password_hash = ph.hash(request.form['password'])
db.save(user)
```

### V2. Weak Hashing (MD5/SHA1/SHA256 unsalted)
- **CWE-328:** Use of Weak Hash
- **Impact:** Hashcat cracks MD5 at 60+ billion hashes/sec on consumer GPU
- **Fix:** Migrate to Argon2id; rehash on next successful login

```python
# VULNERABLE
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# SECURE
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash(password)
```

### V3. Missing Multi-Factor Authentication
- **CWE-308:** Use of Single-Factor Authentication
- **Impact:** Credential stuffing, phishing, and brute force all succeed
- **Real-world:** Snowflake 2024 -- 160+ orgs breached, no MFA enforced
- **Fix:** Enforce MFA for all users; prioritize FIDO2/passkeys

### V4. Timing Attack on Password Comparison
- **CWE-208:** Observable Timing Discrepancy
- **Impact:** Attacker determines correct password characters via response time

```typescript
// VULNERABLE: Early-exit string comparison
function checkPassword(input: string, stored: string): boolean {
  return input === stored;
}

// SECURE: Constant-time comparison
import crypto from 'node:crypto';
function checkPassword(inputHash: Buffer, storedHash: Buffer): boolean {
  return crypto.timingSafeEqual(inputHash, storedHash);
}
```

### V5. User Enumeration via Error Messages
- **CWE-204:** Observable Response Discrepancy
- **Impact:** Attacker discovers valid usernames for targeted attacks

```typescript
// VULNERABLE
if (!userExists) return res.json({ error: 'User not found' });
if (!passwordValid) return res.json({ error: 'Invalid password' });

// SECURE
if (!userExists || !passwordValid) {
  return res.json({ error: 'Invalid email or password' });
}
// Hash a dummy password when user does not exist to prevent
// timing-based enumeration
```

### V6. Session Fixation Post-Login
- **CWE-384:** Session Fixation
- **Impact:** Attacker pre-sets session ID, victim authenticates, attacker hijacks

```typescript
// VULNERABLE
app.post('/login', (req, res) => {
  if (authenticate(req.body)) {
    req.session.authenticated = true;  // Same session ID
  }
});

// SECURE
app.post('/login', (req, res) => {
  if (authenticate(req.body)) {
    req.session.regenerate((err) => {
      req.session.authenticated = true;
      req.session.save();
    });
  }
});
```

### V7. JWT Algorithm Confusion
- **CWE-327:** Use of Broken or Risky Cryptographic Algorithm
- **CVE-2024-54150, CVE-2026-22817 (Hono, CVSS 8.2), CVE-2026-23993**
- **Impact:** Attacker forges valid tokens by switching RS256 to HS256

```typescript
// VULNERABLE
const decoded = jwt.verify(token, publicKey);

// SECURE
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://auth.example.com',
  audience: 'my-app',
});
```

### V8. JWT "none" Algorithm Attack
- **CWE-345:** Insufficient Verification of Data Authenticity
- **Impact:** Attacker removes signature; unsigned token accepted as valid
- **Fix:** Always specify allowed algorithms; reject `alg: none` (case-insensitive)

### V9. Weak Password Requirements
- **CWE-521:** Weak Password Requirements
- **Impact:** Users choose easily guessable passwords
- **Fix:** Min 12 chars (NIST/PCI DSS 4.0); check against breached lists; do NOT
  enforce arbitrary complexity rules (leads to predictable patterns like "Password1!")

### V10. Insecure Password Reset Flow
- **CWE-640:** Weak Password Recovery Mechanism
- **Impact:** Account takeover via predictable tokens or no expiry
- **Fix:** Cryptographically random tokens (128-bit entropy), 15-min expiry,
  single-use, via confirmed email/phone only

### V11. Missing Rate Limiting
- **CWE-307:** Improper Restriction of Excessive Authentication Attempts
- **Impact:** Unlimited brute force attempts
- **Fix:** Sliding window rate limiting (see Section 3.5)

### V12. Credential Transmission Without TLS
- **CWE-523:** Unprotected Transport of Credentials
- **Impact:** Network interception of passwords in transit
- **Fix:** HTTPS everywhere; HSTS with preload; redirect HTTP to HTTPS

### V13. Hardcoded Credentials
- **CWE-798:** Use of Hard-coded Credentials
- **Impact:** Trivial unauthorized access
- **Fix:** Require password change on first login; scan code for credential patterns

### V14. Insufficient Session Expiration
- **CWE-613:** Insufficient Session Expiration
- **Impact:** Stolen session tokens remain valid indefinitely
- **Fix:** 15-min idle timeout, 8-24 hr absolute timeout, revoke on password change

### V15. Insecure "Remember Me"
- **CWE-539:** Use of Persistent Cookies Without Expiration
- **Impact:** Long-lived tokens without rotation enable persistent compromise
- **Fix:** Separate persistent token rotated on each use with device binding

---

## 5. Security Checklist

### Password Policy
- [ ] Minimum password length of 12 characters enforced
- [ ] Maximum password length of at least 64 characters allowed
- [ ] No arbitrary complexity rules (no mandatory uppercase/special mandates)
- [ ] Passwords checked against breached password list (HIBP, top 100K)
- [ ] Unicode characters permitted in passwords (NIST 800-63B)
- [ ] No password hints or knowledge-based questions

### Password Storage
- [ ] Argon2id used with OWASP parameters (19 MiB, 2 iterations)
- [ ] Unique random salt per password (minimum 128 bits)
- [ ] No reversible encryption of passwords
- [ ] Migration path for legacy hashes (rehash on successful login)

### Multi-Factor Authentication
- [ ] MFA enforced for all users (not optional)
- [ ] FIDO2/WebAuthn supported as primary MFA method
- [ ] TOTP authenticator apps supported as fallback
- [ ] SMS/Email OTP being phased out (NIST "restricted")
- [ ] MFA fatigue mitigated (number matching, rate limit on prompts)
- [ ] Recovery codes generated (8+ codes, single-use, stored hashed)

### Rate Limiting and Lockout
- [ ] Login attempts rate-limited per IP and per account
- [ ] Progressive delays on repeated failures (not permanent lockout)
- [ ] CAPTCHA triggered after threshold failures
- [ ] Rate limiting on password reset and MFA verification endpoints
- [ ] Distributed rate limiting across all application instances

### Session Management
- [ ] Session ID regenerated after successful authentication
- [ ] Session cookies: Secure, HttpOnly, SameSite=Strict
- [ ] Idle timeout enforced (15 minutes for sensitive apps)
- [ ] Absolute session timeout enforced (8-24 hours)
- [ ] All sessions invalidated on password change
- [ ] Logout destroys server-side session state

### Password Reset
- [ ] Reset tokens are cryptographically random (128+ bit entropy)
- [ ] Reset tokens expire within 15 minutes
- [ ] Reset tokens are single-use
- [ ] Prior reset tokens invalidated on new request
- [ ] Generic response regardless of whether account exists
- [ ] Notification sent to registered email on password change

### Transport and Infrastructure
- [ ] All auth endpoints served over HTTPS only
- [ ] HSTS header with includeSubDomains and preload
- [ ] Credentials never logged (mask in application logs)
- [ ] Credentials never in URL query parameters

---

## 6. Tools and Automation

### Authentication Libraries

| Library | Platform | Notes |
|---------|----------|-------|
| **Passport.js** | Node.js | Strategy-based; 500+ auth providers |
| **NextAuth.js / Auth.js** | Next.js / SvelteKit | Built-in providers, JWT/session modes |
| **Firebase Auth** | Multi-platform | Managed; phone, email, social, anonymous |
| **Supabase Auth** | Multi-platform | Open-source; GoTrue-based; RLS integration |
| **Lucia** | Node.js | Lightweight, framework-agnostic |
| **Keycloak** | Java / Self-hosted | Enterprise IAM; SAML + OIDC |
| **@simplewebauthn** | Node.js + Browser | WebAuthn/FIDO2 registration and auth |

### Password Strength Assessment

| Tool | Type | Usage |
|------|------|-------|
| **zxcvbn / zxcvbn-ts** | Library | Realistic strength estimation; penalizes patterns |
| **Have I Been Pwned API** | API | k-Anonymity model; 800M+ breached credentials |
| **HIBP Downloader** | Offline DB | Full SHA-1 hash set for air-gapped environments |

### Credential Leak Detection

| Tool | Purpose |
|------|---------|
| **Have I Been Pwned** | Check emails/passwords against known breaches |
| **Enzoic** | Real-time compromised credential screening |
| **SpyCloud** | Enterprise credential exposure monitoring |
| **GitGuardian** | Detect credentials committed to repositories |

### Static Analysis Rules

| Tool | Auth-Related Rules |
|------|-------------------|
| **Semgrep** | `jwt-none-alg`, `insecure-hash`, `secrets` |
| **CodeQL** | `CWE-312` (cleartext storage), `CWE-327` (weak crypto) |
| **Bearer CLI** | `observable_timing`, `hardcoded_credential` |
| **ESLint Plugin Security** | `detect-possible-timing-attacks` |

---

## 7. Platform-Specific Guidance

### 7.1 Web Applications

**Cookie-Based Sessions (server-rendered apps):**
```
Set-Cookie: session=<random-id>;
  Secure; HttpOnly; SameSite=Strict;
  Path=/; Max-Age=28800; Domain=example.com
```

- Store session data server-side (Redis, database); cookie holds only session ID
- Session ID: at least 128 bits of cryptographic randomness
- Never store sensitive data in the cookie itself

**JWT-Based Authentication (SPAs, APIs):**
- Store access tokens in memory only (not localStorage or sessionStorage)
- Short-lived access tokens (5-15 minutes)
- HttpOnly cookie for refresh tokens
- Validate: signature, `exp`, `iss`, `aud`, `iat`
- Specify algorithm explicitly (prevent algorithm confusion)
- Token revocation via server-side blocklist for logout

**Content Security Policy for login pages:**
```
Content-Security-Policy: default-src 'self';
  script-src 'self'; form-action 'self'; frame-ancestors 'none';
```

### 7.2 Mobile Applications

**Biometric Authentication:**
- Use platform APIs: `BiometricPrompt` (Android), `LAContext` (iOS)
- Biometrics unlock a cryptographic key, not directly grant access
- Fall back to device PIN/passcode, not application password

**Secure Key Storage:**
- **iOS:** Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
- **Android:** Android Keystore with TEE/StrongBox binding
- Never store tokens in SharedPreferences or UserDefaults unencrypted

**Certificate Pinning:**
- Pin leaf certificate or public key hash for auth endpoints
- Implement backup pins for rotation
- Use `TrustKit` (iOS) or `OkHttp CertificatePinner` (Android)

**Encrypted Token Storage (Android):**

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPrefs = EncryptedSharedPreferences.create(
    context, "auth_prefs", masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
sharedPrefs.edit().putString("refresh_token", token).apply()
```

### 7.3 Backend / Service-to-Service

**API Keys vs Tokens:**
- API keys identify the calling application, not the user
- OAuth tokens identify both application and user
- Never embed API keys in client-side code or mobile apps

**Mutual TLS (mTLS):**
- Both client and server present certificates
- Ideal for service mesh (Istio, Linkerd) and zero-trust internal networks
- Automate certificate rotation (short-lived certs via ACME/Vault)

**Service Account Best Practices:**
- Use workload identity (GCP), IAM roles (AWS), managed identity (Azure)
- Rotate keys automatically (maximum 90-day lifetime)
- Apply least-privilege scopes; audit usage

**JWT for Microservices:**

```typescript
function validateServiceToken(token: string) {
  return jwt.verify(token, SERVICE_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'auth-service.internal',
    audience: 'inventory-service',
    maxAge: '5m',
  });
}
```

---

## 8. Incident Patterns

### 8.1 Credential Stuffing Attack Chain

**Detection signals:**
1. Spike in failed logins from diverse IP addresses
2. Login attempts using email addresses not registered in the system
3. Successful logins from unusual geographic locations
4. Multiple accounts accessed from the same IP in rapid succession
5. User-agent strings matching known bot frameworks

**Response steps:**
1. Enable enhanced CAPTCHA on login endpoints immediately
2. Force password resets for accounts with suspicious successful logins
3. Cross-reference login timestamps with known breach credential dumps
4. Temporarily block IP ranges associated with the attack
5. Notify affected users and recommend enabling MFA
6. Review and strengthen rate limiting thresholds

### 8.2 Account Takeover Detection

**Detection signals:**
1. Password change followed by MFA method change
2. Login from new device/location followed by sensitive operations
3. Multiple simultaneous active sessions from different locations
4. Recovery email or phone number changed shortly after login
5. Unusual API access patterns (data export, privilege changes)

**Response steps:**
1. Lock the account immediately pending verification
2. Invalidate all active sessions and tokens
3. Require identity verification (ID document, phone call)
4. Review account activity log for data exfiltration
5. Reset all credentials (password, MFA, recovery methods)
6. Notify user through pre-compromise contact method

### 8.3 MFA Bypass Detection

**Detection signals:**
1. Repeated MFA prompts to same user in short succession (fatigue attack)
2. MFA approval from different location than initial login
3. Session token reuse from different IP/device (token theft)
4. Successful auth that bypasses MFA step in server logs

**Response steps:**
1. Revoke all active sessions for the affected account
2. Disable push-based MFA; switch to FIDO2 or TOTP
3. Investigate for AitM phishing kit deployment
4. Check if session tokens were exposed in support cases or logs
5. Enforce number-matching for push MFA across all accounts
6. Audit all actions taken during the compromised session

---

## 9. Compliance and Standards

### 9.1 NIST SP 800-63B-4

- **AAL1:** Single-factor allowed; memorized secrets min 8 chars (12+ recommended)
- **AAL2:** Multi-factor required; NIST recognizes synced passkeys as AAL2-capable
- **AAL3:** Hardware-based, phishing-resistant (FIDO2); verifier impersonation resistance
- **Password rules:** No composition rules; no periodic rotation unless evidence of
  compromise; min 8 chars; check breached lists; allow paste into fields
- **Restricted authenticators:** SMS and email OTP require alternative options and
  user notification of risk

### 9.2 OWASP ASVS v5.0

V2 (Authentication) verification requirements:
- **V2.1:** Password security (length, complexity, storage)
- **V2.2:** General authenticator requirements
- **V2.3:** Authenticator lifecycle (reset, recovery, expiry)
- **V2.4:** Credential storage (Argon2id/bcrypt/scrypt/PBKDF2)
- **V2.5:** Credential recovery requirements
- **V2.6:** Lookup secret verifier (recovery codes)
- **V2.7:** Out-of-band verifier (SMS/email -- restricted)
- **V2.8:** Time-based OTP
- **V2.9:** Cryptographic authenticator (FIDO2, client certificates)
- **V2.10:** Service authentication (API keys, service accounts)
- ASVS L1 maps to NIST AAL1, L2 to AAL2, L3 to AAL3

### 9.3 PCI DSS 4.0

- **Req 8.2:** Minimum 12-character passwords
- **Req 8.3.6:** Password change every 90 days (only if no MFA)
- **Req 8.4.2:** MFA for ALL access to cardholder data environment
- **Req 8.5:** MFA factors must be independent
- **Req 8.6:** Inactive accounts disabled after 90 days
- **Req 8.2.8:** Re-authenticate after 15 minutes of inactivity
- **PCI DSS 4.0.1:** Phishing-resistant factor substitutes MFA for non-admin CDE access

### 9.4 SOC 2 Authentication Controls

- **CC6.1:** Logical access controls -- unique user IDs, role-based access
- **CC6.2:** Registration and authorization -- identity proofing before provisioning
- **CC6.3:** Security for registered users -- MFA enforcement, session controls
- **CC6.6:** Restrictions on access -- least privilege, periodic access review
- Evidence required: MFA enforcement logs, access reviews, password policy config,
  deprovisioning procedures for terminated users

---

## 10. Code Examples

### 10.1 Secure JWT Validation (TypeScript)

```typescript
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new Error('Missing kid in JWT header'));
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

async function validateAccessToken(
  token: string
): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        getSigningKey(header)
          .then(key => callback(null, key))
          .catch(err => callback(err));
      },
      {
        algorithms: ['RS256'],
        issuer: 'https://auth.example.com',
        audience: 'my-api',
        clockTolerance: 30,
        maxAge: '15m',
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as JwtPayload);
      }
    );
  });
}
```

### 10.2 Password Hashing Migration (Python)

```python
"""Migrate legacy MD5/SHA hashes to Argon2id on successful login."""
import hashlib
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher(memory_cost=19456, time_cost=2, parallelism=1)

def verify_and_migrate(user, password: str) -> bool:
    if user.hash_algorithm == 'argon2id':
        try:
            ph.verify(user.password_hash, password)
            if ph.check_needs_rehash(user.password_hash):
                user.password_hash = ph.hash(password)
                user.save()
            return True
        except VerifyMismatchError:
            return False

    # Legacy verification then upgrade
    if user.hash_algorithm == 'md5':
        legacy_hash = hashlib.md5(
            (user.salt + password).encode()
        ).hexdigest()
    elif user.hash_algorithm == 'sha256':
        legacy_hash = hashlib.sha256(
            (user.salt + password).encode()
        ).hexdigest()
    else:
        return False

    if legacy_hash != user.password_hash:
        return False

    # Upgrade to Argon2id
    user.password_hash = ph.hash(password)
    user.hash_algorithm = 'argon2id'
    user.salt = None  # Argon2 manages its own salt
    user.save()
    return True
```

### 10.3 Rate Limiter Middleware (TypeScript/Express)

```typescript
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis();

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  keyPrefix: string;
}

function loginRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const username = req.body?.email?.toLowerCase() || 'unknown';
    const ipKey = `${config.keyPrefix}:ip:${ip}`;
    const userKey = `${config.keyPrefix}:user:${username}`;

    const [ipCount, userCount] = await Promise.all([
      incrementAndCount(ipKey, config.windowMs),
      incrementAndCount(userKey, config.windowMs),
    ]);

    if (userCount > config.maxAttempts) {
      res.set('Retry-After', String(config.windowMs / 1000));
      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
      });
    }

    if (ipCount > config.maxAttempts * 10) {
      res.set('Retry-After', String(config.windowMs / 1000));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }

    next();
  };
}

async function incrementAndCount(
  key: string, windowMs: number
): Promise<number> {
  const now = Date.now();
  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, now - windowMs);
  multi.zadd(key, now.toString(), `${now}:${Math.random()}`);
  multi.zcard(key);
  multi.pexpire(key, windowMs);
  const results = await multi.exec();
  return (results?.[2]?.[1] as number) || 0;
}

// Usage
app.post('/api/login',
  loginRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    keyPrefix: 'rl:login',
  }),
  loginHandler
);
```

### 10.4 Constant-Time Comparison

```typescript
// TypeScript/Node.js
import crypto from 'node:crypto';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
```

```python
# Python
import hmac

def safe_compare(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
```

---

## Passkey Adoption Status (2025)

As of 2025, passkeys have reached mainstream adoption:

- **69% of users** have at least one passkey; awareness at 74-75%
- **3 billion+ passkeys** in active use globally
- **48% of top 100 websites** support passkeys (doubled since 2022)
- **87% of businesses** have deployed or are deploying passkeys
- **NIST formally recognizes** passkeys as syncable authenticators at AAL2
- Apple, Google, and Microsoft provide native passkey support across all platforms
- Mobile adoption at 55-60%; desktop at ~20%

Organizations should begin passkey deployment now and plan for password deprecation.

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [NIST SP 800-63B-4](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [OWASP ASVS v5.0 - V2 Authentication](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x11-V2-Authentication.md)
- [FIDO Alliance - Passkey Adoption 2025](https://fidoalliance.org/fido-alliance-champions-widespread-passkey-adoption-and-a-passwordless-future-on-world-passkey-day-2025/)
- [Verizon 2025 DBIR - Credential Stuffing](https://www.verizon.com/business/resources/articles/credential-stuffing-attacks-2025-dbir-research/)
- [PCI DSS 4.0 Auth Requirements](https://www.hypr.com/blog/pci-dss-4-password-mfa-requirements)
- [CWE-208: Observable Timing Discrepancy](https://cwe.mitre.org/data/definitions/208.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [CWE-204: Observable Response Discrepancy](https://cwe.mitre.org/data/definitions/204.html)
- [PortSwigger - JWT Attacks](https://portswigger.net/web-security/jwt)
- [Snowflake Breach 2024](https://cloudsecurityalliance.org/blog/2025/05/07/unpacking-the-2024-snowflake-data-breach)
- [Uber 2022 Breach](https://www.darkreading.com/cyberattacks-data-breaches/uber-breach-external-contractor-mfa-bombing-attack)
- [Colonial Pipeline Attack](https://thehackernews.com/2021/06/hackers-breached-colonial-pipeline.html)
- [Okta 2023 Support Breach](https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/)
