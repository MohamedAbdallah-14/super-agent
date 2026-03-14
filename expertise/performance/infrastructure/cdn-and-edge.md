# CDN & Edge Computing Performance

> **Module**: Infrastructure Performance
> **Domain**: Content Delivery Networks & Edge Computing
> **Last Updated**: 2026-03-08
> **Audience**: Performance engineers, platform architects, frontend/backend developers

---

## Table of Contents

1. [CDN Fundamentals](#cdn-fundamentals)
2. [CDN Provider Comparison](#cdn-provider-comparison)
3. [Edge Computing Platforms](#edge-computing-platforms)
4. [Cache Configuration](#cache-configuration)
5. [Cache Hit Ratio Optimization](#cache-hit-ratio-optimization)
6. [Static vs Dynamic Content at the Edge](#static-vs-dynamic-content-at-the-edge)
7. [Origin Shield and Tiered Caching](#origin-shield-and-tiered-caching)
8. [Common Bottlenecks](#common-bottlenecks)
9. [Anti-Patterns](#anti-patterns)
10. [Before/After: Measured Improvements](#beforeafter-measured-improvements)
11. [Decision Tree: Should This Be Served from the Edge?](#decision-tree-should-this-be-served-from-the-edge)
12. [Sources](#sources)

---

## CDN Fundamentals

### What a CDN Does

A Content Delivery Network distributes copies of assets across geographically dispersed
edge servers so that user requests are served from the nearest location rather than
traveling to a single origin. The core value proposition is latency reduction: a request
that would take 200ms to reach a distant origin can be served in 10-30ms from a nearby
edge node.

### Latency Reduction Mechanics

Without a CDN, every request must traverse the full network path to the origin:

```
User (Sydney) --> Origin (us-east-1, Virginia)
Round-trip: ~200-280ms (physical distance + TCP handshake + TLS negotiation)
```

With a CDN edge node in Sydney:

```
User (Sydney) --> Edge (Sydney PoP, cached)
Round-trip: ~10-25ms (local network hop only)
```

The improvement comes from three factors:

1. **Geographic proximity**: Light travels at ~200km/ms in fiber. Sydney to Virginia
   is ~16,000km, imposing a minimum ~80ms one-way physical latency. A local edge
   eliminates this entirely.
2. **TCP/TLS optimization**: CDN edge nodes maintain persistent connections to the
   origin (connection pooling), eliminating repeated handshake overhead for users.
   A cold TLS 1.3 handshake adds 1 RTT (~100-200ms to a distant origin); a warm
   edge connection removes this.
3. **Cache hits**: Content served directly from edge memory/SSD avoids origin
   processing time entirely. Origin compute (database queries, template rendering)
   typically adds 50-500ms that cached responses skip.

### Measured Latency Benchmarks

| Scenario                        | Typical Latency | Notes                                |
|---------------------------------|-----------------|--------------------------------------|
| No CDN, cross-continent origin  | 200-400ms       | Full RTT + origin processing         |
| CDN cache miss (origin fetch)   | 80-150ms        | Optimized origin connection          |
| CDN cache hit (edge served)     | 10-30ms         | Local PoP, no origin contact         |
| CDN cache hit (same city)       | 5-15ms          | Sub-millisecond edge processing      |

Cloudflare reports that their network serves content within approximately 50ms of 95%
of the Internet-connected population globally, achieved through 330+ data center
locations across 120+ countries (Source: Cloudflare Network page).

---

## CDN Provider Comparison

### Provider Overview

| Provider        | Edge Locations | Global Reach          | Strengths                                     |
|-----------------|----------------|-----------------------|-----------------------------------------------|
| Cloudflare      | 330+ cities    | 120+ countries        | Broadest coverage, integrated security, Workers|
| Akamai          | 4,200+ locations| 130+ countries       | Largest legacy network, media delivery         |
| AWS CloudFront  | 600+ PoPs      | 100+ cities           | Deep AWS integration, Lambda@Edge              |
| Fastly          | ~90 PoPs       | ~30 countries         | Instant purge (<150ms), VCL edge logic         |

### Latency Benchmarks (2024-2025 Data)

**Cloudflare** is the fastest CDN in 48%+ of the top 1,000 networks globally
(November 2024 - March 2025 measurement period). Median edge latency: 29-33ms in
emerging markets (India, South Africa). Their 2025 software upgrade (Rust-based
proxy) cut median response time by 10ms and delivered a 25% performance boost as
measured by third-party CDN performance tests (Source: Cloudflare Blog, Developer
Week 2025).

**Fastly** achieves the lowest mean network latency in North America and Europe,
with a 17ms average TTFB in Q2 2024 measurements. Fastly's strength is instant
cache purging (<150ms globally) and programmable edge via VCL/Compute@Edge
(Source: Pingdom CDN Benchmarks).

**AWS CloudFront** shows p95 TTFB of 404ms on Cox Communications (ASN 22773) vs
Akamai's 441ms on the same network. However, on Comcast (ASN 7922), Akamai leads
with 384ms vs CloudFront's 418ms. CloudFront excels for AWS-hosted origins due
to optimized private backbone routing (Source: Cloudflare Edge Network Benchmarking
Blog).

**Akamai** maintains ~25ms average global latency due to highest node density
(4,200+ locations). Strongest for large-file media delivery in North America and
Europe with high-throughput optimization (Source: CloudOptimo CDN Comparison 2025).

### Regional Performance Variance

Region-specific latency can differ by 10-40ms between providers. This compounds
fast for chatty APIs or high-frequency requests. Key insight: **test from your
actual user locations**, not from global averages.

```
Provider performance by region (approximate median TTFB):

                 NA      EU      APAC    LATAM   Africa
Cloudflare       18ms    22ms    29ms    35ms    33ms
Fastly           17ms    19ms    45ms    55ms    60ms
CloudFront       22ms    25ms    35ms    40ms    50ms
Akamai           20ms    22ms    28ms    38ms    42ms
```

*Note: These are approximate composite figures derived from multiple benchmark
sources. Actual performance depends on specific PoP, ISP peering, and time of
measurement.*

### Provider Selection Criteria

- **Cloudflare**: Best for broadest global coverage, integrated WAF/DDoS, and
  edge compute (Workers). Free tier available. Best default choice.
- **Fastly**: Best for instant purge requirements (publishing, e-commerce),
  programmable edge logic via VCL, and streaming/API-heavy workloads.
- **CloudFront**: Best for AWS-native architectures. Lambda@Edge for custom logic.
  Tight integration with S3, ALB, API Gateway.
- **Akamai**: Best for large enterprises with media-heavy workloads, highest
  node density for consistent global performance. Premium pricing.

---

## Edge Computing Platforms

### The Shift: CDN to Compute

Traditional CDNs cache and serve static content. Edge computing platforms run
arbitrary code at edge locations, enabling dynamic request handling without
origin round-trips. The key differentiator is the runtime model.

### Platform Comparison

| Platform              | Runtime       | Cold Start     | Locations | Max Execution |
|-----------------------|---------------|----------------|-----------|---------------|
| Cloudflare Workers    | V8 Isolates   | <1ms (0ms*)    | 330+      | 30s (free), 15min (paid) |
| Vercel Edge Functions | V8 (Edge Runtime) | <50ms      | ~100      | 30s           |
| Deno Deploy           | V8 Isolates   | ~30ms (warm), ~120ms (cold) | 35+ | 50ms CPU (free) |
| AWS Lambda@Edge       | Container     | 100-500ms      | 600+      | 5s (viewer), 30s (origin) |
| Fastly Compute        | Wasm          | <1ms           | ~90       | No hard limit  |

*Cloudflare claims "0ms cold starts" because V8 isolates start in under 5ms, which
is below observable latency thresholds for most applications.*

### V8 Isolates vs Containers

Cloudflare Workers pioneered the V8 isolate model, which fundamentally changes
cold start characteristics:

**Container model (Lambda, Lambda@Edge)**:
- Spin up time: 500ms - 10 seconds per container
- Memory overhead: 128MB minimum per function instance
- Isolation: OS-level process isolation
- Cold starts are inherent to the architecture

**V8 Isolate model (Workers, Deno Deploy)**:
- Spin up time: <5ms per isolate
- Memory overhead: ~5MB per isolate (order of magnitude less)
- Isolation: V8 sandbox (memory-isolated contexts within a single process)
- A single runtime process hosts hundreds or thousands of isolates
- Cold starts are effectively eliminated

The isolate model is approximately **100x faster to start** than a container and
uses **~25x less memory**, making it ~3x cheaper per CPU-cycle
(Source: Cloudflare Blog, "Cloud Computing without Containers").

### Cold Start Impact on User Experience

```
Cold start impact on P99 latency:

Lambda@Edge:    |=========================>  250-500ms added
Deno Deploy:    |==>                           30-120ms added
Vercel Edge:    |=>                             10-50ms added
CF Workers:     |                                <5ms added
Fastly Compute: |                                <1ms added (Wasm)
```

For latency-sensitive applications (authentication, A/B testing, personalization),
the difference between a 500ms container cold start and a sub-5ms isolate start
is the difference between a noticeable delay and an imperceptible one.

### Edge Compute Use Cases with Latency Impact

| Use Case                    | Without Edge   | With Edge   | Improvement |
|-----------------------------|----------------|-------------|-------------|
| Auth token validation       | 150-300ms      | 5-15ms      | 10-20x      |
| A/B test assignment         | 100-200ms      | 2-10ms      | 10-50x      |
| Geo-based content routing   | 120-250ms      | 1-5ms       | 25-100x     |
| Image optimization/resize   | 200-800ms      | 50-150ms    | 2-5x        |
| API response transformation | 100-300ms      | 10-30ms     | 5-10x       |
| Bot detection/WAF           | 50-150ms       | 1-5ms       | 10-30x      |

---

## Cache Configuration

### Cache-Control Headers

The `Cache-Control` header is the primary mechanism for controlling CDN and browser
caching behavior. Misconfigured HTTP headers alone can reduce cache-hit ratios by
as much as 20% (Source: BlazingCDN Cache-Hit Ratio Optimization).

#### Essential Directives

```http
# Static assets with content hash in filename (CSS, JS, images with hash)
Cache-Control: public, max-age=31536000, immutable

# API responses that change infrequently
Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400

# User-specific content (never cache on shared/CDN caches)
Cache-Control: private, max-age=0, no-store

# HTML pages (short CDN cache, revalidate frequently)
Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300
```

#### Directive Reference

| Directive                 | Applies To       | Purpose                                          |
|---------------------------|------------------|--------------------------------------------------|
| `public`                  | All caches       | Explicitly allows CDN/proxy caching              |
| `private`                 | Browser only     | Prevents CDN caching, browser-only               |
| `max-age=N`               | Browser + CDN    | Freshness lifetime in seconds                    |
| `s-maxage=N`              | CDN/proxy only   | Overrides max-age for shared caches              |
| `no-cache`                | All caches       | Must revalidate before serving (NOT "don't cache")|
| `no-store`                | All caches       | Never store in any cache                         |
| `immutable`               | All caches       | Never revalidate, content will not change         |
| `stale-while-revalidate=N`| CDN/proxy        | Serve stale for N seconds while revalidating     |
| `stale-if-error=N`        | CDN/proxy        | Serve stale for N seconds if origin errors       |
| `must-revalidate`         | All caches       | Do not serve stale content under any condition   |

### stale-while-revalidate (SWR)

SWR is the single most impactful cache directive for perceived performance. It
allows the CDN to serve a stale (expired) cached response immediately while
asynchronously fetching a fresh copy from the origin in the background.

**Without SWR**: When cache expires, user waits for origin response (~100-300ms).
**With SWR**: User gets instant cached response (<20ms), origin fetch happens
asynchronously. Next request gets the fresh copy.

```http
# Recommended SWR configuration
# Fresh for 5 minutes, serve stale for up to 24 hours while revalidating
Cache-Control: public, s-maxage=300, stale-while-revalidate=86400

# Real-world example from Polyfill Service
Cache-Control: public, max-age=86400, stale-while-revalidate=604800, stale-if-error=604800
```

**SWR support by provider**:
- Cloudflare: Supported and respected on all plans
- Fastly: Supported via both Cache-Control and Surrogate-Control headers
- CloudFront: Supported (announced 2024)
- Akamai: Supported via Edge Control headers
- Google Cloud CDN: Supported natively

### stale-if-error

Provides resilience by serving cached content when the origin returns 5xx errors:

```http
# Serve stale for up to 24 hours if origin returns 500, 502, 503, or 504
Cache-Control: public, s-maxage=3600, stale-if-error=86400
```

This is critical for availability. If your origin goes down, users still see
content (potentially hours old, but functional) rather than error pages.

### Surrogate-Control (CDN-Only Headers)

Fastly and some CDN providers support `Surrogate-Control`, which is stripped before
reaching the browser, giving you separate CDN vs browser caching policies:

```http
# CDN caches for 1 hour, browser caches for 5 minutes
Surrogate-Control: max-age=3600, stale-while-revalidate=60, stale-if-error=86400
Cache-Control: public, max-age=300
```

### TTL Strategy by Content Type

| Content Type                  | s-maxage    | SWR           | Browser max-age | Strategy          |
|-------------------------------|-------------|---------------|-----------------|-------------------|
| Hashed static assets (JS/CSS)| 1 year      | Not needed    | 1 year          | Immutable + hash  |
| Images (content-addressed)    | 1 year      | Not needed    | 1 year          | Immutable + hash  |
| HTML pages                    | 60s         | 300s          | 0               | Short CDN, revalidate |
| API (infrequent changes)      | 300s        | 86400s        | 60s             | SWR covers gaps   |
| API (real-time data)          | 5s          | 30s           | 0               | Ultra-short + SWR |
| Fonts                         | 1 year      | Not needed    | 1 year          | Immutable + CORS  |
| User-specific responses       | 0 (private) | N/A           | 0               | No CDN caching    |

### Cache Tags and Purging

Cache tags allow grouping cached objects by logical entity, enabling targeted
invalidation without URL-by-URL purging.

**Tagging example (Cloudflare)**:
```http
# Origin response headers
Cache-Tag: product-123, category-electronics, homepage-featured
```

**Purging by tag**:
```bash
# Purge all cached objects tagged with "product-123"
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {token}" \
  -d '{"tags": ["product-123"]}'
```

**Purge strategies ranked by preference**:

1. **Versioned URLs** (best): `/assets/main.a1b2c3d4.js` -- no purge needed,
   new content = new URL. Cache-hit ratio: 99%+.
2. **Tag-based purge**: Purge on content change event. Precise, fast (<150ms on
   Fastly, <30s on Cloudflare). Cache-hit ratio: 95-99%.
3. **URL-based purge**: Purge specific URLs. Acceptable but fragile if URL
   patterns change. Cache-hit ratio: 90-97%.
4. **Wildcard/prefix purge**: Purge all `/api/v2/*`. Broader blast radius.
   Cache-hit ratio: 85-95%.
5. **Purge everything**: Nuclear option. Causes cache stampede, origin load spike.
   Cache-hit ratio drops to 0% momentarily. **Avoid in production.**

**Best practice**: Purge on write, not on read. Trigger purges from your CMS
or API when content changes, not when users request stale content.

---

## Cache Hit Ratio Optimization

### Target: 95%+ Cache Hit Ratio

A good cache hit ratio should be between 95-99%, meaning less than 5% of requests
reach the origin server (Source: Stormit, CacheFly). The formula:

```
Cache Hit Ratio = (Cache Hits) / (Cache Hits + Cache Misses) x 100
```

### Why It Matters: Business Impact

- E-commerce platforms with >95% cache-hit ratios see **20% lower bounce rates**
  and **35% higher conversion rates** than those below 75% (Source: Shopify
  analysis, 2023).
- Streaming providers (Netflix, Disney+) invest heavily in cache optimization to
  ensure glitch-free 4K playback and reduce egress costs by up to **60%**
  (Source: Akamai Blog).
- For enterprise SaaS, even a **2% improvement** in cache-hit ratio can save
  millions annually in infrastructure costs.
- Managed media provider G&L slashed egress costs by up to **90%** with Akamai
  cache optimization (Source: Akamai case study).

### Strategies to Reach 95%+

#### 1. Normalize Cache Keys

Cache key fragmentation is the #1 cause of low hit ratios. If your cache key
includes unnecessary query parameters, each variation creates a separate cache
entry:

```
# BAD: Each tracking parameter creates a separate cache entry
/page?utm_source=google&utm_medium=cpc     --> Cache entry 1
/page?utm_source=twitter&utm_medium=social  --> Cache entry 2
/page?fbclid=abc123                         --> Cache entry 3
# All three serve identical content but are cached separately

# GOOD: Strip marketing/tracking parameters from cache key
/page --> Single cache entry, 3x higher hit ratio
```

Adobe improved cache hits for static assets by **9%** simply by normalizing URL
patterns in their edge configuration (Source: Adobe Experience Manager docs).

#### 2. Enable Cache Shielding / Origin Shield

See [Origin Shield section](#origin-shield-and-tiered-caching). Customers using
Fastly's shielding see **99%+ of requests handled at the edge** (Source: Fastly
Blog).

#### 3. Cache Warming

Pre-populate the cache with high-demand content before users request it:

```bash
# Warm cache for top 100 URLs after deployment
cat top-urls.txt | xargs -P 10 -I {} curl -s -o /dev/null -w "%{url}: %{http_code}\n" {}
```

This is critical after deployments or purge-everything operations to prevent
cache stampede.

#### 4. Increase TTLs

Longer TTLs = higher hit ratios, but balance with content freshness:

```
TTL 60s  + 1000 req/min = ~98% hit ratio (first request per minute is a miss)
TTL 300s + 1000 req/min = ~99.6% hit ratio
TTL 3600s + 1000 req/min = ~99.97% hit ratio
```

Use `stale-while-revalidate` to get the freshness of short TTLs with the hit
ratio of long TTLs.

#### 5. Optimize Vary Headers

The `Vary` header tells caches to create separate entries per header value.
`Vary: Accept-Encoding` is fine (gzip vs br). `Vary: User-Agent` destroys
cache-hit ratios (thousands of unique user agents = thousands of cache entries).

```http
# GOOD: Limited variation
Vary: Accept-Encoding

# BAD: Infinite variation, effectively uncacheable
Vary: User-Agent
Vary: Cookie
```

#### 6. Fragment Caching

For pages with mixed static/dynamic content, split the response:

- Cache the page shell (header, footer, navigation) at the edge: 95%+ of bytes
- Inject dynamic fragments (user name, cart count) via client-side fetch or ESI
- Overall cache-hit ratio stays high while dynamic content stays fresh

#### 7. Custom Cache Keys

Configure CDN to include only relevant request attributes in the cache key:

```
# Cloudflare Page Rule / Cache Rule example
Cache Key: {scheme}://{host}{path}
Ignore: query string parameters matching utm_*, fbclid, gclid, ref
Include: query string parameters matching page, sort, filter
```

### Monitoring Cache Hit Ratio

Track these metrics continuously:

```
Primary:    Cache Hit Ratio (target: >95%)
Secondary:  Origin Requests per Second (target: minimize)
Tertiary:   Cache Bandwidth Saved (cost metric)
Alert:      Cache Hit Ratio drops below 90% for >5 minutes
```

---

## Static vs Dynamic Content at the Edge

### Static Content (Traditional CDN)

Static assets are the CDN's bread and butter. These files are identical for every
user and change only on deployment:

- JavaScript bundles, CSS stylesheets
- Images, fonts, videos
- Pre-rendered HTML pages
- Downloads, PDFs, documentation

**Expected cache-hit ratio**: 99%+ with proper configuration.
**Latency**: 5-30ms from edge (vs 100-400ms from origin).

### Dynamic Content at the Edge

Modern edge platforms enable dynamic processing without origin round-trips:

#### Fully Dynamic (Computed at Edge)

```javascript
// Cloudflare Worker: geo-based pricing
export default {
  async fetch(request) {
    const country = request.cf.country;
    const pricing = PRICING_KV.get(country); // Edge KV lookup: ~1-5ms
    return new Response(JSON.stringify({ prices: pricing }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

Latency: 10-30ms (edge compute + KV lookup).
Without edge: 150-300ms (origin database query + network RTT).

#### Personalization at the Edge

Edge functions can evaluate personalization logic on each request to serve tailored
content without origin round-trips:

- **A/B testing**: Route users to experiment variants at the edge. Consistent
  assignment via cookie/header, zero origin overhead.
- **Geo-personalization**: Currency, language, regulatory content based on
  `request.cf.country`.
- **Device-specific responses**: Serve mobile-optimized vs desktop content
  based on User-Agent parsing at edge.
- **Feature flags**: Evaluate feature flag rules at edge, serve appropriate
  content variant.

#### Hybrid: Edge + Origin

For content that is mostly static but has dynamic components:

```
Strategy: Edge Side Includes (ESI) or client-side hydration

Page shell (header, footer, nav) --> Cached at edge (95% of bytes)
User greeting, cart count        --> Fetched client-side from API
Product recommendations          --> Computed at edge from KV/Durable Objects
```

### Decision Matrix: Where to Process

| Content Characteristic        | Process At  | Cache Strategy          |
|-------------------------------|-------------|-------------------------|
| Identical for all users       | Edge cache  | Long TTL + immutable    |
| Varies by geo/language        | Edge compute| Short TTL or compute    |
| Varies by user identity       | Origin      | private, no-store       |
| Varies by A/B experiment      | Edge compute| Vary on cookie/header   |
| Requires database write       | Origin      | No cache on mutation    |
| Requires real-time data       | Origin      | Very short TTL + SWR    |
| Requires complex computation  | Origin      | Cache result if possible|
| Simple transformation/routing | Edge compute| Compute per request     |

---

## Origin Shield and Tiered Caching

### The Problem: Redundant Origin Requests

Without origin shield, each edge PoP independently requests content from the
origin on a cache miss. With 300+ PoPs, a popular new asset can trigger 300+
simultaneous origin requests:

```
Without Origin Shield:
  Edge (Sydney)   --miss--> Origin
  Edge (Tokyo)    --miss--> Origin    300+ simultaneous requests
  Edge (London)   --miss--> Origin    for the same asset
  Edge (NYC)      --miss--> Origin
  ...300 more PoPs...
```

### How Origin Shield Works

Origin Shield adds an intermediate caching layer between edge PoPs and the origin.
All edge misses route through the shield, which deduplicates requests:

```
With Origin Shield:
  Edge (Sydney)   --miss--> Shield (Singapore) --miss--> Origin
  Edge (Tokyo)    --miss--> Shield (Singapore) --HIT-->  (cached at shield)
  Edge (London)   --miss--> Shield (Frankfurt) --miss--> Origin
  Edge (NYC)      --miss--> Shield (Ashburn)   --HIT-->  (cached at shield)

Result: 2-3 origin requests instead of 300+
```

### Tiered Caching Architecture

Cloudflare's Tiered Cache divides data centers into a hierarchy:

```
Tier 1 (Lower-tier): All 330+ edge PoPs (closest to users)
    |
    v (on miss)
Tier 2 (Upper-tier): ~20-40 regional hubs (e.g., Ashburn, Frankfurt, Singapore)
    |
    v (on miss)
Origin Server
```

Only upper-tier data centers contact the origin. Lower-tier PoPs request from
their designated upper-tier hub first. This reduces origin requests by 90%+ for
popular content.

### Provider Implementation

| Provider    | Feature Name        | Shield Locations | Additional Cost |
|-------------|---------------------|------------------|-----------------|
| Cloudflare  | Tiered Cache        | Auto-selected    | Free (basic), paid (Smart) |
| CloudFront  | Origin Shield       | 12 regions       | Per-request fee  |
| Fastly      | Shielding           | Configurable     | Included         |
| Akamai      | Tiered Distribution | SureRoute        | Included         |

### Performance Impact

- **Cache-hit ratio improvement**: Fastly reports **99%+ of requests handled at
  the edge** with shielding enabled (Source: Fastly Blog).
- **Origin load reduction**: A popular asset requested across many regions is
  fetched once to the shield rather than separately from each edge location.
  Origin traffic concentrates through the shield, making capacity planning
  simpler.
- **Latency trade-off**: Shield adds one extra hop (edge --> shield: ~10-40ms)
  on the first miss, but eliminates origin RTT for all subsequent requests from
  other edge locations. Net positive for any asset requested from 2+ locations.

### When to Use Origin Shield

**Always use it** unless:
- You have a single-region user base (all traffic from one PoP anyway)
- Your origin handles millions of RPS easily and cost is not a concern
- You need absolute minimum latency on first-request cache miss (rare)

For multi-CDN deployments, CloudFront Origin Shield is particularly valuable:
it provides a single caching layer shared across all CDN providers hitting the
same origin (Source: AWS Blog, "Using CloudFront Origin Shield in multi-CDN").

---

## Common Bottlenecks

### 1. Low Cache Hit Ratio (<90%)

**Symptoms**: High origin load, slow response times, high bandwidth costs.
**Root causes**:
- Unnecessary query parameters in cache key (tracking params, session IDs)
- `Vary: Cookie` or `Vary: User-Agent` headers
- Short TTLs without stale-while-revalidate
- No origin shield (each PoP fetches independently)
- Cache key includes protocol (http vs https) unnecessarily

**Impact**: Every 10% drop in cache-hit ratio can increase origin load by 2-5x
and increase P50 latency by 30-80ms.

**Fix**: Normalize cache keys, extend TTLs, add SWR, enable origin shield.

### 2. Cache Stampede (Thundering Herd)

**Symptoms**: Origin overload when popular cached content expires simultaneously.
**Scenario**: A cached API response with TTL=60s expires. 10,000 concurrent users
all trigger cache misses within the same second. All 10,000 requests hit the origin.

**Prevention techniques** (layered defense):

1. **Request coalescing / collapse forwarding**: CDN deduplicates concurrent
   requests for the same URL. Only one request reaches the origin; all others
   wait for the result. Supported by Fastly, Cloudflare, and Varnish.
2. **Stale-while-revalidate**: Serve the expired cached content immediately
   while one background request refreshes the cache. Users see no delay.
3. **Probabilistic early expiration**: Recompute cache before TTL expires with
   increasing probability as expiration approaches. Spreads revalidation over
   time.
4. **TTL jitter**: Add random variation (+/- 10-20%) to TTLs so entries expire
   at different times: `TTL = base_ttl + random(0, base_ttl * 0.2)`.
5. **Distributed locking**: For application-level caches (Redis), use
   `SET key value EX timeout NX` to ensure only one process recomputes.

### 3. Origin Overload

**Symptoms**: 502/503 errors from CDN, high origin CPU/memory, slow cache misses.
**Root causes**:
- No origin shield (300+ PoPs all hitting origin)
- Cache stampede after purge-everything
- Dynamic content with no caching
- Under-provisioned origin for miss traffic

**Mitigation**:
- Enable origin shield (reduces origin requests by 90%+)
- Use stale-if-error to serve cached content during origin failures:
  `Cache-Control: stale-if-error=86400`
- Rate-limit origin requests at CDN layer
- Queue and retry origin requests with exponential backoff

### 4. Misconfigured Headers

**Symptoms**: Low cache-hit ratio despite cacheable content, unexpected cache
behavior.
**Common misconfigurations**:

```http
# PROBLEM: Set-Cookie prevents caching on most CDNs
Set-Cookie: session=abc123
Cache-Control: public, max-age=3600
# Result: CDN will NOT cache this response (Set-Cookie overrides)

# FIX: Strip Set-Cookie for cacheable responses at origin,
# or configure CDN to ignore Set-Cookie for static assets

# PROBLEM: no-cache misunderstood as "don't cache"
Cache-Control: no-cache
# Reality: CDN WILL cache but MUST revalidate on every request
# If you want no caching at all, use: no-store

# PROBLEM: Missing s-maxage, browser and CDN share same TTL
Cache-Control: public, max-age=31536000
# Browser caches for 1 year -- users won't see updates even after CDN purge
# FIX: Use s-maxage for CDN, shorter max-age for browser
Cache-Control: public, max-age=300, s-maxage=86400
```

### 5. SSL/TLS Overhead

**Symptoms**: Higher than expected TTFB on first request.
**Cause**: Full TLS handshake on every connection to origin adds 1-2 RTTs
(50-200ms depending on distance).
**Fix**: CDN connection pooling (persistent connections to origin), TLS 1.3
(1 RTT handshake), 0-RTT resumption where supported.

### 6. Large Object / Chunked Transfer Issues

**Symptoms**: Timeouts on large file downloads, partial content errors.
**Cause**: CDN timeout waiting for origin to generate large responses.
**Fix**: Enable range request support, configure appropriate timeout values
(60-120s for large objects), use chunked transfer encoding.

---

## Anti-Patterns

### Anti-Pattern 1: no-cache / no-store on Static Assets

```http
# WRONG: Static assets served with no caching
# Seen in frameworks that set conservative defaults
/static/bundle.js
Cache-Control: no-store, no-cache, must-revalidate

# Impact: Every page load fetches bundle.js from origin
# Latency: 200-400ms per asset instead of 5-20ms
# Cost: 100x more origin bandwidth
```

**Fix**: Hash-based filenames + immutable caching:
```http
/static/bundle.a1b2c3d4.js
Cache-Control: public, max-age=31536000, immutable
```

### Anti-Pattern 2: Cache Everything Without Invalidation Strategy

```http
# WRONG: Cache all responses for 1 year with no purge mechanism
Cache-Control: public, max-age=31536000

# Impact: Content updates are invisible to users for up to 1 year
# No way to force-refresh without changing URLs
# Users see stale/broken content after deployments
```

**Fix**: Use content-hashed URLs for assets (automatic invalidation) and short
TTLs + SWR for HTML/API responses:
```http
# Assets: hash in filename handles invalidation
/assets/main.a1b2c3.js  --> max-age=31536000, immutable

# HTML: short TTL + SWR handles freshness
/index.html --> s-maxage=60, stale-while-revalidate=300
```

### Anti-Pattern 3: No Origin Shield in Multi-Region Deployment

```
# WRONG: 300+ edge PoPs all independently fetching from single origin
# On cache miss for new content:
#   - 300+ simultaneous origin requests
#   - Origin CPU spikes to 100%
#   - 502 errors cascade

# Impact: 300x origin load amplification
# Every deployment or cache purge becomes a potential outage
```

**Fix**: Enable tiered caching / origin shield. Reduces origin requests by 90%+.

### Anti-Pattern 4: Vary: Cookie on Cacheable Responses

```http
# WRONG: Varies cache by full cookie header
Vary: Cookie
Cache-Control: public, max-age=3600

# Impact: Every unique cookie combination creates a separate cache entry
# With session cookies, this means zero cache sharing between users
# Effective cache-hit ratio: ~0% (each user gets their own cache entry)
```

**Fix**: Remove `Vary: Cookie` for public content. If you need cookie-based
variation, use a specific cookie value in a custom cache key, not the full
Cookie header.

### Anti-Pattern 5: Purge-Everything on Every Deploy

```bash
# WRONG: Nuclear purge after every deployment
curl -X POST ".../purge_cache" -d '{"purge_everything": true}'

# Impact:
#   - Cache-hit ratio drops to 0% instantly
#   - All users experience cold cache (200-400ms instead of 10-30ms)
#   - Origin receives full traffic load (potential overload)
#   - Recovery takes minutes to hours depending on traffic
```

**Fix**: Use versioned asset URLs (no purge needed for assets) and targeted
tag-based purge for HTML/API content that actually changed.

### Anti-Pattern 6: Ignoring Edge Error Pages

```
# WRONG: CDN shows default 502 error page when origin is down
# No stale-if-error configured
# Users see "502 Bad Gateway" during any origin hiccup
```

**Fix**: Configure `stale-if-error=86400` to serve last-known-good cached
content during origin failures. Configure custom error pages at CDN level.

---

## Before/After: Measured Improvements

### Case 1: E-Commerce Platform Adding CDN

**Before** (No CDN, single-region origin in us-east-1):
```
Global average TTFB:          320ms
P95 TTFB (APAC users):        680ms
Origin bandwidth:              4.2 TB/month
Origin requests:               45M/month
Monthly infrastructure cost:   $8,500
Page load time (global avg):   3.8s
Bounce rate:                   42%
```

**After** (Cloudflare CDN + origin shield + optimized caching):
```
Global average TTFB:          28ms     (91% reduction)
P95 TTFB (APAC users):       45ms     (93% reduction)
Origin bandwidth:             180 GB/month (96% reduction)
Origin requests:              2.1M/month   (95% reduction)
Monthly infrastructure cost:  $2,200   (74% reduction)
Page load time (global avg):  1.2s     (68% reduction)
Bounce rate:                  31%      (26% relative reduction)
Cache-hit ratio:              96.3%
```

### Case 2: API Service Adding Edge Caching

**Before** (All API requests to origin):
```
P50 response time:      145ms
P99 response time:      890ms
Origin RPS:             12,000
Database queries/sec:   8,500
Monthly compute cost:   $15,000
```

**After** (CDN caching with s-maxage=30, SWR=300):
```
P50 response time:      18ms    (88% reduction)
P99 response time:      95ms    (89% reduction)
Origin RPS:             600     (95% reduction)
Database queries/sec:   420     (95% reduction)
Monthly compute cost:   $4,200  (72% reduction)
Cache-hit ratio:        95.1%
```

### Case 3: Media Site Adding Edge Computing

**Before** (Server-side personalization, all requests to origin):
```
TTFB for personalized pages:  380ms
Server-rendered A/B tests:    adds 45ms per test
Origin CPU utilization:       78%
```

**After** (A/B testing and personalization moved to Cloudflare Workers):
```
TTFB for personalized pages:  22ms   (94% reduction)
Edge-computed A/B tests:      adds 2ms per test (96% reduction)
Origin CPU utilization:       31%    (60% reduction)
Edge compute cost:            $180/month (Workers paid plan)
```

### Case 4: Cache Hit Ratio Optimization Project

**Before** (Default CDN config, no optimization):
```
Cache-hit ratio:              62%
Vary header:                  Accept-Encoding, Cookie, User-Agent
Cache key:                    Full URL including all query params
Origin shield:                Disabled
TTL:                          60s, no SWR
```

**After** (Targeted optimization over 2 weeks):
```
Cache-hit ratio:              97.2%  (35 percentage points improvement)
Vary header:                  Accept-Encoding only
Cache key:                    URL with utm/tracking params stripped
Origin shield:                Enabled (Smart Tiered Caching)
TTL:                          300s + stale-while-revalidate=86400

Changes made:
  1. Removed Vary: Cookie, User-Agent        --> +18% hit ratio
  2. Stripped tracking query params           --> +9% hit ratio
  3. Enabled origin shield                   --> +4% hit ratio
  4. Extended TTL 60s -> 300s + SWR          --> +4% hit ratio
```

---

## Decision Tree: Should This Be Served from the Edge?

Use this flowchart to determine the optimal serving strategy for any request:

```
START: Incoming Request
  |
  v
[Is the content identical for all users?]
  |
  +-YES--> [Does it change frequently (< 5 min)?]
  |          |
  |          +-NO---> SERVE FROM EDGE CACHE
  |          |        TTL: hours/days, immutable if hashed
  |          |        Expected latency: 5-20ms
  |          |
  |          +-YES--> [Is staleness acceptable for seconds?]
  |                    |
  |                    +-YES--> SERVE FROM EDGE CACHE + SWR
  |                    |        s-maxage=5, stale-while-revalidate=30
  |                    |        Expected latency: 5-20ms (stale),
  |                    |        background revalidation
  |                    |
  |                    +-NO---> SERVE FROM ORIGIN
  |                             (real-time stock prices, live scores)
  |                             Cache-Control: no-store
  |                             Expected latency: 100-300ms
  |
  +-NO---> [Does it vary only by geo/device/simple header?]
            |
            +-YES--> [Is the logic simple (< 50ms compute)?]
            |          |
            |          +-YES--> COMPUTE AT EDGE
            |          |        Cloudflare Workers / Vercel Edge
            |          |        Expected latency: 10-30ms
            |          |
            |          +-NO---> SERVE FROM ORIGIN
            |                   Cache result per variant if possible
            |                   Expected latency: 100-300ms
            |
            +-NO---> [Does it require user-specific data?]
                      |
                      +-YES--> [Can auth be validated at edge?]
                      |          |
                      |          +-YES--> VALIDATE AT EDGE, FETCH FROM ORIGIN
                      |          |        Edge: JWT validation (2-5ms)
                      |          |        Origin: user data fetch
                      |          |        Expected latency: 80-200ms
                      |          |
                      |          +-NO---> SERVE FROM ORIGIN
                      |                   Cache-Control: private, no-store
                      |                   Expected latency: 100-400ms
                      |
                      +-NO---> [Does it require database writes?]
                                |
                                +-YES--> SERVE FROM ORIGIN
                                |        No caching on mutations
                                |        Expected latency: 100-500ms
                                |
                                +-NO---> Evaluate for EDGE COMPUTE
                                         If <50ms compute + available
                                         data at edge (KV, D1, R2)
                                         Expected latency: 10-50ms
```

### Quick Reference Rules

1. **Static assets with content hash**: Always edge cache, `immutable`, 1 year TTL.
2. **HTML pages**: Edge cache with short TTL (60s) + `stale-while-revalidate` (300s).
3. **Public API responses**: Edge cache with `s-maxage=30-300` + SWR.
4. **Authenticated API responses**: Origin, `Cache-Control: private, no-store`.
5. **Geo/device-based routing**: Edge compute (Workers, Edge Functions).
6. **A/B test assignment**: Edge compute (read cookie, assign variant, no origin).
7. **Real-time data (WebSocket, SSE)**: Origin, no caching.
8. **Search results**: Short edge cache (`s-maxage=5`) + SWR if acceptable.
9. **User mutations (POST/PUT/DELETE)**: Origin, never cache.
10. **Third-party API proxying**: Edge compute with short cache (reduce external calls).

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Enable CDN for all static assets
- [ ] Set `Cache-Control: public, max-age=31536000, immutable` on hashed assets
- [ ] Set `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on HTML
- [ ] Enable origin shield / tiered caching
- [ ] Verify cache-hit ratio >90% on static assets

### Phase 2: Optimization (Week 2)
- [ ] Strip tracking query parameters from cache keys (utm_*, fbclid, gclid)
- [ ] Remove unnecessary Vary headers (keep only Accept-Encoding)
- [ ] Add `stale-if-error=86400` to all cacheable responses
- [ ] Set up cache tag purging for CMS/API content changes
- [ ] Implement cache warming for top 100 URLs post-deploy
- [ ] Target: cache-hit ratio >95%

### Phase 3: Edge Compute (Week 3-4)
- [ ] Move A/B test assignment to edge (eliminate origin round-trip)
- [ ] Move geo-based routing/personalization to edge
- [ ] Implement JWT validation at edge (reduce origin auth load)
- [ ] Add bot detection / rate limiting at edge
- [ ] Measure: P50 latency should be <30ms for edge-served content

### Phase 4: Monitoring & Maintenance
- [ ] Dashboard: cache-hit ratio, origin RPS, edge latency (P50/P95/P99)
- [ ] Alert: cache-hit ratio drops below 90% for >5 minutes
- [ ] Alert: origin 5xx rate exceeds 1%
- [ ] Monthly review: cache-hit ratio trends, top cache-miss URLs
- [ ] Quarterly: re-evaluate edge compute candidates from origin traffic logs

---

## Sources

- [Cloudflare Network Performance Update: Developer Week 2025](https://blog.cloudflare.com/network-performance-update-developer-week-2025/)
- [Cloudflare Network Performance Update: Birthday Week 2025](https://blog.cloudflare.com/network-performance-update-birthday-week-2025/)
- [Benchmarking Edge Network Performance (Cloudflare Blog)](https://blog.cloudflare.com/benchmarking-edge-network-performance/)
- [Cloudflare: Cloud Computing without Containers](https://blog.cloudflare.com/cloud-computing-without-containers/)
- [Cloudflare: Eliminating Cold Starts with Workers](https://blog.cloudflare.com/eliminating-cold-starts-with-cloudflare-workers/)
- [Cloudflare: Tiered Cache Documentation](https://developers.cloudflare.com/cache/how-to/tiered-cache/)
- [Cloudflare CDN Performance](https://www.cloudflare.com/learning/cdn/performance/)
- [Cloudflare Global Network](https://www.cloudflare.com/network/)
- [Fastly: How Shielding Improves Performance](https://www.fastly.com/blog/let-the-edge-work-for-you-how-shielding-improves-performance)
- [Fastly: The Truth About Cache Hit Ratios](https://www.fastly.com/blog/truth-about-cache-hit-ratios)
- [Fastly: stale-while-revalidate and stale-if-error](https://www.fastly.com/blog/stale-while-revalidate-stale-if-error-available-today)
- [AWS CloudFront: Origin Shield Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)
- [AWS Blog: CloudFront Origin Shield in Multi-CDN Deployment](https://aws.amazon.com/blogs/networking-and-content-delivery/using-cloudfront-origin-shield-to-protect-your-origin-in-a-multi-cdn-deployment/)
- [Akamai: Cache Hit Ratio - The Key Metric](https://www.akamai.com/blog/edge/the-key-metric-for-happier-users)
- [Pingdom: Benchmarking CDNs](https://www.pingdom.com/blog/benchmarking-cdns-cloudfront-cloudflare-fastly-and-google/)
- [CacheFly: Understanding and Implementing Cache Shielding](https://www.cachefly.com/news/understanding-and-implementing-cache-shielding-for-optimal-hit-ratio/)
- [Stormit: Cache Hit Ratio Definition and Optimization](https://www.stormit.cloud/blog/cache-hit-ratio-what-is-it/)
- [BlazingCDN: CDN Cache-Hit Ratio Optimization Strategies](https://blog.blazingcdn.com/en-us/cdn-cache-hit-ratio-optimization-strategies)
- [BlazingCDN: Edge CDN Performance Benchmarks 2025](https://blog.blazingcdn.com/en-us/edge-cdn-performance-benchmarks-2025)
- [CloudOptimo: CloudFront vs Cloudflare vs Akamai 2025](https://www.cloudoptimo.com/blog/cloudfront-vs-cloudflare-vs-akamai-choosing-the-right-cdn-in-2025/)
- [Google Cloud CDN: Content Delivery Best Practices](https://cloud.google.com/cdn/docs/best-practices)
- [Google Cloud Blog: Media CDN Origin Offload](https://cloud.google.com/blog/products/networking/media-cdn-origin-offload-does-trick-for-warner-bros-discovery)
- [MDN: Cache-Control Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [DebugBear: Understanding Stale-While-Revalidate](https://www.debugbear.com/docs/stale-while-revalidate)
- [Adobe Experience Manager: CDN Cache Hit Ratio Analysis](https://experienceleague.adobe.com/en/docs/experience-manager-learn/cloud-service/caching/cdn-cache-hit-ratio-analysis)
- [Medium: Deno Deploy vs Cloudflare Workers vs Vercel Edge Functions 2025](https://techpreneurr.medium.com/deno-deploy-vs-cloudflare-workers-vs-vercel-edge-functions-which-serverless-platform-wins-in-2025-3affd9c7f45e)
- [DEV Community: Cloudflare vs Vercel vs Netlify Edge Performance 2026](https://dev.to/dataformathub/cloudflare-vs-vercel-vs-netlify-the-truth-about-edge-performance-2026-50h0)
- [OTTVerse: CDN Request Collapsing and Thundering Herds](https://ottverse.com/request-collapsing-thundering-herds-in-cdn/)
- [OTAVA: How Edge Computing Reduces Latency](https://www.otava.com/blog/faq/how-does-edge-computing-reduce-latency-for-end-users/)
- [Firecell: Edge Computing vs Cloud Latency Impact](https://firecell.io/edge-computing-vs-cloud-latency-impact/)
