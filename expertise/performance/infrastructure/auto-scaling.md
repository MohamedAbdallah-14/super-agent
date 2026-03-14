# Auto-Scaling Performance Expertise Module

> **Domain**: Infrastructure Performance
> **Last Updated**: 2026-03-08
> **Confidence Level**: High (benchmarks from production systems, AWS documentation, and peer-reviewed sources)

---

## Table of Contents

1. [Overview and Scaling Taxonomy](#overview-and-scaling-taxonomy)
2. [Horizontal vs Vertical Scaling: Performance Tradeoffs](#horizontal-vs-vertical-scaling-performance-tradeoffs)
3. [Kubernetes HPA and VPA](#kubernetes-hpa-and-vpa)
4. [Kubernetes Node Scaling: Cluster Autoscaler vs Karpenter](#kubernetes-node-scaling-cluster-autoscaler-vs-karpenter)
5. [KEDA: Event-Driven Autoscaling](#keda-event-driven-autoscaling)
6. [AWS Auto Scaling Policies](#aws-auto-scaling-policies)
7. [Serverless Scaling and Cold Starts](#serverless-scaling-and-cold-starts)
8. [Custom Metrics for Scaling](#custom-metrics-for-scaling)
9. [Scaling Speed: Time-to-Ready Analysis](#scaling-speed-time-to-ready-analysis)
10. [Warm Pool Strategies](#warm-pool-strategies)
11. [Cost vs Performance Tradeoffs](#cost-vs-performance-tradeoffs)
12. [Common Bottlenecks](#common-bottlenecks)
13. [Anti-Patterns](#anti-patterns)
14. [Before/After: Configuration Improvements](#beforeafter-configuration-improvements)
15. [Decision Tree: How Should I Configure Auto-Scaling?](#decision-tree-how-should-i-configure-auto-scaling)
16. [Sources](#sources)

---

## Overview and Scaling Taxonomy

Auto-scaling is the automatic adjustment of compute resources in response to demand.
The three fundamental dimensions are:

| Dimension | Mechanism | Latency to Effect | Cost Profile |
|---|---|---|---|
| **Horizontal** (scale out/in) | Add/remove instances or pods | 45s-4min (pods), 1-5min (VMs) | Linear with instance count |
| **Vertical** (scale up/down) | Resize CPU/memory of existing units | 0s (in-place VPA) to 2min (restart) | Step function at instance type boundaries |
| **Functional** | Offload to specialized services | N/A (architectural) | Varies by service |

Scaling triggers fall into two categories:

- **Reactive**: Respond to observed metric thresholds (CloudWatch alarms, HPA polling). Scaling-related latency of 2-5 minutes is typical.
- **Predictive/Proactive**: Use ML models to forecast demand and pre-provision capacity. Reduces scaling-related latency by 65-80% compared to reactive approaches. Hybrid approaches reduce average response time by 35% while maintaining resource utilization above 75%.

---

## Horizontal vs Vertical Scaling: Performance Tradeoffs

### Horizontal Scaling (Scale Out)

**Strengths:**
- Near-linear throughput increase for stateless workloads (adding 10 pods yields ~10x throughput for embarrassingly parallel work)
- No upper hardware ceiling -- scale to thousands of nodes
- Built-in fault tolerance -- losing 1 of 20 instances loses only 5% capacity
- Geographic distribution reduces client latency by 30-70ms per continent hop

**Performance costs:**
- Network latency between instances: 0.1-0.5ms intra-AZ, 0.5-2ms cross-AZ, 50-150ms cross-region
- Load balancer overhead: 0.05-0.2ms per request for ALB/NLB
- Distributed state coordination: Two-Phase Commit adds 2-10ms per transaction
- Session affinity complexity: sticky sessions reduce effective capacity by 15-30%

**Best for:** Stateless APIs, web frontends, worker queues, microservices with >1000 RPS

### Vertical Scaling (Scale Up)

**Strengths:**
- Zero distributed systems overhead -- all data local to one machine
- Complex SQL joins execute 2-5x faster than cross-shard equivalents
- ACID transactions without distributed coordination
- Simpler operational model -- 1 server to monitor, backup, tune

**Performance costs:**
- Hardware ceiling: largest EC2 instance (u-24tb1.112xlarge) has 448 vCPUs and 24TB RAM
- Scaling requires downtime for non-live-resize platforms: 1-5 minutes during resize
- Single point of failure without replication
- Diminishing returns: doubling CPU from 64 to 128 cores yields <2x throughput due to lock contention

**Best for:** Relational databases, in-memory caches, legacy monoliths, workloads with <500 RPS

### Head-to-Head Comparison

| Metric | Horizontal | Vertical |
|---|---|---|
| P99 latency (stateless API) | +0.5-2ms (cross-node) | Baseline |
| Max throughput ceiling | Effectively unlimited | Hardware-bound |
| Time to scale | 45s-5min | 1-5min (restart) |
| Data consistency | Requires coordination | Native ACID |
| Cost at 10x load | ~10x baseline | 3-8x baseline (non-linear pricing) |
| Failure blast radius | 1/N capacity lost | 100% capacity lost |

---

## Kubernetes HPA and VPA

### Horizontal Pod Autoscaler (HPA)

The HPA polls metrics every **15 seconds** (default `--horizontal-pod-autoscaler-sync-period`) and adjusts replica count based on the ratio of current to target metric values.

**Scaling formula:**
```
desiredReplicas = ceil(currentReplicas * (currentMetricValue / desiredMetricValue))
```

**Performance characteristics:**
- Reaction time to demand change: **2-4 minutes** end-to-end (15s poll + 3min stabilization window)
- Scale-up stabilization window: **0 seconds** (default, immediate)
- Scale-down stabilization window: **300 seconds** (default, prevents flapping)
- Tolerance band: 10% (no scaling if metric is within 0.9x-1.1x of target)

**Recommended configuration for latency-sensitive workloads:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60    # Leave 40% headroom for spikes
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"       # Scale on business metric too
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100                # Allow doubling per scale event
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10                 # Scale down slowly (10%/min)
        periodSeconds: 60
```

**Key insight**: Organizations using multiple metric types (CPU + custom metrics) for HPA scaling decisions experience fewer outages during traffic surges compared to CPU-only configurations, per the 2024 Kubernetes Benchmark Report.

### Vertical Pod Autoscaler (VPA)

VPA adjusts CPU and memory requests/limits for individual pods based on historical usage.

**Modes:**
| Mode | Behavior | Disruption | Use Case |
|---|---|---|---|
| `Off` | Recommendations only | None | Capacity planning |
| `Initial` | Sets requests at pod creation | None (existing pods) | Batch jobs |
| `Auto` | Evicts and recreates pods | Pod restart (5-30s) | Stateless services |
| `InPlace` (beta, K8s 1.32+) | Resizes without restart | None | Latency-sensitive |

**Real-world optimization results:**
- MongoDB cluster (3 replicas): VPA reduced memory requests from 6GB to 3.41GB, saving 4.2GB across the cluster
- etcd deployment: VPA recommended 93m CPU (vs. 10m initial) and 599MB memory, preventing OOMKills
- Typical memory right-sizing: 20-40% reduction in requested resources

**Critical constraint**: Do NOT run HPA and VPA on the same metric (e.g., both scaling on CPU). HPA adds pods because CPU is high; VPA increases CPU limits because CPU is high. They will fight each other in a scaling seesaw. Use VPA for memory right-sizing and HPA for horizontal scaling on CPU or custom metrics.

### Combining HPA + VPA Effectively

```
VPA handles: memory requests/limits (right-sizing)
HPA handles: replica count based on CPU utilization + custom metrics
Result: Covers ~80% of use cases without conflict
```

---

## Kubernetes Node Scaling: Cluster Autoscaler vs Karpenter

### Cluster Autoscaler (CAS)

- **Architecture**: Periodic scan loop (default 10-second interval)
- **Scaling mechanism**: Manages pre-defined Auto Scaling Groups (ASGs) with fixed instance types
- **Node provisioning time**: **3-4 minutes** end-to-end (scan cycle + ASG spin-up)
- **Scan interval tradeoff**: Reducing scan interval from 10s to 60s cuts API calls by 6x but slows scale-up by 38%

### Karpenter

- **Architecture**: Event-driven reconciliation -- each pending pod immediately triggers provisioning
- **Scaling mechanism**: Direct cloud provider API calls, no ASG dependency
- **Node provisioning time**: **45-60 seconds** in AWS benchmarks
- **Spot interruption recovery**: Can replace a Spot node within the 2-minute interruption notice window

### Performance Comparison

| Metric | Cluster Autoscaler | Karpenter |
|---|---|---|
| Pod-to-running latency | 3-4 minutes | 45-60 seconds |
| Instance type flexibility | Fixed per node group | Any type per pod spec |
| Bin-packing efficiency | Moderate (pre-defined groups) | High (right-sized per workload) |
| Cost reduction (reported) | Baseline | Up to 70% vs CAS |
| Spot instance support | Via ASG mixed instances | Native, with consolidation |
| Scale-down intelligence | Node utilization threshold | Active consolidation (replaces underutilized nodes) |

**Production benchmark** (SaaS workload): Karpenter brought CPU-bound pods online in ~55 seconds, while Cluster Autoscaler required 3-4 minutes -- primarily ASG spin-up time.

AWS introduced **EKS Auto Mode** (November 2024), which abstracts node management entirely. Early adopters report 60-70% cost savings and 80% reduction in infrastructure management time.

---

## KEDA: Event-Driven Autoscaling

KEDA (Kubernetes Event-Driven Autoscaling) extends HPA with external event sources.

**Key capability**: Scale to zero when idle, scale from zero on first event. This is impossible with standard HPA.

**Supported scalers**: 60+ including Kafka, RabbitMQ, AWS SQS, Azure Service Bus, PostgreSQL, Redis, Prometheus, Datadog, HTTP request count.

**Architecture:**
```
Event Source (e.g., SQS queue)
    |
    v
KEDA Metrics Server --> HPA --> Deployment
    |
    v
ScaledObject CRD (defines thresholds)
```

**Performance characteristics:**
- Metric polling interval: configurable, typically 15-30 seconds
- Scale-from-zero latency: container startup time + pod scheduling (typically 5-30 seconds)
- Scale-to-zero cooldown: configurable (default 300 seconds)

**Example: SQS queue-based scaling:**
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 0        # Scale to zero when queue is empty
  maxReplicaCount: 100
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/orders
      queueLength: "5"      # Target 5 messages per pod
      awsRegion: us-east-1
```

**When to use KEDA over HPA:**
- Queue-based workloads that should scale to zero
- Event-driven architectures (Kafka consumers, webhook processors)
- Workloads driven by external metrics (database row count, API rate)

---

## AWS Auto Scaling Policies

### Target Tracking Scaling

Automatically adjusts capacity to keep a metric at a target value. AWS **strongly recommends** this as the default policy type.

**Behavior:**
- Scales out aggressively (proportional to metric overshoot)
- Scales in gradually (conservative to avoid flapping)
- Creates and manages CloudWatch alarms automatically
- Uses 1-minute metrics for fastest response (recommended over 5-minute defaults)

**Pre-defined metrics:**
| Metric | Typical Target | Best For |
|---|---|---|
| `ASGAverageCPUUtilization` | 50-70% | General compute |
| `ALBRequestCountPerTarget` | 100-1000 | Web APIs |
| `ASGAverageNetworkOut` | Varies | Data processing |
| Custom CloudWatch metric | Application-specific | Business logic |

**Example configuration:**
```json
{
  "TargetTrackingScalingPolicyConfiguration": {
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60,
    "DisableScaleIn": false
  }
}
```

### Step Scaling

Provides graduated scaling responses based on alarm breach severity.

**Advantages over target tracking:**
- Fine-grained control: small load increase adds 1 instance, large surge adds 10
- Multiple step adjustments prevent over-provisioning for moderate increases
- Better for workloads with non-linear resource requirements

**Example step configuration:**
```
CPU 60-70% → Add 1 instance
CPU 70-80% → Add 3 instances
CPU 80-90% → Add 5 instances
CPU >90%   → Add 10 instances
```

### Predictive Scaling

Uses ML models trained on 14 days of historical data to forecast demand and pre-provision capacity.

**Performance benefits:**
- Reduces scaling-related latency by 65-80% vs reactive approaches
- Pre-provisions capacity before demand spike arrives
- Reduces underprovisioned intervals by 45-60% vs threshold-based approaches

**Best suited for:**
- Cyclical traffic (business hours vs off-hours): daily patterns with 3-5x variation
- Recurring batch processing windows
- Applications with long initialization (>60 seconds bootstrap)

**Requirements:**
- Minimum 24 hours of historical data (14 days recommended)
- Traffic must have repeating patterns (random traffic defeats prediction)
- Forecasts generated every 6 hours, capacity provisioned 1 hour before predicted need

**Cost savings**: 20-30% reduction in infrastructure costs for workloads with recognizable patterns, because capacity is right-sized rather than over-provisioned as a buffer.

### Policy Selection Guide

| Scenario | Recommended Policy | Why |
|---|---|---|
| General web API | Target Tracking on ALBRequestCount | Proportional, self-managing |
| CPU-intensive batch | Step Scaling on CPU | Graduated response to load levels |
| Daily traffic pattern | Predictive + Target Tracking | Pre-warm + reactive fallback |
| Queue processing | Target Tracking on custom backlog metric | Proportional to actual work |
| Scheduled events (sales) | Scheduled + Target Tracking | Guaranteed minimum + dynamic |

---

## Serverless Scaling and Cold Starts

### AWS Lambda Cold Start Benchmarks

Cold start time = INIT phase (runtime bootstrap + dependency loading + function initialization).

**By runtime (simple functions, 2025 benchmarks):**

| Runtime | P50 Cold Start | P99 Cold Start | Warm Invocation P50 |
|---|---|---|---|
| Python 3.12 | 100-200ms | 300-500ms | 1-5ms |
| Node.js 20 | 100-200ms | 300-600ms | 1-5ms |
| Go (provided.al2023) | 8-15ms | 30-50ms | 0.5-2ms |
| Rust (provided.al2023) | 8-15ms | 30-50ms | 0.5-2ms |
| Java 21 (no SnapStart) | 3,000-4,000ms | 5,000-6,000ms | 2-10ms |
| Java 21 (SnapStart) | 150-200ms | 600-700ms | 2-10ms |
| .NET 8 (Native AOT) | 200-400ms | 600-1,000ms | 1-5ms |

**Key finding**: Java SnapStart reduces P50 cold starts from 3,841ms to 182ms -- a **95% reduction** at the median. SnapStart expanded to Python (November 2024) and .NET 8 with Native AOT.

**Factors that multiply cold start time:**
- VPC attachment: historically added 10+ seconds, now <1 second with Hyperplane ENIs
- Package size: each additional 1MB adds ~2-5ms to INIT
- Dependency count: heavy frameworks (Spring Boot, Django) add 500-3000ms
- Memory allocation: 128MB vs 1024MB can mean 3x slower INIT (CPU scales with memory)

**Architecture impact (Arm64 vs x86_64):**
Graviton2-based arm64 Lambda functions show **13-24% faster cold start initialization** at equivalent memory settings.

**Billing change (August 2025):** AWS now bills for the Lambda INIT phase, making cold start frequency a direct cost factor in addition to a latency concern.

### Container Cold Starts (ECS Fargate, Kubernetes)

Container cold starts are 10-100x slower than Lambda cold starts.

**Fargate cold start breakdown (production benchmarks):**

| Phase | Duration | Optimization |
|---|---|---|
| ENI Provisioning | 10-30 seconds | Cannot optimize (platform) |
| Image Pull | 5-60 seconds | Use SOCI, smaller images, ECR in same region |
| Layer Extraction | 2-15 seconds | Use zstd compression (27% reduction) |
| Application Bootstrap | 1-10 seconds | Optimize startup code, lazy init |
| **Total (unoptimized)** | **20-60 seconds** | -- |
| **Total (optimized)** | **3-8 seconds** | SOCI + small image + zstd |

**Optimization results:**
- SOCI (Seekable OCI) lazy loading: **50% startup acceleration**; 10GB Deep Learning Container showed ~60% improvement in pull times
- zstd compression: up to **27% reduction** in task/pod startup time
- Production achievement (Prime Day 2025): P99 cold starts reduced from 38 seconds to **under 4 seconds**

**Kubernetes pod startup time (typical):**

| Component | Duration |
|---|---|
| Scheduling decision | 0.5-2 seconds |
| Image pull (cached) | 0-1 seconds |
| Image pull (uncached, 500MB) | 5-20 seconds |
| Container start | 0.5-2 seconds |
| Readiness probe pass | 1-30 seconds (app-dependent) |
| **Total (cached image)** | **2-5 seconds** |
| **Total (cold pull)** | **10-30 seconds** |

---

## Custom Metrics for Scaling

CPU and memory utilization are lagging indicators. By the time CPU hits 80%, users are already experiencing degraded performance. Custom metrics provide **leading indicators** of demand.

### Metric Categories and Use Cases

**Queue-Based Metrics (most responsive for async workloads):**

| Metric | How to Calculate Target | Example |
|---|---|---|
| Backlog per instance | acceptable_latency / avg_processing_time | 10s latency / 0.1s per msg = 100 msgs/instance |
| Queue depth | total_messages / target_per_instance | 5000 msgs / 50 per pod = 100 pods |
| Age of oldest message | Alert if > SLA threshold | Scale if oldest > 30 seconds |

**Important**: Scale on backlog-per-instance, not raw queue depth. Raw depth does not account for processing speed or current instance count.

**Request-Based Metrics (best for synchronous APIs):**

| Metric | Target | When to Use |
|---|---|---|
| Requests per second per pod | 50-500 (benchmark your app) | HTTP APIs with known capacity |
| P95 response latency | Your SLA target (e.g., 200ms) | Latency-sensitive services |
| Error rate (5xx) | 0.1-1% | Overload detection |
| Active connections per instance | 80% of max (e.g., 800 of 1000) | Connection-limited services |

**Business Metrics (most aligned with value):**

| Metric | Example | Benefit |
|---|---|---|
| Orders per minute | Scale checkout service at 50 orders/min/pod | Directly tied to revenue |
| Active users | Scale at 1000 concurrent users per instance | Capacity planning |
| Payment queue depth | Scale payment processor per backlog | SLA compliance |
| Search queries per second | Scale search cluster at 200 QPS/node | User experience |

### Implementing Custom Metrics in Kubernetes

**Prometheus Adapter example (exposing HTTP request rate to HPA):**
```yaml
# prometheus-adapter-config
rules:
- seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      pod: {resource: "pod"}
  name:
    matches: "^(.*)_total"
    as: "${1}_per_second"
  metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

**HPA using the custom metric:**
```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "200"    # Scale when avg exceeds 200 RPS/pod
```

### AWS Custom Metric Scaling (SQS Example)

The recommended approach for SQS is to calculate **backlog per instance**:

```
backlog_per_instance = ApproximateNumberOfMessagesVisible / RunningTaskCount
target_backlog = acceptable_latency / average_processing_time
```

If average processing time = 0.1 seconds and acceptable latency = 10 seconds:
- Target backlog per instance = 10 / 0.1 = **100 messages**
- With 5000 messages in queue and target of 100: desired = 5000 / 100 = **50 instances**

**Critical monitoring**: Track both queue depth AND age of oldest message. Scaling on depth alone may miss important messages aging past SLA thresholds.

---

## Scaling Speed: Time-to-Ready Analysis

The total time from "demand increase detected" to "new capacity serving traffic" varies dramatically by platform.

### End-to-End Scaling Timeline

```
                    Detection    Provisioning    Healthy
                    ─────────    ────────────    ───────
Lambda (warm):      0s           0s              0s         = 0s total
Lambda (cold):      0s           0.1-5s          0s         = 0.1-5s total
K8s Pod (cached):   15-30s       2-5s            1-30s      = 18-65s total
K8s Pod (Karpenter): 0-5s        45-60s          5-30s      = 50-95s total
K8s Pod (CAS):      10-30s       180-240s        5-30s      = 195-300s total
EC2 (ASG):          60-300s      60-180s         30-120s    = 150-600s total
EC2 (Warm Pool):    60-300s      5-30s           5-30s      = 70-360s total
Fargate (cold):     15-60s       20-60s          1-30s      = 36-150s total
Fargate (optimized): 15-60s      3-8s            1-30s      = 19-98s total
```

### Breakdown of Detection Phase

| Scaling System | Detection Mechanism | Detection Latency |
|---|---|---|
| HPA | Polling (15s default) | 0-15 seconds |
| KEDA | Polling (configurable) | 0-30 seconds |
| Karpenter | Event-driven (pending pods) | 0-5 seconds |
| Cluster Autoscaler | Scan loop (10s default) | 0-10 seconds |
| AWS Target Tracking | CloudWatch alarm (1-5 min) | 60-300 seconds |
| AWS Predictive | ML forecast (1hr ahead) | Pre-provisioned |

### Key Takeaway

For latency-sensitive workloads that must handle spikes within 60 seconds, the only viable options are:
1. **Over-provision** (maintain 30-50% headroom)
2. **Lambda** (instant scaling if functions are warm, <5s cold)
3. **Pre-warmed capacity** (warm pools, provisioned concurrency, min replicas)
4. **Predictive scaling** (if traffic is patterned)

---

## Warm Pool Strategies

Warm pools pre-initialize resources so they can be placed into service faster than cold-starting new ones.

### AWS EC2 Warm Pools

**Instance states in warm pool:**

| State | Boot Time to Service | Cost | Use Case |
|---|---|---|---|
| Running | 5-10 seconds | Full instance cost | Ultra-fast scaling, short spikes |
| Stopped | 30-60 seconds | EBS storage cost only | Cost-effective for moderate latency tolerance |
| Hibernated | 10-30 seconds | EBS storage + memory snapshot | Stateful apps, OS-level caches |

**Configuration:**
```json
{
  "WarmPool": {
    "MinSize": 2,
    "MaxGroupPreparedCapacity": 10,
    "PoolState": "Stopped",
    "InstanceReusePolicy": {
      "ReuseOnScaleIn": true
    }
  }
}
```

**Key consideration**: If the warm pool is depleted during a scale-out event, instances launch cold (full boot). Size your warm pool to cover expected burst magnitude.

**Recent expansion (2025)**: AWS added warm pool support for Auto Scaling groups with mixed instances policies, enabling Spot + On-Demand warm pools.

### Lambda Provisioned Concurrency

Pre-initializes a specified number of execution environments, eliminating cold starts entirely for those instances.

**Performance:**
- Cold start: **0ms** for provisioned instances
- Spillover: Standard cold start if demand exceeds provisioned count
- Scaling: Provisioned concurrency can be scheduled or managed via Application Auto Scaling

**Cost model:**
- Provisioned rate: ~60% cheaper per GB-second than on-demand execution
- But: you pay 24/7 even with zero requests
- Break-even: typically cost-effective at >100 invocations/hour consistently

**Strategic warm-up alternative**: CloudWatch Events timer every 5 minutes sending concurrent warm-up requests. Achieves 80-95% warm availability at 5-15% of the cost of full provisioned concurrency.

### Kubernetes Warm Strategies

**Over-provisioning with priority-based preemption:**
```yaml
# Low-priority "balloon" pods that hold capacity
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: overprovisioning
value: -1              # Lowest priority
preemptionPolicy: Never
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overprovisioning
spec:
  replicas: 3
  template:
    spec:
      priorityClassName: overprovisioning
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
```

When real workloads need resources, balloon pods are evicted instantly (0 seconds). New pods schedule on the freed capacity without waiting for node provisioning.

**Effective warm capacity**: 3 balloon pods x 2 CPU x 4Gi = 6 CPU and 12Gi always available for burst. Cost: ~$200-400/month for 3 medium instances.

---

## Cost vs Performance Tradeoffs

### The Fundamental Tension

```
Over-provisioning                          Under-provisioning
(high cost, low latency)                   (low cost, high latency risk)
     |                                              |
     |  ← Sweet Spot: 60-70% utilization →          |
     |                                              |
  30% idle capacity                        Users hit latency spikes
  $$$$ wasted                              during scale-up lag
  Zero scaling lag                         2-5 min degraded performance
```

**Industry benchmark (CAST AI Report 2025):** Average resource utilization across cloud providers is 67% (AWS) and 66% (GCP). This means 33-34% of compute spend is wasted on idle capacity -- but this waste buys protection against scaling lag.

### Cost-Performance Matrix

| Strategy | Cost Overhead | P99 Latency During Spike | Time to Full Capacity |
|---|---|---|---|
| Always over-provisioned (50% headroom) | +50% baseline | 0ms impact | 0 seconds |
| Moderate headroom (20%) + reactive HPA | +20% baseline | +50-200ms for 2-4 min | 2-4 minutes |
| Tight provisioning + aggressive HPA | +5% baseline | +200-500ms for 3-5 min | 3-5 minutes |
| Predictive + reactive hybrid | +10-15% baseline | +20-50ms for 30-60s | 30-60 seconds |
| Scale-to-zero (KEDA/Lambda) | Pay-per-use only | Cold start penalty | 0.1s-30s |

### GPU Workload Waste

GPU workloads often suffer from high idle time and unused memory. A single A100 costs ~$3/hour; idle GPU capacity at scale translates to tens of thousands in monthly waste. Auto-scaling GPU workloads with Karpenter or KEDA (based on inference queue depth) can reduce GPU costs by 40-60%.

### Right-Sizing Formula

```
target_capacity = peak_demand * (1 + safety_margin)
safety_margin = scaling_time / acceptable_degradation_time

Example:
  Peak demand: 100 pods
  Scaling time: 3 minutes (180s)
  Acceptable degradation: 1 minute (60s)
  Safety margin: 180/60 = 3.0 (300%)
  Target capacity: 100 * 4 = 400 pods ← Unsustainable!

Better approach:
  Use predictive scaling (reduces effective scaling time to 30s)
  Safety margin: 30/60 = 0.5 (50%)
  Target capacity: 100 * 1.5 = 150 pods ← Manageable
```

---

## Common Bottlenecks

### 1. Slow Scale-Up

**Symptom**: Latency spikes lasting 3-10 minutes during traffic increases.

**Root causes and fixes:**

| Root Cause | Impact | Fix | Improvement |
|---|---|---|---|
| Large container images (>1GB) | +20-60s pull time | Multi-stage builds, distroless base | 50-80% smaller images |
| Slow health checks | +30-120s before serving | Separate liveness/readiness, fast startup probe | 30-60s faster |
| CAS scan interval too long | +60s detection delay | Reduce to 10s or switch to Karpenter | 45-60s faster |
| CloudWatch 5-min metrics | +300s detection delay | Switch to 1-min detailed monitoring | 240s faster |
| Cold node pool (no warm pool) | +120-180s boot time | EC2 warm pool or Karpenter | 90-150s faster |

### 2. Database Becomes Bottleneck During Scale

**Symptom**: Application scales horizontally but response times increase because all new instances hit the same database.

**The math:**
- 10 pods, each with 50 DB connections = 500 connections
- Scale to 30 pods = 1,500 connections
- RDS max_connections for db.r5.xlarge = 2,730
- At 40 pods = 2,000 connections (73% of max, performance degrades at >70%)

**Fixes:**
1. **Connection pooling** (PgBouncer, ProxySQL): Reduce per-pod connections from 50 to 5-10
2. **Read replicas**: Route read traffic to replicas, scale reads independently
3. **Database-aware scaling limits**: Set HPA maxReplicas based on DB connection budget
4. **Caching layer**: Add Redis/Memcached to absorb repeated reads (70-90% cache hit rate typical)

### 3. Thundering Herd After Scale Events

**Symptom**: Cache expires or service restarts, and all new instances simultaneously fetch the same data, overwhelming backends.

**The timeline:**
- Auto-scaling adds 20 instances at T=0
- All 20 instances start with cold caches at T=+30s
- All 20 simultaneously query the database for warm-up data at T=+31s
- Database CPU spikes to 100%, queries timeout at T=+32s
- Auto-scaling detects failure, may add MORE instances (cascading failure)

**Mitigation strategies:**

| Strategy | Mechanism | Effectiveness |
|---|---|---|
| Request coalescing | Single fetch, shared response for identical concurrent requests | Reduces DB load by 90%+ during storms |
| Jittered cache TTLs | Random ±10-20% on TTL prevents synchronized expiry | Eliminates cache stampede |
| Exponential backoff with jitter | 200ms, 400ms, 800ms delays with random offset | Staggers retry storms |
| Staggered rollout | Roll out new instances 2-3 at a time with 30s intervals | Prevents simultaneous cold cache |
| Cache pre-warming | Load critical data before marking instance healthy | Zero cold-cache window |

**Key number**: Auto-scaling takes 45+ seconds to respond to spikes, while a thundering herd spike happens in seconds. By the time scaling responds, the damage is done. Prevention (coalescing, jitter, pre-warming) beats reaction.

---

## Anti-Patterns

### 1. Scaling on CPU Only

**Why it fails**: CPU is a lagging indicator. By the time CPU reaches 80%, request queues are already saturated and users experience 2-5x latency.

**Additional problem with memory**: Most application runtimes do not release memory after load decreases. They keep memory allocated for reuse. Scaling on memory utilization may scale out but **never scale back in**.

**Fix**: Use request-based or queue-based metrics as primary scaling signals. Use CPU as a safety backstop only.

### 2. No Scale-Down Policy

**What happens**: `disableScaleIn: true` or overly conservative scale-down settings cause capacity to ratchet up permanently. A single daily spike provisions instances that run 24/7 at <10% utilization.

**Cost impact**: A 20-instance ASG that should average 8 instances wastes 12 instances * $0.10/hr * 720 hrs/month = **$864/month** in idle capacity.

**Fix**: Configure aggressive but stable scale-down:
- Scale-down cooldown: 300 seconds (prevents flapping)
- Scale-down evaluation: 15 consecutive minutes below threshold
- Scale-down rate: 1-2 instances per evaluation period

### 3. Scaling to Infinity (No Max Limit)

**What happens**: A bug, retry storm, or DDoS triggers unbounded scaling. Thousands of instances launch. Monthly bill: $50,000+.

**Real scenario**: A misconfigured health check returns 500 errors. Load balancer retries. Each retry increases load. Auto-scaling adds instances. New instances also return 500s. More retries. More scaling. 200 instances running within 10 minutes, none serving real traffic.

**Fix**: Always set `maxReplicas` / `MaxSize`. Set billing alerts at 150% and 200% of expected spend. Use AWS Service Quotas as a hard ceiling.

### 4. Scaling Oscillation (Flapping)

**What happens**: Scale-up threshold at 70% CPU, scale-down at 60% CPU. Adding instances drops CPU to 55%. Scale-down triggers. Removing instances raises CPU to 75%. Scale-up triggers. Infinite loop.

**Fix**: Maintain at least a 20% gap between scale-up and scale-down thresholds. Use stabilization windows: 0 seconds for scale-up, 300+ seconds for scale-down.

### 5. Ignoring Startup Time in Scaling Calculations

**What happens**: HPA targets 70% CPU. Application takes 60 seconds to start serving. During those 60 seconds, existing pods handle 100% of traffic at 90% CPU. HPA sees 90%, adds MORE pods. Overshoot by 2-3x.

**Fix**: Account for startup time with `scaleUp.stabilizationWindowSeconds`. Use readiness gates to prevent HPA from counting pods that are not yet serving traffic.

### 6. HPA + VPA Conflict on Same Metric

**What happens**: Both scale on CPU. CPU rises. HPA adds pods. VPA increases CPU requests. More total CPU requested than available. Pods go Pending. Cluster Autoscaler adds nodes. Massive over-provisioning.

**Fix**: VPA for memory only. HPA for CPU and custom metrics.

---

## Before/After: Configuration Improvements

### Case 1: E-Commerce API During Flash Sale

**Before** (naive configuration):
```yaml
# HPA: CPU only, default settings
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

**Behavior during 10x traffic spike:**
- T=0: Traffic spike begins, CPU at 30%
- T=+60s: CPU reaches 80%, HPA triggers
- T=+120s: 2 new pods starting, CPU at 95%, P99 latency: 2,500ms
- T=+180s: New pods ready, but only at 4 total. Still need more.
- T=+300s: 6 pods running. CPU at 75%. P99 latency: 800ms
- T=+420s: 8 pods running. Stabilized. P99 latency: 200ms
- **Total degradation window: 7 minutes. Peak P99: 2,500ms**

**After** (optimized configuration):
```yaml
spec:
  minReplicas: 5              # Higher baseline for faster initial absorption
  maxReplicas: 50             # Room to grow
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60  # Lower target = earlier scaling
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "200"     # Leading indicator
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100              # Double capacity per minute
        periodSeconds: 60
      - type: Pods
        value: 10               # Or add 10 pods, whichever is greater
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

**Behavior during 10x traffic spike:**
- T=0: Traffic spike begins, 5 pods absorb initial burst
- T=+15s: HPA detects RPS increase (leading indicator), triggers scale-up
- T=+20s: 10 pods targeted (100% increase)
- T=+45s: 10 pods ready and serving. CPU at 65%. P99 latency: 250ms
- T=+60s: HPA evaluates again, adds 5 more pods (RPS still above target)
- T=+90s: 15 pods running. Stabilized. P99 latency: 150ms
- **Total degradation window: 45 seconds. Peak P99: 350ms**

**Improvement: 7 minutes degradation reduced to 45 seconds. Peak P99 reduced from 2,500ms to 350ms.**

### Case 2: AWS ASG with Predictive Scaling

**Before** (reactive only):
```
Policy: Target Tracking on CPU at 70%
Metrics: 5-minute CloudWatch intervals
Warm pool: None
Min: 2, Max: 20
```
- Daily traffic pattern: 3x spike at 9 AM, ramp-down at 6 PM
- Every morning: 5-8 minutes of degraded performance (P99 >1s) while scaling from 2 to 8 instances
- Each instance takes 3 minutes to boot + pass health checks

**After** (predictive + reactive + warm pool):
```
Policy: Predictive Scaling (forecast mode) + Target Tracking at 65%
Metrics: 1-minute detailed monitoring
Warm pool: 4 Stopped instances
Min: 2, Max: 20
Predictive: provisions capacity 1 hour before predicted need
```
- 8 AM: Predictive scaling launches 6 instances from warm pool (30s boot from stopped)
- 8:30 AM: 8 instances ready before traffic arrives
- 9 AM: Traffic spike absorbed by pre-provisioned capacity. P99: 180ms
- Reactive target tracking handles any variance above prediction
- **Result: Zero degradation window. P99 stays under 200ms throughout the day.**

### Case 3: Lambda Function with Provisioned Concurrency

**Before**:
```
Runtime: Java 21
Memory: 512MB
Provisioned Concurrency: None
Cold start P50: 3,841ms
Cold start P99: 5,200ms
```
- API Gateway timeout set to 10 seconds
- 5% of requests hit cold starts
- 0.3% of cold-start requests timeout entirely (>10s)
- User-facing error rate: 0.015%

**After**:
```
Runtime: Java 21 with SnapStart
Memory: 1024MB (2x CPU allocation)
Provisioned Concurrency: 20 (covers P95 concurrent demand)
Cold start P50: 182ms (SnapStart for spillover)
Cold start P99: 700ms (SnapStart for spillover)
```
- Provisioned handles 95% of invocations: 0ms cold start
- Spillover 5% uses SnapStart: 182ms P50 cold start
- Timeout rate: 0%
- **Result: P50 cold start reduced by 95%. Timeout errors eliminated.**

---

## Decision Tree: How Should I Configure Auto-Scaling?

```
START: What type of workload?
│
├─► Synchronous API (HTTP/gRPC)
│   │
│   ├─► Latency-sensitive (P99 < 200ms SLA)?
│   │   │
│   │   ├─► YES: Use HPA with request-rate metric + CPU backstop
│   │   │       Set minReplicas to handle 30% of peak
│   │   │       Use Karpenter (not CAS) for node scaling
│   │   │       Enable predictive scaling if traffic is patterned
│   │   │       Consider balloon pods for instant burst capacity
│   │   │
│   │   └─► NO: Use HPA with CPU at 60-70% target
│   │           Default minReplicas (2-3 for HA)
│   │           Cluster Autoscaler is sufficient
│   │
│   └─► Serverless candidate? (< 1000 RPS, spiky traffic)
│       │
│       ├─► YES: Lambda + API Gateway
│       │       Use SnapStart for Java/.NET
│       │       Provisioned Concurrency if P99 < 500ms required
│       │       Arm64 (Graviton) for 13-24% faster cold starts
│       │
│       └─► NO: Stay on containers (ECS/EKS)
│
├─► Asynchronous Queue Processing
│   │
│   ├─► Can tolerate scale-to-zero? (no traffic = no cost)
│   │   │
│   │   ├─► YES: KEDA with queue-length scaler
│   │   │       Set target messages-per-pod based on:
│   │   │         acceptable_latency / avg_processing_time
│   │   │       Monitor oldest message age (not just depth)
│   │   │
│   │   └─► NO: HPA with custom backlog-per-instance metric
│   │           minReplicas: 1-3 for always-on processing
│   │
│   └─► Processing time per message?
│       │
│       ├─► < 15 minutes: Lambda (SQS trigger, automatic scaling)
│       │
│       └─► > 15 minutes: ECS/EKS with KEDA or HPA
│
├─► Batch / Scheduled Workload
│   │
│   ├─► Predictable schedule?
│   │   │
│   │   ├─► YES: Scheduled scaling (cron-based min/max)
│   │   │       + Target Tracking for variance
│   │   │       + Warm pool for fast scale-up
│   │   │
│   │   └─► NO: Event-driven (KEDA or Step Functions)
│   │
│   └─► GPU required?
│       │
│       ├─► YES: Karpenter with GPU node pools
│       │       Scale on inference queue depth (KEDA)
│       │       Aggressive scale-down (GPU instances are expensive)
│       │
│       └─► NO: Standard compute auto-scaling
│
└─► Stateful Workload (Database, Cache)
    │
    ├─► Vertical scaling first (larger instance type)
    │   Until: single-instance limits reached OR cost prohibitive
    │
    ├─► Read scaling: Add read replicas with connection routing
    │
    ├─► Write scaling: Sharding (application-level partitioning)
    │
    └─► Managed auto-scaling:
        ├─► Aurora: Auto-scales storage + read replicas
        ├─► DynamoDB: On-demand or provisioned with auto-scaling
        └─► ElastiCache: Cluster mode with shard auto-scaling
```

### Quick Reference: Scaling Configuration Checklist

```
[ ] Set maxReplicas / MaxSize (NEVER leave unbounded)
[ ] Set minReplicas >= 2 for HA (production workloads)
[ ] Use request-based or queue-based metrics as PRIMARY scaling signal
[ ] Use CPU as SECONDARY backstop only
[ ] Configure scale-up: stabilizationWindowSeconds = 0
[ ] Configure scale-down: stabilizationWindowSeconds >= 300
[ ] Ensure 20%+ gap between scale-up and scale-down thresholds
[ ] Test actual scaling speed end-to-end (don't assume)
[ ] Set billing alerts at 150% and 200% of expected spend
[ ] Monitor database connections as a function of instance count
[ ] Implement connection pooling before scaling application tier
[ ] Use warm pools or predictive scaling for boot times > 60s
[ ] Separate VPA (memory) from HPA (CPU + custom) to avoid conflicts
[ ] Configure PodDisruptionBudgets for scale-down safety
[ ] Load test at 2x expected peak to validate scaling behavior
```

---

## Sources

- [AWS EC2 Auto Scaling Predictive Scaling Documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html)
- [AWS EC2 Auto Scaling Warm Pools](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html)
- [AWS Target Tracking Scaling Policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html)
- [AWS Step and Simple Scaling Policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html)
- [AWS SQS-Based Scaling Policy](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html)
- [AWS Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [AWS Lambda Cold Start Benchmarks - maxday](https://maxday.github.io/lambda-perf/)
- [AWS Lambda Cold Starts in 2025 - Edge Delta](https://edgedelta.com/company/knowledge-center/aws-lambda-cold-start-cost)
- [AWS Lambda Cold Start Optimization 2025 - Zircon Tech](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/)
- [AWS Lambda Cold Start 7 Fixes 2026 - AgileSoft Labs](https://www.agilesoftlabs.com/blog/2026/02/aws-lambda-cold-start-7-proven-fixes)
- [AWS Lambda Arm64 vs x86_64 Performance - Chris Ebert](https://chrisebert.net/comparing-aws-lambda-arm64-vs-x86_64-performance-across-multiple-runtimes-in-late-2025/)
- [Serverless Java Cold Start Solved 2025 - Devrim Ozcay](https://devrimozcay.medium.com/serverless-java-aws-lambda-cold-start-solved-in-2025-ea3d28c734c3)
- [Reducing Fargate Startup with zstd - AWS Blog](https://aws.amazon.com/blogs/containers/reducing-aws-fargate-startup-times-with-zstd-compressed-container-images/)
- [Taming Cold Starts on Fargate - AWS Plain English](https://aws.plainenglish.io/taming-cold-starts-on-aws-fargate-the-architecture-behind-sub-5-second-task-launches-622ebd73b051)
- [Advanced Autoscaling Reduces AWS Costs by 70% - InfoQ](https://www.infoq.com/news/2025/08/autoscaling-karpenter-automode/)
- [Kubernetes Autoscaling in 2025 - Sedai](https://www.sedai.io/blog/kubernetes-autoscaling)
- [Kubernetes Best Practices 2025 - KodeKloud](https://kodekloud.com/blog/kubernetes-best-practices-2025/)
- [HPA vs VPA Kubernetes Autoscaling 2025 - ScaleOps](https://scaleops.com/blog/hpa-vs-vpa-understanding-kubernetes-autoscaling-and-why-its-not-enough-in-2025/)
- [Karpenter vs Cluster Autoscaler 2025 - ScaleOps](https://scaleops.com/blog/karpenter-vs-cluster-autoscaler/)
- [Karpenter vs Cluster Autoscaler - Spacelift](https://spacelift.io/blog/karpenter-vs-cluster-autoscaler)
- [Karpenter vs Cluster Autoscaler - PerfectScale](https://www.perfectscale.io/blog/karpenter-vs-cluster-autoscaler)
- [KEDA - Kubernetes Event-Driven Autoscaling](https://keda.sh/)
- [KEDA Practical Guide - Digital Power](https://medium.com/@digitalpower/kubernetes-based-event-driven-autoscaling-with-keda-a-practical-guide-ed29cf482e7b)
- [HPA Custom Metrics with Prometheus Adapter](https://oneuptime.com/blog/post/2026-02-09-hpa-custom-metrics-prometheus-adapter/view)
- [HPA Object Metrics for Queue-Based Scaling](https://oneuptime.com/blog/post/2026-02-09-hpa-object-metrics-queue/view)
- [Custom Metrics Autoscaling in Kubernetes - Pixie Labs](https://blog.px.dev/autoscaling-custom-k8s-metric/)
- [AWS ECS Auto Scaling with Custom Metrics - AWS Blog](https://aws.amazon.com/blogs/containers/amazon-elastic-container-service-ecs-auto-scaling-using-custom-metrics/)
- [Scaling Depot: Thundering Herd Problem](https://depot.dev/blog/planetscale-to-reduce-the-thundering-herd)
- [Thundering Herd Problem Explained - Dhairya Singla](https://medium.com/@work.dhairya.singla/the-thundering-herd-problem-explained-causes-examples-and-solutions-7166b7e26c0c)
- [Thundering Herds: The Scalability Killer - Aonnis](https://docs.aonnis.com/blog/thundering-herds-the-scalability-killer)
- [Hybrid Reactive-Proactive Auto-scaling - arXiv](https://www.arxiv.org/pdf/2512.14290)
- [Proactive and Reactive Autoscaling for Edge Computing - arXiv](https://arxiv.org/pdf/2510.10166)
- [Predictive Scaling with ML - Hokstad Consulting](https://hokstadconsulting.com/blog/predictive-scaling-with-machine-learning-how-it-works)
- [CAST AI AWS Cost Optimization Report 2025](https://cast.ai/blog/aws-cost-optimization/)
- [Horizontal vs Vertical Scaling - PingCAP](https://www.pingcap.com/horizontal-scaling-vs-vertical-scaling/)
- [Horizontal vs Vertical Scaling - DataCamp](https://www.datacamp.com/blog/horizontal-vs-vertical-scaling)
- [AWS EKS Autoscaling Best Practices](https://docs.aws.amazon.com/eks/latest/best-practices/cas.html)
- [Azure AKS Performance and Scaling Best Practices - Microsoft](https://learn.microsoft.com/en-us/azure/aks/best-practices-performance-scale)
- [Kubernetes Autoscaling Challenges - ScaleOps](https://scaleops.com/blog/kubernetes-autoscaling/)
- [Lambda Provisioned Concurrency - Lumigo](https://lumigo.io/blog/provisioned-concurrency-the-end-of-cold-starts/)
- [Lambda Provisioned Concurrency - Pulumi](https://www.pulumi.com/blog/aws-lambda-provisioned-concurrency-no-cold-starts/)
- [AWS EC2 Auto Scaling Warm Pool Mixed Instances 2025](https://aws.amazon.com/about-aws/whats-new/2025/11/ec2-auto-scaling-warm-pool-mixed-instances-policies/)
