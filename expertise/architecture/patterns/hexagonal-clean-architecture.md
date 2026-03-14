# Hexagonal / Clean Architecture — Architecture Expertise Module

> Hexagonal Architecture (Ports & Adapters, Alistair Cockburn 2005) and Clean Architecture (Robert C. Martin 2012) are variations of the same idea: isolate business logic from infrastructure by inverting dependencies so the domain is the center that nothing depends on. This dramatically improves testability and allows swapping infrastructure without touching business rules.

> **Category:** Pattern
> **Complexity:** Complex
> **Applies when:** Long-lived systems with complex domain logic that needs to survive framework and infrastructure changes

---

## What This Is (and What It Isn't)

### The Three Sibling Patterns

**Hexagonal Architecture (Ports & Adapters)** — Alistair Cockburn coined this in 1994, published it in 2005. The "hexagon" shape has no significance beyond having enough sides to draw adapters around; Cockburn himself said a circle would have worked. The key idea: the application has a center (domain + use cases) surrounded by ports. A **port** is an interface — a declared contract for how the outside world interacts with the domain. An **adapter** is a concrete implementation of a port — a database repository, an HTTP controller, a CLI handler, a test double. Dependencies point inward. The core never imports the adapters.

**Clean Architecture** — Robert C. Martin (2012) drew concentric rings: Entities (innermost) → Use Cases → Interface Adapters → Frameworks & Drivers (outermost). The same dependency rule: source code dependencies point only inward. Clean Architecture added naming clarity: "entities" carry enterprise-wide business rules, "use cases" carry application-specific business rules. The outermost ring is where frameworks live and is explicitly treated as a detail.

**Onion Architecture** — Jeffrey Palermo (2008). Structurally similar. Emphasizes the Domain Model as the absolute center, with Domain Services wrapping it, then Application Services, then Infrastructure on the outside. Onion does not prescribe the Port/Adapter mechanism explicitly — it achieves inversion of control but leaves the "how" to the implementer, whereas Hexagonal names the boundary mechanism (ports) explicitly.

### What They Share

All three patterns implement the same core principle: **the Dependency Rule**. In every variation:

- The domain (business logic) has zero imports from infrastructure, frameworks, or delivery mechanisms.
- Infrastructure depends on the domain, not the other way around.
- The domain is testable in complete isolation — no database, no HTTP server, no framework.
- Frameworks, databases, and delivery mechanisms are treated as **interchangeable details**.

### What They Are Not

**Not a folder structure.** The most common beginner mistake is to organize folders as `domain/`, `application/`, `infrastructure/` and assume that constitutes clean architecture. Folder names mean nothing if a class in `domain/` still imports `sequelize` or Spring annotations. The architecture is defined by dependency direction, not directory names.

**Not a guarantee of clean code.** You can implement all the layers perfectly and still write an anemic domain, duplicated logic, and unmaintainable use cases. The pattern enforces structural constraints, not quality of thought.

**Not required for all projects.** This is a load-bearing architectural investment. It pays dividends over years, not sprints. Applied to the wrong problem it becomes pure overhead.

**Not the only way to achieve testability.** A well-factored layered architecture with careful import discipline can also be tested without infrastructure. The hexagonal approach formalizes this into an enforced constraint.

### Nomenclature Differences (Cheat Sheet)

| Concept | Hexagonal | Clean Architecture | Onion |
|---|---|---|---|
| Business objects | Domain Entities | Entities | Domain Model |
| Business operations | Domain Services | Use Cases | Domain Services |
| Boundary interfaces | Ports | Interface Adapters (partially) | Application Services interfaces |
| Concrete integrations | Adapters | Interface Adapters (concrete) | Infrastructure |
| Outermost ring | Adapters (driving + driven) | Frameworks & Drivers | Infrastructure |

The differences are mostly nomenclature and emphasis. In practice, teams mix terms freely. "Hexagonal" tends to be used when the focus is on testability and adapter swapping. "Clean Architecture" is used when the focus is on ring boundaries and use case visibility.

---

## When to Use It

### The Qualifying Conditions

Apply hexagonal/clean architecture when **two or more** of these are true:

**Long-lived application.** The payoff from establishing dependency inversion and adapter interfaces materializes over 2–5 years as the domain evolves. If the project horizon is under 18 months, the setup cost is hard to justify.

**Complex domain logic.** The domain has rules that change for business reasons independent from how data is stored or delivered. Loan eligibility calculations, insurance underwriting, healthcare treatment protocols, financial settlement rules — these change because regulations or business strategy change, not because the database schema changed. If your "business rules" always change when the DB schema changes, your "domain" is a data access layer wearing a costume.

**Independent testability is a hard requirement.** The team needs a test suite that runs in milliseconds without a database or external service. This is a prerequisite for fast CI, TDD, and confident refactoring. Hexagonal makes this structurally guaranteed rather than dependent on discipline.

**Infrastructure replacement is realistic.** You are migrating from one ORM to another. You need to support both PostgreSQL and an in-memory store for testing. You need to expose the same use cases via REST and gRPC. You plan to move from a monolith to microservices over time. Each of these migrations is substantially cheaper when adapters are the only thing that changes.

**Multiple delivery mechanisms.** A system that must serve HTTP REST, gRPC, and a scheduled job runner simultaneously benefits from a shared use case layer that all three delivery mechanisms call. Without hexagonal, the same business logic gets duplicated into each delivery path.

### Real-World Contexts Where This Pays Off

**Complex financial systems.** Payment processors like PayPal separate core transaction processing from banking APIs, fraud detection services, and user interfaces through adapters. This allows them to adapt to regulatory changes and new banking integrations without touching settlement logic. The driven ports (banking API, fraud service) can be replaced without touching the transaction domain.

**Healthcare applications.** Healthcare systems face strict regulatory requirements that are independent from whether records are stored in SQL Server or MongoDB, or whether the UI is a React SPA or a native mobile app. The domain rules (clinical decision logic, formulary checks, HIPAA-compliant access control) need to be testable in complete isolation from storage and delivery.

**E-commerce platforms.** Shopify's architecture decouples its core commerce logic from payment gateways (Stripe, PayPal, local gateways), shipping providers, and storefront delivery mechanisms. A merchant switching payment processors touches only the adapter, not the checkout domain.

**Systems requiring dual-protocol exposure.** A financial data service that must serve both REST and gRPC, or a notification system that must deliver via email, SMS, and push notification, can share a single application layer with adapters per protocol/channel.

**Platform migrations.** A system that started on a legacy ORM (Hibernate, ActiveRecord) and needs to migrate to a different persistence mechanism can do so adapter-by-adapter if repository interfaces were established from the start.

---

## When NOT to Use It

This section is as important as the previous one. Hexagonal architecture is frequently applied to systems that do not warrant it, producing unnecessary complexity, slower development, and justified resentment from teams who then dismiss the pattern entirely.

### The Disqualifying Conditions

**Simple CRUD applications.** If the application is fundamentally reading data, persisting data, and returning it — with little to no business logic in between — then hexagonal architecture adds indirection with no return. A `UserController` that calls a `UserService` that calls a `UserRepository` is three layers for a DB write. Adding ports and adapters turns this into five or six hops through no real logic. A startup configuring Clean Architecture for an internal admin dashboard spent three months establishing the layer structure and shipped features at a fraction of the expected velocity. The domain had no rules. There was nothing to protect.

**Fewer than 10 entities with thin business logic.** A blog engine with posts, tags, authors, and comments has almost no domain logic that is independent of how it is stored. The "business rules" are: a post belongs to one author, a post has tags. These are data constraints, not domain logic. Implementing hexagonal architecture here means writing a `PostRepository` port, a `PostRepositoryImpl`, a `PostService`, a `CreatePostUseCase`, a `CreatePostRequest` DTO, and a `CreatePostResponse` DTO — to do one INSERT. The indirection is not earned.

**The "no reason to change independently" test.** Ask: does the business logic change for reasons independent from infrastructure changes? If every time a new database column is added, a business rule changes, and every time a business rule changes, a column is added — the domain and the infrastructure are the same thing. You have a CRUD application with a rich domain costume. The architecture cannot decouple what is fundamentally coupled.

**Prototypes and MVPs.** The explicit purpose of a prototype is to test assumptions quickly before committing. Clean architecture slows the feedback loop. Establish the simplest possible structure, validate the idea, then introduce architecture when the system earns it.

**Short-lived scripts and tooling.** Data migration scripts, one-off reporting tools, CLI utilities with a 6-month lifespan: the overhead of port/adapter design produces no return.

**Admin panels and back-office tools.** These are typically thin wrappers around a database with authorization rules. The "business logic" is largely query filters and permission checks. The test burden is on integration and UI tests, not domain unit tests.

**ETL pipelines and data transformation jobs.** When the job *is* the data transformation, there is no domain separate from the transformation. The "business rule" is the shape of the transformation. Hexagonal architecture applied here produces ports for transformations that will never have a second adapter.

**Team size below 3 and horizon under 12 months.** The cognitive overhead of hexagonal architecture is real. A solo developer or a team of two building something with a defined end-date is paying the overhead with no team coordination or long-term maintenance benefit to show for it.

### The Incident Pattern

A recurring failure mode observed in engineering teams: a senior engineer who has seen hexagonal architecture succeed in a complex system applies it to the next project regardless of context. The next project is a SaaS admin portal with 8 entities and no business logic. Six weeks into development the team has a perfect adapter layer but is behind schedule, the junior engineers are confused by the indirection, and every feature requires creating 5–7 files. The architecture is technically correct and practically counterproductive.

The corrective heuristic: if you cannot name at least three business rules that (a) have genuine complexity, (b) are tested without a DB today or need to be, and (c) are independent of infrastructure concerns, do not use hexagonal architecture.

---

## How It Works

### Layer Definitions

**Domain Layer** — The innermost ring. Contains:
- **Entities**: Objects with identity and lifecycle. They encapsulate enterprise-wide business rules. A `LoanApplication` entity knows whether it is eligible for approval. A `BankAccount` entity enforces that its balance cannot go below zero in a given account type. An `Order` entity knows whether it can be cancelled given its current state.
- **Value Objects**: Immutable objects defined by their attributes, not identity. A `Money` value object prevents arithmetic errors between currencies. An `EmailAddress` value object validates format at construction. A `DateRange` value object enforces start-before-end invariants.
- **Domain Services**: Logic that does not naturally belong to a single entity — e.g., a `TransferService` that operates on two `BankAccount` entities.
- **Domain Events**: Signals emitted when something meaningful happens in the domain (`OrderPlaced`, `PaymentFailed`).
- **Repository Interfaces (Ports)**: The domain layer declares the interfaces it needs for persistence. It does not implement them. `OrderRepository` is an interface in the domain. The implementation lives in infrastructure.

The domain layer has **zero imports from infrastructure, frameworks, HTTP, databases, or ORMs**. No Spring annotations, no Sequelize models, no SQLAlchemy declarative base, no HTTP status codes.

**Application Layer** — Use cases / application services. Contains:
- **Use Cases (Application Services)**: One use case per meaningful operation. `PlaceOrderUseCase` takes an `PlaceOrderCommand`, loads domain objects via repository ports, calls domain logic, persists changes through the port, and emits domain events. It coordinates; it does not contain business rules.
- **Port Interfaces (driven ports)**: Interfaces for external services that the application layer needs — email sender, payment gateway, notification service. These are defined here, implemented in infrastructure.
- **DTOs / Command / Query Objects**: Data structures that cross the application boundary. Commands carry intent (`PlaceOrderCommand`). Queries carry retrieval intent. DTOs carry data outward. They are dumb data containers with no business logic.

The application layer imports the domain layer. It imports nothing from infrastructure or delivery.

**Infrastructure Layer** — Adapters implementing driven ports. Contains:
- **Repository Implementations**: `PostgresOrderRepository implements OrderRepository`. Translates domain objects to/from database rows using whatever ORM or query builder the team chooses.
- **External Service Adapters**: `StripePaymentGateway implements PaymentGateway`. `SendgridEmailSender implements EmailSender`. `TwilioSmsSender implements SmsSender`.
- **Message Bus Adapters**: `KafkaEventPublisher implements DomainEventPublisher`.
- **ORM configurations, migrations, connection pools**: All infrastructure concerns live here and only here.

**Presentation / Delivery Layer** — Adapters implementing driving ports (or driving the application layer directly). Contains:
- **HTTP Controllers**: Parse HTTP requests, call use cases, map responses. They know HTTP. They do not know business rules.
- **gRPC handlers, CLI handlers, GraphQL resolvers**: All translate their protocol into use case calls.
- **Scheduled job runners**: Trigger use cases on a time schedule.

### The Dependency Rule in Practice

```
Presentation ──► Application ──► Domain
Infrastructure ──► Application ──► Domain
                           (never the reverse)
```

If a domain entity needs to send an email, it does not import an email library. It raises a domain event or calls an interface defined in the domain/application layer. The infrastructure adapter resolves the interface at runtime through dependency injection.

### Ports: Driven vs Driving

**Driven ports (right-hand side / secondary adapters):** Interfaces the application drives — databases, email services, payment gateways, external APIs, message queues. The application defines these interfaces based on what it needs. The infrastructure implements them.

```typescript
// Defined in application layer — this is a driven port
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// Defined in application layer — driven port for external service
interface PaymentGateway {
  charge(amount: Money, source: PaymentSource): Promise<PaymentResult>;
}
```

**Driving ports (left-hand side / primary adapters):** Interfaces through which the outside world drives the application. In practice, these are often just the use case interfaces themselves. HTTP controllers call use cases directly through their interfaces.

```typescript
// Defined in application layer — this is a driving port
interface PlaceOrderUseCase {
  execute(command: PlaceOrderCommand): Promise<PlaceOrderResult>;
}
```

### How a Use Case Executes

```typescript
// application/use-cases/place-order.ts
class PlaceOrderUseCaseImpl implements PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,   // driven port
    private readonly paymentGateway: PaymentGateway,     // driven port
    private readonly eventPublisher: DomainEventPublisher // driven port
  ) {}

  async execute(command: PlaceOrderCommand): Promise<PlaceOrderResult> {
    // Load domain objects through the port (never the concrete implementation)
    const customer = await this.customerRepository.findById(command.customerId);
    const items = command.items.map(i => OrderItem.create(i.productId, i.quantity, i.price));

    // Domain logic: the Order entity enforces its own rules
    const order = Order.place(customer, items);  // throws if customer ineligible

    // Driven port: persist through the interface
    await this.orderRepository.save(order);

    // Driven port: charge through the interface
    const paymentResult = await this.paymentGateway.charge(
      order.totalAmount,
      command.paymentSource
    );

    if (!paymentResult.succeeded) {
      order.markPaymentFailed(paymentResult.failureReason);
      await this.orderRepository.save(order);
      return PlaceOrderResult.failure(paymentResult.failureReason);
    }

    order.confirm();
    await this.orderRepository.save(order);

    // Domain event: raised by the entity, published by the application layer
    for (const event of order.domainEvents) {
      await this.eventPublisher.publish(event);
    }

    return PlaceOrderResult.success(order.id);
  }
}
```

The use case has no knowledge of PostgreSQL, Stripe, Kafka, or HTTP. It calls interfaces. A test can inject in-memory implementations of all three ports and test the full use case logic in microseconds.

### How Testing Works

**Domain tests — zero mocks, pure logic:**

```typescript
// test/domain/order.test.ts
describe('Order', () => {
  it('cannot place an order for an inactive customer', () => {
    const inactiveCustomer = Customer.createInactive('c-1');
    const items = [OrderItem.create('p-1', 1, Money.of(100, 'USD'))];
    expect(() => Order.place(inactiveCustomer, items)).toThrow(CustomerInactiveError);
  });
});
```

No database. No HTTP. No mocks. Pure TypeScript classes. Runs in < 1ms.

**Application layer tests — mock adapters (test doubles):**

```typescript
// test/application/place-order.test.ts
describe('PlaceOrderUseCase', () => {
  it('marks order as failed if payment is declined', async () => {
    const orderRepo = new InMemoryOrderRepository();
    const paymentGateway = new AlwaysDeclinedPaymentGateway();
    const eventPublisher = new RecordingEventPublisher();

    const useCase = new PlaceOrderUseCaseImpl(orderRepo, paymentGateway, eventPublisher);
    const result = await useCase.execute(validCommand);

    expect(result.succeeded).toBe(false);
    const savedOrder = await orderRepo.findById(result.orderId);
    expect(savedOrder.status).toBe(OrderStatus.PaymentFailed);
  });
});
```

The `InMemoryOrderRepository`, `AlwaysDeclinedPaymentGateway`, and `RecordingEventPublisher` are not mocks from a mocking framework — they are full implementations of the port interfaces, backed by in-memory data structures. They are fast, deterministic, and reusable across many tests.

**Infrastructure tests — integration tests, testing the adapter alone:**

```typescript
// test/infrastructure/postgres-order-repository.test.ts
// This test requires a real (or Dockerized) Postgres instance
describe('PostgresOrderRepository', () => {
  it('persists and retrieves an order', async () => {
    const repo = new PostgresOrderRepository(testConnection);
    const order = Order.place(activeCustomer, validItems);
    await repo.save(order);
    const retrieved = await repo.findById(order.id);
    expect(retrieved).toEqual(order);
  });
});
```

This test is slow, requires infrastructure, and is run in CI — not in the local fast suite. It tests that the adapter correctly implements the port contract.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---|---|
| Domain unit tests with zero infrastructure (milliseconds) | 3–5x more files for equivalent functionality |
| Infrastructure is swappable without touching business logic | Every new feature requires changes in 3–4 layers |
| Framework independence — the domain is a plain library | Dependency injection wiring complexity |
| Business rules are readable in isolation (use cases as documentation) | Significant cognitive overhead for new team members |
| Parallel development (domain team and infrastructure team can work independently) | DTO mapping boilerplate at every layer boundary |
| Slow tests become fast tests (domain tests don't hit DB) | Risk of anemic domain (logic drifts into use cases) |
| Framework upgrades are contained to the outermost ring | Port/interface design requires upfront thought — wrong ports are expensive to change |
| Multiple delivery mechanisms (REST + gRPC + CLI) share the same use cases | Over-engineering risk: teams apply it to CRUD apps and pay the cost without the benefit |
| System is auditable: use cases are explicit named operations | Initial delivery velocity is lower than a simple layered approach |

---

## Evolution Path

### Do Not Start With Hexagonal

The most reliable path to hexagonal architecture is to **earn it** through felt pain in a simpler architecture. Starting with hexagonal on a new project means paying the setup cost before you understand the problem domain — and the ports you define before you understand the domain are likely to be wrong.

### Stage 1: Simple Layered Architecture

Start with three layers: Controllers → Services → Repositories. No interfaces, no ports, no adapters. Just classes calling classes.

```
src/
  controllers/
    order.controller.ts
  services/
    order.service.ts
  repositories/
    order.repository.ts     ← imports Sequelize/TypeORM directly
```

This is fast to build. It works for most projects at the start.

### Stage 2: Pain Points Emerge

After 6–12 months on a complex domain, the team starts feeling:
- "I can't unit test `order.service.ts` without a real database."
- "The service now imports `stripe` directly — how do I test payment failure without hitting Stripe?"
- "We need to switch from REST-only to also support gRPC — the business logic is buried in HTTP request handlers."
- "The domain rules are scattered across services, controllers, and utility functions."

These are the signals. The pain is diagnostic.

### Stage 3: Extract the Domain

Identify domain logic and move it into domain classes with no infrastructure imports:

```
src/
  domain/
    order.entity.ts          ← business rules live here now
    order-item.value-object.ts
    customer.entity.ts
  services/
    order.service.ts         ← orchestrates, calls domain methods
  repositories/
    order.repository.ts      ← still concrete
```

Tests can now cover domain logic without a database.

### Stage 4: Define Repository Interfaces (Invert the Dependency)

```
src/
  domain/
    order.entity.ts
    order.repository.ts      ← interface, defined here
  services/
    order.service.ts         ← now depends on the interface
  repositories/
    postgres-order.repository.ts  ← implements the interface
```

Now `order.service.ts` can be tested with an in-memory implementation of `OrderRepository`.

### Stage 5: Full Hexagonal

Separate driven ports for all external services, formalize use cases, establish the application layer:

```
src/
  domain/
    orders/
      order.entity.ts
      order-item.value-object.ts
      order.repository.ts          ← port
      payment-gateway.port.ts      ← port
  application/
    use-cases/
      place-order.usecase.ts
      cancel-order.usecase.ts
  infrastructure/
    persistence/
      postgres-order.repository.ts ← adapter
    payment/
      stripe-payment-gateway.ts    ← adapter
  presentation/
    http/
      order.controller.ts          ← adapter
    grpc/
      order.grpc-handler.ts        ← adapter
```

### Migration Checklist

1. Identify domain logic (look for business rule conditionals in services and repositories).
2. Move domain logic into entity/value object classes with no infrastructure imports.
3. Identify all external dependencies (DB, email, payment, third-party APIs).
4. Define an interface (port) for each external dependency in the domain or application layer.
5. Move concrete implementations behind those interfaces (create adapters).
6. Update dependency injection to wire adapters to ports.
7. Write domain unit tests — they should now run without infrastructure.
8. Write application layer tests with in-memory port implementations.
9. Move infrastructure tests to a separate, slower test suite.

---

## Failure Modes

### FM-01: Anemic Domain Model

**What it looks like:** Domain entities are bags of getters and setters. All logic lives in use cases and application services.

```typescript
// Anemic — no business logic
class Order {
  id: string;
  status: string;
  items: OrderItem[];
  total: number;
  // No methods. No invariants. No rules.
}

// All logic dumped into the use case
class PlaceOrderUseCase {
  execute(command) {
    // Checking eligibility rules that belong to Order, Customer
    if (command.customerStatus !== 'active') throw new Error();
    if (command.items.length === 0) throw new Error();
    // 80 lines of logic that should be on the entity
  }
}
```

**Why it happens:** Developers are used to ORM-style entities that map directly to tables. Business logic in entities feels "wrong" when entities also need to be serialized to JSON. The hexagonal layer structure is implemented, but the domain stays data-centric.

**Why it matters:** An anemic domain model removes the primary reason to use hexagonal architecture. The domain tests become trivial (no behavior to test). The use cases become bloated services. The architecture has the cost of hexagonal with none of the testability benefit.

**The fix:** Domain entities protect their invariants. An `Order` should know whether it can be placed, cancelled, shipped. An entity that can be in an invalid state by constructing it and calling setters directly is not a domain entity.

### FM-02: Interface Explosion

**What it looks like:** Every class has a matching interface, regardless of whether it will ever have a second implementation.

```typescript
interface IOrderService { placeOrder(...): Promise<...>; }
class OrderServiceImpl implements IOrderService { ... }

interface IEmailService { send(...): Promise<...>; }
class EmailServiceImpl implements IEmailService { ... }

// OrderService has one implementation and will never have another.
// The interface adds no value, only indirection.
```

**Why it happens:** Developers apply "every class needs an interface" as a blanket rule derived from misread Clean Architecture guidance.

**Why it matters:** Java/C# interfaces and TypeScript interfaces are not free — they add cognitive overhead, navigation indirection, and maintenance cost (renaming means updating two files). Interfaces earn their place when they enable polymorphism: multiple implementations, test doubles, or dependency inversion across a meaningful boundary.

**The rule:** Interfaces belong at architectural boundaries (the ports in hexagonal architecture). The `OrderRepository` interface is a port — it will have a `PostgresOrderRepository` and an `InMemoryOrderRepository` (for tests). The `PlaceOrderUseCase` interface exists because it enables the HTTP controller to depend on the abstraction, not the implementation, and because it can be replaced with a test double.

### FM-03: Use Case Per HTTP Endpoint

**What it looks like:** One use case class per REST endpoint, including trivial GET operations.

```
use-cases/
  get-order-by-id.usecase.ts         ← just delegates to repo.findById
  get-all-orders.usecase.ts          ← just delegates to repo.findAll
  get-orders-by-customer.usecase.ts  ← just delegates to repo.findByCustomerId
```

**Why it happens:** Teams apply the "one use case per operation" rule without distinguishing read operations (queries) that contain no business logic from command operations that do.

**Why it matters:** Trivial use cases that add no logic and no protection of invariants are indirection overhead. The HTTP controller calls the use case, which calls the repository, which executes the query. Three hops for no business value.

**The fix:** Apply CQRS thinking: commands (state-changing operations with business rules) benefit from use case encapsulation. Queries can often go directly from a query handler/controller to a read model or query repository without a use case intermediary.

### FM-04: DTO Hell

**What it looks like:** Objects are mapped between different representations at every layer crossing with no meaningful transformation happening.

```
HTTP Request JSON
  → RequestDTO (parsed by controller)
  → CommandDTO (passed to use case)
  → DomainEntity (created by use case)
  → PersistenceModel (mapped by repository)
  → DatabaseRow (stored)
  → PersistenceModel (retrieved)
  → DomainEntity (reconstructed)
  → ResponseDTO (created by use case)
  → HTTP Response JSON (serialized by controller)
```

If the `RequestDTO`, `CommandDTO`, and `ResponseDTO` all have the same fields and no transformation logic, this is not architecture — it is boilerplate accumulation.

**The fix:** DTOs earn their place at real semantic boundaries: the HTTP boundary (request/response shapes change independently from domain), the persistence boundary (ORM models and domain entities have different lifecycle concerns). If the fields and shapes are identical across all representations, consolidate.

### FM-05: Infrastructure Leaking Into the Domain

**What it looks like:** ORM annotations, framework decorators, or database column names appear in domain entities.

```typescript
// Domain entity polluted with JPA/TypeORM annotations
@Entity('orders')
@Table({ name: 'orders' })
class Order {
  @PrimaryGeneratedColumn('uuid')
  @Column({ name: 'order_id' })
  id: string;

  @Column({ name: 'status_code', type: 'varchar' })
  status: OrderStatus;
```

**Why it happens:** ORMs make it convenient to annotate domain entities directly. The first implementation of hexagonal architecture often uses this approach because it reduces the number of files. It works, until the ORM changes.

**Why it matters:** The domain entity now has a compile-time dependency on the ORM framework. The domain cannot be tested without the ORM being present on the classpath. The annotation-free domain entity has become annotation-full, violating the Dependency Rule.

**The fix:** Maintain a separate `OrderPersistenceModel` (or ORM entity) in the infrastructure layer. The `PostgresOrderRepository` maps between the domain `Order` and the `OrderPersistenceModel`. This doubles the persistence code but keeps the domain clean.

### FM-06: Circular Dependency Through Shared DTOs

**What it looks like:** The infrastructure layer imports from the presentation layer, or the domain imports from the application layer, because shared DTO types are defined in the wrong place.

**Why it happens:** Teams put command/response DTOs in a `shared/` folder that all layers import from, creating a dependency mesh.

**The fix:** DTOs travel inward with the request. Commands are defined in the application layer. Responses are defined in the application layer. Presentation maps from HTTP-specific structures to commands. Infrastructure maps from domain to persistence models.

---

## Technology Landscape

### Node.js / TypeScript

No standard framework enforces hexagonal architecture. Teams construct it manually or use a dependency injection container.

- **DI Containers:** `tsyringe` (Microsoft), `inversify`, `awilix` — all support constructor injection for wiring adapters to ports at application startup.
- **NestJS:** Has a module system that can be used for hexagonal organization, but its decorators encourage infrastructure concerns in domain classes. Use carefully.
- **No-framework approach:** Explicit wiring in a `composition-root.ts` or `main.ts` is the cleanest approach and the most explicit.
- **ArchUnit equivalent:** `dependency-cruiser` can enforce import rules via configuration (no imports from `domain/` to `infrastructure/`).

### Java / Spring Boot

Spring Boot is well-suited for hexagonal architecture. Constructor injection is idiomatic. Spring does not force framework annotations into domain classes when used carefully.

- **Spring Dependency Injection:** Works naturally with port interfaces — Spring resolves the correct adapter at startup.
- **Spring Data:** Repository interfaces align naturally with hexagonal ports. The implementation can be the Spring Data adapter.
- **ArchUnit:** The Java library for enforcing architecture rules in tests. Can assert that `domain` packages have no dependencies on `infrastructure` packages. Should be standard in any hexagonal Java project.
- **Caution:** JPA/Hibernate annotations on domain entities are a common leakage point. Prefer separate persistence models.

### .NET

.NET has excellent built-in DI and multiple Clean Architecture templates:

- **Jason Taylor's Clean Architecture template** (GitHub: `jasontaylordev/CleanArchitecture`): Widely used .NET Clean Architecture scaffold with Application, Domain, Infrastructure, and WebUI projects.
- **Ardalis Clean Architecture** (GitHub: `ardalis/CleanArchitecture`): Steve Smith's variation, well-documented.
- **NetArchTest:** .NET equivalent of ArchUnit for enforcing dependency rules in tests.
- **MediatR:** Often used to implement the use case / CQRS pattern in .NET clean architecture. Commands and queries dispatched through a mediator.

### Python

No standard framework. Manual layering is common with FastAPI or Django:

- **FastAPI:** Dependency injection support makes constructor injection feasible. Routers as driving adapters, repository classes as driven adapters.
- **Django:** Its ORM is strongly coupled to models — keeping domain entities separate from Django models requires discipline and separate classes.
- **inject / dependency-injector:** Python DI containers for wiring adapters.

### Go

Go's package system and interface design naturally support hexagonal architecture:

- Go interfaces are implicit (structural typing) — any struct implementing the interface satisfies it without declaration.
- Repository interfaces are defined in the domain package. Implementations are in an `infrastructure/postgres/` or `infrastructure/memory/` package.
- No annotations exist, so infrastructure concerns cannot accidentally annotate domain structs.
- Go's explicit wiring in `main.go` forces a visible composition root.

### Enforcement Tooling

| Tool | Language | Purpose |
|---|---|---|
| ArchUnit | Java | Enforce import rules in JUnit tests |
| NetArchTest | .NET (C#) | Enforce import rules in xUnit/NUnit tests |
| dependency-cruiser | JS/TS | Static analysis of import graph, configurable rules |
| Import-linter | Python | Enforce import contracts in Python packages |
| go-arch-lint | Go | Enforce package dependency rules |

Enforcement tooling transforms the Dependency Rule from a convention into a compile-time (or test-time) constraint. Any team serious about hexagonal architecture should add this to CI.

---

## Decision Tree

Work through these in order. Stop at the first disqualifying condition.

```
1. Project life expectancy < 18 months?
   YES → Use simple layered architecture. Skip hexagonal.
   NO  → Continue.

2. Fewer than 10 entities and no genuine business rules
   (just CRUD + validation)?
   YES → Use simple layered architecture. Skip hexagonal.
   NO  → Continue.

3. Is this a prototype, MVP, or short-lived admin tool?
   YES → Skip hexagonal. Build the simplest thing that works.
   NO  → Continue.

4. Can you name 3+ business rules that change independently
   from infrastructure/schema changes?
   NO  → Your domain is likely CRUD. Skip hexagonal.
   YES → Continue.

5. Team < 3 developers AND < 12 month delivery horizon?
   YES → Hexagonal overhead is not worth it. Use layered.
   NO  → Continue.

6. Do you need to test domain logic without spinning up a DB
   or external services?
   NO  → Layered architecture with careful import discipline
         may suffice.
   YES → Strong signal for hexagonal.

7. Is infrastructure replacement realistic in the project
   lifetime (ORM migration, DB swap, new delivery mechanism)?
   YES → Hexagonal pays off clearly.
   NO  → Weigh testability benefit alone.

8. Does the domain have complex logic tested in complete
   isolation, AND the system is expected to live 3+ years?
   YES → Use hexagonal architecture. The investment is justified.
```

---

## Implementation Sketch

### Recommended Folder Structure

```
src/
  domain/
    orders/
      order.entity.ts               ← pure business logic, no imports
      order-item.value-object.ts
      order-status.ts               ← enum / value object
      money.value-object.ts
      order.repository.ts           ← port interface (driven)
      payment-gateway.port.ts       ← port interface (driven)
      order-placed.event.ts         ← domain event
    customers/
      customer.entity.ts
      customer.repository.ts        ← port interface (driven)
  application/
    use-cases/
      place-order/
        place-order.usecase.ts      ← interface (driving port)
        place-order.command.ts      ← input DTO
        place-order.result.ts       ← output DTO
        place-order.impl.ts         ← implementation
      cancel-order/
        ...
    ports/
      event-publisher.port.ts       ← port interface (driven)
      notification-service.port.ts  ← port interface (driven)
  infrastructure/
    persistence/
      postgres/
        order.persistence-model.ts  ← ORM entity (separate from domain)
        postgres-order.repository.ts
      memory/
        in-memory-order.repository.ts ← test double / dev adapter
    payment/
      stripe/
        stripe-payment-gateway.ts
    notification/
      sendgrid/
        sendgrid-notification-service.ts
  presentation/
    http/
      orders/
        order.controller.ts         ← driving adapter
        order.request.dto.ts
        order.response.dto.ts
    grpc/
      orders/
        order.grpc-handler.ts       ← driving adapter
    scheduled/
      order-expiry.job.ts           ← driving adapter
  composition-root.ts               ← wires adapters to ports
  main.ts
```

### Domain Entity Example

```typescript
// src/domain/orders/order.entity.ts
// Zero imports from infrastructure, frameworks, or ORMs

import { OrderItem } from './order-item.value-object';
import { OrderStatus } from './order-status';
import { Money } from './money.value-object';
import { OrderPlacedEvent } from './order-placed.event';
import { Customer } from '../customers/customer.entity';

export class Order {
  private _domainEvents: unknown[] = [];

  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly totalAmount: Money,
    private _status: OrderStatus,
    public readonly placedAt: Date
  ) {}

  static place(customer: Customer, items: OrderItem[]): Order {
    if (!customer.isActive()) {
      throw new Error('Cannot place order for inactive customer');
    }
    if (items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const total = items.reduce(
      (sum, item) => sum.add(item.lineTotal),
      Money.zero('USD')
    );

    const order = new Order(
      generateId(),
      customer.id,
      items,
      total,
      OrderStatus.Pending,
      new Date()
    );

    order._domainEvents.push(new OrderPlacedEvent(order.id, customer.id, total));
    return order;
  }

  cancel(): void {
    if (this._status === OrderStatus.Shipped) {
      throw new Error('Cannot cancel a shipped order');
    }
    if (this._status === OrderStatus.Cancelled) {
      throw new Error('Order is already cancelled');
    }
    this._status = OrderStatus.Cancelled;
  }

  confirm(): void {
    if (this._status !== OrderStatus.Pending) {
      throw new Error('Only pending orders can be confirmed');
    }
    this._status = OrderStatus.Confirmed;
  }

  get status(): OrderStatus { return this._status; }
  get domainEvents(): unknown[] { return [...this._domainEvents]; }
  clearDomainEvents(): void { this._domainEvents = []; }
}
```

### Port Interface Example

```typescript
// src/domain/orders/order.repository.ts
// This is the driven port — defined in domain, implemented in infrastructure

import { Order } from './order.entity';
import { OrderId } from './order-status';

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### Infrastructure Adapter Example

```typescript
// src/infrastructure/persistence/postgres/postgres-order.repository.ts
// This adapter implements the port — only this file knows about TypeORM

import { Repository } from 'typeorm';
import { OrderRepository } from '../../../domain/orders/order.repository';
import { Order } from '../../../domain/orders/order.entity';
import { OrderPersistenceModel } from './order.persistence-model';
import { OrderMapper } from './order.mapper';

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly repo: Repository<OrderPersistenceModel>) {}

  async findById(id: string): Promise<Order | null> {
    const model = await this.repo.findOne({ where: { id } });
    return model ? OrderMapper.toDomain(model) : null;
  }

  async save(order: Order): Promise<void> {
    const model = OrderMapper.toPersistence(order);
    await this.repo.save(model);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const models = await this.repo.find({ where: { customerId } });
    return models.map(OrderMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
```

### Composition Root

```typescript
// src/composition-root.ts
// This is the only place that knows about all adapters

import { DataSource } from 'typeorm';
import { PostgresOrderRepository } from './infrastructure/persistence/postgres/postgres-order.repository';
import { StripePaymentGateway } from './infrastructure/payment/stripe/stripe-payment-gateway';
import { KafkaEventPublisher } from './infrastructure/messaging/kafka/kafka-event-publisher';
import { PlaceOrderUseCaseImpl } from './application/use-cases/place-order/place-order.impl';

export function buildContainer(dataSource: DataSource) {
  // Wire adapters to ports
  const orderRepository = new PostgresOrderRepository(
    dataSource.getRepository(OrderPersistenceModel)
  );
  const paymentGateway = new StripePaymentGateway(process.env.STRIPE_KEY!);
  const eventPublisher = new KafkaEventPublisher(process.env.KAFKA_BROKERS!);

  // Wire use cases to their dependencies (all interfaces)
  const placeOrderUseCase = new PlaceOrderUseCaseImpl(
    orderRepository,
    paymentGateway,
    eventPublisher
  );

  return { placeOrderUseCase };
}
```

---

## Cross-References

- **layered-architecture** — The architecture most teams start from before earning hexagonal. Understanding its pain points (DB-coupled unit tests, framework lock-in) motivates the transition.
- **domain-driven-design** — DDD provides the vocabulary and modeling techniques for the domain layer: entities, value objects, aggregates, domain events, bounded contexts. Hexagonal architecture and DDD complement each other naturally.
- **separation-of-concerns** — The foundational principle underlying the Dependency Rule. Each ring has a single concern; no ring knows the internal concerns of another.
- **coupling-and-cohesion** — Ports and adapters are the mechanism for achieving low coupling between domain and infrastructure while maintaining high cohesion within each layer.
- **design-principles-solid** — The Dependency Inversion Principle (D in SOLID) is the direct technical mechanism of hexagonal architecture: high-level modules (domain) do not depend on low-level modules (infrastructure); both depend on abstractions (ports).
- **modular-monolith** — Hexagonal architecture is frequently used as the internal structure of modules within a modular monolith. Each module has its own hexagonal structure; inter-module communication is through defined interfaces.

---

*Researched: 2026-03-08 | Sources: [Alistair Cockburn, "Hexagonal Architecture" (alistair.cockburn.us)](https://alistair.cockburn.us/hexagonal-architecture) · [AWS Prescriptive Guidance — Hexagonal Architecture Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html) · [Three Dots Labs — Is Clean Architecture Overengineering?](https://threedots.tech/episode/is-clean-architecture-overengineering/) · [DEV Community — Stop Overengineering in the Name of Clean Architecture](https://dev.to/criscmd/stop-overengineering-in-the-name-of-clean-architecture-b8h) · [devblog.tech — The Clean Architecture Trap](https://devblog.tech/the-clean-architecture-trap-why-simplicity-beats-overengineering-in-net/) · [DEV Community — Why I Can't Recommend Clean Architecture by Robert C. Martin](https://dev.to/bosepchuk/why-i-cant-recommend-clean-architecture-by-robert-c-martin-ofd) · [HappyCoders.eu — Hexagonal Architecture: What Is It? Why Use It?](https://www.happycoders.eu/software-craftsmanship/hexagonal-architecture/) · [Philippe Bourgau — Avoid Mocks and Test Your Core Domain Faster](https://philippe.bourgau.net/avoid-mocks-and-test-your-core-domain-faster-with-hexagonal-architecture/) · [Medium — Understanding Hexagonal, Clean, Onion, and Layered Architectures](https://romanglushach.medium.com/understanding-hexagonal-clean-onion-and-traditional-layered-architectures-a-deep-dive-c0f93b8a1b96) · [CCD Akademie — Clean Architecture vs. Onion Architecture vs. Hexagonal Architecture](https://ccd-akademie.de/en/clean-architecture-vs-onion-architecture-vs-hexagonal-architecture/) · [Martin Fowler — Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html)*
