# Learner

![Role](https://img.shields.io/badge/role-learner-blue) ![Phase](https://img.shields.io/badge/phase-13%20%E2%80%94%20learning-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**The run is done. The learner makes sure the next run is smarter — without silently mutating the system.**

---

## What is this?

The learner closes the feedback loop. After a run completes — or after a review surfaces significant findings — the learner reads the run artifacts, review findings, and verification evidence, and extracts durable, scoped learnings that can improve future runs.

The key constraint is in the name: learnings are **proposed**, not auto-applied. The learner produces artifacts for human review. It does not silently update role contracts, operating rules, or shared defaults. Any proposed learning that is broad enough to affect the core system must be escalated.

This discipline prevents one of the most dangerous failure modes in AI-assisted engineering: a system that "learns" its way into inconsistency by accumulating unreviewed mutations to its own operating rules.

---

## Key Capabilities

- Synthesizes run artifacts, review findings, and verification evidence into proposed learnings
- Structures learnings with confidence levels and explicit scope (project-local vs. system-wide)
- Produces experiment summaries when the run tested a hypothesis or tried a new approach
- Records git-flow violations (bad branch names, non-conventional commits, missing changelog) as learnings for injection into future executor prompts
- Tracks patterns of violations across runs
- Escalates when a proposed learning is broad enough to affect fresh-run defaults or core operating rules

---

## How It Fits in the Pipeline

The learner is **Phase 13** — the final role in the pipeline. It runs after review.

```
[run artifacts]
[review findings]
[verification evidence]
            │
            ▼
       [learner]
            │
            ├──► proposed learning artifacts
            ├──► experiment summaries
            └──► confidence and scope metadata
            │
            ▼
  [operator review] ──► approve / reject / escalate each learning
            │
            ▼
  [prepare-next] ──► approved learnings injected into next run context
```

**Triggered by:** `learn` workflow, or as part of `prepare-next`.

**Feeds into:** operator review, then `prepare-next` workflow for the next task.

> [!NOTE]
> Approved learnings that are project-local are stored in `~/.superagent/projects/<project-slug>/memory/`. System-wide learnings require a PR to the core repo and explicit reviewer approval.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Run artifacts (spec, plan, execution notes), review findings, verification evidence |
| **Allowed tools** | Local file reads, artifact synthesis, experiment/result comparison |
| **Output: proposed learning artifacts** | Each learning: observation, evidence, proposed change, confidence, scope |
| **Output: experiment summaries** | For runs that tested an approach: hypothesis, result, conclusion |
| **Output: confidence and scope metadata** | How certain is this learning? Where does it apply? |

---

## Learning Structure

Each proposed learning follows a consistent structure:

```markdown
## Learning: [short title]

### Observation
What was observed across this run (or pattern of runs).

### Evidence
- review/findings.md → FINDING-2: alerting path used console.log instead of alert service
- review/findings.md → FINDING pattern (3 of last 4 runs): Redis fail-open path omits alerting

### Proposed Change
Add to executor context for infrastructure tasks:
"When implementing fail-open paths, use src/services/alerting.ts — not console.log.
See src/services/alerting.ts for the interface."

### Confidence
MEDIUM — observed in 3 of 4 runs with Redis integration tasks.

### Scope
project-local — specific to this codebase's alerting pattern.
Does NOT affect system-wide defaults.

### Status
PROPOSED — awaiting operator review.
```

---

## Example

After the rate limiting run review:

**Proposed learning artifacts (excerpt):**

```markdown
# Proposed Learnings: Rate Limiting Run (2026-03-13)

## Learning 1: Fail-open alerting path
Observation: Executor used console.log for fail-open alert path.
Evidence: FINDING-2 (BLOCKING) in review/rate-limiting-review.md
Proposed change: Inject into executor context for Redis tasks:
  "Fail-open paths must use alerting service, not console.log.
   Interface: src/services/alerting.ts → alert(level, message, context)"
Confidence: HIGH — clear pattern, single correct path in codebase.
Scope: project-local.

## Learning 2: Rate limit header format ambiguity
Observation: X-RateLimit-Reset format was not specified in spec.
Evidence: FINDING-1 (NON-BLOCKING) in review/rate-limiting-review.md
Proposed change: Add to specifier context for API header tasks:
  "Specify format for date/time headers explicitly:
   Unix timestamp (seconds) | ISO 8601 | delta-seconds (RFC 7231 §7.1.3)"
Confidence: MEDIUM — general principle, applies beyond this project.
Scope: ESCALATE — broad enough to affect specifier defaults system-wide.

## Experiment Summary: Token bucket vs. fixed window
Hypothesis: Token bucket via rate-limiter-flexible would be simpler to implement
  than building a fixed window counter from scratch.
Result: Implementation took 2 tasks, 3 commits, 0 blocking review findings on the
  algorithm itself. redis-rate-limiter-flexible API was straightforward.
Conclusion: Confirmed. For future rate limiting tasks in this codebase,
  rate-limiter-flexible is the recommended starting point.
```

---

## Git-Flow Responsibilities

The learner specifically tracks git-flow quality across runs:

```
Record:
- Branch naming violations (e.g., "changes" instead of "feature/...")
- Commits that failed conventional format on the first attempt
- Missing changelog entries caught by verifier or reviewer

Track:
- Patterns across multiple runs (same executor, same task type)

Propose:
- Injecting reminders into executor context when patterns are detected
- Escalating if a pattern suggests the executor's baseline prompt needs updating
```

This creates a self-improving loop: violations caught in review become learnings that prevent the same violation in future executions.

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| State root | `superagent.manifest.yaml` → `paths.state_root_default` | Approved project-local learnings stored at `~/.superagent/projects/<slug>/memory/` |
| `memory/` path | repo `memory/` directory | Shared team learnings committed to repo |
| `prepare_next` workflow | `workflows/` | Injects approved learnings into next run context |

---

## When to Use / When NOT to Use

**Use the learner when:**
- A run has completed (reached approved review verdict)
- A review session surfaced significant findings — even if the run is not complete
- You want to capture an experiment result while the evidence is fresh
- Multiple runs have shown the same pattern and it needs to be captured before it is forgotten

**Do NOT invoke the learner when:**
- The run is still in progress — wait for review to complete
- You want to use it to auto-apply changes to role contracts or operating rules — that requires escalation and PR review
- You want to record opinions without evidence — every learning must be tied to an artifact or observation

> [!WARNING]
> **Auto-applied learning drift** is the most serious learner failure condition. A learning that silently changes a role contract, a default behavior, or a core operating rule — without going through escalation and operator review — corrupts the system in ways that are very hard to detect and reverse.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Auto-applied learning drift | Core system rules change without review; corruption is invisible and cumulative |
| Missing evidence | Learning cannot be evaluated; may be noise or bias rather than signal |
| Unscoped learnings | A project-specific pattern gets applied system-wide; wrong context, wrong effect |

---

## Related

- [Roles Overview](README.md)
- [reviewer](reviewer.md) — upstream role (produces findings that feed learner)
- [clarifier](clarifier.md) — invoked in `prepare-next` with approved learnings injected
- [Learn Workflow](../workflows/learn.md) _(coming soon)_
- [Prepare-Next Workflow](../workflows/prepare-next.md) _(coming soon)_
