# Domain-Driven Design (DDD) — Architecture Expertise Module

> Domain-Driven Design is a software development approach where the structure and language of code matches the business domain, with boundaries drawn around coherent subdomains to manage complexity in large, complex systems. It has two wings: strategic (organization and boundaries) and tactical (code patterns).

> **Category:** Foundation
> **Complexity:** Expert
> **Applies when:** Systems with complex domain logic, multiple teams, and long evolution timescales — where the cost of misunderstanding the domain is high

**Cross-reference:** modular-monolith, microservices, hexagonal-clean-architecture, coupling-and-cohesion, cqrs-event-sourcing, separation-of-concerns

---

## What This Is (and What It Isn't)

Domain-Driven Design was introduced by Eric Evans in his 2003 book "Domain-Driven Design: Tackling Complexity in the Heart of Software." In 2024, Evans stated: "The state of the art of DDD is definitely better than it was twenty years ago" and affirmed that the core principle — focusing on deep issues of the domain users are engaged in — "will not go out of style."

DDD has two wings that are frequently confused or conflated:

**Strategic DDD** is the high-level practice of identifying domain boundaries, subdomains, team ownership, and relationships between models. It answers: *What are we building, for whom, and where do the natural seams lie?* Tools include Bounded Contexts, Context Maps, Ubiquitous Language, and Subdomain classification (Core / Supporting / Generic).

**Tactical DDD** is the low-level implementation vocabulary: Entities, Value Objects, Aggregates, Repositories, Domain Services, Domain Events, Factories, and Application Services. These are patterns for implementing a single Bounded Context richly.

### The Core Mistake Most Teams Make

Most teams skip strategic DDD entirely and go directly to tactical patterns. They start defining Aggregates and Value Objects before ever asking "what are our bounded contexts?" or "what is our core domain?" This is backwards and produces the worst outcome: all the complexity of DDD with none of the organizational benefits.

**Ubiquitous Language is the actual core of DDD**, not Aggregates. Evans intended DDD fundamentally as a collaboration methodology — a way for developers and domain experts to build a shared model that lives simultaneously in conversations, documentation, and code. Everything else is secondary.

### What DDD Is NOT

- DDD is not a folder structure or project layout convention. A project with `domain/`, `application/`, `infrastructure/` packages is not "doing DDD" — it may just be doing layered architecture.
- DDD is not "use Repositories and Entities everywhere." Applying tactical patterns uniformly across all subdomains is cargo-culting.
- DDD is not a coding pattern library you adopt independently of domain experts. Without collaboration and a shared language, you have overhead without value.
- DDD is not synonymous with microservices, though the two are often combined. Bounded Contexts can be implemented as modules within a monolith.
- "We use DDD because we have ValueObjects" is the most common misconception. Immutable data classes do not constitute domain-driven design.

---

## When to Use It

DDD delivers genuine value in a specific intersection of conditions. All of these should be present, or nearly so:

**Complex domain logic that domain experts can articulate.** Insurance premium calculation, logistics routing with constraints, financial instrument pricing, healthcare clinical workflows, legal compliance rules — domains where business rules are numerous, change independently, and have subtleties that only subject matter experts understand. Not domains where the logic is essentially database CRUD with a UI in front of it.

**Multiple teams that need to own subdomains independently.** When different groups (teams, departments, vendors) have different models for overlapping concepts, strategic DDD gives you the tools to draw those boundaries deliberately rather than having them emerge as coupling.

**Long-lived systems with expected evolution (5+ years).** The upfront investment in domain modeling amortizes over time. Systems expected to last less than two years rarely justify the overhead.

**Domain experts who are available and willing to collaborate.** DDD is fundamentally a collaborative methodology. If business experts won't sit in modeling workshops, the approach loses its primary source of value. Access to domain experts is a hard prerequisite, not a nice-to-have.

**When the cost of misunderstanding the domain is high.** In insurance, a wrong model for "policy holder" vs. "insured" can produce incorrect premium calculations at scale. In healthcare, a wrong model for "patient encounter" can cause data to be associated with the wrong clinical event. The potential damage from domain misalignment justifies the investment in getting it right.

### Real Cases Where DDD Applied Well

**Uber's DOMA (Domain-Oriented Microservice Architecture):** As Uber grew to approximately 2,200 critical microservices, the company applied domain-driven principles to consolidate them into 70 domains, each with a single gateway entry point. Teams could call one gateway instead of dozens of downstream services. The result: order-of-magnitude reduction in platform support costs, 25–50% decrease in new feature onboarding time, and independent team operation. Uber explicitly credits DDD principles alongside Clean Architecture and SOA.

**Netflix content delivery architecture:** Netflix identified key bounded contexts — User Management, Content Catalog, Recommendations, Playback — and mapped each to cohesive service groups. Netflix's own definition of a well-designed microservice mirrors DDD: "loosely coupled with bounded context — if you don't have bounded context, you have to know too much about what's around you." Continuous refinement of service boundaries, driven by domain understanding, was central to their scaling story.

**Banking core systems:** Major banks (e.g., systems built on Axon Framework in the Netherlands) model Account Management, Transaction Processing, Loan Processing, and Customer Service as separate bounded contexts with explicit context maps. The "Account" concept in Account Management has a different model than "Account" in Risk Management — and DDD gives teams the vocabulary to make that explicit rather than forcing an impossible universal Account model.

**Healthcare EHR systems:** Clinical workflows require separating the clinical domain (diagnoses, treatment plans, medication orders) from the administrative domain (billing codes, insurance authorizations, scheduling). A single model for "encounter" that serves both clinical and billing needs is invariably wrong for at least one of them.

---

## When NOT to Use It

This section is as important as the previous one. The failure modes of misapplied DDD are severe: months of upfront modeling investment, architectural complexity far exceeding what the problem requires, and teams that spend more time debating aggregate boundaries than delivering software.

### Simple CRUD Applications

If the core activity of your system is storing and retrieving records — user management, content management systems, basic inventory, most B2C consumer apps — DDD is the wrong tool. These domains have little complex behavior. The "business rules" are simple validation. There is no rich domain model to discover. Applying Aggregates and Domain Events to a to-do app or a blog platform produces a heavily over-engineered system where every feature change requires touching five layers of abstraction.

**Real example of overuse:** Startups have spent 3+ months modeling aggregates, value objects, and domain events for early-stage products with fewer than 100 users and a domain that amounts to "users post content and other users read it." The time would have been better spent shipping.

### Technical and Infrastructure Domains

Logging pipelines, authentication middleware, API gateways, deployment infrastructure — these are technical problems, not business domain problems. They have no "domain experts" in the DDD sense and no rich business concepts to model. Applying DDD here produces the vocabulary of DDD without any of the substance.

### Teams Without Domain Expert Access

Without domain experts, you have no source of ubiquitous language. Developers will invent a domain model based on their assumptions about the business, which is exactly the situation DDD was designed to prevent. If the "domain expert" is a product manager who has never spoken to an actual customer or understands the business process only superficially, the collaboration assumption of DDD is not met.

### Short-Horizon Projects (Less Than 6 Months)

The investment in strategic DDD — event storming workshops, context mapping, subdomain analysis, establishing ubiquitous language — takes time. For projects with a lifecycle shorter than 6 months or proof-of-concept work that may never reach production, this investment does not pay off. A well-structured layered architecture is usually sufficient.

### Small Teams (Fewer Than 5 Developers)

The primary benefit of strategic DDD is organizational: clear team ownership of bounded contexts, explicit contracts between contexts, and independent evolution. With a team of 2–4 developers, everyone can hold the entire model in their heads and communicate informally. The overhead of formal context maps and ACLs is pure friction with no corresponding benefit.

### When Domain Experts Cannot Describe Their Own Rules

Some domains have rules so deeply tacit that domain experts cannot articulate them — they just know when something looks right. In these cases, collaborative modeling is impossible. Machine learning approaches often handle these better than explicit domain models.

### The Cargo-Cult Warning

The most common failure mode is cargo-culting tactical DDD patterns without strategic DDD. Teams adopt Aggregates, Value Objects, and Repositories as a "best practice" layer on top of what is fundamentally a CRUD application. This adds 40–60% more code for the same functionality, makes the system harder to understand for new developers, and creates the illusion of a rich domain model where none exists. INNOQ's analysis of this pattern notes that teams often end up with all the costs of a domain model without any of the benefits — the same criticism Martin Fowler leveled at the Anemic Domain Model.

---

## How It Works

### Strategic DDD Patterns

#### Bounded Context

A Bounded Context is an explicit boundary within which a particular domain model is defined and applicable. Within the boundary, all terms have a specific, agreed-upon meaning. Outside the boundary, the same term may mean something different.

**How to identify boundaries:**

- *Linguistic boundaries:* Where does the same word mean different things? In an e-commerce company, "Product" in the Catalog context (description, images, specifications) is a different concept from "Product" in the Inventory context (SKU, warehouse location, stock level) and "Product" in the Pricing context (price tiers, discounts, promotions). These different meanings are a signal that three separate bounded contexts exist.
- *Team boundaries:* Conway's Law suggests that systems reflect the communication structure of the organizations that build them. Let team ownership drive context boundaries, or deliberately restructure teams to match desired architecture (the Inverse Conway Maneuver).
- *Data ownership boundaries:* Which team has the authoritative record for a given entity? That authority defines a context boundary. No two bounded contexts should both claim write authority over the same data without an explicit agreement pattern.
- *Rate-of-change boundaries:* Business capabilities that change at different rates for different reasons (promotions change daily; product taxonomy changes quarterly; accounting rules change annually) are candidates for separate contexts.

**Real example — electricity utility:** In one utility company, the word "meter" meant subtly different things across departments: the physical device, the connection between the grid and a location, the billing relationship between the grid and a customer. A single "meter" model was impossible; three separate bounded contexts, each with their own meter concept, was the correct answer.

#### Context Map

A Context Map documents the relationships between bounded contexts. It is not a UML diagram — it is a strategic document showing how teams interact and how models translate across boundaries. The relationship patterns:

| Pattern | Description | Use When |
|---------|-------------|----------|
| **Shared Kernel** | Two contexts share a subset of the domain model, jointly owned | Close teams with tight coupling that cannot be avoided |
| **Customer-Supplier** | Upstream context (supplier) publishes; downstream (customer) consumes | Clear upstream/downstream dependency with negotiated interface |
| **Conformist** | Downstream context simply conforms to upstream model without translation | When translation cost exceeds benefit; upstream won't negotiate |
| **Anticorruption Layer (ACL)** | Downstream translates upstream model into its own language | Protecting a clean model from a legacy or external system |
| **Open Host Service (OHS)** | Upstream publishes a formal, stable API for multiple consumers | When many downstreams consume; upstream wants to decouple |
| **Published Language** | A shared, documented, versioned data format for cross-context integration | Event-driven integration; public API contracts |
| **Separate Ways** | No integration; contexts evolve entirely independently | When integration cost exceeds the benefit of shared data |

#### Ubiquitous Language

Ubiquitous Language is the shared vocabulary co-created by developers and domain experts that is used consistently in all conversations, documentation, and — critically — in the code itself. Class names, method names, variable names, and event names all reflect the language of the domain expert, not the implementation convenience of the developer.

**How to develop it in practice:**

1. Run domain storytelling sessions or EventStorming workshops with domain experts. The language that emerges naturally is the foundation.
2. Document contested terms in a glossary. When developers and business people disagree on what a term means, that disagreement is a signal — it may indicate a missing subdomain boundary.
3. Apply the language immediately in code. If the business says "quote" and the code says `PriceEstimateRequest`, the model has already drifted.
4. Treat language drift as a bug. When the code's language diverges from the domain language, the model is losing fidelity. Schedule model refinement.
5. The language is bounded: "Customer" in Sales means something different from "Customer" in Support. The ubiquitous language belongs to a specific bounded context.

#### Subdomains

Subdomains classify parts of the business by strategic importance:

**Core Domain:** The part of the business that creates competitive advantage. This is where the organization wins or loses in the market. It deserves the most attention, the best developers, and full tactical DDD investment. In a logistics company, route optimization is core. In a bank, risk modeling is core. Core domains must not be outsourced or built from generic off-the-shelf solutions.

**Supporting Domain:** Necessary to the business but not differentiating. It supports the core domain. Can often be built simply (even as CRUD), or outsourced. In the same logistics company, a driver onboarding workflow is supporting.

**Generic Domain:** Commodity functionality that any business needs. Authentication, billing, email sending, notifications. Buy or use off-the-shelf. Building these as custom software is waste. Applying tactical DDD here is almost always wrong.

The practical implication: apply tactical DDD patterns (Aggregates, Domain Events, rich models) only in the **core domain**. Use simple CRUD or third-party services for generic domains. Use simple services for supporting domains. This is where the "DDD everywhere" failure mode is most damaging — teams apply tactical complexity uniformly across all subdomains when it only belongs in core.

---

### Tactical DDD Patterns

Tactical patterns are implementation-level building blocks for modeling within a single bounded context. They are most valuable in the core domain.

#### Entity

An object defined primarily by its **identity** rather than its attributes. Two entities with the same attributes but different identities are different objects. State is mutable over time.

```
// An Order is an Entity — it has a unique identity (orderId)
// and its state changes over time (items added, status transitions)
class Order {
  orderId: OrderId        // identity
  customerId: CustomerId  // reference to another aggregate by ID
  status: OrderStatus     // mutable state
  lineItems: LineItem[]   // internal value objects
}
```

When to use: when an object has a life cycle, when you need to track a thing over time, when the "same" object with changed attributes is still considered the same object.

#### Value Object

An object defined entirely by its **attributes**. Two value objects with the same attributes are the same object. Immutable by definition — you don't change a value object, you replace it.

```
// Money is a Value Object — $10 USD is $10 USD regardless of which instance
// No identity field; equality is structural
class Money {
  readonly amount: Decimal   // immutable
  readonly currency: Currency

  add(other: Money): Money { ... }  // returns new instance, never mutates
}
```

Value Objects should be the default choice. Reach for Entity only when identity tracking is genuinely needed. Rich value objects encapsulate validation (a `Money` that cannot represent a negative amount), making invariants self-enforcing.

#### Aggregate

An Aggregate is a cluster of associated Entities and Value Objects treated as a single unit for data changes, with one designated **Aggregate Root** as the only entry point for external interaction.

The Aggregate enforces consistency rules (invariants) within its boundary. Any state change that must be consistent must happen within the same aggregate, within a single transaction.

#### Domain Service

Logic that represents an important domain concept but doesn't naturally fit inside a single entity or value object. Stateless. Named after domain activities.

```
// FundsTransferService doesn't belong inside Account because it
// involves two accounts and a transfer policy
class FundsTransferService {
  transfer(source: Account, destination: Account, amount: Money): TransferResult
}
```

Domain Services are often over-used. Before creating one, genuinely ask: does this behavior belong in one of the entities involved? If yes, put it there (that's the rich domain model). Only create a Domain Service when the operation genuinely doesn't fit.

#### Repository

A collection-like abstraction that hides persistence mechanics. The interface belongs to the domain layer; the implementation belongs to infrastructure.

```
interface OrderRepository {
  findById(id: OrderId): Order | null
  findByCustomer(customerId: CustomerId): Order[]
  save(order: Order): void
}
// The domain layer only knows about this interface
// PostgresOrderRepository implements it in the infrastructure layer
```

One Repository per Aggregate Root. Never one per Entity.

#### Domain Event

A record of something that happened in the domain that domain experts care about. Named in past tense. Immutable. Used for cross-aggregate integration and recording audit history.

```
class OrderPlaced {
  readonly occurredAt: Date
  readonly orderId: OrderId
  readonly customerId: CustomerId
  readonly totalAmount: Money
}
```

Domain Events are the primary mechanism for eventual consistency between aggregates and between bounded contexts (via a message bus).

#### Application Service

The orchestration layer. Coordinates domain objects to fulfill a use case. Contains no domain logic itself — it delegates entirely to the domain model. Handles transactions, authentication, and cross-cutting concerns.

```
class PlaceOrderApplicationService {
  placeOrder(command: PlaceOrderCommand): OrderId {
    // 1. Load aggregates via repositories
    // 2. Invoke domain logic
    // 3. Persist via repositories
    // 4. Publish domain events
    // No business rules here — those live in Order
  }
}
```

---

### Aggregate Design Rules

Vaughn Vernon's four rules from "Implementing Domain-Driven Design" (the "Red Book"):

**Rule 1 — Model true invariants in consistency boundaries.** An invariant is a business rule that must always be consistent. An Aggregate defines the boundary within which all invariants must be maintained in a single transaction. The discipline: identify your invariants first, then draw the aggregate boundary to contain them — not the other way around.

**Rule 2 — Design small aggregates.** "A large-cluster Aggregate will never perform or scale well. It is more likely to become a nightmare leading only to failure." The correct size is: the Aggregate Root entity plus the minimum number of additional objects needed to enforce consistency. This is almost always smaller than teams initially design. A `User` aggregate that contains their entire order history, all their addresses, all their payment methods, and their notification preferences is a textbook large-cluster anti-pattern. Each of those is likely a separate aggregate or a separate context.

**Rule 3 — Reference other aggregates by identity only.** Aggregates refer to other aggregates by their globally unique identifier, not by holding object references. This prevents accidental loading of large object graphs, forces explicit loading decisions, and makes aggregate boundaries legible in the code. A field `customerId: CustomerId` is correct. A field `customer: Customer` (where Customer is another aggregate) is wrong.

**Rule 4 — Use eventual consistency outside the boundary.** When a business rule spans multiple aggregates, it should be satisfied eventually via Domain Events, not immediately in a single transaction. If you find yourself updating two aggregates in a single transaction, either: (a) they should be one aggregate (they share an invariant), or (b) the operation should use eventual consistency. Most cross-aggregate "consistency" requirements turn out to be eventually consistent when you discuss them with domain experts.

---

### Integration Patterns Between Bounded Contexts

**Anti-Corruption Layer (ACL):** A translation layer that sits between a downstream context and an upstream context (or external system), converting the upstream model into the downstream context's language. This prevents the upstream model from "leaking" into and corrupting the carefully crafted downstream model.

Practical ACL structure:
- A Translator that maps upstream DTOs/models to downstream domain objects
- An Adapter that wraps the upstream API
- The downstream domain code never imports types from the upstream context directly

**Domain Events for cross-context integration:** The most loosely coupled integration pattern. The producing context publishes events on a message bus (Kafka, RabbitMQ, SNS) using its own language. Consuming contexts subscribe, translate via an ACL if needed, and react. The producer has no knowledge of consumers. This is how large-scale systems (Netflix, Uber) integrate dozens of contexts without creating a web of synchronous dependencies.

**Published Language:** A formal, versioned, documented data format shared across context boundaries. Often implemented as JSON schemas, Protobuf definitions, or AsyncAPI specifications. Differs from Shared Kernel in that it's a read-only contract — consumers don't contribute to its definition.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| Explicit, enforceable domain boundaries | Significant upfront analysis and design time |
| Code that speaks the domain language — readable by business and technical stakeholders | Learning curve for tactical patterns (weeks for developers new to DDD) |
| Team autonomy — teams can evolve their contexts independently | Domain expert time — requires sustained collaboration, not a one-time meeting |
| Aggregates enforce invariants — business rules cannot be violated by calling code | More code per feature in the core domain: entities, value objects, events, repositories vs. simple CRUD |
| Clear ownership of data — no ambiguity about which system is authoritative | Slower initial velocity (first 4–8 sprints) while patterns are established |
| Tactical patterns provide natural seams for testing | Risk of over-designing: applying full tactical DDD in supporting/generic domains where CRUD suffices |
| Context Maps make team dependencies visible and manageable | Context Map maintenance overhead — boundaries discovered wrong require expensive refactoring |
| Domain Events create an audit trail and enable eventual consistency | Event schema evolution is complex — consumers must handle multiple versions |
| Subdomains allow applying the right tool per capability | Requires organizational maturity: teams must respect context boundaries consistently |
| Long-term maintainability — the model stays aligned with business reality | Risk of ubiquitous language drift if collaboration discipline lapses |

---

## Evolution Path

### Starting from Scratch

1. **Identify the core domain first.** Ask: "What do we do that no competitor can easily replicate? Where does the business win or lose?" That answer defines your core domain — the area that deserves the deepest investment.

2. **Run an EventStorming workshop.** Gather domain experts and developers in a room (physical or virtual) with sticky notes. Map the domain as a timeline of business events. This surfaces the natural seams in the domain, the language, the commands, the aggregates, and the context boundaries — all at once. Alberto Brandolini's EventStorming is the most effective technique for discovering bounded contexts that exists.

3. **Draw a Context Map.** Before writing code, document the bounded contexts you've identified and their relationships. Which teams own which contexts? Which are Customer-Supplier? Where are the ACL boundaries?

4. **Apply tactical patterns only in the core domain.** Supporting domains use simple services. Generic domains use off-the-shelf components. Tactical DDD patterns — Aggregates, Value Objects, Domain Events — are reserved for the core.

5. **Start with Ubiquitous Language.** Before defining classes, establish the glossary with domain experts. Run every entity name and method name past a domain expert. If they don't recognize the language, iterate.

### Refactoring from an Anemic Domain Model

An Anemic Domain Model is the most common failure state: entities that are essentially data bags (getters and setters only), with all logic scattered across service classes. Martin Fowler identified this anti-pattern in 2003: "The fundamental horror of this anti-pattern is that it's so contrary to the basic idea of object-oriented design; which is to combine data and process together."

Refactoring path:

1. **Identify the services with the most domain logic.** These are the services you need to push down into the domain model first.
2. **Find the invariants.** What rules does the service enforce about the entity's state? These should move into the entity as methods.
3. **Create Value Objects for concepts.** Primitive obsession (using `String` for email, `int` for money amounts) is a signal. Replace primitives with Value Objects that enforce their own validity.
4. **Define Aggregate Roots.** Which entity is the consistency boundary for a cluster? Make it the Aggregate Root, put the invariants there, remove direct access to internal entities from outside.
5. **Introduce Domain Events.** Replace direct method calls across aggregates with event publication and subscription.
6. This is a months-long migration, not a sprint. Prioritize the core domain, leave supporting domains anemic if they don't need the richness.

---

## Failure Modes

### God Aggregates

The single most common tactical failure. A `User` aggregate that accumulates every concept connected to a user — profile, orders, addresses, payment methods, notification preferences, subscription status — becomes a massive, slow-to-load, contention-prone object. Every feature that touches "anything about a user" modifies the same aggregate, creating locking contention in RDBMS and making independent team evolution impossible.

**Symptoms:** Aggregate classes with 30+ fields. Repositories that load massive object graphs. Every team's changes conflict because they all touch the same aggregate. Slow transaction throughput on high-write entities.

**Fix:** Apply Aggregate Rule 2 ruthlessly. The `User` aggregate should contain only what is needed to enforce the user's core invariants (perhaps identity, credentials, status). Addresses, orders, payment methods are separate aggregates referencing `UserId`.

### Anemic Domain Model

Entities are passive data bags. All logic lives in `*Service` classes. This is the result of applying DDD's structural vocabulary (entities, repositories) without its substance (rich domain objects with behavior). The code incurs all DDD overhead with none of its benefits.

**Symptoms:** Entities have only getters and setters. `UserService.activate(userId)` rather than `user.activate()`. Business rules are duplicated across multiple service classes. Services have method counts in the dozens.

### Aggregate Crossing (Transactions Spanning Multiple Aggregates)

Developers write transactions that modify two or more aggregates atomically. This defeats the aggregate boundary and signals either: (a) the aggregates should be one (they share an invariant that requires synchronous consistency), or (b) the transaction needs to be decomposed into eventual consistency via Domain Events.

**Symptoms:** `@Transactional` methods that call multiple repositories. Saga/compensation logic written to handle partial failures.

### Ubiquitous Language Drift

The code's language diverges from the domain language over time. Classes are renamed for technical convenience. New developers use technical terms rather than domain terms. Domain experts stop being consulted. After two years, the codebase is written in "developer domain" that domain experts cannot read, and the original DDD investment is largely lost.

**Symptoms:** Domain experts cannot understand class names or method names when code is read aloud. Glossaries exist as docs but aren't reflected in code. Multiple synonyms for the same concept in the codebase.

**Fix:** Treat language drift as a bug. Regular model refinement sessions. Code review that includes checking naming against the ubiquitous language.

### Wrong Context Boundaries (Discovered Too Late)

The most expensive failure. Context boundaries are drawn incorrectly early in the project — perhaps too granular (splitting a single cohesive context into three), or too coarse (merging contexts that belong to different teams). Discovering this after 12 months of development means significant refactoring.

**Symptoms:** One team regularly needs to modify code in another team's context to complete features. Or: one context has become enormous with internal coupling that rivals the pre-boundary state.

**Prevention:** EventStorming early. Expect the first context map to be wrong. Plan an explicit checkpoint at 3 months to revisit boundaries based on what you've learned.

### Applying DDD to the Wrong Subdomain

Teams spend months applying full tactical DDD to supporting or generic domains — email notification service, user authentication, report generation — while the core domain gets insufficient attention. Supporting domains have low complexity; the DDD overhead produces no value.

**Real case (composite from community reports):** A fintech startup spent their first quarter applying DDD, CQRS, and Event Sourcing to their user registration and authentication flow — a generic domain that could have been handled by Auth0 or Cognito. Their actual core domain (novel risk scoring algorithm) was implemented as a single service with procedural code and no model. Six months later, the risk scoring service was unmaintainable; the authentication service was a perfectly modeled irrelevance.

---

## Technology Landscape

### DDD Frameworks

**Axon Framework (Java/Kotlin):** The most mature DDD + CQRS + Event Sourcing framework. Provides Aggregate annotations, Command Bus, Event Bus, Saga support, and optional Axon Server for event store. Used widely in Dutch banking and insurance. Opinionated — projects that diverge from its patterns face friction.

**Eventuate Platform (Java):** Framework for building microservices with Saga pattern, CQRS, and Event Sourcing. Less opinionated than Axon. Suitable for systems that need Saga-based distributed transactions.

**NestJS CQRS Module (Node.js/TypeScript):** Lightweight CQRS and Domain Events support within the NestJS ecosystem. Does not enforce DDD structure but provides the Command/Event/Query bus infrastructure. Common starting point for TypeScript DDD implementations.

**MediatR (C# /.NET):** The dominant mediator pattern library in .NET, widely used to implement the Command/Query separation part of CQRS and Application Service orchestration in DDD.NET projects.

### Domain Modeling and Discovery Tools

**EventStorming (Alberto Brandolini):** Facilitated workshop technique using sticky notes (physical or virtual via Miro/Mural) to map domain events, commands, aggregates, and context boundaries. The most effective known technique for discovering bounded contexts and building ubiquitous language. Available in Big Picture (strategic) and Design-Level (tactical) formats.

**ContextMapper:** Open-source DSL and toolset for modeling bounded contexts, context maps, and generating PlantUML diagrams, MDSL service contracts, and PlantUML class diagrams from the model. Actively maintained; integrates with EventStorming output. Supports all DDD context relationship patterns in code.

**Domain Storytelling:** Structured workshop format where domain experts tell stories about their work using a pictographic language. Complements EventStorming for early domain discovery.

### Related Architectural Patterns

**CQRS (Command Query Responsibility Segregation):** Separates write operations (Commands, processed by the domain model) from read operations (Queries, served by optimized read models). Frequently combined with DDD — the write side implements the rich domain model; the read side uses simple projections. Not required for DDD but addresses the impedance mismatch between a rich domain model and query performance needs.

**Event Sourcing:** Instead of storing current state, stores the sequence of Domain Events that produced that state. Provides a complete audit log, enables temporal queries, and makes Domain Events first-class citizens. High operational complexity — use only when the audit/temporal requirements genuinely justify it.

**Hexagonal Architecture (Ports and Adapters):** The preferred physical structure for implementing a DDD bounded context. The domain model is at the center; infrastructure (databases, message buses, HTTP) is outside. Domain interfaces (ports) define what infrastructure must provide; concrete implementations (adapters) plug in. Prevents domain model contamination by infrastructure concerns.

---

## Decision Tree

**Start here: How complex is the domain logic?**

```
Is the domain primarily CRUD (store/retrieve/display data)?
  YES → Skip DDD entirely. Use a simple layered architecture.
        Revisit if the domain grows significantly more complex.
  NO  → Continue

Do you have access to domain experts who can articulate the rules?
  NO  → DDD's collaborative foundation is absent.
        Consider a lightweight domain model without full DDD investment.
  YES → Continue

Is this a system expected to evolve for 2+ years with 5+ developers?
  NO  → Consider a modular monolith with clear module boundaries.
        Full DDD tactical investment not warranted.
  YES → Continue

Do you have multiple teams needing to own different capabilities independently?
  NO  → Apply strategic DDD (identify subdomains and bounded contexts)
        but apply tactical DDD patterns only in the core domain.
        Supporting domains use simple services.
  YES → Start with a Context Map. Run EventStorming.
        Apply tactical DDD only in the core domain.
        Use simpler approaches (ACL, Published Language) for integration.

Is the core domain identifiable and significantly more complex than supporting domains?
  YES → Full strategic + tactical DDD in core domain only.
        This is the canonical DDD use case.
  NO  → The domain may be more uniform. Consider modular architecture
        with consistent lightweight domain models rather than
        full tactical DDD in some areas and CRUD in others.
```

**Shortcuts:**
- Fewer than 3 bounded contexts AND mostly CRUD operations → skip DDD tactical entirely
- Complex business rules that domain experts can clearly articulate → start with ubiquitous language + strategic DDD, add tactical patterns in the core domain
- Multiple teams owning different subdomains → draw the context map before writing any code
- Core domain with complex state transitions and invariants → full tactical DDD in the core domain, using Aggregates, Value Objects, and Domain Events

---

## Implementation Sketch

### Bounded Context Folder Structure

```
src/
  ordering/                    ← Bounded Context: Order Management
    domain/
      order/
        Order.ts               ← Aggregate Root
        OrderId.ts             ← Value Object
        OrderStatus.ts         ← Value Object (enum-like)
        LineItem.ts            ← Entity within aggregate
        Money.ts               ← Value Object
        OrderPlaced.ts         ← Domain Event
        OrderCancelled.ts      ← Domain Event
        OrderRepository.ts     ← Repository Interface (domain layer)
      shared/
        CustomerId.ts          ← Value Object (cross-context ID reference)
    application/
      PlaceOrderCommand.ts
      PlaceOrderHandler.ts     ← Application Service
      CancelOrderHandler.ts
    infrastructure/
      PostgresOrderRepository.ts  ← Repository Implementation
      OrderEventPublisher.ts
    acl/
      CatalogProductTranslator.ts ← ACL: translates catalog context's model

  catalog/                     ← Bounded Context: Product Catalog
    domain/
      ...

  shipping/                    ← Bounded Context: Shipping & Fulfillment
    domain/
      ...
```

### Aggregate Root Example

```typescript
// domain/order/Order.ts
class Order {
  private readonly _orderId: OrderId;
  private _status: OrderStatus;
  private _lineItems: LineItem[];
  private _domainEvents: DomainEvent[] = [];

  private constructor(orderId: OrderId, customerId: CustomerId) {
    this._orderId = orderId;
    this._customerId = customerId;
    this._status = OrderStatus.DRAFT;
    this._lineItems = [];
  }

  static place(customerId: CustomerId, items: LineItemSpec[]): Order {
    if (items.length === 0) {
      throw new DomainError("Order must have at least one item");
    }
    const order = new Order(OrderId.generate(), customerId);
    items.forEach(spec => order.addLineItem(spec));
    order._status = OrderStatus.PLACED;
    order.record(new OrderPlaced(order._orderId, order._customerId, order.total()));
    return order;
  }

  cancel(reason: CancellationReason): void {
    if (!this._status.isCancellable()) {
      throw new DomainError(`Cannot cancel order in status ${this._status}`);
    }
    this._status = OrderStatus.CANCELLED;
    this.record(new OrderCancelled(this._orderId, reason));
  }

  // Invariant enforced here: no direct access to _lineItems from outside
  private addLineItem(spec: LineItemSpec): void {
    this._lineItems.push(LineItem.create(spec));
  }

  total(): Money {
    return this._lineItems.reduce(
      (sum, item) => sum.add(item.subtotal()), Money.ZERO
    );
  }

  private record(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
```

### Value Object Example

```typescript
// domain/order/Money.ts
class Money {
  static readonly ZERO = new Money(new Decimal(0), Currency.USD);

  private constructor(
    private readonly _amount: Decimal,
    private readonly _currency: Currency
  ) {
    if (_amount.isNegative()) {
      throw new DomainError("Money amount cannot be negative");
    }
  }

  static of(amount: number, currency: Currency): Money {
    return new Money(new Decimal(amount), currency);
  }

  add(other: Money): Money {
    if (!this._currency.equals(other._currency)) {
      throw new DomainError("Cannot add money of different currencies");
    }
    return new Money(this._amount.plus(other._amount), this._currency);
  }

  equals(other: Money): boolean {
    return this._amount.equals(other._amount) &&
           this._currency.equals(other._currency);
  }

  // No setters — immutable by design
}
```

### Domain Event Example

```typescript
// domain/order/OrderPlaced.ts
class OrderPlaced implements DomainEvent {
  readonly eventType = "ordering.OrderPlaced";
  readonly occurredAt: Date;
  readonly orderId: string;
  readonly customerId: string;
  readonly totalAmount: { amount: string; currency: string };

  constructor(orderId: OrderId, customerId: CustomerId, total: Money) {
    this.occurredAt = new Date();
    this.orderId = orderId.value;
    this.customerId = customerId.value;
    this.totalAmount = total.serialize();
  }
}
```

### Application Service Orchestrating Domain Objects

```typescript
// application/PlaceOrderHandler.ts
class PlaceOrderHandler {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly catalogAcl: CatalogACL,          // ACL to catalog context
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: PlaceOrderCommand): Promise<OrderId> {
    // Translate incoming data through ACL
    const lineItemSpecs = await this.catalogAcl.resolveItems(command.requestedItems);

    // All domain logic inside domain objects
    const order = Order.place(
      CustomerId.of(command.customerId),
      lineItemSpecs
    );

    // Persist
    await this.orderRepository.save(order);

    // Publish domain events (cross-context integration)
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishAll(events);

    return order.orderId;
  }
}
// Note: no business rules here — all in Order.place() and Order.cancel()
```

### ACL Translating Between Contexts

```typescript
// acl/CatalogProductTranslator.ts
// The ordering context's view of a product — different from catalog context's Product
interface OrderableProduct {
  productId: ProductId;
  currentPrice: Money;
  isAvailable: boolean;
}

class CatalogACL {
  constructor(private readonly catalogClient: CatalogServiceClient) {}

  async resolveItems(requests: RequestedItem[]): Promise<LineItemSpec[]> {
    // Catalog context returns its own model
    const catalogProducts = await this.catalogClient.getProducts(
      requests.map(r => r.catalogProductId)
    );

    // ACL translates catalog language into ordering language
    return requests.map(request => {
      const catalogProduct = catalogProducts.find(
        p => p.id === request.catalogProductId
      );
      if (!catalogProduct || !catalogProduct.available) {
        throw new DomainError(`Product ${request.catalogProductId} is not orderable`);
      }
      return new LineItemSpec(
        ProductId.of(catalogProduct.id),
        Money.of(catalogProduct.listPrice, Currency.of(catalogProduct.currency)),
        request.quantity
      );
    });
  }
}
```

---

## Frequently Encountered Debates

**"Should bounded contexts map 1:1 to microservices?"**
No. A Bounded Context is a domain concept (a coherent model with its own language). A microservice is a deployment unit. One bounded context can be deployed as multiple services; one service can contain multiple bounded contexts (though the latter should be avoided in mature architectures). Start with bounded contexts as modules in a monolith; extract to services when operational needs (independent scaling, separate deployment cadence) justify the distributed systems overhead.

**"Is CQRS required for DDD?"**
No. CQRS is frequently used with DDD because rich aggregate models are optimized for writes (invariant enforcement) but poor for reads (complex queries across aggregates). CQRS separates these concerns. But DDD's domain model works without CQRS; only add CQRS when query performance problems actually emerge from the rich model.

**"Should aggregates be serialized directly to the database?"**
Generally no. Aggregate design should be driven by domain invariants, not by the relational schema. Use a mapping layer (or an ORM that supports domain model mapping, like Hibernate with embeddables for Value Objects). Object-Relational impedance mismatch is a real problem; accepting it is better than letting database schema dictate aggregate structure.

**"Can DDD and LLMs/AI work together?"**
Eric Evans, at Explore DDD 2024: yes. "Some parts of complex systems never fit into structured parts of domain models and are typically handled by humans." LLMs can take over those unstructured parts. He encouraged practitioners to experiment with combining DDD's explicit model for the structured domain with LLM capabilities for the unstructured parts. The domain model provides the guardrails and interpretation layer for LLM outputs.

---

*Researched: 2026-03-08*

*Sources:*
- *Evans, Eric. "Domain-Driven Design: Tackling Complexity in the Heart of Software." Addison-Wesley, 2003.*
- *Vernon, Vaughn. "Implementing Domain-Driven Design." Addison-Wesley, 2013.*
- *Vernon, Vaughn. "Effective Aggregate Design" (essay series). DDD Community, 2011. https://www.dddcommunity.org/library/vernon_2011/*
- *Fowler, Martin. "Bounded Context." martinfowler.com. https://martinfowler.com/bliki/BoundedContext.html*
- *Fowler, Martin. "Anemic Domain Model." martinfowler.com. https://martinfowler.com/bliki/AnemicDomainModel.html*
- *Fowler, Martin. "Ubiquitous Language." martinfowler.com. https://martinfowler.com/bliki/UbiquitousLanguage.html*
- *InfoQ. "Eric Evans Encourages DDD Practitioners to Experiment with LLMs." March 2024. https://www.infoq.com/news/2024/03/Evans-ddd-experiment-llm/*
- *Uber Engineering. "Introducing Domain-Oriented Microservice Architecture." Uber Blog, 2020. https://www.uber.com/blog/microservice-architecture/*
- *ContextMapper. "Context Mapper — Open Source DDD Tooling." https://contextmapper.org/*
- *Microsoft Azure Architecture Center. "Use Domain Analysis to Model Microservices." https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis*
- *INNOQ. "Is Domain-Driven Design Overrated?" 2021. https://www.innoq.com/en/blog/2021/03/is-domain-driven-design-overrated/*
- *CodeOpinion. "STOP doing dogmatic Domain Driven Design." https://codeopinion.com/stop-doing-dogmatic-domain-driven-design/*
- *InfoQ. "Practical DDD: Bounded Contexts + Events => Microservices." https://www.infoq.com/presentations/microservices-ddd-bounded-contexts/*
- *ddd-crew. "Bounded Context Canvas." GitHub. https://github.com/ddd-crew/bounded-context-canvas*
