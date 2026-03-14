# author

**Phase 5 — From approved spec to production-ready content, before a single pixel is designed.**

![Phase](https://img.shields.io/badge/phase-5%20of%2014-blue)
![Role](https://img.shields.io/badge/role-content--author-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Optional](https://img.shields.io/badge/optional-skippable-yellow)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Write and package all non-code content artifacts — microcopy, i18n keys, seed data, glossary, asset metadata, notification templates, and a content coverage matrix — so that design and implementation work from real content, not placeholders.

---

## Pipeline Position

```
  SPEC-CHALLENGE
    |
    v
+---------+
| AUTHOR  |  <-- YOU ARE HERE
+---------+
    |
    v
  DESIGN  (or PLAN if design skipped)
    |
    v
  DESIGN-REVIEW ...
```

---

## Role Responsible

`content-author`

The content author writes all user-facing text, locale keys, and supporting content from the approved spec. The content author does not design UI or write application code — it produces content artifacts that the designer and executor consume. The distinction matters: a content artifact is the source of truth for all user-facing text; it is not a suggestion.

---

## Trigger

All of the following are true:

- Spec artifact exists and is approved
- Spec challenge findings are resolved (no outstanding blocking findings)
- Project has user-facing content needs (this phase is skippable — see Skip Conditions below)

---

## Skip Conditions

`author` may be skipped when:

1. The task has no user-facing text, notifications, or locale-sensitive output (a CLI tool, a background service, a data migration, a purely visual design change with no new copy)
2. All required content already exists in the project's locale files and only needs wiring

When skipped, proceed directly to `design` (or `plan` if design is also skipped). The plan must note the absence of an author artifact. Any content decisions become the executor's responsibility, constrained by the spec's acceptance criteria.

> [!NOTE]
> Skipping the author phase is a deliberate trade-off, not a shortcut. Content decisions that should be authored will instead be made ad hoc during design or implementation. This is acceptable for non-content work; it is a risk for user-facing features with multiple locales or brand constraints.

---

## Steps

1. **Load the approved spec and research artifacts.** Identify all UI states, screens, notifications, and interactions that require text content.

2. **Load existing glossary and locale sources** (if available). If no glossary or locale files exist (per research findings), note this and proceed with spec-derived terminology only.

3. **Author microcopy for every UI state.** For each screen and state referenced in the spec:
   - Empty state, loading state, error state, success state
   - Edge case states (rate limited, offline, expired, forbidden)
   - Interactive element labels (buttons, links, tooltips)

4. **Define i18n keys.** Create key definitions with values for every required locale. Use the project's existing key naming convention if one exists.

5. **Write seed and fixture content.** Produce realistic test data values for development, testing, and demo environments. No lorem ipsum, no "test123", no "John Doe".

6. **Build the terminology glossary.** Define domain terms used in this feature's content. Resolve any conflicts with existing glossary entries.

7. **Produce asset metadata.** Write alt text for images, labels for icons, ARIA descriptions for interactive elements.

8. **Write notification templates.** Author email, push, and in-app notification content referenced in the spec.

9. **Generate the content coverage matrix.** Map every screen to every key to every locale. Flag gaps.

10. **Flag layout-sensitive content.** Identify translations or content that is significantly longer than the primary locale and flag for designer awareness.

11. **Produce the author artifact.** Package all content outputs as a single named artifact.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Approved spec artifact | Run state | Yes |
| Research artifact | Run state | Yes |
| Existing glossary/locale sources | Repo or external | Optional |
| Brand/style guidelines | Repo or external | Optional |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Microcopy tables | All UI text for every state, screen, and interaction |
| i18n key definitions | Key-to-value mappings for all required locales |
| Seed/fixture content | Realistic test data for dev, test, and demo |
| Terminology glossary | Domain term definitions for consistency |
| Asset metadata manifest | Alt text, icon labels, ARIA descriptions |
| Notification templates | Email, push, and in-app transactional content |
| Content coverage matrix | Screen-to-key-to-locale completeness mapping |
| Author artifact (combined) | All of the above packaged as a single named artifact |

---

## Approval Gate

> [!IMPORTANT]
> **Explicit human approval is required before design begins.** The human reviews the authored content at this gate. Content informs every visual decision — button widths, banner heights, text wrapping behavior. Errors here cascade through design, planning, and execution. The cost of fixing a copy mistake increases at every downstream phase.

---

## Example Run

**Spec inputs (abbreviated):**
- AC-1: Toggle visible at all viewport widths with label text
- AC-3: localStorage persistence notification
- AC-4: Correct rendering at 768px breakpoint (label may truncate)

**Author artifact produced:**

```
author/
  microcopy/
    dark-mode-toggle.md           <- all toggle states and labels
    dark-mode-notifications.md    <- preference saved/restored messages
  i18n/
    dark-mode.keys.json           <- key definitions, en-US + es-ES values
  seed/
    dark-mode-fixtures.json       <- test data values
  glossary/
    dark-mode-terms.md            <- dark mode, light mode, system preference
  coverage/
    dark-mode-matrix.md           <- screen-to-key-to-locale mapping
```

**Key content decisions (documented in artifact):**
- Toggle label: "Dark mode" (not "Dark theme" or "Night mode") per glossary
- es-ES toggle label "Modo oscuro" is same character count — no layout flag needed
- Notification on preference save: "Preference saved" (transient toast, 3s)

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Using placeholder text (lorem ipsum, TBD) | Placeholders leak to production; design is sized for wrong content | Every text field must have production-ready copy |
| Missing locale entries for some keys | Shipped feature shows raw keys in some locales | Content coverage matrix must show 100% for all required locales |
| Authoring content not in the spec | Scope creep into design and execution | Author only what the acceptance criteria require |
| Ignoring layout impact of long translations | Designer creates frames that break with production text | Flag translations >15% longer than primary locale |
| Inconsistent terminology across screens | Users see "dark mode" on one screen and "night theme" on another | Glossary is a required output; all copy must use glossary terms |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: spec-challenge](spec-challenge.md)
- [Next: design](design.md)
- [Architecture (author phase)](../../../concepts/architecture.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
