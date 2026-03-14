# Third-Party Integration -- Architecture Expertise Module

> Third-party integration covers the architecture of connecting your system to external services
> (payment processors, email providers, cloud APIs, SaaS platforms). The key principle: never let
> a third-party API shape your domain model. Use adapter/anti-corruption layers to isolate external
> dependencies so that vendor changes, outages, and API deprecations remain contained at the boundary.

> **Category:** Integration
> **Complexity:** Moderate
> **Applies when:** Integrating with any external service -- payment processing, email/SMS, cloud storage, analytics, authentication providers, AI/ML APIs, or any vendor whose availability and API surface you do not control.

---

## What This Is (and What It Isn't)

### Core Concepts

**Adapter Pattern for External Services.** An adapter wraps a third-party API behind an interface
that your domain defines. Your domain declares what it needs (a port): "I need to charge a
customer." The adapter translates that into Stripe's `PaymentIntent.create()` call, or Braintree's
`Transaction.sale()`, or Adyen's `/payments` endpoint. The domain never imports the vendor SDK.
The adapter lives in the infrastructure layer and implements the domain's port.

**Anti-Corruption Layer (ACL).** Coined by Eric Evans in *Domain-Driven Design* (2003), the ACL
is a boundary that prevents an external system's model from leaking into your domain. The external
system has its own language, its own entity shapes, its own invariants. The ACL translates between
the two models. Without it, your domain objects accumulate fields like `stripe_customer_id`,
`twilio_message_sid`, `sendgrid_template_id` -- vendor concepts that have no place in your
business logic. The ACL is more than an adapter: it actively reshapes data, maps foreign concepts
to domain concepts, and may aggregate or decompose entities to maintain domain integrity.

**Facade for External APIs.** When an external service exposes a sprawling API surface (AWS S3
has 100+ operations, Stripe has 300+ endpoints), a facade narrows the interface to only the
operations your system actually uses. This reduces the blast radius of API changes and makes the
integration testable. If you use 4 of Stripe's 300 endpoints, your facade exposes 4 methods.

**Vendor Abstraction.** A generalized interface that lets you swap between vendors without
touching application code. Your system defines a `NotificationSender` interface; one adapter
sends via Twilio SMS, another via AWS SNS, another via Firebase Cloud Messaging. The application
code calls `notificationSender.send(recipient, message)` and does not know or care which vendor
fulfills it. This is the Dependency Inversion Principle applied to external service boundaries.

### What It Is NOT

**Not about wrapping every HTTP call.** If your system makes a one-off call to a public REST API
to fetch weather data for a display widget, you do not need a port, adapter, ACL, and factory.
A simple HTTP client call with error handling is sufficient. Architecture is about protecting
the parts of your system that matter, not about ceremony for its own sake.

**Not about eliminating all vendor awareness.** Some vendor-specific concerns are legitimate at
the infrastructure level. A Stripe webhook handler needs to verify Stripe's signature format.
An AWS S3 adapter needs to handle multipart uploads. The goal is not to pretend vendors don't
exist -- it is to confine vendor awareness to a specific architectural layer.

**Not a guarantee against vendor lock-in.** An adapter interface reduces switching cost, but it
does not eliminate it. If you depend on Stripe's dispute resolution workflow, subscription
lifecycle events, and billing portal, switching to Braintree means rebuilding all of those
adapter implementations. The abstraction makes the switch *possible* without domain changes;
it does not make the switch *cheap*.

**Not always the right investment.** Abstraction has a cost: indirection, maintenance burden,
and the risk of a leaky or lowest-common-denominator interface. The decision to abstract must
be justified by the likelihood and cost of change.

---

## When to Use Abstraction Layers

### The Qualifying Conditions

**Multiple vendors are realistic.** Your system may need to support Stripe in the US, Adyen
in Europe, and Razorpay in India. You genuinely need a `PaymentGateway` interface with multiple
implementations. This is the strongest justification for adapter/ACL investment.

**Vendor switching is a real business risk.** The vendor may raise prices, deprecate a critical
feature, suffer reliability issues, or lose compliance certifications. Shopify's architecture
decouples core commerce logic from payment gateways specifically because merchants routinely
switch between Stripe, PayPal, and local processors. The switching cost needs to be contained.

**The vendor's model conflicts with your domain model.** Stripe models payments as
`PaymentIntent` -> `Charge` -> `BalanceTransaction`. Your domain might model payments as
`Order` -> `Payment` -> `Settlement`. These are fundamentally different entity graphs. Without
an ACL, your domain classes inherit Stripe's terminology and lifecycle, making it impossible
to reason about your business in your own terms.

**The vendor API is unstable or rapidly evolving.** Stripe ships breaking changes in new API
versions roughly annually. OpenAI's API evolved from completions to chat completions to
assistants within two years. If the vendor moves fast, an adapter layer absorbs those changes
in one place rather than scattering updates across your codebase.

**You need to test business logic without the vendor.** Your checkout flow has 47 business
rules about discounts, taxes, shipping calculations, and inventory checks. If the payment
call is embedded directly in the checkout service, testing those 47 rules requires mocking
Stripe at the HTTP level. With an adapter, you inject a `FakePaymentGateway` that returns
success/failure deterministically.

**Regulatory or compliance boundaries.** PCI DSS requires that cardholder data handling is
isolated and auditable. GDPR requires that data sent to third parties is tracked. An adapter
layer provides a natural audit boundary: all data flowing to the vendor passes through a
single, reviewable chokepoint.

---

## When NOT to Use Abstraction Layers

This section is as important as the previous one. Over-abstraction of third-party integrations
is one of the most common architectural mistakes, producing interfaces that serve no purpose
except to satisfy a pattern fetish.

### The Disqualifying Conditions

**You will only ever use one vendor, and that is a deliberate strategic choice.** If your
entire business model is built on Shopify's platform, you are not going to switch to
WooCommerce. If you are an AWS shop that has committed to a three-year Reserved Instance
contract with enterprise support, abstracting S3 behind a `FileStorage` interface "in case
you switch to GCP" is a fantasy. The abstraction will rot because it is never exercised by
a second implementation.

A fintech startup spent four months building a vendor-agnostic payment abstraction layer
supporting Stripe, Braintree, and Adyen. They launched with Stripe. Three years later, they
still only use Stripe. The abstraction layer has been maintained across 14 Stripe API version
upgrades, each requiring changes to the "vendor-agnostic" interface because the interface was
unknowingly shaped by Stripe's model. The second and third adapters were never written.

**The abstraction costs more than switching would.** If switching vendors is a one-time,
two-week project that happens at most once in the system's lifetime, spending four months
building and maintaining an abstraction layer to make that switch take one week instead of
two is a net loss. Calculate: (cost of maintaining abstraction x system lifetime) vs.
(one-time cost of switching without abstraction). If the latter is smaller, skip the layer.

**Thin abstractions that just proxy calls.** An interface `EmailSender` with one method
`send(to, subject, body)` that has exactly one implementation `SendGridEmailSender` which
calls `sendGrid.send(to, subject, body)` is not an abstraction -- it is a forwarding layer.
It adds a file, an interface, and a binding without providing any value. If the interface
method signature is a 1:1 mirror of the vendor method, you have not abstracted anything.
You have added indirection.

**The vendor IS the product.** If you are building a Stripe dashboard, a Twilio call center,
or an AWS management console, the vendor API is not an external dependency -- it is your
domain. Abstracting it away means abstracting away your core business logic. A Stripe
analytics tool that hides Stripe's data model behind a "vendor-agnostic payment" interface
loses the ability to surface Stripe-specific insights that are the tool's entire value.

**Prototypes and MVPs.** You are validating whether customers want the feature at all. Do not
build adapter layers for a feature that might be deleted in six weeks. Call Stripe directly.
If the feature survives and the system grows, introduce the abstraction then. This is not
technical debt -- it is appropriate engineering for the stage of the product.

**The lowest-common-denominator problem.** If Stripe supports subscriptions with metered
billing, proration, and usage-based pricing, but Braintree only supports flat-rate
subscriptions, your "vendor-agnostic" subscription interface can only expose the intersection
of their capabilities: flat-rate subscriptions. You lose access to Stripe features that your
customers need, or you add vendor-specific escape hatches that defeat the purpose of the
abstraction. The richer vendor's unique capabilities leak through the interface or are
abandoned.

**Real example of over-abstraction.** A SaaS company built a `CloudProvider` interface
abstracting AWS, GCP, and Azure behind unified `compute()`, `store()`, and `queue()` methods.
The interface could not express AWS Lambda's cold start characteristics, GCP's BigQuery
integration, or Azure's Active Directory hooks. Every meaningful feature required
vendor-specific code paths. The abstraction became a lie -- callers needed to know which
vendor was behind the interface to use it correctly. The team eventually deleted the
abstraction and used vendor SDKs directly with thin, vendor-specific adapters per service.

---

## How It Works

### 1. Adapter Pattern Implementation

The adapter pattern for third-party services follows a structure:

```
Domain Layer (your code):
  defines PaymentGateway port (interface)
  defines domain types: Money, PaymentResult, PaymentMethod

Infrastructure Layer (your code):
  StripePaymentGateway implements PaymentGateway
    - imports Stripe SDK
    - translates domain types to/from Stripe types
    - handles Stripe-specific errors, retries, idempotency keys

  BraintreePaymentGateway implements PaymentGateway
    - imports Braintree SDK
    - translates domain types to/from Braintree types
    - handles Braintree-specific error codes

Application Layer (your code):
  CheckoutService depends on PaymentGateway (the interface)
  - never imports Stripe or Braintree
  - testable with FakePaymentGateway
```

The critical discipline: the interface is defined in terms of your domain, not the vendor's.
`PaymentGateway.charge(Money amount, PaymentMethod method)` -- not
`PaymentGateway.createPaymentIntent(int amountInCents, String currency, String paymentMethodId)`.
The former is your language. The latter is Stripe's language wearing your interface's clothes.

### 2. Anti-Corruption Layer Translation

The ACL does more than route calls. It translates between two conceptual models.

**Example -- CRM Integration:**

Your domain has `Customer` with `loyaltyTier`, `lifetimeValue`, and `preferredContactMethod`.
Salesforce has `Contact` with `Account`, `Opportunity`, and 200 custom fields. The ACL:

- Maps `Customer` to a Salesforce `Contact` + `Account` (one domain entity becomes two Salesforce
  entities).
- Translates `loyaltyTier` (an enum: BRONZE, SILVER, GOLD) to Salesforce's custom field
  `Loyalty_Level__c` (a string: "B", "S", "G").
- Ignores the 180 Salesforce fields your system does not use.
- Handles Salesforce's governor limits (API calls per 24-hour window) internally.
- Converts Salesforce's `SystemModstamp` (ISO 8601 with timezone) to your domain's `updatedAt`
  (UTC epoch milliseconds).

Without the ACL, Salesforce's model colonizes your codebase. With the ACL, your domain stays
clean and the Salesforce translation logic is contained in one package.

### 3. Circuit Breaker for External Calls

Third-party services fail. They fail more often than your own services because you do not
control their infrastructure, deployment schedule, or capacity planning. The circuit breaker
pattern prevents a failing third-party from cascading into your system.

**Three states:**

- **Closed (normal):** Requests flow to the third party. The breaker tracks failure rates.
- **Open (tripped):** After the failure threshold is exceeded (e.g., 50% of requests failed
  in the last 30 seconds), the breaker opens. All requests are immediately rejected with a
  fallback response. No calls reach the third party. This protects your system from hanging
  on timeouts and protects the third party from retry storms.
- **Half-open (probing):** After a cooldown period (e.g., 60 seconds), the breaker allows
  one probe request. If it succeeds, the breaker closes. If it fails, the breaker reopens.

**Real-world example -- Stripe latency outage (2022):** Increased traffic combined with an
unbalanced connection pool saturated a database cluster. Downstream clients without circuit
breakers continued retrying, amplifying the load. Services with circuit breakers detected
the elevated latency, opened their breakers, and served cached or fallback responses.
Services without breakers queued requests until their own thread pools exhausted, causing
cascading failures in their own systems.

### 4. Retry with Exponential Backoff

Not every failure is permanent. Network blips, rate limits, and transient 503 errors are
common with third-party APIs. Retry logic handles these, but naive retries cause more harm
than good.

**Rules for retry:**

- **Retry only idempotent operations** or operations with idempotency keys. Retrying a
  non-idempotent `POST /charges` without an idempotency key risks double-charging.
- **Exponential backoff:** Wait 1s, 2s, 4s, 8s, 16s. Not 1s, 1s, 1s, 1s (which becomes
  a retry storm under load).
- **Jitter:** Add random variation (0-500ms) to the backoff interval. Without jitter, when
  a third-party recovers from an outage, all clients retry simultaneously at the same
  exponential intervals, creating a thundering herd.
- **Maximum retries:** Cap at 3-5 attempts. Beyond that, the failure is not transient.
- **Retry only retriable errors:** Retry on 429, 503, 504, connection timeout. Do not retry
  on 400 (bad request), 401 (auth failure), 404 (not found), or 422 (validation error).
  These will never succeed on retry.

**Combine with circuit breaker:** Retries happen inside the circuit breaker. If the breaker
is open, retries are skipped entirely. This prevents retry storms from preventing the
breaker from recovering.

### 5. Timeout Configuration

Every external call must have a timeout. Without one, a hanging connection holds a thread
and potentially a database transaction open indefinitely.

- **Connection timeout (1-5s):** Time to establish TCP connection. Fail fast if unreachable.
- **Read timeout (5-30s):** Time to receive a response. Varies by operation (Stripe charge:
  2-5s; AI inference: up to 30s).
- **Overall timeout (10-60s):** Total budget including retries.

**Do not use vendor SDK defaults.** Stripe's Ruby SDK defaulted to 80 seconds for years. One
slow call holding a thread for 80 seconds under load can exhaust your entire thread pool.

### 6. Credential Management

- **Never store credentials in code.** Use environment variables for simple deployments;
  secrets managers (Vault, AWS Secrets Manager) for production.
- **Rotate on a schedule.** Create new key, deploy, verify, then revoke old key. Automate.
- **Scope minimally.** If you only create charges and read customers, use a restricted key.
- **Separate per environment.** Staging using production Stripe keys is a billing incident.

**Real incident -- Uber (2016):** AWS credentials committed to GitHub. Attackers accessed
57 million user records. Root cause: credential management, not an AWS vulnerability.

### 7. Webhook Handling

Webhooks are how third-party services notify you of events (payment completed, subscription
cancelled, email bounced). They invert the communication direction: instead of polling,
the vendor pushes to you.

**Architectural requirements:**

- **Verify signatures on every webhook.** Stripe signs payloads with HMAC-SHA256 using
  your webhook signing secret. Verify the signature using the raw request body and a
  timing-safe comparison. Without verification, anyone can POST fake events to your
  webhook endpoint.
- **Enforce timestamp windows.** Reject webhooks with timestamps older than 5-10 minutes
  to prevent replay attacks.
- **Implement idempotency.** Webhooks are delivered at least once, not exactly once.
  Store processed event IDs (e.g., Stripe's `evt_xxxxx`) in your database or Redis with
  a TTL of 7-30 days. Before processing, check if the event ID exists. If it does, return
  200 and skip processing. This prevents duplicate order fulfillment, duplicate emails,
  and duplicate inventory decrements.
- **Respond fast, process asynchronously.** Return HTTP 200 within 1-3 seconds. Enqueue
  the event for background processing. If your webhook handler takes 30 seconds to process
  an event synchronously, the vendor will time out and retry, causing duplicate delivery.
  Treat webhook receivers as verify-enqueue-acknowledge services.
- **Handle out-of-order delivery.** Webhooks may arrive out of order. A `payment.succeeded`
  event might arrive before the `payment.created` event. Design your handler to be
  order-independent, or implement ordering logic using event timestamps and sequence numbers.
- **Set up a dead-letter queue.** Events that fail processing after all retries should be
  stored in a DLQ for manual inspection and replay, not silently dropped.

### 8. Rate Limit Handling

Third-party APIs enforce rate limits (Stripe: 100 reads/s live, 25 test; Twilio:
per-account concurrency; SendGrid: plan-tier based).

- **Read rate limit headers.** Track `X-RateLimit-Remaining` and `Retry-After` to throttle
  proactively before hitting the limit.
- **Client-side rate limiting.** Token bucket or leaky bucket in your adapter prevents
  bursts from triggering 429 responses.
- **Queue and batch.** SendGrid supports 1,000 recipients per call. Batch where possible.
- **Degrade gracefully on 429.** Surface as delays ("processing, ready in a few minutes"),
  not errors ("service unavailable"). Back off using `Retry-After`.

### 9. SDK vs. Direct HTTP

**Use the SDK when:** it handles authentication, pagination, webhook verification, and
versioning correctly; it provides type safety; your adapter wraps it so the rest of your
system never sees SDK types.

**Use direct HTTP when:** the SDK is unmaintained, pulls heavy transitive dependencies,
you only use 2-3 endpoints, or cold start time matters in serverless environments.

**The hybrid approach:** Use the SDK inside your adapter, but define the adapter interface
in domain terms. `charge(amount: Money): PaymentResult` calls `stripe.paymentIntents.create()`
internally. If you switch to direct HTTP, only the adapter body changes.

### 10. Error Mapping

Third-party error responses must be translated into your domain's error model. Do not let
vendor error codes propagate into your application layer.

- **Map vendor errors to domain errors.** Stripe's `card_declined` becomes your
  `PaymentDeclined`. Your application catches domain exceptions, not Stripe exceptions.
- **Log vendor diagnostics, never expose them.** The adapter logs `Stripe: card_declined
  (req_xxx)` and throws `PaymentDeclined` with a user-safe message.
- **Distinguish retriable from terminal.** `rate_limit` is retriable (retry may succeed).
  `card_declined` is terminal (do not retry). Your error model must express this.

### 11. Health Checks for External Dependencies

- **Shallow check:** Verify reachability (DNS, TCP, TLS). Catches network-level failures.
- **Deep check:** Lightweight read-only API call (Stripe: `GET /v1/balance`). Catches auth
  failures and account suspension.
- **Never block your primary health check on third-party health.** Stripe down means
  degraded, not dead. Report vendor status on a dependency endpoint. If your liveness probe
  fails because Stripe is down, Kubernetes restarts healthy pods unnecessarily.

---

## Trade-Offs Matrix

| Decision | Benefit | Cost | When to Accept the Cost |
|----------|---------|------|------------------------|
| Full adapter + ACL layer | Vendor-independent domain; clean testability | More code, more indirection; risk of lowest-common-denominator interface | Multiple vendors realistic; domain model is valuable and long-lived |
| Direct vendor SDK usage | Fastest integration; access to all vendor features | Domain polluted with vendor types; switching cost is high | Single vendor commitment; prototype/MVP; vendor IS the domain |
| Circuit breaker | Prevents cascading failure from vendor outage | Added complexity; risk of opening too aggressively (false positives) | Any vendor where downtime causes user-facing impact |
| Retry with backoff | Handles transient failures transparently | Increased latency on failure paths; retry storms if misconfigured | All integrations, but only for idempotent or idempotency-keyed operations |
| Webhook-based integration | Real-time updates; no polling overhead | Must handle at-least-once delivery, out-of-order events, signature verification | Vendor supports webhooks and you need real-time event processing |
| Polling-based integration | Simpler implementation; you control the schedule | Higher latency; wasted API calls on no-change polls; rate limit consumption | Vendor does not support webhooks; event freshness requirements are relaxed |
| SDK usage | Faster development; handles auth, pagination, versioning | Dependency on vendor's SDK quality and maintenance; transitive dependency risk | SDK is well-maintained, actively versioned, and does not conflict with your stack |
| Direct HTTP calls | Full control; minimal dependencies; smaller bundle | Must implement auth, pagination, error handling, versioning manually | SDK is unavailable, unmaintained, or adds excessive dependency weight |
| Client-side rate limiting | Prevents 429 errors; smoother request distribution | Adds state management (token bucket); may under-utilize available quota | High-volume integrations where hitting rate limits causes user-facing degradation |
| Multi-vendor fallback | Resilience against single vendor outage | Maintaining two vendor integrations; data consistency between vendors | The integration is mission-critical and single-vendor outage is unacceptable |

---

## Evolution Path

### Stage 1: Direct Integration (Day 1 - MVP)

Call the vendor SDK directly from your service layer. No adapter, no interface, no ACL.
Ship the feature and validate that customers want it. Vendor types may appear in your
service signatures. This is acceptable at this stage.

```
CheckoutService -> stripe.paymentIntents.create(...)
```

**Cost of staying here too long:** Vendor concepts spread throughout the codebase. Tests
require mocking the vendor at the HTTP level. Switching vendors means touching every file
that imports the SDK.

### Stage 2: Extract Adapter (Month 3-6)

When the integration stabilizes and the feature is validated, extract the vendor calls into
a dedicated adapter class. Define an interface in your domain layer. Inject the adapter.
Write tests against a fake implementation.

```
CheckoutService -> PaymentGateway (interface) -> StripePaymentGateway (adapter)
```

**Trigger:** You need to write tests for checkout logic without calling Stripe. Or you
receive the first request to support a second payment provider.

### Stage 3: Add Resilience (Month 6-12)

Wrap the adapter with circuit breaker, retry, and timeout logic. Implement health checks.
Add monitoring for vendor API latency and error rates. Implement webhook handling with
idempotency and signature verification.

**Trigger:** The first vendor outage that causes user-facing impact. Or your system reaches
scale where transient errors are no longer rare edge cases.

### Stage 4: Multi-Vendor Support (Year 1-2)

If a second vendor is genuinely needed, implement a second adapter behind the same interface.
Add a routing layer that selects the vendor based on geography, feature requirements, or
failover rules. Refine the interface to accommodate both vendors without becoming a
lowest-common-denominator contract.

**Trigger:** Business expansion to a region where the current vendor does not operate. Or
contract negotiation where having a second vendor provides leverage.

### Stage 5: Platform Abstraction (Year 2+)

For systems with many integrations (10+ vendors), extract the integration infrastructure
into a shared platform: circuit breaker configuration, credential management, rate limiting,
health checking, and monitoring. Individual adapters focus only on translation logic.

**Trigger:** You are maintaining 10+ integrations and each one reimplements retry, timeout,
and error mapping logic independently.

---

## Failure Modes

### 1. Vendor Outage Cascading to Your System

**What happens:** Stripe goes down. Your checkout service calls Stripe with a 60-second
timeout. All checkout requests hang for 60 seconds. Your web server's thread pool is
exhausted. Your health check times out. Kubernetes restarts the pod. The new pod immediately
fills its thread pool with hanging Stripe calls. Your entire system is down because one
vendor is down.

**Real incident -- Slack (2020):** A massive user disconnection-reconnection event exceeded
database capacity, causing cascading connection failures. 5% of users could not connect for
over 2 hours. Services that depended on Slack's API for notifications experienced silent
failures.

**Real incident -- Cloudflare (November 2025):** A Cloudflare outage took down Resend's
email delivery service from 11:30 UTC to 14:31 UTC. Every service that depended on Resend
for transactional email lost email delivery capability for three hours.

**Prevention:** Circuit breakers with aggressive timeouts (5s, not 60s). Fallback responses
for non-critical paths. Graceful degradation: if Stripe is down, show "Payment processing
is temporarily delayed" instead of a 500 error. Queue the payment attempt for retry.

### 2. Rate Limiting Causing User-Facing Errors

**What happens:** A batch job runs during peak hours and consumes your entire Stripe rate
limit. Real-time checkout requests receive 429 responses. Users see "Payment failed."

**Prevention:** Separate API keys for batch and real-time operations (most vendors support
this). Client-side rate limiting with priority queues: real-time operations get priority
over batch operations. Schedule batch jobs during off-peak hours.

### 3. Credential Rotation Failures

**What happens:** Your API key rotation script creates a new key, deploys it to staging,
but fails to deploy to production. The old key is revoked. Production loses access to the
vendor API.

**Real incident -- Redocly (January 2026):** A background job queue error triggered a
cascading failure that, among other things, exhausted the secrets engine. With the secrets
engine rejecting requests, the orchestration layer could not start new API allocations,
leaving the API in a flapping state.

**Prevention:** Blue-green credential rotation: deploy the new credential, verify it
works in production with a health check, then revoke the old credential. Never revoke
before verifying. Keep the old credential valid for a grace period (24-48 hours).

### 4. API Version Deprecation Surprises

**What happens:** Stripe deprecates API version `2022-11-15` with 12 months notice. Your
team misses the deprecation email. Twelve months later, API calls start returning errors
with unknown fields or changed response shapes.

**Prevention:** Pin your API version explicitly (in the SDK configuration, not implicitly).
Monitor vendor changelogs and deprecation notices. Subscribe to vendor status pages and
engineering blogs. Include API version in your health check response so monitoring can
alert on upcoming deprecations.

### 5. Webhook Delivery Failures

**What happens:** Your webhook endpoint is down for 4 hours. The vendor retries with
exponential backoff. When your endpoint comes back, you receive 4 hours of webhooks in
rapid succession. Your processing pipeline is overwhelmed. Some events are processed out
of order. A subscription cancellation event arrives before the subscription creation event.

**Prevention:** Asynchronous processing with a queue between the webhook receiver and the
processor. Idempotency checks on event IDs. Order-independent event handling or explicit
ordering logic using event timestamps. Auto-scaling the processor based on queue depth.

### 6. Silent Data Corruption from API Changes

**What happens:** A vendor changes a field from string to integer, or adds a required field,
or changes the semantics of an existing field. Your deserialization succeeds (the SDK handles
the type change) but your business logic makes incorrect decisions based on the changed
semantics.

**Real example:** A vendor changed a `status` field from `"active"` to `"enabled"`. The
adapter checked `status === "active"`, which now always returned false. All users appeared
inactive. No error was thrown. The issue was discovered three days later by a customer
support ticket.

**Prevention:** Contract testing. Use tools like Pact or vendor-provided contract test
suites. Assert on the shape and semantics of vendor responses in your integration tests.
Monitor business metrics (conversion rates, active user counts) for anomalies that may
indicate silent API changes.

---

## Technology Landscape

### Common Integrations and Their Characteristics

| Service | Category | SDK Quality | Rate Limits | Webhook Support | API Stability |
|---------|----------|-------------|-------------|-----------------|---------------|
| **Stripe** | Payments | Excellent SDKs in 7+ languages; strongly typed | 100 reads/s live, 25 test | Comprehensive; signed; retries with backoff | Annual versions; 12-month deprecation |
| **Twilio** | SMS/Voice | Good SDKs; well-documented | Per-account concurrency | Webhook-first design; status callbacks | Stable; long deprecation cycles |
| **SendGrid** | Email | Good SDKs; supports batch | Plan-tier based | Event webhooks for delivery, opens, clicks | Stable |
| **AWS (S3/SQS/SNS)** | Cloud infra | Official SDKs; auto-retry built in | Service-specific; generous | SNS for notifications; EventBridge for events | Backwards-compatible; never removes APIs |
| **Auth0** | Authentication | Good SDKs; Management + Auth APIs | Rate limits by plan and endpoint | Hooks and Actions (server-side); Log Streams | Stable |
| **OpenAI** | AI/ML | SDKs in Python/Node; evolving rapidly | Tokens/min + requests/min by model | No webhooks; polling for async jobs | Rapidly evolving; frequent breaking changes |
| **Salesforce** | CRM | Heavy SDK; SOAP and REST APIs | API call limits per 24-hour window | Outbound Messages; Platform Events | Versioned; long support cycles |

### SDK vs. REST Decision by Vendor

**Use the SDK:** Stripe (handles idempotency keys, pagination, webhook verification),
AWS (handles SigV4 signing, retry, pagination), Auth0 (handles token management, JWKS caching).

**Consider direct HTTP:** Simple REST APIs with API key auth (SendGrid for basic sends),
vendors with outdated/unmaintained SDKs, serverless functions where cold start matters,
GraphQL APIs where the SDK adds no value over a generic GraphQL client.

### API Gateway for External Calls

Some architectures route all outbound third-party calls through an API gateway or proxy:

- **Benefits:** Centralized logging, rate limiting, circuit breaking, credential injection,
  and audit trail. Single place to enforce timeout policies.
- **Costs:** Additional network hop (latency), single point of failure, operational complexity.
- **When it makes sense:** Regulated industries (finance, healthcare) where all external
  data flow must be audited. Systems with 10+ integrations where per-adapter resilience
  configuration is unsustainable.

---

## Decision Tree

```
START: You need to integrate with a third-party service.

Q1: Is this a prototype/MVP or a production system?
  -> Prototype/MVP: Call the vendor SDK/API directly. No adapter.
     Skip to: "Add error handling and timeouts."
  -> Production: Continue.

Q2: Will you realistically use more than one vendor for this capability?
  -> Yes (e.g., payment in multiple regions): Build adapter + ACL.
  -> No, but switching is possible in 2+ years: Build a thin adapter.
     Interface matches your domain. One implementation. Easy to add a second later.
  -> No, and the vendor IS the product: Call the vendor SDK directly.
     No adapter. Vendor types in your service layer are acceptable.

Q3: Does the vendor's data model conflict with your domain model?
  -> Yes (different entity shapes, terminology, lifecycle): Build an ACL.
     Translate at the boundary. Domain never sees vendor types.
  -> No (vendor model aligns with your domain): Adapter is sufficient.
     Translation is minimal (type conversion, error mapping).

Q4: Is the vendor call in a critical user-facing path?
  -> Yes (checkout, login, real-time messaging):
     Add circuit breaker + retry with backoff + aggressive timeout.
     Add fallback behavior (cached response, graceful degradation).
  -> No (batch processing, async analytics):
     Add retry with backoff + timeout. Circuit breaker optional.

Q5: Does the vendor push events to you (webhooks)?
  -> Yes: Implement signature verification + idempotency + async processing.
  -> No, but you need real-time updates: Implement polling with backoff.
  -> No, and batch freshness is fine: Scheduled sync job.

Q6: SDK or direct HTTP?
  -> SDK if: well-maintained, handles auth/pagination/versioning, your adapter wraps it.
  -> HTTP if: SDK unavailable/bloated, you use <5 endpoints, cold start matters.
```

---

## Implementation Sketch

### Adapter Interface (Domain Layer)

```typescript
// domain/ports/PaymentGateway.ts
// This interface is defined by YOUR domain, not by Stripe.

interface PaymentGateway {
  charge(params: ChargeParams): Promise<ChargeResult>;
  refund(paymentId: PaymentId, amount: Money): Promise<RefundResult>;
  getPaymentStatus(paymentId: PaymentId): Promise<PaymentStatus>;
}

interface ChargeParams {
  orderId: OrderId;           // YOUR domain's order identifier
  amount: Money;              // YOUR domain's money type (amount + currency)
  method: PaymentMethodRef;   // YOUR domain's reference to a stored payment method
  idempotencyKey: string;     // Caller-generated, prevents double charges
  metadata?: Record<string, string>;
}

interface ChargeResult {
  paymentId: PaymentId;       // YOUR domain's payment identifier
  status: PaymentStatus;      // YOUR enum: SUCCEEDED | PENDING | FAILED
  failureReason?: PaymentFailureReason; // YOUR enum: DECLINED | INSUFFICIENT_FUNDS | ...
}

// Note: no Stripe types, no stripe-specific fields, no vendor terminology.
```

### Concrete Stripe Adapter (Infrastructure Layer)

```typescript
// infrastructure/payment/StripePaymentGateway.ts

class StripePaymentGateway implements PaymentGateway {
  private stripe: Stripe;

  constructor(apiKey: string, apiVersion: string = '2024-11-20') {
    this.stripe = new Stripe(apiKey, { apiVersion, timeout: 10_000 });
  }

  async charge(params: ChargeParams): Promise<ChargeResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: params.amount.toSmallestUnit(),  // $10.50 -> 1050 cents
          currency: params.amount.currency.toLowerCase(),
          payment_method: params.method.vendorRef,
          confirm: true,
          metadata: { order_id: params.orderId.toString(), ...params.metadata },
        },
        { idempotencyKey: params.idempotencyKey }
      );
      return {
        paymentId: PaymentId.from(intent.id),
        status: this.mapStatus(intent.status),
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        return {
          paymentId: PaymentId.generate(),
          status: PaymentStatus.FAILED,
          failureReason: this.mapDeclineCode(error.decline_code),
        };
      }
      if (error instanceof Stripe.errors.StripeRateLimitError) {
        throw new ServiceTemporarilyUnavailable('Payment service rate limited');
      }
      throw new PaymentServiceError('Unexpected payment error', { cause: error });
    }
  }

  // Maps Stripe status strings to domain PaymentStatus enum
  private mapStatus(s: string): PaymentStatus {
    if (s === 'succeeded') return PaymentStatus.SUCCEEDED;
    if (s === 'processing' || s === 'requires_action') return PaymentStatus.PENDING;
    return PaymentStatus.FAILED;
  }

  // Maps Stripe decline codes to domain PaymentFailureReason enum
  private mapDeclineCode(code?: string): PaymentFailureReason {
    if (code === 'insufficient_funds') return PaymentFailureReason.INSUFFICIENT_FUNDS;
    if (code === 'lost_card' || code === 'stolen_card') return PaymentFailureReason.CARD_INVALID;
    if (code === 'expired_card') return PaymentFailureReason.CARD_EXPIRED;
    return PaymentFailureReason.DECLINED;
  }
}
```

### Fallback Provider Pattern

```typescript
// infrastructure/payment/FallbackPaymentGateway.ts

class FallbackPaymentGateway implements PaymentGateway {
  constructor(
    private primary: PaymentGateway,
    private fallback: PaymentGateway,
    private circuitBreaker: CircuitBreaker,
    private logger: Logger
  ) {}

  async charge(params: ChargeParams): Promise<ChargeResult> {
    try {
      return await this.circuitBreaker.execute(() => this.primary.charge(params));
    } catch (error) {
      if (error instanceof ServiceTemporarilyUnavailable ||
          error instanceof CircuitBreakerOpen ||
          error instanceof TimeoutError) {
        this.logger.warn('Primary gateway failed, falling back', { orderId: params.orderId });
        return this.fallback.charge(params);
      }
      throw error;  // Terminal errors (card declined) are not retried on fallback
    }
  }
}

// Composition at bootstrap -- CheckoutService has no idea which vendor is behind the interface
const paymentGateway = new FallbackPaymentGateway(
  new StripePaymentGateway(config.stripeKey),
  new BraintreePaymentGateway(config.braintreeKey),
  new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30_000 }),
  logger
);
const checkoutService = new CheckoutService(paymentGateway, orderRepo);
```

### Webhook Handler with Idempotency

```typescript
// infrastructure/webhooks/StripeWebhookHandler.ts

class StripeWebhookHandler {
  constructor(
    private webhookSecret: string,
    private eventStore: ProcessedEventStore,  // Redis or DB
    private eventQueue: EventQueue,           // SQS, RabbitMQ, etc.
  ) {}

  async handle(rawBody: Buffer, signatureHeader: string): Promise<void> {
    // 1. Verify signature (timing-safe comparison via Stripe SDK)
    const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);

    // 2. Idempotency check -- skip already-processed events
    if (await this.eventStore.hasBeenProcessed(event.id)) return;

    // 3. Enqueue for async processing, ACK fast to Stripe
    await this.eventQueue.enqueue({ eventId: event.id, type: event.type, data: event.data.object });
    await this.eventStore.markReceived(event.id);
  }
}
```

---

## Cross-References

- **[hexagonal-clean-architecture](../patterns/hexagonal-clean-architecture.md)** --
  Third-party adapters are the canonical example of driven adapters (secondary ports) in
  hexagonal architecture. The payment gateway port is a driven port; the Stripe adapter is
  a driven adapter. If you are building a system with hexagonal architecture, third-party
  integrations are where the pattern pays its biggest dividends.

- **[coupling-and-cohesion](../foundations/coupling-and-cohesion.md)** -- Third-party
  integrations without adapter layers create stamp coupling (your domain shares data
  structures with the vendor) and content coupling (your domain depends on the vendor's
  internal model). The adapter pattern converts this to data coupling (your domain
  communicates with the adapter through well-defined domain parameters).

- **circuit-breaker-bulkhead** -- The circuit breaker and bulkhead patterns are essential
  for any third-party integration in a critical path. Circuit breakers prevent vendor
  outages from cascading. Bulkheads isolate vendor failures so that a Stripe outage does
  not consume the thread pool needed for serving cached content.

- **api-design-rest** -- When your system itself exposes APIs that wrap third-party
  capabilities (e.g., a unified payments API), the API design principles for REST apply.
  Your API should expose your domain model, not the vendor's model.

- **webhooks-and-callbacks** -- Webhook handling is a deep topic on its own: signature
  verification, idempotency, ordering, dead-letter queues, and replay mechanisms. The
  webhook section in this module covers the third-party integration perspective; the
  dedicated module covers the full architectural pattern.
