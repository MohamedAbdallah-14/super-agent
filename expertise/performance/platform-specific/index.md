# Directory Purpose

The `platform-specific` performance directory provides deep-dive optimization techniques tailored to specific tools and frameworks.

# Key Concepts

- Framework-specific rendering cycles
- Language-level runtime optimizations
- Database-specific tuning

# File Map

- `flutter-performance.md` — rebuilds, isolates, and const constructors
- `node-performance.md` — event loop blocking, clustering, and V8 tuning
- `postgres-performance.md` — vacuuming, BRIN/GIN indexes, and shared buffers
- `react-performance.md` — memoization, virtual DOM, and useMemo/useCallback

# Reading Guide

If optimizing a React app → read `react-performance.md`
If tuning a Postgres DB → read `postgres-performance.md`
If debugging a Node service → read `node-performance.md`