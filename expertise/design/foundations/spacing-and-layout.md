# Spacing and Layout — Foundation Expertise Module

> Spacing and layout form the structural backbone of every user interface. Proper spacing creates visual rhythm, establishes hierarchy, groups related elements, and guides the user's eye through content. This module covers spacing scales, grid systems, platform-specific conventions, responsive strategies, and common pitfalls — grounded in principles from Material Design 3, Apple Human Interface Guidelines, and Ant Design.

---

## 1. Core Principles

### 1.1 Spacing Scales — The 4px Base Unit

A spacing scale is a predefined set of values used consistently across an entire product. The industry standard base unit is **4px**, which produces the following scale:

| Token   | Value | Common Use                                      |
|---------|-------|--------------------------------------------------|
| space-1 | 4px   | Inline icon-to-label gap, tight optical tweaks   |
| space-2 | 8px   | Related element gap, list item padding            |
| space-3 | 12px  | Form field internal padding, small card padding   |
| space-4 | 16px  | Standard padding, section sub-spacing             |
| space-6 | 24px  | Card-to-card gap, intra-section spacing           |
| space-8 | 32px  | Section dividers, group-to-group gap              |
| space-12| 48px  | Major section breaks, hero padding                |
| space-16| 64px  | Page-level vertical padding, feature blocks       |
| space-24| 96px  | Hero section vertical padding, landing pages      |

**Why 4px?** Four divides evenly into most screen densities. Android uses density-independent pixels (dp) where 1dp = 1px at 160dpi. iOS uses points (pt) where 1pt = 1px at 1x, 2px at 2x Retina, 3px at 3x. A 4px base unit scales cleanly at all these ratios without introducing sub-pixel rounding artifacts.

**Naming conventions vary across systems:**
- Material Design uses numeric tokens (e.g., `md.sys.spacing.4` = 16dp)
- Tailwind CSS uses a multiplier scale (e.g., `p-4` = 16px, where 1 unit = 4px)
- Ant Design recommends gutter values of `(16 + 8n)px` for grid spacing

### 1.2 The 8-Point Grid System

The 8-point grid constrains all spatial decisions — element sizes, padding, margins, gaps — to multiples of 8px (with 4px as a permitted half-step for fine-grained adjustments).

**Why 8px works:**

1. **Mathematical harmony.** 8 is divisible by 2 and 4, producing clean half-values (4px) and quarter-values (2px) without fractional pixels.
2. **Device alignment.** Common screen resolutions (360, 375, 390, 412, 768, 1024, 1280, 1440, 1920) divide evenly or near-evenly by 8.
3. **Industry adoption.** Both Google (Material Design) and Apple (HIG) recommend 8-point grids, making it the de facto standard for cross-platform consistency.
4. **Decision reduction.** A constrained scale prevents the "should it be 13px or 15px?" bikeshedding that slows design and code review.
5. **Developer alignment.** When designers and developers both use the same 8px grid, handoff friction drops significantly.

**When to use 4px instead of 8px:**
- Icon-to-text gaps within a single component (e.g., a button with an icon)
- Baseline grid alignment for typography
- Optical adjustments where 8px is visibly too much or too little
- Dense data tables where rows need tighter vertical spacing

### 1.3 Gestalt Proximity Principle

The law of proximity states: **elements placed near each other are perceived as belonging to the same group**, regardless of differences in shape, color, or size. This is the most fundamental spatial principle in UI design.

**Practical application — the spacing hierarchy:**

```
Tightest   ──→   Loosest

Within component  <  Between components  <  Between groups  <  Between sections
    4-8px               12-16px               24-32px            32-64px
```

**The internal ≤ external rule:**
The spacing inside a component (padding) must be less than or equal to the spacing outside it (margin). This ensures the component reads as a cohesive unit rather than bleeding into its neighbors.

```
┌────────────────────┐         ┌────────────────────┐
│    padding: 12px   │  gap:   │    padding: 12px   │
│                    │  24px   │                    │
│    Card Content    │ ◄─────► │    Card Content    │
│                    │         │                    │
└────────────────────┘         └────────────────────┘

Internal (12px) ≤ External (24px)  ✓ Correct — cards are distinct units
```

**Violation example:**
If card padding is 24px but the gap between cards is only 8px, the eye cannot distinguish where one card ends and the next begins. The content appears to float in a single undifferentiated block.

### 1.4 Content Density Levels

Different use cases demand different density strategies. The three standard levels are:

| Level       | Typical Row Height | Padding Scale | Best For                                         |
|-------------|-------------------|---------------|--------------------------------------------------|
| Compact     | 32-36px           | 4-8px         | Data tables, admin dashboards, power-user tools   |
| Comfortable | 40-48px           | 8-16px        | Default for most apps, balanced readability        |
| Spacious    | 56-72px           | 16-24px       | Marketing pages, onboarding, reading-focused apps  |

**When to use each:**

- **Compact:** Enterprise dashboards, trading platforms, email clients, spreadsheet-like views. Users are expert-level, use mouse/keyboard, and need to see many rows simultaneously. SAP Fiori and AWS Cloudscape both provide explicit "compact" density toggles for these cases.
- **Comfortable:** The default for consumer apps, standard SaaS products, and most mobile experiences. Targets the widest range of users and input methods. Material Design and Apple HIG defaults operate at this level.
- **Spacious:** Landing pages, editorial content, onboarding flows, and accessibility-focused experiences. Prioritizes readability and reduced cognitive load over information density.

**Accessibility consideration:** Always default to comfortable density. Compact density reduces target sizes and whitespace, which hinders users with motor impairments or vision difficulties. If offering a compact mode, make it opt-in and clearly labeled.

### 1.5 Layout Grids

Layout grids provide the structural scaffolding for placing content consistently across screen sizes.

**Column grids by platform:**

| Platform          | Columns | Gutter   | Margin   | Typical Container Max-Width |
|-------------------|---------|----------|----------|-----------------------------|
| Mobile (phone)    | 4       | 16px     | 16px     | Full-width (fluid)          |
| Tablet (portrait) | 8       | 16-24px  | 24px     | Full-width (fluid)          |
| Tablet (landscape)| 12      | 24px     | 24-32px  | Full-width or 960px         |
| Desktop           | 12      | 24-32px  | 24-64px  | 1140-1440px                 |
| Large desktop     | 12-16   | 32px     | 64px+    | 1440-1920px                 |

**Material Design 3 window size classes:**

| Class       | Width Range   | Columns | Typical Devices                  |
|-------------|---------------|---------|----------------------------------|
| Compact     | 0-599dp       | 4       | Phone portrait                   |
| Medium      | 600-839dp     | 8       | Tablet portrait, foldable        |
| Expanded    | 840-1199dp    | 12      | Tablet landscape, small desktop  |
| Large       | 1200-1599dp   | 12      | Desktop                          |
| Extra-large | 1600dp+       | 12-16   | Large desktop, connected displays|

**Ant Design's 24-column grid:**
Ant Design uses a 24-column fluid grid (instead of the more common 12-column system) because it provides finer-grained control over column widths. With 24 columns, you can create thirds (8 cols), quarters (6 cols), sixths (4 cols), eighths (3 cols), and twelfths (2 cols) without any fractional math. Their recommended gutter formula is `(16 + 8n)px` where `n` is a natural number, yielding responsive values like `{ xs: 8, sm: 16, md: 24, lg: 32 }`.

### 1.6 Gutters, Margins, and Padding Conventions

These three spatial concepts serve distinct purposes:

- **Margin:** The space between the screen edge and the content area. Creates breathing room and prevents content from touching device bezels.
- **Gutter:** The space between grid columns. Prevents adjacent columns of content from visually merging.
- **Padding:** The space inside a component, between its boundary and its content.

**Platform-specific conventions:**

| Platform  | Default Margin    | Default Gutter | Component Padding  |
|-----------|-------------------|----------------|--------------------|
| iOS       | 16pt              | 8-16pt         | 12-16pt            |
| Android   | 16dp              | 8-16dp         | 12-16dp            |
| Web       | 16-24px (mobile), 24-64px (desktop) | 16-32px | 12-24px |
| Desktop   | 24-64px           | 16-32px        | 12-24px            |

**Margin scaling pattern:**
As screens get larger, margins should increase proportionally to prevent content from stretching uncomfortably wide. A common pattern:
- Mobile: 16px fixed margins
- Tablet: 24-32px fixed margins
- Desktop: Fluid margins that center a max-width container (1140-1440px)
- Large desktop: Wider margins, content remains at max-width

### 1.7 Aspect Ratios for Media

Maintaining consistent aspect ratios prevents visual jank during image loading and ensures predictable layouts.

| Ratio | Decimal | Common Use                                           |
|-------|---------|------------------------------------------------------|
| 16:9  | 1.778   | Hero images, video players, widescreen thumbnails    |
| 4:3   | 1.333   | Product images, legacy video, photo galleries        |
| 3:2   | 1.500   | Photography, article feature images                  |
| 1:1   | 1.000   | Avatars, profile photos, product thumbnails, icons   |
| 2:3   | 0.667   | Portrait cards, book covers, movie posters           |
| 9:16  | 0.563   | Stories, reels, vertical video                       |
| 21:9  | 2.333   | Ultra-wide hero banners, cinematic backgrounds       |

**Implementation best practice:** Use the CSS `aspect-ratio` property (supported in all modern browsers) rather than the older padding-bottom hack:

```css
/* Modern approach */
.hero-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
}

/* Legacy approach (avoid if possible) */
.hero-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 9/16 = 0.5625 */
}
```

### 1.8 Responsive Spacing — Fixed vs Fluid vs Hybrid

Three strategies exist for adapting spacing across screen sizes:

**Fixed spacing:** Values remain constant regardless of viewport. A 16px gap is always 16px.
- Pros: Predictable, simple to implement and debug.
- Cons: Can feel too tight on large screens or too loose on small screens.
- Best for: Component-internal spacing that should not change (e.g., icon-to-text gap).

**Fluid spacing:** Values scale proportionally with the viewport using `vw`, `vh`, `clamp()`, or CSS `calc()`.
- Pros: Seamless scaling, no abrupt layout shifts.
- Cons: Harder to reason about, can produce unexpected values at extreme viewport sizes.
- Best for: Hero padding, section margins, large typographic spacing.

```css
/* Fluid spacing with clamp — scales between 24px and 64px */
.section {
  padding-block: clamp(24px, 4vw, 64px);
}
```

**Hybrid spacing (recommended for most projects):**
- Component-internal spacing: Fixed (8px, 12px, 16px stay constant).
- Component-external spacing: Fixed at breakpoints, steps up at each breakpoint.
- Section/page-level spacing: Fluid or stepped (clamp between min and max values).

### 1.9 Container Queries vs Media Queries

**Media queries** ask: "How wide is the viewport?"
**Container queries** ask: "How wide is my parent container?"

| Aspect              | Media Queries                     | Container Queries                    |
|---------------------|-----------------------------------|--------------------------------------|
| Responds to         | Viewport (window) size            | Parent container size                |
| Scope               | Global — affects page layout      | Local — affects component layout     |
| Reusability          | Component layout tied to page     | Component layout is self-contained   |
| Browser support     | Universal (IE9+)                  | 93%+ global support (Dec 2025)       |
| Best for            | Page-level layout shifts          | Component-level adaptation           |

**Mental model:**
- Use **media queries** to decide how many columns your page has, whether the sidebar is visible, and whether navigation collapses to a hamburger menu.
- Use **container queries** to let a card component decide whether to show its image on the left or on top, whether to truncate its description, or whether to stack its actions vertically — all based on how much space it actually has, not the viewport.

```css
/* Page-level: media query */
@media (min-width: 768px) {
  .page-grid { grid-template-columns: 240px 1fr; }
}

/* Component-level: container query */
.card-wrapper { container-type: inline-size; }

@container (min-width: 400px) {
  .card { flex-direction: row; }
}
@container (max-width: 399px) {
  .card { flex-direction: column; }
}
```

**Best practice for 2025+:** Use both. Media queries for page scaffolding, container queries for component internals. This produces truly portable components that work correctly regardless of where they are placed in a layout.

---

## 2. Do's and Don'ts

### 2.1 Do's

1. **Do use a consistent spacing scale.** Pick a base unit (4px or 8px) and derive all spacing from it. Never use arbitrary values like 13px or 7px. Every spacing value in your system should be a multiple of 4.

2. **Do keep component internal padding smaller than external margins.** A card with 16px padding should have at least 16px (preferably 24px) gap between sibling cards. This is the internal ≤ external rule rooted in Gestalt proximity.

3. **Do use 16px horizontal margins on mobile.** Both iOS (16pt) and Android (16dp) standardize on this value. It is the minimum needed to prevent content from touching screen edges.

4. **Do provide 24-32px gap between card groups on mobile and 32-48px on desktop.** Within a card, use 12-16px padding. This creates clear visual separation between groups while keeping card content cohesive.

5. **Do set a max-width container for web content.** Use 1140-1440px for the main content area. Text blocks should be constrained further — 600-800px (approximately 60-80 characters per line) for optimal readability.

6. **Do increase vertical spacing between sections as screen size grows.** Use 32-48px section spacing on mobile, 48-64px on tablet, and 64-96px on desktop. This prevents the "wall of content" feeling on large screens.

7. **Do use at least 8px gap between interactive elements.** WCAG 2.5.8 requires a minimum 24x24px target size for touch targets, and sufficient spacing prevents accidental taps on adjacent elements.

8. **Do apply consistent vertical rhythm.** Stack elements using one or two spacing values (e.g., 8px within groups, 24px between groups). Avoid mixing three or more different vertical gaps in a single section.

9. **Do use CSS `gap` for flex and grid layouts.** It separates the concern of spacing from the components themselves, making layouts easier to maintain than margins on individual elements.

10. **Do account for safe areas on devices with notches, Dynamic Island, or home indicators.** On iOS, use `safeAreaInset`. On Android 15+, use `WindowInsets.safeDrawing`. On web, use `env(safe-area-inset-top)` and related values.

11. **Do use the `aspect-ratio` CSS property for media containers.** It prevents layout shift (CLS) during image loading and keeps proportions correct across breakpoints.

12. **Do test spacing at both extremes: 320px mobile and 2560px ultra-wide.** Spacing that looks perfect at 1440px often breaks at these extremes. Use `clamp()` for fluid spacing.

13. **Do apply tighter spacing (compact density) only for expert-user interfaces operated with mouse/keyboard.** Data tables, admin panels, and IDE-like tools can use 4-8px row padding. Consumer-facing interfaces should default to comfortable density (8-16px).

14. **Do use consistent gutter width across all columns in a grid.** A 12-column grid with 24px gutters means every gutter is 24px. Never vary gutter size within the same grid.

15. **Do define spacing tokens in your design system.** Name them semantically (e.g., `spacing-xs`, `spacing-sm`, `spacing-md`, `spacing-lg`, `spacing-xl`) or numerically (e.g., `space-2`, `space-4`, `space-8`). Tokens prevent magic numbers in code.

### 2.2 Don'ts

1. **Don't use arbitrary spacing values.** Values like 5px, 7px, 13px, 15px, 17px, or 22px break grid alignment and make the interface feel unpolished. Stick to multiples of 4px.

2. **Don't apply the same spacing everywhere.** If every gap is 16px — between icon and label, between form fields, between sections — the layout has no hierarchy. Vary spacing intentionally to create grouping.

3. **Don't let text run full-width on desktop.** Lines exceeding 80 characters per line (approximately 800px at 16px font size) drastically reduce readability. Always constrain text containers.

4. **Don't ignore safe areas.** Content obscured by the notch, Dynamic Island, home indicator, or rounded corners frustrates users and looks broken. This is the single most common layout bug on modern phones.

5. **Don't set margins on both sides of a spacing relationship.** Use gap in flex/grid layouts, or apply margin-bottom on all siblings except the last (`:last-child` reset). Double margins (margin-right on element A + margin-left on element B) cause compounding and inconsistency.

6. **Don't hard-code pixel breakpoints in dozens of places.** Define breakpoints as design tokens or CSS custom properties. When you need to adjust a breakpoint, change it in one place.

7. **Don't confuse padding with margin.** Padding is inside the element boundary (background/border). Margin is outside. Using margin when you mean padding (or vice versa) causes layout shifts, broken backgrounds, and inconsistent click/tap areas.

8. **Don't use negative margins to fix layout issues.** Negative margins are a symptom of incorrect structural layout. Fix the grid, flexbox, or container instead.

9. **Don't make touch targets smaller than 44x44pt (iOS) or 48x48dp (Android).** Even if the visual element is smaller (e.g., a 24px icon), the tappable area must meet minimum size requirements. WCAG 2.5.5 (AAA) specifies 44x44 CSS pixels.

10. **Don't rely solely on spacing to separate content.** Combine spacing with visual dividers (lines, background color changes, elevation/shadow) for maximum clarity, especially in dense interfaces.

11. **Don't scale spacing linearly with viewport width.** A section that has 32px padding on mobile should not have 320px padding on a 3200px ultra-wide. Use `clamp()` to cap both minimum and maximum values.

12. **Don't put zero gap between clickable list items.** A 0px gap between tappable rows causes accidental taps on the wrong item. Use at least 1px divider or 4-8px vertical padding.

13. **Don't assume desktop spacing works on mobile.** A 48px section gap that feels right on desktop can consume too much precious vertical space on a 667px-tall phone screen. Always test at mobile viewport heights, not just widths.

14. **Don't use percentage-based padding for components.** Padding of `5%` on a component inside a 400px container is 20px, but inside a 1400px container it's 70px. Component padding should be fixed; layout margins can be fluid.

---

## 3. Platform Variations

### 3.1 iOS (Apple Human Interface Guidelines)

**Core spatial values:**
- Standard margin: **16pt** on iPhone, **20pt** on iPad
- Spacing scale: Multiples of 8pt (8, 16, 24, 32, 40, 48)
- Navigation bar height: 44pt (standard), 96pt (large title)
- Tab bar height: 49pt (standard), 83pt (with home indicator region)
- Minimum touch target: **44x44pt**

**Safe areas:**
iOS devices with Face ID, Dynamic Island, or rounded corners define safe area insets that content must respect. Common inset values:
- Status bar (top): 54pt (iPhone 15/16 with Dynamic Island)
- Home indicator (bottom): 34pt
- Rounded corners: approximately 47pt radius on recent iPhones

**Layout guidance:**
- Use `UILayoutGuide` / SwiftUI `safeAreaInset` to keep content clear of system UI
- `readableContentGuide` constrains text to a comfortable width (approximately 672pt max)
- On iPad, use sidebar navigation (320pt wide) with split view layouts
- Support both portrait and landscape orientations
- As of iOS 17, use `safeAreaPadding` for simpler safe area adjustments in SwiftUI

**Key patterns:**
- Full-width cards with 16pt horizontal padding and 12pt internal padding
- Grouped table views with 35pt section headers and 20pt section footer spacing
- Modal sheets with 16pt edge padding and 24pt top padding from the drag indicator

### 3.2 Android (Material Design 3)

**Core spatial values:**
- Standard margin: **16dp** on phone, **24dp** on tablet
- Grid: 8dp baseline grid, 4dp for fine adjustments
- App bar height: 64dp (standard), 56dp (dense)
- Bottom navigation height: 80dp
- Minimum touch target: **48x48dp**
- FAB size: 56dp (standard), 40dp (small), 96dp (large)

**Edge-to-edge displays (Android 15+):**
Starting with Android 15 (API 35), edge-to-edge is mandatory. Apps draw behind the status bar and navigation bar. Key considerations:
- Use `WindowInsets.systemBars` to add padding that avoids system UI
- Use `WindowInsets.safeDrawing` for content that must not be obscured
- Use `WindowInsets.safeGestures` to avoid conflict with system gesture zones
- Background colors and images should extend edge-to-edge
- Interactive content and text must be inset within safe areas

**Material Design 3 layout panes:**
- Single pane: Compact screens (0-599dp)
- Two panes: Medium/Expanded screens (600dp+), using list-detail or supporting panel
- Pane separator (spacer): 24dp between panes

**Key patterns:**
- Card elevation: use 1dp-8dp shadow/tonal elevation
- Card padding: 16dp
- List item height: 56dp (single line), 72dp (two lines), 88dp (three lines)
- Between list groups: 8dp divider with 16dp indent

### 3.3 Web

**Container strategies:**
The most common approach uses a centered max-width container:

| Container Type     | Max-Width    | Use Case                            |
|--------------------|-------------|--------------------------------------|
| Narrow content     | 640-768px   | Blog posts, articles, documentation  |
| Standard content   | 1140-1200px | SaaS dashboards, app layouts         |
| Wide content       | 1320-1440px | Marketing pages, portfolio sites     |
| Full-width         | 100%        | Hero sections, full-bleed media      |

**Common breakpoints (2025 consensus):**

| Name        | Min-Width | Target                       |
|-------------|-----------|-------------------------------|
| xs          | 0px       | Small phones (portrait)       |
| sm          | 480px     | Large phones (landscape)      |
| md          | 768px     | Tablets (portrait)            |
| lg          | 1024px    | Tablets (landscape), laptops  |
| xl          | 1280px    | Desktops                      |
| 2xl         | 1536px    | Large desktops, 4K displays   |

**CSS layout tools:**
- Use **CSS Grid** for 2D page-level layouts (columns + rows)
- Use **Flexbox** for 1D component-level layouts (rows or columns)
- Use **CSS `gap`** property instead of margins for grid/flex children
- Use **`clamp()`** for fluid typography and spacing
- Use **container queries** for component-level responsive design

**Web-specific spacing patterns:**
- Page horizontal padding: `clamp(16px, 4vw, 64px)`
- Section vertical spacing: `clamp(48px, 8vw, 96px)`
- Card grid gap: 16px (mobile), 24px (tablet), 32px (desktop)
- Form field vertical gap: 16-24px
- Button group gap: 8-12px

### 3.4 Desktop Applications

**Key differences from web and mobile:**
- Users sit closer to the screen, enabling denser information display
- Mouse and keyboard input allows smaller click targets (minimum 24x24px, recommended 32x32px)
- Multiple windows may be visible simultaneously, so layouts must work at arbitrary dimensions
- Higher resolution displays (2x, 3x) are common, requiring assets and spacing that scale cleanly

**Windows (Fluent Design):**
- Standard item height: 40px (standard sizing), 32px (compact sizing)
- Margins: 16px minimum, 24-48px for main content areas
- Tree view indent: 12px per level
- Standard spacing: Multiples of 4px

**macOS (Apple HIG):**
- Standard sidebar width: 200-280pt
- Toolbar height: 38pt (unified), 52pt (expanded)
- Content padding: 20pt standard
- Control spacing: 8pt between related, 20pt between groups

**Cross-platform desktop guidance:**
- Default to comfortable density; offer compact mode for power users
- Use split/panel layouts with resizable dividers (minimum pane width: 200px)
- Preserve layout state (panel widths, scroll position) across sessions
- Account for window chrome (title bar, menu bar) in layout calculations

---

## 4. Common Mistakes in AI-Generated Designs

AI design tools and code generators frequently produce layouts with systematic spacing errors. Understanding these patterns helps designers and developers quickly identify and correct them.

### 4.1 Inconsistent Spacing

**Problem:** AI often applies different spacing values for the same relationship type. One card has 12px padding, the next has 18px, a third has 14px. Section gaps alternate between 30px and 42px with no pattern.

**Detection:** Inspect spacing values across all instances of the same component or relationship type. If you find more than 2-3 distinct values where there should be 1, the spacing is inconsistent.

**Fix:** Audit all spacing values and map them to the nearest value on your 4px/8px scale. Apply design tokens so every instance of "card padding" uses the same token.

### 4.2 Spacing That Is Too Tight or Too Loose

**Problem:** AI-generated layouts frequently err in one of two directions:
- **Too tight:** Content crammed together with minimal breathing room, especially on desktop where screens are large. Common when AI optimizes for "fitting everything above the fold."
- **Too loose:** Excessive whitespace that forces unnecessary scrolling, especially on mobile. Common when AI applies desktop spacing values to mobile layouts without adaptation.

**Detection:** Compare the spacing to platform defaults. If a mobile card has 32px padding and 48px gaps, it's too loose. If a desktop dashboard has 4px gaps between data panels, it's too tight.

**Fix:** Refer to platform spacing conventions in Section 3. Mobile cards typically use 12-16px padding with 16-24px gaps. Desktop dashboards use 16-24px padding with 24-32px gaps.

### 4.3 Ignoring Safe Areas

**Problem:** AI-generated mobile layouts routinely place content behind the status bar, notch, Dynamic Island, home indicator, and rounded corners. This is the most visually jarring mistake and the easiest to identify.

**Detection:** Overlay the device's safe area template on the generated design. Any content that falls outside the safe area boundary is a violation.

**Fix:** Apply platform-specific safe area insets. On iOS, use `safeAreaInset` or `SafeAreaView` (React Native). On Android, use `WindowInsets.safeDrawing`. On web, use `env(safe-area-inset-*)` with `viewport-fit=cover`.

### 4.4 No Spacing Hierarchy

**Problem:** AI often treats all spacing equally — the gap between a label and its input field is the same as the gap between two form sections. This violates the Gestalt proximity principle and destroys visual grouping.

**Detection:** Look for at least three distinct spacing tiers in any layout: tight (within components), medium (between components), and wide (between sections). If everything is one value, the hierarchy is missing.

**Fix:** Apply the spacing hierarchy: 4-8px within components, 12-16px between related components, 24-32px between groups, 32-64px between sections.

### 4.5 Grid Misalignment

**Problem:** AI-generated elements frequently do not align to a grid. Text blocks start at different horizontal positions, cards have inconsistent widths, and elements drift off the column structure.

**Detection:** Overlay a column grid on the design. Elements should snap to column boundaries. If images, text, and buttons all start at different x-coordinates within the same section, the grid is broken.

**Fix:** Establish a column grid (4 columns mobile, 12 columns desktop) and align all content blocks to column boundaries. Use CSS Grid or a grid framework to enforce structural alignment.

### 4.6 Inconsistent Component Scaling Across Breakpoints

**Problem:** A component that looks balanced at one screen size becomes disproportionate at another. Common examples: desktop cards with 24px padding that retain 24px padding on a 375px phone (consuming too much of the available width), or icons that do not scale with their containing elements.

**Detection:** Preview the layout at all major breakpoints (mobile, tablet, desktop). If components feel cramped or oversized at any breakpoint, the scaling strategy is incorrect.

**Fix:** Define responsive spacing that adjusts at each breakpoint. Use a responsive spacing scale or `clamp()` for fluid adaptation.

---

## 5. Decision Framework

### 5.1 Fixed vs Fluid Layout

| Choose Fixed When...                         | Choose Fluid When...                            |
|----------------------------------------------|-------------------------------------------------|
| Content has a predictable, constrained width | Content must fill variable-width containers      |
| Precise pixel alignment is critical           | Users access from unpredictable screen sizes     |
| The layout is for a controlled environment    | The layout is for public web or multi-device use |
| You are designing for a kiosk or single device| You are designing a responsive web application   |
| Component-internal spacing (always fixed)     | Page-level margins and section padding           |

**Hybrid approach (recommended):** Fix component-internal spacing, use fluid margins and section spacing, and let the grid system handle column distribution.

### 5.2 Dense vs Spacious for Different Content Types

| Content Type              | Recommended Density | Rationale                                                    |
|---------------------------|---------------------|--------------------------------------------------------------|
| Data tables               | Compact             | Users scan rows quickly; more visible rows = faster tasks    |
| Admin dashboards          | Compact-Comfortable | Balance data density with navigability                       |
| Email/messaging clients   | Compact             | Maximize message list visibility; users scan rapidly         |
| E-commerce product grids  | Comfortable         | Images need breathing room; users browse, not scan           |
| Forms                     | Comfortable         | Adequate spacing prevents input errors and reduces fatigue   |
| Article/blog content      | Spacious            | Reading comfort; generous line height and margins            |
| Onboarding flows          | Spacious            | Focus attention; reduce cognitive load for new users         |
| Marketing landing pages   | Spacious            | Create visual impact; allow each section to "breathe"        |
| Settings/preferences      | Comfortable         | Standard information hierarchy; not data-intensive           |
| Code editors/IDEs         | Compact             | Maximize visible code; users are expert-level                |

### 5.3 Grid Column Choices

| Columns | Divisors           | Best For                                                      |
|---------|--------------------|---------------------------------------------------------------|
| 4       | 1, 2, 4            | Mobile layouts, simple content structures                     |
| 6       | 1, 2, 3, 6         | Simplified tablet layouts, email templates                    |
| 8       | 1, 2, 4, 8         | Tablet layouts, Medium complexity structures                  |
| 12      | 1, 2, 3, 4, 6, 12  | Desktop layouts (industry standard), maximum flexibility      |
| 16      | 1, 2, 4, 8, 16     | Large desktop/enterprise layouts requiring fine control       |
| 24      | 1, 2, 3, 4, 6, 8, 12, 24 | Ant Design standard; maximum subdivision flexibility   |

**Decision rule:** Use 12 columns unless you have a specific reason not to. 12 divides into halves, thirds, quarters, and sixths — covering virtually every layout pattern. Use 4 columns on mobile because phones rarely need more than a 2-column sub-layout. Use 24 columns only when you need very fine column control (e.g., complex data-dense enterprise dashboards).

### 5.4 When to Break the Grid

Grids are guidelines, not prisons. Break the grid intentionally in these situations:
- **Full-bleed media:** Hero images and background sections should extend to the viewport edge.
- **Overlapping elements:** Cards or images that intentionally break out of their column for visual interest.
- **Asymmetric layouts:** Editorial or portfolio designs where visual tension creates engagement.
- **Floating elements:** FABs, tooltips, popovers, and toast notifications sit above the grid.

**Rule of thumb:** If you break the grid, break it by at least 2 columns. A 1-column offset looks like a mistake; a 2-column offset looks intentional.

---

## 6. Quick Reference Checklist

Use this checklist to audit any layout design or implementation:

### Spacing Scale

- [ ] All spacing values are multiples of 4px (or the chosen base unit)
- [ ] A defined spacing scale with named tokens exists and is used consistently
- [ ] No "magic number" spacing values appear in the codebase (e.g., 13px, 7px, 22px)
- [ ] Component internal padding ≤ gap between sibling components (internal ≤ external rule)

### Grid and Structure

- [ ] A column grid is defined: 4 columns on mobile, 8 on tablet, 12 on desktop
- [ ] Gutters are consistent across all columns (no variable gutter widths)
- [ ] Content is aligned to the column grid; elements share consistent start/end positions
- [ ] A max-width container constrains content on large screens (1140-1440px)
- [ ] Text line length is limited to 60-80 characters for readability

### Platform Compliance

- [ ] Mobile margins are at least 16px (16pt iOS, 16dp Android)
- [ ] Safe areas are respected: no content behind notch, Dynamic Island, or home indicator
- [ ] Touch targets meet minimum size: 44x44pt (iOS), 48x48dp (Android), 24x24px (WCAG AA)
- [ ] Edge-to-edge rendering is handled with proper insets (Android 15+)

### Responsive Behavior

- [ ] Spacing adjusts across breakpoints (tighter on mobile, looser on desktop)
- [ ] Media containers maintain correct aspect ratios across screen sizes
- [ ] Breakpoints are defined as tokens/variables, not hard-coded in multiple places
- [ ] Layout is tested at extremes: 320px width, 2560px width, and 568px height

### Density and Hierarchy

- [ ] At least three spacing tiers exist: within components, between components, between sections
- [ ] Content density matches the use case (compact for data, spacious for reading)
- [ ] Default density is "comfortable"; compact is opt-in only
- [ ] Spacing creates clear visual grouping per the Gestalt proximity principle

---

## Sources

- [Material Design 3 — Layout / Spacing](https://m3.material.io/foundations/layout/understanding-layout/spacing)
- [Material Design 3 — Applying Layout / Window Size Classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)
- [Material Design 2 — Spacing Methods](https://m2.material.io/design/layout/spacing-methods.html)
- [Material Design 2 — Applying Density](https://m2.material.io/design/layout/applying-density.html)
- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG — Layout and Organization](https://developer.apple.com/design/human-interface-guidelines/layout-and-organization)
- [Apple Developer — Positioning Content Within Layout Margins](https://developer.apple.com/documentation/uikit/positioning-content-within-layout-margins)
- [Ant Design — Layout Specification](https://ant.design/docs/spec/layout/)
- [Ant Design — Grid Component](https://ant.design/components/grid/)
- [Android Developers — Edge-to-Edge Display](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [Android Developers — Window Insets (Compose)](https://developer.android.com/develop/ui/compose/system/insets)
- [NNGroup — Gestalt Proximity Principle](https://www.nngroup.com/articles/gestalt-proximity/)
- [Cloudscape Design System — Content Density](https://cloudscape.design/foundation/visual-foundation/content-density/)
- [SAP Fiori — Content Density (Cozy and Compact)](https://experience.sap.com/fiori-design-web/cozy-compact/)
- [Cieden — Spacing Best Practices (8pt Grid, Internal ≤ External Rule)](https://cieden.com/book/sub-atomic/spacing/spacing-best-practices)
- [8-Point Grid Specification](https://spec.fm/specifics/8-pt-grid)
- [EightShapes — Space in Design Systems](https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62)
- [UXPin — Aspect Ratios in UX/UI Design](https://www.uxpin.com/studio/blog/aspect-ratio/)
- [LogRocket — Container Queries in 2026](https://blog.logrocket.com/container-queries-2026/)
- [BrowserStack — Responsive Design Breakpoints 2025](https://www.browserstack.com/guide/responsive-design-breakpoints)
- [Microsoft Learn — Windows Spacing and Sizes](https://learn.microsoft.com/en-us/windows/apps/design/style/spacing)
