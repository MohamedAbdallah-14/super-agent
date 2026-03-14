# Stateless Design — Architecture Expertise Module

> Stateless design means each request contains all information needed to process it — servers don't store client state between requests. This enables horizontal scaling (any server can handle any request), simplifies deployment, and improves reliability. But not everything can or should be stateless — databases, WebSocket servers, and caches are inherently stateful. The goal is not to eliminate state, but to externalize it from the application process.

> **Category:** Scaling
> **Complexity:** Moderate
> **Applies when:** Designing services that need to scale horizontally, survive server failures, or deploy without downtime

---

## What This Is (and What It Isn't)

A stateless service treats every request as an independent, self-contained transaction. The server holds no memory of previous interactions — no session objects in memory, no user-specific data cached in the process, no sticky connections required. Every piece of information the server needs to handle a request arrives with the request itself: in headers, tokens, query parameters, or the request body.

The concept traces directly to HTTP's original design. HTTP/1.0 was stateless by specification — each request-response pair was independent. But the web quickly needed sessions (shopping carts, login state, multi-step forms), and developers bolted state onto a stateless protocol using cookies and server-side session stores. The modern "stateless design" movement is a return to the original principle, aided by better tools for externalizing state.

The Twelve-Factor App methodology codified this as Factor VI: "Execute the app as one or more stateless processes." The memory space or filesystem of the process can be used as a brief, single-transaction cache, but a twelve-factor app never assumes that anything cached in memory or on disk will be available on a future request. Any data that needs to persist must be stored in a stateful backing service, typically a database or external cache.

**The critical distinction: stateless does not mean "no state."** State absolutely exists — user sessions, shopping carts, authentication context, application configuration. The question is where that state lives:

| Approach | State location | Scalability | Failure impact | Complexity |
|---|---|---|---|---|
| Stateful server | In-process memory | Vertical only (sticky sessions) | Server death = lost sessions | Low initially, high at scale |
| Stateless + external store | Redis, database, or client token | Horizontal (any server, any request) | Server death = zero impact | Moderate initially, low at scale |
| Fully client-side | JWT, cookies, local storage | Horizontal (zero server state) | Server death = zero impact | Low initially, moderate at scale |

**What stateless design IS:**

- **Externalizing session state.** User sessions move from in-process memory to an external store (Redis, database) or to the client (JWT, encrypted cookies). The application process becomes disposable — kill it, restart it, replace it, scale it — without losing any user context.
- **Request self-sufficiency.** Each request carries its own authentication context (bearer token, API key), its own routing information, and enough data for the server to process it without looking up "who was this user last time."
- **Process disposability.** Any process can be killed at any time without data loss or user impact. New processes can start and immediately handle traffic. This directly enables zero-downtime deployments, autoscaling, and failure recovery.

**What stateless design IS NOT:**

- **Not "no database."** Stateless services still read from and write to databases. The database is stateful — the application process is not. The process is a pure function over the request plus external state.
- **Not "no caching."** Stateless services absolutely use caches. The distinction is between in-process caches (ephemeral, lost on restart, local to one instance) and external caches (Redis, Memcached — shared, persistent, accessible by all instances). Both are valid; the in-process cache just cannot be relied upon across requests.
- **Not "everything must be stateless."** Databases are stateful. Message brokers are stateful. WebSocket connection managers are stateful. Cache clusters are stateful. The architecture is stateless at the application tier, not at every tier.
- **Not "JWT everywhere."** JWT is one tool for carrying state on the client side. It is not the only tool, and it introduces its own significant problems (revocation, token bloat, security). Server-side sessions stored in Redis are equally "stateless" from the application process's perspective.
- **Not a performance optimization.** Externalizing state to Redis adds a network hop (~0.5-2ms) that did not exist when state was in-process memory (~0.001ms). You accept this latency in exchange for horizontal scalability and fault tolerance.

**Common misconceptions that cause real damage:**

1. "Stateless means we don't need sessions." You still need sessions. You need them externalized, not eliminated. Users still log in, maintain shopping carts, and navigate multi-step workflows.
2. "JWT solves all session problems." JWT creates new problems — token revocation requires server-side state (a denylist), token bloat increases bandwidth on every request, and storing sensitive data in client-readable tokens is a security risk.
3. "Stateless is always better." A single-server application with 100 users gains nothing from stateless design. The complexity of external session stores and token management is not free. Stateless design pays off at scale.
4. "If we use containers, we're automatically stateless." Containers can hold in-process state just as easily as VMs. Containerization is orthogonal to statelessness. A container running a Rails app with in-memory sessions is stateful.

---

## When to Use It

### Web APIs and REST services

REST is stateless by definition — each request from a client must contain all the information necessary for the server to fulfill the request. Any service exposed as a REST API should be designed stateless. Authentication travels via bearer tokens or API keys in the `Authorization` header. Pagination state travels via query parameters or cursor tokens. The server needs no memory of previous requests.

### Services behind a load balancer

The moment you put two or more instances behind a load balancer, in-process state becomes a problem. User A logs in and their session is stored in Server 1's memory. Their next request routes to Server 2, which has no knowledge of the session. The options are: sticky sessions (fragile, defeats the purpose of load balancing), session replication (expensive, complex), or stateless design (externalize the session). Stateless wins at every scale beyond one server.

### Microservices and containerized workloads

Each microservice instance should be interchangeable. Kubernetes schedules pods across nodes, kills and restarts them for health checks, and scales replicas up and down. If a pod holds in-process state, every lifecycle event is a data loss event. Stateless services treat pods as cattle, not pets.

**Netflix:** Over 700 stateless microservices running on AWS, each horizontally scaled independently. Any instance of any service can handle any request. This architecture handles over 2 billion API requests daily. The stateless design is what makes Netflix's massive horizontal scaling possible — they can spin up hundreds of instances of the recommendation service during peak hours and tear them down at night.

### Serverless and Lambda functions

Serverless functions (AWS Lambda, Google Cloud Functions, Azure Functions) are stateless by design — the runtime creates and destroys function instances at will. You have no control over which instance handles a request, and instances may be recycled between invocations. Any state must live in external stores (DynamoDB, S3, Redis). If your function relies on in-process state, it will produce inconsistent results.

### Services requiring zero-downtime deployment

Blue-green deployments, rolling updates, and canary releases all require that requests can be handled by any version of the service during the transition period. If Server A (old version) holds session state that Server B (new version) cannot access, the deployment will drop users mid-session. Stateless services with externalized state transition seamlessly — the new version reads the same Redis cluster or database as the old version.

### Multi-region and edge deployments

Services deployed across multiple geographic regions must handle requests from any region. A user in Tokyo should not be pinned to a specific server in the Tokyo region — any server should handle any request. Stateless design with a distributed external store (DynamoDB Global Tables, CockroachDB, Redis Cluster with cross-region replication) enables true global deployment.

---

## When NOT to Use It

**This section is deliberately comprehensive because the failure mode of forcing statelessness onto inherently stateful systems creates unnecessary complexity, degrades performance, and solves problems that do not exist.**

### WebSocket servers managing persistent connections

WebSocket connections are inherently stateful — a bidirectional channel between a specific client and a specific server. Chat applications, real-time collaboration tools (Google Docs, Figma), multiplayer games, and live dashboards all maintain per-connection state: the connection itself, subscription lists, user presence, in-flight messages.

Forcing statelessness here means: every WebSocket message would need to carry full authentication and context, connection state would need to be stored externally and read on every message (adding latency to a real-time protocol), and load balancers would need to route reconnections to the correct session state. The standard approach is to keep WebSocket servers stateful while making the REST API tier stateless. Use a pub/sub system (Redis Pub/Sub, NATS) to coordinate between stateful WebSocket servers.

### In-memory caches where latency is critical

An in-process cache serves data in ~0.001ms. An external cache (Redis) serves data in ~0.5-2ms. For most applications, this difference is invisible. But for hot-path operations executed thousands of times per second — template rendering, configuration lookups, frequently accessed reference data — the 500x latency difference matters.

**Real example:** A high-frequency trading platform moved its price cache from in-process to Redis to achieve "statelessness." Per-request latency increased by 1.5ms. On a system executing 10,000 price checks per second, this added 15 seconds of aggregate latency per second — the system could no longer keep up with the market data feed. They moved back to in-process caching with a pub/sub invalidation pattern, accepting that the service was "stateful" for cache purposes while remaining stateless for all other state.

### Workflow engines and long-running processes

Workflow engines (Temporal, Camunda, Apache Airflow) maintain process state by design — which step is active, what data has been accumulated, what compensating actions to take on failure. A three-day approval workflow cannot be stateless because the state IS the workflow. The workflow engine is explicitly and correctly a stateful service.

Attempting to make workflow state external and load it on every step adds enormous complexity with no benefit. The workflow engine already persists state to a database — that is its core responsibility.

### Single-server applications with modest traffic

A side project, internal tool, or small business application serving 50-500 users from a single server gains nothing from stateless design. In-process sessions are simpler, faster, and perfectly adequate. The added complexity of an external Redis instance, JWT token management, or database-backed sessions is overhead that provides no return at this scale.

**The threshold:** When you need your second server, refactor for statelessness. Not before.

### Machine learning inference with model state

ML model serving (TensorFlow Serving, PyTorch inference servers) loads models into GPU memory. These models can be gigabytes in size. Reloading a 7GB model from external storage on every request is not viable. The model state is in-process by necessity. Scaling is achieved by running multiple stateful instances, each with its own loaded model, behind a load balancer — the model state is identical across instances, so any instance can handle any request even though each instance is technically stateful.

### Gaming servers with physics state

Multiplayer game servers maintain authoritative game state — player positions, physics simulations, entity states. This state changes 60 times per second. Externalizing it to Redis or a database at 60Hz with 100 entities would saturate the network and add unacceptable latency. Game servers are correctly stateful, with state persistence happening at lower frequency (checkpoints, save points) and reconnection protocols handling server failures.

---

## How It Works

### Session externalization strategies

The core mechanism of stateless design is moving session state out of the application process. There are three primary strategies, each with distinct trade-offs:

**Strategy 1: Server-side sessions in an external store (Redis/Memcached)**

The application generates a random session ID, stores session data in Redis keyed by that ID, and sends the session ID to the client in a cookie. On subsequent requests, the client sends the cookie, and the application looks up the session in Redis.

```
Client                    App Server (stateless)              Redis (stateful)
  │                              │                                │
  ├── POST /login ──────────────>│                                │
  │                              ├── Authenticate user            │
  │                              ├── SET session:abc123 {...} ───>│
  │                              │                                ├── Store
  │<── Set-Cookie: sid=abc123 ──-│                                │
  │                              │                                │
  ├── GET /dashboard ───────────>│                                │
  │   Cookie: sid=abc123         ├── GET session:abc123 ─────────>│
  │                              │<── {user_id: 42, role: admin} ─│
  │                              ├── Process request              │
  │<── 200 OK ──────────────────-│                                │
```

**Advantages:** Small cookie size (~20 bytes), full server-side control over sessions (instant revocation by deleting the key), session data is opaque to the client (security), well-supported by every web framework.

**Disadvantages:** Redis becomes a dependency for every authenticated request, adds ~0.5-2ms per request for the Redis lookup, Redis itself must be highly available (Redis Sentinel or Redis Cluster).

**Strategy 2: Client-side tokens (JWT)**

The application encodes session data directly into a signed token (JWT) and sends it to the client. The client sends the token with every request. The server validates the signature and reads the claims — no external lookup required.

```
Client                    App Server (stateless)              Nothing needed
  │                              │
  ├── POST /login ──────────────>│
  │                              ├── Authenticate user
  │                              ├── Sign JWT {user_id: 42, role: admin, exp: ...}
  │<── Authorization: Bearer eyJ.──│
  │                              │
  ├── GET /dashboard ───────────>│
  │   Authorization: Bearer eyJ. │
  │                              ├── Verify signature
  │                              ├── Read claims from token
  │                              ├── Process request
  │<── 200 OK ──────────────────-│
```

**Advantages:** No external session store needed (truly stateless), no network hop for session lookup, works across domains and services (single sign-on), scales infinitely (no shared state).

**Disadvantages:** Token revocation is impossible without server-side state (a denylist — which defeats the statelessness). Token bloat: adding roles, permissions, and user data to the JWT increases its size, and this payload is sent with every request. Sensitive data exposure: JWT payloads are Base64-encoded (not encrypted) — anyone can read them. Token lifetime management: short-lived tokens require refresh token flows, adding complexity.

**Strategy 3: Encrypted cookies (server-side secrets, client-side storage)**

The application serializes session data, encrypts it with a server-side key, and stores it in a cookie. The cookie is opaque to the client. On subsequent requests, the server decrypts the cookie and reads the session data.

**Advantages:** No external store, session data is encrypted (unlike JWT), cookie-native (automatic browser handling), easy revocation by rotating the encryption key (invalidates all sessions).

**Disadvantages:** Cookie size limits (4KB per cookie, ~20KB total across all cookies), encrypting/decrypting on every request has CPU cost, rotating the key invalidates ALL sessions (not individual ones).

### The JWT vs. server-side sessions debate

This is one of the most contentious design decisions in web architecture. The honest answer: neither is universally correct.

**Use JWT when:**
- Services need to validate authentication without calling a central auth service (microservices with decentralized auth)
- The system spans multiple domains where cookies cannot be shared
- The session data is small (user ID, role — under 200 bytes of claims)
- Token lifetime is short (5-15 minutes) with refresh tokens for extended sessions
- Immediate revocation is not a hard requirement (or you accept a revocation delay equal to token lifetime)

**Use server-side sessions (Redis) when:**
- Immediate session revocation is required (security-critical applications, banking, healthcare)
- Session data is large or changes frequently (shopping carts, multi-step wizards)
- You need to enumerate active sessions ("show all logged-in devices")
- You need to enforce concurrent session limits ("only 3 active sessions per user")
- The application is a monolith or small number of services sharing a Redis cluster

**The revocation problem in detail:**

The most cited criticism of JWT for authentication is the revocation problem. Once a JWT is issued, it cannot be invalidated until it expires — the server has no record to delete, no session to terminate. If a user's account is compromised, an administrator cannot instantly lock them out.

The workarounds all add state back into the "stateless" system:

1. **Token denylist (blacklist):** Store revoked token IDs in Redis. Check the denylist on every request. This is exactly a session store — you have re-invented server-side sessions with extra steps.
2. **Short-lived tokens + refresh tokens:** Issue access tokens with 5-15 minute lifetimes. Use refresh tokens (stored server-side) to issue new access tokens. Revocation happens by invalidating the refresh token. The security gap is the access token lifetime — a compromised token remains valid for up to 15 minutes.
3. **Token versioning:** Store a "token version" counter per user in the database. Increment it on revocation. Tokens with an older version are rejected. This requires a database lookup on every request — again, adding state.

### Request context: passing state via headers and tokens

In a stateless architecture, request context travels with the request rather than being stored on the server. Common patterns:

- **Authorization header:** `Bearer <jwt>` or `Basic <credentials>` — authenticates every request independently
- **X-Request-ID header:** Unique identifier for distributed tracing — allows correlating logs across services without server-side tracking state
- **X-Correlation-ID header:** Groups related requests (e.g., all API calls triggered by one user action) — passed through service-to-service calls
- **Accept-Language / X-Locale header:** Localization preferences — no server-side user preference lookup needed
- **If-None-Match / ETag headers:** Cache validation — stateless servers can validate cached responses without remembering what they previously sent

### Caching: external vs. in-process trade-offs

Stateless design does not prohibit caching — it constrains where caches live and what guarantees they provide.

**In-process cache (acceptable in stateless design):**
- Configuration data loaded at startup and refreshed periodically
- Compiled templates or regular expressions
- Immutable reference data (country codes, currency formats)
- Rule: in-process caches must be rebuildable from external sources. If the process restarts, the cache rebuilds automatically. No request depends on a specific cache state.

**External cache (Redis/Memcached):**
- User-specific computed data (personalized recommendations, aggregated dashboards)
- Database query results shared across instances
- Rate limiting counters (must be shared across all instances)
- Rule: external caches must have a cache-miss strategy. If the cache is empty (cold start, eviction, Redis restart), the application falls back to the primary data source.

**The cold start problem:** After a deployment, all application instances start with empty in-process caches. If the in-process cache held frequently accessed data (hot product listings, trending content), the first requests after deployment hit the database directly. At scale, this cache stampede can overwhelm the database. Mitigation: cache warming (pre-populate caches at startup), staggered deployments (don't restart all instances simultaneously), or external caches that survive deployments.

---

## Trade-Offs Matrix

| Dimension | Stateless (externalized state) | Stateful (in-process state) | Winner |
|---|---|---|---|
| **Horizontal scaling** | Trivial — add instances, any handles any request | Requires sticky sessions or session replication | Stateless |
| **Server failure impact** | Zero — other instances continue seamlessly | Lost sessions for all users on failed server | Stateless |
| **Deployment complexity** | Rolling updates work naturally, no session draining | Requires connection draining, session migration | Stateless |
| **Per-request latency** | +0.5-2ms for external session lookup | ~0.001ms for in-process session access | Stateful |
| **Infrastructure cost** | Requires Redis/Memcached cluster (additional cost) | No additional infrastructure | Stateful |
| **Operational simplicity** | More moving parts (app + session store + monitoring) | Single process, simpler debugging | Stateful |
| **Session revocation** | Immediate (delete from Redis) or delayed (JWT expiry) | Immediate (delete from memory) | Stateful (Redis) / Draw (JWT) |
| **Multi-region support** | Natural — each region reads from local session store replica | Requires session replication across regions | Stateless |
| **Autoscaling** | Scale to zero and back without session loss | Cannot scale to zero without losing all sessions | Stateless |
| **Cold start performance** | Empty caches after restart, potential stampede | Warm caches lost on restart (same problem, smaller scale) | Draw |
| **Debugging session issues** | Must query external store, cross-reference request IDs | Inspect process memory directly | Stateful |
| **Security surface** | JWT payloads readable by clients; Redis needs securing | Session data never leaves the server | Stateful |

**The honest summary:** Stateless design wins decisively for systems that need to scale beyond a single server, survive failures, or deploy without downtime. Stateful design wins for single-server systems where simplicity and raw performance matter more than scalability. The crossover point is approximately the moment you add a second server instance.

---

## Evolution Path

### Stage 1: Single server with in-process sessions (correct starting point)

For a new application, start with the simplest session management your framework provides — typically in-process sessions stored in memory. Rails uses `CookieStore` by default (encrypted cookies), Express uses `express-session` with `MemoryStore`, Django uses database-backed sessions. This is fine. Ship the product.

At this stage, you have one server, modest traffic, and no need for horizontal scaling. In-process sessions add zero latency and zero infrastructure. Do not add Redis "because we might scale later." YAGNI.

### Stage 2: External session store (when you add the second server)

The trigger: you need a second server instance — for load balancing, high availability, or increased capacity. At this point, in-process sessions break because requests may route to either server.

**Migration path:**
1. Deploy Redis (or use a managed service: AWS ElastiCache, Google Memorystore)
2. Change your session store configuration from in-memory to Redis (typically a one-line configuration change in most frameworks)
3. Deploy the updated application — sessions are now shared across all instances
4. Add the second server behind the load balancer

This migration is usually trivial because web frameworks abstract session storage behind a common interface. Switching from `MemoryStore` to `RedisStore` in Express, or from `cache` to `redis` session driver in Laravel, requires no application code changes.

### Stage 3: Token-based authentication (when services multiply)

The trigger: you now have multiple services (API server, background workers, mobile app backend) that all need to authenticate the same users. Sharing a Redis session store across all services is possible but creates tight coupling — every service depends on the same Redis cluster with the same session format.

**Migration path:**
1. Implement an authentication service that issues JWTs on login
2. Each service validates JWTs independently using the shared public key (no network call to auth service)
3. Use short-lived access tokens (15 minutes) with refresh tokens (stored in the auth service's database)
4. Keep Redis for service-specific session data that is too large for JWTs (shopping cart state, wizard progress)

### Stage 4: Stateless at the edge (when going global)

The trigger: you deploy to multiple regions and need authentication validation at the edge (CDN, API gateway) without calling back to a central auth service.

**Migration path:**
1. API gateway validates JWTs at the edge using the public key (no network round-trip to the origin)
2. User-specific data is cached in regional Redis clusters with cross-region replication
3. Write operations route to the primary region; reads serve from local replicas
4. Token refresh still routes to the auth service, but access token validation is fully distributed

---

## Failure Modes

### Failure Mode 1: JWT token bloat

**What happens:** The team starts adding data to JWT claims — user roles, permissions, feature flags, organization details, subscription tier, user preferences. The token grows from 200 bytes to 4KB. This token is sent with every HTTP request in the `Authorization` header.

**The math:** 4KB token x 100 requests per page load x 10,000 concurrent users = 4GB of bandwidth consumed just by tokens. For mobile users on metered connections, this is especially costly. HTTP/2 header compression (HPACK) helps but cannot eliminate the overhead entirely.

**Prevention:** JWTs should contain only identity claims — user ID, issuer, expiration, and at most a role or scope string. Everything else should be looked up server-side using the user ID from the token. If your JWT exceeds 1KB, you are storing too much in it.

### Failure Mode 2: The JWT revocation gap

**What happens:** A user's account is compromised. The security team needs to lock them out immediately. But the user holds a valid JWT with a 60-minute expiration. For the next 60 minutes, the compromised token grants full access to every service that validates it.

**Real impact:** Financial services, healthcare, and any application handling sensitive data cannot accept a 60-minute revocation gap. This is not a theoretical concern — it is a compliance blocker for SOC 2, HIPAA, and PCI DSS.

**Prevention:** Use short-lived access tokens (5-15 minutes maximum) with refresh tokens. Accept that refresh token validation requires a server-side lookup. For immediate revocation requirements, maintain a token denylist in Redis — accept the trade-off that you are adding state back into the system. For truly critical systems, use server-side sessions in Redis instead of JWTs.

### Failure Mode 3: External session store as single point of failure

**What happens:** The team externalizes all sessions to a single Redis instance. Redis goes down. Every user is instantly logged out. Every authenticated request fails. The stateless application servers are running perfectly, but they cannot validate any session.

**The irony:** The team adopted stateless design to improve reliability. By centralizing all session state in a single Redis instance, they created a single point of failure more catastrophic than any individual application server failure in the old stateful design.

**Prevention:** Redis Sentinel (automatic failover) or Redis Cluster (distributed, no single point of failure). Managed services (AWS ElastiCache, Google Memorystore) handle this automatically. Always deploy session stores with replication and automatic failover. Test the failover path — do not assume it works because the vendor says it does.

### Failure Mode 4: Cache stampede after deployment

**What happens:** The team deploys a new version, restarting all application instances simultaneously. All in-process caches are empty. The first wave of requests hits the database directly. If the application serves 10,000 requests per second and 80% normally hit the cache, 8,000 requests per second suddenly hit the database. The database collapses under the unexpected load.

**Prevention:** Staggered rolling deployments (restart instances one at a time, allowing each to warm its cache before the next restarts). Cache warming at startup (pre-populate hot cache entries from the database or external cache before accepting traffic). External caches (Redis) that survive deployments — even if in-process caches are cold, the Redis cache is warm.

### Failure Mode 5: Stateless services with stateful dependencies creating hidden coupling

**What happens:** The application servers are stateless, but they all depend on the same Redis cluster for sessions and the same PostgreSQL primary for writes. During a Redis network partition or PostgreSQL failover, all "stateless" servers fail simultaneously. The architecture appears distributed but has the same failure domain as a monolith.

**Prevention:** Circuit breakers on external state dependencies — if Redis is unreachable, degrade gracefully (allow unauthenticated access to public endpoints, queue writes). Regional independence — each region has its own Redis replica and database read replica. Distinguish between hard dependencies (authentication must work) and soft dependencies (personalization can degrade).

### Failure Mode 6: Sensitive data in JWT payloads

**What happens:** The team stores user email, phone number, internal user IDs, or permission details in JWT claims. JWT payloads are Base64-encoded, not encrypted — anyone with the token can decode the payload and read all claims. If tokens are logged, cached in CDNs, or stored in browser local storage, sensitive data is exposed.

**Prevention:** JWTs should contain only non-sensitive identifiers (opaque user ID, not email). Sensitive data should be looked up server-side. If you must include sensitive data in client-side tokens, use JWE (JSON Web Encryption) instead of JWS (JSON Web Signature). Better yet, use encrypted server-side sessions where the client only holds an opaque session ID.

---

## Technology Landscape

### JWT libraries and standards

| Technology | Language | Notes |
|---|---|---|
| `jsonwebtoken` (npm) | Node.js | Most popular JWT library for Node. Supports RS256, HS256. Use RS256 for multi-service validation. |
| `PyJWT` | Python | Standard Python JWT library. Use with `cryptography` package for RS256. |
| `jjwt` (Java JWT) | Java | Fluent API for JWT creation and validation. Spring Security integrates natively. |
| `golang-jwt/jwt` | Go | Community-maintained fork of `dgrijalva/jwt-go`. Standard for Go services. |
| `System.IdentityModel.Tokens.Jwt` | .NET | Microsoft's official JWT library. Integrates with ASP.NET Core authentication middleware. |

**Key decisions:**
- **Algorithm:** Use RS256 (asymmetric) for multi-service architectures — services validate with the public key without needing the signing secret. Use HS256 (symmetric) only for single-service scenarios.
- **Token lifetime:** Access tokens: 5-15 minutes. Refresh tokens: 7-30 days (stored server-side with rotation on use).
- **Key rotation:** Use JWKS (JSON Web Key Set) endpoints for key distribution. Rotate signing keys quarterly. Old keys must remain in the JWKS endpoint until all tokens signed with them expire.

### External session stores

| Technology | Latency | Persistence | Clustering | Best for |
|---|---|---|---|---|
| **Redis** | <1ms | Optional (RDB/AOF) | Redis Cluster, Sentinel | Most session management use cases. Sub-millisecond reads. |
| **Memcached** | <1ms | None | Client-side sharding | Simple key-value sessions where persistence is unnecessary. |
| **DynamoDB** | 1-5ms | Durable | Managed, auto-scaling | AWS-native applications needing zero operational overhead. |
| **PostgreSQL** | 2-10ms | Durable | Read replicas | Applications already using PostgreSQL that want to avoid adding Redis. |
| **Valkey** | <1ms | Optional (RDB/AOF) | Cluster, Sentinel | Open-source Redis fork. Drop-in replacement since Redis license change. |

**Redis is the default choice** for session management. It handles thousands of concurrent session operations with sub-millisecond latency, supports automatic expiration (TTL) for sessions, and every major web framework has a Redis session adapter. Deploy with Sentinel or Cluster for high availability.

### Cookie-based session frameworks

| Framework | Default session store | External store support | Session type |
|---|---|---|---|
| **Rails** | Encrypted cookie (CookieStore) | Redis, Memcached, DB via adapters | Server-side or encrypted client-side |
| **Express (Node.js)** | MemoryStore (development only) | `connect-redis`, `connect-mongo` | Server-side with cookie ID |
| **Django** | Database | Redis via `django-redis`, cache, file | Server-side |
| **Spring Boot** | In-memory (Tomcat) | Spring Session + Redis/JDBC | Server-side |
| **Laravel** | File | Redis, database, Memcached, cookie | Server-side or encrypted cookie |
| **ASP.NET Core** | In-memory | Redis, SQL Server via IDistributedCache | Server-side |

### Authentication and identity platforms

| Platform | Type | Stateless support | Notes |
|---|---|---|---|
| **Auth0** | Managed identity | JWT-based, JWKS endpoint | Fully managed. Issues JWTs validated by your services via public key. |
| **Keycloak** | Self-hosted identity | OIDC + JWT | Open-source. Full OAuth2/OIDC provider. Heavier operational burden. |
| **Firebase Auth** | Managed identity | JWT (Firebase ID tokens) | Simple integration for mobile/web apps. Google-ecosystem. |
| **AWS Cognito** | Managed identity | JWT + JWKS | AWS-native. Integrates with API Gateway for edge validation. |
| **Supabase Auth** | Managed identity | JWT-based | PostgreSQL-native. Open-source alternative to Firebase Auth. |

---

## Decision Tree

```
Do you need more than one server instance?
│
├── No (single server, modest traffic)
│   └── Use in-process sessions. Keep it simple.
│       Framework defaults are fine (Rails CookieStore,
│       Express MemoryStore, Django DB sessions).
│       Revisit when you add a second server.
│
└── Yes (load balanced, autoscaling, multi-instance)
    │
    ├── Is this a monolith or small number of services (1-3)?
    │   │
    │   ├── Yes
    │   │   └── Use Redis-backed server-side sessions.
    │   │       Change your framework's session store to Redis.
    │   │       One-line config change in most frameworks.
    │   │       Full server-side control, instant revocation.
    │   │
    │   └── No (microservices, 4+ services)
    │       │
    │       ├── Do all services share the same Redis cluster?
    │       │   ├── Yes, and this is acceptable coupling
    │       │   │   └── Shared Redis sessions are fine.
    │       │   │       Simpler than JWT. Instant revocation.
    │       │   │
    │       │   └── No, services need independent auth validation
    │       │       │
    │       │       ├── Is immediate token revocation required?
    │       │       │   ├── Yes (banking, healthcare, compliance)
    │       │       │   │   └── JWT with short lifetime (5-15 min)
    │       │       │   │       + refresh tokens (server-side)
    │       │       │   │       + token denylist in Redis for emergencies.
    │       │       │   │       Accept the hybrid: mostly stateless,
    │       │       │   │       denylist adds minimal state.
    │       │       │   │
    │       │       │   └── No (revocation gap of 5-15 min acceptable)
    │       │       │       └── Pure JWT with short-lived access tokens.
    │       │       │           Refresh tokens for session continuity.
    │       │       │           No server-side session store needed.
    │       │       │
    │       │       └── Do you need single sign-on across domains?
    │       │           ├── Yes → JWT or OIDC tokens (cross-domain capable)
    │       │           └── No  → Redis sessions are simpler and more secure.
    │
    ├── Is this a serverless / Lambda architecture?
    │   └── You MUST be stateless. Lambda instances are ephemeral.
    │       Use JWT for authentication.
    │       Use DynamoDB or Redis for any persistent state.
    │       No in-process state survives between invocations.
    │
    └── Do you need edge/CDN authentication validation?
        ├── Yes → JWT validated at the edge (API Gateway, CloudFront).
        │         No round-trip to origin for auth. Public key
        │         distributed to edge locations via JWKS.
        │
        └── No  → Redis-backed sessions. Simpler, more secure,
                  instant revocation. JWT complexity not justified.
```

**Summary decision heuristic:**

- Single server, <500 users: in-process sessions (do not over-engineer)
- Multi-server monolith: Redis-backed sessions (simplest correct solution)
- Microservices, same trust boundary: shared Redis sessions
- Microservices, cross-domain or independent validation: JWT with short lifetimes
- Serverless: JWT + external state store (no choice, Lambda is ephemeral)
- Edge authentication: JWT (only option that works without origin round-trip)
- Immediate revocation required: Redis sessions or JWT + denylist (pure JWT is insufficient)

---

## Implementation Sketch

### Express.js: Redis-backed sessions (recommended for most applications)

```javascript
// session-setup.js — stateless application servers, state in Redis
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const app = express();

// Redis client with reconnection and error handling
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
  },
});
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect();

// Session middleware — state is entirely in Redis, not in the process
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,         // sign the session cookie
  resave: false,                               // don't save unchanged sessions
  saveUninitialized: false,                    // don't create empty sessions
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    httpOnly: true,                                  // no JavaScript access
    maxAge: 24 * 60 * 60 * 1000,                     // 24 hours
    sameSite: 'lax',                                 // CSRF protection
  },
}));

// This server is stateless — kill it, restart it, scale to 100 instances.
// All session data lives in Redis. Any instance handles any request.

app.post('/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Store session data in Redis (not in this process's memory)
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ message: 'Logged in' });
});

app.post('/logout', (req, res) => {
  // Immediate revocation — delete the session from Redis
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

app.get('/dashboard', requireAuth, (req, res) => {
  // req.session.userId was loaded from Redis, not from this process
  res.json({ userId: req.session.userId, role: req.session.role });
});

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
```

### JWT authentication with refresh tokens (for microservices)

```javascript
// auth-service.js — issues tokens. This is the ONLY service that touches credentials.
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_EXPIRY = '15m';    // Short-lived — limits revocation gap
const REFRESH_TOKEN_EXPIRY = '7d';    // Long-lived — stored server-side

async function login(email, password) {
  const user = await authenticateUser(email, password);
  if (!user) throw new Error('Invalid credentials');

  // Access token: stateless, validated by any service with the public key
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Refresh token: stored server-side for revocation control
  const refreshToken = crypto.randomBytes(64).toString('hex');
  await redis.set(
    `refresh:${refreshToken}`,
    JSON.stringify({ userId: user.id, createdAt: Date.now() }),
    { EX: 7 * 24 * 60 * 60 }  // 7 days TTL
  );

  return { accessToken, refreshToken };
}

async function refresh(refreshToken) {
  // Server-side lookup — this is where revocation happens
  const data = await redis.get(`refresh:${refreshToken}`);
  if (!data) throw new Error('Invalid or expired refresh token');

  const { userId } = JSON.parse(data);
  const user = await getUserById(userId);

  // Rotate refresh token (one-time use prevents token theft replay)
  await redis.del(`refresh:${refreshToken}`);
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  await redis.set(
    `refresh:${newRefreshToken}`,
    JSON.stringify({ userId: user.id, createdAt: Date.now() }),
    { EX: 7 * 24 * 60 * 60 }
  );

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken: newRefreshToken };
}

async function revoke(userId) {
  // Emergency revocation: delete all refresh tokens for this user
  // Access tokens remain valid until expiry (max 15 minutes)
  const keys = await redis.keys(`refresh:*`);
  for (const key of keys) {
    const data = await redis.get(key);
    if (data && JSON.parse(data).userId === userId) {
      await redis.del(key);
    }
  }
}
```

```javascript
// middleware/auth.js — used by ANY downstream service (no Redis dependency)
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    // Validate with PUBLIC key — no shared secret, no network call
    const decoded = jwt.verify(
      authHeader.split(' ')[1],
      process.env.JWT_PUBLIC_KEY,
      { algorithms: ['RS256'] }
    );
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### Python FastAPI: stateless with dependency injection

```python
# main.py — stateless FastAPI service
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import redis.asyncio as redis
from datetime import datetime, timedelta
import os

app = FastAPI()
security = HTTPBearer()
redis_client = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))

PUBLIC_KEY = os.environ["JWT_PUBLIC_KEY"]

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Stateless auth — validates JWT with public key, no external call."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            PUBLIC_KEY,
            algorithms=["RS256"],
        )
        return {"id": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/api/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    # This endpoint is stateless — any instance handles any request.
    # User identity comes from the JWT, not from server memory.
    orders = await fetch_orders_for_user(user["id"])
    return {"orders": orders}


@app.get("/api/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    # Cart state externalized to Redis — not in this process
    cart_data = await redis_client.get(f"cart:{user['id']}")
    if not cart_data:
        return {"items": []}
    return {"items": json.loads(cart_data)}
```

### Kubernetes deployment: stateless service with health checks

```yaml
# k8s/deployment.yaml — stateless service, horizontally scalable
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3                              # Scale freely — all instances are identical
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1                    # Always keep 2+ instances running
      maxSurge: 1                          # Add 1 new before removing 1 old
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: myapp/api-server:v2.1.0
          ports:
            - containerPort: 3000
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: url
            - name: JWT_PUBLIC_KEY
              valueFrom:
                configMapKeyRef:
                  name: auth-config
                  key: jwt-public-key
          # Readiness probe: don't route traffic until Redis connection is established
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          # Liveness probe: restart if the process is stuck
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
---
# HorizontalPodAutoscaler — scale based on CPU, not session count
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2                           # Minimum for high availability
  maxReplicas: 20                          # Scale up to 20 under load
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70           # Scale at 70% CPU
```

---

## Cross-References

- **horizontal-vs-vertical:** Stateless design is the prerequisite for horizontal scaling. Without statelessness, horizontal scaling requires sticky sessions that negate most benefits. See `architecture/scaling/horizontal-vs-vertical.md`.
- **twelve-factor-app:** Factor VI (Stateless Processes) directly mandates this pattern. Factor IX (Disposability) depends on it. See `architecture/foundations/twelve-factor-app.md`.
- **serverless:** Serverless functions are stateless by definition — Lambda instances are ephemeral and interchangeable. Stateless design is not optional in serverless, it is enforced by the runtime. See `architecture/patterns/serverless.md`.
- **microservices:** Microservice instances must be interchangeable for Kubernetes scheduling, autoscaling, and failure recovery. Stateless design at the service level is a foundational requirement. See `architecture/patterns/microservices.md`.
- **caching-architecture:** The relationship between in-process caches and external caches is a core tension in stateless design. Caching strategies must account for process disposability and cold starts. See `architecture/scaling/caching-architecture.md`.
- **session-management:** Security implications of session externalization, cookie security, token storage, and session fixation attacks. See `security/web/session-management.md`.
- **authentication:** JWT vs. server-side sessions is fundamentally an authentication architecture decision with statelessness implications. See `security/foundations/authentication.md`.
- **event-driven:** Event-driven architectures complement stateless design by decoupling services through asynchronous messaging rather than shared state. See `architecture/patterns/event-driven.md`.

---

*Researched: 2026-03-08 | Sources: [The Twelve-Factor App — Processes](https://12factor.net/processes) | [Stateful vs Stateless Architecture: Why Stateless Won (Virtasant)](https://www.virtasant.com/blog/stateful-vs-stateless-architecture-why-stateless-won) | [Stop Using JWT for Authentication: The Stateless Myth (Deoxy)](https://deoxy.dev/blog/stop-using-jwt-for-auth/) | [JWT Revocation Strategies: When Stateless Tokens Need State (Michal Drozd)](https://www.michal-drozd.com/en/blog/jwt-revocation-strategies/) | [Session Management with Redis (Redis.io)](https://redis.io/solutions/session-management/) | [Microservice Session Management: From Stateful Pain to Stateless Gain with Redis and JWT (Medium)](https://medium.com/codetutorials/microservice-session-management-from-stateful-pain-to-stateless-gain-with-redis-and-jwt-72593a746b04) | [Stateful vs Stateless Architecture (GeeksforGeeks)](https://www.geeksforgeeks.org/system-design/stateful-vs-stateless-architecture/) | [The 12-Factor App — 15 Years Later: Does It Still Hold Up in 2026? (Medium)](https://lukasniessen.medium.com/the-12-factor-app-15-years-later-does-it-still-hold-up-in-2026-c8af494e8465) | [Netflix Microservices Architecture Case Study (Clustox)](https://www.clustox.com/blog/netflix-case-study/) | [Stateful vs Stateless Applications (Red Hat)](https://www.redhat.com/en/topics/cloud-native-apps/stateful-vs-stateless) | [Stateless Authentication: Understanding Token-Based Auth (Descope)](https://www.descope.com/learn/post/stateless-authentication) | [Why JWTs Make Terrible Authorization Tokens (DEV Community)](https://dev.to/stevenstuartm/why-jwts-make-terrible-authorization-tokens-3c8g)*
