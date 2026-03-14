# CAP Theorem and Tradeoffs -- Architecture Expertise Module

> The CAP theorem states that a distributed system can provide at most two of three guarantees:
> Consistency, Availability, and Partition tolerance. Since network partitions are inevitable,
> the real choice is between consistency and availability during a partition. PACELC extends
> this: even without partitions, there is a latency vs consistency tradeoff.

> **Category:** Distributed
> **Complexity:** Complex
> **Applies when:** Designing data replication strategy, choosing databases, or deciding consistency guarantees for distributed services.

---

## What This Is

### The CAP Theorem

Eric Brewer introduced the CAP conjecture in his keynote at the ACM PODC symposium in 2000.
Seth Gilbert and Nancy Lynch of MIT formally proved it in 2002, elevating it from conjecture
to theorem. The theorem states that any distributed data store can provide at most two of the
following three guarantees simultaneously:

**Consistency (C):** Every read receives the most recent write or an error. All nodes in the
system see the same data at the same time. When a client writes a value, every subsequent
read from any node must return that value (or a more recent one). This is linearizable
consistency -- the strongest form -- not eventual consistency.

**Availability (A):** Every request to a non-failing node receives a non-error response,
without the guarantee that it contains the most recent write. The system remains operational
and responsive. In CAP's formal definition, *every* request must eventually receive a
response -- there is no timeout constraint.

**Partition Tolerance (P):** The system continues to operate despite an arbitrary number of
messages being dropped or delayed by the network between nodes. A partition is a
communication break -- a lost or temporarily delayed connection between two nodes or groups
of nodes.

### The Real Choice: CP or AP

The critical insight that Brewer himself clarified in 2012 is that CAP is not about
choosing two of three in normal operation. It is about what happens *during a network
partition*:

- **Network partitions are inevitable.** In any distributed system that spans more than one
  node, network failures will occur. Hardware fails, cables get cut, switches drop packets,
  cloud availability zones lose connectivity. Partition tolerance is not optional -- it is a
  given.

- **The real choice is binary.** When a partition occurs, the system must choose: respond to
  requests with potentially stale data (choose Availability, sacrifice Consistency) or refuse
  to respond until the partition heals and consistency can be confirmed (choose Consistency,
  sacrifice Availability).

- **During normal operation, all three are achievable.** When the network is healthy and no
  partitions exist, a well-designed system can be both consistent and available. The tradeoff
  only manifests during failures.

### PACELC: The Essential Extension

Daniel Abadi proposed the PACELC theorem in 2010 (published 2012) to address CAP's blind
spot. CAP says nothing about system behavior when there is *no* partition -- which is the
vast majority of the time. PACELC states:

> If there is a **P**artition, choose between **A**vailability and **C**onsistency;
> **E**lse, when the system is operating normally, choose between **L**atency and
> **C**onsistency.

This captures a fundamental truth: even without failures, replicating data across nodes
introduces latency. A system that waits for all replicas to acknowledge a write before
responding is consistent but slow. A system that responds after writing to one replica is
fast but temporarily inconsistent.

PACELC classifications:

| Classification | During Partition | Normal Operation | Example Systems |
|---------------|-----------------|-----------------|-----------------|
| **PA/EL** | Availability | Low Latency | DynamoDB, Cassandra, Riak |
| **PA/EC** | Availability | Consistency | --- |
| **PC/EL** | Consistency | Low Latency | --- |
| **PC/EC** | Consistency | Consistency | Google Spanner, CockroachDB, VoltDB |

PA/EL systems are the most common AP systems -- they optimize for speed and uptime at the
cost of strict consistency. PC/EC systems are the most common CP systems -- they never
compromise on correctness. The off-diagonal combinations (PA/EC, PC/EL) are rare because
the design philosophies that drive partition behavior tend to align with normal-operation
behavior.

### What CAP Does NOT Say

These are the most common and damaging misconceptions:

**Misconception 1: "Pick any two."** The original "pick 2 of 3" framing (often drawn as a
Venn diagram with CA, CP, and AP regions) is misleading. CA systems do not exist in
distributed computing because you cannot simply opt out of partitions. A single-node
PostgreSQL database is "CA" only because it is not distributed -- there is no network to
partition. The moment you add replication, you must handle partitions.

**Misconception 2: "A system is either CP or AP, full stop."** As Martin Kleppmann argued in
his influential 2015 essay "Please stop calling databases CP or AP," most real systems cannot
be cleanly classified. MongoDB with a single primary is CP for writes but different replicas
may serve stale reads. DynamoDB offers tunable consistency per request. A system's CAP
position can vary by operation, configuration, and even by individual request.

**Misconception 3: "CAP means you can never have consistency and availability."** You can have
both during normal operation. The tradeoff is only forced during a partition event. Google
Spanner demonstrates this: it is technically CP (it will sacrifice availability during a
partition) but achieves greater than 99.999% availability because Google's private network
infrastructure makes partitions extraordinarily rare.

**Misconception 4: "Availability in CAP means 'high availability' as SREs define it."** CAP's
definition of availability is very specific: every request to a non-failing node must receive
a response. It says nothing about response time. A system that takes 30 days to respond is
"available" by CAP's definition. This is why PACELC's addition of latency is so important
for practical system design.

**Misconception 5: "Consistency in CAP is the same as ACID consistency."** CAP consistency
means linearizability -- a specific property of read/write operations across replicas. ACID
consistency means transactions preserve database invariants (foreign keys, constraints). They
are different concepts that happen to share a name.

---

## When to Prioritize Consistency (CP Systems)

Choose consistency over availability when incorrect or stale data causes irreversible harm,
financial loss, or safety risks.

### Financial Systems and Banking

A bank transfer between accounts must be atomic. If a network partition occurs mid-transfer,
the system must refuse to process further transactions on those accounts rather than risk
double-spending or lost funds. When a customer checks their balance, they must see the actual
balance -- not a cached value from before a recent deposit. Banks universally choose CP
because the cost of an incorrect balance (regulatory penalties, customer trust, actual money
loss) far outweighs the cost of brief unavailability.

**Real-world example:** Traditional banking cores (Temenos, FIS) operate as CP systems. When
a branch cannot reach the central ledger, it queues transactions locally rather than
processing them optimistically. ATM networks use authorization holds -- a CP pattern --
rather than dispensing cash they cannot verify.

### Inventory and Booking Systems

An airline cannot sell the same seat twice. A hotel cannot book the same room to two guests.
An event venue cannot oversell beyond capacity. These systems require strong consistency
because the physical resource is finite and non-fungible.

**Real-world example:** Ticketmaster's seat reservation system uses strong consistency for
the booking operation. When a partition occurs between data centers, the system will reject
booking attempts rather than risk double-booking. However, the *browsing* portion of the
system (checking what seats are available) can tolerate eventual consistency -- showing a
seat as available when it was just booked is acceptable because the booking attempt will
be rejected at the consistent layer.

### Medical Records and Safety-Critical Systems

Patient medication records, dosage calculations, and allergy information cannot tolerate
stale reads. Administering a medication that was contraindicated by a recently-entered
allergy could be fatal. These systems choose CP and accept the operational burden of
unavailability during network issues.

### Leader Election and Coordination

Distributed coordination services like ZooKeeper and etcd are inherently CP. They implement
consensus protocols (ZAB, Raft) that sacrifice availability during partitions to ensure
that all nodes agree on the current state. This is necessary because their purpose is to
provide a single source of truth for configuration, leader election, and distributed locks.

### CP System Characteristics

| Property | Typical CP Behavior |
|----------|-------------------|
| Write path | Synchronous replication to a quorum before acknowledging |
| Read path | Read from leader, or read from follower with consistency check |
| During partition | Minority partition becomes read-only or fully unavailable |
| Recovery | Automatic once partition heals; no conflict resolution needed |
| Consensus protocol | Raft, Paxos, ZAB, or similar |
| Example databases | PostgreSQL (single-primary), CockroachDB, Google Spanner, etcd, ZooKeeper, HBase |

---

## When to Prioritize Availability (AP Systems)

Choose availability over consistency when the system must remain responsive at all costs
and temporary staleness or inconsistency is tolerable.

### Social Media Feeds and Content Platforms

When a user posts on a social platform, it is acceptable if followers in another region
see the post a few seconds or even minutes later. The platform must never show a user an
error page or refuse to load their feed because of a network issue between data centers.
Facebook, Twitter/X, and Instagram all prioritize availability for feed rendering.

**Real-world example:** If a user updates their profile picture on Facebook, other users
may see the old picture for a brief period. This is a deliberate design choice: the
alternative -- making the entire profile unavailable until all replicas confirm the new
picture -- would degrade the user experience far more than a few seconds of staleness.

### Caching Layers and CDNs

Content delivery networks are inherently AP systems. A CDN node serves cached content even
if it cannot reach the origin server. The content may be stale (an old version of a webpage,
an outdated product image) but serving stale content is vastly preferable to serving nothing.
DNS is another classic AP system -- DNS resolvers cache records and serve potentially stale
entries rather than failing when they cannot reach authoritative nameservers.

### Shopping Carts and Wishlists

Amazon's original Dynamo paper (2007) described the shopping cart as an AP use case. Items
added to a cart during a partition might temporarily diverge across replicas, but the system
resolges conflicts by merging (union of items) rather than discarding. A customer seeing a
previously removed item reappear in their cart is annoying; a customer being unable to add
items to their cart at all loses revenue.

### IoT Sensor Data and Telemetry

Sensor networks collecting temperature, humidity, or machine telemetry readings prioritize
availability. Missing a few readings or receiving them out of order is tolerable. Losing the
ability to ingest data at all -- because a network link between the collection tier and the
storage tier is down -- means losing irreplaceable time-series data.

### AP System Characteristics

| Property | Typical AP Behavior |
|----------|-------------------|
| Write path | Write to any available node; asynchronous replication |
| Read path | Read from any available node; may return stale data |
| During partition | Both sides of the partition continue serving reads and writes |
| Recovery | Conflict resolution via last-write-wins, vector clocks, CRDTs, or application-level merge |
| Conflict strategy | Merge, last-write-wins, or custom resolution |
| Example databases | Cassandra, DynamoDB (default), Riak, CouchDB, DNS |

---

## When NOT to Apply CAP

This section is as important as the sections above. CAP is frequently misapplied, leading
to poor architectural decisions.

### Single-Node Systems

CAP is a theorem about *distributed* systems. A single PostgreSQL instance, a single Redis
server, or a monolithic application with one database has no network partitions to worry
about. Applying CAP to these systems is a category error. If you have a single database
server with no replication, your concerns are durability (disk failure), capacity (can the
server handle the load), and recovery time -- not CAP tradeoffs.

**Common mistake:** A team chooses Cassandra "for availability" when they have a single
data center, a single application server, and modest data volumes. A single PostgreSQL
instance with good backups would serve them better, with simpler operations and stronger
consistency.

### Systems Where Partitions Are Handled by Infrastructure

Google Spanner is technically CP but achieves greater than 99.999% availability. How?
Google's private fiber network makes partitions so rare that the theoretical availability
sacrifice almost never materializes. Similarly, systems running within a single availability
zone in AWS with redundant networking face partition probabilities so low that designing
around partition behavior is not the dominant architectural concern.

**Key insight:** If your partition probability is 0.001%, designing your entire data model
around partition behavior is over-engineering. Focus on the tradeoffs that actually affect
your system daily: latency, throughput, operational complexity, and cost.

### Over-Simplification of "Just Pick CP or AP"

Real systems are not uniformly CP or AP. A well-designed system uses different consistency
levels for different operations:

- **E-commerce platform:** Product catalog browsing (AP -- eventual consistency is fine),
  inventory reservation (CP -- must be consistent), payment processing (CP -- must be
  consistent), order history display (AP -- slight delay is acceptable), recommendation
  engine (AP -- stale preferences are tolerable).

- **Ride-sharing application:** Driver location updates (AP -- eventual consistency, high
  frequency), ride matching (CP at the assignment moment -- cannot double-assign a driver),
  fare calculation (CP -- must be based on consistent trip data), trip history (AP -- can
  tolerate brief delays).

**Common mistake:** A team declares their entire system "AP" or "CP" and forces every
component into that mold, rather than making per-feature consistency decisions.

### When the Problem Is Actually Latency, Not Partitions

Many teams invoke CAP when their real problem is latency. They say "we chose AP for
availability" when they actually mean "we chose eventual consistency because synchronous
replication was too slow." This is a PACELC tradeoff (EL vs EC), not a CAP tradeoff (A vs C).
Conflating the two leads to architectural discussions where participants talk past each other.

### When Consensus Is the Real Requirement

If your system needs distributed transactions, global ordering of events, or leader election,
CAP is the wrong framework. You need to reason about consensus protocols (Raft, Paxos,
PBFT), their failure modes, and their performance characteristics. CAP tells you that
consensus is impossible during a partition -- which is true but not useful for designing the
consensus protocol itself.

### Real Examples of Teams Misapplying CAP

**Example 1: Choosing MongoDB "because it is CP."** A startup chose MongoDB for a social
media application specifically because they wanted consistency. But MongoDB with a replica
set is only CP for writes routed to the primary. Reads from secondaries return stale data
by default. The team did not configure read preferences correctly and ended up with an
effectively AP read path they did not intend, causing subtle bugs in their notification
system.

**Example 2: Choosing Cassandra "because it is AP" for financial data.** A fintech company
chose Cassandra for transaction records because they wanted "five nines of availability."
They did not realize that Cassandra's AP nature meant concurrent writes to the same
transaction record could conflict silently, with last-write-wins discarding earlier updates.
They discovered lost transactions during an audit and had to add an external coordination
layer (effectively rebuilding CP semantics on top of an AP database).

**Example 3: Ignoring the "Else" in PACELC.** A team chose a PC/EC database (CockroachDB)
for a latency-sensitive user-facing API. During normal operation (no partitions), every write
required cross-region consensus, adding 100-200ms of latency. Users complained about slow
response times. The team eventually moved user session data to a PA/EL store (Redis with
replication) while keeping financial data in CockroachDB -- a per-feature consistency
decision they should have made from the start.

---

## How It Works

### Partition Detection

A network partition is detected when nodes cannot communicate with each other within a
configured timeout. Detection mechanisms include:

1. **Heartbeat failure:** Nodes exchange periodic heartbeat messages. If a node misses
   several consecutive heartbeats from a peer, it suspects a partition.
2. **Quorum loss:** In consensus-based systems, if a node cannot reach a majority of peers,
   it knows it is on the minority side of a partition.
3. **Split-brain detection:** Some systems use a witness node, a shared disk, or a cloud
   API as a tiebreaker to determine which side of a partition is the "real" cluster.

The difficulty is distinguishing a true network partition from a slow node. A node that
takes 10 seconds to respond to a heartbeat might be overloaded, not partitioned. Most
systems use aggressive timeouts (seconds) to detect partitions quickly, accepting that some
slow nodes will be falsely flagged as partitioned.

### Consistency Levels: A Spectrum

Consistency is not binary. The following levels form a hierarchy from strongest to weakest:

**Linearizability (Strongest):**
All operations appear to execute atomically at some point between their invocation and
completion. There is a total order of operations consistent with real-time ordering. If
operation A completes before operation B begins, A appears before B in the total order. This
is what CAP means by "consistency." It requires coordination on every operation and is the
most expensive consistency level.

**Sequential Consistency:**
All operations appear to execute in some total order that is consistent with the program
order of each individual process, but this order need not respect real-time ordering. Two
clients may observe writes in different orders, as long as each client sees a sequence
consistent with the order it issued its own operations.

**Causal Consistency:**
Operations that are causally related must be seen in the same order by all nodes. Causally
unrelated (concurrent) operations may be seen in different orders by different nodes. If
process A writes X, and process B reads X and then writes Y, then X causally precedes Y and
all nodes must see X before Y. But if process C independently writes Z with no knowledge of
X or Y, Z may appear at any point.

**Read-Your-Writes Consistency:**
A client always sees its own writes. If client A writes a value, client A's subsequent reads
will reflect that write. Other clients may see stale data. This is often sufficient for web
applications where users primarily interact with their own data.

**Eventual Consistency (Weakest):**
If no new updates are made, all replicas will *eventually* converge to the same value. There
is no bound on how long "eventually" takes (though in practice it is usually seconds). During
the convergence window, different replicas may return different values. This is the cheapest
consistency level in terms of latency and availability.

### Availability Levels

| Level | Annual Downtime | Description |
|-------|----------------|-------------|
| 99% ("two nines") | 3.65 days | Acceptable for internal tools |
| 99.9% ("three nines") | 8.76 hours | Standard for most web applications |
| 99.95% | 4.38 hours | Typical SLA for cloud databases |
| 99.99% ("four nines") | 52.6 minutes | High-availability production systems |
| 99.999% ("five nines") | 5.26 minutes | Telecom, financial systems, Google Spanner |
| 99.9999% ("six nines") | 31.5 seconds | Theoretical; requires extraordinary infrastructure |

Note: CAP availability and SLA availability are different concepts. CAP availability means
every request to a non-failing node gets a response. SLA availability means the system
responds successfully within a defined latency threshold for a defined percentage of
requests over a time window.

### Real Database CAP/PACELC Positions

| Database | CAP Position | PACELC Position | Notes |
|----------|-------------|----------------|-------|
| **PostgreSQL** (single primary) | CP | PC/EC | Followers reject writes during partition; strong consistency always |
| **PostgreSQL** (Patroni HA) | CP | PC/EC | Automatic failover but still single-writer; fencing prevents split-brain |
| **MySQL** (Group Replication) | CP | PC/EC | Multi-primary mode exists but defaults to single-primary |
| **Cassandra** | AP | PA/EL | Tunable consistency (ONE, QUORUM, ALL) per query; default is eventual |
| **DynamoDB** | AP (default) | PA/EL | Supports strongly consistent reads per-request (costs 2x throughput) |
| **MongoDB** | CP-ish | PC/EC | Primary handles writes; reads from secondaries can be stale unless configured |
| **CockroachDB** | CP | PC/EC | Serializable isolation; Raft consensus for every write; geo-partitioned leaseholders reduce latency |
| **Google Spanner** | CP | PC/EC | TrueTime enables external consistency; >99.999% availability via network investment |
| **Redis** (replicated) | AP | PA/EL | Asynchronous replication; acknowledged writes can be lost on failover |
| **Redis** (Sentinel) | AP | PA/EL | Sentinel provides failover but does not prevent data loss during partition |
| **etcd** | CP | PC/EC | Raft consensus; minority partition is unavailable |
| **ZooKeeper** | CP | PC/EC | ZAB protocol; minority partition refuses requests |
| **CouchDB** | AP | PA/EL | Multi-master replication with conflict detection; user resolves conflicts |
| **Riak** | AP | PA/EL | Dynamo-inspired; vector clocks and CRDTs for conflict resolution |
| **ScyllaDB** | AP | PA/EL | Cassandra-compatible; same tunable consistency model, higher throughput |
| **TiDB** | CP | PC/EC | Raft-based; strong consistency with MySQL compatibility |
| **YugabyteDB** | CP | PC/EC | Raft consensus; PostgreSQL-compatible wire protocol |
| **FoundationDB** | CP | PC/EC | Strictly serializable; Apple's iCloud backend |

---

## Trade-Offs Matrix

| Decision | Choose Consistency When | Choose Availability When | Real-World Signal |
|----------|----------------------|------------------------|-------------------|
| **Data correctness** | A wrong answer is worse than no answer (finance, medical, legal) | A stale answer is better than no answer (feeds, search, analytics) | "Can we tolerate showing outdated data for 5 seconds?" |
| **Conflict resolution** | Conflicts are expensive or impossible to resolve after the fact (double-booking, double-spending) | Conflicts are cheap to resolve or merge (shopping carts, like counts, view counters) | "What happens if two replicas accept conflicting writes?" |
| **User expectations** | Users expect to see their most recent action immediately (bank balance after transfer) | Users tolerate brief delays (social feed not showing a just-posted comment) | "Will users call support if they see stale data?" |
| **Regulatory requirements** | Regulations demand audit trails with total ordering (SOX, PCI-DSS, HIPAA) | No regulatory ordering requirements (content platforms, IoT telemetry) | "Do auditors need to see a globally consistent timeline?" |
| **Failure blast radius** | Brief unavailability affects few users or is operationally manageable | Unavailability causes revenue loss, user churn, or SLA penalties | "What costs more: 30 seconds of downtime or 30 seconds of stale data?" |
| **Write frequency** | Writes are infrequent relative to the consensus latency budget | Writes are high-frequency and latency-sensitive | "Can we afford 50-200ms of consensus overhead per write?" |
| **Geographic distribution** | Users are geographically concentrated or latency is not the primary concern | Users are globally distributed and latency is critical | "Are our users within one region or spread across continents?" |
| **Operational complexity** | Team can operate consensus-based systems (monitoring, debugging split-brain, quorum management) | Team prefers simpler operational model (any-node-writes, no quorum) | "Does the team have experience operating Raft/Paxos-based systems?" |
| **Recovery cost** | Recovery from inconsistency is expensive (manual reconciliation, compensating transactions) | Recovery from inconsistency is automated (CRDTs, last-write-wins, merge functions) | "What does our conflict resolution procedure look like?" |
| **Data volume and velocity** | Moderate data volume where consensus overhead is acceptable | High data volume or velocity where consensus would be a bottleneck | "Are we writing 100 records/sec or 100,000 records/sec?" |

---

## Evolution Path

Most systems should start with strong consistency and deliberately relax it where the
tradeoffs justify the complexity.

### Phase 1: Start with Strong Consistency

Begin with a single-primary relational database (PostgreSQL, MySQL). Every read and write
goes through one node. There are no CAP tradeoffs because there is no distribution. This is
not a limitation -- it is a feature. You get linearizable consistency, ACID transactions, and
simple debugging. Most applications never outgrow this phase.

### Phase 2: Identify Read Paths That Tolerate Staleness

As traffic grows, identify read operations where eventual consistency is acceptable: product
catalog pages, user feeds, recommendation results, analytics dashboards. Route these reads
to replicas with asynchronous replication. Writes still go to the primary.

### Phase 3: Add Caching for AP Read Paths

Put a caching layer (Redis, Memcached) in front of read replicas for frequently accessed,
staleness-tolerant data. The cache is inherently AP: it serves stale data when it cannot
reach the database, and cache invalidation introduces a consistency window. The result is
a tiered read path: hot reads from cache (AP, sub-ms), warm reads from replica (near-
consistent, low-ms), and consistent reads from primary (CP, higher latency).

### Phase 4: Per-Feature Consistency Decisions

As the system grows, different features adopt different consistency models based on their
requirements. This is the mature state. Document each feature's consistency choice and
rationale. For example: authentication and payment processing use CP (PostgreSQL primary,
serializable isolation), inventory reservation uses CP (SELECT FOR UPDATE), while product
catalog (Elasticsearch via CDC), shopping cart (DynamoDB), recommendations (Redis), order
history (read replica), and notifications (WebSocket) all use AP with varying staleness
tolerances.

### Phase 5: Multi-Region with Tunable Consistency

For global scale, use databases that support per-operation consistency tuning. CockroachDB
with geo-partitioned leaseholders pins data to the region closest to the user, reducing
consensus latency. DynamoDB global tables provide eventual consistency across regions with
strong consistency available per-request within a region.

---

## Failure Modes

### Split-Brain from Incorrect Partition Handling

**What happens:** A network partition divides a cluster into two groups. Both groups elect a
leader and accept writes independently. When the partition heals, the system has two
divergent histories that cannot be automatically reconciled.

**Real-world example:** The 2013 GitHub outage was caused by a network partition that led to
a split-brain scenario in their MySQL cluster. Both sides of the partition accepted writes,
causing data inconsistencies that required manual intervention to resolve.

**Prevention:**
- Use odd-numbered clusters (3, 5, 7 nodes) so quorum is always a strict majority
- Implement fencing tokens -- when a new leader is elected, it gets a monotonically
  increasing token, and storage nodes reject writes from old leaders with stale tokens
- Use external witness services (cloud provider APIs, separate availability zone) as a
  tiebreaker
- Prefer consensus protocols (Raft, Paxos) that mathematically prevent split-brain over
  ad-hoc leader election

### Stale Reads Causing Business Logic Errors

**What happens:** A service reads stale data from an eventually consistent store and makes a
business decision based on that stale data. The decision is wrong because the data has since
changed.

**Example:** An inventory service reads available stock from a read replica (2 seconds behind
primary). It sees 5 units available and allows a purchase. But the primary already processed
4 other purchases, leaving only 1 unit. The system has now oversold.

**Prevention:**
- Route business-critical reads to the primary or a synchronous replica
- Use read-your-writes consistency for operations within a single user session
- Implement optimistic concurrency control (version numbers) so that writes based on stale
  reads fail at the write step
- Accept eventual consistency for the read (showing "5 in stock") but enforce consistency
  at the write (inventory decrement uses a compare-and-swap or database constraint)

### Unavailability Cascading Through the System

**What happens:** A CP data store becomes unavailable during a partition. Services that depend
on it also become unavailable. Services that depend on *those* services also become
unavailable. The blast radius expands exponentially.

**Example:** The user authentication service uses etcd (CP) for session validation. During a
partition, etcd's minority side is unavailable. All services in that zone cannot validate
sessions. The API gateway cannot authenticate requests. The entire zone is effectively down,
even though the application servers, databases, and network within the zone are healthy.

**Prevention:**
- Cache authentication tokens locally with a TTL so services can validate existing sessions
  during brief partitions
- Implement circuit breakers that allow degraded operation when a CP dependency is unavailable
- Design fallback paths: if the CP store is unreachable, degrade gracefully rather than
  failing completely
- Avoid putting CP systems on the critical path of every request

### Conflict Resolution Complexity in AP Systems

**What happens:** During a partition, both sides accept conflicting writes. When the partition
heals, the system must resolve these conflicts. Simple strategies (last-write-wins) lose
data. Complex strategies (application-level merge) introduce subtle bugs.

**Example:** Two users edit the same document during a partition. User A adds paragraph 3.
User B deletes paragraph 2. When the partition heals, the system must merge these changes.
Last-write-wins would discard one user's edits entirely. A naive merge might apply both
changes but produce a garbled document.

**Prevention:**
- Use CRDTs (Conflict-free Replicated Data Types) for data structures that can be
  mathematically merged without conflicts (counters, sets, registers)
- Design data models to be append-only where possible (event sourcing) so conflicts become
  a matter of ordering rather than overwriting
- Implement domain-specific merge functions that understand the semantics of the data
- Alert operators when conflicts occur so they can be reviewed, rather than silently
  applying a generic resolution strategy

### Timeout Misconfiguration

**What happens:** Partition detection timeouts set too aggressively cause healthy-but-slow
nodes to be flagged as partitioned, triggering unnecessary failovers. Timeouts set too
conservatively leave the system operating inconsistently for minutes without detection.

**Prevention:** Use adaptive timeouts (phi accrual failure detector, used by Cassandra and
Akka). Separate "suspicion" from "declared dead" thresholds. Monitor false-positive and
false-negative rates and tune accordingly.

---

## Technology Landscape

### CP Databases and When to Use Them

| Database | Consensus Protocol | Consistency Level | Best For |
|----------|-------------------|-------------------|----------|
| **PostgreSQL** (single primary + replicas) | N/A (single writer) | Linearizable (primary), eventual (replicas) | General-purpose OLTP, moderate scale |
| **CockroachDB** | Raft | Serializable (default), read-committed available | Global OLTP requiring strong consistency with PostgreSQL compatibility |
| **Google Spanner** | Paxos + TrueTime | External consistency (stronger than linearizable) | Global-scale OLTP where Google Cloud is acceptable |
| **TiDB** | Raft (via TiKV) | Snapshot isolation (default), configurable | MySQL-compatible distributed OLTP |
| **YugabyteDB** | Raft | Serializable (YSQL), tunable (YCQL) | PostgreSQL-compatible distributed OLTP |
| **FoundationDB** | Custom (OCC + Paxos) | Strictly serializable | Low-level key-value requiring strongest guarantees |
| **etcd** | Raft | Linearizable | Configuration management, service discovery, leader election |
| **ZooKeeper** | ZAB | Linearizable | Distributed coordination, lock management |

### AP Databases and When to Use Them

| Database | Replication Model | Conflict Resolution | Best For |
|----------|------------------|-------------------|----------|
| **Cassandra** | Gossip + hinted handoff | Last-write-wins (LWW) by default, LWTs available | High-throughput time-series, IoT, logs |
| **DynamoDB** | Multi-master (global tables) | Last-write-wins; strong reads available per-request | Serverless, key-value, session stores |
| **Riak** | Vnodes + hinted handoff | Vector clocks, CRDTs, sibling resolution | High availability key-value, session stores |
| **CouchDB** | Multi-master HTTP replication | Revision tree, deterministic winner, user-resolves conflicts | Offline-first mobile, document sync |
| **ScyllaDB** | Gossip (Cassandra-compatible) | Last-write-wins (Cassandra-compatible) | Cassandra workloads requiring lower latency |
| **Redis** (replicated) | Async primary-replica | Last-write-wins (no conflict detection) | Caching, session stores, pub/sub |

### Tunable Consistency Databases

These databases allow per-operation consistency tuning, which is the most practical approach
for systems with mixed consistency requirements:

| Database | Consistency Tuning Mechanism | Range |
|----------|---------------------------|-------|
| **Cassandra** | Per-query consistency level (ONE, TWO, THREE, QUORUM, ALL, LOCAL_QUORUM, EACH_QUORUM) | Full AP to near-CP |
| **DynamoDB** | `ConsistentRead: true` parameter on GetItem/Query | AP (default) or CP per request |
| **MongoDB** | Read concern (local, majority, linearizable) + write concern (w:1, w:majority, w:all) | Near-AP to CP |
| **YugabyteDB** | YSQL (serializable) vs YCQL (tunable, Cassandra-compatible) | CP (YSQL) or tunable (YCQL) |
| **Cosmos DB** | Five consistency levels (strong, bounded staleness, session, consistent prefix, eventual) | CP to AP in five steps |

---

## Decision Tree

Use this flowchart to determine the appropriate consistency model for a specific feature
or operation (not for the entire system):

```
START: What happens if this operation returns stale data?
  |
  |-- "Financial loss, safety risk, or regulatory violation"
  |     |
  |     --> Use STRONG CONSISTENCY (CP)
  |         |
  |         |-- Is this a global system with cross-region writes?
  |         |     |-- Yes --> CockroachDB, Spanner, YugabyteDB
  |         |     |-- No  --> PostgreSQL (single primary), MySQL with Group Replication
  |         |
  |         |-- Is this a coordination/config primitive?
  |               |-- Yes --> etcd, ZooKeeper
  |               |-- No  --> Use database above with serializable isolation
  |
  |-- "User confusion but no lasting harm"
  |     |
  |     --> Use SESSION CONSISTENCY (read-your-writes)
  |         |
  |         |-- Route user's reads to the same node that processed their writes
  |         |-- Or use sticky sessions with a bounded staleness guarantee
  |         |-- Example: User sees their own post immediately; followers see it within seconds
  |
  |-- "Minor inconvenience or unnoticeable"
  |     |
  |     --> Use EVENTUAL CONSISTENCY (AP)
  |         |
  |         |-- Can conflicts be automatically resolved?
  |         |     |-- Yes, with LWW  --> Cassandra, DynamoDB, Redis
  |         |     |-- Yes, with CRDTs --> Riak, custom implementation
  |         |     |-- No, needs manual merge --> CouchDB, application-level resolution
  |         |
  |         |-- Is this a cache?
  |               |-- Yes --> Redis, Memcached with TTL-based invalidation
  |               |-- No  --> Choose based on data model and query patterns
  |
  |-- "It depends on the specific field or context"
        |
        --> Use MIXED CONSISTENCY (tunable per-operation)
            |
            |-- Use Cosmos DB's five levels, or
            |-- Use DynamoDB with per-request ConsistentRead, or
            |-- Use separate databases for different consistency tiers
```

---

## Implementation Sketch

### Pattern: Consistency Tier Router

A middleware that routes requests to different data stores based on the consistency
requirement of each operation:

```python
from enum import Enum
from typing import Any, Optional

class ConsistencyLevel(Enum):
    STRONG = "strong"           # Linearizable reads from primary
    SESSION = "session"         # Read-your-writes within a session
    BOUNDED = "bounded"         # Staleness bounded by time or version
    EVENTUAL = "eventual"       # Read from any replica or cache

class ConsistencyRouter:
    """Routes data operations to the appropriate store based on
    the consistency level required by each operation."""

    def __init__(self, primary_db, read_replica, cache):
        self.primary = primary_db       # CP: PostgreSQL primary
        self.replica = read_replica     # Near-consistent: streaming replica
        self.cache = cache              # AP: Redis cache

    def read(self, key: str, level: ConsistencyLevel,
             session_id: Optional[str] = None) -> Any:
        if level == ConsistencyLevel.STRONG:
            # Always read from primary -- linearizable
            return self.primary.read(key)

        if level == ConsistencyLevel.SESSION:
            # Check if this session wrote recently
            last_write_ts = self.cache.get(f"session:{session_id}:lwt:{key}")
            if last_write_ts and self.replica.lag() > last_write_ts:
                # Replica has not caught up to this session's write
                return self.primary.read(key)
            return self.replica.read(key)

        if level == ConsistencyLevel.BOUNDED:
            # Read from replica if lag is within bounds
            if self.replica.lag_seconds() < 5:
                return self.replica.read(key)
            return self.primary.read(key)

        if level == ConsistencyLevel.EVENTUAL:
            # Try cache first, then replica, then primary
            cached = self.cache.get(key)
            if cached is not None:
                return cached
            value = self.replica.read(key)
            self.cache.set(key, value, ttl=60)
            return value

    def write(self, key: str, value: Any,
              session_id: Optional[str] = None) -> None:
        # Writes always go to primary (CP path)
        self.primary.write(key, value)

        # Record write timestamp for session consistency
        if session_id:
            self.cache.set(
                f"session:{session_id}:lwt:{key}",
                self.primary.current_lsn(),
                ttl=300
            )

        # Async cache invalidation (AP path)
        self.cache.delete(key)
```

### Pattern: Feature Consistency Declaration

Declare consistency requirements per feature in configuration, not in code, so they can
be reviewed and audited. Each entry specifies the consistency level, backing store,
optional staleness bound, conflict resolution strategy, and a rationale:

```yaml
# consistency-config.yaml
features:
  user_authentication:  { consistency: strong,   store: postgresql_primary, rationale: "Security-critical" }
  product_catalog:      { consistency: eventual, store: elasticsearch, max_staleness: 30s }
  inventory_check:      { consistency: bounded,  store: postgresql_replica, max_staleness: 2s }
  inventory_reservation:{ consistency: strong,   store: postgresql_primary, isolation: serializable }
  shopping_cart:        { consistency: session,  store: dynamodb, conflict_resolution: union_merge }
  recommendation_feed:  { consistency: eventual, store: redis_cache, max_staleness: 5m }
  payment_processing:   { consistency: strong,   store: postgresql_primary, isolation: serializable }
```

---

## Key Takeaways

1. **CAP is about partitions, not about normal operation.** During normal operation, a
   well-designed distributed system provides both consistency and availability. The
   tradeoff only manifests during network partitions.

2. **PACELC is the more useful model.** It captures the latency-consistency tradeoff that
   dominates day-to-day system design, not just the partition-time tradeoff.

3. **Per-feature, not per-system.** Choose consistency levels per feature, per operation,
   or even per request. No serious production system is uniformly CP or AP.

4. **Start consistent, relax deliberately.** Begin with strong consistency. Identify paths
   where eventual consistency is acceptable. Document the rationale for each relaxation.

5. **The real question is cost of inconsistency vs cost of unavailability.** For each
   feature, quantify what happens when data is stale versus what happens when the service
   is down. The answer determines your consistency choice.

---

## Cross-References

- **distributed-systems-fundamentals** -- Foundational concepts (replication, consensus, failure models) that underpin CAP
- **data-consistency** -- Deep dive into consistency models, isolation levels, and implementation patterns
- **consensus-and-coordination** -- Raft, Paxos, ZAB, and other protocols that implement CP guarantees
- **sql-vs-nosql** -- Database selection criteria beyond CAP, including data model, query patterns, and operational concerns

---

## Sources

- Brewer, E. (2000). "Towards Robust Distributed Systems." ACM PODC Keynote.
- Gilbert, S. and Lynch, N. (2002). "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services."
- Brewer, E. (2012). "CAP Twelve Years Later: How the 'Rules' Have Changed." IEEE Computer.
- Abadi, D. (2012). "Consistency Tradeoffs in Modern Distributed Database System Design." IEEE Computer.
- Kleppmann, M. (2015). ["Please stop calling databases CP or AP."](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html)
- Corbett, J. et al. (2013). ["Spanner, TrueTime and the CAP Theorem."](https://research.google/pubs/spanner-truetime-and-the-cap-theorem/) Google Research.
- DeCandia, G. et al. (2007). "Dynamo: Amazon's Highly Available Key-value Store." SOSP.
- [CAP Theorem -- Wikipedia](https://en.wikipedia.org/wiki/CAP_theorem)
- [PACELC Theorem -- Wikipedia](https://en.wikipedia.org/wiki/PACELC_design_principle)
- [Jepsen: Consistency Models](https://jepsen.io/consistency)
- [Consistency and Partition Tolerance -- ByteByteGo](https://blog.bytebytego.com/p/consistency-and-partition-tolerance)
- [CAP Theorem -- IBM](https://www.ibm.com/think/topics/cap-theorem)
- [PACELC Theorem -- ScyllaDB](https://www.scylladb.com/glossary/pacelc-theorem/)
- [Strong Consistency Models -- Aphyr](https://aphyr.com/posts/313-strong-consistency-models)
