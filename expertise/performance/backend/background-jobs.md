# Background Jobs: Performance Expertise Module

## Why Background Jobs Matter for API Latency

Every millisecond spent doing work inside an HTTP request-response cycle is a millisecond
the user waits. Background jobs move non-critical work off the request path, turning
synchronous bottlenecks into asynchronous operations that complete independently.

A typical user registration endpoint might do all of this synchronously:

1. Validate input (1-2 ms)
2. Hash password (50-100 ms with bcrypt, 12 rounds)
3. Insert into database (5-20 ms)
4. Send welcome email via SMTP (300-2,000 ms)
5. Resize and upload avatar to S3 (200-1,500 ms)
6. Sync to CRM via third-party API (100-800 ms)

**Total synchronous: 656-4,422 ms.** Only steps 1-3 must complete before responding.
Moving steps 4-6 to background jobs: **response drops to 56-122 ms** (steps 1-3 + ~1 ms
enqueue). That is a 10-35x improvement. Companies that implement background jobs report
up to 40% improvement in application responsiveness (Source:
[Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs)).

### Before/After: Email Sending Off the Request Path

```
BEFORE (synchronous):
  POST /api/checkout
  ├── Validate cart            5 ms
  ├── Process payment         40 ms
  ├── Create order record     10 ms
  ├── Send confirmation email  1,800 ms (SMTP handshake + delivery)
  └── Return response
  TOTAL: ~1,855 ms (p50), ~3,200 ms (p99)

AFTER (background job):
  POST /api/checkout
  ├── Validate cart            5 ms
  ├── Process payment         40 ms
  ├── Create order record     10 ms
  ├── Enqueue email job        1 ms (Redis LPUSH)
  └── Return response
  TOTAL: ~56 ms (p50), ~85 ms (p99)
```

SMTP is chatty: connection latency alone is 40-52 ms, full send cycle averages
300-2,000 ms (Source: [SendGrid](https://docs.sendgrid.com/ui/account-and-settings/troubleshooting-delays-and-latency)).
**Result: API latency drops from ~1,855 ms to ~56 ms -- a 97% reduction.** The email
still arrives within seconds.

---

## Job Queue Systems Comparison

### BullMQ (Node.js / TypeScript)

Redis-backed, Lua scripts for atomic operations. Throughput benchmarks (Source:
[BullMQ Benchmarks](https://bullmq.io/articles/benchmarks/bullmq-elixir-vs-oban/),
[Dragonfly + BullMQ](https://www.dragonflydb.io/blog/running-bullmq-with-dragonfly-part-2-optimization)):

| Scenario | Concurrency | Throughput |
|---|---|---|
| Minimal work (raw overhead) | Single worker | 27,200 jobs/sec |
| 10 ms simulated I/O | 10 | 911 jobs/sec |
| 10 ms simulated I/O | 100 | 8,300 jobs/sec |
| ~1 ms CPU work | 100 | 24,300 jobs/sec |
| With DragonflyDB backend | Multi-queue | 250,000+ jobs/sec |

Features: priority queues, rate limiting, cron scheduling, flow dependencies,
batch processing, built-in metrics.

### Sidekiq (Ruby)

Redis-backed, multi-threaded. Benchmarks (Source:
[Sidekiq Scaling](https://sidekiq.org/wiki/Scaling)):

| Scenario | Configuration | Throughput |
|---|---|---|
| No-op jobs (sidekiqload) | Single process, 25 threads | ~4,500 jobs/sec |
| 5M job drain benchmark | Optimized | ~13,000 ops/sec |
| Enterprise Swarm | Multi-process containers | Billions/day |

Using Sidekiq natively is at least **2x faster** than wrapping in ActiveJob due to
serialization and callback overhead (Source:
[benchmark-sidekiq-and-activejob](https://github.com/chrismaximin/benchmark-sidekiq-and-activejob)).

### Celery (Python)

Supports Redis and RabbitMQ brokers. Benchmarks (Source:
[Judoscale](https://judoscale.com/blog/choose-python-task-queue),
[UnfoldAI](https://unfoldai.com/redis-vs-rabbitmq-for-message-broker/)):

| Scenario | Broker | Throughput |
|---|---|---|
| Synchronous baseline | None | 200 tasks/sec |
| Celery + RabbitMQ | RabbitMQ | 1,200 tasks/sec (6x speedup) |
| 100K tasks, 400 workers | Redis | 1,370 tasks/sec (73 sec total) |
| 100K tasks, 400 workers | RabbitMQ | 1,075 tasks/sec (93 sec total) |

Redis is ~21% faster than RabbitMQ in write-heavy scenarios. For >10,000 msgs/min, Redis
delivers up to 15% reduced latency. RabbitMQ offers stronger durability guarantees.

### AWS SQS (Managed Service)

Fully managed, no broker to operate. Benchmarks (Source:
[AWS Docs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-throughput-horizontal-scaling-and-batching.html),
[SoftwareMill](https://softwaremill.com/amazon-sqs-performance-latency/)):

| Queue Type | Configuration | Throughput |
|---|---|---|
| Standard | Single thread, 20 ms latency | ~50 TPS |
| Standard | Multi-thread/client | Near-unlimited TPS |
| FIFO | Without batching | 300 msgs/sec |
| FIFO | With batching | 3,000 msgs/sec |
| FIFO High Throughput | Without batching | 70,000 msgs/sec |

Latency: 20-200 ms for API operations. Scaling is linear with client count.

### Comparison Summary

| Feature | BullMQ | Sidekiq | Celery | AWS SQS |
|---|---|---|---|---|
| Language | Node.js/TS | Ruby | Python | Any (SDK) |
| Peak throughput | 27K/sec* | 13K/sec | 1.2K/sec** | Near-unlimited*** |
| Priority queues | Built-in | Weighted | Via routing | Multiple queues |
| Rate limiting | Built-in | Enterprise | Token bucket | Build yourself |
| DLQ support | Manual | Manual | Manual | Native |
| Ops burden | Manage Redis | Manage Redis | Manage broker | Zero |

\* Minimal work. \*\* Default; optimized reaches 10K+. \*\*\* Standard queues.

---

## Job Processing Patterns

### 1. Fire-and-Forget

Enqueue and do not wait for the result. Highest throughput (<1 ms enqueue via Redis
LPUSH). Use for: email, analytics, audit logging, cache warming. Always pair with
DLQ monitoring to catch silent failures.

### 2. Request-Reply (RPC over Queue)

Producer enqueues and waits for completion (polling or callback). Adds 50-200 ms
overhead vs. direct call. Use for: image processing where caller needs the URL,
PDF generation, synchronous-feeling workflows that benefit from worker isolation.

### 3. Fan-Out (Scatter-Gather)

One event triggers multiple independent jobs in parallel. With N fan-out targets and
N dedicated worker pools, work completes in the time of the single slowest job.
Use for: order processing (inventory + email + analytics + fulfillment), notification
dispatch (email + SMS + push), ETL pipelines.

### 4. Priority Queues

Jobs assigned priority levels; higher-priority dequeued first (Source:
[DZone](https://dzone.com/articles/modern-queue-patterns-guide)):

| Priority | Examples | Worker Allocation |
|---|---|---|
| P0 Critical | Payment processing, system alerts | 60% |
| P1 High | User-facing operations | 25% |
| P2 Normal | Batch processing, reports | 10% |
| P3 Low | Analytics, cleanup | 5% |

**Starvation risk:** Without safeguards, low-priority jobs never execute. Mitigate with
weighted fair queuing (Asynq uses `critical:6, default:3, low:1` ratios), age-based
promotion, or dedicated worker pools per tier.

### 5. Pipeline (Chained Jobs)

Sequential execution where each job feeds results to the next. BullMQ Flows provide
parent-child dependencies; Celery uses chains and chords. Use for: ETL, multi-step
workflows (upload -> validate -> process -> notify).

---

## Batch Processing Optimization

Processing one-at-a-time incurs per-job overhead. Batching amortizes it. The difference
between naive and optimized batch approaches can be **10-100x** in execution time
(Source: [OneUptime](https://oneuptime.com/blog/post/2026-01-24-batch-processing-optimization/view)).

| Chunk Size | Throughput vs. Baseline | Failure Blast Radius |
|---|---|---|
| 1 (no batching) | 1x | 1 job |
| 100 | 3-5x | 100 jobs |
| 1,000 | 8-15x | 1,000 jobs |
| 10,000 | 10-20x | 10,000 jobs |

**Rule of thumb:** Start with chunks of 100-1,000 records.

**Worker sizing:** For CPU-bound work, set workers = CPU cores. For I/O-bound work,
set workers = 2-5x CPU cores (network wait overlaps).

**Checkpointing:** For jobs >5 minutes, save progress every N records to enable
resumable processing. Shopify's `job-iteration` gem makes jobs interruptible and
resumable by design, running in production since 2017 (Source:
[Shopify Engineering](https://shopify.engineering/high-availability-background-jobs)).

---

## Retry Strategies with Exponential Backoff

Fixed-interval retries create thundering herds: 10,000 jobs all retrying at exactly
60 seconds overwhelm a recovering service. Exponential backoff with jitter spreads load.

**Formula:** `delay = min(base_delay * 2^(attempt - 1) + jitter, max_delay)`

Example with base delay 3,000 ms (Source:
[BullMQ Docs](https://docs.bullmq.io/guide/retrying-failing-jobs)):

| Attempt | Delay | Cumulative Wait |
|---|---|---|
| 1 | 3 sec | 3 sec |
| 2 | 6 sec | 9 sec |
| 3 | 12 sec | 21 sec |
| 5 | 48 sec | 1.5 min |
| 7 | 192 sec (3.2 min) | 6.3 min |

**Jitter strategies:** Full jitter (`random(0, base * 2^attempt)`) provides best
spread and is recommended by AWS. Equal jitter guarantees minimum delay. Decorrelated
jitter minimizes correlation between clients.

**Configuration by job type:**

| Job Type | Max Retries | Base Delay | Max Delay |
|---|---|---|---|
| Email sending | 5 | 30 sec | 30 min |
| Payment webhook | 8 | 60 sec | 4 hours |
| API sync | 5 | 10 sec | 10 min |
| Image processing | 3 | 5 sec | 2 min |

---

## Dead Letter Queues and Failure Handling

A DLQ receives messages that could not be processed after exhausting retries. It isolates
problematic messages for inspection without blocking valid message processing (Source:
[Medium - Yapi Kredi Teknoloji](https://medium.com/yapi-kredi-teknoloji/dead-letter-queue-dlq-and-retry-management-in-asynchronous-microservices-054bb318b1bb)).

```
Producer -> Main Queue -> Worker --Success--> Done
                                 --Failure--> Retry (N times)
                                              --Exhausted--> DLQ -> Alert + Manual Review
```

**AWS SQS DLQ config** (Source:
[AWS Docs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)):
maxReceiveCount range 1-1,000, default 10. Recommended: 3-5 for most workloads.
Setting to 1 moves messages on a single transient failure. DLQ retention must exceed
source queue retention.

### Failure Classification

| Failure Type | Example | Retry? | Action |
|---|---|---|---|
| Transient | Network timeout, 503 | Yes | Exponential backoff |
| Rate limit | 429 Too Many Requests | Yes | Backoff + rate awareness |
| Bad input | Invalid email format | No | DLQ immediately |
| Auth failure | Expired API key | No | Alert, DLQ |
| Bug in handler | TypeError, NPE | No | DLQ, fix code, replay |

Always implement DLQ replay: after fixing the root cause, move DLQ messages back to the
main queue for reprocessing.

---

## Job Scheduling and Rate Limiting

### Scheduled Jobs

Use cron-style scheduling for recurring work. In multi-worker deployments, ensure only
one instance creates the schedule (BullMQ uses Redis locks, Sidekiq Enterprise uses
`unique_for`, Celery uses single `celery-beat` process).

### Rate Limiting

Control processing speed to protect downstream services:

| Strategy | Description | Use Case |
|---|---|---|
| Fixed window | N jobs per time window | API rate limits |
| Sliding window | N jobs in rolling window | Traffic shaping |
| Token bucket | Tokens replenish at fixed rate | Variable workloads |
| Concurrency limit | Max N simultaneous jobs | Resource protection |

**Practical rate limits** (set to 70-80% of downstream service limit):

| Service | API Limit | Recommended Job Rate |
|---|---|---|
| SendGrid | 600/sec | 500 jobs/sec |
| Stripe | 100 reads/sec | 80 jobs/sec |
| Twilio | 100 msgs/sec | 80 jobs/sec |
| GitHub API | 5,000/hour | 1 job/sec |

---

## Common Bottlenecks

### 1. Queue Backup (Growing Depth)

Queue depth grows continuously; consumers cannot keep up. Causes: producer rate exceeds
consumer rate, traffic spikes, slow downstream dependencies. Redis stores all pending
jobs in memory -- unbounded growth leads to OOM.

**Fixes:** Add workers (linear throughput scaling), increase concurrency, enable batching,
implement backpressure. **Alert:** Queue depth >2x steady state for >5 minutes.

### 2. Slow Consumers

Jobs take 10-100x longer than expected. Causes: downstream API degradation, N+1 queries
in job handler, unbounded data processing (1M records in one job).

**Fixes:** Per-job timeouts (30s for email, 5min for reports), profile handlers, circuit
breakers for external deps, chunk large datasets (1,000 per job, not 1,000,000).

### 3. No Backpressure

Producers enqueue faster than consumers process with no mechanism to slow down. Result:
unbounded queue growth, Redis OOM, total system failure (Source:
[AWS Builders Library](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/)).

**Fixes:** Queue depth limits (reject when >N items), dynamic rate limiting based on
consumer lag, spillover queues (Amazon's pattern), circuit breaker on enqueue (return
HTTP 503).

### 4. Job Starvation

Low-priority jobs never execute because high-priority jobs consume all workers.

**Fixes:** Weighted fair queuing (`critical:6, default:3, low:1`), dedicated worker pools
per priority, age-based promotion (auto-promote after 30min wait).

### 5. Redis Memory Exhaustion

Causes: completed jobs not cleaned up, large payloads (>10 KB/job), millions of pending
jobs. 10,000 jobs at 50 MB each = 500 GB Redis memory.

**Fixes:** Configure `removeOnComplete` with TTLs, store large data in S3/DB and pass
references only (<1 KB payloads), set `maxmemory-policy` to `noeviction`, monitor usage.

---

## Anti-Patterns

### 1. Processing in the Request Path

Synchronously sending email, notifying warehouses, syncing analytics in an HTTP handler.
User waits 1.3-2.8 seconds instead of <100 ms. **Fix:** Enqueue as background jobs.

### 2. No Retry Limits

`max_retries=None` means a permanently invalid record retries forever. At 1 retry/min,
that is 1,440 wasted executions/day. **Fix:** Always set max_retries (3-8).

### 3. No Monitoring

Silent queue failures are invisible until user-facing impact (Source:
[Last9](https://last9.io/blog/background-job-observability/)). A DLQ growing at
100 jobs/hour goes unnoticed for 3 days = 7,200 lost jobs. **Fix:** Alert on queue
depth, failure rate, DLQ growth.

### 4. Huge Job Payloads

Embedding 50 MB CSV data in job payload. 10K such jobs = 500 GB Redis memory.
**Fix:** Store externally, pass references: `{ fileKey: 's3://bucket/file.csv' }`.

### 5. Mixing Job Types in One Queue

A bulk export creating 10K tasks blocks password reset emails in a FIFO queue (Source:
[ShermanOnSoftware](https://shermanonsoftware.com/2024/07/10/multiple-queues-vs-prioritized-queues-for-saas-background-workers/)).
**Fix:** Separate queues by category (emails-critical, emails-marketing, reports).

### 6. Non-Idempotent Jobs

Retrying a payment job without idempotency keys charges the customer twice.
**Fix:** Use idempotency keys (`idempotency_key: charge-${orderId}`).

---

## Monitoring and Observability

### Key Metrics

| Metric | Alert Threshold | Why It Matters |
|---|---|---|
| Queue depth | >2x steady state for 5 min | Backlog growing |
| Processing time (p50/p95/p99) | p99 > 3x p50 | Performance degradation |
| Failure rate | >5% over 15 min | Systemic issue |
| Throughput (jobs/sec) | <50% expected | Worker failures |
| DLQ depth growth | >0 sustained | Unrecoverable failures |
| Job age (time in queue) | p95 > 60 sec | Capacity issues |
| Worker utilization | >90% sustained | Need more workers |
| Avg retry count | >1.5 per job | Flaky dependency |

(Source: [Last9](https://last9.io/blog/background-job-observability/),
[BullMQ Metrics](https://docs.bullmq.io/guide/metrics))

### Rate-of-Change Analysis

Raw queue depth is misleading. Depth of 5,000 is fine if draining at 1,000/sec (5s to
clear) but critical if growing at 100/sec (Source:
[OneUptime](https://oneuptime.com/blog/post/2026-01-27-sqs-queue-depth-monitoring/view)):

```
drain_rate = (depth_t0 - depth_t1) / interval
time_to_drain = current_depth / drain_rate  (if draining)
time_to_oom = available_memory / (growth_rate * avg_job_size)  (if growing)
```

### Dashboard Essentials

1. **Real-time:** Queue depth per queue, active workers, jobs/sec
2. **Trends:** Processing time percentiles over 24h
3. **Failures:** Failure rate, DLQ depth, top error messages
4. **Capacity:** Worker utilization, estimated drain time

---

## Decision Tree: Should This Be a Background Job?

```
Does the user need the result before you can respond?
|
+-- YES: Can it complete in <200 ms?
|   +-- YES -> Keep in request path (DB reads, auth, validation)
|   +-- NO  -> Request-reply pattern. Return 202 + polling if >5s.
|
+-- NO: Is the work idempotent (or can you make it so)?
    +-- NO  -> Refactor for idempotency first, then background it.
    +-- YES: How critical is delivery?
        +-- MUST deliver (payments, compliance)
        |   -> Transactional outbox + background job. DLQ + alerts. Max retries 8-10.
        +-- SHOULD deliver (emails, notifications)
        |   -> Standard background job + retry + DLQ. Max retries 3-5.
        +-- NICE to deliver (analytics, cache)
            -> Fire-and-forget. Max retries 1-2. Accept some loss.
```

### Quick Reference

| Operation | Background? | Pattern | Rationale |
|---|---|---|---|
| Password hashing | No | Request path | User needs auth result now |
| Welcome email | Yes | Fire-and-forget | User proceeds without seeing it |
| PDF invoice | Yes | Request-reply | Takes 2-30 seconds |
| Image thumbnails | Yes | Fire-and-forget | Show placeholder until ready |
| Search index update | Yes | Fire-and-forget | Eventual consistency OK |
| Data export (CSV) | Yes | Async + 202 | Can take minutes |
| Webhook delivery | Yes | Fire-and-forget + retry | External endpoint, needs backoff |
| Report aggregation | Yes | Scheduled (cron) | Runs on fixed schedule |

---

## Production Checklist

- [ ] Idempotency: every handler safe to retry without side effects
- [ ] Retry policy: max_retries 3-8, exponential backoff configured
- [ ] Dead letter queue: configured, monitored, alerting on growth
- [ ] Timeouts: per-job timeout set (prevent zombie jobs)
- [ ] Payload size: <10 KB; large data stored externally with references
- [ ] Monitoring: queue depth, failure rate, processing time, DLQ dashboards
- [ ] Alerting: queue backup, high failure rate, DLQ growth
- [ ] Graceful shutdown: workers finish in-flight jobs on SIGTERM
- [ ] Connection pooling: DB/Redis connections pooled, not per-job
- [ ] Separate queues: different job types by priority/SLA
- [ ] Cleanup: completed/failed jobs auto-removed after TTL (24-72h)
- [ ] Backpressure: queue depth limits or producer throttling
- [ ] Health checks: worker liveness probes (K8s, ECS)

---

## Sources

- [BullMQ Official Site & Benchmarks](https://bullmq.io/)
- [BullMQ Elixir vs Oban Benchmark](https://bullmq.io/articles/benchmarks/bullmq-elixir-vs-oban/)
- [BullMQ Metrics Docs](https://docs.bullmq.io/guide/metrics)
- [BullMQ Retry Docs](https://docs.bullmq.io/guide/retrying-failing-jobs)
- [Dragonfly + BullMQ Optimization](https://www.dragonflydb.io/blog/running-bullmq-with-dragonfly-part-2-optimization)
- [Sidekiq Official](https://sidekiq.org/) | [Scaling Wiki](https://sidekiq.org/wiki/Scaling)
- [Sidekiq 7.0 Metrics](https://www.mikeperham.com/2022/10/27/sidekiq-7.0-metrics/)
- [Benchmark Sidekiq vs ActiveJob](https://github.com/chrismaximin/benchmark-sidekiq-and-activejob)
- [Sensor Tower: Scaling Sidekiq Workers](https://sensortower.com/blog/how-we-scaled-to-thousands-of-sidekiq-workers)
- [Celery Best Practices](https://moldstud.com/articles/p-celery-configuration-best-practices-enhance-your-task-queue-efficiency)
- [Redis vs RabbitMQ for Celery](https://unfoldai.com/redis-vs-rabbitmq-for-message-broker/)
- [Judoscale: Python Task Queues](https://judoscale.com/blog/choose-python-task-queue)
- [AWS SQS Performance](https://softwaremill.com/amazon-sqs-performance-latency/)
- [AWS SQS Throughput Scaling](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-throughput-horizontal-scaling-and-batching.html)
- [AWS SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [AWS SQS FIFO High Throughput](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html)
- [AWS Builders Library: Queue Backlogs](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/)
- [SQS Queue Depth Monitoring](https://oneuptime.com/blog/post/2026-01-27-sqs-queue-depth-monitoring/view)
- [Shopify: High Availability Background Jobs](https://shopify.engineering/high-availability-background-jobs)
- [Shopify job-iteration](https://github.com/Shopify/job-iteration)
- [Microsoft Azure: Background Jobs Guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs)
- [DZone: Modern Queue Patterns](https://dzone.com/articles/modern-queue-patterns-guide)
- [Backpressure in Distributed Systems](https://dzone.com/articles/backpressure-in-distributed-systems)
- [DLQ and Retry Management](https://medium.com/yapi-kredi-teknoloji/dead-letter-queue-dlq-and-retry-management-in-asynchronous-microservices-054bb318b1bb)
- [Queue-Based Exponential Backoff](https://dev.to/andreparis/queue-based-exponential-backoff-a-resilient-retry-pattern-for-distributed-systems-37f3)
- [Background Job Observability - Last9](https://last9.io/blog/background-job-observability/)
- [Batch Processing Optimization](https://oneuptime.com/blog/post/2026-01-24-batch-processing-optimization/view)
- [Multiple vs Prioritized Queues](https://shermanonsoftware.com/2024/07/10/multiple-queues-vs-prioritized-queues-for-saas-background-workers/)
- [SendGrid: Delays and Latency](https://docs.sendgrid.com/ui/account-and-settings/troubleshooting-delays-and-latency)
- [Bull vs Celery vs Sidekiq](https://www.index.dev/skill-vs-skill/backend-sidekiq-vs-celery-vs-bull)
