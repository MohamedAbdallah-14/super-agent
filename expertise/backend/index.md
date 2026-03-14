# Directory Purpose

The `backend` directory provides language and framework-specific guidelines for building robust, secure, and scalable server-side applications and APIs.

# Key Concepts

- Backend framework idioms and conventions
- Dependency injection and routing
- Managing asynchronous operations and concurrency

# File Map

- `index.md` — semantic map of the backend directory
- `go.md` — Goroutines, channels, and standard library idioms
- `java-spring.md` — Spring Boot, dependency injection, and JPA
- `node-typescript.md` — Express/NestJS, event loop, and TS typing
- `python-fastapi.md` — Pydantic, async/await, and dependency injection
- `rust.md` — Cargo, ownership model, and safe concurrency

# Reading Guide

If writing a Node service → read `node-typescript.md`
If writing a high-performance systems service → read `go.md` or `rust.md`
If writing a Python API → read `python-fastapi.md`