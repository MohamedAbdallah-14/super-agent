# Directory Purpose

The `integration` directory covers styles, protocols, and patterns for enabling communication between different software systems and services.

# Key Concepts

- Synchronous vs asynchronous communication
- API design and contracts
- Real-time data streaming
- Integrating external systems

# File Map

- `api-design-graphql.md` — schemas, resolvers, and performance
- `api-design-grpc.md` — Protobufs, bidirectional streaming
- `api-design-rest.md` — resource modeling, verbs, and HATEOAS
- `third-party-integration.md` — isolating external dependencies
- `webhooks-and-callbacks.md` — event-driven HTTP callbacks
- `websockets-realtime.md` — persistent bidirectional connections

# Reading Guide

If building a public API → read `api-design-rest.md` or `api-design-graphql.md`
If integrating external vendors → read `third-party-integration.md`
If needing real-time updates → read `websockets-realtime.md`