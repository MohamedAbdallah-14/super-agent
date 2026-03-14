# Caching Architecture — Architecture Expertise Module

> Caching stores frequently accessed data closer to the consumer to reduce latency and backend load. Phil Karlton's famous quote — "There are only two hard things in computer science: cache invalidation and naming things" — isn't a joke. Caching is easy to add, hard to maintain, and the source of some of the most subtle bugs in production systems.

> **Category:** Data
> **Complexity:** Moderate
> **Applies when:** Systems with read-heavy workloads, high-latency data sources, or expensive computations that can tolerate some staleness

---

## What This Is

### Cache Levels

Caching operates at multiple levels. Understanding each level, its latency characteristics, and its failure modes is essential before choosing where to add a cache.

**L1 — In-Process / In-Memory Cache.** The cache lives in the application's own memory space. HashMap, Guava LoadingCache, Caffeine (Java), `node-cache` (Node.js), `lru-cache` (Python), or even a simple dictionary. Latency is nanoseconds. The cache dies with the process, is not shared across instances, and consumes heap memory. This is the fastest possible cache but the hardest to keep consistent across a fleet of application servers. Every instance has its own copy, and if Instance A invalidates a key, Instance B still serves stale data until its TTL expires or it is explicitly notified.

**L2 — Distributed Cache.** A dedicated caching tier shared across application instances. Redis, Memcached, Apache Ignite, Hazelcast. Latency is sub-millisecond to low single-digit milliseconds over a local network. The cache survives individual application restarts, provides a single source of cached truth, and supports advanced data structures (sorted sets, streams, pub/sub in Redis). The trade-off is network overhead, operational complexity, and a new single point of failure unless clustered properly.

**CDN — Edge Cache.** Content is cached at geographically distributed edge nodes close to end users. Cloudflare, Amazon CloudFront, Fastly, Akamai. Latency drops from hundreds of milliseconds (cross-continent origin fetch) to single-digit milliseconds (edge pop). CDNs excel at static assets (images, CSS, JS bundles), but modern CDNs can also cache API responses, HTML fragments, and GraphQL queries at the edge. The trade-off is cache invalidation complexity — purging content across 300+ edge locations is neither instant nor free.

**Browser Cache.** The user's browser caches resources according to HTTP `Cache-Control`, `ETag`, and `Expires` headers. Latency is essentially zero — the browser never makes a network request. This is the most effective cache for repeat visits but gives you the least control. Once a resource is cached in the browser, you cannot force invalidation without changing the URL (cache-busting via content hashes or query parameters).

### Caching vs. Precomputation

These are frequently confused. **Caching** stores the result of a computation or data fetch so that subsequent requests avoid repeating the work. The cache is populated reactively (on first request) or proactively (on a schedule). **Precomputation** runs expensive calculations ahead of time and stores the results permanently in a primary data store — not a cache. Materialized views, denormalized tables, and pre-aggregated analytics are precomputation. The distinction matters because caches are ephemeral (they can be flushed without data loss), while precomputed data is authoritative.

---

## When to Use It

**Read-heavy workloads.** The canonical use case. If a system processes 100:1 read-to-write ratios (product catalogs, user profiles, configuration data, content feeds), caching the read path dramatically reduces database load. Facebook's Memcached deployment handles billions of read requests per second — their 2013 NSDI paper "Scaling Memcache at Facebook" showed that caching reduced database queries by orders of magnitude, with Memcached handling >99% of read requests before they reached MySQL.

**Latency-sensitive paths.** If an API endpoint must respond in <50ms but the underlying query takes 200ms, caching is the only realistic option short of precomputation. E-commerce checkout flows, real-time bidding systems, and game leaderboards all rely on caching to meet latency SLAs.

**Expensive computations.** Machine learning model inference results, complex aggregation queries, rendered HTML templates, and image transformations are all candidates for caching. If the computation cost is high and the inputs are repeated, cache the output. Netflix caches personalized recommendation results per user session rather than re-running ML models on every page load.

**External API responses.** Third-party APIs have rate limits, latency, and availability constraints outside your control. Caching external API responses (with appropriate TTLs) insulates your system from upstream failures and reduces cost.

**Session data and authentication tokens.** Redis is the de facto standard for session storage in distributed web applications. Storing sessions in-memory avoids database round trips on every authenticated request.

**Configuration and feature flags.** Application configuration rarely changes but is read on every request. Caching configuration with a short TTL (30-60 seconds) or event-based invalidation eliminates unnecessary database reads.

---

## When NOT to Use It

This section is intentionally long because the decision *not* to cache is harder and more important than the decision to cache. Every unnecessary cache adds a consistency problem, an operational burden, and a debugging surface.

**Write-heavy workloads with immediate consistency requirements.** If your system processes more writes than reads, caching adds overhead without benefit. Every write must invalidate or update the cache, which means you pay the cache maintenance cost on every operation but rarely benefit from cache hits. Twitter's 2020 USENIX study of 153 in-memory cache clusters revealed that many real-world workloads are far more write-heavy than the textbook assumption — and those workloads showed lower cache hit rates and higher operational cost.

**Data that must always be fresh.** Financial transactions, inventory counts during flash sales, real-time auction bids, medical records. If serving stale data has regulatory, financial, or safety consequences, caching introduces unacceptable risk. The question is not "can we invalidate fast enough?" but "what happens during the window between the write and the invalidation?" If the answer is "someone sees a wrong bank balance" or "we oversell inventory," caching is the wrong tool.

**Small datasets that fit in the database buffer pool.** Every modern database has its own caching layer. PostgreSQL's `shared_buffers`, MySQL's InnoDB buffer pool, and MongoDB's WiredTiger cache all keep frequently accessed data in memory. If your entire working set fits in the database's buffer pool, adding an external cache adds complexity without meaningful latency improvement. Profile first — you may discover the database is already serving from memory.

**When cache invalidation complexity outweighs the benefit.** If an entity has 15 different views that must be invalidated when it changes, and changes come from 6 different services, the invalidation logic becomes a distributed consistency problem more complex than the original latency problem. A real example: one e-commerce platform cached product prices in Redis, but prices depended on user segment, region, currency, active promotions, and cart contents. The cache key space exploded, the invalidation logic had bugs that took months to find, and the cache hit rate was under 15%. They removed the cache entirely and optimized the database query from 180ms to 12ms — cheaper, simpler, and correct.

**Single-instance applications with fast databases.** If your application runs on a single server with a local PostgreSQL instance, the network latency to the database is near zero. Adding Redis introduces a network hop, operational complexity, and a new failure mode — for minimal latency gain. Cache when the bottleneck is real, not hypothetical.

**Rapidly mutating data with low read reuse.** Chat messages, real-time sensor telemetry, and event logs are typically written once and read rarely (or read in aggregate, not individually). Caching individual entries wastes memory. Write-around is the correct strategy here — bypass the cache entirely on writes.

**When it masks the real problem.** Caching is sometimes used to paper over an unoptimized query, a missing index, or an N+1 problem. The cache makes the symptom disappear but the disease remains. When the cache is flushed (deployment, memory pressure, node failure), the unoptimized path is exposed under full production load, often causing cascading failures. Fix the underlying problem first; cache only after the query is already fast and you need it to be faster.

---

## How It Works

### Caching Strategies

#### Cache-Aside (Lazy Loading)

The most common pattern. The application owns the caching logic.

```
Read path:
1. Application checks cache for key
2. Cache HIT  → return cached value
3. Cache MISS → query database
4. Write result to cache with TTL
5. Return result to caller

Write path:
1. Application writes to database
2. Application invalidates (deletes) cache key
3. Next read triggers cache population
```

**Strengths:** Simple to implement. The application controls exactly what gets cached and when. Cache failures are non-fatal — the application falls back to the database. Only requested data is cached (no wasted memory on unrequested data).

**Weaknesses:** First request after a miss or invalidation always hits the database ("cold start penalty"). The application code is cluttered with caching logic. Race conditions can occur: if two requests miss simultaneously, both query the database and both write to cache — not harmful but wasteful.

**When to use:** General-purpose caching where simplicity and resilience are priorities. This is the default choice unless you have a specific reason to use another pattern.

#### Read-Through

The cache itself is responsible for loading data from the database on a miss. The application only talks to the cache, never directly to the database for reads.

```
Read path:
1. Application requests key from cache
2. Cache HIT  → return cached value
3. Cache MISS → cache queries database internally
4. Cache stores result and returns to application
```

**Strengths:** Application code is cleaner — no cache miss handling logic. The cache layer can implement optimizations (batching, coalescing) transparently.

**Weaknesses:** Requires a cache provider that supports read-through (Redis does not natively; NCache, Oracle Coherence, and Hazelcast do). First-request latency is still cold. The cache becomes a thicker abstraction that is harder to debug.

**When to use:** Enterprise middleware scenarios where you want a unified data access layer. Often combined with write-through.

#### Write-Through

Every write goes through the cache to the database. The cache and database are always in sync.

```
Write path:
1. Application writes data to cache
2. Cache synchronously writes to database
3. Write acknowledged only after both succeed
```

**Strengths:** Cache is always consistent with the database. Reads are always fast (the cache is pre-populated by writes). No stale data window.

**Weaknesses:** Write latency increases — every write must complete two operations synchronously. Data that is written but never read wastes cache memory. Not suitable for write-heavy workloads.

**When to use:** Systems where read-after-write consistency is critical and write volume is moderate. Often paired with read-through.

#### Write-Behind (Write-Back)

Writes go to the cache immediately, and the cache asynchronously flushes to the database in the background.

```
Write path:
1. Application writes data to cache
2. Cache acknowledges immediately
3. Cache asynchronously batches and writes to database
```

**Strengths:** Write latency is minimal (only the cache write is synchronous). The cache can batch and coalesce writes, reducing database load. Excellent for write-heavy workloads where eventual consistency is acceptable.

**Weaknesses:** Risk of data loss — if the cache node crashes before flushing to the database, writes are lost. Debugging is harder because the database state lags behind the cache state. Introduces eventual consistency that must be accounted for in application logic.

**When to use:** High-throughput write scenarios where some data loss is tolerable (analytics events, view counters, activity logs). Never use for financial transactions or data subject to audit requirements.

#### Write-Around

Writes go directly to the database, bypassing the cache entirely.

```
Write path:
1. Application writes directly to database
2. Cache is not updated

Read path:
1. Standard cache-aside behavior
```

**Strengths:** Write-heavy data that is rarely read does not pollute the cache. Cache memory is preserved for frequently read data.

**Weaknesses:** First read after a write always misses the cache, increasing read latency for recently written data.

**When to use:** Log data, audit trails, chat messages, IoT telemetry — anything written frequently and read infrequently.

### TTL Policies

Time-to-live (TTL) is the bluntest but most reliable invalidation mechanism. Every cache entry expires after a fixed duration regardless of whether the underlying data has changed.

**Fixed TTL.** Set a constant expiration (e.g., 300 seconds). Simple and predictable. The maximum staleness is bounded by the TTL value.

**Sliding TTL.** The TTL resets on every read. Frequently accessed data stays cached longer. Rarely accessed data expires naturally. Useful for session data.

**Adaptive TTL.** The TTL is computed based on how frequently the underlying data changes. Rapidly changing data gets short TTLs; stable data gets long TTLs. More complex to implement but optimizes the trade-off between freshness and hit rate.

**TTL Jitter.** A critical production practice. Adding random jitter (e.g., `TTL = base_ttl + random(-60, 60)`) prevents synchronized expiration of keys set at the same time. Without jitter, a batch of cache entries set simultaneously will all expire simultaneously, causing a spike of database queries. AWS's official Redis caching whitepaper recommends this as a standard practice.

### Eviction Policies

When the cache reaches its memory limit, it must evict entries to make room for new ones.

**LRU (Least Recently Used).** Evicts the entry that hasn't been accessed for the longest time. The most common default. Works well when recent access is a good predictor of future access. Redis uses an approximated LRU with sampling (checking a random sample of keys rather than maintaining a perfect LRU list).

**LFU (Least Frequently Used).** Evicts the entry with the fewest accesses. Better than LRU for workloads where some keys are consistently popular. Caffeine's W-TinyLFU algorithm combines frequency and recency, consistently outperforming pure LRU in benchmarks — achieving near-optimal hit rates.

**FIFO (First In, First Out).** Evicts the oldest entry regardless of access pattern. Simple but rarely optimal. Useful only when all entries have roughly equal access probability.

**Random.** Evicts a random entry. Surprisingly effective in some workloads and trivially simple to implement. Used as a baseline in cache research.

**TTL-based.** Entries are evicted when their TTL expires. Not technically an eviction policy (it is expiration), but in practice it works with eviction: expired entries are evicted first, and if more space is needed, the eviction policy (LRU/LFU) kicks in.

### Cache Invalidation Strategies

Invalidation is the hard part. There are three fundamental approaches, and most production systems combine them.

**Event-based invalidation.** When data changes, an event (message, webhook, CDC stream) triggers cache deletion. This is the most precise approach — the cache is invalidated the moment the data changes, minimizing the staleness window. Implementation options include publishing to a message bus (Kafka, RabbitMQ, Redis Pub/Sub) on every write, using database change data capture (CDC) with tools like Debezium to detect writes and invalidate automatically, or application-level event hooks (e.g., ActiveRecord callbacks, Django signals).

**TTL-based invalidation.** Entries expire after a fixed time. The simplest approach but provides only probabilistic freshness. A 5-minute TTL means data can be up to 5 minutes stale. Acceptable for many use cases (product catalogs, user profile display names), unacceptable for others (inventory counts, pricing).

**Version-based invalidation.** Cache keys include a version number or content hash. When data changes, the version increments, and the old cache entry becomes unreachable (it eventually expires or is evicted). This is how CDNs handle static assets — `app.v3.js` and `app.v4.js` are different cache keys. No explicit invalidation is needed; new versions simply bypass old cache entries.

### CDN Caching

**Edge caching.** CDNs cache content at points of presence (PoPs) worldwide. A user in Tokyo hits the Tokyo edge node instead of the origin server in Virginia. CDN caching is governed by HTTP headers: `Cache-Control: public, max-age=31536000` tells the CDN to cache for one year. `s-maxage` overrides `max-age` specifically for shared caches (CDNs), allowing different browser and CDN TTLs.

**Cache purging.** When content changes, you must purge the CDN cache. Options include purge by URL (surgical, recommended), purge by cache tag (Cloudflare, Fastly — tag related resources and purge by tag), purge everything (nuclear option, causes origin load spike). Cloudflare's Instant Purge propagates globally in under 150ms but is rate-limited per plan tier (Free: 5 requests/minute, Enterprise: 500/second).

**Stale-while-revalidate.** The `stale-while-revalidate` directive allows CDNs to serve stale content immediately while fetching a fresh copy in the background. Users always get fast responses. The cache is updated transparently. This pattern is excellent for content that changes occasionally but does not require instant consistency.

**Origin shielding.** An intermediate cache layer between edge nodes and the origin. Instead of 300 edge nodes each making origin requests on a miss, they request from a single shield node, which requests from the origin. This collapses origin traffic by orders of magnitude.

### Cache Stampede / Thundering Herd Prevention

When a popular cache key expires, hundreds or thousands of concurrent requests simultaneously miss the cache and hit the database. This is a cache stampede (also called thundering herd or dog-pile effect). The database, which was protected by the cache, is suddenly exposed to full production load. Solutions:

**Distributed locking.** On a cache miss, the first request acquires a lock (e.g., `SET lock:key 1 EX 10 NX` in Redis). Other requests wait or return stale data. The lock holder fetches from the database, populates the cache, and releases the lock. The risk is that if the lock holder crashes, all waiters are blocked until the lock TTL expires.

**Probabilistic early expiration (XFetch).** Before the TTL actually expires, requests probabilistically decide to refresh the cache. The probability increases as the TTL approaches zero. The academic XFetch algorithm implements this: `current_time - (time_to_compute * beta * log(random())) > expiry_time`. Under normal traffic, the cache is refreshed before expiration, and no stampede occurs.

**Singleflight / Request coalescing.** Multiple concurrent requests for the same key are coalesced into a single database query. Go's `golang.org/x/sync/singleflight` package is the canonical implementation. The first request triggers the database fetch; all other concurrent requests wait and receive the same result. This is an application-level solution that requires no changes to the cache infrastructure.

**Background refresh.** A dedicated background process monitors cache TTLs and proactively refreshes entries before they expire. The application only reads from cache, never triggers database fetches on the hot path. This eliminates stampedes entirely but requires knowing which keys to refresh (not practical for large, dynamic key spaces).

**TTL jitter.** Adding randomness to TTL values (`base_ttl + random(-range, range)`) prevents multiple keys from expiring simultaneously. This does not prevent stampedes on a single key but prevents correlated stampedes across many keys.

---

## Trade-Offs Matrix

| Dimension | Without Caching | With Caching | Notes |
|---|---|---|---|
| Read latency | Database-bound (1-100ms+) | Cache-bound (0.1-5ms) | 10-100x improvement typical |
| Write complexity | Single write path | Write + invalidate/update cache | Every write path must account for cache |
| Data freshness | Always current | Potentially stale (bounded by TTL) | Staleness window is the fundamental trade-off |
| Operational overhead | Database ops only | Database + cache cluster ops | Redis/Memcached clusters require monitoring, failover, memory management |
| Memory cost | Database buffer pool only | Additional RAM for cache tier | Redis memory is more expensive than database disk |
| Debugging difficulty | Single source of truth | Multiple sources; "is it the cache?" | Stale cache is the #1 cause of "it works for some users but not others" |
| Availability | Database availability | Cache availability AND database availability | Cache failure must degrade gracefully, not catastrophically |
| Cold start behavior | Consistent performance | Slow until cache warms | Deployments, restarts, and cache flushes cause temporary performance degradation |
| Consistency model | Strong (single database) | Eventual (cache + database) | Distributed systems: cache and DB can diverge during failure windows |
| Code complexity | Straightforward data access | Cache logic woven through application | Cache-aside pollutes business logic; read/write-through centralizes it |
| Cost at scale | Database scaling costs | Cache tier costs + reduced database costs | Net cost depends on read/write ratio and cache hit rate |
| Testing surface | Database integration tests | Cache + database + invalidation tests | Must test cache miss, hit, stale, eviction, and stampede scenarios |

---

## Evolution Path

### Stage 1: No Cache (Baseline)
All reads hit the database. This is correct for new applications and small datasets. Measure latency and throughput. Identify bottlenecks with profiling, not assumptions.

### Stage 2: Database-Level Optimization
Before adding an external cache, exhaust database-level options: add indexes, optimize queries, fix N+1 problems, increase connection pool size, tune `shared_buffers` / InnoDB buffer pool. These improvements are permanent and have no consistency trade-offs.

### Stage 3: Application-Level In-Memory Cache
Add in-process caching for the hottest, most stable data: configuration, feature flags, reference data (countries, currencies, categories). Use a proper cache library (Caffeine, `lru-cache`) with TTLs — not a raw HashMap that grows unbounded. Monitor heap usage.

### Stage 4: Distributed Cache (Redis/Memcached)
When multiple application instances need shared cached state, introduce Redis or Memcached. Start with cache-aside for the highest-impact read paths. Set conservative TTLs. Implement cache-miss metrics from day one. Deploy Redis with Sentinel or Cluster mode for high availability.

### Stage 5: Multi-Layer Caching
Combine L1 (in-process) and L2 (distributed) caching. The application checks local cache first, then Redis, then the database. Use short TTLs for L1 (5-30 seconds) and longer TTLs for L2 (1-10 minutes). Instagram uses this pattern — in-process Memcached with mcrouter for distributed routing.

### Stage 6: CDN and Edge Caching
Move cacheable HTTP responses to the CDN edge. Static assets get long TTLs with content-hash URLs. API responses use `s-maxage` with `stale-while-revalidate`. Implement cache tags for surgical purging. Monitor cache hit ratios at the edge.

### Stage 7: Specialized Caching Infrastructure
At extreme scale, introduce specialized solutions: dedicated hot-key tiers, cache sharding with consistent hashing, write-behind caching for high-throughput writes, predictive prefetching based on user behavior patterns. Facebook, Twitter, and Instagram all operate at this level with custom-built caching infrastructure (mcrouter, Pelikan, custom Memcached forks).

---

## Failure Modes

### Stale Data Serving
**What happens:** Cache contains an outdated value. Reads return data that no longer reflects the database state.
**Why:** TTL hasn't expired yet after a database write. Event-based invalidation message was delayed or lost. Race condition: write occurred between cache miss and cache population.
**Impact:** Users see incorrect information. In e-commerce, stale prices or inventory counts can cause financial loss. One e-commerce platform served cached prices that didn't reflect a promotional discount for 8 minutes, resulting in customer complaints and manual refund processing.
**Mitigation:** Use event-based invalidation for critical data. Keep TTLs short for mutable data. Implement version checks on cache reads.

### Cache Stampede (Thundering Herd)
**What happens:** A popular cache key expires, and hundreds of concurrent requests simultaneously query the database.
**Why:** High-traffic key with a fixed TTL. No stampede prevention mechanism in place.
**Impact:** Database CPU spikes to 100%. Query latency increases for all users, not just those hitting the expired key. In severe cases, the database becomes unresponsive, triggering cascading failures.
**Mitigation:** Implement distributed locking, probabilistic early expiration, or singleflight patterns. Add TTL jitter to prevent correlated expirations.

### Hot Key Overload
**What happens:** A single cache key receives disproportionate traffic, overwhelming the cache node that owns it.
**Why:** Viral content, celebrity profiles, flash sale product pages. Consistent hashing assigns one key to one node — hot keys don't distribute.
**Impact:** The cache node's CPU and network bandwidth are saturated. Other keys on the same node experience increased latency. In extreme cases, the node crashes, rehashing its keys to other nodes and potentially cascading the failure.
**Mitigation:** Replicate hot keys to multiple nodes with randomized key suffixes (`product:123:replica:1`, `product:123:replica:2`). Use a local in-process cache as L1 for known hot keys. Monitor key access frequency and auto-detect hotspots.

### Memory Pressure and OOM
**What happens:** The cache consumes all available memory. Eviction rates spike. In extreme cases, the cache process is killed by the OS OOM killer.
**Why:** No memory limit configured. Keys are cached without TTLs and accumulate. Eviction policy is too conservative. Memory fragmentation in long-running Redis instances.
**Impact:** Eviction storms cause cache hit rate to plummet. If Redis is killed by OOM, all clients experience errors until Redis restarts and the cache is cold.
**Mitigation:** Always set `maxmemory` and `maxmemory-policy` in Redis. Monitor memory usage and eviction rates. Set TTLs on all keys — never cache without expiration. Use `MEMORY DOCTOR` in Redis to detect fragmentation.

### Cache Poisoning
**What happens:** Invalid, corrupted, or malicious data is stored in the cache and served to users.
**Why:** A bug in the application writes bad data to the cache. An attacker manipulates cache keys via unvalidated input. A serialization bug stores a partially constructed object.
**Impact:** All users reading the poisoned key receive bad data. If the key has a long TTL, the impact persists for the entire TTL duration. In 2023, a CDN cache poisoning vulnerability (CVE-2023-25690) allowed attackers to inject malicious responses into shared CDN caches, affecting all users served by that edge node.
**Mitigation:** Validate data before caching. Use cache key namespacing to prevent key collisions. Implement cache entry checksums for critical data. Set reasonable TTLs so poisoned entries expire.

### Cold Start After Flush
**What happens:** After a cache flush (intentional or due to failure), all requests hit the database simultaneously.
**Why:** Deployment that flushes the cache. Redis node restart. `FLUSHALL` command executed accidentally or intentionally.
**Impact:** Database load spikes to pre-caching levels. If the database cannot handle the uncached load, it becomes unresponsive. This is effectively a self-inflicted DDoS.
**Mitigation:** Never flush the entire cache in production — use targeted invalidation. Implement cache warming scripts that pre-populate critical keys. Use blue-green deployments where the new cache is warmed before traffic switches. Design the database to handle uncached load (even if slowly) — the cache should be an optimization, not a load-bearing requirement.

### Split-Brain in Cache Clusters
**What happens:** Network partition causes cache nodes to diverge. Different application instances read different values for the same key from different cache nodes.
**Why:** Network partition in a Redis Cluster or Memcached ring. Failover promotes a replica that is behind the primary.
**Impact:** Inconsistent behavior across the application fleet. Some users see updated data, others see stale data, with no clear pattern.
**Mitigation:** Use Redis Cluster with `WAIT` for critical writes. Accept that distributed caches provide eventual consistency, not strong consistency. Design the application to tolerate temporary inconsistency.

---

## Technology Landscape

### Distributed Cache Servers

**Redis.** The dominant distributed cache. Single-threaded event loop (Redis 7+ has I/O threading for network operations). Supports strings, hashes, lists, sets, sorted sets, streams, HyperLogLog, and bitmaps. Persistence options (RDB snapshots, AOF log). Redis Cluster provides horizontal sharding with 16,384 hash slots. Redis Sentinel provides high availability with automatic failover. Lua scripting for atomic compound operations. Pub/Sub for event-based invalidation. Typical production hit rates: 95-99%. Memory overhead: ~60-80 bytes per key beyond the data itself.

**Memcached.** Simpler and older. Multi-threaded (better CPU utilization on multi-core machines). Supports only string key-value pairs (no data structures). No persistence, no replication, no clustering (clients implement consistent hashing). Lower memory overhead per key than Redis (~50 bytes). Still used at Facebook and Twitter scale because simplicity and raw throughput matter when you operate thousands of cache nodes. Facebook's mcrouter handles routing, replication, and failover on top of Memcached.

**When to choose Redis vs. Memcached:** Use Redis when you need data structures beyond simple strings, persistence, pub/sub, or Lua scripting. Use Memcached when you need pure key-value caching at maximum throughput with minimal operational complexity, or when you operate at a scale where Redis's single-threaded model becomes a bottleneck.

### CDN Providers

**Cloudflare.** Global network with 300+ PoPs. Instant Purge (<150ms global propagation). Workers for edge compute. Cache Rules for fine-grained control. Free tier available. Cache Tags for group invalidation on Business+ plans.

**Amazon CloudFront.** Tight AWS integration. Lambda@Edge for edge compute. Origin shielding via Regional Edge Caches. Invalidation is eventually consistent (may take minutes). 1,000 free invalidation paths per month; additional paths cost $0.005 each.

**Fastly.** Instant Purge (~150ms). Surrogate keys (cache tags) on all plans. VCL (Varnish Configuration Language) for powerful cache customization. Compute@Edge for WebAssembly-based edge compute. Preferred by media companies for real-time purging needs.

### Application-Level Cache Libraries

**Caffeine (Java).** High-performance in-process cache. W-TinyLFU eviction algorithm achieves near-optimal hit rates — consistently outperforms Guava Cache in benchmarks by 10-30% on read-heavy workloads. Async loading support. Size-based and time-based eviction. The recommended replacement for Guava Cache in new Java projects.

**Guava Cache / CacheBuilder (Java).** Google's older in-process cache. LRU eviction. Still widely used but Caffeine is strictly superior in performance. Guava Cache is in maintenance mode; Google recommends Caffeine for new code.

**node-cache / lru-cache (Node.js).** Simple in-process caches for Node.js. `lru-cache` is more configurable with size-based eviction, TTL, and `stale-while-revalidate` semantics. No clustering — each Node.js process has its own cache.

**Django Cache Framework (Python).** Pluggable backend supporting Memcached, Redis, file system, local memory, and database caching. Per-view caching with decorators. Template fragment caching. Cache middleware for full-page caching.

### HTTP Caching Headers

**`Cache-Control`.** The primary directive. `public` (CDN can cache), `private` (browser only), `no-store` (never cache), `no-cache` (cache but revalidate), `max-age=N` (cache for N seconds), `s-maxage=N` (CDN-specific max-age), `stale-while-revalidate=N` (serve stale for N seconds while refreshing).

**`ETag`.** Entity tag — a hash or version identifier for the resource. The browser sends `If-None-Match: <etag>` on subsequent requests. If the resource hasn't changed, the server returns `304 Not Modified` (no body), saving bandwidth.

**`Vary`.** Tells caches that the response varies based on specific request headers (e.g., `Vary: Accept-Encoding, Accept-Language`). Critical for correct caching of content-negotiated responses. A missing `Vary` header can cause CDNs to serve gzipped content to clients that don't support it, or English content to French-speaking users.

---

## Decision Tree

```
START: Is the data read more than 10x per write?
├── NO → Caching likely adds more complexity than value
│   └── Consider database-level optimization instead
│
└── YES → Can the application tolerate stale data?
    ├── NO (must always be fresh)
    │   └── Is the data read latency a critical SLA?
    │       ├── NO → Do not cache. Optimize the database query.
    │       └── YES → Use write-through cache with synchronous invalidation
    │           └── Accept the write latency penalty for read consistency
    │
    └── YES (some staleness is acceptable)
        ├── What is the acceptable staleness window?
        │   ├── Seconds → Short TTL (5-30s) + event-based invalidation
        │   ├── Minutes → Medium TTL (1-10min) + TTL-based invalidation
        │   └── Hours/Days → Long TTL (1h-24h) + version-based invalidation (CDN)
        │
        ├── Is the data shared across application instances?
        │   ├── NO → In-process cache (L1) is sufficient
        │   └── YES → Distributed cache (L2: Redis/Memcached) required
        │       └── Consider L1 + L2 for lowest latency
        │
        ├── Is the data served to end users over HTTP?
        │   ├── YES → Add CDN caching (L3: edge)
        │   │   ├── Static assets → Long TTL + content-hash URLs
        │   │   ├── API responses → s-maxage + stale-while-revalidate
        │   │   └── HTML pages → Short s-maxage + cache tags for purging
        │   └── NO → L1/L2 caching only
        │
        └── Is there a risk of cache stampede?
            ├── NO (low traffic) → Simple cache-aside with TTL
            └── YES (high traffic on specific keys)
                ├── Implement singleflight / request coalescing
                ├── Add probabilistic early expiration
                └── Consider background refresh for critical keys
```

---

## Implementation Sketch

### Cache-Aside with Stampede Prevention (Python + Redis)

```python
import redis
import json
import time
import random
import hashlib
import functools

class CacheAside:
    """
    Production cache-aside implementation with:
    - TTL jitter to prevent correlated expirations
    - Distributed locking for stampede prevention
    - Stale serving during refresh
    - Metrics for hit/miss/stale tracking
    """

    def __init__(self, redis_client: redis.Redis, default_ttl: int = 300,
                 jitter_range: int = 60, lock_ttl: int = 10):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self.jitter_range = jitter_range
        self.lock_ttl = lock_ttl
        # Metrics counters
        self._hits = 0
        self._misses = 0
        self._stale_serves = 0

    def _ttl_with_jitter(self, base_ttl: int) -> int:
        """Add random jitter to prevent synchronized expirations."""
        return base_ttl + random.randint(-self.jitter_range, self.jitter_range)

    def get(self, key: str, fetch_fn, ttl: int = None):
        """
        Get value from cache with stampede prevention.

        Args:
            key: Cache key
            fetch_fn: Callable that returns the value on cache miss
            ttl: Optional TTL override (seconds)
        """
        ttl = ttl or self.default_ttl
        cache_key = f"cache:{key}"
        stale_key = f"stale:{key}"
        lock_key = f"lock:{key}"

        # Try primary cache
        cached = self.redis.get(cache_key)
        if cached is not None:
            self._hits += 1
            return json.loads(cached)

        # Cache miss — try to acquire lock for database fetch
        self._misses += 1
        lock_acquired = self.redis.set(
            lock_key, "1", ex=self.lock_ttl, nx=True
        )

        if not lock_acquired:
            # Another request is already fetching — serve stale if available
            stale = self.redis.get(stale_key)
            if stale is not None:
                self._stale_serves += 1
                return json.loads(stale)
            # No stale data — wait briefly and retry
            time.sleep(0.1)
            return self.get(key, fetch_fn, ttl)

        try:
            # We hold the lock — fetch from database
            value = fetch_fn()
            serialized = json.dumps(value)

            # Pipeline: set primary cache + extended stale copy
            pipe = self.redis.pipeline()
            pipe.setex(cache_key, self._ttl_with_jitter(ttl), serialized)
            pipe.setex(stale_key, ttl * 3, serialized)  # Stale copy lives 3x longer
            pipe.execute()

            return value
        finally:
            self.redis.delete(lock_key)

    def invalidate(self, key: str):
        """Invalidate a cache entry. Stale copy is kept for stampede protection."""
        self.redis.delete(f"cache:{key}")
        # Note: stale:{key} is intentionally NOT deleted

    @property
    def stats(self):
        total = self._hits + self._misses
        return {
            "hits": self._hits,
            "misses": self._misses,
            "stale_serves": self._stale_serves,
            "hit_rate": self._hits / total if total > 0 else 0,
        }


# Usage
cache = CacheAside(redis.Redis(host="localhost", port=6379, db=0))

def get_user_profile(user_id: int):
    return cache.get(
        key=f"user:{user_id}",
        fetch_fn=lambda: db.query("SELECT * FROM users WHERE id = %s", user_id),
        ttl=300,  # 5 minutes + jitter
    )

def update_user_profile(user_id: int, data: dict):
    db.execute("UPDATE users SET ... WHERE id = %s", user_id)
    cache.invalidate(f"user:{user_id}")
```

### HTTP Cache Headers (Express.js Middleware)

```javascript
// Middleware for setting cache headers based on content type

function cacheControl(options = {}) {
  return (req, res, next) => {
    const {
      staticAssetMaxAge = 31536000,    // 1 year for hashed static assets
      apiMaxAge = 0,                     // No browser caching for API
      apiSMaxAge = 60,                   // CDN caches API for 60s
      staleWhileRevalidate = 300,        // Serve stale for 5min while refreshing
      isPrivate = false,                 // true for user-specific responses
    } = options;

    // Static assets with content hash — cache forever
    if (req.path.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|woff2)$/)) {
      res.set('Cache-Control', `public, max-age=${staticAssetMaxAge}, immutable`);
      return next();
    }

    // API responses
    if (req.path.startsWith('/api/')) {
      const visibility = isPrivate ? 'private' : 'public';
      const parts = [
        visibility,
        `max-age=${apiMaxAge}`,
        `s-maxage=${apiSMaxAge}`,
        `stale-while-revalidate=${staleWhileRevalidate}`,
      ];
      res.set('Cache-Control', parts.join(', '));

      // Add ETag based on response body
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const etag = hashContent(JSON.stringify(body));
        res.set('ETag', `"${etag}"`);

        if (req.headers['if-none-match'] === `"${etag}"`) {
          return res.status(304).end();
        }
        return originalJson(body);
      };
    }

    // HTML pages — short CDN cache, no browser cache
    if (req.accepts('html')) {
      res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
      res.set('Vary', 'Accept-Encoding, Accept-Language');
    }

    next();
  };
}

function hashContent(content) {
  return require('crypto').createHash('md5')
    .update(content).digest('hex').slice(0, 16);
}
```

### Cache Warming Script (Go)

```go
// cache_warmer.go — Pre-populate cache for critical keys after deployment

package main

import (
    "context"
    "log"
    "sync"
    "time"

    "github.com/redis/go-redis/v9"
    "golang.org/x/sync/errgroup"
)

type CacheWarmer struct {
    rdb       *redis.Client
    db        *sql.DB
    batchSize int
}

func (w *CacheWarmer) WarmTopProducts(ctx context.Context, limit int) error {
    // Fetch the most-viewed product IDs from analytics
    rows, err := w.db.QueryContext(ctx,
        "SELECT product_id FROM product_views "+
        "GROUP BY product_id ORDER BY COUNT(*) DESC LIMIT $1", limit)
    if err != nil {
        return err
    }
    defer rows.Close()

    var productIDs []int64
    for rows.Next() {
        var id int64
        rows.Scan(&id)
        productIDs = append(productIDs, id)
    }

    // Warm cache in parallel batches
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10) // Max 10 concurrent database queries

    for _, id := range productIDs {
        id := id
        g.Go(func() error {
            product, err := w.fetchProduct(ctx, id)
            if err != nil {
                log.Printf("WARN: failed to warm product %d: %v", id, err)
                return nil // Don't fail the whole batch
            }
            ttl := 5*time.Minute + time.Duration(rand.Intn(120))*time.Second
            return w.rdb.Set(ctx, fmt.Sprintf("product:%d", id),
                product, ttl).Err()
        })
    }

    return g.Wait()
}
```

---

## Real-World Case Studies

**Facebook — Scaling Memcache (2013).** Facebook's NSDI paper documented their Memcached deployment: thousands of servers, trillions of cached items, billions of requests per second. Key innovations included mcrouter (a Memcached protocol router handling routing, replication, and failover), lease-based invalidation (preventing stale sets after delete), regional pools (separating cache by data access pattern), and cold cluster warming (new clusters are warmed from existing clusters, not the database). The lesson: at hyperscale, the cache infrastructure becomes more complex than the database infrastructure.

**Twitter — 153 Cache Clusters (2020).** Twitter's USENIX OSDI paper analyzed their in-memory cache workloads and found that real-world cache workloads differ significantly from textbook assumptions. Many workloads were write-heavy. TTL distributions were highly variable. Some clusters had hit rates below 50%. The paper introduced Pelikan, a framework for building custom cache servers optimized for specific workload characteristics rather than using general-purpose solutions.

**Instagram — Multi-Layer Caching.** Instagram uses Memcached and Redis in combination. Memcached handles high-throughput read caching (user profiles, posts, comments). Redis handles more complex data structures (sorted sets for feeds, pub/sub for real-time features). mcrouter provides distributed routing and replication. When Instagram scaled to 14 million users with only 3 engineers, aggressive caching was a key enabler — the database handled only the writes that caching couldn't absorb.

---

## Cross-References

- **[data-consistency](../data/data-consistency.md)** — Caching fundamentally introduces eventual consistency; understand CAP trade-offs before adding a cache layer
- **[database-scaling](../scaling/database-scaling.md)** — Caching is one of several database scaling strategies; compare with read replicas, sharding, and connection pooling
- **[search-architecture](../data/search-architecture.md)** — Search indexes are a form of derived data with similar invalidation challenges to caches
- **[horizontal-vs-vertical](../scaling/horizontal-vs-vertical.md)** — Distributed caching is a horizontal scaling strategy; understand when vertical scaling (bigger database) is simpler

---

## Sources

- [Scaling Memcache at Facebook — USENIX NSDI 2013](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala)
- [A Large Scale Analysis of Hundreds of In-Memory Cache Clusters at Twitter — USENIX OSDI 2020](https://www.usenix.org/conference/osdi20/presentation/yang)
- [AWS Whitepaper: Database Caching Strategies Using Redis](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)
- [Redis Cache Optimization Strategies](https://redis.io/blog/guide-to-cache-optimization-strategies/)
- [Cloudflare Cache Documentation](https://developers.cloudflare.com/cache/)
- [Caffeine Cache Benchmarks](https://github.com/ben-manes/caffeine/wiki/Benchmarks)
- [Cache Stampede Prevention — OneUptime](https://oneuptime.com/blog/post/2026-01-30-cache-stampede-prevention/view)
- [Why Cache Invalidation is Hard — Ka Wai Cheung](https://medium.com/on-building-software/why-cache-invalidation-is-actually-hard-e8b5e9a83e45)
- [Cache-Aside Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Thundering Herd Problem — Distributed Computing Musings](https://distributed-computing-musings.com/2025/08/thundering-herd-problem-preventing-the-stampede/)
