# Network Optimization

> Expertise module for web network performance engineering.
> Every claim includes concrete numbers. Sources are cited inline.

---

## Table of Contents

1. [HTTP/2 vs HTTP/3 (QUIC)](#http2-vs-http3-quic)
2. [Resource Hints](#resource-hints)
3. [Fetch Priority API](#fetch-priority-api)
4. [Service Workers for Caching and Offline](#service-workers-for-caching-and-offline)
5. [Compression: Brotli vs Gzip](#compression-brotli-vs-gzip)
6. [Critical Request Chain Optimization](#critical-request-chain-optimization)
7. [Connection Management and Keep-Alive](#connection-management-and-keep-alive)
8. [Early Hints (103 Status Code)](#early-hints-103-status-code)
9. [Common Bottlenecks](#common-bottlenecks)
10. [Anti-Patterns](#anti-patterns)
11. [Before/After Waterfall Diagrams](#beforeafter-waterfall-diagrams)
12. [Decision Tree: Resource Prioritization](#decision-tree-resource-prioritization)
13. [Sources](#sources)

---

## HTTP/2 vs HTTP/3 (QUIC)

### Protocol Evolution

HTTP/2 introduced multiplexing over a single TCP connection, eliminating the need for
domain sharding and connection pooling hacks of the HTTP/1.1 era. HTTP/3 goes further
by replacing TCP entirely with QUIC, a UDP-based transport that solves head-of-line
blocking at the transport layer.

### Performance Benchmarks

| Metric                     | HTTP/2       | HTTP/3 (QUIC) | Improvement        |
|----------------------------|--------------|----------------|--------------------|
| Time to First Byte (avg)   | 201 ms       | 176 ms         | 12.4% faster       |
| Page load (synthetic)      | 1.5 s        | 0.8 s          | 47% faster         |
| Prioritization gains       | Baseline     | Up to 50%      | Critical resources |
| Connection migration       | Not supported| Supported      | Mobile benefit     |
| Head-of-line blocking      | Present (TCP)| Eliminated     | Lossy networks     |

Source: Akamai 2025 report; Cloudflare HTTP/3 benchmarks
(https://blog.cloudflare.com/http-3-vs-http-2/)

### When HTTP/3 Wins Big

1. **Mobile on unstable networks**: QUIC handles packet loss without stalling all
   streams. On a 2% packet loss connection, HTTP/3 maintains throughput while HTTP/2
   over TCP can see 30-50% degradation.
2. **Network transitions**: QUIC supports connection migration via connection IDs.
   When a phone switches from Wi-Fi to cellular, the connection continues seamlessly
   instead of requiring a full TCP + TLS handshake (1-3 RTTs saved).
3. **High-latency connections**: QUIC's 0-RTT resumption eliminates a full round trip
   on repeat visits. HTTP/2 over TLS 1.3 achieves 1-RTT; QUIC achieves 0-RTT for
   returning connections.

### When HTTP/2 Is Comparable

On stable, low-latency data center connections, HTTP/3 offers marginal gains over
well-tuned HTTP/2. TCP has decades of kernel-level optimization, and modern Linux
kernels handle it extremely efficiently. The difference can be under 5 ms in
controlled environments.

### Adoption Status (2025)

- Global HTTP/3 adoption: **35%** of web traffic (Cloudflare, October 2025)
- Browser support: Chrome, Firefox, Safari, Edge all support HTTP/3 by default
- CDN support: Cloudflare, Akamai, Fastly, AWS CloudFront all offer HTTP/3
- Server support: NGINX (via quiche), Caddy, LiteSpeed natively; Apache via mod_h3

### Implementation Checklist

```
[x] Enable HTTP/3 on your CDN or load balancer
[x] Add Alt-Svc header to advertise HTTP/3 support
[x] Verify QUIC is not blocked by firewalls (UDP port 443)
[x] Test with Chrome DevTools Protocol tab (hover over protocol column)
[x] Monitor with RUM to compare HTTP/2 vs HTTP/3 user cohorts
[x] Keep HTTP/2 as fallback -- never disable it
```

---

## Resource Hints

Resource hints allow developers to assist the browser in deciding which resources to
fetch, connect to, or prepare ahead of time. Used correctly, they shave 100-500 ms
off critical resource loading. Used incorrectly, they waste bandwidth and compete
with genuinely critical resources.

### dns-prefetch

```html
<link rel="dns-prefetch" href="https://cdn.example.com">
```

- **What it does**: Resolves the DNS for a domain in the background.
- **Cost**: Minimal -- a single DNS lookup is typically 20-120 ms.
- **When to use**: Third-party domains you will need but are not immediately critical.
- **Browser support**: Universal, including IE11.
- **Overhead**: Negligible. Safe to apply to 4-6 third-party domains.

### preconnect

```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
```

- **What it does**: DNS + TCP + TLS handshake (full connection setup).
- **Cost**: More expensive than dns-prefetch. Each preconnect holds a socket open.
- **Time saved**: 100-300 ms per connection (DNS + TCP + TLS combined).
- **When to use**: Origins serving critical above-the-fold resources (font CDN,
  primary API, image CDN).
- **Limit**: **2-4 origins maximum**. Preconnecting to many domains is
  counterproductive -- it steals bandwidth and CPU from actual resource downloads.

**Pattern: Combine dns-prefetch with preconnect for resilience**

```html
<!-- Browsers that support preconnect use it; others fall back to dns-prefetch -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="dns-prefetch" href="https://cdn.example.com">
```

### preload

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.webp" as="image">
```

- **What it does**: Mandatory fetch -- the browser MUST download this resource
  immediately, regardless of whether it has been discovered in the HTML yet.
- **Key requirement**: The `as` attribute is **mandatory**. Without it, the browser
  fetches the resource twice (once without proper priority, once when actually needed).
- **When to use**:
  - Fonts referenced in CSS (browser cannot discover them until CSS is parsed)
  - LCP images loaded via CSS background-image
  - Critical scripts loaded by other scripts (import chains)
- **Impact**: Preloading an LCP image can improve LCP by 200-600 ms by eliminating
  the discovery delay.
- **Danger**: Preloading too many resources degrades performance. Chrome issues a
  console warning if a preloaded resource is unused within 3 seconds.

### prefetch

```html
<link rel="prefetch" href="/next-page-bundle.js" as="script">
```

- **What it does**: Low-priority fetch for a resource needed on a **future** page.
- **When to use**: Resources for the next likely navigation (e.g., the second step of
  a checkout flow). The browser downloads these at idle priority.
- **Impact**: Can reduce next-page load time by 200-1000 ms depending on resource size.
- **Caveat**: Purely speculative. If the user does not navigate to the expected page,
  the bandwidth is wasted. Use analytics to confirm navigation patterns before
  prefetching.

### modulepreload

```html
<link rel="modulepreload" href="/components/hero.js">
```

- **What it does**: Fetches, parses, and compiles a JavaScript module, placing it in
  the module map ready for execution. Unlike standard preload, which just caches the
  raw bytes, modulepreload does the parse + compile work upfront.
- **When to use**: Critical ES module imports that are deep in the import chain.
  Without modulepreload, the browser discovers module B only after parsing module A.
- **Browser support**: Chrome, Edge, Firefox (since v115, Sept 2023), Safari.
- **Limit**: Do not modulepreload more than 5-8 modules. Excessive modulepreload
  links in the `<head>` delay First Contentful Paint by competing for main-thread
  parse time (reported in Angular CLI issue #27490, 2024).

### Resource Hints Summary Table

| Hint          | Action                  | Priority   | Use Case                        | Limit     |
|---------------|-------------------------|------------|----------------------------------|-----------|
| dns-prefetch  | DNS lookup              | Background | Third-party domains              | 4-6       |
| preconnect    | DNS + TCP + TLS         | High       | Critical third-party origins     | 2-4       |
| preload       | Full fetch (mandatory)  | High       | Late-discovered critical assets  | 2-5       |
| prefetch      | Full fetch (idle)       | Low        | Next-page resources              | 2-4       |
| modulepreload | Fetch + parse + compile | High       | Deep ES module dependencies      | 5-8       |

---

## Fetch Priority API

The Fetch Priority API (`fetchpriority` attribute) gives developers explicit control
over how the browser prioritizes individual resource fetches within the same resource
type.

### Syntax

```html
<!-- Boost LCP image priority -->
<img src="/hero.webp" fetchpriority="high" alt="Hero image">

<!-- Deprioritize below-the-fold images -->
<img src="/footer-logo.png" fetchpriority="low" alt="Footer logo" loading="lazy">

<!-- Boost critical script -->
<script src="/critical-analytics.js" fetchpriority="high"></script>

<!-- Deprioritize non-critical script -->
<script src="/chat-widget.js" fetchpriority="low"></script>

<!-- Also works with fetch() -->
<script>
  fetch('/api/critical-data', { priority: 'high' });
  fetch('/api/recommendations', { priority: 'low' });
</script>
```

### Measured Impact

| Scenario                              | Before     | After      | Improvement |
|---------------------------------------|------------|------------|-------------|
| Google Flights LCP image              | 2.6 s      | 1.9 s      | 27% faster  |
| Generic hero image (3G simulation)    | 4.1 s      | 3.2 s      | 22% faster  |
| Below-fold image deprioritization     | LCP 3.0 s  | LCP 2.4 s  | 20% faster  |

Source: web.dev Fetch Priority case study
(https://web.dev/articles/fetch-priority)

### Browser Support (2025)

- Chrome: Yes (since v101, April 2022)
- Safari: Yes (since v17.2, December 2023)
- Firefox: Yes (since v132, October 2024)
- Edge: Yes (follows Chromium)

### Best Practices

1. **Use `fetchpriority="high"` on exactly 1-2 resources per page** -- the LCP image
   and potentially one critical above-the-fold script.
2. **Use `fetchpriority="low"` liberally** on below-the-fold images, non-critical
   scripts, and speculative fetches.
3. **Combine with `loading="lazy"`** for images: `fetchpriority="low"` signals intent
   during the fetch; `loading="lazy"` defers the fetch entirely until near-viewport.
4. **Do not set everything to high** -- if everything is high priority, nothing is.
   Overuse causes bandwidth contention between resources that should be sequential.

### Anti-Pattern: Priority Inversion

```html
<!-- BAD: Three high-priority images compete for bandwidth -->
<img src="/hero.webp" fetchpriority="high">
<img src="/promo-1.webp" fetchpriority="high">
<img src="/promo-2.webp" fetchpriority="high">

<!-- GOOD: Only the LCP image is boosted -->
<img src="/hero.webp" fetchpriority="high">
<img src="/promo-1.webp">
<img src="/promo-2.webp" fetchpriority="low">
```

---

## Service Workers for Caching and Offline

Service workers act as a programmable network proxy between the browser and the
server. They enable aggressive caching strategies that dramatically improve repeat
visit performance and unlock offline functionality.

### Five Caching Strategies

#### 1. Cache First (Cache Falling Back to Network)

```
Request --> Cache hit? --> YES --> Return cached response
                     \--> NO  --> Fetch from network --> Cache response --> Return
```

- **Best for**: Static assets (CSS, JS bundles, fonts, images) that change
  infrequently.
- **Performance**: Near-instant responses (~1-5 ms) for cached assets.
- **Risk**: Stale content if cache is not versioned properly.

#### 2. Network First (Network Falling Back to Cache)

```
Request --> Fetch from network --> Success? --> YES --> Cache + Return
                                          \--> NO  --> Return cached response
```

- **Best for**: Dynamic content (API responses, user-specific data, news feeds).
- **Performance**: Always fresh when online; graceful offline fallback.
- **Risk**: Full network latency on every request when online.

#### 3. Stale While Revalidate

```
Request --> Return cached response immediately
       \-> Fetch from network in background --> Update cache for next request
```

- **Best for**: Content that should be fresh but where stale is acceptable briefly
  (product listings, dashboards, configuration).
- **Performance**: Cache-speed responses (~1-5 ms) with eventual freshness.
- **Tradeoff**: Users see stale data until the next navigation.

#### 4. Cache Only

```
Request --> Cache hit? --> YES --> Return
                      \--> NO --> Fail
```

- **Best for**: App shell resources that were precached during service worker install.
- **Performance**: Fastest possible -- no network involvement.

#### 5. Network Only

```
Request --> Fetch from network --> Return (no caching)
```

- **Best for**: Non-cacheable requests (POST, real-time data, authentication).
- **Performance**: Standard network latency.

### Performance Impact Numbers

| Metric                        | Without SW    | With SW (Cache First) | Improvement    |
|-------------------------------|---------------|-----------------------|----------------|
| Repeat visit page load        | 2.8 s         | 0.9 s                 | 68% faster     |
| Static asset response time    | 150-400 ms    | 1-5 ms                | 97% faster     |
| Offline availability          | 0%            | 100% (cached pages)   | Full offline   |
| Bandwidth on repeat visit     | Full download | 0 bytes (cached)      | 100% saved     |

### Recommended Strategy by Resource Type

| Resource Type      | Strategy               | Cache Duration     |
|--------------------|------------------------|--------------------|
| App shell HTML     | Cache First            | Until SW update    |
| CSS / JS bundles   | Cache First            | Until hash changes |
| Fonts              | Cache First            | 1 year             |
| API responses      | Network First          | 5-30 minutes       |
| Product images     | Stale While Revalidate | 24 hours           |
| User avatar        | Stale While Revalidate | 1 hour             |
| Auth endpoints     | Network Only           | Never cache        |
| Analytics pings    | Network Only           | Never cache        |

### Cache Versioning

```javascript
const CACHE_VERSION = 'v2';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});
```

### Key Metric: Cache Hit Ratio

Track your service worker cache hit ratio. A well-configured service worker on a
content-heavy site should achieve **85-95% cache hit ratio** for static assets on
repeat visits. Below 70% indicates misconfigured cache rules or overly aggressive
expiration.

---

## Compression: Brotli vs Gzip

### Compression Ratio Comparison

Brotli consistently outperforms gzip on text-based web assets. At its highest
compression level (11), Brotli produces files **15-25% smaller** than gzip at its
highest level (9).

| Content Type | Gzip (level 6) | Brotli (level 11) | Brotli Savings |
|--------------|-----------------|--------------------|--------------------|
| HTML         | 78% reduction   | 85% reduction      | ~21% smaller       |
| CSS          | 80% reduction   | 87% reduction      | ~19% smaller       |
| JavaScript   | 77% reduction   | 84% reduction      | ~18% smaller       |
| JSON API     | 79% reduction   | 85% reduction      | ~17% smaller       |
| SVG          | 75% reduction   | 82% reduction      | ~16% smaller       |

Source: Akamai benchmark, median savings of 82% (Brotli) vs 78% (gzip) across a
large sample. Paul Calvano analysis, March 2024
(https://paulcalvano.com/2024-03-19-choosing-between-gzip-brotli-and-zstandard-compression/)

### Speed vs Size Tradeoff

| Operation     | Gzip (level 6)  | Brotli (level 4) | Brotli (level 11) |
|---------------|-----------------|-------------------|--------------------|
| Compress      | 45 MB/s         | 40 MB/s           | 2-5 MB/s           |
| Decompress    | 300 MB/s        | 290 MB/s          | 290 MB/s           |
| Ratio         | Good            | Good (+5%)        | Best (+15-25%)     |

Key insight: **Brotli decompression is nearly identical in speed to gzip** regardless
of compression level. The cost is only at compression time. This means:

- **Static assets**: Pre-compress at Brotli level 11 during build. The one-time
  compression cost is amortized over millions of requests.
- **Dynamic responses**: Use Brotli level 4-5 for on-the-fly compression. At level 4,
  Brotli matches gzip's compression speed while still producing ~5% smaller output.

### Adoption (2024-2025)

Per HTTP Archive data (January 2024), Brotli is now used more than gzip for
JavaScript and CSS resources globally. Browser support is universal across modern
browsers (Chrome, Firefox, Safari, Edge).

### Implementation

```nginx
# NGINX configuration
brotli on;
brotli_comp_level 6;        # Real-time compression level (balance speed/ratio)
brotli_types text/plain text/css application/javascript application/json
             image/svg+xml application/xml;

# Serve pre-compressed .br files for static assets
brotli_static on;

# Keep gzip as fallback
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/javascript application/json
           image/svg+xml application/xml;
```

### Build-Time Pre-Compression

```bash
# Pre-compress all static assets at maximum Brotli level
find dist/ -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.svg" \) \
  -exec brotli --best {} \;

# Result: dist/main.js (245 KB) --> dist/main.js.br (48 KB)
# Compare: dist/main.js.gz (58 KB) -- Brotli is 17% smaller
```

### Zstandard: The Emerging Alternative

Zstandard (zstd) is gaining traction as a compression algorithm that offers gzip-like
speed with Brotli-like ratios. Chrome added zstd support in 2024. However, adoption
is still early -- use Brotli as the primary algorithm and monitor zstd browser support
for future consideration.

---

## Critical Request Chain Optimization

A critical request chain is a series of dependent network requests that must complete
sequentially before the page can render. Each link in the chain adds latency equal to
at least one network round trip.

### Anatomy of a Critical Chain

```
HTML document (1 RTT)
  --> blocking CSS (1 RTT)
    --> @import in CSS (1 RTT)
      --> font referenced in CSS (1 RTT)
        --> background image in CSS (1 RTT)
```

**Total: 5 sequential round trips before LCP**. At 100 ms RTT, that is a minimum of
500 ms of pure network wait time, not counting download time.

### Chain-Breaking Strategies

#### 1. Inline Critical CSS (eliminates 1-2 RTTs)

```html
<head>
  <style>
    /* Critical above-the-fold CSS inlined -- ~14 KB max (fits in first TCP window) */
    .hero { ... }
    .nav { ... }
  </style>
  <link rel="preload" href="/full.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
</head>
```

Impact: Eliminates the blocking CSS fetch. FCP improves by 100-300 ms.

#### 2. Eliminate @import Chains

```css
/* BAD: Creates a chain -- main.css uses @import for reset.css and typography.css */
```
```html
<!-- GOOD: Flatten into parallel HTML link tags -->
<link rel="stylesheet" href="/reset.css">
<link rel="stylesheet" href="/typography.css">
<link rel="stylesheet" href="/main.css">
```

All three CSS files now download in parallel instead of sequentially.

#### 3. Preload Late-Discovered Resources

```html
<!-- Font is only discovered after CSS is parsed -- add preload to start early -->
<link rel="preload" href="/fonts/inter-v13.woff2" as="font"
      type="font/woff2" crossorigin>
```

Impact: Removes 1 RTT from the chain. Font loads in parallel with CSS instead of
after it. Typical improvement: 150-400 ms.

#### 4. Defer Non-Critical JavaScript

```html
<!-- BAD: Blocks rendering -->
<script src="/analytics.js"></script>

<!-- GOOD: Downloads in parallel, executes after parsing -->
<script src="/analytics.js" defer></script>

<!-- ALSO GOOD: Downloads in parallel, executes as soon as ready -->
<script src="/analytics.js" async></script>
```

| Attribute | Download        | Execution             | Use Case                    |
|-----------|----------------|-----------------------|-----------------------------|
| (none)    | Blocking       | Immediately           | Must avoid                  |
| async     | Non-blocking   | ASAP (order varies)   | Independent scripts         |
| defer     | Non-blocking   | After HTML parsed     | Scripts needing DOM         |
| type=module| Non-blocking  | Deferred by default   | ES modules                  |

#### 5. Reduce Third-Party Chain Depth

Third-party tag managers are notorious chain creators. A tag manager script loads,
evaluates its container, then injects additional analytics, pixel, and tracking
scripts -- each adding another round trip to the chain.

**Mitigation**: Load tag managers with `async`, set `fetchpriority="low"`, and
audit tags quarterly. The median website loads **20 external scripts totaling 449 KB**
(HTTP Archive 2024 Web Almanac).

### Measuring Chain Depth

Use Lighthouse's "Avoid chaining critical requests" audit or Chrome DevTools
Performance panel. Target: **maximum chain depth of 2** for above-the-fold rendering.

---

## Connection Management and Keep-Alive

### The Cost of New Connections

Each new TCP connection requires:

| Step          | Time (100ms RTT) | Time (200ms RTT) |
|---------------|-------------------|-------------------|
| DNS lookup    | 20-120 ms         | 20-120 ms         |
| TCP handshake | 100 ms (1 RTT)   | 200 ms (1 RTT)   |
| TLS handshake | 200 ms (2 RTTs)  | 400 ms (2 RTTs)  |
| **Total**     | **320-420 ms**    | **620-720 ms**    |

### Keep-Alive Benefits

HTTP/1.1 keep-alive (persistent connections) reuses TCP connections across multiple
requests. Benchmarks show that reusing connections reduces total request time by a
factor of **3x** compared to opening new connections for each request, and up to **5x**
in multi-cloud environments.

```nginx
# NGINX keep-alive configuration
keepalive_timeout 65;        # Keep connection open for 65 seconds
keepalive_requests 1000;     # Allow 1000 requests per connection

# Upstream keep-alive (to backend servers)
upstream backend {
    server 10.0.0.1:8080;
    keepalive 32;            # Pool of 32 persistent connections
}
```

### HTTP/2 Connection Coalescing

HTTP/2 multiplexes all requests to the same origin over a **single connection**. This
eliminates the need for:

- Domain sharding (anti-pattern in HTTP/2)
- Sprite sheets (individual files are fine now)
- CSS/JS concatenation (bundling is still useful for other reasons)

**Important**: HTTP/2 allows up to **100 concurrent streams** per connection by default.
Most browsers use a single connection per origin.

### Connection Pool Sizing (Backend)

For server-to-server connections (API calls, database, microservices):

| Environment   | Recommended Pool Size | Rationale                          |
|---------------|----------------------|-------------------------------------|
| Development   | 10-20                | Low concurrency                     |
| Staging       | 50-100               | Moderate load testing               |
| Production    | 100-200              | High concurrency, avoid exhaustion  |

Source: Microsoft Developer Blog on HTTP connection pooling
(https://devblogs.microsoft.com/premier-developer/the-art-of-http-connection-pooling-how-to-optimize-your-connections-for-peak-performance/)

### Connection Limits Per Domain

Browsers enforce per-domain connection limits:

| Protocol | Max Connections/Domain | Implication                           |
|----------|------------------------|---------------------------------------|
| HTTP/1.1 | 6                      | Limits parallel downloads             |
| HTTP/2   | 1 (multiplexed)       | All requests share one connection     |
| HTTP/3   | 1 (multiplexed)       | Same as HTTP/2, but over QUIC         |

---

## Early Hints (103 Status Code)

### How It Works

The server sends a `103 Early Hints` response *before* the final `200 OK` response.
This uses the "server think-time" (while the server processes the request, queries
databases, renders templates) to tell the browser to start fetching critical
sub-resources.

```
Client                          Server
  |---- GET /page.html ----------->|
  |                                | (server starts processing)
  |<--- 103 Early Hints -----------|  Link: </style.css>; rel=preload; as=style
  |                                |  Link: </hero.webp>; rel=preload; as=image
  |  (browser starts fetching      |
  |   style.css and hero.webp)     |
  |                                | (server finishes processing)
  |<--- 200 OK --------------------|  (full HTML response)
  |                                |
  |  (CSS and image already        |
  |   downloading or cached!)      |
```

### Performance Impact

| Scenario                              | Without 103 | With 103    | Improvement    |
|---------------------------------------|-------------|-------------|----------------|
| LCP (P75, desktop, Akamai customers)  | Baseline    | -300 ms     | 30% faster     |
| LCP (synthetic, image-heavy page)     | Baseline    | -20-30%     | Significant    |
| LCP image appearance                  | Baseline    | 45% faster  | Image-heavy    |

Source: Akamai Early Hints prototype results
(https://www.akamai.com/blog/performance/akamai-103-early-hints-prototype-the-results-are-in);
Shopify Early Hints analysis
(https://performance.shopify.com/blogs/blog/early-hints-at-shopify)

### Important Caveats (2025)

Shopify's 2025 analysis revealed nuanced results:

- **Desktop**: Modest but consistent LCP improvements, especially with 1-3 preloaded
  resources.
- **Mobile**: Early Hints can **slow down performance** on mobile devices. The
  additional hints compete for limited mobile bandwidth and CPU.
- **Recommendation**: Preload only 1-3 truly critical resources. Validate impact
  with real user monitoring (RUM) on both desktop and mobile cohorts.

### Browser and Server Support

| Component     | Support Status                                    |
|---------------|---------------------------------------------------|
| Chrome        | Yes (since v103, June 2022)                       |
| Firefox       | Yes (since v102, June 2022)                       |
| Safari        | No (as of early 2026)                             |
| Edge          | Yes (Chromium-based)                              |
| NGINX         | Yes (since v1.27.3, 2024)                         |
| Cloudflare    | Yes (automatic with Smart Early Hints)            |
| Akamai        | Yes (Early Hints feature)                         |
| Apache        | Limited (via mod_http2)                           |

### Implementation

```nginx
# NGINX 103 Early Hints
location /page {
    http2_push_preload on;
    add_header Link "</style.css>; rel=preload; as=style" early;
    add_header Link "</hero.webp>; rel=preload; as=image" early;
    proxy_pass http://backend;
}
```

```javascript
// Node.js / Express
app.get('/page', (req, res) => {
  // Send 103 Early Hints before processing
  res.writeEarlyHints({
    link: [
      '</style.css>; rel=preload; as=style',
      '</hero.webp>; rel=preload; as=image',
    ],
  });

  // Continue with normal response processing
  const data = await fetchDataFromDB();
  res.render('page', { data });
});
```

---

## Common Bottlenecks

### 1. Too Many Third-Party Domains

**Problem**: The median website connects to **15-20 third-party domains** (HTTP Archive
2024). Each domain requires DNS + TCP + TLS setup (300-700 ms on first visit).

**Impact**: First visit page load increases by 1-3 seconds due to connection overhead
alone. Over 90% of web pages include at least one third-party resource.

**Fix**:
- Audit third-party scripts quarterly -- remove unused ones
- Self-host critical third-party resources (fonts, analytics libraries)
- Use `dns-prefetch` for domains you cannot eliminate
- Use `preconnect` for the 2-3 most critical third-party origins
- Set a domain budget: maximum 8-10 external domains per page

### 2. Uncompressed Resources

**Problem**: Serving text resources (HTML, CSS, JS, JSON, SVG) without compression.

**Impact**: A typical 300 KB JavaScript bundle compresses to 75 KB with gzip or 60 KB
with Brotli. Without compression, users download **4-5x more data** than necessary.

**Fix**:
- Enable Brotli compression on your server/CDN (with gzip fallback)
- Pre-compress static assets at build time with Brotli level 11
- Verify with `curl -H "Accept-Encoding: br, gzip" -I https://example.com/app.js`
- Check the `Content-Encoding` response header

### 3. Render-Blocking Requests

**Problem**: Synchronous CSS and JavaScript in `<head>` block first paint.

**Impact**: Every render-blocking resource adds at minimum 1 RTT (50-200 ms) to
First Contentful Paint. Tag managers loaded synchronously can inject additional
blocking scripts, compounding the problem.

**Fix**:
- Inline critical CSS (under 14 KB to fit in first TCP congestion window)
- Load non-critical CSS with `media` attributes or dynamic insertion
- Add `defer` or `async` to all non-critical scripts
- Move scripts to end of `<body>` if `defer` is not suitable
- Avoid synchronous script injection patterns

### 4. Waterfall Chains (Sequential Dependencies)

**Problem**: Resources that can only be discovered after a parent resource loads.

**Common chains**:
- CSS `@import` chains: 1 RTT per import depth
- JavaScript dynamic imports discovered at runtime
- Fonts referenced in CSS (discovered only after CSS parse)
- Images set via CSS `background-image`

**Impact**: A chain of depth 4 at 100 ms RTT adds **400 ms minimum** of pure wait time.

**Fix**:
- Flatten CSS `@import` into parallel `<link>` tags
- Use `<link rel="preload">` for fonts and critical images
- Use `<link rel="modulepreload">` for deep JS module chains
- Analyze chain depth in Lighthouse (target: depth <= 2)

### 5. Oversized Unoptimized Resources

**Problem**: Downloading resources larger than necessary.

**Examples**:
- 2 MB hero image when 200 KB WebP would suffice (10x waste)
- 500 KB JavaScript bundle when tree-shaking could produce 150 KB
- Full font family (400 KB) when subset would be 30 KB

**Fix**:
- Serve responsive images with `srcset` and `sizes`
- Use modern formats (WebP, AVIF) with `<picture>` fallback
- Tree-shake and code-split JavaScript bundles
- Subset fonts to only needed character ranges

---

## Anti-Patterns

### 1. Preloading Everything

```html
<!-- ANTI-PATTERN: preloading 10+ resources -->
<link rel="preload" href="/font1.woff2" as="font" crossorigin>
<link rel="preload" href="/font2.woff2" as="font" crossorigin>
<link rel="preload" href="/font3.woff2" as="font" crossorigin>
<link rel="preload" href="/hero.webp" as="image">
<link rel="preload" href="/logo.svg" as="image">
<link rel="preload" href="/app.js" as="script">
<link rel="preload" href="/vendor.js" as="script">
<link rel="preload" href="/utils.js" as="script">
<link rel="preload" href="/style.css" as="style">
<link rel="preload" href="/theme.css" as="style">
```

**Why it hurts**: Preload is a mandatory, high-priority fetch. Preloading 10 resources
means 10 high-priority fetches compete for bandwidth simultaneously. The truly critical
resources (LCP image, main CSS) get delayed because bandwidth is shared with less
important resources.

**Rule of thumb**: Preload a maximum of **2-5 resources**. If you need more, you likely
have an architecture problem to solve instead.

### 2. Not Using HTTP/2 (or Actively Fighting It)

**Problem**: Domain sharding (splitting resources across cdn1.example.com,
cdn2.example.com, etc.) was an HTTP/1.1 optimization to bypass the 6-connection limit.
Under HTTP/2, it is actively harmful -- it prevents connection coalescing and forces
multiple TCP connections where one would suffice.

**Fix**: Consolidate assets onto a single domain (or 2 at most). Let HTTP/2
multiplexing handle concurrency.

### 3. Ignoring Resource Priorities

**Problem**: Loading all images at the same priority. The LCP image and a footer
decorative icon have identical priority by default.

**Fix**: Use `fetchpriority="high"` on the LCP image, `fetchpriority="low"` +
`loading="lazy"` on below-the-fold images.

### 4. Synchronous Third-Party Scripts in Head

```html
<!-- ANTI-PATTERN -->
<head>
  <script src="https://tag-manager.example.com/gtm.js"></script>
  <script src="https://analytics.example.com/tracker.js"></script>
  <script src="https://chat.example.com/widget.js"></script>
</head>
```

**Impact**: Each script blocks rendering. With 3 third-party scripts, first paint is
delayed by **300-900 ms** (3 x 1-3 RTTs including DNS+TCP+TLS for new domains).

**Fix**: Add `async` or `defer`, move to end of `<body>`, or load via a tag manager
with async loading.

### 5. Missing Compression

Serving text resources without `Content-Encoding: br` or `Content-Encoding: gzip`.
This is the single highest-impact fix for most sites -- enabling compression
typically reduces total page weight by **60-80%** for text resources.

### 6. No Cache Headers on Static Assets

```
# ANTI-PATTERN: No caching
Cache-Control: no-store

# CORRECT: Immutable assets with content hashes
Cache-Control: public, max-age=31536000, immutable

# CORRECT: HTML pages
Cache-Control: no-cache
```

Without proper cache headers, browsers re-download unchanged resources on every visit.
With a 1-year `max-age` and content-hashed filenames, repeat visits download **0 bytes**
for unchanged static assets.

---

## Before/After Waterfall Diagrams

### Example 1: Unoptimized E-Commerce Product Page

```
BEFORE (Total load: 4.8 s)
===========================
Time:  0ms    500ms    1000ms   1500ms   2000ms   2500ms   3000ms   3500ms   4000ms   4800ms
       |--------|--------|--------|--------|--------|--------|--------|--------|--------|

HTML   |========|                                                                        200ms
CSS    .        |==========|                                                             350ms (blocked by HTML)
@import.                   |========|                                                    280ms (blocked by CSS)
Font   .                            |==========|                                         350ms (blocked by @import)
GTM    |==================|                                                              500ms (sync, blocking)
GTM-sub.                   |==============|                                              400ms (injected by GTM)
Hero   .                                       |================|                       500ms (discovered late)
LCP    .                                                         *                       2800ms (LCP event)
JS     |========================|                                                        650ms (sync, blocking)
API    .                         |==============|                                        450ms (blocked by JS)
Images .                                        |========================|               700ms (no lazy loading)

Chain depth: 4 (HTML->CSS->@import->Font)
Domains: 12
Render-blocking: 3 resources
Compression: gzip only
```

```
AFTER (Total load: 1.9 s)
=========================
Time:  0ms    500ms    1000ms   1500ms   1900ms
       |--------|--------|--------|--------|

HTML   |======|                                    180ms (Brotli compressed)
CSS    |======|                                    180ms (inlined critical, preloaded full)
Font   |========|                                  250ms (preloaded, starts with HTML)
Hero   |==========|                                300ms (preloaded, fetchpriority=high)
LCP    .          *                                500ms (LCP event -- 78% faster)
GTM    .     |==========|                          350ms (async, fetchpriority=low)
JS     .  |========|                               250ms (deferred, Brotli compressed)
API    .           |======|                        200ms (fetchpriority=high)
Images .                  |====|                   150ms (lazy loaded, below fold)

Chain depth: 1 (everything parallel)
Domains: 4 (consolidated)
Render-blocking: 0 resources
Compression: Brotli (level 11 static, level 5 dynamic)
```

**Result: LCP improved from 2.8 s to 0.5 s (82% improvement). Total load from 4.8 s
to 1.9 s (60% improvement).**

### Example 2: Blog/Content Site with 103 Early Hints

```
BEFORE (LCP: 3.2 s)
====================
Time:  0ms    500ms    1000ms   1500ms   2000ms   2500ms   3000ms   3200ms
       |--------|--------|--------|--------|--------|--------|--------|

DNS    |==|                                                           80ms
TCP    .  |==|                                                        100ms
TLS    .     |====|                                                   200ms
HTML   .          |==========|                                        400ms (server processing)
CSS    .                     |========|                               300ms
Font   .                              |========|                      300ms
Image  .                              |============|                  450ms
LCP    .                                           *                  3200ms
```

```
AFTER (LCP: 1.8 s)
===================
Time:  0ms    500ms    1000ms   1500ms   1800ms
       |--------|--------|--------|--------|

DNS    |==|                                        80ms
TCP    .  |==|                                     100ms
TLS    .     |====|                                200ms
103    .          |                                 (Early Hints sent immediately)
CSS    .          |========|                       300ms (started during server think-time)
Font   .          |========|                       300ms (started during server think-time)
Image  .          |============|                   450ms (started during server think-time)
HTML   .          |==========|                     400ms (server processing, parallel)
LCP    .                       *                   1800ms
```

**Result: LCP improved from 3.2 s to 1.8 s (44% improvement) by overlapping resource
fetches with server processing time.**

---

## Decision Tree: Resource Prioritization

Use this flowchart to determine how to handle each resource on your page.

```
START: Is this resource needed for the current page?
  |
  +-- NO --> Is it needed for the next likely page?
  |            |
  |            +-- YES --> <link rel="prefetch"> (idle priority)
  |            +-- NO  --> Do not load it at all
  |
  +-- YES --> Is it above the fold / critical for first render?
               |
               +-- NO --> Does the user need to scroll to see it?
               |            |
               |            +-- YES (image) --> loading="lazy" + fetchpriority="low"
               |            +-- YES (script) --> <script defer> or <script async>
               |            +-- YES (CSS) --> media="print" onload trick or dynamic insert
               |
               +-- YES --> Is it the LCP element?
                            |
                            +-- YES --> Is it an image?
                            |            |
                            |            +-- YES --> fetchpriority="high"
                            |            |           + <link rel="preload"> if CSS bg-image
                            |            |           + Serve WebP/AVIF, responsive sizes
                            |            |
                            |            +-- NO (text) --> Inline critical CSS
                            |                              + preload fonts
                            |
                            +-- NO (but above fold) -->
                                 |
                                 +-- Is it a font? --> <link rel="preload" as="font" crossorigin>
                                 +-- Is it CSS? --> Inline critical portion (<14 KB)
                                 +-- Is it JS? --> <script defer> (or async if independent)
                                 +-- Is it from third-party origin?
                                      |
                                      +-- Critical? --> <link rel="preconnect">
                                      +-- Non-critical? --> <link rel="dns-prefetch">
```

### Quick Reference: Priority Assignment

| Resource                        | fetchpriority | loading  | rel hint       | Script attr |
|---------------------------------|---------------|----------|----------------|-------------|
| LCP hero image                  | high          | eager    | preload        | --          |
| Above-fold non-LCP image        | (default)     | eager    | --             | --          |
| Below-fold image                | low           | lazy     | --             | --          |
| Critical CSS                    | --            | --       | preload (full) | --          |
| Non-critical CSS                | --            | --       | prefetch       | --          |
| Main app JS bundle              | high          | --       | --             | defer       |
| Analytics / tracking JS         | low           | --       | --             | async       |
| Chat widget JS                  | low           | --       | --             | defer       |
| Web font (above fold)           | (default)     | --       | preload        | --          |
| Third-party critical origin     | --            | --       | preconnect     | --          |
| Third-party non-critical origin | --            | --       | dns-prefetch   | --          |
| Next-page JS bundle             | --            | --       | prefetch       | --          |
| Deep ES module dependency       | --            | --       | modulepreload  | --          |

---

## Optimization Checklist

Use this checklist to audit any web page for network performance issues:

```
PROTOCOL
[ ] HTTP/2 or HTTP/3 enabled
[ ] Alt-Svc header advertises HTTP/3 if available
[ ] QUIC (UDP 443) not blocked by firewall

COMPRESSION
[ ] Brotli enabled for text resources (HTML, CSS, JS, JSON, SVG)
[ ] Gzip enabled as fallback
[ ] Static assets pre-compressed at Brotli level 11
[ ] Content-Encoding header present in responses

RESOURCE HINTS
[ ] preconnect on 2-3 critical third-party origins
[ ] dns-prefetch on remaining third-party domains
[ ] preload on LCP image (if CSS background or late-discovered)
[ ] preload on critical fonts
[ ] No more than 5 total preload hints
[ ] modulepreload on critical deep JS module imports

FETCH PRIORITY
[ ] fetchpriority="high" on LCP image (1 resource only)
[ ] fetchpriority="low" on below-fold images
[ ] loading="lazy" on all below-fold images

SCRIPTS
[ ] No synchronous scripts in <head> (except critical inline)
[ ] defer or async on all external scripts
[ ] Third-party scripts audited quarterly
[ ] Tag manager loaded async

CSS
[ ] Critical CSS inlined (<14 KB)
[ ] Full CSS loaded via preload with onload swap
[ ] No CSS @import chains (flattened to parallel <link> tags)

CACHING
[ ] Cache-Control headers on all static assets
[ ] Content-hashed filenames for immutable caching
[ ] Service worker with cache-first for static assets
[ ] Cache hit ratio monitored (target: >85%)

EARLY HINTS
[ ] 103 Early Hints for 1-3 critical resources (if server supports)
[ ] Validated with RUM on both desktop and mobile
[ ] Not over-hinting (max 3 resources)

CONNECTION
[ ] Domains consolidated (target: <8 external domains)
[ ] Keep-alive enabled with appropriate timeout
[ ] Connection pooling configured for backend services

MONITORING
[ ] RUM tracking for LCP, FCP, TTFB, CLS, INP
[ ] Lighthouse CI in deployment pipeline
[ ] Critical request chain depth <= 2
[ ] Waterfall analysis on key pages monthly
```

---

## Sources

- [Cloudflare: HTTP/3 vs HTTP/2 Performance](https://blog.cloudflare.com/http-3-vs-http-2/)
- [DebugBear: HTTP/3 vs HTTP/2 Performance](https://www.debugbear.com/blog/http3-vs-http2-performance)
- [Request Metrics: HTTP/3 is Fast](https://requestmetrics.com/web-performance/http3-is-fast/)
- [The New Stack: HTTP/3 in the Wild](https://thenewstack.io/http-3-in-the-wild-why-it-beats-http-2-where-it-matters-most/)
- [web.dev: Resource Hints](https://web.dev/learn/performance/resource-hints)
- [DebugBear: Browser Resource Hints](https://www.debugbear.com/blog/resource-hints-rel-preload-prefetch-preconnect)
- [NitroPack: Resource Hints Performance Optimization](https://nitropack.io/blog/resource-hints-performance-optimization/)
- [MDN: dns-prefetch](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/dns-prefetch)
- [web.dev: Fetch Priority API](https://web.dev/articles/fetch-priority)
- [DebugBear: fetchpriority Attribute](https://www.debugbear.com/blog/fetchpriority-attribute)
- [DebugBear: Avoid Overusing fetchpriority=high](https://www.debugbear.com/blog/avoid-overusing-fetchpriority-high)
- [imkev.dev: Fetch Priority and Optimizing LCP](https://imkev.dev/fetchpriority-opportunity)
- [web.dev: Service Worker Caching and HTTP Caching](https://web.dev/articles/service-worker-caching-and-http-caching)
- [MDN: PWA Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [Paul Calvano: Choosing Between gzip, Brotli, and Zstandard](https://paulcalvano.com/2024-03-19-choosing-between-gzip-brotli-and-zstandard-compression/)
- [DebugBear: HTTP Compression Gzip Brotli](https://www.debugbear.com/blog/http-compression-gzip-brotli)
- [IO River: Gzip vs Brotli Compression Performance](https://www.ioriver.io/blog/gzip-vs-brotli-compression-performance)
- [DebugBear: Avoid Chaining Critical Requests](https://www.debugbear.com/blog/avoid-chaining-critical-requests)
- [DebugBear: Optimizing the Critical Rendering Path](https://www.debugbear.com/blog/optimizing-the-critical-rendering-path)
- [HTTP Archive: 2024 Web Almanac - Performance](https://almanac.httparchive.org/en/2024/performance)
- [Akamai: Early Hints Prototype Results](https://www.akamai.com/blog/performance/akamai-103-early-hints-prototype-the-results-are-in)
- [Shopify: Early Hints at Shopify](https://performance.shopify.com/blogs/blog/early-hints-at-shopify)
- [Cloudflare: Early Hints Performance](https://blog.cloudflare.com/early-hints-performance/)
- [NGINX: 103 Early Hints Support](https://blog.nginx.org/blog/nginx-introduces-support-103-early-hints)
- [MDN: modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload)
- [web.dev: Preload Modules](https://web.dev/articles/modulepreload)
- [HAProxy: HTTP Keep-Alive and Connection Pooling](https://www.haproxy.com/blog/http-keep-alive-pipelining-multiplexing-and-connection-pooling)
- [Microsoft: HTTP Connection Pooling](https://devblogs.microsoft.com/premier-developer/the-art-of-http-connection-pooling-how-to-optimize-your-connections-for-peak-performance/)
- [F5/NGINX: HTTP Keepalives and Web Performance](https://www.f5.com/company/blog/nginx/http-keepalives-and-web-performance)
- [NitroPack: Core Web Vitals Strategy 2025](https://nitropack.io/blog/core-web-vitals-strategy/)
