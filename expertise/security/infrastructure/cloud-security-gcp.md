# GCP Cloud Security Expertise Module

> **Purpose:** Comprehensive security reference for AI agents securing Google Cloud Platform deployments.
> **Last Updated:** 2026-03-08
> **Sources:** Google Cloud documentation, CIS GCP Benchmark, Google Threat Horizons Report, Wiz research, Unit42, NCC Group, Sysdig, SentinelOne, Orca Security, Palo Alto Networks.

---

## 1. Threat Landscape

### 1.1 GCP-Specific Risk Profile

Google Cloud Platform presents a distinct attack surface shaped by its resource hierarchy
(Organization > Folder > Project > Resource), IAM model, and default service account behavior.
The most common attack vectors in GCP environments include:

- **Overpermissioned service accounts** — The default Compute Engine service account
  (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) is granted the Editor role,
  providing write access to nearly every resource in the project. Attackers who compromise
  a single VM can pivot across the entire project.
- **Public Cloud Storage buckets** — Misconfigured ACLs or IAM bindings granting
  `allUsers` or `allAuthenticatedUsers` read access expose data to the internet.
- **Metadata server exposure** — Every GCE instance can reach the metadata server at
  `http://metadata.google.internal/computeMetadata/v1/`. SSRF vulnerabilities allow
  attackers to extract service account tokens, project metadata, and SSH keys.
- **Misconfigured firewall rules** — Overly broad ingress rules (0.0.0.0/0) on default
  VPC networks expose services to the public internet.
- **Service account key leaks** — Long-lived JSON key files committed to Git repositories
  or left in CI/CD logs provide persistent, unmonitored access.

### 1.2 Real-World Incidents

**WotNot Cloud Storage Exposure (2024):** An Indian AI chatbot startup left a Google Cloud
Storage bucket publicly accessible, exposing approximately 346,000 files including scanned
passports, government IDs, medical records, and travel itineraries. Root cause: missing
access controls on GCS bucket, no organization policy enforcing uniform bucket-level access.
(Source: SentinelOne, Cybernews)

**CloudImposer Dependency Confusion (2024):** Tenable researchers discovered that Google's
own documentation for GCP services recommended using `--extra-index-url` for private Python
packages, creating a dependency confusion vulnerability. A single malicious package in
PyPI could be deployed to millions of GCP service instances. Google patched the
documentation and affected services. (Source: Dark Reading, Tenable)

**Credential-Based Attacks (2024):** Google's Threat Horizons Report identified that weak
or non-existent credentials were the most common entry point for cloud attacks in H2 2024.
Overprivileged service accounts were the primary lateral movement mechanism. Attackers
increasingly target service accounts over user accounts due to fewer MFA protections.
(Source: Google Cloud Threat Horizons, Cybersecurity Dive)

**LeakyCLI Credential Exposure (2024):** Orca Security disclosed that GCP CLI tools
(`gcloud`) could expose sensitive credentials, project names, service accounts, and
environment variables in build logs when used in CI/CD pipelines without proper log
redaction. (Source: Orca Security)

**SSRF Metadata Exploitation:** Palo Alto Unit42 documented active exploitation campaigns
targeting cloud metadata APIs via SSRF in web applications hosted on GCE. Attackers
extracted service account access tokens to move laterally within GCP projects. A $31K
bug bounty was paid for an SSRF in Google Cloud Monitoring that led to metadata
exposure. (Source: Unit42, Palo Alto Networks)

---

## 2. Core Security Principles

### 2.1 Least Privilege IAM

- **Never use primitive roles** (Owner, Editor, Viewer) in production. These include
  thousands of permissions across all GCP services.
- **Prefer predefined roles** scoped to specific services (e.g., `roles/storage.objectViewer`
  instead of `roles/editor`).
- **Use custom roles** when predefined roles grant more permissions than needed.
- **Apply IAM Conditions** for time-based, IP-based, or resource-attribute-based access.
- **Audit regularly** with IAM Recommender, which suggests permission reductions based
  on actual usage over 90 days.

### 2.2 Service Account Security

- **One service account per workload** — Never share service accounts across applications.
- **Eliminate service account keys** — Use Workload Identity (GKE), Workload Identity
  Federation (external clouds/CI-CD), attached service accounts (GCE/Cloud Run), or
  service account impersonation instead.
- **Disable default service accounts** — The default Compute Engine and App Engine service
  accounts have excessive permissions.
- **Disable automatic role grants** for default service accounts via organization policy
  `iam.automaticIamGrantsForDefaultServiceAccounts`.
- **Set key expiry** if keys are unavoidable — enforce 90-day rotation with organization
  policy `constraints/iam.serviceAccountKeyExpiryHours`.

### 2.3 VPC Service Controls

VPC Service Controls create security perimeters around GCP resources to prevent data
exfiltration, even by users with valid credentials:

- Define service perimeters around sensitive projects containing BigQuery, Cloud Storage,
  Cloud KMS, and other data services.
- Use **dry-run mode** first to analyze violation logs before enforcement.
- Configure precise **ingress/egress rules** for legitimate cross-perimeter traffic.
- Combine with IAM — VPC Service Controls do not replace least-privilege IAM.

### 2.4 Organization Policies

Key organization policy constraints for security:

| Constraint | Purpose |
|---|---|
| `constraints/compute.requireShieldedVm` | Enforce Shielded VM on all instances |
| `constraints/compute.vmExternalIpAccess` | Restrict which VMs can have external IPs |
| `constraints/iam.disableServiceAccountKeyCreation` | Block creation of SA keys |
| `constraints/storage.uniformBucketLevelAccess` | Enforce uniform access on buckets |
| `constraints/gcp.restrictNonCmekServices` | Require CMEK for specified services |
| `constraints/compute.requireOsLogin` | Enforce OS Login for SSH access |
| `constraints/sql.restrictPublicIp` | Prevent public IPs on Cloud SQL |

### 2.5 Encryption: CMEK vs Google-Managed

| Aspect | Google-Managed | Customer-Managed (CMEK) |
|---|---|---|
| Key control | Google manages entirely | Customer controls via Cloud KMS |
| Rotation | Automatic | Customer-defined schedule |
| Revocation | Not possible | Customer can disable/destroy key |
| Audit trail | Limited | Full Cloud Audit Logs |
| Use case | Default, low-sensitivity | Regulated data, compliance |

CMEK uses envelope encryption: data encrypted with a DEK, DEK encrypted with the KMS
key. Key and data must be in the same region.

### 2.6 BeyondCorp Zero Trust

Google's BeyondCorp model eliminates the trusted network perimeter:

- **Access is identity-based**, not network-based. No VPN required.
- **Identity-Aware Proxy (IAP)** verifies user identity and device context before
  granting access to applications.
- **Context-aware access** evaluates device security posture, IP, location, and time.
- **Principle:** "Access to services must not be determined by the network from which
  you connect."

---

## 3. Implementation Patterns

### 3.1 IAM Roles and Bindings

**Predefined vs Custom Roles:**

```hcl
# INSECURE: Primitive role grants excessive permissions
resource "google_project_iam_member" "bad_binding" {
  project = "my-project"
  role    = "roles/editor"
  member  = "serviceAccount:my-sa@my-project.iam.gserviceaccount.com"
}

# SECURE: Predefined role with minimal permissions
resource "google_project_iam_member" "good_binding" {
  project = "my-project"
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:my-sa@my-project.iam.gserviceaccount.com"
}

# SECURE: Custom role with exact permissions needed
resource "google_project_iam_custom_role" "minimal_role" {
  role_id     = "customStorageReader"
  title       = "Custom Storage Reader"
  description = "Read-only access to specific bucket objects"
  permissions = [
    "storage.objects.get",
    "storage.objects.list",
  ]
}
```

### 3.2 Service Account Key Management (Prefer Workload Identity)

```hcl
# SECURE: Workload Identity for GKE — no keys needed
resource "google_service_account" "app_sa" {
  account_id   = "app-workload"
  display_name = "Application Workload SA"
}

resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.app_sa.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/${var.ksa_name}]",
  ]
}

# SECURE: Workload Identity Federation for external CI/CD (GitHub Actions)
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

### 3.3 VPC Firewall Rules

```hcl
# INSECURE: Allow all traffic from anywhere
resource "google_compute_firewall" "bad_rule" {
  name    = "allow-all"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  source_ranges = ["0.0.0.0/0"]  # DANGEROUS: open to the internet
}

# SECURE: Restrictive firewall with specific sources and ports
resource "google_compute_firewall" "allow_https" {
  name    = "allow-https-from-lb"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]  # GCP LB ranges only
  target_tags   = ["web-server"]
}

# SECURE: Deny all egress by default, then allow specific
resource "google_compute_firewall" "deny_all_egress" {
  name      = "deny-all-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  destination_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_google_apis" {
  name      = "allow-google-apis-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  destination_ranges = ["199.36.153.4/30"]  # Private Google Access
}
```

### 3.4 Private Google Access

Enable Private Google Access on subnets so VMs without external IPs can reach
Google APIs through internal routing:

```hcl
resource "google_compute_subnetwork" "private_subnet" {
  name                     = "private-subnet"
  ip_cidr_range            = "10.0.1.0/24"
  region                   = "us-central1"
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true  # Enables Private Google Access
}
```

### 3.5 Cloud KMS Usage

```hcl
resource "google_kms_key_ring" "keyring" {
  name     = "app-keyring"
  location = "us-central1"
}

resource "google_kms_crypto_key" "key" {
  name            = "app-encryption-key"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# Grant encrypt/decrypt to specific service account only
resource "google_kms_crypto_key_iam_member" "encrypter" {
  crypto_key_id = google_kms_crypto_key.key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.app_sa.email}"
}
```

### 3.6 Secret Manager

```hcl
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"

  replication {
    user_managed {
      replicas {
        location = "us-central1"
      }
    }
  }

  # CMEK encryption
  encryption {
    kms_key_name = google_kms_crypto_key.key.id
  }
}

# Grant access to specific SA only
resource "google_secret_manager_secret_iam_member" "accessor" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_sa.email}"
}
```

### 3.7 Cloud Armor (WAF)

```hcl
resource "google_compute_security_policy" "policy" {
  name = "web-security-policy"

  # Default rule: deny all
  rule {
    action   = "deny(403)"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default deny rule"
  }

  # Allow legitimate traffic
  rule {
    action   = "allow"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["0.0.0.0/0"]
      }
    }
    description = "Allow all (filtered by WAF rules below)"
  }

  # Block SQL injection
  rule {
    action   = "deny(403)"
    priority = "100"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "Block SQL injection"
  }

  # Block XSS
  rule {
    action   = "deny(403)"
    priority = "101"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "Block XSS attacks"
  }

  # Rate limiting
  rule {
    action   = "rate_based_ban"
    priority = "200"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 600
    }
    description = "Rate limit: 100 req/min per IP"
  }
}
```

### 3.8 Identity-Aware Proxy

```hcl
resource "google_iap_web_iam_member" "access" {
  project = var.project_id
  role    = "roles/iap.httpsResourceAccessor"
  member  = "group:developers@example.com"
}

resource "google_iap_web_backend_service_iam_member" "access" {
  project             = var.project_id
  web_backend_service = google_compute_backend_service.app.name
  role                = "roles/iap.httpsResourceAccessor"
  member              = "group:developers@example.com"
}
```

### 3.9 Secure Cloud Run Configuration

```hcl
# INSECURE: Public, no auth, default SA
resource "google_cloud_run_service" "insecure" {
  name     = "my-service"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/my-project/my-app:latest"
      }
      # Uses default compute SA with Editor role
    }
  }
}

resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.insecure.name
  location = "us-central1"
  role     = "roles/run.invoker"
  member   = "allUsers"  # DANGEROUS: anyone can invoke
}

# SECURE: Private, authenticated, dedicated SA, CMEK, VPC connector
resource "google_cloud_run_service" "secure" {
  name     = "my-service"
  location = "us-central1"

  template {
    spec {
      service_account_name = google_service_account.cloud_run_sa.email
      containers {
        image = "gcr.io/my-project/my-app:v1.2.3"  # Pinned version, not :latest

        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }
      }
    }

    metadata {
      annotations = {
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
        "run.googleapis.com/encryption-key"       = google_kms_crypto_key.key.id
      }
    }
  }

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = "internal-and-cloud-load-balancing"
    }
  }
}

# Only allow authenticated invocations from specific SA
resource "google_cloud_run_service_iam_member" "invoker" {
  service  = google_cloud_run_service.secure.name
  location = "us-central1"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.caller_sa.email}"
}
```

---

## 4. Vulnerability Catalog

### VULN-GCP-001: Service Account Key Leaks

**Risk:** Critical | **CIS:** 1.4
**Description:** Service account JSON key files committed to Git repos, stored in CI/CD
logs, or shared via insecure channels provide persistent, unmonitored access.
**Detection:** `gcloud iam service-accounts keys list --iam-account=SA_EMAIL` — look
for user-managed keys. Use GitHub secret scanning or TruffleHog.
**Remediation:** Delete all user-managed keys. Migrate to Workload Identity Federation.
Enforce org policy `constraints/iam.disableServiceAccountKeyCreation`.

### VULN-GCP-002: allUsers / allAuthenticatedUsers IAM Bindings

**Risk:** Critical | **CIS:** 1.1
**Description:** IAM bindings granting `allUsers` (anonymous) or `allAuthenticatedUsers`
(any Google account) access to resources expose data publicly.
**Detection:** SCC finding `PUBLIC_BUCKET_ACL`, `PUBLIC_DATASET`.
```bash
gcloud asset search-all-iam-policies --scope=projects/PROJECT_ID \
  --query="policy:allUsers OR policy:allAuthenticatedUsers"
```
**Remediation:** Remove public bindings. Enforce org policy
`constraints/iam.allowedPolicyMemberDomains` to restrict to your domain.

### VULN-GCP-003: Public GCS Buckets

**Risk:** Critical | **CIS:** 5.1
**Description:** Buckets with public ACLs or IAM bindings expose all objects to
unauthenticated access. The WotNot breach (2024) exposed 346K sensitive files this way.
**Detection:** SCC finding `PUBLIC_BUCKET_ACL`.
```bash
gsutil iam get gs://BUCKET_NAME | grep -E "allUsers|allAuthenticatedUsers"
```
**Remediation:** Enable uniform bucket-level access. Remove public IAM bindings.
Enforce org policy `constraints/storage.uniformBucketLevelAccess`.

### VULN-GCP-004: Default Compute Engine Service Account

**Risk:** High | **CIS:** 1.5
**Description:** The default Compute Engine SA is auto-granted Editor role at project
level. Any VM using this SA inherits excessive permissions.
**Detection:** List instances using default SA:
```bash
gcloud compute instances list --format="table(name,serviceAccounts[].email)" \
  | grep "compute@developer.gserviceaccount.com"
```
**Remediation:** Create dedicated service accounts per workload. Disable automatic
role grants via org policy `iam.automaticIamGrantsForDefaultServiceAccounts`.

### VULN-GCP-005: Overpermissive Firewall Rules

**Risk:** High | **CIS:** 3.6, 3.7
**Description:** Firewall rules allowing ingress from `0.0.0.0/0` on sensitive ports
(SSH/22, RDP/3389, databases) expose services to brute-force and exploitation.
**Detection:** SCC finding `OPEN_FIREWALL`, `OPEN_SSH_PORT`, `OPEN_RDP_PORT`.
```bash
gcloud compute firewall-rules list --format="table(name,direction,sourceRanges,allowed)" \
  --filter="sourceRanges=0.0.0.0/0"
```
**Remediation:** Restrict source ranges to known IPs/CIDRs. Use IAP for SSH/RDP
instead of direct firewall exposure. Delete the `default` VPC network.

### VULN-GCP-006: Metadata Server Exposure via SSRF

**Risk:** High
**Description:** Applications with SSRF vulnerabilities can access
`http://metadata.google.internal/computeMetadata/v1/` to extract service account
tokens, SSH keys, and project metadata. Legacy metadata endpoints (v0.1, v1beta1)
do not require the `Metadata-Flavor: Google` header.
**Detection:** Monitor for unusual metadata API calls in Cloud Audit Logs.
**Remediation:** Disable legacy metadata endpoints on all VMs. Use the v1 API
exclusively. Apply network-level SSRF protections. Minimize SA permissions on VMs.

### VULN-GCP-007: Unencrypted Resources (Missing CMEK)

**Risk:** Medium | **CIS:** 6.2
**Description:** Resources using only Google-managed encryption cannot be independently
audited or revoked. Regulated workloads require CMEK.
**Detection:** Check for CMEK usage per service.
**Remediation:** Enable CMEK for Cloud SQL, BigQuery, GCS, GKE secrets, Pub/Sub.
Enforce org policy `constraints/gcp.restrictNonCmekServices`.

### VULN-GCP-008: Missing Audit Logging

**Risk:** High | **CIS:** 2.1
**Description:** Data Access audit logs are disabled by default in GCP. Without them,
read operations on sensitive data are invisible to security teams.
**Detection:** Check audit log configuration:
```bash
gcloud projects get-iam-policy PROJECT_ID --format=json | jq '.auditConfigs'
```
**Remediation:** Enable Data Access audit logs for all services, especially
BigQuery, Cloud Storage, Cloud SQL, and IAM.

### VULN-GCP-009: Cloud SQL with Public IP

**Risk:** High | **CIS:** 6.5
**Description:** Cloud SQL instances with public IPs are directly reachable from the
internet, subject to brute-force and exploitation of database vulnerabilities.
**Detection:** SCC finding `SQL_PUBLIC_IP`.
```bash
gcloud sql instances list --format="table(name,ipAddresses)"
```
**Remediation:** Use private IP only. Connect via Cloud SQL Auth Proxy.
Enforce org policy `constraints/sql.restrictPublicIp`.

### VULN-GCP-010: Missing VPC Flow Logs

**Risk:** Medium | **CIS:** 3.8
**Description:** Without VPC flow logs, network traffic patterns cannot be analyzed
for anomalies, lateral movement, or data exfiltration.
**Detection:** Check subnet configurations for flow log enablement.
**Remediation:** Enable VPC flow logs on all subnets with appropriate sampling rate.

### VULN-GCP-011: Unrestricted API Key Usage

**Risk:** High | **CIS:** 1.12, 1.13, 1.14
**Description:** API keys without application or API restrictions can be used by
anyone to consume quota and access enabled APIs.
**Detection:** List API keys and check restrictions:
```bash
gcloud services api-keys list --format="table(name,restrictions)"
```
**Remediation:** Restrict API keys to specific APIs, HTTP referrers, or IP addresses.
Prefer service accounts over API keys where possible.

### VULN-GCP-012: GKE Cluster Without Network Policy

**Risk:** Medium | **CIS:** 7.11
**Description:** Without Kubernetes Network Policies, any pod can communicate with
any other pod in the cluster, enabling lateral movement after compromise.
**Detection:** Check if network policy is enabled on GKE clusters.
**Remediation:** Enable network policy enforcement. Deploy default-deny policies.
Use Autopilot mode for stricter defaults.

### VULN-GCP-013: Container Images Without Binary Authorization

**Risk:** Medium
**Description:** Without Binary Authorization, any container image can be deployed
to GKE or Cloud Run, including compromised or untrusted images.
**Detection:** Check Binary Authorization policy.
**Remediation:** Enable Binary Authorization. Require attestations from trusted
build systems. Use Artifact Analysis for vulnerability scanning.

### VULN-GCP-014: BigQuery Dataset with Public Access

**Risk:** Critical | **CIS:** 7.1
**Description:** BigQuery datasets granting `allUsers` or `allAuthenticatedUsers`
access expose potentially sensitive analytical data.
**Detection:** SCC finding `PUBLIC_DATASET`.
**Remediation:** Remove public IAM bindings. Use authorized views for controlled
data sharing. Enable column-level security for sensitive fields.

### VULN-GCP-015: Missing Organization Policy Constraints

**Risk:** High
**Description:** Without organization policies, individual projects can create
public resources, service account keys, external IPs, and unencrypted instances.
**Detection:** Audit organization policy configuration:
```bash
gcloud org-policies list --organization=ORG_ID
```
**Remediation:** Implement all security-critical organization policies from Section 2.4.

---

## 5. Security Checklist

### Identity and Access Management
- [ ] No primitive roles (Owner/Editor/Viewer) assigned in production projects
- [ ] Each workload uses a dedicated service account with minimal permissions
- [ ] No user-managed service account keys exist (Workload Identity used instead)
- [ ] Default service accounts are disabled or have no role grants
- [ ] `allUsers` and `allAuthenticatedUsers` bindings are absent from all resources
- [ ] IAM Recommender findings are reviewed and applied monthly
- [ ] MFA is enforced for all user accounts; hardware keys for admins
- [ ] Domain-restricted sharing is enforced via org policy
- [ ] Service account impersonation is logged and monitored

### Network Security
- [ ] Default VPC network is deleted in all projects
- [ ] Custom VPC with private subnets is used for all workloads
- [ ] No firewall rules allow 0.0.0.0/0 ingress on SSH (22) or RDP (3389)
- [ ] Private Google Access is enabled on all subnets
- [ ] VPC Flow Logs are enabled on all subnets
- [ ] Cloud NAT is used for outbound internet access (no external IPs on VMs)
- [ ] VPC Service Controls perimeters protect sensitive data services

### Data Protection
- [ ] CMEK is enabled for all regulated/sensitive data services
- [ ] Cloud KMS keys have rotation policies (90 days or less)
- [ ] Secrets are stored in Secret Manager (never in env vars or code)
- [ ] Cloud SQL instances use private IP only (no public IP)
- [ ] GCS buckets enforce uniform bucket-level access
- [ ] BigQuery datasets restrict access to specific principals

### Compute and Container Security
- [ ] Shielded VMs are enforced via organization policy
- [ ] OS Login is enforced for SSH access (no project/instance SSH keys)
- [ ] GKE clusters use Workload Identity, not node SA for pod access
- [ ] GKE network policy enforcement is enabled
- [ ] Binary Authorization is enabled for GKE and Cloud Run
- [ ] Container images are scanned for vulnerabilities before deployment
- [ ] GKE nodes use auto-upgrade and auto-repair
- [ ] Legacy metadata endpoints are disabled on all compute instances

### Logging and Monitoring
- [ ] Data Access audit logs are enabled for all services
- [ ] Admin Activity logs are forwarded to centralized SIEM
- [ ] Cloud Audit Logs have retention of at least 365 days
- [ ] SCC Premium or Enterprise is enabled at organization level
- [ ] Alert policies exist for critical SCC findings

### Organization Governance
- [ ] Organization policies from Section 2.4 are enforced
- [ ] Security foundations blueprint is implemented
- [ ] All projects are under the organization node (no standalone projects)
- [ ] Folder structure enforces separation of environments (dev/staging/prod)

---

## 6. Tools and Automation

### 6.1 Security Command Center (SCC)

GCP's native CSPM and threat detection platform. Available in Standard (free),
Premium, and Enterprise tiers.

**Key capabilities (2025-2026):**
- **Security Health Analytics** — Continuous misconfiguration detection against CIS
  benchmarks and Google best practices.
- **Event Threat Detection** — Near real-time detection of active threats across
  Compute Engine, GKE, BigQuery, Cloud SQL, and Cloud Run.
- **Container Threat Detection** — Runtime monitoring for GKE containers.
- **Security Graph (Issues)** — Groups findings by severity, showing attack paths
  and blast radius via asset/identity/exposure connections.
- **DSPM (Data Security Posture Management)** — Discovers sensitive data across GCP,
  classifies sensitivity levels, and provides default posture policies.
- **Correlated Threats Detection** — Links individual threat findings to reduce alert
  fatigue using 65+ underlying threat detectors.
- **Model Armor** — Screens LLM prompts and responses for AI workloads.

**SCC Finding Categories to Monitor:**
- `PUBLIC_BUCKET_ACL`, `PUBLIC_DATASET` — Public data exposure
- `OPEN_FIREWALL`, `OPEN_SSH_PORT`, `OPEN_RDP_PORT` — Network exposure
- `SQL_PUBLIC_IP` — Database exposure
- `SA_KEY_CREATED` — Service account key creation
- `MFA_NOT_ENFORCED` — Missing multi-factor authentication
- `OVER_PRIVILEGED_ACCOUNT` — Excess permissions

### 6.2 Open-Source Security Scanning Tools

**ScoutSuite (NCC Group):**
Multi-cloud security auditing tool. Gathers GCP configurations via API and generates
HTML reports with findings mapped to best practices.
```bash
python scout.py gcp --user-account --report-dir ./output
```

**Prowler for GCP:**
Open-source security assessment tool performing best-practice audits, incident
response, continuous monitoring, and forensics readiness.
```bash
prowler gcp --project-id my-project
```

**Checkov (Bridgecrew/Palo Alto):**
Static analysis for Terraform, CloudFormation, and Kubernetes manifests. Scans
IaC before deployment to catch misconfigurations.
```bash
checkov -d ./terraform/ --framework terraform --check CKV_GCP*
```

**tfsec (Aqua Security):**
Fast Terraform-specific static analysis. Now integrated into Trivy.
```bash
tfsec ./terraform/
```

**Terrascan:**
IaC scanner supporting Terraform, Kubernetes, Helm, and Dockerfiles with
policy-as-code using OPA/Rego.

### 6.3 Google-Native Automation

**Cloud Asset Inventory:**
```bash
# Export all IAM policies for analysis
gcloud asset search-all-iam-policies --scope=organizations/ORG_ID \
  --query="policy:allUsers" --format=json > public_policies.json

# Find all resources of a type
gcloud asset search-all-resources --scope=projects/PROJECT_ID \
  --asset-types="sqladmin.googleapis.com/Instance"
```

**Policy Analyzer:**
```bash
# Analyze who can access a resource
gcloud policy-intelligence query-activity \
  --activity-type=serviceAccountKeyLastAuthentication \
  --project=PROJECT_ID
```

**IAM Recommender:**
```bash
# Get IAM recommendations for a project
gcloud recommender recommendations list \
  --recommender=google.iam.policy.Recommender \
  --project=PROJECT_ID --location=global
```

### 6.4 Forseti (Deprecated)

Forseti Security was the primary open-source GCP security tool but is now archived.
Google incorporated its core capabilities into Security Command Center. Migrate
Forseti workloads to SCC Premium or open-source alternatives (ScoutSuite, Prowler).

---

## 7. Platform-Specific Guidance

### 7.1 Compute Engine

- **Shielded VMs:** Enable Secure Boot, vTPM, and Integrity Monitoring to protect
  against rootkits and bootkits. Enforce via org policy.
- **OS Login:** Replace SSH key metadata with OS Login for centralized, IAM-based
  SSH access control with POSIX account management.
- **Metadata protection:** Disable legacy metadata endpoints. Set
  `metadata.google.internal` requests to require `Metadata-Flavor: Google` header.
- **No external IPs:** Use Cloud NAT for outbound access and IAP tunnels for SSH.
- **Confidential VMs:** Use for workloads processing highly sensitive data — encrypts
  data in memory using AMD SEV or Intel TDX.

### 7.2 Google Kubernetes Engine (GKE)

- **Use Autopilot mode** for a hardened-by-default security posture (no node SSH,
  enforced Workload Identity, automatic upgrades).
- **Workload Identity:** Map K8s ServiceAccounts to GCP SAs. Never mount SA keys.
- **Private clusters:** Disable public endpoint or restrict via authorized networks.
- **Network Policies:** Enable Calico/Dataplane V2 and deploy default-deny policies.
- **Binary Authorization:** Require signed attestations for all deployed images.
- **Shielded GKE Nodes:** Protect against rootkits with Secure Boot and integrity
  monitoring.
- **Application-layer secret encryption:** Encrypt K8s Secrets in etcd with Cloud KMS.
- **Pod Security Standards:** Enforce restricted pod security standards to prevent
  privileged containers, host networking, and host path mounts.
- **Auto-upgrade and auto-repair:** Keep nodes patched and healthy automatically.

### 7.3 Cloud Run

- **Ingress restrictions:** Set ingress to `internal` or `internal-and-cloud-load-balancing`.
  Never use `all` for internal services.
- **Dedicated service account:** Never use the default Compute Engine SA.
- **CMEK encryption:** Encrypt container images and data at rest.
- **VPC connector:** Route egress through VPC for private resource access and
  network policy enforcement.
- **Min instances = 0:** Reduces attack surface when service is idle.
- **Secret Manager integration:** Mount secrets as environment variables or volumes.
  Never embed secrets in container images.

### 7.4 Cloud Functions

- **Dedicated service account:** Create a minimal-permission SA for each function.
- **VPC connector:** Connect to private resources without exposing to the internet.
- **Ingress settings:** Set to `ALLOW_INTERNAL_ONLY` for internal-only functions.
- **Secret Manager:** Use the built-in Secret Manager integration for credentials.
- **Runtime updates:** Pin runtime versions and rebuild regularly for security patches.
- **Environment variable security:** Never store secrets in plain-text env vars.
  Use Secret Manager references instead.

### 7.5 Cloud SQL

- **Private IP only:** Enforce via org policy `constraints/sql.restrictPublicIp`.
- **Cloud SQL Auth Proxy:** Use for authenticated, encrypted connections from
  applications. Supports Workload Identity.
- **SSL/TLS enforcement:** Require SSL for all connections:
  ```bash
  gcloud sql instances patch INSTANCE_NAME --require-ssl
  ```
- **CMEK encryption:** Encrypt instances with customer-managed keys.
- **Automated backups:** Enable automated backups with point-in-time recovery.
- **Database flags:** Set `log_connections`, `log_disconnections`, `log_min_duration_statement`
  for audit logging (PostgreSQL). Set `general_log` and `slow_query_log` for MySQL.
- **Private service access:** Use VPC peering for private connectivity.

### 7.6 Cloud Storage

- **Uniform bucket-level access:** Enforce via org policy to prevent ACL complexity.
- **Retention policies:** Set object retention for compliance requirements.
- **Object versioning:** Enable to protect against accidental deletion or overwrite.
- **Signed URLs:** Use for time-limited, scoped access instead of making buckets public.
- **VPC Service Controls:** Place sensitive buckets inside a service perimeter.
- **Data access logging:** Enable Data Access audit logs for all storage operations.
- **Object lifecycle management:** Automatically delete or archive stale data.

### 7.7 BigQuery

- **Dataset-level IAM:** Grant access at dataset level, not project level.
- **Authorized views:** Share query results without exposing underlying tables.
- **Column-level security:** Use policy tags to restrict access to sensitive columns.
- **Row-level security:** Use row access policies to filter data per user.
- **CMEK encryption:** Encrypt datasets with customer-managed keys.
- **VPC Service Controls:** Prevent data exfiltration via perimeter controls.
- **Audit logging:** Enable Data Access logs to track all queries and data access.
- **Slot reservations:** Use reservations to prevent query-based denial of service.

---

## 8. Incident Patterns

### 8.1 GCS Bucket Exposure Detection and Response

**Detection Signals:**
- SCC finding `PUBLIC_BUCKET_ACL` or `PUBLIC_LOG_BUCKET`
- Cloud Audit Log: `storage.setIamPolicy` with `allUsers` member
- External scanning tools report (e.g., GrayhatWarfare bucket search)

**Response Playbook:**
1. **Contain:** Remove public IAM bindings immediately:
   ```bash
   gsutil iam ch -d allUsers gs://BUCKET_NAME
   gsutil iam ch -d allAuthenticatedUsers gs://BUCKET_NAME
   ```
2. **Assess:** Review Data Access audit logs to identify what was accessed:
   ```bash
   gcloud logging read 'resource.type="gcs_bucket" AND
     protoPayload.methodName="storage.objects.get" AND
     protoPayload.authenticationInfo.principalEmail="anonymous"' \
     --project=PROJECT_ID --limit=1000
   ```
3. **Investigate:** Determine duration of exposure, data sensitivity, and scope.
4. **Remediate:** Enable uniform bucket-level access. Enforce org policy.
5. **Notify:** Determine if data breach notification is required per applicable
   regulations (GDPR 72-hour window, state breach notification laws).

### 8.2 Service Account Compromise Response

**Detection Signals:**
- Unusual API calls from a service account (geographic anomaly, new APIs called)
- SCC Event Threat Detection finding: `ANOMALOUS_SERVICE_ACCOUNT_USAGE`
- Service account used from unexpected IP or network

**Response Playbook:**
1. **Contain:** Disable the compromised service account immediately:
   ```bash
   gcloud iam service-accounts disable SA_EMAIL
   ```
2. **Revoke keys:** Delete all user-managed keys:
   ```bash
   gcloud iam service-accounts keys list --iam-account=SA_EMAIL
   gcloud iam service-accounts keys delete KEY_ID --iam-account=SA_EMAIL
   ```
3. **Audit:** Review Cloud Audit Logs for all actions performed by the SA:
   ```bash
   gcloud logging read 'protoPayload.authenticationInfo.principalEmail="SA_EMAIL"' \
     --project=PROJECT_ID --freshness=30d
   ```
4. **Assess blast radius:** Determine what resources the SA could access (use
   Policy Analyzer).
5. **Remediate:** Create a new SA with minimal permissions. Migrate workloads.
   Implement Workload Identity to eliminate keys.

### 8.3 SCC Critical Finding Alert Response

**Detection Signals:**
- SCC finding with severity CRITICAL or HIGH
- Pub/Sub notification from SCC findings export
- SIEM alert from ingested SCC data

**Response Playbook:**
1. **Triage:** Review the SCC finding details, affected resource, and category.
2. **Classify:** Determine if finding indicates active exploitation or
   misconfiguration.
3. **For active threats:**
   - Isolate affected resources (disable SA, restrict network, stop instance)
   - Engage incident response team
   - Preserve evidence (snapshot disks, export logs)
4. **For misconfigurations:**
   - Remediate per the finding's recommendation
   - Create org policy to prevent recurrence
   - Update IaC templates to include the secure configuration
5. **Document:** Record incident timeline, root cause, and remediation steps.

---

## 9. Compliance and Standards

### 9.1 CIS Google Cloud Platform Foundation Benchmark

The CIS GCP Benchmark (current version 3.0+) provides consensus-based security
configuration guidelines organized into sections:

| Section | Coverage |
|---|---|
| 1. IAM | Service accounts, key management, separation of duties |
| 2. Logging and Monitoring | Audit logs, log sinks, alert policies |
| 3. Networking | Firewall rules, DNS, SSL policies, flow logs |
| 4. Virtual Machines | Shielded VM, OS Login, metadata, disks |
| 5. Storage | Bucket access, encryption, retention |
| 6. Cloud SQL | Public IP, SSL, backups, flags |
| 7. BigQuery | Dataset access, encryption, audit |

**Assessment tools:**
- SCC Security Health Analytics (maps findings to CIS controls)
- InSpec GCP CIS Benchmark profile (GitHub: GoogleCloudPlatform/inspec-gcp-cis-benchmark)
- Prowler, ScoutSuite, Checkov (open-source)
- Steampipe with GCP CIS mod

### 9.2 GCP Security Foundations Blueprint

Google's opinionated reference architecture for secure GCP deployments:

- **Organization structure:** Organization > Environment Folders (bootstrap, common,
  production, non-production, development) > Projects.
- **Networking:** Hub-and-spoke or shared VPC topology with centralized firewall
  management.
- **Identity:** Cloud Identity with MFA, federated from corporate IdP.
- **Logging:** Centralized log sink to BigQuery/Cloud Storage with 365-day retention.
- **Security:** SCC Premium enabled at org level, VPC Service Controls for
  sensitive projects.
- **IaC:** Terraform-based deployment via Cloud Build with policy-as-code gates.

Implementation: Terraform blueprints available at
`github.com/terraform-google-modules/terraform-example-foundation`.

### 9.3 SOC 2 on GCP

- **Trust Services Criteria mapping:**
  - Security (CC6): IAM, encryption, firewall rules, VPC Service Controls
  - Availability (A1): Load balancing, auto-scaling, multi-region deployment
  - Confidentiality (C1): CMEK, DLP, data classification
  - Processing Integrity (PI1): Cloud Audit Logs, change management
  - Privacy (P1): DLP, data residency, retention policies
- **Evidence collection:** Cloud Audit Logs, SCC findings exports, IAM policy
  snapshots, Cloud Asset Inventory exports.
- **Google's SOC 2 report:** Available via Compliance Reports Manager for
  GCP services — covers Google's infrastructure controls.

### 9.4 PCI DSS on GCP

- **Shared responsibility:** Google is a PCI DSS Level 1 Service Provider.
  Customers are responsible for their workload configuration.
- **Key requirements:**
  - Requirement 2: Remove default credentials, harden configs (Shielded VM,
    CIS benchmarks)
  - Requirement 3: Protect stored cardholder data (CMEK, DLP, tokenization)
  - Requirement 7: Restrict access (IAM least privilege, VPC Service Controls)
  - Requirement 8: Authentication (MFA, OS Login, IAP)
  - Requirement 10: Logging (Cloud Audit Logs, Data Access logs)
  - Requirement 11: Testing (Web Security Scanner, SCC vulnerability scanning)
- **Sensitive Data Protection (DLP):** Use to discover, classify, and redact
  cardholder data across GCS, BigQuery, and Datastore.

### 9.5 Additional Compliance Frameworks

- **ISO 27001/27017/27018:** GCP is certified. Map controls to IAM, encryption,
  logging, and incident response configurations.
- **HIPAA:** Sign a BAA with Google. Use CMEK, VPC Service Controls, DLP, and
  audit logging for PHI workloads.
- **FedRAMP High:** GCP has FedRAMP High authorization for specific regions
  and services. Use Assured Workloads for compliance guardrails.

---

## 10. Code Examples

### 10.1 Complete Secure Project Setup (Terraform)

```hcl
# --- Provider Configuration ---
provider "google" {
  project = var.project_id
  region  = var.region
}

# --- Enable Required APIs ---
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "cloudkms.googleapis.com",
    "secretmanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "securitycenter.googleapis.com",
    "iap.googleapis.com",
    "vpcaccess.googleapis.com",
  ])
  project = var.project_id
  service = each.value
}

# --- Custom VPC (no default network) ---
resource "google_compute_network" "vpc" {
  name                    = "secure-vpc"
  auto_create_subnetworks = false  # No default subnets
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "private" {
  name                     = "private-subnet"
  ip_cidr_range            = "10.0.0.0/24"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# --- Default deny-all firewall rules ---
resource "google_compute_firewall" "deny_all_ingress" {
  name      = "deny-all-ingress"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}

# --- Allow only IAP for SSH ---
resource "google_compute_firewall" "allow_iap_ssh" {
  name      = "allow-iap-ssh"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]  # IAP's IP range
  target_tags   = ["allow-ssh"]
}

# --- Cloud NAT for outbound access ---
resource "google_compute_router" "router" {
  name    = "nat-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "nat-gateway"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

### 10.2 Enable Comprehensive Audit Logging (Terraform)

```hcl
# INSECURE: No data access audit logs (default)
# Data read/write operations are invisible to security teams

# SECURE: Enable data access audit logs for all services
resource "google_project_iam_audit_config" "all_services" {
  project = var.project_id
  service = "allServices"

  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Centralized log sink to Cloud Storage for long-term retention
resource "google_logging_project_sink" "audit_sink" {
  name                   = "audit-log-sink"
  destination            = "storage.googleapis.com/${google_storage_bucket.audit_logs.name}"
  filter                 = "logName:\"logs/cloudaudit.googleapis.com\""
  unique_writer_identity = true
}

resource "google_storage_bucket" "audit_logs" {
  name          = "${var.project_id}-audit-logs"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  retention_policy {
    retention_period = 31536000  # 365 days in seconds
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}
```

### 10.3 Organization Policy Enforcement (Terraform)

```hcl
# Disable service account key creation across the org
resource "google_organization_policy" "disable_sa_keys" {
  org_id     = var.org_id
  constraint = "constraints/iam.disableServiceAccountKeyCreation"

  boolean_policy {
    enforced = true
  }
}

# Restrict external IPs on VMs
resource "google_organization_policy" "vm_external_ip" {
  org_id     = var.org_id
  constraint = "constraints/compute.vmExternalIpAccess"

  list_policy {
    deny {
      all = true
    }
  }
}

# Enforce uniform bucket access
resource "google_organization_policy" "uniform_bucket" {
  org_id     = var.org_id
  constraint = "constraints/storage.uniformBucketLevelAccess"

  boolean_policy {
    enforced = true
  }
}

# Require Shielded VMs
resource "google_organization_policy" "shielded_vm" {
  org_id     = var.org_id
  constraint = "constraints/compute.requireShieldedVm"

  boolean_policy {
    enforced = true
  }
}

# Restrict Cloud SQL public IP
resource "google_organization_policy" "sql_no_public_ip" {
  org_id     = var.org_id
  constraint = "constraints/sql.restrictPublicIp"

  boolean_policy {
    enforced = true
  }
}

# Restrict domain in IAM policies
resource "google_organization_policy" "domain_restricted" {
  org_id     = var.org_id
  constraint = "constraints/iam.allowedPolicyMemberDomains"

  list_policy {
    allow {
      values = [var.allowed_domain_id]  # Your Cloud Identity customer ID
    }
  }
}
```

### 10.4 Secure GKE Cluster (Terraform)

```hcl
# INSECURE: Public GKE cluster with default SA
resource "google_container_cluster" "insecure" {
  name     = "insecure-cluster"
  location = var.region

  initial_node_count = 3
  # Public endpoint, no network policy, default SA, no shielded nodes
}

# SECURE: Private GKE Autopilot cluster with full hardening
resource "google_container_cluster" "secure" {
  name     = "secure-cluster"
  location = var.region

  enable_autopilot = true

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.private.name

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # Set true for fully private
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.admin_cidr
      display_name = "Admin Network"
    }
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY"
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Database encryption with CMEK
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke_key.id
  }

  release_channel {
    channel = "REGULAR"
  }
}
```

---

## References

- Google Cloud Security Best Practices Center: https://cloud.google.com/security/best-practices
- CIS Google Cloud Platform Benchmark: https://www.cisecurity.org/benchmark/google_cloud_computing_platform
- GCP Security Foundations Blueprint: https://cloud.google.com/architecture/security-foundations
- Google Threat Horizons Report: https://cloud.google.com/security/threat-horizons
- IAM Best Practices: https://cloud.google.com/iam/docs/using-iam-securely
- Service Account Security: https://docs.google.com/iam/docs/best-practices-service-accounts
- VPC Service Controls: https://cloud.google.com/vpc-service-controls/docs/overview
- Security Command Center: https://cloud.google.com/security/products/security-command-center
- Workload Identity Federation: https://cloud.google.com/iam/docs/workload-identity-federation
- Cloud KMS CMEK Best Practices: https://cloud.google.com/kms/docs/cmek-best-practices
- GKE Hardening Guide: https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster
- SentinelOne GCP Security: https://www.sentinelone.com/cybersecurity-101/cloud-security/google-cloud-security-best-practices/
- Wiz GCP Security: https://www.wiz.io/academy/cloud-security/google-cloud-security-best-practices
- Sysdig GCP Best Practices: https://www.sysdig.com/learn-cloud-native/24-google-cloud-platform-gcp-security-best-practices
- Orca Security LeakyCLI: https://orca.security/resources/blog/leakycli-aws-google-cloud-command-line-tools-can-expose-sensitive-credentials-build-logs/
- Dark Reading CloudImposer: https://www.darkreading.com/cloud-security/cloudimposer-flaw-google-cloud-affected-millions-servers
- Unit42 SSRF Research: https://unit42.paloaltonetworks.com/server-side-request-forgery-exposes-data-of-technology-industrial-and-media-organizations/
