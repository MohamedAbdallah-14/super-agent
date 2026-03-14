# Search Architecture — Architecture Expertise Module

> Search architecture covers full-text search, faceted search, autocomplete, and increasingly vector/semantic search for AI applications. The key decision is whether to use your primary database's built-in search (PostgreSQL full-text) or a dedicated search engine (Elasticsearch, Typesense, Meilisearch). Most apps should start with database search and add a dedicated engine only when complexity or scale demands it.

> **Category:** Data
> **Complexity:** Complex
> **Applies when:** Applications needing full-text search, faceted filtering, autocomplete, fuzzy matching, or vector/semantic search

---

## What This Is

### The Core Concepts

Search architecture is the set of data structures, indexing strategies, ranking algorithms, and system topologies that let users find information in a corpus of documents. "Documents" here means any searchable entity — product listings, articles, user profiles, log entries, code, support tickets. The architecture sits between write-path (how data enters the index) and read-path (how queries are executed and results are ranked).

There are five fundamental capabilities that any search architecture must address, whether using a built-in database feature or a dedicated engine:

**Full-Text Search.** Given a query string, find all documents containing those terms, rank them by relevance, and return the top N. This requires an inverted index — a data structure that maps every distinct term to the list of documents containing it. When you search for "distributed consensus", the engine looks up "distributed" in the inverted index (returning document IDs 4, 17, 42, 91), then "consensus" (returning 17, 42, 88), intersects the sets, scores the results, and returns them ranked. PostgreSQL's `tsvector`/`tsquery`, Elasticsearch, Typesense, and Meilisearch all implement this core primitive. The critical difference between implementations is in their analyzers (how text is tokenized, stemmed, and normalized), their ranking algorithms (TF-IDF vs BM25 vs custom), and their performance at scale.

**Faceted Search.** Given a set of search results, compute aggregation counts across categorical dimensions. "Show me laptops, and on the left sidebar tell me there are 42 results from Dell, 38 from Lenovo, 31 from Apple, and that prices range from $400 to $3,200." Faceted search requires both the inverted index (to find matching documents) and columnar aggregation (to compute counts per category). Elasticsearch excels here with its aggregation framework. PostgreSQL can approximate it with `GROUP BY` queries but lacks the tight integration between search results and aggregation that dedicated engines provide.

**Autocomplete / Typeahead.** As the user types, suggest completions in real time (under 100ms per keystroke). This requires a different index structure than full-text search: edge n-grams (breaking "elasticsearch" into "e", "el", "ela", "elas", ...) or prefix tries. The challenge is not just finding matches but ranking them by popularity, recency, and personalization. LinkedIn's Cleo library implements a multi-layer architecture for typeahead: browser cache, web-tier cache, result aggregator, and backend services with inverted/forward indexes, bloom filters, and scorers. At the simplest level, a PostgreSQL `LIKE 'prefix%'` query with a B-tree index works for small datasets, but dedicated autocomplete requires specialized data structures.

**Fuzzy Matching.** Handle typos, misspellings, and phonetic variations. "elasticsaerch" should still match "elasticsearch". This is implemented via edit distance (Levenshtein distance), n-gram overlap, or phonetic algorithms (Soundex, Metaphone). Typesense enables typo tolerance by default with configurable thresholds. Elasticsearch requires explicit configuration of fuzzy queries or custom analyzers. PostgreSQL's `pg_trgm` extension provides trigram-based similarity matching but with limited configurability.

**Vector / Semantic Search.** Instead of matching keywords, match meaning. A query for "affordable laptop for students" should match a document about "budget-friendly notebooks for college" even though the terms differ. This requires converting text into dense vector embeddings (using models like OpenAI's text-embedding-3, Cohere's embed-v3, or open-source alternatives like BGE/E5) and performing approximate nearest neighbor (ANN) search in high-dimensional space. Vector search has become the foundation of RAG (Retrieval-Augmented Generation) pipelines in 2025-2026, where LLMs need relevant context retrieved from a knowledge base. Hybrid search — combining BM25 keyword matching with vector similarity — consistently outperforms either method alone.

### The Inverted Index — The Foundation

Every full-text search system is built on the inverted index. Understanding it is essential to understanding search architecture.

A **forward index** maps documents to terms:
```
Document 1 → ["the", "quick", "brown", "fox"]
Document 2 → ["the", "lazy", "brown", "dog"]
Document 3 → ["quick", "fox", "jumps", "high"]
```

An **inverted index** reverses this, mapping terms to documents:
```
"the"   → [Doc 1, Doc 2]
"quick" → [Doc 1, Doc 3]
"brown" → [Doc 1, Doc 2]
"fox"   → [Doc 1, Doc 3]
"lazy"  → [Doc 2]
"dog"   → [Doc 2]
"jumps" → [Doc 3]
"high"  → [Doc 3]
```

Searching for "quick fox" means: look up "quick" (Doc 1, Doc 3), look up "fox" (Doc 1, Doc 3), intersect = [Doc 1, Doc 3]. This operation is O(n) in the number of matching documents, not O(n) in the total corpus size — which is why search engines can query billions of documents in milliseconds.

In practice, inverted indexes store more than just document IDs. They store **term frequencies** (how many times the term appears in each document), **positions** (where in the document the term appears, enabling phrase queries), and **offsets** (character positions, enabling highlighting). This additional metadata enables relevance scoring and advanced query types but increases index size.

### Analyzers and Tokenizers

Before text enters the inverted index, it passes through an analysis pipeline:

1. **Character filters** — strip HTML, normalize Unicode, map characters (e.g., convert `&` to "and")
2. **Tokenizer** — split text into tokens. The standard tokenizer splits on whitespace and punctuation. The n-gram tokenizer generates overlapping character sequences. The edge n-gram tokenizer generates prefixes for autocomplete.
3. **Token filters** — lowercase, remove stop words ("the", "a", "is"), stem ("running" -> "run"), apply synonyms ("laptop" -> "laptop", "notebook"), transliterate accented characters

The choice of analyzer dramatically affects search quality. An English stemmer maps "running", "runs", and "ran" to the same root "run", so a search for "running" matches documents containing "ran". But stemming can also cause false positives: "university" and "universe" both stem to "univers". Language-specific analyzers, synonym dictionaries, and custom token filters are where much of the relevance tuning effort goes.

PostgreSQL's `tsvector` uses a similar pipeline: text is parsed into lexemes (normalized tokens) using dictionaries for stemming and stop-word removal. The `english` text search configuration applies English stemming and stop-word removal by default.

---

## When to Use Built-in Database Search (PostgreSQL FTS)

### The 80% Case

PostgreSQL full-text search handles the majority of application search needs without adding any infrastructure. Before reaching for Elasticsearch, honestly evaluate whether your requirements fall within what PostgreSQL provides.

**PostgreSQL FTS is sufficient when:**

**Simple text search on structured data.** Searching product names, article titles, user profiles, or support tickets where the schema is well-defined and the query patterns are predictable. A SaaS application with 500K users searching their own data within their tenant — PostgreSQL FTS handles this trivially.

**Document count under 10 million.** PostgreSQL FTS with GIN indexes performs well for corpuses up to roughly 10M documents on modern hardware. With persistent `tsvector` columns (precomputed at write time rather than computed at query time) and proper GIN indexing, query latency stays under 50ms for most workloads at this scale.

**No complex faceting requirements.** If your search results page shows a list of matching items with basic sorting (by relevance, date, price) but does not need dynamic facet counts ("42 results in Electronics, 18 in Books"), PostgreSQL is fine. You can approximate facets with additional `GROUP BY` queries, but this becomes expensive at scale.

**Team does not have search infrastructure expertise.** Running an Elasticsearch cluster requires operational knowledge — shard sizing, JVM tuning, cluster health monitoring, rolling upgrades, index lifecycle management. If your team is 3-5 developers building a product, the operational overhead of Elasticsearch may exceed the benefit. PostgreSQL FTS requires zero additional infrastructure.

**Transactional consistency matters.** PostgreSQL FTS operates within the same transaction as your data writes. When you insert a new product, it is immediately searchable — no eventual consistency, no sync lag, no dual-write problem. This is a significant advantage for applications where search results must always reflect the latest state.

### PostgreSQL FTS Implementation Pattern

```sql
-- 1. Add a persistent tsvector column with GIN index
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX idx_products_search ON products USING GIN (search_vector);

-- 2. Query with ranking
SELECT id, name, ts_rank(search_vector, query) AS rank
FROM products, plainto_tsquery('english', 'wireless headphones') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

The `setweight` function assigns priority tiers (A highest, D lowest) so matches in the product name rank higher than matches in the description. The `GENERATED ALWAYS AS ... STORED` clause precomputes the tsvector at write time, avoiding runtime text processing during queries. The GIN index makes the `@@` match operator use the inverted index rather than a sequential scan.

### PostgreSQL FTS Limitations

**Relevance tuning is limited.** PostgreSQL offers `ts_rank` and `ts_rank_cd` (which considers term proximity), but these are basic compared to Elasticsearch's function_score queries, decay functions, field boosting, and scripted scoring. If you need "boost results from the last 7 days" or "boost results with more reviews", PostgreSQL requires application-level post-processing.

**No built-in autocomplete.** PostgreSQL has no native edge n-gram or completion suggester. You can approximate autocomplete with `LIKE 'prefix%'` on a B-tree indexed column or use `pg_trgm` for trigram-based fuzzy matching, but these lack the speed and sophistication of dedicated autocomplete engines.

**Faceted aggregations are expensive.** Computing facet counts requires separate `GROUP BY` queries that do not share execution with the search query. For a product search page with 10 facet categories, this means 10+ additional queries per search request.

**No distributed scaling.** PostgreSQL FTS runs on a single node. Read replicas can distribute query load, but the index itself is not sharded. For corpuses significantly beyond 10M documents or query rates beyond what a single node handles, you hit a ceiling.

**Ranking is I/O bound.** Scoring requires reading the `tsvector` of every matching document. For broad queries that match millions of documents, the ranking step becomes the bottleneck since PostgreSQL must fetch and score each match, unlike Elasticsearch which can use early termination and distributed scoring.

---

## When to Use a Dedicated Search Engine

### The Qualifying Conditions

Adopt a dedicated search engine (Elasticsearch, OpenSearch, Typesense, Meilisearch) when **two or more** of these are true:

**Complex relevance tuning.** Your search quality depends on boosting by recency, popularity, user behavior, geographic proximity, or business rules. You need A/B testing of ranking algorithms. You need function scores that combine text relevance with numerical signals. Elasticsearch's `function_score` query DSL and learning-to-rank plugin are purpose-built for this. Airbnb's search system uses Elasticsearch for geo-based queries combined with ML-trained relevance models that factor in booking probability, host response rate, and listing quality.

**Faceted search with dynamic aggregations.** Your UI shows filter panels with counts that update as the user refines their search. E-commerce product search, job boards, real estate listings — any application where users narrow results through multiple dimensions simultaneously. Elasticsearch's aggregation framework handles nested, filtered, and pipeline aggregations efficiently within a single query.

**Real-time autocomplete and suggestions.** You need sub-50ms typeahead with fuzzy matching, typo tolerance, and personalized suggestions. Elasticsearch's completion suggester uses an in-memory FST (finite state transducer) data structure optimized for prefix lookups. Typesense provides typo-tolerant autocomplete out of the box.

**Scale beyond a single node.** Your corpus exceeds 10M documents, you need to index hundreds of thousands of documents per minute, or your query rate exceeds what a single PostgreSQL instance can serve. Elasticsearch distributes data across shards and nodes, enabling horizontal scaling. Clusters at Netflix, Uber, and LinkedIn handle billions of documents across hundreds of nodes.

**Multi-language, multi-field search.** Your application serves content in 20+ languages, each requiring different analyzers, stemmers, and stop-word lists. Elasticsearch's per-field analyzer configuration and multi-field mappings (index the same field with different analyzers) handle this cleanly.

**Vector/hybrid search at scale.** You are building a RAG pipeline, semantic search, or recommendation system that requires vector similarity search combined with keyword filtering. Elasticsearch 8.x+ supports dense vector fields with ANN search, and can combine vector scores with BM25 scores in a single query.

### Real-World Case Studies

**Airbnb** — Uses Elasticsearch as the backbone of its listing search. The search system handles geo-spatial queries (find listings within a bounding box), full-text search on listing descriptions, faceted filtering (price range, amenities, property type), and ML-based relevance ranking that factors in conversion probability. The data pipeline syncs listing data from MySQL to Elasticsearch via Kafka, with Redis caching hot query results.

**GitHub** — Code search across 200M+ repositories uses a custom search infrastructure built on Elasticsearch principles. The challenge is indexing source code (which has different tokenization needs than natural language) and handling queries that mix text search with structural filters (language, repository, file path).

**Netflix** — Uses Elasticsearch for internal content search, device log analysis, and operational intelligence across 260M+ subscribers. The search infrastructure processes billions of events daily, with separate clusters for different use cases (content metadata search vs. log analytics).

**Shopify** — Product search across millions of merchants uses Elasticsearch with custom relevance tuning per merchant. The indexing pipeline must handle the "long tail" of small merchants (few products, sparse data) alongside large merchants (millions of SKUs).

---

## When NOT to Use a Dedicated Search Engine

This section is deliberately thorough because the most common architectural mistake in search is adopting Elasticsearch too early. The operational cost of running a search cluster is substantial and ongoing.

### The Operational Burden Is Real

**Cluster management is a full-time job.** Running Elasticsearch in production requires understanding shard allocation strategies, node roles (master, data, coordinating, ingest), JVM heap sizing, garbage collection tuning, and circuit breaker configuration. Many organizations dedicate entire teams to Elasticsearch operations. If you are a team of 5 building a product, you cannot afford to spend 20% of your engineering capacity on search infrastructure.

**The JVM is unforgiving.** Elasticsearch runs on the JVM. Memory management issues manifest as stop-the-world garbage collection pauses that spike query latency from 10ms to 10 seconds. Heap sizing must be carefully tuned — too small and you get frequent GC pauses, too large and you waste memory that the OS could use for filesystem cache. The "rule of thumb" (50% of available RAM for heap, 50% for filesystem cache) is well-known but insufficient for production tuning.

**Shard management is an ongoing concern.** Each Elasticsearch index is divided into shards. Too few shards and you cannot distribute load. Too many shards and cluster state management becomes expensive (each shard consumes ~50MB of heap on the master node). Oversharding is the most common operational problem in Elasticsearch clusters — teams create an index-per-day pattern for logs and end up with thousands of shards that degrade cluster performance. Index lifecycle management (ILM) policies help but add configuration complexity.

**Split-brain scenarios threaten data integrity.** In a distributed Elasticsearch cluster, network partitions can cause a split-brain condition where two subsets of nodes each elect themselves as master and accept writes independently. When the partition heals, conflicting data must be reconciled. Modern Elasticsearch mitigates this with the voting configuration and minimum_master_nodes setting, but the risk requires monitoring and operational readiness.

### The Data Sync Problem

**Dual-write is a distributed systems problem.** When your source of truth is PostgreSQL and your search index is Elasticsearch, every write must reach both systems. The naive approach (write to Postgres, then write to Elasticsearch in the same request) fails when either write succeeds and the other fails, leaving the systems out of sync. The correct approaches — Change Data Capture (CDC) via Debezium, event sourcing, or transactional outbox pattern — add significant infrastructure complexity.

**Eventual consistency creates user-visible bugs.** A user creates a product listing and immediately searches for it. If the Elasticsearch index lags by 2 seconds (which is normal), the user sees stale results and reports a bug. "I just created this, why can't I find it?" Every team that adopts Elasticsearch for search while keeping a relational database as the source of truth encounters this problem. Workarounds (query both Postgres and ES, merge results) add application complexity.

**Reindexing is a production risk.** When you change an Elasticsearch mapping (add a field, change an analyzer), you must reindex all documents. For large indexes (hundreds of millions of documents), reindexing takes hours or days. During this period, you are running two indexes simultaneously, consuming double the storage and compute. Reindexing failures — due to cluster instability, resource exhaustion, or mapping conflicts — can leave you in a partially-migrated state that requires manual intervention.

### When PostgreSQL Is Enough — Real Examples

**Internal admin search.** An operations dashboard where staff search customer records, orders, or support tickets. The corpus is under 5M records, queries are simple keyword matches, and the users are trained staff who do not need fuzzy matching or autocomplete. PostgreSQL FTS with a GIN index handles this with zero additional infrastructure.

**Blog or CMS search.** A content site with 50K articles. Full-text search on title and body, sorted by relevance or date. PostgreSQL FTS handles this trivially. Adding Elasticsearch for a blog search is using a sledgehammer to hang a picture frame.

**Multi-tenant SaaS search within tenant boundaries.** Each tenant has at most 100K searchable records. Queries are always scoped to a single tenant via a `WHERE tenant_id = ?` clause. The effective search corpus per query is small. PostgreSQL handles this efficiently with a composite index on `(tenant_id)` and a GIN index on the search vector.

**MVP and early-stage products.** You do not yet know your search requirements. Starting with PostgreSQL FTS lets you ship quickly, learn from real user behavior, and adopt a dedicated engine only when you have concrete evidence that PostgreSQL is insufficient. Premature adoption of Elasticsearch has killed more MVPs through operational complexity than through search quality limitations.

**Simple autocomplete on a single field.** Searching user names, product codes, or city names with prefix matching. A B-tree index on the column with `LIKE 'prefix%'` or `pg_trgm` with a GiST index handles this without a search engine.

---

## How It Works — The Search Pipeline

### 1. Indexing Pipeline (Write Path)

The indexing pipeline transforms raw data into searchable index structures:

```
Source Data → Extract → Transform → Analyze → Index
   (DB)       (CDC)    (enrich)   (tokenize)  (inverted index)
```

**Extraction.** Data enters the indexing pipeline from the source of truth. For real-time indexing, this is typically CDC (Change Data Capture) via tools like Debezium that tail the database's write-ahead log and emit change events to Kafka. For batch indexing, a periodic job reads from the database and bulk-indexes into the search engine.

**Transformation.** Raw database rows are transformed into search documents. This often involves denormalization (joining product with category and brand into a single flat document), enrichment (adding computed fields like popularity scores), and field mapping (deciding which fields are searchable, filterable, sortable, or stored).

**Analysis.** Text fields pass through the analyzer pipeline (character filters, tokenizer, token filters) to produce normalized tokens. Numeric and date fields are stored for range queries. Keyword fields (category IDs, status codes) are stored verbatim for exact matching and faceting.

**Indexing.** Tokens are written to the inverted index. Document values are written to columnar storage (doc values) for sorting and aggregations. Vector embeddings are written to ANN index structures (HNSW graphs) for vector search.

### 2. Relevance Scoring — TF-IDF, BM25, and Beyond

**TF-IDF (Term Frequency - Inverse Document Frequency)** is the foundational relevance scoring algorithm. The intuition: a term is relevant to a document if it appears frequently in that document (TF) but rarely across all documents (IDF). "The" appears in every document, so it has low IDF and contributes little to relevance. "Elasticsearch" appears in few documents, so it has high IDF and is a strong relevance signal.

```
TF-IDF(t, d) = TF(t, d) * IDF(t)
  where TF(t, d)  = count of term t in document d
        IDF(t)     = log(total documents / documents containing t)
```

**BM25 (Best Matching 25)** is the successor to TF-IDF and the default ranking algorithm in Elasticsearch, OpenSearch, and Apache Lucene. BM25 improves on TF-IDF in two critical ways:

1. **Term frequency saturation.** In TF-IDF, a term appearing 100 times scores 100x higher than a term appearing once. BM25 introduces a saturation curve controlled by the parameter `k1` (default 1.2): after a certain frequency, additional occurrences contribute diminishing returns. This prevents long documents that repeat a term from dominating results.

2. **Document length normalization.** BM25 normalizes by document length, controlled by parameter `b` (default 0.75). A 10-page document mentioning "search" 5 times is treated differently from a 1-paragraph document mentioning "search" 5 times. The short document has higher term density and should rank higher for that query.

```
BM25(t, d) = IDF(t) * (TF(t,d) * (k1 + 1)) / (TF(t,d) + k1 * (1 - b + b * |d|/avgdl))
```

**Learning to Rank (LTR).** For applications where BM25 alone is insufficient, machine learning models can re-rank search results. The approach: use BM25 for initial retrieval (find the top 1000 candidates), then apply an ML model (LambdaMART, neural rankers) that considers additional features — click-through rate, user behavior signals, freshness, geographic proximity, business rules. Elasticsearch provides an LTR plugin, and all major search platforms at scale (Google, Airbnb, LinkedIn) use ML-based re-ranking. The training data comes from user interaction logs: which results users clicked, how long they spent on the page, whether they converted.

### 3. Facets and Aggregations

Faceted search requires a different data structure than full-text search. While the inverted index maps terms to documents, aggregations need columnar storage that maps documents to field values efficiently.

Elasticsearch uses **doc values** — an on-disk columnar data structure that stores field values per document. When computing facet counts ("how many products in each category"), Elasticsearch iterates through the doc values for the category field across all matching documents and counts occurrences. This is efficient because columnar storage enables sequential reads and good cache behavior.

Aggregation types in Elasticsearch:
- **Terms aggregation** — count documents per distinct value (category facets)
- **Range aggregation** — count documents in numeric/date ranges (price ranges)
- **Histogram aggregation** — count documents in fixed-width buckets
- **Nested aggregation** — aggregate on nested object fields
- **Filter aggregation** — compute sub-aggregations on a filtered subset
- **Pipeline aggregation** — compute metrics on the results of other aggregations (moving averages, derivatives)

### 4. Autocomplete Strategies

There are four common approaches to implementing autocomplete, each with different trade-offs:

**Edge n-grams.** Index each term as all its prefixes: "search" becomes ["s", "se", "sea", "sear", "searc", "search"]. A query for "sea" matches the inverted index entry for "sea" and returns all documents containing words starting with "sea". This is simple and works well for small-to-medium vocabularies but increases index size significantly (each term generates O(n) entries where n is the term length).

**Completion suggester (Elasticsearch).** An in-memory FST (finite state transducer) data structure optimized for prefix lookups. Extremely fast (sub-millisecond) but requires a dedicated field type and cannot be combined with full-text queries in the same request. Best for simple prefix-based suggestions.

**Search-as-you-type field (Elasticsearch).** A multi-field mapping that automatically creates edge n-gram, shingle (word-level n-gram), and standard sub-fields. Queries match against all sub-fields and combine scores. More flexible than the completion suggester but slower.

**Trie-based custom implementation.** For high-traffic autocomplete (Google-scale), a custom in-memory trie data structure that stores the top-K suggestions at each prefix node. LinkedIn's Cleo library uses this approach with a multi-layer architecture: inverted index for candidate retrieval, bloom filters for fast negative lookups, and a scoring function that combines popularity, recency, and personalization signals.

### 5. Vector Search and Hybrid Architecture

Vector search converts text (or images, audio, etc.) into dense numerical vectors using embedding models, then finds the most similar vectors using approximate nearest neighbor (ANN) algorithms.

**Embedding generation.** Text is passed through a neural network (transformer-based models like OpenAI text-embedding-3-large, Cohere embed-v3, or open-source models like BGE-M3 and E5-mistral) that produces a fixed-size vector (768 to 3072 dimensions typically). Similar meanings produce similar vectors: "affordable laptop for students" and "budget notebook for college" will have high cosine similarity even though they share no keywords.

**ANN indexing.** Exact nearest neighbor search in high-dimensional space is O(n) — you must compare the query vector against every indexed vector. For millions of vectors, this is too slow. ANN algorithms trade a small amount of accuracy for dramatic speed improvements:

- **HNSW (Hierarchical Navigable Small World)** — builds a multi-layer graph where each node connects to its nearest neighbors. Query traversal starts at the top layer (sparse, long-range connections) and descends to lower layers (dense, short-range connections). Used by Elasticsearch, pgvector, Weaviate, and Qdrant. Offers excellent recall (>95%) with sub-millisecond latency but requires significant memory.
- **IVF (Inverted File Index)** — clusters vectors into Voronoi cells, then searches only the closest cells at query time. Used by FAISS. Lower memory than HNSW but requires careful tuning of the number of clusters and probes.
- **Product Quantization (PQ)** — compresses vectors by quantizing sub-vectors, reducing memory by 4-16x at the cost of some accuracy. Often combined with IVF (IVF-PQ) for large-scale deployments.

**Hybrid search (keyword + vector).** BM25 keyword search combined with vector similarity consistently outperforms either method alone. The architecture:

1. Execute BM25 query to get top-K keyword matches with scores
2. Execute vector query to get top-K semantic matches with scores
3. Normalize both score sets to the same scale
4. Combine using Reciprocal Rank Fusion (RRF) or weighted linear combination
5. Re-rank the merged results

Elasticsearch 8.x, OpenSearch 2.x, Weaviate, and Vespa all support hybrid search natively. Google Cloud's Vertex AI Vector Search supports hybrid queries combining dense and sparse (BM25/SPLADE) embeddings in a single index.

---

## Trade-Offs Matrix

| Dimension | PostgreSQL FTS | Elasticsearch / OpenSearch | Typesense | Meilisearch | Algolia (SaaS) | pgvector | Pinecone / Weaviate |
|---|---|---|---|---|---|---|---|
| **Setup complexity** | Zero (built-in) | High (cluster, JVM, shards) | Low (single binary) | Low (single binary) | Zero (hosted) | Low (extension) | Low (hosted / single binary) |
| **Operational burden** | None | High (dedicated team for large clusters) | Low-Medium | Low | None | Low | Low (hosted) / Medium (self-hosted) |
| **Full-text search quality** | Good (basic BM25 via ts_rank) | Excellent (full BM25, custom analyzers, function_score) | Very Good (typo-tolerant, fast) | Very Good (AI-powered, typo-tolerant) | Excellent (hosted, tuned) | N/A (not its purpose) | Basic (secondary feature) |
| **Faceted search** | Poor (manual GROUP BY) | Excellent (native aggregations) | Good (built-in filtering) | Good (built-in faceting) | Excellent | N/A | Limited |
| **Autocomplete** | Poor (manual LIKE/pg_trgm) | Excellent (completion suggester, search-as-you-type) | Excellent (default typo tolerance) | Excellent (instant search focus) | Excellent | N/A | N/A |
| **Vector search** | N/A | Good (8.x+ dense vectors, HNSW) | Basic (2024+) | Basic (AI search, 2024+) | N/A | Good (HNSW, IVF) | Excellent (purpose-built) |
| **Hybrid search** | N/A | Good (RRF, linear combination) | Limited | Limited | N/A | Manual (combine with FTS) | Good (native hybrid) |
| **Max corpus size** | ~10M documents per node | Billions (distributed) | ~100M per cluster | ~100M per node | Billions (hosted) | ~10M vectors per node | Billions (hosted) |
| **Query latency (p50)** | 5-50ms | 5-20ms | 1-10ms | 1-10ms | 5-15ms | 5-50ms | 5-20ms |
| **Data consistency** | Strong (transactional) | Eventual (refresh interval, default 1s) | Eventual | Eventual | Eventual | Strong (transactional) | Eventual |
| **Cost at scale** | Low (included in DB) | High (cluster compute + storage) | Medium | Medium | Very High (per-search pricing) | Low (included in DB) | High (hosted) / Medium (self-hosted) |
| **Learning curve** | Low (SQL-based) | High (custom DSL, cluster concepts) | Low (REST API, dashboard) | Low (REST API, dashboard) | Low (dashboard, client SDKs) | Low (SQL-based) | Medium |

---

## Evolution Path

### Phase 1: PostgreSQL Full-Text Search (Day 1)

Start here. Add a `tsvector` generated column and GIN index to your primary searchable tables. Use `plainto_tsquery` for user input and `ts_rank` for relevance ordering. This covers basic search with zero additional infrastructure. Add `pg_trgm` for fuzzy matching on names and short text fields.

```
Effort: 1-2 days
Serves: 0 to ~5M documents, simple search UI
Limitation: No facets, no autocomplete, basic relevance
```

### Phase 2: PostgreSQL + Application-Level Enhancements (Month 3-6)

As search requirements grow, add application-level features without changing infrastructure. Implement autocomplete with a denormalized suggestions table and B-tree prefix index. Add basic faceting with parallel `GROUP BY` queries (cache the results). Implement search analytics to understand what users search for and where they fail to find results.

```
Effort: 1-2 weeks
Serves: Growing product with emerging search needs
Limitation: Facets are slow, autocomplete lacks sophistication
```

### Phase 3: Dedicated Search Engine (Month 6-18)

When you have concrete evidence that PostgreSQL FTS is insufficient — users complain about relevance, facets are too slow, autocomplete needs typo tolerance — adopt a dedicated engine. For most applications, **Typesense or Meilisearch** is the right first step: they deliver 80% of Elasticsearch's search quality with 20% of the operational complexity.

If you need enterprise-scale faceted search, complex aggregations, or will index more than 100M documents, go directly to **Elasticsearch or OpenSearch**.

Set up a data sync pipeline: CDC (Debezium) or application-level events via Kafka. Keep PostgreSQL as the source of truth.

```
Effort: 2-4 weeks (including sync pipeline)
Serves: Product-market fit stage with real search requirements
Limitation: Data sync complexity, eventual consistency
```

### Phase 4: Vector/Hybrid Search (When AI Features Arrive)

When you need semantic search, RAG, or AI-powered recommendations, add vector search capabilities. Options:

- **pgvector** if your vector corpus is under 10M and you want to stay in PostgreSQL
- **Elasticsearch dense vectors** if you already run ES and want hybrid keyword+vector in one system
- **Dedicated vector DB** (Weaviate, Qdrant, Pinecone) if vector search is a primary use case with billions of vectors

For most applications, pgvector or Elasticsearch's vector capabilities are sufficient. Dedicated vector databases are warranted only when vector search is the core product feature (recommendation engines, visual search, large-scale RAG).

```
Effort: 1-3 weeks (excluding embedding model selection and tuning)
Serves: AI-powered search, RAG pipelines, semantic search
Limitation: Embedding model quality is the bottleneck, not the database
```

---

## Failure Modes

### Index Out of Sync with Source of Truth

**Symptoms.** Users report "I just created X but search doesn't show it." Or worse: search returns items that were deleted from the database.

**Root cause.** The sync pipeline between the source of truth (PostgreSQL) and the search index (Elasticsearch) has lag, gaps, or failures. Common triggers: Kafka consumer falls behind, Debezium connector loses its replication slot, a bulk indexing job fails partway through and is not retried.

**Prevention.** Implement a reconciliation job that periodically compares document counts and checksums between the source database and the search index. Add monitoring on sync lag (time between database write and index availability). Set alerting thresholds: warn at 5s lag, page at 30s lag.

**Mitigation.** For user-facing writes, implement a "write-through" pattern: after writing to the database, immediately index the document to Elasticsearch via the synchronous API (not the async pipeline). This ensures the user's own writes are immediately searchable, while the async pipeline handles bulk updates and consistency.

### Relevance Degradation Over Time

**Symptoms.** Search result quality gradually worsens. Click-through rates on search results decline. Users increasingly rely on browsing or direct links instead of search.

**Root cause.** The data distribution has shifted since the search was configured. New content types were added without updating analyzers. Synonym dictionaries are stale. Popular queries return stale or low-quality results because relevance tuning was done once and never revisited.

**Prevention.** Implement search analytics: track queries, click-through rates, zero-result queries, and query refinements (user searches, gets poor results, modifies query). Review the zero-result and low-CTR query reports monthly. A/B test relevance changes before deploying them.

**Mitigation.** Regularly review and update synonym dictionaries, stop words, and field boosting weights. Use the Elasticsearch `_explain` API to understand why specific documents rank where they do. For high-traffic search, invest in learning-to-rank models trained on click data.

### Elasticsearch Cluster Instability

**Symptoms.** Query latency spikes from 20ms to 5+ seconds. Cluster health goes yellow (missing replicas) or red (missing primary shards). Indexing requests are rejected with `429 Too Many Requests`.

**Root causes:**
- **JVM heap pressure.** GC pauses spike when heap usage exceeds 75%. Monitor `jvm.mem.heap_used_percent` and `jvm.gc.collectors.old.collection_time_in_millis`.
- **Oversharding.** Thousands of small shards consume master node heap for cluster state management. Each shard uses ~50MB of heap on the master. A cluster with 10,000 shards requires 500GB of master heap just for cluster state.
- **Disk pressure.** Data nodes hitting the flood-stage watermark (95% disk usage by default) go read-only, rejecting all index operations.
- **Split brain.** Network partition causes two master nodes to be elected independently. Both accept writes. When the partition heals, data conflicts exist. Modern Elasticsearch (7.x+) mitigates this with the voting configuration, but misconfigured clusters remain vulnerable.

**Prevention.** Follow the shard sizing guidelines: aim for 20-40GB per shard, no more than 20 shards per GB of heap on data nodes. Use index lifecycle management (ILM) to roll over time-based indexes and delete old data. Monitor cluster health with dedicated dashboards (Kibana, Grafana, Datadog).

### Reindexing Downtime

**Symptoms.** A mapping change or analyzer update requires a full reindex. During reindexing, search results are stale, incomplete, or unavailable.

**Root cause.** Elasticsearch mappings are immutable once created. Changing a field type, adding a new analyzer, or restructuring the document schema requires creating a new index with the updated mapping and copying all documents from the old index.

**Prevention.** Use index aliases. The application always queries the alias (e.g., `products`), which points to the active index (`products_v3`). To reindex, create `products_v4` with the new mapping, reindex documents into it, then atomically swap the alias to point to `products_v4`. Zero downtime if executed correctly.

**Mitigation.** For large indexes (100M+ documents), plan reindexing as a multi-day operation. Use `_reindex` with `slices` for parallelism. Monitor progress via the `_tasks` API. Have a rollback plan: keep the old index until the new one is verified.

### Vector Search Quality Collapse

**Symptoms.** Semantic search returns irrelevant results. Users report that keyword search works better than "AI search." RAG pipelines hallucinate because retrieved context is wrong.

**Root cause.** The embedding model is not suited to the domain. General-purpose embeddings (trained on web text) perform poorly on domain-specific content (medical records, legal documents, code). Or: the chunking strategy is wrong — documents are split at arbitrary boundaries, destroying semantic meaning.

**Prevention.** Evaluate embedding models on your actual data before committing. Create a benchmark set of queries and expected results. Measure recall@10 and NDCG. Fine-tune embeddings on domain-specific data if general models underperform. Test multiple chunking strategies (fixed-size, sentence-based, semantic-boundary) and measure retrieval quality for each.

---

## Technology Landscape

### Full-Text Search Engines

**PostgreSQL Full-Text Search.** Built into PostgreSQL since version 8.3 (2008). Uses `tsvector` for document representation and GIN indexes for fast lookup. Supports language-specific stemming, stop-word removal, and weighted fields. Sufficient for most applications under 10M documents. The major advantage is zero operational overhead and transactional consistency with your data.

**Elasticsearch / OpenSearch.** The dominant dedicated search engine. Built on Apache Lucene. Distributed, horizontally scalable, supports sharding and replication. Full BM25 scoring, custom analyzers, aggregations, completion suggesters, and (since 8.x) dense vector search. OpenSearch is the AWS-forked open-source continuation after Elastic changed Elasticsearch's license in 2021. Operationally complex but unmatched in feature breadth for large-scale search.

**Typesense.** Written in C++ for maximum performance. Delivers sub-50ms search results with built-in typo tolerance, faceting, and geo-search. Designed for developer experience — simple REST API, sensible defaults, minimal configuration. Supports high availability via Raft consensus with replicated nodes. Does not shard data (each node holds the full dataset), so the ceiling is whatever fits on a single node (practically tens of millions of documents on modern hardware). Best for: applications that need fast, typo-tolerant search without Elasticsearch's operational complexity.

**Meilisearch.** Written in Rust. Focused on instant search experiences for end-user-facing applications. Extremely fast indexing and querying for datasets up to ~100M documents on a single node. Built-in typo tolerance, faceting, filtering, and (since 2024) AI-powered semantic search. Does not support distributed/sharded deployments as of 2026 — single-node only. Best for: developer-friendly instant search in small-to-medium applications, especially those wanting quick setup.

**Algolia.** Fully managed search-as-a-service. Highest ease of use: dashboard-based configuration, client SDKs for every platform, built-in analytics. No infrastructure to manage. Pricing is per-search-request, which becomes expensive at scale ($1+ per 1000 searches). Best for: teams that want zero operational burden and can afford the pricing. Not suitable for large-scale or cost-sensitive deployments.

**Apache Solr.** The original Lucene-based search platform, predating Elasticsearch. Still used in legacy deployments and by organizations with deep Solr expertise. Functionally similar to Elasticsearch but with a smaller ecosystem, less active development, and declining market share. New projects should generally choose Elasticsearch/OpenSearch over Solr.

### Vector Search

**pgvector.** PostgreSQL extension for vector similarity search. Supports HNSW and IVFFlat indexes. Competitive with dedicated vector databases at under 10M vectors — achieves 471 QPS at 99% recall with pgvectorscale. The major advantage is operational simplicity: vectors live in the same database as your relational data, enabling SQL joins between vector search results and business data. Cost-effective: 79% lower monthly cost than Pinecone when self-hosted on equivalent hardware.

**Pinecone.** Fully managed vector database. Purpose-built for vector search at scale (billions of vectors). Simple API, no infrastructure management. Highest ease of use for vector search but premium pricing. Best for: teams that need enterprise-scale vector search without ops investment.

**Weaviate.** Open-source vector database with native hybrid search (keyword + vector in a single query). Supports multiple embedding model integrations. Can run self-hosted or managed. Best for: applications requiring tight integration between keyword relevance and semantic similarity.

**Qdrant.** Written in Rust. Open-source vector database with strong performance characteristics and flexible filtering. Supports payload-based filtering combined with vector search. Growing ecosystem in 2025-2026.

**Elasticsearch Dense Vectors.** Since version 8.0, Elasticsearch supports dense vector fields with HNSW-based ANN search. Enables hybrid search (BM25 + vector) within a single query using RRF or scripted scoring. Best for: organizations already running Elasticsearch that want to add vector search without a separate system.

### Emerging Trends (2025-2026)

**Graph-enhanced vector retrieval.** Combining knowledge graphs with vector search to improve retrieval quality. Instead of relying solely on embedding similarity, the system traverses graph relationships to find contextually relevant documents. Expected to become a standard architecture by 2027.

**Multimodal embeddings.** In 2026, vector databases support embeddings for text, images, video, audio, and 3D models in the same index. A query "red leather couch" can match against both product descriptions and product images.

**Adaptive embedding models.** Models that automatically align to specific tasks and domains, reducing the need for fine-tuning. Running natively on low-power devices for edge search scenarios.

---

## Decision Tree

```
START: Do you need search beyond simple WHERE/LIKE queries?
│
├─ NO → Use database queries. You do not need search architecture.
│
└─ YES → Is your corpus under 10M documents?
    │
    ├─ YES → Do you need faceted search, autocomplete, or complex relevance?
    │   │
    │   ├─ NO → PostgreSQL FTS with tsvector + GIN index.
    │   │       Add pg_trgm for fuzzy matching if needed.
    │   │
    │   └─ YES → Do you need instant typo-tolerant autocomplete?
    │       │
    │       ├─ YES → Typesense or Meilisearch.
    │       │       Low ops burden, fast setup, excellent autocomplete.
    │       │
    │       └─ NO (but need facets/aggregations) → Elasticsearch or OpenSearch.
    │               More setup, but unmatched aggregation capabilities.
    │
    └─ NO (>10M documents) → Do you need vector/semantic search as the primary use case?
        │
        ├─ YES → Is your vector corpus under 10M?
        │   │
        │   ├─ YES → pgvector (if using PostgreSQL) or Elasticsearch dense vectors.
        │   │
        │   └─ NO → Dedicated vector DB (Weaviate for hybrid, Pinecone for managed,
        │           Qdrant for self-hosted performance).
        │
        └─ NO (keyword search at scale) → Elasticsearch or OpenSearch.
                Distributed, sharded, handles billions of documents.
                Budget for operational investment (dedicated team or managed service).

ALWAYS ASK: Can you afford the operational complexity?
├─ NO → Managed service (Algolia for keyword, Pinecone for vector)
│       or simpler engine (Typesense, Meilisearch).
└─ YES → Elasticsearch/OpenSearch gives maximum flexibility.
```

---

## Implementation Sketch

### PostgreSQL FTS — Minimal Setup

```sql
-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create table with search vector
CREATE TABLE articles (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT,
  published   TIMESTAMPTZ DEFAULT NOW(),
  search_vec  tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED
);

-- GIN index for full-text search
CREATE INDEX idx_articles_search ON articles USING GIN (search_vec);

-- Trigram index for fuzzy autocomplete on title
CREATE INDEX idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);

-- Full-text search query with ranking
SELECT id, title,
       ts_rank(search_vec, query) AS relevance
FROM articles, plainto_tsquery('english', $1) query
WHERE search_vec @@ query
ORDER BY relevance DESC
LIMIT 20;

-- Fuzzy autocomplete on title (trigram similarity)
SELECT id, title, similarity(title, $1) AS sim
FROM articles
WHERE title % $1  -- uses trigram similarity threshold (default 0.3)
ORDER BY sim DESC
LIMIT 10;
```

### Elasticsearch — Index Mapping and Query

```json
// Index mapping with search-optimized fields
PUT /products
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "autocomplete_tokenizer",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer",
            "search_analyzer": "standard"
          }
        }
      },
      "description": { "type": "text" },
      "category":    { "type": "keyword" },
      "price":       { "type": "float" },
      "rating":      { "type": "float" },
      "embedding":   {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

```json
// Hybrid search: BM25 + vector + facets in a single query
POST /products/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "wireless noise cancelling headphones",
            "fields": ["name^3", "description"],
            "type": "best_fields"
          }
        }
      ],
      "filter": [
        { "term":  { "category": "electronics" } },
        { "range": { "price": { "gte": 50, "lte": 300 } } }
      ]
    }
  },
  "knn": {
    "field": "embedding",
    "query_vector": [0.12, -0.34, ...],
    "k": 20,
    "num_candidates": 100
  },
  "rank": {
    "rrf": { "window_size": 100, "rank_constant": 60 }
  },
  "aggs": {
    "categories":  { "terms": { "field": "category", "size": 20 } },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 50 },
          { "from": 50, "to": 100 },
          { "from": 100, "to": 200 },
          { "from": 200 }
        ]
      }
    },
    "avg_rating": { "avg": { "field": "rating" } }
  },
  "size": 20
}
```

### Data Sync Pipeline — Debezium + Kafka Pattern

```
┌──────────┐    CDC     ┌─────────┐   Stream   ┌──────────────┐   Bulk API   ┌───────────────┐
│PostgreSQL│──────────→│  Kafka  │──────────→│ Transformer  │────────────→│ Elasticsearch │
│ (source  │  Debezium  │         │           │ (enrich,     │              │ (search index)│
│  of truth)│           │         │           │  denormalize)│              │               │
└──────────┘            └─────────┘           └──────────────┘              └───────────────┘
                                                     │
                                              Embedding Model
                                              (for vector fields)
```

Key implementation details:
- **Debezium** tails PostgreSQL's WAL (write-ahead log) and emits change events to Kafka topics
- **Kafka** provides durable, ordered delivery with at-least-once semantics
- **Transformer service** consumes Kafka events, denormalizes data (joins related entities), generates embeddings for vector fields, and bulk-indexes to Elasticsearch
- **Idempotent indexing** — use document ID as Elasticsearch `_id` so duplicate events overwrite rather than create duplicates
- **Dead letter queue** — failed indexing attempts go to a DLQ for investigation rather than blocking the pipeline
- **Reconciliation job** — hourly job compares document counts and checksums between PostgreSQL and Elasticsearch, re-indexes any discrepancies

---

## Cross-References

- **[data-modeling](../data/data-modeling.md)** — How you model your data affects what can be searched and how. Denormalization for search documents vs. normalized relational schema for writes.
- **[sql-vs-nosql](../data/sql-vs-nosql.md)** — PostgreSQL FTS keeps you in the relational world; dedicated search engines are document stores with different consistency models.
- **[caching-architecture](../data/caching-architecture.md)** — Cache hot search queries and facet results to reduce load on the search cluster. Redis is commonly used for search result caching (Airbnb pattern).
- **[event-streams-and-queues](../data/event-streams-and-queues.md)** — Kafka-based CDC pipelines are the standard pattern for syncing data from the source of truth to the search index.
