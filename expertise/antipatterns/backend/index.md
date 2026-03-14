# Directory Purpose

The `backend` antipatterns directory highlights common structural, performance, and architectural mistakes specifically found in backend systems, APIs, and databases.

# Key Concepts

- Database and query inefficiencies
- Poor caching and invalidation strategies
- Faulty microservices communication
- Broken authentication and authorization

# File Map

- `api-design-antipatterns.md` — flaws in API contracts and REST/GraphQL usage
- `auth-antipatterns.md` — common mistakes in authentication flows
- `caching-antipatterns.md` — cache stampedes, stale data, and misuse
- `database-antipatterns.md` — N+1 queries, poor indexing, and schema flaws
- `microservices-antipatterns.md` — distributed monoliths and tight coupling

# Reading Guide

If reviewing API endpoints → read `api-design-antipatterns.md`
If diagnosing slow queries → read `database-antipatterns.md`
If reviewing auth flows → read `auth-antipatterns.md`