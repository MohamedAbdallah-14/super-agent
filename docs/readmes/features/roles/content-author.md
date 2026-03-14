# Content Author

![Role](https://img.shields.io/badge/role-content--author-blue) ![Phase](https://img.shields.io/badge/phase-5%20%E2%80%94%20authoring-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

**From approved spec to production-ready content — before a single pixel is designed or line of code is written.**

---

## What is this?

The content author writes and packages all non-code content artifacts for downstream consumption by the designer, planner, and executor. It produces microcopy tables, i18n keys, seed data, terminology glossaries, asset metadata, notification templates, and a content coverage matrix — all before design begins.

This phase prevents the second most common cause of implementation rework: designing and building UI around placeholder text. When the designer and executor receive not just a spec but also finalized copy, locale keys, and a glossary, they are implementing against real content constraints — not lorem ipsum that will break layouts when replaced with production strings.

The content author sits between `spec-challenge` (approved spec) and `design` (visual design). It is optional for tasks with no user-facing content and mandatory for any feature with UI text, notifications, or locale-sensitive output.

---

## Key Capabilities

- Produces microcopy tables covering all UI states (empty, loading, error, success, edge cases)
- Generates i18n key definitions with values for all required locales
- Creates seed and fixture content values for development, testing, and demos
- Builds a terminology glossary to ensure consistent domain language across the feature
- Produces an asset metadata manifest (image alt text, icon labels, ARIA descriptions)
- Writes notification and transactional content templates (email, push, in-app)
- Generates a content coverage matrix mapping every screen to every key to every locale
- Validates content against brand and style guidelines when available
- Flags layout-breaking copy (long translations, RTL considerations) for designer awareness
- Uses web research for terminology accuracy and domain-specific data
- Escalates when content decisions require product or business input not present in the spec

---

## How It Fits in the Pipeline

The content author is **Phase 5**. It runs after spec-challenge approval and before design.

```
[approved spec artifact]
[research artifacts]
[existing glossary/locale sources]
[brand/style guidelines]
            |
            v
    [content-author]
            |
            |---> microcopy tables (all UI states)
            |---> i18n keys with locale values
            |---> seed/fixture content
            |---> terminology glossary
            |---> asset metadata manifest
            |---> notification/transactional templates
            |---> content coverage matrix
            |
            v
    [designer]  --> designs with real content, not placeholders
            |
            v
    [planner]
```

**Triggered by:** `author` workflow.

**Feeds into:** `design` workflow (designer role), then planner and executor.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Approved spec artifact, research artifacts, existing glossary/locale sources, brand/style guidelines (if available) |
| **Allowed tools** | Local file reads, web research for terminology and domain data, translation reference tools |
| **Output: microcopy tables** | All UI text for every state (empty, loading, error, success, edge cases) |
| **Output: i18n keys** | Key definitions with values for all required locales |
| **Output: seed/fixture content** | Development, testing, and demo content values |
| **Output: terminology glossary** | Consistent domain language definitions for the feature |
| **Output: asset metadata manifest** | Image alt text, icon labels, ARIA descriptions |
| **Output: notification templates** | Email, push, and in-app transactional content |
| **Output: content coverage matrix** | Screen-to-key-to-locale mapping for completeness verification |

---

## Example

Given a spec for a rate limit exceeded error state:

**Author artifact (excerpt):**

```markdown
# Author Artifact: Rate Limit UI Content

## Microcopy Table

| Screen | State | Key | en-US | es-ES |
|--------|-------|-----|-------|-------|
| API Playground | Rate limited | rate_limit.banner.title | Rate limit exceeded | Limite de velocidad excedido |
| API Playground | Rate limited | rate_limit.banner.body | You have exceeded your API rate limit. Retry in {retryAfter} seconds. | Ha excedido su limite de velocidad de API. Reintente en {retryAfter} segundos. |
| API Playground | Rate limited | rate_limit.banner.action | View usage | Ver uso |
| Dev Tools | Headers visible | rate_limit.headers.title | Rate Limit Headers | Encabezados de limite de velocidad |

## Terminology Glossary

| Term | Definition | Usage Note |
|------|-----------|------------|
| Rate limit | Maximum number of API requests allowed in a time window | Always "rate limit" (two words), never "ratelimit" or "rate-limit" in UI copy |
| Retry-After | HTTP header indicating seconds until quota resets | Hyphenated in header context; "retry after" in prose |

## Content Coverage Matrix

| Screen | Keys | en-US | es-ES | Notes |
|--------|------|-------|-------|-------|
| API Playground — rate limited | 3 | 3/3 | 3/3 | Complete |
| Dev Tools — headers | 1 | 1/1 | 1/1 | Complete |

## Layout Flags

- es-ES `rate_limit.banner.body` is 18% longer than en-US — designer should verify banner auto-height
```

---

## Git-Flow Responsibilities

The content author follows a strict commit convention:

```bash
feat(content): add rate limit UI microcopy and i18n keys
```

Content artifacts live in the **run-local state directory** (`~/.superagent/projects/<project-slug>/author/`), not in the repository. Only exported i18n key files and glossary entries committed to the repo follow the project's existing locale file structure.

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `author` workflow | `workflows/` | Gates design phase behind content approval |
| Brand/style guidelines | `input/` or project docs | Constrains tone, terminology, and formatting; content author reads but does not mutate |
| Locale configuration | `superagent.manifest.yaml` or project config | Defines which locales must have complete coverage |

> [!NOTE]
> The author phase is **optional**. It is not required for tasks with no user-facing content. Tasks without UI text, notifications, or locale-sensitive output skip the author phase entirely and proceed from `spec-challenge` directly to `design` (or `plan` if design is also skipped).

---

## When to Use / When NOT to Use

**Use the content author when:**
- The spec describes user-facing text, notifications, or locale-sensitive output
- You need to prevent layout breakage caused by placeholder-to-production text swaps
- Multiple locales must be supported and coverage must be verified before design
- Terminology consistency matters across the feature (domain-specific language)
- Notification or transactional email templates need authoring

**Do NOT invoke the content author when:**
- The task is purely backend, infrastructure, or CLI with no user-facing text — skip to design or plan
- Content already exists in the project's locale files and only needs wiring — that is executor work
- You are in mid-execution and want to change copy — that is an out-of-scope change requiring a new spec

> [!WARNING]
> Content drift from the approved spec is a failure condition. The content author must write copy that implements what the spec describes, not what sounds better or covers additional states. Any divergence must be escalated before the author artifact is produced.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Incomplete state coverage (missing copy for any UI state) | Designer creates frames without text; executor hardcodes placeholders |
| Missing locale entries (key exists in one locale but not others) | Shipped feature shows raw keys or fallback text in some locales |
| Placeholder or dummy text (lorem ipsum, test123, John Doe) | Placeholders leak to production; reviewer will reject |
| Glossary conflicts (same term defined differently) | Inconsistent terminology confuses users and breaks search/filter |
| Copy that violates brand constraints | Brand team rejects post-ship; rework required |
| Untraceable copy (no screen-to-key mapping) | Executor cannot wire content; verifier cannot prove coverage |
| Layout-breaking copy not flagged for designer awareness | Long translations break layouts discovered only in QA |

---

## Related

- [Roles Overview](README.md)
- [specifier](specifier.md) — upstream role (produces the approved spec)
- [designer](designer.md) — downstream role (designs with authored content)
- [planner](planner.md) — downstream role (plans implementation with content artifacts)
- [executor](executor.md) — uses i18n keys and content directly
- [reviewer](reviewer.md) — validates content coverage in review
- [Author Workflow](../workflows/author.md)
