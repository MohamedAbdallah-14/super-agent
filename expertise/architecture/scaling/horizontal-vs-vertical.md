# Horizontal vs Vertical Scaling — Architecture Expertise Module

> Vertical scaling (scale up) adds more power to existing machines. Horizontal scaling (scale out) adds more machines. Vertical is simpler and should be your first approach — modern servers handle enormous loads. Horizontal is necessary when vertical limits are reached or when redundancy/availability requires multiple instances.

> **Category:** Scaling
> **Complexity:** Moderate
> **Applies when:** Systems experiencing or anticipating growth in traffic, data volume, or compute requirements

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [When to Use Vertical Scaling First](#when-to-use-vertical-scaling-first)
3. [When to Use Horizontal Scaling](#when-to-use-horizontal-scaling)
4. [When NOT to Scale Horizontally Prematurely](#when-not-to-scale-horizontally-prematurely)
5. [How It Works](#how-it-works)
6. [Trade-Offs Matrix](#trade-offs-matrix)
7. [Evolution Path](#evolution-path)
8. [Failure Modes](#failure-modes)
9. [Technology Landscape](#technology-landscape)
10. [Decision Tree](#decision-tree)
11. [Implementation Sketch](#implementation-sketch)
12. [Cross-References](#cross-references)

---

## What This Is

Scaling increases a system's capacity to handle growing demand. There are two fundamental approaches, plus an automation layer that orchestrates them dynamically.

### Vertical Scaling (Scale Up)

Make an existing machine more powerful. Upgrade CPU, add RAM, switch to faster NVMe storage, or move to a larger cloud instance type. Application code does not change.

**What you increase:** CPU cores/clock speed (4 to 64 cores), RAM (16 GB to 256+ GB), disk I/O (HDD to NVMe), network bandwidth (1 to 25 Gbps).

**What stays the same:** Application architecture, deployment topology (one server), operational complexity (one machine to monitor, back up, patch).

### Horizontal Scaling (Scale Out)

Add more machines and distribute work across them. Run N identical instances behind a load balancer, each handling a fraction of total traffic.

**What you increase:** Instance count (2, 5, 20, 200), geographic distribution (multi-region), fault tolerance (N-1 instances can fail).

**What changes:** Need a load balancer, application must be stateless, deployments become rolling/blue-green, monitoring spans multiple machines, data consistency becomes a distributed systems problem.

### Auto-Scaling (Dynamic Horizontal)

Automated horizontal scaling driven by real-time metrics. Adds instances when demand rises, removes them when demand falls.

**Common triggers:** CPU utilization (>70% for 3 min), request count per instance (>1000 req/min), queue depth (>500 pending messages), scheduled patterns (scale up at 8am).

**Scaling policies:**
- **Target tracking:** Maintain a metric at a specified value (e.g., keep average CPU at 60%)
- **Step scaling:** Add/remove fixed amounts at threshold breakpoints
- **Scheduled scaling:** Pre-configured capacity changes for predictable patterns
- **Event-driven:** KEDA-style scaling based on external event sources (queues, streams)

---

## When to Use Vertical Scaling First

**Vertical scaling should be your default starting point.** It is simpler, cheaper to operate, and eliminates entire categories of distributed-systems problems.

### The Case for Vertical First

1. **No distributed state problems.** One server means no cache coherence issues, no split-brain scenarios, no distributed transactions. Application logic stays straightforward.

2. **No deployment complexity.** One deployment target. No rolling updates, no canary deployments, no connection draining.

3. **No network overhead.** Inter-service communication happens in-process (nanoseconds, not milliseconds).

4. **Modern servers are enormous.** Cloud instances with 256 GB RAM, 96+ vCPUs, and NVMe storage are available. AWS offers up to 24 TB of RAM (u-24tb1.metal). A single well-optimized server handles more traffic than most applications will ever see.

5. **Databases scale vertically surprisingly well.** PostgreSQL on a server with 256 GB RAM, NVMe storage, and 64 cores handles millions of rows, thousands of concurrent connections, and complex analytical queries. With proper indexing and query optimization, a single PostgreSQL instance serves most applications for years.

### Real-World Example: Stack Overflow

Stack Overflow is the canonical example of vertical scaling success. One of the highest-traffic sites on the internet deliberately chose a vertical scaling strategy:

- **Scale:** 1.3+ billion page views per month across the Stack Exchange network
- **Infrastructure:** 25 servers total (not per service -- 25 total), including just 9 web servers
- **Database:** SQL Server instances with 384 GB RAM and 2 TB SSD storage
- **Performance:** Sub-50ms response times on most pages
- **Team:** A remarkably small infrastructure team maintains the entire platform
- **Uptime:** 99.9% availability serving millions of developers daily

As Nick Craver (Stack Overflow's architecture lead) explained, their philosophy is "scale up, not out." They invest in powerful machines and obsess over performance optimization: query tuning, aggressive caching (Redis), and minimizing allocations in hot paths.

**The lesson:** Before reaching for horizontal scaling, ask whether better hardware, query optimization, caching, and code profiling would solve the problem more simply. Stack Overflow serves a substantial fraction of the world's developers from fewer servers than most startups deploy for their MVP.

### When Vertical Works Best

- **Relational databases** with complex joins and transactions
- **Monolithic applications** where all components share memory
- **Batch processing** that benefits from more cores and RAM
- **Development and staging environments** (always keep these simple)
- **Early-stage products** where engineering time is better spent on features
- **Stateful workloads** like in-memory caches, search indexes, ML model serving
- **Applications with predictable, bounded growth** (internal tools, B2B SaaS)

### Practical Vertical Scaling Limits

| Resource    | Practical Cloud Limit        | On-Premise Limit          |
|-------------|------------------------------|---------------------------|
| RAM         | 24 TB (AWS u-24tb1.metal)    | 6-12 TB (8-socket server) |
| CPU Cores   | 448 vCPUs (AWS u7i.metal)    | 224+ cores (AMD EPYC)     |
| Storage I/O | ~3 GB/s (NVMe instance SSD)  | ~12 GB/s (NVMe RAID)      |
| Network     | 200 Gbps (AWS ENA Express)   | 100-400 Gbps (InfiniBand) |

For most applications, you hit **operational constraints** (single point of failure, maintenance windows, cost-per-hour of massive instances) before hardware limits.

---

## When to Use Horizontal Scaling

Horizontal scaling becomes necessary -- not merely desirable -- under specific conditions. Do not adopt it preemptively.

### Condition 1: Redundancy and High Availability

A single server is a single point of failure. If your system must survive hardware failures without downtime, you need multiple instances.

- SLAs requiring 99.99%+ uptime (< 52 minutes downtime/year)
- Regulatory requirements for geographic redundancy (GDPR, financial services DR)
- Customer contracts that penalize downtime financially

### Condition 2: Vertical Limits Reached

When your largest available server cannot handle the load -- and you have already optimized queries, added caching, and profiled hot paths -- horizontal scaling is next.

**Signs:** CPU consistently >85% on largest instance, memory exceeds available RAM despite tuning, disk I/O bottlenecked on NVMe, network bandwidth fully utilized.

### Condition 3: Stateless, Embarrassingly Parallel Workloads

Some workloads naturally suit horizontal scaling because they require no shared state:

- **Stateless API servers** reading from a shared database
- **Static asset serving** (CDN, image serving)
- **Batch processing** with independent work items (map-reduce)
- **Stateless microservices** performing pure computation

### Real-World Examples of Justified Horizontal Scaling

**Web Tier:** Nearly every high-traffic site horizontally scales its web tier. Web servers are stateless by design. Adding more behind a load balancer is the simplest, least risky form of horizontal scaling.

**Airbnb's Evolution:** Started as a monolithic Rails app on a single server. Vertically scaled with larger EC2 instances. When vertical could no longer sustain peak loads (holidays, major events), horizontally scaled web and search tiers, eventually moving to SOA. They did not start with microservices -- they earned horizontal scaling incrementally.

**Criteo's Ad Platform:** Horizontally scales across thousands of servers globally for real-time ad bidding. Computing bid prices for millions of requests per second is embarrassingly parallel and naturally suited to horizontal distribution.

**CDN and Edge Computing:** Cloudflare, Akamai, and CloudFront operate thousands of edge nodes worldwide. Content delivery is inherently horizontal -- same content replicated close to users, each node operating independently.

---

## When NOT to Scale Horizontally Prematurely

**This section is intentionally as long as the "when to use horizontal" section because premature horizontal scaling is one of the most common and costly architectural mistakes.**

### The Cost of Premature Horizontal Scaling

Every additional instance introduces:

1. **Distributed State Management.** If your app stores state in memory (sessions, caches, WebSocket connections), horizontal scaling forces externalization to Redis, Memcached, or a database -- each with its own failure modes and operational overhead.

2. **Cache Consistency.** One server = always-consistent in-process cache. N servers forces a choice: no caching (high DB load), divergent local caches (stale data), or distributed cache (added latency, new failure mode, cache invalidation complexity).

3. **Deployment Complexity.** One server = `scp` or `git pull`. N servers requires orchestration: rolling updates, health checks, connection draining, rollback procedures, CI/CD pipelines, container registries.

4. **Debugging Difficulty.** Which of N servers handled the failing request? You need centralized logging (ELK, Datadog), distributed tracing (Jaeger, Zipkin), and correlation IDs. Trivial single-server bugs become intermittent, hard-to-trace cluster issues.

5. **Network Latency.** In-process calls take nanoseconds. Network calls between services take milliseconds. Ten network calls per user request adds 10-100ms of latency that did not exist in the monolith.

6. **Operational Overhead.** More servers = more patching, monitoring alerts, disk-full warnings, certificate renewals, security surface area. A team of 5 engineers easily spends more time maintaining infrastructure than building features.

### Real-World Premature Scaling Mistakes

**The Startup That Built for Scale It Never Reached:** A startup with 1,000 users deploys 15 microservices across Kubernetes with service mesh, distributed tracing, and event-driven architecture. Engineering velocity drops to a crawl -- 60% of time on infrastructure. The product never reaches scale to justify the architecture. The startup fails not because the architecture was wrong at scale, but because they never reached scale due to premature complexity.

**Microservices Before Product-Market Fit:** As Sam Newman (author of "Building Microservices") has stated, diving headfirst into microservices from day one is usually a mistake. Microservices shift complexity from code to infrastructure. Instead of one codebase, you have dozens -- each with its own deployments, monitoring, database migrations, authentication logic, and network failure modes.

**The Modular Monolith Alternative:** Start with a modular monolith with clear internal boundaries. When specific modules need independent scaling (because you have *measured* the bottleneck), extract those into services. This earns horizontal scaling incrementally, driven by evidence, not speculation.

### Questions to Ask Before Scaling Horizontally

- [ ] Profiled the application and found the actual bottleneck?
- [ ] Optimized database queries (missing indexes, N+1 queries, unnecessary joins)?
- [ ] Added caching at the right layer (application, CDN, database query cache)?
- [ ] Upgraded to a larger instance type (vertical scaling)?
- [ ] Considered read replicas for read-heavy workloads?
- [ ] Evaluated whether load is temporary (campaign, launch) and could use scheduled scaling?
- [ ] Confirmed the team has operational maturity to run distributed systems?

If the answer to any is "no," address those first. Horizontal scaling should be the last resort, not the first instinct.

---

## How It Works

### Load Balancing

| Algorithm            | How It Works                                     | Best For                          |
|----------------------|--------------------------------------------------|-----------------------------------|
| Round-Robin          | Requests distributed sequentially across servers | Equal-capacity servers, stateless |
| Weighted Round-Robin | Higher-capacity servers get more requests         | Mixed instance sizes              |
| Least Connections    | Route to server with fewest active connections    | Long-lived connections, WebSocket |
| IP Hash              | Client IP determines server (sticky by default)   | Session affinity without cookies  |
| Least Response Time  | Route to fastest-responding server                | Heterogeneous backends            |
| Random               | Random server selection                           | Simple, surprisingly effective    |

**Layer 4 vs Layer 7:**
- **Layer 4 (TCP/UDP):** Fast, operates on IP/port. Cannot inspect HTTP headers or route by URL. Used for raw throughput (NLB, HAProxy TCP mode).
- **Layer 7 (HTTP/HTTPS):** Inspects request content. Routes by URL, header, cookie. SSL termination. Used for application-aware routing (ALB, nginx, Envoy).

### Auto-Scaling Mechanisms

**AWS Auto Scaling Groups (ASG):** Launch templates define config. Scaling policies respond to CloudWatch metrics. Supports target tracking, step, and scheduled scaling. Predictive scaling uses ML to anticipate demand.

**GCP Managed Instance Groups (MIG):** Instance templates define VM config. Autoscaler adjusts size based on CPU, HTTP load balancing, or custom metrics. Regional MIGs for HA. Rolling update policies.

**Kubernetes HPA:** Scales Deployment replicas based on CPU/memory/custom metrics. Algorithm: `desiredReplicas = ceil(currentReplicas * (currentMetric / desiredMetric))`. Works identically across clouds.

**KEDA:** Extends HPA to scale on external event sources (60+ scalers: Kafka, RabbitMQ, PostgreSQL, Cron). Can scale to zero. Ideal for queue-driven workloads.

### Stateless Requirement

Horizontal scaling requires that any instance can handle any request. Externalize:
- User sessions (Redis, database, or encrypted cookies)
- File uploads (object storage: S3, GCS, Azure Blob)
- Caches (Redis, Memcached, or accept local-cache inconsistency)
- WebSocket connections (Redis pub/sub for cross-instance messaging)
- Scheduled jobs (distributed scheduler: SQS, Cloud Tasks, Celery)

### Session Management Strategies

| Strategy               | How It Works                             | Pros                         | Cons                            |
|------------------------|------------------------------------------|------------------------------|---------------------------------|
| Sticky Sessions        | LB routes user to same instance via cookie| Simple, no code changes     | Uneven load, failover loses session |
| External Session Store | Sessions in Redis/DB                      | Any instance serves any user| Added latency, new dependency   |
| Encrypted Cookies      | Session data in signed/encrypted cookies  | Truly stateless, no store   | Size limit (~4KB), bandwidth    |
| JWT Tokens             | Signed tokens carry claims                | Stateless verification      | Cannot revoke without blacklist |

**Recommendation:** Use encrypted cookies or JWTs for authentication, with external Redis for server-side session data exceeding cookie limits.

### Database Scaling Strategies

**Read Replicas (Horizontal Read Scaling):** Primary handles writes; replicas handle reads. Replication lag means eventual consistency. Works well for read-heavy workloads (>80% reads). PostgreSQL streaming replication, AWS RDS Read Replicas.

**Connection Pooling:** PgBouncer/pgpool-II (PostgreSQL), ProxySQL (MySQL). Reduces connection overhead. Often the first step before adding replicas.

**Sharding (Horizontal Write Scaling):** Partition data across multiple DB instances by shard key. Massive complexity: cross-shard queries, rebalancing, key selection. Use only when vertical + read replicas are insufficient. Consider Vitess (MySQL), Citus (PostgreSQL), CockroachDB.

**Caching Layer:** Redis/Memcached in front of DB. Cache-aside pattern. Reduces DB load 80-95% for read-heavy workloads. Cache invalidation is critical.

---

## Trade-Offs Matrix

| Dimension              | Vertical Scaling                       | Horizontal Scaling                      |
|------------------------|----------------------------------------|-----------------------------------------|
| **Complexity**         | Low -- single server, no distribution  | High -- LBs, state mgmt, distributed debugging |
| **Cost Model**         | Higher per-unit, simpler billing       | Lower per-unit, higher operational cost |
| **Availability**       | Single point of failure                | Redundant -- survives instance failures |
| **Scaling Ceiling**    | Hardware max of single machine         | Theoretically unlimited                 |
| **Scaling Speed**      | Minutes to hours (resize, reboot)      | Seconds to minutes (add instances)      |
| **Data Consistency**   | Strong -- single source of truth       | Eventual -- requires coordination       |
| **Downtime on Scale**  | Usually requires restart/migration     | Zero-downtime scaling                   |
| **Debugging**          | Simple -- one machine, one log         | Complex -- distributed tracing needed   |
| **Team Size**          | Small (1-3 ops engineers)              | Larger (dedicated SRE/DevOps)           |
| **State Management**   | Trivial -- everything in-process       | Complex -- externalized state required  |
| **Latency**            | Lower -- no network hops               | Higher -- network calls between instances |
| **Geographic Reach**   | Single location                        | Multi-region possible                   |

---

## Evolution Path

Most successful systems follow a predictable evolution. Each step responds to measured need, not speculative planning.

### Stage 1: Single Server
```
[Client] --> [Web + App + DB on one server]
```
One machine runs everything. Appropriate for prototypes, internal tools, early-stage products. Cost: $50-500/month.

### Stage 2: Vertical Upgrade
Same architecture, more powerful hardware. Add caching. Appropriate for growing products up to millions of page views/month. Cost: $500-5,000/month.

### Stage 3: Separate Database
```
[Client] --> [Web + App Server] --> [Database Server]
```
Database gets its own server (or managed service). Independent vertical scaling of app and DB tiers. Cost: $1,000-10,000/month.

### Stage 4: Horizontal Web Tier
```
                         +--> [App Server 1] --+
[Client] --> [Load Bal.] +--> [App Server 2] --+--> [Database Server]
                         +--> [App Server 3] --+
```
Multiple app instances behind a load balancer. App must be stateless. DB remains single vertical instance. Cost: $5,000-30,000/month.

### Stage 5: Database Read Replicas
```
[Client] --> [LB] --> [App Servers] --> [Primary DB (writes)]
                                    --> [Read Replicas (reads)]
```
Primary handles writes; replicas handle reads. Eventual consistency for reads. Cost: $15,000-80,000/month.

### Stage 6: Caching and CDN
```
[Client] --> [CDN] --> [LB] --> [App Servers] --> [Cache (Redis)]
                                              --> [DB Primary + Replicas]
```
CDN serves static assets at edge. Redis reduces DB load 80-95%. Cost: $30,000-150,000/month.

### Stage 7: Service Decomposition (If Needed)
```
[Client] --> [CDN] --> [API Gateway] --> [Service A] --> [DB A]
                                     --> [Service B] --> [DB B]
                                     --> [Service C] --> [DB C + Cache]
```
Extract services only when specific components need independent scaling. Cost: $100,000+/month (infra + team).

**Key principle:** Move to the next stage only when you have evidence the current stage is insufficient.

---

## Failure Modes

### Vertical Scaling Failures

| Failure Mode              | Cause                                  | Mitigation                              |
|---------------------------|----------------------------------------|-----------------------------------------|
| Single point of failure   | Hardware failure, OS crash             | Regular backups, standby instance       |
| Scaling requires downtime | Instance resize needs reboot           | Maintenance windows, managed services   |
| Cost cliff                | Largest instances priced non-linearly  | Monitor cost/perf ratio; switch to horizontal |
| Resource contention       | Workloads compete for CPU/RAM          | Separate DB from app; isolate batch jobs|
| Vendor lock-in            | Reliance on provider's largest types   | Design for portability                  |

### Horizontal Scaling Failures

| Failure Mode              | Cause                                  | Mitigation                              |
|---------------------------|----------------------------------------|-----------------------------------------|
| Thundering herd           | New instances overwhelm backend        | Warm-up periods, gradual traffic shift  |
| Flapping (rapid up/down)  | Aggressive policies oscillate count    | Cooldown periods, predictive scaling    |
| Cold start latency        | Instances need init time               | Pre-warm runtime, image optimization    |
| Split brain               | Network partition causes divergence    | Consensus protocols, quorum decisions   |
| Cascading failure         | Failed instance overloads others       | Circuit breakers, bulkheads, backpressure|
| Session loss              | Sticky session server fails            | External session store, JWT auth        |
| Data inconsistency        | Caches/replicas serve stale data       | Cache invalidation strategy, versioning |
| Deployment inconsistency  | Rolling deploy = mixed versions        | Feature flags, backward-compatible APIs |
| Monitoring blind spots    | Errors spread across N instances       | Centralized logging, distributed tracing|
| Load balancer as SPOF     | LB itself fails                        | Redundant LBs, managed LB services     |

---

## Technology Landscape

### Load Balancers

| Technology       | Type     | Layer | Best For                               |
|------------------|----------|-------|----------------------------------------|
| **nginx**        | Software | 7     | Web server + reverse proxy, huge community |
| **HAProxy**      | Software | 4/7   | High-throughput TCP/HTTP LB            |
| **Envoy**        | Software | 7     | Service mesh sidecar, gRPC, K8s ingress|
| **AWS ALB**      | Managed  | 7     | AWS HTTP/HTTPS + WAF                   |
| **AWS NLB**      | Managed  | 4     | Ultra-low latency TCP/UDP              |
| **GCP Cloud LB** | Managed  | 4/7   | Global anycast, multi-region           |
| **Traefik**      | Software | 7     | Auto-discovery, Let's Encrypt, K8s     |

### Auto-Scaling Platforms

| Technology               | Platform   | Scales             | Key Feature                    |
|--------------------------|------------|--------------------|--------------------------------|
| **AWS ASG**              | AWS        | EC2 instances      | Predictive scaling, lifecycle hooks |
| **GCP MIG Autoscaler**   | GCP        | Compute Engine VMs | Regional MIGs, custom metrics  |
| **K8s HPA**              | Kubernetes | Pod replicas       | CPU/memory/custom metrics      |
| **K8s VPA**              | Kubernetes | Pod resources      | Right-sizes pods automatically |
| **Karpenter**            | AWS K8s    | Nodes              | Fast provisioning, bin-packing |
| **KEDA**                 | Kubernetes | Pods (event-driven)| 60+ scalers, scale-to-zero     |

### Container Orchestration

| Technology            | Complexity | Best For                                |
|-----------------------|------------|-----------------------------------------|
| **Docker Compose**    | Low        | Single-machine multi-container          |
| **Docker Swarm**      | Low-Medium | Simple multi-node scheduling            |
| **Kubernetes**        | High       | Large-scale, multi-service production   |
| **AWS ECS/Fargate**   | Medium     | AWS-native container orchestration      |
| **Google Cloud Run**  | Low        | Stateless containers, scale-to-zero     |

### Database Scaling Tools

| Technology         | Database   | What It Does                            |
|--------------------|------------|-----------------------------------------|
| **PgBouncer**      | PostgreSQL | Connection pooling                      |
| **Citus**          | PostgreSQL | Horizontal sharding as PG extension     |
| **Vitess**         | MySQL      | Horizontal sharding, connection pooling |
| **CockroachDB**    | --         | Distributed SQL (built-in sharding)     |
| **Redis Cluster**  | Redis      | Distributed in-memory cache/store       |
| **Amazon Aurora**  | MySQL/PG   | Auto-scaling storage, 15 read replicas  |

---

## Decision Tree

```
START: Is your system under load pressure?
  |
  +-- No --> Do not scale. Optimize code, add monitoring, revisit later.
  |
  +-- Yes --> Have you profiled to find the actual bottleneck?
        |
        +-- No --> Profile first. Use APM tools (Datadog, New Relic,
        |         pg_stat_statements). Do not scale blind.
        |
        +-- Yes --> Is the bottleneck CPU/RAM/I/O on a single server?
              |
              +-- Yes --> Can you upgrade to a larger instance?
              |     |
              |     +-- Yes --> Upgrade (vertical). Cost acceptable?
              |     |     +-- Yes --> Done. Monitor and revisit.
              |     |     +-- No --> Consider horizontal scaling.
              |     +-- No --> Vertical limits reached. Go horizontal.
              |
              +-- No --> Is the bottleneck the database?
                    |
                    +-- Yes --> Optimized queries and indexes?
                    |     +-- No --> Do that first.
                    |     +-- Yes --> Read-heavy (>80% reads)?
                    |           +-- Yes --> Add read replicas.
                    |           +-- No --> Add caching (Redis).
                    |                 Still bottlenecked? Consider sharding.
                    |
                    +-- No --> Network/latency for global users?
                          +-- Yes --> CDN, edge caching, multi-region.
                          +-- No --> Re-profile. Check for memory leaks,
                                blocking I/O, unoptimized algorithms.
```

### Horizontal Scaling Checklist

Before going horizontal, ensure:
1. **Application is stateless.** Sessions, caches, file storage externalized.
2. **Health checks implemented.** Load balancer detects unhealthy instances.
3. **Graceful shutdown implemented.** Instances drain connections before stopping.
4. **Centralized logging in place.** All instances log to a single system.
5. **Deployment automation exists.** CI/CD handles multi-instance rollout.
6. **Database handles connection count.** Use connection pooling (PgBouncer).
7. **Monitoring covers all instances.** Dashboards aggregate metrics across fleet.
8. **Team has operational maturity.** Someone can debug distributed systems at 3 AM.

---

## Implementation Sketch

### Vertical Scaling: PostgreSQL Optimization

Before adding hardware or instances, optimize what you have (10-100x improvement possible):

```sql
-- Find slow queries
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT calls, round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms,
       substring(query, 1, 100) AS query_preview
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- Find missing indexes
SELECT schemaname || '.' || relname AS table, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND n_live_tup > 10000 AND idx_scan < seq_scan
ORDER BY seq_tup_read DESC LIMIT 20;

-- Tune for 64 GB server (postgresql.conf)
-- shared_buffers = 16GB          (25% of RAM)
-- effective_cache_size = 48GB    (75% of RAM)
-- work_mem = 256MB               (per-operation sort/hash)
-- maintenance_work_mem = 2GB     (VACUUM, CREATE INDEX)
-- random_page_cost = 1.1         (SSD; default 4.0 is for HDD)
-- effective_io_concurrency = 200 (SSD)
```

### Horizontal Scaling: Stateless App with External Sessions

```python
# Flask: externalize sessions to Redis for horizontal scaling
from flask import Flask, session
from flask_session import Session
import redis

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = redis.Redis(host='redis-cluster.internal', port=6379)
app.config['PERMANENT_SESSION_LIFETIME'] = 3600
Session(app)

@app.route('/api/data')
def get_data():
    user_id = session.get('user_id')  # Works on ANY instance
    if not user_id:
        return {'error': 'Not authenticated'}, 401
    data = db.query("SELECT * FROM user_data WHERE user_id = %s", user_id)
    return {'data': data}
```

### Auto-Scaling: Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
```

### Load Balancer: nginx

```nginx
upstream web_app {
    least_conn;
    server app1.internal:8080 max_fails=3 fail_timeout=30s;
    server app2.internal:8080 max_fails=3 fail_timeout=30s;
    server app3.internal:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
server {
    listen 443 ssl http2;
    server_name app.example.com;
    location / {
        proxy_pass http://web_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_connect_timeout 5s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }
}
```

---

## Cross-References

- **stateless-design** -- The architectural pattern required for horizontal scaling; externalize all state from application instances.
- **database-scaling** -- Deep dive on read replicas, sharding, connection pooling, and distributed databases.
- **twelve-factor-app** -- Methodology codifying stateless processes, config via environment, and patterns that enable horizontal scaling.
- **serverless** -- The extreme end of horizontal scaling: cloud provider manages all scaling decisions, you provide only code.
- **microservices** -- Architectural style enabling independent horizontal scaling of components, but with significant distributed-systems complexity.

---

## Sources

- [Scaling Stack Overflow: Keeping it Vertical by Obsessing Over Performance (InfoQ)](https://www.infoq.com/presentations/stack-exchange/)
- [Stack Overflow Architecture (High Scalability)](https://highscalability.com/stack-overflow-architecture/)
- [StackOverflow Update: 560M Pageviews/Month, 25 Servers (High Scalability)](https://highscalability.com/stackoverflow-update-560m-pageviews-a-month-25-servers-and-i/)
- [Horizontal Scaling vs Vertical Scaling (DigitalOcean)](https://www.digitalocean.com/resources/articles/horizontal-scaling-vs-vertical-scaling)
- [Vertical Scaling vs Horizontal Scaling (CockroachDB)](https://www.cockroachlabs.com/blog/vertical-scaling-vs-horizontal-scaling/)
- [PostgreSQL Database Scaling Overview (mbobin)](https://mbobin.me/postgresql/2025/02/17/postgresql-database-scaling-a-short-overview.html)
- [Vertically Scaling PostgreSQL (pgDash)](https://pgdash.io/blog/scaling-postgres.html)
- [Kubernetes Autoscaling: HPA vs VPA vs Karpenter vs KEDA (DEV Community)](https://dev.to/mechcloud_academy/kubernetes-autoscaling-showdown-hpa-vs-vpa-vs-karpenter-vs-keda-9b1)
- [Auto-Scaling in the Cloud with AWS, Azure, and GCP (EaseCloud)](https://blog.easecloud.io/cloud-infrastructure/auto-scaling-with-aws-azure-and-gcp/)
- [The Hidden Cost of Microservices (DEV Community)](https://dev.to/gabrielle_eduarda_776996b/the-hidden-cost-of-microservices-when-complexity-kills-velocity-3mm3)
- [Scaling Challenges in Distributed Systems (Medium)](https://medium.com/@mukesh.ram/major-scaling-challenges-in-distributed-systems-how-to-avoid-them-a7d467c94351)
- [Scaling Stateful Systems (Medium)](https://medium.com/@vishipatil/scaling-stateful-systems-strategies-patterns-and-best-practices-bd0016435043)
- [Horizontal Pod Autoscaling (Kubernetes Docs)](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Effective Kubernetes Scaling Strategy (nOps)](https://www.nops.io/blog/building-an-effective-kubernetes-scaling-strategy-hpa-vpa-and-beyond/)
- [Cloud Auto Scaling Techniques (DigitalOcean)](https://www.digitalocean.com/community/tutorials/auto-scaling-techniques-guide)
