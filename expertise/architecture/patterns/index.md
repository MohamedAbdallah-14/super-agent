# Directory Purpose

The `patterns` directory outlines high-level structural blueprints for software systems, detailing their tradeoffs and use cases.

# Key Concepts

- Monolithic vs distributed structures
- Event-driven and decoupled systems
- Organizing business logic and infrastructure

# File Map

- `cqrs-event-sourcing.md` — separating reads/writes, immutable event logs
- `event-driven.md` — choreographies, message brokers, event buses
- `hexagonal-clean-architecture.md` — ports and adapters, isolating domain logic
- `layered-architecture.md` — N-tier architecture (presentation, logic, data)
- `microservices.md` — independent deployment, service boundaries
- `modular-monolith.md` — single deployment with strict internal boundaries
- `monolith.md` — traditional single-tier application design
- `plugin-architecture.md` — extensible microkernel designs
- `serverless.md` — FaaS, ephemeral compute, event triggers

# Reading Guide

If starting a new typical web app → read `modular-monolith.md` or `layered-architecture.md`
If building complex domain logic → read `hexagonal-clean-architecture.md`
If scaling across many teams → read `microservices.md` or `event-driven.md`