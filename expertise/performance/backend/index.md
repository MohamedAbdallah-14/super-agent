# Directory Purpose

The `backend` performance directory covers techniques for reducing server response times and maximizing throughput.

# Key Concepts

- Optimizing database interactions
- Managing concurrency and background tasks
- Protecting APIs from overload

# File Map

- `api-latency.md` — identifying and fixing slow endpoints
- `background-jobs.md` — offloading heavy work from the request cycle
- `connection-pooling.md` — managing database and network connections
- `database-query-optimization.md` — indexes, explain plans, and N+1 fixes
- `rate-limiting-and-throttling.md` — shedding load and protecting resources

# Reading Guide

If a specific endpoint is slow → read `api-latency.md`
If the database is bottlenecking → read `database-query-optimization.md` and `connection-pooling.md`
If a request does too much work → read `background-jobs.md`