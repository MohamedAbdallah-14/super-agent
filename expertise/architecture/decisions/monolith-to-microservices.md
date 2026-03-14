# Monolith to Microservices — Architecture Expertise Module

> Migrating from monolith to microservices is one of the riskiest architectural undertakings. Most organizations should NOT do it — the modular monolith is sufficient for the majority. When migration is genuinely needed, incremental extraction using the Strangler Fig pattern is the only proven safe approach. Big-bang rewrites fail.

> **Category:** Decision
> **Complexity:** Expert
> **Applies when:** Existing monolith causing demonstrable team scaling problems, deployment bottlenecks, or independent scaling needs that modular monolith cannot address

---

## What This Is (and What It Isn't)

A monolith-to-microservices migration is the process of decomposing a single deployable application into multiple independently deployable services, each owning its own data store and business capability. The goal is to gain independent deployment, independent scaling, and team autonomy — but the cost is distributed systems complexity across every layer of the stack.

The only proven safe approach is the **Strangler Fig pattern**: gradually replace monolith capabilities with new services, one bounded context at a time, while the monolith continues to serve traffic. The monolith shrinks incrementally as services take over. At no point does the system go through a non-functional state.

The name comes from the strangler fig tree in tropical forests: a parasitic vine that grows around a host tree, gradually enveloping it. Eventually the host tree dies and rots away, leaving only the fig — but the fig was always functional at every stage. The same principle applies to migration: the system is always working, always deployable, always serving users.

**What this migration IS:**

- An incremental, multi-quarter (often multi-year) evolutionary process
- A domain decomposition exercise first, a technical exercise second
- An organizational restructuring as much as a technical one
- Reversible at every step — each extracted service can be reverted back to the monolith

**What this migration IS NOT:**

- A big-bang rewrite. Every documented big-bang rewrite of a monolith to microservices has either failed outright, gone massively over schedule, or produced a distributed monolith. The Second System Effect (Fred Brooks) applies with full force.
- A technology upgrade. "Rewrite the Java monolith in Go microservices" is not a migration strategy. It is two migrations stacked on top of each other (language change + architecture change), and the risk multiplies.
- A solution to bad code. If the monolith has unclear domain boundaries, no tests, and tangled dependencies, extracting pieces into services will produce microservices with unclear boundaries, no tests, and tangled network dependencies — except now debugging requires distributed tracing instead of a stack trace.
- Inevitable. Many of the world's most successful software systems are monoliths or modular monoliths. There is no architectural law that says a system must evolve toward microservices.

**The Strangler Fig pattern — how it works at a high level:**

```
Phase 1: Identify a bounded context for extraction (e.g., Notifications)
Phase 2: Build the new Notifications service alongside the monolith
Phase 3: Introduce a routing layer (API gateway, proxy, or facade)
Phase 4: Redirect traffic: monolith → new service (1% → 10% → 100%)
Phase 5: Remove the Notifications code from the monolith
Phase 6: Repeat for the next bounded context
```

At every phase, the system works. At every phase, you can stop and declare the migration complete with the current set of extracted services and the remaining monolith. This is the critical property that makes the Strangler Fig pattern safe: it is always possible to stop.

---

## When to Do It

This section describes scenarios where migration is genuinely justified. Each scenario includes real examples and measurable indicators. If you cannot point to one of these specific pain points with data, you should not migrate.

### Teams larger than 50 developers are blocked by each other

When 8+ teams share a single deployable monolith, deployment coordination becomes a full-time job. Teams queue for merge windows. A bug in Team A's code blocks Team B's release. Feature flags accumulate to manage partial deployments. Release trains become monthly instead of daily.

**Amazon (2001-2006):** The canonical example. Jeff Bezos mandated that every team must communicate via service interfaces — no shared databases, no direct linking. This was driven by organizational scaling pain: hundreds of engineers could not coordinate changes to a single codebase. The result was a service-oriented architecture that enabled Amazon's engineering organization to scale to thousands of developers. The mandate was organizational first, technical second.

**Uber (2014-2017):** Uber's original Python monolith ("uberblack") served the company from founding through hypergrowth. By 2014, with hundreds of engineers across multiple cities and product lines (UberX, UberPool, UberEats), the monolith was the bottleneck. Deployment took hours. A single bad commit could take down all services globally. Teams were blocked by each other's changes in shared code paths. Uber decomposed along domain lines — trips, pricing, matching, payments — enabling independent team velocity. By 2017, Uber operated approximately 2,200 microservices.

**Measurable indicator:** Deployment frequency has declined as the team has grown. Lead time from "code complete" to "in production" exceeds 1 week due to coordination, not technical complexity.

### Deployment frequency is limited by coupling, not by choice

If your team wants to deploy multiple times per day but cannot because changes to one component require retesting the entire application, and a modular monolith with independent test suites has already been attempted, service extraction may be warranted.

**Netflix (2008-2015):** After a three-day database corruption outage in August 2008 exposed the fragility of their monolithic architecture, Netflix began a seven-year migration to microservices. The driver was not team size alone but deployment coupling: a change to the recommendation engine required redeploying the entire application, including the streaming pipeline, billing, and user management. By 2015, Netflix operated 700+ microservices and deployed thousands of times per day across independent services.

**Measurable indicator:** You have tried modular monolith approaches (separate test suites per module, feature flags, trunk-based development) and deployment coupling persists because of shared runtime state or shared deployment artifact constraints.

### Genuinely different scaling requirements per component

If your video transcoding pipeline needs 500 GPU cores during peak hours while your user profile service needs 2 CPU cores, scaling them as a single unit wastes resources. This is a legitimate driver for extraction — but only for the specific components with divergent scaling needs.

**Measurable indicator:** Infrastructure cost analysis shows 3x+ over-provisioning because the monolith must be scaled to the requirement of its most resource-intensive component. Actual measurement of traffic patterns shows 10x+ difference in resource requirements between components.

### Regulatory or compliance isolation requirements

Some domains require that payment processing, healthcare data, or financial calculations run in isolated environments with independent audit trails, separate access controls, and dedicated infrastructure. A monolith sharing process memory between PCI-scoped and non-PCI-scoped code may not satisfy auditors.

**Measurable indicator:** Compliance auditors have flagged shared process boundaries as a risk. The cost of making the entire monolith PCI/HIPAA/SOX compliant exceeds the cost of extracting the regulated component.

### Technology heterogeneity is genuinely required

If your ML inference pipeline must be Python/PyTorch, your real-time bidding engine must be C++ for latency, and your web API is Go, these cannot coexist in a single deployable unit. This is a hard constraint that microservices solve.

**Measurable indicator:** Performance benchmarks prove that the required component cannot meet its SLA in the monolith's language/runtime, and the performance gap is fundamental (not fixable by optimization).

---

## When NOT to Do It

**This section is deliberately longer than "When to Do It" because the default answer should be "don't migrate."** The industry has a well-documented bias toward microservices adoption driven by hype, resume-driven development, and vendor marketing — not by genuine architectural need. The failure rate of monolith-to-microservices migrations is high, and the costs are routinely underestimated by 3-10x.

### "Microservices are modern" is not a reason

The most common driver for migration is not a measured pain point but a belief that microservices are inherently superior. They are not. They are a tradeoff: you gain independent deployment and scaling at the cost of distributed systems complexity. For most applications, the cost exceeds the benefit.

Sam Newman, author of "Monolith to Microservices" (O'Reilly, 2019), states explicitly: **"The monolith is not the enemy."** And: **"Microservices should not be the default choice."** His book's core argument is that decomposition must be driven by measurable organizational or technical pain, not by architectural fashion.

### Team smaller than ~20 developers

Below approximately 20 developers (2-3 teams), the coordination overhead of a monolith is manageable, and the operational overhead of microservices is disproportionate. You need to staff on-call rotations, build distributed tracing infrastructure, manage inter-service API versioning, handle partial failures, and operate a service mesh — all for a team that could coordinate via a daily standup.

**The math:** A microservices architecture for a team of 10 typically requires 10-30% of engineering capacity devoted to platform/infrastructure work (CI/CD per service, monitoring, service discovery, API gateway management). For a team of 10, that is 1-3 full-time engineers maintaining infrastructure instead of building product. For a team of 100, the same 10-30% is 10-30 engineers — which is a viable platform team.

### You have not tried a modular monolith first

The pragmatic evolution path is: Monolith -> Modular Monolith -> Selective Microservice Extraction. Skipping the modular monolith step means you are paying the full distributed systems tax before proving that simpler alternatives are insufficient.

A modular monolith provides most of the organizational benefits of microservices (team ownership, clear boundaries, independent development) without the operational cost. If a modular monolith solves your pain, you have saved yourself years of migration work. If it does not, you have at least identified your domain boundaries — which you need before extracting services anyway.

### No DevOps maturity (CI/CD, monitoring, observability)

Microservices require mature DevOps practices as a prerequisite, not as a nice-to-have. Each service needs: its own CI/CD pipeline, its own deployment configuration, health checks, distributed tracing, centralized logging, alerting, and on-call procedures. If your team does not have automated deployment for a single application, you are not ready for automated deployment of 20 applications.

**The prerequisite checklist:**
- Automated testing with >80% coverage
- CI/CD pipeline with <15 minute build-to-deploy
- Centralized logging and monitoring
- Infrastructure-as-code for provisioning
- Container orchestration (Kubernetes or equivalent)
- Distributed tracing infrastructure (Jaeger, Zipkin, or equivalent)

If you lack more than 2 of these, invest in DevOps maturity before considering microservices.

### Real failure stories: companies that migrated and regretted it

**Segment (2017-2018): Microservices back to monolith.** Segment, the customer data platform, migrated from a monolith to microservices in 2016-2017. Each destination integration (sending data to Amplitude, Mixpanel, Google Analytics, etc.) became its own microservice. During a period of hypergrowth, Segment was adding approximately 3 new destination integrations per month, each requiring a new microservice with its own deployment pipeline, queue, worker, and monitoring.

The result: 3 full-time engineers spent most of their time just keeping the microservices alive. The team was unable to make progress on product features. Each new destination multiplied operational complexity. In 2018, Segment reversed course and built "Centrifuge" — a monolithic architecture capable of handling billions of messages per day. Developer productivity increased immediately. The team went from being unable to ship features to shipping them routinely.

The lesson: Segment's microservices architecture was driven by a reasonable-sounding principle (isolation per destination) but the operational cost per service was constant, while the number of services grew linearly with business growth. The total operational cost became unsustainable for the team size.

**Amazon Prime Video (2023): Microservices to monolith for audio/video monitoring.** Amazon Prime Video's Video Quality Analysis (VQA) team published a case study describing how they reduced infrastructure costs by 90% by consolidating a microservices architecture (built on AWS Step Functions and Lambda) into a monolithic application. The original architecture used distributed components for media conversion, defect detection, and real-time notifications. The inter-service communication overhead (particularly data transfer between Lambda functions via S3) dominated the cost.

Adrian Cockcroft, former VP of Cloud Architecture Strategy at AWS, noted this was more accurately described as a "Step Functions to proper microservice" story — the original architecture was not well-designed microservices but rather an over-distributed pipeline. Regardless, the case demonstrates that even within AWS, teams find that consolidation outperforms distribution for certain workloads.

**Unnamed enterprises (industry pattern):** A 2025 CNCF survey found approximately 42% of organizations that adopted microservices have consolidated at least some services back into larger deployable units. A 2025 Gartner study found 60% of teams report regret about microservices for small-to-medium applications. The pattern is consistent: teams adopt microservices for perceived benefits, discover that the operational overhead exceeds the organizational benefits at their scale, and consolidate.

### The 18-month migration with no user-visible improvement

A recurring anti-pattern: a team spends 12-18 months migrating a monolith to microservices. During that period, no new features ship. User experience does not improve. Performance does not improve (often it degrades due to network overhead). The only visible result is higher infrastructure costs and a more complex deployment pipeline. Leadership questions the value. The migration stalls at 40% completion — leaving the organization with the worst-of-both-worlds: a partially decomposed system that is harder to operate than either a monolith or a fully migrated microservices architecture.

**Prevention:** Before starting migration, define measurable success criteria. "Deploy frequency increases from weekly to daily for Team X" or "Scaling cost for Component Y decreases by 50%." If you cannot state the expected user-visible or cost-visible improvement, the migration lacks justification.

### Resume-driven development

A blunt but necessary point: engineers are incentivized to adopt microservices because "Led migration from monolith to microservices" is a career-enhancing line on a resume. This incentive is real and systematically biases architectural decisions toward complexity. Organizations must guard against this by requiring measurable justification for migration decisions and by valuing operational simplicity as an engineering virtue.

---

## How It Works

### Step 1: Domain analysis — identify extraction candidates

Before touching any code, map the monolith's domain. Use Domain-Driven Design techniques to identify bounded contexts. Each bounded context is a potential extraction candidate.

**Techniques for domain discovery:**

- **Event Storming:** Workshop format where domain experts and engineers map business events on sticky notes. Clusters of related events reveal natural boundaries. A 2-day Event Storming session is often more valuable than months of code analysis.
- **Context Mapping:** Identify the relationships between bounded contexts: shared kernel, customer-supplier, conformist, anti-corruption layer. These relationships determine extraction order.
- **Dependency analysis:** Static analysis of the monolith's code to identify clusters of classes/modules with high internal cohesion and low external coupling. Tools: jDepend (Java), Structure101, Lattix, CodeScene.
- **Data affinity analysis:** Which database tables are joined together most frequently? Tables that are always queried together likely belong in the same bounded context. Tables that are rarely joined across contexts are natural split points.

**Prioritization matrix (Sam Newman's approach):**

Plot each candidate on two axes:
- **X-axis: Difficulty of extraction** (low → high). Factors: number of inbound dependencies, shared database tables, synchronous call chains, data volume.
- **Y-axis: Value of extraction** (low → high). Factors: deployment frequency need, scaling need, team autonomy need, regulatory isolation need.

Extract candidates in the **high value, low difficulty** quadrant first. This delivers benefits early and builds migration expertise before tackling harder extractions.

```
High Value │  Extract     │  Extract
           │  FIRST       │  SECOND
           │  (quick wins)│  (hard but worth it)
           │──────────────┼──────────────────
           │  Leave in    │  Leave in monolith
           │  monolith    │  (high cost, low benefit)
Low Value  │  (not worth  │
           │   the effort)│
           └──────────────┴──────────────────
            Low Difficulty    High Difficulty
```

### Step 2: Build the new service alongside the monolith

The new service is developed and deployed independently. It does not replace the monolith capability yet — it runs in parallel. Key decisions at this stage:

- **API contract:** Define the new service's API before writing implementation. The API should reflect the domain model, not the monolith's internal structure.
- **Data ownership:** The new service gets its own database. It does NOT share the monolith's database. Data it needs from the monolith is either: (a) passed in API calls, (b) synchronized via Change Data Capture (CDC), or (c) replicated via events.
- **Anti-corruption layer (ACL):** An adapter that translates between the monolith's data model and the new service's domain model. The ACL prevents the monolith's legacy concepts from leaking into the new service's clean domain model.

### Step 3: Introduce a routing layer (the strangler facade)

A proxy or API gateway sits in front of both the monolith and the new service. It routes requests to the appropriate backend based on rules. This is the "strangler" — it intercepts traffic and gradually redirects it.

**Implementation options:**

- **API Gateway (Kong, AWS API Gateway, Envoy):** Route by URL path. `/api/notifications/*` goes to the new service; everything else goes to the monolith.
- **Feature flags:** Use a feature flag system to route specific users or a percentage of traffic to the new service.
- **DNS/load balancer:** At the infrastructure level, route traffic based on request characteristics.
- **In-code routing:** The monolith itself delegates calls to the new service via an HTTP client. Simplest to implement but couples the monolith to the new service.

### Step 4: Incremental traffic migration

Never flip 100% of traffic to the new service at once. Use a graduated rollout:

```
1%  traffic → new service (canary: verify basic functionality)
5%  traffic → new service (verify error rates match monolith)
25% traffic → new service (verify latency and throughput at scale)
50% traffic → new service (verify under significant load)
100% traffic → new service (full migration, monolith code now dormant)
```

At each stage, compare: error rates, latency percentiles (p50, p95, p99), business metrics (conversion rates, data accuracy), and resource consumption. If any metric degrades, roll back to the monolith instantly via the routing layer.

**Parallel running:** For critical business logic (payments, order processing), run both the monolith and the new service simultaneously, compare outputs, and alert on divergence. This catches logic bugs before users are affected.

### Step 5: Database decomposition — the hardest part

Database decomposition is universally cited as the hardest part of monolith-to-microservices migration. The monolith typically has a single shared database with foreign key relationships, joins, and transactions spanning what should be separate bounded contexts.

**Strategies for database decomposition:**

**Strategy 1: Shared database (temporary)**
During migration, both the monolith and the new service read/write the same database. This is a transitional state — it couples the services at the data layer and must be resolved, but it reduces initial migration risk.

**Strategy 2: Database view / materialized view**
The new service reads from a database view that presents the monolith's data in the service's domain model. Write operations go through the monolith. This is a read-only transitional pattern.

**Strategy 3: Change Data Capture (CDC)**
Use Debezium, AWS DMS, or similar tools to capture changes from the monolith's database and replicate them to the new service's database. The new service has its own copy of the data it needs, in its own schema, updated asynchronously.

```
Monolith DB  ──CDC (Debezium)──►  Kafka  ──►  New Service DB
(source of truth)                              (read replica in
                                                service's schema)
```

**Strategy 4: Dual-write with reconciliation**
The monolith writes to both its own database and the new service's database (or publishes events that the new service consumes). A reconciliation job periodically verifies consistency. This is error-prone (dual writes can diverge on failure) and should only be used temporarily.

**Strategy 5: Event-sourced migration**
If the monolith can be modified to publish domain events, the new service builds its own read model from those events. This is the cleanest long-term solution but requires the monolith to support event publication.

**The critical rule:** At the end of migration, each service owns its data exclusively. No shared databases between services. Cross-service data access is via APIs or events, never via direct database queries.

### Step 6: Retire monolith code

Once 100% of traffic for a capability is served by the new service and has been stable for a defined period (typically 2-4 weeks), remove the corresponding code from the monolith. This is often neglected — teams leave dead code in the monolith "just in case." Dead code increases cognitive load, maintenance burden, and the risk of accidentally routing traffic back to it.

### Step 7: Repeat for the next bounded context

Each extraction follows the same cycle. With each iteration, the team's extraction expertise improves, patterns are reusable, and the monolith shrinks. A typical migration extracts 1-3 services per quarter.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| Independent deployment per service — each team ships on its own schedule | N deployment pipelines to build, maintain, and monitor instead of 1 |
| Independent scaling per service — scale only what needs scaling | Service discovery, load balancing, and circuit breakers become mandatory infrastructure |
| Team autonomy — each team owns a service end-to-end | Cross-service debugging requires distributed tracing (Jaeger, Zipkin, Datadog) |
| Technology heterogeneity — each service can use the best language/framework | Polyglot operations burden: N runtimes, N dependency management tools, N security patching processes |
| Fault isolation — one service crashing does not take down others | Network partitions, timeouts, and partial failures become normal operating conditions |
| Smaller codebases per service — faster builds, easier onboarding | System-level understanding requires reading N codebases and understanding their interactions |
| Independent data stores — each service optimizes for its access patterns | Distributed data consistency requires sagas, eventual consistency, and compensation logic |
| Organizational scaling — add teams without increasing coordination overhead | API versioning, backward compatibility, and contract testing become critical |
| Granular monitoring and alerting per service | Monitoring infrastructure scales with service count; alert fatigue is common |
| Selective technology upgrades — upgrade one service at a time | Integration testing across services is harder than testing a monolith |
| Regulatory isolation — PCI/HIPAA-scoped services separated from others | Every network call is a potential security boundary requiring mTLS, auth tokens, and audit |
| Incremental migration — extract value without big-bang risk | Migration can take years; maintaining partial migration state is expensive |

---

## Evolution Path

The recommended evolution path is not "monolith to microservices" but "monolith to modular monolith to selective extraction." Most organizations should stop at the modular monolith stage.

### Stage 1: Monolith (team of 1-10)

A single deployable application with no enforced internal boundaries. This is the correct starting architecture for most new projects. Optimize for development speed and learning. Do not prematurely decompose.

### Stage 2: Modular monolith (team of 10-50)

Enforce module boundaries within the monolith using tooling (ArchUnit, Packwerk, Spring Modulith, Nx). Each module owns its data, exposes a public API, and hides its internals. Teams own modules. Deploy as a single unit.

**This is where most organizations should stay.** The modular monolith provides team autonomy and clean domain separation without distributed systems complexity. Shopify operates one of the world's largest Rails codebases (2,800,000+ lines of Ruby, 2,000+ engineers) as a modular monolith with 40+ production deployments per day.

### Stage 3: Selective extraction (team of 50+, with specific pain)

Extract only the modules that have a demonstrated need for independent deployment or independent scaling. The modular monolith's clean interfaces make extraction a mechanical operation: wrap the module's interface in a network adapter, deploy it separately, swap the in-process call for a network call.

**What to extract (with evidence):**
- The module whose deployment is blocked by other modules' release schedules (measured: deployment frequency data)
- The module that needs 100x the compute resources of other modules (measured: resource utilization data)
- The module that must be in a separate compliance boundary (documented: regulatory requirement)
- The module that must use a different technology stack (validated: performance benchmarks)

**What NOT to extract:**
- Modules that "feel like" they should be services
- Modules extracted to match an org chart change
- Modules extracted because "we'll need to scale someday"
- All modules simultaneously

### Stage 4: Continued monolith + services (steady state)

Many successful architectures are hybrids: a modular monolith core with a small number of extracted services for specific needs. This is not a failure state or a transitional state — it is often the optimal end state. The monolith handles 80% of the domain where the simplicity of in-process communication, shared deployment, and ACID transactions is valuable. The services handle the 20% where independent scaling, deployment, or isolation is genuinely required.

---

## Failure Modes

### Failure Mode 1: The distributed monolith

**What it looks like:** Services are deployed independently but cannot function independently. Every change requires coordinating deployments across 3-5 services. Services share a database. A service cannot be tested without running 8 other services locally. Deploying Service A without simultaneously deploying Service B causes failures.

**Why it happens:** The monolith was decomposed along technical layers (UI service, business logic service, data access service) instead of domain boundaries. Or the monolith was split into services that communicate synchronously in long chains, creating temporal coupling. Or services share a database, creating data coupling that undoes the independence microservices are supposed to provide.

**How common:** Extremely. A 2025 CNCF survey found approximately 42% of organizations that adopted microservices have consolidated at least some services back. The distributed monolith is the single most common outcome of naive migration.

**Prevention:** Decompose along domain boundaries (bounded contexts), not technical layers. Each service must own its data. Prefer asynchronous communication (events) over synchronous call chains.

### Failure Mode 2: Data consistency nightmares

**What it looks like:** Orders are created but payments are not processed. Inventory is decremented but the order fails. Customers see stale data because eventual consistency has a lag. Reconciliation jobs run nightly to fix data drift between services.

**Why it happens:** The monolith used ACID transactions to maintain consistency between what are now separate services. After decomposition, there is no distributed transaction coordinator. Sagas and compensating transactions are harder to implement correctly than most teams anticipate.

**Prevention:** Accept eventual consistency as a fundamental constraint. Design compensating transactions for every distributed operation. Implement idempotency on all service endpoints. Use the Saga pattern with explicit compensation steps. Monitor consistency metrics and alert on drift.

### Failure Mode 3: Incomplete migration — worst of both worlds

**What it looks like:** After 18 months, 40% of the monolith has been extracted to services. The remaining 60% is still a monolith. The monolith now depends on 8 external services, adding network calls and failure modes to its critical paths. The services depend on the monolith for shared data. Neither the monolith nor the services can be understood in isolation. The system is harder to operate than either a pure monolith or pure microservices.

**Why it happens:** Migration fatigue. The first 2-3 extractions are exciting. Extractions 4-8 are progressively harder because they hit the tightly coupled core of the monolith. Leadership loses patience with the multi-year timeline. Engineers who championed the migration move to other companies. The migration stalls.

**Prevention:** Before starting, commit to a realistic multi-year timeline. Plan extractions so that each one delivers measurable value independently — the migration can stop at any point and the system is in a better state than before. Define explicit "good enough" stopping points. Not every module needs to be extracted.

### Failure Mode 4: Team burnout from multi-year migration

**What it looks like:** The migration was estimated at 12 months. After 24 months, it is 60% complete. The team has been doing migration work instead of product work for two years. Morale is low. Senior engineers leave for companies where they can build new features instead of migrating old ones. New hires inherit a partially migrated system they do not understand.

**Why it happens:** Migration timelines are systematically underestimated. Database decomposition alone often takes longer than the entire original estimate. Each extraction uncovers undocumented dependencies, implicit assumptions, and edge cases.

**Prevention:** Budget migration work at 20-30% of engineering capacity, not 100%. Teams should spend 70-80% of their time on product work and 20-30% on migration. This extends the calendar time but preserves team morale and product velocity. No team should spend more than one quarter doing 100% migration work.

### Failure Mode 5: Over-decomposition — nano-services

**What it looks like:** The team creates 200 services for a system that could be served by 15. Each service has 200-500 lines of code. Services exist for individual CRUD entities (UserService, AddressService, PreferenceService). The call graph for a single user request traverses 12 services.

**Why it happens:** Misapplication of the Single Responsibility Principle at the service level. "A service should do one thing" is interpreted as "a service should manage one database table." This confuses granularity of deployment with granularity of domain responsibility.

**Prevention:** A microservice should align with a bounded context, not an entity. The bounded context for "User Management" includes users, addresses, preferences, and authentication — these are a single service, not four. If every HTTP request traverses more than 3 services, the decomposition is too fine-grained.

### Failure Mode 6: Migrating without observability

**What it looks like:** Services are deployed but there is no distributed tracing. When a request fails, engineers cannot determine which of the 15 services in the call chain caused the failure. Debugging requires reading logs from multiple services manually. Mean time to resolution (MTTR) increases from minutes (monolith: read the stack trace) to hours (microservices: correlate logs across services).

**Prevention:** Distributed tracing (OpenTelemetry, Jaeger, Zipkin) is a prerequisite for microservices, not a follow-up project. Deploy tracing infrastructure before extracting the first service.

---

## Technology Landscape

### Strangler Fig implementation tools

**API Gateways (routing layer):**
- **Kong:** Open-source API gateway. Route by path, header, or custom plugin logic. Supports canary deployments and traffic splitting.
- **AWS API Gateway:** Managed gateway with Lambda integration. Route by path to different backend services.
- **Envoy Proxy:** High-performance proxy used as the data plane in most service meshes (Istio, Linkerd). Supports traffic splitting, canary routing, and circuit breaking.
- **Nginx:** Reverse proxy with upstream routing. Simple configuration for path-based routing between monolith and new services.
- **Traefik:** Cloud-native reverse proxy with automatic service discovery. Integrates with Kubernetes, Docker, and Consul.

**Service mesh for traffic management:**
- **Istio:** Full-featured service mesh. Traffic splitting (send 5% to new service, 95% to monolith), circuit breaking, mTLS, observability. Heavy operational overhead.
- **Linkerd:** Lightweight service mesh. Simpler than Istio, focused on reliability and observability. Good choice for teams that need traffic splitting without Istio's complexity.
- **AWS App Mesh:** Managed service mesh. Integrates with ECS, EKS, and EC2. Virtual routers enable traffic splitting between monolith and new services.

### Database migration and data synchronization

**Change Data Capture (CDC):**
- **Debezium:** Open-source CDC platform. Captures row-level changes from PostgreSQL, MySQL, MongoDB, SQL Server, Oracle. Publishes to Kafka. The standard tool for database decomposition during migration.
- **AWS Database Migration Service (DMS):** Managed CDC service. Supports continuous replication from source database to target.
- **Maxwell:** Lightweight CDC for MySQL. Reads binlog and publishes to Kafka, Kinesis, or other targets.

**Dual-write coordination:**
- **Outbox pattern:** Write domain events to an "outbox" table in the same transaction as the business data. A separate process (Debezium, polling publisher) reads the outbox and publishes to the message broker. Guarantees at-least-once delivery without dual-write inconsistency.
- **Transactional outbox with Debezium:** Combines the outbox pattern with CDC. Debezium reads the outbox table and publishes events. The application only writes to one database — no dual writes.

### Saga orchestration

- **Temporal:** Open-source workflow engine. Model sagas as workflows with explicit compensation steps. Handles retries, timeouts, and failure recovery. Growing adoption for microservices orchestration.
- **AWS Step Functions:** Managed workflow orchestration. Model sagas as state machines. Integrates with Lambda, ECS, and other AWS services.
- **Camunda:** Open-source workflow engine with BPMN modeling. Supports saga orchestration with visual workflow definition.
- **Axon Framework (Java):** Event-driven microservices framework with built-in saga support. Integrates with Axon Server for event routing.

### Observability (prerequisite, not optional)

- **OpenTelemetry:** Vendor-neutral standard for distributed tracing, metrics, and logs. Instrument services once, export to any backend.
- **Jaeger / Zipkin:** Open-source distributed tracing backends. Visualize request flows across services.
- **Grafana + Prometheus + Loki:** Metrics (Prometheus), dashboards (Grafana), and logs (Loki). The open-source observability stack.
- **Datadog / New Relic / Honeycomb:** Commercial observability platforms with distributed tracing, APM, and log aggregation.

### Contract testing

- **Pact:** Consumer-driven contract testing. The consumer defines expected API behavior; the provider verifies it. Prevents breaking changes across service boundaries.
- **Spring Cloud Contract:** Contract testing for Spring Boot services. Defines contracts as Groovy or YAML DSL; generates test stubs automatically.
- **Spectral:** OpenAPI linting. Enforces API design standards across services.

---

## Decision Tree

```
Is there measurable pain caused by the monolith architecture?
│
├── No measurable pain
│   └── STOP. Do not migrate. "It could be better" is not a reason.
│       A working monolith is a valuable asset, not a liability.
│
└── Yes, there is measurable pain
    │
    ├── Is the pain organizational (teams blocking each other)?
    │   ├── Have you tried a modular monolith?
    │   │   ├── No  → Try modular monolith first. Enforce boundaries with
    │   │   │         ArchUnit/Packwerk/Spring Modulith. Revisit in 6 months.
    │   │   └── Yes, and teams are still blocked
    │   │       └── How many developers share the codebase?
    │   │           ├── < 20  → Modular monolith should suffice. Revisit
    │   │           │           boundary definitions; the boundaries may be wrong.
    │   │           ├── 20-50 → Selectively extract the 1-3 highest-friction
    │   │           │           modules. Keep the rest as modular monolith.
    │   │           └── > 50  → Incremental extraction via Strangler Fig.
    │   │                       Start with highest-value, lowest-difficulty module.
    │   │
    │   └── Is the pain technical (scaling, performance)?
    │       ├── Does one component need dramatically more resources?
    │       │   ├── Yes → Extract ONLY that component. Keep the rest monolithic.
    │       │   └── No  → Investigate scaling the monolith (horizontal scaling,
    │       │             caching, read replicas) before decomposing.
    │       │
    │       └── Is the pain deployment-related?
    │           ├── Deploys are slow because of test suite → Fix the test suite,
    │           │   not the architecture. Parallel testing, test selection,
    │           │   contract tests.
    │           ├── Deploys are slow because of build time → Modular build
    │           │   (Nx, Bazel, Gradle module cache). Not a reason for services.
    │           └── Deploys are risky because of coupling → Modular monolith
    │               with enforced boundaries. Extract only if coupling persists
    │               after modularization.
    │
    └── Is the pain regulatory/compliance?
        └── Extract ONLY the regulated component to an isolated service.
            Keep everything else monolithic.

DEFAULT POSITION: Do not migrate. The burden of proof is on migration,
not on staying monolithic.
```

---

## Implementation Sketch

### Strangler Fig with API Gateway (Kong/Nginx)

```nginx
# nginx.conf — Strangler Fig routing
# Phase 1: Route notifications to new service, everything else to monolith

upstream monolith {
    server monolith.internal:8080;
}

upstream notifications_service {
    server notifications.internal:8081;
}

server {
    listen 80;

    # Extracted capability: notifications
    location /api/notifications/ {
        proxy_pass http://notifications_service;
        proxy_set_header X-Request-ID $request_id;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Everything else: still the monolith
    location / {
        proxy_pass http://monolith;
        proxy_set_header X-Request-ID $request_id;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Anti-corruption layer in the monolith

```java
// Inside the monolith: ACL that delegates to the new service
// Replaces the old in-process NotificationService

@Service
public class NotificationServiceProxy implements NotificationService {

    private final WebClient webClient;
    private final CircuitBreaker circuitBreaker;

    @Override
    public void sendNotification(NotificationRequest request) {
        // Transform monolith's domain model to new service's API contract
        NewServiceNotificationDTO dto = NewServiceNotificationDTO.builder()
            .recipientId(request.getUserId().toString())
            .channel(mapChannel(request.getType()))
            .templateId(mapTemplate(request.getTemplateName()))
            .variables(request.getTemplateVariables())
            .build();

        circuitBreaker.run(() ->
            webClient.post()
                .uri("/api/notifications/send")
                .bodyValue(dto)
                .retrieve()
                .toBodilessEntity()
                .block(Duration.ofSeconds(5))
        , throwable -> {
            // Fallback: log and optionally fall back to monolith's implementation
            log.warn("Notification service unavailable, falling back", throwable);
            fallbackNotificationService.sendNotification(request);
            return null;
        });
    }
}
```

### Database decomposition with Debezium CDC

```yaml
# docker-compose.yml — Debezium CDC pipeline
# Captures changes from monolith's notifications tables
# Publishes to Kafka for the new notifications service to consume

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092

  debezium:
    image: debezium/connect:2.4
    depends_on: [kafka]
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: monolith-cdc
      CONFIG_STORAGE_TOPIC: cdc-configs
      OFFSET_STORAGE_TOPIC: cdc-offsets
      STATUS_STORAGE_TOPIC: cdc-status

  # Register the connector after Debezium starts:
  # curl -X POST http://debezium:8083/connectors -H "Content-Type: application/json" -d @connector.json
```

```json
// connector.json — Debezium connector for monolith's notifications tables
{
  "name": "monolith-notifications-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "monolith-db",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${CDC_DB_PASSWORD}",
    "database.dbname": "monolith",
    "schema.include.list": "notifications",
    "table.include.list": "notifications.templates,notifications.delivery_log",
    "topic.prefix": "monolith",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_notifications",
    "transforms": "route",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "monolith.notifications.(.*)",
    "transforms.route.replacement": "notifications.$1"
  }
}
```

### Saga pattern for cross-service operations

```java
// Order creation saga — orchestrated approach using Temporal
// Replaces what was a single ACID transaction in the monolith

@WorkflowInterface
public interface CreateOrderSaga {
    @WorkflowMethod
    OrderResult createOrder(CreateOrderCommand command);
}

@WorkflowImpl(taskQueues = "order-saga")
public class CreateOrderSagaImpl implements CreateOrderSaga {

    private final PaymentActivities payment = Workflow.newActivityStub(
        PaymentActivities.class,
        ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofSeconds(30))
            .setRetryOptions(RetryOptions.newBuilder()
                .setMaximumAttempts(3)
                .build())
            .build()
    );

    private final InventoryActivities inventory = Workflow.newActivityStub(
        InventoryActivities.class,
        ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofSeconds(30))
            .build()
    );

    @Override
    public OrderResult createOrder(CreateOrderCommand command) {
        // Step 1: Reserve inventory
        ReservationResult reservation;
        try {
            reservation = inventory.reserveStock(command.getItems());
        } catch (Exception e) {
            return OrderResult.failed("Inventory reservation failed: " + e.getMessage());
        }

        // Step 2: Charge payment
        PaymentResult paymentResult;
        try {
            paymentResult = payment.chargePayment(command.getPaymentDetails());
        } catch (Exception e) {
            // COMPENSATE: Release inventory reservation
            inventory.releaseReservation(reservation.getReservationId());
            return OrderResult.failed("Payment failed: " + e.getMessage());
        }

        // Step 3: Confirm order
        try {
            return OrderResult.success(command.getOrderId(), reservation, paymentResult);
        } catch (Exception e) {
            // COMPENSATE: Refund payment and release inventory
            payment.refundPayment(paymentResult.getTransactionId());
            inventory.releaseReservation(reservation.getReservationId());
            return OrderResult.failed("Order confirmation failed: " + e.getMessage());
        }
    }
}
```

### Canary deployment with Istio traffic splitting

```yaml
# istio-virtual-service.yaml
# Gradually shift traffic from monolith to new notifications service

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: notifications-routing
spec:
  hosts:
    - notifications.internal
  http:
    - match:
        - uri:
            prefix: /api/notifications
      route:
        # Phase 1: 95% monolith, 5% new service
        - destination:
            host: monolith
            port:
              number: 8080
          weight: 95
        - destination:
            host: notifications-service
            port:
              number: 8081
          weight: 5
      # Automatic rollback: if new service error rate > 1%, route all to monolith
      retries:
        attempts: 2
        perTryTimeout: 3s
---
# After validating Phase 1 metrics, update weights:
# Phase 2: weight 75/25
# Phase 3: weight 50/50
# Phase 4: weight 0/100 (full migration)
```

### Feature parity validation

```python
# parallel_run_validator.py
# Run both monolith and new service, compare outputs
# Used during migration to validate feature parity before shifting traffic

import asyncio
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ComparisonResult:
    request_id: str
    timestamp: datetime
    monolith_status: int
    service_status: int
    bodies_match: bool
    monolith_latency_ms: float
    service_latency_ms: float
    divergence_details: str | None = None

async def parallel_run(request, monolith_client, service_client) -> ComparisonResult:
    """Send same request to both monolith and new service, compare results."""

    monolith_task = asyncio.create_task(monolith_client.send(request))
    service_task = asyncio.create_task(service_client.send(request))

    monolith_resp, service_resp = await asyncio.gather(
        monolith_task, service_task, return_exceptions=True
    )

    # Always return monolith response to the caller (source of truth)
    # Log comparison for analysis

    monolith_body = normalize_json(monolith_resp.body)
    service_body = normalize_json(service_resp.body)

    bodies_match = monolith_body == service_body

    result = ComparisonResult(
        request_id=request.id,
        timestamp=datetime.utcnow(),
        monolith_status=monolith_resp.status,
        service_status=service_resp.status,
        bodies_match=bodies_match,
        monolith_latency_ms=monolith_resp.latency_ms,
        service_latency_ms=service_resp.latency_ms,
        divergence_details=diff(monolith_body, service_body) if not bodies_match else None,
    )

    # Emit metrics for monitoring dashboard
    metrics.increment("parallel_run.total")
    if not bodies_match:
        metrics.increment("parallel_run.divergence")
        logger.warning(f"Response divergence: {result.divergence_details}")

    return result


def normalize_json(body: bytes) -> str:
    """Normalize JSON for comparison (sort keys, remove volatile fields)."""
    data = json.loads(body)
    # Remove fields that are expected to differ (timestamps, request IDs)
    for field in ["timestamp", "request_id", "trace_id"]:
        data.pop(field, None)
    return json.dumps(data, sort_keys=True)
```

---

## Cross-References

- **monolith:** The starting architecture. Most monoliths should be improved, not replaced. See `architecture/patterns/monolith.md`.
- **modular-monolith:** The recommended intermediate step. Try this before microservices. See `architecture/patterns/modular-monolith.md`.
- **microservices:** The target architecture — but only for the components that genuinely need it. See `architecture/patterns/microservices.md`.
- **domain-driven-design:** Bounded contexts define extraction candidates. Event Storming discovers domain boundaries. See `architecture/foundations/domain-driven-design.md`.
- **saga-pattern:** Replaces ACID transactions that spanned what are now separate services. Essential for maintaining data consistency after decomposition.
- **event-driven:** Asynchronous communication between services reduces coupling and enables eventual consistency. See `architecture/patterns/event-driven.md`.
- **coupling-and-cohesion:** The theoretical foundation for why decomposition boundaries matter. High cohesion within services, low coupling between them. See `architecture/foundations/coupling-and-cohesion.md`.
- **cqrs-event-sourcing:** Useful for services that need to build read models from events published by other services. See `architecture/patterns/cqrs-event-sourcing.md`.

---

*Researched: 2026-03-08 | Sources: [Sam Newman — Monolith to Microservices (O'Reilly)](https://samnewman.io/books/monolith-to-microservices/) | [Sam Newman — Monolith Decomposition Patterns](https://samnewman.io/talks/monolith-decomposition-patterns/) | [Sam Newman — Decomposing a Monolith Does Not Require Microservices (InfoQ)](https://www.infoq.com/news/2020/05/monolith-decomposition-newman/) | [Segment — Goodbye Microservices: From 100s of Problem Children to 1 Superstar](https://segment.com/blog/goodbye-microservices/) | [InfoQ — Why Segment Went Back to a Monolith](https://www.infoq.com/news/2020/04/microservices-back-again/) | [Amazon Prime Video Microservices to Monolith Case Study](https://newsletter.systemdesign.one/p/prime-video-microservices) | [Adrian Cockcroft — What is there to learn from the Prime Video story](https://adrianco.medium.com/so-many-bad-takes-what-is-there-to-learn-from-the-prime-video-microservices-to-monolith-story-4bd0970423d4) | [AWS — Strangler Fig Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html) | [Microsoft Azure — Strangler Fig Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig) | [Chris Richardson — Strangler Fig Application Pattern](https://microservices.io/patterns/refactoring/strangler-application.html) | [Confluent — Strangler Fig Pattern](https://developer.confluent.io/patterns/compositional-patterns/strangler-fig/) | [Agoda Engineering — Breaking Down Monolith](https://medium.com/agoda-engineering/leading-with-clients-our-journey-to-microservices-from-a-graphql-monolith-252b8baa69af) | [DEV Community — From Monolith to Modular Monolith to Microservices](https://dev.to/sepehr/from-monolith-to-modular-monolith-to-microservices-realistic-migration-patterns-36f2) | [Java Code Geeks — Microservices vs. Modular Monoliths in 2025](https://www.javacodegeeks.com/2025/12/microservices-vs-modular-monoliths-in-2025-when-each-approach-wins.html) | [TechTarget — 4 Microservices Antipatterns That Ruin Migration](https://www.techtarget.com/searchapparchitecture/tip/4-deadly-microservices-antipatterns-that-ruin-migration) | [Gremlin — Is Your Microservice a Distributed Monolith?](https://www.gremlin.com/blog/is-your-microservice-a-distributed-monolith) | [CircleCI — Monolith to Microservices Migration Strategies](https://circleci.com/blog/monolith-to-microservices-migration-strategies/) | [Google Cloud — Refactor a Monolith into Microservices](https://cloud.google.com/architecture/microservices-architecture-refactoring-monoliths) | [AWS — Decomposing Monoliths into Microservices](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-decomposing-monoliths/welcome.html)*