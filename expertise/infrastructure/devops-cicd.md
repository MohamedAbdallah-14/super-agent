# DevOps & CI/CD -- Expertise Module

> A DevOps/CI-CD specialist designs, builds, and maintains the automated pipelines, infrastructure,
> and operational practices that enable teams to deliver software reliably, securely, and at speed.
> Scope spans source control workflows through production observability, including IaC, container
> orchestration, deployment strategies, security scanning, and incident response.

---

## Core Patterns & Conventions

### CI/CD Pipeline Design

**Canonical Stage Progression:**

```
Source -> Build -> Unit Test -> SAST/Lint -> Integration Test -> Artifact Publish
  -> Deploy Staging -> E2E/Smoke -> Security Scan -> Deploy Production -> Post-Deploy Verify
```

**Key Principles:**

- **Pipeline as Code**: Store pipeline definitions in version control alongside application code.
- **Fail fast**: Place cheap checks (linting, unit tests, SAST) early; expensive checks later.
- **Parallel execution**: Run independent jobs (static analysis, unit tests, security scans) concurrently.
- **Quality gates**: Block promotion if coverage drops, vulnerabilities are found, or thresholds breach.
- **Immutable artifacts**: Build once, promote the same binary through environments.
- **Environment parity**: Staging must mirror production (same base images, resource limits).

**Environment Promotion:** `dev -> staging -> canary (5%) -> production (full rollout)` -- each promotion requires a gate (automated tests, approval, or metric-based analysis).

### Infrastructure as Code (IaC)

**Tool Landscape (early 2026):**

| Tool | Language | Multi-Cloud | License | State Management |
|------|----------|-------------|---------|------------------|
| Terraform 1.10+ | HCL | Yes | BSL 1.1 (proprietary) | Remote state (S3, TFC) |
| OpenTofu 1.9+ | HCL | Yes | MPL 2.0 (open source) | Same as Terraform |
| Pulumi 3.x | Python/TS/Go/C# | Yes | Apache 2.0 | Pulumi Cloud or self-managed |
| AWS CDK 2.x | TS/Python/Java/C# | AWS only | Apache 2.0 | CloudFormation |

**Critical note**: Terraform Open Source under BSL will be discontinued after July 2025. OpenTofu (CNCF sandbox) is the drop-in open-source replacement. CDKTF was deprecated in December 2025.

**Best Practices:** Pin provider/module versions explicitly. Store state remotely with locking. Separate state per environment and per component. Run `plan`/`preview` in CI before any apply. Tag all resources with `team`, `env`, `cost-center`, `managed-by`.

### Container Orchestration

**Kubernetes** remains the standard for production orchestration. Key practices: use namespaces for isolation; define resource requests AND limits; use `PodDisruptionBudget` for availability during drains; prefer `Deployment` (stateless) or `StatefulSet` (stateful); use HPA with custom metrics; deploy via GitOps.

**Docker Compose** suits local development. **ECS Fargate** is a valid simpler alternative for AWS-only workloads not needing K8s ecosystem tooling.

### GitOps Workflows

GitOps treats Git as the single source of truth. An agent inside the cluster continuously reconciles state with Git.

- **ArgoCD**: Rich web UI, multi-tenancy, RBAC, SSO. Stronger ecosystem and enterprise backing. Recommended for most new projects. CNCF graduated.
- **Flux**: Kubernetes-native (CRDs), modular, CLI-driven, lightweight. CNCF graduated. Weaveworks shut down in 2024; ArgoCD has stronger momentum.

**Best Practices:** Separate app code repos from GitOps config repos. Use Kustomize overlays or Helm values per environment. Enable drift detection. Require PRs for all changes. Use sealed secrets or external secret operators.

### Configuration Management

- **Ansible** (agentless, SSH-based): Best for VM provisioning and OS configuration.
- **Chef/Puppet**: Legacy environments only. Prefer Ansible for new projects.

### Branching Strategies

| Strategy | CI/CD Implications | Best For |
|----------|-------------------|----------|
| **Trunk-based** | CI on every commit to main; short-lived branches (<1 day) | Continuous deployment |
| **GitHub Flow** | CI on PR branches; CD triggers on merge to main | Most SaaS teams |
| **GitFlow** | CI on feature/develop/release branches; complex release trains | Versioned/scheduled releases |

Trunk-based development with feature flags is the recommended default for continuous deployment.

### Artifact Management

Use a dedicated registry (GHCR, ECR, Artifact Registry, Artifactory). Tag images with Git SHA, not `latest`. Implement retention policies. Sign artifacts with Sigstore/cosign.

### Secret Management

| Tool | Best For |
|------|----------|
| **HashiCorp Vault** | Dynamic secrets, PKI, multi-cloud |
| **AWS Secrets Manager** | AWS-native workloads, automatic rotation |
| **SOPS** (Mozilla) | Encrypting secrets in Git (KMS backend) |
| **External Secrets Operator** | Syncing cloud secrets into K8s Secrets |

Never store secrets in code or CI/CD logs. Rotate static credentials every 90 days maximum. Use short-lived, dynamically generated credentials wherever possible (Vault dynamic secrets, IAM Roles for Service Accounts, GCP Workload Identity).

---

## Anti-Patterns & Pitfalls

### 1. Creating a Separate "DevOps Team"
**Why**: Creates another silo, contradicting DevOps's goal of shared responsibility. Teams should own their own pipelines and infrastructure.

### 2. Tool-First, Culture-Last
**Why**: Adopting K8s/Docker/Jenkins without changing collaboration patterns delivers zero value. Tools amplify culture; they do not replace it.

### 3. Manual Deployments to Production
**Why**: Human error, unrepeatable, unauditable. Every deployment must be automated through the pipeline.

### 4. No Rollback Strategy
**Why**: A failed deployment without a tested rollback path becomes an incident. Always have one-click rollback.

### 5. Snowflake Servers / Configuration Drift
**Why**: Manually configured servers diverge and cannot be reproduced. IaC + immutable infrastructure eliminates this.

### 6. Secrets in Source Control
**Why**: Secrets persist in Git history even after deletion. Bots actively scan repos for leaked credentials.

### 7. Monolithic Pipelines (No Parallelism)
**Why**: Sequential execution turns 5-minute pipelines into 45-minute pipelines. Developers batch changes, reducing feedback speed.

### 8. Skipping Staging
**Why**: Without production-parity staging, bugs from network policies, resource limits, and DNS surface only in production.

### 9. Over-Automation Without Process Understanding
**Why**: Automating a broken process makes it break faster. Optimize the process first, then automate.

### 10. Ignoring Pipeline as Code Versioning
**Why**: Editing pipelines via web UI means no audit trail, no code review, no rollback capability.

### 11. Alert Fatigue
**Why**: Hundreds of noisy alerts train teams to ignore all alerts. Every alert must be actionable.

### 12. "Lift and Shift" to Kubernetes
**Why**: Moving monoliths into containers without architectural changes adds complexity without benefits.

### 13. Hardcoded Environment Configuration
**Why**: Config baked into images requires rebuilding per environment, breaking immutable artifact principles.

### 14. No Observability Until Incidents
**Why**: Monitoring from day one is essential. Without baseline metrics, you cannot compare during incidents.

### 15. Premature Microservices
**Why**: Adds network complexity and operational overhead. Start with a structured monolith; extract when scale demands it.

---

## Testing Strategy

### Pipeline Testing

- **Linting**: Dockerfiles (`hadolint`), Helm (`helm lint`), Terraform (`tflint`), YAML (`yamllint`).
- **Unit tests**: Coverage thresholds (e.g., 80% min). Fail pipeline on coverage regression.
- **Integration tests**: Containerized dependencies via Docker Compose or Testcontainers.
- **E2E tests**: Deployed staging environment. Playwright/Cypress. Test critical paths only.

### Infrastructure Testing

| Tool | Purpose |
|------|---------|
| **Terratest** | Integration tests for Terraform modules (Go) |
| **Checkov** | Static analysis for IaC security misconfigurations |
| **tfsec / Trivy IaC** | Security scanning for Terraform, CloudFormation, K8s manifests |
| **OPA/Conftest** | Policy testing against structured data (JSON/YAML/HCL) |

### Deployment Testing

- **Canary analysis**: 5-10% traffic to new version; Argo Rollouts or Flagger with Prometheus metrics (error rate, p99 latency) for auto-promote/rollback.
- **Blue/green validation**: Smoke tests against green before switching the load balancer.
- **Smoke tests**: HTTP checks on `/health`, `/readiness`, key API routes post-deployment.

### Chaos Engineering

- **Tools**: LitmusChaos (CNCF, K8s-native), Gremlin (commercial), Chaos Mesh (CNCF sandbox).
- Start small (kill a pod, add latency). Define steady state first. Limit blast radius.
- Integrate chaos experiments into staging release pipelines for resilience validation.

---

## Performance Considerations

### Pipeline Speed Optimization

- **Dependency caching**: Cache `node_modules`, `.m2/repository`, pip wheels between runs. GHA: `actions/cache@v4`. GitLab: `cache:` directive.
- **Docker layer caching**: BuildKit with `--cache-from`/`--cache-to` for registry caching. GHA: `cache-from: type=gha`.
- **Remote build caching**: Gradle remote cache, Bazel remote execution, Nx Cloud, Turborepo.
- **Parallelism**: Split test suites (`jest --shard`, `pytest-split`). Fan-out/fan-in pattern. Matrix builds for multi-platform testing.

### Docker Layer Caching

```dockerfile
# BAD: Invalidates cache on any file change
COPY . /app
RUN npm install

# GOOD: Dependency manifest first, then source
COPY package.json package-lock.json /app/
RUN npm ci --production
COPY . /app
```

Order instructions least-to-most frequently changed. Use `.dockerignore`. Use cache mounts: `RUN --mount=type=cache,target=/root/.npm npm ci`. Separate build stage from runtime via multi-stage builds.

### Monorepo CI Optimization

- **Affected detection**: Nx (`nx affected`), Turborepo, Bazel, or `git diff` to build only what changed.
- **Task graph**: Nx/Bazel model inter-package dependencies for correct order + max parallelism.
- **Impact**: 60-80% CI time reduction with selective execution + remote caching.

---

## Security Considerations

### Supply Chain Security

**SBOM**: Generate in SPDX 3.0 or CycloneDX for every release. Tools: Syft, Trivy, `cdxgen`. Mandated by U.S. EO 14028 for federal suppliers; CISA updated minimum elements in 2025.

**SLSA 1.0** (four levels of build integrity):
- **L1**: Documented build. **L2**: Hosted build + signed provenance (achievable in weeks with GHA OIDC + Sigstore). **L3**: Hardened platform, non-falsifiable provenance. **L4**: Two-person review, hermetic builds.

**Sigstore**: Keyless signing via `cosign` with OIDC identity. Sign: `cosign sign --yes <image>@<digest>`. Verify: `cosign verify --certificate-oidc-issuer=... <image>`. Rekor transparency log for tamper-proof audit.

### Container Scanning

| Tool | Type | Strengths |
|------|------|-----------|
| **Trivy** | OSS, Apache 2.0 | All-in-one: containers, IaC, secrets, SBOM, licenses |
| **Snyk Container** | Commercial ($25/dev/mo) | Actionable remediation, auto-fix PRs |
| **Grype** | OSS | Fast, pairs with Syft for SBOM-based scanning |

Scan in CI (block on HIGH/CRITICAL), in registries (admission control), and at runtime. Trivy recommended for cost-sensitive teams.

### Secret Scanning and Rotation

Enable GitHub secret scanning + push protection. Use `gitleaks` or `trufflehog` as pre-commit hooks. Rotate automatically (AWS Secrets Manager + Lambda). Use OIDC-based auth in CI/CD to eliminate static credentials (GHA OIDC with AWS/GCP/Azure).

### RBAC for CI/CD

Least privilege for service accounts and runner tokens. Short-lived credentials scoped to repos/environments. GHA: environment protection rules, required reviewers, deployment branches. Separate build (read-only) from deploy (write) permissions.

### Compliance as Code

- **OPA**: CNCF graduated. Rego-based policies. Steeper learning curve. Best for cross-cutting concerns (API auth, Terraform plan validation, SOC2 mapping).
- **Kyverno**: CNCF incubating. YAML-based, K8s-native. Lower learning curve. Built-in mutation. Best for K8s policies (pod security, image registry restrictions).

---

## Integration Patterns

### CI/CD Platform Patterns

**GitHub Actions:** Reusable workflows as templates. Pin actions to commit SHAs in production. `secrets.inherit` for passing secrets. Limit: 50 workflows, 10 nested reusable per run (Feb 2026). `concurrency` groups to cancel redundant runs.

**GitLab CI:** `include:` for shared templates. `rules:changes:` for path-based triggering. `needs:` for DAG-based parallel execution.

**Jenkins:** Shared libraries for reuse. Declarative pipelines over scripted. K8s plugin for ephemeral agents. Market share declining in favor of GHA and GitLab CI.

### Multi-Cloud Deployment

Use multi-cloud IaC (Terraform/OpenTofu, Pulumi). Abstract cloud details behind modules. Single CI/CD platform deploying to multiple clouds. Consistent tagging, monitoring, security across clouds.

### Database Migration in CI/CD

- **Flyway**: Simple, sequential SQL migrations. Lightweight.
- **Liquibase**: Advanced governance, rollback, drift detection.
- **Atlas**: Modern, HCL-based.

Run migrations after build, before app deployment. Store scripts in VCS (`db/migrations/`). Design forward-compatible migrations. Separate migration credentials (elevated) from app credentials.

### Feature Flags

- **LaunchDarkly**: Enterprise, FedRAMP/SOC2. 25% of Fortune 500.
- **Unleash**: Open-source, self-hostable.

Decouple deployment from release. Set expiration dates on temporary flags. Never reuse flag names (linked to 32% of production incidents). Audit and remove stale flags regularly.

---

## DevOps & Deployment

### Deployment Strategies

| Strategy | Downtime | Risk | Resource Cost | Best For |
|----------|----------|------|---------------|----------|
| **Rolling** | Zero | Medium | 1x + surge | Stateless apps, K8s default |
| **Blue/Green** | Zero | Low | 2x | Zero-downtime with instant rollback |
| **Canary** | Zero | Very Low | 1x + small % | High-traffic, gradual validation |
| **A/B Testing** | Zero | Low | 1x + split | Feature validation with user segments |
| **Recreate** | Yes | High | 1x | Dev/test, stateful legacy |

**Tooling**: Argo Rollouts (canary/blue-green with Prometheus analysis), Flagger (Istio/Linkerd/Traefik traffic shifting).

### Rollback Patterns

- **K8s**: `kubectl rollout undo deployment/<name>`.
- **GitOps**: Revert commit in config repo; ArgoCD/Flux reconciles automatically.
- **Blue/green**: Switch LB back to blue environment.
- **Database**: Backward-compatible migrations (expand-and-contract pattern).
- **Feature flags**: Disable the flag instantly without redeployment.

### Observability Stack

**The "LGTM" Stack (2026):** Loki (logs) + Grafana 11.x (dashboards) + Tempo/Jaeger (traces) + Prometheus 3.x (metrics).

**OpenTelemetry** is the unified instrumentation standard (48.5% adoption, 2025 survey). Vendor-neutral SDKs for metrics, traces, logs. Prometheus 3.x supports OTLP ingestion natively.

**Key practices:** RED metrics (Rate/Errors/Duration) for services; USE metrics (Utilization/Saturation/Errors) for infrastructure. Alert on symptoms (error rate, latency), not causes (CPU). Define SLOs and alert on error budget consumption.

### Incident Response Automation

- **PagerDuty / Opsgenie / incident.io**: Alert routing with escalation policies.
- **Runbook automation**: Pre-defined diagnostic/remediation workflows (PagerDuty Runbook Automation, Rundeck).
- **ChatOps**: Slack/Teams integration for status updates, escalation, timeline generation.
- **Post-incident**: Blameless retrospectives. Document timeline and action items.

---

## Decision Trees

### Decision Tree 1: Which IaC Tool?

```
START: Multi-cloud needed?
 +-- NO (AWS only) --> Want CloudFormation safety nets?
 |     +-- YES --> AWS CDK 2.x
 |     +-- NO  --> Terraform/OpenTofu or Pulumi
 +-- YES --> Prefer declarative (HCL) or imperative (Python/TS/Go)?
       +-- Declarative --> Need open-source license?
       |     +-- YES --> OpenTofu 1.9+ (MPL 2.0, CNCF)
       |     +-- NO  --> Terraform 1.10+ (BSL 1.1, IBM/HashiCorp)
       +-- Imperative --> Pulumi 3.x (native testing, IDE support, ~30% faster onboarding)
```

### Decision Tree 2: Which Deployment Strategy?

```
START: Can the app tolerate brief partial unavailability?
 +-- YES --> Low-risk change?
 |     +-- YES --> Rolling (K8s default, simplest)
 |     +-- NO  --> Blue/Green (instant rollback, 2x resources)
 +-- NO --> Have metric-based automation (Prometheus, etc.)?
       +-- YES --> Canary with Argo Rollouts/Flagger (auto-promote/rollback)
       +-- NO  --> Blue/Green with manual verification
Need user-segment targeting? --> A/B with feature flags
```

### Decision Tree 3: Kubernetes vs. Simpler Alternatives?

```
START: How many services?
 +-- 1-3 --> Need auto-scaling/self-healing/multi-region?
 |     +-- NO  --> ECS Fargate / Cloud Run / App Runner
 |     +-- YES --> Consider managed K8s (evaluate overhead)
 +-- 4-10 --> Have platform engineering capacity?
 |     +-- YES --> Managed K8s (EKS/GKE/AKS)
 |     +-- NO  --> ECS Fargate / Cloud Run
 +-- 10+ --> Managed K8s + platform team/IDP + ArgoCD GitOps
```

---

## Code Examples

### Example 1: GitHub Actions CI/CD Pipeline

```yaml
name: CI/CD Pipeline
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
  id-token: write
  packages: write

jobs:
  lint-and-test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020  # v4.4.0
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run lint && npm test -- --coverage

  security-scan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: aquasecurity/trivy-action@18f2510ee396bbf400402947e7f3b01b8e110956  # v0.29.0
        with: { scan-type: fs, severity: "CRITICAL,HIGH", exit-code: 1 }

  build-and-push:
    needs: [lint-and-test, security-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2
      - uses: docker/login-action@74a5d142397b4f367a81961eba4e8cd7edddf772
        with: { registry: ghcr.io, username: "${{ github.actor }}", password: "${{ secrets.GITHUB_TOKEN }}" }
      - uses: docker/build-push-action@14487ce63c7a62a4a324b0bfb37086795e31c6c1
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Example 2: Production Dockerfile (Multi-Stage)

```dockerfile
# syntax=docker/dockerfile:1.9
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --production

FROM node:22-alpine AS runtime
RUN apk add --no-cache tini && adduser -u 1001 -D appuser
WORKDIR /app
COPY --from=builder --chown=appuser /app/dist ./dist
COPY --from=builder --chown=appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser /app/package.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
```

### Example 3: Terraform ECS Fargate Service (condensed)

```hcl
# modules/ecs-service/main.tf
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.80" }
  }
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }
  deployment_circuit_breaker {
    enable   = true
    rollback = true  # Auto-rollback on deployment failure
  }
  tags = merge(var.tags, { ManagedBy = "terraform" })
}
```

### Example 4: ArgoCD Application + Argo Rollouts Canary

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
    path: services/my-service/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-service
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true, ServerSideApply=true]
---
# Argo Rollouts Canary with Prometheus analysis
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-service
spec:
  replicas: 10
  selector:
    matchLabels: { app: my-service }
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 2m }
        - analysis:
            templates: [{ templateName: success-rate }]
        - setWeight: 25
        - pause: { duration: 5m }
        - setWeight: 100
      trafficRouting:
        istio:
          virtualService: { name: my-service-vsvc }
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 60s
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="my-service",status=~"2.."}[2m]))
            / sum(rate(http_requests_total{service="my-service"}[2m]))
```

---

## Deployment Strategies

Production deployment requires deliberate strategy selection based on risk tolerance, resource
budget, and rollback requirements. The patterns below move from simplest (blue-green) through
progressive delivery (canary) to the infrastructure and observability layers that support them.

### Blue-Green Deployment

Two identical environments run simultaneously: **blue** (current production) and **green** (new
release candidate). Traffic is routed entirely to one environment at a time. The deployment
sequence is: deploy to green, verify health, switch traffic, keep blue as instant rollback.

**Advantages:** Zero downtime, instant rollback (switch back to blue), full production-parity
testing before user exposure. **Trade-off:** Requires 2x infrastructure during the transition
window.

```yaml
# .github/workflows/blue-green-deploy.yml
name: Blue-Green Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to green environment
        run: |
          aws ecs update-service \
            --cluster prod \
            --service app-green \
            --task-definition app:${{ github.sha }} \
            --desired-count 3

      - name: Wait for green to stabilize
        run: |
          aws ecs wait services-stable \
            --cluster prod \
            --services app-green

      - name: Health check green
        run: |
          for i in $(seq 1 30); do
            STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://green.app.example.com/health)
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed on attempt $i"
              exit 0
            fi
            echo "Attempt $i failed (status: $STATUS), retrying in 10s..."
            sleep 10
          done
          echo "Health check failed after 30 attempts"
          exit 1

      - name: Switch traffic to green
        run: |
          aws elbv2 modify-listener \
            --listener-arn ${{ secrets.ALB_LISTENER_ARN }} \
            --default-actions Type=forward,TargetGroupArn=${{ secrets.GREEN_TG_ARN }}

      - name: Verify traffic switch
        run: |
          sleep 30
          curl -sf https://app.example.com/health | jq .version
```

**Rollback procedure:** If post-switch monitoring detects anomalies, revert the listener to
point back at the blue target group. No redeployment required -- blue is still running the
previous known-good version.

### Canary Deployment

Canary releases route a small percentage of production traffic to the new version while the
majority continues hitting the stable release. Traffic is shifted incrementally as confidence
grows: **5% -> 25% -> 100%**. At each stage, automated analysis compares error rates, latency
percentiles, and business metrics between the canary and the baseline.

**When to use canary over blue-green:**
- High-traffic services where even brief full-cutover risk is unacceptable
- When metric-based automated promotion/rollback is available (Argo Rollouts, Flagger)
- When you need gradual user exposure to catch long-tail issues

**Traffic progression example:**

```
Step 1: 5% canary   -- 2 min pause -- run AnalysisTemplate (success rate >= 99%)
Step 2: 25% canary  -- 5 min pause -- run AnalysisTemplate
Step 3: 100% canary -- promotion complete
```

If any analysis step fails, traffic is automatically routed back to the stable version. The
canary pods are scaled down and the rollout is marked as degraded. See Example 4 (Argo Rollouts)
in the Code Examples section above for a full working manifest.

**Key metrics to monitor during canary analysis:**
- HTTP error rate (5xx / total requests) -- threshold: < 1%
- P95 and P99 latency -- threshold: within 10% of baseline
- Pod restart count -- threshold: 0 restarts during analysis window
- Business metrics (conversion rate, checkout success) when applicable

### Infrastructure as Code (Terraform)

Auto Scaling Groups with target tracking policies provide elastic capacity that responds to
real-time demand. The configuration below demonstrates a rolling instance refresh strategy
that maintains 75% healthy capacity during deployments -- ensuring zero downtime while
replacing instances with updated launch templates.

```hcl
# Auto Scaling Group with target tracking
resource "aws_autoscaling_group" "app" {
  name                = "${var.project}-${var.environment}-asg"
  min_size            = var.min_instances
  max_size            = var.max_instances
  desired_capacity    = var.desired_instances
  health_check_type   = "ELB"
  health_check_grace_period = 300
  target_group_arns   = [aws_lb_target_group.app.arn]
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
    }
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}

# CPU-based auto scaling
resource "aws_autoscaling_policy" "cpu_target" {
  name                   = "${var.project}-cpu-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
    disable_scale_in = false
  }
}
```

**Scaling considerations:**
- Set `health_check_grace_period` long enough for the application to fully start (including
  warm-up, cache priming, connection pool initialization).
- Use `mixed_instances_policy` with multiple instance types for cost optimization and
  availability across AZs.
- Pair CPU-based scaling with request-count scaling (`ALBRequestCountPerTarget`) for
  web-facing services -- CPU alone misses I/O-bound bottlenecks.

### Monitoring & Alerting (Prometheus)

SLO-based alerting focuses on what matters to users: error rates and latency. The rules below
implement multi-window burn rate alerts that catch both sudden spikes and slow degradation.
Every alert includes a `runbook` annotation linking to the remediation procedure -- alerts
without runbooks become noise.

```yaml
# prometheus-alerts.yml
groups:
  - name: slo-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate exceeds 1% SLO for 5 minutes"
          runbook: "https://wiki.example.com/runbooks/high-error-rate"

      - alert: HighP95Latency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency exceeds 500ms SLO"

      - alert: PodCrashLooping
        expr: |
          increase(kube_pod_container_status_restarts_total[1h]) > 3
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} restarting frequently"
```

**Alert severity guidelines:**
- **critical**: Pages on-call immediately. Error budget burning at 14.4x+ rate. Examples:
  sustained 5xx spike, data loss risk, complete service unavailability.
- **warning**: Notifies team channel. Error budget burning at 6x+ rate. Examples: elevated
  latency, increased restart count, approaching resource limits.
- **info**: Dashboard-only. No notification. Examples: deployment started, scaling event,
  certificate renewal approaching.

### Zero-Downtime Database Migrations

Database schema changes are the most common source of deployment-related outages. The
**expand-contract pattern** ensures backwards compatibility throughout the migration lifecycle
by never removing or renaming something the running application depends on.

**The expand-contract sequence:**

1. **Expand (additive change):** Add the new column, table, or index. The existing application
   ignores these additions -- no code change needed yet. Run this migration independently,
   well before the application deployment.

2. **Deploy new application code:** The updated application writes to both old and new
   columns/tables. It reads from the new structure but falls back to the old if the new
   data is not yet populated.

3. **Backfill:** Migrate existing data from old structure to new. Use batched updates with
   throttling to avoid locking tables or overwhelming replication. Verify row counts match.

4. **Add constraints:** Once backfill is complete and verified, add NOT NULL constraints,
   foreign keys, or unique indexes on the new structure.

5. **Deploy cleanup code:** Remove the fallback reads and dual-writes from the application.
   The application now uses only the new structure.

6. **Contract (remove old structure):** Drop the old column, table, or index. This is safe
   because no running code references it.

**Hard rules for production migrations:**
- Never run `ALTER TABLE ... DROP COLUMN` in the same deployment that stops writing to it.
- Never add a `NOT NULL` column without a `DEFAULT` in the same migration.
- Never rename a column -- add the new one, backfill, drop the old one.
- Always test migrations against a production-sized dataset. A migration that takes 2ms on
  dev can lock a 500M-row table for 30 minutes.
- Use online DDL tools (`pt-online-schema-change`, `gh-ost`, `pg_repack`) for large tables
  to avoid locking.
- Separate migration deployment from application deployment -- run migrations first, verify,
  then deploy application code.

---

*Researched: 2026-03-07 | Sources: [Kellton CI/CD Best Practices](https://www.kellton.com/kellton-tech-blog/continuous-integration-deployment-best-practices-2025), [TekRecruiter CI/CD 2026](https://www.tekrecruiter.com/post/top-10-ci-cd-pipeline-best-practices-for-engineering-leaders-in-2026), [GitLab CI/CD Best Practices](https://about.gitlab.com/blog/how-to-keep-up-with-ci-cd-best-practices/), [Naviteq IaC Comparison](https://www.naviteq.io/blog/choosing-the-right-infrastructure-as-code-tools-a-ctos-guide-to-terraform-pulumi-cdk-and-more/), [dasroot IaC 2026](https://dasroot.net/posts/2026/01/infrastructure-as-code-terraform-opentofu-pulumi-comparison-2026/), [sanj.dev IaC Decision Framework](https://sanj.dev/post/terraform-pulumi-aws-cdk-2025-decision-framework), [CNCF GitOps 2025](https://www.cncf.io/blog/2025/06/09/gitops-in-2025-from-old-school-updates-to-the-modern-way/), [Spacelift Flux vs ArgoCD](https://spacelift.io/blog/flux-vs-argo-cd), [Alpacked Anti-Patterns](https://alpacked.io/blog/devops-anti-patterns/), [IsDown Antipatterns](https://isdown.app/blog/devops-antipatterns), [Faith Forge Labs Supply Chain](https://faithforgelabs.com/blog_supplychain_security_2025.php), [SLSA Framework](https://slsa.dev/blog/2025/07/slsa-e2e), [Aikido Snyk vs Trivy](https://www.aikido.dev/blog/snyk-vs-trivy), [Trivy.dev](https://trivy.dev/), [Nirmata Kyverno vs OPA](https://nirmata.com/2025/02/07/kubernetes-policy-comparison-kyverno-vs-opa-gatekeeper/), [GitHub Reusable Workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), [GHA Feb 2026 Updates](https://github.blog/changelog/2026-02-05-github-actions-early-february-2026-updates/), [Docker Build Cache](https://docs.docker.com/build/cache/optimize/), [Netdata Docker Caching](https://www.netdata.cloud/academy/docker-layer-caching/), [DZone Monorepo CI/CD](https://dzone.com/articles/ci-cd-at-scale-smarter-pipelines-for-monorepos), [Groundcover K8s Strategies](https://www.groundcover.com/blog/kubernetes-deployment-strategies), [Akuity Argo Rollouts](https://akuity.io/blog/automating-blue-green-and-canary-deployments-with-argo-rollouts), [Bytebase Flyway vs Liquibase](https://www.bytebase.com/blog/flyway-vs-liquibase/), [LaunchDarkly Feature Flags](https://launchdarkly.com/blog/what-are-feature-flags/), [Grafana OTel](https://grafana.com/blog/2023/12/18/opentelemetry-best-practices-a-users-guide-to-getting-started-with-opentelemetry/), [PagerDuty Runbook Automation](https://www.pagerduty.com/platform/automation/runbook/), [Steadybit Chaos Tools](https://steadybit.com/blog/top-chaos-engineering-tools-worth-knowing-about-2025-guide/)*
