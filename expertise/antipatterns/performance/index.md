# Directory Purpose

The `performance` antipatterns directory highlights mistakes that degrade system speed, responsiveness, and scalability.

# Key Concepts

- Timing optimization vs premature optimization
- System scaling bottlenecks
- Resource exhaustion

# File Map

- `performance-antipatterns.md` — general resource leaks and blocking operations
- `premature-optimization.md` — optimizing before measuring, adding unnecessary complexity
- `scaling-antipatterns.md` — relying purely on vertical scaling, stateful services

# Reading Guide

If system is slow under load → read `scaling-antipatterns.md`
If code is unnecessarily complex for speed → read `premature-optimization.md`