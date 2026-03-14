# Layered Architecture — Architecture Expertise Module

> Layered architecture organizes code into horizontal stacks where each layer has a specific responsibility and can only communicate with adjacent layers. It is the default starting point for most applications — simple to understand, widely taught, sufficient for the majority of CRUD-heavy systems.

> **Category:** Pattern
> **Complexity:** Simple
> **Applies when:** Most applications as the default starting architecture, especially CRUD-heavy systems

---

## What This Is (and What It Isn't)

### The Classic Model

Layered architecture divides an application into horizontal tiers, each responsible for a distinct concern. The canonical 4-layer model found in most enterprise and web applications is:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  HTTP handlers, controllers, views, UI
├─────────────────────────────────────┤
│       Business Logic Layer          │  Services, use cases, domain rules
├─────────────────────────────────────┤
│         Data Access Layer           │  Repositories, ORMs, query builders
├─────────────────────────────────────┤
│           Database Layer            │  SQL/NoSQL engine, schema
└─────────────────────────────────────┘
```

A simpler 3-layer variant collapses data access into the persistence tier:

```
Presentation → Business Logic → Data (persistence + database)
```

### N-Tier vs N-Layer: A Critical Distinction

These terms are often used interchangeably but mean different things:

- **N-layer** (logical): Code organization within a single deployable. A monolith can be perfectly well organized into 3 logical layers.
- **N-tier** (physical): Separate deployment units that communicate over a network. The presentation tier runs on one server, the application tier on another, the database on a third.

Physical separation introduces network latency, distributed system complexity, and independent scaling capability. Logical layering gives you separation of concerns with none of the distribution overhead. Most applications start with logical layers inside a monolith, then extract tiers as scaling demands emerge.

### MVC, MVP, MVVM Are Not Alternatives

MVC (Model-View-Controller), MVP (Model-View-Presenter), and MVVM (Model-View-ViewModel) are patterns that operate *within* the presentation layer. They describe how the UI, user input, and data binding are organized — not how the whole application is structured. An application that uses MVC still has a service layer below its controllers and a repository layer below that. MVC is a sub-pattern of layered architecture, not a competitor to it.

### Strict vs Relaxed (Open) Layering

**Strict layering**: A layer may only call the layer directly below it. The presentation layer cannot skip the business layer and call the repository directly. This enforces clean separation but creates "pass-through" boilerplate when a layer has no real work to do.

**Relaxed (open) layering**: A layer may skip layers and call any layer below it. This reduces sinkhole boilerplate at the cost of eroding the separation of concerns over time. In practice, most real-world codebases drift toward relaxed layering unintentionally.

### What Layered Architecture Is NOT

Layered architecture must not be confused with hexagonal (ports and adapters) or clean architecture. The critical difference is **dependency direction**:

- In **layered architecture**, dependencies flow downward. The business layer imports from the data access layer. The domain is coupled to persistence.
- In **hexagonal/clean architecture**, dependencies point *inward*. The domain core has zero knowledge of databases, HTTP, or any infrastructure. Infrastructure adapts to the domain, not the reverse.

This means in a layered architecture, swapping out the database requires changes throughout the business layer — the layers are fundamentally coupled through their import chains. In hexagonal, you swap the adapter; the domain is untouched.

---

## When to Use It

Layered architecture is the correct *default* choice for the vast majority of new projects. The following conditions make it a strong fit:

**Project characteristics:**
- CRUD-heavy applications where most operations are "validate input, transform, write to DB, return response"
- Business logic that is mostly validation, simple calculations, and data transformation — not complex domain workflows
- Applications with straightforward, linear request flows (HTTP request in → business rule → DB query → HTTP response out)
- Systems where the database schema closely matches the domain model and that coupling is acceptable

**Team characteristics:**
- Small to medium teams (1–15 developers) who need low coordination overhead
- Teams already familiar with the pattern (onboarding time is near zero — every developer knows how to find a "service" and a "repository")
- Projects where delivery speed is more important than architectural purity
- When there is no clear domain expert and DDD would be premature

**Organizational characteristics:**
- Early-stage products where requirements will change frequently and architectural investment has low ROI
- Enterprise applications with stable, simple workflows (user management, reporting, configuration)
- Internal tools, admin panels, dashboards, and data entry systems

**Framework alignment:**
Every major web framework scaffolds layered architecture as its default structure. Choosing layered means going with the grain of the tools:

| Framework | Default Structure |
|-----------|------------------|
| Ruby on Rails | MVC: controllers → models (fat model = service+domain) |
| Django | Views → models (MTV pattern is layered) |
| Spring Boot (Java) | Controller → Service → Repository |
| ASP.NET MVC (.NET) | Controller → Service → Repository |
| Laravel (PHP) | Controller → Service/Model → Eloquent |
| NestJS (Node) | Controller → Service → Repository/TypeORM |
| Express.js (Node) | Router → Middleware → Service → DB |

When a framework provides a layered scaffold, fighting the default structure imposes a learning penalty on every new hire and increases friction with library documentation.

---

## When NOT to Use It

This section is equally important as "When to Use It." Most architectural debt in production systems originates from continuing to use layered architecture past the point where it stops delivering value.

### The Sinkhole Anti-Pattern

The most common failure indicator. A sinkhole occurs when requests pass through every layer without any layer adding meaningful work:

```
Controller.getUser(id)
  → UserService.getUser(id)          // just calls repository
    → UserRepository.findById(id)    // just calls ORM
      → ORM.find(User, id)           // executes SELECT
```

Every layer adds a method call and a file to navigate, but no layer contributes logic. The business layer is a thin wrapper around the data layer.

**The 80-20 diagnostic rule** (from Mark Richards, "Software Architecture Patterns"): If 80% of your request paths are sinkholes — passing through every layer with no real processing — layered architecture is the wrong choice for your problem domain. A 20% sinkhole rate is acceptable; an 80% rate is a signal to restructure. At that point, you are paying the cost of layering (indirection, boilerplate, navigation overhead) without receiving its benefit (isolation of complex logic per layer).

### The God Service Anti-Pattern

Layered architecture concentrates all business logic into the "service" layer. As features accumulate, a `UserService` that started at 200 lines grows to 2,000, then 5,000, then 10,000 lines. It handles registration, authentication, profile updates, password resets, admin operations, billing integrations, audit logging, and notification dispatch — all because "it involves a user."

This is not a failure of individual developers; it is a structural consequence of having a single "business logic layer" with no further organizing principle. The service layer is a God Object waiting to happen in any sufficiently complex application.

**Signs the service layer has become a God Object:**
- Service class files exceed 500 lines
- Service methods take 5+ parameters
- Service tests require mocking 6+ dependencies
- Two unrelated features must both import the same service
- A "simple" change to one feature breaks tests in unrelated features

### When Infrastructure Drives the Domain

In layered architecture, the domain model is typically generated from or mirrors the database schema. Entities are ORM models. When this is the case, adding a new business rule requires changing the DB schema, running a migration, and updating every layer simultaneously. The database becomes the architectural authority — the domain is just a reflection of table structure.

This is acceptable when the domain is simple and stable. It becomes a serious problem when:
- Business rules are complex and volatile
- The domain model needs to represent concepts that do not map cleanly to relational tables
- Multiple bounded contexts share the same persistence layer and schema changes cascade

### When You Need to Test Business Logic Independently

In layered architecture, the business layer imports from the data access layer. A unit test of a service method typically requires either:
1. A real database running (integration test, slow, fragile)
2. Mocking the repository (fast, but the mock interface leaks DB concerns into tests)

If fast, isolated unit tests of business rules are a priority — especially in complex domains — layered architecture structurally makes this harder. Hexagonal/clean architecture solves this by inverting the dependency: the domain defines an interface (port), and tests inject a fake implementation (adapter) with no ORM involved.

### When Team Size Crosses a Threshold

Above 15–20 developers, shared horizontal layers become coordination bottlenecks. All feature work converges into the same `services/` directory. Merge conflicts in service files become a daily occurrence. No team can own a "layer" — every team touches every layer for every feature. At this scale, vertical slices or modular monoliths — organized by feature or bounded context rather than technical layer — become necessary to restore team autonomy.

### Do Not Use Layered Architecture When:
- The domain has rich, complex rules that benefit from object-oriented domain modeling (use DDD + hexagonal instead)
- You expect frequent infrastructure replacement (swap DB engine, switch ORM, add event streaming) — the coupling through layers makes this expensive
- The team has explicit hexagonal/clean architecture experience and the project will be long-lived
- The request flow is predominantly event-driven or message-based rather than synchronous request/response

---

## How It Works

### Layer Responsibilities in Detail

**Presentation Layer**

The presentation layer is the entry point for all external interaction. Its responsibilities are narrow:

- Receive and parse HTTP requests (routing, path/query parameter extraction)
- Input validation (shape and format only — not business rules; "is this a valid email address format?" belongs here; "is this email already registered?" does not)
- Authentication verification (is the JWT valid? is the session active?)
- Authorization checks (does this principal have permission to call this endpoint? — coarse-grained only)
- Serialization of responses (convert domain objects to JSON/XML DTOs)
- Error mapping (translate domain exceptions to HTTP status codes and error payloads)

The presentation layer must contain **zero business logic**. A controller that calls `if user.role == 'admin' and user.accountBalance > 1000` has violated the layer boundary.

**Business Logic Layer (Service Layer)**

The service layer orchestrates the application's actual work:

- Coordinate multiple data access operations into a single workflow
- Enforce business rules ("a user cannot place an order while their account is suspended")
- Perform transformations and calculations that are meaningful to the domain
- Raise domain events
- Manage transaction boundaries (start, commit, rollback)
- Call external service integrations (email dispatch, payment gateway)

The service layer depends on the data access layer. It should not know whether the data is stored in PostgreSQL, MongoDB, or an in-memory cache. In practice, when using an ORM, this separation is often compromised because ORM entities carry database concerns directly into service code.

**Data Access Layer (Repository / Persistence Layer)**

The data access layer isolates the mechanics of storage:

- Execute queries (SQL, ORM, document queries)
- Map between domain objects and persistence representations
- Manage connection pooling and ORM sessions
- Implement caching strategies (query-level caching, second-level cache)
- Handle database-specific concerns (pagination, sorting, full-text search)

Repositories are the standard abstraction. Each repository provides a collection-like interface (`findById`, `findAll`, `save`, `delete`) that hides how data is physically fetched. When repositories are done well, swapping the underlying database means reimplementing the repository — the service layer is untouched.

**Database Layer**

The actual storage engine. SQL (PostgreSQL, MySQL, SQLite), NoSQL (MongoDB, DynamoDB, Redis), or file-based. This is not "your code" — it is infrastructure. The data access layer shields the rest of the application from the specifics of this layer.

### Cross-Cutting Concerns

Some concerns span all layers. The canonical approach:

| Concern | Where It Lives |
|---------|---------------|
| Request logging | Middleware (before presentation layer) |
| Authentication | Middleware or presentation layer |
| Authorization (fine-grained) | Business logic layer |
| Transaction management | Business logic layer or AOP/decorators |
| Error handling (application-level) | Middleware or global exception handler |
| Observability / metrics | Middleware + AOP instrumentation |
| Input sanitization | Presentation layer |
| Audit logging | Business logic layer (closest to intent) |

### Communication Patterns

**Synchronous downward calls**: The standard pattern. A controller calls a service method. The service calls a repository method. The repository executes a query. Results flow back up the stack synchronously.

**DTOs (Data Transfer Objects) between layers**: Each layer boundary should use its own data shape. The presentation layer receives an HTTP payload and maps it to a "request DTO" or "command object" before passing to the service. The service returns a "result DTO" that the controller serializes to JSON. The domain/entity object should not be directly serialized in the response — doing so leaks internal structure and creates implicit contracts with API consumers.

```
HTTP Request Body → RequestDTO (presentation) → ServiceCommand → DomainEntity → ResponseDTO → HTTP Response Body
```

**Dependency Injection**: Layers depend on abstractions, not concrete implementations. The service layer declares a dependency on `IUserRepository` (an interface). The DI container injects `PostgresUserRepository` (the concrete class) at runtime. This enables testing with mock repositories and, in principle, swapping implementations.

### Strict vs Relaxed Layering in Practice

Teams often start with strict layering intentions and drift toward relaxed layering under delivery pressure. A pragmatic policy: allow relaxed layering only for infrastructure utilities (logging, config) that are genuinely cross-cutting. Enforce strict layering for the core data flow (presentation → business → persistence). Code review should flag any direct repository call from a controller.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| **Familiarity** — every developer knows the pattern; zero ramp-up time | **Service layer bloat** — all business logic collapses into a single layer that grows without bound |
| **Simplicity** — folder structure is predictable; new features follow an obvious path | **Sinkhole anti-pattern risk** — pass-through layers add indirection with no logical value |
| **Clear separation of HTTP from persistence** — controllers don't write SQL | **Domain logic tangled with infrastructure** — ORM entities bleed into business rules |
| **Works well for CRUD** — validation → transform → store maps naturally to the layer structure | **Hard to unit-test business logic** — service tests require mocking DB or spinning up test DB |
| **Framework alignment** — scaffolds, tutorials, and documentation all use this structure | **God Service risk** — no structural mechanism prevents a single service class from accumulating all logic |
| **Parallel team development** — frontend, backend, and DBA teams can work independently on their layer | **Horizontal coupling** — a feature change touches presentation, service, and data layers simultaneously |
| **Incremental delivery** — each layer can be built and tested independently during initial development | **Change ripple effect** — a new field on a DB table often requires changes in 4 files across 3 layers |
| **Audit and compliance-friendly** — clear layer for security checks and logging | **Poor domain expressiveness** — the "business logic layer" is often just CRUD orchestration, not real domain modeling |
| **Well-understood scaling path** — physical tier separation (3-tier deployment) is documented and supported by cloud providers | **Scaling is coarse-grained** — you cannot scale "the order processing feature"; you scale the entire business layer |

---

## Evolution Path

### Phase 0 — Start Here: Layered Monolith

Every new project should start as a layered monolith unless there is a compelling reason not to. The pattern is simple, well-understood, and cheap to build. Premature architectural sophistication is a form of over-engineering.

```
my-app/
  controllers/   (presentation)
  services/      (business logic)
  repositories/  (data access)
  models/        (entities / ORM models)
  config/
  tests/
```

### Phase 1 — Pain Signal: Service Layer Becoming a God Object

When service classes exceed 500 lines, multiple teams are editing the same service file, or a "simple" feature requires touching 6 services, the flat service layer has outgrown the architecture.

**First response**: Extract domain classes. Move business rules out of service methods and into rich domain objects. `UserService.canPlaceOrder(user, cart)` becomes `user.canPlaceOrder(cart)`. The service orchestrates; the domain object enforces rules.

### Phase 2 — Pain Signal: Infrastructure Coupling Blocking Change

When swapping the database, adding a message queue, or integrating a new external API requires changes throughout the service layer, the layered coupling has become expensive.

**Response**: Introduce port interfaces. Define `IOrderRepository` in the business layer. Move the concrete implementation (`PostgresOrderRepository`) to an infrastructure layer. This is the step that converts layered architecture into hexagonal architecture.

```
Hexagonal transition:
  domain/          (pure business logic, no imports from infra)
  application/     (use cases, port interfaces defined here)
  adapters/
    http/          (was: presentation layer)
    persistence/   (was: data access layer)
    messaging/     (new: event-driven integrations)
```

The migration is incremental: refactor one service/repository pair at a time. Do not attempt a big-bang rewrite.

### Phase 3 — Pain Signal: Teams Blocked by Shared Layers

When 20+ developers are all committing to the same `services/` directory and merge conflicts are daily, horizontal layers have become coordination bottlenecks.

**Response**: Introduce module boundaries. Group code by bounded context or feature domain, then apply layers within each module.

```
Modular monolith:
  modules/
    orders/
      controllers/, services/, repositories/
    billing/
      controllers/, services/, repositories/
    users/
      controllers/, services/, repositories/
```

Inter-module communication goes through explicit interfaces, not direct service imports. Each module can eventually become a microservice if needed — the module boundary is the extraction seam.

### Alternative Evolution: Vertical Slices

Instead of deepening the horizontal layers, some teams pivot to vertical slice architecture (popularized by Jimmy Bogard for .NET, applicable broadly). Each feature is a self-contained slice:

```
features/
  CreateOrder/
    CreateOrderRequest.ts
    CreateOrderHandler.ts
    CreateOrderValidator.ts
    CreateOrderQuery.ts    (if it also needs DB access)
  GetOrderHistory/
    ...
```

Vertical slices eliminate the "which layer does this go in?" question. They reduce merge conflicts because two features rarely touch the same files. They come at the cost of code sharing — common patterns must be explicitly extracted to a `shared/` module to avoid duplication.

### Migration Heuristics

| Condition | Action |
|-----------|--------|
| Service class > 500 lines | Extract domain objects; push rules into the domain |
| > 20 devs sharing same service directory | Introduce module boundaries (modular monolith) |
| Infrastructure swap required | Introduce port interfaces → hexagonal |
| 80%+ sinkhole request paths | Consider vertical slices |
| Sinkhole < 20% of paths | Open the layers (allow skipping) to reduce boilerplate |
| Microservices being considered | First go modular monolith; only then extract services |

---

## Failure Modes

### 1. The Sinkhole Anti-Pattern (Pervasiveness: High)

**What it looks like**: A three-layer pass-through where every layer simply calls the next one with no transformation. A `getUser` request goes through `UserController → UserService → UserRepository` and each method is a one-liner wrapping the next.

**Why it happens**: Developers feel obligated to respect the layer structure even when a given operation has no logic to put in the business layer. Rather than skipping the layer, they create an empty wrapper method.

**Damage**: Navigation overhead multiplied across thousands of files. A simple change requires editing three files in three directories with no architectural benefit.

**Fix**: Allow open layering for pure read operations. If a controller genuinely needs to return a list of reference data with no business rules applied, it can call the repository directly. Reserve the service layer for operations that actually have business logic.

---

### 2. God Service Anti-Pattern (Pervasiveness: Very High)

**What it looks like**: `UserService` with 5,000 lines handling registration, login, password reset, profile management, admin operations, session management, billing hooks, and notification triggers.

**Why it happens**: The service layer provides no organizing principle beyond "things that involve this entity." Every feature that touches a `User` record lands in `UserService` because there is nowhere else for it to go.

**Real-world scale**: In a mid-sized e-commerce monolith, a single `OrderService` accumulated 8,400 lines over three years. Adding the "split order into partial shipments" feature required 4 hours just to understand the existing code before writing a single line. The service had 23 injected dependencies.

**Fix**: Introduce sub-services per use case (`OrderCreationService`, `OrderFulfillmentService`, `OrderCancellationService`), or refactor to domain objects where the entity itself carries the rules. At scale, apply module boundaries.

---

### 3. Fat Controller (Pervasiveness: Medium)

**What it looks like**: Business logic accumulates in the controller/handler layer because "it's easier not to create a new service method." A 300-line controller method that validates business rules, fetches multiple entities, performs calculations, and builds complex response payloads.

**Why it happens**: Developer time pressure. A service method call requires creating the service, injecting it, writing the method signature, and writing a test. A controller method is already open in the editor.

**Damage**: Business logic is untestable without spinning up the HTTP stack. Logic cannot be reused from other entry points (async jobs, CLI commands, other controllers).

**Fix**: Code review policy: controllers must not contain `if` statements that implement business rules. Flag any controller method exceeding 30 lines.

---

### 4. Domain Model == Database Schema (Pervasiveness: High)

**What it looks like**: The "domain model" is a set of ORM entity classes that mirror database tables 1:1. A `User` entity has fields for every column in the `users` table. Business methods do not exist on the entity — they live in services.

**Why it happens**: ORMs make it easy to generate entity classes from schemas. When the data model is the domain model, there is no distinction between the two.

**Damage**: Adding a business rule requires changing the DB schema. Schema migrations become the gating factor on feature delivery. Domain concepts that span multiple tables have no home. Business logic cannot be reasoned about independently of storage structure.

**Fix**: When the domain becomes complex enough that this coupling is painful, introduce a separate domain layer where objects express business concepts, and a mapping layer that translates between domain objects and ORM entities.

---

### 5. Scattered Logic Across All Layers (Pervasiveness: Medium)

**What it looks like**: The same validation rule exists in the controller, the service, and the repository. Business decisions are made in SQL queries (`WHERE status = 'active' AND NOT suspended`) that duplicate rules in the service layer. Authorization logic appears in three different places.

**Why it happens**: No ownership of "where does this rule live?" Different developers made different choices. Copy-paste spread a rule before a canonical home was established.

**Damage**: Changing the rule requires finding all occurrences. Missing one occurrence creates inconsistent behavior. A change to the DB query does not update the service-layer check.

**Fix**: Explicit policy: business rules live in the service layer. Presentation layer validates shape only. DB queries are parameterized by the service; they do not embed business rules as SQL predicates.

---

### 6. Layered Architecture Used Past Its Useful Life (Pervasiveness: High)

**What it looks like**: A 5-year-old application with 200K lines of code, still organized as a flat `controllers/ services/ repositories/` structure. Every developer knows it is painful but the migration cost seems prohibitive.

**Real-world incident**: A fintech company's core banking monolith used a single flat layered structure for 6 years. Adding a "simple" new field to the customer entity required changes in 14 service files, 3 controller files, and 6 test files due to horizontal coupling. A field addition had a median lead time of 3 weeks. The architecture had not evolved past the initial structure despite the codebase growing 40x.

**Fix**: Do not attempt a big-bang rewrite. Apply the Strangler Fig pattern: identify bounded contexts, introduce module packages, move code into modules incrementally, enforce module interface contracts, then optionally extract services.

---

## Technology Landscape

### Frameworks That Scaffold Layered Architecture

| Framework | Language | Layer Convention |
|-----------|----------|-----------------|
| Spring Boot | Java | `@Controller` → `@Service` → `@Repository` |
| ASP.NET MVC | C# | Controller → Service → Repository (DbContext) |
| Ruby on Rails | Ruby | Controller → Model (fat model or service objects) |
| Django | Python | View/Serializer → Model (or Service layer by convention) |
| Laravel | PHP | Controller → Service/Action → Model (Eloquent) |
| NestJS | TypeScript | Controller → Service → Repository/TypeORM Entity |
| Express.js | JavaScript | Router → Middleware → Service → DB Client |
| Gin / Echo | Go | Handler → Service → Repository → SQL |
| Phoenix | Elixir | Controller → Context (business logic) → Ecto Schema |
| Symfony | PHP | Controller → Service → Repository (Doctrine) |

Spring Boot, ASP.NET, and Laravel provide the most opinionated layered scaffolding with first-class DI containers that make the pattern easy to implement cleanly.

### ORM Tools (Data Access Layer)

| Tool | Ecosystem | Notes |
|------|-----------|-------|
| Hibernate / JPA | Java | Industry standard; powerful but leaks DB concerns |
| Entity Framework | .NET | Code-first migrations; tight ORM/domain coupling by default |
| ActiveRecord | Ruby/Rails | Fat model pattern; service layer often added separately |
| Sequelize / TypeORM / Prisma | Node.js | Prisma generates type-safe queries; TypeORM supports DDD patterns |
| SQLAlchemy | Python | Supports both data mapper and active record patterns |
| Doctrine | PHP | Data Mapper pattern; better domain separation than ActiveRecord |
| GORM | Go | Simple active record; clean repository wrappers common |

### Architectural Comparisons

**Layered vs Hexagonal/Clean Architecture**

The key migration trigger: when the business layer needs to import from the persistence layer, you have layered architecture. When the persistence layer implements an interface defined by the business layer, you have hexagonal. The dependency inversion principle is the dividing line.

| Aspect | Layered | Hexagonal/Clean |
|--------|---------|-----------------|
| Dependency direction | Top-down (presentation → business → persistence) | Inward (infrastructure → application → domain) |
| DB coupling | Domain depends on DB layer | DB implements domain port |
| Test isolation | Requires mocking DB | Domain tested without DB |
| Learning curve | Low | Medium-High |
| CRUD suitability | Excellent | Overengineered for simple CRUD |
| Complex domain suitability | Poor (God Service risk) | Excellent |
| Framework alignment | Matches most frameworks | Requires deliberate structure |

**Layered vs Vertical Slices**

| Aspect | Layered (Horizontal) | Vertical Slices |
|--------|---------------------|-----------------|
| Code organization | By technical role | By feature/use case |
| Merge conflict risk | High (shared service files) | Low (feature-isolated) |
| Code sharing | Easy (shared service layer) | Explicit (shared/ module required) |
| Team autonomy | Low (shared layers) | High (own your slice) |
| Onboarding | Trivial (universal pattern) | Moderate (feature-finding) |
| CRUD suitability | Good | Good |
| Complex feature suitability | Poor (God Service) | Good |

---

## Decision Tree

```
New project?
├── Small team (1-10 devs) + mostly CRUD?
│   └── YES → Layered architecture is the correct default.
│              Use controllers/services/repositories.
│
├── Complex domain with rich business rules?
│   └── YES → Consider hexagonal/clean from the start.
│              Layered will become painful within 12-18 months.
│
└── Large team (20+ devs) needing feature ownership?
    └── YES → Vertical slices or modular monolith.
               Horizontal layers will become coordination bottlenecks.

Existing layered project?
├── Service classes > 2,000 lines?
│   └── YES → Introduce domain objects; extract sub-services.
│              Consider migration to hexagonal.
│
├── 80%+ of requests are pass-through sinkholes?
│   └── YES → Open the layers (allow skipping) OR
│              pivot to vertical slice architecture.
│
├── Need to test business rules without DB?
│   └── YES → Introduce port interfaces → hexagonal migration path.
│
├── DB swap or major infrastructure change needed?
│   └── YES → Introduce repository interfaces; decouple domain from ORM entities.
│
├── Team > 20 devs, merge conflicts daily?
│   └── YES → Introduce module boundaries → modular monolith.
│              Do NOT jump straight to microservices.
│
└── Everything working, team happy, feature velocity acceptable?
    └── Stay with layered architecture. It is working.
        Architecture evolution should be driven by real pain, not theory.
```

---

## Implementation Sketch

### Folder Structure

```
src/
├── controllers/          # Presentation layer
│   ├── userController.ts
│   └── orderController.ts
├── services/             # Business logic layer
│   ├── userService.ts
│   └── orderService.ts
├── repositories/         # Data access layer
│   ├── userRepository.ts
│   └── orderRepository.ts
├── models/               # ORM entities / domain models
│   ├── User.ts
│   └── Order.ts
├── dto/                  # Data Transfer Objects (per-layer contracts)
│   ├── createUserDto.ts
│   └── userResponseDto.ts
├── middleware/           # Cross-cutting concerns
│   ├── authMiddleware.ts
│   └── errorHandler.ts
└── config/
    └── database.ts
```

### Request Flow (TypeScript / NestJS-style)

**1. Controller (presentation layer)**

```typescript
// controllers/userController.ts
@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    // Validate shape only (email format, required fields)
    // No business rules here
    const user = await this.userService.createUser(dto);
    return UserResponseDto.from(user);
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.getById(id);
    if (!user) throw new NotFoundException();
    return UserResponseDto.from(user);
  }
}
```

**2. Service (business logic layer)**

```typescript
// services/userService.ts
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    // Business rule: email must be unique
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    // Business rule: password complexity enforced here, not in controller
    if (!isStrongPassword(dto.password)) {
      throw new BadRequestException('Password does not meet requirements');
    }

    const user = new User({
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      createdAt: new Date(),
    });

    const saved = await this.userRepository.save(user);
    await this.emailService.sendWelcome(saved.email);
    return saved;
  }

  async getById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
```

**3. Repository (data access layer)**

```typescript
// repositories/userRepository.ts
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly orm: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.orm.findOne({ where: { id } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.orm.findOne({ where: { email } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async save(user: User): Promise<User> {
    const entity = UserMapper.toEntity(user);
    const saved = await this.orm.save(entity);
    return UserMapper.toDomain(saved);
  }
}
```

**4. DTO definitions**

```typescript
// dto/createUserDto.ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}

// dto/userResponseDto.ts
export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;

  static from(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
      // NOTE: passwordHash is NOT included — DTO prevents leaking internals
    };
  }
}
```

**5. Dependency injection configuration**

```typescript
// app.module.ts (NestJS) or equivalent DI config
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    EmailService,
  ],
})
export class UserModule {}
```

### What This Buys You

- Controllers have no business logic — they are HTTP adapters only
- Service methods are independently testable (inject a mock `UserRepository`)
- DTOs prevent accidental leakage of internal fields in API responses
- Repository isolates the ORM — swapping TypeORM for Prisma means rewriting only `UserRepository`
- DI makes dependencies explicit and swappable without modifying calling code

### What to Watch For

- When `UserService` exceeds 300 lines, it is time to split by use case
- If the controller starts calling `userRepository` directly, the architecture has broken down
- When `UserResponseDto` starts including deeply nested objects from multiple entities, the query belongs in a dedicated read model or query service
- The moment you write `UserService` constructor with 8 `@Inject()` parameters, a refactor is overdue

---

## Cross-References

- **hexagonal-clean-architecture** — The natural evolution when domain complexity or testability requirements outgrow layered architecture. Introduces dependency inversion at the persistence boundary.
- **modular-monolith** — Applies module boundaries on top of layered architecture. Organizes layers by business domain rather than a single flat namespace. The recommended intermediate step before microservices.
- **separation-of-concerns** — The foundational principle that layered architecture implements. Understanding SoC explains why layer violations are costly.
- **monolith** — Layered architecture is the most common structure for a monolith. Understanding monolith trade-offs informs when to stay layered vs. when to decompose.
- **domain-driven-design** — DDD becomes relevant when the service layer is accumulating complex rules. DDD provides the vocabulary (aggregates, value objects, domain events) for structuring a richer domain layer.

---

*Researched: 2026-03-08 | Sources:*
- *[Understanding the Layered Architecture Pattern — DEV Community](https://dev.to/yasmine_ddec94f4d4/understanding-the-layered-architecture-pattern-a-comprehensive-guide-1e2j)*
- *[Software Architecture Patterns: Layered Architecture — O'Reilly](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html)*
- *[The Pros and Cons of a Layered Architecture Pattern — TechTarget](https://www.techtarget.com/searchapparchitecture/tip/The-pros-and-cons-of-a-layered-architecture-pattern)*
- *[N-Tier Architecture Style — Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)*
- *[Architecture Sinkhole Anti-Pattern — Candost's Blog](https://candost.blog/notes/45a/)*
- *[Vertical Slice Architecture — Jimmy Bogard](https://www.jimmybogard.com/vertical-slice-architecture/)*
- *[N-Layered vs Clean vs Vertical Slice Architecture — Anton Dev Tips](https://antondevtips.com/blog/n-layered-vs-clean-vs-vertical-slice-architecture)*
- *[Understanding Hexagonal, Clean, Onion, and Traditional Layered Architectures — Medium](https://romanglushach.medium.com/understanding-hexagonal-clean-onion-and-traditional-layered-architectures-a-deep-dive-c0f93b8a1b96)*
- *[What Is Three-Tier Architecture — IBM](https://www.ibm.com/think/topics/three-tier-architecture)*
- *[Layered Architecture and Service Based Development — Why Not Use It — Medium](https://medium.com/@johnnywiller10/layered-architecture-and-service-based-development-why-no-9378b146b0ef)*
- *[Exploring The Model-View-Controller (MVC) Architecture — Preprints.org](https://www.preprints.org/manuscript/202404.1860)*
- *[Layered Monolith — microservices.io](https://microservices.io/articles/draftZZZ/monolith-patterns/layered-monolith.html)*
