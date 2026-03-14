# Directory Purpose

The `code` antipatterns directory covers low-level programming mistakes, code smells, and poor structural decisions that decrease readability and maintainability.

# Key Concepts

- Code readability and maintainability
- Managing state and side effects
- Proper error handling and async flow
- Testing quality and reliability

# File Map

- `architecture-antipatterns.md` — structural code misalignments
- `async-antipatterns.md` — callback hell, unhandled promises
- `code-smells.md` — general bad practices (long functions, giant classes)
- `dependency-antipatterns.md` — tight coupling and dependency hell
- `error-handling-antipatterns.md` — swallowing errors, generic catch blocks
- `naming-and-abstraction.md` — misleading names, premature abstractions
- `state-management-antipatterns.md` — global state misuse, mutation flaws
- `testing-antipatterns.md` — brittle tests, tautological tests, mocking flaws

# Reading Guide

If refactoring legacy code → read `code-smells.md` and `dependency-antipatterns.md`
If reviewing error flows → read `error-handling-antipatterns.md`
If debugging flaky tests → read `testing-antipatterns.md`