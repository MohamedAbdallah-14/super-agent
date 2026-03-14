# MongoDB -- Expertise Module

> A MongoDB specialist designs, implements, and operates document-oriented databases using MongoDB (8.x+).
> Scope covers schema design, indexing, query optimization, replication, sharding, security hardening,
> and operational excellence for both Atlas-managed and self-hosted deployments.

---

## Core Patterns & Conventions

### Schema Design Patterns

**Fundamental principle:** Data that is accessed together should be stored together.

- **Embedding:** Use for one-to-few relationships where nested data is tightly coupled to the parent and always retrieved together (e.g., addresses inside a user document).
- **Referencing:** Use when related data is large, unbounded, accessed independently, or shared across parents.
- **Polymorphic pattern:** Store documents with different shapes in one collection, distinguished by a discriminator field (`type: "movie"` vs `type: "tvshow"`). Ideal for product catalogs with variable attributes.
- **Bucket pattern:** Group time-series/event data into fixed-size buckets (one doc per sensor per hour). Reduces document count dramatically for IoT, metrics, and logging.
- **Computed pattern:** Pre-compute frequently read values (averages, counts) during writes. Suited for dashboards and leaderboards where reads vastly outnumber writes.
- **Outlier pattern:** Flag rare documents that violate cardinality assumptions (`has_overflow: true`) and store overflow in a secondary collection.
- **Subset pattern:** Embed frequently accessed fields; store cold data in a separate collection. Keeps working set small.

### Collection Naming Conventions

- Lowercase, plural nouns: `users`, `orders`, `productReviews`.
- Dot-notation for logical grouping: `analytics.pageViews`, `analytics.sessions`.
- Avoid `system.*` prefix (reserved by MongoDB internals).

### Index Strategies

- **Compound indexes:** Follow ESR rule -- Equality fields first, Sort fields second, Range fields last.
- **Multikey indexes:** Auto-created on array fields; each element generates a separate entry. Keep arrays bounded.
- **Text indexes:** Legacy full-text search, one per collection. Prefer Atlas Search for production.
- **Atlas Search:** Lucene-based full-text + vector search. MongoDB 8.0+ adds search to Community Edition.
- **Partial indexes:** Index only documents matching a filter, reducing size and write overhead.
- **Wildcard indexes:** For unpredictable document shapes. Avoid on high-write workloads.
- **TTL indexes:** Auto-delete documents after a duration. Ideal for sessions and tokens.

### Aggregation Pipeline Patterns

- Place `$match` and `$project` early to reduce the working set.
- Use `$lookup` for left-outer joins (MongoDB 8.0+: works in transactions on sharded collections).
- Use `$facet` for multi-dimensional aggregations in one pass.
- Use `$merge`/`$out` to materialize results for downstream consumption.
- Avoid `$unwind` on large arrays -- prefer `$filter` to work with arrays in-place.

### Transaction Patterns (Multi-Document ACID)

Supported across replica sets (since 4.0) and sharded clusters (since 4.2). Best practices:
- Keep transactions under 60 seconds (`transactionLifetimeLimitSeconds`).
- Use `readConcern: "snapshot"` and `writeConcern: { w: "majority" }`.
- Use `session.withTransaction()` for automatic retry on `TransientTransactionError`.
- Design schema to minimize multi-document transaction needs -- embed where possible.

### Connection Management

- Create **one MongoClient per process** and reuse it. Each client maintains its own pool.
- Default `maxPoolSize`: 100. Tune `minPoolSize`, `maxIdleTimeMS`, `waitQueueTimeoutMS`.
- Use `mongodb+srv://` with Atlas for DNS seedlist discovery and failover.
- Enable `retryWrites: true` and `retryReads: true` (defaults since 4.2+).

### Data Modeling for Relationships

- **One-to-Few (N < ~20):** Embed children in the parent.
- **One-to-Many (moderate N):** Array of references in parent, or parent ref in each child.
- **One-to-Squillions (unbounded N):** Always reference. Never embed unbounded arrays.
- **Many-to-Many:** Array of references or a dedicated junction collection.
- **Tree structures:** Parent refs, child refs, materialized paths, or `$graphLookup` for recursive traversal.

### Change Streams

Real-time subscription to data changes, built on the oplog (write-ahead log). Key properties:
- **Resumable** via `resumeToken` for crash recovery.
- **Filterable** using aggregation pipeline stages server-side.
- **Pre/post images** (MongoDB 6.0+): `fullDocumentBeforeChange` captures state before modification.
- **Use cases:** Cache invalidation, real-time dashboards, ETL pipelines, event-driven microservices.

---

## Anti-Patterns & Pitfalls

### 1. Unbounded Array Growth
Continuously pushing to arrays risks the 16 MB BSON limit. Large arrays force MongoDB to rewrite the entire document on every append, degrading write performance and bloating memory.

### 2. Bloated Documents
Storing everything in one document (Base64 images, full logs) forces MongoDB to load megabytes into the WiredTiger cache per read, evicting other documents and tanking performance.

### 3. Using MongoDB as a Relational Database
Over-normalizing into separate collections with `$lookup` joins replicates SQL patterns without SQL's join optimizer. Leads to N+1 query patterns and negates MongoDB's document model strength.

### 4. Missing Indexes (Collection Scans)
Queries without indexes trigger `COLLSCAN` -- reading every document. On 10M documents, that is 10M reads per query. Performance degrades linearly with collection size.

### 5. Too Many Indexes
Each index consumes RAM, slows writes (every mutation updates all indexes), and increases storage. Collections with 15+ indexes on write-heavy workloads see 2-3x slower writes. Use `$indexStats` to drop unused indexes.

### 6. Case-Sensitive Queries Without Collation
`$regex: /^john$/i` bypasses indexes. Fix: use case-insensitive collation on the collection or index.

### 7. No Schema Validation
Without validators, applications write malformed documents and typo-ed fields, causing silent data corruption. Define `$jsonSchema` validators on all collections.

### 8. Default Write Concern (`w: 1`)
Writes acknowledged by the primary only; lost if primary fails before replication. Use `w: "majority"` for critical data.

### 9. Misusing Read Preferences
All reads to primary creates a bottleneck. Reads from secondaries may return stale data. Use `primaryPreferred` for general workloads, `secondary` only for analytics tolerating staleness.

### 10. Storing Large Files in Documents
Files over a few hundred KB waste working set memory and hit the 16 MB limit. Use GridFS or store files in S3 with metadata/URLs in MongoDB.

### 11. String Dates Instead of BSON Date
Storing dates as strings prevents range queries, date operators, and TTL indexes. Always use `new Date()` / `ISODate()`.

### 12. Poor Shard Key Selection
Monotonically increasing keys (e.g., `ObjectId`) route all writes to one shard. Choose high-cardinality, evenly distributed keys. Changing shard keys post-deployment is expensive even with MongoDB 8.0+ unshard support.

### 13. New MongoClient Per Request
Exhausts connection limits (`~1 MB per connection` server-side), causing `connection pool exhausted` errors. Common in serverless without connection reuse.

### 14. Using `$where` / Server-Side JavaScript
Executes JS on the server for every scanned document, bypassing indexes. Orders of magnitude slower and opens NoSQL injection attack surface.

### 15. Deploying Without Replica Sets
Standalone `mongod` has no failover, no oplog, no change streams, and no transactions. Even in dev, use a single-node replica set.

---

## Testing Strategy

### Approaches
1. **Unit tests:** Mock the database layer. Test business logic in isolation.
2. **Integration tests:** Run against a real/in-memory MongoDB. Validate validators, indexes, pipelines.
3. **Contract tests:** Verify app code and schema validators agree on document structure.
4. **Performance tests:** Run queries against production-like volumes. Use `explain()` to verify index usage.

### Testcontainers (Java, .NET, Node.js, Python, Go)
```java
@Testcontainers
class OrderRepositoryTest {
    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:8.0");
    @BeforeAll
    static void setup() { String uri = mongo.getReplicaSetUrl(); }
}
```
Match container version to production. Supports replica sets for transaction testing.

### mongodb-memory-server (Node.js/TypeScript)
Lightweight in-process `mongod` (~7 MB) without Docker:
```typescript
const mongoServer = await MongoMemoryServer.create({ binary: { version: "8.0.0" } });
await mongoose.connect(mongoServer.getUri());
// afterEach: clear collections for isolation
// afterAll: disconnect + stop
```

### Data Seeding
- Use factory functions (`createTestUser()`) over static JSON fixtures.
- Libraries: `fishery` (TS), `factory-boy` (Python). Seed with `bulkWrite` for speed.

### Migration Testing
- Version changes with `migrate-mongo` (Node.js). Test forward and rollback in CI.
- Validate against anonymized production data snapshots.

---

## Performance Considerations

### Query Optimization
- Use `explain("executionStats")`: look for `IXSCAN` vs `COLLSCAN`, check `totalDocsExamined` vs `nReturned`.
- **Covered queries:** When filter, projection, and sort are all in a single index, MongoDB returns from the index without disk reads -- the fastest query path.

### Index Optimization
- **Index intersection** exists but compound indexes almost always outperform it.
- **Partial indexes** reduce size by indexing only matching documents.
- **Wildcard indexes** (`{ "attrs.$**": 1 }`) for unpredictable field names.
- Monitor index size via `db.collection.stats()`. Indexes exceeding available RAM cause dramatic slowdowns.

### Working Set & Memory
- Working set should fit in WiredTiger cache (default: 50% RAM - 1 GB).
- Monitor: `db.serverStatus().wiredTiger.cache`. Alert if cache hit ratio < 95%.

### Sharding
**Shard key criteria:** High cardinality, low frequency, non-monotonic, present in most queries.
- **Hashed sharding:** Even write distribution, no range queries on shard key.
- **Ranged sharding:** Supports range queries, risks hotspots with monotonic keys.
- **Zone sharding:** Pin data to shards by region or classification.

### Read/Write Concern Tradeoffs

| Concern | Durability | Latency | Use Case |
|---------|-----------|---------|----------|
| `w: 1` | Primary only | Fastest | Non-critical logs |
| `w: "majority"` | Replicated | Moderate | Financial data |
| `readConcern: "majority"` | Committed | Moderate | Consistent reads |
| `readConcern: "linearizable"` | Strongest | Highest | Distributed consensus |

### Atlas Performance Advisor
Analyzes slow queries (>100ms), recommends indexes, identifies unused indexes and schema anti-patterns.

---

## Security Considerations

### Authentication
- **SCRAM-SHA-256** (default): Username/password. Rotate regularly.
- **X.509:** Mutual TLS for machine-to-machine auth.
- **LDAP/AD:** Centralized enterprise authentication.
- **AWS IAM:** Available on Atlas.

### Role-Based Access Control
- Enable auth (`security.authorization: enabled`). Principle of least privilege.
- Built-in roles: `read`, `readWrite`, `dbAdmin`, `clusterAdmin`. Create custom roles for fine-grained access.
- Never use `root` for application connections.

### Field-Level Encryption
- **CSFLE:** Encrypts fields client-side before transmission. Deterministic (equality queries) or random encryption. Key management via AWS KMS, Azure Key Vault, GCP KMS. Mongoose 8.15+ native support.
- **Queryable Encryption (QE):** Supports equality (7.0+) and range queries (8.0+) on encrypted fields. Preferred for new applications. Cannot mix with CSFLE on the same collection.

### Network Security
- Enable TLS for all communication (`net.tls.mode: requireTLS`).
- Atlas: use VPC peering or AWS PrivateLink. Restrict via IP access lists.
- Never bind to `0.0.0.0` without firewall rules.

### Audit Logging
Enable `auditLog.destination: file` (Enterprise/Atlas). Route to SIEM for SOC 2, HIPAA, PCI-DSS compliance.

### NoSQL Injection Prevention
- Never concatenate user input into queries. Cast to expected types: `String(req.body.username)`.
- Use `express-mongo-sanitize` to strip `$`-prefixed keys.
- Disable server-side JS: `security.javascriptEnabled: false`.

---

## Integration Patterns

### Driver Patterns
```javascript
// Node.js (mongodb 6.x+) -- reuse one client across all requests
const client = new MongoClient(uri, { maxPoolSize: 50, retryWrites: true, w: "majority" });
```
```python
# Python (PyMongo 4.x+)
client = MongoClient(uri, maxPoolSize=50, retryWrites=True, w="majority")
```

### Mongoose vs. Native Driver

| Aspect | Mongoose 8.x+ | Native Driver |
|--------|---------------|---------------|
| Schema enforcement | Built-in types + validation | Manual JSON Schema |
| Middleware hooks | `pre`/`post` save, validate | Not available |
| Performance | ~2x slower for basic ops | Baseline |
| Aggregation | Leaky abstraction | First-class |

**Use Mongoose** for complex domain models with validation and hooks. **Use native driver** for high-throughput microservices, aggregation-heavy workloads, and serverless (cold start sensitivity).

### Atlas Search Integration
```javascript
const results = await collection.aggregate([
  { $search: { index: "default", compound: {
    must: [{ text: { query: "wireless headphones", path: "title" } }],
    filter: [{ range: { path: "price", gte: 20, lte: 200 } }]
  }}},
  { $limit: 20 },
  { $project: { title: 1, price: 1, score: { $meta: "searchScore" } } }
]).toArray();
```

### Atlas Triggers
- **Database triggers:** Respond to CRUD events. Forward to AWS EventBridge or run functions.
- **Scheduled triggers:** Cron-based periodic tasks.
- Note: Atlas Functions deprecated late 2025 in favor of AWS Lambda / Azure Functions.

### Change Streams for Event-Driven Architecture
Pattern: change stream -> Kafka/RabbitMQ -> downstream consumers. Persist `resumeToken` for crash recovery. Use `fullDocumentBeforeChange` (6.0+) for audit trails.

---

## DevOps & Deployment

### Atlas vs. Self-Managed

| Aspect | Atlas | Self-Managed |
|--------|-------|-------------|
| Setup | Minutes (UI/CLI/Terraform) | Hours to days |
| Maintenance | Automated patches + upgrades | Manual upgrades + OS patches |
| Backup | Continuous with PIT recovery | mongodump, oplog, or Percona Backup |
| Cost at scale | Higher | Lower (factor in ops team cost) |
| Compliance | SOC 2, HIPAA, PCI-DSS ready | DIY |

### Replica Set Configuration
- Minimum 3 members (1 primary + 2 secondaries) for failover.
- Use `priority: 0` for hidden secondaries dedicated to analytics/backups.
- Use `votes: 0` for cross-region DR nodes.

### Backup Strategies
- **Atlas:** Automated continuous backup with PIT recovery.
- **mongodump:** Use `--oplog` for consistency. Run against secondaries. Suitable for < 100 GB.
- **Filesystem snapshots:** Fastest for large datasets. Requires atomic capture of data + journal.
- **Percona Backup (PBM):** Open-source, physical/logical backups, S3 storage.
- **Test restores monthly.** Monitor backup jobs; silent failures are common.

### Monitoring
Key metrics: opcounters, replication lag (alert > 10s), connections, WiredTiger cache ratio, lock contention, read/write tickets.
Tools: `mongostat`, `mongotop`, Atlas Performance Panel, Prometheus + `mongodb_exporter`, Datadog.

### Version Upgrades
Upgrade secondaries first, step down primary, upgrade last. Set `featureCompatibilityVersion` incrementally.
MongoDB 8.0: 25% better throughput, 54% faster bulk inserts, range queries on encrypted fields, cross-collection `bulkWrite`.

### Docker for Development
```yaml
services:
  mongodb:
    image: mongo:8.0
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]
  mongo-init:
    image: mongo:8.0
    depends_on: { mongodb: { condition: service_healthy } }
    entrypoint: mongosh --host mongodb --eval "rs.initiate({ _id:'rs0', members:[{_id:0,host:'mongodb:27017'}] })"
    restart: "no"
volumes:
  mongo-data:
```
Always use a replica set in dev for transactions, change streams, and full feature access.

---

## Decision Trees

### 1. MongoDB vs. PostgreSQL
```
Flexible/evolving schema with variable document shapes?
 YES -> Deep nesting / hierarchical? -> YES: MongoDB
                                     -> NO: Could JSONB work? -> YES: PostgreSQL
                                                               -> NO: MongoDB
 NO  -> Complex multi-table JOINs needed? -> YES: PostgreSQL
     -> Write-heavy (IoT, logs, time-series)? -> YES: MongoDB (sharding + buckets)
     -> Heavy ACID across many entities? -> YES: PostgreSQL
     -> Otherwise: choose based on team expertise
```

### 2. Embedding vs. Referencing
```
Data always accessed with parent?
 YES -> Cardinality bounded (< ~100)? -> Updated independently? -> YES: Reference
                                                                -> NO: EMBED
                                      -> Unbounded? -> REFERENCE (16MB limit)
                                      -> Bounded but large -> Subset pattern
 NO  -> Shared across parents? -> YES: REFERENCE (avoid duplication)
     -> Accessed independently -> REFERENCE
```

### 3. Atlas vs. Self-Hosted
```
Dedicated DB ops team? -> NO: Atlas
                       -> YES -> Budget-constrained? -> YES: Self-hosted
                              -> Multi-region with minimal config? -> YES: Atlas
                              -> Air-gapped / strict data residency? -> YES: Self-hosted
                              -> Startup / rapid prototyping? -> YES: Atlas (free tier)
                              -> Otherwise: evaluate TCO including ops staff
```

---

## Code Examples

### 1. Schema Validation (mongosh)
```javascript
db.createCollection("products", { validator: { $jsonSchema: {
  bsonType: "object",
  required: ["name", "price", "category", "createdAt"],
  properties: {
    name: { bsonType: "string", minLength: 1, maxLength: 200 },
    price: { bsonType: "decimal", minimum: 0 },
    category: { enum: ["electronics", "clothing", "books", "home"] },
    tags: { bsonType: "array", maxItems: 20, items: { bsonType: "string" } },
    specs: { bsonType: "object" },
    createdAt: { bsonType: "date" }
  }
}}, validationLevel: "strict", validationAction: "error" });
```

### 2. Index Creation (ESR Rule)
```javascript
// Query: active orders for user, sorted by date, with date range
// ESR: Equality (userId, status) -> Sort (createdAt) -> Range (covered by createdAt)
db.orders.createIndex({ userId: 1, status: 1, createdAt: -1 }, { name: "idx_user_status_date" });
// Partial index: exclude archived orders
db.orders.createIndex({ userId: 1, createdAt: -1 },
  { partialFilterExpression: { status: { $ne: "archived" } } });
```

### 3. Aggregation Pipeline
```javascript
const revenue = await db.collection("orders").aggregate([
  { $match: { status: "completed", completedAt: { $gte: new Date("2026-01-01"), $lt: new Date("2026-04-01") } } },
  { $unwind: "$items" },
  { $group: { _id: "$items.category", total: { $sum: "$items.totalPrice" }, count: { $sum: 1 } } },
  { $sort: { total: -1 } },
  { $project: { category: "$_id", total: { $round: ["$total", 2] }, count: 1, _id: 0 } }
]).toArray();
```

### 4. Transaction with Auto-Retry (Node.js)
```javascript
async function transferFunds(client, fromId, toId, amount) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const accts = client.db("bank").collection("accounts");
      const src = await accts.findOneAndUpdate(
        { _id: fromId, balance: { $gte: amount } },
        { $inc: { balance: -amount } }, { session, returnDocument: "after" });
      if (!src) throw new Error("Insufficient funds");
      await accts.updateOne({ _id: toId }, { $inc: { balance: amount } }, { session });
      await client.db("bank").collection("transfers").insertOne(
        { from: fromId, to: toId, amount, timestamp: new Date() }, { session });
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
  } finally { session.endSession(); }
}
```

### 5. Change Stream with Resume Token
```javascript
async function watchOrders(db) {
  const tokens = db.collection("resumeTokens");
  const saved = await tokens.findOne({ _id: "orders-watcher" });
  const opts = { fullDocument: "updateLookup", ...(saved?.token && { resumeAfter: saved.token }) };
  const stream = db.collection("orders").watch(
    [{ $match: { operationType: { $in: ["insert", "update"] } } }], opts);
  stream.on("change", async (evt) => {
    console.log(`Order ${evt.fullDocument._id}: ${evt.operationType}`);
    await tokens.updateOne({ _id: "orders-watcher" },
      { $set: { token: evt._id, updatedAt: new Date() } }, { upsert: true });
  });
  stream.on("error", () => setTimeout(() => watchOrders(db), 5000));
}
```

---

*Researched: 2026-03-07 | Sources: [MongoDB Official Docs](https://www.mongodb.com/docs/manual/), [MongoDB Schema Design Best Practices](https://www.mongodb.com/developer/products/mongodb/mongodb-schema-design-best-practices/), [MongoDB Building With Patterns](https://www.mongodb.com/company/blog/building-with-patterns-a-summary), [Schema Design Anti-Patterns](https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/), [MongoDB 8.0 Release Notes](https://www.mongodb.com/docs/manual/release-notes/8.0/), [Performance Best Practices](https://www.mongodb.com/resources/products/capabilities/performance-best-practices), [CSFLE Docs](https://www.mongodb.com/docs/manual/core/csfle/), [Queryable Encryption](https://www.mongodb.com/docs/manual/core/queryable-encryption/about-qe-csfle/), [Mongoose QE/CSFLE](https://www.mongodb.com/company/blog/product-release-announcements/mongoose-now-natively-supports-qe-csfle), [Connection Pools](https://www.mongodb.com/docs/manual/administration/connection-pool-overview/), [Change Streams](https://www.mongodb.com/docs/manual/changestreams/), [Testcontainers MongoDB](https://testcontainers.com/modules/mongodb/), [mongodb-memory-server](https://blog.appsignal.com/2025/06/18/testing-mongodb-in-node-with-the-mongodb-memory-server.html), [Percona Sharding](https://www.percona.com/blog/when-should-i-enable-mongodb-sharding/), [Backup Best Practices](https://www.percona.com/blog/mongodb-backup-best-practices/), [Atlas vs Self-Hosted](https://thedbadmin.com/blog/mongodb-atlas-vs-self-hosted-comparison), [MongoDB vs PostgreSQL 2026](https://thesoftwarescout.com/mongodb-vs-postgresql-2026-which-database-should-you-choose/)*
