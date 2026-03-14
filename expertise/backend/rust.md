# Rust -- Expertise Module

> A Rust developer builds high-performance, memory-safe systems software -- from backend web services and CLI tools to embedded systems and infrastructure. The scope spans safe concurrency, zero-cost abstractions, FFI interop, and production deployment of compiled binaries with minimal runtime overhead.

---

## Core Patterns & Conventions

### Project Structure

Standard Cargo layout (per the Cargo Book):
```
my-project/
  Cargo.toml
  src/main.rs        # Binary crate root
  src/lib.rs         # Library crate root
  src/bin/           # Additional binaries
  tests/             # Integration tests
  benches/           # Benchmarks (Criterion)
  examples/          # Runnable examples
```

**Cargo Workspace** for larger projects -- share `Cargo.lock` and output directory:
```toml
[workspace]
resolver = "2"
members = ["crates/core", "crates/api", "crates/cli", "crates/db", "crates/common"]

[workspace.dependencies]
tokio = { version = "1.44", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
tracing = "0.1"
```

Centralise dependencies in `[workspace.dependencies]` and inherit with `dep.workspace = true`. Prevents version drift, cuts build times 40-60%. Start with 2-3 crates; split only when coupling causes genuine pain.

### Naming Conventions (RFC 430 & Rust API Guidelines)

| Item | Convention | Example |
|------|-----------|---------|
| Types, Traits, Enums | `UpperCamelCase` | `HttpRequest`, `IntoIterator` |
| Functions, methods, variables | `snake_case` | `process_order` |
| Constants, statics | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES` |
| Modules, crate names | `snake_case`, no `-rs` suffix | `auth_service` |
| Acronyms in `snake_case` | Lowercase | `is_xid_start` |

Iterator methods: `iter()`, `iter_mut()`, `into_iter()`. Conversions: `as_`, `to_`, `into_` prefixes.

### Architecture Patterns

**Layered / Hexagonal** -- Keep `core` crate framework-agnostic. Define traits (ports) in the domain; implement in adapter crates. The domain never imports infrastructure:
```rust
#[async_trait]
pub trait OrderRepository: Send + Sync {
    async fn find_by_id(&self, id: OrderId) -> Result<Option<Order>, DomainError>;
    async fn save(&self, order: &Order) -> Result<(), DomainError>;
}
```

**Actor Model** -- Actix provides actors that own their state, communicate via messages, and run on an async executor. Good for stateful, concurrent systems with isolated failure domains.

### Web Frameworks

- **Axum (v0.8)** -- Built by Tokio team, uses Tower middleware. Minimal by design. Best Tokio ecosystem integration. Default choice for most projects.
- **Actix Web (v4.12)** -- Highest raw throughput (~19-20K req/s vs ~17-18K for Axum). Largest middleware ecosystem. More complex.
- **Rocket (v0.5)** -- Simplest DX, type-safe routing, built-in form handling. Smallest community.

### Async Patterns (Tokio)

Use Tokio (v1.44+) as the default runtime. Critical rules:
- Tasks yield only at `.await` -- CPU work >100us without `.await` blocks the executor.
- Use `tokio::task::spawn_blocking` for synchronous/CPU-heavy work.
- Use `tokio::sync::mpsc` channels for inter-task communication.
- Never hold a `MutexGuard` across `.await` -- lock, copy, drop, then await.
- Prefer `async fn` in traits (stable since Rust 1.75) over `Pin<Box<dyn Future>>`.

### Error Handling

**Libraries** -- `thiserror` (v2.0) for structured, matchable error enums:
```rust
#[derive(thiserror::Error, Debug)]
pub enum ServiceError {
    #[error("entity not found: {id}")]
    NotFound { id: String },
    #[error(transparent)]
    Database(#[from] sqlx::Error),
}
```

**Applications** -- `anyhow` (v2.0) for ergonomic propagation with `.context()`. Always use `#[from]`/`#[source]` to preserve error chains. Keep variants under ~10 per enum.

### Ownership and Borrowing

- Prefer borrowing (`&T`) over cloning. Use `Cow<'a, str>` when allocation is conditional.
- One `&mut T` XOR many `&T` -- never both simultaneously.
- `Arc<T>` for shared ownership across threads; `Weak` to break cycles.
- Accept `&str` or `impl AsRef<str>` for read-only string parameters; `impl Into<String>` when storing.

### Trait Design Patterns

**Newtype** -- Wrap primitives for type safety at zero cost: `pub struct UserId(pub Uuid);`
**Extension Traits** -- Add methods to foreign types without orphan rule violations.
**Builder Pattern** -- For structs with many optional fields; `.build()` returns `Result<T>`.

### Logging and Observability

Use `tracing` (not `log`). Provides structured spans and events for async contexts:
```rust
#[instrument(skip(db), fields(user_id = %user_id))]
async fn get_user(db: &Pool, user_id: Uuid) -> Result<User> {
    info!("fetching user");
    db.fetch_user(user_id).await
}
```
- `tracing-subscriber` with JSON layer for production.
- `tracing-opentelemetry` for distributed tracing.

---

## Anti-Patterns & Pitfalls

### 1. Excessive `.clone()` to Appease the Borrow Checker
Each clone allocates and copies. Habitual cloning defeats zero-copy and causes slowdowns in hot paths. **Fix:** Restructure to use references, `Cow`, or `Arc`.

### 2. `.unwrap()` / `.expect()` in Production Code
Both panic on `None`/`Err`, crashing the process. In async servers, one panic kills a worker thread. **Fix:** Use `?`, `map`, `and_then`. Reserve unwrap for tests.

### 3. Blocking the Async Runtime
Synchronous I/O or CPU-heavy work (>100us) without `.await` starves all tasks on that worker. **Fix:** `tokio::task::spawn_blocking` or `tokio::fs`.

### 4. Holding a Mutex Guard Across `.await`
`std::sync::MutexGuard` is `!Send`. Even `tokio::sync::Mutex` guards across await points risk deadlocks. **Fix:** Lock, copy, drop guard, then await.

### 5. Stringly-Typed Errors
`Box<dyn Error>` everywhere prevents programmatic recovery. **Fix:** `thiserror` enums in libraries, `anyhow` in applications.

### 6. Ignoring Clippy Warnings
Clippy catches real bugs: ignored `Result` values, suboptimal iterator chains, unnecessary allocations. **Fix:** `cargo clippy -- -D warnings` in CI.

### 7. Premature `unsafe`
Each `unsafe` block opts out of compiler guarantees. Bugs cause UB. **Fix:** Exhaust safe alternatives. Document `// SAFETY:` invariants. Audit with Miri.

### 8. Over-Abstracting with Generics
Excessive `where` clauses create unreadable signatures and monomorphisation bloat. **Fix:** `impl Trait` for simple cases; `dyn Trait` when static dispatch is unnecessary.

### 9. `Rc`/`Arc` Reference Cycles
Parent holding `Arc<Child>` + child holding `Arc<Parent>` leaks both. **Fix:** `Weak` for back-pointers. Arena allocators for graphs.

### 10. Applying OOP Inheritance Patterns
Rust has no inheritance. Forcing class hierarchies via `Any` downcasting fights ownership. **Fix:** Composition over inheritance. Enums for closed sets, traits for open extension.

### 11. Large Enum Variants Wasting Stack Space
An enum is as large as its biggest variant. One `[u8; 4096]` variant makes every instance 4KB+. **Fix:** `Box` large variants.

### 12. Forgetting Async Cancellation Safety
When a future is dropped via `select!`, partial work may be lost. **Fix:** Design cancellation-safe operations. Document which futures are safe to cancel.

### 13. Using `String` When `&str` Suffices
Accepting `String` forces callers to allocate even when they have a `&str`. **Fix:** Accept `&str` for read-only parameters.

---

## Testing Strategy

### Unit Tests (Inline `#[cfg(test)]`)
Place in the same file; access private functions. Use `#[tokio::test]` for async:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn valid_email() { assert!(validate_email("user@example.com")); }
}
```

### Integration Tests (`tests/` Directory)
Each file compiles as a separate crate, accesses only the public API. Use `testcontainers` for real database instances in Docker.

### Property-Based Testing (proptest)
Test invariants across random inputs with automatic shrinking:
```rust
proptest! {
    #[test]
    fn parse_roundtrip(s in "[a-zA-Z0-9]{1,64}") {
        let parsed = MyType::parse(&s).unwrap();
        assert_eq!(parsed.to_string(), s);
    }
}
```

### Mocking (mockall)
Generate mock trait implementations: `#[automock]` on trait definitions. Set expectations with `.expect_method().returning(|_| ...)`.

### Benchmark Testing (Criterion)
Statistically rigorous micro-benchmarks with regression detection. Place in `benches/` directory.

### Doc Tests
Code in `///` comments runs as tests via `cargo test`. Ensures examples stay in sync with the API.

---

## Performance Considerations

### Zero-Cost Abstractions
Iterators, closures, and generics compile to the same machine code as hand-written loops. Prefer `iter().map().filter().collect()` over manual indexing.

### Memory Allocation Patterns
- **Stack vs Heap:** Stack is near-instant. `Box<T>` for large values. Avoid boxing small, short-lived values.
- **Arena Allocation:** `bumpalo` or `typed-arena` for graphs or many short-lived objects. Freed all at once.
- **Small-String Optimisation:** `compact_str` for strings usually <24 bytes.

### Profiling Tools

| Tool | Purpose |
|------|---------|
| `cargo flamegraph` | CPU flame graphs via perf/DTrace |
| `samply` | Sampling profiler with GUI |
| DHAT (Valgrind) | Heap allocation profiling |
| `tokio-console` | Async task scheduling visualisation |
| Criterion | Micro-benchmark regression detection |

**Workflow:** Baseline with Criterion, profile with flamegraph, optimise, re-benchmark.

### Async Runtime Tuning
- Default: one worker thread per core. Override with `#[tokio::main(worker_threads = N)]`.
- `tokio::task::spawn_blocking` for >100us operations.
- `FuturesUnordered` or `JoinSet` for concurrent fan-out.

### SIMD and Unsafe Optimisation
- `std::simd` (nightly) or portable-simd for data-parallel operations (4x+ gains possible).
- Always benchmark -- thermal throttling can reduce SIMD gains.
- Minimise `unsafe` scope; validate with Miri.

---

## Security Considerations

### Memory Safety
Rust's ownership model eliminates use-after-free, double-free, buffer overflows, and data races at compile time.

### Unsafe Code Auditing
- `cargo-geiger` -- maps all `unsafe` across the dependency tree.
- `cargo +nightly miri test` -- detects UB in unsafe code at runtime.
- Document `// SAFETY:` invariants for every `unsafe` block.

### Dependency Auditing
- **`cargo audit`** -- checks `Cargo.lock` against the RustSec Advisory Database.
- **`cargo deny`** -- license checks, duplicate deps, source restrictions, advisories. Run in CI.
- **`cargo vet`** -- supply-chain auditing, tracks reviewed crate versions.

### Cryptography
- **`rustls`** (v0.23+) for TLS. Pure Rust, audited. Default crypto: `aws-lc-rs`; alternative: `ring`.
- Never implement custom crypto. Use `ring` or `aws-lc-rs` for primitives.
- Post-quantum: `pqcrypto` (ML-KEM, ML-DSA).

### Input Validation
- Validate at the boundary (API handlers, CLI parsers, file readers).
- Newtypes with validation constructors (e.g., `Email::new()` rejects invalid formats).
- `#[serde(deny_unknown_fields)]` to reject unexpected JSON fields.
- `validator` crate for declarative validation rules.

---

## Integration Patterns

### Database

- **sqlx (v0.8)** -- Async, compile-time checked SQL. Not an ORM. Best for raw SQL comfort.
- **Diesel (v2.3)** -- Sync, compile-time schema verification via codegen. Strongest type safety.
- **SeaORM (v2.0)** -- Async-first dynamic ORM. Familiar to ActiveRecord/Django developers.

### Message Queues
- **RabbitMQ:** `lapin` -- fully async AMQP 0.9.1 client. Advanced routing, persistent queues.
- **Kafka:** `rdkafka` -- wraps librdkafka. Consumer groups, rebalancing, transactional production.
- **Abstraction:** `omniqueue` -- unified interface over Redis, RabbitMQ, SQS.

### gRPC (tonic)
Built on Hyper and Tower, sharing middleware with Axum. Define services in `.proto`, generate with `tonic-build`. Axum and Tonic can multiplex on the same port via `axum_tonic`.

### REST API (Axum)
Extractors decompose requests: `Path`, `Query`, `Json`, `State`. Tower layers provide middleware (tracing, CORS, rate limiting, auth) shared with Tonic.

### FFI (C Interop)
- `#[repr(C)]` on structs for C-compatible layout.
- `CString`/`CStr` for string exchange. Never pass Rust `String` directly.
- Never panic across FFI -- use `std::panic::catch_unwind`.
- `cxx` crate for safe C++/Rust interop with compile-time validation.

---

## DevOps & Deployment

### Build Optimisation
```toml
[profile.release]
opt-level = 3
lto = "fat"            # 10-20% faster runtime, slower compile
codegen-units = 1      # Better optimisation, slower compile
panic = "abort"        # Smaller binary, no unwinding
strip = "symbols"      # Strip debug symbols
```

### Docker (Multi-Stage with musl)
```dockerfile
FROM rust:1.85-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM scratch
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/my-app /my-app
USER 1000:1000
ENTRYPOINT ["/my-app"]
```

### CI/CD Pipeline
Run on every commit: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test --workspace`, `cargo deny check`. Add `cargo-tarpaulin` for coverage.

### Cross-Compilation
Use `cross` for container-based builds: `cross build --release --target aarch64-unknown-linux-musl`.

### Monitoring
`metrics` crate + `metrics-exporter-prometheus`. Expose `/metrics` endpoint in Axum.

---

## Decision Trees

### Which Web Framework?
```
Need maximum raw throughput?
  YES --> Actix Web
  NO  --> Tokio integration important?
            YES --> Axum (default choice for most teams)
            NO  --> Simplicity top priority?
                      YES --> Rocket
                      NO  --> Axum
```

### Which Async Runtime?
```
Web service / networked application?
  YES --> Tokio (de facto standard)
  NO  --> Embedded / no-std?
            YES --> embassy
            NO  --> Tokio
```

### Which Database Library?
```
Comfortable with raw SQL + need async?
  YES --> sqlx
  NO  --> Maximum compile-time safety?
            YES --> Diesel
            NO  --> Familiar ORM style?
                      YES --> SeaORM
                      NO  --> sqlx
```

---

## Code Examples

### 1. Axum Handler with Error Mapping
```rust
use axum::{extract::{Path, State}, http::StatusCode, response::IntoResponse, Json};

async fn get_order(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Order>, AppError> {
    let order = sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", id)
        .fetch_optional(&pool).await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(order))
}

enum AppError { NotFound, Internal(anyhow::Error) }

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::NotFound => StatusCode::NOT_FOUND.into_response(),
            Self::Internal(e) => {
                tracing::error!("internal error: {e:#}");
                StatusCode::INTERNAL_SERVER_ERROR.into_response()
            }
        }
    }
}

impl<E: Into<anyhow::Error>> From<E> for AppError {
    fn from(err: E) -> Self { Self::Internal(err.into()) }
}
```

### 2. Async Fan-Out with JoinSet
```rust
use tokio::task::JoinSet;

async fn fetch_all_prices(symbols: &[String]) -> anyhow::Result<Vec<(String, f64)>> {
    let mut set = JoinSet::new();
    for sym in symbols {
        let s = sym.clone();
        set.spawn(async move { Ok::<_, anyhow::Error>((s.clone(), fetch_price(&s).await?)) });
    }
    let mut results = Vec::with_capacity(symbols.len());
    while let Some(res) = set.join_next().await { results.push(res??); }
    Ok(results)
}
```

### 3. Newtype with Serde Validation
```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn new(raw: &str) -> Result<Self, ValidationError> {
        if raw.contains('@') && raw.len() <= 254 {
            Ok(Self(raw.to_lowercase()))
        } else {
            Err(ValidationError::InvalidEmail(raw.into()))
        }
    }
    pub fn as_str(&self) -> &str { &self.0 }
}

impl<'de> serde::Deserialize<'de> for EmailAddress {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        Self::new(&s).map_err(serde::de::Error::custom)
    }
}
```

### 4. Instrumented Service with Tracing
```rust
impl OrderService {
    #[instrument(skip(self), fields(order_id = %id))]
    pub async fn cancel_order(&self, id: Uuid) -> Result<(), DomainError> {
        let order = self.repo.find(id).await?
            .ok_or(DomainError::OrderNotFound { order_id: id })?;
        if order.is_shipped() {
            warn!("attempted to cancel shipped order");
            return Err(DomainError::AlreadyShipped { order_id: id });
        }
        self.repo.update_status(id, OrderStatus::Cancelled).await?;
        info!("order cancelled");
        Ok(())
    }
}
```

---

*Researched: 2026-03-07 | Sources: [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/naming.html), [RFC 430](https://rust-lang.github.io/rfcs/0430-finalizing-naming-conventions.html), [Cargo Book - Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html), [Cargo Book - Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html), [Rust Design Patterns](https://rust-unofficial.github.io/patterns/), [Rust Performance Book](https://nnethercote.github.io/perf-book/profiling.html), [Tokio Tutorial](https://tokio.rs/tokio/tutorial), [Axum Docs](https://docs.rs/axum/latest/axum/), [Tracing Docs](https://docs.rs/tracing), [RustSec](https://rustsec.org/), [Rustls](https://github.com/rustls/rustls), [Effective Rust - FFI](https://effective-rust.com/ffi.html), [Rust Web Frameworks 2026](https://aarambhdevhub.medium.com/rust-web-frameworks-in-2026-axum-vs-actix-web-vs-rocket-vs-warp-vs-salvo-which-one-should-you-2db3792c79a2), [Rust ORMs 2026](https://aarambhdevhub.medium.com/rust-orms-in-2026-diesel-vs-sqlx-vs-seaorm-vs-rusqlite-which-one-should-you-actually-use-706d0fe912f3), [Diesel vs SQLx vs SeaORM 2026](https://reintech.io/blog/diesel-vs-sqlx-vs-seaorm-rust-database-library-comparison-2026), [Rust Error Handling Compared](https://dev.to/leapcell/rust-error-handling-compared-anyhow-vs-thiserror-vs-snafu-2003), [Rust Security Auditing 2026](https://sherlock.xyz/post/rust-security-auditing-guide-2026), [Async Rust Evolution (JetBrains)](https://blog.jetbrains.com/rust/2026/02/17/the-evolution-of-async-rust-from-tokio-to-high-level-applications/), [Rust Testing Patterns](https://dasroot.net/posts/2026/03/rust-testing-patterns-reliable-releases/), [Workspace Best Practices](https://reintech.io/blog/cargo-workspace-best-practices-large-rust-projects)*
