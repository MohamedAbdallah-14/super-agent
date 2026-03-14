# Researcher

![Role](https://img.shields.io/badge/role-researcher-blue) ![Phase](https://img.shields.io/badge/phase-2%20%E2%80%94%20discovery-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**Evidence over assumption. Source-backed findings that make every downstream decision defensible.**

---

## What is this?

The researcher fills the knowledge gaps that the clarifier surfaces. When a task touches an unfamiliar library, an undocumented API surface, a performance constraint, or an architectural decision that needs grounding in evidence — the researcher is the role that goes and finds out.

The defining constraint of this role is epistemic discipline: **every finding must be traceable to a source**. No assertions without citations. No "I believe" without a reference. No confidence substituted for evidence. This isn't pedantry — it's what separates a research artifact that the specifier can build on from a context blob that injects unverifiable assumptions into the pipeline.

---

## Key Capabilities

- Reads and synthesizes local files, codebase structure, and documentation
- Conducts source-backed web research for external libraries, standards, and patterns
- Targets specific areas of the codebase for deep inspection
- Produces structured finding summaries linked to cited sources
- Identifies open risks and unknowns explicitly — not just what was found, but what couldn't be confirmed
- Escalates when a required source is unverifiable or when findings materially change direction

---

## How It Fits in the Pipeline

The researcher is **Phase 2**. It runs after clarification when the clarification artifact contains open questions that require investigation.

```
[clarification artifact]
[open questions list]
            │
            ▼
       [researcher]
            │
            ├──► research artifact (findings + citations)
            ├──► open risks and unknowns
            └──► finding summaries per research question
            │
            ▼
       [specifier]
```

**Triggered by:** `discover` workflow.

**Feeds into:** specifier (always), planner (when research findings affect implementation approach).

> [!NOTE]
> Research is not always required. If the clarification artifact resolves all open questions from existing knowledge and codebase inspection, the pipeline can proceed directly to specifier. The researcher is invoked only when knowledge gaps exist.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Clarified scope, explicit research questions, active source documents, verified external sources |
| **Allowed tools** | Local file reads, source-backed web research, targeted codebase inspection |
| **Output: research artifact** | All findings, each linked to a source, structured by research question |
| **Output: finding summaries** | Concise per-question summaries that the specifier can consume directly |
| **Output: open risks and unknowns** | Explicit list of what could not be confirmed, with risk assessment |

---

## Example

Given this open question from the clarification artifact:

```
Q: Which rate limiting algorithm should we use?
   Redis token bucket vs. fixed window counter vs. sliding window log?
   Impact: Affects storage, accuracy under burst, and implementation complexity.
```

The researcher produces:

**Research artifact (excerpt):**

```markdown
## Research Question
Which rate limiting algorithm is most appropriate for our use case?

## Findings

### Token Bucket (Redis)
- Allows bursts up to bucket capacity, then enforces steady rate
- Redis-native implementation via `redis-rate-limiter` (npm, MIT license)
- Requires Redis cluster; our infrastructure already runs Redis 7.x
- Source: https://redis.io/glossary/rate-limiting/ (verified 2026-03-13)
- Source: src/infrastructure/redis.config.ts (Redis client confirmed present)

### Fixed Window Counter
- Simpler implementation, O(1) Redis ops
- Known boundary issue: can allow 2x rate at window boundary
- Acceptable for our abuse-prevention use case (not billing-critical)
- Source: https://www.figma.com/blog/an-alternative-approach-to-rate-limiting/ (Figma eng blog)

### Sliding Window Log
- Most accurate, but O(n) per request at high volume
- Not recommended given our projected 10k req/min scale
- Source: RFC 6585 + internal load test results in docs/performance/2025-11.md

## Recommendation
Token bucket via Redis. Matches infrastructure, handles burst gracefully,
well-understood operational model.

## Open Risks
- Redis availability: rate limiting falls open if Redis is unreachable.
  Risk: MEDIUM. Mitigation: fail-open with logging, add circuit breaker.
- `redis-rate-limiter` last release 8 months ago — check for maintenance status.
  Risk: LOW. Mitigation: fork or use `rate-limiter-flexible` (actively maintained).
```

---

## Configuration

The researcher has no dedicated runtime configuration. Relevant settings:

| Setting | Location | Effect |
|---------|----------|--------|
| `loop_cap_guard` hook | `hooks/` | Prevents unbounded research loops; caps iterations |
| `pre_tool_capture_route` hook | `hooks/` | Routes tool outputs through capture for traceability |
| External adapters | `superagent.manifest.yaml` → `adapters` | `context_mode` is an optional research accelerator |

---

## When to Use / When NOT to Use

**Use the researcher when:**
- The clarification artifact contains open questions that cannot be resolved from existing knowledge
- The task touches an external dependency, library, or standard that needs verification
- Architecture decisions need grounding in current best practice or benchmark data
- Security or performance properties need evidence, not assertion

**Do NOT invoke the researcher when:**
- All open questions in the clarification artifact are already resolved
- You are tempted to research indefinitely as a form of scope avoidance — timebox research and surface unknowns explicitly
- You want to validate implementation choices mid-execution — that is a verifier or reviewer concern

> [!NOTE]
> The most common researcher failure is **substituting confidence for evidence**. If you cannot find a source, the output should be an open risk entry — not a confident assertion. Downstream roles depend on the distinction.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Unsupported claims | Specifier and planner will build on false premises |
| Stale or missing citations | Findings cannot be independently verified or updated |
| Substituting confidence for evidence | The worst failure — undetectable false premises enter the artifact chain |

---

## Related

- [Roles Overview](README.md)
- [clarifier](clarifier.md) — upstream role that defines research questions
- [specifier](specifier.md) — downstream role that consumes research findings
- [Discover Workflow](../workflows/discover.md) _(coming soon)_
