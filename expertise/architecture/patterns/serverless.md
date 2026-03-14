# Serverless Architecture — Architecture Expertise Module

> Serverless (FaaS) lets you run code without managing servers, with auto-scaling and pay-per-invocation. Not "no servers" — "someone else's servers, billed by execution." Excellent for event-driven, variable-load workloads; wrong for latency-sensitive or long-running processes.

> **Category:** Pattern
> **Complexity:** Moderate
> **Applies when:** Event-driven workloads, variable/spiky traffic, background processing, APIs with unpredictable load

---

## What This Is (and What It Isn't)

Serverless computing is an execution model where the cloud provider dynamically manages the allocation and provisioning of servers. Your code runs in **stateless, ephemeral compute containers** that are event-triggered, fully managed, and billed by actual consumption (invocations x duration x memory), not by reserved capacity.

There are two distinct categories within "serverless":

| Category | What it means | Examples |
|---|---|---|
| **FaaS** (Function as a Service) | You deploy individual functions. The platform handles execution, scaling, and teardown. | AWS Lambda, Google Cloud Functions, Azure Functions, Cloudflare Workers |
| **BaaS** (Backend as a Service) | You consume fully managed backend services via APIs — no server code at all. | Firebase, AWS AppSync, Auth0, Supabase, Algolia |

This module focuses primarily on **FaaS**, though BaaS services are often combined with FaaS to form a complete serverless architecture.

### The execution model

A serverless function follows this lifecycle on every invocation:

```
Request arrives
    |
    v
[Cold start?] --yes--> Provision container --> Download code --> Initialize runtime --> Run INIT code
    |                                                                                       |
    no                                                                                      |
    |                                                                                       v
    +---> [Warm container exists] --> Run handler code --> Return response --> Container idles
                                                                                    |
                                                                          (idle timeout: ~5-15 min)
                                                                                    |
                                                                                    v
                                                                            Container destroyed
```

Key properties of a serverless function:

- **Stateless.** No local state survives between invocations. Any state must be stored externally (DynamoDB, S3, Redis).
- **Ephemeral.** Containers are created and destroyed by the platform. You cannot SSH in, you cannot assume persistence.
- **Time-limited.** AWS Lambda: 15 minutes max. Google Cloud Functions: 9 minutes (1st gen) / 60 minutes (2nd gen). Azure Functions: 10 minutes default, 60 minutes on Premium plan.
- **Memory-bounded.** Lambda: 128 MB to 10,240 MB. CPU scales proportionally with memory (no independent CPU control).
- **Concurrency-managed.** The platform decides how many instances run. Default account-level concurrency: 1,000 on Lambda (soft limit, raisable to tens of thousands).

### What it is not

- **"No servers."** There are absolutely servers. You just do not manage them. AWS runs your code on EC2 instances inside Firecracker microVMs. You pay for someone else to handle provisioning, patching, scaling, and fault tolerance.
- **"Always cheaper."** For steady, high-throughput workloads, serverless is often **more expensive** than containers or VMs. Pay-per-invocation adds up when you have 100+ requests per second around the clock.
- **"Simpler."** The function code is simpler. The surrounding architecture — triggers, permissions, event schemas, DLQs, retries, observability — is more complex than a traditional deployment. Local development and debugging are significantly harder.
- **"The future of all computing."** Serverless is excellent for a specific class of workloads. It is the wrong tool for long-running processes, latency-critical hot paths, stateful workloads, and GPU-intensive computation.

---

## When to Use It

### Event-driven processing

Serverless is the natural fit when work arrives as discrete events: an image uploaded to S3, a message published to a queue, a row inserted into a database, a webhook received from a third-party service. The function wakes up, processes the event, and goes back to sleep. You pay nothing when no events arrive.

**Real example — iRobot:** iRobot uses AWS Lambda for its smart home platform. Every Roomba robot sends telemetry data via AWS IoT Core. Lambda functions process real-time data streams from Kinesis, run cleaning-schedule logic, and push firmware updates. The fleet scales from thousands to millions of active robots without capacity planning.

### Scheduled jobs and background tasks

Cron-style workloads — nightly report generation, hourly data syncs, periodic cleanup — are ideal. A CloudWatch Events rule triggers a Lambda at 2 AM, it runs for 3 minutes, and you pay for 3 minutes. Compared to a 24/7 EC2 instance running a cron daemon, the savings are dramatic.

### Spiky and unpredictable traffic

If your traffic pattern has a 10x or greater ratio between peak and baseline, serverless auto-scaling eliminates the need to over-provision for peaks or under-provision during troughs.

**Real example — Coca-Cola:** Coca-Cola migrated its vending machine payment processing to AWS Lambda and API Gateway. Each payment request triggers a Lambda function. Traffic is inherently spiky — lunchtime rushes, event venues, seasonal patterns. The migration saved **65% in infrastructure costs** because they stopped paying for idle capacity during off-peak hours.

### Low-traffic APIs and MVPs

An API that receives 10,000 requests per day costs virtually nothing on Lambda (often within the free tier). For startups validating product-market fit, serverless eliminates the fixed cost of keeping a server running 24/7 while you have 12 users.

### Data transformation pipelines

ETL jobs that transform data between systems — CSV upload to S3 triggers parsing, validation, enrichment, and loading into a data warehouse — map naturally to function chains. Each step is an independent function triggered by the completion of the previous step.

**Real example — Financial Times:** The Financial Times uses serverless for content processing pipelines. Article ingestion, image resizing, metadata enrichment, and search indexing all run as Lambda functions triggered by content events. The editorial system handles unpredictable publishing patterns (breaking news spikes) without manual scaling.

### Glue code and integrations

Connecting SaaS products, translating between APIs, handling webhooks — small, infrequent tasks that do not justify a dedicated service. A Lambda function that receives a Stripe webhook, formats a Slack notification, and updates a database row is the canonical example.

**Real example — Airbnb:** Airbnb uses AWS Lambda and CloudWatch to automate security audits, system monitoring, and log processing. Lambda functions analyze logs and send alerts when unusual activity is detected, reducing manual monitoring efforts by 60%.

---

## When NOT to Use It

This section is equally important. Serverless zealotry has caused real damage in production systems.

### Latency-sensitive hot paths (cold starts are real)

Cold starts add **200ms to 1+ seconds** of latency on the first invocation after a period of inactivity. The severity depends on runtime and configuration:

| Runtime | Typical cold start (no VPC) | With VPC | With SnapStart |
|---|---|---|---|
| Python | 150–300 ms | 300–500 ms | N/A (not yet) |
| Node.js | 150–300 ms | 300–500 ms | N/A |
| Go | 50–100 ms | 200–400 ms | N/A |
| Java | 800 ms–3 s | 2–6 s | 200–400 ms |
| .NET | 400–800 ms | 1–3 s | 200–400 ms |

If your SLA requires p99 latency under 100ms — a trading system, a real-time bidding platform, a game server — serverless cannot deliver this without provisioned concurrency, which eliminates the cost advantage.

**Critical 2025 change:** As of August 2025, AWS bills for the Lambda INIT phase (the cold start initialization). Cold starts are now a cost factor in addition to a performance factor. For Java functions without SnapStart, this can increase Lambda spend by 10-50%.

### Long-running processes (the 15-minute wall)

AWS Lambda hard-caps execution at 15 minutes. If your workload involves video transcoding, ML model training, large data migrations, or any task that runs for hours, Lambda is architecturally incompatible. You can break work into 15-minute chunks, but the orchestration complexity often exceeds the benefit.

### High-frequency steady traffic (containers are cheaper)

When average CPU utilization stays above ~20% continuously, containers on ECS/Fargate or Kubernetes become more cost-effective. An API consistently handling 100 requests per second around the clock is cheaper on a $50/month container than on Lambda at ~$260 million invocations/month.

**The cost crossover:** Industry benchmarks consistently show that above approximately 10 million requests per day with steady load, containerized deployment costs less than Lambda. Below 1 million requests per day with variable load, Lambda costs less. The 1-10M range depends on traffic pattern.

### When you need full runtime control

Serverless functions run in a constrained environment. You cannot:

- Install system-level packages (beyond what Lambda layers provide)
- Control the underlying OS or kernel parameters
- Run multiple processes or background threads reliably
- Use the local filesystem for anything beyond `/tmp` (512 MB default, 10 GB max)
- Open listening sockets (you cannot run a WebSocket server in Lambda)

### Vendor lock-in is a real constraint

A Lambda function that uses API Gateway triggers, DynamoDB streams, SQS dead-letter queues, and Step Functions orchestration is deeply coupled to AWS. Migrating to Google Cloud or Azure requires rewriting not just the functions, but the entire event-driven architecture around them. The Serverless Framework and SST abstract some of this, but the abstraction is leaky.

### Local development is painful

There is no local equivalent of "run the server and hit it with curl." LocalStack simulates AWS services but has gaps and behavioral differences. SAM Local provides Lambda emulation but cannot replicate event source mappings, IAM permissions, or VPC networking. The feedback loop for serverless development is slower than `docker-compose up`.

### The Prime Video case study: when serverless is the wrong tool

In 2023, Amazon Prime Video published a widely discussed case study. Their video quality inspection service — which analyzed every stream for visual defects — was built on AWS Step Functions and Lambda. **The architecture hit a hard scaling limit at 5% of expected load.** The problems:

1. **Step Functions state transitions were too frequent.** Every video frame analysis required a state transition, and Step Functions charges per state transition ($0.025 per 1,000). At millions of frames per day, this became prohibitively expensive.
2. **Lambda-to-S3 calls were chatty.** Intermediate results were stored in and read from S3 between function invocations, creating massive I/O overhead.
3. **Orchestration overhead exceeded computation.** More time and money was spent coordinating functions than doing actual video analysis.

The team moved to a monolithic application on Amazon ECS. **Infrastructure cost dropped by 90%.** Scaling capabilities increased.

**The lesson is not "serverless is bad."** The lesson is that serverless was the wrong architecture for a high-frequency, tightly coupled data pipeline that processes every frame of every video stream. The team used serverless for rapid prototyping (which was correct), then failed to recognize when the workload outgrew the model.

---

## How It Works

### Function lifecycle in detail

**1. Cold start (INIT phase):**

When no warm container is available, the platform must:

1. **Provision a Firecracker microVM** (AWS) or V8 isolate (Cloudflare Workers)
2. **Download the deployment package** from S3 (or use a cached copy)
3. **Initialize the runtime** (start the Node.js/Python/Java process)
4. **Execute initialization code** — everything outside the handler function (imports, database connections, SDK client creation)

Best practice: move expensive initialization (database connections, SDK clients, configuration loading) **outside** the handler. This code runs once per container lifecycle, not once per invocation.

```python
# GOOD: Connection created once per container (during INIT)
import boto3
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('users')

def handler(event, context):
    # This runs on every invocation, but `table` is already warm
    return table.get_item(Key={'id': event['user_id']})
```

```python
# BAD: Connection created on every invocation
def handler(event, context):
    import boto3  # Re-imported every time
    dynamodb = boto3.resource('dynamodb')  # New client every time
    table = dynamodb.Table('users')  # New table reference every time
    return table.get_item(Key={'id': event['user_id']})
```

**2. Invocation (INVOKE phase):**

The handler function receives the event payload and a context object. It executes, returns a response, and the container enters an idle state. The container remains warm for approximately 5-15 minutes (AWS does not document the exact timeout and it varies).

**3. Shutdown:**

After the idle timeout, the platform destroys the container. Any state in memory, any files in `/tmp`, any open connections — gone.

### Cold start mitigation strategies

| Strategy | How it works | Cost impact | Effectiveness |
|---|---|---|---|
| **Provisioned concurrency** | Pre-warms N containers permanently | $15-30/month per 512MB instance | Eliminates cold starts entirely |
| **SnapStart** (Java, Python, .NET) | Snapshots the initialized state, restores from snapshot | Minimal (storage cost) | Reduces cold starts by ~90% |
| **Smaller packages** | Fewer dependencies = faster download + init | None | Moderate improvement |
| **Arm64 (Graviton)** | ARM-based instances start faster and cost 20% less | 20% savings | Measurable improvement |
| **Keep-warm pings** | CloudWatch rule invokes function every 5 min | Minimal invocation cost | Works for single-concurrency only |
| **Language choice** | Go/Rust: ~50ms cold start. Java: ~2s without SnapStart | None | Significant for cold-start-sensitive paths |

### Invocation types

Lambda supports three invocation models, and choosing the wrong one causes subtle bugs:

| Type | Behavior | Retry on failure | Use case |
|---|---|---|---|
| **Synchronous** | Caller waits for response | No automatic retry (caller must retry) | API Gateway, SDK `invoke()` |
| **Asynchronous** | Caller gets 202 immediately, Lambda retries | 2 automatic retries with backoff | S3 events, SNS, CloudWatch Events |
| **Event source mapping** | Lambda polls a stream/queue | Retries until record expires or succeeds | SQS, Kinesis, DynamoDB Streams |

### Concurrency model

Each concurrent invocation runs in its own container. If 100 requests arrive simultaneously, Lambda spins up 100 containers (subject to concurrency limits).

- **Account-level default:** 1,000 concurrent executions (soft limit)
- **Burst concurrency:** 500-3,000 immediate, then 500 additional per minute (varies by region)
- **Reserved concurrency:** Guarantees capacity for a specific function but limits its maximum
- **Provisioned concurrency:** Pre-warms containers for instant start

**The concurrency trap:** If your function calls a database with a 100-connection pool, and Lambda scales to 500 concurrent instances, you have 500 functions each trying to open a database connection against a pool of 100. The database falls over. Solution: use RDS Proxy or connection pooling middleware.

### Error handling and Dead Letter Queues (DLQ)

For asynchronous invocations, Lambda retries failed executions twice. After all retries are exhausted, the event is sent to a configured DLQ (an SQS queue or SNS topic). Without a DLQ, **failed events are silently dropped.**

```yaml
# serverless.yml - always configure a DLQ
functions:
  processOrder:
    handler: orders.handler
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
    deadLetterQueue:
      targetArn: !GetAtt OrderDLQ.Arn
```

Lambda Destinations (introduced 2019) provide a more flexible alternative to DLQs, allowing you to route both successful and failed invocations to different targets (SQS, SNS, Lambda, EventBridge).

### Layers

Lambda Layers allow you to package shared libraries, custom runtimes, or common dependencies separately from your function code. A layer is a ZIP archive that gets extracted into `/opt` in the execution environment.

- Maximum 5 layers per function
- Total unzipped size (function + all layers): 250 MB
- Layers are versioned and immutable

Use layers for: shared utility code across functions, large dependencies (numpy, pandas), custom runtimes.

---

## Trade-Offs Matrix

| Dimension | Serverless (FaaS) | Containers (ECS/K8s) | Notes |
|---|---|---|---|
| **Scaling** | Automatic, per-request, near-instant | Manual/auto-scaling, pod-level, slower | Serverless scales to zero; containers have minimum replica count |
| **Cold start latency** | 50ms–3s depending on runtime | None (containers are always running) | Critical for user-facing APIs with strict SLAs |
| **Cost at low traffic** | Near-zero (pay only for invocations) | Fixed cost (minimum container always running) | Serverless wins dramatically below ~1M req/day |
| **Cost at high traffic** | Expensive (per-invocation adds up) | Cheaper (amortized over sustained load) | Containers win above ~10M req/day steady load |
| **Operational overhead** | Near-zero (no patching, no capacity planning) | Significant (cluster management, upgrades, monitoring) | Serverless trades control for convenience |
| **Execution time limit** | 15 min (Lambda), varies by platform | Unlimited | Hard blocker for long-running processes |
| **Local development** | Difficult (emulators are incomplete) | Excellent (docker-compose) | Biggest developer experience gap |
| **Vendor lock-in** | High (event sources, IAM, triggers are platform-specific) | Low-moderate (OCI containers are portable) | Serverless lock-in is in the glue, not the function code |
| **Observability** | Harder (distributed traces across functions) | Easier (centralized logging, APM agents) | Serverless requires specialized tooling (X-Ray, Datadog) |
| **Stateful workloads** | Not supported (external state only) | Supported (persistent volumes, local state) | Serverless is fundamentally stateless |
| **Language flexibility** | Limited to supported runtimes (or custom runtimes) | Any language, any version, any system dependency | Custom runtimes add complexity on Lambda |
| **Security patching** | Managed by provider (for supported runtimes) | Your responsibility (base images, OS, dependencies) | Serverless reduces security surface area |

---

## Evolution Path

The most successful serverless architectures follow a deliberate evolution, not a big-bang adoption.

### Phase 1: Start serverless for event-driven and glue

Begin with workloads that are naturally event-driven: webhook handlers, file processing, scheduled tasks, notification dispatching. These have variable load, short execution times, and no latency requirements. The cost advantage is clear and the operational simplicity is real.

```
[S3 Upload] --> [Lambda: resize image] --> [S3: store thumbnail]
[Stripe Webhook] --> [Lambda: update DB + notify Slack]
[CloudWatch Cron] --> [Lambda: generate daily report] --> [SES: email report]
```

### Phase 2: Expand to APIs with caveats

Build API endpoints on Lambda + API Gateway for low-to-moderate traffic APIs. Accept the cold start tradeoff for non-latency-critical endpoints. Use provisioned concurrency for critical paths.

```
[API Gateway] --> [Lambda: /api/users] --> [DynamoDB]
[API Gateway] --> [Lambda: /api/orders] --> [RDS via RDS Proxy]
```

### Phase 3: Identify hot paths and migrate selectively

Monitor invocation frequency, duration, and cost. When a function consistently runs at high concurrency with steady traffic, it is a candidate for migration to a container. This is not a failure — it is the architecture maturing.

**Indicators a function should become a container:**

- Invocation count > 10 million/day with steady (not spiky) load
- p99 latency consistently violated by cold starts
- Execution duration regularly approaches the 15-minute limit
- Function requires persistent connections (WebSockets, gRPC streams)
- Cost exceeds what an equivalent Fargate task would cost

### Phase 4: Hybrid architecture (the pragmatic end state)

Most mature serverless architectures are actually hybrid:

```
                    +------------------+
                    |   API Gateway    |
                    +------------------+
                      /        |        \
                     /         |         \
            +--------+  +--------+  +----------+
            | Lambda |  | Lambda |  | Fargate  |
            | (auth) |  | (CRUD) |  | (search) |
            +--------+  +--------+  +----------+
                 |           |            |
            +--------+  +--------+  +----------+
            | Cognito|  |DynamoDB|  |OpenSearch|
            +--------+  +--------+  +----------+

    [S3 events] --> [Lambda: process files]
    [SQS queue] --> [Lambda: async tasks]
    [EventBridge] --> [Lambda: scheduled jobs]
    [ALB] --> [Fargate: long-running API, WebSockets]
```

The auth and CRUD endpoints stay on Lambda (variable traffic, short execution). The search endpoint moves to Fargate (requires persistent OpenSearch connections, consistent load). Background processing stays on Lambda (event-driven, naturally bursty).

---

## Failure Modes

### 1. Cold start cascades in function chains

A single user request might trigger 3-5 different Lambda functions in sequence (API Gateway -> Auth function -> Business logic function -> Notification function). If each has a 1% chance of a cold start, the probability that *something* in the chain is slow is approximately 5%. At scale, this means a persistent tail of slow requests that is extremely difficult to debug.

**The cascade effect:** When Function A cold-starts, it takes 2 seconds instead of 50ms. Function B's invocation is delayed. If Function B also cold-starts (because the delayed traffic pattern disrupts the warm pool), the total request time balloons to 4+ seconds. Users see intermittent, unpredictable slowness.

**Mitigation:** Minimize function chain depth. Use asynchronous invocation where possible so cold starts do not compound on the user-facing request path. Use provisioned concurrency on the entry-point function.

### 2. Timeout cliff at 15 minutes

Functions do not gracefully degrade as they approach the timeout — they are **hard-killed**. Any work in progress is lost. Any database transaction in flight is left uncommitted (or worse, partially committed if your code is not idempotent).

**The insidious version:** A function normally runs in 2 minutes. A downstream API (database, third-party service) becomes slow. The function now takes 16 minutes. It is killed. The retry runs. The downstream is still slow. It is killed again. The event goes to the DLQ. Meanwhile, the database has two partially-committed transactions.

**Mitigation:** Design functions to be idempotent. Use idempotency keys for database writes. Set function timeouts well below 15 minutes (e.g., 5 minutes) so you fail fast and retry rather than hanging for 15 minutes and losing work.

### 3. Concurrency limits causing throttling

Account-level concurrency defaults to 1,000. A traffic spike that requires 1,500 concurrent executions will cause 500 invocations to be throttled (429 errors for sync, retries for async). If multiple functions share the account, a runaway function can consume all concurrency and starve other functions.

**Real scenario:** A marketing team launches a campaign. Traffic to the public API spikes to 2,000 concurrent requests. The API functions consume all 1,000 concurrent executions. The payment processing function (also in this account) is throttled. Customers cannot complete purchases during the campaign.

**Mitigation:** Use reserved concurrency to guarantee capacity for critical functions. Request limit increases proactively. Separate production workloads into different AWS accounts.

### 4. Cost explosion from recursive loops

This is the serverless equivalent of a fork bomb. A Lambda function writes to an S3 bucket. An S3 event notification triggers the same Lambda function. The function writes to S3 again. Each invocation spawns another invocation. The function scales to thousands of concurrent instances in seconds.

**Real-world damage:** Engineers have reported waking up to $50,000 bills from overnight recursive loops. The scaling is so fast that budget alerts (which run on hourly or daily cadence) do not fire until the damage is done. You can go to bed with a $5 monthly bill and wake up with a $50,000 bill.

**AWS protection (since 2023):** Recursive Loop Detection automatically stops recursive invocations between Lambda, SQS, and SNS after approximately 16 loops. However, this only covers specific service combinations — custom recursive patterns are not detected.

**Mitigation:**
- Never write to the same S3 bucket/prefix that triggers the function
- Use a separate output bucket for processed results
- Set concurrency limits on functions to cap runaway scaling
- Configure CloudWatch billing alarms with low thresholds
- Add a recursion counter in the event payload and bail out after N iterations

### 5. Downstream service overwhelm

Lambda scales to hundreds or thousands of instances instantly. Your downstream database, third-party API, or legacy service does not. A traffic spike causes Lambda to scale to 500 instances, each opening a database connection. Your RDS instance has a 100-connection limit. The database rejects connections. All 500 Lambda invocations fail. They retry. The database is now under even more load.

**Mitigation:** Use RDS Proxy for database connections. Use SQS as a buffer between Lambda and rate-limited downstream services. Set reserved concurrency on functions to match downstream capacity.

### 6. Observability blind spots

In a monolith, a request flows through a single process — you can attach a debugger, read sequential logs, and trace the execution path. In serverless, a request touches API Gateway, Lambda (possibly multiple functions), DynamoDB, SQS, another Lambda, and SNS. Each component has its own logs in its own CloudWatch log group. Correlating a single request across all these services requires distributed tracing (X-Ray, Datadog) and disciplined correlation ID propagation.

**The debugging tax:** Engineers report spending 2-3x more time debugging serverless applications compared to equivalent container-based applications, primarily due to log fragmentation and the inability to reproduce issues locally.

---

## Technology Landscape

### Major platforms

| Platform | Provider | Runtime model | Cold start | Max duration | Key strength |
|---|---|---|---|---|---|
| **AWS Lambda** | AWS | Firecracker microVM | 50ms–3s | 15 min | Deepest ecosystem integration (200+ event sources) |
| **Google Cloud Functions** | GCP | gVisor container | 100ms–1s | 9 min (1st gen), 60 min (2nd gen) | Tight integration with Firebase, BigQuery |
| **Azure Functions** | Microsoft | Container-based | 100ms–2s | 5-10 min (Consumption), 60 min (Premium) | Best for .NET workloads, hybrid with Azure Arc |
| **Cloudflare Workers** | Cloudflare | V8 isolates | <5ms | 30s (free), 15 min (paid) | Zero cold starts, 300+ edge locations, 441% faster than Lambda at p95 |
| **Vercel Functions** | Vercel | AWS Lambda (underneath) | Similar to Lambda | 10s (Hobby), 5 min (Pro) | Best DX for Next.js/React, Fluid compute model |
| **Deno Deploy** | Deno | V8 isolates | <5ms | 50ms wall (free), unlimited (paid) | TypeScript-native, edge-first |

### Edge compute: the cold-start killer

Cloudflare Workers and similar edge platforms (Deno Deploy, Vercel Edge Functions, Fastly Compute) use **V8 isolates** instead of containers. A V8 isolate starts in under 5 milliseconds with a tenth of the memory overhead of a full Node.js process. At the 95th percentile, Workers is **441% faster** than Lambda and **192% faster** than Lambda@Edge.

The tradeoff: edge runtimes are constrained. Workers support JavaScript/TypeScript/Wasm only, have 128 MB memory (not configurable), and cannot access VPC resources or most AWS services natively.

**The winning architecture in 2025** uses both: edge functions for routing, authentication, personalization, and caching; traditional serverless (Lambda) for heavy computation and deep cloud integrations.

### Frameworks and tooling

| Tool | Purpose | Status (2025-2026) |
|---|---|---|
| **SST (Serverless Stack)** | TypeScript-first IaC framework built on AWS CDK. Live Lambda Dev for local debugging. | Active but development slowing. v3 stable, maintenance mode. Excellent DX, uncertain long-term investment. |
| **Serverless Framework** | The original serverless deployment tool. YAML-based, multi-cloud. | Mature, widely adopted. v4 introduced a dashboard with paid tier, causing community friction. |
| **AWS SAM** | AWS-native serverless framework. CloudFormation-based. | Enterprise-grade, deep AWS alignment. Less ergonomic than SST. |
| **AWS CDK** | General-purpose IaC in TypeScript/Python/Java. Not serverless-specific. | Most flexible, steepest learning curve. Foundation for SST. |
| **Terraform** | Cloud-agnostic IaC. HashiCorp. | Multi-cloud support, large ecosystem. More verbose for serverless than SAM/SST. |
| **LocalStack** | Local AWS service emulation for development and testing. | Covers 80+ AWS services. Gaps remain in behavioral fidelity. Pro tier for advanced features. |
| **Architect (arc.codes)** | Lightweight serverless framework. Convention-over-configuration. | Smaller community, clean design. Good for simple projects. |

### Observability stack

Serverless observability requires specialized tooling because traditional APM agents cannot run inside Lambda (no persistent process to attach to).

- **AWS X-Ray:** Native distributed tracing. Free tier generous. Integration with Lambda is automatic but shallow.
- **Datadog Serverless:** Cold start tracing, enhanced metrics, function-level cost attribution. Industry leader for serverless observability.
- **Lumigo:** Purpose-built for serverless. Auto-traces without code changes. Visualizes function chains.
- **Powertools for AWS Lambda:** Open-source library (Python, TypeScript, Java, .NET) providing structured logging, tracing, metrics, and idempotency utilities. Should be the first dependency in every Lambda function.

---

## Decision Tree

Use this decision tree to determine whether serverless is appropriate for your workload:

```
START: What is the workload pattern?
|
+-- Event-driven (file uploads, webhooks, queue messages)?
|   |
|   +-- Execution time < 15 minutes?
|   |   |
|   |   +-- YES --> Serverless is the natural fit.
|   |   +-- NO  --> Use containers (ECS/Fargate) or batch (AWS Batch).
|   |
|   +-- Traffic is purely event-driven, no steady baseline?
|       +-- YES --> Serverless. Scale-to-zero saves significant cost.
|       +-- NO  --> Consider hybrid (containers for baseline, Lambda for spikes).
|
+-- API / Request-Response?
|   |
|   +-- Traffic ratio: peak / baseline > 10x?
|   |   |
|   |   +-- YES --> Serverless. Auto-scaling handles spikes without over-provisioning.
|   |   +-- NO  --> Traffic is steady. Evaluate cost.
|   |
|   +-- Steady traffic > 10M requests/day?
|   |   |
|   |   +-- YES --> Cost-compare Lambda vs. Fargate. Containers likely cheaper.
|   |   +-- NO  --> Serverless is cost-effective.
|   |
|   +-- Latency requirement: p99 < 100ms?
|   |   |
|   |   +-- YES + JVM runtime --> Containers (cold starts are 1-3s in Java).
|   |   +-- YES + lightweight runtime --> Serverless with provisioned concurrency.
|   |   +-- NO  --> Serverless is fine.
|   |
|   +-- Requires WebSockets or persistent connections?
|       +-- YES --> Containers. Lambda cannot maintain persistent connections.
|       +-- NO  --> Serverless is fine.
|
+-- Background processing / Batch?
|   |
|   +-- Single task duration < 15 minutes?
|   |   +-- YES --> Serverless (Lambda).
|   |   +-- NO  --> AWS Batch, ECS tasks, or Step Functions with Lambda chunking.
|   |
|   +-- Needs GPU?
|       +-- YES --> Not serverless. Use EC2 GPU instances or SageMaker.
|       +-- NO  --> Lambda if within time/memory limits.
|
+-- Scheduled / Cron jobs?
    |
    +-- Execution time < 15 minutes?
        +-- YES --> Serverless (EventBridge + Lambda). Near-zero cost.
        +-- NO  --> ECS Scheduled Tasks or AWS Batch.
```

**Quick heuristics:**

- Spiky traffic (>10x peak/base ratio) --> serverless
- Steady traffic (>10M req/day) --> cost-compare, likely containers
- Latency-critical (<100ms p99) + JVM --> containers
- Event-driven + short-lived --> serverless, always
- Long-running (>15 min) --> containers, always
- GPU required --> not serverless

---

## Implementation Sketch

### Basic Lambda function with API Gateway (Python)

```python
# handler.py
import json
import os
import boto3
from datetime import datetime

# INIT phase: runs once per container lifecycle
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def create_user(event, context):
    """POST /users - Create a new user."""
    try:
        body = json.loads(event['body'])

        # Idempotency: use client-provided ID to prevent duplicates
        user_id = body.get('id') or context.aws_request_id

        item = {
            'id': user_id,
            'email': body['email'],
            'name': body['name'],
            'created_at': datetime.utcnow().isoformat(),
        }

        table.put_item(
            Item=item,
            ConditionExpression='attribute_not_exists(id)',  # Prevent overwrite
        )

        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(item),
        }

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return {
            'statusCode': 409,
            'body': json.dumps({'error': 'User already exists'}),
        }
    except KeyError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Missing required field: {e}'}),
        }
    except Exception as e:
        # Log the full error for debugging, return generic message to client
        print(f'Error creating user: {e}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
        }
```

### S3 event trigger (image processing)

```python
# image_processor.py
import boto3
from PIL import Image
import io
import os

s3 = boto3.client('s3')
OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']  # Different bucket to prevent recursive loops

def handler(event, context):
    """Triggered by S3 PutObject on input bucket. Resizes image, writes to output bucket."""
    for record in event['Records']:
        source_bucket = record['s3']['bucket']['name']
        source_key = record['s3']['object']['key']

        # Guard: skip if not an image
        if not source_key.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            print(f'Skipping non-image file: {source_key}')
            continue

        # Download original
        response = s3.get_object(Bucket=source_bucket, Key=source_key)
        image_data = response['Body'].read()

        # Resize
        image = Image.open(io.BytesIO(image_data))
        image.thumbnail((300, 300))

        # Upload to DIFFERENT bucket (critical: prevents recursive trigger)
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)

        output_key = f'thumbnails/{source_key}'
        s3.put_object(
            Bucket=OUTPUT_BUCKET,  # NOT source_bucket
            Key=output_key,
            Body=buffer,
            ContentType='image/jpeg',
        )

        print(f'Processed {source_key} -> {output_key}')
```

### Infrastructure as Code (serverless.yml)

```yaml
service: user-api

frameworkVersion: '3'

provider:
  name: aws
  runtime: python3.12
  architecture: arm64          # Graviton: 20% cheaper, faster cold starts
  memorySize: 256
  timeout: 10                  # Fail fast, not at 15 minutes
  environment:
    TABLE_NAME: !Ref UsersTable
    OUTPUT_BUCKET: !Ref ThumbnailBucket
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:PutItem
            - dynamodb:GetItem
            - dynamodb:Query
          Resource: !GetAtt UsersTable.Arn
        - Effect: Allow
          Action:
            - s3:GetObject
          Resource: arn:aws:s3:::${self:service}-uploads-${sls:stage}/*
        - Effect: Allow
          Action:
            - s3:PutObject
          Resource: arn:aws:s3:::${self:service}-thumbnails-${sls:stage}/*

functions:
  createUser:
    handler: handler.create_user
    events:
      - httpApi:
          path: /users
          method: post
    # Reserved concurrency prevents this function from consuming all account capacity
    reservedConcurrency: 100

  processImage:
    handler: image_processor.handler
    memorySize: 1024            # Image processing needs more memory/CPU
    timeout: 60
    events:
      - s3:
          bucket: ${self:service}-uploads-${sls:stage}
          event: s3:ObjectCreated:*
    # DLQ for failed image processing
    destinations:
      onFailure:
        type: sqs
        arn: !GetAtt ImageProcessingDLQ.Arn
    reservedConcurrency: 50     # Limit to prevent overwhelming downstream services

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-users-${sls:stage}
        BillingMode: PAY_PER_REQUEST  # Serverless DynamoDB: scales with traffic
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH

    ThumbnailBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:service}-thumbnails-${sls:stage}

    ImageProcessingDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-image-dlq-${sls:stage}
        MessageRetentionPeriod: 1209600  # 14 days
```

### SST v3 equivalent (TypeScript)

```typescript
// sst.config.ts
export default $config({
  app(input) {
    return {
      name: 'user-api',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
    };
  },
  async run() {
    // DynamoDB table
    const table = new sst.aws.Dynamo('UsersTable', {
      fields: { id: 'string' },
      primaryIndex: { hashKey: 'id' },
    });

    // S3 buckets
    const uploadBucket = new sst.aws.Bucket('Uploads');
    const thumbnailBucket = new sst.aws.Bucket('Thumbnails');

    // API
    const api = new sst.aws.ApiGatewayV2('Api');
    api.route('POST /users', {
      handler: 'src/handler.createUser',
      link: [table],
      memory: '256 MB',
      timeout: '10 seconds',
    });

    // S3 event processor
    uploadBucket.subscribe('src/image-processor.handler', {
      link: [thumbnailBucket],
      memory: '1024 MB',
      timeout: '60 seconds',
    });

    return { api: api.url };
  },
});
```

---

## Cross-References

- **[Microservices](../microservices.md)** — Serverless functions are often deployed as part of a microservices architecture. Each function can be a micro-microservice. The operational tradeoffs (distributed tracing, service discovery, failure isolation) apply equally.
- **[Stateless Design](../../design/stateless-design.md)** — Serverless functions are stateless by definition. Understanding stateless design principles is prerequisite to building effective serverless architectures.
- **[Twelve-Factor App](../../design/twelve-factor-app.md)** — Serverless naturally enforces several twelve-factor principles: config via environment variables, stateless processes, disposability, and log streams. Understanding where serverless diverges (port binding, concurrency model) prevents architectural mistakes.
- **[Horizontal vs. Vertical Scaling](../horizontal-vs-vertical.md)** — Serverless is the extreme form of horizontal scaling: every invocation is an independent instance. Understanding horizontal scaling tradeoffs (state management, data partitioning) is essential.
- **[Event-Driven Architecture](../event-driven.md)** — Serverless is most powerful when combined with event-driven patterns. Events trigger functions; functions emit events. Understanding event schemas, eventual consistency, and event sourcing patterns unlocks the full potential of serverless.
- **[Modular Monolith](./modular-monolith.md)** — The counterpoint. When serverless complexity exceeds its benefits, consolidation into a modular monolith (as Prime Video demonstrated) can reduce cost by 90% and simplify operations.

---

## Sources

- [Serverless Architecture in 2025 — Devsu](https://devsu.com/blog/serverless-architecture-in-2025-is-it-time-to-go-completely-serverless)
- [Case Studies: Leading Companies with Serverless — StackFiltered](https://www.stackfiltered.com/blog/case_studies_how_leading_companies_succeed_with_serverless_architectures)
- [AWS Lambda Cold Start Optimization in 2025 — Zircon.tech](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/)
- [AWS Lambda Cold Starts: When They Matter and What They Cost — EdgeDelta](https://edgedelta.com/company/knowledge-center/aws-lambda-cold-start-cost)
- [Serverless vs Containers: 2025 Guide to Real-World Economics](https://www.ai-infra-link.com/serverless-vs-containers-a-2025-guide-to-real-world-economics/)
- [Serverless vs Containers Cost Comparison — Binadox](https://www.binadox.com/blog/serverless-vs-containers-which-is-more-cost%E2%80%91effective-in-the-cloud/)
- [Amazon Prime Video 90% Cost Reduction — DEV Community](https://dev.to/indika_wimalasuriya/amazon-prime-videos-90-cost-reduction-throuh-moving-to-monolithic-k4a)
- [6 Lessons from Prime Video Serverless vs Monolith — Network World](https://www.networkworld.com/article/972298/6-lessons-from-the-amazon-prime-video-serverless-vs-monolith-flap.html)
- [Recursive AWS Lambda Horror Stories — Vantage](https://www.vantage.sh/blog/aws-lambda-avoid-infinite-loops)
- [AWS Lambda Recursive Loop Detection — AWS Docs](https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html)
- [Cloudflare Workers vs AWS Lambda — 5ly](https://5ly.co/blog/aws-lambda-vs-cloudflare-workers/)
- [AWS Lambda vs Cloudflare Workers 2025 — Probir Sarkar](https://blog.probirsarkar.com/aws-lambda-vs-cloudflare-workers-2025-cold-start-pricing-and-performance-comparison-f932f945cf6a)
- [SST Alternatives in 2026 — Northflank](https://northflank.com/blog/sst-alternatives-serverless-stack)
- [Serverless Computing in 2025: Trends, Use Cases, Challenges — Synoverge](https://www.synoverge.com/blog/serverless-computing-trends-use-cases-challenges/)
- [Pitfalls of Scaling on Serverless Platforms — Google Cloud Community](https://medium.com/google-cloud/the-pitfalls-of-scaling-on-serverless-platforms-482ad69d7c37)
- [AWS Case Studies: Optimizing Enterprise Economics with Serverless](https://docs.aws.amazon.com/whitepapers/latest/optimizing-enterprise-economics-with-serverless/case-studies.html)
- [Understanding and Remediating Cold Starts — AWS Compute Blog](https://aws.amazon.com/blogs/compute/understanding-and-remediating-cold-starts-an-aws-lambda-perspective/)
