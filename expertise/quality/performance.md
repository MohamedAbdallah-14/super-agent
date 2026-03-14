# Performance Engineering -- Expertise Module

> A performance engineer ensures systems meet speed, scalability, and reliability targets across the full stack -- from browser paint to database query to infrastructure capacity.
> Scope spans defining performance budgets and SLOs, profiling and optimizing frontend/backend/database/network layers, load testing, capacity planning, caching architecture, and continuous performance monitoring in production.

---

## Core Patterns & Conventions

### Performance Budgets & SLOs

Performance budgets are hard limits on metrics that block deployment when exceeded. SLOs (Service Level Objectives) are reliability targets derived from SLIs (Service Level Indicators) that define acceptable user experience.

**Establishing SLOs:**

| Metric | Typical SLO | Measurement |
|---|---|---|
| Availability | 99.9% (8.7h downtime/year) | Successful responses / total requests |
| API latency (p50) | < 100ms | Median response time |
| API latency (p95) | < 250ms | 95th percentile response time |
| API latency (p99) | < 500ms | 99th percentile response time |
| Error rate | < 0.1% | 5xx responses / total responses |
| Throughput | Varies by service | Requests per second at target latency |

**Error budget model:** If your SLO is 99.9% availability over 30 days, your error budget is 0.1% -- roughly 43 minutes of downtime per month. A burn rate > 1.0 means the budget will be exhausted before the window ends. Track burn rate to decide when to freeze deployments vs. ship features.

**Performance budget examples (frontend):**

- Total JavaScript bundle: < 200 KB gzipped
- Total page weight: < 1.5 MB on initial load
- Time to Interactive: < 3.5s on 4G connection
- Maximum third-party script size: < 50 KB

### Core Web Vitals (CWV)

Google's Core Web Vitals are the primary frontend performance metrics, measured at the 75th percentile of real user data.

| Metric | Good | Needs Improvement | Poor | What It Measures |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s -- 4.0s | > 4.0s | Perceived load speed |
| **INP** (Interaction to Next Paint) | < 200ms | 200ms -- 500ms | > 500ms | Input responsiveness |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 -- 0.25 | > 0.25 | Visual stability |

INP replaced FID (First Input Delay) in March 2024. As of 2026, INP remains the most commonly failed Core Web Vital -- 43% of sites fail the 200ms threshold.

**LCP optimization checklist:**
- Preload the LCP image with `<link rel="preload" as="image">`
- Inline critical CSS, defer non-critical stylesheets
- Preload fonts with `font-display: swap`
- Use server-side rendering (SSR) or static generation for above-the-fold content
- Eliminate render-blocking JavaScript from the `<head>`

**INP optimization checklist:**
- Break long tasks (> 50ms) into smaller chunks using `scheduler.yield()` or `setTimeout`
- Defer non-critical JavaScript execution
- Minimize DOM size (target < 1,500 nodes)
- Use `requestIdleCallback` for low-priority work
- Debounce/throttle high-frequency event handlers

**CLS optimization checklist:**
- Set explicit `width` and `height` on all images, videos, and iframes
- Reserve space for ad slots and dynamic content with CSS `aspect-ratio` or `min-height`
- Use `font-display: optional` or `font-display: swap` with size-adjust
- Avoid inserting content above existing visible content

### Backend Performance Metrics

**Latency percentiles matter more than averages.** An average of 100ms can hide a p99 of 3 seconds. P99 captures the experience of the unluckiest 1% of users -- the tail latency that damages reputation and triggers cascading failures.

**Key backend metrics:**

| Metric | What It Tells You | Target (typical API) |
|---|---|---|
| p50 latency | Median experience | < 100ms |
| p95 latency | Vast majority experience | < 250ms |
| p99 latency | Worst reasonable case | < 500ms |
| Throughput (RPS) | Capacity under load | Service-dependent |
| Error rate | Reliability signal | < 0.1% |
| Saturation | Resource utilization | CPU < 70%, memory < 80% |

**Apdex score:** A standardized measure of user satisfaction: `(satisfied + tolerating/2) / total`. Target: > 0.9. Satisfied threshold is typically 500ms for web apps.

### Caching Strategies

Caching is the single highest-leverage performance optimization. Apply caching in layers, each with different trade-offs.

| Pattern | Mechanism | Pros | Cons | Best For |
|---|---|---|---|---|
| **Cache-Aside** | App checks cache; on miss, fetches DB, populates cache | Only caches requested data; cache-failure resilient | First request slow; staleness risk | Read-heavy, eventual consistency OK |
| **Write-Through** | App writes cache + DB simultaneously | Always consistent; no stale reads | Higher write latency; caches unread data | Data read immediately after write |
| **Write-Behind** | App writes cache only; async flush to DB | Lowest write latency; absorbs spikes | Data loss risk on cache failure | High-write throughput (counters, analytics) |

**Caching layer selection:**

| Layer | TTL | Scope | Best For |
|---|---|---|---|
| **Browser cache** | Minutes to days | Single user | Static assets, API responses with Cache-Control |
| **CDN** (Cloudflare, CloudFront) | Minutes to hours | All users in region | Static assets, HTML pages, API responses |
| **Application cache** (Redis, Memcached) | Seconds to hours | All app instances | Session data, computed results, API responses |
| **Database cache** (query cache, materialized views) | Varies | Database level | Expensive aggregations, repeated queries |

**Cache invalidation:** TTL-based (simple, tolerates staleness), event-driven (publish invalidation on mutation), version-based (hash in cache key), tag-based (group entries, invalidate by tag).

### Database Query Optimization

90% of database performance problems come from 10% of queries. Inefficient SQL accounts for 63% of performance issues.

**EXPLAIN plan analysis:**
- Use `EXPLAIN` for quick estimates during development
- Use `EXPLAIN ANALYZE` for accurate measurements (actually executes the query)
- Watch for: sequential scans on large tables, nested loop joins on > 100K rows, high row estimates vs. actuals

**Index strategy:** Index columns in WHERE/JOIN/ORDER BY/GROUP BY. Use composite indexes (leftmost prefix rule). Avoid over-indexing (slows writes). Use partial indexes for constant-condition filters and covering indexes (INCLUDE) to avoid table lookups.

**Query optimization:** Never `SELECT *` in production. Avoid functions on indexed columns in WHERE. Use `EXISTS` over `IN` for correlated subqueries. Replace OFFSET pagination with cursor/keyset. Batch inserts (`INSERT ... VALUES` with multiple rows). Use connection pooling (PgBouncer, HikariCP).

**Slow query detection:** PostgreSQL: `pg_stat_statements`, `auto_explain`, `log_min_duration_statement`. MySQL: slow query log, Performance Schema. SQL Server: Query Store, Extended Events.

### Network Optimization

**Protocols:** HTTP/2 (multiplexed streams, header compression) for all web traffic. HTTP/3/QUIC (UDP-based, 0-RTT resumption) where CDN supports it.

**Compression:** Brotli (`br`) for static assets (20-26% smaller than gzip). Gzip as fallback for dynamic content.

**Connections:** Pool database and HTTP client connections. Enable keep-alive. Use `dns-prefetch` and `preconnect` for critical third-party origins. Minimize unique domain count.

### Frontend Performance

**Code splitting:** Split by route (each page = own bundle). Dynamic `import()` for below-the-fold components. `loading="lazy"` for below-fold images; `loading="eager"` for LCP image. Preload critical resources with `<link rel="preload">`.

**Images:** Serve WebP/AVIF via `<picture>` (30-50% smaller than JPEG/PNG). Use `srcset`/`sizes` for responsive images. Resize server-side. Use image CDNs (Cloudinary, imgix) for on-the-fly optimization.

**JavaScript:** Tree-shake (ESM imports, not CJS). `defer`/`async` for non-critical scripts. Web Workers for CPU-intensive tasks. `requestAnimationFrame` for visual updates.

**CSS:** Inline critical CSS above the fold. Async-load the rest via `media="print" onload="this.media='all'"`. Purge unused CSS (PurgeCSS, Tailwind JIT).

### API Performance

**Pagination:** Cursor-based for large datasets (stable, O(1) seek). Return `next_cursor`; page size 20-100.

**N+1 prevention:** GraphQL: DataLoader batches `.load(key)` into `WHERE id IN (...)` -- up to 85% response time reduction. New DataLoader per request. REST: batch endpoints (`POST /batch`).

**Response optimization:** `ETag`/`If-None-Match` for 304s. Brotli/gzip compression. Sparse fieldsets (`?fields=id,name`).

### Async Processing

**When to go async:** Any operation > 500ms outside the critical response path (email, PDF generation, image processing, analytics, slow third-party calls).

**Patterns:** Message queues (RabbitMQ, SQS, Kafka) for decoupling. Background jobs (Celery, Sidekiq, BullMQ) for retry/scheduling. Event-driven architecture for downstream triggers. Webhooks with retry for external notifications.

---

## Anti-Patterns & Pitfalls

### 1. Optimizing Without Profiling
**Why it is a problem:** Developers guess where bottlenecks are and waste time optimizing code paths that contribute < 1% of total latency. Always profile first, then optimize the measured hotspot. "Premature optimization is the root of all evil" -- Knuth.

### 2. Ignoring Tail Latency (p99/p999)
**Why it is a problem:** Average latency hides outliers. A service with 50ms average but 5s p99 has 1% of users waiting 100x longer. Tail latency cascades in microservices -- if Service A calls Service B at p99, combined latency explodes. Monitor p95/p99, not just averages.

### 3. N+1 Query Problem
**Why it is a problem:** Fetching a list of N items and then issuing a separate query for each item's related data produces N+1 database round-trips. Response time grows linearly with data size. Solve with JOINs, DataLoader, or eager loading.

### 4. Missing or Wrong Indexes
**Why it is a problem:** A missing index on a frequently queried column forces full table scans. On a 10M row table, this turns a 1ms lookup into a 500ms+ scan. Conversely, too many indexes slow writes and waste storage.

### 5. Unbounded Queries
**Why it is a problem:** `SELECT * FROM orders` with no LIMIT or WHERE clause on a large table returns millions of rows, exhausting memory and blocking connections. Always paginate, always set limits.

### 6. Synchronous Processing in the Request Path
**Why it is a problem:** Sending emails, generating reports, or calling slow third-party APIs synchronously blocks the response. Users wait for work that does not affect the response they need. Offload to background jobs.

### 7. Cache Stampede (Thundering Herd)
**Why it is a problem:** When a popular cache key expires, hundreds of concurrent requests all miss the cache simultaneously and hit the database. Use lock-based recomputation (only one request refills cache), probabilistic early expiry, or stale-while-revalidate patterns.

### 8. Over-Caching Without Invalidation Strategy
**Why it is a problem:** Caching aggressively without a plan for invalidation leads to stale data, user confusion, and hard-to-debug inconsistencies. Every cache entry needs a defined TTL and/or an event-driven invalidation trigger.

### 9. No Connection Pooling
**Why it is a problem:** Creating a new database connection per request adds 20-50ms of overhead (TCP handshake + TLS + auth). Under load, connection creation overwhelms the database. Use connection pools (PgBouncer, HikariCP, `asyncpg` pool).

### 10. Blocking the Event Loop / Main Thread
**Why it is a problem:** In Node.js/Python async or browser JavaScript, CPU-intensive synchronous work blocks all other operations. A 100ms synchronous computation blocks 100ms of I/O. Use worker threads, Web Workers, or break into yielding chunks.

### 11. OFFSET-Based Pagination at Scale
**Why it is a problem:** `OFFSET 100000 LIMIT 20` still scans and discards 100,000 rows. Performance degrades linearly with page depth. Use cursor/keyset pagination instead.

### 12. Not Setting Timeouts
**Why it is a problem:** Without timeouts, a single slow downstream service can hold connections indefinitely, exhausting the connection pool and cascading failures across the system. Set timeouts on every external call: HTTP, database, cache, queues.

### 13. Loading Everything on Initial Page Load
**Why it is a problem:** Bundling all JavaScript, CSS, and images into the initial load delays Time to Interactive. Users on mobile/3G connections suffer most. Use code splitting, lazy loading, and progressive enhancement.

### 14. Ignoring Payload Size
**Why it is a problem:** Returning entire database rows when the client needs two fields wastes bandwidth and serialization time. A 50 KB JSON response that could be 2 KB adds up to gigabytes of wasted transfer daily at scale. Use field selection and projection.

### 15. Testing Only Happy Path Performance
**Why it is a problem:** Performance at 10 RPS tells you nothing about behavior at 10,000 RPS. Systems exhibit non-linear degradation: latency often spikes exponentially past a saturation point. Test at expected peak, 2x peak, and failure scenarios.

---

## Testing Strategy

### Load Testing Tools

| Tool | Language | Protocol Support | Best For |
|---|---|---|---|
| **k6** (Grafana) | JavaScript | HTTP, WebSocket, gRPC | Developer-friendly, CI integration |
| **Locust** | Python | HTTP, custom protocols | Python teams, custom load shapes |
| **Gatling** | Scala/Java | HTTP, WebSocket, JMS | Enterprise Java, detailed reports |
| **Artillery** | JavaScript/YAML | HTTP, WebSocket, Socket.io | Quick YAML-based tests, serverless |
| **JMeter** | Java | HTTP, JDBC, LDAP, FTP | Legacy, protocol variety |

### Load Test Patterns

| Pattern | Description | Duration | Purpose |
|---|---|---|---|
| **Ramp-up** | Gradually increase VUs 0 to target | 5-10 min ramp | Find latency degradation point |
| **Stress** | Push 2-5x beyond expected peak | 10-30 min | Find breaking point and failure mode |
| **Spike** | Sudden jump (50 to 500 VUs in 10s) | 5-15 min | Validate auto-scaling, queue behavior |
| **Soak** | Moderate load (60-80% capacity) | 4-12 hours | Detect memory leaks, pool exhaustion |
| **Breakpoint** | Continuously increase until failure | Until crash | Determine absolute max capacity |

### Performance Regression Testing in CI

Run baseline k6/Lighthouse on every PR. Define pass/fail thresholds (`http_req_duration{p(95)} < 300ms`). Store historical results to detect trends. Keep CI tests < 10 min; soak tests nightly.

### Synthetic Monitoring vs. RUM

**Synthetic monitoring** (Pingdom, Checkly, Datadog Synthetics): Simulated requests from known locations every 1-5 min. Consistent baseline, detects outages 24/7. Does not capture real device/network variance.

**Real User Monitoring** (Datadog RUM, SpeedCurve, Sentry): Actual user browsers/devices on every page load. Real-world CWV data. Noisy, requires traffic volume.

**Best practice:** Use both. Synthetic for baseline/alerting; RUM for actual user experience.

### Benchmark Methodology

**Warm-up:** 2-5 min warm-up before measuring (JIT, cache, pool init). **Repetition:** Run 3+ times; report median and stddev; discard > 2 stddev outliers. **Controlled environment:** Pin instance types/region; disable auto-scaling. **Realistic data:** Use production-like volumes (100 rows tells nothing about 10M).

---

## Performance Considerations (Deep Dive)

### Profiling Tools by Domain

| Domain | Tools | Purpose |
|---|---|---|
| **Frontend** | Lighthouse, Chrome DevTools Performance, WebPageTest, SpeedCurve | CWV audits, flame charts, filmstrip analysis, continuous RUM |
| **Backend** | Flamegraphs (async-profiler, py-spy, perf), Datadog APM, New Relic, Jaeger | CPU visualization, distributed tracing, service maps |
| **Database** | `EXPLAIN ANALYZE`, `pg_stat_statements`, slow query log, pganalyze, Percona PMM | Query plans, top queries by time, continuous analysis |
| **Infra** | `top`/`htop`, `vmstat`, `iostat`, `perf`, `strace`/`dtrace`, `ss` | CPU, memory, disk I/O, syscalls, network state |

### Memory Leak Detection

**Symptoms:** Gradually increasing RSS over hours/days, OOM kills, growing GC pauses.

**Approach:** Monitor RSS over time (upward trend = leak). Take heap snapshots at intervals (Chrome DevTools for JS, `jmap` for Java, `tracemalloc` for Python). Compare snapshots -- growing object counts by type reveal the source. Common causes: unclosed connections, caches without eviction, event listener accumulation.

### CPU Profiling Patterns

- **Sampling** (~2-5% overhead): Sample call stack periodically. Safe for production. Tools: async-profiler, py-spy, perf.
- **Instrumentation** (high overhead): Wraps every function. Dev only. Tools: cProfile, JProfiler.
- **Continuous profiling**: Always-on sampling. Services: Datadog Continuous Profiler, Pyroscope, Google Cloud Profiler.
- **Flamegraphs**: Wide plateaus = most CPU time. Optimize the widest bars first.

### I/O Optimization

Use async I/O (epoll, io_uring, kqueue) over thread-per-connection. Batch small writes to reduce syscall overhead. Memory-mapped files for large sequential reads. Monitor `iowait` with `iostat` -- high values indicate I/O-bound workload.

---

## Security Considerations

### DDoS Protection

CDN-level filtering (Cloudflare, AWS Shield, Akamai) absorbs volumetric attacks at the edge. Apply per-IP/per-path rate limits at CDN/load balancer. Use anycast routing to distribute attack traffic. Deploy challenge pages (CAPTCHA/JS) for suspicious patterns.

### Rate Limiting

**Token bucket** (sustained rate + burst) for APIs. **Sliding window** for smooth enforcement. Apply per API key, user ID, IP, and endpoint. Return `429 Too Many Requests` with `Retry-After`. Separate limits for reads vs. writes. Enforce at reverse proxy (Nginx, HAProxy, API Gateway) -- not in app code.

### Resource Exhaustion Prevention

Max request body size (e.g., 10 MB). Limit concurrent connections per client. GraphQL: depth limits + cost analysis. Timeouts at every layer. Backpressure: reject work when queues exceed capacity rather than buffering unboundedly.

### Timeouts and Circuit Breakers

**Timeout hierarchy:** Connection timeout (3s) -> Read/response timeout (10s) -> Total request timeout with retries (30s). Set all three on every external call.

**Circuit breaker:** Closed (normal, tracking failures) -> Open (failures > threshold, e.g. 50% in 10s; return fallback immediately) -> Half-Open (after 30s cooldown, probe with few requests; success = close, failure = reopen).

---

## Integration Patterns

### APM Tools Integration

| Tool | Key Strength | Agent |
|---|---|---|
| **Datadog APM** | Trace/log/metric correlation | `dd-trace` libraries |
| **New Relic** | Full-stack observability | Language agents (Java, Node, Python, Go, Ruby) |
| **Dynatrace** | AI root cause analysis (Davis AI) | OneAgent per host |

**Common setup:** Install language agent, set service name + environment tags, configure sampling (100% staging, 10-20% production).

### OpenTelemetry for Distributed Tracing

OTel is the vendor-neutral standard: `Application --> OTel SDK --> OTel Collector --> Backend (Jaeger/Datadog/New Relic)`.

**Best practices:** Use OTel Collector as centralized pipeline (not direct vendor export). Auto-instrumentation agents for 80% coverage. Enrich spans with business context (user ID, order ID). Add attributes at span creation for SDK sampling. Tail-based sampling: keep all error traces, sample 10% of successes. Correlate traces with logs via trace_id/span_id.

### Real User Monitoring (RUM)

Inject lightweight JS snippet (< 10 KB). Capture page load timing, CWV, JS errors, interactions. Segment by device, browser, geography, connection speed. Tools: Datadog RUM, SpeedCurve, Sentry Performance.

### CDN Integration

| CDN | Strengths | Configuration |
|---|---|---|
| **Cloudflare** | DDoS protection, Workers (edge compute), free tier | DNS proxy, page rules, cache rules |
| **CloudFront** | AWS integration, Lambda@Edge | Origin groups, behaviors, cache policies |
| **Fastly** | Real-time purging, VCL/Compute@Edge | Instant purge API, edge dictionaries |

**CDN cache tips:** `Cache-Control: public, max-age=31536000, immutable` for hashed assets. `s-maxage` for CDN-specific TTL. `Surrogate-Key` (Fastly) or cache tags for purging. `stale-while-revalidate` for background refresh.

### Database Connection Pooling

**PgBouncer** (PostgreSQL): Transaction-level pooling; 10K app connections to 50 DB connections. **HikariCP** (JVM): `maximumPoolSize = (core_count * 2) + disk_spindles`. **asyncpg** pool (Python): `min_size=10, max_size=20` starting point. Monitor: active/idle connections, wait time, timeouts. Alert when wait time > 100ms.

---

## DevOps & Deployment

### Performance CI/CD Gates

```yaml
# Lighthouse CI gate (GitHub Actions)
- uses: treosh/lighthouse-ci-action@v12
  with:
    urls: "https://staging.example.com/"
    budgetPath: ./lighthouse-budget.json

# k6 load test gate
- run: k6 run --out json=results.json -e BASE_URL=$STAGING_URL tests/load/api-test.js
  env: { K6_THRESHOLDS: '{"http_req_duration{p(95)}":["max<300"]}' }
```

Fail builds if p95 > 300ms or Lighthouse < 90. Store results historically. Full soak tests nightly.

### Auto-Scaling Strategies

| Strategy | Trigger | Best For | Tool |
|---|---|---|---|
| **HPA** (Horizontal Pod Autoscaler) | CPU/memory utilization | Stateless web services | Kubernetes built-in |
| **VPA** (Vertical Pod Autoscaler) | Resource request adjustment | Right-sizing pods | Kubernetes add-on |
| **KEDA** | Event-driven (queue depth, custom metrics) | Background workers, event consumers | CNCF graduated project |
| **Lambda concurrency** | Invocation rate | Serverless functions | AWS Lambda |
| **Target tracking** | Request count per target | Load-balanced services | AWS Auto Scaling |

**HPA guidance:** Target 60-70% CPU utilization. `minReplicas` >= 2 for availability. `stabilizationWindowSeconds` prevents flapping (300s default for scale-down). Prefer KEDA for queue-based workloads (scale to zero when idle).

### Blue/Green and Canary for Performance Validation

**Canary:** Route 5-10% to new version; compare p95/error rate for 15-30 min before promoting. **Blue/green:** Load test green before switching; instant rollback available. **Feature flags:** Ramp 1% -> 10% -> 50% -> 100%. **Auto-rollback:** If canary p99 exceeds baseline by > 20% or error rate exceeds SLO, rollback within 5 min.

### Performance Monitoring Dashboards (Grafana)

**Essential panels:** Request rate (RPS) + error rate overlay. Latency lines (p50/p95/p99). Saturation (CPU, memory, disk I/O, pool utilization). Error budget burn rate. Top 10 slowest endpoints. Deployment markers as vertical annotations.

### Alerting on Performance Degradation

**Alert tiers:**

| Severity | Condition | Response |
|---|---|---|
| **P1 (Page)** | p99 > 5s for 5 min OR error rate > 5% | Immediate on-call response |
| **P2 (Alert)** | p95 > 500ms for 15 min OR error rate > 1% | Respond within 1 hour |
| **P3 (Warn)** | p50 > 200ms for 30 min | Investigate during business hours |
| **P4 (Info)** | Weekly p95 trend increasing > 10% | Review in next sprint planning |

**Multi-window alerting:** Use burn-rate alerts (e.g., Google SRE approach): alert when the error budget is being consumed at 14.4x the sustainable rate over a 1-hour window AND 6x over a 6-hour window. This catches both sudden spikes and slow degradation while minimizing false positives.

---

## Decision Trees

### Decision Tree 1: Where Is the Bottleneck?

```
User reports slowness
|
+--> Check DevTools Network tab
|    +--> Large assets / many requests? --> Frontend: optimize images, code split, compress
|    +--> Slow TTFB (> 600ms)? --> Backend bottleneck, check APM:
|         +--> Slow DB queries? --> EXPLAIN ANALYZE, add indexes
|         +--> Slow external APIs? --> Cache, circuit breaker, go async
|         +--> High CPU? --> Flamegraph, optimize algorithm or scale out
|         +--> High memory / GC? --> Heap snapshot, fix leak or upsize
```

### Decision Tree 2: Which Caching Layer?

```
What are you caching?
|
+--> Static assets? --> CDN + browser cache (immutable, content-hash filenames)
+--> HTML pages?
|    +--> Rarely changes? --> CDN, short TTL + purge on publish
|    +--> Personalized? --> Redis with user-keyed entries (no CDN)
+--> API responses?
|    +--> Same for all users? --> CDN (Surrogate-Key purging)
|    +--> User-specific? --> Redis with user-scoped keys
|    +--> Expensive compute? --> Redis + TTL + background refresh
+--> DB query results?
     +--> Aggregations? --> Materialized views + periodic refresh
     +--> Repeated queries? --> Redis with query-hash keys
     +--> Hot config rows? --> In-process LRU cache, short TTL
```

### Decision Tree 3: Scale Up vs. Scale Out?

```
System at capacity
|
+--> CPU-bound?
|    +--> Parallelizable? --> Scale OUT (more instances)
|    +--> Single-threaded? --> Scale UP (faster CPU) or refactor
+--> Memory-bound?
|    +--> Fits in larger instance? --> Scale UP
|    +--> Can partition? --> Scale OUT (shard)
+--> I/O-bound?
|    +--> Disk I/O? --> Scale UP (NVMe) or add read replicas
|    +--> Network I/O? --> Scale OUT behind load balancer
+--> Connection-bound?
|    +--> Add pooling first, then Scale OUT if still saturated
+--> General: Stateless = OUT, Stateful = UP then shard. Always optimize first.
```

---

## Code Examples

### Example 1: Redis Cache-Aside Pattern (Python / FastAPI)

```python
import redis.asyncio as redis
import json
from fastapi import FastAPI, Depends

app = FastAPI()
cache = redis.Redis(host="localhost", port=6379, decode_responses=True)

async def get_user(user_id: int) -> dict:
    # 1. Check cache
    cache_key = f"user:{user_id}"
    cached = await cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Cache miss -- fetch from DB
    user = await db.fetch_one("SELECT * FROM users WHERE id = $1", user_id)
    if user:
        # 3. Populate cache with 5-minute TTL
        await cache.set(cache_key, json.dumps(dict(user)), ex=300)
    return dict(user)

async def invalidate_user_cache(user_id: int):
    """Call this after any user mutation."""
    await cache.delete(f"user:{user_id}")
```

### Example 2: Database Connection Pooling (Node.js / PostgreSQL)

```javascript
import pg from "pg";
const pool = new pg.Pool({
  host: process.env.DB_HOST, database: "myapp",
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  min: 5, max: 20,                        // Pool size bounds
  idleTimeoutMillis: 30000,                // Close idle after 30s
  connectionTimeoutMillis: 3000,           // Fail connect after 3s
  statement_timeout: 10000,                // Kill queries > 10s
});
pool.on("error", (err) => console.error("Pool error:", err));

async function getOrders(userId) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT id, total, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [userId]
    );
    return rows;
  } finally { client.release(); }         // Always release back to pool
}
```

### Example 3: k6 Load Test Script with Thresholds

```javascript
// tests/load/api-test.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 50 },   // Ramp up to 50 VUs
    { duration: "5m", target: 50 },   // Hold at 50 VUs
    { duration: "2m", target: 200 },  // Spike to 200 VUs
    { duration: "5m", target: 200 },  // Hold at 200 VUs
    { duration: "2m", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: [
      "p(50)<100",   // p50 < 100ms
      "p(95)<300",   // p95 < 300ms
      "p(99)<500",   // p99 < 500ms
    ],
    http_req_failed: ["rate<0.01"],  // Error rate < 1%
    http_reqs: ["rate>100"],         // Throughput > 100 RPS
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

  // Simulate realistic user flow
  const listRes = http.get(`${BASE_URL}/api/products?limit=20`);
  check(listRes, {
    "list status is 200": (r) => r.status === 200,
    "list has products": (r) => JSON.parse(r.body).length > 0,
  });

  sleep(1); // Think time between requests

  const detailRes = http.get(`${BASE_URL}/api/products/1`);
  check(detailRes, {
    "detail status is 200": (r) => r.status === 200,
  });

  sleep(0.5);
}
```

### Example 4: React Lazy Loading with Suspense

```jsx
import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";

// Route-based code splitting -- each page loads only its own JS chunk
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  return (
    <Suspense fallback={<div className="skeleton-loader" />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}

// Preload on hover for perceived performance
const NavLink = ({ to, children }) => (
  <Link to={to} onMouseEnter={() => { if (to === "/dashboard") import("./pages/Dashboard"); }}>
    {children}
  </Link>
);
```

### Example 5: OpenTelemetry Setup (Node.js)

```javascript
// tracing.js -- import before all other modules
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({ [ATTR_SERVICE_NAME]: "my-api-service" }),
  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4317",   // Send to Collector, not directly to vendor
  }),
  instrumentations: [getNodeAutoInstrumentations()],  // HTTP, Express, PG, Redis auto-traced
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown().then(() => process.exit(0)));
```

---

*Researched: 2026-03-07 | Sources: [web.dev Core Web Vitals](https://web.dev/articles/defining-core-web-vitals-thresholds), [Google SRE Workbook -- Implementing SLOs](https://sre.google/workbook/implementing-slos/), [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/), [OpenTelemetry Docs](https://opentelemetry.io/docs/concepts/observability-primer/), [AWS Redis Caching Patterns](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html), [Aerospike P99 Latency](https://aerospike.com/blog/what-is-p99-latency/), [GraphQL DataLoader](https://www.graphql-js.org/docs/n1-dataloader/), [Kubernetes HPA Docs](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/), [KEDA](https://keda.sh/), [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci), [Nobl9 SLO Best Practices](https://www.nobl9.com/service-level-objectives/slo-best-practices), [Spectro Cloud -- Kubernetes Autoscaling Patterns](https://www.spectrocloud.com/blog/kubernetes-autoscaling-patterns-hpa-vpa-and-keda)*
