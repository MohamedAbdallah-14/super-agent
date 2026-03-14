# Java + Spring Boot — Expertise Module

> A Java/Spring Boot specialist designs, builds, and maintains backend services using the Spring ecosystem on
> Java 21+. Scope covers REST/GraphQL APIs, data access, security, messaging, observability, and cloud-native
> deployment — from monolith to microservices — with emphasis on production-grade reliability and performance.

---

## 1. Core Patterns & Conventions

### 1.1 Project Structure

**Feature-based packaging** over layer-based for anything beyond trivial services. Group all layers
(controller, service, repository, model) per domain concept for cohesion and future extractability.

```
com.example.app
├── order/                   # Feature package
│   ├── OrderController.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   ├── Order.java
│   └── OrderDto.java
├── product/
├── shared/                  # Cross-cutting: exceptions, config, security
└── Application.java
```

**Multi-module** rule: one module per deployable artifact. Common split: `app-api` (controllers),
`app-domain` (entities, services, ports — no Spring), `app-infrastructure` (JPA, messaging adapters),
`app-common` (shared DTOs, exceptions).

### 1.2 Naming Conventions

| Element          | Convention             | Example                          |
|------------------|------------------------|----------------------------------|
| Classes          | PascalCase, noun       | `OrderService`, `PaymentGateway` |
| Interfaces       | No `I` prefix          | `OrderRepository`                |
| Methods          | camelCase, verb-first  | `findByStatus()`, `cancelOrder()`|
| Constants        | UPPER_SNAKE_CASE       | `MAX_RETRY_COUNT`                |
| REST endpoints   | kebab-case, plural     | `/api/v1/purchase-orders`        |
| Config properties| kebab-case             | `app.order-service.max-retries`  |
| DB tables/cols   | snake_case             | `purchase_order`, `created_at`   |

### 1.3 Architecture Patterns

- **Layered** (simple CRUD): Controller -> Service -> Repository -> DB. Quick, sufficient for small contexts.
- **Hexagonal / Ports & Adapters** (complex domains): Domain at center with zero framework deps. Inbound ports define use cases; outbound ports define infra contracts. Preferred for DDD, well-supported by Spring Modulith.
- **DDD tactical patterns**: Entities (identity + lifecycle), Value Objects (immutable, use records), Aggregates (consistency boundaries), Domain Events (via `ApplicationEventPublisher`), Repositories (one per aggregate root).

### 1.4 Spring Boot 3.x Patterns

- **Auto-configuration**: Override selectively via `@ConditionalOnProperty` / `@ConditionalOnMissingBean`. Exclude specific classes, not wholesale: `@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})`
- **Profiles**: `application-{profile}.yml` for env config (`dev`, `test`, `prod`). Prefer externalized config (env vars, config maps) over profile-specific `@Configuration` classes.
- **Custom starters**: For shared cross-cutting concerns in multi-service orgs: `company-spring-boot-starter-observability`.

### 1.5 Dependency Injection

**Constructor injection is mandatory** (Spring team recommendation). Immutable fields, testable without reflection, fails fast. Single constructor needs no `@Autowired`. Use `@Qualifier` for disambiguation. Never use `@Autowired` on fields.

### 1.6 Data Access

- **Spring Data JPA** (default): `JpaRepository<T, ID>`, derived queries, `@Query` JPQL, `@Transactional(readOnly = true)` on reads, projections (interfaces/records) for read-only queries.
- **JdbcClient** (Spring Boot 3.2+): Lightweight alternative for simple/bulk queries.
- **R2DBC**: Only with WebFlux end-to-end; mixing with blocking JPA defeats the purpose.

### 1.7 Error Handling — RFC 7807 ProblemDetail

Enable globally with `spring.mvc.problemdetails.enabled: true`. Combine with `@RestControllerAdvice extends ResponseEntityExceptionHandler` for custom exception mapping. Return `ProblemDetail` with `type`, `title`, `status`, `detail`, and custom properties.

### 1.8 Logging & Observability

- **Structured logging**: SLF4J + Logback with `logstash-logback-encoder` (JSON in prod). Include trace/span IDs via Micrometer.
- **Micrometer + OpenTelemetry**: Micrometer as metrics facade; OTLP export for metrics, traces, logs (Spring Boot 3.2+). Use `@Observed` for custom observations. Spring Boot 4 adds `spring-boot-starter-opentelemetry`.

### 1.9 Virtual Threads (Project Loom)

Enable: `spring.threads.virtual.enabled: true` (Spring Boot 3.2+). Configures Tomcat/Jetty + `@Async` + executors.

**Rules**: Replace `synchronized` with `ReentrantLock` (avoid carrier-thread pinning). Never pool virtual threads. Use `ScopedValue` over `ThreadLocal`. Monitor pinning: `-Djdk.tracePinnedThreads=short`. Increase HikariCP pool size for higher concurrency.

---

## 2. Anti-Patterns & Pitfalls

### 2.1 Field Injection Everywhere
`@Autowired` on fields hides dependencies, prevents immutability, requires reflection for testing. Use constructor injection.

### 2.2 God Service Classes
Services with 20+ methods spanning multiple domains violate SRP. Split by bounded context or use case.

### 2.3 Catching Exception/Throwable Generically
Swallows programming errors (`NullPointerException`, `IllegalStateException`). Catch specific exceptions; let unexpected ones reach the global handler.

### 2.4 N+1 Query Problem
Lazy-loaded collections trigger one query per entity (100 orders = 101 queries). Fix: `@EntityGraph`, `JOIN FETCH`, or DTO projections.

### 2.5 Missing @Transactional(readOnly = true)
Read-write transactions on read paths hold write locks, prevent replica routing, waste connection time.

### 2.6 Unbounded Caches
`@Cacheable` without TTL or max-size causes OOM. Always configure eviction; monitor hit rates.

### 2.7 Full Spring Context in Unit Tests
`@SpringBootTest` for a single class loads everything — tests take seconds instead of ms. Use JUnit + Mockito for units; slice tests for layers.

### 2.8 Business Logic in Controllers
Controllers should handle HTTP concerns only. Business rules in controllers can't be reused (messaging, scheduled tasks) and are harder to test.

### 2.9 Ignoring Connection Pool Configuration
HikariCP defaults (`maximumPoolSize=10`) are rarely optimal. With virtual threads, connection starvation is common. Size based on load: `connections = (core_count * 2) + spindle_count`.

### 2.10 Returning JPA Entities from Controllers
Exposes internal schema, creates DB-API coupling, risks infinite recursion with bidirectional relationships, leaks sensitive fields. Map to DTOs (records).

### 2.11 Hardcoded Configuration Values
Connection strings, timeouts in code require recompilation. Use `@ConfigurationProperties` with `@Validated`.

### 2.12 No Database Migrations
`ddl-auto=update` in production causes unpredictable changes and data loss. Use Flyway or Liquibase.

### 2.13 Synchronous Microservice Chains
HTTP calls across 5+ services multiply latency and cascade failures. Use async messaging for non-critical flows; circuit breakers (Resilience4j) for sync calls.

### 2.14 Missing Input Validation
Trusting client input leads to injection, corrupt data, cryptic errors. Bean Validation (`@Valid`) at controller boundary; domain validation in constructors.

---

## 3. Testing Strategy

### 3.1 Unit Testing (JUnit 5 + Mockito + AssertJ)
Test classes in isolation, no Spring context. `@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`. Use AssertJ fluent assertions (`assertThat`, `assertThatThrownBy`).

### 3.2 Slice Testing
- **@WebMvcTest**: Controller layer with MockMvc; mock services via `@MockBean`.
- **@DataJpaTest**: JPA repos with embedded DB or Testcontainers. Auto-configures `EntityManager` only.

### 3.3 Integration Testing (Testcontainers)
Spring Boot 3.1+ first-class support. Use `@ServiceConnection` (replaces `@DynamicPropertySource`) for automatic datasource/broker config from containers. Prefer Testcontainers over H2 for realistic tests.

```java
@SpringBootTest
@Testcontainers
class OrderIntegrationTest {
    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderService orderService;

    @Test
    void shouldPersistAndRetrieveOrder() {
        var id = orderService.placeOrder(new CreateOrderCommand(...));
        assertThat(orderService.findById(id).status()).isEqualTo(OrderStatus.PLACED);
    }
}
```

### 3.4 Contract Testing (Spring Cloud Contract)
Define contracts in Groovy/YAML. Producer generates tests; consumer gets stub server. Ensures API compatibility without deploying both services.

### 3.5 Architecture Testing (ArchUnit)
Enforce layer dependencies, no-field-injection rules, naming conventions, and cycle-free packages as unit tests. Integrates with JUnit 5. Current version: 1.4.x (2025).

### 3.6 Testing Pyramid

| Level        | Framework                  | Speed   | Ratio |
|--------------|----------------------------|---------|-------|
| Unit         | JUnit 5 + Mockito          | ms      | 70%   |
| Slice        | @WebMvcTest / @DataJpaTest | ~1-3s   | 15%   |
| Integration  | @SpringBootTest + TC       | ~5-15s  | 10%   |
| Contract     | Spring Cloud Contract      | ~2-5s   | 5%    |
| Architecture | ArchUnit                   | ms      | +     |

---

## 4. Performance Considerations

### 4.1 JVM Tuning
- **GC**: G1GC (default, balanced); ZGC for low-latency (<1ms pauses).
- **Heap**: `-Xms` = `-Xmx` in containers (avoid resize overhead). JVM auto-detects cgroup limits (Java 10+).
- **Always on in prod**: `-Xlog:gc*:file=gc.log:time`. Set `-XX:MaxMetaspaceSize`.

### 4.2 Startup Optimization

| Technique              | Impact          | Trade-off                           |
|------------------------|-----------------|-------------------------------------|
| GraalVM Native Image   | ~50-75ms start  | Long build, no runtime reflection   |
| CDS (Class Data Sharing)| 30-50% faster  | Requires training run               |
| Lazy init              | 30-40% faster   | First request slower                |
| Spring AOT             | 20-30% faster   | Build-time bean resolution          |

### 4.3 HikariCP Connection Pooling
Tune `maximum-pool-size` (default 10 is rarely enough), `idle-timeout`, `max-lifetime`, `leak-detection-threshold`. Increase pool size with virtual threads — more concurrent requests means more simultaneous connection demand.

### 4.4 Caching
Caffeine for local (TTL, max-size, async refresh). Redis for distributed. Always set TTL + max-size; monitor hit/miss with Micrometer. Use `@Cacheable(unless = "#result == null")`.

### 4.5 Virtual Threads vs WebFlux

| Criterion       | MVC + Virtual Threads     | WebFlux (Reactive)        |
|-----------------|---------------------------|---------------------------|
| Code style      | Imperative (familiar)     | Functional/reactive       |
| Debugging       | Standard stack traces     | Complex async traces      |
| DB support      | JDBC, JPA (full ecosystem)| R2DBC (limited)           |
| Backpressure    | Manual (semaphore)        | Built-in (Reactor)        |
| Best for        | 90% of enterprise apps    | Streaming, gateways, SSE  |

**Default (2025+)**: MVC + virtual threads for new projects.

---

## 5. Security Considerations

### 5.1 Spring Security 6.x
Component-based config — no `WebSecurityConfigurerAdapter`. Declare `SecurityFilterChain` bean. Use `requestMatchers()` (not deprecated `antMatchers()`).

### 5.2 OAuth2 Resource Server
Add `spring-boot-starter-oauth2-resource-server`. Configure `spring.security.oauth2.resourceserver.jwt.issuer-uri`. Validate `aud` claim. Use `oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))`.

### 5.3 Method-Level Security
`@EnableMethodSecurity` (replaces `@EnableGlobalMethodSecurity`). Use `@PreAuthorize` / `@PostAuthorize` with SpEL expressions for fine-grained access control.

### 5.4 CSRF & CORS
Disable CSRF only for stateless APIs (JWT/OAuth2). Configure CORS explicitly per origin — never `allowedOrigins("*")` in production. Set allowed methods and headers explicitly.

### 5.5 Input Validation
Bean Validation on DTOs (`@NotNull`, `@Size`, `@Positive`) + `@Valid` at controller boundary. Custom validators for cross-field logic. Domain validation in constructors as second defense.

---

## 6. Integration Patterns

### 6.1 REST API (Spring MVC + OpenAPI)
Use `springdoc-openapi-starter-webmvc-ui` (2.8.x) for OpenAPI 3.x + Swagger UI. Generate client SDKs with OpenAPI Generator.

### 6.2 Messaging
- **Spring Kafka**: `@KafkaListener(topics, groupId)` for consumers.
- **Spring Cloud Stream**: Broker-agnostic — define `Function`/`Consumer`/`Supplier` beans, bind via config. Switch Kafka <-> RabbitMQ without code changes.

### 6.3 GraphQL
Built-in support in Spring Boot 3.x. `@QueryMapping`, `@SchemaMapping` for resolvers. Supports batching via `@BatchMapping`.

### 6.4 Scheduling
`@Scheduled(cron = ...)` + ShedLock (`@SchedulerLock`) for distributed locking in multi-instance deployments. Spring Batch or Quartz for complex orchestration.

### 6.5 Event-Driven (Spring Modulith)
Inter-module communication via `ApplicationEventPublisher` + `@ApplicationModuleListener` (transactional, at-least-once). Events externalize to Kafka/RabbitMQ via `@EnableSpringCloudStreamEventExternalization` — no code changes in publisher.

---

## 7. DevOps & Deployment

### 7.1 Build Tools
- **Gradle Kotlin DSL**: 2-3x faster (incremental + caching). Recommended for multi-module / complex builds.
- **Maven**: ~52% market share (2025). Simpler, more predictable. Better for conventional single-module projects.

### 7.2 Docker
- **Buildpacks** (preferred): `./gradlew bootBuildImage` — no Dockerfile, OCI-compliant, auto-patched base images.
- **Layered Jars**: Optimize Docker layer caching when using custom Dockerfiles.

### 7.3 CI/CD (GitHub Actions)
Setup: `actions/setup-java@v4` with `distribution: temurin`, `java-version: 21`, `cache: gradle`. Build + test + `bootBuildImage` + push to GHCR.

### 7.4 GraalVM Native Images
Spring Boot 3+ first-class support via Spring AOT: `./gradlew nativeCompile`. Startup ~50-75ms, memory ~50-80MB. Trade-off: long builds, reflection limitations. Best for serverless / scale-to-zero.

### 7.5 Monitoring
Actuator endpoints: `health`, `metrics`, `prometheus`. Key alerts: `jvm.memory.used`, `http.server.requests` duration, `hikaricp.connections.active`, `jvm.gc.pause`.

---

## 8. Decision Trees

### 8.1 Spring MVC vs WebFlux vs Virtual Threads

```
I/O-bound app?
├── YES
│   ├── Need streaming / SSE / WebSocket with backpressure? → WebFlux
│   ├── Need >500K concurrent connections (gateway)? → WebFlux
│   └── Otherwise → Spring MVC + Virtual Threads (Java 21+)
└── NO (CPU-bound) → Spring MVC (traditional thread pool)
```

Default (2025+): **MVC + virtual threads** for new projects.

### 8.2 Gradle vs Maven

```
Greenfield project?
├── YES
│   ├── Multi-module / complex build logic → Gradle Kotlin DSL
│   ├── Simple single-module → Maven (simpler) or Gradle (faster)
│   └── Team has Gradle experience → Gradle
└── NO → Keep current unless build time is a measurable bottleneck
```

### 8.3 Monolith vs Microservices

```
Team size?
├── 1-3 devs / single team → Modular Monolith (Spring Modulith)
├── 4-10 devs, 2-3 teams
│   ├── Boundaries clear and stable? → Microservices (Spring Cloud)
│   └── Boundaries unclear → Spring Modulith; extract when stable
└── 10+ devs, many teams → Microservices + service discovery + config server
                            + circuit breakers + distributed tracing
```

**Key insight**: Start with modular monolith. Premature microservices are the #1 architectural mistake. Spring Modulith makes later extraction safe.

---

## 9. Code Examples

### 9.1 REST Controller with Validation (Java 21+)

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final OrderService orderService;
    public OrderController(OrderService orderService) { this.orderService = orderService; }

    @PostMapping
    ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest req) {
        var order = orderService.placeOrder(req.toCommand());
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.id()))
            .body(OrderResponse.from(order));
    }

    @GetMapping
    Page<OrderResponse> list(@RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "20") int size) {
        return orderService.findAll(PageRequest.of(page, size)).map(OrderResponse::from);
    }
}

// DTOs as records
public record CreateOrderRequest(@NotNull @Positive Long productId, @Min(1) int quantity) {
    public CreateOrderCommand toCommand() { return new CreateOrderCommand(productId, quantity); }
}
public record OrderResponse(Long id, String status, BigDecimal total, Instant createdAt) {
    public static OrderResponse from(Order o) {
        return new OrderResponse(o.id(), o.status().name(), o.total(), o.createdAt());
    }
}
```

### 9.2 Domain Entity with DDD Patterns

```java
@Entity @Table(name = "orders")
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderStatus status;
    @Embedded private Money total;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true) private List<OrderItem> items = new ArrayList<>();

    protected Order() {} // JPA
    public static Order create(CreateOrderCommand cmd) {
        var order = new Order();
        order.status = OrderStatus.PLACED;
        order.createdAt = Instant.now();
        order.items.addAll(cmd.items().stream().map(OrderItem::from).toList());
        order.total = order.items.stream().map(OrderItem::subtotal).reduce(Money.ZERO, Money::add);
        return order;
    }
    public void cancel() {
        if (status != OrderStatus.PLACED)
            throw new IllegalStateException("Cannot cancel order in status: " + status);
        this.status = OrderStatus.CANCELLED;
    }
    // Getters only — no setters
    public Long id() { return id; }
    public OrderStatus status() { return status; }
    public Money total() { return total; }
}
```

### 9.3 Type-Safe Configuration Properties

```java
@ConfigurationProperties(prefix = "app.order-service")
@Validated
public record OrderServiceProperties(
    @NotNull @DurationMin(seconds = 1) Duration paymentTimeout,
    @Min(1) @Max(10) int maxRetries,
    @NotBlank String notificationQueue
) {}
```

### 9.4 Global Error Handler (RFC 7807)

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail handleNotFound(OrderNotFoundException ex) {
        var pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Order Not Found");
        pd.setType(URI.create("https://api.example.com/errors/order-not-found"));
        pd.setProperty("orderId", ex.getOrderId());
        return pd;
    }
}
```

### 9.5 Structured Concurrency with Virtual Threads (Java 21+)

```java
@Service
public class OrderEnrichmentService {
    private final ProductClient productClient;
    private final CustomerClient customerClient;

    public EnrichedOrder enrich(Long orderId) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            var product  = scope.fork(() -> productClient.findById(orderId));
            var customer = scope.fork(() -> customerClient.findByOrderId(orderId));
            scope.join().throwIfFailed();
            return new EnrichedOrder(product.get(), customer.get());
        }
    }
}
```

---

*Researched: 2026-03-07 | Sources:*
- [Spring Boot Official Docs — Structuring Your Code](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html)
- [Spring Boot Anti-Patterns (DEV.to)](https://dev.to/haraf/spring-boot-anti-patterns-killing-your-app-performance-in-2025-with-real-fixes-explanations-2p05)
- [10 Anti-Patterns That Infect Your Architecture](https://medium.com/@praveengaddam319/the-toxic-side-of-spring-boot-10-anti-patterns-that-infect-your-architecture-a771697795ef)
- [Spring Boot Testcontainers Docs](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html)
- [Virtual Threads Performance Guide](https://java.elitedev.in/java/spring-boot-virtual-thread-pool-complete-performance-optimization-guide-for-java-21-263d0f04/)
- [WebFlux vs Virtual Threads Decision Matrix (2026)](https://simplifiedlearningblog.com/webflux-vs-virtual-threads-java/)
- [OAuth2 Resource Server — Spring Security Docs](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
- [GraalVM + Spring Boot Best Practices](https://www.javacodegeeks.com/2025/08/graalvm-and-spring-boot-best-practices-for-native-image-spring-apps.html)
- [ProblemDetail / RFC 7807 (Baeldung)](https://www.baeldung.com/spring-boot-return-errors-problemdetail)
- [OpenTelemetry with Spring Boot (Spring Blog)](https://spring.io/blog/2025/11/18/opentelemetry-with-spring-boot/)
- [Spring Modulith Event-Driven (Spring I/O 2025)](https://2025.springio.net/sessions/event-driven-architectures-with-spring-modulith-and-asyncapi/)
- [ArchUnit](https://www.archunit.org/)
- [Hexagonal Architecture, DDD, and Spring (Baeldung)](https://www.baeldung.com/hexagonal-architecture-ddd-spring)
- [Paketo Buildpacks for Spring Boot](https://github.com/paketo-buildpacks/spring-boot)
- [Maven vs Gradle 2025](https://quashbugs.com/blog/maven-vs-gradle-choosing-the-right-build-tool-for-api-heavy-backends-2025)
- [Spring Boot Observability (Voxxed Days 2026)](https://m.devoxx.com/events/vdcern26/talks/4059/spring-boot-observability-in-practice-actuator-micrometer-and-opentelemetry)
