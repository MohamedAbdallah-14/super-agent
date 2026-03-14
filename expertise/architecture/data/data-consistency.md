# Data Consistency — Architecture Expertise Module

> Data consistency defines the guarantees about whether all parts of a system see the same data at the same time. The spectrum ranges from strong consistency (every read sees the latest write) to eventual consistency (reads may see stale data temporarily). This is the hardest trade-off in distributed systems and the source of the most subtle production bugs. Getting consistency wrong does not produce loud failures — it produces silent corruption, phantom states, and business logic that "works" until it costs you money.

> **Category:** Data
> **Complexity:** Complex
> **Applies when:** Any system with more than one data store, any distributed system, any system with concurrent writes, any system using caching, any system where two services share ownership of a business invariant

---

## What This Is

### The Consistency Spectrum

Consistency is not binary. It is a spectrum of guarantees, each with different costs. Understanding the spectrum is prerequisite to making any rational architecture decision about data.

**Linearizability (Strongest).** Every operation appears to take effect instantaneously at some point between its invocation and its response. Once a write completes, every subsequent read — from any node, any client, any region — sees that write. This is the gold standard. It is also the most expensive guarantee to provide because it requires global coordination on every operation. Google Spanner achieves this using atomic clocks (TrueTime) and GPS receivers in every data center. CockroachDB approximates it using hybrid logical clocks with bounded clock skew. The cost: cross-region writes in Spanner take 10-15ms minimum due to the coordination round-trip, and CockroachDB cannot guarantee external consistency for transactions involving non-overlapping keys.

**Sequential Consistency.** All operations appear in some total order that is consistent with the program order of each individual client. The key difference from linearizability: the total order does not need to respect real-time ordering across clients. If client A writes a value and then calls client B on the phone to say "I wrote it," sequential consistency does not guarantee that client B's next read sees the write. Linearizability does. In practice, few systems explicitly offer sequential consistency as a named guarantee, but many systems behave this way under certain configurations.

**Causal Consistency.** Operations that are causally related are seen by all nodes in the same order. Operations that are not causally related (concurrent) may be seen in different orders by different nodes. "Causally related" means: if operation A could have influenced operation B (A happened before B in the same session, or B read a value written by A), then every node must see A before B. This is strictly weaker than sequential consistency but captures the ordering that humans intuitively expect. MongoDB offers causal consistency sessions. CRDT-based systems like Riak often provide causal consistency.

**Read-Your-Writes Consistency.** A client always sees its own writes. If you update your profile name and immediately reload the page, you see the new name — even if other users might briefly see the old one. This is the minimum consistency level that prevents users from thinking the system is broken. It says nothing about what other clients see. DynamoDB's strongly consistent reads provide this. Many systems implement it by routing a client's reads to the same replica that handled the write, or by tracking a write timestamp and waiting for replicas to catch up.

**Monotonic Reads.** Once a client has seen a value, it never sees an older value in subsequent reads. Without this guarantee, a user could refresh a page and see data "go backwards" — a comment appears, then disappears, then reappears. This happens in systems where reads are load-balanced across replicas with different replication lag. Session affinity (sticky sessions) is the most common way to provide monotonic reads.

**Eventual Consistency (Weakest Named Model).** If no new updates are made to a given data item, eventually all reads will return the last updated value. This is a liveness guarantee only — it says something good will eventually happen, but it provides no safety guarantees about what happens in the meantime. Any intermediate value is legal. Any ordering of intermediate values is legal. The convergence time is unbounded. DNS is the most widely deployed eventually consistent system. DynamoDB's default read mode is eventually consistent. Cassandra with quorum reads offers tunable consistency but defaults to eventual.

### ACID vs. BASE: Two Philosophies

**ACID** (Atomicity, Consistency, Isolation, Durability) is the traditional database transaction model. Critically, "Consistency" in ACID means something different from "Consistency" in CAP theorem or in the models above. ACID consistency means that a transaction moves the database from one valid state to another — it preserves application-defined invariants (foreign keys, unique constraints, check constraints). ACID is a property of a single database. It says nothing about distributed systems.

**BASE** (Basically Available, Soft-state, Eventually consistent) is the alternative philosophy for distributed systems that prioritize availability. It accepts that the system's state may be in flux and that consistency will be achieved over time rather than per-transaction. BASE is not an acronym anyone designed carefully — it was coined as a contrast to ACID. The real content is: accept temporary inconsistency in exchange for availability and partition tolerance.

The confusion between ACID consistency and CAP consistency causes more architectural mistakes than any other terminology problem in distributed systems. ACID consistency is about invariant preservation within a single database. CAP consistency is about whether all nodes see the same data at the same time. A system can be ACID-compliant locally and eventually consistent globally.

---

## When to Use Strong Consistency

### The Non-Negotiable Cases

Apply strong consistency when the cost of even temporary inconsistency exceeds the cost of reduced availability or increased latency. The test is not "would inconsistency be inconvenient?" but "would inconsistency cause irrecoverable harm?"

**Financial transactions and account balances.** A bank account with $100 receives two concurrent withdrawal requests for $80 each. Under eventual consistency, both reads see $100, both approve, and the account goes to -$60. Under strong consistency, the second transaction sees the result of the first and is rejected. This is not a theoretical concern — it is the fundamental reason banking systems have always used serializable transactions. Payment processors like Stripe use strongly consistent datastores for balance tracking and ledger writes.

**Inventory management and reservation systems.** An e-commerce platform with one unit of a limited-edition item receives two concurrent purchase requests. Under eventual consistency, both succeed, creating an oversell. One customer receives the item; the other receives an apology email and a refund. This damages trust and may violate consumer protection regulations. Amazon's inventory system uses strong consistency for stock decrement operations even though most of Amazon's infrastructure is famously eventually consistent. The consistency boundary is drawn precisely at the point where money changes hands.

**Booking and scheduling systems.** A hotel room, a flight seat, a doctor's appointment slot — these are unique resources that cannot be double-allocated. The "sorry, that slot was just taken" experience is acceptable when shown immediately. The "your booking was confirmed but actually someone else got it" experience is not. Airlines use strongly consistent systems for seat assignment even when the rest of the booking flow uses eventual consistency.

**Unique constraint enforcement.** Usernames, email addresses, phone numbers, license plates, serial numbers — anything that must be globally unique requires a single source of truth that is consulted synchronously. If two users simultaneously register with the same username under eventual consistency, both succeed, and the system must later resolve the conflict — often by locking one user out of their account.

**Distributed locking and leader election.** When exactly one node must hold a lock or be the leader, the system that manages the lock must be strongly consistent. This is why etcd, ZooKeeper, and Consul use consensus protocols (Raft, Paxos/ZAB) internally. A lock service that is eventually consistent is not a lock service — it is a suggestion service.

**Sequential processing guarantees.** When events must be processed in exact order — financial ledger entries, legal audit trails, compliance event logs — the ordering guarantee requires strong consistency at the sequencing layer. Out-of-order processing of a credit followed by a debit (seen as debit-then-credit) can trigger overdraft fees, fraud alerts, or regulatory violations.

---

## When to Use Eventual Consistency

### Where Temporary Staleness Is Acceptable

Eventual consistency is not a compromise — it is a deliberate architectural choice that unlocks availability, latency, and scalability that strong consistency cannot provide.

**Social media feeds and timelines.** If a user posts a photo and their friend sees it 2 seconds later instead of immediately, no business value is lost. Twitter/X, Instagram, and Facebook all use eventually consistent feeds. The feed is a materialized view assembled from many sources — the post service, the follow graph, the ranking algorithm. Requiring strong consistency across all of these would make feeds unservably slow.

**Analytics and reporting dashboards.** A dashboard showing "orders in the last 24 hours" does not need real-time consistency. A 30-second lag is invisible to the user and allows the analytics pipeline to batch-process events efficiently. Most business intelligence systems operate on eventually consistent data warehouses (Snowflake, BigQuery, Redshift) refreshed on a schedule.

**Content delivery and caching.** CDN-cached content is inherently eventually consistent. When you update a blog post, edge nodes around the world serve the old version until their cache TTL expires. This is not a bug — it is the fundamental mechanism that makes CDNs fast. Fighting this with aggressive cache invalidation reintroduces the coordination costs that caching was meant to avoid.

**Notification systems.** Email, push notifications, SMS alerts — these are inherently asynchronous and tolerant of delay. A notification delivered 5 seconds late is indistinguishable from one delivered on time. Notification systems that try to be strongly consistent with the source event create coupling that makes both systems fragile.

**Search indexes.** When a product is added to a catalog, the search index does not need to reflect it instantly. Elasticsearch, Solr, and Algolia all operate as eventually consistent read replicas of the source of truth. A product being unsearchable for a few seconds after creation is a non-event. A search index that blocks catalog writes until the index is updated is a catastrophe waiting to happen.

**User presence and activity indicators.** "Online," "typing," "last seen 5 minutes ago" — these are inherently approximate. Showing a user as "online" for 30 seconds after they close the app is not a bug worth solving with distributed consensus.

**Recommendation engines.** Whether a recommendation algorithm uses data from 1 second ago or 10 seconds ago has negligible impact on recommendation quality. Recommendation systems process events in batch or micro-batch (Spark, Flink) and serve results from a pre-computed, eventually consistent store.

---

## When NOT to Use Eventual Consistency

This section is as important as the previous one. Eventual consistency is frequently chosen for systems where it creates subtle, expensive, hard-to-diagnose bugs. The failure mode is not "the system crashes" — it is "the system silently does the wrong thing 0.1% of the time, and that 0.1% costs millions."

### The Oversell Problem

An e-commerce platform uses eventual consistency for inventory counts. Under normal load, replication lag is 50ms and no one notices. During a flash sale, lag spikes to 5 seconds. In those 5 seconds, 200 customers purchase the last 50 units of a limited item. 150 orders must be cancelled after confirmation. Customers who cleared their schedule to participate in the sale receive cancellation emails. Trust is destroyed. Social media backlash follows. This is not hypothetical — it is a recurring pattern in flash sale systems that underestimate the consistency requirements of inventory decrement under high concurrency.

### The Double-Charge Problem

A payment service uses eventual consistency between the payment intent service and the ledger service. A customer clicks "pay" twice due to a slow page load. Both requests hit different nodes. Both nodes check the ledger — neither sees the other's pending charge because replication has not converged. The customer is charged twice. The refund process takes 5-10 business days. The customer disputes the charge with their bank, triggering a chargeback process that costs the merchant $15-25 in fees regardless of the refund.

### The Ghost State Problem

A microservices system uses eventual consistency between the order service and the shipping service. A customer cancels an order. The order service marks it as cancelled. The shipping service, reading from a stale replica, does not see the cancellation and ships the item. The customer receives an item they cancelled, must arrange a return, and loses confidence in the system. The company pays for shipping both ways. This pattern is so common in microservice architectures that it has a name: the "ghost state" problem — an entity exists in a state that should be impossible given the current state of the system.

### The Stale Read → Write Problem

A service reads an entity from an eventually consistent projection to perform an update. The projection is 500ms behind the source. The service reads stale data, applies a transformation to it, and writes the result back. The transformation overwrites changes that were made in the 500ms gap. This is a lost update, and it is permanent — unlike the temporary inconsistency that eventual consistency promises will resolve, this data loss is irrecoverable because the stale read was used as input to a new write.

### The Consistency Boundary Rule

The general principle: eventual consistency is safe when the consumer of stale data is a human (who can refresh, retry, or tolerate delay). Eventual consistency is dangerous when the consumer of stale data is another service that makes automated decisions based on it. Machines act on stale data immediately and irrevocably. Humans notice and compensate.

---

## How It Works

### Two-Phase Commit (2PC)

The oldest distributed transaction protocol. A coordinator asks all participants to prepare (vote yes/no), then tells them all to commit or abort based on the unanimous vote.

**Phase 1 (Prepare):** The coordinator sends a prepare request to all participants. Each participant executes the transaction locally, acquires locks, writes to a local transaction log, and votes yes or no. The locks are held until phase 2 completes.

**Phase 2 (Commit/Abort):** If all participants voted yes, the coordinator sends commit. If any voted no, the coordinator sends abort. Participants release locks after completing the commit/abort.

**The fundamental problems with 2PC:**

1. **Blocking on coordinator failure.** If the coordinator crashes after collecting votes but before sending the commit/abort decision, all participants hold their locks indefinitely. They cannot unilaterally decide to commit (another participant might have voted no) or abort (they might have all voted yes). The system is stuck until the coordinator recovers. This is not a theoretical concern — it is the reason 2PC has been largely abandoned for cross-service transactions in microservice architectures.

2. **Latency.** 2PC requires at minimum 2 round-trips between coordinator and every participant. In a system with 5 participants across 3 regions, this can take 200-400ms per transaction. For comparison, a local PostgreSQL transaction takes 1-5ms.

3. **Lock duration.** Locks are held for the entire duration of both phases. In microservices, where participants include external services with unpredictable latency (payment gateways, shipping APIs), locks can be held for seconds. During that time, all other transactions touching the same data are blocked.

4. **Homogeneity requirement.** 2PC requires all participants to implement the XA transaction protocol. This works when all participants are relational databases. It does not work when participants include a message queue, a cache, an external API, and a NoSQL store.

### Three-Phase Commit (3PC)

3PC adds a pre-commit phase between voting and committing to reduce the blocking window. In theory, it allows participants to make progress if the coordinator fails. In practice, 3PC is rarely implemented because it does not handle network partitions correctly — in a partition, different sides can reach different decisions (one side commits, the other aborts), producing inconsistency. 3PC solves the blocking problem of 2PC at the cost of potentially violating consistency — the opposite of the intended trade-off.

### Consensus Protocols (Paxos, Raft)

Consensus protocols solve the problem of getting a group of nodes to agree on a value in the presence of failures. Unlike 2PC, they can make progress as long as a majority of nodes are available (they tolerate minority failures).

**Paxos** (Lamport, 1989): The foundational consensus protocol. Notoriously difficult to understand and implement correctly. Google uses Multi-Paxos internally for Spanner, Chubby, and Megastore. The key insight: a value is chosen when a majority of acceptors accept the same proposal. This guarantees safety (only one value is chosen) even under arbitrary message delays and node failures.

**Raft** (Ongaro & Ousterhout, 2014): Designed explicitly for understandability. Decomposes consensus into leader election, log replication, and safety. Used by etcd (Kubernetes), CockroachDB, TiDB, and Consul. Raft achieves the same safety guarantees as Paxos but with a clearer separation of concerns. The leader handles all client requests and replicates to followers. If the leader fails, a new election occurs. During election, the system is briefly unavailable for writes (typically <1 second).

### The Saga Pattern

Sagas replace a single distributed transaction with a sequence of local transactions, each with a compensating transaction that undoes its effect if a later step fails.

**Orchestration-based sagas:** A central orchestrator directs the sequence. The orchestrator calls service A, waits for success, calls service B, waits for success, and so on. If service C fails, the orchestrator calls compensating transactions for B and A in reverse order. The orchestrator is a single point of coordination but not a single point of failure (it can be replicated and its state can be persisted).

**Choreography-based sagas:** Each service listens for events and acts independently. Service A completes and emits an event. Service B hears the event, does its work, and emits its own event. If service C fails, it emits a failure event, and services B and A hear it and execute their compensating transactions. No central coordinator. More decoupled. Harder to debug and reason about because the saga's state is distributed across event logs.

**The critical limitation of sagas:** Between the time a local transaction commits and the compensating transaction executes (if needed), the system is in an inconsistent state. A hotel room is booked but the flight is not yet confirmed. A payment is charged but the order is not yet created. This intermediate state is visible to other transactions and to users. Sagas provide eventual consistency, not atomicity. Designing compensating transactions that are correct, idempotent, and commutative is the hardest part of saga implementation.

### The Transactional Outbox Pattern

The outbox pattern solves the dual-write problem: when a service needs to update its database AND publish an event, and both must happen or neither must happen.

**How it works:** Instead of publishing the event directly to a message broker, the service writes the event to an "outbox" table in the same database, within the same local transaction as the business data change. A separate process (a poller or a CDC connector) reads the outbox table and publishes events to the message broker. Because the business write and the outbox write are in the same transaction, they are atomic. The outbox reader provides at-least-once delivery.

**Implementation with Change Data Capture (CDC):** Instead of polling the outbox table, a CDC tool like Debezium reads the database's transaction log (WAL in PostgreSQL, binlog in MySQL) and streams changes to Kafka. This eliminates the polling overhead and captures changes with very low latency (sub-second). Debezium's outbox event router is purpose-built for this pattern.

**Why this matters for consistency:** The outbox pattern converts the impossible problem of distributed atomicity (database + message broker) into the solved problem of local atomicity (single database transaction) plus reliable delivery (at-least-once with idempotent consumers). It is the most practical consistency pattern for microservice event-driven architectures.

### Read-After-Write Consistency Techniques

When a system uses eventually consistent replicas for reads but needs read-your-writes consistency:

1. **Read from the leader after writing.** For a configurable window after a write (e.g., 5 seconds), route that client's reads to the primary/leader node. After the window, resume reading from replicas. This is a common pattern with PostgreSQL streaming replication.

2. **Track the write position.** After a write, return the WAL position (LSN in PostgreSQL) to the client. On subsequent reads, the client passes this position and the replica waits until it has replicated past that point before serving the read. This is how Amazon Aurora provides read-after-write consistency across read replicas.

3. **Session affinity.** Route all requests from the same session to the same replica. As long as that replica is not further behind than the write latency, the user sees their own writes. This breaks if the replica fails over.

### Compensating Transactions

When a saga step fails and previous steps must be undone, compensating transactions reverse the effect of committed local transactions. Key design requirements:

- **Idempotency.** A compensating transaction may be retried (the message broker delivers the compensation command more than once). It must produce the same result regardless of how many times it runs.
- **Commutativity.** If multiple compensating transactions execute concurrently, the final state must be correct regardless of order.
- **Semantic reversal, not undo.** A compensating transaction for "charge $100" is "refund $100," not "delete the charge record." The original action happened and must remain in the audit trail.

---

## Trade-Offs Matrix

| Dimension | Strong Consistency | Eventual Consistency | Notes |
|---|---|---|---|
| **Availability** | Lower — cannot serve requests during partitions if it must guarantee consistency (CP in CAP) | Higher — can serve requests from any replica, even during partitions (AP in CAP) | CAP theorem makes this a hard physical constraint, not a design choice |
| **Latency (writes)** | Higher — writes require coordination across replicas before acknowledging (10-400ms for geo-distributed) | Lower — writes acknowledge after local commit (1-5ms), replicate asynchronously | Spanner: ~14ms global write. DynamoDB eventual: ~5ms write |
| **Latency (reads)** | Can be higher if reads must go to leader; comparable if read replicas are used with version tracking | Lower — any replica can serve reads immediately | Read-your-writes adds modest latency (~1-2ms for version check) |
| **Scalability (write)** | Limited — all writes go through consensus or coordination, creating a throughput ceiling | Higher — writes can be distributed across nodes without coordination | CockroachDB: ~7,000 writes/sec per range. Cassandra: ~50,000+ writes/sec per node |
| **Scalability (read)** | Comparable — read replicas can serve reads if staleness is acceptable for non-critical reads | Higher — more replicas = more read throughput with no consistency overhead | Many systems use strong writes + eventual reads as a hybrid |
| **Correctness guarantees** | Absolute — every read sees the latest write; invariants are always maintained | Probabilistic — most reads see the latest write; invariants may be temporarily violated | "Temporarily" can mean milliseconds or minutes depending on load |
| **Operational complexity** | Higher — consensus protocols, leader election, split-brain prevention | Lower setup, but higher debugging complexity when consistency bugs occur | Eventual consistency bugs are intermittent and hard to reproduce |
| **Data loss risk** | Lower — acknowledged writes are durable across multiple replicas | Higher — if a node fails before replication, acknowledged writes can be lost | Async replication = data loss window equal to replication lag |
| **Cost** | Higher — requires more network round-trips, more capable hardware, possibly specialized infrastructure (Spanner's TrueTime) | Lower — commodity hardware, simple replication | The cost difference narrows with managed cloud databases |
| **Developer cognitive load** | Lower — the system behaves like a single machine; reasoning about correctness is straightforward | Higher — developers must reason about stale reads, race conditions, and convergence | Most consistency bugs come from developers who think "eventual" means "fast enough" |

---

## Evolution Path

### Stage 1: Single Database (Strong by Default)

Start with a single PostgreSQL or MySQL instance. All reads and writes go to one node. Consistency is trivially strong. This is correct for most applications at launch. Do not introduce distributed consistency concerns until the system genuinely needs to scale beyond what one database can handle.

**When to graduate:** When read traffic exceeds what one node can serve (typically 5,000-20,000 queries/second depending on query complexity), or when you need high availability (zero-downtime deployments, failover).

### Stage 2: Read Replicas (Introducing Replication Lag)

Add read replicas for read-heavy workloads. Writes go to the primary; reads are distributed across replicas. Replication lag introduces eventual consistency for reads. This is the moment most teams first encounter consistency bugs.

**Key decisions at this stage:**
- Route reads to the primary for a configurable window after writes (read-after-write consistency).
- Use session affinity to ensure monotonic reads.
- Monitor replication lag and alert when it exceeds a threshold (e.g., 1 second).
- Accept that analytics queries on replicas may see slightly stale data.

### Stage 3: Multi-Service (Distributed Consistency Required)

As the system evolves into multiple services with separate databases, cross-service consistency becomes the central challenge. Each service owns its data and controls its consistency model.

**Key decisions at this stage:**
- Identify which operations require cross-service consistency (usually: anything involving money, inventory, or unique resources).
- Implement the outbox pattern for reliable event publishing.
- Use sagas for cross-service workflows that require atomicity.
- Accept eventual consistency for non-critical cross-service reads (feed assembly, search indexing, analytics).
- Establish clear ownership: one service is the source of truth for each piece of data.

### Stage 4: Multi-Region (Geo-Distributed Consistency)

When the system spans multiple geographic regions, the speed of light becomes the consistency bottleneck. A round-trip between US-East and EU-West takes ~80ms. Consensus across 3 regions takes ~160ms minimum.

**Key decisions at this stage:**
- Use global consensus (Spanner, CockroachDB) only for data that truly requires global strong consistency (user accounts, billing, configuration).
- Use regional strong consistency with cross-region eventual consistency for data that is region-primary (user content, session data).
- Implement conflict resolution strategies for multi-region writes (last-writer-wins, CRDTs, application-level merge).
- Accept that some operations will have higher latency and design UX accordingly (optimistic UI with reconciliation).

### Stage 5: Hybrid Consistency (Per-Path Tuning)

Mature systems apply different consistency models to different data paths within the same application. This is the most sophisticated and most correct approach.

**Examples:**
- **Strong:** Account balance, inventory count, seat reservation.
- **Causal:** Chat messages (within a conversation), collaborative document edits.
- **Read-your-writes:** User profile updates, order status after placing an order.
- **Eventual:** Social feed assembly, search index, recommendation scores, analytics dashboards.

This per-path approach maximizes both correctness and performance by applying the minimum consistency level that satisfies each path's business requirements.

---

## Failure Modes

### Split-Brain

**What it is:** A network partition causes a cluster to divide into two (or more) sub-clusters, each believing it is the active cluster. Both sub-clusters accept writes independently, creating divergent data states.

**Real incident — GitLab (documented post-mortem):** A PostgreSQL cluster experienced a connectivity loss that caused Pacemaker to lose track of the master node. Pacemaker failed over, electing a new master (DB5) while the original master (DB4) continued operating. Both databases acted as master for approximately 30 minutes. Writes that went to DB5 during this period were lost when the split-brain was resolved, because DB5 was designated the "victim" during reconciliation. The data loss window spanned about 6 hours of operations.

**Prevention:** Quorum-based systems (Raft, Paxos) prevent split-brain by requiring a majority to make progress. The minority partition cannot elect a leader and stops accepting writes. Fencing mechanisms (STONITH — "Shoot The Other Node In The Head") forcefully shut down nodes that might be operating independently. AWS RDS Multi-AZ uses synchronous replication to the standby, ensuring the standby has all data before a failover.

### Lost Updates

**What it is:** Two concurrent transactions read the same value, modify it independently, and write back. The second write overwrites the first, losing the first transaction's update.

**Classic example:** Two users read a wiki page (version 5), edit different sections, and save. The second save creates version 6 from their edit of version 5, silently discarding the first user's changes. This is why collaborative editing systems (Google Docs, Notion) use operational transforms or CRDTs rather than read-modify-write cycles.

**Prevention:** Optimistic concurrency control (version numbers / ETags). Each record carries a version number. On update, the client sends the version it read. The database rejects the update if the current version does not match (409 Conflict). The client must re-read, re-apply its changes, and retry.

### Write Skew

**What it is:** Two concurrent transactions each read an overlapping data set, make disjoint updates based on what they read, and both commit. Neither transaction's update conflicts with the other's update at the row level, but together they violate a business invariant.

**Classic example — the on-call doctor problem:** A hospital requires at least one doctor on call at all times. Two doctors (Alice and Bob) are both on call. Alice checks: "Is another doctor on call? Yes (Bob). I can remove myself." Concurrently, Bob checks: "Is another doctor on call? Yes (Alice). I can remove myself." Both transactions commit. Zero doctors are on call. No row-level conflict occurred — Alice updated her own row, Bob updated his own row. But the cross-row invariant (at least one doctor on call) is violated.

**Another example — the banking overdraft:** Two accounts held by one person, each with $100. The bank's rule: the combined balance must be >= 0. Two concurrent withdrawals of $200 each, one from each account. Each transaction checks the total ($200), approves the withdrawal, and commits. Final state: both accounts at -$100, combined balance -$200. The invariant is violated.

**Prevention:** Serializable isolation level. PostgreSQL's Serializable Snapshot Isolation (SSI) detects write skew by tracking the read sets of concurrent transactions and aborting one if their combined writes could violate serializability. Oracle does NOT detect write skew — its "Serializable" isolation level is actually Snapshot Isolation, which is susceptible to this anomaly. This is a critical distinction when choosing databases for applications with cross-row invariants.

### Phantom Reads

**What it is:** A transaction reads a set of rows matching a condition, another transaction inserts a new row matching that condition, and the first transaction re-reads and sees a different set of rows. The "phantom" is the new row that appeared between reads.

**Impact:** Phantom reads break aggregate calculations, range queries, and any logic that depends on the completeness of a result set. A report that sums all orders placed today may miss orders inserted between the range query and the sum.

**Prevention:** Serializable isolation or predicate locking. PostgreSQL SSI handles this. Repeatable Read in PostgreSQL (which is actually Snapshot Isolation) prevents phantoms for snapshot queries but not for modifications that depend on the absence of rows.

### Dirty Reads

**What it is:** A transaction reads data written by another transaction that has not yet committed. If the writing transaction rolls back, the reading transaction has acted on data that never existed.

**Prevention:** Any isolation level above Read Uncommitted prevents dirty reads. This is the least concerning anomaly because virtually all production databases default to at least Read Committed.

### Stale Read Cascades

**What it is:** A service reads stale data from an eventually consistent store and uses it as input for a write operation or a decision that propagates to other services. The staleness is not corrected by eventual convergence because the stale read has already been consumed and acted upon.

**Example:** Service A reads a user's subscription tier from a cache (stale: still shows "premium"). Service A grants the user premium-tier access. The user's subscription actually expired 2 minutes ago. The access grant is logged, billed, and cannot be automatically revoked because Service B (billing) sees the user as expired but Service C (access) sees an active grant from Service A.

**Prevention:** For decisions with business consequences, always read from the source of truth, not from caches or eventually consistent projections. Use the CQRS principle: queries can be eventually consistent, but commands must validate against strongly consistent state.

---

## Technology Landscape

### Relational Databases

**PostgreSQL** — Offers true Serializable Snapshot Isolation (SSI), the strongest isolation level available in any mainstream database. SSI detects read-write conflicts including write skew and phantom reads without the performance penalty of traditional two-phase locking. PostgreSQL also offers Read Committed (default), Repeatable Read (actually Snapshot Isolation), and Serializable. Streaming replication is asynchronous by default (eventual consistency for replicas) but can be configured as synchronous (strong consistency at the cost of write latency).

**MySQL/InnoDB** — Default isolation is Repeatable Read with gap locking. This prevents phantoms for locking reads but not for snapshot reads. MySQL Group Replication (MGR) provides synchronous replication with Paxos-based consensus for multi-primary setups. The XA transaction protocol is supported for distributed transactions across multiple MySQL instances.

### NewSQL / Distributed SQL

**Google Cloud Spanner** — Globally distributed with linearizable consistency achieved via TrueTime (atomic clocks + GPS in every data center). External consistency for all transactions — if transaction T1 commits before T2 starts, T2 sees T1's effects. Write latency: ~7ms in a single region, ~14ms globally. The gold standard for strong consistency at global scale, but requires Google's infrastructure.

**CockroachDB** — Distributed SQL with serializable isolation by default. Uses Raft for consensus. Provides serializable transactions and read-after-write consistency without atomic clocks. The key trade-off vs. Spanner: CockroachDB cannot guarantee external consistency for transactions on non-overlapping keys because it lacks TrueTime. In practice, this matters only for workloads where the real-time ordering of independent transactions is critical. For most applications, CockroachDB's guarantees are indistinguishable from Spanner's.

**TiDB** — MySQL-compatible distributed SQL using Raft. Default isolation is Snapshot Isolation (repeatable read). Offers pessimistic and optimistic transaction modes. Strong consistency within a Raft group; cross-range transactions use two-phase commit with a timestamp oracle.

**YugabyteDB** — PostgreSQL-compatible distributed SQL using Raft. Supports serializable and snapshot isolation. Provides strong consistency for writes with tunable consistency for reads (strong or eventual per query).

### NoSQL

**Amazon DynamoDB** — Offers two consistency options per read operation: eventually consistent reads (default, higher throughput, lower latency) and strongly consistent reads (reads from the leader node, may have slightly higher latency). Writes are always consistent. DynamoDB Transactions provide ACID semantics across multiple items and tables within a single AWS region.

**MongoDB** — Offers tunable consistency through read concerns (local, majority, linearizable, snapshot) and write concerns (1, majority, journaled). Causal consistency sessions ensure that reads within a session reflect prior writes in that session. The writeConcern:majority + readConcern:majority combination provides a pragmatic middle ground.

**Apache Cassandra** — Tunable consistency per query. Consistency levels range from ONE (fastest, most available, least consistent) to ALL (slowest, least available, most consistent). QUORUM reads and writes provide strong consistency if R + W > N (read replicas + write replicas > total replicas). LOCAL_QUORUM provides strong consistency within a data center with eventual consistency across data centers.

### Streaming and Event Infrastructure

**Apache Kafka** — Provides exactly-once semantics (EOS) within Kafka transactions (producer + consumer + Kafka Streams). This does not extend to external systems — writing to Kafka and a database atomically still requires the outbox pattern or a transactional producer with idempotent consumers. Kafka's replication uses ISR (in-sync replicas); with acks=all, a produced message is durable once all ISR members acknowledge.

**Redis** — Single-threaded command processing provides serializable execution on a single node. Redis Cluster uses asynchronous replication — writes acknowledged by the master may be lost if the master fails before replicating. Redis Sentinel provides failover but with the same async replication data loss risk. For use cases requiring consistency, Redis is best used as a cache with a strongly consistent backing store, not as the source of truth.

---

## Decision Tree

Use this decision tree to choose the appropriate consistency model for each data path in your system.

```
START: What is the business impact of temporarily stale data?

├── Financial loss, legal liability, or safety risk
│   ├── Is the data within a single database?
│   │   ├── YES → Use SERIALIZABLE isolation (PostgreSQL SSI)
│   │   └── NO → Is the latency budget > 100ms?
│   │       ├── YES → Use distributed SQL (Spanner / CockroachDB)
│   │       └── NO → Use saga pattern with compensating transactions
│   │                 + strong consistency at each local step
│   └── Examples: payment processing, inventory decrement,
│       booking/reservation, unique constraint enforcement
│
├── User confusion or degraded experience (but recoverable)
│   ├── Is it the user's own data they're reading after writing?
│   │   ├── YES → Use read-your-writes consistency
│   │   │         (read from leader for N seconds after write)
│   │   └── NO → Is ordering important?
│   │       ├── YES → Use causal consistency (MongoDB sessions)
│   │       └── NO → Use monotonic reads (session affinity)
│   └── Examples: profile updates, order status, chat messages,
│       collaborative editing
│
├── Negligible impact — staleness is invisible or irrelevant
│   └── Use eventual consistency with appropriate replication lag
│       monitoring and alerting
│   └── Examples: social feeds, search indexes, analytics,
│       recommendations, notifications, CDN-cached content
│
└── MIXED — different paths in the same system
    └── Apply different consistency models per path
        (this is the correct answer for most real systems)
```

### Quick Reference by Domain

| Domain | Write Path | Read Path | Recommended Model |
|---|---|---|---|
| Financial ledger | Strong (serializable) | Strong for balance queries, eventual for reports | Distributed SQL or serializable local DB |
| E-commerce inventory | Strong for decrement | Eventual for catalog display, strong for checkout | Hybrid — strong at purchase, eventual for browse |
| Social media feed | Eventual (async fan-out) | Eventual | Eventual with read-your-writes for own posts |
| Chat / messaging | Causal (within conversation) | Causal | Causal consistency sessions |
| Search | N/A (index is a derived view) | Eventual | CDC-powered index with sub-second lag |
| User authentication | Strong (unique constraints) | Strong | Single primary database |
| Analytics dashboard | N/A (batch/stream ingest) | Eventual | Data warehouse with scheduled refresh |
| Configuration / feature flags | Strong | Read-your-writes | Consensus-backed store (etcd, Consul) |

---

## Implementation Sketch

### Outbox Pattern with PostgreSQL + Debezium

```sql
-- Business table
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    total       DECIMAL(10,2) NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbox table — same database, same transaction
CREATE TABLE outbox (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,        -- e.g., 'Order'
    aggregate_id   UUID NOT NULL,        -- e.g., the order ID
    event_type     TEXT NOT NULL,        -- e.g., 'OrderCreated'
    payload        JSONB NOT NULL,       -- the event data
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the CDC connector to read in order
CREATE INDEX idx_outbox_created ON outbox (created_at);
```

```python
# Application code — single transaction for business write + event
async def create_order(customer_id: str, items: list, total: Decimal):
    async with db.transaction():
        # Business write
        order = await db.execute(
            "INSERT INTO orders (customer_id, total, status) "
            "VALUES ($1, $2, 'pending') RETURNING *",
            customer_id, total
        )
        # Outbox write — same transaction, atomic
        await db.execute(
            "INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload) "
            "VALUES ('Order', $1, 'OrderCreated', $2)",
            order.id,
            json.dumps({
                "order_id": str(order.id),
                "customer_id": customer_id,
                "total": str(total),
                "items": items
            })
        )
    return order
```

Debezium reads the PostgreSQL WAL via its outbox event router, publishes `OrderCreated` events to Kafka, and downstream services consume them. If the transaction rolls back, the outbox row is never written, and no event is published. Atomicity is guaranteed by the local database transaction.

### Optimistic Concurrency Control

```python
async def update_order_status(order_id: str, new_status: str, expected_version: int):
    result = await db.execute(
        "UPDATE orders SET status = $1, version = version + 1 "
        "WHERE id = $2 AND version = $3 "
        "RETURNING *",
        new_status, order_id, expected_version
    )
    if result is None:
        raise ConflictError(
            f"Order {order_id} was modified by another transaction. "
            f"Expected version {expected_version}, current version differs. "
            "Re-read and retry."
        )
    return result
```

### Saga Orchestrator (Simplified)

```python
class OrderSaga:
    """
    Orchestration-based saga for order placement.
    Each step has a forward action and a compensating action.
    """
    steps = [
        SagaStep(
            name="reserve_inventory",
            action=inventory_service.reserve,
            compensate=inventory_service.release_reservation
        ),
        SagaStep(
            name="charge_payment",
            action=payment_service.charge,
            compensate=payment_service.refund
        ),
        SagaStep(
            name="confirm_order",
            action=order_service.confirm,
            compensate=order_service.cancel
        ),
    ]

    async def execute(self, order_data: dict):
        completed = []
        try:
            for step in self.steps:
                result = await step.action(order_data)
                completed.append((step, result))
                order_data = {**order_data, **result}
        except Exception as e:
            # Compensate in reverse order
            for step, result in reversed(completed):
                try:
                    await step.compensate(result)
                except Exception as comp_error:
                    # Log for manual intervention — compensation failed
                    logger.critical(
                        f"Compensation failed for {step.name}: {comp_error}. "
                        f"Manual intervention required."
                    )
            raise SagaFailedError(f"Saga failed at {step.name}: {e}")
        return order_data
```

### Read-After-Write Consistency with Replication Position

```python
class ConsistentReader:
    """
    Routes reads to the primary for a window after writes,
    or waits for replica to catch up to the write position.
    """
    def __init__(self, primary_pool, replica_pool, consistency_window_ms=5000):
        self.primary = primary_pool
        self.replica = replica_pool
        self.window_ms = consistency_window_ms
        self._last_write = {}  # session_id -> (timestamp, lsn)

    async def read(self, query: str, params: list, session_id: str):
        last = self._last_write.get(session_id)
        if last and (time.now_ms() - last.timestamp) < self.window_ms:
            # Within consistency window — read from primary
            return await self.primary.execute(query, params)
        # Outside window — safe to read from replica
        return await self.replica.execute(query, params)

    async def write(self, query: str, params: list, session_id: str):
        result = await self.primary.execute(query, params)
        lsn = await self.primary.execute("SELECT pg_current_wal_lsn()")
        self._last_write[session_id] = WritePosition(
            timestamp=time.now_ms(), lsn=lsn
        )
        return result
```

---

## Cross-References

- **[cap-theorem-and-tradeoffs](../distributed/cap-theorem-and-tradeoffs.md)** — The theoretical foundation for why strong consistency and high availability cannot coexist during network partitions. Data consistency decisions are fundamentally CAP decisions.
- **[saga-pattern](../patterns/saga-pattern.md)** — Detailed implementation guide for sagas as the primary mechanism for cross-service consistency without distributed transactions.
- **[distributed-systems-fundamentals](../distributed/distributed-systems-fundamentals.md)** — Foundational concepts (network partitions, failure detection, consensus) that underpin all consistency models.
- **[data-modeling](../data/data-modeling.md)** — Data model design directly affects which consistency anomalies are possible. Denormalization introduces consistency maintenance burden.
- **[sql-vs-nosql](../data/sql-vs-nosql.md)** — Database category choice constrains available consistency options. SQL databases default to strong consistency; NoSQL databases offer tunable consistency.
- **[idempotency-and-retry](../integration/idempotency-and-retry.md)** — Eventual consistency systems require idempotent operations because events may be delivered more than once. Retry logic without idempotency guarantees creates consistency bugs.

---

## Sources

- [Consistency Patterns in Distributed Systems - Design Gurus](https://www.designgurus.io/blog/consistency-patterns-distributed-systems)
- [Engineering Trade-offs: Eventual Consistency in Practice - ByteByteGo](https://blog.bytebytego.com/p/a-guide-to-eventual-consistency-in)
- [Why Eventual Consistency Fails in Distributed Systems - Works On My Machine](https://medium.com/works-on-my-machine/production-bugs-no-one-teaches-you-2-eventually-consistent-doesnt-mean-eventually-correct-78111bc1aa14)
- [Strong vs. Eventual Consistency - AlgoMaster](https://blog.algomaster.io/p/strong-vs-eventual-consistency)
- [Difference Between Two-Phase Commit and Saga Pattern - Baeldung](https://www.baeldung.com/cs/two-phase-commit-vs-saga-pattern)
- [Saga Design Pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
- [CAP, PACELC, ACID, BASE - ByteByteGo](https://blog.bytebytego.com/p/cap-pacelc-acid-base-essential-concepts)
- [ACID vs BASE Databases - AWS](https://aws.amazon.com/compare/the-difference-between-acid-and-base-database/)
- [Transactional Outbox Pattern - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Reliable Microservices Data Exchange With the Outbox Pattern - Debezium](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/)
- [Living Without Atomic Clocks: Where CockroachDB and Spanner Diverge](https://www.cockroachlabs.com/blog/living-without-atomic-clocks/)
- [The One Crucial Difference Between Spanner and CockroachDB - AuthZed](https://authzed.com/blog/prevent-newenemy-cockroachdb)
- [What Write Skew Looks Like - CockroachDB](https://www.cockroachlabs.com/blog/what-write-skew-looks-like/)
- [A Beginner's Guide to the Write Skew Anomaly - Vlad Mihalcea](https://vladmihalcea.com/write-skew-2pl-mvcc/)
- [GitLab Postgres DB Split Brain Incident Post-Mortem](https://gitlab.com/gitlab-com/gl-infra/production-engineering/-/issues/212)
- [Split-Brain 101 - Percona](https://www.percona.com/blog/split-brain-101-what-you-should-know/)
- [Why Strong Consistency? - Marc Brooker](https://brooker.co.za/blog/2025/11/18/consistency.html)
- [Azure Cosmos DB Consistency Levels - Microsoft](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Disasters I've Seen in a Microservices World](https://world.hey.com/joaoqalves/disasters-i-ve-seen-in-a-microservices-world-a9137a51)
