# Directory Purpose

The `infrastructure` performance directory details how to configure cloud and networking layers to deliver data faster and handle traffic spikes.

# Key Concepts

- Distributing traffic evenly
- Caching data geographically close to users
- Monitoring system health

# File Map

- `auto-scaling.md` — scaling compute up/down based on metrics
- `cdn-and-edge.md` — edge computing, static asset delivery, and cache headers
- `load-balancing.md` — L4 vs L7 balancing, health checks, and sticky sessions
- `observability.md` — metrics, logs, traces, and APM tools

# Reading Guide

If preparing for a traffic spike → read `auto-scaling.md` and `load-balancing.md`
If global users experience latency → read `cdn-and-edge.md`
If debugging production issues → read `observability.md`