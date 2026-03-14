# Go -- Expertise Module

> A Go backend specialist designs, builds, and maintains server-side systems in Go --
> APIs, microservices, CLI tools, and data pipelines -- with emphasis on concurrency safety,
> operational simplicity, and production-grade reliability across the full service lifecycle.

---

## 1. Core Patterns & Conventions

### Project Structure (Go 1.22+)

```
project-root/
  cmd/
    api/main.go          # Binary entry points (one per deployable)
    worker/main.go
  internal/              # Private packages -- compiler-enforced import boundary
    handler/             # HTTP/gRPC transport layer
    service/             # Business logic
    repository/          # Data access
    model/               # Domain types
  pkg/                   # Public, reusable libraries (use sparingly)
  api/                   # OpenAPI specs, protobuf definitions
  migrations/            # SQL migration files
  scripts/               # Build/deploy helpers
  go.mod
  go.sum
```

**Key rules:**
- `internal/` is compiler-enforced: code inside cannot be imported by external modules.
- Keep `cmd/` thin -- parse config, wire dependencies, call `internal/`.
- Avoid a `pkg/` directory unless you genuinely intend code to be imported by other modules.
  The Go team does not endorse `golang-standards/project-layout` as official (ref: Russ Cox,
  Go issue #45861). Start flat, add structure when complexity demands it.

### Naming Conventions

| Rule | Example | Anti-example |
|------|---------|--------------|
| Exported = PascalCase | `func NewServer()` | `func new_server()` |
| Unexported = camelCase | `var connPool` | `var conn_pool` |
| Package names: short, lowercase, singular | `package user` | `package userService` |
| Acronyms fully capitalized | `HTTPClient`, `ID` | `HttpClient`, `Id` |
| Interfaces: verb+er for single-method | `type Reader interface` | `type IReader interface` |
| Getters omit "Get" prefix | `func (u *User) Name()` | `func (u *User) GetName()` |

Source: Effective Go (https://go.dev/doc/effective_go)

### Architecture Patterns

- **Flat structure** -- best for small services (<10 files). All Go files in root package.
- **Layered (handler/service/repository)** -- most common for mid-size APIs. Clean dependency flow: handler -> service -> repository.
- **Hexagonal / Ports-and-Adapters** -- define domain interfaces in `internal/domain/`, implement adapters in `internal/adapter/`. Best for complex domains or when multiple transports (HTTP + gRPC) coexist.
- **Clean Architecture** -- similar to hexagonal but with explicit use-case interactors. Use when business rules need rigorous isolation from infrastructure.

### HTTP Frameworks

**stdlib net/http (Go 1.22+)** -- now supports method-based routing and path parameters:

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", getUser)    // Method + path param
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("GET /files/{path...}", serveFile)  // Wildcard catch-all
```

`r.PathValue("id")` retrieves the matched segment. This eliminates the need for a
third-party router in many projects.

**Chi** -- net/http compatible, composable middleware, grouped routes. Best choice when you
want enhanced routing but stay close to stdlib patterns. All standard `http.Handler`
middleware works without modification.

**Gin** -- highest raw throughput in benchmarks, large ecosystem. Uses its own `gin.Context`
(not `context.Context`), which couples your handlers to the framework.

**Echo** -- clean API, returns errors from handlers (instead of panic), built-in support for
file serving, WebSocket, and HTTP/2. Uses standard `context.Context`.

### Concurrency Patterns

**Goroutines + channels** -- Go's primary concurrency primitives.

```go
// Fan-out / fan-in with errgroup (golang.org/x/sync/errgroup)
g, ctx := errgroup.WithContext(ctx)
for _, url := range urls {
    g.Go(func() error {
        return fetch(ctx, url)
    })
}
if err := g.Wait(); err != nil {
    // first error cancels ctx, all goroutines wind down
}
```

**When to use channels vs. mutexes:**
- Channels: data flows between goroutines, pipeline stages, fan-out/fan-in, signaling.
- `sync.Mutex`: protecting shared state (counters, caches, maps). Simpler, lower overhead.
- `sync.RWMutex`: multiple concurrent readers, exclusive writer.
- `sync.Once`: one-time initialization (lazy singletons).
- `sync.Pool`: reuse temporary objects to reduce GC pressure.

**Context propagation:**
- Every function doing I/O or long work should accept `context.Context` as its first parameter.
- Use `context.WithTimeout` or `context.WithDeadline` for every external call (DB, HTTP, gRPC).
- Never store contexts in structs; pass them explicitly.

### Error Handling

```go
// Sentinel errors -- package-level, for well-known conditions
var ErrNotFound = errors.New("resource not found")

// Error wrapping -- add context with %w verb
if err != nil {
    return fmt.Errorf("loading user %d: %w", id, err)
}

// Custom error types -- when callers need structured data
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}

// Inspection -- always use errors.Is / errors.As (not == or type assertion)
if errors.Is(err, ErrNotFound) { ... }
var ve *ValidationError
if errors.As(err, &ve) { ... }
```

**Rules:**
- Wrap errors at domain boundaries to add context; do not wrap at every call site.
- Sentinel errors are for conditions callers must match on (e.g., `sql.ErrNoRows`).
- Return `error` as the last return value -- never panic for expected failures.

### Interface Design

- **Accept interfaces, return structs.** Callers define the interface they need.
- Keep interfaces small (1-3 methods). The larger the interface, the weaker the abstraction.
- Define interfaces where they are consumed, not where they are implemented.
- Standard library models: `io.Reader`, `io.Writer`, `fmt.Stringer`.

### Logging & Observability

**log/slog (Go 1.21+, stdlib)** -- structured, leveled logging with JSON or text output:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
logger.Info("request handled",
    slog.String("method", r.Method),
    slog.Int("status", code),
    slog.Duration("latency", elapsed),
)
```

- **zerolog** -- zero-allocation JSON logger. Use when slog overhead matters at >50k logs/sec.
- **OpenTelemetry** -- integrate via `otelslog` bridge (`go.opentelemetry.io/contrib/bridges/otelslog`)
  to inject trace ID and span ID into log records automatically. Adds <1% overhead.
- Be consistent with key names (`request_id`, not `requestId`). Enforce naming conventions.

---

## 2. Anti-Patterns & Pitfalls

### 1. Goroutine leaks
**Why it matters:** Leaked goroutines consume memory and CPU forever. Common cause: sending to
a channel that no one reads, or forgetting to cancel a context. Always use `errgroup` or
explicit cancellation.

### 2. Closing a channel from the receiver side
**Why it matters:** Only the sender should close a channel. Closing from the receiver can cause
a panic if the sender writes to the closed channel. If multiple senders exist, use `sync.Once`
or coordinate via a done channel.

### 3. Ignoring errors
**Why it matters:** `_ = doSomething()` silently swallows failures. In production, this leads to
data corruption or silent degradation. Always handle or explicitly document why an error is
discarded.

### 4. Using `init()` for complex logic
**Why it matters:** `init()` runs at import time, before `main()`. Side effects (DB connections,
HTTP calls) inside `init()` make code untestable, create hidden dependencies, and cause
unpredictable startup failures.

### 5. Nil map writes
**Why it matters:** Writing to a nil map panics at runtime. Always initialize maps with `make()`
before writing, or use `var m = map[K]V{}`.

### 6. Variable shadowing with `:=`
**Why it matters:** Redeclaring a variable with `:=` in an inner scope creates a new variable,
leaving the outer one unchanged. This causes subtle bugs, especially with `err`.

### 7. Misusing `sync.WaitGroup` (Add inside goroutine)
**Why it matters:** If `wg.Add(1)` is called inside the goroutine instead of before `go func()`,
`wg.Wait()` may return before the goroutine starts. Always call `Add` before launching.

### 8. Not using `defer` for cleanup
**Why it matters:** Manual cleanup before every `return` is error-prone. `defer` guarantees
execution even on panics. Use it for closing files, releasing locks, and rolling back
transactions.

### 9. Slice append surprises
**Why it matters:** `append()` may or may not allocate a new backing array. Passing a slice to
a function and appending can modify the caller's data unexpectedly. Use `slices.Clone()` (Go
1.21+) or explicit copy when you need independence.

### 10. Over-using `interface{}` / `any`
**Why it matters:** Bypasses the type system. You lose compile-time safety and force runtime
type assertions everywhere. With generics (Go 1.18+), use type parameters instead.

### 11. Creating utility packages (utils/, helpers/, common/)
**Why it matters:** These become dumping grounds with no cohesion. Name packages by what they
provide (`auth`, `cache`, `retry`), not how they are used.

### 12. Blocking the main goroutine accidentally
**Why it matters:** If `main()` returns, all goroutines are killed instantly -- no cleanup, no
graceful shutdown. Use `signal.NotifyContext` and `server.Shutdown(ctx)` for clean exits.

### 13. Unbounded goroutine creation
**Why it matters:** Spawning a goroutine per request without limits (e.g., `for range requests { go handle(r) }`) can exhaust memory under load. Use worker pools or `semaphore.Weighted`.

### 14. Data races on maps
**Why it matters:** Maps in Go are not safe for concurrent use. Concurrent read+write without
a mutex causes runtime crashes. Use `sync.RWMutex` or `sync.Map` (for specific patterns only).

Sources: "100 Go Mistakes and How to Avoid Them" by Teiva Harsanyi (https://100go.co/),
Effective Go (https://go.dev/doc/effective_go)

---

## 3. Testing Strategy

### Table-Driven Tests

```go
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int
        wantErr bool
    }{
        {name: "valid", input: "25", want: 25},
        {name: "negative", input: "-1", wantErr: true},
        {name: "non-numeric", input: "abc", wantErr: true},
        {name: "empty", input: "", wantErr: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAge(tt.input)
            if (err != nil) != tt.wantErr {
                t.Fatalf("ParseAge(%q) err = %v, wantErr %v", tt.input, err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("ParseAge(%q) = %d, want %d", tt.input, got, tt.want)
            }
        })
    }
}
```

### Testify vs. stdlib

- **stdlib `testing`** -- sufficient for most projects. Zero dependencies.
  Use `t.Errorf` (continue) vs. `t.Fatalf` (stop) deliberately.
- **testify/assert** -- adds `assert.Equal`, `assert.NoError` for readable assertions.
  Adds a dependency but widely adopted. Use `require` (fatal) for preconditions,
  `assert` (non-fatal) for the rest.

### Integration Testing

- Use `TestMain(m *testing.M)` to set up/teardown shared resources (DB, containers).
- Use `testcontainers-go` to spin up real Postgres/Redis/Kafka in tests.
- Use build tags (`//go:build integration`) to separate integration from unit tests.
- Run with: `go test -tags=integration -count=1 ./...`

### Mocking

- **Interface-based mocking** -- define a small interface, implement a mock struct in
  `_test.go`. No library needed for simple cases.
- **testify/mock** -- generates mock expectations with `On` / `Return` / `AssertExpectations`.
- **gomock** -- code-generated mocks via `mockgen`. More strict, better for large interfaces.
- **Prefer fakes over mocks** for repositories -- in-memory implementations are often
  clearer and catch more bugs than mock expectation chains.

### Benchmarking

```go
func BenchmarkHash(b *testing.B) {
    data := []byte("benchmark payload")
    b.ResetTimer()
    for b.Loop() {    // Go 1.24+: b.Loop() replaces manual b.N loop
        sha256.Sum256(data)
    }
}
// Run: go test -bench=BenchmarkHash -benchmem ./...
```

- Use `b.ReportAllocs()` to surface allocations per operation.
- Use `benchstat` to compare results across runs with statistical rigor.

### Fuzzing (Go 1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    f.Add([]byte(`{"name":"test"}`))  // Seed corpus
    f.Fuzz(func(t *testing.T, data []byte) {
        var result map[string]any
        _ = json.Unmarshal(data, &result) // Must not panic
    })
}
// Run: go test -fuzz=FuzzParseJSON -fuzztime=30s ./...
```

- Fuzzing finds panics, crashes, and edge cases humans miss.
- Seed corpus entries in `testdata/fuzz/<FuncName>/` persist across runs.
- Particularly valuable for parsers, validators, and security-sensitive code.

### Test Organization

- Test files: `foo_test.go` alongside `foo.go` in the same package.
- Black-box tests: use `package foo_test` to test only the exported API.
- White-box tests: use `package foo` when you need access to internals.
- Test helpers: use `t.Helper()` to clean up stack traces.

---

## 4. Performance Considerations

### Goroutine & Memory Management

- Goroutines start at ~2-4 KB stack. Creating millions is feasible but not free.
- Use `semaphore.Weighted` or worker pools to bound concurrency under load.
- Avoid allocating in hot loops -- pre-allocate slices with `make([]T, 0, capacity)`.
- Use `sync.Pool` for frequently allocated/freed objects (buffers, temp structs).

### Profiling with pprof

```go
import _ "net/http/pprof"  // Register pprof handlers

go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()
```

Profile types:
- **CPU**: `go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30`
- **Heap**: `go tool pprof http://localhost:6060/debug/pprof/heap`
- **Goroutine**: `go tool pprof http://localhost:6060/debug/pprof/goroutine`
- **Mutex contention**: `go tool pprof http://localhost:6060/debug/pprof/mutex`

Visualize with: `go tool pprof -http=:8080 profile.pb.gz`

### Allocation Reduction

- Use `strings.Builder` instead of `+` concatenation in loops.
- Return values by value (not pointer) for small structs -- keeps them on the stack.
- Avoid `fmt.Sprintf` in hot paths; use `strconv` functions directly.
- Use `slices.Grow()` (Go 1.21+) to pre-extend slice capacity.
- Check escape analysis: `go build -gcflags='-m' ./...`

### Connection Pooling

- `database/sql` has built-in pooling: configure `SetMaxOpenConns`, `SetMaxIdleConns`,
  `SetConnMaxLifetime`, `SetConnMaxIdleTime`.
- `http.Client` reuses connections by default via `http.Transport`. Set
  `MaxIdleConnsPerHost` to match expected parallelism.
- pgx v5 provides its own pool via `pgxpool.New()` -- preferred over `database/sql`
  pooling for PostgreSQL.

### GC Tuning

- **GOGC=100** (default): GC triggers when live heap doubles. Increase (e.g., 200)
  to trade memory for less CPU spent on GC. Decrease (e.g., 50) for lower memory use.
- **GOMEMLIMIT** (Go 1.19+): Sets a soft memory ceiling (e.g., `GOMEMLIMIT=2GiB`).
  The GC becomes more aggressive as usage approaches the limit. Prevents OOM kills in
  containers. Recommended over tuning GOGC alone.
- **Profile before tuning.** Use pprof heap profiles to confirm GC is the bottleneck.
- Go 1.24 introduces Swiss Tables for built-in maps -- measurably faster for
  map-heavy workloads with no code changes.

Source: Go GC Guide (https://go.dev/doc/gc-guide)

---

## 5. Security Considerations

### Input Validation

- Validate all user input at the handler layer before passing to services.
- Use `strconv.Atoi` / `strconv.ParseInt` for numeric conversion -- never `fmt.Sscanf`.
- Limit request body size: `http.MaxBytesReader(w, r.Body, 1<<20)` (1 MB).
- Use a validation library (`go-playground/validator`) for struct tag-based validation.

### SQL Injection Prevention

```go
// SAFE: parameterized query -- arguments sent separately from SQL
row := db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", userID)

// UNSAFE: string interpolation -- SQL injection vector
query := fmt.Sprintf("SELECT name FROM users WHERE id = %s", userID) // NEVER
```

- Always use parameterized queries (`$1`, `?` placeholders).
- `database/sql` automatically uses prepared statements.
- ORMs (GORM, ent) and code generators (sqlc) parameterize by default.

Source: Go docs -- "Avoiding SQL injection risk" (https://go.dev/doc/database/sql-injection)

### Crypto Best Practices

- Use `crypto/rand` for random values (not `math/rand`).
- Use `golang.org/x/crypto/bcrypt` for password hashing (cost >= 12).
- Use `crypto/subtle.ConstantTimeCompare` for token/HMAC comparison.
- Go 1.24 adds FIPS 140-3 compliance support, `crypto/mlkem`, `crypto/hkdf`,
  `crypto/pbkdf2`, and `crypto/sha3` as stdlib packages.

### TLS Configuration

```go
tlsConfig := &tls.Config{
    MinVersion: tls.VersionTLS12,  // Never allow TLS 1.0/1.1
    CipherSuites: nil,             // Let Go choose secure defaults
    PreferServerCipherSuites: true,
}
server := &http.Server{
    TLSConfig: tlsConfig,
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
}
```

- Always set `ReadTimeout`, `WriteTimeout`, `IdleTimeout` to prevent slowloris attacks.
- Use HSTS headers: `Strict-Transport-Security: max-age=63072000; includeSubDomains`.

### CORS & Middleware Security

- Use `github.com/rs/cors` for CORS handling -- configure explicit allowed origins,
  methods, and headers. Never use `AllowAll()` in production.
- Add security headers via middleware: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Content-Security-Policy`.
- Rate-limit endpoints with `golang.org/x/time/rate` or middleware like
  `github.com/ulule/limiter`.

---

## 6. Integration Patterns

### Database

**database/sql (stdlib)** -- universal interface, driver-agnostic. Good for simple use cases
or when you need MySQL + Postgres support.

**pgx v5** -- PostgreSQL-native driver. 30-50% faster than database/sql for Postgres.
Supports COPY, LISTEN/NOTIFY, custom types, batch queries. Use `pgxpool` for connection
pooling.

**sqlc** -- write SQL, generate type-safe Go code. Zero runtime overhead. Ideal for teams
comfortable with SQL who want compile-time safety without an ORM. Supports PostgreSQL,
MySQL, SQLite.

**GORM** -- full ORM with auto-migration, associations, hooks. Highest developer velocity
for CRUD-heavy apps. Performance overhead vs. raw SQL (~20-40% slower). GORM v2 adds
modularity and plugin system.

**ent** -- code-first ORM by Meta. Schema defined in Go code, generates type-safe API.
Strong for complex graph-like data models. Static typing catches errors at compile time.

### Message Queues

**NATS** -- lightweight, high-performance. Built-in pub/sub, request-reply, queue groups.
JetStream adds persistence and exactly-once delivery. Best for microservice communication.
Go client: `github.com/nats-io/nats.go`.

**Kafka** (via `github.com/segmentio/kafka-go` or `confluent-kafka-go`) -- distributed
event streaming. Use for high-throughput event sourcing, audit logs, cross-service data
pipelines. Partition-based parallelism.

**RabbitMQ** (via `github.com/rabbitmq/amqp091-go`) -- traditional message broker with
routing, dead-letter queues, and acknowledgments. Best for task queues and workflow
orchestration.

### gRPC with Protobuf

```protobuf
// user.proto
service UserService {
    rpc GetUser(GetUserRequest) returns (User);
    rpc ListUsers(ListUsersRequest) returns (stream User);
}
```

- Use `buf` (buf.build) for protobuf management over raw `protoc`.
- Implement `UnaryInterceptor` / `StreamInterceptor` for logging, auth, metrics.
- Use `grpc-gateway` to expose gRPC services as REST APIs simultaneously.
- Always set deadlines on gRPC calls via context.

### REST API Design

- Use plural nouns for resources: `/users`, `/orders/{id}`.
- Return appropriate HTTP status codes (201 Created, 204 No Content, 404, 422).
- Use `encoding/json` with struct tags: `json:"name,omitempty"`.
- Implement pagination with cursor-based tokens (not offset-based) for large datasets.
- Version APIs via URL path (`/v1/users`) or `Accept` header.

### File Handling

- Use `os.Root` (Go 1.24+) to restrict filesystem operations to a specific directory,
  preventing path traversal attacks.
- Use `io.LimitReader` to prevent unbounded reads.
- For uploads, stream to storage (S3, GCS) directly rather than buffering in memory.

---

## 7. DevOps & Deployment

### Build

```bash
# Production binary -- static, stripped, with version info
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X main.version=$(git describe --tags)" \
    -o bin/api ./cmd/api
```

- `CGO_ENABLED=0`: static binary, no libc dependency. Required for scratch/distroless.
- `-ldflags="-s -w"`: strip debug info and symbol table (~30% smaller binary).
- `-X main.version=...`: inject build-time variables.
- Go 1.24: `tool` directive in `go.mod` tracks executable dependencies (replaces
  `tools.go` blank-import hack).

### Docker (Multi-Stage)

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /api ./cmd/api

# Runtime stage
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
```

- **scratch**: smallest possible (just your binary). No CA certs, no timezone data.
  Must embed or copy them manually.
- **distroless/static**: ~2 MB. Includes CA certs, timezone data, no shell.
  Preferred for production.
- **Alpine**: ~5 MB. Has shell for debugging. Good for staging.
- Run as non-root: `USER nonroot:nonroot` or use distroless `nonroot` tag.
- Typical final image: 10-20 MB (vs. 800+ MB with full golang base).

### CI/CD

```yaml
# Essential CI checks (GitHub Actions example)
steps:
  - run: go vet ./...                          # Built-in static analysis
  - run: golangci-lint run --timeout 5m        # Meta-linter (40+ linters)
  - run: go test -race -coverprofile=cover.out ./...  # Tests + race detector
  - run: go test -tags=integration ./...       # Integration tests
  - run: govulncheck ./...                     # Known vulnerability scan
```

- **golangci-lint** -- runs staticcheck, gosec, errcheck, gocritic, and 40+ others
  in a single pass. Configure via `.golangci.yml`.
- **govulncheck** -- official Go vulnerability scanner (golang.org/x/vuln/cmd/govulncheck).
- **-race flag** -- enables race detector. Always run in CI; catches data races.
- **-count=1** -- disables test caching for integration tests.

### Cross-Compilation

```bash
# Build for multiple targets
GOOS=linux   GOARCH=amd64 go build -o bin/api-linux-amd64   ./cmd/api
GOOS=linux   GOARCH=arm64 go build -o bin/api-linux-arm64   ./cmd/api
GOOS=darwin  GOARCH=arm64 go build -o bin/api-darwin-arm64   ./cmd/api
GOOS=windows GOARCH=amd64 go build -o bin/api-windows.exe   ./cmd/api
```

Go cross-compiles natively -- no toolchain setup needed (when CGO_ENABLED=0).

### Monitoring

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var requestDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Buckets: prometheus.DefBuckets,
    },
    []string{"method", "path", "status"},
)

func init() { prometheus.MustRegister(requestDuration) }

// Expose metrics endpoint
mux.Handle("GET /metrics", promhttp.Handler())
```

- Export RED metrics: Rate, Errors, Duration.
- Use OpenTelemetry SDK for traces + metrics combined.
- Use runtime metrics exporter for goroutine count, GC stats, memory usage.

---

## 8. Decision Trees

### Which HTTP Framework?

```
Need an HTTP server?
  |
  +-- How many endpoints?
       |
       +-- < 10 endpoints, simple routing
       |     --> stdlib net/http (Go 1.22+)
       |         Zero dependencies, method routing, path params built in.
       |
       +-- 10-50 endpoints, need middleware composition
       |     --> Chi
       |         net/http compatible, grouped routes, standard middleware works.
       |         Best for teams that value stdlib alignment.
       |
       +-- 50+ endpoints, large team, need ecosystem (swagger, validation)
             |
             +-- Performance-critical, willing to couple to framework?
             |     --> Gin
             |         Fastest benchmarks, large middleware ecosystem.
             |         Tradeoff: gin.Context is not stdlib-compatible.
             |
             +-- Prefer clean API, stdlib context, built-in features?
                   --> Echo
                       Returns errors from handlers, built-in file serving,
                       WebSocket, HTTP/2 support.
```

### Which Database Library?

```
Working with a database in Go?
  |
  +-- PostgreSQL only?
  |     |
  |     +-- Team is comfortable writing SQL?
  |     |     |
  |     |     +-- Yes --> sqlc (write SQL, generate type-safe Go code)
  |     |     |           Zero runtime overhead, compile-time safety.
  |     |     |
  |     |     +-- No, want ORM convenience --> GORM or ent
  |     |
  |     +-- Need maximum performance / Postgres-specific features?
  |           --> pgx v5 (direct driver, COPY, LISTEN/NOTIFY, batch)
  |               30-50% faster than database/sql for Postgres.
  |
  +-- Multiple databases (MySQL, SQLite, Postgres)?
  |     --> GORM (broad driver support, auto-migration)
  |         or database/sql + sqlx (lightweight, multi-DB)
  |
  +-- Complex graph-like data model with relationships?
        --> ent (code-first schema, graph traversal API)
            Strong type safety, generated code, Meta-backed.
```

### When Channels vs. Mutexes?

```
Need to share state between goroutines?
  |
  +-- Is data flowing from producer to consumer?
  |     --> Channel
  |         Pipeline pattern, fan-out/fan-in, signaling completion.
  |
  +-- Are you protecting shared state (map, counter, cache)?
  |     |
  |     +-- Read-heavy workload?
  |     |     --> sync.RWMutex (concurrent reads, exclusive writes)
  |     |
  |     +-- Simple counter?
  |     |     --> sync/atomic (lock-free, lowest overhead)
  |     |
  |     +-- General case?
  |           --> sync.Mutex (simplest, lowest cognitive overhead)
  |
  +-- Need to coordinate N goroutines + collect first error?
  |     --> errgroup.Group (with context cancellation)
  |
  +-- Need one-time initialization?
        --> sync.Once
```

---

## 9. Code Examples

### Graceful HTTP Server Shutdown

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      newRouter(),
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("server failed", "error", err)
            os.Exit(1)
        }
    }()

    <-ctx.Done()
    slog.Info("shutting down gracefully")

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer cancel()
    if err := srv.Shutdown(shutdownCtx); err != nil {
        slog.Error("shutdown error", "error", err)
    }
}
```

### Repository Pattern with Interface

```go
// internal/domain/user.go -- domain defines the interface
type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    Save(ctx context.Context, user *User) error
}

// internal/repository/postgres/user.go -- adapter implements it
type pgUserRepo struct {
    pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) domain.UserRepository {
    return &pgUserRepo{pool: pool}
}

func (r *pgUserRepo) FindByID(ctx context.Context, id int64) (*domain.User, error) {
    var u domain.User
    err := r.pool.QueryRow(ctx,
        "SELECT id, name, email FROM users WHERE id = $1", id,
    ).Scan(&u.ID, &u.Name, &u.Email)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, domain.ErrNotFound
    }
    return &u, err
}
```

### Middleware Chain (stdlib-compatible)

```go
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        sw := &statusWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(sw, r)
        slog.Info("request",
            slog.String("method", r.Method),
            slog.String("path", r.URL.Path),
            slog.Int("status", sw.status),
            slog.Duration("latency", time.Since(start)),
        )
    })
}

type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}
```

### Worker Pool with Bounded Concurrency

```go
func processItems(ctx context.Context, items []Item, maxWorkers int) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(maxWorkers) // Go 1.20+: built-in concurrency limiter

    for _, item := range items {
        g.Go(func() error {
            return process(ctx, item)
        })
    }
    return g.Wait()
}
```

### Functional Options Pattern

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *slog.Logger
}

type Option func(*Server)

func WithAddr(addr string) Option    { return func(s *Server) { s.addr = addr } }
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
func WithLogger(l *slog.Logger) Option   { return func(s *Server) { s.logger = l } }

func NewServer(opts ...Option) *Server {
    s := &Server{
        addr:    ":8080",
        timeout: 30 * time.Second,
        logger:  slog.Default(),
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

---

*Researched: 2026-03-07 | Sources: [Effective Go](https://go.dev/doc/effective_go), [Go Blog: Routing Enhancements](https://go.dev/blog/routing-enhancements), [Go 1.24 Release Notes](https://go.dev/doc/go1.24), [Go GC Guide](https://go.dev/doc/gc-guide), [Go SQL Injection Prevention](https://go.dev/doc/database/sql-injection), [100 Go Mistakes](https://100go.co/), [Go Blog: Working with Errors](https://go.dev/blog/go1.13-errors), [Go Fuzzing Docs](https://go.dev/doc/security/fuzz/), [Eli Bendersky: HTTP Routing in Go 1.22](https://eli.thegreenplace.net/2023/better-http-server-routing-in-go-122/), [JetBrains: Comparing DB Packages](https://blog.jetbrains.com/go/2023/04/27/comparing-db-packages/), [Encore: Best Go Frameworks 2026](https://encore.dev/articles/best-go-backend-frameworks), [Encore: Advanced Concurrency](https://encore.dev/blog/advanced-go-concurrency), [Alex Edwards: Structuring Go Projects](https://www.alexedwards.net/blog/11-tips-for-structuring-your-go-projects), [Dash0: slog Guide](https://www.dash0.com/guides/logging-in-go-with-slog), [Calhoun.io: ServeMux vs Chi](https://www.calhoun.io/go-servemux-vs-chi/)*
