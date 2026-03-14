# Event-Driven Architecture — Architecture Expertise Module

> Event-Driven Architecture (EDA) is a design paradigm where services communicate through events rather than direct calls. Producers emit events without knowing who consumes them; consumers react independently. This achieves loose coupling and high scalability at the cost of debugging complexity and eventual consistency.

> **Category:** Pattern
> **Complexity:** Complex
> **Applies when:** Systems requiring loose coupling, high-throughput event processing, audit trails, or complex workflows spanning multiple services

---

## What This Is (and What It Isn't)

### Events vs Commands vs Messages

These three terms are conflated constantly. They are not the same thing.

An **event** is a notification that something has already happened. It is past tense, immutable, and carries no expectation of a response. `OrderPlaced`, `PaymentCompleted`, `UserRegistered`. The producer does not know — and must not care — who receives it. Events are facts. They cannot be rejected by consumers.

A **command** is a request for something to happen. It is imperative, directed at a specific handler, and expects exactly one consumer. `PlaceOrder`, `ChargePayment`, `SendEmail`. Commands can fail. They carry intent and imply a contract between sender and receiver.

A **message** is the envelope. Both events and commands travel as messages through brokers, queues, or buses. "Message-driven" describes the transport mechanism. "Event-driven" describes the semantic pattern. A system can be message-driven without being event-driven (e.g., command queues), and theoretically event-driven without messages (e.g., polling a change log).

**The litmus test:** If removing all consumers would break the producer, you have commands disguised as events. True events are fire-and-forget from the producer's perspective.

### EDA Is Not Event Sourcing

Event-Driven Architecture and Event Sourcing are orthogonal concepts that happen to share the word "event."

**EDA** is a communication pattern between services. Service A emits an event; Services B, C, D react to it. The events are transient signals — once consumed, they have served their purpose (though they may be retained in a log for replay).

**Event Sourcing** is a persistence pattern within a single service. Instead of storing current state, you store the sequence of events that produced that state. The event log is the system of record. Current state is derived by replaying events.

You can use EDA without Event Sourcing (most systems do). You can use Event Sourcing without EDA (a single monolith with an event-sourced aggregate). You can use both together (a CQRS/ES service that also publishes domain events to a broker). Conflating them leads to architectures that are complex for no reason.

### Choreography vs Orchestration

These are the two fundamental coordination models in event-driven systems.

**Choreography** is decentralized. Each service listens for events and decides independently what to do. There is no central coordinator. An `OrderPlaced` event triggers the inventory service to reserve stock, the payment service to charge the card, the notification service to send a confirmation — all independently. The "workflow" emerges from the collective behavior of autonomous services reacting to events.

- **Strengths:** Loose coupling, independent deployability, no single point of failure, scales well when workflows are simple.
- **Weaknesses:** The workflow is implicit and scattered across codebases. Nobody owns the end-to-end flow. Debugging "why did this order fail?" requires correlating logs across every service. Adding a new step means modifying a consumer, and the existing producers are unaware. Circular event chains can create infinite loops.

**Orchestration** is centralized. A coordinator service (the orchestrator) owns the workflow definition and issues commands to each participant. The orchestrator knows the sequence: first reserve inventory, then charge payment, then send notification. Participants respond with results, and the orchestrator decides the next step.

- **Strengths:** The workflow is explicit, visible, and debuggable. Compensation logic (rollbacks) lives in one place. Adding or reordering steps is straightforward.
- **Weaknesses:** The orchestrator is a coupling point and potential bottleneck. It must be highly available. It knows about every participant, creating a dependency fan-out.

**The pragmatic answer:** Use choreography for simple, loosely related reactions (notifications, analytics, audit logging). Use orchestration for multi-step business-critical workflows where you need visibility and compensation (order fulfillment, payment processing, onboarding flows). Most production systems use both — choreography for fire-and-forget side effects, orchestration for the critical path. Tools like Temporal, Step Functions, and Conductor provide orchestration frameworks purpose-built for this.

### The Four EDA Patterns

Martin Fowler identifies four distinct patterns that all fall under "event-driven":

1. **Event Notification** — The simplest form. A service emits an event saying "something happened" with minimal data (just an ID and event type). Consumers must call back to the source to get details. Low coupling but high chattiness.

2. **Event-Carried State Transfer (ECST)** — Events carry the full relevant state. `OrderPlaced { orderId, items, shippingAddress, total }`. Consumers have everything they need without callbacks. Reduces coupling further but increases event size and raises staleness risks.

3. **Event Sourcing** — Events are the system of record. State is derived from the event log. Covered in detail in the CQRS/Event Sourcing module.

4. **CQRS** — Command Query Responsibility Segregation. Read and write models are separated, often connected by events. The write side emits events; the read side builds projections. Covered in the CQRS/Event Sourcing module.

### "Just Use Kafka" Is Not EDA

Kafka is an infrastructure component, not an architecture. Installing Kafka and publishing JSON blobs to topics does not make your system event-driven. Common anti-patterns:

- **Request-response over Kafka:** Producing a command to a topic and polling a response topic. You have reinvented HTTP with worse latency and no type safety.
- **Database replication via events:** Mirroring every database row change as an event. You have built a slow, unreliable database replica. Use CDC tools (Debezium) if you actually need this, and do not pretend it is EDA.
- **Kafka as a database:** Storing state in Kafka topics and reading it back. Kafka is an append-only log, not a query engine. Use it as a transport or audit log, not a primary datastore (unless you are building a very specific streaming application with KTables).

---

## When to Use It

### Decoupling Services That Evolve Independently

When teams own different services and deploy on different schedules, synchronous coupling creates coordination nightmares. EDA allows services to communicate through contracts (event schemas) without runtime dependencies. The payment service does not import the order service's SDK — it subscribes to `OrderPlaced` events.

**Real example — Shopify:** Shopify processes approximately 66 million messages per second at peak through its Kafka backbone. Each domain (inventory, payments, search, analytics) consumes events independently. When the search team wants to re-index products, they replay events from the product catalog topic without coordinating with the catalog team.

### Audit Trails and Compliance

Events are naturally auditable. An append-only event log provides a complete history of what happened, when, and why. Financial services, healthcare, and regulated industries benefit enormously.

**Real example — ING Bank:** ING adopted event-driven systems across its European financial platforms. Their payments platform processes thousands of event types through a schema registry with enforced backward compatibility. Every transaction produces an immutable event trail satisfying regulatory audit requirements.

### High-Throughput Data Pipelines

When you need to ingest millions of records per second and distribute them to multiple consumers with different processing speeds, event logs excel.

**Real example — LinkedIn:** Apache Kafka was born at LinkedIn in 2011 specifically to solve this problem. LinkedIn needed to track page views, search queries, ad impressions, and connection updates — billions of events daily — and route them to both real-time consumers (LinkedIn Signal search, notification feeds) and offline consumers (Hadoop data warehouse, analytics pipelines). A single infrastructure serves both online and offline use cases. The engineering team uses the Actor Pattern extensively when building event-driven workflows.

### Real-Time Stream Processing

When business decisions must happen in milliseconds based on continuous data streams — fraud detection, dynamic pricing, anomaly detection — batch processing is too slow.

**Real example — Uber:** Uber processes billions of Kafka messages daily. Millions of GPS pings and ride-status events per second flow from rider and driver apps into Kafka. Apache Flink consumes these streams to calculate surge pricing multipliers in real time, with pricing models updating every few seconds. Their Active-Active Kafka setup provides high availability, and the Kappa+ architecture enables seamless backfill. Uber Freight cut aggregation latency from 15 minutes to seconds by shifting from batch to streaming.

### Complex Workflows Spanning Multiple Services

Order processing, user onboarding, insurance claims — any workflow that touches 5+ services and has compensation logic benefits from event-driven orchestration.

**Real example — Amazon order processing:** Amazon's order pipeline uses SNS for fan-out and SQS for reliable buffering. When an order is placed, an event fans out to inventory reservation, payment processing, fraud detection, and notification services simultaneously. Each service consumes from its own SQS queue at its own pace. EventBridge routes events based on content rules, enabling fine-grained filtering without consumer-side logic.

### AI/ML Real-Time Inference Pipelines

In 2024-2025, EDA is increasingly powering real-time ML pipelines where events trigger model updates and predictions. Rather than batch training and batch inference, events flow through feature stores and model servers.

**Real example — Pinterest:** Pinterest's ML infrastructure evolved toward streaming architectures to support more responsive ad conversion models. Events from user interactions flow through real-time feature pipelines, enabling models to react to behavioral signals within seconds rather than hours.

---

## When NOT to Use It

This section is deliberately as long as "When to Use It." The industry has a bias toward over-engineering, and EDA is frequently adopted where simpler patterns suffice.

### When Synchronous Request-Response Is Simpler

If a user submits a form and needs an immediate success/failure response, adding a message broker between the frontend and backend adds latency, complexity, and failure modes — with zero benefit. REST/gRPC request-response is the right choice when the caller needs a synchronous answer.

**Real example:** A startup built a simple CRUD app for managing restaurant menus. They used Kafka to "decouple" the API from the database write. Result: 200ms latency became 2 seconds, they needed Kafka ops expertise they did not have, and debugging a failed menu update required checking three systems instead of one. A direct database call would have been correct.

### When You Have Fewer Than Three Consumers

If there is exactly one producer and one consumer, you do not need pub/sub. You need a function call or a direct API invocation. Event-driven architecture's value comes from the fan-out — one event, many independent reactions. One-to-one communication is better served by direct calls or simple queues.

**Anti-pattern:** Teams that put a message broker between two services "for decoupling" when both services are owned by the same team, deployed together, and always change in lockstep. The broker adds operational overhead without delivering any actual decoupling benefit.

### When Ordering Guarantees Are Critical

EDA systems provide ordering within a partition (Kafka) or within a FIFO queue (SQS FIFO), but cross-partition and cross-topic ordering is not guaranteed. If your business logic requires strict global ordering across all events from all sources, EDA will fight you every step of the way. You will end up building a distributed lock manager on top of your event system, which is worse than not using events.

**Example:** A financial ledger system where debits and credits must be applied in exact chronological order across all accounts. Using events with per-account partitioning works, but cross-account ordering (e.g., an inter-account transfer that must debit before credit) requires careful saga design or synchronous coordination at the boundary.

### When "Why Did This Happen?" Must Be Instantly Answerable

In choreographed systems, understanding the full causal chain of an event requires correlating logs across every service that touched it. If your domain requires instant root-cause analysis — regulatory compliance investigations, financial audits with real-time reporting — the debugging overhead of EDA can be disqualifying unless you invest heavily in distributed tracing infrastructure (OpenTelemetry, Jaeger, correlation IDs in every event).

### When the Team Lacks Distributed Systems Experience

EDA introduces failure modes that most developers have never encountered: message duplication, out-of-order delivery, consumer lag, partition rebalancing, schema evolution, poison pills, dead letter queue management. If the team's experience is primarily with synchronous CRUD applications, adopting EDA will result in production incidents that nobody knows how to debug.

**Real-world observation:** Most developers are trained on request/response systems. Adopting EDA often requires either hiring specialists or significant training investment. Companies that underestimate this end up with poorly implemented event-driven systems that create "integration debt" — undocumented streams, inconsistent schemas, unclear ownership, and absent governance.

### When Batch Processing Is Good Enough

If your data processing needs are satisfied by running a job every hour (or even every minute), do not build a real-time streaming pipeline. Batch is simpler, cheaper, and easier to debug. The gap between "we process data every hour" and "we process data in real-time" is enormous in operational complexity.

**Anti-pattern:** A reporting system that generates daily executive dashboards adopted Kafka Streams for "real-time analytics." The dashboards are viewed once per morning. The Kafka cluster costs $15,000/month and requires a dedicated DevOps engineer. A daily cron job with PostgreSQL would have cost $200/month.

### When Simple Function Calls Suffice

Within a single service or monolith, method calls are the simplest, fastest, and most debuggable form of communication. Adding an in-process event bus (like MediatR in .NET or Spring Events) adds indirection without adding value unless you have a genuine reason for the decoupling (plugin architecture, testability isolation). The stack trace becomes harder to follow, and "go to definition" stops working.

---

## How It Works

### Event Anatomy

A well-designed event contains:

```json
{
  "eventId": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventType": "order.placed",
  "eventVersion": "2.1",
  "timestamp": "2025-03-15T14:30:00.000Z",
  "correlationId": "corr_x9y8z7w6-v5u4-3210-fedc-ba0987654321",
  "causationId": "evt_previous-event-id",
  "source": "order-service",
  "dataContentType": "application/json",
  "data": {
    "orderId": "ord_12345",
    "customerId": "cust_67890",
    "items": [
      { "sku": "WIDGET-001", "quantity": 2, "unitPrice": 29.99 }
    ],
    "totalAmount": 59.98,
    "currency": "USD"
  },
  "metadata": {
    "traceId": "trace_abc123",
    "spanId": "span_def456",
    "environment": "production",
    "schemaRegistryId": "sr_789"
  }
}
```

**Key fields explained:**

- **eventId:** Globally unique identifier. Used for deduplication. Every consumer must track processed eventIds to achieve idempotency.
- **correlationId:** Links all events in a single business transaction. When `OrderPlaced` triggers `PaymentCharged` which triggers `ShipmentCreated`, all three share the same correlationId. This is non-negotiable for debugging.
- **causationId:** The eventId of the event that directly caused this event. Enables building causal chains. CorrelationId groups; causationId sequences.
- **eventVersion:** Schema version. Consumers use this to select the correct deserialization logic. Without it, schema evolution breaks consumers silently.
- **source:** Which service produced this event. Critical for debugging and access control.

### Message Brokers vs Event Logs

These are fundamentally different infrastructure choices with different guarantees:

**Message Brokers (RabbitMQ, ActiveMQ, SQS):**
- Messages are delivered to consumers and then deleted from the broker.
- Designed for task distribution — each message is processed by exactly one consumer in a consumer group.
- Support complex routing (topic exchanges, headers-based routing, fan-out).
- No replay capability — once consumed, messages are gone (unless you configure persistence, which undermines the performance model).
- Best for: command distribution, work queues, RPC-style async communication.

**Event Logs (Kafka, Redpanda, Pulsar):**
- Events are appended to a partitioned, replicated log and retained for a configurable period (hours, days, forever).
- Multiple consumer groups can read the same events independently, each tracking their own offset.
- Full replay capability — a new consumer can start from the beginning of the log and process all historical events.
- Ordering guaranteed within a partition, not across partitions.
- Best for: event sourcing, audit trails, stream processing, multi-consumer fan-out, data pipeline integration.

**The choice matters.** If you choose RabbitMQ and later need replay, you are stuck. If you choose Kafka and only need simple task queues, you are paying for complexity you do not use. Many production systems use both — Kafka for the event backbone, RabbitMQ or SQS for specific command-processing workflows.

### Consumer Groups

A consumer group is a set of consumers that collectively process events from a topic. Each partition in a topic is assigned to exactly one consumer in the group. This provides:

- **Parallelism:** More partitions + more consumers = higher throughput.
- **Load balancing:** Partitions are distributed across available consumers.
- **Fault tolerance:** If a consumer dies, its partitions are reassigned to surviving consumers (rebalancing).
- **Independent processing:** Different consumer groups process the same events independently. The order service's consumer group and the analytics consumer group both read from `order.placed`, each at their own pace.

**Critical constraint:** The number of consumers in a group cannot exceed the number of partitions. If you have 12 partitions and 20 consumers, 8 consumers sit idle. Plan partition counts based on expected peak parallelism.

### Idempotency

In distributed systems, messages will be delivered more than once. Network retries, consumer crashes after processing but before committing the offset, broker failovers — all produce duplicates. Every consumer must be idempotent.

**Implementation strategies:**

1. **Deduplication table:** Store processed eventIds in a database. Before processing, check if the eventId exists. Use a unique constraint. This is simple but requires a database lookup for every message.

2. **Natural idempotency:** Design operations so that applying them multiple times has the same effect as applying them once. `SET balance = 100` is idempotent; `SET balance = balance + 10` is not. Prefer absolute state updates over relative deltas.

3. **Idempotency key in the event:** Include a client-generated idempotency key. The consumer uses this key (not just the eventId) to detect duplicates. Useful when the same logical operation might produce multiple events with different eventIds.

4. **Conditional writes:** Use database optimistic locking (version columns) or conditional updates (`UPDATE ... WHERE version = expected_version`) so that duplicate processing attempts fail safely.

### Dead Letter Queues (DLQ)

When a consumer cannot process a message — malformed data, business rule violation, infrastructure failure — it must not block the entire queue. Dead letter queues provide a quarantine for poison messages.

**DLQ design:**

- After N retry attempts (typically 3-5), move the message to the DLQ.
- Preserve the original message, all headers, and the error details (stack trace, error code, consumer that failed).
- Set up alerting on DLQ depth. A growing DLQ means something is systematically wrong.
- Build tooling to inspect, replay, or discard DLQ messages. Without this tooling, DLQs become black holes that nobody checks until a customer complains.
- Consider separate DLQs per consumer group. A shared DLQ makes it impossible to determine which consumer failed.

### At-Least-Once vs Exactly-Once

**At-most-once:** Process the message, then commit the offset. If the consumer crashes after processing but before committing, the message is skipped on restart. Data loss is possible.

**At-least-once:** Commit the offset, then process the message. Wait — that is also wrong. The standard pattern: process the message, commit the offset. If the consumer crashes after processing but before committing, the message is reprocessed on restart. Duplicates are possible. This is why idempotency is mandatory.

**Exactly-once:** The holy grail. True exactly-once requires transactional coordination between the message broker and the consumer's side effects. Kafka achieves this through transactional producers and the read-process-write pattern within Kafka Streams — but only when both input and output are Kafka topics. The moment your consumer writes to an external database, exactly-once reverts to at-least-once-with-idempotency. Uber published their approach to real-time exactly-once ad event processing using Flink and Kafka transactions, but acknowledged it requires careful engineering and is not a general-purpose guarantee.

**Pragmatic advice:** Design for at-least-once delivery with idempotent consumers. This is the industry standard and works for 99% of use cases.

### Schema Registry

As systems evolve, event schemas change. Without governance, a producer adding a field can break every consumer. A schema registry (Confluent Schema Registry, AWS Glue Schema Registry, Apicurio) provides:

- **Central schema storage:** All event schemas are registered and versioned.
- **Compatibility enforcement:** The registry rejects schema changes that would break consumers. Compatibility modes include:
  - **BACKWARD:** New schemas can read data written by old schemas. Safe to add optional fields with defaults.
  - **FORWARD:** Old schemas can read data written by new schemas. Safe to remove optional fields.
  - **FULL:** Both backward and forward compatible. The safest but most restrictive.
  - **TRANSITIVE:** Compatibility is checked against all previous versions, not just the immediately prior one.
- **Serialization efficiency:** Avro and Protobuf schemas enable compact binary serialization. The producer writes a schema ID into the message header; the consumer resolves the ID from the registry to deserialize. No self-describing JSON overhead.

**ING Bank's lesson:** When managing thousands of event types across hundreds of teams, enforcing backward compatibility through a schema registry was essential to keep their payments platform stable. Without it, a single team's schema change could cascade failures across the entire platform.

### Back-Pressure

When producers emit events faster than consumers can process them, the system must degrade gracefully rather than crash.

**Strategies:**

- **Consumer-side buffering:** SQS and similar queues provide natural buffering. Messages wait in the queue until consumers are ready. Queue depth is a key metric.
- **Partition-based scaling:** Add partitions and consumers to increase throughput. Kafka's consumer group protocol handles rebalancing automatically.
- **Rate limiting producers:** If consumers are overwhelmed, signal producers to slow down. This is easier with orchestration (the orchestrator can pause) than choreography (nobody is in charge).
- **Dropping or sampling:** For non-critical events (analytics, metrics), dropping or sampling under load may be acceptable. Never drop business-critical events.
- **Reactive streams:** Frameworks like Project Reactor and RxJava implement back-pressure protocols where consumers signal their capacity to producers.

---

## Trade-Offs Matrix

| Dimension | Event-Driven Approach | Synchronous Alternative | Winner |
|---|---|---|---|
| **Coupling** | Producers and consumers are decoupled; either can change independently. Schema contract is the only coupling point. | Caller depends on callee's API, availability, and response time. Changes require coordinated deployment. | EDA |
| **Scalability** | Consumers scale independently. Add partitions and consumers to handle load. Natural load leveling via buffering. | Callee must handle peak load directly or caller retries/fails. Scaling requires both sides to coordinate. | EDA |
| **Latency** | Added latency from serialization, network hop to broker, deserialization. Milliseconds to seconds depending on consumer lag. | Sub-millisecond for in-process; single-digit milliseconds for network calls. Direct and predictable. | Sync |
| **Debuggability** | Requires distributed tracing, correlation IDs, centralized logging. "Where did this event go?" is a hard question. | Stack traces. Breakpoints. Step-through debugging. "What called this function?" is trivially answerable. | Sync |
| **Fault tolerance** | Broker absorbs producer/consumer failures. Consumers can catch up after recovery. Messages persist during outages. | If the callee is down, the caller gets an error immediately. Circuit breakers help but add complexity. | EDA |
| **Data consistency** | Eventual consistency. The window between event emission and consumer processing can range from milliseconds to hours. | Strong consistency via database transactions. ACID guarantees. Immediate confirmation. | Sync |
| **Auditability** | Event logs provide a natural audit trail. Every state change is recorded as an immutable event. | Audit logging requires explicit implementation. Easy to forget a code path. | EDA |
| **Operational cost** | Message broker infrastructure (Kafka cluster, schema registry, monitoring). Requires specialized ops knowledge. | Application servers and databases. Standard DevOps tooling. Lower baseline operational burden. | Sync |
| **Team autonomy** | Teams can deploy and scale independently. Schema contracts are the boundary. | Teams must coordinate API changes, deployment order, and version compatibility. | EDA |
| **Testing complexity** | Integration tests require broker infrastructure. Verifying async workflows requires waiting, polling, or test harnesses. | Direct function calls are trivially unit-testable. Integration tests are synchronous and deterministic. | Sync |
| **Recovery from failure** | Dead letter queues, replay from offset, reprocessing historical events. Rich recovery tooling. | Retry with exponential backoff. Failed requests may require manual reconciliation. | EDA |

**Summary:** EDA wins on coupling, scalability, fault tolerance, auditability, team autonomy, and recovery. Synchronous wins on latency, debuggability, consistency, operational cost, and testing. Choose based on which properties your system values most.

---

## Evolution Path

### Stage 1: Start Synchronous (Monolith or Simple Services)

Begin with direct function calls or REST/gRPC APIs. This is correct for most new projects. You do not know your scaling requirements, your team is learning the domain, and the overhead of distributed systems is not justified.

**Indicators you are here:** Single deployment unit. Database transactions provide consistency. All communication is request-response. Debugging means reading stack traces.

### Stage 2: Identify Specific Decoupling Needs

As the system grows, certain patterns emerge that signal EDA could help:

- **Side effects that slow down the critical path.** A user registration endpoint sends a welcome email, updates analytics, provisions a workspace, and notifies the sales team. The user waits 3 seconds for all of this. Move side effects to async event processing; the user gets a response in 200ms.
- **Multiple consumers need the same data.** The search index, recommendation engine, analytics pipeline, and audit log all need to know about product changes. Rather than the product service calling four APIs, it emits a `ProductUpdated` event.
- **Downstream services have different SLAs.** The payment service needs 99.99% availability; the email service needs 99%. Coupling them synchronously means the payment flow fails when email is down.

### Stage 3: Introduce Async for Specific Paths

Do not convert everything at once. Pick the highest-value use case:

1. **Notifications and side effects** — The easiest starting point. Emit events for email, SMS, push notifications. Use a simple queue (SQS, RabbitMQ). This is low risk and delivers immediate value.
2. **Analytics and audit logging** — Emit domain events to an event log. Analytics consumers process them independently. The main application is unaffected.
3. **Cross-service workflows** — Introduce event-driven communication between specific services where the coupling is causing deployment coordination pain.

### Stage 4: Event Backbone

Once multiple services communicate through events, standardize:

- Adopt a schema registry and enforce compatibility rules.
- Standardize event envelope format (eventId, correlationId, causationId, version).
- Build shared libraries for event production and consumption (serialization, retry, DLQ, idempotency).
- Deploy centralized monitoring: consumer lag dashboards, DLQ alerting, event flow visualization.

### Stage 5: Full Event-Driven (If Justified)

Some organizations reach a point where events are the primary communication mechanism. This is appropriate for large-scale platforms (LinkedIn, Uber, Netflix) where hundreds of services must communicate with minimal coordination.

**Warning:** Most systems should stop at Stage 3 or 4. Full EDA is justified only when you have the team size, operational maturity, and business requirements to support it.

---

## Failure Modes

### Event Storms

A cascade where one event triggers multiple events, which each trigger more events, creating an exponential amplification effect.

**How it happens:** Service A emits `OrderCreated`. Service B consumes it and emits `InventoryReserved`. Service C consumes both `OrderCreated` and `InventoryReserved` and emits `PaymentRequested` for each — but it should only emit one. Now the payment service processes two charges. The customer disputes. The refund flow emits more events. The storm grows.

**Real-world pattern:** Retry storms following transient errors. A downstream service returns a 503. All consumers retry immediately. The downstream service, already overloaded, returns more 503s. Each retry produces a retry event. Without exponential backoff and jitter, the system amplifies the original failure.

**Mitigation:** Implement circuit breakers on consumers. Add exponential backoff with jitter on retries. Use rate limiting on event production. Design idempotent consumers so duplicate processing is harmless. Monitor event production rates and alert on anomalous spikes.

### Schema Drift

Producers change event schemas without coordinating with consumers. A field is renamed, a required field is removed, or a type changes from string to integer.

**How it happens:** Team A owns the order service and renames `totalAmount` to `orderTotal` in a "cleanup" commit. Team B's analytics consumer parses `totalAmount` and starts getting null values. No error is thrown — the JSON silently ignores the unknown field. Analytics dashboards show zero revenue for 6 hours before anyone notices.

**Mitigation:** Schema registry with compatibility enforcement (BACKWARD or FULL mode). CI/CD pipeline that validates schema changes against the registry before deployment. Contract testing between producers and consumers.

### Consumer Lag

A consumer falls behind the event production rate. The gap between the latest produced event and the latest consumed event grows continuously.

**How it happens:** A consumer does expensive processing (ML inference, database joins) that takes 500ms per event. The producer emits 1,000 events per second. The consumer processes 2 events per second. The lag grows by 998 events per second. Within an hour, the consumer is processing events from an hour ago. Within a day, the lag is unrecoverable.

**Impact:** Data becomes stale. Real-time features show outdated information. If the consumer is part of a workflow, downstream steps are delayed. If the event log has a retention period, lagging consumers may lose events permanently when older segments are deleted.

**Mitigation:** Monitor consumer lag per consumer group per partition. Alert when lag exceeds a threshold. Scale consumers horizontally (add more instances). Increase partitions to allow more parallelism. Optimize consumer processing time. Consider dedicated consumer groups for slow processors so they do not block fast consumers.

### Message Loss

Events disappear between production and consumption.

**How it happens:** Producer sends an event but does not wait for broker acknowledgment (fire-and-forget, acks=0 in Kafka). The broker crashes before flushing to disk. Or: The consumer commits the offset before processing the message, then crashes. The message is marked as consumed but was never processed.

**Mitigation:** Configure producers for `acks=all` (Kafka) or publisher confirms (RabbitMQ). Enable broker replication (minimum replication factor of 3). Process messages before committing offsets. Use transactional outbox pattern: write the event to a database table in the same transaction as the business state change, then a separate process publishes from the outbox to the broker.

### Ordering Violations

Events arrive at a consumer in a different order than they were produced.

**How it happens:** `OrderPlaced` and `OrderCancelled` are produced in sequence but land in different partitions (because the partition key was not set consistently). A consumer processes `OrderCancelled` first, does nothing (no order to cancel), then processes `OrderPlaced` and creates an order that should have been cancelled.

**Mitigation:** Use consistent partition keys. For order events, partition by orderId so all events for the same order arrive in order. Accept that cross-entity ordering is not guaranteed and design for it. Use sequence numbers in events so consumers can detect and handle out-of-order delivery.

### Poison Pills

A malformed event that crashes the consumer on every processing attempt, blocking the entire partition.

**How it happens:** A producer has a serialization bug and emits an event with invalid JSON. Or a valid event triggers a bug in the consumer's business logic (division by zero, null reference). The consumer crashes, restarts, reads the same event, crashes again. The partition is stuck.

**Mitigation:** Wrap consumer processing in try-catch. After N failures (configurable), move the event to a dead letter queue and advance the offset. Log the full event payload and error details. Alert on DLQ additions. Build tooling to inspect and replay DLQ events after the bug is fixed.

### Split-Brain During Rebalancing

When a consumer group rebalances (a consumer joins or leaves), there is a brief period where partition ownership is ambiguous. Two consumers might process the same partition simultaneously.

**Mitigation:** Use cooperative rebalancing (Kafka 2.4+). Design consumers for idempotency so double-processing is harmless. Use session timeouts and heartbeat intervals tuned to your workload.

---

## Technology Landscape

### Apache Kafka

The dominant event log platform. Append-only, partitioned, replicated log with configurable retention. Consumer groups provide scalable consumption. Kafka Streams and ksqlDB enable stream processing without a separate framework. Kafka Connect provides connectors for databases, cloud services, and file systems.

- **Strengths:** Throughput (millions of messages per second), durability, replay, ecosystem maturity, exactly-once semantics within Kafka.
- **Weaknesses:** Operational complexity (ZooKeeper dependency being removed with KRaft), JVM memory tuning, partition management, steep learning curve.
- **Best for:** High-throughput event backbone, audit trails, stream processing, data pipeline integration.

### RabbitMQ

A traditional message broker implementing AMQP. Supports complex routing (direct, topic, fanout, headers exchanges), message acknowledgment, and TTL.

- **Strengths:** Flexible routing, mature, well-understood, supports multiple protocols (AMQP, MQTT, STOMP), lightweight for small deployments.
- **Weaknesses:** Messages are deleted after consumption (no replay). Performance degrades with large queue depths. Not designed for high-throughput streaming.
- **Best for:** Task queues, command distribution, RPC-style async, workloads that need complex routing logic.

### AWS SNS/SQS/EventBridge

Amazon's managed messaging services. SNS provides pub/sub fan-out. SQS provides reliable queues with at-least-once delivery. EventBridge provides content-based routing with rules.

- **Strengths:** Fully managed (no cluster operations), native AWS integration, pay-per-use pricing, FIFO variants for ordering.
- **Weaknesses:** Vendor lock-in, limited throughput compared to Kafka, no replay capability (except EventBridge Archive), SQS messages must be polled.
- **Best for:** AWS-native applications, serverless architectures (Lambda integration), moderate throughput workloads.

### Google Cloud Pub/Sub

Managed pub/sub with automatic scaling, push and pull delivery, message replay (seek to timestamp), and exactly-once delivery mode. Best for GCP-native applications and global event distribution. Trade-off: vendor lock-in, ordering keys instead of partitions.

### NATS / NATS JetStream

Lightweight, high-performance messaging. NATS Core provides at-most-once pub/sub; JetStream adds persistence, replay, and consumer groups. Extremely fast (lower latency than Kafka for small messages), single-binary deployment. Best for edge computing, IoT, and systems where Kafka is overkill. Trade-off: smaller ecosystem, less enterprise adoption.

### Apache Pulsar

Combines log-based storage (like Kafka) with queue semantics. Separates compute from storage (BookKeeper). Supports multi-tenancy, geo-replication, and tiered storage. Best for multi-tenant platforms and geo-distributed deployments. Trade-off: smaller community, more complex architecture.

### Temporal / Step Functions / Conductor

Workflow orchestration engines, not message brokers. They provide durable execution of multi-step workflows with built-in retry, compensation, and visibility.

- **Temporal:** Open-source, code-first workflow definitions, supports long-running workflows (months), automatic state management and retry.
- **AWS Step Functions:** Managed orchestration, visual workflow designer, native integration with AWS services.
- **Netflix Conductor:** Open-source, JSON-based workflow definitions, built for Netflix's microservices scale.

- **Best for:** Orchestrated sagas, multi-step business processes where you need visibility into workflow state, compensation logic, and reliable execution.

### Schema Registry Options

- **Confluent Schema Registry:** The standard for Kafka. Supports Avro, Protobuf, JSON Schema. Compatibility enforcement.
- **AWS Glue Schema Registry:** Managed, integrates with AWS services. Supports Avro and JSON Schema.
- **Apicurio Registry:** Open-source, supports multiple serialization formats, integrates with Kafka and other brokers.

---

## Decision Tree

Use concrete thresholds, not vibes.

```
Q1: Does the producer need an immediate response from the consumer?
├── YES → Use synchronous request-response (REST/gRPC). Stop here.
└── NO → Continue.

Q2: How many independent consumers need this data?
├── 1 consumer → Use a direct API call or simple task queue. Stop here.
├── 2-3 consumers → Consider EDA. Evaluate whether the coupling cost
│                    justifies the operational overhead.
└── 4+ consumers → Use EDA. The fan-out value is clear.

Q3: What throughput do you need?
├── < 100 msgs/sec → SQS, RabbitMQ, or even a database-backed queue.
├── 100 - 10,000 msgs/sec → RabbitMQ, SQS, NATS, Kafka (single cluster).
├── 10,000 - 1,000,000 msgs/sec → Kafka, Pulsar, NATS JetStream.
└── > 1,000,000 msgs/sec → Kafka (multi-cluster), custom infrastructure.

Q4: Do you need event replay?
├── YES → Kafka, Pulsar, or NATS JetStream (log-based).
│          RabbitMQ and SQS do not support replay.
└── NO → Any broker is fine. Choose based on throughput and operational
          preference.

Q5: Do you need strict ordering?
├── GLOBAL ordering → Reconsider EDA. Single partition = no parallelism.
│                      Consider a synchronous pipeline instead.
├── Per-entity ordering → Use partition keys (Kafka) or message group
│                          IDs (SQS FIFO). Standard EDA.
└── No ordering requirement → Any broker with any partitioning.

Q6: Choreography or Orchestration?
├── Simple reactions (notifications, analytics, audit) → Choreography.
├── Multi-step business workflow with compensation → Orchestration
│   (Temporal, Step Functions, Conductor).
└── Both → Choreography for side effects, orchestration for the
           critical path. This is the most common production pattern.

Q7: What is your team's distributed systems experience?
├── Low → Start with managed services (SQS/SNS, Cloud Pub/Sub).
│          Avoid self-managed Kafka until you have ops maturity.
├── Medium → Managed Kafka (Confluent Cloud, Amazon MSK) with
│             schema registry and monitoring.
└── High → Self-managed Kafka, custom tooling, Flink/Streams for
            stream processing.
```

---

## Implementation Sketch

### Event Schema Definition (Avro)

```avro
{
  "type": "record",
  "name": "OrderPlaced",
  "namespace": "com.example.orders.events",
  "doc": "Emitted when a customer successfully places an order.",
  "fields": [
    { "name": "eventId", "type": "string", "doc": "Unique event identifier (UUID v4)" },
    { "name": "eventVersion", "type": "string", "default": "1.0", "doc": "Schema version" },
    { "name": "timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "correlationId", "type": "string", "doc": "Shared across all events in a business transaction" },
    { "name": "causationId", "type": ["null", "string"], "default": null, "doc": "EventId of the causing event" },
    { "name": "orderId", "type": "string" },
    { "name": "customerId", "type": "string" },
    { "name": "items", "type": {
      "type": "array",
      "items": {
        "type": "record",
        "name": "OrderItem",
        "fields": [
          { "name": "sku", "type": "string" },
          { "name": "quantity", "type": "int" },
          { "name": "unitPriceCents", "type": "long", "doc": "Price in cents to avoid floating point" }
        ]
      }
    }},
    { "name": "totalAmountCents", "type": "long" },
    { "name": "currency", "type": "string", "default": "USD" }
  ]
}
```

### Producer (TypeScript / Node.js with Kafka)

```typescript
import { Kafka, Partitioners } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { randomUUID } from 'crypto';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-1:9092', 'kafka-2:9092', 'kafka-3:9092'],
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  idempotent: true,           // Prevents duplicate messages from producer retries
  maxInFlightRequests: 5,     // With idempotent=true, Kafka handles ordering
  retry: { retries: 3 },
});

const registry = new SchemaRegistry({ host: 'http://schema-registry:8081' });

async function publishOrderPlaced(order: Order, correlationId: string): Promise<void> {
  const event = {
    eventId: randomUUID(),
    eventVersion: '1.0',
    timestamp: Date.now(),
    correlationId,
    causationId: null,
    orderId: order.id,
    customerId: order.customerId,
    items: order.items.map(item => ({
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPrice * 100),
    })),
    totalAmountCents: Math.round(order.total * 100),
    currency: order.currency,
  };

  const encodedValue = await registry.encode(SCHEMA_ID, event);

  await producer.send({
    topic: 'orders.placed',
    messages: [{
      key: order.id,             // Partition by orderId for ordering
      value: encodedValue,
      headers: {
        'correlation-id': correlationId,
        'event-type': 'order.placed',
        'source': 'order-service',
      },
    }],
    acks: -1,                    // Wait for all replicas (acks=all)
  });
}
```

### Consumer with Idempotency and DLQ

```typescript
import { Kafka, EachMessagePayload } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

const consumer = kafka.consumer({
  groupId: 'inventory-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxPollIntervalMs: 300000,
});

const registry = new SchemaRegistry({ host: 'http://schema-registry:8081' });
const dlqProducer = kafka.producer();

const MAX_RETRIES = 3;

async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders.placed', fromBeginning: false });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, partition, message } = payload;
      const eventId = message.headers?.['event-id']?.toString();
      const correlationId = message.headers?.['correlation-id']?.toString();

      try {
        // Decode using schema registry
        const event = await registry.decode(message.value!);

        // Idempotency check: skip if already processed
        const alreadyProcessed = await idempotencyStore.exists(event.eventId);
        if (alreadyProcessed) {
          console.log(`Skipping duplicate event ${event.eventId}`);
          return; // Offset will be committed automatically
        }

        // Business logic: reserve inventory
        await inventoryService.reserveStock(event.orderId, event.items);

        // Mark as processed (in same transaction as business logic if possible)
        await idempotencyStore.markProcessed(event.eventId);

        console.log(`Processed order ${event.orderId} [correlation: ${correlationId}]`);

      } catch (error) {
        const retryCount = parseInt(message.headers?.['retry-count']?.toString() || '0');

        if (retryCount >= MAX_RETRIES) {
          // Move to Dead Letter Queue
          await dlqProducer.send({
            topic: 'orders.placed.dlq',
            messages: [{
              key: message.key,
              value: message.value,
              headers: {
                ...message.headers,
                'original-topic': topic,
                'original-partition': String(partition),
                'error-message': String(error),
                'failed-at': new Date().toISOString(),
                'consumer-group': 'inventory-service',
              },
            }],
          });
          console.error(`Moved to DLQ after ${MAX_RETRIES} retries: ${eventId}`);
        } else {
          // Retry: re-publish to a retry topic with delay
          await dlqProducer.send({
            topic: 'orders.placed.retry',
            messages: [{
              key: message.key,
              value: message.value,
              headers: {
                ...message.headers,
                'retry-count': String(retryCount + 1),
                'retry-after': String(Date.now() + (1000 * Math.pow(2, retryCount))),
              },
            }],
          });
        }
      }
    },
  });
}
```

### Kafka Topic Design

```
# Topic naming convention: <domain>.<entity>.<event-type>
# Use dots for logical separation, hyphens within names

orders.placed              # New orders (partitioned by orderId)
orders.cancelled           # Cancelled orders
orders.placed.retry        # Retry topic with exponential backoff
orders.placed.dlq          # Dead letter queue for orders.placed

payments.charged           # Successful payments
payments.failed            # Failed payment attempts
payments.refunded          # Refunds

inventory.reserved         # Stock reserved for an order
inventory.released         # Stock released (order cancelled/failed)

notifications.email        # Email send requests (command-style)
notifications.sms          # SMS send requests

# Partition strategy:
# - orders.*: partition by orderId (ensures per-order ordering)
# - payments.*: partition by orderId (correlate with order events)
# - inventory.*: partition by warehouseId (per-warehouse processing)
# - notifications.*: partition by customerId (per-customer ordering)

# Retention:
# - Business events (orders, payments): 30 days (or infinite for audit)
# - Retry topics: 7 days
# - DLQ topics: 90 days (need time to investigate and replay)
# - Notifications: 3 days (ephemeral, no replay value)

# Partition count:
# - Start with 12 partitions for moderate throughput
# - Scale to 36-72 for high throughput
# - Never reduce partition count (Kafka does not support it)
# - Rule of thumb: partitions >= expected peak consumer instances
```

### Correlation ID Propagation

```typescript
// Middleware: extract or create correlation ID, attach to async context
function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
  res.setHeader('x-correlation-id', correlationId);
  asyncLocalStorage.run({ correlationId }, () => next());
}

// Consumer: propagate correlation ID to all downstream events
async function handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  await publishEvent('payments.requested', {
    correlationId: event.correlationId,   // Same correlation ID
    causationId: event.eventId,           // This event caused the payment request
    orderId: event.orderId,
    amount: event.totalAmountCents,
  });
}
```

---

## Cross-References

- **[cqrs-event-sourcing](../cqrs-event-sourcing.md)** — Event Sourcing uses events as the system of record; CQRS separates read/write models connected by events. Complementary to EDA but orthogonal.
- **[microservices](../microservices.md)** — EDA is a primary communication pattern for microservices. Most microservice architectures use some form of event-driven communication for inter-service messaging.
- **[saga-pattern](../../backend/saga-pattern.md)** — Sagas coordinate multi-step distributed transactions using either choreography (event-driven) or orchestration. EDA is the substrate on which choreographed sagas run.
- **[event-streams-and-queues](../../infrastructure/event-streams-and-queues.md)** — Infrastructure-level details of broker deployment, cluster sizing, replication, and operational runbooks.
- **[idempotency-and-retry](../../backend/idempotency-and-retry.md)** — Idempotency is mandatory for EDA consumers. Retry strategies, deduplication tables, and exactly-once semantics are covered in depth.

---

## Sources

- [Growin: Event Driven Architecture Done Right (2025)](https://www.growin.com/blog/event-driven-architecture-scale-systems-2025/)
- [Estuary: 10 Event-Driven Architecture Examples](https://estuary.dev/blog/event-driven-architecture-examples/)
- [Ably: Event-Driven Architecture Challenges](https://ably.com/topic/event-driven-architecture-challenges)
- [Three Dots Labs: Event-Driven Architecture: The Hard Parts](https://threedots.tech/episode/event-driven-architecture/)
- [CodeOpinion: Event-Driven Architecture Issues & Challenges](https://codeopinion.com/event-driven-architecture-issues-challenges/)
- [Wix Engineering: 5 Pitfalls to Avoid](https://medium.com/wix-engineering/event-driven-architecture-5-pitfalls-to-avoid-b3ebf885bdb1)
- [Camunda: Orchestration vs Choreography](https://camunda.com/blog/2023/02/orchestration-vs-choreography/)
- [Temporal: Saga Orchestration vs Choreography](https://temporal.io/blog/to-choreograph-or-orchestrate-your-saga-that-is-the-question)
- [LinkedIn: Open-sourcing Kafka](https://www.linkedin.com/blog/member/archive/open-source-linkedin-kafka)
- [Quastor: How LinkedIn Uses Event Driven Architectures](https://blog.quastor.org/p/how-linkedin-uses-event-driven-architectures-to-scale)
- [Uber Blog: Real-Time Exactly-Once Ad Event Processing](https://www.uber.com/blog/real-time-exactly-once-ad-event-processing/)
- [ByteByteGo: How Uber Manages Petabytes of Real-Time Data](https://blog.bytebytego.com/p/how-uber-manages-petabytes-of-real)
- [AWS: SNS, SQS, or EventBridge Decision Guide](https://docs.aws.amazon.com/decision-guides/latest/sns-or-sqs-or-eventbridge/sns-or-sqs-or-eventbridge.html)
- [Confluent Schema Registry and Avro](https://markaicode.com/kafka-schema-registry-avro/)
- [The Burning Monk: Event Versioning Strategies](https://theburningmonk.com/2025/04/event-versioning-strategies-for-event-driven-architectures/)
- [Equal Experts: EDA — The Good, The Bad, and The Ugly](https://www.equalexperts.com/blog/tech-focus/event-driven-architecture-the-good-the-bad-and-the-ugly/)
