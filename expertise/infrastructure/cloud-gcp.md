# Cloud GCP -- Expertise Module

> A GCP cloud specialist designs, provisions, secures, and operates workloads on Google Cloud Platform.
> Scope spans resource hierarchy, networking, compute, storage, databases, messaging, IAM, CI/CD,
> observability, cost management, and security -- from single-project startups to multi-folder enterprises.

## Core Patterns & Conventions

### Project & Organization Hierarchy

- **Organization node** is the root, tied to a Google Workspace or Cloud Identity domain. All resources inherit policies downward.
- **Folders** group projects by business unit, environment (prod/staging/dev), or regulatory boundary. Nest up to 10 levels deep.
- **Projects** are the fundamental unit for APIs, billing, IAM, and quotas. Every resource lives inside exactly one project.
- **Billing accounts** are separate from the hierarchy. Link each project to a billing account; use labels and cost-center tags for chargeback.
- **Organization policies** (constraints) apply at org, folder, or project level and are inherited. Examples: `constraints/compute.disableSerialPortAccess`, `constraints/iam.disableServiceAccountKeyCreation`.

Best practice layout:

```
org: example.com
  folder: Production
    folder: Platform (shared VPC host, logging, monitoring)
    folder: Workloads (one project per service)
  folder: Non-Production
    folder: Staging
    folder: Development
  folder: Sandbox (experimentation, auto-delete after 30 days)
  folder: Security (Security Command Center, org-level logs)
```

### Networking

- **VPC** is global; subnets are regional. Use custom-mode VPCs (not auto-mode) for production.
- **Shared VPC** lets a host project own the network while service projects attach workloads. Centralizes firewall rules, routes, and IP management.
- **Private Google Access** allows VMs without external IPs to reach Google APIs (BigQuery, Cloud Storage, etc.) over internal routes.
- **Cloud NAT** provides outbound internet for private instances without exposing inbound. One Cloud NAT gateway per region per VPC.
- **Private Service Connect** creates private endpoints for Google APIs and third-party services within your VPC, replacing the older Private Google Access for some use cases.
- **Cloud Interconnect** (Dedicated or Partner) for hybrid connectivity at 10/100 Gbps. Cloud VPN as lower-cost alternative.
- **Hierarchical firewall policies** at org/folder level override project-level rules. Use for mandatory deny/allow.
- Enable **VPC Flow Logs** on all production subnets for network forensics and troubleshooting.

### Compute Patterns

| Service | Best For | Scaling Model |
|---------|----------|---------------|
| **Cloud Run** | Stateless HTTP containers, APIs, microservices | Per-request, scale to zero |
| **Cloud Run functions** | Event-driven glue code, webhooks, Pub/Sub triggers | Per-invocation, scale to zero |
| **GKE (Autopilot)** | Complex multi-service platforms, stateful workloads, GPU/TPU | Pod-level (HPA/VPA) + node-level (cluster autoscaler) |
| **GKE (Standard)** | Full node control, DaemonSets, custom kernels | Same as Autopilot but you manage nodes |
| **Compute Engine** | Lift-and-shift VMs, HPC, Windows workloads, licensing | Managed Instance Groups (MIG) with autoscaler |
| **App Engine** | Legacy; new projects should prefer Cloud Run | Automatic instance scaling |

- Cloud Run functions (formerly Cloud Functions 2nd gen) now run on Cloud Run infrastructure. The two are converging; prefer Cloud Run for new services unless you need the simpler function-deployment model.
- GKE Autopilot is recommended for most Kubernetes workloads -- Google manages nodes, you pay per pod resource request.

### Storage

- **Cloud Storage**: Object store with Standard, Nearline (30-day), Coldline (90-day), Archive (365-day) classes. Use lifecycle rules to transition objects automatically.
- **Persistent Disks**: Block storage for Compute Engine / GKE. Choose pd-ssd for latency-sensitive, pd-balanced for general, pd-standard for throughput. Regional PDs for HA.
- **Filestore**: Managed NFS. Use for shared file systems on GKE or Compute Engine. Tiers: Basic HDD, Basic SSD, Enterprise (regional HA).
### Database Services

| Service | Type | Use When |
|---------|------|----------|
| **Cloud SQL** | Managed MySQL/PostgreSQL/SQL Server | General OLTP, <10 TB, single-region |
| **AlloyDB** | Managed PostgreSQL-compatible | High-performance OLTP+OLAP hybrid; 4x faster than standard PostgreSQL for transactions, 100x for analytics |
| **Cloud Spanner** | Distributed relational | Global scale, 99.999% SLA, unlimited horizontal scale with strong consistency |
| **Firestore** | Document (NoSQL) | Mobile/web apps, real-time sync, serverless, <1 TB typical |
| **Bigtable** | Wide-column (NoSQL) | Time-series, IoT, analytics, >1 TB, <10 ms latency at any scale |
| **Memorystore** | Managed Redis / Memcached / Valkey | Caching, session store, pub/sub |
| **BigQuery** | Serverless data warehouse | Analytics, BI, ML feature store (not OLTP) |

### Messaging & Orchestration

- **Pub/Sub**: Global, at-least-once message delivery. Supports push and pull subscriptions, ordering keys, dead-letter topics, exactly-once delivery (opt-in). Use for decoupled microservice communication.
- **Eventarc**: Event routing from 130+ Google Cloud sources (audit logs, Cloud Storage, Firestore, custom) to Cloud Run, GKE, Workflows. Uses CloudEvents standard. Use for "plumbing" Google Cloud events.
- **Cloud Tasks**: HTTP task queues with rate limiting, retry, scheduling. Use when you need to control dispatch rate to a target.
- **Workflows**: Serverless orchestration of Google Cloud APIs and HTTP services. YAML/JSON-based, supports conditionals, loops, error handling. Use for multi-step processes that coordinate services.
### IAM & Identity

- **Principle of least privilege**: Grant predefined roles (e.g., `roles/cloudsql.viewer`) not primitive roles (`roles/editor`).
- **Service accounts**: Use one per workload. Never share service accounts across unrelated services.
- **Workload Identity Federation**: Preferred over service account keys. Lets external workloads (AWS, Azure, GitHub Actions, GitLab CI) authenticate without downloading JSON keys.
- **Workload Identity (GKE)**: Maps Kubernetes service accounts to Google service accounts. Eliminates node-level service account sharing.
- **Organization policies**: Enforce `iam.disableServiceAccountKeyCreation` to ban key downloads org-wide.
- **IAM Conditions**: Time-based or attribute-based access (e.g., grant access only during business hours).
- **Groups-based access**: Assign IAM roles to Google Groups, not individual users.

### Infrastructure as Code

**Terraform (recommended)**:
- Use the [Google Cloud Terraform modules](https://github.com/terraform-google-modules) maintained by Google.
- Store state in a GCS backend with versioning and state locking enabled.
- Structure: `modules/` for reusable components, `environments/{prod,staging,dev}/` for instances.
- Use separate service accounts per environment with minimal permissions.
- Run `terraform plan` in CI, require human approval before `terraform apply`.
- Never store secrets in Terraform state; reference Secret Manager instead.

**Pulumi**: Alternative IaC using general-purpose languages (TypeScript, Python, Go). **Deployment Manager**: Legacy -- use Terraform for new projects.

## Anti-Patterns & Pitfalls

### 1. Using Primitive Roles (Owner/Editor/Viewer)
**Why it hurts**: `roles/editor` grants write access to almost every service. A compromised service account with Editor can delete databases, exfiltrate data, and create new resources. Use predefined or custom roles scoped to exactly the needed permissions.

### 2. Downloading Service Account Keys
**Why it hurts**: JSON key files are long-lived credentials that can be committed to git, stolen from laptops, or leaked in logs. Use Workload Identity Federation (external workloads) or attached service accounts (GCP workloads) instead. Enforce `iam.disableServiceAccountKeyCreation` org policy.

### 3. Single Project for Everything
**Why it hurts**: Mixing prod and dev in one project means a dev mistake can delete prod resources. IAM permissions cannot be scoped below the project level for many services. Quotas are per-project, so a runaway dev workload can exhaust prod quotas.

### 4. Using Default VPC / Auto-Mode Networks
**Why it hurts**: Auto-mode VPCs create a subnet in every region with predetermined CIDR ranges, leading to IP conflicts when peering. Custom-mode VPCs give you explicit control over IP ranges and are required for Shared VPC.

### 5. Ignoring Resource Quotas and Limits
**Why it hurts**: GCP enforces quotas per project per region (e.g., max CPUs, max IP addresses, API rate limits). Running into quotas during a traffic spike causes outages. Proactively request quota increases and set alerts on quota utilization.

### 6. Not Enabling Audit Logs
**Why it hurts**: Admin Activity audit logs are on by default, but Data Access logs are off. Without Data Access logs, you cannot detect who read sensitive data in BigQuery, Cloud Storage, or Spanner. Enable Data Access logs for sensitive projects (be aware of log volume costs).

### 7. Over-Engineering with Microservices
**Why it hurts**: Splitting a simple app into 20 Cloud Run services introduces network latency, distributed tracing complexity, and deployment coordination overhead. Start with a modular monolith; extract services when a clear scaling or team-boundary need arises.

### 8. Neglecting Cloud Storage Lifecycle Rules
**Why it hurts**: Without lifecycle policies, temporary uploads, old backups, and intermediate data accumulate indefinitely. A single bucket with millions of abandoned objects can cost thousands per month. Set lifecycle rules to transition to Coldline/Archive or delete after N days.

### 9. Hard-Coding Regions and Zones
**Why it hurts**: Makes disaster recovery and multi-region expansion painful. Use variables/configs for all region references. Design for regional failover from day one.

### 10. Skipping VPC Service Controls in Regulated Environments
**Why it hurts**: Without VPC-SC, a compromised identity can exfiltrate data from BigQuery or Cloud Storage to an external project. VPC-SC creates a security perimeter that blocks data movement outside trusted boundaries, even with valid credentials.

### 11. Synchronous Chains of Cloud Functions
**Why it hurts**: Function A calls Function B calls Function C synchronously. Each hop adds latency, compounds cold-start delays, and creates cascading timeout failures. Use Pub/Sub or Workflows for multi-step processes.

### 12. Running Cloud SQL Without High Availability
**Why it hurts**: A single-zone Cloud SQL instance goes down during zone maintenance or failure. Enabling HA (regional instance with automatic failover) costs approximately 2x but provides <60-second failover. For production, HA is non-negotiable.

### 13. Not Setting Budget Alerts
**Why it hurts**: A misconfigured autoscaler, a runaway BigQuery query, or a Pub/Sub consumer lag can generate thousands in unexpected charges within hours. Set budget alerts at 50%, 80%, 100% of expected spend per billing account and per project.

### 14. Treating GKE Like a VM Cluster
**Why it hurts**: Running one pod per node, not setting resource requests/limits, using SSH to "fix" nodes, or not using namespaces. This wastes the orchestration benefits of Kubernetes and leads to poor resource utilization and operational fragility.

### 15. Ignoring Pub/Sub Dead-Letter Topics
**Why it hurts**: Without a dead-letter topic (DLT), messages that repeatedly fail processing get retried forever, consuming subscriber resources and potentially causing out-of-order processing. Configure DLT with max delivery attempts (typically 5-10) to capture poison messages for later analysis.

## Testing Strategy

### Infrastructure Testing

- **Terraform validate + plan**: Run `terraform validate` and `terraform plan` in CI on every PR. Review plan diffs for unintended resource destruction.
- **Terratest / Kitchen-Terraform**: Write Go or Ruby tests that deploy ephemeral infrastructure and verify behavior (e.g., can a VM reach Cloud SQL? Does the firewall block port 22?).
- **Policy-as-Code**: Use Open Policy Agent (OPA) with `conftest` or Google's Policy Controller to validate Terraform plans against organization rules before apply.
- **Checkov / tfsec**: Static analysis scanners that flag insecure Terraform configurations (public buckets, open firewall rules, unencrypted disks).

### Load Testing

- **Cloud Load Testing**: Managed service (built on Locust) for distributed load tests. Define test scenarios in Python, deploy across multiple regions.
- **Locust / k6 on GKE**: For custom load testing, deploy Locust or Grafana k6 on GKE with cluster autoscaler to generate high-volume traffic.
- Test Cloud Run with concurrency limits to find the optimal `--concurrency` setting per service.
- Test GKE HPA thresholds by ramping traffic and verifying scaling speed matches SLO requirements.

### Chaos Engineering

- **Fault injection with Istio/Envoy**: Inject delays and errors at the service mesh level on GKE.
- **gcloud compute instances stop**: Randomly stop instances in a MIG to test auto-healing.
- **Zone / region failover drills**: Simulate zone outages by cordoning GKE nodes in one zone. Verify Cloud SQL HA failover by triggering manual failover.
- **Pub/Sub backpressure**: Pause consumers to test dead-letter topic behavior and alerting.

### Cost Estimation & Budgets

- **Google Cloud Pricing Calculator**: Estimate costs before provisioning. Required for architecture reviews.
- **Billing budgets + alerts**: Set per-project and per-billing-account budgets. Use Pub/Sub notifications to trigger automated responses (e.g., disable billing, scale down).
- **BigQuery billing export**: Export detailed billing to BigQuery for custom cost dashboards and anomaly detection.
## Performance Considerations

### Cloud Run Scaling & Cold Starts

- **Startup CPU Boost**: Enable to temporarily double CPU during container startup; significantly reduces cold start for JVM-based apps.
- **Minimum instances**: Set `--min-instances=1` (or more) on latency-sensitive services to keep warm instances. Increases cost but eliminates cold starts.
- **Container optimization**: Use distroless or alpine base images. Lazy-initialize heavy dependencies. Move initialization to global scope (outside request handler) so it persists across requests.
- **Concurrency tuning**: Default is 80 concurrent requests per instance. Increase for I/O-bound workloads, decrease for CPU-bound. Higher concurrency = fewer instances = fewer cold starts.
- **Cloud Run scales to 1000 instances** by default (quota-adjustable). Each instance handles up to 250 concurrent requests.

### Spanner vs. Cloud SQL Performance Tradeoffs

| Dimension | Cloud SQL | Cloud Spanner |
|-----------|-----------|---------------|
| Max storage | ~64 TB | Unlimited (horizontal) |
| Read latency | <5 ms (same zone) | ~5-10 ms (single region), higher cross-region |
| Write latency | <5 ms | ~6-15 ms (due to distributed consensus) |
| Scale-out | Vertical (bigger VM) + read replicas | Horizontal (add nodes, linear throughput) |
| Cost at small scale | Low (~$50/mo for small) | High (minimum ~$200/mo for 1 node) |
| Global strong consistency | No | Yes |

Choose Cloud SQL when: single-region, <10 TB, cost-sensitive, standard PostgreSQL/MySQL compatibility needed.
Choose Spanner when: multi-region, >10 TB, need 99.999% SLA, or need unlimited horizontal write scaling.

### Cloud CDN Caching Strategies

- Enable Cloud CDN on external Application Load Balancers for static and semi-dynamic content.
- Use `Cache-Control` headers: `public, max-age=3600` for static assets, `private, no-store` for user-specific data.
- **Signed URLs / signed cookies** for access-controlled cached content.
- **Cache invalidation**: Use URL-based invalidation (`gcloud compute url-maps invalidate-cdn-cache`). Design cache keys carefully; include query parameters only when they affect response.
- Backend buckets (Cloud Storage) + Cloud CDN for static site hosting with global edge caching.

### GKE Autoscaling

**Horizontal Pod Autoscaler (HPA)**:
- Scale on CPU, memory, or custom metrics (Pub/Sub queue depth, request latency via Cloud Monitoring).
- Set `minReplicas` high enough to absorb traffic while new pods start (typically 60-90 seconds).
- Avoid scaling on both CPU and memory simultaneously with VPA active.

**Vertical Pod Autoscaler (VPA)**:
- Recommends or auto-sets resource requests based on historical usage (needs 24+ hours of data).
- Use in "Off" mode (recommendation-only) initially, then switch to "Auto" after validating.
- Do not combine VPA on CPU/memory with HPA on the same metrics -- they will conflict.

**Cluster Autoscaler + Node Auto-Provisioning (NAP)**:
- Cluster autoscaler adds/removes nodes when pods are pending (unschedulable).
- NAP creates new node pools with optimal machine types based on pending pod requirements.
- Set `--max-nodes` per pool to prevent runaway scaling. Use Pod Disruption Budgets (PDBs) to control disruption during scale-down.

### Cost Optimization

- **Committed Use Discounts (CUDs)**: 1-year = ~37% off, 3-year = ~55-70% off for Compute Engine. Resource-based CUDs for specific vCPU/memory. Spend-based CUDs for Cloud SQL, AlloyDB, and others.
- **Spot VMs**: Up to 91% discount. Can be preempted with 30-second notice. Use for batch processing, CI/CD runners, GKE non-critical node pools. Cannot combine with CUDs.
- **GKE Autopilot**: Pay per pod resource request, not per node. Often cheaper than Standard mode for bursty workloads since you don't pay for idle node capacity.
- **BigQuery**: Use on-demand pricing for exploratory work; switch to capacity pricing (editions) for predictable workloads. Partition and cluster tables to minimize bytes scanned.
- **Cloud Storage**: Use Autoclass to automatically move objects between storage classes based on access patterns.
- **Recommender**: Regularly review idle resource recommendations in the console or via API.
- **Right-sizing**: Use Cloud Monitoring metrics to identify over-provisioned instances. GKE VPA recommendations help right-size pods.

## Security Considerations

### Google Cloud Security Foundations

Follow the [Google Cloud Security Foundations Blueprint](https://cloud.google.com/architecture/security-foundations):
- Separate organization into folders by environment (prod, non-prod, bootstrap, common).
- Centralize logging in a dedicated project with locked-down IAM.
- Enable organization policies: disable default service accounts, disable key creation, restrict resource locations.
- Use Security Command Center (SCC) Premium for vulnerability scanning, threat detection, and compliance monitoring.

### Security Command Center (SCC)

- **SCC Premium** provides: vulnerability findings (misconfigured firewalls, public buckets), threat detection (crypto-mining, exfiltration), compliance reports (CIS, NIST, PCI-DSS).
- **SCC Enterprise** (Chronicle-backed) adds SIEM/SOAR capabilities with case management and playbook automation.
- Integrate SCC findings into Pub/Sub for automated remediation workflows.

### VPC Service Controls

- Define a **service perimeter** around projects containing sensitive data (BigQuery, Cloud Storage, Spanner, etc.).
- Even with valid IAM credentials, data cannot be copied outside the perimeter.
- **Always run in dry-run mode first** for 2-4 weeks to identify legitimate cross-perimeter traffic before enforcing.
- Use **access levels** (based on IP range, device policy, identity) to allow controlled ingress/egress.
- Use **perimeter bridges** to allow controlled data sharing between perimeters.

### Secret Manager

- Store all secrets (API keys, DB passwords, TLS certs) in Secret Manager, not in environment variables, code, or Terraform state.
- Use **IAM per secret**: grant `roles/secretmanager.secretAccessor` only to the specific service account that needs each secret.
- Enable **automatic rotation** with Cloud Functions or Workflows for database passwords and API keys.
- **Versioning**: Secret Manager versions secrets automatically. Reference specific versions or "latest" in application code.
- Use **regional secrets** for data residency compliance when secrets must not leave specific jurisdictions.

### Cloud Armor (WAF & DDoS)

- Attach Cloud Armor security policies to external Application Load Balancers.
- **Preconfigured WAF rules**: OWASP Top 10 protections (SQLi, XSS, RCE). Enable ModSecurity Core Rule Set.
- **Adaptive Protection**: ML-based anomaly detection that auto-generates rules during DDoS attacks.
- **Rate limiting**: Per-client rate limits to prevent abuse without blocking legitimate traffic.
- **Bot management**: reCAPTCHA Enterprise integration for advanced bot detection.
- Edge-level blocking -- traffic stopped before reaching backends, minimizing resource consumption.

### Binary Authorization

- Enforces deploy-time policy: only container images signed by trusted authorities can deploy to GKE.
- Integrate with Cloud Build to automatically sign images after successful CI pipeline.
- Use **attestors** for different stages (build, vulnerability scan, QA approval).
- Enforce in GKE cluster admission control: unsigned or unsigned-by-wrong-key images are rejected.

## Integration Patterns

### Event-Driven Architecture

- **Eventarc** for routing Google Cloud events (Cloud Storage uploads, Firestore writes, Audit Log entries) to Cloud Run or Workflows. No topic management needed.
- **Pub/Sub** for custom application events, high-throughput streaming, and when you need ordering, filtering, or exactly-once delivery.
- **Cloud Tasks** when you need rate-limited, scheduled task dispatch to a single target (e.g., throttled API calls).
- **Workflows** for orchestrating multi-step processes: call API A, wait for result, conditionally call API B, retry on failure.
- Ensure all consumers are **idempotent** -- Pub/Sub guarantees at-least-once delivery, meaning duplicates will occur.

### API Management

- **API Gateway**: Managed API proxy for Cloud Run, Cloud Functions, App Engine. Supports OpenAPI spec, API keys, rate limiting. Good for simple REST APIs.
- **Apigee**: Full API management platform for enterprises. API versioning, monetization, developer portal, advanced analytics. Use when you are exposing APIs to external partners or developers.
- **Cloud Endpoints**: Lightweight API management with OpenAPI and gRPC support. Less feature-rich than Apigee.

### BigQuery Analytics Integration

- **Cloud Storage -> BigQuery**: Data Transfer Service or load jobs for batch; external tables for federated queries.
- **Pub/Sub -> BigQuery**: Direct BigQuery subscriptions (no consumer code needed).
- **Cloud SQL / Spanner -> BigQuery**: Datastream for real-time change data capture (CDC).
- **Vertex AI + BigQuery**: BigQuery ML for in-warehouse training, or export to Vertex AI for custom models.

### Vertex AI Integration

- **Model training**: Vertex AI Training with data in Cloud Storage or BigQuery. Pre-built containers (TensorFlow, PyTorch, XGBoost) or custom.
- **Model serving**: Vertex AI Endpoints with autoscaling, A/B testing, and traffic splitting.
- **Feature Store**: Centralized feature management for online (low-latency) and offline (batch) serving.

### Hybrid with Anthos

- **Anthos** extends GKE to on-premises and other clouds (AWS, Azure).
- **Anthos Service Mesh** (Istio-based): consistent networking, security, observability across clusters.
- **Anthos Config Management**: GitOps-based policy and configuration across all clusters.
- **Connect Gateway**: centralized kubectl access to registered clusters regardless of location.

## DevOps & Deployment

### Cloud Build CI/CD

- Cloud Build executes build steps as containers. Define pipeline in `cloudbuild.yaml`.
- Use **build triggers** on Cloud Source Repositories, GitHub, or GitLab pushes / PR events.
- **Private pools**: Run builds in your VPC for access to private resources (internal registries, databases).
- Cache dependencies using Cloud Storage buckets to speed up builds.
- Integrate vulnerability scanning: Artifact Registry scans images on push; fail the build if critical CVEs are found.

### Cloud Deploy (Continuous Delivery)

- Managed progressive delivery for GKE and Cloud Run.
- Define a **delivery pipeline** with ordered targets (dev -> staging -> production).
- Supports **canary deployments**, **blue-green**, and custom verification steps.
- Integrates with Cloud Build (CI) and Artifact Registry for end-to-end supply chain.
- **Rollback**: One-click rollback to any previous release.

### Artifact Registry

- Successor to Container Registry. Supports Docker, Maven, npm, Python, Go, Apt, Yum, Helm.
- **Vulnerability scanning**: Automatic scanning on push (OS and language package vulnerabilities).
- **Cleanup policies**: Automatically delete old image versions to control storage costs.
- **Remote repositories**: Proxy and cache external registries (Docker Hub, Maven Central) to avoid rate limits and improve reliability.

### Observability Stack

| Service | Purpose |
|---------|---------|
| **Cloud Monitoring** | Metrics, dashboards, alerting (SLOs, uptime checks) |
| **Cloud Logging** | Centralized log ingestion, search, log-based metrics |
| **Cloud Trace** | Distributed tracing for latency analysis |
| **Cloud Profiler** | Continuous CPU and heap profiling in production |
| **Error Reporting** | Groups and tracks application errors with stack traces |

- Use **log sinks** to route logs to Cloud Storage (long-term), BigQuery (analysis), or Pub/Sub (alerting).
- Define **SLOs** in Cloud Monitoring with burn-rate alerting on error budget consumption.
- Enable **W3C Trace Context** propagation for end-to-end tracing across services.
- Set **log exclusion filters** to drop high-volume, low-value logs (health checks) and reduce costs.

## Decision Trees

### Which Compute Service?

```
Need to run containers?
  |
  +-- YES
  |     |
  |     +-- Stateless HTTP / event-driven?
  |     |     |
  |     |     +-- YES --> Cloud Run (default choice for most workloads)
  |     |     +-- NO (stateful, GPU, complex scheduling, multi-service platform)
  |     |           |
  |     |           +-- Need full Kubernetes control / DaemonSets / custom CNI?
  |     |                 |
  |     |                 +-- YES --> GKE Standard
  |     |                 +-- NO  --> GKE Autopilot
  |     |
  |     +-- Tiny event-driven glue code (<10 sec)?
  |           +-- YES --> Cloud Run functions
  |           +-- NO  --> Cloud Run
  |
  +-- NO (VMs needed -- Windows, licensing, legacy)
        |
        +-- Need autoscaling group?
              +-- YES --> Compute Engine with Managed Instance Group (MIG)
              +-- NO  --> Compute Engine (standalone or instance template)
```

**Rule of thumb**: Cloud Run first. GKE Autopilot when you outgrow it. GKE Standard only when Autopilot cannot meet a requirement. Compute Engine only for VM-specific needs.

### Which Database?

```
What data model?
  |
  +-- Relational (SQL, ACID transactions)
  |     |
  |     +-- Need global distribution / 99.999% SLA / unlimited scale?
  |     |     +-- YES --> Cloud Spanner
  |     |     +-- NO
  |     |           |
  |     |           +-- Need PostgreSQL and high performance (HTAP)?
  |     |           |     +-- YES --> AlloyDB
  |     |           |     +-- NO  --> Cloud SQL (PostgreSQL, MySQL, or SQL Server)
  |     |
  +-- Document / flexible schema (NoSQL)
  |     |
  |     +-- Mobile / web real-time sync needed?
  |     |     +-- YES --> Firestore
  |     |     +-- NO
  |     |           +-- Wide-column, high-throughput, time-series?
  |     |                 +-- YES --> Bigtable
  |     |                 +-- NO  --> Firestore
  |     |
  +-- Key-value cache / session store
  |     +-- Memorystore (Redis or Valkey)
  |
  +-- Analytics / data warehouse
        +-- BigQuery
```

**Rule of thumb**: Cloud SQL is the safe default. AlloyDB when Cloud SQL performance is insufficient. Spanner only for genuine global scale needs.

### Serverless vs. Managed Kubernetes?

| Team Profile | Recommendation | Why |
|---|---|---|
| Small (1-5 devs), no K8s expertise | Cloud Run | Zero infra, pay-per-request, auto-TLS |
| Medium (5-20 devs), >10 services needing mesh | GKE Autopilot | Shared platform, Google manages nodes |
| Medium, fewer services | Cloud Run | Simpler operations, lower overhead |
| Large platform team, needs DaemonSets/GPUs/custom kernels | GKE Standard | Full node control |

## Code Examples

### 1. Terraform: Cloud Run Service with VPC Connector

```hcl
resource "google_cloud_run_v2_service" "api" {
  name     = "my-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1    # Eliminate cold starts for latency-sensitive APIs
      max_instance_count = 100
    }
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/my-repo/my-api:latest"
      resources {
        limits            = { cpu = "2", memory = "1Gi" }
        cpu_idle          = true    # Throttle CPU between requests (cost saving)
        startup_cpu_boost = true    # 2x CPU during startup (faster cold starts)
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
    }
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
    service_account = google_service_account.api_sa.email
  }
}
```

### 2. Terraform: GKE Autopilot Cluster

```hcl
resource "google_container_cluster" "primary" {
  name             = "platform-cluster"
  location         = var.region
  enable_autopilot = true
  network          = google_compute_network.vpc.id
  subnetwork       = google_compute_subnetwork.gke_subnet.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  release_channel { channel = "REGULAR" }
  binary_authorization { evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE" }
  workload_identity_config { workload_pool = "${var.project_id}.svc.id.goog" }
}
```

### 3. gcloud: Set Up Cloud Build + Cloud Deploy Pipeline

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Production container images"

# Submit a build
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE_TAG=$(git rev-parse --short HEAD)

# Create a Cloud Deploy delivery pipeline (define stages in clouddeploy.yaml)
gcloud deploy apply --file=clouddeploy.yaml --region=us-central1

# Create a release targeting the first stage (staging)
gcloud deploy releases create release-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --images=my-api=${_IMAGE}
```

### 4. Terraform: VPC Service Controls Perimeter

```hcl
resource "google_access_context_manager_service_perimeter" "data_perimeter" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/servicePerimeters/data_perimeter"
  title  = "Data Protection Perimeter"

  status {
    resources = [
      "projects/${var.data_project_number}",
      "projects/${var.analytics_project_number}",
    ]
    restricted_services = [
      "bigquery.googleapis.com",
      "storage.googleapis.com",
      "spanner.googleapis.com",
    ]
    vpc_accessible_services {
      enable_restriction = true
      allowed_services   = ["RESTRICTED-SERVICES"]
    }
  }
}
```

### 5. Terraform: Pub/Sub with Dead-Letter Topic and BigQuery Subscription

```hcl
resource "google_pubsub_topic" "events"     { name = "order-events" }
resource "google_pubsub_topic" "events_dlq" { name = "order-events-dlq" }

resource "google_pubsub_subscription" "processor" {
  name                         = "order-processor"
  topic                        = google_pubsub_topic.events.id
  ack_deadline_seconds         = 60
  enable_exactly_once_delivery = true

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.events_dlq.id
    max_delivery_attempts = 10
  }
}

# BigQuery subscription -- writes Pub/Sub messages directly to BQ, no consumer needed
resource "google_pubsub_subscription" "analytics" {
  name  = "order-analytics"
  topic = google_pubsub_topic.events.id
  bigquery_config {
    table               = "${var.project_id}.analytics.order_events"
    write_metadata      = true
    drop_unknown_fields = true
  }
}
```

---

*Researched: 2026-03-07 | Sources:*
- *[Google Cloud Architecture Center](https://docs.cloud.google.com/architecture)*
- *[Security Foundations Blueprint](https://docs.cloud.google.com/architecture/blueprints/security-foundations/organization-structure)*
- *[Terraform Best Practices on Google Cloud](https://docs.cloud.google.com/docs/terraform/best-practices/operations)*
- *[Choosing a Compute Option](https://cloud.google.com/blog/topics/developers-practitioners/where-should-i-run-my-stuff-choosing-google-cloud-compute-option)*
- *[Cloud SQL vs Spanner vs AlloyDB](https://oneuptime.com/blog/post/2026-02-17-how-to-choose-between-cloud-sql-cloud-spanner-and-alloydb-for-your-database-workload/view)*
- *[Cloud Run Development Tips](https://docs.cloud.google.com/run/docs/tips/general)*
- *[Workload Identity Federation](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation)*
- *[VPC Service Controls](https://cloud.google.com/security/vpc-service-controls)*
- *[Cloud Armor Overview](https://docs.cloud.google.com/armor/docs/security-policy-overview)*
- *[CUD & Spot VM Pricing](https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview)*
- *[Event-Driven Architectures on GCP](https://www.thecloudguru.in/2025/11/16/gcp-event-driven-architectures-pub-sub-eventarc-or-cloud-tasks/)*
- *[GCP Security Checklist 2026](https://www.sentinelone.com/cybersecurity-101/cloud-security/gcp-security-checklist/)*
- *[DevSecOps and CI/CD on Google Cloud](https://cloud.google.com/blog/products/devops-sre/devsecops-and-cicd-using-google-cloud-built-in-services)*
- *[GKE Cluster Optimization](https://cast.ai/blog/gke-cluster-optimization-13-tactics-for-a-smoother-k8s-deployment/)*
