# Navigation Patterns

> **Module Type:** Pattern
> **Domain:** UI/UX Design
> **Last Updated:** 2026-03-07
> **Authoritative Sources:** Apple HIG, Material Design 3, Nielsen Norman Group, W3C WAI-ARIA, WCAG 2.2

---

## Overview

Navigation is the skeletal system of any digital product. It determines how users move
through content, find features, and build a mental model of the application. Poor
navigation is the single most common reason users abandon an app or website. This module
covers the anatomy of navigation patterns, when to use each variant, cross-platform
adaptation strategies, accessibility requirements, and common anti-patterns to avoid.

**Core principle:** Navigation should be invisible when it works and immediately obvious
when a user needs it. The best navigation systems let users answer three questions at
any point: Where am I? Where can I go? How do I get back?

---

## 1. Pattern Anatomy

### 1.1 Navigation Categories

Navigation systems fall into three functional categories:

| Category | Purpose | Examples |
|---|---|---|
| **Global (Persistent)** | Always visible; provides access to top-level destinations | Tab bar, sidebar, top nav bar |
| **Local (Contextual)** | Appears within a section; navigates sub-content | Breadcrumbs, segmented controls, section tabs |
| **Supplemental (Shortcuts)** | Accelerates access to frequent or related content | Search, deep links, quick actions, shortcuts |

**Global navigation** remains consistent across the entire application. It anchors the
user's mental model and should never change structure based on context. Limit global
navigation to 3-7 top-level destinations.

**Local navigation** is scoped to the current section and adapts to context. Breadcrumbs,
in-page tabs, and section headers all serve local navigation. Local navigation should
visually nest under global navigation so hierarchy is clear.

**Supplemental navigation** includes search bars, command palettes (Cmd+K), recently
visited lists, and contextual quick actions. These do not replace global or local
navigation but provide shortcuts for power users and return visitors.

### 1.2 Navigation Variants

#### Tab Bar (Bottom Navigation)

- **When to use:** Mobile apps with 3-5 equally important top-level destinations.
- **Platform:** iOS (standard), Android (Material Design navigation bar).
- **Behavior:** Tapping a tab switches the view; long-press may reveal sub-options.
  Each tab maintains its own navigation stack. Re-tapping the active tab scrolls
  to top or pops to root.
- **Apple HIG:** Use 3-5 tabs on iPhone. Use SF Symbols that automatically adapt
  between regular and compact contexts. Tab titles should be concrete nouns or verbs.
  Avoid overflow ("More") tabs whenever possible.
- **Material Design 3:** Navigation bar supports 3-5 destinations. Each destination
  has an icon and an optional text label. Active destination uses a filled icon with
  a pill-shaped indicator behind it.

#### Sidebar Navigation

- **When to use:** Desktop and tablet apps with 5+ destinations, or apps with
  hierarchical content (file managers, project tools, messaging).
- **Platform:** macOS (primary pattern), iPadOS (replaces tab bar), web (common).
- **Behavior:** Persistent left-aligned panel. Can be collapsible (icon-only mode)
  or expandable. Supports nested items via accordions or tree views.
- **Best for:** Productivity tools (Notion, Linear, Slack), admin dashboards,
  content management systems.

#### Navigation Drawer (Hamburger Menu)

- **When to use:** Secondary navigation on mobile when bottom tabs handle primary
  destinations; or as the sole navigation only when the app has many destinations
  that cannot fit in a tab bar.
- **Platform:** Android (being deprecated in M3 Expressive in favor of expanded
  navigation rail), web (responsive fallback).
- **Critical caveat:** NNGroup research with 179 participants found that hidden
  navigation reduces content discoverability by over 20% compared to visible
  navigation. On desktop, users engaged with hidden navigation only 27% of the
  time vs. nearly double for visible navigation. Use visible navigation whenever
  screen space permits.

#### Top Navigation Bar

- **When to use:** Websites with 4-8 top-level sections. Marketing sites,
  documentation, e-commerce.
- **Platform:** Web (standard), desktop apps (secondary to sidebar).
- **Behavior:** Horizontal bar at the top of the viewport. May include dropdowns
  (mega menus) for sub-navigation. Sticky positioning keeps it accessible during
  scroll.
- **Guidelines:** Front-load keywords in labels. Use clear category names, not
  clever branding terms. Keep dropdowns to one level deep when possible.

#### Bottom Navigation (Android Specific)

- **When to use:** Android apps with 3-5 primary destinations.
- **M3 Expressive update (2025):** Short bottom bars have returned. Navigation
  drawers on phones are being deprecated in favor of the bottom navigation bar
  plus an expanded/collapsed navigation rail system.

#### Navigation Rail

- **When to use:** Tablet and foldable devices; medium-width screens (600-840dp).
- **Platform:** Android/Material Design.
- **Behavior:** Vertical strip on the leading edge with 3-7 icon+label destinations.
  Can include a FAB. M3 Expressive introduces collapsed (icon-only) and expanded
  (icon+label, replacing drawer) states.

#### Breadcrumbs

- **When to use:** Hierarchical content with 3+ levels. E-commerce categories,
  documentation, file systems.
- **Platform:** Web (primary), desktop apps.
- **Behavior:** Horizontal trail showing the path from root to current page.
  Each segment is a link except the current page. Placed below global navigation,
  above page heading.
- **NNGroup guideline:** Breadcrumbs should always show the current page (even if
  the title is repeated). They supplement -- never replace -- primary navigation.
- **Mobile:** Generally not recommended. Use a stepper for multi-step flows instead.

#### Stepper / Wizard

- **When to use:** Linear multi-step processes: checkout, onboarding, form wizards.
- **Behavior:** Shows numbered steps with current position highlighted. Completed
  steps may be clickable for editing. Forward progress requires validation.
- **Guidelines:** Limit to 3-7 steps. Show a progress indicator. Allow backward
  navigation to completed steps. On mobile, a stepper is preferred over breadcrumbs
  for multi-step flows.

---

## 2. Best-in-Class Examples

### 2.1 Spotify -- Bottom Tab Bar (3 tabs: Home, Search, Library)
- Minimal tab count keeps decisions simple and thumb-friendly.
- Gradient-blended tab bar creates seamless visual transition with content.
- Hides on scroll-down, reappears on scroll-up; each tab preserves its own stack.
- "Now Playing" bar above tab bar serves as persistent supplemental navigation.

### 2.2 Airbnb -- Bottom Tab Bar (5 tabs, icon + label)
- Unified cross-platform experience: moved Android from drawer to bottom tabs
  matching iOS for consistency.
- Category filter chips (horizontal scroll) act as local navigation within Explore,
  avoiding a separate filter screen.
- Deep linking preserves a synthetic back stack to the parent category.

### 2.3 Linear -- Collapsible Sidebar + Tabs + Cmd+K
- Three-section sidebar (Product, Customers, Company) collapsible to icon-only.
- In-app tabs (List, Board, Timeline) for contextual view switching.
- Cmd+K command palette for power-user supplemental navigation.
- Works identically in Electron and browser with adaptive nav buttons.

### 2.4 Notion -- Accordion Sidebar + Breadcrumbs + Search
- Accordion tree structure supports infinite nesting while keeping top level scannable.
- Four persistent top items (Search, AI, Home, Inbox) always accessible.
- Breadcrumbs at page top enable quick jumps to any ancestor.
- Drag-and-drop reordering; user-resizable sidebar that remembers state.

### 2.5 Instagram -- Bottom Tab Bar (5 tabs, icon-only)
- Filled (solid) vs. outlined (stroke) icons for active/inactive -- industry standard.
- Swipe gestures for Stories and Feed as natural supplemental navigation.
- Camera and messaging via edge swipes keeps tab bar clean.

### 2.6 GitHub -- Top Nav + Contextual Tabs + Breadcrumbs
- Repository-scoped tab bar (Code, Issues, PRs, Actions) within a consistent shell.
- Breadcrumb-style file path navigation in the code browser.
- Keyboard shortcuts (`?` for help) as supplemental navigation for developers.

### 2.7 Slack -- Dual-Panel Sidebar + Cmd+K
- Hierarchical channel sidebar with collapsible sections and unread badges.
- Cmd+K quick switcher for instant navigation to any channel, person, or file.
- Thread side sheet maintains main channel context; mobile adapts to single-panel.

### 2.8 Figma -- Three-Panel Layout (Layers | Canvas | Properties)
- Panel layout matches the mental model: structure left, canvas center, properties right.
- Page tabs in the left panel; all panels independently collapsible.
- Breadcrumb-style component path for nested component navigation.

---

## 3. User Flow Mapping

### 3.1 Navigation Hierarchy Design

**Mobile:** Limit to 2-3 levels of hierarchy maximum.
- Level 1: Tab bar / bottom navigation (3-5 destinations)
- Level 2: Lists, cards, or section headers within a tab
- Level 3: Detail views pushed onto the navigation stack

**Desktop/Web:** Can support 3-4 levels with care.
- Level 1: Sidebar or top nav (global)
- Level 2: Sub-sections within sidebar or breadcrumb path
- Level 3: Page-level content tabs or segmented controls
- Level 4: Detail panels, modals, or side sheets

**Rule of thumb:** If a user cannot describe where they are in under 5 seconds, the
hierarchy is too deep.

### 3.2 Deep Linking Considerations

Deep links must produce a coherent navigation state even when the user enters the
app at an arbitrary point.

**Synthetic back stack:** When a user opens a deep link (e.g., a shared message or
product URL), the system must construct a back stack that simulates the path they
would have taken from the root. Android Navigation component handles this
automatically if the navigation graph is well-defined. iOS requires manual
configuration of the NavigationStack path.

**Authentication gates:** If a deep link targets authenticated content, queue the
destination and redirect through login, then resume navigation post-auth. Never
drop the intended destination.

**URL structure:** Web deep links should mirror the information architecture.
`/projects/acme/issues/42` is self-documenting. Avoid opaque IDs without context:
`/p/x7f3k` tells the user nothing.

**State serialization:** Deep links should encode enough state to restore the view:
active filters, sort order, scroll position (where practical). Consider URL query
parameters or fragment identifiers for web.

### 3.3 State Preservation During Navigation

- **Tab state:** Each tab in a bottom navigation should maintain its own navigation
  stack. Switching from Tab A to Tab B and back should return to Tab A's previous
  state (scroll position, sub-page).
- **Form state:** Navigating away from an in-progress form should either auto-save
  or prompt the user. Never silently discard input.
- **Scroll position:** Returning to a list should restore the previous scroll position.
  Infinite-scroll lists require careful state management to avoid content jumps.
- **Selection state:** Selected items in a list should persist when navigating to
  detail and back. Multi-select mode should survive orientation changes.

### 3.4 Back Navigation Behavior

| Platform | Back Mechanism | Expected Behavior |
|---|---|---|
| **iOS** | Swipe from left edge / back button | Pops the current view from the navigation stack. If at root, no action. |
| **Android** | System back button / gesture | Pops the current view. At root of a tab, switches to the start tab. At the start tab's root, exits the app. |
| **Web** | Browser back button | Navigates to the previous URL in browser history. SPAs must manage history.pushState correctly. |
| **Desktop** | Cmd/Ctrl+[ or back button | Varies by app. Should mirror the platform's web or native convention. |

**Android "exit through home" pattern:** When the user presses back on a non-start
tab, navigate to the start tab first, then exit the app on the next back press.
This creates predictable behavior regardless of which tab the user is on.

### 3.5 Edge Cases

**Deep nesting:** Users lose context after 3+ levels on mobile. Mitigation: use
breadcrumbs (web/desktop), show a persistent header with the parent context
(mobile), or flatten the hierarchy.

**Circular navigation:** Occurs when navigation paths form loops (A -> B -> C -> A).
This disorients users who rely on the back button. Prevention: ensure the back
button always pops the stack rather than pushing a new destination. Never link a
detail page back to itself or to a page that links back to it outside of the
normal stack.

**Dead ends:** Pages with no onward navigation and no clear way to return. Common
in confirmation pages ("Your order is placed" with no link to order details or
home). Fix: always provide at least two exits -- a primary action ("View Order")
and a secondary link ("Return to Home").

**Modal dead ends:** Full-screen modals on mobile that lack a close button or
have a close button only in a non-obvious location. Always include a visible
close affordance in a platform-standard position (top-left on iOS, top-right
on Android/web).

**Navigation during async operations:** If a user navigates away during a
background upload or save, the operation should continue. Use a persistent
indicator (toast, badge, or notification) to report completion.

---

## 4. Micro-Interactions

### 4.1 Tab Switching Animations

| Technique | Description | Best For |
|---|---|---|
| **Cross-fade** | Old content fades out, new content fades in simultaneously | Content-heavy tabs (feeds, lists) |
| **Slide** | Content slides horizontally in the direction of the selected tab | Adjacent tabs with spatial relationship |
| **No animation** | Instant swap | High-frequency switching (e.g., dev tools) |
| **Shared element transition** | A specific element morphs between views | Detail-to-detail navigation |

**Timing:** Tab content transitions should complete in 200-300ms. Use ease-out
(deceleration) curves for entering content and ease-in (acceleration) for exiting
content. Material Design recommends 300ms for standard transitions. Apple HIG
defaults to ~350ms for push/pop but tab switches are typically faster at ~250ms.

### 4.2 Active State Indication

| Indicator Type | Visual Treatment | Platform Precedent |
|---|---|---|
| **Filled icon** | Active = filled/solid; Inactive = outlined/stroke | Instagram, iOS tab bars |
| **Pill indicator** | Colored pill shape behind the active icon | Material Design 3 |
| **Underline** | Colored bar below the active tab label | Web top nav, Material tabs |
| **Background highlight** | Subtle background color on active item | Sidebar navigation (Linear, Notion) |
| **Color change** | Active icon/label uses brand or accent color | Cross-platform standard |
| **Weight change** | Active label uses bold/semibold; inactive uses regular | Supplemental to other indicators |

**Best practice:** Combine at least two indicators (e.g., filled icon + color change)
to ensure the active state is perceivable by users with color vision deficiency.

### 4.3 Transition Timing Reference

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Tab switch (content swap) | 200-300ms | ease-out | Avoid slide for non-adjacent tabs |
| Page push (drill down) | 300-350ms | ease-in-out | Match platform default |
| Page pop (back) | 250-300ms | ease-in-out | Slightly faster than push feels snappier |
| Sidebar expand/collapse | 200-250ms | ease-out | Use transform, not width animation |
| Drawer open | 250-300ms | ease-out (deceleration) | Scrim fades in simultaneously |
| Drawer close | 200-250ms | ease-in (acceleration) | Faster close feels responsive |
| Dropdown menu open | 150-200ms | ease-out | Stagger items by 30-50ms for polish |
| Breadcrumb hover underline | 150ms | ease-in-out | Subtle, not distracting |

**Performance rule:** Only animate `transform` and `opacity` properties. These are
GPU-composited and avoid layout recalculation. Animating `width`, `height`, `top`,
or `left` causes layout thrashing and jank, especially on lower-end devices.

### 4.4 Haptic Feedback

- **iOS:** Use light impact feedback (UIImpactFeedbackGenerator) on tab selection.
  Use selection feedback for scrolling through picker-style navigation.
- **Android:** Use HapticFeedbackConstants.CLOCK_TICK for tab selection.
- **When to skip:** Rapid repeated navigation (e.g., swiping through pages). Haptics
  on every scroll event is overwhelming.

---

## 5. Anti-Patterns

### 5.1 Hamburger Menu as Primary Navigation

**Problem:** Hiding primary navigation behind a hamburger icon reduces discoverability
by over 20% (NNGroup research, 179 participants). Users on desktop engaged with
hidden navigation only 27% of the time.

**Fix:** Use a bottom tab bar on mobile. Use a visible sidebar or top nav on desktop.
Reserve the hamburger for secondary navigation or settings.

### 5.2 Too Many Navigation Levels

**Problem:** More than 3 levels on mobile (or 4 on desktop) creates cognitive overload.
Users lose their sense of position and cannot predict what the back button will do.

**Fix:** Flatten the hierarchy. Use search, filters, and tags to surface deep content
without requiring deep drilling. If depth is unavoidable, use breadcrumbs (desktop)
or persistent context headers (mobile).

### 5.3 Inconsistent Back Behavior

**Problem:** The back button sometimes pops the stack, sometimes navigates to a
different section, sometimes closes a modal. Users cannot build a reliable mental
model.

**Fix:** Back always reverses the most recent navigation action. Modals use a
separate close/dismiss action (X button), not the back button on Android. On web,
ensure `history.pushState` is called correctly so the browser back button works
predictably.

### 5.4 Hidden Navigation on Desktop

**Problem:** Collapsing navigation into a hamburger on desktop when there is ample
screen real estate. This adds unnecessary interaction cost.

**Fix:** Always show navigation on screens wider than 1024px. Use a collapsible
sidebar that defaults to expanded on desktop.

### 5.5 Icon-Only Navigation Without Labels

**Problem:** Users cannot reliably identify navigation destinations from icons alone,
except for universally understood icons (home, search, profile). Custom or abstract
icons require labels.

**Fix:** Always pair icons with text labels in primary navigation. Icon-only is
acceptable only for well-established patterns (e.g., a sidebar collapse toggle)
or when a tooltip is always available on hover (desktop only).

### 5.6 More Than 5 Bottom Tabs

**Problem:** Cramming 6+ tabs into a mobile bottom bar makes tap targets too small
(below the 44x44pt iOS / 48x48dp Android minimum) and overwhelms users with choices.

**Fix:** Limit to 5 tabs maximum. Move lower-priority destinations to a "More" tab,
a profile/settings screen, or a navigation drawer.

### 5.7 Navigation That Changes Based on Context

**Problem:** Global navigation items that appear, disappear, or reorder based on the
current screen. Users rely on spatial memory to find navigation items.

**Fix:** Global navigation must be structurally identical on every screen. Only
the active state should change. Contextual navigation belongs in local navigation
(sub-tabs, toolbars), not in the global shell.

### 5.8 Jailbreak Navigation (Breaking the Stack)

**Problem:** Pushing a view that logically belongs to a different tab onto the current
tab's stack. Example: tapping a user profile in a messaging tab pushes a profile
view that "feels" like it should be in the profile tab.

**Fix:** If cross-tab navigation is necessary, switch to the destination tab and
push onto that tab's stack. Or open the content in a modal/sheet that overlays
the current tab without disrupting its stack.

### 5.9 Dead-End Pages

**Problem:** Confirmation pages, error pages, or empty states that offer no onward
navigation. Users are stranded.

**Fix:** Every page must have at least one clear exit. Confirmation pages should
offer "View Details" and "Return Home." Error pages should offer retry and a path
to a known good state. Empty states should offer an action to create content.

### 5.10 Swipe Conflicts

**Problem:** Swipe-to-go-back conflicts with in-page carousels or swipe-to-delete.
**Fix:** Use edge-initiated swipe (first 20px from screen edge) for back navigation.
Disable back-swipe on screens with critical horizontal gestures.

### 5.11 Auto-Hiding Navigation Without Recovery

**Problem:** Nav bar hides on scroll and only reappears at scroll-to-top.
**Fix:** Reveal navigation on any upward scroll, not just scroll-to-top.

### 5.12 Inconsistent Navigation Across Platforms

**Problem:** Different primary nav patterns on iOS vs. Android creates friction.
**Fix:** Converge on a unified pattern. Airbnb moved Android from a left drawer
to bottom tabs matching iOS for cross-platform consistency.

### 5.13 Pagination Instead of Continuity

**Problem:** Numbered pages for content feeds force repeated "Next" clicks.
**Fix:** Use infinite scroll or "Load More" for feeds. Reserve pagination for
structured data tables.

---

## 6. Accessibility Requirements

### 6.1 Keyboard Navigation

Navigation must be fully operable without a mouse or touch input.

| Key | Action |
|---|---|
| **Tab** | Move focus to the next interactive element in the navigation |
| **Shift+Tab** | Move focus to the previous interactive element |
| **Enter / Space** | Activate the focused navigation item |
| **Arrow Left/Right** | Move between sibling tabs or menu items (within a tab list) |
| **Arrow Up/Down** | Move between items in vertical menus or dropdowns |
| **Escape** | Close an open dropdown, submenu, or drawer |
| **Home / End** | Jump to the first / last item in a menu |

**Tab list pattern (WAI-ARIA):** Only the active tab should be in the tab order
(`tabindex="0"`). Other tabs should have `tabindex="-1"`. Arrow keys move focus
between tabs. This is the "roving tabindex" pattern.

### 6.2 Skip Navigation Links

WCAG 2.4.1 (Bypass Blocks) requires a mechanism to skip repetitive navigation.

- Place a "Skip to main content" link as the first focusable element on every page.
- The link can be visually hidden by default but must become visible on focus.
- The link target should be the `<main>` element or a container with
  `id="main-content"`.
- In SPAs, skip links must remain functional after client-side route changes.

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<!-- ... navigation ... -->
<main id="main-content" tabindex="-1">
  <!-- Page content -->
</main>
```

The `tabindex="-1"` on `<main>` allows it to receive programmatic focus without
being in the natural tab order.

### 6.3 ARIA Landmarks

Use semantic HTML elements with implicit ARIA roles. Explicit ARIA roles are
only needed when semantic elements cannot be used.

| HTML Element | Implicit ARIA Role | Purpose |
|---|---|---|
| `<nav>` | `navigation` | Wraps navigation links |
| `<main>` | `main` | Primary content area |
| `<header>` | `banner` | Site-wide header (when child of `<body>`) |
| `<footer>` | `contentinfo` | Site-wide footer (when child of `<body>`) |
| `<aside>` | `complementary` | Sidebar or supplemental content |
| `<form>` | `form` | When given an accessible name |
| `<section>` | `region` | When given an accessible name |

**Multiple `<nav>` elements:** If a page has more than one navigation region
(e.g., primary nav and footer nav), label each with `aria-label`:

```html
<nav aria-label="Primary">...</nav>
<nav aria-label="Footer">...</nav>
```

Screen reader users can press a single key to cycle through landmarks, making
it critical that landmarks are correctly labeled and not overused.

### 6.4 Screen Reader Announcements on Navigation

When the page or view changes in an SPA, screen readers must be informed:

- **Route change announcement:** Use an `aria-live="polite"` region to announce
  the new page title. Alternatively, update `document.title` and move focus to
  the `<h1>` of the new page.
- **Focus management:** After a route change, move focus to the main content area
  or the `<h1>` heading. This prevents screen reader users from being stranded at
  the top of the DOM after a navigation event.
- **Loading states:** If navigation triggers a loading state, announce "Loading"
  via aria-live. When content is ready, announce the page title and move focus.

```javascript
// Example: SPA route change focus management
function onRouteChange(newTitle) {
  document.title = newTitle;
  const heading = document.querySelector('main h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
}
```

### 6.5 Current Page Indication

The active navigation item must be programmatically indicated, not just visually:

- Use `aria-current="page"` on the link to the current page.
- For tab-based navigation, use `role="tablist"` on the container, `role="tab"`
  on each tab, and `aria-selected="true"` on the active tab.

```html
<nav aria-label="Primary">
  <a href="/home" aria-current="page">Home</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
</nav>
```

### 6.6 Touch Target Sizes

- **WCAG 2.5.8 (AAA):** Minimum target size of 24x24 CSS pixels.
- **WCAG 2.5.5 (AAA) / best practice:** 44x44 CSS pixels.
- **Apple HIG:** Minimum 44x44 points.
- **Material Design:** Minimum 48x48 dp.
- Ensure adequate spacing between navigation items to prevent accidental activation.

### 6.7 Motion and Reduced Motion

Respect the user's `prefers-reduced-motion` media query:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Navigation transitions should gracefully degrade to instant swaps when reduced
motion is preferred. Never gate functionality behind an animation.

---

## 7. Cross-Platform Adaptation

### 7.1 iOS

| Component | Usage |
|---|---|
| **Tab Bar** (bottom) | 3-5 top-level destinations. Standard for iPhone. |
| **Navigation Bar** (top) | Title, back button, and action items for the current screen. |
| **Sidebar** | iPad primary navigation (replaces tab bar on wide screens). |
| **Search Bar** | Integrated into navigation bar or as a tab destination. |

**Key conventions:**
- Back button appears in the top-left with the previous screen's title as the label.
- Swipe from left edge to go back (interruptible gesture).
- Tab bar uses filled/outlined icon pairs for active/inactive states.
- Large titles collapse on scroll for a dynamic, spacious feel.

### 7.2 Android

| Component | Usage |
|---|---|
| **Bottom Navigation Bar** | 3-5 primary destinations. Standard for phones. |
| **Navigation Rail** | 3-7 destinations on tablets and foldables (collapsed or expanded). |
| **Top App Bar** | Title, navigation icon, and action items. |
| **Navigation Drawer** | Being deprecated in M3 Expressive; use expanded rail instead. |

**Key conventions:**
- System back gesture (swipe from either edge) or back button.
- Predictive back animation (Android 14+) shows a preview of the previous screen.
- Top app bar scrolls off screen (standard) or stays pinned (prominent).
- FAB can be integrated into the navigation rail.

### 7.3 Web

| Component | Usage |
|---|---|
| **Top Navigation Bar** | Horizontal bar with dropdowns. Standard for marketing sites. |
| **Sidebar** | Persistent or collapsible. Standard for web apps and dashboards. |
| **Breadcrumbs** | Hierarchical wayfinding for content-heavy sites. |
| **Mega Menu** | Large dropdown panels for sites with many categories (e-commerce). |

**Key conventions:**
- Logo in top-left links to homepage.
- Active page indicated by underline, color change, or bold text.
- Sticky navigation on scroll (top bar or sidebar).
- Responsive breakpoints: top nav collapses to hamburger below ~768px.
  Consider bottom tab bar for mobile web apps (progressive web apps).

### 7.4 Desktop (Native Applications)

| Component | Usage |
|---|---|
| **Sidebar + Top Bar** | Standard for productivity apps (VS Code, Slack, Figma). |
| **Menu Bar** | macOS/Windows native menu bar for less-frequent actions. |
| **Command Palette** | Cmd+K / Ctrl+K for keyboard-driven navigation. |
| **Tab Strip** | Browser-style tabs for multi-document interfaces. |

**Key conventions:**
- Sidebar is the primary navigation, always visible by default.
- Top bar contains search, notifications, and user profile.
- Keyboard shortcuts for all primary navigation destinations.
- Window management (split views, detachable panels) as supplemental navigation.

### 7.5 Responsive Adaptation Strategy

```
Screen Width          Navigation Pattern
-----------------     ----------------------------------
< 600px (phone)       Bottom tab bar (3-5 tabs)
600-840px (tablet)    Navigation rail (collapsed)
840-1200px (tablet)   Navigation rail (expanded) or sidebar
> 1200px (desktop)    Full sidebar + top bar
```

**The adaptation principle:** Do not simply hide desktop navigation behind a hamburger
on mobile. Restructure navigation to match each form factor's interaction model.
Bottom tab bars for thumb-driven phones; sidebars for pointer-driven desktops; rails
for the in-between.

---

## 8. Decision Tree

Use this decision tree to select the appropriate navigation pattern:

```
START: How many primary destinations?
|
+-- 1-2 destinations
|   |
|   +-- Is it a linear flow? --> STEPPER / WIZARD
|   +-- Is it a toggle? -------> SEGMENTED CONTROL / TOGGLE
|
+-- 3-5 destinations
|   |
|   +-- What platform?
|   |   |
|   |   +-- Mobile (iOS/Android) --> BOTTOM TAB BAR
|   |   +-- Tablet ----------------> NAVIGATION RAIL
|   |   +-- Desktop/Web -----------> TOP NAV BAR or SIDEBAR
|   |
|   +-- Are destinations equally important?
|       |
|       +-- Yes --> BOTTOM TAB BAR (mobile) / TOP NAV (web)
|       +-- No ---> Promote top 3-4 to tabs; demote others to profile/settings
|
+-- 6-10 destinations
|   |
|   +-- What platform?
|   |   |
|   |   +-- Mobile --> BOTTOM TAB BAR (top 5) + "More" tab or profile menu
|   |   +-- Tablet --> NAVIGATION RAIL (expanded)
|   |   +-- Desktop -> SIDEBAR (collapsible)
|   |   +-- Web -----> SIDEBAR or TOP NAV with DROPDOWNS
|   |
|   +-- Is content hierarchical?
|       |
|       +-- Yes --> SIDEBAR with accordion/tree + BREADCRUMBS
|       +-- No ---> SIDEBAR with flat list + SEARCH
|
+-- 10+ destinations
    |
    +-- SIDEBAR (with sections, search, and collapsible groups)
    +-- Add COMMAND PALETTE (Cmd+K) as supplemental navigation
    +-- Consider SEARCH as a primary navigation method

SUPPLEMENTAL QUESTIONS:
|
+-- Is the content deeply hierarchical (3+ levels)?
|   +-- Add BREADCRUMBS (web/desktop)
|   +-- Use persistent CONTEXT HEADERS (mobile)
|
+-- Do users perform multi-step tasks?
|   +-- Add STEPPER within the content area
|
+-- Are power users a primary audience?
|   +-- Add COMMAND PALETTE and KEYBOARD SHORTCUTS
|
+-- Does the app have user-generated content structure?
    +-- Use ACCORDION SIDEBAR (like Notion) for user-defined hierarchy
```

---

## 9. Quick Reference Checklist

Use this checklist when designing or reviewing navigation:

### Structure
- [ ] Primary destinations limited to 3-5 for mobile, 5-8 for desktop
- [ ] Navigation hierarchy does not exceed 3 levels on mobile
- [ ] Every page has at least one clear exit (no dead ends)
- [ ] Global navigation is consistent across all screens (no contextual changes)
- [ ] Back button behavior is predictable and stack-based
- [ ] Deep links construct a synthetic back stack to the root

### Visual Design
- [ ] Active state uses at least two visual indicators (icon + color, underline + weight)
- [ ] Navigation labels are concise, concrete nouns or verbs
- [ ] Icons are paired with text labels in primary navigation
- [ ] Touch targets meet minimum size (44x44pt iOS, 48x48dp Android, 24x24px WCAG)
- [ ] Sufficient contrast between active and inactive states (4.5:1 for text)

### Interaction
- [ ] Tab switching animations complete in 200-300ms
- [ ] Only `transform` and `opacity` are animated (GPU-composited)
- [ ] Each tab preserves its own navigation stack and scroll position
- [ ] Form state is preserved or saved when navigating away
- [ ] Navigation hides on scroll-down and reappears on any scroll-up
- [ ] Haptic feedback on tab selection (mobile, where appropriate)

### Accessibility
- [ ] Skip navigation link is the first focusable element
- [ ] All navigation regions use `<nav>` with descriptive `aria-label`
- [ ] Active page marked with `aria-current="page"`
- [ ] Tab list uses `role="tablist"` / `role="tab"` / `aria-selected`
- [ ] Keyboard navigation works: Tab, Arrow keys, Enter, Escape
- [ ] Focus moves to main content on route change (SPA)
- [ ] Page title updates on route change
- [ ] `prefers-reduced-motion` is respected

### Cross-Platform
- [ ] Mobile uses bottom tab bar (not hamburger for primary nav)
- [ ] Tablet uses navigation rail or sidebar
- [ ] Desktop uses sidebar or top nav (always visible)
- [ ] Responsive breakpoints adapt the navigation pattern, not just hide it
- [ ] Platform-specific back behavior is respected (swipe on iOS, system back on Android)

### Content
- [ ] Breadcrumbs show the current page (non-linked)
- [ ] Search is available as supplemental navigation
- [ ] Empty states include navigation guidance (not blank pages)
- [ ] Error pages provide navigation to a known good state

---

## References

### Platform Guidelines
- Apple HIG: Navigation and Search -- developer.apple.com/design/human-interface-guidelines/navigation-and-search
- Apple HIG: Tab Bars -- developer.apple.com/design/human-interface-guidelines/tab-bars
- Material Design 3: Navigation Bar -- m3.material.io/components/navigation-bar/guidelines
- Material Design 3: Navigation Rail -- m3.material.io/components/navigation-rail/guidelines
- Android Developers: Principles of Navigation -- developer.android.com/guide/navigation/principles

### Research
- NNGroup: Hamburger Menus and Hidden Navigation Hurt UX Metrics -- nngroup.com/articles/hamburger-menus/
- NNGroup: Beyond the Hamburger -- nngroup.com/articles/find-navigation-mobile-even-hamburger/
- NNGroup: Basic Patterns for Mobile Navigation -- nngroup.com/articles/mobile-navigation-patterns/
- NNGroup: Menu Design Checklist (17 UX Guidelines) -- nngroup.com/articles/menu-design/
- NNGroup: Breadcrumbs (11 Design Guidelines) -- nngroup.com/articles/breadcrumbs/

### Accessibility Standards
- W3C WAI-ARIA: Navigation Role -- developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/navigation_role
- WebAIM: Skip Navigation Links -- webaim.org/techniques/skipnav/
- WCAG 2.2: SC 2.4.1 Bypass Blocks, SC 2.5.8 Target Size (Minimum)

### Industry Analysis
- Smashing Magazine: The Golden Rules of Bottom Navigation Design -- smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/
- Smashing Magazine: Decision Trees for UI Components -- smashingmagazine.com/2024/05/decision-trees-ui-components/
- Linear Blog: How We Redesigned the Linear UI -- linear.app/now/how-we-redesigned-the-linear-ui
