# Microservices Architecture — Architecture Expertise Module

> Microservices decompose an application into small, independently deployable services each owning its data and business capability. They enable organizational scale and independent deployment at the cost of massive operational complexity. The right choice for a minority of systems — and the most over-applied architectural pattern in the industry.

> **Category:** Pattern
> **Complexity:** Expert
> **Applies when:** Organizations with 5+ independent teams, proven product-market fit, independent deployment needs, and operational maturity for distributed systems

---

## What This Is (and What It Isn't)

A microservices architecture structures an application as a **collection of independently deployable services**, each running in its own process, owning its own data store, and communicating over the network via well-defined APIs. Each service is built, tested, deployed, and scaled independently by a team that owns the full lifecycle of that service.

The pattern originated from two parallel forces in the early 2010s:

- **Amazon's "two-pizza teams" mandate (2002-2006):** Jeff Bezos's directive that every team must be small enough to be fed by two pizzas, and every team must expose its functionality via service interfaces. No direct database access between teams. This was an organizational decision that forced a technical architecture.
- **Netflix's migration (2008-2015):** After a catastrophic three-day database corruption outage in 2008 exposed the fragility of their monolith, Netflix spent seven years migrating to over 700 microservices. They open-sourced much of the tooling (Hystrix, Eureka, Zuul, Ribbon) and became the public face of the pattern.

The critical distinction from adjacent architectures:

| Architecture | Deployment units | Data ownership | Network calls | Operational complexity |
|---|---|---|---|---|
| Monolith | 1 | Shared DB | None | Low |
| Modular monolith | 1 | Per-module schema | None (in-process) | Low-moderate |
| Microservices | Many (1 per service) | Per-service DB | Yes — every call | Very high |
| Distributed monolith | Many | Often shared DB | Yes — every call | Very high, no benefits |

**What microservices are NOT:**

- **Not "small services."** Size is irrelevant. A service should align with a business capability or bounded context, whether that is 200 lines or 20,000 lines. The "micro" in microservices refers to scope of responsibility, not lines of code. Teams that split by size produce anemic services that cannot do anything useful alone.
- **Not a performance optimization.** Microservices add network latency to every inter-service call (0.1ms in-process becomes 5-50ms over the network). They exist for organizational and deployment independence, not for speed. If your goal is performance, a monolith with in-process calls will always be faster for the same workload.
- **Not a default architecture.** The pattern solves specific scaling problems that emerge only at organizational scale. Choosing microservices before you have those problems is premature optimization of your architecture.
- **Not SOA rebranded.** Service-Oriented Architecture (SOA) used shared enterprise service buses, shared schemas (canonical data models), and top-down governance. Microservices deliberately reject all three — each service owns its data, picks its own technology, and communicates via lightweight protocols without a centralized bus.
- **Not the opposite of a monolith.** A well-structured modular monolith and a well-structured microservices system solve many of the same code organization problems. The difference is deployment topology and the operational cost that comes with it.

**Common misconceptions that cause real damage:**

1. "Microservices make the system simpler." They make each individual service simpler while making the system as a whole dramatically more complex. You trade code complexity for operational complexity.
2. "Microservices improve performance." They degrade performance (network latency on every call) while enabling independent scaling — which only matters if different parts of your system have genuinely different load profiles.
3. "We need microservices for CI/CD." A well-structured monolith can deploy dozens of times per day (Shopify deploys 40+ times daily from a monolith). CI/CD is an engineering practice, not an architecture.
4. "Every new project should start with microservices." Martin Fowler's MonolithFirst principle: almost all successful microservices architectures started as monoliths that were decomposed after the domain was well understood.

---

## When to Use It

This pattern is justified only when **multiple specific conditions are true simultaneously**. Having one or two is insufficient.

### 5+ autonomous teams needing independent deployment

When five or more teams work on the same product and are blocked by each other's release cycles, microservices provide genuine organizational relief. Team A can deploy a new recommendation algorithm without waiting for Team B's payment refactor to be tested. This is the primary benefit — organizational, not technical.

**Netflix:** Over 2,000 engineers organized into hundreds of small teams, each owning one or more services. A team can deploy multiple times per day without coordinating with anyone. At this scale, a shared monolith would create crippling deployment contention.

**Amazon:** Thousands of services powering amazon.com, each owned by a "two-pizza team" with full operational responsibility. The organizational model (small, autonomous teams with end-to-end ownership) requires the technical model (independent services).

### Genuinely different scaling requirements

When one part of your system handles 10,000x the load of another, scaling them as a single unit is wasteful. Microservices allow you to run 200 instances of the video encoding service while running 2 instances of the user settings service.

**Netflix:** Video streaming (CDN, encoding, recommendation) operates at a fundamentally different scale than account management or billing. Scaling the entire system to handle streaming load would waste resources on components that handle 1/10,000th of the traffic.

**Uber:** Trip matching and pricing need to handle millions of real-time requests per second. Driver onboarding handles hundreds per day. Independent scaling is a hard requirement.

### Polyglot technology requirements

When different parts of the system genuinely benefit from different technology stacks — ML inference in Python/PyTorch, real-time data processing in Go or Rust, web API in Node.js — microservices allow each team to choose the best tool for their specific problem.

### Proven domain boundaries

The domain must be well understood. Service boundaries that are drawn wrong create distributed monoliths — services that must be deployed together, defeating the entire purpose. Domain-Driven Design bounded contexts are the prerequisite, not the outcome, of microservices adoption.

**Uber's lesson:** With 2,200+ microservices, Uber found that engineers often had to work through 50 services across 12 different teams to investigate a single root cause. They responded by reorganizing 2,200 microservices into 70 domains (DOMA — Domain-Oriented Microservice Architecture), reducing inter-team touchpoints by 25-50%.

### Mature operational infrastructure

Microservices require: container orchestration (Kubernetes), service discovery, distributed tracing, centralized logging, CI/CD per service, API gateway, health checking, circuit breakers, and on-call for each service. If your organization does not already have (or can immediately invest in) this infrastructure, microservices will drown you in operational work.

---

## When NOT to Use It

**This section is deliberately longer than "When to Use It" because the failure mode of unnecessary microservices adoption is far more common and far more damaging than the failure mode of staying on a monolith too long.**

### Team fewer than 10 developers — never

A team of 8 developers does not need independent deployment because they can coordinate directly. They do not need independent scaling because they share a deployment target. They do not have the staffing for per-service CI/CD, per-service on-call, and per-service monitoring.

**Real failure pattern:** A startup of 8 engineers builds 15 microservices. They spend 40% of their engineering time on infrastructure — maintaining CI/CD pipelines, debugging network issues between services, managing Kubernetes clusters, handling distributed tracing. They have 60% of their capacity left for actual product development. A competitor with a monolith ships twice as fast with the same team size.

**The math:** 10 microservices = 10 CI/CD pipelines, 10 deployment configurations, 10 sets of health checks, 10 log aggregation configurations, 10 sets of metrics dashboards. For a team of 8, this means every engineer maintains more than one service's infrastructure alongside their product work.

### Startup without product-market fit — never

Before product-market fit, the product changes constantly. Service boundaries drawn today will be wrong in 3 months because the domain itself is being discovered. Refactoring across service boundaries (changing APIs, migrating data between services, updating contracts) is 10-100x more expensive than refactoring within a monolith.

Martin Fowler's MonolithFirst principle applies with full force: "You shouldn't start a new project with microservices, even if you're sure your application will be big enough to make it worthwhile."

### Network latency kills your use case

An in-process function call takes ~0.1 microseconds. A network call between services in the same datacenter takes 0.5-5 milliseconds — a 5,000x-50,000x increase. If a single user request requires 10 service-to-service calls, you add 5-50ms of pure network overhead.

For latency-sensitive applications (real-time trading, game servers, video processing pipelines), this overhead is unacceptable. Amazon Prime Video discovered this firsthand.

**Amazon Prime Video (2023):** The Video Quality Analysis team had implemented their monitoring pipeline as a distributed microservices architecture using AWS Step Functions and S3 for inter-service data transfer. Each video frame had to be serialized to S3, then deserialized by the next service. The distributed overhead was so severe that the system could not scale to handle even a fraction of their streams.

They re-architected into a single monolithic process, moving all data transfer to in-memory operations. **Result: 90% cost reduction.** The bottleneck was not compute — it was the overhead of distributed communication between services that had no reason to be separated. The services had no independent teams, no independent scaling needs, and no independent deployment requirements. They were separated because "microservices" was the default architectural choice, not because it solved a real problem.

### Distributed transactions become the norm

If your business logic frequently requires atomic operations spanning multiple services (e.g., "debit account AND update inventory AND create order — all or nothing"), microservices force you into distributed transaction patterns (Saga, 2PC) that are orders of magnitude more complex than a database transaction.

A single SQL `BEGIN; ... COMMIT;` across three tables in a monolith becomes a multi-step choreography or orchestration with compensation logic, idempotency requirements, and eventual consistency guarantees. If more than 20% of your operations require cross-service transactions, you have drawn your service boundaries wrong — or microservices are wrong for your domain.

### Operational overhead exceeds organizational benefit

**The operational tax of microservices is real and quantifiable:**

- Infrastructure costs increase 25%+ due to per-service containers, sidecars, load balancers, and orchestration overhead.
- Teams report 30-50% more time spent on deployment automation compared to monolithic deployments.
- Communication overhead increases 3-5x — standups go from 15 minutes to 45 minutes when each service needs representation.
- A 30-person team running microservices pays ~$40K/month vs ~$10K/month for an equivalent modular monolith — $360K annual difference.
- 15+ services require a dedicated platform team just to keep the infrastructure running.

**Gartner research (2024-2025):** 90% of organizations adopting microservices prematurely will fail to realize the expected benefits. The most common reason: adopting the pattern without the organizational maturity to operate it.

### Segment's retreat (2017-2018)

Segment adopted microservices to solve fault isolation — a failure in one integration destination (e.g., Google Analytics connector) would crash the entire monolith. They created one microservice per destination, eventually running 140+ services.

The operational cost exploded. Each service needed its own queue, its own deployment pipeline, its own monitoring. The small team was drowning in infrastructure management. In the words of Segment engineer Alexandra Noonan: "If microservices are implemented incorrectly or used as a band-aid without addressing some of the root flaws in your system, you'll be unable to do new product development because you're drowning in the complexity."

They consolidated back to a monolith — a single service called Centrifuge that handled all destinations. Velocity recovered immediately. The root problem (fault isolation) was solved within the monolith using better error handling and bulkheading, not by distributing the system.

### Debugging becomes archaeology across 50 services

In a monolith, a stack trace shows you the complete call path. In microservices, a single user request may traverse 10-20 services. Debugging requires distributed tracing (Jaeger, Zipkin, Datadog), log correlation across services, and understanding of asynchronous event flows that span multiple systems.

Uber engineers reported having to investigate across 50 services and 12 teams to find the root cause of a single problem. Without world-class observability tooling, debugging a microservices system is like reading a novel where every chapter is in a different building.

### Testing complexity explodes

Testing a monolith: start the application, run tests. Testing microservices: start all dependent services (or maintain contract tests for each service boundary), manage test data across multiple databases, handle asynchronous event propagation in tests, mock network failures, test timeout and retry behavior.

Integration test scope grows combinatorially. With 10 services and 3 API versions each, the number of possible interaction states is enormous. Teams without mature contract testing practices (Pact, Spring Cloud Contract) spend more time maintaining test infrastructure than writing tests.

---

## How It Works

### Service boundaries: bounded contexts, not technical layers

Each service maps to a business capability (Orders, Payments, Inventory, Recommendations), **not** a technical layer (API, Business Logic, Data Access). A service owns the full vertical stack for its capability: API endpoint, business logic, data store, and deployment pipeline.

Wrong decomposition (by technical layer):
```
api-gateway-service/       → handles all HTTP routing
business-logic-service/    → handles all business rules
data-access-service/       → handles all database queries
```

Correct decomposition (by business capability):
```
order-service/             → owns orders: API + logic + data
payment-service/           → owns payments: API + logic + data
inventory-service/         → owns inventory: API + logic + data
recommendation-service/    → owns recommendations: API + logic + data
```

### Synchronous communication (request-response)

Used when the caller needs an immediate response to continue processing.

**REST/HTTP:** The default for external-facing APIs and simple service-to-service calls. Well understood, easy to debug, broadly supported.

**gRPC:** Binary protocol over HTTP/2. Faster serialization (Protocol Buffers), bidirectional streaming, strong typing via `.proto` contracts. Preferred for internal service-to-service calls where performance matters.

```protobuf
// order.proto — contract between order-service and payment-service
service PaymentService {
  rpc AuthorizePayment(PaymentRequest) returns (PaymentResponse);
}

message PaymentRequest {
  string order_id = 1;
  int64 amount_cents = 2;
  string currency = 3;
  string idempotency_key = 4;
}

message PaymentResponse {
  bool authorized = 1;
  string transaction_id = 2;
  string decline_reason = 3;
}
```

**The danger of synchronous calls:** Every synchronous call creates temporal coupling. If payment-service is down, order-service cannot complete. Chain three synchronous calls together and the probability of failure multiplies. Use synchronous calls only when the caller genuinely cannot proceed without an immediate answer.

### Asynchronous communication (event-driven)

Used when the caller does not need an immediate response, or when multiple consumers need to react to the same event.

```
order-service publishes → OrderPlaced event → message broker (Kafka/RabbitMQ)
    ├── payment-service subscribes → initiates payment
    ├── inventory-service subscribes → reserves stock
    ├── notification-service subscribes → sends confirmation email
    └── analytics-service subscribes → records event for reporting
```

Events decouple the publisher from all consumers. Order-service does not know (or care) how many services react to an OrderPlaced event. New consumers can be added without modifying the publisher.

**Tradeoff:** Eventual consistency. After order-service publishes OrderPlaced, there is a window where the payment has not yet been processed and inventory has not yet been reserved. The system is temporarily inconsistent. Designing for eventual consistency requires careful thought about what the user sees during this window.

### Service discovery

Services need to find each other without hardcoded addresses. Two models:

**Client-side discovery:** The client queries a service registry (Consul, Eureka) and load-balances across available instances. The client is responsible for choosing an instance.

**Server-side discovery (platform-managed):** Kubernetes Services provide built-in service discovery. `http://payment-service:8080` resolves via kube-dns to a healthy pod. The platform handles load balancing and health checking. This is the dominant model in 2024+.

### API Gateway

A single entry point for external clients. Routes requests to internal services, handles cross-cutting concerns (authentication, rate limiting, request logging, SSL termination), and aggregates responses from multiple services when needed.

```
Client → API Gateway → order-service
                     → payment-service
                     → user-service
```

The gateway shields internal service topology from external consumers. Internal services can be split, merged, or moved without changing the external API.

### Data isolation: each service owns its database

**This is the most important — and most violated — principle of microservices.** Each service has its own database (or schema) that no other service may access directly. Not read-only access. Not "just for reporting." No access at all.

If order-service needs customer data, it calls user-service's API. It does not query user-service's database directly. This is non-negotiable — shared databases create coupling that defeats every benefit of independent deployment.

**Consequence:** No cross-service JOINs. No cross-service foreign keys. Reports that need data from multiple services must either query each service's API and aggregate, or consume events into a dedicated reporting/analytics data store (CQRS read model).

### Eventual consistency

Without shared databases and distributed transactions, consistency between services is eventual. After order-service creates an order and publishes an event, payment-service will process the payment — but not instantly. The system is consistent "eventually" (typically milliseconds to seconds, but potentially longer under failure).

Patterns for managing this:
- **Saga pattern:** A sequence of local transactions across services, with compensating transactions to undo previous steps if a later step fails. See `architecture/patterns/saga-pattern.md`.
- **Outbox pattern:** Events are written to a local "outbox" table in the same transaction as the domain change, then published asynchronously. Guarantees at-least-once delivery without distributed transactions.
- **CQRS:** Separate read and write models. Write models are strongly consistent within a service. Read models are eventually consistent projections built from events.

### Container orchestration (Kubernetes)

Kubernetes is the de facto standard. It handles deployment, scaling, health checking, service discovery (kube-dns), rolling updates, and resource management. Each service runs as multiple replicated pods for availability. Each service declares CPU/memory resource requests and limits.

### Service mesh

A dedicated infrastructure layer (Istio, Linkerd) deployed as sidecar proxies alongside each service. Provides mutual TLS (mTLS), traffic management (canary, blue-green), observability, and retry/timeout policies — without application code changes. Necessary at scale (50+ services) but significant operational overhead for smaller deployments.

### Distributed tracing

A single user request may traverse 10+ services. Distributed tracing assigns a unique trace ID and propagates it across all service calls, creating a visual trace with timing per hop:

```
[trace-id=abc123] api-gateway(2ms) → order-service(15ms) → payment-service(45ms) → fraud-detection(30ms)
```

Without distributed tracing, debugging is effectively impossible. Tracing is prerequisite infrastructure, not an optimization.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| Independent deployment per service — teams ship on their own schedule | N services = N CI/CD pipelines, N deployment configs, N rollback procedures |
| Independent scaling — allocate resources where load actually is | Infrastructure cost increases 25%+ from per-service overhead (containers, sidecars, load balancers) |
| Team autonomy — each team owns their service end-to-end | Cross-service features require multi-team coordination, API versioning, and contract negotiation |
| Technology freedom — each service can use the best tool for the job | Polyglot infrastructure multiplies operational complexity (different build tools, different monitoring, different debugging) |
| Fault isolation — one service failing does not crash the system | Partial failures are harder to reason about than total failures; cascading failures require circuit breakers |
| Organizational scalability — 100+ engineers can work without stepping on each other | Communication overhead increases 3-5x; standups grow from 15 to 45+ minutes |
| Smaller, focused codebases per service are easier to understand individually | The system as a whole is dramatically harder to understand; no single person comprehends the full architecture |
| Forced API discipline — service boundaries require explicit contracts | Every service boundary is a potential point of failure, latency, and versioning complexity |
| Independent data stores prevent data coupling | No cross-service JOINs, no cross-service transactions; reporting requires dedicated infrastructure |
| Easier to replace or rewrite a single service | Service boundaries drawn wrong create a distributed monolith — worse than a regular monolith |
| Enables continuous delivery at organizational scale | Requires mature DevOps culture, platform team, and significant tooling investment before benefits materialize |

---

## Evolution Path

### The cardinal rule: never start with microservices

Almost every successful microservices architecture started as a monolith. Netflix started as a monolith. Amazon started as a monolith. Uber started as a monolith. They migrated to microservices after years of growth, when the organizational and scaling problems became concrete and measurable — not theoretical.

Starting with microservices means drawing service boundaries before you understand your domain. The boundaries will be wrong. Refactoring across service boundaries is 10-100x more expensive than refactoring within a monolith.

### Stage 1: Monolith (correct starting point)

Build a well-structured monolith. Focus on clean domain separation within the codebase — not because you plan to extract services, but because it is good engineering. Use the energy you would have spent on Kubernetes, service mesh, and distributed tracing on shipping product and finding product-market fit.

### Stage 2: Modular monolith (when team grows)

When the codebase grows to 10+ developers across multiple teams, enforce module boundaries within the monolith. Use tooling (ArchUnit, Packwerk, Nx boundary rules) to prevent modules from reaching into each other's internals. Each module owns its own database schema. Communication between modules goes through published interfaces or an in-process event bus.

This stage provides 80% of the organizational benefits of microservices (team ownership, code isolation, clear contracts) with none of the distributed systems overhead.

**Many organizations should stay at this stage permanently.** Shopify runs a modular monolith with 2,000+ engineers. Stack Overflow serves billions of page views from a monolith.

### Stage 3: Selective extraction (when specific constraints demand it)

Extract individual modules to services **only when a specific, measurable constraint requires it**:

- Module X needs independent scaling (measured, not speculated)
- Module X must deploy independently due to regulatory requirements
- Module X requires a fundamentally different technology stack
- Module X's deployment cadence is blocked by shared deployment

**The Strangler Fig pattern** is the safest extraction method:

1. **Intercept:** Place a routing layer (API gateway or proxy) in front of the monolith.
2. **Extract:** Build the new service implementing the module's functionality.
3. **Redirect:** Route requests for that capability to the new service.
4. **Remove:** Delete the module code from the monolith.

Each step is independently deployable and reversible. The system works at every intermediate stage. If the extraction proves to be a mistake, you can route traffic back to the monolith.

**Never extract more than one module at a time.** Validate each extraction in production — performance, reliability, operational burden — before starting the next. Netflix's migration took seven years. Rushing is how you build a distributed monolith.

### Stage 4: Domain-oriented architecture (at extreme scale)

At 100+ services, individual services become too granular for organizational management. Uber's response — Domain-Oriented Microservice Architecture (DOMA) — groups related services into domains with a single entry point. Each domain exposes a gateway service; internal services within the domain are hidden from the rest of the organization.

This is the architecture of organizations with 1,000+ engineers and hundreds of services. If you are reading this section because you think you need it, you almost certainly do not.

---

## Failure Modes

### Failure Mode 1: The distributed monolith

**What it looks like:** 15 "microservices" that must all be deployed together. A change to the Order schema requires simultaneous updates to Order, Payment, Inventory, and Notification services. Services share a database. The team has a "deployment day" where all services are released in sequence.

**Why it happens:** Service boundaries were drawn by technical layer (API service, business logic service, data service) instead of by business capability. Or the team split the monolith along arbitrary lines without understanding which components are genuinely independent.

**The result:** You have all the operational complexity of microservices (network calls, distributed debugging, multiple pipelines) with none of the benefits (independent deployment, independent scaling). This is strictly worse than a monolith.

**90% of microservices teams still batch-deploy like monoliths (2024-2025 industry data).** If you cannot deploy any single service without touching others, you have a distributed monolith.

**Fix:** Either consolidate back to a monolith (or modular monolith) or invest in proper service boundary redesign using DDD bounded contexts.

### Failure Mode 2: Chatty services

**What it looks like:** Rendering a single web page requires 15 synchronous service-to-service calls. Latency is dominated by network round-trips, not computation. A latency spike in any one of the 15 services causes the entire page to slow down or time out.

**Why it happens:** Services are too fine-grained. Instead of a single Order service that handles the complete order lifecycle, there is an OrderCreation service, an OrderValidation service, an OrderPricing service, and an OrderPersistence service — all of which must be called in sequence.

**The math:** 15 calls x 5ms average latency = 75ms of pure network overhead, before any actual computation. Add one call with a P99 of 50ms and the page regularly takes over 125ms just for networking.

**Fix:** Merge chatty services. If two services always communicate synchronously and cannot function independently, they are one service that has been unnecessarily split. An inter-service call should represent a genuine organizational or scaling boundary, not a function call.

### Failure Mode 3: Shared database

**What it looks like:** Three services read from and write to the same PostgreSQL database. The Order table has columns added by the Payment team. A schema migration by the Inventory team breaks the Order service.

**Why it happens:** The team wanted the convenience of JOINs and transactions across service boundaries. Or the team was told "do microservices" but nobody enforced data isolation.

**The result:** Tight coupling through shared state. Any service can break any other service by changing the schema. Services cannot be deployed independently because a schema change must be coordinated. The "micro" in microservices is meaningless when all services share a single data store.

**Fix:** Each service gets its own database or schema with no cross-service access. Accept the cost: no cross-service JOINs, eventual consistency for cross-service data needs, and API calls or events for data sharing.

### Failure Mode 4: Missing observability

**What it looks like:** A user reports that checkout is slow. The on-call engineer checks the order service — it looks fine. Checks the payment service — also fine. The issue is actually a slow query in the fraud detection service that is called by the payment service, but nobody knows this because there is no distributed tracing.

**Real cost:** Without distributed tracing, debugging a 10-service call chain takes hours instead of minutes. Engineers resort to adding log statements, redeploying, and hoping to reproduce the issue.

**Fix:** Implement distributed tracing (Jaeger, Zipkin, Datadog APT) before you deploy your second service. Not after. Not when you "have time." Tracing is prerequisite infrastructure for microservices, not an optimization.

### Failure Mode 5: Cascade failures

**What it looks like:** The recommendation service experiences high load. It becomes slow, causing the product-page service (which calls it synchronously) to queue up threads waiting for responses. The product-page service's thread pool fills up, causing it to stop responding to the API gateway. The API gateway marks the product-page service as unhealthy and routes all traffic to the remaining instances, which immediately overload. The entire system goes down because one non-critical service was slow.

**Why it happens:** No circuit breakers, no bulkheading, no timeout budgets. Every service trusts that its dependencies will respond quickly.

**Fix:** Circuit breaker pattern (Hystrix, Resilience4j, Polly): when a downstream service fails, stop calling it and return a degraded response. Bulkheading: isolate thread pools per dependency so one slow dependency cannot exhaust all resources. Timeout budgets: a request that has already consumed 80% of its time budget should not make a downstream call that takes 50% of the budget.

### Failure Mode 6: Version coupling hell

**What it looks like:** Payment service v2 changes its API contract. Order service, Subscription service, and Refund service all depend on Payment v1. All three must be updated simultaneously. The team spends a sprint coordinating the migration across four services owned by three teams.

**Why it happens:** No API versioning strategy. Breaking changes are deployed without maintaining backward compatibility.

**Fix:** Never make breaking API changes. Add new fields; don't remove old ones. Use API versioning (`/v1/payments`, `/v2/payments`) and support both versions simultaneously during migration. Consumer-driven contract testing (Pact) catches breaking changes before deployment.

### Failure Mode 7: Over-decomposition

**What it looks like:** A 12-person team maintains 45 services. Each service has 200-500 lines of code. Most services do a single database query and forward the result. Engineers spend more time navigating between repositories and updating inter-service contracts than writing business logic.

**Why it happens:** The team took "micro" literally and split by every entity or function rather than by business capability.

**Fix:** Merge services that have no independent deployment or scaling needs. A reasonable starting point: one service per team of 3-8 engineers. If a service cannot justify its own CI/CD pipeline and on-call rotation, it should not be a separate service.

---

## Technology Landscape

### Container orchestration

**Kubernetes (K8s):** The de facto standard. Handles deployment, scaling, service discovery (kube-dns), health checking, rolling updates, resource management, and secrets. Non-negotiable for serious microservices deployment. See Implementation Sketch for deployment YAML.

### Service mesh

**Istio:** Full-featured — mTLS, traffic management (canary, blue-green), observability, policy enforcement. Significant overhead; justified for 50+ services. **Linkerd:** Lighter-weight alternative, simpler to operate. Often better for organizations new to service mesh.

### API Gateway

**Kong:** Open-source, plugin-based (auth, rate limiting, logging). K8s-native via Ingress Controller. **AWS/GCP API Gateway:** Cloud-managed, lower ops overhead. **Envoy:** High-performance proxy, also the data plane for Istio.

### Communication protocols

**REST/HTTP:** Default for external APIs. Well-understood, easy to debug. Use OpenAPI for contracts. **gRPC:** Binary (Protocol Buffers) over HTTP/2, 2-10x faster than JSON/REST for internal calls. Strong typing via `.proto` files. **GraphQL:** Useful as gateway aggregation layer, not for service-to-service.

### Asynchronous messaging

**Apache Kafka:** Durable, ordered, replayable event log. The standard at scale. **RabbitMQ:** Flexible routing, simpler to operate for smaller deployments. **AWS SQS/SNS, GCP Pub/Sub:** Cloud-managed, lower ops overhead with provider lock-in.

### Observability

**OpenTelemetry:** Vendor-neutral instrumentation standard — instrument once, export to any backend. The industry standard. **Jaeger / Zipkin:** Open-source distributed tracing (self-hosted). **Datadog / New Relic / Honeycomb:** Commercial platforms combining tracing, metrics, and logging.

### Resilience

**Circuit breaker:** Resilience4j (Java), Polly (.NET), opossum (Node.js). Stops calling failing services, returns fallback. **Retry with backoff:** Exponential backoff + jitter for transient failures; requires server-side idempotency. **Bulkhead:** Isolates resource pools per dependency so one slow service cannot exhaust all capacity.

---

## Decision Tree

```
How many developers work on this system?
│
├── Fewer than 10 (single team)
│   └── STOP. Use a monolith or modular monolith.
│       Microservices will cost more than they save.
│       Revisit when team grows past 10.
│
├── 10-50 developers (2-5 teams)
│   ├── Do all teams work on the same codebase?
│   │   ├── Yes → Modular monolith with enforced boundaries.
│   │   │         Extract only if specific modules have
│   │   │         measured independent scaling needs.
│   │   └── No  → Are the codebases genuinely independent products?
│   │             ├── Yes → Separate applications (not microservices).
│   │             └── No  → Modular monolith. Shared deployment is fine.
│   │
│   ├── Do you have a mature DevOps/platform team?
│   │   ├── No  → STOP. You cannot operate microservices without
│   │   │         CI/CD automation, container orchestration,
│   │   │         and distributed tracing. Build this first.
│   │   └── Yes → Continue evaluation.
│   │
│   └── Is the product domain well understood?
│       ├── No  → Monolith or modular monolith. You will draw
│       │         service boundaries wrong. Wait until domain
│       │         boundaries are proven (6-12 months of production).
│       └── Yes → Consider selective extraction of 1-3 services
│                 with proven independent scaling/deployment needs.
│
├── 50+ developers (5+ autonomous teams)
│   ├── Do teams need independent deployment cadences?
│   │   ├── No  → Modular monolith (see: Shopify, 2000+ engineers).
│   │   └── Yes → Microservices for teams needing independence.
│   │             Keep shared components as modular monolith.
│   │
│   ├── Are there genuinely different scaling profiles?
│   │   ├── No  → Modular monolith scales horizontally as a unit.
│   │   └── Yes → Extract high-scale components to services.
│   │
│   └── Do you have platform engineering capacity?
│       ├── No  → STOP. Invest in platform team first.
│       │         Microservices without platform support = chaos.
│       └── Yes → Microservices with domain-oriented grouping.
│                 Each domain = 3-8 services behind a domain gateway.
│
└── Is this a startup pre-product-market-fit?
    └── ALWAYS monolith. No exceptions. Ship product.
        Revisit architecture when you have paying customers
        and measurable scaling problems.
```

**Summary decision heuristic:**

- Team < 10 → monolith or modular monolith (never microservices)
- Team 10-50, same product → modular monolith (selective extraction only with evidence)
- Team 50+, multiple products, mature DevOps → microservices (with domain-oriented grouping)
- Startup without PMF → monolith (regardless of team size)
- No platform/DevOps team → not ready (regardless of team size)

---

## Implementation Sketch

### Service structure (single service)

```
order-service/
├── src/
│   ├── api/                          # Inbound adapters
│   │   ├── rest/
│   │   │   ├── OrderController.java  # REST endpoints
│   │   │   └── dto/
│   │   │       ├── CreateOrderRequest.java
│   │   │       └── OrderResponse.java
│   │   └── grpc/
│   │       └── OrderGrpcService.java # gRPC endpoint
│   ├── domain/                       # Core business logic (no framework deps)
│   │   ├── Order.java                # Aggregate root
│   │   ├── OrderItem.java            # Value object
│   │   ├── OrderStatus.java          # Enum
│   │   ├── OrderRepository.java      # Port (interface)
│   │   └── events/
│   │       ├── OrderPlaced.java      # Domain event
│   │       └── OrderCancelled.java
│   ├── application/                  # Use cases / application services
│   │   ├── CreateOrderUseCase.java
│   │   ├── CancelOrderUseCase.java
│   │   └── ports/
│   │       ├── PaymentClient.java    # Port for calling payment-service
│   │       └── InventoryClient.java  # Port for calling inventory-service
│   └── infrastructure/               # Outbound adapters
│       ├── persistence/
│       │   └── JpaOrderRepository.java
│       ├── clients/
│       │   ├── PaymentGrpcClient.java
│       │   └── InventoryRestClient.java
│       ├── messaging/
│       │   └── KafkaEventPublisher.java
│       └── config/
│           └── AppConfig.java
├── Dockerfile
├── build.gradle
├── openapi.yaml                      # API contract (source of truth)
└── kubernetes/
    ├── deployment.yaml
    ├── service.yaml
    └── configmap.yaml
```

### Docker Compose for local development

```yaml
# docker-compose.yaml — local dev environment (NOT production)
# Abridged: shows pattern, not every service
version: '3.8'
services:
  order-service:
    build: ./order-service
    ports: ["8081:8080"]
    environment:
      - DB_URL=jdbc:postgresql://order-db:5432/orders
      - PAYMENT_SERVICE_URL=http://payment-service:8080
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    depends_on: [order-db, kafka]

  payment-service:
    build: ./payment-service
    ports: ["8082:8080"]
    environment:
      - DB_URL=jdbc:postgresql://payment-db:5432/payments
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    depends_on: [payment-db, kafka]

  # Each service gets its own database — data isolation enforced at infra level
  order-db:
    image: postgres:16
    environment: { POSTGRES_DB: orders, POSTGRES_USER: order_app, POSTGRES_PASSWORD: localdev }
  payment-db:
    image: postgres:16
    environment: { POSTGRES_DB: payments, POSTGRES_USER: payment_app, POSTGRES_PASSWORD: localdev }

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports: ["9092:9092"]
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
  jaeger:
    image: jaegertracing/all-in-one:1.55
    ports: ["16686:16686", "4317:4317"]  # UI + OTLP
```

Note the local development complexity: 7 containers for just 2 services. A real system with 5+ services needs 15-20+ containers locally. In production, add service mesh sidecars, API gateway, monitoring stack, and log aggregation. This is the operational cost made tangible.

### OpenAPI contract (source of truth)

```yaml
# order-service/openapi.yaml — each service publishes its contract
openapi: 3.1.0
info:
  title: Order Service API
  version: 1.2.0
paths:
  /api/v1/orders:
    post:
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '402':
          description: Payment declined
  /api/v1/orders/{orderId}:
    get:
      operationId: getOrder
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '404':
          description: Order not found
components:
  schemas:
    CreateOrderRequest:
      type: object
      required: [customerId, items]
      properties:
        customerId: { type: string, format: uuid }
        items:
          type: array
          items: { $ref: '#/components/schemas/OrderItemRequest' }
        idempotencyKey: { type: string }
    OrderItemRequest:
      type: object
      required: [productId, quantity]
      properties:
        productId: { type: string, format: uuid }
        quantity: { type: integer, minimum: 1 }
    OrderResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        status: { type: string, enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED] }
        totalCents: { type: integer }
        createdAt: { type: string, format: date-time }
```

### Kubernetes deployment with health checks

```yaml
# order-service/kubernetes/deployment.yaml — key elements shown
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 1, maxSurge: 1 }
  selector:
    matchLabels: { app: order-service }
  template:
    metadata:
      labels: { app: order-service, domain: commerce }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
      - name: order-service
        image: registry.example.com/order-service:v1.2.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef: { name: order-service-secrets, key: db-url }
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://jaeger-collector:4317"
        resources:
          requests: { memory: "256Mi", cpu: "250m" }
          limits:   { memory: "512Mi", cpu: "500m" }
        readinessProbe:
          httpGet: { path: /health/ready, port: 8080 }
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet: { path: /health/live, port: 8080 }
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector: { app: order-service }
  ports: [{ port: 8080, targetPort: 8080 }]
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: { type: Utilization, averageUtilization: 70 }
```

---

## Cross-References

- **monolith:** The correct starting point. Understand when a monolith is sufficient before reaching for microservices. See `architecture/patterns/monolith.md`.
- **modular-monolith:** The recommended intermediate step. Provides team ownership and boundary enforcement without distributed systems overhead. The architecture most teams should use instead of microservices. See `architecture/patterns/modular-monolith.md`.
- **event-driven:** Asynchronous communication between microservices relies on event-driven patterns. Events decouple services and enable eventual consistency. See `architecture/patterns/event-driven.md`.
- **saga-pattern:** The primary pattern for managing distributed transactions across microservices without 2PC. See `architecture/patterns/saga-pattern.md`.
- **api-design-rest:** REST API design principles for service-to-service and external communication. See `architecture/integration/api-design-rest.md`.
- **api-design-grpc:** gRPC design for high-performance internal service communication. See `architecture/integration/api-design-grpc.md`.
- **circuit-breaker-bulkhead:** Resilience patterns essential for preventing cascade failures in microservices. See `architecture/distributed/circuit-breaker-bulkhead.md`.
- **monolith-to-microservices:** The strangler fig pattern and migration strategies for extracting services from a monolith. See `architecture/patterns/monolith-to-microservices.md`.
- **domain-driven-design:** Bounded contexts are the prerequisite for defining service boundaries. Wrong boundaries = distributed monolith. See `architecture/foundations/domain-driven-design.md`.

---

*Researched: 2026-03-08 | Sources: [Amazon Prime Video — Scaling Up the Prime Video Audio/Video Monitoring Service](https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90) | [Segment — Goodbye Microservices: From 100s of Problem Children to 1 Superstar (InfoQ)](https://www.infoq.com/news/2020/04/microservices-back-again/) | [Netflix Microservices Migration — From Monolith to 700+ Services](https://caffeinatedcoder.medium.com/netflixs-microservices-migration-from-monolith-to-700-services-8caa8e5bc574) | [Uber — Introducing Domain-Oriented Microservice Architecture](https://www.uber.com/en-US/blog/microservice-architecture/) | [Microservices Retrospective — What We Learned from Netflix (InfoQ)](https://www.infoq.com/presentations/microservices-netflix-industry/) | [The True Cost of Microservices — Quantifying Operational Complexity](https://www.softwareseni.com/the-true-cost-of-microservices-quantifying-operational-complexity-and-debugging-overhead/) | [The Architecture Decision That Saved Us $2M (FullScale)](https://fullscale.io/blog/microservices-team-management/) | [Microservices: Lessons from the Trenches (JavaPro)](https://javapro.io/2025/09/12/microservices-lessons-from-the-trenches/) | [Monolith vs Microservices 2025: Real Cloud Migration Costs](https://medium.com/@pawel.piwosz/monolith-vs-microservices-2025-real-cloud-migration-costs-and-hidden-challenges-8b453a3c71ec) | [Martin Fowler — MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) | [Strangler Fig Pattern — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html) | [Adopting Microservices at Netflix: Lessons for Architectural Design (F5/NGINX)](https://www.f5.com/company/blog/nginx/microservices-at-netflix-architectural-best-practices)*
