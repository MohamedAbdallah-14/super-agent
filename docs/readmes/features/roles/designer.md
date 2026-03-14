# Designer

![Role](https://img.shields.io/badge/role-designer-blue) ![Phase](https://img.shields.io/badge/phase-6%20%E2%80%94%20design-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green) ![Adapter](https://img.shields.io/badge/adapter-open--pencil%20MCP-orange)

**From approved spec to pixel-perfect visual source of truth — before a single line of implementation code is written.**

---

## What is this?

The designer transforms the approved spec into visual designs. It uses open-pencil MCP tools to create Figma-compatible design files, export code scaffolds, and produce design tokens — all before planning or execution begins.

This phase prevents the single most common cause of implementation rework: building the wrong UI. When the planner and executor receive not just a spec but also a `.fig` file, JSX scaffolds, and design tokens, they are implementing a defined visual contract, not interpreting a text description.

The designer sits between `author` (content authoring, which is itself optional) and `plan` (implementation planning). It is optional for non-visual tasks and mandatory for any feature with a user interface.

---

## Key Capabilities

- Creates Figma-compatible `.fig` design files via open-pencil MCP tools
- Exports Tailwind JSX scaffolds ready for direct integration
- Exports HTML + CSS scaffolds as fallback or alternative targets
- Produces design tokens JSON (colors, spacing, typography, shadows) synchronized with visual source
- Captures screenshot PNGs of all key frames for review and documentation
- Escalates when spec is ambiguous about visual requirements or when brand constraints conflict with usability

---

## How It Fits in the Pipeline

The designer is **Phase 6**. It runs after author approval (or spec-challenge if author is skipped) and before planning.

```
[approved spec artifact]
[research artifacts]
[brand/style guidelines]
            │
            ▼
       [designer]
            │
            ├──► .fig design file
            ├──► Tailwind JSX scaffold
            ├──► HTML + CSS scaffold
            ├──► design tokens JSON
            └──► screenshot PNGs (key frames)
            │
            ▼
  [design-review]  ──► reviewer validates against spec, accessibility, visual consistency
            │
            ▼
       [planner]
```

**Triggered by:** `design` workflow.

**Feeds into:** `design-review` workflow (reviewer role), then planner.

---

## Input / Output Contract

| | Details |
|---|---|
| **Inputs** | Approved spec artifact, research artifacts, brand/style guidelines (if available) |
| **Allowed tools** | open-pencil MCP tools (create, modify, export, analyze), local file reads, image export and screenshot capture |
| **Output: .fig design file** | Figma-compatible visual source of truth |
| **Output: Tailwind JSX scaffold** | Component structure with Tailwind classes, ready for executor |
| **Output: HTML + CSS scaffold** | Alternative export for non-React targets |
| **Output: design tokens JSON** | All design decisions as machine-readable tokens |
| **Output: screenshot PNGs** | Visual snapshots of all key frames for review and audit |

---

## Example

Given a spec for a rate limit exceeded error state:

**Design artifact (excerpt):**

```markdown
# Design Artifact: Rate Limit UI

## Frames Designed
1. `rate-limit-429-banner` — inline error banner shown on API playground
2. `rate-limit-headers-debug` — developer tools panel showing X-RateLimit-* headers

## Design Tokens (excerpt)
{
  "color-error-bg": "#FEF2F2",
  "color-error-border": "#FECACA",
  "color-error-text": "#991B1B",
  "spacing-banner-padding": "12px 16px",
  "border-radius-banner": "6px"
}

## Tailwind JSX Scaffold (rate-limit-429-banner)
```

```jsx
export function RateLimitBanner({ retryAfter }: { retryAfter: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
      <p className="text-sm text-red-800">
        Rate limit exceeded. Retry in{" "}
        <span className="font-semibold">{retryAfter}s</span>.
      </p>
    </div>
  );
}
```

```markdown
## Accessibility Checks
- Error state uses color + icon (not color alone) — WCAG 1.4.1 pass
- Error text contrast ratio: 7.2:1 against bg-red-50 — WCAG AA pass
- No interactive elements without keyboard focus states

## Files
- state/design/rate-limit-429-banner.fig
- state/design/exports/rate-limit-banner.tsx
- state/design/exports/rate-limit-banner.html
- state/design/tokens/rate-limit.tokens.json
- state/design/screenshots/rate-limit-429-banner.png
```

---

## Git-Flow Responsibilities

The designer follows a strict commit convention:

```bash
feat(design): add rate limit error states and design tokens
```

Design files live in the **run-local state directory** (`~/.superagent/projects/<project-slug>/design/`), not in the repository. Only exported code scaffolds and design token JSON files are committed to the repo.

---

## Configuration

| Setting | Location | Effect |
|---------|----------|--------|
| `open_pencil` adapter | `superagent.manifest.yaml` → `adapters.open_pencil` | Enables open-pencil MCP tools (off by default) |
| `design_review` workflow | `workflows/` | Gates plan phase behind design validation |
| Brand/style guidelines | `input/` or project docs | Constrains visual decisions; designer reads but does not mutate |

> [!NOTE]
> open-pencil is an **optional adapter**. It is not required for core SuperAgent functionality. Tasks without a visual UI component skip the design phase entirely and proceed from `spec-challenge` directly to `plan`.

---

## When to Use / When NOT to Use

**Use the designer when:**
- The spec describes a user interface, dashboard, component, or visual output
- You need to prevent implementation rework caused by UI misinterpretation
- Design tokens need to be synchronized across multiple components
- Accessibility compliance must be verified before code is written

**Do NOT invoke the designer when:**
- The task is purely backend, infrastructure, or CLI — skip to planner
- open-pencil adapter is not available — note the absence in the artifact and proceed
- You are in mid-execution and want to make visual tweaks — that is an out-of-scope change requiring a new spec

> [!WARNING]
> Design drift from the approved spec is a failure condition. The designer must implement what the spec describes, not what looks better or feels more complete. Any divergence must be escalated before the design artifact is produced.

---

## Failure Conditions

| Condition | Why It Matters |
|-----------|----------------|
| Design drift from approved spec | Planner and executor implement the wrong thing; review will reject |
| Inaccessible designs (missing alt text, insufficient contrast) | Ships a WCAG violation; design-review will flag |
| Missing design tokens | Executor has no machine-readable design source; visual consistency breaks |
| No exported code scaffolds | Executor must interpret visual designs manually; rework risk increases |

---

## Related

- [Roles Overview](README.md)
- [specifier](specifier.md) — upstream role (produces the approved spec)
- [content-author](content-author.md) — upstream role (provides authored content for designs)
- [reviewer](reviewer.md) — validates design in `design-review` workflow
- [planner](planner.md) — downstream role (receives design artifacts)
- [executor](executor.md) — uses JSX/CSS scaffolds directly
- [Design Workflow](../workflows/design.md) _(coming soon)_
- [Design-Review Workflow](../workflows/design-review.md) _(coming soon)_
