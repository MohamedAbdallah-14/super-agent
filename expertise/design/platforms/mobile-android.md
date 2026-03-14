# Android Mobile Design — Platform Expertise Module

---
category: platform
applies-to: [android-phone, android-tablet, android-foldable]
version: 2.0
last-updated: 2026-03-07
sources:
  - https://m3.material.io/foundations
  - https://m3.material.io/styles/color/roles
  - https://m3.material.io/styles/typography/applying-type
  - https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
  - https://m3.material.io/styles/shape/corner-radius-scale
  - https://m3.material.io/components
  - https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge
  - https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back
  - https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
  - https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/learn-about-foldables
  - https://developer.android.com/develop/ui/compose/designsystems/material3
  - https://developer.android.com/design/ui/mobile/guides/home-screen/notifications
---

## 1. Platform Design Language

### 1.1 Material Design 3 (Material You) Philosophy

Material Design 3, branded as "Material You," is Google's current design system for
Android. It is built on three core principles:

- **Personal.** The design adapts to each user through dynamic color derived from their
  wallpaper, giving every device a unique personality while preserving brand identity.
- **Adaptive.** Layouts, components, and navigation patterns respond fluidly across phones,
  tablets, foldables, and large screens using canonical layouts and window-size classes.
- **Expressive.** Bolder color contrasts, richer typography, spring-based motion, and
  generous corner rounding create interfaces that feel alive and emotionally engaging.

Material You launched with Android 12 (2021) and has been the standard design language
through Android 13, 14, and 15. With Android 16 (2025), Google introduced
**Material 3 Expressive** -- a significant evolution that amplifies vibrancy, introduces
fifteen new or updated components (button groups, FAB menus, loading indicators, split
buttons, toolbars), adds a spring-based motion physics system, and increases the use of
blur, animation, and haptic feedback throughout the OS.

### 1.2 Dynamic Color from User Wallpaper

Dynamic Color is the flagship personalization feature of Material You. The **Monet**
color-extraction engine analyzes the user's wallpaper and generates a set of tonal
palettes that propagate through the entire system and into apps that opt in.

How dynamic color works:

1. The system extracts a **source color** from the user's wallpaper.
2. Five **tonal palettes** are generated: Primary, Secondary, Tertiary, Neutral, and
   Neutral Variant, each with 13 tonal steps (0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
   95, 99, 100).
3. These palettes map to **color roles** (primary, onPrimary, primaryContainer, surface,
   etc.) for both light and dark themes.
4. Apps that enable dynamic color automatically receive a harmonized theme while retaining
   the option to define fixed brand colors for specific elements (logos, illustrations).

Design implications:

- Never hard-code background or surface colors. Use semantic color roles so your UI adapts.
- Test your designs against multiple wallpapers (warm, cool, neutral, high-saturation) and
  both light and dark themes.
- Use the **Material Theme Builder** (https://material-foundation.github.io/material-theme-builder/)
  to preview dynamic color output and export theme tokens.

### 1.3 Material You Design Tokens

Material Design 3 is a **token-first** system. Design tokens are the atomic values that
encode every visual decision -- color, typography, shape, motion -- and are referenced by
components rather than hard-coded.

#### Color Tokens

Color roles are organized into five groups derived from the five key colors:

| Group            | Key Roles                                                              |
|------------------|------------------------------------------------------------------------|
| **Primary**      | primary, onPrimary, primaryContainer, onPrimaryContainer               |
| **Secondary**    | secondary, onSecondary, secondaryContainer, onSecondaryContainer       |
| **Tertiary**     | tertiary, onTertiary, tertiaryContainer, onTertiaryContainer           |
| **Error**        | error, onError, errorContainer, onErrorContainer                       |
| **Surface**      | surface, onSurface, surfaceVariant, onSurfaceVariant, surfaceDim,      |
|                  | surfaceBright, surfaceContainerLowest, surfaceContainerLow,            |
|                  | surfaceContainer, surfaceContainerHigh, surfaceContainerHighest        |
| **Outline**      | outline, outlineVariant                                                |
| **Inverse**      | inverseSurface, inverseOnSurface, inversePrimary                       |
| **Special**      | scrim, shadow                                                          |

Usage guidance:

- **primary** -- high-emphasis actions (filled buttons, active states, FAB).
- **secondary** -- medium-emphasis elements (filter chips, toggles).
- **tertiary** -- contrasting accents that balance primary and secondary.
- **surface / surfaceContainer hierarchy** -- backgrounds, cards, sheets. The seven
  surface-container tones create layered depth without relying on elevation shadows.
- **outline** -- borders and dividers; **outlineVariant** for lower emphasis.
- **on-*** roles -- text and icon color placed on top of its paired fill, ensuring
  accessible contrast ratios.

#### Typography Tokens

See Section 4 for the full type scale.

#### Shape Tokens

The Material 3 shape system defines a 10-step corner-radius scale:

| Token                        | Value   | Typical Usage                              |
|------------------------------|---------|------------------------------------------- |
| `shape.corner.none`         | 0 dp    | Sharp-cornered containers                   |
| `shape.corner.extraSmall`   | 4 dp    | Small utility elements                      |
| `shape.corner.small`        | 8 dp    | Chips, small cards                          |
| `shape.corner.medium`       | 12 dp   | Cards, dialogs                              |
| `shape.corner.large`        | 16 dp   | FABs, navigation drawers                    |
| `shape.corner.largeIncreased`| 20 dp  | Emphasized containers                       |
| `shape.corner.extraLarge`   | 28 dp   | Bottom sheets, large cards                  |
| `shape.corner.extraLargeIncreased` | 32 dp | Hero surfaces                        |
| `shape.corner.extraExtraLarge` | 48 dp | Full-width sheets                          |
| `shape.corner.full`         | 9999 dp | Pill shapes (search bars, badges)           |

Material 3 Expressive pushes corner rounding further, favoring `large` and above for
primary interactive surfaces to create a softer, more approachable aesthetic.

#### Motion Tokens

Material 3 defines **easing** and **duration** token pairs:

**Duration tokens:**

| Token          | Value   | Use Case                                |
|----------------|---------|---------------------------------------- |
| `duration.short1`   | 50 ms   | Micro-interactions (ripple start)  |
| `duration.short2`   | 100 ms  | Icon transitions                   |
| `duration.short3`   | 150 ms  | Small component state changes      |
| `duration.short4`   | 200 ms  | Selection, toggle                  |
| `duration.medium1`  | 250 ms  | Component enter                    |
| `duration.medium2`  | 300 ms  | Standard transitions               |
| `duration.medium3`  | 350 ms  | Complex component transitions      |
| `duration.medium4`  | 400 ms  | Page-level transitions             |
| `duration.long1`    | 450 ms  | Route changes                      |
| `duration.long2`    | 500 ms  | Large surface transitions          |
| `duration.long3`    | 550 ms  | Full-screen transitions            |
| `duration.long4`    | 600 ms  | Complex orchestrated sequences     |
| `duration.extraLong1` | 700 ms | Dramatic reveals                  |
| `duration.extraLong2` | 800 ms | Hero transitions                  |
| `duration.extraLong3` | 900 ms | Onboarding sequences              |
| `duration.extraLong4` | 1000 ms| Full orchestration                |

**Easing families:**

- **Emphasized** -- the primary easing; asymmetric curve with slow start and fast end.
  Used for most transitions where an element moves or transforms.
- **Emphasized Decelerate** -- elements entering the screen (decelerates into rest).
- **Emphasized Accelerate** -- elements exiting the screen (accelerates out of view).
- **Standard** -- symmetric ease-in-out for property changes that stay on screen (color,
  opacity, scale without position change).
- **Standard Decelerate** -- entering elements for simple property changes.
- **Standard Accelerate** -- exiting elements for simple property changes.

**Spring system (Material 3 Expressive):**

Material 3 Expressive adds a spring-based motion model with three speed presets:

- **Fast spring** -- small component animations (switches, checkboxes).
- **Default spring** -- mid-size elements (cards, chips expanding).
- **Slow spring** -- full-screen transitions and route changes.

Spring physics create more natural, responsive motion than fixed cubic-bezier curves,
especially for gesture-driven interactions like drag-to-dismiss.

### 1.4 What Makes a "Native-Feeling" Android App

A native-feeling Android app:

- Adopts **dynamic color** and responds to the user's theme (light/dark/wallpaper-based).
- Uses **Material 3 components** (FAB, bottom sheets, top app bars) rather than custom
  recreations of iOS-style controls.
- Supports **edge-to-edge** rendering with proper inset handling.
- Implements the **predictive back gesture** with appropriate preview animations.
- Places primary navigation in a **bottom navigation bar** (phone) or **navigation rail**
  (tablet/foldable) rather than a hamburger menu as the sole navigation.
- Respects the **8dp grid** and uses Material type scale tokens.
- Provides **haptic feedback** for meaningful interactions (toggle, long-press, delete).
- Integrates with the system: proper notifications, app shortcuts, widgets.

### 1.5 Android 14 / 15 / 16 Design Updates

**Android 14 (API 34):**
- Predictive back gesture available behind Developer Options.
- Per-app language preferences with in-app UI.
- Improved font scaling for accessibility (non-linear scaling above 200%).
- Regional preferences support for localized formatting.

**Android 15 (API 35):**
- **Edge-to-edge enforcement** -- all apps targeting API 35 render edge-to-edge by
  default. Apps must handle insets properly or face visual overlap.
- Predictive back system animations graduate from Developer Options and become active for
  opted-in apps (back-to-home, cross-task, cross-activity).
- Richer widget APIs with improved preview and configuration.
- Improved large-screen and foldable support in the platform.

**Android 16 (API 36) -- Material 3 Expressive:**
- Fifteen new or updated components (button groups, FAB menus, split buttons, loading
  indicators, toolbars).
- Spring-based motion physics system-wide.
- More vibrant, higher-contrast dynamic color palettes.
- Notification "Live Update" templates for real-time status updates.
- Enhanced blur, animation, and haptic feedback throughout the system UI.


---

## 2. Layout & Navigation Patterns

### 2.1 Bottom Navigation Bar

The primary navigation pattern for phones with 3-5 top-level destinations.

| Property              | Specification                                         |
|-----------------------|-------------------------------------------------------|
| Height                | 80 dp                                                 |
| Destinations          | 3 to 5 (never fewer, never more)                     |
| Icon size             | 24 dp                                                 |
| Label                 | Always visible (active and inactive); single line     |
| Active indicator      | Pill-shaped container behind the active icon           |
| Active indicator shape| `shape.corner.full` (pill)                            |
| Placement             | Bottom edge, spanning full width                      |
| Elevation             | Surface tint (tone-based elevation) rather than shadow|

Design rules:

- Always show text labels. Icon-only bottom bars violate Material guidance and hurt
  discoverability. Labels must be concise (1-2 words).
- The active destination uses a filled pill indicator behind the icon with
  `secondaryContainer` fill.
- Do not place a bottom navigation bar alongside a navigation rail. Use one or the other
  based on window-size class.
- Avoid placing a FAB that overlaps the navigation bar unless using a Bottom App Bar with
  an integrated FAB cutout.
- Navigation bar items do not scroll. If you have more than 5 destinations, use a
  navigation drawer.

### 2.2 Navigation Rail

The primary navigation pattern for medium-width devices (tablets, foldables unfolded,
landscape phones). Replaces the bottom navigation bar at the medium window-size class
breakpoint (600dp+).

| Property              | Specification                                         |
|-----------------------|-------------------------------------------------------|
| Width                 | 80 dp                                                 |
| Destinations          | 3 to 7                                                |
| Alignment             | Top, center, or bottom within the rail                |
| FAB slot              | Optional FAB above destinations                       |
| Icon size             | 24 dp                                                 |
| Label                 | Visible on active item (optionally all items)         |
| Placement             | Leading edge (start side) of the screen               |

Design rules:

- Navigation rail always appears on the leading (start) edge of the layout.
- An optional FAB can be placed at the top of the rail above the navigation items.
- On large screens (840dp+), consider upgrading to a permanent navigation drawer.
- When the device is in portrait and the window width drops below 600dp, transition back
  to a bottom navigation bar.

### 2.3 Navigation Drawer

Used for apps with many destinations (more than 5) or for large-screen layouts (840dp+).
Three variants exist:

| Variant               | Behavior                                              |
|-----------------------|-------------------------------------------------------|
| **Standard**          | Sits alongside content. Always visible on large screens. |
| **Modal**             | Overlays content with a scrim. Triggered by menu icon or swipe from the leading edge. Dismisses on outside tap or back gesture. |
| **Dismissible**       | Pushes content aside when opened. Can be toggled open/closed. No scrim. |

Design rules:

- Standard drawers are appropriate only when the window is wide enough (typically 1240dp+
  or expanded window-size class) so content is not cramped.
- Modal drawers are the fallback for compact screens when the app has more than 5
  destinations.
- The drawer opens from the **leading edge** only. Never place a drawer on the trailing
  edge.
- Drawer width: 256-360dp, not exceeding `screenWidth - 56dp`.
- Include a header area for branding or user account info (optional).

### 2.4 Top App Bar

Top app bars anchor the top of the screen and provide a title, navigation icon, and
action buttons.

Material 3 defines four variants:

| Variant               | Height (collapsed) | Height (expanded) | Title Position        |
|-----------------------|--------------------|--------------------|----------------------|
| **Center-aligned**    | 64 dp              | 64 dp (fixed)      | Centered             |
| **Small**             | 64 dp              | 64 dp (fixed)      | Start-aligned        |
| **Medium**            | 64 dp              | 112 dp             | Start, below actions |
| **Large**             | 64 dp              | 152 dp             | Start, below actions |

Design rules:

- **Center-aligned** is for simple screens with a short title and minimal actions. Use
  sparingly; it is not a universal default.
- **Small** is the most common variant for general-purpose screens.
- **Medium** and **Large** are collapsing app bars that shrink to 64dp on scroll, creating
  a dynamic, spatial effect.
- The navigation icon (hamburger or back arrow) sits at the start. Action icons sit at
  the end. Limit action icons to 2-3; overflow the rest into a menu.
- On scroll, the top app bar should gain a `surfaceContainer` fill (tone-based elevation)
  to separate it from content.

### 2.5 Edge-to-Edge Design

Starting with Android 15 (API 35), **edge-to-edge is mandatory** for all apps targeting
the latest API. Content renders behind the status bar and navigation bar, and apps must
manage insets explicitly.

#### System Bars

| Bar                   | Behavior                                              |
|-----------------------|-------------------------------------------------------|
| **Status bar**        | Transparent; content draws behind it                  |
| **Navigation bar**    | Transparent; gesture handle or 3-button bar           |

#### Inset Types

| Inset Type                   | Purpose                                          |
|------------------------------|--------------------------------------------------|
| `systemBars`                 | Combined status + navigation bar insets           |
| `statusBars`                 | Status bar only                                   |
| `navigationBars`             | Navigation bar only                               |
| `systemGestures`             | System gesture zones (back, home swipe)           |
| `mandatorySystemGestures`    | Non-overridable gesture areas (home indicator)    |
| `displayCutout`              | Camera cutout / notch                             |
| `ime`                        | Software keyboard                                 |
| `safeDrawing`                | Union of all insets -- the safest area for content|

#### Design Rules

- **Backgrounds and decorative elements** draw edge-to-edge, behind system bars.
- **Interactive content** (buttons, text fields, FABs) must be inset to avoid overlap
  with system bars and gesture zones.
- **Scrollable lists** should use content padding (not clip padding) so items scroll
  behind the status bar but rest position remains clear of system UI.
- **Bottom navigation bars** and **Bottom app bars** must account for navigation bar
  insets in their own padding.
- Set system bar appearance (light/dark icons) based on your surface color so icons
  remain legible.

### 2.6 Foldable Device Considerations

Android foldable devices introduce the **fold** as a physical boundary. Designs must be
"fold-aware" to deliver quality experiences.

#### Window Size Classes

| Class          | Width           | Navigation Pattern      |
|----------------|-----------------|-------------------------|
| **Compact**    | < 600 dp        | Bottom navigation bar   |
| **Medium**     | 600-839 dp      | Navigation rail         |
| **Expanded**   | 840 dp+         | Navigation drawer/rail  |

#### Canonical Layouts

Material Design provides three canonical layouts for adaptive design:

1. **List-Detail** -- item list on the leading pane, detail on the trailing pane. Collapses
   to single-pane on compact screens.
2. **Feed** -- content cards arranged in a grid that reflows based on available width.
3. **Supporting Pane** -- primary content area with a secondary supporting panel (e.g.,
   a map with a location list).

#### Fold Postures

| Posture        | Description                        | Design Guidance                  |
|----------------|------------------------------------|----------------------------------|
| **Flat**       | Device fully unfolded              | Use expanded layout              |
| **Half-opened**| Hinge at ~90-degree angle          | Split content at the fold line   |
| **Tabletop**   | Bottom half rests on surface       | Controls below fold, content above |
| **Book**       | Side-by-side like an open book     | List-detail layout               |

Design rules:

- Never place interactive elements directly on or across the fold/hinge area.
- Detect the fold position using `FoldingFeature` and adapt layout accordingly.
- Use `Compose Adaptive Layouts` library for built-in fold-aware layout strategies
  (reflow, levitate).
- Test on both inner and outer displays of flip-style foldables.

### 2.7 Predictive Back Gesture

Android 15 enforces the **predictive back gesture** for opted-in apps. When a user
begins a back swipe, the system shows a live preview of the destination before the
gesture completes, letting the user decide whether to commit.

Built-in predictive back animations:

| Animation          | Trigger                                              |
|--------------------|------------------------------------------------------|
| **Back-to-home**   | Back gesture from the app's root; shows home screen preview |
| **Cross-activity** | Back gesture navigates to a previous activity         |
| **Cross-task**     | Back gesture navigates to a previous task             |
| **Custom**         | App-defined transitions (e.g., closing a bottom sheet)|

Design rules:

- Ensure all back-navigation paths are properly declared so the system can animate them.
- Design transitions that make sense in reverse: if a screen slides in from the right,
  predictive back should show it sliding back to the right.
- Bottom sheets, side sheets, and modals should support predictive-back dismissal with a
  shrink/slide animation.
- Avoid overriding the back gesture for custom behavior unless absolutely necessary.
  Users expect back to behave consistently.
- The gesture originates from the left or right screen edge (user-configurable). Reserve
  edge-adjacent swipe gestures for navigation drawers only on the leading edge.


---

## 3. Component Conventions

### 3.1 Floating Action Button (FAB)

The FAB represents the single most important action on a screen. It floats above content
and should be used sparingly (one per screen maximum).

| Variant        | Size           | Shape                     | Content          |
|----------------|----------------|---------------------------|------------------|
| **FAB**        | 56 x 56 dp     | `large` (16dp radius)     | Icon only        |
| **Small FAB**  | 40 x 40 dp     | `medium` (12dp radius)    | Icon only        |
| **Large FAB**  | 96 x 96 dp     | `extraLarge` (28dp radius)| Icon only        |
| **Extended FAB**| 56 dp height  | `large` (16dp radius)     | Icon + label     |

Design rules:

- Use `primaryContainer` as the default FAB color. The icon uses `onPrimaryContainer`.
- Position the FAB at the bottom-end corner, 16dp from the edge, above the bottom
  navigation bar.
- The Extended FAB should collapse to a regular FAB on scroll to save space.
- Only one FAB per screen. If you need multiple actions, use a FAB menu (M3 Expressive)
  or a bottom app bar with action icons.
- The FAB should not be used for destructive actions (delete, cancel) or minor utility
  actions (search, settings).

### 3.2 Bottom Sheets

Bottom sheets are surfaces anchored to the bottom of the screen that present supplementary
content or actions.

| Variant        | Behavior                                                     |
|----------------|--------------------------------------------------------------|
| **Standard**   | Coexists with primary content. Both regions are interactive simultaneously. Used for persistent secondary content (e.g., music player mini-view, map controls). |
| **Modal**      | Blocks interaction with primary content. A scrim covers the background. Must be dismissed before the user can interact with the main surface. Used for contextual menus, confirmation dialogs, deep-linked content. |

Design rules:

- Bottom sheets use `surfaceContainerLow` fill and `extraLarge` (28dp) top corner radius.
- Include a **drag handle** (32 x 4 dp, centered, 22dp from top) for discoverability.
- Modal bottom sheets must support dismissal via: drag down, scrim tap, back gesture.
- Standard bottom sheets can be expanded/collapsed programmatically and by drag.
- Maximum height: full screen minus status bar. Half-expanded state should show enough
  content to be useful without full expansion.
- On tablets/large screens, consider using a **side sheet** instead.

### 3.3 Snackbars

Snackbars provide brief, non-blocking feedback at the bottom of the screen.

Design rules:

- Appear above FABs and bottom navigation (anchor to the FAB or nav bar).
- Duration: 4-10 seconds; dismiss automatically or on swipe.
- Single line preferred. Two-line maximum with a longer action button on the second line.
- Use `inverseSurface` background with `inverseOnSurface` text for high contrast against
  the page.
- One optional action (e.g., "Undo"). Never include a dismiss icon and an action
  simultaneously -- the action IS the dismiss trigger.
- Never stack multiple snackbars. Queue them sequentially.

### 3.4 Material 3 Component Library

#### Cards

Three variants: **Elevated**, **Filled**, **Outlined**.

| Variant    | Fill                    | Border          | Elevation |
|------------|-------------------------|-----------------|-----------|
| Elevated   | surfaceContainerLow     | none            | Level 1   |
| Filled     | surfaceContainerHighest | none            | Level 0   |
| Outlined   | surface                 | outlineVariant  | Level 0   |

- Cards are containers for related content and actions about a single subject.
- Touch target: entire card surface is tappable for the primary action.
- Minimum height: 48dp (to meet touch target requirements).

#### Chips

Four types: **Assist**, **Filter**, **Input**, **Suggestion**.

- Assist chips trigger smart or automated actions (e.g., "Add to calendar").
- Filter chips narrow content using tags or categories. Multi-select is allowed.
- Input chips represent user-entered information (e.g., email recipients in a compose
  field).
- Suggestion chips offer dynamically generated recommendations.
- Height: 32dp. Corner radius: `small` (8dp). Minimum touch target: 48dp.

#### Dialogs

- Basic dialogs present a title, supporting text, and up to 3 actions.
- Full-screen dialogs are used for complex tasks requiring multiple inputs.
- Corner radius: `extraLarge` (28dp).
- Scrim: `scrim` color at 32% opacity.
- Dialogs use `surfaceContainerHigh` fill.
- Action buttons are right-aligned. The confirming action is the rightmost button.
- Avoid nesting dialogs or launching dialogs from within bottom sheets.

#### Menus

- Dropdown menus appear from a trigger (icon button, text field, chip).
- Maximum 10 visible items; after that, the menu scrolls.
- Width: 112-280dp, adjusting to content.
- Corner radius: `extraSmall` (4dp).
- Menus appear below and aligned to the start of the trigger by default.

#### Sliders

- Continuous sliders for selecting a value from a range.
- Discrete sliders snap to predefined increments (displayed as tick marks).
- Track height: 4dp active, 4dp inactive.
- Thumb size: 20dp diameter (44dp touch target).
- Always provide a visible value label for discrete sliders.

#### Switches

- Track width: 52dp. Track height: 32dp. Thumb diameter: 24dp (28dp when pressed).
- Use `primary` fill for the active track, `surfaceContainerHighest` for inactive.
- Switches are self-contained toggles -- they should not require a separate "Save" action.
- Place switches at the trailing end of a list item, right-aligned.

### 3.5 Android-Specific Gestures

| Gesture            | System Behavior                                      | Design Guidance |
|--------------------|------------------------------------------------------|----------------|
| **Back gesture**   | Swipe from left or right edge to navigate back        | Support predictive back. Never hijack for custom drawer open from trailing edge. |
| **Long press**     | Opens contextual menu or selection mode               | Provide haptic feedback. Show a contextual action bar or popup menu. |
| **Drag**           | Reorder items, move elements, drag-to-dismiss         | Show a drag handle affordance. Provide haptic pulse on pickup and drop. |
| **Swipe to dismiss**| Dismiss notifications, snackbars, bottom sheets      | Horizontal swipe for items in lists. Vertical swipe for bottom sheets. |
| **Double tap**     | Zoom in (maps, images, text)                          | Reserve for zoom contexts only. |
| **Pinch**          | Scale content (maps, images, PDFs)                    | Always pair with double-tap zoom as a fallback. |

### 3.6 System Integration

#### Notifications

- Group related notifications into a **channel** with an appropriate importance level.
- Importance levels: Urgent (sound + heads-up), High (sound), Default (sound, no pop),
  Low (silent), Min (silent, minimized).
- Use **MessagingStyle** for conversations, **BigTextStyle** for long content,
  **BigPictureStyle** for images.
- Notification icons must be **monochrome** (white on transparent) vector drawables, 24dp.
- On Android 16, use **Live Update** notification templates for real-time status
  (delivery tracking, rideshare, sports scores).
- Always include a `contentIntent` (tap action) and consider adding action buttons (max 3).

#### App Widgets

- Design widgets to respect the home screen grid (minimum 2x1 cells).
- Provide resizable widgets using `minWidth`, `minHeight`, `maxResizeWidth`,
  `maxResizeHeight`.
- Use rounded corners matching `shape.corner.extraLarge` (28dp) for the widget container.
- Widgets should have internal padding of 8-16dp and leave margins between the widget
  boundary and content.
- Provide a meaningful **preview image** and a **configuration activity** if the widget
  has settings.
- Widgets should use the app's dynamic color theme when available.

#### App Shortcuts

- Provide up to 4 static shortcuts and additional dynamic shortcuts (combined max varies
  by launcher but aim for 4-5 total).
- Shortcut icons must be **adaptive icons** (foreground + background layers).
- Short label: max 10 characters. Long label: max 25 characters.
- Shortcuts appear on long-press of the app icon.

#### Quick Settings Tiles

- Tile icons must be **solid white on transparent background**, 24dp vector drawable.
- Maximum 2 tiles per app. Do not create tiles for features users access rarely.
- Tiles represent toggle-able states or quick-launch actions, not informational displays.
  Use notifications or widgets for status information.
- Active tile uses the system accent color; inactive tiles are neutral gray.


---

## 4. Typography & Spacing System

### 4.1 Material Design 3 Type Scale

Material 3 defines 15 type styles across 5 roles, each in three sizes:

| Role        | Size   | Default Font  | Weight  | Size (sp) | Line Height (sp) | Tracking (sp) |
|-------------|--------|---------------|---------|-----------|-------------------|---------------|
| **Display** | Large  | Roboto        | Regular | 57        | 64                | -0.25         |
| **Display** | Medium | Roboto        | Regular | 45        | 52                | 0             |
| **Display** | Small  | Roboto        | Regular | 36        | 44                | 0             |
| **Headline**| Large  | Roboto        | Regular | 32        | 40                | 0             |
| **Headline**| Medium | Roboto        | Regular | 28        | 36                | 0             |
| **Headline**| Small  | Roboto        | Regular | 24        | 32                | 0             |
| **Title**   | Large  | Roboto        | Regular | 22        | 28                | 0             |
| **Title**   | Medium | Roboto        | Medium  | 16        | 24                | 0.15          |
| **Title**   | Small  | Roboto        | Medium  | 14        | 20                | 0.1           |
| **Body**    | Large  | Roboto        | Regular | 16        | 24                | 0.5           |
| **Body**    | Medium | Roboto        | Regular | 14        | 20                | 0.25          |
| **Body**    | Small  | Roboto        | Regular | 12        | 16                | 0.4           |
| **Label**   | Large  | Roboto        | Medium  | 14        | 20                | 0.1           |
| **Label**   | Medium | Roboto        | Medium  | 12        | 16                | 0.5           |
| **Label**   | Small  | Roboto        | Medium  | 11        | 16                | 0.5           |

Usage guidance:

- **Display** -- reserved for short, impactful text on large screens (hero numbers,
  feature titles). Rarely used on phone-sized screens.
- **Headline** -- section headings, screen titles in medium/large top app bars.
- **Title** -- card titles, dialog titles, list item primary text (Title Medium/Small).
- **Body** -- paragraph text, descriptions, long-form content. Body Large is the
  recommended default for readability.
- **Label** -- buttons, chips, tabs, captions, navigation bar labels. Label Large for
  buttons, Label Medium for chips.

### 4.2 Roboto and System Font

- **Roboto** remains the default Android system font and the Material Design standard.
- **Roboto Flex** is the variable-font successor used in Material 3 Expressive, enabling
  continuous weight and width adjustments.
- Only **Regular (400)** and **Medium (500)** weights are used in the default type scale.
  Bold is not part of the standard scale (use Medium for emphasis).
- Apps may substitute brand fonts for Display and Headline styles while keeping Roboto for
  Body and Label for optimal readability.
- Always use `sp` (scale-independent pixels) for text, never `dp`, to respect the user's
  font-size accessibility setting.
- Android 14+ uses **non-linear font scaling** above 200% -- large text sizes scale less
  aggressively than small text to prevent layout breakage. Test at 200% font scale.

### 4.3 The 8dp Grid and 4dp Sub-Grid

Material Design is built on an **8dp baseline grid**:

- All spacing, padding, margins, and component dimensions should be multiples of 8dp.
- Use **4dp** for fine adjustments (icon internal padding, text alignment nudges, small
  gaps between tightly coupled elements like a label and its helper text).
- Common spacing values: 4, 8, 12, 16, 24, 32, 48, 64 dp.

Avoid non-standard increments like 5dp, 6dp, 10dp, or 15dp. These break visual rhythm
and create inconsistencies when components are placed adjacent to each other.

### 4.4 Screen Margins and Content Padding

| Context               | Margin / Padding                                     |
|-----------------------|------------------------------------------------------|
| Screen horizontal margin | 16 dp (compact), 24 dp (medium), 24-32 dp (expanded) |
| Card internal padding | 16 dp                                                |
| List item padding     | 16 dp horizontal, 8-12 dp vertical                  |
| Dialog padding        | 24 dp                                                |
| Bottom sheet padding  | 16-24 dp                                             |
| Between cards in a grid| 8 dp gap                                            |
| Section spacing       | 24-32 dp vertical                                    |

Touch targets:

- Minimum touch target: **48 x 48 dp** regardless of visual size.
- Recommended touch target for primary actions: **56 dp** (the FAB standard).
- For dense UIs (data tables), touch targets can be reduced to **40 dp** height but
  this should be the exception, not the default.


---

## 5. Common Mistakes

### 5.1 iOS Patterns Forced on Android

| Mistake                                  | Why It Fails on Android                            | Correct Approach                        |
|------------------------------------------|-----------------------------------------------------|-----------------------------------------|
| Icon-only bottom tab bar (no labels)     | Material guidelines require labels for discoverability. Users do not universally recognize custom icons. | Always show text labels on navigation bar items. |
| iOS-style "< Back" text button in the top-left | Android uses a back arrow icon or relies on the system back gesture. Text back buttons look foreign. | Use a leading arrow icon in the top app bar or rely on system back gesture. |
| iOS-style segmented control for top-level navigation | Android uses Material tabs (fixed or scrollable) for in-page filtering. | Use Material 3 Tabs or Chips. |
| Swipe-from-left-edge to open drawer everywhere | Conflicts with the system back gesture on Android. | Use a hamburger icon button to toggle the modal drawer. Leading-edge swipe should only supplement, not replace, the back gesture. |
| Full-screen modal for every sub-flow     | Android prefers new activities/screens with top app bar back navigation, or bottom sheets for lightweight flows. | Use appropriately-sized surfaces: bottom sheets for simple choices, new screens for complex flows. |
| Action sheet rising from bottom for destructive actions | Android uses dialogs for confirmations and menus for selections, not iOS-style action sheets. | Use a Material 3 Dialog for destructive confirmations. Use a dropdown or bottom-sheet menu for selections. |
| Pull-down-to-refresh as the only refresh mechanism | Acceptable on Android, but do not animate it with a custom iOS-style spinner. | Use `SwipeRefresh` with the Material 3 circular progress indicator. |
| Non-Material toggle styles (iOS-style pill toggle) | Looks out of place on Android and breaks consistency. | Use Material 3 Switch component. |

### 5.2 Ignoring Material You Dynamic Color

- Hard-coding colors (hex values) for surfaces, backgrounds, and containers instead of
  using semantic color roles.
- Not testing against multiple wallpaper palettes -- an app may look fine on a blue theme
  but unreadable on a yellow one.
- Not supporting dark theme. Dynamic color generates both light and dark variants; your
  app should honor both.
- Ignoring `surfaceContainer` hierarchy and using a flat, single surface color for all
  backgrounds, losing the depth and layering that Material 3 provides.
- Overriding dynamic color for every element instead of using it as the base and applying
  fixed brand colors only where necessary (logos, illustrations, branded CTAs).

### 5.3 Not Supporting Edge-to-Edge

- Content (especially FABs, bottom sheets, and list items) overlapping with the
  navigation bar or status bar because insets are not handled.
- Hard-coding status bar color to a solid brand color instead of making it transparent
  and letting content scroll beneath it.
- Not testing with 3-button navigation (which has a larger navigation bar) alongside
  gesture navigation (which has only a thin handle).
- Ignoring the display cutout/notch -- content hidden behind camera hardware.
- Not padding the IME (keyboard) inset, causing text fields to be obscured when the
  keyboard appears.

### 5.4 Other Common Pitfalls

- **Ignoring the 48dp minimum touch target.** Tiny tap targets cause user frustration and
  accessibility failures.
- **Using elevation shadows instead of tone-based elevation.** Material 3 replaced shadow
  elevation with surface-tint elevation (higher surfaces get a lighter tint of primary).
  Shadows are still used for FABs and overlapping surfaces, but not for cards or app bars.
- **Overloading the top app bar with too many action icons.** Limit to 2-3 icons; overflow
  the rest into a "more" menu.
- **Not providing haptic feedback.** Switches, long-press actions, and drag operations
  should trigger appropriate haptic responses.
- **Placing destructive actions in a FAB.** The FAB is for primary, constructive actions
  only.
- **Ignoring foldable and tablet layouts.** Over 300 million large-screen Android devices
  are in active use. Stretched phone layouts look broken on tablets.
- **Misusing navigation drawers on phones.** A hamburger menu as the sole navigation on a
  phone reduces discoverability. Prefer a bottom navigation bar for 3-5 destinations and
  reserve the drawer for supplementary destinations.
- **Skipping predictive back support.** Apps that intercept the back gesture without
  implementing OnBackPressedCallback correctly will show broken animations or no preview.


---

## 6. Android Design Correctness Checklist

Use this checklist to verify that a design follows current Android and Material Design 3
conventions before handoff to development.

### Theme & Color
- [ ] App supports **dynamic color** (Material You) and falls back to a branded static
      theme on devices below Android 12.
- [ ] Both **light and dark** themes are fully designed and tested.
- [ ] All colors use **semantic color roles** (primary, surface, etc.) rather than
      hard-coded hex values for theme-aware surfaces.
- [ ] Tested with at least 3 different wallpaper palettes (warm, cool, neutral) in both
      light and dark modes.

### Layout & Navigation
- [ ] Navigation pattern matches window-size class: **bottom nav** (compact),
      **navigation rail** (medium), **drawer or expanded rail** (expanded).
- [ ] Layouts use one of the three **canonical layouts** (list-detail, feed, supporting
      pane) for adaptive design.
- [ ] All screens render **edge-to-edge** with proper inset handling for status bar,
      navigation bar, display cutout, and IME.
- [ ] **Predictive back gesture** is supported with appropriate preview animations for
      all back-navigation paths.

### Components
- [ ] FAB is used for the **single primary action** only; no destructive or minor utility
      actions in the FAB.
- [ ] Bottom navigation bar shows **text labels** on all items (active and inactive).
- [ ] Top app bar uses a **Material 3 variant** (center-aligned, small, medium, or large)
      with 2-3 action icons maximum.
- [ ] Dialogs, bottom sheets, and menus use the correct **Material 3 shape tokens**
      (extraLarge corners for sheets, extraSmall for menus).
- [ ] Snackbars appear **above the FAB and bottom nav**, not behind them.

### Typography & Spacing
- [ ] All text uses the **Material 3 type scale** tokens (Display, Headline, Title, Body,
      Label) in `sp` units.
- [ ] Spacing follows the **8dp grid** (4dp for fine adjustments only).
- [ ] Screen margins are **16dp minimum** on compact screens, 24dp on medium/expanded.
- [ ] All interactive elements meet the **48dp minimum touch target**.

### System Integration
- [ ] Notifications use appropriate **channels and importance levels**, with correct
      styles (MessagingStyle, BigTextStyle, etc.).
- [ ] App widgets use **rounded corners** (28dp), are **resizable**, and include a preview.
- [ ] App shortcuts (long-press launcher icon) are provided for top user tasks.
- [ ] Haptic feedback is provided for toggles, long-press, and drag interactions.

### Accessibility & Adaptiveness
- [ ] Tested at **200% font scale** (non-linear scaling on Android 14+) without layout
      breakage.
- [ ] Foldable devices: layout adapts to fold postures (tabletop, book) and avoids
      placing content across the hinge.
- [ ] Color contrast meets **WCAG AA** (4.5:1 for body text, 3:1 for large text and UI
      components).
- [ ] All images and icons have meaningful **content descriptions** for screen readers.


---

## References

- Material Design 3 Foundations: https://m3.material.io/foundations
- Material Design 3 Components: https://m3.material.io/components
- Material Design 3 Color Roles: https://m3.material.io/styles/color/roles
- Material Design 3 Typography: https://m3.material.io/styles/typography/applying-type
- Material Design 3 Shape: https://m3.material.io/styles/shape/corner-radius-scale
- Material Design 3 Motion: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
- Material Design 3 Expressive: https://m3.material.io (Android 16 update)
- Android Edge-to-Edge Design: https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge
- Predictive Back Gesture: https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back
- Android System Bars: https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- Android Foldable Design: https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/learn-about-foldables
- Android Notifications: https://developer.android.com/design/ui/mobile/guides/home-screen/notifications
- Material Design 3 in Compose: https://developer.android.com/develop/ui/compose/designsystems/material3
- Material Theme Builder: https://material-foundation.github.io/material-theme-builder/
- Material 3 Expressive Deep Dive: https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/
