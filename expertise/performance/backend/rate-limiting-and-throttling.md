# Rate Limiting & Throttling

> Performance expertise module covering algorithms, distributed implementations, client-side
> strategies, and production decision frameworks for rate limiting and throttling systems.

---

## Table of Contents

1. [Core Concepts: Rate Limiting vs Throttling vs Backpressure](#core-concepts)
2. [Rate Limiting Algorithms](#rate-limiting-algorithms)
3. [Algorithm Performance Comparison](#algorithm-performance-comparison)
4. [Distributed Rate Limiting with Redis](#distributed-rate-limiting-with-redis)
5. [Client-Side Throttling and Debouncing](#client-side-throttling-and-debouncing)
6. [API Rate Limit Headers](#api-rate-limit-headers)
7. [Backpressure Mechanisms](#backpressure-mechanisms)
8. [Common Bottlenecks](#common-bottlenecks)
9. [Anti-Patterns](#anti-patterns)
10. [Before/After: System Stability Under Load](#beforeafter-system-stability-under-load)
11. [Decision Tree: Which Algorithm Should I Use?](#decision-tree-which-algorithm-should-i-use)
12. [Production Case Studies](#production-case-studies)
13. [Sources](#sources)

---

## Core Concepts

### Rate Limiting

Rate limiting enforces a strict quantitative ceiling on operations within a fixed timeframe.
When a client exceeds N requests per window, subsequent requests are rejected outright with
HTTP 429 ("Too Many Requests"). The enforcement is binary: the request either passes or is
denied. Typical configurations enforce 100-10,000 requests per minute per API key.

### Throttling

Throttling controls the *rate at which requests are processed* rather than rejecting them.
A throttled client continues receiving responses but at a degraded throughput -- for example,
a search API that normally responds in 50ms may add artificial delays of 200-500ms to slow
a misbehaving client. Throttling preserves availability while degrading performance, whereas
rate limiting preserves server resources by shedding load.

### Backpressure

Backpressure is an upstream signal that tells producers to slow down when downstream
consumers cannot keep pace. Unlike rate limiting (which is imposed on callers), backpressure
is a cooperative feedback loop where a service communicates its capacity to its upstream
dependencies. In practice, backpressure manifests as TCP flow control, HTTP 429 with
Retry-After headers, Kafka consumer lag signals, or reactive streams demand signaling.

### When to Use Each

| Mechanism      | Direction       | Behavior When Triggered         | Best For                          |
|----------------|-----------------|----------------------------------|-----------------------------------|
| Rate Limiting  | Server to client | Reject excess requests (429)     | API abuse prevention, DDoS        |
| Throttling     | Server to client | Slow down processing             | Graceful degradation under load   |
| Backpressure   | Downstream to upstream | Signal producer to reduce rate | Internal service-to-service flows |

---

## Rate Limiting Algorithms

### 1. Token Bucket

**How it works:** A bucket holds up to `B` tokens (the burst capacity). Tokens are added
at a fixed refill rate of `R` tokens per second. Each incoming request consumes 1 token.
If the bucket is empty, the request is rejected. Tokens accumulate up to the bucket
capacity, enabling short bursts.

```
Parameters:
  - Bucket capacity (B): maximum burst size (e.g., 100 tokens)
  - Refill rate (R): tokens added per second (e.g., 10/s)

State per client:
  - current_tokens: float or integer
  - last_refill_timestamp: epoch milliseconds

Per-request logic:
  1. Calculate elapsed time since last refill
  2. Add (elapsed * R) tokens, cap at B
  3. If current_tokens >= 1: consume 1 token, allow request
  4. Else: reject request
```

**Memory per bucket:** ~24-40 bytes (2 numeric fields + timestamp). At 1M users, that is
roughly 24-40 MB of state.

**Strengths:** Allows controlled bursts (a client that was idle accumulates tokens).
Simple to reason about. Two tunable parameters (rate and burst) map cleanly to business
requirements. Used in production at Stripe, AWS API Gateway, and NGINX.

**Weaknesses:** Requires per-user state. Tuning burst capacity too high allows traffic
spikes that defeat the purpose of limiting. Does not smooth output rate -- bursts pass
through to the backend.

### 2. Leaky Bucket

**How it works:** Requests enter a FIFO queue (the bucket) with fixed capacity `B`.
Requests drain from the queue at a constant rate `R` per second. If the queue is full
when a new request arrives, it is dropped. The output rate is perfectly smooth regardless
of input burstiness.

```
Parameters:
  - Queue capacity (B): maximum queued requests
  - Leak rate (R): requests processed per second

State per client:
  - queue: bounded FIFO (or counter + timestamp)
  - last_leak_timestamp

Per-request logic:
  1. Drain (elapsed * R) items from queue
  2. If queue length < B: enqueue request
  3. Else: reject request
```

**Memory per bucket:** ~24-32 bytes if using counter-based implementation (no actual
queue). If using a real FIFO queue, memory grows with queue depth.

**Strengths:** Produces perfectly smooth, constant-rate output. Simple to implement.
Prevents any burst from reaching the backend.

**Weaknesses:** Cannot handle legitimate burst traffic -- even a briefly idle client
gets no burst allowance. Adds latency because requests wait in the queue. Less flexible
than token bucket for APIs where occasional bursts are acceptable.

### 3. Fixed Window Counter

**How it works:** Time is divided into fixed windows of duration `W` (e.g., 60 seconds).
A counter tracks requests in the current window. When the counter reaches the limit `L`,
subsequent requests are rejected until the window resets.

```
Parameters:
  - Window size (W): e.g., 60 seconds
  - Limit (L): e.g., 100 requests per window

State per client:
  - counter: integer
  - window_start: timestamp

Per-request logic:
  1. If current_time >= window_start + W: reset counter to 0, update window_start
  2. If counter < L: increment counter, allow request
  3. Else: reject request
```

**Memory per client:** ~16 bytes (1 integer + 1 timestamp). The most memory-efficient
algorithm.

**Strengths:** Extremely simple to implement. O(1) time and space. Trivial to implement
in Redis with INCR + EXPIRE (2 commands).

**Weaknesses:** Suffers from the **boundary burst problem**. A client can send L requests
at the end of window N and L requests at the start of window N+1, effectively sending 2L
requests in a span of W seconds. This can allow up to 2x the intended rate at window
boundaries. For a 100 req/min limit, a client could send 200 requests in a 60-second span
straddling two windows.

### 4. Sliding Window Log

**How it works:** Every request timestamp is stored in a sorted set. When a new request
arrives, all timestamps older than `(now - W)` are removed. If the remaining count is
below the limit, the request is allowed and its timestamp is added.

```
Parameters:
  - Window size (W): e.g., 60 seconds
  - Limit (L): e.g., 100 requests per window

State per client:
  - sorted set of timestamps (e.g., Redis ZSET)

Per-request logic:
  1. Remove all entries with timestamp < (now - W)
  2. Count remaining entries
  3. If count < L: add current timestamp, allow request
  4. Else: reject request
```

**Memory per client:** O(L) -- stores up to L timestamps. At 100 requests per window with
8-byte timestamps, that is ~800 bytes per client. At 1M users, that is ~800 MB. At
10,000 requests per window, memory grows to ~80 KB per client.

**Strengths:** Perfectly accurate. No boundary burst problem. Exact sliding window
semantics.

**Weaknesses:** Memory-intensive: O(L) per client where L is the rate limit. Requires
cleanup of expired entries on every request, which is O(L) worst case. Not practical for
high-limit scenarios (e.g., 10,000 req/min). The ZREMRANGEBYSCORE operation on large sets
adds latency.

### 5. Sliding Window Counter

**How it works:** Combines fixed window counter with weighted overlap calculation. Maintains
counters for the current and previous windows. The effective count is calculated as:

```
effective_count = (previous_window_count * overlap_percentage) + current_window_count

Where overlap_percentage = 1 - (elapsed_time_in_current_window / window_size)
```

For example, if we are 30 seconds into a 60-second window, overlap is 50%. If the previous
window had 80 requests and the current has 30, the effective count is (80 * 0.5) + 30 = 70.

```
Parameters:
  - Window size (W): e.g., 60 seconds
  - Limit (L): e.g., 100 requests per window

State per client:
  - previous_counter: integer
  - current_counter: integer
  - current_window_start: timestamp

Per-request logic:
  1. If current_time >= window_start + W: rotate counters
  2. Calculate overlap_pct = 1 - ((now - window_start) / W)
  3. effective = (prev_counter * overlap_pct) + current_counter
  4. If effective < L: increment current_counter, allow request
  5. Else: reject request
```

**Memory per client:** ~20 bytes (2 integers + 1 timestamp). O(1) space -- same order as
fixed window.

**Strengths:** Smooths boundary bursts with minimal memory overhead. O(1) time and space.
In real-world testing, only 0.003% of requests are incorrectly allowed compared to a
perfect sliding window log (source: Cloudflare engineering). Best balance of accuracy and
efficiency.

**Weaknesses:** Approximate -- not perfectly accurate. Assumes uniform distribution of
requests within the previous window. Slightly more complex to implement than fixed window.

---

## Algorithm Performance Comparison

| Algorithm             | Memory/Client | Time Complexity | Burst Handling  | Accuracy      | Impl. Complexity |
|-----------------------|---------------|-----------------|-----------------|---------------|------------------|
| Token Bucket          | ~32 bytes     | O(1)            | Allows bursts   | Exact (rate)  | Low-Medium       |
| Leaky Bucket          | ~32 bytes     | O(1)            | Smooths bursts  | Exact (rate)  | Low              |
| Fixed Window Counter  | ~16 bytes     | O(1)            | Boundary bursts | 2x overshoot  | Very Low         |
| Sliding Window Log    | ~8L bytes     | O(L) cleanup    | No bursts       | Perfect       | Medium           |
| Sliding Window Counter| ~20 bytes     | O(1)            | Smoothed        | ~99.997%      | Low-Medium       |

### Memory at Scale (1M concurrent users)

| Algorithm             | Memory @ 100 req/min limit | Memory @ 10K req/min limit |
|-----------------------|----------------------------|----------------------------|
| Token Bucket          | ~32 MB                     | ~32 MB                     |
| Leaky Bucket          | ~32 MB                     | ~32 MB                     |
| Fixed Window Counter  | ~16 MB                     | ~16 MB                     |
| Sliding Window Log    | ~800 MB                    | ~80 GB                     |
| Sliding Window Counter| ~20 MB                     | ~20 MB                     |

The sliding window log is the only algorithm whose memory scales with the rate limit value
itself. All others use constant space per client regardless of the limit.

### Throughput Overhead

A well-implemented rate limiter adds minimal latency:

- **In-memory (single-process):** 50-200 nanoseconds per check. Negligible overhead.
- **Redis single-node:** 0.1-0.5ms per check (network round trip dominates). At sub-ms
  latency, this supports 50,000+ rate limit checks per second per Redis node.
- **Redis with Lua script:** Single round trip regardless of algorithm complexity. P95
  latency < 2ms, P99 < 5ms in production (source: Redis benchmarks).
- **Redis cluster:** Add ~0.1ms for slot redirection on first access. Throughput scales
  linearly with nodes.

---

## Distributed Rate Limiting with Redis

### Why Redis

Redis is the de facto choice for distributed rate limiting because:

1. **Sub-millisecond latency:** Redis processes commands in the sub-microsecond range
   internally. Unix domain socket latency is ~30 microseconds; network latency on 1 Gbit/s
   is ~200 microseconds (source: Redis latency documentation).
2. **Atomic operations:** INCR, EXPIRE, ZADD, ZRANGEBYSCORE execute atomically.
3. **Lua scripting:** EVAL/EVALSHA run multi-step logic atomically on the server, eliminating
   race conditions and reducing round trips from 3-4 to 1.
4. **Built-in expiration:** TTL-based key expiry handles window rotation automatically.

### The Race Condition Problem

Without atomicity, concurrent requests create a classic TOCTOU (time-of-check/time-of-use)
race:

```
Thread A: GET counter -> 99 (under limit of 100)
Thread B: GET counter -> 99 (under limit of 100)
Thread A: INCR counter -> 100 (allowed)
Thread B: INCR counter -> 101 (SHOULD have been rejected)
```

At 10,000 requests per second, this race condition can allow 5-15% over-admission in
testing (source: Halodoc engineering blog).

### Lua Script Solutions

#### Fixed Window with Lua

```lua
-- KEYS[1] = rate limit key
-- ARGV[1] = limit
-- ARGV[2] = window size in seconds
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
    return 0  -- rejected
end
return 1  -- allowed
```

#### Sliding Window Log with Lua

```lua
-- KEYS[1] = rate limit key
-- ARGV[1] = limit
-- ARGV[2] = window size in milliseconds
-- ARGV[3] = current timestamp in milliseconds
-- ARGV[4] = unique request ID
local window_start = tonumber(ARGV[3]) - tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', window_start)
local count = redis.call('ZCARD', KEYS[1])
if count < tonumber(ARGV[1]) then
    redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
    redis.call('PEXPIRE', KEYS[1], ARGV[2])
    return 0  -- allowed
end
return 1  -- rejected
```

#### Token Bucket with Lua

```lua
-- KEYS[1] = bucket key
-- ARGV[1] = bucket capacity
-- ARGV[2] = refill rate (tokens/sec)
-- ARGV[3] = current timestamp (seconds, float)
-- ARGV[4] = tokens to consume
local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or tonumber(ARGV[1])
local last_refill = tonumber(bucket[2]) or tonumber(ARGV[3])
local now = tonumber(ARGV[3])
local elapsed = math.max(0, now - last_refill)
tokens = math.min(tonumber(ARGV[1]), tokens + elapsed * tonumber(ARGV[2]))
local allowed = 0
if tokens >= tonumber(ARGV[4]) then
    tokens = tokens - tonumber(ARGV[4])
    allowed = 1
end
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', KEYS[1], math.ceil(tonumber(ARGV[1]) / tonumber(ARGV[2])) * 2)
return allowed
```

### EVAL vs EVALSHA

- **EVAL** sends the full script source on every call. This wastes bandwidth --
  a typical rate limiter Lua script is 300-800 bytes.
- **EVALSHA** sends only the 40-byte SHA1 hash after the script is loaded via SCRIPT LOAD.
  At 50,000 requests/second, this saves ~12-38 MB/s of bandwidth.

**Production pattern:** Load scripts at application startup, cache SHA1 hashes, call
EVALSHA. If Redis returns NOSCRIPT (after a restart or failover), fall back to EVAL once
and re-cache the hash.

### Handling Hot Keys

When millions of users share a single rate limit key (e.g., global API limit), that key
becomes a hot key on a single Redis shard. Mitigation strategies:

1. **Key sharding:** Append a shard suffix (e.g., `ratelimit:global:{0-7}`) and sum
   counters across shards. Distributes load across 8 Redis slots.
2. **Local pre-aggregation:** Aggregate counts in-process for 100-500ms, then flush to
   Redis. Reduces Redis operations by 10-50x at the cost of accuracy.
3. **Redis Cluster with read replicas:** Route read-heavy operations (checking remaining
   quota) to replicas. Writes still go to the primary.

---

## Client-Side Throttling and Debouncing

### Debouncing

Debouncing delays execution until activity stops for a specified period. Ideal for
search-as-you-type or autocomplete where only the final input matters.

```javascript
function debounce(fn, delayMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
// Usage: debounce(searchAPI, 300) -- waits 300ms after last keystroke
```

**Impact:** A user typing 5 characters in 1 second generates 1 API call instead of 5.
At 100,000 concurrent users, debouncing at 300ms reduces search API traffic by 60-80%.

### Throttling (Client-Side)

Throttling limits execution to at most once per time interval, regardless of how many
times the function is invoked.

```javascript
function throttle(fn, intervalMs) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    }
  };
}
// Usage: throttle(trackScroll, 100) -- at most 10 calls/sec on scroll
```

**Impact:** Scroll-tracking that fires 60 times/second (matching 60fps) is reduced to
10 calls/second with 100ms throttling -- an 83% reduction in API calls.

### Exponential Backoff with Jitter

When a client receives HTTP 429, it should retry with exponential backoff:

```
delay = min(base_delay * 2^attempt, max_delay) + random_jitter

Where:
  base_delay = 1 second (typical)
  max_delay  = 32-64 seconds (cap)
  jitter     = random(0, delay * 0.5)  -- prevents thundering herd
```

**Without jitter:** If 1,000 clients hit a rate limit simultaneously and all retry at
exactly 2^N seconds, the server sees synchronized spikes of 1,000 requests at t=1s, t=2s,
t=4s, t=8s -- the thundering herd problem.

**With jitter:** The same 1,000 retries spread across a time range. At attempt 3 with
base delay 1s: delay = 8s + random(0, 4s), so retries spread across the 8-12s window.
This reduces peak retry load by 60-80%.

### Adaptive Client-Side Rate Limiting (Google SRE)

Google's approach from the SRE book implements client-side throttling based on observed
rejection rate:

```
client_request_probability = max(0, (requests - K * accepts) / (requests + 1))

Where:
  requests = total requests in recent window
  accepts  = requests that were accepted (not rate-limited)
  K        = multiplier (typically 2.0)
```

When the backend starts rejecting requests, the client proactively reduces its own send
rate. At K=2, the client starts self-throttling when more than 50% of requests are
rejected. This prevents wasted work (sending requests that will be rejected) and reduces
server load from processing rejections.

---

## API Rate Limit Headers

### Current Standard (IETF Draft)

The IETF HTTPAPI Working Group is standardizing rate limit headers via
`draft-ietf-httpapi-ratelimit-headers` (currently at draft-10, expires March 2026).
The specification defines:

| Header            | Purpose                                          | Example Value        |
|-------------------|--------------------------------------------------|----------------------|
| `RateLimit-Limit` | Maximum requests allowed in the current window   | `100`                |
| `RateLimit-Remaining` | Requests remaining in the current window     | `47`                 |
| `RateLimit-Reset` | Seconds until the rate limit window resets        | `30`                 |
| `RateLimit-Policy`| Describes the rate limit policy                  | `100;w=60`           |
| `Retry-After`     | Seconds to wait before retrying (on 429)         | `30`                 |

### Legacy Headers (Still Widely Used)

Before the IETF draft, APIs used non-standard `X-RateLimit-*` headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1672531200   (Unix epoch -- inconsistent across APIs)
```

The key inconsistency: `X-RateLimit-Reset` is sometimes a Unix timestamp (GitHub, Twitter)
and sometimes delta-seconds (others). The IETF draft standardizes on delta-seconds for
`RateLimit-Reset`, consistent with `Retry-After` from RFC 9110.

### HTTP Status Codes

| Code | Meaning                 | When to Use                                      |
|------|-------------------------|--------------------------------------------------|
| 429  | Too Many Requests       | Client exceeded rate limit (RFC 6585)            |
| 503  | Service Unavailable     | Server-side overload / load shedding             |
| 403  | Forbidden               | Some APIs use this instead of 429 (not ideal)    |

**Best practice:** Always return 429 for rate limiting, 503 for load shedding. Include
`Retry-After` header with both. Include `RateLimit-*` headers on ALL responses (not just
429s) so clients can proactively manage their request rate.

### Response Body Best Practice

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Limit: 100 requests per 60 seconds.",
    "retry_after": 30,
    "limit": 100,
    "remaining": 0,
    "reset": 30
  }
}
```

---

## Backpressure Mechanisms

### TCP-Level Backpressure

TCP flow control is the original backpressure mechanism. When a receiver's buffer fills,
it advertises a smaller window size, causing the sender to slow down. This is invisible
to the application layer but can cause connection pooling issues when TCP windows shrink
under load.

### Application-Level Backpressure

#### Queue-Based Backpressure

Bounded queues with rejection policies provide explicit backpressure:

```
Queue capacity: 10,000 items
Current depth:  9,500 items (95% full)
Action:         Return 503 to new requests, signal upstream to reduce rate
```

When queue depth exceeds 80% capacity, start rejecting low-priority requests. At 95%,
reject all non-critical requests. This graduated response prevents queue overflow while
maintaining service for critical traffic.

#### Reactive Streams Backpressure

Reactive frameworks (RxJava, Project Reactor, Akka Streams) implement demand-based
backpressure where consumers explicitly request N items from producers:

- `request(10)` -- consumer can handle 10 more items
- Producer sends at most 10 items, then waits for more demand
- If consumer is slow, producer naturally slows without buffering

#### Load Shedding as Backpressure (Stripe Model)

Stripe implements 4 tiers of rate limiting in production (source: Stripe engineering blog):

1. **Request Rate Limiter:** Token bucket, N requests/second per user.
2. **Concurrent Request Limiter:** Caps simultaneous in-flight requests per user to
   manage CPU-intensive endpoints.
3. **Fleet Usage Load Shedder:** Reserves 20% of fleet capacity for critical requests.
   Non-critical requests are rejected with 503 when the fleet exceeds 80% utilization.
4. **Worker Utilization Load Shedder:** Final defense. When individual workers are
   overloaded, they progressively shed lower-priority traffic, starting with test-mode
   requests.

This tiered approach means Stripe can handle 100+ billion API requests without cascading
failures (source: Stripe engineering).

---

## Common Bottlenecks

### 1. The Rate Limiter Becomes the Bottleneck

**Problem:** If the rate limiter itself is slower than the services it protects, it adds
latency to every request -- including those well within their limits.

**Symptoms:**
- P99 latency increases by 5-50ms under load
- Rate limiter Redis CPU exceeds 80%
- Rate limiter timeouts cause cascading failures

**Solutions:**
- Use in-memory rate limiting for single-instance services (~200ns per check vs ~500us
  for Redis)
- Use Lua scripts to reduce Redis round trips from 3-4 to 1
- Set aggressive timeouts on Redis calls (e.g., 5ms). If Redis is unavailable, fail
  open (allow request) rather than blocking
- Pre-compute rate limit decisions and cache them for 100-500ms

### 2. Redis Round-Trip Latency

**Problem:** Each rate limit check requires a Redis round trip. At 50,000 requests/second,
that is 50,000 Redis operations/second, consuming significant network bandwidth and Redis
CPU.

**Measurements:**
- Same-datacenter Redis: 0.2-0.5ms per round trip
- Cross-datacenter Redis: 1-5ms per round trip
- Redis Lua script (single round trip): 0.3-1ms regardless of algorithm complexity

**Solutions:**
- **Pipeline commands:** Batch multiple rate limit checks into a single Redis pipeline.
  Reduces per-check latency by 3-5x.
- **Local token cache:** Each application instance maintains a local allocation of tokens
  (e.g., 1/N of the global limit where N = number of instances). Refresh from Redis every
  1-5 seconds. Reduces Redis calls by 100-1000x.
- **Redis Cluster:** Shard rate limit keys across nodes. Linear throughput scaling.

### 3. Hot Keys in Redis

**Problem:** A single popular API key or a global rate limit creates a "hot key" that
concentrates all writes on one Redis shard.

**Impact:** A single Redis shard handles ~100,000-200,000 operations/second. A global
rate limit at 500,000 requests/second exceeds this capacity.

**Solutions:**
- **Key sharding:** Split `ratelimit:global` into `ratelimit:global:{0..15}` and sum
  across shards. Each shard handles 1/16 of the traffic.
- **Probabilistic local counting:** Maintain an approximate local counter (e.g., HyperLogLog
  or simple counter with periodic sync). Accept ~1-5% inaccuracy.
- **Two-tier limiting:** Coarse local limit (in-memory) + fine-grained global limit
  (Redis). Local limit catches 90% of rejections without touching Redis.

### 4. Clock Skew in Distributed Systems

**Problem:** Fixed and sliding window algorithms depend on consistent time. If servers
disagree by >1 second, rate limits become inaccurate.

**Impact:** At 100 requests per 10-second window, a 2-second clock skew between servers
can allow 120 requests (20% over-admission).

**Solutions:**
- Use Redis server time (via `TIME` command or Lua `redis.call('TIME')`) instead of
  client timestamps. All decisions reference the same clock.
- Use NTP to keep server clocks within 10ms of each other.
- Prefer token bucket algorithm, which is less sensitive to clock skew (it uses elapsed
  time deltas, not absolute timestamps).

---

## Anti-Patterns

### 1. In-Memory Rate Limiting in Distributed Systems

**The mistake:** Using a local in-memory counter (e.g., `ConcurrentHashMap` in Java, or
a process-level dictionary in Python) when running multiple service instances behind a
load balancer.

**Why it fails:** With 10 instances and a limit of 100 requests/minute, a client can
send 100 requests to each instance -- effectively getting a 1,000 request/minute limit.
Each instance sees only 1/N of the traffic.

**The fix:** Use a shared store (Redis, Memcached) or implement a gossip protocol to
synchronize counters. Alternatively, use sticky sessions (but this creates uneven load
distribution and single-point-of-failure risks).

### 2. No Rate Limiting

**The mistake:** Deploying an API without any rate limiting because "our clients are
well-behaved."

**What happens:** A single misbehaving client (or bot, or retry storm) saturates the
service. 73% of SaaS outages are linked to API overuse or poor traffic management
(source: Gartner, 2024). Without rate limiting, a single client can monopolize shared
resources, degrading service for all other users.

**The fix:** Start with a generous rate limit (e.g., 10x your expected peak per-client
traffic). Monitor, measure, then tighten. A loose limit is infinitely better than no
limit.

### 3. Too Aggressive Rate Limiting

**The mistake:** Setting rate limits based on average traffic rather than peak traffic.
A limit of 10 requests/second when the client legitimately bursts to 50 requests/second
during normal operation causes constant 429 errors.

**Symptoms:**
- High 429 rate (>5% of requests) during normal operation
- Client retry storms amplifying the problem
- Support tickets from frustrated developers

**The fix:** Set limits at 2-5x the observed P95 client request rate. Use token bucket
algorithm to allow bursts. Monitor 429 rates by client and alert when they exceed 1%.

### 4. Rate Limiting Without Informative Responses

**The mistake:** Returning 429 without `Retry-After` header, without `RateLimit-*`
headers, or with a generic error message.

**Why it matters:** Without `Retry-After`, clients guess when to retry -- often too soon,
creating retry storms. Without `RateLimit-Remaining`, clients cannot proactively manage
their request rate.

**The fix:** Always include `Retry-After` on 429 responses. Include `RateLimit-*` headers
on ALL responses. Include a JSON body with specific error details.

### 5. Using the Wrong Identifier

**The mistake:** Rate limiting by IP address in an environment with NAT gateways, proxies,
or cloud egress. A corporate NAT gateway may funnel 10,000 users through a single IP.

**Impact:** Legitimate users behind the same NAT get rate-limited collectively. Meanwhile,
an attacker can rotate IPs easily (e.g., using cloud VMs at $0.01/hour each).

**The fix:** Rate limit by API key, user ID, or OAuth token. Use IP-based limiting only
as a last resort for unauthenticated endpoints (e.g., login, registration).

### 6. Fail-Closed Rate Limiter

**The mistake:** When Redis (or your rate limit store) is unavailable, rejecting all
requests.

**Impact:** A Redis outage causes a complete API outage -- the rate limiter becomes a
single point of failure.

**The fix:** Fail open. If the rate limit check cannot be completed within 5ms, allow
the request and log the failure. Use circuit breakers around Redis calls. A short period
of unlimited access is vastly preferable to a complete outage.

---

## Before/After: System Stability Under Load

### Scenario: API Receiving Traffic Spike (10x Normal Load)

#### WITHOUT Rate Limiting

```
Time    Requests/s   Latency (P99)   Error Rate   CPU Usage
t+0s    1,000        50ms            0.1%         40%
t+10s   5,000        200ms           2%           75%
t+20s   10,000       2,000ms         25%          98%
t+30s   10,000       timeout         80%          100%
t+40s   10,000       timeout         95%          100%    <-- cascading failure
t+50s   2,000        timeout         90%          100%    <-- legitimate users affected
t+60s   500          5,000ms         50%          95%     <-- slow recovery begins
t+120s  1,000        500ms           10%          60%     <-- partial recovery
```

**Total impact:** 2+ minutes of degraded service. ~60% of legitimate requests failed.
Cascading failures propagated to downstream services.

#### WITH Rate Limiting (Token Bucket: 2,000 req/s per client, global: 5,000 req/s)

```
Time    Requests/s   Latency (P99)   Error Rate   429 Rate   CPU Usage
t+0s    1,000        50ms            0.1%         0%         40%
t+10s   5,000        55ms            0.1%         0%         45%
t+20s   10,000       60ms            0.1%         50%        50%
t+30s   10,000       60ms            0.1%         50%        50%
t+40s   10,000       60ms            0.1%         50%        50%    <-- stable
t+50s   10,000       60ms            0.1%         50%        50%    <-- stable
t+60s   5,000        55ms            0.1%         0%         45%    <-- load subsides
```

**Total impact:** Zero degradation for clients within their limits. 50% of excess traffic
shed cleanly with 429 + Retry-After. P99 latency increased by only 10ms (rate limiter
overhead). No cascading failures. No recovery period needed.

### Scenario: Redis Rate Limiter Failure

#### Fail-Closed (Anti-Pattern)

```
Redis down at t+0s:
  - ALL rate limit checks fail
  - ALL requests rejected (100% error rate)
  - Complete API outage for 30-300 seconds until Redis recovers
  - Worse than having no rate limiter at all
```

#### Fail-Open (Best Practice)

```
Redis down at t+0s:
  - Rate limit checks timeout after 5ms
  - All requests allowed (fail open)
  - Log "rate limiter unavailable" at WARN level
  - Alert on-call engineer
  - Service continues operating without rate limiting for 30-300 seconds
  - Risk: temporary over-admission. Actual risk is low if the outage is brief.
```

---

## Decision Tree: Which Algorithm Should I Use?

```
START: What is your primary requirement?
  |
  +---> Need to allow traffic bursts?
  |       |
  |       +---> YES: Use TOKEN BUCKET
  |       |       - Stripe, AWS API Gateway, NGINX use this
  |       |       - Two params: rate + burst capacity
  |       |       - Memory: ~32 bytes/client
  |       |       - Best for: API rate limiting with burst tolerance
  |       |
  |       +---> NO: Need perfectly smooth output rate?
  |               |
  |               +---> YES: Use LEAKY BUCKET
  |               |       - Processes requests at constant rate
  |               |       - Adds queuing latency
  |               |       - Best for: traffic shaping, network QoS
  |               |
  |               +---> NO: Continue below
  |
  +---> Is memory a primary constraint?
  |       |
  |       +---> YES, minimal memory:
  |       |       |
  |       |       +---> Can you tolerate boundary bursts (up to 2x)?
  |       |               |
  |       |               +---> YES: Use FIXED WINDOW COUNTER
  |       |               |       - ~16 bytes/client, simplest to implement
  |       |               |       - Redis: INCR + EXPIRE (2 commands)
  |       |               |
  |       |               +---> NO: Use SLIDING WINDOW COUNTER
  |       |                       - ~20 bytes/client, 99.997% accurate
  |       |                       - Best default choice for most APIs
  |       |
  |       +---> NO, memory is not a concern:
  |               |
  |               +---> Need perfect accuracy (zero false allows)?
  |                       |
  |                       +---> YES: Use SLIDING WINDOW LOG
  |                       |       - O(L) memory per client
  |                       |       - Only practical for L < 1,000
  |                       |       - Best for: billing, compliance, audit
  |                       |
  |                       +---> NO: Use SLIDING WINDOW COUNTER
  |                               - Best overall balance
  |
  +---> Running distributed (multi-node)?
          |
          +---> YES:
          |       - Use Redis + Lua scripts for atomicity
          |       - SLIDING WINDOW COUNTER is the recommended default
          |       - TOKEN BUCKET if bursts are needed
          |       - Always use EVALSHA (not EVAL) for performance
          |       - Set 5ms timeout, fail open on Redis errors
          |
          +---> NO (single process):
                  - Use in-memory implementation
                  - Any algorithm works; TOKEN BUCKET is most versatile
                  - ~200ns per check, no external dependencies

QUICK DECISION MATRIX:
  API rate limiting (general)     --> Sliding Window Counter
  API rate limiting (allow bursts)--> Token Bucket
  Network traffic shaping         --> Leaky Bucket
  Simple + low memory             --> Fixed Window Counter
  Billing / compliance / audit    --> Sliding Window Log
```

---

## Production Case Studies

### Cloudflare: Rate Limiting at the Edge

Cloudflare processes rate limiting across millions of domains at their edge network. Their
architecture uses a Twemproxy cluster inside each Point of Presence (PoP) with consistent
hashing to distribute memcache keys across servers. When the cluster is resized, consistent
hashing ensures only a small fraction of keys are rehashed. Rate limiting at the edge
means origin servers never see excessive traffic, and the performance/memory cost is
distributed across the global edge network (source: Cloudflare engineering blog).

Key numbers:
- Rate limiting deployed across 300+ data centers globally
- Consistent hashing minimizes key redistribution during scaling
- Edge-based limiting eliminates origin server load from abusive traffic

### Stripe: Four-Tier Rate Limiting

Stripe's production rate limiting uses 4 distinct layers (source: Stripe engineering blog):

1. **Request rate limiter** (token bucket): Per-user request rate cap
2. **Concurrent request limiter:** Per-user cap on simultaneous in-flight requests
3. **Fleet usage load shedder:** Reserves 20% fleet capacity for critical traffic
4. **Worker utilization load shedder:** Per-worker progressive shedding by priority

All layers use Redis with token bucket algorithm for the per-user limiters. The load
shedders use local worker metrics. This layered approach protects against both individual
abuse and systemic overload while ensuring critical payment processing is never starved.

### Halodoc: Redis + Lua Sliding Window

Halodoc implemented a sliding window rate limiter using Redis sorted sets and Lua scripts
(source: Halodoc engineering blog). Key findings:

- Lua scripts reduced race condition over-admission from ~12% to 0%
- Single Redis round trip per rate limit check (vs 3-4 without Lua)
- ZREMRANGEBYSCORE + ZCARD + ZADD + PEXPIRE in a single atomic operation
- Production deployment handles thousands of requests/second with sub-2ms latency

### Google SRE: Client-Side Adaptive Throttling

Google's SRE book describes client-side adaptive throttling where clients track their own
acceptance rate and proactively reduce sending rate when backends are stressed. With
multiplier K=2, clients start self-throttling when rejection rate exceeds 50%. This
reduces wasted work (sending requests only to be rejected) and can reduce recovery time
from overload by 50-70% compared to server-side-only rate limiting (source: Google SRE
book, Chapter 21).

---

## Implementation Checklist

```
[ ] Choose algorithm based on decision tree above
[ ] Implement with Redis + Lua scripts for distributed systems
[ ] Use EVALSHA (not EVAL) -- load scripts at startup, cache SHA1
[ ] Set Redis call timeout to 5ms, fail open on timeout
[ ] Return RateLimit-* headers on ALL responses (not just 429)
[ ] Return Retry-After header on 429 responses
[ ] Include informative JSON error body on 429 responses
[ ] Rate limit by API key or user ID (not IP address)
[ ] Set initial limits at 2-5x observed P95 client traffic
[ ] Monitor 429 rate by client -- alert if >1% during normal operation
[ ] Implement exponential backoff with jitter in client SDKs
[ ] Add circuit breaker around Redis rate limit calls
[ ] Test under load: verify rate limiter does not become the bottleneck
[ ] Test Redis failure: verify fail-open behavior
[ ] Test clock skew: verify algorithm tolerates 1-2 second differences
[ ] Dashboard: request rate, 429 rate, rate limiter latency, Redis health
```

---

## Sources

- [Cloudflare: How We Built Rate Limiting Capable of Scaling to Millions of Domains](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)
- [Stripe: Scaling Your API with Rate Limiters](https://stripe.com/blog/rate-limiters)
- [Redis: Build 5 Rate Limiters with Redis](https://redis.io/tutorials/howtos/ratelimiting/)
- [Halodoc: Redis and Lua Powered Sliding Window Rate Limiter](https://blogs.halodoc.io/taming-the-traffic-redis-and-lua-powered-sliding-window-rate-limiter-in-action/)
- [IETF: RateLimit Header Fields for HTTP (draft-ietf-httpapi-ratelimit-headers)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
- [API7: From Token Bucket to Sliding Window Rate Limiting Guide](https://api7.ai/blog/rate-limiting-guide-algorithms-best-practices)
- [Arpit Bhayani: Sliding Window Rate Limiting Design and Implementation](https://arpitbhayani.me/blogs/sliding-window-ratelimiter/)
- [Gravitee: API Rate Limiting at Scale](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies)
- [AlgoMaster: Rate Limiting Algorithms Explained with Code](https://blog.algomaster.io/p/rate-limiting-algorithms-explained-with-code)
- [Redis: Diagnosing Latency Issues](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)
- [Zuplo: 10 Best Practices for API Rate Limiting in 2025](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025)
- [Kodekx: API Rate Limiting Best Practices for Scaling SaaS Apps in 2025](https://www.kodekx.com/blog/api-rate-limiting-best-practices-scaling-saas-2025)
- [Expedia Group: Traffic Shedding, Rate Limiting, Backpressure](https://medium.com/expedia-group-tech/traffic-shedding-rate-limiting-backpressure-oh-my-21f95c403b29)
- [Smudge.ai: Visualizing Algorithms for Rate Limiting](https://smudge.ai/blog/ratelimit-algorithms)
- [FreeCodeCamp: How to Build a Distributed Rate Limiting System Using Redis and Lua](https://www.freecodecamp.org/news/build-rate-limiting-system-using-redis-and-lua/)
- [Kong: How to Design a Scalable Rate Limiting Algorithm](https://konghq.com/blog/engineering/how-to-design-a-scalable-rate-limiting-algorithm)
- [Lunar.dev: Maximizing Performance with Client-Side Throttling](https://www.lunar.dev/post/client-side-throttling)
- [GeeksforGeeks: Token Bucket vs Leaky Bucket Algorithm](https://www.geeksforgeeks.org/system-design/token-bucket-vs-leaky-bucket-algorithm-system-design/)
- [Speakeasy: Rate Limiting Best Practices in REST API Design](https://www.speakeasy.com/api-design/rate-limiting)
- [Arxiv: Designing Scalable Rate Limiting Systems](https://arxiv.org/html/2602.11741)
