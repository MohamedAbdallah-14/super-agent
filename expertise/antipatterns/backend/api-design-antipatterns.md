# API Design Anti-Patterns
> A catalog of structural, semantic, and operational mistakes in HTTP API design that cause outages, security breaches, developer churn, and integration nightmares. Each entry is grounded in production incidents and post-mortems, not theoretical complaints.
> **Domain:** Backend
> **Anti-patterns covered:** 21
> **Highest severity:** Critical

---

## Table of Contents
1. [AP-01: Chatty API](#ap-01-chatty-api)
2. [AP-02: God Endpoint](#ap-02-god-endpoint)
3. [AP-03: Ignoring HTTP Semantics](#ap-03-ignoring-http-semantics)
4. [AP-04: Breaking Changes Without Versioning](#ap-04-breaking-changes-without-versioning)
5. [AP-05: Inconsistent Naming Conventions](#ap-05-inconsistent-naming-conventions)
6. [AP-06: Exposing Internal Implementation Details](#ap-06-exposing-internal-implementation-details)
7. [AP-07: Missing Pagination](#ap-07-missing-pagination)
8. [AP-08: Over-Fetching and Under-Fetching](#ap-08-over-fetching-and-under-fetching)
9. [AP-09: Misusing HTTP Status Codes](#ap-09-misusing-http-status-codes)
10. [AP-10: Ignoring Idempotency](#ap-10-ignoring-idempotency)
11. [AP-11: Missing Rate Limiting](#ap-11-missing-rate-limiting)
12. [AP-12: Authentication in Query Parameters](#ap-12-authentication-in-query-parameters)
13. [AP-13: Inconsistent Response Shapes](#ap-13-inconsistent-response-shapes)
14. [AP-14: Nested Resource Hell](#ap-14-nested-resource-hell)
15. [AP-15: Ignoring HATEOAS When It Matters](#ap-15-ignoring-hateoas-when-it-matters)
16. [AP-16: Stringly-Typed Everything](#ap-16-stringly-typed-everything)
17. [AP-17: Missing Request Validation](#ap-17-missing-request-validation)
18. [AP-18: Synchronous Long-Running Operations](#ap-18-synchronous-long-running-operations)
19. [AP-19: Leaking PII in URLs and Logs](#ap-19-leaking-pii-in-urls-and-logs)
20. [AP-20: Undocumented Error Responses](#ap-20-undocumented-error-responses)
21. [AP-21: Coupling Client to Server Implementation](#ap-21-coupling-client-to-server-implementation)
22. [Root Cause Analysis](#root-cause-analysis)
23. [Self-Check Questions](#self-check-questions)
24. [Code Smell Quick Reference](#code-smell-quick-reference)

---

### AP-01: Chatty API

**Also known as:** Death by a Thousand Requests, N+1 API, Micro-Endpoint Syndrome
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

A client needs to render a single page but must make 15+ sequential API calls because every piece of data lives behind its own endpoint.

```
GET /users/42                    -> { name, email, avatarUrl }
GET /users/42/preferences        -> { theme, locale }
GET /users/42/subscription       -> { plan, expiresAt }
GET /users/42/notifications      -> [ ... ]
GET /users/42/recent-activity    -> [ ... ]
GET /users/42/team               -> { teamId, role }
GET /teams/7/members             -> [ ... ]
GET /teams/7/plan                -> { ... }
```

This is the classic GraphQL N+1 problem applied to REST. Shopify engineering documented how their GraphQL layer suffered from this pattern: a single query for musicians and their albums would generate 1 query for n musicians plus n additional queries to fetch albums, totaling n+1 database round trips. At 25 items, that is 26 requests per render.

**Why developers do it:**

- Each microservice owns one resource, so each gets one endpoint.
- "Small endpoints are easier to test."
- Premature decomposition: the team splits resources before understanding access patterns.

**What goes wrong:**

- Latency compounds: 15 sequential requests at 50ms each = 750ms minimum, before any rendering.
- Mobile clients on high-latency networks suffer disproportionately.
- Backend load multiplies: one page view becomes 15 database queries.
- Frontend teams build complex orchestration layers that are fragile and hard to debug.

**The fix:**

- Provide composite endpoints for known access patterns: `GET /users/42/dashboard` returns everything the dashboard needs.
- Use field selection (`?fields=name,email,subscription`) to let clients control payload scope.
- Consider BFF (Backend for Frontend) services that aggregate calls server-side.
- If using GraphQL, implement DataLoaders to batch N+1 queries into a single batched database call.

**Detection rule:**

Flag any client workflow that makes more than 3 sequential API calls to render a single view. Monitor for endpoints consistently called together in a fixed sequence.

---

### AP-02: God Endpoint

**Also known as:** Kitchen Sink Endpoint, Do-Everything RPC, Swiss Army Endpoint
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

A single endpoint that handles dozens of operations through query parameters or request body flags.

```
POST /api/execute
{
  "action": "createUser",
  "params": { "name": "Alice" }
}

POST /api/execute
{
  "action": "deleteOrder",
  "params": { "orderId": 999 }
}

POST /api/execute
{
  "action": "generateReport",
  "params": { "type": "monthly", "includeCharts": true }
}
```

Or the parameter-flag variant:

```
GET /api/data?type=user&id=42&includeOrders=true&includeComments=true&includeProfile=true
```

**Why developers do it:**

- "One endpoint is simpler than managing dozens of routes."
- RPC habits carried into REST contexts.
- Convenience during early prototyping that becomes permanent.
- Fear of URL proliferation.

**What goes wrong:**

- Authorization becomes a nightmare: you need per-action permission checks inside one handler.
- Caching is impossible: every request to the same URL does something different.
- Documentation is unmanageable: one endpoint with 47 possible `action` values.
- Monitoring and alerting lose granularity: error rate on `/api/execute` tells you nothing about which operation failed.
- Rate limiting per operation becomes impossible without inspecting request bodies.

**The fix:**

- Decompose into resource-oriented endpoints: `POST /users`, `DELETE /orders/999`, `POST /reports`.
- Use HTTP methods to express intent (GET for reads, POST for creates, etc.).
- If you genuinely need RPC semantics (rare), use a proper RPC framework (gRPC, JSON-RPC) with schema-driven contracts, not a freeform POST body.

**Detection rule:**

Flag any endpoint that accepts an `action`, `method`, `operation`, or `type` parameter that changes the fundamental behavior of the request. Flag single endpoints receiving more than 5 distinct payload schemas.

---

### AP-03: Ignoring HTTP Semantics

**Also known as:** POST-for-Everything, GET with Side Effects, Method Abuse
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```
# Deleting via GET (crawlers and prefetch will trigger this)
GET /api/users/42/delete

# Creating via GET (browser link-checkers will create records)
GET /api/orders/create?product=widget&qty=5

# Reading via POST (breaks caching, bookmarking, and link sharing)
POST /api/search
{ "query": "shoes" }

# Modifying state with GET (web accelerators pre-fetch GET URLs)
GET /api/account/close?confirm=true
```

The OWASP Web Security Testing Guide explicitly warns about HTTP verb tampering, where attackers manipulate HTTP methods to bypass security controls, such as using PUT or DELETE when only GET access is intended.

**Why developers do it:**

- Many developers learn web development via HTML forms, which only support GET and POST.
- "GET is simpler; I just put everything in the query string."
- Lack of understanding that GET requests can be pre-fetched, cached, replayed by proxies, and triggered by link checkers.

**What goes wrong:**

- Google Web Accelerator (2005) pre-fetched GET URLs, triggering `GET /delete` endpoints and deleting real user data across hundreds of applications. This was one of the earliest large-scale demonstrations of why GET must be safe and idempotent.
- Web crawlers and link-checkers trigger state-changing GETs, creating or deleting resources.
- CDNs and browser caches serve stale responses for POST-based reads.
- CSRF attacks exploit GET-based mutations trivially (embed an `<img src="/api/transfer?amount=10000">` in an email).

**The fix:**

- GET and HEAD: read-only, safe, cacheable. Never mutate state.
- POST: create resources, trigger actions. Not idempotent by default.
- PUT: full replacement of a resource. Idempotent.
- PATCH: partial update. Not necessarily idempotent.
- DELETE: remove a resource. Idempotent.
- Return `405 Method Not Allowed` for unsupported methods on each endpoint with an `Allow` header listing valid methods.

**Detection rule:**

Static analysis: flag any GET handler that calls write/delete/update operations on a database or external service. Runtime: flag GET endpoints where the database transaction log shows write operations.

---

### AP-04: Breaking Changes Without Versioning

**Also known as:** YOLO Deployment, Implicit Contract Violation, The Silent Break
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

```
# Monday: API returns
{ "user_name": "alice", "email": "alice@example.com" }

# Wednesday: same endpoint, same URL
{ "username": "alice", "contactEmail": "alice@example.com", "name": { "first": "Alice", "last": "Smith" } }
```

No version bump. No deprecation notice. No migration guide. Every consumer breaks.

In one documented production incident, a team added a required field to what they considered a backward-compatible update. The "minor" schema change broke an enterprise client's entire payment processing pipeline. In another case, a team kept `/v1` alive "just for a few months" — two years later it was still serving a frightening amount of production traffic.

**Why developers do it:**

- "We only have one consumer and we control it."
- Versioning infrastructure feels like overhead when the team is small.
- Misunderstanding what constitutes a breaking change (renaming fields, changing types, removing optional fields, altering enum values).

**What goes wrong:**

- Hyrum's Law: "With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody." Consumers depend on field names, ordering, null behavior, and timing.
- Mobile apps cannot be force-updated — broken API responses crash apps in production for days.
- Partner integrations fail silently, corrupting data before anyone notices.
- Twitter's 2023 API changes broke hundreds of third-party apps with minimal warning. Bot accounts including accessibility tools like Alt Text Reader shut down. Elon Musk had to backtrack on the API paywall after widespread developer backlash.

**The fix:**

- Version from day one: URL-based (`/v1/users`) or header-based (`Accept: application/vnd.api.v2+json`).
- Additive-only changes within a version: new optional fields are fine, removing or renaming fields is a new version.
- Maintain a changelog and deprecation timeline. Communicate through multiple channels.
- Run contract tests (Pact, Specmatic) in CI that fail on breaking schema changes.
- Set sunset dates on old versions and enforce them with monitoring.

**Detection rule:**

CI/CD schema diff: compare OpenAPI/JSON Schema between current and previous release. Flag any removed field, renamed field, type change, or new required field as a breaking change requiring a version bump.

---

### AP-05: Inconsistent Naming Conventions

**Also known as:** Convention Roulette, Schizophrenic Schema, The Naming Jungle
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```json
{
  "user_name": "alice",
  "firstName": "Alice",
  "last-name": "Smith",
  "EmailAddress": "alice@example.com",
  "created_at": "2024-01-01",
  "updatedOn": "January 2, 2024",
  "isActive": true,
  "account_status": "ACTIVE"
}
```

Mixing `snake_case`, `camelCase`, `kebab-case`, and `PascalCase` in the same response. Date formats vary between ISO 8601, Unix timestamps, and human-readable strings. Boolean concepts represented as both booleans and string enums.

**Why developers do it:**

- Multiple developers or teams contribute endpoints without shared style guides.
- Backend language conventions leak into API surface (Python uses snake_case, Java uses camelCase).
- Copy-pasting from different documentation sources.
- No automated linting.

**What goes wrong:**

- Developer experience degrades: consumers must check documentation for every field name because nothing is predictable.
- SDK generation produces inconsistent code.
- Integrations contain typos and casing bugs that pass code review but fail at runtime.
- One API review of 300+ API designs found inconsistent naming as one of the top 3 most frequent mistakes.

**The fix:**

- Pick one convention for the API surface (typically `camelCase` for JSON, `snake_case` for query parameters) and enforce it with a linter.
- Standardize date format (ISO 8601), pagination terminology (`limit`/`offset` or `cursor`/`pageSize`), and boolean naming (`isActive`, not `active_status`).
- Use OpenAPI/JSON Schema linting tools (Spectral, Redocly) in CI to catch violations before merge.

**Detection rule:**

Lint rule: scan all response schemas for mixed casing conventions within a single API. Flag any endpoint where field names use more than one casing style.

---

### AP-06: Exposing Internal Implementation Details

**Also known as:** Leaky Abstraction API, Database-as-API, Implementation Coupling
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```json
// Exposing database column names and internal IDs
{
  "pk_user_id": 42,
  "fk_org_id": 7,
  "tbl_users_created_at": "2024-01-01",
  "mysql_auto_increment_offset": 42
}

// Exposing internal service topology
{
  "data": { ... },
  "_debug": {
    "served_by": "user-service-pod-3a7f",
    "db_query_time_ms": 12,
    "cache_hit": false,
    "redis_node": "cache-east-2"
  }
}

// Stack traces in production error responses
{
  "error": "NullPointerException at com.myapp.service.UserService.getProfile(UserService.java:142)"
}
```

**Why developers do it:**

- Direct database-to-JSON serialization without a DTO/mapping layer.
- Debug information left enabled in production.
- Error handlers that dump raw exception details.
- The API was originally "internal only" but scope expanded.

**What goes wrong:**

- Attackers gain reconnaissance: database technology, table structures, service topology, and code paths.
- Internal refactoring (renaming a column, moving to a different database) becomes a breaking API change.
- Leaky abstractions create implicit coupling — consumers depend on internals they should never have seen, and those dependencies are invisible in the codebase.
- The Experian API incident (2021) demonstrated this: their API exposed credit scores of tens of millions of Americans because the API design leaked internal data access patterns, authenticating users with only name and address — essentially public information.

**The fix:**

- Always map internal models to API-specific DTOs/response schemas.
- Strip debug headers and internal metadata in production (or gate behind an internal-only header).
- Use a generic error envelope that never includes stack traces, SQL queries, or internal paths.
- Treat the API schema as a public contract independent of internal implementation.

**Detection rule:**

Scan response schemas for field names containing `pk_`, `fk_`, `tbl_`, `_id` with database prefixes, `_internal`, `_debug`. Scan error responses for stack traces, file paths, or SQL fragments.

---

### AP-07: Missing Pagination

**Also known as:** The Unbounded Query, SELECT * FROM production, Memory Bomb
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```
GET /api/orders
-> Returns ALL 2.3 million orders in a single response
```

```
GET /api/logs?since=2020-01-01
-> 47GB JSON response, server OOMs, gateway times out after 30 seconds
```

The endpoint works perfectly with 50 test records during development. Then real data arrives.

**Why developers do it:**

- "We'll add pagination later" (they will not add pagination later).
- Test datasets are small, so the problem is invisible during development.
- Premature optimization aversion taken too far.

**What goes wrong:**

- Database queries without LIMIT scan entire tables, holding locks and blocking other queries.
- Application servers OOM trying to serialize millions of records.
- Network timeouts as response payloads exceed gateway limits (many API gateways cap at 10MB).
- A single client request can degrade service for all users — effectively a self-inflicted DDoS.
- In one documented incident, an Oracle API integration experienced persistent timeouts when fetching large record volumes because no pagination was implemented, requiring complete architectural rework.

**The fix:**

- Paginate from day one. Every list endpoint gets `limit` and `offset` (or cursor-based pagination).
- Set a maximum page size (e.g., 100) and a default (e.g., 20). Reject requests exceeding the max.
- Return pagination metadata: `{ "data": [...], "pagination": { "total": 23400, "limit": 20, "offset": 0, "next": "/api/orders?cursor=abc123" } }`.
- Prefer cursor-based pagination for datasets that change frequently — offset-based pagination skips or duplicates items when records are inserted between pages.

**Detection rule:**

Flag any list endpoint that lacks `limit`/`offset` or `cursor` parameters. Flag any database query in a list handler that has no `LIMIT` clause. Alert when response payloads exceed 1MB.

---

### AP-08: Over-Fetching and Under-Fetching

**Also known as:** Data Mismatch, One-Size-Fits-None Responses, Payload Bloat
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Over-fetching: client needs a user's name and avatar, but the API returns the entire user object with 47 fields including address history, preferences, and audit trail.

```
GET /api/users/42
-> Returns 4KB response when client needs 200 bytes
```

Under-fetching: client needs user + team + subscription but must call three endpoints because the user endpoint returns only user fields with no option to include related resources.

```
GET /api/users/42          -> { name, teamId }
GET /api/teams/7           -> { name, planId }
GET /api/plans/3           -> { name, price }
// Three round trips for one card component
```

**Why developers do it:**

- Over-fetching: serializing the entire ORM model is the path of least resistance.
- Under-fetching: rigid adherence to "one resource per endpoint" without considering access patterns.
- Lack of field selection or resource embedding mechanisms.

**What goes wrong:**

- Over-fetching wastes bandwidth, especially on mobile (data costs money in many markets).
- Under-fetching forces the chatty API pattern (AP-01), compounding latency.
- Both problems are why GraphQL gained traction — Facebook created it specifically to solve mobile over-fetching and under-fetching in their news feed.
- GraphQL itself can suffer from the same problems: unrestricted query depth causes server-side over-fetching from databases (the N+1 problem).

**The fix:**

- Support sparse fieldsets: `GET /users/42?fields=name,avatarUrl`.
- Support resource embedding: `GET /users/42?include=team,subscription`.
- For GraphQL: implement query complexity analysis and depth limiting. Use DataLoaders for batching.
- Define "thin" and "full" representations: list endpoints return summaries, detail endpoints return full objects.

**Detection rule:**

Compare response payload size against actual field usage in client code. Flag endpoints where clients consume less than 30% of returned fields. Flag views that require more than 3 API calls to render.

---

### AP-09: Misusing HTTP Status Codes

**Also known as:** 200-for-Everything, Status Code Ignorance, The Lying API
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```
POST /api/users
-> 200 OK
{
  "success": false,
  "error": "Email already exists"
}
```

```
DELETE /api/orders/999
-> 200 OK
{
  "status": "error",
  "message": "Order not found"
}
```

```
GET /api/health
-> 500 Internal Server Error
{
  "healthy": true,
  "message": "All systems operational"
}
```

**Why developers do it:**

- Legacy systems and older frameworks defaulted to 200 for everything.
- "The HTTP request itself succeeded, the application error is in the body" — a misunderstanding of what HTTP status codes represent.
- Framework makes it easier to return 200 and stuff errors in the body.
- JSON-RPC and some SOAP conventions normalize this behavior.

**What goes wrong:**

- HTTP clients, SDKs, and libraries use status codes for control flow. A 200 with an error body bypasses all error handling.
- Reverse proxies (Cloudflare, Fastly, Nginx) cannot distinguish real successes from application errors. CDN caches "successful" error responses.
- Monitoring dashboards show 100% success rate while users cannot log in.
- Alerting systems never fire because 5xx rate stays at zero.
- Retry logic does not trigger on 200 responses, so transient failures are never retried.
- SLO dashboards become meaningless.

**The fix:**

- 200: success with body. 201: created. 204: success, no body.
- 400: client sent invalid data. 401: not authenticated. 403: not authorized. 404: not found. 409: conflict. 422: validation error. 429: rate limited.
- 500: server fault. 502: bad gateway. 503: temporarily unavailable. 504: gateway timeout.
- Adopt RFC 9457 (Problem Details for HTTP APIs) for structured error responses.
- Use at minimum: 200, 201, 204, 400, 401, 403, 404, 409, 429, 500, 503.

**Detection rule:**

Flag any response with status 200 that contains `"error"`, `"success": false`, `"status": "error"`, or `"fault"` in the body. Flag any 5xx response with `"healthy": true` or `"success": true`.

---

### AP-10: Ignoring Idempotency

**Also known as:** Double-Charge Problem, Retry Roulette, Non-Idempotent Mutations
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

```
# Client sends payment request
POST /api/payments { amount: 100, userId: 42 }
-> Network timeout, no response received

# Client retries (did the first one go through?)
POST /api/payments { amount: 100, userId: 42 }
-> 201 Created (second charge processed)

# User charged $200 instead of $100
```

No idempotency key. No deduplication. The server treats every request as a new operation.

**Why developers do it:**

- Idempotency infrastructure adds complexity (storing keys, handling races, expiring old keys).
- "Our network is reliable" (it is not).
- Testing idempotency requires simulating partial failures, which is hard.
- Misunderstanding: developers think idempotency only matters for payment systems.

**What goes wrong:**

- Stripe documented this as a core design challenge as their user base grew: double payments became a significant issue. They built their entire idempotency key system to guarantee exactly-once processing for retried requests.
- In a WooCommerce-Stripe integration incident, idempotency keys were set for the `/charges` API but not for `/payment_intents`. A customer got charged 3 times for a single subscription renewal.
- Duplicate order creation, duplicate email sends, duplicate webhook deliveries — any non-idempotent POST is vulnerable.
- Retry storms during partial outages multiply the damage: if the server is slow, clients retry, creating more load, causing more timeouts, causing more retries.

**The fix:**

- Accept an `Idempotency-Key` header on all state-changing endpoints.
- Store the key with the response on first execution. Return the cached response on subsequent requests with the same key.
- Stripe's approach: cache both the status code and body for 24 hours, including 500 errors.
- For naturally idempotent operations (PUT replacing a full resource, DELETE), ensure the implementation is actually idempotent — `DELETE /orders/42` should return 204 whether the order exists or was already deleted.
- Use database constraints (unique indexes on business keys) as a safety net.

**Detection rule:**

Flag all POST endpoints that create resources or trigger side effects but do not accept or enforce an idempotency key. Flag POST handlers that lack deduplication logic.

---

### AP-11: Missing Rate Limiting

**Also known as:** Open Firehose, Unthrottled API, DDoS Welcome Mat
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```
# No rate limit headers, no throttling, no pushback
for i in $(seq 1 1000000); do
  curl -s https://api.example.com/search?q=test &
done
# Server falls over at request 50,000
```

**Why developers do it:**

- "We'll add rate limiting when we need it" (you need it before you think you need it).
- Internal APIs feel safe from abuse (until a runaway integration script hits them).
- Confusion about where rate limiting should live (application vs. gateway vs. CDN).

**What goes wrong:**

- Cloudflare's September 2025 dashboard and API outage was triggered by a bug in their own dashboard that caused repeated, unnecessary calls to an internal Tenant Service API. The fix required installing a global rate limit on the service. Even Cloudflare's own internal APIs needed rate limiting.
- In a separate Cloudflare incident, a rate limit intended for one customer was misapplied to a wider set of customers across Europe, causing widespread outages during DDoS mitigation. Misconfigured rate limits can be as dangerous as missing ones.
- Without rate limiting, a single misconfigured client, a scraping bot, or a DDoS attack can exhaust database connections, CPU, and memory for all users.
- OWASP lists "Lack of Resources & Rate Limiting" as a top API security vulnerability.

**The fix:**

- Implement rate limiting at the API gateway level with per-client quotas.
- Return `429 Too Many Requests` with a `Retry-After` header.
- Include rate limit headers in every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Use token bucket or sliding window algorithms. Set different limits for different endpoints (search is more expensive than profile reads).
- Rate limit by authenticated user, not just by IP (to handle shared NATs and proxies).

**Detection rule:**

Flag any public-facing endpoint that does not have rate limiting configured at the gateway or application level. Flag endpoints missing `429` in their response code documentation.

---

### AP-12: Authentication in Query Parameters

**Also known as:** Token-in-URL, Secret in the Address Bar, The Log File Goldmine
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```
GET /api/users?api_key=REDACTED_STRIPE_KEY
GET /api/data?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GET /api/admin/export?password=hunter2
```

**Why developers do it:**

- Simpler for quick integrations: "just append the key to the URL."
- Some legacy systems only support query parameters.
- Webhook callbacks sometimes pass verification tokens in URLs.
- Developers testing in browsers find it easier than setting headers.

**What goes wrong:**

- URLs are logged everywhere: web server access logs, proxy logs, CDN logs, browser history, analytics tools, referer headers.
- The OWASP vulnerability catalog explicitly lists "Information Exposure Through Query Strings in URL" — URLs are stored in browser history, passed in Referer headers to third-party resources, and visible in server logs accessible to operations staff.
- Shared URLs leak credentials: copying a URL to share with a colleague or paste into a bug report includes the token.
- HTTP Referer headers send the full URL (including query parameters) to third-party resources loaded on the page.
- SSL/TLS encrypts URL content in transit, but URLs are logged in plaintext at both endpoints and any intermediary that terminates TLS.

**The fix:**

- Use the `Authorization` header with Bearer tokens: `Authorization: Bearer <token>`.
- For API keys, use a custom header: `X-API-Key: <key>`.
- If query parameter tokens are unavoidable (e.g., webhook verification), use short-lived, single-use tokens that expire within minutes.
- Configure log scrubbing to redact known sensitive query parameters.
- Audit server, proxy, and CDN log configurations to ensure sensitive parameters are not recorded.

**Detection rule:**

Scan API endpoint definitions for query parameters named `key`, `token`, `api_key`, `secret`, `password`, `auth`, or `access_token`. Flag any endpoint that accepts authentication credentials outside of headers.

---

### AP-13: Inconsistent Response Shapes

**Also known as:** Shape Shifting API, Schema Roulette, The Parser's Nightmare
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```json
// GET /api/users/42
{ "id": 42, "name": "Alice", "email": "alice@example.com" }

// GET /api/users (list endpoint)
{ "results": [{ "userId": 42, "fullName": "Alice", "emailAddress": "alice@example.com" }] }

// GET /api/users/42/orders
[{ "order_id": 1, "user": 42 }]

// POST /api/users (error)
{ "error": true, "msg": "Validation failed" }

// POST /api/orders (error)
{ "success": false, "errors": [{ "field": "quantity", "message": "Required" }] }
```

Same resource, five different field names. Error responses with different structures per endpoint.

**Why developers do it:**

- Different developers built different endpoints at different times.
- No shared response envelope or schema standard.
- Organic growth without API design review.

**What goes wrong:**

- Every consumer writes custom parsing logic per endpoint, multiplying integration effort.
- SDK code generation fails or produces inconsistent types.
- An API reviewer who analyzed 300+ API designs identified inconsistent response shapes as one of the most pervasive mistakes.
- Automated testing becomes fragile: assertion logic varies per endpoint.
- API consumers lose trust and over-defensively code against every possible shape variation.

**The fix:**

- Define a standard response envelope: `{ "data": T, "meta": {}, "errors": [] }`.
- Same resource, same field names, everywhere. A user's email is `email` whether returned from `/users/42`, a list endpoint, or embedded in an order.
- Adopt RFC 9457 for error responses: consistent `type`, `title`, `status`, `detail`, `instance` fields.
- Use OpenAPI `$ref` to share component schemas across endpoints.

**Detection rule:**

Compare response schemas across all endpoints that return the same resource type. Flag any field name or structure differences for the same logical entity. Flag endpoints with non-standard error response shapes.

---

### AP-14: Nested Resource Hell

**Also known as:** URL Inception, Deep Nesting, The Matryoshka Endpoint
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```
GET /organizations/5/departments/3/teams/12/members/42/tasks/99/comments/7/attachments/2
```

Seven levels of nesting. Every intermediate ID must be known and valid. Changing organizational structure breaks every URL.

```
# What if a member moves to a different team?
# Old: /organizations/5/departments/3/teams/12/members/42
# New: /organizations/5/departments/3/teams/15/members/42
# Every bookmark, every cached URL, every integration breaks
```

**Why developers do it:**

- "The URL should reflect the data model hierarchy."
- Attempting to encode full context into the URL.
- ORMs that expose parent-child relationships encourage this pattern.

**What goes wrong:**

- URLs become brittle: any hierarchy change breaks all deep URLs.
- Clients must know every ancestor ID to reference a leaf resource, even when they only have the leaf ID.
- Authorization middleware must validate every intermediate segment, multiplying database lookups.
- Documentation becomes unwieldy with combinatorial explosion of path parameters.
- URL length limits (2048 characters in some browsers/proxies) become a real constraint.

**The fix:**

- Limit nesting to one level: `/teams/12/members` is fine. `/organizations/5/departments/3/teams/12/members` is not.
- Provide direct access via canonical URLs: `GET /members/42`, `GET /tasks/99`, `GET /comments/7`.
- Use query parameters for filtering by parent: `GET /members?teamId=12`.
- Resources should be addressable by their own ID without requiring ancestor context.

**Detection rule:**

Flag any endpoint with more than 2 levels of path parameter nesting. Count path segments that are dynamic (`:id` or `{id}`) — alert if more than 2 exist in a single URL pattern.

---

### AP-15: Ignoring HATEOAS When It Matters

**Also known as:** Hardcoded URL Syndrome, Missing Navigation, Undiscoverable API
**Frequency:** Occasional
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**

```json
// API returns bare data, no links
{
  "orderId": 42,
  "status": "pending",
  "total": 99.99
}
// Client must hardcode: "if status == pending, I can cancel at /orders/42/cancel"
// Client must hardcode: "payment URL is /orders/42/payment"
// Client must hardcode: "invoice URL is /orders/42/invoice"
```

Every client independently maintains a mapping of resource states to available actions and their URLs.

**Why developers do it:**

- HATEOAS is perceived as over-engineering for most APIs.
- Most API documentation tools lack support for hypermedia links.
- "Our clients already know the URLs."
- OpenAPI generation struggles with HATEOAS — parts of the response (links) are not documented in the generated spec.

**What goes wrong:**

- Changing URL structures requires updating every client simultaneously.
- Clients implement business logic that belongs on the server (e.g., "can this order be cancelled?").
- State machine transitions are scattered across client codebases and fall out of sync.
- API evolution becomes harder: adding a new action requires client updates even if the client could discover it dynamically.

**The fix:**

- You do not need full HATEOAS for every API. Apply it selectively where it provides value:
  - Workflow-driven resources (orders, applications, tickets) with state-dependent available actions.
  - Paginated collections (always include `next`, `prev`, `first`, `last` links).
  - Resource discovery (root endpoint listing available resources).
- Use a standard link format (HAL, JSON:API, or simple `_links` objects).
- At minimum, include pagination links and self-references.

```json
{
  "orderId": 42,
  "status": "pending",
  "_links": {
    "self": { "href": "/orders/42" },
    "cancel": { "href": "/orders/42/cancel", "method": "POST" },
    "payment": { "href": "/orders/42/payment", "method": "POST" }
  }
}
```

**Detection rule:**

Flag workflow-driven resources that return status fields but no associated action links. Flag paginated endpoints that lack `next`/`prev` links in the response.

---

### AP-16: Stringly-Typed Everything

**Also known as:** String Soup, Primitive Obsession in APIs, Parse-It-Yourself Data
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```json
{
  "price": "99.99",
  "quantity": "5",
  "isActive": "true",
  "createdAt": "Jan 5, 2024",
  "tags": "electronics,sale,featured",
  "metadata": "{\"color\": \"red\", \"size\": \"large\"}",
  "coordinates": "40.7128,-74.0060",
  "permissions": "read,write,admin"
}
```

Numbers as strings. Booleans as strings. Dates as unstructured strings. Arrays as comma-separated strings. JSON as escaped strings inside JSON. Every client must parse, validate, and handle malformed values.

**Why developers do it:**

- Serialization from databases or languages that treat everything as strings (some NoSQL stores, shell scripts, CSV imports).
- "Strings are flexible" — avoiding schema constraints during rapid prototyping.
- Legacy system integration where everything passes through text pipelines.
- Fear of type mismatches across different client languages.

**What goes wrong:**

- Every client independently implements parsing and validation, introducing subtle bugs (is "true" truthy? What about "True", "TRUE", "1", "yes"?).
- Numeric precision issues: `"99.99"` parsed as a float might become `99.98999999999999`.
- Date parsing ambiguity: is `"01/02/03"` January 2, 2003 or February 1, 2003 or February 3, 2001?
- JSON-in-JSON requires double-escaping and double-parsing, a common source of injection vulnerabilities.
- OpenAPI code generation produces string types instead of proper typed models, losing all type safety.

**The fix:**

- Use native JSON types: numbers for numbers, booleans for booleans, arrays for arrays, objects for objects.
- Use ISO 8601 for all dates and timestamps: `"2024-01-05T00:00:00Z"`.
- Use arrays for lists, not comma-separated strings.
- Use nested objects for structured data, not JSON-encoded strings.
- Define enums explicitly in your schema for constrained string values.

**Detection rule:**

Scan response schemas for string fields that contain patterns matching numbers (`^\d+\.?\d*$`), booleans (`^(true|false)$`), ISO dates, JSON objects, or comma-separated values. Flag for type promotion.

---

### AP-17: Missing Request Validation

**Also known as:** Trust-All-Input, The Permissive Endpoint, Garbage-In-Garbage-Out
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```
POST /api/users
{
  "name": "",
  "email": "not-an-email",
  "age": -5,
  "role": "superadmin",
  "bio": "<script>alert('xss')</script>" + "A".repeat(10_000_000)
}
-> 201 Created
```

The server accepts anything, stores it in the database, and lets downstream systems deal with the consequences.

**Why developers do it:**

- "The frontend validates; the backend doesn't need to."
- Validation code feels like boilerplate.
- "We trust our clients" (APIs have no trusted clients — even your own frontend can be bypassed with curl).
- Tight deadlines prioritize feature delivery over input validation.

**What goes wrong:**

- SQL injection, XSS, and command injection through unvalidated string fields.
- Denial of service through unbounded payload sizes (10MB bio field stored in the database).
- Privilege escalation through unvalidated enum fields (`"role": "superadmin"`).
- Data corruption: invalid emails prevent password reset, negative ages break age-gated features, empty names break display logic.
- The Peloton API vulnerability (2021) demonstrated how insufficient validation and access controls exposed personal data of approximately 3 million users. API requests were not validated for authentication, allowing anyone to pull private user data.

**The fix:**

- Validate every input field at the API boundary: type, format, length, range, enum membership.
- Use schema validation (JSON Schema, Joi, Zod, Pydantic) as middleware, not inline checks.
- Whitelist allowed fields to prevent mass assignment (reject unknown fields).
- Set `Content-Length` limits at the gateway (e.g., 1MB max request body).
- Never trust enum values from clients — validate against server-side allowed values.
- Sanitize but do not rely on sanitization alone; validate first, sanitize second.

**Detection rule:**

Flag POST/PUT/PATCH handlers that do not call a validation function or middleware before processing. Flag schemas without `maxLength`, `minimum`, `maximum`, or `enum` constraints on string and number fields.

---

### AP-18: Synchronous Long-Running Operations

**Also known as:** The Hanging Request, Timeout Roulette, Blocking API Call
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```
POST /api/reports/generate
{ "type": "annual", "years": [2020, 2021, 2022, 2023, 2024] }

# Client waits... 30 seconds... 60 seconds... 120 seconds...
# Gateway returns 504 Gateway Timeout
# Client retries, creating a second report generation job
# Server is now running two expensive report jobs
```

```
POST /api/videos/transcode
{ "sourceUrl": "https://example.com/4k-video.mp4" }
# Connection held open for 45 minutes
# Any network hiccup kills the request with no recovery
```

**Why developers do it:**

- Synchronous request-response is the simplest mental model.
- "It usually completes in under 30 seconds" (until it does not).
- Adding async infrastructure (queues, status endpoints, webhooks) feels like over-engineering.
- The team does not have experience with asynchronous patterns.

**What goes wrong:**

- Gateway and proxy timeouts kill the request before completion (Nginx default: 60s, ALB default: 60s).
- Thread/connection pool exhaustion: long-running requests hold server resources, blocking other requests.
- Retries create duplicate work (see AP-10: Ignoring Idempotency).
- Mobile clients on unreliable networks lose the connection and have no way to retrieve the result.
- Microsoft's Azure Architecture Center documents the Asynchronous Request-Reply pattern specifically because synchronous long-running operations are a top cause of reliability issues.

**The fix:**

- Return `202 Accepted` immediately with a status URL.
- Provide a polling endpoint: `GET /api/reports/status/abc123` returning progress and eventual result.
- Support webhooks for completion notification: client provides a `callbackUrl` in the original request.
- Use exponential backoff in polling to avoid hammering the status endpoint.
- Include `Retry-After` header in 202 responses to guide polling frequency.

```
POST /api/reports/generate -> 202 Accepted
{
  "statusUrl": "/api/reports/status/abc123",
  "estimatedCompletionSeconds": 120
}

GET /api/reports/status/abc123 -> 200 OK
{
  "status": "processing",
  "progress": 65,
  "estimatedRemainingSeconds": 42
}
```

**Detection rule:**

Flag any endpoint with a p95 response time exceeding 10 seconds. Flag handlers that perform file I/O, external API calls, or database operations expected to exceed 5 seconds without returning 202.

---

### AP-19: Leaking PII in URLs and Logs

**Also known as:** The GDPR Time Bomb, PII in the Address Bar, Log File Liability
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

```
GET /api/users?email=alice@example.com&ssn=123-45-6789
GET /api/lookup?phone=+15551234567&dob=1990-01-15
GET /api/verify?creditCard=4111111111111111&cvv=123

# These URLs end up in:
# - Nginx access logs (retained for 90 days)
# - CDN edge logs (retained by third party)
# - Browser history on shared computers
# - Referer headers sent to third-party analytics
# - APM tools (Datadog, New Relic, Splunk)
# - Error tracking (Sentry, Bugsnag)
```

**Why developers do it:**

- GET requests are the easiest way to fetch data, and parameters go in the URL.
- Logging middleware records full URLs by default.
- Developers do not think of URLs as a data storage and transmission vector.
- "It's HTTPS so it's encrypted" (true in transit, but URLs are logged in plaintext at endpoints).

**What goes wrong:**

- Trend Micro research documented PII leaks from e-commerce APIs that passed customer information as URL query parameters, allowing unauthenticated users to look up other users' order status using predictable URLs.
- The Experian API incident exposed credit scores by accepting name and address as API parameters — essentially public information used as authentication material, allowing anyone to look up credit scores for most Americans.
- GDPR and CCPA violations: PII in log files makes those log files subject to data retention and deletion requirements. Log rotation is not the same as GDPR-compliant deletion.
- Security audits flag log files containing PII, requiring expensive remediation (retroactive log scrubbing across distributed systems).

**The fix:**

- Never put PII in URLs or query parameters. Use POST with a request body for PII-based lookups.
- Use opaque identifiers (UUIDs) in URLs instead of email addresses, phone numbers, or SSNs.
- Configure log scrubbing at the infrastructure level: redact known PII patterns from access logs, APM traces, and error reports.
- Audit Referer header exposure: set `Referrer-Policy: no-referrer` or `same-origin`.
- Treat URLs as public data — design them accordingly.

**Detection rule:**

Scan endpoint definitions for query parameters matching PII patterns: `email`, `ssn`, `phone`, `dob`, `creditCard`, `address`, `name` with format constraints suggesting PII. Scan access logs for query strings containing email addresses, phone numbers, or SSN patterns.

---

### AP-20: Undocumented Error Responses

**Also known as:** Surprise Error Format, The Undocumented 500, Error Response Guessing Game
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

API documentation shows only the happy path:

```
POST /api/orders
Response: 201 Created
{ "orderId": 42, "status": "created" }
```

Undocumented reality:

```
400: { "error": "Bad Request" }                          # What was bad?
400: "Validation failed"                                  # Plain text, not JSON
400: { "errors": { "items": ["At least one required"] }}  # Different shape
401: <html><body>Login Required</body></html>             # HTML from auth proxy
403: { "code": "FORBIDDEN", "msg": "Insufficient scope" } # Yet another shape
500: { "timestamp": "...", "path": "/api/orders", "message": "...", "trace": "..." } # Spring Boot default
502: <html>Bad Gateway</html>                             # Nginx HTML, not JSON
503: (empty body)                                          # No body at all
```

**Why developers do it:**

- Error paths get less testing and documentation effort than happy paths.
- Different middleware layers (auth proxy, API gateway, application framework, custom code) each produce errors in their own format.
- "Errors are self-explanatory" — they are not.

**What goes wrong:**

- Client developers write error handling code against observed behavior, which changes without notice.
- JSON parsing crashes when the response is HTML or plain text (the auth proxy returned HTML but the client expected JSON).
- Error messages are too vague to be actionable: `"Bad Request"` does not tell the developer which field was wrong.
- Support tickets increase because developers cannot self-serve through error messages.
- One analysis found that URLs, examples, error shapes, and documentation slowly fall out of sync with the published API version, creating a growing gap between documented and actual behavior.

**The fix:**

- Document every error response for every endpoint in your OpenAPI spec.
- Adopt RFC 9457 (Problem Details) as the standard error format across all layers.
- Ensure all middleware layers (proxy, gateway, framework) produce errors in the same format — or configure a centralized error-formatting middleware.
- Include machine-readable error codes (`"code": "VALIDATION_ERROR"`), human-readable messages, and field-level details.

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Request body contains invalid fields",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "quantity", "message": "Must be greater than 0" }
  ]
}
```

**Detection rule:**

Compare documented error responses in OpenAPI spec against actual error responses observed in production logs. Flag any undocumented status code or error format. Flag endpoints where the error response `Content-Type` differs from the success response `Content-Type`.

---

### AP-21: Coupling Client to Server Implementation

**Also known as:** Leaky Contract, Implementation-Aware Client, Tight Coupling Across the Wire
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Very Hard

**What it looks like:**

```javascript
// Client code that assumes server implementation details
const user = await fetch('/api/users/42');
// Client assumes database auto-increment IDs are sequential
const nextUser = await fetch(`/api/users/${user.id + 1}`);

// Client assumes specific ORM behavior
const orders = await fetch(`/api/users/42/orders?_expand=items&_embed=payments`);
// These query parameters mirror json-server/ORM conventions, not API design

// Client parses internal error codes that map to server packages
if (error.code === 'SEQUELIZE_UNIQUE_CONSTRAINT') { ... }
if (error.source === 'redis-cache-miss') { ... }
```

WunderGraph's analysis of generated GraphQL APIs describes this as "tight coupling as a service" — when the API schema is auto-generated from the database schema, every database migration becomes a potential API breaking change.

**Why developers do it:**

- Auto-generating APIs from database schemas (PostgREST, Hasura, Prisma) exposes database structure directly.
- Same team owns client and server, so they share implementation knowledge informally.
- Convenience: "it works" is prioritized over "it's decoupled."
- Lack of an explicit API design phase — the API is whatever the ORM produces.

**What goes wrong:**

- Database migration (renaming a column, changing a primary key strategy from auto-increment to UUID) breaks the API contract.
- Switching ORMs, databases, or caching layers requires API changes.
- Clients developed by external teams break when internal infrastructure changes.
- The coupling is implicit — no import statement or type dependency makes it visible. As one analysis notes, "leaky abstractions create coupling that won't be made explicit in the codebase through dependencies such as imports or type usage."

**The fix:**

- Design the API contract first (API-first design), then implement the server to fulfill it.
- Use DTOs/view models to decouple API responses from internal models.
- Never expose database column names, ORM query parameters, or internal error codes in the API.
- Use API description languages (OpenAPI, AsyncAPI) as the contract, and generate server stubs from the contract — not the reverse.
- Test contract stability independently: schema diff tests in CI that prevent accidental coupling.

**Detection rule:**

Flag API field names that match database column naming patterns (`_id` suffixes, `fk_` prefixes, `created_at` matching ORM defaults). Flag error responses containing framework-specific error codes (e.g., `SEQUELIZE_`, `PRISMA_`, `HIBERNATE_`). Flag query parameters that mirror ORM filter syntax.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns Triggered | Frequency |
|---|---|---|
| No API design phase (code-first) | AP-05, AP-06, AP-13, AP-14, AP-16, AP-21 | Very Common |
| Small test datasets hiding scale issues | AP-07, AP-08, AP-18 | Very Common |
| "We control all the clients" assumption | AP-04, AP-10, AP-13, AP-17, AP-20 | Common |
| Backend language conventions leaking | AP-05, AP-06, AP-16, AP-21 | Common |
| Security as afterthought | AP-11, AP-12, AP-17, AP-19 | Common |
| Premature microservice decomposition | AP-01, AP-08, AP-14 | Common |
| No schema validation in CI | AP-04, AP-05, AP-13, AP-16 | Common |
| Convenience over correctness | AP-02, AP-03, AP-09, AP-12 | Very Common |
| Framework defaults accepted uncritically | AP-06, AP-09, AP-19, AP-20 | Common |
| Missing async infrastructure knowledge | AP-10, AP-18 | Occasional |
| No cross-team API style guide | AP-05, AP-09, AP-13, AP-20 | Common |
| Legacy system migration pressure | AP-02, AP-03, AP-09, AP-16 | Occasional |

---

## Self-Check Questions

Use these questions during API design review. A "yes" answer indicates a potential anti-pattern.

1. **Does a single page or screen require more than 3 sequential API calls to render?** (AP-01: Chatty API)

2. **Does any endpoint accept an `action` or `type` parameter that fundamentally changes what it does?** (AP-02: God Endpoint)

3. **Do any GET endpoints write to a database, send emails, or trigger side effects?** (AP-03: HTTP Semantics)

4. **Can you rename a database column without changing your API response schema?** (AP-06, AP-21: Leaky Abstraction / Coupling)

5. **What happens when your list endpoint is called against a table with 10 million rows and no query parameters?** (AP-07: Missing Pagination)

6. **If a POST request times out and the client retries, will the operation execute twice?** (AP-10: Idempotency)

7. **Are authentication tokens, API keys, or PII visible in your access logs?** (AP-12, AP-19: Auth in Query Params / PII Leak)

8. **Do all endpoints that return the same resource type use the same field names and response structure?** (AP-13: Inconsistent Response Shapes)

9. **Do any endpoints have more than 2 path parameters (dynamic segments)?** (AP-14: Nested Resource Hell)

10. **Are there fields in your API responses that are strings but always contain numbers, booleans, or dates?** (AP-16: Stringly-Typed)

11. **Can a client send `"role": "admin"` in a POST body and have it accepted?** (AP-17: Missing Validation)

12. **Do any endpoints regularly take more than 10 seconds to respond?** (AP-18: Synchronous Long-Running)

13. **Does your OpenAPI spec document every error status code and response shape for every endpoint?** (AP-20: Undocumented Errors)

14. **If you switched from PostgreSQL to MongoDB, how many API response fields would change?** (AP-21: Client-Server Coupling)

15. **Do all error responses across your API follow the same structure, including those from proxies and gateways?** (AP-09, AP-13, AP-20: Status Codes / Shapes / Errors)

---

## Code Smell Quick Reference

| Code Smell | Likely Anti-Pattern | Severity | Detection Method |
|---|---|---|---|
| Client makes >5 API calls per page render | AP-01: Chatty API | High | Client-side request tracing |
| Single endpoint with `action` parameter | AP-02: God Endpoint | High | Route definition scan |
| GET handler with DB write call | AP-03: HTTP Semantics | Critical | Static analysis of handlers |
| Removed or renamed field in API diff | AP-04: Breaking Changes | Critical | Schema diff in CI |
| Mixed camelCase/snake_case in same response | AP-05: Naming Conventions | Medium | OpenAPI schema lint |
| `pk_`, `fk_`, `tbl_` prefixes in field names | AP-06: Leaky Abstraction | High | Schema field name scan |
| List endpoint without `limit` parameter | AP-07: Missing Pagination | Critical | Route parameter audit |
| Response >1MB for a list endpoint | AP-07/AP-08: Pagination/Fetching | High | Response size monitoring |
| Status 200 body contains `"error"` | AP-09: Status Code Misuse | High | Response body pattern scan |
| POST handler without idempotency key support | AP-10: No Idempotency | Critical | Handler code review |
| No `429` status in endpoint documentation | AP-11: Missing Rate Limit | Critical | OpenAPI spec audit |
| `api_key` or `token` in query string | AP-12: Auth in URL | Critical | Route parameter scan |
| Same resource, different field names per endpoint | AP-13: Inconsistent Shapes | High | Cross-endpoint schema comparison |
| URL with >2 dynamic path segments | AP-14: Deep Nesting | Medium | Route pattern analysis |
| Status field returned without `_links` | AP-15: Missing HATEOAS | Medium | Response schema audit |
| String field matching `^\d+$` or `^(true\|false)$` | AP-16: Stringly-Typed | Medium | Response payload sampling |
| Handler with no validation middleware | AP-17: No Validation | Critical | Middleware chain inspection |
| p95 latency >10s on any endpoint | AP-18: Sync Long-Running | High | APM latency percentiles |
| PII patterns in access log URLs | AP-19: PII in URLs | Critical | Log pattern scanning |
| Error `Content-Type` differs from success | AP-20: Undocumented Errors | Medium | Response header monitoring |
| Field names match ORM/DB column conventions | AP-21: Client-Server Coupling | High | Schema naming analysis |

---

*Researched: 2026-03-08 | Sources: Stripe Engineering Blog (idempotency design), Shopify Engineering (GraphQL N+1 batching), Cloudflare Post-Mortems (September 2025 API outage, rate limiting incident), Krebs on Security (Experian API leak 2021), TechCrunch (Peloton API vulnerability 2021), OWASP (query string information exposure, HTTP verb tampering, API security top 10), Engadget/Yahoo Finance (Twitter API breaking changes 2023), Microsoft Azure Architecture Center (async request-reply pattern), RFC 9457 (Problem Details for HTTP APIs), WunderGraph (tight coupling in generated APIs), InfoQ (REST anti-patterns), Specmatic (API design anti-patterns detection), Salt Security (Experian and Peloton incident analysis), Tyk (200-for-everything anti-pattern)*
