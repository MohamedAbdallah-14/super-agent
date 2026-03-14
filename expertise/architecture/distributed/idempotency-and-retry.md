# Idempotency and Retry — Architecture Expertise Module

> Idempotency ensures that performing an operation multiple times produces the same result as performing it once. Retry logic automatically re-attempts failed operations. Together, they are the foundation of reliability in distributed systems — without idempotency, retries cause duplicate operations; without retries, transient failures become permanent.

> **Category:** Distributed
> **Complexity:** Moderate
> **Applies when:** Any system where operations can fail and be retried — API calls, message processing, payment processing, database operations across network boundaries

---

## What This Is (and What It Isn't)

### Idempotency: f(x) = f(f(x))

The mathematical definition is precise: an operation is idempotent if applying it multiple times yields the same result as applying it once. In distributed systems, the definition broadens slightly: an operation is idempotent if repeating it produces the same **observable side effects** as executing it once. The response body may differ (e.g., returning the already-created resource on a second call), but the system state must not change after the first successful execution.

This is not an abstract concern. In a distributed system, the network sits between every caller and callee. A request can succeed on the server but the response can be lost in transit. The client cannot distinguish "the server never received my request" from "the server processed my request but I never got the response." Without idempotency, the only safe option is to not retry — which means accepting permanent failure from transient network issues.

**Natural idempotency** — some operations are inherently idempotent without any special design. HTTP GET returns the same resource regardless of how many times you call it. HTTP PUT replaces a resource with the provided state — calling it twice with the same body produces the same result. HTTP DELETE removes a resource — calling it on an already-deleted resource is a no-op (or returns 404, which is still idempotent in terms of system state). SQL `UPDATE users SET email = 'x@y.com' WHERE id = 42` is naturally idempotent. `INSERT ... ON CONFLICT DO NOTHING` is naturally idempotent. Setting a value is idempotent; incrementing a value is not.

**Designed idempotency** — most real-world operations are not naturally idempotent. HTTP POST creates a new resource — calling it twice creates two resources. `INSERT INTO orders (...)` creates a duplicate row. `balance = balance - 100` deducts twice. Sending a notification email is not idempotent. Calling an external payment API is not idempotent. These operations require explicit idempotency design: an idempotency key mechanism that allows the server to detect and deduplicate repeated requests.

### Idempotency Keys

The idempotency key pattern, popularized by Stripe and now an industry standard, works as follows:

1. The client generates a unique key for each logical operation (typically a UUID v4 or a deterministic hash of the operation's business parameters).
2. The client sends the key with the request (usually as a header: `Idempotency-Key: <value>`).
3. The server receives the request and checks whether this key has been seen before.
4. If the key is new: process the request, store the key alongside the result, return the response.
5. If the key exists: skip processing, return the stored response from the first execution.
6. If the key exists but with different parameters: reject the request with a 422 error — this prevents accidental misuse where a client reuses a key for a different operation.

The key insight is that idempotency keys shift the deduplication responsibility to the server, which is the only component with authoritative knowledge of what has already been processed.

### Retry: Not "Just Try Again"

Retry is the automatic re-attempt of a failed operation. But naive retry — immediately repeating a failed call — is one of the most dangerous patterns in distributed systems. Retry requires careful design across multiple dimensions:

- **Which failures are retryable?** A 500 Internal Server Error is retryable. A 400 Bad Request is not — sending the same malformed request again will produce the same error. A 429 Too Many Requests is retryable, but only after respecting the `Retry-After` header. A network timeout is retryable. A connection refused might be retryable (the server may be restarting) or not (the server may be permanently down).
- **How many times?** Unbounded retries can run forever, consuming resources and amplifying load on a struggling service. A retry budget of 3–5 attempts is typical.
- **How long to wait between attempts?** Immediate retry floods the server. Fixed-interval retry synchronizes waves of retries from multiple clients. Exponential backoff increases wait times but can still synchronize. Exponential backoff with jitter is the current best practice.
- **What happens when all retries are exhausted?** The operation must fail gracefully — dead letter queues, compensation logic, alerting, or surfacing the failure to the user for manual intervention.

### What This Is Not

**Not a substitute for fixing root causes.** If an API returns errors 50% of the time, adding retries does not solve the problem — it masks it while doubling the load. Retry is for transient failures (network blips, brief overloads, temporary unavailability during deployments), not for systematic failures.

**Not free.** Every retry consumes resources on both client and server. Every idempotency key consumes storage. Every deduplication check adds latency. These costs are justified by the reliability gains, but they are real and must be budgeted.

**Not a replacement for transactions.** Idempotency ensures an operation is not duplicated. It does not ensure that a multi-step operation is atomic. If step 1 succeeds and step 2 fails, idempotency on step 1 prevents it from being duplicated on retry, but it does not roll back step 1. For multi-step atomicity, you need sagas or distributed transactions in addition to idempotency.

---

## When to Use It

### Idempotency: The Universal Requirement

**All external API calls.** Any call that crosses a network boundary can fail ambiguously. The caller may not know whether the server received and processed the request. Without idempotency, retrying risks duplicate processing. This applies to outgoing calls (your service calling Stripe, Twilio, AWS) and incoming calls (clients calling your API).

**Payment processing — the canonical example.** Stripe's idempotency key implementation is the gold standard because the consequences of non-idempotent payments are catastrophic. A customer is charged $500. The response is lost due to a network timeout. The client retries. Without idempotency, the customer is charged $1,000. Stripe solved this by requiring an `Idempotency-Key` header on all POST requests. The same key always returns the same charge result, regardless of how many times it is sent. Stripe stores idempotency keys for 24 hours — long enough to cover any reasonable retry window but short enough to avoid unbounded storage growth. Brandur Leach, then at Stripe, published a detailed design showing how to implement Stripe-like idempotency keys in Postgres using an `idempotency_keys` table with atomic phases tracked within each key's lifecycle.

**Message queue consumers.** Every major message broker (Kafka, RabbitMQ, SQS, Pub/Sub) provides at-least-once delivery — meaning messages can be delivered more than once. Consumer-side idempotency is required to prevent duplicate processing. The message ID or a business-domain deduplication key serves as the idempotency key. Without this, every message redelivery (caused by consumer crashes, network partitions, or broker failovers) produces duplicate side effects.

**Webhook handlers.** Webhook providers (Stripe, GitHub, Twilio, Shopify) explicitly document that webhooks may be delivered multiple times. Your webhook handler must be idempotent. The webhook event ID serves as the natural idempotency key. Store processed event IDs and skip duplicates.

**Database operations across service boundaries.** When Service A calls Service B to create a record, and the response is lost, Service A retrying should not create a duplicate record in Service B. Service B needs an idempotency mechanism — either a natural unique constraint (email, order reference number) or an explicit idempotency key.

**Scheduled jobs and cron tasks.** A daily billing job that runs at midnight can be accidentally triggered twice (clock skew, overlapping runs, manual trigger during debugging). Each execution must be idempotent — processing only unbilled items, not rebilling already-billed ones.

### Retry: The Resilience Requirement

**Transient network failures.** DNS resolution failures, TCP connection resets, TLS handshake timeouts — these are temporary by nature. A retry after 1–2 seconds almost always succeeds. Not retrying means a single dropped packet causes a permanent failure.

**Service deployments and rolling restarts.** During a rolling deployment, some instances are temporarily unavailable. Requests routed to a terminating instance get connection refused or 503 errors. A retry routed to a healthy instance succeeds immediately. Without retry, every deployment causes visible errors.

**Cloud infrastructure transient errors.** AWS, GCP, and Azure all document transient error rates as expected behavior. AWS SDK retry behavior defaults to 3 retries with exponential backoff for this reason. The AWS Builders' Library explicitly states: "We use timeouts and retries to make the inevitable failures invisible to customers."

**Rate limiting responses.** A 429 response with a `Retry-After` header is an explicit invitation to retry. Respecting the header and retrying after the specified delay is the correct behavior — not retrying means accepting failure when the server has told you exactly when to try again.

---

## When NOT to Use It

This section is equally important. Idempotency and retry, applied incorrectly, cause some of the most devastating production incidents in distributed systems.

### Retries Without Idempotency: The Double-Charge Problem

The single most dangerous mistake is adding retry logic to a non-idempotent operation. Consider a payment API that is not idempotent:

1. Client sends `POST /charge` with `amount: $100`.
2. Server processes the charge successfully. Customer is billed $100.
3. Response is lost (network timeout).
4. Client retries `POST /charge` with `amount: $100`.
5. Server processes the charge again. Customer is billed another $100.

The customer has been charged $200 for a $100 purchase. This is not a hypothetical scenario — it is one of the most common bugs in payment systems. The same pattern applies to any side-effecting operation: sending duplicate emails, creating duplicate orders, posting duplicate messages, triggering duplicate shipments.

**Rule: Never add retry logic to an operation unless that operation is idempotent.** If you cannot make the operation idempotent, do not retry it — fail loudly and handle the failure through compensation or manual intervention.

### Retry Storms: Retries That Kill Services

A retry storm occurs when multiple clients simultaneously retry requests against a service that is already struggling, amplifying the load and turning a partial failure into a complete outage. This is one of the most common causes of cascading failures in microservices architectures.

**The Yandex Go Incident.** A new release of the order service introduced widespread errors. CPU usage across many services reached 100%. The release was rolled back within 10 minutes, but the system remained down for an entire hour. Why? Every upstream service was retrying failed requests. The order service recovered, but immediately received a flood of retried requests from every client that had accumulated retries during the 10-minute outage. Each retry wave triggered more failures, which triggered more retries. The system only stabilized after manually disabling retries across all upstream services.

**The AWS/ECS Cascading Retry Incident.** A single frustrated user tapped "Try Again" four times in quick succession on a mobile app. The load balancer was configured to retry all 503 responses five times. Each user tap generated one request, the load balancer retried each five times, resulting in 5 user requests multiplied by 6 total attempts each, equaling 30 backend requests — from a single user. Multiply this by thousands of users experiencing the same error, and the backend was overwhelmed by retry traffic that dwarfed the original load.

**The Agoda Production Incident.** Agoda implemented a 5% retry budget at the service level. During a production incident, they discovered that heavy endpoints were consuming up to 35% of the retry budget, starving lightweight health-check and metadata endpoints of their retry capacity. The uniform budget did not account for the uneven distribution of retry costs across endpoints.

### Exponential Backoff Without Jitter: Synchronized Retry Waves

Exponential backoff alone is insufficient. If 1,000 clients all fail at the same moment and all use exponential backoff with the same base and multiplier, they all retry at exactly the same times: 1 second, 2 seconds, 4 seconds, 8 seconds. The retries are spaced further apart but remain perfectly synchronized, creating periodic spikes that can overwhelm the recovering service.

AWS documented this problem extensively in their Architecture Blog. The solution is jitter — adding randomness to the backoff interval to desynchronize retries across clients.

### Retrying Non-Transient Errors

Retrying a 400 Bad Request, a 401 Unauthorized, a 403 Forbidden, or a 404 Not Found is pointless — the same request will produce the same error every time. Retrying these errors wastes resources and delays the actual error handling. Only retry errors that indicate transient conditions: 429 (Too Many Requests), 500 (Internal Server Error), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout), and network-level errors (connection refused, timeout, DNS failure).

### Idempotency Key Collisions and Misuse

If idempotency keys are generated with insufficient entropy (e.g., short random strings, timestamp-based), different operations can receive the same key. The server treats the second operation as a retry of the first and returns the first operation's result — silently dropping the second operation. Similarly, if a client reuses the same idempotency key for genuinely different operations (sending the same key with different parameters), the server must reject the request rather than silently returning the wrong cached result.

### Unbounded Retry Without Circuit Breaking

Retrying indefinitely against a down service keeps connections open, consumes thread pools, and can cause the caller to fail under resource exhaustion. Retries must have a maximum attempt count, and ideally integrate with a circuit breaker that stops retries entirely when the failure rate exceeds a threshold.

---

## How It Works

### Idempotency Key Lifecycle

The lifecycle of an idempotency key follows a clear state machine:

```
Client generates key (UUID v4 or deterministic hash)
        │
        ▼
┌─────────────────┐
│ Server receives  │
│ request + key    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Key exists in    │─Yes─▶│ Parameters match │─Yes─▶ Return stored response
│ idempotency      │     │ original?        │
│ store?           │     └────────┬────────┘
└────────┬────────┘              │No
         │No                     ▼
         ▼               Return 422 Conflict
┌─────────────────┐
│ Store key with   │
│ status: STARTED  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process request  │
└────────┬────────┘
         │
    ┌────┴────┐
    │Success  │Failure
    ▼         ▼
Store result  Store error (if permanent)
+ COMPLETED   or delete key (if transient)
    │         │
    ▼         ▼
Return        Return error
response      (client may retry)
```

**Critical design decision: what to store on failure.** If the server stores the error response alongside the idempotency key, subsequent retries will return the cached error without re-attempting the operation. This is correct for permanent errors (validation failures, business rule violations) but catastrophic for transient errors (database timeouts, downstream service unavailability). For transient errors, the idempotency key should be deleted or marked as retryable, allowing the client's next attempt to actually re-execute the operation.

### Idempotency Store Design

The idempotency store is a lookup table mapping keys to results. It can be implemented as:

**Database table (most common for critical operations):**

```sql
CREATE TABLE idempotency_keys (
    key          VARCHAR(255) PRIMARY KEY,
    request_path VARCHAR(500)  NOT NULL,
    request_hash VARCHAR(64)   NOT NULL,  -- SHA-256 of request body
    status       VARCHAR(20)   NOT NULL,  -- STARTED, COMPLETED, FAILED
    response_code INTEGER,
    response_body JSONB,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    locked_at    TIMESTAMP,               -- for concurrent request protection
    locked_by    VARCHAR(255)             -- process/instance ID
);

CREATE INDEX idx_idempotency_keys_created ON idempotency_keys (created_at);
-- For cleanup: DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours';
```

**Redis/cache (for high-throughput, lower-criticality operations):**

```
SET idempotency:{key} {serialized_response} EX 86400  -- 24h TTL
```

Redis provides automatic expiration (no cleanup job needed) and faster lookups, but lacks transactional guarantees with the main database. For payment processing, a database-backed store within the same transaction as the business operation is strongly preferred.

### Deduplication Window

Idempotency keys cannot be stored forever. The deduplication window defines how long keys are retained:

- **Stripe:** 24 hours. Long enough for any reasonable retry sequence (including overnight retries after a failure during business hours), short enough to avoid unbounded storage growth.
- **Payment systems:** 24–72 hours is typical. Some regulatory environments require longer windows.
- **Message queues:** Typically 5–15 minutes. Message redelivery happens quickly; if a consumer hasn't processed a message within 15 minutes, something is fundamentally wrong.
- **Webhook handlers:** 7–30 days. Webhook providers may retry failed deliveries over days.

After the deduplication window expires, the key is pruned and the same key can be used again (it will be treated as a new request). This is by design — the window covers the retry period, not eternity.

### Retry Strategies

**Immediate retry (almost never correct):**

```
retry(operation, maxAttempts: 3, delay: 0)
```

Retries instantly. Only appropriate when the failure is known to be resolved immediately (e.g., a lock contention that clears in microseconds). For network failures, immediate retry floods the server.

**Fixed-interval retry (rarely correct):**

```
retry(operation, maxAttempts: 3, delay: 1000ms)
```

Retries at a constant interval. Better than immediate, but all clients that fail at the same time retry at the same time, creating synchronized waves.

**Exponential backoff (good, but incomplete):**

```
delay = baseDelay * 2^attempt
// Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s, Attempt 4: 8s
```

Increasing delays reduce load on the recovering server. But without jitter, synchronized retries still occur.

**Exponential backoff with full jitter (current best practice):**

```
delay = random(0, baseDelay * 2^attempt)
// Attempt 1: random(0, 1s), Attempt 2: random(0, 2s), Attempt 3: random(0, 4s)
```

AWS's analysis shows that full jitter provides the best spread of retries and the lowest total number of calls needed for all clients to eventually succeed. The randomness breaks synchronization, distributing retries evenly over the backoff window. AWS compared three jitter strategies:

- **Full Jitter:** `sleep = random(0, min(cap, base * 2^attempt))` — best overall distribution.
- **Equal Jitter:** `sleep = min(cap, base * 2^attempt) / 2 + random(0, min(cap, base * 2^attempt) / 2)` — guarantees at least half the backoff delay, less spread.
- **Decorrelated Jitter:** `sleep = min(cap, random(base, previousSleep * 3))` — each retry's delay depends on the previous one, not the attempt number.

**Decorrelated jitter (AWS alternative):** `sleep = min(cap, random(base, previousSleep * 3))` — each retry's delay depends on the previous one, exploring a wider range of delays when the server needs more recovery time.

### Retry Budgets

Instead of (or in addition to) per-request retry limits, a retry budget limits the total percentage of requests that can be retries across an entire service. Google's SRE practices recommend a retry budget of 10%: if a service is making 1,000 requests per second, at most 100 of those can be retries. This prevents retry amplification at the system level.

```
totalRequests = firstAttempts + retries
retryRatio = retries / totalRequests
if retryRatio > 0.10:
    stop retrying, fail fast
```

Agoda's production experience revealed that uniform retry budgets are insufficient — they discovered that heavy endpoints consumed disproportionate retry budget, starving lightweight endpoints. The solution was per-endpoint or weighted retry budgets.

### Circuit Breaker Integration

Retry and circuit breaking are complementary, not competing, patterns:

1. **Closed state (normal):** Requests pass through. Failures are retried with backoff.
2. **Open state (circuit broken):** The failure rate has exceeded the threshold. All requests fail immediately without being sent — no retries, no network calls. This stops retry storms from overwhelming the downstream service.
3. **Half-open state (probing):** After a timeout, a single request is allowed through. If it succeeds, the circuit closes. If it fails, the circuit re-opens.

The circuit breaker wraps the retry logic. When the circuit is open, retries are not attempted. When the circuit is closed or half-open, retries proceed with backoff and jitter.

### Dead Letter Queues

When all retry attempts are exhausted and the operation has permanently failed, the request must go somewhere for investigation and potential manual processing. A dead letter queue (DLQ) captures these failed operations with full context: the original request, the idempotency key, the error history, and timestamps.

```
Request → Retry 1 (fail) → Retry 2 (fail) → Retry 3 (fail) → Dead Letter Queue
                                                                      │
                                                              Alert operations team
                                                              Manual investigation
                                                              Reprocessing when ready
```

### At-Least-Once + Idempotency = Effectively-Once

True exactly-once processing is theoretically impossible in distributed systems (proven by the Two Generals Problem and FLP impossibility result). The practical approximation used across the industry is:

1. **At-least-once delivery:** The message/request will be delivered one or more times. Guaranteed by retry logic.
2. **Idempotent processing:** Processing the same message/request multiple times produces the same result as processing it once. Guaranteed by idempotency keys or natural idempotency.
3. **The combination:** Every operation is attempted until it succeeds (at-least-once), and duplicate attempts are harmless (idempotent). The observable result is "effectively exactly-once."

Apache Kafka's exactly-once semantics (EOS) implement this pattern: idempotent producers (each message has a producer ID and sequence number; the broker deduplicates), transactions (multiple messages are committed atomically), and transactional consumers (consumer offsets are committed in the same transaction as the produced messages). Extending this guarantee to external systems requires the Outbox Pattern or the Listen-to-Yourself Pattern where side effects are driven by consuming your own events rather than inline execution.

---

## Trade-Offs Matrix

| Dimension | Without Idempotency + Retry | With Idempotency + Retry | Notes |
|---|---|---|---|
| **Duplicate operations** | Retries cause duplicates (double charges, double sends) | Retries are safe; duplicates are detected and deduplicated | The fundamental reason idempotency exists |
| **Transient failure handling** | Single failure = permanent failure; user sees errors | Transient failures are invisible to users | AWS Builders' Library design goal |
| **Storage overhead** | None | Idempotency store requires space (keys + responses) | Stripe: 24h retention; typical: a few GB for millions of keys |
| **Latency overhead** | None | Each request incurs a lookup against the idempotency store | Database: 1–5ms; Redis: <1ms; amortized across requests |
| **Implementation complexity** | Simple (fire and forget) | Moderate (key generation, store, cleanup, concurrent access) | Most complexity is in the idempotency store and edge cases |
| **Server load under failure** | Normal (no retries) or catastrophic (naive retries) | Controlled (backoff + jitter + budget + circuit breaker) | Requires all four mechanisms working together |
| **Observability** | Hard to distinguish new requests from retries | Idempotency keys enable tracking retry rates and patterns | Valuable operational signal: rising retry rates indicate problems |
| **Client complexity** | Client must handle failures manually | Client retry logic is standardized and often SDK-provided | AWS SDK, gRPC, Axios interceptors all support configurable retry |
| **Data consistency** | Risk of inconsistent state from partial retries | Consistent state; operations are atomic + deduplicated | Especially critical for financial and inventory operations |
| **Recovery from outages** | Manual reconciliation to find and fix duplicates | Automatic recovery; retries succeed when service recovers | Reduces MTTR (Mean Time To Recovery) significantly |
| **Cost** | No infrastructure cost | Idempotency store infra + compute for dedup checks | Negligible relative to the cost of duplicate operations or data loss |

---

## Evolution Path

### Stage 1: Naive (No Retry, No Idempotency)

The starting state of most systems. Every operation is fire-and-forget. If it fails, the user sees an error. If the response is lost, the client has no way to know whether the operation succeeded. This works for read-only operations and internal tools where occasional failures are acceptable.

**Symptoms that you've outgrown this:** Users report seeing errors for operations that actually succeeded. Duplicate records appear in the database. Payment disputes arise from double charges. Operations teams spend hours reconciling data after outages.

### Stage 2: Client-Side Retry (Dangerous Without Idempotency)

The team adds retry logic (often an Axios interceptor or an HTTP client middleware) to automatically retry failed requests. This immediately causes duplicate operations because the server is not idempotent. The team then adds ad-hoc deduplication — unique database constraints, "check before write" patterns, or manual reconciliation.

**Symptoms:** Duplicate records with slightly different timestamps. IntegrityError exceptions in logs from unique constraint violations. Race conditions where two retries both pass the "check" in "check before write."

### Stage 3: Idempotency Keys on Critical Paths

The team implements idempotency keys on the most critical endpoints — payment processing, order creation, account registration. The idempotency store is a database table. Retry logic uses exponential backoff. This covers the highest-risk operations but leaves gaps in lower-risk paths.

**Symptoms that you've outgrown this:** Idempotency coverage is inconsistent — some endpoints are safe, others are not. Developers forget to add idempotency to new endpoints. No retry budget or circuit breaking exists yet.

### Stage 4: Systematic Idempotency + Retry Infrastructure

Idempotency middleware is applied to all mutating endpoints by default (opt-out, not opt-in). Retry logic includes exponential backoff with jitter, retry budgets, and circuit breaker integration. Dead letter queues capture exhausted retries. Monitoring dashboards track retry rates, idempotency key hit rates, and circuit breaker state.

**This is the target state for most production systems.**

### Stage 5: Platform-Level Guarantees

The infrastructure platform provides idempotency and retry as built-in primitives. Temporal workflows automatically retry activities with configurable policies. Kafka consumers use transactional exactly-once semantics. API gateways enforce idempotency key requirements and handle retry logic at the edge. Individual services no longer implement these patterns — they inherit them from the platform.

**This is where organizations like Stripe, Google, and Amazon operate.**

---

## Failure Modes

### Retry Storms (Cascading Amplification)

**What happens:** A downstream service experiences elevated latency or errors. Every upstream caller retries. Each retry adds load to the already-struggling service. The service degrades further. More retries are triggered. The cycle escalates until the service (and potentially its callers' callers) completely fails.

**Why it happens:** No retry budget (unlimited retries). No circuit breaker (retries continue even when the service is clearly down). No backoff (immediate retries). All clients retry simultaneously (no jitter).

**How to prevent:** Retry budgets (10% max retry traffic). Circuit breakers (stop retrying when failure rate > threshold). Exponential backoff with full jitter. Load shedding on the server side (reject excess requests with 503 + Retry-After). Monitoring and alerting on retry rates.

**Real-world example:** The Yandex Go incident — a 10-minute bad deployment caused a 60-minute outage because retry storms from upstream services kept the recovered service overwhelmed for 50 minutes after the fix was deployed.

### Duplicate Processing Without Idempotency

**What happens:** A message is delivered twice (normal in at-least-once systems). The consumer processes it twice, creating duplicate side effects — duplicate database records, duplicate emails sent, duplicate payments charged.

**Why it happens:** The consumer does not track which messages it has already processed. The operation is not naturally idempotent. No deduplication mechanism exists.

**How to prevent:** Consumer-side dedup table keyed on message ID. Natural idempotency through upserts or unique constraints. Idempotent consumer pattern with explicit processed-message tracking.

### Idempotency Key Collisions

**What happens:** Two different operations receive the same idempotency key. The server treats the second operation as a retry of the first and returns the first operation's response, silently dropping the second operation.

**Why it happens:** Idempotency keys generated with insufficient entropy (short strings, timestamps, sequential IDs). Client-side bugs that reuse keys across different operations.

**How to prevent:** Use UUID v4 (128 bits of entropy, collision probability ~1 in 2^122 even after billions of keys). Validate that the request parameters match the original request when a key collision is detected — if they do not match, return an error rather than the cached response. Stripe explicitly implements this parameter-matching check.

### Stale Idempotency Cache

**What happens:** The idempotency store retains a key beyond the point where the stored response is still valid. The cached response references data that has since changed (prices updated, inventory depleted, user permissions revoked). A retry returns the stale cached response.

**Why it happens:** Deduplication window is too long. The cached response includes data that is inherently time-sensitive.

**How to prevent:** Set deduplication windows appropriate to the operation's time sensitivity. Cache only the operation's result (success/failure + resource ID), not derived data. On cache hit, optionally re-fetch current state for the response body while still skipping the mutating operation.

### Thundering Herd from Synchronized Retries

**What happens:** A server goes down, 10,000 clients fail simultaneously, and all retry at the same exponential backoff intervals. Even with increasing delays, the retries arrive in synchronized waves — a spike at 1 second, a spike at 2 seconds, a spike at 4 seconds — each spike large enough to overwhelm the recovering server.

**Why it happens:** Exponential backoff without jitter. All clients use the same base delay and multiplier. The failure event synchronized all clients to the same retry clock.

**How to prevent:** Full jitter: `delay = random(0, baseDelay * 2^attempt)`. This spreads retries uniformly across the entire backoff window, eliminating spikes. AWS's analysis shows full jitter reduces total completion time by 40% compared to exponential backoff alone because it avoids the retry wave collisions.

### Idempotency Store Failure

**What happens:** The idempotency store itself becomes unavailable (database outage, Redis failure). The server cannot check whether a key has been seen before. Options: reject all requests (safe but causes downtime) or process all requests without deduplication (risks duplicates).

**Why it happens:** The idempotency store is a single point of failure that has not been designed for high availability.

**How to prevent:** Use the same database as the main application data (they fail together and recover together — and the idempotency check can be part of the same transaction). If using Redis, deploy in cluster mode with replicas. Define a fallback policy: most systems choose to process requests without dedup during store outages, accepting the small risk of duplicates in exchange for availability.

---

## Technology Landscape

### Stripe Idempotency (The Industry Standard)

Stripe requires an `Idempotency-Key` header on all POST requests. Keys are stored for 24 hours. Replayed requests return the cached response. Parameter mismatches on key reuse return a 422 error. The implementation is documented in detail by Brandur Leach, who described the Postgres-backed approach: an `idempotency_keys` table with atomic phases, where each key tracks its lifecycle (started → processing → completed/failed) to handle concurrent requests and partial failures correctly. This design has been adopted or adapted by Shopify, Square, PayPal, Adyen, and most modern payment processors.

### AWS SDK Retry Behavior

AWS SDKs implement three retry modes:

- **Legacy mode:** Simple retry with exponential backoff, up to the maximum retry count (default varies by service).
- **Standard mode:** Exponential backoff with jitter, token bucket rate limiting (each retry consumes tokens; when the bucket is empty, retries stop), and automatic classification of retryable vs. non-retryable errors.
- **Adaptive mode (experimental):** Adds client-side rate limiting that dynamically adjusts based on server responses. Throttling responses reduce the retry rate; successful responses increase it.

Default maximum attempts: 3 (including the initial request). Backoff formula: `min(maxBackoff, baseDelay * 2^(attemptNumber - 1))` with jitter. Base delay: typically 100ms for most services.

### Polly (.NET)

Polly provides policy-based resilience for .NET applications. Retry policies support immediate, fixed-interval, and exponential backoff with jitter. Circuit breaker policies integrate with retry policies. Bulkhead policies limit concurrent calls. Policies are composable: a request can pass through a bulkhead → circuit breaker → retry → timeout pipeline.

```csharp
var retryPolicy = Policy
    .Handle<HttpRequestException>()
    .OrResult<HttpResponseMessage>(r => r.StatusCode == HttpStatusCode.ServiceUnavailable)
    .WaitAndRetryAsync(3, attempt =>
        TimeSpan.FromSeconds(Math.Pow(2, attempt))
        + TimeSpan.FromMilliseconds(Random.Shared.Next(0, 1000)));
```

### Resilience4j (Java/Kotlin)

Resilience4j is the successor to Hystrix for JVM-based systems. It provides retry, circuit breaker, bulkhead, rate limiter, and time limiter as composable decorators. Retry supports exponential backoff with configurable jitter. Integrates with Spring Boot via annotations. Publishes metrics to Micrometer for monitoring.

```java
RetryConfig config = RetryConfig.custom()
    .maxAttempts(3)
    .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(
        Duration.ofMillis(500), 2.0, Duration.ofSeconds(30)))
    .retryOnResult(response -> response.getStatus() >= 500)
    .retryExceptions(IOException.class, TimeoutException.class)
    .ignoreExceptions(BusinessException.class)
    .build();
```

### Temporal Built-In Retry

Temporal workflows provide retry as a first-class primitive. Each activity (unit of work) has a configurable retry policy: initial interval, backoff coefficient, maximum interval, maximum attempts, and non-retryable error types. Temporal automatically retries failed activities according to the policy, with the workflow's progress durably persisted. If the worker crashes mid-retry, another worker picks up where it left off. This eliminates the need for application-level retry logic for operations orchestrated through Temporal.

```typescript
const { chargeCustomer } = proxyActivities<Activities>({
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2.0,
    maximumInterval: '30s',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['InvalidCardError', 'InsufficientFundsError'],
  },
  startToCloseTimeout: '60s',
});
```

### Database-Backed Idempotency Stores

For systems that do not use a dedicated idempotency service, the most robust approach is a database table within the same database as the application data. This allows the idempotency check and the business operation to be wrapped in a single database transaction — if the transaction commits, both the business operation and the idempotency record are persisted atomically; if it rolls back, neither is persisted.

```sql
BEGIN;

-- Check idempotency
SELECT status, response_body FROM idempotency_keys
WHERE key = $1 FOR UPDATE;

-- If key exists and status = 'COMPLETED': return stored response, COMMIT
-- If key exists and status = 'STARTED': another request is in-flight, return 409 Conflict
-- If key does not exist:

INSERT INTO idempotency_keys (key, request_hash, status, created_at)
VALUES ($1, $2, 'STARTED', NOW());

-- Execute business logic
INSERT INTO orders (...) VALUES (...);

-- Update idempotency record
UPDATE idempotency_keys
SET status = 'COMPLETED', response_code = 201, response_body = $3
WHERE key = $1;

COMMIT;
```

The `FOR UPDATE` lock prevents race conditions where two concurrent requests with the same idempotency key both pass the existence check and both attempt to process the operation.

---

## Decision Tree

```
Is the operation read-only (GET, query, search)?
├── Yes → Naturally idempotent. Retry freely. No idempotency key needed.
└── No (mutating operation) →
    │
    Is the operation naturally idempotent (PUT with full replacement, DELETE, upsert)?
    ├── Yes → Retry freely. Consider adding idempotency keys for observability.
    └── No (POST, increment, side-effecting) →
        │
        Does the operation cross a network boundary?
        ├── No (local function call) → Retry may help for lock contention.
        │   Idempotency usually unnecessary.
        └── Yes →
            │
            Is the operation critical (payments, orders, account creation)?
            ├── Yes → REQUIRED: Database-backed idempotency store in same
            │   transaction. Exponential backoff + jitter. Circuit breaker.
            │   Dead letter queue. Monitoring.
            └── No (notifications, logging, analytics) →
                │
                Can duplicates be tolerated?
                ├── Yes → Retry with backoff + jitter. Skip idempotency store.
                │   Accept occasional duplicates.
                └── No → Redis-backed idempotency with TTL. Retry with backoff
                    + jitter. Retry budget.
```

```
Choosing a retry strategy:

What kind of failure?
├── 4xx Client Error (400, 401, 403, 404, 422) → DO NOT RETRY. Fix the request.
├── 429 Too Many Requests → Retry AFTER Retry-After header delay.
├── 5xx Server Error (500, 502, 503, 504) → Retry with backoff + jitter.
├── Network error (timeout, connection refused, DNS failure) → Retry with backoff + jitter.
└── Unknown/ambiguous error → Retry cautiously (low attempt count, longer backoff).

How many retries?
├── Critical path (user-facing, payment) → 3-5 attempts, short total timeout.
├── Background job (async processing) → 5-10 attempts, longer total timeout.
└── Webhook delivery (outgoing) → Many attempts over hours/days with increasing delays.

Backoff strategy?
├── Always use exponential backoff with full jitter.
├── Cap the maximum delay (10-60 seconds for synchronous, minutes for async).
└── Add retry budget at the service level (10% max retry traffic).
```

---

## Implementation Sketch

### Idempotency Middleware (Node.js/Express)

```typescript
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

export function idempotencyMiddleware(pool: Pool, headerName = 'Idempotency-Key') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST') return next();

    const idempotencyKey = req.headers[headerName.toLowerCase()] as string;
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'missing_idempotency_key',
        message: `${headerName} header is required for POST requests`,
      });
    }

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT status, request_hash, response_code, response_body
         FROM idempotency_keys WHERE key = $1 FOR UPDATE`,
        [idempotencyKey]
      );

      if (existing.rows.length > 0) {
        const record = existing.rows[0];
        if (record.request_hash !== requestHash) {
          await client.query('ROLLBACK');
          return res.status(422).json({ error: 'idempotency_key_reuse' });
        }
        if (record.status === 'STARTED') {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'request_in_progress' });
        }
        await client.query('COMMIT');
        return res.status(record.response_code).json(record.response_body);
      }

      await client.query(
        `INSERT INTO idempotency_keys (key, request_path, request_hash, status, created_at)
         VALUES ($1, $2, $3, 'STARTED', NOW())`,
        [idempotencyKey, req.path, requestHash]
      );
      await client.query('COMMIT');

      // Intercept response to capture and store the result
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        pool.query(
          `UPDATE idempotency_keys
           SET status = 'COMPLETED', response_code = $2, response_body = $3
           WHERE key = $1`,
          [idempotencyKey, res.statusCode, body]
        ).catch(err => console.error('Idempotency store update failed:', err));
        return originalJson(body);
      };

      next();
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  };
}
```

### Retry with Exponential Backoff + Full Jitter (TypeScript)

```typescript
interface RetryConfig {
  maxAttempts: number;       // Total attempts including the first
  baseDelayMs: number;       // Base delay for backoff calculation
  maxDelayMs: number;        // Cap on the computed delay
  retryableErrors: Set<number>; // HTTP status codes that are retryable
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  retryableErrors: new Set([429, 500, 502, 503, 504]),
};

class RetriesExhaustedError extends Error {
  constructor(
    public readonly lastError: Error,
    public readonly attempts: number,
  ) {
    super(`All ${attempts} retry attempts exhausted. Last error: ${lastError.message}`);
    this.name = 'RetriesExhaustedError';
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Do not retry non-retryable errors
      const statusCode = error?.response?.status ?? error?.statusCode;
      if (statusCode && !config.retryableErrors.has(statusCode)) {
        throw error;
      }

      // Do not retry if this was the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff + full jitter
      const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
      const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
      const jitteredDelay = Math.random() * cappedDelay; // Full jitter

      // Respect Retry-After header for 429 responses
      const retryAfter = error?.response?.headers?.['retry-after'];
      const finalDelay = retryAfter
        ? Math.max(jitteredDelay, parseRetryAfter(retryAfter))
        : jitteredDelay;

      config.onRetry?.(attempt, error, finalDelay);

      await sleep(finalDelay);
    }
  }

  throw new RetriesExhaustedError(lastError!, config.maxAttempts);
}

function parseRetryAfter(value: string): number {
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds)) return seconds * 1000;
  // Retry-After can also be an HTTP date
  const date = new Date(value);
  if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Idempotent Message Consumer (Python)

```python
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

class IdempotentConsumer:
    """Wraps a message handler to ensure idempotent processing via dedup table."""

    def __init__(self, db_connection, dedup_window_hours: int = 1):
        self.db = db_connection
        self.dedup_window = timedelta(hours=dedup_window_hours)

    def process(self, message_id: str, body: dict, handler: Callable) -> Optional[Any]:
        cursor = self.db.cursor()
        try:
            self.db.begin()
            cursor.execute(
                "SELECT 1 FROM processed_messages WHERE message_id = %s FOR UPDATE",
                (message_id,),
            )
            if cursor.fetchone():
                logger.info("Skipping duplicate message %s", message_id)
                self.db.rollback()
                return None

            cursor.execute(
                "INSERT INTO processed_messages (message_id, processed_at) VALUES (%s, %s)",
                (message_id, datetime.utcnow()),
            )
            result = handler(body)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            # Clean up dedup record so the message can be retried
            cursor.execute("DELETE FROM processed_messages WHERE message_id = %s", (message_id,))
            self.db.commit()
            raise
```

---

## Cross-References

- **Circuit Breaker and Bulkhead** — Circuit breakers stop retries when a service is down; bulkheads isolate failures. Retry without circuit breaking causes retry storms. See `circuit-breaker-bulkhead`.
- **Distributed Systems Fundamentals** — The CAP theorem, Two Generals Problem, and FLP impossibility result explain why exactly-once delivery is impossible and why at-least-once + idempotency is the practical alternative. See `distributed-systems-fundamentals`.
- **Event-Driven Architecture** — Message brokers provide at-least-once delivery, requiring consumer-side idempotency. The Outbox Pattern and transactional messaging are key integration patterns. See `event-driven`.
- **Saga Pattern** — Long-running transactions across services use compensating actions on failure. Each saga step must be idempotent (both the action and the compensation) to handle retries safely. See `saga-pattern`.
- **API Design (REST)** — HTTP method idempotency semantics (GET, PUT, DELETE are idempotent; POST is not), idempotency key headers, and error response design for retryable vs. non-retryable errors. See `api-design-rest`.

---

## Sources

- [Stripe: Designing Robust and Predictable APIs with Idempotency](https://stripe.com/blog/idempotency)
- [Stripe API Reference: Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
- [Brandur Leach: Implementing Stripe-like Idempotency Keys in Postgres](https://brandur.org/idempotency-keys)
- [AWS Builders' Library: Timeouts, Retries, and Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS Architecture Blog: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [AWS Prescriptive Guidance: Retry with Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)
- [Microsoft Azure: Retry Storm Antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/)
- [Yandex Engineering: Good Retry, Bad Retry — An Incident Story](https://medium.com/yandex/good-retry-bad-retry-an-incident-story-648072d3cee6)
- [Agoda Engineering: How Agoda Solved Retry Storms](https://medium.com/agoda-engineering/how-agoda-solved-retry-storms-to-boost-system-reliability-9bf0d1dfbeee)
- [Temporal: Error Handling in Distributed Systems](https://temporal.io/blog/error-handling-in-distributed-systems)
- [Confluent: Exactly-Once Semantics in Apache Kafka](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)
- [Gunnar Morling: On Idempotency Keys](https://www.morling.dev/blog/on-idempotency-keys/)
- [HTTP Toolkit: Working with the Idempotency Keys RFC](https://httptoolkit.com/blog/idempotency-keys/)
- [InfoQ: Timeouts, Retries and Idempotency in Distributed Systems](https://www.infoq.com/presentations/distributed-systems-resiliency/)
