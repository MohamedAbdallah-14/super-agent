# Database Query Optimization -- Performance Expertise Module

> Database queries are the #1 source of backend latency in most applications. A single unindexed query can turn a 10ms API call into a 10-second timeout. Understanding query execution plans, indexing strategies, and ORM pitfalls is essential for any backend developer.

> **Impact:** Critical
> **Applies to:** Backend
> **Key metrics:** Query execution time (p50/p95/p99), Rows scanned vs rows returned ratio, Index hit rate, Connection pool utilization

---

## 1. Why Query Optimization Matters

Research from the International Journal of Computing and Engineering (2025) found that **inefficient SQL queries account for 63% of database performance issues**, with just **7% of queries consuming over 70% of database resources**. A single unoptimized correlated subquery cost one company $45,000/month in unnecessary infrastructure; a 15-minute rewrite improved response times by 95%.

| Scenario | Before | After | Improvement |
|---|---|---|---|
| Missing index on WHERE clause | 28s | 32ms | 875x |
| SELECT * replaced with specific columns | 1.7s | 870ms | 2x |
| WordPress query optimization | 58,000ms | 20ms | 2,900x |
| Full table scan to index seek | 10s | 50ms | 200x |
| Connection pool right-sizing | ~100ms | ~2ms | 50x |

**The rows-scanned ratio** is the most important diagnostic metric. A ratio below 10:1 is acceptable. Between 10:1 and 100:1 warrants investigation. Above 100:1 is critical -- the query is doing orders of magnitude more work than necessary.

---

## 2. Reading Query Execution Plans

### 2.1 PostgreSQL: EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
  SELECT * FROM orders WHERE status = 'pending';
```

```
Seq Scan on orders  (cost=0.00..1542.00 rows=5000 width=124)
                     (actual time=0.015..12.340 rows=4832 loops=1)
  Filter: (status = 'pending')
  Rows Removed by Filter: 95168
  Buffers: shared hit=542
Planning Time: 0.085 ms
Execution Time: 12.892 ms
```

| Field | Meaning |
|---|---|
| `cost=0.00..1542.00` | Startup..total cost in planner units (1.0 = one sequential page read) |
| `rows=5000` vs `rows=4832` | Estimated vs actual rows -- large discrepancy means stale stats |
| `Rows Removed by Filter: 95168` | Rows read but discarded -- red flag when large |
| `Buffers: shared hit=542` | Pages read from buffer cache |

**Red flags:** Seq Scan on large tables, large Rows Removed by Filter, estimated vs actual row count mismatch (run `ANALYZE tablename;`), Nested Loop with large outer set, Sort with external merge.

#### Example: Before and After Index

```sql
-- BEFORE: Sequential Scan (190ms)
EXPLAIN ANALYZE SELECT id, customer_id, total
  FROM orders WHERE created_at > '2025-01-01' AND status = 'shipped';
-- Seq Scan on orders  (actual time=0.031..189.420 rows=11842 loops=1)
--   Rows Removed by Filter: 988158

-- ADD INDEX
CREATE INDEX idx_orders_status_created ON orders (status, created_at);

-- AFTER: Index Scan (4.5ms) -- 42x faster
-- Index Scan using idx_orders_status_created on orders
--   (actual time=0.028..3.912 rows=11842 loops=1)
```

### 2.2 MySQL: EXPLAIN

Key columns: `type` (ALL = full scan, ref/range/const = index use), `key` (index chosen, NULL = none), `rows` (estimated rows), `Extra` (`Using filesort` or `Using temporary` = warning).

### 2.3 MongoDB: explain("executionStats")

Key fields: `totalDocsExamined` vs `nReturned` (should be close), `stage: "COLLSCAN"` = no index, `stage: "IXSCAN"` = index used.

---

## 3. Indexing Strategies

### 3.1 B-Tree Indexes (Default)

Supports equality (`=`), range (`<`, `>`, `BETWEEN`), and prefix LIKE (`'prefix%'`).

```sql
-- Composite index -- column order is critical
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);
```

The index supports queries from left to right. `WHERE user_id = 5` uses the index. `WHERE user_id = 5 AND created_at > '2025-01-01'` uses both columns. `WHERE created_at > '2025-01-01'` alone cannot use this index.

### 3.2 GIN Indexes (PostgreSQL)

For arrays, JSONB, and full-text search. 3-10x slower writes, but dramatically faster reads on composite data.

```sql
CREATE INDEX idx_events_payload ON events USING GIN (payload);
-- Supports: WHERE payload @> '{"type": "purchase"}'

CREATE INDEX idx_articles_search ON articles
  USING GIN (to_tsvector('english', title || ' ' || body));
-- Supports: WHERE to_tsvector(...) @@ to_tsquery('optimization & database')
```

### 3.3 Partial Indexes

Index only the rows you actually query. Reduces index size and maintenance cost.

```sql
-- Full index on 10M rows: ~240MB
CREATE INDEX idx_orders_status ON orders (status);

-- Partial index on ~500K pending rows: ~12MB (20x smaller)
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';
```

Heap Engineering benchmark: partial index query time 0.88ms vs non-partial 16.3ms -- **18.5x faster**.

### 3.4 Covering Indexes (Index-Only Scans)

Include all columns the query needs so the database never touches the table.

```sql
CREATE INDEX idx_orders_covering ON orders (user_id, created_at) INCLUDE (total, status);

-- Index Only Scan: Heap Fetches: 0 (pure index read, fastest possible)
SELECT total, status FROM orders WHERE user_id = 42 AND created_at > '2025-01-01';
```

### 3.5 MongoDB: ESR Rule for Compound Indexes

Order fields as **Equality, Sort, Range**:

```javascript
// Query pattern
db.orders.find({ status: "shipped", total: { $gt: 100 } }).sort({ created_at: -1 });

// Optimal index: Equality first, Sort second, Range last
db.orders.createIndex({ status: 1, created_at: -1, total: 1 });
```

### 3.6 Index Cardinality

High cardinality columns (email, user_id) benefit most from indexes. If a value appears in >10-15% of rows, the planner skips the index and does a sequential scan anyway. Use partial indexes for low-cardinality columns.

---

## 4. Query Anti-Patterns and Fixes

### Anti-Pattern 1: SELECT *

```sql
-- SLOW: fetches 45 columns, prevents index-only scans
SELECT * FROM users WHERE department = 'engineering';
-- FAST: 80% less data transfer, 2x faster
SELECT id, name, email FROM users WHERE department = 'engineering';
```

### Anti-Pattern 2: Functions on Indexed Columns

```sql
-- SLOW: YEAR() prevents index use, forces full scan (1,200ms on 5M rows)
SELECT * FROM orders WHERE YEAR(created_at) = 2025;
-- FAST: sargable range query, uses index (8ms)
SELECT * FROM orders WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';
```

For case-insensitive search, create an expression index:

```sql
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

### Anti-Pattern 3: Leading Wildcards

```sql
-- SLOW: '%widget%' forces full scan (340ms on 2M rows)
SELECT * FROM products WHERE name LIKE '%widget%';
-- FAST: use full-text search with GIN index (4ms)
SELECT * FROM products
  WHERE to_tsvector('english', name) @@ to_tsquery('widget');
```

### Anti-Pattern 4: Implicit Type Conversions

```sql
-- SLOW: phone_number is VARCHAR but query passes integer -- casts every row
SELECT * FROM contacts WHERE phone_number = 5551234567;
-- FAST: match the column type
SELECT * FROM contacts WHERE phone_number = '5551234567';
```

### Anti-Pattern 5: Unbounded Queries

```sql
-- DANGEROUS: could return millions of rows
SELECT * FROM logs WHERE level = 'ERROR';
-- SAFE: keyset pagination (constant performance at any depth)
SELECT id, message, created_at FROM logs
  WHERE level = 'ERROR' AND created_at < '2025-06-15T10:30:00Z'
  ORDER BY created_at DESC LIMIT 50;
```

`OFFSET 100000` reads and discards 100,000 rows. Keyset pagination jumps directly via the index.

### Anti-Pattern 6: DISTINCT as Band-Aid

```sql
-- BAD: DISTINCT masks duplicate rows from incorrect join
SELECT DISTINCT u.id, u.name FROM users u
  JOIN orders o ON u.id = o.user_id JOIN order_items oi ON o.id = oi.order_id;
-- GOOD: EXISTS checks relationship without producing duplicates
SELECT u.id, u.name FROM users u
  WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = u.id);
```

---

## 5. ORM Pitfalls: N+1 and Beyond

### 5.1 The N+1 Problem

Code fetches N parent records, then issues one query per record for related data: N+1 queries instead of 1-2.

**Django:**

```python
# N+1: 501 queries for 500 authors (~1,002ms at 2ms/query)
authors = Author.objects.all()
for author in authors:
    books = author.books.all()  # 1 query per author

# FIX: 2 queries (~4ms) -- 250x fewer round trips
authors = Author.objects.prefetch_related('books').all()
```

Measured: without eager loading ~36s, with `prefetch_related` ~2s -- **18x improvement**.

**SQLAlchemy:**

```python
# FIX: selectinload for collections, joinedload for many-to-one
from sqlalchemy.orm import selectinload, joinedload
users = session.query(User).options(selectinload(User.orders)).all()
orders = session.query(Order).options(joinedload(Order.customer)).all()
```

**Rails ActiveRecord:**

```ruby
# FIX: includes (auto-strategy), eager_load (JOIN), preload (separate queries)
posts = Post.includes(:comments).all

# PREVENT: strict_loading raises error on lazy load (Rails 6.1+)
class Post < ApplicationRecord
  self.strict_loading_by_default = true
end
```

### 5.2 Detection Tools

| Tool | Framework | Method |
|---|---|---|
| Django Debug Toolbar | Django | Shows all SQL per request |
| `nplusone` | Django/SQLAlchemy | Auto-detects N+1, raises warnings |
| Bullet gem | Rails | Detects N+1, suggests fixes |
| `strict_loading` | Rails 6.1+ | Raises exception on lazy load |
| Sentry / Datadog APM | Any | Identifies repeated query patterns |

### 5.3 More ORM Traps

```python
# BAD: loads full objects when you need one field
user_ids = [u.id for u in User.objects.filter(active=True)]
# GOOD: values_list returns only the column
user_ids = list(User.objects.filter(active=True).values_list('id', flat=True))

# TERRIBLE: filters in Python instead of SQL (fetches 1M rows, keeps 5K)
active_premium = [u for u in User.objects.all() if u.is_active and u.plan == 'premium']
# CORRECT: filter in the database
active_premium = User.objects.filter(is_active=True, plan='premium')
```

---

## 6. Join Optimization

### Join Algorithms

| Algorithm | Best For | Complexity |
|---|---|---|
| Nested Loop | Small outer set, indexed inner | O(n * m) worst |
| Hash Join | Large unsorted sets, equality joins | O(n + m) |
| Merge Join | Large pre-sorted sets | O(n + m) |

### Subquery vs JOIN

```sql
-- SLOW: correlated subquery executes once per outer row
-- 50K products x 5M order_items: ~45 seconds
SELECT p.name,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id)
FROM products p;

-- FAST: JOIN with GROUP BY -- ~800ms (56x faster)
SELECT p.name, COUNT(oi.id) AS order_count
FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name;
```

### EXISTS vs IN

```sql
-- EXISTS short-circuits after first match -- faster for large subquery results
SELECT * FROM users u WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.total > 1000);
```

---

## 7. Denormalization and Materialized Views

Denormalize when: read-to-write ratio >100:1, fan-out joins (3-5+ tables per request), or repeated aggregation hotspots. **Always exhaust indexing, query rewrites, and caching first.**

### Cached Counter Columns

```sql
ALTER TABLE authors ADD COLUMN book_count INTEGER DEFAULT 0;
-- Maintained via trigger on INSERT/DELETE to books table
-- Before: COUNT(*) query (12ms). After: single column read (0.1ms)
```

### Materialized Views

```sql
CREATE MATERIALIZED VIEW mv_daily_revenue AS
  SELECT DATE(created_at) AS day, COUNT(*) AS orders, SUM(total) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY DATE(created_at)
WITH DATA;

CREATE INDEX idx_mv_revenue_day ON mv_daily_revenue (day);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;  -- no read lock
```

| Refresh Strategy | Freshness | Method |
|---|---|---|
| Cron / pg_cron | Minutes-hours | Scheduled `REFRESH` |
| Trigger-based | Near real-time | Trigger on source tables |
| CDC / Outbox | Seconds | Change Data Capture pipeline |

---

## 8. Connection Pool Tuning

Every PostgreSQL connection uses ~5-10MB of memory. Excessive connections cause context switching that degrades all queries.

**HikariCP formula:** `pool_size = (core_count * 2) + effective_spindle_count`

For a 4-core server with SSDs and data in RAM: pool_size = 8. The HikariCP wiki documents that **reducing pool size to this formula decreased response times from ~100ms to ~2ms** -- 50x improvement.

### PgBouncer

```ini
pool_mode = transaction    # return connection after each transaction (recommended)
default_pool_size = 20     # actual PostgreSQL connections
max_client_conn = 1000     # client connections PgBouncer accepts
```

**Monitor:** connection wait time (<5ms target), active connections (<80% of pool max), idle ratio (>50% idle = pool too large).

```sql
-- Check for long-running queries holding connections
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;
```

---

## 9. Database-Specific Techniques

### PostgreSQL

```sql
-- Update stale statistics
ANALYZE orders;

-- Aggressive autovacuum for high-write tables
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0.01,    -- vacuum after 1% changes (default 20%)
  autovacuum_analyze_scale_factor = 0.005);  -- analyze after 0.5% changes

-- Concurrent index creation (no table lock)
CREATE INDEX CONCURRENTLY idx_orders_email ON orders (email);
```

### MySQL / InnoDB

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 0.5;
SET GLOBAL log_queries_not_using_indexes = 1;

-- Check buffer pool hit rate (target: >99%)
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';
-- hit_rate = 1 - (reads / read_requests). Below 99% = increase innodb_buffer_pool_size.

-- Optimizer hints (8.0+)
SELECT /*+ INDEX(orders idx_orders_user_date) */ id, total FROM orders WHERE user_id = 42;
```

### MongoDB

```javascript
// Move $match before $lookup to reduce documents entering expensive stages
db.orders.aggregate([
  { $match: { status: "pending" } },           // filter FIRST
  { $lookup: { from: "customers", localField: "customer_id",
               foreignField: "_id", as: "customer" } }
]);

// TTL index for automatic cleanup -- prevents table bloat
db.sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 });
```

---

## 10. Monitoring and Continuous Optimization

### Key Metrics

| Metric | Target | Alert |
|---|---|---|
| p50 query time | <5ms | >20ms |
| p95 query time | <50ms | >200ms |
| p99 query time | <200ms | >1s |
| Rows scanned / returned | <10:1 | >100:1 |
| Index hit rate | >99% | <95% |
| Buffer/cache hit rate | >99% | <95% |
| Active connections | <80% pool | >90% pool |

### pg_stat_statements (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top queries by total execution time
SELECT calls, round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms, query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- Tables needing indexes (high sequential scan count)
SELECT relname, seq_scan, seq_tup_read, idx_scan,
  round(100.0 * idx_scan / GREATEST(seq_scan + idx_scan, 1), 1) AS idx_pct
FROM pg_stat_user_tables WHERE seq_scan > 100 ORDER BY seq_tup_read DESC LIMIT 20;

-- Unused indexes wasting disk and slowing writes
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC LIMIT 20;
```

---

## 11. Checklist: Before You Ship a Query

- [ ] Run EXPLAIN ANALYZE on production-like data volumes
- [ ] Rows scanned vs returned ratio below 10:1
- [ ] Plan shows Index Scan, not Seq Scan on large tables
- [ ] No N+1 patterns -- related data loaded with eager loading
- [ ] No SELECT * -- only needed columns projected
- [ ] Pagination applied -- no unbounded result sets
- [ ] No functions on indexed columns -- queries are sargable
- [ ] Connection pool metrics verified under load
- [ ] Load tested at 2x expected traffic
- [ ] Monitoring dashboard and latency alerts configured

---

## 12. Sources

- [SQL Query Optimization Guide 2025 (AI2sql)](https://ai2sql.io/learn/sql-query-optimization-guide)
- [High-Performance SQL: 12 Proven Techniques (TXMinds)](https://www.txminds.com/blog/sql-query-optimization-techniques/)
- [SQL Query Optimization: 15 Techniques (DataCamp)](https://www.datacamp.com/blog/sql-query-optimization)
- [PostgreSQL EXPLAIN ANALYZE Guide (EDB)](https://www.enterprisedb.com/blog/postgresql-query-optimization-performance-tuning-with-explain-analyze)
- [PostgreSQL Documentation: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [Reading a Postgres EXPLAIN ANALYZE Plan (Thoughtbot)](https://thoughtbot.com/blog/reading-an-explain-analyze-query-plan)
- [EXPLAIN ANALYZE Guide (Crunchy Data)](https://www.crunchydata.com/blog/get-started-with-explain-analyze)
- [Postgres Scan Types in EXPLAIN Plans (Crunchy Data)](https://www.crunchydata.com/blog/postgres-scan-types-in-explain-plans)
- [N+1 Queries (Sentry Documentation)](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-queries/)
- [N+1 Problem Deep Dive (Chaos and Order)](https://www.youngju.dev/blog/database/2026-03-03-n-plus-1-problem-deep-dive.en)
- [Django N+1 Problem (ScoutAPM)](https://www.scoutapm.com/blog/django-and-the-n1-queries-problem)
- [Find, Fix, Prevent N+1 on Rails (Doctolib)](https://medium.com/doctolib/how-to-find-fix-and-prevent-n-1-queries-on-rails-6b30d9cfbbaf)
- [PostgreSQL Indexing: B-Tree vs GIN vs BRIN (Medium)](https://medium.com/@ankush.thavali/postgresql-indexing-strategies-b-tree-vs-gin-vs-brin-38afcfe70d29)
- [Postgres GIN Indexes (pganalyze)](https://pganalyze.com/blog/gin-index)
- [Index Types in Aurora/RDS PostgreSQL (AWS)](https://aws.amazon.com/blogs/database/index-types-supported-in-amazon-aurora-postgresql-and-amazon-rds-for-postgresql-gin-gist-hash-brin/)
- [PostgreSQL Partial Indexes Documentation](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Speeding Up PostgreSQL With Partial Indexes (Heap)](https://www.heap.io/blog/speeding-up-postgresql-queries-with-partial-indexes)
- [WordPress Optimization: 1 min to 20ms (WP Bullet)](https://wp-bullet.com/wordpress-database-optimization-case-study-slow-queries-from-1-minute-to-20-ms)
- [Optimizing 10 Slow SQL Server Queries (C# Corner)](https://www.c-sharpcorner.com/article/performance-tuning-case-study-optimizing-10-slow-sql-server-queries-step-by-ste/)
- [DBA Guide to Fixing Slow Queries 2025 (Medium)](https://medium.com/@jholt1055/database-query-optimization-the-complete-dba-guide-to-identifying-and-fixing-slow-queries-in-2025-80cf25c1c7bb)
- [SQL Anti-Patterns (Medium)](https://somnath-dutta.medium.com/sql-anti-patterns-what-not-to-do-in-sql-queries-0a7c5aac2e25)
- [34+ SQL Antipatterns (Sonra)](https://sonra.io/mastering-sql-how-to-detect-and-avoid-34-common-sql-antipatterns/)
- [Performance Anti-Patterns in DB Apps (InfoQ)](https://www.infoq.com/articles/Anti-Patterns-Alois-Reitbauer/)
- [About Pool Sizing (HikariCP Wiki)](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [Optimal Connection Pool Size (Vlad Mihalcea)](https://vladmihalcea.com/optimal-connection-pool-size/)
- [MySQL Index Cardinality (Lullabot)](https://www.lullabot.com/articles/slow-queries-check-the-cardinality-of-your-mysql-indexes)
- [MongoDB Query Optimization Docs](https://www.mongodb.com/docs/manual/core/query-optimization/)
- [Denormalization in Databases (DataCamp)](https://www.datacamp.com/tutorial/denormalization)
- [Materialized Views in SQL (DEV Community)](https://dev.to/cristiansifuentes/materialized-views-in-sql-supercharging-read-performance-38n8)
