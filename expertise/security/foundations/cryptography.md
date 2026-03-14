# Cryptography for Application Security

> **Expertise Module** | Last updated: 2026-03-08
> **Purpose:** Guide AI agents in implementing correct cryptographic patterns and avoiding common pitfalls.
> **Scope:** Symmetric/asymmetric encryption, hashing, password storage, TLS, key management, post-quantum readiness.

---

## 1. Threat Landscape

### 1.1 The Scale of Cryptographic Failures

Cryptographic failures rank as **OWASP A02:2021** (previously "Sensitive Data Exposure"), reflecting a
shift in focus from the symptom (data exposure) to the root cause (broken or misused cryptography).
The category maps to **CWE-259** (Hard-coded Password), **CWE-327** (Broken/Risky Crypto Algorithm),
**CWE-328** (Reversible One-Way Hash), **CWE-330** (Insufficient Randomness), and **CWE-916**
(Use of Password Hash With Insufficient Computational Effort).

### 1.2 Deprecated and Broken Algorithms

| Algorithm | Status | Risk |
|-----------|--------|------|
| MD5 | **Broken** | Collision attacks in seconds; never use for integrity or passwords |
| SHA-1 | **Broken** | SHAttered attack (2017) produced real-world collisions; deprecated by NIST |
| DES | **Broken** | 56-bit key; brute-forced in hours on modern hardware |
| 3DES (Triple DES) | **Deprecated** | NIST deprecated after 2023; Sweet32 birthday attack on 64-bit blocks |
| RC4 | **Broken** | Statistical biases exploitable in TLS (RFC 7465 banned RC4 in 2015) |
| Blowfish (raw) | **Legacy** | 64-bit block size vulnerable to Sweet32; bcrypt usage is separate and still valid |
| RSA-1024 | **Deprecated** | Factorable with sufficient resources; minimum 2048-bit required |
| PKCS#1 v1.5 padding | **Vulnerable** | Bleichenbacher padding oracle attacks; use OAEP instead |

### 1.3 Real-World Breaches

**Adobe 2013 -- 153 million passwords exposed:**
Adobe encrypted (not hashed) passwords using 3DES in ECB mode with a single static key for all
accounts. ECB mode produces identical ciphertext for identical plaintext blocks, allowing attackers
to identify common passwords by frequency analysis. Password hints were stored in plaintext alongside
encrypted passwords, further accelerating cracking. This remains one of the most cited examples
of catastrophic cryptographic failure in application security.
*(Source: Schneier on Security, Krebs on Security)*

**Ashley Madison 2015 -- bcrypt undermined by MD5 fallback:**
While Ashley Madison used bcrypt (cost 12) for password hashing, a critical implementation error
left a parallel `$loginkey` token computed as `MD5(lowercase(username) + password)` for accounts
created before June 2012. The CynoSure Prime cracking team exploited this MD5 fallback to crack
over 11.2 million passwords in days -- approximately one million times faster than attacking bcrypt
directly. This demonstrates that the strongest algorithm in a system is irrelevant if a weaker
parallel path exists.
*(Source: CynoSure Prime blog, Ars Technica, CSO Online)*

**Heartbleed (2014) -- OpenSSL buffer over-read:**
CVE-2014-0160 allowed attackers to read up to 64KB of server memory per heartbeat request,
potentially exposing private keys, session tokens, and user data. Affected approximately 17% of
TLS-enabled web servers. Demonstrated the danger of memory-unsafe cryptographic implementations.

**SolarWinds / Codecov (2020-2021) -- supply chain + weak integrity checks:**
Compromised build pipelines delivered trojanized updates. Weak or absent cryptographic integrity
verification of build artifacts allowed malicious code to propagate undetected for months.

### 1.4 Post-Quantum Cryptography Threat

Quantum computers threaten all currently deployed asymmetric cryptography:
- **RSA, DSA, ECDSA, ECDH, Ed25519** -- vulnerable to Shor's algorithm
- **AES-128** -- reduced to 64-bit effective security via Grover's algorithm (AES-256 remains safe)
- **SHA-256** -- reduced to 128-bit collision resistance (still adequate)

**NIST Post-Quantum Standards (finalized August 2024):**
- **FIPS 203 (ML-KEM):** Module-Lattice-Based Key Encapsulation (from CRYSTALS-Kyber). Primary standard for general key exchange.
- **FIPS 204 (ML-DSA):** Module-Lattice-Based Digital Signature (from CRYSTALS-Dilithium).
- **FIPS 205 (SLH-DSA):** Stateless Hash-Based Digital Signature (from SPHINCS+).
- **HQC:** Selected March 2025 as backup KEM algorithm; draft standard expected 2026.

**Action now:** Inventory all asymmetric crypto usage. Plan migration to hybrid schemes
(classical + PQC) for data requiring long-term confidentiality ("harvest now, decrypt later" threat).

---

## 2. Core Security Principles

### 2.1 Never Roll Your Own Crypto

The single most important rule: **use established, audited cryptographic libraries**. Custom
implementations invariably introduce side-channel leaks, padding errors, or statistical weaknesses
that may go undetected for years. Even subtle mistakes -- a missing constant-time comparison, a
reused nonce -- can completely break the security of a scheme.

### 2.2 Algorithm Selection Guide

| Purpose | Recommended | Acceptable | Avoid |
|---------|-------------|------------|-------|
| Symmetric encryption | AES-256-GCM | ChaCha20-Poly1305 | AES-CBC (without HMAC), AES-ECB, DES, 3DES, RC4 |
| Asymmetric encryption | RSA-OAEP (2048+) | ECIES (P-256+) | RSA PKCS#1 v1.5, RSA <2048 |
| Digital signatures | Ed25519 | ECDSA (P-256), RSA-PSS (2048+) | RSA PKCS#1 v1.5 signing, DSA |
| Key exchange | X25519 | ECDH (P-256+) | DH <2048, static DH |
| Hashing (integrity) | SHA-256, SHA-3-256 | SHA-512, BLAKE2b | MD5, SHA-1 |
| Password hashing | Argon2id | bcrypt (cost 12+), scrypt | MD5, SHA-*, PBKDF2-SHA1 (<600k iterations) |
| MAC | HMAC-SHA-256 | Poly1305, KMAC | HMAC-MD5, HMAC-SHA-1 |
| KDF | HKDF-SHA-256 | PBKDF2-SHA-256 (600k+) | MD5-based KDFs |

### 2.3 IV/Nonce Handling

- **AES-GCM:** 12-byte (96-bit) nonce. MUST be unique per key. Never reuse. Nonce reuse with GCM
  leaks the authentication key and allows forgery. Use `crypto.randomBytes(12)` or a counter.
- **AES-CBC:** 16-byte IV. Must be unpredictable (random). Predictable IVs enable BEAST-style attacks.
- **ChaCha20-Poly1305:** 12-byte nonce. Same uniqueness requirements as GCM.
- **General rule:** When in doubt, generate a cryptographically random nonce for every operation
  and prepend it to the ciphertext.

### 2.4 Key Derivation Functions

Never use a raw password or passphrase as an encryption key. Derive keys using:
- **HKDF:** For deriving keys from already-strong keying material (e.g., Diffie-Hellman shared secrets).
- **PBKDF2:** For password-based key derivation; minimum 600,000 iterations with SHA-256 (OWASP 2023).
- **Argon2id:** Preferred for password-based key derivation; provides memory-hardness against GPU attacks.
- **scrypt:** Alternative memory-hard KDF; N=2^17, r=8, p=1 minimum.

### 2.5 Secure Random Number Generation

| Platform | CSPRNG Source | Usage |
|----------|--------------|-------|
| Node.js | `crypto.randomBytes()`, `crypto.randomUUID()` | Keys, IVs, tokens |
| Python | `secrets` module, `os.urandom()` | Keys, IVs, tokens |
| Browser | `crypto.getRandomValues()` | Client-side crypto |
| Java | `SecureRandom` | Keys, IVs, tokens |
| iOS | `SecRandomCopyBytes`, CryptoKit | Keys, IVs, tokens |
| Android | `SecureRandom` | Keys, IVs, tokens |

**Never use:** `Math.random()` (JS), `random` module (Python), `java.util.Random`,
`rand()` (C/C++) for any security purpose.

### 2.6 Defense in Depth for Crypto

1. **Use authenticated encryption** (AEAD) -- AES-GCM or ChaCha20-Poly1305 -- to get confidentiality AND integrity in one operation.
2. **Validate before decrypting** -- check authentication tags, HMAC, or signatures before processing decrypted data.
3. **Fail closed** -- any cryptographic error (bad MAC, padding error, invalid signature) must result in immediate rejection, not a fallback to weaker security.
4. **Rotate keys** on a defined schedule and on compromise suspicion.
5. **Separate keys by purpose** -- never use the same key for encryption and signing.

---

## 3. Implementation Patterns

### 3.1 Symmetric Encryption (AES-256-GCM)

AES-GCM is an Authenticated Encryption with Associated Data (AEAD) mode. It provides
confidentiality, integrity, and authenticity in a single operation. The authentication tag
prevents tampering, and Additional Authenticated Data (AAD) can protect unencrypted metadata.

**Key properties:**
- 256-bit key (32 bytes)
- 96-bit nonce (12 bytes) -- MUST be unique per encryption with same key
- 128-bit authentication tag (16 bytes) -- always verify before using plaintext
- Maximum plaintext size per operation: ~64 GB (2^39 - 256 bits)
- After ~2^32 encryptions with random nonces, rotate the key (birthday bound)

### 3.2 Asymmetric Cryptography

**RSA (2048+ bits):** Use OAEP padding for encryption, PSS padding for signatures.
Never use textbook RSA or PKCS#1 v1.5 padding. Consider 4096-bit keys for data
needing protection beyond 2030.

**Ed25519:** Modern EdDSA signature scheme over Curve25519. 128-bit security level.
Deterministic signatures (no random nonce needed, eliminating a class of implementation bugs).
Preferred over ECDSA for new systems.

**X25519:** Elliptic-curve Diffie-Hellman over Curve25519. Used for key agreement/exchange.
Standard in TLS 1.3, Signal Protocol, WireGuard.

### 3.3 Hashing

- **SHA-256 / SHA-3-256:** General-purpose integrity checking, content addressing, digital signatures.
- **BLAKE2b:** Faster than SHA-256 on software; suitable for integrity and MAC (with key).
- **SHA-512:** Larger output; useful when 256-bit collision resistance is insufficient.
- **Never use MD5 or SHA-1** for any security purpose. MD5 is acceptable only for non-security
  checksums (e.g., cache keys) where collision resistance is irrelevant.

### 3.4 Password Hashing

**Argon2id (recommended for new systems):**
- Hybrid mode: resists both side-channel (data-independent) and GPU (data-dependent) attacks
- OWASP minimum: m=19456 (19 MiB), t=2 iterations, p=1 parallelism
- Strong recommendation: m=65536 (64 MiB), t=3 iterations, p=1
- High security: m=131072 (128 MiB), t=4 iterations, p=1

**bcrypt (proven, widely supported):**
- Cost factor 12 minimum (2025); adjust to target 250-500ms per hash
- Maximum input length: 72 bytes (silently truncates longer passwords)
- Encode password as UTF-8 before hashing
- Still secure when properly configured; no urgent need to migrate existing systems

**Never use for passwords:** MD5, SHA-1, SHA-256 (even with salt), unsalted hashes of any kind.

### 3.5 HMAC (Hash-based Message Authentication Code)

HMAC provides message authentication and integrity. Use HMAC-SHA-256 with a key of at least
256 bits. Common applications: API request signing, JWT signatures, webhook verification,
integrity of data at rest.

### 3.6 Digital Signatures

- **Ed25519:** Preferred for speed and security. Used in SSH keys, package signing, JWT (EdDSA).
- **ECDSA (P-256):** Widely supported; requires secure random nonce generation (failure is catastrophic -- see PS3 key leak). Use deterministic ECDSA (RFC 6979) where possible.
- **RSA-PSS:** Use with SHA-256, salt length equal to hash length. Preferred over PKCS#1 v1.5 for signatures.

### 3.7 TLS Configuration

**TLS 1.3 (preferred):**
- Only five cipher suites, all AEAD: TLS_AES_256_GCM_SHA384, TLS_AES_128_GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256, TLS_AES_128_CCM_SHA256, TLS_AES_128_CCM_8_SHA256
- Forward secrecy mandatory (ephemeral key exchange only)
- 0-RTT: disable for non-idempotent operations; implement anti-replay for sensitive endpoints
- No version negotiation downgrade possible

**TLS 1.2 (acceptable with correct configuration):**
- Use only AEAD cipher suites (GCM, ChaCha20-Poly1305)
- Disable CBC cipher suites (POODLE, Lucky13)
- Require forward secrecy (ECDHE key exchange)
- Disable: SSLv3, TLS 1.0, TLS 1.1, compression, renegotiation

**Adoption status (2025):** TLS 1.3 used by ~70% of websites. TLS 1.2 still at 99.9% support.
NIST SP 800-52 Rev. 2 requires TLS 1.3 support for federal systems since January 2024.

---

## 4. Vulnerability Catalog

### V01: ECB Mode Usage (CWE-327)
**Risk:** Critical | **CVSS:** 7.5+
ECB encrypts each block independently, producing identical ciphertext for identical plaintext blocks.
Reveals patterns in data (the "ECB penguin" problem). The Adobe 2013 breach used 3DES-ECB.
```
// VULNERABLE: ECB mode
crypto.createCipheriv('aes-256-ecb', key, null);

// SECURE: GCM mode with random nonce
const nonce = crypto.randomBytes(12);
crypto.createCipheriv('aes-256-gcm', key, nonce);
```

### V02: Static or Reused IVs/Nonces (CWE-329)
**Risk:** Critical | **CVSS:** 7.5+
Reusing a nonce with AES-GCM breaks authentication completely, leaking the GHASH key.
With AES-CTR, nonce reuse leaks plaintext via XOR of ciphertexts.
```
// VULNERABLE: Static IV
const iv = Buffer.from('1234567890ab');

// SECURE: Random nonce per encryption
const nonce = crypto.randomBytes(12);
```

### V03: Weak PRNGs for Cryptographic Material (CWE-330)
**Risk:** Critical | **CVSS:** 9.0+
Using `Math.random()`, `random.random()`, or similar non-cryptographic PRNGs for keys,
tokens, or nonces makes them predictable.
```python
# VULNERABLE
import random
token = ''.join(random.choices('abcdef0123456789', k=32))

# SECURE
import secrets
token = secrets.token_hex(32)
```

### V04: MD5/SHA-1 for Password Hashing (CWE-916)
**Risk:** Critical | **CVSS:** 7.5+
Fast hashes allow billions of guesses per second on GPUs. MD5: ~200 billion/sec on modern GPUs.
```python
# VULNERABLE
password_hash = hashlib.md5(password.encode()).hexdigest()

# SECURE
from argon2 import PasswordHasher
ph = PasswordHasher(memory_cost=65536, time_cost=3, parallelism=1)
password_hash = ph.hash(password)
```

### V05: RSA Without Proper Padding (CWE-780)
**Risk:** High | **CVSS:** 7.0+
Textbook RSA or PKCS#1 v1.5 padding are vulnerable to chosen-ciphertext attacks
(Bleichenbacher 1998). Always use OAEP for encryption.
```python
# VULNERABLE: PKCS1 v1.5 padding
from Crypto.Cipher import PKCS1_v1_5

# SECURE: OAEP padding
from Crypto.Cipher import PKCS1_OAEP
cipher = PKCS1_OAEP.new(key, hashAlgo=SHA256)
```

### V06: Cryptographic Keys in Source Code (CWE-321)
**Risk:** Critical | **CVSS:** 9.0+
Hard-coded keys are trivially extracted from source code, compiled binaries, and container images.
```javascript
// VULNERABLE
const ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

// SECURE: Load from environment or secret manager
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
```

### V07: Insufficient Key Length (CWE-326)
**Risk:** High | **CVSS:** 7.0+
- RSA < 2048 bits: factorable with sufficient resources
- AES-128: adequate today but consider AES-256 for post-quantum safety
- ECDSA < 224 bits: insufficient security margin

### V08: Timing Attacks on Comparison (CWE-208)
**Risk:** Medium-High | **CVSS:** 5.0-7.0
Standard string comparison (`===`, `==`) returns early on first mismatch, leaking information
about how many bytes match. Attackers can brute-force secrets byte-by-byte.
```javascript
// VULNERABLE: Early-exit comparison
if (providedToken === expectedToken) { /* ... */ }

// SECURE: Constant-time comparison
const crypto = require('crypto');
if (crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))) { /* ... */ }
```
```python
# SECURE: Python constant-time comparison
import hmac
if hmac.compare_digest(provided_token, expected_token): ...
```

### V09: Missing Authentication Tag Verification (CWE-347)
**Risk:** Critical | **CVSS:** 8.0+
Decrypting AES-GCM ciphertext without verifying the authentication tag allows attackers to
tamper with ciphertext. Always call `setAuthTag()` before `final()`.

### V10: Padding Oracle Attacks (CWE-209)
**Risk:** High | **CVSS:** 7.5+
When an application reveals whether padding is valid (via error messages or timing differences),
attackers can decrypt CBC ciphertext without the key. Mitigation: use AEAD modes (GCM),
or encrypt-then-MAC with constant-time MAC verification.

### V11: Weak Password Hash Without Salt (CWE-916)
**Risk:** High | **CVSS:** 7.5+
Unsalted hashes allow precomputation attacks (rainbow tables). Even with a strong algorithm,
missing salt means identical passwords produce identical hashes.

### V12: Key Derivation Without Stretching (CWE-916)
**Risk:** High | **CVSS:** 7.0+
Deriving encryption keys directly from passwords without a KDF (PBKDF2, scrypt, Argon2)
allows brute-force at hash-computation speed instead of KDF-limited speed.

### V13: Cleartext Transmission of Sensitive Data (CWE-319)
**Risk:** High | **CVSS:** 7.5+
Transmitting passwords, tokens, or PII over HTTP or unencrypted channels exposes data to
network sniffers. Enforce TLS for all connections carrying sensitive data.

### V14: Certificate Validation Disabled (CWE-295)
**Risk:** Critical | **CVSS:** 8.0+
Disabling TLS certificate verification (`NODE_TLS_REJECT_UNAUTHORIZED=0`, `verify=False`)
allows man-in-the-middle attacks.
```javascript
// VULNERABLE: Disabling certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// SECURE: Use proper CA certificates
const https = require('https');
const agent = new https.Agent({ ca: fs.readFileSync('ca-cert.pem') });
```

### V15: Deterministic ECDSA Nonce Failure (CWE-330)
**Risk:** Critical | **CVSS:** 9.0+
If the random nonce `k` in ECDSA is reused, biased, or predictable, the private key can be
recovered. This led to the PlayStation 3 master key extraction (2010). Use deterministic
ECDSA (RFC 6979) or Ed25519 (which is inherently deterministic).

### V16: Using Encryption for Integrity (CWE-327)
**Risk:** High | **CVSS:** 6.5+
Encryption without authentication (AES-CBC, AES-CTR alone) does not protect against
tampering. Attackers can flip ciphertext bits to modify plaintext predictably.
Always use AEAD (AES-GCM) or encrypt-then-MAC.

### V17: Insecure Key Storage in Browser Storage (CWE-922)
**Risk:** High | **CVSS:** 7.0+
Storing encryption keys or secrets in browser cookies, localStorage, or sessionStorage
exposes them to XSS attacks and browser extensions.

---

## 5. Security Checklist

### Encryption
- [ ] All symmetric encryption uses AES-256-GCM or ChaCha20-Poly1305 (AEAD modes)
- [ ] No use of ECB, raw CBC, or unauthenticated stream ciphers
- [ ] Unique random nonce generated for every encryption operation
- [ ] Authentication tags verified before processing decrypted data
- [ ] Encryption keys are at least 256 bits for symmetric, 2048 bits for RSA
- [ ] No encryption keys hard-coded in source code or configuration files

### Hashing and Passwords
- [ ] Passwords hashed with Argon2id (m=64MB, t=3, p=1) or bcrypt (cost 12+)
- [ ] No use of MD5, SHA-1, or unsalted hashes for any security purpose
- [ ] Password hash configuration targets 250-500ms per hash on production hardware
- [ ] Hash comparison uses constant-time functions (timingSafeEqual, hmac.compare_digest)

### Key Management
- [ ] Keys stored in dedicated secret managers (AWS KMS, HashiCorp Vault, GCP KMS)
- [ ] Key rotation policy defined and automated (at least annually)
- [ ] Separate keys for separate purposes (encryption vs. signing vs. derivation)
- [ ] Key material never logged, never included in error messages
- [ ] Key derivation from passwords uses PBKDF2 (600k+ iterations), scrypt, or Argon2

### TLS/Transport
- [ ] TLS 1.2 minimum enforced; TLS 1.3 preferred
- [ ] TLS 1.0, TLS 1.1, SSLv3 disabled
- [ ] Only AEAD cipher suites enabled (no CBC, no RC4)
- [ ] Forward secrecy enabled (ECDHE key exchange)
- [ ] HSTS header set with includeSubDomains and minimum 1-year max-age
- [ ] Certificate validation never disabled in production code
- [ ] Certificate expiry monitoring automated with alerting

### Random Number Generation
- [ ] All security-sensitive randomness from CSPRNG (crypto.randomBytes, secrets module)
- [ ] No use of Math.random(), random module, or java.util.Random for security
- [ ] Token/session IDs have at least 128 bits of entropy

### General
- [ ] Cryptographic library versions regularly updated
- [ ] No custom cryptographic algorithm implementations
- [ ] Cryptographic failures cause hard errors, never silent fallbacks
- [ ] Annual review of cipher suites and protocol versions (PCI DSS 4.0 requirement)

---

## 6. Tools and Automation

### Static Analysis

| Tool | Purpose | Crypto Capabilities |
|------|---------|-------------------|
| **Semgrep** | SAST for 30+ languages | Built-in rules for MD5, SHA1, DES, RC4, ECB mode, weak PRNGs, hard-coded secrets. Custom rules via pattern matching. |
| **Bandit** | Python SAST | Detects use of `hashlib.md5`, `hashlib.sha1`, `random` for crypto, weak SSL/TLS settings. |
| **ESLint (security plugins)** | JavaScript/TypeScript | `eslint-plugin-security` flags `Math.random()` and other insecure patterns. |
| **CodeQL** | GitHub Advanced Security | Crypto queries detect weak hashing, missing TLS validation, hard-coded credentials. |
| **Checkov** | IaC scanning | Detects unencrypted S3 buckets, RDS without encryption, weak KMS configurations. |

### TLS and Certificate Testing

| Tool | Purpose | Usage |
|------|---------|-------|
| **SSL Labs (ssllabs.com/ssltest)** | Web-based TLS grading | Test public-facing servers; target A+ grade. Checks protocol versions, cipher suites, certificate chain, known vulnerabilities. |
| **testssl.sh** | CLI TLS tester | `testssl.sh --full https://example.com` -- tests protocols, ciphers, vulnerabilities (BEAST, POODLE, Heartbleed, ROBOT), certificate details. Works on any TLS service, not just HTTPS. |
| **Mozilla SSL Configuration Generator** | TLS config templates | Generates secure Nginx/Apache/HAProxy configurations for Modern (TLS 1.3 only), Intermediate (TLS 1.2+), or Old compatibility levels. |
| **cert-manager** | Kubernetes certificate automation | Automatic TLS certificate provisioning and renewal via Let's Encrypt. |
| **Certbot** | ACME client | Automated Let's Encrypt certificate issuance and renewal. |

### Certificate Monitoring

| Tool | Purpose |
|------|---------|
| **Certificate Transparency Logs** | Monitor CT logs for unauthorized certificate issuance for your domains |
| **Keychecker / cert-manager** | Automated expiry alerting |
| **Uptime monitoring (Datadog, Pingdom)** | TLS certificate expiry checks as part of synthetic monitoring |

### Crypto Linting Rules (Semgrep Examples)

```yaml
# .semgrep/crypto-rules.yml
rules:
  - id: weak-hash-md5
    patterns:
      - pattern: crypto.createHash('md5')
    message: "MD5 is cryptographically broken. Use SHA-256 or SHA-3."
    severity: ERROR

  - id: ecb-mode
    patterns:
      - pattern: crypto.createCipheriv('aes-256-ecb', ...)
    message: "ECB mode leaks plaintext patterns. Use AES-256-GCM."
    severity: ERROR

  - id: insecure-random
    patterns:
      - pattern: Math.random()
    message: "Math.random() is not cryptographically secure. Use crypto.randomBytes()."
    severity: WARNING
```

---

## 7. Platform-Specific Guidance

### 7.1 Node.js

**Primary library:** Built-in `crypto` module (backed by OpenSSL).

**Key practices:**
- Use `crypto.createCipheriv('aes-256-gcm', key, nonce)` -- never `createCipher()` (deprecated, uses MD5 key derivation).
- Generate keys/IVs with `crypto.randomBytes()`.
- Use `crypto.scryptSync()` or `crypto.pbkdf2Sync()` for password-based key derivation.
- Use `crypto.timingSafeEqual()` for all secret comparisons.
- For password hashing, use the `argon2` npm package (wraps reference C implementation) or `bcrypt`/`bcryptjs`.
- Set `crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1` when creating TLS contexts.
- Node.js 20+ supports `crypto.subtle` (Web Crypto API) for browser-compatible operations.

**Common mistakes:**
- Using `createCipher()` instead of `createCipheriv()` (no control over IV)
- Calling `decipher.final()` without `decipher.setAuthTag()` for GCM
- Using `Buffer.from(password)` directly as a key instead of proper key derivation

### 7.2 Python

**Primary libraries:** `cryptography` (recommended), `PyCryptodome` (alternative).

**Key practices:**
- Use `cryptography.hazmat.primitives.ciphers.aead.AESGCM` for symmetric encryption.
- Use `cryptography.fernet.Fernet` for simple symmetric encryption (AES-128-CBC + HMAC, handles IV automatically).
- Generate randomness with `secrets.token_bytes()` or `os.urandom()`.
- Use `argon2-cffi` package for password hashing.
- Use `hmac.compare_digest()` for constant-time comparison.
- The `hashlib` module is for non-password hashing only (SHA-256, SHA-3).
- Avoid `PyCrypto` (unmaintained since 2014, known vulnerabilities).

**Common mistakes:**
- Using `hashlib.sha256(password).hexdigest()` for password storage
- Importing from `Crypto` (PyCrypto) instead of `Cryptodome` (PyCryptodome)
- Using `random.randint()` for token generation instead of `secrets`

### 7.3 Mobile -- iOS

**Primary framework:** Apple CryptoKit (iOS 13+).

**Key practices:**
- Use `AES.GCM` for symmetric encryption, `ChaChaPoly` for ChaCha20-Poly1305.
- Use `P256.Signing` / `Curve25519.Signing` for digital signatures.
- Use `SHA256.hash(data:)` for hashing; `HMAC<SHA256>` for MAC.
- Store keys in the **Secure Enclave** via `SecureEnclave.P256.Signing.PrivateKey()` for hardware-backed protection (keys never leave the chip).
- Use iOS **Keychain Services** for persistent key storage with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`.
- Enable App Transport Security (ATS) -- enforces TLS 1.2+ with forward secrecy by default.
- Use certificate pinning via `URLSession` delegate methods or `NSPinnedDomains` in Info.plist.

### 7.4 Mobile -- Android

**Primary frameworks:** `javax.crypto`, Android Keystore, Tink.

**Key practices:**
- Use **Android Keystore** for hardware-backed key storage (TEE or StrongBox on supported devices).
- Use **Google Tink** library for high-level crypto operations (replaces deprecated Jetpack Security crypto library, deprecated in v1.1.0).
- Generate keys with `KeyGenerator` using `AndroidKeyStore` provider.
- Use `Cipher.getInstance("AES/GCM/NoPadding")` for symmetric encryption.
- Enforce `setUserAuthenticationRequired(true)` for sensitive keys (requires biometric/PIN to use).
- Configure Network Security Config XML to enforce TLS and certificate pinning.
- Do NOT use `SharedPreferences` for secrets without encryption; use EncryptedSharedPreferences (via Tink).

### 7.5 TLS Termination -- Nginx

```nginx
# /etc/nginx/conf.d/tls.conf -- Mozilla Intermediate profile
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# HSTS (1 year, includeSubDomains)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 8.8.8.8 valid=300s;
```

### 7.6 Load Balancer / CDN

- **AWS ALB/NLB:** Use TLS 1.2+ security policies (`ELBSecurityPolicy-TLS13-*`). Terminate TLS at ALB; use ACM for certificate management.
- **Cloudflare:** Enable "Minimum TLS Version: 1.2", "Always Use HTTPS", "Authenticated Origin Pulls".
- **GCP Load Balancer:** Use managed SSL certificates; set SSL policy to MODERN or RESTRICTED profile.
- All platforms: re-encrypt traffic between load balancer and origin (TLS end-to-end), not just edge termination.

---

## 8. Incident Patterns

### 8.1 Detecting Cryptographic Failures

| Signal | Detection Method |
|--------|-----------------|
| Cleartext sensitive data in logs/DB | DLP scanning, log analysis rules, database column encryption audits |
| Weak TLS configuration | Continuous SSL Labs scanning, testssl.sh in CI/CD, certificate transparency monitoring |
| Deprecated algorithm usage | SAST (Semgrep, CodeQL), dependency scanning for vulnerable OpenSSL versions |
| Key leaks in source code | Secret scanning (GitGuardian, GitHub secret scanning, truffleHog) |
| Certificate expiry | Automated monitoring with 30/14/7/1 day alerts |
| Anomalous decryption patterns | Application-level logging of crypto operations (without logging keys/plaintext) |

### 8.2 Certificate Expiry Incidents

Certificate expiry is one of the most common crypto-related outages. Notable incidents:
- **Equifax (2017):** Expired SSL certificate on intrusion detection system allowed data exfiltration to go undetected for 76 days.
- **Microsoft Teams (2020):** Expired certificate caused a 3-hour global outage.
- **Let's Encrypt root expiry (2021):** IdenTrust DST Root CA X3 expiry broke older clients (Android < 7.1).

**Prevention:**
1. Automate certificate issuance and renewal (cert-manager, Certbot, ACM).
2. Monitor certificate expiry with multiple systems (infrastructure monitoring + dedicated cert checker).
3. Maintain a certificate inventory with owners and expiry dates.
4. Alert at 30, 14, 7, 3, and 1 day before expiry.
5. Use short-lived certificates (90 days via Let's Encrypt) to reduce blast radius.

### 8.3 Crypto Incident Response Playbook

1. **Identify scope:** Which keys, certificates, or algorithms are affected? What data was protected by them?
2. **Contain:** Revoke compromised keys/certificates immediately. Rotate affected credentials.
3. **Assess exposure:** Determine what data could have been decrypted or forged. Check logs for unauthorized access during the exposure window.
4. **Remediate:** Deploy patched algorithms/configurations. Regenerate all affected keys. Re-encrypt data with new keys if key compromise is confirmed.
5. **Notify:** If personal data was exposed, trigger breach notification procedures per GDPR (72h), PCI DSS, HIPAA, or applicable regulations.
6. **Post-mortem:** Document root cause, update cryptographic standards, add detection rules to prevent recurrence.

---

## 9. Compliance and Standards

### 9.1 OWASP A02:2021 -- Cryptographic Failures

The second most critical web application security risk. Key requirements:
- Classify data by sensitivity; apply crypto controls proportionally
- No unnecessary storage of sensitive data; purge when no longer needed
- Encrypt all sensitive data at rest and in transit
- Use current, strong algorithms, protocols, and keys with proper key management
- Encrypt all data in transit with TLS; enforce with HSTS
- Disable caching for responses containing sensitive data
- Do not use legacy protocols such as FTP or SMTP for transporting sensitive data
- Use authenticated encryption, not just encryption

### 9.2 NIST SP 800-57 -- Key Management

Three-part recommendation covering the full key lifecycle:
- **Part 1 (General):** Key types, states (pre-operational, operational, post-operational, destroyed), cryptoperiods, algorithm recommendations.
- **Part 2 (Organization):** Policy, roles, responsibilities for key management.
- **Part 3 (Application-Specific):** Guidance for PKI certificates, IPsec, TLS.

**Key cryptoperiods (NIST recommendations):**
| Key Type | Recommended Cryptoperiod |
|----------|------------------------|
| Symmetric encryption (data) | 1-2 years originator usage |
| Symmetric authentication (MAC) | 5 years max |
| Asymmetric (private signing) | 1-3 years |
| Asymmetric (public verification) | 1-3 years beyond signing key |
| Asymmetric (key transport) | 1-2 years |
| Root CA keys | 10-20 years |

### 9.3 FIPS 140-2 / FIPS 140-3

Federal standard for cryptographic module validation. Required for US government systems
and often for regulated industries (healthcare, finance).

- **FIPS 140-3** (effective 2019, superseding FIPS 140-2): four security levels (1-4).
- Mandates use of NIST-approved algorithms: AES, SHA-2/SHA-3, RSA, ECDSA, HMAC.
- Requires validated entropy sources and DRBG (Deterministic Random Bit Generators).
- Hardware Security Modules (HSMs) at Level 3+ provide tamper-evident physical security.
- FIPS 140-2 validations still accepted but no new validations issued.

### 9.4 PCI DSS 4.0 / 4.0.1 -- Encryption Requirements

PCI DSS 4.0 full compliance deadline: **March 31, 2025**. Key cryptographic requirements:

- **Requirement 3:** Protect stored account data. Use strong cryptography (AES-128+, RSA-2048+, ECDSA-224+, TDES for legacy only).
- **Requirement 4:** Protect cardholder data in transit with strong cryptography (TLS 1.2+ required).
- **Requirement 4.2.1 (new):** Maintain inventory of trusted keys and certificates. Review cipher suites and protocols at least annually.
- **Requirement 3.6:** Document and implement key management procedures covering generation, distribution, storage, rotation, and destruction.
- **Requirement 12.3.3:** Perform annual cryptographic cipher suite and protocol review.

### 9.5 GDPR and Data Protection

- Article 32: Implement encryption and pseudonymization as appropriate technical measures.
- Encryption of personal data can reduce breach notification requirements (encrypted data may not constitute a breach if the key is not compromised).
- No specific algorithm mandates, but "state of the art" standard implies current best practices.

---

## 10. Code Examples

### 10.1 AES-256-GCM Encryption/Decryption (TypeScript/Node.js)

```typescript
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12; // 96 bits, recommended for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns nonce + ciphertext + tag (all needed for decryption).
 */
export function encrypt(plaintext: string, key: Buffer): Buffer {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes (256 bits)');
  }

  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, nonce);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: [12-byte nonce][ciphertext][16-byte tag]
  return Buffer.concat([nonce, encrypted, tag]);
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Verifies authentication tag before returning plaintext.
 */
export function decrypt(payload: Buffer, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes (256 bits)');
  }

  const nonce = payload.subarray(0, NONCE_LENGTH);
  const tag = payload.subarray(payload.length - TAG_LENGTH);
  const ciphertext = payload.subarray(NONCE_LENGTH, payload.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag); // CRITICAL: must set before final()

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(), // Throws if tag verification fails
  ]);

  return decrypted.toString('utf8');
}

// Usage
const key = randomBytes(32); // Store securely, never hard-code
const encrypted = encrypt('sensitive data', key);
const decrypted = decrypt(encrypted, key);
```

### 10.2 AES-256-GCM Encryption/Decryption (Python)

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

NONCE_LENGTH = 12  # 96 bits

def encrypt(plaintext: str, key: bytes) -> bytes:
    """Encrypt with AES-256-GCM. Returns nonce + ciphertext + tag."""
    if len(key) != 32:
        raise ValueError("Key must be 32 bytes (256 bits)")

    nonce = os.urandom(NONCE_LENGTH)
    aesgcm = AESGCM(key)
    # encrypt() returns ciphertext + 16-byte tag appended
    ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext_and_tag


def decrypt(payload: bytes, key: bytes) -> str:
    """Decrypt AES-256-GCM. Raises InvalidTag if tampered."""
    if len(key) != 32:
        raise ValueError("Key must be 32 bytes (256 bits)")

    nonce = payload[:NONCE_LENGTH]
    ciphertext_and_tag = payload[NONCE_LENGTH:]
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext_and_tag, None)
    return plaintext.decode("utf-8")


# Usage
key = AESGCM.generate_key(bit_length=256)
encrypted = encrypt("sensitive data", key)
decrypted = decrypt(encrypted, key)
```

### 10.3 Password Hashing with Argon2id (Python)

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Configure Argon2id with OWASP-recommended parameters
ph = PasswordHasher(
    time_cost=3,         # Number of iterations
    memory_cost=65536,   # 64 MiB memory usage
    parallelism=1,       # Degree of parallelism
    hash_len=32,         # Output hash length in bytes
    salt_len=16,         # Salt length in bytes
    type=2,              # 2 = Argon2id (hybrid)
)

def hash_password(password: str) -> str:
    """Hash a password with Argon2id. Returns encoded hash string."""
    return ph.hash(password)

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored Argon2id hash."""
    try:
        return ph.verify(stored_hash, password)
    except VerifyMismatchError:
        return False

# Usage
hashed = hash_password("user-password-here")
# Store `hashed` in database (contains algorithm, params, salt, hash)
# Example: $argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$hash...

is_valid = verify_password("user-password-here", hashed)

# Check if rehashing is needed (e.g., after increasing parameters)
if is_valid and ph.check_needs_rehash(hashed):
    new_hash = hash_password("user-password-here")
    # Update stored hash in database
```

### 10.4 Password Hashing with Argon2id (TypeScript/Node.js)

```typescript
import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MiB
  timeCost: 3,         // 3 iterations
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}

// Check if rehash is needed after parameter upgrade
export function needsRehash(storedHash: string): boolean {
  return argon2.needsRehash(storedHash, ARGON2_OPTIONS);
}
```

### 10.5 HMAC Signing and Verification (TypeScript/Node.js)

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

const HMAC_ALGORITHM = 'sha256';

/**
 * Generate HMAC signature for a message.
 */
export function sign(message: string, secret: Buffer): string {
  return createHmac(HMAC_ALGORITHM, secret)
    .update(message, 'utf8')
    .digest('hex');
}

/**
 * Verify HMAC signature using constant-time comparison.
 */
export function verify(
  message: string,
  signature: string,
  secret: Buffer
): boolean {
  const expected = sign(message, secret);

  // CRITICAL: Use constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Usage: Webhook signature verification
const secret = Buffer.from(process.env.WEBHOOK_SECRET!, 'hex');
const payload = '{"event": "payment.completed"}';
const receivedSignature = req.headers['x-signature'] as string;

if (!verify(payload, receivedSignature, secret)) {
  throw new Error('Invalid webhook signature');
}
```

### 10.6 Secure Random Token Generation

```typescript
// TypeScript/Node.js
import { randomBytes, randomUUID } from 'crypto';

// 256-bit hex token (for API keys, session tokens)
const token = randomBytes(32).toString('hex');  // 64 hex chars

// URL-safe base64 token
const urlSafeToken = randomBytes(32).toString('base64url');

// UUID v4 (122 bits of randomness)
const uuid = randomUUID();
```

```python
# Python
import secrets

# 256-bit hex token
token = secrets.token_hex(32)

# URL-safe base64 token
url_safe_token = secrets.token_urlsafe(32)

# For password reset tokens, invitation codes, etc.
reset_token = secrets.token_urlsafe(48)  # 384 bits
```

### 10.7 Vulnerable vs. Secure Patterns Summary

```javascript
// ---- VULNERABLE PATTERNS ----

// 1. ECB mode
crypto.createCipheriv('aes-256-ecb', key, null);

// 2. Hard-coded key
const KEY = 'mysecretkey12345';

// 3. Math.random for tokens
const token = Math.random().toString(36).substring(2);

// 4. SHA-256 for passwords
const hash = crypto.createHash('sha256').update(password).digest('hex');

// 5. String comparison for secrets
if (token === expectedToken) { grant(); }

// 6. Disabled TLS verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 7. Deprecated createCipher (no IV control)
crypto.createCipher('aes-256-cbc', password);


// ---- SECURE PATTERNS ----

// 1. GCM authenticated encryption
const nonce = crypto.randomBytes(12);
crypto.createCipheriv('aes-256-gcm', key, nonce);

// 2. Key from environment / secret manager
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// 3. CSPRNG for tokens
const token = crypto.randomBytes(32).toString('hex');

// 4. Argon2id for passwords
const hash = await argon2.hash(password, { type: argon2.argon2id });

// 5. Constant-time comparison
crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));

// 6. Proper CA certificate handling
new https.Agent({ ca: fs.readFileSync('/etc/ssl/certs/ca-bundle.crt') });

// 7. createCipheriv with explicit IV
const iv = crypto.randomBytes(16);
crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
```

---

## References and Sources

- [OWASP Top 10:2021 -- A02 Cryptographic Failures](https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/)
- [NIST Post-Quantum Cryptography Standards (FIPS 203, 204, 205)](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards)
- [NIST SP 800-57 Key Management Recommendations](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57Pt3r1.pdf)
- [NIST FIPS 140-3](https://csrc.nist.gov/pubs/fips/140-3/final)
- [PCI DSS 4.0 Cryptographic Requirements](https://www.thoropass.com/blog/pci-dss-encryption-requirements)
- [Adobe 2013 Breach -- Schneier on Security](https://www.schneier.com/blog/archives/2013/11/cryptographic_b.html)
- [Ashley Madison Password Cracking -- CynoSure Prime](https://blog.cynosureprime.com/2015/09/how-we-cracked-millions-of-ashley.html)
- [CWE-327: Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [testssl.sh](https://testssl.sh/)
- [Semgrep Security Rules](https://semgrep.dev/p/security-audit)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Python cryptography Library](https://cryptography.io/)
- [Apple CryptoKit Documentation](https://developer.apple.com/documentation/cryptokit)
- [Android Cryptography Guide](https://developer.android.com/privacy-and-security/cryptography)
- [NIST SP 800-52 Rev. 2 -- TLS Guidelines](https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final)
