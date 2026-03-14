# Architecture Anti-Patterns
> A field guide to structural decisions that degrade systems over time. Each entry documents the pattern's
> seductive appeal, the damage it causes, and the concrete steps to reverse it. At least a third of these
> entries reference production incidents, public post-mortems, or documented losses at named organizations.
> Use this module during architecture reviews, tech-debt triage, and new-system design.
> **Domain:** Code
> **Anti-patterns covered:** 18
> **Highest severity:** Critical

---

## Table of Contents

1. [AP-01: Big Ball of Mud](#ap-01-big-ball-of-mud)
2. [AP-02: Golden Hammer](#ap-02-golden-hammer)
3. [AP-03: Architecture Astronaut](#ap-03-architecture-astronaut)
4. [AP-04: Distributed Monolith](#ap-04-distributed-monolith)
5. [AP-05: Lava Flow](#ap-05-lava-flow)
6. [AP-06: Vendor Lock-in](#ap-06-vendor-lock-in)
7. [AP-07: Inner Platform Effect](#ap-07-inner-platform-effect)
8. [AP-08: Accidental Complexity](#ap-08-accidental-complexity)
9. [AP-09: Circular Dependencies](#ap-09-circular-dependencies)
10. [AP-10: God Service](#ap-10-god-service)
11. [AP-11: Sinkhole Anti-pattern](#ap-11-sinkhole-anti-pattern)
12. [AP-12: Stovepipe System](#ap-12-stovepipe-system)
13. [AP-13: Swiss Army Knife](#ap-13-swiss-army-knife)
14. [AP-14: Reinventing the Wheel](#ap-14-reinventing-the-wheel)
15. [AP-15: Not Invented Here Syndrome](#ap-15-not-invented-here-syndrome)
16. [AP-16: Boat Anchor](#ap-16-boat-anchor)
17. [AP-17: Dead End Architecture](#ap-17-dead-end-architecture)
18. [AP-18: Ambiguous Viewpoint](#ap-18-ambiguous-viewpoint)
19. [Root Cause Analysis](#root-cause-analysis)
20. [Self-Check Questions](#self-check-questions)
21. [Code Smell Quick Reference](#code-smell-quick-reference)

---

## Anti-Pattern Entries

### AP-01: Big Ball of Mud

**Also known as:** Shantytown, Spaghetti Architecture, Organic Growth
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
A system with no discernible architecture. Modules reference each other arbitrarily. Business logic is
scattered across controllers, database triggers, stored procedures, and utility classes. There are no
enforced layer boundaries. Package diagrams look like a fully connected graph. New developers need months
of tribal knowledge transfer before making safe changes.

**Why developers do it:**
Shipping pressure. The first prototype works, and nobody allocates time to refactor before the next
feature. Each shortcut is individually rational: "We'll clean it up later." Foote and Yoder documented
this in their seminal 1997 paper -- the Big Ball of Mud is the dominant architecture in real-world
systems precisely because it requires zero upfront investment.

**What goes wrong:**
- Change amplification: a single business rule change touches 15+ files across unrelated modules.
- Twitter's original Ruby on Rails monolith buckled under 1,444% user growth (2008-2009). The "Fail Whale"
  error page became a cultural icon. Outages were so frequent that the company undertook a multi-year
  migration to JVM-based services, eventually achieving a 50x throughput improvement (from ~300 to
  ~15,000 requests/sec per host).
- Healthcare.gov crashed within two hours of its October 2013 launch. Only six people completed
  enrollment on day one. Over 50 contractors had built subsystems that could not communicate, with
  insufficient integration architecture. The recovery took months and cost hundreds of millions.
- Research data-mining expeditions have found that 30-50% of code in complex legacy systems is not
  understood or documented by anyone currently working on the project.

**The fix:**
1. Identify bounded contexts using domain-driven design (DDD).
2. Draw module boundaries and enforce them with build tooling (e.g., ArchUnit, dependency-cruiser).
3. Strangle-fig pattern: route traffic through a facade, replacing internals module by module.
4. Establish an Architecture Decision Record (ADR) process so boundaries persist.
5. Budget 20% of each sprint for structural improvement, not just feature work.

**Detection rule:**
Flag when any single module has incoming dependencies from more than 30% of all other modules, or when
the average fan-out per module exceeds 10.

---

### AP-02: Golden Hammer

**Also known as:** Law of the Instrument, Maslow's Hammer, Silver Bullet Syndrome
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
One technology, framework, or pattern is applied to every problem in the organization. All data goes into
a relational database regardless of access patterns. All communication is synchronous REST regardless of
latency requirements. All logic lives in stored procedures, or conversely, zero logic lives in the
database. The tech stack is chosen based on team familiarity rather than problem fit.

**Why developers do it:**
Two drivers: (1) deep expertise in a tool creates cognitive bias toward applying it everywhere, and
(2) sunk-cost justification -- a company spent $2M licensing an enterprise platform and now must use it
for everything to "get the ROI." As Abraham Maslow put it: "If all you have is a hammer, everything
looks like a nail."

**What goes wrong:**
- Enterprise systems that move all business logic into stored procedures create performance bottlenecks,
  prevent horizontal scaling, and make the database a single point of failure. One documented enterprise
  system used stored procedures for business logic, data validation, and workflow orchestration,
  resulting in a brittle, unmaintainable codebase tied to a single database vendor.
- Organizations that force MongoDB into relational use cases (or PostgreSQL into document-store use
  cases) spend months fighting impedance mismatches that a purpose-built tool would avoid.
- The XML-for-everything era of the early 2000s produced configuration systems so verbose that the
  config files were harder to maintain than the code they configured (e.g., early J2EE deployment
  descriptors).

**The fix:**
1. Maintain a technology radar with explicit "use for" and "do not use for" guidance.
2. Require architecture decision records (ADRs) that document alternatives considered.
3. Run proof-of-concept spikes with at least two candidate technologies for non-trivial problems.
4. Rotate team members across stacks to broaden collective expertise.

**Detection rule:**
Flag when more than 80% of services share the same data store type despite having different access
patterns (graph, time-series, document, relational, key-value).

---

### AP-03: Architecture Astronaut

**Also known as:** Ivory Tower Architect, Over-Abstraction, Speculative Generality
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Layers of abstraction that solve theoretical future problems nobody has today. A "messaging framework"
that wraps a queue that wraps another queue. A plugin system for an application with one plugin. An
internal DSL that takes longer to learn than the underlying language. Interface hierarchies six levels
deep where a single concrete class would suffice. The architecture diagram is impressive; the working
software is late.

**Why developers do it:**
Joel Spolsky named this in 2001: architects "go too far up, abstraction-wise, and run out of oxygen."
They see patterns across problems and build for the generalized case. It feels like good engineering.
Resume-driven development also plays a role -- building a distributed event-sourcing system is more
exciting to talk about than a three-table CRUD app.

**What goes wrong:**
- Spolsky's original critique targeted architects who "don't solve an actual problem -- they solve
  something that appears to be the template of a lot of problems." John Carmack echoed this,
  identifying "a class of programmers who only want to talk about things from the highest level."
- The Segway is a hardware analogy: over-engineered with dual redundant motors, dual batteries, and
  custom components for every subsystem. The result was a $5,000 device that sold 5,000 units in its
  first two years instead of the projected millions. Technical perfection did not equal product-market
  fit.
- Teams that build internal platforms with DSLs often find that only the original author can maintain
  them. When that person leaves, the abstraction becomes a liability.

**The fix:**
1. Apply YAGNI (You Aren't Gonna Need It) ruthlessly. Build for today's requirements.
2. Limit abstraction depth: if a call chain passes through more than 3 layers of indirection before
   doing real work, compress it.
3. Require every abstraction to justify itself with at least two current (not future) consumers.
4. Time-box design phases. If the architecture diagram takes more than 2 days, start building and
   let the design emerge.

**Detection rule:**
Flag interfaces or abstract classes with exactly one implementation (outside of DI boundaries). Flag
call chains deeper than 5 that perform no transformation at each intermediate step.

---

### AP-04: Distributed Monolith

**Also known as:** Microliths, Coupled Microservices, Distributed Ball of Mud
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
The system has been decomposed into separately deployed services, but the services cannot be deployed,
tested, or released independently. A change to Service A requires coordinated changes to Services B, C,
and D. Shared databases, synchronous call chains, and shared libraries with business logic bind the
services together. You have all the operational complexity of microservices with none of the benefits.

**Why developers do it:**
Microservices became the default architecture heuristic circa 2015. Teams split monoliths along
technical boundaries (UI service, API service, data service) instead of business boundaries. Shared
database schemas were kept "for convenience." Synchronous HTTP chains replaced in-process function
calls without rethinking coupling.

**What goes wrong:**
- Deployment coupling: changing a shared database column requires synchronized releases across all
  dependent services, often with downtime windows.
- Cascading failures: a downstream service timeout propagates up the synchronous chain, taking out
  the entire request path. Without circuit breakers, a single slow service can brown-out the system.
- Etsy documented the pain of a distributed monolith during their migration, adopting a gradual
  strangler strategy starting with non-critical services to avoid big-bang rewrites.
- Spotify, running 810+ microservices across 90 teams, found that the biggest complexity was not
  within individual services but in how they interact. They shifted testing strategy from unit-heavy
  to integration-heavy ("Testing Honeycomb") to catch coupling issues early.

**The fix:**
1. Draw service boundaries around business capabilities (DDD bounded contexts), not technical layers.
2. Each service owns its data store -- no shared databases.
3. Prefer asynchronous messaging (events) over synchronous HTTP for inter-service communication.
4. Enforce the "independent deployability" test: can you deploy any service without touching others?
5. Use consumer-driven contract testing (Pact) to catch integration drift without end-to-end tests.

**Detection rule:**
Flag services that share a database schema. Flag services that require coordinated deployment (release
trains). Measure deployment coupling: if >20% of deploys require multi-service changes, investigate.

---

### AP-05: Lava Flow

**Also known as:** Dead Code, Fossilized Code, 36-Month Sediment
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Production code that nobody understands, nobody owns, and nobody dares remove. Entire classes marked
`@Deprecated` years ago still receive traffic. Feature flags from 2019 are still toggled on. Migration
scripts from three database versions ago sit in the deployment pipeline. The code "works" so everyone
builds around it, layering new logic on top of an unexamined foundation.

**Why developers do it:**
Fear. "What if something depends on it?" In research-originated systems, experimental code gets promoted
to production without cleanup. In product teams, aggressive deadlines mean proofs-of-concept get shipped
directly. Developer turnover means institutional knowledge about what code is active evaporates.

**What goes wrong:**
- Knight Capital, August 1, 2012: deprecated "Power Peg" trading code had been left in production for
  years. During a deployment, one of eight servers did not receive the updated code (the deployment
  script failed silently on SSH connection error). The old server activated the dead Power Peg code,
  which sent millions of unintended orders in 45 minutes. Loss: $440 million. Knight was acquired by
  a rival within a year.
- Research teams examining legacy systems regularly find 30-50% of the codebase is dead or orphaned,
  yet it still increases compile times, confuses developers, and creates false positives in security
  scans.
- One documented migration project found an 11,000-line file in a 10-year-old internal application
  that no one could explain or safely refactor.

**The fix:**
1. Run code coverage in production (not just tests) to identify truly unreachable code paths.
2. Use feature-flag cleanup sprints: any flag older than 90 days gets a ticket to remove it.
3. Implement a "code ownership" model: every file has an owning team. Unowned files get triaged
   quarterly.
4. Delete deprecated code aggressively. Version control is your safety net -- you can always recover it.
5. Add deployment verification that ensures all target servers received the same artifact.

**Detection rule:**
Flag code with zero production execution over a 90-day window. Flag `@Deprecated` annotations older
than 6 months. Flag feature flags with no expiry date.

---

### AP-06: Vendor Lock-in

**Also known as:** Platform Dependency, Cloud Handcuffs, Proprietary Trap
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Core business logic is tightly coupled to a specific vendor's proprietary APIs, data formats, or
infrastructure. Database queries use vendor-specific SQL extensions. Business workflows are built inside
a SaaS platform's automation engine. Data is stored in a proprietary format with no export path.
Switching vendors would require a rewrite, not a migration.

**Why developers do it:**
Vendor-specific features ship faster than abstractions. AWS Lambda + DynamoDB + Step Functions
produces a working system in weeks. Building vendor-neutral equivalents takes months. Vendor
sales teams actively encourage deep integration. Cloud credits and startup programs subsidize
the initial coupling.

**What goes wrong:**
- A documented healthcare organization built its patient management system on AWS-specific services
  over three years. When AWS increased pricing by 40%, they discovered migration would require a
  complete application rewrite, $2M+ in data migration costs for 50TB of patient data, an 18-month
  timeline, and staff retraining. Total estimated switching cost: $8.5 million.
- A company migrating 300 applications to cloud found that migrating just five applications blew
  the entire year's migration budget due to unanticipated storage and egress costs.
- Vendor lock-in is cited as a top barrier to cloud adoption in enterprise surveys, particularly
  because the lack of cross-cloud standardization means skills, tooling, and data formats are
  non-transferable.

**The fix:**
1. Use the "hexagonal architecture" (ports and adapters) pattern: business logic never imports
   vendor-specific packages.
2. Wrap vendor APIs behind thin adapter layers with integration tests against both the real API
   and a local stub.
3. Store data in open formats (Parquet, JSON, PostgreSQL-compatible SQL) regardless of the
   underlying engine.
4. Calculate switching cost annually. If it exceeds 6 months of revenue, treat it as a risk item.
5. Negotiate data portability and API stability guarantees in vendor contracts.

**Detection rule:**
Flag import statements from vendor-specific SDKs in business logic layers (not infrastructure layers).
Count vendor-specific API calls: if >50% have no abstraction layer, flag for review.

---

### AP-07: Inner Platform Effect

**Also known as:** Second System Effect (related), Greenspun's Tenth Rule, Meta-System
**Frequency:** Occasional
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**
A system so configurable that it becomes a poorly implemented replica of the platform it runs on.
The database stores "entity, key, value" triples instead of typed tables -- effectively reimplementing
a database inside a database. A rules engine becomes a Turing-complete scripting language that only
programmers can configure. A workflow tool grows conditional branching, variable assignment, and
error handling until it is an inferior programming language.

**Why developers do it:**
The initial goal is flexibility: "business users should be able to configure everything without code
changes." Each configuration option feels like a reasonable request. Over years, the configuration
language accretes loops, conditionals, and data transformations until it has accidentally become a
programming language -- but without type checking, debugging tools, version control, or testing
frameworks.

**What goes wrong:**
- Enterprise rules engines frequently exhibit the Inner Platform Effect. The configuration becomes so
  complex that only developers can modify it, defeating the original "no-code" goal, but now they must
  work in an inferior environment with no IDE support.
- Entity-Attribute-Value (EAV) database schemas trade the query optimizer's knowledge of data types
  for "flexibility." Result: queries that should take milliseconds require full table scans, JOIN
  explosions, and application-layer type casting. Healthcare systems using EAV for clinical data
  routinely hit performance walls at scale.
- Firefox's extension system grew so complex that add-on developers effectively built full
  applications (FTP clients, file browsers) inside the browser, duplicating OS functionality on a
  more restricted platform.

**The fix:**
1. Define a "configuration complexity budget." If a config option requires conditional logic, it
   belongs in code, not configuration.
2. Use feature flags for on/off decisions, not for behavioral specification.
3. If business users need to express logic, provide a constrained DSL with explicit bounds, not a
   Turing-complete language.
4. Audit configuration files quarterly: if the average config file exceeds 200 lines, the system
   has likely crossed the inner-platform threshold.

**Detection rule:**
Flag configuration files that contain conditional statements, loops, or function definitions. Flag
EAV-pattern tables (entity_id, attribute_name, attribute_value) in schemas.

---

### AP-08: Accidental Complexity

**Also known as:** Incidental Complexity, Self-Inflicted Complexity
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Very Hard

**What it looks like:**
The system is harder to understand and modify than the problem domain requires. Fred Brooks
distinguished "essential complexity" (inherent in the problem) from "accidental complexity"
(introduced by our tools and design choices). Accidental complexity manifests as: unnecessary
abstraction layers, framework boilerplate that dwarfs business logic, build systems that take
20 minutes because of over-modularization, six YAML files to deploy a single endpoint.

**Why developers do it:**
Accidental complexity accretes through individually rational decisions: adopting a framework "everyone
uses," adding a caching layer "for performance" before measuring, splitting a service "because
microservices are best practice." Each choice adds cognitive overhead. Brooks argued in "No Silver
Bullet" (1986) that most of the effort in modern software engineering has shifted from essential to
accidental complexity.

**What goes wrong:**
- Healthcare.gov's 2013 failure was partly accidental complexity: 50+ contractors each building
  subsystems with different frameworks, integration patterns, and deployment models. The
  integration architecture itself became harder to manage than any individual business rule.
- Teams that adopt Kubernetes for a three-service system spend more time on infrastructure YAML
  than on business logic. The complexity of the deployment platform exceeds the complexity of the
  application.
- Over-modularized codebases where a single business operation spans 12 npm packages, each with
  its own build pipeline, versioning scheme, and changelog.

**The fix:**
1. Measure complexity: track lines of infrastructure code vs. business logic code. If infra > 50%,
   investigate.
2. Apply the "boring technology" principle (Dan McKinley): choose well-understood tools with known
   failure modes over novel tools with unknown failure modes.
3. Regularly ask: "If we were building this from scratch today, would we make this choice?" If no,
   file a simplification ticket.
4. Run "complexity retrospectives" where the team identifies the three most confusing parts of the
   system and proposes simplifications.

**Detection rule:**
Flag projects where configuration/infrastructure files outnumber source files. Flag build times that
exceed 5 minutes for projects under 50k LOC. Flag dependency trees deeper than 5 levels.

---

### AP-09: Circular Dependencies

**Also known as:** Mutual Dependency, Dependency Cycle, Tangled Modules
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Module A depends on Module B, which depends on Module C, which depends on Module A. The cycle makes
it impossible to build, test, or deploy any module in isolation. Changes in any module can ripple
unpredictably through the cycle. Build systems may fail or produce non-deterministic results.

**Why developers do it:**
Organic growth. A utility module adds a convenience method that needs a type from a business module.
A shared library grows bidirectional references for "ease of use." In package-per-feature architectures,
features that interact naturally develop cross-references. Without build-time cycle detection, the
cycles go unnoticed until they block a refactoring effort.

**What goes wrong:**
- The npm left-pad incident (March 2016) exposed the fragility of deep dependency chains. When
  developer Azer Koculu unpublished 250+ packages from npm after a dispute with Kik Messenger,
  thousands of projects -- including Babel and React -- broke. Facebook, PayPal, Netflix, and
  Spotify were affected. npm subsequently blocked unpublishing packages that other projects depend on.
  While not a circular dependency per se, it demonstrated how dependency graphs become fragile attack
  surfaces.
- Circular dependencies in C++ codebases cause compilation order issues that non-deterministically
  break builds. Teams waste hours on "it builds on my machine" investigations.
- Java module systems (JPMS) and Go explicitly forbid circular imports at the language level because
  the designers recognized the architectural damage they cause.

**The fix:**
1. Enable cycle detection in your build tool (eslint-plugin-import, ArchUnit, Go compiler).
2. Break cycles with dependency inversion: extract a shared interface into a third module that both
   original modules depend on.
3. Use the Acyclic Dependencies Principle (ADP): the dependency graph of packages must be a
   directed acyclic graph.
4. Run dependency graph visualization (e.g., Madge, JDepend) in CI and fail the build on new cycles.

**Detection rule:**
Run `madge --circular` (JS/TS), `ArchUnit` cycle checks (Java), or `go vet` (Go) in CI. Zero
tolerance for new cycles.

---

### AP-10: God Service

**Also known as:** God Object, Blob, Monster Service, Mega-Service
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
A single service or class that handles order creation, payment processing, inventory management,
notification dispatch, user authentication, and report generation. It has 50+ endpoints, 200+ database
tables, and a deployment that takes 45 minutes. Every team needs to touch it for every feature. Merge
conflicts are a daily occurrence.

**Why developers do it:**
It starts as a clean service with a single responsibility. Over time, related features gravitate toward
it because "it already has the data." Adding an endpoint to an existing service is faster than creating
a new service with its own deployment pipeline, monitoring, and on-call rotation. The service accretes
responsibilities like a snowball.

**What goes wrong:**
- God Services are effectively microservice-era monoliths. They cannot be scaled independently --
  a spike in notification traffic forces scaling the entire service, including the payment processing
  components that do not need additional capacity.
- Testing becomes intractable: the service's test suite takes hours, so developers skip tests.
  Confidence drops, bugs increase, and the team enters a vicious cycle.
- In e-commerce platforms, a God "OrderService" that handles the full order lifecycle (creation,
  payment, fulfillment, returns, analytics) becomes the bottleneck for every product team. Feature
  velocity drops as teams queue changes behind each other.

**The fix:**
1. Apply the Single Responsibility Principle at the service level: each service should have one
   reason to change.
2. Use the "strangler fig" to extract cohesive subdomains into new services.
3. Measure service size: lines of code, number of endpoints, number of owning teams. If any metric
   is 3x the median service, investigate splitting.
4. Limit service ownership to one team. If multiple teams need to change a service, it is too large.

**Detection rule:**
Flag services with >30 API endpoints. Flag services with >100 database tables. Flag services modified
by >2 teams in a single sprint.

---

### AP-11: Sinkhole Anti-pattern

**Also known as:** Pass-Through Layers, Ceremonial Architecture, Layer Tax
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Requests pass through multiple architectural layers (controller -> service -> repository -> DAO ->
database) with no transformation, validation, or business logic at each layer. The service layer
simply calls the repository. The repository simply calls the DAO. Each layer adds latency, boilerplate,
and a place for bugs to hide -- without contributing value.

**Why developers do it:**
Layered architecture is taught as best practice. Templates and scaffolding tools generate all layers by
default. Developers add layers "for future flexibility" -- the service layer is empty now but "might
need business logic later." Removing a layer feels like architectural regression.

**What goes wrong:**
- The 80/20 rule applies: if more than 20% of your requests are simple pass-through with no logic
  in intermediate layers, you have a sinkhole problem. When the ratio inverts (80% pass-through),
  the architecture is pure ceremony.
- Each pass-through layer adds ~0.1-0.5ms of latency. Across 5 layers and 50 service calls per
  page load, this adds 25-125ms of pure waste.
- Developers lose trust in the layer structure. If the service layer is usually empty, they start
  putting business logic in controllers or repositories "because it doesn't matter where it goes."
  The architecture degrades into a Big Ball of Mud.

**The fix:**
1. Audit layer utilization: for each layer, count what percentage of methods perform actual
   transformation or validation vs. pure delegation.
2. Make layers optional (open layered architecture) for simple CRUD paths while maintaining them
   for complex business logic paths.
3. Remove empty layers. YAGNI applies to architecture, not just code. Add them back when there is
   a concrete need.
4. Use vertical slices (feature-based organization) instead of horizontal layers for simple domains.

**Detection rule:**
Flag service-layer methods that contain only a single delegation call to the layer below with no
additional logic. Alert when >50% of methods in a layer are pure pass-through.

---

### AP-12: Stovepipe System

**Also known as:** Silo Architecture, Island Automation, Integration Spaghetti
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Multiple subsystems within an organization that each solve overlapping problems but cannot share data
or functionality. The sales team has a CRM. Marketing has a CDP. Support has a ticketing system. Each
has a different model for "customer." Each was integrated point-to-point with ad hoc ETL scripts. There
are 15 different "sources of truth" for customer email addresses.

**Why developers do it:**
Organizational structure drives architecture (Conway's Law). Each department buys or builds its own
system under its own budget, timeline, and technical leadership. Integration is an afterthought.
When integration is attempted, it is done point-to-point because "we just need to sync these two
systems" -- repeated 20 times.

**What goes wrong:**
- Point-to-point integrations scale as O(n^2): 5 systems = 10 connections, 10 systems = 45
  connections, 20 systems = 190 connections. Each connection is a maintenance liability.
- Data inconsistency becomes the norm. A customer updates their address in the CRM, but the change
  does not propagate to the billing system for 48 hours, causing failed deliveries.
- Government systems are notorious stovepipes. The Healthcare.gov failure was partly a stovepipe
  problem: eligibility verification, plan comparison, and enrollment were built by different
  contractors with no shared integration architecture.

**The fix:**
1. Introduce an event bus or integration platform as a single backbone for inter-system communication.
2. Define canonical data models for shared entities (customer, order, product).
3. Use the "anti-corruption layer" pattern when integrating with legacy stovepipes.
4. Budget integration architecture as a first-class concern, not an afterthought.

**Detection rule:**
Count point-to-point integrations between systems. If the count exceeds N*(N-1)/4 (half the theoretical
maximum), flag for consolidation into an event backbone.

---

### AP-13: Swiss Army Knife

**Also known as:** Kitchen Sink Interface, Fat Interface, God Interface, Bloated API
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
An interface or API with an excessive number of methods attempting to serve every possible consumer.
A `UserService` with 85 methods covering CRUD, search, analytics, export, notification preferences,
A/B test assignment, and audit logging. A REST API where every resource has 30 query parameters.
A library whose `README.md` is longer than most applications.

**Why developers do it:**
The designer tries to anticipate every possible use case. Each additional method is cheap in isolation.
The interface grows incrementally -- nobody notices it has 60 methods until a new team member tries
to implement it and finds the contract incomprehensible.

**What goes wrong:**
- Violates the Interface Segregation Principle (ISP): clients are forced to depend on methods they
  do not use. A mobile client that only needs `getUser()` must import an interface that includes
  `generateAuditReport()`.
- Large interfaces resist change: modifying any method risks breaking all implementors. Versioning
  becomes a nightmare.
- Testing cost explodes: mock implementations must stub 60 methods even when the test only
  exercises one.

**The fix:**
1. Apply ISP: split large interfaces into role-specific interfaces (e.g., `UserReader`,
   `UserWriter`, `UserSearcher`).
2. Use the CQRS pattern to separate read and write interfaces.
3. For REST APIs, use resource-oriented design with focused endpoints rather than parameter-heavy
   catch-all endpoints.
4. Limit interface size: if an interface has more than 7 methods, evaluate whether it has a single
   cohesive responsibility.

**Detection rule:**
Flag interfaces with >10 methods. Flag API endpoints with >8 query parameters. Flag classes that
implement an interface but throw `NotImplementedException` for >20% of methods.

---

### AP-14: Reinventing the Wheel

**Also known as:** Custom Everything, Bespoke Syndrome, DIY Framework
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
The team writes a custom ORM, a custom logging framework, a custom HTTP client, a custom test runner --
all solving problems with mature, well-tested open-source solutions. The custom code lacks documentation,
has no community, and is maintained by one person. Within the same enterprise, multiple teams have each
built their own CSV parser, date utility library, or message queue wrapper.

**Why developers do it:**
"Existing solutions don't exactly fit our needs." This is sometimes true, but often the gap between an
existing solution and the custom need is 5%, while the custom solution requires 100% of the maintenance
burden. Engineers also enjoy building foundational tools -- it is more intellectually stimulating than
wiring up a library.

**What goes wrong:**
- A documented enterprise had multiple internal solutions for the same problem: two CSV parsers,
  three message queue wrappers, four date utility libraries. Each had different bugs, different
  APIs, and different levels of maintenance.
- Custom ORMs are a recurring example: teams build "just a thin wrapper" that grows into a
  full-featured but poorly tested query builder without migration support, connection pooling,
  or the decade of edge-case fixes that mature ORMs contain.
- Maintenance cost compounds: the custom logging framework needs to support structured logging,
  then log rotation, then log shipping. Each feature is a multi-week project that a library
  provides for free.

**The fix:**
1. Default to well-maintained open-source libraries. Require an ADR with a cost-benefit analysis
   to justify building custom.
2. If customization is needed, extend existing libraries via plugins/middleware rather than forking
   or replacing.
3. Audit internal codebases for duplicate utility implementations. Consolidate to one.
4. Only build custom when the problem is truly novel or the existing solutions have fundamental
   architectural mismatches (not feature gaps).

**Detection rule:**
Flag internal packages that overlap with top-100 npm/PyPI/Maven packages in functionality. Flag
utility modules with <80% test coverage.

---

### AP-15: Not Invented Here Syndrome

**Also known as:** NIH Syndrome, Build Bias, Ego-Driven Development
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Systematic rejection of external solutions in favor of internal builds, driven by organizational
pride rather than technical merit. The team builds a custom CI/CD system instead of using GitHub
Actions. The company writes an internal chat application instead of buying Slack. The engineering
org rewrites a battle-tested open-source library because "we can do it better."

**Why developers do it:**
Distrust of external code ("we don't control the roadmap"). Ego ("our engineers are better").
Misaligned incentives (building internal tools is promotable; integrating a vendor is not). In
large organizations, teams are unaware that other internal teams have already solved the same problem.

**What goes wrong:**
- Microsoft reportedly had four different internal systems for telemetry collection and analysis,
  dozens of IL code analyzer clones, and hundreds of custom collection implementations -- massive
  duplication of effort across the organization.
- One documented company built two separate chat systems: one for customer communication and one
  for internal communication, when a single platform with role-based access would have sufficed.
- Kodak rejected Chester Carlson's xerography invention and Edwin Land's Polaroid process due to
  NIH bias, missing two of the most transformative imaging technologies of the 20th century.
- NIH delays time-to-market. While the team spends 6 months building a custom solution, competitors
  ship with off-the-shelf components and iterate on features instead of infrastructure.

**The fix:**
1. Implement a "build vs. buy" checklist that is required for any new component. Include total cost
   of ownership over 3 years, not just initial build cost.
2. Create visibility into internal tools: maintain an internal tool registry so teams can discover
   existing solutions before building new ones.
3. Reward integration and reuse in performance reviews, not just novel creation.
4. Set a "maintenance tax" estimate: any custom-built component must budget 20% of its initial build
   cost annually for maintenance.

**Detection rule:**
Flag new internal projects that overlap in functionality with widely-adopted open-source tools. Flag
internal tool registries where >3 entries solve the same problem.

---

### AP-16: Boat Anchor

**Also known as:** Dead Weight, Just-in-Case Code, Speculative Code, YAGNI Violation
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Code, libraries, services, or infrastructure components that are no longer used but remain in the
codebase "just in case." A database table that hasn't been written to in two years. A microservice
with zero traffic. A library dependency imported in `package.json` but never referenced. Commented-out
code blocks with notes like "// might need this later."

**Why developers do it:**
Loss aversion: deleting code feels risky even when version control makes recovery trivial. Sunk-cost
fallacy: "we spent three sprints building this; we can't just throw it away." Uncertainty: "the PM
said we might bring this feature back." Cargo culting: the dependency was in the project template and
nobody questioned it.

**What goes wrong:**
- Developers waste time reading, debugging, and trying to understand boat-anchor code during
  incident response. During a production outage, an engineer might spend 30 minutes tracing
  through dead code paths before realizing they are irrelevant.
- Unused dependencies introduce security vulnerabilities. A library you never call still appears
  in your dependency tree and may have known CVEs.
- Build times increase. Compilation includes boat-anchor modules. Test suites run boat-anchor tests.
  Docker images bloat with unused libraries.
- The Knight Capital disaster ($440M loss) was fundamentally a boat anchor problem: dead Power Peg
  code sat in production for years until a deployment error reactivated it.

**The fix:**
1. Run dependency analysis tools (`depcheck` for npm, `vulture` for Python, `unused` for Go) in CI.
2. Delete commented-out code on sight. Git preserves history.
3. Track service traffic: any service or endpoint with zero requests over 30 days gets a
   decommission ticket.
4. Enforce the YAGNI principle: don't write code for features that aren't in the current iteration.

**Detection rule:**
Flag unused imports and dependencies in CI. Flag services with zero traffic over 30 days. Flag
commented-out code blocks longer than 5 lines.

---

### AP-17: Dead End Architecture

**Also known as:** Technology Dead End, Evolutionary Dead End, Upgrade Trap
**Frequency:** Occasional
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
The system depends on a technology that has been abandoned by its maintainer and has no migration path.
A framework that stopped receiving security patches. A database that was acquired and discontinued. A
proprietary API that the vendor sunset. The system works today but cannot evolve: no security updates,
no compatibility with modern tooling, no community to answer questions.

**Why developers do it:**
The technology was a reasonable choice at selection time. Market dynamics are unpredictable: vendors
get acquired, open-source maintainers burn out, corporate priorities shift. Teams often ignore
end-of-life announcements because migration is expensive and the system "still works."

**What goes wrong:**
- Systems running on Python 2 after its January 2020 EOL faced an accelerating list of unpatched
  vulnerabilities with no upstream fixes.
- Adobe Flash-dependent web applications became non-functional overnight when browsers removed
  Flash support in January 2021, despite years of deprecation warnings.
- AngularJS (1.x) reached end of life in January 2022. Organizations that did not migrate to
  Angular 2+ were left with no security patches and a shrinking talent pool.
- Java EE's transfer from Oracle to the Eclipse Foundation (as Jakarta EE) forced a package rename
  from `javax.*` to `jakarta.*`, breaking every import in every application.

**The fix:**
1. Maintain a technology lifecycle registry: track the support status and EOL dates for every major
   dependency.
2. Budget "technology currency" work: allocate 10-15% of capacity to keep dependencies within
   one major version of current.
3. Prefer technologies with multiple implementations (SQL databases, HTTP servers) over single-vendor
   lock-in.
4. Monitor community health metrics: commit frequency, contributor count, issue response time.

**Detection rule:**
Flag dependencies more than 2 major versions behind current. Flag dependencies with no commits in
12 months. Flag frameworks on published EOL lists.

---

### AP-18: Ambiguous Viewpoint

**Also known as:** Inconsistent Architecture Documentation, Missing Context, Viewpoint Confusion
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Architecture diagrams and documents that mix deployment topology, logical module structure, runtime data
flow, and organizational ownership into a single undifferentiated view. A box labeled "API Gateway" might
represent a deployment artifact, a logical component, or a team boundary depending on who is looking at
it. Different stakeholders interpret the same diagram differently and make contradictory decisions.

**Why developers do it:**
Creating multiple views (4+1, C4 model) takes time. A single "big picture" diagram feels sufficient.
Teams lack training in architecture documentation methods. Architecture documentation is treated as a
one-time activity rather than a living artifact.

**What goes wrong:**
- Developers interpret a logical diagram as a deployment guide and create one-to-one service-to-server
  mappings when logical components were meant to be co-located.
- Security teams audit a logical view and miss network-level attack surfaces that only appear in the
  deployment view.
- Operations teams provision infrastructure based on an outdated architecture diagram that has not been
  updated in 18 months.
- The lack of a shared, unambiguous architecture language contributes to the "50 contractors, no
  integration" pattern seen in Healthcare.gov.

**The fix:**
1. Adopt the C4 model (Context, Container, Component, Code) with distinct diagrams at each level.
2. Label every diagram with its viewpoint: logical, deployment, runtime, development.
3. Store architecture diagrams as code (Structurizr, Mermaid) in the repository so they are versioned
   alongside the system.
4. Review and update architecture documentation every quarter, or with every significant change.

**Detection rule:**
Flag architecture diagrams that contain both deployment details (server names, IP addresses) and
logical abstractions (bounded contexts, domain concepts) in the same view. Flag documentation older
than 6 months with no updates.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns Produced | Frequency | Mitigation Strategy |
|---|---|---|---|
| Shipping pressure / deadline-driven decisions | Big Ball of Mud, Lava Flow, Boat Anchor | Very High | Budget 20% for structural health; bake quality into the definition of done |
| Tool/framework familiarity bias | Golden Hammer, Reinventing the Wheel | High | Technology radar; mandatory ADRs for technology choices |
| Resume-driven development | Architecture Astronaut, Accidental Complexity | High | Align incentives with business outcomes, not technology novelty |
| Conway's Law (org structure = system structure) | Stovepipe System, God Service | High | Inverse Conway Maneuver; organize teams around business capabilities |
| Fear of deletion | Lava Flow, Boat Anchor | Very High | Production code coverage; YAGNI culture; trust version control |
| Sunk-cost fallacy | Vendor Lock-in, NIH Syndrome, Boat Anchor | High | Regular build-vs-buy reviews; annual switching cost assessments |
| Premature optimization for flexibility | Inner Platform Effect, Architecture Astronaut, Swiss Army Knife | Moderate | YAGNI; require 2+ current consumers for every abstraction |
| Microservices cargo culting | Distributed Monolith, God Service, Circular Dependencies | High | Independent deployability test; DDD bounded contexts |
| Absent or outdated documentation | Ambiguous Viewpoint, Stovepipe System | High | Architecture-as-code; quarterly documentation reviews |
| Developer turnover / knowledge loss | Lava Flow, Big Ball of Mud, Dead End Architecture | High | Code ownership model; onboarding documentation; pair programming |

---

## Self-Check Questions

Use these during architecture reviews, sprint planning, or tech-debt triage.

1. **Can you deploy any single service without coordinating with another team?**
   If no, you may have a Distributed Monolith (AP-04) or Circular Dependencies (AP-09).

2. **What percentage of your codebase has been executed in production in the last 90 days?**
   If less than 70%, investigate Lava Flow (AP-05) and Boat Anchor (AP-16).

3. **How many technologies in your stack are more than 2 major versions behind current?**
   More than 3 suggests Dead End Architecture (AP-17).

4. **If your primary cloud vendor doubled prices tomorrow, how long would migration take?**
   More than 12 months indicates Vendor Lock-in (AP-06).

5. **How many abstraction layers does a simple GET request pass through?**
   More than 4 with no logic at intermediate layers suggests Sinkhole (AP-11).

6. **Does any single service have more than 30 API endpoints?**
   Yes indicates God Service (AP-10).

7. **Can a new developer understand the module boundary diagram in under 15 minutes?**
   No suggests Big Ball of Mud (AP-01) or Ambiguous Viewpoint (AP-18).

8. **How many configuration options does your system have? Can any of them express conditional logic?**
   Conditional configuration suggests Inner Platform Effect (AP-07).

9. **Do you have internal libraries that overlap with top-100 open-source packages?**
   Yes indicates Reinventing the Wheel (AP-14) or NIH Syndrome (AP-15).

10. **Is more than 50% of your codebase infrastructure/config rather than business logic?**
    Yes indicates Accidental Complexity (AP-08).

11. **How many point-to-point integrations exist between internal systems?**
    If approaching N*(N-1)/2, you have a Stovepipe System (AP-12).

12. **When was the last time you deleted a feature flag, deprecated class, or unused service?**
    More than 6 months ago suggests Lava Flow (AP-05) and Boat Anchor (AP-16).

13. **Is there an interface in your codebase with more than 10 methods?**
    Yes suggests Swiss Army Knife (AP-13).

14. **Has the same technology been chosen for the last 5 new components without evaluating alternatives?**
    Yes suggests Golden Hammer (AP-02).

15. **Do architecture diagrams distinguish between logical, deployment, and runtime views?**
    If all views are on one diagram, you have Ambiguous Viewpoint (AP-18).

---

## Code Smell Quick Reference

| Smell | Anti-Pattern(s) | Automated Check | Threshold |
|---|---|---|---|
| Module with >30% inbound deps from all modules | Big Ball of Mud | dependency-cruiser, ArchUnit | Fan-in > 30% of total modules |
| Same DB schema accessed by multiple services | Distributed Monolith | Schema ownership audit | >1 service per schema |
| `@Deprecated` annotation older than 6 months | Lava Flow | Custom lint rule | 0 tolerance past 6 months |
| Vendor SDK imports in business logic layer | Vendor Lock-in | Import path lint | 0 vendor imports in domain/ |
| Config file with conditionals or loops | Inner Platform Effect | Config file parser check | 0 control flow in config |
| Interface with >10 methods | Swiss Army Knife | PMD, ESLint custom rule | Max 10 methods |
| Interface with exactly 1 implementation | Architecture Astronaut | ArchUnit, custom rule | Flag for justification |
| Unused imports/dependencies | Boat Anchor | depcheck, vulture | 0 unused deps |
| Circular package dependencies | Circular Dependencies | madge --circular, JDepend | 0 cycles |
| Service with >30 endpoints | God Service | OpenAPI spec analysis | Max 30 endpoints |
| Service with 0 traffic for 30 days | Boat Anchor | APM/observability metrics | Decommission ticket |
| Service method that only delegates to next layer | Sinkhole | Custom static analysis | >50% pass-through = flag |
| >3 internal tools solving the same problem | NIH Syndrome / Reinventing the Wheel | Internal tool registry audit | Max 1 per problem space |
| Dependency >2 major versions behind | Dead End Architecture | Dependabot, Renovate | Max 2 major versions behind |
| Build time >5 min for <50k LOC | Accidental Complexity | CI metrics | 5 min threshold |
| Architecture diagram mixing viewpoints | Ambiguous Viewpoint | Manual review checklist | 1 viewpoint per diagram |

---

*Researched: 2026-03-08 | Sources: Joel Spolsky "Don't Let Architecture Astronauts Scare You" (joelonsoftware.com), Foote & Yoder "Big Ball of Mud" (laputan.org), Fred Brooks "No Silver Bullet" (1986), Knight Capital SEC Filing and post-mortem analysis (henricodolfing.com), Healthcare.gov post-mortem (Harvard d3, henricodolfing.com), Twitter Fail Whale migration post-mortem (infoq.com, venturebeat.com, theregister.com), npm left-pad incident (wikipedia.org, theregister.com), Spotify microservices lessons (engineering.atspotify.com, infoq.com), Gremlin distributed monolith analysis (gremlin.com), AntiPatterns.com (antipatterns.com), The Daily WTF inner platform effect (thedailywtf.com), Cloudflare vendor lock-in analysis (cloudflare.com), Sourcegraph dependency hell (sourcegraph.com), ExceptionNotFound anti-pattern series (exceptionnotfound.net), Mike Hadlow "Lava Layer Anti-Pattern" (mikehadlow.blogspot.com), Wikipedia entries for referenced anti-patterns*
