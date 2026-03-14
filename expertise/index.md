# Directory Purpose

The `expertise` directory is the central knowledge base defining architectural standards, design principles, security policies, and performance guidelines. It provides AI agents with context on system design, technology-specific best practices, and anti-patterns to avoid.

# Key Concepts

- Architectural patterns & distributed systems
- System performance & infrastructure scaling
- Application security & vulnerability mitigation
- UI/UX design, accessibility, & psychology
- Code quality, testing, & technical debt

# File Map

- `PROGRESS.md` — tracks overall completion of expertise content
- `index.md` — semantic map of the knowledge base

# Subdirectories

## `/i18n` — internationalization, localization, and RTL
- `/foundations` — architecture, Unicode, locale tags, string externalization, pluralization, dates, numbers, BiDi
- `/rtl` — RTL fundamentals, layout mirroring, typography, icons, navigation, forms, animations, testing, Arabic-specific, Hebrew-specific
- `/platform` — Flutter, React, Web CSS, iOS, Android, Backend i18n
- `/content` — translation management, machine translation, content adaptation
- `/advanced` — BiDi algorithm, complex scripts, accessibility, performance, testing

## `/antipatterns` — common mistakes and technical debt
- `/backend` — database, caching, auth, and API anti-patterns
- `/code` — smells, async, error handling, and testing flaws
- `/design` — accessibility fails, dark patterns, and bad UX
- `/frontend` — SPA, CSS, and mobile UI anti-patterns
- `/performance` — premature optimization and scaling flaws
- `/process` — code review, deployment, and AI coding pitfalls
- `/security` — security theater and secrets mismanagement

## `/architecture` — system design and distributed patterns
- `/data` — caching, event streams, search, and SQL vs NoSQL
- `/decisions` — ADRs, build vs buy, and tech selection
- `/distributed` — CAP theorem, circuit breakers, and sagas
- `/foundations` — DDD, SOLID, coupling, and 12-factor apps
- `/integration` — REST, GraphQL, gRPC, and webhooks
- `/mobile-architecture` — BFF, offline-first, and push sync
- `/patterns` — microservices, event-driven, CQRS, and monoliths
- `/scaling` — database scaling, multi-tenancy, and stateless design

## `/backend` — backend framework standards
- `go.md`, `rust.md` — systems programming guidelines
- `java-spring.md` — Spring Boot enterprise standards
- `node-typescript.md`, `python-fastapi.md` — web API best practices

## `/design` — UI/UX methodology and foundations
- `/disciplines` — design systems, user research, and interaction
- `/foundations` — typography, spacing, color theory, and a11y
- `/patterns` — auth flows, onboarding, and data display
- `/platforms` — mobile (iOS/Android), desktop, and responsive web
- `/psychology` — cognitive load and user mental models

## `/frontend` — frontend framework standards
- `react.md`, `angular.md`, `vue.md` — web SPA guidelines
- `flutter.md`, `native-android.md`, `native-ios.md`, `react-native.md` — mobile app standards
- `desktop-electron.md` — desktop app best practices

## `/infrastructure` — cloud, devops, and databases
- `cloud-aws.md`, `cloud-gcp.md` — public cloud architectures
- `cybersecurity.md` — securing infrastructure perimeters and zero-trust
- `database-postgres.md`, `database-mongodb.md` — database tuning
- `devops-cicd.md` — deployment pipeline rules

## `/performance` — optimization strategies across stacks
- `/backend` — API latency, connection pooling, and background jobs
- `/foundations` — memory management, caching, and algorithmic complexity
- `/infrastructure` — load balancing, auto-scaling, and CDN
- `/mobile` — startup time, battery, and rendering
- `/platform-specific` — Node, React, Postgres, and Flutter tuning
- `/web` — bundle optimization, Core Web Vitals, and SSR

## `/quality` — testing methodologies
- `testing-api.md`, `testing-web.md`, `testing-mobile.md` — E2E and unit testing
- `accessibility.md`, `performance.md` — quality audits

## `/security` — application security and defensive coding
- `/data` — encryption, GDPR, and database security
- `/foundations` — OWASP top 10, IAM, cryptography, and secrets
- `/infrastructure` — cloud, container, and network security
- `/mobile` — iOS/Android security, data storage, and binary protection
- `/testing` — penetration testing, threat modeling, and vulnerability scanning
- `/web` — XSS, CSRF, API security, and session management

# Dependencies

Uses:
- General software engineering industry standards (SOLID, DRY, DDD)
- OWASP Top 10 guidelines for security
- Core Web Vitals for performance measurement

# Reading Guide

If designing a new system → read `/architecture/foundations` and `/architecture/decisions`
If reviewing code for vulnerabilities → read `/security/testing` and `/antipatterns/security`
If optimizing application speed → read `/performance/foundations` and platform specific docs
If debugging code quality or smells → read `/antipatterns/code`
If updating CI/CD pipelines → read `/infrastructure/devops-cicd.md`
If designing user interfaces → read `/design/foundations` and `/design/psychology`
If adding i18n or RTL support → read `/i18n/foundations` and `/i18n/rtl`
