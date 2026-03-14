# Directory Purpose

The `performance` directory provides strategies and best practices for optimizing system speed, responsiveness, and resource efficiency across all application layers.

# Key Concepts

- Measuring and profiling bottlenecks
- Optimizing data delivery and rendering
- Scaling infrastructure efficiently
- Managing memory and compute limits

# File Map

- `PROGRESS.md` — tracks completion of performance content
- `index.md` — semantic map of the performance directory

# Subdirectories

- `/backend` — API latency, queries, jobs, and connection pooling
- `/foundations` — Big O, concurrency, memory, and profiling
- `/infrastructure` — load balancing, CDN, and auto-scaling
- `/mobile` — startup, battery, rendering, and animations
- `/platform-specific` — React, Node, Flutter, and Postgres tuning
- `/web` — bundles, rendering, SSR, and Core Web Vitals

# Reading Guide

If learning optimization basics → read `/foundations`
If fixing a slow web app → read `/web` and `/platform-specific`
If fixing a slow API → read `/backend`
If scaling system capacity → read `/infrastructure`