# API Testing — Expertise Module

> An API testing specialist validates the functional correctness, performance, security, and contract compliance of HTTP-based (REST, GraphQL) and RPC-based (gRPC) service interfaces. The scope covers test design across the API testing pyramid, contract testing between consumers and providers, schema validation, load/stress testing, security testing against OWASP API Top 10, and integration of API tests into CI/CD pipelines.

---

## Core Patterns & Conventions

### API Testing Pyramid

Structure API tests in layers, with more tests at the bottom (fast, cheap) and fewer at the top (slow, expensive):

```
         /  E2E  \          ← Few: full user flows across real services
        / Contract \        ← Medium: consumer-provider contract verification
       / Integration \      ← Many: service + real DB/cache, no external deps
      /    Unit Tests   \   ← Most: resolver/handler logic, mocked dependencies
```

| Layer       | Scope                                | Speed   | Isolation       | Tools                              |
|-------------|--------------------------------------|---------|-----------------|------------------------------------|
| Unit        | Handler/resolver logic in isolation  | <50ms   | Full (all mocked)| Jest, Vitest, pytest               |
| Integration | Service + real DB, cache, queue      | <2s     | Partial          | Supertest, Testcontainers          |
| Contract    | Consumer-provider interface agreement| <5s     | Consumer/provider| Pact v13, Specmatic 1.3+           |
| E2E         | Full request through deployed stack  | <30s    | None             | Playwright API, Bruno CLI, Postman |

**Rule of thumb:** Aim for 70% unit, 20% integration, 8% contract, 2% E2E for API test suites.

### REST API Testing Patterns

Test every endpoint across five dimensions:

1. **HTTP method correctness** — GET returns data, POST creates (201), PUT replaces, PATCH modifies, DELETE removes (204).
2. **Status code accuracy** — Verify correct codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.
3. **Response body structure** — Validate JSON schema, field types, nullable fields, nested objects.
4. **Header validation** — Content-Type, Cache-Control, CORS headers, rate-limit headers (X-RateLimit-*).
5. **HATEOAS/links** — If using hypermedia, validate `_links` or `Link` headers for discoverability.

```
Test Matrix per Endpoint:
┌─────────────┬───────┬──────────┬──────────┬───────────┬──────────┐
│ Endpoint    │ Happy │ Bad Input│ Auth     │ Not Found │ Conflict │
├─────────────┼───────┼──────────┼──────────┼───────────┼──────────┤
│ GET /users  │  200  │  400     │  401/403 │   -       │    -     │
│ POST /users │  201  │  422     │  401/403 │   -       │   409    │
│ GET /users/1│  200  │  400     │  401/403 │  404      │    -     │
│ PUT /users/1│  200  │  422     │  401/403 │  404      │   409    │
│ DEL /users/1│  204  │  400     │  401/403 │  404      │    -     │
└─────────────┴───────┴──────────┴──────────┴───────────┴──────────┘
```

### GraphQL Testing Patterns

GraphQL APIs require distinct testing strategies from REST:

- **Query validation** — Test valid queries return expected shapes; invalid queries return structured errors.
- **Mutation testing** — Verify create/update/delete operations and their side effects.
- **Subscription testing** — Use WebSocket clients to verify real-time event delivery.
- **Schema evolution** — Ensure new fields do not break existing queries (additive-only changes).
- **N+1 detection** — Use DataLoader and monitor resolver call counts in tests.
- **Depth/complexity limiting** — Verify queries exceeding max depth or complexity are rejected (HTTP 400).
- **Introspection control** — Verify introspection is disabled in production environments.

```javascript
// Example: testing GraphQL query depth limiting
const deepQuery = `{ user { posts { comments { author { posts { comments { id }}}}}}}`;
const res = await request(app).post('/graphql').send({ query: deepQuery });
expect(res.body.errors[0].message).toContain('exceeds maximum depth');
```

### gRPC Testing Patterns

- **Proto contract validation** — Verify .proto files are backward compatible using `buf breaking`.
- **Unary RPC testing** — Standard request-response validation with proper status codes (OK, NOT_FOUND, INVALID_ARGUMENT).
- **Streaming tests** — Test server-streaming, client-streaming, and bidirectional streaming RPCs.
- **Deadline/timeout handling** — Verify services respect deadline propagation and return DEADLINE_EXCEEDED.
- **Metadata testing** — Validate gRPC metadata (headers/trailers) carry expected values.
- **Tools** — grpcurl for CLI testing, ghz (v0.120+) for load testing, Postman (v10+) for GUI-based gRPC testing.

### Contract Testing

Contract testing verifies that consumer expectations match provider capabilities without requiring both services to run simultaneously.

**Consumer-Driven (Pact v13):**
1. Consumer writes tests defining expected interactions (request shape + expected response).
2. Pact generates a contract file (pact.json) from consumer tests.
3. Provider verifies it can fulfill all consumer contracts.
4. Pact Broker (or PactFlow) stores contracts and tracks verification status.

**Provider-Driven / Spec-Driven (Specmatic 1.3+):**
1. OpenAPI spec serves as the contract.
2. Specmatic generates tests from the spec automatically.
3. Both consumer stubs and provider tests derived from the same spec.
4. Backward compatibility checked by comparing spec versions.

**Best practices:**
- Use matchers (type-based) over exact values — contracts should be as loose as possible.
- Run consumer tests on every consumer commit; provider verification on every provider commit.
- Tag contracts with branch/environment (dev, staging, prod) via Pact Broker.
- Use `can-i-deploy` CLI to gate deployments based on contract verification status.

### Schema Validation

Validate API responses against schemas at two levels:

1. **Design-time** — Lint OpenAPI specs with Spectral (v6+) or Redocly CLI. Enforce naming conventions, require descriptions, ban breaking changes.
2. **Runtime** — Validate responses against JSON Schema in tests using ajv (v8+) or zod.

```javascript
// Runtime schema validation with ajv
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(userSchema);
const valid = validate(response.body);
expect(valid).toBe(true);
expect(validate.errors).toBeNull();
```

### Test Data Management

- **Factories over fixtures** — Use libraries like fishery (TS) or factory-bot (Ruby) to generate test data programmatically.
- **Database seeding** — Use dedicated seed scripts; reset DB state before each test suite (not each test for speed).
- **Isolated test databases** — Use Testcontainers to spin up ephemeral Postgres/MySQL/MongoDB per test run.
- **Avoid shared mutable state** — Each test should create its own data; never depend on data from another test.
- **Sensitive data** — Use faker.js/Faker (Python) for PII; never use production data in tests.

### API Versioning Testing

- **URL versioning** (`/v1/`, `/v2/`) — Test both versions simultaneously during migration periods.
- **Header versioning** (`Accept: application/vnd.api+json;version=2`) — Verify correct version routing.
- **Backward compatibility** — Old clients must continue working after new version deploys.
- **Deprecation headers** — Verify `Sunset` and `Deprecation` headers are present on deprecated endpoints.
- **Version matrix testing** — Maintain a test suite per active version; retire tests when versions sunset.

### Idempotency Testing

- **POST with Idempotency-Key** — Send identical POST requests with same key; verify only one resource created.
- **PUT idempotency** — Verify repeated PUT requests produce identical state.
- **DELETE idempotency** — Second DELETE should return 204 or 404 consistently (document which).
- **Concurrent idempotency** — Send parallel identical requests; verify no duplicate side effects.
- **Key expiry** — Verify idempotency keys expire after documented TTL.

### Pagination and Filtering Testing

- **Offset-based** — Test `?page=1&limit=20`, verify total count, boundary pages (first/last/beyond).
- **Cursor-based** — Test `?cursor=abc&limit=20`, verify next/prev cursors, empty pages.
- **Filtering** — Test each filter parameter independently and in combination.
- **Sorting** — Verify `?sort=created_at:desc` returns correctly ordered results.
- **Edge cases** — Empty results, single result, limit=0, limit=max+1, negative page numbers.
- **Consistency** — Verify pagination remains stable when data changes between page fetches (cursor > offset).

---

## Anti-Patterns & Pitfalls

### 1. Testing Only the Happy Path
**Why it is a problem:** Production traffic includes malformed requests, missing fields, wrong types, and boundary values. If you only test valid inputs, you miss entire categories of bugs — 400-level errors, validation gaps, and crash-inducing payloads reach production.

### 2. Hardcoding Test Data and URLs
**Why it is a problem:** Tests break when environments change. Hardcoded IDs couple tests to specific database state. Use environment variables for URLs and factories/builders for test data.

### 3. Ignoring Response Schema Validation
**Why it is a problem:** A test that checks `status === 200` but ignores the response body can pass even when the API returns completely wrong data. Always validate response structure against a schema (OpenAPI, JSON Schema, or Zod).

### 4. Sharing Mutable State Between Tests
**Why it is a problem:** Test A creates a user; Test B updates it; Test C deletes it. If Test B fails, Test C fails too — but not because of its own bug. This creates flaky, order-dependent test suites that are impossible to debug or parallelize.

### 5. Over-Mocking (Testing the Mocks, Not the API)
**Why it is a problem:** When you mock the HTTP client, database, and every dependency, you are testing whether your mock returns what you told it to return. Integration tests with real databases (via Testcontainers) catch real bugs that unit tests with mocks miss entirely.

### 6. Ice Cream Cone Anti-Pattern
**Why it is a problem:** Having more E2E tests than unit/integration tests inverts the testing pyramid. E2E tests are slow (10-60s each), flaky (network, timing), and expensive to maintain. A suite of 500 E2E tests creates a 2-hour CI pipeline that nobody trusts.

### 7. Not Testing Error Responses
**Why it is a problem:** APIs must return structured, consistent error responses (error code, message, field-level details). If error responses are untested, consumers get inconsistent formats — sometimes a string, sometimes an object, sometimes HTML — breaking client error handling.

### 8. Ignoring Authentication and Authorization Edge Cases
**Why it is a problem:** Testing only "valid token returns 200" misses critical security bugs: expired tokens, tokens with wrong scopes, tokens for wrong tenant, missing tokens. Each of these must return the correct 401/403 with appropriate error details.

### 9. Not Testing Rate Limiting
**Why it is a problem:** Rate limits protect your API from abuse and resource exhaustion. Without tests, you discover they are misconfigured when a client gets throttled unexpectedly or — worse — when a DDoS succeeds because limits were never enforced.

### 10. Coupling Tests to Implementation Details
**Why it is a problem:** Testing internal database state, checking SQL queries, or asserting on internal function calls makes tests break when you refactor internals, even if the API behavior is unchanged. Test the API contract (request in, response out), not the implementation.

### 11. Making Tests Too DRY
**Why it is a problem:** Over-abstracting test code into helper functions and shared variables makes individual tests unreadable. Test code should be DAMP (Descriptive And Meaningful Phrases) — some repetition is acceptable if it makes each test self-contained and easy to understand when it fails.

### 12. Not Testing Backward Compatibility
**Why it is a problem:** Adding a required field, changing a field type, or removing an endpoint breaks existing clients silently. Without backward compatibility tests, you ship breaking changes that cause production incidents for consumers.

### 13. Sequential Test Dependencies
**Why it is a problem:** Tests that must run in a specific order (create -> read -> update -> delete) cannot be parallelized and create cascading failures. Each test should set up its own preconditions and tear down its own data.

### 14. Ignoring Timeout and Retry Behavior
**Why it is a problem:** APIs that do not handle timeouts gracefully can hang indefinitely. Clients that do not implement retry with backoff can amplify failures. Test that your API responds within documented SLA even under load, and that client retries use exponential backoff.

### 15. Testing Against Production Data
**Why it is a problem:** Using production data in tests risks exposing PII, creates GDPR/compliance violations, and makes tests non-deterministic (data changes). Use synthetic data generators (faker.js, Faker) with realistic but fictional data.

---

## Testing Strategy

### What to Test at Each Layer

| Layer       | What to Test                                                        |
|-------------|---------------------------------------------------------------------|
| Unit        | Input validation, business logic, serialization, error mapping      |
| Integration | DB queries, cache behavior, queue publish/consume, external calls   |
| Contract    | Request/response shapes between consumer and provider               |
| E2E         | Critical user journeys across deployed services, auth flows         |

### Positive, Negative, Boundary, and Edge Case Testing

**Positive tests** — Valid inputs produce expected outputs:
- Correct request body returns 200/201 with expected data.
- Valid query parameters filter/sort correctly.

**Negative tests** — Invalid inputs produce appropriate errors:
- Missing required fields return 422 with field-level errors.
- Wrong data types (string where int expected) return 400.
- Unauthorized requests return 401; forbidden requests return 403.

**Boundary tests** — Limits of acceptable input:
- String fields at min/max length.
- Numeric fields at min/max value, zero, negative.
- Array fields empty, at max size, one over max.
- Date fields at epoch, far future, leap seconds.

**Edge case tests** — Unusual but valid scenarios:
- Unicode, emoji, RTL text in string fields.
- Extremely large payloads (test 413 response).
- Concurrent requests for the same resource.
- Requests during service deployment (graceful shutdown).

### Authentication and Authorization Testing

```
Auth Test Matrix:
┌───────────────────────┬──────┬──────┬──────┬──────┐
│ Scenario              │ GET  │ POST │ PUT  │ DEL  │
├───────────────────────┼──────┼──────┼──────┼──────┤
│ No token              │ 401  │ 401  │ 401  │ 401  │
│ Expired token         │ 401  │ 401  │ 401  │ 401  │
│ Malformed token       │ 401  │ 401  │ 401  │ 401  │
│ Valid token, no scope │ 403  │ 403  │ 403  │ 403  │
│ Valid token, read     │ 200  │ 403  │ 403  │ 403  │
│ Valid token, write    │ 200  │ 201  │ 200  │ 204  │
│ Valid token, admin    │ 200  │ 201  │ 200  │ 204  │
│ Other tenant's token  │ 403  │ 403  │ 403  │ 403  │
└───────────────────────┴──────┴──────┴──────┴──────┘
```

### Rate Limiting and Throttling Tests

- Verify `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.
- Send requests at the limit boundary; verify 429 returned at limit+1.
- Verify `Retry-After` header value is accurate.
- Test per-user, per-IP, and per-API-key rate limits independently.
- Verify rate limits reset correctly after the window expires.

### Error Response Validation

Enforce a consistent error response format across all endpoints:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "must be a valid email address" },
      { "field": "age", "message": "must be a positive integer" }
    ],
    "requestId": "req_abc123",
    "timestamp": "2026-03-07T12:00:00Z"
  }
}
```

Test that ALL error paths (400, 401, 403, 404, 409, 422, 429, 500) follow this format.

### Backward Compatibility Testing

- **Additive changes** — New optional fields, new endpoints: verify old clients still work.
- **Spec diffing** — Use `oasdiff` (v1.10+) to detect breaking changes between OpenAPI spec versions.
- **Consumer contract replay** — Run all existing Pact contracts against the new provider version.
- **Shadow testing** — Replay production traffic against the new version and compare responses.

### Load and Stress Testing

| Pattern   | Description                                        | Tool           |
|-----------|----------------------------------------------------|----------------|
| Ramp-up   | Gradually increase users: 0→100 over 5 min         | k6, Artillery  |
| Spike     | Sudden burst: 10→500 users instantly                | k6, Locust     |
| Soak      | Sustained load for 2-4 hours; detect memory leaks  | k6, Gatling    |
| Stress    | Push beyond capacity until failure; find break point| k6, Locust     |
| Breakpoint| Incrementally add load until error rate > threshold | k6             |

---

## Performance Considerations

### API Performance Benchmarking

Establish baselines before optimizing. Measure under realistic conditions:

- **Warm-up phase** — Run 30-60s of traffic before measuring to prime caches and JIT.
- **Steady-state measurement** — Collect metrics over 5+ minutes of stable load.
- **Percentile-based reporting** — Never use averages alone; always report p50, p95, p99.

### Response Time Thresholds

| Tier                  | p50 Target | p95 Target | p99 Target |
|-----------------------|------------|------------|------------|
| Internal microservice | <50ms      | <100ms     | <200ms     |
| Public REST API       | <200ms     | <500ms     | <1000ms    |
| Complex queries/reports| <500ms    | <2000ms    | <5000ms    |
| Real-time/WebSocket   | <20ms      | <50ms      | <100ms     |

**Rule:** p99 should be within 2-3x of p50. A wider gap indicates tail latency issues (GC pauses, cold caches, lock contention).

**SLO example:** "99th percentile latency for `/api/v1/orders` under 500ms at 1000 RPS, measured over 30-day rolling window."

### Load Testing Patterns

```
Ramp-Up Pattern:              Spike Pattern:
Users                         Users
 100 ┤     ┌──────┐            500 ┤  ┌┐
  75 ┤    /│      │            375 ┤  ││
  50 ┤   / │      │            250 ┤  ││
  25 ┤  /  │      │            125 ┤  ││
   0 ┤─/   │      └──          0  ┤──┘└──────
     0  2  4  6  8  10 min        0  2  4  6  8 min

Soak Pattern:                 Stress/Breakpoint:
Users                         Users
 100 ┤  ┌────────────┐         500 ┤            /
  75 ┤  │            │         375 ┤          /
  50 ┤  │            │         250 ┤        /
  25 ┤ /│            │         125 ┤      /
   0 ┤/ │            └──        0  ┤────/
     0      2      4 hours        0  5  10  15  20 min
```

### Throughput Testing

- Measure **requests per second (RPS)** at various concurrency levels.
- Identify the **saturation point** — the RPS where error rate exceeds 1% or latency exceeds SLA.
- Test **payload size impact** — compare throughput for 1KB, 10KB, 100KB, 1MB responses.
- Verify **connection pooling** — test with and without keep-alive; measure connection setup overhead.

### Connection Handling Testing

- **Keep-alive** — Verify HTTP/1.1 keep-alive reduces latency for sequential requests.
- **Connection limits** — Test behavior when max connections reached (should queue, not crash).
- **Graceful shutdown** — During deployment, verify in-flight requests complete (drain period).
- **HTTP/2 multiplexing** — Verify concurrent streams over single connection improve throughput.
- **WebSocket stability** — Hold connections open for hours; verify no memory leaks or disconnects.

---

## Security Considerations

### OWASP API Security Top 10 (2023 Edition)

| #   | Risk                                         | Test Approach                                            |
|-----|----------------------------------------------|----------------------------------------------------------|
| API1| Broken Object Level Authorization (BOLA)     | Access resource with ID belonging to another user/tenant |
| API2| Broken Authentication                        | Test weak passwords, credential stuffing, token reuse    |
| API3| Broken Object Property Level Authorization   | Send fields user should not update (role, isAdmin)       |
| API4| Unrestricted Resource Consumption            | Send huge payloads, deep nesting, many concurrent reqs   |
| API5| Broken Function Level Authorization (BFLA)   | Call admin endpoints with regular user credentials       |
| API6| Unrestricted Access to Sensitive Business Flows| Automate business flows (purchase, signup) at scale    |
| API7| Server-Side Request Forgery (SSRF)           | Inject internal URLs in URL-accepting parameters         |
| API8| Security Misconfiguration                    | Check default credentials, verbose errors, open CORS     |
| API9| Improper Inventory Management                | Discover undocumented/shadow endpoints via fuzzing       |
| API10| Unsafe Consumption of APIs                  | Test how your API handles malicious data from third parties|

### Authentication Bypass Testing

- Attempt access without any credentials (missing Authorization header).
- Send expired, revoked, and malformed JWT tokens.
- Test JWT algorithm confusion (alg: none, RS256→HS256).
- Verify token signature validation (modify payload, keep signature).
- Test OAuth2 flows: authorization code replay, PKCE bypass, scope escalation.
- Check for API keys exposed in URLs, logs, or error messages.

### Injection Testing

- **SQL injection** — `' OR 1=1 --`, `'; DROP TABLE users; --` in query parameters and body fields.
- **NoSQL injection** — `{"$gt": ""}`, `{"$ne": null}` in MongoDB query parameters.
- **Command injection** — `; ls -la`, `| cat /etc/passwd` in fields processed by shell commands.
- **LDAP injection** — `*)(uid=*))(|(uid=*` in authentication fields.
- **Header injection** — `\r\nX-Injected: true` in user-controlled header values.

Use Schemathesis (v3.36+) for automated property-based fuzzing against OpenAPI specs — academic research shows it detects 1.4x-4.5x more defects than other fuzzing tools.

### Broken Authorization Testing (BOLA/BFLA)

```
BOLA Test Pattern:
  User A owns Resource 1
  User B owns Resource 2

  Test: User A requests GET /resources/2 → must return 403 or 404
  Test: User A requests PUT /resources/2 → must return 403 or 404
  Test: User A requests DELETE /resources/2 → must return 403 or 404

BFLA Test Pattern:
  Regular user calls:
    POST /admin/users      → must return 403
    DELETE /admin/config   → must return 403
    GET /internal/metrics  → must return 403 or 404
```

### Rate Limiting and Resource Exhaustion

- Send requests exceeding documented rate limits; verify 429 response.
- Send extremely large request bodies (100MB+); verify 413 response.
- Send deeply nested JSON (1000+ levels); verify rejection.
- Open many concurrent connections; verify server remains responsive.
- Test slowloris attacks (slow headers/body); verify timeouts.

### API Fuzzing

- **Schema-based fuzzing** — Schemathesis generates test cases from OpenAPI/GraphQL schemas automatically.
- **Property-based testing** — Use Hypothesis (Python) or fast-check (JS) for structured random input generation.
- **Mutation-based fuzzing** — Modify valid requests: swap types, add fields, truncate values, inject special characters.
- **Tools** — Schemathesis v3.36+, RESTler (Microsoft), Burp Suite API scanning, StackHawk (CI-integrated).

---

## Integration Patterns

### CI/CD Integration for API Tests

```yaml
# GitHub Actions example — layered API test pipeline
name: API Tests
on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test:unit          # <30s gate
      - run: npm run test:integration   # <2min gate

  contract:
    needs: unit-integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:contract
      - run: npx pact-broker can-i-deploy  # deployment gate

  e2e:
    needs: contract
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e -- --project=api-tests
```

### Mock Servers

| Tool      | Best For                              | Protocol Support        | Spec-Driven |
|-----------|---------------------------------------|-------------------------|-------------|
| WireMock  | Java/JVM ecosystems, complex scenarios| HTTP, HTTPS             | Partial     |
| MSW v2    | Frontend JS/TS, Service Workers       | HTTP (browser + Node)   | No          |
| Prism v5  | OpenAPI-first teams, design-time mocks| HTTP (OpenAPI v2/v3.1)  | Yes         |
| Mockoon   | GUI-based quick mocking               | HTTP, HTTPS             | Import only |
| json-server| Quick REST prototype from JSON file  | HTTP                    | No          |

**When to use each:**
- **Prism** — You have an OpenAPI spec and want auto-generated, spec-compliant mocks with validation.
- **WireMock** — You need stateful mocking, fault injection, or recording of real traffic for replay.
- **MSW** — You are mocking APIs consumed by a frontend application (intercepts at the network level).

### Service Virtualization

Service virtualization goes beyond mocking by simulating entire service behaviors including stateful interactions, latency profiles, and failure modes:

- **Testcontainers** (v0.10+) — Spin up real dependencies (Postgres, Redis, Kafka) in containers per test run.
- **LocalStack** — Simulate AWS services (S3, SQS, DynamoDB) locally for integration tests.
- **WireMock Cloud** — Team-shared virtual services with recorded behaviors.

### Test Environments and Data Isolation

- **Ephemeral environments** — Spin up per-PR preview environments (Vercel, Railway, Kubernetes namespaces).
- **Database isolation** — Use separate schemas or databases per test run; never share with other test suites.
- **Secret management** — Use environment-specific vaults (Doppler, AWS SSM); never hardcode API keys in tests.
- **Test data seeding** — Idempotent seed scripts that create known baseline data; run before each suite.

### API Monitoring

- **Synthetic monitoring** — Scheduled API health checks from multiple regions (Checkly, Datadog Synthetics, Postman Monitors).
- **Contract monitoring** — Continuous verification that deployed APIs match their OpenAPI spec.
- **Alerting thresholds** — Alert on p99 > 2x baseline, error rate > 0.1%, or 5xx spike.
- **Dashboard metrics** — Request volume, latency percentiles, error rates, availability %, top errors by endpoint.

---

## DevOps & Deployment

### API Test Gates in CI/CD

```
PR Merge Gate (must pass):
  ✓ Unit tests         (< 1 min)
  ✓ Integration tests  (< 3 min)
  ✓ Contract tests     (< 2 min)
  ✓ Schema lint        (< 30s, via Spectral/Redocly)
  ✓ Breaking change detection (< 30s, via oasdiff)

Staging Deploy Gate (must pass):
  ✓ E2E API tests against staging
  ✓ Smoke tests (critical paths only)
  ✓ can-i-deploy (Pact Broker)

Production Deploy Gate:
  ✓ Canary deployment with traffic split
  ✓ Synthetic monitoring green for 15 min
  ✓ Error rate < 0.1% on canary
  ✓ p99 latency within SLA on canary
```

### Environment Management for API Testing

- **Environment parity** — Staging must mirror production in API versions, auth config, rate limits.
- **Feature flags** — Test API behavior with flags on and off; verify graceful degradation.
- **DNS/routing** — Use environment-specific base URLs via config, never hardcoded.
- **Data residency** — Ensure test environments comply with same data residency rules as production.

### Test Data Seeding and Cleanup

- **Before suite** — Run idempotent seed scripts to create baseline data (users, products, config).
- **Before each test** — Create test-specific data via API calls or direct DB inserts.
- **After each test** — Clean up created resources (soft delete or hard delete depending on test type).
- **After suite** — Drop ephemeral databases/schemas; garbage-collect orphaned test data.
- **Never** — Depend on manually created data in shared environments.

### API Documentation Testing

| Tool         | Approach                           | Best For                          |
|--------------|------------------------------------|-----------------------------------|
| Schemathesis | Property-based fuzzing from spec   | Finding edge cases, security bugs |
| Dredd        | Contract validation against spec   | Ensuring doc matches implementation|
| Optic        | Diff-based API change detection    | Catching undocumented changes     |
| oasdiff      | Breaking change detection          | CI gate for backward compatibility|
| Spectral     | OpenAPI spec linting               | Enforcing API design standards    |

Run `schemathesis run --url http://localhost:3000 --spec openapi.yaml` in CI to catch undocumented behaviors.

### Production API Monitoring

- **Health checks** — `GET /health` returning service status, dependency connectivity, version info.
- **Canary analysis** — Compare canary metrics (latency, error rate) against baseline automatically.
- **Alerting** — PagerDuty/Opsgenie alerts on availability < 99.9%, error rate > 0.5%, p99 > SLA.
- **Runbooks** — Link alerts to API-specific runbooks with diagnostic steps and rollback procedures.

---

## Decision Trees

### Which API Testing Tool?

```
Start: What is your primary need?
│
├─ Automated tests in code (CI/CD)?
│  ├─ Node.js/TypeScript project?
│  │  ├─ Testing Express/Fastify/Nest directly? → Supertest + Jest/Vitest
│  │  ├─ Testing deployed API + browser tests? → Playwright API Testing
│  │  └─ Contract testing needed? → Pact JS v13
│  ├─ Python project?
│  │  ├─ Testing FastAPI/Django directly? → pytest + httpx
│  │  └─ Load testing needed? → Locust
│  └─ JVM project? → REST Assured + WireMock
│
├─ Manual/exploratory API testing?
│  ├─ Need Git-native, no cloud dependency? → Bruno
│  ├─ Need team collaboration + cloud sync? → Postman
│  └─ Need OpenAPI-first mock server? → Prism
│
└─ Load/performance testing?
   ├─ Developer-friendly, JS scripting, CI-native? → k6 (v1.0+)
   ├─ Python team, distributed testing? → Locust
   └─ YAML-based, quick setup? → Artillery (v2.0+)
```

### Contract Testing: When and How?

```
Start: How many services consume your API?
│
├─ 1 consumer (monolith or single client)
│  └─ Contract testing optional
│     └─ Use integration tests + OpenAPI validation instead
│
├─ 2-5 consumers
│  ├─ Consumers owned by same team? → Spec-driven (Specmatic)
│  └─ Consumers owned by different teams? → Consumer-driven (Pact)
│
└─ 6+ consumers or public API
   ├─ Have OpenAPI spec as source of truth? → Specmatic + oasdiff
   ├─ No spec, consumers define needs? → Pact + PactFlow
   └─ Both? → Pact for internal + Schemathesis for public
```

### When to Mock vs Use Real Dependencies?

```
Start: What dependency are you testing against?
│
├─ Database (Postgres, MongoDB, Redis)
│  ├─ Unit tests → Mock the repository layer
│  └─ Integration tests → Use Testcontainers (real DB in Docker)
│
├─ External third-party API (Stripe, Twilio, AWS)
│  ├─ Unit tests → Mock the HTTP client
│  ├─ Integration tests → Use WireMock/MSW with recorded responses
│  └─ E2E tests → Use sandbox/test environments provided by vendor
│
├─ Internal microservice
│  ├─ Unit tests → Mock the service client
│  ├─ Contract tests → Use Pact (consumer mock, provider verify)
│  └─ E2E tests → Use real service in staging
│
└─ Message queue (Kafka, RabbitMQ, SQS)
   ├─ Unit tests → Mock the producer/consumer
   └─ Integration tests → Use Testcontainers (real broker)
```

---

## Code Examples

### 1. REST API Testing with Supertest + Jest

```typescript
// tests/api/users.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';

describe('POST /api/v1/users', () => {
  afterEach(async () => {
    await db('users').truncate();
  });

  it('creates a user with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com' })
      .set('Authorization', `Bearer ${testToken}`)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
    });
  });

  it('returns 422 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Test', email: 'not-an-email' })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(422);

    expect(res.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'email' })
    );
  });

  it('returns 401 without auth token', async () => {
    await request(app)
      .post('/api/v1/users')
      .send({ name: 'Test', email: 'test@example.com' })
      .expect(401);
  });
});
```

### 2. Playwright API Testing

```typescript
// tests/api/orders.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Orders API', () => {
  let orderId: string;

  test('creates an order and retrieves it', async ({ request }) => {
    // Create
    const createRes = await request.post('/api/v1/orders', {
      data: {
        items: [{ productId: 'prod_001', quantity: 2 }],
        shippingAddress: { city: 'London', postalCode: 'SW1A 1AA' },
      },
      headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
    });
    expect(createRes.status()).toBe(201);

    const order = await createRes.json();
    orderId = order.id;
    expect(order.items).toHaveLength(1);
    expect(order.status).toBe('pending');

    // Retrieve
    const getRes = await request.get(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
    });
    expect(getRes.status()).toBe(200);
    expect(await getRes.json()).toMatchObject({ id: orderId, status: 'pending' });
  });

  test('returns 404 for non-existent order', async ({ request }) => {
    const res = await request.get('/api/v1/orders/non_existent_id', {
      headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
    });
    expect(res.status()).toBe(404);
  });
});
```

### 3. Pact Consumer Contract Test (Pact JS v13)

```typescript
// tests/contract/user-service.consumer.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { UserApiClient } from '../../src/clients/user-api';

const { like, eachLike, string, integer, uuid } = MatchersV3;

const provider = new PactV4({
  consumer: 'OrderService',
  provider: 'UserService',
});

describe('UserService API Contract', () => {
  it('returns user details by ID', async () => {
    await provider
      .addInteraction()
      .given('user with ID user-001 exists')
      .uponReceiving('a request for user details')
      .withRequest('GET', '/api/v1/users/user-001', (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({
            id: uuid('user-001'),
            name: string('Ada Lovelace'),
            email: string('ada@example.com'),
            orderCount: integer(5),
          });
      })
      .executeTest(async (mockServer) => {
        const client = new UserApiClient(mockServer.url);
        const user = await client.getUserById('user-001');

        expect(user.id).toBe('user-001');
        expect(user.name).toBeDefined();
        expect(user.email).toContain('@');
      });
  });
});
```

### 4. k6 Load Test Script

```javascript
// load-tests/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderLatency = new Trend('order_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp up to 50 users
    { duration: '5m', target: 50 },   // hold at 50 users
    { duration: '2m', target: 200 },  // ramp up to 200 users
    { duration: '5m', target: 200 },  // hold at 200 users
    { duration: '2m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
    errors: ['rate<0.01'],                            // error rate < 1%
    order_latency: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  // List orders
  const listRes = http.get(`${BASE_URL}/api/v1/orders?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  check(listRes, {
    'list status is 200': (r) => r.status === 200,
    'list returns array': (r) => Array.isArray(r.json().data),
  }) || errorRate.add(1);

  // Create order
  const createRes = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify({
      items: [{ productId: 'prod_001', quantity: 1 }],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );
  check(createRes, {
    'create status is 201': (r) => r.status === 201,
    'create returns id': (r) => r.json().id !== undefined,
  }) || errorRate.add(1);
  orderLatency.add(createRes.timings.duration);

  sleep(1); // simulate user think time
}
```

### 5. OpenAPI Schema Validation in CI

```typescript
// tests/schema/validate-responses.test.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import request from 'supertest';
import { app } from '../../src/app';
import openApiSpec from '../../openapi.yaml'; // loaded via yaml-loader

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function getResponseSchema(path: string, method: string, status: number) {
  return openApiSpec.paths[path]?.[method]?.responses?.[status]?.content
    ?.['application/json']?.schema;
}

describe('Response Schema Validation', () => {
  it('GET /api/v1/users matches OpenAPI schema', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    const schema = getResponseSchema('/api/v1/users', 'get', 200);
    const validate = ajv.compile(schema);
    const valid = validate(res.body);

    if (!valid) {
      console.error('Schema validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });
});
```

---

*Researched: 2026-03-07 | Sources: [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [Pact Documentation](https://docs.pact.io/), [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/), [Playwright API Testing](https://playwright.dev/docs/api-testing), [Schemathesis](https://schemathesis.io/), [Specmatic Contract Testing](https://docs.specmatic.io/contract_driven_development/contract_testing), [Supertest npm](https://www.npmjs.com/package/supertest), [API Response Time Benchmarks](https://odown.com/blog/api-response-time-standards/), [Bruno API Client](https://www.usebruno.com/), [WireMock](https://wiremock.org/), [Capital One Schemathesis Guide](https://www.capitalone.com/tech/software-engineering/api-testing-schemathesis/), [BrowserStack API Simulation Tools](https://www.browserstack.com/guide/api-simulation-tools-comparison), [GraphQL Testing Best Practices](https://www.graphql-js.org/docs/testing-best-practices/), [Latency Percentiles Explained](https://oneuptime.com/blog/post/2025-09-15-p50-vs-p95-vs-p99-latency-percentiles/view)*
