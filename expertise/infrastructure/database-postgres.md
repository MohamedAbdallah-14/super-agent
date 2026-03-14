# PostgreSQL -- Expertise Module

> PostgreSQL specialist responsible for designing, optimizing, and administering relational databases.
> Scope covers schema design, query optimization, replication, security hardening, backup/recovery,
> and operational excellence for PostgreSQL 16+ in both self-hosted and managed environments.

---

## Core Patterns & Conventions

### Schema Design Conventions

**Naming:** Tables: plural `snake_case` (`order_items`). Columns: singular `snake_case` (`created_at`). PKs: `id` as `BIGINT GENERATED ALWAYS AS IDENTITY`. FKs: `<table_singular>_id`. Indexes: `idx_<table>_<cols>`. Constraints: `chk_`/`uq_` prefix. Booleans: `is_`/`has_` prefix.

**Data Types:**
- `BIGINT GENERATED ALWAYS AS IDENTITY` over `SERIAL` (SQL-standard, PG 10+)
- `timestamptz` always; never bare `timestamp` (ambiguous across timezones)
- `text` over `varchar(n)` unless a hard DB-enforced length limit is needed
- `numeric`/`integer` for money; never `float`/`double precision`
- `uuid` for external IDs; `bigint` for internal PKs
- `inet`/`cidr` for IPs; `daterange`/`tstzrange` for temporal ranges

**Constraints:** Default to `NOT NULL`. Use `CHECK` for domain rules (`CHECK (price >= 0)`). Prefer DB-level `UNIQUE` over app-level checks. Use `EXCLUDE` for range overlaps. Define FKs with explicit `ON DELETE` behavior.

### Indexing Strategies

| Type | Use Case | Notes |
|------|----------|-------|
| **B-tree** | Equality, range, ORDER BY | Default; covers 95% of cases; supports index-only scans |
| **GIN** | Full-text search, JSONB `@>`, arrays | Use `jsonb_path_ops` for containment-only queries (smaller, faster) |
| **GiST** | PostGIS geometry, range types, FTS (write-heavy) | Lossy; faster builds than GIN; proximity/nearest-neighbor |
| **BRIN** | Naturally-ordered append-only data (timestamps) | Up to 1000x smaller than B-tree; requires correlated physical order |
| **Hash** | Equality-only `=` lookups | WAL-logged since PG 10; rarely beats B-tree |

**Partial indexes:** `CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending'` -- dramatically smaller and cheaper to maintain.
**Covering indexes:** `CREATE INDEX ... ON orders(user_id) INCLUDE (total, status)` -- enables index-only scans for extra columns.
**Expression indexes:** `CREATE INDEX ... ON users(lower(email))` -- must match the exact expression in queries.

### Migration Patterns and Tools

| Tool | Approach | Best For |
|------|----------|----------|
| **Flyway** | Versioned SQL scripts | Java/JVM teams, CI/CD pipelines |
| **Liquibase** | Changelog (XML/YAML/SQL) | Enterprise teams needing rollback plans |
| **Prisma Migrate** | Declarative schema DSL | TypeScript full-stack teams |
| **Atlas** | Declarative HCL/SQL | "Terraform for databases" approach |
| **dbmate** | Plain SQL up/down files | Lightweight, language-agnostic |
| **Alembic** | Python migration scripts | SQLAlchemy / Python teams |

**Rules:** Migrations must be idempotent (`IF NOT EXISTS`). Never modify applied migrations. Include `up`+`down` scripts. Use `CREATE INDEX CONCURRENTLY`. Separate DDL from DML. Lint with `squawk` or `pgspot` in CI.

### Query Patterns

**CTEs:** PG 12+ auto-inlines CTEs when beneficial. Use `MATERIALIZED`/`NOT MATERIALIZED` to override.
**Window functions:** `RANK()`, `LAG()`, `LEAD()` with `PARTITION BY` + `ORDER BY` for analytics without self-joins.
**LATERAL joins:** Row-by-row correlated subqueries -- ideal for "top-N per group" patterns.
**Bulk operations:** Use `COPY` or multi-row `INSERT` (up to 100x faster than row-by-row).

### Connection Management

pgBouncer is the standard pooler. Use `transaction` mode (connection returned after each transaction) for most workloads. Use `session` mode only when you need prepared statements, LISTEN/NOTIFY, or temp tables. Sizing: `(num_pools x default_pool_size) < max_connections - 15`. For CPU-bound OLTP, set `max_connections` to 2-4x vCPU count. Deploy multiple pgBouncer instances behind HAProxy for HA.

### Transaction Isolation Levels

| Level | When to Use | Trade-off |
|-------|-------------|-----------|
| **Read Committed** (default) | 90% of OLTP workloads | Non-repeatable reads between statements |
| **Repeatable Read** | Reporting, analytics, consistent multi-statement reads | Must retry on serialization failure |
| **Serializable** | Financial ops, inventory, double-booking prevention | Highest retry rate; always implement retry logic |

PG silently upgrades `Read Uncommitted` to `Read Committed`.

### JSONB Usage Patterns

**Use for:** variable-schema metadata, event payloads, sparse attributes, user preferences.
**Avoid for:** fixed schemas (use columns), frequently filtered/joined data, deeply nested docs (5+ levels), large documents (>2KB triggers TOAST overhead).
**Best practice:** Hybrid -- typed columns for fixed attributes, `metadata JSONB` for variable data. Index with GIN (`jsonb_path_ops` for `@>` only). **Caveat:** PG cannot collect statistics inside JSONB -- planner uses hardcoded 0.1% selectivity estimate, leading to poor plans. Extract hot keys to typed columns.

### Partitioning Strategies

**Range:** Time-series data (partition by month/week). **List:** Categorical data (tenant, region). **Hash:** No natural key; even distribution.
**When:** Table exceeds server RAM or >50-100M rows; queries consistently filter on partition key; need fast bulk deletes (DROP PARTITION). **Limits:** Keep to a few dozen to a few hundred partitions; avoid <10K rows per partition. Automate creation with cron or `pg_partman`.

---

## Anti-Patterns & Pitfalls

### 1. Using `SELECT *` in Production Queries
Forces heap fetches for every row, defeating index-only scans. Breaks app code when columns change. Always specify exact columns needed.

### 2. Missing Indexes on Foreign Keys
PG does NOT auto-index FK columns. JOINs and cascading DELETE/UPDATE degrade to sequential scans -- O(n) per operation on the referenced table.

### 3. Using `timestamp` Without Time Zone
Stores wall-clock time with no timezone context. Values become ambiguous when servers/clients operate in different timezones. Always use `timestamptz` (stores UTC, converts on display).

### 4. Long-Running Transactions
MVCC keeps old row versions for any open transaction. Hours-long transactions prevent autovacuum from reclaiming dead tuples across ALL tables, causing persistent bloat. Monitor `pg_stat_activity` for `idle in transaction`.

### 5. Not Tuning Autovacuum for High-Churn Tables
Default `scale_factor = 0.2` means vacuum waits for 20% dead rows. For a 100M-row table, that is 20M dead rows. Set per-table: `ALTER TABLE hot_table SET (autovacuum_vacuum_scale_factor = 0.01)`.

### 6. Using `OFFSET` for Pagination
`OFFSET N` scans and discards N rows. Page 1000 scans 1000 x page_size rows. Use keyset pagination: `WHERE (created_at, id) < (:last_created_at, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20`.

### 7. Read-Modify-Write Without Proper Locking
Read, modify in app, write back = race condition. Concurrent sessions cause lost updates. Use atomic SQL (`SET balance = balance - 100`), `SELECT ... FOR UPDATE`, or Serializable isolation.

### 8. Using `SERIAL` Instead of Identity Columns
`SERIAL` has loose coupling -- values can be manually set, `pg_dump`/restore causes sequence drift. `GENERATED ALWAYS AS IDENTITY` enforces DB control (SQL-standard, PG 10+).

### 9. Storing ENUMs as Text Strings
`'pending'`/`'active'` wastes storage per row, inflates indexes. Use PG `ENUM` types for small stable sets, or a lookup table with integer FK for mutable sets.

### 10. Using `NOT IN` with Nullable Columns
`NOT IN (subquery)` returns zero rows if any subquery value is NULL (three-valued logic). Use `NOT EXISTS` instead -- handles NULLs correctly and often yields better anti-join plans.

### 11. Over-Indexing Write-Heavy Tables
Each index adds maintenance cost to every INSERT/UPDATE/DELETE (5-10x write slowdown with 10+ indexes). Increases WAL volume and replication lag. Audit with `pg_stat_user_indexes`; drop indexes with `idx_scan = 0`.

### 12. UUIDv4 as Primary Key
Random UUIDs destroy B-tree locality -- index page splits, fragmentation, cache misses. Inserts drop from ~72K/s (BIGINT) to ~13K/s. Use UUIDv7 (time-sorted, `pg_uuidv7` extension) or BIGINT PK + UUID column for external exposure.

### 13. `CREATE INDEX` Without `CONCURRENTLY`
Standard `CREATE INDEX` acquires SHARE lock, blocking all writes. Hours of downtime on large tables. Always use `CONCURRENTLY` in production (cannot run inside a transaction).

### 14. ORM `synchronize: true` in Production
TypeORM's `synchronize` / Prisma's `db push` can drop columns, alter types, remove constraints without warning. Use migration files in all non-dev environments.

### 15. No `statement_timeout` on Application Connections
Without timeout, bad queries run for hours, holding locks, blocking autovacuum. Set `statement_timeout = '30s'` per role. Use longer timeouts for batch/admin connections.

---

## Testing Strategy

**Approaches:** Unit-test functions/triggers/constraints with pgTAP. Integration-test queries against real PG (never SQLite). Run migration up/down/up in CI. Property-test constraint enforcement with random data.

**Test data:** Use factories (`factory_bot`, `fishery`, `faker.js`) over static fixtures. Use `TRUNCATE ... CASCADE` (not DELETE) for fast cleanup. Snapshot with `pg_dump` for known-good states.

**pgTAP example:**
```sql
BEGIN;
SELECT plan(3);
SELECT has_table('users');
SELECT has_column('users', 'email');
SELECT col_is_unique('users', 'email');
SELECT * FROM finish();
ROLLBACK;
```
Run with `pg_prove -d mydb tests/*.sql`. `runtests()` auto-rolls back each test.

**Migration testing:** Validate reversibility (up/down/up). Compare schema with `pg_dump --schema-only`. Test against anonymized production data. Lint with `squawk`/`pgspot`.

**Isolation:** Each test in its own `BEGIN`/`ROLLBACK`. For committed data, use template databases (`CREATE DATABASE test_x TEMPLATE test_base`). `pgtestdb` (Go) creates ephemeral DBs from cached templates in milliseconds.

---

## Performance Considerations

### EXPLAIN ANALYZE Interpretation
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```
- **Seq Scan:** OK for <10K rows or >5-10% selectivity; investigate otherwise
- **Index Scan → heap fetch:** Good for selective queries
- **Index Only Scan:** Best case; requires up-to-date visibility map (VACUUM)
- **Buffers shared hit/read:** `hit` = cache; `read` = disk I/O. High `read` = cache miss
- **rows vs actual rows mismatch:** Stale statistics; run `ANALYZE`

### Query Optimization
Run `ANALYZE` after bulk loads. Rewrite `NOT IN` as `NOT EXISTS`. Use keyset pagination. Avoid bare functions in WHERE (or create expression indexes). Use `EXISTS` not `COUNT(*) > 0`. Use `COPY` for bulk inserts. Use `ANY(ARRAY[...])` over long `IN (...)` lists.

### Autovacuum Tuning (PostgreSQL 16+)
```ini
autovacuum_max_workers = 4          # default 3
autovacuum_vacuum_scale_factor = 0.05  # default 0.2
autovacuum_analyze_scale_factor = 0.02 # default 0.1
autovacuum_vacuum_cost_delay = 2ms     # default 2ms (PG12+)
autovacuum_vacuum_cost_limit = 1000    # default 200
autovacuum_naptime = 15s               # default 60s
```
Monitor: `SELECT relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;`

### Memory Tuning

| Parameter | Setting | Notes |
|-----------|---------|-------|
| `shared_buffers` | 25% RAM (max 40%) | PG internal cache; OS handles the rest |
| `effective_cache_size` | 50-75% RAM | Not an allocation; tells planner expected cache |
| `work_mem` | 32-256 MB | Per-operation (sorts, hashes); multiply by connections for worst case |
| `maintenance_work_mem` | 512 MB - 2 GB | VACUUM, CREATE INDEX |
| `random_page_cost` | 1.1 (SSD) | Default 4.0 assumes HDD |
| `effective_io_concurrency` | 200 (SSD) | Default 1 assumes HDD |

**Rule:** `shared_buffers + effective_cache_size <= 0.97 * total_RAM`

### Monitoring
- **pg_stat_statements:** Query execution stats (essential; enable in `shared_preload_libraries`)
- **pg_stat_user_tables/indexes:** Dead tuples, unused indexes (`idx_scan = 0`)
- **pg_stat_activity:** Active queries, idle-in-transaction, wait events
- **auto_explain:** Logs plans for slow queries (`log_min_duration = 3s`)
- **pgBadger:** Log analysis into HTML reports
- **Datadog/Grafana:** Real-time dashboards from pg_stat_statements

---

## Security Considerations

### Role-Based Access Control
Create per-responsibility roles: `app_readonly`, `app_readwrite`, `app_admin`, `migration_runner`. Grant minimum privileges. Never use `postgres` superuser for app connections. Revoke `CREATE ON SCHEMA public FROM PUBLIC`. Use `ALTER DEFAULT PRIVILEGES` for future objects.

### Row-Level Security (RLS)
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::bigint)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::bigint);
```
Always `FORCE` RLS (owners bypass otherwise). Index policy columns. Test with non-superuser accounts. Avoid non-`LEAKPROOF` functions (prevent index usage). Set session vars at connection time, never from user input.

### SSL/TLS and Authentication
Set `ssl = on`, `ssl_min_protocol_version = 'TLSv1.3'` in postgresql.conf. Use `hostssl` in pg_hba.conf with `scram-sha-256` (never `md5` or `trust` over TCP). Client-side: `sslmode=verify-full`.

### SQL Injection Prevention
Always use parameterized queries. Never interpolate user input. Set `statement_timeout` to limit blast radius.

### Audit Logging
Use `pgaudit` extension: `pgaudit.log = 'write, ddl'` logs all data modifications and schema changes.

### Encryption
**In transit:** SSL/TLS. **At rest:** OS/cloud-level (LUKS, dm-crypt, RDS default encryption). **Column-level:** `pgcrypto` (`pgp_sym_encrypt`). **Keys:** Store outside DB (AWS KMS, Vault). PG has no native TDE.

---

## Integration Patterns

### ORM Best Practices
- **Prisma:** Type-safe; use `prisma migrate` not `db push` in prod; vendor lock-in via proprietary DSL
- **Drizzle:** Generates single optimized SQL; up to 14x lower latency than N+1-prone ORMs
- **TypeORM:** Never `synchronize: true` in prod; validate generated migration SQL
- **SQLAlchemy:** Prefer `Core` over `ORM` for complex queries; use scoped sessions
- **General:** Review generated SQL in dev. Eager-load to avoid N+1. Use raw SQL for CTEs/window functions/LATERAL. Match ORM pool size to pgBouncer's `default_pool_size`.

### Replication
**Streaming (physical):** Byte-for-byte replica. HA failover + read scaling. Sync mode for zero data loss.
**Logical (PG 10+):** Publish/subscribe. Replicate specific tables or filtered rows (PG 15+ WHERE). Use for cross-version upgrades. Does NOT replicate DDL or sequences.

### LISTEN/NOTIFY for Real-Time
```sql
CREATE OR REPLACE FUNCTION notify_change() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('order_changes', json_build_object('op', TG_OP, 'id', NEW.id)::text);
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
```
Ideal for low-medium rates (hundreds/sec). Payload max 8KB. Transactional (delivered on COMMIT). Use `pg_eventserv` for WebSocket bridging. For high throughput, pair with Redis/Kafka.

### Full-Text Search
```sql
ALTER TABLE articles ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(body,'')), 'B')
) STORED;
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);
```
Good for small-to-medium datasets. Use `pg_trgm` for `LIKE '%pattern%'`. For faceting/fuzzy/synonyms, consider Elasticsearch or ParadeDB.

### PostGIS
Use `geography` for lat/lon; `geometry` for projected coordinates. GiST indexes for spatial queries (`ST_DWithin`, `ST_Distance`, `ST_Contains`).

---

## DevOps & Deployment

### Backup Strategies

| Method | Type | RPO |
|--------|------|-----|
| `pg_dump`/`pg_dumpall` | Logical | Point-in-time of dump |
| `pg_basebackup` + WAL | Physical | Seconds (PITR) |
| **pgBackRest** | Physical + WAL | Seconds; incremental, parallel, encrypted, S3/GCS |
| **Barman** | Physical + WAL | Seconds; strong Patroni integration |

Test restores monthly. Store backups in a different region/account. Retain 7+ days PITR (30 for compliance).

### High Availability
**Patroni** (recommended): Cluster orchestration with auto-failover via etcd/Consul/ZooKeeper. Deploy across 3+ AZs. Pair with pgBackRest. Architecture: `etcd (3 nodes) -> Patroni (primary + replicas) -> HAProxy/pgBouncer -> App`.
**repmgr:** Lighter alternative; less automation, simpler setup.

### Docker
Use `postgres:16-alpine` or `postgres:17-alpine`. Named volumes for data. Enable `--data-checksums`. Health check: `pg_isready`. Docker is excellent for dev/CI; prefer VMs or managed for production.

### Managed vs Self-Hosted
Managed (RDS/Cloud SQL/Supabase): low ops, limited extensions, higher cost at scale. Self-hosted (Patroni): full control, any extension, lower cost but requires DBA expertise. Supabase for instant APIs + auth. Neon for serverless scale-to-zero.

### Alerting
**Page immediately:** replication lag >30s, disk >85%, connections >80% of max, queries >5min, failed autovacuum.
**Warning:** dead tuples growing, cache hit ratio <99%, checkpoint storms, lock waits increasing.

---

## Decision Trees

### Which Index Type?
```
Equality (=)?                    --> B-tree
Range (<, >, BETWEEN, ORDER BY)? --> B-tree
Full-text (tsvector @@ tsquery)? --> GIN (read-heavy) or GiST (write-heavy)
JSONB containment (@>), arrays?  --> GIN (jsonb_path_ops for @> only)
Geospatial (PostGIS)?            --> GiST
Append-only, naturally ordered?  --> BRIN (large tables only)
Subset of rows?                  --> Add WHERE clause (partial index)
Need index-only scan extras?     --> Add INCLUDE clause (covering index)
Function in WHERE?               --> Expression index
```

### Managed vs Self-Hosted?
```
Team < 5 engineers?                           --> Managed
Need extensions not on managed platforms?     --> Self-host (Patroni)
DB spend > $5K/mo + have DBA expertise?       --> Self-host (cost savings)
DB spend > $5K/mo but no DBA?                 --> Managed (ops cost offsets)
Serverless / bursty?                          --> Neon
Need instant APIs + auth + realtime?          --> Supabase
Multi-region active-active?                   --> Aurora or CockroachDB
```

### When to Partition?
```
Table > 50-100M rows or exceeds server RAM?   --> Yes
Queries filter on partition key consistently? --> Range (dates) or List (categories)
No natural key?                               --> Hash partitioning
Need fast bulk deletes of old data?           --> Range + DROP PARTITION
Otherwise?                                    --> Do not partition (overhead not justified)
```

---

## Code Examples

### 1. Safe Migration: Add Column + Concurrent Index
```sql
-- PG 11+ does NOT rewrite table for non-volatile defaults. Fast on billion-row tables.
ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX CONCURRENTLY idx_users_unverified ON users (is_verified) WHERE is_verified = false;
```

### 2. Keyset Pagination
```sql
-- First page
SELECT id, title, created_at FROM articles
WHERE published = true ORDER BY created_at DESC, id DESC LIMIT 20;
-- Next page (pass last row's values)
SELECT id, title, created_at FROM articles
WHERE published = true AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC LIMIT 20;
```
Constant performance at any depth -- unlike OFFSET which degrades linearly.

### 3. Upsert with Conflict Handling
```sql
INSERT INTO product_inventory (product_id, warehouse_id, quantity)
VALUES (:product_id, :warehouse_id, :quantity)
ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
    quantity = product_inventory.quantity + EXCLUDED.quantity,
    updated_at = NOW()
RETURNING *;
```

### 4. Advisory Locks for Job Coordination
```sql
SELECT pg_try_advisory_lock(hashtext('process_batch_42'));  -- non-blocking acquire
-- ... exclusive work ...
SELECT pg_advisory_unlock(hashtext('process_batch_42'));
```
Lightweight, never conflict with row/table locks. Ideal for preventing duplicate background job processing.

### 5. Production postgresql.conf (32 GB RAM, 8 vCPU, SSD)
```ini
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB
random_page_cost = 1.1
effective_io_concurrency = 200
max_wal_size = 4GB
checkpoint_completion_target = 0.9
autovacuum_max_workers = 4
autovacuum_vacuum_scale_factor = 0.05
autovacuum_vacuum_cost_limit = 1000
log_min_duration_statement = 1000
shared_preload_libraries = 'pg_stat_statements, auto_explain, pgaudit'
```

---

*Researched: 2026-03-07 | Sources: [PostgreSQL Official Docs v18](https://www.postgresql.org/docs/current/), [Instaclustr Best Practices 2025](https://www.instaclustr.com/education/postgresql/top-10-postgresql-best-practices-for-2025/), [PostgreSQL Wiki - Don't Do This](https://wiki.postgresql.org/wiki/Don't_Do_This), [Percona Index Guide](https://www.percona.com/blog/a-practical-guide-to-postgresql-indexes/), [Sachith Indexing Playbook 2026](https://www.sachith.co.uk/postgresql-indexing-playbook-practical-guide-feb-12-2026/), [MyDBOps Tuning 2025](https://www.mydbops.com/blog/postgresql-parameter-tuning-best-practices), [AWS JSONB Patterns](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/), [Bytebase Flyway vs Liquibase 2026](https://www.bytebase.com/blog/flyway-vs-liquibase/), [Permit.io RLS Guide](https://www.permit.io/blog/postgres-rls-implementation-guide), [Bytebase RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/), [CYBERTEC Autovacuum](https://www.cybertec-postgresql.com/en/tuning-autovacuum-postgresql/), [pgTAP](https://pgtap.org/), [Brandur Notifier Pattern](https://brandur.org/notifier), [OneUpTime PG Tuning 2026](https://oneuptime.com/blog/post/2026-02-20-postgresql-performance-tuning/view), [SQLFlash Managed PG 2026](https://sqlflash.ai/article/20260114_aws-azure-gcp-supabase-postgresql-2026/), [EDB Security Hardening](https://www.enterprisedb.com/blog/how-to-secure-postgresql-security-hardening-best-practices-checklist-tips-encryption-authentication-vulnerabilities)*
