# Data Modeling -- Architecture Expertise Module

> Data modeling defines how data is structured, stored, and related. Wrong data models are
> extremely expensive to fix -- requiring migrations, code changes, and often downtime.
> Getting the model right before writing application code is one of the highest-ROI
> architectural activities.

> **Category:** Data
> **Complexity:** Moderate
> **Applies when:** Any system that persists state -- which is every system

---

## What This Is (and What It Isn't)

**Data modeling** is the disciplined process of discovering, analyzing, and defining the data
requirements of a system, then representing those requirements as a formal structure. It is
not "drawing tables in a diagramming tool." It is identifying the entities your system cares
about, the relationships between them, the constraints that must hold, and the access
patterns that determine how data should be physically organized.

A data model exists at three levels of abstraction:

| Level | Purpose | Audience | Artifact |
|-------|---------|----------|----------|
| **Conceptual** | Capture business entities and high-level relationships | Business stakeholders, product owners | ER diagram with business names |
| **Logical** | Define attributes, data types, cardinality, constraints, normalization | Architects, senior engineers | Fully attributed ER diagram with keys |
| **Physical** | Map the logical model to a specific database engine | DBAs, backend engineers | DDL scripts, migration files |

**Entity-Relationship (ER) modeling** is the primary technique at the conceptual and logical
levels. An ER model defines **entities** (things the system tracks), **attributes** (their
properties), **relationships** (how entities relate), **cardinality** (one-to-many,
many-to-many), and **constraints** (rules that must hold).

### What It Is NOT

- **Not a one-time activity.** Data models evolve as requirements change. The initial model
  is a hypothesis refined through production experience.
- **Not just for relational databases.** Document stores, graph databases, and event stores
  all require data modeling -- the techniques differ but the discipline is the same.
- **Not optional for "agile" teams.** Spend 2-4 hours modeling before writing schema code.
  That prevents weeks of migration pain later.
- **Not the same as ORM class definitions.** ORM classes are a physical model artifact.
  Designing by writing Django models or Hibernate entities skips the conceptual and logical
  levels, leading to schemas shaped by framework conventions rather than business requirements.

---

## When to Use It

### 1. Greenfield Systems
Before writing any schema code, invest in a logical data model. The cost of changing a model
increases exponentially after production launch.

**Evidence -- Shopify:** Their architecture team documented that the most expensive technical
debt traces back to early data model decisions in their Rails monolith. Tables designed for
a simple store in 2006 required years of migration to support multi-channel commerce.

### 2. Domain Complexity
When the domain has 15+ entities with non-trivial relationships (hierarchies, polymorphism,
temporal validity), formal modeling prevents inconsistencies that surface months later as bugs.

**Evidence -- Healthcare systems:** The "Bad CaRMa" case study documented a CRM system that
skipped formal modeling and used generic EAV tables, generating an estimated ROI of minus
$10 million during rebuild.

### 3. Multiple Teams Writing to the Same Database
A shared logical model prevents teams from creating conflicting schemas, duplicate entities
under different names, or incompatible representations of the same concept.

### 4. Regulatory Requirements
GDPR, HIPAA, SOX, and PCI-DSS impose constraints on how data is structured, retained, and
deleted. A formal model makes compliance auditable.

---

## When NOT to Use It

### 1. Throwaway Prototypes
Code deleted within 2 weeks can use a quick schema. But label it disposable -- the danger is
prototypes that survive into production.

### 2. Over-Normalization
Normalizing to BCNF or 5NF when 3NF is sufficient creates unnecessary join complexity.
**Anti-pattern:** A team normalized addresses into five tables (street, city, state, country,
postal_code). Every query required five joins. A single `addresses` table was the right model.

### 3. Schema-on-Read Workloads
For data lake ingestion, log aggregation, or ML feature stores where data shape is unknown
at write time, use schema-on-read (Parquet, JSON in document stores) and model at the
consumption layer.

### 4. Event-Sourced Systems (Partially)
Events are append-only and the event log is the source of truth. You still model events and
projections, but the techniques differ significantly from relational modeling.

---

## How It Works

### Normalization: The Foundation

Normalization organizes data to reduce redundancy and prevent update anomalies:

**1NF:** Every column contains atomic values. No repeating groups. Each row is uniquely
identifiable.

**2NF:** Satisfies 1NF. Every non-key attribute depends on the *entire* primary key (no
partial dependencies). Only relevant for composite keys.

**3NF:** Satisfies 2NF. No transitive dependencies: non-key attributes depend only on the
primary key, not on other non-key attributes.

**BCNF:** Satisfies 3NF. Every determinant is a candidate key. Rarely needed in practice --
3NF handles 95%+ of real-world schemas.

**Rule of thumb:** Normalize to 3NF for OLTP. Denormalize deliberately for read-heavy
workloads. Document every denormalization decision and how consistency is maintained.

### Natural Keys vs. Surrogate Keys

| Aspect | Natural Key | Surrogate Key |
|--------|-------------|---------------|
| **Definition** | From business data (email, ISBN) | System-generated (auto-increment, UUID) |
| **Stability** | Can change (user changes email) | Never changes |
| **Size** | Variable, often larger (varchar) | Fixed, compact (bigint) or 16 bytes (UUID) |
| **Business meaning** | Self-documenting | Requires joins to understand what a row represents |
| **Cross-system** | Natural joins without mapping | Requires mapping tables between systems |

**Recommendation:** Use surrogate keys (bigint or UUIDv7) as primary keys. Enforce natural
keys as unique constraints. This gives you stability with query clarity.

### UUID vs. Integer at Scale

| Key Type | Storage | Insert Pattern | Throughput | Best For |
|----------|---------|----------------|------------|----------|
| **bigint auto-increment** | 8 bytes | Sequential (end of B-tree) | Highest | Single-database OLTP |
| **UUIDv4 (random)** | 16 bytes | Random (page splits, cache misses) | Lowest | Legacy compatibility only |
| **UUIDv7 (time-ordered)** | 16 bytes | Sequential (time-sorted) | High | New systems, distributed (recommended default) |
| **Snowflake ID** | 8 bytes | Sequential (timestamp-encoded) | Highest | High-scale distributed (Twitter, Discord) |

PlanetScale documented that random UUIDs produce "orders of magnitude more WAL volume" than
sequential keys in MySQL. UUIDv7 is supported natively in PostgreSQL 17+.

### Indexing Strategy

1. **Primary keys are indexed automatically.** Do not create duplicates.
2. **Index foreign keys.** Most databases do NOT auto-create these. Missing FK indexes are
   the number-one production performance issue.
3. **Index WHERE, ORDER BY, GROUP BY columns** -- but only if selectivity is high.
4. **Composite indexes follow the left-prefix rule.** Index on (a, b, c) supports queries
   on (a), (a, b), or (a, b, c) -- but NOT (b, c) alone.
5. **Partial indexes** for soft-delete patterns: `CREATE INDEX ... WHERE deleted_at IS NULL`.
6. **Do not over-index.** Each index slows writes and consumes storage.

### Soft Deletes

Soft deletion marks records as deleted (`deleted_at` timestamp) rather than removing them.

**Use when:** Financial records, audit-required data, regulatory compliance, data referenced
by foreign keys, user-facing "archive" features.

**Avoid when:** GDPR right-to-erasure (soft-deleted data is still personal data), temporary
data, performance-critical tables.

**Pitfalls:** Every query must include `WHERE deleted_at IS NULL`. UNIQUE constraints must
become partial. Table bloat accumulates without purge policies. Use partial indexes to
mitigate:
```sql
CREATE INDEX idx_users_email_active ON users (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL;
```

### Polymorphic Relationships

When multiple entity types participate in the same relationship:

**1. STI (Rails polymorphic):** Single `commentable_type` + `commentable_id` column. Simple
but cannot enforce foreign keys. Anti-pattern in strict relational modeling.

**2. Exclusive Belongs-To:** Nullable FK per type with a CHECK constraint ensuring exactly
one is set. Real FKs, but adding types requires ALTER TABLE.

**3. Join Tables per Type (Recommended):** Separate `post_comments`, `photo_comments` tables.
Full referential integrity, no NULLs, extensible without altering the base table.

### Schema Evolution: The Expand-Contract Pattern

Unsafe changes (rename/remove columns, change types) require the expand-contract pattern:

**Expand:** Add new column/table alongside old. Deploy code writing to both. Backfill data.
**Migrate:** Deploy code reading from the new structure. Verify correctness.
**Contract:** Stop writing to old. Drop old column/table.

Each phase is a separate deployment, independently safe and reversible. Tools like Xata's
`pgroll` automate this for PostgreSQL using virtual schemas with views.

### Event Sourcing as an Alternative

Instead of storing current state, event sourcing stores the sequence of events that produced
it. You still model event schemas, projection schemas, and snapshot schemas -- but the
techniques differ fundamentally from entity-centric modeling.

---

## Trade-Offs Matrix

| Approach | Writes | Reads | Integrity | Schema Flexibility | Best For |
|----------|--------|-------|-----------|--------------------|----|
| **Fully Normalized (3NF)** | Excellent | Poor (joins) | Excellent | Moderate | OLTP with high write volume |
| **Partially Denormalized** | Good | Good | Good | Moderate | General-purpose applications |
| **Star Schema (Denormalized)** | Poor (sync copies) | Excellent | Requires discipline | Low | Analytics, data warehouses |
| **Document Store (Schemaless)** | Excellent | Good for single doc | App-enforced only | Excellent | Rapid prototyping, CMS |
| **Graph Model** | Moderate | Excellent traversal | Good | Good | Social networks, knowledge graphs |
| **EAV** | Good | Terrible | None | Excellent | Almost never -- use JSONB instead |
| **Event Sourced** | Excellent (append) | Depends on projections | Excellent (immutable) | Good | Financial, audit-critical |
| **Hybrid (CQRS)** | Excellent | Excellent | Eventual consistency | Good | High-scale distinct read/write |

---

## Evolution Path

### Stage 1: Single-Database Monolith
One database, ORM migrations, all tables in one schema. **Evolve when:** queries degrade,
teams conflict on schema changes, read/write workloads compete.

### Stage 2: Read Replicas and Materialized Views
Add read replicas for reports/dashboards. Route reads to replicas, writes to primary.
**Evolve when:** replication lag causes stale reads in critical paths.

### Stage 3: Schema Migration Discipline
Adopt expand-contract for all changes. Use pgroll, gh-ost, or pt-online-schema-change.
Backward-compatible migrations only. **Evolve when:** different parts of the app need
fundamentally different data access patterns.

### Stage 4: Polyglot Persistence
Right database per workload: PostgreSQL for OLTP, ClickHouse for analytics, Elasticsearch
for search. CDC (Debezium) keeps stores synchronized. **Evolve when:** services grow too
large, data ownership unclear.

### Stage 5: Database-per-Service
Each service owns its schema exclusively. Cross-service data via APIs or events, never
direct SQL. **Evolve when:** cross-service queries become complex.

### Stage 6: Data Mesh
Domain teams own data as products. Federated governance ensures interoperability. Not every
organization reaches or needs this stage.

---

## Failure Modes

### 1. The God Table
A single table with 80+ columns used by every feature. ALTER TABLE takes hours at 200M rows.
**Fix:** Vertical partitioning into focused tables joined by the same primary key.

### 2. The EAV Anti-Pattern
A three-column table (`entity_id`, `attribute_name`, `attribute_value`) with no type safety,
no foreign keys, no constraints. Cybertec documented EAV queries requiring 15-20 self-joins,
running 100-1000x slower than normalized equivalents.
**Fix:** Use PostgreSQL JSONB with GIN indexes and check constraints:
```sql
CREATE TABLE products (
    id bigint PRIMARY KEY, name text NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}',
    CONSTRAINT valid_attrs CHECK (jsonb_typeof(attributes) = 'object')
);
CREATE INDEX idx_products_attrs ON products USING gin (attributes);
SELECT * FROM products WHERE attributes @> '{"color": "red"}';
```

### 3. Missing FK Indexes
JOIN queries take seconds instead of milliseconds. The number-one production performance
issue (Percona, pganalyze). A missing index on a 10M-row FK column turns a 2ms lookup into
a 5-second sequential scan.
**Fix:** Audit all foreign key columns and add indexes.

### 4. N+1 Query Pattern
A page load generates 100+ queries. Application fetches parents then loops to fetch children.
**Fix:** Eager loading (JOIN FETCH, prefetch_related), or denormalize co-accessed data.

### 5. UUIDv4 as Primary Key in InnoDB
Insert throughput degrades as tables grow. PlanetScale documented 3-5x improvement switching
to UUIDv7, and an order-of-magnitude reduction in WAL volume at 100M+ rows.
**Fix:** UUIDv7, ULID, or Snowflake IDs. Or use UUIDv4 as a secondary unique column with
bigint as clustered PK.

### 6. Premature Denormalization
Data inconsistencies between redundant copies. Complex sync logic. Totals that do not match
line-item sums.
**Fix:** Start normalized. Measure under realistic load. Denormalize only proven bottlenecks.

### 7. Ignoring Temporal Data
No way to answer "what was the price when the order was placed?" History overwritten.
**Fix:** Snapshot columns (`order_items.unit_price`), history tables with `valid_from`/
`valid_to`, or event sourcing.

---

## Technology Landscape

### Relational Databases

| Database | Strengths | Watch Out For |
|----------|-----------|---------------|
| **PostgreSQL** | JSONB, partial indexes, materialized views, UUIDv7 (v17+) | VACUUM management at scale |
| **MySQL/InnoDB** | Wide ecosystem, good simple-schema perf | Clustered PK (UUID trap), weaker constraints pre-8.0 |
| **SQLite** | Zero-config, embedded/edge | Single-writer, not for server workloads |

### Migration Tools

| Tool | Database | Key Feature |
|------|----------|-------------|
| **Flyway** | Multi-DB | SQL-based, version-numbered |
| **Alembic** | PostgreSQL/MySQL | Python, auto-generates from model diffs |
| **pgroll** | PostgreSQL | Automated expand-contract, zero-downtime |
| **gh-ost** | MySQL | GitHub's online schema migration |
| **Atlas** | Multi-DB | HCL declarative schema, plan + apply |
| **Prisma Migrate** | Multi-DB | TypeScript, declarative with generated migrations |

### ER Diagramming Tools

| Tool | Notes |
|------|-------|
| **dbdiagram.io** | DSL-based (DBML), fast iteration, SQL export |
| **pgModeler** | PostgreSQL-specific, reverse-engineers from live DB |
| **DBeaver** | ER diagrams from existing databases, multi-DB |
| **DataGrip** | JetBrains IDE with built-in ER visualization |

### ORMs

| Tool | Language | Note |
|------|----------|------|
| **SQLAlchemy** | Python | Declarative + imperative, complex relationships |
| **Prisma** | TypeScript | Declarative schema, typed client |
| **Hibernate/JPA** | Java | Annotation-based, table inheritance support |
| **ActiveRecord** | Ruby | Convention over configuration |
| **Ecto** | Elixir | Schema-based with changesets |

**ORM Warning:** ORMs mask data model problems. If your queries require N+1 workarounds or
raw SQL fallbacks, the underlying model likely needs restructuring.

---

## Decision Tree

```
START: You need to persist data for a new feature or system.

1. How well do you understand the domain?
   +-- POORLY --> Domain-model first. Talk to experts. Do NOT start with DDL.
   +-- WELL  --> 2. Primary access pattern?
                 +-- WRITE-HEAVY --> Normalize to 3NF. Surrogate keys. Index FKs.
                 |   +-- Need audit? --> History tables or event sourcing.
                 +-- READ-HEAVY  --> Star schema or materialized views.
                 |   +-- Real-time? --> CQRS with event-driven projections.
                 |   +-- Batch?    --> ETL to analytical store.
                 +-- MIXED       --> 3NF writes + materialized views for reads.
                 +-- GRAPH-HEAVY --> Graph DB or recursive CTEs in PostgreSQL.
                 +-- VARIABLE SCHEMA --> PostgreSQL JSONB. NOT EAV. Never EAV.

3. Expected data volume?
   +-- < 1M rows  --> Almost any model works. Optimize for clarity.
   +-- 1M - 100M  --> Indexing strategy matters. Profile queries early.
   +-- 100M - 1B  --> Partitioning. UUIDv7 over UUIDv4. Online schema changes.
   +-- > 1B rows  --> Sharding. Globally unique keys. Distributed DB evaluation.

4. Regulatory compliance?
   +-- GDPR    --> Hard-delete capability. Separate PII tables.
   +-- HIPAA   --> Encrypt at rest/transit. Full change history.
   +-- PCI-DSS --> Tokenize payments. Minimize cardholder data storage.
   +-- SOX     --> Immutable audit trail. No UPDATE/DELETE on financials.
```

---

## Implementation Sketch

### ER Diagram: E-Commerce Order System

```
    ┌─────────────┐
    │  customers  │
    ├─────────────┤          ┌──────────────┐
    │ id (PK)     │          │   products   │
    │ email (UQ)  │          ├──────────────┤
    │ name        │          │ id (PK)      │
    │ created_at  │          │ sku (UQ)     │
    │ deleted_at  │          │ name         │
    └──────┬──────┘          │ current_price│
           │ 1:M             │ attributes   │
    ┌──────┴──────┐          └──────┬───────┘
    │   orders    │                 │ 1:M
    ├─────────────┤          ┌──────┴───────────┐
    │ id (PK)     │          │   order_items    │
    │ customer_id │──────────│ order_id (FK)    │
    │ status      │   1:M    │ product_id (FK)  │
    │ total_amount│          │ quantity         │
    │ placed_at   │          │ unit_price       │
    └─────────────┘          │  (snapshot)      │
                             └──────────────────┘
```

### DDL (PostgreSQL)

```sql
CREATE TABLE customers (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id  uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    email      text NOT NULL,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE UNIQUE INDEX idx_customers_email_active
    ON customers (email) WHERE deleted_at IS NULL;

CREATE TABLE products (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku           text NOT NULL UNIQUE,
    name          text NOT NULL,
    current_price numeric(12,2) NOT NULL CHECK (current_price >= 0),
    attributes    jsonb NOT NULL DEFAULT '{}',
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_attributes ON products USING gin (attributes);

CREATE TABLE orders (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id    uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    customer_id  bigint NOT NULL REFERENCES customers(id),
    status       text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','placed','paid','shipped',
                                     'delivered','cancelled','refunded')),
    total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    placed_at    timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);  -- FK index!
CREATE INDEX idx_orders_status ON orders (status);

CREATE TABLE order_items (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES products(id),
    quantity   int NOT NULL CHECK (quantity > 0),
    unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),  -- snapshot!
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (order_id, product_id)
);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

CREATE TABLE order_status_history (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status text,
    new_status text NOT NULL,
    changed_by text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_osh_order_id ON order_status_history (order_id, changed_at);
```

### Migration Example (Expand-Contract)

```sql
-- Phase 1: EXPAND (non-blocking)
ALTER TABLE orders ADD COLUMN currency text DEFAULT 'USD';
-- Backfill in batches:
-- UPDATE orders SET currency='USD' WHERE currency IS NULL AND id BETWEEN :s AND :e;

-- Phase 2: MIGRATE (separate deploy) -- code reads from 'currency'

-- Phase 3: CONTRACT (separate deploy)
ALTER TABLE orders ALTER COLUMN currency SET NOT NULL;
```

---

## Cross-References

- **[sql-vs-nosql](sql-vs-nosql.md):** The data model drives the database choice, not the
  reverse.
- **[data-consistency](data-consistency.md):** ACID vs. eventual consistency -- data model
  decisions determine what consistency guarantees are possible.
- **[cqrs-event-sourcing](../../patterns/cqrs-event-sourcing.md):** When read and write
  models diverge, CQRS separates them explicitly.
- **[database-scaling](../../scaling/database-scaling.md):** Sharding, partitioning,
  replication -- physical decisions that become necessary at scale.

---

## Key Takeaways

1. **Model before you migrate.** 2-4 hours on a logical model prevents weeks of migration
   pain after launch.

2. **Normalize first, denormalize deliberately.** Start at 3NF. Denormalize only proven
   bottlenecks. Document every denormalization.

3. **Use UUIDv7 for new systems.** Combines distributed uniqueness with sequential insert
   performance. Avoid UUIDv4 as a clustered primary key.

4. **Index your foreign keys.** Databases do not do this automatically. This is the single
   most common production performance problem.

5. **Snapshot data at decision points.** Store `unit_price` at order time, not a pointer to
   `current_price`. If you need "what was the value when this happened?", the data must
   already be there.

6. **Never use EAV.** Use JSONB with GIN indexes instead. EAV trades every advantage of a
   relational database for flexibility that JSONB provides better.

7. **Plan for schema evolution from day one.** Use expand-contract. Never remove a column in
   the same deployment that stops writing to it.

8. **Your data model will outlive your application code.** Code gets rewritten; data persists.
   Invest proportionally to its expected lifespan.

---

*Researched: 2026-03-08 | Sources:*
- *[ByteByteGo: Database Schema Design](https://blog.bytebytego.com/p/database-schema-design-simplified)*
- *[CelerData: Normalization vs Denormalization](https://celerdata.com/glossary/normalization-vs-denormalization-the-trade-offs-you-need-to-know)*
- *[PlanetScale: UUID Primary Keys in MySQL](https://planetscale.com/blog/the-problem-with-using-a-uuid-primary-key-in-mysql)*
- *[Bytebase: UUID vs Auto Increment](https://www.bytebase.com/blog/choose-primary-key-uuid-or-auto-increment/)*
- *[Cybertec: EAV in PostgreSQL](https://www.cybertec-postgresql.com/en/entity-attribute-value-eav-design-in-postgresql-dont-do-it/)*
- *[Bitestreams: 10 Data Modeling Mistakes](https://bitestreams.com/blog/10-data-modeling-mistakes/)*
- *[TDAN: Common Data Modeling Mistakes](https://tdan.com/common-data-modeling-mistakes-and-their-impact/24661)*
- *[Prisma: Expand and Contract Pattern](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern)*
- *[Xata: pgroll Expand-Contract](https://xata.io/blog/pgroll-expand-contract)*
- *[Redgate: Database Design Patterns](https://www.red-gate.com/blog/database-design-patterns)*
- *[Databricks: Data Modeling on Modern Lakehouse](https://www.databricks.com/blog/data-modeling-best-practices-implementation-modern-lakehouse)*
- *[Marty Friedel: Soft vs Hard Delete](https://www.martyfriedel.com/blog/deleting-data-soft-hard-or-audit)*
- *[Saras Analytics: Data Modeling Best Practices](https://www.sarasanalytics.com/blog/data-modeling-best-practices)*
