# Web Dashboard Design

> **Module Type:** Platform
> **Domain:** Design / Platforms
> **Last Updated:** 2026-03-07

---

## Overview

Web dashboards are the operational nerve centers of modern SaaS products, admin
panels, and analytics platforms. They aggregate, visualize, and surface
actionable data so users can monitor, analyze, and act without switching
contexts. This module codifies the layout patterns, component conventions,
typography systems, and interaction models that separate high-performing
dashboards from cluttered data dumps.

The guidance below draws from production design systems (Ant Design Pro,
Atlassian Design System, Shopify Polaris, Tremor) and from products widely
recognized for their dashboard craft (Linear, Notion, Retool).

---

## 1. Platform Design Language

### 1.1 Dashboard Design Philosophy

Every dashboard exists to answer three questions for its user:

| Question       | Design Implication                                   |
|----------------|------------------------------------------------------|
| **What happened?** | Data density -- surface key metrics at a glance  |
| **Is it good or bad?** | Scanability -- use color, trend lines, and comparison to convey status |
| **What should I do?** | Actionability -- place CTAs inline with the data that motivates them |

A well-designed dashboard balances these three axes. Overemphasizing density
creates noise. Overemphasizing scanability strips context. Overemphasizing
actionability buries the data that justifies the action.

**Core principles:**

- **Progressive disclosure.** Show summary metrics first; let users drill into
  detail on demand. Notion exemplifies this by hiding complex UI until the user
  requests it, keeping the default view clean.
- **One card, one topic.** Ant Design Pro recommends grouping closely related
  datasets on a single card and using dividers to separate sub-topics within it.
- **Glanceability.** Linear advocates dashboards that are "deliberately short,
  focused, and glanceable," minimizing cognitive load through consistent, minimal
  visuals.
- **Intentionality over abundance.** Every widget should have a clear purpose
  and an owner. Stale or purposeless widgets erode trust in the entire dashboard
  (Linear best practices).

### 1.2 Dashboard Archetypes

Different business roles demand different dashboard structures. Ant Design Pro
formalizes three archetypes:

#### Strategy / Overview Dashboards
- **Audience:** Executives, decision-makers.
- **Content:** A small number of long-term KPIs (revenue, churn, NPS) with
  trend lines and period-over-period comparisons.
- **Layout:** Large hero metric cards at the top, followed by 2-3 charts.
- **Update cadence:** Daily or weekly -- data rarely changes intra-day.
- **Example:** Shopify's merchant home screen: gross sales, sessions, conversion
  rate, and top products.

#### Analytics Dashboards
- **Audience:** Analysts, product managers.
- **Content:** Multi-dimensional data exploration with filters, breakdowns, and
  drill-downs.
- **Layout:** "Summary and description" structure -- an overview row of metrics
  followed by segmented charts and tables.
- **Update cadence:** Real-time or hourly.
- **Example:** Google Analytics, Amplitude.

#### Operational Dashboards
- **Audience:** Engineers, support agents, operations teams.
- **Content:** Wide range of metrics with emphasis on anomaly detection and
  real-time status.
- **Layout:** Dense grids of status cards, live feeds, and alert panels.
- **Update cadence:** Real-time with auto-refresh.
- **Example:** Datadog infrastructure monitoring, PagerDuty incident dashboard.

#### Admin Panels
- **Audience:** Internal teams managing CRUD operations on business data.
- **Content:** Tables with inline editing, detail panels, and bulk actions.
- **Layout:** Master-detail with sidebar navigation.
- **Update cadence:** On-demand (user-triggered).
- **Example:** Retool internal tools, Django Admin, Strapi.

### 1.3 Design Systems for Dashboards

| System          | Strengths                                       | Best For                    |
|-----------------|-------------------------------------------------|-----------------------------|
| **Ant Design Pro** | 60+ enterprise components, ProTable, ProForm, built-in layouts | Complex admin panels, Chinese & global enterprise apps |
| **Retool**      | 90+ drag-and-drop UI blocks, query library, 20+ table column types | Internal tools, low-code admin dashboards |
| **Tremor**      | 35+ chart/dashboard components, Tailwind + Radix UI, acquired by Vercel | Developer-built analytics dashboards |
| **Shopify Polaris** | Opinionated commerce components, IndexTable, DataTable | E-commerce admin and merchant dashboards |
| **Atlassian DS** | Navigation system, side-nav, consistent cross-product patterns | Project management and collaboration tools |
| **Cloudscape (AWS)** | Configurable dashboard pattern, 12-column grid, service dashboard templates | Cloud infrastructure and service dashboards |

### 1.4 Information Density Spectrum

Density is not a universal value -- it is a function of user expertise and task
frequency.

```
Consumer                                              Enterprise
(more whitespace)                                     (higher density)
|-------|-------|-------|-------|-------|-------|-------|
Notion  Shopify Linear  Jira   Retool  Bloomberg Terminal
```

- **Enterprise users** perform repetitive, data-comparison tasks. They benefit
  from compact rows (32-36px height), smaller fonts (13-14px), and reduced
  padding. Bloomberg Terminal is the extreme.
- **Consumer / prosumer users** need breathing room. Shopify Polaris uses
  generous card padding, 15-16px body text, and clear visual hierarchy.
- **Power-user hybrids** (Linear, Notion) thread the needle: clean by default
  with density controls or compact modes.

**Rule of thumb:** If your user stares at the dashboard 4+ hours/day, increase
density. If they check it a few times per week, increase whitespace.

---

## 2. Layout & Navigation Patterns

### 2.1 Sidebar Navigation

The sidebar is the dominant navigation pattern for web dashboards. Atlassian
moved product navigation from the top bar to the sidebar because it provides
"the vertical space and information density needed for a bird's-eye view of work
that wasn't possible with dropdown menus."

#### Dimensions

| State       | Width       | Contents                                    |
|-------------|-------------|---------------------------------------------|
| **Expanded**  | 240-280px   | Icon + label + optional badge/count         |
| **Collapsed** | 56-64px     | Icon only + tooltip on hover                |
| **Hidden**    | 0px         | Replaced by hamburger toggle (mobile)       |

- **240px** is the most common expanded width (Linear, Notion, Atlassian).
- **64px** collapsed width accommodates 24px icons with 20px horizontal padding.
- **280px** is acceptable when the sidebar contains nested tree navigation
  (file explorers, project hierarchies).

#### Sidebar Anatomy (top to bottom)

1. **Workspace / org switcher** -- logo, workspace name, dropdown chevron.
2. **Global actions** -- search (Cmd+K), quick-create button.
3. **Primary navigation** -- top-level sections (Dashboard, Projects, Settings).
4. **Secondary navigation** -- contextual sub-items, expandable groups.
5. **Pinned / favorites** -- user-pinned items for fast access.
6. **Footer** -- user avatar, help link, collapse toggle.

#### Collapse Behavior

- Trigger: chevron button at the sidebar bottom or edge-hover auto-reveal.
- Transition: 200-250ms ease-in-out width animation.
- Collapsed items show tooltips on hover with the full label.
- Keyboard shortcut: `[` or `]` to toggle (Linear convention).

### 2.2 Top Bar

With product navigation in the sidebar, the top bar is reserved for universal,
cross-cutting actions:

| Zone          | Contents                                         | Alignment |
|---------------|--------------------------------------------------|-----------|
| **Left**      | Breadcrumbs (Page > Subpage) or page title       | Left      |
| **Center**    | Global search bar (optional, often Cmd+K only)   | Center    |
| **Right**     | Notifications bell, help (?), user avatar/menu   | Right     |

- **Height:** 48-56px is standard. Shopify Polaris uses 56px; Linear uses 48px.
- **Breadcrumbs:** Show 2-3 levels max. Truncate intermediate levels with "..."
  when depth exceeds 3.
- **Sticky behavior:** Top bar should remain fixed on scroll; content scrolls
  beneath it.

### 2.3 Content Area Layout

The content area below the top bar and to the right of the sidebar is where
dashboard data lives. Common arrangements:

#### Card-Based Layout
- **Structure:** Metric cards in a row (3-4 across), followed by charts and
  tables in a 2-column or full-width arrangement.
- **Card sizing:** Use a 12-column grid. Metric cards span 3 columns each
  (4 cards per row). Charts span 6 columns (2 per row) or 12 columns
  (full width).
- **Card anatomy:** Title, primary metric (large number), trend indicator
  (arrow + percentage), sparkline or mini-chart, comparison period.

#### Master-Detail Layout
- **Structure:** A list or table on the left (60-70% width), detail panel on
  the right (30-40% width).
- **Use case:** Admin panels, CRM views, email clients.
- **Interaction:** Clicking a row in the master list populates the detail panel
  without a full page navigation.

#### Full-Width Table Layout
- **Structure:** Filters at the top, full-width data table below.
- **Use case:** Resource indexes, log viewers, transaction lists.
- **Shopify Polaris:** Recommends the IndexTable pattern for resource-heavy
  views with sorting, filtering, and bulk actions.

### 2.4 Multi-Level Navigation

Complex dashboards often require three navigation tiers:

```
Sidebar (L1)          Tabs (L2)              Breadcrumbs (L3)
-----------------     -------------------    ----------------------
Dashboard             Overview | Analytics   Dashboard > Analytics > Funnel
Projects              Board | List | Gantt   Projects > Alpha > Board
Settings              General | Billing      Settings > Billing
```

- **L1 (Sidebar):** Top-level sections. 5-8 items maximum before grouping.
- **L2 (Horizontal tabs):** Sub-views within a section. Place directly below
  the page header. Maximum 5-7 tabs before overflow into a "More" dropdown.
- **L3 (Breadcrumbs):** Show the user's position in the hierarchy. Clickable
  for navigation back up the tree.

Avoid more than three navigation levels. If depth exceeds three, reconsider
the information architecture.

### 2.5 Dashboard Grid System

#### 12-Column Grid

The 12-column grid is the industry standard for dashboard layouts:

- **Gutter width:** 16-24px (Ant Design uses 16px; Polaris uses 20px).
- **Margin:** 24-32px from sidebar edge to first column.
- **Common spans:** 3 (quarter), 4 (third), 6 (half), 12 (full).
- **Row gap:** 16-24px between card rows.

#### Card-Based Drag-and-Drop

Configurable dashboards (Cloudscape, Grafana, Home Assistant) allow users to
rearrange widgets:

- Cards snap to grid intersections, preventing arbitrary overlap.
- "Z-grid" layout: items flow left to right, wrapping to the next row when full.
- Row height is determined by the tallest card in the row.
- Libraries: React Grid Layout (React), Angular Grid Layout (Angular),
  gridstack.js (vanilla JS).
- Provide a "Reset layout" action so users can revert to defaults.
- Persist layout preferences per user in localStorage or server-side.

### 2.6 Responsive Behavior

| Breakpoint     | Viewport      | Sidebar State           | Grid Columns |
|----------------|---------------|-------------------------|--------------|
| **Desktop XL** | >= 1440px     | Expanded (240-280px)    | 12           |
| **Desktop**    | 1024-1439px   | Expanded or collapsed   | 12           |
| **Tablet**     | 768-1023px    | Collapsed (64px) or hidden | 8 or 6    |
| **Mobile**     | < 768px       | Hidden (drawer overlay) | 4 or 1       |

- At **768px**, the sidebar collapses to a hamburger-triggered drawer overlay.
  Ant Design's Layout component supports `breakpoint` prop for this behavior.
- Cards reflow: 4-across becomes 2-across on tablet, 1-across on mobile.
- Tables switch to card-list view or horizontal scroll on mobile.
- Charts maintain aspect ratio but reduce in width; consider hiding secondary
  charts on mobile.

---

## 3. Component Conventions

### 3.1 Data Tables

Data tables are the backbone of most dashboards. Shopify Polaris distinguishes
between `DataTable` (simple summaries) and `IndexTable` (resource indexes with
selection and bulk actions).

#### Column Design

| Data Type     | Alignment  | Format                              |
|---------------|------------|-------------------------------------|
| Text          | Left       | Sentence case, truncate with "..."  |
| Numbers       | Right      | Locale-formatted, fixed decimals    |
| Currency      | Right      | Symbol + number ($1,234.56)         |
| Dates         | Left/Right | Relative ("2h ago") or absolute     |
| Status        | Left       | Badge or colored dot + label        |
| Actions       | Right      | Icon buttons or "..." overflow menu |

**Polaris guideline:** Non-numeric values left-aligned, numeric values
right-aligned. This ensures fast vertical scanning of number columns.

#### Sorting

- Indicate sortable columns with a subtle chevron icon in the header.
- Show the active sort column with a filled chevron (ascending/descending).
- **Client-side sorting** for datasets < 1,000 rows.
- **Server-side sorting** for larger datasets to reduce payload and memory.
- Default sort should match the user's most common query (often "most recent
  first").

#### Filtering

- Place filters above the table in a horizontal filter bar.
- Show active filter count with a badge on the filter button.
- Allow "saved filters" (Linear, Jira) so users can bookmark common queries.
- Clear all filters with a single "Reset" button.
- For complex filtering, use a filter panel (slide-out or dropdown) with
  field + operator + value selectors.

#### Pagination

- Default to 25 rows per page. Offer 10 / 25 / 50 / 100 options.
- Show total count: "Showing 1-25 of 1,248 results."
- Use cursor-based pagination for real-time data; offset-based for static data.
- Provide generous click targets (minimum 44x44px) on pagination controls.
- Consider infinite scroll for feed-like views, but prefer pagination for
  data tables where users need to reference specific positions.

#### Row Selection & Bulk Actions

- Checkbox column on the far left.
- "Select all" checkbox in the header selects the current page.
- "Select all 1,248" link appears above the table for cross-page selection.
- Bulk action bar appears at the top or bottom when 1+ rows are selected.
- Common bulk actions: Delete, Export, Assign, Change Status, Tag.

#### Inline Editing

- Double-click or click-to-edit on individual cells.
- Show a subtle edit icon on hover to signal editability.
- Save on blur or Enter; cancel on Escape.
- Validate inline and show field-level errors.
- Retool supports 20+ column types including editable text, dropdowns, date
  pickers, and toggles within table cells.

### 3.2 Charts and Data Visualization

#### Chart Type Selection

| Data Relationship       | Recommended Chart          | Avoid               |
|------------------------|---------------------------|----------------------|
| Trend over time         | Line chart, area chart     | Pie chart            |
| Part-to-whole           | Stacked bar, donut chart   | 3D pie chart         |
| Comparison (few items)  | Bar chart (horizontal)     | Radar chart          |
| Comparison (many items) | Table or heatmap           | Clustered bar chart  |
| Distribution            | Histogram, box plot        | Line chart           |
| Correlation             | Scatter plot               | Bar chart            |
| Geographic              | Choropleth map             | Pie chart            |

#### Color Conventions

- **Limit to 5-7 colors** per chart. Beyond that, use grouped categories,
  small multiples, or tables.
- **Sequential palettes** (single hue, varying saturation) for magnitude data.
- **Diverging palettes** (two hues diverging from a neutral midpoint) for data
  with a meaningful center (e.g., profit/loss).
- **Categorical palettes** (distinct hues) for nominal categories.
- Use **brand-aligned colors** as the primary series color; neutral grays for
  secondary series.
- **Red for negative, green for positive** is conventional -- but pair with
  icons (down-arrow, up-arrow) for color-blind accessibility.
- Use **ColorBrewer** palettes for guaranteed color-blind safety.
- Atlassian's data viz color guide recommends testing all palettes against
  deuteranopia, protanopia, and tritanopia simulations.

#### Interaction Patterns

- **Hover tooltips:** Show exact values on hover. Include the data label,
  formatted value, and comparison if applicable.
- **Click to drill down:** Clicking a bar or segment filters the dashboard
  or navigates to a detail view.
- **Zoom and pan:** For time-series charts, allow range selection (brush) to
  zoom into a time window.
- **Legend interaction:** Clicking a legend item toggles that series on/off.
- **Annotations:** Allow users to add notes to specific data points or time
  ranges.

#### Performance

- Render charts with Canvas (not SVG) for datasets > 1,000 points.
- Lazy-load charts below the fold.
- Show skeleton placeholders while chart data loads.
- Debounce filter changes (200-300ms) before re-rendering charts.
- Tremor provides optimized Recharts-based components that handle most of
  these concerns out of the box.

### 3.3 Filters and Search

#### Global Search / Command Palette

Modern dashboards implement a command palette (Cmd+K / Ctrl+K):

- **Trigger:** Keyboard shortcut displayed in the top bar search field.
- **Scope:** Search across pages, actions, recent items, and settings.
- **Implementation:** Full-screen overlay or centered modal (480-560px wide).
- **Sections:** Recent items, suggested actions, navigation shortcuts.
- **Keyboard navigation:** Arrow keys to navigate, Enter to select, Esc to
  close.
- **Adopted by:** Linear, Notion, Figma, Slack, Vercel, GitHub.

#### Faceted Search

For data-heavy views (logs, transactions, user lists):

- Display 5-7 facet categories maximum per view.
- Show result counts next to each facet option.
- Allow multi-select within a facet (OR logic) and cross-facet (AND logic).
- Keep frequently used filters always visible; group less common ones under
  "More filters."
- Collapsible filter sidebar (left-hand) or horizontal filter bar (above table).

#### Saved Filters

- Allow users to save filter combinations with custom names.
- Display saved filters as tabs or chips above the data view.
- Share saved filters with team members (Linear, Jira).
- Show a "Modified" indicator when a saved filter has unsaved changes.

### 3.4 Status Indicators

| Pattern           | Use Case                                    | Example                    |
|-------------------|---------------------------------------------|----------------------------|
| **Colored dot**   | Simple binary/ternary status                | Online (green), Offline (red) |
| **Badge**         | Categorical status with label               | "In Progress" (blue badge) |
| **Progress bar**  | Completion percentage                       | Task progress (65%)        |
| **Trend arrow**   | Direction of change                         | Revenue up 12%             |
| **Sparkline**     | Trend shape without axis detail             | 7-day traffic pattern      |
| **Traffic light** | RAG status (Red/Amber/Green)                | Project health indicator   |
| **Pulse dot**     | Live/real-time status                       | Server heartbeat           |

- Always pair color with a secondary indicator (icon, label, pattern) for
  accessibility.
- Use semantic color tokens from your design system rather than raw hex values.
- Atlassian uses "lozenge" components (rounded badges) with predefined semantic
  colors: green (success), blue (in progress), yellow (moved), red (removed).

### 3.5 Action Menus

#### Context Menus (Right-Click or "..." Button)

- Trigger: Three-dot icon button on table rows, cards, or list items.
- Content: 3-7 actions maximum. Group with dividers if > 5 actions.
- Destructive actions (Delete, Archive) placed last with red text.
- Keyboard: open with Enter/Space on the trigger, navigate with arrow keys.

#### Bulk Action Bar

- Appears as a fixed bar (top or bottom of viewport) when items are selected.
- Shows selection count: "3 items selected."
- Contains the most common bulk actions as buttons.
- "Deselect all" button to clear selection.
- Disappears when selection is cleared.

#### Command Palette Actions

- Beyond navigation, the command palette can execute actions:
  "Create new project," "Invite team member," "Export data."
- Show keyboard shortcuts inline for discoverable power-user workflows.
- Superhuman pioneered this pattern; Linear and Notion adopted it broadly.

### 3.6 Empty States and Loading States

#### Empty States

Every dashboard view that can be empty must have a designed empty state.
Carbon Design System categorizes them into three types:

1. **First-use empty states:** The user has not created any data yet.
   - Show an illustration, a headline explaining the section's purpose, and a
     primary CTA ("Create your first project").
   - Optionally include a link to documentation or a quick-start guide.

2. **No-results empty states:** A search or filter returned zero results.
   - Show a clear message: "No results match your filters."
   - Offer actions: "Clear filters" or "Try a different search."
   - Do not show a blank screen with no explanation.

3. **Error empty states:** Data failed to load.
   - Show a non-technical error message and a "Retry" button.
   - Include a support link for persistent errors.

**Anti-pattern:** A generic "No data" message with no guidance. Every empty
state is an opportunity to educate or activate the user.

#### Loading States

| Duration        | Pattern                    | Use Case                         |
|-----------------|----------------------------|----------------------------------|
| < 300ms         | No indicator needed        | Instant interactions             |
| 300ms - 2s      | Skeleton screen            | Page loads, card content loading |
| 2s - 10s        | Skeleton + progress bar    | Data-heavy queries, exports      |
| > 10s           | Progress bar + message     | Report generation, large imports |

**Skeleton screens:**
- Mirror the layout of the loaded content (matching card shapes, table rows,
  chart areas).
- Use subtle pulse animation (opacity 0.3 to 0.7 at 1.5s intervals).
- Apply skeletons to container components (cards, tables, lists) -- not to
  action components (buttons, inputs, toggles).
- Load in batches: first batch shows page structure skeletons; second batch
  fills in images and below-fold content.

**Spinners:**
- Use on individual modules (a single card or chart), not full pages.
- Center the spinner within the loading container.
- Pair with a descriptive label for operations > 3 seconds: "Loading sales
  data..."

---

## 4. Typography & Spacing System

### 4.1 Dashboard Typography Scale

Dashboards can use denser typography than marketing sites. Where a marketing
page uses 16-18px body text, a dashboard can use 13-14px and remain readable
because users are in a focused, task-oriented mindset.

#### Recommended Type Scale (Major Second -- 1.125 ratio)

| Role                | Size    | Weight     | Line Height | Use                           |
|---------------------|---------|------------|-------------|-------------------------------|
| Page title          | 24px    | Semibold   | 32px (1.33) | Page headers                  |
| Section heading     | 18px    | Semibold   | 24px (1.33) | Card titles, section headers  |
| Subsection heading  | 16px    | Medium     | 24px (1.5)  | Widget titles, group labels   |
| Body / default      | 14px    | Regular    | 20px (1.43) | General text, descriptions    |
| Table cell text     | 13-14px | Regular    | 20px (1.43) | Table body content            |
| Caption / label     | 12px    | Medium     | 16px (1.33) | Axis labels, metadata, hints  |
| Micro label         | 11px    | Medium     | 16px (1.45) | Badge text, chart annotations |

#### Font Recommendations for Dense UIs

- **Inter:** Designed specifically for computer screens. Excellent legibility at
  small sizes. Used by Linear, Vercel, and many modern SaaS products.
- **SF Pro / SF Mono:** Apple's system font. Native feel on macOS. Tabular
  figures built in.
- **IBM Plex Sans / Mono:** Open source. Strong at 12-14px. Used by Carbon
  Design System.
- **JetBrains Mono:** For code/log displays within dashboards.

**Key rules:**
- Use **tabular (monospaced) figures** for numbers in tables and metrics so
  digits align vertically (font-feature-settings: "tnum").
- Below 14px, add **+0.2px letter-spacing** to maintain readability.
- WCAG minimum line height is 1.5x font size for body text. Headings can use
  1.2-1.33x.

### 4.2 Spacing System

Use a **4px base unit** with an **8px primary scale** for component spacing:

```
4px   -- icon-to-label gap, tight inline elements
8px   -- compact padding (dense table cells, badge internal padding)
12px  -- list item padding, small card padding
16px  -- standard card padding, form field spacing
24px  -- section gaps, card-to-card spacing
32px  -- page margins, major section dividers
48px  -- top bar height (minimum), large section spacing
```

#### Table Cell Padding Conventions

| Density Mode    | Vertical Padding | Horizontal Padding | Row Height |
|-----------------|------------------|--------------------|------------|
| **Compact**     | 4-6px            | 8-12px             | 32-36px    |
| **Default**     | 8-10px           | 12-16px            | 40-44px    |
| **Comfortable** | 12-16px          | 16-20px            | 48-56px    |

- Ant Design's Table component supports `size="small"` (compact) and
  `size="middle"` (default) props.
- Shopify Polaris DataTable uses 16px horizontal padding and 12px vertical
  padding by default.
- Provide a density toggle (compact/default/comfortable) for power users.
  Linear and Notion both offer this.

### 4.3 Color System for Dashboards

| Token               | Purpose                          | Example Value        |
|----------------------|----------------------------------|----------------------|
| `--bg-primary`       | Main content background          | #FFFFFF / #0F0F0F    |
| `--bg-secondary`     | Card backgrounds, sidebar        | #F9FAFB / #1A1A1A   |
| `--bg-tertiary`      | Hover states, subtle emphasis    | #F3F4F6 / #262626    |
| `--text-primary`     | Headings, primary content        | #111827 / #F9FAFB    |
| `--text-secondary`   | Descriptions, metadata           | #6B7280 / #9CA3AF    |
| `--text-tertiary`    | Placeholders, disabled           | #9CA3AF / #6B7280    |
| `--border-default`   | Card borders, dividers           | #E5E7EB / #2D2D2D   |
| `--accent-primary`   | CTAs, active nav, links          | Brand color          |
| `--status-success`   | Positive metrics, completed      | #10B981              |
| `--status-warning`   | Warnings, at-risk items          | #F59E0B              |
| `--status-error`     | Errors, negative metrics         | #EF4444              |
| `--status-info`      | Informational indicators         | #3B82F6              |

- Support both light and dark themes. Dashboard users often work in low-light
  environments and will expect dark mode.
- Use **2 main colors** plus neutrals. Retool recommends a brand color for
  navigation backgrounds and an accent color for primary actions.

---

## 5. Common Mistakes

### 5.1 Too Much Data With No Hierarchy

**Symptom:** Every metric has equal visual weight. Users cannot distinguish
critical KPIs from supporting data.

**Fix:** Establish a clear visual hierarchy. Hero metrics get large type
(24-32px), secondary metrics get medium type (16-18px), and supporting data
lives in tables or detail views. Use Ant Design Pro's "one card, one topic"
principle to group related data.

### 5.2 Charts Without Context or Comparison

**Symptom:** A bar chart shows this month's revenue as $142K. Is that good?
Bad? The user has no way to know.

**Fix:** Always show comparison data. Options:
- Period-over-period: "vs. last month: +12%."
- Target/benchmark: "Goal: $150K (95% achieved)."
- Trend line: Show the last 6-12 data points so the user can see trajectory.
- Annotations: Mark significant events (product launch, outage) on time-series
  charts.

### 5.3 Non-Responsive Dashboards

**Symptom:** The dashboard is designed for 1440px+ screens. On a laptop
(1280px) or tablet, content overflows, charts are cut off, and tables require
awkward horizontal scrolling.

**Fix:** Design for 1280px as the primary viewport, not 1440px. Use the
responsive breakpoint system from Section 2.6. Test on 1024px, 768px, and
375px. Ensure tables scroll horizontally within their container rather than
breaking the page layout.

### 5.4 Slow-Loading Data Visualizations

**Symptom:** Charts take 3-5 seconds to render. Users see a blank space or a
spinner. They lose trust and stop using the dashboard.

**Fix:**
- Use skeleton screens that match chart layout.
- Lazy-load charts below the fold.
- Render with Canvas instead of SVG for > 1,000 data points.
- Cache query results and show stale data with a "Last updated: 2m ago"
  indicator while fresh data loads in the background.
- Debounce filter changes (200-300ms) before triggering re-renders.

### 5.5 Poor Empty States

**Symptom:** A new user sees "No data" with no explanation or guidance. They
do not know if something is broken or if they need to take action.

**Fix:** Design intentional empty states for every view (see Section 3.6).
Include: (1) an illustration or icon, (2) a clear headline, (3) a one-sentence
explanation, and (4) a primary CTA. Test by creating a new account and
navigating every section.

### 5.6 One-Size-Fits-All Dashboard

**Symptom:** Executives, analysts, and operators all see the same dashboard.
None of them find it useful.

**Fix:** Design role-specific views or allow dashboard customization
(drag-and-drop widgets, saved views). At minimum, provide a "compact" vs.
"comfortable" density toggle.

### 5.7 Overusing Color

**Symptom:** Every chart series is a different bright color. Status indicators
use red, orange, yellow, green, blue, and purple. The dashboard looks like a
bag of candy.

**Fix:** Limit chart palettes to 5-7 colors. Use a single-hue sequential
palette when possible. Reserve red and green for semantic meaning (error/success)
and do not use them as arbitrary categorical colors.

### 5.8 Ignoring Keyboard Navigation

**Symptom:** Power users cannot navigate tables, switch tabs, or trigger actions
without a mouse. No command palette exists.

**Fix:** Implement Cmd+K command palette. Add keyboard shortcuts for common
actions (N for new, E for edit, Delete for remove). Ensure all interactive
elements are reachable via Tab and operable via Enter/Space. Show keyboard
shortcut hints in tooltips and action menus.

### 5.9 Assuming Users Understand Chart Types

**Symptom:** A funnel chart or Sankey diagram is used without labels, legend, or
explanation. Users who are not data-literate cannot interpret it.

**Fix:** Add clear titles to every chart. Include a legend. Use tooltips on
hover to show exact values. Consider adding a brief "What this shows" subtitle
for complex visualizations.

### 5.10 No Data Freshness Indicators

**Symptom:** Users do not know when the data was last updated. They make
decisions based on potentially stale data.

**Fix:** Show "Last updated: [time]" on every data widget or at the page level.
For real-time dashboards, show a live indicator (pulse dot) and auto-refresh
interval. For batch-updated dashboards, show the next scheduled refresh time.

---

## 6. Dashboard Design Checklist

Use this checklist before shipping or reviewing a dashboard design. Each item
should be verified.

### Layout & Structure

- [ ] **Sidebar width** is 240-280px expanded and collapses to 56-64px with
      icon-only display and tooltips on hover.
- [ ] **Top bar** includes breadcrumbs, global search trigger (Cmd+K), and
      user menu. Height is 48-56px.
- [ ] **Content area** uses a 12-column grid with 16-24px gutters and 24-32px
      page margins.
- [ ] **Responsive behavior** tested at 1440px, 1280px, 1024px, 768px, and
      375px. Sidebar becomes a drawer on mobile (< 768px).

### Data Display

- [ ] **Every chart has context:** comparison data, trend lines, or benchmarks.
      No isolated numbers without reference.
- [ ] **Data tables** have sorting, filtering, and pagination. Numeric columns
      are right-aligned. Text columns are left-aligned.
- [ ] **Empty states** are designed for first-use, no-results, and error
      scenarios with clear messaging and CTAs.
- [ ] **Loading states** use skeleton screens for container components. No blank
      white spaces during data fetch.
- [ ] **Data freshness** is indicated with "Last updated" timestamps or
      real-time pulse indicators.

### Interaction & Navigation

- [ ] **Command palette** (Cmd+K) is implemented for global search and
      quick actions.
- [ ] **Keyboard navigation** works for tables (arrow keys), tabs (left/right),
      and modals (Escape to close).
- [ ] **Bulk actions** appear when table rows are selected, with clear
      selection count.
- [ ] **Filter state** is visible (active filter badges/chips) and clearable
      with a single "Reset" action.
- [ ] **Saved filters** are available for data-heavy views so users can
      bookmark common queries.

### Visual Design

- [ ] **Typography** uses tabular figures for numbers. Body text is 13-14px
      minimum. Heading hierarchy is clear (24px > 18px > 16px > 14px).
- [ ] **Color palette** is limited to 5-7 data colors. Semantic colors (red,
      green, yellow) are used consistently for status. Color is never the sole
      indicator.
- [ ] **Dark mode** is supported or planned. Color tokens use semantic naming,
      not raw hex values.
- [ ] **Density** is appropriate for the audience. Enterprise tools use compact
      spacing; consumer tools use generous spacing. A density toggle is ideal.

### Accessibility

- [ ] **Color contrast** meets WCAG AA (4.5:1 for text, 3:1 for large text
      and UI components).
- [ ] **Status indicators** pair color with icons, labels, or patterns for
      color-blind users.
- [ ] **Charts** include text labels or tooltips so information is not
      color-dependent. Palettes are tested against color vision deficiency
      simulations.

---

## References

- [Ant Design Pro - Layout](https://pro.ant.design/docs/layout) | [Visualization Page Spec](https://ant.design/docs/spec/visualization-page/)
- [Atlassian DS - Navigation System](https://atlassian.design/components/navigation-system/) | [New Navigation Blog](https://www.atlassian.com/blog/design/designing-atlassians-new-navigation) | [Data Viz Colors](https://www.atlassian.com/data/charts/how-to-choose-colors-data-visualization)
- [Shopify Polaris - Data Table](https://polaris.shopify.com/components/tables/data-table) | [Data Visualizations](https://polaris-react.shopify.com/design/data-visualizations) | [Spatial Organization](https://polaris-react.shopify.com/design/layout/spacial-organization)
- [Tremor - Dashboard Components](https://www.tremor.so/) | [Retool - Design Best Practices](https://docs.retool.com/education/coe/well-architected/design)
- [Cloudscape - Configurable Dashboard](https://cloudscape.design/patterns/general/service-dashboard/configurable-dashboard/)
- [Carbon DS - Empty States](https://carbondesignsystem.com/patterns/empty-states-pattern/) | [Loading Pattern](https://carbondesignsystem.com/patterns/loading-pattern/)
- [Linear - UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | [Dashboard Best Practices](https://linear.app/now/dashboards-best-practices)
- [Pencil & Paper - Data Tables](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) | [Dashboards](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) | [Filtering](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)
- [NN/g - Skeleton Screens](https://www.nngroup.com/articles/skeleton-screens/) | [Empty States in Complex Apps](https://www.nngroup.com/articles/empty-state-interface-design/)
- [Superhuman - Command Palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/) | [LogRocket - Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/)
- [Dense Dashboard Fonts](https://fontalternatives.com/blog/best-fonts-dense-dashboards/) | [8pt Grid System](https://uxplanet.org/everything-you-should-know-about-8-point-grid-system-in-ux-design-b69cb945b18d)
- [Data Viz Color Best Practices](https://letdataspeak.com/mastering-color-in-data-visualizations/) | [USWDS Data Visualizations](https://designsystem.digital.gov/components/data-visualizations/)
