# sa:design

> Guide the designer role through the open-pencil MCP workflow to produce production-ready design artifacts from an approved spec.

| Property | Value |
|---|---|
| **ID** | `sa:design` |
| **Type** | Flexible |
| **Trigger** | Design phase — after spec approval, before plan |
| **Failure mode** | Missing `.fig` file, hardcoded values, absolute positioning |
| **Requires** | open-pencil MCP server + Bun runtime |

## Purpose

`sa:design` operationalizes the designer role by providing a concrete MCP tool workflow for creating visual design artifacts from an approved spec. It produces a design system grounded in tokens (no hardcoded hex values), auto-layout frames (no absolute positioning), and exportable artifacts that feed directly into frontend implementation.

When open-pencil is unavailable, this skill provides a graceful degradation path so the workflow does not stall.

## When to Invoke

- The `design` workflow phase is active.
- An approved spec artifact exists.
- open-pencil MCP server is running (`openpencil-mcp` or `openpencil-mcp-http`).
- Bun runtime is installed.

> [!TIP]
> Check prerequisites before starting: `which bun` and confirm the MCP server is reachable. A failed design phase that produces nothing is worse than skipping to text-only spec documentation.

## When NOT to Invoke

- No approved spec exists — complete the `specify` phase first.
- open-pencil MCP server is not running and Bun is not installed — see the Unavailable Fallback section below.
- The design already exists and only code generation is needed — jump to the Export step.

## Phases

| Step | MCP Tools | Description |
|---|---|---|
| 1. Read the spec | — | Identify screens, components, and flows to design |
| 2. Create document | `new_document` or `open_file` | Start fresh `.fig` or open existing |
| 3. Set up design tokens | `create_collection`, `create_variable` | Colors, spacing, typography from spec/brand |
| 4. Build frames | `create_shape (FRAME)`, `set_layout` | One frame per screen/component, auto-layout on all |
| 5. Populate content | `render` (JSX), `create_shape`, `set_fill`, `set_text` | Content within frames |
| 6. Bind tokens | `bind_variable` | Connect fills/strokes/text to design variables — no hardcoded values |
| 7. Export artifacts | `export_image`, `export_svg` | Screenshots and vectors |
| 8. Save | `save_file` | Persist the `.fig` |
| 9. Generate code | CLI `open-pencil export` | Tailwind JSX output |
| 10. Extract tokens | `analyze_colors`, `analyze_typography`, `analyze_spacing` | Design tokens JSON |

## MCP Tool Reference

| Phase | Tools |
|---|---|
| Read | `get_page_tree`, `find_nodes`, `get_node`, `list_variables` |
| Create | `create_shape`, `render` (JSX), `create_page`, `create_component` |
| Style | `set_fill`, `set_stroke`, `set_layout`, `set_font`, `set_effects` |
| Variables | `create_collection`, `create_variable`, `bind_variable` |
| Export | `export_image`, `export_svg`, `save_file` |
| Analyze | `analyze_colors`, `analyze_typography`, `analyze_spacing`, `analyze_clusters` |
| Diff | `diff_create`, `diff_show` |

## Required Outputs

| Artifact | Description |
|---|---|
| `.fig` design file | Saved and committed |
| Tailwind JSX export | Component code with Tailwind classes |
| HTML + CSS export | Fallback implementation-ready code |
| Design tokens JSON | Colors, spacing, typography as structured data |
| Screenshot PNGs | One per top-level frame, for visual verification |

## Rules

1. Every design must have auto-layout on all frames — no absolute positioning except icons/decorations.
2. Use design variables for all colors and spacing — no hardcoded hex values.
3. Export screenshots after every major change for visual verification.
4. Create a `diff_create` snapshot before modifications to enable rollback.

## Unavailable Fallback

If open-pencil MCP server is not running or Bun is not installed:

1. Skip this phase — do not attempt to produce `.fig` artifacts with unavailable tooling.
2. Document the design intent in prose within the spec artifact.
3. Skip the `design-review` workflow as well.
4. Proceed directly to planning with text-only design specifications.

> [!WARNING]
> Do not produce partial design artifacts with absolute positioning or hardcoded values because tooling was unavailable. A clean text spec is more useful to implementors than a malformed design file.

## Example

**Scenario:** Approved spec for a dashboard screen with a data table and filter sidebar.

```
Agent: Invoking sa:design for dashboard screen.

Step 2: new_document() → design.fig created
Step 3: create_collection("tokens") → create_variable("color/primary", "#0066CC")
        create_variable("spacing/md", 16)
Step 4: create_shape(FRAME, "Dashboard") → set_layout(direction=HORIZONTAL, gap=spacing/md)
        create_shape(FRAME, "Sidebar") → set_layout(direction=VERTICAL)
        create_shape(FRAME, "Content") → set_layout(direction=VERTICAL)
Step 5: render(<DataTable columns={...} />) → rendered in Content frame
Step 6: bind_variable(fill → color/primary) on all primary buttons
Step 7: export_image("Dashboard") → dashboard.png
Step 8: save_file("design.fig")
Step 9: open-pencil export design.fig -f jsx --style tailwind → Dashboard.jsx
Step 10: analyze_colors() → tokens.json
```

## Integration

`sa:design` sits between spec and planning:

```
specify (approved spec) → sa:design (design artifacts) → design_review → sa:writing-plans
```

The Tailwind JSX and design tokens JSON produced here become direct inputs to the executor during the `execute` phase, reducing frontend implementation ambiguity.
