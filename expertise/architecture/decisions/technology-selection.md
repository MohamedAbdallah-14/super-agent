# Technology Selection — Architecture Expertise Module

> Technology selection is the process of choosing languages, frameworks, databases, and tools for a project. The best heuristic: "Choose boring technology" (Dan McKinley). Every team has a limited budget of innovation tokens — spend them on your product, not your infrastructure. The wrong technology choice costs months; the right choice is often the most established one.

> **Category:** Decision
> **Complexity:** Moderate
> **Applies when:** Starting new projects, adding new components, evaluating framework migrations, or choosing between technology alternatives

---

## What This Is (and What It Isn't)

### Definition

Technology selection is the structured evaluation of languages, frameworks, databases, infrastructure platforms, and tools for a software project. It encompasses both the initial choices that shape a project's foundation and the ongoing decisions about introducing new technologies into an existing system.

The discipline exists because technology decisions are among the most expensive to reverse. Choosing the wrong database costs 6-18 months of migration effort. Choosing the wrong language locks in hiring constraints for years. Choosing the wrong framework means rewriting when you should be shipping features.

### The Innovation Tokens Model (Dan McKinley)

Dan McKinley's "Choose Boring Technology" essay introduced the concept that every company gets roughly three innovation tokens. These tokens represent the organization's finite capacity to absorb the risk and operational cost of unfamiliar technology. The supply is fixed — you cannot earn more by being smart or ambitious.

Spending an innovation token means:
- **Learning curve**: The team must learn the technology's idioms, failure modes, and operational characteristics from scratch.
- **Unknown unknowns**: Boring technology has well-documented failure modes. New technology has failure modes that nobody has encountered yet. You will be the one to discover them, in production, at 2am.
- **Ecosystem gaps**: New technology has fewer libraries, fewer Stack Overflow answers, fewer blog posts about solving specific problems. Your team will write code that the ecosystem would have provided for a mature technology.
- **Hiring friction**: Fewer developers know the technology. The ones who do command a premium. When they leave, replacing them is harder.

The question is never "is this technology better?" The question is: "Is this technology so much better at solving our specific problem that it justifies spending one of our three innovation tokens?"

If you use Kubernetes when Heroku would suffice, you spent a token. If you use MongoDB when PostgreSQL would work, you spent a token. If you write your backend in Rust when Go or Python would do, you spent a token. Three tokens go fast.

### The ThoughtWorks Technology Radar

ThoughtWorks publishes a Technology Radar twice yearly — a snapshot of technologies categorized into four rings:

- **Adopt**: Technologies with broad industry experience that ThoughtWorks recommends for broad use.
- **Trial**: Technologies worth pursuing in a project that can handle the risk. Not yet fully proven across a wide range of use cases.
- **Assess**: Technologies worth exploring with the aim of understanding how they will affect your organization.
- **Hold**: Technologies to approach with caution. Proceed only if you have a compelling, specific reason.

The Radar is valuable not as a prescription but as a calibration tool. If a technology you are considering is in "Hold," that is a strong signal to reconsider. If it is in "Adopt," that reduces (but does not eliminate) the risk of choosing it.

### What Technology Selection Is NOT

- **Not picking the coolest new thing.** The goal is not to use the most interesting technology. The goal is to ship a reliable product with a maintainable system. Interesting technology is interesting precisely because it is unproven.
- **Not a one-time decision.** Technology selection is ongoing. Every new dependency, library, or tool is a technology decision. The discipline applies to adding a new npm package as much as choosing a primary language.
- **Not solely a technical decision.** Technology selection is a business decision with technical inputs. Hiring pool, team expertise, vendor stability, licensing terms, and total cost of ownership are business factors that outweigh raw technical capability in most cases.
- **Not consensus-driven.** Technology decisions should be made by the smallest group of people with the most relevant context, documented in an ADR, and communicated broadly. Design-by-committee produces compromises that satisfy no one.

---

## When to Evaluate Carefully

Not every technology decision warrants a formal evaluation. Reserve structured evaluation for decisions that are expensive to reverse.

### High-Stakes Decisions (Formal Evaluation Required)

**Primary programming language for a new project.**
This locks in the hiring pool, the ecosystem of libraries, the deployment model, and the debugging tools for years. A language choice made in week one is still shaping the team in year five. Evaluate formally with a weighted scoring matrix.

**Primary database.**
PostgreSQL vs. MySQL vs. MongoDB vs. DynamoDB. This determines your data model, your query capabilities, your scaling model, your backup and recovery procedures, and your operational expertise requirements. Migration between databases is one of the most expensive operations in software engineering — often requiring months of dual-write, shadow-read verification, and cutover planning.

**Framework migration.**
Moving from Express to NestJS, from Django to FastAPI, from Angular to React. Framework migrations touch every file in the codebase. They take months and often stall halfway, leaving the team maintaining two frameworks simultaneously. Evaluate whether the pain of the current framework genuinely justifies the cost of migration.

**Adding a new data store category.**
Introducing Redis, Elasticsearch, Kafka, or a graph database alongside your primary database. Each new data store adds operational burden: monitoring, backup, scaling, failure modes, version upgrades. The question is whether the capability gap is real or whether your primary database can handle the use case (PostgreSQL's full-text search is often sufficient; PostgreSQL's LISTEN/NOTIFY can replace a simple message queue).

**Cloud provider or hosting platform.**
AWS vs. GCP vs. Azure vs. self-hosted. This is a multi-year commitment with significant lock-in through managed services, IAM policies, networking configurations, and team expertise. Switching cloud providers is a 6-18 month project for most organizations.

**New programming language in an existing system.**
Introducing Python for ML alongside a Go backend, or adding Rust for a performance-critical component. Each new language requires its own build pipeline, its own dependency management, its own testing infrastructure, and developers who can maintain it. The polyglot tax is real.

### Real-World Reference Points

**Etsy's deliberate conservatism.** Etsy famously ran on a PHP monolith and resisted the microservices trend for years. Their engineering blog documented how they evaluated whether to adopt new technologies by asking: "What is the cost of operating this in production for the next five years, and who will be on-call for it?" This lens killed most proposals for new technology.

**Shopify staying on Ruby on Rails.** Despite Rails being dismissed as "not scalable" by much of the industry, Shopify chose to invest in scaling Rails rather than rewriting. They built custom tooling (Packwerk for module boundaries, Vitess for MySQL sharding) rather than switching to a "more scalable" language. The result: hundreds of billions in GMV processed through a Rails monolith, with investments focused on the product rather than on learning a new stack.

---

## When NOT to Over-Evaluate

The opposite failure mode is equally dangerous: analysis paralysis. Teams can spend weeks or months evaluating technology options when the default would have been fine.

### Signs You Are Over-Evaluating

**Comparing more than three options.**
If you are evaluating 8 JavaScript frameworks, you have already lost. The differences between the top three candidates are marginal. Pick one, build something, and move on. The time spent on a 15-framework comparison matrix would have been better spent shipping features.

**Evaluating for more than two weeks.**
A technology evaluation that takes longer than two weeks is almost certainly over-engineered. Most decisions can be made in 3-5 days with a focused proof-of-concept. If you cannot differentiate between candidates in two weeks, the candidates are interchangeable — pick the one with the largest community and move on.

**The decision is easily reversible.**
Choosing a CSS framework, a date-parsing library, a logging format, or a testing framework. These decisions can be changed without rewriting the system. Spend 30 minutes, pick one, and move on.

**Technology FOMO is driving the evaluation.**
"We should evaluate Rust" for a CRUD API that does 50 requests per second. "We should look at Deno" when Node.js is working fine. "Maybe we should switch to Bun" because it benchmarks faster on a microbenchmark that is irrelevant to your workload. If the current technology is not causing measurable problems, there is nothing to evaluate.

**The team is avoiding shipping by evaluating.**
This is the most insidious form. Evaluation feels productive — you are reading documentation, building prototypes, writing comparison documents. But if the evaluation is a substitute for making a decision and building the actual product, it is procrastination dressed as diligence.

### Real-World Examples of Over-Evaluation

**The startup that spent 6 weeks choosing a frontend framework.** A three-person team spent six weeks comparing React, Vue, Svelte, Angular, and Solid. They built toy prototypes in each, wrote a 40-page comparison document, and held four meetings to debate. They chose React — the same framework two of the three developers already knew. Six weeks of runway burned. The comparison document was never referenced again.

**The "we should use Rust" conversation.** A team building an internal CRUD tool — forms, lists, basic search — spent three weeks exploring whether to write the backend in Rust for "performance." The tool would have at most 200 concurrent users. They eventually chose Node.js with Express, which they already knew. The Rust evaluation produced a half-finished prototype that demonstrated the team could not be productive in Rust. Total cost: three weeks of a senior developer's time, plus the opportunity cost of features not shipped.

**Database evaluation for a known workload.** A team with a relational data model, ACID transaction requirements, and existing PostgreSQL expertise spent a month evaluating MongoDB, CockroachDB, and PlanetScale. They chose PostgreSQL. The evaluation confirmed what the team's experience already predicted. The month would have been better spent building the schema and writing queries.

### The Default Stack Heuristic

When you catch yourself over-evaluating, apply the default stack heuristic: if the most common, boring choice would work for your use case, choose it and move on. PostgreSQL is the default database. React or Next.js is the default frontend. Python, Node.js, or Go is the default backend (pick the one the team knows). AWS or a PaaS is the default infrastructure. Redis is the default cache. These defaults are not optimal for every situation, but they are sufficient for most situations, and "sufficient and shipping" beats "optimal and still evaluating."

---

## How It Works

### Evaluation Criteria

When a decision warrants formal evaluation, assess candidates against these criteria, weighted by your specific context:

**1. Team Expertise (Weight: High)**
The single most important factor. A technology the team knows well will always outperform a "better" technology the team is learning. A team of Django experts will ship faster, debug faster, and operate more reliably with Django than with a theoretically superior framework they have never used. The learning curve is not a one-time cost — it compounds through every debugging session, every production incident, and every code review for months.

**2. Ecosystem Maturity (Weight: High)**
How old is the technology? How many production deployments exist? How many companies are running it at scale? Ecosystem maturity correlates with:
- Documented failure modes (you will find Stack Overflow answers for your errors)
- Battle-tested libraries (authentication, payments, email — already built and maintained)
- Known performance characteristics (benchmarks under real-world conditions, not synthetic tests)
- Established operational patterns (how to deploy, monitor, backup, upgrade)

A technology that has been in production for 10 years has had its sharp edges filed down by thousands of teams. A technology that launched last year has sharp edges that no one has found yet.

**3. Community Size and Activity (Weight: Medium-High)**
Measured by: GitHub stars (directional), npm/PyPI weekly downloads (quantitative), Stack Overflow question volume (practical), number of active contributors, frequency of releases, corporate backing. A large, active community means:
- Problems get solved quickly (someone else has already encountered your issue)
- Libraries stay maintained (abandoned libraries are a major source of tech debt)
- Hiring is easier (more developers know the technology)
- Knowledge resources are abundant (tutorials, courses, blog posts, conference talks)

**4. Hiring Pool (Weight: Medium-High)**
Can you hire developers who know this technology in your market and at your salary band? This is a business constraint that technical evaluations routinely ignore. A technology might be technically superior but irrelevant if you cannot hire for it. Check job posting volumes on LinkedIn, Indeed, and specialized job boards. Check salary data on levels.fyi or Glassdoor. If hiring for a technology requires a 30% salary premium, that is a real cost that should be factored into the evaluation.

**5. Long-Term Maintenance (Weight: Medium)**
Who maintains the technology? A solo maintainer on a critical open-source dependency is a supply-chain risk (the left-pad incident, the colors.js incident, the xz backdoor). Corporate-backed open source (React by Meta, Angular by Google, Spring by VMware) has more predictable maintenance but comes with the risk of corporate abandonment (Google's graveyard of killed products is long). Evaluate: release frequency, number of maintainers, corporate sponsorship, governance model, license stability.

**6. Performance Requirements (Weight: Context-Dependent)**
Performance matters only when it is a binding constraint. For a CRUD API serving 100 requests per second, the difference between Node.js (50,000 req/sec capacity) and Rust (500,000 req/sec capacity) is irrelevant — both are 100x over the requirement. Performance becomes a selection criterion only when:
- The workload is compute-intensive (video encoding, ML inference, real-time data processing)
- Latency requirements are below 10ms at p99
- Throughput requirements exceed what a single process in a general-purpose language can handle
- Memory constraints are tight (embedded systems, edge computing)

For the vast majority of web applications, any mainstream language and framework has sufficient performance.

**7. Licensing (Weight: Low but Critical)**
Most open-source licenses (MIT, Apache 2.0, BSD) are business-friendly. Watch for:
- **AGPL**: Requires you to open-source your entire application if you modify and deploy the AGPL-licensed code (relevant for SaaS).
- **SSPL (Server Side Public License)**: MongoDB's license, designed to prevent cloud providers from offering it as a service. May have implications for your deployment model.
- **BSL (Business Source License)**: Used by HashiCorp (Terraform, Vault). Restricts competitive use. Converts to open source after a time period.
- **License changes**: Redis, Elasticsearch, and MongoDB all changed licenses after achieving market dominance. Evaluate the risk of future license changes for critical dependencies.

**8. Integration with Existing System (Weight: Context-Dependent)**
If you are adding a technology to an existing system, how well does it integrate? Does it support your existing authentication system? Can it use your existing CI/CD pipeline? Does it work with your monitoring and logging infrastructure? Integration friction is a hidden cost that compounds over time.

### Structured Evaluation: Weighted Scoring Matrix

For high-stakes decisions, use a weighted scoring matrix to make the evaluation explicit and comparable:

```
Technology Evaluation: [Decision Title]
Date: YYYY-MM-DD
Evaluator(s): [Names]
Context: [Why this decision is being made now]

Criteria                    Weight    Option A    Option B    Option C
                                     Score W×S   Score W×S   Score W×S
─────────────────────────────────────────────────────────────────────────
Team expertise               25%      8   2.00    5   1.25    3   0.75
Ecosystem maturity           20%      9   1.80    7   1.40    6   1.20
Community / hiring pool      15%      8   1.20    7   1.05    4   0.60
Long-term maintenance        10%      8   0.80    7   0.70    7   0.70
Performance fit              10%      6   0.60    7   0.70    9   0.90
Integration w/ existing      10%      9   0.90    6   0.60    4   0.40
Learning curve               5%       8   0.40    6   0.30    3   0.15
Licensing                    5%       9   0.45    9   0.45    9   0.45
─────────────────────────────────────────────────────────────────────────
TOTAL                       100%          8.15        6.45        5.15

Scores: 1-3 = Poor fit, 4-6 = Adequate, 7-8 = Good fit, 9-10 = Excellent fit
```

The matrix does not make the decision — it makes the reasoning visible. If the scores are close (within 1 point), the candidates are effectively equivalent. Pick the one with the highest team expertise score and move on.

### Proof-of-Concept: Build the Hard Parts First

When evaluating a technology, build a proof-of-concept that tests the hardest part of your use case — not the easiest. Every framework's tutorial makes the easy parts look good. The question is how the technology handles the parts that are specific to your problem.

**Bad PoC**: Build a to-do list in the new framework. This tests nothing — every framework can render a list and handle form submission.

**Good PoC**: Build the authentication flow with your SSO provider, the complex query that joins 5 tables with pagination, the WebSocket connection that handles 1,000 concurrent users, the file upload that processes 500MB files. Build the part that will be hardest in production.

**PoC time-box**: 3-5 days maximum. If you cannot build a meaningful proof-of-concept in a week, either the technology has too steep a learning curve for your team or your PoC scope is too large.

### The Dan McKinley Test

Before finalizing any technology decision, ask:

1. How many of our three innovation tokens does this spend? (If the answer is zero — the technology is boring and well-understood — proceed. If the answer is one or more, justify the spend against what other innovation you need.)
2. What is the failure mode we have never seen? (Boring technology has documented failure modes. New technology has undiscovered failure modes. How much production risk are we accepting?)
3. Could we accomplish this with a technology we already operate? (If yes, the new technology must provide a dramatic — not marginal — improvement to justify the operational overhead.)
4. Who will be on-call for this at 2am? (If the answer is "the one person who proposed it," the technology is a bus-factor risk, not a team capability.)

---

## Trade-Offs Matrix

| Approach | You Get | You Pay |
|---|---|---|
| Cutting-edge technology | Latest features, potential performance gains, developer excitement | Unknown failure modes, sparse documentation, small hiring pool, ecosystem gaps, risk of abandonment |
| Boring / established technology | Documented failure modes, large ecosystem, easy hiring, abundant resources | May lack latest features, perceived as "uncool," possible performance ceiling for extreme workloads |
| Specialized technology (e.g., TimescaleDB for time-series) | Optimized for specific workload, purpose-built performance | Another system to operate, smaller community, harder to hire, may not generalize |
| General-purpose technology (e.g., PostgreSQL for everything) | One system to operate, deep team expertise, broad applicability | May not be optimal for any specific workload, requires creative solutions for edge cases |
| Popular technology (React, Node.js) | Largest hiring pool, most libraries, most tutorials, most Stack Overflow answers | May not be best technical fit, hype-driven adoption can mask weaknesses |
| Best-fit technology (Elixir for real-time, Rust for systems) | Optimal for specific use case, developer satisfaction for that domain | Smaller hiring pool, less ecosystem breadth, higher onboarding cost |
| Single-vendor platform (Firebase, Supabase) | Fast initial development, integrated tooling, managed operations | Vendor lock-in, pricing risk, feature constraints, migration difficulty |
| Multi-vendor / open-source stack | No lock-in, maximum flexibility, cost control | Integration burden, operational overhead, more decisions to make |
| Monoglot stack (one language everywhere) | Shared expertise, code reuse, single build pipeline, easy hiring | Suboptimal for some workloads, "when you have a hammer" risk |
| Polyglot stack (best language per component) | Optimal tooling per workload | Multiple build pipelines, fragmented expertise, harder hiring, operational overhead |
| Managed services (RDS, ElastiCache, SQS) | Reduced operational burden, built-in scaling, automated backups | Higher cost, less control, vendor lock-in, potential latency overhead |
| Self-managed infrastructure | Full control, cost optimization at scale, no vendor constraints | Operational burden, requires dedicated infrastructure expertise, on-call overhead |

---

## Evolution Path

Technology choices are not permanent. When a technology is not working, the question is how to migrate without a catastrophic rewrite.

### When to Migrate

Migration is justified only when the current technology is a measurable bottleneck:
- **Performance ceiling**: The technology cannot handle the current workload, and tuning has been exhausted (not "we think it might not scale someday").
- **Hiring failure**: You have had open positions for 6+ months because you cannot find developers for the current stack.
- **Security end-of-life**: The technology is no longer receiving security patches (Python 2 after January 2020, older Node.js LTS versions).
- **Ecosystem abandonment**: Core libraries are unmaintained, the community has moved on, and you are maintaining forks of critical dependencies.
- **Licensing change**: The vendor changed the license in a way that is incompatible with your business model (the HashiCorp BSL change, the Redis SSPL change).

Migration is NOT justified by:
- "The new framework has nicer syntax"
- "Developers are bored with the current stack"
- "Conference talks are all about the new technology"
- "A competitor switched"

### Incremental Migration Patterns

**Strangler Fig Pattern.**
Named by Martin Fowler after strangler fig trees that grow around existing trees. New functionality is built in the new technology. A routing layer (API gateway, reverse proxy, or application-level router) directs requests to either the old or new system. Over time, more and more functionality is handled by the new system until the old system can be decommissioned. This is the safest migration pattern.

Allianz, one of the world's largest insurers, used the Strangler Fig pattern with Kafka as an event backbone to gradually migrate from legacy mainframes to cloud-based microservices — processing real-time claims data without disrupting existing operations.

**Branch by Abstraction.**
Introduce an abstraction layer (interface/adapter) between your application code and the technology you want to replace. Implement the interface for both the old and new technology. Use feature flags to route traffic between implementations. Validate the new implementation under production load before cutting over. Remove the old implementation.

**Parallel Run.**
Run both the old and new systems simultaneously. Send all traffic to both. Compare outputs. Investigate discrepancies. Only cut over when the new system produces identical results for a sustained period (typically 2-4 weeks). GitHub used this pattern when migrating from MySQL to a new database infrastructure.

**Blue-Green Migration.**
Deploy the new system alongside the old system. Switch all traffic at once. Keep the old system running as a fallback. Roll back instantly if problems are detected. This is appropriate for stateless services but risky for stateful systems (databases) where data diverges the moment you switch.

### The Migration Anti-Pattern: Big-Bang Rewrite

The big-bang rewrite — stop all feature development, rewrite the system from scratch in the new technology, switch over on launch day — fails more often than it succeeds. Joel Spolsky called it "the single worst strategic mistake that any software company can make." The second system carries all the complexity of the first without the years of accumulated bug fixes, edge-case handling, and domain knowledge embedded in the original code. Netscape's rewrite (which took three years and nearly killed the company) is the canonical cautionary tale.

---

## Failure Modes

### Resume-Driven Development

**Pattern**: A developer or tech lead chooses a technology because they want it on their resume, not because it is the best fit for the project. The decision is rationalized with technical arguments, but the true motivation is career advancement.

**Symptoms**: The technology is dramatically more complex than the problem requires. The proposer is the only person who can work with it. The proposal emphasizes the technology's general capabilities rather than its fit for the specific problem. The proposal lacks a comparison with simpler alternatives.

**Impact**: The team inherits a technology they do not understand, cannot maintain, and cannot hire for. When the proposer leaves (and resume-driven developers tend to leave once the technology is on their resume), the team is stuck with an alien system.

**Prevention**: Require every technology proposal to include a comparison with the boring default. Require the proposer to demonstrate that the problem cannot be solved with existing technology. Ask: "If the person proposing this leaves tomorrow, can the rest of the team maintain it?"

### Shiny Object Syndrome

**Pattern**: The team chases new technologies because they are new, not because they solve a specific problem. Every conference talk and Hacker News post triggers a reevaluation of the stack.

**Symptoms**: The team has started multiple migrations but finished none. The codebase contains three different ORMs, two state management libraries, and four CSS approaches. Developers spend more time reading about new tools than building with existing ones. Without a framework to evaluate new technologies, shiny-object-driven decisions result in tool bloat, technical debt, and high software development costs. Teams sink time into prototypes that never ship.

**Impact**: Every new tool means another learning curve, more bugs, and reduced productivity — some studies suggest by as much as 40%. Context-switching between technologies within a single codebase destroys flow state and makes onboarding brutally slow.

**Prevention**: Establish a technology review process: any new technology must be proposed in writing with a problem statement, an evaluation against the boring alternative, and a proof-of-concept. The bar for introduction is high; the default answer is "no."

### Ignoring Team Expertise

**Pattern**: Choosing the "objectively best" technology while ignoring the team's actual skills. A team of Python developers is asked to build in Go because Go has better concurrency primitives. A team of React developers is switched to Svelte because Svelte has smaller bundle sizes.

**Symptoms**: Velocity drops by 50-70% during the learning period. Code reviews become arguments about idioms. Production incidents increase because the team does not understand the technology's failure modes. Senior developers feel demoted to junior-level productivity.

**Impact**: Months of reduced output. Increased turnover as developers who do not want to learn the new technology leave. The team never achieves the productivity they had with their previous stack because expertise takes years to build.

**Prevention**: Weight team expertise as the single highest factor in technology evaluation. A technology the team knows well, running at 80% of theoretical optimal, outperforms a "better" technology running at 30% of its potential because the team is still learning.

### Underweighting Ecosystem Maturity

**Pattern**: Choosing a technology based on benchmarks, features, or architecture elegance while ignoring the practical ecosystem: libraries, tools, documentation, and community knowledge.

**Symptoms**: The team spends weeks building authentication from scratch because the framework does not have a mature auth library. Common tasks (PDF generation, email sending, payment processing) require custom integration code. Error messages return zero Google results. The team becomes unpaid beta testers for the technology's ecosystem.

**Impact**: Development velocity is 2-3x slower than it would be with a mature ecosystem. The team writes and maintains infrastructure code that would be a library call in a more established technology.

**Prevention**: Before choosing any technology, inventory the libraries you will need for your specific use case. Verify that each one exists, is maintained, and has production users. If more than two critical libraries are missing or immature, the technology is not ready for your use case regardless of its other merits.

### Choosing Technology You Cannot Hire For

**Pattern**: Selecting a niche technology (Haskell, Elixir, Clojure, Nim) for a team that will need to grow. The technology may be technically excellent, but the hiring pool is a fraction of mainstream alternatives.

**Symptoms**: Job postings stay open for months. Candidates demand 30-50% salary premiums. The team cannot grow to meet business demands. Onboarding new hires takes 3-6 months instead of 2-4 weeks. The bus factor is dangerously low.

**Impact**: The technology becomes a growth bottleneck. The business cannot scale the team to meet demand. When key developers leave, institutional knowledge leaves with them and cannot be replaced.

**Prevention**: Before choosing a technology, check the hiring market in your geography and salary band. Search LinkedIn, Indeed, and specialized job boards. If the available talent pool is less than 10% of a mainstream alternative, factor this constraint explicitly into the decision. Niche technologies are appropriate only when the team is stable, small, and not expected to grow rapidly.

### Premature Optimization of the Stack

**Pattern**: Choosing technologies optimized for a scale the product has not reached and may never reach. Using Kafka when a simple database-backed job queue would suffice. Using Kubernetes when a PaaS would work. Using a distributed database when a single PostgreSQL instance has 100x headroom.

**Symptoms**: Infrastructure complexity vastly exceeds product complexity. The team spends more time operating infrastructure than building features. The system has 12 moving parts but serves 500 users.

**Impact**: Every engineering hour spent on infrastructure is an hour not spent on the product. Startups that over-engineer their infrastructure often run out of money before finding product-market fit — not because the technology failed, but because they optimized for a future that never arrived.

**Prevention**: Start with the simplest infrastructure that works. Upgrade when you have quantitative evidence that the current infrastructure is a bottleneck — not when you theorize that it might become one.

---

## Technology Landscape: Recommended Defaults

These are conservative, boring defaults for each technology category. They are not optimal for every situation, but they are sufficient for most situations and minimize innovation token expenditure.

### Programming Language

| Use Case | Default | Rationale |
|---|---|---|
| Web backend (general) | **TypeScript (Node.js)** or **Python** | Largest hiring pools, mature ecosystems, fast development velocity |
| Web backend (performance-sensitive) | **Go** | Simple concurrency model, fast compilation, single binary deployment, growing hiring pool |
| Web frontend | **TypeScript** | Industry standard, type safety reduces bugs, largest frontend ecosystem |
| Data / ML / AI | **Python** | Dominant ecosystem (NumPy, pandas, scikit-learn, PyTorch, TensorFlow), largest talent pool |
| Systems / infrastructure | **Go** or **Rust** | Go for services and CLIs; Rust when memory safety and zero-cost abstractions are required |
| Mobile (cross-platform) | **TypeScript (React Native)** or **Dart (Flutter)** | Largest cross-platform communities, single codebase for iOS and Android |
| Mobile (native) | **Swift (iOS)** / **Kotlin (Android)** | Platform-native performance and API access |

### Web Framework

| Use Case | Default | Rationale |
|---|---|---|
| Full-stack web app | **Next.js** | React-based, server-side rendering, API routes, massive community, Vercel deployment |
| API backend (Node.js) | **NestJS** or **Express** | NestJS for structure at scale, Express for simplicity |
| API backend (Python) | **Django** or **FastAPI** | Django for full-featured apps, FastAPI for pure APIs |
| API backend (Go) | **Standard library + Chi** or **Echo** | Go's stdlib is sufficient; Chi/Echo add routing convenience |
| API backend (Ruby) | **Ruby on Rails** | Convention over configuration, mature ecosystem, rapid development |

### Database

| Use Case | Default | Rationale |
|---|---|---|
| General-purpose relational | **PostgreSQL** | Most capable open-source RDBMS, JSON support, full-text search, extensions ecosystem, 30+ years of battle-testing |
| Simple relational (small scale) | **SQLite** | Zero-config, embedded, sufficient for apps with < 100 concurrent writers. Increasingly viable for production (Litestream, Turso) |
| Document store (if truly needed) | **MongoDB** | Largest NoSQL community, Atlas managed service. But ask first: does PostgreSQL's JSONB column solve the problem? |
| Key-value / cache | **Redis** | Industry standard, versatile (cache, session store, queue, pub/sub), well-understood operationally |
| Search | **PostgreSQL full-text search** first, then **Elasticsearch/OpenSearch** | PostgreSQL's built-in search handles most use cases. Elasticsearch only when you need faceted search, fuzzy matching at scale, or complex relevance tuning |
| Time-series | **TimescaleDB** (PostgreSQL extension) | Keeps you in the PostgreSQL ecosystem, avoids a separate data store |
| Analytics / OLAP | **ClickHouse** or **DuckDB** | ClickHouse for distributed analytics at scale (ThoughtWorks Radar: Adopt). DuckDB for embedded analytics |

### Queue / Message Broker

| Use Case | Default | Rationale |
|---|---|---|
| Background jobs | **Database-backed queue** (Sidekiq, Celery, BullMQ) | No additional infrastructure. Sufficient for most workloads |
| Event streaming (at scale) | **Apache Kafka** | Industry standard for high-throughput event streaming. Only introduce when database-backed queues are a proven bottleneck |
| Simple pub/sub | **Redis Pub/Sub** or **PostgreSQL LISTEN/NOTIFY** | Use what you already operate |

### Hosting / Infrastructure

| Use Case | Default | Rationale |
|---|---|---|
| Small team (< 10 engineers) | **PaaS**: Vercel, Railway, Render, Fly.io | Eliminates infrastructure operations. Ship code, not YAML |
| Medium team (10-50 engineers) | **AWS (ECS Fargate)** or **GCP (Cloud Run)** | Managed containers without Kubernetes complexity |
| Large team (50+ engineers) | **AWS (EKS)** or **GCP (GKE)** | Kubernetes justified when you have dedicated platform engineering capacity |
| Static sites / JAMstack | **Vercel** or **Cloudflare Pages** | Edge deployment, zero-config, generous free tiers |

### Monitoring / Observability

| Use Case | Default | Rationale |
|---|---|---|
| Error tracking | **Sentry** | Industry standard, excellent integrations, actionable alerts |
| APM / metrics | **Datadog** or **Grafana Cloud** | Datadog for all-in-one; Grafana for open-source flexibility |
| Logging | **Structured JSON to stdout** + collector | Framework-agnostic, works with any log aggregation platform |
| Uptime monitoring | **Better Uptime** or **Checkly** | Simple, focused, inexpensive |

---

## Decision Tree

```
Is this a new project / greenfield?
  YES:
    Does the team have strong expertise in a specific stack?
      YES → Use that stack. Team expertise trumps all other factors.
      NO → Use the recommended defaults from the Technology Landscape
            section above. Do not evaluate alternatives unless you have
            a specific, documented requirement that the defaults cannot meet.

  NO (adding technology to existing system):
    Can the existing technology handle this use case?
      YES → Use the existing technology. Do not add complexity.
            PostgreSQL can probably do what you think you need
            Elasticsearch for. Redis can probably do what you think
            you need Kafka for.
      NO (genuinely cannot):
        Is this a high-stakes decision (database, language, framework)?
          YES → Run formal evaluation (weighted scoring matrix, PoC).
                Time-box to 2 weeks maximum.
          NO → Pick the most popular option in the category.
               Install it. Move on.

How many innovation tokens does this spend?
  ZERO (boring, well-understood technology):
    → Proceed. This is the ideal outcome.
  ONE (new-to-team but industry-established):
    → Proceed if the justification is strong and documented.
  TWO (new-to-team AND relatively new to industry):
    → Reconsider. This is high risk. Can you solve this problem
       with a zero-token technology?
  THREE (new everything):
    → Stop. You are about to spend your entire innovation budget
       on infrastructure. Revisit your approach.

Is the team over-evaluating?
  More than 3 options being compared → Narrow to 2.
  Evaluation running > 2 weeks → Make a decision today.
  No measurable problem with current tech → Stop evaluating.
  The evaluation is more exciting than the product work → Stop evaluating.
```

---

## Implementation Sketch

### Technology Evaluation Template

Use this template when a formal evaluation is warranted:

```markdown
# Technology Evaluation: [Title]

## Context
- **Date**: YYYY-MM-DD
- **Decision maker(s)**: [Names and roles]
- **Deadline for decision**: [Date — max 2 weeks from start]

## Problem Statement
[What specific problem are we solving? What is the measurable impact
of the current situation? Why can't the existing technology handle this?]

## Constraints
- Team expertise: [What does the team know today?]
- Timeline: [When must this be in production?]
- Budget: [Licensing costs, infrastructure costs, training costs]
- Hiring: [Will we need to hire for this technology?]
- Integration: [What must this work with?]

## Options Considered
### Option A: [Name] (the boring default)
- Description: [What is it]
- Pros: [Specific to our context]
- Cons: [Specific to our context]
- Innovation tokens spent: [0-3]
- PoC result: [What did the proof-of-concept reveal?]

### Option B: [Name]
- Description:
- Pros:
- Cons:
- Innovation tokens spent:
- PoC result:

### Option C: [Name] (only if genuinely different from A and B)
- Description:
- Pros:
- Cons:
- Innovation tokens spent:
- PoC result:

## Weighted Scoring Matrix
[Insert scoring matrix from the How It Works section]

## Recommendation
[Which option and why. One paragraph maximum.]

## Risks and Mitigation
[What could go wrong with the chosen option? How will we detect and
respond to problems? What is the rollback plan?]
```

### ADR Template for Technology Choice

Every significant technology decision should be recorded as an Architecture Decision Record:

```markdown
# ADR-NNN: [Technology Choice Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-NNN]

## Date
YYYY-MM-DD

## Context
[What is the situation that is forcing this decision? What problem are
we solving? What constraints exist?]

## Decision
We will use [technology] for [purpose].

## Rationale
- Team expertise: [How well the team knows this technology]
- Ecosystem maturity: [How established the technology is]
- Innovation tokens: [How many this spends, and what we're saving them for]
- Alternatives considered: [What we evaluated and why we rejected it]

## Consequences

### Positive
- [What becomes easier or better]

### Negative
- [What becomes harder or worse — be honest]

### Neutral
- [What changes but is neither better nor worse]

## Review Date
[When will we revisit this decision? Typically 6-12 months.]
```

### Pre-Decision Checklist

Before finalizing any technology choice, verify:

```
[ ] Problem statement is documented — we know WHY we need this
[ ] Current technology cannot solve the problem (verified, not assumed)
[ ] Team expertise has been assessed honestly
[ ] Proof-of-concept tested the HARD parts, not the easy parts
[ ] Innovation token count is acceptable (ideally 0)
[ ] Hiring impact has been evaluated
[ ] Licensing has been reviewed (AGPL, SSPL, BSL risks)
[ ] Operational burden has been estimated (who maintains this at 2am?)
[ ] Rollback plan exists (what if this choice is wrong?)
[ ] ADR has been written and shared with the team
[ ] The boring alternative has been seriously considered
```

---

## Cross-References

Related expertise modules to read alongside this one:

- **`architecture-decision-records.md`**: The process and format for documenting technology decisions. Every technology choice should produce an ADR. Read this to understand the documentation discipline that makes technology decisions traceable and reversible.
- **`build-vs-buy.md`**: A closely related decision framework. Build-vs-buy evaluates whether to create custom software or use an existing product. Technology selection evaluates which tools to build with. The two decisions often occur together and share evaluation criteria.
- **`twelve-factor-app.md`**: The operational principles that make any technology choice cloud-native. Applying twelve-factor principles (environment-based config, stateless processes, disposable containers) reduces the cost of switching technologies later by ensuring your application is not tightly coupled to specific infrastructure.
- **`monolith.md`**: The default architecture for new projects. Technology selection and architecture selection are intertwined — choosing a monolith narrows the technology decision to a single language and framework, which simplifies the evaluation considerably.

---

## Summary Judgement

Technology selection is not a technical problem. It is a resource allocation problem. Every team has finite capacity to absorb new technology — finite learning time, finite operational expertise, finite hiring bandwidth. The innovation tokens model captures this: you get roughly three, and you should spend them on what makes your product unique, not on your infrastructure.

The bias should always be toward boring. PostgreSQL, not the new distributed database. React, not the framework launched last month. AWS or a PaaS, not the boutique cloud provider. The boring choice has thousands of teams' worth of operational knowledge baked into its documentation, its Stack Overflow answers, and its library ecosystem. The exciting choice has a README and a promise.

When you do spend an innovation token, spend it deliberately: document the decision in an ADR, build a proof-of-concept that tests the hard parts, verify the hiring pool, and establish a rollback plan. Make the bet explicit so the team can evaluate it honestly.

The best technology decision is the one that lets you stop thinking about technology and start thinking about your product.

---

*Researched: 2026-03-08*

*Sources:*
- *[Choose Boring Technology — Dan McKinley](https://mcfunley.com/choose-boring-technology)*
- *[Boring Technology Club](https://boringtechnology.club/)*
- *[Choose Boring Technology Culture — charity.wtf](https://charity.wtf/2023/05/01/choose-boring-technology-culture/)*
- *[Summary: Choose Boring Technology — Anna Geller](https://www.annageller.com/p/summary-choose-boring-technology)*
- *[ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar)*
- *[ThoughtWorks Technology Radar Vol. 33 (November 2025)](https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2025/11/tr_technology_radar_vol_33_en.pdf)*
- *[Avoiding Shiny Object Syndrome When Building Software — LeadDev](https://leaddev.com/tech/avoiding-shiny-object-syndrome-when-building-software)*
- *[Shiny Object Syndrome Is Wasting Your Team's Time — The CTO Club](https://thectoclub.com/software-development/shiny-object-syndrome-is-wasting-your-teams-time-and-energy/)*
- *[A Six-Point Framework for Technology Selection — Crosslake](https://crosslaketech.com/a-six-point-framework-for-selecting-the-right-technology/)*
- *[7 Key Criteria for Technology Selection — HyperSense](https://hypersense-software.com/blog/2023/06/20/7-key-criteria-for-choosing-right-technology-for-your-project/)*
- *[10 Criteria to Evaluate When Choosing Technology — Vera Solutions](https://verasolutions.org/blog-10-criteria-to-evaluate-when-choosing-a-new-technology/)*
- *[Choosing Your Tech Stack as a Startup — Addjam](https://addjam.com/blog/2025-02-14/choosing-tech-stack-startup-guide/)*
- *[How to Pick a Tech Stack Without Regretting It — Softkit](https://www.softkit.dev/blog/pick-tech-stack-startup-2025-guide/)*
- *[Strangler Fig Pattern — Martin Fowler](https://martinfowler.com/bliki/StranglerFigApplication.html)*
- *[Strangler Fig Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)*
- *[Embracing Strangler Fig for Legacy Modernization — ThoughtWorks](https://www.thoughtworks.com/en-us/insights/articles/embracing-strangler-fig-pattern-legacy-modernization-part-one)*
- *[Real Stories: Case Studies in Technology Selection — Tony Byrne / LinkedIn](https://www.linkedin.com/pulse/real-stories-case-studies-technology-selection-tony-byrne/)*
