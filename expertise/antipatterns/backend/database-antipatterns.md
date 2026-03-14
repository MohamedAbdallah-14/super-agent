# Database Anti-Patterns
> A field guide to the most destructive database design, query, and operational mistakes — with real incident post-mortems, concrete fixes, and detection rules.
> **Domain:** Backend
> **Anti-patterns covered:** 21
> **Highest severity:** Critical

---

## Why Database Anti-Patterns Matter

Database mistakes are uniquely dangerous because they compound silently. A missing index causes no harm at 1,000 rows but brings down production at 10 million. A floating-point money column works fine for months until a reconciliation audit reveals thousands of dollars in drift. Unlike application bugs that crash loudly, database anti-patterns degrade gradually — then fail catastrophically under load, during migrations, or at audit time. Every anti-pattern below has caused real production outages, data loss, or security breaches at known companies. The fixes are almost always straightforward; the hard part is recognizing the pattern before it bites.

---

## Anti-Pattern Catalog

### AP-01: N+1 Query Problem

**Also known as:** Lazy loading trap, chatty queries, query waterfall
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```python
# Fetch all orders, then fetch customer for each order
orders = Order.objects.all()
for order in orders:
    print(order.customer.name)  # Each access fires a separate query
```
This generates 1 query for orders + N queries for customers. With 500 orders, that is 501 database round-trips.

**Why developers do it:**
ORM lazy loading is the default in most frameworks (Django, Rails, Hibernate). The code reads naturally and works fine in development with small datasets. Developers often do not see the generated SQL.

**What goes wrong:**
A checkout service deployment at an e-commerce company introduced an N+1 query that increased per-request database connections from 2 to 11 under load. On November 14 at 23:47 UTC, the checkout service began returning errors to 34% of users. The database connection pool was exhausted within minutes. The 19-minute outage required a rollback. The N+1 was detectable with existing tooling but no query performance review existed in the deployment checklist. Sentry documents N+1 queries as one of the most common performance issues detected in production applications.

**The fix:**
```python
# Before: N+1 (501 queries for 500 orders)
orders = Order.objects.all()
for order in orders:
    print(order.customer.name)

# After: Eager loading (2 queries total)
orders = Order.objects.select_related('customer').all()
for order in orders:
    print(order.customer.name)
```
In SQL, replace the loop with a JOIN:
```sql
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

**Detection rule:**
Flag any request that issues more than 10 queries of the same shape differing only in a WHERE parameter. Tools: django-debug-toolbar, Bullet gem (Rails), Hibernate statistics, Sentry performance monitoring.

---

### AP-02: Missing Indexes on Frequently Queried Columns

**Also known as:** The full table scan, index amnesia
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```sql
-- No index on users.created_at
SELECT * FROM users WHERE created_at > '2025-01-01' ORDER BY created_at;
-- Full table scan on 50 million rows
```

**Why developers do it:**
Indexes are invisible to application code. Queries work identically with or without them at small scale. Developers add columns without considering query patterns, and ORMs do not auto-create indexes on filter/sort columns.

**What goes wrong:**
A documented API outage was caused by a missing index on `users.created_at`. Staging had 10x less traffic than production, so the issue was invisible in testing. The database connection pool was too small for the resulting traffic spike. The endpoint timed out under production load, cascading into a full service outage. The GitLab database outage of January 31, 2017 — while primarily caused by accidental data deletion — was compounded by replication lag from queries running without proper indexes under increased load.

**The fix:**
```sql
-- Add the index
CREATE INDEX idx_users_created_at ON users(created_at);

-- For composite queries, use composite indexes
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```
Run `EXPLAIN ANALYZE` on every slow query and add indexes for any sequential scan on tables above 10,000 rows.

**Detection rule:**
Alert on any query with execution time > 100ms in production. Run `pg_stat_user_tables` (PostgreSQL) or `sys.dm_db_missing_index_details` (SQL Server) weekly.

---

### AP-03: Over-Indexing

**Also known as:** Index hoarding, write penalty creep
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
A table with 12 columns and 39 non-clustered indexes, many of which overlap or are never used by the query planner.

**Why developers do it:**
Each slow query gets "fixed" by adding an index. Nobody removes old indexes. DBAs add indexes reactively without auditing existing ones. Over time, the table accumulates indexes that cover every possible column combination.

**What goes wrong:**
Percona benchmarked PostgreSQL and found that increasing indexes from 7 to 39 reduced write throughput to approximately 42% of the original. For a table with 9 non-clustered indexes, every INSERT requires 10 writes to the transaction log (one per index plus the clustered index). Index bloat consumes memory that could be used for data caching, and the query optimizer becomes confused when presented with many similar indexes, choosing suboptimal execution plans.

**The fix:**
```sql
-- PostgreSQL: find unused indexes
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(i.indexrelid))
FROM pg_stat_user_indexes i
JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0 AND NOT indisunique
ORDER BY pg_relation_size(i.indexrelid) DESC;

-- Drop unused indexes
DROP INDEX CONCURRENTLY idx_never_used;
```
Audit indexes quarterly. Remove any non-unique index with zero scans over a 30-day observation window.

**Detection rule:**
Flag tables where the number of indexes exceeds the number of columns, or where any index has had zero scans in 30+ days.

---

### AP-04: God Table

**Also known as:** The mega-table, kitchen sink table, one table to rule them all
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```sql
CREATE TABLE records (
    id INT PRIMARY KEY,
    type VARCHAR(50),          -- 'user', 'order', 'product', 'log', 'event'
    name VARCHAR(255),
    email VARCHAR(255),        -- only for type='user'
    price DECIMAL(10,2),       -- only for type='product'
    quantity INT,              -- only for type='order'
    log_level VARCHAR(20),     -- only for type='log'
    payload TEXT,
    -- ... 200 more columns, most NULL for any given row
);
```

**Why developers do it:**
Starts as a quick prototype. Adding a new entity type means just adding a column instead of a new table with migrations. Developers avoid the perceived overhead of schema changes. The table "works" at first.

**What goes wrong:**
A mid-sized e-commerce platform built a God Table for all transaction data. It started with 50 columns and grew to over 200. Queries became monstrosities scanning millions of rows for simple lookups. Performance degraded from milliseconds to seconds during peak hours. Row size exceeded page limits, forcing row-overflow storage. Indexes became enormous because every row was indexed regardless of type.

**The fix:**
Decompose into domain-specific tables:
```sql
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255));
CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2));
CREATE TABLE orders (id INT PRIMARY KEY, user_id INT REFERENCES users(id), quantity INT);
CREATE TABLE logs (id INT PRIMARY KEY, log_level VARCHAR(20), payload TEXT);
```

**Detection rule:**
Flag any table with more than 30 columns, or any table where more than 40% of columns are NULL in the average row.

---

### AP-05: Entity-Attribute-Value (EAV) Abuse

**Also known as:** The schema-free relational table, property bag, open schema
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```sql
CREATE TABLE attributes (
    entity_id INT,
    attribute_name VARCHAR(255),
    attribute_value TEXT
);

-- Storing a product with name, price, color:
INSERT INTO attributes VALUES (1, 'name', 'Widget');
INSERT INTO attributes VALUES (1, 'price', '29.99');
INSERT INTO attributes VALUES (1, 'color', 'blue');
```

**Why developers do it:**
Provides maximum flexibility for dynamic schemas. Avoids migrations when adding new attributes. Commonly seen in CMS platforms, e-commerce (Magento famously uses EAV), and multi-tenant SaaS.

**What goes wrong:**
Magento's EAV model is well-documented: with 100,000 entities and 400 attributes, the attribute tables can reach 100,000,000 entries. Simple entity retrieval requires expensive multi-table JOINs (one per attribute). Data type enforcement is impossible — `price` stored as TEXT means no numeric validation. Typos silently create new attributes. You cannot declare foreign keys, CHECK constraints, or NOT NULL on individual attributes. Query complexity explodes: retrieving a single "row" of data requires pivoting across dozens of joins.

**The fix:**
For moderate schema variation, use a JSONB column:
```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    attributes JSONB  -- for truly dynamic fields
);

-- Query with indexing support
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);
SELECT * FROM products WHERE attributes->>'color' = 'blue';
```
For extreme variation, consider a document database (MongoDB, DynamoDB) instead of forcing EAV into a relational schema.

**Detection rule:**
Flag any table with columns named `attribute_name`/`attribute_value` or `key`/`value` where the table has more than 100,000 rows.

---

### AP-06: Implicit Columns (SELECT *)

**Also known as:** The wildcard query, kitchen sink select
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```sql
SELECT * FROM users WHERE id = 42;
```
Application only uses `id`, `name`, and `email` — but the table has 35 columns including a TEXT bio and a BYTEA avatar.

**Why developers do it:**
It is less typing. Works fine during initial development. ORMs default to loading full model objects. Developers do not think about which columns are actually needed.

**What goes wrong:**
SELECT * fetches all columns including large TEXT and BLOB fields, increasing I/O, network transfer, and memory usage. It defeats covering indexes (the query planner cannot use an index-only scan). When new columns are added to the table, existing code silently fetches them — potentially including sensitive data (SSN, tokens). On BigQuery and similar pay-per-scan services, SELECT * on a TB-sized table with dozens of columns can cost hundreds of dollars per query when only four columns are needed.

**The fix:**
```sql
-- Before
SELECT * FROM users WHERE id = 42;

-- After
SELECT id, name, email FROM users WHERE id = 42;
```
In ORMs:
```python
# Django: use .only() or .values()
User.objects.filter(id=42).only('id', 'name', 'email')

# Rails: use .select()
User.where(id: 42).select(:id, :name, :email)
```

**Detection rule:**
Static analysis: grep for `SELECT *` in application code and queries. Exclude migrations and backup scripts.

---

### AP-07: Storing Delimited Lists in a Single Column

**Also known as:** Jaywalking, CSV column, comma-separated hell
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```sql
CREATE TABLE articles (
    id INT PRIMARY KEY,
    title VARCHAR(255),
    tags VARCHAR(1000)  -- stores "python,database,tutorial"
);
```

**Why developers do it:**
Avoids creating a junction table. Simpler INSERT statements. Fewer tables in the schema. The application can easily split on commas. It is Chapter 1 of Bill Karwin's "SQL Antipatterns" because it is so pervasive.

**What goes wrong:**
You cannot enforce uniqueness within the list (duplicates like `"python,python,python"` are valid). You cannot enforce data types or referential integrity. Searching requires `LIKE '%python%'` which cannot use indexes and produces false positives (`LIKE '%java%'` matches `"javascript"`). JOINs are impossible. Sorting, counting, and aggregation require application-side parsing. Column length limits silently truncate data. A healthcare application stored diagnosis codes as comma-delimited lists; a truncated ICD code led to a misclassified billing record that triggered an insurance audit.

**The fix:**
```sql
-- Junction table
CREATE TABLE article_tags (
    article_id INT REFERENCES articles(id),
    tag_id INT REFERENCES tags(id),
    PRIMARY KEY (article_id, tag_id)
);
```
If you need flexibility without a junction table, use native array types:
```sql
-- PostgreSQL array column
ALTER TABLE articles ADD COLUMN tags TEXT[];
CREATE INDEX idx_articles_tags ON articles USING GIN (tags);
SELECT * FROM articles WHERE 'python' = ANY(tags);
```

**Detection rule:**
Flag any VARCHAR/TEXT column that contains commas or semicolons in more than 50% of its rows.

---

### AP-08: Not Using Transactions Where Needed

**Also known as:** Implicit auto-commit, partial write, split-brain writes
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
```python
# Transfer money without a transaction
def transfer(from_id, to_id, amount):
    db.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
    # Application crashes here -- money vanished
    db.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
```

**Why developers do it:**
Many ORMs and database drivers default to auto-commit mode, so each statement commits immediately. Developers assume the code runs atomically because it is in the same function. Transaction management feels like boilerplate.

**What goes wrong:**
Money disappears from one account but never arrives in another. Inventory is decremented but the order is never created. In a widely reported incident, the Travis CI database outage of March 13, 2018, a query was accidentally run against the production database which truncated all tables — the query was blocked for around 10 minutes before finally executing. Proper transaction boundaries and rollback procedures could have prevented the data loss.

**The fix:**
```python
def transfer(from_id, to_id, amount):
    with db.transaction():
        db.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
        db.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
        # Both succeed or both roll back
```
Establish a rule: any operation that modifies more than one row or more than one table must be wrapped in an explicit transaction.

**Detection rule:**
Audit application code for sequences of write statements (`INSERT`, `UPDATE`, `DELETE`) without an enclosing `BEGIN`/`COMMIT` or ORM transaction context manager.

---

### AP-09: Premature Denormalization

**Also known as:** Speculative optimization, copy-paste schema
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(255),     -- copied from users table
    user_email VARCHAR(255),    -- copied from users table
    product_name VARCHAR(255),  -- copied from products table
    product_price DECIMAL(10,2) -- copied from products table
);
```

**Why developers do it:**
Fear of JOIN performance. "We might need it to be fast later." Cargo-culting advice from high-scale systems (Facebook, Twitter) without having the same traffic. Premature denormalization is a specific case of premature optimization.

**What goes wrong:**
When a user changes their email, you must update every order row that copied it — or accept stale data. Write amplification increases as every INSERT must propagate to denormalized copies. A SaaS platform denormalized customer addresses into every invoice, shipment, and support ticket table. When a customer changed address, 4 out of 7 tables were updated but 3 were missed. The customer received a shipment at the old address three months after moving. Data inconsistency is the inevitable consequence of denormalization without automated synchronization.

**The fix:**
Normalize first. Denormalize only when:
1. You have measured an actual performance problem with `EXPLAIN ANALYZE`
2. You have exhausted index and query optimization
3. You implement automated synchronization (triggers, materialized views, or change-data-capture)

```sql
-- Use a materialized view instead of denormalizing the base tables
CREATE MATERIALIZED VIEW order_details AS
SELECT o.id, o.user_id, u.name, u.email, p.name AS product_name, p.price
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id;

-- Refresh on a schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY order_details;
```

**Detection rule:**
Flag any column whose name matches `[table]_[column]` pattern (e.g., `user_name` in the `orders` table) where a foreign key to that table already exists.

---

### AP-10: Missing Foreign Key Constraints

**Also known as:** Orphan rows, referential anarchy, trust-the-app integrity
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,  -- no REFERENCES clause
    product_id INT  -- no REFERENCES clause
);
-- Nothing prevents user_id = 999999 when no such user exists
```

**Why developers do it:**
"The application handles validation." Foreign keys slow down bulk inserts. Microservice architectures discourage cross-service foreign keys. NoSQL migrations leave teams unfamiliar with constraints. A survey by Dataedo found that many production databases — some with over 200 tables — had zero foreign key constraints.

**What goes wrong:**
Orphan rows accumulate silently. An `orders` row references a deleted user, causing NullPointerExceptions when the application tries to display the user name. Reports produce incorrect counts. A MySQL bug (Bug #16039) documented that data integrity was not validated after foreign key constraints were re-enabled, allowing orphaned records to persist. SQLite does not enforce foreign keys by default (`PRAGMA foreign_keys = ON` must be set explicitly), leading to widespread orphan data in mobile applications.

**The fix:**
```sql
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id);
```
For bulk load performance, disable constraints temporarily:
```sql
SET session_replication_role = 'replica';  -- PostgreSQL: disables FK checks
-- ... bulk load ...
SET session_replication_role = 'origin';
```

**Detection rule:**
Query `information_schema.columns` for any `_id` suffixed column that lacks a corresponding entry in `information_schema.table_constraints`.

---

### AP-11: Using OFFSET for Pagination

**Also known as:** Offset creep, page drift, skip-scan pagination
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```sql
-- Page 5000 of results
SELECT * FROM products ORDER BY created_at LIMIT 20 OFFSET 100000;
```
The database scans 100,020 rows, sorts them, then discards the first 100,000.

**Why developers do it:**
OFFSET/LIMIT is the simplest pagination API. Every SQL tutorial teaches it. ORMs generate it by default (`.page(5000)` in Rails/Django). It works fine for the first few pages.

**What goes wrong:**
Performance degrades linearly with offset size. Sentry documented that query times dropped from approximately 8 seconds to approximately 13 milliseconds when switching from OFFSET to cursor-based pagination on large datasets. GitLab invested significant engineering effort to optimize offset pagination across their application because it was causing measurable performance degradation. Additionally, if rows are inserted or deleted between page requests, users see duplicated or missing rows.

**The fix:**
```sql
-- Before: OFFSET pagination (slow at high offsets)
SELECT * FROM products ORDER BY created_at LIMIT 20 OFFSET 100000;

-- After: Keyset/cursor pagination (constant time)
SELECT * FROM products
WHERE created_at > '2025-06-15T10:30:00Z'  -- cursor from previous page
ORDER BY created_at
LIMIT 20;
```
Return the cursor (last row's sort key) to the client with each response. The client passes it back for the next page.

**Detection rule:**
Flag any query where OFFSET exceeds 1,000, or any API endpoint that accepts a `page` parameter without a `cursor` alternative.

---

### AP-12: Storing Money as Floating Point

**Also known as:** IEEE 754 rounding trap, penny shaving, float finance
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```sql
CREATE TABLE transactions (
    id INT PRIMARY KEY,
    amount FLOAT  -- NEVER do this for money
);
```
```python
>>> 0.1 + 0.2
0.30000000000000004
```

**Why developers do it:**
FLOAT is the default numeric type developers reach for. It "works" in casual testing. The rounding errors are invisible in small transactions. Some ORMs map to FLOAT by default.

**What goes wrong:**
A German retail bank's mortgage calculation system used floating-point arithmetic for compound interest. Over 5 years, accumulated errors meant some customers overpaid by hundreds of euros while others underpaid, resulting in a EUR 12 million correction and regulatory fines. High-frequency trading algorithms at the London Stock Exchange generated thousands of erroneous trades when floating-point errors accumulated during rapid price calculations, forcing a 45-minute trading halt costing millions in lost volume. A cryptocurrency exchange lost $50,000 when floating-point rounding allowed attackers to exploit tiny fractional differences. Modern Treasury explicitly documents why they use 64-bit integers instead of floats for all monetary values.

**The fix:**
```sql
-- Use DECIMAL/NUMERIC with explicit precision
CREATE TABLE transactions (
    id INT PRIMARY KEY,
    amount DECIMAL(19, 4) NOT NULL  -- 19 digits, 4 decimal places
);
```
Or store as integer cents/smallest currency unit:
```python
# Store $29.99 as 2999 (integer cents)
amount_cents = int(round(dollars * 100))

# Display
display_amount = f"${amount_cents / 100:.2f}"
```

**Detection rule:**
Flag any column of type FLOAT, DOUBLE, or REAL in tables with names containing `price`, `amount`, `cost`, `balance`, `payment`, or `salary`.

---

### AP-13: Not Handling NULL Properly

**Also known as:** The billion-dollar NULL, three-valued logic trap
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
```sql
-- This returns NO rows, even if discount is NULL
SELECT * FROM products WHERE discount != 10;

-- This is always UNKNOWN, not TRUE
SELECT * FROM products WHERE NULL = NULL;

-- Aggregation silently drops NULLs
SELECT AVG(rating) FROM reviews;  -- ignores unrated reviews
```

**Why developers do it:**
Developers think in two-valued logic (true/false). SQL's three-valued logic (TRUE, FALSE, UNKNOWN) is counterintuitive. Most programming languages do not have an equivalent to SQL NULL semantics. `NULL != 10` evaluating to UNKNOWN (not TRUE) surprises everyone.

**What goes wrong:**
Queries silently return incorrect results. A reporting system calculated average customer satisfaction by running `AVG(rating)` — which silently excluded all customers who had not rated, inflating the score from 3.2 to 4.1 and misleading the executive team. NOT IN with NULLs returns empty result sets: `WHERE id NOT IN (1, 2, NULL)` returns zero rows because `id != NULL` is always UNKNOWN.

**The fix:**
```sql
-- Use IS NULL / IS NOT NULL
SELECT * FROM products WHERE discount IS DISTINCT FROM 10;

-- Handle NULLs in aggregation
SELECT AVG(COALESCE(rating, 0)) FROM reviews;
-- Or explicitly filter
SELECT AVG(rating) FROM reviews WHERE rating IS NOT NULL;

-- Use NOT EXISTS instead of NOT IN
SELECT * FROM users u
WHERE NOT EXISTS (SELECT 1 FROM blacklist b WHERE b.user_id = u.id);
```
Define columns as NOT NULL with sensible defaults wherever possible:
```sql
ALTER TABLE products ALTER COLUMN discount SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN discount SET NOT NULL;
```

**Detection rule:**
Flag any `WHERE col != value` or `WHERE col NOT IN (...)` where the column is nullable. Flag `NOT IN` subqueries on nullable columns.

---

### AP-14: Soft Delete Everywhere

**Also known as:** Logical delete, is_deleted creep, the undead row
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
```sql
-- Every table gets this
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP NULL;

-- Every query must include this filter
SELECT * FROM users WHERE deleted_at IS NULL;
```

**Why developers do it:**
Fear of data loss. Audit requirements (perceived, not always real). "What if we need to restore it?" Undo functionality. It feels safer than actual deletion.

**What goes wrong:**
Every SELECT, JOIN, and subquery must include `WHERE deleted_at IS NULL` — a single omission leaks "deleted" data into results. Foreign keys become meaningless: a soft-deleted user's orders still reference a valid row, so the constraint does not fire. Unique constraints break: you cannot recreate a user with the same email because the soft-deleted row occupies the unique slot. GDPR requires actual deletion of personal data; soft deletes do not comply. Over time, tables bloat with ghost rows that slow queries and consume storage. Django's `django-model-utils` library has an open issue (#364) titled "SoftDelete is an anti-pattern."

**The fix:**
Use soft deletes only where legally required (audit trails, financial records). For everything else:
```sql
-- Archive to a separate table before hard delete
INSERT INTO users_archive SELECT * FROM users WHERE id = 42;
DELETE FROM users WHERE id = 42;
```
For databases that support it, use temporal tables:
```sql
-- SQL Server temporal table
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START,
    SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END,
    PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime)
) WITH (SYSTEM_VERSIONING = ON);
```

**Detection rule:**
Flag any schema where more than 50% of tables have a `deleted_at`, `is_deleted`, or `deleted` column.

---

### AP-15: Database as Message Queue

**Also known as:** Poll table, job queue table, database-as-IPC
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```sql
CREATE TABLE job_queue (
    id SERIAL PRIMARY KEY,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    locked_by VARCHAR(255),
    locked_at TIMESTAMP
);

-- Worker polls every second
SELECT * FROM job_queue WHERE status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
```

**Why developers do it:**
Avoids adding a new infrastructure component (RabbitMQ, Kafka, Redis). The database is already there. Transactional guarantees feel reassuring. Small-scale systems work fine with this pattern.

**What goes wrong:**
A financial service used a queue table for fraud checks. Multiple anti-fraud workers scanning simultaneously caused database locks, deadlocks, and timeout cascading. Polling every second across many workers saturated the database with read operations. A ride-sharing application using database queues for ride requests experienced CPU and memory contention between queue operations and normal transactional queries, degrading both. The fundamental problem: databases optimize for data storage and retrieval, not for the produce-consume-delete lifecycle of messages.

**The fix:**
Use a purpose-built message broker:
```python
# Before: database polling
while True:
    job = db.query("SELECT * FROM job_queue WHERE status='pending' LIMIT 1 FOR UPDATE")
    process(job)
    db.query("UPDATE job_queue SET status='done' WHERE id=%s", job.id)
    time.sleep(1)

# After: Redis/RabbitMQ
import redis
r = redis.Redis()
while True:
    job = r.brpop('job_queue')  # blocks until message available, no polling
    process(job)
```
If you must use the database (small scale, strong consistency required), use PostgreSQL `LISTEN`/`NOTIFY` instead of polling.

**Detection rule:**
Flag any table with columns named `status`, `locked_by`, `locked_at` together, or any query pattern with `FOR UPDATE SKIP LOCKED` in a polling loop.

---

### AP-16: Storing Files/BLOBs in the Database

**Also known as:** BLOB bloat, binary column trap
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```sql
CREATE TABLE documents (
    id INT PRIMARY KEY,
    filename VARCHAR(255),
    content BYTEA,  -- storing entire PDF/image in the database
    uploaded_at TIMESTAMP
);
```

**Why developers do it:**
Transactional consistency with metadata. Single backup includes everything. No external storage configuration needed. Simpler deployment for small applications.

**What goes wrong:**
A 100MB file stored as a BLOB kills query performance, backup times, and replication. SQL Server's 8K data pages force BLOBs into off-row storage, bloating filegroups. BLOBs consume buffer pool memory meant for hot row data. Every full and differential backup includes every file ever uploaded, regardless of whether it changed. Brent Ozar documented a case where moving BLOBs out of SQL Server freed enough resources to eliminate the need for a planned hardware upgrade. Replication lag increases because binary data must be shipped to every replica.

**The fix:**
```python
# Store file in object storage, reference in database
import boto3

s3 = boto3.client('s3')
s3.upload_file('report.pdf', 'my-bucket', f'documents/{doc_id}/report.pdf')

# Database stores only the reference
db.execute(
    "INSERT INTO documents (id, filename, s3_key, uploaded_at) VALUES (%s, %s, %s, NOW())",
    (doc_id, 'report.pdf', f'documents/{doc_id}/report.pdf')
)
```

**Detection rule:**
Flag any BYTEA, BLOB, LONGBLOB, or VARBINARY(MAX) column in a table with more than 10,000 rows or total table size exceeding 1 GB.

---

### AP-17: Missing Migration Rollback Plans

**Also known as:** One-way migration, deploy and pray, irreversible DDL
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
```python
# Migration: drop a column
class Migration:
    def up(self):
        self.execute("ALTER TABLE users DROP COLUMN legacy_role;")

    def down(self):
        pass  # "We'll never need to roll back"
```

**Why developers do it:**
Rollback migrations are tedious to write. "We tested in staging." Dropping columns and tables is easy; recreating them with data is hard. Time pressure skips the rollback step.

**What goes wrong:**
Val Town experienced a 12-minute outage when database migrations deployed successfully but application code deployment hung. The new migrations were incompatible with the old application code. When they attempted to roll back, the rollback was rejected because the migration had already succeeded and the system's rollback guard prevented re-entry. GitHub's June 2025 outage cascaded from a routine database migration into a platform-wide crisis affecting Git operations, GitHub Actions, Pages, Codespaces, and API endpoints. The engineering team had to execute emergency rollback procedures. A Rails application dropped a column, then when the code was rolled back, the old code crashed because the column was gone — and the migration was irreversible.

**The fix:**
```python
class Migration:
    def up(self):
        # Step 1: Stop reading the column in application code (deploy first)
        # Step 2: Add column to ignore list
        # Step 3: Drop column in a separate migration after confirming no reads
        self.execute("ALTER TABLE users DROP COLUMN legacy_role;")

    def down(self):
        self.execute("ALTER TABLE users ADD COLUMN legacy_role VARCHAR(50);")
        self.execute("UPDATE users SET legacy_role = 'member';")  # safe default
```
Follow the expand-contract pattern: add new columns first, migrate data, update code, then remove old columns in a later migration.

**Detection rule:**
Flag any migration with `DROP COLUMN`, `DROP TABLE`, or `ALTER COLUMN TYPE` that has an empty or missing `down()` method.

---

### AP-18: Polymorphic Associations Without Constraints

**Also known as:** Dual-purpose foreign key, type-id pattern, Rails polymorphic
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```sql
CREATE TABLE comments (
    id INT PRIMARY KEY,
    body TEXT,
    commentable_type VARCHAR(50),  -- 'Article', 'Video', 'Photo'
    commentable_id INT             -- could reference articles, videos, or photos
);
-- No foreign key possible: commentable_id could point to any table
```

**Why developers do it:**
Rails `belongs_to :commentable, polymorphic: true` makes it a one-liner. Avoids creating separate `article_comments`, `video_comments`, and `photo_comments` tables. Reduces table count.

**What goes wrong:**
No foreign key constraint can be declared because `commentable_id` references different tables depending on `commentable_type`. The database cannot enforce referential integrity — you can have a comment pointing to `Article #999` when no such article exists. Rails does not check referential integrity for polymorphic associations. Queries are slower because the database must check both `commentable_type` and `commentable_id`. You cannot use JOINs naturally; the application must construct different queries per type. GitLab's development guidelines explicitly warn against polymorphic associations in their database design documentation.

**The fix:**
Use exclusive belongs-to (separate nullable foreign keys):
```sql
CREATE TABLE comments (
    id INT PRIMARY KEY,
    body TEXT,
    article_id INT REFERENCES articles(id),
    video_id INT REFERENCES videos(id),
    photo_id INT REFERENCES photos(id),
    CONSTRAINT one_parent CHECK (
        (article_id IS NOT NULL)::INT +
        (video_id IS NOT NULL)::INT +
        (photo_id IS NOT NULL)::INT = 1
    )
);
```
Or use a shared base table with inheritance:
```sql
CREATE TABLE commentable_items (id INT PRIMARY KEY, type VARCHAR(50));
CREATE TABLE articles (id INT PRIMARY KEY REFERENCES commentable_items(id));
CREATE TABLE comments (
    id INT PRIMARY KEY,
    commentable_item_id INT REFERENCES commentable_items(id)
);
```

**Detection rule:**
Flag any column pair `*_type`/`*_id` where the `*_id` column has no foreign key constraint.

---

### AP-19: Over-Reliance on ORM (Ignoring SQL)

**Also known as:** ORM tunnel vision, abstraction ceiling, query generator abuse
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
```python
# Django: fetching data for a report
users = User.objects.all()
result = []
for user in users:
    order_count = Order.objects.filter(user=user).count()
    total_spent = Order.objects.filter(user=user).aggregate(Sum('amount'))['amount__sum']
    result.append({'user': user.name, 'orders': order_count, 'total': total_spent})
```
This generates 2N+1 queries and does aggregation in Python instead of the database.

**Why developers do it:**
ORMs abstract away SQL, so developers never learn it. The code looks clean and object-oriented. "We should not write raw SQL." The ORM generates valid SQL, so developers assume it generates efficient SQL. Teams ban raw SQL for consistency.

**What goes wrong:**
ORMs generate suboptimal queries that are invisible unless you inspect the SQL log. Developers have reported incidents where ORMs caused servers to run out of memory from materializing entire result sets. Complex reports that could be a single SQL query with GROUP BY and window functions become N+1 loops with application-side aggregation. An e-commerce platform rewrote a product recommendation query from ORM code to raw SQL, reducing response time from 4.2 seconds to 80 milliseconds — a 50x improvement.

**The fix:**
```python
# Before: ORM loop (2N+1 queries)
for user in User.objects.all():
    count = Order.objects.filter(user=user).count()

# After: Single SQL query via ORM
from django.db.models import Count, Sum
users = User.objects.annotate(
    order_count=Count('orders'),
    total_spent=Sum('orders__amount')
).values('name', 'order_count', 'total_spent')
```
For complex analytics, use raw SQL:
```python
users = User.objects.raw('''
    SELECT u.id, u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id, u.name
    HAVING SUM(o.amount) > 1000
''')
```
Rule of thumb: if you cannot express it in one ORM call, consider raw SQL.

**Detection rule:**
Flag any loop that calls ORM query methods (`.filter()`, `.get()`, `.count()`) inside a for-each over a queryset.

---

### AP-20: Not Using Connection Pooling

**Also known as:** Connection thrashing, connect-per-request, pool exhaustion
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
```python
# New connection for every request
def handle_request(request):
    conn = psycopg2.connect(host='db', dbname='app')  # TCP handshake + auth every time
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (request.user_id,))
    result = cursor.fetchone()
    conn.close()  # connection destroyed
    return result
```

**Why developers do it:**
The simplest database tutorial code opens and closes connections per-request. Connection pooling requires additional configuration or libraries. Serverless environments (Lambda, Cloud Functions) make pooling non-trivial. Developers do not realize that connection establishment takes 20-100ms of overhead per request.

**What goes wrong:**
LinkedIn experienced a 4-hour outage when a stored procedure became slow, holding connections open until the pool was exhausted. PostgreSQL's default `max_connections` (100) is easily exceeded by a moderately loaded web application — each connection consumes approximately 10MB of RAM on the server. Without pooling, a spike to 200 concurrent requests opens 200 connections, overwhelming the database. Connection pool exhaustion is described as "the most insidious failure in distributed systems because it looks invisible until it destroys everything."

**The fix:**
```python
# Use a connection pool
from psycopg2 import pool

connection_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host='db',
    dbname='app'
)

def handle_request(request):
    conn = connection_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (request.user_id,))
        return cursor.fetchone()
    finally:
        connection_pool.putconn(conn)  # return to pool, not destroyed
```
For serverless: use PgBouncer, RDS Proxy, or Supabase connection pooler as an external pool.

**Detection rule:**
Flag any code path that calls `connect()` without going through a pool. Monitor `pg_stat_activity` for connection count spikes correlated with request volume.

---

### AP-21: Lock Contention from Long Transactions

**Also known as:** Transaction scope creep, hold-and-wait, lock chain
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
```python
with db.transaction():
    order = db.query("SELECT * FROM orders WHERE id = %s FOR UPDATE", order_id)
    # ... call external payment API (takes 2-30 seconds) ...
    payment_result = payment_gateway.charge(order.amount)
    # ... lock held the entire time ...
    db.execute("UPDATE orders SET status = 'paid' WHERE id = %s", order_id)
```

**Why developers do it:**
Developers wrap everything in a transaction "for safety." External API calls, file I/O, and user-facing waits get included inside the transaction scope. The transaction feels like a safety net, so its scope expands to cover more operations.

**What goes wrong:**
A documented production incident showed that in a 45-minute window, hundreds of connections were stuck waiting for locked resources. A dangerous combination of concurrent queries, poorly tuned indexes, and long transactions caused severe slowness, API failures, and resource saturation across an entire environment. The classic lock chain: Transaction A locks row 1 and waits for row 2; Transaction B locks row 2 and waits for row 1 — deadlock. Even without deadlocks, long-held locks cause cascading waits where every subsequent request queues behind the blocked one.

**The fix:**
```python
# Before: External call inside transaction (lock held for seconds)
with db.transaction():
    order = db.query("SELECT * FROM orders WHERE id = %s FOR UPDATE", order_id)
    payment_result = payment_gateway.charge(order.amount)
    db.execute("UPDATE orders SET status = 'paid' WHERE id = %s", order_id)

# After: Minimize transaction scope
order = db.query("SELECT * FROM orders WHERE id = %s", order_id)
payment_result = payment_gateway.charge(order.amount)  # outside transaction

with db.transaction():
    db.execute(
        "UPDATE orders SET status = 'paid' WHERE id = %s AND status = 'pending'",
        order_id
    )
    # Optimistic concurrency: check affected rows
    if db.rowcount == 0:
        raise ConcurrencyError("Order was modified concurrently")
```
Rules: never call external services inside a transaction, never allow user interaction inside a transaction, keep transactions under 100ms.

**Detection rule:**
Monitor for transactions exceeding 1 second in duration. Alert on rising `lock_wait_time` metrics. Flag any transaction that contains HTTP calls or sleep statements.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns Triggered | Frequency |
|---|---|---|
| ORM defaults hiding SQL behavior | AP-01, AP-06, AP-11, AP-19 | Very Common |
| "Works in dev" / small dataset blindness | AP-02, AP-03, AP-04, AP-11, AP-12 | Very Common |
| Skipping schema design for speed | AP-04, AP-05, AP-07, AP-09, AP-10, AP-18 | Common |
| Fear of data loss | AP-14, AP-16, AP-17 | Common |
| Premature optimization cargo cult | AP-03, AP-09, AP-15 | Common |
| Not understanding SQL semantics | AP-08, AP-12, AP-13 | Common |
| Infrastructure avoidance | AP-15, AP-20 | Common |
| Framework conventions over correctness | AP-01, AP-14, AP-18, AP-19 | Common |
| Missing deployment safety checks | AP-02, AP-17, AP-21 | Common |
| Transaction scope misunderstanding | AP-08, AP-21 | Common |

---

## Self-Check Questions

Before deploying database changes, ask:

1. **Have I run `EXPLAIN ANALYZE` on every new query against production-sized data?** (catches AP-02, AP-03, AP-11)
2. **Does any request issue more than 5 queries of the same shape?** (catches AP-01)
3. **Am I storing data in a column that belongs in a separate table?** (catches AP-04, AP-05, AP-07)
4. **Do all multi-statement writes use explicit transactions?** (catches AP-08)
5. **Is every `_id` column backed by a foreign key constraint?** (catches AP-10, AP-18)
6. **Can I write the rollback migration for this schema change?** (catches AP-17)
7. **Am I using FLOAT/DOUBLE for any monetary value?** (catches AP-12)
8. **Does my WHERE clause handle NULL correctly?** (catches AP-13)
9. **Am I calling external services or APIs inside a database transaction?** (catches AP-21)
10. **Does this query use SELECT * when only specific columns are needed?** (catches AP-06)
11. **Is my pagination using OFFSET on a table that could exceed 100K rows?** (catches AP-11)
12. **Am I adding soft delete to a table where hard delete plus an archive table would suffice?** (catches AP-14)
13. **Am I storing binary files larger than 1MB directly in the database?** (catches AP-16)
14. **Is my connection pool properly sized for peak traffic?** (catches AP-20)
15. **Am I denormalizing data before proving a measured performance problem exists?** (catches AP-09)

---

## Code Smell Quick Reference

| Smell | Likely Anti-Pattern | Severity | First Check |
|---|---|---|---|
| Loop calling `.get()` / `.filter()` per item | AP-01: N+1 Query | High | Add `select_related` / `prefetch_related` |
| Sequential scan on table > 10K rows | AP-02: Missing Index | Critical | Run `EXPLAIN ANALYZE` |
| Table with more indexes than columns | AP-03: Over-Indexing | Medium | Audit unused indexes |
| Table with 50+ columns, many nullable | AP-04: God Table | High | Decompose by domain entity |
| `attribute_name` / `attribute_value` columns | AP-05: EAV Abuse | High | Use JSONB or separate tables |
| `SELECT *` in application queries | AP-06: Implicit Columns | Medium | Specify column list |
| Commas inside VARCHAR data | AP-07: Delimited Lists | High | Create junction table |
| Multiple writes without `BEGIN`/`COMMIT` | AP-08: Missing Transaction | Critical | Wrap in transaction |
| Duplicated columns across tables | AP-09: Premature Denormalization | Medium | Normalize, use views |
| `_id` column without REFERENCES | AP-10: Missing FK | High | Add foreign key |
| `OFFSET` > 1000 in any query | AP-11: OFFSET Pagination | Medium | Switch to keyset pagination |
| FLOAT column for money | AP-12: Float Money | Critical | Use DECIMAL or integer cents |
| `WHERE col != value` on nullable column | AP-13: NULL Mishandling | Medium | Use `IS DISTINCT FROM` |
| `deleted_at` on most tables | AP-14: Soft Delete Everywhere | Medium | Archive table + hard delete |
| `status`/`locked_by`/`locked_at` columns | AP-15: DB as Queue | High | Use a message broker |
| BYTEA/BLOB columns on large tables | AP-16: BLOB Storage | Medium | Move to object storage |
| Migration `down()` method is empty | AP-17: No Rollback Plan | Critical | Write the rollback migration |
| `*_type` + `*_id` column pair, no FK | AP-18: Polymorphic Assoc | High | Use exclusive belongs-to |
| ORM queries inside for-loops | AP-19: ORM Over-Reliance | Medium | Use annotations or raw SQL |
| `connect()` call per request, no pool | AP-20: No Connection Pool | Critical | Add connection pooler |
| External API call inside `BEGIN`/`COMMIT` | AP-21: Long Transactions | Critical | Move API call outside txn |

---

*Researched: 2026-03-08 | Sources: PlanetScale (N+1 queries), Sentry (N+1 detection), GitLab (Jan 2017 DB outage post-mortem, offset pagination optimization, polymorphic association guidelines), Travis CI (Mar 2018 DB truncation), Val Town (migration rollback post-mortem), GitHub (Jun 2025 migration outage), Percona (over-indexing benchmarks), Modern Treasury (integer money storage), Brent Ozar (BLOB removal case study), LinkedIn (connection pool exhaustion), Heartland Payment Systems / Equifax / Yahoo (SQL injection breaches), Magento (EAV architecture documentation), Bill Karwin "SQL Antipatterns Vol. 1", Mike Hadlow (database-as-queue), RavenDB (missed indexing reference post-mortem), CockroachDB (foreign key mistakes), Levitation.in (real-world DB design failures), dbsnOOp (lock contention incident)*
