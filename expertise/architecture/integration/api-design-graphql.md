# API Design — GraphQL — Architecture Expertise Module

> GraphQL is a query language for APIs that lets clients request exactly the data they need. It solves REST's over-fetching/under-fetching problems but introduces significant complexity in caching, authorization, performance, and N+1 queries. Best for client-heavy applications with complex, nested data requirements.

> **Category:** Integration
> **Complexity:** Complex
> **Applies when:** Applications with complex, deeply nested data requirements where multiple client types need different data shapes from the same API

---

## What This Is (and What It Isn't)

### The Core Idea

GraphQL is a **query language and runtime** for APIs, created at Facebook in 2012 and open-sourced in 2015. The fundamental premise: the client describes the shape of the data it needs, and the server returns exactly that shape. No more, no less.

In a REST API, the server decides what data each endpoint returns. The client gets a fixed payload and either receives too much (over-fetching) or needs to make additional requests to fill gaps (under-fetching). GraphQL inverts this: the server publishes a schema of everything that is queryable, and the client composes a query specifying the exact fields, relationships, and nesting depth it requires.

```graphql
query {                              # Response mirrors query shape exactly:
  user(id: "123") {                  # { "data": { "user": {
    name                             #     "name": "Jane Doe",
    email                            #     "email": "jane@example.com",
    posts(first: 5) {                #     "posts": [
      title                          #       { "title": "GraphQL in Practice",
      commentCount                   #         "commentCount": 42 }, ...
    }                                #     ]
  }                                  # }}}
}
```

With REST, this would require `GET /users/123` + `GET /users/123/posts?limit=5` + possibly comment counts per post — three round trips, each returning fields the client does not need.

### The Three Operations

**Queries** read data. They are analogous to GET requests but can traverse multiple resources in a single call.

**Mutations** write data. They are analogous to POST/PUT/DELETE but follow a different contract: the client specifies what to write and what to return from the result. A mutation to create a user can return the created user's ID, name, and computed fields in one round trip.

**Subscriptions** stream real-time updates. The client subscribes to a specific event, and the server pushes data when it changes. Built on WebSockets or Server-Sent Events. This is the least mature of the three operations and carries its own operational complexity.

### Schema-First Design

GraphQL is schema-first. The schema is a contract written in the Schema Definition Language (SDL):

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts(first: Int, after: String): PostConnection!
  role: Role!
}

enum Role { ADMIN EDITOR VIEWER }

type Post { id: ID!  title: String!  body: String!  author: User!  comments: [Comment!]!  createdAt: DateTime! }

type Query { user(id: ID!): User  users(first: Int, after: String): UserConnection! }
type Mutation { createPost(input: CreatePostInput!): CreatePostPayload! }
```

The schema is both documentation and enforcement. The type system catches malformed queries before execution. Tooling (GraphQL Code Generator) produces client-side types from the schema, eliminating a class of runtime errors. Design schemas for client needs, not database tables. Use `!` (non-null) deliberately. Return payload types from mutations to include structured user errors.

### Resolvers: Where the Work Happens

Every field in the schema has a **resolver** — a function that returns the value for that field. The runtime walks the query tree depth-first, calling resolvers at each node. Each resolver is independent — the runtime composes them based on the query. This is elegant for modularity but creates the N+1 problem (covered in Failure Modes).

### What GraphQL Is NOT

**Not a database query language.** Despite the name, GraphQL does not query databases. It queries an API layer. Behind the resolvers can be databases, microservices, REST APIs, files, or any data source. The "QL" is a query language for the API, not for storage.

**Not "better REST."** GraphQL is a different paradigm with different trade-offs. REST has mature caching (HTTP cache headers, CDN support, ETag-based invalidation), standardized error codes (4xx/5xx), and universal tooling. GraphQL trades these for query flexibility and type safety. Calling GraphQL "better REST" mischaracterizes both.

**Not a transport protocol.** GraphQL is typically served over HTTP (usually POST to a single endpoint), but the spec is transport-agnostic. It defines a query language and execution semantics, not how the bytes move.

**Not automatically faster.** A single GraphQL query can be more efficient than multiple REST calls, but a poorly designed schema with unoptimized resolvers can be dramatically slower than a well-designed REST API. Performance depends on implementation, not paradigm.

**Not a replacement for API design.** You still need to design your schema carefully. A schema that exposes raw database tables is as poorly designed as a REST API that maps 1:1 to database rows. Domain modeling matters regardless of the API paradigm.

---

## When to Use It

### The Qualifying Conditions

Apply GraphQL when **two or more** of these conditions hold:

**Multiple client types with divergent data needs.** A web dashboard needs 15 fields from a user profile. A mobile app needs 5. A watch app needs 2. With REST, you either return all 15 fields to everyone (over-fetching, wasting mobile bandwidth) or maintain three separate endpoints (maintenance burden). GraphQL lets each client request exactly what it needs from a single schema. This was Facebook's original motivation: the desktop news feed, mobile app, and embedded widgets all needed different slices of the same data graph.

**Deeply nested, relational data.** When a single screen needs data that spans 3+ entity relationships (user -> posts -> comments -> author -> avatar), REST requires either multiple round trips or specialized aggregate endpoints that tightly couple the API to a specific UI view. GraphQL's nested query structure maps naturally to relational data traversal.

**Rapid frontend iteration.** When frontend teams ship new features weekly and each feature needs a different data shape, REST creates a bottleneck: every new data requirement becomes a backend ticket to create or modify an endpoint. With GraphQL, frontend developers can query any combination of fields and relationships that the schema already exposes, without waiting for backend changes. This decouples frontend and backend release cycles.

**Strong typing and developer experience are priorities.** GraphQL's schema doubles as documentation and enables powerful tooling: auto-complete in IDEs, compile-time type checking (with codegen tools like GraphQL Code Generator), and schema-aware linting. For teams that value type safety across the full stack, GraphQL provides this from the API layer outward.

**API evolution without versioning.** REST APIs often use URL versioning (`/v1/users`, `/v2/users`) when fields need to change. GraphQL handles evolution through schema deprecation: mark a field as `@deprecated(reason: "Use fullName instead")`, clients update on their own schedule, and the field is eventually removed. No URL changes, no version maintenance.

### Real-World Contexts Where This Pays Off

**GitHub API v4.** GitHub migrated from REST (v3) to GraphQL (v4) specifically because their API consumers needed wildly different data shapes. A CI tool needs commit SHAs and statuses. A project management tool needs issues, labels, and assignees. A code review tool needs pull request diffs and comments. Rather than maintaining hundreds of REST endpoints with `?fields=` query parameters, GraphQL lets each integration request exactly what it needs. GitHub reported that GraphQL reduced the number of API calls and total data transferred for most use cases — retrieving a repository's issues, labels, assignees, and comments in a single query instead of several nested REST calls.

**Shopify Storefront API.** Shopify's Storefront API uses GraphQL because e-commerce storefronts have extreme variance in data requirements. A headless storefront showing product cards needs title, price, and thumbnail. A product detail page needs full descriptions, variant options, metafields, and inventory. A checkout flow needs cart state, discount calculations, and shipping rates. GraphQL lets each storefront component request its exact data needs. Shopify assigns query cost scores to fields and enforces rate limits based on total query cost rather than request count.

**Facebook (origin).** Facebook created GraphQL in 2012 to solve a specific problem: the Facebook mobile app needed to render complex, nested news feed stories with varying data shapes (text posts, photos, videos, link previews, shared posts) and the REST API could not serve these efficiently. The mobile app was sending dozens of REST requests per feed render. GraphQL reduced this to a single query per feed load with exactly the fields each story type needed.

**Airbnb.** Airbnb adopted GraphQL to unify data fetching across web and native mobile apps. Their listing pages combine data from dozens of backend services (pricing, availability, reviews, host profiles, amenities, photos). GraphQL's resolver architecture let them compose this data from multiple microservices behind a single schema without creating monolithic aggregate endpoints.

**Twitter (X) API v2.** Twitter's API v2 adopted GraphQL-like field selection (`?tweet.fields=text,created_at&expansions=author_id`) because their API consumers had the same over-fetching problem. While not pure GraphQL, the adoption of its core concept (client-specified fields) validates the pattern.

---

## When NOT to Use It

This section is deliberately as long as the "When to Use It" section. GraphQL is frequently adopted because it is trendy, without evaluating whether the complexity it introduces is earned by the problems it solves. The teams that abandon GraphQL almost always cite one or more of these conditions.

### The Disqualifying Conditions

**Simple CRUD APIs with few consumers.** If you have one frontend, one backend, and the data model is flat (users, products, orders with straightforward relationships), REST gives you everything you need with dramatically less complexity. A `GET /users/123` returning a fixed payload is simpler to build, test, cache, and monitor than a GraphQL query for the same data. The resolver infrastructure, schema definition, DataLoader setup, and query cost analysis all represent overhead that provides no return when the data needs are simple and uniform.

**File uploads and binary data.** GraphQL is designed for structured, JSON-serializable data. File uploads require workarounds: multipart form data extensions (the `graphql-upload` spec), pre-signed URL flows, or hybrid approaches where uploads go through a REST endpoint and the resulting URL is passed to a GraphQL mutation. None of these are clean. If file handling is a primary concern, REST or dedicated upload services are simpler.

**Real-time streaming of high-volume data.** GraphQL subscriptions work for moderate real-time needs (chat messages, notification badges), but high-volume streaming (financial market data, IoT sensor feeds, live video metadata) pushes subscriptions beyond their design point. WebSockets, Server-Sent Events, or gRPC streaming handle these cases with less overhead. The subscription resolver model adds per-field resolution cost to every pushed event.

**Public APIs with untrusted consumers.** When you expose an API to unknown third parties, GraphQL's flexibility becomes a liability. Clients can craft arbitrarily expensive queries: deeply nested, broadly fanned out, with aliases that multiply resolution cost. You must implement query cost analysis, depth limiting, breadth limiting, persisted queries, and rate limiting to prevent abuse. REST's fixed endpoints have a predictable cost per request that is trivially rate-limited. The OWASP GraphQL Cheat Sheet identifies introspection exposure, query cost attacks, batching abuse, and field-level authorization bypass as primary security concerns for public GraphQL APIs.

**Teams without GraphQL expertise.** GraphQL has a genuine learning curve. The schema type system, resolver architecture, DataLoader batching, fragment composition, cursor-based pagination, error handling conventions, and caching strategies are all concepts that do not exist in REST. A team of four developers who have never used GraphQL will spend 2-4 weeks becoming productive and 2-3 months before they can operate the system confidently in production. If the project timeline does not accommodate this, REST is the pragmatic choice.

**Caching is a critical performance requirement.** REST APIs benefit from decades of HTTP caching infrastructure: CDNs cache GET responses by URL, browsers cache with ETags and Cache-Control headers, reverse proxies (Varnish, Nginx) cache at the edge. GraphQL sends POST requests to a single endpoint with the query in the body. HTTP caching infrastructure cannot cache these by default. You must implement application-level caching: normalized client caches (Apollo Client's InMemoryCache), persisted query hashing for CDN caching, or custom server-side cache layers keyed by query hash. This is solvable but represents significant engineering effort that REST gets for free.

**N+1 query patterns are not manageable.** Every nested relationship in a GraphQL query triggers resolver calls that can produce N+1 database queries. The standard solution is DataLoader, but DataLoader requires disciplined implementation: one loader per data type, request-scoped instances, correct key ordering, and careful batch function design. If your data access layer does not support batching (some legacy ORMs, external APIs with no batch endpoints), DataLoader cannot help, and your GraphQL API will be slower than the REST API it replaces.

**Authorization logic is field-level.** In REST, authorization is typically per-endpoint: can this user access `GET /admin/reports`? In GraphQL, every field in the schema is independently queryable, so authorization must be per-field: can this user see `user.email`? Can this user see `user.salary`? Can this user see `post.moderationNotes`? This requires a field-level authorization layer that runs on every resolver. Frameworks like `graphql-shield` exist, but the mental model shift from "protect endpoints" to "protect every field" catches teams off guard and produces authorization gaps.

### Real-World Departures

Multiple teams have publicly documented their moves away from GraphQL:

**Complexity without proportional benefit.** A recurring pattern: teams adopt GraphQL for a system with 10-15 entity types and a single frontend. The schema, resolvers, DataLoader instances, type definitions, and codegen pipeline add significant boilerplate for what amounts to a CRUD API. After 6-12 months, the team realizes they are maintaining GraphQL infrastructure that provides no benefit over REST because they have only one client and the data shapes never vary.

**Debugging pain.** GraphQL returns HTTP 200 for everything. Errors are embedded in the response body as a structured `errors` array. This breaks conventional monitoring that relies on HTTP status codes. A malformed query, a missing required argument, an authorization failure, and a server crash all return 200 OK. Teams must build custom error extraction and alerting on top of the standard response format, and existing API monitoring tools (Datadog, New Relic, PagerDuty) require custom instrumentation to distinguish GraphQL errors from successes.

**Tooling gaps.** While GraphQL tooling has matured significantly, it still lags behind REST in some areas. Load testing tools, API gateways, rate limiters, and monitoring dashboards often have first-class REST support and bolted-on GraphQL support. Teams at scale report spending significant time building custom tooling for query analysis, cost tracking, and performance profiling that REST teams get from off-the-shelf solutions.

---

## How It Works

### Schema Definition

The schema is the contract between client and server, written in SDL. Key constructs beyond basic types:

```graphql
scalar DateTime                                    # Custom scalars for domain types
input CreatePostInput { title: String!  body: String!  tags: [String!] }  # Input types for mutations
type CreatePostPayload { post: Post  errors: [UserError!]! }             # Payload types with errors
type UserError { field: String!  message: String! }
interface Node { id: ID! }                         # Interface for global object identification
union SearchResult = User | Post | Comment         # Union for polymorphic results
```

### Queries, Mutations, and Subscriptions

**Queries** — read operations with nested field selection. A single query can traverse multiple entities, use inline fragments for polymorphic types, and include pagination:

```graphql
query GetUserDashboard($userId: ID!) {
  user(id: $userId) {
    name
    avatar { url(size: MEDIUM) }
    recentPosts(first: 10) {
      edges { node { title publishedAt stats { viewCount commentCount } } }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

**Mutations** — write operations that return affected data and structured errors in one round trip:

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    post { id title slug publishedAt }
    errors { field message }
  }
}
```

**Subscriptions** — real-time event streams over WebSockets. Least mature of the three; carries operational complexity for high-volume use cases:

```graphql
subscription OnNewComment($postId: ID!) {
  commentAdded(postId: $postId) { id body author { name } createdAt }
}
```

### Resolvers and Execution

The GraphQL runtime executes queries by walking the query tree and calling the resolver for each field. Execution happens depth-first: all fields at depth 0 resolve, then depth 1, and so on. Each resolver receives four arguments: `parent` (the resolved parent object), `args` (field arguments), `context` (request-scoped shared state), and `info` (query AST metadata).

Key resolver patterns:
- **Default resolvers** — if no resolver is defined, GraphQL returns `parent[fieldName]` automatically. Only write resolvers for computed fields, related data, or authorization.
- **Union/interface resolution** — use `__resolveType` to tell the runtime which concrete type an object belongs to.
- **Computed fields** — resolvers can return derived values: `fullName: (user) => \`${user.firstName} ${user.lastName}\``.
- **Authorization** — resolvers are the natural place for field-level auth checks, though declarative tools like `graphql-shield` are preferred over inline checks.

### DataLoader: Solving the N+1 Problem

The N+1 problem is GraphQL's most critical performance issue. When a query requests a list of 100 users and each user's posts, the naive approach issues 1 query for users + 100 queries for posts = 101 database queries for one GraphQL request.

**DataLoader** solves this through batching: it collects all `.load(key)` calls within a single tick of the event loop and calls a batch function once with all keys. The batch function issues a single `WHERE id IN (...)` query instead of N individual queries. (See Implementation Sketch for code.)

**DataLoader rules:**
1. **Request-scoped instances.** Create a new DataLoader per request. Sharing across requests leaks cached data between users — an authorization vulnerability.
2. **Key ordering contract.** The batch function must return results in the same order as the input keys. Missing results must be `null` or empty array, not omitted.
3. **One loader per access pattern.** `userById` and `userByEmail` are separate DataLoaders. Do not overload a single loader with multiple access patterns.
4. **Batch size limits.** If the database has parameter limits (PostgreSQL: 65535), configure `maxBatchSize` to stay within bounds.

### Fragments and Reuse

Fragments define reusable field selections that can be composed across queries:

```graphql
fragment PostPreview on Post {
  id
  title
  excerpt
  publishedAt
  author { id name avatar { url(size: SMALL) } }
}

query Feed {
  featuredPosts(first: 3) { ...PostPreview coverImage { url(size: LARGE) } }
  recentPosts(first: 10) { ...PostPreview }
}
```

Fragments are the foundation of Relay's component-level data declaration model: each React component declares a fragment of the data it needs, and the parent query composes them. With codegen, this produces type-safe props that match the fragment exactly.

### Pagination: Cursor-Based

GraphQL best practice follows the Relay Connection Specification: `PostConnection { edges: [PostEdge!]!  pageInfo: PageInfo! }` where each edge has a `node` and `cursor`, and `pageInfo` has `hasNextPage`/`endCursor`. Usage: `posts(first: 10)` for the first page, `posts(first: 10, after: "endCursor")` for subsequent pages.

Cursor-based pagination avoids the offset problem (items shifting between pages as data changes) and works efficiently with database index scans. The cursor is typically an opaque, base64-encoded identifier (not a raw database ID).

### Error Handling

Three error categories: **Request errors** (invalid query syntax, unknown field) are caught before execution and returned in the top-level `errors` array with no `data`. **Field errors** (resolver throws) set the field to `null` if nullable, or propagate to the nearest nullable parent, with the error in `errors` with a `path`. **Application errors** (validation, not-found, permission denied) should be modeled as part of the schema using union return types (`union CreatePostResult = CreatePostSuccess | ValidationError | NotFoundError`) — this makes error states explicit, typed, and exhaustively checkable by the client, rather than buried in an untyped `errors` array.

### Schema Stitching and Federation

When a GraphQL API spans multiple backend services, two approaches exist for composing schemas:

**Schema Stitching** merges multiple GraphQL schemas into one at the gateway level. The gateway understands the full schema and delegates queries to the appropriate backend. This is simpler to start with but creates a monolithic gateway that must be updated whenever any backend schema changes. Stitching requires gateway-level code to link types across services (e.g., linking a `Post.author` field to the User service).

**Apollo Federation** (and its open alternatives like GraphQL Mesh, WunderGraph) takes a distributed approach. Each service declares its own schema with federation-specific directives (`@key`, `@external`, `@requires`, `@provides`). A router (Apollo Router, formerly Apollo Gateway) composes these schemas automatically and routes query fragments to the appropriate services.

```graphql
# User service schema (federated)
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# Post service schema (federated)
type Post @key(fields: "id") {
  id: ID!
  title: String!
  body: String!
  author: User! # Resolved by the User service via federation
}

extend type User @key(fields: "id") {
  id: ID! @external
  posts: [Post!]!  # Posts service adds this field to User
}
```

**Expedia's migration** from schema stitching to Apollo Federation is a notable case study: they reported improved gateway processing latency and reduced maintenance burden from eliminating the custom stitching code that linked types across services.

Federation is the right choice when: multiple teams independently own parts of the graph, the graph spans 5+ services, and teams need to deploy their schema changes independently. It is overkill when: one team owns the whole graph, fewer than 3 services contribute to the schema, or the team is still learning GraphQL fundamentals.

---

## Trade-Offs Matrix

| Dimension | GraphQL | REST | When GraphQL Wins | When REST Wins |
|---|---|---|---|---|
| **Data fetching precision** | Client specifies exact fields | Server defines fixed payloads | Multiple clients with different data needs | Single client, uniform data needs |
| **Number of round trips** | Single query for nested data | Multiple requests for related resources | Deep object graphs (3+ levels) | Flat resources, single entity lookups |
| **HTTP caching** | Requires custom implementation (query hashing, persisted queries, normalized caches) | Native HTTP caching (CDN, ETags, Cache-Control) | Application-level caching acceptable | Aggressive caching required (public APIs, static content) |
| **Type safety** | Built-in schema type system, codegen to client types | Requires OpenAPI/Swagger, optional enforcement | Full-stack type safety is a priority | Simple APIs where type safety overhead is not justified |
| **API evolution** | Field deprecation, additive changes, no versioning | URL versioning or content negotiation | Gradual migration with many consumers | Breaking changes need hard cutover |
| **Learning curve** | Schema design, resolvers, DataLoader, fragments, subscriptions | HTTP methods, status codes, URL design | Team has GraphQL experience | Team is new to API design |
| **Payload size** | Minimal — only requested fields returned | Fixed — full resource representation | Mobile apps on constrained networks | Internal services with high bandwidth |
| **Error handling** | Everything is HTTP 200, errors in response body | HTTP status codes (400, 401, 403, 404, 500) | Partial success is valuable (some fields resolve, others error) | Standard monitoring, alerting, and debugging workflows |
| **Tooling maturity** | Growing ecosystem, some gaps in monitoring and load testing | Decades of mature tooling (Postman, curl, CDNs, API gateways) | Modern frontend-centric development | Enterprise environments with established REST tooling |
| **Authorization model** | Per-field authorization required | Per-endpoint authorization | Fine-grained data access control needed | Coarse-grained endpoint-level access sufficient |
| **Query predictability** | Clients can craft arbitrary queries | Server controls all query patterns | Trusted first-party clients | Public APIs with untrusted consumers |
| **Real-time support** | Subscriptions (WebSocket-based) | Polling, SSE, or WebSocket (separate from API) | Moderate real-time needs integrated with data fetching | High-volume streaming, dedicated real-time infrastructure |

---

## Evolution Path

### Stage 1: REST-First (start here for most teams)

- Traditional REST API with JSON responses.
- OpenAPI/Swagger for documentation and type generation.
- HTTP caching with CDN and Cache-Control headers.
- Standard monitoring with HTTP status codes.
- Move to Stage 2 when: multiple clients with divergent data needs emerge, or the number of aggregate/composite endpoints grows unmanageably.

### Stage 2: GraphQL for Client-Facing, REST for Internal

- GraphQL API for frontend clients (web, mobile, third-party integrations).
- REST APIs remain for service-to-service communication, file uploads, webhooks.
- DataLoader implemented for all relationship resolvers.
- Schema codegen generates client types.
- Query cost analysis and depth limiting in place.
- Move to Stage 3 when: schema spans 5+ backend services, multiple teams contribute to the graph.

### Stage 3: Federated GraphQL

- Apollo Federation or equivalent composes schemas from multiple services.
- Each team owns their subgraph and deploys independently.
- Router handles query planning and execution across subgraphs.
- Schema registry tracks schema versions and validates changes for compatibility.
- Persisted queries for production traffic; introspection disabled.
- Move to Stage 4 when: performance requirements demand fine-grained optimization, or the graph spans 15+ subgraphs.

### Stage 4: Optimized Federation with Edge Caching

- Automatic persisted queries (APQ) with CDN edge caching.
- Query plan caching at the router level.
- @defer and @stream directives for incremental delivery.
- Distributed tracing across subgraph resolvers.
- Custom query cost models tuned to actual resolver performance.
- Schema linting and review integrated into CI/CD.

### Backward Compatibility Strategy

At every stage, REST endpoints can coexist with GraphQL. GraphQL does not require abandoning REST. The pragmatic approach: expose new, complex data requirements through GraphQL; keep simple CRUD and internal APIs on REST; never force a migration that does not solve a real problem.

---

## Failure Modes

### 1. N+1 Query Explosion

**What happens:** A query requests a list of 50 users, each with their posts, each post with its comments, each comment with its author. Without DataLoader, this generates: 1 query (users) + 50 queries (posts per user) + N queries (comments per post) + M queries (author per comment). A single GraphQL request produces hundreds or thousands of database queries.

**Why it happens:** Resolvers are independent functions. The `Post.comments` resolver does not know that 49 other posts also need their comments. Each resolver issues its own query.

**How to detect:** Enable query logging in your database. A single HTTP request generating 50+ SQL queries is a clear signal. Apollo Studio and other GraphQL monitoring tools expose per-resolver timing and query counts.

**How to prevent:**
- Use DataLoader for every resolver that fetches related data. No exceptions.
- Set up monitoring that alerts when a single GraphQL request generates more than N database queries (threshold depends on your schema complexity, but 20 is a reasonable starting point).
- Consider using tools like `join-monster` or `graphql-to-sql` that translate GraphQL queries directly into SQL JOINs, bypassing the resolver-per-field model entirely for database-backed schemas.

### 2. Query Cost Attacks (Denial of Service)

**What happens:** A malicious or careless client sends an expensive query. Two attack vectors: (1) deeply nested queries exploiting circular references (`user.posts.author.posts.author...` 20 levels deep), and (2) alias multiplication where the same expensive query is duplicated 100 times using GraphQL aliases (`a: users(first:1000) {...} b: users(first:1000) {...}`).

**Why it happens:** GraphQL gives the client control over query shape and depth. Without server-side limits, any field that is queryable can be nested or duplicated arbitrarily.

**How to prevent:**
- **Query depth limiting.** Reject queries deeper than N levels (typically 7-12).
- **Query cost analysis.** Assign costs to fields (scalar: 0, object: 1, list: 10, connection with `first`: `first * child_cost`). Reject queries exceeding a cost threshold. Shopify's approach: each field has a defined cost, and the total query cost is calculated before execution.
- **Persisted queries.** In production, only allow pre-registered query hashes. Clients send a hash, not the query text. Unknown hashes are rejected. This eliminates arbitrary queries entirely.
- **Rate limiting by query cost.** Traditional rate limiting counts requests. GraphQL rate limiting should count query cost: a simple query consuming 5 cost units and a complex query consuming 500 cost units should not be treated equally.
- **Timeout enforcement.** Set a hard timeout on query execution (e.g., 10 seconds). Kill any resolver chain that exceeds it.

### 3. Resolver Waterfall

**What happens:** Sequential resolver execution creates a waterfall pattern. A query for `user.organization.members.posts` resolves in four sequential steps: first the user, then the organization (waiting for the user), then the members (waiting for the organization), then the posts (waiting for the members). Each step adds latency.

**Why it happens:** GraphQL resolves fields depth-first. A child field cannot resolve until its parent has resolved. Unlike REST where the server controls query execution and can optimize the data-fetching order, GraphQL's resolver tree imposes a fixed resolution order dictated by the query structure.

**How to mitigate:**
- Design schemas to minimize depth. Flatten where possible.
- Use `@defer` directive (supported in Apollo Server 4+) to return shallow data immediately and stream deeper fields.
- Pre-compute common deep paths into denormalized fields.
- Use DataLoader to at least parallelize queries within each depth level.

### 4. Schema Complexity Creep

**What happens:** The schema grows organically over years. Types accumulate fields. Deprecated fields are never removed because "someone might be using them." The schema becomes a comprehensive mirror of every database table. New developers cannot understand the graph. Query auto-complete returns 200 fields for a type, most of which are legacy.

**Why it happens:** GraphQL's additive evolution model (add fields, deprecate old ones) makes it easy to grow a schema and hard to shrink it. Unlike REST where removing an endpoint version is a discrete event, removing a GraphQL field affects every client that uses it, and without persisted queries, you cannot know which clients use which fields.

**How to prevent:**
- Track field usage with schema analytics (Apollo Studio, GraphQL Hive). Remove fields that have zero usage over 90 days.
- Enforce schema review in CI: every schema change requires a pull request with a description of why the field exists and which client needs it.
- Set a field count budget per type (e.g., max 30 fields). If a type exceeds this, it needs to be decomposed.
- Use persisted queries in production so you have an exact inventory of which queries are in use.

### 5. Authorization Gaps

**What happens:** Field-level authorization is incomplete. A resolver for `User.email` checks authorization, but `User.phoneNumber` was added later without a check. A client queries `phoneNumber` directly and gets data they should not have access to.

**Why it happens:** REST authorization is per-endpoint. If you protect `/admin/users`, all fields in the response are protected. GraphQL authorization is per-field, and every new field is a new authorization surface. Developers who are accustomed to REST's endpoint-level model miss field-level checks.

**How to prevent:**
- Use a declarative authorization layer (`graphql-shield`, custom directives) that fails closed: fields without explicit authorization rules are rejected by default.
- Schema linting rules that flag any field without an authorization directive.
- Integration tests that attempt to access every field as an unauthorized user and verify denial.

### 6. Monitoring Blind Spots

**What happens:** The API returns HTTP 200 for all responses. The operations team sees 100% 200 responses and assumes the API is healthy. Meanwhile, 30% of responses contain errors in the `errors` array that nobody is monitoring.

**Why it happens:** GraphQL's error model is fundamentally different from REST. Existing monitoring infrastructure (Datadog, New Relic, CloudWatch) is built around HTTP status codes. A 200 response with errors requires custom extraction logic.

**How to prevent:**
- Instrument a custom metric for "GraphQL errors per operation" distinct from HTTP errors.
- Use Apollo Studio, GraphQL Hive, or a custom plugin that extracts operation names and error rates.
- Set up alerting on error rate per operation, not just per endpoint.
- Consider returning non-200 status codes for full query failures (authorization failures return 401, validation failures return 400) even though this deviates from the GraphQL spec.

---

## Technology Landscape

### Server Frameworks

| Technology | Language | Key Strength | Best For |
|---|---|---|---|
| **Apollo Server** | TypeScript/JS | Largest ecosystem, federation support, Apollo Studio integration | Teams using Apollo Client, federated architectures |
| **graphql-yoga** | TypeScript/JS | Lightweight, Envelop plugin system, built on modern standards (Fetch API) | Teams wanting modularity without Apollo lock-in |
| **Mercurius** | TypeScript/JS | Built on Fastify, JIT compilation, gateway mode | Performance-sensitive Node.js APIs |
| **Strawberry** | Python | Type-first using Python dataclasses, async support | Python teams, Django/FastAPI integration |
| **graphql-ruby** | Ruby | Mature, production-proven at GitHub and Shopify | Rails applications |
| **gqlgen** | Go | Code-first with code generation, strongly typed | Go services needing high performance |
| **Juniper** | Rust | Type-safe, compile-time schema validation | Rust services |
| **Hot Chocolate** | C# | .NET integration, filtering/sorting/pagination built-in | .NET enterprise applications |
| **Hasura** | Any (auto-generates) | Instant GraphQL API from PostgreSQL, real-time subscriptions | Rapid prototyping, PostgreSQL-centric apps |
| **PostGraphile** | PostgreSQL | Auto-generates from DB schema, extensible with plugins | PostgreSQL-first architectures, internal tools |

### Client Libraries

| Technology | Key Strength | Best For |
|---|---|---|
| **Apollo Client** | Normalized cache, devtools, largest ecosystem | React/React Native, teams using Apollo Server |
| **Relay** | Compiler-driven, fragment co-location, automatic pagination | Facebook-scale apps, teams committed to Relay's opinions |
| **urql** | Lightweight (~5KB), extensible via exchanges, framework-agnostic | Teams wanting simplicity over Apollo's feature set |
| **graphql-request** | Minimal (no cache, no framework integration), ~5KB | Simple scripts, server-to-server, Node.js clients |
| **TanStack Query + graphql-request** | Combines server-state management with GraphQL fetching | Teams already using TanStack Query for REST |
| **URQL + Graphcache** | Normalized caching with urql's simplicity | urql users who need Apollo-level caching |

### Schema Management and Tooling

| Tool | Purpose |
|---|---|
| **GraphQL Code Generator** | Generates TypeScript types, React hooks, resolvers from schema |
| **Apollo Studio / GraphOS** | Schema registry, field usage analytics, operation tracing |
| **GraphQL Hive** | Open-source schema registry, analytics, breaking change detection |
| **GraphQL Inspector** | CI tool for detecting breaking schema changes |
| **GraphQL ESLint** | Linting for schema and operations |
| **GraphiQL / Apollo Sandbox** | Interactive query editors with auto-complete and documentation |
| **Rover CLI** | Apollo's CLI for schema management and federation composition |

### Selection Guidance

**Starting out (solo/small team, learning GraphQL):** graphql-yoga + urql + GraphQL Code Generator. Minimal setup, modern defaults, no vendor lock-in.

**Production full-stack TypeScript:** Apollo Server + Apollo Client + GraphQL Code Generator + Apollo Studio. The most complete ecosystem with the largest community.

**Performance-critical Node.js:** Mercurius (built on Fastify) + urql. JIT query compilation and Fastify's performance.

**Rapid prototyping from a database:** Hasura or PostGraphile. Instant GraphQL API from PostgreSQL without writing resolvers. Extend with custom business logic as needed.

**Federated architecture at scale:** Apollo Router + subgraphs (any server framework per team) + Apollo Studio + Rover CLI. Or the open-source alternative: GraphQL Mesh + Hive.

**Python ecosystem:** Strawberry + strawberry-django for Django, or Ariadne for a schema-first approach.

---

## Decision Tree

```
START: Do you need an API?
  |
  v
Is the primary use case simple CRUD with one client?
  YES --> Use REST. GraphQL adds complexity without proportional benefit.
  NO --> Continue.
  |
  v
Do multiple clients (web, mobile, third-party) need different data shapes?
  YES --> Strong signal for GraphQL. Continue evaluating.
  NO --> Is the data deeply nested (3+ levels of relationships)?
           YES --> GraphQL may help. Continue evaluating.
           NO --> REST is likely sufficient. Reconsider if data needs diversify.
  |
  v
Is HTTP caching critical to your performance requirements?
  YES --> Can you implement application-level caching (Apollo Client, persisted queries)?
            YES --> GraphQL is viable with additional caching work.
            NO --> Stay with REST. GraphQL's caching model will be a persistent pain point.
  NO --> Continue.
  |
  v
Is this a public API with untrusted consumers?
  YES --> Can you implement query cost analysis, depth limiting, and persisted queries?
            YES --> GraphQL is viable with security hardening.
            NO --> Use REST. Untrusted consumers with unrestricted queries is a DoS vector.
  NO --> Continue.
  |
  v
Does your team have GraphQL experience?
  YES --> Proceed with GraphQL.
  NO --> Do you have 2+ months runway before production launch?
           YES --> Invest in learning. Start with a non-critical service.
           NO --> Use REST now. Migrate to GraphQL when time permits.
  |
  v
How many backend services contribute data to client queries?
  1-3 services --> Single GraphQL server with resolvers calling backend services.
  4-10 services --> Consider federation. Evaluate team structure alignment.
  10+ services --> Federation is strongly recommended. Each team owns their subgraph.
  |
  v
RESULT: Adopt GraphQL with the appropriate complexity level for your context.
```

---

## Implementation Sketch

### Server with DataLoader (TypeScript, Apollo Server)

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import DataLoader from 'dataloader';

// --- Request-scoped DataLoader factories (critical for N+1 prevention) ---
function createLoaders(db: Database) {
  return {
    userById: new DataLoader<string, User>(async (ids) => {
      const users = await db.users.findByIds([...ids]);
      const map = new Map(users.map(u => [u.id, u]));
      return ids.map(id => map.get(id) ?? new Error(`User ${id} not found`));
    }),
    postsByAuthor: new DataLoader<string, Post[]>(async (authorIds) => {
      const posts = await db.posts.findByAuthorIds([...authorIds]);
      const grouped = groupBy(posts, p => p.authorId);
      return authorIds.map(id => grouped.get(id) ?? []);
    }),
  };
}

// --- Resolvers use loaders, never direct DB calls ---
const resolvers = {
  Query: {
    user: (_, { id }, ctx) => ctx.loaders.userById.load(id),
  },
  User: {
    posts: (user, { first, after }, ctx) =>
      ctx.loaders.postsByAuthor.load(user.id).then(p => paginate(p, { first, after })),
  },
  Post: {
    author: (post, _, ctx) => ctx.loaders.userById.load(post.authorId),
  },
  Mutation: {
    createPost: async (_, { input }, ctx) => {
      if (!ctx.currentUser) return { post: null, errors: [{ field: '_', message: 'Auth required' }] };
      const errors = validateCreatePost(input);
      if (errors.length) return { post: null, errors };
      const post = await ctx.db.posts.create({ ...input, authorId: ctx.currentUser.id });
      return { post, errors: [] };
    },
  },
};

// --- Server: new loaders per request (prevents cross-user data leaks) ---
const server = new ApolloServer({ typeDefs, resolvers });
await startStandaloneServer(server, {
  context: async ({ req }) => ({
    currentUser: await authenticateFromHeader(req.headers.authorization),
    db: getDatabase(),
    loaders: createLoaders(getDatabase()),
  }),
});
```

### Query Cost Analysis Plugin

```typescript
import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';

// Apollo Server plugin — rejects queries exceeding cost threshold before execution
const queryComplexityPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ request, document, schema }) {
        const cost = getComplexity({
          schema, query: document, variables: request.variables,
          estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
        });
        if (cost > 1000) throw new GraphQLError(`Query cost ${cost} exceeds limit 1000.`);
      },
    };
  },
};
```

### Schema-Level Authorization (graphql-shield)

```typescript
import { shield, rule, and, or } from 'graphql-shield';

const isAuthenticated = rule()((_, __, ctx) => ctx.currentUser !== null);
const isAdmin = rule()((_, __, ctx) => ctx.currentUser?.role === 'ADMIN');
const isOwner = rule()((parent, _, ctx) => parent.authorId === ctx.currentUser?.id);

const permissions = shield({
  Query: { '*': isAuthenticated },
  Mutation: { createPost: isAuthenticated },
  User: { email: and(isAuthenticated, or(isAdmin, isOwner)) },
}, { fallbackRule: isAuthenticated }); // Deny-by-default for unlisted fields
```

---

## Cross-References

- **[api-design-rest](../integration/api-design-rest.md)** — The alternative that GraphQL is most often compared to. REST is simpler, has better caching, and is the right default for most APIs. Understand REST deeply before choosing GraphQL.
- **[api-design-grpc](../integration/api-design-grpc.md)** — For service-to-service communication with strict performance requirements, gRPC (binary protocol, HTTP/2, streaming) is superior to both REST and GraphQL. GraphQL is for client-server; gRPC is for server-server.
- **[microservices](../patterns/microservices.md)** — GraphQL federation is an integration pattern for microservices. Understand microservice boundaries and team topology before adopting federation.
- **[data-modeling](../foundations/data-modeling.md)** — GraphQL schema design is a form of data modeling. A schema that mirrors database tables is as harmful as a REST API that mirrors tables. Model the domain, not the storage.
- **[hexagonal-clean-architecture](../patterns/hexagonal-clean-architecture.md)** — GraphQL resolvers are an adapter layer in hexagonal architecture. The resolver calls use cases; use cases call ports. Do not put business logic in resolvers.
- **[api-security](../../security/web/api-security.md)** — GraphQL introduces unique security concerns (query cost attacks, introspection exposure, field-level authorization) on top of standard API security (authentication, rate limiting, input validation).
- **[rate-limiting-and-throttling](../../performance/backend/rate-limiting-and-throttling.md)** — GraphQL rate limiting requires query-cost-based throttling rather than simple request counting. A query with cost 5 and a query with cost 500 should not consume the same rate limit budget.
