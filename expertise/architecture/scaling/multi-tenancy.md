# Multi-Tenancy — Architecture Expertise Module

> Multi-tenancy allows a single application instance to serve multiple customers (tenants) while keeping their data isolated. The key decision is the isolation level: shared database with tenant ID column (simple, dense), schema-per-tenant (moderate isolation), or database-per-tenant (maximum isolation, highest cost). Most SaaS applications should start with shared database + tenant ID.

> **Category:** Scaling
> **Complexity:** Complex
> **Applies when:** Building SaaS applications that serve multiple customers from the same infrastructure

---

## What This Is

Multi-tenancy is a software architecture in which a **single instance of an application serves multiple customers (tenants)**, each of whom perceives the system as their own private deployment. Tenants share compute, storage, and network infrastructure while their data, configurations, and customizations remain logically — and sometimes physically — separated.

The concept predates cloud computing. IBM mainframes in the 1960s time-shared resources across organizations. But the modern incarnation was shaped by two forces:

- **Salesforce (1999-present):** Pioneered the metadata-driven multi-tenant architecture where all tenants share a single database with a single schema. Customer data model changes are stored as rows in metadata tables — no `ALTER TABLE` needed. This architecture now serves over 150,000 organizations from the same codebase and database schema. It remains the most ambitious and successful shared-everything multi-tenant system ever built.
- **AWS and the cloud era (2006-present):** Made infrastructure elastic, enabling the hybrid models where most tenants share resources but enterprise customers receive dedicated infrastructure on demand.

### Single-Tenant vs Multi-Tenant

| Dimension | Single-Tenant | Multi-Tenant |
|---|---|---|
| Infrastructure | Dedicated per customer | Shared across customers |
| Cost per customer | High (dedicated resources idle 80%+ of the time) | Low (resources pooled and utilized efficiently) |
| Deployment | One deployment per customer | One deployment serves all |
| Customization | Unlimited (separate codebase possible) | Bounded by configuration, feature flags, metadata |
| Upgrades | Per-customer rollout (slow, error-prone) | Single rollout for all tenants (fast, uniform) |
| Data isolation | Physical (different databases/servers) | Logical (tenant ID, RLS) or physical (per-tenant DB) |
| Operational burden | O(n) with customer count | O(1) — same system regardless of tenant count |
| Compliance | Simple (natural isolation) | Requires explicit isolation controls |

**The fundamental economics:** A single-tenant SaaS provider with 1,000 customers operates 1,000 deployments. Each must be monitored, patched, backed up, and upgraded independently. A multi-tenant provider with 1,000 customers operates one deployment. This is not a 2x or 5x difference — it is the difference between a company that can scale with a platform team of 5 and one that needs a platform team of 50.

### The Four Isolation Models

Multi-tenancy exists on a spectrum. The four canonical models, from least to most isolated:

**1. Shared-Everything (Single Database, Shared Schema)**

All tenants' data lives in the same tables, distinguished by a `tenant_id` column. The application filters every query by tenant. This is what Salesforce, Slack, Notion, and most modern SaaS applications use.

```
┌─────────────────────────────────┐
│          Application            │
│    (tenant context in request)  │
├─────────────────────────────────┤
│        Shared Database          │
│  ┌───────────────────────────┐  │
│  │      orders table         │  │
│  │  tenant_id | order_id ... │  │
│  │  acme      | 001          │  │
│  │  globex    | 002          │  │
│  │  acme      | 003          │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**2. Shared Database, Separate Schema**

Each tenant gets their own schema within the same database instance. Tables are structurally identical but physically separate. Used by some Rails applications via the `apartment` gem and Django via `django-tenants`.

```
┌─────────────────────────────────┐
│        Shared Database          │
│  ┌────────────┐ ┌────────────┐  │
│  │ acme schema │ │globex      │  │
│  │  orders     │ │schema      │  │
│  │  users      │ │  orders    │  │
│  │  products   │ │  users     │  │
│  └────────────┘ │  products  │  │
│                  └────────────┘  │
└─────────────────────────────────┘
```

**3. Separate Database (Database-per-Tenant)**

Each tenant gets a dedicated database instance. The application routes connections based on tenant context. Provides strong isolation but linear cost scaling.

```
┌──────────────┐  ┌──────────────┐
│  acme_db     │  │  globex_db   │
│  orders      │  │  orders      │
│  users       │  │  users       │
│  products    │  │  products    │
└──────────────┘  └──────────────┘
```

**4. Hybrid (Tiered Isolation)**

Most tenants share a pooled database, while enterprise tenants with compliance or performance requirements receive dedicated databases. This is the mature model used by most successful B2B SaaS companies at scale.

```
┌──────────────────────┐    ┌──────────────┐
│   Shared Pool DB     │    │ enterprise_db│
│  (free + standard    │    │ (dedicated   │
│   tier tenants)      │    │  for BigCorp)│
└──────────────────────┘    └──────────────┘
```

---

## When to Use Shared Database (tenant_id Column)

The shared database model is the correct starting point for the vast majority of SaaS applications. Use it when:

### Startups and early-stage products

Before you have 100 paying customers, the operational overhead of managing per-tenant databases is a distraction that provides no business value. Every hour spent on per-tenant infrastructure automation is an hour not spent on product-market fit.

**Slack** started with a shared PostgreSQL database and grew to millions of workspaces before needing to shard. The shared model got them through the critical growth phase without infrastructure complexity slowing feature velocity.

### Cost-sensitive SaaS (< $50/month price points)

When your average revenue per tenant is $20/month, a dedicated $50/month database instance per tenant is economically impossible. Shared databases let you serve 10,000 tenants from a single database that costs $500/month — $0.05 per tenant.

### Up to ~1,000 tenants with moderate data volumes

A well-indexed PostgreSQL database with Row Level Security can serve 1,000+ tenants with excellent performance as long as total data volume fits on a single instance (typically up to 1-4 TB with proper indexing). Beyond this, consider Citus for distributed multi-tenant PostgreSQL before jumping to per-tenant databases.

### Uniform schema requirements

When all tenants use the same data model — same tables, same columns, same relationships — schema-per-tenant and database-per-tenant add complexity without benefit. The shared model lets you add a column once and all tenants get it immediately.

### Fast tenant onboarding

In the shared model, creating a new tenant is an `INSERT INTO tenants` row. In database-per-tenant, it is provisioning a database, running migrations, configuring connection pooling, setting up monitoring, and updating routing tables. If your business depends on instant self-service signups, shared database removes an entire category of onboarding friction.

---

## When to Use Separate Database (Database-per-Tenant)

This model is justified under specific, concrete conditions — not as a default "enterprise-grade" choice.

### Regulatory or contractual data residency requirements

When enterprise customers contractually require their data to reside in a specific geographic region, or when regulations like GDPR, HIPAA, or SOC2 auditors specifically require physical data separation (not just logical isolation), a dedicated database in the required region is the cleanest compliance path.

**Example:** A healthcare SaaS serving hospitals in the EU and US may need patient data for German hospitals stored in Frankfurt and US hospital data in Virginia. Per-tenant databases in the appropriate region satisfy this cleanly.

### Very large tenants with asymmetric data volumes

When one tenant has 100x the data volume of an average tenant, they will dominate shared database resources — indexes, vacuum operations, buffer cache. A dedicated database prevents this tenant from degrading performance for all others.

**Example:** An analytics SaaS where most tenants have 10 GB of data but one enterprise customer has 2 TB. That single tenant would consume the majority of shared I/O bandwidth and make vacuum operations take hours.

### Tenant-specific backup and restore requirements

In a shared database, restoring a single tenant's data to a point in time requires surgically extracting their rows from a full database backup. With a dedicated database, you restore the entire database — a standard, well-tested operation that any DBA can perform under pressure at 3 AM.

### Tenants with custom schema extensions

If your product allows enterprise customers to define custom tables, custom columns, or stored procedures, a dedicated database prevents one tenant's schema experiments from affecting others' query performance.

---

## When NOT to Over-Isolate

**This section is deliberately as long as the sections above because over-isolation is the more common and more expensive mistake.** Teams default to database-per-tenant out of a vague sense that "more isolation is always better" without understanding the costs. It is architectural over-engineering with compounding operational consequences.

### Database-per-tenant at 10,000 tenants is an operational nightmare

Consider the concrete operational reality of managing 10,000 separate databases:

- **Schema migrations:** Every `ALTER TABLE` must run against 10,000 databases. If each migration takes 2 seconds (fast for a production database with locks), the total migration takes 5.5 hours. A failed migration on database #7,431 requires investigation and remediation while 2,569 databases are in the old schema and 7,431 are in the new one. Your application must handle both schema versions simultaneously.
- **Connection pooling:** Each database requires its own connection pool. At 10 connections per pool, you need 100,000 database connections. PgBouncer can help, but you are now operating PgBouncer as critical infrastructure managing 10,000 upstream databases.
- **Monitoring:** 10,000 databases means 10,000 sets of slow-query logs, 10,000 replication lag monitors, 10,000 disk-space alerts. Your monitoring system is now larger than most companies' entire infrastructure.
- **Backups:** 10,000 nightly backups, 10,000 backup verification jobs, 10,000 retention policies. One failed backup goes unnoticed, and that tenant's data is unrecoverable.
- **Cost:** Even at $10/month per managed database instance (the cheapest available), 10,000 databases cost $100,000/month just for database infrastructure. A single shared database handling the same workload might cost $2,000/month.

**Real-world cautionary tale:** Multiple SaaS companies have publicly discussed spending 6-12 months migrating from database-per-tenant back to shared databases after reaching the point where migration tooling consumed more engineering time than product development. The Atlas schema migration tool specifically addresses this pain point, but the tooling exists because the problem is so painful.

### Shared database with Row Level Security handles most compliance needs

Teams often choose database-per-tenant because "compliance requires data isolation." In practice, most compliance frameworks — SOC2, HIPAA, GDPR — require **access control**, not physical separation. Row Level Security in PostgreSQL provides database-enforced access control that satisfies auditors:

```sql
-- This policy is enforced by the database engine itself, not application code.
-- Even if application code has a bug, the database will not return
-- another tenant's data.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

SOC2 auditors care that **no code path can access another tenant's data**, not whether data lives in separate physical databases. RLS provides this guarantee at the database layer, which is actually stronger than relying on application-level `WHERE tenant_id = ?` clauses that a developer might forget.

**PostgreSQL CVE note:** CVE-2024-10976 demonstrated that RLS policies could disregard user ID changes in certain edge cases, and CVE-2025-8713 revealed that optimizer statistics could leak sampled data from RLS-protected rows. These vulnerabilities were patched, but they underscore the importance of keeping PostgreSQL updated and having defense-in-depth (application-level filtering as a second layer).

### The hybrid model is almost always the right answer at scale

Instead of choosing one isolation level for all tenants, successful SaaS companies offer tiered isolation:

| Tier | Isolation Level | Price Point | Target Customer |
|---|---|---|---|
| Free / Starter | Shared DB, shared schema | $0-29/mo | Individual users, small teams |
| Professional | Shared DB, RLS-enforced | $30-299/mo | SMBs |
| Enterprise | Dedicated database, optional dedicated compute | $300-5000+/mo | Enterprises with compliance needs |

This model aligns isolation cost with revenue. The enterprise customers who need and demand dedicated infrastructure pay the premium that funds it. The free-tier users who generate minimal revenue share infrastructure efficiently.

**Slack, Notion, Figma, and most successful B2B SaaS companies** use variants of this hybrid approach.

---

## How It Works

### Tenant Context Propagation

Every request in a multi-tenant system must carry tenant identity. The tenant context must be set **once at the edge** and propagated through every layer — never derived from user input deep in the stack.

```
Request → API Gateway → Middleware → Service → Database
           │                │
           │                └─ Sets tenant context:
           │                   SET app.current_tenant = 'acme-corp';
           └─ Extracts tenant from:
              - JWT claim (tenant_id)
              - Subdomain (acme.app.com)
              - API key lookup
              - OAuth token introspection
```

**Implementation (Express.js middleware example):**

```javascript
// Tenant middleware — runs before any route handler
async function tenantMiddleware(req, res, next) {
  // Extract tenant from JWT, subdomain, or API key
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    return res.status(401).json({ error: 'Tenant not identified' });
  }

  // Validate tenant exists and is active
  const tenant = await tenantRegistry.get(tenantId);
  if (!tenant || tenant.status !== 'active') {
    return res.status(403).json({ error: 'Tenant suspended or not found' });
  }

  // Attach to request context (available to all downstream handlers)
  req.tenantId = tenantId;
  req.tenantConfig = tenant.config;

  // Set database-level context for RLS
  await db.query("SET app.current_tenant = $1", [tenantId]);

  next();
}
```

### Row Level Security in PostgreSQL

RLS is the single most important tool for multi-tenant data isolation in a shared database. It moves tenant filtering from application code (where developers can forget it) to the database engine (where it is enforced unconditionally).

**Step 1: Enable RLS on every tenant-scoped table**

```sql
-- Create the table with tenant_id as the first column
-- (first column in composite indexes for efficient filtering)
CREATE TABLE orders (
  tenant_id  UUID NOT NULL,
  order_id   UUID NOT NULL DEFAULT gen_random_uuid(),
  customer   TEXT NOT NULL,
  total      NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, order_id)
);

-- Enable RLS (without this, policies are ignored)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (critical for security)
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Create the isolation policy
CREATE POLICY tenant_isolation_policy ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Step 2: Set tenant context per connection/transaction**

```sql
-- At the start of every request, set the tenant context
-- This is typically done by middleware before any queries run
SET LOCAL app.current_tenant = 'a1b2c3d4-...';

-- Now all queries are automatically scoped:
SELECT * FROM orders;
-- Internally becomes: SELECT * FROM orders WHERE tenant_id = 'a1b2c3d4-...';

-- Inserts are also checked:
INSERT INTO orders (tenant_id, customer, total)
VALUES ('wrong-tenant-id', 'test', 100);
-- ERROR: new row violates row-level security policy
```

**Step 3: Create an application database role that respects RLS**

```sql
-- The application connects as this role, NOT as the table owner
CREATE ROLE app_user LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;
-- app_user is subject to RLS policies
-- The table owner (used only for migrations) bypasses RLS by default
```

### Query Scoping (Defense-in-Depth)

Even with RLS, application-level query scoping provides defense-in-depth. Use repository patterns or ORM scopes that automatically include tenant filtering:

```python
# Python/SQLAlchemy example: automatic tenant scoping
class TenantQuery(Query):
    def get(self, *args, **kwargs):
        # Automatically add tenant filter to every query
        return super().filter(
            self._entity.tenant_id == g.current_tenant_id
        ).get(*args, **kwargs)

class Order(Base):
    __tablename__ = 'orders'
    tenant_id = Column(UUID, nullable=False, index=True)
    order_id = Column(UUID, primary_key=True)
    # ...

    query_class = TenantQuery  # All queries auto-scoped
```

### Tenant-Aware Caching

Caching in a multi-tenant system requires tenant-scoped cache keys. A cache key of `orders:recent` is a cross-tenant data leak waiting to happen. Every cache key must include the tenant identifier.

```python
# WRONG — cross-tenant data leak
cache.get("orders:recent")

# CORRECT — tenant-scoped cache key
cache.get(f"tenant:{tenant_id}:orders:recent")

# For Redis, use key prefixes or separate databases per tier:
# Free tier:  redis DB 0, keys prefixed with tenant_id
# Enterprise: dedicated Redis instance per tenant
```

**Cache invalidation** also becomes tenant-scoped. When tenant A's data changes, only tenant A's cache entries should be invalidated — not the entire cache.

### Tenant-Aware Background Jobs

Background jobs (email sending, report generation, data exports) must carry tenant context explicitly. A job that loses its tenant context will either fail or — worse — operate on the wrong tenant's data.

```python
# Enqueue with tenant context
queue.enqueue(
    'generate_report',
    tenant_id='acme-corp',
    report_type='monthly_sales',
    month='2025-01'
)

# Worker sets tenant context before execution
def process_job(job):
    tenant_id = job.data['tenant_id']
    set_tenant_context(tenant_id)  # Sets DB session, cache prefix, etc.
    try:
        execute_job(job)
    finally:
        clear_tenant_context()  # Prevent context leaking to next job
```

### Data Migration Across Isolation Levels

A well-designed multi-tenant system supports migrating a tenant between isolation levels — typically from shared to dedicated when they upgrade to enterprise tier.

**Migration steps (shared DB to dedicated DB):**

1. Provision new dedicated database, run schema migrations
2. Begin dual-write: all writes go to both shared and dedicated DB
3. Backfill: copy historical data from shared DB to dedicated DB
4. Verify: compare row counts and checksums between databases
5. Switch reads: point tenant's read path to dedicated DB
6. Stop dual-write to shared DB
7. Archive and delete tenant's rows from shared DB

This process should be automated and tested regularly. If it is a manual runbook, it will fail under pressure.

---

## Trade-Offs Matrix

| Dimension | Shared DB + tenant_id | Schema-per-Tenant | Database-per-Tenant |
|---|---|---|---|
| **Tenant onboarding speed** | Instant (insert a row) | Seconds (create schema, run migrations) | Minutes to hours (provision DB, configure) |
| **Cost per tenant** | ~$0.01-0.10/mo (amortized) | ~$0.50-2/mo (schema overhead) | $10-200+/mo (dedicated instance) |
| **Data isolation** | Logical (application + RLS) | Moderate (schema boundary) | Physical (separate instance) |
| **Noisy neighbor risk** | High (shared I/O, CPU, memory) | Medium (shared I/O, separate tables) | None (fully isolated resources) |
| **Schema migration speed** | Fast (one ALTER TABLE) | Slow (N schemas x migration) | Very slow (N databases x migration) |
| **Tenant-specific schema** | Not possible | Possible but complicates migrations | Fully flexible |
| **Backup/restore granularity** | Difficult (extract rows from full backup) | Moderate (pg_dump single schema) | Easy (standard DB restore) |
| **Cross-tenant queries** | Easy (single query, no tenant filter) | Moderate (cross-schema joins) | Very difficult (federated queries) |
| **Connection pooling** | Simple (one pool) | Moderate (one pool, schema switching) | Complex (N pools or N routing rules) |
| **Monitoring complexity** | Simple (one database to monitor) | Moderate (per-schema metrics) | High (N databases to monitor) |
| **Maximum practical tenants** | 100,000+ | ~5,000 (schema creation overhead) | ~500-1,000 (operational ceiling) |
| **Compliance satisfaction** | RLS satisfies most auditors | Stronger isolation for stricter audits | Satisfies all compliance requirements |
| **Operational team size needed** | Small (1-2 DBAs) | Medium (2-3 DBAs) | Large (3-5+ DBAs or heavy automation) |

---

## Evolution Path

The most successful multi-tenant architectures evolve through stages, driven by concrete business needs — not speculative "we might need this."

### Stage 1: Shared Database (Day 1 — ~1,000 tenants)

Start here. Every table has a `tenant_id` column. Enable RLS from day one — it is far easier to enable on empty tables than to retrofit. Build your ORM/repository layer with automatic tenant scoping.

**Key discipline:** Include `tenant_id` in every primary key and every foreign key as a composite. This makes future sharding possible without restructuring your data model.

```sql
-- DO THIS from day one
PRIMARY KEY (tenant_id, order_id)
FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, customer_id)

-- NOT THIS — makes future sharding extremely painful
PRIMARY KEY (order_id)
FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
```

### Stage 2: Shared Database + Noisy Neighbor Controls (~1,000-10,000 tenants)

Add per-tenant rate limiting, query timeouts, and resource quotas. Monitor per-tenant resource consumption. Identify tenants whose usage patterns degrade the experience for others.

```python
# Per-tenant rate limiting
@rate_limit(
    key=lambda req: req.tenant_id,
    limits={
        'free': '100/minute',
        'pro': '1000/minute',
        'enterprise': '10000/minute'
    }
)
def api_handler(req):
    ...
```

### Stage 3: Hybrid — Selective Isolation for Enterprise (~5,000+ tenants)

When you sign enterprise customers with compliance requirements or data volumes that degrade shared infrastructure, offer dedicated databases as a premium tier. Build the migration tooling (Stage 1 → Stage 3) as a product feature, not an ad-hoc project.

### Stage 4: Distributed Multi-Tenant (Citus/Sharding) (~50,000+ tenants)

When a single PostgreSQL instance cannot handle the total data volume or query load, use Citus to distribute the shared database across multiple nodes while maintaining the shared-schema model. Tenant data is automatically co-located on the same node, preserving efficient joins.

```sql
-- Citus: distribute tables by tenant_id
SELECT create_distributed_table('orders', 'tenant_id');
SELECT create_distributed_table('order_items', 'tenant_id');
-- Queries filtered by tenant_id route to a single node
-- Cross-tenant aggregations still work (distributed query engine)
```

### Stage 5: Cell-Based Architecture (~100,000+ tenants)

At massive scale, partition tenants into cells — self-contained units of infrastructure that each serve a subset of tenants. Each cell is a complete stack (application, database, cache, queue). New tenants are assigned to cells with capacity. Failing cells affect only their tenants, not the entire platform.

AWS presented this as "SaaS meets cell-based architecture" at re:Invent 2024, describing it as a natural fit for multi-tenant systems at hyperscale.

---

## Failure Modes

### Data Leakage Between Tenants — The Worst Possible Bug

Cross-tenant data leakage is the most severe bug a multi-tenant system can have. It is worse than downtime. It is worse than data loss. A single incident destroys customer trust and can trigger regulatory action.

**How it happens:**

1. **Missing WHERE clause:** A developer writes `SELECT * FROM orders` without the tenant filter. In testing (single-tenant test database), this works perfectly. In production, it returns all tenants' orders.
2. **Cached data served to wrong tenant:** A cache key without tenant scoping (`cache.get("dashboard_data")`) returns tenant A's dashboard to tenant B.
3. **Background job loses tenant context:** A job is enqueued with tenant context but the worker does not set the database session variable before executing. Queries run without RLS filtering.
4. **API endpoint missing tenant middleware:** A new endpoint is added without the tenant authentication middleware. Requests without a valid tenant token access an unscoped database view.
5. **ORM eager loading bypasses RLS:** Some ORMs, when performing eager/lazy loading of associations, issue separate queries that may not carry the tenant context set for the parent query.

**Real incidents:**
- A 2021 Microsoft Azure vulnerability ("ChaosDB") allowed attackers to access other customers' Cosmos DB instances through a misconfigured Jupyter notebook feature.
- AWS AppSync had a cross-tenant vulnerability allowing access to resources in other organizations' accounts.
- Multiple SaaS companies have disclosed incidents where API endpoints returned data belonging to other tenants due to missing tenant filtering in new code paths.

**Prevention:**
- RLS as the primary barrier (database-enforced, not application-enforced)
- Application-level tenant scoping as defense-in-depth
- Integration tests that create two tenants, insert data for both, and verify each tenant can only see their own data — run these tests on every deployment
- Code review checklists that specifically verify tenant filtering on every new query
- Static analysis rules that flag raw SQL without tenant_id references

### Noisy Neighbor

One tenant's heavy workload degrades performance for all tenants sharing the same infrastructure.

**Symptoms:** Spike in response times for all tenants correlated with one tenant's batch processing job, large data export, or traffic surge.

**Mitigations:**
- Per-tenant query timeouts: `SET LOCAL statement_timeout = '5s';`
- Per-tenant connection limits in the connection pool
- Per-tenant rate limiting at the API gateway
- Resource quotas (CPU, memory) via Kubernetes resource limits for tenant-specific workloads
- Separate queues for background jobs by tenant tier
- Move consistently noisy tenants to dedicated infrastructure (and charge accordingly)

### Tenant-Specific Outage Cascading

A bug triggered by one tenant's specific data pattern crashes the application for all tenants.

**Example:** Tenant A uploads a 500 MB CSV file. The import handler loads it entirely into memory, OOM-kills the application process, and all tenants lose service.

**Mitigations:**
- Tenant-specific error isolation (catch and contain errors per-tenant request)
- Circuit breakers per tenant: if tenant A's requests fail 5 times consecutively, temporarily reject tenant A's requests while continuing to serve others
- Bulkhead pattern: separate thread/process pools for different tenants or tenant tiers
- Input validation with per-tenant resource limits (max file size, max rows per import, max API payload size)

### Migration Complexity

Moving a tenant between isolation levels (shared to dedicated, or between shards) risks data loss or inconsistency.

**Mitigations:**
- Dual-write during migration with reconciliation checks
- Automated migration tooling tested in staging with production-sized datasets
- Rollback capability: ability to move the tenant back to shared if dedicated has issues
- Migration as a product feature, not an operational procedure

---

## Technology Landscape

### PostgreSQL Row Level Security (RLS)

The most mature and widely used solution for shared-database multi-tenancy. Available since PostgreSQL 9.5 (2016).

**Strengths:**
- Policies enforced by the database engine — cannot be bypassed by application code (unless connecting as table owner)
- Works with standard PostgreSQL tooling (pg_dump, pg_restore, logical replication)
- Minimal performance overhead (typically < 5%) when policies use indexed columns
- Policies can be arbitrarily complex (not limited to tenant_id equality)

**Limitations:**
- RLS is bypassed by the table owner role and roles with BYPASSRLS attribute — ensure the application connects as a non-owner role
- Complex permission models (row-level + column-level + attribute-based) may outgrow RLS capabilities
- Debugging RLS issues requires careful logging since policy execution is not directly observable
- Must keep PostgreSQL patched — CVEs have specifically targeted RLS enforcement

### Schema-Based Multi-Tenancy Libraries

- **`django-tenants`** (Python/Django): Maps tenants to PostgreSQL schemas via `search_path`. Middleware automatically sets the schema based on the request's subdomain or header.
- **`apartment`** (Ruby/Rails): Schema-based tenant switching for ActiveRecord. Each tenant gets a separate PostgreSQL schema with identical table structures.
- **`spring-multitenancy`** and **Hibernate multi-tenancy**: Java ecosystem support for schema-per-tenant and database-per-tenant patterns with connection routing.

**Common issue with schema-based libraries:** Schema creation and migration across N schemas becomes slow. At 5,000 schemas, a migration that adds a column takes 5,000 `ALTER TABLE` statements. Tools like Atlas and Flyway have specific support for batch multi-schema migrations.

### Citus for Distributed Multi-Tenant PostgreSQL

Citus is an open-source PostgreSQL extension (now part of Azure Cosmos DB for PostgreSQL) that distributes tables across multiple nodes while preserving the PostgreSQL interface.

**How it works for multi-tenancy:**
- All tables are distributed by `tenant_id` (the distribution column)
- Rows for the same tenant are co-located on the same physical node
- Queries filtered by `tenant_id` route to a single node — same performance as standard PostgreSQL
- Cross-tenant aggregate queries (admin dashboards) use the distributed query engine
- Large tenants can be isolated on dedicated nodes using tenant placement controls

**Citus 12+ schema-based sharding:** As an alternative to row-based distribution, Citus 12 introduced schema-based sharding where each tenant gets a PostgreSQL schema that is automatically placed on a node. This requires minimal query changes (just set `search_path`) and suits applications that already use schema-per-tenant.

### Other Technologies

- **AWS RDS Proxy:** Connection pooling and routing for database-per-tenant architectures on AWS. Reduces the connection overhead of managing many databases.
- **ProxySQL / PgBouncer:** Connection poolers that can route queries to different backends based on tenant context.
- **Kubernetes Namespaces:** Provide compute-level isolation for tenants requiring dedicated application instances alongside dedicated databases.
- **HashiCorp Vault:** Manages per-tenant encryption keys, database credentials, and secrets in multi-tenant environments.

---

## Decision Tree

```
Start: Building a SaaS application?
│
├─ YES: How many tenants do you expect in 2 years?
│   │
│   ├─ < 10 tenants, all enterprise, high-touch sales
│   │   └─ Consider single-tenant deployments
│   │       (operational overhead is manageable at this scale,
│   │        and enterprise customers may contractually require it)
│   │
│   ├─ 10-100,000 tenants, self-service signups
│   │   │
│   │   ├─ Do any tenants have regulatory requirements
│   │   │  for physical data separation?
│   │   │   │
│   │   │   ├─ NO → Shared DB + RLS
│   │   │   │       (simplest, cheapest, fastest to build)
│   │   │   │
│   │   │   └─ YES, but < 5% of tenants
│   │   │       └─ Hybrid: Shared DB for standard,
│   │   │          dedicated DB for enterprise
│   │   │
│   │   ├─ Will individual tenants have > 100 GB of data?
│   │   │   │
│   │   │   ├─ NO → Shared DB + RLS (handles this easily)
│   │   │   │
│   │   │   └─ YES → Hybrid or Citus
│   │   │       (co-locate large tenants on dedicated nodes)
│   │   │
│   │   └─ Do tenants need custom schema extensions?
│   │       │
│   │       ├─ NO → Shared DB + RLS
│   │       │
│   │       └─ YES → Schema-per-tenant or metadata-driven
│   │           (Salesforce-style: store custom fields as
│   │            metadata rows, not physical columns)
│   │
│   └─ > 100,000 tenants
│       └─ Shared DB + Citus distributed sharding
│           or cell-based architecture
│           (database-per-tenant is operationally impossible
│            at this scale)
│
└─ NO: Multi-tenancy is not relevant to your architecture.
```

---

## Implementation Sketch

### Complete PostgreSQL RLS Setup

```sql
-- 1. Tenants registry
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  config JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tenant-scoped table (composite PK is critical for future sharding)
CREATE TABLE orders (
  tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  order_id   UUID NOT NULL DEFAULT gen_random_uuid(),
  customer   TEXT NOT NULL,
  total      NUMERIC(10,2) NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, order_id)
);
CREATE INDEX idx_orders_tenant_created ON orders (tenant_id, created_at DESC);

-- 3. Enable RLS + single policy for all operations
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- 4. Application role (subject to RLS — NOT the table owner)
CREATE ROLE app_service LOGIN PASSWORD 'strong-password-here';
GRANT USAGE ON SCHEMA public TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_service;

-- 5. Admin role for cross-tenant reads (dashboards, support)
CREATE ROLE admin_service LOGIN PASSWORD 'different-strong-password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin_service;
CREATE POLICY admin_read ON orders FOR SELECT TO admin_service USING (true);
```

### Tenant Middleware and Query Wrapper (Node.js/Express)

```javascript
const pool = new Pool({ user: 'app_service', database: 'saas_app', max: 20 });

// Middleware: extract tenant from JWT (or subdomain, API key, etc.)
function tenantContext(req, res, next) {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Tenant not identified' });
  req.tenantId = tenantId;
  next();
}

// DB wrapper: sets tenant context via SET LOCAL (transaction-scoped)
async function tenantQuery(tenantId, queryText, params) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const result = await client.query(queryText, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // Returns to pool WITHOUT tenant context
  }
}

// Route handler — no WHERE tenant_id needed, RLS handles it
app.get('/api/orders', tenantContext, async (req, res) => {
  const result = await tenantQuery(req.tenantId,
    'SELECT order_id, customer, total, status FROM orders ORDER BY created_at DESC LIMIT 50');
  res.json(result.rows);
});
```

### Tenant-Aware Integration Test

```javascript
describe('Multi-tenant data isolation', () => {
  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeAll(async () => {
    await adminQuery(`INSERT INTO tenants (tenant_id, name, slug)
      VALUES ($1, 'Tenant A', 'a'), ($2, 'Tenant B', 'b')`, [tenantA, tenantB]);
    await tenantQuery(tenantA, `INSERT INTO orders (tenant_id, customer, total)
      VALUES ($1, 'Alice', 100)`, [tenantA]);
    await tenantQuery(tenantB, `INSERT INTO orders (tenant_id, customer, total)
      VALUES ($1, 'Bob', 200)`, [tenantB]);
  });

  test('Tenant A sees only own data', async () => {
    const r = await tenantQuery(tenantA, 'SELECT * FROM orders');
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].customer).toBe('Alice');
  });

  test('Cross-tenant insert is rejected by RLS', async () => {
    await expect(tenantQuery(tenantA,
      `INSERT INTO orders (tenant_id, customer, total) VALUES ($1, 'Mallory', 999)`,
      [tenantB])).rejects.toThrow(/row-level security/);
  });

  test('No tenant context = no data (default-deny)', async () => {
    const client = await pool.connect();
    try {
      const r = await client.query('SELECT * FROM orders');
      expect(r.rows).toHaveLength(0);
    } finally { client.release(); }
  });
});
```

---

## Key Takeaways

1. **Start with shared database + tenant_id + RLS.** It is the simplest, cheapest, and most operationally sustainable model. You can always add isolation later; you cannot easily remove it.

2. **Include tenant_id in every composite primary key and foreign key from day one.** This single discipline preserves all future options — sharding, migration to dedicated databases, Citus distribution.

3. **Use Row Level Security as your primary isolation mechanism**, not application-level WHERE clauses. RLS is enforced by the database engine and cannot be bypassed by application bugs (as long as the application connects as a non-owner role).

4. **Build the hybrid model as a product feature.** The ability to migrate a tenant from shared to dedicated infrastructure is a premium offering that enterprise customers will pay for.

5. **Cross-tenant data leakage is an existential threat.** Invest more in preventing it than in any other aspect of your multi-tenant architecture. Integration tests that verify isolation on every deployment are non-negotiable.

6. **Database-per-tenant is a last resort, not a default.** At more than a few hundred tenants, the operational cost (migrations, monitoring, backups, connection management) exceeds the benefit for all but the most demanding compliance environments.

7. **Noisy neighbor is a solvable problem without physical isolation.** Per-tenant rate limiting, query timeouts, connection limits, and resource quotas handle 95% of noisy neighbor scenarios at a fraction of the cost of dedicated databases.

---

## Cross-References

- **[Database Scaling](../data/database-scaling.md)** — Vertical vs horizontal scaling, read replicas, connection pooling strategies that underpin multi-tenant database architecture
- **[Data Consistency](../data/data-consistency.md)** — Consistency guarantees across tenant isolation boundaries, especially during tenant migration between isolation levels
- **[Horizontal vs Vertical Scaling](horizontal-vs-vertical.md)** — When to scale up a shared database vs shard across nodes, directly relevant to multi-tenant growth stages
- **[Feature Flags and Rollouts](../../design/feature-flags-and-rollouts.md)** — Tenant-scoped feature flags for gradual rollouts, A/B testing per tenant tier, and tenant-specific configuration

---

## Sources

- [Salesforce Platform Multitenant Architecture](https://architect.salesforce.com/fundamentals/platform-multitenant-architecture)
- [AWS: Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Azure: Multitenant SaaS Database Tenancy Patterns](https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns)
- [Citus: Sharding a Multi-Tenant App with Postgres](https://docs.citusdata.com/en/stable/articles/sharding_mt_app.html)
- [Crunchy Data: Row Level Security for Tenants in Postgres](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- [The Nile Dev: Shipping multi-tenant SaaS using Postgres Row-Level Security](https://www.thenile.dev/blog/multi-tenant-rls)
- [Citus 12: Schema-based sharding for PostgreSQL](https://www.citusdata.com/blog/2023/07/18/citus-12-schema-based-sharding-for-postgres/)
- [AWS re:Invent 2024: SaaS meets cell-based architecture](https://reinvent.awsevents.com/content/dam/reinvent/2024/slides/sas/SAS315_SaaS-meets-cell-based-architecture-A-natural-multi-tenant-fit.pdf)
- [OWASP: Multi Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- [Bytebase: Multi-Tenant Database Architecture Patterns Explained](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [WorkOS: The developer's guide to SaaS multi-tenant architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
- [Inngest: Fixing noisy neighbor problems in multi-tenant queueing systems](https://www.inngest.com/blog/fixing-multi-tenant-queueing-concurrency-problems)
