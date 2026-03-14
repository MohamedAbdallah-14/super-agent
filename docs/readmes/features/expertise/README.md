# Expertise System

SuperAgent's expertise system is a curated library of **255 knowledge modules** spanning
architecture, security, performance, design, and more. Modules are loaded selectively into
agent prompts — giving the right knowledge to the right role at the right phase — without
flooding context with irrelevant content.

---

## What It Is

The `expertise/` directory is the knowledge base that agents consult during planning,
specification, execution, and review. Every module is:

- **Research-backed** — grounded in industry standards (OWASP, Core Web Vitals, SOLID,
  12-Factor), real breach post-mortems, and authoritative framework documentation.
- **Phase-scoped** — metadata in `expertise/index.yaml` declares which workflow phases
  each module applies to, enabling targeted loading rather than brute-force context dumps.
- **Antipattern-first for review** — the `antipatterns/` category is always consulted
  before broader domain modules when the reviewer role runs.

---

## Module Structure

Each module is a Markdown file with a frontmatter-style header block, cross-references,
and structured sections:

```
# <Title> — <Category> Expertise Module

> One-sentence purpose statement.
> **Category:** <category>
> **Complexity:** Simple | Moderate | Complex
> **Applies when:** <scope description>

**Cross-references:** [related-module], [related-module]

---

## What This Is (and What It Isn't)
## When to Use It
## <Domain-specific sections>
## Anti-Patterns / Common Mistakes
## References
```

Antipattern modules follow a parallel structure keyed on `AP-NN` identifiers:

```
### AP-01: <Pattern Name>
**Frequency:** Common | Very Common
**Severity:** Low | Medium | High | Critical
**Detection difficulty:** Easy | Medium | Hard
**What it looks like:** <code example>
**Why developers do it:** ...
**What goes wrong:** ...
**The fix:** ...
```

---

## Categories

| Category | Path | Modules | Domain | Key Content |
|---|---|---|---|---|
| Architecture | `expertise/architecture/` | 40+ | system-design | DDD, SOLID, 12-Factor, microservices, CQRS, event-driven, CAP theorem, circuit breakers |
| Backend | `expertise/backend/` | 8 | implementation | Node/TS, Python/FastAPI, Go, Rust, Java/Spring, Solidity, embedded firmware |
| Frontend | `expertise/frontend/` | 9 | implementation | React, Vue, Angular, Flutter, iOS, Android, React Native, Electron |
| Security | `expertise/security/` | 12+ | security | OWASP Top 10, IAM, cryptography, secrets management, smart-contract security, agentic identity |
| Performance | `expertise/performance/` | 25+ | performance | API latency, Core Web Vitals, bundle optimization, mobile startup, connection pooling, CDN |
| Design | `expertise/design/` | 20+ | product-design | Typography, color theory, design systems, cognitive load, microinteractions, behavioral nudges |
| Quality | `expertise/quality/` | 8 | quality | Web/mobile/API testing, accessibility, evidence-based verification, ML model audit |
| Infrastructure | `expertise/infrastructure/` | 6 | operations | AWS, GCP, Postgres, MongoDB, DevOps/CI-CD, cybersecurity |
| i18n | `expertise/i18n/` | 30+ | product-quality | Unicode, RTL layout, pluralization, BiDi algorithm, Flutter/React/iOS/Android i18n |
| Antipatterns | `expertise/antipatterns/` | 50+ | review | Code smells, async failures, security theater, AI coding pitfalls, architecture drift |

---

## Loading Policy

Modules are not loaded all at once. `expertise/index.yaml` governs which modules belong to
which phases:

```
                ┌─────────────────────────────────────────┐
                │          expertise/index.yaml            │
                │  id: architecture                        │
                │  review_applicability: [specify, plan,   │
                │                         review]          │
                │  freshness_date: 2026-03-11              │
                └─────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     specify phase    plan phase     review phase
  loads architecture  loads          loads antipatterns
  + security slices   performance    FIRST, then domain
                       + infra        modules as needed
```

Role-specific loading rules:

- `clarify` / `discover` — `input/`, active docs, `docs/research/`
- `specify` / `plan` — only expertise slices relevant to the current stack and risks
- `review` — always loads `expertise/antipatterns/` first, then broader domain modules
- `learn` — may propose expertise updates but may not silently rewrite existing modules

---

## How to Browse

**By use case:**

| Goal | Start here |
|---|---|
| Designing a new system | `expertise/architecture/foundations/` + `expertise/architecture/decisions/` |
| Reviewing for vulnerabilities | `expertise/security/testing/` + `expertise/antipatterns/security/` |
| Optimizing performance | `expertise/performance/foundations/` + platform-specific subdirectory |
| Debugging code quality | `expertise/antipatterns/code/` |
| Adding i18n or RTL support | `expertise/i18n/foundations/` + `expertise/i18n/rtl/` |
| Designing user interfaces | `expertise/design/foundations/` + `expertise/design/psychology/` |
| CI/CD pipeline work | `expertise/infrastructure/devops-cicd.md` |

**By index:** `expertise/index.yaml` — machine-readable metadata with `domain`, `use_cases`,
`review_applicability`, and `freshness_date` per module group.

**Semantic map:** `expertise/index.md` — human-readable directory tour with per-subdirectory
file maps and a reading guide.

---

## Antipatterns

`expertise/antipatterns/` is a first-class review instrument. It covers seven sub-domains:

| Sub-domain | Examples |
|---|---|
| `code/` | God classes, async anti-patterns, naming violations, testing flaws |
| `backend/` | N+1 queries, cache stampedes, auth bypasses, API contract breaks |
| `frontend/` | SPA over-fetching, CSS specificity wars, mobile UI jank |
| `security/` | Security theater, secrets in env vars, weak session management |
| `performance/` | Premature optimization, missing indexes, synchronous hot paths |
| `design/` | Dark patterns, inaccessible color contrast, broken onboarding flows |
| `process/` | Fake completion, shallow tests, AI-coding failure modes, review theater |

The `process/` category captures AI-specific failure modes — patterns where agents
produce plausible-looking output that silently fails to meet requirements.

---

## Adding a New Module

1. Choose the correct category subdirectory (or create a new one with an `index.md`).
2. Write the module in the standard structure: purpose block, cross-references, sections.
3. Add an entry to `expertise/index.yaml` with `id`, `path`, `domain`, `use_cases`,
   `review_applicability`, and `freshness_date`.
4. The `learn` role may propose updates via standard artifact output; direct edits to
   existing modules require explicit human approval.
5. Run `superagent validate manifest` to confirm schema and path integrity after changes.

---

## Key Files

| File | Purpose |
|---|---|
| `expertise/index.yaml` | Machine-readable module registry with phase metadata |
| `expertise/index.md` | Human-readable semantic map and reading guide |
| `expertise/PROGRESS.md` | Authoring history: 32 modules, 255 total files, completion dates |
| `expertise/README.md` | Directory contract: what is and is not allowed here |
