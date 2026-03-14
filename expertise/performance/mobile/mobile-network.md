# Mobile Network -- Performance Expertise Module

> Mobile networks are unreliable, high-latency, and bandwidth-constrained compared to desktop. Median 4G latency is 30-70ms RTT; on 3G it is 100-500ms. Network transitions (WiFi to cellular) cause connection drops. Apps must be designed for variable network conditions, not just fast WiFi.

> **Impact:** High
> **Applies to:** Mobile (iOS, Android, Flutter, React Native)
> **Key metrics:** API response time on mobile networks, Data transferred (MB), Request count per session, Offline capability, Time to first meaningful data

---

## Why This Matters

### The Mobile Network Reality

Mobile networks are fundamentally different from wired connections. Engineers who optimize only on office WiFi ship apps that fail in the real world.

**Latency by network generation (typical RTT):**

| Network | Typical RTT | Theoretical Min | Peak Download |
|---------|-------------|-----------------|---------------|
| 2G EDGE | 300-1000ms | 100ms | 384 Kbps |
| 3G HSPA | 100-500ms | 88ms | 42 Mbps |
| 4G LTE | 30-70ms | 10-20ms | 300 Mbps |
| 5G low-band | 15-30ms | 5ms | 1 Gbps |
| 5G mid-band | 5-15ms | 1ms | 4 Gbps |

Source: mvno-index.com; Ericsson Mobility Report 2024; hpbn.co/mobile-networks/

A single API call on 3G with DNS + TLS handshake + request/response can take 800ms-2s. Packet loss on cellular is 1-5% (vs <0.1% wired), triggering TCP retransmission delays. Radio state transitions (idle to active) on LTE add 50-100ms; on 3G, 1-2 seconds. **53% of mobile users abandon apps taking >3 seconds to load** (Google/SOASTA). Every 1-second delay causes a 12% decrease in conversions.

Real-world median 4G speed in the US: ~30 Mbps (Opensignal 2024); India: ~15 Mbps. Users cycle through 5G/4G/3G/no-signal on trains. Indoor/congested environments reduce throughput by 10x.

### Data Costs in Emerging Markets

| Region | Avg cost/1GB | % monthly income for 1GB |
|---|---|---|
| India | $0.09 | <0.1% |
| Indonesia | $1.21 | ~0.5% |
| Sub-Saharan Africa | $2.40-$15.00 | 2.4%+ (above affordability) |
| Brazil | $1.50-$3.00 | ~0.5% |

Source: cable.co.uk 2024; GSMA Mobile Affordability Report 2024. A 5MB response that could be 500KB with compression is financially punishing in cost-sensitive markets.

---

## Performance Budgets and Targets

| Condition | Target (P50) | Acceptable (P95) | Unacceptable |
|---|---|---|---|
| WiFi / 5G | <200ms | <500ms | >1s |
| 4G LTE | <500ms | <1.5s | >3s |
| 3G | <1.5s | <3s | >5s |
| 2G / Offline | Instant (cached) | <5s (sync) | No data shown |

**Data transfer budgets:** Initial load <200KB, per-screen payload <50KB, background sync <500KB/hr, images <100KB/screen, session total <5MB/10min.

**Request count limits:** <=3 per screen load, <=6 concurrent, <=2 background/min, polling >=30s interval (prefer push/SSE/WebSocket).

---

## Measurement and Profiling

**Charles Proxy** -- Intercepts HTTP/HTTPS traffic; built-in 3G/4G throttling presets; measures per-request latency and payload size; exports HAR files. **Network Link Conditioner (Apple)** -- System-level simulation with configurable bandwidth, latency, and packet loss. **Android Network Profiler** -- Real-time visualization of requests, sizes, response codes correlated with CPU/memory. **Chrome DevTools** -- Slow 3G (400ms RTT, 400 Kbps) / Fast 3G (150ms RTT, 1.5 Mbps) presets; waterfall charts. **Flipper (Meta)** -- Network plugin for iOS/Android/React Native with database inspector to verify caching. **Wireshark** -- Packet-level analysis for TCP/TLS issues, HTTP/2 multiplexing verification, retransmissions.

**Key measurements:** TTFB, total request duration, payload size (compressed vs uncompressed), request count per screen, waterfall dependencies (serial chains), error rate by network type, cache hit ratio.

---

## Common Bottlenecks

1. **Too many serial requests** -- 5 serial requests on 3G (200ms RTT) = 1s of pure network wait
2. **Large JSON payloads** -- REST returning full objects wastes 40-60% bandwidth (Postman benchmarks)
3. **No response compression** -- Uncompressed JSON is 60-80% larger; gzip saves ~78%, Brotli ~82% (DebugBear)
4. **No HTTP caching headers** -- Without Cache-Control/ETag, identical data redownloaded every time; ETags reduce transfer by up to 70% for static resources (MDN)
5. **Chatty N+1 APIs** -- Feed screen: 1 request for IDs + N for details + N for avatars = 20+ requests
6. **Unoptimized images** -- 2000x2000 JPEG to 375px screen; WebP saves 25-34%, AVIF saves 50% (web.dev)
7. **No offline support** -- Blank screen in subway/elevator/rural areas
8. **DNS overhead** -- Each unique domain: 20-120ms lookup; 5 domains = 100-600ms
9. **TLS handshake cost** -- TLS 1.2: 2 RTTs; on 3G = 400ms. TLS 1.3: 1 RTT. HTTP/3 QUIC: 0-RTT on resume
10. **No connection pooling** -- New TCP per request adds 1-3 RTTs overhead
11. **Polling instead of push** -- 90%+ of polls return empty; wastes battery and bandwidth
12. **Ignoring network state** -- 10MB upload on 2G; HD downloads on metered connections
13. **Redundant requests on navigation** -- Back/forward reloads data fetched seconds ago
14. **Base64 blobs in JSON** -- 33% size inflation; cannot be streamed or cached independently
15. **Synchronous token refresh** -- Expired token blocks all requests, doubling latency
16. **Uncompressed request bodies** -- Large POST/PUT JSON sent without compression

---

## Optimization Patterns

**Request batching** -- Combine 5 calls into 1. Saves `(N-1) * RTT`: on 3G, 800ms for 5-to-1 batch.

**Prefetching** -- Fetch next-screen data during idle time. Reduces perceived latency 50-80% (Google research). Front-loads transfers into single burst at full radio capacity.

**Response compression** -- Brotli level 4-6 for dynamic content (~82% ratio). gzip as fallback (~78%). Reduces payloads 60-80%.

**HTTP caching** -- Immutable assets: `max-age=31536000, immutable`. Semi-static: `max-age=300` + ETag. Dynamic: `no-cache` + ETag (304 = ~200 bytes vs full payload).

**Offline-first** -- UI reads local DB (sub-ms). Background sync when online. App works everywhere. Requires conflict resolution (last-write-wins, CRDT, or server-authoritative).

**GraphQL / BFF** -- Client requests exact fields. Reduces payload 40-60% vs full REST objects. One request per screen instead of N generic endpoints.

**Protocol Buffers** -- 50-80% smaller than JSON, 2-10x faster parsing (Auth0: 45x serialization in Java). Best for real-time streams, chat, analytics.

**Image CDN** -- Device-aware sizing + WebP/AVIF. 95%+ browsers support WebP, 90%+ AVIF. Reduces image data 50-80%.

**HTTP/2 and HTTP/3** -- HTTP/2: multiplexing + HPACK header compression. HTTP/3 (QUIC): 0-RTT resume, connection migration (survives WiFi-to-cellular). Google: 14% faster for slowest 10%; Fastly/Wix: 18-33% TTFB improvement.

**Cursor pagination** -- Offset at page 1000 of 1M rows: ~500ms. Cursor at any position: ~2ms. Prevents gaps in dynamic feeds.

---

## Anti-Patterns

1. **Polling every 5s** -- Keeps radio active, drains battery. Fix: WebSocket/SSE/push; if unavoidable, 30s+ intervals
2. **Full-size image downloads** -- 2MB photo for 150px thumbnail. Fix: CDN with `?w=300&format=webp`
3. **No HTTP/2+** -- HTTP/1.1: 6 connections, no header compression. Fix: HTTP/2 minimum; evaluate HTTP/3
4. **Ignoring network state** -- Fix: `ConnectivityManager` (Android) / `NWPathMonitor` (iOS); defer large uploads to WiFi
5. **No retry backoff** -- Immediate infinite retry hammers servers. Fix: exponential backoff with jitter (1s, 2s, 4s, 8s + random); max 3-5 retries
6. **Chatty micro-APIs without aggregation** -- 15 calls per screen. Fix: BFF layer aggregates server-side
7. **Individual analytics events** -- Every tap fires HTTP. Fix: batch 20 events or 30s, single compressed request
8. **No local cache layer** -- Every screen visit = full reload. Fix: stale-while-revalidate; show cached, refresh background
9. **Blocking UI on network** -- White screen/spinner 500ms-3s. Fix: skeleton screens, cached data, optimistic UI
10. **Base64 blobs in responses** -- 33% inflation. Fix: return URLs; client fetches/caches binary separately
11. **REST without field selection** -- 50 fields returned, 5 needed. Fix: `?fields=id,name,avatar` or GraphQL
12. **Many unique API domains** -- Each = DNS + TLS overhead. Fix: single API domain; connection prewarming

---

## Architecture-Level Decisions

### REST vs GraphQL for Mobile

| Factor | REST | GraphQL |
|---|---|---|
| Over-fetching | Common (full objects) | Eliminated (client selects) |
| Requests/screen | 3-15 typical | 1-2 typical |
| Caching | Easy (URL-based, CDN) | Complex (single endpoint) |
| Payload waste | 40-60% typical | Minimal |
| Recommendation | Use BFF to optimize | Strong fit for complex UIs |

### Offline-First Sync Strategies

| Strategy | Consistency | Complexity | Best For |
|---|---|---|---|
| Last-write-wins | Eventual | Low | Settings, preferences |
| Timestamp merge | Eventual | Medium | Notes, documents |
| CRDT | Strong eventual | High | Collaborative editing |
| Server-authoritative | Strong | Medium | Financial transactions |

Implementation: local DB (Room/CoreData/Isar) + sync engine + network monitor + retry queue with exponential backoff.

### Data Serialization

| Format | Size vs JSON | Parse Speed | Schema | Use Case |
|---|---|---|---|---|
| JSON | 1x | 1x | Optional | Most APIs (tooling, debugging) |
| Protobuf | 0.2-0.5x | 2-10x faster | Required | High-frequency endpoints |
| FlatBuffers | 0.3-0.6x | 10-100x faster | Required | Gaming, IoT (zero-copy) |
| MessagePack | 0.5-0.7x | 1.5-3x faster | Optional | Drop-in JSON replacement |

---

## Testing and Regression Prevention

**Network simulation in CI** -- Use `toxiproxy` or `comcast` to inject 3G conditions (200ms RTT, 1.5 Mbps, 1% loss). Fail builds exceeding latency budgets.

**Payload size monitoring:**
```bash
for endpoint in /api/feed /api/profile /api/settings; do
  size=$(curl -s -o /dev/null -w '%{size_download}' \
    -H "Accept-Encoding: gzip" "https://api.example.com$endpoint")
  [ "$size" -gt 51200 ] && echo "FAIL: $endpoint = ${size}B (limit: 50KB)" && exit 1
done
```

**Request count assertions** -- In E2E tests, assert requests per flow. A 3-request screen must not silently become 12.

**Offline smoke tests** -- Run critical flows with network disabled. Verify cached data, queued mutations, no crashes.

| Regression Metric | Alert Threshold | Tool |
|---|---|---|
| P95 API latency (4G sim) | >1.5s | CI + toxiproxy |
| Compressed payload size | >50KB/response | CI curl check |
| Requests per screen | >5 | E2E assertion |
| Offline flow completion | <100% | E2E (airplane mode) |
| Cache hit ratio | <60% | Analytics dashboard |

---

## Decision Trees

### "My App is Slow on Mobile Networks"

```
START: Profile with Charles Proxy on simulated 3G
  |
  +-> >5 requests/screen? --> Batch requests, use BFF/GraphQL (target <=3)
  +-> Payloads >50KB compressed? --> Enable Brotli/gzip, add field selection
  +-> Serial request waterfall? --> Parallelize, prefetch, use HTTP/2 multiplexing
  +-> Same data fetched repeatedly? --> Add Cache-Control + ETag, stale-while-revalidate
  +-> Images large/unoptimized? --> Image CDN + device sizing + WebP/AVIF + lazy load
  +-> High TTFB, not bandwidth? --> Check server time, add CDN/edge, HTTP/3, prewarm
  +-> Fails on network transitions? --> Offline-first, retry queue, HTTP/3 connection migration
```

### "My App Uses Too Much Data"

```
  Images optimized? --> No: WebP/AVIF at device resolution (saves 50-80%)
  Compression enabled? --> No: Brotli/gzip (saves 60-80% on text)
  Over-fetching? --> Yes: Field selection / GraphQL (saves 40-60%)
  Caching working? --> No: Cache-Control + ETag (304 saves 90%+)
  Frequent polling? --> Yes: Push/WebSocket; min 60s interval
  Analytics batched? --> No: Batch 20 events, compress, send every 30-60s
```

---

## Code Examples

### 1. Request Batching (Before/After)

```typescript
// BEFORE: 5 serial requests = 5 * RTT. On 3G: 1000ms network wait.
async function loadDashboard() {
  const user = await fetch('/api/user/123');
  const posts = await fetch('/api/user/123/posts');
  const notifications = await fetch('/api/notifications');
  const settings = await fetch('/api/settings');
  const trending = await fetch('/api/trending');
}

// AFTER: 1 batch request = 1 * RTT. On 3G: 200ms. 80% savings.
async function loadDashboard() {
  const { user, posts, notifications, settings, trending } = await fetch('/api/batch', {
    method: 'POST',
    body: JSON.stringify({ requests: [
      { id: 'user', path: '/api/user/123', fields: ['name', 'avatar'] },
      { id: 'posts', path: '/api/user/123/posts', params: { limit: 10 } },
      { id: 'notifications', path: '/api/notifications', params: { unread: true } },
      { id: 'settings', path: '/api/settings' },
      { id: 'trending', path: '/api/trending', params: { limit: 5 } },
    ]})
  }).then(r => r.json());
}
```

### 2. ETag-Based Caching

```kotlin
// BEFORE: Always downloads full 15KB response
suspend fun getProfile(id: String) = httpClient.get("/users/$id").body<Profile>()

// AFTER: 304 Not Modified = ~200 bytes (98.7% savings when unchanged)
suspend fun getProfile(id: String): Profile {
  val cached = cache.get("user_$id")
  val response = httpClient.get("/users/$id") {
    cached?.etag?.let { header("If-None-Match", it) }
  }
  return when (response.status) {
    HttpStatusCode.NotModified -> cached!!.data
    HttpStatusCode.OK -> response.body<Profile>().also {
      cache.put("user_$id", CacheEntry(it, response.headers["ETag"]))
    }
    else -> throw ApiException(response.status)
  }
}
```

### 3. Offline-First Data Layer

```dart
// BEFORE: Blank screen offline. Fails in subway/elevator.
Future<List<Post>> getPosts() async {
  final response = await api.get('/posts'); // Fails offline
  return response.data.map((j) => Post.fromJson(j)).toList();
}

// AFTER: Always shows data. Syncs when online.
Stream<List<Post>> watchPosts() async* {
  yield await localDb.getAllPosts();  // Instant from cache
  if (await connectivity.isConnected) {
    try {
      final fresh = await api.get('/posts');
      await localDb.upsertAll(fresh.data.map(Post.fromJson).toList());
      yield await localDb.getAllPosts();  // Updated data
    } catch (e) { logError('Sync failed', e); }  // Cached data still shown
  }
}
```

### 4. Server Compression (nginx)

```nginx
# BEFORE: 100KB JSON = 100KB transferred
# AFTER:  100KB JSON = ~20KB (Brotli) or ~25KB (gzip)
brotli on;
brotli_comp_level 5;
brotli_types application/json text/plain text/css application/javascript;
gzip on;
gzip_comp_level 6;
gzip_types application/json text/plain text/css application/javascript;
gzip_min_length 256;
```

### 5. Adaptive Image Loading

```swift
// BEFORE: 2000x2000 JPEG = 2MB for 150pt avatar
AsyncImage(url: URL(string: url))

// AFTER: 450x450 WebP = ~15KB (99.3% savings)
let px = Int(150 * UIScreen.main.scale)
let optimized = "\(url)?w=\(px)&h=\(px)&format=webp&q=80"
AsyncImage(url: URL(string: optimized)) { $0.resizable().scaledToFill() }
  placeholder: { Circle().fill(Color.gray.opacity(0.3)) }
  .frame(width: 150, height: 150).clipShape(Circle())
```

### 6. Network-Aware Behavior

```kotlin
// BEFORE: Uploads 10MB on 2G. Always requests HD images.
// AFTER: Adapts to connection type and quality.
fun uploadMedia(file: File) = when {
  networkMonitor.isWifi -> api.upload("/media", file)
  file.length() > 5_000_000 -> {
    uploadQueue.enqueueForWifi(file)
    showToast("Will upload on WiFi")
  }
  else -> api.upload("/media", compressVideo(file, quality = 0.6))
}

fun loadFeed() = api.getStream("/feed?image_quality=${when (networkMonitor.bandwidth) {
  in 0..500 -> "low"        // 2G: thumbnails only
  in 500..5000 -> "medium"  // 3G/4G
  else -> "high"            // WiFi/5G
}}")
```

### 7. GraphQL vs REST Over-Fetching

```graphql
# REST GET /api/users/123 returns 50 fields (2.1KB). Mobile card needs 2.
# GraphQL returns exact fields (120 bytes). 94% smaller.
query UserCard($id: ID!) {
  user(id: $id) { name, avatarUrl }
}
```

### 8. Exponential Backoff with Jitter

```javascript
// BEFORE: while(true) { try { return await fetch(url); } catch(e) {} } // infinite hammer
// AFTER: Backs off exponentially. Jitter prevents thundering herd.
async function fetchWithBackoff(url, { maxRetries = 4, baseDelay = 1000 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status < 500) throw new Error(`Client error: ${res.status}`);
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
    // 1-2s, 2-4s, 4-8s, 8-16s
    await new Promise(r => setTimeout(r,
      Math.min(baseDelay * 2 ** attempt + Math.random() * baseDelay, 30000)));
  }
}
```

### 9. Connection Prewarming

```swift
// Prewarm during splash screen: saves ~180ms (DNS+TCP+TLS) on first real request
func onAppLaunch() {
  showSplashScreen()
  let task = URLSession.shared.dataTask(with: URL(string: "https://api.example.com/healthz")!)
  task.priority = URLSessionTask.highPriority
  task.resume()  // By splash end (~500ms), connection is warm
}
```

---

## Quick Reference

### Optimization Checklist

| Action | Impact | Effort |
|---|---|---|
| Enable Brotli/gzip on all responses | 60-80% less data | Low |
| Add Cache-Control + ETag | 70% fewer full downloads | Low |
| Batch multi-request screens into 1 call | 80% less latency | Medium |
| Return only needed fields | 40-60% smaller payloads | Medium |
| Image CDN + device sizing + WebP | 50-80% less image data | Medium |
| Enable HTTP/2; evaluate HTTP/3 | 15-33% faster TTFB | Low |
| Offline-first local DB + sync | 0ms perceived latency | High |
| Cursor pagination over offset | Consistent 2ms queries | Medium |
| Protobuf for high-frequency APIs | 50-80% smaller, 2-10x parse | High |
| Prefetch next-screen data | 50-80% less perceived wait | Medium |
| Exponential backoff + jitter | Prevents cascading failures | Low |
| Adapt behavior to network type | Better UX on slow networks | Medium |

### Latency Budget (4G P50, target 500ms)

```
DNS: 20ms (prewarmed: 0) | TCP: 30ms (reuse: 0) | TLS: 60ms (1.3/QUIC: 0 resume)
Request upload: 10ms | Server: 200ms | Response download: 80ms | Parse: 20ms | Render: 80ms
First request: ~500ms | Warm request: ~310ms
```

### Protocol Comparison

| Protocol | Handshake RTTs | HoL Blocking | Connection Migration | Header Compression |
|---|---|---|---|---|
| HTTP/1.1 | 3 | Yes | No | None |
| HTTP/2 | 3 | Partial | No | HPACK |
| HTTP/3 | 1-2 | No | Yes (CID) | QPACK |

### Compression Comparison

| Format | Ratio | Compress Speed | Decompress | Support |
|---|---|---|---|---|
| gzip | ~78% | Fast | Fast | 100% |
| Brotli | ~82% | Slow-Medium | Fast | 97%+ |
| zstd | ~80% | Fast | Very fast | Growing |

---

## Sources

- [Android Developers: Optimize Network Access](https://developer.android.com/develop/connectivity/network-ops/network-access-optimization)
- [High Performance Browser Networking: Mobile Networks](https://hpbn.co/mobile-networks/)
- [Ericsson Mobility Report](https://www.ericsson.com/en/reports-and-papers/mobility-report/articles/network-optimization-through-analytics)
- [MVNO Index: Mobile Network Latency](https://mvno-index.com/the-latency-of-the-different-mobile-networks/)
- [Auth0: Beating JSON with Protobuf](https://auth0.com/blog/beating-json-performance-with-protobuf/)
- [Protobuf vs JSON Sizes](https://nilsmagnus.github.io/post/proto-json-sizes/)
- [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [DebugBear: Brotli vs GZIP](https://www.debugbear.com/blog/http-compression-gzip-brotli)
- [DebugBear: HTTP/3 vs HTTP/2](https://www.debugbear.com/blog/http3-vs-http2-performance)
- [Cloudflare: HTTP/2 vs HTTP/1.1](https://www.cloudflare.com/learning/performance/http2-vs-http1.1/)
- [Postman: GraphQL vs REST](https://blog.postman.com/graphql-vs-rest/)
- [web.dev: Image Performance](https://web.dev/learn/performance/image-performance)
- [Google: 53% Abandon >3s](https://www.marketingdive.com/news/google-53-of-mobile-users-abandon-sites-that-take-over-3-seconds-to-load/426070/)
- [GSMA Mobile Affordability 2024](https://telecomlead.com/4g-lte/mobile-data-becomes-more-affordable-in-2024-but-gender-and-income-gaps-persist-gsma-report-123070)
- [droidcon: Offline-First Android](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/)
- [Medium: QUIC + HTTP/3 Latency](https://medium.com/@ThinkingLoop/quic-http-3-the-latency-stack-your-api-deserves-7138bdb2fdd9)
- [Cursor vs Offset Pagination](https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive)
- [Predictive API Prefetching](https://medium.com/@meherun.nesa/predictive-api-caching-and-prefetching-2f6e1d17bb96)
