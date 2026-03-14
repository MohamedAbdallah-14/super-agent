# Secrets Management — Security Expertise Module

> **Purpose:** Comprehensive reference for AI agents to ensure secrets are never hardcoded,
> leaked, or mismanaged in any codebase, pipeline, or deployment artifact.
>
> **Last updated:** 2026-03-08
> **Sources:** GitGuardian State of Secrets Sprawl 2025, GitHub Security Blog, OWASP Secrets
> Management Cheat Sheet, NIST SP 800-57, PCI-DSS v4.0.1, CWE/MITRE, vendor documentation.

---

## 1. Threat Landscape

### 1.1 Scale of the Problem

Secret sprawl is one of the most pervasive and underestimated security risks in modern
software development. The numbers are staggering:

- **39 million secrets** were leaked across GitHub repositories in 2024 alone (GitHub Security).
- GitGuardian independently detected **23.8 million new hardcoded secrets** in public GitHub
  repos in 2024 — a **25% year-over-year increase**.
- **70% of secrets leaked in 2022 remain valid today**, giving attackers prolonged access.
- **22% of all breaches** in 2025 are driven by stolen or leaked credentials (Verizon DBIR).
- **65% of top private AI companies** had exposed API keys or tokens in public GitHub repos.
- GitHub Copilot users showed a **6.4% secret leakage rate** in public repositories.

### 1.2 Where Secrets Leak

| Attack Surface              | Detail                                                        |
|-----------------------------|---------------------------------------------------------------|
| Source code repositories    | Hardcoded API keys, passwords, tokens committed to Git        |
| `.env` files                | Exposed via misconfigured web servers, committed to repos      |
| Docker images               | 98% of detected secrets found in Docker image layers          |
| CI/CD logs                  | Secrets printed to build output, stored in plain text          |
| Collaboration tools          | 6.1% of Jira tickets and 2.4% of Slack channels contain secrets |
| Client-side code            | API keys embedded in JavaScript bundles, mobile app binaries   |
| URL parameters              | Tokens passed in query strings, logged by proxies and servers  |
| Infrastructure-as-Code      | Cloud credentials in Terraform state files, Ansible playbooks  |
| Git history                 | Secrets removed from HEAD but still in commit history          |

### 1.3 Real-World Breaches

**Uber (2016) — AWS Keys in GitHub Repository**
Attackers discovered AWS administrator credentials hardcoded in a private GitHub repository.
Using these credentials, they accessed an S3 bucket containing data on 57 million users and
600,000 driver license numbers. Uber paid the attackers $100,000 to delete the data and
concealed the breach for over a year. The eventual disclosure led to a $148 million settlement
with all 50 U.S. states.

**Toyota (2022) — Access Key Public on GitHub for 5 Years**
In December 2017, a subcontractor uploaded T-Connect source code to a public GitHub repo
containing a hardcoded access key to the customer data server. The exposure went undetected
until September 2022, potentially compromising 296,019 customer records (IDs and emails)
across nearly five years.

**Samsung (2022) — Lapsus$ Source Code Leak**
The Lapsus$ group exfiltrated 190GB of Samsung source code, which contained thousands of
hardcoded credentials and secrets. The leaked data included TrustZone source code, biometric
unlock algorithms, bootloader code, and confidential Qualcomm data.

**CircleCI (2023) — Mass Secrets Rotation Incident**
Unauthorized access on December 19, 2022 led to exfiltration of customer environment
variables, keys, and tokens on December 22. CircleCI advised all customers to rotate every
secret stored in the platform — OAuth tokens, API keys, SSH keys, and cloud credentials.
The incident forced organization-wide secrets rotation across thousands of companies.

**U.S. Treasury (2024) — Single Leaked API Key**
A compromise of the U.S. Treasury Department was traced to a single leaked API key for an
authentication platform, demonstrating that one exposed secret can compromise an entire
government agency.

**Large-Scale .env Extortion Campaign (2024)**
Attackers scanned 26.8 million IP addresses, harvesting credentials from publicly exposed
`.env` files. They extracted 1,185 AWS access keys, 333 PayPal OAuth tokens, 235 GitHub
tokens, and used compromised AWS infrastructure to encrypt S3 buckets for ransom.

---

## 2. Core Security Principles

### 2.1 The Seven Commandments of Secrets Management

1. **Never hardcode secrets.** No credentials in source code, config files committed to VCS,
   or compiled binaries — no exceptions, not even for "local development only."

2. **Rotate regularly.** Every secret has a shelf life. Automate rotation on a schedule
   (90 days maximum for most credentials, shorter for high-privilege keys).

3. **Least privilege.** Each secret grants the minimum permissions required. A database
   credential for a read-only service should not have write access.

4. **Encrypt at rest and in transit.** Secrets stored in vaults must be encrypted with
   AES-256 or equivalent. Transmission must use TLS 1.2+.

5. **Audit all access.** Every read, write, and rotation of a secret must be logged with
   identity, timestamp, and purpose. Alert on anomalous access patterns.

6. **Separate by environment.** Development, staging, and production must use different
   secrets. A compromised dev key must never grant production access.

7. **Assume breach.** Design systems so that any single compromised secret has a limited
   blast radius. Use short-lived tokens, scoped permissions, and defense in depth.

### 2.2 Defense in Depth for Secrets

```
Layer 1: Prevention    — Pre-commit hooks block secrets before they enter Git
Layer 2: Detection     — CI scanners catch secrets that bypass pre-commit
Layer 3: Remediation   — Automated rotation on detection, alert pipelines
Layer 4: Monitoring    — Runtime detection of secret misuse, anomaly alerts
Layer 5: Response      — Incident playbooks for leaked credential scenarios
```

---

## 3. Implementation Patterns

### 3.1 Environment Variables — Proper Usage

Environment variables are the baseline mechanism for injecting secrets at runtime.

**Correct pattern:**
```bash
# Secrets loaded from a secure source into the process environment
export DATABASE_URL="postgres://user:${DB_PASS}@host:5432/db"

# Application reads at startup
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is required");
```

**Common mistakes to avoid:**
- Never commit `.env` files to version control
- Never log environment variables (especially in error handlers or debug output)
- Never pass secrets via command-line arguments (visible in `ps` output)
- Never embed secrets in Dockerfiles (`ENV SECRET=...` persists in image layers)

### 3.2 Secret Managers — Enterprise Solutions

**AWS Secrets Manager**
- Automatic rotation with Lambda functions
- Fine-grained IAM policies for access control
- Cross-account secret sharing
- Native integration with RDS, Redshift, DocumentDB
- Versioning with staging labels (AWSCURRENT, AWSPENDING, AWSPREVIOUS)

**GCP Secret Manager**
- IAM-based access control per secret version
- Automatic replication across regions
- Customer-managed encryption keys (CMEK)
- Integration with Cloud Run, GKE, Cloud Functions
- Audit logging via Cloud Audit Logs

**HashiCorp Vault**
- Dynamic secrets: generates credentials on demand with automatic TTL expiry
- Multiple auth methods: AppRole, Kubernetes, AWS IAM, OIDC, LDAP
- Encryption as a service (Transit secrets engine)
- Namespaces for multi-tenant isolation
- Policy-as-code with HCL
- High availability with Raft or Consul backend

**Azure Key Vault**
- HSM-backed key storage (FIPS 140-2 Level 2/3)
- Managed identity integration (no credentials needed)
- Certificate lifecycle management
- Soft-delete and purge protection

### 3.3 .gitignore Patterns for Secrets

```gitignore
# ---- Environment & Secrets ----
.env
.env.*
!.env.example
!.env.template

# ---- Private Keys & Certificates ----
*.pem
*.key
*.p12
*.pfx
*.jks
*.keystore
id_rsa
id_ed25519

# ---- Cloud Credentials ----
credentials.json
service-account*.json
*-credentials.json
.aws/credentials
.gcloud/
.azure/

# ---- IDE & Editor Secrets ----
.idea/**/dataSources/
.vscode/settings.json

# ---- Terraform State (may contain secrets) ----
*.tfstate
*.tfstate.backup
.terraform/

# ---- Docker Secrets ----
docker-compose.override.yml
.docker/config.json

# ---- Miscellaneous ----
*.secret
*.secrets
secret.*
secrets.*
token.txt
api_key.txt
```

### 3.4 Secret Rotation Automation

```python
#!/usr/bin/env python3
"""Automated secret rotation for AWS Secrets Manager."""

import boto3
import json
import string
import secrets as stdlib_secrets
from datetime import datetime

def generate_password(length: int = 32) -> str:
    """Generate a cryptographically secure password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(stdlib_secrets.choice(alphabet) for _ in range(length))

def rotate_secret(secret_id: str, region: str = "us-east-1") -> dict:
    """Rotate a secret in AWS Secrets Manager."""
    client = boto3.client("secretsmanager", region_name=region)

    # Step 1: Retrieve current secret
    current = client.get_secret_value(SecretId=secret_id)
    secret_data = json.loads(current["SecretString"])

    # Step 2: Generate new credential
    new_password = generate_password()
    secret_data["password"] = new_password
    secret_data["rotated_at"] = datetime.utcnow().isoformat()

    # Step 3: Update the secret (creates a new version)
    client.put_secret_value(
        SecretId=secret_id,
        SecretString=json.dumps(secret_data),
        VersionStages=["AWSCURRENT"],
    )

    # Step 4: Update the downstream service (e.g., database password)
    # update_database_password(secret_data["username"], new_password)

    return {"secret_id": secret_id, "rotated_at": secret_data["rotated_at"]}

if __name__ == "__main__":
    result = rotate_secret("prod/database/main")
    print(f"Rotated: {result['secret_id']} at {result['rotated_at']}")
```

### 3.5 Kubernetes Secrets

Native Kubernetes Secrets are base64-encoded (not encrypted) by default. This is
insufficient for production.

**Best practices:**
- Enable encryption at rest in etcd (`EncryptionConfiguration` with `aescbc` or `aesgcm`)
- Use the External Secrets Operator (ESO) to sync from Vault/AWS/GCP/Azure
- Apply RBAC to restrict `get`, `list`, `watch` on Secret resources
- Use `projected` volumes instead of environment variables to avoid secrets in `kubectl describe`
- Never store secrets in ConfigMaps
- Set NetworkPolicies to restrict ESO pod communication

**External Secrets Operator example:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: prod/database/main
        property: username
    - secretKey: password
      remoteRef:
        key: prod/database/main
        property: password
```

### 3.6 CI/CD Secret Injection

**GitHub Actions:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # Secrets are masked in logs automatically
          ./deploy.sh
```

**GitLab CI:**
```yaml
deploy:
  stage: deploy
  variables:
    # References CI/CD variable set in GitLab UI (Settings > CI/CD > Variables)
    DATABASE_URL: $DATABASE_URL
  script:
    - ./deploy.sh
  environment:
    name: production
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

**Key rules for CI/CD secrets:**
- Never echo or print secret values in build scripts
- Use masked variables (GitHub masks by default; GitLab requires "Mask variable" checkbox)
- Scope secrets to specific environments (production, staging)
- Use OIDC federation instead of long-lived access keys where possible
- Audit CI/CD variable access regularly
- Rotate CI/CD secrets after any team member departure

### 3.7 Runtime Secret Loading — Secure Config Pattern

**TypeScript (Node.js):**
```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

interface AppSecrets {
  databaseUrl: string;
  apiKey: string;
  jwtSecret: string;
}

async function loadSecrets(): Promise<AppSecrets> {
  // In production, load from a secret manager
  if (process.env.NODE_ENV === "production") {
    const client = new SecretsManagerClient({ region: "us-east-1" });
    const command = new GetSecretValueCommand({ SecretId: "prod/app/config" });
    const response = await client.send(command);
    const parsed = JSON.parse(response.SecretString!);
    return {
      databaseUrl: parsed.database_url,
      apiKey: parsed.api_key,
      jwtSecret: parsed.jwt_secret,
    };
  }

  // In development, load from environment variables (sourced from .env locally)
  const required = ["DATABASE_URL", "API_KEY", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return {
    databaseUrl: process.env.DATABASE_URL!,
    apiKey: process.env.API_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
  };
}

// Load once at startup, pass via dependency injection — never as globals
const secrets = await loadSecrets();
```

**Python:**
```python
import os
import json
from dataclasses import dataclass
from functools import lru_cache

import boto3


@dataclass(frozen=True)
class AppSecrets:
    database_url: str
    api_key: str
    jwt_secret: str


@lru_cache(maxsize=1)
def load_secrets() -> AppSecrets:
    """Load secrets from AWS Secrets Manager in production, env vars in dev."""
    if os.getenv("ENV") == "production":
        client = boto3.client("secretsmanager", region_name="us-east-1")
        response = client.get_secret_value(SecretId="prod/app/config")
        data = json.loads(response["SecretString"])
        return AppSecrets(
            database_url=data["database_url"],
            api_key=data["api_key"],
            jwt_secret=data["jwt_secret"],
        )

    # Development: require explicit env vars
    required = ["DATABASE_URL", "API_KEY", "JWT_SECRET"]
    missing = [k for k in required if k not in os.environ]
    if missing:
        raise EnvironmentError(f"Missing required env vars: {', '.join(missing)}")

    return AppSecrets(
        database_url=os.environ["DATABASE_URL"],
        api_key=os.environ["API_KEY"],
        jwt_secret=os.environ["JWT_SECRET"],
    )
```

---

## 4. Vulnerability Catalog

### 4.1 CWE-798: Use of Hard-coded Credentials

**Severity:** Critical | **CVSS:** 9.8 | **OWASP:** A07:2021 (Identification & Auth Failures)

Embedding passwords, API keys, or cryptographic keys directly in source code.

```typescript
// VULNERABLE: Hardcoded API key
const stripe = new Stripe("REDACTED_STRIPE_KEY");

// SECURE: Loaded from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

### 4.2 CWE-312: Cleartext Storage of Sensitive Information

**Severity:** High | **CVSS:** 7.5

Storing secrets in plaintext config files, databases, or shared storage.

```yaml
# VULNERABLE: Plaintext in docker-compose.yml committed to git
services:
  db:
    environment:
      POSTGRES_PASSWORD: "SuperSecret123!"

# SECURE: Reference external secret or env file not in VCS
services:
  db:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    env_file:
      - .env  # .env is in .gitignore
```

### 4.3 CWE-532: Insertion of Sensitive Information into Log File

**Severity:** High | **CVSS:** 7.5

Logging secrets in application logs, error messages, or debug output.

```python
# VULNERABLE: Logging the full connection string including password
logger.info(f"Connecting to database: {database_url}")
logger.error(f"Auth failed with token: {api_token}")

# SECURE: Redact sensitive values before logging
def redact_url(url: str) -> str:
    """Replace password in connection string with ***."""
    from urllib.parse import urlparse, urlunparse
    parsed = urlparse(url)
    if parsed.password:
        replaced = parsed._replace(
            netloc=f"{parsed.username}:***@{parsed.hostname}:{parsed.port}"
        )
        return urlunparse(replaced)
    return url

logger.info(f"Connecting to database: {redact_url(database_url)}")
```

### 4.4 CWE-311: Missing Encryption of Sensitive Data

**Severity:** High | **CVSS:** 7.5

Secrets transmitted or stored without encryption.

### 4.5 CWE-522: Insufficiently Protected Credentials

**Severity:** High | **CVSS:** 7.5

Using weak encryption, reversible encoding (base64), or insufficient access controls
for credential storage.

```yaml
# VULNERABLE: Kubernetes Secret — base64 is NOT encryption
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
type: Opaque
data:
  # echo -n "admin" | base64 → easily reversible
  password: YWRtaW4=

# SECURE: Use External Secrets Operator with encrypted backend
# (see Section 3.5 for ESO example)
```

### 4.6 CWE-209: Generation of Error Message Containing Sensitive Information

**Severity:** Medium | **CVSS:** 5.3

Stack traces or error responses that expose secrets, connection strings, or internal paths.

### 4.7 Secrets in Docker Image Layers

```dockerfile
# VULNERABLE: Secret persists in image layer history even if deleted later
COPY .env /app/.env
RUN source /app/.env && ./setup.sh
RUN rm /app/.env  # Still recoverable via `docker history`

# ALSO VULNERABLE: Build arg persists in image metadata
ARG DATABASE_PASSWORD
ENV DB_PASS=$DATABASE_PASSWORD

# SECURE: Use Docker BuildKit secrets (never persisted in layers)
RUN --mount=type=secret,id=db_pass \
    DB_PASS=$(cat /run/secrets/db_pass) ./setup.sh
```

### 4.8 Secrets in URL Parameters

```
# VULNERABLE: Token in URL — logged by proxies, browsers, CDNs, analytics
https://api.example.com/data?api_key=sk_live_abc123&user=admin

# SECURE: Token in Authorization header
GET /data HTTP/1.1
Host: api.example.com
Authorization: Bearer sk_live_abc123
```

### 4.9 JWT Secret Weakness

```typescript
// VULNERABLE: Weak, guessable JWT secret
const token = jwt.sign(payload, "secret");
const token2 = jwt.sign(payload, "password123");

// SECURE: Strong random secret, minimum 256 bits
import { randomBytes } from "crypto";
const JWT_SECRET = process.env.JWT_SECRET; // 64+ char random string
// Generated via: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
```

### 4.10 Shared Service Account Anti-Pattern

Using a single set of credentials across multiple services or teams makes it impossible
to audit who accessed what, prevents scoped rotation, and means one compromise affects
all consumers. Each service should have its own credential with minimum required permissions.

---

## 5. Security Checklist

Use this checklist for every project, PR review, and security audit.

### Prevention (Pre-commit)
- [ ] Pre-commit secret scanning hook is installed and active (detect-secrets or gitleaks)
- [ ] `.gitignore` covers `.env`, `*.pem`, `*.key`, credentials files, tfstate
- [ ] `.env.example` exists with placeholder values (no real secrets)
- [ ] No secrets in `docker-compose.yml`, `Dockerfile`, or Kubernetes manifests committed to VCS
- [ ] No API keys or tokens in client-side JavaScript, mobile app bundles, or HTML

### Storage
- [ ] All production secrets stored in a dedicated secret manager (Vault, AWS SM, GCP SM)
- [ ] Secrets encrypted at rest with AES-256 or equivalent
- [ ] No secrets in environment variables of container orchestration definitions committed to VCS
- [ ] Kubernetes Secrets encrypted at rest in etcd
- [ ] No secrets in Terraform state stored in plaintext (use encrypted S3 backend)

### Access Control
- [ ] Each service has its own credentials (no shared service accounts)
- [ ] Secret access follows least privilege principle
- [ ] RBAC configured on secret manager — developers cannot read production secrets
- [ ] Multi-factor authentication required for secret manager admin access
- [ ] Break-glass procedure documented for emergency secret access

### Rotation
- [ ] Automated rotation schedule defined (90 days maximum, 30 days for high-privilege)
- [ ] Rotation tested in staging before production
- [ ] Rotation does not cause downtime (dual-credential overlap period)
- [ ] Rotation events logged and alerted

### Monitoring & Response
- [ ] Secret access logs enabled and forwarded to SIEM
- [ ] Alerts configured for anomalous secret access (unusual time, IP, volume)
- [ ] CI/CD pipeline includes secret scanning step
- [ ] Incident response playbook for leaked secrets exists and is tested
- [ ] GitHub secret scanning and push protection enabled on all repositories

### Code Review
- [ ] PR reviews include explicit check for hardcoded secrets
- [ ] Logging does not output secrets (redaction filters in place)
- [ ] Error messages do not include credentials or connection strings
- [ ] Test fixtures use fake/generated secrets, never production values

---

## 6. Tools & Automation

### 6.1 Pre-commit Hooks

**detect-secrets (Yelp)**
```bash
# Install
pip install detect-secrets

# Generate baseline (marks existing secrets as known)
detect-secrets scan > .secrets.baseline

# Install pre-commit hook
# In .pre-commit-config.yaml:
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

**git-secrets (AWS Labs)**
```bash
# Install
brew install git-secrets  # macOS
# or: git clone https://github.com/awslabs/git-secrets && cd git-secrets && make install

# Register AWS patterns
git secrets --register-aws

# Install hooks for current repo
git secrets --install

# Add custom patterns
git secrets --add 'PRIVATE_KEY'
git secrets --add --allowed 'EXAMPLE_KEY'
```

**Gitleaks**
```bash
# Install
brew install gitleaks  # macOS

# Scan current repo
gitleaks detect --source . --verbose

# Scan specific commit range
gitleaks detect --source . --log-opts="HEAD~10..HEAD"

# Pre-commit hook (.pre-commit-config.yaml)
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks
```

### 6.2 CI/CD Secret Scanning

**TruffleHog**
```bash
# Install
brew install trufflehog  # macOS

# Scan a repository (includes Git history)
trufflehog git file://. --only-verified

# Scan a GitHub org
trufflehog github --org=mycompany --only-verified

# Scan Docker images
trufflehog docker --image=myapp:latest

# Scan S3 buckets
trufflehog s3 --bucket=my-bucket

# GitHub Action
# .github/workflows/secrets-scan.yml
name: Secret Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

**GitHub Secret Scanning (Native)**
- Automatically scans all pushes for known secret patterns
- Supports 200+ secret types from partner providers
- Push protection blocks commits containing detected secrets before they reach the repo
- Available free for public repos; requires GitHub Advanced Security for private repos
- 75% precision score (true positive rate)

**Semgrep Secrets Rules**
```bash
# Scan for hardcoded secrets using Semgrep
semgrep --config "p/secrets" .

# Key rules include:
# - generic.secrets.security.detected-generic-secret
# - javascript.express.security.hardcoded-secret
# - python.django.security.hardcoded-secret-key
```

### 6.3 Tool Comparison Matrix

| Tool            | Pre-commit | CI/CD | Git History | Docker | Verified | Language   |
|-----------------|:----------:|:-----:|:-----------:|:------:|:--------:|------------|
| detect-secrets  | Yes        | Yes   | No          | No     | No       | Python     |
| git-secrets     | Yes        | Yes   | No          | No     | No       | Bash       |
| Gitleaks        | Yes        | Yes   | Yes         | No     | No       | Go         |
| TruffleHog      | Yes        | Yes   | Yes         | Yes    | Yes      | Go         |
| GitHub Scanning | No (push)  | Yes   | Yes         | No     | Yes      | Integrated |
| Semgrep         | Yes        | Yes   | No          | No     | No       | Multi      |
| Talisman        | Yes        | Yes   | Yes         | No     | No       | Go         |
| GitGuardian     | Yes        | Yes   | Yes         | Yes    | Yes      | SaaS       |

### 6.4 Talisman (ThoughtWorks)

```bash
# Install as pre-push hook
curl --silent \
  https://raw.githubusercontent.com/thoughtworks/talisman/main/global_install_scripts/install.bash \
  > /tmp/install_talisman.bash && /bin/bash /tmp/install_talisman.bash

# Configure exceptions in .talismanrc
fileignoreconfig:
  - filename: testdata/fake-key.pem
    checksum: abc123def456
```

---

## 7. Platform-Specific Guidance

### 7.1 Web Applications

**Server-side secrets:**
- Load from environment variables or secret manager at startup
- Never bundle server secrets into client-side JavaScript
- Use server-side API routes to proxy calls requiring secret keys
- Framework-specific patterns:
  - Next.js: only `NEXT_PUBLIC_*` vars are client-exposed; all others are server-only
  - Vite: only `VITE_*` vars are embedded in the client bundle
  - Create React App: only `REACT_APP_*` vars are client-exposed

**Client-side secrets (there are none):**
- Any value shipped to the browser is public. Period.
- Use backend proxies for third-party API calls requiring keys
- Use restricted/publishable keys for client-side SDKs (e.g., Stripe publishable key)
- Never embed admin or server-level API keys in frontend code

**.env handling for web projects:**
```
.env                # Shared defaults (NO secrets) — committed
.env.local          # Local overrides with secrets — .gitignore'd
.env.development    # Dev defaults (NO secrets) — committed
.env.production     # Prod defaults (NO secrets) — committed
.env.*.local        # Local overrides — .gitignore'd
```

### 7.2 Mobile Applications

**Critical principle:** Mobile apps are distributed binaries that can be decompiled.
Every string literal, embedded key, or bundled config file is extractable.

- Never embed API secrets in the app binary
- Use platform-specific secure storage:
  - iOS: Keychain Services (`kSecClassGenericPassword`)
  - Android: Android Keystore + EncryptedSharedPreferences
- Fetch secrets from a secure backend at runtime over TLS
- Use certificate pinning to prevent MITM attacks on secret retrieval
- Implement app attestation (Apple App Attest, Google Play Integrity) to verify
  that the requesting client is a legitimate build
- Obfuscation (ProGuard/R8) slows but does not prevent extraction

### 7.3 CI/CD Pipelines

**GitHub Actions:**
- Store secrets in repository or organization settings (Settings > Secrets and variables)
- Use environment-scoped secrets for production deployments
- Use OIDC to assume cloud IAM roles instead of storing long-lived access keys:
  ```yaml
  permissions:
    id-token: write
  steps:
    - uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::123456789:role/deploy
        aws-region: us-east-1
  ```
- Review Actions workflow permissions — minimize `GITHUB_TOKEN` scope
- Never use `${{ secrets.* }}` in `if:` conditions (value is masked but the comparison leaks info)

**GitLab CI:**
- Set variables as "Protected" (only available on protected branches/tags)
- Set variables as "Masked" (redacted in job logs)
- Use file-type variables for multi-line secrets (certificates, keys)
- Scope variables to specific environments

**General CI/CD rules:**
- Audit which workflows and jobs have access to which secrets
- Rotate secrets after team member departures
- Use short-lived, scoped tokens over long-lived keys
- Never store secrets in pipeline definition files committed to the repository

### 7.4 Cloud Infrastructure

**IAM Roles vs. Access Keys:**

| Approach            | Security | Rotation | Risk                            |
|---------------------|----------|----------|---------------------------------|
| Long-lived keys     | Low      | Manual   | Key leak = persistent access    |
| Short-lived tokens  | Medium   | Auto     | Token theft window limited      |
| IAM roles (EC2/ECS) | High     | Auto     | No keys to leak                 |
| OIDC federation     | High     | Auto     | No keys to leak, cross-cloud    |
| Workload identity   | High     | Auto     | Native cloud identity, no keys  |

**AWS best practices:**
- Use IAM roles for EC2, ECS, Lambda — never embed access keys
- Use OIDC federation for CI/CD (GitHub Actions, GitLab CI)
- Enable AWS CloudTrail for API key usage auditing
- Use Service Control Policies (SCPs) to prevent key creation in production accounts
- Use AWS Secrets Manager with automated rotation for RDS credentials

**GCP best practices:**
- Use Workload Identity for GKE pods — no service account key files
- Use Workload Identity Federation for external CI/CD — no key files
- Restrict service account key creation via Organization Policy
- Use Secret Manager with IAM conditions (time-based, IP-based access)

---

## 8. Incident Patterns

### 8.1 Leaked Credential Detection

Indicators that a secret has been compromised:

- Secret scanning tool alert (GitHub, GitGuardian, TruffleHog)
- Unexpected API usage spikes or requests from unknown IPs
- Cloud provider notification (AWS emails about exposed keys)
- Bug bounty report or external researcher disclosure
- Anomalous authentication patterns in logs
- Unexpected resource creation in cloud accounts (crypto mining)

### 8.2 Incident Response Playbook

**Phase 1: Immediate Response (0-15 minutes)**
1. **Rotate the compromised secret immediately** — do not wait for investigation
2. Revoke the old credential entirely (do not just create a new one)
3. Verify that dependent services switch to the new credential
4. If an access key: disable the key first, then delete after confirming no breakage

**Phase 2: Assess Blast Radius (15-60 minutes)**
1. Determine when the secret was first exposed (git log, file timestamps)
2. Identify what the secret grants access to (scope, permissions, resources)
3. Audit access logs for the compromised credential:
   - Cloud provider API logs (CloudTrail, GCP Audit Logs, Azure Activity Log)
   - Application access logs
   - Secret manager audit logs
4. Check for lateral movement: did the attacker use initial access to obtain more secrets?
5. Identify all systems, data stores, and services accessible via the compromised credential

**Phase 3: Containment & Eradication (1-4 hours)**
1. Remove the secret from the source where it was leaked (Git history, Docker image, logs)
2. For Git: use `git filter-repo` or BFG Repo Cleaner to purge from history — then
   force push and notify all contributors to re-clone
3. For Docker images: rebuild without the secret, re-push, delete compromised tags
4. Rotate all other secrets that were stored alongside the compromised one
5. If data access is confirmed: begin data breach notification process

**Phase 4: Prevention of Re-occurrence (1-7 days)**
1. Install pre-commit hooks if not already present
2. Enable push protection on the repository
3. Add the secret pattern to CI/CD scanning rules
4. Review and tighten secret access policies
5. Conduct a team retrospective on how the leak occurred
6. Update documentation and runbooks

### 8.3 Git History Purging

```bash
# Option 1: BFG Repo Cleaner (recommended — faster, simpler)
# Install: brew install bfg
bfg --replace-text passwords.txt repo.git
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: git filter-repo (more flexible)
# Install: pip install git-filter-repo
git filter-repo --invert-paths --path secrets.env
git filter-repo --blob-callback '
    if b"sk_live_" in blob.data:
        blob.data = blob.data.replace(b"sk_live_XXXX", b"REDACTED")
'
```

**After purging history:**
- Force push all branches and tags
- Notify all contributors to delete their local clones and re-clone
- Invalidate GitHub/GitLab caches
- The secret must still be rotated — purging history does not un-expose a secret

---

## 9. Compliance & Standards

### 9.1 OWASP

**Secrets Management Cheat Sheet** — Covers the full lifecycle:
- Secret generation with cryptographic strength
- Centralized storage with access controls
- Secret transmission via secure channels
- Metadata tracking (who created, rotated, consumed, deleted)
- Preference for passwordless authentication (OIDC) where possible

**OWASP Top 10 (2021):**
- **A02: Cryptographic Failures** — Includes exposure of secrets, weak key management
- **A07: Identification & Authentication Failures** — Includes hardcoded credentials

**OWASP SAMM (Software Assurance Maturity Model):**
- Implementation > Secure Deployment > Stream B: Secret Management
- Maturity levels from ad-hoc to automated secret lifecycle management

### 9.2 NIST

**NIST SP 800-57: Recommendation for Key Management**
- Key lifecycle: generation, registration, storage, distribution, use, rotation, destruction
- Minimum key lengths: AES-128 for symmetric, RSA-2048/EC-P256 for asymmetric
- Crypto periods: maximum time a key should remain active before rotation
- Key separation: different keys for different purposes (encryption, signing, authentication)

**NIST SP 800-53 (Rev. 5): Security and Privacy Controls**
- IA-5: Authenticator Management — proper handling of passwords, keys, tokens
- SC-12: Cryptographic Key Establishment and Management
- SC-28: Protection of Information at Rest — secrets encrypted at rest

### 9.3 SOC 2

SOC 2 Type II — Trust Services Criteria relevant to secrets:

- **CC6.1**: Logical access security — restrict access to secrets based on role
- **CC6.6**: Restrict external access — secrets not exposed to unauthorized parties
- **CC6.7**: Restrict data movement — secrets not transmitted insecurely
- **CC7.1**: Detect and respond to security events — monitoring for secret misuse
- **CC8.1**: Change management — secrets rotation is a controlled change

Key requirements:
- Encryption of secrets at rest and in transit
- Access logging for all secret operations
- Regular access reviews for secret management systems
- Documented secret rotation procedures

### 9.4 PCI-DSS v4.0.1

Requirements relevant to secrets and key management:

- **Req 3.6**: Cryptographic keys used to protect stored account data are secured
- **Req 3.7**: Cryptographic keys used to protect stored account data are managed
  - 3.7.1: Key management policies and procedures
  - 3.7.2: Secure key distribution
  - 3.7.4: Key changes for keys past their cryptoperiod
  - 3.7.5: Retirement/replacement of keys when integrity is weakened
  - 3.7.6: Split knowledge and dual control for manual key operations
- **Req 8.3**: Strong authentication for users and administrators
  - 8.3.6: Minimum password complexity (12 characters for application/system accounts)
- **Req 8.6**: Application and system account credentials managed securely
  - 8.6.1: Interactive logins by system accounts are managed on an exception basis
  - 8.6.3: Passwords for application/system accounts changed periodically and on suspicion of compromise
- Hashes must be keyed (HMAC) — plain hashing of credentials is insufficient

---

## 10. Code Examples — Vulnerable vs. Secure Pairs

### 10.1 Configuration Loading

```typescript
// ---- VULNERABLE ----
// Hardcoded credentials in source code
const config = {
  db: {
    host: "prod-db.example.com",
    user: "admin",
    password: "P@ssw0rd!2024",
  },
  stripe: {
    secretKey: "REDACTED_STRIPE_KEY",
  },
  jwt: {
    secret: "my-jwt-secret",
  },
};

// ---- SECURE ----
// Configuration loaded from environment with validation
import { z } from "zod";

const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  JWT_SECRET: z.string().min(64, "JWT secret must be at least 64 characters"),
  NODE_ENV: z.enum(["development", "staging", "production"]),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    // Log WHICH vars are missing, never their VALUES
    const missing = result.error.issues.map((i) => i.path.join("."));
    throw new Error(`Invalid configuration. Missing/invalid: ${missing.join(", ")}`);
  }
  return result.data;
}

export const config = loadConfig();
```

### 10.2 Pre-commit Hook Setup — Complete

```bash
#!/usr/bin/env bash
# setup-secret-scanning.sh — Installs pre-commit hooks for secret detection

set -euo pipefail

echo "Installing pre-commit framework..."
pip install pre-commit

echo "Installing gitleaks..."
brew install gitleaks 2>/dev/null || go install github.com/gitleaks/gitleaks/v8@latest

# Create .pre-commit-config.yaml if it doesn't exist
cat > .pre-commit-config.yaml << 'YAML'
repos:
  # Gitleaks — fast regex and entropy-based detection
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks

  # detect-secrets — baseline-aware, lower false positives
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  # Check for large files that might contain secrets
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: check-added-large-files
        args: ['--maxkb=500']
      - id: detect-private-key
YAML

# Generate detect-secrets baseline
echo "Generating detect-secrets baseline..."
detect-secrets scan > .secrets.baseline

# Install the hooks
echo "Installing pre-commit hooks..."
pre-commit install

echo "Running initial scan..."
pre-commit run --all-files || true

echo "Secret scanning hooks installed successfully."
echo "Commits will now be checked for secrets automatically."
```

### 10.3 Logging with Secret Redaction

```typescript
// ---- VULNERABLE ----
app.use((req, res, next) => {
  // Logs full headers including Authorization tokens
  console.log(`${req.method} ${req.url}`, req.headers);
  next();
});

// ---- SECURE ----
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "proxy-authorization",
]);

const SENSITIVE_PATTERNS = [
  /(?:password|secret|token|key|credential)=([^&\s]+)/gi,
  /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g,
  /sk_live_[A-Za-z0-9]+/g,
  /AKIA[0-9A-Z]{16}/g,  // AWS Access Key ID
];

function redactSensitive(value: string): string {
  let redacted = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

function safeHeaders(headers: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    safe[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
      ? "[REDACTED]"
      : redactSensitive(value);
  }
  return safe;
}

app.use((req, res, next) => {
  console.log(`${req.method} ${redactSensitive(req.url)}`, safeHeaders(req.headers));
  next();
});
```

### 10.4 Docker Secrets — BuildKit Pattern

```dockerfile
# ---- VULNERABLE Dockerfile ----
FROM node:20-alpine
COPY .env /app/.env
# Secret is now baked into image layer forever
RUN source /app/.env && npm run build
RUN rm /app/.env  # Useless: layer still contains .env

# ---- SECURE Dockerfile ----
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
# Secret is mounted at build time, never persisted in any layer
RUN --mount=type=secret,id=env_file \
    cp /run/secrets/env_file .env && \
    npm run build && \
    rm .env

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# Runtime secrets injected via orchestrator (Docker Swarm / Kubernetes)
CMD ["node", "dist/server.js"]
```

Build command:
```bash
DOCKER_BUILDKIT=1 docker build --secret id=env_file,src=.env -t myapp:latest .
```

---

## References

- [GitHub: 39M Secret Leaks in 2024](https://github.blog/security/application-security/next-evolution-github-advanced-security/)
- [GitGuardian State of Secrets Sprawl 2025](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp 18-Point Secrets Management Checklist](https://www.hashicorp.com/en/blog/the-18-point-secrets-management-checklist)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [Palo Alto Unit 42: Large-Scale .env Extortion](https://unit42.paloaltonetworks.com/large-scale-cloud-extortion-operation/)
- [Toyota GitHub Key Exposure](https://blog.gitguardian.com/toyota-accidently-exposed-a-secret-key-publicly-on-github-for-five-years/)
- [CircleCI January 2023 Incident Report](https://circleci.com/blog/jan-4-2023-incident-report/)
- [Uber 2016 Breach Timeline](https://www.techtarget.com/searchsecurity/news/252488361/The-Uber-data-breach-cover-up-A-timeline-of-events)
- [Samsung Lapsus$ Breach Analysis](https://www.gitguardian.com/videos/analyzing-the-samsung-hack-thousands-of-credentials-secrets-exposed)
- [AWS .env Credential Theft](https://www.csoonline.com/article/3488207/aws-environments-compromised-through-exposed-env-files.html)
- [Kubernetes Secrets Good Practices](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [External Secrets Operator Security](https://external-secrets.io/latest/guides/security-best-practices/)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [detect-secrets](https://github.com/Yelp/detect-secrets)
