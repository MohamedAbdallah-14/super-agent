# Coupling and Cohesion -- Architecture Expertise Module

> Coupling measures the degree of interdependence between software modules; cohesion measures
> how strongly the elements within a single module belong together. Together they form the
> oldest and most empirically validated heuristic in software design: strive for low coupling
> between modules and high cohesion within them.

> **Category:** Foundation
> **Complexity:** Moderate
> **Applies when:** You are defining module boundaries, designing APIs, splitting or merging services, or evaluating whether a codebase is healthy enough to evolve safely.

---

## What This Is (and What It Isn't)

### Definitions

**Coupling** is the degree to which one module depends on the internals, behavior, or
identity of another module. High coupling means a change in module A forces a change in
module B. Low coupling means modules can evolve, deploy, and be tested independently.

**Cohesion** is the degree to which the elements inside a single module (functions, data
structures, classes) are related and work toward a single, well-defined responsibility.
High cohesion means everything in the module belongs together. Low cohesion means the
module is a grab-bag of unrelated concerns.

Larry Constantine and Edward Yourdon formalized these concepts in *Structured Design* (1979).
They remain the primary design-quality heuristics across paradigms: procedural, object-oriented,
functional, and service-oriented.

### Types of Coupling (Worst to Best)

The classical taxonomy orders coupling types from tightest (most harmful) to loosest (most
desirable):

| Type | Description | Example | Severity |
|------|-------------|---------|----------|
| **Content coupling** | Module A directly accesses or modifies the internals of module B (private fields, internal branches, memory locations). | A Ruby class reaching into another class via `instance_variable_get` to read a private field. | Critical |
| **Common coupling** | Multiple modules read/write the same global mutable state. | Two services writing to the same database table without coordination; multiple modules sharing a global config dictionary they all mutate. | High |
| **Control coupling** | Module A passes a flag or control parameter that tells module B *what to do* internally. | `render(data, format="pdf")` where the `format` flag controls branching inside `render`. | Moderate |
| **Stamp coupling** | Modules share a composite data structure but each uses only a subset of it. | Passing an entire `User` object to a function that only needs `user.email`. | Moderate |
| **Data coupling** | Modules communicate only through well-defined parameters, each of which is necessary. | `calculateTax(income, taxRate)` -- both parameters are needed, nothing extra is passed. | Low |
| **Message coupling** | Modules communicate only through messages (events, commands) with no knowledge of each other's identity. | An `OrderPlaced` event published to a message bus; any subscriber can react without the publisher knowing who they are. | Minimal |

### Types of Cohesion (Worst to Best)

| Type | Description | Example | Quality |
|------|-------------|---------|---------|
| **Coincidental** | Elements are grouped arbitrarily with no meaningful relationship. | A `Utilities` class containing `formatDate()`, `compressImage()`, and `sendEmail()`. | Worst |
| **Logical** | Elements perform similar *categories* of operations but are otherwise unrelated. | An `InputHandler` that reads from files, sockets, and stdin in the same module. | Poor |
| **Temporal** | Elements are grouped because they execute at the same time. | A `startup()` function that initializes the logger, opens the DB connection, and loads config. | Poor |
| **Procedural** | Elements are grouped because they follow a specific sequence of execution. | A module that validates input, then transforms it, then saves it, but these steps serve different business concerns. | Fair |
| **Communicational** | Elements operate on the same data or contribute to the same output. | A module that reads customer data, calculates their credit score, and generates a credit report -- all using the same customer record. | Good |
| **Sequential** | The output of one element is the input of the next, forming a data pipeline. | An ETL module where `extract()` feeds `transform()` feeds `load()`. | Good |
| **Functional** | Every element contributes to a single, well-defined task. Nothing is extraneous. | An `AuthenticationService` whose every method relates to authenticating users: `login()`, `logout()`, `verifyToken()`, `refreshToken()`. | Best |

### What It Is NOT

- **Not a binary choice.** Coupling is a spectrum, not a switch. The goal is not zero coupling
  (that would mean modules never communicate) but *appropriate* coupling at the *right level*
  of abstraction.
- **Not about the number of dependencies.** A module with 20 dependencies via narrow,
  stable interfaces can be less coupled than a module with 2 dependencies via wide, volatile
  internal APIs.
- **Not the same as DRY.** Eliminating duplication by sharing code can *increase* coupling.
  Sometimes duplicating a small piece of logic across two modules is healthier than creating
  a shared dependency between them (see "When NOT to Use It").
- **Not only about code.** Coupling exists in deployment pipelines, database schemas, team
  structures (Conway's Law), and even release schedules. Cohesion applies to teams, APIs,
  and data models, not just classes.

### Connascence: The Modern Refinement

Meilir Page-Jones extended the coupling concept with **connascence** -- a more granular
framework for classifying dependencies. Connascence evaluates three dimensions:

- **Strength:** How difficult is the dependency to refactor? (Name < Type < Meaning < Position < Algorithm < Execution < Timing < Value < Identity)
- **Locality:** How close are the coupled components in the codebase?
- **Degree:** How many components are affected?

The rule of thumb: prefer *weaker* connascence, keep *strong* connascence *local*, and reduce
the *degree* of any connascence. Connascence of Name (two modules agree on a function name)
is far cheaper than Connascence of Timing (two modules must execute in a precise temporal order).

---

## When to Use It

Coupling and cohesion analysis is not situational -- it applies to every design decision. But
certain scenarios make it especially critical.

### 1. Service Boundary Definition

When decomposing a monolith or designing a new distributed system, coupling analysis determines
whether two capabilities should live in the same service or separate services.

**Evidence -- Netflix:** Netflix's migration from a monolithic Java application to 700+
microservices succeeded because each service was designed around a bounded context with its
own data store, eliminating shared database coupling. Each service manages its own data store,
so schema changes in the recommendation engine cannot break the billing service.

**Evidence -- Shopify:** Shopify chose a **modular monolith** over microservices specifically
because they determined that the coupling between their commerce components (catalog, checkout,
payments) was too high to justify network boundaries. Code handling different business processes
was reorganized into modules with enforced boundaries within a single deployable, avoiding
the latency and reliability costs of inter-service HTTP calls while still achieving logical
decoupling.

### 2. API and Interface Design

When designing public APIs, SDKs, or inter-module contracts, coupling analysis guides you
toward narrow, stable interfaces. The Interface Segregation Principle (ISP) is a direct
application: prefer many small, role-specific interfaces over one large general-purpose
interface.

**Evidence -- Stripe:** Stripe's API stability is legendary in the industry. They achieve
it through data coupling (pass only what is needed) and versioning that lets old consumers
keep working while new consumers get new capabilities. Their API never exposes internal
data structures (avoiding stamp coupling).

### 3. Database Schema Design

When multiple modules access the same database, coupling analysis determines whether tables
should be shared, replicated, or owned exclusively by one module.

**Evidence -- Capital One:** Capital One's engineering team documented that shared databases
are one of the most dangerous forms of coupling in microservices architectures. Their
recommendation: each service owns its data and exposes it only through APIs. Changes to one
service's schema cannot inadvertently break another service.

### 4. Team Topology and Organizational Design

Conway's Law states that system structure mirrors organizational structure. Coupling analysis
applied to team boundaries helps ensure that tightly coupled code is owned by the same team,
and loosely coupled code can be owned by independent teams.

**Evidence -- Spotify:** Spotify's squad-and-tribe model was designed so that each squad owned
a functionally cohesive service. However, over time, duplication of infrastructure and
inconsistency in developer experience created friction. Their solution was Backstage, an
internal developer portal that centralized service catalogs and documentation, providing a
shared platform layer (low coupling to individual squads, high cohesion within the platform).

### 5. Refactoring and Technical Debt Remediation

Coupling metrics (CBO, afferent/efferent coupling, LCOM4) are the primary indicators of
where refactoring will have the highest ROI. Modules with high coupling are the riskiest
to change and the most expensive to test.

**Evidence -- SonarQube/CodeScene studies:** Empirical studies across 13 open-source projects
found that bug-fix commits disproportionately touched high-coupling, low-cohesion modules.
The correlation between CBO (Coupling Between Objects) values above 14 and defect density
was statistically significant across all studied projects.

---

## When NOT to Use It

The pursuit of loose coupling can become a pathology of its own. Here are the cases where
decoupling is the wrong move.

### 1. Over-Decoupling: The Distributed Monolith

When teams decompose a system into too many services with too-fine boundaries, they replace
in-process function calls with network calls -- gaining all the failure modes of distributed
systems (latency, partial failure, serialization overhead) while retaining the coupling they
were trying to escape.

**Evidence -- Amazon Prime Video (2023):** Amazon's Prime Video team had built their
audio/video monitoring service as a distributed system using AWS Step Functions. The
components were architecturally decoupled but *operationally* coupled: the media converter
and defect detector had to exchange large volumes of data through S3. Moving to a single
process (monolith) reduced infrastructure costs by over 90% because in-process communication
eliminated the serialization, network transfer, and storage costs. The components were
inherently tightly coupled by data flow; forcing them apart created overhead without
independence.

### 2. The Nano-Service Anti-Pattern

Splitting a system into hundreds of tiny services where each encapsulates only a trivial
piece of functionality destroys cohesion at the service level while creating a web of
inter-service dependencies.

**Anti-pattern indicators:**
- Services with fewer than 3 API endpoints
- Services that cannot be tested without mocking 5+ other services
- A single user-facing operation requires orchestrating 10+ service calls
- Teams spend more time on inter-service coordination than on business logic

**Evidence -- Industry surveys:** The DesignGurus analysis of microservice anti-patterns found
that over-fragmented systems experience exponential growth in operational complexity:
orchestration, distributed transactions, service discovery, circuit breaking, and distributed
tracing all become mandatory infrastructure for trivially simple business operations.

### 3. Premature Abstraction for "Future Flexibility"

Introducing interfaces, abstract factories, dependency injection containers, and event buses
*before* there is a demonstrated need creates accidental complexity. Each abstraction layer is
a form of indirection that makes the code harder to trace, debug, and understand.

**Rule of thumb (Rule of Three):** Do not abstract until you have at least three concrete
implementations. Until then, the direct dependency is simpler and cheaper.

**Evidence:** Martin Fowler's guidance: "When you get a new requirement that applies to
only some of the existing code, duplication is cheaper than the wrong abstraction." Sandi
Metz formalized this as "duplication is far cheaper than the wrong abstraction" (2014).

### 4. When Performance Requires Tight Coupling

In-process function calls are 1,000x to 1,000,000x faster than cross-network calls. For
latency-sensitive paths (real-time rendering, high-frequency trading, game loops, ML inference
pipelines), decoupling across process or network boundaries is unacceptable.

**Evidence -- High-Performance Computing (AWS):** AWS's Well-Architected Framework explicitly
distinguishes tightly coupled HPC workloads (molecular dynamics, weather simulation, CFD)
that require shared-memory or high-speed interconnects from loosely coupled workloads
(parameter sweeps, Monte Carlo simulations) that can use message queues. Choosing the wrong
coupling model for HPC can degrade performance by orders of magnitude.

### 5. When DRY Creates Coupling

Extracting shared libraries to avoid code duplication between services creates a deployment
coupling: every service using the shared library must be updated, tested, and redeployed
when the library changes. This is especially dangerous for cross-cutting concerns like
serialization formats or data models.

**Evidence -- The "I Was Taught to Share" anti-pattern:** In microservices, sharing a common
library for domain models means that a change to the shared model requires coordinated
deployment of every consumer. The recommendation: duplicate the model in each service and
let each service's model evolve independently, using anti-corruption layers at the boundaries.

### 6. When Coupling Aligns with Team Structure

If a single team owns two modules that are naturally tightly coupled, forcing them apart into
separate services adds coordination overhead (API versioning, network reliability, separate
deployment pipelines) without organizational benefit. The coupling is managed implicitly by
the team's shared context.

---

## How It Works

### Measuring Coupling

**Afferent Coupling (Ca):** The number of modules that depend *on* this module. High Ca
means the module is heavily used -- changes are risky because many consumers will be affected.

**Efferent Coupling (Ce):** The number of modules that this module depends *on*. High Ce
means the module has many dependencies -- it is fragile because changes in any dependency
can break it.

**Instability (I):** `I = Ce / (Ca + Ce)`. Ranges from 0 (maximally stable, many dependents,
few dependencies) to 1 (maximally unstable, few dependents, many dependencies). Robert C.
Martin's Stable Dependencies Principle says: depend in the direction of stability. Unstable
modules should depend on stable modules, not the reverse.

**Coupling Between Objects (CBO):** For OO systems, CBO counts the number of classes to
which a given class is coupled. SonarQube flags classes with CBO > 14 as high-risk.

**Distance from Main Sequence (D):** `D = |A + I - 1|` where A = abstractness (ratio of
abstract classes to total classes in a package). Packages near D=0 are in the "sweet spot";
packages near D=1 are in the "zone of pain" (too concrete and too stable) or the "zone of
uselessness" (too abstract and too unstable).

### Measuring Cohesion

**LCOM (Lack of Cohesion of Methods):** Several variants exist. LCOM4 builds a graph where
nodes are methods and edges connect methods that share instance variables. The number of
connected components is the LCOM4 value. LCOM4 = 1 means perfect cohesion; LCOM4 > 1 means
the class should probably be split into that many classes.

**Relational Cohesion (H):** `H = (R + 1) / N` where R = number of internal relationships
and N = number of types in the module. Values between 1.5 and 4.0 are considered healthy.

### Tools for Measurement

| Tool | Language Support | Key Metrics |
|------|-----------------|-------------|
| **SonarQube** | 30+ languages | CBO, LCOM, afferent/efferent coupling, cyclomatic complexity |
| **NDepend** | .NET | Instability, abstractness, distance from main sequence, coupling graph |
| **CodeScene** | Language-agnostic (git-based) | Temporal coupling (files that change together), hotspot analysis |
| **JDepend / JArchitect** | Java | Package-level coupling, dependency cycles |
| **Structure101** | Java, .NET, C++ | Architecture-level coupling, layering violations |
| **deptrac** | PHP | Layer and class coupling enforcement |
| **Madge** | JavaScript/TypeScript | Module dependency graphs, circular dependency detection |

### Interface Design Techniques for Loose Coupling

1. **Dependency Inversion Principle (DIP):** High-level modules depend on abstractions, not
   concrete implementations. This is the single most effective technique for reducing coupling
   in OO systems. Introduce an interface at the boundary; let both sides depend on the
   interface rather than on each other.

2. **Event-Driven Architecture:** Replace synchronous call chains with asynchronous events.
   The publisher does not know who subscribes. This converts control/stamp coupling into
   message coupling.

3. **Anti-Corruption Layer (ACL):** When integrating with an external system whose API is
   volatile or poorly designed, wrap it in a translation layer. Changes to the external
   system are absorbed by the ACL, not propagated to your domain.

4. **API Gateway / Backend for Frontend (BFF):** In microservices, a gateway decouples
   clients from internal service topology. Clients couple to the gateway; the gateway
   couples to services. Adding or removing services does not change client code.

5. **Contract Testing:** Tools like Pact verify that the producer's API satisfies the
   consumer's expectations without requiring end-to-end integration tests. This reduces
   temporal coupling (you do not need both services running simultaneously to verify
   compatibility).

### Module Boundary Heuristics

- **Information Hiding (Parnas, 1972):** Each module hides a design decision that is likely
  to change. The interface exposes only what is stable.
- **Single Responsibility Principle:** A module should have one and only one reason to change.
  If it has two reasons, it has two responsibilities and should be two modules.
- **Common Closure Principle:** Classes that change together belong together. This is the
  package-level equivalent of SRP.
- **Common Reuse Principle:** Classes that are used together belong together. Do not force
  consumers to depend on things they do not use.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| Independent deployability of services | Network latency, serialization overhead, distributed failure modes |
| Independent team ownership | API versioning discipline, contract testing infrastructure |
| Technology heterogeneity (each service picks its own stack) | Operational complexity: multiple build systems, monitoring stacks, deployment pipelines |
| Isolated failure domains (one service crashes, others survive) | Distributed transaction complexity (sagas, eventual consistency) |
| Easier reasoning about individual modules | Harder reasoning about system-wide behavior and data consistency |
| Testability of individual modules in isolation | Integration test complexity; mocking explosion |
| Freedom to refactor internals without breaking consumers | Upfront cost of designing stable interfaces; risk of premature abstraction |
| Ability to scale services independently | Infrastructure overhead: container orchestration, service mesh, observability |
| Reduced blast radius of bugs | Increased surface area for integration bugs, data inconsistency |
| Higher cohesion within modules | Risk of duplicated logic across modules if taken too far |

---

## Evolution Path

### Stage 1: Monolith with No Boundaries
- Everything in one deployment unit
- Coupling is invisible -- any module can call any other module's internals
- Cohesion is accidental -- code is organized by technical layer (controllers, services, repos)
  rather than by business capability
- **Signal to move on:** Changes require touching 5+ files across unrelated features; test
  suite takes 30+ minutes; teams step on each other's code daily

### Stage 2: Modular Monolith
- Single deployment unit, but code is organized into modules with enforced boundaries
- Public API surfaces defined per module; private internals hidden behind access rules
- Database tables owned by modules (schema-level isolation or at least naming conventions)
- Shopify's architecture: modules enforced by custom linting rules in a single Rails app
- **Signal to move on:** Independent scaling requirements emerge; team count exceeds what
  a single repo and deployment pipeline can support (typically 8-15 teams)

### Stage 3: Macroservices / Coarse-Grained Services
- 5-15 services, each owning a major business domain (orders, inventory, users, payments)
- Async communication via events for most cross-service workflows
- Synchronous APIs only for real-time queries
- **Signal to move on:** Individual services become monoliths themselves; sub-domains within
  a service need independent scaling or deployment cadences

### Stage 4: Fine-Grained Microservices
- 50-500+ services, each owning a bounded context
- Full operational infrastructure: service mesh, distributed tracing, centralized logging,
  contract testing, saga orchestration
- Netflix, Uber, and Amazon operate at this level -- but with platform teams providing
  shared infrastructure to reduce per-service operational burden
- **Signal to reconsider:** Operational costs exceed feature-development costs; developer
  productivity drops because every feature requires coordinating across 10+ services

### Stage 5: Selective Re-Consolidation
- Merge tightly coupled fine-grained services back into coarser units where the coupling
  analysis warrants it
- Keep independent, high-scale services separate
- Amazon Prime Video's 2023 move is the canonical example of this stage
- **The mature insight:** The optimal architecture is not at either extreme; it is a
  heterogeneous mix of coupling levels chosen per-boundary based on data, not dogma

---

## Failure Modes

### 1. Distributed Monolith
**Symptoms:** All services must be deployed together; a change in one service requires
synchronized changes in 3+ other services; shared database with no schema ownership.
**Root cause:** Services were decomposed along technical layers (API service, business logic
service, data service) instead of business capabilities. The coupling was never addressed --
it was just made more expensive by adding network hops.
**Fix:** Re-analyze bounded contexts using domain-driven design; merge services that share
a domain; introduce anti-corruption layers at true domain boundaries.

### 2. God Module / God Class
**Symptoms:** One module has CBO > 30 and LCOM4 > 5; it contains 3,000+ lines; every feature
branch touches it; merge conflicts are daily.
**Root cause:** Insufficient attention to SRP; the module accumulated responsibilities over
years of "just add it here, it's easiest."
**Fix:** Identify responsibility clusters using LCOM4 analysis; extract each cluster into its
own module; define narrow interfaces between them.

### 3. Leaky Abstraction
**Symptoms:** Consumers of a module depend on its implementation details (specific exception
types, internal data formats, execution order). Changes to internals break consumers.
**Root cause:** The interface was designed by exposing existing internals rather than by
modeling the consumer's needs.
**Fix:** Redesign the interface from the consumer's perspective (consumer-driven contracts);
introduce an ACL if the internal model must differ from the public contract.

### 4. Coupling Through Data
**Symptoms:** Two services use the same database table; changes to a column break the other
service; data consistency requires distributed locks.
**Root cause:** Data ownership was never defined; the database was treated as an integration
mechanism rather than as a private implementation detail.
**Fix:** Assign table ownership to one service; other services access that data through APIs
or event streams (CDC -- Change Data Capture).

### 5. Coupling Through Time (Temporal Coupling)
**Symptoms:** System behavior depends on the order in which services process events; race
conditions appear under load; initialization order matters.
**Root cause:** Implicit assumptions about execution timing; synchronous call chains that
create cascading timeouts.
**Fix:** Design for idempotency and out-of-order processing; use event sourcing with explicit
ordering guarantees where needed; replace synchronous chains with choreography.

### 6. Accidental Coupling Through Shared Libraries
**Symptoms:** Updating a shared library requires redeploying 15 services; version conflicts
create dependency hell; teams avoid updating the library because of blast radius.
**Root cause:** A shared library was used to enforce DRY across service boundaries, creating
deployment coupling.
**Fix:** Inline the shared code into each service (accept duplication); or extract the shared
functionality into a standalone service with a stable API.

### 7. Test Coupling
**Symptoms:** Unit tests require extensive mocking of collaborators; integration test
environments are unreliable; test suites take hours.
**Root cause:** Production code has high coupling, and tests mirror that coupling. Alternatively,
tests are coupled to implementation details rather than behavior.
**Fix:** Refactor production code to reduce coupling; adopt contract testing (Pact) to
decouple service-level tests; test behavior through public interfaces, not internal methods.

---

## Technology Landscape

### Languages and Frameworks Supporting Loose Coupling

| Technology | Coupling Mechanisms | Cohesion Support |
|------------|-------------------|------------------|
| **Java (Spring)** | DI container, interface-based wiring, Spring Events | Package-private access, module system (JPMS since Java 9) |
| **C# (.NET)** | DI container, interface segregation, MediatR for CQRS | Internal access modifier, assembly-level boundaries |
| **TypeScript/Node** | ES modules, dependency injection (NestJS, InversifyJS) | Barrel exports controlling public surface |
| **Go** | Implicit interfaces, package-level encapsulation | Internal packages (unexported by convention) |
| **Rust** | Traits, module visibility (`pub`, `pub(crate)`) | Crate boundaries, strong ownership model |
| **Python** | Duck typing, ABC, dependency injection (injector, dependency-injector) | `__all__` exports, package structure |
| **Elixir/Erlang** | Actor model (processes), behaviours, message passing | OTP applications as cohesive units |

### Infrastructure for Decoupling

| Category | Tools | Purpose |
|----------|-------|---------|
| **Message Brokers** | Kafka, RabbitMQ, NATS, AWS SNS/SQS, Google Pub/Sub | Async event-driven decoupling between services |
| **API Gateways** | Kong, Envoy, AWS API Gateway, Traefik | Decouple clients from service topology |
| **Service Mesh** | Istio, Linkerd, Consul Connect | Decouple networking concerns from application code |
| **Schema Registry** | Confluent Schema Registry, AWS Glue | Decouple producers from consumers via versioned schemas |
| **Contract Testing** | Pact, Spring Cloud Contract | Decouple service testing from integration environments |
| **Feature Flags** | LaunchDarkly, Unleash, Flagsmith | Decouple deployment from release (temporal decoupling) |
| **CDC (Change Data Capture)** | Debezium, AWS DMS | Decouple data consumers from database internals |

---

## Decision Tree

Use this decision tree when deciding how tightly or loosely to couple two components A and B.

```
START: Components A and B need to communicate.

1. Do A and B belong to the same bounded context / business capability?
   |
   +-- YES --> Do they share the same data model?
   |           |
   |           +-- YES --> Keep them in the same module/service.
   |           |           Use in-process function calls (data coupling).
   |           |           High cohesion achieved.
   |           |
   |           +-- NO  --> Separate modules within the same service.
   |                       Communicate via internal interfaces.
   |                       Consider: will they ever need independent scaling?
   |                       |
   |                       +-- YES --> Plan for future extraction; define clean API now.
   |                       +-- NO  --> Keep co-located; enforce module boundaries with
   |                                   access modifiers / linting.
   |
   +-- NO  --> 2. Do A and B need synchronous, real-time interaction?
               |
               +-- YES --> 3. Is the latency budget < 10ms?
               |           |
               |           +-- YES --> Keep in same process (tight coupling acceptable
               |           |           for performance). Use interfaces for testability.
               |           |
               |           +-- NO  --> Separate services with synchronous API.
               |                       Use contract testing. Define SLAs.
               |                       Consider circuit breakers for resilience.
               |
               +-- NO  --> 4. Can the interaction be eventually consistent?
                           |
                           +-- YES --> Use async events (message coupling).
                           |           Publisher emits domain events.
                           |           Subscriber reacts independently.
                           |           Loosest coupling achievable.
                           |
                           +-- NO  --> 5. Is strong consistency required across A and B?
                                       |
                                       +-- YES --> Consider:
                                       |           a) Merge A and B into one service
                                       |              (accept tight coupling to get ACID).
                                       |           b) Use Saga pattern (accept complexity
                                       |              to keep services separate).
                                       |           Choose (a) unless independent scaling
                                       |           or team ownership requires (b).
                                       |
                                       +-- NO  --> Re-examine requirements.
                                                   "Not eventually consistent but not
                                                   strongly consistent" usually means
                                                   the requirement is under-specified.
```

### Quick Coupling-Level Selector

| Situation | Recommended Coupling Level |
|-----------|--------------------------|
| Same team, same bounded context, same scaling needs | In-process (tight) |
| Same team, different bounded contexts | Module boundaries within monolith |
| Different teams, synchronous data needs | Service API with contract tests |
| Different teams, asynchronous workflows | Event-driven (message coupling) |
| Third-party integration | Anti-corruption layer + adapter pattern |
| Performance-critical inner loop | Direct coupling (no abstraction overhead) |
| Rapidly changing domain model | Duplicated models with ACL at boundary |

---

## Implementation Sketch

### Example: Refactoring from Common Coupling to Data Coupling

**Before (Common Coupling -- shared global state):**
```python
# Shared mutable global -- any module can read/write
app_state = {"user": None, "cart": [], "session_token": ""}

# Module A
def login(username, password):
    app_state["user"] = authenticate(username, password)
    app_state["session_token"] = generate_token()

# Module B
def add_to_cart(item):
    if not app_state["user"]:  # reads global state set by Module A
        raise AuthError("Not logged in")
    app_state["cart"].append(item)
```

**After (Data Coupling -- explicit parameters):**
```python
# Module A -- returns data, does not mutate globals
def login(username, password) -> Session:
    user = authenticate(username, password)
    token = generate_token(user)
    return Session(user=user, token=token)

# Module B -- receives only what it needs
def add_to_cart(cart: Cart, item: Item, user: User) -> Cart:
    if not user:
        raise AuthError("Not logged in")
    return cart.add(item)
```

### Example: Refactoring from Control Coupling to Polymorphism

**Before (Control Coupling -- flag parameter):**
```typescript
function exportReport(data: ReportData, format: "pdf" | "csv" | "html"): Buffer {
  if (format === "pdf") {
    return renderPdf(data);
  } else if (format === "csv") {
    return renderCsv(data);
  } else if (format === "html") {
    return renderHtml(data);
  }
}
```

**After (Data Coupling via Strategy pattern):**
```typescript
interface ReportRenderer {
  render(data: ReportData): Buffer;
}

class PdfRenderer implements ReportRenderer {
  render(data: ReportData): Buffer { /* ... */ }
}

class CsvRenderer implements ReportRenderer {
  render(data: ReportData): Buffer { /* ... */ }
}

function exportReport(data: ReportData, renderer: ReportRenderer): Buffer {
  return renderer.render(data);
}
```

### Example: Event-Driven Decoupling (Message Coupling)

**Before (Direct service-to-service call):**
```python
# OrderService directly calls InventoryService and NotificationService
class OrderService:
    def place_order(self, order):
        self.inventory_service.reserve(order.items)      # synchronous
        self.notification_service.send_confirmation(order) # synchronous
        self.analytics_service.track_order(order)          # synchronous
        return order
```

**After (Event-driven -- publisher knows nothing about subscribers):**
```python
class OrderService:
    def place_order(self, order):
        order.status = "placed"
        self.repository.save(order)
        self.event_bus.publish(OrderPlaced(
            order_id=order.id,
            items=order.items,
            customer_id=order.customer_id
        ))
        return order

# Separate services subscribe independently:
# InventoryService subscribes to OrderPlaced -> reserves stock
# NotificationService subscribes to OrderPlaced -> sends email
# AnalyticsService subscribes to OrderPlaced -> tracks metrics
# OrderService has zero knowledge of any of these subscribers.
```

### Example: Anti-Corruption Layer for External System

```python
# External payment provider with volatile, poorly-designed API
class LegacyPaymentGateway:
    def doPayment(self, amt, curr, crd_num, crd_exp, crd_cvv, merch_id, ...):
        # 15 positional parameters, changes every quarter
        ...

# Anti-Corruption Layer -- translates between your domain and the external API
class PaymentAdapter:
    def __init__(self, gateway: LegacyPaymentGateway):
        self._gateway = gateway

    def charge(self, payment: Payment) -> PaymentResult:
        """Clean interface your domain uses. Absorbs external API volatility."""
        raw_result = self._gateway.doPayment(
            amt=payment.amount.cents,
            curr=payment.amount.currency.value,
            crd_num=payment.card.number,
            crd_exp=payment.card.expiry.strftime("%m/%y"),
            crd_cvv=payment.card.cvv,
            merch_id=self._merchant_id,
            ...
        )
        return PaymentResult.from_raw(raw_result)
```

### Architecture Fitness Functions for Coupling

Automate coupling checks in CI/CD to prevent regression:

```yaml
# Example: ArchUnit test (Java) -- enforce layering rules
architecture_rules:
  - name: "No domain-to-infrastructure coupling"
    rule: "classes in package '..domain..' should not depend on '..infrastructure..'"

  - name: "No cross-module direct access"
    rule: "classes in package '..orders.internal..' should only be accessed by '..orders..'"

  - name: "Maximum CBO per class"
    threshold: 14
    tool: sonarqube

  - name: "No circular dependencies between packages"
    tool: jdepend
    assertion: "cycles == 0"

  - name: "LCOM4 per class"
    threshold: 1
    tool: sonarqube
    note: "LCOM4 > 1 suggests class should be split"
```

---

## Cross-References

- **[separation-of-concerns](../foundations/separation-of-concerns.md):** The philosophical
  foundation -- coupling/cohesion are the *measurable* manifestation of separation of concerns.
- **[microservices](../patterns/microservices.md):** Service boundaries are coupling boundaries;
  microservices trade in-process coupling for network-level coupling.
- **[modular-monolith](../patterns/modular-monolith.md):** Achieves logical decoupling without
  physical decoupling; Shopify's preferred approach for high-coupling domains.
- **[hexagonal-clean-architecture](../patterns/hexagonal-clean-architecture.md):** Ports and
  adapters enforce dependency inversion, ensuring domain logic has zero coupling to
  infrastructure.
- **[domain-driven-design](../patterns/domain-driven-design.md):** Bounded contexts are the
  primary tool for identifying natural low-coupling seams in a system.

---

## Key Takeaways

1. **Coupling is a spectrum, not a binary.** The goal is not zero coupling but *appropriate*
   coupling -- tight where performance or simplicity demands it, loose where independent
   evolution or team autonomy matters.

2. **Cohesion is the other half.** Low coupling without high cohesion produces scattered
   systems where related logic is spread across many modules. Always optimize both together.

3. **Measure, do not guess.** Tools like SonarQube, CodeScene, and NDepend provide objective
   coupling/cohesion metrics. Use them as fitness functions in CI/CD to prevent regression.

4. **The most expensive coupling is invisible.** Database coupling, temporal coupling, and
   deployment coupling are harder to detect than code-level coupling but cause more production
   incidents.

5. **Duplication is sometimes cheaper than coupling.** When two services share a data model
   via a library, they are deployment-coupled. Duplicating the model and translating at the
   boundary may be the healthier choice.

6. **Amazon Prime Video's lesson:** The right answer is sometimes *more* coupling, not less.
   When components share heavy data flows, putting them in the same process can reduce costs
   by 90% compared to distributing them.

7. **Conway's Law is real.** Coupling between code should mirror coupling between teams. If
   two teams must coordinate on every release, their code is effectively coupled regardless
   of what the architecture diagram says.

---

*Researched: 2026-03-08 | Sources:*
- *[Coupling (Wikipedia)](https://en.wikipedia.org/wiki/Coupling_(computer_programming))*
- *[GeeksforGeeks: Coupling and Cohesion](https://www.geeksforgeeks.org/software-engineering/software-engineering-coupling-and-cohesion/)*
- *[ByteByteGo: Coupling and Cohesion Principles](https://blog.bytebytego.com/p/coupling-and-cohesion-the-two-principles)*
- *[Wix Engineering: Low Coupling, High Cohesion](https://medium.com/wix-engineering/what-exactly-does-low-coupling-high-cohesion-mean-9259e8225372)*
- *[CodeOpinion: Loosely Coupled Monolith 2025](https://codeopinion.com/loosely-coupled-monolith-software-architecture-2025-edition/)*
- *[Enterprise Craftsmanship: Cohesion and Coupling](https://enterprisecraftsmanship.com/posts/cohesion-coupling-difference/)*
- *[Capital One: Avoiding Coupling in Microservices](https://www.capitalone.com/tech/software-engineering/how-to-avoid-loose-coupled-microservices/)*
- *[Amazon Prime Video Monolith Case Study](https://devclass.com/2023/05/05/reduce-costs-by-90-by-moving-from-microservices-to-monolith-amazon-internal-case-study-raises-eyebrows/)*
- *[Shopify: Deconstructing the Monolith](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)*
- *[Netflix Microservices Lessons (F5/NGINX)](https://www.f5.com/company/blog/nginx/microservices-at-netflix-architectural-best-practices)*
- *[Spotify Backstage and Squad Model](https://www.netguru.com/blog/scaling-microservices)*
- *[Google Monorepo Strategy](https://medium.com/@sohail_saifi/the-monorepo-strategy-that-scaled-google-to-2-billion-lines-of-code-cb3eb59f02d4)*
- *[Connascence (Wikipedia)](https://en.wikipedia.org/wiki/Connascence)*
- *[Beyond Basic Coupling: Understanding Connascence](https://medium.com/@mohamedsallam953/beyond-basic-coupling-understanding-connascence-to-build-truly-robust-systems-e3151999df94)*
- *[TechTarget: Software Coupling Metrics](https://www.techtarget.com/searchapparchitecture/tip/The-basics-of-software-coupling-metrics-and-concepts)*
- *[Codurance: Thoughts on Coupling](https://www.codurance.com/publications/software-creation/2016/07/25/thoughts-on-coupling-in-software-design)*
- *[DesignGurus: 10 Common Microservices Anti-Patterns](https://www.designgurus.io/blog/10-common-microservices-anti-patterns)*
- *[AWS Well-Architected: HPC Tightly Coupled Scenarios](https://docs.aws.amazon.com/wellarchitected/latest/high-performance-computing-lens/tightly-coupled-scenarios.html)*
- *[The Valuable Dev: Cohesion and Coupling Guide](https://thevaluable.dev/cohesion-coupling-guide-examples/)*
- *[Microservices Anti-Patterns: "I Was Taught to Share"](https://l-lin.github.io/architecture/microservice/microservices-antipatterns-and-pitfalls/microservices-antipatterns-and-pitfalls---i-was-taught-to-share-antipattern)*
