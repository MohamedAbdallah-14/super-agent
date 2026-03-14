# Data Encryption Security Expertise

> **Purpose:** Reference for AI agents implementing proper encryption at rest and in transit.
> **Last updated:** 2026-03-08 | **Sources:** NIST SP 800-111, FIPS 203/204/205, PCI-DSS v4.0.1, GDPR Art. 32, HIPAA, AWS/GCP docs, OWASP

---

## 1. Threat Landscape

### Attack Vectors

| Vector | Description | Impact |
|---|---|---|
| Unencrypted storage | PII/PHI stored plaintext in databases | Full exposure on any breach |
| Man-in-the-middle | Interception of unencrypted network traffic | Credential theft, session hijacking |
| Stolen backups | Backup media exfiltrated without encryption | Offline data exposure |
| Cloud misconfiguration | S3 buckets, databases exposed unencrypted | Mass data exfiltration |
| Key co-location | Keys stored alongside encrypted data | Encryption rendered useless |
| Weak algorithms | MD5, SHA-1, DES, RC4, TLS 1.0/1.1 | Feasible brute-force or known attacks |

### Real-World Breaches

**Capital One (2019) -- 106M Records.** SSRF vulnerability in a misconfigured WAF let an attacker obtain IAM credentials from AWS metadata service. ~30 GB of data (SSNs, bank accounts, credit scores) was accessed -- much stored unencrypted in S3. The IAM role had decrypt permissions, so encryption provided no defense once credentials were compromised. Undetected March-July 2019.
- **Lesson:** Encryption without proper key access controls is insufficient. Use envelope encryption with separate policies per data classification. Enforce IMDSv2 for SSRF protection.

**Marriott/Starwood (2018) -- 383M Records.** Starwood's network was compromised in 2014 (before Marriott's acquisition). 5.25 million passport numbers were stored completely unencrypted. Encrypted credit card keys were stored on the same system.
- **Lesson:** Encrypt all sensitive fields, especially government IDs. Never co-locate keys with data. M&A due diligence must include security posture assessment.

**National Public Data (2023-2024) -- 2.9B Records.** Background check firm breach exposed SSNs, names, addresses. Unencrypted records were freely leaked in a 4TB dump on cybercrime forums.
- **Lesson:** Data aggregators are high-value targets. Field-level encryption of SSNs and government IDs is essential.

---

## 2. Core Security Principles

### Encryption at Rest
- **Full Disk Encryption (FDE):** BitLocker, FileVault, dm-crypt/LUKS -- encrypts entire volumes
- **Database Encryption:** TDE (whole-database) or column/field-level for targeted protection
- **Object Storage:** AWS S3 SSE, GCP Cloud Storage default encryption

### Encryption in Transit
- **TLS 1.3** (RFC 8446) is the current standard. TLS 1.2 acceptable with proper ciphers. TLS 1.0/1.1 deprecated (RFC 8996).
- **mTLS:** Both client and server authenticate -- required for zero-trust service-to-service.
- **VPN/WireGuard/IPsec:** Network-level encrypted tunnels.

### Envelope Encryption
Two-tier key hierarchy: KMS manages a Key Encryption Key (KEK) that encrypts locally-generated Data Encryption Keys (DEKs). DEKs encrypt the actual data. Only the small DEK goes to KMS, reducing API calls by up to 99% (AWS). Each data object gets its own DEK, limiting blast radius. The KEK never leaves the HSM.

### Key Management Lifecycle

| Phase | Requirements |
|---|---|
| Generation | CSPRNG, minimum AES-256 |
| Storage | HSMs or managed KMS -- never alongside data |
| Rotation | Annually minimum, immediately after suspected compromise |
| Destruction | Cryptographic erasure, eliminate all copies |

### Crypto Agility
Ability to swap algorithms without major changes. Critical for post-quantum transition (NIST targets 2035). Abstract crypto behind interfaces, store algorithm identifiers with encrypted data, version encryption schemas.

---

## 3. Implementation Patterns

### 3.1 TLS 1.3 Configuration (Nginx)

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
    ssl_prefer_server_ciphers off;  # Let clients optimize for their hardware
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    # HSTS (1 year, subdomains, preload-ready)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    # Note: Let's Encrypt discontinued OCSP in 2025 -- stapling has no effect with LE certs
}
server { listen 80; return 301 https://$host$request_uri; }  # Force HTTPS
```

### 3.2 Field-Level Encryption (TypeScript)

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

interface EncryptedField {
  v: number; iv: string; ct: string; tag: string;
}

export function encryptField(plaintext: string, key: Buffer): EncryptedField {
  if (key.length !== 32) throw new Error('Key must be 32 bytes (AES-256)');
  const iv = randomBytes(12); // 96-bit IV per NIST
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    v: 1, iv: iv.toString('base64'),
    ct: encrypted.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptField(field: EncryptedField, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key,
    Buffer.from(field.iv, 'base64'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(field.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(field.ct, 'base64')), decipher.final()
  ]).toString('utf8');
}
// Key from KMS: const key = await fetchKeyFromKMS('alias/user-pii-key');
```

### 3.3 Envelope Encryption (TypeScript + AWS KMS)

```typescript
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const kms = new KMSClient({ region: 'us-east-1' });

export async function envelopeEncrypt(plaintext: Buffer) {
  const { Plaintext: dek, CiphertextBlob: encDek } = await kms.send(
    new GenerateDataKeyCommand({ KeyId: 'alias/my-key', KeySpec: 'AES_256' }));
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dek!, iv);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { encryptedDEK: Buffer.from(encDek!).toString('base64'),
      iv: iv.toString('base64'), ciphertext: ct.toString('base64'),
      tag: cipher.getAuthTag().toString('base64') };
  } finally { (dek as Buffer).fill(0); } // Clear plaintext DEK from memory
}

export async function envelopeDecrypt(envelope: any): Promise<Buffer> {
  const { Plaintext: dek } = await kms.send(
    new DecryptCommand({ CiphertextBlob: Buffer.from(envelope.encryptedDEK, 'base64') }));
  try {
    const decipher = createDecipheriv('aes-256-gcm', dek!,
      Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
  } finally { (dek as Buffer).fill(0); }
}
```

### 3.4 Database Column Encryption (PostgreSQL pgcrypto)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- VULNERABLE: plaintext SSN
CREATE TABLE users_bad (id SERIAL, ssn TEXT, credit_card TEXT);

-- SECURE: encrypted columns
CREATE TABLE users_secure (id SERIAL PRIMARY KEY, name TEXT,
    ssn_enc BYTEA, credit_card_enc BYTEA);

INSERT INTO users_secure (name, ssn_enc, credit_card_enc) VALUES ('Jane Doe',
    pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key')),
    pgp_sym_encrypt('4111111111111111', current_setting('app.encryption_key')));
-- Key loaded from KMS at connection time via: SET app.encryption_key = '...';
```

---

## 4. Vulnerability Catalog

| ID | Vulnerability | Risk | Remediation |
|---|---|---|---|
| V-ENC-01 | Unencrypted PII in database | CRITICAL | Field-level AES-256-GCM encryption before storage |
| V-ENC-02 | TLS 1.0/1.1 enabled | HIGH | Disable; use TLS 1.2+ only (`ssl_protocols TLSv1.2 TLSv1.3`) |
| V-ENC-03 | Self-signed certs in production | HIGH | Use trusted CA (Let's Encrypt). Automate renewal with Certbot |
| V-ENC-04 | Unencrypted backups | CRITICAL | Encrypt pipelines (GPG/KMS). Never write plaintext to disk |
| V-ENC-05 | Key stored next to data | CRITICAL | Store keys in KMS/HSM with separate access policies |
| V-ENC-06 | Weak cipher suites (RC4, DES, CBC) | HIGH | Allow only AEAD suites (AES-GCM, ChaCha20-Poly1305) |
| V-ENC-07 | Missing HSTS header | MEDIUM | Set `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| V-ENC-08 | Hardcoded encryption keys | CRITICAL | Use KMS/Vault/env vars. Scan with truffleHog/gitleaks |
| V-ENC-09 | Plaintext internal service comms | HIGH | Enforce mTLS between services (Istio, Linkerd) |
| V-ENC-10 | ECB mode encryption | HIGH | Use GCM (preferred) or CCM. ECB preserves data patterns |
| V-ENC-11 | IV/nonce reuse in GCM | CRITICAL | Random 96-bit IV per operation. Rotate key before 2^32 ops |
| V-ENC-12 | Missing cert pinning (mobile) | HIGH | Pin certificates or public keys with backup pins |
| V-ENC-13 | Unencrypted data in logs | HIGH | Sanitize/mask sensitive fields before logging |
| V-ENC-14 | MD5/SHA-1 for integrity | MEDIUM | Use SHA-256 or SHA-3. HMAC-SHA-256 for authentication |
| V-ENC-15 | Encryption key in browser storage | HIGH | Use Web Crypto API with non-extractable keys |

### Vulnerable vs. Secure Code Pairs

```typescript
// V-ENC-01: VULNERABLE -- plaintext PII
await db.query('INSERT INTO users (ssn) VALUES ($1)', [ssn]);
// SECURE -- encrypted
const enc = encryptField(ssn, await getKeyFromKMS('alias/pii-key'));
await db.query('INSERT INTO users (ssn_enc) VALUES ($1)', [JSON.stringify(enc)]);

// V-ENC-08: VULNERABLE -- hardcoded key
const KEY = Buffer.from('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
// SECURE -- from KMS
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');

// V-ENC-02: VULNERABLE Nginx
// ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
// SECURE
// ssl_protocols TLSv1.2 TLSv1.3;
```

---

## 5. Security Checklist

### Data at Rest (8 items)
- [ ] All PII/PHI fields use field-level encryption (AES-256-GCM)
- [ ] Database backups encrypted before written to disk
- [ ] Full-disk encryption on all servers and workstations
- [ ] Cloud storage uses SSE-KMS (preferred over SSE-S3)
- [ ] Keys stored in KMS/HSM, never alongside data
- [ ] Key rotation automated (minimum annually)
- [ ] Decommissioned media undergoes cryptographic erasure
- [ ] Log files contain no plaintext sensitive data

### Data in Transit (8 items)
- [ ] TLS 1.2+ enforced; TLS 1.0/1.1 disabled
- [ ] Only AEAD cipher suites allowed
- [ ] HSTS headers set (min 1-year max-age)
- [ ] Certificate automation (Certbot/cert-manager)
- [ ] Internal service traffic uses mTLS
- [ ] Certificate expiration monitoring with alerts
- [ ] No self-signed certificates in production
- [ ] HTTP-to-HTTPS redirect on all endpoints

### Key Management (7 items)
- [ ] Keys generated with CSPRNG, AES-256 minimum
- [ ] Separate keys per data classification (PII, financial, general)
- [ ] Key access audit logging enabled (CloudTrail for AWS KMS)
- [ ] Emergency key revocation procedure documented and tested
- [ ] Keys never in source code, logs, or error messages
- [ ] Envelope encryption for large data volumes
- [ ] Post-quantum migration plan documented (target: 2035)

### Application Layer (6 items)
- [ ] Crypto abstracted behind interfaces (crypto agility)
- [ ] Encryption version stored with encrypted data
- [ ] No deprecated algorithms (MD5, SHA-1, DES, RC4, ECB)
- [ ] IV/nonce uniqueness enforced; key rotation before 2^32 ops
- [ ] Auth tags verified before processing decrypted data
- [ ] Sensitive data zeroed from memory after use

---

## 6. Tools and Automation

| Category | Tool | Purpose |
|---|---|---|
| TLS Testing | **SSL Labs** (ssllabs.com) | Online TLS grading (target A+) |
| TLS Testing | **testssl.sh** | Offline scanner: `./testssl.sh --severity HIGH example.com` |
| Certs | **Certbot** | Let's Encrypt automation (90-day certs) |
| Certs | **cert-manager** | Kubernetes certificate lifecycle |
| Config | **Mozilla SSL Config Generator** | Secure configs for Nginx/Apache/HAProxy |
| KMS | **AWS KMS** | HSM-backed, CloudTrail audit, auto-rotation |
| KMS | **GCP Cloud KMS** | CMEK, envelope encryption, EKM |
| KMS | **HashiCorp Vault** | Multi-cloud secrets, transit encryption, PKI |
| Secrets Scan | **truffleHog / gitleaks** | Detect hardcoded keys in git repos |
| Cloud Audit | **Prowler / ScoutSuite** | Check encryption configs across cloud |
| IaC Scan | **tfsec / trivy** | Flag encryption misconfigs in Terraform |
| DB Encryption | **pgcrypto** (PostgreSQL) | Column-level SQL encryption |
| DB Encryption | **MongoDB CSFLE** | Client-side field-level encryption |

---

## 7. Platform-Specific Guidance

### AWS Encryption

**S3 SSE options:** SSE-S3 (AWS-managed, free, default), SSE-KMS (audit trails, granular control, $1/key/month), SSE-C (customer-provided keys, full ownership).

```json
{ "Statement": [{ "Effect": "Deny", "Principal": "*", "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": { "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }}}]}
```

Best practices: default encryption on all buckets, KMS key policies restricting IAM roles, CloudTrail for KMS calls, VPC endpoints for KMS, EBS encryption by default.

### GCP Encryption
Default: all data AES-256 at rest. CMEK for key control/audit. CSEK for customer-supplied keys. EKM for keys outside Google. Use Tink library for envelope encryption.

### MongoDB CSFLE
Encrypts fields before they leave the application -- DBAs cannot see plaintext.
- **Deterministic** encryption: same plaintext = same ciphertext. Allows equality queries. Use for searchable fields (email, SSN).
- **Random** encryption: more secure, no query support. Use for read-only fields (medical records, notes).

### Mobile Encryption

**iOS Data Protection:** Hardware-backed AES-256. Use `NSFileProtectionComplete` for sensitive files (accessible only when unlocked). Store secrets in Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`.

**Android:** Use `EncryptedSharedPreferences` (AES256-SIV keys, AES256-GCM values). Store secrets via Android Keystore. Use hardware-backed StrongBox when available.

**Both platforms:** Enable cert pinning, encrypt local databases (SQLCipher), never store keys in app code.

---

## 8. Incident Patterns

### Unencrypted Data Exposure
**Detect:** Cloud scanner flags (Prowler, ScoutSuite), schema audit finds TEXT columns for SSN/credit card, network inspection reveals plaintext in HTTP.
**Respond:** Enable encryption immediately, rotate exposed credentials, assess access logs for exposure window, determine notification obligations (GDPR 72h, HIPAA 60d).

### Certificate Issues
**Detect:** Monitoring alerts for expiring certs, browser warnings, service failures.
**Respond:** Renew immediately, verify complete chain, test with SSL Labs, review automation.

### Key Compromise
**Respond:** (1) Disable/revoke key in KMS immediately, (2) identify all data encrypted with key, (3) generate new keys and re-encrypt affected data, (4) rotate dependent credentials, (5) investigate root cause, (6) post-mortem and update procedures, (7) determine notification requirements.

---

## 9. Compliance and Standards

### PCI-DSS v4.0.1 (Requirements 3-4)
- **Req 3:** Protect stored account data. PAN rendered unreadable (AES-256, hash, truncation, tokenization). Keys managed by fewest custodians; split knowledge/dual control.
- **Req 4:** Protect cardholder data in transit with TLS 1.2+ and strong ciphers.
- **Minimum:** AES-128 (AES-256 recommended).

### GDPR Article 32
Explicitly names encryption as an appropriate safeguard. Encrypted data breached without key compromise may not require notification (Recital 83). DPIAs should evaluate encryption measures.

### HIPAA
- **At rest (164.312(a)):** Encrypt ePHI per NIST SP 800-111. "Addressable" specification.
- **In transit (164.312(e)):** TLS 1.2+ with strong ciphers.
- **Safe Harbor:** Encrypted ePHI breach with uncompromised keys is NOT reportable.

### NIST Standards Reference

| Standard | Scope |
|---|---|
| SP 800-111 | Storage encryption for end-user devices |
| SP 800-52 Rev. 2 | TLS implementation (TLS 1.2+ required) |
| SP 800-57 | Key management lifecycle |
| FIPS 140-3 | Cryptographic module validation (HSMs) |
| FIPS 197 | AES specification (128/192/256-bit) |
| FIPS 203 (2024) | Post-quantum key encapsulation (ML-KEM, from CRYSTALS-KYBER) |
| FIPS 204 (2024) | Post-quantum signatures (ML-DSA, from CRYSTALS-Dilithium) |
| FIPS 205 (2024) | Post-quantum signatures (SLH-DSA, from SPHINCS+) |

**Post-quantum timeline:** NIST targets widespread PQC adoption by 2035. HQC selected March 2025. FALCON forthcoming as FIPS 206. Begin crypto inventory, implement agility, test hybrid approaches now.

---

## References

- NIST SP 800-111: https://csrc.nist.gov/pubs/sp/800/111/final
- NIST PQC Standards (Aug 2024): https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards
- PCI-DSS v4.0.1: https://www.thoropass.com/blog/pci-dss-encryption-requirements
- AWS KMS Best Practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/general-encryption-best-practices.html
- GCP Envelope Encryption: https://cloud.google.com/kms/docs/envelope-encryption
- Capital One Breach: https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/
- Marriott Breach: https://www.nbcnews.com/tech/tech-news/marriott-reveals-5-million-unencrypted-passport-numbers-were-leaked-2018-n954791
- MongoDB CSFLE: https://www.mongodb.com/docs/manual/core/csfle/
- PostgreSQL pgcrypto: https://www.postgresql.org/docs/current/pgcrypto.html
- HIPAA Encryption: https://www.hipaajournal.com/hipaa-encryption-requirements/
- SSL Labs: https://www.ssllabs.com/ssltest/
