# design

**Phase 6 — From approved spec to visual reality, before a line of implementation code is written.**

![Phase](https://img.shields.io/badge/phase-6%20of%2014-blue)
![Role](https://img.shields.io/badge/role-designer-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Optional](https://img.shields.io/badge/optional-skippable-yellow)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Transform the approved, challenged spec into production-ready visual designs using open-pencil MCP tools — producing design files, exported code scaffolds, design tokens, and screenshots that the planner and executor consume directly.

---

## Pipeline Position

```
  AUTHOR (or SPEC-CHALLENGE if author skipped)
    │
    ▼
┌────────┐
│ DESIGN │  ◄── YOU ARE HERE
└────────┘
    │
    ▼
  DESIGN-REVIEW  ★ gate
    │
    ▼
  PLAN ...
```

---

## Role Responsible

`designer`

The designer uses open-pencil MCP tools to produce visual designs from the approved spec. The designer role does not write application code — it produces design artifacts that the executor implements. The distinction matters: a design artifact is the source of truth for visual implementation; it is not a suggestion.

---

## Trigger

All of the following are true:

- Spec artifact exists and is approved
- Spec challenge findings are resolved (no outstanding blocking findings)
- Project has visual design needs (this phase is skippable — see Skip Conditions below)

---

## Skip Conditions

`design` and `design-review` may be skipped when:

1. The project has no visual or UI component (a CLI tool, a background service, a data migration)
2. The open-pencil MCP server is not available in the current session

When skipped, proceed directly to `plan`. The plan must note the absence of a design artifact. Any visual decisions become the executor's responsibility, constrained by the spec's acceptance criteria.

> [!NOTE]
> Skipping design is a deliberate trade-off, not a shortcut. Visual decisions that should be designed will instead be made ad hoc during implementation. This is acceptable for non-visual work; it is a risk for user-facing features.

---

## Steps

1. **Load the approved spec and research artifacts.** Identify all UI components, screens, and interactions mentioned in the acceptance criteria.

2. **Load brand/style guidelines** (if available). If no design system doc exists (per research findings), note this and proceed with spec-derived constraints only.

3. **Open or create the design file** using open-pencil MCP tools. Establish the canvas and document structure.

4. **Design each required screen/state.** For each component or screen referenced in the spec:
   - Light mode and dark mode variants (when relevant)
   - Mobile and desktop breakpoints (per spec requirements)
   - Interactive states (hover, active, focus, disabled)

5. **Apply design tokens.** Define color, spacing, and typography tokens as structured data. These become the exported `tokens.json`.

6. **Export code scaffolds.** Generate Tailwind JSX or HTML+CSS scaffolds from the design. These are the implementation starting points for the executor.

7. **Export screenshots.** Capture PNG screenshots of each key screen/state for the design-review and post-execution review phases.

8. **Produce the design artifact.** Package the `.fig` file, exported code scaffolds, `tokens.json`, and screenshot PNGs as a named artifact.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Approved spec artifact | Run state | Yes |
| Research artifact | Run state | Yes |
| Brand/style guidelines | Repo or external | Optional |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| `.fig` design file | Source design file (open-pencil format) |
| Exported code scaffolds | Tailwind JSX or HTML+CSS starting points per component |
| Design tokens (`tokens.json`) | Color, spacing, typography, and semantic tokens |
| Screenshot PNGs | Visual evidence for design-review and post-execution review |
| Design artifact (combined) | All of the above packaged as a single named artifact |

---

## Approval Gate

> [!IMPORTANT]
> **Explicit human approval is required before design-review begins.** The human reviews the designs visually at this gate. Design-review is a structured adversarial check; the approval gate here is the human's initial visual acceptance that the design direction is correct before a reviewer stress-tests it.

---

## Example Run

**Spec inputs (abbreviated):**
- AC-1: Toggle visible at all viewport widths
- AC-3: localStorage persistence (dark mode preference)
- AC-4: Correct rendering at 768px breakpoint

**Design artifact produced:**

```
design/
  dashboard-dark-mode.fig         ← source design file
  exports/
    DarkModeToggle.tsx            ← Tailwind JSX scaffold
    tokens.json                   ← color tokens for light + dark
  screenshots/
    dashboard-light-desktop.png
    dashboard-dark-desktop.png
    dashboard-dark-mobile-768.png
    toggle-states.png             ← hover, active, focus states
```

**Key design decisions (documented in artifact):**
- Toggle placement: top-right of nav bar, persists across scroll
- Dark palette tokens: defined as `--color-bg-dark`, `--color-text-dark`, etc.
- 768px breakpoint: toggle collapses to icon-only (tooltip accessible via aria-label)

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Designing features not in the spec | Plan and execution drift from spec | Design only what the acceptance criteria require |
| Missing exported code scaffolds | Executor starts from scratch; design-impl gap widens | Always export scaffolds as part of the design artifact |
| Skipping mobile breakpoint design | AC-4 fails verification | Design every screen at every breakpoint mentioned in the spec |
| Omitting design tokens | Dark mode colors are hardcoded; tokens can't be system-wide | tokens.json is a required output, not optional |
| Designing only the happy path | Interactive states cause review findings | Design hover, focus, disabled, and error states |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: author](author.md)
- [Next: design-review](design-review.md)
- [Architecture (design phase)](../../../concepts/architecture.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
