# Data Display Patterns

> **Module Type:** Pattern
> **Domain:** UI/UX Design
> **Last Updated:** 2026-03-07
> **Scope:** Tables, lists, cards, charts, key-value pairs, timelines, stat displays, KPIs

---

## Quick Reference Checklist

- [ ] Data type matches display pattern (table for comparison, cards for browsable content, list for scanning)
- [ ] Sorting available on relevant columns with visible sort indicators
- [ ] Filtering is contextual and preserves sort, scroll, and selection state
- [ ] Pagination or virtual scrolling implemented for datasets exceeding 50 items
- [ ] Empty states, loading states (skeleton shimmer), and error states are designed
- [ ] Mobile adaptation defined (card view for tables, column priority, horizontal scroll)
- [ ] Tables use semantic HTML (`<th>`, `scope`, `<caption>`) or ARIA grid roles
- [ ] Charts include alt text describing the trend/insight, not raw data points
- [ ] Keyboard navigation works for all interactive data elements
- [ ] Hover, selection, and focus states are visually distinct
- [ ] Truncated content has tooltips or expand affordances
- [ ] Sticky headers and frozen key columns used for wide/long tables
- [ ] Color is never the sole differentiator (pair with icons, patterns, or text)
- [ ] Data refresh timestamps visible on dashboards and real-time displays
- [ ] Export functionality accessible from the data view toolbar

---

## 1. Pattern Anatomy

### 1.1 Data Tables

Data tables display structured information in rows and columns, optimized for scanning, comparison, and analysis. They are the workhorse of enterprise and SaaS interfaces.

**Structural elements:** Header row (column names + sort affordances, always sticky), data rows (alternating colors or dividers), footer (aggregations or pagination controls), toolbar (search, filter, bulk actions, density toggle, export), selection column (checkbox as first column).

**Variants:**

| Variant | Use Case | Key Trait |
|---------|----------|-----------|
| Standard data table | CRUD, record management | Sortable, filterable, paginated |
| Comparison table | Feature/product/plan comparison | Fixed first column, highlight differences |
| Editable table | Spreadsheet-like data entry | Inline cell editing, tab navigation |
| Tree table | Hierarchical data (file systems) | Expandable/collapsible nested rows |

**Column alignment conventions (Ant Design):** Text left-aligned, numbers right-aligned (decimal alignment), status center-aligned (badges/tags), actions right-aligned (last column).

**Row density options (Material Design):** Comfortable 52px (occasional use), standard 40-44px (default), compact 32-36px (power users). Provide a density toggle in the table toolbar so users can choose their preferred level.

**Table toolbar anatomy (Carbon Design System pattern):**
```
+------------------------------------------------------------------+
| [Search] [Filter] [Column Config]    [Density] [Export] [Refresh] |
+------------------------------------------------------------------+
| [ ] | Name       | Status    | Created     | Amount  | Actions   |
|-----|------------|-----------|-------------|---------|-----------|
| [ ] | Alice Doe  | Active    | 2026-03-01  | $1,200  | ... menu  |
| [ ] | Bob Smith  | Pending   | 2026-03-03  | $450    | ... menu  |
+------------------------------------------------------------------+
| Showing 1-25 of 1,247 results     | < 1 2 3 ... 50 >  | Per page |
+------------------------------------------------------------------+
```

**Frozen columns and sticky headers:** For wide tables with many columns, freeze the identifier column (name/ID) on the left so it remains visible during horizontal scroll. Header row should remain sticky during vertical scroll. Both behaviors should work simultaneously. Show a subtle shadow on the frozen column edge to indicate scroll depth.

Reference: Ant Design Table (https://ant.design/components/table/), Material Design Data Tables (https://m2.material.io/components/data-tables), Atlassian Dynamic Table (https://atlassian.design/components/dynamic-table/).

### 1.2 Lists

**Simple lists:** Single line per item, optional leading element (icon, avatar, checkbox), optional trailing element (action icon, metadata). Best for navigation menus, settings, selections.

**Complex lists:** Two-three lines (primary, secondary, metadata), leading avatar/thumbnail, trailing timestamp/status, swipe actions on mobile. Best for email, messages, notifications.

**Grouped lists:** Section headers as visual dividers (sticky on scroll). Grouping types: alphabetical (contacts), temporal (today/yesterday/older), categorical (by status/type). Collapsible groups with item counts per section header.

**Guidelines:** Max 3 lines before truncation. Primary text 16px medium, secondary 14px regular muted. Touch targets min 48px height on mobile (WCAG 2.5.8).

**List item anatomy:**
```
+----------------------------------------------------------+
| [Avatar]  Primary text                     [Timestamp]    |
|           Secondary text (muted)           [Status badge] |
|           Tertiary metadata (smallest)                    |
+----------------------------------------------------------+
```

**Virtualized lists:** For lists exceeding 500 items, use windowed rendering (same principle as virtual scrolling in tables). Only render visible items plus a buffer of 5-10 items above and below the viewport. Measure item heights dynamically for variable-height list items.

### 1.3 Cards

**Content cards:** Header (title, subtitle), media area, body text (2-3 lines + "read more"), footer (metadata + actions). For blog posts, products, social feeds.

**Action cards:** Prominent CTA, minimal content (icon, title, description), hover elevation change. For onboarding steps, quick actions, feature discovery.

**Stat cards (KPI cards):** Primary metric (24-48px bold), metric label, trend indicator (arrow + percentage), sparkline, comparison context ("vs. last month"), color coding (green positive, red negative). Anatomy:
```
+----------------------------------+
| Revenue            [sparkline]   |
| $142,580                         |
| +12.3% vs last month  [arrow]   |
| Updated 2 min ago                |
+----------------------------------+
```

**Layout rules:** Min 2 columns mobile, 3-4 desktop. 16-24px gaps. Resting shadow 1-2dp, hover 4-8dp. Max 5 information sections per card.

### 1.4 Charts and Graphs

**Chart type selection by purpose:**

| Purpose | Recommended | Avoid |
|---------|------------|-------|
| Trend over time | Line chart, area chart | Pie chart |
| Part-to-whole | Stacked bar, donut, treemap | Line chart |
| Comparison | Grouped bar, horizontal bar | Pie chart (>5 segments) |
| Distribution | Histogram, box plot | Line chart |
| Correlation | Scatter plot, bubble chart | Bar chart |
| Single KPI | Big number + sparkline | Full chart |
| Ranking | Horizontal bar (sorted) | Vertical bar (unsorted) |

**Design principles:**
- Always label axes with units (e.g., "Revenue (USD)", "Time (months)")
- Start Y-axis at zero for bar charts; truncated axes distort proportional comparisons
- Line charts may use non-zero baselines when showing change magnitude, but label clearly
- Limit pie/donut to 5-7 segments; group remainder as "Other"
- Prefer direct data labels over detached legends when space permits
- Provide hover tooltips with crosshair showing exact values and date/category
- Include "last updated" timestamp for live data charts
- Animate chart rendering on initial load: 300-500ms staggered entrance per series
- Use consistent color palette across all charts in a dashboard for the same data series
- Avoid 3D effects on all chart types; they distort perception of values

**Interactive chart features:**
- Hover tooltip with crosshair showing exact value at the cursor position
- Click to drill down into a data point or segment (e.g., click a bar to see breakdown)
- Brush selection (click-and-drag) for zooming into a time range
- Legend toggles to show/hide individual data series
- Export as PNG, SVG, or CSV (underlying data)
- Annotation support: allow users to add notes to specific data points or time ranges

Reference: From Data to Viz (https://www.data-to-viz.com/), NNGroup (https://www.nngroup.com/articles/choosing-chart-types/).

### 1.5 Key-Value Pairs

**Vertical (top-bottom):** Key above value. Best for narrow containers and mobile. Aligns with natural top-to-bottom scanning.

**Horizontal (left-right):** Key on left, value on right. Best for wide containers with consistent-length values. Use fixed key-column width.

**Guidelines:** Key label 12-14px uppercase/muted, value 14-16px default color. 4-8px between key and value, 16-24px between pairs. Empty values: "---" or "Not provided". Editable values: hover edit icon, inline editing on click.

Reference: Cloudscape Key-Value Pairs (https://cloudscape.design/components/key-value-pairs/).

### 1.6 Timelines

**Vertical:** Events top-to-bottom, supports mixed content. Left-aligned or center-aligned (alternating). Most common variant.

**Horizontal:** Events left-to-right, for defined stages (order tracking). Limited by viewport width.

**Activity feed:** Continuous timestamped stream. For audit logs, change history. Paired with infinite scroll.

**Structural elements:** Timeline axis (vertical/horizontal line connecting events), event nodes (circles or icons on the axis), event content (timestamp, title, description), connectors (lines between nodes showing sequence), day/week grouping markers.

**Guidelines:** Reverse chronological for activity feeds, chronological for progress/process. Collapse older events with "Show more" to manage length. Distinct node icons or colors for different event types (created, updated, commented, resolved). Relative timestamps ("2h ago") for recent events, absolute ("Mar 7, 2026") for older. On mobile, use left-aligned vertical timeline exclusively (alternating layout wastes horizontal space).

### 1.7 Stat Displays / KPIs

**Anatomy:** (1) Metric label, (2) primary value (formatted: "$142.5K"), (3) trend indicator (arrow + percentage), (4) comparison basis ("vs. last month"), (5) sparkline (optional), (6) freshness indicator.

**Best practices:** Position highest-priority KPI top-left (F-pattern). Limit 5-10 per dashboard. Semantic color: green=on-track, amber=warning, red=alert. Four context layers: comparison, scope (units + date range), freshness, notes ("Refunds excluded"). Format large numbers with abbreviations (1.23M).

---

## 2. Best-in-Class Examples

### 2.1 Airtable
Multi-view data display: grid, kanban, gallery, calendar, timeline views from the same dataset. Grid supports inline editing, formula columns, linked records. Gallery transforms rows into cards. Filter bar uses builder pattern (Field + Operator + Value with AND/OR). Interface Designer creates custom dashboards with stat cards and charts backed by the same database.
**Takeaway:** The same dataset benefits from multiple display modes. View switching is now standard in modern data apps.

### 2.2 Linear
High-density, keyboard-driven UX. List view with swimlane grouping (status, assignee, priority, cycle). Board view toggleable with Cmd+B using identical display options as list (view parity). Contextual properties inline: priority icons, status dots, assignee avatars. Insights panel provides analytics scoped to the current filtered view. Command palette (Cmd+K) for rapid filtering.
**Takeaway:** Keyboard-first, command-palette-driven interfaces outperform dropdowns for power users. Consistent display options across views reduce cognitive load.

### 2.3 Notion
Block-based data display: databases embedded inline within documents. Linked views of the same database with different filters/sorts. Rich property types: relations, rollups, formulas, color-coded select tags. Template buttons for pre-configured rows.
**Takeaway:** "Database as a block" embeddable in narrative context is transformative for knowledge management.

### 2.4 Stripe Dashboard
Progressive disclosure from KPI summaries to transaction detail. Top-level stat cards with sparklines and comparison badges. Interactive time-series charts with configurable granularity. Transaction tables with status pills and instant search; clicking opens a detail slide-over. 15-minute data latency with visible timestamps.
**Takeaway:** Embodies Shneiderman's mantra: "Overview first, zoom and filter, details on demand."

### 2.5 Bloomberg Terminal
Extreme density for expert users. Multi-panel docked/tabbed workspace across 2-6 monitors. Security groups link panels so changing a security in one updates all linked panels. Treemaps for market overview (color=performance, size=market cap). Candlestick charts with overlaid technical indicators.
**Takeaway:** Display density should scale with user expertise. Panel-linking patterns apply to any multi-data-stream application.

### 2.6 Figma
Structured data in creative context. Layers panel: hierarchical tree with bidirectional selection sync. Properties panel: key-value display with inline editing. Dev Mode switches between "List" and "Code" views of the same properties for different audiences.
**Takeaway:** Data display should adapt to the user's current role (designer vs. developer).

### 2.7 GitHub
Code and project data with complementary views. Repository file browser with per-file metadata. PR list with filterable status icons, label pills, assignee avatars. Diff view with side-by-side comparison and line-level commenting. Progressive disclosure via collapsed diffs and expandable sections.
**Takeaway:** Show exactly the right metadata alongside primary content without overwhelming the interface.

---

## 3. User Flow Mapping

### 3.1 Browsing Large Datasets
**Information Seeking Mantra (Shneiderman):** Overview first, zoom and filter, details on demand.

Flow: Dashboard (KPIs + charts) -> Filtered table/list (scoped data) -> Individual record detail (slide-over or full page) -> Related records (linked data, history).

### 3.2 Sorting
Default sort should match user mental model (newest first for activity, alphabetical for contacts, priority for tasks). Three-state toggle cycle: ascending -> descending -> unsorted (remove sort). Sort state must persist across pagination, filtering, and navigation.

**Sort indicator conventions:** Chevron up = ascending (A-Z, 1-9, oldest first). Chevron down = descending (Z-A, 9-1, newest first). No chevron = unsorted. Active sort column header should have slightly different background or text weight to indicate it is the sort key.

**Multi-column sort:** Support Shift+click to add secondary sort columns (power user feature). Show sort priority numbers on each sorted column header (1, 2, 3). Most applications only need single-column sort; implement multi-sort for data-heavy analytical tools.

**Performance boundary:** Client-side for <1,000 rows (instant, no loading indicator needed). Server-side for >1,000 rows (show linear progress bar at table top during sort). Debounce rapid sort clicks (ignore clicks within 300ms of the last sort action).

### 3.3 Filtering

| Pattern | Best For |
|---------|----------|
| Search box | Text matching across all fields |
| Quick filters | Predefined states (status tabs: All/Active/Archived) |
| Column filters | Per-column dropdown in header |
| Filter bar | Multiple active filters as removable chips |
| Filter panel | Complex multi-faceted filtering (sidebar) |
| Builder pattern | Advanced AND/OR/NOT logic (Airtable-style) |

Show active filter count + individual chips. "Clear all" always visible when filters active. Persist in URL params for shareable views. Show "Showing 23 of 1,247 results." Design empty state when filters return zero.

### 3.4 Pagination vs. Infinite Scroll vs. Virtual Scrolling

**Pagination:** Best for data tables, search results, catalogs. Users reference specific pages, back button works. Default 25 rows. Preserve sort/filter/column state across pages.

**Infinite scroll:** Best for feeds, timelines, discovery browsing. Risk: lost position on back navigation. Mitigate with `history.pushState` and cached items. Show loading indicator + "end of results" marker.

**Virtual scrolling:** Best for 1,000+ row datasets needing continuous scroll feel without page breaks. Renders only visible rows (plus 5-10 row buffer above/below), recycling DOM nodes for performance. Maintains accurate scrollbar by calculating total content height from row count times row height. Requires consistent row heights for best performance (variable heights need measured position caching). Implementations: react-window (lightweight), @tanstack/virtual (framework-agnostic), Angular CDK virtual scroll. Sticky headers must be implemented separately from the virtual scroll container.

**Decision flow:**
```
Dataset size?
  < 100 rows     -> Simple table, no pagination needed
  100-500 rows   -> Pagination (25-50 per page)
  500-5,000 rows -> Pagination OR virtual scrolling
  > 5,000 rows   -> Virtual scrolling (pagination optional as fallback)

Content type?
  Structured records -> Pagination (easier to bookmark/share)
  Feed / timeline    -> Infinite scroll (with position memory)
  Spreadsheet data   -> Virtual scrolling (continuous scroll expected)
```

### 3.5 Drill-Down: Summary to Detail
- **Level 0:** Dashboard with 3-5 KPI cards, 1-2 overview charts
- **Level 1:** Filtered table/list. Click row triggers Level 2
- **Level 2:** Detail view (slide-over panel preserves list context, or full page with breadcrumb)
- **Level 3:** Related data via tabs (activity log, linked records, audit history)

URL must reflect drill-down level for back-button and deep-linking. Avoid stacking slide-over panels more than one level deep.

### 3.6 Export Flows

**Quick export:** Single button in toolbar, exports current filtered/sorted view as CSV or Excel. No configuration dialog needed. Label should state format: "Export CSV" not just "Export."

**Configured export:** Modal dialog allowing:
- Column selection (checkboxes for include/exclude)
- Date range filter
- Format selection (CSV, Excel, PDF, JSON)
- Optional: scheduled/recurring exports for reporting workflows

**Background export:** For datasets exceeding 10K rows, trigger an async export job. Show toast notification: "Your export is being prepared." Follow up with a download notification when ready. Do not block the UI.

**Clipboard:** "Copy table" action for quick paste into spreadsheets or documents. Copy the selected rows if a selection exists, otherwise copy the entire visible page. Include column headers.

**Export UX requirements:** Show record count in confirmation ("Export 1,247 records as CSV?"). Respect current filters, sort order, and column visibility in the output. For PDF exports, respect display formatting (currency symbols, date formats, status labels). Include a "last exported" timestamp in the filename or file metadata.

---

## 4. Micro-Interactions

### 4.1 Sort Animation
Arrow rotation: 200ms ease-in-out, 180-degree flip. Column header background flash: 100ms. Row reorder animation: 200-300ms slide (client-side only). Server-side sort: linear progress bar at table top.

### 4.2 Filter Transitions
Chip entrance: 150ms slide-in from left. Chip removal: 150ms shrink + fade. Result set: 200ms cross-fade. Counter: animated count up/down. Empty state: 200ms fade-in.

### 4.3 Row Hover States
Background: 4-8% opacity overlay, 100ms transition. Action reveal: show edit/delete/more icons only on hover, fixed right column. Cursor: `pointer` if entire row clickable, `default` if only cells are interactive.

### 4.4 Expandable Rows
Chevron rotation: 90 degrees over 200ms (right->down). Content reveal: 200-300ms ease-out slide-down. Left-side accent border for hierarchy. Accordion (single) vs. multi-expand (for comparison). Keyboard: Enter/Space to toggle.

### 4.5 Cell Editing
Activation: single-click (app) or double-click (spreadsheet). Cell gains 2px primary-color border, white background. Save: Enter, Tab (move to next cell), blur. Cancel: Escape. Inline validation on error. Optimistic updates with revert toast on failure.

### 4.6 Selection Checkboxes
Checkbox scale: 0.95x->1x, 150ms. Header states: unchecked, checked, indeterminate (dash). Bulk action bar: slides in on 1+ selection, shows count + actions (200ms). Selection persists across pagination. Shift+click for range selection.

### 4.7 Drag-to-Reorder
Grip handle (6-dot icon) in first column, 8px distance threshold. Picked-up row: 8dp shadow, 5% scale. Drop indicator: 2px blue line between rows. Drop settle: 100ms ease-out. Keyboard alternative: Alt+Arrow Up/Down with aria-live announcement.

**Timing rule:** All micro-interactions should be 150-300ms. Shorter feels abrupt, longer feels sluggish.

---

## 5. Anti-Patterns

### 5.1 Tables on Mobile Without Adaptation
Rendering full desktop tables on 375px screens forces horizontal scrolling and unusable touch targets. **Fix:** Card transformation (3-4 key fields per card), column priority hiding, or frozen first column with horizontal scroll.

### 5.2 Pagination Without Sort/Filter Preservation
Sort resets on page change or refresh; filters lost on navigation. **Fix:** Persist all state in URL query params: `/users?sort=created_at&order=desc&status=active&page=3`.

### 5.3 Infinite Scroll Without Position Memory
Back button returns user to top, losing scroll position and loaded items. **Fix:** `history.pushState` to encode position, cache items in session storage, or use slide-over panels for details.

### 5.4 Charts Without Axis Labels
Line chart shows trend but user cannot determine units, scale, or meaning of axes. **Fix:** Label both axes with descriptive text and units. Add chart title stating the insight ("Revenue grew 23% in Q4").

### 5.5 Truncating Data Without Tooltip
Ellipsis truncation with no way to see full content. **Fix:** Tooltip on hover (300ms delay). For key identifiers, consider wrapping instead of truncating.

### 5.6 No Loading State for Data
Blank table area or stale data during loading. **Fix:** Skeleton shimmer rows matching table structure. Linear progress bar for server operations. Avoid full-page spinners.

### 5.7 No Empty State Design
Zero results shows blank area with no guidance. **Fix:** Illustration + message ("No customers match your filters") + action ("Clear filters" button). Differentiate "no data exists" from "no data matches filters."

### 5.8 Overloaded Data Tables
15+ columns requiring horizontal scroll and cognitive overload. **Fix:** Show 5-7 default columns. Column config control for show/hide/reorder. Save preferences per user.

### 5.9 Inconsistent Number Formatting
Mixed formats: 1000 vs 1,000 vs 1K. Currency without symbols. Mixed date formats. **Fix:** Enforce formatting rules. Locale-aware formatting. Consistent abbreviation rules.

### 5.10 Color as the Only Differentiator
Status uses only red/yellow/green (inaccessible to 8% of males). **Fix:** Pair color with icons (checkmark, warning, X), text labels, patterns, or shapes.

### 5.11 Missing Comparison Context in KPIs
"Revenue: $142,580" with no context (good? bad?). **Fix:** Show % change vs. previous period, delta vs. target, trend sparkline, comparison basis.

### 5.12 Auto-Refreshing Data Without Warning
Data jumps or disappears during reading/interaction. **Fix:** Show "New data available. Refresh now." banner. Subtle animations for real-time updates. Never refresh during active interaction.

### 5.13 Pie Charts for More Than 7 Categories
12 near-identical slices impossible to compare. **Fix:** Horizontal bar chart (sorted descending). If pie needed, group into "Other" and limit to 5-7 segments.

---

## 6. Accessibility

### 6.1 Table Semantics
```html
<table>
  <caption>Quarterly Revenue by Region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North America</th>
      <td>$1.2M</td>
      <td>$1.6M</td>
    </tr>
  </tbody>
</table>
```
`<caption>` provides programmatic title. `<th scope="col|row">` enables screen readers to announce headers when navigating cells. For complex multi-level headers, use `headers` attribute referencing `<th id>` values.

Reference: W3C Tables Tutorial (https://www.w3.org/WAI/tutorials/tables/).

### 6.2 ARIA Grid for Interactive Tables
When tables include cell-level interactivity (editing, selection, drag), use the ARIA grid pattern instead of basic table semantics:

```html
<div role="grid" aria-label="Customer list" aria-rowcount="1247">
  <div role="row" aria-rowindex="1">
    <div role="columnheader" aria-sort="ascending">Name</div>
    <div role="columnheader" aria-sort="none">Email</div>
    <div role="columnheader">Actions</div>
  </div>
  <div role="row" aria-rowindex="2" aria-selected="false">
    <div role="gridcell">John Doe</div>
    <div role="gridcell">john@example.com</div>
    <div role="gridcell">
      <button aria-label="Edit John Doe">Edit</button>
    </div>
  </div>
</div>
```

**Key attributes:**
- `aria-sort="ascending|descending|none"` on sortable column headers
- `aria-selected="true|false"` on selectable rows
- `aria-rowcount` / `aria-colcount` for virtualized grids (DOM row count != total data rows)
- `aria-rowindex` on each row for virtualized grids to indicate position in full dataset

**Roving tabindex (focus management):**
- Only one cell has `tabindex="0"` at a time; all others use `tabindex="-1"`
- Tab key enters and exits the grid (the grid is a single tab stop in the page)
- Arrow keys navigate between cells within the grid
- Enter activates the focused cell (opens link, starts edit, toggles checkbox)
- Escape exits cell editing mode and returns focus to the cell

Reference: W3C ARIA Grid Pattern (https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

### 6.3 Chart Accessibility
- Alt text formula: `[Chart type] of [data type] where [key insight]`
- Describe the trend, not every data point: "Line chart showing revenue increasing from $100K to $156K, with a dip in August"
- Provide "View as table" toggle for underlying data
- All chart text must meet 4.5:1 contrast (WCAG 1.4.3)
- Do not rely on color alone (WCAG 1.4.1)—add patterns, shapes, direct labels
- Hover tooltips must also work via keyboard focus (WCAG 1.4.13)
- Use `aria-live="polite"` for significant live-data changes

Reference: TPGi (https://www.tpgi.com/making-data-visualizations-accessible/).

### 6.4 Keyboard Navigation

| Key | Table/Grid Action |
|-----|-------------------|
| Tab | Enter/exit table (single tab stop) |
| Arrow Up/Down | Move between rows |
| Arrow Left/Right | Move between columns |
| Home / End | First/last cell in row |
| Ctrl+Home / Ctrl+End | First/last cell in table |
| Space | Toggle row selection |
| Enter | Activate cell (link, edit) |
| Escape | Exit edit mode |

Pagination controls: focusable, Enter to activate, `aria-current="page"` on current page.

### 6.5 Screen Reader Announcements
- On table entry: announce caption/label, row count, column count
- On cell navigation: announce column header + row header + cell content
- On sort: "Sorted by [column], [direction]"
- On filter: aria-live "Showing 23 of 1,247 results"
- On page change: aria-live "Page 3 of 50, table updated"

**Testing matrix:** NVDA+Firefox, JAWS+Chrome (Windows), VoiceOver+Safari (macOS/iOS), TalkBack+Chrome (Android).

---

## 7. Cross-Platform Adaptation

### 7.1 Mobile (< 768px)

**Tables:** Three adaptation strategies (choose based on data characteristics):

1. **Card transformation (recommended for most cases):** Convert each row to a card. Primary identifier becomes card title. Show 3-4 key fields as key-value pairs within card body. "View details" action for full record. No horizontal scrolling required.
```
+-------------------------------+
| Alice Doe             Active  |
| Email: alice@example.com      |
| Amount: $1,200                |
| Created: Mar 1, 2026          |
|                [View Details] |
+-------------------------------+
```

2. **Column priority hiding:** Define priority levels (P1: always visible, P2: tablet+, P3: desktop only). Show only P1 columns in a compact table. Users tap a row to see all columns in a detail view.

3. **Horizontal scroll with frozen column:** Freeze the identifier column on the left. Allow horizontal swipe for additional columns. Show a subtle shadow on frozen edge and a scroll indicator. Best for comparison tasks where side-by-side viewing matters.

**Lists:** Work naturally on mobile due to vertical orientation. Ensure 48x48px touch targets minimum. Add swipe actions (right=complete, left=delete/archive). Pull-to-refresh for data updates. Avoid nested lists deeper than 2 levels.

**Charts:** Reduce data points for readability. Increase font sizes for labels. Replace hover tooltips with tap-to-reveal (tap data point to show value callout). Provide fullscreen landscape mode for detailed chart analysis. Use small multiples (one chart per series) instead of multi-series overlays.

**KPIs:** Vertical stack (single column) or 2-column grid. Replace sparklines with simple trend arrows if space is constrained. Horizontal scroll with peek affordance (show partial next card) works well for a row of 4+ KPI cards.

### 7.2 Tablet (768px - 1024px)
**Tables:** Compact density works (40px rows). Show priority P1+P2 columns, hide P3. Slide-over detail panels at 60-70% width.
**Lists:** Two-column card layouts or master-detail split (40% list / 60% detail).
**Charts:** Minor adjustments. Side-by-side layouts work in landscape.

### 7.3 Desktop (> 1024px)

**Full data table capabilities:**
- Column resize handles (drag border between column headers)
- Column reordering via drag-and-drop on headers
- Keyboard shortcuts for power users (Cmd+F search, arrow keys navigation)
- Right-click context menu on rows for quick actions
- Multi-select: Shift+click for range, Cmd/Ctrl+click for individual toggle
- Configurable column visibility with per-user saved preferences
- Split-pane layout: table on left, detail panel on right (resizable divider)
- Column pinning: freeze columns to left or right edge
- Row pinning: keep specific rows visible at top (e.g., totals row)
- Cell-level copy-paste for spreadsheet-like interaction
- Bulk edit mode: select multiple rows, edit a field value, apply to all selected

**Dashboard layout capabilities:**
- 12-column CSS Grid system for flexible widget placement
- KPI row at top spanning full width
- Charts in 2-3 column layouts with configurable sizing
- Drag-to-resize and drag-to-reorder dashboard panels for user customization
- Saved view configurations (named dashboard layouts)
- Fullscreen mode for individual charts or data views
- Keyboard-driven command palette for rapid navigation (Linear pattern)

### 7.4 Breakpoint Strategy
```
Mobile:  < 768px    -> Cards, stacked layouts, minimal columns
Tablet:  768-1024px -> Compact tables, master-detail, 2-col grids
Desktop: 1024-1440px -> Full tables, multi-panel layouts
Wide:    > 1440px    -> Extended tables, side-by-side comparisons
```
Prefer CSS Container Queries over media queries for component-level responsiveness.

---

## 8. Decision Trees

### 8.1 Table vs. List vs. Cards
```
COMPARE values across multiple attributes? -> TABLE
SCAN sequential items to act on one?        -> LIST
BROWSE self-contained heterogeneous items?  -> CARDS

Modifiers:
  > 5 comparable fields?       -> TABLE
  1-3 fields + image?          -> CARDS
  Need drag reordering?        -> LIST
  Select/act on multiple?      -> TABLE (checkboxes)
  Mobile-primary?              -> CARDS or LIST
  Hierarchical?                -> Tree TABLE or grouped LIST
```

### 8.2 Pagination vs. Infinite Scroll
```
GOAL-DIRECTED (searching for specific item)?
  -> PAGINATION (position awareness, back button, shareable URLs)

EXPLORATORY (browsing, discovering)?
  -> INFINITE SCROLL (with position memory via pushState)

ANALYTICAL (large dataset processing)?
  -> VIRTUAL SCROLLING (>1,000 rows, render visible only)

Hybrid: "Load more" button (user-controlled infinite scroll)
```

### 8.3 Chart Type Selection
```
How does a metric CHANGE OVER TIME?  -> Line (continuous) or Bar (discrete)
How do categories COMPARE?          -> Bar chart (few) or Horizontal bar (many, sorted)
What is the COMPOSITION?            -> Donut (few parts) or Treemap (many)
What is the RELATIONSHIP?           -> Scatter plot or Bubble chart
What is the DISTRIBUTION?           -> Histogram or Box plot
What is a single KEY METRIC?        -> KPI card (not a chart)
How does data FLOW through stages?  -> Funnel or Sankey diagram

Default: When in doubt, use a bar chart (most universally understood).
```

---

## Design System References

**Ant Design:** Table (pagination, filtering, sorting, selection, expandable rows, virtual scroll, drag-sort). ProTable extends with search form + CRUD. List, Card, Statistic components. Data display spec: 3-4 key fields at first glance, progressive disclosure for rest. (https://ant.design/docs/spec/data-display/)

**Atlassian:** Dynamic Table with built-in pagination, sorting, re-ordering, drag-and-drop state management. Table Tree for nested hierarchies. Loading and empty states as first-class props. (https://atlassian.design/components/dynamic-table/)

**Material Design:** M2 data tables: 56dp column padding, checkbox rows, embedded-in-card pattern. Header 56dp, data row 52dp, dense 36dp. M3 lists (1/2/3-line variants), cards (elevated/filled/outlined). Note: M3 has no official data table component as of 2026; M2 spec remains reference. (https://m2.material.io/components/data-tables)

**Carbon (IBM):** Batch actions toolbar, inline/expandable rows, sortable columns, table toolbar with search and filter. Clear documentation of toolbar and batch action flows. (https://carbondesignsystem.com/components/data-table/usage/)

---

## Implementation Notes

### Performance Considerations
- **Virtual scrolling threshold:** Implement when dataset exceeds 500-1,000 rows. Libraries: react-window (lightweight, fixed-size items), @tanstack/virtual (framework-agnostic, variable sizes), Angular CDK virtual scroll.
- **Debounce search/filter inputs:** 200-300ms debounce prevents excessive API calls during typing. Apply to search boxes and filter text inputs, not to dropdown selections (which should trigger immediately).
- **Skeleton loading:** Render skeleton rows matching the table structure (same column widths, row heights). Use CSS animations for shimmer effect (no JS needed). Show 5-10 skeleton rows for initial load.
- **Memoize row components:** In React, use `React.memo` with a custom comparator for row components to prevent re-renders when unrelated state changes. In Angular, use `trackBy` on `*ngFor`.
- **Lazy load off-screen columns:** For tables with 20+ columns, render only visible columns and lazy-load others on horizontal scroll using intersection observers.

### State Management for Data Views
- **URL-driven state:** Encode sort, filter, page, and view configuration in URL query parameters for shareability, deep-linking, and back-button support. Example: `?sort=name&order=asc&status=active&page=3&view=compact`.
- **Saved views:** Allow users to save named configurations (column set, sort, filters) and switch between them via a dropdown. Store per-user on the server.
- **Optimistic updates:** For inline editing and drag-to-reorder, update the UI immediately. On server error, revert the change and show a toast with "Undo" action.
- **Selection state:** Track selected item IDs (not row indices) to maintain selection across sort, filter, and pagination changes. Store in a Set for O(1) lookup.

### Testing Data Display Components
- **Visual regression:** Snapshot all states: loading, empty, error, single row, full page, long text overflow, many columns, column resize.
- **Accessibility audit:** Automated with axe-core plus manual screen reader testing (NVDA + VoiceOver minimum).
- **Performance:** Measure render time at 100, 1,000, and 10,000 rows. Target: <16ms frame time (60fps) during scroll.
- **Responsive:** Test at 375px (iPhone SE), 768px (iPad), 1024px, 1440px, 1920px breakpoints.

---

## Sources

- Ant Design Table & Specs: https://ant.design/components/table/, https://ant.design/docs/spec/data-display/
- Material Design Data Tables: https://m2.material.io/components/data-tables
- Atlassian Dynamic Table: https://atlassian.design/components/dynamic-table/
- W3C Tables Tutorial: https://www.w3.org/WAI/tutorials/tables/
- W3C ARIA Grid Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- Carbon Design System: https://carbondesignsystem.com/components/data-table/usage/
- Cloudscape Key-Value Pairs: https://cloudscape.design/components/key-value-pairs/
- NNGroup: https://www.nngroup.com/articles/choosing-chart-types/, https://www.nngroup.com/articles/infinite-scrolling-tips/, https://www.nngroup.com/articles/mobile-tables/
- From Data to Viz: https://www.data-to-viz.com/
- Pencil & Paper Data Tables: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- TPGi Accessible Visualizations: https://www.tpgi.com/making-data-visualizations-accessible/
- UK Gov Data Visualization Descriptions: https://accessibility.blog.gov.uk/2023/04/13/text-descriptions-for-data-visualisations/
- Bloomberg Terminal UX: https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/
- Stripe Analytics: https://stripe.com/blog/how-we-built-it-real-time-analytics-for-stripe-billing
- Linear UI/Docs: https://linear.app/docs/display-options, https://linear.app/now/how-we-redesigned-the-linear-ui
- Inline Editing: https://uxdworld.com/inline-editing-in-tables-design/
- Drag-and-Drop UX: https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/
- KPI Card Anatomy: https://nastengraph.substack.com/p/anatomy-of-the-kpi-card
