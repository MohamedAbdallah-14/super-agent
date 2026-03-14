# Dark Mode & Theming

> Discipline module for designing, implementing, and maintaining light/dark themes,
> custom branded themes, high-contrast accessibility modes, and system-preference-aware
> color scheme switching across web and native platforms.

---

## 1. What This Discipline Covers

### 1.1 Scope

Dark mode and theming encompasses every decision that governs how a product's visual
appearance adapts to user preference, ambient conditions, and accessibility needs.

**Core concerns:**

- **Light and dark themes** -- two canonical appearance modes every modern product must
  support. Light mode uses dark content on light backgrounds; dark mode reverses this
  relationship with careful adjustments (not simple inversion).
- **Custom/branded themes** -- variants tied to brand identity, white-labeling, or user
  personalization (accent colors, density, font choices).
- **High-contrast mode** -- an accessibility-first appearance that maximizes contrast
  ratios beyond standard requirements for users with low vision.
- **System theme following** -- respecting the OS or browser preference for light/dark
  appearance while offering an explicit override toggle.
- **Per-surface theming** -- nested or sectional theme overrides within a single
  viewport (e.g., a dark sidebar inside a light app shell).

### 1.2 Why It Matters

- **Reduced eye strain**: dark themes lower luminance in low-light conditions.
- **Battery savings**: on OLED/AMOLED displays, darker pixels consume less power.
  Google confirmed YouTube dark mode reduces battery usage by 15-60%.
- **Accessibility**: users with photosensitivity, migraine disorders, or low vision
  depend on theme options. WCAG 2.2 and the emerging WCAG 3.0 / APCA standard both
  recognize the need for adaptive color schemes.
- **User expectation**: over 80% of smartphone users have enabled dark mode at the OS
  level. Failure to support it signals neglect.
- **Brand expression**: theming architecture enables white-label products, seasonal
  campaigns, and personalization without code changes.

---

## 2. Core Methods & Frameworks

### 2.1 Material Design 3 -- Dark Theme

M3 fundamentally changed dark themes. The key shift: **surfaces use tonal elevation,
not shadows**.

**Tonal elevation model:**

Elevation is expressed through tonal color overlays derived from the primary color
slot, rather than drop shadows or opacity overlays. Higher-elevation surfaces receive
an increasingly prominent tint of the primary color.

| Elevation Level | Tonal Overlay | Typical Usage                    |
|-----------------|---------------|----------------------------------|
| Level 0         | 0% tint       | Page background                  |
| Level 1         | +5% primary   | Cards, elevated containers       |
| Level 2         | +8% primary   | App bars, menus                  |
| Level 3         | +11% primary  | Navigation drawers, dialogs      |
| Level 4         | +12% primary  | Modals, floating action buttons  |
| Level 5         | +14% primary  | Highest-elevation surfaces       |

**M3 surface color roles:**

- `surface` -- base container color for cards, sheets, app bars, menus.
- `surfaceContainerLowest` through `surfaceContainerHighest` -- five predefined tonal
  variations replacing the old single-surface-plus-overlay approach.
- `surfaceVariant` -- lower-contrast surface for list rows, chips, data tables.
- `surfaceTint` -- color used internally for tonal elevation overlays (derived from
  primary); do not set directly.

**Why tonal elevation matters:** shadows are nearly invisible on dark backgrounds.
Tonal elevation makes hierarchy legible in both modes. The tonal tint reinforces
brand identity because it inherits from the primary color.

M3 uses the HCT (Hue, Chroma, Tone) color space. Dark themes select higher-tone
(lighter) variants of each color role. Saturated colors are desaturated to avoid
"vibration" against dark backgrounds.

Source: [Material Design 3 -- Dark Theme](https://m3.material.io/blog/dark-theme-design-tutorial-video),
[Tone-based Surfaces](https://m3.material.io/blog/tone-based-surface-color-m3/),
[Color Roles](https://m3.material.io/styles/color/roles).

### 2.2 Apple Human Interface Guidelines -- Dark Mode

Apple centers dark mode on **semantic colors** that automatically adapt to the current
appearance.

| Semantic Name                 | Light           | Dark            | Usage              |
|-------------------------------|-----------------|-----------------|---------------------|
| `systemBackground`            | #FFFFFF         | #000000         | Primary background  |
| `secondarySystemBackground`   | #F2F2F7         | #1C1C1E         | Grouped content bg  |
| `tertiarySystemBackground`    | #FFFFFF         | #2C2C2E         | Elevated grouped bg |
| `label`                       | #000000         | #FFFFFF         | Primary text        |
| `secondaryLabel`              | #3C3C43 (60%)   | #EBEBF5 (60%)   | Secondary text      |
| `separator`                   | #3C3C43 (29%)   | #545458 (65%)   | Thin dividers       |

**Key Apple principles:**

1. Use semantic tokens so the OS handles mode switching automatically.
2. Leverage "materials" (translucency layers) that adapt to underlying content.
3. Test with the "Increase Contrast" accessibility setting.
4. Use medium or semibold weights for small body text in dark mode -- thinner weights
   "bloom" on dark backgrounds.
5. Apple uses true black (#000000) for OLED primary backgrounds but layers elevated
   surfaces at #1C1C1E and #2C2C2E for depth.

Source: [Apple HIG -- Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode),
[Apple HIG -- Color](https://developer.apple.com/design/human-interface-guidelines/color).

### 2.3 Design Tokens for Theming

Tokens are organized in a three-tier architecture:

```
Tier 1: Primitive tokens     --color-gray-900: #121212
Tier 2: Semantic tokens      --color-surface-primary: var(--color-gray-900)  /* dark */
Tier 3: Component tokens     --card-bg: var(--color-surface-primary)
```

Theme switching operates at the semantic layer: swap mappings from semantic tokens to
primitives, and every component inherits the change automatically.

The W3C Design Tokens Community Group released the first stable specification (2025.10)
in October 2025, providing a vendor-neutral JSON format for cross-tool interop.

### 2.4 CSS Custom Properties & `prefers-color-scheme`

```css
:root {
  color-scheme: light dark;
  --surface: #FFFFFF;
  --text: #212121;
  --accent: #1E88E5;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: #121212;
    --text: #E0E0E0;
    --accent: #42A5F5;
  }
}

/* Class-based override for manual toggle */
:root.dark {
  --surface: #121212;
  --text: #E0E0E0;
  --accent: #42A5F5;
}
```

The `color-scheme` property tells the browser to adjust UA-provided UI elements
(scrollbars, form controls, selection highlights) to match the theme.
`prefers-color-scheme` is supported in all modern browsers with zero JavaScript.

### 2.5 Contrast & Accessibility

**WCAG 2.2 (current regulatory standard):**

- Normal text: 4.5:1 minimum (AA). Large text (18pt+): 3:1 minimum (AA).
- UI components and graphical objects: 3:1 minimum.

**APCA / WCAG 3.0 (emerging standard):**

APCA measures contrast as Lc (Lightness Contrast) values. Key thresholds: Lc 75
minimum for body text, Lc 90 preferred. APCA recognizes that light-on-dark and
dark-on-light do NOT have symmetric contrast perception -- critical for dark mode
design. WCAG 2.x's symmetric formula misses many dark-mode contrast issues.

**Note:** WCAG 2.1/2.2 remains the legal standard. Use APCA as a supplementary check.

---

## 3. Deliverables

### 3.1 Color Token Mapping: Light <-> Dark

```
Token Name                  Light           Dark            Notes
------------------------------------------------------------------
surface.primary             #FFFFFF         #121212         Main background
surface.secondary           #F5F5F5         #1E1E1E         Cards, containers
surface.elevated            #FFFFFF         #252525         Modals, popovers
text.primary                #212121         #E0E0E0         Headings, body
text.secondary              #757575         #9E9E9E         Captions, hints
text.disabled               #BDBDBD         #616161         Disabled labels
accent.primary              #1565C0         #64B5F6         Links, CTAs
status.error                #D32F2F         #EF5350         Error states
status.error.bg             #FFEBEE         #3D1C1C         Error containers
status.warning              #E65100         #FFB74D         Warnings
status.success              #2E7D32         #66BB6A         Success
border.default              #E0E0E0         #383838         Dividers
shadow.default              rgba(0,0,0,.1)  rgba(0,0,0,.4)  Elevation shadow
overlay.scrim               rgba(0,0,0,.5)  rgba(0,0,0,.7)  Modal backdrop
```

### 3.2 Component Appearance Audit

Systematic review of every component in both modes:

| Component        | Light OK | Dark OK | Issues Found          |
|------------------|:--------:|:-------:|------------------------|
| Button (ghost)   | Yes      | No      | Border invisible       |
| Dropdown         | Yes      | No      | Shadow not visible     |
| Modal            | Yes      | No      | Scrim too transparent  |
| Avatar           | Yes      | No      | Ring lost on dark bg   |
| Chart            | Yes      | No      | Gridlines invisible    |

### 3.3 Theme Preview

Side-by-side captures of key screens (dashboard, forms, empty states) in all themes,
with contrast ratio annotations on key text/background pairs.

---

## 4. Tools & Techniques

### 4.1 Figma Variables for Themes

1. Create a color variable collection with "Light" and "Dark" modes.
2. Define primitive variables (grays, brand, status) with identical values across modes.
3. Define semantic variables that reference different primitives per mode.
4. Apply semantic variables to components. Switch modes on frames to preview.

**Figma-to-code pipeline:**

Figma variables -> **Tokens Studio** plugin (export as W3C JSON) -> **Style Dictionary**
(transform into CSS custom properties, Swift asset catalogs, Kotlin resources).

### 4.2 Design Token Tools

| Tool              | Role                              | Key Feature                |
|-------------------|-----------------------------------|----------------------------|
| Tokens Studio     | Figma plugin for token management | Multi-theme modes, Git sync|
| Style Dictionary  | Token transformation engine       | Platform-agnostic output   |
| Cobalt UI         | W3C format token compiler         | Native W3C spec support    |
| Specify           | Design data platform              | API-driven token delivery  |

### 4.3 CSS Architecture

**Recommended file structure:**

```
styles/
  tokens/primitives.css       /* raw color values */
  tokens/semantic-light.css   /* semantic mappings for light */
  tokens/semantic-dark.css    /* semantic mappings for dark  */
  themes/theme-switcher.css   /* @media + class-based switching */
  components/button.css       /* uses only semantic tokens */
```

**FOIT prevention -- inline in `<head>` before stylesheets:**

```html
<script>
(function() {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme:dark)').matches))
    document.documentElement.classList.add('dark');
})();
</script>
```

### 4.4 Contrast Checking Tools

| Tool             | Standard        | Dark Mode Support |
|------------------|-----------------|-------------------|
| Stark (Figma)    | WCAG 2.2 + APCA | Yes               |
| Polychrom        | APCA native     | Yes               |
| axe DevTools     | WCAG 2.2        | Partial           |
| WebAIM Contrast  | WCAG 2.2        | Manual            |

---

## 5. Common Failures

### 5.1 Just Inverting Colors

Applying `filter: invert(1)` or swapping black/white destroys semantic meaning. Red
errors become cyan. Brand colors become unrecognizable. Images display as negatives.
**Fix:** build a proper semantic token layer with intentionally designed values per theme.

### 5.2 Pure Black Backgrounds Causing Halation

Using `#000000` as the dark background causes **halation**: bright text appears to glow,
bleed, or smear. The iris opens wider for bright text on pure black, and astigmatism
(~33% of the population) worsens the effect. OLED screens also exhibit "black smearing"
during scrolling.

**Fix:** use `#121212` to `#1E1E1E` for surfaces. Use `#E0E0E0` for body text, not
pure `#FFFFFF`. Reserve pure white for headings only.

### 5.3 Insufficient Contrast in Dark Mode

Muted grays on dark gray frequently fail WCAG AA. Colored text (orange, green, red)
that passes in light mode often fails in dark mode on dark surfaces.

**Fix:** audit every text/background combination independently. Use APCA as a
supplementary check. Never assume a light-mode pair works in dark mode.

### 5.4 Images and Illustrations Not Adapting

White-background PNGs on dark surfaces create jarring bright rectangles. Logos with
dark text on transparent backgrounds become invisible.

**Fix:** provide light-on-dark SVG variants. Use `<picture>` with `prefers-color-scheme`
media. For photos, apply `filter: brightness(0.85)` in dark mode. Use CSS custom
properties in SVG fills for illustrations.

### 5.5 Shadows Not Working in Dark Mode

Dark shadows on dark backgrounds are invisible. Elevation hierarchy collapses.

**Fix:** use tonal elevation (lighter surface tints) as the primary indicator. If
shadows are needed, increase opacity and add subtle borders:

```css
.dark .card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

### 5.6 Not Testing Both Modes Equally

Designing primarily in light mode and retroactively creating dark mode leads to
invisible borders, lost focus rings, and broken illustrations.

**Fix:** design simultaneously with Figma variable modes. Include dark mode test cases
in every QA pass. Run visual regression tests against both themes.

### 5.7 Saturated Colors Vibrating

Same vivid accents in dark mode "vibrate" against dark backgrounds, causing discomfort.

**Fix:** desaturate and lighten accents for dark mode. M3 recommends HCT tones 70-90
for dark theme accents vs. 30-50 for light.

---

## 6. Integration with Development

### 6.1 Web: CSS `prefers-color-scheme`

```css
:root { color-scheme: light dark; --bg: #FFF; --text: #212121; }

@media (prefers-color-scheme: dark) {
  :root:not(.light) { --bg: #121212; --text: #E0E0E0; }
}
:root.dark { --bg: #121212; --text: #E0E0E0; }
:root.light { --bg: #FFFFFF; --text: #212121; }
```

### 6.2 Tailwind CSS `dark:` Variant

```css
/* Tailwind v4+ */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <p class="text-gray-600 dark:text-gray-400">Body text</p>
</div>
```

### 6.3 iOS System Theme API

```swift
// UIKit -- adaptive color
let color = UIColor { traits in
    traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.88, green: 0.88, blue: 0.88, alpha: 1)
        : UIColor(red: 0.13, green: 0.13, blue: 0.13, alpha: 1)
}

// SwiftUI
@Environment(\.colorScheme) var colorScheme
```

Use Asset Catalogs with "Any Appearance" and "Dark" variants for automatic resolution.

### 6.4 Android System Theme API

```kotlin
// Follow system (default in Android 10+)
AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_FOLLOW_SYSTEM)

// Resource qualifiers: values-night/colors.xml for dark overrides
```

`setDefaultNightMode` is NOT persisted across process restarts. Restore from
SharedPreferences/DataStore in `Application.onCreate()`.

**Jetpack Compose:**

```kotlin
MaterialTheme(
    colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
) { /* content */ }
```

### 6.5 Toggle Implementation

**Three-state toggle (recommended):** Light | Dark | System (default).

**Persistence:**

| Platform | Storage                  | Key          |
|----------|--------------------------|--------------|
| Web      | localStorage (or cookie) | `theme`      |
| iOS      | UserDefaults             | `appTheme`   |
| Android  | DataStore / SharedPrefs  | `app_theme`  |
| Flutter  | SharedPreferences        | `theme_mode` |

**System preference change listener (web):**

```js
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (localStorage.getItem('theme') === 'system')
      document.documentElement.classList.toggle('dark', e.matches);
  });
```

### 6.6 Theme Transition

```css
body, body * {
  transition: background-color 200ms ease, color 200ms ease,
              border-color 200ms ease;
}
body.no-transition, body.no-transition * { transition: none !important; }
```

Add `no-transition` on initial load; remove after first paint. Never use
`transition: all` -- it causes layout thrashing.

---

## 7. Specific Color Recommendations

### 7.1 Dark Mode Surface Palette

Do NOT use pure black (#000000). Use this range:

| Role                | Hex       | Usage                   |
|---------------------|-----------|-------------------------|
| Background (base)   | `#121212` | Page/app background     |
| Surface (level 1)   | `#1E1E1E` | Cards, containers       |
| Surface (level 2)   | `#252525` | Elevated cards, drawers |
| Surface (level 3)   | `#2C2C2C` | Dialogs, modals         |
| Surface (level 4)   | `#333333` | Tooltips, popovers      |
| Surface (level 5)   | `#383838` | Highest elevation       |

### 7.2 Dark Mode Text Palette

| Role           | Hex       | Usage                    |
|----------------|-----------|--------------------------|
| High emphasis  | `#FFFFFF` | Titles, critical labels  |
| Primary        | `#E0E0E0` | Headings, body text      |
| Secondary      | `#9E9E9E` | Captions, metadata       |
| Placeholder    | `#757575` | Input placeholders       |
| Disabled       | `#616161` | Disabled labels          |

### 7.3 Dark Mode Accent Adjustments

| Purpose   | Light Mode | Dark Mode  | Adjustment            |
|-----------|------------|------------|-----------------------|
| Primary   | `#1565C0`  | `#64B5F6`  | Lighter, desaturated  |
| Error     | `#D32F2F`  | `#EF5350`  | Lighter               |
| Warning   | `#E65100`  | `#FFB74D`  | Significantly lighter |
| Success   | `#2E7D32`  | `#66BB6A`  | Lighter               |
| Link      | `#1565C0`  | `#82B1FF`  | Lighter, desaturated  |

### 7.4 Borders and Dividers

| Role           | Light Mode          | Dark Mode                |
|----------------|---------------------|--------------------------|
| Default border | `rgba(0,0,0,0.12)`  | `rgba(255,255,255,0.12)` |
| Strong border  | `rgba(0,0,0,0.24)`  | `rgba(255,255,255,0.24)` |
| Thin divider   | `rgba(0,0,0,0.08)`  | `rgba(255,255,255,0.08)` |

---

## 8. Quick Reference Checklist

### Design Phase

```
[ ] Token architecture: primitive -> semantic -> component
[ ] Light AND dark values for every semantic token
[ ] Surfaces use #121212-#1E1E1E, NOT pure #000000
[ ] Body text uses #E0E0E0, not pure #FFFFFF
[ ] Accents desaturated and lightened for dark mode
[ ] Status colors adjusted for dark backgrounds
[ ] Elevation via tonal surface changes, not shadows alone
[ ] Borders use semi-transparent white, not gray hex values
[ ] Every component reviewed in BOTH modes simultaneously
[ ] Illustrations/diagrams have theme-adaptive variants
[ ] Logo provided in light-on-dark variant
[ ] Focus indicators visible in both modes
[ ] Disabled states distinguishable in both modes
```

### Contrast Verification

```
[ ] Body text meets WCAG AA (4.5:1) in BOTH modes
[ ] Large text meets WCAG AA (3:1) in BOTH modes
[ ] UI components meet 3:1 in BOTH modes
[ ] APCA Lc checked as supplementary quality gate
[ ] Placeholder text contrast verified (often fails dark mode)
[ ] Chart data series distinguishable in both modes
```

### Development

```
[ ] CSS custom properties with semantic layer
[ ] prefers-color-scheme as foundation
[ ] Class-based override for manual toggle
[ ] color-scheme: light dark on :root
[ ] Three-state toggle (Light / Dark / System)
[ ] Preference persisted across sessions
[ ] FOIT prevention script in <head>
[ ] System preference change listener registered
[ ] Images adapt (brightness, srcset, or CSS bg)
[ ] SVGs use currentColor or custom properties
[ ] Meta theme-color updates on switch
```

### Testing

```
[ ] Every flow tested in light AND dark mode
[ ] System preference change triggers correct theme
[ ] Manual toggle overrides system preference
[ ] No FOIT on page load
[ ] Visual regression tests in both themes
[ ] Accessibility audit in both modes
[ ] OLED device tested for smearing/halation
```

### Platform-Specific

```
iOS:  [ ] Semantic UIColors  [ ] Asset catalog Dark variants  [ ] Increase Contrast tested
Android: [ ] values-night/ qualifiers  [ ] MODE_NIGHT_FOLLOW_SYSTEM default  [ ] Preference in onCreate
Web:  [ ] prefers-color-scheme  [ ] localStorage persistence  [ ] SSR cookie for server rendering
```

---

## 9. References

- [Material Design 3 -- Dark Theme](https://m3.material.io/blog/dark-theme-design-tutorial-video)
- [Material Design 3 -- Tone-based Surfaces](https://m3.material.io/blog/tone-based-surface-color-m3/)
- [Material Design 3 -- Color Roles](https://m3.material.io/styles/color/roles)
- [Apple HIG -- Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Apple HIG -- Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple -- Supporting Dark Mode](https://developer.apple.com/documentation/uikit/supporting-dark-mode-in-your-interface)
- [APCA Contrast Algorithm](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
- [W3C Design Tokens Format 2025.10](https://www.designtokens.org/tr/drafts/format/)
- [MDN -- prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme)
- [Tailwind CSS -- Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Android -- Implement Dark Theme](https://developer.android.com/develop/ui/views/theming/darktheme)
- [Style Dictionary](https://styledictionary.com/)
- [Tokens Studio](https://docs.tokens.studio/)
- [Figma -- Variables Guide](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
