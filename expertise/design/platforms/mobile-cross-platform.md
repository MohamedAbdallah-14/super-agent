# Cross-Platform Mobile Design

> **Module Type:** Platform
> **Scope:** Design principles, patterns, and conventions for building mobile applications
> that run on both iOS and Android using cross-platform frameworks (Flutter, React Native, .NET MAUI).
> **Last Updated:** 2026-03-07

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

### 1.1 The Cross-Platform Design Challenge: Consistency vs Platform Fidelity

Cross-platform mobile design operates on a fundamental tension: users expect apps to
feel native to their platform, while teams want a unified brand identity and reduced
design/development overhead. This tension manifests in every decision from navigation
structure to button shape.

**Platform fidelity** means respecting the conventions users already know. iOS users
expect edge-swipe-to-go-back, bottom tab bars, and SF Pro typography. Android users
expect the system back gesture (now predictive back in Android 14+), Material Design
components, and Roboto typography. When an app violates these expectations, it creates
cognitive friction -- the app "feels wrong" even if the user cannot articulate why.

**Brand consistency** means that a user switching between iOS and Android recognizes the
same product: the same color palette, the same information architecture, the same
feature set. This does not require pixel-identical screens.

The resolution is a layered strategy:

| Layer | Approach | Example |
|---|---|---|
| Brand identity | Unified across platforms | Colors, logo, illustration style, tone |
| Information architecture | Unified across platforms | Same screens, same feature set, same flows |
| Interaction patterns | Adapted per platform | Back navigation, pull-to-refresh feel, gestures |
| System-level components | Native per platform | Alerts, date pickers, share sheets, keyboards |
| Custom components | Unified with minor tweaks | Cards, feeds, dashboards, charts |

> **Principle:** Share intent, adapt interaction. The user should accomplish the same
> tasks in the same number of steps on both platforms, but the micro-interactions should
> feel native.

### 1.2 Framework Approaches

#### Flutter (Material + Cupertino)

Flutter renders its own pixels via the Skia/Impeller engine, meaning it does not use
native platform UI components by default. This gives Flutter apps pixel-perfect
consistency across platforms but requires deliberate effort to feel native.

Flutter provides two widget libraries:

- **Material widgets** -- Implement Material Design 3 guidelines. Default on Android.
- **Cupertino widgets** -- Implement Apple Human Interface Guidelines. Used on iOS.

Flutter also provides **adaptive constructors** on several widgets that automatically
switch between Material and Cupertino variants based on the running platform:

```dart
// These automatically use Cupertino variants on iOS:
Switch.adaptive(value: _value, onChanged: _onChanged);
Slider.adaptive(value: _value, onChanged: _onChanged);
CircularProgressIndicator.adaptive();
```

Additional automatic platform adaptations in Flutter include:

- **Typography:** Material package defaults to Roboto on Android and San Francisco on iOS.
- **Icons:** Overflow menu dots are horizontal on iOS, vertical on Android. Back arrows
  are a simple chevron on iOS and have a stem on Android.
- **Scrolling physics:** iOS uses bouncing scroll physics; Android uses clamping physics.
- **Haptic feedback:** Text field long-press triggers a buzz on Android, not on iOS.
  Picker scrolling triggers a light impact knock on iOS, not on Android.

> **Reference:** Flutter Automatic Platform Adaptations
> (https://docs.flutter.dev/ui/adaptive-responsive/platform-adaptations)

**Best practice for Flutter:** Use Material widgets as the base, then swap to Cupertino
for input, selection, and system-information widgets on iOS. Use adaptive constructors
where available. For navigation chrome (app bar, tab bar), consider platform-branching.

#### React Native (Platform-Adaptive)

React Native uses actual native platform views, so components inherently look and feel
native. The challenge is the inverse of Flutter: ensuring brand consistency when the
underlying components differ.

React Native provides two mechanisms for platform adaptation:

1. **Platform module** -- Runtime detection and conditional rendering:

```javascript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
});
```

2. **Platform-specific file extensions** -- Separate files that React Native resolves
   automatically:

```
Button.ios.js    // iOS-specific implementation
Button.android.js // Android-specific implementation
Button.js        // Shared fallback
```

React Native also provides platform-specific components like `ActionSheetIOS`,
`ToastAndroid`, and `DrawerLayoutAndroid`.

> **Reference:** React Native Platform-Specific Code
> (https://reactnative.dev/docs/platform-specific-code)

**Best practice for React Native:** Create a shared component library with a unified API
surface, using platform-specific files or `Platform.select()` internally to render
appropriate native components.

#### .NET MAUI

.NET MAUI (Multi-platform App UI) uses a **Handler architecture** that maps
cross-platform controls to platform-native views. Handlers replaced the older
Xamarin.Forms renderer system, providing more modular, performant, and testable
control customization.

Each UI element delegates platform-specific behavior to a handler, which translates
MAUI controls into native views at runtime. Mappers handle property changes per
platform (background color, border styles, text sizes).

**Best practice for .NET MAUI:** Leverage the handler architecture for custom controls
that need platform-specific behavior. Use MAUI's built-in controls, which already
map to native components, for standard UI elements.

### 1.3 "Write Once, Adapt Per Platform" vs "Lowest Common Denominator"

The **lowest common denominator** approach uses only features and patterns available
identically on both platforms. This produces apps that feel foreign on both platforms --
neither truly iOS nor truly Android. Avoid this.

The **write once, adapt per platform** approach shares:
- Business logic and state management (100% shared)
- Screen structure and layout (90-95% shared)
- Custom visual components like cards, charts, avatars (85-95% shared)

And adapts:
- Navigation chrome and back behavior (platform-specific)
- System-level UI (alerts, pickers, share sheets) (platform-native)
- Gestures and haptics (platform-convention)
- Typography rendering and font selection (platform-appropriate)

The adaptation layer is typically 5-15% of the total UI code. This overhead is
dramatically less expensive than maintaining two separate native codebases, while
producing an experience that respects both platforms.

### 1.4 When to Use Platform-Specific vs Custom Unified Components

**Use platform-specific (native) components when:**
- The component is a system-level interaction (alerts, action sheets, date pickers)
- Users have strong muscle memory for the pattern (back navigation, pull-to-refresh)
- The OS provides accessibility features tied to the native component
- The component interacts with system UI (keyboards, notification permissions)

**Use custom unified components when:**
- The component represents your brand identity (cards, feed items, profile layouts)
- The component has no native equivalent (custom charts, onboarding flows)
- The interaction pattern is identical across platforms (scrolling a list, tapping a card)
- You need visual consistency for marketing or brand reasons

**Hybrid approach for common patterns:**
- Bottom tab bar: Use the same information architecture, but render with native
  styling (Cupertino tab bar on iOS, Material NavigationBar on Android)
- Buttons: Custom styled for brand, but with platform-appropriate feedback
  (iOS opacity fade, Android ripple effect)
- Text inputs: Custom styled container, but native keyboard and text selection behavior

---

## 2. Layout & Navigation Patterns

### 2.1 Navigation Patterns That Work Cross-Platform

#### Bottom Tab Navigation (with Adaptation)

Bottom tabs are the single most portable navigation pattern. Both iOS and Android
have standardized bottom navigation:

- **iOS:** UITabBarController -- bottom tab bar with labels, up to 5 items.
  With iOS 26 Liquid Glass, tab bars now shrink on scroll and expand when
  scrolling back up.
- **Android:** Material NavigationBar -- bottom navigation with 3-5 destinations,
  icons with optional labels.

Cross-platform implementation:

| Aspect | iOS Convention | Android Convention | Recommendation |
|---|---|---|---|
| Label visibility | Always visible | Icons only or icons+labels | Always show labels for accessibility |
| Active indicator | Tinted icon + label | Pill-shaped indicator behind icon | Follow platform convention |
| Tab count | 3-5 (More tab for overflow) | 3-5 (no overflow) | Limit to 4-5 max |
| Tab switching | Preserves scroll position | May reset view state | Preserve state on both |
| Badge style | Red circle with count | Small dot or count | Follow platform style |

#### Stack Navigation

Both platforms use a push/pop stack model for drilling into content. The chrome
differs but the concept is universal:

- **iOS:** UINavigationController with large titles, back chevron with previous
  screen title, edge-swipe to go back.
- **Android:** TopAppBar with back arrow, system back gesture (predictive back
  in Android 14+).

#### Patterns That Translate Well

- **Search:** Top search bar (both platforms use this pattern).
- **Pull-to-refresh:** Universal concept, though the visual indicator differs
  (iOS uses a spinner, Material uses a circular progress indicator).
- **Infinite scroll / pagination:** Identical on both platforms.
- **Modal sheets:** Both platforms support bottom sheets and full-screen modals.
  Half-sheet / drag-to-dismiss modals are now standard on both.

### 2.2 Patterns That MUST Differ

#### Back Navigation

This is the single most critical difference between iOS and Android:

**iOS:**
- Edge swipe from the left edge of the screen navigates back.
- The navigation bar shows a back button (chevron + previous screen title).
- There is no system-level back affordance outside the app's own UI.
- Users expect the swipe gesture everywhere within a navigation stack.

**Android:**
- System back button/gesture handles back navigation globally.
- **Predictive back (Android 14+):** When the user swipes from the edge, Android
  shows a preview of the destination before the gesture completes. The current
  screen shrinks and shifts, revealing what is behind it.
- The app must declare support for predictive back via `enableOnBackInvokedCallback`.
- Back behavior may exit the app, pop a fragment, dismiss a modal, or close a drawer
  depending on the back stack state.

> **Reference:** Android Predictive Back Design
> (https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back)

**Cross-platform implementation:**
- On iOS: Implement interactive swipe-back with the navigation controller.
- On Android: Support predictive back animations. Do not intercept the system
  back gesture unless absolutely necessary.
- In Flutter: Use `PopScope` (replacement for `WillPopScope`) and enable
  predictive back via `android:enableOnBackInvokedCallback="true"` in the manifest.
- In React Native: Use `BackHandler` on Android; rely on navigation library's
  gesture handler on iOS.

#### Pull-to-Refresh Behavior

While both platforms support pull-to-refresh, the visual treatment differs:

- **iOS:** A spinning activity indicator appears above the list content. The content
  bounces past its top edge (rubber-band effect).
- **Android (Material):** A circular progress indicator descends from the top,
  overlaying the content. The content does not bounce.

Use the platform's native refresh indicator. Do not force the iOS spinner onto
Android or vice versa.

#### Swipe Gestures on List Items

- **iOS:** Swipe-to-reveal actions is a core pattern (swipe left for delete, swipe
  right for archive). Users expect full-swipe to perform the primary action.
- **Android:** Swipe gestures on list items are less standardized. Material Design
  supports swipe-to-dismiss but it is less ingrained in user expectations.

#### Context Menus and Long-Press

- **iOS:** Long-press triggers context menus with a blur/scale preview animation.
  3D Touch / Haptic Touch provides "peek and pop" on supported devices.
- **Android:** Long-press triggers contextual action bars or popup menus. Material
  Design uses a simpler popup menu without the preview animation.

### 2.3 Screen Size Strategy Across iOS and Android Device Ranges

#### iOS Device Landscape

iOS has a relatively constrained set of screen sizes:

| Device Class | Screen Width (points) | Example |
|---|---|---|
| iPhone SE | 375 | iPhone SE 3rd gen |
| iPhone standard | 390-393 | iPhone 15, iPhone 16 |
| iPhone Pro Max | 430-440 | iPhone 16 Pro Max |
| iPad Mini | 744 | iPad Mini 6th gen |
| iPad | 820-1024 | iPad Air, iPad Pro |

#### Android Device Landscape

Android has enormous screen size variation:

| Device Class | Screen Width (dp) | Examples |
|---|---|---|
| Compact phone | 320-360 | Budget Android devices |
| Standard phone | 360-400 | Pixel 8, Samsung Galaxy S24 |
| Large phone | 400-480 | Samsung Galaxy S24 Ultra |
| Foldable (folded) | 280-400 | Galaxy Z Fold (cover) |
| Foldable (unfolded) | 600-840 | Galaxy Z Fold (inner) |
| Tablet | 600-1280 | Samsung Galaxy Tab, Pixel Tablet |

#### Cross-Platform Screen Strategy

1. **Design for 360-393 dp/pt as the baseline.** This covers the majority of both
   iOS and Android devices.
2. **Test at 320dp minimum** to catch overflow on compact Android devices.
3. **Use flexible layouts** (Flex/Row/Column with flex factors) rather than fixed
   widths for all content areas.
4. **Define breakpoints for layout shifts:**
   - Compact: < 600dp -- Single column, bottom nav
   - Medium: 600-840dp -- Two-column possible, rail nav or bottom nav
   - Expanded: > 840dp -- Multi-column, navigation rail or drawer
5. **Avoid designing only for the "hero" device.** A design that looks perfect on
   iPhone 16 Pro Max may overflow on an Android device at 320dp.

### 2.4 Safe Area Handling Across Platforms

Modern devices have non-rectangular screens with notches, Dynamic Island (iPhone),
hole-punch cameras (Android), rounded corners, and home indicators. Safe areas define
the region where content is fully visible and interactive.

#### iOS Safe Areas

iOS provides `safeAreaInsets` that account for:
- Status bar height (Dynamic Island, notch, or standard)
- Home indicator at the bottom (devices without a physical home button)
- Rounded corners
- Navigation bar and tab bar overlays (especially with iOS 26 Liquid Glass where
  bars use translucent materials)

#### Android Safe Areas

Android provides:
- `WindowInsets` for system bars, display cutouts, and navigation bars
- Edge-to-edge display (default in Android 15+) where apps draw behind system bars
- `displayCutout` insets for notch and hole-punch cameras

#### Cross-Platform Implementation

**React Native:** Use `react-native-safe-area-context` (not the built-in `SafeAreaView`
which is iOS-only and limited). The library provides `SafeAreaView` component and
`useSafeAreaInsets()` hook that work on both platforms:

```javascript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      {/* Content */}
    </View>
  );
}
```

> **Reference:** React Navigation Safe Areas
> (https://reactnavigation.org/docs/handling-safe-area/)

**Flutter:** Use `SafeArea` widget or `MediaQuery.of(context).padding` to access
safe area insets. Flutter handles safe areas automatically in `Scaffold` with
`AppBar` and `BottomNavigationBar`.

```dart
SafeArea(
  child: Scaffold(
    // Scaffold already handles safe areas for its app bar and bottom bar
    body: MyContent(),
  ),
)
```

**Key rules:**
- Always test in landscape orientation -- safe areas change significantly.
- Never hardcode status bar or notch heights. Always use system-provided insets.
- Account for the home indicator area on both platforms (bottom inset).
- On Android with edge-to-edge, draw decorative content (backgrounds, images)
  behind system bars but keep interactive content within safe areas.

---

## 3. Component Conventions

### 3.1 Components That Should Look the Same Everywhere

These components represent your brand and have no strong platform convention requiring
differentiation:

**Cards and content containers:**
Cards with rounded corners, shadows/elevation, and content layout are universal.
Neither platform has a strongly opinionated native card component, so your custom
card design works everywhere.

**List items and feeds:**
The structure of list items (leading icon, title, subtitle, trailing action) is
consistent across platforms. Style them with your brand typography and colors.

**Avatars and profile elements:**
User avatars, profile headers, and social elements have no platform convention.

**Charts and data visualization:**
Custom visualizations should be identical for brand consistency and data integrity.

**Onboarding and empty states:**
Illustrations, empty state messages, and onboarding carousels are brand-specific.

**Custom action buttons:**
Primary CTA buttons (e.g., "Add to Cart", "Book Now") should maintain brand identity.
However, adapt the touch feedback: opacity reduction on iOS, ripple on Android.

**Media content:**
Image galleries, video players (custom chrome), and audio players.

### 3.2 Components That MUST Be Platform-Native

Using custom implementations of these components creates the most jarring
cross-platform violations:

#### Alerts and Dialogs

| Aspect | iOS (Cupertino) | Android (Material) |
|---|---|---|
| Shape | Rounded rectangle, centered | Rounded rectangle, centered |
| Title | Bold, centered | Bold, left-aligned (MD3) |
| Actions | Side-by-side buttons, bold for primary | Stacked or side-by-side text buttons |
| Destructive action | Red text | Follows Material color system |
| Style | Translucent blur background | Elevated surface with scrim |

**Never** show a Material-styled dialog on iOS or a Cupertino-styled alert on Android.
Users interact with system alerts across all apps; non-native alerts feel like malware.

- In Flutter: Use `showCupertinoDialog` on iOS and `showDialog` with `AlertDialog`
  on Android.
- In React Native: Use the `Alert` API which automatically uses native alerts on both
  platforms.

#### Action Sheets / Bottom Sheets

- **iOS:** `UIActionSheet` / `CupertinoActionSheet` -- slides up from the bottom with
  a cancel button separated by a gap. Translucent blurred background.
- **Android:** Material Bottom Sheet -- slides up, attached to bottom edge. Can be
  modal or persistent. No separated cancel button.

#### Date and Time Pickers

This is one of the most visible platform differences:

- **iOS:** Inline wheel picker or compact picker that expands. Integrated into the
  content flow. Users scroll wheels to select values.
- **Android:** Material Date Picker -- modal dialog with a calendar grid for dates,
  clock face for time. Users tap to select.

**Never** show an iOS-style wheel picker on Android or a calendar grid dialog on iOS.
These components are deeply ingrained in user muscle memory.

- In Flutter: Use `showDatePicker` (Material) vs `showCupertinoDatePicker` based on
  platform.
- In React Native: Use `@react-native-community/datetimepicker` which renders native
  pickers on both platforms.

#### Keyboards and Text Input

Keyboard appearance is entirely OS-controlled and cannot be customized. However, you
must configure the correct keyboard type, return key, and autocorrection behavior:

- Use `keyboardType` appropriate to the field (email, phone, number, URL).
- Set `textContentType` (iOS) and `autoComplete` (Android) for autofill support.
- Configure the return key label (`done`, `next`, `search`, `go`).

#### Share Sheets

Always invoke the native share sheet (`UIActivityViewController` on iOS,
`Intent.ACTION_SEND` on Android). Never build a custom share UI.

#### Permissions Dialogs

Always use system-provided permission dialogs. Custom pre-permission dialogs
("priming screens") can be used before triggering the system dialog, but the actual
permission request must be native.

### 3.3 Gesture Differences

#### iOS Edge-Swipe Back vs Android Predictive Back

| Aspect | iOS | Android |
|---|---|---|
| Trigger | Swipe from left screen edge | Swipe from left or right screen edge |
| Visual feedback | Current screen slides right, previous screen slides in from left | Current screen shrinks and shifts, revealing destination |
| Cancelable | Yes, user can stop mid-gesture | Yes, user can stop mid-gesture |
| Scope | Within app navigation stack only | System-wide, may exit app |
| Implementation | Automatic with UINavigationController | Requires `enableOnBackInvokedCallback` |

#### Tap Feedback

- **iOS:** Buttons reduce opacity on press (typically to 0.6-0.7). No ripple effect.
  Highlighted state is subtle.
- **Android:** Material ripple effect radiates from the touch point. The ripple is
  an expected part of the interaction feedback.

Cross-platform frameworks should use the appropriate feedback:
- In Flutter: Material `InkWell` provides ripple; use `CupertinoButton` for iOS
  opacity feedback or create a custom wrapper that switches.
- In React Native: Use `TouchableOpacity` on iOS and `TouchableNativeFeedback`
  (or `Pressable` with platform-specific `android_ripple`) on Android.

#### Scroll Behavior

- **iOS:** Rubber-band / bounce effect at scroll boundaries. Momentum-based scrolling
  with deceleration.
- **Android:** Edge glow (overscroll glow) effect at scroll boundaries. Predictable
  stop on finger lift with Material 3 stretch overscroll.

Flutter automatically applies the correct scroll physics per platform.
React Native's `ScrollView` also adapts bounce behavior per platform.

### 3.4 Platform-Specific Affordances to Preserve

These small details significantly impact perceived native quality:

**iOS affordances:**
- Large title navigation bars that collapse on scroll
- Haptic feedback on selection changes (picker wheels, toggles)
- Translucent navigation and tab bars with blur (especially with Liquid Glass in iOS 26)
- Dynamic Type support for system font scaling
- The "rubber-band" overscroll effect

**Android affordances:**
- Floating Action Button (FAB) for primary actions in appropriate contexts
- Snackbar for transient messages (instead of iOS-style toast)
- Material You dynamic color theming (using wallpaper-extracted colors)
- Predictive back gesture animations
- Edge-to-edge rendering behind system bars

---

## 4. Typography & Spacing System

### 4.1 Shared Spacing System

The **8dp/pt grid** is the universal foundation for cross-platform spacing. Both
Material Design and Apple HIG align to multiples of 8 for component sizing, margins,
and padding. Some systems use a 4dp sub-grid for fine adjustments.

> **Reference:** Material Design 3 Spacing
> (https://m3.material.io/foundations/layout/understanding-layout/spacing)

#### Core Spacing Scale

Define a shared spacing scale used on both platforms:

```
spacing-0:    0dp
spacing-0.5:  2dp    (4dp sub-grid: micro adjustments)
spacing-1:    4dp    (4dp sub-grid: icon padding, inline spacing)
spacing-2:    8dp    (base unit: minimum component padding)
spacing-3:    12dp   (intermediate: compact list item padding)
spacing-4:    16dp   (standard content margin, card padding)
spacing-5:    20dp   (comfortable component spacing)
spacing-6:    24dp   (section spacing, generous padding)
spacing-8:    32dp   (large section breaks)
spacing-10:   40dp   (screen-level margins on tablets)
spacing-12:   48dp   (touch target minimum height)
spacing-16:   64dp   (major section dividers)
```

**Touch targets:**
- iOS minimum: 44x44 pt (Apple HIG)
- Android minimum: 48x48 dp (Material Design)
- **Cross-platform recommendation:** Use 48dp minimum to satisfy both, with at least
  8dp spacing between adjacent targets.

#### Screen Margins

- **Compact screens (phones):** 16dp horizontal margin is standard on both platforms.
- **Medium screens (large phones, small tablets):** 24dp margins.
- **Expanded screens (tablets):** 24-40dp margins, or use a max-width content container.

### 4.2 Font Strategy

Three viable approaches, each with tradeoffs:

#### Option A: System Fonts (Recommended for Most Apps)

Use the system font on each platform: **SF Pro** on iOS, **Roboto** on Android.

| Pros | Cons |
|---|---|
| Feels maximally native | Slightly different visual identity per platform |
| Zero bundle size overhead | Text metrics differ slightly (may affect layouts) |
| Automatic support for Dynamic Type (iOS) and font scaling (Android) | Cannot use for web without licensing concerns (SF Pro) |
| OS-level rendering optimizations | |
| SF Pro supports Liquid Glass vibrancy on iOS 26 | |

Flutter automatically uses the correct system font when using the Material or
Cupertino packages. React Native uses system fonts by default.

#### Option B: Custom Brand Font (for Strong Brand Identity)

Use a single custom font (e.g., **Inter**, **IBM Plex Sans**, **Geist**) on both
platforms.

| Pros | Cons |
|---|---|
| Identical visual identity everywhere | Adds to app bundle size (100-400KB for variable font) |
| Consistent text metrics = consistent layouts | Does not benefit from OS-level font optimizations |
| Works across mobile, web, and desktop | May feel slightly foreign on both platforms |
| Variable fonts reduce weight count | Must handle Dynamic Type / font scaling manually |

If choosing a custom font, prefer **variable fonts** (e.g., Inter Variable, Roboto Flex)
over multiple static weights. A single variable font file replaces 6-10 weight files,
reducing bundle size by up to 80%.

> The Inter font family is designed specifically for computer screens with tall x-height
> for readability, and covers Latin, Cyrillic, and Greek scripts. It is widely used as
> a cross-platform bridge font.

#### Option C: Hybrid (Platform Fonts for Body, Brand Font for Headlines)

Use SF Pro / Roboto for body text (readability, native feel) and a brand font for
headlines and display text (identity). This is a good compromise but adds complexity.

**Recommendation:** For most applications, Option A (system fonts) is the best default.
Choose Option B only when brand identity is a top priority and you are willing to
invest in testing font scaling, accessibility, and layout consistency. Option C
is appropriate for apps with strong typographic brand identities (media, fashion,
luxury).

### 4.3 Type Scale That Works Cross-Platform

Define a shared semantic type scale that maps to appropriate sizes on each platform.
Use semantic names (not pixel values) in your design system:

```
display-large:     34sp/pt   -- Hero text, landing screens
display-medium:    28sp/pt   -- Major section headers
headline-large:    24sp/pt   -- Screen titles
headline-medium:   20sp/pt   -- Section titles
title-large:       18sp/pt   -- Card titles, dialog titles
title-medium:      16sp/pt   -- Subsection titles
body-large:        16sp/pt   -- Primary body text
body-medium:       14sp/pt   -- Secondary body text
body-small:        12sp/pt   -- Captions, helper text
label-large:       14sp/pt   -- Button text, tab labels
label-medium:      12sp/pt   -- Small labels, badges
label-small:       11sp/pt   -- Micro labels, timestamps
```

This scale aligns with Material Design 3's type scale while also working within
Apple HIG's recommended sizing ranges.

**Line heights** should follow the 4dp sub-grid:

```
display-large:     40dp line-height  (34 + ~6 leading)
headline-large:    32dp line-height  (24 + 8 leading)
body-large:        24dp line-height  (16 + 8 leading)
body-medium:       20dp line-height  (14 + 6 leading)
body-small:        16dp line-height  (12 + 4 leading)
```

**Font weight mapping:**

| Semantic Weight | Value | iOS (SF Pro) | Android (Roboto) |
|---|---|---|---|
| Regular | 400 | Regular | Regular |
| Medium | 500 | Medium | Medium |
| Semibold | 600 | Semibold | (use Medium or Bold) |
| Bold | 700 | Bold | Bold |

Note: Roboto does not have a native Semibold weight. If your type scale uses Semibold,
map it to Medium (500) on Android or use Roboto's variable font axis for precise
weight matching.

#### Accessibility: Dynamic Type and Font Scaling

Both platforms support user-controlled font scaling:

- **iOS Dynamic Type:** Seven accessibility sizes from xSmall to xxxLarge, plus five
  additional Accessibility sizes. Apps using system fonts with `UIFontTextStyle`
  get this automatically.
- **Android Font Scale:** System-wide font size multiplier (default 1.0, up to 2.0).
  Apps using `sp` units scale automatically.

**Cross-platform rules:**
1. Always use scalable units (sp on Android, Dynamic Type on iOS).
2. Test at 200% font scale on both platforms.
3. Do not cap font scaling for body text (this is an accessibility violation).
4. Constrain scaling for decorative or display text only if it breaks layout.
5. Ensure containers expand vertically to accommodate larger text.
6. Test that scaled text does not overlap or get clipped.

---

## 5. Common Mistakes

### 5.1 Using iOS Design Language on Android (or Vice Versa)

**The mistake:** Shipping an iOS-designed app directly to Android (or the reverse)
without platform adaptation.

**How it manifests:**
- iOS-style segmented controls on Android (Android has tabs or chips)
- Cupertino-style date picker wheels on Android (Android uses calendar/clock dialogs)
- Material-style FAB on iOS (iOS does not use FABs as a primary pattern)
- Material-style navigation drawer on iOS (iOS uses bottom tabs)
- Back arrows with stems (Android style) appearing on iOS
- iOS-style alert dialogs with side-by-side buttons on Android

**Why it matters:** Users interact with dozens of apps daily. When your app uses the
wrong platform's conventions, it creates an uncanny valley effect. Users subconsciously
perceive the app as low-quality, untrustworthy, or difficult to use.

**Fix:** Audit every system-level interaction component against both Apple HIG and
Material Design 3 guidelines. Use platform-adaptive components provided by your
framework.

### 5.2 Ignoring Platform Conventions for "Consistency"

**The mistake:** Forcing pixel-identical UI on both platforms in the name of brand
consistency, overriding native behaviors.

**How it manifests:**
- Custom back button that ignores the system back gesture on Android
- Custom scroll behavior that does not bounce on iOS
- Custom text selection handles that do not match the platform
- Custom keyboard accessories that break native autofill
- Identical alert dialogs on both platforms using a custom component
- Same pull-to-refresh animation on both platforms

**Why it matters:** Functional consistency (same features, same flows) matters to
users. Visual consistency at the component level does not. Users do not compare your
iOS and Android apps side by side. They compare your Android app to every other Android
app on their phone.

**Fix:** Consistency should live at the brand level (colors, imagery, tone, IA) and
the feature level (same capabilities). Component-level rendering should follow
platform conventions.

### 5.3 Not Testing on Both Platforms

**The mistake:** Developing primarily on one platform (often iOS, because designers
tend to use Macs) and treating the other as an afterthought.

**How it manifests:**
- Text overflow issues on Android where screen widths are smaller (320dp)
- Navigation bugs when using the Android system back button
- Status bar content invisible against colored backgrounds on one platform
- Safe area issues on devices with different notch shapes
- Font rendering differences causing layout shifts
- Keyboard behavior differences causing input fields to be obscured

**Testing requirements:**
- Test on at least one iOS device and one Android device (physical devices preferred)
- Test on the smallest supported screen width (320dp Android, 375pt iOS)
- Test on the largest screen (tablet if supported)
- Test with font scaling at maximum (200%)
- Test with system dark mode on both platforms
- Test with screen reader (VoiceOver on iOS, TalkBack on Android)
- Test with right-to-left (RTL) language if your app supports localization

### 5.4 Performance-Impacting Design Choices

**The mistake:** Designing visual effects that are expensive to render in cross-platform
frameworks, particularly on lower-end Android devices.

**Specific anti-patterns:**

| Design Choice | Performance Impact | Alternative |
|---|---|---|
| Heavy box shadows with large blur radius | Forces CPU-based compositing | Use `elevation` on Android, subtle shadows on iOS |
| Gaussian blur backgrounds | Expensive real-time computation | Use solid color with opacity, or pre-rendered blurred images |
| Complex gradient animations | Continuous GPU draw calls | Use static gradients, animate opacity instead |
| Multiple overlapping transparent layers | Overdraw multiplies rendering cost | Flatten visual hierarchy, reduce layer count |
| Large unoptimized images in lists | Memory pressure, janky scrolling | Resize images server-side, use progressive loading |
| Animated SVGs during scroll | Competes with scroll rendering | Pause animations during scroll, use raster for complex graphics |
| Excessive use of `ClipRRect` (Flutter) | Forces saveLayer, expensive | Use `decoration` with `borderRadius` instead |

**Performance budgets:**
- Target 60 FPS (16.67ms per frame) on both platforms
- On Flutter: Use Impeller rendering engine (default on iOS, available on Android)
  for hardware-accelerated shaders and consistent frame pacing
- On React Native: Use the New Architecture (Fabric renderer + TurboModules) for
  reduced bridge overhead on animations
- Test on mid-range Android devices (not just flagship phones). A design that runs
  smoothly on a Pixel 8 may stutter on a budget device with 3GB RAM

### 5.5 Ignoring Design Tokens for Cross-Platform Consistency

**The mistake:** Defining colors, spacing, and typography values directly in platform
code without a shared design token system.

**How it manifests:**
- "Slightly different shades of blue" on iOS and Android
- Inconsistent padding and margins between platforms
- Typography weights that do not match across platforms
- Dark mode colors defined independently and diverging over time

**Fix:** Use a design token system. The W3C Design Tokens specification reached v1.0
stability in October 2025. Tools like Tokens Studio (Figma plugin) and Style Dictionary
can export tokens to Swift, Kotlin, Dart, and JavaScript from a single source of truth.

Token structure example:
```json
{
  "color": {
    "primary": { "$value": "#1a73e8", "$type": "color" },
    "surface": { "$value": "#ffffff", "$type": "color" },
    "on-surface": { "$value": "#1c1b1f", "$type": "color" }
  },
  "spacing": {
    "sm": { "$value": "8", "$type": "dimension" },
    "md": { "$value": "16", "$type": "dimension" },
    "lg": { "$value": "24", "$type": "dimension" }
  },
  "typography": {
    "body": {
      "fontSize": { "$value": "16", "$type": "dimension" },
      "lineHeight": { "$value": "24", "$type": "dimension" },
      "fontWeight": { "$value": "400", "$type": "number" }
    }
  }
}
```

### 5.6 Neglecting Platform-Specific Accessibility

**The mistake:** Implementing accessibility generically without accounting for
platform-specific assistive technology behaviors.

**How it manifests:**
- Semantic labels that work with VoiceOver but not TalkBack (or vice versa)
- Custom components missing `accessibilityRole` mappings per platform
- Ignoring iOS `accessibilityTraits` or Android `contentDescription` conventions
- Not testing with platform-specific switch control or voice control

**Fix:** Test with the native screen reader on each platform. Use the framework's
accessibility APIs that map to native accessibility trees.

---

## 6. Checklist

### Cross-Platform Design Verification Checklist

Use this checklist before shipping any cross-platform mobile release. Every item should
be verified on both iOS and Android.

#### Platform Fidelity

- [ ] **Navigation pattern matches platform convention.** iOS uses bottom tab bar
  with Cupertino styling. Android uses Material NavigationBar or navigation rail.
- [ ] **Back navigation works natively.** iOS supports edge-swipe back. Android
  supports system back gesture with predictive back animation.
- [ ] **Alerts and dialogs use native components.** iOS shows Cupertino alerts.
  Android shows Material dialogs. No custom alert UI for system-level interactions.
- [ ] **Date and time pickers use native components.** iOS shows wheel/compact picker.
  Android shows Material calendar/clock dialog.
- [ ] **Share sheet invokes the native OS share UI** on both platforms.
- [ ] **Tap feedback matches platform.** iOS uses opacity change. Android uses
  Material ripple effect.
- [ ] **Scroll physics match platform.** iOS bounces at boundaries. Android shows
  edge glow or stretch overscroll.

#### Layout and Responsiveness

- [ ] **Tested at minimum screen width.** 320dp on Android, 375pt on iOS. No text
  overflow, no clipped components, no horizontal scroll on single-column layouts.
- [ ] **Safe areas handled correctly.** Content does not render behind notches,
  Dynamic Island, home indicators, or system bars. Tested in both portrait and
  landscape orientations.
- [ ] **Keyboard behavior verified.** Input fields are not obscured by the keyboard
  on either platform. Scroll-to-field behavior works. Return key is configured
  correctly.

#### Typography and Accessibility

- [ ] **Font scaling tested at 200%.** Body text scales correctly. Containers expand
  to accommodate larger text. No text truncation on critical information.
- [ ] **Screen reader audit completed.** All interactive elements have meaningful labels.
  Tested with VoiceOver (iOS) and TalkBack (Android). Reading order is logical.
- [ ] **Touch targets meet minimum size.** At least 44pt on iOS, 48dp on Android.
  At least 8dp spacing between adjacent targets.
- [ ] **Color contrast meets WCAG AA.** 4.5:1 for body text, 3:1 for large text,
  on both light and dark themes.

#### Visual Consistency and Brand

- [ ] **Brand colors, imagery, and iconography are consistent** across platforms.
  Verified against design tokens or shared style guide.
- [ ] **Dark mode implemented and tested** on both platforms. System dark mode
  toggle is respected. All screens verified in both themes.
- [ ] **Design tokens are the single source of truth.** Colors, spacing, and typography
  are not hardcoded per-platform. A shared token system generates platform values.

#### Performance

- [ ] **60 FPS maintained during scrolling and animations** on mid-range Android device
  (not just flagship hardware). Flutter DevTools or React Native Performance Monitor
  used to verify.
- [ ] **No excessive overdraw or GPU saturation** from layered transparent elements,
  blur effects, or complex shadows on mid-range devices.
- [ ] **Images are appropriately sized and cached.** List views with images scroll
  smoothly without memory spikes.

#### Testing Coverage

- [ ] **Tested on physical devices** -- at least one iOS device and one Android device.
  Emulators/simulators alone are insufficient for gesture, haptic, and performance
  verification.
- [ ] **Tested with RTL language** (if localization is supported). Layout mirrors
  correctly. Text alignment and icon direction are appropriate.

---

## References

### Official Platform Guidelines

- **Apple Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/
- **Material Design 3:** https://m3.material.io/
- **Apple Liquid Glass (iOS 26):** https://developer.apple.com/design/new-design-gallery/

### Framework Documentation

- **Flutter Platform Adaptations:** https://docs.flutter.dev/ui/adaptive-responsive/platform-adaptations
- **Flutter Adaptive Best Practices:** https://docs.flutter.dev/ui/adaptive-responsive/best-practices
- **Flutter Cupertino Widgets:** https://docs.flutter.dev/ui/widgets/cupertino
- **React Native Platform-Specific Code:** https://reactnative.dev/docs/platform-specific-code
- **Android Predictive Back:** https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back
- **Android Predictive Back Implementation:** https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture
- **Flutter Predictive Back Integration:** https://docs.flutter.dev/platform-integration/android/predictive-back

### Layout and Navigation

- **Material Design 3 Layout Spacing:** https://m3.material.io/foundations/layout/understanding-layout/spacing
- **React Navigation Safe Areas:** https://reactnavigation.org/docs/handling-safe-area/
- **Expo Safe Areas:** https://docs.expo.dev/develop/user-interface/safe-areas/
- **NNGroup Mobile Navigation Patterns:** https://www.nngroup.com/articles/mobile-navigation-patterns/

### Design Tokens

- **W3C Design Tokens Specification:** https://www.w3.org/community/design-tokens/
- **Tokens Studio:** https://tokens.studio/

### Typography

- **Material Design Typography:** https://m1.material.io/style/typography.html
- **8-Point Grid System:** https://spec.fm/specifics/8-pt-grid
- **Inter Font Family:** https://rsms.me/inter/

### Cross-Platform Analysis

- **Toptal: Avoiding Bad Practices in iOS and Android Design:** https://www.toptal.com/developers/android/android-and-ios-app-design-tips
- **UXPin: Cross-Platform Experience Guide:** https://www.uxpin.com/studio/blog/cross-platform-experience/
- **InfoQ: iOS and Android Design Guidelines for React Native:** https://www.infoq.com/articles/ios-android-react-native-design-patterns/
- **iTitans: Design Tokens for Cross-Platform Consistency:** https://ititans.com/blog/cross-platform-mobile-ui-with-design-tokens/
