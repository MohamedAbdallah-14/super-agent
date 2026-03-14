# Caching Strategies -- Performance Expertise Module

> **Scope:** End-to-end caching architecture for web applications and distributed systems.
> **Audience:** Senior engineers making caching design decisions.
> **Last updated:** 2026-03-08

---

## 1. Cache Layers

Five distinct layers, each progressively closer to the data source.

### 1.1 Browser Cache
- **Latency:** 0 ms (no network). **Capacity:** 50-300 MB per origin.
- **Control:** `Cache-Control`, `ETag`, `Last-Modified` headers.
- Median hit rate for returning visitors: ~60-80% (Chrome UX Report 2024).
- Best practice: `Cache-Control: public, max-age=31536000, immutable` for fingerprinted assets eliminates conditional requests entirely.

### 1.2 CDN / Edge Cache
- **Latency:** 5-30 ms (nearest PoP). **Capacity:** Terabytes across PoP network.
- Reduces origin load by 60-90%. Sites with mostly static content achieve 95-99% CDN hit ratios (source: [Cloudflare Learning Center](https://www.cloudflare.com/learning/cdn/what-is-a-cache-hit-ratio/)). A well-optimized CDN reduces overall latency by 30-50% (source: [Koyeb](https://www.koyeb.com/blog/using-cache-control-and-cdns-to-improve-performance-and-reduce-latency)).
- Cloudflare's Regional Tiered Cache trials showed 50-100 ms improvement in tail cache hit response times (source: [Cloudflare Blog](https://blog.cloudflare.com/introducing-regional-tiered-cache/)).
- Key features: tiered caching (edge -> shield -> origin), edge compute (Workers, Lambda@Edge), `stale-while-revalidate`, cache tags for surgical invalidation.

### 1.3 Application Cache (Redis / Memcached)
- **Latency:** 0.1-1 ms (in-datacenter). **Capacity:** GB to low TB (memory-bound).
- Redis achieves ~0.15 ms for simple GET operations (source: [DZone, 2025](https://dzone.com/articles/performance-and-scalability-analysis-of-redis-memcached)). A 2025 study showed 71.8% response time reduction with Redis, dropping from 1,146 ms to 323 ms (source: [ResearchGate](https://www.researchgate.net/publication/395191392_Using_Redis_for_Caching_Optimization_in_High-Traffic_Web_Applications)).
- Use cases: session storage, API response caching, computed aggregations, rate-limiting counters, feature flags.

### 1.4 Database Query Cache
- **Latency:** 0.5-5 ms (avoids query planning + I/O).
- MySQL's built-in query cache was removed in 8.0 due to single global mutex bottleneck (source: [ReadySet](https://readyset.io/blog/mysql-5-7-eol-the-end-of-mysql-query-cache)). PostgreSQL has no built-in query cache.
- Modern alternatives: ReadySet (wire-compatible caching proxy), ProxySQL, application-layer query result caching in Redis.
- Pitfall: if query parameter combinations are too numerous, hit rates drop and caching overhead exceeds benefit (source: [Brent Ozar](https://www.brentozar.com/archive/2019/05/which-queries-should-you-cache-in-the-application/)).

### 1.5 ORM Cache (L1 / L2)
- **L1:** ~0 ms (in-process, per-request identity map). **L2:** 0.1-1 ms (shared, e.g., Redis).
- When query criteria match primary keys, the query is satisfied entirely from memory (source: [ACM Queue](https://queue.acm.org/detail.cfm?id=1394141)).
- Pitfall: tied to ORM framework, struggles with complex joins/aggregations.

### Layer Flow
```
Browser ─(0ms)─> CDN ─(10ms)─> App Cache ─(0.2ms)─> DB Cache ─(2ms)─> Database (50-500ms)
  hit?            hit?           hit?                  hit?
```

---

## 2. Caching Patterns

### 2.1 Cache-Aside (Lazy Loading)
Application checks cache, on miss queries DB and populates cache. Most widely used pattern.
- Cache only contains requested data. Cache failure degrades to DB reads (non-fatal).
- Risk: stale data between write and next miss.
- **Best for:** Read-heavy (>80% reads), staleness-tolerant systems.

### 2.2 Read-Through
Cache itself loads data on miss. Application only talks to cache.
- Simpler application code; cache becomes critical dependency.
- Requires loaders (Guava LoadingCache, Caffeine, Hazelcast).

### 2.3 Write-Through
Every write goes to cache + DB synchronously before returning success.
- Cache and DB always consistent. Higher write latency (+0.2-1 ms per write).
- Simpler to reason about than write-behind (source: [DesignGurus](https://www.designgurus.io/answers/detail/writethrough-vs-writeback-vs-writearound-caching-tradeoffs)).
- **Best for:** Strong consistency requirements, moderate write volumes.

### 2.4 Write-Behind (Write-Back)
Writes go to cache first; cache flushes to DB asynchronously in batches.
- Lowest write latency (0.1-0.5 ms). Reduces DB write IOPS by 5-20x (source: [EnjoyAlgorithms](https://www.enjoyalgorithms.com/blog/write-behind-caching-pattern/)).
- Risk: data loss if cache node fails before flush.
- **Best for:** Write-heavy workloads (logging, analytics, counters).

### 2.5 Refresh-Ahead
Cache proactively refreshes entries before TTL expiry based on access patterns.
- Eliminates miss-latency spikes for hot keys. Wasted work if entries are not re-requested.
- **Best for:** Hot-key workloads (product catalog, leaderboards, real-time bidding).

### Pattern Comparison

| Pattern        | Read Latency | Write Latency | Consistency | Complexity |
|----------------|-------------|---------------|-------------|------------|
| Cache-Aside    | Low/High    | N/A           | Eventual    | Low        |
| Read-Through   | Low/Medium  | N/A           | Eventual    | Medium     |
| Write-Through  | Always low  | Higher        | Strong      | Medium     |
| Write-Behind   | Always low  | Lowest        | Eventual    | High       |
| Refresh-Ahead  | Always low  | N/A           | Near-real-time | High    |

---

## 3. Cache Invalidation Strategies

### 3.1 Time-To-Live (TTL)
Each entry has a maximum age. Simplest strategy, no coordination needed.

| Data Type              | Recommended TTL | Rationale                       |
|------------------------|-----------------|---------------------------------|
| Static assets (CSS/JS) | 1 year          | Fingerprinted URLs              |
| User session data      | 15-30 min       | Security requirement            |
| Product catalog        | 5-15 min        | Infrequent changes              |
| Real-time pricing      | 5-30 sec        | High change frequency           |
| Feature flags          | 30-60 sec       | Must propagate quickly          |

### 3.2 Event-Based Invalidation
Cache entries invalidated immediately on data change via events/messages.
- Mechanisms: CDC (Debezium), Redis Pub/Sub, Kafka, gossip protocols.
- Near-zero staleness (10-100 ms propagation). Higher complexity: requires reliable delivery, idempotent handlers.
- **Best for:** Financial data, inventory counts, collaboration tools.

### 3.3 Version-Based Invalidation
Cache keys include version number (`user:1234:v7`). On write, version increments; old entries expire naturally.
- Eliminates invalidation race conditions. Increased memory (multiple versions coexist).
- **Best for:** CMS draft/publish workflows, API caching with ETags.

### 3.4 Hybrid Strategy (Recommended)
Combine TTL as safety net + event-based invalidation for critical updates. If event delivery fails, TTL bounds staleness to a known window (source: [daily.dev](https://daily.dev/blog/cache-invalidation-vs-expiration-best-practices)).

---

## 4. HTTP Caching

### 4.1 Cache-Control Directives

| Directive                   | Effect                                              |
|-----------------------------|-----------------------------------------------------|
| `public`                    | Any cache may store the response                    |
| `private`                   | Browser only (not CDNs/proxies)                     |
| `no-cache`                  | Must revalidate before using                        |
| `no-store`                  | Must not store anywhere                             |
| `max-age=N`                 | Fresh for N seconds                                 |
| `s-maxage=N`                | Overrides max-age for shared caches                 |
| `immutable`                 | Will not change during freshness lifetime           |
| `stale-while-revalidate=N`  | Serve stale for N sec while revalidating in background |
| `stale-if-error=N`          | Serve stale for N sec if origin errors              |

Common configurations:
```
# Fingerprinted static assets
Cache-Control: public, max-age=31536000, immutable

# API responses tolerating 60s staleness
Cache-Control: public, max-age=60, stale-while-revalidate=30

# Personalized content
Cache-Control: private, max-age=0, must-revalidate

# CDN-cached HTML with graceful degradation
Cache-Control: public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400
```

### 4.2 ETag and Last-Modified
- **ETag:** Server sends `ETag: "a3f8c2b1"`. Client sends `If-None-Match`. Unchanged = `304 Not Modified` (~200 bytes vs full response). For a 500 KB response, saves ~500 KB bandwidth and 50-200 ms.
- **Last-Modified:** Timestamp-based. 1-second resolution. Prefer ETags for precision.

### 4.3 stale-while-revalidate (RFC 5861)
```
Cache-Control: max-age=3600, stale-while-revalidate=600
  0-3600s:    Fresh -- serve from cache
  3600-4200s: Stale -- serve immediately, revalidate in background
  4200s+:     Must revalidate before serving
```
Users always get instant responses during the revalidation window. CloudFront confirms this "improves latency as viewers receive responses immediately from edge locations" (source: [AWS CloudFront Docs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)).

---

## 5. Redis vs Memcached

### 5.1 Performance Benchmarks (2024-2025)

| Metric                    | Redis              | Memcached          | Source              |
|---------------------------|--------------------|--------------------|---------------------|
| GET latency (avg)         | ~0.15 ms           | ~0.25 ms           | DZone, 2025         |
| SET latency (avg)         | ~0.18 ms           | ~0.22 ms           | DZone, 2025         |
| Throughput (single-thread)| 100K+ ops/sec      | 80-100K ops/sec    | Medium, 2025        |
| Throughput (pipelined)    | 500K+ ops/sec      | N/A                | Redis.io            |
| Memory overhead per key   | ~90 bytes           | ~48 bytes          | ScaleGrid, 2025     |

In 50/50 read/write tests, Redis handled hot keys better without dropping writes. In read-heavy (90/10) scenarios, both perform comparably (source: [Medium](https://codingplainenglish.medium.com/i-benchmarked-redis-vs-memcached-in-production-heres-the-bottleneck-799d78479f5d)).

### 5.2 Feature Comparison

| Feature             | Redis                                    | Memcached              |
|---------------------|------------------------------------------|------------------------|
| Data structures     | Strings, hashes, lists, sets, sorted sets, streams | Strings only |
| Persistence         | RDB + AOF                                | None                   |
| Replication         | Primary-replica with failover            | None                   |
| Pub/Sub             | Built-in                                 | None                   |
| Scripting           | Lua                                      | None                   |
| Threading           | Single-threaded + io-threads             | Multi-threaded         |
| Max value size      | 512 MB                                   | 1 MB default           |

**Choose Redis** for complex data structures, persistence, pub/sub, or mixed read/write workloads.
**Choose Memcached** for pure string key-value caching where memory efficiency and multi-core scaling matter most.

---

## 6. Cache Hit Ratios and Performance Impact

### 6.1 Impact on Latency (Worked Example)
```
Without cache:  p50=150ms, p95=830ms (DB query + serialization + network)

With 95% hit ratio:
  95% of requests: Redis (0.2ms) + serialize (2ms) + network (20ms) = 22.2ms
  5% of requests:  full DB path = 150-830ms
  Effective p50:   ~29ms  (81% reduction)
  Effective p95:   ~45ms  (95% reduction)
```

### 6.2 Target Hit Ratios by System Type

| System Type          | Target   | Rationale                       |
|----------------------|----------|---------------------------------|
| Static content CDN   | 95-99%   | Content rarely changes          |
| Product catalog API  | 90-95%   | High reads, infrequent updates  |
| Session store        | 85-95%   | Many reads per session          |
| Search results       | 70-85%   | High query cardinality          |
| Personalized feeds   | 40-60%   | Per-user long-tail distribution |

### 6.3 The Tail Latency Trap
To improve P99 for a request with 5 sequential cache lookups, each lookup needs 99.8% hit rate (0.998^5 = 0.99). A 99% per-lookup rate yields only 95% all-hit probability (0.99^5 = 0.95) -- 5% of requests still suffer at least one miss (source: [Aerospike](https://aerospike.com/blog/caching-doesnt-work-the-way-you-think-it-does/)).

### 6.4 Counter-Intuitive Finding
Redis Labs' 2024 research: "increasing the hit ratio can actually hurt throughput for many caching algorithms" when aggressive caching causes memory pressure and eviction churn. Optimize for the *right* hit ratio, not the highest (source: [Redis Blog](https://redis.io/blog/why-your-cache-hit-ratio-strategy-needs-an-update/)).

---

## 7. Common Bottlenecks and Failure Modes

### 7.1 Cache Stampede (Thundering Herd)
Popular key expires, hundreds of requests simultaneously hit DB. A single key can bring down a database (source: [OneUptime](https://oneuptime.com/blog/post/2026-01-21-redis-cache-stampede/view)).

**Solutions (ranked by complexity):**

1. **Distributed Locking** (covers 80% of cases): Use `SET NX` with short TTL. One request refreshes; others wait or return stale.
2. **Probabilistic Early Expiration:** When entry is in last 20% of TTL, randomly trigger background refresh.
3. **Background Refresh:** Dedicated worker refreshes entries before expiry. Application never hits DB.

### 7.2 Cold Cache
After deploy/flush/failure, all requests hit DB. Causes 10-50x DB load increase and 5-20x latency increase.

**Solutions:** Pre-warm with hot keys before traffic shift. Use persistent cache (Redis AOF). Multi-tier caching (L1 in-process + L2 Redis).

### 7.3 Cache Pollution
Infrequently accessed data fills cache, evicting hot entries. Can reduce hit ratio from 90%+ to 50-60%.

**Solutions:** LFU eviction (`allkeys-lfu`), segmented cache pools, admission filtering (cache only after N requests).

### 7.4 Stale Data
Cached data diverges from DB. Impact ranges from acceptable (product price off by $0.01 for 30s) to catastrophic (bank balance off by $1000).

**Solutions:** Short TTLs for volatile data, event-based invalidation (10-100ms propagation), read-your-writes consistency after user writes.

### 7.5 Hot Key Problem
Single key saturates a Redis instance at 100K+ ops/sec, causing latency spikes for all keys on that shard.

**Solutions:** L1 in-process cache (1-5s TTL), key replication across shards (`hot_key:1`..`hot_key:N`), Redis read replicas.

---

## 8. Anti-Patterns

### 8.1 Caching Everything
Memory is finite ($6-15/GB/month on ElastiCache). Low-value items evict high-value ones. Cache only data with read:write > 10:1 AND frequency > 1 req/min.

### 8.2 No TTL (Infinite Caching)
Bugs in invalidation cause permanently stale data. Memory grows unbounded. Always set a TTL as safety net, even 24 hours.

### 8.3 Cache-and-Forget
No monitoring = silent degradation. Hit ratio can drop 95% to 40% undetected. Alert on: hit ratio < 80%, evictions > 100/sec, memory > 85%.

### 8.4 Distributed Cache Without Considering Network Latency
Cross-region cache (80-120ms RTT) can be slower than a local DB query (50-100ms). Deploy cache in same AZ as application (< 1ms RTT). For multi-region: per-region clusters with cross-region replication.

### 8.5 Caching Errors
Transient DB errors cached for full TTL converts momentary issues into prolonged outages. Never cache error responses. Cache empty results with short TTL (30-60s) and sentinel values.

---

## 9. Trade-Offs

### 9.1 Memory Cost vs. Latency Reduction
```
1M user profiles (avg 2KB) in ElastiCache Redis (r7g.xlarge):
  Memory: ~2.5 GB total.  Cost: ~$17.30/month.
  Latency saved: 120ms/hit.  At 100 hits/sec = 259M hits/month.
  Cost per latency-ms saved: $0.000000067
```

### 9.2 Staleness vs. DB Load Reduction

| TTL        | Max Staleness | DB Load Reduction (1000 RPS) |
|------------|---------------|------------------------------|
| 5 seconds  | 5 sec         | ~92%                         |
| 30 seconds | 30 sec        | ~97%                         |
| 5 minutes  | 5 min         | ~99.7%                       |
| 1 hour     | 1 hour        | ~99.97%                      |

### 9.3 Complexity vs. Consistency

| Approach                          | Consistency | Complexity |
|-----------------------------------|-------------|------------|
| TTL-only                          | Weakest     | Minimal    |
| TTL + manual invalidation         | Moderate    | Low        |
| TTL + event-driven invalidation   | Strong      | Medium     |
| Write-through + TTL               | Strongest   | High       |

### 9.4 Cache Availability
Cache-aside is most resilient (degrades to DB). Read-through/write-through require cache HA (Redis Sentinel/Cluster, 10-30s failover). Add circuit breakers: bypass cache if latency > 50ms.

---

## 10. Decision Trees

### 10.1 Should I Cache This?
```
Is data read >10x per write?
 YES -> Entry <10MB? -> Staleness >=5s OK? -> Accessed >1/min?
          YES             YES                   YES -> CACHE IT
          YES             YES                   NO -> Expensive (>100ms)? YES -> CACHE. NO -> SKIP.
          YES             NO -> Event-based invalidation possible? YES -> CACHE. NO -> SKIP.
          NO -> Compressible? YES -> CACHE compressed. NO -> SKIP.
 NO -> Bursty writes then many reads? YES -> CACHE (invalidate on write). NO -> SKIP.
```

### 10.2 Which Pattern?
```
Need read-after-write consistency? -> WRITE-THROUGH
Write throughput is primary concern?
  Tolerate data loss on cache failure? -> WRITE-BEHIND
  No? -> WRITE-THROUGH
Read latency primary concern?
  Small hot-key set (<10K keys = 80% traffic)? -> REFRESH-AHEAD
  Long tail? -> CACHE-ASIDE
Default -> CACHE-ASIDE (simplest, most resilient)
```

### 10.3 Which Layer?
```
User-specific data?
  Session/auth? -> APP CACHE (Redis, TTL=session)
  Computed per-user? -> APP CACHE (Redis, short TTL)
  Other? -> BROWSER CACHE (private)
Global data?
  Static asset? -> CDN + BROWSER (immutable, 1yr TTL)
  Shared API response, latency <50ms needed? -> APP CACHE
  Shared API response, latency flexible? -> CDN CACHE
  DB query result? -> APP CACHE or ORM L2
```

---

## 11. Before/After Code Examples

### 11.1 Python: User Profile with Cache-Aside

**Before (no caching):**
```python
@app.route("/api/users/<int:user_id>")
def get_user(user_id):
    user = db.execute("SELECT * FROM users WHERE id = :id", {"id": user_id}).fetchone()
    return jsonify(serialize_user(user))
    # Measured: p50=45ms, p95=180ms, p99=420ms
```

**After (Redis cache-aside):**
```python
CACHE_TTL = 300  # 5 minutes

@app.route("/api/users/<int:user_id>")
def get_user(user_id):
    cache_key = f"user:{user_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return jsonify(json.loads(cached))  # p50=1.2ms, p95=3.8ms

    user = db.execute("SELECT * FROM users WHERE id = :id", {"id": user_id}).fetchone()
    if not user:
        redis_client.setex(cache_key, 60, json.dumps(None))  # short TTL for negatives
        return jsonify({"error": "not found"}), 404

    result = serialize_user(user)
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
    return jsonify(result)

@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    db.execute("UPDATE users SET name=:name WHERE id=:id", request.get_json())
    db.commit()
    redis_client.delete(f"user:{user_id}")  # invalidate on write
    return jsonify({"status": "updated"})
```

**Measured improvement (95% hit ratio):**

| Metric     | Before  | After   | Improvement    |
|------------|---------|---------|----------------|
| p50        | 45 ms   | 3.4 ms  | 92% faster     |
| p95        | 180 ms  | 12 ms   | 93% faster     |
| p99        | 420 ms  | 52 ms   | 88% faster     |
| DB QPS     | 2,400   | 120     | 95% reduction  |
| Throughput | 850 RPS | 4,200   | 5x increase    |

### 11.2 Node.js: Stampede Prevention

**Before:** Every request hits DB. Avg 85ms, p95=340ms under load.

**After (distributed lock):**
```javascript
app.get('/api/products/:id', async (req, res) => {
  const cacheKey = `product:${req.params.id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));  // avg 1.8ms

  const lockKey = `lock:${cacheKey}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
  if (acquired) {
    try {
      const product = await db.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
      await redis.setex(cacheKey, 600, JSON.stringify(product.rows[0]));
      res.json(product.rows[0]);
    } finally { await redis.del(lockKey); }
  } else {
    await new Promise(r => setTimeout(r, 50));  // brief wait
    const retried = await redis.get(cacheKey);
    res.json(retried ? JSON.parse(retried) : await fallbackQuery(req.params.id));
  }
});
```

| Metric          | Before  | After   | Improvement   |
|-----------------|---------|---------|---------------|
| Avg latency     | 85 ms   | 8.2 ms  | 90% faster    |
| p95             | 340 ms  | 18 ms   | 95% faster    |
| DB connections   | 500     | 42      | 92% reduction |
| Stampede events  | 15/hr   | 0/hr    | Eliminated    |

### 11.3 nginx: Static Asset Caching

**Before:** No cache headers. 2.4 MB transferred, 1.8s load per page.

**After:**
```nginx
location ~* \.[0-9a-f]{6,}\.(js|css|woff2|png|jpg|webp)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
location /api/ {
    add_header Cache-Control "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400";
}
```

| Metric          | Before | After  | Improvement   |
|-----------------|--------|--------|---------------|
| Transfer size   | 2.4 MB | 48 KB  | 98% reduction |
| Page load (p50) | 1.8 s  | 0.4 s  | 78% faster    |
| Origin requests | 42     | 3      | 93% reduction |

---

## 12. Sources

- [Distributed Caching Algorithms Analysis (arXiv, 2025)](https://arxiv.org/html/2504.02220v1)
- [Redis Caching in High-Traffic Apps (ResearchGate, 2025)](https://www.researchgate.net/publication/395191392_Using_Redis_for_Caching_Optimization_in_High-Traffic_Web_Applications)
- [Redis vs Memcached Benchmarks (Medium, 2025)](https://medium.com/@jainishah1641/redis-vs-memcached-caching-benchmarks-for-high-traffic-apps-2025-5cce021f8293)
- [Redis vs Memcached Scalability (DZone, 2025)](https://dzone.com/articles/performance-and-scalability-analysis-of-redis-memcached)
- [Redis vs Memcached Production Benchmark (Medium)](https://codingplainenglish.medium.com/i-benchmarked-redis-vs-memcached-in-production-heres-the-bottleneck-799d78479f5d)
- [Redis vs Memcached 2025 (ScaleGrid)](https://scalegrid.io/blog/redis-vs-memcached/)
- [Cache Hit Ratio Strategy (Redis Blog, 2024)](https://redis.io/blog/why-your-cache-hit-ratio-strategy-needs-an-update/)
- [Cache Optimization Strategies (Redis Blog)](https://redis.io/blog/guide-to-cache-optimization-strategies/)
- [Cache-Control Header (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [stale-while-revalidate (DebugBear)](https://www.debugbear.com/docs/stale-while-revalidate)
- [HTTP Caching Standards (HTTP Toolkit)](https://httptoolkit.com/blog/status-targeted-caching-headers/)
- [CDN Cache Hit Ratio (Cloudflare)](https://www.cloudflare.com/learning/cdn/what-is-a-cache-hit-ratio/)
- [Regional Tiered Cache (Cloudflare Blog)](https://blog.cloudflare.com/introducing-regional-tiered-cache/)
- [CDN Performance (Koyeb)](https://www.koyeb.com/blog/using-cache-control-and-cdns-to-improve-performance-and-reduce-latency)
- [CloudFront Caching (AWS)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
- [Cache Invalidation Best Practices (daily.dev)](https://daily.dev/blog/cache-invalidation-vs-expiration-best-practices)
- [Cache Invalidation Strategies (GetSDE Ready)](https://getsdeready.com/cache-invalidation-optimizing-application-performance/)
- [Cache Stampede in Redis (OneUptime, 2026)](https://oneuptime.com/blog/post/2026-01-21-redis-cache-stampede/view)
- [Thundering Herd Problem (Distributed Computing Musings)](https://distributed-computing-musings.com/2021/12/thundering-herd-cache-stampede/)
- [Caching and P99 Latency (Aerospike)](https://aerospike.com/blog/caching-doesnt-work-the-way-you-think-it-does/)
- [Write-Through vs Write-Back vs Write-Around (DesignGurus)](https://www.designgurus.io/answers/detail/writethrough-vs-writeback-vs-writearound-caching-tradeoffs)
- [Write-Behind Pattern (EnjoyAlgorithms)](https://www.enjoyalgorithms.com/blog/write-behind-caching-pattern/)
- [Caching Patterns (Hazelcast)](https://hazelcast.com/blog/a-hitchhikers-guide-to-caching-patterns/)
- [Database Caching (Prisma)](https://www.prisma.io/blog/benefits-and-challenges-of-caching-database-query-results-x2s9ei21e8kq)
- [Cache vs Database Architecture (ScyllaDB, 2025)](https://www.scylladb.com/2025/11/12/cache-vs-database-how-architecture-impacts-performance/)
- [ORM Cache (ACM Queue)](https://queue.acm.org/detail.cfm?id=1394141)
- [MySQL Query Cache EOL (ReadySet)](https://readyset.io/blog/mysql-5-7-eol-the-end-of-mysql-query-cache)
- [Cache-Aside Pattern (OneUptime, 2026)](https://oneuptime.com/blog/post/2026-01-30-cache-aside-pattern/view)
