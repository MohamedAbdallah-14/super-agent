# Tablet Design — Platform Module

> **Module type:** Platform
> **Scope:** Design guidelines for tablet form factors including iPad, Android tablets, foldables, and ChromeOS devices
> **References:** Apple iPadOS Human Interface Guidelines, Material Design 3 Large Screens, Android Adaptive App Quality Guidelines
> **Last updated:** 2026-03-07

---

## Table of Contents

1. [Platform Design Language](#1-platform-design-language)
2. [Layout & Navigation Patterns](#2-layout--navigation-patterns)
3. [Component Conventions](#3-component-conventions)
4. [Typography & Spacing System](#4-typography--spacing-system)
5. [Common Mistakes](#5-common-mistakes)
6. [Checklist](#6-checklist)

---

## 1. Platform Design Language

### 1.1 Tablet as a Unique Form Factor

A tablet is not a big phone and not a small desktop. It occupies a distinct position in
the device spectrum that demands its own design thinking. Tablets are typically held
with two hands or propped on a surface, used for longer sessions than phones, and
support richer input modalities (touch, stylus, keyboard, trackpad). Users expect
tablet apps to take advantage of the larger canvas for productivity, media
consumption, and creative work.

**Key distinctions from phones:**
- Screen real estate enables multi-column layouts and simultaneous content display
- Users hold tablets farther from their eyes than phones (approximately arm's length)
- Sessions tend to be longer and more focused (couch, desk, or travel scenarios)
- External input devices (keyboard, trackpad, mouse, stylus) are common
- Landscape orientation is used as frequently as portrait, unlike phones

**Key distinctions from desktops:**
- Touch remains the primary input modality even when keyboard is attached
- Screen sizes are smaller (typically 8-13 inches vs 13+ inches for laptops)
- Apps run in managed window environments, not free-form desktop windows (though iPadOS Stage Manager is narrowing this gap)
- Portability means context-switching between held, propped, and docked usage

### 1.2 iPadOS Design Philosophy

Apple positions the iPad as a versatile device for productivity, creativity, and media
consumption. The iPadOS design language emphasizes:

**Multitasking as a core capability:**
- Split View allows two apps side by side (50/50 or 66/33 split)
- Slide Over provides a narrow floating app panel over the primary app
- iPadOS 26 introduced windowed apps with Stage Manager, enabling desktop-style window management with resize handles, a menu bar, and familiar close/minimize/full-screen controls
- Every app that supports multitasking shows a resize handle in the bottom-right corner
- Apps must gracefully adapt to all these presentation modes

**Apple Pencil integration:**
- Apple Pencil hover activates when the nib is within 12mm of the display (iPad Pro M2+)
- Hover uses existing UIPointerInteraction and UIHoverGestureRecognizer APIs, so apps that support trackpad pointer interaction get Pencil hover for free
- Developers can customize hover behavior: tool previews, menu highlighting, line previews, pressure-sensitive previews
- Pencil supports tilt, pressure, and azimuth for drawing and annotation apps
- Double-tap gesture on Apple Pencil 2 for tool switching

**Liquid Glass design system (iPadOS 26+):**
- Sidebars are inset and built with Liquid Glass, allowing content to flow behind them
- Tab bars and sidebars float above app content using translucent materials
- The design creates a more immersive, layered visual experience
- Navigation elements feel lighter and less obstructive

**Content-first philosophy:**
- The larger screen should reveal more content, not just bigger controls
- Toolbars and navigation should minimize their footprint
- Full-screen immersive experiences are encouraged for media and creative apps
- The readable content guide constrains text to approximately 672 points wide, inset 176 points from view edges

*Reference: [Designing for iPadOS — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados)*

### 1.3 Android Tablet and Foldable Design

Google's approach to tablet design centers on Material Design 3 canonical layouts
and the adaptive design framework introduced with Android 12L and refined through
subsequent releases.

**Material 3 canonical layouts:**
Three standard layout patterns serve as the foundation for tablet UI:

1. **List-Detail** — A list pane alongside a detail pane. Ideal for email, messaging,
   file browsers, and any content that involves browsing and selecting items.
2. **Supporting Pane** — A primary content area with a secondary pane that provides
   contextual information or tools. Useful for document editors, maps with info
   panels, and media players with metadata.
3. **Feed** — A grid or column-based composition for browsing content such as news,
   photos, and social media. Uses a responsive grid that adapts column count to
   available width.

These layouts adapt across all window size classes (compact, medium, expanded,
large, extra-large) and work on phones, tablets, foldables, and ChromeOS devices.

**Window size classes (width breakpoints):**
| Class        | Width Range      | Typical Devices                           |
|--------------|------------------|-------------------------------------------|
| Compact      | < 600dp          | Phone portrait                            |
| Medium       | 600dp - 839dp    | Tablet portrait, foldable portrait        |
| Expanded     | 840dp - 1199dp   | Tablet landscape, foldable landscape      |
| Large        | 1200dp - 1599dp  | Desktop, large tablet landscape           |
| Extra-Large  | >= 1600dp        | Ultra-wide, connected displays            |

**Android 16+ requirements (effective 2025-2026):**
- Apps targeting API level 36 must support all orientations and aspect ratios on large screen devices (smallest width >= 600dp)
- App resizability is the baseline expectation
- Google Play will require API 36 targeting as of August 2026

**Visual grouping and containment:**
- Larger screens can create visual noise from increased visible content
- Use visual grouping principles (cards, containers, dividers) to organize related elements
- Maintain maximum line length of approximately 60 characters for readability

*Reference: [Material Design 3 — Canonical Layouts](https://m3.material.io/foundations/layout/canonical-layouts/overview), [Android Large Screen Quality](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)*

### 1.4 Content-First Design for Larger Screens

The additional screen real estate on tablets should serve the content, not the chrome.

**Principles:**
- Show more content rather than scaling up phone layouts with empty space
- Use multi-pane layouts to reduce navigation depth (show list and detail simultaneously)
- Present richer previews, larger images, and more context inline
- Allow direct manipulation and editing without navigating to separate screens
- Use the extra space for productivity features: toolbars, inspectors, side panels
- Avoid centering small content blocks in large expanses of whitespace

**Content density considerations:**
- Tablets support higher information density than phones but lower than desktops
- Group related information visually using cards, sections, or columns
- Maintain comfortable reading line lengths (50-75 characters, 60 optimal)
- Use progressive disclosure — show summaries in the list pane, full content in detail

---

## 2. Layout & Navigation Patterns

### 2.1 iPad: Sidebar + Content

The primary navigation pattern on iPad is the sidebar combined with a content area,
implemented via UISplitViewController (UIKit) or NavigationSplitView (SwiftUI).

**Sidebar behavior:**
- A sidebar appears on the leading side and lets users navigate between app sections
- Sidebars are ideal for apps with complex content hierarchies (Mail, Files, Music)
- In iPadOS 26+, sidebars use Liquid Glass and float above content
- Sidebars can be toggled visible/hidden, and the content area adjusts accordingly
- In compact width (portrait or Slide Over), the sidebar collapses into a tab bar

**Tab bar adaptation:**
- By adopting UITab and UITabGroup, apps get automatic adaptivity: tab bar in compact width, sidebar in regular width
- On iPad, the tab bar floats above content using Liquid Glass material
- Users can switch between tab bar and sidebar presentation
- The tab bar on iPad uses a horizontal layout with larger labels (13pt vs 10pt on iPhone)
- Tab bars support up to 5-7 primary destinations

**Split view configurations:**
- Two-column: sidebar + detail (most common)
- Three-column: sidebar + supplementary + detail (for complex apps like Mail)
- Column widths adapt based on available space and orientation
- In portrait, the sidebar may overlay the content or be hidden behind a toggle

*Reference: [Sidebars — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Tab Bars — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars)*

### 2.2 Android: Navigation Rail and Canonical Layouts

**Navigation Rail:**
- A vertical strip of navigation destinations placed along the leading edge of the screen
- Default width: 80dp (Material Design 2) or 96dp (Material Design 3)
- Supports 3-7 destinations plus an optional floating action button (FAB) at the top
- Replaces the bottom navigation bar when the window width is medium (>= 600dp) or larger
- On compact screens, the navigation rail converts to a bottom navigation bar
- Navigation rails let users switch between top-level views while keeping the navigation accessible and compact

**Canonical layout implementation:**

**List-Detail:**
- On medium/expanded screens: side-by-side panes with the list occupying roughly 1/3 width
- On compact screens: single-pane with back navigation between list and detail
- The list pane width should be sufficient to display meaningful list items (typically 300-400dp)
- The detail pane fills the remaining space

**Supporting Pane:**
- Primary pane occupies the majority of the window (roughly 2/3)
- Supporting pane provides contextual tools, metadata, or related content
- On compact screens, the supporting pane may move below the primary content or become a bottom sheet

**Feed:**
- Uses a responsive grid that adjusts column count based on available width
- Cards or tiles maintain consistent aspect ratios while reflowing
- On compact screens: single column; on medium: 2 columns; on expanded: 3+ columns

**Navigation Drawer:**
- For apps with more than 7 destinations, a persistent or modal navigation drawer replaces the rail
- On large screens, a persistent drawer (256dp wide) can coexist with content
- On medium screens, a modal drawer overlays the content when opened

*Reference: [Navigation Rail — Material Design 3](https://m3.material.io/components/navigation-rail/guidelines), [Canonical Layouts — Android Developers](https://developer.android.com/guide/topics/large-screens/large-screen-canonical-layouts)*

### 2.3 Split-Screen and Multitasking Layout Considerations

When an app runs alongside another app in split-screen mode, it may receive
significantly less width than full-screen. Designs must handle this gracefully.

**iPad multitasking modes:**
- **Split View 50/50:** Each app gets roughly half the screen. A 12.9" iPad Pro in landscape gives each app about 682pt width (similar to a phone in landscape)
- **Split View 66/33:** The primary app gets about 2/3 of the screen. The secondary app gets a phone-like compact width
- **Slide Over:** The floating panel is approximately 320pt wide — essentially phone-sized
- **Stage Manager windows:** Apps can be freely resized, requiring truly responsive layouts that work at any dimension
- **Picture in Picture:** Video content can float in a small overlay while the user works in another app

**Android multi-window:**
- Split-screen mode gives each app half the display (or custom split ratios)
- Apps must handle any width between their minimum and maximum supported sizes
- Free-form window mode (on ChromeOS and some tablets) allows arbitrary sizing
- Starting with Android 16, resizability is mandatory for large-screen devices

**Design implications:**
- Never assume your app will have the full screen width
- Test layouts at multiple widths, including very narrow (320dp) and very wide (1200dp+)
- Use responsive breakpoints to switch between single-column and multi-column layouts
- Ensure critical controls and content remain accessible at all sizes
- Avoid fixed-width layouts that break at unexpected dimensions

### 2.4 Landscape vs Portrait Design

Both orientations must work well on tablets. Unlike phones where portrait dominates,
tablets are frequently used in landscape — especially with keyboard accessories.

**Landscape priorities:**
- This is the primary productivity orientation, often used with keyboard and trackpad
- Favor horizontal layouts: sidebar + content, list-detail split views
- Navigation rails and sidebars work naturally in landscape
- Wider content areas enable multi-column text and side-by-side comparisons
- Toolbars can be more expansive, showing labels alongside icons

**Portrait priorities:**
- Common for reading, casual browsing, and hand-held use
- Sidebars typically collapse or become overlays
- Tab bars move to the bottom for ergonomic thumb reach
- Single-column layouts are often appropriate, but 2-column layouts can still work on larger tablets (12.9" iPad Pro is 1024pt wide in portrait)
- Vertical scrolling becomes the primary navigation model

**Transition handling:**
- Layout changes between orientations must be smooth and preserve user state
- Scroll position, selection state, and form input must survive rotation
- Avoid jarring content reflows — use animation to guide the user's eye
- On iPad, the readable content guide automatically adjusts width based on orientation

### 2.5 Foldable Considerations

Foldable devices introduce unique form factors that require fold-aware design.

**Postures:**

| Posture    | Hinge Position | Description                                     | Use Cases                              |
|------------|----------------|-------------------------------------------------|----------------------------------------|
| Flat       | Fully open     | Device is fully unfolded, functions like a tablet| Standard tablet usage                  |
| Tabletop   | Horizontal     | Device rests on surface, half-opened             | Video calls, media playback, camera    |
| Book       | Vertical       | Device half-opened like a book                   | Reading, two-page layouts, dual-pane   |
| Folded     | Closed         | Cover screen only                                | Notifications, quick interactions      |

**Fold-aware layout guidelines:**
- Use the Jetpack WindowManager library to detect fold state and hinge position
- The FoldingFeature API provides the bounding rectangle of the fold/hinge within the window
- Never place critical interactive elements across or too close to the fold/hinge area
- Use the fold as a natural content separator — split content into two logical areas

**Tabletop mode design:**
- Split the UI into an upper viewing area and a lower control area
- Upper half: video, camera viewfinder, or content display
- Lower half: controls, comments, chat, or navigation
- This mirrors how a laptop separates screen from keyboard

**Book mode design:**
- Split content into left and right panes along the vertical fold
- Ideal for e-readers (two-page spread), comparison views, and reference layouts
- Each pane should be independently scrollable when appropriate
- Respect the physical gap/hinge — do not render content across the fold line

**Continuity principles:**
- Preserve user state when the device posture changes (fold/unfold)
- Content visible on the cover screen should remain accessible when unfolded
- Avoid restarting activities or losing scroll position during posture transitions
- Provide seamless app continuity between inner and outer displays

*Reference: [Learn About Foldables — Android Developers](https://developer.android.com/guide/topics/large-screens/learn-about-foldables), [Make Your App Fold Aware — Android Developers](https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/make-your-app-fold-aware)*

### 2.6 Multi-Column Layouts

Multi-column layouts are the most significant differentiator between tablet and phone
design. Using the extra width effectively is what separates a good tablet app from a
stretched phone app.

**Column strategies by device width:**

| Width Class    | Columns | Grid System                       | Typical Use                        |
|----------------|---------|-----------------------------------|------------------------------------|
| Compact (<600) | 1       | 4-column grid, 16dp margins       | Phone, Slide Over                  |
| Medium (600+)  | 1-2     | 8-column grid, 24dp margins       | Tablet portrait, foldable          |
| Expanded (840+)| 2-3     | 12-column grid, 24-32dp margins   | Tablet landscape, desktop          |
| Large (1200+)  | 2-3     | 12-column grid, 32dp+ margins     | Large tablet landscape, desktop    |

**Implementation patterns:**
- Use percentage-based column widths rather than fixed pixel values
- Set maximum content width to prevent text lines from becoming too long (typically 800-1200px or 672pt for Apple's readable content guide)
- Allow columns to reflow between 1, 2, and 3 columns based on available width
- In a 2-column layout, the primary column typically occupies 60-67% width
- In a 3-column layout: navigation (20-25%) + content (40-50%) + detail (25-35%)

**Content reflow rules:**
- Cards and grid items should maintain consistent aspect ratios while reflowing
- Avoid orphaned single items in the last row of a grid
- Use staggered grids for variable-height content (photos, social media)
- Column gutters should be 16-24dp (compact) or 24-32dp (expanded)

---

## 3. Component Conventions

### 3.1 Popovers vs Full-Screen Sheets

The same action that triggers a full-screen sheet on iPhone should typically use a
popover or form sheet on iPad.

**iPad (regular width):**
- Popovers: Small, arrow-anchored views that float over content. Used for quick
  selections, color pickers, formatting options, and date pickers. Dismissed by tapping
  outside. Anchor the popover arrow to the control that triggered it.
- Form sheets: Centered modal views that dim the background. Used for multi-step
  tasks, complex forms, settings. Narrower than full screen, allowing the parent
  content to remain partially visible for context.
- Page sheets: Similar to form sheets but taller, covering more of the screen.
  Appropriate for content that benefits from more vertical space.

**iPhone (compact width):**
- The same view controller presented as a popover or form sheet on iPad automatically
  adapts to a full-screen or card-style sheet on iPhone
- This adaptive behavior is built into UIKit via UIAdaptivePresentationControllerDelegate
- Bottom sheets (half-sheet detents) are common on iPhone for quick selections

**Design rules:**
- Use sheets for non-immersive tasks that don't require the full screen
- Use full-screen modals only for immersive content (video, camera, photos) or complex multi-step flows
- On iPad, avoid full-screen modals for simple tasks — they feel excessive on larger screens
- Popovers should not exceed approximately 400pt width or 600pt height
- Always provide a clear dismiss action (done button, cancel button, or tap-outside)

*Reference: [Sheets — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sheets)*

### 3.2 Context Menus and Hover States

Tablets increasingly support precision input via trackpad, mouse, and stylus, making
context menus and hover states important design considerations.

**Context menus (long-press / right-click):**
- On iPadOS, context menus appear on long-press (touch) or secondary click (trackpad/mouse)
- Context menus can include actions, previews, and nested submenus
- Always make context menu items available elsewhere in the main interface (toolbar, action sheet) — context menus are a shortcut, not the only path
- Consider using context menus to let users create new objects or perform bulk actions
- iPadOS displays a flat list of items per category in the keyboard shortcut overlay, so provide descriptive titles with sufficient context

**Hover states (trackpad, mouse, Apple Pencil):**
- When a trackpad or mouse is connected, interactive elements should provide visual hover feedback
- UIPointerInteraction provides the system hover effect (highlight, lift, morph) on iPadOS
- Apple Pencil hover (12mm above display) uses the same UIPointerInteraction APIs
- Hover states help communicate interactivity and provide spatial orientation
- Do not rely on hover for essential functionality — touch users will not see hover states
- Use hover to reveal secondary information, preview content, or highlight drop targets

**Android considerations:**
- Material Design supports hover states for mouse and stylus input
- Ripple effects serve as the primary interaction feedback on touch
- ChromeOS devices with mice benefit from hover state implementation
- Right-click context menus should be supported when a mouse is connected

### 3.3 Drag and Drop

Drag and drop is a first-class interaction pattern on iPad and should be supported for
any app that handles content like text, images, files, or structured data.

**iPad drag and drop:**
- Users can drag content within an app or between apps (cross-app drag and drop)
- Long-press lifts an item, then the user can drag it to a target location
- Multiple items can be collected by tapping additional items while dragging
- Visual feedback must clearly indicate draggable items and valid drop targets
- During drag, the source content should remain visible (not disappear)
- Spring-loading: hovering over a navigation element during drag should activate it (open a folder, switch tabs)

**Content types for drag and drop:**
- Text selections (plain text and rich text)
- Images and photos
- Files and documents
- URLs and links
- Custom data types via NSItemProvider

**Design guidelines:**
- Make all selectable and editable content draggable
- Provide clear visual lift animation when drag begins
- Highlight valid drop zones with color change or border indication
- Show a preview of the content being dragged (badge with count for multiple items)
- Support both move and copy semantics (copy is default for cross-app)
- On Android, implement View.OnDragListener for drag-and-drop support

*Reference: [Drag and Drop — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop)*

### 3.4 Keyboard Shortcuts with External Keyboard

Many tablet users attach external keyboards, and apps should provide keyboard
shortcuts for common actions.

**iPadOS keyboard shortcut guidelines:**
- Define shortcuts only for the most common and frequent actions
- Use standard system shortcuts (Cmd+C, Cmd+V, Cmd+Z, Cmd+F) consistently
- Hold the Command key to reveal the keyboard shortcut overlay
- The overlay displays shortcuts organized by category in a flat list
- Provide descriptive shortcut titles — submenu context is not shown in the overlay
- Avoid defining too many custom shortcuts, which can make the app seem complex

**Essential shortcuts to implement:**
- Cmd+N: New item/document
- Cmd+S: Save
- Cmd+F: Find/Search
- Cmd+Z / Cmd+Shift+Z: Undo/Redo
- Cmd+C / Cmd+X / Cmd+V: Copy/Cut/Paste
- Cmd+A: Select all
- Cmd+W: Close current view/tab
- Arrow keys: Navigation within lists and grids
- Tab / Shift+Tab: Move between form fields
- Return/Enter: Confirm selection or submit
- Escape: Cancel or dismiss

**Android keyboard support:**
- Handle KeyEvent for physical keyboard input
- Support standard keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
- Implement arrow key navigation for lists and grids
- Tab key should move focus between interactive elements
- Starting with Android 16, basic keyboard support is required for large-screen apps

**Discoverability:**
- iPadOS provides the built-in shortcut overlay (hold Command key)
- Android apps should provide a help screen or tooltip listing available shortcuts
- Consider showing shortcut hints next to menu items (as desktop apps do)

### 3.5 Apple Pencil and Stylus Interactions

Stylus input is a differentiating tablet capability that enables precision work not
possible with finger touch alone.

**Apple Pencil capabilities:**
- Pressure sensitivity: Variable line width and opacity based on pressure
- Tilt detection: Shading effects based on pencil angle (azimuth)
- Hover detection: Preview tool effects before touching the display (M2+ iPads)
- Double-tap gesture: Quick tool switching (eraser toggle, color picker)
- Squeeze gesture: Tool palette access (Apple Pencil Pro)
- Barrel roll: Rotation detection for shaped brushes (Apple Pencil Pro)
- Low latency: Apple optimizes for minimal drawing latency with Pencil

**Design patterns for stylus:**
- Drawing and annotation: Provide a canvas with tool palette (pencil, pen, marker, eraser)
- Precision selection: Allow pixel-level selection and placement with stylus
- Handwriting recognition: Scribble enables handwriting in any text field
- Markup and review: Enable annotation overlays on documents and images
- Note-taking: Support freeform ink alongside typed text

**Stylus-specific considerations:**
- Distinguish between finger and stylus input — some apps use finger for panning and stylus for drawing
- Provide palm rejection when stylus is in use
- Support both left-handed and right-handed users (tool palette positioning)
- On Android, stylus support varies by device — use MotionEvent.TOOL_TYPE_STYLUS to detect
- Samsung S Pen has unique features (air actions, remote control) that are device-specific

---

## 4. Typography & Spacing System

### 4.1 Tablet Typography

Font sizes on tablets are generally close to phone sizes because tablets are held
slightly farther from the eyes, which compensates for the larger physical display.

**iPadOS typography:**
- Body text: 17pt (same as iPhone — the viewing distance compensation means the same size works)
- Headlines: 22-34pt depending on hierarchy level
- Captions: 12-15pt
- Tab bar labels: 13pt on iPad (vs 10pt on iPhone) with horizontal layout
- Navigation titles: Large title style (34pt) in scrolling contexts
- Dynamic Type must be supported — users can scale text from ~80% to ~310% of default

**Material Design 3 typography for tablets:**
- Display: 36-57sp for prominent headlines
- Headline: 24-32sp for section headers
- Title: 14-22sp for component headers
- Body: 14-16sp for main content
- Label: 11-14sp for supporting text
- Line height ratios of 1.4-1.6 for body text readability
- Maximum line length: approximately 60 characters for optimal readability

**Cross-platform recommendations:**
- Maintain a clear type hierarchy with at least 3-4 distinct levels
- Use heavier weights or color contrast rather than size alone for hierarchy on larger screens
- Ensure minimum body text size of 14-16pt/sp for comfortable reading
- Test readability at arm's length, which is the typical tablet viewing distance
- Support system font scaling / Dynamic Type on both platforms

### 4.2 Margins and Spacing

Tablet layouts require larger margins than phone layouts to prevent content from
feeling pressed against the screen edges.

**iPadOS margins and spacing:**
- Standard layout margins: 20pt on smaller iPads, increased on larger iPads
- The system readable content guide constrains text to approximately 672pt wide
- Readable content inset: approximately 176pt from each edge on a full-width 12.9" iPad
- Section spacing: 20-35pt between major content sections
- Card padding: 16-20pt internal padding
- The layout margins guide provides automatic insets that respect safe areas

**Material Design 3 margins and spacing:**
| Window Size Class | Margins  | Gutters  | Columns |
|-------------------|----------|----------|---------|
| Compact (<600dp)  | 16dp     | 8dp      | 4       |
| Medium (600-839dp)| 24dp     | 16-24dp  | 8       |
| Expanded (840dp+) | 24-32dp  | 24dp     | 12      |
| Large (1200dp+)   | 32dp+    | 24-32dp  | 12      |

**Spacing scale (8dp/8pt base unit):**
- 4dp/pt: Minimal spacing (related inline elements)
- 8dp/pt: Tight spacing (within component groups)
- 12dp/pt: Compact spacing
- 16dp/pt: Standard spacing (between components on phone)
- 24dp/pt: Comfortable spacing (standard on tablet)
- 32dp/pt: Generous spacing (between major sections on tablet)
- 48dp/pt: Separator spacing (between distinct content groups)
- 64dp/pt: Section breaks on large screens

### 4.3 Content Width Constraints

Even though the tablet provides more horizontal space, text content must be
constrained to maintain readability.

**Maximum content width guidelines:**
- Body text blocks: 672pt (Apple readable content guide) or 600-800dp (Material)
- Full-width cards: Constrain to approximately 840dp maximum, or use multi-column card grid
- Forms: Single-column forms should not exceed 600dp width; use multi-column layout for wider screens
- Tables and data grids: Can use full width but should include column resizing
- Images: Can go full-width in single-pane layouts but should respect margins
- Media players: Full-width with controls, but metadata and comments should be width-constrained

**Readable line length:**
- Optimal: 50-75 characters per line (approximately 60 characters as the sweet spot)
- Minimum: 30 characters per line (very narrow columns)
- Maximum: 100 characters per line (beyond this, reading comprehension drops)
- Use the platform's readable content guide rather than hardcoding widths

### 4.4 Interactive Element Spacing

Touch targets on tablets follow similar minimum sizes as phones, but the additional
screen space allows more generous spacing.

**Minimum touch target sizes:**
- Apple HIG: 44pt x 44pt minimum tappable area for all controls
- Material Design: 48dp x 48dp recommended touch target
- WCAG 2.5.5 (AAA): 44 x 44 CSS pixels minimum target size
- These minimums apply regardless of screen size — larger screens do not justify smaller targets

**Spacing between interactive elements:**
- Minimum 8dp/pt between adjacent tappable targets to prevent mis-taps
- On tablet layouts, increase to 12-16dp between buttons and controls
- List items: 48-72dp row height on tablets (vs 48-56dp on phones)
- Grid items: 8-16dp gap between cards or tiles
- Toolbar items: 24-32dp spacing between icon buttons

**Ergonomic zones on tablets:**
- Bottom and side edges are easiest to reach when holding the tablet
- Center of the screen is difficult to reach when holding with two hands (avoid placing frequent tap targets there)
- When propped on a stand, the entire screen is equally accessible
- Controls placed along the edges are more comfortable for two-handed grip

---

## 5. Common Mistakes

### 5.1 Just Scaling Up the Phone Layout

**The problem:** Taking a phone layout and simply stretching it to fill the tablet
screen. This results in oversized buttons, uncomfortably wide text lines, and wasted
whitespace.

**What happens:**
- Text lines stretch to 120+ characters, destroying readability
- Buttons and controls become comically large with no added benefit
- Single-column layouts leave vast empty margins on either side
- The app feels like a magnified phone rather than a purposeful tablet experience

**The fix:**
- Redesign layouts for tablet breakpoints using multi-column patterns
- Implement list-detail, supporting pane, or feed canonical layouts
- Constrain text width with readable content guides
- Add meaningful content to the extra space (sidebars, supplementary panes, richer previews)

### 5.2 Ignoring Landscape Orientation

**The problem:** Designing only for portrait and leaving landscape as an afterthought
or — worse — locking orientation to portrait only.

**What happens:**
- Users with keyboard accessories are forced to detach them to use the app
- Landscape shows a stretched portrait layout with awkward proportions
- Critical UI elements may shift to unreachable positions
- The app cannot participate in Split View multitasking effectively

**The fix:**
- Design for both orientations from the start
- Use landscape as the primary layout for productivity apps
- Test layout transitions between portrait and landscape
- Ensure content and scroll positions are preserved on rotation
- Starting with Android 16, orientation locking is disallowed on large-screen devices

### 5.3 Not Using the Extra Space for Productivity

**The problem:** Showing the same amount of information on a 12.9" iPad as on a
5.8" iPhone, with the extra space going to waste.

**What happens:**
- Users must navigate the same number of screens despite having 4-5 times the display area
- Common actions require the same number of taps as on phone
- No productivity advantage to using the tablet app over the phone app
- Users switch to the web browser or a competitor's app that uses space better

**The fix:**
- Show list and detail simultaneously instead of requiring navigation between them
- Provide inline editing instead of navigating to edit screens
- Add persistent toolbars, inspectors, or property panels
- Enable multi-selection and batch operations
- Show previews, thumbnails, and metadata alongside primary content

### 5.4 Not Supporting External Keyboard

**The problem:** Ignoring the significant number of tablet users who attach keyboards,
trackpads, and mice.

**What happens:**
- No keyboard shortcuts for common actions, forcing touch-only workflows
- Tab key does not move focus between form fields
- Arrow keys do not navigate lists or grids
- No visible focus indicator for keyboard navigation
- Right-click / secondary click does nothing

**The fix:**
- Implement standard keyboard shortcuts (Cmd+C, Cmd+V, Cmd+Z on iPad; Ctrl equivalents on Android)
- Support tab-key navigation between interactive elements
- Provide arrow-key navigation within lists, grids, and menus
- Show visible focus indicators for keyboard-driven navigation
- Support pointer/cursor interactions with hover states

### 5.5 Ignoring Foldable Screen States

**The problem:** Building a single layout that ignores the fold/hinge, causing content
to be obscured or interactive elements to be unreachable.

**What happens:**
- Buttons or text render directly on the fold/hinge area, making them hard to see or tap
- Video content splits across the fold with a visible gap through the image
- The app does not adapt when the device transitions between flat, tabletop, and book postures
- App state is lost when folding/unfolding the device

**The fix:**
- Use the WindowManager API to detect fold state and position
- Avoid rendering interactive elements within the hinge zone
- Use the fold as a natural separator to create dual-pane layouts
- Adapt layout for tabletop mode (content above, controls below)
- Preserve all state during posture transitions
- Test on multiple foldable devices or emulators with different fold configurations

### 5.6 Inconsistent Popover and Modal Behavior

**The problem:** Using full-screen modals for simple actions on tablet, or failing to
adapt presentation style between phone and tablet.

**What happens:**
- A simple date picker or color selector takes over the entire 12.9" display
- Users lose context of what they were doing because the parent content is completely hidden
- The app feels like it was designed for phones and ported without adaptation

**The fix:**
- Use popovers anchored to trigger controls for quick selections on iPad
- Use form sheets (centered, dimmed background) for multi-step tasks
- Reserve full-screen modals for immersive content only (camera, video, full-screen editors)
- Leverage UIAdaptivePresentationController to automatically adapt between device sizes
- On Android, use DialogFragment with appropriate sizing or BottomSheetDialog

### 5.7 Neglecting Accessibility at Tablet Scale

**The problem:** Assuming larger screens automatically improve accessibility, when in
fact new challenges emerge.

**What happens:**
- VoiceOver/TalkBack reading order is unclear in multi-column layouts
- Dynamic Type at the largest sizes breaks multi-column layouts
- Focus order for keyboard navigation does not follow a logical sequence across panes
- Drag-and-drop has no keyboard-accessible alternative

**The fix:**
- Define explicit accessibility reading order for multi-pane layouts
- Test Dynamic Type / font scaling at the largest sizes — layouts may need to collapse to single column
- Ensure keyboard focus follows a logical sequence: sidebar first, then content, then detail
- Provide accessible alternatives for all gesture-based interactions (drag-and-drop, swipe actions)
- Test with VoiceOver (iPad) and TalkBack (Android) in both orientations

---

## 6. Checklist

Use this checklist to verify tablet design quality before shipping.

### Layout and Responsiveness
- [ ] App uses multi-column or multi-pane layouts on tablet-sized screens (not a stretched phone layout)
- [ ] Layout adapts correctly between compact, medium, and expanded width classes
- [ ] Both landscape and portrait orientations are fully supported and tested
- [ ] Content width is constrained to maintain readable line lengths (50-75 characters for body text)
- [ ] Layout works correctly in Split View, Slide Over, and Stage Manager windows (iPad)
- [ ] Layout works correctly in split-screen and free-form window modes (Android)
- [ ] Multi-column layouts collapse gracefully to single-column at narrow widths

### Navigation
- [ ] Navigation pattern adapts to screen size (sidebar on tablet, tab bar or bottom nav on phone)
- [ ] Navigation Rail (Android) or Sidebar (iPad) is used instead of bottom navigation on tablet widths
- [ ] Back navigation and deep linking work correctly in multi-pane layouts

### Input and Interaction
- [ ] External keyboard shortcuts are implemented for all common actions
- [ ] Tab key navigates between form fields and interactive elements
- [ ] Arrow keys navigate within lists and grids
- [ ] Hover states are provided for pointer/trackpad/mouse interaction
- [ ] Drag and drop is supported for applicable content types
- [ ] Context menus (long-press / right-click) are available and duplicate toolbar actions
- [ ] Apple Pencil / stylus input is handled appropriately (if applicable to the app's domain)

### Components and Modals
- [ ] Popovers or form sheets are used for simple tasks on tablet (not full-screen modals)
- [ ] Modal presentation adapts between tablet (popover/sheet) and phone (full-screen) automatically
- [ ] Touch targets meet minimum size requirements (44pt Apple / 48dp Material)
- [ ] Interactive elements have sufficient spacing (minimum 8dp/pt between tap targets)

### Foldable Devices (Android)
- [ ] App detects and responds to fold/hinge position
- [ ] No interactive elements or critical content are placed across the fold/hinge
- [ ] Layout adapts to tabletop and book postures when applicable
- [ ] App state is preserved during posture transitions (fold/unfold)

### Accessibility
- [ ] VoiceOver (iPad) and TalkBack (Android) reading order is logical in multi-pane layouts
- [ ] Dynamic Type / font scaling works correctly at all sizes, including the largest settings
- [ ] Keyboard focus order follows a logical sequence across all panes
- [ ] All gesture-based interactions have accessible alternatives

---

## References

### Apple
- [Designing for iPadOS — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados)
- [Layout — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Sidebars — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [Tab Bars — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Sheets — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Drag and Drop — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop)
- [Elevating Your iPad App with a Tab Bar and Sidebar](https://developer.apple.com/documentation/uikit/elevating-your-ipad-app-with-a-tab-bar-and-sidebar)
- [Adopting Hover Support for Apple Pencil](https://developer.apple.com/documentation/UIKit/adopting-hover-support-for-apple-pencil)
- [Elevate the Design of Your iPad App — WWDC25](https://developer.apple.com/videos/play/wwdc2025/208/)

### Android / Material Design
- [Canonical Layouts — Material Design 3](https://m3.material.io/foundations/layout/canonical-layouts/overview)
- [List-Detail Canonical Layout — Material Design 3](https://m3.material.io/foundations/layout/canonical-layouts/list-detail)
- [Navigation Rail — Material Design 3](https://m3.material.io/components/navigation-rail/guidelines)
- [Applying Layout — Material Design 3](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)
- [Understanding Layout — Material Design 3](https://m3.material.io/foundations/layout/understanding-layout/overview)
- [Material Design for Large Screens](https://m3.material.io/foundations/adaptive-design/large-screens)
- [Large Screen Canonical Layouts — Android Developers](https://developer.android.com/guide/topics/large-screens/large-screen-canonical-layouts)
- [Adaptive App Quality Guidelines — Android Developers](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)
- [Learn About Foldables — Android Developers](https://developer.android.com/guide/topics/large-screens/learn-about-foldables)
- [Make Your App Fold Aware — Android Developers](https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/make-your-app-fold-aware)
- [Window Size Classes — Android Developers](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)
- [Android 12L Features](https://developer.android.com/about/versions/12/12L/summary)

### General
- [Tablet Website and Application UX — Nielsen Norman Group](https://www.nngroup.com/reports/tablets/)
- [Readable Content Guides — Use Your Loaf](https://useyourloaf.com/blog/readable-content-guides/)
- [Optimal Line Length for Readability — UXPin](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/)
