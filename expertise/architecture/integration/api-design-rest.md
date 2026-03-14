# API Design — REST — Architecture Expertise Module

> REST (Representational State Transfer) is the dominant API paradigm for web services. A well-designed REST API is intuitive, consistent, and evolvable. REST is the right default for public APIs and most internal APIs — but it has real limitations for complex queries, real-time data, and high-performance internal communication. Knowing when REST is the wrong tool matters as much as knowing how to design a good one.

> **Category:** Integration
> **Complexity:** Moderate
> **Applies when:** Building HTTP APIs for web/mobile clients, public APIs, or internal service-to-service communication where simplicity, cacheability, and broad tooling support are valued

---

## What This Is (and What It Isn't)

### The Core Idea

REST was defined by Roy Fielding in his 2000 doctoral dissertation as an architectural style for distributed hypermedia systems. It describes a set of constraints — client-server, stateless, cacheable, uniform interface, layered system, and (optionally) code-on-demand — that, when followed together, produce systems with desirable properties: scalability, simplicity, modifiability, and visibility.

In practice, "REST API" has come to mean "JSON over HTTP with resource-oriented URLs." This is Level 2 on the Richardson Maturity Model. True REST (Level 3, with HATEOAS) is rare in production systems. The industry overwhelmingly builds at Level 2, and this module reflects that reality while explaining why Level 3 exists and when it matters.

### The Richardson Maturity Model

Leonard Richardson proposed a four-level model that grades APIs by how fully they use HTTP and REST concepts:

**Level 0 — The Swamp of POX (Plain Old XML/JSON).** A single endpoint handles everything. Clients POST a blob describing what they want. The URL is a tunnel; HTTP is just a transport. Most SOAP services live here. Example: `POST /api` with a body like `{"action": "getUser", "id": 42}`.

**Level 1 — Resources.** Individual resources get their own URIs (`/users/42`, `/orders/101`), but the API still uses a single HTTP method (usually POST) for all operations. This is a common intermediate state in APIs migrating from RPC patterns.

**Level 2 — HTTP Verbs.** Resources have dedicated URIs and the API uses HTTP methods semantically: GET to read, POST to create, PUT/PATCH to update, DELETE to remove. Status codes carry meaning (201 Created, 404 Not Found, 409 Conflict). This is where the vast majority of production REST APIs operate. Stripe, GitHub, Twilio, and nearly every major public API lives here.

**Level 3 — Hypermedia Controls (HATEOAS).** Responses include links that tell the client what actions are available next. A payment resource might include links to `cancel`, `refund`, or `capture`. The client discovers capabilities at runtime rather than hardcoding URL patterns. PayPal's API is one of the few major APIs that implements this level.

### What REST Is NOT

**Not "just HTTP endpoints."** Slapping JSON responses onto HTTP routes does not make an API RESTful. If your `GET /users` endpoint modifies state, or your `POST /getReport` endpoint is really a query, you have an RPC API wearing a REST costume.

**Not a protocol.** REST is an architectural style — a set of constraints. HTTP is a protocol. REST uses HTTP, but HTTP usage does not imply REST. SOAP also uses HTTP; nobody calls SOAP RESTful.

**Not a specification.** There is no formal REST spec the way there is an OpenAPI spec or a GraphQL spec. This is both a strength (flexibility) and a weakness (inconsistency). Every team interprets REST slightly differently, which is why conventions and style guides matter enormously.

**Not inherently the best choice for every API.** REST optimizes for simplicity, cacheability, and broad client compatibility. It does not optimize for query flexibility (GraphQL does), transport efficiency (gRPC does), or real-time bidirectional communication (WebSockets do).

### HATEOAS — The Theory vs. The Practice

HATEOAS (Hypermedia as the Engine of Application State) is the most debated aspect of REST. In theory, it enables truly decoupled clients: the server's responses contain all the links a client needs to navigate the API, so clients never hardcode URLs beyond the entry point. If the server changes a URL, clients follow the new links automatically.

**Why it mostly failed in practice:**

- **Clients need semantics, not just links.** Knowing that a link exists at `rel="cancel"` doesn't tell a mobile app where to put the cancel button, what confirmation dialog to show, or how to handle the response. Real clients need deep knowledge of what operations mean, not just where they live.
- **Bloated responses.** Every response must carry navigation metadata. For high-volume APIs, this overhead adds up. A list of 100 orders, each with 5 hypermedia links, adds substantial payload for links that clients already know about.
- **Chatty interaction patterns.** Pure HATEOAS encourages clients to "discover" the API by following links, which can create unnecessary round-trips compared to clients that know the URL patterns upfront.
- **Industry verdict.** The overwhelming majority of successful public APIs — Stripe, GitHub, Twilio, Shopify — operate at Level 2 without HATEOAS. The pragmatic industry consensus is that good documentation, SDKs, and OpenAPI specs solve the discoverability problem better than hypermedia links.

**When HATEOAS still has value:** Long-running workflow APIs where the available actions genuinely change based on state (e.g., an order that can be cancelled only before shipment). PayPal's API uses HATEOAS for payment workflows, and it works well there because the available transitions are the primary information clients need.

---

## When to Use It

### The Default Choice for Good Reasons

REST should be your starting point for any new API unless you have a specific reason to choose otherwise. The reasons are pragmatic, not dogmatic:

**Public APIs where developer experience matters.** REST's simplicity makes it accessible to any developer with `curl` and a browser. Every programming language has HTTP client libraries. No code generation, no schema compilation, no special tooling required. Stripe built arguably the best public API in the industry on REST, and their design is studied as a gold standard. Their core philosophy: APIs are products, and developers are customers.

**Web and mobile backends.** Browsers speak HTTP natively. Mobile SDKs wrap HTTP trivially. REST's request-response model maps cleanly to user interactions: tap a button, make a request, show the result. Caching with ETags and Cache-Control headers works out of the box for read-heavy mobile apps on spotty connections.

**CRUD-dominant applications.** When your domain maps naturally to resources with create/read/update/delete operations — users, orders, products, invoices — REST's resource-oriented model is a near-perfect fit. The mapping from domain objects to endpoints is intuitive and predictable.

**Systems requiring cacheability.** REST's stateless constraint and HTTP's built-in caching infrastructure (CDNs, browser caches, reverse proxies) make REST uniquely cacheable among API paradigms. A `GET /products/42` response can be cached at every layer of the stack. GraphQL queries are POST requests with unique bodies — caching them requires custom infrastructure.

**Brownfield integration.** Every API gateway, load balancer, monitoring tool, and security scanner understands HTTP/REST. Choosing REST means your entire infrastructure stack works without modification.

### Real-World Gold Standards

**Stripe's API** — Widely considered the best-designed REST API in the industry. Key principles that make it exceptional:
- *Predictable resource naming*: `/v1/customers`, `/v1/charges`, `/v1/subscriptions`. No surprises.
- *Idempotency keys*: Clients send an `Idempotency-Key` header so retries are safe. Critical for payment APIs where double-charging is catastrophic.
- *Expand parameter*: Instead of forcing N+1 requests to fetch related resources, Stripe lets clients request `?expand[]=customer` to inline related objects. Pragmatic solution to REST's over-fetching problem.
- *Versioned via date*: API versions are dates (`2023-10-16`), not integers. Each Stripe account is pinned to its creation-date version and can upgrade explicitly. This avoids the "v47" version sprawl problem.
- *Consistent error format*: Every error includes `type`, `code`, `message`, and `param` (the field that caused the error). Actionable, machine-readable, human-friendly.
- *Test mode*: A parallel sandbox environment with test API keys. Developers test without moving real money.
- *Every change reviewed*: An internal API Review Board reviews every API change for consistency and backward compatibility.

**GitHub's REST API (v3)** — Demonstrates REST at scale with thousands of endpoints. Uses Link headers for pagination, OAuth for authentication, and conditional requests with ETags. Their migration from v3 REST to v4 GraphQL illustrates both REST's strengths (simplicity, caching) and its limits (complex nested data queries across repositories, issues, pull requests, and comments).

**Twilio's API** — A communication API that proves REST works for non-CRUD domains. Sending an SMS is `POST /Messages` with a body. The resource metaphor extends naturally: a call is a resource, a conference is a resource, a participant is a sub-resource of a conference. Twilio's API also demonstrates excellent error design — every error has a unique code, a human message, and a link to documentation with resolution steps.

---

## When NOT to Use It

This section is intentionally as long as "When to Use It." Choosing the wrong API paradigm is a costly mistake, and REST's dominance means teams often default to it when they shouldn't.

### Complex Data Fetching with Deep Nesting — Use GraphQL

**The problem:** A mobile app needs to display a user's profile, their 5 most recent orders, the items in each order, and the reviews for each item. With REST, this requires either:
- Multiple requests: `GET /users/42` → `GET /users/42/orders?limit=5` → `GET /orders/{id}/items` (×5) → `GET /items/{id}/reviews` (×N). This is the N+1 problem, and it devastates mobile performance on high-latency connections.
- A bespoke endpoint: `GET /users/42/profile-with-orders-and-reviews`. This creates a one-off endpoint that couples the API to a specific client's screen layout. Do this enough times and your "REST" API becomes a collection of RPC endpoints.

**GraphQL solves this** by letting the client specify exactly what data it needs in a single request. The query describes the shape of the response. No over-fetching, no under-fetching, one round-trip.

**Real example:** GitHub moved their API from REST (v3) to GraphQL (v4) precisely because developer tool integrations needed to fetch deeply nested data (repository → branches → commits → statuses → check runs) and REST required too many round-trips.

### High-Performance Internal Service-to-Service — Use gRPC

**The problem:** Two backend services exchange thousands of messages per second. JSON serialization/deserialization is a measurable CPU cost. HTTP/1.1 request-response overhead adds latency. Schema enforcement is manual — a field gets renamed and nothing catches it until runtime.

**gRPC solves this** with Protocol Buffers (binary serialization, 5-10x smaller than JSON), HTTP/2 (multiplexed streams, header compression), and code-generated clients with compile-time type safety. Google uses gRPC internally for virtually all service-to-service communication.

**When specifically:** Latency-sensitive internal calls, polyglot microservice environments (gRPC generates clients for 10+ languages from one `.proto` file), streaming data between services.

### Real-Time Bidirectional Communication — Use WebSockets

**The problem:** A chat application, live dashboard, or collaborative editor needs the server to push updates to the client without polling. REST is request-response only — the client must poll, which means either stale data (long poll intervals) or wasted resources (short poll intervals).

**WebSockets solve this** with a persistent, bidirectional connection. The server pushes updates the instant they occur. No polling overhead, no stale data.

**When specifically:** Chat, multiplayer games, live trading dashboards, collaborative editing, real-time notifications where latency matters.

### Batch Operations

**The problem:** A client needs to create 500 products, update 200 prices, and delete 50 discontinued items. With REST, that is 750 individual HTTP requests. Even with connection pooling and HTTP/2, the overhead is significant.

**Solutions:** Some REST APIs add batch endpoints (`POST /batch` with an array of operations), but this breaks the resource model. GraphQL handles batching more naturally through mutations. For bulk data operations, dedicated import/export endpoints or message queues are often better than any synchronous API.

### File Upload and Binary Data

REST's JSON-centric model handles binary data awkwardly. Multipart form uploads work but are painful to document and test. Base64-encoding files into JSON wastes 33% bandwidth. For file-heavy APIs, consider dedicated upload endpoints with streaming support, pre-signed URLs (S3-style), or tus protocol for resumable uploads.

---

## How It Works

### Resource Naming

Resource URLs are the most visible part of your API. Get them right and the API is intuitive. Get them wrong and developers will curse you for years.

**Rules that matter:**

1. **Use nouns, not verbs.** Resources are things: `/users`, `/orders`, `/products`. Not `/getUsers`, `/createOrder`, `/deleteProduct`. The HTTP method is the verb.

2. **Use plural nouns.** `/users/42`, not `/user/42`. The collection is `/users`; a single item is `/users/42`. Mixing plurals and singulars creates confusion about which endpoints exist.

3. **Nest for clear ownership.** `/users/42/orders` — orders belonging to user 42. But limit nesting depth to 2-3 levels. `/users/42/orders/101/items/7/reviews/3` is too deep — flatten it to `/reviews/3` if reviews have their own identity.

4. **Use kebab-case.** `/user-profiles`, not `/userProfiles` or `/user_profiles`. URLs are case-insensitive by convention, and kebab-case is the most readable in a URL bar. (Note: query parameters typically use snake_case or camelCase depending on your language ecosystem.)

5. **Avoid actions in URLs — mostly.** Prefer `POST /orders/42/cancellation` (creating a cancellation resource) over `POST /orders/42/cancel`. But be pragmatic: if `POST /orders/42/cancel` is clearly more intuitive for your users, do that. Purity is not the goal; usability is.

### HTTP Methods — The Full Picture

| Method | Semantics | Idempotent | Safe | Request Body | Typical Response |
|--------|-----------|------------|------|-------------|-----------------|
| `GET` | Read a resource or collection | Yes | Yes | No | 200 + resource |
| `POST` | Create a resource, trigger an action | No | No | Yes | 201 + created resource + Location header |
| `PUT` | Replace a resource entirely | Yes | No | Yes | 200 + updated resource |
| `PATCH` | Partially update a resource | No* | No | Yes | 200 + updated resource |
| `DELETE` | Remove a resource | Yes | No | No | 204 No Content |
| `HEAD` | GET without the body (check existence) | Yes | Yes | No | 200 (headers only) |
| `OPTIONS` | Describe available methods (CORS preflight) | Yes | Yes | No | 200 + Allow header |

*PATCH is not inherently idempotent, but can be implemented idempotently with JSON Merge Patch (RFC 7386). JSON Patch (RFC 6902) operations like "add to array" are not idempotent.

**Idempotency matters.** An idempotent operation produces the same result regardless of how many times it's executed. This is critical for retry safety. If a network timeout occurs after `PUT /users/42` and the client retries, the result is the same. If a `POST /orders` times out and the client retries, you might create a duplicate order — which is why idempotency keys exist (see below).

### Status Codes — Use Them Correctly

Do not return 200 for everything. Status codes are part of your API's contract.

**Success codes:**
- `200 OK` — Request succeeded. Use for GET, PUT, PATCH responses.
- `201 Created` — Resource was created. Use for POST. Include a `Location` header pointing to the new resource.
- `202 Accepted` — Request accepted for async processing. The work hasn't completed yet. Include a URL to check status.
- `204 No Content` — Success, nothing to return. Use for DELETE.

**Client error codes:**
- `400 Bad Request` — Malformed request (invalid JSON, missing required field). The client's fault.
- `401 Unauthorized` — Not authenticated. The request lacks valid credentials. (The name is misleading — it means unauthenticated.)
- `403 Forbidden` — Authenticated but not authorized. You know who they are; they don't have permission.
- `404 Not Found` — Resource doesn't exist. Also use when a user shouldn't know the resource exists (security through obscurity).
- `409 Conflict` — State conflict (e.g., trying to create a user with an email that already exists).
- `422 Unprocessable Entity` — Request is syntactically valid but semantically wrong (e.g., "quantity: -5").
- `429 Too Many Requests` — Rate limit exceeded. Include `Retry-After` header.

**Server error codes:**
- `500 Internal Server Error` — Unhandled server failure. Never intentionally return this; it should only come from unhandled exceptions.
- `502 Bad Gateway` — Upstream service is down.
- `503 Service Unavailable` — Server is overloaded or in maintenance. Include `Retry-After` header.
- `504 Gateway Timeout` — Upstream service timed out.

### Pagination

Never return unbounded collections. A `GET /products` that returns 100,000 results will crash mobile clients and spike your database.

**Offset pagination** — `GET /products?offset=20&limit=10`. Simple, supports "jump to page N." But performance degrades badly at high offsets because the database must count and skip rows. With PostgreSQL, paginating to offset 900,000 in a million-row table is dramatically slower than offset 0. Also unstable: if a row is inserted or deleted between page fetches, items shift and clients see duplicates or miss items.

**Cursor pagination** — `GET /products?after=eyJpZCI6NDJ9&limit=10`. The cursor is an opaque token (often a base64-encoded primary key or timestamp). The server uses it to seek directly to the right position. Performance is constant regardless of how deep into the dataset you are — benchmarks show 17x speedup over offset pagination at 1 million rows in PostgreSQL. Stripe, Slack, Facebook, and Twitter all use cursor pagination.

**Keyset pagination** — A variant of cursor pagination where the cursor is a known field value (e.g., `?created_after=2024-01-15T00:00:00Z&limit=10`). Transparent and debuggable, but requires a unique, sequential sort key.

**Recommendation:** Use cursor pagination for any collection that might grow large. Use offset pagination only for small, stable datasets or admin UIs that genuinely need "jump to page" functionality. Always return pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6NDJ9"
  }
}
```

### Filtering, Sorting, and Field Selection

**Filtering:** Use query parameters. `GET /orders?status=shipped&customer_id=42`. For complex filters, consider a lightweight query syntax: `GET /products?price[gte]=10&price[lte]=100`. Avoid inventing your own query language — keep it simple or adopt an existing standard like OData or JSON:API filtering.

**Sorting:** `GET /products?sort=price` (ascending) or `GET /products?sort=-price` (descending, prefixed with minus). For multi-field sorting: `GET /products?sort=-created_at,name`.

**Field selection:** `GET /users/42?fields=id,name,email`. Reduces payload size for bandwidth-constrained clients. Stripe uses `expand[]` for the inverse: include related objects that would otherwise be just IDs.

### Versioning

APIs change. Versioning controls how changes reach clients. There are three mainstream strategies:

**URL versioning** — `GET /v1/users/42`. The most common approach. Used by Stripe, Twilio, Google, and most major APIs. Advantages: visible, cacheable (different versions are different cache keys), easy to route at the gateway level. Disadvantage: implies that the entire API is versioned as one unit, which can lead to large version jumps for small changes.

**Header versioning** — `GET /users/42` with `Api-Version: 2024-01-15` or `Accept: application/vnd.myapp.v2+json`. Keeps URLs clean. Follows REST principles more closely (the resource identity doesn't change; the representation does). Disadvantage: harder to test in a browser, invisible in server logs without custom configuration, less obvious for developers new to the API. GitHub uses this approach with the `X-GitHub-Api-Version` header.

**Date-based versioning** — Stripe's approach. Each API version is a date (`2023-10-16`). New accounts are pinned to the latest version. Existing accounts keep their version until they explicitly upgrade. Stripe maintains backward compatibility across all versions simultaneously using request/response transformers. This is operationally expensive but provides the best developer experience for a payments API where stability is paramount.

**Recommendation:** Use URL versioning (`/v1/`) for most APIs. It's the simplest, most visible, and best-supported approach. Reserve date-based versioning for APIs where stability is a top priority and you have the engineering resources to maintain multiple versions simultaneously.

### Authentication and Authorization

**API Keys** — Simplest approach. A long random string sent in a header (`Authorization: Bearer sk_live_...`) or query parameter. Appropriate for server-to-server APIs where the caller is a known service. Not appropriate for client-side use (keys can be extracted from mobile apps and browser code). Stripe uses publishable keys (safe for client-side, limited permissions) and secret keys (server-side only, full access).

**OAuth 2.0** — The standard for delegated authorization. A user grants a third-party app limited access to their account without sharing their password. Required when your API is consumed by third-party applications acting on behalf of users. GitHub, Google, and Slack APIs all use OAuth 2.0. Complex to implement correctly, but essential for platform APIs.

**JWT (JSON Web Tokens)** — Self-contained tokens that encode user identity and permissions. The server can validate them without a database lookup (stateless). Common for first-party mobile/web apps. Danger: JWTs cannot be revoked before expiration unless you add a revocation list, which partially defeats the stateless benefit. Use short-lived access tokens (15 minutes) with longer-lived refresh tokens.

**Recommendation:** Use API keys for simple server-to-server APIs. Use OAuth 2.0 for platform APIs consumed by third parties. Use JWTs for first-party applications. Never send credentials over plain HTTP — HTTPS only, always.

### Rate Limiting

Rate limiting protects your service from abuse and ensures fair usage. Essential for any public API.

**Headers to expose:**
```
X-RateLimit-Limit: 1000        # Requests allowed per window
X-RateLimit-Remaining: 847     # Requests remaining in current window
X-RateLimit-Reset: 1704067200  # Unix timestamp when the window resets
Retry-After: 30                # Seconds to wait (on 429 responses)
```

**Strategies:** Fixed window (simple but allows bursts at window boundaries), sliding window (smoother but more complex), token bucket (best for bursty traffic). Most API gateways implement these out of the box.

**Response when limited:**
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 30

{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "You have exceeded the limit of 1000 requests per hour. Try again in 30 seconds.",
  "instance": "/users/42/orders"
}
```

### Idempotency Keys

For non-idempotent operations (POST), clients should be able to safely retry without creating duplicates. The solution: idempotency keys.

The client generates a unique key (typically a UUID) and sends it with the request:
```
POST /v1/charges
Idempotency-Key: 8a3b1c2d-4e5f-6a7b-8c9d-0e1f2a3b4c5d
```

The server stores the key and the response. If the same key is sent again, the server returns the stored response without re-executing the operation. Stripe, PayPal, and most payment APIs require idempotency keys on POST requests.

**Implementation notes:** Store keys for 24-48 hours, then expire them. Return the original response (including the original status code) on retries. If the original request is still processing when a retry arrives, return `409 Conflict` to prevent race conditions.

### Error Format — RFC 9457 (formerly RFC 7807)

Standardize your error responses. RFC 9457 "Problem Details for HTTP APIs" defines a machine-readable format:

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account acc_123 has a balance of $10.00, but the charge requires $25.00.",
  "instance": "/v1/charges/ch_456",
  "balance": 1000,
  "required": 2500
}
```

**Fields:**
- `type` — URI identifying the error type. Should link to documentation.
- `title` — Human-readable summary. Same for all instances of this error type.
- `status` — HTTP status code (repeated for convenience when the body is processed outside the HTTP context).
- `detail` — Human-readable explanation specific to this occurrence. Focus on what the client can do to fix it.
- `instance` — URI identifying this specific occurrence (useful for support tickets and log correlation).

**Extension fields** (like `balance` and `required` above) carry machine-readable data that clients can act on programmatically. This is where RFC 9457 shines over ad-hoc error formats.

**Real-world patterns:** Stripe includes `type`, `code`, `message`, `param` (the specific field that caused the error), and a `doc_url` linking to documentation. Twilio includes an error code and a link to a page explaining the error and its resolution. Both approaches are excellent — the key is consistency and actionability.

### OpenAPI / Swagger

Document your API with the OpenAPI Specification (OAS). An OpenAPI document is a machine-readable description of your API's endpoints, request/response formats, authentication, and errors.

**Why it matters:**
- Auto-generated client SDKs in any language (via openapi-generator)
- Interactive documentation (Swagger UI, Redocly)
- Request validation middleware (enforce the spec at runtime)
- Contract testing (ensure implementation matches the spec)
- API gateway configuration (import the spec to configure routing and validation)

**Design-first vs. code-first:** Design-first (write the OpenAPI spec, then implement) produces better APIs because it forces you to think about the interface before the implementation. Code-first (generate the spec from code annotations) is faster but tends to leak implementation details into the API. For public APIs, always design-first.

---

## Trade-Offs Matrix

| Dimension | REST | GraphQL | gRPC | WebSockets |
|-----------|------|---------|------|------------|
| **Learning curve** | Low — HTTP + JSON are universal | Medium — query language, schema, resolvers | High — protobuf, HTTP/2, code generation | Medium — connection management, reconnection |
| **Client coupling** | Low — any HTTP client works | Medium — requires GraphQL client library | High — requires generated stubs | Medium — requires WebSocket client |
| **Cacheability** | Excellent — HTTP caching works natively | Poor — POST requests with unique bodies | Poor — binary protocol, custom caching needed | N/A — persistent connections |
| **Payload efficiency** | Medium — JSON is verbose, full resources returned | Good — client requests exactly what it needs | Excellent — binary protobuf, 5-10x smaller | Varies — typically JSON, but flexible |
| **Type safety** | Weak — JSON has no schema enforcement at transport | Strong — schema with introspection | Strong — compile-time type checking from proto | None — application-level concern |
| **Tooling ecosystem** | Massive — every tool understands HTTP/REST | Growing — Apollo, Relay, GraphiQL | Moderate — official libraries for 10+ languages | Moderate — Socket.IO, ws, native browser API |
| **Real-time support** | Polling or SSE (unidirectional) | Subscriptions (via WebSockets under the hood) | Server streaming, bidirectional streaming | Native bidirectional real-time |
| **Browser support** | Native — fetch/XMLHttpRequest | Via HTTP POST — works in browsers | Limited — grpc-web requires a proxy | Native — WebSocket API |
| **Observability** | Excellent — standard HTTP access logs, status codes | Challenging — all requests are POST 200 | Moderate — binary inspection requires tooling | Challenging — persistent connections, custom metrics |
| **Versioning** | Well-understood patterns (URL, header, date) | Schema evolution (deprecate fields, add new ones) | Proto file versioning with backward compatibility | Application-level concern |
| **Error handling** | Standardized (HTTP status codes + RFC 9457) | Always 200, errors in response body | Status codes in gRPC protocol | Application-level concern |

---

## Evolution Path

### Backward Compatibility Rules

An API is a contract. Breaking changes destroy trust and create integration failures. These changes are **backward compatible** (safe):

- Adding a new endpoint
- Adding a new optional field to a request
- Adding a new field to a response
- Adding a new query parameter
- Adding a new enum value (if clients handle unknown values gracefully)
- Adding a new HTTP method to an existing resource

These changes are **breaking** (require a new version):

- Removing or renaming a field
- Changing a field's type (string → integer)
- Changing a field from optional to required
- Removing an endpoint
- Changing the URL structure
- Changing authentication requirements
- Changing the meaning of a status code or error code

### Deprecation Strategy

1. **Announce deprecation.** Add `Deprecation: true` and `Sunset: Sat, 01 Mar 2025 00:00:00 GMT` headers (RFC 8594). Update documentation. Send emails to API consumers.
2. **Migration period.** Give clients 6-12 months minimum. For payment APIs, 18-24 months. Provide a migration guide with before/after examples.
3. **Monitor usage.** Track which clients still use deprecated endpoints. Reach out directly to high-volume consumers.
4. **Soft shutdown.** Return `299 Deprecated` warning headers for 1-2 months before removal.
5. **Hard shutdown.** Return `410 Gone` with a body explaining the replacement endpoint.

### Evolution Without Versioning

Sometimes you can evolve an API without creating a new version:

- **Additive changes.** New fields, new endpoints — these never break existing clients if clients ignore unknown fields (Postel's Law: be liberal in what you accept).
- **Stripe's approach.** Stripe maintains a single codebase that serves all API versions simultaneously. Incoming requests are transformed to the latest internal format, processed, then the response is transformed back to the client's pinned version. This is expensive to maintain but eliminates the "which version do I use?" question for developers.
- **Feature flags.** Use request headers or account settings to opt into new behavior without changing the URL version.

---

## Failure Modes

These are the ways REST API designs fail in production. Each is common and avoidable.

### Chatty APIs (N+1 Problem)

**What happens:** A client needs data from multiple related resources and must make separate requests for each. Displaying an order with 10 line items requires 1 + 10 requests (the order + each item). On mobile over a 200ms-latency connection, that's 2+ seconds of network time alone.

**Why it happens:** Rigid adherence to "one resource per endpoint" without providing mechanisms to fetch related data efficiently.

**How to avoid it:** Provide `expand` or `include` parameters (`GET /orders/42?expand=items,customer`). Support compound documents. Consider GraphQL if your domain is deeply relational and clients have diverse data needs.

### Missing Pagination

**What happens:** An endpoint returns all results. It works in development with 50 records. In production with 500,000 records, it times out, OOMs the server, or crashes the client.

**Why it happens:** "We'll add pagination later." Later never comes until production is on fire.

**How to avoid it:** Every collection endpoint gets pagination from day one. Default to 20-50 items per page. Set a maximum page size (e.g., 100). Return `has_more` or total count metadata.

### Breaking Changes Without Versioning

**What happens:** A field is renamed from `userName` to `user_name`. Every client breaks. A field type changes from string to integer. Every client's JSON parser throws. An endpoint is removed. Every client that called it gets 404s.

**Why it happens:** No versioning strategy, no backward compatibility policy, no API review process.

**How to avoid it:** Establish a "no breaking changes without a version bump" policy. Add API change review to your development process. Stripe's API Review Board reviews every API change — adopt a similar practice scaled to your team size.

### Inconsistent Naming and Structure

**What happens:** One endpoint returns `createdAt`, another returns `created_at`, a third returns `creation_date`. One endpoint wraps results in `{"data": [...]}`, another returns a bare array. One endpoint uses `user_id`, another uses `userId`, a third uses `owner`.

**Why it happens:** Multiple developers build endpoints independently without a shared style guide.

**How to avoid it:** Create and enforce an API style guide. Pick one naming convention (snake_case is most common for JSON APIs) and one envelope format. Use linting tools (Spectral for OpenAPI specs) to enforce consistency automatically.

### Misusing HTTP Methods

**What happens:** `GET /users/42/delete` deletes a user. `POST /search` performs a read-only search. `PUT /users` creates a new user.

**Why it happens:** Developers unfamiliar with REST conventions, or a codebase that evolved from an RPC-style API.

**How to avoid it:** `GET` is safe and idempotent — never modify state. `POST` creates. `PUT` replaces. `PATCH` partially updates. `DELETE` removes. No exceptions. Code review for HTTP method correctness.

### Exposing Internal Implementation

**What happens:** API responses include database column names (`usr_nm`), auto-increment IDs (sequential, guessable), internal error stack traces, or ORM-specific field names.

**Why it happens:** The API layer is too thin — it serializes database rows directly to JSON without a presentation layer.

**How to avoid it:** Use response DTOs (Data Transfer Objects) or serializers that explicitly define what fields are exposed. Use UUIDs or prefixed IDs (`usr_abc123`) instead of sequential integers. Never expose stack traces in production — log them server-side and return a correlation ID.

### Ignoring Partial Failures in Distributed Systems

**What happens:** `POST /orders` creates an order in the database but fails to send the confirmation email. The API returns 500 even though the order was created. The client retries and creates a duplicate order.

**Why it happens:** Treating multi-step operations as atomic when they aren't.

**How to avoid it:** Use idempotency keys for non-idempotent operations. Separate the core operation from side effects (create the order synchronously, send the email asynchronously via a queue). Return 201 for partial success with a status indicating which side effects are pending.

---

## Technology Landscape

### Frameworks

| Framework | Language | Strengths | Best For |
|-----------|----------|-----------|----------|
| **Express** | Node.js | Minimal, flexible, massive ecosystem | Small-to-medium APIs, prototypes |
| **Fastify** | Node.js | 2-3x faster than Express, schema validation built-in | Performance-sensitive Node.js APIs |
| **NestJS** | TypeScript | Opinionated, modular, decorator-based, OpenAPI generation | Enterprise TypeScript APIs |
| **FastAPI** | Python | Async, auto-generated OpenAPI docs, type hints as validation | Python APIs, ML model serving |
| **Django REST Framework** | Python | Batteries-included, ORM integration, browsable API | Data-heavy Python applications |
| **Spring Boot** | Java/Kotlin | Enterprise-grade, massive ecosystem, Spring Security | Enterprise Java APIs |
| **ASP.NET Core** | C# | High performance, minimal API syntax, built-in OpenAPI | .NET ecosystem APIs |
| **Gin** | Go | Extremely fast, minimal memory footprint | High-performance Go APIs |
| **Phoenix** | Elixir | Real-time capabilities, fault-tolerant (BEAM VM) | APIs needing real-time features |
| **Rails API** | Ruby | Convention over configuration, rapid development | Rapid prototyping, startups |

### API Gateways

**Kong** — Open-source, Lua/Nginx-based. Plugin ecosystem for auth, rate limiting, transformations. Dominant in the open-source gateway space.

**AWS API Gateway** — Managed service. Integrates with Lambda, IAM, Cognito. Best for AWS-native architectures.

**Apigee (Google)** — Enterprise API management. Analytics, monetization, developer portal. Expensive but comprehensive.

**Envoy** — High-performance proxy built for service mesh. Used as a data plane in Istio. Not a traditional API gateway but increasingly used as one.

### Documentation Tools

**Swagger UI / Redocly** — Render OpenAPI specs as interactive documentation. Redocly produces more polished output. Both support "try it out" functionality.

**Postman** — API development platform with documentation, testing, and collaboration features. Collections can serve as living documentation.

**ReadMe** — Developer hub platform. Integrates OpenAPI specs with guides, changelogs, and API key management.

### Testing Tools

**Postman/Newman** — Manual and automated API testing. Newman runs Postman collections in CI/CD.

**REST Assured** — Java library for testing REST APIs. Fluent DSL: `given().auth().basic("user","pass").when().get("/users").then().statusCode(200)`.

**Dredd** — Tests API implementations against OpenAPI/API Blueprint specs. Catches spec drift automatically.

**Spectral** — OpenAPI linter. Enforces API style guide rules on your spec file. Catches inconsistencies before implementation.

---

## Decision Tree

Use this to choose the right API paradigm for your specific situation:

```
Is this a public API consumed by external developers?
├── Yes → REST (broadest compatibility, best tooling, lowest learning curve)
│         Consider: OpenAPI spec, SDKs, sandbox environment
│
└── No → Is this internal service-to-service communication?
    ├── Yes → Is latency/throughput critical (>1000 req/sec between services)?
    │   ├── Yes → gRPC (binary protocol, code-gen, HTTP/2 multiplexing)
    │   └── No → Do clients need flexible, deeply nested queries?
    │       ├── Yes → GraphQL (client-driven queries, single round-trip)
    │       └── No → REST (simplicity, universal tooling, easy debugging)
    │
    └── No → Is this for a web/mobile frontend?
        ├── Yes → Do different screens need very different data shapes?
        │   ├── Yes → GraphQL (avoid bespoke endpoints per screen)
        │   └── No → REST (simpler, cacheable, works everywhere)
        │       Does the app need real-time updates?
        │       ├── Yes → REST + WebSockets (REST for CRUD, WS for live updates)
        │       └── No → REST
        │
        └── Is this for IoT or embedded devices?
            ├── Yes → gRPC or MQTT (binary efficiency, low bandwidth)
            └── No → REST (safe default for anything not listed above)
```

**The short version:** If you don't have a specific reason to choose something else, choose REST. If you have a specific problem REST handles poorly (complex queries, high-performance internal calls, real-time), choose the tool designed for that problem. Many production systems use multiple paradigms: REST for the public API, gRPC between internal services, WebSockets for real-time features.

---

## Implementation Sketch

### OpenAPI Specification (Design-First)

```yaml
openapi: 3.1.0
info:
  title: Order Service API
  version: "1.0"
  description: Manages customer orders
  contact:
    email: api-team@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api.staging.example.com/v1
    description: Staging

paths:
  /orders:
    get:
      summary: List orders
      operationId: listOrders
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, confirmed, shipped, delivered, cancelled]
        - name: customer_id
          in: query
          schema:
            type: string
        - name: after
          in: query
          description: Cursor for pagination
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        "200":
          description: List of orders
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Order"
                  pagination:
                    $ref: "#/components/schemas/Pagination"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "429":
          $ref: "#/components/responses/RateLimited"

    post:
      summary: Create an order
      operationId: createOrder
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateOrderRequest"
      responses:
        "201":
          description: Order created
          headers:
            Location:
              schema:
                type: string
              description: URL of the created order
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "422":
          $ref: "#/components/responses/ValidationError"

  /orders/{order_id}:
    get:
      summary: Retrieve an order
      operationId: getOrder
      parameters:
        - name: order_id
          in: path
          required: true
          schema:
            type: string
        - name: expand
          in: query
          description: Related resources to include
          schema:
            type: array
            items:
              type: string
              enum: [customer, items, items.product]
      responses:
        "200":
          description: Order details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "404":
          $ref: "#/components/responses/NotFound"

components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
          example: "ord_abc123"
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered, cancelled]
        customer_id:
          type: string
        total_amount:
          type: integer
          description: Amount in cents
        currency:
          type: string
          example: "usd"
        items:
          type: array
          items:
            $ref: "#/components/schemas/OrderItem"
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    OrderItem:
      type: object
      properties:
        id:
          type: string
        product_id:
          type: string
        quantity:
          type: integer
        unit_price:
          type: integer
          description: Price in cents

    CreateOrderRequest:
      type: object
      required: [customer_id, items]
      properties:
        customer_id:
          type: string
        items:
          type: array
          minItems: 1
          items:
            type: object
            required: [product_id, quantity]
            properties:
              product_id:
                type: string
              quantity:
                type: integer
                minimum: 1

    Pagination:
      type: object
      properties:
        has_more:
          type: boolean
        next_cursor:
          type: string
          nullable: true

    ProblemDetail:
      type: object
      properties:
        type:
          type: string
          format: uri
        title:
          type: string
        status:
          type: integer
        detail:
          type: string
        instance:
          type: string

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    ValidationError:
      description: Request validation failed
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: API key prefixed with sk_live_ or sk_test_

security:
  - BearerAuth: []
```

### Request/Response Examples

**Creating an order:**
```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer sk_live_abc123
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "customer_id": "cus_xyz789",
  "items": [
    {"product_id": "prod_001", "quantity": 2},
    {"product_id": "prod_042", "quantity": 1}
  ]
}
```

**Successful response:**
```http
HTTP/1.1 201 Created
Location: /v1/orders/ord_abc123
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999

{
  "id": "ord_abc123",
  "status": "pending",
  "customer_id": "cus_xyz789",
  "total_amount": 4500,
  "currency": "usd",
  "items": [
    {"id": "oli_001", "product_id": "prod_001", "quantity": 2, "unit_price": 1500},
    {"id": "oli_002", "product_id": "prod_042", "quantity": 1, "unit_price": 1500}
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Validation error:**
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The 'quantity' field must be a positive integer.",
  "instance": "/v1/orders",
  "errors": [
    {
      "field": "items[0].quantity",
      "code": "invalid_value",
      "message": "Must be greater than 0. Received: -1"
    }
  ]
}
```

**Paginated list:**
```http
GET /v1/orders?status=shipped&limit=2&after=eyJpZCI6Im9yZF8wNTAifQ HTTP/1.1
Authorization: Bearer sk_live_abc123
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {"id": "ord_051", "status": "shipped", "total_amount": 3200, "...": "..."},
    {"id": "ord_052", "status": "shipped", "total_amount": 7800, "...": "..."}
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6Im9yZF8wNTIifQ"
  }
}
```

---

## API Design Checklist

Use this checklist before launching any REST API:

- [ ] Every resource uses plural nouns (`/users`, not `/user`)
- [ ] HTTP methods match semantics (GET reads, POST creates, PUT replaces, PATCH updates, DELETE removes)
- [ ] Status codes are correct (201 for creation, 204 for deletion, 404 for missing, 422 for validation)
- [ ] Every collection endpoint is paginated with a maximum page size
- [ ] Error responses follow a consistent format (preferably RFC 9457)
- [ ] Error messages tell the client how to fix the problem
- [ ] Authentication is required and uses HTTPS exclusively
- [ ] Rate limiting is implemented with appropriate headers
- [ ] POST endpoints accept idempotency keys
- [ ] Field naming is consistent across all endpoints (pick one: snake_case or camelCase)
- [ ] Response envelopes are consistent (`{"data": ...}` everywhere or nowhere)
- [ ] Dates use ISO 8601 format (`2024-01-15T10:30:00Z`)
- [ ] Monetary amounts use smallest currency unit (cents, not dollars) to avoid floating-point issues
- [ ] API is versioned from day one
- [ ] OpenAPI spec exists and is kept in sync with implementation
- [ ] No internal implementation details leak (no DB column names, no stack traces, no sequential IDs)

---

## Cross-References

- **[api-design-graphql](../integration/api-design-graphql.md)** — When REST's resource model doesn't fit and clients need flexible queries
- **[api-design-grpc](../integration/api-design-grpc.md)** — When binary efficiency and type safety matter more than simplicity
- **[websockets-realtime](../integration/websockets-realtime.md)** — When you need server-to-client push or bidirectional communication
- **[webhooks-and-callbacks](../integration/webhooks-and-callbacks.md)** — When the server needs to notify external systems of events
- **[microservices](../patterns/microservices.md)** — REST is often the inter-service protocol; understanding both patterns together is essential
