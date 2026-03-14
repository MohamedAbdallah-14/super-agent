# Directory Purpose

The `data` architecture directory covers strategies for persisting, caching, and moving data efficiently and reliably across systems.

# Key Concepts

- Choosing the right datastore
- Designing robust data models
- Managing consistency in distributed environments
- Decoupling systems with event streams

# File Map

- `caching-architecture.md` — caching layers, eviction, and topology
- `data-consistency.md` — eventual consistency, distributed transactions
- `data-modeling.md` — schema design, normalization vs denormalization
- `event-streams-and-queues.md` — Kafka, RabbitMQ, pub/sub topologies
- `search-architecture.md` — full-text search, Elasticsearch, indexing
- `sql-vs-nosql.md` — database selection criteria and tradeoffs

# Reading Guide

If picking a database → read `sql-vs-nosql.md`
If designing schemas → read `data-modeling.md`
If implementing async messaging → read `event-streams-and-queues.md`