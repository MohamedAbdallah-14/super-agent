# Webhooks and Callbacks — Architecture Expertise Module

> **Purpose:** Reference for AI agents during planning and implementation of webhook-based integrations — both sending and receiving.
> **Last updated:** 2026-03-08
> **Sources:** Stripe/GitHub/Twilio/Shopify webhook docs, webhooks.fyi, Svix, Hookdeck, OWASP, real-world production incidents 2022-2025

---

## 1. What This Is

### 1.1 Core Concept

Webhooks are HTTP callbacks — automated POST requests sent from one system (the **provider**) to another system (the **consumer**) when an event occurs. The consumer registers a URL endpoint in advance, and the provider pushes event data to that URL whenever relevant state changes happen.

The term "webhook" was coined by Jeff Lindsay in 2007. Today, webhooks are the dominant integration pattern for SaaS APIs. Stripe, GitHub, Twilio, Shopify, Slack, PayPal, and virtually every major platform uses webhooks to notify external systems of events.

### 1.2 What Webhooks Are NOT

**Webhooks are not WebSockets.** WebSockets establish a persistent, bidirectional connection between client and server. Webhooks are one-directional, fire-and-forget HTTP requests triggered by events. WebSockets maintain connection state; webhooks are stateless individual requests.

**Webhooks are not message queues.** Message queues (RabbitMQ, SQS, Kafka) provide durable, ordered, exactly-once delivery with backpressure and consumer acknowledgment. Webhooks are simpler but offer weaker delivery guarantees — typically at-least-once with provider-managed retries. You do not control the queue; the provider does.

**Webhooks are not Server-Sent Events (SSE).** SSE maintains a long-lived HTTP connection where the server streams events to the client. Webhooks are discrete HTTP requests to a URL you control. SSE requires the client to maintain a connection; webhooks require the consumer to expose a public endpoint.

### 1.3 Webhook vs Polling vs SSE vs WebSocket

| Dimension | Webhooks | Polling | SSE | WebSocket |
|-----------|----------|---------|-----|-----------|
| **Direction** | Server-to-server push | Client pulls from server | Server pushes to client | Bidirectional |
| **Connection** | No persistent connection | No persistent connection | Long-lived HTTP | Long-lived TCP |
| **Latency** | Near real-time (seconds) | Interval-dependent (minutes) | Real-time (ms) | Real-time (ms) |
| **Efficiency** | High — only fires on events | Low — Zapier reports only 1.5% of polls find updates | High | High |
| **Reliability** | Provider-managed retries | Consumer controls retry | Connection drops lose events | Connection drops lose events |
| **Complexity** | Moderate (endpoint + security) | Low (simple HTTP GET loop) | Low-moderate | High (connection management) |
| **Firewall** | Requires inbound access | Outbound only | Outbound only | Outbound only |
| **Use case** | Service-to-service events | Legacy APIs, no webhook support | Live dashboards, feeds | Chat, gaming, collaboration |

### 1.4 The Fundamental Tradeoff

Polling offers **control and universality** at the cost of freshness and efficiency. Webhooks offer **real-time behavior and efficiency** but introduce reliability concerns and require the receiver to expose a publicly accessible endpoint. In practice, mature systems use webhooks as the primary mechanism with polling as a reconciliation fallback.

---

## 2. When to Use It

### 2.1 Strong Fit

- **External service integration.** Receiving payment confirmations from Stripe, push events from GitHub, SMS delivery receipts from Twilio. These providers already have webhook infrastructure — use it.
- **Payment and billing notifications.** `payment_intent.succeeded`, `invoice.paid`, `subscription.canceled`. Financial events that must trigger downstream actions (fulfill order, update entitlements, send receipt).
- **CI/CD pipeline triggers.** GitHub/GitLab webhooks trigger builds on push, PR creation, tag creation. Jenkins, CircleCI, and ArgoCD all consume repository webhooks.
- **SaaS platform events.** Shopify order created, Slack message posted, Jira issue updated, Zendesk ticket resolved. Any multi-tenant platform where consumers need to react to state changes.
- **User-facing notification triggers.** New comment, review approved, deployment completed — events that should trigger emails, Slack messages, or in-app notifications.
- **Building a developer platform.** If you are building an API that third parties integrate with, offering webhooks is table stakes. Developers expect push-based event notification.

### 2.2 Complementary Pattern: Webhooks + Polling

The most resilient integration pattern combines both:

1. **Webhooks** handle the happy path — instant notification on state change.
2. **Periodic polling** serves as a reconciliation sweep — catches any events missed due to webhook delivery failure, endpoint downtime, or provider outage.
3. **Idempotent processing** on the receiver ensures duplicate events (from both channels) are handled safely.

Stripe explicitly recommends this pattern: "We recommend listening to webhooks for getting updates, along with periodically polling for any missed events."

---

## 3. When NOT to Use It

This section is intentionally long. Webhook misuse causes more production incidents than webhook bugs.

### 3.1 Internal Service Communication

**Use message queues instead.** If both the sender and receiver are services you own and deploy, a message broker (RabbitMQ, SQS, Kafka, NATS) provides stronger guarantees:

- **Durable delivery** — messages persist until acknowledged, surviving consumer restarts.
- **Backpressure** — consumers pull at their own pace; no thundering herd risk.
- **Exactly-once semantics** — achievable with transactional consumers (Kafka exactly-once, SQS FIFO deduplication).
- **Ordering guarantees** — partition-level ordering in Kafka, FIFO queues in SQS.

Webhooks over HTTP between internal services add network overhead, TLS handshake latency, and require you to build retry/DLQ infrastructure that message brokers provide natively.

### 3.2 When Delivery Guarantees Are Critical Without Retry Infrastructure

Webhooks provide **at-least-once** delivery at best — and only if the provider implements retries. If your business logic requires guaranteed delivery and you have no retry infrastructure (no DLQ, no reconciliation polling, no event store), webhooks will lose events. Common causes:

- Receiver returns 200 but crashes before processing
- Receiver is down during all retry attempts (provider gives up after 24-72 hours)
- Network partition between provider and receiver
- Provider has a bug in their retry logic

**Real example:** WooCommerce webhooks fire once and do not retry on failure. If your endpoint is down when an order is placed, you never receive that event. No DLQ, no replay, no reconciliation.

### 3.3 When the Receiver Cannot Handle Burst Traffic

Webhook providers do not respect your capacity. A bulk import on Shopify can trigger thousands of `product/update` webhooks in seconds. A GitHub organization rename can fire webhooks for every repository simultaneously. Stripe processes billions of events monthly — a merchant with high transaction volume can receive thousands of events per minute during peak.

If your receiver is a single-instance application without a queue buffer, webhook storms will overwhelm it — causing timeouts, which trigger retries, which create more load (the retry amplification problem).

### 3.4 Firewall and NAT Traversal

Webhooks require the receiver to expose a publicly accessible HTTP endpoint. This is a non-starter in:

- Corporate networks behind strict firewalls with no inbound rules
- On-premise deployments without public IP addresses
- IoT devices behind NAT without port forwarding
- Development environments (without tools like ngrok or Hookdeck)

In these scenarios, polling or a managed webhook proxy (Hookdeck, Svix) is required.

### 3.5 When Ordering Matters

Webhooks provide **no ordering guarantees**. A `payment_intent.succeeded` event might arrive before `payment_intent.created` due to network timing, provider processing order, or retry scheduling. If your processing logic assumes events arrive in order, webhooks will break it.

Solutions exist (timestamp-based ordering, event sequence numbers) but they add complexity. If strict ordering is a hard requirement, a message queue with partition-level ordering (Kafka) or FIFO semantics (SQS FIFO) is more appropriate.

### 3.6 High-Security Environments

Webhooks require opening inbound HTTP endpoints, which increases attack surface. In environments with strict security postures (PCI DSS scope, HIPAA, FedRAMP), every inbound endpoint must be hardened, monitored, and audited. Some compliance frameworks make this prohibitively expensive. Polling (outbound-only) is simpler to secure.

---

## 4. How It Works

### 4.1 Webhook Registration

The consumer registers a webhook subscription with the provider, specifying:

```
POST /api/webhooks
{
  "url": "https://myapp.com/webhooks/stripe",
  "events": ["payment_intent.succeeded", "invoice.paid"],
  "secret": "whsec_..."   // or provider generates and returns this
}
```

**Registration models vary by provider:**

| Provider | Registration Method | Event Filtering | Secret Management |
|----------|-------------------|-----------------|-------------------|
| Stripe | Dashboard + API | Per-endpoint event filter | Provider generates signing secret |
| GitHub | Repository/Org settings + API | Per-hook event selection | User provides secret |
| Twilio | Per-resource URL configuration | Implicit (resource-level) | Account auth token used for signing |
| Shopify | Partner Dashboard + API | Topic-based subscription | Provider generates HMAC secret |
| Slack | App configuration | Event subscriptions | Signing secret in app credentials |

### 4.2 Event Payload Design

A well-designed webhook payload includes:

```json
{
  "id": "evt_1NqZ5bABCDEF",
  "type": "payment_intent.succeeded",
  "created": 1695312000,
  "api_version": "2023-10-16",
  "data": {
    "object": {
      "id": "pi_3NqZ5bABCDEF",
      "amount": 2000,
      "currency": "usd",
      "status": "succeeded",
      "customer": "cus_ABCDEF"
    },
    "previous_attributes": {
      "status": "processing"
    }
  },
  "livemode": true
}
```

**Key design decisions:**

| Decision | Recommended Approach | Rationale |
|----------|---------------------|-----------|
| **Fat vs thin payload** | Fat (include full object state) | Reduces need for API callbacks; thin payloads force receiver to fetch data, adding latency and coupling |
| **Event ID** | Globally unique, provider-generated | Enables idempotency on receiver side |
| **Timestamp** | Unix epoch (integer) | Unambiguous, timezone-free, enables ordering |
| **API version** | Include in payload | Receiver can handle schema evolution |
| **Previous state** | Include changed attributes | Enables delta processing without storing previous state |

### 4.3 HMAC Signature Verification

HMAC is the dominant webhook authentication method — used by 65% of webhook providers (per webhooks.fyi). The pattern:

**Provider side (sender):**

```python
import hmac
import hashlib
import time

def sign_webhook(payload: bytes, secret: str) -> dict:
    timestamp = str(int(time.time()))
    signed_content = f"{timestamp}.{payload.decode()}"
    signature = hmac.new(
        secret.encode(),
        signed_content.encode(),
        hashlib.sha256
    ).hexdigest()

    return {
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": f"sha256={signature}"
    }
```

**Consumer side (receiver):**

```python
import hmac
import hashlib
import time

TOLERANCE_SECONDS = 300  # 5 minutes

def verify_webhook(payload: bytes, headers: dict, secret: str) -> bool:
    timestamp = headers.get("X-Webhook-Timestamp")
    signature = headers.get("X-Webhook-Signature")

    if not timestamp or not signature:
        return False

    # Reject stale timestamps to prevent replay attacks
    if abs(time.time() - int(timestamp)) > TOLERANCE_SECONDS:
        return False

    # Recompute signature
    signed_content = f"{timestamp}.{payload.decode()}"
    expected = hmac.new(
        secret.encode(),
        signed_content.encode(),
        hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison to prevent timing attacks
    return hmac.compare_digest(f"sha256={expected}", signature)
```

**Critical implementation details:**

1. **Use the raw request body** for signature computation. Do not parse to JSON and re-serialize — re-serialization can change field order, whitespace, or unicode escaping, breaking the signature.
2. **Use timing-safe comparison** (`hmac.compare_digest` in Python, `crypto.timingSafeEqual` in Node.js). Standard string equality (`==`) is vulnerable to timing attacks that can leak the signature character by character.
3. **Include a timestamp** in the signed content and reject old timestamps (typically 5 minutes). This prevents replay attacks where an attacker captures a valid webhook and resends it later.
4. **Store the secret securely** — environment variables or a secrets manager (AWS Secrets Manager, HashiCorp Vault). Never commit secrets to source control.

### 4.4 Retry with Exponential Backoff

When a webhook delivery fails (non-2xx response or timeout), providers retry with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: ~5 seconds
Attempt 3: ~25 seconds
Attempt 4: ~2 minutes
Attempt 5: ~10 minutes
Attempt 6: ~1 hour
Attempt 7: ~6 hours
Attempt 8: ~24 hours (final attempt)
```

**Real-world provider retry policies:**

| Provider | Max Retries | Total Window | Backoff Strategy | Give-Up Behavior |
|----------|-------------|--------------|------------------|------------------|
| Stripe | 3 attempts over 72 hours | 72 hours | Exponential | Disables endpoint after sustained failures |
| GitHub | 1 retry | ~10 seconds | Fixed | Event lost |
| Shopify | 19 retries | 48 hours | Exponential | Webhook removed after 19 consecutive failures |
| Twilio | Configurable | Configurable | Exponential | Depends on configuration |
| Slack | 3 retries | ~1 hour | Exponential + backoff | Disables app event subscription |

**Exponential backoff with jitter (sender implementation):**

```python
import random
import asyncio

async def deliver_with_retry(
    url: str,
    payload: dict,
    max_retries: int = 8,
    base_delay: float = 5.0,
    max_delay: float = 3600.0,  # 1 hour cap
):
    for attempt in range(max_retries):
        try:
            response = await http_post(url, json=payload, timeout=30)
            if 200 <= response.status < 300:
                return True  # Success
            if response.status >= 400 and response.status < 500:
                # Client error — do not retry (except 408, 429)
                if response.status not in (408, 429):
                    await send_to_dlq(url, payload, response)
                    return False
        except (TimeoutError, ConnectionError):
            pass  # Retry on network errors

        # Exponential backoff with full jitter
        delay = min(base_delay * (2 ** attempt), max_delay)
        jitter = random.uniform(0, delay)
        await asyncio.sleep(jitter)

    # All retries exhausted — dead letter queue
    await send_to_dlq(url, payload, last_response)
    return False
```

**Why jitter matters:** Without jitter, if 1,000 webhooks fail simultaneously (common during a consumer outage), all 1,000 retry at exactly the same intervals. When the endpoint recovers, it gets hit with 1,000 simultaneous requests — the **thundering herd problem**. Jitter spreads retries across time windows, preventing synchronized spikes.

### 4.5 Idempotency on the Receiver

Providers deliver at-least-once, meaning your receiver **will** get duplicate events. Every webhook handler must be idempotent.

**Pattern: Event ID deduplication**

```python
async def handle_webhook(request):
    payload = await request.json()
    event_id = payload["id"]

    # Check if already processed (atomic check-and-set)
    if await redis.set(f"webhook:{event_id}", "processing", nx=True, ex=86400):
        try:
            await process_event(payload)
            await redis.set(f"webhook:{event_id}", "done", ex=604800)
        except Exception:
            await redis.delete(f"webhook:{event_id}")
            raise
    else:
        # Already processed or in-progress — acknowledge without reprocessing
        pass

    return Response(status=200)
```

**Pattern: Database-level idempotency with unique constraint**

```sql
CREATE TABLE processed_events (
    event_id    VARCHAR(255) PRIMARY KEY,
    event_type  VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW(),
    payload     JSONB
);

-- In application code: INSERT ... ON CONFLICT DO NOTHING
-- If insert succeeds, process the event. If conflict, skip.
```

**Pattern: Idempotency through business logic**

Some operations are naturally idempotent. `UPDATE orders SET status = 'paid' WHERE id = ?` produces the same result regardless of how many times it runs. Design your state transitions to be idempotent where possible, rather than relying solely on deduplication.

### 4.6 Delivery Guarantees

| Guarantee | Description | Who Provides It |
|-----------|-------------|-----------------|
| **At-most-once** | Event delivered 0 or 1 times. No retries. | GitHub (limited retries), fire-and-forget providers |
| **At-least-once** | Event delivered 1 or more times. Provider retries on failure. | Stripe, Shopify, most mature providers |
| **Exactly-once** | Event delivered exactly 1 time. | Nobody — not achievable over HTTP without receiver-side deduplication |

**At-least-once is the practical standard.** Exactly-once delivery is a theoretical impossibility in distributed systems without both sides participating. The closest approximation: at-least-once delivery from the provider + idempotent processing on the receiver = effectively-once processing.

### 4.7 Ordering Challenges

Webhooks have no inherent ordering. Strategies for handling out-of-order events:

**Strategy 1: Timestamp-based last-write-wins**

```python
async def handle_order_update(event):
    event_time = event["created"]
    order_id = event["data"]["object"]["id"]

    # Only apply if this event is newer than what we have
    result = await db.execute("""
        UPDATE orders
        SET status = $1, updated_at = $2
        WHERE id = $3 AND updated_at < $2
    """, event["data"]["object"]["status"], event_time, order_id)

    # If no rows updated, we already have a newer state — safe to ignore
```

**Strategy 2: Fetch current state from provider API**

When you receive any event for an object, ignore the event payload and fetch the current state from the provider's API. This guarantees you always have the latest state, regardless of event ordering.

**Strategy 3: Event sequence numbers**

Some providers include a sequence number or version. Only apply events with a higher sequence than your current stored version. This is the most robust approach but requires provider support.

### 4.8 Webhook Management UI

If you are building a platform that sends webhooks, provide consumers with:

- **Endpoint management** — CRUD operations for webhook URLs and event subscriptions
- **Event log** — Searchable history of all delivered events with status, response code, latency
- **Manual retry** — Ability to replay failed events individually or in bulk
- **Test/ping** — Send a test event to verify endpoint connectivity
- **Secret rotation** — Rotate signing secrets without downtime (support multiple active secrets during transition)
- **Failure alerts** — Notify consumers when their endpoint is failing consistently

Stripe's webhook dashboard is the gold standard. Study it when designing your own.

---

## 5. Trade-Offs Matrix

| Dimension | Webhooks Win | Webhooks Lose |
|-----------|-------------|---------------|
| **Latency** | Near real-time (seconds vs minutes for polling) | Higher than in-process events or message queues |
| **Efficiency** | Only fires on actual events; no wasted requests | Receiver must maintain an always-on public endpoint |
| **Simplicity** | Simple to consume — just an HTTP endpoint | Complex to operate reliably (retries, idempotency, signature verification, ordering) |
| **Coupling** | Loose temporal coupling (async) | Tight protocol coupling (HTTP, specific payload schema) |
| **Cost** | Eliminates polling infrastructure costs | Requires endpoint hosting, TLS certificates, monitoring |
| **Scalability** | Provider handles fan-out to all consumers | Consumer must handle burst traffic from provider |
| **Debugging** | Event logs provide audit trail | Harder to debug than synchronous API calls |
| **Security** | HMAC signatures provide authenticity verification | Exposes an inbound endpoint — increased attack surface |
| **Reliability** | Provider manages retry infrastructure | Consumer has no control over retry timing or backoff |
| **Ordering** | Events reflect actual occurrence | No delivery ordering guarantees |
| **Universality** | Dominant SaaS integration pattern | Not all providers support webhooks; some fire-and-forget |
| **Development** | Rich ecosystem of tools (ngrok, Svix, Hookdeck) | Local development requires tunneling or proxy tools |

---

## 6. Evolution Path

### 6.1 Maturity Levels

**Level 0: Direct polling**
Cron job polls provider API every N minutes. Simple, reliable, wasteful. Suitable for low-volume integrations where minute-level latency is acceptable.

**Level 1: Basic webhook receiver**
Single HTTP endpoint receives webhooks. No signature verification, no idempotency, no retry handling. Processes events synchronously in the request handler. Breaks under load, loses events on downtime.

**Level 2: Hardened webhook receiver**
Signature verification, idempotent processing with event ID deduplication, quick 200 response before async processing. Handles duplicates safely. Still vulnerable to burst traffic and extended downtime.

**Level 3: Queue-buffered processing**
Webhook endpoint validates signature, persists event to a queue (SQS, Redis, RabbitMQ), and returns 200 immediately. Separate workers process events from the queue at their own pace. Handles bursts, survives worker restarts. This is the recommended production architecture.

```
Provider → [Webhook Endpoint] → [Queue] → [Worker] → [Business Logic]
              validates sig       buffer    processes     idempotent
              returns 200         durable   at own pace   operations
```

**Level 4: Full event infrastructure**
Queue-buffered processing plus: DLQ for failed events, reconciliation polling as fallback, event store for replay, monitoring dashboards, automatic endpoint health checks, webhook management UI. Used by teams processing thousands of webhook events per minute.

**Level 5: Managed webhook infrastructure**
Offload sending/receiving to a dedicated service (Svix for sending, Hookdeck for receiving). Handles retries, DLQ, signature verification, rate limiting, event log, and management UI. You focus on business logic.

### 6.2 Migration Path: Polling to Webhooks

1. Build webhook receiver alongside existing polling infrastructure
2. Run both in parallel — webhooks as primary, polling as reconciliation
3. Extend polling interval (5 min to 30 min to 1 hour) as webhook reliability is confirmed
4. Keep polling as a safety net — never fully remove it for critical integrations

---

## 7. Failure Modes

### 7.1 Receiver Downtime Losing Events

**Scenario:** Your webhook endpoint is down for a deployment, scaling event, or outage. The provider delivers webhooks, gets errors, retries according to their policy, and eventually gives up.

**Impact:** Events permanently lost. For payment webhooks, this means orders fulfilled without payment confirmation, or payments received without order fulfillment.

**Real example:** Shopify removes webhook subscriptions entirely after 19 consecutive failures. If your endpoint was down for 48 hours, you lose the subscription itself — not just individual events.

**Mitigation:**
- Queue-buffered architecture (Level 3+) — even if workers are down, the endpoint stays up
- Reconciliation polling as fallback
- Zero-downtime deployments (blue-green, rolling) for the webhook endpoint
- Health check monitoring with immediate alerting

### 7.2 Replay Attacks

**Scenario:** Attacker intercepts a legitimate webhook request (including valid signature) and resends it later to trigger duplicate processing — double-charging a customer, double-crediting an account.

**Mitigation:**
- Include a timestamp in the signed content
- Reject webhooks with timestamps older than 5 minutes (`TOLERANCE_SECONDS = 300`)
- Idempotent processing with event ID deduplication (defense in depth)

### 7.3 Signature Verification Skipped

**Scenario:** Developer skips signature verification during development ("I'll add it later") and the code ships to production. Attacker discovers the endpoint URL and sends forged webhook payloads.

**Impact:** Arbitrary event injection. Attacker can forge `payment_intent.succeeded` events to get products without paying, or `customer.deleted` events to disrupt service.

**Real-world frequency:** Alarmingly common. A 2023 survey by Hookdeck found that a significant percentage of webhook consumers do not verify signatures in production.

**Mitigation:**
- Signature verification in middleware/decorator — applied to all webhook routes by default
- CI/CD tests that verify webhook handlers reject unsigned requests
- Framework-level enforcement (reject all webhook requests without valid signature)

### 7.4 Webhook Storms

**Scenario:** A bulk operation on the provider side triggers thousands of webhooks simultaneously. A Shopify merchant imports 50,000 products — 50,000 `product/create` webhooks fire within minutes. A GitHub organization renames and triggers webhooks across hundreds of repositories.

**Impact:** Receiver overwhelmed, returning timeouts/5xx errors, which triggers retries, which create more load — the **retry amplification loop**. Can cascade into full receiver outage.

**Mitigation:**
- Queue-buffered architecture (absorb bursts in the queue)
- Rate limiting on the receiver (return 429 — well-behaved providers will back off)
- Circuit breaker pattern on the receiver side
- Provider-side: batch events where possible, respect consumer rate limits

### 7.5 Endpoint URL Hijacking

**Scenario:** Attacker gains access to the provider dashboard and changes the webhook URL to their own endpoint, receiving all events (potentially including sensitive data like customer information, payment details).

**Mitigation:**
- MFA on provider dashboard accounts
- Webhook URL changes trigger email notification to account owner
- Restrict webhook management to admin roles only
- Monitor for unexpected changes to webhook configuration

### 7.6 Payload Size and Timeout Issues

**Scenario:** Provider sends a webhook with a large payload (e.g., a Shopify order with 500 line items). Receiver's web framework has a body size limit that rejects the request, or processing takes longer than the provider's timeout (typically 5-30 seconds).

**Mitigation:**
- Configure generous body size limits on webhook endpoints (at least 1MB)
- Never process business logic synchronously in the webhook handler — persist to queue, return 200
- Stripe best practice: "Return a 200 response before any complex logic that might cause a timeout"

### 7.7 Secret Rotation Failures

**Scenario:** Signing secret needs rotation (compromised, compliance requirement, employee departure). Old secret is invalidated before new secret is deployed to all receiver instances, causing all webhooks to fail signature verification.

**Mitigation:**
- Support multiple active signing secrets during rotation window
- Provider generates new secret → deploy new secret to all receivers → verify → invalidate old secret
- Some providers (Stripe) support this natively with secret versioning

---

## 8. Technology Landscape

### 8.1 Webhook Infrastructure Services

| Service | Focus | Key Features | Pricing Model |
|---------|-------|--------------|---------------|
| **Svix** | Sending webhooks | Open-source core, hosted option, management UI, retry, signing, event types | Free tier (50K msgs), paid from $10/mo |
| **Hookdeck** | Receiving webhooks | Gateway, retry, transformation, rate limiting, DLQ, event routing | Free tier (100K requests), paid from $39/mo |
| **Convoy** | Sending + receiving | Open-source, self-hostable, multi-tenant, rate limiting | Open-source (free), cloud hosted available |
| **Hook Relay** | Receiving webhooks | Relay proxy, local development, event replay | Usage-based |
| **ngrok** | Local development | Tunnel public URL to localhost, request inspection | Free tier, paid from $8/mo |

**Build vs buy decision:** Svix estimates it takes 2-4 engineering months to build production-grade webhook sending infrastructure from scratch. For most teams, buying or using open-source is the correct choice unless webhooks are core to your product.

### 8.2 Provider Implementation Examples

**Stripe** — The gold standard for webhook design:
- Fat payloads with full object state + `previous_attributes`
- HMAC-SHA256 signing with timestamp-based replay protection
- Event type hierarchy (`payment_intent.succeeded`, `invoice.payment_failed`)
- Webhook endpoint management API + dashboard
- Event log with filtering and manual retry
- Test mode events (no real charges)
- Explicit recommendation to use webhooks + polling together

**GitHub** — Comprehensive but limited retries:
- Configurable per-repository or per-organization
- 250+ event types with granular filtering
- HMAC-SHA256 with user-provided secret
- Recent Deliveries log with redeliver button
- Only 1 automatic retry after ~10 seconds — if both fail, event is lost
- Ping event on webhook creation for endpoint verification

**Twilio** — Resource-level webhook configuration:
- Webhook URLs set per-resource (per phone number, per messaging service)
- Signatures use account auth token (shared across all webhooks)
- StatusCallback URLs for async event notification
- Fallback URLs for primary endpoint failure
- Request validation using X-Twilio-Signature header

**Shopify** — Aggressive failure handling:
- Topic-based subscription (`orders/create`, `products/update`)
- HMAC-SHA256 with app-specific secret
- 19 retry attempts over 48 hours with exponential backoff
- **Removes webhook subscription after 19 consecutive failures**
- Mandatory webhook compliance for apps in the Shopify App Store

### 8.3 Local Development Tools

| Tool | How It Works | Best For |
|------|-------------|----------|
| **ngrok** | Creates secure tunnel from public URL to localhost | General webhook development, widely supported |
| **Hookdeck CLI** | Routes webhooks through Hookdeck to localhost | Teams already using Hookdeck |
| **Stripe CLI** | `stripe listen --forward-to localhost:3000` | Stripe-specific development |
| **localtunnel** | Open-source alternative to ngrok | Cost-sensitive, open-source preference |
| **Webhook.site** | Captures and inspects webhook payloads in browser | Debugging payload format, no code needed |

---

## 9. Decision Tree

```
Need to react to external service events?
├── YES: Does the provider support webhooks?
│   ├── YES: Use webhooks (proceed to architecture decisions below)
│   │   ├── Is your receiver always available?
│   │   │   ├── YES: Level 2 (hardened receiver) may suffice
│   │   │   └── NO: Level 3+ (queue-buffered) required
│   │   ├── Can you handle burst traffic?
│   │   │   ├── YES: Direct processing possible
│   │   │   └── NO: Queue buffer mandatory
│   │   └── Are events critical (payments, orders)?
│   │       ├── YES: Webhooks + reconciliation polling + DLQ
│   │       └── NO: Webhooks with basic retry handling
│   └── NO: Polling is your only option
│       ├── Need near-real-time? → Short polling interval (15-30s)
│       └── Minutes-level latency OK? → Standard polling (1-5 min)
│
├── Need to SEND events to external consumers?
│   ├── < 10 consumers, low volume: Build simple webhook sender
│   ├── 10-100 consumers, moderate volume: Use Svix or Convoy
│   └── 100+ consumers, high volume: Managed infrastructure (Svix/Hookdeck)
│
└── Internal service-to-service events?
    ├── Strong ordering needed? → Kafka / SQS FIFO
    ├── Simple pub/sub? → RabbitMQ / SNS+SQS / NATS
    └── Real-time bidirectional? → WebSocket / gRPC streaming
```

---

## 10. Implementation Sketch

### 10.1 Webhook Sender (Provider Side)

```python
"""
Production webhook sender with retry, signing, and DLQ.
Uses a background queue for async delivery.
"""

import hmac
import hashlib
import json
import time
import uuid
import random
from dataclasses import dataclass
from enum import Enum

class DeliveryStatus(Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    DLQ = "dead_letter"

@dataclass
class WebhookEvent:
    id: str
    type: str
    timestamp: int
    data: dict
    api_version: str = "2025-01-01"

@dataclass
class WebhookSubscription:
    id: str
    url: str
    events: list[str]
    secret: str
    active: bool = True
    failure_count: int = 0
    max_failures: int = 20  # Disable after N consecutive failures

class WebhookSender:
    """Handles webhook delivery with signing, retries, and failure tracking."""

    def __init__(self, queue, event_store, dlq):
        self.queue = queue         # SQS, RabbitMQ, Redis, etc.
        self.event_store = event_store  # DB for event log
        self.dlq = dlq             # Dead letter queue

    def emit_event(self, event_type: str, data: dict):
        """Create an event and fan out to all matching subscriptions."""
        event = WebhookEvent(
            id=f"evt_{uuid.uuid4().hex[:24]}",
            type=event_type,
            timestamp=int(time.time()),
            data=data,
        )

        subscriptions = self.get_active_subscriptions(event_type)
        for sub in subscriptions:
            delivery = {
                "event": event.__dict__,
                "subscription_id": sub.id,
                "url": sub.url,
                "secret": sub.secret,
                "attempt": 0,
                "max_retries": 8,
            }
            self.queue.enqueue(delivery)
            self.event_store.log(event, sub, DeliveryStatus.PENDING)

    def sign_payload(self, payload_bytes: bytes, secret: str) -> dict:
        """Generate HMAC-SHA256 signature with timestamp."""
        timestamp = str(int(time.time()))
        signed_content = f"{timestamp}.{payload_bytes.decode('utf-8')}"
        signature = hmac.new(
            secret.encode(),
            signed_content.encode(),
            hashlib.sha256,
        ).hexdigest()
        return {
            "Content-Type": "application/json",
            "X-Webhook-ID": str(uuid.uuid4()),
            "X-Webhook-Timestamp": timestamp,
            "X-Webhook-Signature": f"sha256={signature}",
        }

    async def deliver(self, delivery: dict):
        """Attempt delivery with retry on failure."""
        event = delivery["event"]
        payload = json.dumps(event).encode()
        headers = self.sign_payload(payload, delivery["secret"])

        try:
            response = await http_post(
                delivery["url"],
                body=payload,
                headers=headers,
                timeout=30,
            )
            if 200 <= response.status < 300:
                self.event_store.update(
                    event["id"], delivery["subscription_id"],
                    DeliveryStatus.DELIVERED,
                )
                self.reset_failure_count(delivery["subscription_id"])
                return

            # 4xx (except 408, 429) = do not retry
            if 400 <= response.status < 500 and response.status not in (408, 429):
                self.event_store.update(
                    event["id"], delivery["subscription_id"],
                    DeliveryStatus.FAILED,
                )
                return
        except (TimeoutError, ConnectionError):
            pass

        # Schedule retry or send to DLQ
        attempt = delivery["attempt"] + 1
        if attempt < delivery["max_retries"]:
            delay = min(5 * (2 ** attempt), 3600)  # Cap at 1 hour
            jitter = random.uniform(0, delay)
            delivery["attempt"] = attempt
            self.queue.enqueue(delivery, delay_seconds=jitter)
        else:
            self.dlq.enqueue(delivery)
            self.event_store.update(
                event["id"], delivery["subscription_id"],
                DeliveryStatus.DLQ,
            )
            self.increment_failure_count(delivery["subscription_id"])
```

### 10.2 Webhook Receiver (Consumer Side)

```python
"""
Production webhook receiver with signature verification,
queue-buffered processing, and idempotency.
"""

import hmac
import hashlib
import time
import json
from functools import wraps

# -- Middleware: Signature Verification --

WEBHOOK_SECRET = os.environ["WEBHOOK_SIGNING_SECRET"]
TIMESTAMP_TOLERANCE = 300  # 5 minutes

def verify_webhook_signature(func):
    """Decorator that enforces HMAC signature verification."""
    @wraps(func)
    async def wrapper(request):
        # Read raw body ONCE (do not parse and re-serialize)
        raw_body = await request.body()

        timestamp = request.headers.get("X-Webhook-Timestamp")
        signature = request.headers.get("X-Webhook-Signature")

        if not timestamp or not signature:
            return Response(status=401, body="Missing signature headers")

        # Replay protection: reject stale timestamps
        try:
            ts = int(timestamp)
        except ValueError:
            return Response(status=401, body="Invalid timestamp")

        if abs(time.time() - ts) > TIMESTAMP_TOLERANCE:
            return Response(status=401, body="Timestamp too old")

        # Recompute and compare signature
        signed_content = f"{timestamp}.{raw_body.decode('utf-8')}"
        expected = hmac.new(
            WEBHOOK_SECRET.encode(),
            signed_content.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(f"sha256={expected}", signature):
            return Response(status=401, body="Invalid signature")

        # Attach parsed payload to request for handler
        request.webhook_payload = json.loads(raw_body)
        return await func(request)

    return wrapper


# -- Endpoint: Queue-Buffered Receiver --

@app.post("/webhooks/provider")
@verify_webhook_signature
async def receive_webhook(request):
    """Accept webhook, persist to queue, return 200 immediately."""
    payload = request.webhook_payload
    event_id = payload.get("id")

    # Quick dedup check (optional — worker also deduplicates)
    if await redis.exists(f"webhook:seen:{event_id}"):
        return Response(status=200, body="Already received")

    # Persist to processing queue
    await queue.enqueue({
        "event_id": event_id,
        "event_type": payload.get("type"),
        "payload": payload,
        "received_at": time.time(),
    })

    await redis.set(f"webhook:seen:{event_id}", "1", ex=86400)

    # Return 200 BEFORE any business logic
    return Response(status=200)


# -- Worker: Idempotent Event Processor --

class WebhookWorker:
    """Processes webhook events from queue with idempotency."""

    def __init__(self, queue, db):
        self.queue = queue
        self.db = db
        self.handlers = {}

    def register(self, event_type: str):
        """Decorator to register an event handler."""
        def decorator(func):
            self.handlers[event_type] = func
            return func
        return decorator

    async def process(self):
        """Main processing loop."""
        while True:
            message = await self.queue.dequeue()
            event_id = message["event_id"]
            event_type = message["event_type"]

            # Idempotency: skip if already processed
            if await self.already_processed(event_id):
                await self.queue.ack(message)
                continue

            handler = self.handlers.get(event_type)
            if not handler:
                # Unknown event type — ack and skip
                await self.queue.ack(message)
                continue

            try:
                await handler(message["payload"])
                await self.mark_processed(event_id, event_type)
                await self.queue.ack(message)
            except Exception as e:
                # Return to queue for retry (queue handles DLQ)
                await self.queue.nack(message)
                log.error(f"Failed to process {event_id}: {e}")

    async def already_processed(self, event_id: str) -> bool:
        """Check idempotency store."""
        result = await self.db.execute(
            "SELECT 1 FROM processed_events WHERE event_id = $1",
            event_id,
        )
        return result is not None

    async def mark_processed(self, event_id: str, event_type: str):
        """Record successful processing."""
        await self.db.execute(
            """INSERT INTO processed_events (event_id, event_type, processed_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (event_id) DO NOTHING""",
            event_id, event_type,
        )


# -- Handler Registration --

worker = WebhookWorker(queue, db)

@worker.register("payment_intent.succeeded")
async def handle_payment_succeeded(payload):
    payment = payload["data"]["object"]
    order_id = payment["metadata"]["order_id"]

    # Idempotent operation: SET status = 'paid' is safe to repeat
    await db.execute(
        """UPDATE orders SET status = 'paid', paid_at = NOW()
           WHERE id = $1 AND status = 'pending'""",
        order_id,
    )
    await send_receipt_email(order_id)

@worker.register("customer.subscription.deleted")
async def handle_subscription_canceled(payload):
    subscription = payload["data"]["object"]
    customer_id = subscription["customer"]

    # Idempotent: downgrade only if still on paid plan
    await db.execute(
        """UPDATE users SET plan = 'free', plan_expires_at = NOW()
           WHERE stripe_customer_id = $1 AND plan != 'free'""",
        customer_id,
    )
```

### 10.3 Reconciliation Poller (Safety Net)

```python
"""
Periodic reconciliation that catches events missed by webhooks.
Run alongside webhook processing — not instead of it.
"""

async def reconcile_payments():
    """Fetch recent Stripe events and process any we missed."""
    # Get events from the last hour
    events = await stripe.Event.list(
        type="payment_intent.succeeded",
        created={"gte": int(time.time()) - 3600},
        limit=100,
    )

    for event in events.auto_paging_iter():
        if not await already_processed(event.id):
            await process_event(event)
            log.info(f"Reconciliation caught missed event: {event.id}")

# Run every 30 minutes via cron or scheduler
# Frequency decreases as webhook reliability is proven
```

---

## 11. Operational Checklist

### 11.1 Before Going to Production

- [ ] Signature verification is enforced on all webhook endpoints (not just implemented — enforced)
- [ ] Timestamp validation rejects webhooks older than 5 minutes
- [ ] Raw request body is used for signature computation (not re-serialized JSON)
- [ ] Timing-safe comparison is used for signature matching
- [ ] Signing secret is stored in environment variables or secrets manager
- [ ] Webhook handler returns 200 before any business logic processing
- [ ] Events are persisted to a queue before acknowledgment
- [ ] Idempotency is implemented (event ID deduplication or idempotent operations)
- [ ] Reconciliation polling is running as a safety net for critical integrations
- [ ] Monitoring and alerting is configured for webhook endpoint health
- [ ] Load testing has verified the endpoint can handle expected burst traffic
- [ ] Body size limits are configured (minimum 1MB for webhook endpoints)
- [ ] Zero-downtime deployment is configured for the webhook endpoint

### 11.2 Monitoring Metrics

| Metric | Alert Threshold | Why It Matters |
|--------|----------------|----------------|
| Webhook endpoint response time (p99) | > 5 seconds | Provider will timeout and retry, creating amplification |
| Webhook endpoint error rate | > 1% over 5 minutes | Provider may disable endpoint |
| Queue depth | Growing for > 10 minutes | Workers are not keeping up with event volume |
| DLQ depth | Any message | Failed events need investigation |
| Event processing latency | > target SLA | Business impact (delayed order fulfillment, etc.) |
| Duplicate event rate | Sustained > 10% | Provider retry logic may be misconfigured, or dedup is failing |
| Signature verification failures | Any | Either a bug or an active attack |

---

## 12. Case Studies

### 12.1 Stripe: Webhook Infrastructure at Scale

Stripe processes billions of webhook deliveries monthly. Key architectural decisions:

- **Fat payloads** — full object state included, reducing API round-trips
- **Event versioning** — API version pinned per-endpoint, enabling schema evolution without breaking consumers
- **Retry policy** — up to 3 attempts over 72 hours with exponential backoff
- **Endpoint disabling** — after sustained failures, endpoints are marked as disabled (not deleted) with email notification
- **Test mode** — separate webhook endpoints for test vs live mode events
- **Explicit reconciliation guidance** — Stripe documentation explicitly recommends polling as a complement to webhooks

**Lesson:** Even the best webhook infrastructure recommends a backup mechanism. Webhooks are the fast path, not the only path.

### 12.2 GitHub: Minimal Retry, Maximum Transparency

GitHub takes a different approach — minimal retries (1 retry after ~10 seconds) but maximum transparency:

- **Recent Deliveries** dashboard shows the last 20 deliveries with full request/response details
- **Redeliver** button allows manual replay of any past delivery
- **Ping event** sent on webhook creation to verify connectivity
- **250+ event types** with granular filtering

**Lesson:** If your retry policy is minimal, compensate with excellent tooling for debugging and manual replay. GitHub's approach works because their events are less critical (CI triggers, notifications) than financial events.

### 12.3 Shopify: Aggressive Failure Handling

Shopify takes the most aggressive stance on endpoint health:

- 19 retry attempts over 48 hours
- **Removes the entire webhook subscription** after 19 consecutive failures
- Mandatory webhook compliance for App Store apps
- Bulk operations can trigger thousands of webhooks simultaneously

**Lesson:** Your webhook consumer must be resilient, or you will lose your subscription entirely. Queue-buffered architectures are not optional for Shopify integrations.

---

## 13. Anti-Patterns

### 13.1 Synchronous Processing in the Handler

```python
# BAD: Processing in the request handler
@app.post("/webhooks")
async def webhook(request):
    payload = await request.json()
    await update_database(payload)          # Slow
    await send_email(payload)               # Slow
    await notify_slack(payload)             # Slow
    await update_analytics(payload)         # Slow
    return Response(status=200)             # Provider already timed out
```

The provider has a 5-30 second timeout. If your processing exceeds that, the provider records a failure and retries — creating duplicate work and potentially disabling your endpoint.

### 13.2 Trusting the Payload Without Verification

```python
# BAD: No signature verification
@app.post("/webhooks")
async def webhook(request):
    payload = await request.json()
    if payload["type"] == "payment.succeeded":
        await fulfill_order(payload["data"]["order_id"])  # Attacker can forge this
```

Anyone who discovers your webhook URL can send forged events. Always verify the signature.

### 13.3 Relying on Webhook Ordering

```python
# BAD: Assuming events arrive in order
@app.post("/webhooks")
async def webhook(request):
    payload = await request.json()
    if payload["type"] == "order.created":
        await create_order(payload)
    elif payload["type"] == "order.paid":
        order = await get_order(payload)  # May not exist yet!
        await mark_paid(order)
```

`order.paid` can arrive before `order.created`. Use timestamp-based updates or fetch current state from the provider API.

### 13.4 No Idempotency

```python
# BAD: Non-idempotent handler
@app.post("/webhooks")
async def webhook(request):
    payload = await request.json()
    if payload["type"] == "payment.succeeded":
        await credit_account(payload["amount"])  # Doubles on retry!
```

At-least-once delivery means you will receive duplicates. Every handler must be idempotent.

### 13.5 Exposing Internal State in Webhook Payloads

```python
# BAD: Leaking internal IDs and database structure
event = {
    "type": "user.created",
    "data": {
        "internal_user_id": 12345,           # Sequential — enumerable
        "postgres_row_id": 67890,            # Reveals database
        "auth_hash": "bcrypt$...",           # Security breach
        "feature_flags": {"beta_v2": True},  # Internal roadmap leak
    }
}
```

Webhook payloads go to external systems. Treat them as public API responses — expose only what consumers need.

---

## 14. Cross-References

- **api-design-rest** — Webhook registration endpoints follow REST conventions; event payload design shares principles with API response design
- **event-driven** — Webhooks are the cross-boundary implementation of event-driven architecture; internal events use message brokers
- **idempotency-and-retry** — Core requirement for webhook consumers; idempotency keys and retry strategies apply directly
- **third-party-integration** — Webhooks are the primary mechanism for SaaS integration; this module covers the webhook-specific patterns
- **rate-limiting-and-throttling** — Webhook receivers need rate limiting to handle bursts; webhook senders should respect consumer rate limits
- **secrets-management** — Webhook signing secrets must be stored securely and rotated safely

---

## 15. Quick Reference Card

```
SENDING WEBHOOKS                          RECEIVING WEBHOOKS
─────────────────                         ──────────────────
1. Sign with HMAC-SHA256 + timestamp      1. Verify signature (HMAC-SHA256)
2. Include event ID, type, timestamp      2. Reject stale timestamps (>5 min)
3. Fat payload (full object state)        3. Return 200 IMMEDIATELY
4. Retry with exponential backoff+jitter  4. Persist to queue, process async
5. DLQ after max retries exhausted        5. Deduplicate by event ID
6. Disable endpoint after N failures      6. Handle out-of-order events
7. Provide event log + manual replay      7. Run reconciliation polling
8. Support secret rotation                8. Monitor endpoint health + DLQ depth
```
