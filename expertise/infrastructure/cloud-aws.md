# Cloud AWS — Expertise Module

> An AWS cloud specialist designs, builds, and operates production infrastructure on Amazon Web Services,
> covering account governance, networking, compute, storage, databases, security, and cost optimization.
> Scope spans from single-service deployments to enterprise multi-account, multi-region architectures.

---

## Core Patterns & Conventions

### Account Structure

- **AWS Organizations** — group accounts into Organizational Units (OUs): Security, Infrastructure, Workloads (prod/staging/dev), Sandbox.
- **Control Tower** — automated landing zone with guardrails (SCPs + Config rules). Use Account Factory for self-service account provisioning.
- **Dedicated accounts** — separate accounts for: log archive, security tooling, shared networking, each workload environment. Never mix dev and prod in one account.
- **Service Control Policies (SCPs)** — enforce organization-wide guardrails (deny region sprawl, deny root usage, restrict service access). Test SCPs in a sandbox OU before applying broadly.
- **Resource Control Policies (RCPs)** — introduced late 2024, complement SCPs by controlling resource-based policies directly. Use RCPs to build a data perimeter ensuring only trusted identities access resources.

### Networking

- **VPC design** — use `/16` VPCs unless constrained. Allocate at least 3 subnets per AZ: public, private (app), private (data). Reserve CIDR space for future growth.
- **Security groups** — stateful, instance-level firewalls. Reference other security groups instead of CIDR ranges where possible. Never use `0.0.0.0/0` on ingress except for public ALBs/NLBs.
- **NACLs** — stateless, subnet-level. Use as a coarse second layer; primary filtering should be via security groups.
- **Transit Gateway** — hub for >5 VPCs. Place in a dedicated Network Services account, share via AWS RAM. Use a single TGW per Region; attach at least one subnet per AZ. Route untrusted traffic through a Security VPC — never allow direct untrusted-to-production routes.
- **VPC Endpoints** — use Gateway endpoints (S3, DynamoDB — free) and Interface endpoints (other services) to keep traffic off the public internet. Apply endpoint policies for least-privilege access.
- **DNS** — Route 53 private hosted zones associated with VPCs. Use Route 53 Resolver for hybrid DNS with on-premises.

### Compute Patterns

- **Lambda** — event-driven, sub-15-minute tasks. Use ARM64 (Graviton) for 20% cost savings and 45-65% cold start reduction. Use SnapStart for Java workloads (reduces cold starts to 90-140ms). Memory allocation directly proportional to CPU — right-size with AWS Lambda Power Tuning.
- **ECS/Fargate** — containerized workloads without managing instances. Fargate for variable workloads; EC2 launch type for steady-state with Savings Plans. Use ECS Exec for debugging. Native blue/green deployments available since July 2025.
- **EKS** — when Kubernetes is a hard requirement (multi-cloud portability, existing K8s tooling, complex service mesh). Higher operational cost than ECS; justified only at scale or with existing K8s expertise.
- **EC2** — full control needed (GPU, custom kernels, license-bound software). Always use Auto Scaling Groups. Use Graviton (arm64) instances for 40% better price-performance.
- **App Runner** — simplest container deployment for web apps/APIs when you want zero infrastructure management.

### Storage

- **S3** — default storage for objects. Enable versioning on production buckets. Use lifecycle policies: Standard -> Intelligent-Tiering -> Glacier Instant Retrieval -> Glacier Deep Archive.
- **S3 security** — Block Public Access at account level. Enforce SSE-KMS encryption via bucket policy. Enable S3 Access Logging and S3 Object Lock for compliance.
- **EBS** — gp3 is the default choice (3,000 IOPS baseline, cheaper than gp2). Use io2 Block Express for high-IOPS databases. Snapshot lifecycle policies for backups.
- **EFS** — shared POSIX file system for multi-AZ access. Enable Infrequent Access (IA) tiering for cost savings. Use throughput modes appropriate to workload: bursting vs. provisioned vs. elastic.

### Database Services

- **RDS** — managed relational databases (PostgreSQL, MySQL, SQL Server, Oracle). Multi-AZ for HA. Use read replicas for read scaling. Enable automated backups with sufficient retention.
- **Aurora** — 5x throughput over standard MySQL, 3x over PostgreSQL. Aurora Serverless v2 for variable workloads (scales in 0.5 ACU increments). Aurora Global Database for cross-region DR with <1s replication lag.
- **DynamoDB** — single-digit ms latency NoSQL. Use on-demand capacity for unpredictable traffic, provisioned with auto-scaling for steady workloads. Design partition keys for uniform distribution (high cardinality). Use single-table design for related entities. Enable Point-in-Time Recovery. DynamoDB Accelerator (DAX) for microsecond read caching.
- **ElastiCache** — Redis for caching, session storage, leaderboards. Memcached for simple key-value caching. Use cluster mode for horizontal scaling. Enable encryption in-transit and at-rest.

### Messaging & Orchestration

- **SQS** — decoupled async processing. Standard queues for high throughput; FIFO for exactly-once, ordered delivery. Set visibility timeout > processing time. Use Dead Letter Queues (DLQ) with maxReceiveCount.
- **SNS** — fan-out pub/sub. Combine with SQS for reliable fan-out (SNS -> multiple SQS queues). Use message filtering to reduce unnecessary processing.
- **EventBridge** — event bus for event-driven architectures. Schema registry for governance. Content-based filtering in rules. Supports 1M events/sec with sub-50ms latency. Over 50 SaaS integrations. Use for cross-account and cross-service event routing.
- **Step Functions** — orchestrate multi-step workflows. Use Standard workflows for long-running (up to 1 year); Express workflows for high-volume, short-duration (<5 min). Prefer direct SDK integrations over Lambda proxies.

### IAM Best Practices

- **Never use root account** — enable MFA (hardware/FIDO2), delete root access keys, lock with SCP.
- **Least privilege** — start with zero permissions, add only what is needed. Use IAM Access Analyzer to identify unused permissions and external access. Review service-last-accessed data to prune unused permissions.
- **Roles over users** — use IAM roles for services, EC2 instances, Lambda, ECS tasks. Use IAM Identity Center (successor to SSO) for human access with federated identity.
- **Permission boundaries** — cap maximum permissions for delegated admin scenarios. Layer with SCPs for defense in depth.
- **Conditions** — use `aws:SourceVpc`, `aws:PrincipalOrgID`, `aws:RequestedRegion` conditions to narrow access. Tag-based access control (ABAC) for scalable permissions.

### Infrastructure as Code

- **AWS CDK** — preferred for teams writing application code (TypeScript, Python, Java, Go). L2/L3 constructs for best-practice defaults. Use `cdk-nag` for compliance checks. Use Aspects for cross-cutting concerns. CDK Refactor (since September 2025) for safe stack reorganization. Separate stacks by lifecycle (stateful vs. stateless).
- **Terraform** — preferred for multi-cloud or when team has existing Terraform expertise. Use remote state (S3 + DynamoDB locking). Modules for reusable components. Use `checkov` or `tfsec` for security scanning.
- **CloudFormation** — underlying engine for CDK. Use directly only when CDK/Terraform are not viable. StackSets for multi-account/multi-region deployments.
- **General IaC rules** — never make manual console changes to production. Use drift detection. Pin provider/module versions. Review plans/diffs before apply.

---

## Anti-Patterns & Pitfalls

### 1. Single-Account Everything
**Problem:** Mixing dev/staging/prod in one account. No blast radius isolation. A dev mistake can take down production. Cost attribution is impossible.
**Fix:** AWS Organizations with dedicated accounts per environment. Control Tower for governance.

### 2. Long-Lived IAM Access Keys
**Problem:** Static credentials stored in code, CI/CD secrets, or developer machines. Key rotation is manual and rarely done. Leaked keys are the #1 cause of AWS breaches.
**Fix:** Use IAM roles with temporary credentials. OIDC federation for CI/CD (GitHub Actions, GitLab). IAM Identity Center for human access.

### 3. Overly Permissive IAM Policies
**Problem:** Using `Action: "*"` or `Resource: "*"` grants far more access than needed. 44% of cloud data thefts in 2025 involved IAM misconfigurations.
**Fix:** Start with zero permissions. Use IAM Access Analyzer. Scope policies to specific actions and resources. Use permission boundaries.

### 4. No Encryption Strategy
**Problem:** Data at rest and in transit left unencrypted. Compliance violations (HIPAA, PCI, GDPR). Regulatory fines and data breach liability.
**Fix:** Enforce encryption everywhere: SSE-KMS for S3, encrypted EBS/RDS, TLS for data in transit. Use KMS customer-managed keys (CMKs) with automatic rotation.

### 5. Ignoring Cost Management
**Problem:** No budgets, no alerts, no right-sizing. Surprise bills from forgotten resources, over-provisioned instances, or unoptimized storage classes. Hidden data transfer costs.
**Fix:** AWS Budgets with alerts. Cost Explorer for analysis. Savings Plans for steady workloads. Spot instances for fault-tolerant jobs. Tag everything for cost allocation.

### 6. Manual Infrastructure Changes
**Problem:** Console clickops creates configuration drift, is unreproducible, and impossible to audit. Leads to inconsistencies between environments.
**Fix:** All changes through IaC (CDK/Terraform). Use SCPs to deny console write access in production accounts. Enable CloudFormation drift detection.

### 7. Single-AZ Deployments
**Problem:** An AZ failure takes down the entire application. No redundancy. Violates the reliability pillar of Well-Architected Framework.
**Fix:** Multi-AZ for RDS, ElastiCache, ECS/EKS. ALB/NLB across AZs. Auto Scaling Groups spanning at least 2 AZs (preferably 3).

### 8. Monolithic Lambda Functions
**Problem:** Cramming entire applications into a single Lambda. Large deployment packages cause slow cold starts. 10GB memory and 15-minute limits are not substitutes for proper architecture.
**Fix:** Decompose into focused, single-purpose functions. Use Step Functions for orchestration. Move long-running tasks to ECS/Fargate.

### 9. DynamoDB Hot Partitions
**Problem:** Low-cardinality partition keys (e.g., `status: active/inactive`) concentrate traffic on few partitions. Causes throttling despite available table capacity.
**Fix:** Choose high-cardinality partition keys. Use write sharding for hot keys. Leverage adaptive capacity and split-for-heat (automatic since 2024). Consider composite keys in GSIs (supported since November 2025).

### 10. No Backup and Recovery Testing
**Problem:** Assuming AWS handles all backups automatically. No tested recovery procedures. RTO/RPO targets undefined.
**Fix:** AWS Backup with cross-region/cross-account copies. Regular recovery drills. Automate RDS snapshot schedules. Test restore procedures quarterly.

### 11. Public S3 Buckets
**Problem:** Data exposure leading to breaches. S3 bucket misconfigurations are still one of the most common breach vectors.
**Fix:** Enable S3 Block Public Access at the account level. Use bucket policies with explicit deny for non-TLS access. Monitor with Access Analyzer for S3.

### 12. Neglecting Logging and Monitoring
**Problem:** No audit trail for security incidents. No metrics for capacity planning. Incident response is blind.
**Fix:** CloudTrail in all regions (organization trail). VPC Flow Logs. CloudWatch alarms for key metrics. Centralize logs in a dedicated log archive account.

### 13. Hardcoding Configuration
**Problem:** Region names, account IDs, endpoints baked into code. Breaks multi-region/multi-account deployments. Secrets in plaintext in config files.
**Fix:** Use SSM Parameter Store for configuration, Secrets Manager for secrets (with automatic rotation). Environment variables for Lambda.

### 14. Ignoring Data Transfer Costs
**Problem:** Cross-AZ, cross-region, and internet egress charges can exceed compute costs. NAT Gateway data processing fees often surprise teams.
**Fix:** Use VPC endpoints (especially S3 Gateway endpoint — free). Keep traffic within AZ where possible. Use CloudFront for egress reduction. Monitor Data Transfer line items in Cost Explorer.

---

## Testing Strategy

### Infrastructure Testing

- **CDK Assertions** — unit test CDK stacks with `assertions` module. Verify resource properties, resource counts, and template structure. Run in CI on every PR.
```typescript
const template = Template.fromStack(stack);
template.hasResourceProperties('AWS::Lambda::Function', {
  Runtime: 'nodejs20.x',
  MemorySize: 1024,
  Timeout: 30,
});
template.resourceCountIs('AWS::DynamoDB::Table', 1);
```

- **Terratest** — write Go tests for Terraform modules. Deploy real infrastructure, validate, then destroy. Use for integration testing of modules.
- **cdk-nag / checkov / tfsec** — static analysis for IaC security and compliance. Integrate into CI pipelines as a gate. Catch misconfigurations before deployment.
- **CloudFormation Guard** — policy-as-code rules engine. Write rules to validate CloudFormation/CDK output templates against organizational policies.

### Load Testing

- **AWS Distributed Load Testing Solution** — CloudFormation-based solution using ECS Fargate to generate load with JMeter scripts. Scales to thousands of concurrent users.
- **Artillery / k6** — open-source load testing tools that integrate with CI/CD. Deploy agents on Fargate or Lambda for distributed testing.
- **Production load testing** — use canary deployments to gradually shift real traffic. Monitor latency percentiles (p50, p95, p99), error rates, and saturation.

### Chaos Engineering

- **AWS Fault Injection Service (FIS)** — managed chaos experiments. Scenario Library provides pre-built templates (AZ power interruption, EC2 instance termination, network latency injection, EBS I/O pause).
- **Integrate with CI/CD** — automate chaos experiments in deployment pipelines. Run FIS experiments after each deployment to validate resilience.
- **Targets** — EC2, ECS, EKS, RDS, Lambda, S3. Simulate AZ failures, network disruptions, CPU/memory stress, and DNS failures.
- **Guardrails** — set stop conditions (CloudWatch alarms) to automatically halt experiments if impact exceeds thresholds.

### Cost Testing and Estimation

- **Infracost** — estimate cost impact of IaC changes in PR reviews. Shows cost diff in CI comments.
- **AWS Pricing Calculator** — model costs before deployment.
- **Cost Anomaly Detection** — ML-based alerting for unexpected spend spikes. Configure monitors per service, account, or cost category.

---

## Performance Considerations

### Lambda Cold Starts

- **Runtime selection matters** — Python and Node.js: 100-200ms cold starts. Java/C#: 500ms-2s without SnapStart. Use SnapStart for Java to achieve 90-140ms consistently.
- **ARM64 (Graviton2)** — 45-65% cold start reduction across all runtimes, plus 20% cost savings.
- **Memory = CPU** — Lambda allocates CPU proportionally to memory. A function at 512MB cold starts ~40% faster than at 128MB. Use Lambda Power Tuning to find the optimal setting.
- **Package size** — every MB adds milliseconds. Use Lambda Layers for shared dependencies. Tree-shake unused code. Use bundlers (esbuild for Node.js).
- **Provisioned Concurrency** — eliminates cold starts entirely but incurs continuous cost. Use for latency-sensitive endpoints. Schedule scaling for predictable traffic patterns.
- **INIT phase billing** — since August 2025, AWS bills for the INIT phase. Functions with heavy startup logic see 10-50% increased costs. Move expensive initialization to lazy patterns.
- **VPC-attached Lambda** — Hyperplane ENIs reduced VPC overhead to ~100ms (down from 10+ seconds pre-2019). Still, avoid VPC attachment unless you need private resource access.

### DynamoDB Partition Design

- **Partition limits** — 3,000 RCU and 1,000 WCU per partition. Design keys to distribute load uniformly.
- **High cardinality keys** — use `userId`, `orderId`, or `tenantId#timestamp` as partition keys. Avoid `status`, `date`, or any low-cardinality attribute.
- **Write sharding** — for hot keys, append a random suffix (`item#1` through `item#10`) and scatter-gather on reads.
- **Single-table design** — store multiple entity types in one table using composite sort keys (`PK: USER#123`, `SK: ORDER#456`). Reduces table count and enables transactional access across entity types.
- **Adaptive capacity** — DynamoDB automatically splits hot partitions (split-for-heat), but initial design should still aim for uniformity.

### CloudFront Caching Strategies

- **Cache policies** — use managed policies (`CachingOptimized` for static assets, `CachingDisabled` for dynamic APIs). Create custom policies to include only necessary headers/cookies/query strings in the cache key.
- **Origin request policies** — forward data to origins without affecting cache keys (e.g., forward `Authorization` header to origin but exclude from cache key).
- **Cache invalidation** — expensive and slow at scale. Use versioned file names (`app.v2.js`) or content hashes instead.
- **TTLs** — set minimum/maximum/default TTLs at the behavior level. Use `Cache-Control` headers from the origin for fine-grained control.
- **Origin Shield** — additional caching layer that reduces origin load. Enable for high-traffic distributions with origins in a single region.

### Auto-Scaling Policies

- **Target tracking** — preferred for most workloads. Set target CPU utilization (60-70%), request count per target, or custom metrics.
- **Step scaling** — for workloads with known scaling thresholds. More granular control over scaling actions.
- **Predictive scaling** — ML-based forecasting for recurring traffic patterns. Proactively scales capacity before demand arrives.
- **Cooldown periods** — prevent oscillation. Set scale-in cooldown longer than scale-out (e.g., 300s in vs. 60s out) to avoid aggressive scale-in.

### Cost Optimization

- **Savings Plans** — Compute Savings Plans (1yr: up to 66% savings, 3yr: up to 72%) apply across EC2, Fargate, Lambda. No instance family lock-in. Use Cost Explorer recommendations to right-size commitment.
- **Spot Instances** — up to 90% savings. Use for batch processing, CI/CD, data analysis, dev/test. Not for stateful or latency-sensitive workloads. Use Spot Fleet or EC2 Auto Scaling with mixed instances policy.
- **Right-sizing** — use AWS Compute Optimizer for recommendations based on CloudWatch metrics. Review every quarter. Graviton instances provide ~40% better price-performance.
- **Storage tiering** — S3 Intelligent-Tiering for unpredictable access patterns. gp3 EBS over gp2 (20% cheaper, better baseline IOPS). Delete unattached EBS volumes and unused snapshots.
- **Reserved capacity** — still available for RDS, ElastiCache, Redshift, OpenSearch. 1-year or 3-year commitments with significant discounts.

---

## Security Considerations

### AWS Well-Architected Security Pillar

The security pillar focuses on seven design principles:
1. **Strong identity foundation** — centralize identity management, least privilege, eliminate long-term credentials.
2. **Traceability** — monitor, alert, and audit all actions and changes.
3. **Security at all layers** — defense in depth at edge, VPC, subnet, instance, OS, and application layers.
4. **Automate security** — treat security controls as code. Automate response to security events.
5. **Protect data in transit and at rest** — encryption, tokenization, access control.
6. **Keep people away from data** — eliminate direct access or manual processing of data.
7. **Prepare for security events** — incident management, forensics readiness, game days.

### Threat Detection and Posture Management

- **GuardDuty** — enable in all regions, all accounts (organization-wide). Covers EC2, EKS, ECS, Lambda, S3, RDS login activity. Extended Threat Detection (2025) correlates multi-stage attack sequences across services.
- **Security Hub** — aggregates findings from GuardDuty, Inspector, Macie, Config, Access Analyzer, and third-party tools. Enable CIS AWS Foundations and AWS Foundational Security Best Practices standards. Use automated remediation via EventBridge + Lambda/SSM.
- **Inspector** — continuous vulnerability scanning for EC2, ECR images, and Lambda functions. Integrates with Security Hub for centralized findings.
- **Macie** — ML-based sensitive data discovery in S3. Use for PII/PHI detection and compliance.
- **Access Analyzer** — identifies resources shared externally and unused access. Use for external access auditing and least-privilege refinement.

### KMS and Encryption Patterns

- **Envelope encryption** — AWS services (S3, EBS, RDS) use data keys encrypted by KMS master keys. The plaintext data key encrypts data, then is discarded from memory. Only the encrypted data key is stored alongside the ciphertext.
- **Customer-managed keys (CMKs)** — use for production workloads. Enable automatic key rotation (every year). Separate keys per service/environment.
- **Key policies** — never use `kms:*`. Grant `kms:Encrypt`, `kms:Decrypt`, `kms:GenerateDataKey` to specific roles. Separate key administrators from key users.
- **Encrypt everything** — S3 (SSE-KMS with bucket policy enforcement), EBS (default encryption at account level), RDS (encryption at creation, cannot be added later), DynamoDB (AWS-owned keys or CMKs).

### VPC Endpoint Policies

- Apply least-privilege policies to VPC endpoints restricting which principals can access which resources through the endpoint.
- S3 Gateway endpoint policy: restrict to specific buckets and actions.
- Use `aws:PrincipalOrgID` condition to restrict access to organization members only.

### Audit Logging

- **CloudTrail** — organization-wide trail logging all management events. Enable data events for S3 and Lambda selectively (high volume). Send to centralized log archive account. Enable CloudTrail Lake for SQL-based queries.
- **VPC Flow Logs** — enable for all VPCs. Send to CloudWatch Logs or S3. Use for network forensics and anomaly detection.
- **Config** — continuous compliance monitoring. Config rules evaluate resource configurations against policies. Aggregator for multi-account/multi-region view.

---

## Integration Patterns

### Event-Driven Architectures

- **EventBridge as backbone** — central event bus for domain events. Use schema registry for event contract governance. Content-based filtering in rules reduces downstream processing by up to 30%.
- **SQS for buffering** — decouple producers from consumers. Use DLQs for failed message inspection. Combine SNS fan-out with SQS for reliable multi-consumer delivery.
- **Lambda as glue** — event handlers for transforms, enrichment, and routing. Use event source mappings for SQS, Kinesis, DynamoDB Streams.
- **Choreography vs. orchestration** — use EventBridge for choreography (services react independently). Use Step Functions for orchestration (centralized workflow control with retries, error handling, parallel execution).

### API Gateway Patterns

- **REST API** — full-featured: usage plans, API keys, request validation, WAF integration, caching. Use for public APIs requiring throttling and monetization.
- **HTTP API** — lower latency, lower cost (up to 71% cheaper), simpler. Use for internal APIs, Lambda proxies, JWT authorization. Preferred for most new APIs.
- **WebSocket API** — persistent connections for real-time apps (chat, dashboards, notifications). Use with DynamoDB for connection management.
- **Direct service integrations** — API Gateway can invoke DynamoDB, SQS, Step Functions, and S3 directly without Lambda. Reduces cost, latency, and failure points.

### Cross-Account Access

- **Resource-based policies** — S3 bucket policies, KMS key policies, Lambda resource policies. Grant access to specific principals in other accounts.
- **IAM role assumption** — `sts:AssumeRole` with external ID for third-party access. Cross-account roles for internal account access via trust policies scoped to `aws:PrincipalOrgID`.
- **AWS RAM** — share resources (Transit Gateway, Subnets, License Manager configs, Route 53 Resolver rules) across accounts in the organization.
- **EventBridge cross-account** — send events between accounts via event bus policies. Use organization-wide event buses for shared domain events.

### Hybrid Cloud Connectivity

- **Direct Connect** — dedicated network connection from on-premises to AWS. Use for high-throughput, low-latency, consistent-bandwidth requirements. Deploy redundant connections across different locations for HA.
- **Site-to-Site VPN** — encrypted tunnel over public internet. Use as a backup for Direct Connect or for lower-bandwidth requirements. Use BGP for dynamic routing.
- **Transit Gateway** — central hub for both VPC and on-premises connectivity. Attach Direct Connect Gateway and VPN connections to TGW.

### Data Lake Patterns

- **S3 as data lake storage** — organize with prefixes: `raw/`, `curated/`, `aggregated/`. Use partitioning by date/category for query performance.
- **Glue** — crawlers for schema discovery, ETL jobs for transformation, Data Catalog as a centralized metadata store. Use Glue 4.0+ for Spark-based transforms.
- **Athena** — serverless SQL queries on S3 data. Use columnar formats (Parquet, ORC) for 30-90% cost reduction and 2-10x performance improvement. Partition data to reduce scan volume.
- **Lake Formation** — centralized access control for data lake. Fine-grained column and row-level security.

---

## DevOps & Deployment

### CI/CD Pipelines

- **GitHub Actions with OIDC** — preferred for teams using GitHub. Authenticate to AWS via OIDC federation (no long-lived credentials). Scope IAM trust policies to specific repos and branches. Use `aws-actions/configure-aws-credentials@v4` action.
```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-arn: arn:aws:iam::123456789012:role/GitHubActionsRole
      aws-region: us-east-1
```

- **CodePipeline** — native AWS CI/CD. Use for teams fully in the AWS ecosystem. Integrates with CodeCommit, CodeBuild, CodeDeploy. Use cross-account pipelines for deployment across environments.
- **General CI/CD rules** — infrastructure and application deployments should share the same pipeline. Run IaC validation (cdk-nag, checkov) as a gate before deployment. Require approval for production deployments.

### Deployment Strategies

- **ECS blue/green (native)** — since July 2025, ECS supports native blue/green without CodeDeploy. Lifecycle hooks for validation, bake time, and automatic rollback. Dark canary testing via test listeners for pre-production validation with zero user impact.
- **ECS blue/green (CodeDeploy)** — use when you need canary (e.g., 10% traffic, then 100%) or linear (10% every 5 minutes) traffic shifting. More complex but more gradual.
- **EKS deployments** — use Kubernetes native rolling updates. For blue/green, use Argo Rollouts or Flagger with weighted routing. Use ArgoCD for GitOps-style deployments.
- **Lambda versioning** — publish versions for immutable snapshots. Use aliases (`prod`, `staging`) for routing. Weighted aliases for canary deployments (e.g., 95% to v5, 5% to v6).

### Monitoring and Observability

- **CloudWatch Metrics** — custom metrics for business KPIs. Use metric math for derived metrics. Set alarms on p99 latency, error rates, and saturation.
- **CloudWatch Logs Insights** — query log groups with a purpose-built query language. Use for ad-hoc investigation. Create dashboard widgets from queries.
- **X-Ray** — distributed tracing for request flows across Lambda, API Gateway, ECS, and downstream services. Use X-Ray SDK or OpenTelemetry ADOT collector.
- **CloudWatch Synthetics** — canary scripts that probe endpoints on a schedule. Alert on availability and latency degradation before users notice.
- **Contributor Insights** — identify top-N contributors to resource consumption (e.g., top DynamoDB partition keys, top API callers).
- **Application Signals** — standardized application performance monitoring (APM) for ECS and EKS workloads. Pre-built SLO dashboards.

---

## Decision Trees

### Which Compute Service?

```
Start
  |
  ├─ Event-driven, short-lived (<15min), stateless?
  │   ├─ Yes → AWS Lambda
  │   │         ├─ Need sub-100ms cold starts? → Provisioned Concurrency or SnapStart
  │   │         └─ >10GB memory or >15min? → Not Lambda, continue below
  │   └─ No ↓
  |
  ├─ Containerized workload?
  │   ├─ Yes → Need Kubernetes specifically?
  │   │         ├─ Yes (multi-cloud, existing K8s, service mesh) → EKS
  │   │         │     └─ Want to manage nodes? → EC2 nodes : Fargate
  │   │         └─ No → ECS
  │   │               └─ Want to manage instances? → EC2 launch type : Fargate
  │   └─ No ↓
  |
  ├─ Need GPU, custom kernel, or full OS control?
  │   └─ Yes → EC2 (with Auto Scaling Group)
  │             ├─ Fault-tolerant? → Spot Instances
  │             └─ Steady-state? → Savings Plan + On-Demand
  |
  └─ Simple web app/API, minimal ops burden?
      └─ App Runner
```

### Which Database Service?

```
Start
  |
  ├─ Relational data model? (joins, transactions, complex queries)
  │   ├─ Yes → High throughput or availability needs?
  │   │         ├─ Yes → Aurora (Serverless v2 for variable traffic)
  │   │         │         ├─ Global: Aurora Global Database (<1s cross-region)
  │   │         │         └─ Distributed ACID: Aurora DSQL
  │   │         └─ Standard workload → RDS (PostgreSQL or MySQL)
  │   │                                 └─ Multi-AZ for production
  │   └─ No ↓
  |
  ├─ Key-value or document access patterns? Single-digit ms latency?
  │   ├─ Yes → DynamoDB
  │   │         ├─ Microsecond reads? → DAX
  │   │         ├─ Unpredictable traffic? → On-demand capacity
  │   │         └─ Steady traffic? → Provisioned with auto-scaling
  │   └─ No ↓
  |
  ├─ Full-text search, log analytics?
  │   └─ OpenSearch Service
  |
  ├─ In-memory caching, session store, leaderboards?
  │   └─ ElastiCache (Redis for features, Memcached for simple caching)
  |
  └─ Time-series data (IoT, metrics)?
      └─ Timestream
```

### Serverless vs. Containers?

```
Start
  |
  ├─ Workload characteristics:
  │   ├─ Sporadic, event-driven, <15min tasks → Serverless (Lambda)
  │   ├─ Long-running, steady traffic, >10GB memory → Containers (ECS/EKS)
  │   └─ Mixed → Hybrid: Lambda for events, ECS for services
  |
  ├─ Team expertise:
  │   ├─ No container experience → Lambda (lower learning curve)
  │   ├─ Docker/K8s expertise → ECS or EKS
  │   └─ Want zero infrastructure → Lambda or App Runner
  |
  ├─ Cost crossover:
  │   ├─ <100K requests/day → Lambda usually cheaper
  │   ├─ >100K requests/day, steady → ECS Fargate with Savings Plans
  │   └─ >1M requests/day, predictable → ECS on EC2 with Spot/Savings Plans
  |
  └─ Latency requirements:
      ├─ Tolerant of cold starts (<1s) → Lambda
      ├─ Need consistent <50ms → Containers or Lambda Provisioned Concurrency
      └─ Need persistent connections (WebSockets, gRPC) → Containers
```

---

## Code Examples

### 1. CDK: VPC with Public/Private Subnets and NAT Gateway

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const vpc = new ec2.Vpc(this, 'AppVpc', {
  maxAzs: 3,
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  natGateways: 1, // cost-optimize: 1 NAT GW for non-prod, 3 for prod
  subnetConfiguration: [
    { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
    { name: 'App', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 22 },
    { name: 'Data', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
  ],
});

// S3 Gateway Endpoint (free — avoids NAT Gateway data charges)
vpc.addGatewayEndpoint('S3Endpoint', {
  service: ec2.GatewayVpcEndpointAwsService.S3,
});

// DynamoDB Gateway Endpoint (free)
vpc.addGatewayEndpoint('DynamoEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
});
```

### 2. CDK: Lambda with Best-Practice Configuration

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

const fn = new lambda.Function(this, 'ProcessOrder', {
  runtime: lambda.Runtime.NODEJS_20_X,
  architecture: lambda.Architecture.ARM_64,  // Graviton: 20% cheaper, faster cold starts
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/process-order'),
  memorySize: 1024,       // Right-size with Power Tuning
  timeout: cdk.Duration.seconds(30),
  tracing: lambda.Tracing.ACTIVE,           // X-Ray tracing
  insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
  logRetention: logs.RetentionDays.TWO_WEEKS,
  environment: {
    TABLE_NAME: table.tableName,
    POWERTOOLS_SERVICE_NAME: 'order-service',
  },
  reservedConcurrentExecutions: 100,        // Prevent runaway scaling
});

// Grant least-privilege access
table.grantReadWriteData(fn);
```

### 3. Terraform: S3 Bucket with Security Best Practices

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "myapp-data-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data_key.arn
    }
    bucket_key_enabled = true  # Reduces KMS API calls and costs
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    id     = "archive"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }
    transition {
      days          = 365
      storage_class = "GLACIER_IR"
    }
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
}
```

### 4. CDK: DynamoDB Single-Table Design with Auto-Scaling

```typescript
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const table = new dynamodb.Table(this, 'AppTable', {
  partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 10,
  writeCapacity: 10,
  pointInTimeRecovery: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: kmsKey,
});

// Auto-scaling: target 70% utilization
const readScaling = table.autoScaleReadCapacity({ minCapacity: 5, maxCapacity: 500 });
readScaling.scaleOnUtilization({ targetUtilizationPercent: 70 });

const writeScaling = table.autoScaleWriteCapacity({ minCapacity: 5, maxCapacity: 500 });
writeScaling.scaleOnUtilization({ targetUtilizationPercent: 70 });

// GSI for access pattern: query by type + date
table.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

### 5. GitHub Actions: OIDC-Based AWS Deployment

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubDeploy
          aws-region: us-east-1
          # No access keys — OIDC provides temporary credentials

      - name: CDK Deploy
        run: |
          npm ci
          npx cdk diff
          npx cdk deploy --require-approval never --all
```

---

*Researched: 2026-03-07 | Sources: [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html), [AWS Multi-Account Strategy](https://docs.aws.amazon.com/controltower/latest/userguide/aws-multi-account-landing-zone.html), [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html), [Lambda Cold Start Optimization](https://aws.amazon.com/blogs/compute/understanding-and-remediating-cold-starts-an-aws-lambda-perspective/), [DynamoDB Partition Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html), [GuardDuty Best Practices](https://aws.github.io/aws-security-services-best-practices/guides/guardduty/), [Security Hub Best Practices](https://aws.github.io/aws-security-services-best-practices/guides/security-hub/), [Transit Gateway Design](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html), [ECS Blue/Green Native](https://aws.amazon.com/blogs/devops/choosing-between-amazon-ecs-blue-green-native-or-aws-codedeploy-in-aws-cdk/), [GitHub Actions OIDC](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/), [AWS KMS Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-kms-best-practices/data-protection-encryption.html), [AWS Fault Injection Service](https://aws.amazon.com/blogs/architecture/chaos-testing-with-aws-fault-injection-simulator-and-aws-codepipeline/), [IAM Least Privilege](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html), [AWS Cost Optimization](https://aws.amazon.com/blogs/aws-cloud-financial-management/), [EventBridge Patterns](https://aws.amazon.com/event-driven-architecture/), [CloudFront Cache Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)*
