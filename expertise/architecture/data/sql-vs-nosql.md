# SQL vs NoSQL — Architecture Expertise Module

> The SQL vs NoSQL decision is one of the most consequential and most frequently gotten wrong. PostgreSQL is the right default for 90% of applications. NoSQL databases solve specific problems (key-value caching, document flexibility, time-series, graph) but are often chosen for the wrong reasons — usually "we don't want to define a schema" or "NoSQL scales better," both of which are misleading at best and destructive at worst.

> **Category:** Data
> **Complexity:** Moderate
> **Applies when:** Choosing a primary data store for a new system or evaluating whether the current database choice is appropriate

---

## What This Is

### The Database Family Tree

Databases are not a binary SQL-or-NoSQL choice. They are a family of specialized tools, each optimized for a specific access pattern. Understanding what each type actually is — not what marketing says it is — is the foundation for making the right choice.

**Relational (SQL) Databases** — Store data in tables with rows and columns. Relationships between tables are expressed through foreign keys and enforced by the database engine. Data is accessed through SQL, a declarative query language that has been the industry standard since the 1970s. The schema is defined before data is inserted, and the database enforces that schema on every write. Examples: PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, CockroachDB.

The defining property of relational databases is not "tables" — it is **relational algebra**. The ability to JOIN data across tables, filter with arbitrary WHERE clauses, aggregate with GROUP BY, and compose these operations into complex queries is what makes relational databases uniquely powerful for ad-hoc analysis, reporting, and any use case where the question being asked of the data is not known at design time.

**Document Databases** — Store data as semi-structured documents, typically JSON or BSON. Each document is self-contained — it carries its data and its structure together. Documents in the same collection can have different fields. There is no enforced schema at the database level (though application-level schema validation exists). Examples: MongoDB, CouchDB, Amazon DocumentDB, Firestore.

The key insight: document databases trade query flexibility for write flexibility. You gain the ability to store heterogeneous data without migrations, but you lose the ability to efficiently query across documents in ways the original access pattern did not anticipate. Every query pattern must be designed into the data model upfront.

**Key-Value Stores** — The simplest data model: a key maps to a value. The database knows nothing about the value's structure — it is an opaque blob. Operations are limited to GET, PUT, DELETE by key. This extreme simplicity enables extreme performance — sub-millisecond latency at millions of operations per second. Examples: Redis, Memcached, Amazon DynamoDB (also supports document model), etcd, Riak.

Key-value stores are not general-purpose databases. They solve one problem: fast lookup by a known key. The moment you need to query by anything other than the key — filter by a field, search by a range, join two datasets — a key-value store is the wrong tool.

**Column-Family (Wide-Column) Databases** — Store data in rows and column families, where each row can have a different set of columns. Optimized for writing and reading large volumes of data across distributed clusters. Data is partitioned by a partition key and sorted within each partition by a clustering key. Designed for write-heavy workloads at massive scale. Examples: Apache Cassandra, ScyllaDB, HBase, Google Bigtable.

Column-family databases require you to model data around your query patterns, not around your entities. You will duplicate data across multiple tables, each designed to answer a specific query. This is the opposite of relational normalization — and it is intentional. The trade-off: write amplification and data duplication in exchange for predictable read performance at any scale.

**Graph Databases** — Store data as nodes (entities) and edges (relationships between entities). Optimized for traversing relationships — "find all friends of friends who live in city X and have purchased product Y" — queries that would require multiple self-joins in a relational database. Examples: Neo4j, Amazon Neptune, ArangoDB, JanusGraph, Dgraph.

Graph databases solve a specific problem: multi-hop relationship traversal. In a relational database, each additional "hop" requires another JOIN, and query performance degrades exponentially with depth. In a graph database, traversal depth has near-constant cost per hop. If your queries do not traverse relationships beyond 2-3 hops, a relational database with proper indexing handles graph-like queries perfectly well.

**Time-Series Databases** — Optimized for append-heavy workloads where data arrives as timestamped observations: metrics, sensor readings, financial ticks, application logs. They provide built-in time-window aggregation, downsampling, retention policies, and compression optimized for sequential time-ordered data. Examples: TimescaleDB, InfluxDB, QuestDB, Prometheus, ClickHouse (also OLAP), Amazon Timestream.

Time-series databases are not just "databases with a timestamp column." Their storage engines are physically optimized for time-ordered append patterns. They compress sequential data far more efficiently than general-purpose databases, and their query engines natively support operations like "average over 5-minute windows" that would require complex SQL expressions in a relational database.

**Search Engines** — Not databases in the traditional sense, but often used as one. Store data in inverted indices optimized for full-text search, fuzzy matching, faceted search, and relevance scoring. Examples: Elasticsearch, OpenSearch, Apache Solr, Meilisearch, Typesense.

Search engines should almost never be your primary data store. They are secondary indices that are populated from a source-of-truth database. Using Elasticsearch as a primary database is a common and expensive mistake — it lacks ACID transactions, has eventual consistency by default, and its documents are immutable (updates require full document re-indexing).

---

## When to Use SQL (Relational Databases)

### The Default Choice for Most Applications

If you are building a new application and do not have a specific, well-articulated reason to choose something else, use PostgreSQL. This is not tribalism — it is engineering pragmatism based on the following properties:

**Your data has relationships.** Users have orders. Orders have line items. Line items reference products. Products belong to categories. If you drew your data model on a whiteboard, it would have arrows between entities. This is relational data, and relational databases handle it natively. Trying to model this in a document database means either embedding (which creates update anomalies) or referencing (which means you have reinvented foreign keys without the database enforcing them).

**You need ACID transactions.** Transfer $100 from account A to account B. Debit A and credit B must both succeed or both fail. This is not optional in financial systems, e-commerce, healthcare, inventory management, or any system where data inconsistency has real-world consequences. Relational databases have provided ACID guarantees since the 1970s. While MongoDB added multi-document transactions in 4.0 (2018), the performance characteristics and operational complexity of distributed transactions in document databases are substantially worse than in purpose-built relational systems.

**You need complex queries.** "Show me all customers who placed an order in the last 30 days, spent more than $500 total, and have not purchased from category X." This is a single SQL query with JOINs, aggregation, and subqueries. In a document database, this query either requires denormalization (storing redundant data to avoid lookups) or multiple application-level queries stitched together in code. SQL handles ad-hoc analytical queries that were never anticipated at design time.

**You need data integrity enforcement.** NOT NULL constraints, UNIQUE constraints, CHECK constraints, foreign key constraints — relational databases enforce these at the storage layer. Every write is validated against the schema. In a document database, these constraints exist only in application code, which means every microservice, every migration script, and every ad-hoc data fix must independently enforce them. One bug in one service and your data is corrupt with no database-level guardrail.

**You need a mature ecosystem.** PostgreSQL has 35+ years of production hardening, thousands of extensions (PostGIS for geospatial, pg_trgm for fuzzy search, pgvector for embeddings, TimescaleDB for time-series), world-class tooling (pg_dump, pg_restore, pgAdmin, psql), and the largest pool of experienced database administrators of any open-source database. The debugging, monitoring, and optimization toolchain is unmatched.

### Specific Use Cases Where SQL Excels

| Use Case | Why SQL | Example |
|---|---|---|
| E-commerce | Orders, inventory, payments all require ACID | Shopify runs on MySQL/PostgreSQL |
| Financial systems | Transaction integrity is non-negotiable | Banking cores are universally relational |
| SaaS applications | Multi-tenant data with complex access control | Most B2B SaaS runs on PostgreSQL |
| Content management | Structured content with relationships | WordPress runs on MySQL |
| Healthcare | Regulatory compliance demands data integrity | Epic, Cerner use relational stores |
| ERP / CRM | Deep entity relationships, complex reporting | SAP, Salesforce are relational |
| Analytics / Reporting | Ad-hoc queries, aggregation, windowing | Data warehouses are relational (Snowflake, BigQuery) |

---

## When to Use NoSQL (By Type)

### Key-Value Stores — Caching and Session Data

**Use Redis when:**
- You need sub-millisecond response times for cache lookups
- You are caching database query results, API responses, or computed values
- You need session storage for web applications
- You need pub/sub messaging, rate limiting, or distributed locking
- You need data structures beyond simple strings (sorted sets for leaderboards, HyperLogLog for cardinality estimation, streams for event logs)

**Use Memcached when:**
- You need pure cache with no persistence requirement
- Your workload is simple key-value GET/SET with no need for data structures
- You want multi-threaded performance on a single node (Memcached is multi-threaded; Redis is single-threaded per shard)

**Use DynamoDB when:**
- You are building on AWS and want zero operational overhead (fully managed, serverless)
- Your access patterns are strictly key-based lookups with known partition keys
- You need single-digit millisecond latency with automatic scaling
- You need global tables for multi-region replication
- Your data model fits the single-table design pattern (advanced — requires expertise)

**Do NOT use key-value stores when:**
- You need to query by arbitrary fields (use a relational database)
- You need relationships between entities (use a relational database)
- You need ACID transactions across multiple keys (use a relational database)
- Your "cache" is actually your only data store (every cache needs a source of truth)

### Document Databases — Truly Variable Schemas

**Use MongoDB or Firestore when:**
- Your documents are genuinely heterogeneous — different documents in the same collection have fundamentally different structures, not just nullable fields
- You are prototyping rapidly and the data model is changing weekly (but plan to migrate to a relational database when the model stabilizes)
- You are building a content management system where each content type has a different structure and new content types are added frequently
- Your access pattern is "fetch one document by ID and return the whole thing" — the document is the unit of retrieval
- You are building a mobile app with Firebase/Firestore and need real-time sync with offline support

**The critical nuance:** "We don't want to define a schema" is not a valid reason to choose a document database. You always have a schema — it is either enforced by the database (explicit, safe) or enforced by application code (implicit, fragile). The "schemaless" flexibility of document databases means every consumer of the data must handle every possible shape of every document, forever. This is a maintenance burden, not a feature.

### Column-Family Databases — Write-Heavy at Massive Scale

**Use Cassandra or ScyllaDB when:**
- You are writing millions of events per second (IoT telemetry, application logging, messaging at Discord scale)
- You need linear horizontal scalability — add nodes, get proportionally more throughput
- You need multi-datacenter replication with tunable consistency
- Your query patterns are known and fixed at design time (you model tables per query)
- You can tolerate eventual consistency for most operations

**The Discord case study is instructive.** Discord started with MongoDB in 2015 for message storage. By November 2015, with 100 million messages, MongoDB's limitations became apparent — it could not handle the write volume or the data size. They migrated to Cassandra in 2017, which handled the write throughput but introduced its own problems. By 2022, the Cassandra cluster had grown to 177 nodes storing trillions of messages, and performance degradation required increasing effort just to maintain. They then migrated to ScyllaDB (a C++ rewrite of Cassandra), reducing the cluster from 177 nodes to 72 while cutting p99 read latency from 40-125ms to 15ms and p99 write latency from 5-70ms to 5ms. The migration of trillions of messages was accomplished in 9 days using a Rust-based data service with request coalescing.

The lesson: column-family databases solve real problems at extreme scale, but even the right tool requires iteration and operational investment.

### Graph Databases — Relationship-Heavy Queries

**Use Neo4j or Amazon Neptune when:**
- Your core value proposition depends on traversing relationships: social networks (friends of friends), recommendation engines (users who bought X also bought Y), fraud detection (find transaction rings), knowledge graphs, network topology analysis
- You need queries that traverse 4+ relationship hops — the point where relational JOINs become impractically slow
- You need path-finding algorithms (shortest path, all paths, weighted paths) as first-class operations

**Do NOT use graph databases when:**
- Your relationships are simple and shallow (1-2 hops) — SQL JOINs handle this efficiently
- You are storing graph-shaped data but only querying it by node ID (use a relational or document database)
- You need ACID transactions across your entire dataset (graph databases vary widely in transaction support)

### Time-Series Databases — Metrics, Sensors, and Events

**Use TimescaleDB when:**
- You have time-series data AND need SQL compatibility (it is a PostgreSQL extension)
- You need to join time-series data with relational data (sensor readings joined with device metadata)
- You have moderate-to-high cardinality data (thousands to millions of unique series)
- You want one database for both relational and time-series workloads

**Use InfluxDB when:**
- You have low-cardinality time-series data (hundreds of unique series)
- Raw ingestion performance and lightweight storage are your top priorities
- You are building a monitoring/observability stack (Telegraf + InfluxDB + Grafana)

**Use ClickHouse when:**
- You need analytical queries over massive time-series or event data
- Your workload is OLAP (Online Analytical Processing) — aggregations over billions of rows
- You can trade write latency for query performance

---

## When NOT to Use NoSQL

### The Most Common Wrong Reasons

This section is the most important in the entire module. The majority of NoSQL adoption mistakes come from a small set of misconceptions. If you recognize any of these as your motivation, stop and reconsider.

#### Wrong Reason 1: "We don't want to define a schema"

This is the most common and most damaging reason for choosing a document database. The logic goes: "Our requirements are changing fast. We don't want to run migrations. Let's use MongoDB so we can just throw JSON in there."

**Why this is wrong:** You always have a schema. The question is where it is enforced:

| Schema Location | Enforcement | Failure Mode |
|---|---|---|
| Database (SQL) | Every write validated | Bad data rejected immediately |
| Application code (NoSQL) | Each service validates independently | One service's bug corrupts data for all consumers |
| Nowhere | No validation | Silent data corruption, discovered weeks later |

The "no schema" advantage is real for approximately the first 3 months of a project — when the data model is genuinely unstable. After that, the schema stabilizes, and you are left paying the maintenance tax of application-level validation forever. PostgreSQL's `ALTER TABLE` with transactional DDL makes schema migrations safe, fast, and reversible.

**What to do instead:** Use PostgreSQL. When you genuinely need schema flexibility for a specific subset of your data, use a JSONB column. You get the best of both worlds: rigid schema for the 90% of your data that is structured, flexible JSON for the 10% that genuinely varies.

#### Wrong Reason 2: "NoSQL scales better"

This is a half-truth that has caused enormous damage. The full truth:

- **NoSQL databases are designed for horizontal scaling.** Cassandra, DynamoDB, and MongoDB can distribute data across hundreds of nodes. This is architecturally true.
- **Most applications never need horizontal scaling.** A single PostgreSQL instance on modern hardware (128GB RAM, NVMe SSD) can handle millions of rows, thousands of concurrent connections, and tens of thousands of queries per second. PostgreSQL with read replicas can handle read-heavy workloads well beyond what 95% of applications will ever need.
- **Horizontal scaling has costs.** Distributed transactions are harder. Cross-partition queries are slower or impossible. Operational complexity increases dramatically. Debugging distributed consistency issues requires specialized expertise.
- **PostgreSQL can scale horizontally when needed.** Citus (now part of Azure) provides transparent sharding for PostgreSQL. Read replicas handle read scaling. Partitioning handles large tables.

The correct question is not "which database scales better?" but "will my application actually need to scale beyond what a single relational database instance can handle?" For most applications, the answer is no — and by the time it is yes, you will have the engineering resources, operational expertise, and data access pattern knowledge to make an informed migration decision.

#### Wrong Reason 3: "MongoDB is faster for development"

The argument: "Our developers can just dump JSON into MongoDB without writing migrations or defining schemas. This is faster."

**Why this is wrong in practice:**
- You trade upfront schema design (hours) for ongoing data quality debugging (weeks)
- Every new feature that touches the data must handle every historical document shape
- Aggregation pipelines in MongoDB are more complex and less readable than equivalent SQL
- The lack of JOINs means either data duplication (and sync bugs) or multiple round-trips to the database
- Reporting and analytics require ETL pipelines to move data into a relational warehouse

Multiple development teams have publicly documented their regret at choosing MongoDB for relational data. A curated collection of these stories is maintained at [github.com/shekhargulati/nosql-to-rdbms-stories](https://github.com/shekhargulati/nosql-to-rdbms-stories), documenting teams that migrated back from NoSQL to relational databases after discovering the total cost of ownership was higher, not lower.

#### Wrong Reason 4: "It's what the tutorial used"

Many web development tutorials (especially in the JavaScript ecosystem) use MongoDB because it has a low barrier to entry — `npm install mongoose`, define a schema in JavaScript, and start writing. This has led to a generation of developers who reach for MongoDB by default, not because it is the right tool, but because it is the first tool they learned.

### PostgreSQL JSONB: The Document Database Inside Your Relational Database

A critical factor in the SQL vs NoSQL decision: PostgreSQL's JSONB support is good enough to eliminate the need for a separate document database in most cases.

**What PostgreSQL JSONB provides:**
- Store arbitrary JSON documents in a column alongside structured relational data
- Index JSON fields with GIN indices for fast querying
- Query JSON fields with operators: `->`, `->>`, `@>`, `?`, `?|`, `?&`
- Full-text search within JSON documents
- Partial updates of JSON documents (not full-document replacement)
- JSON schema validation via CHECK constraints

**Performance characteristics:** In benchmark comparisons, PostgreSQL performs comparably to MongoDB for document workloads until document sizes exceed approximately 2KB (where PostgreSQL's TOAST mechanism introduces overhead). For documents under 2KB — which covers the vast majority of application data — PostgreSQL JSONB performance is on par with MongoDB. In a comprehensive benchmark study, PostgreSQL won 9 out of 17 test cases against MongoDB (with 7 for MongoDB and 1 draw). MongoDB does have advantages in update-heavy workloads on large documents, where its BSON format allows updates with lower memory and I/O amplification.

**The hybrid pattern:**
```sql
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    created_at  TIMESTAMPTZ DEFAULT now(),
    -- Structured data above, flexible data below
    attributes  JSONB DEFAULT '{}'::jsonb
);

-- Index for querying JSON attributes
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- Query: find products with color = 'red' and weight > 500
SELECT * FROM products
WHERE attributes @> '{"color": "red"}'
  AND (attributes->>'weight')::int > 500;
```

This pattern gives you relational integrity for core data and document flexibility for variable attributes — in one database, one transaction, one operational footprint.

---

## How It Works — Core Concepts

### ACID vs BASE

These are the two fundamental consistency models that underpin the SQL vs NoSQL divide.

**ACID (Atomicity, Consistency, Isolation, Durability):**

| Property | Meaning | Practical Impact |
|---|---|---|
| Atomicity | All operations in a transaction succeed or all fail | Transfer $100: debit AND credit, never just one |
| Consistency | Every transaction moves the database from one valid state to another | Foreign keys, constraints always enforced |
| Isolation | Concurrent transactions don't interfere with each other | Two users buying the last item — only one succeeds |
| Durability | Once committed, data survives crashes | Power failure after COMMIT — data is safe |

ACID is the default for SQL databases. It prioritizes correctness over performance. The cost: coordination overhead (locks, write-ahead logs, two-phase commit for distributed transactions).

**BASE (Basically Available, Soft-state, Eventually consistent):**

| Property | Meaning | Practical Impact |
|---|---|---|
| Basically Available | System always returns a response, even if stale | Read might return data from 2 seconds ago |
| Soft-state | State may change without explicit writes (due to propagation) | Replica might show different data than primary |
| Eventually consistent | Given enough time without new writes, all replicas converge | After a write, all nodes will eventually agree |

BASE is the default for most NoSQL databases. It prioritizes availability and partition tolerance over immediate consistency. The benefit: higher throughput and lower latency at scale. The cost: application code must handle stale reads, conflict resolution, and the absence of guarantees that SQL developers take for granted.

### CAP Theorem — The Fundamental Trade-Off

The CAP theorem (Eric Brewer, 2000) states that a distributed data store can provide at most two of three guarantees:

- **Consistency (C):** Every read receives the most recent write or an error
- **Availability (A):** Every request receives a response (not an error)
- **Partition Tolerance (P):** The system continues to operate despite network partitions between nodes

Since network partitions are inevitable in distributed systems, the real choice is between **CP** (consistent but may be unavailable during partitions) and **AP** (available but may return stale data during partitions).

| Database | CAP Classification | Behavior During Partition |
|---|---|---|
| PostgreSQL (single node) | CA (no partition) | Not distributed — N/A |
| PostgreSQL (with replicas) | CP | Replicas may be unavailable during partition |
| MongoDB (default) | CP | Primary election may cause brief unavailability |
| Cassandra | AP | Returns data, may be stale |
| DynamoDB | AP (configurable) | Returns data, eventual consistency by default |
| Redis (cluster) | AP | Returns cached data, may diverge |
| CockroachDB | CP | Prioritizes consistency, rejects writes during partition |

**The critical nuance:** CAP theorem applies only to distributed systems during network partitions. A single-node PostgreSQL instance is not subject to CAP — it provides full ACID with no partition concerns. Most applications start (and stay) on a single database node. CAP becomes relevant only when you distribute data across multiple nodes, which is precisely when NoSQL databases offer their scaling advantages.

### Query Patterns by Database Type

Each database type optimizes for a specific query pattern. Using a database against its optimized pattern results in poor performance, complex code, or both.

| Database Type | Optimized Query Pattern | Anti-Pattern |
|---|---|---|
| Relational (SQL) | Arbitrary JOINs, aggregation, filtering by any column | Billions of simple key lookups per second |
| Document | Fetch full document by ID, query within single collection | JOINs across collections, complex aggregations |
| Key-Value | GET/SET by exact key | Range queries, filtering, aggregation |
| Column-Family | Scan within partition, time-range queries | Ad-hoc queries across partitions, JOINs |
| Graph | Multi-hop traversals, path-finding | Simple CRUD, aggregation, full-text search |
| Time-Series | Time-range aggregation, downsampling | Random key lookups, complex JOINs |
| Search Engine | Full-text search, fuzzy matching, faceting | Primary data storage, transactions |

### Indexing Strategies by Type

| Database | Primary Index | Secondary Indices | Full-Text Search |
|---|---|---|---|
| PostgreSQL | B-tree (default), Hash | B-tree, GIN, GiST, BRIN, partial, expression | tsvector + GIN (built-in) |
| MongoDB | B-tree | Compound, multikey, text, geospatial, hashed | Atlas Search (Lucene-based) |
| DynamoDB | Partition key + sort key | Global Secondary Index (GSI), Local Secondary Index (LSI) | Not supported natively |
| Cassandra | Partition key + clustering key | Secondary indexes (limited, use materialized views) | Not supported natively |
| Redis | Hash key | Not applicable (key-value) | RediSearch module |
| Neo4j | Node labels + property | Composite, full-text (Lucene) | Built-in (Lucene) |
| Elasticsearch | Inverted index (all fields) | All fields indexed by default | Core capability |

---

## Trade-Offs Matrix

### Comprehensive Comparison

| Dimension | PostgreSQL | MySQL | MongoDB | DynamoDB | Redis | Cassandra/ScyllaDB | Neo4j | TimescaleDB |
|---|---|---|---|---|---|---|---|---|
| **Data Model** | Relational tables | Relational tables | JSON documents | Key-value / document | Key-value + structures | Wide-column | Graph (nodes + edges) | Relational + time-series |
| **Consistency** | Strong (ACID) | Strong (ACID) | Strong (single-doc), configurable | Configurable (strong/eventual) | Eventual (cluster) | Tunable (per-query) | ACID (single-node) | Strong (ACID) |
| **Scaling Model** | Vertical + read replicas + Citus | Vertical + read replicas + Vitess | Horizontal (sharding) | Horizontal (automatic) | Horizontal (cluster) | Horizontal (linear) | Vertical (primarily) | Vertical + partitioning |
| **Query Flexibility** | Excellent (full SQL) | Good (SQL) | Moderate (MQL) | Low (key-based) | Minimal (key-based) | Low (CQL, no JOINs) | Excellent (Cypher for graphs) | Excellent (full SQL) |
| **Write Throughput** | Good (10K-50K TPS) | Good (10K-50K TPS) | Good (sharded) | Excellent (auto-scales) | Excellent (100K+ TPS) | Excellent (linear scaling) | Moderate | Good (optimized for append) |
| **Read Latency** | Low (sub-ms with index) | Low (sub-ms with index) | Low (by _id) | Consistent single-digit ms | Sub-millisecond | Low (within partition) | Low (indexed lookups) | Low (time-range queries) |
| **Operational Cost** | Moderate (well-understood) | Moderate (well-understood) | Moderate-High (sharding complexity) | Low (fully managed) | Low-Moderate | High (tuning required) | Moderate | Moderate (PostgreSQL expertise) |
| **Schema Flexibility** | Rigid + JSONB for flexibility | Rigid + JSON support | Fully flexible | Flexible (schemaless) | Schemaless | Semi-flexible | Flexible properties | Rigid + JSONB |
| **JOINs** | Native, optimized | Native, optimized | $lookup (limited, slow) | None | None | None | Traversals (native) | Native, optimized |
| **ACID Transactions** | Full | Full | Multi-document (since 4.0) | Limited (25 items, single partition) | Limited (MULTI/EXEC) | Lightweight transactions | Full (single-node) | Full |
| **Ecosystem Maturity** | 35+ years, massive | 30+ years, massive | 15+ years, large | AWS-only, growing | 15+ years, large | 15+ years, moderate | 15+ years, niche | 7+ years, growing |
| **Best For** | 90% of applications | Web apps, WordPress ecosystem | Truly variable schemas, rapid prototyping | Serverless, AWS-native key lookups | Caching, sessions, real-time | Write-heavy at extreme scale | Relationship traversals | Metrics joined with relational data |

---

## Evolution Path

### How Database Needs Change as Applications Grow

**Phase 1: Single Database (0 → 100K users)**
Start with PostgreSQL. One database. One operational footprint. Handle everything — relational data, JSON for flexible attributes, full-text search with tsvector, even basic time-series with partitioned tables. This phase can last years. Do not prematurely add database infrastructure.

**Phase 2: Add Caching Layer (100K → 1M users)**
Add Redis for caching hot data, session storage, and rate limiting. PostgreSQL remains the source of truth. Cache invalidation is the hard problem — start with TTL-based expiration and add event-driven invalidation only when stale data becomes a user-visible problem.

**Phase 3: Add Search (1M → 10M users)**
If your application has user-facing search (product search, content search, log analysis), add Elasticsearch or Meilisearch as a secondary index. PostgreSQL's full-text search is good for simple use cases but lacks relevance tuning, fuzzy matching, and faceted navigation at scale. Populate the search index from PostgreSQL via change data capture (Debezium) or application-level dual writes.

**Phase 4: Specialize (10M+ users)**
At this scale, specific bottlenecks emerge that justify specialized databases:
- Time-series data (metrics, events) → TimescaleDB or ClickHouse
- Message/notification fanout → Cassandra or ScyllaDB
- Recommendation engine → Neo4j or a feature store
- Global distribution → CockroachDB or DynamoDB Global Tables

**The critical rule:** Add each database to solve a measured bottleneck, not an anticipated one. Every additional database doubles operational complexity — monitoring, backups, failover, data synchronization, team expertise.

---

## Failure Modes

### Wrong Database Choice — The Most Expensive Architectural Mistake

Choosing the wrong primary database is one of the costliest mistakes a team can make. Unlike most architectural decisions, which can be refactored incrementally, a database migration requires:
- Migrating all existing data (potentially terabytes)
- Rewriting all data access code
- Updating all integrations and ETL pipelines
- Running dual-write during migration for zero-downtime cutover
- Retraining the operations team

This typically takes 6-18 months for a production system. The cost is measured in engineering years.

### Failure Mode 1: MongoDB for Relational Data

**The pattern:** Team chooses MongoDB because "it's easy to get started" and "we don't need schema migrations." Application grows. Data becomes deeply relational. Queries become `$lookup`-heavy aggregation pipelines that are slower and harder to debug than equivalent SQL. Data consistency bugs emerge because foreign key relationships are not enforced. Reporting requires a separate ETL pipeline into a data warehouse.

**Real-world occurrence:** This is by far the most common database mistake in the industry. The GitHub repository [nosql-to-rdbms-stories](https://github.com/shekhargulati/nosql-to-rdbms-stories) catalogs numerous companies that migrated back to relational databases after choosing MongoDB. Common complaints: excessive memory consumption over time, lack of native JOIN support forcing data duplication, poor performance for GROUP BY and reporting queries, and no database-level enforcement of data integrity.

**How to avoid it:** Default to PostgreSQL. Use JSONB columns for the genuinely flexible parts of your data model. If after 6 months you still have no relational patterns in your data, you might actually have a document database use case.

### Failure Mode 2: Premature Horizontal Scaling

**The pattern:** Team chooses Cassandra or DynamoDB because "we need to scale." Application has 10,000 users and 50GB of data. A single PostgreSQL instance could handle this for years. But the team now deals with eventual consistency bugs, cross-partition query limitations, and the operational complexity of a distributed database cluster — all for scale they do not need and may never need.

**How to avoid it:** Measure first. PostgreSQL on a single modern server handles millions of rows and thousands of concurrent connections. Only move to a distributed database when you have specific, measured bottlenecks that vertical scaling cannot address. By the time you hit true horizontal scaling needs, you will have the engineering resources and data access pattern knowledge to make an informed choice.

### Failure Mode 3: Using a Search Engine as a Primary Database

**The pattern:** Team uses Elasticsearch to store application data because "we need search." Elasticsearch becomes the source of truth. Then they discover: documents are immutable (updates re-index the entire document), there are no ACID transactions, consistency is eventual, and cluster management is operationally demanding.

**How to avoid it:** Always have a relational database as the source of truth. Populate Elasticsearch as a secondary index via change data capture. If Elasticsearch loses data, you can rebuild the index from the primary database.

### Failure Mode 4: Discord's Database Journey

Discord's database migration story is one of the most well-documented and instructive case studies in the industry.

**2015 — MongoDB:** Discord started with a single MongoDB replica set for message storage. By November 2015, with 100 million messages, MongoDB could not handle the write volume or data size. The limitations were fundamental — MongoDB's storage engine and replication model were not designed for Discord's write-heavy, time-series-like access pattern (messages are written once, read by time range, and rarely updated).

**2017 — Cassandra:** Discord migrated to Cassandra, which was designed for exactly this workload — write-heavy, distributed, with data modeled for time-range reads. Cassandra handled the write throughput well, and Discord scaled to trillions of messages.

**2022 — Cassandra Hits Limits:** By 2022, the Cassandra cluster had grown to 177 nodes. Despite Cassandra being the right architectural choice, operational challenges mounted: garbage collection pauses caused latency spikes, compaction competed for I/O with live reads, and maintaining the cluster required increasing engineering effort just to prevent degradation.

**2023 — ScyllaDB:** Discord migrated to ScyllaDB, a C++ rewrite of Cassandra that eliminates JVM garbage collection overhead. Results: 177 nodes reduced to 72. P99 read latency: 40-125ms (Cassandra) to 15ms (ScyllaDB). P99 write latency: 5-70ms (Cassandra) to 5ms (ScyllaDB). They built a Rust-based data service layer with gRPC API and request coalescing, migrating trillions of messages in 9 days.

**The lesson:** Even when you choose the right category of database (column-family for write-heavy messaging), the specific implementation matters enormously. And at true scale, operational characteristics (GC pauses, compaction overhead, memory model) dominate over feature sets.

---

## Technology Landscape

### Primary Databases — Detailed Profiles

**PostgreSQL** — The Swiss Army knife. Relational core with extensions for almost everything: JSONB for documents, PostGIS for geospatial, pgvector for AI embeddings, TimescaleDB for time-series, pg_trgm for fuzzy text search, Citus for horizontal sharding. The safest default for any new application. Open source, no vendor lock-in, massive community.

**MySQL / MariaDB** — The web's workhorse. Powers WordPress, Drupal, and much of the web. Simpler than PostgreSQL, with fewer advanced features but sufficient for most web applications. MySQL (Oracle-owned) vs MariaDB (community fork) — prefer MariaDB for open-source alignment, MySQL for Oracle ecosystem integration.

**MongoDB** — The most popular document database. Legitimate use cases: content management systems with truly heterogeneous content types, real-time analytics on semi-structured data, rapid prototyping where the data model is genuinely unstable. Has improved significantly since early versions: multi-document ACID transactions (4.0+), schema validation, Atlas managed service. Still frequently chosen for the wrong reasons.

**Amazon DynamoDB** — Fully managed, serverless key-value and document database. Legitimate use cases: AWS-native applications with known access patterns, serverless architectures (pairs with Lambda), global applications needing multi-region replication with DynamoDB Global Tables. The single-table design pattern (modeling all entities in one table) requires significant expertise but enables remarkable performance. The DAX (DynamoDB Accelerator) in-memory cache layer provides microsecond read latency.

**Redis** — In-memory data structure store. Not a primary database (despite Redis Inc.'s marketing). Legitimate use cases: caching, session storage, real-time leaderboards (sorted sets), pub/sub messaging, rate limiting, distributed locking. Supports persistence (RDB snapshots, AOF log) but should not be your only copy of data. Redis 7.0+ adds Redis Functions (server-side scripting) and improved cluster management.

**Apache Cassandra / ScyllaDB** — Distributed column-family databases for write-heavy workloads at extreme scale. Cassandra (Java, Apache Foundation) was designed by Facebook for inbox search. ScyllaDB (C++) is a drop-in Cassandra replacement that eliminates JVM garbage collection overhead. Use when: millions of writes per second, multi-datacenter replication, data modeled per query pattern. Do not use when: you need JOINs, ad-hoc queries, or your data is under 1TB.

**Neo4j** — The most mature graph database. Uses the Cypher query language. Legitimate use cases: social networks, fraud detection, recommendation engines, knowledge graphs, network topology. The AuraDB managed service reduces operational burden. Community edition is open source; Enterprise requires a commercial license.

**TimescaleDB** — A PostgreSQL extension for time-series data. The key advantage: it IS PostgreSQL, so you get full SQL, JOINs with relational data, the entire PostgreSQL ecosystem, and time-series optimizations (hypertables, continuous aggregates, compression, retention policies) in one database. Outperforms InfluxDB for moderate-to-high cardinality workloads and complex queries.

**InfluxDB** — Purpose-built time-series database. InfluxDB 3.0 (rebuilt on Apache Arrow and DataFusion) supports SQL queries. Best for low-cardinality monitoring data (hundreds of unique metric series). The TICK stack (Telegraf, InfluxDB, Chronograf, Kapacitor) provides a complete monitoring pipeline.

**Elasticsearch / OpenSearch** — Distributed search and analytics engines built on Apache Lucene. Not a primary database. Use as a secondary index for full-text search, log analytics (ELK stack), and application search. OpenSearch is the community fork after Elastic changed its license. Meilisearch and Typesense are lighter alternatives for application search.

**CockroachDB** — Distributed SQL database that provides PostgreSQL-compatible SQL with automatic horizontal scaling and serializable ACID transactions. Designed for global applications needing strong consistency across regions. The "NewSQL" approach: relational guarantees at distributed scale. Use when you genuinely need globally distributed ACID transactions.

---

## Decision Tree

Use this concrete decision tree when choosing a database. Start at the top and follow the path that matches your requirements.

```
START: What is your primary data access pattern?

1. Relational data with JOINs, complex queries, transactions?
   └─→ PostgreSQL (default)
       ├─ Need horizontal scaling? → CockroachDB or Citus
       ├─ Already in Oracle/Microsoft ecosystem? → Oracle / SQL Server
       └─ Simple web app, WordPress? → MySQL / MariaDB

2. Key-value lookups by exact key?
   ├─ Need sub-ms latency, in-memory? → Redis
   ├─ Need pure cache, no persistence? → Memcached
   └─ Need managed, serverless, AWS-native? → DynamoDB

3. Documents with truly variable schema?
   ├─ Need mobile offline sync? → Firestore
   ├─ Need managed cloud service? → MongoDB Atlas or DynamoDB
   └─ Actually, is the variability limited to a few fields?
      └─ YES → PostgreSQL with JSONB column (don't use a document DB)

4. Write-heavy, millions of events/sec, distributed?
   ├─ Need linear horizontal scaling? → ScyllaDB (preferred) or Cassandra
   └─ Need AWS-managed? → DynamoDB or Amazon Keyspaces

5. Graph traversals, 4+ hop relationship queries?
   └─→ Neo4j (or Amazon Neptune for AWS-managed)
       └─ Only 1-2 hops? → PostgreSQL with recursive CTEs

6. Time-series data (metrics, sensors, events)?
   ├─ Need SQL + relational JOINs? → TimescaleDB
   ├─ Low-cardinality monitoring? → InfluxDB
   └─ Analytical queries over billions of events? → ClickHouse

7. Full-text search, fuzzy matching, faceted navigation?
   └─→ Elasticsearch / OpenSearch (as secondary index)
       ├─ Simple search needs? → PostgreSQL full-text search
       └─ Lightweight application search? → Meilisearch / Typesense

8. Not sure / multiple patterns?
   └─→ PostgreSQL. Start here. Add specialized databases
       only when you measure a specific bottleneck.
```

### The One-Sentence Rule

> If you cannot articulate a specific, technical reason why PostgreSQL will not work for your use case, use PostgreSQL.

---

## Implementation Sketch

### Pattern: PostgreSQL as Primary + Specialized Secondaries

This is the architecture that works for the vast majority of applications from startup to scale.

```
┌──────────────────────────────────────────────────────────┐
│                    Application Layer                      │
├──────────┬──────────┬───────────┬──────────┬─────────────┤
│  API     │  Worker  │  Scheduler│  Stream  │  Analytics  │
│  Server  │  Queue   │           │  Proc.   │  Service    │
└────┬─────┴────┬─────┴─────┬─────┴────┬─────┴──────┬──────┘
     │          │           │          │            │
     ▼          ▼           ▼          ▼            ▼
┌─────────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
│PostgreSQL│ │Redis │ │PostgreSQL│ │Timescale│ │Elastic-  │
│ (primary │ │(cache│ │ (same    │ │   DB   │ │ search   │
│  source  │ │ +    │ │ instance │ │(metrics│ │(search   │
│  of      │ │ pub/ │ │  or      │ │  +     │ │ index,   │
│  truth)  │ │ sub) │ │  replica)│ │ events)│ │ fed by   │
│          │ │      │ │          │ │        │ │  CDC)    │
└─────────┘ └──────┘ └──────────┘ └────────┘ └──────────┘
     │                                            ▲
     │          Change Data Capture (Debezium)     │
     └────────────────────────────────────────────┘
```

### Starter Schema: PostgreSQL with JSONB Flexibility

```sql
-- Core relational tables with strict schema
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
    total       DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Flexible metadata for order-specific attributes
    metadata    JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
);

-- Flexible attributes for products (different categories have different attributes)
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    sku         TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL,
    base_price  DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    -- JSONB for category-specific attributes
    -- Electronics: {"weight_kg": 1.5, "battery_mah": 5000, "color": "black"}
    -- Clothing: {"size": "L", "material": "cotton", "color": "blue"}
    -- Books: {"isbn": "978-...", "pages": 350, "language": "en"}
    attributes  JSONB DEFAULT '{}'::jsonb
);

-- GIN index for fast JSONB queries
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Partial index: only index products that have a specific attribute
CREATE INDEX idx_products_color ON products ((attributes->>'color'))
    WHERE attributes ? 'color';

-- Full-text search on product names (no Elasticsearch needed for simple search)
ALTER TABLE products ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', name)) STORED;
CREATE INDEX idx_products_search ON products USING GIN (search_vector);
```

### Redis Caching Layer

```python
import redis
import json
from functools import wraps

r = redis.Redis(host='localhost', port=6379, db=0)

def cache(ttl_seconds=300, prefix="cache"):
    """Simple TTL-based cache decorator."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{prefix}:{func.__name__}:{hash((args, tuple(sorted(kwargs.items()))))}"
            cached = r.get(key)
            if cached:
                return json.loads(cached)
            result = func(*args, **kwargs)
            r.setex(key, ttl_seconds, json.dumps(result, default=str))
            return result
        return wrapper
    return decorator

# Invalidate on write
def invalidate_product_cache(product_id: str):
    """Delete all cache entries related to a product."""
    # Pattern-based invalidation — use with care in production
    for key in r.scan_iter(f"cache:get_product:{product_id}*"):
        r.delete(key)

# Session storage
def store_session(session_id: str, user_data: dict, ttl: int = 3600):
    r.setex(f"session:{session_id}", ttl, json.dumps(user_data))

def get_session(session_id: str) -> dict | None:
    data = r.get(f"session:{session_id}")
    return json.loads(data) if data else None
```

### When You Actually Need MongoDB (Content CMS Example)

```javascript
// Legitimate MongoDB use case: CMS with truly heterogeneous content types
// Each content type has a completely different structure

// Blog post
db.content.insertOne({
  type: "blog_post",
  title: "Understanding Databases",
  slug: "understanding-databases",
  author: ObjectId("..."),
  body: "...",
  tags: ["databases", "architecture"],
  published_at: new Date(),
  seo: { meta_description: "...", og_image: "..." }
});

// Product review (completely different structure)
db.content.insertOne({
  type: "product_review",
  product_name: "PostgreSQL 17",
  rating: 4.8,
  pros: ["Performance", "Extensibility", "JSONB"],
  cons: ["Learning curve for advanced features"],
  verdict: "Best general-purpose database",
  comparison_table: [
    { feature: "ACID", postgresql: true, mongodb: "limited" }
  ]
});

// Event listing (yet another structure)
db.content.insertOne({
  type: "event",
  name: "PGConf 2026",
  location: { type: "Point", coordinates: [-73.97, 40.77] },
  dates: { start: new Date("2026-06-15"), end: new Date("2026-06-17") },
  speakers: [{ name: "...", topic: "..." }],
  registration: { url: "...", price_usd: 299, early_bird_deadline: new Date() }
});
```

This is a legitimate document database use case because the content types are genuinely heterogeneous — not just "nullable columns" but fundamentally different structures. Even here, you could use PostgreSQL with JSONB, but MongoDB's document model is a natural fit.

---

## Cross-References

- **[data-modeling](./data-modeling.md)** — How to design schemas for relational and document databases, normalization vs denormalization trade-offs
- **[data-consistency](./data-consistency.md)** — Deep dive into consistency models, eventual consistency patterns, conflict resolution
- **[database-scaling](../scaling/database-scaling.md)** — Read replicas, sharding strategies, connection pooling, query optimization at scale
- **[caching-architecture](../patterns/caching-architecture.md)** — Cache invalidation strategies, cache-aside vs write-through, multi-tier caching
- **[search-architecture](../integration/search-architecture.md)** — Elasticsearch/OpenSearch architecture, indexing strategies, relevance tuning

---

## Sources

Research and case studies referenced in this module:

- [SQL vs NoSQL: 5 Critical Differences — Integrate.io](https://www.integrate.io/blog/the-sql-vs-nosql-difference/)
- [NoSQL vs SQL in 2026 — Hackr.io](https://hackr.io/blog/nosql-vs-sql)
- [SQL vs NoSQL in 2025 — Medium / AI & Analytics Diaries](https://medium.com/ai-analytics-diaries/sql-vs-nosql-in-2025-what-you-should-really-be-using-a21a7c2bd73c)
- [MongoDB vs PostgreSQL — MongoDB](https://www.mongodb.com/resources/compare/mongodb-postgresql)
- [Postgres vs MongoDB: Complete Comparison 2025 — Bytebase](https://www.bytebase.com/blog/postgres-vs-mongodb/)
- [NoSQL to RDBMS Stories — GitHub](https://github.com/shekhargulati/nosql-to-rdbms-stories)
- [NoSQL Was a Mistake: Why SQL Is Making a Comeback — Medium](https://medium.com/@toyezyadav/nosql-was-a-mistake-why-sql-is-making-a-comeback-c7e3d9e800f4)
- [Goodbye MongoDB — Stuart Spence](https://blog.stuartspence.ca/2023-05-goodbye-mongo.html)
- [JSON Performance: PostgreSQL vs MongoDB — DocumentDatabase.org](https://documentdatabase.org/blog/json-performance-postgres-vs-mongodb/)
- [MongoDB vs PostgreSQL JSONB: Deep Dive — DEV Community](https://dev.to/sparsh9/mongodb-vs-postgresql-jsonb-a-deep-dive-into-performance-and-use-cases-5bge)
- [DynamoDB vs PostgreSQL — Airbyte](https://airbyte.com/data-engineering-resources/dynamodb-vs-postgres)
- [DynamoDB vs PostgreSQL 2026 — Dynobase](https://dynobase.dev/dynamodb-vs-postgres/)
- [How Discord Stores Trillions of Messages — Discord Blog](https://discord.com/blog/how-discord-stores-trillions-of-messages)
- [Discord: MongoDB to Cassandra to ScyllaDB — HackerNoon](https://hackernoon.com/discord-went-from-mongodb-to-cassandra-then-scylladb-why)
- [Discord Migrates Trillions of Messages from Cassandra to ScyllaDB — InfoQ](https://www.infoq.com/news/2023/06/discord-cassandra-scylladb/)
- [ACID vs BASE Databases — AWS](https://aws.amazon.com/compare/the-difference-between-acid-and-base-database/)
- [CAP, PACELC, ACID, BASE — ByteByteGo](https://blog.bytebytego.com/p/cap-pacelc-acid-base-essential-concepts)
- [TimescaleDB vs InfluxDB — Tiger Data](https://www.tigerdata.com/blog/timescaledb-vs-influxdb-for-time-series-data-timescale-influx-sql-nosql-36489299877)
- [ClickHouse vs TimescaleDB vs InfluxDB: 2025 Benchmarks — sanj.dev](https://sanj.dev/post/clickhouse-timescaledb-influxdb-time-series-comparison)
- [Redis vs DynamoDB — Severalnines](https://severalnines.com/blog/redis-vs-dynamodb-comparison/)
- [Redis vs Memcached — AWS](https://aws.amazon.com/elasticache/redis-vs-memcached/)
