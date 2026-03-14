# Database Scaling — Architecture Expertise Module

> Database scaling is typically the hardest scaling challenge because databases are stateful. The progression: optimize queries → add indexes → vertical scaling → read replicas → caching → partitioning → sharding. Most applications never need to go past read replicas. Premature sharding is one of the most expensive architectural mistakes.

> **Category:** Scaling
> **Complexity:** Complex
> **Applies when:** Database becoming a performance bottleneck due to query volume, data size, or write throughput

---

## What This Is

Database scaling increases a system's capacity to handle growing workloads — more QPS, larger datasets, higher write throughput. Unlike stateless app servers, databases hold persistent state, making every scaling step fundamentally harder.

### The Scaling Ladder

Each step is roughly **10x harder** than the previous one in complexity, operational burden, and risk.

```
Level 0: Optimize Queries          — Cost: Hours    | Risk: None     | Impact: 2-100x
Level 1: Add/Improve Indexes       — Cost: Hours    | Risk: Low      | Impact: 10-1000x
Level 2: Vertical Scaling          — Cost: Minutes  | Risk: Low      | Impact: 2-8x
Level 3: Connection Pooling        — Cost: Days     | Risk: Low      | Impact: 2-10x
Level 4: Read Replicas             — Cost: Days     | Risk: Medium   | Impact: 2-50x
Level 5: Caching Layer             — Cost: Weeks    | Risk: Medium   | Impact: 10-100x
Level 6: Table Partitioning        — Cost: Weeks    | Risk: Medium   | Impact: 2-10x
Level 7: Vertical Partitioning     — Cost: Months   | Risk: High     | Impact: 2-10x
Level 8: Horizontal Sharding       — Cost: Months+  | Risk: Very High| Impact: 10-1000x
```

**Critical insight:** Levels 0-3 are free or nearly free. Level 4 handles 80%+ of scaling needs. Level 5 handles another 15%. Only ~5% of applications ever genuinely need Levels 6-8. OpenAI serves 800M ChatGPT users with a single PostgreSQL primary and ~50 read replicas — no sharding.

---

## When to Use Each Level

### Level 0-1: Query and Index Optimization — Always First

**Signals:** Slow queries >100ms, sequential scans on tables >10K rows, N+1 patterns, missing composite indexes.
**Tools:** `EXPLAIN ANALYZE`, `pg_stat_statements`, `auto_explain`.
**Outcome:** 10-1000x improvement on specific queries. Often eliminates all other scaling needs.

### Level 2: Vertical Scaling — Bigger Hardware

**Signals:** CPU >70% sustained after query optimization, instance is not the largest available.
**Ceiling:** AWS offers 64 vCPUs / 512GB RAM (r6g.16xlarge). Azure offers 128 vCPUs / 4TB RAM. Most databases never exhaust these.

### Level 3: Connection Pooling — Reduce Overhead

**Signals:** `max_connections` errors, hundreds of idle connections (~10MB each in PostgreSQL), serverless connection storms.
**Rule:** Any app with >100 RPS should use PgBouncer (transaction mode) or ProxySQL.

### Level 4: Read Replicas — Scale Reads (80% of use cases)

**Signals:** >80% read workload, single primary CPU saturated by SELECTs, can tolerate <100ms replication lag.
**Scale:** 2-5 replicas (most apps), 5-15 (high-traffic SaaS), 15-50 (exceptional — OpenAI).
**Requirement:** Application must handle eventual consistency and read-your-writes routing.

### Level 5: Caching Layer — Absorb Hot Reads

**Signals:** Hot data <10% of total, same queries repeated thousands of times/min, data changes infrequently.
**Patterns:** Cache-aside (lazy load), write-through, write-behind. Redis preferred over Memcached.
**Critical:** Implement thundering herd protection (cache locks). OpenAI uses single-flight cache locking.

### Level 6: Table Partitioning — Split Large Tables

**Signals:** Tables >100M rows, VACUUM/REINDEX taking hours, queries naturally filter by partition key (date, tenant).
**Strategies:** Range (time-series), List (categorical), Hash (even distribution).

### Level 7: Vertical Partitioning — Split by Domain

**Signals:** Independent feature domains with different scaling needs, no cross-table JOINs needed between groups.
**Example:** Figma went from 1 to 12 PostgreSQL databases by moving table groups (Files, Organizations) to dedicated servers.

### Level 8: Horizontal Sharding — Split Rows Across Servers

**ALL must be true:** Vertical scaling exhausted, read replicas insufficient (write-bound), connection pooling and caching in place, single table >1-5TB and growing, writes >50-200K/sec sustained.
**Reality:** Most PostgreSQL instances handle 1TB+ with proper indexing. You almost certainly do not need sharding.

---

## When NOT to Shard

**Premature sharding is one of the most catastrophic architectural mistakes.** It is essentially irreversible without a multi-month migration.

### What Sharding Destroys

| Operation | Before Sharding | After Sharding |
|-----------|-----------------|----------------|
| Simple query | Single-node lookup | Route to correct shard |
| Aggregate query | `SELECT COUNT(*)` | Query ALL shards, merge results |
| JOIN | Standard SQL JOIN | Impossible across shard keys, or scatter-gather |
| Transaction | `BEGIN; ... COMMIT;` | Distributed 2PC across shards |
| Schema migration | Single `ALTER TABLE` | Execute on EVERY shard, coordinate rollback |
| Unique constraint | Database enforces | Application must enforce globally |
| Foreign keys | Database enforces | Cannot enforce across shards |

### Real-World Sharding Disasters

**The $2.9M Rollback:** A company spent $2.9M (implementation + rollback), wasted 30 months, lost 5 engineers. The database had 100M records / 2TB with 8% CPU and 34% memory usage at 400 QPS. Sharding was never needed — proper indexing would have sufficed.

**Foursquare Shard Imbalance (2010):** Two shards, uneven user distribution — one grew to 67GB (exceeding RAM), the other 50GB. Performance collapsed, causing an 11-hour outage. Even "simple" sharding has unpredictable failure modes.

**Wrong Shard Key:** E-commerce team sharded by `order_id` (even distribution), but every query was "show all orders for customer X" — scatter-gather across ALL shards. Resharding by `customer_id` required migrating billions of rows over 3 weeks.

**Gaming Hot Shard:** Sharded by `game_id` — one viral game got 80% of traffic on one shard while 15 others sat idle.

### Do NOT Shard If

1. Database under 500GB (proper indexing + vertical scaling handles it)
2. Under 50K QPS (connection pooling + read replicas suffice)
3. Under 10K writes/sec (single PostgreSQL primary handles this easily)
4. Fewer than 10 engineers (sharding requires dedicated DB engineering capacity)
5. Many cross-entity relationships (sharding destroys JOINs)
6. You haven't exhausted Levels 0-6 (every prior level is cheaper and less risky)

---

## How It Works

### Read Replicas: Replication and Routing

```
        ┌──────────────┐
        │  Application  │
        └──────┬───────┘
        ┌──────▼───────┐
        │ Router/Proxy  │
        └──┬─────┬────┬┘
     ┌─────▼──┐ ┌▼────▼──┐
     │Primary │ │Replicas │ ← WAL streaming from primary
     │(writes)│ │ (reads) │
     └────────┘ └─────────┘
```

**Replication lag patterns:**

1. **Read-your-writes:** After a write, route the same session's reads to the primary for a configurable window (e.g., 5 seconds):
```python
class DatabaseRouter:
    def route(self, query, session):
        if query.is_write():
            return self.primary
        if session.has_recent_write(window=5_seconds):
            return self.primary  # read-your-writes consistency
        return self.replica_pool.next()  # round-robin replicas
```
2. **Monotonic reads:** Pin a user session to one replica to avoid reading from a more-lagged replica after a less-lagged one.
3. **Causal consistency:** Track logical timestamps; route reads to any replica caught up past the last write's timestamp.

**WAL distribution at scale (OpenAI):** At ~50 replicas, the primary cannot stream WAL to all — network bandwidth and CPU pressure cause unstable replica lag. Solution: intermediate "relay" replicas form a tree topology (primary -> relay -> leaf), enabling 100+ replicas without overwhelming the primary.

### Connection Pooling: PgBouncer

| Mode | Behavior | Use Case |
|------|----------|----------|
| Session | Client owns connection for entire session | Legacy apps, prepared statements |
| Transaction | Connection returned after each transaction | **Most production workloads** |
| Statement | Connection returned after each statement | Simple read-only workloads |

Pool size formula: `(available_RAM / 20MB) / num_databases`, capped at 100-200.

### Partitioning: Range, Hash, List

```sql
-- Range partitioning by date (most common)
CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ NOT NULL,
    payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

```sql
-- Hash partitioning for even distribution
CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    customer_id BIGINT NOT NULL,
    total NUMERIC(10,2)
) PARTITION BY HASH (customer_id);

CREATE TABLE orders_p0 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE orders_p1 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... through REMAINDER 7
```

Partition pruning: `WHERE created_at >= '2025-01-15' AND created_at < '2025-01-20'` scans only the January partition, not all data. Verify with `EXPLAIN ANALYZE`.

### Horizontal Sharding: Shard Key Selection

The **single most consequential decision** in sharding. Criteria: (1) High cardinality — many distinct values. (2) Even distribution — no power-law hotspots. (3) Query alignment — most queries filter by shard key. (4) Growth stability — stays even as data grows.

**Instagram's ID design:** 41 bits timestamp + 13 bits shard ID (8192 logical shards) + 10 bits sequence. Logical shards map to physical servers. Rebalancing moves logical shards — no row-level resharding.

**Routing strategies:**

| Strategy | Pros | Cons |
|----------|------|------|
| Hash (modulo) | Simple, even distribution | Resharding moves ~all data |
| Consistent hashing | Minimal data movement on reshard | More complex |
| Range-based | Efficient range queries | Hot shard risk |
| Directory/lookup | Maximum flexibility | Lookup table is SPOF |

### Query Optimization: EXPLAIN ANALYZE

The single most important command for database performance:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.name
ORDER BY order_count DESC LIMIT 10;
```

**Red flags in output:**
- `Seq Scan` on large tables -> needs an index
- `Nested Loop` with large outer table -> consider `Hash Join`
- `Rows Removed by Filter` >> actual rows returned -> index not selective enough
- `Buffers: shared read` >> `shared hit` -> working set exceeds `shared_buffers`
- `Sort Method: external merge Disk` -> `work_mem` too low for this query

---

## Trade-Offs Matrix

| Strategy | Complexity | Read Scale | Write Scale | Consistency | Reversibility |
|----------|-----------|------------|-------------|-------------|---------------|
| Query optimization | Very Low | High | Medium | Full | N/A |
| Indexing | Low | Very High | Slight negative | Full | Easy |
| Vertical scaling | Very Low | Medium | Medium | Full | Trivial |
| Connection pooling | Low | Medium | Medium | Full | Easy |
| Read replicas | Medium | Very High | None | Eventual | Moderate |
| Caching (Redis) | Medium | Very High | None | Eventual/TTL | Moderate |
| Table partitioning | Medium | Medium | Low | Full | Difficult |
| Vertical partitioning | High | Medium | Medium | Per-database | Very Difficult |
| Horizontal sharding | Very High | Very High | Very High | Per-shard | Nearly Impossible |

| Strategy | Team Size | Time to Implement | Data Model Impact |
|----------|-----------|-------------------|-------------------|
| Query/Index optimization | 1 engineer | Hours-Days | None |
| Vertical scaling | 1 SRE | Minutes | None |
| Connection pooling | 1-2 engineers | Days | None |
| Read replicas | 2-3 engineers | Days-Weeks | Minimal (read routing) |
| Caching | 2-3 engineers | Weeks | Moderate (invalidation logic) |
| Table partitioning | 2-3 engineers | Weeks | Moderate (partition key) |
| Vertical partitioning | 3-5 engineers | Months | High (no cross-DB JOINs) |
| Horizontal sharding | 5-10 engineers | Months-Years | Fundamental (shard key governs everything) |

---

## Evolution Path

### Stage 1: Foundation (0-1K users, <100 RPS)
Single PostgreSQL instance. Set up `pg_stat_statements` and `auto_explain` from day one.
**Advance when:** P95 latency >200ms OR CPU >50% sustained.

### Stage 2: Optimization (1K-100K users, 100-1K RPS)
Fix top 10 queries by total time. Add composite indexes. Eliminate N+1 queries. Add PgBouncer. Tune `shared_buffers`, `work_mem`, `effective_cache_size`.

**Key metrics targets:**
```
Cache hit ratio:    > 99% (if below, increase shared_buffers)
Connection count:   < 80% of max_connections
CPU utilization:    < 70% sustained
Disk I/O wait:      < 10%
Query p99 latency:  < 100ms
```
**Advance when:** CPU >70% after optimization.

### Stage 3: Read Scaling (100K-10M users, 1K-50K RPS)
Deploy 2-5 read replicas. Implement read/write routing with read-your-writes consistency. Monitor replication lag; alert at >1s.
**Advance when:** Replicas saturated OR write throughput is the bottleneck.

### Stage 4: Caching (10M+ users, >10K RPS)
Redis cache-aside for hot entities. Cache invalidation on writes. Thundering herd protection via cache locks (OpenAI pattern: single-flight, one request populates cache, others wait).
**Advance when:** Single-table performance degrades despite caching.

### Stage 5: Partitioning (tables >100M rows)
Identify tables with natural partition keys. Range by time is most common. Use `pg_partman` for automation. Verify partition pruning in `EXPLAIN` output.
**Advance when:** Aggregate load exceeds single server.

### Stage 6: Vertical Partitioning
Move independent table groups to separate databases (Figma: 1 → 12 databases). Remove cross-domain JOINs first.
**Advance when:** Single-table write throughput exceeds vertical limits. (Rare.)

### Stage 7: Horizontal Sharding
Select shard key. Choose middleware (Vitess/Citus/application-level). Use logical shards (Instagram: 8192 logical → few physical). Build dual-write migration with verification (Shopify). Plan for years, not months (Slack: 3 years).

---

## Failure Modes

### 1. Replication Lag → Stale Reads
User creates a record, sees it missing. **Fix:** Read-your-writes routing; synchronous replication for critical paths; monitor lag, circuit-break to primary if >threshold.

### 2. Connection Pool Exhaustion
"Too many connections" errors, total unavailability. **Fix:** Size pools correctly, set `statement_timeout` (30s), monitor at 80% utilization, use `SHOW POOLS` to diagnose.

### 3. Shard Key Hot Spots
One shard overwhelmed while others idle (gaming company: 80% traffic on one shard). **Fix:** Hash-based sharding, split hot keys with salt, monitor per-shard imbalance.

### 4. Cross-Shard JOIN Impossibility
Features requiring multi-shard data become impossible. **Fix:** Denormalize joined data into each shard, maintain read-only aggregate store for analytics, application-level joins.

### 5. Resharding Downtime
System unavailable during rebalancing. **Fix:** Use virtual/logical shards from day one (Instagram: 8192 logical shards), consistent hashing, online dual-write resharding.

### 6. Cache Stampede (Thundering Herd)
DB load spikes when popular cache entries expire simultaneously. **Fix:** Cache locks / single-flight, jittered TTLs, background refresh before expiry.

### 7. Partition Explosion
Query planner slows with >10K partitions. **Fix:** Keep under 1000 (ideally <100), coarser granularity, drop old partitions.

### 8. Split-Brain During Failover
Two nodes both accepting writes after failover. **Fix:** Fencing (STONITH), monitor timeline divergence, use managed services that handle failover correctly, test regularly.

---

## Technology Landscape

### PostgreSQL Ecosystem
| Tool | Purpose |
|------|---------|
| **PgBouncer** | Connection pooling (standard for production) |
| **Citus** | Distributed PostgreSQL — sharding as extension |
| **pg_partman** | Automated partition management |
| **Patroni** | HA and automatic failover |

### MySQL Ecosystem
| Tool | Purpose |
|------|---------|
| **ProxySQL** | Query routing + connection pooling |
| **Vitess** | Sharding middleware (Slack, Shopify, GitHub) |
| **Orchestrator** | Replication topology management |

### Managed Cloud Databases
| Service | Provider | Key Feature |
|---------|----------|-------------|
| **Aurora** | AWS | 15 replicas, auto-scales to 128TB |
| **AlloyDB** | GCP | PostgreSQL-compatible, 100x faster analytics |
| **PlanetScale** | PlanetScale | Vitess-based serverless MySQL, zero-downtime DDL |
| **Neon** | Neon | Serverless PostgreSQL, branching, scale-to-zero |

### NewSQL / Distributed SQL
| Database | Sharding | SQL Compat | Best For |
|----------|----------|------------|----------|
| **CockroachDB** | Automatic (ranges) | PostgreSQL wire | Global distribution, strong consistency |
| **YugabyteDB** | Automatic (hash/range) | PostgreSQL-compatible | PostgreSQL apps needing horizontal scale |
| **TiDB** | Automatic (ranges) | MySQL-compatible | MySQL apps needing horizontal scale |
| **Vitess** | Application-directed | MySQL (middleware) | Existing MySQL at extreme scale |
| **Citus** | Explicit (extension) | PostgreSQL (native) | Multi-tenant, real-time analytics |

**Key distinction:** CockroachDB/YugabyteDB handle sharding transparently (no shard key). Citus/Vitess require explicit shard key selection. Transparent sharding trades performance for simplicity.

### Read Replica Support by Provider

| Provider | Max Replicas | Cross-Region | Replication |
|----------|-------------|--------------|-------------|
| AWS Aurora | 15 | Yes | Async (sync available) |
| AWS RDS | 5 | Yes | Async |
| GCP Cloud SQL | 10 | Yes | Async |
| Azure Flexible | 5 | Yes (geo-replication) | Async |
| Self-managed | Unlimited | Manual setup | Streaming WAL |

---

## Decision Tree

```
START: Database is slow
│
├─ Analyzed slow queries? (pg_stat_statements, EXPLAIN ANALYZE)
│  └─ NO → Do this first. Stop. 90% of problems end here.
│
├─ Queries optimized but CPU > 70%?
│  ├─ Largest instance? NO → Vertically scale. Done.
│  └─ YES → Continue.
│
├─ Workload > 80% reads?
│  ├─ YES → Add read replicas (start with 2).
│  │  ├─ Same data read repeatedly? → Add Redis caching.
│  │  └─ Still bottlenecked? → Continue.
│  └─ NO (write-heavy) → Continue.
│
├─ Have connection pooling?
│  └─ NO → Add PgBouncer. May solve the problem alone.
│
├─ Tables > 100M rows?
│  └─ YES → Partition (range by time most common).
│
├─ Workload splittable into independent domains?
│  └─ YES → Vertical partition (Figma: 1 → 12 databases).
│
├─ Single-table writes > 50K/sec sustained?
│  ├─ YES → Horizontal sharding warranted.
│  │  ├─ PostgreSQL → Citus or application-level
│  │  ├─ MySQL → Vitess or PlanetScale
│  │  └─ Greenfield → CockroachDB or YugabyteDB
│  └─ NO → Revisit Levels 0-6. You don't need sharding.
│
└─ None of the above?
   └─ Problem is likely not the database. Check: network latency,
      app-level N+1 patterns, lock contention, disk I/O.
```

---

## Implementation Sketch

### Read Replica Setup (PostgreSQL / AWS RDS)

```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier myapp-read-1 \
  --source-db-instance-identifier myapp-primary \
  --db-instance-class db.r6g.2xlarge
```

```ruby
# Rails read/write routing (config/database.yml)
production:
  primary:
    url: postgres://myapp-primary.xxx.rds.amazonaws.com/myapp
  primary_replica:
    url: postgres://myapp-read-1.xxx.rds.amazonaws.com/myapp
    replica: true
```

### PgBouncer Production Config

```ini
[pgbouncer]
pool_mode = transaction           # recommended for most workloads
default_pool_size = 50            # per user/database pair
max_client_conn = 1000
max_db_connections = 100          # hard cap on backend connections
server_idle_timeout = 600
query_timeout = 30
```

### Cache Lock Pattern (Thundering Herd Protection)

Based on the OpenAI approach — only one request fetches from the database on a cache miss:

```python
def get_user(user_id):
    cached = redis.get(f"user:{user_id}")
    if cached:
        return deserialize(cached)

    # Acquire lock - only one request fetches from DB
    lock = redis.set(f"lock:user:{user_id}", "1", nx=True, ex=5)
    if lock:
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        redis.setex(f"user:{user_id}", 300, serialize(user))
        redis.delete(f"lock:user:{user_id}")
        return user
    else:
        time.sleep(0.05)  # wait for other request to populate
        return get_user(user_id)  # retry
```

### Zero-Downtime Partitioning Migration

```sql
-- Step 1: Create partitioned table with same schema
CREATE TABLE events_partitioned (
    LIKE events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Step 2: Create partitions for each range
CREATE TABLE events_p_2025_01 PARTITION OF events_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- ... create all needed partitions

-- Step 3: Backfill in batches (avoid long locks)
INSERT INTO events_partitioned
SELECT * FROM events
WHERE created_at >= '2025-01-01' AND created_at < '2025-02-01'
ON CONFLICT DO NOTHING;

-- Step 4: Swap tables (brief exclusive lock)
BEGIN;
ALTER TABLE events RENAME TO events_old;
ALTER TABLE events_partitioned RENAME TO events;
COMMIT;

-- Step 5: Verify, then drop after confirmation period
-- DROP TABLE events_old;
```

### Essential Monitoring Queries

```sql
-- Top queries by total time
SELECT calls, round(mean_exec_time::numeric, 2) as mean_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) as pct,
       left(query, 80) as query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;

-- Cache hit ratio (target > 99%)
SELECT round(100.0 * sum(heap_blks_hit) /
  nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as cache_hit_pct
FROM pg_statio_user_tables;

-- Replication lag
SELECT client_addr, state,
       flush_lsn - replay_lsn as replay_lag
FROM pg_stat_replication;

-- Table bloat and dead tuples (VACUUM health)
SELECT relname, n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) as dead_pct,
       last_autovacuum
FROM pg_stat_user_tables
WHERE n_live_tup > 10000 ORDER BY n_dead_tup DESC LIMIT 20;

-- Active connections by state
SELECT state, count(*), max(now() - state_change) as longest
FROM pg_stat_activity
WHERE pid <> pg_backend_pid() GROUP BY state;
```

---

## Real-World Case Studies

### OpenAI (ChatGPT) — Read Replicas at Extreme Scale

**Scale:** 800 million users, millions of queries per second.
**Architecture:** Single Azure PostgreSQL Flexible Server primary + ~50 read replicas across multiple regions.

Key innovations:
- Tree-topology WAL distribution: primary streams to relay replicas, relays stream to leaf replicas — avoids overwhelming the primary's network/CPU at 50+ replicas
- Cache lock mechanism: only a single reader that misses on a cache key fetches from PostgreSQL; other requests wait — prevents thundering herd
- Consistent low double-digit millisecond p99 client-side latency
- Five-nines (99.999%) availability in production
- **No sharding needed** for the core metadata store

**Lesson:** Aggressive query optimization, caching, and read replicas can scale PostgreSQL far beyond what most engineers expect.

### Instagram — Logical Sharding on PostgreSQL

**Scale:** 2+ billion monthly active users.
**Architecture:** Django + PostgreSQL, sharded across thousands of logical shards mapped to physical servers.

Key innovations:
- Custom 64-bit ID: 41-bit timestamp (time-sortable) + 13-bit shard ID (8192 logical shards) + 10-bit auto-increment sequence
- Logical shards as PostgreSQL schemas (not separate databases) — multiple logical shards per physical server
- PgBouncer for connection pooling across all shards
- Cassandra for specific use cases; Redis for ephemeral caching
- Rebalancing moves logical shards between physical servers — no row-level data migration

**Lesson:** Logical sharding provides resharding flexibility. Start with many logical shards on few physical servers. Rebalancing is moving entire schemas, not splitting tables.

### Figma — Incremental Vertical Partitioning

**Scale:** 4M+ users, database traffic growing ~3x annually.
**Starting point:** Single PostgreSQL on AWS RDS, hitting 65% CPU at peak with all queries on one database.

Evolution:
1. Upgraded from r5.12xlarge to r5.24xlarge (largest available) — bought time
2. Added multiple read replicas + PgBouncer as connection pooler
3. Created new databases for new features to limit growth of the original
4. Vertical partitioning: moved high-traffic table groups (Files, Organizations) to dedicated databases — grew from 1 to 12 databases
5. Only then began exploring horizontal sharding on top of vertically partitioned RDS Postgres

**Key principle:** Minimize developer impact. Every step was incremental — no "big bang" cutover. App developers could focus on features instead of refactoring.

**Lesson:** Exhaust vertical partitioning before horizontal sharding. Going from 1 to 12 databases gave ~12x headroom with far less complexity than sharding.

### Slack — Vitess Migration (3 Years)

**Scale:** Hundreds of thousands of MySQL queries/second, thousands of sharded hosts.
**Problem:** Shard-per-workspace model meant large customers overwhelmed individual shards while thousands of others sat mostly idle.

Migration:
- Chose Vitess: "no other storage system truly fit all of Slack's needs" for flexible "shard by anything"
- Timeline: July 2017 to late 2020 — 3+ years from 0% to 99% adoption
- Scaled from 0 to 2.3 million QPS on Vitess
- Specific migration of a table comprising 20% of overall query load documented in detail

**Lesson:** Sharding migrations at scale take years, not months. Budget accordingly and plan for long dual-write periods.

### Shopify — Vitess with Query Verification

**Architecture:** MySQL + Vitess, sharded by `user_id`.
- User-owned data in sharded "users" keyspace; global/shared data in unsharded "global" keyspace
- Built query verifiers in the application layer that validated query correctness, routing, and data distribution
- Ran verifiers in shadow mode in production before switching traffic
- Credited verifiers as instrumental to the successful migration

**Lesson:** Build verification tooling before migrating. Validate every query against the new sharded topology in production (shadow mode) before cutting over traffic.

---

## Cross-References

- **[data-modeling](../data-modeling.md):** Schema design impacts scaling options. Normalized schemas require JOINs that break under sharding.
- **[sql-vs-nosql](../sql-vs-nosql.md):** NoSQL databases are pre-sharded by design but sacrifice JOINs and transactions.
- **[caching-architecture](../caching-architecture.md):** Level 5 on the scaling ladder. Redis can reduce DB load by 90%+, often eliminating further scaling needs.
- **[horizontal-vs-vertical](../horizontal-vs-vertical.md):** Vertical is always simpler. Horizontal only when vertical limits are reached.
- **[data-consistency](../data-consistency.md):** Every scaling step beyond vertical introduces consistency trade-offs. Understand CAP theorem before choosing.

---

*Last updated: 2026-03-08*
*Sources: [OpenAI Engineering](https://openai.com/index/scaling-postgresql/), [Instagram Engineering](https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c), [Figma Blog](https://www.figma.com/blog/how-figma-scaled-to-multiple-databases/), [Slack Engineering](https://slack.engineering/scaling-datastores-at-slack-with-vitess/), [Shopify Engineering](https://shopify.engineering/horizontally-scaling-the-rails-backend-of-shop-app-with-vitess)*
