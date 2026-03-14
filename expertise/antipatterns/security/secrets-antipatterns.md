# Secrets Management Anti-Patterns

> **Domain:** Security
> **Severity:** Critical -- secrets mismanagement is the root cause of 22% of all data breaches (Verizon DBIR 2025).
> **Last updated:** 2026-03-08
> **Applies to:** All languages, frameworks, platforms, CI/CD pipelines, and cloud environments.

---

## Why This Matters

In 2024 alone, GitHub detected over 39 million leaked secrets across its repositories. Only 2.6%
of exposed secrets are revoked within the first hour, while 91.6% remain valid after five days.
The average credential breach costs organizations $4.88 million (IBM 2024). Every anti-pattern
in this module has been exploited in real-world breaches -- from Uber losing 57 million user
records to a single leaked API key compromising the U.S. Treasury Department.

---

## Anti-Patterns

### AP-01: Hardcoded Credentials in Source Code

**What it looks like:**
```python
# Embedded directly in application code
db_password = "super_secret_p@ssw0rd"
aws_access_key = "AKIAIOSFODNN7EXAMPLE"
api_key = "sk-proj-abc123def456ghi789"
```

**Why it happens:** Developers hardcode credentials during prototyping and forget to remove them,
or believe that private repositories are safe enough.

**Why it is dangerous:** Source code is copied, forked, shared, backed up, and decompiled. A
single `git push` to a public repo exposes the secret to automated scanners that detect leaked
keys within minutes. Even in private repos, every developer with read access has every secret.

**Real-world incident:** In 2016, attackers found AWS access keys hardcoded in a private GitHub
repository belonging to an Uber engineer. They used the credentials to access an S3 bucket
containing data on 57 million users and 600,000 driver license numbers. Uber paid the attackers
$100,000 to delete the data, then concealed the breach for over a year. The eventual disclosure
led to a $148 million settlement with all 50 U.S. states, and former CSO Joe Sullivan was
convicted of obstruction of justice.

**Fix:** Use environment variables or a secrets manager (HashiCorp Vault, AWS Secrets Manager,
Doppler). Never pass secrets as constructor arguments or string literals. Run pre-commit hooks
with tools like `gitleaks` or `git-secrets` to block commits containing high-entropy strings or
known key patterns.

---

### AP-02: Committing .env Files to Version Control

**What it looks like:**
```
# .env checked into the repo
DATABASE_URL=postgres://admin:password123@prod-db:5432/myapp
STRIPE_SECRET_KEY=sk_live_abcdef123456
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
```

**Why it happens:** Developers add `.env` for local development convenience and forget to
add it to `.gitignore` before the first commit, or the `.gitignore` entry is misspelled.

**Why it is dangerous:** `.env` files are designed to hold secrets. Once committed, the file
exists in git history forever (see AP-03). Even if removed in a subsequent commit, every clone
of the repository contains the full history.

**Real-world incident:** In 2024, attackers executed a large-scale extortion campaign by scanning
26.8 million IP addresses for publicly exposed `.env` files. They harvested 1,185 AWS access
keys, 333 PayPal OAuth tokens, and 235 GitHub tokens from these files. The compromised AWS
infrastructure was used to encrypt S3 buckets for ransom.

**Fix:** Add `.env` to `.gitignore` before `git init`. Provide a `.env.example` with placeholder
values and no real secrets. Use a secrets manager for team-shared configuration. Run CI checks
that fail the build if `.env` is detected in the repository tree.

---

### AP-03: Secrets Persisting in Git History

**What it looks like:**
```bash
# Developer realizes the mistake and removes the secret
git rm .env
git commit -m "Remove .env file"
# But the secret is still in the previous commit
git log --all --full-history -- .env  # Shows the commit that added it
git show <commit-hash>:.env           # Reveals the secret in full
```

**Why it happens:** Developers assume that deleting a file or overwriting a value removes it.
Git is an append-only data structure by design -- every committed byte is preserved in history.

**Why it is dangerous:** Automated tools like TruffleHog and GitLeaks scan entire repository
histories, not just HEAD. Attackers know this. A secret that was "removed" three years ago is
just as exploitable as one committed today.

**Real-world incident:** Toyota's T-Connect access key was committed to a public GitHub
repository by a subcontractor in December 2017 and went undetected for nearly five years until
September 2022. Even though the code was eventually updated, the key remained in git history,
potentially compromising 296,019 customer records including email addresses and customer IDs.

**Fix:** If a secret is committed, treat it as compromised immediately. Rotate the secret first,
then clean history with `git filter-repo` or BFG Repo Cleaner. Force-push the cleaned history
and notify all collaborators to re-clone. Never rely on history rewriting alone -- the secret
may already be in forks, CI caches, or attacker databases.

---

### AP-04: Sharing Secrets via Slack, Email, or Chat

**What it looks like:**
```
[Slack DM]
@alice: Hey, what's the prod database password?
@bob: It's Pr0d_DB_2024!  Don't share it with anyone else.
```

**Why it happens:** It is the path of least resistance. Developers need a credential now, and
messaging a colleague is faster than setting up a secrets manager.

**Why it is dangerous:** Chat messages are stored on third-party servers, indexed, searchable,
backed up, and retained for years in enterprise plans. A breach of the collaboration platform
exposes every secret ever shared. Slack's own 2024 breach involved leaked employee credentials
that granted attackers access to sensitive corporate data.

**Real-world incident:** GitGuardian research found that 6.1% of Jira tickets and 2.4% of
Slack channels in enterprise environments contain at least one valid secret. These secrets are
rarely rotated because teams forget they were shared this way. Slack messages from five years
ago still contain live production credentials.

**Fix:** Use a secrets manager with short-lived, scoped access tokens. If a secret must be
shared one-time, use a self-destructing link service (e.g., Vault's cubbyhole, 1Password
share links, or `onetimesecret.com`). Establish a policy: any secret shared in plaintext must
be rotated immediately.

---

### AP-05: Reusing the Same Secret Across Environments

**What it looks like:**
```yaml
# config.yaml used in dev, staging, AND production
database:
  host: "${DB_HOST}"
  password: "the-same-password-everywhere"
stripe:
  api_key: "sk_live_same_key_in_all_envs"
```

**Why it happens:** Using one set of credentials is simpler to manage. Teams avoid the overhead
of provisioning environment-specific secrets.

**Why it is dangerous:** A compromise of the least-secured environment (typically development or
staging) immediately grants access to production. There is no blast radius containment. Exposed
secrets account for nearly 30% of all data breaches, and reuse across environments multiplies
the impact of every single leak.

**Real-world incident:** In 2023, New Relic disclosed unauthorized access to their staging
environment that allowed attackers to execute queries and exfiltrate customer data. The lateral
movement was possible because environment boundaries were insufficiently isolated.

**Fix:** Provision unique credentials per environment. Use naming conventions that make
environment obvious (`prod-db-readonly`, `staging-api-writer`). Configure secrets managers to
enforce environment scoping. Never allow dev/staging credentials to have any access to
production resources.

---

### AP-06: Never Rotating Secrets or Keys

**What it looks like:**
```
# API key created 3 years ago, never changed
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE    # Created: 2023-01-15
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG  # Last rotated: never
```

**Why it happens:** Rotation is disruptive. It requires coordinated updates across all services
that use the credential. Without automation, teams avoid it.

**Why it is dangerous:** The longer a secret lives, the larger the window for compromise. Industry
research shows the average lifespan of unrotated secrets exceeds 600 days, and 71% of
organizations fail to rotate secrets within recommended intervals. An attacker who obtains a
never-rotated key has indefinite access.

**Real-world incident:** In November 2023, Cloudflare's internal Atlassian server was breached
by suspected nation-state hackers. The attackers used an access token and three service account
credentials that were compromised in an earlier Okta breach but had not been rotated. Cloudflare
believed the credentials were not in active use. The oversight led to a 10-day intrusion.
Remediation required rotating all 5,000 production credentials, segmenting systems, and
rebooting every company system.

**Fix:** Implement automated rotation via your secrets manager (AWS Secrets Manager, Vault
dynamic secrets, Google Cloud Secret Manager). Set maximum credential lifetimes (90 days for
long-lived, 1 hour for dynamic). Alert on credentials that exceed their rotation window. Prefer
short-lived tokens (OAuth2, STS AssumeRole) over static keys.

---

### AP-07: Storing Secrets in Plaintext Configuration Files

**What it looks like:**
```xml
<!-- application-config.xml deployed to every server -->
<database>
  <username>admin</username>
  <password>Welcome123!</password>
  <connection-string>jdbc:mysql://prod-db:3306/app</connection-string>
</database>
```

**Why it happens:** Configuration files are a natural place for settings. Developers extend
this pattern to secrets without realizing these files are copied to build artifacts, logged by
deployment tools, and backed up without encryption.

**Why it is dangerous:** Plaintext config files end up in Docker images (see AP-08), deployment
artifacts, CI caches, and backup archives. Anyone with filesystem access -- including lower-
privileged service accounts, container escape exploits, or backup restore access -- can read
every secret.

**Real-world incident:** The 2021 Twitch breach (125GB data leak) revealed that credentials,
API keys, and configuration secrets were stored in plaintext across thousands of internal Git
repositories. The server misconfiguration that exposed the data would have had far less impact
if secrets had been stored in a vault rather than plaintext files.

**Fix:** Store only references in config files (e.g., `password: ${vault:secret/db/password}`).
Inject secrets at runtime from a secrets manager. Encrypt configuration files at rest if they
must contain sensitive values. Never deploy config files containing production secrets to
source control or artifact repositories.

---

### AP-08: Secrets Baked into Docker Images and Layers

**What it looks like:**
```dockerfile
# Secrets embedded in the image -- they persist in every layer
FROM node:18
ENV DATABASE_URL=postgres://admin:secret@db:5432/app
COPY .env /app/.env
RUN echo "API_KEY=sk-live-abc123" >> /app/config
# Even if you delete later, the layer with the secret still exists
RUN rm /app/.env
```

**Why it happens:** Developers treat Dockerfiles like shell scripts, copying in `.env` files or
setting secrets as ENV directives. The layered filesystem architecture of Docker means that
every instruction creates a permanent, extractable layer.

**Why it is dangerous:** Docker images are pushed to registries (Docker Hub, ECR, GCR) and shared
across teams and environments. Any user with pull access can inspect every layer with
`docker history` or `docker save` and extract secrets that were "deleted" in later layers.

**Real-world incident:** In November 2025, security researchers at Flare discovered that 10,456
Docker Hub images exposed one or more secrets, including live API keys, cloud access tokens, and
CI/CD credentials. 42% of the affected images contained five or more secrets each. The exposure
impacted over 100 organizations, including a Fortune 500 company and a major national bank.
Nearly 4,000 AI model API keys were among the leaked credentials.

**Fix:** Never `COPY` `.env` files or set secrets via `ENV` in Dockerfiles. Use Docker BuildKit
secrets (`--mount=type=secret`) for build-time secrets. Inject runtime secrets via environment
variables from orchestrators (Kubernetes Secrets, ECS task definitions) or sidecar vault agents.
Use multi-stage builds to ensure build-time dependencies do not leak into the final image.

---

### AP-09: Secrets Exposed in CI/CD Logs

**What it looks like:**
```yaml
# GitHub Actions workflow
steps:
  - name: Deploy
    run: |
      echo "Deploying with key: ${{ secrets.API_KEY }}"
      curl -H "Authorization: Bearer $API_KEY" https://api.example.com/deploy
      # CI system masks known secrets, but string manipulation breaks masking
      echo $API_KEY | base64  # Outputs the key in base64, unmasked
```

**Why it happens:** Developers debug CI failures by printing environment variables. Build tools
echo commands that include interpolated secrets. CI masking is fragile -- encoding, splitting,
or transforming a secret defeats the mask.

**Why it is dangerous:** CI/CD logs are stored for weeks or months, often with broad read access.
Logs may be shipped to centralized logging systems (ELK, Datadog, Splunk) where retention
policies differ and access controls are more permissive.

**Real-world incident:** Travis CI exposed over 73,000 sensitive tokens -- including signing
keys, API credentials, and access tokens -- through public build logs. A flaw in the Travis CI
API exposed more than 700 million historical clear-text logs, impacting over 900,000 open-source
projects and 600,000 users. Separately, CircleCI's 2023 breach exposed customer environment
variables, keys, and tokens, forcing mass secret rotation across thousands of companies.

**Fix:** Never `echo`, `print`, or log secrets in CI pipelines. Use built-in secret masking and
verify it works by reviewing logs. Avoid piping secrets through transformations that break
masking. Prefer OIDC federation (GitHub Actions OIDC to AWS, GCP) over storing long-lived
credentials in CI. Set aggressive log retention policies and restrict log access.

---

### AP-10: API Keys Embedded in Frontend JavaScript

**What it looks like:**
```javascript
// Bundled into client-side code, visible in browser DevTools
const STRIPE_KEY = "sk_live_abcdef123456";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-secret-key-here",
  authDomain: "myapp.firebaseapp.com",
};
fetch("https://api.openai.com/v1/chat/completions", {
  headers: { "Authorization": `Bearer sk-proj-MY_OPENAI_KEY` }
});
```

**Why it happens:** Frontend developers need to call APIs and embed keys directly in JavaScript
bundles. They confuse publishable keys (safe for client-side) with secret keys (server-only).

**Why it is dangerous:** Client-side JavaScript is fully visible to anyone who opens browser
DevTools, views page source, or intercepts network requests. Minification and obfuscation
provide zero security -- they are trivially reversed. An exposed secret key grants full API
access, potentially allowing data exfiltration, unauthorized charges, or account takeover.

**Real-world incident:** Security researchers discovered a Supabase API key hardcoded in
client-side JavaScript on the Moltbook platform. The key granted unauthenticated read and write
access to the entire production database, exposing 1.5 million API keys belonging to users. A
separate incident involved a Firebase API key hardcoded in frontend code that enabled full
database access, including user deletion capabilities.

**Fix:** Only expose publishable/restricted keys on the client side. Route all secret-key API
calls through a backend proxy or serverless function (AWS Lambda, Cloudflare Workers). Apply
domain restrictions and API key scoping where the provider supports it (e.g., Google Maps API
key restrictions). Never ship OpenAI, Stripe secret, or database keys to the browser.

---

### AP-11: Using Default Passwords in Production

**What it looks like:**
```
# Default credentials left unchanged
admin / admin
root / root
sa / (blank)
postgres / postgres
admin / password
```

**Why it happens:** Default credentials ship with databases, routers, IoT devices, and admin
panels. Teams deploy to production without changing them, assuming internal network placement
is sufficient protection.

**Why it is dangerous:** Default credentials are publicly documented. Automated scanners and
botnets attempt them continuously. A single default password on one device can cascade into a
full network compromise.

**Real-world incident:** In October 2016, the Mirai botnet compromised over 600,000 IoT devices
by scanning the internet for open Telnet ports and attempting only 61 default username/password
combinations. The resulting DDoS attack against DNS provider Dyn exceeded 1 Tbps and took down
GitHub, Twitter, Reddit, Netflix, Airbnb, and many other major services. The attack demonstrated
that factory-default credentials on commodity devices can threaten critical internet
infrastructure.

**Fix:** Change all default credentials before any system reaches a network. Use configuration
management to enforce unique, randomly generated passwords. Implement automated scanning for
default credentials as part of deployment checklists. For IoT, require unique per-device
credentials at manufacturing time.

---

### AP-12: Secrets in URL Parameters and Query Strings

**What it looks like:**
```
https://api.example.com/data?api_key=sk_live_abc123&token=eyJhbGciOi...
https://app.example.com/reset-password?token=secret-reset-token-123
https://webhook.example.com/callback?secret=webhook_signing_key
```

**Why it happens:** REST API conventions and quick integrations often pass tokens as query
parameters. OAuth redirect flows put tokens in URLs. Developers default to GET requests for
simplicity.

**Why it is dangerous:** URLs are logged everywhere: web server access logs, proxy logs, CDN
logs, browser history, browser bookmarks, analytics platforms, and the HTTP `Referer` header
sent to third-party domains when users click outbound links. OWASP classifies this as CWE-598
(Use of GET Request Method With Sensitive Query Strings).

**Fix:** Pass secrets in HTTP headers (`Authorization: Bearer <token>`) or POST request bodies.
Configure web servers to strip sensitive query parameters from access logs. Use short-lived,
single-use tokens for URL-based flows (e.g., password reset links). Never include persistent
API keys in URLs.

---

### AP-13: Operating Without a Secrets Manager

**What it looks like:**
```bash
# "Secrets management" via a shared text file
cat ~/team-secrets.txt
# PROD_DB_PASS=hunter2
# STRIPE_KEY=sk_live_xxx
# AWS_KEY=AKIA...

# Or: secrets scattered across .env files, CI variables, sticky notes
```

**Why it happens:** Teams start small and manage a handful of secrets manually. As the system
grows, the count increases to hundreds, but the process never evolves. The perceived overhead
of a secrets manager seems too high for "just a few keys."

**Why it is dangerous:** Without centralization, there is no audit trail, no rotation automation,
no access control, and no way to respond to a breach quickly. When a secret is compromised, the
team cannot answer: "Where is this secret used? Who has access? When was it last rotated?"

**Real-world incident:** The 2024 large-scale `.env` extortion campaign succeeded because
organizations stored production credentials in flat files on web servers with no centralized
management. Attackers simply scraped thousands of publicly accessible `.env` files containing
AWS keys, payment tokens, and GitHub credentials. Organizations with secrets managers were
able to rotate compromised credentials within minutes; those without spent days in triage.

**Fix:** Adopt a secrets manager appropriate to your scale: HashiCorp Vault, AWS Secrets
Manager, GCP Secret Manager, Azure Key Vault, Doppler, or 1Password Secrets Automation. Even
for small teams, managed services like Doppler or Infisical provide a low-overhead starting
point. Centralization is the prerequisite for rotation, auditing, and access control.

---

### AP-14: Overly Broad Secret Access (Everyone Has Prod Keys)

**What it looks like:**
```
# Every developer, contractor, and CI pipeline uses the same root credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE      # Full admin access
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG  # Shared across 40 engineers
```

**Why it happens:** Principle of least privilege is hard. Creating scoped credentials for each
user and service requires upfront investment. It is faster to share one admin key.

**Why it is dangerous:** If any single developer's machine is compromised, the attacker gets
full production access. There is no way to attribute actions to individuals. Revoking access
for a departing employee means rotating a credential used by 40 people and every CI pipeline.

**Real-world incident:** Mercedes-Benz suffered a breach in September 2023 when researchers
discovered a GitHub token belonging to an employee in a public repository. The token granted
"unrestricted and unmonitored" access to the company's entire internal GitHub Enterprise Server,
exposing database connection strings, cloud access keys, blueprints, design documents, SSO
passwords, API keys, and other critical internal information.

**Fix:** Issue per-user and per-service credentials with minimum required permissions. Use
role-based access control (RBAC) through IAM policies, Vault policies, or Kubernetes RBAC.
Implement break-glass procedures for emergency admin access. Audit who accesses which secrets
and alert on anomalies. Automate credential provisioning for CI pipelines using OIDC federation.

---

### AP-15: Secrets Leaked in Error Messages and Stack Traces

**What it looks like:**
```python
# Unhandled exception exposes connection string in stack trace
try:
    conn = psycopg2.connect("postgresql://admin:S3cretP@ss@prod-db:5432/app")
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    # Stack trace includes the full connection string with password
    raise
```

**Why it is dangerous:** Error messages, stack traces, and debug output are displayed to users
in development mode, shipped to logging platforms, and included in bug reports and issue
trackers. Research shows that 32.4% of secret leaks in issue trackers originate from bug
reports containing logs and stack traces.

**Real-world incidents:** Twitter, Facebook, and Google all had incidents where user passwords
were logged in plaintext due to application errors. Twitter logged unhashed passwords. Facebook
logged tens of millions of unhashed user passwords. Google logged unhashed GSuite passwords.
Ubuntu's server installer logged passwords during installation.

**Fix:** Never interpolate secrets into log messages or error strings. Use structured logging
that explicitly excludes sensitive fields. Sanitize connection strings before logging. Set
production applications to return generic error messages (HTTP 500) without stack traces.
Implement log scrubbing to detect and redact patterns matching known secret formats.

---

### AP-16: No Audit Trail for Secret Access

**What it looks like:**
```
# Secrets stored in flat files or passed around without tracking
# No answers to:
# - Who accessed the production database password last Tuesday?
# - Was the AWS key used from an unusual IP address?
# - When was this secret last read, and by which service?
```

**Why it happens:** Auditing requires infrastructure (centralized logging, SIEM integration) and
ongoing monitoring. Teams prioritize feature delivery and treat security logging as a
nice-to-have.

**Why it is dangerous:** Without audit logs, incident response is blind. You cannot determine
the blast radius of a compromise, who accessed what, or when unauthorized use began. Regulatory
frameworks (SOC 2, PCI-DSS, HIPAA) require demonstrable audit trails for credential access.

**Real-world incident:** In Uber's 2016 breach, the lack of audit trails around GitHub
repository access and AWS credential usage contributed to the company's inability to detect
the breach quickly. The intrusion went undetected for months, and the cover-up was possible in
part because monitoring and attribution were inadequate.

**Fix:** Use a secrets manager that provides native audit logging (Vault audit backend, AWS
CloudTrail for Secrets Manager). Log every secret read, write, and rotation event. Ship audit
logs to a SIEM with alerting on anomalous patterns (new IP, unusual time, bulk reads). Make
secret access logs immutable and separate from the systems they protect.

---

### AP-17: Secrets in Docker Compose and IaC Files Committed to Repos

**What it looks like:**
```yaml
# docker-compose.yml committed to the repository
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: "production_password_123"
  app:
    environment:
      DATABASE_URL: "postgres://admin:production_password_123@db:5432/myapp"
      JWT_SECRET: "my-super-secret-jwt-signing-key"
```

```hcl
# terraform.tfvars committed to the repository
db_password     = "terraform-managed-secret"
api_key         = "sk-live-xxxxxxxxxxxxxxxx"
```

**Why it happens:** Docker Compose and Terraform files are treated as "just configuration" and
committed alongside application code. Developers want reproducible environments and include
all necessary values.

**Why it is dangerous:** These files are committed to version control, cloned by every developer,
and often deployed without modification across environments. Terraform state files can contain
secrets in plaintext even when `.tfvars` is gitignored.

**Fix:** Use `docker compose` with external secret references (`${DB_PASSWORD}` from
environment or `.env` file excluded from git). For Terraform, use `terraform.tfvars` in
`.gitignore` and fetch secrets from a vault at plan/apply time. Encrypt Terraform state with
backend encryption (S3 + KMS, Terraform Cloud). Never hardcode secrets in IaC manifests.

---

### AP-18: Symmetric Encryption with Shared Keys

**What it looks like:**
```python
# Same key used by every service, hardcoded or shared in config
ENCRYPTION_KEY = "ThisIsOurSharedEncryptionKey2024"

def encrypt(data):
    return AES.encrypt(data, ENCRYPTION_KEY)

def decrypt(data):
    return AES.decrypt(data, ENCRYPTION_KEY)
```

**Why it happens:** Symmetric encryption is simpler to implement than asymmetric or envelope
encryption. A single shared key eliminates the complexity of key distribution.

**Why it is dangerous:** If the shared key is compromised, all data encrypted with it is
exposed -- past, present, and future. The key itself becomes a high-value secret that must be
managed with extreme care. Sharing the same key across services means every service is a
potential leak vector.

**Fix:** Use envelope encryption: encrypt data with a data encryption key (DEK), then encrypt
the DEK with a key encryption key (KEK) managed by a KMS (AWS KMS, Google Cloud KMS, Azure
Key Vault). Rotate DEKs frequently. Use asymmetric encryption for cross-service communication.
Never hardcode encryption keys -- load them from a KMS at runtime.

---

### AP-19: Storing Secrets in Browser localStorage

**What it looks like:**
```javascript
// After login, store the token in localStorage
localStorage.setItem("auth_token", "eyJhbGciOiJIUzI1NiIs...");
localStorage.setItem("api_key", "sk-live-abc123");
localStorage.setItem("refresh_token", "rt_xxxxxxxxxxxx");
```

**Why it happens:** localStorage is persistent, easy to use, and survives page refreshes. Many
tutorials and boilerplate projects store JWTs in localStorage by default.

**Why it is dangerous:** Any JavaScript running on the page can read localStorage -- including
injected scripts from XSS vulnerabilities, malicious browser extensions, and compromised
third-party scripts. A single XSS vulnerability enables immediate exfiltration of every stored
secret.

**Real-world incident:** The RustFS Console stored S3 administrative credentials (AccessKey,
SecretKey, SessionToken) in browser localStorage. A stored XSS vulnerability allowed attackers
to steal these credentials by injecting JavaScript that read localStorage and exfiltrated the
tokens to an attacker-controlled server.

**Fix:** Store authentication tokens in HttpOnly, Secure, SameSite cookies that are inaccessible
to JavaScript. If you must use localStorage (e.g., for a token needed by client-side API calls),
minimize token lifetime, use refresh token rotation, and implement robust XSS prevention (CSP
headers, input sanitization, subresource integrity).

---

### AP-20: Environment Variables Visible to Child Processes

**What it looks like:**
```bash
# Parent process sets secrets as environment variables
export DATABASE_URL="postgres://admin:secret@db:5432/app"
export API_KEY="sk-live-xxxx"

# Every child process inherits the full environment
node server.js          # Has DATABASE_URL, API_KEY
./run-migrations.sh     # Has DATABASE_URL, API_KEY
python analytics.py     # Has DATABASE_URL, API_KEY -- but doesn't need them
```

**Why it happens:** Environment variables are the twelve-factor app standard for configuration.
Setting them at the process level is simple, and inheritance to child processes is an operating
system default.

**Why it is dangerous:** Child processes, third-party scripts, crash reporters, and debug tools
inherit the full environment. A compromised or malicious dependency can read `process.env` and
exfiltrate secrets. Core dumps and `/proc/<pid>/environ` on Linux expose environment variables
to any user with read access to the process.

**Fix:** Pass only required secrets to each process. Use `env -i` to launch child processes
with a clean environment. Prefer secret injection at the application level (reading from a
vault client) over environment-level injection. On Kubernetes, use projected volumes or CSI
secret store drivers instead of environment variables. Restrict access to `/proc/*/environ`
via security contexts.

---

## Root Cause Analysis

Secrets management failures stem from a small number of recurring root causes:

### 1. Convenience Over Security
Developers optimize for speed. Hardcoding a key takes 5 seconds; setting up a secrets manager
takes hours. Without organizational mandates and tooling that makes the secure path easy,
convenience wins every time.

### 2. Invisible Attack Surface
Secrets in git history, Docker layers, CI logs, and browser storage are not visible during
normal development. The threat model fails because developers do not see these storage locations
as part of the attack surface.

### 3. Absence of Automation
Manual rotation, manual access provisioning, and manual auditing do not scale. Humans forget.
Processes drift. Automation is the only way to maintain secrets hygiene at scale.

### 4. Lack of Organizational Ownership
When no team owns secrets management, it becomes everyone's problem and no one's responsibility.
Secrets proliferate without governance, and the organization cannot answer basic questions:
"How many secrets do we have? Where are they? Who can access them?"

### 5. Misconception About Private = Secure
Teams treat private repositories, internal networks, and staging environments as trusted zones.
A private repo with 50 collaborators has 50 potential leak vectors. "Private" does not mean
"secure."

### 6. Fear of Rotation
Teams avoid rotation because it is disruptive and error-prone when done manually. This creates
a vicious cycle: the longer secrets live, the more systems depend on them, making rotation
progressively harder and riskier.

---

## Self-Check Questions

Use these questions during code review, architecture review, or security audit to identify
secrets anti-patterns:

### Source Code and Version Control
- [ ] Does `git log --all -p | grep -iE "(password|secret|api_key|token)" ` return results?
- [ ] Is `.env` listed in `.gitignore`? Was it added before the first commit?
- [ ] Are there any hardcoded strings that look like API keys, tokens, or passwords?
- [ ] Does the repository contain config files with database connection strings?
- [ ] Are Docker Compose files or Terraform tfvars committed with real credentials?

### Secrets Management Infrastructure
- [ ] Is there a centralized secrets manager (Vault, AWS SM, Doppler, etc.)?
- [ ] Does every secret have a defined rotation schedule?
- [ ] Is rotation automated, or does it require manual intervention?
- [ ] Are secrets scoped per environment (dev/staging/prod)?
- [ ] Are secrets scoped per service (principle of least privilege)?

### CI/CD Pipeline
- [ ] Do CI logs contain any secret values, even encoded or transformed?
- [ ] Does the pipeline use OIDC federation instead of long-lived credentials?
- [ ] Are CI secret variables marked as masked and non-exportable?
- [ ] What is the log retention policy? Who can access historical logs?

### Runtime and Deployment
- [ ] Are Docker images scanned for embedded secrets before push?
- [ ] Do environment variables contain secrets visible to child processes that do not need them?
- [ ] Are error messages and stack traces sanitized to remove credentials?
- [ ] Do frontend bundles contain any secret API keys?

### Operational Hygiene
- [ ] Is there an audit trail for secret access (who, when, from where)?
- [ ] Can the team enumerate all secrets and their locations within one hour?
- [ ] Is there a documented incident response plan for leaked secrets?
- [ ] Are departing employees' credentials revoked within the same business day?
- [ ] When was the last secrets rotation drill?

---

## Code Smell Quick Reference

| Smell | Where to Look | Tool to Detect |
|---|---|---|
| High-entropy strings in source | `.py`, `.js`, `.ts`, `.go`, `.java`, `.rb` | gitleaks, TruffleHog, git-secrets |
| `.env` in repo | `git ls-files \| grep -i env` | pre-commit hooks, CI checks |
| Secrets in git history | Full history scan | TruffleHog (`--since-commit`), BFG |
| Secrets in Docker layers | Dockerfile `ENV`, `COPY .env` | Trivy, Snyk Container, Grype |
| Hardcoded connection strings | Config files (`.xml`, `.yaml`, `.json`, `.properties`) | SAST tools (Semgrep, SonarQube) |
| Secrets in CI logs | Build output, workflow logs | CI platform audit, manual review |
| API keys in JS bundles | `bundle.js`, `main.js`, webpack output | Browser DevTools, Semgrep |
| Default credentials | Admin panels, databases, IoT | Nessus, OpenVAS, manual checklist |
| Secrets in URLs | Access logs, Referer headers | WAF rules, log analysis |
| Long-lived unrotated keys | IAM console, secrets manager age report | AWS IAM Access Analyzer, Vault |
| Secrets in error logs | Application logs, Sentry/Datadog | Log scrubbing rules, regex filters |
| Broad access credentials | IAM policies, Vault ACLs | IAM Access Analyzer, policy review |
| Tokens in localStorage | Browser DevTools, source code | ESLint rules, Semgrep |
| Secrets in IaC files | `.tf`, `.tfvars`, `docker-compose.yml` | tfsec, checkov, kics |
| Unencrypted Terraform state | `.tfstate` files, S3 buckets | checkov, terraform plan audit |

---

## Prevention Toolkit

### Pre-Commit Layer
```bash
# Install gitleaks as a pre-commit hook
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

### CI/CD Layer
```yaml
# GitHub Actions: scan for secrets on every push
- name: Gitleaks
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Runtime Layer
```python
# Python: load secrets from vault, never from environment or config
from hvac import Client

vault = Client(url="https://vault.internal:8200")
db_password = vault.secrets.kv.v2.read_secret("database/prod")["data"]["password"]
```

### Docker Layer
```dockerfile
# Use BuildKit secrets -- never ENV or COPY for sensitive data
# syntax=docker/dockerfile:1
FROM node:18
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm install
```

---

## Incident Response Checklist

When a secret is confirmed or suspected to be leaked:

1. **Rotate immediately.** Do not investigate first. Revoke and replace the compromised
   credential within minutes.
2. **Assess blast radius.** Determine what the secret protects, what systems it grants access
   to, and what data is at risk.
3. **Check access logs.** Review audit logs for the compromised credential for unauthorized
   usage patterns (unusual IPs, times, volumes).
4. **Scan for lateral damage.** Determine if the leaked secret provides access to other secrets
   (e.g., a GitHub token that exposes repos containing AWS keys).
5. **Clean the source.** Remove the secret from git history, Docker layers, CI logs, Slack
   messages, or wherever it was exposed.
6. **Notify affected parties.** Follow breach disclosure requirements (GDPR 72-hour rule, state
   notification laws, customer communication).
7. **Conduct a post-mortem.** Document how the leak occurred, what detection failed, and what
   systemic changes will prevent recurrence.

---

## Key Statistics

| Metric | Value | Source |
|---|---|---|
| Secrets leaked on GitHub in 2024 | 39 million | GitHub Security Blog |
| Secrets revoked within 1 hour | 2.6% | GitGuardian 2024 |
| Secrets still valid after 5 days | 91.6% | GitGuardian 2024 |
| Average breach cost (credentials) | $4.88 million | IBM Cost of Data Breach 2024 |
| Breaches involving stolen credentials | 22% | Verizon DBIR 2025 |
| Organizations failing rotation targets | 71% | Industry research |
| Average unrotated secret lifespan | 600+ days | Industry research |
| Docker Hub images leaking secrets | 10,456 | Flare Research 2025 |
| Travis CI tokens exposed via logs | 73,000+ | Travis CI disclosure |
| IoT devices compromised by Mirai | 600,000+ | Cloudflare / CISA 2016 |

---

## Sources

- [GitHub Found 39M Secret Leaks in 2024](https://github.blog/security/application-security/next-evolution-github-advanced-security/) -- GitHub Blog
- [Over 12 Million Auth Secrets Leaked on GitHub in 2023](https://www.bleepingcomputer.com/news/security/over-12-million-auth-secrets-and-keys-leaked-on-github-in-2023/) -- BleepingComputer
- [Uber Breach: How Did a Private GitHub Repository Fail Uber?](https://www.techtarget.com/searchsecurity/answer/Uber-breach-How-did-a-private-GitHub-repository-fail-Uber) -- TechTarget
- [Uber Data Breach: What Happened, Impact, and Lessons](https://www.huntress.com/threat-library/data-breach/uber-data-breach) -- Huntress
- [Toyota Accidentally Exposed a Secret Key on GitHub for Five Years](https://blog.gitguardian.com/toyota-accidently-exposed-a-secret-key-publicly-on-github-for-five-years/) -- GitGuardian
- [Toyota Discloses Data Leak After Access Key Exposed on GitHub](https://www.bleepingcomputer.com/news/security/toyota-discloses-data-leak-after-access-key-exposed-on-github/) -- BleepingComputer
- [A Mishandled GitHub Token Exposed Mercedes-Benz Source Code](https://www.bleepingcomputer.com/news/security/a-mishandled-github-token-exposed-mercedes-benz-source-code/) -- BleepingComputer
- [Samsung Confirms Source Code Stolen in Breach](https://www.bankinfosecurity.com/hackers-report-leaking-190gb-samsung-data-source-code-a-18665) -- BankInfoSecurity
- [Twitch Leak: A Deep Dive into the Source Code Security Threats](https://blog.gitguardian.com/security-threats-from-the-twitch-leak/) -- GitGuardian
- [CircleCI Security Incident: Rotate Your Secrets](https://snyk.io/blog/supply-chain-security-incident-circleci-secrets/) -- Snyk
- [Rotate or Breach: Security Insights from Cloudflare](https://www.akeyless.io/blog/rotate-or-breach-security-insights-from-cloudflare/) -- Akeyless
- [Over 10,000 Docker Hub Images Found Leaking Credentials](https://www.bleepingcomputer.com/news/security/over-10-000-docker-hub-images-found-leaking-credentials-auth-keys/) -- BleepingComputer
- [How Secrets Leak in CI/CD Pipelines](https://trufflesecurity.com/blog/secrets-leak-in-ci-cd) -- Truffle Security
- [Mirai Botnet: A Retrospective Analysis](https://blog.cloudflare.com/inside-mirai-the-infamous-iot-botnet-a-retrospective-analysis/) -- Cloudflare
- [Information Exposure Through Query Strings in URL](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url) -- OWASP
- [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) -- OWASP
- [Why localStorage Is Unsafe for Tokens and Secrets](https://www.trevorlasn.com/blog/the-problem-with-local-storage) -- Trevor Lasn
- [Secrets Exposed: Why Your CISO Should Worry About Slack](https://thehackernews.com/2024/09/secrets-exposed-why-your-ciso-should.html) -- The Hacker News
- [Massive GitHub Leak: 39M API Keys and Credentials Exposed](https://gbhackers.com/massive-github-leak/) -- GBHackers
- [Secrets Management: Best Practices for 2026](https://www.strongdm.com/blog/secrets-management) -- StrongDM
