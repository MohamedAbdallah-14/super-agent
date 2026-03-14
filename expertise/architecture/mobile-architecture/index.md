# Directory Purpose

The `mobile-architecture` directory covers architectural patterns and network strategies specific to mobile application development.

# Key Concepts

- Structuring mobile codebases
- Handling intermittent connectivity
- Optimizing data payloads for clients

# File Map

- `mobile-app-architecture.md` — MVC, MVVM, VIPER, and clean mobile architecture
- `mobile-backend-for-frontend.md` — BFF pattern for tailored mobile APIs
- `offline-first.md` — local data persistence, sync queues, conflict resolution
- `push-and-sync.md` — background sync, push notifications, polling

# Reading Guide

If designing mobile code structure → read `mobile-app-architecture.md`
If app needs to work without internet → read `offline-first.md`
If API payloads are too large for mobile → read `mobile-backend-for-frontend.md`