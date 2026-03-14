# CQRS and Event Sourcing — Architecture Expertise Module

> CQRS separates read and write models. Event Sourcing stores state as a sequence of immutable events. They often appear together but are independent patterns — CQRS is common and useful; Event Sourcing is powerful but niche and complex.

> **Category:** Pattern
> **Complexity:** Expert
> **Applies when:** Systems with asymmetric read/write loads, audit requirements, temporal queries, or complex domain logic needing full history

---

## What This Is (and What It Isn't)

### CQRS: Command Query Responsibility Segregation

Gregory Young coined the term CQRS around 2010, building on Bertrand Meyer's Command Query Separation (CQS) principle from 1988. CQS says a method should either change state (command) or return data (query), never both. CQRS elevates this from a method-level principle to an architectural-level one: the system should have **separate models** for writing data and reading data.

The **command side** receives commands (intentions to change state), validates them against business rules, and applies state changes. The **query side** reads data and returns it in whatever shape the consumer needs. These two sides can have entirely different data models, different optimization strategies, and — crucially — can be scaled independently.

**What CQRS does NOT require:**

- **Two databases.** The simplest CQRS implementation uses a single database with separate read and write models in the application layer. The read model might be a set of denormalized views or materialized query objects. The write model might be a rich domain model. They share a database, and that is fine.
- **Event Sourcing.** CQRS works perfectly with a traditional relational database using CRUD persistence. You can have a normalized write model and denormalized read projections in the same PostgreSQL instance.
- **Eventual consistency.** If both models share a database, reads are strongly consistent. Eventual consistency only enters when you separate the read database from the write database and synchronize them asynchronously.
- **Messaging infrastructure.** You can implement CQRS without a message bus. Commands can be method calls. Queries can be method calls. The pattern is about model separation, not infrastructure separation.

### Event Sourcing: State as a Sequence of Facts

Event Sourcing stores the state of a system as an append-only sequence of immutable events, rather than as a mutable current-state record. Instead of storing "account balance = $500", you store the series of events that led to that balance: `AccountOpened($0)`, `MoneyDeposited($1000)`, `MoneyWithdrawn($300)`, `MoneyDeposited($200)`, `MoneyWithdrawn($400)`.

The current state is derived by replaying events from the beginning (or from a snapshot). The event log is the single source of truth. The current-state representation is a disposable projection that can be rebuilt at any time.

**What Event Sourcing IS:**

- An **append-only** store of domain events. Events are never updated or deleted.
- A **complete audit trail** by construction, not as an afterthought.
- A mechanism for **temporal queries** — you can reconstruct the state of the system at any point in time by replaying events up to that moment.
- A foundation for **event replay** — you can rebuild projections, fix bugs in projection logic, and create new read models from historical events.

**What Event Sourcing IS NOT:**

- **Not event-driven architecture.** Publishing events between services (via Kafka, RabbitMQ, etc.) is event-driven architecture. Storing state as events is event sourcing. You can have event-driven architecture without event sourcing, and event sourcing without event-driven architecture (though they complement each other).
- **Not a logging mechanism.** An event log is not an application log. Events are domain-meaningful state transitions, not debug output. `OrderPlaced` is an event. `Database query took 200ms` is a log entry.
- **Not a message queue.** The event store is a database, not a transport. Events are persisted for state reconstruction, not for delivery to consumers (though consumers can subscribe to them).

### They Are Separate Patterns

This is the most critical misconception to address. Greg Young himself has stated that while he introduced CQRS and Event Sourcing together, they are independent patterns. His later reflection: "You need to look at CQRS not as being the main thing. CQRS was a product of its time and meant to be a stepping stone towards the ideas of Event Sourcing."

However, there is an asymmetry: **you can use CQRS without Event Sourcing** (and this is the more common case), but **if you use Event Sourcing, you almost always need CQRS**. The reason is pragmatic: querying an event store directly for read operations is extremely inefficient. You would need to replay events for every query. Projections (read models) solve this, and projections are the query side of CQRS.

**The four combinations:**

| | Without CQRS | With CQRS |
|---|---|---|
| **Without ES** | Traditional CRUD (most apps) | CQRS with CRUD persistence (common, useful) |
| **With ES** | Technically possible but impractical | ES with CQRS (the canonical ES setup) |

### Common Misconceptions

**"CQRS means two databases."** No. CQRS is about separate models, not separate storage. A single PostgreSQL instance with a normalized write schema and denormalized read views is CQRS. Read replicas alone are NOT CQRS — they are infrastructure scaling. CQRS requires different data models for reads and writes, not just copies of the same model.

**"Event Sourcing gives you free debugging."** Partially true. You can replay events to reproduce state, but most production bugs in event-sourced systems come from bad events caused by human error or flawed business logic, not from application crashes. Replaying bad events reproduces the bad state faithfully — that is not debugging, that is archaeology.

**"Event Sourcing means you never lose data."** You never lose the history of what happened. But if your projection logic has a bug, your read model can diverge from reality silently for months. The events are correct; the interpretation of them is where data loss happens.

**"We need Event Sourcing for our audit trail."** Maybe. But an audit table (a separate append-only log of changes) achieves 80% of the audit benefit at 10% of the complexity. Event Sourcing is warranted when you need the audit trail AND temporal queries AND event replay AND the ability to rebuild state from scratch. If you just need "who changed what, when" for compliance, a CDC-based audit log or database triggers may suffice.

---

## When to Use It

### When to Use CQRS (Without Event Sourcing)

**Asymmetric read/write loads.** When reads outnumber writes by 5:1 or more, and the read access patterns differ from the write model's shape. An e-commerce catalog where writes update product details (normalized) but reads need denormalized product cards with pricing, images, reviews, and availability. A social media feed where writes are individual posts but reads need aggregated, ranked, filtered timelines.

**Complex domain logic on the write side.** When the write model involves rich validation, business rules, and invariant enforcement that would be polluted by read-side concerns. A financial trading platform where order placement involves margin checks, position limits, and risk calculations — but the read side just needs a dashboard of open positions. Keeping these models separate prevents the query optimization from contaminating the command validation.

**Multiple read representations of the same data.** A single write model needs to produce different read models for different consumers: an API response, an analytics dashboard, a search index, a report. Rather than one monolithic model that serves all purposes poorly, CQRS lets each read model be optimized for its consumer.

**Teams with separate read/write ownership.** When the write side is owned by the domain team and the read side is owned by the platform or analytics team, CQRS provides a natural boundary for team ownership and independent deployment.

**Real-world example — FinTech trading platform.** A medium-sized fintech company built a real-time trading platform. The write model handled order validation, risk checks, and position management with strict consistency. The read model served real-time dashboards, historical trade views, and compliance reports — each as separate projections. CQRS let them scale the read side independently to handle thousands of concurrent dashboard sessions without impacting order processing latency.

### When to Use Event Sourcing

**Legal or regulatory audit requirements with temporal queries.** Financial services, healthcare, and government systems where regulators require not just "what is the current state" but "what was the state at 3:47 PM on March 15th, and how did it get there." Event Sourcing provides this by construction. Banking transaction histories, clinical decision audit trails, and securities trading records are canonical examples.

**Event replay for projection rebuilding.** When you need the ability to create new read models from historical data without re-processing source systems. A retail platform that decides, six months after launch, to build a recommendation engine — with Event Sourcing, they can replay all historical purchase events through the new recommendation projection without touching the source systems.

**Complex event-driven workflows.** Systems where the same events trigger multiple downstream processes: an `OrderPlaced` event triggers inventory reservation, payment processing, shipping notification, and analytics update. Event Sourcing provides a reliable, replayable source for all these consumers.

**Debugging and root-cause analysis in high-stakes domains.** Air traffic management, medical device monitoring, financial settlement — domains where understanding exactly how the system reached a particular state is not optional but legally mandated. The Air Traffic Management domain example: computing and persisting flight data where every state transition must be traceable.

**Real-world example — healthcare records.** A healthcare system storing patient treatment histories as event streams. Each clinical event (medication prescribed, test ordered, diagnosis recorded) is immutable. State at any point in time can be reconstructed for malpractice reviews. New projections (drug interaction analysis, treatment outcome tracking) can be built retroactively from the complete event history.

---

## When NOT to Use It

This section is as important as the previous one. Both patterns are frequently over-applied, producing unnecessary complexity, slower development, and justified frustration from teams who then dismiss the patterns entirely.

### When NOT to Use CQRS

**Simple CRUD applications.** If the application reads and writes the same shape of data with minimal business logic, CQRS adds model duplication for no return. A 5-entity admin dashboard for managing users, roles, and settings does not benefit from separate read and write models. The "command" is a data save. The "query" is a data load. They are the same operation wearing different hats.

**Real-world cautionary tale:** A startup adopted full CQRS with MediatR, separate command/query handlers, and DTOs for an internal employee directory. The application had four entities: Employee, Department, Role, and Office. Every feature required writing a command handler, a command validator, a query handler, a query DTO, and mapping logic. Development velocity dropped to 40% of what a simple controller-service-repository pattern would have achieved. The team reverted after three months.

**Symmetric read/write patterns.** If every read operation returns exactly the data shape that the write operation stores, separate models provide no optimization opportunity. A key-value configuration store, a simple blog engine, or a settings management interface typically reads and writes the same structure.

**Small team with limited experience.** CQRS introduces cognitive overhead. Every feature touches two models instead of one. Debugging spans two code paths. If the team has not built a CQRS system before, the learning curve is steep and the initial velocity drop is significant. For teams under five developers building their first production system, the overhead often exceeds the benefit.

**No independent scaling requirements.** If reads and writes have similar load characteristics and can share the same database connection pool without contention, the complexity of separate models is not justified by operational need.

### When NOT to Use Event Sourcing

**This list is longer than the "when to use" list. This is intentional. Event Sourcing is a powerful, niche pattern that is correct for a narrow set of problems and actively harmful for the rest.**

**"Simple queries" become projections.** This is the single biggest hidden cost. In a CRUD system, querying for "all orders placed last week" is a database query. In an event-sourced system, that data lives in a projection that had to be designed, built, deployed, monitored, and kept in sync. Every new query shape requires a new projection or a modification to an existing one. Teams consistently underestimate this cost by an order of magnitude.

**Schema evolution is extremely hard.** Events are immutable. But business requirements change. When a `CustomerRegistered` event gains a new required field (`phoneNumber`), you have two options: (1) make the field optional and handle its absence in every projection, or (2) write an upcaster that transforms old `CustomerRegistered` events to include a default phone number at read time. Both options create accretion of complexity over years. A study of industrial event-sourced systems found that schema evolution is the primary source of maintenance burden, with some organizations accepting scheduled downtime for event migrations.

**Five versioning strategies, none of them free:**

1. **Weak schema** — consumers tolerate missing/extra fields. Works for additive changes; breaks on semantic changes.
2. **Upcasting** — transforms old event versions to new versions at read time. Upcasters accumulate: version 1 → 2 → 3 → 4. Each must be maintained and tested.
3. **In-place transformation** — rewrite events in the store. Destroys immutability, the core premise of event sourcing.
4. **Copy-and-transform** — create a new event stream with migrated events. Requires coordinated switchover and doubles storage temporarily.
5. **Versioned events** — maintain handlers for every event version. Code complexity grows linearly with the number of versions.

**Snapshotting is eventually required.** Aggregates with long lifespans accumulate thousands of events. Loading an aggregate requires replaying all of them. A bank account opened in 2015 with daily transactions has ~3,000 events by 2025. Replaying all of them for every command is prohibitively slow. Snapshots solve this but introduce their own complexity: snapshot versioning, snapshot invalidation, snapshot storage, and the interaction between snapshots and event upcasting.

**Event Sourcing is not a "move fast" architecture.** Building the core infrastructure (event store, projection engine, snapshot mechanism, event versioning) takes months. Frameworks help but are heavyweight. Teams report that the first six months with Event Sourcing involve building plumbing, not features.

**Real-world cautionary tale — the projection nightmare.** A team adopted Event Sourcing for an order management system. Three months in, they were drowning in eventual consistency bugs. The event store became difficult to manage as users saw stale data on dashboards and orders were processed twice due to projection lag. The root cause: they treated Event Sourcing as a storage mechanism and underestimated the operational complexity of managing projections, replay, and consistency guarantees.

**GDPR and data deletion.** Event Sourcing stores everything forever. GDPR requires the ability to delete personal data. These are fundamentally in tension. Solutions exist (crypto-shredding, where personal data is encrypted with a per-user key that is deleted on request) but add significant complexity. If your domain has strong data deletion requirements, Event Sourcing's immutability becomes a liability rather than an asset.

**Reporting and analytics.** If the primary use case is generating reports across aggregates, Event Sourcing forces you to build and maintain projections for every report. A traditional database with SQL queries is dramatically simpler for ad-hoc reporting. Event-sourced systems often end up with a "reporting database" that is a CRUD projection of the event store — at which point you have built and are maintaining both systems.

---

## How It Works

### CQRS Mechanics

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│              │     │   COMMAND SIDE        │     │              │
│   Client     │────>│   (Write Model)       │────>│   Database   │
│   (UI/API)   │     │   - Validate          │     │   (Write)    │
│              │     │   - Apply rules        │     │              │
└──────────────┘     │   - Persist state      │     └──────┬───────┘
       │             └──────────────────────┘            │
       │                                            Sync (async
       │                                            or via DB)
       │             ┌──────────────────────┐            │
       │             │   QUERY SIDE          │     ┌──────▼───────┐
       └────────────>│   (Read Model)        │<────│   Database   │
                     │   - Denormalized      │     │   (Read)     │
                     │   - Optimized views   │     │              │
                     └──────────────────────┘     └──────────────┘
```

**Level 1 — Same database, separate models.** The command side uses a rich domain model with validation and business rules. The query side uses lightweight DTOs or database views. Both hit the same database. No eventual consistency. No synchronization mechanism. This is the simplest and most common CQRS implementation.

**Level 2 — Same database, separate schemas.** The write side uses normalized tables. The read side uses materialized views or denormalized tables in the same database. A database trigger or application-level synchronization keeps them in sync. Still strongly consistent if done within a transaction.

**Level 3 — Separate databases.** The write database is normalized and optimized for transactional integrity. The read database is denormalized and optimized for query performance (could be Elasticsearch, Redis, a read replica with materialized views). Synchronization is asynchronous, introducing eventual consistency. This level requires careful handling of stale reads.

### Event Sourcing Mechanics

```
┌─────────┐    ┌───────────────┐    ┌────────────────────────────────────┐
│ Command │───>│   Aggregate   │───>│         Event Store                 │
│         │    │  (Load state  │    │  ┌────────────────────────────────┐ │
└─────────┘    │   from events,│    │  │ StreamId │ Version │ Event    │ │
               │   validate,   │    │  ├──────────┼─────────┼──────────┤ │
               │   emit new    │    │  │ order-1  │    1    │ Created  │ │
               │   events)     │    │  │ order-1  │    2    │ ItemAdded│ │
               └───────────────┘    │  │ order-1  │    3    │ Paid     │ │
                                    │  │ order-1  │    4    │ Shipped  │ │
                                    │  └────────────────────────────────┘ │
                                    └──────────────┬─────────────────────┘
                                                   │
                                         ┌─────────▼──────────┐
                                         │   Projection       │
                                         │   (Subscribe to    │
                                         │    events, build   │
                                         │    read models)    │
                                         └─────────┬──────────┘
                                                   │
                                         ┌─────────▼──────────┐
                                         │   Read Database     │
                                         │   (Denormalized,    │
                                         │    query-optimized) │
                                         └────────────────────┘
```

**The aggregate lifecycle:**

1. **Receive command.** A `PlaceOrder` command arrives.
2. **Load aggregate.** The `Order` aggregate is loaded by replaying all events for that stream ID from the event store: `OrderCreated`, `ItemAdded`, `ItemAdded`.
3. **Validate.** The aggregate applies business rules against its current in-memory state: is the order still open? Does the customer have sufficient credit?
4. **Emit events.** If valid, the aggregate emits new events: `OrderPlaced`. Events are domain facts — they describe what happened, not what was requested.
5. **Persist events.** New events are appended to the event store with an expected version number for optimistic concurrency.
6. **Publish events.** After persistence, events are published to projections and external subscribers.

### Snapshots

When an aggregate has accumulated many events (hundreds or thousands), replaying all of them for every command becomes slow. Snapshots solve this by periodically capturing the aggregate's current state.

```
Events:  [1] [2] [3] ... [500] [SNAPSHOT @ 500] [501] [502] [503]
                                      │
Load:    Read snapshot ──────────────>│ Replay 501, 502, 503
         (skip events 1-500)          │ Current state
```

**Snapshot considerations:**
- Snapshots must be versioned alongside events. If the aggregate's shape changes, old snapshots need migration.
- Snapshot frequency is a trade-off: too frequent wastes storage, too infrequent slows loading.
- A common strategy: snapshot every N events (e.g., every 100) or when load time exceeds a threshold.
- Snapshots are an optimization, not a requirement. The system must be able to rebuild state from events alone.

### Projections

Projections (also called read models, materialized views, or denormalizers) subscribe to events and build query-optimized data structures.

**Inline projections** run within the same transaction as event persistence. The read model is updated atomically with the write. No eventual consistency. Used when strong consistency is required for specific read models.

**Asynchronous projections** subscribe to the event stream and update read models in the background. Eventually consistent. Used for search indexes, analytics, dashboards, and any read model that tolerates latency.

**Projection rebuilding** is a key advantage of Event Sourcing: if a projection has a bug, you fix the code and replay all events through the corrected projection. This produces a new, correct read model without touching the event store.

**Projection lifecycle management:**
- Projections must track their position in the event stream (a checkpoint or offset).
- If a projection crashes and restarts, it resumes from its last checkpoint.
- New projections start from the beginning of the event stream and "catch up" to the present.

### Sagas and Process Managers

Long-running business processes that span multiple aggregates or services are coordinated by **process managers** (sometimes called sagas, though the term "saga" has a different, older meaning in database theory).

A process manager listens to events and issues commands:

```
OrderPlaced ──> Process Manager ──> ReserveInventory (command)
InventoryReserved ──> Process Manager ──> ChargePayment (command)
PaymentCharged ──> Process Manager ──> ShipOrder (command)
ShipmentFailed ──> Process Manager ──> RefundPayment (command)
                                   ──> ReleaseInventory (command)
```

The process manager itself can be event-sourced, ensuring that its coordination state survives crashes and restarts.

### Event Versioning in Practice

Events evolve as the domain evolves. A real system must handle multiple event versions simultaneously.

**Upcasting example:**

```
// Version 1: CustomerRegistered { name, email }
// Version 2: CustomerRegistered { firstName, lastName, email, phone }

// Upcaster transforms V1 → V2 at read time:
function upcast(event) {
  if (event.version === 1) {
    const [firstName, ...rest] = event.data.name.split(' ');
    return {
      ...event,
      version: 2,
      data: {
        firstName,
        lastName: rest.join(' ') || 'Unknown',
        email: event.data.email,
        phone: null  // field did not exist in V1
      }
    };
  }
  return event;
}
```

Upcasting preserves immutability (events are not modified in the store) but adds a transformation layer that accumulates complexity over time. Every version transition must be maintained, tested, and composed correctly: V1 → V2 → V3 → V4.

---

## Trade-Offs Matrix

| Dimension | CQRS (without ES) | CQRS + Event Sourcing | Neither (CRUD) |
|---|---|---|---|
| **Initial complexity** | Moderate — two models instead of one | Very high — event store, projections, versioning | Low — single model |
| **Read performance** | Excellent — read model optimized per use case | Excellent — projections denormalized for queries | Limited by normalization |
| **Write performance** | Good — write model normalized | Excellent — append-only writes are fast | Good — standard CRUD |
| **Query flexibility** | High — can add new read models | Very high — replay events to build new projections | Limited — requires schema migration |
| **Audit trail** | Requires separate implementation | Built-in by construction | Requires separate implementation |
| **Temporal queries** | Not supported natively | Built-in — replay to any point in time | Not supported |
| **Schema evolution** | Standard DB migrations | Very hard — event versioning, upcasting | Standard DB migrations |
| **Debugging** | Moderate — two models to trace | Hard — projection drift, eventual consistency | Simple — single model, single state |
| **Data deletion (GDPR)** | Standard deletion | Complex — crypto-shredding or event redaction | Standard deletion |
| **Team onboarding** | Moderate learning curve | Steep learning curve | Minimal |
| **Consistency model** | Configurable — strong or eventual | Typically eventual for read models | Strong (within transactions) |
| **Operational overhead** | Moderate — sync mechanism | High — event store, projections, snapshots | Low |
| **Recovery from bugs** | Fix and migrate | Fix projection and replay (powerful but slow) | Fix and migrate |
| **Infrastructure cost** | Moderate — potential second DB | High — event store + read DB(s) + projection infra | Low — single DB |

---

## Evolution Path

The path from simple CRUD to CQRS to Event Sourcing should be driven by concrete pain, not speculative architecture. Each step has a cost, and each step should be taken only when the previous level demonstrably cannot handle the requirements.

### Stage 1: CRUD with Good Boundaries

Start here. Always. A well-structured CRUD application with a clean service layer, proper validation, and clear API contracts handles the vast majority of business applications. The key is clean boundaries and good abstractions — these make later evolution possible without requiring a rewrite.

```
Controller → Service → Repository → Database
```

**Move to Stage 2 when:** Read and write access patterns diverge significantly. The single model is being tortured to serve both transactional writes and complex queries. Query performance degrades because the normalized write schema is inefficient for reads. Multiple consumers need different shapes of the same data.

### Stage 2: CQRS with Same Database

Introduce separate read and write models that share a database. The write side uses a rich domain model with validation. The read side uses denormalized views, materialized queries, or separate DTOs. No infrastructure changes. No eventual consistency.

```
Command → Write Model → Database ← Read Model ← Query
                            │
                     (views / denormalized tables)
```

**Move to Stage 3 when:** The read side needs a fundamentally different storage technology (full-text search, graph queries, key-value lookups). The write database cannot handle both read and write load. Read and write scaling requirements diverge by an order of magnitude.

### Stage 3: CQRS with Separate Read Storage

Split the read database from the write database. Synchronize via Change Data Capture (CDC), domain events published from the write side, or database replication with transformation. Accept eventual consistency on the read side.

```
Command → Write Model → Write DB ──(CDC/events)──> Read DB ← Query
```

**Move to Stage 4 when:** You need a complete audit trail with temporal queries. You need event replay capability. You need to reconstruct state at any point in time. Regulatory requirements demand immutable, append-only records of all state changes. These requirements must be concrete and verified — not speculative.

### Stage 4: Event Sourcing (for Specific Aggregates)

Apply Event Sourcing to the specific aggregates that require it. Not the entire system. An e-commerce platform might event-source the `Order` aggregate (for audit and temporal queries) while keeping `Product`, `User`, and `Category` as CRUD. This is the recommended approach: surgical Event Sourcing for aggregates that earn it.

```
Command → Aggregate → Event Store ──(projections)──> Read DB(s)
                         │
              (append-only, immutable)
```

**Critical principle:** Each stage should be a conscious, reversible decision driven by measured need. Skipping stages — going from CRUD to full Event Sourcing — almost always results in over-engineering and regret.

---

## Failure Modes

### Projection Drift

**What happens:** The projection (read model) diverges from the event store. Users see stale or incorrect data. The event store is correct, but the projection's interpretation of events contains a bug that has been silently producing wrong results for weeks.

**Why it happens:** A projection handler does not account for a new event type. An upcaster introduces a subtle data transformation error. A projection crashes and misses events before its checkpoint is updated. An event's semantics change but the projection handler is not updated.

**Real-world impact:** A fintech team discovered that their account balance projection had been off by fractions of a cent for three months due to a rounding error in the projection handler. The event store was correct. The fix required replaying 200 million events through the corrected projection — a process that took 18 hours and required a maintenance window.

**Mitigation:** Regularly compare projection state against event-store-derived state for critical aggregates. Implement projection health checks that verify key invariants. Maintain the ability to rebuild any projection from scratch within an acceptable time window.

### Schema Evolution Breaking Projections

**What happens:** The domain team adds a field to an event, splits an event into two, or changes an event's semantics. Projections that consume this event break — either by crashing on the new schema or by silently misinterpreting the changed data.

**Why it happens:** Events cross ownership boundaries. The team that emits events and the team that builds projections may be different. Event schema changes are not coordinated across all consumers. There is no schema registry enforcing compatibility.

**Real-world impact:** An e-commerce platform split `OrderUpdated` into `OrderItemAdded` and `OrderItemRemoved`. Three downstream projections still expected `OrderUpdated` and silently stopped updating, leading to stale inventory counts for two weeks before the discrepancy was detected.

**Mitigation:** Treat events as a public API with a compatibility contract. Use a schema registry (Confluent Schema Registry, AWS Glue Schema Registry). Prefer additive changes (new optional fields) over breaking changes (renamed or removed fields). Run all projections against event schema changes in CI before deploying.

### Snapshot Corruption and Versioning

**What happens:** A snapshot was taken when the aggregate had shape A. The aggregate code is updated to shape B. Loading the old snapshot into the new code produces corrupt or incomplete state. Events replayed on top of the corrupt snapshot compound the error.

**Why it happens:** Snapshots are serialized representations of in-memory state. When the aggregate's class structure changes (fields added, removed, renamed, types changed), old snapshots become incompatible. Unlike events, snapshots are not typically versioned or upcasted.

**Mitigation:** Version snapshots explicitly. When the aggregate shape changes, invalidate old snapshots and let them be rebuilt from events. Include a version field in every snapshot and validate it on load. Test snapshot deserialization as part of the CI pipeline.

### Aggregate Loading Performance Degradation

**What happens:** An aggregate with a long lifespan (years) accumulates thousands of events. Loading it requires replaying all events sequentially. Command processing latency grows from milliseconds to seconds.

**Why it happens:** No snapshotting strategy was implemented. Or snapshots were implemented but snapshot frequency is too low. Or the aggregate was designed as a single long-lived entity when it should have been split into shorter-lived aggregates.

**Real-world example:** A bank account aggregate storing every transaction as an event. An account opened in 2015 with daily transactions accumulated ~3,600 events by 2025. Without snapshots, loading the account took 800ms. With snapshots every 100 events, loading dropped to 12ms. The initial design omitted snapshots because "we'll add them later." "Later" arrived when customers complained about payment processing latency.

**Mitigation:** Implement snapshotting from the start for any aggregate expected to accumulate more than 100 events. Monitor aggregate load times. Consider splitting long-lived aggregates into time-bounded chunks (e.g., monthly account statement aggregates instead of lifetime account aggregates).

### Eventual Consistency UX Failures

**What happens:** A user submits a command, is redirected to a page that queries the read model, and sees stale data. They submitted an order but the order list shows no new order. They updated their profile but the profile page shows the old data.

**Why it happens:** The read model is eventually consistent. The projection has not processed the new events by the time the query executes.

**Real-world impact:** Users click "submit" again, creating duplicate orders. Users contact support thinking the system is broken. Trust in the application erodes.

**Mitigation:** Return the command result (including the new entity ID and version) directly to the client, bypassing the read model for the immediate response. Use inline projections for user-facing read models that must reflect the latest write. Implement "read your own writes" semantics by routing the user's next query to the write database with a version fence.

### Event Store Operational Challenges

**What happens:** The event store grows without bound. Backup and restore times increase linearly. Disk usage becomes a cost concern. Archiving old events is complex because projections may need to replay from the beginning.

**Mitigation:** Implement event archival strategies — move old events to cold storage while maintaining the ability to replay from archives. Use event store compaction for streams where only recent events matter. Monitor event store growth and plan storage capacity proactively.

---

## Technology Landscape

### Event Store Databases

**EventStoreDB (Kurrent)** — Purpose-built event store by Greg Young's team. First-class support for event streams, subscriptions, projections, and optimistic concurrency. The most mature dedicated event store. Supports competing consumers for horizontal scaling of projections. Written in C#, runs on Linux/Windows/macOS. Open source (server) with commercial support.

**Marten** — .NET library that uses PostgreSQL as an event store and document database. Pragmatic choice for .NET teams that want Event Sourcing without a separate database. Provides event storage, projections (inline and async), and snapshotting using PostgreSQL's JSONB columns. Strong integration with the .NET ecosystem.

**PostgreSQL (with custom schema)** — Many teams implement Event Sourcing on top of PostgreSQL with a simple `events` table (`stream_id`, `version`, `event_type`, `data JSONB`, `metadata JSONB`, `timestamp`). No framework required. Full control over the schema. Lacks built-in subscription/projection support — you build that yourself.

**Apache Kafka** — Used as an event store by some teams, though Kafka was designed as a message broker, not a database. Kafka provides append-only, partitioned, replayed logs. Limitations as an event store: no native support for loading a single aggregate's events efficiently (requires filtering a partition), log compaction conflicts with immutability, retention policies may delete old events.

### CQRS Frameworks and Libraries

**MediatR (.NET)** — In-process mediator pattern library. Not CQRS-specific, but widely used to implement the command/query dispatch pattern in .NET. Provides pipeline behaviors for cross-cutting concerns (validation, logging, authorization). Lightweight — does not impose infrastructure.

**Axon Framework (Java/Kotlin)** — Full CQRS + Event Sourcing framework. Provides command bus, event bus, query bus, saga support, and event store integration. Can use Axon Server (commercial) or other event stores. Opinionated and heavyweight but comprehensive.

**NestJS CQRS Module (TypeScript/Node.js)** — Built-in CQRS module for the NestJS framework. Provides command bus, query bus, and event bus abstractions. Lightweight and well-integrated with NestJS's dependency injection. Does not include an event store — you bring your own.

**Eventuous (.NET)** — Modern .NET library for Event Sourcing. Supports EventStoreDB, PostgreSQL, and other stores. Provides aggregate base classes, command services, subscriptions, and projections. Actively maintained with a focus on simplicity.

**Commanded (Elixir)** — CQRS/ES framework for Elixir. Leverages Elixir's actor model (GenServer) for aggregate processes. Event store backed by PostgreSQL. Strong fit for systems that benefit from Elixir's concurrency model.

### Supporting Infrastructure

**Schema registries** — Confluent Schema Registry, AWS Glue Schema Registry. Enforce event schema compatibility across producers and consumers. Essential for multi-team event-sourced systems.

**CDC tools** — Debezium, AWS DMS. Capture changes from the write database and propagate them to read databases. Useful for CQRS without Event Sourcing, where the write side uses CRUD and the read side needs to be synchronized.

**Projection monitoring** — Custom health checks, Prometheus metrics on projection lag, alerting on projection checkpoint drift. No standard tooling — most teams build their own.

---

## Decision Tree

```
START: Do you need separate read and write models?
│
├─ NO: Read and write shapes are identical or nearly so
│  └─► Use standard CRUD. Revisit when read/write divergence emerges.
│
├─ YES: Read and write have different shapes, loads, or optimization needs
│  │
│  ├─ Is a single database sufficient for both models?
│  │  ├─ YES: Use CQRS Level 1 (same DB, separate models)
│  │  └─ NO: Use CQRS Level 2-3 (separate read storage)
│  │
│  └─ Do you need an immutable, append-only audit trail?
│     │
│     ├─ NO: CQRS without Event Sourcing is sufficient
│     │  └─► Audit via CDC, triggers, or a separate audit table
│     │
│     └─ YES: Do you also need temporal queries and event replay?
│        │
│        ├─ NO: An append-only audit table is simpler
│        │  └─► CQRS + audit table. Not Event Sourcing.
│        │
│        └─ YES: Event Sourcing is warranted
│           │
│           ├─ For ALL aggregates?
│           │  ├─ Rarely. Apply ES only to aggregates that need it.
│           │  └─► Event Source specific aggregates, CRUD the rest.
│           │
│           └─ GDPR/data deletion requirements?
│              ├─ YES: Plan crypto-shredding from day one.
│              └─ NO: Standard ES implementation.
```

**Quick-reference decision rules:**

- **Legal audit requirement + temporal queries** → Event Sourcing for the relevant aggregates.
- **Asymmetric reads (5:1 or higher) with different shapes** → CQRS (without ES).
- **Simple CRUD with <10 entities** → Neither. Standard architecture.
- **Multiple read representations** → CQRS (without ES).
- **Need to replay history for new projections** → Event Sourcing.
- **"We might need it someday"** → Do not adopt. Wait for concrete need.
- **Startup MVP** → Neither. Ship features. Introduce patterns when complexity demands them.

---

## Implementation Sketch

### CQRS Without Event Sourcing (TypeScript)

```typescript
// ─── Command Side ───────────────────────────────────────

interface PlaceOrderCommand {
  customerId: string;
  items: { productId: string; quantity: number }[];
  shippingAddress: Address;
}

class PlaceOrderHandler {
  constructor(
    private orderRepo: OrderRepository,
    private inventoryService: InventoryService,
    private eventPublisher: EventPublisher
  ) {}

  async handle(cmd: PlaceOrderCommand): Promise<string> {
    // Validate against business rules
    const customer = await this.customerRepo.findById(cmd.customerId);
    if (!customer) throw new CustomerNotFoundError(cmd.customerId);
    for (const item of cmd.items) {
      const available = await this.inventoryService.checkAvailability(
        item.productId, item.quantity
      );
      if (!available) throw new InsufficientInventoryError(item.productId);
    }

    // Create and persist via write model (normalized)
    const order = Order.create({ ...cmd });
    await this.orderRepo.save(order);

    // Publish event for read model synchronization
    await this.eventPublisher.publish(new OrderPlacedEvent({
      orderId: order.id, customerId: cmd.customerId,
      items: cmd.items, total: order.calculateTotal(), placedAt: order.placedAt,
    }));
    return order.id;
  }
}

// ─── Query Side ─────────────────────────────────────────

class GetOrderSummariesHandler {
  constructor(private readDb: ReadDatabase) {}

  async handle(query: OrderSummaryQuery): Promise<OrderSummaryDto[]> {
    // Query denormalized read model — no domain logic, no joins
    return this.readDb.query(`
      SELECT order_id, status, total, item_count, placed_at
      FROM order_summaries WHERE customer_id = $1
      ORDER BY placed_at DESC LIMIT $2 OFFSET $3
    `, [query.customerId, query.pageSize, query.page * query.pageSize]);
  }
}

// ─── Read Model Synchronization ─────────────────────────

class OrderSummaryProjection {
  constructor(private readDb: ReadDatabase) {}

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.upsert('order_summaries', {
      order_id: event.orderId, customer_id: event.customerId,
      status: 'placed', total: event.total,
      item_count: event.items.length, placed_at: event.placedAt,
    });
  }
}
```

### Event Sourcing (TypeScript)

```typescript
// ─── Domain Events ──────────────────────────────────────

interface DomainEvent {
  eventId: string; eventType: string; aggregateId: string;
  version: number; timestamp: Date; data: Record<string, unknown>;
}

// Concrete events: OrderCreated, OrderItemAdded, OrderPlaced
// Each carries only the data relevant to that state transition.

// ─── Aggregate (core pattern) ───────────────────────────

class OrderAggregate {
  private items: Map<string, { quantity: number; price: number }> = new Map();
  private status: 'draft' | 'placed' | 'shipped' | 'cancelled' = 'draft';
  private version = 0;
  private uncommittedEvents: DomainEvent[] = [];

  // Reconstitute from event history
  static fromEvents(events: DomainEvent[]): OrderAggregate {
    const agg = new OrderAggregate();
    for (const e of events) agg.apply(e, false);
    return agg;
  }

  // Command method: validates, then emits event
  place(): void {
    if (this.status !== 'draft') throw new Error('Order already placed');
    if (this.items.size === 0) throw new Error('Cannot place empty order');
    const total = Array.from(this.items.values())
      .reduce((sum, i) => sum + i.quantity * i.price, 0);
    this.apply(new OrderPlaced(/* ... total, placedAt ... */), true);
  }

  // Single apply method handles both replay and new events
  private apply(event: DomainEvent, isNew: boolean): void {
    switch (event.eventType) {
      case 'OrderCreated':  /* set id, customerId, initial items */ break;
      case 'OrderItemAdded': /* add/update item in map */           break;
      case 'OrderPlaced':    this.status = 'placed';                break;
    }
    this.version = event.version;
    if (isNew) this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] { return [...this.uncommittedEvents]; }
}

// ─── Event Store Interface ──────────────────────────────

interface EventStore {
  append(streamId: string, events: DomainEvent[],
         expectedVersion: number): Promise<void>;         // optimistic concurrency
  loadStream(streamId: string): Promise<DomainEvent[]>;   // full replay
  loadStreamFrom(streamId: string,
                 fromVersion: number): Promise<DomainEvent[]>; // snapshot + replay
  subscribe(fromPosition: bigint,
            handler: (event: DomainEvent) => Promise<void>): Subscription;
}

// ─── Command Handler ────────────────────────────────────

class PlaceOrderHandler {
  constructor(private eventStore: EventStore, private snapshotStore: SnapshotStore) {}

  async handle(orderId: string): Promise<void> {
    // 1. Load: snapshot (if available) + replay remaining events
    const snapshot = await this.snapshotStore.load(orderId);
    const events = snapshot
      ? await this.eventStore.loadStreamFrom(orderId, snapshot.version + 1)
      : await this.eventStore.loadStream(orderId);
    const order = OrderAggregate.fromEvents(events);

    // 2. Execute command (business logic + validation)
    order.place();

    // 3. Persist new events with optimistic concurrency
    await this.eventStore.append(orderId, order.getUncommittedEvents(),
      order.version - order.getUncommittedEvents().length);
  }
}

// ─── Projection ─────────────────────────────────────────

class OrderDashboardProjection {
  async start(): Promise<void> {
    const checkpoint = await this.readDb.getCheckpoint('order-dashboard');
    this.eventStore.subscribe(checkpoint, async (event) => {
      switch (event.eventType) {
        case 'OrderCreated':
          await this.readDb.insert('order_dashboard', { /* denormalized row */ });
          break;
        case 'OrderPlaced':
          await this.readDb.update('order_dashboard',
            { order_id: event.aggregateId },
            { status: 'placed', total: event.data.total });
          break;
      }
      await this.readDb.setCheckpoint('order-dashboard', event.position);
    });
  }

  // Rebuild: truncate, reset checkpoint, re-subscribe from position 0
  async rebuild(): Promise<void> {
    await this.readDb.truncate('order_dashboard');
    await this.readDb.setCheckpoint('order-dashboard', 0n);
    await this.start();
  }
}
```

---

## Cross-References

- **[Event-Driven Architecture](../integration/event-driven.md)** — CQRS and ES often exist within event-driven systems, but they are distinct patterns. Event-driven architecture is about communication between components; CQRS is about model separation; ES is about state persistence.
- **[Domain-Driven Design](../foundations/domain-driven-design.md)** — CQRS and ES are most effective within a DDD context. Aggregates, bounded contexts, and ubiquitous language provide the domain model that CQRS separates and ES persists.
- **[Data Consistency Patterns](../data/consistency.md)** — Eventual consistency in CQRS read models and the saga/process manager pattern for distributed transactions.
- **[Saga Pattern](../distributed/saga-pattern.md)** — Long-running processes that coordinate multiple aggregates in an event-sourced system use sagas or process managers.

---

## Sources

- [1 Year of Event Sourcing and CQRS — Teiva Harsanyi](https://itnext.io/1-year-of-event-sourcing-and-cqrs-fb9033ccd1c6)
- [Event Sourcing, CQRS and Micro Services: Real FinTech Example — Lukas Niessen](https://dev.to/lukasniessen/event-sourcing-cqrs-and-micro-services-real-fintech-example-from-my-consulting-career-1j9b)
- [Don't Let the Internet Dupe You, Event Sourcing is Hard — Chris Kiehl](https://chriskiehl.com/article/event-sourcing-is-hard)
- [Day Two Problems When Using CQRS and Event Sourcing — InfoQ](https://www.infoq.com/news/2019/09/cqrs-event-sourcing-production/)
- [The Ugly of Event Sourcing: Real-world Production Issues — Dennis Doomen](https://www.dennisdoomen.com/2017/11/the-ugly-of-event-sourcingreal-world.html)
- [Event Stores and Event Sourcing: Some Practical Disadvantages — Ben Morris](https://www.ben-morris.com/event-stores-and-event-sourcing-some-practical-disadvantages-and-problems/)
- [When Not to Use Event Sourcing — Oskar Dudycz](https://event-driven.io/en/when_not_to_use_event_sourcing/)
- [CQRS Facts and Myths Explained — Oskar Dudycz](https://event-driven.io/en/cqrs_facts_and_myths_explained/)
- [Simple Patterns for Events Schema Versioning — Oskar Dudycz](https://event-driven.io/en/simple_events_versioning_patterns/)
- [CQRS Documents — Greg Young (2010)](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)
- [CQRS — Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
- [CQRS Pattern — Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [When to Avoid CQRS — Udi Dahan](https://udidahan.com/2011/04/22/when-to-avoid-cqrs/)
- [Event Sourcing Looked Perfect in the Book. Production Was a Nightmare.](https://medium.com/lets-code-future/event-sourcing-looked-perfect-in-the-book-production-was-a-nightmare-04c15eb5cea8)
- [Eventual Consistency is a UX Nightmare — CodeOpinion](https://codeopinion.com/eventual-consistency-is-a-ux-nightmare/)
- [The Dark Side of Event Sourcing: Managing Data Conversion — Michiel Overeem et al.](https://www.movereem.nl/files/2017SANER-eventsourcing.pdf)
- [Event Sourcing: What is Upcasting? A Deep Dive — Artium](https://artium.ai/insights/event-sourcing-what-is-upcasting-a-deep-dive)
- [An Empirical Characterization of Event Sourced Systems and Their Schema Evolution — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0164121221000674)
