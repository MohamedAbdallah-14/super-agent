# API Design — gRPC — Architecture Expertise Module

> gRPC is a high-performance RPC framework using Protocol Buffers for serialization and HTTP/2 for transport. It is the optimal choice for internal service-to-service communication where performance, type safety, and streaming matter, but poorly suited for browser clients and public-facing APIs where developer discoverability and tooling maturity are paramount.

> **Category:** Integration
> **Complexity:** Moderate
> **Applies when:** Internal service-to-service communication in microservices, high-performance APIs, streaming data pipelines, polyglot service environments requiring type-safe contracts

---

## What This Is (and What It Isn't)

### The RPC Paradigm

gRPC is a **Remote Procedure Call** framework, not a resource-oriented architecture. This is a fundamentally different mental model from REST. In REST, you think in nouns: `GET /users/42`, `POST /orders`. In gRPC, you think in verbs: `GetUser(GetUserRequest)`, `CreateOrder(CreateOrderRequest)`. The client calls a method on a remote server as if it were a local function call. The framework handles serialization, transport, and deserialization transparently.

Google created the general-purpose RPC infrastructure **Stubby** around 2001 to connect microservices across its data centers. By 2015, Google open-sourced the next generation as gRPC. Nearly all of Google's internal APIs run on this lineage. The "g" has no fixed meaning — it changes with each release (Google, good, green, groovy, etc.).

### The Three Pillars

**Protocol Buffers (protobuf)** — The serialization format. You define your data structures and service interfaces in `.proto` files using a language-neutral schema definition language. The `protoc` compiler generates strongly-typed client and server code in your target language. Protobuf uses a binary wire format that is roughly 3x smaller than equivalent JSON and significantly faster to parse. Field identification uses integer tags rather than string keys, which is why protobuf payloads are compact but not human-readable.

**HTTP/2** — The transport layer. HTTP/2 provides multiplexed streams over a single TCP connection, header compression (HPACK), and full-duplex communication. gRPC leverages all of these: multiple RPC calls can share one connection without head-of-line blocking at the application layer, metadata is compressed efficiently, and both client and server can push data simultaneously. This is a hard dependency — gRPC cannot run over HTTP/1.1 (gRPC-Web works around this, discussed later).

**Code Generation** — The developer experience. From a single `.proto` file, the toolchain generates idiomatic client stubs and server interfaces in Go, Java, Python, C++, C#, Node.js, Ruby, Dart, Kotlin, Swift, and others. The generated code handles serialization, connection management, and error propagation. Teams write business logic against generated interfaces, not raw HTTP handlers.

### The Four Communication Patterns

gRPC supports four RPC types, each matching different interaction needs:

**Unary RPC** — One request, one response. The classic request-response pattern. The client sends a single `Request` message and receives a single `Response` message. This covers 80%+ of service-to-service calls: fetching a user, creating an order, validating a token.

**Server Streaming RPC** — One request, stream of responses. The client sends a single request and receives a stream of messages back. The server writes messages until it signals completion. Use cases: downloading a large dataset in chunks, subscribing to a feed of updates, streaming search results as they become available.

**Client Streaming RPC** — Stream of requests, one response. The client sends a stream of messages and receives a single response when done. Use cases: uploading a file in chunks, sending a batch of sensor readings, aggregating client-side events.

**Bidirectional Streaming RPC** — Stream of requests, stream of responses. Both sides send streams of messages independently. The two streams operate independently — the client and server can read and write in any order. Use cases: real-time chat, collaborative editing, ride-hailing location tracking where the driver streams GPS coordinates and the server streams trip cost updates.

### What gRPC Is Not

**Not REST with different encoding.** REST is resource-oriented with uniform interface constraints (GET, PUT, DELETE on URIs). gRPC is procedure-oriented with custom method signatures. They solve different design problems. Trying to design gRPC services "like REST" — defining `GetResource`, `UpdateResource`, `DeleteResource` for every entity — misses the point. gRPC services should model operations, not resources.

**Not a replacement for all HTTP APIs.** gRPC excels at internal machine-to-machine communication. It is a poor fit for APIs consumed directly by web browsers, third-party developers, or systems where human-readable payloads and curl-ability matter.

**Not inherently simpler than REST.** The code generation and type safety reduce runtime errors, but the tooling setup (protoc, plugins, buf), schema management, and binary debugging add complexity that REST/JSON avoids entirely.

**Not a message queue.** gRPC streaming provides real-time data flow over persistent connections, but it does not provide message durability, replay, fan-out, or backpressure in the way Kafka, RabbitMQ, or NATS do. If a consumer disconnects, messages are lost unless the application builds its own replay logic.

---

## When to Use It

### The Qualifying Conditions

Apply gRPC when **two or more** of these are true:

**Internal service-to-service communication.** This is the primary use case. When services talk to each other within a controlled infrastructure — same data center, same Kubernetes cluster, same VPC — gRPC's binary protocol, connection reuse, and type-safe contracts provide substantial advantages over REST/JSON. Google, Netflix, Uber, Dropbox, Square, Spotify, Cisco, LinkedIn, Datadog, and CockroachDB all use gRPC for internal service communication at scale.

**High-throughput, low-latency requirements.** Benchmarks consistently show gRPC delivering 2.5x to 10x higher throughput than equivalent REST/JSON endpoints, depending on payload size. For small payloads (~1 KB), the improvement is approximately 5.5x. For larger payloads (~1 MB), gRPC achieves roughly 10x throughput improvement. Latency measurements show REST averaging ~250ms where gRPC delivers ~25ms for equivalent operations. The protobuf payload is approximately one-third the size of the same data in JSON. gRPC keeps TCP connections alive across requests, avoiding the overhead of repeated connection establishment that REST incurs.

**Polyglot service environment.** When your microservices are written in Go, Java, Python, and Node.js, maintaining consistent API contracts across languages is a real problem. A single `.proto` file generates type-safe client and server code for all languages. The contract is enforced at compile time, not at runtime through documentation and hope. Square replaced their custom RPC solution with gRPC specifically because of its open support for multiple platforms.

**Streaming data requirements.** If your system needs real-time data flow — location tracking, live dashboards, sensor data ingestion, event streaming — gRPC's native streaming support is substantially simpler than bolting WebSocket or SSE onto a REST API. The streaming is defined in the proto schema, type-safe, and works identically across all supported languages.

**Strong contract enforcement.** In organizations where API contract breakage causes production incidents, protobuf's schema evolution rules provide compile-time and tooling-level guarantees that REST/JSON cannot match. Tools like `buf breaking` detect backward-incompatible changes before they merge.

### Real-World Contexts Where This Pays Off

**Netflix** uses gRPC to manage service-to-service communication across its microservice-heavy architecture. Their migration to gRPC improved performance of high-throughput systems including playback and metadata services. The type-safe contracts reduced a class of runtime integration errors that were common with their previous REST-based approach.

**Square** collaborated directly with Google to replace all uses of their custom RPC solution with gRPC. The demonstrated performance of the protocol and the ability to customize and adapt it to their network requirements were cited as primary motivations.

**Datadog** runs a large gRPC mesh for internal service communication. Their engineering blog documents the operational lessons of running gRPC at scale, including load balancing challenges and the importance of proper deadline propagation.

**Ride-hailing applications** (Uber, Lyft) use bidirectional streaming for real-time location tracking. The driver's app streams GPS coordinates to the server; the server streams back trip cost estimates, route updates, and rider information. This interaction pattern maps naturally to gRPC bidirectional streaming.

**Financial systems** use gRPC for low-latency trade execution, real-time price feeds (server streaming), and order submission pipelines where microseconds matter and type-safe contracts prevent costly data parsing errors.

---

## When NOT to Use It

This section is as important as the previous one. gRPC is frequently adopted as a blanket replacement for REST without evaluating whether the trade-offs are appropriate, producing debugging friction, tooling gaps, and justified frustration.

### The Disqualifying Conditions

**Browser clients without a proxy layer.** It is not possible to directly call a gRPC service from a browser. Browsers do not provide the level of control over HTTP/2 required to support a gRPC client. gRPC-Web exists as a workaround but requires either a translating proxy (Envoy, Caddy) or use of Connect-RPC, which adds infrastructure complexity. gRPC-Web also does not support client streaming or bidirectional streaming from browsers — only unary and server streaming are available. If your primary consumers are web browsers, REST or GraphQL are simpler and more capable choices.

**Public APIs needing developer discoverability.** Third-party developers expect to explore an API with curl, Postman, or a browser. They expect human-readable JSON responses, self-documenting error messages, and the ability to test endpoints without installing a code generation toolchain. gRPC's binary protocol, required proto files, and specialized tooling (grpcurl, Buf Studio, BloomRPC) create a barrier to entry that is inappropriate for public developer ecosystems. Every major public API — Stripe, Twilio, GitHub, AWS — uses REST or GraphQL for its external interface, even when the internal implementation runs on gRPC.

**Simple CRUD applications with thin logic.** If your service is fundamentally reading rows, writing rows, and returning them — with no streaming, no polyglot requirements, and no extreme performance demands — gRPC adds setup complexity (protoc, code generation pipelines, proto file management) without proportional benefit. A REST/JSON API with OpenAPI documentation serves this use case with less friction.

**Small teams with limited infrastructure expertise.** gRPC requires teams to manage proto file repositories, code generation pipelines, HTTP/2-aware load balancers, and binary debugging tools. A team of three developers building a monolithic application does not benefit from this overhead. REST frameworks (Express, FastAPI, Spring Boot) provide a dramatically simpler path from zero to working API.

**Debugging and observability are critical and tooling is immature.** Binary payloads are not human-readable. You cannot inspect a gRPC call with browser DevTools, read it in access logs, or paste it into a curl command. Every debugging session requires decoding protobuf payloads into JSON or another readable format, which requires access to the `.proto` files. Teams accustomed to `curl | jq` workflows will experience significant friction. The ecosystem of debugging tools exists (grpcurl, gRPC reflection, Buf Studio) but is substantially less mature than REST/JSON tooling.

**Integration with legacy systems expecting HTTP/1.1.** Many enterprise systems, API gateways, CDNs, and WAFs are designed for HTTP/1.1 with JSON payloads. Introducing gRPC into an environment where the network infrastructure does not support HTTP/2 end-to-end creates proxy translation layers and operational complexity that negates the performance benefits.

### The "Just Use REST" Test

If **all** of the following are true, gRPC is adding complexity without commensurate value:

- Your consumers are web browsers or third-party developers
- You have fewer than 10 services communicating
- Your latency requirements are above 50ms
- You are using a single programming language
- You have no streaming requirements
- Your team has no prior gRPC experience

In this scenario, REST/JSON with OpenAPI documentation will serve you better with a fraction of the setup cost.

---

## How It Works

### Protocol Buffer Definition

Everything starts with the `.proto` file. This is the contract — the single source of truth for your API:

```protobuf
syntax = "proto3";

package order.v1;

option go_package = "github.com/myorg/order/v1;orderv1";

// Service definition — the verbs
service OrderService {
  // Unary — one request, one response
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);

  // Server streaming — subscribe to order status updates
  rpc WatchOrderStatus(WatchOrderStatusRequest) returns (stream OrderStatusUpdate);

  // Client streaming — batch upload line items
  rpc UploadLineItems(stream LineItem) returns (UploadLineItemsResponse);

  // Bidirectional streaming — live order negotiation
  rpc NegotiateOrder(stream NegotiationMessage) returns (stream NegotiationMessage);
}

// Message definitions — the nouns
message CreateOrderRequest {
  string customer_id = 1;
  repeated LineItem items = 2;
  Address shipping_address = 3;
}

message CreateOrderResponse {
  string order_id = 1;
  google.protobuf.Timestamp created_at = 2;
}

message Order {
  string order_id = 1;
  string customer_id = 2;
  repeated LineItem items = 3;
  OrderStatus status = 4;
  google.protobuf.Timestamp created_at = 5;
  google.protobuf.Timestamp updated_at = 6;
}

message LineItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 price_cents = 3;  // Use integers for money, never floats
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;  // Always have a zero-value default
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}

message Address {
  string street = 1;
  string city = 2;
  string state = 3;
  string zip_code = 4;
  string country = 5;
}
```

### Code Generation Pipeline

The `protoc` compiler (or modern alternatives like `buf generate`) processes `.proto` files and produces language-specific code:

```bash
# Traditional protoc approach
protoc --go_out=. --go-grpc_out=. proto/order/v1/order.proto

# Modern buf approach (recommended)
buf generate proto/order/v1
```

The generated code includes:
- **Server interfaces** — abstract methods your service must implement
- **Client stubs** — ready-to-use clients with type-safe method signatures
- **Message types** — structs/classes for every message with serialization built in
- **Marshaling/unmarshaling** — binary encoding/decoding handled transparently

### Channel and Stub Model

gRPC clients communicate through **channels** — abstracted connections to a server endpoint. A channel handles connection establishment, reconnection, load balancing, and multiplexing. You create a channel once and reuse it for the lifetime of your application.

**Stubs** are generated client wrappers that use a channel to make RPC calls. There are typically two flavors: blocking (synchronous) and async (non-blocking/future-based).

```go
// Go server implementation
type orderServer struct {
    orderv1.UnimplementedOrderServiceServer
    store OrderStore
}

func (s *orderServer) CreateOrder(
    ctx context.Context,
    req *orderv1.CreateOrderRequest,
) (*orderv1.CreateOrderResponse, error) {
    // Validate
    if req.CustomerId == "" {
        return nil, status.Error(codes.InvalidArgument, "customer_id is required")
    }

    // Business logic
    order, err := s.store.Create(ctx, req)
    if err != nil {
        return nil, status.Errorf(codes.Internal, "failed to create order: %v", err)
    }

    return &orderv1.CreateOrderResponse{
        OrderId:   order.ID,
        CreatedAt: timestamppb.Now(),
    }, nil
}

// Server streaming implementation
func (s *orderServer) WatchOrderStatus(
    req *orderv1.WatchOrderStatusRequest,
    stream orderv1.OrderService_WatchOrderStatusServer,
) error {
    for update := range s.store.Subscribe(req.OrderId) {
        if err := stream.Send(update); err != nil {
            return err
        }
    }
    return nil
}
```

```go
// Go client usage
conn, err := grpc.Dial("order-service:50051",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithUnaryInterceptor(otelgrpc.UnaryClientInterceptor()),
)
if err != nil {
    log.Fatalf("failed to connect: %v", err)
}
defer conn.Close()

client := orderv1.NewOrderServiceClient(conn)

// Unary call with deadline
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.CreateOrder(ctx, &orderv1.CreateOrderRequest{
    CustomerId: "cust-123",
    Items: []*orderv1.LineItem{
        {ProductId: "prod-456", Quantity: 2, PriceCents: 1999},
    },
})
```

### Interceptors (Middleware)

gRPC interceptors are the equivalent of HTTP middleware. They wrap RPC calls to add cross-cutting concerns: logging, authentication, metrics, tracing, rate limiting.

```go
// Unary server interceptor for logging
func loggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    duration := time.Since(start)

    log.Printf("method=%s duration=%s error=%v",
        info.FullMethod, duration, err)
    return resp, err
}

// Chain multiple interceptors
server := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        authInterceptor,
        loggingInterceptor,
        metricsInterceptor,
        recoveryInterceptor,
    ),
    grpc.ChainStreamInterceptor(
        streamAuthInterceptor,
        streamLoggingInterceptor,
    ),
)
```

### Deadline Propagation

Deadlines are one of the most important reliability patterns in gRPC. Unlike traditional timeouts that apply to a single network hop, gRPC deadlines propagate across service boundaries. A deadline set by the initial caller travels through your entire microservice chain, ensuring that no downstream service wastes resources on a request that has already timed out upstream.

```
Client (deadline=5s) → Service A (4.8s remaining) → Service B (4.2s remaining) → Service C
```

If Service C receives a request with 0.3s remaining, it can immediately return `DEADLINE_EXCEEDED` rather than starting expensive work that the caller has already abandoned. In Go and Java, deadline propagation is enabled by default when you pass the incoming context to outgoing calls.

**Best practice: always set a deadline.** A missing deadline means a failed server can cause a client to hang indefinitely, which cascades into resource exhaustion across the call chain.

### Error Model and Status Codes

gRPC defines 16 canonical status codes (compared to HTTP's ~70). Each code has specific semantics:

| Code | Name | When to Use |
|---|---|---|
| 0 | `OK` | Success |
| 1 | `CANCELLED` | Client cancelled the request |
| 2 | `UNKNOWN` | Unknown error (avoid overusing — be specific) |
| 3 | `INVALID_ARGUMENT` | Client sent bad input |
| 4 | `DEADLINE_EXCEEDED` | Operation timed out |
| 5 | `NOT_FOUND` | Requested entity does not exist |
| 6 | `ALREADY_EXISTS` | Entity already exists (e.g., duplicate create) |
| 7 | `PERMISSION_DENIED` | Caller lacks permission (authenticated but unauthorized) |
| 8 | `RESOURCE_EXHAUSTED` | Rate limit exceeded, quota exhausted |
| 9 | `FAILED_PRECONDITION` | System not in required state for operation |
| 10 | `ABORTED` | Concurrency conflict (e.g., read-modify-write conflict) |
| 11 | `OUT_OF_RANGE` | Operation attempted past valid range |
| 12 | `UNIMPLEMENTED` | Method not implemented |
| 13 | `INTERNAL` | Internal server error |
| 14 | `UNAVAILABLE` | Service is temporarily unavailable (safe to retry) |
| 15 | `DATA_LOSS` | Unrecoverable data loss or corruption |
| 16 | `UNAUTHENTICATED` | Missing or invalid authentication credentials |

**Rich error details:** gRPC supports attaching structured error details beyond the status code and message. Use `google.rpc.Status` with `google.rpc.ErrorInfo`, `google.rpc.BadRequest`, `google.rpc.RetryInfo` to communicate specific failure information to clients.

### Load Balancing

gRPC's persistent HTTP/2 connections create a load balancing challenge. A standard Layer 4 (TCP) load balancer distributes connections, not requests — once a connection is established, all RPCs on that connection go to the same backend. With long-lived gRPC connections, this produces severe imbalance.

**Proxy-based (L7) load balancing:** A Layer 7 proxy (Envoy, Linkerd, Istio) understands the gRPC protocol and distributes individual RPCs across backends. The proxy maintains connections to all backends and routes each RPC independently. This is the simplest approach but adds a network hop and a single point of failure.

**Client-side load balancing:** The client is aware of multiple backends and selects one per RPC. The client gets endpoint lists from a service registry (DNS, Consul, etcd, xDS) and implements the load balancing algorithm locally. This eliminates the proxy hop but distributes health checking to every client — 500 clients checking 20 instances every 5 seconds produces 2,000 probe requests per second before any real traffic.

**Hybrid approach (common at scale):** Proxy-based load balancing at the ingress layer for external traffic; client-side load balancing for internal service-to-service calls where the client library can be standardized. Google Cloud's Service Mesh uses xDS APIs to configure gRPC applications directly for proxyless service mesh with endpoint discovery, load balancing, regional failover, and health checks.

### Health Checking and Reflection

gRPC provides a standard health checking protocol (`grpc.health.v1.Health`) that load balancers and orchestrators (Kubernetes) can use to determine service readiness. Implement it — without it, Kubernetes liveness probes require custom HTTP endpoints alongside your gRPC server.

gRPC Server Reflection allows clients to discover available services and methods at runtime without access to `.proto` files. This is essential for debugging tools like `grpcurl` and should be enabled in development/staging but typically disabled in production for security.

---

## Trade-Offs Matrix

| Dimension | gRPC Advantage | gRPC Cost | Severity |
|---|---|---|---|
| **Serialization performance** | Binary protobuf is 3-10x faster to serialize/deserialize than JSON. Payloads are ~3x smaller. | Binary payloads are not human-readable. Every debugging session requires decoding tools. | High — this is the primary performance driver but the primary debugging obstacle |
| **Type safety** | Compile-time contract enforcement across all languages. Breaking changes caught before deployment. | Requires learning protobuf IDL, managing proto repositories, running code generation pipelines. | Moderate — one-time learning cost vs. ongoing safety benefit |
| **Streaming** | Native, type-safe, bidirectional streaming defined in the schema. Works identically across all languages. | Streaming adds complexity: backpressure management, reconnection logic, partial failure handling, resource cleanup. | High — streaming is powerful but the most common source of production bugs |
| **HTTP/2 transport** | Multiplexed connections, header compression, full-duplex. Single connection handles thousands of concurrent RPCs. | Requires HTTP/2-aware infrastructure. L4 load balancers break. Some proxies, CDNs, and WAFs do not support HTTP/2 end-to-end. | High — infrastructure that "just works" with REST may require changes for gRPC |
| **Code generation** | Eliminates hand-written client code, ensures client-server consistency, provides IDE autocompletion. | Adds a build step. Proto file changes require regenerating and recompiling consumers. CI/CD pipelines must include codegen. | Moderate — automation eliminates most friction after initial setup |
| **Browser support** | N/A — gRPC does not work in browsers natively. | Requires gRPC-Web proxy or Connect-RPC. No client/bidirectional streaming from browsers. Adds infrastructure and limits streaming. | Critical — this is a hard blocker for browser-first applications |
| **Tooling ecosystem** | Growing ecosystem: grpcurl, Buf Studio, BloomRPC, Postman gRPC support, Evans CLI. | Substantially less mature than REST tooling. No curl equivalent. No browser DevTools integration. | Moderate — improving yearly but still behind REST |
| **Contract evolution** | Protobuf's field numbering system enables backward/forward compatible schema changes with defined rules. | Requires discipline: never reuse field numbers, never change wire types, use `reserved` keyword. Breaking changes are silent if rules are violated. | Moderate — the rules are simple but the consequences of violating them are severe |
| **Latency** | Eliminates connection overhead (persistent connections), binary parsing is faster, header compression reduces per-request overhead. | First-connection latency is higher (HTTP/2 negotiation, TLS handshake). Benefits manifest on subsequent requests over the same connection. | Low — the initial connection cost is amortized over thousands of RPCs |
| **Observability** | Standard interceptor pattern makes it easy to add tracing (OpenTelemetry), metrics (Prometheus), and logging uniformly. | Binary payloads make access log inspection harder. Request/response logging requires custom interceptors with proto-to-JSON conversion. | Moderate — structured observability is good but ad-hoc debugging is harder |

---

## Schema Evolution and Versioning

### Safe Changes (Backward and Forward Compatible)

- **Adding new fields** with new field numbers — old clients ignore unknown fields, new clients use defaults for missing fields
- **Adding new enum values** — old clients treat unknown values as the default (0) value
- **Adding new RPC methods** — old clients never call them, new clients can
- **Adding new services** — no impact on existing consumers
- **Renaming fields** — protobuf uses field numbers on the wire, not names (but regenerated code will have new accessor names)

### Dangerous Changes (Breaking)

- **Changing a field number** — this silently corrupts data because old messages decode into wrong fields
- **Changing a field's wire type** — e.g., `int32` to `string`. The decoder interprets the bytes incorrectly
- **Removing a field without reserving its number** — a future developer may reuse the number, causing silent corruption
- **Reordering enum values** — enum values are encoded as integers; changing the mapping breaks everything
- **Renaming a service or method** — this changes the HTTP/2 path (`/package.Service/Method`), breaking all clients

### Best Practices for Schema Evolution

```protobuf
// Reserve removed field numbers and names to prevent reuse
message Order {
  reserved 6, 8;              // Never reuse these field numbers
  reserved "legacy_status";   // Never reuse this field name

  string order_id = 1;
  // field 6 was removed (was legacy_status)
  // field 8 was removed (was deprecated_field)
}
```

**Package versioning:** Use versioned packages (`order.v1`, `order.v2`) for breaking changes. Run both versions simultaneously during migration. This is the gRPC equivalent of REST API versioning (`/v1/orders`, `/v2/orders`).

**Buf tooling:** Use `buf breaking` to detect backward-incompatible changes in CI. This catches field number reuse, type changes, and removed fields before they reach production.

---

## Evolution Path

### Stage 1: REST/JSON Monolith (Starting Point)

Most systems begin here. A single service exposes REST/JSON endpoints. The API contract is defined by documentation (OpenAPI/Swagger) or implicitly by the code. This is appropriate and should not be prematurely replaced.

### Stage 2: Internal gRPC, External REST

As the monolith splits into services, internal communication moves to gRPC for performance and type safety. A gateway (Envoy, Kong, gRPC-Gateway) translates between external REST/JSON and internal gRPC. The `.proto` files become the single source of truth, with REST endpoints generated from proto annotations.

```protobuf
import "google/api/annotations.proto";

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order) {
    option (google.api.http) = {
      get: "/v1/orders/{order_id}"
    };
  }
}
```

### Stage 3: Full gRPC Mesh with Service Mesh

Internal services communicate exclusively via gRPC. A service mesh (Istio, Linkerd) handles mTLS, load balancing, circuit breaking, and observability. Proto files are managed in a central registry (Buf Schema Registry). Breaking change detection runs in CI.

### Stage 4: Hybrid Protocol Strategy

Mature architectures use the right protocol for each boundary:
- **Internal service-to-service:** gRPC (performance, streaming, type safety)
- **External public API:** REST/JSON (discoverability, tooling, developer experience)
- **Frontend-to-backend:** GraphQL or REST (flexible querying, browser compatibility)
- **Real-time client updates:** gRPC-Web/Connect-RPC or WebSocket (depending on streaming needs)

---

## Failure Modes

### 1. The "gRPC Everywhere" Failure

**What happens:** A team adopts gRPC for every API surface — including public APIs consumed by third-party developers and browser-based SPAs. Third-party developers cannot test the API with curl. Browser integration requires a gRPC-Web proxy. Documentation is a `.proto` file instead of an interactive API explorer.

**Why it fails:** gRPC was designed for machine-to-machine communication in controlled environments. Forcing it into developer-facing and browser-facing roles creates friction that outweighs the performance benefits.

**The fix:** Use gRPC internally and expose REST/JSON or GraphQL at the boundary. The gRPC-Gateway project generates REST endpoints from proto annotations, giving you both protocols from a single source of truth.

### 2. The "No Deadlines" Failure

**What happens:** Services call downstream services without setting deadlines. A slow database query in Service D causes Service C to wait indefinitely, which causes Service B to wait, which causes Service A to wait. All four services accumulate blocked goroutines/threads until they crash.

**Why it fails:** Without deadlines, a single slow dependency cascades into system-wide resource exhaustion. gRPC's deadline propagation only works if someone sets the initial deadline.

**The fix:** Always set a deadline on every outgoing RPC. Propagate the incoming deadline to outgoing calls (automatic in Go and Java). Monitor `DEADLINE_EXCEEDED` error rates — a spike indicates a downstream service is degrading.

### 3. The "L4 Load Balancer" Failure

**What happens:** gRPC traffic is routed through a Layer 4 (TCP) load balancer. The load balancer distributes TCP connections, not individual RPCs. Because gRPC multiplexes all RPCs over a single persistent connection, all traffic from one client goes to one backend. With 10 clients and 10 backends, some backends handle 80% of traffic while others idle.

**Why it fails:** L4 load balancers were designed for HTTP/1.1 where each connection carries one request. gRPC's HTTP/2 multiplexing breaks this assumption.

**The fix:** Use Layer 7 load balancing (Envoy, Linkerd proxy, Kubernetes headless service with client-side balancing) that understands gRPC and distributes at the RPC level.

### 4. The "Proto File Chaos" Failure

**What happens:** Proto files are duplicated across repositories. Team A's copy of `user.proto` diverges from Team B's copy. Field numbers are reused after removal. Messages are modified in incompatible ways without detection. Deserialization fails silently, producing corrupted data.

**Why it fails:** Proto files are a contract — they must be a single source of truth. Duplication is the same failure mode as copying a database schema into every application.

**The fix:** Maintain proto files in a dedicated repository or use the Buf Schema Registry. Run `buf lint` and `buf breaking` in CI. Generate and publish language-specific packages from the central proto repository. No service owns its own proto files — the registry does.

### 5. The "Streaming Resource Leak" Failure

**What happens:** Server streaming or bidirectional streaming RPCs are opened but not properly closed. Client disconnects are not detected. Server-side goroutines/threads accumulate, each holding resources (database connections, memory buffers) for a stream that no one is reading.

**Why it fails:** Streaming connections are long-lived. Without proper lifecycle management — context cancellation, keepalive pings, stream termination on error — resources leak slowly until the service degrades.

**The fix:** Always respect context cancellation in streaming handlers. Configure keepalive parameters to detect dead connections. Implement server-side timeouts on idle streams. Monitor open stream counts and set alerts on abnormal growth.

### 6. The "Unversioned Breaking Change" Failure

**What happens:** A team changes a field's type from `int32` to `string` (field number 4) and deploys the server. All clients still sending `int32` on field 4 produce garbage data that the server silently accepts and stores. The corruption is discovered days later in downstream reports.

**Why it fails:** Protobuf decodes based on wire type and field number. Changing the type without changing the field number does not produce an error — it produces silently wrong data.

**The fix:** Never change the type of an existing field. Deprecate the old field, reserve its number, and add a new field with a new number. Run `buf breaking` in CI to catch these changes automatically.

---

## Technology Landscape

### Core Implementations

| Tool | Language | Notes |
|---|---|---|
| **grpc-go** | Go | The most widely used implementation. Excellent performance. Native interceptor support. |
| **grpc-java** | Java/Kotlin | Mature, widely used in enterprise. Integrates with Spring Boot via `grpc-spring-boot-starter`. |
| **grpc-node** | Node.js | Two variants: `@grpc/grpc-js` (pure JS, recommended) and `grpc` (native C bindings, deprecated). |
| **grpc-python** | Python | `grpcio` package. Async support via `grpcio` with `asyncio`. |
| **grpc-dotnet** | C# | First-class support in ASP.NET Core. Best .NET gRPC experience. |
| **grpc-swift** | Swift | Used for iOS/macOS clients communicating with gRPC backends. |
| **grpc-dart** | Dart | Used in Flutter applications for backend communication. |

### Modern Tooling

| Tool | Purpose | Why It Matters |
|---|---|---|
| **buf** (buf.build) | Proto linting, breaking change detection, code generation, schema registry | Replaces the fragile `protoc` + plugin workflow. `buf lint` enforces style. `buf breaking` catches incompatible changes. `buf generate` replaces complex protoc invocations. |
| **Connect-RPC** | gRPC-compatible framework with browser support | Supports gRPC, gRPC-Web, and the Connect protocol. No proxy needed for browser clients. Handlers work with vanilla `net/http`. TypeScript clients integrate with React, Next.js. |
| **gRPC-Gateway** | REST/JSON to gRPC reverse proxy | Generates a REST API from proto annotations. Allows a single proto definition to serve both REST and gRPC clients. |
| **grpcurl** | Command-line gRPC client | The `curl` of gRPC. Requires either server reflection or proto files. Essential for debugging. |
| **Evans** | Interactive gRPC client (REPL) | More interactive than grpcurl. Auto-completes service and method names. |
| **Buf Studio** | Web-based gRPC client | Browser-based UI for testing gRPC services. Supports all streaming types. |
| **Kreya** | Desktop gRPC client | GUI client similar to Postman but for gRPC. Supports environments, variables, scripting. |

### Connect-RPC: The Modern Alternative

Connect-RPC deserves special attention. Built by the Buf team, it addresses gRPC's most significant limitations while maintaining full compatibility:

- **Browser support without a proxy:** Connect clients work directly in browsers over HTTP/1.1 or HTTP/2. No Envoy or translation layer required.
- **Triple-protocol support:** Every Connect handler simultaneously speaks gRPC, gRPC-Web, and the Connect protocol. Existing gRPC clients work unchanged.
- **Standard HTTP semantics:** Connect RPCs are plain HTTP POST requests with protobuf or JSON bodies. They are debuggable with curl and browser DevTools.
- **Framework integration:** Go handlers are standard `net/http` handlers — they work with existing routers, middleware, and observability. TypeScript clients integrate with React, Next.js, and standard `fetch`.

Connect-RPC is the recommended approach for new projects that need gRPC's benefits (protobuf contracts, streaming, code generation) without its browser and debugging limitations.

---

## Decision Tree

```
Need an API?
│
├─ Consumers are web browsers or third-party developers?
│  ├─ Yes → Need flexible querying across multiple entities?
│  │         ├─ Yes → GraphQL
│  │         └─ No  → REST/JSON with OpenAPI
│  └─ No (internal services only) ↓
│
├─ Need bidirectional or client streaming?
│  ├─ Yes → gRPC (only option with type-safe streaming)
│  │         Consider Connect-RPC if browser clients also needed
│  └─ No ↓
│
├─ Performance-critical? (sub-10ms latency, >10K RPS)
│  ├─ Yes → gRPC
│  └─ No ↓
│
├─ Polyglot services needing type-safe contracts?
│  ├─ Yes → gRPC (single proto → all languages)
│  └─ No ↓
│
├─ Need server-push / real-time updates?
│  ├─ Yes → Browser client?
│  │         ├─ Yes → WebSocket or SSE (simpler) / Connect-RPC (if proto contracts needed)
│  │         └─ No  → gRPC server streaming
│  └─ No ↓
│
├─ Team has gRPC experience and infrastructure supports HTTP/2?
│  ├─ Yes → gRPC (for the contract and tooling benefits)
│  └─ No  → REST/JSON (lower friction, faster time to first API)
│
└─ When in doubt → REST/JSON for external, gRPC for internal
```

---

## Implementation Sketch

### Project Structure

```
proto/
├── buf.yaml                    # Buf configuration
├── buf.gen.yaml                # Code generation config
└── order/
    └── v1/
        └── order.proto         # Service and message definitions

internal/
├── server/
│   └── order.go                # gRPC server implementation
├── interceptors/
│   ├── auth.go                 # Authentication interceptor
│   ├── logging.go              # Request logging
│   └── recovery.go             # Panic recovery
└── client/
    └── order.go                # Client wrapper with retries

cmd/
└── server/
    └── main.go                 # Server entrypoint

gen/                            # Generated code (do not edit)
└── order/
    └── v1/
        ├── order.pb.go
        └── order_grpc.pb.go
```

### Buf Configuration

```yaml
# buf.yaml
version: v2
modules:
  - path: proto
lint:
  use:
    - STANDARD            # Enforces Google's proto style guide
breaking:
  use:
    - FILE                # Detects breaking changes per-file
```

```yaml
# buf.gen.yaml
version: v2
plugins:
  - remote: buf.build/protocolbuffers/go
    out: gen
    opt: paths=source_relative
  - remote: buf.build/grpc/go
    out: gen
    opt: paths=source_relative
```

### Server Entrypoint

```go
func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }

    // Create server with interceptor chain
    srv := grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            interceptors.Recovery(),
            interceptors.Logging(),
            interceptors.Auth(tokenValidator),
            otelgrpc.UnaryServerInterceptor(),
        ),
        grpc.ChainStreamInterceptor(
            interceptors.StreamRecovery(),
            interceptors.StreamLogging(),
            interceptors.StreamAuth(tokenValidator),
            otelgrpc.StreamServerInterceptor(),
        ),
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle: 5 * time.Minute,
            Time:              1 * time.Minute,   // Ping if idle
            Timeout:           20 * time.Second,   // Wait for ping ack
        }),
    )

    // Register services
    orderv1.RegisterOrderServiceServer(srv, server.NewOrderServer(store))

    // Register health check
    healthSrv := health.NewServer()
    grpc_health_v1.RegisterHealthServer(srv, healthSrv)
    healthSrv.SetServingStatus("order.v1.OrderService", grpc_health_v1.HealthCheckResponse_SERVING)

    // Enable reflection for debugging (disable in production)
    reflection.Register(srv)

    log.Printf("gRPC server listening on :50051")
    if err := srv.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}
```

### Client with Retry and Deadline

```go
func NewOrderClient(addr string) (orderv1.OrderServiceClient, func(), error) {
    retryPolicy := `{
        "methodConfig": [{
            "name": [{"service": "order.v1.OrderService"}],
            "waitForReady": true,
            "retryPolicy": {
                "MaxAttempts": 3,
                "InitialBackoff": "0.1s",
                "MaxBackoff": "1s",
                "BackoffMultiplier": 2.0,
                "RetryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
            }
        }]
    }`

    conn, err := grpc.Dial(addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithDefaultServiceConfig(retryPolicy),
        grpc.WithChainUnaryInterceptor(otelgrpc.UnaryClientInterceptor()),
        grpc.WithKeepaliveParams(keepalive.ClientParameters{
            Time: 10 * time.Second, Timeout: 3 * time.Second,
            PermitWithoutStream: true,
        }),
    )
    if err != nil {
        return nil, nil, fmt.Errorf("dial %s: %w", addr, err)
    }

    cleanup := func() { conn.Close() }
    return orderv1.NewOrderServiceClient(conn), cleanup, nil
}
```

### Testing gRPC Services

```go
func TestCreateOrder(t *testing.T) {
    // bufconn provides in-process testing without real network
    lis := bufconn.Listen(1024 * 1024)
    srv := grpc.NewServer()
    orderv1.RegisterOrderServiceServer(srv, server.NewOrderServer(mockStore))
    go func() { srv.Serve(lis) }()
    defer srv.Stop()

    conn, err := grpc.DialContext(ctx, "bufconn",
        grpc.WithContextDialer(func(ctx context.Context, s string) (net.Conn, error) {
            return lis.DialContext(ctx)
        }),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    require.NoError(t, err)
    defer conn.Close()

    client := orderv1.NewOrderServiceClient(conn)
    resp, err := client.CreateOrder(ctx, &orderv1.CreateOrderRequest{
        CustomerId: "test-customer",
        Items:      []*orderv1.LineItem{{ProductId: "prod-1", Quantity: 1, PriceCents: 999}},
    })
    require.NoError(t, err)
    assert.NotEmpty(t, resp.OrderId)
}
```

---

## Operational Checklist

Before deploying gRPC to production, verify:

- [ ] **Load balancing is L7, not L4.** Confirm your load balancer distributes individual RPCs, not just TCP connections.
- [ ] **Deadlines are set on every outgoing RPC.** No unbounded waits. Monitor `DEADLINE_EXCEEDED` rates.
- [ ] **Health checking is implemented.** Register `grpc.health.v1.Health` so Kubernetes can probe readiness.
- [ ] **Keepalive is configured.** Set `MaxConnectionIdle`, `Time`, and `Timeout` on both client and server to detect dead connections.
- [ ] **Proto files are centrally managed.** Single repository or Buf Schema Registry. `buf breaking` runs in CI.
- [ ] **Interceptors cover observability.** Logging, metrics (request count, latency histogram, error rate), and distributed tracing on every RPC.
- [ ] **Reflection is disabled in production.** It exposes your API surface. Enable only in development/staging.
- [ ] **TLS is configured.** Use mTLS for service-to-service. Never run `insecure.NewCredentials()` in production.
- [ ] **Streaming handlers respect context cancellation.** Verify that server-side streaming goroutines terminate when the client disconnects.
- [ ] **Retry policies use exponential backoff.** Retry only on `UNAVAILABLE` and `DEADLINE_EXCEEDED`. Never retry `INVALID_ARGUMENT` or `NOT_FOUND`.

---

## Cross-References

- **[api-design-rest](../integration/api-design-rest.md)** — REST is the complement to gRPC: use REST for external/public APIs and browser clients, gRPC for internal service-to-service.
- **[api-design-graphql](../integration/api-design-graphql.md)** — GraphQL excels at flexible querying for frontend clients. Use when clients need to select specific fields across multiple entities.
- **[microservices](../patterns/microservices.md)** — gRPC is the standard transport for microservice architectures. Understand the microservices pattern before choosing the transport.
- **[websockets-realtime](../integration/websockets-realtime.md)** — For browser-based real-time communication, WebSockets remain simpler than gRPC-Web. Choose WebSockets when the client is a browser and you do not need proto contracts.

---

## Sources

- [Six Lessons from Production gRPC — Speedscale](https://speedscale.com/blog/six-lessons-from-production-grpc/)
- [4 Ways Enterprise Architects Are Using gRPC — Red Hat](https://www.redhat.com/en/blog/grpc-use-cases)
- [gRPC vs REST: Detailed Comparison 2025 — Wallarm](https://www.wallarm.com/what/grpc-vs-rest-comparing-key-api-designs-and-deciding-which-one-is-best)
- [Connect: A Better gRPC — Buf](https://buf.build/blog/connect-a-better-grpc)
- [gRPC Load Balancing — gRPC Official](https://grpc.io/blog/grpc-load-balancing/)
- [Lessons from a Large gRPC Mesh — Datadog](https://www.datadoghq.com/blog/grpc-at-datadog/)
- [Protobuf Compatibility Best Practices — Earthly](https://earthly.dev/blog/backward-and-forward-compatibility/)
- [gRPC Deadlines — gRPC Official](https://grpc.io/blog/deadlines/)
- [About gRPC — gRPC Official](https://grpc.io/about/)
