# Distributed Systems Fundamentals -- Architecture Expertise Module

> Distributed systems are systems where components on networked computers communicate
> by passing messages. They introduce fundamental challenges absent from single-process
> systems: partial failure, network unreliability, clock skew, and consensus difficulty.
> Understanding these fundamentals prevents the most expensive architectural mistakes --
> the kind that only surface under production load, during network partitions, or at
> 3 AM when your on-call engineer discovers two database primaries accepting writes.

> **Category:** Distributed
> **Complexity:** Expert
> **Applies when:** Any system spanning more than one process -- microservices, multi-region
> deployments, client-server applications, or systems using external services (databases,
> caches, message brokers, third-party APIs).

---

## What This Is

### You Are Probably Already Building a Distributed System

If your application talks to a database, you have a distributed system. If it calls an
external API, uses a cache, a message queue, or a CDN, you have a distributed system. A
single-server web app with PostgreSQL is a two-node distributed system. The network between
them is usually local, which makes failures rare but not impossible -- and when they happen,
developers are blindsided because they never designed for them.

### The Eight Fallacies of Distributed Computing

Peter Deutsch (Sun Microsystems, 1994) identified seven false assumptions; James Gosling
added the eighth. Decades later, they remain the most common source of distributed bugs.

**1. The Network Is Reliable.** Packets drop. Connections time out. During the February
2025 AWS eu-north-1 incident, a networking fault in Stockholm disrupted intra-region
traffic between availability zones while external connectivity appeared normal. EC2, S3,
Lambda, DynamoDB, and CloudWatch all degraded -- not because the services failed, but
because internal communication broke. *Every network call needs timeout, retry, and
failure-handling logic.*

**2. Latency Is Zero.** A function call takes nanoseconds; a network call takes
milliseconds -- six orders of magnitude. A page making 50 sequential 5ms service calls
accumulates 250ms of pure network time. *Batch operations, caching, and coarse-grained
APIs exist to combat this.*

**3. Bandwidth Is Infinite.** Unbounded traffic (full objects when only IDs are needed,
uncompressed payloads, full-dataset replication instead of deltas) increases packet loss
and tail latency system-wide. At scale, AWS cross-AZ/cross-region data transfer costs
become a significant line item.

**4. The Network Is Secure.** Every link is an attack surface. Distributed systems have
more links than monoliths, each requiring independent security. Zero-trust networking
exists because the "trusted internal network" assumption has been proven wrong repeatedly.

**5. Topology Doesn't Change.** In cloud environments, VMs are replaced, containers
rescheduled, load balancers rebalanced, IPs recycled. Hard-coded addresses and infinite
DNS TTLs break silently. *Service discovery and dynamic routing exist for this.*

**6. There Is One Administrator.** Modern systems span teams, organizations, and cloud
providers. Debugging requires coordinating across different on-call rotations, deployment
schedules, and monitoring systems. *Distributed tracing, centralized logging, and clear
service ownership are necessities.*

**7. Transport Cost Is Zero.** Serialization, TLS handshakes, connection management, and
infrastructure costs are all non-zero. JSON overhead invisible at low volume becomes a CPU
bottleneck under load. Binary formats (Protocol Buffers, Avro) exist because this is real.

**8. The Network Is Homogeneous.** Real networks span different vendors, protocol versions,
encodings, and byte orderings. Standard wire formats, versioned APIs, and explicit encoding
declarations address this.

### Partial Failure vs. Total Failure

In a single-process system, failure is total: running or not. In distributed systems,
failure is **partial**: some components fail while others continue. This is the defining
challenge:

- A request may have been received but not processed (server crashed after receipt).
- A request may have been processed but the response lost (client does not know to retry
  or not -- retry may duplicate; giving up may lose the operation).
- A slow node looks identical to a dead node from a timeout's perspective, but it is still
  processing, potentially conflicting with its replacement.
- Different observers see different states: A sees B as failed while C sees B as healthy.

### Fundamental Impossibility Results

Three results define the theoretical boundaries. Ignoring them leads to violated guarantees.

**FLP Impossibility (Fischer, Lynch, Paterson, 1985).** In an asynchronous system where
even one process might crash, no deterministic consensus algorithm can guarantee
termination. You cannot have safety (never wrong), liveness (always terminates), and fault
tolerance simultaneously in a purely asynchronous system. Practical systems work around FLP
with partial synchrony (timeouts), randomization, or failure detectors.

**CAP Theorem (Brewer 2000; Gilbert & Lynch 2002).** A distributed data store cannot
simultaneously provide Consistency (linearizability), Availability (every request gets a
non-error response), and Partition tolerance. Since partitions are inevitable, the choice
is CP (consistent but unavailable during partitions -- etcd, ZooKeeper, Spanner) or AP
(available but potentially stale -- Cassandra, DynamoDB eventual mode). Brewer clarified
in 2012: "the '2 of 3' formulation is misleading" -- during normal operation you can have
both C and A; the trade-off is only during partitions.

**Byzantine Fault Tolerance (Lamport, Shostak, Pease, 1982).** If nodes can behave
arbitrarily (lie, collude), consensus requires 3f+1 nodes to tolerate f faults -- more
than two-thirds must be honest. PBFT (Castro & Liskov, 1999) made this practical. BFT is
essential for blockchains (Solana, Stellar, Tendermint) but overkill for internal systems;
most use crash-fault tolerance (CFT), needing only 2f+1 nodes.

---

### Signals You Are Ignoring Distribution

If any of these are true, you are building a distributed system without treating it as one:

- No timeout on any network call (database, API, cache).
- No retry logic, or retries are infinite without backoff.
- You assume database transactions always succeed on the first attempt.
- No circuit breaker for downstream service calls.
- Multi-service operations with no partial failure handling.
- No health checks, no distributed tracing, no centralized logging.
- You deploy to "the cloud" but have not considered AZ failure.
- You use wall-clock time for ordering events across services.

---

## When to Avoid Distribution (Equally Important)

### Distribution Is Never Free

Every process boundary adds: network latency, partial failure modes, consistency
challenges, operational complexity, debugging difficulty, and infrastructure cost.

**The single-process advantage:** Shared memory (nanoseconds, not milliseconds). Total
failure (no split brain). Trivially atomic transactions. Stack traces showing the full
call chain. One artifact to deploy and rollback.

### Real Examples of Unnecessary Distribution

**Premature microservices:** A 5-engineer startup splits a CRUD app into 12 microservices
because "that's what Netflix does." Netflix needed it for 2,000+ engineers deploying
independently. The startup now spends more time debugging inter-service calls than
building features.

**Distributed cache for single-server apps:** Adding Redis for an app on one server
creates cache invalidation complexity, connection management, and a new failure mode. An
in-process LRU cache is faster and simpler.

**Event-driven architecture for synchronous workflows:** Replacing direct function calls
with a message queue between same-process components that need synchronous responses adds
latency, complexity, and a new dependency for zero benefit.

**CQRS for 100 users:** Separate read-optimized database synced via events from the write
database, for a workload a single PostgreSQL instance handles trivially. Now you maintain
two databases, an event pipeline, and stale read handling.

**The alternative:** A modular monolith -- single deployable, well-defined module
boundaries, enforced dependency rules, separate data ownership per module. Extract services
only when a module genuinely needs independent scaling or deployment.

---

## How It Works

### Network Models

| Model | Guarantee | Real-World Analog |
|-------|-----------|-------------------|
| **Reliable links** | Messages delivered exactly once, uncorrupted | TCP (approximation) |
| **Fair-loss links** | Messages may be lost/duplicated; persistent retransmission succeeds | UDP + application retransmit |
| **Arbitrary (Byzantine)** | Network can lose, duplicate, reorder, corrupt, or fabricate | Untrusted networks; TLS converts to authenticated fair-loss |

### Timing Models

| Model | Guarantee | Implication |
|-------|-----------|-------------|
| **Synchronous** | Known upper bounds on delay, processing, clock drift | Timeouts reliably detect failure. Unrealistic for most systems. |
| **Partially synchronous** | Eventually synchronous; bounds exist but are unknown | Most practical protocols (Raft, Paxos) assume this. |
| **Asynchronous** | No timing bounds at all | Cannot distinguish slow from dead. FLP applies. |

### Failure Models

| Model | Behavior | Tolerance Requirement | Used By |
|-------|----------|-----------------------|---------|
| **Crash-stop** | Correct or permanently stopped | Simple reasoning | Theoretical analysis |
| **Crash-recovery** | Can crash and restart with durable state | 2f+1 nodes for f faults | Raft, Paxos, ZAB |
| **Byzantine** | Arbitrary/malicious behavior | 3f+1 nodes for f faults | PBFT, Tendermint, blockchains |
| **Omission** | Fails to send/receive some messages | Between crash and Byzantine | Network issues, GC pauses |

### Ordering and Logical Clocks

**Happens-before (Lamport, 1978):** A -> B if: (1) same node, A before B in program order;
(2) A is a send, B is the corresponding receive; (3) transitivity. If neither A -> B nor
B -> A, the events are concurrent.

**Lamport timestamps:** Each node maintains a counter; increment on every event; attach to
sent messages; on receive, set counter to max(local, received) + 1. Provides total order
but does not capture concurrency -- if ts(A) < ts(B), A may or may not precede B.

```
Node A: [1]---[2]---send(msg,ts=2)------------------[5]---[6]
Node B:       [1]---[2]---receive(msg,ts=2)---[3]---send(reply,ts=3)
Node C:              [1]------------------------[2]---receive(reply,ts=3)---[4]
```

**Vector clocks (Fidge & Mattern, 1988):** Each node maintains a vector of counters (one
per node). Increment own entry on events; attach full vector to messages; element-wise max
on receipt. Captures concurrency precisely: V(A) < V(B) component-wise means A -> B; if
neither dominates, they are concurrent. Used by DynamoDB and Riak for conflict detection.

```
Node A: [1,0,0]---[2,0,0]---send(msg)----------→ receive [3,2,0]
Node B:        [0,1,0]---receive(msg) [2,2,0]---[2,3,0]
Node C:                                [0,0,1]  ← concurrent with both A and B
```

Vector clocks grow linearly with the number of nodes. For large clusters, interval tree
clocks or dotted version vectors provide bounded-size alternatives.

### Physical Clocks

**NTP:** Synchronizes to 1-50ms on LAN, 10-100ms over internet. Cannot guarantee error
bounds -- two NTP-synced servers may disagree on event ordering within the error margin.

**Google TrueTime:** Represents time as an interval [earliest, latest]. GPS receivers and
atomic clocks in every Google datacenter keep uncertainty under 1ms at p99. Spanner's
"commit wait" trades latency for correctness: after committing at timestamp T, wait for
the uncertainty interval to pass before reporting success.

**Hybrid Logical Clocks (HLC):** Combine physical time with logical counters. CockroachDB
uses HLC to achieve Spanner-like consistency without atomic clocks, relying on NTP with
clock skew detection and bounded staleness reads.

---

## Trade-Offs Matrix

| Dimension | Option A | Option B | Key Tension |
|-----------|----------|----------|-------------|
| Consistency vs. Availability | CP: correct data, may reject during partitions | AP: always responds, may return stale data | CAP forces this choice during partitions only |
| Latency vs. Consistency | Synchronous replication: higher latency, no data loss | Async replication: lower latency, risk of data loss | Cross-region sync adds 50-200ms RTT per replica |
| Throughput vs. Ordering | Total order broadcast: limited by leader | Partial/causal ordering: higher throughput | Partition data for independent parallel total orders |
| Fault tolerance vs. Cost | More replicas (2f+1) | Fewer replicas | f=1→3 nodes; f=2→5 nodes (67% more hardware, marginal gain) |
| Simplicity vs. Resilience | Single-region | Multi-region | Multi-region adds 50-200ms latency; worth it only for region-level DR |
| Autonomy vs. Coordination | Shared database: strong consistency | DB-per-service: loose coupling, saga complexity | Shared DB is a coupling and scaling bottleneck |
| Exactly-once vs. At-least-once | Distributed transactions (higher latency) | Idempotent operations (simpler infra) | True exactly-once is impossible (Two Generals); use idempotent at-least-once |
| Sync vs. Async communication | Request/response: simple, caller blocked | Events/messages: decoupled, harder to debug | Sync creates temporal coupling; async adds infra and ordering complexity |

---

## Evolution Path

**Stage 1 -- Single Process.** All logic in one process, one database. Correct starting
point for nearly all systems. Shared memory, ACID transactions, simple debugging.
*Outgrow when:* you need independent scaling, independent deployment for team autonomy, or
the codebase is too large for one team without constant merge conflicts.

**Stage 2 -- Monolith + External Services.** Database, cache, third-party APIs. You already
have a distributed system. Add: connection pools, timeouts, retry with backoff, circuit
breakers, dependency health checks.
*Outgrow when:* module boundaries need enforcement, teams step on each other, deployments
are slow due to monolith size.

**Stage 3 -- Modular Monolith.** Single deployable with enforced module boundaries (e.g.,
ArchUnit, linting rules). Each module owns its data. Inter-module interfaces could later
become network boundaries.
*Outgrow when:* specific modules need independent scaling, different tech stacks, or
independent deployment cadences.

**Stage 4 -- Selective Extraction.** Extract services only for concrete reasons (scaling,
team autonomy, tech mismatch). Add: service discovery, distributed tracing, centralized
logging, API gateways, SLAs. Each extraction is a deliberate decision with documented
justification, not speculation.

**Stage 5 -- Distributed at Scale.** Multiple services, databases, queues. Invest in
platform engineering: service mesh, deployment pipelines, observability. Establish data
patterns (sagas, outbox, CDC). Run chaos engineering. Maintain architecture decision
records for every cross-cutting concern.

**Stage 6 -- Multi-Region.** Choose consistency models per data type (strong for financial,
eventual for preferences). Implement conflict resolution (CRDTs, last-writer-wins,
application-level merge). Design for region-level failure (active-active or
active-passive). Address data sovereignty and regulatory requirements.

---

## Failure Modes

### Network Partition

**AWS eu-north-1 (February 2025).** A networking fault in Stockholm disrupted intra-AZ
traffic. Services in eun1-az3 could not reach other AZs, but external connectivity was
fine. EC2, S3, Lambda, DynamoDB, CloudWatch all degraded from broken internal
service-to-service calls. *Mitigation:* design for partition tolerance from the start; use
consensus for must-be-consistent data; accept eventual consistency where staleness is
tolerable; monitor internal network health, not just external probes.

### Split Brain

**GitHub (2013).** A network partition caused split brain between database replicas. Both
sides accepted writes, creating divergent state requiring manual reconciliation.
**AWS US-East-1 (2013).** Network partition caused split brain with customer-facing
inconsistencies. *Mitigation:* quorum-based writes (require majority); fencing tokens
(monotonic epoch numbers -- Kafka uses these; HDFS uses ZooKeeper for single-NameNode
guarantee); never auto-promote a leader without quorum.

### Clock Drift

A distributed lock with 30-second TTL: if node A's clock is 5 seconds ahead, the lock
appears expired to others 5 real seconds early. Log timestamps from different servers
cannot be reliably compared within the drift margin. *Mitigation:* logical clocks for
ordering; fencing tokens instead of time-based leases; bounded-uncertainty clocks
(TrueTime, HLC); monitor and alert on NTP skew.

### Cascading Failures

**Amazon DynamoDB (September 2015).** A transient network problem caused storage servers to
miss partition assignments. They retried against metadata servers, which became overwhelmed,
causing more timeouts and more retries -- a positive feedback loop that cascaded for 4+
hours. *Mitigation:* circuit breakers, bulkheads, exponential backoff with jitter, load
shedding, health checks with dependency awareness.

### Thundering Herd

**PayPal Braintree Disputes API (2018).** Failed jobs retried at static intervals
(no jitter), compounding load. Autoscaling took 45+ seconds to respond; existing servers
were overwhelmed during the gap. *Mitigation:* staggered cache TTLs (random jitter),
request coalescing, rate limiting, connection draining before restarts, exponential backoff
with jitter.

### BGP / Routing Misconfiguration

**Cloudflare BGP Incident.** During scheduled maintenance of Cloudflare's Hong Kong data
center, outbound routes were entered into the inbound interface, causing global traffic to
be directed to an offline data center. It took ~15 minutes to correct routes network-wide.
In a separate incident, an internal configuration error caused Cloudflare's 1.1.1.1 route
announcements to disappear from the global routing table entirely. The lesson: distributed
systems fail in ways that are almost impossible to predict until they actually fail in
production. *Mitigation:* route announcement monitoring, BGP session alerting, staged
rollouts for network configuration changes, automated rollback on anomaly detection.

### Message Ordering and Duplication

Messages arrive out of order or are delivered more than once. Systems assuming FIFO delivery
or exactly-once semantics produce incorrect results. *Mitigation:* idempotent consumers
(same message twice = same result); idempotency keys for deduplication; single partition
per ordering key (Kafka) for ordered processing; sequence numbers with gap detection.
Accept that exactly-once delivery is impossible in the general case (Two Generals' Problem)
and design for at-least-once with idempotent processing.

### Dual-Write Inconsistency

Writing to a database AND a message broker without coordination: if one succeeds and the
other fails, stores diverge permanently. *Mitigation:* transactional outbox pattern (write
event to outbox table in the same DB transaction; relay to broker asynchronously); change
data capture (CDC); never rely on application-level coordination of two independent writes.

---

## Technology Landscape

### Service Discovery

| Technology | Model | Consistency | Notes |
|-----------|-------|-------------|-------|
| **Consul** | Registry + DNS + KV | Raft (CP) | Multi-datacenter support |
| **etcd** | Key-value with watch | Raft (CP) | Kubernetes control plane backend |
| **ZooKeeper** | Hierarchical KV | ZAB (CP) | Kafka (older), HDFS, HBase |
| **Eureka** | AP registry | Peer replication (AP) | Netflix OSS; favors availability |
| **Kubernetes DNS** | DNS-based | Eventually consistent | Built into k8s, no extra infra |

### Consensus Protocols

| Protocol | Fault Model | Complexity | Used By |
|----------|------------|------------|---------|
| **Raft** | Crash-recovery | Moderate (designed for clarity) | etcd, Consul, CockroachDB, TiKV |
| **Paxos/Multi-Paxos** | Crash-recovery | High | Google Chubby, Spanner, Azure Storage |
| **ZAB** | Crash-recovery | Moderate | ZooKeeper |
| **PBFT** | Byzantine | Very High (O(n^2) messages) | Hyperledger Fabric, Tendermint |

### Observability

| Technology | Scope | Notes |
|-----------|-------|-------|
| **OpenTelemetry** | Traces + metrics + logs | Industry standard; vendor-neutral |
| **Jaeger** | Distributed tracing | CNCF graduated; strong k8s integration |
| **Grafana Tempo** | Trace storage | Cost-effective; object storage backend |

---

## Decision Tree

```
Does your system span more than one process?
├── NO → Does it talk to a database or external API?
│   ├── YES → You have a distributed system. Continue.
│   └── NO → You do not need this module.
│
└── YES → Can you avoid distribution? (modular monolith instead?)
    ├── YES → Prefer single-process. See → modular-monolith
    └── NO → How many services?
        ├── 2-5: Sync HTTP/gRPC. Timeouts + retries + circuit breakers.
        │        See → circuit-breaker-bulkhead, idempotency-and-retry
        ├── 5-20: Service discovery. Distributed tracing. Event-driven
        │         for decoupled flows. DB-per-service. Sagas.
        │         See → microservices, consensus-and-coordination
        └── 20+: Service mesh. Platform team. Chaos engineering.
            │
            ├── Need strong consistency? (financial, inventory)
            │   → Consensus-backed stores. 2PC or sagas.
            │     See → cap-theorem-and-tradeoffs
            ├── Eventual consistency OK? (feeds, analytics)
            │   → Event-driven + idempotent consumers.
            │     See → idempotency-and-retry
            └── Multi-region needed?
                → Per-data-type consistency model. CRDTs. Conflict resolution.
                  See → cap-theorem-and-tradeoffs
```

---

## Implementation Sketch

### Minimal Distributed Hygiene (Every Networked Application)

```python
# 1. TIMEOUTS -- never make a network call without one
response = requests.get("https://api.example.com/data", timeout=(3, 10))
#                                              connect timeout ^   ^ read timeout

# 2. RETRY WITH EXPONENTIAL BACKOFF AND JITTER
import random, time

def retry_with_backoff(fn, max_retries=3, base_delay=1.0):
    for attempt in range(max_retries):
        try:
            return fn()
        except RetryableError:
            if attempt == max_retries - 1:
                raise
            delay = random.uniform(0, base_delay * (2 ** attempt))
            time.sleep(delay)

# 3. IDEMPOTENCY KEYS -- make operations safe to retry
idempotency_key = str(uuid.uuid4())
requests.post(url, json=data, headers={"Idempotency-Key": idempotency_key})
# Server: check if key seen before → return cached response; else process and cache.
```

### Circuit Breaker (Preventing Cascading Failures)

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"        # Normal operation, requests pass through
    OPEN = "open"            # Failures exceeded threshold, requests fast-rejected
    HALF_OPEN = "half_open"  # Testing if downstream has recovered

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0

    def call(self, fn):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN  # Allow one probe request
            else:
                raise CircuitOpenError("Circuit open -- request rejected immediately")

        try:
            result = fn()
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED  # Probe succeeded, recover
                self.failure_count = 0
            return result
        except Exception:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
            raise

# Usage: wrap every downstream call in a per-service circuit breaker.
# When a downstream fails repeatedly, the breaker opens and requests
# are rejected instantly -- preventing thread pool exhaustion and
# cascading failure upstream.
```

### Health Check with Dependency Awareness

```python
def check_health():
    """Report on all dependencies. A service is only as healthy as its
    required dependencies."""
    deps = [
        check_dep("postgresql", lambda: db.execute("SELECT 1"),
                  timeout_ms=5000, required=True),
        check_dep("redis", lambda: redis.ping(),
                  timeout_ms=1000, required=False),    # Degraded without it
        check_dep("payment-svc", lambda: requests.get(url, timeout=2),
                  timeout_ms=2000, required=True),
    ]
    required_down = any(d.unhealthy for d in deps if d.required)
    any_down = any(d.unhealthy for d in deps)
    status = "unhealthy" if required_down else "degraded" if any_down else "healthy"
    return {"status": status, "dependencies": [d.to_dict() for d in deps]}

# Key insight: distinguish REQUIRED dependencies (service cannot function)
# from OPTIONAL dependencies (service is degraded but still useful).
# Load balancers use this to route traffic away from unhealthy instances.
```

### Transactional Outbox (Preventing Dual-Write Inconsistency)

```sql
BEGIN TRANSACTION;
INSERT INTO orders (id, customer_id, total) VALUES ('ord-123', 'cust-456', 99.99);
INSERT INTO outbox (id, aggregate_type, event_type, payload, created_at)
VALUES ('evt-789', 'Order', 'OrderCreated',
        '{"orderId":"ord-123","total":99.99}', NOW());
COMMIT;
-- Separate relay process polls outbox, publishes to broker, marks published.
-- Consumer must be idempotent (relay may re-publish on crash).
```

---

## Cross-References

- **[cap-theorem-and-tradeoffs](../distributed/cap-theorem-and-tradeoffs.md):** CAP
  implications, PACELC, per-operation consistency, system positioning on the C-A spectrum.
- **[consensus-and-coordination](../distributed/consensus-and-coordination.md):** Paxos,
  Raft, ZAB, leader election, distributed locking, coordination services.
- **[circuit-breaker-bulkhead](../../patterns/circuit-breaker-bulkhead.md):** Fault
  isolation -- circuit breakers, bulkheads, timeouts, load shedding.
- **[idempotency-and-retry](../../patterns/idempotency-and-retry.md):** Idempotency keys,
  deduplication, exactly-once via at-least-once with idempotent consumers.
- **[microservices](../distributed/microservices.md):** Service decomposition, boundaries,
  data ownership, inter-service communication, operational cost of distribution.

---

## Key Takeaways

1. **You are already building distributed systems.** Database, API, cache -- any network
   boundary makes you distributed. Treat it accordingly.
2. **Distribution is never free.** Every boundary adds latency, failure modes, consistency
   challenges, and operational cost. Single-process first.
3. **Partial failure is the defining challenge.** Design every interaction for the ambiguity
   of "did it succeed or not?"
4. **The Eight Fallacies are not theoretical.** They are production incidents waiting to
   happen.
5. **Know the impossibility results.** CAP, FLP, and BFT define what is achievable. Choose
   trade-offs; do not pretend they do not exist.
6. **Clocks lie.** Use logical clocks for ordering, fencing tokens for mutual exclusion,
   bounded-uncertainty clocks when physical time is necessary.
7. **Idempotency is the universal safety net.** In a world of retries and at-least-once
   delivery, idempotent operations prevent data corruption.
8. **Start simple. Distribute when forced.** Monolith first. Modular monolith second.
   Extract services for concrete, measurable reasons.
