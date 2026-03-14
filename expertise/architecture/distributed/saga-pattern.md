# Saga Pattern — Architecture Expertise Module

> The Saga pattern manages distributed transactions across multiple services by breaking them into a sequence of local transactions, each with a compensating action for rollback. It replaces distributed two-phase commit (2PC) — which doesn't scale — with eventual consistency and explicit compensation logic. The term was introduced by Hector Garcia-Molina and Kenneth Salem in their 1987 ACM SIGMOD paper "Sagas," originally addressing long-lived transactions in monolithic databases. The modern microservices community repurposed the concept for cross-service coordination, and it has become the dominant pattern for distributed business transactions.

> **Category:** Distributed
> **Complexity:** Expert
> **Applies when:** Business transactions spanning multiple services that need atomicity guarantees without distributed database transactions

---

## What This Is (and What It Isn't)

### The Core Idea

A saga is a sequence of local transactions where each step (T1, T2, ... Tn) executes within a single service's database boundary. Each step Ti has a corresponding compensating transaction Ci that semantically undoes the effect of Ti. If step Tk fails, the saga executes compensating transactions Ck-1, Ck-2, ... C1 in reverse order to undo the work of all preceding steps.

This is fundamentally different from a distributed two-phase commit (2PC). In 2PC, a coordinator asks all participants to prepare (vote), then commits or aborts atomically. All participants hold locks during preparation, the coordinator is a single point of failure, and network partitions cause blocking. 2PC provides strong consistency at the cost of availability and latency. Sagas provide eventual consistency at the cost of isolation — but with dramatically better availability and scalability.

**The key distinction:** 2PC holds locks across services until all participants agree. Sagas commit each local transaction immediately and rely on compensating transactions if something goes wrong later. Each local transaction is committed and visible to other transactions the moment it completes — there is no global lock.

### Two Coordination Strategies

**Choreography-based sagas:** Each service publishes domain events after completing its local transaction. Other services listen for those events and react by executing their own local transaction and publishing the next event. There is no central coordinator. The saga's execution flow is implicit — it emerges from the event subscriptions. Each service knows only about its own step and which events to listen for.

**Orchestration-based sagas:** A central saga coordinator (orchestrator) explicitly controls the sequence. The orchestrator sends commands to each service ("reserve inventory," "charge payment"), waits for replies, and decides the next step. If a step fails, the orchestrator invokes compensating transactions in reverse order. The saga's execution flow is explicit — it lives in the orchestrator's state machine.

### What a Saga Is Not

**Not a distributed transaction.** A saga does not provide ACID guarantees across services. There is no atomicity in the traditional sense — intermediate states are visible. There is no isolation — other transactions can see partially completed saga state. What a saga provides is eventual atomicity: the guarantee that either all steps complete or all completed steps are compensated.

**Not a replacement for local database transactions.** Each step within a saga should be a proper ACID transaction within a single service's database. The saga pattern coordinates the sequence of these local transactions. If a single service needs a multi-table write, that is a local transaction, not a saga.

**Not event sourcing.** Event sourcing stores all state changes as an append-only sequence of events. Sagas coordinate multi-service transactions using events (in choreography) or commands (in orchestration). They are complementary but distinct patterns. You can implement sagas with or without event sourcing.

**Not an outbox pattern.** The transactional outbox pattern ensures reliable event publishing by writing events to an outbox table within the same local transaction as the business data. Sagas frequently use the outbox pattern as an implementation detail to guarantee reliable step transitions, but they are separate concerns.

---

## When to Use It

### The Qualifying Conditions

Apply the saga pattern when **all** of these are true:

**The business transaction spans multiple services with separate databases.** The entire reason sagas exist is that you cannot execute a single ACID transaction across service boundaries. If all the data lives in one database, use a regular database transaction. If the data is split across services each owning their data (the database-per-service pattern), sagas are the primary mechanism for cross-service consistency.

**Eventual consistency is acceptable for the business.** There will be a window — milliseconds to seconds, sometimes minutes — where the system is in a partially completed state. An order may be created but payment not yet confirmed. Inventory may be reserved but the shipping label not yet generated. If the business can tolerate this intermediate visibility (and most can, with proper UI design), sagas work. If not, you need a different architecture.

**Each step can be meaningfully compensated.** Every transaction in the saga must have a well-defined undo operation. "Unreserve inventory" is easy. "Unsend an email" is impossible. If the saga includes non-compensatable actions (sending notifications, charging credit cards with no-refund policies, triggering physical processes), those steps must be placed at the end of the saga (as pivot transactions) or handled with alternative strategies.

**The workflow is well-defined and finite.** Sagas model a sequence of steps with known entry and exit conditions. They are not suitable for open-ended, long-running processes where the set of steps is not known in advance. For those, consider a process manager or workflow engine.

### Real-World Domains

**E-commerce order processing.** The canonical example. An order saga coordinates: create order (Order Service) -> reserve inventory (Inventory Service) -> authorize payment (Payment Service) -> arrange shipment (Shipping Service). If payment authorization fails at step 3, the saga compensates by unreserving inventory (C2) and canceling the order (C1). Amazon, Shopify, and most large e-commerce platforms use saga variants for order fulfillment.

**Travel booking.** Booking a trip involves reserving a flight (Airline Service) -> booking a hotel (Hotel Service) -> renting a car (Car Rental Service). If the hotel booking fails, the saga compensates by canceling the flight reservation. Booking.com and Expedia handle multi-supplier coordination with saga-like patterns, often with orchestration due to the heterogeneity of supplier APIs.

**Banking and financial transfers.** A fund transfer saga: debit source account (Account Service) -> credit destination account (Account Service or external) -> record transaction (Ledger Service). If the credit fails, the saga compensates by reversing the debit. Banks like ING and Rabobank have publicly discussed saga-based architectures for payment processing.

**Insurance claims processing.** Validate claim -> assess damage -> approve payment -> disburse funds. Each step involves different services with different SLAs. Saga orchestration handles the multi-day, multi-step nature of claims workflows.

**Food delivery.** Accept order -> assign restaurant -> assign driver -> process payment -> track delivery. DoorDash and Uber Eats use saga-like coordination to manage the complex multi-party workflow where any participant can fail or cancel.

---

## When NOT to Use It

This section is equally important. The saga pattern is frequently over-applied, and its complexity cost is consistently underestimated by teams adopting microservices for the first time.

### The Disqualifying Conditions

**A single database transaction suffices.** If all the data involved in the business operation lives in one database (or can be accessed within one service), use a regular transaction. This sounds obvious, but teams routinely split services prematurely, then discover they need sagas to coordinate what was previously a single transaction. The solution is not to add a saga — it is to reconsider the service boundary. A monolith or modular monolith with proper transaction boundaries eliminates entire categories of distributed coordination problems.

**Eventual consistency is unacceptable.** Some business domains have hard requirements for immediate consistency. Real-time trading systems, medical device control systems, and safety-critical infrastructure cannot tolerate windows of inconsistency. If the business says "the user must never see a partially completed state," sagas are the wrong tool. Consider keeping the data in a single database or using synchronous coordination with proper locking (accepting the availability trade-off).

**Compensating transactions are impractical or impossible.** If you cannot undo a step, you cannot include it in a saga's compensatable sequence. Common non-compensatable operations:
- Sending emails or SMS notifications (you cannot unsend them)
- Charging a credit card with a no-refund payment processor
- Triggering a physical process (printing a shipping label, dispatching a delivery vehicle)
- Publishing data to external partners with no delete API
- Regulatory submissions that cannot be retracted

If most steps in your workflow are non-compensatable, sagas become a poor fit. You need an alternative strategy: place non-compensatable steps last (as pivot transactions), use reservation/confirmation patterns, or accept that compensation is approximate (e.g., send a "cancellation notice" email rather than unsending the original).

**The team underestimates the complexity.** Implementing sagas correctly requires: designing compensating transactions for every step, handling partial failures during compensation itself, dealing with concurrent saga instances acting on the same data, implementing idempotency for every step (messages may be delivered more than once), managing timeouts and deadlocked sagas, building observability to trace saga execution across services. Teams that adopt the saga pattern without experience in distributed systems regularly spend 3-6 months debugging subtle consistency issues that would not have existed in a monolithic architecture. If your team has not shipped distributed systems before, start with a modular monolith.

**The number of steps is large (>7).** Sagas with many steps become exponentially harder to reason about. Each step adds a compensating transaction, a potential failure point, and interactions with concurrent sagas. A 10-step saga has 10 possible failure points, 10 compensating transactions, and hundreds of possible interleaving scenarios. Consider decomposing into smaller sagas or rethinking service boundaries.

**You are solving a data consistency problem caused by premature service decomposition.** If two services are always modified together, they probably should not be separate services. The "distributed monolith" antipattern is not fixed by adding a saga. It is fixed by merging the services or redesigning boundaries around true bounded contexts.

### The Complexity Tax Is Real

Production teams consistently report: "We spent more time implementing saga coordination than the actual business logic." The saga pattern introduces a new failure mode, consistency challenge, observability requirement, testing burden, and operational concern for every step. This cost is justified when you genuinely need cross-service transactions at scale. It is not justified when a simpler architecture would avoid the problem entirely.

---

## How It Works

### Choreography: Event-Driven Coordination

In choreography, there is no central coordinator. Each service publishes events after completing its local transaction, and other services subscribe to those events to trigger their next step.

```
Order Service          Inventory Service       Payment Service        Shipping Service
     |                       |                       |                       |
     |--- OrderCreated ----->|                       |                       |
     |                       |                       |                       |
     |                  [Reserve Stock]               |                       |
     |                       |                       |                       |
     |               InventoryReserved -------------->|                       |
     |                       |                       |                       |
     |                       |                  [Charge Card]                 |
     |                       |                       |                       |
     |                       |                PaymentCharged ---------------->|
     |                       |                       |                       |
     |                       |                       |                 [Create Shipment]
     |                       |                       |                       |
     |<---------------------------------------------- ShipmentCreated -------|
     |                       |                       |                       |
  [Mark Complete]            |                       |                       |
```

**Compensation flow (if Payment fails):**

```
Payment Service publishes PaymentFailed
  -> Inventory Service hears PaymentFailed -> unreserves stock -> publishes InventoryUnreserved
  -> Order Service hears PaymentFailed -> marks order as failed
```

**Choreography strengths:**
- No single point of failure — each service is autonomous
- Loose coupling — services communicate only through events
- Natural fit for simple, linear workflows with 3-4 steps
- Each service owns its logic completely

**Choreography weaknesses:**
- The overall saga flow is implicit — it exists only as the sum of all event subscriptions
- Difficult to understand, debug, and test as the number of services grows
- Adding a new step requires modifying event subscriptions across services
- Hard to implement global timeouts or saga-level retries
- Cyclic dependencies between services can create event storms
- No single place to view the current state of a saga instance

### Orchestration: Central Coordinator

In orchestration, a saga orchestrator (often called a saga execution coordinator or SEC) manages the entire flow. It sends commands to services and receives replies.

```
Saga Orchestrator
     |
     |--- CreateOrder -------> Order Service
     |<-- OrderCreated -------   |
     |
     |--- ReserveInventory ---> Inventory Service
     |<-- InventoryReserved --   |
     |
     |--- ChargePayment ------> Payment Service
     |<-- PaymentCharged -----   |
     |
     |--- CreateShipment -----> Shipping Service
     |<-- ShipmentCreated ----   |
     |
  [Saga Complete]
```

**Compensation flow (if Payment fails):**

```
Saga Orchestrator
     |
     |<-- PaymentFailed ------- Payment Service
     |
     |--- UnreserveInventory -> Inventory Service
     |<-- InventoryUnreserved    |
     |
     |--- CancelOrder --------> Order Service
     |<-- OrderCancelled ------  |
     |
  [Saga Compensated]
```

The orchestrator is typically implemented as a state machine. Each state represents a step in the saga, and transitions are triggered by command replies (success or failure). The orchestrator persists its state so it can recover from crashes.

**Orchestration strengths:**
- The entire saga flow is explicit and visible in one place
- Easy to add, remove, or reorder steps
- Centralized error handling and compensation logic
- Straightforward to implement timeouts, retries, and dead letter handling
- Easy to query the current state of any saga instance
- Better suited for complex workflows with branching, parallel steps, or conditional logic

**Orchestration weaknesses:**
- The orchestrator is a potential single point of failure (mitigated by making it stateless with durable state storage)
- Risk of coupling business logic into the orchestrator (it should only coordinate, not contain domain logic)
- Additional infrastructure component to deploy, monitor, and scale

### Compensating Transactions: Design Principles

Compensating transactions are the heart of the saga pattern. Designing them well is the difference between a saga that works and one that creates data inconsistency nightmares.

**Principle 1: Semantic, not physical undo.** A compensating transaction does not "roll back" in the database sense. It applies a new business operation that logically reverses the effect. "Unreserve inventory" is not a DELETE of the reservation row — it is a new transaction that increments available stock and marks the reservation as cancelled. The original reservation record should be preserved for audit trails.

**Principle 2: Compensating transactions must be idempotent.** Because messages can be delivered more than once (at-least-once delivery), a compensating transaction may be invoked multiple times. Calling "unreserve inventory" twice for the same saga instance must produce the same result as calling it once. Use idempotency keys (typically the saga instance ID) to detect and skip duplicate compensations.

**Principle 3: Compensating transactions must be retryable.** If a compensating transaction fails (network error, service down), it must be retried until it succeeds. A saga that fails to compensate leaves the system in an inconsistent state. Design compensations to be safe to retry indefinitely. Use exponential backoff with jitter.

**Principle 4: Commutative updates reduce conflicts.** Design data updates so that the order of application does not matter. Instead of "set stock = 50," use "increment stock by 5." This reduces conflicts when multiple sagas operate on the same data concurrently.

### Transaction Classification

Garcia-Molina's original paper and Chris Richardson's modern treatment classify saga transactions into three categories:

**Compensatable transactions:** Steps that can be undone by a compensating transaction. These are all steps before the pivot transaction. Examples: reserve inventory, create a pending order, place a hold on funds.

**Pivot transaction:** The go/no-go point of the saga. If the pivot transaction succeeds, the saga is committed to completing. If it fails, the saga must compensate all preceding steps. The pivot transaction is the step after which all remaining steps are retryable (guaranteed to eventually succeed). Example: charging the credit card is often the pivot — once charged, the saga proceeds to fulfillment steps that can be retried.

**Retryable transactions:** Steps that are guaranteed to eventually succeed (possibly after retries). These come after the pivot transaction. They do not need compensating transactions because they will always complete. Examples: sending a confirmation email, updating an analytics event, generating an invoice.

**The correct saga structure is:** Compensatable steps -> Pivot transaction -> Retryable steps. This ordering minimizes the window of inconsistency and ensures that compensation is always possible for steps that might need it.

### Semantic Locks

Semantic locks are an application-level mechanism to manage concurrent access when sagas operate on the same data. When a compensatable transaction creates or updates a record, it sets a flag indicating the record is "in progress" and may change.

```
-- When reserving inventory (compensatable step):
UPDATE inventory SET
  available_quantity = available_quantity - 5,
  saga_lock = 'ORDER-12345',        -- semantic lock
  lock_status = 'PENDING'           -- indicates in-progress saga
WHERE product_id = 'SKU-100';

-- Other sagas or queries can check lock_status before acting
-- When saga completes:
UPDATE inventory SET
  lock_status = 'COMMITTED',
  saga_lock = NULL
WHERE product_id = 'SKU-100' AND saga_lock = 'ORDER-12345';

-- When saga compensates:
UPDATE inventory SET
  available_quantity = available_quantity + 5,
  lock_status = 'COMPENSATED',
  saga_lock = NULL
WHERE product_id = 'SKU-100' AND saga_lock = 'ORDER-12345';
```

Other transactions can treat locked records with suspicion — either waiting, reading optimistically, or failing fast depending on the business rules.

### The Saga Log

The saga log (or saga state store) records the current state of every saga instance. For orchestration, the orchestrator persists:
- Saga instance ID
- Current step
- Status (STARTED, COMPENSATING, COMPLETED, FAILED)
- Input data for each step
- Timestamps for each transition
- Compensation progress (which steps have been compensated)

This log is critical for recovery. If the orchestrator crashes mid-saga, it reads the log on restart and resumes from the last recorded state. For choreography, each service maintains its own view of saga state, making recovery harder (one reason orchestration is generally preferred for complex sagas).

---

## Trade-Offs Matrix

| Dimension | Saga Benefit | Saga Cost |
|---|---|---|
| **Availability** | No global locks; each service can process independently | Compensating transactions add load during failures |
| **Consistency** | Eventual atomicity — all complete or all compensate | No isolation; intermediate states visible to other transactions |
| **Scalability** | Each service scales independently; no global coordinator bottleneck (choreography) | Orchestrator can become a bottleneck (orchestration) |
| **Complexity** | Well-defined pattern for cross-service transactions | Requires compensating transaction for every step; dramatically increases codebase |
| **Debuggability** | Orchestration provides clear execution trace | Choreography makes tracing extremely difficult |
| **Failure handling** | Explicit compensation logic for every failure mode | Compensation failures require additional handling (dead letter, manual intervention) |
| **Performance** | No distributed locks = lower latency per step | Total transaction time increases due to async coordination |
| **Data integrity** | Guarantees eventual consistency under normal operation | Lost updates, dirty reads, and fuzzy reads possible under concurrent sagas |
| **Testability** | Each step is a local transaction, testable in isolation | Testing all failure/compensation paths requires extensive integration testing |
| **Operational cost** | Handles partial failures gracefully in production | Requires saga-specific monitoring, alerting, and tooling |
| **Development velocity** | Established pattern with framework support | Initial implementation takes 3-10x longer than equivalent monolithic transaction |
| **Team cognitive load** | Clear mental model (sequence of steps + compensations) | Every developer must understand distributed systems failure modes |

### Choreography vs. Orchestration Decision

| Factor | Choreography | Orchestration |
|---|---|---|
| Number of services | 2-4 services | 4+ services |
| Flow complexity | Linear, no branching | Branching, parallel steps, conditionals |
| Coupling | Loose (event-based) | Moderate (orchestrator knows all services) |
| Visibility | Low (implicit flow) | High (explicit state machine) |
| Single point of failure | None | Orchestrator (mitigatable) |
| Adding new steps | Requires updating event subscriptions | Change orchestrator logic only |
| Timeout handling | Per-service | Centralized |
| Debugging | Difficult | Straightforward |
| Team autonomy | High (each team owns their events) | Lower (orchestrator team coordinates) |
| Recommended for | Simple, well-understood workflows | Complex, evolving business processes |

---

## Evolution Path

### Stage 1: Monolithic Transactions (Start Here)

Start with a monolith or modular monolith. All business operations execute within a single database transaction. This is the simplest, most reliable approach. Do not introduce sagas until you have a genuine need to decompose into separate services with separate databases.

### Stage 2: Synchronous Cross-Service Calls

When services are first extracted, teams often use synchronous HTTP calls within a single request. Service A calls Service B calls Service C, all within the same HTTP request. This works for simple cases but creates temporal coupling (all services must be available simultaneously), cascading failures, and increasing latency.

### Stage 3: Choreography-Based Sagas

For simple, linear workflows (3-4 services), introduce choreography-based sagas. Each service publishes events after completing its step. Compensating transactions are triggered by failure events. This is the lowest-overhead saga implementation but becomes hard to manage as workflows grow.

### Stage 4: Orchestration-Based Sagas

When workflows become complex (5+ services, branching logic, conditional steps), introduce a saga orchestrator. The orchestrator manages the state machine, coordinates steps, handles retries and timeouts, and invokes compensations on failure. This is the recommended approach for most production saga implementations.

### Stage 5: Workflow Engine

For long-running, complex business processes with human interaction, approval steps, timers, and complex branching, adopt a dedicated workflow engine (Temporal, Camunda, AWS Step Functions). These engines provide durable execution, built-in retry and compensation support, visual process monitoring, and versioning. This is the most sophisticated and most capable approach.

### Anti-evolution: Do Not Skip Stages

Teams that jump directly from Stage 1 to Stage 4 or 5 without understanding why they need sagas consistently over-engineer their solutions. Each stage should be driven by a concrete problem with the current approach, not by anticipated future complexity.

---

## Failure Modes

### 1. Incomplete Compensation

**The problem:** A compensating transaction fails partway through. The saga is now in a state where some steps are completed, some are compensated, and some are stuck.

**Real-world scenario:** An order saga charges a credit card (step 3) then fails to create a shipment (step 4). The orchestrator initiates compensation: refund the credit card (C3). But the payment gateway is temporarily down. The refund fails. The customer has been charged but has no order.

**Mitigation:**
- Retry compensating transactions with exponential backoff until they succeed
- After N retries, move to a dead letter queue for manual intervention
- Alert operations teams immediately when compensation fails
- Design compensations to be idempotent so retries are safe
- Implement a "saga janitor" process that periodically scans for stuck sagas

### 2. Non-Compensatable Actions

**The problem:** Some operations cannot be undone. Emails have been sent. Physical goods have been dispatched. External APIs have been called with no reversal endpoint.

**Real-world scenario:** A travel booking saga books a flight (step 1), sends a confirmation email (step 2), then fails to book the hotel (step 3). The email is already sent and cannot be unsent.

**Mitigation:**
- Place non-compensatable actions at the end of the saga (after the pivot transaction)
- Use the reservation/confirmation pattern: reserve first (compensatable), confirm last (retryable)
- For emails/notifications: send "pending" notifications and "confirmed" notifications separately
- Accept approximate compensation: send a "cancellation" email rather than unsending the original

### 3. Saga Coordinator Failure

**The problem:** The orchestrator crashes mid-saga. If saga state is lost, the saga is orphaned — some steps completed, no one driving completion or compensation.

**Mitigation:**
- Persist saga state to a durable store (database, event log) before each step
- On restart, the orchestrator reads persisted state and resumes from the last recorded step
- Use exactly-once processing semantics where possible (Kafka transactions, outbox pattern)
- Deploy the orchestrator with high availability (multiple replicas with leader election)

### 4. Interleaving Sagas (Isolation Anomalies)

**The problem:** Two sagas operating on the same data concurrently create anomalies that neither saga detects.

**Real-world scenario:** Saga A reserves the last 5 units of inventory. Saga B reads inventory and sees 5 units reserved (dirty read). Saga A then fails and compensates (unreserves the 5 units). Saga B proceeds assuming inventory is low and triggers a reorder. The reorder was unnecessary.

**Anomaly types:**
- **Lost updates:** Saga A modifies a record, Saga B overwrites it without seeing A's change
- **Dirty reads:** Saga B reads data that Saga A has modified but may still compensate
- **Fuzzy reads:** Saga B reads the same data twice and gets different values because Saga A modified it between reads

**Mitigation:**
- Semantic locks (application-level flags indicating in-progress sagas)
- Commutative updates (increment/decrement instead of absolute set)
- Pessimistic ordering: reorder saga steps to minimize dirty read windows
- Version numbers on records to detect concurrent modifications
- Accepting and designing for eventual consistency rather than fighting it

### 5. Timeout and Stuck Sagas

**The problem:** A saga step sends a command to a service and never receives a reply. The saga is stuck indefinitely.

**Mitigation:**
- Implement per-step timeouts in the orchestrator
- After timeout, retry the step (requires idempotency)
- After N retries, begin compensation
- Run a background "saga sweeper" that detects sagas stuck in a state for longer than a configured threshold
- Alert on stuck sagas for manual investigation

### 6. Message Ordering and Duplication

**The problem:** In event-driven choreography, messages may arrive out of order or be delivered multiple times. A compensation event may arrive before the original transaction event.

**Mitigation:**
- Design every step and every compensation to be idempotent
- Use saga instance IDs to correlate messages and detect duplicates
- Use sequence numbers or causality tracking to detect out-of-order delivery
- Choose messaging infrastructure with ordering guarantees per partition (Kafka)

### 7. Cascading Saga Failures

**The problem:** One saga's compensation triggers events that cause other sagas to fail and compensate, creating a cascade of compensations across the system.

**Mitigation:**
- Design services to handle "saga compensated" events gracefully
- Use circuit breakers to prevent cascading failures
- Rate-limit saga creation during periods of high failure
- Monitor saga failure rates and alert on anomalies

---

## Technology Landscape

### Temporal (Recommended for New Projects)

Temporal is an open-source durable execution platform originally created at Uber (as Cadence) and now developed by Temporal Technologies. It provides native saga pattern support with workflow-as-code.

**Saga support:** Write saga logic as code in Go, Java, TypeScript, Python, or .NET. Temporal guarantees workflow completion — if the worker crashes, Temporal replays the workflow from the last checkpoint. Compensation is expressed naturally using try/catch and a compensation stack. Built-in exponential retry, timeouts, and saga rollback.

**Strengths:** Code-native (no DSLs or YAML), durable execution guarantees, built-in retries and timeouts, excellent observability via Temporal Web UI, multi-language SDKs, active open-source community.

**Weaknesses:** Operational complexity of running Temporal server (Cassandra/PostgreSQL + Elasticsearch), learning curve for the replay-based execution model, Temporal Cloud pricing at scale ($25 per 1M actions).

### AWS Step Functions

AWS Step Functions is a serverless workflow orchestration service. Saga implementation uses the Amazon States Language (JSON/YAML) to define state machines with error handling and compensation.

**Saga support:** Define saga steps as states in a state machine. Use Catch blocks to trigger compensation states on failure. Step Functions handles retries, timeouts, and parallel execution. Integrates natively with Lambda, DynamoDB, SQS, SNS, and other AWS services.

**Strengths:** Fully managed (no infrastructure to operate), deep AWS ecosystem integration, visual workflow designer (Workflow Studio), pay-per-use pricing ($0.025 per 1,000 state transitions for Standard, $1.00 per 1M requests for Express).

**Weaknesses:** AWS vendor lock-in, limited to Amazon States Language for workflow definition, state payload limited to 256 KB, cold start latency for Lambda-backed steps, less expressive than code-based approaches.

### Camunda

Camunda is a BPMN-based process orchestration platform designed for enterprise workflows. It supports both cloud-hosted (Camunda 8) and self-hosted deployments.

**Saga support:** Model sagas as BPMN processes with compensation events. Camunda's engine handles the execution, retry, and compensation automatically. Supports visual process modeling, auditing, and process versioning.

**Strengths:** BPMN standard compliance, visual process modeling for business/developer collaboration, enterprise-grade auditing and compliance features, both cloud and on-premise deployment, strong Java ecosystem integration.

**Weaknesses:** BPMN overhead for simple workflows, steeper learning curve for non-Java teams, enterprise pricing, heavier operational footprint than Temporal.

### MassTransit (Automatonymous)

MassTransit is an open-source distributed application framework for .NET. It includes Automatonymous, a state machine library for implementing saga orchestration.

**Saga support:** Define sagas as state machines in C#. MassTransit handles message routing, saga persistence (Entity Framework, MongoDB, Redis, etc.), and correlation. Integrates with RabbitMQ, Azure Service Bus, Amazon SQS, and Kafka.

**Strengths:** Native .NET integration, flexible message broker support, mature and well-documented, active open-source community, no separate infrastructure beyond the message broker and saga persistence store.

**Weaknesses:** .NET only, requires understanding of state machine concepts, manual compensation logic.

### Axon Framework

Axon Framework is a Java-based framework for building event-driven microservices with built-in CQRS and saga support.

**Saga support:** Annotate Java classes with `@Saga`, define `@SagaEventHandler` methods for each step, and use `SagaLifecycle.end()` to complete the saga. Axon handles event routing, saga persistence, and correlation.

**Strengths:** Deep integration with CQRS and event sourcing, Java-native, Axon Server provides event store and message routing, well-suited for DDD-based architectures.

**Weaknesses:** Java/Kotlin only, Axon Server adds infrastructure complexity, strong opinions that may conflict with existing architecture, commercial licensing for Axon Server Enterprise.

### Eventuate Tram

Eventuate Tram is an open-source framework by Chris Richardson (author of "Microservices Patterns") specifically designed for implementing sagas in Java/Spring applications.

**Saga support:** Define saga orchestrators as Java classes with step definitions and compensations. Uses the transactional outbox pattern for reliable messaging. Supports both choreography and orchestration.

**Strengths:** Purpose-built for sagas, transactional outbox built-in, works with existing Spring applications, created by a leading authority on microservices patterns.

**Weaknesses:** Java/Spring only, smaller community than Temporal or MassTransit, less actively maintained than alternatives.

### Manual Implementation

For simple sagas (2-3 steps), manual implementation using a message broker (Kafka, RabbitMQ) and a saga state table is viable. This avoids framework dependencies but requires implementing:
- Saga state persistence
- Step coordination logic
- Compensation logic
- Idempotency handling
- Timeout detection
- Retry logic

This is recommended only for simple workflows where adopting a framework is not justified. For anything beyond 3-4 steps, use a framework or workflow engine.

### Technology Selection Guide

| Criterion | Temporal | Step Functions | Camunda | MassTransit | Axon |
|---|---|---|---|---|---|
| Language | Go, Java, TS, Python, .NET | JSON/YAML (ASL) | Java, REST API | C# (.NET) | Java/Kotlin |
| Hosting | Self-hosted or Cloud | AWS managed | Self-hosted or Cloud | Self-hosted | Self-hosted or Cloud |
| Saga complexity | Any | Moderate | Any | Moderate-High | Moderate-High |
| Learning curve | Moderate | Low (AWS users) | High | Moderate | High |
| Vendor lock-in | None | AWS | None | None | Moderate (Axon Server) |
| Operational overhead | High (self-hosted) | None | Moderate-High | Low | Moderate |
| Community | Large, growing | Very large (AWS) | Large (enterprise) | Medium (.NET) | Medium (Java/DDD) |

---

## Decision Tree

```
Do you need a transaction spanning multiple services?
├── No  --> Use a local database transaction. Stop here.
└── Yes
    ├── Is eventual consistency acceptable?
    │   ├── No  --> Reconsider service boundaries. Can you merge services?
    │   │         If not, consider synchronous 2PC (accepting availability cost)
    │   │         or redesign the business process to tolerate eventual consistency.
    │   └── Yes
    │       ├── Can every step be compensated?
    │       │   ├── No  --> Can non-compensatable steps be moved to the end (after pivot)?
    │       │   │         If yes, restructure the saga. If no, saga is a poor fit.
    │       │   │         Consider alternative patterns (reservation/confirmation, outbox only).
    │       │   └── Yes
    │       │       ├── How many services are involved?
    │       │       │   ├── 2-3 services, linear flow
    │       │       │   │   └── Choreography-based saga
    │       │       │   │       (or manual implementation with message broker)
    │       │       │   ├── 4-6 services, some branching
    │       │       │   │   └── Orchestration-based saga
    │       │       │   │       (Temporal, MassTransit, Eventuate Tram)
    │       │       │   └── 7+ services or complex branching/parallel steps
    │       │       │       └── Workflow engine (Temporal, Camunda, Step Functions)
    │       │       │           Consider decomposing into smaller sagas
    │       │       └── Does the team have distributed systems experience?
    │       │           ├── No  --> Start with a modular monolith. Learn the failure
    │       │           │         modes before distributing. Read "Microservices Patterns"
    │       │           │         by Chris Richardson before implementing.
    │       │           └── Yes --> Proceed with saga implementation.
    └── Is the "transaction" actually a long-running business process?
        └── Yes --> Consider a process manager or workflow engine instead of a saga.
            Sagas are for finite sequences of steps, not open-ended processes.
```

---

## Implementation Sketch

### Order Saga: Orchestration with Compensation

This sketch shows an order saga orchestrator managing four services. The orchestrator is a state machine that persists its state to a database.

```
Saga Definition:

  Step 1: CreateOrder           Compensation: CancelOrder
  Step 2: ReserveInventory      Compensation: UnreserveInventory
  Step 3: AuthorizePayment      Compensation: RefundPayment        <-- PIVOT
  Step 4: CreateShipment        (retryable, no compensation needed)
```

**Pseudocode — Saga Orchestrator:**

```python
class OrderSaga:
    def __init__(self, saga_id, order_data):
        self.saga_id = saga_id
        self.state = "CREATED"
        self.order_data = order_data
        self.compensation_stack = []

    def execute(self):
        try:
            # Step 1: Create Order (compensatable)
            order = self.order_service.create(
                saga_id=self.saga_id,
                data=self.order_data
            )
            self.compensation_stack.append(
                lambda: self.order_service.cancel(self.saga_id, order.id)
            )
            self.persist_state("ORDER_CREATED")

            # Step 2: Reserve Inventory (compensatable)
            reservation = self.inventory_service.reserve(
                saga_id=self.saga_id,
                items=self.order_data.items
            )
            self.compensation_stack.append(
                lambda: self.inventory_service.unreserve(self.saga_id, reservation.id)
            )
            self.persist_state("INVENTORY_RESERVED")

            # Step 3: Authorize Payment (PIVOT transaction)
            payment = self.payment_service.authorize(
                saga_id=self.saga_id,
                amount=self.order_data.total,
                payment_method=self.order_data.payment_method
            )
            # After pivot succeeds, saga is committed to completing.
            # Compensation for pivot is still possible (refund) but
            # all subsequent steps are retryable.
            self.compensation_stack.append(
                lambda: self.payment_service.refund(self.saga_id, payment.id)
            )
            self.persist_state("PAYMENT_AUTHORIZED")

            # Step 4: Create Shipment (retryable — will eventually succeed)
            self.shipping_service.create_shipment(
                saga_id=self.saga_id,
                order_id=order.id,
                address=self.order_data.shipping_address
            )
            self.persist_state("COMPLETED")

        except StepFailedException as e:
            self.compensate(e)

    def compensate(self, original_error):
        self.persist_state("COMPENSATING")
        while self.compensation_stack:
            compensation = self.compensation_stack.pop()
            try:
                retry_with_backoff(compensation, max_retries=10)
            except CompensationFailedException as e:
                # Compensation failed after retries — escalate
                self.dead_letter_queue.send(
                    saga_id=self.saga_id,
                    failed_compensation=compensation,
                    error=e
                )
                self.alert_operations(self.saga_id, e)
        self.persist_state("COMPENSATED")

    def persist_state(self, new_state):
        self.state = new_state
        self.saga_store.save(self.saga_id, self.state, self.compensation_stack)
```

**Pseudocode — Idempotent Service Handler:**

```python
class InventoryService:
    def reserve(self, saga_id, items):
        # Idempotency: check if this saga already reserved
        existing = self.db.find_reservation(saga_id=saga_id)
        if existing:
            return existing  # Already reserved, return existing reservation

        # Execute local transaction
        with self.db.transaction():
            reservation = Reservation(
                saga_id=saga_id,
                items=items,
                status="RESERVED",
                lock_status="PENDING"  # Semantic lock
            )
            self.db.save(reservation)
            for item in items:
                self.db.update_inventory(
                    product_id=item.product_id,
                    decrement=item.quantity
                )
        return reservation

    def unreserve(self, saga_id, reservation_id):
        # Idempotency: check if already unreserved
        reservation = self.db.find_reservation(saga_id=saga_id)
        if not reservation or reservation.status == "UNRESERVED":
            return  # Already compensated or never reserved

        with self.db.transaction():
            reservation.status = "UNRESERVED"
            reservation.lock_status = "COMPENSATED"
            self.db.save(reservation)
            for item in reservation.items:
                self.db.update_inventory(
                    product_id=item.product_id,
                    increment=item.quantity
                )
```

**Pseudocode — Choreography Variant (Event-Driven):**

```python
# Order Service
class OrderEventHandler:
    @on_event("OrderRequested")
    def handle_order_requested(self, event):
        order = self.create_order(event.order_data)
        self.publish("OrderCreated", order_id=order.id, items=event.items)

    @on_event("PaymentFailed")
    def handle_payment_failed(self, event):
        self.cancel_order(event.order_id)
        self.publish("OrderCancelled", order_id=event.order_id)

# Inventory Service
class InventoryEventHandler:
    @on_event("OrderCreated")
    def handle_order_created(self, event):
        try:
            reservation = self.reserve(event.order_id, event.items)
            self.publish("InventoryReserved",
                order_id=event.order_id,
                reservation_id=reservation.id)
        except InsufficientStockError:
            self.publish("InventoryReservationFailed",
                order_id=event.order_id)

    @on_event("PaymentFailed")
    def handle_payment_failed(self, event):
        self.unreserve(event.order_id)
        self.publish("InventoryUnreserved", order_id=event.order_id)

# Payment Service
class PaymentEventHandler:
    @on_event("InventoryReserved")
    def handle_inventory_reserved(self, event):
        try:
            payment = self.charge(event.order_id, event.amount)
            self.publish("PaymentCharged",
                order_id=event.order_id,
                payment_id=payment.id)
        except PaymentDeclinedError:
            self.publish("PaymentFailed", order_id=event.order_id)
```

### Temporal Workflow Implementation (Production-Grade)

```typescript
// saga-workflow.ts — Temporal workflow definition
import { proxyActivities, ApplicationFailure } from '@temporalio/workflow';
import type * as activities from './activities';

const { createOrder, cancelOrder,
        reserveInventory, unreserveInventory,
        authorizePayment, refundPayment,
        createShipment } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 },
});

export async function orderSaga(orderData: OrderData): Promise<OrderResult> {
  const compensations: (() => Promise<void>)[] = [];

  try {
    // Step 1: Create Order
    const order = await createOrder(orderData);
    compensations.push(() => cancelOrder(order.id));

    // Step 2: Reserve Inventory
    const reservation = await reserveInventory(order.id, orderData.items);
    compensations.push(() => unreserveInventory(reservation.id));

    // Step 3: Authorize Payment (Pivot)
    const payment = await authorizePayment(order.id, orderData.total);
    compensations.push(() => refundPayment(payment.id));

    // Step 4: Create Shipment (Retryable)
    const shipment = await createShipment(order.id, orderData.shippingAddress);

    return { orderId: order.id, shipmentId: shipment.id, status: 'COMPLETED' };
  } catch (err) {
    // Compensate in reverse order
    for (const compensation of compensations.reverse()) {
      try {
        await compensation();
      } catch (compensationErr) {
        // Log but continue compensating remaining steps
        console.error('Compensation failed, continuing:', compensationErr);
      }
    }
    throw ApplicationFailure.nonRetryable(
      `Order saga failed and compensated: ${err}`
    );
  }
}
```

---

## Cross-References

- **Event-Driven Architecture** — Choreography sagas rely on event-driven communication. Understanding event schemas, ordering, and event sourcing is essential.
- **Microservices** — The database-per-service pattern creates the need for cross-service transaction coordination that sagas provide.
- **Data Consistency** — Sagas implement eventual consistency. Understanding CAP theorem and consistency models is prerequisite knowledge.
- **Idempotency and Retry** — Every saga step and compensation must be idempotent due to at-least-once message delivery.
- **Distributed Systems Fundamentals** — Sagas operate under partial failures, network partitions, and message loss. Understanding distributed failure modes is essential.
- **Transactional Outbox** — The outbox pattern ensures local DB transactions and event publishing happen atomically. Sagas frequently use it for reliable step transitions.
- **CQRS** — Command Query Responsibility Segregation is often paired with sagas. Commands trigger saga steps; queries project eventual consistent state.

---

## Further Reading

- Garcia-Molina & Salem (1987). "Sagas." ACM SIGMOD: https://dl.acm.org/doi/10.1145/38713.38742
- Richardson, C. (2018). *Microservices Patterns.* Manning. Chapters 4-5 cover sagas in depth.
- Temporal: https://temporal.io/blog/saga-pattern-made-easy
- Azure Architecture Center: https://learn.microsoft.com/en-us/azure/architecture/patterns/saga
- AWS Prescriptive Guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html
- microservices.io: https://microservices.io/patterns/data/saga.html
