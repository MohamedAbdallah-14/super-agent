# Monolith Architecture — Architecture Expertise Module

> A monolith is a single deployable unit containing all application functionality. Despite being called "legacy" by microservices advocates, a well-structured monolith is often the correct architecture for teams of under 30 developers and products with less than 10M DAU — and sometimes even beyond that.

> **Category:** Pattern
> **Complexity:** Simple
> **Applies when:** Most new projects, teams under ~30 developers, validated products before scaling

---

## What This Is (and What It Isn't)

### Definition

A monolithic application is one where the entire business logic — presentation, service layer, domain logic, and data access — runs inside a single OS process and is deployed as a single unit. All code is compiled together, shares the same memory space, and communicates via direct function calls rather than network hops.

### The Three Variants

**1. Single-Process Monolith (Classic)**
One process, one codebase, one database. All modules are compiled into a single artifact (a JAR, a .NET DLL, a Rails app, a Django app). Requests are served in-process. This is the most common starting point for any product.

**2. Modular Monolith**
A single deployable unit with explicitly enforced module boundaries inside the codebase. Modules cannot reach into each other's internals — they communicate through defined interfaces. Shopify's "Shopify Core" Rails application is the canonical example: ~2.8 million lines of code, over 500,000 commits, but partitioned into components via their Packwerk tool that enforces dependency rules at CI time. This is the sweet spot for teams of 20–80 developers on an established product (covered separately in `modular-monolith.md`).

**3. Distributed Monolith (Anti-Pattern — The Worst of Both Worlds)**
Multiple processes/services that are still tightly coupled: they share a database, rely on synchronous call chains, and cannot be deployed independently. This pattern combines all the operational complexity of microservices with all the coupling problems of a poorly structured monolith. If you have to deploy 8 services simultaneously to ship one feature, you have a distributed monolith. Avoid this at all costs.

### What a Monolith Is NOT

- **Not unstructured**: A well-run monolith has strong internal module boundaries. "Monolith" describes deployment topology, not code quality.
- **Not legacy**: Every greenfield project starts as a monolith. The question is whether to stay there, and for most products at most stages, the answer is yes.
- **Not unscalable**: Stack Overflow serves 1.3 billion monthly page views from 9 on-premise web servers running a .NET monolith. Shopify processed hundreds of billions in GMV as a single Rails app. Scale is achieved through caching, connection pooling, read replicas, and horizontal replication of the entire process — not decomposition.
- **Not unmaintainable**: Maintainability is a function of code structure and discipline, not deployment model. A microservices system with poor discipline is harder to maintain than a well-structured monolith.

### Common Misconceptions vs. Reality

| Misconception | Reality |
|---|---|
| "Monoliths don't scale" | Stack Overflow: 9 servers, 1.3B monthly page views, 450 req/sec per server at 12% CPU |
| "Monoliths slow down teams" | Only when poorly structured. Basecamp ships to web + iOS + Android + desktop with ~12 engineers |
| "You'll have to rewrite it" | No — the strangler fig pattern allows incremental extraction without rewrites |
| "Microservices = modern" | Amazon Prime Video cut infra costs 90% by consolidating a microservices system back into a monolith (2023) |
| "Monoliths can't support multiple frontends" | Basecamp 3 serves web, iOS, Android, Windows, Mac, and email from one Rails monolith |

---

## When to Use It

The monolith is the correct default. The burden of proof lies with anyone proposing to distribute.

### Primary Signals — Use a Monolith

**Team size under 30 developers.**
The coordination overhead of microservices (service contracts, API versioning, distributed tracing, independent deployments, inter-service auth) requires dedicated platform engineering capacity. Below ~30 engineers, you don't have the headcount to absorb that tax. The operational gains from independent deployment don't materialise until you have teams that genuinely need to deploy independently, which requires distinct ownership boundaries, which requires a larger organisation.

**Traffic under 5–10M DAU (unless extremely compute-intensive).**
A single vertically-scaled server with proper caching (Redis, Memcached) handles enormous load. Stack Overflow's SQL cluster of 4 servers handles 10,000+ peak queries/second at 15% CPU. For the vast majority of products, the database connection limit and memory saturation points are far beyond what the team will ever encounter. When you do hit them, horizontal scaling (running multiple instances of the monolith behind a load balancer) is the first answer — not decomposition.

**You don't yet know your domain boundaries.**
This is the most important signal and the most commonly ignored. Microservices demand stable service boundaries. Those boundaries map to domain concepts (Order, Customer, Payment, Shipment). Early in a product's life, you don't know which domain concepts will be stable. If you decompose too early and discover the wrong boundaries, you end up with services that need to change in lockstep — the distributed monolith anti-pattern. Build the monolith first; the correct service boundaries emerge from the code under real usage.

**Development velocity is the primary constraint.**
A monolith has one repository, one build, one deploy pipeline, one database, one set of logs. Debugging is `puts` and a stack trace, not distributed tracing across 12 services. Feature development doesn't require coordinating contracts across service owners. For a startup trying to find product-market fit, this operational simplicity is worth far more than theoretical deployment independence.

**You need reliable distributed transactions.**
In a single-process monolith with one relational database, a transaction wrapping multiple table writes is trivially achieved with `BEGIN`/`COMMIT`. In a microservices system, this requires sagas, two-phase commit protocols, or eventual consistency patterns — all of which are significantly harder to implement correctly and reason about.

### Real-World Reference Points

**Stack Overflow (The New Stack, 2023):**
Handles 1.3 billion monthly page views across 200+ sites. Infrastructure: 9 on-premise web servers, 4 SQL servers (2 clusters), Redis for caching at 60,000 peak ops/sec. Each web server: 64GB RAM, handles 450 peak req/sec at 12% CPU utilisation. Deliberately chose not to adopt microservices. Their position: "by minimizing the number of external application services, the need to pay 'SOA tax' has been avoided."

**Shopify (Shopify Engineering Blog):**
One of the oldest, largest Rails codebases in existence — 2.8 million lines of code, 500,000+ commits, hundreds of engineers. Ran as a single deployable Rails application through $1B+ GMV. Rather than decomposing to microservices, they built Packwerk (open source) to enforce modular boundaries within the monolith. The result is a modular monolith where components can't reach into each other's internals, giving them microservice-level isolation without the operational overhead. Handles 30TB of data per minute on Black Friday.

**Basecamp / DHH ("The Majestic Monolith", 2016):**
DHH coined "The Majestic Monolith" to describe the intentional choice of a single, integrated Rails application. Basecamp 3 serves the web app, iOS, Android, Windows, and Mac desktop apps, and email, all from one Rails codebase, maintained by approximately 12 programmers. DHH's position: "The only possible way to support multiple platforms with a small team is to explicitly choose and commit to The Majestic Monolith. One generalist can ship an entire feature to everyone on every platform at once."

**Amazon Prime Video (2023):**
The Prime Video quality analysis team had built a distributed serverless architecture for monitoring video streams. It hit a hard scaling wall at 5% of expected load due to data transfer costs between Lambda functions and S3. The team moved all components into a single process (in-process memory transfer instead of S3 round-trips), eliminated the intermediate storage layer, and reduced infrastructure costs by 90% while removing the scaling limit. Note: this was one component of Prime Video, not the whole service — but the lesson stands: distributed is not always better.

**StackExchange Network:**
The entire Q&A network (Stack Overflow, Server Fault, Super User, and 200+ sites) runs from a single .NET monolith. The team demonstrated at QCon New York 2015 that vertical scaling + aggressive caching outperformed what a horizontally distributed system would have cost them to build and operate.

---

## When NOT to Use It

Every architecture has a natural ceiling. The monolith's ceiling is real. Pushing past it causes organisational pain that compounds faster than the accumulated technical debt.

### Critical Signals — Time to Evolve

**Team scaling pain (30+ developers on a single codebase).**
When more than ~30 developers commit to the same repository, merge conflicts become a daily drag. Feature branches diverge further before integration. The build time to validate a change grows because the entire codebase must be compiled and tested for every commit. Code ownership becomes ambiguous — multiple teams touch the same files. The result is coordination overhead that defeats the monolith's speed advantage.

**Build times exceeding 20–30 minutes.**
This is the clearest quantitative signal. When the test suite takes 30 minutes to run, developers stop running it locally. The feedback loop breaks. Feature branches stay open longer. Integration failures become more expensive to fix. At this point, the build time is a hard ceiling on deployment frequency, regardless of how well the code is structured.

**Deployment coupling: one team's bad deploy takes down everyone.**
In a monolith, a deploy is all-or-nothing. If Team A ships a memory leak, Team B, C, and D's features all go down on the next deployment. The blast radius of every deploy is the entire product. When the organisation has grown to the point where this coordination tax is daily, and when the cost of a rollback affects multiple teams, independent deployment becomes worth the microservices overhead.

**Genuine independent scaling requirements.**
Video encoding needs 100x compute at peak but only runs for seconds; the billing system needs constant low-compute availability; the recommendation engine needs GPU access. If different components have radically different compute profiles, you're wasting money running them in the same process at the same scale. This is when selective extraction pays off.

**Polyglot requirements.**
Machine learning models in Python, high-throughput APIs in Go, frontend server-side rendering in Node. A monolith is language-locked. If a specific component has a legitimate reason to run in a different language (not fashion — reason), extraction makes sense.

**More than ~150 developers, multiple autonomous product teams, 10M+ DAU.**
Amazon's decomposition (early 2000s) was driven by hundreds of engineers needing to deploy independently, own their services end-to-end, and make technology decisions without coordinating with a central team. The two-pizza team model (8 engineers max per service, full stack ownership) requires microservices to work. This is a valid reason — but it requires all three conditions: large team, genuine team autonomy, and high traffic. Most products never reach this point.

### The Most Common Mistake

Teams reach for microservices at 5 engineers because they read that Netflix uses them. Netflix has ~2,000 engineers and 200M+ subscribers. The operational overhead of their architecture is spread across a massive engineering organisation. Adopting that architecture at 5 engineers means one person is writing product code and everyone else is managing infrastructure.

---

## How It Works

### Deployment Model

A monolith is packaged and deployed as a single artifact:
- **Ruby/Rails**: A Puma-served Rack application (or Passenger in older setups)
- **Java/Spring Boot**: A single fat JAR embedding Tomcat or Jetty
- **Python/Django**: A Gunicorn-served WSGI application
- **Node/NestJS**: A single Node.js process
- **PHP/Laravel**: Apache or Nginx + PHP-FPM serving one application root
- **.NET**: A single IIS application or Kestrel-served .NET process

One artifact is built in CI, pushed to a container registry or server, and started. There is no service mesh, no inter-process communication protocol, no API gateway routing between internal services.

### Request Handling

All code that handles a request lives in the same process. When a web request arrives at the payments controller, it calls the order service, which calls the inventory module, which queries the database — all as in-memory function calls. No network serialisation, no HTTP client, no retry logic, no distributed tracing headers. Latency is nanoseconds-to-microseconds for each call within the process, versus milliseconds across the network.

### Database Access

Typically one primary relational database (PostgreSQL or MySQL). All modules share access to all tables. This is both a strength (ACID transactions across domain boundaries are trivial) and a risk (module boundaries are enforced only by discipline, not by network topology). Read replicas and connection pooling (PgBouncer, ProxySQL) handle read-heavy load. Sharding by tenant ID (as Shopify does with shop_id on MySQL/Vitess) handles extreme multi-tenant scale.

### Session Handling

Sessions stored in a shared cache (Redis) or database. All instances of the monolith can serve any request from any user because session state is externalised. This is what enables horizontal scaling: spin up more instances behind a load balancer, all of them connect to the same Redis and database.

### Shared Infrastructure

- One CI pipeline (one build, one test suite, one deploy step)
- One application log stream (structured JSON to stdout, aggregated by a log collector)
- One metrics namespace (one set of dashboards, one alerting configuration)
- One deployment rollback target

Debugging in a monolith is a single stack trace. A 500 error in production shows you exactly which file, line, and function failed. No distributed trace correlation across 12 service boundaries is needed.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---|---|
| Simple local development (one `docker compose up`) | Single language/runtime for the entire system |
| In-process function calls (nanosecond latency) | Can't scale components independently |
| ACID transactions across domain boundaries | Full redeploy required to ship any change |
| One build, one deploy pipeline | One team's deploy incident affects all teams |
| Single unified log stream and metrics | Build/test time grows with codebase size |
| Easy rollback (redeploy previous artifact) | Risk of "big ball of mud" without enforced module boundaries |
| No distributed systems problems (split-brain, partial failure, eventual consistency) | Language lock-in — can't use Python for ML in the same process |
| Easy refactoring (cross-module changes in one commit) | Single point of deployment failure |
| Lower infrastructure cost (one container vs. dozens) | Database becomes a shared global state risk |
| Faster onboarding (one codebase to understand) | Memory pressure: all modules in one process |

---

## Evolution Path

The path from monolith to distributed system should be incremental, not a big-bang rewrite. Big-bang rewrites fail — the second system carries the complexity of the first without the battle-hardened knowledge embedded in the original code.

### Stage 1: Single-Process Monolith
Start here. Always. One process, one database, one deploy. Focus on shipping the product. Apply feature-slice folder organisation (not layer-based) from the start so modules are naturally separated. This is the stage where domain boundaries become visible under real usage.

### Stage 2: Modular Monolith
When the codebase grows past ~50,000 LOC and has 10+ developers, introduce explicit module boundaries within the monolith. Modules have defined public interfaces. Other modules cannot reach into private implementation. Dependencies between modules are declared and enforced (Packwerk for Rails, Java modules, .NET namespaces with analyser rules). The deployment unit remains a single process, but the internal structure mirrors what a service decomposition would look like — without the operational overhead. This is where Shopify lives today.

### Stage 3: Selective Extraction
When a specific module has a legitimate, quantifiable reason to be extracted (independent scaling requirement, polyglot language need, team ownership boundary, data isolation requirement), extract it using the strangler fig pattern:
1. Build an identical external interface for the new service
2. Deploy a proxy/API gateway that routes a percentage of traffic to the new service
3. Run the old code path and new code path in parallel and compare results
4. Shift traffic to the new service incrementally
5. Remove the old code path from the monolith after validation

Extract surgically. Do not extract speculatively. Most modules should remain in the modular monolith indefinitely.

### Stage 4: Microservices (Where Appropriate)
A small number of genuinely independent services alongside a modular monolith that still handles the core product. This is the architecture of most mature products that call themselves "microservices" — they have 3–8 true services extracted for specific reasons, and a monolith (or modular monolith) that does the heavy lifting.

### Signals to Evolve (Quantitative Thresholds)

| Signal | Threshold | Action |
|---|---|---|
| Test suite runtime | > 20 minutes | Introduce module-level test suites; consider extraction |
| Deploy conflicts | > 2 per week | Introduce module boundaries; evaluate team ownership |
| Build time | > 30 minutes | Time to move to modular monolith or extract |
| Team size | > 30 on one codebase | Enforce modules; consider extraction for independent teams |
| Traffic | > 10M DAU | Evaluate component-level scaling requirements |
| Deploy frequency | < 1/day due to coordination | Extraction for that team's domain |

### Do Not Skip the Modular Monolith Step

The most expensive architectural mistake is jumping from a single-process monolith directly to microservices without going through a modular monolith phase. The modular monolith forces you to define stable module boundaries before you incur the operational overhead of distributing them. Teams that skip this step discover their service boundaries are wrong only after they've paid the cost of the network, the service contracts, and the deployment pipelines.

---

## Failure Modes

### Big Ball of Mud

The most common monolith failure mode. No internal structure. Every module reaches directly into every other module's database tables. Controller code calls service code calls model code calls other controllers. Circular dependencies everywhere. Changes anywhere break things everywhere. This is not a monolith problem — it is a discipline problem. It happens in microservices too (as a distributed big ball of mud). Prevention: enforce module boundaries from day one, even informally. Use feature-slice folder organisation. Do not allow cross-module database access from the start.

**Symptom:** "We can't change anything without breaking something else." **Cause:** No enforced module isolation. **Fix:** Introduce modular monolith tooling (Packwerk, Java modules, namespace rules) to surface and eliminate cross-module dependencies.

### Distributed Monolith

The worst outcome: a team decomposes the monolith into services but doesn't fix the coupling. Services share a database. Services call each other synchronously in chains 4 deep. A deploy of Service A requires simultaneous deploys of Services B, C, and D. You now have all the complexity of microservices (distributed tracing, network failures, service discovery, API versioning) and all the coupling of a monolith (no independent deployment, no independent scaling). This is not a monolith problem and not a microservices solution — it is the result of extracting services before establishing domain boundaries.

**Symptom:** "We deploy all 12 services at once every Friday." **Cause:** Premature extraction without domain boundary analysis. **Fix:** Either re-consolidate into a monolith and re-extract correctly, or systematically remove shared database access and synchronous coupling.

### Deployment Bottleneck

One team's code is always blocking the deploy train. Their feature is half-done, or their tests are flaky, or their merge conflicts aren't resolved. Every other team waits. This is an organisational signal that teams have grown past what a shared deploy pipeline can accommodate. **Fix:** Move to a modular monolith with module-level CI validation, or extract the offending team's domain into its own service.

### Database Contention

All modules write to the same database. A background job table scan locks rows that the user-facing API needs to read. A reporting query holds a full-table lock for 30 seconds. This is a monolith performance failure mode that grows worse with scale. **Fix:** Separate read replicas for analytics/reporting, connection pooling, query optimisation. If the problem persists, consider schema-level isolation (each module owns its tables and accesses them only via its own service layer — a prerequisite for eventual extraction).

### Context Rot / "God Object" Domain Model

A single `User` model with 200 methods, a `Order` model with 150 associations, an `ApplicationHelper` with 400 utility functions. The domain model accumulates all behaviour over time into a small number of central objects. Any change to these objects has unpredictable blast radius. **Fix:** Introduce domain-driven design concepts: bounded contexts, aggregate roots, application services. The fix is structural refactoring, not decomposition.

### Real Incident Pattern: The Midnight Deploy

A monolith with no feature flags and manual QA deploys at 11pm on a Friday. A new feature has an N+1 query that doesn't manifest in staging but fires on production data. The entire application slows to a halt. There is no way to disable just the new feature without rolling back the entire deploy, which reverts three other teams' work. **Prevention:** Feature flags, automated performance regression testing, canary deployments (route 5% of traffic to new version before full rollout).

---

## Technology Landscape

### Framework Options by Language

**Ruby — Ruby on Rails**
The canonical monolith framework. Convention over configuration. ActiveRecord ORM. Built-in asset pipeline. Hotwire (Turbo + Stimulus) for modern reactive UIs without JavaScript frameworks. Battle-proven at Shopify, GitHub (before their partial extraction), Basecamp, Airbnb (early stage), Gitlab. Packwerk for modular boundary enforcement.

**Python — Django**
"The web framework for perfectionists with deadlines." ORM, admin UI, authentication, migrations included. Used by Instagram (ran as a Django monolith through 400M users before selective extraction), Pinterest (early stage), Disqus. Django apps provide natural module boundaries within the monolith.

**PHP — Laravel**
The dominant PHP framework. Eloquent ORM, Artisan CLI, built-in queue system. Used by Laravel Forge, Laracasts, and a significant proportion of e-commerce and content sites. PHP's shared-nothing architecture (each request a fresh process) makes horizontal scaling straightforward.

**Java — Spring Boot**
The enterprise standard. Embedded Tomcat/Jetty. Dependency injection via Spring container. Strong support for modular monolith patterns via Java modules (JPMS) or Maven/Gradle multi-module projects. Used by Atlassian's Jira/Confluence in early stages, LinkedIn (early), eBay.

**Elixir — Phoenix**
High-performance, fault-tolerant monolith framework. BEAM VM provides process isolation within the monolith — each request runs in its own lightweight process. Built-in Phoenix LiveView for reactive UIs. Designed for multi-core utilisation. 2M connected WebSocket clients from a single server is a documented benchmark.

**Node.js — NestJS**
TypeScript-first, Angular-inspired module system. Dependency injection, decorators, built-in module boundaries. Suitable for teams coming from a TypeScript/Angular background.

**.NET — ASP.NET Core**
Microsoft's modern web framework. Excellent performance (Kestrel server). Strong tooling (Visual Studio, Rider). Used by Stack Overflow (ASP.NET MVC), GitHub Copilot backend components. .NET namespaces + Roslyn analyser rules can enforce module boundaries.

**Go — Standard library / Chi / Echo**
Go is less opinionated about monolith vs. microservices. Single Go binary deployment is extremely clean. Good fit when team is Go-native and wants monolith simplicity with Go performance.

### Database

The default is a single **PostgreSQL** (or MySQL for legacy/Shopify-style) instance with:
- Connection pooling: PgBouncer (PostgreSQL), ProxySQL (MySQL)
- Read replicas: route SELECT queries to replicas, writes to primary
- Backups: pg_dump or WAL-based continuous archiving to S3
- Migrations: handled by the framework ORM's migration system (Rails migrations, Alembic, Flyway)

For extreme multi-tenant scale, Shopify's model applies: shard by tenant ID across multiple database clusters (shop_id → cluster assignment), so no single database cluster becomes a global bottleneck.

### Deployment

**Docker (single container):**
```dockerfile
FROM ruby:3.3-slim
WORKDIR /app
COPY . .
RUN bundle install --without development test
EXPOSE 3000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```
One image, one container. Deployed to ECS, Kubernetes (single deployment/replicas), or a PaaS.

**PaaS (recommended for small teams):**
- **Heroku**: git push to deploy. Dynos scale horizontally. Managed PostgreSQL.
- **Railway**: Modern Heroku alternative. Better pricing, built-in databases.
- **Render**: Similar to Railway. Good free tier for early products.
- **Fly.io**: Deploy to edge regions. Good for latency-sensitive applications.

PaaS eliminates the Kubernetes operational burden entirely, which is appropriate for teams under 10–15 engineers.

**Self-hosted (larger teams):**
EC2 + Auto Scaling Group, or ECS Fargate. Blue/green deployments via CodeDeploy or a deployment tool. Load balancer (ALB) in front with health check endpoint.

### Monitoring

A monolith is substantially easier to monitor than a distributed system:
- **Single log stream**: structured JSON to stdout, collected by Datadog/Logstash/CloudWatch Logs. One query finds any error.
- **Single metrics namespace**: one APM agent (Datadog APM, New Relic, Scout APM). Traces are in-process — no distributed trace correlation.
- **Error tracking**: Sentry. One project, one DSN, all errors in one place.
- **Health check**: `GET /health` returns `{"status": "ok", "db": "ok", "redis": "ok"}`. Load balancer kills instances that fail this check.

---

## Decision Tree

Use this tree to determine the correct architecture for a new project or an existing system facing scaling pressure.

```
New product / greenfield project?
  → Yes → Monolith. No discussion needed.
  → No (existing system) → see "Existing System" branch below

Team size?
  → < 5 developers → Monolith. Always.
  → 5–30 developers
      Traffic < 5M DAU?
        → Yes → Monolith, structured as modules.
        → No (high traffic) → Monolith + horizontal scaling first.
                              Profile before decomposing.
  → 30–100 developers
      Independent team ownership needed?
        → No → Modular monolith.
        → Yes → Modular monolith first, then selective extraction
                 for teams that genuinely need independent deploy.
  → > 100 developers
      Multiple autonomous teams?
        → Yes, > 10M DAU, multiple autonomous product orgs
          → Selective microservices alongside modular monolith core.
        → Not truly autonomous (shared roadmap, shared deploy)
          → Modular monolith. Microservices will not help.

Domain boundaries known and stable?
  → No (new product, pivoting, < 12 months in production)
    → Monolith. Extract when boundaries are proven stable.
  → Yes (2+ years in production, stable domain model)
    → Safe to consider selective extraction.

Build time?
  → < 10 minutes → Fine. Stay in monolith.
  → 10–30 minutes → Invest in modular monolith + parallel test execution.
  → > 30 minutes → Serious signal. Enforce module boundaries.
                    Evaluate extraction for highest-change modules.

Existing System branch:
  Currently a monolith, team growing:
    → Apply modular monolith patterns first.
    → Only extract when a specific team has a specific, quantified
       reason to deploy independently.
    → Use strangler fig pattern to extract incrementally.
  Currently microservices, experiencing pain:
    → Identify services that always deploy together → consolidate.
    → Identify services sharing a database → they are not microservices.
    → Re-consolidation (as Amazon Prime Video did) is a valid choice.
```

---

## Implementation Sketch

### Folder Structure: Feature-Slice Organisation (Preferred)

Organise by domain/feature, not by technical layer. Layer-based organisation (`models/`, `controllers/`, `services/`) scatters a feature's code across the codebase. Feature-slice organisation keeps all code for a domain concept together.

```
app/
  modules/
    orders/
      controllers/
        orders_controller.rb
        line_items_controller.rb
      models/
        order.rb
        line_item.rb
      services/
        order_placer.rb
        order_canceller.rb
        order_notifier.rb
      queries/
        orders_query.rb
      events/
        order_placed_event.rb
      serializers/
        order_serializer.rb
    payments/
      controllers/
        payments_controller.rb
      models/
        payment.rb
        refund.rb
      services/
        payment_processor.rb
        refund_issuer.rb
      gateways/
        stripe_gateway.rb
    inventory/
      ...
    customers/
      ...
    notifications/
      ...
  shared/
    concerns/
    presenters/
    lib/
config/
db/
  migrations/
  schema.rb
spec/
  modules/
    orders/
    payments/
    inventory/
```

**Rule:** A module may depend on `shared/`. A module must not reach into another module's internals. Cross-module communication goes through a defined public interface (a service object, an event, or a query object in `shared/`).

### Module Interface Pattern

```ruby
# Bad: module reaching into another module's internals
class OrderPlacer
  def call(cart)
    payment = Payment.find(cart.payment_id)  # Reaches into payments module
    payment.stripe_charge_id                  # Accesses internal field
  end
end

# Good: communicate through a defined interface
class OrderPlacer
  def call(cart)
    result = Payments::PaymentReader.find(cart.payment_id)
    result.confirmation_token                  # Only accesses public interface
  end
end
```

### Database Schema Design

Name tables with module prefixes to make ownership visible and catch accidental cross-module joins:

```sql
-- Orders module owns these tables
CREATE TABLE orders_orders (...);
CREATE TABLE orders_line_items (...);

-- Payments module owns these tables
CREATE TABLE payments_payments (...);
CREATE TABLE payments_refunds (...);

-- Cross-module references use IDs only, never JOINs
-- orders_orders.payment_id references payments_payments.id
-- But the orders module never JOINs to payments_payments
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (GitHub Actions)
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping" --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - run: bundle exec rails db:schema:load RAILS_ENV=test
      - run: bundle exec rspec --format progress
      - run: bundle exec packwerk check  # Enforce module boundaries

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/myapp:${{ github.sha }}
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster production \
            --service myapp \
            --force-new-deployment
```

### Docker Deployment (Production-Ready)

```dockerfile
# Multi-stage build for minimal image size
FROM ruby:3.3-slim AS builder
RUN apt-get update && apt-get install -y build-essential libpq-dev nodejs
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test --jobs 4 --retry 3
COPY . .
RUN bundle exec rails assets:precompile RAILS_ENV=production SECRET_KEY_BASE=placeholder

FROM ruby:3.3-slim AS runtime
RUN apt-get update && apt-get install -y libpq5 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app /app
RUN useradd -m -s /bin/bash appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

### Health Check Endpoint

```ruby
# config/routes.rb
get '/health', to: 'health#show'

# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :authenticate_user!

  def show
    checks = {
      status: 'ok',
      database: database_ok?,
      redis: redis_ok?,
      version: ENV['APP_VERSION'] || 'unknown',
      timestamp: Time.current.iso8601
    }

    status_code = checks.values.all? { |v| v == true || v == 'ok' } ? :ok : :service_unavailable
    render json: checks, status: status_code
  end

  private

  def database_ok?
    ActiveRecord::Base.connection.execute('SELECT 1')
    true
  rescue => e
    Rails.logger.error "Health check DB failure: #{e.message}"
    false
  end

  def redis_ok?
    Redis.current.ping == 'PONG'
  rescue => e
    Rails.logger.error "Health check Redis failure: #{e.message}"
    false
  end
end
```

---

## Cross-References

Related expertise modules to read alongside this one:

- **`modular-monolith.md`**: The structured evolution of the single-process monolith. Enforced module boundaries within a single deployable unit. Where Shopify lives. Read this when your team grows past ~15 engineers or the codebase exceeds ~100K LOC.
- **`microservices.md`**: The distributed alternative. Read this when you have quantified, specific reasons to extract. Contains the operational cost inventory (service mesh, distributed tracing, API gateway, inter-service auth, distributed transactions) so you can evaluate whether the benefit justifies the cost.
- **`monolith-to-microservices.md`**: The migration path. Strangler fig pattern, anti-corruption layers, domain boundary identification, database decomposition strategies. Read this when extraction is imminent.
- **`twelve-factor-app.md`**: The operational discipline that makes a monolith cloud-native: environment-based config, stateless processes, externalised sessions, structured logging. Apply all 12 factors to a monolith before considering decomposition.
- **`layered-architecture.md`**: The anti-pattern to avoid within a monolith. Layer-based folder organisation (`controllers/`, `models/`, `services/` at the top level) creates cross-cutting modules that resist extraction and encourage coupling. Feature-slice organisation (this document) is preferred.

---

## Summary Judgement

The monolith is not a legacy pattern. It is the correct default pattern. Distributed systems are appropriate for specific organisations with specific scale and team-size problems that most products never encounter.

The question is never "should we use microservices?" The question is "what evidence do we have that the monolith has become a genuine bottleneck?" Until that evidence is concrete and quantified — not theoretical, not aspirational, not because Netflix does it — the monolith (or its evolution, the modular monolith) is the right choice.

Build the monolith. Ship the product. Let the domain boundaries emerge. Structure the monolith as modules. Only then, when a specific module has a specific, quantified reason to be independent — extract it.

---

*Researched: 2026-03-08*

*Sources:*
- *[The Majestic Monolith — DHH / Signal v. Noise](https://signalvnoise.com/svn3/the-majestic-monolith/)*
- *[Under Deconstruction: The State of Shopify's Monolith — Shopify Engineering](https://shopify.engineering/shopify-monolith)*
- *[Deconstructing the Monolith — Shopify Engineering](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)*
- *[How Shopify Migrated to a Modular Monolith — InfoQ](https://www.infoq.com/news/2019/07/shopify-modular-monolith/)*
- *[Stack Overflow Architecture — Dr Milan Milanović](https://newsletter.techworld-with-milan.com/p/stack-overflow-architecture)*
- *[Scaling Stack Overflow: Keeping it Vertical — QCon New York](https://qconnewyork.com/ny2015/ny2015/presentation/how-vertical-your-monolith-scaling-approach-stack-exchange-and-stackoverflow.html)*
- *[The macro problem with microservices — Stack Overflow Blog](https://stackoverflow.blog/2020/11/23/the-macro-problem-with-microservices/)*
- *[Return of the Monolith: Amazon Dumps Microservices for Video Monitoring — The New Stack](https://thenewstack.io/return-of-the-monolith-amazon-dumps-microservices-for-video-monitoring/)*
- *[Amazon's Two Pizza Teams — AWS Executive Insights](https://aws.amazon.com/executive-insights/content/amazon-two-pizza-team/)*
- *[Why the Best Startups Still Use Monoliths — ITNEXT](https://itnext.io/why-the-best-startups-still-use-monoliths-fbef26a64193)*
- *[Monolith vs Microservices in 2025 — foojay.io](https://foojay.io/today/monolith-vs-microservices-2025/)*
- *[Seven Hard-Earned Lessons Migrating a Monolith to Microservices — InfoQ](https://www.infoq.com/articles/lessons-learned-monolith-microservices/)*
- *[Strangler Fig Pattern — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html)*
