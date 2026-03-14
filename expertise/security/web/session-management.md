# Session Management Security

> Expertise module for AI agents implementing secure session handling.
> Sources: OWASP Session Management Cheat Sheet, NIST SP 800-63B, PCI-DSS 4.0, CWE/CVE databases, PortSwigger research, vendor advisories (2024-2026).

---

## 1. Threat Landscape

### 1.1 Attack Categories

| Attack | Description | Prevalence |
|--------|-------------|------------|
| Session Hijacking | Attacker steals a valid session token and replays it to impersonate the victim | Critical — rising sharply with infostealer malware |
| Session Fixation | Attacker sets a known session ID before the victim authenticates, then reuses it | High — CVE-2024-7341 (Keycloak), CVE-2024-38513 (GoFiber) |
| Session Prediction | Attacker guesses or brute-forces session IDs due to weak entropy | Medium — still found in custom frameworks |
| Cookie Theft via XSS | Injected script reads `document.cookie` and exfiltrates session tokens | Critical — primary vector when HttpOnly is missing |
| CSRF via Weak Session Config | Cross-site requests ride on ambient cookies lacking SameSite protection | High — mitigated by SameSite=Lax default in modern browsers |
| Token Replay (MFA Bypass) | Stolen session tokens bypass MFA because authentication already completed | Critical — 17 billion stolen cookie records recaptured from dark web in 2024 |

### 1.2 Real-World Breaches

**Chrome Extension Supply Chain Attack (December 2024):**
Attackers injected malicious code into legitimate Chrome browser extensions used by enterprises for social media advertising. The compromised extensions exfiltrated browser cookies and session tokens during a 25-hour window, granting attackers access to authenticated sessions on Facebook Ads and AI platforms. Multiple companies were affected before the extensions were revoked.

**Keycloak SAML Session Fixation (CVE-2024-7341):**
Keycloak's SAML adapter failed to rotate the session ID at login time. An attacker who obtained a pre-authentication session cookie could wait for the victim to authenticate, then reuse the same cookie to access the victim's authenticated session. Affected all Keycloak versions using SAML adapters until patched.

**GoFiber Session Fixation (CVE-2024-38513):**
GoFiber versions prior to 2.52.5 allowed attackers to supply arbitrary `session_id` values. Because the framework accepted attacker-controlled session identifiers without regeneration, authenticated sessions could be hijacked after a victim logged in with the attacker-supplied ID.

**Ivanti EPM Stored XSS to Session Hijacking (CVE-2025-10573, CVSS 9.6):**
Ivanti Endpoint Manager versions through 2024 SU4 allowed unauthenticated JavaScript injection. Attackers leveraged stored XSS to steal admin session cookies, escalating to full endpoint management control.

**Microsoft 365 & Okta Token Theft Campaigns (2024-2025):**
Adversary-in-the-middle (AiTM) phishing kits like EvilProxy and Evilginx captured session tokens after victims completed MFA. Stolen tokens were replayed from attacker infrastructure, bypassing conditional access policies. Multiple Fortune 500 companies reported unauthorized access to email and cloud resources.

### 1.3 Trends

- **Infostealer malware dominance:** Lumma, RisePro, Vidar, Stealc, and RedLine shifted focus from password theft to session cookie/token exfiltration. Over 17 billion stolen cookie records were found on dark web markets in 2024.
- **Post-MFA session theft:** Attackers increasingly target the session layer because stealing a live session bypasses all authentication controls including MFA.
- **Identity-based hijacking:** Modern session hijacking is no longer network-based (sniffing). It is identity-based, performed over the public internet against cloud applications using stolen cookies, tokens, and session IDs.
- **Browser extension as attack vector:** Supply chain attacks on browser extensions provide direct access to cookies and session storage within the browser context.

---

## 2. Core Security Principles

### 2.1 Session ID Entropy

Session identifiers MUST be cryptographically random and unpredictable.

- **Minimum 128 bits of entropy** (OWASP recommendation). This translates to at least 32 hexadecimal characters or 22 base64 characters.
- Use a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator): `crypto.randomBytes()` in Node.js, `secrets.token_hex()` in Python, `SecureRandom` in Java.
- NEVER derive session IDs from user data (username, email, timestamp, sequential counters).
- NEVER expose session IDs in URLs, error messages, or logs.

### 2.2 Secure Cookie Attributes

Every session cookie MUST set all of the following attributes:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | `true` | Prevents JavaScript access — blocks XSS-based cookie theft |
| `Secure` | `true` | Cookie transmitted only over HTTPS — blocks network sniffing |
| `SameSite` | `Strict` or `Lax` | Restricts cross-origin cookie sending — mitigates CSRF |
| `Path` | `/` (or narrowest scope) | Limits cookie scope to intended paths |
| `Domain` | Omit or set to exact domain | Prevents cookie leakage to subdomains when omitted |
| `Max-Age` / `Expires` | Set explicit value | Controls cookie lifetime — avoid persistent session cookies |

**SameSite values explained:**
- `Strict`: Cookie never sent on cross-site requests. Strongest protection but breaks legitimate cross-site navigation (e.g., links from email).
- `Lax` (browser default since Chrome 80): Cookie sent on top-level GET navigations from external sites but not on POST or subresource requests. Good balance for most applications.
- `None`: Cookie sent on all cross-site requests. Requires `Secure` flag. Only use when cross-origin cookie sharing is genuinely needed (e.g., embedded iframes, OAuth flows).

### 2.3 Session Expiration

Implement both idle and absolute timeouts:

- **Idle timeout:** Destroy session after a period of inactivity (15 minutes for high-security systems per NIST SP 800-63B and PCI-DSS 4.0 Requirement 8.2.8; 30 minutes for general applications).
- **Absolute timeout:** Destroy session after a maximum lifetime regardless of activity (4-8 hours typical; 24 hours maximum for low-risk applications).
- **Server-side enforcement:** NEVER rely solely on cookie expiration. The server must track last-activity timestamps and reject expired sessions.

### 2.4 Session Rotation on Auth State Change

Regenerate the session ID whenever the authentication or privilege state changes:

- On successful login (prevents session fixation).
- On privilege escalation (e.g., entering an admin panel).
- On password change or MFA enrollment.
- On any sensitive operation requiring re-authentication.

The old session ID must be invalidated server-side immediately after rotation.

### 2.5 Server-Side Session Storage

- Store session data server-side (Redis, database, encrypted file store). The cookie should contain only the session ID.
- NEVER store sensitive data (roles, permissions, user attributes) solely in client-side cookies or tokens without server-side validation.
- Sign session cookies with HMAC to detect tampering (express-session does this by default with the `secret` option).

---

## 3. Implementation Patterns

### 3.1 Server-Side Sessions with Express and Redis

```typescript
// SECURE: Express session with Redis store
import express from 'express';
import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';

const app = express();

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,                        // Encrypt Redis connection in production
    rejectUnauthorized: true,
  },
});
await redisClient.connect();

app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',                  // Namespace session keys
    ttl: 1800,                        // 30 minutes server-side TTL
  }),
  name: '__Host-sid',                 // __Host- prefix enforces Secure + Path=/
  secret: process.env.SESSION_SECRET, // Min 256-bit secret; rotate periodically
  resave: false,                      // Do not save session if unmodified
  saveUninitialized: false,           // Do not create session until data stored
  cookie: {
    httpOnly: true,
    secure: true,                     // HTTPS only
    sameSite: 'lax',
    maxAge: 1800000,                  // 30 minutes in milliseconds
    path: '/',
    domain: undefined,                // Omit to restrict to exact origin
  },
  rolling: true,                      // Reset expiry on each request (idle timeout)
}));
```

### 3.2 Session Rotation on Login

```typescript
// SECURE: Regenerate session ID after authentication
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body.email, req.body.password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Regenerate session to prevent fixation attacks
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.loginTime = Date.now();   // Track absolute timeout
    req.session.lastActivity = Date.now(); // Track idle timeout

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session save error' });
      }
      res.json({ message: 'Login successful' });
    });
  });
});
```

### 3.3 Session Rotation on Privilege Escalation

```typescript
// SECURE: Rotate session before granting elevated privileges
app.post('/admin/elevate', requireAuth, async (req, res) => {
  const verified = await verifyMFA(req.session.userId, req.body.mfaCode);
  if (!verified) {
    return res.status(403).json({ error: 'MFA verification failed' });
  }

  const oldSessionData = { ...req.session };
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });

    // Restore user data with elevated flag
    req.session.userId = oldSessionData.userId;
    req.session.role = oldSessionData.role;
    req.session.isElevated = true;
    req.session.elevatedAt = Date.now();
    req.session.save(() => res.json({ message: 'Privileges elevated' }));
  });
});
```

### 3.4 Concurrent Session Limits

```typescript
// SECURE: Limit active sessions per user
const MAX_SESSIONS_PER_USER = 3;

async function enforceSessionLimit(userId: string, currentSessionId: string): Promise<void> {
  const sessionKeys = await redisClient.keys(`sess:user:${userId}:*`);

  if (sessionKeys.length >= MAX_SESSIONS_PER_USER) {
    // Sort by creation time, remove oldest sessions
    const sessions = await Promise.all(
      sessionKeys.map(async (key) => ({
        key,
        data: JSON.parse(await redisClient.get(key) || '{}'),
      }))
    );
    sessions.sort((a, b) => (a.data.loginTime || 0) - (b.data.loginTime || 0));

    // Destroy oldest sessions exceeding the limit
    const toRemove = sessions.slice(0, sessions.length - MAX_SESSIONS_PER_USER + 1);
    for (const session of toRemove) {
      if (session.key !== `sess:user:${userId}:${currentSessionId}`) {
        await redisClient.del(session.key);
      }
    }
  }

  // Register current session
  await redisClient.set(
    `sess:user:${userId}:${currentSessionId}`,
    JSON.stringify({ loginTime: Date.now() }),
    { EX: 1800 }
  );
}
```

### 3.5 Secure Remember-Me Implementation

```typescript
// SECURE: Remember-me with separate long-lived token (NOT the session cookie)
import crypto from 'crypto';

interface RememberMeToken {
  selector: string;   // Lookup key (indexed, not secret)
  validator: string;   // Secret token (hashed in DB)
  userId: string;
  expiresAt: Date;
}

async function createRememberMeToken(userId: string): Promise<string> {
  const selector = crypto.randomBytes(16).toString('hex');
  const validator = crypto.randomBytes(32).toString('hex');
  const hashedValidator = crypto
    .createHash('sha256')
    .update(validator)
    .digest('hex');

  await db.rememberMeTokens.create({
    selector,
    validator: hashedValidator,       // Store HASH, not plaintext
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Return selector:validator as cookie value
  return `${selector}:${validator}`;
}

async function validateRememberMe(token: string): Promise<string | null> {
  const [selector, validator] = token.split(':');
  if (!selector || !validator) return null;

  const record = await db.rememberMeTokens.findOne({
    where: { selector, expiresAt: { $gt: new Date() } },
  });
  if (!record) return null;

  const hashedValidator = crypto
    .createHash('sha256')
    .update(validator)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(
    Buffer.from(hashedValidator),
    Buffer.from(record.validator)
  )) {
    return null;
  }

  // Rotate the token on use (one-time use)
  await db.rememberMeTokens.destroy({ where: { selector } });
  return record.userId;
}
```

### 3.6 JWT as Sessions — Tradeoffs

JWTs are NOT recommended as session tokens for most web applications. Use them only when statelessness is a hard architectural requirement (e.g., microservices, cross-domain SSO).

| Aspect | Server-Side Sessions | JWT Sessions |
|--------|---------------------|--------------|
| Revocation | Immediate (delete from store) | Requires blocklist or short expiry |
| Scalability | Requires shared store (Redis) | Stateless — no shared store |
| Size | Small cookie (~32 bytes) | Large cookie (1-2 KB+) |
| Security | Server controls all data | Claims visible in Base64 payload |
| Logout | Instant invalidation | Token valid until expiry unless blocklisted |
| Replay | Detectable via server state | No built-in replay detection |

**If you must use JWTs:**
- Use short-lived access tokens (5-15 minutes).
- Implement refresh token rotation with one-time-use enforcement.
- Maintain a server-side blocklist for revocation (defeats the stateless benefit).
- Never store JWTs in `localStorage` (XSS-vulnerable). Use HttpOnly cookies.
- Validate signature, `iss`, `aud`, `exp`, and `nbf` claims on every request.
- Pin the algorithm server-side — never trust the `alg` header from the token.

### 3.7 JWT Refresh Token Flow

```typescript
// SECURE: JWT refresh token rotation
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

async function issueTokenPair(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    process.env.JWT_ACCESS_SECRET!,
    {
      expiresIn: ACCESS_TOKEN_TTL,
      algorithm: 'RS256',              // Asymmetric — use private key to sign
      issuer: 'https://app.example.com',
      audience: 'https://api.example.com',
    }
  );

  const refreshTokenId = crypto.randomBytes(32).toString('hex');
  const refreshToken = jwt.sign(
    { sub: userId, jti: refreshTokenId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: REFRESH_TOKEN_TTL, algorithm: 'RS256' }
  );

  // Store refresh token metadata server-side for rotation tracking
  await db.refreshTokens.create({
    id: refreshTokenId,
    userId,
    family: refreshTokenId,           // Token family for rotation detection
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
}

async function rotateRefreshToken(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET!, {
      algorithms: ['RS256'],           // Pin algorithm — reject HS256
      issuer: 'https://app.example.com',
    }) as jwt.JwtPayload;
  } catch {
    return null;                       // Invalid or expired token
  }

  const storedToken = await db.refreshTokens.findOne({
    where: { id: payload.jti },
  });

  if (!storedToken) {
    // Token reuse detected — possible theft. Revoke entire family.
    await db.refreshTokens.destroy({
      where: { family: payload.jti },
    });
    // Alert security team
    await alertSecurityTeam('Refresh token reuse detected', {
      userId: payload.sub,
      tokenId: payload.jti,
    });
    return null;
  }

  // Invalidate old refresh token (one-time use)
  await db.refreshTokens.destroy({ where: { id: payload.jti } });

  // Issue new pair
  return issueTokenPair(payload.sub as string);
}
```

### 3.8 Session Logout and Revocation

```typescript
// SECURE: Complete session destruction
app.post('/logout', requireAuth, (req, res) => {
  const sessionId = req.sessionID;

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    // Clear the session cookie explicitly
    res.clearCookie('__Host-sid', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    // Also remove remember-me cookie if present
    res.clearCookie('remember_me', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    res.json({ message: 'Logged out' });
  });
});

// SECURE: Revoke all sessions for a user (e.g., password change, account compromise)
async function revokeAllSessions(userId: string): Promise<void> {
  const keys = await redisClient.keys(`sess:*`);
  for (const key of keys) {
    const data = await redisClient.get(key);
    if (data) {
      const session = JSON.parse(data);
      if (session.userId === userId) {
        await redisClient.del(key);
      }
    }
  }
  // Also revoke all refresh tokens
  await db.refreshTokens.destroy({ where: { userId } });
  // Also revoke all remember-me tokens
  await db.rememberMeTokens.destroy({ where: { userId } });
}
```

---

## 4. Vulnerability Catalog

### V-01: Predictable Session IDs (CWE-330)
**Risk:** Session prediction / brute-force.
```typescript
// VULNERABLE: Sequential or timestamp-based session IDs
const sessionId = `session_${Date.now()}_${counter++}`;

// SECURE: Cryptographically random session ID
import crypto from 'crypto';
const sessionId = crypto.randomBytes(32).toString('hex'); // 256-bit entropy
```

### V-02: Missing HttpOnly Flag (CWE-1004)
**Risk:** XSS-based cookie theft via `document.cookie`.
```typescript
// VULNERABLE
res.cookie('sid', sessionId, { httpOnly: false });

// SECURE
res.cookie('sid', sessionId, { httpOnly: true, secure: true, sameSite: 'lax' });
```

### V-03: Missing Secure Flag (CWE-614)
**Risk:** Session cookie transmitted over HTTP, vulnerable to network sniffing.
```typescript
// VULNERABLE: Cookie sent over HTTP
app.use(session({ cookie: { secure: false } }));

// SECURE: Cookie restricted to HTTPS
app.use(session({ cookie: { secure: true } }));
```

### V-04: Session Fixation — No Rotation on Login (CWE-384)
**Risk:** Attacker sets session ID before authentication, hijacks post-login session.
```typescript
// VULNERABLE: No session regeneration after login
app.post('/login', (req, res) => {
  const user = authenticate(req.body);
  req.session.userId = user.id;      // Same session ID as before login!
  res.redirect('/dashboard');
});

// SECURE: Regenerate session on login
app.post('/login', (req, res) => {
  const user = authenticate(req.body);
  req.session.regenerate((err) => {   // New session ID issued
    req.session.userId = user.id;
    req.session.save(() => res.redirect('/dashboard'));
  });
});
```

### V-05: Session ID in URL (CWE-598)
**Risk:** Session ID leaked via Referer headers, browser history, proxy logs, shared links.
```
// VULNERABLE
https://app.example.com/dashboard?sid=abc123def456

// SECURE: Session ID in HttpOnly cookie only — never in URL
```

### V-06: Overly Long Session Expiration (CWE-613)
**Risk:** Extended attack window for stolen session tokens.
```typescript
// VULNERABLE: Session valid for 30 days with no idle timeout
app.use(session({ cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } }));

// SECURE: 30-minute idle timeout + 8-hour absolute timeout
app.use(session({
  cookie: { maxAge: 1800000 },
  rolling: true,
}));
// Plus server-side absolute timeout check in middleware
```

### V-07: No Absolute Session Timeout (CWE-613)
**Risk:** Rolling idle timeout can be kept alive indefinitely by automated requests.
```typescript
// VULNERABLE: Only idle timeout, no absolute limit
function checkSession(req, res, next) {
  if (Date.now() - req.session.lastActivity > IDLE_TIMEOUT) {
    return req.session.destroy(() => res.status(401).end());
  }
  req.session.lastActivity = Date.now();
  next();
}

// SECURE: Both idle AND absolute timeout
function checkSession(req, res, next) {
  const now = Date.now();
  if (now - req.session.lastActivity > IDLE_TIMEOUT) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session expired' }));
  }
  if (now - req.session.loginTime > ABSOLUTE_TIMEOUT) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session expired' }));
  }
  req.session.lastActivity = now;
  next();
}
```

### V-08: Insecure Remember-Me (CWE-640)
**Risk:** Remember-me token that is just a plaintext user ID or re-uses the session cookie.
```typescript
// VULNERABLE: Predictable remember-me token
res.cookie('remember', Buffer.from(user.id).toString('base64'), {
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

// SECURE: Cryptographic selector:validator pattern with hashed storage
// (See section 3.5 for full implementation)
```

### V-09: JWT Without Revocation Mechanism (CWE-613)
**Risk:** Stolen JWT valid until expiry; no way to invalidate compromised tokens.
```typescript
// VULNERABLE: Long-lived JWT with no revocation
const token = jwt.sign({ userId }, secret, { expiresIn: '30d' });

// SECURE: Short-lived access token + refresh rotation + server-side blocklist
const accessToken = jwt.sign({ sub: userId }, secret, { expiresIn: '15m' });
// Plus refresh token rotation (see section 3.7)
```

### V-10: Algorithm Confusion in JWT (CWE-327)
**Risk:** Attacker changes `alg` header from RS256 to HS256, signs with public key.
```typescript
// VULNERABLE: Trusting the alg header from the token
const payload = jwt.verify(token, publicKey);

// SECURE: Pin algorithm server-side
const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### V-11: Session Data in localStorage (CWE-922)
**Risk:** Any XSS vulnerability exposes all data in localStorage.
```typescript
// VULNERABLE: Storing tokens in localStorage
localStorage.setItem('authToken', token);

// SECURE: Store in HttpOnly cookie (inaccessible to JavaScript)
// Or keep access token in memory only (cleared on tab close)
```

### V-12: Missing SameSite Attribute (CWE-1275)
**Risk:** Cookie sent with cross-site requests, enabling CSRF attacks.
```typescript
// VULNERABLE (legacy browsers without SameSite default)
res.cookie('sid', sessionId, { httpOnly: true, secure: true });

// SECURE
res.cookie('sid', sessionId, { httpOnly: true, secure: true, sameSite: 'lax' });
```

### V-13: Insufficient Session Destruction on Logout (CWE-613)
**Risk:** Server-side session persists after user clicks logout.
```typescript
// VULNERABLE: Clear cookie but leave server-side session intact
app.post('/logout', (req, res) => {
  res.clearCookie('sid');
  res.redirect('/login');
});

// SECURE: Destroy server-side session AND clear cookie
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('__Host-sid', {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    });
    res.redirect('/login');
  });
});
```

### V-14: No Concurrent Session Control (CWE-307)
**Risk:** Unlimited sessions allow undetected parallel use of stolen credentials.
```
// VULNERABLE: No limit on active sessions per user

// SECURE: Track and limit active sessions (see section 3.4)
// Alert user when new session is created from unexpected location
```

### V-15: Session Cookie Without __Host- Prefix (CWE-784)
**Risk:** Cookie can be overwritten by subdomain or non-secure context.
```typescript
// VULNERABLE: Regular cookie name
res.cookie('sid', value, { secure: true, path: '/' });

// SECURE: __Host- prefix enforces Secure + Path=/ + no Domain attribute
res.cookie('__Host-sid', value, { secure: true, path: '/', httpOnly: true });
```

---

## 5. Security Checklist

### Cookie Configuration
- [ ] `HttpOnly` flag set on all session cookies
- [ ] `Secure` flag set on all session cookies
- [ ] `SameSite` attribute set to `Strict` or `Lax`
- [ ] `__Host-` prefix used for session cookie name
- [ ] `Domain` attribute omitted (restricts to exact origin)
- [ ] `Path` set to narrowest required scope

### Session ID Security
- [ ] Session IDs generated with CSPRNG (minimum 128-bit entropy)
- [ ] Session IDs never appear in URLs, logs, or error messages
- [ ] Session IDs are not derived from user data or timestamps
- [ ] Session cookie value is signed (HMAC) to detect tampering

### Session Lifecycle
- [ ] Session ID regenerated on login (prevents fixation)
- [ ] Session ID regenerated on privilege escalation
- [ ] Session ID regenerated on password change
- [ ] Idle timeout enforced server-side (15-30 minutes)
- [ ] Absolute timeout enforced server-side (4-8 hours)
- [ ] Session fully destroyed on logout (server-side + cookie cleared)
- [ ] All sessions revoked on password change / account compromise

### Session Storage
- [ ] Session data stored server-side (Redis, database) — not in cookies
- [ ] Redis connection encrypted with TLS in production
- [ ] Session store uses key prefix and dedicated database number
- [ ] Session secrets rotated periodically (support multiple secrets)

### Concurrent Sessions & Monitoring
- [ ] Maximum concurrent sessions enforced per user
- [ ] Users notified of new session creation from new device/location
- [ ] Concurrent sessions from different IPs flagged for review
- [ ] Session creation/destruction events logged for audit

### JWT-Specific (if applicable)
- [ ] Access token lifetime 15 minutes or less
- [ ] Refresh token rotation with one-time use
- [ ] Token family tracking for reuse detection
- [ ] Algorithm pinned server-side (`algorithms: ['RS256']`)
- [ ] All claims validated (`iss`, `aud`, `exp`, `nbf`, `sub`)
- [ ] JWTs stored in HttpOnly cookies, not localStorage
- [ ] Server-side blocklist for immediate revocation

---

## 6. Tools & Automation

### 6.1 Session Token Analysis

| Tool | Purpose | Usage |
|------|---------|-------|
| **Burp Suite Sequencer** | Analyze randomness/entropy of session tokens | Capture tokens via Proxy, send to Sequencer, run statistical analysis (FIPS tests, character-level analysis) |
| **Burp Suite Intruder** | Test session fixation and rotation | Replay pre-auth session IDs post-login to verify regeneration |
| **Burp Suite Repeater** | Manipulate and replay session cookies | Modify cookie attributes, test logout effectiveness |

### 6.2 Cookie Security Scanners

| Tool | Purpose | Command / URL |
|------|---------|---------------|
| **Mozilla Observatory** | Scan cookie and header security | `observatory.mozilla.org` or CLI: `observatory <domain>` |
| **SecurityHeaders.com** | Check response headers including Set-Cookie | `securityheaders.com/?q=<domain>` |
| **CookieServe** | Analyze cookie attributes for a domain | `cookieserve.com` |
| **curl** | Manual cookie attribute inspection | `curl -I -v https://example.com/login 2>&1 \| grep -i set-cookie` |

### 6.3 Automated Security Testing

| Tool | Purpose | Notes |
|------|---------|-------|
| **OWASP ZAP** | Automated session management testing | Session management scanner, cookie checks, active scan rules |
| **Nikto** | Web server scanner | Checks for session-related misconfigurations |
| **testssl.sh** | TLS configuration testing | Verifies HTTPS enforcement for Secure cookies |
| **eslint-plugin-security** | Static analysis for Node.js | Flags insecure cookie configurations in code |
| **semgrep** | Custom rules for session patterns | Write rules to detect missing HttpOnly, session fixation patterns |

### 6.4 Runtime Monitoring

| Tool | Purpose |
|------|---------|
| **Splunk** | Detect concurrent sessions from different IPs (built-in detection rules for AWS, Azure AD, O365) |
| **Elastic SIEM** | Session anomaly detection with ML-based behavioral analysis |
| **Datadog ASM** | Application-level session attack detection |
| **AWS GuardDuty** | Detect compromised credentials via session anomalies |

---

## 7. Platform-Specific Guidance

### 7.1 Web Applications — Storage Comparison

| Storage | XSS Accessible | CSRF Risk | Capacity | Persistence | Recommendation |
|---------|---------------|-----------|----------|-------------|----------------|
| HttpOnly Cookie | No | Yes (mitigated by SameSite) | ~4 KB | Configurable | **Recommended for session IDs** |
| localStorage | Yes | No | ~5-10 MB | Until cleared | **Never for session tokens** |
| sessionStorage | Yes | No | ~5-10 MB | Tab lifetime | Acceptable for non-sensitive temporary data only |
| In-memory (JS variable) | Yes (if XSS) | No | Unlimited | Page lifetime | Acceptable for short-lived access tokens in SPAs |

**Rule:** Session identifiers and authentication tokens belong in HttpOnly cookies. Period.

### 7.2 Single-Page Applications (SPAs)

SPAs present unique session management challenges:

**Recommended architecture — Backend-For-Frontend (BFF):**
1. The BFF acts as a confidential OAuth client, keeping tokens server-side.
2. The SPA communicates with the BFF using HttpOnly session cookies.
3. The BFF proxies API requests, attaching access tokens from its server-side store.
4. Token refresh happens server-side, invisible to the browser.

```
[Browser/SPA] <--HttpOnly cookie--> [BFF Server] <--Access Token--> [API Server]
```

**If BFF is not feasible (public client SPA):**
- Use Authorization Code Flow with PKCE.
- Store access tokens in memory only (JavaScript closure or module scope).
- Use refresh token rotation with one-time-use tokens.
- Set refresh token as HttpOnly cookie with strict SameSite.
- Implement silent refresh before access token expiry.
- Note: Third-party cookie blocking in Safari and upcoming Chrome changes affect silent refresh via iframes. Plan for BFF migration.

**Content Security Policy for SPAs:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none';
```

### 7.3 Mobile Applications

**iOS — Keychain Services:**
```swift
// SECURE: Store session token in iOS Keychain
import Security

func storeToken(_ token: String, forKey key: String) -> Bool {
    let data = token.data(using: .utf8)!
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecValueData as String: data,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    SecItemDelete(query as CFDictionary)  // Remove existing
    let status = SecItemAdd(query as CFDictionary, nil)
    return status == errSecSuccess
}
```

**Android — EncryptedSharedPreferences with Keystore:**
```kotlin
// SECURE: Store session token with Android Keystore-backed encryption
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val prefs = EncryptedSharedPreferences.create(
    context,
    "secure_session_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

prefs.edit().putString("session_token", token).apply()
```

**Mobile session management rules:**
- Never store tokens in plaintext SharedPreferences or UserDefaults.
- Use hardware-backed encryption (Secure Enclave on iOS, Hardware Security Module on Android).
- Set `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` on iOS to prevent iCloud Keychain sync and lock-screen access.
- Implement certificate pinning to prevent AiTM token interception.
- Support remote session revocation via push notification or next-request check.
- Enforce biometric re-authentication for sensitive operations.

---

## 8. Incident Patterns

### 8.1 Session Hijacking Detection

**Indicators of Compromise:**
- Same session ID used from multiple IP addresses within a short time window (< 5 minutes).
- Geographically impossible travel: session used from two locations farther apart than possible given the time interval.
- User-Agent string change within the same session.
- Sudden spike in API requests from a session that was previously idle.
- Session used outside the user's established behavioral baseline (unusual hours, unusual endpoints).

**Detection Queries (Splunk example):**
```spl
index=web_logs sourcetype=access_combined
| stats dc(client_ip) as unique_ips, values(client_ip) as ip_list by session_id
| where unique_ips > 1
| lookup geoip ip_list OUTPUT lat, lon, country
| eval distance=haversine(lat_1, lon_1, lat_2, lon_2)
| where distance > 500
| table session_id, ip_list, unique_ips, distance
```

### 8.2 Concurrent Session Anomalies

**Detection logic:**
1. Track `(user_id, session_id, ip_address, user_agent, geo)` for every authenticated request.
2. Alert when a user has active sessions from more than N distinct IP addresses simultaneously.
3. Alert when a new session is created from a geo-location inconsistent with the user's history.
4. Correlate with known infostealer malware indicators (e.g., sessions originating from residential proxy networks).

### 8.3 Incident Response Steps

**Immediate (0-15 minutes):**
1. Revoke all active sessions for the affected user (`revokeAllSessions(userId)`).
2. Invalidate all refresh tokens and remember-me tokens.
3. Force password reset and MFA re-enrollment.
4. Block the attacker's IP/session from the WAF.

**Short-term (15-60 minutes):**
5. Analyze access logs to determine scope: what data was accessed, what actions were taken.
6. Check if the stolen session was used to modify account settings (email, MFA, password).
7. Revert any unauthorized changes to the account.
8. Notify the affected user via a verified out-of-band channel.

**Investigation (1-24 hours):**
9. Determine the theft vector: XSS, malware, phishing proxy, network interception, or insider.
10. If XSS: identify and patch the injection point, scan for similar vulnerabilities.
11. If infostealer: coordinate with endpoint security team for device remediation.
12. If phishing proxy: report phishing domain, update email filters.
13. Review session management configuration for gaps identified during the incident.

**Post-incident:**
14. Implement additional controls based on root cause (e.g., add device binding, IP pinning, anomaly detection).
15. Update detection rules to catch similar attacks earlier.
16. Conduct lessons-learned review and update this playbook.

---

## 9. Compliance & Standards

### 9.1 OWASP Top 10 — A07:2021 Identification and Authentication Failures

Session management falls under A07:2021. Key requirements:
- Session IDs must not be exposed in URLs.
- Session IDs must be rotated after successful login.
- Sessions must be properly invalidated during logout and idle timeout.
- Session IDs must have sufficient entropy to resist prediction attacks.

### 9.2 NIST SP 800-63B — Digital Identity Guidelines

- **Session binding:** Bind session to the authenticated subscriber. Session secrets must be at least 64 bits of entropy (OWASP recommends 128-bit minimum).
- **Reauthentication:** Require reauthentication after 15 minutes of inactivity for AAL2 (multi-factor) and AAL3 (hardware token) sessions.
- **Session limits:** Set absolute session lifetime limits. Reauthentication required periodically even for active sessions.
- **Storage:** Session secrets stored in secure, httpOnly cookies. Must be sent only over authenticated, protected (TLS) channels.

### 9.3 PCI-DSS 4.0

- **Requirement 8.2.8 (mandatory since March 31, 2025):** If a user session has been idle for more than 15 minutes, the user must re-authenticate. This applies to all access to the Cardholder Data Environment (CDE).
- **Requirement 8.3:** Multi-factor authentication required for all personnel with access to the CDE. Each session (VPN, CDE application) requires its own MFA challenge.
- **Requirement 8.6:** System and application accounts used for automated access must have session controls including regular credential rotation and monitoring.
- **Replay protection:** Methods to defend against replay attacks include unique session identifiers, timestamps, and time-based one-time passwords.

### 9.4 CWE References Summary

| CWE | Name | Section |
|-----|------|---------|
| CWE-330 | Use of Insufficiently Random Values | V-01 |
| CWE-1004 | Sensitive Cookie Without HttpOnly Flag | V-02 |
| CWE-614 | Sensitive Cookie in HTTPS Session Without Secure Attribute | V-03 |
| CWE-384 | Session Fixation | V-04 |
| CWE-598 | Use of GET Request Method With Sensitive Query Strings | V-05 |
| CWE-613 | Insufficient Session Expiration | V-06, V-07, V-09, V-13 |
| CWE-640 | Weak Password Recovery Mechanism for Forgotten Password | V-08 |
| CWE-327 | Use of a Broken or Risky Cryptographic Algorithm | V-10 |
| CWE-922 | Insecure Storage of Sensitive Information | V-11 |
| CWE-1275 | Sensitive Cookie with Improper SameSite Attribute | V-12 |
| CWE-784 | Reliance on Cookies without Validation and Integrity | V-15 |

---

## 10. Code Examples — Vulnerable vs. Secure Pairs

### 10.1 Complete Express Session Setup

```typescript
// === VULNERABLE SESSION CONFIGURATION ===
import express from 'express';
import session from 'express-session';

const app = express();
app.use(session({
  secret: 'keyboard cat',             // Weak, hardcoded secret
  resave: true,                        // Unnecessary writes
  saveUninitialized: true,             // Creates sessions for anonymous users
  cookie: {},                          // No security attributes set
}));

// === SECURE SESSION CONFIGURATION ===
import express from 'express';
import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import crypto from 'crypto';

const app = express();

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: { tls: process.env.NODE_ENV === 'production' },
});
await redisClient.connect();

app.set('trust proxy', 1);            // Trust first proxy (for Secure cookie behind LB)

app.use(session({
  store: new RedisStore({ client: redisClient, prefix: 'sess:', ttl: 1800 }),
  name: '__Host-sid',
  secret: [
    process.env.SESSION_SECRET_CURRENT!,  // Current secret
    process.env.SESSION_SECRET_PREVIOUS!, // Previous secret (for rotation)
  ],
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 1800000,
    path: '/',
  },
}));
```

### 10.2 Session Timeout Middleware

```typescript
// === VULNERABLE: No timeout enforcement ===
// (relying solely on cookie maxAge — client can modify)

// === SECURE: Server-side dual timeout enforcement ===
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;     // 15 minutes
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

function sessionTimeoutMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!req.session?.userId) {
    return next(); // No authenticated session
  }

  const now = Date.now();

  // Check absolute timeout
  if (req.session.loginTime && now - req.session.loginTime > ABSOLUTE_TIMEOUT_MS) {
    return req.session.destroy(() => {
      res.clearCookie('__Host-sid', {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      });
      res.status(401).json({ error: 'Session expired', reason: 'absolute_timeout' });
    });
  }

  // Check idle timeout
  if (req.session.lastActivity && now - req.session.lastActivity > IDLE_TIMEOUT_MS) {
    return req.session.destroy(() => {
      res.clearCookie('__Host-sid', {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      });
      res.status(401).json({ error: 'Session expired', reason: 'idle_timeout' });
    });
  }

  // Update last activity timestamp
  req.session.lastActivity = now;
  next();
}

app.use(sessionTimeoutMiddleware);
```

### 10.3 Device/IP Binding for Session Integrity

```typescript
// SECURE: Bind session to device fingerprint for anomaly detection
interface SessionMetadata {
  userId: string;
  ip: string;
  userAgent: string;
  loginTime: number;
  lastActivity: number;
}

function sessionIntegrityCheck(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!req.session?.userId) return next();

  const currentIp = req.ip;
  const currentUA = req.get('user-agent') || '';

  // Strict: block if IP changes (may cause issues with mobile/VPN users)
  // Recommended: alert but allow, require re-auth for sensitive operations
  if (req.session.ip && req.session.ip !== currentIp) {
    logger.warn('Session IP change detected', {
      sessionId: req.sessionID,
      userId: req.session.userId,
      originalIp: req.session.ip,
      currentIp,
    });
    // For high-security: force re-authentication
    // For standard: log and continue
  }

  if (req.session.userAgent && req.session.userAgent !== currentUA) {
    logger.warn('Session User-Agent change detected', {
      sessionId: req.sessionID,
      userId: req.session.userId,
    });
    // User-Agent change is a stronger signal of hijacking
    return req.session.destroy(() => {
      res.status(401).json({ error: 'Session invalidated', reason: 'integrity_check' });
    });
  }

  next();
}
```

---

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Top 10 A07:2021 — Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [OWASP Testing Guide — Session Management Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/)
- [NIST SP 800-63B — Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [PCI-DSS 4.0 Requirement 8.2.8 — Session Timeout](https://pcidssguide.com/pci-dss-session-timeout-requirements/)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [PortSwigger — JWT Attacks](https://portswigger.net/web-security/jwt)
- [PortSwigger — Burp Sequencer Documentation](https://portswigger.net/burp/documentation/desktop/tools/sequencer/getting-started)
- [Auth0 — Refresh Token Rotation](https://auth0.com/blog/securing-single-page-applications-with-refresh-token-rotation/)
- [Curity — SPA Best Practices](https://curity.io/resources/learn/spa-best-practices/)
- [Redis — Session Management](https://redis.io/solutions/session-management/)
- [Mozilla — Secure Cookie Configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
- [SpyCloud — 2024 Cybercrime Report](https://spycloud.com/blog/2024-cybercrime-update-and-2025-predictions/)
- [Push Security — 2024 Identity Breaches](https://pushsecurity.com/blog/2024-identity-breaches)
- [The Hacker News — Session Hijacking 2.0](https://thehackernews.com/2024/09/session-hijacking-20-latest-way-that.html)
- [Red Sentry — JWT Vulnerabilities 2026](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide)
