# Specifier

![Role](https://img.shields.io/badge/role-specifier-blue) ![Phase](https://img.shields.io/badge/phase-3%20%E2%80%94%20specification-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**If it can't be tested, it's not a spec. The specifier turns research into a contract the whole pipeline can build on.**

---

## What is this?

The specifier transforms clarified scope and research findings into a spec artifact: a precise, reviewable, measurable definition of what the system should do. Not how it should do it — that's the planner's job — but what it must do, how correctness will be verified, and what is explicitly out of scope.

A good spec artifact is the single most valuable document in any engineering pipeline. It is what separates a shared understanding from a series of individual interpretations. The specifier's job is to make that shared understanding concrete, testable, and resistant to scope creep.

---

## Key Capabilities

- Synthesizes clarification and research artifacts into a single coherent spec
- Produces measurable, testable acceptance criteria — not prose descriptions of success
- Makes assumptions and non-goals explicit, not implicit
- Reads schemas and templates to produce spec artifacts in the correct format
- Escalates when acceptance criteria cannot be made testable or when scope is still unstable
- Refuses to overbuild — the spec covers only what has been approved

---

## How It Fits in the Pipeline

The specifier is **Phase 3**. It runs after clarification and (optionally) research. Its output — the approved spec artifact — is the foundation for every downstream role.

```
[clarification artifact]
[research artifacts]
[operator constraints and approvals]
            │
            ▼
       [specifier]
            │
            ├──► spec artifact
            ├──► measurable acceptance criteria
            └──► explicit non-goals and assumptions
            │
            ▼
  [spec-challenge review]  ──► reviewer adversarially challenges the spec
            │
            ▼
       [designer]  (if visual design is required)
       [planner]   (if no design phase)
```

**Triggered by:** `specify` workflow.

**Feeds into:** `spec-challenge` workflow (reviewer role), then designer or planner.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Clarification artifact, research artifacts, operator constraints and approvals |
| **Allowed tools** | Local file reads, schema/template inspection, targeted repo reads |
| **Output: spec artifact** | Full feature specification — scope, behavior, acceptance criteria, non-goals, assumptions |
| **Output: acceptance criteria** | Each criterion is measurable and maps to a verifiable test or check |
| **Output: non-goals and assumptions** | Explicit list of what is out of scope and what is assumed true without investigation |

---

## Example

Building on the rate limiting clarification and research:

**Spec artifact (excerpt):**

```markdown
# Spec: Per-User API Rate Limiting

## Scope
Implement per-API-key token bucket rate limiting on all public API endpoints.
Rate limit: 100 requests per 60-second window per API key.

## Behavior
- Every request includes rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- When a key exceeds the limit, the API returns HTTP 429 with a Retry-After header
- Rate limit state is stored in Redis using the token bucket algorithm
- If Redis is unreachable, the request is allowed (fail-open) and an alert is emitted

## Acceptance Criteria
1. [ ] A key making 100 requests within 60s receives HTTP 200 for all 100
2. [ ] The 101st request within 60s receives HTTP 429 with Retry-After header
3. [ ] After the window resets, the key can make 100 requests again
4. [ ] All 200 responses include X-RateLimit-* headers with correct values
5. [ ] Redis failure test: mock Redis unavailable → requests pass through, alert fires
6. [ ] Existing authenticated client integration tests continue to pass unchanged

## Non-Goals
- Per-IP rate limiting (not in scope for this iteration)
- Rate limit tiers per subscription plan (future iteration)
- Admin UI for rate limit configuration (future iteration)

## Assumptions
- Redis 7.x is available in all deployment environments
- API keys are already present in request context via existing auth middleware
- `rate-limiter-flexible` npm package is acceptable (MIT license, actively maintained)

## Cited Sources
- input/brief.md
- research/2026-03-13-rate-limiting.md
- src/middleware/auth.ts (API key context confirmed)
```

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `artifact-schema` validation check | `superagent.manifest.yaml` | Validates spec artifact schema before handoff |
| `docs-required` validation check | `superagent.manifest.yaml` | Enforces that spec artifact is present before plan phase |
| Spec templates | `templates/` | Canonical structure for spec artifacts |

---

## When to Use / When NOT to Use

**Use the specifier when:**
- Clarification and research are complete and you need a reviewable definition of done
- You need to establish explicit non-goals to prevent scope creep during execution
- Multiple stakeholders need to agree on what will be built before work begins
- The task is complex enough that "I'll figure it out as I go" will cause problems in review

**Do NOT invoke the specifier when:**
- Scope is still unstable — go back to clarifier or escalate
- You want to use it to spec out ideas that have not received operator approval
- The spec becomes a place to embed implementation decisions — those belong in the plan

> [!WARNING]
> Overbuilding is a specifier failure condition. The spec covers exactly what has been approved. Sneaking in "nice to have" features, undiscussed API changes, or unscoped improvements is a contract violation — the reviewer will flag it and the executor must not implement it.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Unverifiable acceptance criteria | Verifier cannot produce proof; reviewer cannot make a verdict |
| Hidden assumptions | Planner and executor build on false premises without knowing it |
| Overbuilding beyond approved scope | Downstream roles implement unapproved work; review will reject it |

---

## Related

- [Roles Overview](README.md)
- [clarifier](clarifier.md) — upstream role
- [researcher](researcher.md) — upstream role
- [designer](designer.md) — next role when visual design is required
- [planner](planner.md) — next role when no design phase
- [reviewer](reviewer.md) — challenges the spec in `spec-challenge` workflow
- [Specify Workflow](../workflows/specify.md) _(coming soon)_
- [Spec-Challenge Workflow](../workflows/spec-challenge.md) _(coming soon)_
