# Directory Purpose

The `distributed` directory focuses on the complexities, patterns, and principles of building systems that operate across multiple networked machines.

# Key Concepts

- Navigating network unreliability
- Handling distributed transactions
- Protecting system resilience
- Managing state and consensus

# File Map

- `cap-theorem-and-tradeoffs.md` — Consistency, Availability, Partition tolerance
- `circuit-breaker-bulkhead.md` — fault tolerance and isolation patterns
- `consensus-and-coordination.md` — leader election, distributed locking
- `distributed-systems-fundamentals.md` — fallacies of distributed computing
- `idempotency-and-retry.md` — safe retries, exponential backoff, jitter
- `saga-pattern.md` — managing long-running distributed transactions

# Reading Guide

If handling unreliable APIs → read `idempotency-and-retry.md` and `circuit-breaker-bulkhead.md`
If building distributed transactions → read `saga-pattern.md`
If learning distributed theory → read `distributed-systems-fundamentals.md`