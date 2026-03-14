# Design Principles — SOLID — Architecture Expertise Module

> SOLID is a set of five object-oriented design principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) that guide code organization for maintainability. They are heuristics, not laws — mechanical application often produces over-engineered code.

> **Category:** Foundation
> **Complexity:** Moderate
> **Applies when:** Object-oriented codebases with growing complexity where maintainability and testability are priorities

---

## What This Is (and What It Isn't)

### The Five Principles at a Glance

**S — Single Responsibility Principle (SRP)**
A class should have only one reason to change. "Reason to change" is the operative phrase — it means a single *actor* or *stakeholder* drives the class's evolution, not that the class does only one low-level task. A class that formats invoices AND sends emails AND persists to a database serves three actors (finance, notifications, infrastructure) and will be modified from three different directions.

What it enables: classes that are focused, easily named, straightforwardly testable, and changed without surprising side effects.

What it does NOT mean: every class must contain a single method, or that utility classes are banned, or that you should fracture cohesive logic into dozens of micro-classes.

---

**O — Open/Closed Principle (OCP)**
Software entities should be open for extension but closed for modification. A stable abstraction (an interface or an abstract class) is "closed" — callers depend on it permanently. New behavior is added by implementing or extending, not by editing the stable contract.

What it enables: adding features (new payment providers, new export formats, new notification channels) without touching — and therefore risking — existing working code.

What it does NOT mean: you need an abstract factory for every concrete class, or that you should predict all future variations before writing the first line. Robert Martin's original formulation referred to the *Meyer* sense (inheritance) and was later broadened to the *polymorphic* sense (interfaces + composition). Neither version justifies speculative generalization.

---

**L — Liskov Substitution Principle (LSP)**
Objects of a derived type must be substitutable for objects of their base type without altering program correctness. Formally: if `f(x)` is provable for all objects `x` of type `T`, then `f(y)` must hold for all `y` of subtype `S`. Practically: a subclass must honor the *behavioral contract* of its superclass — preconditions cannot be strengthened, postconditions cannot be weakened, invariants must be preserved.

What it enables: polymorphic code that actually works predictably. It is the principle that makes interfaces useful rather than merely structural.

What it does NOT mean: all inheritance hierarchies are wrong. It means hierarchies must reflect behavioral relationships, not just conceptual/IS-A relationships in the English-language sense.

---

**I — Interface Segregation Principle (ISP)**
Clients should not be forced to depend on methods they do not use. Fat interfaces that serve many callers create artificial coupling — a change to an unused method forces recompilation (or re-testing) of all clients.

What it enables: role-based interfaces (sometimes called "role interfaces") where each caller sees only the slice of behavior it needs. This also makes mocking and testing radically simpler.

What it does NOT mean: every interface must be a single-method SAM (Single Abstract Method). The goal is cohesive, client-specific contracts. Ten methods that are always used together belong on one interface.

---

**D — Dependency Inversion Principle (DIP)**
High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details (concrete implementations) should depend on abstractions.

What it enables: high-level business logic that can be tested without databases, HTTP clients, or file systems; swappable infrastructure implementations; IoC (Inversion of Control) containers that wire everything together.

What it does NOT mean: every function parameter must be an interface. Constructor injection of concrete collaborators is fine when those collaborators have no meaningful variation and no testing cost.

---

### SOLID Is NOT

- **Not a checklist.** Running down the list and asking "have I applied OCP here?" is a recipe for unnecessary complexity. Apply a principle when a *specific pain* points to it.
- **Not universally applicable.** SOLID is an OO design vocabulary. It has limited applicability to purely functional code, data-pipeline scripts, CLI tools, and throwaway prototypes.
- **Not a substitute for judgment.** The principles sometimes conflict: SRP pushes toward many small classes (more files, more navigation, more cognitive overhead); performance sometimes demands fusing concerns back together. Judgment resolves the conflict; dogma does not.
- **Not a quality metric.** A codebase that "follows all five principles" can still be a mess if the abstractions are wrong. A codebase that violates several can still be excellent.
- **Not static.** The principles describe a design direction, not a final state. Code that violates SRP today is acceptable if it has not yet grown large enough to hurt. Refactoring toward SOLID is iterative.

---

## When to Use It

Apply SOLID deliberately — as a targeted response to a recognized pain — in the following contexts:

**1. Object-oriented code with growing complexity**
When a codebase is clearly OO (Java, C#, TypeScript classes, Python classes with non-trivial inheritance) and has grown beyond ~5,000 lines actively maintained by more than one developer, the organizational principles of SOLID start to pay off. Below this threshold, the overhead of abstractions often exceeds the benefit.

**2. Long-lived codebases**
Software with a multi-year runway justifies the upfront cost of deliberate design. Django's middleware system is a textbook OCP application — new middleware is added by implementing a callable interface, existing middleware is never modified. Spring Framework's Dependency Injection container is the canonical DIP example: business beans declare their dependencies as interfaces; the container resolves them. Both systems have survived over a decade of extension without wholesale rewrites of core code.

**3. Large teams (5+ developers)**
With many contributors, God Classes become merge conflict hotspots. SRP enforces a natural module boundary that maps to team ownership. DIP prevents teams from hard-wiring their components to each other's concrete implementations.

**4. When specific code smells appear**

| Smell | Principle to Apply |
|---|---|
| Class has 10+ dependencies | SRP — it's doing too much |
| Adding a feature requires changing 6 files | OCP — plugin point missing |
| Subclass overrides method to throw `UnsupportedOperation` | LSP — wrong inheritance hierarchy |
| Tests need 8 mocks for a simple unit | ISP or DIP — interfaces too fat or dependencies concrete |
| Business logic tests require a real database | DIP — infrastructure detail leaked into domain |
| Class named `Manager`, `Handler`, `Processor`, `Utils` | SRP — unclear single responsibility |

**5. When testability is blocking quality**
If a class is genuinely difficult to unit test because it creates its own collaborators (files, databases, external services), DIP is the immediate fix. Inject the collaborator as an abstraction; swap in a test double. This is the single highest-ROI SOLID application.

---

## When NOT to Use It

This section is as important as the previous one. Misapplied SOLID is a major source of accidental complexity in the industry.

### Small Projects and Short-Lived Code

A script that parses a log file and produces a report has no stakeholders, no team, no long-term evolution. Splitting it into `LogParser`, `ReportFormatter`, `ReportWriter`, and a `IReportDestination` interface is waste. The code is harder to read, harder to trace, and slower to modify. KISS wins here: if you can hold the whole program in your head, hold it in one file.

A startup MVP that might be thrown away in 90 days should not be engineered for the open/closed property. Write clear, direct code. If the product survives, refactor.

### Functional and Data Pipeline Code

SOLID is an OO vocabulary. A data transformation pipeline — `read → validate → transform → write` — expressed as a chain of pure functions or dataclass pipelines has no natural place for "interfaces" or "dependency inversion" in the OO sense. Imposing class hierarchies on functional code creates unnecessary friction. Use composition of functions, not composition of objects.

### When KISS and YAGNI Beat SOLID

YAGNI (You Aren't Gonna Need It) directly opposes premature OCP. "We might need multiple database backends" is not a reason to introduce a `DatabaseAdapter` interface when only PostgreSQL will ever be used. Every abstraction has a cost: indirection, discovery difficulty, naming burden, and the false sense that you've prepared for a future that never arrives.

**Real incident — interface proliferation for SRP compliance:**
A mid-sized engineering team spent three weeks extracting a working 400-line service class into 11 classes, each "with a single responsibility," plus 8 interfaces for dependency injection. The result: a change to the feature's behavior required touching 7 files instead of 1. The original class was not actually causing test failures or merge conflicts — it was refactored to satisfy a principle, not a pain. Net result: slower iteration, no measurable quality gain.

### Over-Applying OCP: Abstract Factories for Single Implementations

OCP is frequently over-applied when developers create abstract factories, strategy interfaces, or plugin systems before there is more than one concrete implementation. The abstraction carries a real cost: callers cannot easily trace execution ("Go to definition" leads to an interface, not code), onboarding new developers requires understanding the layer, and the supposed "extension point" often never gets a second implementation.

Rule of thumb: wait for the *second* concrete implementation before introducing an interface for OCP purposes. The first tells you nothing about what varies; the second reveals the stable contract.

### ISP Gone Wrong: Forty Micro-Interfaces

ISP taken to its logical extreme produces a one-method interface for every caller. A `UserService` that has methods `createUser`, `updateUser`, `deleteUser`, `findUserById`, `findUserByEmail`, and `listUsers` could theoretically be split into `IUserCreator`, `IUserUpdater`, `IUserDeleter`, `IUserFinder`, `IUserEmailFinder`, `IUserLister`. In practice:

- The split provides no real isolation benefit (all six are in the same class anyway)
- Naming becomes strained and loses meaning
- A developer reading a method signature taking `IUserFinder` must look elsewhere to understand what object they're holding
- Code review reveals the abstraction is never tested independently

The anti-pattern is common in Java and C# codebases where interface extraction is trivially IDE-automated. Automation doesn't mean the result is useful.

### DIP Over-Applied: Everything Abstracted, Nothing Discoverable

Full DIP saturation — every class depends only on interfaces, every interface registered in an IoC container, no concrete type mentioned anywhere in business code — produces codebases that are nearly impossible to navigate. The dependency graph lives in the container configuration, not in the code. When something breaks, the call stack shows interface types, not implementations. Onboarding time increases substantially.

Ask: does this dependency ever need to be swapped for testing or production variation? If the answer is "no," inject the concrete type directly. Configuration classes, value objects, and pure domain entities rarely need to be abstracted.

### Performance-Critical Code

SRP often advocates breaking computation into separate coordinating objects. In hot paths (tight loops, parsers, serializers), the cost of object allocation, virtual dispatch, and method call overhead is real. A well-named, moderately-sized class that fuses two responsibilities for performance reasons is better than dogmatic separation that degrades throughput by 30%.

### Scripts, CLI Tools, and Infrastructure Code

Bash, Python scripts, Terraform modules, Ansible playbooks — these don't benefit from OO principles. Attempts to impose SOLID on Terraform module composition, for instance, create artificial layering that obscures what infrastructure actually exists.

---

## How It Works

### SRP: Responsibility = Reason to Change

The common misreading of SRP is "does one thing." Robert Martin's precise formulation is: *a class should have only one reason to change*, where "reason" maps to an *actor* — a person or group whose needs drive modification.

Consider an `Employee` class that calculates pay, reports hours to HR, and saves itself to the database. Three actors: finance calculates pay, HR defines hour-reporting rules, DBA controls the schema. If finance changes the pay algorithm, the class is modified. If the DBA changes the schema, the same class is modified. The risk of one change accidentally breaking another concern is what SRP prevents.

**Actor-based cohesion** is the guiding test: ask "who will ask me to change this?" If the answer is more than one distinct stakeholder group, the class has too many responsibilities.

The practical smell is the God Class: a class named `OrderManager`, `UserService`, or `ApplicationController` that steadily accumulates methods as features are added. Indicators:
- The class has more than ~10-15 public methods
- Its import/dependency list spans unrelated domains (email + database + formatting)
- It cannot be named without using "and" or "manager"
- It is a merge conflict hotspot in git history

Refactoring path: identify the distinct "actors" driving the class → extract one class per actor → let the original class optionally become a thin facade if callers need a unified entry point.

### OCP: Extension via Composition and Polymorphism

The key insight is that stable abstractions are *frozen*. Once you ship a public API or mark an interface as part of your contract, modifying it breaks callers. OCP says: design so that new behaviors are additive, not substitutive.

**Plugin points** are the mechanism: an interface defines the contract, the main system depends on the interface, and new behaviors are added by implementing the interface. Django's middleware stack is exactly this — a list of callables wrapping the request/response cycle, each added without modifying the framework. Spring's `ApplicationListener` and `BeanPostProcessor` extension points follow the same pattern.

The OCP also governs what NOT to do: do not add a `type` field to a class and then switch on it in methods. Each new type forces modification of every switch statement. Use polymorphism instead.

**Two versions of OCP:**
- *Meyer OCP* (1988): use inheritance; subclasses extend behavior
- *Polymorphic OCP* (1990s, Martin): use abstract interfaces; implementations are substitutable

The polymorphic version is more flexible and is what most practitioners mean today.

### LSP: Behavioral Subtyping

LSP is the principle that makes polymorphism *trustworthy*. The formal rules:

1. **Preconditions cannot be strengthened** in a subtype. If the base type accepts a null argument, the subtype must too.
2. **Postconditions cannot be weakened** in a subtype. If the base type guarantees a non-null return, the subtype must guarantee the same.
3. **Invariants must be preserved.** Properties that hold for the base type must hold for the subtype.
4. **No new exceptions** that are not subtypes of exceptions thrown by the base type.
5. **Covariance of return types** is allowed; contravariance of parameter types is allowed.

**The Rectangle/Square problem** is the canonical violation: mathematically, a square IS-A rectangle, so it seems natural to inherit. But `Rectangle` has the behavioral contract "setting width does not affect height." A `Square` cannot honor this — setting width *must* affect height to remain a square. Any code that uses `Rectangle` polymorphically and assumes independent dimensions will break when handed a `Square`. The mathematical IS-A relationship does not match the behavioral contract.

The fix: model both as `Shape` subtypes with an `area()` method, without the dependent-dimension contract. Behavioral contracts, not class diagrams, drive the hierarchy.

**Real-world violations:**
- Java's `Stack` extends `Vector`: `Stack` should not expose arbitrary-index insertion, but it inherits these methods from `Vector`, violating the stack invariant
- .NET `ReadOnlyCollection` implementing `ICollection<T>` with a mutating `Add` that throws `NotSupportedException` — callers of `ICollection<T>` cannot rely on `Add` being safe
- Payment gateway subclasses that throw exceptions for cases where the base class contract specifies a return value

### ISP: Role Interfaces vs Fat Interfaces

The distinction between a *fat interface* and a *role interface* is the key:

- **Fat interface**: `IAnimal { void eat(); void sleep(); void fly(); void swim(); }` — all animals must implement all methods, most of which are irrelevant
- **Role interface**: `IFlyable { void fly(); }`, `ISwimmable { void swim(); }` — each client depends only on the capability it needs

The practical payoff is in testing: a class that depends on `IFlyable` can be tested with a mock that implements only `fly()`. A class that depends on a 20-method fat interface needs a mock (or a test double) with 20 stub methods, most of which do nothing.

ISP is also the principle behind Go's structural interfaces (implicit satisfaction) and Rust's traits. These language designs embody ISP architecturally.

**The boundary condition:** ISP says segregate by client need, not by method count. If a client genuinely uses 12 methods together, those 12 methods belong on one interface. The principle is about reducing unnecessary coupling, not minimizing interface size.

### DIP: Depend on Abstractions

DIP has two parts:

1. High-level modules define the abstractions they need (not the other way around)
2. Low-level modules implement those abstractions

This means the *domain layer* owns its interfaces. `OrderService` defines `IOrderRepository`; the infrastructure layer provides `PostgresOrderRepository implements IOrderRepository`. The arrow of dependency points inward toward the domain — this is the foundational rule of Hexagonal/Clean Architecture.

**IoC containers** automate the wiring: instead of manually constructing `new OrderService(new PostgresOrderRepository(...))`, you register both in a container and let it resolve the dependency graph. Spring, .NET's built-in DI, tsyringe (TypeScript), and Python's `dependency-injector` library all work this way.

The risk: with full IoC, concrete implementations disappear from the code. The container configuration becomes a second codebase that must be maintained, understood, and debugged separately.

### How the Principles Interact and Conflict

SOLID is not five independent rules; the principles reinforce each other:

- SRP produces small, focused classes → ISP is easier to apply to them
- ISP produces focused interfaces → DIP is more useful (smaller contracts to depend on)
- DIP separates construction from use → OCP is easier (swap implementations without touching callers)
- LSP constrains what inheritance can do → OCP's use of inheritance stays safe

**Conflicts:**

- **SRP vs cohesion**: pulling responsibilities apart sometimes severs data and behavior that belong together. A tightly coupled data+behavior pair split by SRP creates an anemic domain model with disconnected logic.
- **SRP vs performance**: fusing responsibilities is sometimes necessary for cache locality and throughput. The tight loop that does two things for performance reasons is not a SRP violation worth fixing.
- **OCP vs discoverability**: extension points behind interfaces reduce the ability to follow execution with static analysis or IDE navigation.
- **DIP vs simplicity**: full DI saturation makes simple programs feel like enterprise infrastructure. For programs with no meaningful collaborator variation, DIP adds noise without signal.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---|---|
| Unit testability — inject mocks at any seam | Indirection — "Go to definition" leads to an interface |
| Changeability — add features without touching stable code | File count — more classes, more files, more navigation |
| Separation of concerns — business logic independent of infrastructure | Cognitive overhead — need to understand the full wiring before tracing any behavior |
| Reduced merge conflicts — smaller, focused files change less often | Boilerplate — interfaces + implementations + registrations for every dependency |
| Easier onboarding to a *specific module* | Harder onboarding to the *system as a whole* |
| Swappable implementations — test/production/staging differences handled cleanly | Container complexity — IoC configuration as a second source of truth |
| Explicit dependencies — constructor signatures document what a class needs | Verbose constructors — classes with 6+ injected dependencies are a smell themselves |
| Enforced boundaries — architectural rules can be checked statically (ArchUnit) | Premature generalization risk — abstractions for futures that never arrive |
| Reduced coupling — changes in infrastructure don't ripple into domain | Over-abstraction risk — dead interfaces with one implementation forever |

---

## Evolution Path

Do not apply all five principles from day one. This produces speculative complexity. Instead, follow the pain:

**Phase 1 — Start simple (0–3 months, <5K LOC)**
Write direct, concrete code. Name classes after what they do, not abstract roles. Accept that some classes will grow. Do not introduce interfaces that have no second implementation.

**Phase 2 — Identify pain points (first friction)**
Track which classes cause the most friction: untestable code, merge conflicts, "I changed one thing and something else broke." These are the targets.

**Phase 3 — Apply targeted principles**

- *God class causing merge conflicts?* → Apply SRP: identify actors, extract one class per actor.
- *Tests require a real database or HTTP client?* → Apply DIP: extract an interface for the infrastructure dependency, inject it.
- *Adding a new payment gateway / notification channel / export format requires editing 6 files?* → Apply OCP: identify the variation point, introduce an interface, register implementations.
- *Test setup requires constructing a 20-method mock for a 3-method need?* → Apply ISP: split the fat interface by client need.
- *Polymorphic code throwing unexpected exceptions at runtime?* → Audit LSP: verify subtype behavioral contracts.

**Phase 4 — Enforce boundaries (>50K LOC, >5 developers)**
At scale, individuals making local decisions can erode architecture. Introduce static enforcement:

- ArchUnit (Java) or NDepend (.NET): write rules like "classes in `domain.*` must not depend on classes in `infrastructure.*`"
- ESLint custom rules (TypeScript): forbid direct imports across layer boundaries
- CI gate: fail builds on architectural violations

**Refactoring order matters:**
SRP first (reduces class size and scope) → DIP second (makes the now-smaller classes testable) → OCP third (introduces extension points where variation is proven, not speculative) → ISP as you discover fat interfaces → LSP as you introduce inheritance.

---

## Failure Modes

### Abstraction Hell
Every class has a corresponding interface that is never implemented by more than one concrete class. The codebase has 300 interfaces and 300 matching implementations. New developers spend their first week learning the wiring before they can trace a single request. Symptoms: `IFooService`, `FooServiceImpl`, `FooServiceFactory`, `AbstractFooService` all for the same concept.

### Interface Explosion (ISP Over-Application)
Segregating by every conceivable caller produces interfaces with a single method and meaningless names (`IUserCreatable`, `IUserUpdatable`). The naming burden alone is a signal: if you cannot give the interface a meaningful noun-based name (like `Repository`, `EventPublisher`, `Clock`), it probably should not exist as a separate interface.

### Premature Generalization (OCP Abuse)
Introducing abstract strategies and factory hierarchies before the second concrete implementation. Classic example: `AbstractReportGenerator` with `PdfReportGenerator` and `ExcelReportGenerator` written simultaneously — before the PDF version is even shipped. The "flexibility" was never exercised; the abstraction added 4 files and an indirection layer for zero benefit.

### Dead Interfaces (One Implementation Forever)
An interface that has existed for 3 years with exactly one implementation. The interface adds indirection without enabling any of the benefits it was created for. In practice, many DIP-driven interfaces in enterprise codebases are never swapped. Ask in code review: "Will this abstraction ever have a second implementation?" If the answer is "no, but it makes it testable" — prefer a test double or test subclass over a permanent interface.

### Testing the Framework, Not the Logic
With full DI container wiring, integration tests often end up verifying that the container wires things correctly, not that the business logic is correct. The tests become infrastructure tests masquerading as unit tests. SRP and DIP should make unit tests *simpler*, not more coupled to container configuration.

### Anemic Domain Model (SRP + DIP Misapplication)
Extracting too much behavior out of domain objects (in the name of SRP) and inverting every dependency (in the name of DIP) can produce domain objects that are just data bags with no behavior, while all logic lives in sprawling service classes. This is the opposite of rich domain models and loses the encapsulation benefit that OO design offers.

### Real Incident — The 40-Class Microservice
A team refactored a 600-line service into 40 classes, each passing SOLID review. Consequence: a single business feature change required touching 12 files, PRs became impossible to review in one sitting, and two bugs were introduced in the wiring logic. The team reverted to a 4-class design after a post-mortem. The lesson: the number of classes is not a quality metric. Focused cohesion is.

---

## Technology Landscape

### Dependency Injection Containers

| Language | Container | Notes |
|---|---|---|
| Java | Spring Framework | Industry standard; XML, annotation, or Java config; full IoC |
| Java | Google Guice | Annotation-driven; lighter than Spring; popular for non-web code |
| C# / .NET | Microsoft.Extensions.DependencyInjection | Built into ASP.NET Core; minimal, fast |
| C# / .NET | Autofac | Richer feature set; convention-based registration |
| TypeScript | tsyringe (Microsoft) | Decorator-based; lightweight; popular with NestJS-adjacent code |
| TypeScript | InversifyJS | Full-featured; reflects decorators; closest to Spring in TS |
| TypeScript | NestJS built-in | Opinionated, module-scoped DI built into the framework |
| Python | dependency-injector | Declarative containers; Singleton/Factory/Resource providers |
| Python | injector | Guice-inspired; type annotation driven |
| Python | FastAPI built-in | `Depends()` mechanism; functional DI without a container |
| Go | wire (Google) | Compile-time DI via code generation; no runtime container |
| Rust | N/A | Ownership model makes classical DI less necessary; trait objects serve the role |

### Static Analysis Tools for SOLID Violations

- **NDepend** (.NET): detects God classes, cyclic dependencies, afferent/efferent coupling, ISP violations via method usage analysis
- **ArchUnit** (Java/Kotlin): assertion library for architectural rules — "domain classes must not import infrastructure packages"
- **Checkstyle / PMD** (Java): class size, method count, coupling metrics
- **SonarQube**: cross-language; cognitive complexity, coupling metrics, duplicate code detection
- **ESLint with import plugin** (TypeScript/JS): enforce import boundary rules across layers
- **Pylint** (Python): method count, class coupling, complexity metrics
- **Resharper** (C#): real-time SOLID hints, extract interface refactoring

### Framework Patterns That Embody SOLID

- **Django middleware** (OCP): callables in a list, each wrapping request/response, added without modifying the framework
- **Spring @Bean + @Autowired** (DIP): declare dependencies as interfaces; Spring resolves them
- **ASP.NET Core Middleware** (OCP + SRP): each middleware handles one concern, chained via `app.Use()`
- **Express.js middleware** (OCP + SRP): same pattern in Node.js
- **Java Servlet Filters** (OCP): pluggable processing without modifying the servlet
- **pytest fixtures** (DIP): test dependencies declared and injected by the test framework

---

## Decision Tree

Use this tree to decide whether — and which — SOLID principles to apply.

```
Is this a script, data pipeline, or throwaway prototype?
  YES → Apply SOLID sparingly or not at all. Favor KISS.
  NO ↓

Is the codebase purely functional (no OO classes)?
  YES → SOLID vocabulary doesn't directly apply. Consider functional equivalents (modules as SRP units, higher-order functions as OCP).
  NO ↓

Team size < 5 AND expected project lifespan < 1 year?
  YES → Apply SRP only if God classes are already causing friction. Skip OCP, ISP, DIP unless specific pain demands them.
  NO ↓

Is there testing pain (tests require real infrastructure, test setup is complex)?
  YES → Apply DIP immediately. Extract interfaces for infrastructure dependencies. Stop here; don't apply others speculatively.
  NO ↓

Are there God classes (>10 dependencies, merge conflict hotspot, unnameable without "and")?
  YES → Apply SRP. Identify actors, extract focused classes. Reassess after.
  NO ↓

Is adding a new variant (payment type, export format, notification channel) requiring changes to existing code?
  YES → Apply OCP. Introduce an interface at the variation point. Add implementations without modifying callers.
  NO ↓

Are tests for a class requiring large mock objects (5+ stubbed methods that are never called)?
  YES → Apply ISP. Split the fat interface by client need.
  NO ↓

Is a polymorphic substitution producing unexpected runtime behavior or exceptions?
  YES → Audit LSP. Verify subtype behavioral contracts. Restructure the hierarchy if needed.
  NO ↓

Codebase > 50K LOC AND > 5 developers?
  YES → Enforce SRP and DIP at minimum via static analysis (ArchUnit / NDepend / ESLint rules).
  NO → Continue as-is. Revisit when pain points emerge.
```

**Per-principle quick triggers:**

| Principle | Apply when | Do NOT apply when |
|---|---|---|
| SRP | Class is a merge conflict hotspot; has >10 dependencies; cannot be named without "and" | Class is small and stable; splitting would create only 1-method classes |
| OCP | Second concrete implementation of a variation exists or is imminently required | Only one implementation exists or will ever exist |
| LSP | Building an inheritance hierarchy; using polymorphic collections | No inheritance involved; composition is used throughout |
| ISP | Test setup requires mocking many unused methods; fat interface serves 3+ distinct callers | Interface has <5 methods used consistently by all callers |
| DIP | Infrastructure (DB, HTTP, filesystem) is leaking into domain logic; unit tests are hard | Dependency has no meaningful variation; concrete injection is simpler and testable enough |

---

## Implementation Sketch

### SRP: Splitting a God Class

**Before** — `OrderService` serves three actors: billing, fulfillment, notifications:

```python
class OrderService:
    def calculate_total(self, order): ...      # billing
    def apply_discount(self, order, code): ... # billing
    def ship_order(self, order): ...           # fulfillment
    def update_inventory(self, order): ...     # fulfillment
    def send_confirmation_email(self, order): ... # notifications
    def send_shipping_notification(self, order): ... # notifications
    def save_order(self, order): ...           # persistence
    def find_order(self, order_id): ...        # persistence
```

**After** — one class per actor:

```python
class OrderPricingService:
    def calculate_total(self, order): ...
    def apply_discount(self, order, code): ...

class OrderFulfillmentService:
    def ship_order(self, order): ...
    def update_inventory(self, order): ...

class OrderNotificationService:
    def send_confirmation(self, order): ...
    def send_shipping_update(self, order): ...

class OrderRepository:
    def save(self, order): ...
    def find_by_id(self, order_id): ...
```

Each class has one actor driving its changes. The `OrderRepository` change trigger is the DBA; `OrderPricingService` is finance; `OrderNotificationService` is the marketing/comms team.

---

### DIP: Dependency Injection Setup

**Before** — business logic creates its own infrastructure:

```typescript
class OrderService {
  private db = new PostgresDatabase();          // hard dependency
  private emailer = new SendGridEmailClient();  // hard dependency

  async placeOrder(order: Order): Promise<void> {
    await this.db.save(order);
    await this.emailer.send(order.customerEmail, 'Order confirmed');
  }
}
```

**After** — depend on abstractions, inject concrete implementations:

```typescript
interface OrderRepository {
  save(order: Order): Promise<void>;
}

interface EmailClient {
  send(to: string, subject: string): Promise<void>;
}

class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly emailer: EmailClient,
  ) {}

  async placeOrder(order: Order): Promise<void> {
    await this.repo.save(order);
    await this.emailer.send(order.customerEmail, 'Order confirmed');
  }
}

// Production wiring (tsyringe / NestJS / manual)
const service = new OrderService(
  new PostgresOrderRepository(),
  new SendGridEmailClient(),
);

// Test wiring — no database, no real emails
const service = new OrderService(
  new InMemoryOrderRepository(),
  new FakeEmailClient(),
);
```

---

### ISP: Role Interface Instead of Fat Interface

**Before** — all notification clients must implement all methods:

```java
interface NotificationService {
    void sendEmail(String to, String body);
    void sendSMS(String number, String body);
    void sendPushNotification(String deviceId, String body);
    void sendSlackMessage(String channel, String body);
}
// Implementors that only support email must stub the other three methods
```

**After** — client-specific role interfaces:

```java
interface EmailSender {
    void sendEmail(String to, String body);
}

interface SmsSender {
    void sendSMS(String number, String body);
}

interface PushSender {
    void sendPushNotification(String deviceId, String body);
}

// OrderService only needs email — depends only on EmailSender
class OrderService {
    OrderService(EmailSender emailer) { ... }
}

// A Twilio adapter implements both SMS and push, but not email
class TwilioAdapter implements SmsSender, PushSender { ... }
```

---

### OCP: Plugin Point for Extension

**Before** — adding a new report format requires modifying `ReportExporter`:

```python
class ReportExporter:
    def export(self, data, format: str):
        if format == 'pdf':
            # PDF logic
        elif format == 'csv':
            # CSV logic
        elif format == 'excel':
            # Excel logic
        # Every new format = modify this class
```

**After** — closed for modification, open for extension:

```python
from abc import ABC, abstractmethod

class ReportFormatter(ABC):
    @abstractmethod
    def format(self, data) -> bytes: ...

class PdfFormatter(ReportFormatter):
    def format(self, data) -> bytes: ...

class CsvFormatter(ReportFormatter):
    def format(self, data) -> bytes: ...

class ReportExporter:
    def __init__(self, formatter: ReportFormatter):
        self.formatter = formatter

    def export(self, data) -> bytes:
        return self.formatter.format(data)

# Adding Excel: write ExcelFormatter, register it. Touch nothing else.
class ExcelFormatter(ReportFormatter):
    def format(self, data) -> bytes: ...
```

---

### LSP: Fixing a Broken Hierarchy

**Violation** — `Square` cannot honor `Rectangle`'s behavioral contract:

```python
class Rectangle:
    def set_width(self, w): self.width = w
    def set_height(self, h): self.height = h
    def area(self): return self.width * self.height

class Square(Rectangle):
    def set_width(self, w):
        self.width = w
        self.height = w   # violates Rectangle's postcondition: height unchanged
    def set_height(self, h):
        self.width = h
        self.height = h   # same violation
```

**Fix** — common abstraction without the conflicting contract:

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height
    def area(self) -> float:
        return self.width * self.height

class Square(Shape):
    def __init__(self, side: float):
        self.side = side
    def area(self) -> float:
        return self.side ** 2
```

Both are substitutable anywhere `Shape` is expected. Neither violates the other's contract because the contract only requires `area()`.

---

## Cross-References

- **Separation of Concerns** (`separation-of-concerns`): SRP is the OO instantiation of SoC. The principles are complementary; SoC is the broader concept, SRP is the class-level application.
- **Coupling and Cohesion** (`coupling-and-cohesion`): SOLID's goal is low coupling (DIP, ISP) and high cohesion (SRP). Understanding coupling/cohesion metrics gives SOLID a measurable foundation.
- **Hexagonal / Clean Architecture** (`hexagonal-clean-architecture`): DIP is the mechanical foundation of Hexagonal Architecture. Ports are the interfaces (owned by the domain); adapters are the concrete implementations (infrastructure layer). Clean Architecture's dependency rule — "source code dependencies point inward" — is DIP applied at the architectural scale.
- **Domain-Driven Design** (`domain-driven-design`): DDD's rich domain model can conflict with SRP's impulse to extract behavior. DDD's Aggregate pattern, bounded contexts, and entities embody cohesion in ways that SRP must not fragment. Understand this tension before applying SRP to domain objects.

---

*Researched: 2026-03-08 | Sources: [Baeldung SOLID Guide](https://www.baeldung.com/solid-principles) | [LogRocket SRP](https://blog.logrocket.com/single-responsibility-principle-srp/) | [LogRocket LSP](https://blog.logrocket.com/liskov-substitution-principle-lsp/) | [LogRocket ISP](https://blog.logrocket.com/interface-segregation-principle-isp/) | [LogRocket OCP](https://blog.logrocket.com/solid-open-closed-principle/) | [Baeldung — When to Avoid SOLID](https://www.baeldung.com/cs/solid-principles-avoid) | [Ted Kaminski — Deconstructing SOLID](https://www.tedinski.com/2019/04/02/solid-critique.html) | [ISP as Antipattern — naildrivin5](https://naildrivin5.com/blog/2019/11/21/interface-segreation-principle-is-unhelpful-but-inoffensive.html) | [SOLID as Antipattern — spinthemoose](https://blog.spinthemoose.com/2012/12/17/solid-as-an-antipattern/) | [John Ousterhout vs Robert Martin discussion](https://github.com/johnousterhout/aposd-vs-clean-code) | [Python Dependency Injector](https://python-dependency-injector.ets-labs.org/) | [tsyringe advantages](https://pandaquests.medium.com/advantages-of-tsyringe-to-ordinary-dependency-injection-f68f4e597329) | [Rectangle-Square LSP](https://medium.com/@alex24dutertre/square-rectangle-and-the-liskov-substitution-principle-ee1eb8433106) | [SOLID KISS YAGNI tradeoffs — idatamax](https://idatamax.com/blog/engineering-with-solid-dry-kiss-yagni-and-grasp)*
