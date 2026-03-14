# Load Balancing: Performance Engineering Reference

> **Scope**: Algorithms, architectures, software/cloud implementations, health checks,
> session affinity, connection draining, bottlenecks, anti-patterns, and decision frameworks.
> Every claim includes measured numbers. Last updated: 2026-03-08.

---

## Table of Contents

1. [Load Balancing Algorithms](#1-load-balancing-algorithms)
2. [Layer 4 vs Layer 7 Load Balancing](#2-layer-4-vs-layer-7-load-balancing)
3. [Software Load Balancers: Benchmarks](#3-software-load-balancers-benchmarks)
4. [Cloud Load Balancers](#4-cloud-load-balancers)
5. [Health Check Strategies and Failover Timing](#5-health-check-strategies-and-failover-timing)
6. [Session Affinity and Sticky Sessions](#6-session-affinity-and-sticky-sessions)
7. [Connection Draining and Graceful Shutdown](#7-connection-draining-and-graceful-shutdown)
8. [Common Bottlenecks](#8-common-bottlenecks)
9. [Anti-Patterns](#9-anti-patterns)
10. [Before/After: Real-World Improvements](#10-beforeafter-real-world-improvements)
11. [Decision Tree: Which Algorithm Should I Use?](#11-decision-tree-which-algorithm-should-i-use)
12. [Configuration Quick Reference](#12-configuration-quick-reference)
13. [Sources](#13-sources)

---

## 1. Load Balancing Algorithms

### 1.1 Round Robin

The simplest algorithm. Requests are distributed sequentially across servers in a fixed
rotation. No per-request state is required.

| Metric               | Value                                                      |
|----------------------|------------------------------------------------------------|
| CPU overhead         | Negligible -- single counter increment per request         |
| Memory per backend   | O(1) -- one pointer to current position                    |
| Distribution quality | Perfect only when all servers are identical and all requests cost the same |
| Best for             | Homogeneous fleets, stateless services, < 20 backends      |

**Weakness**: Round robin assumes all servers are equally powerful and all requests need
equal processing time. A slow server accumulates a backlog while round robin keeps
sending it work at the same rate. In heterogeneous fleets, this causes p99 latency to
spike by 2-5x as the weakest server becomes a bottleneck.

### 1.2 Weighted Round Robin

Extends round robin by assigning a weight to each server proportional to its capacity.
A server with weight 3 receives three times the requests of a server with weight 1.

| Metric               | Value                                                      |
|----------------------|------------------------------------------------------------|
| CPU overhead         | Negligible -- weighted counter                             |
| Configuration effort | Must manually assign and maintain weights                  |
| Distribution quality | Good when capacity ratios are known and stable             |
| Best for             | Mixed hardware fleets, gradual canary deployments          |

**Practical note**: In Kubernetes, weighted round robin is commonly used for canary
deployments where a new version receives 5-10% of traffic (weight 1) while the stable
version keeps 90-95% (weight 19).

### 1.3 Least Connections

Routes each new request to the server currently handling the fewest active connections.
Requires maintaining a per-server connection counter.

| Metric               | Value                                                      |
|----------------------|------------------------------------------------------------|
| CPU overhead         | O(n) scan or O(log n) with a min-heap, where n = backend count |
| Memory per backend   | 8 bytes (one atomic counter)                               |
| Distribution quality | Excellent for variable-duration requests                   |
| Best for             | WebSocket servers, database proxies, APIs with mixed latency |

**Why it works**: If one server is processing a slow query (500ms) while others finish
in 10ms, least connections naturally routes 50x more requests to the fast servers during
that window. Round robin would still send the same rate to the slow server.

### 1.4 Weighted Least Connections

Combines least connections with server capacity weights. The algorithm selects the server
with the lowest ratio of (active connections / weight). A server with weight 3 and 6
connections has the same priority as a server with weight 1 and 2 connections.

| Metric               | Value                                                      |
|----------------------|------------------------------------------------------------|
| CPU overhead         | O(n) scan with division per backend                        |
| Best for             | Heterogeneous fleets with variable-duration requests       |
| Production use       | Default in many enterprise load balancers (F5, Citrix)     |

### 1.5 Consistent Hashing

Maps both servers and requests onto a hash ring. Each request is routed to the nearest
server clockwise on the ring. When a server is added or removed, only 1/n of requests
are redistributed (where n = number of servers), compared to full redistribution in
modulo hashing.

| Metric               | Value                                                      |
|----------------------|------------------------------------------------------------|
| CPU overhead         | O(log n) binary search on the ring                         |
| Memory               | 100-200 virtual nodes per server typical (Envoy default: 160) |
| Redistribution       | ~1/n keys move when a server is added/removed              |
| Best for             | Caching layers, stateful services, rate limiting per user  |

**Virtual nodes**: Without virtual nodes, hash distribution is uneven. With 150+ virtual
nodes per server, standard deviation of load drops below 10% of the mean. Envoy's ring
hash load balancer uses a configurable minimum ring size (default: 1024 entries) to
control distribution quality vs memory usage.

**Warning**: Consistent hashing gives up adaptiveness. A slow server still receives its
fixed share of traffic. Combine with circuit breaking for production safety.

### 1.6 Random with Two Choices (Power of Two)

Pick two servers at random. Send the request to whichever has fewer active connections.
Described by Michael Mitzenmacher in his 1996 dissertation at Harvard.

| Metric               | Value                                                      |
|----------------------|------------------------------------------------------------|
| CPU overhead         | O(1) -- two random selections plus one comparison          |
| Max queue length     | O(log log n) vs O(log n) for pure random                   |
| Best for             | Distributed load balancers with incomplete state            |

**The exponential improvement**: Pure random load balancing produces a maximum queue
length of O(log n / log log n). Adding just one more random choice -- checking two
servers instead of one -- reduces the maximum queue to O(log log n). This is an
exponential improvement from a single additional comparison.

**Real-world benchmarks** (HAProxy test-driving Power of Two):
- **No contention**: All algorithms perform similarly; Power of Two within 2% of
  least connections.
- **Medium contention**: Random produces ~10% lower throughput than alternatives;
  Power of Two matches least connections.
- **High contention**: Power of Two reduces peak server load beyond what least
  connections achieves, because it avoids the "herd behavior" where all load balancers
  simultaneously pick the same least-loaded server.

**Why it matters for distributed systems**: In a fleet of load balancers, each has a
slightly stale view of backend load. Least connections in this scenario causes all
balancers to simultaneously route to the server they all think is least loaded,
creating a thundering herd. Power of Two's randomization breaks this synchronization.
NGINX adopted this algorithm for its `random two least_conn` directive.

### 1.7 Algorithm Comparison Summary

| Algorithm              | Overhead | State Required | Heterogeneous Fleet | Variable Requests | Cache Affinity |
|------------------------|----------|---------------|--------------------|--------------------|---------------|
| Round Robin            | O(1)     | Counter        | Poor               | Poor               | None          |
| Weighted Round Robin   | O(1)     | Counter+weights| Good               | Poor               | None          |
| Least Connections      | O(n)     | Counters       | Poor               | Excellent          | None          |
| Weighted Least Conn    | O(n)     | Counters+weights| Excellent         | Excellent          | None          |
| Consistent Hashing     | O(log n) | Hash ring      | Poor               | Poor               | Excellent     |
| Random Two Choices     | O(1)     | Counters       | Poor               | Good               | None          |

---

## 2. Layer 4 vs Layer 7 Load Balancing

### 2.1 Layer 4 (Transport Layer)

Operates on TCP/UDP packets. Routing decisions based on source/destination IP and port.
Does not inspect payload content.

| Metric            | Typical Value                                              |
|-------------------|------------------------------------------------------------|
| Throughput        | 10-40 Gbps per node; up to 1M+ new connections/second      |
| Added latency     | Sub-millisecond (< 100 microseconds in kernel-bypass modes) |
| TLS awareness     | None -- passes encrypted traffic through                   |
| Routing granularity| IP + port only                                            |
| Memory per connection | ~256 bytes (connection tracking entry)                  |

**Implementation**: L4 balancers typically use Direct Server Return (DSR) where the
response goes directly from the backend to the client, bypassing the load balancer
entirely. This eliminates the load balancer as a bandwidth bottleneck on the return path.

### 2.2 Layer 7 (Application Layer)

Operates on HTTP/HTTPS, gRPC, and other application protocols. Full request parsing,
header inspection, TLS termination.

| Metric            | Typical Value                                              |
|-------------------|------------------------------------------------------------|
| Throughput        | 50K-200K requests/second per node (varies with request size)|
| Added latency     | 1-20ms (dominated by TLS handshake on new connections)     |
| TLS awareness     | Full -- terminates and re-encrypts                         |
| Routing granularity| URL path, headers, cookies, body content                  |
| Memory per connection | 8-32 KB (buffering, TLS state, HTTP parsing)            |

### 2.3 Performance Tradeoffs

```
                     L4                          L7
Throughput:          10-40 Gbps                  1-10 Gbps (TLS-dependent)
New connections/s:   ~1,000,000                  ~100,000-200,000
Latency added:       < 0.1 ms                    1-20 ms
CPU per request:     ~1 microsecond              ~50-200 microseconds
Can route by URL:    No                          Yes
Can retry failed:    No (connection-level only)  Yes (request-level)
Session affinity:    IP hash only                Cookie-based (robust across NAT)
Health checks:       TCP SYN/ACK only            HTTP status codes, body content
WebSocket support:   Pass-through                Protocol-aware upgrade handling
```

### 2.4 Production Deployment Pattern: L4 + L7 Tiering

Most large-scale deployments use both layers strategically:

```
Internet
    |
[L4 Global LB]  -- anycast, BGP, ECMP
    |              Handles: DDoS absorption, geographic routing
    |              Throughput: millions of connections/s
    v
[L7 Regional LB] -- NGINX/HAProxy/Envoy per region
    |              Handles: TLS termination, path routing, retries
    |              Throughput: 100K-500K req/s per node
    v
[L4 Intra-DC LB] -- IPVS/Maglev/kube-proxy
    |              Handles: pod-level distribution
    |              Throughput: millions of packets/s
    v
[Backend Pods]
```

Google's Maglev paper (2016) demonstrated this pattern at scale: their L4 balancer
handles 10M+ packets/second per machine using kernel-bypass networking, feeding into
L7 proxies for application-level routing.

---

## 3. Software Load Balancers: Benchmarks

### 3.1 HAProxy

| Metric                 | Value                              | Source/Conditions           |
|------------------------|------------------------------------|-----------------------------|
| HTTP RPS (peak)        | 2.08 million req/s                 | HAProxy 2.4, Graviton2 64-core ARM |
| HTTP bandwidth         | 92 Gbps payload                    | 30 KB request size          |
| Added latency          | ~400 microseconds average          | vs 160 us direct connection |
| Memory usage           | ~50 MB baseline                    | 4-core VPS benchmark        |
| Concurrent connections | 2+ million                         | With connection pooling     |
| HTTP/2 support         | Full multiplexing                  | Since HAProxy 2.0           |
| HTTP/3 (QUIC)          | Not natively supported             | As of 2025                  |

**Key tuning parameters**:
- `nbthread`: Match to CPU core count; HAProxy scales linearly up to ~64 threads
- `maxconn`: Default 2000; production typically 50,000-100,000
- `tune.bufsize`: Default 16384; increase for large headers (WebSocket upgrade)
- Connection reuse: `http-reuse always` reduces backend connection overhead by 60-80%

### 3.2 NGINX

| Metric                 | Value                              | Source/Conditions           |
|------------------------|------------------------------------|-----------------------------|
| HTTP RPS              | ~5,200 req/s per worker (tuned)    | Codedamn benchmark, 8 workers |
| Static file serving    | 100K+ req/s                        | Small files, keepalive      |
| Memory usage           | ~80 MB baseline                    | 4-core VPS benchmark        |
| HTTP/3 (QUIC)          | Native support since 1.25.0        | Most mature implementation  |
| Worker model           | Event-driven, single-threaded workers | One worker per CPU core    |

**Key tuning parameters**:
- `worker_processes auto`: One worker per CPU core
- `worker_connections 10240`: Default 512 is far too low for production
- `keepalive_timeout 65`: Reduces TLS handshake overhead via connection reuse
- `upstream keepalive 64`: Connection pool to backends; critical for latency
- `proxy_buffering on`: Frees backend connections faster; reduces p99 by 20-40%

### 3.3 Envoy

| Metric                 | Value                              | Source/Conditions           |
|------------------------|------------------------------------|-----------------------------|
| Throughput             | Highest raw RPS in Loggly benchmark| Multiple test configurations|
| Latency under churn    | Sub-10ms during pod scaling        | Kubernetes dynamic backends |
| CPU usage              | 73% more than HAProxy              | For equivalent throughput   |
| Memory usage           | ~150 MB baseline                   | 4-core VPS benchmark        |
| xDS configuration      | Dynamic, zero-downtime config reload| Via gRPC control plane     |

**Envoy's advantage**: In dynamic environments like Kubernetes, Envoy maintains
consistent sub-10ms latency during pod scaling events. HAProxy can spike to 25-second
response times during configuration reloads in similar scenarios. This makes Envoy the
default sidecar proxy for service meshes (Istio, Linkerd2-proxy).

**Envoy's cost**: The C++ thread-per-core architecture with extensive observability
(histogram stats, distributed tracing) comes at a CPU and memory premium. Disabling
access logs can boost Envoy throughput by up to 2x.

### 3.4 Traefik

| Metric                 | Value                              | Source/Conditions           |
|------------------------|------------------------------------|-----------------------------|
| HTTP RPS               | ~30,000 req/s                      | Default configuration       |
| Auto-discovery         | Native Docker/K8s integration      | Zero configuration routing  |
| Memory usage           | ~100 MB baseline                   | Comparable workload         |
| Best for               | Development, small-to-medium prod  | Ease of use over raw perf   |

### 3.5 Comparative Summary

```
Throughput ranking (HTTP/1.1, same hardware):
  HAProxy > Envoy > NGINX > Traefik

Latency consistency under dynamic backends:
  Envoy > HAProxy > NGINX > Traefik

Memory efficiency:
  HAProxy (~50 MB) > NGINX (~80 MB) > Traefik (~100 MB) > Envoy (~150 MB)

HTTP/3 support maturity:
  NGINX > Traefik > Envoy > HAProxy (none)

Dynamic reconfiguration:
  Envoy (xDS, zero downtime) > Traefik (auto-discovery) > HAProxy (reload) > NGINX (reload)
```

**Production guidance**: In real-world production environments, the performance difference
between HAProxy and NGINX is usually minimal when both are properly configured. The
decision is driven more by architectural needs -- HAProxy for pure TCP/HTTP proxying,
NGINX when you also need static file serving or HTTP/3, Envoy when you need service
mesh integration.

---

## 4. Cloud Load Balancers

### 4.1 AWS Network Load Balancer (NLB)

| Metric                | Value                                                       |
|-----------------------|-------------------------------------------------------------|
| Layer                 | 4 (TCP/UDP/TLS)                                             |
| Throughput            | Millions of requests/second, scales automatically           |
| Latency               | Single-digit milliseconds                                  |
| Static IP             | Yes -- one per AZ                                          |
| TLS termination       | Supported (offloads from backends)                         |
| Idle timeout          | 350 seconds (TCP), 120 seconds (UDP), now configurable     |
| Pricing               | ~$0.006 per NLCU-hour + $0.0225/hour                      |

### 4.2 AWS Application Load Balancer (ALB)

| Metric                | Value                                                       |
|-----------------------|-------------------------------------------------------------|
| Layer                 | 7 (HTTP/HTTPS/gRPC/WebSocket)                              |
| Throughput            | Scales automatically, but lower than NLB                    |
| Latency               | 4x slower than NLB in benchmarks                           |
| Content-based routing | URL path, host header, HTTP method, query string            |
| gRPC support          | Native                                                      |
| Pricing               | ~$0.008 per LCU-hour + $0.0225/hour                       |

**Why ALB is slower**: ALB terminates the incoming TCP session, reads the HTTP payload
into memory, evaluates routing rules against headers/path, then opens a new connection
to the target. NLB rewrites IP/TCP headers and forwards packets without inspecting
payload. The extra memory copy and rule evaluation add measurable latency.

**NLB vs ALB selection**: Use NLB when latency is critical (gaming, financial trading,
real-time streaming). NLB benchmark results show 4x faster throughput with tighter
standard deviation than ALB under identical conditions.

### 4.3 Google Cloud Load Balancer

| Metric                | Value                                                       |
|-----------------------|-------------------------------------------------------------|
| Architecture          | True anycast global load balancer                           |
| Single IP             | One IP serves all regions via anycast                       |
| Auto-scaling          | Fully managed, no pre-warming needed                       |
| Backend types         | Instance groups, NEGs, serverless                           |
| SSL policies          | Configurable min TLS version and cipher suites              |

**GCP's architectural advantage**: Google's load balancer is the only major cloud offering
a true anycast-based global HTTP(S) load balancer. Traffic enters Google's network at the
nearest edge POP (100+ locations) and traverses Google's private backbone to the nearest
healthy backend. This eliminates multiple public internet hops and typically reduces
latency by 20-40% compared to DNS-based global load balancing.

### 4.4 Cloudflare Load Balancer

| Metric                | Value                                                       |
|-----------------------|-------------------------------------------------------------|
| Network               | 300+ data centers worldwide                                |
| Proximity             | Within ~50 ms of ~95% of internet-connected population     |
| Routing methods       | Latency-based, geo, GPS coordinates, random, hash          |
| Argo Smart Routing    | Improves performance by up to 30% via optimized paths      |
| Health checks         | Every 60 seconds from multiple regions                     |
| Pricing               | From $5/month per origin (basic); enterprise for advanced   |

**Latency consideration**: Cloud-based load balancers are not colocated with origin
servers. The request path is: client -> nearest Cloudflare POP (low latency) -> public
internet -> origin server (variable latency). For latency-critical applications, this
extra hop can add 5-50ms depending on origin location. Cloudflare mitigates this with
Argo Smart Routing, which finds the fastest path across their backbone network.

### 4.5 Cloud Load Balancer Comparison

```
Latency (lowest to highest):
  AWS NLB (L4, <5ms) < GCP Global LB (anycast) < AWS ALB (L7) < Cloudflare (edge proxy)

Global distribution:
  Cloudflare (300+ PoPs) > GCP (100+ edge) > AWS (30+ regions, needs Global Accelerator)

Ease of setup:
  Cloudflare (DNS change) > AWS ALB (console/IaC) > GCP (console/IaC) > AWS NLB

Cost for high traffic:
  AWS NLB < AWS ALB < GCP < Cloudflare (depends on plan tier)
```

---

## 5. Health Check Strategies and Failover Timing

### 5.1 Health Check Types

| Check Type        | What It Tests                | Overhead    | Accuracy    |
|-------------------|------------------------------|-------------|-------------|
| TCP SYN           | Port open                    | Minimal     | Low -- port can be open but app broken |
| HTTP GET /health  | App responds with 200        | Low         | Medium      |
| HTTP GET /ready   | App ready to serve traffic   | Low-Medium  | High        |
| Deep health       | DB connection, cache, deps   | Medium-High | Highest     |
| gRPC health       | gRPC health check protocol   | Low         | High        |

**Best practice**: Use protocol-matched health checks. Running a TCP health check
against an HTTP service gives false positives -- the TCP handshake succeeds even when
the HTTP service returns 503 errors. Always check at the application protocol level.

### 5.2 Timing Configuration

| Parameter                  | Recommended Value | Why                              |
|----------------------------|-------------------|----------------------------------|
| Check interval             | 5-10 seconds      | Balances responsiveness vs load  |
| Timeout per check          | 5-10 seconds      | Must be < interval               |
| Unhealthy threshold        | 2-3 consecutive failures | Avoids false positives from network jitter |
| Healthy threshold          | 2-3 consecutive successes | Prevents flapping             |
| Critical service interval  | 30-60 seconds     | For non-latency-critical paths   |

**Failover timing calculation**:
```
Time to detect failure = check_interval x unhealthy_threshold
Time to restore        = check_interval x healthy_threshold

Example (default AWS ALB):
  Detect: 30s interval x 2 failures = 60 seconds
  Restore: 30s interval x 5 successes = 150 seconds

Example (aggressive, latency-sensitive):
  Detect: 5s interval x 2 failures = 10 seconds
  Restore: 5s interval x 2 successes = 10 seconds
```

**Warning**: Setting intervals below 2 seconds causes health check storms at scale.
With 100 backends and 1-second intervals, each backend receives 100 health check
requests per second from the load balancer alone. With multiple load balancers, this
multiplies further.

### 5.3 Health Check Endpoint Design

A well-designed health endpoint returns quickly and tests meaningful dependencies:

```json
// GET /health -- returns in < 50ms
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up", "latency_ms": 2 },
    "cache": { "status": "up", "latency_ms": 1 },
    "disk": { "status": "up", "free_gb": 42 }
  },
  "uptime_seconds": 86400
}
```

**Critical rule**: Health check endpoints must NOT perform expensive operations. A health
check that runs a database query under load can itself cause the failure it is trying to
detect. Use connection pool validation or ping commands, not full queries.

### 5.4 Graceful Health Check Failure

Before shutting down, a server should:
1. Start returning 503 from the health endpoint
2. Wait for the load balancer to detect the failure (interval x unhealthy_threshold)
3. Wait for in-flight requests to complete (connection draining timeout)
4. Then shut down

Skipping step 2 causes dropped requests -- the load balancer still has the server in
its pool and continues routing traffic to a shutting-down process.

---

## 6. Session Affinity and Sticky Sessions

### 6.1 Mechanisms

| Method              | Implementation         | Survives NAT | Server Removal Impact |
|---------------------|------------------------|-------------|----------------------|
| Source IP hash       | L4 or L7               | No          | All sessions from that IP disrupted |
| Cookie insertion     | L7 only                | Yes         | Only that server's sessions |
| URL parameter        | L7 only                | Yes         | Only that server's sessions |
| Header-based         | L7 only                | Yes         | Only that server's sessions |
| TLS session ID       | L7 only                | Yes         | Only new sessions     |

### 6.2 Performance Cost

Sticky sessions impose several measurable costs:

**Uneven load distribution**: In a cluster of 10 servers, sticky sessions can cause
load variance of 3-5x between the most- and least-loaded servers. A server accumulating
many long-lived sessions becomes a hotspot while others sit idle.

**Scaling impediment**: When auto-scaling adds a new server, existing sticky sessions
remain on old servers. The new server receives only new sessions, which may be a small
fraction of total traffic. Result: the overloaded servers that triggered the scale-out
remain overloaded; the new server is underutilized.

**Failover disruption**: When a server with sticky sessions fails or is removed, all
sessions on that server lose their state. With 1,000 sessions per server, a single
server removal disrupts 1,000 users simultaneously.

**Cache efficiency tradeoff**: Sticky sessions improve RAM cache hit rates because the
same user's requests always hit the same server's cache. This can improve response times
by 10-30% for cache-heavy applications. However, this benefit must be weighed against
the scaling and availability costs.

### 6.3 Modern Alternatives

| Approach              | Latency Impact          | Scaling Impact         |
|-----------------------|------------------------|------------------------|
| Sticky sessions       | +0ms (same server)     | Poor -- prevents even distribution |
| Redis session store   | +1-3ms per request     | Excellent -- any server can serve any request |
| JWT stateless tokens  | +0.1-0.5ms (decode)    | Excellent -- no server-side state |
| Client-side state     | +0ms                   | Excellent -- no server-side state |

**Recommendation**: Use externalized session stores (Redis, Memcached) or stateless
tokens (JWT) instead of sticky sessions. The 1-3ms latency penalty for Redis is far less
costly than the scaling and availability problems caused by sticky sessions. Redis
Cluster can serve 100,000+ session lookups per second per node with sub-millisecond
p99 latency.

---

## 7. Connection Draining and Graceful Shutdown

### 7.1 How Connection Draining Works

When a backend is marked for removal:
1. Load balancer stops sending **new** requests to the backend
2. **Existing** in-flight requests are allowed to complete
3. After the drain timeout expires, remaining connections are forcefully closed
4. Backend is removed from the pool

### 7.2 Timeout Configuration

| Service Type              | Recommended Drain Timeout | Rationale                    |
|---------------------------|---------------------------|------------------------------|
| Fast APIs (< 1s response) | 5-15 seconds              | 5s covers 99.9th percentile |
| Standard web apps         | 30-60 seconds             | Covers slow pages, uploads   |
| WebSocket/streaming       | 300-3600 seconds          | Long-lived connections       |
| Database connections       | 60-120 seconds            | Covers in-flight transactions|

**Platform defaults**:
- AWS Classic LB: 300 seconds (configurable 1-3600s)
- AWS ALB/NLB: 300 seconds deregistration delay
- Google Cloud: 0-3600 seconds (must be explicitly enabled)
- Kubernetes: `terminationGracePeriodSeconds` default 30 seconds

### 7.3 Implementation Pattern

```
Application receives SIGTERM
    |
    v
Stop accepting new connections
Set health check endpoint to return 503
    |
    v
Wait for LB to detect unhealthy (interval x threshold = 10-60s)
    |
    v
Wait for in-flight requests to complete (up to drain timeout)
    |
    v
Close database connections, flush buffers
    |
    v
Exit process
```

**Critical coordination**: The application's graceful shutdown timeout must be LONGER
than the load balancer's health check detection time plus the drain timeout. If the
application exits before the load balancer removes it, clients see connection resets.

**AWS ECS specifics**: ECS sends SIGTERM to the container, then waits for the
`stopTimeout` (default 30s) before sending SIGKILL. The deregistration delay must
complete within this window. Set `stopTimeout >= deregistration_delay + 10s` as a safety
margin.

### 7.4 Zero-Downtime Deployment Checklist

1. New instances register and pass health checks (healthy threshold met)
2. Old instances begin draining (health check returns 503)
3. Load balancer detects old instances as unhealthy (unhealthy threshold met)
4. In-flight requests on old instances complete (drain timeout)
5. Old instances shut down
6. Total deployment time: healthy_threshold + unhealthy_threshold + drain_timeout

---

## 8. Common Bottlenecks

### 8.1 Uneven Distribution

**Symptom**: Some backends at 90% CPU while others sit at 20%.

**Causes**:
- Round robin with heterogeneous servers
- Sticky sessions accumulating on specific servers
- Consistent hashing with too few virtual nodes (< 100 per server)
- Hot keys in hash-based routing (one user generating 50% of traffic)

**Measurement**: Standard deviation of request counts across backends. Healthy: < 15%
of mean. Problematic: > 30% of mean.

**Fix**: Switch to least connections or weighted least connections. For hash-based
routing, increase virtual nodes to 150+ per server.

### 8.2 Thundering Herd

**Symptom**: Server comes back online and is immediately overwhelmed, fails health
check, is removed, recovers, repeat.

**Mechanism**: When a server recovers, the load balancer routes a burst of queued or
new requests to it simultaneously. The server, not yet warmed up (cold caches, JIT not
compiled, connection pools empty), cannot handle the burst and fails again.

**Real-world example**: In a documented AWS ALB case, the controller deregistered all
targets from pods failing readiness probes, then reintroduced them. Each pod was
immediately crushed by thousands of queued requests, failed the readiness probe again,
and was deregistered -- creating an infinite crash loop.

**Mitigation**:
- **Slow start**: HAProxy's `slowstart 60s` ramps traffic to a recovering server over
  60 seconds instead of sending full load immediately
- **Jitter**: Add randomized delays (50-500ms) to health check intervals to prevent
  synchronized checks from multiple LB instances
- **Request queuing**: Limit the rate of new connections to a recovering server
- **Warm-up**: Pre-populate caches and connection pools before marking healthy

### 8.3 Health Check Storms

**Symptom**: Backend servers spending significant CPU on health check responses.

**Scale calculation**:
```
Health checks per second = (num_LB_instances x num_backends) / check_interval

Example: 5 LB instances, 200 backends, 2-second interval
= (5 x 200) / 2 = 500 health checks per second

With deep health checks querying database:
= 500 database queries/second JUST for health checks
```

**Mitigation**:
- Use lightweight health endpoints (return cached status, not live queries)
- Stagger check intervals across LB instances (jitter)
- Use passive health checking (track real request failures) supplemented by
  infrequent active checks (every 30-60 seconds)

### 8.4 TLS Termination Overhead

**CPU cost**: TLS handshakes are CPU-intensive. A single HAProxy core can be fully
saturated by TLS handshake processing alone. However, established connections with
session resumption use minimal CPU -- less than 1% of CPU load and less than 2% of
network overhead according to Google's production data (istlsfastyet.com).

**Optimization strategies**:
- Enable TLS session resumption (reduces handshake from 2-RTT to 1-RTT)
- Use TLS 1.3 (mandatory 1-RTT handshake, 0-RTT for resumed sessions)
- Prefer ECDSA certificates over RSA (3-10x faster signature operations)
- Use CHACHA20-POLY1305 on non-AES-NI hardware (ARM, older x86)
- Enable OCSP stapling (eliminates client-side OCSP lookup, saves 100-300ms)
- Keep-alive connections amortize handshake cost across many requests

**Quantified impact**: A new TLS 1.2 RSA-2048 handshake costs ~1ms of CPU time on
modern hardware. TLS 1.3 with ECDSA-P256 costs ~0.1ms. With keepalive connections
averaging 100 requests each, the per-request overhead drops to 1-10 microseconds.

### 8.5 Connection Exhaustion

**Symptom**: Load balancer stops accepting new connections; existing connections work.

**Cause**: Ephemeral port exhaustion on the load balancer. Each connection to a backend
uses a source port. Default ephemeral port range (32768-60999) provides ~28,000 ports.
With high connection rates and slow backend responses, ports are consumed faster than
they are recycled.

**Fix**:
- Enable connection reuse (`http-reuse always` in HAProxy)
- Expand ephemeral port range: `sysctl net.ipv4.ip_local_port_range="1024 65535"`
- Reduce TIME_WAIT duration: `sysctl net.ipv4.tcp_tw_reuse=1`
- Use multiple backend IPs to multiply available port space

---

## 9. Anti-Patterns

### 9.1 Sticky Sessions Preventing Horizontal Scaling

**Pattern**: Application stores session state in local memory. Sticky sessions added
to "solve" the problem. Auto-scaling adds servers but existing sessions stay pinned
to overloaded servers.

**Impact**: 60-70% of auto-scaling events fail to relieve load because new capacity
receives only new sessions, which may be < 10% of total traffic.

**Fix**: Externalize session state to Redis/Memcached. Migration cost: typically 2-5
days of engineering effort. Payoff: true horizontal scalability, simplified
deployments, elimination of session loss during server failures.

### 9.2 No Health Checks (Blind Load Balancing)

**Pattern**: Load balancer sends traffic to all configured backends without checking
if they are alive.

**Impact**: Failed backends receive their full share of traffic. With 5 backends and
1 failed, 20% of all requests fail. Mean time to detection depends entirely on
monitoring alerting, which may be minutes to hours.

**Fix**: Enable active health checks at the application protocol level. TCP checks
are better than nothing but miss application-level failures. HTTP checks to a
dedicated /health endpoint catch the most failure modes.

### 9.3 Single Load Balancer (SPOF)

**Pattern**: One load balancer instance in front of a redundant backend fleet.

**Impact**: The load balancer becomes the single point of failure. When it fails,
100% of traffic is lost despite having healthy backends.

**Fix**:
- **Active-passive**: Two LB instances with VRRP failover (HAProxy + keepalived).
  Failover time: 1-5 seconds.
- **Active-active**: Multiple LB instances behind DNS round robin or anycast.
  No failover delay; capacity is always shared.
- **Cloud managed**: AWS ALB/NLB, GCP LB -- inherently redundant across AZs.
  The cloud provider manages redundancy transparently.

### 9.4 Ignoring Backend Capacity in Algorithm Selection

**Pattern**: Using round robin with servers of vastly different capacity (e.g., mixing
4-core and 32-core machines).

**Impact**: The 4-core machine receives the same traffic as the 32-core machine,
becomes overloaded, and causes 12-25% of requests to have elevated latency (the
fraction served by the underpowered server).

**Fix**: Use weighted round robin or weighted least connections. Assign weights
proportional to capacity (e.g., weight 1 for 4-core, weight 8 for 32-core).

### 9.5 Overly Aggressive Health Checks

**Pattern**: Health check interval set to 1 second with 1 failure threshold. Deep
health check queries database on every check.

**Impact**: Network jitter causes a single dropped health check packet, immediately
removing a healthy server. Server handles hundreds of health check queries per second,
consuming capacity that should serve production traffic. Flapping servers create
oscillating load patterns.

**Fix**: Set interval to 5-10 seconds, unhealthy threshold to 2-3, and use lightweight
health endpoints that test connectivity without executing heavy queries.

### 9.6 No Connection Draining During Deployments

**Pattern**: Server process is killed immediately during deployment. Load balancer
continues routing to the dead server until health checks detect the failure.

**Impact**: All in-flight requests on the terminated server receive connection reset
errors. With a 30-second health check interval and 2-failure threshold, new requests
continue being routed to the dead server for up to 60 seconds.

**Fix**: Implement graceful shutdown (SIGTERM handler), return 503 from health endpoint,
wait for LB detection, drain in-flight requests, then exit.

---

## 10. Before/After: Real-World Improvements

### 10.1 Round Robin to Least Connections (Heterogeneous Fleet)

```
Scenario: 12 backend servers, mix of c5.xlarge (4) and c5.4xlarge (8)
Traffic: 50,000 req/s, variable processing time (2ms-200ms)

BEFORE (Round Robin):
  p50 latency:  15 ms
  p95 latency:  180 ms
  p99 latency:  450 ms    <-- c5.xlarge servers saturated
  Error rate:   2.3%       <-- timeouts on overloaded servers

AFTER (Weighted Least Connections, weights 1:4):
  p50 latency:  12 ms     (20% improvement)
  p95 latency:  45 ms     (75% improvement)
  p99 latency:  85 ms     (81% improvement)
  Error rate:   0.1%      (95% reduction)
```

### 10.2 Single LB to Active-Active with Health Checks

```
Scenario: E-commerce platform, 2 million daily users
Single HAProxy instance, no health checks

BEFORE:
  Monthly downtime:     45 minutes (LB failures + backend failures)
  p99 during failures:  30+ seconds (requests to dead backends)
  Availability:         99.90%

AFTER (2 HAProxy + VRRP + HTTP health checks):
  Monthly downtime:     < 2 minutes
  p99 during failures:  200 ms (immediate failover)
  Availability:         99.995%
  Failover time:        < 3 seconds (VRRP) + 10 seconds (health check detection)
```

### 10.3 Sticky Sessions to Externalized State

```
Scenario: SaaS application, 500 concurrent users per server, 8 servers
Sticky sessions with in-memory session store

BEFORE:
  Scale-out effectiveness:  ~30% (new servers get only new sessions)
  Deployment error rate:    5% of users lose session on deploy
  Load variance:            3.5x between busiest and quietest server
  p99 latency:              320 ms

AFTER (Redis Cluster session store, least connections LB):
  Scale-out effectiveness:  ~95% (immediate load redistribution)
  Deployment error rate:    0% (sessions survive server removal)
  Load variance:            1.2x (near-perfect distribution)
  p99 latency:              180 ms (+2ms Redis overhead, -140ms from even distribution)
```

### 10.4 Pipedrive: Thundering Herd Fix

```
Scenario: Microservices with service mesh, periodic cache invalidation

BEFORE:
  Every hour, cache invalidation triggered thousands of simultaneous requests
  to a single upstream service through the service mesh.
  p99 latency spike: 40ms -> 1000ms (25x increase) every hour

AFTER (Request coalescing / singleflight pattern):
  Only one request sent to upstream per cache key; concurrent requesters
  share the Promise/Future.
  p99 latency: stable at 40ms, no hourly spikes
  Upstream load: reduced by 95% during invalidation windows
  Fix: ~10 lines of code
```

---

## 11. Decision Tree: Which Algorithm Should I Use?

```
START: What type of service are you load balancing?
  |
  +---> Caching layer (Redis, Memcached, CDN origin)?
  |       |
  |       YES --> Use CONSISTENT HASHING
  |               (preserves cache affinity, ~1/n redistribution on changes)
  |               Consider: ring size >= 150 virtual nodes per server
  |
  +---> Stateless API / web service?
  |       |
  |       +---> Are all backend servers identical hardware?
  |       |       |
  |       |       YES --> Are request processing times uniform?
  |       |       |         |
  |       |       |         YES --> Use ROUND ROBIN (simplest, lowest overhead)
  |       |       |         |
  |       |       |         NO  --> Use LEAST CONNECTIONS
  |       |       |                 (adapts to variable request durations)
  |       |       |
  |       |       NO  --> Use WEIGHTED LEAST CONNECTIONS
  |       |               (adapts to both capacity and request variation)
  |       |
  |       +---> Do you have multiple independent load balancers?
  |               |
  |               YES --> Use RANDOM TWO CHOICES (LEAST_CONN)
  |                       (avoids herd behavior from stale state)
  |               |
  |               NO  --> Use LEAST CONNECTIONS
  |
  +---> WebSocket / long-lived connection service?
  |       |
  |       YES --> Use LEAST CONNECTIONS
  |               (prevents new connections piling on servers with
  |                many idle long-lived connections)
  |
  +---> Canary / blue-green deployment?
  |       |
  |       YES --> Use WEIGHTED ROUND ROBIN
  |               (weight controls traffic split: 95/5, 90/10, etc.)
  |
  +---> Rate limiting / per-user routing?
          |
          YES --> Use CONSISTENT HASHING on user ID / API key
                  (same user always hits same backend for rate counting)
```

### Layer Selection Guide

```
Do you need content-based routing (URL path, headers, cookies)?
  |
  YES --> Use LAYER 7 (HTTP-aware load balancing)
  |         |
  |         +---> Need service mesh integration? --> ENVOY
  |         +---> Need HTTP/3 support?           --> NGINX
  |         +---> Need maximum HTTP throughput?  --> HAPROXY
  |         +---> Need auto-discovery?           --> TRAEFIK
  |
  NO  --> Do you need maximum throughput with minimum latency?
            |
            YES --> Use LAYER 4 (TCP/UDP)
            |         |
            |         +---> Cloud: AWS NLB, GCP Network LB
            |         +---> Self-hosted: IPVS, HAProxy (mode tcp)
            |
            NO  --> Use LAYER 7 (more features, acceptable overhead)
```

---

## 12. Configuration Quick Reference

### HAProxy: Weighted Least Connections with Health Checks

```haproxy
frontend http_front
    bind *:443 ssl crt /etc/ssl/certs/site.pem
    mode http
    option http-server-close
    default_backend app_servers

backend app_servers
    mode http
    balance leastconn
    option httpchk GET /health
    http-check expect status 200

    # Connection draining: 30s drain, 60s slow start
    default-server inter 5s fall 3 rise 2 slowstart 60s

    server app1 10.0.1.1:8080 weight 4 check maxconn 2000
    server app2 10.0.1.2:8080 weight 4 check maxconn 2000
    server app3 10.0.1.3:8080 weight 1 check maxconn 500   # canary
```

### NGINX: Upstream with Keepalive and Health Checks

```nginx
upstream app_backend {
    least_conn;

    server 10.0.1.1:8080 weight=4 max_fails=3 fail_timeout=10s;
    server 10.0.1.2:8080 weight=4 max_fails=3 fail_timeout=10s;
    server 10.0.1.3:8080 weight=1 max_fails=3 fail_timeout=10s;

    keepalive 64;           # connection pool to backends
    keepalive_time 1h;      # max connection lifetime
    keepalive_timeout 60s;  # idle timeout for pooled connections
}

server {
    listen 443 ssl http2;

    ssl_session_cache shared:SSL:10m;   # TLS session resumption
    ssl_session_timeout 1d;
    ssl_session_tickets off;            # forward secrecy

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # enable keepalive to upstream
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    location /health {
        access_log off;
        proxy_pass http://app_backend;
    }
}
```

### Envoy: Cluster with Power of Two Choices

```yaml
clusters:
  - name: app_cluster
    type: STRICT_DNS
    lb_policy: LEAST_REQUEST    # implements power of two choices
    load_assignment:
      cluster_name: app_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: app-service
                    port_value: 8080
    health_checks:
      - timeout: 5s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2
        http_health_check:
          path: /health
    circuit_breakers:
      thresholds:
        - max_connections: 1024
          max_pending_requests: 1024
          max_requests: 1024
    outlier_detection:
      consecutive_5xx: 5
      interval: 10s
      base_ejection_time: 30s
      max_ejection_percent: 50
```

### Kubernetes: Service with Session Affinity (when you must)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 1800  # 30-minute session timeout
```

---

## 13. Sources

- [HAProxy Exceeds 2 Million RPS on a Single ARM Instance](https://www.haproxy.com/blog/haproxy-forwards-over-2-million-http-requests-per-second-on-a-single-aws-arm-instance) -- HAProxy benchmark data: 2.08M RPS, 400us latency, 92 Gbps bandwidth
- [Benchmarking 5 Popular Load Balancers: Nginx, HAProxy, Envoy, Traefik, and ALB](https://www.loggly.com/blog/benchmarking-5-popular-load-balancers-nginx-haproxy-envoy-traefik-and-alb/) -- Loggly comparative benchmark of throughput and latency
- [HAProxy vs NGINX vs Envoy on VPS in 2025](https://onidel.com/blog/haproxy-nginx-envoy-benchmark-vps) -- Memory usage comparison: HAProxy 50MB, NGINX 80MB, Envoy 150MB
- [HAProxy vs NGINX Performance: A Comprehensive Analysis](https://last9.io/blog/haproxy-vs-nginx-performance/) -- HAProxy 10-15% advantage in raw connection handling
- [Test Driving Power of Two Random Choices Load Balancing](https://www.haproxy.com/blog/power-of-two-load-balancing) -- HAProxy P2C benchmarks under contention levels
- [NGINX and the Power of Two Choices Load-Balancing Algorithm](https://www.f5.com/company/blog/nginx/nginx-power-of-two-choices-load-balancing-algorithm) -- NGINX random two least_conn implementation
- [The Power of Two Choices in Randomized Load Balancing (Mitzenmacher)](https://www.eecs.harvard.edu/~michaelm/postscripts/mythesis.pdf) -- Original dissertation proving O(log log n) bound
- [Load Balancing Algorithms - Cloudflare](https://www.cloudflare.com/learning/performance/types-of-load-balancing-algorithms/) -- Algorithm overview and tradeoffs
- [Layer 4 vs Layer 7 Load Balancing](https://www.systemoverflow.com/learn/load-balancing/lb-algorithms/layer-4-vs-layer-7-load-balancing-algorithm-trade-offs) -- L4 vs L7 performance tradeoffs
- [ALB vs NLB: Which AWS Load Balancer Fits Your Needs](https://blog.cloudcraft.co/alb-vs-nlb-which-aws-load-balancer-fits-your-needs/) -- NLB 4x faster than ALB in benchmarks
- [Load Balancing Compared: Cloudflare vs AWS ELB vs Azure vs GCP](https://inventivehq.com/blog/cloudflare-load-balancing-vs-aws-alb-vs-azure-front-door-vs-google-cloud-load-balancing) -- Cloud LB comparison
- [Cloudflare Load Balancing Reference Architecture](https://developers.cloudflare.com/reference-architecture/architectures/load-balancing/) -- 300+ PoPs, ~50ms from 95% of internet population
- [Health Checks Overview - Google Cloud](https://docs.cloud.google.com/load-balancing/docs/health-check-concepts) -- GCP health check configuration
- [Load Balancer Health Check Best Practices - Oracle](https://docs.oracle.com/en-us/iaas/Content/Balance/Tasks/health_check_best_practices.htm) -- Health check timing recommendations
- [Is TLS Fast Yet?](https://istlsfastyet.com/) -- Google production data: TLS < 1% CPU load
- [HAProxy TLS/SSL Termination](https://www.haproxy.com/glossary/what-is-ssl-tls-termination) -- TLS CPU overhead details
- [Load Balancing, Affinity, Persistence, Sticky Sessions - HAProxy](https://www.haproxy.com/blog/load-balancing-affinity-persistence-sticky-sessions-what-you-need-to-know) -- Session affinity mechanisms and tradeoffs
- [Sticky Sessions Disrupts Pod Auto-Scaling in Kubernetes](https://medium.com/nerd-for-tech/how-session-stickiness-disrupts-pod-auto-scaling-in-kubernetes-17ece8e2ea4f) -- Sticky sessions and auto-scaling conflict
- [Enable Connection Draining - Google Cloud](https://cloud.google.com/load-balancing/docs/enabling-connection-draining) -- GCP drain timeout configuration
- [Optimize Load Balancer Connection Draining for Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-connection-draining.html) -- AWS ECS drain best practices
- [How to Reduce Latency Spikes: Singleflight Pattern - Pipedrive](https://medium.com/pipedrive-engineering/how-to-reduce-latency-spikes-a-trick-with-shared-upstream-requests-d43d3bac951c) -- P99 spike from 40ms to 1000ms, fixed with request coalescing
- [Thundering Herd Problem - Encore Blog](https://encore.dev/blog/thundering-herd-problem) -- Mitigation strategies: jitter, rate limiting, backoff
- [NGINX Performance Tuning - Codedamn](https://codedamn.com/news/backend/performance-tuning-benchmarking-optimization) -- NGINX 5200 RPS per worker with 8 workers
- [Tuning NGINX for Performance - F5](https://www.f5.com/company/blog/nginx/tuning-nginx) -- worker_connections, keepalive tuning
- [Envoy Load Balancer Documentation](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers) -- Consistent hashing ring size, algorithm details
- [Battle of the Proxies: Envoy vs Traefik vs HAProxy in 2025](https://aws.plainenglish.io/battle-of-the-proxies-envoy-vs-traefik-vs-haproxy-in-2025-8f0bed6c7a66) -- Envoy sub-10ms under churn vs HAProxy 25s spikes
- [Predictive Load Balancing: Round Robin, Weighted Round Robin, and ML](https://www.mdpi.com/2673-4591/122/1/26) -- ML-based approaches vs traditional algorithms
