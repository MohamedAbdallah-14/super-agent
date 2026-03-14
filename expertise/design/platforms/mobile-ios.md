# Mobile iOS -- Design Expertise Module

> Comprehensive reference for designing native-quality iOS applications. Covers Apple's
> design philosophy, layout systems, component conventions, typography, system integration,
> and common pitfalls. Designed as a living checklist and decision guide for product
> designers and engineers building on the iOS platform.

> **Category:** Platform
> **Applies to:** Mobile (iOS)
> **Key sources:** Apple Human Interface Guidelines (HIG), WWDC 2023-2025 sessions, iOS SDK documentation

---

## 1. Platform Design Language

### 1.1 Apple HIG Philosophy

Apple's Human Interface Guidelines rest on four foundational pillars that govern every
design decision across the platform:

**Clarity**
- Every element on screen must have a clear purpose.
- Eliminate unnecessary complexity; users should understand the interface at a glance.
- Text must be legible at every size. Icons must be precise and lucid.
- Use whitespace deliberately to establish hierarchy and reduce cognitive load.

**Deference**
- The UI should never compete with the user's content.
- Fluid motion and a crisp interface help people understand and interact with content
  while never distracting from it.
- Translucency, blurs, and layering suggest depth without overwhelming the foreground.
- Chrome should recede; content should dominate.

**Depth**
- Visual layers and realistic motion convey hierarchy and facilitate understanding.
- Transitions and animations provide a sense of depth, helping users comprehend
  spatial relationships between screens and elements.
- Parallax, scaling, and layered interfaces reinforce the sense of navigable space.

**Consistency**
- Adopt platform conventions to create a design that continuously adapts across window
  sizes and displays.
- Familiar controls and standard gestures reduce the learning curve.
- Consistent behavior across the app and the system builds user trust.

### 1.2 iOS Design Principles

**Direct Manipulation**
- People expect to interact directly with on-screen objects through gestures.
- Pinch to zoom, swipe to scroll, drag to reorder -- actions map intuitively to outcomes.
- Immediate visual feedback confirms every interaction.

**Feedback**
- Every user action must produce a perceptible response: visual, auditory, or haptic.
- Animations should not be decorative; they communicate cause and effect.
- Loading states, progress indicators, and state transitions keep users informed.

**Metaphors**
- Virtual objects and actions should reference real-world counterparts where helpful.
- Switches toggle, sliders slide, pages turn -- familiar metaphors reduce learning effort.
- Avoid metaphors that break down or confuse when taken too literally.

**User Control**
- People, not the app, are in control. The app can suggest or warn, but it does not
  make irreversible decisions without explicit consent.
- Provide undo, cancel, and confirmation for destructive actions.
- Allow users to back out of any flow at any point.

### 1.3 What Makes an App "Native"

An iOS app feels native when it:

- Uses standard UIKit/SwiftUI components (or customizes them within expected parameters).
- Respects system gestures: swipe-back navigation, pull-to-refresh, edge swipes.
- Supports Dynamic Type and respects the user's accessibility preferences.
- Integrates with system features: ShareSheet, Spotlight, Widgets, Quick Actions.
- Follows iOS navigation paradigms: tab bars for top-level, push navigation for drill-down.
- Uses SF Pro (or SF-derived system fonts) and the standard iOS spacing system.
- Provides haptic feedback at appropriate moments (toggles, destructive confirms, selections).
- Responds to system appearance: Dark Mode, tinted icons, Reduce Motion, Bold Text.
- Adapts to all current screen sizes without visual breakage.
- Performs at 60fps (120fps on ProMotion displays) with no dropped frames.

An app feels like a "cross-platform port" when it:

- Uses a hamburger/drawer menu instead of a tab bar for primary navigation.
- Places primary actions in a floating action button (FAB) -- an Android/Material pattern.
- Applies Material Design ripple effects instead of iOS highlight states.
- Uses custom fonts everywhere with no Dynamic Type support.
- Ignores the safe area, causing content to clip behind the notch or home indicator.
- Lacks swipe-back gesture support for navigation.
- Shows Android-style toast notifications instead of iOS banners or alerts.
- Has a bottom navigation bar that does not match iOS tab bar conventions (wrong height,
  wrong icon style, labels missing).

### 1.4 iOS 17/18 Design Updates

**iOS 17 Additions**
- *Interactive Widgets:* Widgets can now contain buttons and toggles that perform actions
  without opening the app. Design tappable areas with minimum 44pt touch targets.
- *StandBy Mode:* A glanceable, always-on display activated when the iPhone is charging
  on its side. Only the `systemSmall` widget family is available. Design for viewing at
  a distance with high-contrast, large type.
- *Dynamic Island Enhancements:* Live Activities gained default SwiftUI animations for
  data updates. Content must be concentric with the Dynamic Island's pill shape -- rounded
  shapes nest inside with even margins.
- *Contact Posters:* Full-screen contact cards with custom photos, Memoji, and typography.

**iOS 18 Additions**
- *Home Screen Customization:* App icons and widgets can be freely placed anywhere on the
  grid, breaking the rigid top-left alignment. Icons support automatic tinting and dark
  mode variants.
- *Control Center Redesign:* Multiple pages of controls, resizable buttons, and support
  for third-party controls. Designers should provide appropriately-sized SF Symbols for
  control center integrations.
- *App Locking & Hiding:* Apps can be locked behind biometric/passcode authentication or
  hidden entirely in a dedicated folder. Design should account for locked states gracefully.
- *Tinted Icon Mode:* System-wide monochrome tinting of app icons. Ensure app icons remain
  recognizable in silhouette form.

**iOS 26 / Liquid Glass (WWDC 2025)**
- *Liquid Glass Material:* A translucent material that reflects and refracts its
  surroundings, dynamically transforming controls, navigation elements, app icons,
  widgets, and more. Real-time light bending, specular highlights responding to device
  motion, and adaptive shadows.
- *Adaptive Tab Bars:* Tab bars and sidebars crafted from Liquid Glass. When users scroll,
  tab bars shrink to bring focus to content; scrolling back up causes them to expand
  fluidly.
- *Visual Continuity:* The design extends uniformly across iOS 26, iPadOS 26, macOS
  Tahoe 26, watchOS 26, and tvOS 26, establishing deeper cross-platform harmony while
  preserving each platform's distinct qualities.
- *Bolder Typography:* Left-aligned, bolder system typography with concentricity --
  a unified rhythm between hardware and software form factors.

---

## 2. Layout & Navigation Patterns

### 2.1 Tab Bar

The tab bar is the primary navigation pattern for top-level destinations in iOS.

| Property              | Value / Guideline                                       |
|-----------------------|---------------------------------------------------------|
| Height                | 49pt (standard), extends into safe area on notched devices |
| Maximum tabs          | 5 on iPhone (3-5 recommended); more acceptable on iPad  |
| Minimum tabs          | 2 (below 2, tab bar is unnecessary)                     |
| Icon size             | 25x25pt (@1x), 50x50pt (@2x), 75x75pt (@3x)           |
| Labels                | Always include text labels below icons                   |
| Position              | Always at the bottom of the screen                       |
| Visibility            | Always visible; never hidden behind gestures or scrolls  |
| Badge support         | Numeric or dot badges for notifications                  |
| Active state          | Filled icon + tint color; inactive = outline + gray      |

**Design rules:**
- Use tab bars strictly for navigation, never for actions (e.g., no "compose" tab).
- Each tab should lead to a distinct section, not a variation of the same content.
- The tab bar should persist across all screens within a tab's hierarchy.
- On iOS 26 (Liquid Glass): tab bars shrink during scroll and expand on scroll-back.

### 2.2 Navigation Bar

The navigation bar provides context and controls at the top of a view hierarchy.

| Property              | Value / Guideline                                       |
|-----------------------|---------------------------------------------------------|
| Standard height       | 44pt (content area, excluding status bar)                |
| Large title height    | ~96pt when expanded, collapses to 44pt on scroll         |
| Status bar height     | 54pt (Dynamic Island devices), 44pt (notch), 20pt (legacy) |
| Back button           | System chevron + previous screen's title (auto-truncated)|
| Right bar items       | Max 1-2 action buttons; use SF Symbols                   |
| Title alignment       | Centered (inline mode) or left-aligned (large title mode)|

**Large title mode:**
- Use for top-level screens (first screen in a tab's hierarchy).
- The title collapses smoothly to inline mode on scroll.
- Title font is 34pt bold (system `.largeTitle` style).

**Inline mode:**
- Use for detail/secondary screens.
- Title font is 17pt semibold, centered.

**Design rules:**
- Always provide a back button (system handles this automatically with push navigation).
- Never replace the system back gesture (swipe from left edge).
- Avoid placing more than two buttons on the right side of the navigation bar.
- Search bars can be embedded below the navigation bar and collapse on scroll.

### 2.3 Sheet Presentations

Sheets are modal presentations that slide up from the bottom.

**System detents:**
- `.medium` -- approximately half the screen height. Disabled automatically in landscape.
- `.large` -- full screen height (standard modal behavior).
- Custom detents: `.fraction(0.25)` for quarter-height, `.height(200)` for fixed pixel
  height, or fully custom calculated heights.

**Design rules:**
- When multiple detents are specified, the system adds a drag indicator automatically.
- Use `.medium` for quick contextual tasks (filter panels, short forms).
- Use `.large` for full-content views (compose screens, detailed forms).
- Sheets can be made non-dismissible (`interactiveDismissDisabled(true)`) -- use
  sparingly, only when data loss would occur.
- In landscape, all sheets default to `.large` regardless of specified detents.
- Background content behind a `.medium` sheet remains interactive by default (can be
  disabled with `presentationBackgroundInteraction`).

### 2.4 Safe Areas

Safe areas prevent content from being obscured by system UI elements.

| Region                       | Inset (approx.)                                        |
|------------------------------|--------------------------------------------------------|
| Top (Dynamic Island devices) | 59pt                                                   |
| Top (notch devices)          | 44pt                                                   |
| Top (legacy, no notch)       | 20pt (status bar only)                                 |
| Bottom (home indicator)      | 34pt                                                   |
| Bottom (home button devices) | 0pt                                                    |
| Landscape leading/trailing   | 44pt (notch side) + additional for curved edges         |

**Design rules:**
- Never place interactive controls outside safe areas.
- Background colors/images may extend edge-to-edge (behind safe areas).
- Always use Auto Layout or SwiftUI's `.safeAreaInset()` -- never hardcode inset values.
- Test layouts on smallest (iPhone SE) and largest (Pro Max) devices in both orientations.
- The home indicator area is not tappable; do not place buttons there.

### 2.5 Screen Sizes

iOS uses a point-based coordinate system that abstracts physical pixel density.

| Device Family              | Screen (points)  | Scale | Physical Pixels    |
|----------------------------|-------------------|-------|--------------------|
| iPhone SE (3rd gen)        | 375 x 667         | @2x   | 750 x 1334        |
| iPhone 14 / 15 / 16       | 393 x 852         | @3x   | 1179 x 2556       |
| iPhone 14/15/16 Plus      | 430 x 932         | @3x   | 1290 x 2796       |
| iPhone 15/16 Pro           | 393 x 852         | @3x   | 1179 x 2556       |
| iPhone 15/16 Pro Max       | 430 x 932         | @3x   | 1290 x 2796       |
| iPhone 16 Pro              | 402 x 874         | @3x   | 1206 x 2622       |
| iPhone 16 Pro Max          | 440 x 956         | @3x   | 1320 x 2868       |
| iPhone 16e                 | 390 x 844         | @3x   | 1170 x 2532       |

**Design rules:**
- Design at @1x (points), export assets at @1x, @2x, @3x (or use vector/PDF/SVG).
- Use flexible layouts that adapt to any width between 320pt and 440pt.
- Test on the smallest supported device (SE at 375pt) and largest (Pro Max at 440pt).
- Avoid pixel-perfect fixed layouts; use constraint-based or stack-based approaches.
- On larger iPhones (Plus/Pro Max) in landscape, split views may be available.

### 2.6 Split View on Larger iPhones

- iPhone Plus and Pro Max devices support `UISplitViewController` in landscape.
- The primary column shows a list/master view; the secondary shows detail.
- Design both columns as independently usable views.
- In portrait, the split view collapses to a single-column navigation stack.
- Not all apps benefit from split view -- only enable it if your content model is
  list-detail oriented.

---

## 3. Component Conventions

### 3.1 Action Sheets vs. Alerts

**Alerts (`UIAlertController` with `.alert` style)**
- Use for important information that requires acknowledgment or a binary decision.
- Maximum 2 buttons preferred (e.g., "Cancel" / "Delete").
- Appears centered on screen as a modal dialog.
- Title should be short; message is optional but should be concise.
- Destructive actions use red text (`.destructive` style).

**Action Sheets (`UIAlertController` with `.actionSheet` style)**
- Use to offer 2-4 choices related to an intentional action the user just took.
- Appears anchored to the bottom of the screen (iPhone) or as a popover (iPad).
- Always include a Cancel button.
- Avoid more than 4 buttons total (including Cancel) -- scrolling action sheets are
  difficult to use without accidentally tapping.
- Use when the user needs to choose *how* to proceed (e.g., "Save Draft" / "Delete Draft"
  / "Cancel" when dismissing a compose screen).

**When to use which:**
- Alert = "Something happened, acknowledge it" or "Are you sure?"
- Action Sheet = "You started something, how do you want to proceed?"

### 3.2 Context Menus

- Triggered by long-press (touch-and-hold) on any element.
- The element lifts and a menu of actions appears with a blurred background.
- Include a preview of the item when relevant (e.g., link previews, image previews).
- Actions should be contextually relevant to the pressed element.
- Group related actions with separators.
- Destructive actions appear in red at the bottom of the menu.
- Context menus replace the deprecated peek-and-pop (3D Touch) interaction.

### 3.3 Pull-to-Refresh

- Standard pattern for refreshing list/scroll content.
- The system provides `UIRefreshControl` -- use it as-is; do not build custom pull
  mechanisms that deviate from expected behavior.
- The spinner appears below the navigation bar and pushes content down.
- End the refresh promptly; never leave the spinner visible for more than a few seconds
  without content updating.

### 3.4 Swipe Actions

**Trailing swipe (right-to-left gesture):**
- Reserved for destructive or terminal actions: Delete, Archive, Mute.
- Delete actions should be red. Archive can be purple or blue (following Mail conventions).
- Full swipe should trigger the first (primary) action.

**Leading swipe (left-to-right gesture):**
- Reserved for non-destructive, additive actions: Pin, Unread, Flag, Favorite.
- Use green, blue, or orange to signal constructive intent.

**Design rules:**
- Maximum 3 actions per side (but prefer 1-2 for usability).
- Each action needs an icon and a text label.
- Maintain consistency: the same swipe direction should mean the same type of action
  across the entire app.
- Provide the same actions in context menus for discoverability (swipe actions are hidden).

### 3.5 iOS Keyboard Types & Input Accessories

**Keyboard types** (set via `keyboardType`):
- `.default` -- standard QWERTY, general text input.
- `.emailAddress` -- includes `@` and `.` prominently displayed.
- `.URL` -- includes `/`, `.`, and `.com` shortcut.
- `.numberPad` -- digits 0-9 only, no return key.
- `.decimalPad` -- digits 0-9 plus decimal point.
- `.phonePad` -- phone number layout with `+`, `*`, `#`.
- `.numbersAndPunctuation` -- numbers with common punctuation.
- `.twitter` -- includes `@` and `#` (social media handles).
- `.webSearch` -- includes a prominent "Go" button.
- `.asciiCapable` -- standard keyboard without emoji access.

**Design rules for keyboard input:**
- Always use the most specific keyboard type for the field (email fields get email
  keyboard, phone fields get phone pad, etc.).
- When the keyboard appears, scroll the active field into view -- never let the keyboard
  obscure the input.
- Use input accessory views (toolbar above the keyboard) for "Done", "Next", "Previous"
  navigation between fields.
- For numeric-only inputs that need a "Done" button, add a custom input accessory view
  since the number pad has no return key.
- Set `textContentType` to enable AutoFill (`.emailAddress`, `.password`,
  `.oneTimeCode`, `.fullStreetAddress`, etc.).

### 3.6 Haptic Feedback Patterns

iOS provides three feedback generator types via `UIFeedbackGenerator`:

**UIImpactFeedbackGenerator**
- Styles: `.light`, `.medium`, `.heavy`, `.soft`, `.rigid`
- Use for: confirming a physical interaction -- a snap into place, a collision, a weight
  landing. Example: snapping a dragged item into a drop zone.

**UINotificationFeedbackGenerator**
- Types: `.success`, `.warning`, `.error`
- Success: light double-tap. Warning: medium single tap. Error: triple tap with
  increasing intensity.
- Use for: communicating the result of an action. Example: payment succeeded, form
  validation failed, warning threshold reached.

**UISelectionFeedbackGenerator**
- Single subtle tick.
- Use for: scrolling through discrete options (picker wheel, segment changes, slider
  snapping to values). Example: rotating a date picker.

**Design rules:**
- Call `prepare()` before triggering feedback to reduce latency (the Taptic Engine
  enters a prepared state for several seconds).
- Never use haptics purely for decoration or novelty.
- Match haptic type to its documented meaning -- users learn to recognize system-defined
  patterns. Do not pick a haptic "because it feels good."
- Pair haptics with visual and/or auditory feedback for multimodal reinforcement.
- Respect the system's "Vibration" setting -- `UIFeedbackGenerator` automatically
  honors this preference.
- Avoid overuse: too many haptics desensitize the user and reduce the signal value.

### 3.7 System Integration Points

**ShareSheet (Activity View)**
- Presented via `UIActivityViewController`.
- Shows a standard share interface with AirDrop, Messages, Mail, and third-party
  extensions.
- Provide app-specific actions that appear before system actions (e.g., "Copy Link",
  "Add to Collection").
- Supply the correct activity items: `URL`, `String`, `UIImage`, or custom
  `UIActivityItemSource` objects.

**Home Screen Quick Actions (3D Touch / Haptic Touch)**
- Provide up to 4 quick actions accessible via long-press on the app icon.
- Each action needs a title, optional subtitle, and an SF Symbol icon.
- Prioritize the most common user tasks (e.g., "New Message", "Search", "Recent Order").
- Actions should deep-link to the relevant screen immediately.

**Spotlight Integration**
- Index app content with `CSSearchableItem` so it appears in Spotlight search.
- Provide App Shortcuts via App Intents framework for action-based Spotlight results.
- Each shortcut needs a short title and a system image (SF Symbol).
- Focus on habitual, essential actions the user performs frequently.

**Widgets**
- Available in small, medium, large, and extra-large (iPad) sizes.
- Must use SwiftUI and WidgetKit -- no UIKit.
- Design for glanceability: show the most important information at a glance.
- Interactive widgets (iOS 17+): support buttons and toggles that execute actions via
  App Intents without launching the app.
- Provide ample margins; avoid extending content to widget edges.
- Use the system-provided background; avoid custom backgrounds for consistency.
- Text should use the system font in dark gray/black for legibility.

**Live Activities & Dynamic Island**
- Live Activities display real-time data on the Lock Screen and in the Dynamic Island.
- Maximum active duration: 8 hours (system auto-ends after this).
- Compact presentation: two elements flanking the TrueDepth camera. Keep content minimal.
- Expanded presentation: shows when the user long-presses the compact view. Can display
  richer information with leading, trailing, center, and bottom regions.
- Design principle: concentricity -- rounded shapes nest inside each other with even
  margins, harmonizing with the Dynamic Island's pill shape.
- Lock Screen presentation: a banner-style widget below the time. Design for glanceability.
- Use SwiftUI animations for data transitions (default animations are provided from iOS 17).
- Avoid placing critical interactive elements in the compact view -- it is primarily
  informational.

---

## 4. Typography & Spacing System

### 4.1 SF Pro Type Scale

Apple's system font is SF Pro, available in two optical variants:
- **SF Pro Display:** Optimized for sizes 20pt and above. Tighter letter spacing.
- **SF Pro Text:** Optimized for sizes below 20pt. Wider letter spacing for readability.

The system automatically selects the correct variant based on the text style used.

**iOS Dynamic Type text styles at the default "Large" size:**

| Text Style      | Default Size | Weight     | Typical Use                          |
|-----------------|-------------|------------|--------------------------------------|
| `.largeTitle`   | 34pt        | Regular    | Top-level screen titles              |
| `.title1`       | 28pt        | Regular    | Section titles                       |
| `.title2`       | 22pt        | Regular    | Subsection titles                    |
| `.title3`       | 20pt        | Regular    | Grouped content titles               |
| `.headline`     | 17pt        | Semibold   | Emphasized body text, row titles     |
| `.body`         | 17pt        | Regular    | Primary readable content             |
| `.callout`      | 16pt        | Regular    | Secondary descriptive text           |
| `.subheadline`  | 15pt        | Regular    | Tertiary labels, metadata            |
| `.footnote`     | 13pt        | Regular    | Timestamps, auxiliary info           |
| `.caption1`     | 12pt        | Regular    | Captions, annotations                |
| `.caption2`     | 11pt        | Regular    | Smallest readable text               |

**Historical context:**
- iOS 7 introduced 6 text styles: headline, subheadline, body, footnote, caption1, caption2.
- iOS 9 added title1, title2, title3, callout.
- iOS 11 added largeTitle.

### 4.2 Dynamic Type Support

Dynamic Type allows users to choose their preferred text size from the system Settings.
Supporting it is required for App Store editorial features and expected for accessibility.

**Size categories (smallest to largest):**
`xSmall` | `Small` | `Medium` | **`Large` (default)** | `xLarge` | `xxLarge` | `xxxLarge` |
`AX1` | `AX2` | `AX3` | `AX4` | `AX5`

The last five (AX1-AX5) are "Accessibility" sizes for users with visual impairments.

**Design rules:**
- Use system text styles (`UIFont.preferredFont(forTextStyle:)` in UIKit, `.font(.body)`
  in SwiftUI) instead of hardcoded font sizes.
- If using custom fonts, register them for Dynamic Type scaling with
  `UIFontMetrics.default.scaledFont(for:)`.
- Test at the smallest (xSmall) and largest (AX5) sizes.
- At larger accessibility sizes, layouts may need to reflow: horizontal arrangements
  should stack vertically, and truncation should be replaced by wrapping.
- `.caption2` will not scale below 11pt regardless of the user's size preference -- this
  is the platform's minimum readable size.
- Never clamp text at a fixed size; always allow it to scale with the user's preference.

### 4.3 iOS Spacing System

iOS uses an 8pt base unit for spacing, with 4pt as the half-step for fine adjustments.

| Spacing Token          | Value   | Use Case                                   |
|------------------------|---------|---------------------------------------------|
| Content margin         | 16pt    | Leading/trailing padding for screen content  |
| Compact margin         | 8pt     | Tighter layouts, widget interiors            |
| Section spacing        | 35pt    | Vertical gap between grouped sections        |
| List row height        | 44pt    | Minimum tappable height for list rows        |
| Inter-element gap      | 8pt     | Standard gap between sibling elements        |
| Fine gap               | 4pt     | Tight spacing (icon-to-label, badge offset)  |
| Touch target minimum   | 44x44pt | Apple's minimum recommended touch target     |

### 4.4 List Insets and Section Spacing

**Grouped list style (`.insetGrouped`):**
- Leading/trailing inset: 20pt from screen edge (creating the "card" appearance).
- Section header height: varies; typically 18pt font with 6pt top/bottom padding.
- Section footer: smaller font (13pt), used for explanatory text.
- Row separator: 1px line, inset from the leading edge by the cell's text margin.

**Plain list style:**
- Content extends edge-to-edge.
- Section headers are sticky (pin to top during scroll).
- Row separator extends full width.

**Design rules:**
- Maintain at least 8pt vertical gap between heading levels.
- Use at least 4pt between a subheading and its body text.
- Group related controls into sections with descriptive headers and footers.
- Footer text in settings-style screens should explain the effect of the controls above.

---

## 5. Common Mistakes

### 5.1 Patterns That Make an App Feel Non-Native

**Navigation anti-patterns:**
- Using a hamburger/drawer menu as the primary navigation instead of a tab bar. iOS users
  expect bottom tab bars; hamburger menus hide destinations and reduce engagement.
- Placing navigation at the top of the screen in a custom toolbar that does not match
  the system navigation bar's behavior (no large titles, no swipe-back support).
- Implementing a floating action button (FAB) for the primary action. This is a Material
  Design pattern. On iOS, primary actions belong in the navigation bar (right side) or
  as a toolbar button.

**Visual anti-patterns:**
- Applying Material Design ripple effects on tap instead of iOS's highlight/opacity
  dimming behavior.
- Using sharp-cornered cards or containers when iOS uses a standard 10-13pt corner radius.
- Implementing Android-style snackbars or toast messages instead of iOS banners, alerts,
  or in-context status messages.
- Using custom checkbox or radio button styles instead of iOS toggles (`UISwitch`) and
  system-standard selection indicators.
- Bottom sheets that do not use the system's detent behavior (no drag indicator, no
  snap points, no background interaction support).

**Interaction anti-patterns:**
- Disabling or overriding the system swipe-back gesture for navigation.
- Not supporting pull-to-refresh on scrollable content that could be updated.
- Ignoring haptic feedback entirely, or using it indiscriminately.
- Using a back arrow (`<-`) custom icon instead of the system chevron (`<`).

**Layout anti-patterns:**
- Hardcoding layout values instead of using Auto Layout / SwiftUI flexible layouts.
- Ignoring safe areas, causing content to render behind the notch, Dynamic Island,
  or home indicator.
- Not testing on iPhone SE (smallest) and Pro Max (largest) screen sizes.
- Designing only for portrait orientation when users may rotate their device.

### 5.2 Android Patterns Wrongly Used on iOS

| Android Pattern            | iOS Equivalent                                      |
|---------------------------|------------------------------------------------------|
| Hamburger / drawer menu    | Tab bar (bottom, 3-5 tabs)                          |
| Floating Action Button     | Navigation bar button (right) or toolbar button      |
| Material ripple effect     | Opacity dim / highlight state                        |
| Snackbar / Toast           | Banner notification, in-context message, or alert    |
| Top tabs (ViewPager)       | Segmented control or top scope bar                   |
| Bottom sheet (Material)    | Sheet with `.presentationDetents` (system behavior)  |
| Checkbox                   | UISwitch toggle or checkmark accessory               |
| Navigation drawer          | Tab bar + push navigation                            |
| Edge-to-edge status bar    | Respect safe area insets                             |
| Back arrow (`<-`)          | System chevron (`<`) with previous title              |

### 5.3 Performance-Impacting Design Choices

- **Overuse of blur effects:** Multiple overlapping `UIVisualEffectView` layers are
  GPU-intensive. Limit blur usage to 1-2 layers maximum.
- **Unoptimized images:** Serving full-resolution photos in thumbnail contexts. Always
  downscale images to the display size before rendering.
- **Excessive animations:** Complex, long-duration animations (>0.3s) on every
  interaction cause perceived slowness. Keep transitions under 300ms.
- **Main thread blocking:** Performing network calls, image processing, or database
  queries on the main thread causes visible frame drops. All heavy work must be async.
- **Over-rendering in lists:** Complex cell layouts with shadows, rounded corners, and
  gradient backgrounds on every visible cell. Pre-render shadows with
  `shadowPath` and enable `shouldRasterize` judiciously.
- **Memory-heavy view hierarchies:** Deeply nested view hierarchies (10+ levels) slow
  layout passes. Flatten view hierarchies where possible.
- **Large asset bundles:** Including @3x assets without @2x or @1x wastes memory on
  older devices. Use asset catalogs with all required scales, or use SF Symbols / PDFs.

---

## 6. iOS Design Correctness Checklist

Use this checklist to verify that a design meets iOS platform standards before handoff
to development or before App Store submission.

### Navigation & Structure

- [ ] Primary navigation uses a tab bar with 3-5 tabs (not a hamburger menu).
- [ ] Tab bar is always visible and positioned at the screen bottom.
- [ ] Navigation bar uses large titles on top-level screens and inline titles on detail screens.
- [ ] System swipe-back gesture is preserved and functional on all push-navigated screens.
- [ ] Sheets use system detents (`.medium`, `.large`, or custom) with a drag indicator.

### Layout & Responsiveness

- [ ] All content respects safe area insets (no clipping behind notch, Dynamic Island, or home indicator).
- [ ] Layout tested on iPhone SE (375pt width) and Pro Max (440pt width) in both orientations.
- [ ] Touch targets are at least 44x44pt for all interactive elements.
- [ ] Content margins are 16pt (standard) or 20pt (inset grouped lists).
- [ ] Design adapts gracefully when text is scaled to the largest Dynamic Type size (AX5).

### Typography & Visual

- [ ] Text uses system text styles (`.body`, `.headline`, `.caption1`, etc.) or fonts
      registered with `UIFontMetrics` for Dynamic Type support.
- [ ] SF Pro (or system font) is used for UI chrome; custom fonts are reserved for
      brand-specific content areas.
- [ ] Dark Mode is fully supported with appropriate color contrast in both appearances.
- [ ] Destructive actions are colored red; primary actions use the app's tint color.

### Components & Interactions

- [ ] Action sheets are used for contextual choices (not alerts); alerts are used for
      confirmations and acknowledgments.
- [ ] Swipe actions follow convention: trailing for destructive, leading for constructive.
- [ ] Haptic feedback is used for meaningful state changes (toggles, confirmations, selections)
      and matches the correct feedback type.
- [ ] Keyboard type matches the input field's content type (email, URL, number, phone).
- [ ] Pull-to-refresh is implemented on refreshable content using `UIRefreshControl`.

### System Integration

- [ ] ShareSheet uses `UIActivityViewController` with appropriate item types.
- [ ] Home Screen Quick Actions provide 1-4 high-value shortcuts with SF Symbol icons.
- [ ] Widgets (if applicable) are SwiftUI-based, glanceable, and support interactive
      elements on iOS 17+.
- [ ] App content is indexed for Spotlight search where relevant.

### Performance & Quality

- [ ] Scrolling maintains 60fps (120fps on ProMotion) with no visible frame drops.
- [ ] Images are appropriately sized for their display context (not full-res in thumbnails).
- [ ] No main-thread blocking operations during user interaction.

---

## Appendix A: Key Dimensions Quick Reference

```
Status Bar Height
  Dynamic Island devices:  59pt (including island)
  Notch devices:           44pt
  Legacy (no notch):       20pt

Navigation Bar:            44pt (content area)
Tab Bar:                   49pt (content area)
Toolbar:                   44pt

Home Indicator:            34pt (bottom safe area)
Corner Radius (standard):  10-13pt (system cards, grouped lists)
Minimum Touch Target:      44 x 44pt

Standard Content Margins:  16pt (leading/trailing)
Base Spacing Unit:          8pt
Half-Step Unit:             4pt
```

## Appendix B: SF Symbol Usage Guidelines

- Use SF Symbols for all system-integrated iconography (tab bars, navigation bars,
  toolbars, action sheets, quick actions, widgets).
- SF Symbols come in nine weights (ultralight through black) and three scales
  (small, medium, large) to match text alongside them.
- Rendering modes: monochrome (single tint), hierarchical (layered opacity), palette
  (custom multi-color), multicolor (fixed system colors).
- Use hierarchical rendering for depth in toolbar icons.
- Use multicolor for status indicators (e.g., battery, wifi) where color carries meaning.
- Custom symbols can be created in the SF Symbols app and exported for use in Xcode.
- Always prefer an existing SF Symbol over a custom icon when one is available -- users
  recognize system icons, reducing cognitive load.

## Appendix C: Accessibility Beyond Dynamic Type

- **VoiceOver:** Every interactive element must have an accessibility label. Images need
  descriptions. Decorative images should be hidden from VoiceOver.
- **Reduce Motion:** When enabled, replace spring animations and parallax effects with
  simple dissolves. Check `UIAccessibility.isReduceMotionEnabled`.
- **Bold Text:** When enabled, all text should render in a heavier weight. System fonts
  handle this automatically; custom fonts need manual support.
- **Increase Contrast:** When enabled, reduce translucency and increase border/separator
  contrast. Check `UIAccessibility.isDarkerSystemColorsEnabled`.
- **Button Shapes:** When enabled, text buttons should show an underline or background
  shape to indicate tappability.
- **Color Blindness:** Never rely on color alone to convey information. Pair color with
  icons, labels, or patterns.
- **Minimum contrast ratio:** 4.5:1 for body text, 3:1 for large text (per WCAG 2.1 AA).

---

*Researched: 2026-03-07 | Sources: Apple Human Interface Guidelines (developer.apple.com/design/human-interface-guidelines), WWDC 2023 sessions (Design Dynamic Live Activities, Design Shortcuts for Spotlight, Keep Up with the Keyboard), WWDC 2025 (Get to Know the New Design System, Liquid Glass introduction), iOS SDK documentation (UIFeedbackGenerator, UIActivityViewController, WidgetKit), ios-resolution.com, learnui.design iOS font size guidelines, uxpin.com iOS vs Android comparison*
