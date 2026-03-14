# Modular Monolith — Architecture Expertise Module

> A modular monolith is a single deployable unit with strictly enforced module boundaries, combining the operational simplicity of a monolith with the structural independence of microservices. It is often the ideal architecture for teams of 10-100+ developers who need module ownership without the distributed systems overhead.

> **Category:** Pattern
> **Complexity:** Moderate
> **Applies when:** Teams of 10-100+ developers needing module autonomy without distributed systems complexity

---

## What This Is (and What It Isn't)

A modular monolith is a **single deployable executable** whose internal structure is divided into discrete, domain-aligned modules with **enforced boundaries** — enforced at compile time, via static analysis tooling, or via runtime verification, not merely by convention or team discipline.

The critical distinction from every adjacent concept:

| Architecture | Deployment units | Boundary enforcement | Network calls between components |
|---|---|---|---|
| Regular monolith | 1 | None (by convention at best) | No |
| Modular monolith | 1 | Yes — tooling or compiler | No |
| Distributed monolith | Many | None (implicit tight coupling) | Yes |
| Microservices | Many (1 per service) | Process boundary (natural) | Yes |

**What it is not:**

- A "well-organized monolith" with nicely named folders but nothing preventing `import orders.internal.OrderRepository` from `billing/` — that is just a regular monolith with aspirations.
- A microservices system in disguise. All modules run in the same process, communicate via in-process calls or in-process event buses, and share a single deployment lifecycle.
- A transitional state that must be "fixed" by moving to microservices. Many organizations deliberately stay here permanently.

**The canonical real-world example: Shopify.** As of 2024, Shopify operates one of the largest Ruby on Rails codebases on the planet — over 2.8 million lines of Ruby, 500,000+ commits, hundreds of active engineers — as a single deployable application. Modules are enforced via **Packwerk** (Shopify's open-source static analysis gem) and Rails Engines. Engineers can own a bounded context (Orders, Billing, Checkout, Inventory) without stepping on each other, deploy dozens of times per day, and avoid the overhead of a distributed system.

The insight behind Shopify's approach: their pre-modular monolith suffered not from being a monolith, but from lacking enforced boundaries. Any code could call anything. The solution was not to split the process — it was to enforce the module contracts while keeping deployment simple.

---

## When to Use It

### Team size: 10–100+ developers working on the same codebase

When a second or third team joins a codebase, informal boundaries collapse. The modular monolith creates formal contracts between teams without requiring separate infrastructure. Each team owns a module (or a cluster of modules), publishes a public API surface, and other teams cannot reach through the module boundary.

### You understand your domain reasonably well

Modules need stable-enough boundaries to be worth enforcing. If you are in week 2 of a startup and still discovering what your domain even is, enforcing premature module boundaries is counterproductive overhead. Once you have 6-12 months of production use and domain clarity, modularization pays off.

### Operational complexity of microservices is not worth the tradeoff

Every microservice you add introduces: a deployment pipeline, a container, a network call, a timeout, a retry budget, distributed tracing overhead, schema versioning across service boundaries, and on-call burden. For most product teams, this operational tax is not offset by the benefits until the team and scale are large enough to justify it. The modular monolith defers that cost indefinitely — or forever.

### You want the *benefits* of microservices without the *cost*

- Independent team ownership of code → yes, via module contracts
- Ability to migrate a module to a service later → yes, the interfaces are already defined
- Clean domain separation → yes, enforced not assumed
- Independent scaling of each module → no, this is the main thing you give up
- Independent deployment of each module → no, this is the other thing you give up

### Real examples with numbers

**Shopify:** 2,000+ engineers, single Rails application, 40+ production deployments per day, 30TB of data processed per minute at peak. Modules enforced via Packwerk. Rails Engines used as isolation mechanism. Publicly documented as intentional architectural choice.

**Stack Overflow:** Serves 6,000+ requests/second, 2 billion page views/month, 34 million daily searches, pages rendered in ~12ms average. Runs on 9 web servers and a single SQL Server — a monolith. By obsessing over performance, scalability came nearly free. Their team explicitly avoided "SOA tax."

**Industry trend (2024-2025):** A 2025 CNCF survey found approximately 42% of organizations that adopted microservices have consolidated at least some services back into larger deployable units, citing debugging complexity, operational overhead, and network latency. A 2025 Gartner study found 60% of teams report regret about microservices for small-to-medium applications. Amazon Prime Video's 2023 public post-mortem described saving ~90% infrastructure cost by consolidating a microservices pipeline back to a monolith.

---

## When NOT to Use It

This section is as important as the previous one.

### When a simple monolith suffices (fewer than ~10 developers, single team)

If everyone on the team knows the whole codebase, enforced module boundaries are pure overhead. You gain nothing from Packwerk or ArchUnit rules if the entire engineering team fits in a single standup. A clean, well-factored monolith without formal enforcement is the correct choice. Premature modularization adds complexity that slows you down and pays no dividend.

**The failure pattern:** A 4-developer startup spends 2 weeks setting up ArchUnit rules, per-module DbContexts, and a published-API layer between Orders and Billing that will never have more than one developer touching them. They have introduced microservices-level design ceremony with none of the benefits.

### When you need independent deployment of components

If regulatory requirements, customer SLAs, or team autonomy demand that the Payments module must be deployable independently — on its own schedule, with its own rollback — a modular monolith cannot deliver this. Every deployment releases the entire application. If a billing team needs to deploy hotfixes 10x per day while a core-product team deploys once per week, shared deployment is a real constraint.

### When genuinely different scaling requirements exist per module

A modular monolith scales horizontally as a unit. If your VideoTranscoding module needs 200 CPU cores while your UserAuth module needs 2, you cannot scale them independently. You either over-provision the entire application or extract the resource-intensive module. This is a legitimate reason to extract a module to a service even from a well-designed modular monolith.

### When polyglot technology requirements are non-negotiable

If your ML inference module must be Python/PyTorch, your real-time gaming module must be C++, and your web API must be Go, they cannot coexist in a single deployable unit. Language-level polyglot requirements are a hard constraint that microservices solve and modular monoliths do not.

### When the team is already distributed across independent services

If you already have 12 separate services maintained by 12 separate teams with mature CI/CD pipelines, proposing to re-consolidate into a modular monolith is likely not worth the migration cost. The modular monolith is most valuable as a deliberate starting point or a deliberate consolidation from an unnecessarily distributed system — not as a re-centralization for its own sake.

### When boundary enforcement overhead outweighs benefit

The discipline to maintain module boundaries is real. Public API surfaces must be designed and kept stable. Cross-cutting concerns (logging, auth, feature flags) require shared kernel modules. Onboarding engineers need to understand module ownership rules. When the codebase is genuinely small and simple, this ceremony costs more than it saves.

---

## How It Works

### Module anatomy

Each module has three zones:

```
src/modules/orders/
  api/           # Public contract — the only thing other modules may reference
    OrderService.java          # Public interface
    OrderCreatedEvent.java     # Published domain event
    dto/
      CreateOrderRequest.java
      OrderSummary.java
  internal/      # Private — invisible to other modules
    domain/
      Order.java
      OrderRepository.java     # Interface defined here
    application/
      CreateOrderUseCase.java
    infrastructure/
      JpaOrderRepository.java  # Implementation of domain interface
  events/        # Events this module publishes (consumed by other modules)
    OrderFulfilled.java
```

The rule: **nothing outside `api/` may be referenced from outside the module.** This is the contract. The enforcement mechanism (ArchUnit, Packwerk, Java module system, Python `__all__`, etc.) is what makes it real rather than aspirational.

### Inter-module communication options

**Option 1: In-process method calls via interfaces (synchronous)**

Module A calls Module B's public API interface directly. B's implementation is injected (dependency injection). This is the fastest option — no serialization, no network, just a function call. Appropriate when A genuinely needs a synchronous answer from B before continuing.

```java
// In orders module — depends only on the billing API interface
public class CreateOrderUseCase {
    private final BillingService billingService; // interface from billing/api/

    public Order createOrder(CreateOrderRequest req) {
        PaymentResult result = billingService.authorizePayment(req.paymentDetails());
        // ...
    }
}
```

**Option 2: In-process event bus (asynchronous, decoupled)**

Module A publishes a domain event. Module B subscribes. Neither knows about the other. This is the preferred integration style for reducing coupling — A does not need to know that B exists.

```java
// orders module publishes
eventBus.publish(new OrderCreatedEvent(orderId, customerId, total));

// notifications module subscribes — in the same process, no network
@EventHandler
public void on(OrderCreatedEvent event) {
    emailService.sendConfirmation(event.customerId());
}
```

Spring Modulith, Guava EventBus, MediatR (.NET), and NestJS EventEmitter all provide in-process event buses suitable for this pattern.

**Option 3: Async messaging (preparing for future service extraction)**

Some teams use an in-process message broker abstraction (backed by a real broker like Kafka or RabbitMQ even in the same process) to make a future service extraction easier. This is a deliberate choice to pay higher latency now in exchange for easier future decomposition. Only worth it if extraction is actually planned.

### Data ownership

Each module **owns its own tables**. No other module may query those tables directly.

Enforcement mechanisms:
- Database schemas per module (`orders.*`, `billing.*`, `inventory.*`) with database-level role permissions — the `orders` DB role cannot `SELECT` from `billing.*`.
- ORM DbContexts per module (Entity Framework, JPA) — each context maps only to its module's schema.
- Convention + static analysis — no cross-schema JOIN is allowed; violations flagged in CI.

The key rule: **no foreign key constraints between modules at the database level.** If Orders needs to know a Customer's email, it either calls the Customers module's API to fetch it at runtime, or it maintains a denormalized copy of the data it needs (an "anti-corruption layer" table). Cross-module transactions do not exist. Consistency between modules is eventual, achieved via events.

### Dependency rules

```
Module A's internal code
    may reference: A's own internal code + A's own api/ code
    may reference: B's api/ code (never B's internal/)
    may reference: shared kernel (logging, auth, utilities)
    may NOT reference: B's internal/ code
    may NOT reference: B's database tables directly
```

Cyclic dependencies between modules are prohibited. If Orders depends on Billing and Billing depends on Orders, something is wrong with the domain model. The fix is either: introduce a third module that both depend on, or make one dependency go via events rather than direct calls.

### Build enforcement

Enforcement mechanisms by language:

**Java:** ArchUnit (test-based) or Spring Modulith's `ApplicationModules.verify()`. Rules expressed as code, run in CI.

**Ruby (Shopify approach):** Packwerk — static analysis gem that detects constant references across package boundaries. Runs in CI. Packwerk distinguishes "dependency violations" (referencing a package you haven't declared a dependency on) from "privacy violations" (referencing a private constant from an external package).

**Python:** Package-level `__all__` declarations restricting exports + import-linter (third-party tool) that enforces contract rules across packages.

**TypeScript/NestJS:** Nx workspace boundary rules (enforced via ESLint plugin), or manual barrel exports with no internal re-exports. NestJS module system naturally encapsulates providers — only explicitly exported providers are accessible to importing modules.

**.NET:** Assembly-per-module (compile-time enforcement via project references) or NDepend rules. NetArchTest for test-based assertions.

**Go:** Go packages as natural unit of encapsulation. Unexported (lowercase) identifiers are package-private. Module boundary = explicit package API of exported identifiers only.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| Single deployment — one artifact, one rollback, one pipeline | All modules deploy together — one bad module can block all others |
| No network calls between modules — microsecond latency vs milliseconds | Independent scaling per module is not possible |
| Full ACID transactions within a module | Cross-module transactions require eventual consistency via events |
| Standard debugger, single log stream, simple distributed tracing | Shared process means a memory leak in one module affects all |
| Team ownership via module contracts | Boundary enforcement discipline must be maintained actively |
| Clean migration path to microservices (interfaces already exist) | Public API design for modules is harder than just importing internals |
| Monorepo collaboration — shared tooling, easy cross-module refactoring | Shared deployment pipeline can create team coordination overhead |
| Simpler local development (single `docker-compose up`) | Larger codebase to clone, index, and navigate than individual services |
| In-process events are synchronous-reliable (no broker failures) | In-process events can't be replayed or dead-lettered without extra infrastructure |
| Lower infrastructure cost than equivalent microservices | Module dependencies still need governance to avoid becoming a big ball of mud |
| Easier onboarding — one app to understand, run, and test | Shared database server is still a single point of failure / contention |

---

## Evolution Path

### Stage 1: Regular monolith (no enforced boundaries)

This is where most codebases start. Appropriate until the team or codebase grows enough that informal coordination breaks down.

**Signals to move to Stage 2:**
- Two or more teams work in the same codebase and step on each other
- A change in one area unexpectedly breaks another area
- Build and test times grow because everything is coupled
- Difficult to assign clear ownership to any area of code

### Stage 2: Identify module candidates

Before enforcing anything, map the domain. Use domain-driven design techniques:
- **By team:** Who owns what? Align module boundaries with team ownership.
- **By domain:** What are the bounded contexts? (Orders, Billing, Inventory, Notifications, Identity)
- **By data:** What data naturally clusters together? Which tables are joined most heavily?
- **By change rate:** What changes together should live together; what changes independently should be separated.

Produce a draft module map. Validate it: if a proposed module requires 40% of its lines to call into another proposed module, the boundary is wrong.

### Stage 3: Extract interfaces

Without changing the call graph, wrap the internal implementations behind interfaces that will become the public API. This is a refactoring pass — behavior does not change, but the "shape" of the module's public surface becomes explicit.

### Stage 4: Enforce dependencies

Install the enforcement tooling. Run it in audit mode first (report violations, don't fail the build). Address existing violations incrementally. Once the violation count reaches zero, switch to enforcement mode (fail CI on new violations).

### Stage 5: Enforce data ownership

Introduce per-module schemas or ORM contexts. Identify and eliminate cross-module database queries. For each cross-module JOIN, decide: does Module A call Module B's API, or does Module A maintain its own projection of the data it needs?

### Stage 6: Test module isolation

Write integration tests that instantiate a single module in isolation, with other modules replaced by test doubles. If you can't do this, you haven't achieved module independence.

### Stage 7 (optional): Extract a module to a service

If a specific module develops needs that a modular monolith can't satisfy (independent deployment, independent scaling, polyglot implementation), extract it using the strangler fig pattern:

1. Introduce a network-capable adapter behind the module's existing interface.
2. Deploy the module as a separate service.
3. Swap the in-process adapter for the network adapter — call sites do not change.
4. Remove the module code from the monolith.

The key advantage of starting as a modular monolith: the interfaces are already clean. The extraction is a mechanical wrapping operation, not a major refactor.

**Evolution signals that suggest selective extraction:**
- A specific module's build time dominates the overall build
- A specific module requires dramatically different scaling characteristics
- A specific module's release cadence is blocked by other modules
- A specific module team wants to use a different technology stack
- A specific module serves external consumers who need a stable versioned API

**Not a signal for extraction:** "Microservices are the industry standard." Architecture decisions must be driven by actual constraints, not trend-following.

---

## Failure Modes

### Failure Mode 1: Boundary violations via direct cross-module database queries

**What it looks like:** The Orders service needs customer name for an invoice, and an engineer writes `SELECT c.name FROM customers.users c JOIN orders.orders o ON o.customer_id = c.id`. Fast, easy, and immediately violates module data ownership.

**Why it compounds:** Once one cross-schema join exists, the next is trivially justified. Within months, the database is a shared global state connecting all modules, and refactoring any table requires touching all modules.

**Fix:** Schema-level permissions enforced at the database. The `orders` DB role literally cannot `SELECT` from `billing.*`. Violations become errors, not reviews.

### Failure Mode 2: "Module" that is just a folder with no enforcement

**What it looks like:** The team creates `src/orders/`, `src/billing/`, etc., with a README saying "please don't reach into other modules' internals." No tooling. Within one sprint, `billing/` is importing from `orders/internal/` because it was "faster."

**Why it happens:** Enforcement tooling is seen as overhead to defer. Convention without enforcement is not modularity.

**Fix:** Install enforcement tooling on day one of modularization. A boundary that cannot be mechanically detected is not a boundary.

### Failure Mode 3: Shared mutable state via global objects or static fields

**What it looks like:** A `GlobalConfig` singleton holds state that multiple modules read and write. A `RequestContext` thread-local is populated by the HTTP layer and read inside domain logic in three different modules.

**Why it matters:** Shared mutable state creates coupling that does not show up in dependency graphs and is invisible to Packwerk or ArchUnit. Module A's behavior depends on Module B having set the right value in the global.

**Fix:** Explicit data passing. Shared state must live in a "shared kernel" module that is read-only for all consumers, or must be passed explicitly as parameters.

### Failure Mode 4: The big module

**What it looks like:** `core/` or `platform/` contains 60% of the codebase. Every other module depends on it. It is "shared utilities," but it has grown to include domain logic, persistence, and cross-cutting concerns.

**Why it happens:** It starts as genuinely shared utilities. Over time, convenience wins: "this is almost domain logic, but let's put it in core because it's used by both Orders and Billing."

**Fix:** Shared kernel modules must be governed. Any domain logic in the shared kernel is a red flag. The shared kernel should contain: logging, auth primitives, event bus abstractions, common value objects. It should not contain: domain entities, business rules, or orchestration logic.

### Failure Mode 5: Coupling through synchronous call chains

**What it looks like:** ModuleA calls ModuleB calls ModuleC calls ModuleD — a synchronous chain 4 modules deep. Module A's latency now includes B's latency, C's latency, and D's latency. A failure anywhere in the chain propagates upward.

**Why it matters:** Even in-process, deep synchronous call chains create temporal coupling and make the system fragile.

**Fix:** Evaluate each inter-module call. If Module A does not need an immediate synchronous response from Module B, use an event. Reserve synchronous calls for queries that genuinely require a real-time answer.

### Failure Mode 6: Cyclic dependencies

**What it looks like:** Orders depends on Billing (to check payment status), Billing depends on Orders (to get order total). The dependency graph has a cycle.

**Why it matters:** Cyclic dependencies prevent independent testing of either module and are usually a sign of incorrect boundary placement.

**Fix:** One of the dependencies usually points in the wrong direction. Either: introduce a shared event that breaks the synchronous cycle, introduce a third module that holds the shared concept, or reconsider where the boundary is drawn.

### Failure Mode 7: Ignoring the strangler fig — big bang module extraction

**What it looks like:** After 2 years of a modular monolith, the team decides to extract 5 modules to microservices simultaneously in a 3-month "migration sprint."

**Why it fails:** Even with clean interfaces, simultaneous extraction of multiple modules changes deployment topology, data management, distributed consistency, and monitoring all at once.

**Fix:** Extract one module at a time. Validate each extraction in production before starting the next.

---

## Technology Landscape

### Java / Spring

**Spring Modulith** (GA since 2023) is the first-class framework for modular monoliths on the JVM. It builds on Spring Boot and uses ArchUnit under the hood for boundary verification.

Key capabilities:
- `ApplicationModules.of(Application.class).verify()` — detects boundary violations, cycles, and illegal internal access as a test
- `@ApplicationModule(allowedDependencies = {"billing", "identity"})` — explicit allowlist per module
- Integration test slices that bootstrap a single module with test doubles for others
- Event publication log for transactional outbox pattern (in-process events stored durably)
- Runtime verification mode (Spring Modulith 2.0+): `spring.modulith.runtime.verification-enabled=true`
- Generates documentation (C4 diagrams, module dependency graphs) from the structure

**ArchUnit** (standalone, framework-agnostic):
```java
@Test
void orders_module_should_not_access_billing_internals() {
    noClasses()
        .that().resideInAPackage("..orders..")
        .should().accessClassesThat()
        .resideInAPackage("..billing.internal..")
        .check(importedClasses);
}
```

### Ruby / Rails

**Packwerk** (Shopify, open source): Static analysis gem. Packages defined by `package.yml` files. Violation types: dependency (accessing a package not declared as dependency) and privacy (accessing a private constant). Designed with zero false positives — accepts some false negatives.

**Rails Engines**: Shopify's other mechanism — each domain becomes a Rails Engine (a mini Rails app), with its own routes, controllers, models, and migrations. Provides harder isolation than Packwerk alone.

**Babbel** documented using Packwerk to modularize their Rails monolith, citing significant reduction in unintended cross-domain coupling.

### .NET

**Assembly-per-module**: The strongest boundary — if module B's assembly is not referenced by module A's project file, it cannot be accessed. Compile-time enforcement.

**NetArchTest**: Test-based assertion library, similar to ArchUnit for Java.

**NDepend**: Commercial static analysis with architectural rule enforcement.

**ABP Framework**: Provides an official modular application framework for ASP.NET Core with per-module configurations, database contexts, and dependency injection isolation.

**Entity Framework Core with multiple DbContexts**: Each module registers its own `DbContext` scoped to its schema:
```csharp
// Orders module
modelBuilder.HasDefaultSchema("orders");

// Billing module
modelBuilder.HasDefaultSchema("billing");
```

Database-level enforcement: create a DB role per module with GRANT on its own schema only.

### TypeScript / NestJS

NestJS's native module system is designed for this:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [OrderService, OrderRepository],
  exports: [OrderService], // Only this is visible to other modules
})
export class OrdersModule {}
```

`exports` defines the public API. `providers` not in `exports` are private to the module.

**Nx** (monorepo tool): `@nx/enforce-module-boundaries` ESLint rule enforces which projects/libraries can import from which. Tags like `scope:orders` and `scope:billing` can be used to model module boundaries across the monorepo.

### Python

`__all__` in `__init__.py` restricts what is exported from a package. `import-linter` (third-party) defines contracts between packages and fails the build on violations.

### Go

Go's package visibility rules are language-level enforcement: unexported identifiers (lowercase) are package-private. Module boundary = the public exported API of a Go package. No additional tooling required for basic enforcement. For larger Go codebases, `golang.org/x/tools/go/analysis` framework enables custom static analysis rules.

### Monorepo tooling

**Nx**: Module boundary enforcement via ESLint, dependency graph visualization, affected test computation.

**Turborepo**: Build cache and task orchestration, not boundary enforcement — but works well alongside ArchUnit/Packwerk.

**Bazel**: Explicit `BUILD` files declare dependencies between packages. Any undeclared dependency fails the build. The strictest enforcement available.

---

## Decision Tree

```
How many developers share the codebase?
│
├── Fewer than ~10, single team
│   └── Regular monolith. No module enforcement needed.
│       Revisit when team grows or second team joins.
│
├── 10-50 developers, 2-5 teams, shared codebase
│   ├── Do you know your domain well enough to draw boundaries?
│   │   ├── Yes → Modular monolith. Start with Packwerk/ArchUnit.
│   │   └── No  → Regular monolith now, plan modularization at 6-12 months.
│   │
│   ├── Do any modules need independent deployment?
│   │   ├── No  → Modular monolith.
│   │   └── Yes → Modular monolith + extract only those modules to services.
│   │
│   └── Do any modules need dramatically different scaling?
│       ├── No  → Modular monolith.
│       └── Yes → Modular monolith + extract the resource-intensive module.
│
└── 50+ developers, multiple autonomous teams
    ├── Are teams blocked by each other's deployments?
    │   ├── No  → Modular monolith. Simpler than it looks at this scale
    │   │         (see: Shopify, 2000+ engineers).
    │   └── Yes → Modular monolith as foundation; selectively extract
    │             modules that block independent deployment.
    │
    └── Is there a strong polyglot technology requirement?
        ├── No  → Modular monolith.
        └── Yes → Selective microservices for the polyglot modules;
                  modular monolith for the rest.
```

**The default position:** Start with a modular monolith. Extract to microservices only when you have a specific, concrete constraint that the modular monolith cannot satisfy. "We might need to scale it someday" is not a constraint. "Module X's peak load is 10,000x higher than Module Y's, and we've measured this" is a constraint.

---

## Implementation Sketch

### Folder structure

```
src/
  modules/
    orders/
      api/
        OrderService.java          # Interface (public)
        CreateOrderRequest.java    # DTO (public)
        OrderSummary.java          # DTO (public)
        OrderCreatedEvent.java     # Domain event (public)
      internal/
        domain/
          Order.java               # Entity (private)
          OrderItem.java           # Value object (private)
          OrderRepository.java     # Repository interface (private)
        application/
          CreateOrderUseCase.java  # Use case (private)
          GetOrderUseCase.java
        infrastructure/
          JpaOrderRepository.java  # JPA implementation (private)
    billing/
      api/
        BillingService.java
        AuthorizePaymentRequest.java
        PaymentResult.java
      internal/
        ...
    inventory/
      api/
        InventoryService.java
        StockReservedEvent.java
      internal/
        ...
    shared-kernel/               # Read-only shared utilities
      events/
        DomainEventPublisher.java
      auth/
        CurrentUser.java
      money/
        Money.java
```

### Cross-module communication example

```java
// orders/api/OrderService.java — public interface
public interface OrderService {
    OrderSummary createOrder(CreateOrderRequest request);
    OrderSummary getOrder(OrderId orderId);
}

// orders/internal/application/CreateOrderUseCase.java — private impl
@Service
class CreateOrderUseCase {
    private final OrderRepository orderRepository;
    private final BillingService billingService;     // billing module's API
    private final DomainEventPublisher eventPublisher; // shared kernel

    OrderSummary execute(CreateOrderRequest req) {
        PaymentResult payment = billingService.authorizePayment(
            new AuthorizePaymentRequest(req.customerId(), req.total())
        );
        if (!payment.authorized()) {
            throw new PaymentDeclinedException(payment.reason());
        }
        Order order = Order.create(req.customerId(), req.items());
        orderRepository.save(order);
        eventPublisher.publish(new OrderCreatedEvent(order.id(), order.customerId()));
        return OrderSummary.from(order);
    }
}
```

### Database schema ownership

```sql
-- Each module owns its schema
CREATE SCHEMA orders;
CREATE SCHEMA billing;
CREATE SCHEMA inventory;

-- Module-specific DB roles (no cross-schema access)
CREATE ROLE orders_app;
GRANT USAGE ON SCHEMA orders TO orders_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orders TO orders_app;
-- orders_app has NO privileges on billing.* or inventory.*

-- Cross-module data: billing needs to store order_id as a reference,
-- but no FK constraint to orders.orders exists at the DB level.
-- Consistency is maintained via domain events, not FK cascades.
CREATE TABLE billing.payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,    -- logical reference, no FK constraint
    amount NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL
);
```

### ArchUnit boundary enforcement (Java)

```java
@AnalyzeClasses(packages = "com.example")
class ModuleBoundaryTest {

    @ArchTest
    static final ArchRule orders_internal_is_private =
        noClasses()
            .that().resideOutsideOfPackage("com.example.modules.orders..")
            .should().accessClassesThat()
            .resideInAPackage("com.example.modules.orders.internal..");

    @ArchTest
    static final ArchRule no_cyclic_dependencies =
        slices().matching("com.example.modules.(*)..").should().beFreeOfCycles();

    @ArchTest
    static final ArchRule modules_only_depend_on_api =
        classes()
            .that().resideInAPackage("com.example.modules.billing..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage(
                "com.example.modules.billing..",
                "com.example.modules.orders.api..",    // only the API
                "com.example.sharedkernel..",
                "java..",
                "javax..",
                "org.springframework.."
            );
}
```

### Spring Modulith equivalent

```java
// Single test verifies all module boundaries
@Test
void verifyModuleStructure() {
    ApplicationModules modules = ApplicationModules.of(Application.class);
    modules.verify(); // Throws if any boundary is violated
}

// Module-scoped integration test
@ApplicationModuleTest  // Only boots the orders module
class OrderServiceIntegrationTest {
    @MockBean BillingService billingService; // Other modules are mocked
    @Autowired OrderService orderService;

    @Test
    void createOrder_chargesPayment() {
        given(billingService.authorizePayment(any())).willReturn(PaymentResult.approved());
        OrderSummary result = orderService.createOrder(validRequest());
        assertThat(result.status()).isEqualTo(CONFIRMED);
    }
}
```

### Packwerk (Ruby) — package definition

```yaml
# src/modules/orders/package.yml
enforce_dependencies: true
enforce_privacy: true
public_path: app/public  # Only files here are accessible from outside
```

```ruby
# Violation detected by `bin/packwerk check`:
# orders/app/services/order_creator.rb:12:5
# Dependency violation: ::Billing::Internal::PaymentProcessor
# is private to 'billing' and cannot be referenced from 'orders'
```

### NestJS module boundary (TypeScript)

```typescript
// orders/orders.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    BillingModule,        // depends on billing's public exports
  ],
  providers: [
    CreateOrderUseCase,   // private
    GetOrderUseCase,      // private
    OrderRepository,      // private
    OrderServiceImpl,     // private implementation
  ],
  exports: [
    OrderServiceImpl,     // exposed as OrderService to other modules
  ],
})
export class OrdersModule {}

// billing/billing.module.ts — BillingService is exported, internals are not
@Module({
  providers: [BillingServiceImpl, PaymentGatewayAdapter],
  exports: [BillingServiceImpl],
})
export class BillingModule {}
```

---

## Cross-References

- **monolith:** The starting point. A modular monolith is a monolith with enforced structure. See `architecture/patterns/monolith.md`.
- **microservices:** The alternative for teams needing independent deployment or scaling per component. A modular monolith's clean interfaces make selective extraction to microservices tractable. See `architecture/patterns/microservices.md`.
- **domain-driven-design:** Module boundaries should align with DDD bounded contexts. Aggregates define transactional boundaries within a module. See `architecture/foundations/domain-driven-design.md`.
- **hexagonal-clean-architecture:** Each module can itself be internally structured as hexagonal/clean architecture (domain, application, infrastructure layers). The two patterns are orthogonal and complementary. See `architecture/patterns/hexagonal-clean-architecture.md`.
- **monolith-to-microservices:** The strangler fig extraction pattern is the recommended path when a modular monolith module needs to become an independent service. See `architecture/patterns/monolith-to-microservices.md`.
- **coupling-and-cohesion:** The theoretical foundation for why module boundaries matter. See `architecture/foundations/coupling-and-cohesion.md`.

---

*Researched: 2026-03-08 | Sources: [Shopify Engineering — Under Deconstruction](https://shopify.engineering/shopify-monolith) | [Shopify — Deconstructing the Monolith](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity) | [Shopify — Enforcing Modularity with Packwerk](https://shopify.engineering/enforcing-modularity-rails-apps-packwerk) | [Kamil Grzybek — Modular Monolith: A Primer](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer) | [Kamil Grzybek — Modular Monolith: Architecture Enforcement](https://www.kamilgrzybek.com/blog/posts/modular-monolith-architecture-enforcement) | [Kamil Grzybek — Modular Monolith: Integration Styles](https://www.kamilgrzybek.com/blog/posts/modular-monolith-integration-styles) | [Spring Modulith Reference Docs](https://docs.spring.io/spring-modulith/reference/fundamentals.html) | [Chris Richardson — Modular Monolith Patterns for Fast Flow](https://microservices.io/post/architecture/2024/09/09/modular-monolith-patterns-for-fast-flow.html) | [Milan Jovanovic — Modular Monolith Data Isolation](https://www.milanjovanovic.tech/blog/modular-monolith-data-isolation) | [ArXiv 2401.11867 — Modular Monolith: Is This the Trend?](https://arxiv.org/abs/2401.11867) | [MDPI — Modular Monolith in Cloud Environments: Systematic Literature Review](https://www.mdpi.com/1999-5903/17/11/496) | [Thoughtworks — When Modular Monolith is the Better Way](https://www.thoughtworks.com/en-us/insights/blog/microservices/modular-monolith-better-way-build-software) | [Stack Overflow Architecture — InfoQ](https://www.infoq.com/news/2015/06/scaling-stack-overflow/) | [GitHub — kgrzybek/modular-monolith-with-ddd](https://github.com/kgrzybek/modular-monolith-with-ddd) | [JetBrains — Migrating to Modular Monolith using Spring Modulith](https://blog.jetbrains.com/idea/2026/02/migrating-to-modular-monolith-using-spring-modulith-and-intellij-idea/) | [ABP.IO — Modular Monolith Architecture with .NET](https://abp.io/architecture/modular-monolith)*
