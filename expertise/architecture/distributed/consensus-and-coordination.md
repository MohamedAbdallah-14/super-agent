# Consensus and Coordination -- Architecture Expertise Module

> Consensus protocols enable distributed nodes to agree on a single value despite failures.
> Coordination services (ZooKeeper, etcd) provide distributed primitives like leader election,
> distributed locks, and configuration management. Most developers should use existing
> coordination services rather than implementing consensus protocols directly.

> **Category:** Distributed
> **Complexity:** Expert
> **Applies when:** Systems needing leader election, distributed locking, configuration consensus, or state machine replication across nodes

---

## What This Is (and What It Isn't)

### The Consensus Problem

The consensus problem is deceptively simple to state: given a set of N distributed nodes, get
them all to agree on a single value, even if some nodes crash. A consensus protocol must satisfy
three properties:

1. **Agreement:** All non-faulty nodes decide on the same value.
2. **Validity:** The decided value was proposed by some node (no "magic" values).
3. **Termination:** Every non-faulty node eventually decides.

These three properties sound trivial until you add real-world constraints: networks drop and
reorder messages, nodes crash and restart with stale state, and there is no global clock that
all participants trust.

### The FLP Impossibility Result

In 1985, Fischer, Lynch, and Patterson proved one of the most important results in computer
science: **no deterministic consensus algorithm can guarantee termination in an asynchronous
system where even one process may crash** (the "FLP impossibility"). This result won the
Dijkstra Award for the most influential paper in distributed computing.

The intuition behind FLP: in a fully asynchronous system, you cannot distinguish a crashed
node from a very slow node. Any protocol that waits for a response might wait forever; any
protocol that proceeds without the response might disagree with that node if it was merely
slow.

**What FLP does NOT say:**

- It does NOT say consensus is impossible in practice. It says no *deterministic* algorithm
  can *guarantee* termination in a *fully asynchronous* model.
- Practical systems circumvent FLP by relaxing the model: using partial synchrony assumptions
  (timeouts), randomization, or failure detectors. Raft and Paxos both rely on eventual leader
  stability (a partial synchrony assumption) to make progress.

### Paxos

Leslie Lamport introduced Paxos in 1998 (and described it allegorically in "The Part-Time
Parliament" in 1989). Paxos defines three roles:

- **Proposer:** Suggests a value to be agreed upon.
- **Acceptor:** Votes on proposals. A majority of acceptors constitutes a quorum.
- **Learner:** Learns the decided value once a quorum of acceptors agrees.

The protocol operates in two phases:

1. **Prepare (Phase 1):** The proposer sends a `Prepare(n)` message with a unique proposal
   number `n`. Each acceptor promises not to accept proposals with numbers less than `n` and
   returns any previously accepted value.
2. **Accept (Phase 2):** If the proposer receives promises from a majority, it sends
   `Accept(n, v)` where `v` is either the highest-numbered previously accepted value or the
   proposer's own value. Each acceptor accepts if it has not promised to a higher number.

**Multi-Paxos** extends single-decree Paxos to decide a sequence of values (a replicated log)
by reusing the same leader across multiple rounds, amortizing the cost of Phase 1.

Paxos is notoriously difficult to understand and implement correctly. Google's Chubby lock
service and Spanner database use Paxos internally. Azure Storage also uses Paxos for
consistency across its distributed storage layer.

### Raft

Diego Ongaro and John Ousterhout designed Raft in 2014 explicitly to be more understandable
than Paxos. Raft decomposes consensus into three cleanly separated subproblems:

1. **Leader Election:** Nodes are in one of three states: follower, candidate, or leader.
   A heartbeat mechanism triggers elections. If a follower receives no communication for an
   *election timeout* period, it becomes a candidate and requests votes. A candidate becomes
   leader by receiving votes from a majority of nodes.

2. **Log Replication:** The leader accepts client requests, appends them to its log, and
   replicates entries to followers via `AppendEntries` RPCs. An entry is committed once
   replicated on a majority. Followers apply committed entries to their state machines in
   order.

3. **Safety:** Raft guarantees that if any server has applied a log entry at a given index,
   no other server will apply a different entry at that index. It achieves this by restricting
   which nodes can become leader: only nodes with up-to-date logs win elections.

**Key difference from Paxos:** Raft requires log entries to be decided *in order*, which
simplifies reasoning but means a slow entry blocks subsequent entries. Paxos allows
out-of-order decisions but requires gap-filling, adding implementation complexity.

Heidi Howard's 2020 paper "Paxos vs Raft" showed the algorithms are more similar than
believed, differing primarily in leader election. Raft's contribution is one of *presentation
and decomposition*, not algorithmic novelty.

**Real-world Raft implementations:** etcd, Consul, TiKV, CockroachDB, Nomad, Kafka (KRaft).

### Coordination Services: The Practical Layer

Most developers should never implement Paxos or Raft themselves. Instead, they should use
coordination services that embed these algorithms and expose higher-level primitives:

- **Apache ZooKeeper:** Built at Yahoo for Hadoop. Uses ZAB (closely related to Paxos).
  Hierarchical namespace (znodes), ephemeral nodes, watches, sequential nodes. Powers Kafka
  (legacy), HBase, Solr.

- **etcd:** CoreOS/CNCF project. Raft consensus. Flat key-value with MVCC, watch streams,
  leases, distributed locks. The coordination backbone of Kubernetes.

- **Consul:** HashiCorp. Raft within datacenter, Serf gossip between datacenters. Service
  discovery, health checking, KV store, service mesh. Strongest multi-DC story.

### What This Is NOT

- **Not something most developers should implement.** Implementing Raft or Paxos correctly
  is a multi-year effort. The Raft paper's reference implementation had subtle bugs found
  years later. Use etcd, ZooKeeper, or Consul.
- **Not a database.** Coordination services store small metadata (configuration, leader
  identity, lock state). etcd recommends keeping total data under 8 GB.
- **Not a message queue.** Watch streams provide notifications, not high-throughput delivery.
- **Not Byzantine fault tolerant.** Paxos and Raft assume crash-fault (nodes stop, they do
  not lie). BFT protocols like PBFT handle malicious nodes at enormous performance cost.

---

## When to Use It

### 1. Leader Election for Single-Writer Architectures

When exactly one node must be the "active" processor at any time (single-writer pattern),
consensus-based leader election ensures that exactly one leader exists and that failover
happens correctly.

**Evidence -- Amazon:** Amazon's Builders' Library documents that leases are their most widely
used leader election mechanism -- straightforward to implement with built-in fault tolerance.
DynamoDB provides lease-based locking clients for this purpose.

**Evidence -- Kubernetes:** Control plane singletons (scheduler, controller-manager) use
etcd-backed leader election via lease objects. Replicas watch the lease and acquire on expiry.

### 2. Distributed Locks for Mutual Exclusion

When a shared resource (file, external API with rate limits, database migration) must be
accessed by at most one process at a time, distributed locks provide mutual exclusion across
nodes.

**Evidence -- Apache Curator:** Netflix built Curator for ZooKeeper, providing production-grade
lock recipes (`InterProcessMutex`, `InterProcessReadWriteLock`) used across Netflix for
coordinating shared resource access.

### 3. Consistent Configuration Across a Cluster

When all nodes in a cluster must agree on configuration values (feature flags, routing tables,
schema versions), a coordination service provides linearizable reads and writes that guarantee
all nodes see the same state.

**Evidence -- Kubernetes/etcd:** Every Kubernetes cluster stores its desired state in etcd.
The kube-apiserver reads/writes etcd, controllers watch for changes, guaranteeing all control
plane components operate on a consistent view of cluster state.

### 4. Service Discovery

When services need to find each other dynamically (instances come and go with auto-scaling),
coordination services provide service registration and health-checked discovery.

**Evidence -- Consul:** Services register with the local Consul agent (which participates in
Raft). Health checks auto-deregister unhealthy instances. DNS and HTTP APIs provide discovery.

### 5. Cluster Membership and Failure Detection

When the system needs an authoritative view of which nodes are alive and what roles they play,
consensus ensures that all nodes agree on the membership list, preventing split-brain scenarios.

**Evidence -- CockroachDB:** Uses Raft consensus groups (one per data range) so that even
during node failures, the system agrees on which replica is authoritative.

---

## When NOT to Use It

The coordination tax is real. Consensus protocols add latency, operational complexity, and
failure modes. Many systems that adopt distributed coordination do not need it.

### 1. Single-Node Systems

If your system runs on a single server (or can tolerate being a single server), you do not
need distributed consensus. A local mutex, a database row lock, or a simple file lock provides
the same guarantees with zero network overhead.

**The test:** If you are not running multiple instances of the process that need to coordinate,
you do not need distributed coordination. A surprising number of systems that deploy ZooKeeper
or etcd are actually single-node systems with redundant complexity.

### 2. When a Database Lock Suffices

A `SELECT ... FOR UPDATE` in PostgreSQL or a conditional write in DynamoDB provides mutual
exclusion within the scope of a database transaction. If the resource you are protecting is
already in the database, use the database's own locking mechanisms.

**Evidence -- Shopify:** Shopify uses `pg_advisory_lock` for background job coordination.
The database is already a dependency; adding etcd would increase operational surface without
meaningful benefit.

### 3. Distributed Locks Are Frequently Misused -- Use Idempotency Instead

This is the most common mistake. Teams reach for distributed locks to prevent duplicate
processing, when idempotent operations would eliminate the need for coordination entirely.

**The pattern to avoid:** "We need a distributed lock so that only one worker processes
each payment." The correct solution is usually an idempotent payment API with a unique
idempotency key. If two workers process the same payment, the second call is a no-op.

**Evidence -- Stripe:** Every mutating API request accepts an `Idempotency-Key` header.
Duplicate requests return cached results. No distributed lock needed. More resilient than
locking because it tolerates retries, partitions, and crashes without coordination overhead.

**Evidence -- Payment processor incident:** Double-charges occurred ~1 per 10,000 transactions
because the distributed lock expired during GC pauses. Replacing the lock with an idempotent
charge API eliminated the problem entirely.

### 4. ZooKeeper Complexity Overhead for Small Systems

ZooKeeper requires a minimum of 3 nodes (5 recommended for production), a JVM with tuned
garbage collection, and operational expertise for compaction, snapshots, and leader elections.
For small systems (under 10 services), this operational tax is rarely justified.

**The alternative:** On Kubernetes, the API server's leases and configmaps (backed by etcd)
provide coordination without a separate cluster. Off Kubernetes, PostgreSQL advisory locks
often suffice.

### 5. When Eventual Consistency Is Acceptable

Consensus provides strong consistency (linearizability), which comes at the cost of latency
and availability. If your use case tolerates stale reads or temporary disagreement, avoid
consensus entirely.

**Evidence -- DNS-based service discovery:** DNS is eventually consistent (TTL-based), but
for most discovery use cases, seconds of stale data is acceptable. Route 53 health checks
provide service discovery without a consensus cluster.

### 6. Cross-Datacenter Consensus (Latency Trap)

Consensus requires a majority quorum for every write. If your nodes span datacenters with
50-100ms round-trip latency, every write pays 2-3 round trips of that latency (100-300ms
minimum). Most applications cannot tolerate this.

**The alternative:** Consensus *within* a datacenter, async replication *between* datacenters.
Consul uses Raft intra-DC and gossip (Serf) inter-DC. Spanner uses TrueTime (GPS/atomic
clocks) to bound cross-DC read uncertainty.

---

## How It Works

### Raft in Detail: Leader Election

1. All nodes start as **followers**. Each has a randomized **election timeout** (e.g.,
   150-300ms).
2. If a follower receives no heartbeat from a leader before its timeout expires, it increments
   its **term** (a monotonically increasing integer) and transitions to **candidate**.
3. The candidate votes for itself and sends `RequestVote` RPCs to all other nodes.
4. Each node votes for at most one candidate per term. A candidate wins if it receives votes
   from a majority of nodes.
5. The winning candidate becomes **leader** and begins sending periodic heartbeats
   (`AppendEntries` with no entries) to prevent new elections.
6. If a candidate's election times out without winning (split vote), a new election begins
   with a higher term. Randomized timeouts make perpetual split votes extremely unlikely.

**The term mechanism prevents split brain:** If a stale leader receives a message with a
higher term number, it immediately steps down to follower. This is the distributed systems
equivalent of a fencing token -- the term acts as an epoch that monotonically increases with
each leadership change.

### Raft in Detail: Log Replication

1. The leader receives a client request and appends it as a new entry to its log.
2. The leader sends `AppendEntries` RPCs to all followers with the new entry.
3. Each follower appends the entry to its log and responds with success.
4. Once the leader receives acknowledgment from a **majority** (including itself), the entry
   is **committed**. The leader applies it to its state machine and responds to the client.
5. Followers learn about committed entries via subsequent heartbeats and apply them to their
   own state machines.

**Consistency guarantee:** If two logs contain an entry with the same index and term, then
(a) the entries store the same command, and (b) all preceding entries are identical. This is
enforced by the `AppendEntries` consistency check: each RPC includes the index and term of
the entry immediately preceding the new entries, and followers reject the RPC if they do not
have a matching entry.

### Paxos in Detail: The Two-Phase Protocol

**Phase 1 (Prepare):**
1. A proposer selects a proposal number `n` (globally unique, monotonically increasing).
2. It sends `Prepare(n)` to a majority of acceptors.
3. Each acceptor responds with a promise not to accept proposals numbered less than `n`, along
   with the highest-numbered proposal it has already accepted (if any).

**Phase 2 (Accept):**
1. If the proposer receives promises from a majority, it selects the value: either the value
   from the highest-numbered previously accepted proposal, or (if no acceptor has accepted
   anything) its own proposed value.
2. It sends `Accept(n, v)` to the same majority.
3. Each acceptor accepts if it has not promised to a higher-numbered proposal.

**Key insight:** The "must use highest previously accepted value" rule is what ensures safety.
It guarantees that once a value is chosen (accepted by a majority), any future proposer will
discover it in Phase 1 and propose it again, preserving the decision.

### Distributed Locks: Fencing Tokens

The naive distributed lock pattern -- acquire lock, do work, release lock -- is fundamentally
broken in distributed systems because of **process pauses**. A process can be paused at any
moment by:

- Garbage collection stop-the-world pauses (lasting seconds or even minutes in extreme cases)
- OS process preemption or CPU scheduling
- Virtual memory page faults
- Network delays causing request timeouts

**The fencing token pattern:**

1. Each lock acquisition returns a **fencing token** -- a monotonically increasing integer.
2. When the lock holder writes to the protected resource, it includes the fencing token.
3. The resource rejects any write with a token lower than the highest token it has seen.

**Worked example:**
- Process A acquires lock, receives token 33.
- Process A enters GC pause. Lock lease expires.
- Process B acquires lock, receives token 34. Writes to resource with token 34.
- Process A wakes up, tries to write with token 33. Resource rejects it (34 > 33).

**Critical insight from Martin Kleppmann:** The lock service alone cannot solve this problem.
The resource being protected must participate in the fencing protocol. This means the resource
(database, file system, external API) must understand fencing tokens and enforce monotonicity.
If the resource does not support fencing, the distributed lock provides only *best-effort*
mutual exclusion.

### Leader Election: Lease-Based

Lease-based leader election is the most common pattern in production systems:

1. A **lease** is a time-bounded lock stored in a coordination service or database.
2. The leader periodically **renews** the lease (heartbeat) before it expires.
3. If the leader fails to renew (crash, network partition, GC pause), the lease expires.
4. Other candidates attempt to acquire the expired lease. Exactly one succeeds (guaranteed
   by the coordination service's linearizability).

**Time dependency:** Leases depend on *local elapsed time*, not synchronized wall-clock time.
The lease holder checks "has T seconds elapsed since my last renewal?" using a monotonic clock.
This avoids clock synchronization problems but introduces a fundamental tension:

- **Short leases** (1-5 seconds): fast failover but risk false positives from GC pauses or
  brief network glitches, causing unnecessary leader thrashing.
- **Long leases** (15-30 seconds): fewer false positives but slower failover, meaning longer
  write unavailability during real failures.

**Amazon's guidance:** Amazon recommends lease durations of 10-30 seconds for most workloads,
with the leader renewing at one-third of the lease interval.

### Distributed Configuration: Watch-Based Propagation

Coordination services propagate configuration changes through watches: a client writes a new
value, and all nodes watching that key receive a push notification.

**etcd** uses gRPC server-side streaming with revision-ordered delivery. Clients detect missed
updates via revision gaps and recover by reading full state. **ZooKeeper** uses one-time
callback triggers that must be re-registered after each event, creating a small window for
missed changes. Curator's `TreeCache` recipe layers continuous watching on top of the
primitive API to eliminate this gap.

---

## Trade-Offs Matrix

| Dimension | Consensus-Based Coordination | Database-Based Coordination | No Coordination (Idempotent Design) |
|-----------|-----------------------------|-----------------------------|-------------------------------------|
| **Consistency** | Linearizable (strongest) | Serializable within transactions | Eventual; relies on idempotency for correctness |
| **Latency** | 2-10ms within datacenter (Raft round trip) | 1-5ms (local database lock) | 0ms coordination overhead |
| **Availability** | Requires majority quorum (N/2+1 of N nodes) | Single database is SPOF unless replicated | No coordination SPOF |
| **Operational cost** | Dedicated cluster (3-5 nodes), monitoring, backups | Already running a database | No additional infrastructure |
| **Failure detection** | Built-in (heartbeats, lease expiry) | Requires polling or advisory lock timeout | N/A; no leader to detect |
| **Cross-DC support** | Expensive (100-300ms per write across DCs) | Requires cross-DC database replication | Works naturally across DCs |
| **Data volume** | Small metadata only (< 8 GB for etcd) | Full database capacity | No coordination data |
| **Complexity** | High; ZooKeeper/etcd operational expertise required | Low-medium; standard DBA skills | Low; design complexity in idempotency logic |
| **Failure mode** | Split brain if quorum lost; read-only or unavailable | Deadlocks; lock contention under load | Duplicate processing if idempotency breaks |
| **Lock granularity** | Coarse-grained (per-resource locks) | Fine-grained (row-level locks) | N/A; no locks |
| **Throughput** | 10K-50K writes/sec (etcd); not designed for high throughput | 100K+ transactions/sec (PostgreSQL) | Limited only by application throughput |

---

## Evolution Path

### Stage 1: Single Node (No Coordination)

The system runs on one server. Coordination is handled by the OS kernel (mutexes, file locks,
process signals). This is correct and sufficient for many applications.

**Move to Stage 2 when:** You need high availability (redundant instances) or horizontal
scaling beyond a single node.

### Stage 2: Database-Based Coordination

Use your existing database for coordination: advisory locks for mutual exclusion, a "leaders"
table with optimistic locking for leader election, and config tables for shared configuration.

**Implementation:** `pg_advisory_lock(key)` for mutual exclusion. `SELECT ... FOR UPDATE
SKIP LOCKED` for work distribution. Conditional updates for leader election.

**Move to Stage 3 when:** Database contention from coordination queries impacts application
query performance, or you need sub-second failure detection that database polling cannot
provide.

### Stage 3: Dedicated Coordination Service

Deploy etcd, ZooKeeper, or Consul alongside your application. Use it for leader election,
distributed locks, service discovery, and configuration management.

**Selection guide:**
- **etcd** if you are already running Kubernetes or need a simple key-value model with
  strong consistency and watch semantics.
- **Consul** if you need multi-datacenter service discovery, health checking, and service
  mesh capabilities.
- **ZooKeeper** if you are in the Hadoop/Kafka ecosystem or need hierarchical namespace
  features (ephemeral sequential nodes for distributed queues, barriers).

**Move to Stage 4 when:** You need custom consensus behavior (application-level state machine
replication) that coordination services do not directly support.

### Stage 4: Embedded Consensus Library

Embed a Raft library directly into your application for custom replicated state machines.
Libraries like `hashicorp/raft` (Go), `openraft` (Rust), `Apache Ratis` (Java), and
`dragonboat` (Go) provide Raft implementations that you integrate into your application.

**Evidence -- CockroachDB:** CockroachDB embeds a Raft implementation (derived from etcd's
Raft library) in its storage engine. Each data range has its own Raft group, providing
fine-grained replication without a central coordination bottleneck.

**Warning:** Appropriate only for database-class infrastructure. The investment to handle
snapshotting, membership changes, and log compaction is measured in engineer-years.

---

## Failure Modes

### 1. Split Brain from Lock Expiry

**What happens:** A distributed lock holder (Process A) experiences a GC pause. The lock's
lease expires. Process B acquires the lock. Process A wakes up, believes it still holds the
lock, and writes to the shared resource. Both processes now operate on the resource
simultaneously.

**Real-world incident:** At a major payment processor, two worker processes both believed they
held the lock on an account, resulting in double-charges approximately once per 10,000
transactions. The root cause was JVM garbage collection pauses exceeding the lock's TTL.

**Mitigation:** Fencing tokens (see "How It Works"). The lock returns a monotonically
increasing token; the resource rejects stale tokens. Without resource-side enforcement,
the lock is advisory only.

### 2. GC Pauses Causing False Leader Failover

**What happens:** The leader node enters a long GC pause (> lease duration). Followers detect
the missing heartbeats, trigger an election, and elect a new leader. The old leader wakes up
and briefly believes it is still leader, issuing conflicting commands.

**Real-world incident (Akka Cluster):** A heartbeat was delayed 15,456ms (expected: 1,000ms)
due to GC pressure. The frozen node took 7 seconds after unfreezing to step down -- during
which it processed commands while a new leader was also active, violating Single Writer.

**Production failover timing:** Deployments target 3-10s for detection; total failover in
systems like MongoDB is 10-30s. Aggressive timeouts (1-3s) risk false positives; conservative
timeouts (10-30s) extend write unavailability.

**Mitigation:** Raft's term mechanism: the old leader steps down upon receiving any message
with a higher term. For non-Raft systems, use epoch-based fencing where the storage layer
rejects operations from stale epochs.

### 3. Martin Kleppmann's Distributed Locking Critique

Kleppmann's 2016 analysis identified two fundamental problems with Redlock:

**Problem 1 -- No fencing tokens:** Redlock uses a random unique value as a lock identifier,
but this value is not monotonically increasing. You cannot use it as a fencing token. Keeping
a counter on a single Redis node is not sufficient because that node may fail. Keeping counters
on multiple Redis nodes would require... a consensus algorithm to keep them synchronized,
defeating the purpose.

**Problem 2 -- Dangerous timing assumptions:** Redlock assumes bounded network delay and
bounded process pause time (essentially a synchronous system model). If a clock on one Redis
node jumps forward (NTP adjustment, VM migration, clock drift), a lock could expire
prematurely, allowing a second client to acquire it. Both clients now believe they hold the
lock.

**The core insight:** For correctness locks, you need fencing tokens -- the lock service must
generate monotonically increasing tokens and the resource must enforce them. Redis does not
provide this. For efficiency locks (preventing duplicate work), Redis `SETNX` with TTL is
fine -- occasional double-processing wastes work but does not corrupt data.

### 4. Quorum Loss and Read Availability

**What happens:** In a 3-node etcd cluster, if 2 nodes go down, the remaining node cannot
form a quorum. The cluster becomes completely unavailable -- it can serve neither reads nor
writes (by default). This is a deliberate safety choice: serving reads from a single node
could return stale data if the node is partitioned.

**Mitigation:** etcd supports `--serializable` reads that can be served by any single node,
trading linearizability for availability. For non-critical reads (dashboards, monitoring),
serializable reads during quorum loss are acceptable. For correctness-critical reads (lock
state, leader identity), the system must be unavailable rather than inconsistent.

### 5. Watch Notification Gaps (ZooKeeper)

**What happens:** ZooKeeper watches are one-time triggers. After a watch fires, the client
must re-register it. Between the watch firing and re-registration, changes can be missed.

**Mitigation:** Use Curator's `PathChildrenCache` or `TreeCache`, which handle re-registration
and gap detection. Alternatively, use etcd, whose watch API provides continuous streams with
revision-based ordering, eliminating the gap problem.

### 6. etcd Data Size Limits Under Pressure

**What happens:** etcd stores all data in memory and recommends a maximum database size of
8 GB. Under heavy write load with insufficient compaction, the database grows past its limit
and refuses writes, potentially causing a Kubernetes cluster to become unmanageable.

**Mitigation:** Configure auto-compaction (`--auto-compaction-retention=1h`), set
`--quota-backend-bytes`, monitor size via `/metrics`, and run periodic defragmentation.

---

## Technology Landscape

### etcd

- **Consensus:** Raft
- **Data model:** Flat key-value with MVCC (multi-version concurrency control)
- **Language:** Go
- **Watch mechanism:** gRPC streaming; continuous, revision-ordered
- **Locking:** Distributed locks via `clientv3/concurrency` package
- **Best for:** Kubernetes clusters, systems already in the CNCF ecosystem
- **Operational notes:** 3 or 5 nodes recommended. Sensitive to disk latency -- use SSDs.
  Monitor `wal_fsync_duration_seconds` and `backend_commit_duration_seconds`.
- **Throughput:** Approximately 10,000-50,000 writes/sec depending on value size and hardware.

### Apache ZooKeeper

- **Consensus:** ZAB (ZooKeeper Atomic Broadcast), closely related to Paxos
- **Data model:** Hierarchical namespace (znodes) with ephemeral nodes, sequential nodes
- **Language:** Java
- **Watch mechanism:** One-time callback triggers; must re-register after each event
- **Locking:** Recipes via Apache Curator (`InterProcessMutex`, `InterProcessReadWriteLock`)
- **Best for:** Hadoop/Kafka ecosystem, systems needing hierarchical data and ephemeral nodes
- **Operational notes:** 3 or 5 nodes. JVM tuning is critical -- G1GC recommended, heap
  size 4-8 GB. Configure `autopurge.snapRetainCount` and `autopurge.purgeInterval`.
- **Throughput:** Approximately 10,000-20,000 writes/sec; reads are faster and can be served
  by any node (with staleness risk).

### HashiCorp Consul

- **Consensus:** Raft (within datacenter), Serf gossip (between datacenters)
- **Data model:** Flat key-value plus service catalog with health checks
- **Language:** Go
- **Watch mechanism:** Blocking queries (long polling) and event system
- **Locking:** Built-in session-based locks with configurable behavior on session invalidation
- **Best for:** Multi-datacenter service discovery, service mesh, organizations using
  HashiCorp stack (Vault, Nomad, Terraform)
- **Operational notes:** 3 or 5 server nodes per datacenter, plus client agents on every
  application node. Lower operational burden than ZooKeeper.

### Redis Redlock -- and Why It Is Controversial

Redis is often used for distributed locking via `SETNX` with `TTL`. The Redlock algorithm
(proposed by Salvatore Sanfilippo / antirez) extends this across multiple independent Redis
instances:

1. Get current time.
2. Acquire lock on N/2+1 of N independent Redis instances with the same key and random value.
3. If the elapsed time to acquire exceeds the lock TTL, the lock is considered failed.
4. If acquired, the effective lock lifetime is TTL minus elapsed acquisition time.

**Why it is controversial:**

Martin Kleppmann argued Redlock is unsafe for correctness: it makes timing assumptions
violated by clock jumps/GC pauses, cannot generate monotonically increasing fencing tokens,
and requires trusting clocks do not jump -- assumptions proven unreliable in practice.
Antirez responded defending practical safety, arguing timing checks are sufficient. The
distributed systems community remains divided.

**Guidance:** Use single-instance Redis `SETNX` for *efficiency* locks (preventing duplicate
work where occasional double-processing is harmless). Use etcd or ZooKeeper for *correctness*
locks (where double-processing causes data corruption or financial loss). Avoid Redlock for
correctness-critical paths.

---

## Decision Tree

```
Do you need distributed coordination?
|
+-- Is the system single-node or single-instance?
|   +-- YES --> Use OS-level primitives (mutex, flock). Stop here.
|
+-- Can the coordination be replaced with idempotent operations?
|   +-- YES --> Design for idempotency. No coordination needed. Stop here.
|
+-- Is a database already a dependency?
|   +-- YES --> Can the database handle the coordination load?
|       +-- YES --> Use database locks (advisory locks, SELECT FOR UPDATE). Stop here.
|       +-- NO  --> Proceed to dedicated coordination service.
|
+-- What is the primary use case?
|   |
|   +-- Leader election only?
|   |   +-- On Kubernetes? --> Use Kubernetes Lease objects (backed by etcd).
|   |   +-- Not on Kubernetes? --> etcd or Consul, whichever matches your stack.
|   |
|   +-- Service discovery + health checking?
|   |   +-- Single datacenter? --> etcd or Consul.
|   |   +-- Multi-datacenter? --> Consul (strongest multi-DC story).
|   |
|   +-- Distributed locks?
|   |   +-- For efficiency (prevent duplicate work)?
|   |   |   +-- Redis SETNX with TTL. Acceptable if occasional double-processing is harmless.
|   |   +-- For correctness (prevent data corruption)?
|   |       +-- etcd or ZooKeeper with fencing tokens.
|   |       +-- NOT Redis Redlock for correctness-critical paths.
|   |
|   +-- Configuration management?
|   |   +-- Already on Kubernetes? --> ConfigMaps + controller watches.
|   |   +-- Need strong consistency? --> etcd or Consul KV.
|   |
|   +-- Custom replicated state machine?
|       +-- Use an embedded Raft library (hashicorp/raft, openraft, dragonboat).
|       +-- WARNING: This is a multi-month to multi-year investment.
|
+-- Are you in the Hadoop/Kafka ecosystem?
    +-- YES --> ZooKeeper (but note: Kafka is migrating to KRaft, removing ZK dependency).
    +-- NO  --> etcd (if Kubernetes-native) or Consul (if multi-DC or HashiCorp stack).
```

---

## Implementation Sketch

### Leader Election with etcd (Go)

```go
package main

import (
    "context"
    "log"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"
    "go.etcd.io/etcd/client/v3/concurrency"
)

func main() {
    cli, _ := clientv3.New(clientv3.Config{
        Endpoints:   []string{"localhost:2379"},
        DialTimeout: 5 * time.Second,
    })
    defer cli.Close()

    // Session TTL = failover time. 10s = leader replaced within 10s of crash.
    session, _ := concurrency.NewSession(cli, concurrency.WithTTL(10))
    defer session.Close()

    election := concurrency.NewElection(session, "/my-service/leader")

    ctx := context.Background()
    if err := election.Campaign(ctx, "node-1"); err != nil {
        log.Fatal(err) // Blocks until this node wins the election
    }
    log.Println("I am the leader!")

    // Do leader work. Lease auto-renews. On crash, lease expires -> new election.
    // On graceful shutdown: election.Resign(ctx) for instant failover.
    select {}
}
```

**Key design points:**
- Session TTL determines failover time. Shorter = faster failover but more risk of false
  leadership changes during GC pauses.
- `Campaign()` blocks until this node wins. Use `Observe()` to watch without campaigning.
- Call `Resign()` on graceful shutdown for instant failover (avoids waiting for lease expiry).

### Distributed Lock with Fencing Token (Pseudocode)

```
function acquireLockWithFencing(lockService, resourceClient, lockKey):
    // Acquire lock; the service returns a monotonically increasing token
    lock, fencingToken = lockService.acquire(lockKey, ttl=30s)

    if not lock.acquired:
        return FAILED

    try:
        // Include fencing token in every write to the protected resource
        result = resourceClient.write(
            data=payload,
            fencingToken=fencingToken
        )
        // Resource rejects write if it has seen a higher token
        if result.rejected:
            log.warn("Stale lock detected, token rejected")
            return STALE_LOCK
        return SUCCESS
    finally:
        lockService.release(lockKey, lock)


// Resource-side enforcement (e.g., in a database trigger or middleware):
function handleWrite(data, fencingToken):
    currentMax = storage.getMaxToken(resource_id)
    if fencingToken < currentMax:
        reject("Stale fencing token")
    storage.setMaxToken(resource_id, fencingToken)
    storage.write(data)
```

**Critical implementation detail:** The fencing token check and the data write must be
atomic on the resource side. If they are separate operations, a race condition between the
check and the write reintroduces the problem. In a database, use a single transaction:
`UPDATE resource SET data=$data, max_token=$token WHERE id=$id AND max_token < $token`.

### ZooKeeper Distributed Lock (Java, using Curator)

```java
CuratorFramework client = CuratorFrameworkFactory.newClient(
    "localhost:2181", new ExponentialBackoffRetry(1000, 3));
client.start();

InterProcessMutex lock = new InterProcessMutex(client, "/locks/my-resource");
if (lock.acquire(30, TimeUnit.SECONDS)) {
    try {
        processSharedResource(); // Critical section: one process at a time
    } finally {
        lock.release();
    }
}
```

**How Curator's lock works internally:** Creates an ephemeral sequential znode
(`/locks/my-resource/lock-0000000001`). The holder is the client with the lowest sequence
number. Other clients watch only the next-lowest node (avoiding the "herd effect" of
notifying all waiters). If the holder crashes, ZooKeeper deletes the ephemeral node and
the next waiter acquires automatically.

---

## Cross-References

- **distributed-systems-fundamentals** -- Network models (synchronous, asynchronous, partially
  synchronous), failure models (crash-stop, crash-recovery, Byzantine), and the fundamental
  impossibility results that constrain consensus protocol design.
- **cap-theorem-and-tradeoffs** -- The CAP theorem directly governs coordination service
  design: etcd and ZooKeeper choose CP (consistency + partition tolerance), sacrificing
  availability during network partitions. Understanding CAP is prerequisite to understanding
  why coordination services become unavailable when quorum is lost.
- **idempotency-and-retry** -- The most important alternative to distributed locking. In many
  cases where teams reach for a distributed lock, idempotent operation design eliminates the
  coordination requirement entirely, producing a more resilient system.
- **data-consistency** -- Linearizability, serializability, and eventual consistency models
  determine which coordination primitives are appropriate. Consensus provides linearizability;
  understanding when weaker consistency suffices prevents over-engineering.

---

## Sources

- [Distributed Consensus: Paxos vs. Raft and Modern Implementations](https://dev.to/narendars/distributed-consensus-paxos-vs-raft-and-modern-implementations-2gng)
- [Paxos vs Raft: Have we reached consensus on distributed consensus? (Heidi Howard, 2020)](https://arxiv.org/abs/2004.05074)
- [Raft Consensus Algorithm -- Official Site](https://raft.github.io/)
- [A Brief Tour of FLP Impossibility](https://www.the-paper-trail.org/post/2008-08-13-a-brief-tour-of-flp-impossibility/)
- [Leader Election in Distributed Systems -- Amazon Builders' Library](https://aws.amazon.com/builders-library/leader-election-in-distributed-systems/)
- [Leader Election Pattern -- Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/leader-election)
- [How to do distributed locking -- Martin Kleppmann](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Is Redlock safe? -- antirez (Salvatore Sanfilippo)](https://antirez.com/news/101)
- [Distributed Locks with Redis -- Official Redis Documentation](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [etcd versus other key-value stores](https://etcd.io/docs/v3.3/learning/why/)
- [In-Depth Comparison of Distributed Coordination Tools: Consul, etcd, ZooKeeper, and Nacos](https://medium.com/@karim.albakry/in-depth-comparison-of-distributed-coordination-tools-consul-etcd-zookeeper-and-nacos-a6f8e5d612a6)
- [Distributed Lock Failure: How Long GC Pauses Break Concurrency](https://systemdr.substack.com/p/distributed-lock-failure-how-long)
- [Beyond the Lock: Why Fencing Tokens Are Essential](https://levelup.gitconnected.com/beyond-the-lock-why-fencing-tokens-are-essential-5be0857d5a6a)
- [Akka Cluster split brain failures -- are you ready for it?](https://blog.softwaremill.com/akka-cluster-split-brain-failures-are-you-ready-for-it-d9406b97e099)
- [Understanding Raft Consensus in Distributed Systems with TiDB](https://www.pingcap.com/article/understanding-raft-consensus-in-distributed-systems-with-tidb/)
