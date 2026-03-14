# Event Streams and Queues — Architecture Expertise Module

> Event streams (Kafka, Kinesis) and message queues (RabbitMQ, SQS) are the backbone of asynchronous communication. Despite surface similarity, they solve fundamentally different problems: queues distribute work across consumers (each message processed once), while event streams provide a durable, replayable log of events (multiple consumers can read independently). Conflating the two is one of the most common architectural mistakes in distributed systems.

> **Category:** Data
> **Complexity:** Moderate
> **Applies when:** Asynchronous communication between services, background job processing, event-driven architectures, real-time data pipelines

---

## What This Is (and What It Isn't)

### Two Fundamentally Different Abstractions

Despite both moving messages from producers to consumers, message queues and event streams have **different data models, different consumption semantics, and different failure characteristics**. They are not interchangeable. Treating one like the other leads to subtle, production-breaking bugs.

**Message Queue** — A transient buffer for work distribution. A producer enqueues a message; one consumer dequeues and processes it; the message is deleted. Think of it as a task list: once a task is done, it is removed. The queue's job is to ensure exactly one consumer handles each message. RabbitMQ, AWS SQS, ActiveMQ, and BullMQ are canonical examples.

**Event Stream** — An immutable, append-only log of events. Producers append events; consumers read from the log at their own pace using an offset (a cursor position). The event is never deleted by consumption — it persists for a configured retention period (or indefinitely with compaction). Multiple independent consumers can read the same events without interfering with each other. Apache Kafka, Amazon Kinesis, Apache Pulsar, and Redpanda are canonical examples.

### The Key Distinction: Ownership of the Cursor

In a queue, the **broker** owns the cursor. It tracks which messages have been delivered and acknowledged, and removes them. Consumers are passive recipients.

In a stream, the **consumer** owns the cursor (offset). The broker simply stores the log. Each consumer group tracks its own position independently. This is why replay is possible — rewind the offset and re-read.

### What They Share

Both provide **decoupling** (producer and consumer don't need to know about each other), **buffering** (absorb bursts when producers outpace consumers), and **asynchrony** (producer doesn't block waiting for the consumer). Both require careful handling of failure, ordering, and delivery guarantees.

### They Are NOT Interchangeable

Using Kafka as a simple work queue is possible but wasteful — you pay for partitioning, retention, and replication you don't need. Using RabbitMQ as an event log is dangerous — once a message is consumed it is gone, and you cannot replay. Choose based on the consumption pattern, not the throughput number on a benchmark slide.

---

## When to Use Queues

### The Core Pattern: Work Distribution

Use a message queue when you have **tasks to distribute across competing consumers** and each task should be processed exactly once.

**Background job processing.** A web request enqueues a "send welcome email" job. One of N worker processes picks it up, sends the email, and acknowledges. The job is removed from the queue. If the worker crashes before acknowledging, the message becomes visible again (visibility timeout in SQS, nack/requeue in RabbitMQ).

**Load leveling.** Your API receives 10,000 image resize requests per minute during peak hours but your GPU workers can only handle 2,000/min. The queue absorbs the burst. Workers drain it at their own pace. No request is lost; latency increases but the system doesn't crash.

**Request-reply (RPC over messaging).** Service A sends a request message with a correlation ID and a reply-to queue. Service B processes it and sends the response to the reply queue. RabbitMQ's direct reply-to feature optimizes this pattern.

**Fan-out with topic routing.** RabbitMQ exchanges (direct, topic, fanout, headers) provide flexible routing. A single message can be routed to multiple queues based on routing keys. This is pub/sub, but each queue still has competing consumers — the queue semantics remain.

**Delayed and scheduled jobs.** RabbitMQ supports delayed message plugins; SQS has DelaySeconds; BullMQ has built-in delayed jobs with cron scheduling. This is awkward to implement with event streams.

**Priority processing.** RabbitMQ supports priority queues natively (up to 255 priority levels). Kafka partitions have no concept of priority — all messages in a partition are read in order.

### Indicators That a Queue Is the Right Choice

- Each message represents a **unit of work** that should be processed once
- You need **competing consumers** that divide work (not duplicate it)
- Message **ordering across the entire queue** is not critical (or FIFO queues suffice)
- You want messages to **disappear after processing** — retention is not needed
- You need **routing logic** (topic patterns, header-based routing, priority lanes)
- The consumer count is **dynamic** and scales independently of message partitioning

---

## When to Use Streams

### The Core Pattern: Event Log

Use an event stream when events are **facts that happened** and multiple systems need to react to them independently, potentially at different speeds, potentially replaying history.

**Event sourcing.** Instead of storing current state, store every state-changing event. The stream IS the database. Rebuild state by replaying events from the beginning. Kafka's log compaction feature keeps the latest value per key, enabling infinite retention of the "current state" while discarding superseded events.

**Audit logs and compliance.** Financial regulations (SOX, PCI-DSS, MiFID II) require an immutable record of every transaction. An event stream provides this natively — events are append-only, timestamped, and retained for configurable periods.

**Multi-consumer data pipelines.** An "order placed" event needs to be consumed by: (1) the fulfillment service, (2) the analytics pipeline, (3) the notification service, (4) the fraud detection system. With a queue, you need four separate queues and fan-out logic. With a stream, each service has its own consumer group reading the same topic independently.

**Real-time analytics and CEP.** Kafka Streams, Apache Flink, and ksqlDB enable complex event processing — windowed aggregations, joins between streams, pattern detection — directly on the event log without extracting data to a separate system.

**Change Data Capture (CDC).** Debezium captures database row-level changes and publishes them to Kafka topics. Downstream services consume these change events to maintain materialized views, update search indexes, or synchronize data warehouses.

**Replay and reprocessing.** A bug in consumer v1 corrupted derived data. Deploy consumer v2, reset its offset to the beginning of the topic, and reprocess every event. The source of truth (the log) was never affected. This is impossible with a queue — consumed messages are gone.

### Indicators That a Stream Is the Right Choice

- Events are **facts** (immutable records of things that happened), not tasks
- **Multiple independent consumers** need the same events
- You need **replay** capability (reprocessing, backfilling, debugging)
- **Ordering within a partition** is critical (e.g., all events for a given user must be processed in order)
- You are building an **event-driven architecture** where services react to domain events
- Data must be **retained** for hours, days, or indefinitely
- You need **stream processing** (windowed aggregations, joins, pattern detection)

---

## When NOT to Use Either

This section is deliberately long because **over-engineering with messaging infrastructure is as common as under-engineering it**.

### When a Database-Backed Job Queue Is Enough

If you are processing 100 messages per day — or even 10,000 — you likely do not need Kafka or RabbitMQ. A Postgres table with a `status` column, a `locked_until` timestamp, and `SELECT ... FOR UPDATE SKIP LOCKED` gives you a perfectly functional job queue with zero additional infrastructure. Libraries like `graphile-worker` (Node.js), `Oban` (Elixir), `Sidekiq` (Ruby, backed by Redis), `Celery` (Python), and `Hangfire` (.NET) provide battle-tested abstractions over database-backed queues.

**When this is the right call:**
- Fewer than 10,000 jobs/minute
- You already have a database and don't want to operate another system
- Jobs don't need to fan out to multiple consumers
- You don't need replay, retention, or stream processing
- Your team doesn't have Kafka/RabbitMQ operational expertise

### When Kafka Is Over-Engineering

Kafka is a distributed system that requires: ZooKeeper or KRaft for consensus, careful partition planning, ISR (in-sync replica) monitoring, topic configuration management, consumer group rebalancing, and JVM tuning. Running Kafka well demands dedicated operational knowledge.

**Do not use Kafka when:**
- You have a small team without dedicated infrastructure engineers
- Your message volume is under 1,000 messages/second and a managed queue (SQS) would suffice
- You don't need replay, multi-consumer, or stream processing
- You primarily need request-reply patterns (Kafka is awkward for RPC)
- You need per-message routing logic (Kafka topics are coarse-grained; RabbitMQ exchanges are far more flexible)
- You need message priority (Kafka has no priority concept)

### When a Direct HTTP Call or Webhook Is Enough

If Service A calls Service B synchronously and can tolerate B's latency, a direct HTTP call is simpler. Adding a queue "just in case" without a clear failure or decoupling requirement adds latency, operational burden, and debugging complexity (you now need to trace messages through a broker).

### When Polling or Cron Is Enough

A nightly batch job that processes all new orders doesn't need a real-time event stream. A cron job querying a database for `WHERE processed = false` is simpler, easier to debug, and sufficient when real-time processing isn't required.

### The "Resume-Driven Development" Anti-Pattern

Introducing Kafka because "we might need it someday" or "Netflix uses it" is the most common form of over-engineering in backend systems. Kafka solves real problems at scale — but at the cost of significant operational complexity. If you cannot articulate which specific problem Kafka solves that a simpler approach cannot, you don't need it yet. Start with the simplest tool that works and migrate when you hit actual limits.

---

## How It Works

### Queue Semantics

**Point-to-point delivery.** Each message is delivered to exactly one consumer. If five consumers listen on the same queue, the broker load-balances messages across them (competing consumers pattern). This is the default behavior in RabbitMQ and SQS.

**Fan-out via exchanges (RabbitMQ).** A fanout exchange copies each message to every bound queue. A topic exchange routes based on routing key patterns (e.g., `order.*.created` matches `order.us.created`). A headers exchange routes based on message header values. This provides pub/sub ON TOP of queue semantics — each queue still has its own competing consumers.

**Dead Letter Queues (DLQ).** When a message fails processing repeatedly (exceeds max retries or TTL), the broker moves it to a designated DLQ. This prevents poison messages from blocking the entire queue. SQS has native DLQ support via redrive policies. RabbitMQ uses dead-letter exchanges (DLX). DLQs are essential — without them, a single malformed message can halt all processing.

**Visibility timeout / acknowledgment.** SQS uses visibility timeout: after a consumer receives a message, the message is invisible to other consumers for a configurable period. If the consumer doesn't delete it in time, it becomes visible again. RabbitMQ uses explicit acknowledgments: the consumer sends `ack` (success) or `nack` (failure, optionally requeue). Unacknowledged messages are redelivered when the consumer disconnects.

**Message TTL and expiration.** Messages can expire after a configurable time. RabbitMQ supports per-queue and per-message TTL. SQS supports message retention from 1 minute to 14 days (default 4 days). Expired messages are either discarded or routed to a DLQ.

### Stream Semantics

**Partitions.** A topic is divided into partitions (Kafka) or shards (Kinesis). Each partition is an ordered, immutable sequence of events. Ordering is guaranteed ONLY within a partition, not across partitions. A message's partition is determined by its key (hash of key modulo partition count) or round-robin if no key is provided.

**Offsets.** Each message in a partition has a monotonically increasing offset (a 64-bit integer). A consumer reads from a specific offset and advances it as it processes messages. The consumer (or consumer group) periodically commits its current offset to the broker, forming a checkpoint. On restart, the consumer resumes from the last committed offset.

**Consumer groups.** A consumer group is a set of consumers that cooperatively consume a topic. Each partition is assigned to exactly one consumer in the group. If you have 6 partitions and 3 consumers in a group, each consumer handles 2 partitions. If a consumer dies, its partitions are reassigned to surviving consumers (rebalancing). Different consumer groups are completely independent — each tracks its own offsets and reads every message.

**Retention and compaction.** Time-based retention: delete messages older than N hours/days (default 7 days in Kafka). Size-based retention: delete oldest messages when the partition exceeds N bytes. Log compaction: keep only the latest message per key — enables "table" semantics on a topic where each key represents an entity and the latest value is its current state.

**Compacted topics as materialized views.** A compacted topic with key = `user-123` and value = `{name: "Alice", email: "..."}` effectively becomes a key-value store. Kafka's KTable abstraction and ksqlDB build on this. New consumers reading from the beginning of a compacted topic get the full current state of every entity.

### Delivery Guarantees

**At-most-once.** Fire and forget. The producer sends the message and doesn't wait for acknowledgment. The consumer processes the message before committing the offset. If either crashes, the message is lost. Fastest, but unsuitable for anything that matters.

**At-least-once.** The producer retries until the broker acknowledges. The consumer commits the offset AFTER successful processing. If the consumer crashes after processing but before committing, the message is redelivered. This is the default for most systems and the RIGHT default for most use cases. Requires idempotent consumers.

**Exactly-once.** The holy grail — and the most misunderstood guarantee. Kafka achieves exactly-once semantics (EOS) within its ecosystem via idempotent producers (sequence numbers per partition to deduplicate retries) and transactional writes (atomically write to multiple partitions and commit offsets). However, EOS has real limitations:

- **Scope**: Exactly-once applies to Kafka-to-Kafka workflows (consume from topic A, process, produce to topic B, commit offset — all atomically). It does NOT extend to external systems. If your consumer writes to a database and Kafka, you still need idempotency at the database level.
- **Performance**: Transactional writes add latency (synchronous RPCs for transaction coordination) and reduce throughput. Each producer can have only one active transaction.
- **Consumer isolation**: Consumers reading transactional topics must use `read_committed` isolation, which means they cannot see uncommitted messages. This increases end-to-end latency because consumers must wait for the LSO (Last Stable Offset) to advance.

**The pragmatic choice**: Design for at-least-once delivery with idempotent consumers. This works across all brokers and all external systems. Exactly-once within Kafka is valuable for stream processing pipelines (Kafka Streams, ksqlDB) but should not be relied upon as a substitute for application-level idempotency.

### Back-Pressure

**Queue-based back-pressure.** The queue grows when producers outpace consumers. The queue has a max length or max memory limit. When reached: RabbitMQ blocks publishers (TCP back-pressure) or drops messages (overflow policy); SQS has no hard limit (effectively infinite, up to 14-day retention). Monitor queue depth as a key health metric — growing depth means consumers are falling behind.

**Stream-based back-pressure.** Consumer lag (the gap between the latest offset and the consumer's committed offset) is the primary metric. Kafka does not slow down producers when consumers lag — the log keeps growing until retention kicks in. If a consumer falls behind far enough, its unconsumed messages may be deleted by retention. This is a data loss scenario. Monitor consumer lag aggressively. Auto-scale consumers or alert when lag exceeds thresholds.

---

## Trade-Offs Matrix

| Dimension | Message Queue (RabbitMQ/SQS) | Event Stream (Kafka/Kinesis) |
|---|---|---|
| **Data model** | Transient message, deleted after ack | Immutable log, retained by policy |
| **Consumption** | Competing consumers (1 msg = 1 consumer) | Independent consumer groups (1 msg = N consumers) |
| **Ordering** | FIFO per queue (with caveats) | Ordered per partition only |
| **Replay** | Not possible (message gone after ack) | Native (reset offset to any point) |
| **Routing** | Rich (exchange types, routing keys, headers) | Coarse (topic-level only) |
| **Throughput** | 50K-100K msg/s (RabbitMQ); unlimited (SQS) | 500K-1M+ msg/s (Kafka with batching) |
| **Latency** | Sub-ms at low throughput (RabbitMQ) | Low-single-digit ms (Kafka), tunable |
| **Delivery guarantees** | At-most-once, at-least-once | At-most-once, at-least-once, exactly-once (within Kafka) |
| **Back-pressure** | Broker-managed (queue depth limits, publisher blocking) | Consumer-managed (lag monitoring, no producer throttling) |
| **Priority** | Native support (RabbitMQ priority queues) | Not supported |
| **Delayed messages** | Supported (plugins, DelaySeconds) | Not natively supported |
| **Operational complexity** | Low-moderate (single Erlang node to HA cluster) | High (partitions, replication, ISR, consumer rebalancing) |
| **Scaling model** | Add consumers freely; queue is the bottleneck | Add partitions (but cannot reduce); consumers <= partitions |
| **Storage cost** | Low (messages deleted after processing) | High (all messages retained for retention period) |
| **Protocol** | AMQP, MQTT, STOMP (RabbitMQ); HTTP (SQS) | Custom binary protocol (Kafka); HTTP (Kinesis) |
| **Best for** | Task distribution, RPC, routing | Event sourcing, multi-consumer pipelines, analytics |

---

## Evolution Path

### Phase 1: Database-Backed Jobs (0-1,000 msg/s)

Start here. Use your existing database with a job processing library.

- **Node.js**: `graphile-worker` (Postgres), `BullMQ` (Redis)
- **Python**: `Celery` (Redis/RabbitMQ backend), `Dramatiq`, `Huey`
- **Ruby**: `Sidekiq` (Redis), `GoodJob` (Postgres)
- **Go**: `River` (Postgres), `Asynq` (Redis)
- **Elixir**: `Oban` (Postgres)
- **.NET**: `Hangfire` (SQL Server/Redis)

Benefits: no new infrastructure, transactional enqueue (enqueue a job in the same transaction as your database write), familiar debugging (SQL queries to inspect job state).

Limitations: database becomes the bottleneck above ~1,000-5,000 jobs/second; no pub/sub; no replay; polling-based consumption adds latency.

### Phase 2: Dedicated Message Broker (1,000-50,000 msg/s)

When you outgrow database-backed jobs or need pub/sub, routing, or multiple consumer patterns.

**RabbitMQ** for: flexible routing, request-reply, priority queues, mixed protocols (AMQP + MQTT for IoT). Operational model: Erlang cluster with quorum queues for durability. Modern RabbitMQ (3.13+, now 4.x) with quorum queues and streams is significantly more reliable than classic mirrored queues.

**Managed SQS/SNS** for: serverless architectures on AWS, zero-ops queue with unlimited throughput, fan-out via SNS-to-SQS subscriptions. Trade-off: 256KB message size limit, at-least-once delivery only (FIFO queues are limited to 300 msg/s per group or 3,000 msg/s with batching).

**NATS** for: lightweight, high-performance pub/sub with minimal operational overhead. NATS server is a single static binary (no JVM, no Erlang). NATS JetStream adds persistence, replay, and exactly-once delivery. Ideal for edge computing, IoT, and Kubernetes-native microservices. Throughput: 200K-400K msg/s with JetStream persistence.

### Phase 3: Event Streaming Platform (50,000+ msg/s or multi-consumer requirements)

When you need replay, multiple independent consumers, stream processing, or high-throughput event pipelines.

**Apache Kafka** for: the de facto standard in event streaming. Massive ecosystem (Kafka Connect, Kafka Streams, ksqlDB, Schema Registry). Production-proven at LinkedIn (7 trillion messages/day), PayPal (1 trillion messages/day), and Netflix. KRaft mode (replacing ZooKeeper, GA since Kafka 3.3) simplifies operations.

**Amazon Kinesis Data Streams** for: AWS-native event streaming without managing Kafka clusters. Auto-scaling with on-demand capacity mode. Integrates with Lambda, Firehose, Analytics. Trade-off: 1MB/s per shard ingestion, 2MB/s per shard consumption; less ecosystem than Kafka.

**Redpanda** for: Kafka API-compatible but written in C++ (no JVM). Lower tail latency, simpler operations (no ZooKeeper, no JVM tuning). Drop-in replacement for Kafka in most cases.

**Apache Pulsar** for: unified messaging (queues + streams in one system), multi-tenancy, geo-replication. Separates compute (brokers) from storage (BookKeeper), enabling independent scaling. More complex to operate than Kafka but more flexible.

### Phase 4: Hybrid Patterns (enterprise scale)

At scale, most organizations use BOTH queues and streams. Common pattern:

1. **Event stream** as the backbone: all domain events flow through Kafka topics
2. **Queue for task distribution**: a consumer reads from Kafka and enqueues specific tasks into SQS/RabbitMQ for worker pools
3. **CDC pipeline**: Debezium captures database changes into Kafka; downstream services consume change events
4. **Stream processing layer**: Kafka Streams or Flink for real-time aggregations, feeding results back into Kafka or a database

This is not over-engineering at scale — it is separation of concerns. The stream provides the durable event log; the queue provides work distribution. Each tool does what it does best.

---

## Failure Modes

### Consumer Lag (Streams)

**What happens:** Consumer group falls behind the latest offset. If lag exceeds retention, unprocessed messages are deleted — silent data loss.

**Causes:** Consumer processing is too slow; consumer crashed and wasn't restarted; rebalancing storms after deployment; external dependency (database, API) is slow.

**Detection:** Monitor `records-lag-max` and `records-lead-min` (Kafka JMX metrics), or use Burrow (LinkedIn's consumer lag monitoring tool). Alert when lag exceeds a threshold relative to your retention period.

**Mitigation:** Scale consumers (up to partition count); increase retention temporarily; optimize consumer processing; use back-pressure to slow producers if needed.

### Poison Messages (Queues and Streams)

**What happens:** A message that cannot be processed (malformed data, schema mismatch, triggers a bug) is retried infinitely, blocking the queue or partition.

**Queue mitigation:** Configure max retry count and dead-letter queue. After N failures, the message moves to the DLQ for manual inspection. SQS: set `maxReceiveCount` on the redrive policy. RabbitMQ: use `x-death` headers and dead-letter exchanges.

**Stream mitigation:** Harder because the consumer must advance its offset. Options: (1) log the error and skip (advance offset); (2) publish to a dead-letter topic; (3) use a circuit breaker that pauses consumption and alerts. Never allow a poison message to block an entire partition indefinitely.

### Partition Hot Spots (Streams)

**What happens:** One partition receives disproportionately more messages than others because the partition key has skewed distribution (e.g., one customer generates 80% of events).

**Symptoms:** One consumer in the group is overwhelmed while others are idle. Lag grows on the hot partition only.

**Mitigation:** Choose partition keys with high cardinality and even distribution. If a single entity generates massive traffic, use a compound key (e.g., `customer-123-shard-N` with random suffix) to spread its events across partitions — but this sacrifices per-entity ordering. Alternatively, increase partition count (but you cannot decrease it in Kafka).

### Message Loss

**Queue message loss scenarios:**
- Consumer acks before processing completes, then crashes (pre-ack loss)
- Queue exceeds max length with `drop-head` overflow policy (silent discard)
- SQS message exceeds 14-day retention without being consumed
- RabbitMQ node failure with non-durable queues (messages in RAM only)

**Stream message loss scenarios:**
- Producer sends with `acks=0` (fire-and-forget) and broker crashes
- Consumer lag exceeds retention period (messages deleted before consumption)
- Under-replicated partitions: broker failure when `min.insync.replicas` is not set correctly
- Unclean leader election: a lagging replica becomes leader and messages on the old leader are lost (disabled by default since Kafka 0.11)

**Prevention:** Always use `acks=all` for Kafka producers in critical paths. Set `min.insync.replicas=2` with replication factor 3. Use quorum queues (not classic mirrored queues) in RabbitMQ. Monitor under-replicated partitions and ISR shrink events.

### Consumer Rebalancing Storms (Kafka)

**What happens:** Adding or removing consumers triggers a rebalance — all partitions are reassigned. During rebalance, no consumer processes messages. If a consumer is slow to respond to the rebalance, it gets kicked out, triggering ANOTHER rebalance. This cascading effect can cause minutes of downtime.

**Causes:** Long-running message processing exceeding `max.poll.interval.ms`; rolling deployments that add/remove consumers rapidly; unstable consumers that frequently crash.

**Mitigation:** Use cooperative sticky assignor (incremental rebalancing, available since Kafka 2.4) instead of eager rebalancing. Increase `max.poll.interval.ms` if processing is legitimately slow. Use static group membership (`group.instance.id`) to avoid rebalance on brief consumer restarts. Deploy consumers with rolling updates that wait for rebalance to complete between pod restarts.

### Split Brain and Network Partitions

**RabbitMQ:** Network partition between cluster nodes can cause split-brain — both sides accept writes, leading to divergent queue state. RabbitMQ's partition handling modes (`pause-minority`, `autoheal`) each have trade-offs. Quorum queues (Raft-based) handle this correctly by requiring majority consensus.

**Kafka:** Less susceptible due to single-leader-per-partition design. The controller detects broker failures and reassigns leadership. With `min.insync.replicas` set correctly, a minority partition cannot accept writes.

---

## Technology Landscape

### Apache Kafka

The industry standard for event streaming. Created at LinkedIn (2011), open-sourced via Apache. Now developed by Confluent (founded by Kafka's creators).

**Strengths:** Highest throughput (millions of msg/s), battle-tested at extreme scale (LinkedIn: 7T msg/day, PayPal: 1T msg/day, Uber, Netflix, Walmart), massive ecosystem (Connect, Streams, ksqlDB, Schema Registry), KRaft mode eliminates ZooKeeper dependency, log compaction enables table semantics.

**Weaknesses:** Operational complexity (JVM tuning, partition management, ISR monitoring), high resource requirements (8+ cores, 64-128GB RAM per broker recommended), no message priority, no per-message routing, no native delayed messages, consumer rebalancing can cause processing pauses.

**Managed offerings:** Confluent Cloud, Amazon MSK, Azure Event Hubs (Kafka-compatible API), Aiven, Upstash (serverless Kafka).

### RabbitMQ

The most widely deployed open-source message broker. Implements AMQP 0.9.1 with extensions. Written in Erlang.

**Strengths:** Flexible routing (4 exchange types), multiple protocols (AMQP, MQTT, STOMP), priority queues, built-in management UI, lower resource requirements, excellent documentation, quorum queues (since 3.8) for strong consistency, RabbitMQ Streams (since 3.9) for log-based consumption.

**Weaknesses:** Lower throughput than Kafka (50K-100K msg/s), Erlang can be challenging to debug and profile, clustering adds complexity, classic mirrored queues are deprecated (use quorum queues), no native exactly-once delivery.

**Note:** RabbitMQ 4.x (released 2024) introduced native AMQP 1.0 support, Khepri metadata store (replacing Mnesia), and further improvements to quorum queues and streams. The project is actively evolving.

### AWS SQS / SNS / EventBridge / Kinesis

Amazon offers four complementary services, each solving a different problem:

**SQS** — Fully managed queue. Zero ops, virtually unlimited throughput (standard queues), 256KB message limit. Standard queues: at-least-once, best-effort ordering. FIFO queues: exactly-once processing, strict ordering, but limited to 300 msg/s per message group (3,000 with batching). Best for: serverless backends, decoupling microservices on AWS.

**SNS** — Pub/sub topic for fan-out. Pushes to SQS queues, Lambda functions, HTTP endpoints, email, SMS. Often used as SNS (fan-out) -> SQS (queue per consumer) pattern. Up to 12.5M subscriptions per topic.

**Kinesis Data Streams** — Managed event streaming. Shard-based (1MB/s in, 2MB/s out per shard). On-demand mode auto-scales. 24-hour default retention (up to 365 days). Best for: real-time analytics on AWS, Lambda integration, Firehose to S3/Redshift.

**EventBridge** — Serverless event bus. Content-based filtering (match on event fields, not just topics). Native integration with 90+ AWS services and SaaS partners (Shopify, Datadog, Auth0). Schema registry built in. Best for: event-driven architectures with complex routing rules, cross-account event sharing.

### Google Cloud Pub/Sub

Fully managed, serverless messaging with global reach. Auto-scales without shard/partition management.

**Strengths:** True serverless (no capacity planning), global message routing, per-message acknowledgment with dead-letter topics, exactly-once delivery within Google Cloud, seek-to-timestamp for replay, schema enforcement via Schema Registry.

**Weaknesses:** No ordering guarantee by default (ordering keys opt-in, limited to 1MB/s per ordering key), higher per-message cost than self-managed Kafka at high volume, vendor lock-in, 7-31 day retention only.

**Best for:** Google Cloud-native applications, global event distribution, teams that want zero operational overhead.

### NATS / NATS JetStream

Lightweight, high-performance messaging system. Originally pure pub/sub (fire-and-forget). JetStream (added in NATS 2.2) adds persistence, replay, exactly-once, and key-value storage.

**Strengths:** Single static binary (12MB, no JVM), sub-millisecond latency, minimal resource footprint (runs on Raspberry Pi), 200K-400K msg/s with JetStream, built-in WebSocket support, Kubernetes-native (NATS is the default messaging layer for many cloud-native projects), supports queue groups (competing consumers), request-reply, and pub/sub.

**Weaknesses:** Smaller ecosystem than Kafka, less mature stream processing tooling, JetStream is newer and less battle-tested at extreme scale, fewer managed offerings.

**Best for:** Edge computing, IoT, Kubernetes microservices, applications that need low latency and low operational overhead, polyglot environments (clients in 40+ languages).

### Redis Streams

Append-only log data structure built into Redis (since 5.0). Consumer groups, acknowledgments, and persistence (AOF/RDB).

**Strengths:** Sub-millisecond latency (in-memory), zero additional infrastructure if you already use Redis, consumer groups with pending entry list (PEL), XRANGE for replay, simple API (XADD, XREAD, XREADGROUP, XACK), capped streams for bounded memory usage.

**Weaknesses:** Limited durability (Redis persistence is asynchronous by default; data loss possible on crash), single-node throughput ceiling, no built-in partitioning across nodes (Redis Cluster shards by key, not by stream), no ecosystem for connectors or stream processing, retention is memory-bound.

**Best for:** Lightweight event streaming when Redis is already in the stack, real-time features (activity feeds, notifications), use cases where sub-millisecond latency matters more than strong durability.

### BullMQ / Celery / Sidekiq (Application-Level Job Queues)

Not message brokers — these are libraries that use Redis or a database as a backend. They provide higher-level abstractions: job scheduling, retries with backoff, rate limiting, dashboard UIs, cron jobs, job priority, and job dependencies.

**BullMQ** (Node.js/TypeScript + Redis): Successor to Bull. Supports delayed jobs, rate limiting, job dependencies, sandboxed processors. Excellent for Node.js backends.

**Celery** (Python + Redis/RabbitMQ): The standard Python task queue. Supports periodic tasks (Celery Beat), result backends, task chaining, groups, and chords. Mature but complex configuration.

**Sidekiq** (Ruby + Redis): The standard Ruby background job processor. Simple API, web dashboard, Sidekiq Pro/Enterprise for reliability features (unique jobs, batches, rate limiting).

**Best for:** Application-level background jobs where you want a high-level API and don't need cross-service messaging or event streaming.

---

## Decision Tree

```
START: Do you need asynchronous communication between components?
│
├─ NO → Use direct HTTP/gRPC calls. You don't need messaging.
│
└─ YES → Is this within a single application (background jobs)?
    │
    ├─ YES → Is volume < 5,000 jobs/minute?
    │   │
    │   ├─ YES → Use a database-backed job queue
    │   │         (BullMQ, Celery, Sidekiq, Oban, graphile-worker)
    │   │
    │   └─ NO → Do you need complex routing or priority?
    │       │
    │       ├─ YES → Use RabbitMQ or managed SQS
    │       └─ NO → Use Redis-backed job queue (BullMQ, Sidekiq)
    │
    └─ NO → Cross-service communication. Do multiple independent
            consumers need the same events?
        │
        ├─ NO → Each message processed by one consumer only?
        │   │
        │   ├─ YES → Do you need flexible routing, priority, or RPC?
        │   │   │
        │   │   ├─ YES → RabbitMQ (self-managed) or SQS + SNS (AWS)
        │   │   └─ NO → SQS (AWS) or NATS (self-managed, lightweight)
        │   │
        │   └─ (Unclear) → Start with a queue; migrate to stream if
        │                   multi-consumer needs emerge
        │
        └─ YES → Do you need replay, retention, or stream processing?
            │
            ├─ YES → Event streaming platform
            │   │
            │   ├─ AWS-native? → Kinesis Data Streams
            │   ├─ GCP-native? → Google Cloud Pub/Sub
            │   ├─ Want zero JVM ops? → Redpanda or NATS JetStream
            │   └─ Need largest ecosystem? → Apache Kafka (or Confluent Cloud)
            │
            └─ NO → Fan-out with independent queues may suffice
                     (SNS → SQS, RabbitMQ fanout exchange)
```

---

## Implementation Sketch

### Queue Pattern: Background Job with Dead-Letter Handling (RabbitMQ)

```python
# Producer: enqueue a job
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# Declare the work queue with a dead-letter exchange
channel.queue_declare(
    queue='email_jobs',
    durable=True,
    arguments={
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'email_jobs.dead',
        'x-message-ttl': 60000,       # 60s TTL
        'x-max-length': 100000,        # Max queue depth
    }
)

# Publish with persistence
channel.basic_publish(
    exchange='',
    routing_key='email_jobs',
    body=json.dumps({'to': 'user@example.com', 'template': 'welcome'}),
    properties=pika.BasicProperties(
        delivery_mode=2,  # persistent
        content_type='application/json',
    )
)
```

```python
# Consumer: process jobs with manual acknowledgment
def process_email(ch, method, properties, body):
    try:
        job = json.loads(body)
        send_email(job['to'], job['template'])
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except TransientError:
        # Requeue for retry (up to DLQ threshold)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    except PermanentError:
        # Reject without requeue — goes to DLQ
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

channel.basic_qos(prefetch_count=10)  # Don't overwhelm the consumer
channel.basic_consume(queue='email_jobs', on_message_callback=process_email)
channel.start_consuming()
```

### Stream Pattern: Multi-Consumer Event Pipeline (Kafka)

```python
# Producer: publish domain events
from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': 'kafka:9092',
    'acks': 'all',                    # Wait for all ISR replicas
    'enable.idempotence': True,       # Deduplicate retries
    'max.in.flight.requests.per.connection': 5,  # Safe with idempotence
    'compression.type': 'lz4',
})

def publish_order_event(order):
    producer.produce(
        topic='orders',
        key=str(order['customer_id']),    # Partition by customer
        value=json.dumps({
            'event': 'order.placed',
            'order_id': order['id'],
            'items': order['items'],
            'total': order['total'],
            'timestamp': datetime.utcnow().isoformat(),
        }),
        on_delivery=lambda err, msg: log.error(f'Failed: {err}') if err else None,
    )
    producer.flush()  # Ensure delivery (or use poll() in a loop)
```

```python
# Consumer Group A: Fulfillment service
from confluent_kafka import Consumer

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'fulfillment-service',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,        # Manual commit for at-least-once
    'partition.assignment.strategy': 'cooperative-sticky',
})

consumer.subscribe(['orders'])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue
    if msg.error():
        handle_error(msg.error())
        continue

    event = json.loads(msg.value())
    if event['event'] == 'order.placed':
        # Idempotent processing: use order_id as dedup key
        if not already_processed(event['order_id']):
            create_shipment(event)
            mark_processed(event['order_id'])

    consumer.commit(asynchronous=False)  # Commit after processing
```

```python
# Consumer Group B: Analytics pipeline (completely independent)
analytics_consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'analytics-pipeline',   # Different group = independent
    'auto.offset.reset': 'earliest',
})

analytics_consumer.subscribe(['orders'])
# This consumer reads ALL the same messages independently
# It can lag behind or be ahead of the fulfillment consumer
```

### Hybrid Pattern: Kafka Stream to SQS Worker Queue

```python
# Bridge: Kafka consumer that fans out specific events to SQS
import boto3
from confluent_kafka import Consumer

sqs = boto3.client('sqs')
consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'sqs-bridge',
    'enable.auto.commit': False,
})
consumer.subscribe(['orders'])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue

    event = json.loads(msg.value())

    # Route high-value orders to a priority SQS queue for manual review
    if event['event'] == 'order.placed' and event['total'] > 10000:
        sqs.send_message(
            QueueUrl='https://sqs.us-east-1.amazonaws.com/123/high-value-orders',
            MessageBody=json.dumps(event),
            MessageAttributes={
                'OrderId': {'StringValue': event['order_id'], 'DataType': 'String'}
            },
            MessageGroupId=event['customer_id'],  # FIFO queue
            MessageDeduplicationId=event['order_id'],
        )

    consumer.commit(asynchronous=False)
```

---

## Real-World Case Studies

**LinkedIn** — Created Kafka to solve the problem of moving data between systems at scale. As of 2024, LinkedIn processes over 7 trillion messages per day across Kafka clusters, powering activity feeds, metrics, messaging, and the entire data pipeline from operational databases to the data warehouse.

**PayPal** — Processes approximately 1 trillion Kafka messages per day for real-time fraud detection, transaction processing, and risk analysis. The event streaming architecture enables sub-second fraud scoring on every payment transaction globally.

**Walmart** — Uses Kafka for real-time inventory tracking across thousands of stores, dynamic pricing adjustments based on demand signals, and customer behavior analytics. The streaming architecture replaced batch ETL processes that previously ran overnight, enabling real-time supply chain visibility.

**Uber** — Runs one of the largest Kafka deployments in the world, powering real-time trip tracking, surge pricing calculations, driver-rider matching, and the logging infrastructure. Uber contributed the Kafka consumer rebalance improvements that became the cooperative-sticky assignor.

**Netflix** — Uses a combination of Kafka and SQS. Kafka serves as the backbone for real-time event processing (viewing history, recommendations, A/B test events). SQS handles task distribution for encoding pipeline jobs, where each movie/show is encoded into multiple formats by competing worker instances.

**Shopify** — Migrated from RabbitMQ to Kafka for their core event platform when they needed multi-consumer access to the same events. They still use background job queues (Sidekiq) for merchant-facing task processing. This hybrid approach — streams for events, queues for jobs — is a recurring pattern at scale.

---

## Cross-References

- **[Event-Driven Architecture](../patterns/event-driven.md)** — The architectural style that event streams enable; covers choreography vs. orchestration, saga patterns, and event schema evolution
- **[Microservices](../patterns/microservices.md)** — Queues and streams are the communication backbone; covers service decomposition, API gateway patterns, and service mesh
- **[Idempotency and Retry](../integration/idempotency-and-retry.md)** — Essential for at-least-once delivery; covers idempotency keys, retry with exponential backoff, and deduplication strategies
- **[Data Consistency](../data/data-consistency.md)** — Queues and streams introduce eventual consistency; covers saga patterns, outbox pattern, and compensating transactions
