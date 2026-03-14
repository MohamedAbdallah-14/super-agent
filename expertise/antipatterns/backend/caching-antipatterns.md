# Caching Anti-Patterns
> A field guide to the most destructive caching mistakes — with real incident post-mortems, concrete fixes, and detection rules.
> **Domain:** Backend
> **Anti-patterns covered:** 18
> **Highest severity:** Critical

---

## Why Caching Anti-Patterns Matter

Caching is one of the most powerful performance tools in a backend engineer's arsenal — and one of the most dangerous when misused. A cache that silently serves stale data can cause financial losses for months before anyone notices. A cache without TTL can exhaust all available memory at 3 AM. A cache key missing a tenant ID can leak private data between customers. Unlike a slow query that triggers an alert, caching bugs hide behind improved response times — the system feels fast while quietly serving wrong answers. Every anti-pattern below has caused real production outages, data breaches, or silent data corruption.

---

## Anti-Pattern Catalog

### AP-01: Cache and Forget (No Invalidation Strategy)

**Also known as:** Fire-and-forget cache, set-and-pray, stale forever
**Frequency:** Very Common | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
def get_user_profile(user_id):
    cached = redis.get(f"user:{user_id}")
    if cached: return json.loads(cached)
    profile = db.query("SELECT * FROM users WHERE id = %s", user_id)
    redis.set(f"user:{user_id}", json.dumps(profile))  # No TTL, no invalidation
    return profile

def update_user_profile(user_id, data):
    db.execute("UPDATE users SET ... WHERE id = %s", user_id)
    # Cache? What cache? We forgot it exists.
```

**Why developers do it:** The read path and write path are built by different developers at different times. Adding a cache on reads is a quick win requiring no coordination. Invalidation requires knowing every mutation path — writes, migrations, admin panels, background jobs.

**What goes wrong:** A production incident documented in a 2026 postmortem described an Aurora MySQL Lambda-based system where the `cacheInvalidate -> cacheRebuild` flow failed silently after a database engine upgrade. The cache stayed empty for hours before manual detection. In a separate e-commerce incident, product prices were updated in the database but the cache served old prices for 6 hours, requiring manual refund processing.

**The fix:**
```python
# Before                                    # After
def update_user_profile(user_id, data):     def update_user_profile(user_id, data):
    db.execute("UPDATE ...", user_id)           db.execute("UPDATE ...", user_id)
                                                redis.delete(f"user:{user_id}")  # Invalidate
                                                pubsub.publish("cache_inv", f"user:{user_id}")
```

**Detection rule:** Audit every `cache.set()` and verify a corresponding `cache.delete()` exists for every mutation path touching the same data.

---

### AP-02: Cache Stampede

**Also known as:** Thundering herd, cache avalanche
**Frequency:** Common | **Severity:** Critical | **Detection difficulty:** Moderate

**What it looks like:**
```python
def get_popular_product(product_id):
    cached = cache.get(f"product:{product_id}")
    if cached: return cached
    # Hot key expires -> 10,000 concurrent requests ALL hit the database
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    cache.set(f"product:{product_id}", product, ttl=300)
    return product
```

**Why developers do it:** The basic cache-aside pattern is what every tutorial teaches. It works perfectly under low concurrency. The failure mode only manifests under production traffic.

**What goes wrong:** Facebook's 2010 cache stampede took hours to resolve. A documented e-commerce outage saw database CPU spike to 98%, response times balloon from 20ms to 4,500ms, and checkout pages time out — the 8-minute outage cost an estimated $10M in lost sales.

**The fix:**
```python
def get_popular_product(product_id):
    key = f"product:{product_id}"
    cached = cache.get(key)
    if cached: return cached
    lock_key = f"lock:{key}"
    if cache.set(lock_key, "1", nx=True, ex=10):  # Only one thread rebuilds
        try:
            product = db.query("SELECT * FROM products WHERE id = %s", product_id)
            cache.set(key, product, ttl=300)
            return product
        finally:
            cache.delete(lock_key)
    else:
        time.sleep(0.05)
        return cache.get(key) or get_popular_product(product_id)
```

**Detection rule:** Alert when more than 50 identical queries arrive within a 1-second window. Correlate cache miss rate spikes with database CPU spikes.

---

### AP-03: Caching Without TTL

**Also known as:** Eternal cache, immortal entries, forever cache
**Frequency:** Very Common | **Severity:** High | **Detection difficulty:** Easy

**What it looks like:**
```python
cache.set(f"config:{tenant_id}", config_data)  # No TTL — lives forever
```

**Why developers do it:** Redis `SET` does not require a TTL. Developers assume data is "static enough." Some frameworks default to no TTL.

**What goes wrong:** GitLab experienced a production outage when redis-cache memory usage forced emergency maintenance to avoid failover — keys without TTL had accumulated unboundedly. Azure Managed Redis users reported multi-hour OOM outages where the cache rejected all writes.

**The fix:**
```python
class SafeCache:
    DEFAULT_TTL = 3600
    MAX_TTL = 86400
    def set(self, key, value, ttl=None):
        ttl = min(ttl or self.DEFAULT_TTL, self.MAX_TTL)
        self._client.set(key, value, ex=ttl)  # TTL enforced at wrapper level
```

**Detection rule:** Run `redis-cli --scan` and check for keys where `TTL keyname` returns `-1`. Alert if >5% of keys lack TTL.

---

### AP-04: Not Handling Cache Misses Gracefully

**Also known as:** Cache-or-crash, missing fallback, brittle read path
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**
```python
def get_dashboard_data(user_id):
    data = cache.get(f"dashboard:{user_id}")
    return render_dashboard(data)  # data is None on miss -> crash or empty page
```

**Why developers do it:** During development the cache is always warm. The miss path is never exercised locally.

**What goes wrong:** A 2026 postmortem titled "The Day Our Cache Became Our Single Point of Failure" documented a Redis cluster restart causing all requests to fall through to a database not provisioned for the full load, taking down the entire service.

**The fix:**
```python
def get_with_fallback(key, fallback_fn, ttl=300):
    try:
        data = cache.get(key)
    except CacheConnectionError:
        return fallback_fn()  # Cache down? Degrade, don't crash
    if data is None:
        data = fallback_fn()
        try: cache.set(key, data, ttl=ttl)
        except CacheConnectionError: pass
    return data
```

**Detection rule:** Search for `cache.get()` calls not followed by a `None` check. Load-test with an empty cache.

---

### AP-05: Cache as Source of Truth

**Also known as:** Cache-as-database, ephemeral primary, volatile truth
**Frequency:** Common | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
def add_to_cart(user_id, item_id, qty):
    cart = cache.get(f"cart:{user_id}") or {}
    cart[item_id] = qty
    cache.set(f"cart:{user_id}", cart, ttl=86400)  # No database write — cache only
```

**Why developers do it:** Cache writes are fast and simple. "We will add persistence later" — and never do.

**What goes wrong:** Any eviction, restart, or failover causes permanent data loss. Users lose shopping carts during peak traffic (when eviction is most likely). Customer support is flooded but there is no way to recover data that was never persisted.

**The fix:**
```python
def add_to_cart(user_id, item_id, qty):
    db.execute("INSERT INTO cart_items ... ON CONFLICT DO UPDATE ...", user_id, item_id, qty)
    cart = db.query("SELECT * FROM cart_items WHERE user_id = %s", user_id)
    cache.set(f"cart:{user_id}", cart, ttl=3600)  # Cache accelerates, DB persists
```

**Detection rule:** Grep for `cache.set()` not preceded by a database write. Flag data models existing only in Redis with no corresponding table.

---

### AP-06: Caching Error Responses

**Also known as:** Negative caching of failures, error amplification, cached 500s
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**
```python
try:
    result = http.get(f"https://api.example.com/data/{key}").json()
except Exception:
    result = {"error": "Service unavailable"}
cache.set(f"ext:{key}", result, ttl=3600)  # Caches the error for 1 hour!
```

**Why developers do it:** The caching logic does not distinguish success from failure. Google Cloud Apigee documentation specifically identifies this as a common API gateway anti-pattern.

**What goes wrong:** An upstream API returns a 500 for 2 seconds during a deployment. The cache stores the error with a 1-hour TTL. Every user gets the cached error for 3,598 seconds longer than necessary.

**The fix:**
```python
try:
    response = http.get(url)
    response.raise_for_status()
    cache.set(key, response.json(), ttl=3600)        # Cache success: long TTL
except Exception:
    cache.set(f"{key}:neg", True, ttl=10)             # Negative cache: short TTL
```

**Detection rule:** Alert if error-tagged cache entries have TTL > 60 seconds. Review all `cache.set()` calls inside `except` blocks.

---

### AP-07: Over-Caching

**Also known as:** Cache everything, premature caching, cache bloat
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Moderate

**What it looks like:**
```python
# Separate cache entries for every fragment of user data
cache.set(f"user:{uid}", user)           # user object
cache.set(f"user_prefs:{uid}", prefs)    # preferences
cache.set(f"user_avatar:{uid}", avatar)  # avatar URL
cache.set(f"user_teams:{uid}", teams)    # team memberships
# Updating a user now requires invalidating 4+ keys (often missed)
```

**Why developers do it:** Once caching works for one endpoint, the instinct is to cache everything. Each addition is individually reasonable; the aggregate is unmanageable.

**What goes wrong:** Invalidation becomes a combinatorial explosion. Stale data bugs are frequent but hard to reproduce. The operational cost of maintaining cache consistency exceeds the original performance cost.

**The fix:** Cache at the aggregate level for hot paths only. Rule: only cache data read >10x more than written.

**Detection rule:** If cache-key-to-table ratio exceeds 5:1, caching is over-fragmented. Keys with hit rates below 10% waste memory.

---

### AP-08: Under-Caching

**Also known as:** Cache-shy, database-for-everything
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Easy

**What it looks like:**
```python
def get_homepage():
    # 12 DB queries on every page load — data changes once/hour, queried 50,000 times/hour
    featured = db.query("SELECT * FROM products WHERE featured = true")
    categories = db.query("SELECT * FROM categories")
    # ...
```

**Why developers do it:** Fear of stale data. Past caching bugs. "The database can handle it."

**What goes wrong:** When a marketing campaign drives 10x traffic, the un-cached homepage brings down the database cluster, affecting all services.

**The fix:** Cache data proportional to its read:write ratio. Any query executing >100 times/minute with identical parameters is a caching candidate.

**Detection rule:** Calculate read:write ratios per table — ratio > 50:1 warrants caching. Flag endpoints responsible for >10% of total query volume.

---

### AP-09: Cache Key Collisions

**Also known as:** Key namespace pollution, tenant bleed, hash collision
**Frequency:** Uncommon | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
def get_dashboard(tenant_id):
    cached = cache.get("dashboard_stats")  # Same key for ALL tenants!
    if cached: return cached
    stats = db.query("SELECT * FROM stats WHERE tenant_id = %s", tenant_id)
    cache.set("dashboard_stats", stats, ttl=300)
    return stats  # Tenant B gets Tenant A's data
```

**Why developers do it:** Multi-tenancy is added after the caching layer is built. Single-tenant dev environments mask the problem.

**What goes wrong:** Pingora (Cloudflare's proxy) disclosed CVE-2026-2836: versions prior to 0.8.0 generated cache keys using only the URI path, excluding the host header, enabling cross-tenant data leakage. A SaaS incident involved Tenant A's financial data written to a generic key and served to Tenant B milliseconds later.

**The fix:**
```python
def cache_key(tenant_id, resource, resource_id, version="v1"):
    return f"{version}:{tenant_id}:{resource}:{resource_id}"
# "v1:acme:dashboard:stats" — unique per tenant, versioned
```

**Detection rule:** Grep for cache keys missing tenant/user/org identifiers in multi-tenant systems. Unit-test key generation with multiple tenants.

---

### AP-10: Not Warming Caches

**Also known as:** Cold start penalty, empty cache deployment, first-request tax
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Easy

**What it looks like:** Application deploys with empty cache. First 10,000 users all hit the database simultaneously. Response times: 2,000ms until cache fills, 20ms after.

**Why developers do it:** Cache warming requires extra infrastructure. Teams treat cache as a transparent layer that "will fill up on its own."

**What goes wrong:** During rolling deployment of 20 servers with in-memory caching, the first minute sees 20x database load spike. Combined with stampede on hot keys, this cascades into a full outage.

**The fix:**
```python
def on_startup():
    hot_keys = db.query("SELECT key FROM cache_manifest WHERE priority = 'critical'")
    for k in hot_keys:
        cache.set(k.key, fetch_from_source(k), ttl=k.ttl)
    logger.info(f"Warmed {len(hot_keys)} cache entries")
```

**Detection rule:** Compare p99 latency at T+0 vs T+10 minutes post-deploy. If ratio >5x, cache warming is needed.

---

### AP-11: Infinite Cache Growth

**Also known as:** Unbounded cache, memory leak via cache, OOM time bomb
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**
```python
app_cache = {}  # Unbounded dict — unique queries accumulate forever
def get_search_results(query):
    if query not in app_cache:
        app_cache[query] = db.search(query)
    return app_cache[query]
```

**Why developers do it:** Python dicts are easy caches with zero dependencies. Redis defaults to no memory limit on many installations.

**What goes wrong:** GitLab production outage from redis-cache memory exhaustion forced emergency maintenance. AWS ElastiCache users documented multi-hour OOM outages where Redis rejected all writes while reads served increasingly stale data.

**The fix:**
```python
from cachetools import TTLCache
app_cache = TTLCache(maxsize=10000, ttl=600)  # Bounded + TTL
# Redis: always set maxmemory 2gb + maxmemory-policy allkeys-lru
```

**Detection rule:** Monitor Redis memory; alert at 70% of `maxmemory`. Flag bare `dict` used as cache without size limits.

---

### AP-12: Distributed Cache Inconsistency

**Also known as:** Split-brain cache, replica drift, cross-region staleness
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Hard

**What it looks like:**
```python
# Service A writes to primary:  redis_primary.set("inventory:42", 0)     # sold out
# Service B reads from replica:  redis_replica.get("inventory:42")  # -> 5 (stale) -> overselling
```

**Why developers do it:** Read replicas are standard scaling. Replication lag is usually milliseconds — invisible in testing. The 0.1% inconsistency matters for financial data and inventory.

**What goes wrong:** Facebook's Memcached architecture documented permanent stale data from concurrent updates to different cached copies in different orders. A documented inventory incident: Instance A decremented from 700 to 690, Instance B decremented from 700 to 695, replication messages crossed, final count 695 instead of correct 685.

**The fix:** Read from primary for critical paths. Publish invalidation events. Use short TTLs as safety nets.

**Detection rule:** Compare values between primary and replica for critical keys. Alert when replication lag >100ms for financial data.

---

### AP-13: Caching User-Specific Data Globally

**Also known as:** Shared personal data, auth context leak, session bleed
**Frequency:** Uncommon | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
@app.route("/dashboard")
def dashboard():
    user = get_current_user()
    response = make_response(render_template("dashboard.html", user=user))
    response.headers["Cache-Control"] = "public, max-age=300"  # CDN caches this!
    return response  # User A's bank balance served to User B
```

**Why developers do it:** CDN caching added globally without distinguishing public from authenticated pages.

**What goes wrong:** The Cloudbleed incident (2017) exposed private data — cookies, auth tokens, POST bodies — from Cloudflare customers to other customers through cached memory. Over 18 million requests potentially leaked data. Application-level incidents have served one user's financial dashboard to other users via CDN.

**The fix:**
```python
@app.after_request
def set_cache_headers(response):
    if hasattr(g, 'current_user') and g.current_user:
        response.headers["Cache-Control"] = "private, no-store"
    return response
```

**Detection rule:** Scan authenticated endpoints for `Cache-Control: public`. Flag CDN-cached URLs returning `Set-Cookie`.

---

### AP-14: Cache Penetration

**Also known as:** Cache-miss attack, nonexistent key flood, phantom query storm
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**
```python
def get_user(user_id):
    cached = cache.get(f"user:{user_id}")
    if cached: return cached
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    if user: cache.set(f"user:{user_id}", user, ttl=3600)
    return user  # IDs -1, -2, -3... always miss cache AND DB
```

**Why developers do it:** Only positive results are cached. Nonexistent keys bypass both cache and database on every request.

**What goes wrong:** Attackers send millions of requests for nonexistent IDs. Every request bypasses cache and hits the database. 100% miss rate sustained indefinitely.

**The fix:**
```python
EMPTY = "__NULL__"
def get_user(user_id):
    if not bloom_filter.might_contain(f"user:{user_id}"): return None  # O(1) reject
    cached = cache.get(f"user:{user_id}")
    if cached == EMPTY: return None
    if cached: return cached
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    cache.set(f"user:{user_id}", user if user else EMPTY, ttl=3600 if user else 60)
    return user
```

**Detection rule:** Alert if cache miss rate exceeds 90% for a key pattern. Monitor for high volumes of "row not found" queries.

---

### AP-15: Dog-Pile Effect

**Also known as:** Cache rebuild storm, recompute avalanche, hot key reconstruction
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**
```python
def get_leaderboard():
    cached = cache.get("leaderboard")
    if cached: return cached
    # 30-second aggregation query — 500 concurrent users trigger 500 parallel copies
    leaderboard = db.query("SELECT user_id, SUM(score) ... GROUP BY ... ORDER BY ... LIMIT 100")
    cache.set("leaderboard", leaderboard, ttl=300)
    return leaderboard
```

**Why developers do it:** A specific variant of stampede (AP-02) for expensive computations. The longer the rebuild, the worse the pile-up.

**What goes wrong:** A gaming platform's leaderboard cache expired during peak hours. The 45-second query attracted 12,000 concurrent requests, each spawning its own copy. Connection pool exhausted in 3 seconds. 20-minute outage — 19 minutes longer than one query would have taken.

**The fix:**
```python
def get_leaderboard():
    cached, ttl_remaining = cache.get_with_ttl("leaderboard")
    if cached:
        if ttl_remaining < 60: trigger_background_refresh("leaderboard")  # Async rebuild
        return cached  # Serve stale while refreshing
    return compute_with_lock()  # First load only
# Schedule background refresh every 4 min (before 5-min TTL expires)
```

**Detection rule:** Identify cache keys with recomputation > 1 second. Alert on >2 concurrent executions of the same expensive query.

---

### AP-16: Not Versioning Cache Keys

**Also known as:** Schema-cache mismatch, deployment cache poison, format drift
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Hard

**What it looks like:**
```python
# v1 cached: {"name": "Alice", "email": "a@co.com"}
# v2 code expects: user["role"]  -> KeyError! Old schema in cache
```

**Why developers do it:** Cache keys are treated as permanent. Rolling deployments mean old and new code coexist, reading/writing different formats with the same keys.

**What goes wrong:** New instances write `v2` format, old instances expect `v1`. Requests randomly succeed or fail depending on which instance handles them and which version is cached. Extremely hard to reproduce.

**The fix:**
```python
CACHE_VERSION = "v3"  # Bump on every schema change
def cache_key(resource, resource_id):
    return f"{CACHE_VERSION}:{resource}:{resource_id}"
```

**Detection rule:** Flag deployments that change cached data structures without bumping a version constant. Monitor deserialization errors in cache reads.

---

### AP-17: Caching at the Wrong Layer

**Also known as:** Misplaced cache, layer confusion, redundant caching
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Moderate

**What it looks like:**
```python
@app.route("/api/products/<pid>")
def get_product(pid):
    cached = cache.get(f"product_response:{pid}")
    if cached: return cached  # Cached as serialized HTTP response
    product = product_service.get(pid)
    response = jsonify(product)
    cache.set(f"product_response:{pid}", response, ttl=300)
    return response
# Mobile API, gRPC, admin panel — none benefit from this cache
```

**Why developers do it:** Controller-level caching is the easiest to add. It requires no changes to business logic.

**What goes wrong:** Updating a product requires clearing REST cache, GraphQL cache, mobile cache, admin cache — each with different keys. One is missed; one consumer serves stale data.

**The fix:** Cache at the service/repository layer. All consumers (REST, GraphQL, gRPC) share one cache with one invalidation point.

**Detection rule:** Search for `cache.get`/`cache.set` in controller/handler files. Cache should live in service or repository layers.

---

### AP-18: Multi-Level Cache Inconsistency

**Also known as:** L1/L2 desync, layered cache drift, tiered staleness
**Frequency:** Uncommon | **Severity:** High | **Detection difficulty:** Very Hard

**What it looks like:**
```python
def update_config(key, value):
    db.execute("UPDATE config SET value = %s WHERE key = %s", value, key)
    redis.delete(f"config:{key}")     # Invalidate L2 (shared Redis)
    # But L1 (in-process memory) on all 20 instances still has old value!
```

**Why developers do it:** L1 eliminates network round-trips, L2 eliminates repeated computation. But invalidation must propagate through all levels — developers invalidate L2 and forget L1.

**What goes wrong:** Microsoft documents that HybridCache's L1 does not synchronize across nodes — Node B serves stale data until L1 expires. A config change (feature flag, rate limit) propagates to Redis but 20 app instances enforce the old value from their L1 caches for the remaining TTL.

**The fix:**
```python
def update_config(key, value):
    db.execute("UPDATE config SET value = %s WHERE key = %s", value, key)
    redis.delete(f"config:{key}")            # Invalidate L2
    local_cache.pop(key, None)               # Invalidate local L1
    pubsub.publish("cache_inv", key)         # Broadcast to all instances

def on_cache_invalidation(key):
    local_cache.pop(key, None)               # Clear L1 on every node
```

**Detection rule:** Verify invalidation touches every cache level. Set L1 TTL shorter than L2 TTL. Test by updating a value and reading from multiple instances.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns It Drives | Mitigation |
|---|---|---|
| Read/write paths built separately | AP-01, AP-05, AP-16 | Cache-aside with invalidation hooks at the repository layer |
| Caching added without concurrency analysis | AP-02, AP-15 | Locking, probabilistic early recompute, background refresh |
| Default configs accepted without review | AP-03, AP-11 | Enforce TTL and maxmemory via wrapper classes |
| Happy-path-only development | AP-04, AP-06, AP-14 | Chaos testing: empty cache, cache down, nonexistent keys |
| Cache treated as durable storage | AP-05, AP-01 | Rule: cache is always a derived, disposable copy |
| Single-tenant dev, multi-tenant production | AP-09, AP-13 | Tenant ID in every key; multi-tenant integration tests |
| Optimization without measurement | AP-07, AP-08 | Profile before caching; track hit rates and read:write ratios |
| Ignoring deployment-time state transitions | AP-10, AP-16 | Warming scripts; versioned keys; blue-green deploys |
| Not modeling distributed propagation | AP-12, AP-18 | Pub/sub invalidation; short L1 TTLs; read-your-writes |
| Cache placed in wrong architectural tier | AP-17, AP-07 | Cache at service/repository layer, not HTTP handlers |

---

## Self-Check Questions

1. **What happens when this cache key expires under high concurrency?** Can 1,000 requests simultaneously rebuild it? (AP-02, AP-15)
2. **If Redis restarts right now, does the app crash or degrade gracefully?** (AP-04, AP-05)
3. **Every `cache.set()` has a corresponding invalidation — where is it?** Can I trace every mutation path? (AP-01)
4. **Does every cache key include all discriminators?** Tenant ID, user ID, locale, API version? (AP-09, AP-13)
5. **What is the maximum memory this cache can consume?** Is there `maxmemory` or `maxsize`? (AP-03, AP-11)
6. **Am I caching errors?** If upstream fails, do I cache the failure for an hour? (AP-06)
7. **What happens on the first request after deployment?** Cold cache? How long until performance stabilizes? (AP-10)
8. **If I change cached data schema, what happens to existing entries?** (AP-16)
9. **Am I caching at the right layer?** Would service-layer caching benefit multiple consumers? (AP-17)
10. **For multi-level caches: does invalidation propagate to ALL levels?** (AP-18)
11. **What is the read:write ratio?** If <10:1, is caching worth the invalidation complexity? (AP-07, AP-08)
12. **Can an attacker force 100% cache miss rates?** (AP-14)
13. **Is `Cache-Control` correct for authenticated endpoints?** Any user-specific responses marked `public`? (AP-13)
14. **In a distributed cache, what is the replication lag?** Can stale reads cause overselling? (AP-12)
15. **Can I delete the entire cache right now and the system still works?** If no, the cache is the source of truth. (AP-05)

---

## Code Smell Quick Reference

| Code Smell | Likely Anti-Pattern | Quick Check |
|---|---|---|
| `cache.set()` without `ttl`/`ex` parameter | AP-03: No TTL | Grep `\.set\(` without TTL arg |
| `cache.set()` with no corresponding `cache.delete()` | AP-01: No invalidation | Trace DB writes; verify invalidation |
| `cache.get()` with no `None` check or fallback | AP-04: No miss handling | Find `cache.get` without conditional |
| `Cache-Control: public` on authenticated routes | AP-13: Global user data | Scan response headers on `/api/*` |
| Cache key without tenant prefix in multi-tenant app | AP-09: Key collision | Grep keys for missing scope IDs |
| `cache.set()` inside `except` block | AP-06: Caching errors | Find cache writes in error handlers |
| `dict`/`HashMap` as cache without size bound | AP-11: Infinite growth | Find unbounded in-memory caches |
| `cache.set()` in HTTP handler/controller | AP-17: Wrong layer | Cache belongs in service/repo layer |
| Cache key without version prefix | AP-16: No versioning | Check key format for version component |
| `cache.get()` as only data source (no DB fallback) | AP-05: Cache as truth | Verify DB fallback exists |
| Multiple `cache.set()` for same data in different formats | AP-07: Over-caching | Look for duplicate caching |
| Expensive query (>1s) with simple cache-aside | AP-15: Dog-pile risk | Needs locking or background refresh |
| `redis.delete()` without `local_cache.pop()` | AP-18: L1/L2 desync | Verify all cache tiers invalidated |
| No negative caching for user lookups | AP-14: Penetration | Add null sentinel or Bloom filter |
| `maxmemory` not set in `redis.conf` | AP-11: Infinite growth | Audit Redis configuration |
| No cache metrics (hit/miss/eviction rates) | All patterns | Instrument all cache operations |

---

*Researched: 2026-03-08 | Sources: [Facebook Memcached Scaling (NSDI 2013)](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala), [Cloudbleed Incident Report](https://blog.cloudflare.com/incident-report-on-memory-leak-caused-by-cloudflare-parser-bug/), [GitLab Redis-Cache Outage](https://gitlab.com/gitlab-com/gl-infra/production/-/issues/482), [Pingora CVE-2026-2836](https://advisories.gitlab.com/pkg/cargo/pingora-cache/CVE-2026-2836/), [Google Cloud Memorystore Best Practices](https://docs.cloud.google.com/memorystore/docs/redis/memory-management-best-practices), [Google Apigee Caching Error Anti-Pattern](https://docs.cloud.google.com/apigee/docs/api-platform/antipatterns/caching-error), [AWS ElastiCache OOM Troubleshooting](https://repost.aws/knowledge-center/oom-command-not-allowed-redis), [Next.js Cache Poisoning CVE-2025-49826](https://zeropath.com/blog/nextjs-cache-poisoning-cve-2025-49826), [HybridCache Distributed Invalidation](https://www.milanjovanovic.tech/blog/solving-the-distributed-cache-invalidation-problem-with-redis-and-hybridcache), [Cache Stampede & Thundering Herd](https://distributed-computing-musings.com/2021/12/thundering-herd-cache-stampede/), [Redis Cache Invalidation Bug Postmortem](https://dev.to/jayesh_shinde/how-a-cache-invalidation-bug-nearly-took-down-our-system-and-what-we-changed-after-2dd2), [Cache as Single Point of Failure Postmortem](https://naveen-metta.medium.com/the-day-our-cache-became-our-single-point-of-failure-a-postmortem-758dc85364fc)*
