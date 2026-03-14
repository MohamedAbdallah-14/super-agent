# API Latency -- Performance Expertise Module

> API latency directly impacts user experience, conversion rates, and system throughput. Amazon found that every 100ms of added latency cost them 1% in sales. Google found that an extra 500ms in search page generation time dropped traffic by 20%. Walmart reported a 2% increase in conversions for every 1 second shaved off loading time. At scale, tail latency (p99) matters more than average -- a service with 50ms average but 2s p99 will have many users experiencing multi-second waits, especially in fan-out architectures where a single slow dependency degrades the entire request.

> **Impact:** Critical
> **Applies to:** Backend, Web, Mobile
> **Key metrics:** Response time p50/p95/p99, Time to First Byte (TTFB), Throughput (RPS), Error rate under load

---

## Table of Contents

1. [Why This Matters](#1-why-this-matters)
2. [Performance Budgets and Targets](#2-performance-budgets-and-targets)
3. [Measurement and Profiling](#3-measurement-and-profiling)
4. [Common Bottlenecks](#4-common-bottlenecks)
5. [Optimization Patterns](#5-optimization-patterns)
6. [Anti-Patterns](#6-anti-patterns)
7. [Architecture-Level Decisions](#7-architecture-level-decisions)
8. [Testing and Regression Prevention](#8-testing-and-regression-prevention)
9. [Decision Trees](#9-decision-trees)
10. [Code Examples](#10-code-examples)
11. [Quick Reference](#11-quick-reference)

---

## 1. Why This Matters

### Business Impact -- Real Numbers

| Study / Company       | Finding                                                        | Source                         |
|-----------------------|----------------------------------------------------------------|--------------------------------|
| Amazon                | Every 100ms of latency costs 1% in sales                      | Greg Linden, Stanford talk     |
| Google                | 500ms extra latency drops search traffic by 20%                | Marissa Mayer, Web 2.0 Summit  |
| Google                | 100ms search delay reduces conversions by up to 7%             | Akamai / Google joint study    |
| Walmart               | Every 1s improvement increases conversions by 2%               | Walmart Labs engineering blog  |
| Akamai                | 100ms delay in page load hurts conversion by 7%                | Akamai "State of Online Retail"|
| Booking.com           | 1s slower load time = 1.5% drop in conversion                 | Velocity Conference 2015       |
| Aberdeen Group        | 1s delay = 11% fewer page views, 16% lower satisfaction       | Aberdeen Research report        |

### Tail Latency Amplification in Microservices

In distributed systems, tail latency is amplified by fan-out. If a single API call fans out to N backend services, the overall request latency is bounded by the **slowest** responder.

**Quantified impact of fan-out on tail latency:**

- If a single service has p99 = 50ms, and a request fans out to 10 services in parallel:
  - Probability that ALL 10 respond within 50ms = 0.99^10 = 90.4%
  - Probability at least one exceeds 50ms = 9.6%
  - Effective p99 of the composite call is much worse than any single service
- At 100 services in a fan-out: 0.99^100 = 36.6% chance of hitting p99 on at least one
- At 1000 services: effectively guaranteed to hit tail latency on every request

This means a service that looks "fast" in isolation can create unacceptable latency when composed into a microservice mesh. Google's Jeff Dean documented this extensively: with 1ms p99 at the component level and 100-way fan-out, the aggregate p99 approaches 100ms.

### User Experience Thresholds

| Response Time    | User Perception                                    |
|------------------|----------------------------------------------------|
| 0-100ms          | Feels instantaneous                                |
| 100-300ms        | Slight delay, still feels responsive               |
| 300-1000ms       | Noticeable delay, user waits consciously            |
| 1-3 seconds      | Mental context switch, user considers alternatives  |
| 3-10 seconds     | Frustration, high abandonment probability           |
| 10+ seconds      | Task failure; user leaves                          |

Source: Nielsen Norman Group; Jakob Nielsen's response time research.

---

## 2. Performance Budgets and Targets

### General API Latency Targets

| Metric | Internal APIs (service-to-service) | User-facing APIs | Real-time APIs (chat, gaming) |
|--------|-------------------------------------|------------------|-------------------------------|
| p50    | < 20ms                             | < 100ms          | < 30ms                       |
| p95    | < 100ms                            | < 300ms          | < 80ms                       |
| p99    | < 500ms                            | < 1000ms         | < 150ms                      |
| p99.9  | < 2000ms                           | < 3000ms         | < 500ms                      |

### Targets by API Type

| API Type                    | p50 Target | p95 Target | p99 Target | Notes                              |
|-----------------------------|------------|------------|------------|-------------------------------------|
| Health check / ping         | < 5ms      | < 10ms     | < 50ms     | Should be trivially fast            |
| Simple CRUD read            | < 30ms     | < 100ms    | < 300ms    | Single DB query + serialization     |
| CRUD write                  | < 50ms     | < 150ms    | < 500ms    | Write + validation + events         |
| Search / filtered list      | < 100ms    | < 300ms    | < 1000ms   | Indexed queries, pagination         |
| Aggregation / reporting     | < 500ms    | < 2000ms   | < 5000ms   | Consider async for heavy queries    |
| File upload / processing    | < 1000ms   | < 3000ms   | < 10000ms  | Return 202 Accepted for long ops    |
| Third-party API proxy       | < 200ms    | < 1000ms   | < 3000ms   | Depends on downstream; add caching  |

### Setting a Latency Budget

Break down the total latency budget into components:

```
Total budget: 200ms (p95 for a user-facing read API)
  - Network (client to LB):           20ms
  - Load balancer / API gateway:      5ms
  - Auth middleware (JWT validation):  5ms
  - Rate limiting check:              2ms
  - Business logic:                   10ms
  - Database query:                   30ms
  - Serialization (JSON):             5ms
  - Network (response to client):     20ms
  - Overhead / buffer:                103ms
```

When the sum of components exceeds the budget, you have identified where optimization is needed.

---

## 3. Measurement and Profiling

### Distributed Tracing

Distributed tracing is essential in microservice architectures. Each request gets a unique trace ID that propagates across service boundaries, allowing you to visualize the full request lifecycle.

**Tools:**

| Tool         | Type            | Key Feature                              | Overhead     |
|--------------|-----------------|------------------------------------------|--------------|
| Jaeger       | Open source     | OpenTelemetry native, Uber-developed     | ~1-3%        |
| Zipkin       | Open source     | Lightweight, Twitter-developed           | ~1-2%        |
| Datadog APM  | Commercial      | Full-stack observability, ML anomalies   | ~2-5%        |
| New Relic    | Commercial      | Code-level visibility, distributed trace | ~2-5%        |
| Grafana Tempo| Open source     | Cost-effective trace storage at scale    | ~1-3%        |
| AWS X-Ray    | Cloud-native    | Deep AWS integration                     | ~1-3%        |

**OpenTelemetry instrumentation (standard approach):**

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://collector:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

@app.route("/api/orders/<order_id>")
def get_order(order_id):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)

        with tracer.start_as_current_span("db_query"):
            order = db.orders.find_one({"id": order_id})

        with tracer.start_as_current_span("serialize"):
            result = serialize(order)

        return result
```

### Application Performance Monitoring (APM)

Key metrics to track continuously:

- **Response time percentiles:** p50, p95, p99, p99.9
- **Throughput:** requests per second (RPS)
- **Error rate:** percentage of 5xx responses
- **Saturation:** CPU, memory, connection pool utilization
- **Apdex score:** (satisfied + tolerating/2) / total requests

### Flame Graphs and CPU Profiling

Flame graphs visualize where CPU time is spent. Use them to identify unexpected hot paths:

```bash
# Go: pprof CPU profile
go tool pprof -http=:6060 http://localhost:8080/debug/pprof/profile?seconds=30

# Java: async-profiler (low overhead, production-safe)
./asprof -d 30 -f flamegraph.html <pid>

# Node.js: 0x or clinic.js
npx 0x -- node server.js
npx clinic flame -- node server.js

# Python: py-spy (sampling profiler, production-safe)
py-spy record -o profile.svg --pid <pid>
```

### Load Testing Tools

| Tool    | Language | Protocol Support        | Key Strength                          | Max RPS (single machine) |
|---------|----------|-------------------------|---------------------------------------|--------------------------|
| k6      | Go/JS   | HTTP/1.1, HTTP/2, gRPC  | Scripting flexibility, cloud mode     | 50,000+                  |
| wrk     | C        | HTTP/1.1                | Raw throughput, minimal overhead      | 100,000+                 |
| hey     | Go       | HTTP/1.1, HTTP/2        | Simple, quick benchmarks              | 50,000+                  |
| Gatling | Scala    | HTTP, WebSocket, gRPC   | Advanced scenarios, detailed reports  | 30,000+                  |
| Locust  | Python   | HTTP (extensible)       | Python scripting, distributed mode    | 10,000+                  |
| vegeta  | Go       | HTTP                    | Constant-rate load, histogram output  | 50,000+                  |

**Example k6 load test:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up
    { duration: '5m', target: 100 },   // sustain
    { duration: '2m', target: 500 },   // spike
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/v1/orders');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
  sleep(1);
}
```

---

## 4. Common Bottlenecks

### 4.1 N+1 Query Problem

**Impact:** 10-50x slowdown on list endpoints.
**Mechanism:** One query fetches N parent records; N additional queries fetch related records individually.

A concrete benchmark: fetching 100 records with N+1 produces 101 queries at ~10ms each = 1,010ms total. A single JOIN or eager-loaded query takes 20ms -- a 50x improvement.

Real-world case: 800 items across 17 categories took 1+ second with 18 N+1 queries. A single JOIN achieved the same result 10x faster at ~14ms reading 834 rows vs. 42ms reading 13,889 rows.

### 4.2 Missing or Incorrect Database Indexes

**Impact:** Full table scans turn O(log n) lookups into O(n) scans. On a table with 1M rows, a missing index can turn a 2ms query into a 2000ms query.

### 4.3 Serialization Overhead

**Impact:** JSON serialization can consume 10-30% of total response time for large payloads.

Protobuf is 5-7x faster than JSON for serialization/deserialization (Go benchmarks), with 3x fewer memory allocations and 3-10x smaller wire format. Java benchmarks show Protobuf at 4x+ faster than JSON.

### 4.4 Network Hops and Service-to-Service Calls

**Impact:** Each network hop adds 0.5-5ms within a datacenter, 50-150ms cross-region. A chain of 5 synchronous service calls adds 2.5-25ms of pure network overhead internally.

### 4.5 Cold Starts (Serverless)

**Impact:** AWS Lambda cold starts range from 16ms (Rust/arm64) to 6+ seconds (Java without SnapStart). Node.js and Python typically cold start in 100-300ms. Java with SnapStart reduces from 6.1s to 1.4s (4.3x improvement). Memory allocation matters: 512MB Lambda cold starts 40% faster than 128MB.

### 4.6 Connection Pool Exhaustion

**Impact:** When all database connections in the pool are in use, new requests queue. A pool of 20 connections serving 200 concurrent requests means 180 requests wait. Each blocked request adds the full wait time to its latency.

### 4.7 Garbage Collection Pauses

**Impact:** Stop-the-world GC pauses can spike p99 from 10ms to 50-500ms. In Java, poorly tuned GC can cause 100ms+ pauses. Modern collectors like ZGC and Shenandoah reduce pause times by 10-1000x (sub-millisecond pauses) with a 5-15% throughput trade-off. In Go, tuning GOGC to 50-80 yields frequent but shorter pauses, reducing tail latency spikes.

### 4.8 Middleware Chain Overhead

**Impact:** Each middleware layer (auth, logging, rate limiting, CORS, request parsing) adds 0.5-5ms. A chain of 10 middleware layers can add 5-50ms before business logic even executes.

### 4.9 DNS Resolution

**Impact:** DNS lookups add 10-200ms when not cached. Internal service discovery via DNS can add latency if TTL is too low, causing frequent re-resolution.

### 4.10 TLS Handshake

**Impact:** Full TLS 1.2 handshake adds 2 round trips (40-200ms). TLS 1.3 reduces this to 1 round trip. TLS session resumption can eliminate the handshake overhead on subsequent requests.

### 4.11 Large Payload Sizes

**Impact:** Uncompressed 1MB JSON response takes ~80ms to transfer on 100Mbps. With gzip (60-70% reduction) or Brotli (65-75% reduction), this drops to 20-30ms of transfer time.

### 4.12 Synchronous External API Calls

**Impact:** Blocking on third-party APIs (payment processors, email services) adds their full latency to your response time. A Stripe API call averaging 300ms makes your API at least 300ms.

### 4.13 Logging and Observability Overhead

**Impact:** Synchronous logging to disk or network can add 1-10ms per request. Structured logging with JSON encoding is 2-5x slower than plain text. Solution: buffer and flush asynchronously.

### 4.14 Lock Contention

**Impact:** Mutex contention in hot paths serializes parallel work. Under high concurrency, a critical section held for 1ms can create 100ms+ waits as goroutines/threads queue.

### 4.15 Inefficient Memory Allocation

**Impact:** Excessive heap allocations increase GC pressure. In Go, each allocation adds ~25ns; at 100K allocations per request, that is 2.5ms of pure allocation overhead plus GC impact.

### 4.16 Unbounded Result Sets

**Impact:** Returning 100,000 rows from a database when the client only needs 20 wastes DB I/O, network bandwidth, serialization time, and client memory. Server-side pagination can reduce response sizes by 50-99%.

### 4.17 Missing Response Compression

**Impact:** Gzip reduces JSON payload sizes by 60-80%. Brotli achieves 65-85% compression. A 500KB JSON response becomes 75-100KB with gzip, saving 400KB+ of transfer time.

---

## 5. Optimization Patterns

### 5.1 Connection Pooling

Maintain persistent connections to databases, caches, and downstream services.

**Benchmarks (PgBouncer for PostgreSQL):**
- Throughput improvement: 3.4x to 7.0x higher TPS
- Connection speed: 3.9x to 9.9x faster connection establishment
- Latency reduction: up to 7x lower query latency
- Under stress: 2.1x more transactions completed

**Configuration guidelines:**

| Parameter              | Recommended Value                  | Rationale                          |
|------------------------|------------------------------------|------------------------------------|
| Pool size              | (2 * CPU cores) + disk spindles    | HikariCP formula; avoids contention|
| Connection timeout     | 5-10 seconds                       | Fail fast rather than queue        |
| Idle timeout           | 10-30 minutes                      | Reclaim unused connections         |
| Max lifetime           | 30-60 minutes                      | Prevent stale connection issues    |
| Validation query       | Every 30-60 seconds                | Detect dead connections            |

### 5.2 Query Optimization

- **Add indexes** on columns used in WHERE, JOIN, ORDER BY, and GROUP BY clauses
- **Use EXPLAIN ANALYZE** to verify query plans and detect full table scans
- **Eliminate N+1** queries using JOINs, subqueries, or ORM eager loading
- **Denormalize** read-heavy data where appropriate (trade storage for speed)
- **Use covering indexes** so the database can answer queries from the index alone
- **Partition large tables** (time-series data benefits from range partitioning)

### 5.3 Caching Layers

**Multi-tier caching strategy:**

```
Client Cache (browser/mobile) -----> 0ms (cache hit)
       |
CDN / Edge Cache -----------------> 1-10ms
       |
API Gateway Cache ----------------> 1-5ms
       |
Application Cache (Redis) --------> 0.5-2ms
       |
Database Query Cache --------------> avoid (unpredictable invalidation)
       |
Database (source of truth) -------> 5-100ms+
```

**Redis caching benchmarks:**
- API response latency drops from ~300ms to <30ms (10x improvement, ~90% reduction)
- AWS ElastiCache Redis 7.1 achieves sub-millisecond p99 at peak load
- Edge caching enables 5ms global latency even with geographically distributed clients

**Cache invalidation strategies:**

| Strategy          | Consistency | Complexity | Use Case                         |
|-------------------|-------------|------------|----------------------------------|
| TTL-based         | Eventual    | Low        | Rarely-changing reference data   |
| Write-through     | Strong      | Medium     | User profiles, settings          |
| Write-behind      | Eventual    | High       | High-write-volume analytics      |
| Cache-aside       | Eventual    | Low        | General purpose                  |
| Event-driven      | Near-real   | Medium     | Multi-service cache invalidation |

### 5.4 Async Processing

Move non-critical work out of the request path:

- **Email/notification sending** -- queue via RabbitMQ, SQS, or Kafka
- **Analytics/logging** -- fire-and-forget to a message bus
- **Image/file processing** -- return 202 Accepted, process in background
- **Third-party webhooks** -- enqueue and retry independently

Return early with a 202 Accepted + a polling endpoint or WebSocket for status updates. This can reduce perceived latency from seconds to milliseconds.

### 5.5 Payload Optimization

- **Sparse fieldsets** -- let clients specify which fields they need (GraphQL, JSON:API)
- **Pagination** -- server-side with cursor-based pagination for stable performance
- **Compression** -- enable gzip/Brotli at the API gateway or reverse proxy level
- **Binary formats** -- Protobuf for internal services (5-7x faster than JSON, 3-10x smaller)
- **Streaming** -- use chunked transfer encoding or Server-Sent Events for large result sets

### 5.6 HTTP/2 and HTTP/3

HTTP/2 multiplexing allows multiple requests over a single TCP connection, eliminating head-of-line blocking at the HTTP layer. Header compression (HPACK) reduces repeated header overhead -- especially valuable for APIs where the same headers appear in every call.

HTTP/3 (QUIC) eliminates TCP head-of-line blocking entirely and reduces connection setup to 0-RTT in the best case, saving 100-300ms on first connection.

### 5.7 Edge Computing and CDN Caching

Deploy API responses at edge locations to reduce geographic latency:

- CDN-cached API responses reduce latency by up to 60% for geographically dispersed users
- Edge computing with regional API gateways reduces latency penalties by 70%+
- Stale-while-revalidate patterns serve cached responses immediately while refreshing in background

### 5.8 Request Coalescing and Batching

- **Request coalescing:** deduplicate identical in-flight requests so only one hits the backend
- **Batching:** combine multiple small requests into one (e.g., DataLoader pattern)
- **Debouncing:** on the client side, wait for user to stop typing before sending search queries

---

## 6. Anti-Patterns

### 6.1 Over-Fetching

Returning entire database rows when the client only needs 3 fields. A user profile endpoint returning 50 fields when the UI only displays name, avatar, and email. This wastes serialization time, bandwidth, and client parsing time.

### 6.2 Chatty Microservices

Making 10+ synchronous inter-service calls per request. Each call adds 1-5ms of network overhead, and the chain is only as fast as the slowest call. Prefer coarse-grained service boundaries or aggregate services (Backend-for-Frontend pattern).

### 6.3 Synchronous Chains

Service A calls B, which calls C, which calls D -- all synchronously. The total latency is the SUM of all calls. If A=10ms, B=20ms, C=30ms, D=15ms, total = 75ms minimum. Any spike in D cascades to all upstream callers.

### 6.4 Premature Caching Without Measurement

Adding Redis before profiling. If the bottleneck is serialization or CPU, caching will not help. Measure first, cache second. Caching the wrong thing adds complexity, increases stale data risk, and wastes infrastructure budget.

### 6.5 No Pagination on List Endpoints

Returning all 100,000 records when the client displays 20. This creates multi-second response times, high memory usage, and potential OOM errors under concurrent load.

### 6.6 Synchronous Logging

Writing structured JSON logs to disk or a network endpoint synchronously in the request path. Each log statement adds 0.5-5ms. Solution: use async log writers with in-memory buffers.

### 6.7 Unbounded Retry Loops

Retrying failed downstream calls without exponential backoff, jitter, or circuit breaking. This amplifies load on already-struggling services and can cause cascading failures.

### 6.8 Missing Timeouts

Not setting timeouts on HTTP clients, database connections, or gRPC calls. A single slow dependency can block a thread/goroutine indefinitely, eventually exhausting the connection pool and causing the entire service to stall.

### 6.9 Ignoring Connection Reuse

Creating a new HTTP client or database connection per request instead of reusing pooled connections. TCP handshake (1-3ms) + TLS handshake (10-50ms) per request adds up quickly at high RPS.

### 6.10 N+1 API Calls from Frontend

The API returns a list of IDs; the frontend makes individual requests for each ID. This is the HTTP equivalent of N+1 queries. Provide batch endpoints or embed related resources.

### 6.11 Blocking on Non-Critical Work

Sending confirmation emails, updating analytics, or generating audit logs synchronously before returning the response. If it is not needed for the response, do it asynchronously.

### 6.12 Using SELECT * in Production Queries

Fetching all columns when only a few are needed wastes I/O, increases deserialization time, and prevents the use of covering indexes.

### 6.13 Misconfigured Service Meshes

Service meshes like Istio and Linkerd add observability and security but can introduce up to 25% latency increase when misconfigured (Red Hat 2023 survey). Ensure sidecar proxy resource limits are properly tuned.

---

## 7. Architecture-Level Decisions

### Synchronous vs. Asynchronous Communication

| Dimension            | Synchronous (REST/gRPC)           | Asynchronous (Message Queue)        |
|----------------------|-----------------------------------|-------------------------------------|
| Latency              | Sum of all hops                   | Only critical-path hops             |
| Coupling             | Tight (caller waits)              | Loose (fire and forget)             |
| Error handling       | Direct propagation                | Dead letter queues, retries         |
| Consistency          | Easier strong consistency         | Eventual consistency patterns       |
| Debugging            | Straightforward stack traces      | Requires correlation IDs, tracing   |
| Throughput           | Limited by slowest service        | Buffered, handles spikes gracefully |

**Guideline:** Use synchronous calls only when the response is needed to continue processing. For everything else, prefer asynchronous messaging.

### Monolith vs. Microservices -- Latency Tradeoffs

| Aspect               | Monolith                          | Microservices                       |
|-----------------------|-----------------------------------|-------------------------------------|
| In-process calls      | ~100ns function call              | 0.5-5ms network call               |
| Serialization         | None (shared memory)              | JSON: 1-10ms; Protobuf: 0.1-2ms   |
| Fan-out latency       | N/A                               | Amplified by service count          |
| Deployment latency    | Full redeploy (minutes)           | Independent deploy (seconds)        |
| Tail latency          | Single process, predictable       | Distributed, harder to bound        |

A monolith has inherently lower latency for internal operations. Microservices trade latency for scalability, team autonomy, and deployment independence. The CQRS pattern can achieve 58% reduction in inter-service communication overhead by separating read and write paths.

### CQRS (Command Query Responsibility Segregation)

Separate read and write models:

- **Write side:** normalized, consistent, handles commands through domain logic
- **Read side:** denormalized, optimized for query patterns, eventually consistent

Benefits for latency:
- Read APIs serve from pre-computed, denormalized views (no JOINs at query time)
- Write APIs are simpler (no read optimization logic)
- Read replicas can scale independently

### Event Sourcing

Store events rather than current state. Benefits for latency:

- Writes are append-only (extremely fast, no read-modify-write)
- Read models are materialized views, optimized per query pattern
- Event replay enables building new read models without touching production data

Trade-off: increased complexity, eventual consistency, and storage costs.

### Zone-Aware Routing

Direct traffic to services within the same availability zone to minimize cross-zone latency (typically 1-3ms per zone hop). Tools like Istio support zone-aware routing natively.

### Circuit Breaker Pattern

Circuit breakers reduce cascading failures by 78% and enable automatic recovery in 94% of partial failure scenarios within ~2.8 seconds average. This prevents a slow dependency from consuming all connection pool slots and degrading the entire service.

---

## 8. Testing and Regression Prevention

### Load Testing in CI/CD

Integrate performance tests into the deployment pipeline:

```yaml
# Example: GitHub Actions performance gate
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Start application
      run: docker-compose up -d
    - name: Run k6 load test
      uses: grafana/k6-action@v0.4.0
      with:
        filename: tests/performance/api-load.js
    - name: Check thresholds
      run: |
        # k6 exits with code 99 if thresholds are breached
        # This automatically fails the pipeline
        echo "Performance thresholds validated"
```

### Latency Budgets as SLOs

Define Service Level Objectives tied to latency percentiles:

| SLI (Indicator)                          | SLO (Objective)        | Error Budget (30 days) |
|------------------------------------------|------------------------|------------------------|
| p95 response time for /api/orders        | < 300ms, 99.5% of time | 3.6 hours of violation |
| p99 response time for /api/search        | < 1000ms, 99% of time  | 7.2 hours of violation |
| Availability (non-5xx)                   | 99.9%                  | 43.2 minutes downtime  |

When the error budget is consumed, freeze feature deployments and focus on reliability.

### Continuous Profiling

Run continuous profiling in production to detect regressions as they happen:

- **Pyroscope** (open source): continuous profiling for Go, Python, Java, Node.js
- **Datadog Continuous Profiler**: tied to APM traces
- **Google Cloud Profiler**: low-overhead production profiling

### Performance Regression Detection

```python
# Example: Compare latency distributions between releases
import numpy as np
from scipy import stats

baseline_p99 = np.percentile(baseline_latencies, 99)
canary_p99 = np.percentile(canary_latencies, 99)

# Statistical significance test
_, p_value = stats.mannwhitneyu(baseline_latencies, canary_latencies)

if canary_p99 > baseline_p99 * 1.1 and p_value < 0.05:
    raise Exception(
        f"Latency regression detected: p99 went from "
        f"{baseline_p99:.1f}ms to {canary_p99:.1f}ms (p={p_value:.4f})"
    )
```

### Synthetic Monitoring

Run synthetic API tests from multiple geographic regions every 1-5 minutes:

- Detect latency degradations before users report them
- Track TTFB trends over weeks/months
- Alert when p95 exceeds budget for 5+ consecutive checks

---

## 9. Decision Trees

### "My API Is Slow" -- Diagnostic Flowchart

```
START: API response time exceeds budget
  |
  +---> Is it slow for ALL requests or only SOME?
  |       |
  |       +---> ALL requests:
  |       |       |
  |       |       +---> Check CPU utilization
  |       |       |       > 80%? --> Profile CPU (flame graph)
  |       |       |                  - Hot serialization loop?
  |       |       |                  - Regex/parsing overhead?
  |       |       |                  - Crypto operations?
  |       |       |
  |       |       +---> Check memory / GC
  |       |       |       High GC pause? --> Tune GC, reduce allocations
  |       |       |       OOM pressure? --> Increase memory or reduce footprint
  |       |       |
  |       |       +---> Check connection pools
  |       |               All in use? --> Increase pool size or reduce hold time
  |       |               Timeout waiting? --> Check downstream service health
  |       |
  |       +---> SOME requests (tail latency):
  |               |
  |               +---> Specific endpoints?
  |               |       Yes --> Profile that endpoint (N+1? Missing index?)
  |               |       No  --> Systemic issue (GC, noisy neighbor)
  |               |
  |               +---> Correlated with payload size?
  |               |       Yes --> Pagination, compression, field filtering
  |               |
  |               +---> Correlated with time of day?
  |                       Yes --> Load-related; auto-scaling or caching needed
  |
  +---> Where is the time spent? (Use distributed tracing)
          |
          +---> Database (> 50% of request time):
          |       - Check query plan (EXPLAIN ANALYZE)
          |       - Add missing indexes
          |       - Eliminate N+1 queries
          |       - Consider read replicas
          |       - Add caching layer
          |
          +---> Network / downstream services (> 30%):
          |       - Add timeouts and circuit breakers
          |       - Cache downstream responses
          |       - Parallelize independent calls
          |       - Consider async processing
          |
          +---> Serialization (> 15%):
          |       - Switch to Protobuf for internal APIs
          |       - Use streaming serialization
          |       - Reduce payload size (sparse fieldsets)
          |       - Enable compression (gzip/Brotli)
          |
          +---> Application logic (> 20%):
                  - Profile with flame graph
                  - Optimize hot loops
                  - Reduce memory allocations
                  - Consider algorithmic improvements
```

### "Should I Cache This?" -- Decision Framework

```
Is the data requested frequently?
  No  --> Do not cache (waste of memory)
  Yes --> Is the data expensive to compute/fetch?
            No  --> Probably not worth caching complexity
            Yes --> Can you tolerate stale data?
                      No  --> Use write-through cache or skip caching
                      Yes --> For how long?
                                Seconds --> Cache with short TTL (rate-limit protection)
                                Minutes --> Cache-aside with TTL (most common pattern)
                                Hours+  --> CDN / edge cache with background refresh
```

### "Should I Make This Async?" -- Decision Framework

```
Is the result needed for the API response?
  Yes --> Must be synchronous (but can parallelize with other sync work)
  No  --> Can the user wait for the result?
            No  --> Fire-and-forget via message queue
            Yes --> Return 202 Accepted + status polling endpoint
                    Process in background worker
```

---

## 10. Code Examples

### Example 1: N+1 Query Elimination

**Before (N+1 -- 101 queries for 100 orders):**

```python
# BAD: 1 query for orders + 100 queries for customers
orders = db.execute("SELECT * FROM orders LIMIT 100")
for order in orders:
    customer = db.execute(
        "SELECT * FROM customers WHERE id = %s", (order.customer_id,)
    )
    order.customer = customer
# Total: 101 queries, ~1010ms at 10ms/query
```

**After (single JOIN -- 1 query):**

```python
# GOOD: 1 query with JOIN
orders = db.execute("""
    SELECT o.id, o.total, o.created_at,
           c.id as customer_id, c.name, c.email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LIMIT 100
""")
# Total: 1 query, ~15ms
# Improvement: 67x faster
```

**ORM equivalent (SQLAlchemy eager loading):**

```python
# BAD: lazy loading triggers N+1
orders = session.query(Order).limit(100).all()
for order in orders:
    print(order.customer.name)  # triggers individual SELECT per customer

# GOOD: joinedload eliminates N+1
from sqlalchemy.orm import joinedload
orders = (
    session.query(Order)
    .options(joinedload(Order.customer))
    .limit(100)
    .all()
)
for order in orders:
    print(order.customer.name)  # no additional queries
```

### Example 2: Response Caching with Redis

**Before (uncached -- 250ms):**

```python
@app.route("/api/products/<category>")
def get_products(category):
    # Direct DB query every time: ~200ms
    products = db.execute(
        "SELECT * FROM products WHERE category = %s ORDER BY popularity DESC",
        (category,)
    )
    return jsonify([serialize(p) for p in products])  # ~50ms serialization
    # Total: ~250ms per request
```

**After (Redis-cached -- 2ms on cache hit):**

```python
import redis
import json

cache = redis.Redis(host='localhost', port=6379, decode_responses=True)
CACHE_TTL = 300  # 5 minutes

@app.route("/api/products/<category>")
def get_products(category):
    cache_key = f"products:{category}"

    # Check cache first: ~0.5ms
    cached = cache.get(cache_key)
    if cached:
        return cached, 200, {'Content-Type': 'application/json'}

    # Cache miss: query DB (~200ms) + serialize (~50ms)
    products = db.execute(
        "SELECT * FROM products WHERE category = %s ORDER BY popularity DESC",
        (category,)
    )
    result = json.dumps([serialize(p) for p in products])

    # Store in cache: ~0.5ms
    cache.setex(cache_key, CACHE_TTL, result)

    return result, 200, {'Content-Type': 'application/json'}
    # Cache hit: ~2ms | Cache miss: ~252ms (same + cache write)
    # At 90% hit rate, average = 0.9*2 + 0.1*252 = 27ms (9.3x improvement)
```

### Example 3: Async Processing -- Fire-and-Forget

**Before (synchronous -- 850ms):**

```python
@app.route("/api/orders", methods=["POST"])
def create_order(order_data):
    order = validate_order(order_data)          # 10ms
    order = save_to_database(order)             # 30ms
    charge_payment(order)                       # 300ms (Stripe API)
    send_confirmation_email(order)              # 200ms (SendGrid API)
    update_inventory(order)                     # 50ms
    notify_warehouse(order)                     # 100ms
    track_analytics(order)                      # 50ms
    generate_invoice_pdf(order)                 # 110ms
    return jsonify(order), 201
    # Total: ~850ms -- user waits for everything
```

**After (async non-critical work -- 340ms):**

```python
from celery import Celery

celery_app = Celery('orders', broker='redis://localhost:6379/0')

@app.route("/api/orders", methods=["POST"])
def create_order(order_data):
    order = validate_order(order_data)          # 10ms
    order = save_to_database(order)             # 30ms
    charge_payment(order)                       # 300ms (critical, must be sync)

    # Non-critical work: fire-and-forget to background workers
    celery_app.send_task('send_confirmation_email', args=[order.id])
    celery_app.send_task('update_inventory', args=[order.id])
    celery_app.send_task('notify_warehouse', args=[order.id])
    celery_app.send_task('track_analytics', args=[order.id])
    celery_app.send_task('generate_invoice_pdf', args=[order.id])
    # Enqueue time: ~2ms total

    return jsonify(order), 201
    # Total: ~342ms -- 2.5x faster, user gets response immediately
```

### Example 4: Connection Pooling

**Before (new connection per request):**

```python
import psycopg2

def get_user(user_id):
    # New connection every time: ~20-50ms for TCP + TLS + auth
    conn = psycopg2.connect(
        host="db.example.com", dbname="app", user="api", password="secret"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user
    # Connection overhead: 20-50ms per request
```

**After (connection pool):**

```python
from psycopg2 import pool

# Initialize pool once at startup
db_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,  # (2 * CPU_cores) + disk_spindles
    host="db.example.com",
    dbname="app",
    user="api",
    password="secret"
)

def get_user(user_id):
    conn = db_pool.getconn()  # ~0.1ms from pool
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        return user
    finally:
        db_pool.putconn(conn)  # return to pool, not closed
    # Connection overhead: ~0.1ms per request (200-500x faster)
```

### Example 5: Parallel Service Calls

**Before (sequential -- 450ms):**

```python
async def get_dashboard(user_id):
    profile = await fetch_profile(user_id)        # 100ms
    orders = await fetch_recent_orders(user_id)    # 150ms
    recommendations = await fetch_recommendations(user_id)  # 200ms
    return {
        "profile": profile,
        "orders": orders,
        "recommendations": recommendations,
    }
    # Total: 100 + 150 + 200 = 450ms (sequential)
```

**After (parallel -- 200ms):**

```python
import asyncio

async def get_dashboard(user_id):
    profile, orders, recommendations = await asyncio.gather(
        fetch_profile(user_id),           # 100ms
        fetch_recent_orders(user_id),     # 150ms
        fetch_recommendations(user_id),   # 200ms
    )
    return {
        "profile": profile,
        "orders": orders,
        "recommendations": recommendations,
    }
    # Total: max(100, 150, 200) = 200ms (parallel)
    # Improvement: 2.25x faster
```

### Example 6: Payload Optimization with Field Selection

**Before (over-fetching -- 12KB response):**

```python
@app.route("/api/users")
def list_users():
    users = db.execute("SELECT * FROM users LIMIT 50")
    return jsonify([
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "bio": u.bio,                      # 500 chars avg
            "settings": u.settings,            # large JSON blob
            "login_history": u.login_history,  # array of 100+ entries
            "metadata": u.metadata,            # internal data, not needed
            # ... 40+ more fields
        }
        for u in users
    ])
    # Response: ~12KB, serialization: ~15ms
```

**After (sparse fieldsets -- 1.2KB response):**

```python
@app.route("/api/users")
def list_users():
    fields = request.args.get("fields", "id,name,avatar_url").split(",")
    allowed = {"id", "name", "email", "avatar_url", "bio", "created_at"}
    selected = allowed.intersection(fields)

    columns = ", ".join(selected)
    users = db.execute(f"SELECT {columns} FROM users LIMIT 50")
    return jsonify([{field: getattr(u, field) for field in selected} for u in users])
    # Response: ~1.2KB, serialization: ~2ms
    # Improvement: 10x smaller payload, 7.5x faster serialization
```

### Example 7: Database Index Optimization

**Before (full table scan -- 1200ms):**

```sql
-- Query without proper index on a 5M row table
EXPLAIN ANALYZE
SELECT * FROM events
WHERE user_id = 12345
  AND created_at > '2025-01-01'
ORDER BY created_at DESC
LIMIT 20;

-- Result: Seq Scan on events
-- Rows examined: 5,000,000
-- Execution time: 1200ms
```

**After (composite index -- 2ms):**

```sql
-- Add a composite index matching the query pattern
CREATE INDEX idx_events_user_created
ON events (user_id, created_at DESC);

-- Same query now uses index
EXPLAIN ANALYZE
SELECT * FROM events
WHERE user_id = 12345
  AND created_at > '2025-01-01'
ORDER BY created_at DESC
LIMIT 20;

-- Result: Index Scan using idx_events_user_created
-- Rows examined: 20
-- Execution time: 2ms
-- Improvement: 600x faster
```

### Example 8: Response Compression

**Before (uncompressed -- 480KB transfer):**

```python
@app.route("/api/reports/monthly")
def monthly_report():
    data = generate_report()  # Returns 480KB JSON
    return jsonify(data)
    # Transfer size: 480KB
    # Transfer time at 100Mbps: ~38ms
```

**After (Brotli compression -- 96KB transfer):**

```python
from flask_compress import Compress

app = Flask(__name__)
Compress(app)  # Enables gzip/Brotli automatically based on Accept-Encoding

# Or at the reverse proxy level (nginx):
# gzip on;
# gzip_types application/json;
# gzip_min_length 1000;
# brotli on;
# brotli_types application/json;
```

```nginx
# nginx configuration for compression
server {
    # Gzip: 60-70% reduction
    gzip on;
    gzip_types application/json application/javascript text/plain;
    gzip_min_length 1000;
    gzip_comp_level 6;  # balance between compression ratio and CPU

    # Brotli: 70-80% reduction (requires ngx_brotli module)
    brotli on;
    brotli_types application/json application/javascript text/plain;
    brotli_comp_level 6;
    brotli_min_length 1000;
}
# 480KB --> ~96KB with Brotli (80% reduction)
# Transfer time: 38ms --> 7.6ms (5x faster transfer)
```

### Example 9: Circuit Breaker with Timeout

**Before (no timeout, no circuit breaker):**

```python
import requests

def get_payment_status(payment_id):
    # If payment service is down, this hangs for 30s+ (default socket timeout)
    response = requests.get(f"http://payment-service/api/payments/{payment_id}")
    return response.json()
```

**After (timeout + circuit breaker):**

```python
import requests
from circuitbreaker import circuit

@circuit(
    failure_threshold=5,      # open after 5 failures
    recovery_timeout=30,      # try again after 30s
    expected_exception=Exception,
)
def get_payment_status(payment_id):
    response = requests.get(
        f"http://payment-service/api/payments/{payment_id}",
        timeout=(1, 5),  # (connect_timeout=1s, read_timeout=5s)
    )
    response.raise_for_status()
    return response.json()

# Usage with fallback
def get_payment_status_safe(payment_id):
    try:
        return get_payment_status(payment_id)
    except Exception:
        # Return cached or degraded response
        return {"id": payment_id, "status": "unknown", "cached": True}
```

---

## 11. Quick Reference

### Latency Numbers Every Developer Should Know

| Operation                                    | Latency        |
|----------------------------------------------|----------------|
| L1 cache reference                           | 0.5 ns         |
| L2 cache reference                           | 7 ns           |
| Main memory reference                        | 100 ns         |
| SSD random read                              | 16 us          |
| HDD random read                              | 2-10 ms        |
| Redis GET (local)                            | 0.1-0.5 ms     |
| Redis GET (cross-AZ)                         | 1-3 ms         |
| PostgreSQL simple query (indexed)            | 1-5 ms         |
| PostgreSQL complex query (no index)          | 50-5000 ms     |
| HTTP request (same datacenter)               | 0.5-5 ms       |
| HTTP request (same region, different AZ)     | 1-3 ms         |
| HTTP request (cross-region)                  | 50-150 ms      |
| DNS lookup (uncached)                        | 10-200 ms      |
| TLS handshake (full, TLS 1.2)               | 40-200 ms      |
| TLS handshake (resumed, TLS 1.3)            | 0-10 ms        |
| TCP connection setup                         | 1-3 ms (LAN)   |
| JSON serialize 1KB object                    | 0.01-0.1 ms    |
| JSON serialize 1MB object                    | 5-50 ms        |
| Protobuf serialize 1KB object                | 0.002-0.02 ms  |
| Gzip compress 100KB JSON                     | 1-5 ms         |
| Brotli compress 100KB JSON                   | 5-20 ms        |
| AWS Lambda cold start (Node.js)              | 100-300 ms     |
| AWS Lambda cold start (Java)                 | 3000-6000 ms   |
| AWS Lambda cold start (Rust/arm64)           | 16 ms          |

### Optimization Impact Summary

| Optimization                           | Typical Improvement     | Effort  |
|----------------------------------------|-------------------------|---------|
| Add missing database index             | 10-600x query speedup   | Low     |
| Eliminate N+1 queries                  | 10-50x on list APIs     | Low     |
| Add Redis caching                      | 10x (300ms to 30ms)     | Medium  |
| Connection pooling                     | 3-7x throughput         | Low     |
| Enable response compression            | 5x transfer speed       | Low     |
| Parallelize independent calls          | 2-3x for multi-call APIs| Medium  |
| Async non-critical work                | 2-5x perceived latency  | Medium  |
| Switch JSON to Protobuf (internal)     | 5-7x serialization      | High    |
| HTTP/2 multiplexing                    | 1.5-3x for multi-request| Low     |
| Circuit breakers + timeouts            | Prevents 30s+ hangs     | Low     |
| Pagination (100K to 20 rows)           | 50-100x response size   | Low     |
| Sparse field selection                 | 5-10x payload reduction | Medium  |
| GC tuning (ZGC/Shenandoah)            | 10-1000x pause reduction| Medium  |
| Edge caching / CDN                     | 60-70% latency reduction| Medium  |

### Compression Quick Reference

| Format   | Compression Ratio | Speed     | Browser Support | Best For             |
|----------|-------------------|-----------|-----------------|----------------------|
| gzip     | 60-70%            | Fast      | 99%+            | Dynamic API responses|
| Brotli   | 65-80%            | Moderate  | 96%             | Static + API (pre-compress)|
| zstd     | 65-75%            | Very fast | Growing         | Internal services    |
| Protobuf | 70-90% vs JSON    | Very fast | N/A (binary)    | Service-to-service   |

### Serialization Quick Reference

| Format      | Serialize Speed | Deserialize Speed | Wire Size | Human Readable | Schema Required |
|-------------|-----------------|-------------------|-----------|----------------|-----------------|
| JSON        | 1x (baseline)   | 1x (baseline)     | 1x        | Yes            | No              |
| Protobuf    | 5-7x faster     | 5-7x faster       | 0.1-0.3x  | No             | Yes (.proto)    |
| FlatBuffers | 10x+ faster     | Zero-copy          | 0.2-0.4x  | No             | Yes (.fbs)      |
| MessagePack | 2-3x faster     | 2-3x faster       | 0.5-0.7x  | No             | No              |
| Avro        | 3-5x faster     | 3-5x faster       | 0.2-0.4x  | No             | Yes (.avsc)     |

---

## Sources

- [Amazon: Every 100ms of latency costs 1% in sales](https://www.gigaspaces.com/blog/amazon-found-every-100ms-of-latency-cost-them-1-in-sales/)
- [P50 vs P95 vs P99 Latency Explained](https://oneuptime.com/blog/post/2025-09-15-p50-vs-p95-vs-p99-latency-percentiles/view)
- [Mastering Latency Metrics: P90, P95, P99](https://medium.com/javarevisited/mastering-latency-metrics-p90-p95-p99-d5427faea879)
- [API Response Time Standards](https://odown.com/blog/api-response-time-standards/)
- [Tail Latency: Key in Large-Scale Distributed Systems](https://last9.io/blog/tail-latency/)
- [What Is P99 Latency?](https://aerospike.com/blog/what-is-p99-latency/)
- [How to Reduce Long-Tail Latency in Microservices](https://sysctl.id/reduce-long-tail-latency-microservices/)
- [Global Payments: Request Hedging with DynamoDB](https://aws.amazon.com/blogs/database/how-global-payments-inc-improved-their-tail-latency-using-request-hedging-with-amazon-dynamodb/)
- [Fanouts and Percentiles](https://paulcavallaro.com/blog/fanouts-and-percentiles/)
- [Why Tail Latencies Matter](https://www.gomomento.com/blog/why-tail-latencies-matter/)
- [How to Minimize Latency and Cost in Distributed Systems](https://www.infoq.com/articles/minimize-latency-cost-distributed-systems/)
- [Monolith vs Microservices 2025](https://medium.com/@pawel.piwosz/monolith-vs-microservices-2025-real-cloud-migration-costs-and-hidden-challenges-8b453a3c71ec)
- [Improve Database Performance with Connection Pooling](https://stackoverflow.blog/2020/10/14/improve-database-performance-with-connection-pooling/)
- [PostgreSQL Performance with PgBouncer](https://opstree.com/blog/2025/10/07/postgresql-performance-with-pgbouncer/)
- [Azure PostgreSQL Connection Pooling Best Practices](https://azure.microsoft.com/en-us/blog/performance-best-practices-for-using-azure-database-for-postgresql-connection-pooling/)
- [N+1 Query Problem Explained](https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it)
- [Solving the N+1 Query Problem](https://dev.to/vasughanta09/solving-the-n1-query-problem-a-developers-guide-to-database-performance-321c)
- [Benchmarking JSON vs Protobuf vs FlatBuffers](https://medium.com/@harshiljani2002/benchmarking-data-serialization-json-vs-protobuf-vs-flatbuffers-3218eecdba77)
- [Beating JSON Performance with Protobuf](https://auth0.com/blog/beating-json-performance-with-protobuf/)
- [Protobuf vs JSON: Performance and Efficiency](https://www.gravitee.io/blog/protobuf-vs-json)
- [HTTP/2 vs HTTP/1.1 Performance](https://www.cloudflare.com/learning/performance/http2-vs-http1.1/)
- [Brotli vs Gzip Compression](https://www.debugbear.com/blog/http-compression-gzip-brotli)
- [REST API Compression with Gzip and Brotli](https://zuplo.com/learning-center/implementing-data-compression-in-rest-apis-with-gzip-and-brotli)
- [AWS Lambda Cold Start Optimization 2025](https://zircon.tech/blog/aws-lambda-cold-start-optimization-in-2025-what-actually-works/)
- [Lambda Cold Starts Benchmark](https://maxday.github.io/lambda-perf/)
- [Redis Edge Caching: 5ms Global Latency](https://upstash.com/blog/edge-caching-benchmark)
- [ElastiCache Redis 7.1: 500M+ RPS](https://aws.amazon.com/blogs/database/achieve-over-500-million-requests-per-second-per-cluster-with-amazon-elasticache-for-redis-7-1/)
- [Cache Optimization Strategies](https://redis.io/blog/guide-to-cache-optimization-strategies/)
- [GC Optimization for High-Throughput Java](https://engineering.linkedin.com/garbage-collection/garbage-collection-optimization-high-throughput-and-low-latency-java-applications)
- [Taming Go's Garbage Collector](https://dev.to/jones_charles_ad50858dbc0/taming-gos-garbage-collector-for-blazing-fast-low-latency-apps-24an)
- [GC Impact on Application Performance](https://www.azul.com/blog/garbage-collection-application-performance-impact/)
- [API Latency and P99 Tuning Lab](https://github.com/fourcoretech/api-latency-and-p99-tuning-lab)
- [How to Increase API Performance](https://zuplo.com/blog/2025/01/30/increase-api-performance)
