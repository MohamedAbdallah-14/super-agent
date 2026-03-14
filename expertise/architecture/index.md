# Directory Purpose

The `architecture` directory contains principles, patterns, and strategies for designing scalable, maintainable, and robust software systems.

# Key Concepts

- High-level system design patterns
- Distributed systems and networking
- Data flow and persistence strategies
- Making and documenting architectural decisions
- Scaling systems to handle load

# File Map

- `PROGRESS.md` — tracks completion of architecture content
- `index.md` — semantic map of the architecture directory

# Subdirectories

- `/data` — caching, consistency, data modeling, and queues
- `/decisions` — ADRs, build vs buy, and tech selection
- `/distributed` — CAP theorem, sagas, circuit breakers, and retries
- `/foundations` — DDD, SOLID, coupling/cohesion, and 12-factor apps
- `/integration` — REST, GraphQL, gRPC, webhooks, and websockets
- `/mobile-architecture` — BFF, offline-first, and sync
- `/patterns` — microservices, event-driven, CQRS, clean architecture
- `/scaling` — horizontal/vertical scaling, multi-tenancy, feature flags

# Reading Guide

If starting a new project → read `/foundations` and `/patterns`
If designing APIs → read `/integration`
If scaling an application → read `/scaling` and `/data`
If building a mobile app → read `/mobile-architecture`