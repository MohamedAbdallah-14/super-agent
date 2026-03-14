# Directory Purpose

The `scaling` directory details strategies for increasing a system's capacity, availability, and organizational efficiency.

# Key Concepts

- Scaling databases and compute
- Designing for statelessness
- Safely rolling out features
- Multi-tenant architectures for SaaS

# File Map

- `database-scaling.md` — sharding, replication, partitioning, read replicas
- `feature-flags-and-rollouts.md` — dark launches, canary releases, A/B testing
- `horizontal-vs-vertical.md` — scaling out vs scaling up
- `multi-tenancy.md` — isolated vs shared databases, tenant routing
- `stateless-design.md` — sharing nothing, externalizing session state

# Reading Guide

If building a B2B SaaS → read `multi-tenancy.md`
If database is bottlenecking → read `database-scaling.md`
If deploying risky changes → read `feature-flags-and-rollouts.md`