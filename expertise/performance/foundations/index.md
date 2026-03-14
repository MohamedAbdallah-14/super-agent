# Directory Purpose

The `foundations` performance directory establishes the theoretical and practical basics of writing efficient code and measuring system speed.

# Key Concepts

- Identifying computational complexity
- Implementing caching correctly
- Setting limits and tracking regressions

# File Map

- `algorithmic-complexity.md` — Big O notation and choosing the right data structures
- `caching-strategies.md` — read-through, write-behind, and cache invalidation
- `concurrency-and-parallelism.md` — threads, async, locks, and race conditions
- `measuring-and-profiling.md` — flame graphs, tracing, and identifying bottlenecks
- `memory-management.md` — garbage collection, memory leaks, and object pools
- `performance-budgets.md` — setting CI/CD limits on bundle sizes and latency

# Reading Guide

If code is generally inefficient → read `algorithmic-complexity.md`
If experiencing OOM errors → read `memory-management.md`
If unsure where the app is slow → read `measuring-and-profiling.md`