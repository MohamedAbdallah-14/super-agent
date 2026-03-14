# Scaling Anti-Patterns -- Performance Anti-Patterns Module

> Scaling failures are among the most expensive incidents in production systems. They strike at peak traffic -- the worst possible moment -- and cascade into multi-hour outages that destroy revenue and user trust. Most scaling failures are not caused by unprecedented load but by well-known anti-patterns that were never addressed. GitHub's June 2025 outage, where a routine database migration cascaded into a platform-wide crisis, is a reminder that even the most sophisticated engineering organizations are not immune.

> **Domain:** Performance
> **Severity:** Critical
> **Applies to:** Backend, Infrastructure, Distributed Systems
> **Key metrics:** Requests per second capacity, p99 latency under load, error rate during traffic spikes, time to recover from overload, cost per request

---

## Table of Contents

1. [Vertical Scaling Only (Bigger Server Syndrome)](#1-vertical-scaling-only-bigger-server-syndrome)
2. [Not Designing for Horizontal Scaling](#2-not-designing-for-horizontal-scaling)
3. [Sticky Sessions Preventing Scale-Out](#3-sticky-sessions-preventing-scale-out)
4. [Storing State on Local Filesystem](#4-storing-state-on-local-filesystem)
5. [Not Using Connection Pooling](#5-not-using-connection-pooling)
6. [Single Database for Everything](#6-single-database-for-everything)
7. [Not Planning for Thundering Herd](#7-not-planning-for-thundering-herd)
8. [Ignoring Backpressure](#8-ignoring-backpressure)
9. [Unbounded Queues](#9-unbounded-queues)
10. [Not Load Testing Before Launch](#10-not-load-testing-before-launch)
11. [Hot Spots from Poor Sharding](#11-hot-spots-from-poor-sharding)
12. [Cross-Shard Transactions](#12-cross-shard-transactions)
13. [Scaling by Adding Complexity](#13-scaling-by-adding-complexity)
14. [Ignoring Cold Start Problems](#14-ignoring-cold-start-problems)
15. [Not Planning for Graceful Degradation](#15-not-planning-for-graceful-degradation)
16. [Monolithic Database Migrations at Scale](#16-monolithic-database-migrations-at-scale)
17. [Network Calls in Loops](#17-network-calls-in-loops)
18. [Fan-Out Without Fan-In Limits](#18-fan-out-without-fan-in-limits)
19. [Not Using Read Replicas When Read-Heavy](#19-not-using-read-replicas-when-read-heavy)
20. [Over-Provisioning vs Under-Provisioning](#20-over-provisioning-vs-under-provisioning)
21. [Root Cause Analysis](#root-cause-analysis)
22. [Self-Check Questions](#self-check-questions)
23. [Code Smell Quick Reference](#code-smell-quick-reference)
24. [Sources](#sources)

---

## 1. Vertical Scaling Only (Bigger Server Syndrome)

**Anti-pattern:** Responding to every capacity problem by upgrading to a larger server instance (more CPU, more RAM, bigger disk) instead of distributing load across multiple nodes.

**Why it happens:** Vertical scaling is the path of least resistance. No code changes required -- just resize the instance. Teams under pressure choose the fastest fix. Early-stage startups often lack the engineering capacity to design for horizontal scaling, so they throw hardware at the problem.

**Real-world incident:** Airbnb initially scaled their monolithic Ruby on Rails application by upgrading to progressively larger AWS EC2 instances. The strategy hit a wall when peak loads exceeded what any single instance could handle. High-end servers with 128 cores and 1TB of RAM cost exponentially more -- often 5x the price of a machine with half the specs -- delivering diminishing returns. Airbnb ultimately transitioned to a service-oriented architecture with horizontal scaling across regions.

**Why it fails:**
- Hardware has physical limits -- there is a largest server money can buy
- Cost scales superlinearly: doubling capacity often costs 3-5x more
- Creates a single point of failure -- if the one server goes down, everything goes down
- Maintenance windows require full downtime since there is no redundancy
- No geographic distribution possible

**The fix:**
- Design stateless application tiers from the start
- Use load balancers to distribute traffic across multiple instances
- Externalize state to shared stores (Redis, S3, managed databases)
- Adopt auto-scaling groups that add/remove instances based on load
- Vertical scale the database tier (where it is hardest to horizontally scale) but horizontally scale everything else

**Detection signals:**
- Monthly infrastructure bills growing faster than revenue
- Single-instance CPU consistently above 70%
- Downtime during maintenance windows with no failover
- Maximum instance size already in use

---

## 2. Not Designing for Horizontal Scaling

**Anti-pattern:** Building applications that assume a single-process, single-machine deployment. In-memory caches, local file storage, process-level singletons, and reliance on local disk all prevent adding more instances behind a load balancer.

**Why it happens:** Local development environments are inherently single-machine. Developers build and test on one machine and never encounter multi-instance issues until production. Frameworks often default to in-process state management. The cost of distributed design feels premature when you have 100 users.

**Real-world incident:** A SaaS platform stored uploaded user avatars on the local filesystem of the web server. When they added a second server behind a load balancer, half of all avatar requests returned 404 errors because the file only existed on the original server. Emergency migration to S3 required a maintenance window and data reconciliation.

**Why it fails:**
- Adding instances behind a load balancer produces inconsistent behavior
- In-memory caches diverge across instances, causing stale data bugs
- File uploads saved locally become inaccessible from other instances
- Process-level locks and singletons cause race conditions in multi-instance deployments
- Cannot leverage auto-scaling since new instances lack the accumulated state

**The fix:**
- Follow the Twelve-Factor App methodology: treat servers as disposable
- Store all persistent data in external services (databases, object storage, caches)
- Use distributed caching (Redis, Memcached) instead of in-process caches
- Design all endpoints to be stateless -- any instance can handle any request
- Use distributed locks (Redis SETNX, ZooKeeper) instead of local mutexes

**Detection signals:**
- Code references to `/tmp`, `/var/data`, or other local paths for user data
- `HashMap` or `Dictionary` used as an application-level cache
- Singleton pattern used for rate limiters or session stores
- Tests only run against a single instance

---

## 3. Sticky Sessions Preventing Scale-Out

**Anti-pattern:** Configuring load balancers to route all requests from a given user to the same backend server (session affinity), tying user state to a specific instance and defeating the purpose of horizontal scaling.

**Why it happens:** Server-side session storage (e.g., `HttpSession` in Java, session middleware in Express) stores user state in the process memory of whichever server handled the login. Without sticky sessions, the next request may hit a different server that has no knowledge of the session. Sticky sessions are the quick fix.

**Real-world incident:** A Kubernetes-based platform enabled sticky sessions to solve session consistency issues. When Horizontal Pod Autoscaler (HPA) scaled pods due to increased load, the new pods received zero traffic because all existing users were pinned to the original pods. The scaling event was effectively nullified -- new pods sat idle while overloaded pods continued to degrade. The team had to redesign session management using Redis before auto-scaling became functional.

**Why it fails:**
- New instances get no traffic until existing sessions expire, nullifying scale-out
- If a server fails, all pinned sessions are lost -- users experience errors or forced re-login
- Load becomes uneven: one server may handle 10x the traffic of another
- Rolling deployments are painful because draining sticky sessions takes time
- Cannot effectively use auto-scaling policies

**The fix:**
- Externalize session state to Redis, Memcached, or a database
- Use token-based authentication (JWT) where session data travels with the request
- Store only a session ID in a cookie; look up state from the shared store
- If sticky sessions are truly required (e.g., WebSocket connections), implement session replication as a fallback

**Detection signals:**
- Load balancer configuration includes `stickiness` or `affinity` settings
- Uneven request distribution visible in server metrics
- New instances show near-zero traffic after scaling events
- User complaints spike after server restarts

---

## 4. Storing State on Local Filesystem

**Anti-pattern:** Writing application state -- uploads, generated reports, cache files, session data, or temp files -- to the local disk of a server instance, making it inaccessible to other instances and lost on instance termination.

**Why it happens:** Writing to disk is the simplest I/O operation in any language. It works perfectly in development. Cloud instances come with local storage by default. The distinction between ephemeral and persistent storage is not obvious to developers unfamiliar with cloud-native patterns.

**Real-world incident:** An e-commerce platform generated PDF invoices and stored them at `/var/invoices/` on the web server. During a holiday traffic spike, auto-scaling launched four new instances. Customers who generated invoices on instance A could not download them when their next request was routed to instance B. The team scrambled to implement an S3-backed solution while simultaneously handling peak traffic -- the worst possible time for an architectural change.

**Why it fails:**
- Data is lost when instances are terminated, recycled, or crash
- Other instances cannot access the files, breaking multi-instance deployments
- Auto-scaling and spot/preemptible instances are incompatible with local state
- Disk space is finite and unmonitored, leading to silent failures when full
- No built-in redundancy or backup

**The fix:**
- Use object storage (S3, GCS, Azure Blob) for all user-facing files
- Use managed databases or Redis for application state
- Treat local disk as ephemeral scratch space only
- Mount shared filesystems (EFS, Filestore) if POSIX semantics are required
- Implement upload-to-cloud patterns where files go directly to object storage from the client

**Detection signals:**
- Code writes to `/tmp`, `/var`, or custom local paths for persistent data
- `os.path`, `fs.writeFile`, or `File.write` used for user-generated content
- No object storage SDK in project dependencies
- Missing files reported after deployments or scaling events

---

## 5. Not Using Connection Pooling

**Anti-pattern:** Opening a new database connection for every request and closing it afterward, or failing to limit the total number of connections across application instances, leading to connection exhaustion under load.

**Why it happens:** Default ORM and driver configurations often open connections on demand without pooling. In development, the connection count is low enough that it never matters. When the application scales to multiple instances with multiple workers each, the connection count multiplies and overwhelms the database.

**Real-world incident:** A production PostgreSQL database experienced full connection pool exhaustion when multiple Celery workers, each running several concurrent processes, opened more connections than the database could handle. The database began rejecting all new connections, causing a complete application outage. The immediate fix required a superuser connection to identify and kill hundreds of idle connections that had leaked from application code. Long-term, the team deployed PgBouncer to multiplex client connections through a smaller pool of actual database connections.

**Why it fails:**
- Each connection consumes ~10MB of database server memory (PostgreSQL)
- Connection establishment takes 50-200ms of TCP + TLS handshake overhead
- At scale, `max_connections` is exhausted, and all new queries are rejected
- Leaked connections (not returned to pool) silently accumulate until crisis
- Multiple application instances multiply the problem (10 instances x 20 workers x 5 connections = 1000 connections)

**The fix:**
- Configure connection pooling in the application (HikariCP, SQLAlchemy pool, Knex pool)
- Deploy a connection pooler proxy (PgBouncer, ProxySQL, Amazon RDS Proxy)
- Set pool sizes based on: `pool_size = (total_db_connections) / (num_instances * workers_per_instance)`
- Use context managers or try/finally to guarantee connection release
- Monitor active vs idle connections with alerts at 70% utilization

**Detection signals:**
- `too many connections` or `connection pool exhausted` errors in logs
- Database CPU low but connection count near maximum
- Queries timing out waiting for an available connection
- Increasing latency correlated with instance count rather than query complexity

---

## 6. Single Database for Everything

**Anti-pattern:** Using one database instance for all services, all data types, and all workloads -- OLTP transactions, analytics queries, search, session storage, job queues, and audit logs all hitting the same server.

**Why it happens:** Starting with one database is rational. It simplifies the technology stack, avoids distributed transaction complexity, and makes joins trivial. The problem is that teams never revisit this decision as the application grows and workload characteristics diverge.

**Real-world incident:** GitHub experienced repeated outages in February 2020 traced directly to database infrastructure. Application logic changes to database query patterns rapidly increased load on database clusters. A heavy analytics query on the shared database caused lock contention that blocked OLTP transactions, degrading the entire platform. GitHub subsequently invested heavily in database partitioning and workload isolation.

**Why it fails:**
- An analytics query holding locks blocks all transactional writes
- One slow query can saturate CPU and starve all other workloads
- Scaling the single database means scaling for the most demanding workload, even if others are light
- Schema migrations affect all services simultaneously
- Backup and restore times grow with total data volume, increasing recovery time

**The fix:**
- Separate OLTP from OLAP workloads (dedicated analytics database or data warehouse)
- Use purpose-built data stores: Redis for sessions, Elasticsearch for search, a queue service for job queues
- Implement the database-per-service pattern for microservices
- Use Change Data Capture (CDC) to replicate data between specialized stores
- Start with logical separation (schemas) and graduate to physical separation as load demands

**Detection signals:**
- Single connection string used across all services and background jobs
- Mixed query patterns: sub-millisecond lookups alongside multi-second aggregations
- Lock wait timeouts correlating with batch job schedules
- Schema with 200+ tables where domains overlap

---

## 7. Not Planning for Thundering Herd

**Anti-pattern:** Allowing all clients to simultaneously retry, reconnect, or request the same resource at the same moment, creating a synchronized stampede that overwhelms backends that might otherwise recover.

**Why it happens:** Systems are designed for steady-state traffic patterns. When a cache expires, a service restarts, or an outage ends, all waiting clients rush in simultaneously. Fixed retry intervals ensure every client retries at the same time. Developers test with one client at a time and never simulate coordinated surges.

**Real-world incident:** Depot experienced a thundering herd event where database traffic suddenly spiked, CPU usage jumped to 100%, and the overload cascaded into a much larger outage. Every client with retry logic retried simultaneously with fixed intervals, hitting the recovering database with the exact same wave of traffic again and again. Similarly, IRCTC (Indian Railways) pre-loads train data before the 10 AM Tatkal booking window but still struggles because millions of seat booking writes spike at exactly 10:00:00.

**Why it fails:**
- Cache expiration causes all requests to hit the origin simultaneously
- Service recovery is prevented because the herd arrives faster than the system can stabilize
- Retry storms amplify failures: N clients failing and retrying creates 2N, then 4N load
- Database connection pools are exhausted instantly
- CDN or cache layer going cold triggers origin overload

**The fix:**
- Add jitter to all retry intervals: `delay = base_delay * 2^attempt + random(0, base_delay)`
- Implement cache stampede protection: lock-based recomputation where only one request rebuilds the cache
- Use staggered TTLs: add random variance to cache expiration times
- Implement retry budgets: limit total retries per time window across the fleet
- Use load shedding at the gateway: return 503 with `Retry-After` header during overload
- Deploy request coalescing: deduplicate identical in-flight requests

**Detection signals:**
- Traffic graphs show sharp spikes to 10x+ normal immediately after recovery
- Cache hit rate drops from 99% to 0% simultaneously across all keys
- All retry timers use fixed intervals without jitter
- No circuit breakers between services

---

## 8. Ignoring Backpressure

**Anti-pattern:** Accepting every incoming request or message without regard for downstream capacity, allowing producers to overwhelm consumers until the system collapses from resource exhaustion.

**Why it happens:** Developers focus on throughput -- accepting requests as fast as possible. Saying "no" to a request feels like a bug. Load balancers, API gateways, and message brokers accept work by default. There is no built-in "slow down" signal in HTTP. The system works fine under normal load, so the problem is invisible until a traffic spike.

**Real-world incident:** A data pipeline ingested events from hundreds of IoT devices. The ingestion API accepted all messages and pushed them to a processing queue. When downstream processors slowed due to a database bottleneck, the queue grew to 40GB over six hours, the process hit its memory limit, and OOM-killed. All buffered events were lost. The system had no mechanism to signal producers to slow down or to shed excess load.

**Why it fails:**
- Memory grows unboundedly as work accumulates faster than it is processed
- Latency increases for all requests, not just the excess
- OOM kills cause abrupt crashes with no graceful cleanup
- Recovery is slow because the backlog must be drained before normal operation
- Downstream services may fail under the sudden surge when processing resumes

**The fix:**
- Implement rate limiting at the API gateway (token bucket, sliding window)
- Use bounded buffers and reject or drop when full (return 429 or 503)
- Implement reactive streams / flow control (gRPC flow control, Kafka consumer pause)
- Monitor queue depth and alert when it exceeds a threshold
- Design producers to handle rejection: exponential backoff, dead-letter queues
- Use admission control: shed load early rather than accepting work you cannot complete

**Detection signals:**
- Queue depth metrics trending upward with no plateau
- Memory usage growing linearly over time under sustained load
- No rate limiting configured on public-facing endpoints
- No 429 or 503 responses in access logs -- every request is accepted

---

## 9. Unbounded Queues

**Anti-pattern:** Using queues with no maximum size, allowing unlimited messages to accumulate in memory or on disk when consumers cannot keep up, eventually exhausting system resources.

**Why it happens:** Most queue implementations default to unbounded. Setting a limit feels like an arbitrary constraint. "What if we lose messages?" is a common objection. Teams assume consumers will always keep up and never plan for the contrary.

**Real-world incident:** After an upgrade to version 2025.10, Authentik (an identity provider) experienced OOM kills on worker pods due to unbounded queue growth in the `authentik_tasks_task` queue. Stale tasks accumulated without limit, consuming all available memory. The interim fix was a CronJob to periodically purge stale tasks, but the root cause was the absence of any queue size bound or TTL on enqueued items. Separately, Wazuh's remote message control queue (introduced in v4.13.0) had no size limit, allowing unlimited memory consumption during high agent load, risking complete memory exhaustion of the management server.

**Why it fails:**
- Memory consumption grows silently until the process is OOM-killed
- The failure mode is catastrophic: instant crash with no graceful degradation
- Processing latency for new messages equals the time to drain the entire backlog
- Messages at the tail of a massive queue may be stale by the time they are processed
- Monitoring often only tracks throughput, not queue depth

**The fix:**
- Set explicit maximum queue sizes on all queues (`maxlen`, `capacity`, `x-max-length`)
- Define a rejection policy: drop oldest, drop newest, reject producer, or dead-letter
- Add TTL to messages so stale items are automatically discarded
- Monitor queue depth, enqueue rate, and dequeue rate with alerts
- Implement consumer auto-scaling tied to queue depth metrics
- Size queues based on: `max_depth = consumer_throughput * max_acceptable_latency`

**Detection signals:**
- Queue configuration shows no `maxlen`, `capacity`, or size limit
- Memory usage on queue hosts trends upward during load spikes
- No dead-letter queue configured
- Consumer count is static regardless of queue depth

---

## 10. Not Load Testing Before Launch

**Anti-pattern:** Deploying to production without systematically testing the system under expected and peak traffic volumes, discovering capacity limits through real user impact instead of controlled experiments.

**Why it happens:** Load testing takes time to set up, requires realistic test data, and needs a production-like environment. Teams under deadline pressure skip it. "We can always scale up if needed" is the rationalization. Development environments give no indication of production-scale behavior.

**Real-world incident:** CodinGame experienced a "Reddit hug of death" that took their platform offline for 2 hours. They received as many new users in one day as during the previous two months. Post-mortem analysis revealed multiple failures that load testing would have caught: the RDS database was the main bottleneck with all data centralized and tangled, application servers had a memory leak that only manifested under heavy load, and the chat server process hit 100% CPU under concurrent connections. Industry data shows 80% of incidents are triggered by internal changes with insufficient testing.

**Why it fails:**
- True bottlenecks only appear under concurrent load (lock contention, connection limits, memory leaks)
- Capacity limits are unknown, making scaling decisions guesswork
- Performance regressions ship undetected when there is no baseline
- Third-party dependencies (payment processors, APIs) may rate-limit or fail under load
- Auto-scaling configurations are never validated -- minimum/maximum counts may be wrong

**The fix:**
- Establish a load testing practice with tools (k6, Locust, Gatling, Artillery)
- Test at 2x expected peak to find the breaking point, not just confirm the happy path
- Run soak tests (sustained load for hours) to detect memory leaks and connection exhaustion
- Include third-party dependencies in tests or mock them at realistic latencies
- Automate load tests in CI/CD to catch regressions per release
- Define performance budgets: maximum p99 latency, minimum throughput, maximum error rate

**Detection signals:**
- No load testing tools in project dependencies or CI/CD pipeline
- Production capacity limits are unknown -- "We will see"
- Performance metrics have no historical baseline
- First traffic spike causes unexpected failures

---

## 11. Hot Spots from Poor Sharding

**Anti-pattern:** Choosing a shard key that distributes data unevenly, causing one or a few shards to receive disproportionate read/write traffic while others sit idle.

**Why it happens:** Shard key selection requires understanding access patterns, data distribution, and growth projections. Teams often choose the most obvious key (user ID, tenant ID, timestamp) without analyzing the distribution. Some keys that appear uniform are actually highly skewed.

**Real-world incident:** A documented $2.4 million sharding project failed when, after implementation, one shard grew to 2,847,000 records while another had only 156,000. The root cause: enterprise customers had 10,000+ users while small customers had 1-5 users, and sharding by `customer_id` concentrated enterprise data on a few shards. In another case, an e-commerce platform sharded by product category, but the "electronics" category received 60% of all traffic, creating a persistent hot shard that required repeated hardware upgrades.

**Why it fails:**
- Hot shards become the bottleneck, capping system throughput at one shard's capacity
- Rebalancing data across shards is operationally expensive and risky
- Using timestamps as shard keys creates write-hot shards (all new data goes to one shard)
- Growth in one category or tenant can destabilize the entire cluster
- Monitoring may show "average" load as healthy while one shard is on fire

**The fix:**
- Analyze data distribution before choosing a shard key -- histogram the candidate key
- Use composite shard keys that combine a high-cardinality field with a distribution field
- Hash-based sharding (consistent hashing) provides uniform distribution at the cost of range query support
- Implement automatic rebalancing (as in MongoDB, CockroachDB, TiDB)
- Monitor per-shard metrics: CPU, IOPS, query latency, record count
- Consider virtual shards (more shards than nodes) to simplify rebalancing

**Detection signals:**
- One shard's CPU or IOPS is 5x+ higher than other shards
- Record counts vary by more than 3x across shards
- Shard key is a timestamp or low-cardinality field (status, country code)
- No per-shard monitoring dashboards exist

---

## 12. Cross-Shard Transactions

**Anti-pattern:** Designing sharded systems that require frequent transactions spanning multiple shards, introducing distributed coordination overhead (two-phase commit) that negates the throughput gains of sharding.

**Why it happens:** Applications are sharded for write throughput, but business logic still requires atomic operations across entities that live on different shards. "Transfer $100 from Account A (Shard 1) to Account B (Shard 2)" is a natural requirement that is extremely difficult to implement correctly in a sharded system.

**Real-world context:** Two-phase commit (2PC) has been the standard protocol for cross-shard consistency, used in systems from Oracle and PostgreSQL to Google Spanner and Apache Kafka. However, distributed systems expert Daniel Abadi argues: "I see very little benefit in system architects making continued use of 2PC in sharded systems moving forward." The protocol blocks when a participant fails, and if the coordinator fails permanently during the commit phase, some participants will never resolve their transactions, leaving data in an inconsistent state.

**Why it fails:**
- 2PC adds a coordination round-trip to every transaction, increasing latency by 2-10x
- Locks must be held across shards for the duration of the protocol, reducing throughput
- Coordinator failure during commit leaves data in an indeterminate state
- Deadlocks across shards are difficult to detect and resolve
- Throughput drops to the speed of the slowest shard

**The fix:**
- Design the data model so that related entities co-locate on the same shard
- Use the Saga pattern: break distributed transactions into compensatable local transactions
- Accept eventual consistency where business rules allow (most do)
- Use change data capture (CDC) and event sourcing for cross-shard data synchronization
- If strong consistency is required, use databases with native distributed transactions (CockroachDB, Spanner)
- Minimize cross-shard operations by denormalizing frequently-joined data onto the same shard

**Detection signals:**
- `BEGIN DISTRIBUTED TRANSACTION` or 2PC log entries in database logs
- Cross-shard query latency is 5x+ higher than single-shard latency
- Deadlock errors involving multiple shards
- Business logic requires joins across shard boundaries

---

## 13. Scaling by Adding Complexity

**Anti-pattern:** Responding to scaling challenges by introducing additional layers, services, caches, and technologies instead of first simplifying the existing architecture, removing unnecessary work, or optimizing hot paths.

**Why it happens:** Adding a cache in front of a slow query feels productive. Introducing a message queue between two services feels like proper engineering. Teams accumulate layers because each solves a proximate problem without addressing why the problem exists. Resume-driven development also plays a role -- engineers want to work with shiny distributed systems technologies.

**Real-world incident:** Pokemon Go's scaling crisis illustrates complexity backfiring. During their migration to Google Cloud load balancer (GCLB), the team added GCLB to scale the load balancing layer. But the additional capacity at the load balancing tier actually overwhelmed their backend stack -- the bottleneck was downstream, not at the load balancer. The migration prolonged the outage rather than fixing it. Adding capacity at the wrong layer amplified the failure.

**Why it fails:**
- Each new component adds latency, failure modes, and operational burden
- Caches create cache invalidation problems (one of the two hard things in computer science)
- More moving parts means more things that can fail simultaneously
- Debugging requires understanding interactions between N components instead of one
- Operational overhead grows: monitoring, alerting, upgrades, and on-call burden multiply

**The fix:**
- Before adding a component, ask: "Can we remove or simplify something instead?"
- Profile first: find the actual bottleneck before adding infrastructure
- Remove unnecessary middleware, ORM layers, and abstraction layers
- Optimize the hot path: 90% of load is often caused by 10% of code paths
- Evaluate whether the existing technology can be tuned before introducing a new one
- Apply the "boring technology" principle: use proven, well-understood tools

**Detection signals:**
- Architecture diagrams require a legend and multiple pages
- More infrastructure components than team members
- Incidents frequently involve interactions between components rather than individual failures
- Team cannot explain the full request path from client to database

---

## 14. Ignoring Cold Start Problems

**Anti-pattern:** Failing to account for initialization latency when new instances, containers, or serverless functions are launched, causing latency spikes and timeouts during scale-out events or after periods of low traffic.

**Why it happens:** Cold starts are invisible in steady-state monitoring. Functions and containers that are already warm respond in milliseconds. The problem only manifests during scaling events (new instances launching) or after idle periods (serverless environments recycling). Developers testing against warm environments never experience the issue.

**Real-world incident:** AWS Lambda cold starts typically add 100ms-2s to function execution time depending on runtime, dependencies, and code size. While cold starts affect less than 1% of requests in steady state, during traffic spikes every new concurrent invocation experiences a cold start. In event-driven architectures with functions calling other functions, the probability that at least one function in the chain is cold approaches 100%, causing cascading latency. One team reported that a chain of five Lambda functions experienced compounding cold starts that pushed end-to-end latency from 200ms (warm) to 8 seconds (all cold).

**Why it fails:**
- Health checks pass before the application is actually ready to serve traffic
- JVM-based services need time for JIT compilation -- first requests are 10-100x slower
- Dependency initialization (database connections, SDK clients, config loading) takes seconds
- Auto-scaling triggers bring up instances that immediately receive traffic before warming up
- Serverless environments recycle idle instances unpredictably

**The fix:**
- Implement readiness probes that verify the application can actually serve requests
- Use connection pre-warming: establish database and cache connections during startup
- For Lambda: use Provisioned Concurrency to keep functions initialized
- Pre-warm caches on startup by loading frequently-accessed data
- Use progressive traffic shifting: new instances receive traffic gradually, not all at once
- Minimize dependency count and use lazy initialization for non-critical paths

**Detection signals:**
- p99 latency is 10x+ higher than p50
- Latency spikes correlate with scaling events or deployment times
- First request after idle period is significantly slower
- Startup logs show multi-second initialization sequences

---

## 15. Not Planning for Graceful Degradation

**Anti-pattern:** Building systems that either work at full capacity or fail completely, with no intermediate modes that maintain core functionality when subsystems are impaired.

**Why it happens:** Systems are designed for the happy path. Failure handling is an afterthought. "If the recommendation service is down, what do we show?" is a question that never gets asked during design. Feature flags and degradation modes require upfront investment that feels wasteful when everything is working.

**Real-world incident:** Pokemon Go's launch is a canonical example. Instead of degrading gracefully -- for example, disabling social features, reducing map detail, or limiting new registrations -- the entire system collapsed under unexpected load. Users could not log in at all. In contrast, Fastly's CDN is designed so that if an origin server is unavailable, it serves stale cached content rather than error pages, maintaining user experience while giving incident responders time to diagnose and fix the root cause.

**Why it fails:**
- Total outage of a non-critical subsystem takes down the entire application
- Users get error pages instead of reduced-functionality experiences
- Incident responders have no levers to shed load or disable features
- Recovery is all-or-nothing, making partial restoration impossible
- No fallback behavior has been designed or tested

**The fix:**
- Identify critical vs non-critical features and design fallbacks for non-critical ones
- Implement circuit breakers (Hystrix, Resilience4j, Polly) for all downstream dependencies
- Use feature flags to disable resource-intensive features during overload
- Serve stale/cached data when fresh data is unavailable
- Design load-shedding endpoints: drop excess requests at the edge, not deep in the stack
- Implement priority queues: process high-value requests first during degradation
- Test degradation modes regularly -- chaos engineering validates that fallbacks work

**Detection signals:**
- No circuit breakers in the codebase
- No feature flag system deployed
- Error pages are the only failure response -- no partial functionality
- Runbooks say "wait for recovery" instead of listing degradation steps

---

## 16. Monolithic Database Migrations at Scale

**Anti-pattern:** Running schema-altering DDL operations (adding columns, creating indexes, altering types) on large production tables using blocking operations that lock the table and halt all reads or writes for the duration of the migration.

**Why it happens:** ORMs generate migration files that use standard `ALTER TABLE` statements. These work fine on small tables. Developers test migrations on development databases with 1,000 rows, not production databases with 50 million rows. The migration that takes 200ms in development takes 45 minutes in production -- and locks the table the entire time.

**Real-world incident:** GitHub's June 2025 outage was triggered by a planned database migration that cascaded into a multi-hour incident disrupting repositories, pull requests, GitHub Actions, and dependent services. The migration triggered unanticipated load patterns on primary database clusters, causing cascading failures. In another documented case, adding an index to a 50-million-row table locked the entire table, blocking all reads and writes for 45 minutes, with downstream cost estimated at $5,600 per minute of downtime.

**Why it fails:**
- `ALTER TABLE` acquires exclusive locks on large tables, blocking all queries
- Index creation on large tables can take minutes to hours
- Failed migrations may leave the schema in an inconsistent state
- Rollback of a partially-applied migration can be more dangerous than the migration itself
- Multiple services depending on the same table are all affected simultaneously

**The fix:**
- Use online schema change tools: `pt-online-schema-change` (MySQL), `pg_repack` (PostgreSQL), `gh-ost` (GitHub's own tool)
- Add columns as nullable first, backfill data, then add constraints
- Create indexes with `CONCURRENTLY` (PostgreSQL) or equivalent non-blocking syntax
- Implement expand-contract migrations: add the new schema alongside the old, migrate data, then remove the old
- Test migrations against production-sized datasets before deploying
- Use feature flags to gradually shift traffic to new schema paths
- Schedule migrations during low-traffic windows with rollback plans

**Detection signals:**
- Migration files contain raw `ALTER TABLE ... ADD COLUMN ... NOT NULL`
- No online schema change tooling in the deployment pipeline
- Migration testing only runs against seeded development databases
- Lock wait timeout errors during deployments

---

## 17. Network Calls in Loops

**Anti-pattern:** Making individual network requests (database queries, API calls, cache lookups) inside a loop, turning what should be a single batch operation into N sequential round-trips, each paying full network latency.

**Why it happens:** ORMs make it easy: `for order in orders: order.customer.name` triggers a query per iteration (the N+1 problem). REST APIs expose individual resources, so fetching related data requires one call per item. The code reads naturally and works correctly -- it is just catastrophically slow at scale.

**Real-world incident:** A developer documented reducing API response time from 30 seconds to under 1 second by eliminating N+1 queries. The endpoint listed 500 orders, and for each order, made a separate database query to fetch the customer -- 501 total queries. Each query took 2ms on the network, but 501 x 2ms = 1 second of pure network latency, plus database processing time. Replacing this with a single `WHERE customer_id IN (...)` query reduced the total to 2 queries and sub-100ms response time. At high traffic, the N+1 version generated 50,000+ queries per second from a single endpoint.

**Why it fails:**
- Each network call adds 1-5ms of latency (TCP round-trip), which multiplies by N
- Database connection pool is consumed by N concurrent connections for one user request
- Serialization/deserialization overhead multiplies by N
- Total latency grows linearly with data size, making the endpoint unusable as data grows
- Database query logs show thousands of nearly-identical queries

**The fix:**
- Use batch APIs: `GET /users?ids=1,2,3` instead of N individual calls
- Use eager loading in ORMs: `includes(:customer)` (Rails), `joinedload()` (SQLAlchemy), `.Include()` (EF Core)
- Implement DataLoader pattern for GraphQL (batches and deduplicates within a request)
- Replace loops with `WHERE ... IN (...)` queries
- Use database views or materialized views to pre-join data
- Add N+1 detection tools: Bullet (Rails), nplusone (Django), SQLAlchemy warnings

**Detection signals:**
- Database query logs show repeated queries with only the parameter changing
- Endpoint latency scales linearly with result set size
- ORM lazy-loading enabled with no eager-loading configuration
- API calls inside `for`, `forEach`, `map`, or `while` loops

---

## 18. Fan-Out Without Fan-In Limits

**Anti-pattern:** Designing systems where a single request triggers many parallel downstream requests (fan-out) without limiting how many can be in flight simultaneously, risking overwhelming downstream services and creating cascading failures.

**Why it happens:** Fan-out is a natural pattern: a social media timeline request fans out to N friend feeds, a search request fans out to N index shards, an API gateway fans out to N microservices. The pattern works at small N but becomes dangerous as N grows. Developers set fan-out based on the data model without considering the downstream capacity.

**Real-world context:** LinkedIn published research (Moolle, ICDE 2016) on fan-out control for scalable distributed data stores, documenting how unlimited fan-out in their social graph queries could overwhelm backend storage nodes. Their system found that keeping dependency chains shallow (1-2 levels) and limiting parallel requests per tier was essential for stability. Without fan-in limits, a single user request could generate thousands of backend queries, and a modest traffic spike would amplify into a backend-crushing storm.

**Why it fails:**
- N downstream calls means N chances for failure -- probability of at least one failure approaches 1
- Total latency is bounded by the slowest of N calls (tail latency amplification)
- Downstream services experience N x traffic amplification from fan-out
- Retry logic on fan-out calls multiplies the amplification effect
- One slow downstream service blocks the entire fan-in, wasting the fast responses

**The fix:**
- Set explicit concurrency limits on fan-out calls (semaphores, worker pools)
- Implement timeouts per fan-out call -- do not wait for stragglers
- Use hedged requests: send a second request after a timeout, take whichever finishes first
- Apply circuit breakers per downstream service
- Return partial results when some fan-out calls fail (graceful degradation)
- Isolate resource pools for high-fan-out calls so they cannot starve other workloads
- Monitor fan-out factor per endpoint and alert when it exceeds expected bounds

**Detection signals:**
- `Promise.all()` or `asyncio.gather()` with unbounded arrays of calls
- No concurrency limit on parallel HTTP client calls
- Tail latency (p99) is much higher than median (p50) due to straggler effect
- Downstream services report traffic spikes correlated with upstream deployments

---

## 19. Not Using Read Replicas When Read-Heavy

**Anti-pattern:** Sending all database queries -- reads and writes -- to a single primary instance, even when the workload is 90%+ reads, leaving the primary overloaded with read traffic that could be served by replicas.

**Why it happens:** Using a single database endpoint is simpler. Application code does not need to distinguish between read and write connections. ORMs default to a single connection. Teams do not realize their workload is read-heavy because they have never measured the read/write ratio. Adding read replicas requires code changes to route queries.

**Real-world context:** AWS RDS documentation emphasizes that read replicas provide horizontal scaling by offloading read-intensive workloads from the primary instance. Most web applications are 80-95% reads. A primary database handling 10,000 queries/second where 9,500 are reads could offload those to 2-3 replicas, reducing primary load by 95% and freeing it for writes. However, RDS does not automatically route reads to replicas -- the application must explicitly direct read traffic to replica endpoints.

**Why it fails:**
- Primary database CPU is saturated by read queries, slowing write transactions
- Vertical scaling the primary is expensive and has limits
- Read-heavy endpoints (dashboards, feeds, search results) dominate the query mix
- The primary cannot be scaled horizontally for writes, making read offloading essential
- Failover promotes a replica to primary, but if no replicas exist, failover means downtime

**The fix:**
- Measure the read/write ratio -- if reads exceed 70%, add replicas
- Configure the ORM for read/write splitting: write to primary, read from replica
- Use a database proxy (ProxySQL, Amazon RDS Proxy, PgPool) for automatic routing
- Accept eventual consistency for read-replica queries (typical lag is under 1 second)
- Monitor replica lag (`ReplicaLag` metric) and fail over to primary if lag exceeds acceptable thresholds
- Size replica count based on: `num_replicas = ceil(read_qps / single_instance_read_capacity)`

**Detection signals:**
- Single database endpoint in application configuration
- Primary database CPU above 70% while query mix is majority SELECT
- No replica instances provisioned
- Read-heavy endpoints have higher latency than write endpoints

---

## 20. Over-Provisioning vs Under-Provisioning

**Anti-pattern:** Either allocating far more resources than needed (wasting money) or allocating too few (causing outages under load), rather than right-sizing based on data and implementing auto-scaling.

**Why it happens:** Over-provisioning is driven by fear -- "what if we get a traffic spike?" Under-provisioning is driven by cost pressure -- "can we run this cheaper?" Both are guesses. Without load testing data and auto-scaling, teams pick a static size and hope. Premature scaling was identified as a factor in 70% of tech startup failures (Startup Genome report).

**Real-world incident:** Groupon prioritized rapid customer acquisition and scaled infrastructure aggressively, spending heavily on capacity they did not need while their underlying business model was unsustainable. In contrast, Amazon grew methodically, focusing on dominating one market at a time and staying lean. On the under-provisioning side, Kubernetes environments frequently suffer from overprovisioning after an under-provisioning incident -- teams panic-scale to 3x capacity after an outage, then never right-size back down. Studies show organizations waste 30-35% of cloud spend on over-provisioned resources.

**Why it fails:**
- Over-provisioning wastes 30-35% of cloud spend on idle resources
- Under-provisioning causes outages during traffic spikes and degrades user experience
- Static provisioning cannot adapt to variable traffic patterns (day/night, weekday/weekend)
- Over-provisioned resources mask inefficient code -- there is no pressure to optimize
- Under-provisioned databases hit connection limits and IOPS caps under load

**The fix:**
- Implement auto-scaling based on actual metrics (CPU, memory, request queue depth)
- Right-size instances using utilization data: target 60-70% average CPU utilization
- Use spot/preemptible instances for fault-tolerant workloads (60-90% cost savings)
- Implement cost monitoring with alerts for spend anomalies
- Run regular right-sizing reviews using tools (AWS Compute Optimizer, GCP Recommender)
- Load test to determine actual capacity needs rather than guessing
- Use reserved instances or savings plans for predictable baseline load, spot for burst

**Detection signals:**
- Average CPU utilization below 20% (over-provisioned) or consistently above 85% (under-provisioned)
- No auto-scaling policies configured
- Instance sizes have not been reviewed in 6+ months
- Cloud bill growing faster than traffic or revenue

---

## Root Cause Analysis

Scaling anti-patterns cluster around five root causes:

### 1. Single-Machine Mindset
**Anti-patterns:** #1, #2, #3, #4, #5, #19
**Root cause:** Designing for a single server because that is the development environment. State is stored locally, connections are opened per-request, and all traffic hits one database. The architecture works for one server and breaks for two.
**Systemic fix:** Adopt the Twelve-Factor App methodology. Treat servers as disposable. Externalize all state. Test with multiple instances from the beginning.

### 2. No Capacity Planning
**Anti-patterns:** #10, #14, #20
**Root cause:** Capacity is unknown because it was never measured. Load testing is skipped, cold starts are untested, and provisioning is guesswork. The system's limits are discovered through production incidents.
**Systemic fix:** Make load testing a release gate. Measure capacity before every launch. Implement auto-scaling with validated thresholds.

### 3. Unbounded Resource Consumption
**Anti-patterns:** #7, #8, #9, #18
**Root cause:** No limits on resource consumption -- queues, connections, fan-out, retries -- because setting limits feels like artificial constraints. Resources are consumed faster than they are released, and the system runs out.
**Systemic fix:** Every resource must have an explicit bound: queue depth, connection count, fan-out factor, retry budget. Design for rejection and backpressure from day one.

### 4. Data Architecture Debt
**Anti-patterns:** #6, #11, #12, #16, #17, #19
**Root cause:** A single database handles all workloads. Schema changes are blocking. Shard keys are chosen without analysis. Queries are generated by ORM defaults. The data layer becomes the bottleneck that cannot be easily changed.
**Systemic fix:** Separate read and write paths. Choose shard keys based on access pattern analysis. Use online schema change tools. Audit ORM-generated queries.

### 5. Complexity Over Simplification
**Anti-patterns:** #13, #15
**Root cause:** Adding components to solve scaling problems without first understanding the bottleneck. More layers means more failure modes, more latency, and more operational burden.
**Systemic fix:** Profile before scaling. Remove unnecessary layers. Design degradation modes that reduce functionality rather than adding infrastructure.

---

## Self-Check Questions

Use these questions during design reviews and architecture assessments:

### Statelessness and Horizontal Scaling
- [ ] Can we add a second instance behind a load balancer with zero code changes?
- [ ] Is all user-facing state stored in an external service (database, Redis, S3)?
- [ ] Can any instance handle any request, or are requests tied to specific instances?
- [ ] Are we using sticky sessions? If so, do we have a plan to remove them?

### Database and Data Layer
- [ ] Is the database handling mixed workloads (OLTP + analytics + search)?
- [ ] Do we have read replicas configured for read-heavy endpoints?
- [ ] What is our read/write ratio? Have we measured it?
- [ ] Are database migrations tested against production-sized datasets?
- [ ] Do we use online schema change tools for migrations?
- [ ] Is connection pooling configured with explicit pool sizes?

### Queues and Backpressure
- [ ] Do all queues have explicit maximum sizes?
- [ ] What happens when a queue is full? (Drop? Reject? Dead-letter?)
- [ ] Do we have rate limiting on public-facing endpoints?
- [ ] What is the maximum queue depth we can tolerate before latency is unacceptable?

### Failure and Degradation
- [ ] What happens when a downstream service is unavailable?
- [ ] Do we have circuit breakers for all external dependencies?
- [ ] Can we disable non-critical features during overload?
- [ ] Do retries include jitter and exponential backoff?
- [ ] Is there a retry budget to prevent thundering herd?

### Capacity and Load
- [ ] Have we load tested at 2x expected peak?
- [ ] Do we know where the system breaks under load?
- [ ] Are auto-scaling policies configured and validated?
- [ ] Is our provisioning based on data or guesswork?
- [ ] Do we know the cold start time for new instances?

### Complexity
- [ ] Can every team member explain the full request path?
- [ ] Are we adding a component to solve a problem, or to avoid understanding one?
- [ ] Could we remove a layer instead of adding one?

---

## Code Smell Quick Reference

| Smell | Anti-Pattern | Severity |
|---|---|---|
| Single database connection string across all services | #6 Single DB | High |
| `session.sticky = true` in load balancer config | #3 Sticky Sessions | High |
| `fs.writeFile` / `File.write` for user uploads | #4 Local Filesystem | High |
| No `maxPoolSize` or pool config in DB connection | #5 No Connection Pool | Critical |
| `for item in items: db.query(item.id)` | #17 N+1 / Network Loops | High |
| `Promise.all(unboundedArray.map(fetch))` | #18 Unbounded Fan-Out | High |
| Queue instantiated with no `maxlen` / `capacity` | #9 Unbounded Queue | High |
| Retry with fixed delay: `sleep(5); retry()` | #7 Thundering Herd | Medium |
| No `429` or `503` responses in access logs | #8 No Backpressure | High |
| `ALTER TABLE` without `CONCURRENTLY` in migration | #16 Blocking Migration | Critical |
| Single DB endpoint; no replica endpoint in config | #19 No Read Replicas | Medium |
| No load test scripts or tools in repository | #10 No Load Testing | High |
| Auto-scaling min = max (fixed instance count) | #20 Static Provisioning | Medium |
| No circuit breaker library in dependencies | #15 No Degradation | High |
| Instance type is `*.4xlarge` or higher | #1 Vertical Only | Medium |
| Shard key is `created_at` or `timestamp` | #11 Hot Shards | High |
| `BEGIN DISTRIBUTED TRANSACTION` in query logs | #12 Cross-Shard Txn | Medium |

---

## Sources

- [GitHub Database Infrastructure Outages (Feb 2020)](https://devclass.com/2020/03/27/github-reveals-database-infrastructure-was-the-villain-behind-february-spate-of-outages-again/)
- [GitHub's June 2025 Outage: Database Migration Cascade](https://www.webpronews.com/githubs-june-2025-outage-how-a-routine-database-migration-cascaded-into-a-platform-wide-crisis/)
- [PostgreSQL Connection Pool Exhaustion -- Lessons from a Production Outage](https://www.c-sharpcorner.com/article/postgresql-connection-pool-exhaustion-lessons-from-a-production-outage/)
- [Distributed Systems Horror Stories: The Thundering Herd Problem (Encore)](https://encore.dev/blog/thundering-herd-problem)
- [Scaling Depot: Solving a Thundering Herd Problem](https://depot.dev/blog/planetscale-to-reduce-the-thundering-herd)
- [Thundering Herd Problem Explained (Medium)](https://medium.com/@work.dhairya.singla/the-thundering-herd-problem-explained-causes-examples-and-solutions-7166b7e26c0c)
- [Pod Auto Scaling and the Curse of Sticky Sessions (Medium)](https://medium.com/nerd-for-tech/how-session-stickiness-disrupts-pod-auto-scaling-in-kubernetes-17ece8e2ea4f)
- [Scaling Horizontally: Kubernetes, Sticky Sessions, and Redis](https://dev.to/deepak_mishra_35863517037/scaling-horizontally-kubernetes-sticky-sessions-and-redis-578o)
- [How CodinGame Survived a Reddit Hug of Death](https://www.codingame.com/blog/how-did-codingame-survive-reddit-hug-of/)
- [Everyone's Doing Database Sharding Wrong ($2M Failure)](https://medium.com/@jholt1055/everyones-doing-database-sharding-wrong-here-s-why-your-2m-sharding-project-will-fail-de7f52d944a4)
- [Challenges of Sharding: Data Hotspots and Imbalanced Shards](https://dohost.us/index.php/2025/10/03/challenges-of-sharding-data-hotspots-and-imbalanced-shards/)
- [Wazuh Memory Exhaustion in Unbounded Queue (GitHub Issue)](https://github.com/wazuh/wazuh/issues/31240)
- [Authentik Worker OOM from Unbounded Queue Growth (GitHub Issue)](https://github.com/goauthentik/authentik/issues/18915)
- [Understanding and Remediating Cold Starts: AWS Lambda (AWS Blog)](https://aws.amazon.com/blogs/compute/understanding-and-remediating-cold-starts-an-aws-lambda-perspective/)
- [Zero Downtime Migrations at Petabyte Scale (PlanetScale)](https://planetscale.com/blog/zero-downtime-migrations-at-petabyte-scale)
- [Solving the N+1 Query Problem: 30s to Under 1s (Medium)](https://medium.com/@nkangprecious26/solving-the-n-1-query-problem-how-i-reduced-api-response-time-from-30s-to-1s-1fcd819c34e6)
- [Moolle: Fan-out Control for Scalable Distributed Data Stores (LinkedIn, ICDE 2016)](https://content.linkedin.com/content/dam/engineering/site-assets/pdfs/ICDE16_industry_571.pdf)
- [It's Time to Move on from Two Phase Commit (Daniel Abadi)](http://dbmsmusings.blogspot.com/2019/01/its-time-to-move-on-from-two-phase.html)
- [Vertical vs Horizontal Scaling (CockroachDB)](https://www.cockroachlabs.com/blog/vertical-scaling-vs-horizontal-scaling/)
- [The 7 Deadly Sins of Startups: Premature Scaling (Medium)](https://medium.com/superteam/danger-the-7-deadly-sins-of-startups-premature-scaling-1d2a976e2540)
- [Kubernetes Overprovisioning: The Hidden Cost (DEV Community)](https://dev.to/naveens16/kubernetes-overprovisioning-the-hidden-cost-of-chasing-performance-and-how-to-escape-114k)
- [Design for Chaos: Fastly's Principles of Fault Isolation](https://www.fastly.com/blog/design-for-chaos-fastlys-principles-of-fault-isolation-and-graceful)
- [AWS Well-Architected: Implement Graceful Degradation](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_graceful_degradation.html)
- [N+1 API Calls Detection (Sentry)](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-api-calls/)
- [AWS RDS Read Replicas Documentation](https://aws.amazon.com/rds/features/read-replicas/)
- [Dan Luu's Post-Mortems Collection (GitHub)](https://github.com/danluu/post-mortems)
