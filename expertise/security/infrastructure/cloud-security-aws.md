# AWS Cloud Security — Security Expertise Module

> **Purpose:** Comprehensive reference for AI agents to secure AWS deployments through
> defense-in-depth, least privilege, encryption by default, and continuous monitoring.
>
> **Last updated:** 2026-03-08
> **Sources:** AWS Well-Architected Security Pillar, CIS AWS Foundations Benchmark v5.0,
> AWS Security Blog, Krebs on Security, The Hacker News, Qualys Threat Research, Datadog
> State of Cloud Security 2024, Fortinet Global Threat Landscape 2025, NIST SP 800-53,
> PCI-DSS v4.0.1, vendor documentation, published breach analyses.

---

## 1. Threat Landscape

### 1.1 Scale of the Problem

Cloud misconfiguration remains the dominant root cause of AWS security incidents.
The numbers paint a clear picture:

- **63% of AWS security incidents** in 2024 stemmed from misconfigurations, not
  sophisticated attacks (Palo Alto Networks Unit 42).
- **1.48% of S3 buckets** remain effectively public despite years of AWS defaults
  tightening (Datadog State of Cloud Security 2024).
- **93% of EC2 instances** still do not enforce IMDSv2, leaving them vulnerable to
  SSRF-based credential theft (Qualys, 2024).
- **158 million AWS secret key records** were exposed on a single public server in a
  2025 ransomware campaign targeting S3 buckets.
- **39 million secrets** leaked across GitHub in 2024, including AWS access keys,
  database connection strings, and API tokens (GitHub Security).

### 1.2 Common Attack Vectors

| Attack Vector                   | Description                                                     |
|---------------------------------|-----------------------------------------------------------------|
| S3 bucket exposure              | Public ACLs or bucket policies exposing sensitive data           |
| IAM over-permissioning          | Wildcard policies granting far more access than needed           |
| Credential leakage              | AWS keys hardcoded in source code, `.env` files, Docker images   |
| SSRF to metadata service        | Exploiting IMDSv1 to steal IAM role credentials via 169.254.169.254 |
| Misconfigured security groups   | Inbound 0.0.0.0/0 on SSH (22), RDP (3389), or database ports    |
| Unencrypted data stores         | EBS volumes, RDS instances, S3 objects without encryption        |
| Root account usage              | Operating with root credentials instead of federated IAM roles   |
| Missing CloudTrail logging      | No audit trail for API calls, preventing forensic investigation  |
| Lambda function URL exposure    | Functions with AuthType NONE accessible to the public internet   |
| Cross-account trust abuse       | Overly permissive assume-role trust policies                     |

### 1.3 Real-World Breaches

**Capital One (2019) — SSRF + Over-Permissioned IAM Role — 106 Million Records**

On March 22-23, 2019, a former AWS employee exploited a Server-Side Request Forgery
(SSRF) vulnerability in Capital One's Web Application Firewall (WAF). The attack chain:

1. Identified a misconfigured WAF that allowed arbitrary HTTP requests from the server.
2. Used SSRF to query the EC2 Instance Metadata Service (IMDSv1) at
   `http://169.254.169.254/latest/meta-data/iam/security-credentials/`.
3. Retrieved temporary AWS credentials from the IAM role attached to the EC2 instance.
4. The IAM role had excessive permissions — it could list and read over 700 S3 buckets.
5. Exfiltrated ~30GB of data: 106 million customer records, 140,000 Social Security
   numbers, and 80,000 linked bank account numbers.

Root causes: (a) IMDSv1 responded to unauthenticated HTTP GET requests, (b) the IAM
role violated least privilege with broad S3 read access, (c) WAF misconfiguration
enabled the initial SSRF. Capital One was fined $80 million by the OCC. This breach
directly motivated AWS to develop and promote IMDSv2.

**Twitch (2021) — Server Misconfiguration — 125GB Source Code Leak**

On October 6, 2021, an anonymous poster on 4chan leaked 125GB of Twitch data (200GB
unzipped) due to a server configuration error. The exposed data included:

- 6,000 internal Git repositories and 3 million documents.
- Complete source code for the Twitch platform.
- An unreleased Steam competitor from Amazon Game Studios.
- Creator payout details and proprietary SDKs.
- **6,600 embedded secrets** in Git repos: 194 AWS keys, 69 Twilio keys, 68 Google
  API keys, hundreds of database connection strings, 14 GitHub OAuth keys, 4 Stripe keys.

Root cause: A server configuration change inadvertently made internal Git/backup servers
accessible externally. The scale of embedded secrets demonstrated systemic secrets
management failure.

**S3 Ransomware Campaign (2025) — 158 Million AWS Keys**

In early 2025, security researchers discovered a public server containing over 158 million
AWS secret key records. Attackers used 1,229 verified active keys to encrypt S3 buckets
and demand ransom payments. The campaign exploited organizations that failed to rotate
credentials and lacked S3 versioning or cross-region replication backups.

**Automotive Giant Data Leak (2023-2025)**

A major automotive manufacturer exposed hundreds of S3 buckets containing customer
databases, invoices, and fleet-telemetry data due to misconfigured bucket policies.
One bucket exceeded 70 terabytes. The misconfiguration persisted for years before
public disclosure in late 2025.

---

## 2. Core Security Principles

### 2.1 Least Privilege IAM

Every identity — human, service, or machine — receives only the permissions required
for its specific function. No more, no less.

- Use IAM Access Analyzer to identify unused permissions and generate least-privilege policies.
- Set permissions boundaries to cap the maximum permissions any role can receive.
- Prefer managed policies scoped to specific services over inline policies.
- Require conditions (source IP, MFA, time of day, VPC endpoint) on all sensitive actions.
- Use AWS Organizations Service Control Policies (SCPs) as guardrails across accounts.

### 2.2 MFA Everywhere

- Enforce MFA on the root account — use a hardware security key (FIDO2/U2F).
- Require MFA for all IAM users with console access.
- Use `aws:MultiFactorAuthPresent` condition in policies for sensitive operations.
- Prefer IAM Identity Center (SSO) with MFA over long-lived IAM user credentials.

### 2.3 VPC Isolation

- Deploy workloads in private subnets; use NAT gateways for outbound internet access.
- Use VPC endpoints (Gateway for S3/DynamoDB, Interface for other services) to keep
  traffic within the AWS network.
- Segment environments (dev/staging/prod) into separate VPCs or accounts.
- Use AWS Transit Gateway for controlled cross-VPC communication.

### 2.4 Encryption by Default

- Enable default encryption on S3 buckets (SSE-S3 minimum, SSE-KMS preferred).
- Encrypt EBS volumes, RDS instances, DynamoDB tables, and ElastiCache at rest.
- Enforce TLS 1.2+ for all data in transit.
- Use AWS KMS with customer-managed keys (CMKs) for regulated workloads.
- Enable key rotation on all KMS keys (automatic annual rotation or shorter).

### 2.5 Log Everything

- Enable CloudTrail in all regions with multi-region trail configuration.
- Enable CloudTrail log file validation (digest files) to detect tampering.
- Store CloudTrail logs in a dedicated, separate-account S3 bucket with Object Lock.
- Enable VPC Flow Logs for network traffic analysis.
- Enable S3 access logging, ELB access logs, and CloudFront access logs.
- Centralize logs in a security account using AWS Organizations.

### 2.6 Security Automation

- Use AWS Config Rules for continuous compliance monitoring.
- Deploy GuardDuty for intelligent threat detection across accounts.
- Automate remediation with Lambda functions triggered by Config/GuardDuty findings.
- Implement Infrastructure as Code (IaC) and scan it before deployment.
- Use CI/CD pipeline security gates (checkov, tfsec) to prevent insecure deployments.

---

## 3. Implementation Patterns

### 3.1 IAM Policies — Least Privilege with Conditions

**Insecure — Wildcard admin policy (never do this):**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "*",
    "Resource": "*"
  }]
}
```

**Secure — Scoped policy with conditions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowS3ReadSpecificBucket",
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::my-app-data-bucket",
      "arn:aws:s3:::my-app-data-bucket/*"
    ],
    "Condition": {
      "StringEquals": {
        "aws:RequestedRegion": "us-east-1"
      },
      "Bool": {
        "aws:SecureTransport": "true"
      },
      "IpAddress": {
        "aws:SourceIp": "10.0.0.0/8"
      }
    }
  }]
}
```

**Permissions boundary — cap delegated permissions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSpecificServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "lambda:*",
        "logs:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenySecurityServices",
      "Effect": "Deny",
      "Action": [
        "iam:CreateUser",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3.2 S3 Security

**Block all public access (account level):**

```json
{
  "BlockPublicAcls": true,
  "IgnorePublicAcls": true,
  "BlockPublicPolicy": true,
  "RestrictPublicBuckets": true
}
```

**Secure bucket policy — enforce TLS and deny unencrypted uploads:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-secure-bucket",
        "arn:aws:s3:::my-secure-bucket/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-secure-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

### 3.3 VPC Security — Security Groups and NACLs

**Insecure security group (never do this):**

```hcl
# BAD: Open to the world on all ports
resource "aws_security_group" "bad_example" {
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**Secure security group (Terraform):**

```hcl
resource "aws_security_group" "web_server" {
  name        = "web-server-sg"
  description = "Allow HTTPS from CloudFront only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTPS from CloudFront"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    description = "Allow outbound to VPC only"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  tags = {
    Name        = "web-server-sg"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

**VPC endpoint for S3 (keeps traffic off the internet):**

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSpecificBucket"
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject", "s3:PutObject"]
      Resource  = ["arn:aws:s3:::my-app-bucket/*"]
    }]
  })
}
```

### 3.4 KMS Key Management

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowKeyAdministration",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/KeyAdminRole" },
      "Action": [
        "kms:Create*",
        "kms:Describe*",
        "kms:Enable*",
        "kms:List*",
        "kms:Put*",
        "kms:Update*",
        "kms:Revoke*",
        "kms:Disable*",
        "kms:Get*",
        "kms:Delete*",
        "kms:ScheduleKeyDeletion",
        "kms:CancelKeyDeletion"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowKeyUsage",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/AppRole" },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

Separate key administration from key usage. The admin role can manage key lifecycle but
cannot encrypt/decrypt data. The application role can use the key but cannot modify or
delete it.

### 3.5 Secrets Manager

- Store all application secrets (database passwords, API keys, tokens) in AWS Secrets
  Manager or SSM Parameter Store (SecureString type).
- Enable automatic rotation with Lambda rotation functions.
- Reference secrets by ARN in application code — never embed values.
- Use resource policies to restrict which IAM roles can access each secret.
- Audit secret access via CloudTrail `GetSecretValue` events.

### 3.6 WAF and CloudFront Security

- Deploy AWS WAF in front of CloudFront, ALB, or API Gateway.
- Enable AWS Managed Rule Groups: Core Rule Set (CRS), Known Bad Inputs, SQL Injection,
  IP Reputation.
- Use rate-based rules to mitigate DDoS and brute-force attacks.
- Configure CloudFront with Origin Access Control (OAC) for S3 origins — not legacy OAI.
- Set minimum TLS 1.2 on CloudFront distributions.
- Use custom response headers: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`.

### 3.7 Lambda Security

- Grant each Lambda function its own IAM execution role — never share roles between functions.
- Scope permissions to the exact resources the function accesses.
- Use environment variable encryption with KMS for sensitive configuration.
- Set reserved concurrency limits to prevent runaway invocations.
- Use VPC-attached Lambda for accessing private resources; add VPC endpoints for
  AWS service calls.
- For function URLs: use `AuthType AWS_IAM` (not `NONE`) in production.
- As of October 2025, new function URLs require both `lambda:InvokeFunctionUrl` and
  `lambda:InvokeFunction` permissions.
- Validate and sanitize all input — Lambda functions are not immune to injection attacks.

### 3.8 RDS Security

- Deploy RDS instances in private subnets only — never assign public IP addresses.
- Enable encryption at rest (KMS) and enforce SSL/TLS for connections.
- Use IAM database authentication instead of static passwords where supported.
- Enable automated backups with point-in-time recovery.
- Enable Enhanced Monitoring and Performance Insights.
- Use security groups to restrict access to application subnets only.
- Enable deletion protection on production databases.

---

## 4. Vulnerability Catalog

### VULN-AWS-001: S3 Public Bucket Exposure

- **Severity:** Critical
- **CWE:** CWE-284 (Improper Access Control)
- **Description:** S3 buckets with public ACLs or bucket policies exposing data to the internet.
- **Impact:** Data breach, regulatory fines, reputational damage.
- **Detection:** AWS Config rule `s3-bucket-public-read-prohibited`, Security Hub, Prowler.
- **Remediation:** Enable S3 Block Public Access at the account level. Review and remove
  public ACLs and bucket policies. Use VPC endpoints for internal access.

### VULN-AWS-002: IAM Wildcard Policies

- **Severity:** Critical
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **Description:** IAM policies using `"Action": "*"` or `"Resource": "*"` granting
  unrestricted access.
- **Impact:** Lateral movement, privilege escalation, full account compromise.
- **Detection:** IAM Access Analyzer, AWS Config rule `iam-policy-no-statements-with-admin-access`.
- **Remediation:** Replace wildcards with specific actions and resource ARNs. Use
  permissions boundaries. Audit with Access Analyzer.

### VULN-AWS-003: IMDSv1 SSRF Credential Theft

- **Severity:** Critical
- **CWE:** CWE-918 (Server-Side Request Forgery)
- **Description:** EC2 instances using IMDSv1 allow unauthenticated HTTP GET requests to
  `169.254.169.254`, enabling SSRF attacks to steal IAM role credentials.
- **Impact:** Full credential theft for the attached IAM role. Root cause of Capital One breach.
- **Detection:** AWS Config rule `ec2-imdsv2-check`, Prowler check `ec2_imdsv2_enabled`.
- **Remediation:** Enforce IMDSv2 on all EC2 instances:

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-1234567890abcdef0 \
  --http-tokens required \
  --http-put-response-hop-limit 1 \
  --http-endpoint enabled
```

IMDSv2 requires a PUT request with a custom header to obtain a session token,
blocking most SSRF exploits that can only issue GET requests.

### VULN-AWS-004: Unencrypted EBS Volumes

- **Severity:** High
- **CWE:** CWE-311 (Missing Encryption of Sensitive Data)
- **Description:** EBS volumes storing data without encryption at rest.
- **Impact:** Data exposure if volumes are shared, snapshot is made public, or physical
  media is compromised.
- **Detection:** AWS Config rule `encrypted-volumes`, Security Hub.
- **Remediation:** Enable default EBS encryption in account settings. Encrypt existing
  volumes by creating encrypted snapshots and restoring.

### VULN-AWS-005: Unencrypted RDS Instances

- **Severity:** High
- **CWE:** CWE-311 (Missing Encryption of Sensitive Data)
- **Description:** RDS instances without encryption at rest or SSL/TLS enforcement.
- **Impact:** Database contents exposed at rest or in transit.
- **Detection:** AWS Config rule `rds-storage-encrypted`, `rds-cluster-encryption-at-rest-check`.
- **Remediation:** Enable encryption at creation (cannot be added to existing instances —
  must create encrypted snapshot and restore). Enforce SSL via RDS parameter group
  `rds.force_ssl = 1`.

### VULN-AWS-006: Overly Permissive Security Groups

- **Severity:** High
- **CWE:** CWE-284 (Improper Access Control)
- **Description:** Security groups allowing inbound traffic from `0.0.0.0/0` on
  sensitive ports (22, 3389, 3306, 5432, 6379, 27017).
- **Impact:** Unauthorized access to SSH, RDP, databases, caches.
- **Detection:** AWS Config rules `restricted-ssh`, `restricted-common-ports`, Security Hub.
- **Remediation:** Restrict ingress to specific CIDR ranges or security group references.
  Use AWS Systems Manager Session Manager instead of SSH. Use VPN or Direct Connect
  for administrative access.

### VULN-AWS-007: Root Account Usage

- **Severity:** Critical
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **Description:** Using the AWS root account for daily operations instead of federated
  IAM roles or IAM Identity Center.
- **Impact:** Root has unrestricted access — compromise means total account takeover.
- **Detection:** CloudTrail events with `userIdentity.type = Root`, AWS Config rule
  `root-account-mfa-enabled`.
- **Remediation:** Enable MFA on root (hardware key). Create IAM roles for all operations.
  Use root only for tasks that require it (account-level settings). Set up CloudWatch
  alarm for root login events.

### VULN-AWS-008: Missing CloudTrail

- **Severity:** Critical
- **CWE:** CWE-778 (Insufficient Logging)
- **Description:** CloudTrail not enabled or not covering all regions, preventing
  audit and forensic investigation.
- **Impact:** No visibility into API calls. Cannot detect or investigate breaches.
- **Detection:** AWS Config rule `cloud-trail-enabled`, `multi-region-cloud-trail-enabled`.
- **Remediation:** Enable multi-region CloudTrail with log file validation. Store logs
  in a dedicated S3 bucket with Object Lock (WORM). Enable CloudTrail Insights for
  anomaly detection.

### VULN-AWS-009: Lambda Function URL Without Auth

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **Description:** Lambda function URLs configured with `AuthType: NONE`, making them
  publicly accessible without authentication.
- **Impact:** Unauthorized invocation, data exfiltration, resource abuse, cost explosion.
- **Detection:** AWS Config custom rule, Prowler, manual review.
- **Remediation:** Set `AuthType: AWS_IAM` for production functions. Use API Gateway
  with authorizers for complex authentication requirements. If public access is
  required, add WAF and rate limiting.

### VULN-AWS-010: Cross-Account Role Trust Too Broad

- **Severity:** High
- **CWE:** CWE-284 (Improper Access Control)
- **Description:** IAM role trust policies allowing `"Principal": {"AWS": "*"}` or
  overly broad account trust without external ID conditions.
- **Impact:** Any AWS account can assume the role and access resources.
- **Detection:** IAM Access Analyzer external access findings.
- **Remediation:** Specify exact account IDs in trust policies. Require `sts:ExternalId`
  condition for third-party cross-account access. Use AWS Organizations conditions
  (`aws:PrincipalOrgID`) where applicable.

### VULN-AWS-011: Unrotated Access Keys

- **Severity:** Medium
- **CWE:** CWE-324 (Use of a Key Past its Expiration Date)
- **Description:** IAM user access keys not rotated within 90 days.
- **Impact:** Stale credentials increase window of exposure if compromised.
- **Detection:** AWS Config rule `access-keys-rotated`, IAM Credential Report.
- **Remediation:** Rotate access keys every 90 days. Prefer IAM roles with temporary
  credentials over long-lived access keys. Use IAM Identity Center for human access.

### VULN-AWS-012: S3 Bucket Without Versioning

- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **Description:** S3 buckets without versioning enabled, preventing recovery from
  accidental deletion or ransomware encryption.
- **Impact:** Permanent data loss from accidental or malicious deletion.
- **Detection:** AWS Config rule `s3-bucket-versioning-enabled`.
- **Remediation:** Enable versioning on all buckets. Combine with Object Lock for
  immutable backups. Set lifecycle policies to manage version storage costs.

### VULN-AWS-013: CloudFront Without WAF

- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **Description:** CloudFront distributions serving web applications without AWS WAF
  protection.
- **Impact:** Exposure to SQL injection, XSS, DDoS, bot attacks.
- **Detection:** AWS Config rule, Security Hub.
- **Remediation:** Associate AWS WAF web ACL with CloudFront distribution. Enable
  AWS Managed Rule Groups. Configure rate-based rules.

### VULN-AWS-014: ECS/EKS Task Roles Too Permissive

- **Severity:** High
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **Description:** Container task roles with broad permissions shared across services.
- **Impact:** Container escape or compromise leads to lateral movement.
- **Detection:** IAM Access Analyzer, Prowler.
- **Remediation:** Assign per-task IAM roles with minimum required permissions. Use
  EKS Pod Identity or IRSA (IAM Roles for Service Accounts) for Kubernetes workloads.

---

## 5. Security Checklist

### Identity and Access Management
- [ ] Root account has hardware MFA enabled and no access keys
- [ ] All IAM users have MFA enabled for console access
- [ ] No IAM policies use `"Action": "*"` or `"Resource": "*"`
- [ ] Permissions boundaries are set for delegated administration
- [ ] IAM access keys are rotated within 90 days
- [ ] Unused IAM users, roles, and credentials are removed
- [ ] IAM Identity Center (SSO) is used for human access
- [ ] Service Control Policies (SCPs) restrict dangerous actions at the org level

### Data Protection
- [ ] S3 Block Public Access enabled at account level
- [ ] All S3 buckets have default encryption (SSE-KMS preferred)
- [ ] S3 bucket policies enforce TLS (`aws:SecureTransport`)
- [ ] EBS default encryption enabled in account settings
- [ ] RDS instances encrypted at rest with KMS
- [ ] KMS key rotation enabled (annual minimum)
- [ ] Secrets stored in Secrets Manager or SSM Parameter Store (not in code)

### Network Security
- [ ] No security groups allow 0.0.0.0/0 ingress on ports 22, 3389, or database ports
- [ ] Workloads deployed in private subnets
- [ ] VPC endpoints configured for S3, DynamoDB, and other frequently-used services
- [ ] VPC Flow Logs enabled on all VPCs
- [ ] WAF deployed in front of all public-facing endpoints

### Monitoring and Detection
- [ ] CloudTrail enabled in all regions with log file validation
- [ ] CloudTrail logs stored in a separate account with Object Lock
- [ ] GuardDuty enabled in all accounts and regions
- [ ] Security Hub enabled with CIS AWS Foundations Benchmark v5.0
- [ ] CloudWatch alarms configured for root account login
- [ ] AWS Config enabled with required rules in all regions

### Compute Security
- [ ] IMDSv2 enforced on all EC2 instances
- [ ] Lambda functions have dedicated, least-privilege execution roles
- [ ] Lambda function URLs use `AuthType AWS_IAM` in production
- [ ] ECS/EKS workloads use per-task/per-pod IAM roles
- [ ] AMIs are hardened and regularly patched

### Incident Response
- [ ] Incident response runbooks documented and tested
- [ ] GuardDuty findings integrated with alerting (SNS, PagerDuty, Slack)
- [ ] Automated remediation for high-severity findings
- [ ] AWS Detective enabled for investigation workflows

---

## 6. Tools and Automation

### AWS-Native Security Services

| Service             | Purpose                                                       |
|---------------------|---------------------------------------------------------------|
| **Security Hub**    | Centralized security findings aggregation, compliance scoring  |
| **GuardDuty**       | Intelligent threat detection using ML, anomaly detection       |
| **IAM Access Analyzer** | Identifies unused access, external access, policy validation |
| **AWS Config**      | Continuous configuration compliance monitoring, auto-remediation |
| **CloudTrail**      | API audit logging across all AWS services                      |
| **Detective**       | Root cause investigation using graph analysis                  |
| **Inspector**       | Automated vulnerability scanning for EC2, Lambda, ECR          |
| **Macie**           | S3 data classification, PII/sensitive data discovery           |
| **KMS**             | Key management, encryption, digital signing                    |
| **WAF**             | Web application firewall with managed and custom rules         |
| **Shield**          | DDoS protection (Standard free, Advanced paid)                 |
| **Firewall Manager**| Centralized security policy management across accounts         |

### Open-Source Security Tools

**Prowler** — AWS/Azure/GCP/K8s security auditing. Runs 300+ checks against CIS,
NIST 800-53, GDPR, HIPAA, PCI-DSS. Generates findings in JSON, CSV, HTML, JUnit-XML.
Completes scans in 5-15 minutes. Integrates with Security Hub.

```bash
# Install and run Prowler against all CIS checks
pip install prowler
prowler aws --compliance cis_3.0_aws
prowler aws --severity critical high --output-formats json html
```

**ScoutSuite** — Multi-cloud security auditor that collects configuration data via
APIs and generates an interactive HTML report. Analyzes EC2, S3, IAM, RDS, VPC, and
other services against security best practices and CIS standards.

```bash
# Install and run ScoutSuite
pip install scoutsuite
scout aws --report-dir ./scout-report
```

**Steampipe** — Query AWS APIs using SQL. Zero-ETL approach connects to 500+ data
sources. Includes compliance benchmarks as code.

```bash
# Install and run CIS benchmark
steampipe plugin install aws
steampipe check benchmark.cis_v300
```

**Checkov** — Static analysis for IaC (Terraform, CloudFormation, Kubernetes, Helm).
2000+ built-in policies. Runs in CI/CD pipelines.

```bash
# Scan Terraform files
pip install checkov
checkov -d ./terraform/ --framework terraform --check HIGH,CRITICAL
```

**tfsec** — Terraform-focused static security scanner by Aqua Security. Fast Go-based
analysis with low false-positive rate.

```bash
# Scan Terraform files
brew install tfsec
tfsec ./terraform/ --minimum-severity HIGH
```

### CI/CD Integration Pattern

```yaml
# GitHub Actions example: IaC security scanning
name: Security Scan
on: [pull_request]
jobs:
  iac-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: ./terraform
          framework: terraform
          output_format: sarif
          soft_fail: false
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          working_directory: ./terraform
          soft_fail: false
```

---

## 7. Platform-Specific Guidance

### 7.1 EC2

- Enforce IMDSv2 (`http-tokens: required`, `http-put-response-hop-limit: 1`).
- Use AWS Systems Manager Session Manager instead of SSH (no open port 22).
- Harden AMIs: remove default users, disable password auth, install security agents.
- Use EC2 Instance Connect for emergency SSH access (temporary keys).
- Enable detailed monitoring and install CloudWatch Agent.
- Use launch templates with encrypted EBS volumes and IMDSv2 enforcement.
- Apply security patches via Systems Manager Patch Manager on a regular schedule.

### 7.2 S3

- Enable S3 Block Public Access at the account level (non-negotiable).
- Enable default encryption (SSE-KMS for regulated data, SSE-S3 minimum).
- Enable versioning and consider Object Lock for compliance/backup buckets.
- Enable S3 access logging to a dedicated logging bucket.
- Use S3 Lifecycle policies to transition/expire objects and reduce attack surface.
- Use VPC endpoints for application access — avoid exposing buckets publicly.
- Enable Macie for automated PII/sensitive data classification.

### 7.3 RDS

- Deploy in private subnets only. Never enable public accessibility.
- Enforce SSL/TLS connections via parameter group (`rds.force_ssl = 1`).
- Use IAM database authentication where supported (MySQL, PostgreSQL).
- Enable encryption at rest with customer-managed KMS keys.
- Configure automated backups (35-day retention for production).
- Enable deletion protection on production databases.
- Use Multi-AZ deployments for high availability and automated failover.
- Restrict security group ingress to application subnets only.

### 7.4 Lambda

- One execution role per function — never share roles.
- Store secrets in Secrets Manager, reference via environment variable containing ARN.
- Enable X-Ray tracing for observability.
- Set function timeout and memory limits appropriately.
- Use Lambda Powertools for structured logging and security utilities.
- Pin runtime versions and review dependency vulnerabilities.
- For function URLs, always use `AuthType AWS_IAM` unless there is a specific,
  documented reason for public access.

### 7.5 ECS/EKS

- Use Fargate to eliminate host management responsibility where possible.
- Assign per-task IAM roles (ECS task role, not the EC2 instance role).
- For EKS, use Pod Identity or IRSA (IAM Roles for Service Accounts).
- Scan container images with ECR image scanning (Inspector integration).
- Use private ECR repositories. Enable image tag immutability.
- Enable GuardDuty EKS Audit Log Monitoring and Runtime Monitoring.
- Enforce network policies in EKS to restrict pod-to-pod communication.
- Run containers as non-root users with read-only root filesystems.

### 7.6 CloudFront

- Use Origin Access Control (OAC) for S3 origins — not the legacy OAI.
- Enforce minimum TLS 1.2 on viewer connections.
- Attach WAF web ACL with managed rule groups.
- Use signed URLs or signed cookies for restricted content.
- Enable access logging to S3 for analysis.
- Configure custom error pages to avoid leaking backend information.
- Set appropriate `Cache-Control` headers to prevent caching of sensitive data.

### 7.7 API Gateway

- Use IAM authorization, Cognito authorizers, or Lambda authorizers — never leave
  APIs unauthenticated in production.
- Enable request validation on the API Gateway level.
- Configure throttling and rate limiting per API key or usage plan.
- Enable API Gateway access logging to CloudWatch.
- Use resource policies to restrict access by IP, VPC endpoint, or account.
- Enable WAF integration for web-facing REST APIs.
- Use private API endpoints with VPC endpoints for internal services.

---

## 8. Incident Patterns

### 8.1 S3 Data Exposure Detection and Response

**Detection signals:**
- Macie alert: sensitive data (PII, PHI, credentials) found in public bucket.
- Security Hub finding: `S3.2 — S3 buckets should prohibit public read access`.
- CloudTrail: `PutBucketAcl` or `PutBucketPolicy` with public access grant.
- External notification: researcher or media report of exposed data.

**Response playbook:**
1. Immediately block public access: enable S3 Block Public Access on the bucket.
2. Preserve evidence: snapshot CloudTrail logs, S3 access logs, bucket policy history.
3. Assess scope: use Macie to classify data in the bucket. Check S3 access logs for
   who accessed the data and when.
4. Determine exposure window: correlate CloudTrail `PutBucketAcl`/`PutBucketPolicy`
   timestamps with first external access in S3 access logs.
5. Notify: follow breach notification requirements (GDPR 72 hours, HIPAA 60 days,
   state laws vary).
6. Remediate root cause: implement S3 Block Public Access at account level via SCP.
7. Post-incident: add AWS Config rule, update IaC templates, review similar buckets.

### 8.2 Credential Compromise Detection and Response

**Detection signals:**
- GuardDuty finding: `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS`.
- GuardDuty finding: `Discovery:IAMUser/AnomalousBehavior`.
- CloudTrail: API calls from unexpected IP addresses or regions.
- CloudTrail: `ConsoleLogin` without MFA from unfamiliar location.
- GitHub/GitGuardian alert: AWS credentials committed to repository.

**Response playbook:**
1. Identify compromised credentials: determine if it is an IAM user key, IAM role
   session, or root credentials.
2. For IAM user keys: immediately deactivate the access key (do not delete yet —
   needed for forensics). Create a new key if the user needs continued access.
3. For IAM roles: revoke active sessions by adding a deny-all inline policy with
   a `DateLessThan` condition on `aws:TokenIssueTime`.
4. Investigate: use CloudTrail to enumerate all API calls made with the compromised
   credentials. Check for new IAM users, roles, policies, EC2 instances, Lambda
   functions, or data exfiltration.
5. Contain: remove any persistence mechanisms (backdoor IAM users, roles, policies,
   Lambda functions, EC2 instances).
6. Eradicate: rotate all credentials in the affected account. Review and harden
   IAM policies.
7. Enable AWS Detective for graph-based investigation of the incident timeline.

### 8.3 GuardDuty Findings Response Matrix

| Finding Type                                  | Severity | Immediate Action                      |
|-----------------------------------------------|----------|---------------------------------------|
| `Recon:EC2/PortProbeUnprotectedPort`          | Low      | Review security group, restrict port   |
| `UnauthorizedAccess:EC2/SSHBruteForce`        | Medium   | Restrict SSH source IPs, use SSM       |
| `CryptoCurrency:EC2/BitcoinTool.B!DNS`        | High     | Isolate instance, investigate          |
| `Trojan:EC2/BlackholeTraffic`                 | High     | Isolate instance, forensic analysis    |
| `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration` | Critical | Revoke sessions, investigate |
| `Exfiltration:S3/AnomalousBehavior`           | High     | Block access, review S3 logs           |
| `Impact:S3/AnomalousBehavior.Permission`      | High     | Restore bucket policy, investigate     |
| `CredentialAccess:Kubernetes/MaliciousIPCaller`| High    | Isolate pod, review RBAC               |

---

## 9. Compliance and Standards

### 9.1 CIS AWS Foundations Benchmark

The CIS AWS Foundations Benchmark is the most widely adopted AWS security standard.
AWS Security Hub supports versions 1.2.0, 1.4.0, 3.0.0, and 5.0.0.

**Version 5.0.0** (latest, supported since October 2025):
- 40 automated security controls.
- Controls organized into Level 1 (basic security, minimal disruption) and Level 2
  (higher security, may impact functionality).
- Covers IAM, logging, monitoring, networking, and storage.

Key control areas:
- IAM: no root access keys, MFA on root, rotate credentials, no wildcard policies.
- Logging: CloudTrail in all regions, log file validation, S3 access logging.
- Monitoring: CloudWatch alarms for unauthorized API calls, root login, IAM changes.
- Networking: no default VPC usage, restricted security groups, VPC Flow Logs.

### 9.2 AWS Well-Architected Security Pillar

The Security Pillar covers seven design principles and six best practice areas:

**Design Principles:**
1. Implement a strong identity foundation.
2. Maintain traceability.
3. Apply security at all layers.
4. Automate security best practices.
5. Protect data in transit and at rest.
6. Keep people away from data.
7. Prepare for security events.

**Best Practice Areas:**
1. Security foundations (shared responsibility, account structure, governance).
2. Identity and access management (human and machine identities).
3. Detection (logging, monitoring, anomaly detection).
4. Infrastructure protection (network, compute, edge protection).
5. Data protection (classification, encryption, backup).
6. Incident response (preparation, simulation, forensics).

### 9.3 SOC 2 on AWS

- Map SOC 2 Trust Services Criteria to AWS services and configurations.
- Use AWS Artifact for SOC 2 compliance reports (AWS's own SOC 2 Type II report).
- Key controls: CloudTrail (CC6.1 — logical access), Config (CC7.1 — system monitoring),
  GuardDuty (CC6.8 — threat detection), KMS (CC6.1 — encryption).
- Document shared responsibility clearly — AWS manages physical security, you manage
  logical access, data protection, and application security.

### 9.4 PCI-DSS on AWS

- Use AWS PCI-DSS compliance package (AWS is a PCI-DSS Level 1 Service Provider).
- Isolate Cardholder Data Environment (CDE) in a dedicated VPC or account.
- Encrypt cardholder data at rest (KMS) and in transit (TLS 1.2+).
- Implement network segmentation between CDE and non-CDE environments.
- Enable file integrity monitoring on EC2 instances processing cardholder data.
- Maintain audit trails: CloudTrail (Requirement 10), Config (Requirement 2).
- Regular vulnerability scanning: Inspector (Requirement 11.2), penetration testing
  (Requirement 11.3).

### 9.5 HIPAA on AWS

- Sign a Business Associate Agreement (BAA) with AWS — required for HIPAA workloads.
- Only use HIPAA-eligible AWS services (listed in the BAA).
- Encrypt all Protected Health Information (PHI) at rest and in transit.
- Enable CloudTrail logging for all access to PHI.
- Implement access controls: IAM policies restricting PHI access to authorized roles.
- Enable Macie to scan S3 for PHI exposure.
- Use separate accounts or VPCs for PHI workloads.
- Maintain minimum necessary standard — grant access only to the minimum PHI needed.

---

## 10. Code Examples

### 10.1 CloudTrail Configuration (Terraform)

```hcl
resource "aws_cloudtrail" "main" {
  name                          = "org-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  enable_logging                = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn

  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_cloudwatch.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }

  insight_selector {
    insight_type = "ApiErrorRateInsight"
  }

  tags = {
    Environment = "security"
    ManagedBy   = "terraform"
  }
}

# Dedicated logging bucket with Object Lock
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket        = "org-cloudtrail-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  object_lock_enabled = true

  tags = {
    Purpose = "CloudTrail audit logs"
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.cloudtrail.id
    }
    bucket_key_enabled = true
  }
}
```

### 10.2 IMDSv2 Enforcement (Terraform)

**Insecure — IMDSv1 allowed (default on older instances):**

```hcl
# BAD: IMDSv1 is enabled by default, vulnerable to SSRF
resource "aws_instance" "insecure" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"
  # No metadata_options block = IMDSv1 enabled
}
```

**Secure — IMDSv2 enforced:**

```hcl
resource "aws_instance" "secure" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Forces IMDSv2
    http_put_response_hop_limit = 1           # Prevents container escape
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    encrypted  = true
    kms_key_id = aws_kms_key.ebs.arn
  }

  tags = {
    Name = "secure-instance"
  }
}
```

### 10.3 GuardDuty with SNS Alerting (Terraform)

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
}

# Alert on high-severity findings
resource "aws_cloudwatch_event_rule" "guardduty_high" {
  name        = "guardduty-high-severity"
  description = "Alert on GuardDuty high/critical findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 7] }]
    }
  })
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_high.name
  target_id = "guardduty-alerts"
  arn       = aws_sns_topic.security_alerts.arn
}

resource "aws_sns_topic" "security_alerts" {
  name              = "security-alerts"
  kms_master_key_id = aws_kms_key.sns.id
}
```

### 10.4 Secure Security Group Pattern (Terraform)

```hcl
# Application Load Balancer — HTTPS only from the internet
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "ALB - HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "To application servers"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

# Application servers — only from ALB
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "App servers - from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description     = "To database"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
  }

  egress {
    description = "To AWS services via VPC endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }
}

# Database — only from application servers
resource "aws_security_group" "db" {
  name        = "db-sg"
  description = "Database - from app servers only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "No outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }
}
```

### 10.5 AWS Config Compliance Rules (Terraform)

```hcl
resource "aws_config_config_rule" "s3_public_read" {
  name = "s3-bucket-public-read-prohibited"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
}

resource "aws_config_config_rule" "iam_no_admin" {
  name = "iam-policy-no-admin-access"
  source {
    owner             = "AWS"
    source_identifier = "IAM_POLICY_NO_STATEMENTS_WITH_ADMIN_ACCESS"
  }
}

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"
  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }
}

resource "aws_config_config_rule" "imdsv2" {
  name = "ec2-imdsv2-check"
  source {
    owner             = "AWS"
    source_identifier = "EC2_IMDSV2_CHECK"
  }
}

resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "multi-region-cloudtrail-enabled"
  source {
    owner             = "AWS"
    source_identifier = "MULTI_REGION_CLOUD_TRAIL_ENABLED"
  }
}

resource "aws_config_config_rule" "rds_encrypted" {
  name = "rds-storage-encrypted"
  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }
}

resource "aws_config_config_rule" "root_mfa" {
  name = "root-account-mfa-enabled"
  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }
}
```

---

## References

- AWS Well-Architected Security Pillar: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html
- CIS AWS Foundations Benchmark: https://www.cisecurity.org/benchmark/amazon_web_services
- AWS Security Best Practices Whitepaper: https://docs.aws.amazon.com/whitepapers/latest/aws-security-best-practices/welcome.html
- IAM Security Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- Capital One Breach Analysis: https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/
- Capital One Breach (ACM): https://dl.acm.org/doi/full/10.1145/3546068
- Twitch Data Breach: https://thehackernews.com/2021/10/twitch-suffers-massive-125gb-data-and.html
- AWS IMDSv2 Defense: https://aws.amazon.com/blogs/security/defense-in-depth-open-firewalls-reverse-proxies-ssrf-vulnerabilities-ec2-instance-metadata-service/
- Prowler: https://github.com/prowler-cloud/prowler
- ScoutSuite: https://github.com/nccgroup/ScoutSuite
- Steampipe: https://steampipe.io/
- Checkov: https://www.checkov.io/
- Datadog State of Cloud Security 2024: https://www.datadoghq.com/state-of-cloud-security/
- Qualys IMDSv1 Research: https://blog.qualys.com/vulnerabilities-threat-research/2024/09/12/totalcloud-insights-unmasking-aws-instance-metadata-service-v1-imdsv1-the-hidden-flaw-in-aws-security
