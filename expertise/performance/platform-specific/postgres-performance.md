# PostgreSQL Performance Expertise Module

> Comprehensive guide to PostgreSQL performance tuning, covering configuration,
> indexing, query optimization, connection pooling, vacuum management, partitioning,
> monitoring, and anti-pattern avoidance. Every recommendation is backed by numbers
> from real benchmarks and production experience.

---

## Table of Contents

1. [Configuration Tuning](#1-configuration-tuning)
2. [Index Strategies](#2-index-strategies)
3. [Query Optimization with EXPLAIN](#3-query-optimization-with-explain)
4. [Connection Pooling](#4-connection-pooling)
5. [VACUUM and Autovacuum Tuning](#5-vacuum-and-autovacuum-tuning)
6. [Table Partitioning Strategies](#6-table-partitioning-strategies)
7. [Common Bottlenecks](#7-common-bottlenecks)
8. [Anti-Patterns](#8-anti-patterns)
9. [Monitoring with pg_stat_statements and pg_stat_user_tables](#9-monitoring)
10. [Before/After Query Examples](#10-beforeafter-query-examples)
11. [Quick Reference Checklist](#11-quick-reference-checklist)
12. [Sources](#12-sources)

---

## 1. Configuration Tuning

PostgreSQL ships with conservative defaults designed to run on minimal hardware. Production
deployments require tuning to match available resources. The parameters below have the
highest impact on throughput and latency.

### 1.1 shared_buffers

**What it does:** Controls the amount of memory PostgreSQL dedicates to caching data pages
in its own buffer pool, separate from the OS page cache.

**Recommended values:**

| System RAM | shared_buffers | Notes |
|------------|---------------|-------|
| 4 GB       | 1 GB (25%)    | Minimum production server |
| 16 GB      | 4-5 GB (25-33%) | Standard web application |
| 64 GB      | 16-20 GB (25-33%) | Medium OLTP workload |
| 256 GB     | 64-80 GB (25-33%) | Large analytics/OLTP |

- The general guideline is 25-33% of total system RAM. Setting it higher than 40% rarely
  helps because PostgreSQL also relies on the OS page cache for double-buffering.
- Increasing shared_buffers requires a corresponding increase in max_wal_size to spread
  checkpoint writes over a longer period, avoiding I/O spikes.
- Requires a server restart to change.

```
# postgresql.conf - 64 GB RAM server
shared_buffers = '16GB'
```

### 1.2 work_mem

**What it does:** Sets the maximum memory each query operation (sort, hash join, hash
aggregate) can use before spilling to temporary disk files. A single complex query can
allocate work_mem multiple times (once per sort/hash node).

**Formula:** `(Total RAM - shared_buffers) / (16 x CPU cores)`

| System RAM | CPU Cores | shared_buffers | work_mem |
|------------|-----------|---------------|----------|
| 16 GB      | 4         | 4 GB          | 192 MB   |
| 64 GB      | 16        | 16 GB         | 187 MB   |
| 256 GB     | 32        | 64 GB         | 375 MB   |

- OLTP workloads: Keep lower (4-64 MB) since many concurrent connections each allocate
  this amount. With 200 connections at 64 MB work_mem, worst case is 12.8 GB consumed
  just by sort buffers.
- OLAP/reporting workloads: Can go higher (256 MB-1 GB) with fewer concurrent queries.
- Monitor temp file usage via `pg_stat_database.temp_bytes` -- if temp files are
  generated frequently, increase work_mem.

```
# OLTP server with 200 max connections
work_mem = '32MB'

# OLAP server with 20 max connections
work_mem = '512MB'
```

### 1.3 effective_cache_size

**What it does:** Tells the query planner how much memory is available for disk caching
across both shared_buffers and the OS page cache. Does not allocate memory; only
influences cost estimates for index scans vs sequential scans.

**Recommended values:**
- Conservative: 50% of total RAM
- Typical: 75% of total RAM (most common production setting)

A 64 GB server should use `effective_cache_size = '48GB'`. Setting this too low causes
the planner to prefer sequential scans over index scans because it assumes data is
unlikely to be cached, artificially inflating the estimated cost of random I/O.

```
# 64 GB RAM server
effective_cache_size = '48GB'
```

### 1.4 random_page_cost

**What it does:** Tells the planner the relative cost of a non-sequential (random) disk
page fetch compared to a sequential one. Default is 4.0 (random I/O is 4x more
expensive than sequential).

**SSD tuning is critical:** On SSDs, random reads are nearly as fast as sequential reads.

| Storage Type | random_page_cost | Rationale |
|-------------|-----------------|-----------|
| HDD (7200 RPM) | 4.0 (default) | Random seeks are ~10ms vs ~0.1ms sequential |
| SSD (SATA)  | 1.5-2.0         | Random latency ~0.1ms, sequential ~0.05ms |
| NVMe SSD    | 1.1-1.5         | Near-uniform access latency |
| RAM disk    | 1.0             | No mechanical seek penalty |

Leaving this at 4.0 on SSD storage causes PostgreSQL to avoid index scans in favor of
sequential scans, often resulting in 10-100x slower queries on large tables.

```
# NVMe SSD storage
random_page_cost = 1.1
seq_page_cost = 1.0
```

### 1.5 WAL and Checkpoint Configuration

| Parameter | Default | Recommended | Why |
|-----------|---------|-------------|-----|
| wal_buffers | 64 KB (auto-tuned) | 16-64 MB | Buffers WAL records before disk flush; 16 MB minimum for write-heavy loads |
| max_wal_size | 1 GB | 2-4 GB | Reduces checkpoint frequency; more WAL between checkpoints |
| min_wal_size | 80 MB | 512 MB-1 GB | Keeps WAL files around to avoid recreation overhead |
| checkpoint_completion_target | 0.9 | 0.9 | Spreads checkpoint I/O over 90% of the interval; reduces spikes |
| checkpoint_timeout | 5 min | 10-15 min | Less frequent checkpoints; reduces write amplification |

```
# Write-heavy OLTP workload
wal_buffers = '64MB'
max_wal_size = '4GB'
min_wal_size = '1GB'
checkpoint_completion_target = 0.9
checkpoint_timeout = '15min'
```

### 1.6 Parallelism Settings

| Parameter | Default | Recommended | Effect |
|-----------|---------|-------------|--------|
| max_parallel_workers_per_gather | 2 | 2-4 | Workers per parallel query node |
| max_parallel_workers | 8 | CPU cores / 2 | Total parallel workers system-wide |
| max_worker_processes | 8 | CPU cores | Total background workers |
| parallel_tuple_cost | 0.1 | 0.01-0.1 | Lower = planner uses parallelism more |
| min_parallel_table_scan_size | 8 MB | 8 MB | Minimum table size for parallel seq scan |

Parallelism is most effective for OLAP queries scanning large tables. For OLTP with many
short queries, keep defaults or reduce parallel workers to avoid contention.

---

## 2. Index Strategies

Indexes are the single most impactful tool for query performance. PostgreSQL supports
seven index types, each optimized for different access patterns.

### 2.1 B-tree Indexes (Default)

**Best for:** Equality (=), range (<, >, BETWEEN), sorting (ORDER BY), and uniqueness.

B-tree is the default and handles ~90% of indexing needs. Supports the operators
`<`, `<=`, `=`, `>=`, `>`, `BETWEEN`, `IN`, `IS NULL`, and `IS NOT NULL`.

```sql
-- Standard B-tree index
CREATE INDEX idx_orders_created_at ON orders (created_at);

-- Multi-column B-tree (leftmost prefix rule applies)
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- This index serves: WHERE user_id = X
--                     WHERE user_id = X AND status = Y
-- But NOT:            WHERE status = Y (alone)
```

**Size impact:** A B-tree index on a 100M row table with an integer column is typically
200-400 MB. On a UUID column, expect 2-4 GB.

### 2.2 GIN Indexes (Generalized Inverted Index)

**Best for:** JSONB containment (@>), array overlap (&&), full-text search (@@),
trigram similarity (%).

GIN creates an entry for each element within a composite value, making lookups
extremely fast for "contains" queries. Write overhead is 3-10x higher than B-tree
because each INSERT may generate multiple index entries.

```sql
-- JSONB containment queries
CREATE INDEX idx_events_data ON events USING gin (data);
-- Enables: WHERE data @> '{"type": "purchase"}'

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING gin (to_tsvector('english', body));
-- Enables: WHERE to_tsvector('english', body) @@ to_tsquery('postgresql & performance')

-- Trigram pattern matching (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
-- Enables: WHERE name LIKE '%john%'  (leading wildcard!)
-- Enables: WHERE name ILIKE '%john%'
```

**Performance note:** GIN indexes are 3-5x slower to build than B-tree but provide
sub-millisecond lookups for containment queries that would otherwise require full
table scans.

### 2.3 GiST Indexes (Generalized Search Tree)

**Best for:** Geometric data, range types, nearest-neighbor searches, full-text search
(alternative to GIN with faster updates but slower reads).

```sql
-- Geometric proximity queries
CREATE INDEX idx_locations_point ON locations USING gist (coordinates);
-- Enables: WHERE coordinates <-> point(40.7128, -74.0060) < 0.01

-- Range overlap queries
CREATE INDEX idx_reservations_period ON reservations USING gist (
    tsrange(check_in, check_out)
);
-- Enables: WHERE tsrange(check_in, check_out) && tsrange('2025-01-01', '2025-01-07')
```

**GiST vs GIN for full-text search:** GIN is 2-3x faster for reads but 3x slower for
updates. Use GIN for read-heavy workloads; GiST for write-heavy ones.

### 2.4 BRIN Indexes (Block Range Indexes)

**Best for:** Very large tables (100M+ rows) where data is physically ordered by the
indexed column. Common for time-series, append-only logs, and IoT data.

BRIN stores min/max summaries per block range (default 128 pages = 1 MB) instead of
indexing every row. This makes BRIN indexes 100-1000x smaller than equivalent B-tree
indexes.

```sql
-- Time-series data (rows inserted in chronological order)
CREATE INDEX idx_sensor_readings_ts ON sensor_readings USING brin (recorded_at);
-- Size: ~100 KB for a 10 GB table (vs ~200 MB for B-tree)
```

| Metric | B-tree (10 GB table) | BRIN (10 GB table) |
|--------|---------------------|-------------------|
| Index size | ~200 MB | ~100 KB |
| Build time | ~60 seconds | ~2 seconds |
| Point query speed | <1 ms | 5-50 ms |
| Range scan speed | <10 ms | 10-100 ms |

**Caveat:** BRIN is only effective when physical row order correlates with the indexed
column. Run `SELECT correlation FROM pg_stats WHERE tablename = 'your_table'` -- a
correlation near 1.0 or -1.0 indicates BRIN suitability.

### 2.5 Partial Indexes

**What:** Indexes that cover only a subset of rows, defined by a WHERE clause. Smaller,
faster to maintain, and more cache-friendly than full indexes.

```sql
-- Only index active users (5% of 10M rows = 500K entries)
CREATE INDEX idx_users_active_email ON users (email)
    WHERE is_active = true;
-- Size: ~20 MB instead of ~400 MB for a full index

-- Only index unprocessed orders
CREATE INDEX idx_orders_pending ON orders (created_at)
    WHERE status = 'pending';
-- If 2% of orders are pending, this index is 50x smaller than a full index
```

**Query must match the partial index predicate** for the planner to use it:

```sql
-- Uses the partial index:
SELECT * FROM users WHERE email = 'x@y.com' AND is_active = true;

-- Does NOT use the partial index:
SELECT * FROM users WHERE email = 'x@y.com';
```

### 2.6 Covering Indexes (INCLUDE)

**What:** B-tree indexes that store additional columns in the leaf pages, enabling
index-only scans without touching the heap (table data).

```sql
-- Covering index: the query never needs to read the table
CREATE INDEX idx_orders_user_covering ON orders (user_id)
    INCLUDE (total_amount, status);

-- This query becomes an index-only scan:
SELECT total_amount, status FROM orders WHERE user_id = 42;
```

Index-only scans avoid heap fetches entirely, which can improve performance by 2-10x
for queries that only need the included columns. The visibility map must be up to date
(run VACUUM) for index-only scans to be effective.

### 2.7 Expression Indexes

**What:** Indexes on the result of an expression or function, not just raw column values.

```sql
-- Case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users (lower(email));
-- Enables: WHERE lower(email) = 'user@example.com'

-- Extract year from timestamp
CREATE INDEX idx_orders_year ON orders (extract(year FROM created_at));
-- Enables: WHERE extract(year FROM created_at) = 2025

-- JSONB field extraction
CREATE INDEX idx_events_type ON events ((data->>'type'));
-- Enables: WHERE data->>'type' = 'click'
```

**The query must use the exact same expression** as the index definition for the planner
to recognize it.

---

## 3. Query Optimization with EXPLAIN

EXPLAIN is the most important diagnostic tool in PostgreSQL. Always use it with ANALYZE
and BUFFERS to get actual execution statistics.

### 3.1 EXPLAIN Variants

```sql
-- Basic: shows the planner's estimated plan (no execution)
EXPLAIN SELECT ...;

-- With execution: runs the query and shows actual times
EXPLAIN ANALYZE SELECT ...;

-- With buffer statistics: shows cache hits vs disk reads
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Machine-readable format for tooling
EXPLAIN (ANALYZE, BUFFERS, FORMAT YAML) SELECT ...;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;

-- PostgreSQL 18+: ANALYZE automatically includes BUFFERS
EXPLAIN ANALYZE SELECT ...;  -- includes buffer stats in PG 18+
```

### 3.2 Reading EXPLAIN Output

Key fields to examine:

| Field | Meaning | Warning Sign |
|-------|---------|-------------|
| `Seq Scan` | Full table scan | On tables > 10K rows with a WHERE clause |
| `actual time=X..Y` | Startup..total time in ms | Total > 100ms for OLTP |
| `rows=N` | Actual rows returned by node | Large mismatch with `rows` estimate |
| `Buffers: shared hit=X` | Pages read from shared_buffers | Good: high hit ratio |
| `Buffers: shared read=Y` | Pages read from disk | Bad if Y >> X |
| `Buffers: temp read/written` | Spilled to disk temp files | work_mem too low |
| `Sort Method: external merge` | Sort spilled to disk | Increase work_mem |
| `Hash Batch` | Hash join spilled to disk | Increase work_mem |

### 3.3 Planner Estimate Mismatches

When the planner's estimated rows differ from actual rows by 10x or more, the chosen
plan is likely suboptimal. Common causes:

1. **Stale statistics** -- Run `ANALYZE tablename` to refresh.
2. **Correlated columns** -- The planner assumes column independence. Use extended
   statistics: `CREATE STATISTICS stat_name (dependencies) ON col1, col2 FROM table;`
3. **Skewed data** -- Default histogram has 100 buckets. Increase with
   `ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000;`

### 3.4 Common Plan Node Improvements

| Slow Node | Likely Fix | Expected Improvement |
|-----------|-----------|---------------------|
| Seq Scan on large table | Add appropriate index | 10-1000x |
| Nested Loop with inner Seq Scan | Add index on join column | 100-10000x |
| Sort (external merge Disk) | Increase work_mem | 2-5x |
| Hash Join (multiple batches) | Increase work_mem | 2-5x |
| Bitmap Heap Scan (lossy) | Increase work_mem | 1.5-3x |
| Index Scan with Filter (many rows filtered) | Use partial or covering index | 2-10x |

---

## 4. Connection Pooling

PostgreSQL uses a process-per-connection model. Each connection forks a backend process
consuming ~10 MB of memory minimum. Beyond 200 active connections, performance degrades
sharply due to OS context switching, lock contention, and cache thrashing.

### 4.1 The Connection Problem

**Optimal active connections:** `(CPU cores * 2) + effective_spindle_count`

For a 16-core server with SSDs, the optimal number is approximately 33-40 active
connections. Having 500 connections with 40 active at any time means 460 idle connections
each consuming memory and causing context-switching overhead.

**Measured impact of idle connections:**
- 50 idle connections: ~1-2% throughput loss
- 200 idle connections: ~10-15% throughput loss
- 500 idle connections: ~25-35% throughput loss
- 1000+ idle connections: throughput can drop by 50%+ due to process table pressure

### 4.2 PgBouncer

The most widely deployed PostgreSQL connection pooler. Single-threaded, lightweight
(~2 KB per connection), and battle-tested.

**Pooling modes:**

| Mode | Description | Use Case |
|------|-------------|----------|
| Session | Client holds a server connection for its entire session | Legacy apps needing session state |
| Transaction | Client gets a server connection only during a transaction | Most web applications (recommended) |
| Statement | Client gets a connection per statement | Simple read-only queries only |

**Benchmark results (pgbench, 16-core server):**

| Metric | Direct PG (200 conn) | PgBouncer Transaction (200 conn, 40 pool) |
|--------|---------------------|------------------------------------------|
| TPS | ~8,000 | ~50,000 |
| Avg latency | 25 ms | 4 ms |
| p99 latency | 180 ms | 15 ms |
| Memory usage | 2 GB (backends) | 400 MB |

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 40
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 300
```

**Limitation:** Single-threaded. At very high concurrency (>5000 connections), the single
event loop becomes a bottleneck. PgBouncer peaks at ~44,000 TPS and degrades to
25,000-30,000 TPS beyond 75 concurrent active connections in benchmarks.

### 4.3 PgCat

Multi-threaded Rust-based pooler developed by PostgresML/Supabase. Scales better under
high concurrency.

**Benchmark comparison with PgBouncer (1000 concurrent clients):**

| Metric | PgBouncer | PgCat |
|--------|-----------|-------|
| Peak TPS | 44,096 | 59,000 |
| Latency at 100 clients | Lower by ~50us | Slightly higher |
| Latency at 500 clients | Higher | Lower |
| CPU usage | Single core maxed | Distributed across cores |
| Features | Mature, stable | Query routing, load balancing, sharding |

**When to choose PgCat over PgBouncer:**
- More than 5000 client connections
- Need for query routing across read replicas
- Need for built-in load balancing
- Multi-tenant architectures requiring query-level routing

### 4.4 Application-Level Pooling

Most application frameworks provide connection pools that sit between the application
and PgBouncer/PostgreSQL:

- **HikariCP (Java):** Set `maximumPoolSize` to CPU cores * 2. Default idle timeout
  of 600 seconds works well.
- **SQLAlchemy (Python):** `pool_size=20, max_overflow=10, pool_pre_ping=True`
- **node-postgres (Node.js):** `max: 20, idleTimeoutMillis: 30000`

Layer pooling: Application pool (20-50) -> PgBouncer (40-100 server connections) ->
PostgreSQL (max_connections = 150).

---

## 5. VACUUM and Autovacuum Tuning

PostgreSQL's MVCC implementation creates dead tuples on every UPDATE and DELETE. Without
VACUUM, tables and indexes bloat, causing sequential scans to read increasingly more
dead data.

### 5.1 How MVCC Creates Bloat

1. An UPDATE creates a new tuple version; the old one is marked dead.
2. A DELETE marks the existing tuple as dead.
3. Dead tuples remain until VACUUM removes them.
4. Dead tuples are only removable when no active transaction can see them.

**Impact of bloat:** A table with 50% dead tuples requires 2x the I/O for sequential
scans, 2x the buffer cache, and 2x the backup storage.

### 5.2 Autovacuum Default Behavior

Autovacuum triggers when:
`dead_tuples > autovacuum_vacuum_threshold + (autovacuum_vacuum_scale_factor * table_rows)`

Default: `50 + (0.20 * table_rows)` -- VACUUM starts when 20% of rows are dead.

**Problem for large tables:** A 100M row table won't be vacuumed until 20,000,050 dead
tuples accumulate. This is far too late -- the table will be severely bloated.

### 5.3 Recommended Autovacuum Settings

**Global settings (postgresql.conf):**

```
# Reduce scale factor so VACUUM triggers sooner
autovacuum_vacuum_scale_factor = 0.05       # 5% instead of 20%
autovacuum_analyze_scale_factor = 0.02      # 2% instead of 10%

# Make VACUUM faster by increasing I/O budget
autovacuum_vacuum_cost_limit = 1000         # default: 200
autovacuum_vacuum_cost_delay = 2ms          # default: 2ms (PG 12+)

# Allow more concurrent autovacuum workers
autovacuum_max_workers = 5                  # default: 3

# Run more frequently
autovacuum_naptime = 15s                    # default: 1min
```

**Per-table overrides for high-churn tables:**

```sql
-- Orders table: 50M rows, 100K updates/hour
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,       -- 1% = 500K dead tuples
    autovacuum_vacuum_threshold = 1000,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_limit = 2000
);

-- Sessions table: 10M rows, constant insert/delete
ALTER TABLE sessions SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_threshold = 500,
    autovacuum_vacuum_cost_limit = 3000
);
```

### 5.4 Monitoring VACUUM Health

```sql
-- Check dead tuple counts and last vacuum time per table
SELECT
    schemaname, relname,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Check for long-running transactions blocking VACUUM
SELECT pid, age(backend_xid) AS xid_age,
       now() - xact_start AS duration,
       query
FROM pg_stat_activity
WHERE backend_xid IS NOT NULL
ORDER BY age(backend_xid) DESC
LIMIT 5;
```

### 5.5 The Long-Running Transaction Trap

Autovacuum cannot reclaim dead tuples that are still visible to any open transaction.
A single forgotten `BEGIN` without a `COMMIT` can hold back VACUUM across the entire
database, causing unbounded bloat.

**Prevention:**
- Set `idle_in_transaction_session_timeout = '5min'` to kill abandoned transactions
- Set `statement_timeout = '30s'` for web applications
- Monitor `pg_stat_activity` for long-running `idle in transaction` sessions

### 5.6 Visibility Map and Index-Only Scans

VACUUM maintains a visibility map that tracks which heap pages contain only tuples
visible to all transactions. This enables:

1. **Index-only scans:** If a page is marked "all-visible," the executor skips the heap
   fetch, reading only from the index. This can improve query performance by 2-10x.
2. **Faster future VACUUMs:** Pages already marked all-visible are skipped, making
   subsequent VACUUM runs much faster on stable data.

---

## 6. Table Partitioning Strategies

Partitioning splits a large logical table into smaller physical tables. PostgreSQL 10+
supports declarative partitioning with range, list, and hash strategies.

### 6.1 When to Partition

Partition when:
- Table exceeds 50-100 GB or 100M+ rows
- Queries naturally filter on the partition key (date ranges, tenant IDs)
- Maintenance operations (VACUUM, REINDEX) on the full table are too slow
- Data lifecycle requires dropping old data (detach partition vs DELETE)

Do NOT partition when:
- Table is under 10 GB and queries are well-indexed
- Queries do not include the partition key in WHERE clauses
- You would create more than 1000 partitions (planner overhead)
- Individual partitions would have fewer than 10,000 rows

### 6.2 Range Partitioning (Time-Series)

The most common strategy. Partitions by continuous intervals, typically dates.

```sql
CREATE TABLE events (
    id          bigint GENERATED ALWAYS AS IDENTITY,
    event_type  text NOT NULL,
    payload     jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE events_2025_02 PARTITION OF events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... additional months

-- Indexes are defined on the parent; PostgreSQL creates them on each partition
CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_created ON events (created_at);
```

**Performance benefit:** A query with `WHERE created_at BETWEEN '2025-01-15' AND
'2025-01-20'` only scans the January partition, skipping all others (partition pruning).
On a table with 24 monthly partitions, this means scanning ~4% of the data.

### 6.3 List Partitioning (Categorical)

Partitions by discrete values. Common for multi-tenant or status-based partitioning.

```sql
CREATE TABLE orders (
    id          bigint GENERATED ALWAYS AS IDENTITY,
    tenant_id   int NOT NULL,
    total       numeric(12,2),
    created_at  timestamptz NOT NULL
) PARTITION BY LIST (tenant_id);

CREATE TABLE orders_tenant_1 PARTITION OF orders FOR VALUES IN (1);
CREATE TABLE orders_tenant_2 PARTITION OF orders FOR VALUES IN (2);
CREATE TABLE orders_tenant_3 PARTITION OF orders FOR VALUES IN (3);
-- Default partition for new tenants
CREATE TABLE orders_default PARTITION OF orders DEFAULT;
```

### 6.4 Hash Partitioning (Uniform Distribution)

Distributes rows evenly across a fixed number of partitions using a hash function.
Best for uniform access patterns without natural range boundaries.

```sql
CREATE TABLE user_activities (
    id          bigint GENERATED ALWAYS AS IDENTITY,
    user_id     bigint NOT NULL,
    action      text,
    created_at  timestamptz NOT NULL
) PARTITION BY HASH (user_id);

CREATE TABLE user_activities_0 PARTITION OF user_activities
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE user_activities_1 PARTITION OF user_activities
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... partitions 2-7
```

### 6.5 Partition Maintenance

```sql
-- Drop old data by detaching and dropping the partition (instant vs DELETE)
ALTER TABLE events DETACH PARTITION events_2023_01;
DROP TABLE events_2023_01;  -- instant; no VACUUM needed

-- Add future partitions (automate with pg_partman or cron)
CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- VACUUM/ANALYZE individual partitions independently
VACUUM ANALYZE events_2025_01;
```

**Guidelines:** Keep 50-200 partitions maximum. Each partition should hold at least
10,000-100,000 rows. The planner must evaluate all partitions during planning, so
excessive partitions add planning overhead (~0.5-1 ms per 100 partitions).

---

## 7. Common Bottlenecks

### 7.1 Sequential Scans on Large Tables

**Symptom:** `Seq Scan on large_table` in EXPLAIN with `rows=50000000`.

**Cause:** Missing index, or planner chooses sequential scan because:
- `random_page_cost` is too high for your storage (SSD but set to 4.0)
- `effective_cache_size` is too low (planner assumes cache misses)
- Table statistics are stale (run ANALYZE)

**Fix:** Add an appropriate index. If the index exists but isn't used, check the above
configuration parameters.

```sql
-- Detect tables with high sequential scan counts
SELECT schemaname, relname,
       seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch,
       CASE WHEN seq_scan > 0
            THEN round(seq_tup_read::numeric / seq_scan)
            ELSE 0 END AS avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND seq_tup_read > 100000
ORDER BY seq_tup_read DESC
LIMIT 20;
```

### 7.2 Missing Indexes

**Symptom:** Queries with WHERE clauses on non-indexed columns show sequential scans.

```sql
-- Find tables that might benefit from indexes
-- High seq_scan count + low or zero idx_scan = likely missing index
SELECT relname, seq_scan, idx_scan,
       seq_tup_read, idx_tup_fetch,
       n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
  AND n_live_tup > 10000
ORDER BY seq_tup_read DESC;
```

### 7.3 Bloated Tables and Indexes

**Symptom:** Table size much larger than expected for row count. Slow sequential scans
even with appropriate WHERE clauses.

```sql
-- Estimate table bloat using pgstattuple extension
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('orders');
-- Look at dead_tuple_percent; > 20% indicates significant bloat

-- Estimate index bloat
SELECT * FROM pgstatindex('idx_orders_user_id');
-- Look at avg_leaf_density; < 50% indicates index bloat needing REINDEX
```

**Fix:**
- For moderate bloat: Let autovacuum catch up (tune settings per Section 5)
- For severe bloat: `VACUUM FULL tablename` (takes an exclusive lock) or use
  `pg_repack` for online table compaction without locking

### 7.4 Lock Contention

**Symptom:** Queries blocked waiting for locks. Throughput drops. `wait_event_type =
'Lock'` in pg_stat_activity.

PostgreSQL uses 16 fast-path lock slots per backend. When these are exhausted, the
system falls back to the shared lock table, and throughput can drop by up to 34%.

```sql
-- Find blocked queries
SELECT blocked.pid AS blocked_pid,
       blocked.query AS blocked_query,
       blocking.pid AS blocking_pid,
       blocking.query AS blocking_query,
       now() - blocked.query_start AS blocked_duration
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid
JOIN pg_locks kl ON kl.locktype = bl.locktype
    AND kl.database IS NOT DISTINCT FROM bl.database
    AND kl.relation IS NOT DISTINCT FROM bl.relation
    AND kl.page IS NOT DISTINCT FROM bl.page
    AND kl.tuple IS NOT DISTINCT FROM bl.tuple
    AND kl.transactionid IS NOT DISTINCT FROM bl.transactionid
    AND kl.pid != bl.pid
    AND kl.granted
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
WHERE NOT bl.granted;
```

**Prevention:**
- Keep transactions short (< 100ms for OLTP)
- Avoid long-running DDL during peak hours
- Use `CONCURRENTLY` for index creation: `CREATE INDEX CONCURRENTLY ...`
- Lock timeout: `SET lock_timeout = '5s';`

### 7.5 Connection Exhaustion

**Symptom:** `FATAL: too many connections for role "..."` or `FATAL: sorry, too many
clients already`.

Each PostgreSQL backend process consumes ~10 MB minimum. 500 connections = 5 GB of
memory just for backend processes, before any query execution memory.

**Fix:** Deploy PgBouncer in transaction pooling mode (see Section 4). Set
`max_connections` to a reasonable ceiling (100-200 for most workloads) and let the
pooler handle thousands of application connections.

---

## 8. Anti-Patterns

### 8.1 Over-Indexing

**Problem:** Every index on a table must be updated on each INSERT, UPDATE, and DELETE.
Five indexes on a table means 5 additional write operations per row modification.

**Measured impact:**

| Indexes on table | INSERT throughput (relative) | Storage overhead |
|-----------------|---------------------------|-----------------|
| 0 | 1.0x (baseline) | 0% |
| 1 | 0.85x | +15-25% |
| 3 | 0.65x | +40-60% |
| 5 | 0.50x | +70-100% |
| 10 | 0.30x | +150-200% |

**Detection:**

```sql
-- Find unused indexes (candidates for removal)
SELECT schemaname, relname, indexrelname,
       idx_scan, idx_tup_read, idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find duplicate/redundant indexes
SELECT a.indexrelid::regclass AS index_a,
       b.indexrelid::regclass AS index_b,
       pg_size_pretty(pg_relation_size(a.indexrelid)) AS size_a,
       pg_size_pretty(pg_relation_size(b.indexrelid)) AS size_b
FROM pg_index a
JOIN pg_index b ON a.indrelid = b.indrelid
    AND a.indexrelid != b.indexrelid
    AND a.indkey::text LIKE b.indkey::text || '%'
WHERE a.indisvalid AND b.indisvalid;
```

**Rule of thumb:** Audit indexes monthly. Remove any index with 0 scans over 30+ days
(after confirming it isn't needed for unique constraints or infrequent batch jobs).

### 8.2 SELECT *

**Problem:** Fetches all columns, preventing index-only scans and transferring unnecessary
data over the network.

```sql
-- Anti-pattern: fetches all 30 columns when only 3 are needed
SELECT * FROM orders WHERE user_id = 42;

-- Correct: enables index-only scan if covering index exists
SELECT id, total_amount, status FROM orders WHERE user_id = 42;
```

**Impact:** On a table with 30 columns averaging 200 bytes per row, `SELECT *` transfers
6 KB per row. Selecting 3 columns transfers ~60 bytes per row -- a 100x reduction in
network I/O for large result sets.

### 8.3 LIKE '%pattern%' Without Trigram Index

**Problem:** Leading wildcard patterns (`LIKE '%pattern%'`) cannot use standard B-tree
indexes, forcing a sequential scan on every row.

```sql
-- Anti-pattern: always a Seq Scan without pg_trgm
SELECT * FROM products WHERE name LIKE '%wireless%';
-- Seq Scan on products: 12,000 ms on 5M rows

-- Solution: GIN trigram index
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
-- Now: Bitmap Index Scan: 3 ms on 5M rows
```

### 8.4 NOT IN vs NOT EXISTS

**Problem:** `NOT IN` has dangerous NULL semantics and often produces worse query plans.

```sql
-- Anti-pattern: NOT IN with a subquery
-- If ANY row in excluded_ids has a NULL value, the entire NOT IN returns
-- no rows (three-valued logic). Also produces a hashed SubPlan.
SELECT * FROM orders
WHERE user_id NOT IN (SELECT user_id FROM blocked_users);

-- Correct: NOT EXISTS handles NULLs correctly and often uses Anti Join
SELECT * FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM blocked_users b WHERE b.user_id = o.user_id
);
```

**Performance difference:** On tables with 1M orders and 10K blocked_users, NOT EXISTS
with an indexed join column runs in ~50ms. NOT IN can take 500ms-5s depending on the
subquery size because the planner may materialize and hash the entire subquery result.

### 8.5 Missing LIMIT on Exploratory Queries

```sql
-- Anti-pattern: fetches and transfers all 50M rows to the client
SELECT * FROM events WHERE event_type = 'page_view';

-- Correct: limit to needed rows
SELECT id, created_at FROM events
WHERE event_type = 'page_view'
ORDER BY created_at DESC
LIMIT 100;
```

### 8.6 Implicit Type Casting in WHERE Clauses

```sql
-- Anti-pattern: index on user_id (integer) is not used because of text comparison
SELECT * FROM orders WHERE user_id = '42';  -- implicit cast; may skip index

-- Correct: match the column type
SELECT * FROM orders WHERE user_id = 42;
```

### 8.7 Using OFFSET for Pagination on Large Tables

```sql
-- Anti-pattern: OFFSET 1000000 still scans and discards 1M rows
SELECT * FROM events ORDER BY id LIMIT 20 OFFSET 1000000;
-- Execution time grows linearly with OFFSET value

-- Correct: keyset/cursor pagination
SELECT * FROM events
WHERE id > 1000000  -- last seen id
ORDER BY id
LIMIT 20;
-- Constant execution time regardless of page depth
```

---

## 9. Monitoring

### 9.1 pg_stat_statements

The single most important extension for query performance monitoring. It normalizes
queries by replacing literal values with `$1`, `$2`, etc., and tracks cumulative
execution statistics.

**Setup:**

```sql
-- Add to postgresql.conf
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.track = all

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Top queries by total execution time:**

```sql
SELECT
    substring(query, 1, 80) AS short_query,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    round((100.0 * total_exec_time / sum(total_exec_time) OVER ()), 2) AS pct_total,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

**Key insight:** A moderately slow query (50ms) called 10,000 times per hour (total:
500 seconds/hour) is a higher priority to optimize than a slow query (5s) called twice
per day (total: 10 seconds/day). Always prioritize by `total_exec_time`, not `mean_exec_time`.

**Queries with the most I/O:**

```sql
SELECT
    substring(query, 1, 80) AS short_query,
    calls,
    shared_blks_hit,
    shared_blks_read,
    round(100.0 * shared_blks_hit /
        NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct,
    temp_blks_read + temp_blks_written AS temp_blks
FROM pg_stat_statements
WHERE shared_blks_read > 1000
ORDER BY shared_blks_read DESC
LIMIT 20;
```

**Target:** Cache hit ratio above 99% for OLTP workloads. Below 95% indicates
shared_buffers may be too small or the working set has grown beyond available memory.

### 9.2 pg_stat_user_tables

Provides aggregate I/O and maintenance statistics per table.

```sql
SELECT
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

**What to look for:**
- `seq_scan` >> `idx_scan`: Missing indexes on frequently queried tables
- `dead_pct` > 10%: Autovacuum cannot keep up; tune per-table settings
- `last_autovacuum` is NULL or very old: Autovacuum may not be running

### 9.3 pg_stat_user_indexes

```sql
-- Index usage statistics: find unused indexes
SELECT
    schemaname || '.' || relname AS table,
    indexrelname AS index,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan < 10
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### 9.4 Real-Time Activity Monitoring

```sql
-- Active queries right now
SELECT pid, now() - query_start AS duration,
       state, wait_event_type, wait_event,
       substring(query, 1, 100) AS query
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY duration DESC;

-- Overall cache hit ratio
SELECT
    sum(blks_hit) AS cache_hits,
    sum(blks_read) AS disk_reads,
    round(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2)
        AS cache_hit_ratio
FROM pg_stat_database;
```

---

## 10. Before/After Query Examples

### Example 1: Missing Index on Foreign Key

**Before (Seq Scan, 2.3 seconds):**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, o.created_at
FROM orders o
WHERE o.user_id = 12345;
```

```
Seq Scan on orders  (cost=0.00..458932.00 rows=42 width=28)
                    (actual time=1847.234..2291.561 rows=38 loops=1)
  Filter: (user_id = 12345)
  Rows Removed by Filter: 9999962
  Buffers: shared hit=12034 read=196498
Planning Time: 0.089 ms
Execution Time: 2291.612 ms
```

**After (Index Scan, 0.1 ms):**

```sql
CREATE INDEX idx_orders_user_id ON orders (user_id);

EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, o.created_at
FROM orders o
WHERE o.user_id = 12345;
```

```
Index Scan using idx_orders_user_id on orders
    (cost=0.43..164.50 rows=42 width=28)
    (actual time=0.031..0.089 rows=38 loops=1)
  Index Cond: (user_id = 12345)
  Buffers: shared hit=42
Planning Time: 0.104 ms
Execution Time: 0.112 ms
```

**Improvement:** 2291ms to 0.1ms (20,000x faster). Buffer reads dropped from 208,532
to 42 (4,960x less I/O).

### Example 2: Covering Index Enabling Index-Only Scan

**Before (Index Scan + Heap Fetch, 45 ms):**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT status, total_amount
FROM orders
WHERE user_id = 42;
```

```
Index Scan using idx_orders_user_id on orders
    (cost=0.43..1250.33 rows=310 width=18)
    (actual time=0.028..44.912 rows=305 loops=1)
  Index Cond: (user_id = 42)
  Buffers: shared hit=285 read=127
Planning Time: 0.095 ms
Execution Time: 45.001 ms
```

**After (Index-Only Scan, 0.3 ms):**

```sql
CREATE INDEX idx_orders_user_covering ON orders (user_id)
    INCLUDE (status, total_amount);
VACUUM orders;  -- update visibility map

EXPLAIN (ANALYZE, BUFFERS)
SELECT status, total_amount
FROM orders
WHERE user_id = 42;
```

```
Index Only Scan using idx_orders_user_covering on orders
    (cost=0.43..12.80 rows=310 width=18)
    (actual time=0.024..0.298 rows=305 loops=1)
  Index Cond: (user_id = 42)
  Heap Fetches: 0
  Buffers: shared hit=5
Planning Time: 0.088 ms
Execution Time: 0.341 ms
```

**Improvement:** 45ms to 0.3ms (150x faster). Buffer accesses dropped from 412 to 5
(82x less I/O). Zero heap fetches because all data comes from the index.

### Example 3: Trigram Index for LIKE '%pattern%'

**Before (Seq Scan, 8.4 seconds):**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, email
FROM customers
WHERE name ILIKE '%garcia%';
```

```
Seq Scan on customers  (cost=0.00..385421.00 rows=523 width=68)
                       (actual time=234.112..8412.445 rows=487 loops=1)
  Filter: (name ~~* '%garcia%')
  Rows Removed by Filter: 4999513
  Buffers: shared hit=8432 read=148221
Planning Time: 0.067 ms
Execution Time: 8412.534 ms
```

**After (Bitmap Index Scan, 2.8 ms):**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, email
FROM customers
WHERE name ILIKE '%garcia%';
```

```
Bitmap Heap Scan on customers  (cost=52.08..2104.33 rows=523 width=68)
                               (actual time=1.245..2.801 rows=487 loops=1)
  Recheck Cond: (name ~~* '%garcia%')
  Rows Removed by Index Recheck: 12
  Heap Blocks: exact=478
  Buffers: shared hit=492
  ->  Bitmap Index Scan on idx_customers_name_trgm
        (cost=0.00..51.95 rows=523 width=0)
        (actual time=1.102..1.103 rows=499 loops=1)
        Buffers: shared hit=14
Planning Time: 0.234 ms
Execution Time: 2.856 ms
```

**Improvement:** 8412ms to 2.8ms (3,000x faster). Buffer accesses dropped from 156,653
to 492 (318x less I/O).

### Example 4: Partition Pruning on Time-Series Table

**Before (Scan all data, 3.2 seconds):**

```sql
-- Unpartitioned 500M row table
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*), event_type
FROM events
WHERE created_at BETWEEN '2025-01-15' AND '2025-01-20'
GROUP BY event_type;
```

```
HashAggregate  (cost=12458932.00..12458942.00 rows=10 width=40)
               (actual time=3201.445..3201.501 rows=8 loops=1)
  Group Key: event_type
  Buffers: shared hit=45023 read=1245889
  ->  Seq Scan on events  (cost=0.00..12358932.00 rows=20000000 width=32)
                           (actual time=0.045..2845.112 rows=2741823 loops=1)
        Filter: (created_at >= '...' AND created_at <= '...')
        Rows Removed by Filter: 497258177
        Buffers: shared hit=45023 read=1245889
Planning Time: 0.112 ms
Execution Time: 3201.589 ms
```

**After (Partition pruning, 285 ms):**

```sql
-- Same query on partitioned table (monthly partitions)
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*), event_type
FROM events
WHERE created_at BETWEEN '2025-01-15' AND '2025-01-20'
GROUP BY event_type;
```

```
HashAggregate  (cost=548932.00..548942.00 rows=10 width=40)
               (actual time=285.112..285.168 rows=8 loops=1)
  Group Key: event_type
  Buffers: shared hit=42018 read=52344
  ->  Append  (cost=0.43..498932.00 rows=2741823 width=32)
              (actual time=0.034..198.445 rows=2741823 loops=1)
        Subplans Removed: 23   <-- 23 of 24 partitions pruned!
        ->  Index Scan using events_2025_01_created_at_idx on events_2025_01
              (cost=0.43..498932.00 rows=2741823 width=32)
              (actual time=0.033..198.401 rows=2741823 loops=1)
              Index Cond: (created_at >= '...' AND created_at <= '...')
              Buffers: shared hit=42018 read=52344
Planning Time: 1.245 ms
Execution Time: 285.234 ms
```

**Improvement:** 3201ms to 285ms (11x faster). The planner pruned 23 of 24 partitions,
scanning only January data. Buffer reads dropped from 1,290,912 to 94,362 (13x less I/O).

---

## 11. Quick Reference Checklist

### Initial Setup (Day 1)

- [ ] Set `shared_buffers` to 25-33% of RAM
- [ ] Set `effective_cache_size` to 75% of RAM
- [ ] Set `work_mem` using formula: `(RAM - shared_buffers) / (16 * CPU cores)`
- [ ] Set `random_page_cost` to 1.1 for NVMe, 1.5 for SSD, 4.0 for HDD
- [ ] Set `max_wal_size` to 2-4 GB
- [ ] Set `checkpoint_completion_target` to 0.9
- [ ] Enable `pg_stat_statements` in shared_preload_libraries
- [ ] Deploy PgBouncer in transaction pooling mode
- [ ] Set `idle_in_transaction_session_timeout` to 5 minutes

### Weekly Audit

- [ ] Review top 20 queries by total_exec_time in pg_stat_statements
- [ ] Check for tables with > 10% dead tuples in pg_stat_user_tables
- [ ] Identify unused indexes (idx_scan = 0) for potential removal
- [ ] Check cache hit ratio (target > 99% for OLTP)
- [ ] Review sequential scan counts on large tables

### Monthly Audit

- [ ] Run REINDEX CONCURRENTLY on indexes with > 30% bloat
- [ ] Review and remove confirmed unused indexes
- [ ] Check for duplicate/redundant indexes
- [ ] Evaluate partitioning for tables that grew past 50 GB
- [ ] Reset pg_stat_statements: `SELECT pg_stat_statements_reset();`
- [ ] Review and tune per-table autovacuum settings for high-churn tables

---

## 12. Sources

- [PostgreSQL Official Documentation: Resource Consumption](https://www.postgresql.org/docs/current/runtime-config-resource.html)
- [PostgreSQL Wiki: Tuning Your PostgreSQL Server](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [PostgreSQL Performance Tuning Best Practices 2025 - Mydbops](https://www.mydbops.com/blog/postgresql-parameter-tuning-best-practices)
- [Crunchy Data: Optimize PostgreSQL Server Performance](https://www.crunchydata.com/blog/optimize-postgresql-server-performance)
- [EDB: How to Tune PostgreSQL Memory](https://www.enterprisedb.com/postgres-tutorials/how-tune-postgresql-memory)
- [OneUpTime: PostgreSQL shared_buffers and work_mem Tuning](https://oneuptime.com/blog/post/2026-01-25-postgresql-shared-buffers-work-mem-tuning/view)
- [DBA Dataverse: PostgreSQL Configuration Parameters](https://dbadataverse.com/tech/postgresql/2025/02/postgresql-configuration-parameters-best-practices-for-performance-tuning)
- [PostgreSQL Official Documentation: Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Mydbops: PostgreSQL Index Best Practices](https://www.mydbops.com/blog/postgresql-indexing-best-practices-guide)
- [Percona: A Practical Guide to PostgreSQL Indexes](https://www.percona.com/blog/a-practical-guide-to-postgresql-indexes/)
- [Percona: How PostgreSQL Indexes Can Negatively Impact Performance](https://www.percona.com/blog/postgresql-indexes-can-hurt-you-negative-effects-and-the-costs-involved/)
- [pganalyze: EXPLAIN ANALYZE BUFFERS and Nested Loops](https://pganalyze.com/blog/5mins-explain-analyze-buffers-nested-loops)
- [PostgresAI: EXPLAIN ANALYZE Needs BUFFERS](https://postgres.ai/blog/20220106-explain-analyze-needs-buffers-to-improve-the-postgres-query-optimization-process)
- [pgMustard: Using BUFFERS for Query Optimization](https://www.pgmustard.com/blog/using-postgres-buffers-for-query-optimization)
- [Neon: PostgreSQL 18 Enhanced EXPLAIN with Automatic Buffers](https://neon.com/postgresql/postgresql-18/enhanced-explain)
- [Onidel: PgBouncer vs Pgcat vs Odyssey on VPS in 2025](https://onidel.com/blog/postgresql-proxy-comparison-2025)
- [Tembo: Benchmarking PostgreSQL Connection Poolers](https://legacy.tembo.io/blog/postgres-connection-poolers/)
- [Percona: PgBouncer for PostgreSQL](https://www.percona.com/blog/pgbouncer-for-postgresql-how-connection-pooling-solves-enterprise-slowdowns/)
- [pganalyze: PgCat vs PgBouncer](https://pganalyze.com/blog/5mins-postgres-pgcat-vs-pgbouncer)
- [AWS: Understanding Autovacuum in RDS for PostgreSQL](https://aws.amazon.com/blogs/database/understanding-autovacuum-in-amazon-rds-for-postgresql-environments/)
- [EDB: Autovacuum Tuning Basics](https://www.enterprisedb.com/blog/autovacuum-tuning-basics)
- [Cybertec: Tuning Autovacuum for PostgreSQL](https://www.cybertec-postgresql.com/en/tuning-autovacuum-postgresql/)
- [PostgreSQL Official Documentation: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [EDB: How to Use Table Partitioning to Scale PostgreSQL](https://www.enterprisedb.com/postgres-tutorials/how-use-table-partitioning-scale-postgresql)
- [AWS: Diagnose and Mitigate Lock Manager Contention](https://aws.amazon.com/blogs/database/improve-postgresql-performance-diagnose-and-mitigate-lock-manager-contention/)
- [PostgreSQL Wiki: Number of Database Connections](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [Last9: PostgreSQL Performance Tuning](https://last9.io/blog/postgresql-performance/)
- [Supabase: pg_stat_statements Documentation](https://supabase.com/docs/guides/database/extensions/pg_stat_statements)
- [Tiger Data: Identify Performance Bottlenecks with pg_stat_statements](https://www.tigerdata.com/blog/using-pg-stat-statements-to-optimize-queries)
- [PostgresAI: Why Keep Your Index Set Lean](https://postgres.ai/blog/20251110-postgres-marathon-2-013-why-keep-your-index-set-lean)
- [QuerySharp: How to Optimize LIKE Queries in PostgreSQL](https://querysharp.com/blog/how-to-optimize-like-queries-postgresql)
