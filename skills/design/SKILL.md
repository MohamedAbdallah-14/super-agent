---
name: design
description: Guide the designer role through open-pencil MCP workflow to produce design artifacts from an approved spec.
---

# Design

Use open-pencil MCP tools to create visual designs from the approved spec.

## Prerequisites

- open-pencil MCP server running (`openpencil-mcp` or `openpencil-mcp-http`)
- Approved spec artifact available
- Bun runtime installed (required by open-pencil)

## Workflow

1. **Read the spec** -- understand what needs to be designed (screens, components, flows).
2. **Create document** -- `new_document` to start fresh or `open_file` to work with existing `.fig`.
3. **Set up design tokens** -- `create_collection` and `create_variable` for colors, spacing, typography from spec/brand.
4. **Build frames** -- `create_shape` (type: FRAME) for each screen/component. Use `set_layout` for auto-layout.
5. **Populate content** -- `render` (JSX) for complex component trees, or individual `create_shape` + `set_fill` + `set_text` calls.
6. **Bind tokens** -- `bind_variable` to connect fills/strokes/text to design variables.
7. **Export** -- `export_image` for screenshots, `export_svg` for vectors.
8. **Save** -- `save_file` to persist the `.fig`.
9. **Generate code** -- use CLI `open-pencil export design.fig -f jsx --style tailwind` for Tailwind JSX.
10. **Extract tokens** -- `analyze_colors`, `analyze_typography`, `analyze_spacing` to build tokens JSON.

## Key MCP Tools

| Phase | Tools |
|-------|-------|
| Read | `get_page_tree`, `find_nodes`, `get_node`, `list_variables` |
| Create | `create_shape`, `render` (JSX), `create_page`, `create_component` |
| Style | `set_fill`, `set_stroke`, `set_layout`, `set_font`, `set_effects` |
| Variables | `create_collection`, `create_variable`, `bind_variable` |
| Export | `export_image`, `export_svg`, `save_file` |
| Analyze | `analyze_colors`, `analyze_typography`, `analyze_spacing`, `analyze_clusters` |
| Diff | `diff_create`, `diff_show` (before/after snapshots) |

## Required Outputs

- `.fig` design file saved
- Tailwind JSX export
- HTML + CSS export
- Design tokens JSON
- Screenshot PNGs of each top-level frame

## When Open-Pencil is Unavailable

If the open-pencil MCP server is not running or Bun is not installed, the design phase cannot produce `.fig` artifacts. In this case:
- Skip this phase and proceed to planning with text-only design specifications.
- Document the design intent in prose within the spec artifact instead.
- The design-review workflow should also be skipped.

## Rules

1. Every design must have auto-layout on all frames (no absolute positioning except icons/decorations).
2. Use design variables for all colors and spacing -- no hardcoded hex values.
3. Export screenshots after every major change for visual verification.
4. Create a `diff_create` snapshot before modifications to enable rollback.
