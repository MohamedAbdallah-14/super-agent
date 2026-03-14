# Microservices Anti-Patterns

> Microservices promise independent deployability, team autonomy, and targeted scaling. In practice, most organizations recreate the monolith's problems in distributed form -- adding network unreliability, operational overhead, and debugging nightmares on top. These anti-patterns are drawn from post-mortems at Uber, DoorDash, Twitter/X, Knight Capital, and dozens of production incidents documented in public engineering blogs.

> **Domain:** Backend
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: Distributed Monolith

**Also known as:** Monolith in Disguise, Coupled Microservices, Synchronized Deployment Cluster
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Services are split into separate repositories and deployed independently in theory, but in practice every release requires coordinated deployment of multiple services. A change in Service A cannot ship without matching changes in Services B and C.

```
# Deployment runbook for "independent" microservices
1. Deploy user-service v2.3.1
2. Deploy order-service v1.8.0  (MUST follow user-service within 5 min)
3. Deploy payment-service v3.1.2 (MUST follow order-service)
4. Deploy notification-service v2.0.1 (MUST follow payment-service)
# If any step fails, roll back ALL four services
```

**Why developers do it:**

Teams lift-and-shift a monolith by splitting along code module boundaries rather than business domain boundaries. Shared data models, synchronous call chains, and direct database access between services create invisible coupling that only surfaces at deploy time.

**What goes wrong:**

A 2024 industry survey found that 85% of enterprises claim microservices adoption, yet many end up with a distributed monolith -- all the operational overhead of microservices with none of the independence benefits. Twitter/X experienced this when Elon Musk's team attempted to shut down "microservices bloatware," discovering that less than 20% of services were independently functional. Shutting down the rest cascaded into outages affecting tweeting, liking, and direct messaging. Teams spend more time on cross-service coordination than feature work, and deployment windows grow rather than shrink.

**The fix:**

Redesign service boundaries around business capabilities using Domain-Driven Design bounded contexts. Each service owns its data, exposes a versioned API, and can be deployed without coordinating with other services. Apply the "can I deploy this service on a Friday afternoon without telling anyone?" test.

**Detection rule:**

Flag any deployment that requires more than one service to be released within the same time window. Track inter-service deployment coupling ratio: deploys requiring coordination / total deploys.

---

### AP-02: Nano-Services

**Also known as:** Function-as-a-Service Abuse, Over-Decomposition, Microservice Sprawl
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Every small function or CRUD operation gets its own service, deployment pipeline, repository, and infrastructure. A user signup flow touches 12 services for what is fundamentally one business transaction.

```
user-validation-service/
user-creation-service/
email-format-checker-service/
password-hash-service/
welcome-email-service/
user-preferences-default-service/
audit-log-write-service/
# Each with its own Dockerfile, CI pipeline, Kubernetes deployment, and on-call rotation
```

**Why developers do it:**

Enthusiasm for microservices leads to decomposing along technical function boundaries rather than business boundaries. "Micro" is misinterpreted as "as small as possible." Each new feature becomes a new service because creating one feels productive.

**What goes wrong:**

Uber scaled to over 4,000 microservices, creating what engineers internally called the "Death Star" -- a dependency graph so tangled that deploying a new service became difficult and tracing an API call was nearly impossible. They began consolidating back into "macroservices." The operational cost per service (CI/CD, monitoring, on-call, dependency upgrades, security patching) exceeded the development cost of the actual business logic. Spotify found that every microservice relied on a minimum of 10-15 other microservices for a single customer request.

**The fix:**

Apply the "two-pizza team" rule: a service should be owned by one team and represent a cohesive business capability. If a service has fewer than 500 lines of business logic, it is probably a library, not a service. Periodically review the service catalog and merge nano-services that always change together.

**Detection rule:**

Flag services with fewer than 3 API endpoints OR fewer than 500 lines of domain logic. Alert when total service count exceeds 10x the number of backend engineers.

---

### AP-03: Shared Database

**Also known as:** Data Monolith, Common Database, Integration Database
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

Multiple microservices read from and write to the same database tables. Schema changes require coordinating across all consuming services.

```sql
-- orders_db used by: order-service, billing-service, shipping-service, analytics-service
-- All four services have direct SELECT/INSERT/UPDATE on the `orders` table
ALTER TABLE orders ADD COLUMN fulfillment_status VARCHAR(20);
-- Requires synchronized deployment of all four services
```

**Why developers do it:**

Sharing a database is the path of least resistance when extracting services from a monolith. Developers avoid the complexity of data synchronization, event-driven communication, and eventual consistency by keeping the "easy" joins and transactions.

**What goes wrong:**

The shared database becomes a single point of failure -- if it goes down, every service relying on it fails simultaneously. Schema changes become high-risk coordinated events. A real-world Hacker News discussion documents how teams discovered that their "microservices" were coupled through 47 shared tables, making independent deployment impossible. Lock contention between services writing to the same tables causes cascading latency spikes during peak traffic. One team's unoptimized query can starve every other service of database connections.

**The fix:**

Each service owns its database (database-per-service pattern). Services expose data through APIs, not shared tables. Use event-driven synchronization (Change Data Capture, domain events) for cross-service data needs. Accept eventual consistency where possible; use the Saga pattern for distributed transactions.

**Detection rule:**

Flag any database with connections from more than one service. Monitor for cross-service table access by tracking database user/role per connection.

---

### AP-04: Synchronous Call Chains

**Also known as:** Temporal Coupling, REST Chain, Synchronous Death Spiral
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Service A synchronously calls B, which synchronously calls C, which calls D. The entire chain blocks until D responds. Overall latency is the sum of all hops. Failure at any point fails the entire request.

```
Client -> API Gateway -> Order Service -> Inventory Service -> Warehouse Service -> Shipping Service
         (waits)         (waits)          (waits)              (waits)
         Total latency = sum of all four service latencies + network overhead
         Availability = 0.99 * 0.99 * 0.99 * 0.99 = 0.96 (not 0.99)
```

**Why developers do it:**

Synchronous HTTP/REST is familiar, easy to debug locally, and mirrors the request-response model developers learned first. Async messaging feels complex and introduces new failure modes that developers have not encountered before.

**What goes wrong:**

DoorDash documented a major cascading outage triggered by database maintenance that increased latency on one downstream service. The latency bubbled up through synchronous call chains, causing thread exhaustion and connection pool saturation across upstream services. The error rates then triggered a misconfigured circuit breaker, which halted traffic between unrelated services, amplifying a minor database latency issue into a platform-wide outage. Microsoft's architecture guidance warns that if most internal microservice interaction relies on synchronous HTTP calls, partial failures are amplified into global failures.

**The fix:**

Use asynchronous messaging (events, message queues) for operations that do not require an immediate response. Where synchronous calls are necessary, set aggressive timeouts, implement bulkheads (separate thread pools per dependency), and never chain more than two synchronous hops.

**Detection rule:**

Trace request paths and flag any chain exceeding 3 synchronous hops. Alert when p99 latency of a service exceeds 2x the sum of its direct dependency p99 latencies.

---

### AP-05: Missing Circuit Breakers

**Also known as:** Unbounded Failure, Missing Bulkheads, No Fail-Fast
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

Services make calls to dependencies without any failure isolation. When a dependency slows down or fails, the calling service exhausts its thread pool waiting for responses and becomes unresponsive itself.

```java
// No circuit breaker, no timeout, no fallback
public OrderResponse createOrder(OrderRequest request) {
    InventoryResponse inventory = inventoryClient.checkStock(request.getItems()); // blocks forever
    PaymentResponse payment = paymentClient.charge(request.getPayment());         // blocks forever
    ShippingResponse shipping = shippingClient.schedule(request.getAddress());    // blocks forever
    return new OrderResponse(inventory, payment, shipping);
}
```

**Why developers do it:**

Circuit breakers add code complexity and require defining fallback behaviors, timeout thresholds, and error budgets. In the "happy path" development mindset, failures feel like edge cases that can be handled later. The defaults in most HTTP clients are generous timeouts or no timeouts at all.

**What goes wrong:**

Netflix built Hystrix specifically because missing circuit breakers caused cascading failures across their streaming infrastructure. The DoorDash outage saw a misconfigured circuit breaker (thresholds set too aggressively) stop traffic between unrelated services. Without circuit breakers, a single slow dependency can consume all threads in the calling service, making it unresponsive to all requests -- not just those involving the slow dependency. This is the "bulkhead failure" pattern: one leaking compartment sinks the entire ship.

**The fix:**

Implement circuit breakers on every external call (Resilience4j, Polly, or built-in service mesh policies). Define fallback responses for degraded operation. Use bulkhead patterns to isolate thread pools per dependency so a slow Inventory Service cannot exhaust threads needed for Payment processing.

```java
@CircuitBreaker(name = "inventory", fallbackMethod = "inventoryFallback")
@Retry(name = "inventory")
@TimeLimiter(name = "inventory")
public CompletableFuture<InventoryResponse> checkStock(List<Item> items) {
    return CompletableFuture.supplyAsync(() -> inventoryClient.checkStock(items));
}
```

**Detection rule:**

Audit all outbound HTTP/gRPC calls for circuit breaker configuration. Flag any service-to-service call without a timeout shorter than 5 seconds and a circuit breaker with defined thresholds.

---

### AP-06: Service Mesh Explosion

**Also known as:** Infrastructure Complexity Creep, Sidecar Tax, Mesh Overhead
**Frequency:** Moderate
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Teams adopt a service mesh (Istio, Linkerd) for simple traffic routing but end up running a complex distributed system just to manage the other distributed system. Every pod gets a sidecar proxy, adding CPU/memory overhead and a new failure domain.

**Why developers do it:**

Service meshes promise observability, mTLS, traffic splitting, and retries "for free." The initial demo looks magical. Teams adopt the full mesh before they have the operational maturity to manage it, or before they even need most of its features.

**What goes wrong:**

Platform teams found themselves operating "yet another distributed system," with sidecar injection into every pod and configuration drift across hundreds of mesh policies becoming a full-time job. The resource overhead is non-trivial: each Envoy sidecar consumes 50-100MB of memory, multiplied across hundreds of pods. Debugging becomes harder because every network call now passes through an additional proxy layer. Istio's CNCF graduation in 2025 acknowledged that running a mesh "was hard, sidecars added resource overhead, operational complexity ballooned, and for many, service mesh became an idea that looked better in theory than in practice."

**The fix:**

Start without a mesh. Use application-level libraries for retries and circuit breakers. Adopt a mesh only when you have 50+ services AND a dedicated platform team AND concrete requirements (mTLS everywhere, fine-grained traffic control) that cannot be met with simpler tools. Consider ambient mesh (sidecar-less) architectures.

**Detection rule:**

Track mesh resource overhead as a percentage of total cluster resources. Alert if sidecar CPU/memory exceeds 15% of workload resource consumption. Monitor mesh configuration object count and flag drift between environments.

---

### AP-07: Ignoring Eventual Consistency

**Also known as:** Distributed ACID Assumption, Stale Read Blindness, Consistency Denial
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Developers write code assuming that data written by Service A is immediately visible to Service B, treating a distributed system like a single-database application. No compensation logic exists for stale or conflicting reads.

```python
# Order service writes order
order_service.create_order(order_id=123, status="CONFIRMED")

# Analytics service reads immediately -- assumes order is visible
analytics = analytics_service.get_order(order_id=123)
# Returns None or stale data because replication has not propagated yet
assert analytics is not None  # FAILS intermittently in production
```

**Why developers do it:**

ACID transactions in a single database are familiar and reliable. Developers trained on relational databases expect read-after-write consistency everywhere. The system works in local testing (single machine, no replication lag) and only fails under production load and replication delays.

**What goes wrong:**

CQRS implementations where transaction events are persisted in a write datastore and replicated to a read datastore cause users to see stale data when querying recently written records -- leading to support tickets, double-submissions, and data corruption when users retry operations they believe failed. An online travel platform experienced booking inconsistencies when the flight reservation service updated its local state but the hotel booking service read stale availability data, resulting in confirmed bookings for unavailable rooms.

**The fix:**

Design for eventual consistency from the start. Use read-your-own-writes patterns where the writing service can serve reads for recently written data. Implement idempotency keys so duplicate submissions are safe. Show appropriate UI states ("Your order is being processed") rather than assuming instant consistency.

**Detection rule:**

Flag any cross-service read that occurs within 500ms of a related write without a consistency guarantee. Audit for missing idempotency keys on state-changing operations.

---

### AP-08: No Saga Pattern

**Also known as:** Distributed Transaction Neglect, Missing Compensation Logic, Two-Phase Commit Everywhere
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Multi-service business transactions have no coordinated rollback mechanism. When step 3 of a 5-step process fails, steps 1 and 2 leave permanent side effects (charges, reservations, notifications) with no compensation.

```
1. Order Service: Create order      [SUCCESS]
2. Payment Service: Charge card     [SUCCESS - $150 charged]
3. Inventory Service: Reserve stock  [FAILURE - out of stock]
-- Customer is charged $150 for an order that cannot be fulfilled
-- No automated refund, no order cancellation
-- Manual intervention required
```

**Why developers do it:**

Distributed transactions (two-phase commit) are complex and perform poorly across services. Teams avoid the Saga pattern because it requires defining compensating actions for every step and handling partial failure states -- significant design effort that feels like over-engineering for "rare" failures.

**What goes wrong:**

Without sagas, partial failures create data inconsistencies that require manual intervention. A service must atomically update its database and publish a message/event, but without the Saga pattern, this atomicity is not guaranteed. Teams discover that "rare" failures happen daily at scale. Compensating transactions are harder to retrofit than to design upfront, because the system accumulates inconsistent states that resist automated cleanup. The lack of isolation in sagas (the "I" in ACID) means concurrent saga executions can create data anomalies if not carefully designed with semantic locks or countermeasures.

**The fix:**

Implement choreography-based sagas for simple workflows (events trigger compensating actions) or orchestration-based sagas for complex workflows (a coordinator manages the sequence). Every step must have a defined compensating action. Use idempotent operations and unique saga IDs for traceability.

**Detection rule:**

Identify multi-service write operations that lack compensating transactions. Flag any business flow spanning 3+ services without a saga coordinator or event-driven compensation chain.

---

### AP-09: Chatty Services

**Also known as:** N+1 Service Calls, Fine-Grained APIs, Network Tax
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

A single user-facing request triggers dozens or hundreds of inter-service calls, often in loops that fetch individual records one at a time.

```python
# Rendering a user dashboard
def get_dashboard(user_id):
    user = user_service.get_user(user_id)                    # Call 1
    orders = order_service.get_orders(user_id)               # Call 2
    for order in orders:                                      # N orders = N calls
        order.items = catalog_service.get_items(order.id)    # Call 3..N+2
        for item in order.items:                              # M items per order
            item.review = review_service.get_review(item.id) # Call N+3..N*M+2
    recommendations = rec_service.get_recs(user_id)          # Call N*M+3
    # Total: potentially hundreds of network round-trips for one page load
```

**Why developers do it:**

Each service exposes simple, RESTful CRUD endpoints following textbook API design. Developers compose these fine-grained APIs from the calling service without realizing the network multiplication. The pattern works fast in development (localhost, zero latency) and only degrades under real network conditions.

**What goes wrong:**

Each inter-service call adds 1-10ms of network latency. With 100 calls, a single page load takes 1-2 seconds just in network overhead -- before any actual processing. Under load, connection pools saturate, and the calling service becomes a bottleneck. Spotify discovered that each microservice depended on 10-15 others for a single customer request, creating fragile chains where any single dependency slowdown degraded the user experience.

**The fix:**

Design coarse-grained APIs that return aggregated data for specific use cases (Backend for Frontend pattern). Use batch endpoints instead of individual record fetches. Consider GraphQL or composite APIs that resolve multiple data needs in a single round-trip. Cache frequently accessed cross-service data.

**Detection rule:**

Trace fan-out per incoming request. Alert when a single user-facing request triggers more than 10 inter-service calls. Monitor the ratio of internal to external API calls.

---

### AP-10: Shared Libraries Coupling

**Also known as:** Library Lock-Step, Common Library Hell, Diamond Dependency
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

A shared library (e.g., `company-commons`, `platform-core`) is used by every service for models, utilities, and cross-cutting concerns. Updating the library requires updating and redeploying every consuming service simultaneously.

```xml
<!-- 47 microservices all depend on: -->
<dependency>
    <groupId>com.company</groupId>
    <artifactId>platform-commons</artifactId>
    <version>3.8.1</version> <!-- Changing this version requires redeploying all 47 services -->
</dependency>
```

**Why developers do it:**

Shared libraries reduce duplication and enforce consistency for logging, authentication, and data models. Extracting common code into a library follows the DRY principle -- seemingly a best practice.

**What goes wrong:**

The shared library becomes a coupling vector that defeats independent deployability. A security patch in `platform-commons` requires redeploying all 47 services. Version conflicts arise when different services need different versions, creating diamond dependency problems. Teams discovered that their microservices were coupled through shared libraries containing data transfer objects that encoded business logic, making it impossible to evolve one service's domain model without breaking others.

**The fix:**

Keep shared libraries thin: logging, tracing, and HTTP client configuration only. Never put domain models or business logic in shared libraries. Use API contracts (protobuf, OpenAPI) instead of shared DTOs. Allow services to independently version their dependencies. If two services need the same business logic, that logic might belong in a dedicated service.

**Detection rule:**

Flag shared libraries that contain domain model classes or business logic methods. Alert when a library update requires more than 3 services to redeploy simultaneously.

---

### AP-11: No Observability

**Also known as:** Blind Microservices, Missing Telemetry, Debug-by-Prayer
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

Services are deployed without structured logging, distributed tracing, or meaningful metrics. When something fails, engineers SSH into individual containers and grep through unstructured log files, unable to trace a request across service boundaries.

**Why developers do it:**

Observability is treated as a "nice-to-have" that can be added later. Teams focus on features and deploy services before establishing logging standards, trace propagation, or alerting. In a monolith, a single stack trace tells the whole story; developers do not realize this breaks down in distributed systems.

**What goes wrong:**

After Twitter/X shut down a majority of its microservices in cost-cutting efforts, subsequent outages were extremely difficult to diagnose because the observability infrastructure was also degraded. Engineers could not trace which remaining services were failing or why. A 2024 New Relic Observability Forecast found that the median time to detect outages without proper observability was 5x longer than with it, and the mean time to resolution increased by 3x. Without distributed tracing, debugging a latency spike across 20 services becomes a multi-day investigation.

**The fix:**

Implement the three pillars from day one: structured logs (JSON with service name, trace ID, span ID), distributed tracing (OpenTelemetry), and RED metrics (Rate, Errors, Duration) for every service. Make observability a prerequisite for production deployment, not an afterthought.

**Detection rule:**

Block deployment of any service lacking: (1) structured log output with trace ID propagation, (2) health check endpoint, (3) RED metrics exported to the monitoring system, (4) at least one alert configured for error rate threshold.

---

### AP-12: No API Gateway

**Also known as:** Direct Client-to-Service, Missing Edge Layer, Exposed Internals
**Frequency:** Moderate
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Clients (web, mobile) call individual microservices directly, each with its own authentication, rate limiting, and URL. The client must know the network location and API contract of every backend service.

```javascript
// Mobile app making direct calls to internal services
const user = await fetch('https://user-service.internal:8080/users/123');
const orders = await fetch('https://order-service.internal:8081/orders?user=123');
const recs = await fetch('https://rec-service.internal:8082/recommendations/123');
// Client knows about 3 internal services, their ports, and their APIs
```

**Why developers do it:**

An API gateway feels like unnecessary indirection for a small number of services. Direct calls are simpler to implement and debug initially. Teams plan to "add a gateway later" once the architecture stabilizes.

**What goes wrong:**

Without a gateway, every service must independently implement authentication, rate limiting, CORS headers, and request validation -- leading to inconsistent security policies. Internal service topology leaks to clients, making it impossible to restructure backend services without breaking every client. Mobile apps with hardcoded service URLs require app store releases to change routing. AWS architecture guidance specifically warns that without an API gateway, managing cross-cutting concerns across dozens of services becomes unsustainable.

**The fix:**

Deploy an API gateway (Kong, AWS API Gateway, Envoy) as the single entry point. Implement authentication, rate limiting, and request routing at the gateway. Use the Backend for Frontend pattern to create client-specific API compositions. Internal services are never exposed directly to clients.

**Detection rule:**

Scan network policies and load balancer configurations for any microservice directly accessible from outside the cluster. Flag services with public-facing ports that are not the designated API gateway.

---

### AP-13: Service Discovery Failures

**Also known as:** Hardcoded Endpoints, Stale DNS, Registry Blindness
**Frequency:** Moderate
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Services use hardcoded IP addresses or hostnames to reach dependencies. When instances scale up/down or relocate, calls fail because the caller does not know about the new addresses.

```yaml
# application.yml - hardcoded service locations
payment-service:
  url: http://10.0.1.45:8080  # What happens when this instance is replaced?
inventory-service:
  url: http://10.0.1.46:8081  # This IP was valid 3 months ago
```

**Why developers do it:**

Hardcoded endpoints work in development and staging environments with fixed infrastructure. Service discovery adds complexity (Consul, Eureka, Kubernetes DNS) and a new failure domain. It feels over-engineered for "just a few services."

**What goes wrong:**

Cloud instances are ephemeral -- IPs change on every deployment, scaling event, or failover. Hardcoded endpoints cause silent failures when the target instance is replaced. Even with service discovery, misconfigured health checks can cause the registry to route traffic to unhealthy instances or deregister healthy ones during temporary network blips. Twitter/X experienced configuration change propagation issues in 2023 where an engineer's change "escalated to other services," causing a multi-hour outage -- a service discovery and configuration propagation failure.

**The fix:**

Use platform-native service discovery (Kubernetes DNS/Services, Consul, AWS Cloud Map). Never hardcode IPs or hostnames in application configuration. Implement health checks that accurately reflect service readiness (not just liveness). Use client-side load balancing with circuit breakers for resilience against discovery lag.

**Detection rule:**

Grep configuration files and environment variables for hardcoded IP addresses (regex: `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`). Flag any service configuration that does not use DNS-based or registry-based service resolution.

---

### AP-14: Configuration Drift

**Also known as:** Snowflake Services, Environment Mismatch, Config Sprawl
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Each service manages its own configuration independently. Over time, timeout values, retry policies, feature flags, and resource limits diverge across environments and services with no central visibility.

```
# Production configs across 30 services:
order-service:    timeout=30s, retries=3, pool_size=50
payment-service:  timeout=60s, retries=5, pool_size=20   # Why different?
user-service:     timeout=10s, retries=1, pool_size=100   # Who set this?
shipping-service: timeout=30s, retries=3, pool_size=50    # Matches order, coincidence?
# Staging has completely different values for all of these
```

**Why developers do it:**

Each team configures their service based on local knowledge and immediate needs. Without a centralized configuration strategy, defaults are copied from Stack Overflow or inherited from whichever template was used to scaffold the service. Nobody owns the cross-cutting concern of configuration consistency.

**What goes wrong:**

Inconsistent timeout configurations between caller and callee create subtle failure modes: if Service A's timeout (30s) exceeds Service B's own processing timeout (10s), Service A waits for responses that Service B has already abandoned. Configuration drift between staging and production means bugs are not caught in pre-production testing. Istio platform teams reported that managing configuration drift across hundreds of mesh policies became a full-time job, with misconfigured policies causing unexpected traffic routing and dropped requests.

**The fix:**

Use a centralized configuration service (Consul KV, Spring Cloud Config, AWS Parameter Store). Define organization-wide defaults for timeouts, retries, and pool sizes. Implement configuration-as-code with version control and automated drift detection. Treat configuration changes like code changes: review, test, deploy progressively.

**Detection rule:**

Diff configuration values across all services and environments weekly. Alert on timeout mismatches between calling and called services. Flag any configuration value that differs between staging and production without an explicit override justification.

---

### AP-15: Missing Correlation IDs

**Also known as:** Untraceable Requests, Lost Context, Orphaned Logs
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Requests pass through multiple services without a shared identifier. Each service logs independently, making it impossible to reconstruct the full journey of a single user request.

```
# Order service logs
2026-03-08 10:23:45 INFO  Creating order for user 789
2026-03-08 10:23:45 ERROR Payment failed

# Payment service logs
2026-03-08 10:23:45 ERROR Card declined for amount $150
2026-03-08 10:23:45 ERROR Connection timeout to fraud service

# Fraud service logs
2026-03-08 10:23:44 WARN  High latency on ML model inference
# Which of these log lines are related? No way to tell.
```

**Why developers do it:**

Correlation IDs require every service to extract an ID from incoming requests and propagate it to all outbound calls and log statements. This is a cross-cutting concern that is easy to forget when each team builds their service independently. It works fine in a monolith where a single thread ID correlates all log lines.

**What goes wrong:**

Without correlation IDs, diagnosing production issues across 20+ services becomes a manual timestamp-correlation exercise that takes hours instead of minutes. AWS distributed monitoring guidance specifically recommends correlation IDs as essential for microservices debugging. Teams waste engineering hours per incident manually piecing together log lines. When regulatory audits require tracing a specific user's data flow through the system, missing correlation IDs make compliance impossible.

**The fix:**

Generate a correlation ID (UUID) at the system edge (API gateway) and propagate it through all service calls via headers (e.g., `X-Correlation-Id` or W3C `traceparent`). Use OpenTelemetry for automatic context propagation. Include the correlation ID in every log line, metric tag, and error report.

```python
# Middleware that propagates correlation ID
def correlation_middleware(request, call_next):
    correlation_id = request.headers.get('X-Correlation-Id', str(uuid4()))
    context.set('correlation_id', correlation_id)
    response = call_next(request)
    response.headers['X-Correlation-Id'] = correlation_id
    return response
```

**Detection rule:**

Sample 100 requests per hour and verify that the correlation ID appears in logs from every service in the call chain. Alert when any service log line is missing a correlation ID field.

---

### AP-16: Breaking API Contracts

**Also known as:** Unversioned APIs, Silent Contract Changes, Consumer-Blind Evolution
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

A service changes its API (removes a field, renames an endpoint, changes a type) without versioning and without notifying or testing against consumers. Existing clients break in production.

```json
// v1 response (what consumers expect)
{ "user_id": 123, "name": "Alice", "email": "alice@example.com" }

// v2 response (deployed without notice)
{ "id": 123, "full_name": "Alice", "email_address": "alice@example.com" }
// Every consumer parsing "user_id", "name", or "email" breaks silently
```

**Why developers do it:**

Teams own their service and feel they can change its API freely. Without contract testing in CI/CD, breaking changes are not detected until production. The producer team tests their service in isolation, confirming it works with the new schema, without testing against actual consumers.

**What goes wrong:**

A single incompatible API change can block the integration environment and the path to production for all dependent services. The most insidious failures are silent: a renamed field returns `null` instead of throwing an error, causing downstream logic to silently use default values. Consumer-driven contract testing (Pact) was invented specifically because teams at REA Group found that integration-time API breakages were their most common production incident category.

**The fix:**

Implement consumer-driven contract testing (Pact, Spring Cloud Contract) in CI/CD. Use semantic versioning for APIs. Follow additive-only evolution: new fields are optional, old fields are deprecated but never removed without a migration window. Run two API versions in production simultaneously during transitions.

**Detection rule:**

Run contract tests on every PR that modifies API response schemas. Flag any field removal or type change in OpenAPI/protobuf definitions. Alert when a service deploys an API version that has no registered consumers.

---

### AP-17: Coordinated Releases

**Also known as:** Big-Bang Deployment, Release Train, Synchronized Rollout
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

Despite having separate services, releases are batched into a weekly or biweekly "release train" where all changed services are deployed together. A failure in any service's deployment blocks the entire train.

**Why developers do it:**

Coordinated releases feel safer -- everything is tested together before going live. They match the release cadence of the monolith the team migrated from. Integration testing is only done against the full release bundle, not individual services.

**What goes wrong:**

Knight Capital lost $460 million in 45 minutes on August 1, 2012, due in part to a big-bang deployment failure. Engineers manually deployed new trading code (SMARS) across 8 servers but missed one server, leaving deprecated "Power Peg" code active. The staggered inconsistency between servers caused the system to execute erroneous trades at a rate that hemorrhaged $10 million per minute. There were no automated deployment pipelines, no peer review of deployments, and no canary process. The aggressive delivery schedule demanded a synchronized big-bang release rather than a phased rollout. Knight Capital was acquired four months later. Coordinated releases also mean that one team's delay blocks every other team, destroying the independent deployment advantage of microservices.

**The fix:**

Deploy services independently with backward-compatible APIs. Use feature flags to decouple deployment from release. Implement canary deployments and progressive rollouts (1% -> 10% -> 50% -> 100%). Each service has its own deployment pipeline triggered by its own CI. If a service cannot be deployed independently, it is coupled (see AP-01).

**Detection rule:**

Track the percentage of deployments that are solo vs. batched. Alert when more than 20% of deployments in a sprint involve coordinated multi-service releases. Flag any deployment runbook that mentions another service by name.

---

### AP-18: Microservices for Small Teams

**Also known as:** Premature Decomposition, Resume-Driven Architecture, Complexity Before Scale
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

A team of 3-5 engineers builds 15+ microservices for an application with hundreds of users. Each engineer is on-call for 5+ services. More time is spent on infrastructure, deployment pipelines, and inter-service debugging than on building features.

**Why developers do it:**

Microservices are perceived as the "modern" way to build software. Job postings and conference talks glorify microservices architectures. Teams adopt them for career development (resume-driven development) or because they anticipate scale that may never arrive. One documented case saw a CTO spend nine months building a microservices architecture for an application with forty-seven users.

**What goes wrong:**

The operational cost per service is constant regardless of team size: each service needs CI/CD, monitoring, alerting, dependency management, security updates, and on-call coverage. A 4-person team running 15 services spends 70%+ of their time on operational overhead. GitHub's core application remains largely a Ruby on Rails monolith serving millions of developers daily. Basecamp, Shopify (core), and many successful products run on modular monoliths. Early-stage startups have failed because premature decomposition created more PM-engineering coordination overhead than technical gain.

**The fix:**

Start with a modular monolith. Define clear module boundaries that can become service boundaries later. Decompose into microservices only when: (1) you have multiple teams needing independent deployment, (2) modules have genuinely different scaling requirements, (3) you have the operational maturity to run distributed systems. Apply Martin Fowler's "monolith first" strategy.

**Detection rule:**

Flag when the ratio of services to engineers exceeds 3:1. Alert when more than 40% of sprint velocity is consumed by infrastructure and operational tasks rather than feature development.

---

### AP-19: Not Handling Partial Failures

**Also known as:** All-or-Nothing Thinking, Missing Graceful Degradation, Brittle Composition
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

When any dependency is unavailable, the entire request fails. The system has no concept of degraded operation -- it is either fully functional or fully broken.

```python
def get_product_page(product_id):
    product = product_service.get(product_id)         # Required
    reviews = review_service.get(product_id)           # Nice-to-have
    recommendations = rec_service.get(product_id)      # Nice-to-have
    seller_info = seller_service.get(product.seller)   # Nice-to-have
    # If review-service is down, the ENTIRE product page returns 500
    # Even though we could show the product without reviews
    return render(product, reviews, recommendations, seller_info)
```

**Why developers do it:**

Composing responses from multiple services is implemented as a sequential pipeline where any failure aborts the entire operation. Defining which dependencies are "required" vs. "optional" requires product decisions that engineers defer. Exception handling defaults to "fail and propagate" rather than "degrade and continue."

**What goes wrong:**

Microsoft's microservices architecture guidance warns that in large applications, partial failures are amplified when most internal interaction relies on synchronous HTTP calls. A minor update to one service can unintentionally break the entire user experience. An online travel platform experienced complete booking page failures when the car rental recommendation service went down, even though users were booking flights -- the page composition treated all data sources as required. Blocking threads waiting for unresponsive services consumes resources until the application runtime runs out of threads and becomes globally unresponsive.

**The fix:**

Classify each dependency as critical (request fails without it) or optional (degrade gracefully without it). Use `CompletableFuture` / `Promise.allSettled` patterns to fetch optional data in parallel with timeouts. Return partial responses with explicit indicators of what data is missing. Implement fallback responses (cached data, empty states, default values) for optional dependencies.

```python
def get_product_page(product_id):
    product = product_service.get(product_id)  # Required - fail if unavailable
    reviews = safe_call(review_service.get, product_id, default=[])
    recommendations = safe_call(rec_service.get, product_id, default=[])
    seller_info = safe_call(seller_service.get, product.seller, default=None)
    return render(product, reviews, recommendations, seller_info)
```

**Detection rule:**

Trace error propagation paths: flag any service that returns 5xx when an optional dependency is unavailable. Audit response handlers for missing try/catch blocks around non-critical service calls.

---

### AP-20: Event Sourcing Misuse

**Also known as:** Event Store Abuse, Premature Event Sourcing, CQRS Everywhere
**Frequency:** Moderate
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Event sourcing is adopted for every service in the system, including simple CRUD services that do not benefit from an event log. The event store becomes the primary query interface, requiring complex projections for basic lookups.

```python
# Simple user profile CRUD -- does NOT need event sourcing
class UserProfileEvents:
    UserCreated = {"user_id": 1, "name": "Alice", "email": "alice@example.com"}
    NameChanged = {"user_id": 1, "old": "Alice", "new": "Alicia"}
    EmailChanged = {"user_id": 1, "old": "alice@example.com", "new": "alicia@example.com"}
    AvatarUpdated = {"user_id": 1, "url": "/avatars/1.png"}
    # To get current user state: replay ALL events for user 1
    # 50,000 events later... just to show a profile page
```

**Why developers do it:**

Event sourcing is intellectually appealing -- a complete audit trail, ability to replay and reconstruct any past state, natural fit for event-driven architectures. Conference talks showcase event sourcing in domains like financial trading where it is genuinely valuable, and teams generalize it to every domain.

**What goes wrong:**

The event store becomes difficult to query -- reconstructing current state requires replaying events, which is complex and inefficient for typical read-heavy workloads. Applications must handle eventually consistent data, and the learning curve is steep. Teams that adopt event sourcing without understanding its trade-offs end up with systems where simple queries (get user by ID) require rebuilding state from thousands of events, read models fall out of sync with write models, and debugging involves traversing event chains rather than inspecting rows. Schema evolution for events is significantly harder than for database tables -- events are immutable, so a badly designed event schema persists forever.

**The fix:**

Use event sourcing only for domains that genuinely benefit: financial transactions, audit-critical workflows, collaborative editing, or systems requiring temporal queries. For standard CRUD services, use a regular database with change data capture if you need an event stream. Do not conflate event-driven architecture (good for decoupling) with event sourcing (specific persistence pattern).

**Detection rule:**

Flag services using event sourcing where the read-to-write ratio exceeds 100:1 and no temporal queries are performed. Audit for event stores used as primary query interfaces without materialized views.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns Triggered | Prevalence |
|---|---|---|
| Monolith mindset applied to distributed system | AP-01, AP-03, AP-04, AP-07, AP-17 | Very High |
| Missing operational maturity | AP-05, AP-06, AP-11, AP-14, AP-15 | High |
| Premature decomposition / hype-driven architecture | AP-02, AP-18, AP-20 | High |
| DRY principle misapplied across service boundaries | AP-03, AP-10, AP-16 | High |
| Feature-first delivery without resilience design | AP-05, AP-08, AP-19 | High |
| Synchronous-first communication default | AP-04, AP-09, AP-17 | High |
| Lacking domain-driven design expertise | AP-01, AP-02, AP-03 | High |
| No contract testing in CI/CD | AP-16, AP-17 | Moderate |
| Inadequate team-to-service ratio | AP-02, AP-06, AP-18 | Moderate |
| Cargo-culting enterprise architecture | AP-06, AP-12, AP-20 | Moderate |

## Self-Check Questions

Use these questions during architecture reviews and design sessions to catch anti-patterns before they reach production:

1. **Can every service be deployed independently on a Friday afternoon without notifying any other team?** If not, you have a distributed monolith (AP-01) or coordinated releases (AP-17).

2. **Does each service own its data exclusively, with no other service reading from or writing to its database?** If not, you have a shared database (AP-03).

3. **What happens to the user experience when any single non-critical service is completely unavailable for 5 minutes?** If the answer is "everything breaks," you lack partial failure handling (AP-19) and circuit breakers (AP-05).

4. **Can you trace a single user request from entry to completion across all services it touches, using one identifier?** If not, you are missing correlation IDs (AP-15) and observability (AP-11).

5. **If a multi-step business transaction fails at step 3 of 5, are steps 1 and 2 automatically compensated?** If not, you need sagas (AP-08).

6. **Is your team-to-service ratio at most 1:3?** If each engineer owns more than 3 services, you may have nano-services (AP-02) or premature decomposition (AP-18).

7. **Does a single user-facing API call trigger fewer than 10 internal service calls?** If not, you have chatty services (AP-09).

8. **Can you update a shared library without redeploying more than one service?** If not, you have shared library coupling (AP-10).

9. **Do all services have consistent timeout, retry, and circuit breaker configurations, managed from a central source?** If not, you have configuration drift (AP-14).

10. **Is every API change tested against consumer contracts before deployment?** If not, you risk breaking contracts (AP-16).

11. **Could you explain to a new engineer why each service exists as a separate service and not a module?** If the answer is "that is how it was set up," you may have accidental complexity (AP-02, AP-18).

12. **Does your service mesh or infrastructure layer consume less than 15% of cluster resources?** If not, you may have service mesh explosion (AP-06).

13. **Are events in your event-sourced services genuinely needed for temporal queries or audit, or are they just a persistence mechanism?** If the latter, you have event sourcing misuse (AP-20).

14. **When was the last time you merged two services that always changed together?** If never, you may not be managing nano-services (AP-02).

15. **Do your staging and production environments have identical service configurations (timeouts, feature flags, pool sizes)?** If not, you have configuration drift (AP-14).

## Code Smell Quick Reference

| Smell | Likely Anti-Pattern | Severity | First Check |
|---|---|---|---|
| Deployment requires multi-service coordination | AP-01: Distributed Monolith | Critical | Deployment runbooks and release notes |
| Service has < 3 endpoints or < 500 LOC | AP-02: Nano-Services | High | Service catalog and code metrics |
| Multiple services share database tables | AP-03: Shared Database | Critical | Database connection audits |
| Request chain exceeds 3 synchronous hops | AP-04: Synchronous Chains | Critical | Distributed traces |
| No timeout or fallback on outbound calls | AP-05: Missing Circuit Breakers | Critical | Code review for HTTP client configuration |
| Sidecar proxy uses > 15% of pod resources | AP-06: Service Mesh Explosion | High | Kubernetes resource metrics |
| Cross-service read immediately after write | AP-07: Eventual Consistency Ignored | High | Code review and integration tests |
| Multi-service write with no compensation logic | AP-08: No Saga Pattern | High | Transaction flow diagrams |
| Single request triggers > 10 internal calls | AP-09: Chatty Services | High | Distributed trace fan-out metrics |
| Shared library contains domain model classes | AP-10: Shared Libraries Coupling | High | Dependency tree analysis |
| Cannot trace request across service boundaries | AP-11: No Observability | Critical | Log and trace sampling |
| Client directly calls internal service endpoints | AP-12: No API Gateway | High | Network policy and load balancer config |
| Hardcoded IPs in service configuration | AP-13: Service Discovery Failures | High | Configuration file grep |
| Timeout values differ between caller and callee | AP-14: Configuration Drift | High | Cross-service config diff |
| Log lines missing correlation/trace ID | AP-15: Missing Correlation IDs | High | Log sampling audit |
| API field removed without deprecation period | AP-16: Breaking Contracts | Critical | OpenAPI/protobuf diff in CI |
| Release notes mention "deploy X before Y" | AP-17: Coordinated Releases | Critical | Release process audit |
| Service-to-engineer ratio exceeds 3:1 | AP-18: Microservices for Small Teams | High | Service catalog vs. org chart |
| 500 error when optional dependency is down | AP-19: Partial Failure Unhandled | Critical | Chaos engineering / dependency kill tests |
| Event replay needed for simple lookups | AP-20: Event Sourcing Misuse | High | Query pattern analysis |

---

*Researched: 2026-03-08 | Sources: DoorDash Engineering Blog (Aperture/failure mitigation), Netflix Hystrix (GitHub/resilience patterns), Uber Engineering (microservices scaling/Death Star architecture), Twitter/X engineering (microservices shutdown and outages), Knight Capital post-mortem (Henricodolfing, Honeybadger), Microsoft .NET microservices guidance, AWS microservices whitepapers, Chris Richardson microservices.io, Martin Fowler (monolith-first), Spotify engineering (dependency chains), New Relic 2024 Observability Forecast, CNCF Istio graduation analysis, Pact contract testing, vFunction anti-patterns survey, ArXiv microservices anti-patterns taxonomy (Taibi et al.), Hacker News shared database discussions*