# Circuit Breaker and Bulkhead — Architecture Expertise Module

> Circuit Breaker prevents cascading failures by stopping calls to a failing service. Bulkhead isolates failures to prevent one slow service from consuming all resources. Together, they are the primary defense against cascade failures in distributed systems — the most dangerous failure mode in microservices.

> **Category:** Distributed
> **Complexity:** Moderate
> **Applies when:** Any system making calls to external services, databases, or other microservices — especially when a downstream failure could cascade upstream

---

## What This Is (and What It Isn't)

### Circuit Breaker

A circuit breaker is a **state machine that sits between a caller and a callee**, monitoring call outcomes and automatically stopping calls when the callee is failing. The name comes from electrical circuit breakers — when too much current flows (too many failures occur), the breaker trips (opens) to prevent damage (cascading failure). When the situation resolves, the breaker resets (closes) to allow current (calls) to flow again.

The pattern was popularized by Michael Nygard in *Release It!* (2007) and brought into mainstream adoption by Netflix's Hystrix library starting in 2011. Netflix's engineering team built Hystrix after experiencing repeated cascade failures where a single degraded backend service would cause the entire Netflix streaming platform to become unresponsive. By 2015, Netflix was executing tens of billions of thread-isolated and hundreds of billions of semaphore-isolated calls through Hystrix every day.

A circuit breaker operates in **three states**:

| State | Behavior | Transitions to |
|---|---|---|
| **Closed** | All calls pass through. Failures are counted in a sliding window. Normal operation. | Open (when failure threshold is exceeded) |
| **Open** | All calls are immediately rejected without attempting the downstream call. Returns a fallback or error instantly. | Half-Open (after a configured timeout period) |
| **Half-Open** | A limited number of probe calls are allowed through. The breaker is testing whether the downstream service has recovered. | Closed (if probes succeed) or Open (if probes fail) |

The closed-to-open transition is governed by a **sliding window** that tracks recent call outcomes. The window can be count-based (e.g., the last 100 calls) or time-based (e.g., calls in the last 60 seconds). When the failure rate within the window exceeds a configured threshold (e.g., 50%), the circuit opens.

### Bulkhead

A bulkhead isolates **resource pools** so that a failure in one downstream dependency cannot exhaust resources needed by other dependencies. The name comes from the watertight compartments in a ship's hull — if one compartment floods, the bulkheads prevent water from spreading to other compartments, keeping the ship afloat.

In software, the "water" is threads, connections, memory, or other finite resources. Without bulkheads, a single slow downstream service can consume every thread in your application's thread pool, causing all other endpoints — even those not related to the slow service — to become unresponsive. This is the **thread pool exhaustion** problem, and it is one of the most common causes of total system failure in microservice architectures.

Bulkheads come in two primary forms:

| Isolation type | Mechanism | Overhead | Use case |
|---|---|---|---|
| **Thread pool isolation** | Each dependency gets its own thread pool with a fixed maximum size | Higher (thread context switching, memory for thread stacks) | Long-running or unpredictable calls; need for timeout enforcement |
| **Semaphore isolation** | Each dependency gets a semaphore with a fixed permit count; calls execute on the caller's thread | Lower (no thread switching overhead) | Fast, predictable calls where timeout enforcement is handled elsewhere |

### What These Patterns Are NOT

- **Not retry logic.** A circuit breaker is the **opposite** of retry. Retry says "try again." Circuit breaker says "stop trying — the service is down, and hammering it will only make things worse." The two patterns are complementary: retry handles transient glitches (a single dropped packet), while circuit breaker handles sustained failures (a service that is down and needs time to recover).

- **Not a load balancer.** A circuit breaker does not distribute traffic. It controls whether traffic should flow at all. Load balancers and circuit breakers operate at different layers — a load balancer chooses which instance to send a request to, while a circuit breaker decides whether to send the request at all.

- **Not a timeout.** Timeouts limit how long you wait for a single call. Circuit breakers track patterns of failure across many calls. A timeout fires after one slow call. A circuit breaker fires after a pattern of failures (which may include timeouts).

- **Not rate limiting.** Rate limiting controls the volume of outgoing requests to protect a downstream service from overload. Bulkheads limit concurrency to protect the **caller** from resource exhaustion. Rate limiting is about being a good neighbor; bulkheads are about self-preservation.

- **Not a substitute for fixing the root cause.** Circuit breakers and bulkheads are **damage containment** mechanisms. They buy you time. If your downstream service fails repeatedly, the circuit breaker keeps your system alive while you fix the actual problem. A system that runs permanently in open-circuit mode is a system with an unresolved outage.

---

## When to Use It

### Calling external APIs or third-party services

Any call to a service you do not control — payment gateways (Stripe, PayPal), identity providers (Auth0, Okta), notification services (Twilio, SendGrid), or data providers — should be wrapped in a circuit breaker. You cannot fix their outages, and you cannot predict when they will fail. A circuit breaker lets your system degrade gracefully when an external dependency goes down.

**Example:** An e-commerce platform calling a payment gateway. When the gateway goes down, the circuit breaker opens and the system immediately shows "payment temporarily unavailable" instead of hanging for 30 seconds per request, consuming threads, and eventually taking down the product catalog page because the thread pool is exhausted.

### Inter-service calls in microservice architectures

Every synchronous call between microservices should have a circuit breaker. This is not optional. In a system with 50 microservices and complex dependency graphs, a single failing service without circuit breakers will cascade through every upstream caller within minutes.

**Netflix's origin story (2011):** Netflix's API gateway made calls to dozens of backend services for each user request — recommendations, watch history, personalization, billing status. When one backend service (e.g., the bookmark service tracking playback position) became slow, the API gateway's thread pool filled up with threads waiting for the slow service. This meant the API gateway could not serve any requests at all — not even requests that had nothing to do with bookmarks. The entire Netflix UI would go blank. Hystrix was built specifically to solve this problem by combining circuit breakers with thread pool isolation (bulkheads).

### Database connection pooling

Database connections are finite and expensive resources. When a database becomes slow (due to lock contention, disk I/O saturation, or a long-running query), connection pools fill up with connections waiting for responses. A circuit breaker on database access prevents your application from exhausting its connection pool and becoming entirely unresponsive.

### High-throughput systems where a retry storm could cause total failure

In systems handling thousands of requests per second, retrying failed calls without a circuit breaker creates a **retry storm**: each failing request spawns 3-5 retries, multiplying load by 3-5x on an already-failing downstream service. This prevents recovery and can cascade upstream.

**AWS October 2025 outage:** A DNS resolution failure affecting the DynamoDB endpoint in US-EAST-1 caused millions of EC2 instances and Lambda functions to simultaneously retry failed connections. When DNS resolution was briefly restored, the retry storm overwhelmed the DynamoDB control plane, causing DNS to fail again. This oscillation cycle turned a 10-minute DNS issue into a multi-hour outage affecting 113 AWS services and disrupting Venmo, Zoom, and thousands of other applications across 60+ countries.

### Systems with strict latency requirements

When your SLA requires 200ms response times but a downstream service occasionally takes 30 seconds, a circuit breaker can fail fast (return an error or fallback in <1ms) instead of waiting. This is especially critical for user-facing services where a hanging request translates to a frustrated user.

---

## When NOT to Use It

**This section is deliberately comprehensive because misconfigured circuit breakers cause their own class of outages — and applying the pattern where it is not needed adds complexity without benefit.**

### Single-process monolith with in-memory calls

If your "services" are classes or modules within the same process communicating via function calls, there is nothing to circuit-break. In-memory function calls do not fail due to network issues, do not have latency variance, and do not exhaust thread pools. Adding circuit breakers to in-process calls is cargo-cult resilience engineering.

**Exception:** If a module within your monolith makes calls to an external system (database, API), a circuit breaker on that external boundary is appropriate. The circuit breaker goes on the boundary, not on internal calls.

### When the downstream service must be reached no matter what

Some calls are non-negotiable. A regulatory reporting system that must submit compliance data to a government endpoint cannot "fail open" with a cached response. A financial ledger that must record every transaction cannot skip writes. In these cases, you need **queuing with guaranteed delivery** (e.g., a persistent message queue with at-least-once semantics), not circuit breaking.

Circuit breakers are about **graceful degradation** — accepting that some functionality is temporarily unavailable. If your business requirements do not allow that functionality to be unavailable under any circumstances, circuit breakers are the wrong tool.

### When you only have 1-2 downstream dependencies

Circuit breakers and bulkheads add operational complexity: configuration parameters to tune, monitoring dashboards to build, alerts to set up, and failure modes to test. For a system with one database and one external API, the overhead of a full circuit breaker framework may exceed the benefit. A simple timeout with retry and exponential backoff may suffice.

**Rule of thumb:** If you can enumerate all your downstream dependencies on one hand and your team can reason about their failure modes without tooling, start with timeouts and retries. Add circuit breakers when you feel the pain.

### When circuit breaker thresholds are misconfigured — worse than no circuit breaker

A circuit breaker with a failure threshold of 2 calls and a sliding window of 5 calls will open after two failures in five requests. In a system processing 10,000 requests per second, two failures is statistical noise — a 0.02% error rate. A premature circuit opening on a healthy service causes a **self-inflicted outage**: your circuit breaker just took down a perfectly functional dependency.

Misconfigured circuit breakers are a category of production incident all on their own. If you cannot commit to tuning and monitoring your circuit breaker configuration, you may be better off without one.

### Fire-and-forget asynchronous messaging

If services communicate exclusively via message queues (Kafka, RabbitMQ, SQS), circuit breakers on the consumer side are usually unnecessary. The queue itself acts as a buffer — when the consumer is slow, messages accumulate in the queue rather than exhausting the producer's resources. The queue is the bulkhead.

**Exception:** If a service produces messages by making a synchronous call to a message broker, and the broker itself can become unresponsive, a circuit breaker on the broker connection is still valuable.

### Over-engineering simple CRUD applications

A CRUD API that reads from and writes to a single database, serving 100 requests per minute, does not need Resilience4j, a circuit breaker dashboard, and a bulkhead configuration. The operational cost of maintaining that infrastructure exceeds the cost of an occasional database timeout. Use connection pool limits (which your database driver already provides) and move on.

---

## How It Works

### Circuit breaker: the state machine in detail

**Closed state (normal operation):**

Every call passes through to the downstream service. The circuit breaker records the outcome (success, failure, timeout, or slow call) in a **sliding window**. The window can be:

- **Count-based:** Tracks the last N calls (e.g., last 100 calls). Simple to reason about. Best when call volume is steady.
- **Time-based:** Tracks all calls in the last N seconds (e.g., last 60 seconds). Adapts to varying call volumes. Better for bursty traffic.

A **minimum number of calls** threshold prevents premature evaluation. If the window size is 100 but only 3 calls have been made, the failure rate is not meaningful. Most implementations require a minimum (e.g., 10 calls) before the failure rate is evaluated.

**Transition to open (the "trip"):**

When the failure rate within the sliding window exceeds a configured threshold (e.g., 50%), the circuit opens. Some implementations also track **slow call rate** — if 80% of calls are succeeding but taking 10 seconds instead of 100ms, the service is effectively failing. Resilience4j supports both `failureRateThreshold` and `slowCallRateThreshold`.

**Open state (fail fast):**

All calls are immediately rejected without touching the downstream service. The circuit breaker returns:

- A **fallback response** (cached data, default value, degraded experience)
- A **specific exception** that callers can handle (e.g., `CircuitBreakerOpenException`)

This state has a configured **timeout** (e.g., 60 seconds). When the timeout expires, the circuit transitions to half-open.

**Half-open state (probing for recovery):**

A limited number of calls (e.g., 5-10) are allowed through to test whether the downstream service has recovered.

- If the permitted calls succeed: the circuit **closes** and normal operation resumes.
- If the permitted calls fail: the circuit **re-opens** and the timeout resets.

This probing mechanism prevents a thundering herd: instead of all callers simultaneously hitting a recovering service, only a few probe requests test the waters.

### Bulkhead: resource isolation strategies

**Thread pool isolation:**

```
Service A ──┐
             ├── Thread Pool 1 (max 20 threads) ──── Payment Service
             │
             ├── Thread Pool 2 (max 10 threads) ──── Inventory Service
             │
             └── Thread Pool 3 (max 15 threads) ──── Notification Service
```

Each downstream dependency gets a dedicated thread pool. When the payment service becomes slow and all 20 threads are occupied waiting for responses, the inventory and notification thread pools are completely unaffected. The maximum blast radius of a payment service failure is 20 blocked threads — not total thread pool exhaustion.

Netflix's Hystrix used this approach as its default isolation strategy. The tradeoff is the overhead of thread context switching and the memory cost of maintaining multiple thread pools (each thread stack typically consumes 512KB-1MB).

**Semaphore isolation:**

Instead of dedicated threads, a semaphore limits the number of concurrent in-flight requests to each dependency. When all permits are taken, additional calls are immediately rejected.

- **Advantage:** No thread switching overhead. Calls execute on the caller's thread.
- **Disadvantage:** Cannot enforce timeouts (since there is no separate thread to interrupt). The call will block the caller's thread until it completes or the underlying socket times out.
- **Best for:** In-memory or very fast calls where latency is predictable and you only need concurrency limiting.

**Connection pool limits (passive bulkhead):**

Database drivers and HTTP client libraries typically support connection pool sizing. Setting `maxConnections=20` on a database pool is a form of bulkhead — it prevents one database from consuming unlimited connections. This is the simplest and most commonly used form of bulkhead, and many teams use it without recognizing it as a pattern.

### Combining circuit breaker with retry

The correct composition is **retry inside circuit breaker**:

```
Request
  └── Circuit Breaker (checks state first)
        └── Retry (attempts the call N times with backoff)
              └── Timeout (limits each individual attempt)
                    └── Actual downstream call
```

**Why this order matters:**

- The circuit breaker checks its state **before** any retry attempt. If the circuit is open, no retries are attempted — the call fails immediately with a fallback.
- Each retry attempt is counted by the circuit breaker. If retries consistently fail, the circuit breaker will eventually trip, stopping all future calls (including retries) until the downstream service recovers.
- If the order is reversed (circuit breaker inside retry), the retry logic will keep attempting even when the circuit is open, defeating the entire purpose of the circuit breaker.

**Retry configuration alongside circuit breaker:**

| Parameter | Typical value | Rationale |
|---|---|---|
| Max retry attempts | 2-3 | More retries amplify load on a failing service |
| Backoff strategy | Exponential with jitter | Prevents synchronized retries across instances |
| Retry on | Transient errors only (5xx, timeouts) | Never retry 4xx (client errors) or business logic failures |
| Circuit breaker failure threshold | 50% | Open circuit when half of calls fail |
| Circuit breaker sliding window | 100 calls or 60 seconds | Enough data for statistical significance |
| Half-open permitted calls | 5-10 | Small enough to not overwhelm a recovering service |

### Fallback strategies

When the circuit is open, what do you return? The answer depends on the use case:

| Strategy | Example | When to use |
|---|---|---|
| **Cached response** | Return the last known product price from a local cache | Data that is valuable even if slightly stale |
| **Default value** | Return an empty recommendation list | Feature that enhances but is not essential to the core experience |
| **Graceful degradation** | Show a generic product image instead of personalized images | Functionality that can be simplified without breaking the user flow |
| **Queue for later** | Write the event to a local queue for processing when the service recovers | Operations that must eventually succeed but can be delayed |
| **Honest error** | Show "Payment service temporarily unavailable, please try again in a few minutes" | Operations where no reasonable fallback exists |
| **Failover to alternate** | Route payment to a secondary payment processor | Critical operations with redundant providers |

Netflix exemplified graceful degradation: when the recommendation service was down, they showed a generic "trending now" list instead of personalized recommendations. The user experience was slightly worse, but the platform remained fully functional.

---

## Trade-Offs Matrix

| Dimension | Without circuit breaker/bulkhead | With circuit breaker/bulkhead |
|---|---|---|
| **Cascade failure risk** | A single slow dependency can take down the entire system | Failures are isolated; other functionality continues |
| **Recovery time** | Retry storms prevent recovery; outages last hours | Downstream service gets breathing room to recover |
| **Latency during failures** | Requests hang until timeout (5-30 seconds) | Fail-fast returns in <1ms when circuit is open |
| **Resource utilization during failures** | Thread pools, connection pools, memory exhausted | Resources are preserved for healthy dependencies |
| **Configuration complexity** | None | Significant — thresholds, windows, timeouts, fallbacks must be tuned per dependency |
| **Testing complexity** | Standard integration tests | Must test all three circuit states, fallback behavior, and recovery transitions |
| **Monitoring requirements** | Basic error rates | Circuit state dashboards, half-open probe success rates, bulkhead utilization metrics |
| **False positive risk** | None | Misconfigured thresholds can open circuits on healthy services |
| **Operational overhead** | Low | Moderate — alerting on circuit state changes, tuning thresholds based on observed behavior |
| **Debugging complexity** | Straightforward — request hits service, service fails | Additional layer to reason about — "was the service actually down or did the circuit open prematurely?" |
| **Cold start behavior** | N/A | Circuit breaker has no data in sliding window; first few failures can prematurely trip the circuit if minimum call threshold is too low |
| **Memory overhead** | Baseline | Sliding window storage, per-dependency thread pools, metrics collection |

---

## Evolution Path

### Stage 1: Timeouts and connection pool limits (start here)

Before adding circuit breakers, ensure every outgoing call has a **timeout** and every connection pool has a **maximum size**. This is the minimum viable resilience and catches 80% of cascade failure scenarios.

```
HTTP client timeout: 5 seconds
Database connection pool: max 20 connections
Database query timeout: 10 seconds
```

Most frameworks provide these out of the box. If you skip this step and jump to circuit breakers, you are building a penthouse on a foundation of sand.

### Stage 2: Circuit breakers on critical external dependencies

Add circuit breakers to calls that cross a **trust boundary** — external APIs, third-party services, and any dependency where you cannot control uptime. Start with the dependency that has the worst reliability track record.

Configuration at this stage should be conservative:

- High failure threshold (60-70%) to avoid false positives
- Large sliding window (200+ calls) for statistical significance
- Long half-open timeout (60-120 seconds) to give the service time to recover
- Simple fallback (error response with retry-after header)

### Stage 3: Bulkheads for resource isolation

When you observe that a single slow dependency can starve resources from other dependencies (thread pool exhaustion, connection pool exhaustion), add bulkheads. Start with semaphore isolation (lower overhead) and graduate to thread pool isolation for dependencies with unpredictable latency.

### Stage 4: Circuit breakers on all inter-service calls

In a mature microservice architecture, every synchronous inter-service call should have a circuit breaker. At this stage, invest in:

- A circuit breaker dashboard showing the state of every circuit in real-time
- Alerts on circuit state transitions (closed-to-open is a P2 alert; circuit staying open for >10 minutes is a P1)
- Runbooks for each circuit explaining what the fallback is and how to manually force-close the circuit

### Stage 5: Service mesh circuit breaking (infrastructure-level)

Move circuit breaking from application code to the service mesh (Istio/Envoy). This provides circuit breaking as infrastructure, applied uniformly to all services without code changes.

Istio implements circuit breaking through `DestinationRule` resources with two mechanisms:

- **Connection pool settings:** `maxConnections`, `http1MaxPendingRequests`, `http2MaxRequests` — limits the number of connections and pending requests to a service.
- **Outlier detection:** Tracks 5xx error rates per upstream host and ejects unhealthy hosts from the load balancing pool for a configurable duration.

**Tradeoff:** Service mesh circuit breaking operates at the connection/request level and cannot implement application-level fallbacks. Most mature systems use both: service mesh for connection-level protection and application-level circuit breakers for business-logic fallbacks.

---

## Failure Modes

### Failure Mode 1: Premature circuit opening (false positive)

**What happens:** The circuit breaker opens even though the downstream service is healthy. A small burst of timeouts (caused by a momentary network blip or GC pause) triggers the threshold because the sliding window is too small or the failure threshold is too low.

**Real-world pattern:** A circuit breaker with `slidingWindowSize=10` and `failureRateThreshold=50%` will open after 5 failures in 10 calls. In a system handling 1,000 req/s, 10 calls represent 10 milliseconds of traffic. A 10ms network hiccup causes the circuit to open, rejecting all subsequent requests to a perfectly healthy service. The team spends 30 minutes investigating a "downstream outage" that never existed.

**Prevention:**
- Set `minimumNumberOfCalls` high enough for statistical significance (minimum 20, preferably 50-100)
- Use time-based sliding windows for high-throughput services (60+ seconds)
- Monitor circuit state changes and correlate with actual downstream error rates

### Failure Mode 2: Circuit never closing (stuck open)

**What happens:** The circuit opens legitimately, the downstream service recovers, but the circuit never closes because the half-open probe calls keep failing. This happens when:

- The half-open probe sends a request type that is different from normal traffic (e.g., a health check that hits a different code path)
- The downstream service recovers for normal load but fails under the specific probe pattern
- The half-open timeout is too short, causing probes before the service has fully recovered

**Prevention:**
- Ensure half-open probes exercise the same code path as normal calls
- Use a generous `waitDurationInOpenState` (60-120 seconds minimum)
- Provide a manual circuit close mechanism for operators

### Failure Mode 3: Bulkhead too small (false resource exhaustion)

**What happens:** The bulkhead's maximum concurrency is set too low for normal traffic. Under normal load, the semaphore or thread pool is fully utilized, causing legitimate requests to be rejected. The bulkhead is "protecting" the system from its own traffic.

**Real-world pattern:** A team configures a thread pool of 5 threads for calls to the recommendation service. Under normal traffic, 8-10 concurrent calls are typical. 3-5 requests per second are rejected even though the recommendation service is perfectly healthy and responding in <50ms. The team sees a constant stream of "bulkhead full" errors and either increases the pool to 1,000 (defeating the purpose) or removes the bulkhead entirely.

**Prevention:**
- Measure actual concurrency under normal and peak load before configuring bulkhead sizes
- Set bulkhead limits to 150-200% of observed peak concurrency (enough headroom for normal variance, but still protective against true resource exhaustion)
- Alert on bulkhead rejection rates above 1% — this indicates either misconfiguration or genuine downstream slowness

### Failure Mode 4: Missing fallbacks

**What happens:** The circuit breaker opens, and the application throws a `CircuitBreakerOpenException` that propagates up the stack as a 500 Internal Server Error. The user sees a generic error page instead of a graceful degradation. The circuit breaker prevented cascade failure at the infrastructure level but failed at the user experience level.

**Prevention:**
- Every circuit breaker must have an explicit fallback strategy (even if the fallback is a well-formatted error message with a retry-after header)
- Test fallback behavior as part of chaos engineering exercises
- Fallbacks should be monitored separately — a system running on fallbacks for hours may be technically "up" but functionally degraded

### Failure Mode 5: Retry storm amplifying through open circuits

**What happens:** Service A calls Service B, which calls Service C. Service C goes down. Service B's circuit breaker opens. Service A retries its call to Service B. Service B responds immediately (circuit is open), but Service A interprets the circuit breaker error as a transient failure and retries. With 3 retries and 10 instances of Service A, Service B now handles 30x its normal request volume — all of which are immediately rejected but still consume resources (parsing, circuit state checks, response serialization).

**Prevention:**
- Return specific error codes for circuit breaker rejections (e.g., HTTP 503 with `Retry-After` header)
- Upstream callers should NOT retry on circuit-breaker-specific errors
- Implement a **retry budget** at the server level: allow a maximum percentage (e.g., 10%) of total requests to be retries

### Failure Mode 6: The 2012 Netflix Christmas Eve cascade

On December 24, 2012, an AWS developer accidentally deleted key ELB state data in US-EAST-1. This caused load balancers to be improperly configured, degrading performance for applications behind those load balancers. Netflix's streaming service was impacted from 12:30 PM to 10:30 PM PST — a 10-hour outage on the highest-traffic day of the year.

Despite Netflix having Hystrix circuit breakers throughout their stack, this outage demonstrated that circuit breakers cannot protect against infrastructure-level failures below the application layer. The ELB failure was beneath the layer where Hystrix operated. This led Netflix to invest heavily in **multi-region active-active** architecture as a defense against region-level failures — because circuit breakers only protect within a single region's service mesh.

### Failure Mode 7: The AWS 2025 retry storm

In October 2025, a DNS resolution failure affecting DynamoDB in US-EAST-1 cascaded into a multi-hour global outage. When DNS resolution was briefly restored, millions of EC2 instances and Lambda functions simultaneously retried failed DynamoDB connections. The retry storm overwhelmed the database control plane, causing DNS to fail again. This oscillation cycle — partial recovery followed by retry-storm-induced re-failure — turned what should have been a 10-minute DNS fix into an outage affecting 113 AWS services across 60+ countries.

**Lesson:** Circuit breakers without coordinated backoff across clients are insufficient. The retry storm problem requires **server-side admission control** (rejecting excess load at the server) combined with **client-side circuit breakers** (stopping calls entirely after repeated failures) combined with **jittered exponential backoff** (preventing synchronized retries).

---

## Technology Landscape

### Java / JVM

| Library | Status | Notes |
|---|---|---|
| **Resilience4j** | Active, recommended | Lightweight, modular (circuit breaker, bulkhead, retry, rate limiter as separate modules). Supports count-based and time-based sliding windows, semaphore and thread pool bulkheads. First-class Spring Boot integration. The successor to Hystrix. |
| **Netflix Hystrix** | Maintenance mode (since 2018) | The library that popularized the pattern. Netflix recommends Resilience4j for new projects. Still widely deployed in legacy systems. Thread pool isolation was the default and defining feature. |
| **Spring Cloud Circuit Breaker** | Active | Abstraction layer that supports Resilience4j, Sentinel, and Spring Retry as backends. Use if you want to swap implementations without code changes. |
| **Sentinel (Alibaba)** | Active | Flow control, circuit breaking, and system adaptive protection. Stronger in rate limiting and traffic shaping than Resilience4j. Popular in the Chinese tech ecosystem. |

### .NET

| Library | Status | Notes |
|---|---|---|
| **Polly** | Active, recommended | The standard .NET resilience library. Supports circuit breaker, retry, bulkhead, timeout, fallback, and hedging as composable policies. Polly v8+ integrates with `Microsoft.Extensions.Resilience`. |
| **Microsoft.Extensions.Http.Resilience** | Active | Built on Polly. Provides pre-configured resilience pipelines for `HttpClient` via dependency injection. The recommended approach for .NET 8+ applications. |

### Node.js / JavaScript

| Library | Status | Notes |
|---|---|---|
| **opossum** | Active, recommended | The most widely used Node.js circuit breaker. Supports fallback, event-based monitoring, and Prometheus/Hystrix-compatible metrics export. Requires Node.js 20+. |
| **cockatiel** | Active | Provides circuit breaker, retry, timeout, and bulkhead. TypeScript-first. Lighter than opossum. |
| **brakes** | Maintained | Hystrix-compatible circuit breaker with built-in dashboard support. |

### Go

| Library | Status | Notes |
|---|---|---|
| **sony/gobreaker** | Active, recommended | Clean, well-tested implementation. Configurable via `ReadyToTrip` callback for custom tripping logic. The most widely adopted Go circuit breaker. |
| **go-kit/circuitbreaker** | Active | Part of the go-kit microservices framework. Wraps gobreaker and Hystrix-go. Use if you are already in the go-kit ecosystem. |
| **failsafe-go** | Active | Port of the Java Failsafe library. Provides circuit breaker, retry, timeout, bulkhead, and fallback as composable policies. |
| **slok/goresilience** | Active | Decorator-based resilience library. Provides circuit breaker, retry, timeout, bulkhead, and chaos injection. |

### Python

| Library | Status | Notes |
|---|---|---|
| **pybreaker** | Active | Straightforward circuit breaker implementation. Supports custom storage backends (Redis, Elasticsearch) for shared circuit state across multiple instances. |
| **tenacity** | Active | Primarily a retry library, but can be composed with custom circuit breaker logic. The standard Python retry library. |

### Service Mesh (Infrastructure-Level)

| Technology | Circuit breaking mechanism | Notes |
|---|---|---|
| **Istio / Envoy** | `DestinationRule` with `connectionPool` settings and `outlierDetection` | Operates at the network proxy level — no application code changes. Enforces max connections, max pending requests, and ejects unhealthy hosts based on 5xx error rates. Cannot implement application-level fallbacks. |
| **Linkerd** | Circuit breaking via `ServiceProfile` retry budgets and failure accrual | Lighter than Istio. Circuit breaking is implicit via failure accrual — unhealthy endpoints are removed from load balancing. |
| **AWS App Mesh** | Envoy-based, similar to Istio circuit breaking | Integrates with AWS service discovery. Configured via `VirtualNode` outlier detection. |

### When to use application-level vs. infrastructure-level

| Concern | Application-level (Resilience4j, Polly) | Infrastructure-level (Istio, Envoy) |
|---|---|---|
| Fallback behavior | Full control — return cached data, default values, degrade gracefully | Limited — can only reject or route to a different endpoint |
| Per-endpoint granularity | Can apply different thresholds to different API methods | Applies uniformly to all traffic to a destination |
| Language/framework coupling | Yes — must be implemented in each service's language | No — applied at the sidecar proxy level, language-agnostic |
| Operational consistency | Each team configures independently — risk of inconsistency | Uniform configuration across all services |
| Overhead | In-process, negligible | Sidecar proxy adds 1-3ms latency per hop |

**Most mature systems use both:** service mesh for baseline connection-level protection, application-level circuit breakers for business-logic fallbacks.

---

## Decision Tree

```
Is the call crossing a network boundary?
├── No (in-process function call)
│   └── Do NOT use circuit breaker or bulkhead
│       (use standard error handling)
│
└── Yes
    ├── Is the downstream service under your team's control?
    │   ├── Yes
    │   │   ├── Is it a critical path (user request blocks on it)?
    │   │   │   ├── Yes → Circuit breaker + bulkhead + fallback
    │   │   │   └── No (async, fire-and-forget)
    │   │   │       └── Queue-based decoupling (message broker)
    │   │   │           └── Circuit breaker on broker connection only
    │   │   └── No (external API / third-party service)
    │   │       └── Circuit breaker + bulkhead + fallback (mandatory)
    │   │           └── You cannot control their uptime
    │   │
    │   └── How many downstream dependencies?
    │       ├── 1-2 dependencies
    │       │   └── Start with timeouts + connection pool limits
    │       │       └── Add circuit breaker when you observe cascade risk
    │       ├── 3-10 dependencies
    │       │   └── Circuit breakers on each + semaphore bulkheads
    │       └── 10+ dependencies
    │           └── Circuit breakers + thread pool bulkheads + service mesh
    │               └── Invest in circuit breaker dashboard
    │
    └── What isolation level do you need?
        ├── Fast calls (<50ms), predictable latency
        │   └── Semaphore isolation (lower overhead)
        ├── Slow calls (>200ms), variable latency
        │   └── Thread pool isolation (can enforce timeouts)
        └── Mixed
            └── Semaphore for fast paths, thread pools for slow paths
```

---

## Implementation Sketch

### Circuit breaker with Resilience4j (Java/Spring Boot)

```java
// Configuration — application.yml
// resilience4j.circuitbreaker:
//   instances:
//     paymentService:
//       slidingWindowType: COUNT_BASED
//       slidingWindowSize: 100
//       minimumNumberOfCalls: 20
//       failureRateThreshold: 50
//       slowCallRateThreshold: 80
//       slowCallDurationThreshold: 2s
//       waitDurationInOpenState: 60s
//       permittedNumberOfCallsInHalfOpenState: 10
//       recordExceptions:
//         - java.io.IOException
//         - java.util.concurrent.TimeoutException
//       ignoreExceptions:
//         - com.example.BusinessValidationException
//
// resilience4j.bulkhead:
//   instances:
//     paymentService:
//       maxConcurrentCalls: 25
//       maxWaitDuration: 500ms

@Service
public class PaymentService {

    private final CircuitBreaker circuitBreaker;
    private final Bulkhead bulkhead;
    private final PaymentClient paymentClient;
    private final PaymentCacheService cache;

    public PaymentService(
            CircuitBreakerRegistry cbRegistry,
            BulkheadRegistry bhRegistry,
            PaymentClient paymentClient,
            PaymentCacheService cache) {
        this.circuitBreaker = cbRegistry.circuitBreaker("paymentService");
        this.bulkhead = bhRegistry.bulkhead("paymentService");
        this.paymentClient = paymentClient;
        this.cache = cache;
    }

    public PaymentResult processPayment(PaymentRequest request) {
        // Compose: bulkhead -> circuit breaker -> actual call
        Supplier<PaymentResult> decoratedCall = Decorators
            .ofSupplier(() -> paymentClient.charge(request))
            .withBulkhead(bulkhead)
            .withCircuitBreaker(circuitBreaker)
            .withFallback(List.of(
                CallNotPermittedException.class,    // circuit open
                BulkheadFullException.class          // bulkhead saturated
            ), e -> handleFallback(request, e))
            .decorate();

        return decoratedCall.get();
    }

    private PaymentResult handleFallback(PaymentRequest request, Throwable e) {
        // Queue for later processing — payment must eventually succeed
        cache.queueForRetry(request);
        return PaymentResult.pending(
            "Payment queued for processing. You will receive confirmation shortly."
        );
    }
}
```

### Circuit breaker with Polly (.NET)

```csharp
// Program.cs — configure resilience pipeline
builder.Services.AddHttpClient("PaymentService")
    .AddResilienceHandler("payment-pipeline", pipeline =>
    {
        // Circuit breaker
        pipeline.AddCircuitBreaker(new CircuitBreakerStrategyOptions<HttpResponseMessage>
        {
            SamplingDuration = TimeSpan.FromSeconds(60),
            MinimumThroughput = 20,
            FailureRatio = 0.5,
            BreakDuration = TimeSpan.FromSeconds(30),
            ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                .HandleResult(r => r.StatusCode == HttpStatusCode.ServiceUnavailable)
                .HandleResult(r => r.StatusCode >= HttpStatusCode.InternalServerError)
        });

        // Bulkhead (concurrency limiter)
        pipeline.AddConcurrencyLimiter(new ConcurrencyLimiterOptions
        {
            PermitLimit = 25,
            QueueLimit = 50
        });

        // Timeout per attempt
        pipeline.AddTimeout(TimeSpan.FromSeconds(5));
    });
```

### Circuit breaker with opossum (Node.js)

```javascript
const CircuitBreaker = require('opossum');

// The function to protect
async function callPaymentService(paymentData) {
  const response = await fetch('https://api.payment-provider.com/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
    signal: AbortSignal.timeout(5000) // 5s timeout per call
  });
  if (!response.ok) throw new Error(`Payment failed: ${response.status}`);
  return response.json();
}

// Wrap in circuit breaker
const breaker = new CircuitBreaker(callPaymentService, {
  timeout: 5000,               // 5 seconds per call
  errorThresholdPercentage: 50, // open after 50% failure rate
  resetTimeout: 30000,          // try half-open after 30 seconds
  volumeThreshold: 10,          // minimum 10 calls before evaluating
  rollingCountTimeout: 60000,   // 60-second sliding window
  rollingCountBuckets: 6        // 6 buckets of 10 seconds each
});

// Fallback when circuit is open
breaker.fallback((paymentData) => ({
  status: 'pending',
  message: 'Payment queued for processing',
  retryAfter: 30
}));

// Monitoring
breaker.on('open',    () => metrics.increment('circuit.payment.opened'));
breaker.on('close',   () => metrics.increment('circuit.payment.closed'));
breaker.on('halfOpen',() => metrics.increment('circuit.payment.halfOpen'));
breaker.on('fallback',() => metrics.increment('circuit.payment.fallback'));

// Usage
app.post('/api/pay', async (req, res) => {
  const result = await breaker.fire(req.body);
  res.json(result);
});
```

### Circuit breaker with gobreaker (Go)

```go
package main

import (
    "fmt"
    "net/http"
    "time"

    "github.com/sony/gobreaker/v2"
)

func main() {
    cb := gobreaker.NewCircuitBreaker[*http.Response](gobreaker.Settings{
        Name:        "payment-service",
        MaxRequests: 5,                   // max calls in half-open state
        Interval:    60 * time.Second,    // sliding window duration (closed state)
        Timeout:     30 * time.Second,    // duration in open state before half-open

        ReadyToTrip: func(counts gobreaker.Counts) bool {
            // Open circuit when failure rate exceeds 50%
            // with at least 10 requests in the window
            if counts.Requests < 10 {
                return false
            }
            failureRate := float64(counts.TotalFailures) / float64(counts.Requests)
            return failureRate >= 0.5
        },

        OnStateChange: func(name string, from, to gobreaker.State) {
            log.Printf("circuit breaker %s: %s -> %s", name, from, to)
            metrics.RecordStateChange(name, to)
        },
    })

    // Usage: wrap the downstream call
    resp, err := cb.Execute(func() (*http.Response, error) {
        client := &http.Client{Timeout: 5 * time.Second}
        return client.Post(
            "https://payment-service/charge",
            "application/json",
            requestBody,
        )
    })

    if err != nil {
        // Check if circuit is open — return fallback
        if errors.Is(err, gobreaker.ErrOpenState) {
            return cachedResponse(), nil
        }
        return nil, fmt.Errorf("payment call failed: %w", err)
    }
}
```

### Istio DestinationRule (service mesh circuit breaking)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-circuit-breaker
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100          # max TCP connections
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 50   # max queued requests
        http2MaxRequests: 100         # max concurrent HTTP/2 requests
        maxRequestsPerConnection: 10  # force connection recycling
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5        # eject after 5 consecutive 5xx
      interval: 30s                  # evaluation interval
      baseEjectionTime: 60s          # minimum ejection duration
      maxEjectionPercent: 50         # never eject more than 50% of hosts
```

---

## Cross-References

- **[Microservices](../patterns/microservices.md)** — Circuit breakers are mandatory infrastructure for any microservice architecture. See "Failure Mode 5: Cascade failures" in that module.
- **[Distributed Systems Fundamentals](./distributed-systems-fundamentals.md)** — The CAP theorem and network partition realities that make circuit breakers necessary.
- **[Idempotency and Retry](./idempotency-and-retry.md)** — Retry logic is the complement to circuit breaking. Retry handles transient failures; circuit breaker handles sustained failures. Always compose as retry-inside-circuit-breaker.
- **[Saga Pattern](./saga-pattern.md)** — Long-running distributed transactions use sagas for coordination. Circuit breakers protect individual saga steps from cascade failure.
- **[Event-Driven Architecture](../patterns/event-driven.md)** — Asynchronous messaging reduces the need for circuit breakers by decoupling services temporally. Consider event-driven alternatives before adding circuit breakers to synchronous call chains.

---

## Sources

- [Netflix Hystrix Wiki — How It Works](https://github.com/netflix/hystrix/wiki/how-it-works)
- [Netflix Hystrix GitHub — Latency and Fault Tolerance Library](https://github.com/Netflix/Hystrix)
- [Resilience4j CircuitBreaker Documentation](https://resilience4j.readme.io/docs/circuitbreaker)
- [Microsoft Azure — Bulkhead Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
- [Microsoft Azure — Circuit Breaker Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [AWS Prescriptive Guidance — Circuit Breaker Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html)
- [Istio — Circuit Breaking](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [Google SRE Book — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Grab Engineering — Designing Resilient Systems: Circuit Breakers or Retries?](https://engineering.grab.com/designing-resilient-systems-part-1)
- [Netflix Tech Blog — A Closer Look at the Christmas Eve Outage](https://netflixtechblog.com/a-closer-look-at-the-christmas-eve-outage-d7b409a529ee)
- [AWS — Summary of the December 24, 2012 Amazon ELB Service Event](https://aws.amazon.com/message/680587/)
- [Sony gobreaker — Circuit Breaker in Go](https://github.com/sony/gobreaker)
- [Opossum — Node.js Circuit Breaker](https://github.com/nodeshift/opossum)
- [Comparing Envoy and Istio Circuit Breaking with Netflix OSS Hystrix](https://blog.christianposta.com/microservices/comparing-envoy-and-istio-circuit-breaking-with-netflix-hystrix/)
- [Marc Brooker — Fixing Retries with Token Buckets and Circuit Breakers](https://brooker.co.za/blog/2022/02/28/retries.html)
- [InfoQ — How to Avoid Cascading Failures in Distributed Systems](https://www.infoq.com/articles/anatomy-cascading-failure/)
