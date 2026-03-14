# open-pencil Design Tooling

> **Module Type:** Tooling
> **Domain:** Design Automation, MCP Integration
> **Last Updated:** 2026-03-12
> **Sources:** open-pencil/open-pencil GitHub (MIT, v0.9.0, 2.2k stars)

---

open-pencil is an MIT-licensed design editor with 90 MCP tools and native Figma `.fig` file support. It uses Skia (CanvasKit WASM) for rendering -- the same engine as Figma -- and runs as a Tauri desktop app or web application.

## Setup

Requires Bun runtime. Install the MCP server globally:

```bash
bun add -g @open-pencil/mcp
```

MCP server config (stdio transport -- for Claude Code, Cursor, Windsurf):

```json
{
  "mcpServers": {
    "open-pencil": {
      "command": "openpencil-mcp"
    }
  }
}
```

HTTP transport (for headless/CI/browser extensions):

```bash
openpencil-mcp-http  # starts at http://localhost:3100/mcp
```

HTTP transport security:
- Binds to `127.0.0.1` by default
- `eval` tool disabled
- File operations limited to `OPENPENCIL_MCP_ROOT` (defaults to cwd)
- CORS disabled by default (set `OPENPENCIL_MCP_CORS_ORIGIN` to allow)
- Optional auth token via `OPENPENCIL_MCP_AUTH_TOKEN`

## Tool Categories (90 total)

### Document (3)

| Tool | Description |
|------|-------------|
| `open_file` | Open a `.fig` file for editing |
| `save_file` | Save the current document to a `.fig` file |
| `new_document` | Create a new empty document |

### Read (16)

| Tool | Description |
|------|-------------|
| `get_selection` | Get currently selected nodes |
| `get_page_tree` | Get the full node tree of the current page |
| `get_current_page` | Get the current page name and ID |
| `get_node` | Get detailed properties of a node by ID |
| `find_nodes` | Find nodes by name pattern and/or type |
| `get_components` | List all components in the document |
| `list_pages` | List all pages |
| `list_variables` | List design variables |
| `list_collections` | List variable collections |
| `list_fonts` | List fonts used in the current page |
| `page_bounds` | Get bounding box of all objects on the current page |
| `node_bounds` | Get bounding box of a node |
| `node_ancestors` | Get ancestor chain of a node |
| `node_children` | Get direct children of a node |
| `node_tree` | Get the subtree rooted at a node |
| `node_bindings` | Get variable bindings on a node |

### Create (8)

| Tool | Description |
|------|-------------|
| `create_shape` | Create a shape (FRAME, RECTANGLE, ELLIPSE, TEXT, LINE, STAR, POLYGON, SECTION) |
| `create_vector` | Create a vector node from a path string |
| `create_slice` | Create an export slice |
| `create_page` | Create a new page |
| `render` | Render JSX to design nodes -- create entire component trees in one call |
| `create_component` | Convert a frame/group into a component |
| `create_instance` | Create an instance of a component |
| `node_to_component` | Convert an existing node into a component in-place |

### Modify (25)

| Tool | Description |
|------|-------------|
| `set_fill` | Set fill color (hex) |
| `set_stroke` | Set stroke color, weight, alignment |
| `set_effects` | Add shadow or blur effects |
| `update_node` | Update position, size, opacity, corner radius, text, font |
| `set_layout` | Set auto-layout (flexbox) -- direction, spacing, padding, alignment |
| `set_constraints` | Set resize constraints |
| `set_rotation` | Set rotation angle in degrees |
| `set_opacity` | Set opacity (0-1) |
| `set_radius` | Set corner radius (uniform or per-corner) |
| `set_minmax` | Set min/max width and height constraints |
| `set_text` | Set text content of a TEXT node |
| `set_font` | Set font family and weight |
| `set_font_range` | Set font properties on a character range |
| `set_text_resize` | Set text auto-resize mode (fixed/auto-width/auto-height) |
| `set_visible` | Show or hide a node |
| `set_blend` | Set blend mode |
| `set_locked` | Lock or unlock a node |
| `set_stroke_align` | Set stroke alignment (inside/center/outside) |
| `set_text_properties` | Set text layout: alignment, auto-resize, text case, decoration, truncation |
| `set_layout_child` | Configure auto-layout child: sizing, grow, alignment, absolute positioning |
| `node_move` | Move a node to a new position |
| `node_resize` | Resize a node |
| `node_replace_with` | Replace a node with another node |
| `arrange` | Align or distribute selected nodes |

**Note:** The 25th Modify tool is `set_text_properties`, which is distinct from `set_text` (content) and `set_font` (family/weight). It controls layout-level text attributes like alignment, truncation, and decoration.

### Structure (12)

| Tool | Description |
|------|-------------|
| `delete_node` | Delete a node |
| `clone_node` | Duplicate a node |
| `rename_node` | Rename a node |
| `reparent_node` | Move a node into a different parent |
| `select_nodes` | Select nodes by ID |
| `group_nodes` | Group nodes |
| `ungroup_node` | Ungroup a group |
| `flatten_nodes` | Flatten nodes into a single vector |
| `boolean_union` | Boolean union of two or more nodes |
| `boolean_subtract` | Boolean subtraction |
| `boolean_intersect` | Boolean intersection |
| `boolean_exclude` | Boolean exclusion |

### Variables (9)

| Tool | Description |
|------|-------------|
| `get_variable` | Get a variable by ID or name |
| `find_variables` | Find variables by name pattern or type |
| `create_variable` | Create a new variable in a collection |
| `set_variable` | Set a variable value in a mode |
| `delete_variable` | Delete a variable |
| `bind_variable` | Bind a variable to a node property |
| `get_collection` | Get a variable collection by ID or name |
| `create_collection` | Create a new variable collection |
| `delete_collection` | Delete a variable collection |

### Export (2)

| Tool | Description |
|------|-------------|
| `export_image` | Export nodes as PNG, JPG, or WEBP (returns base64) |
| `export_svg` | Export nodes as SVG markup |

### Analyze (4)

| Tool | Description |
|------|-------------|
| `analyze_colors` | Analyze color palette usage across the document |
| `analyze_typography` | Analyze font/size/weight distribution |
| `analyze_spacing` | Analyze gap and padding values |
| `analyze_clusters` | Detect repeated patterns (potential components) |

### Diff (2)

| Tool | Description |
|------|-------------|
| `diff_create` | Create a snapshot of the current document state |
| `diff_show` | Show differences between the current state and a snapshot |

### Misc (9)

| Tool | Description |
|------|-------------|
| `eval` | Execute arbitrary Figma Plugin API code (disabled in HTTP transport for security) |
| Additional file management and utility tools | See open-pencil documentation for the complete list |

**Total: 3 + 16 + 8 + 25 + 12 + 9 + 2 + 4 + 2 + 9 = 90 tools**

## Effective Patterns

### Use `render` for complex layouts

The `render` tool accepts JSX and creates entire component trees in one call:

```jsx
<Frame name="Card" width={400} height={300} layout="vertical" padding={16}>
  <Text name="title" fontSize={24} fontWeight={700}>Card Title</Text>
  <Text name="body" fontSize={14} fill="#666">Description text</Text>
</Frame>
```

This is far more efficient than individual `create_shape` + `set_*` calls for complex UIs. Prefer `render` whenever creating more than 2-3 nested nodes.

### Use variables for theming

Always create variables for colors and spacing rather than hardcoding:

1. `create_collection` -- "Theme"
2. `create_variable` -- "primary", "background", "text", "spacing-sm", "spacing-md"
3. `bind_variable` -- connect fills/padding to variables

This ensures light/dark mode switching works by changing variable modes rather than re-styling every node.

### Use analyze_* for design review

Before design review, run all four analyze tools to generate a design audit:

- `analyze_colors` -- palette consistency (detects off-brand colors)
- `analyze_typography` -- font/size proliferation (flags too many variants)
- `analyze_spacing` -- spacing inconsistency (finds non-standard gaps)
- `analyze_clusters` -- repeated patterns that should be components

### Use diff for rollback safety

Before any large modification:

1. `diff_create` -- snapshot current state
2. Make changes
3. `diff_show` -- verify only intended changes
4. If wrong, undo and restore from snapshot

### Typical MCP workflow

```
open_file -> get_page_tree / find_nodes -> create or modify -> export_image -> save_file
```

1. `open_file` to load the `.fig` file
2. `get_page_tree` or `find_nodes` to understand existing structure
3. `create_shape` / `render` (JSX) to create new elements
4. `set_fill`, `set_stroke`, `set_layout`, etc. to style
5. `export_image` or `export_svg` to verify visual output
6. `save_file` to persist changes

## CLI for Headless Operations

```bash
open-pencil tree design.fig                         # Inspect structure
open-pencil find design.fig --type TEXT             # Find text nodes
open-pencil export design.fig -f jsx --style tailwind  # Export code
open-pencil export design.fig -f png                # Screenshot
```

All commands support `--json` for machine-readable output.

The CLI can also control a running app via RPC:

```bash
open-pencil tree                                # Inspect live document
open-pencil export -f png                       # Screenshot current canvas
open-pencil eval -c "figma.currentPage.name"    # Query the editor
```

## Limitations

- Requires Bun runtime (not Node.js) for MCP server and CLI
- `.fig` round-trip with complex Figma files may have edge cases (194 schema definitions, ~390 fields per node)
- `eval` tool disabled in HTTP transport for security
- File operations in HTTP mode limited to `OPENPENCIL_MCP_ROOT`
- No `.pen` format support (Pencil.dev files cannot be read)
- Pre-1.0 software (v0.9.0) -- API surface may change before stable release
- Desktop builds require Rust toolchain (Tauri v2 prerequisite)
