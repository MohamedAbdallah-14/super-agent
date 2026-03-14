# Color Theory in UI/UX Design

> **Module Type:** Foundation
> **Domain:** Design Systems, Accessibility, Visual Design
> **Last Updated:** 2026-03-07
> **Sources:** WCAG 2.2, Material Design 3, Apple HIG, Ant Design

---

## 1. Core Principles

### 1.1 Color Models for UI

Three color models dominate UI work: RGB/Hex, HSL, and HCT. Each serves a
different purpose, but **HSL is the preferred model for color manipulation in
design and CSS** because it maps to human perception.

#### RGB / Hex

- Machine-native format: screens emit red, green, and blue light.
- Hex is shorthand for RGB: `#1A73E8` = `R:26 G:115 B:232`.
- Poor for manipulation -- changing "brightness" requires adjusting all three
  channels simultaneously.
- Use hex for final token values and handoff specifications.

#### HSL (Hue, Saturation, Lightness)

- **Hue** (0-360): the color wheel position. 0=red, 120=green, 240=blue.
- **Saturation** (0-100%): intensity. 0%=gray, 100%=vivid.
- **Lightness** (0-100%): brightness. 0%=black, 50%=pure color, 100%=white.
- Advantages for UI work:
  - Generate tints by increasing L while keeping H and S constant.
  - Generate shades by decreasing L.
  - Create hover/active states by shifting L by 5-10%.
  - Build monochromatic palettes by fixing H and varying S and L.
  - Meet contrast requirements by adjusting the L-axis alone.
- CSS native: `hsl(220, 90%, 52%)` is immediately readable as "vivid blue."

```css
/* HSL makes state variants trivial */
--btn-primary:       hsl(220, 90%, 52%);
--btn-primary-hover: hsl(220, 90%, 45%);  /* darken by 7% */
--btn-primary-active: hsl(220, 90%, 38%); /* darken by 14% */
--btn-primary-disabled: hsl(220, 20%, 72%); /* desaturate + lighten */
```

#### HCT (Hue, Chroma, Tone) -- Material Design 3

- Google's perceptually uniform color model used in Material Design 3.
- **Tone** maps linearly to perceived brightness (unlike HSL's L which is
  not perceptually uniform).
- Tone 0 = black, Tone 100 = white, Tone 40 = typical primary in light mode,
  Tone 80 = typical primary in dark mode.
- The Material Theme Builder uses HCT to generate tonal palettes from a
  single seed color, producing 13 tones per key color (0, 10, 20, 30, 40,
  50, 60, 70, 80, 90, 95, 99, 100).

**Recommendation:** Use HSL for day-to-day CSS manipulation and design tool
work. Use HCT via Material Theme Builder when generating full design system
palettes. Store final values as hex tokens for cross-platform consistency.

---

### 1.2 Material Design 3 Dynamic Color and Tonal Palettes

Material Design 3 (M3) introduced a paradigm shift: instead of manually picking
color swatches, the entire palette is algorithmically generated from a single
**seed color** using the HCT color model.

#### Five Key Color Groups

Each scheme derives from five key colors, each producing a tonal palette of
13 tones:

| Key Color   | Purpose                                         | Light Tone | Dark Tone |
|-------------|------------------------------------------------|------------|-----------|
| Primary     | Main brand color, prominent buttons, FABs       | Tone 40    | Tone 80   |
| Secondary   | Less prominent components (filter chips, etc.)   | Tone 40    | Tone 80   |
| Tertiary    | Contrasting accents, balances primary/secondary  | Tone 40    | Tone 80   |
| Neutral     | Surfaces, backgrounds, text                      | Tone 99    | Tone 10   |
| Error       | Error states (always red-derived)                | Tone 40    | Tone 80   |

#### M3 Baseline Color Scheme (Default Purple)

The M3 baseline theme uses purple as the seed color:

| Role               | Light Mode  | Dark Mode   |
|--------------------|-------------|-------------|
| Primary            | `#6750A4`   | `#D0BCFF`   |
| On Primary         | `#FFFFFF`   | `#381E72`   |
| Primary Container  | `#EADDFF`   | `#4F378B`   |
| Secondary          | `#625B71`   | `#CCC2DC`   |
| Tertiary           | `#7D5260`   | `#EFB8C8`   |
| Error              | `#B3261E`   | `#F2B8B5`   |
| Surface            | `#FFFBFE`   | `#1C1B1F`   |
| On Surface         | `#1C1B1F`   | `#E6E1E5`   |

#### Dynamic Color (Android 12+)

On Android 12 and later, M3 apps can extract colors from the user's wallpaper
to generate a personalized color scheme. The system creates five tonal palettes
(Primary, Secondary, Tertiary, Neutral, Neutral Variant) from the wallpaper's
dominant and complementary colors.

**Source:** [Material Design 3 - Color System](https://m3.material.io/styles/color/system/how-the-system-works), [Color Roles](https://m3.material.io/styles/color/roles)

---

### 1.3 Color Roles

Color roles define the semantic purpose of colors in a UI. They are the
connective tissue between design tokens and component styling.

#### Structural Roles

| Role           | Usage                                                  |
|----------------|-------------------------------------------------------|
| **Primary**    | Key actions, active states, elevated surface tints     |
| **On Primary** | Text/icons on primary-colored surfaces                 |
| **Primary Container** | Less prominent primary elements (chips, cards)   |
| **Secondary**  | Supporting elements, filter chips, toggles             |
| **Tertiary**   | Accent elements that contrast with primary/secondary   |
| **Surface**    | Backgrounds, cards, sheets, dialogs                    |
| **On Surface** | Body text, icons on surface backgrounds                |
| **Outline**    | Borders, dividers, input field strokes                 |

#### Semantic Roles (Status Colors)

Semantic colors communicate meaning independently of brand:

| Semantic Role  | Default Color Family | Typical Hex (Light) | Usage                          |
|---------------|---------------------|--------------------|---------------------------------|
| **Success**   | Green               | `#198754`          | Confirmations, completed states |
| **Warning**   | Amber / Yellow      | `#FFC107`          | Caution, non-blocking alerts    |
| **Error**     | Red                 | `#DC3545`          | Validation errors, destructive  |
| **Info**       | Blue                | `#0D6EFD`          | Informational, neutral alerts   |

**Design System Comparison:**

| System           | Success     | Warning     | Error       | Info        |
|-----------------|-------------|-------------|-------------|-------------|
| Material Design 3 | Custom      | Custom      | `#B3261E`   | Custom      |
| Ant Design       | `#52C41A`   | `#FAAD14`   | `#FF4D4F`   | `#1677FF`   |
| Bootstrap 5      | `#198754`   | `#FFC107`   | `#DC3545`   | `#0D6EFD`   |
| Apple HIG        | `.systemGreen` | `.systemYellow` | `.systemRed` | `.systemBlue` |

**Source:** [Ant Design Colors](https://ant.design/docs/spec/colors/), [Material Design 3 Color Roles](https://m3.material.io/styles/color/roles)

---

### 1.4 Contrast Ratios and WCAG 2.2

Accessible contrast is non-negotiable. WCAG 2.2 defines minimum contrast
ratios measured as luminance ratios between foreground and background colors.

#### Required Ratios

| Element Type                         | WCAG AA   | WCAG AAA  |
|--------------------------------------|-----------|-----------|
| Normal text (< 18pt / < 14pt bold)   | **4.5:1** | 7:1       |
| Large text (>= 18pt / >= 14pt bold)  | **3:1**   | 4.5:1     |
| UI components and graphical objects  | **3:1**   | --        |
| Focus indicators                     | **3:1**   | --        |

#### Key Rules

- **4.5:1** is the baseline for all body text. No exceptions.
- **3:1** applies to large text (18px regular or 14px bold and above),
  interactive component boundaries, and meaningful graphical elements.
- Inactive/disabled components have no contrast requirement.
- Text that is part of a logo or purely decorative has no requirement.
- WCAG AAA (7:1 for normal text) is recommended for maximum accessibility
  but not legally required in most jurisdictions.

#### Practical Contrast Pairs

| Pair                                  | Ratio   | Passes AA? |
|---------------------------------------|---------|------------|
| `#1A1A1A` on `#FFFFFF`               | 17.4:1  | Yes        |
| `#333333` on `#FFFFFF`               | 12.6:1  | Yes        |
| `#757575` on `#FFFFFF`               | 4.6:1   | Yes (barely)|
| `#767676` on `#FFFFFF`               | 4.54:1  | Yes (minimum passing gray) |
| `#808080` on `#FFFFFF`               | 3.9:1   | No         |
| `#FFFFFF` on `#0D6EFD` (Bootstrap blue)| 4.6:1 | Yes        |
| `#FFFFFF` on `#FFC107` (amber)       | 1.6:1   | No         |

Note: Amber/yellow semantic colors almost never pass contrast for white text.
Always use dark text on yellow/amber backgrounds.

**Source:** [WCAG 2.2 - W3C](https://www.w3.org/TR/WCAG22/), [WebAIM Contrast Guide](https://webaim.org/articles/contrast/)

---

### 1.5 Color Blindness Considerations

Approximately **8% of males and 0.5% of females** have some form of color
vision deficiency (CVD), totaling over 350 million people worldwide. Red-green
color blindness (deuteranopia/protanopia) is the most common type.

#### The Cardinal Rule

> **Never use color as the sole means of conveying information.**
> -- WCAG 2.2 Success Criterion 1.4.1

#### Types of Color Vision Deficiency

| Type            | Prevalence (Males) | Affected Colors     |
|-----------------|-------------------|---------------------|
| Deuteranomaly   | ~5%               | Red-green (most common) |
| Protanomaly     | ~1.3%             | Red-green            |
| Deuteranopia    | ~1.2%             | Red-green (severe)   |
| Protanopia      | ~1%               | Red-green (severe)   |
| Tritanopia      | ~0.01%            | Blue-yellow (rare)   |
| Achromatopsia   | ~0.003%           | Total color blindness|

#### Mandatory Redundant Cues

Always pair color with at least one additional visual indicator:

- **Icons:** Checkmark for success, X for error, triangle for warning.
- **Text labels:** "Error: Email is required" not just a red border.
- **Patterns/textures:** In charts and graphs, use stripes, dots, dashes.
- **Shape changes:** Underline links in addition to coloring them.
- **Position/grouping:** Error messages placed adjacent to the field.

#### Safe Color Combinations for CVD

- Blue + Orange (distinguishable by all common CVD types).
- Blue + Red (distinguishable for tritanopia).
- Avoid red vs. green as the only differentiator.
- Use sufficient luminance contrast between adjacent colors.

**Source:** [Smashing Magazine - Designing for Colorblindness](https://www.smashingmagazine.com/2024/02/designing-for-colorblindness/), [WCAG 1.4.1](https://www.w3.org/TR/WCAG22/)

---

### 1.6 Dark Mode Color Mapping

Dark mode is not "invert the colors." It requires a separate, carefully
designed color strategy that accounts for tonal elevation, desaturation,
and contrast preservation.

#### Foundational Principles

1. **Use dark gray, not pure black.** The base dark surface should be
   `#121212` (Material Design recommendation), not `#000000`. Pure black
   creates excessive contrast with white text ("halation") and lacks
   the ability to show elevation through lighter surfaces.

2. **Express elevation with surface lightness, not shadows.**
   In dark mode, shadows are invisible against dark backgrounds. Instead,
   use progressively lighter surfaces to indicate elevation:

   | Elevation (dp) | White Overlay | Resulting Surface   |
   |----------------|---------------|---------------------|
   | 0 dp           | 0%            | `#121212`           |
   | 1 dp           | 5%            | `#1E1E1E`           |
   | 2 dp           | 7%            | `#222222`           |
   | 3 dp           | 8%            | `#242424`           |
   | 4 dp           | 9%            | `#272727`           |
   | 6 dp           | 11%           | `#2C2C2C`           |
   | 8 dp           | 12%           | `#2E2E2E`           |
   | 12 dp          | 14%           | `#333333`           |
   | 16 dp          | 15%           | `#353535`           |
   | 24 dp          | 16%           | `#383838`           |

3. **Desaturate brand colors.** Highly saturated colors vibrate against
   dark backgrounds, causing visual fatigue. Reduce saturation by 10-20%
   and increase lightness for dark mode variants.

   ```
   Light mode primary: hsl(220, 90%, 52%)  -- vivid blue
   Dark mode primary:  hsl(220, 75%, 70%)  -- desaturated, lighter blue
   ```

4. **Maintain contrast ratios.** As surfaces get lighter at higher
   elevations, verify that white text still passes 4.5:1 against the
   lightest elevated surface. Surface `#383838` with white text `#FFFFFF`
   yields a ratio of ~10.5:1 (passing).

5. **Flip "on" color semantics.** Primary containers become darker in dark
   mode while their content colors become lighter. Surface text swaps
   from dark-on-light to light-on-dark.

#### M3 Dark Mode Tone Mapping

| Role               | Light Tone | Dark Tone | Shift         |
|--------------------|-----------|-----------|---------------|
| Primary            | 40        | 80        | +40 tones     |
| On Primary         | 100       | 20        | -80 tones     |
| Primary Container  | 90        | 30        | -60 tones     |
| Surface            | 99        | 10        | -89 tones     |
| On Surface         | 10        | 90        | +80 tones     |

**Source:** [Material Design 3 - Dark Theme](https://m3.material.io/styles/color/system/how-the-system-works), [Dark UI Design Best Practices](https://nighteye.app/dark-ui-design/)

---

### 1.7 Color Psychology in UI

Colors carry psychological associations that influence user perception and
behavior. These associations are culturally mediated and should not be
treated as universal laws.

#### Western UI Conventions

| Color   | Association                | Common UI Usage                    |
|---------|---------------------------|------------------------------------|
| **Blue**    | Trust, stability, calm    | Banking, healthcare, enterprise    |
| **Red**     | Urgency, danger, passion  | Errors, destructive actions, CTAs  |
| **Green**   | Success, growth, nature   | Success states, "go" actions       |
| **Orange**  | Energy, warmth, attention | Warnings, CTAs, promotional        |
| **Purple**  | Premium, creativity       | Luxury brands, creative tools      |
| **Yellow**  | Optimism, caution         | Warnings, highlights               |
| **Black**   | Sophistication, power     | Luxury, editorial, high contrast   |
| **White**   | Clean, minimal, space     | Backgrounds, breathing room        |

#### Cultural Variations (Critical for Global Products)

| Color    | Western           | East Asian             | Middle Eastern        |
|----------|-------------------|------------------------|-----------------------|
| **Red**  | Danger, urgency   | Luck, prosperity (CN)  | Evil, danger          |
| **White**| Purity, clean     | Mourning, death (JP/CN)| Purity                |
| **Green**| Nature, success   | Eternity, fertility    | Islam, prosperity     |
| **Yellow**| Caution, warmth  | Royalty, sacred (CN)   | Happiness             |
| **Blue** | Trust, calm       | Immortality            | Protection, heaven    |
| **Black**| Elegance, death   | Career, knowledge      | Mourning, mystery     |

#### Evidence-Based Insights

- HubSpot A/B test: red CTAs outperformed green by 21% -- due to contrast
  against the page's green design, not inherent color superiority.
- Green-themed interfaces show 23% higher satisfaction in UX studies.
- Color psychology is contextual. Use it as a heuristic, not a rule.
  Prioritize accessibility and contrast over psychological association.

**Source:** [IxDF - Color in UX Design](https://ixdf.org/literature/topics/color), [UX Magazine - Psychology of Color](https://uxmag.com/articles/the-psychology-of-color-in-ui-ux-design)

---

## 2. Do's and Don'ts

### 2.1 Do's

1. **Do use HSL for defining color variants.** Define your base color as HSL,
   then derive hover, active, and disabled states by adjusting L and S.
   Example: base `hsl(220, 85%, 52%)`, hover `hsl(220, 85%, 44%)`.

2. **Do use `#1A1A1A` or `#212121` for body text instead of pure `#000000`.**
   Pure black on white causes halation (the text appears to bleed into the
   background). A slight softening to ~10% lightness is easier to read.

3. **Do ensure all text passes WCAG AA contrast.** Normal text: 4.5:1.
   Large text (18px+ or 14px+ bold): 3:1. Use tools like WebAIM Contrast
   Checker or Stark plugin for Figma.

4. **Do use semantic color tokens, not raw hex values.** Define
   `--color-error` not `--color-red`. This decouples meaning from specific
   hue and makes dark mode mapping straightforward.

5. **Do limit your palette to 3-5 intentional colors** (primary, secondary,
   accent/tertiary) plus neutrals and semantic colors. Each additional color
   increases cognitive load and maintenance burden.

6. **Do provide 8-10 tonal steps per color.** For each brand color, generate
   a range from very light (tint, ~95% L) to very dark (shade, ~15% L):
   50, 100, 200, 300, 400, 500, 600, 700, 800, 900.

7. **Do use the 60-30-10 rule for color distribution.** 60% neutral/surface
   colors, 30% secondary/supporting colors, 10% accent/primary colors.
   This creates visual hierarchy without overwhelming the user.

8. **Do pair every color indicator with a non-color cue.** Red error border
   + error icon + error text label. Green success + checkmark icon + "Saved"
   text.

9. **Do desaturate colors for dark mode.** Reduce saturation by 10-20% and
   increase lightness by 15-30% compared to light mode values. Example:
   light `hsl(142, 76%, 36%)` becomes dark `hsl(142, 60%, 55%)`.

10. **Do test your palette with color blindness simulators.** Use tools like
    Sim Daltonism (macOS), Color Oracle, or Chrome DevTools' rendering
    emulation (Rendering > Emulate vision deficiency).

11. **Do use system semantic colors on native platforms.** iOS: `UIColor.label`,
    `.systemBackground`, `.systemRed`. Android: M3 `colorScheme.primary`,
    `colorScheme.error`. These automatically adapt to light/dark/high-contrast.

12. **Do maintain a minimum 3:1 contrast for all interactive component
    boundaries.** Button borders, input outlines, toggle tracks, and focus
    indicators must be distinguishable from their surroundings.

13. **Do use dark text (`#1A1A1A` or darker) on yellow/amber backgrounds.**
    White text on yellow/amber never passes WCAG AA. Example: warning banner
    background `#FFF3CD` with text `#664D03`.

14. **Do establish a neutral gray scale with at least 5 steps.**
    Example: `#F8F9FA`, `#E9ECEF`, `#ADB5BD`, `#6C757D`, `#212529`.
    Use these for backgrounds, borders, disabled states, and secondary text.

15. **Do document color usage guidelines alongside token definitions.**
    Each token should specify: name, hex value, usage context, contrast
    pairing, and light/dark mode variant.

### 2.2 Don'ts

1. **Don't use pure black (`#000000`) on pure white (`#FFFFFF`) for body
   text.** The maximum contrast ratio (21:1) causes halation -- a visual
   vibration effect where text appears to bleed. Use `#1A1A1A` on `#FFFFFF`
   (17.4:1) or `#333333` on `#FFFFFF` (12.6:1) instead.

2. **Don't rely on color alone to convey meaning.** A form field with only
   a red border to indicate an error is invisible to someone with
   protanopia. Always add icons, text labels, or pattern changes.

3. **Don't use red and green as the only differentiator.** This is the most
   common color blindness failure. Red vs. green is indistinguishable for
   ~8% of male users. Add shapes, labels, or patterns.

4. **Don't invert colors for dark mode.** Simply swapping `#000` and `#FFF`
   produces garish, unusable results. Dark mode requires intentional surface
   elevation, desaturation, and tone remapping.

5. **Don't use highly saturated colors for large background areas.** A
   full-screen `hsl(220, 100%, 50%)` blue background causes eye strain.
   Reserve full saturation for small accent elements (buttons, badges,
   icons). Backgrounds should use saturation below 20%.

6. **Don't place colored text on colored backgrounds without checking
   contrast.** Blue text on a purple background, or red text on a brown
   background, frequently fails contrast requirements even when both colors
   "look different" to the designer.

7. **Don't use more than 5-6 distinct hues in a single interface.**
   Every additional hue competes for attention and dilutes the visual
   hierarchy. If you need variety, use tonal variations of existing colors.

8. **Don't assume color meanings are universal.** Red means "luck" in
   Chinese culture, "danger" in Western culture, and "evil" in some Middle
   Eastern contexts. Research your target audience's cultural associations.

9. **Don't use thin colored lines or small colored dots as the only
   indicator.** Fine elements at 1-2px are nearly impossible to perceive
   for users with low vision, regardless of color. Minimum touch/click
   targets apply to color indicators too.

10. **Don't hard-code color values in components.** Use design tokens
    (`var(--color-primary)` in CSS, `ColorScheme.primary` in M3). Hard-coded
    hex values make theming, dark mode, and accessibility adjustments
    impossible to maintain.

11. **Don't use transparency/opacity as a substitute for proper color
    tokens.** `rgba(0, 0, 0, 0.5)` on a white background looks different
    than on a blue background. Define explicit colors for each context.

12. **Don't ignore the `forced-colors` media query.** Windows High Contrast
    Mode overrides your colors. Elements that rely on custom colors for
    meaning (e.g., colored badges without text) will become invisible.
    Test with `@media (forced-colors: active)`.

13. **Don't use color temperature inconsistently.** Mixing warm grays
    (`hsl(30, 10%, 95%)`) with cool grays (`hsl(220, 10%, 95%)`) in the
    same interface creates visual dissonance. Pick one temperature for
    your neutral scale and commit.

14. **Don't forget disabled state colors.** Disabled elements should have
    reduced opacity (38-50% of their enabled state) or use a distinct
    muted color. They are exempt from contrast requirements per WCAG, but
    should still be visually identifiable as "something is here."

---

## 3. Platform Variations

### 3.1 iOS (Apple Human Interface Guidelines)

#### System Colors

Apple provides dynamic system colors that automatically adapt to Light Mode,
Dark Mode, and Increased Contrast settings:

| Semantic Color       | Light Mode      | Dark Mode       |
|---------------------|-----------------|-----------------|
| `.systemRed`        | `#FF3B30`       | `#FF453A`       |
| `.systemOrange`     | `#FF9500`       | `#FF9F0A`       |
| `.systemYellow`     | `#FFCC00`       | `#FFD60A`       |
| `.systemGreen`      | `#34C759`       | `#30D158`       |
| `.systemBlue`       | `#007AFF`       | `#0A84FF`       |
| `.systemIndigo`     | `#5856D6`       | `#5E5CE6`       |
| `.systemPurple`     | `#AF52DE`       | `#BF5AF2`       |
| `.systemPink`       | `#FF2D55`       | `#FF375F`       |
| `.systemTeal`       | `#5AC8FA`       | `#64D2FF`       |
| `.systemGray`       | `#8E8E93`       | `#8E8E93`       |

Note: Dark mode variants are slightly shifted in hue and increased in
brightness to maintain vibrancy against dark backgrounds.

#### Semantic UI Colors

Key semantic colors: `.label` (primary text), `.secondaryLabel`,
`.tertiaryLabel`, `.systemBackground`, `.secondarySystemBackground`,
`.separator`, `.link`, `.systemFill`. These adapt automatically to
light/dark/increased-contrast modes.

#### Apple HIG Guidance (2025-2026)

- Use system colors over custom colors -- they handle light/dark mode,
  increased contrast, and the Liquid Glass design language (iOS 26).
- Prefer semantic colors (`.label`, `.systemBackground`) over fixed colors.
- Increased Contrast accessibility modifies system colors; custom colors
  bypass this. Test with Accessibility Inspector.

**Source:** [Apple HIG - Color](https://developer.apple.com/design/human-interface-guidelines/color), [UIColor Standard Colors](https://developer.apple.com/documentation/uikit/uicolor/standard_colors)

### 3.2 Android (Material Design 3)

#### Dynamic Color (Material You)

Starting with Android 12, the system extracts a seed color from the user's
wallpaper and generates five tonal palettes:

1. **Primary** -- from the dominant wallpaper color.
2. **Secondary** -- from a complementary wallpaper color.
3. **Tertiary** -- from an analogous or triadic wallpaper color.
4. **Neutral** -- desaturated variant for surfaces and backgrounds.
5. **Neutral Variant** -- slightly saturated neutral for outlines.

Each palette contains 13 tones (0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
95, 99, 100).

#### Key M3 Color Tokens

| Token                  | Light Default  | Dark Default   |
|-----------------------|----------------|----------------|
| `colorScheme.primary`  | Tone 40        | Tone 80        |
| `colorScheme.onPrimary`| Tone 100       | Tone 20        |
| `colorScheme.surface`  | Tone 99        | Tone 10        |
| `colorScheme.onSurface`| Tone 10        | Tone 90        |
| `colorScheme.error`    | Tone 40        | Tone 80        |
| `colorScheme.outline`  | Tone 50        | Tone 60        |

When dynamic color is unavailable (Android < 12), provide a static baseline
scheme. Use the Material Theme Builder (m3.material.io) to generate both.

**Source:** [Material Design 3 - Dynamic Color](https://m3.material.io/styles/color/static), [Android Developers - Material 3](https://developer.android.com/develop/ui/compose/designsystems/material3)

### 3.3 Web (CSS and Browser APIs)

#### CSS Custom Properties + `prefers-color-scheme`

```css
:root {
  --color-primary:   hsl(220, 85%, 52%);
  --color-surface:   hsl(0, 0%, 99%);
  --color-on-surface: hsl(0, 0%, 10%);
  --color-error:     hsl(0, 72%, 51%);
  --color-success:   hsl(142, 76%, 36%);
  --color-warning:   hsl(45, 100%, 51%);
  --color-info:      hsl(211, 100%, 50%);
  --color-gray-100:  hsl(220, 13%, 91%);
  --color-gray-500:  hsl(220, 9%, 46%);
  --color-gray-900:  hsl(220, 14%, 10%);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary:   hsl(220, 75%, 70%);
    --color-surface:   hsl(220, 10%, 10%);
    --color-on-surface: hsl(220, 10%, 90%);
    --color-error:     hsl(0, 60%, 70%);
    --color-success:   hsl(142, 55%, 55%);
    --color-warning:   hsl(45, 80%, 60%);
    --color-info:      hsl(211, 80%, 65%);
  }
}
```

#### `forced-colors` and `color-scheme`

```css
@media (forced-colors: active) {
  .badge { border: 2px solid currentColor; }
  .icon-only-button { border: 1px solid ButtonText; }
}
:root { color-scheme: light dark; }
```

In forced-colors mode (Windows High Contrast), the browser overrides author
colors with system colors. Elements relying solely on background color for
meaning become invisible. Always provide structural alternatives (borders,
text labels). The `color-scheme` property tells the browser to render
UA-controlled elements (scrollbars, form controls) in the appropriate scheme.

#### Modern CSS: OKLCH (2025+)

```css
--color-primary: oklch(0.55 0.22 264);
--color-primary-light: oklch(from var(--color-primary) calc(l + 0.15) c h);
--color-primary-dark:  oklch(from var(--color-primary) calc(l - 0.15) c h);
```

OKLCH is the emerging standard for perceptually uniform color manipulation
in CSS, similar to HCT for programmatic palette generation.

**Source:** [MDN - prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme), [MDN - forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## 4. Common Mistakes in AI-Generated Designs

AI design tools (Midjourney, Figma AI, v0, etc.) systematically fail at
color in predictable ways.

### 4.1 The "AI Purple Problem"

AI models disproportionately generate purple/indigo schemes because Tailwind
defaults and Shopify Polaris normalized indigo, and AI training data compounds
this bias as generated designs feed back into training sets.

**Detect:** Unspecified purple/indigo primary = statistical artifact, not a
brand choice. **Fix:** Specify exact hex values in prompts (`#0066CC`, not
"blue").

### 4.2 Too Many Colors

AI uses 7-10 distinct hues where 3-4 suffice, destroying visual hierarchy.

**Detect:** Count distinct hues; more than 5 (excluding grays/semantics) is
too many. **Fix:** Reduce to primary + secondary + optional tertiary. Use
tonal variations for variety instead of new hues.

### 4.3 Poor Contrast

AI does not check WCAG ratios. Common failures: light gray text on white,
white text on yellow buttons, low-contrast input borders, colored text on
colored backgrounds.

**Detect:** Run all text/background pairs through a contrast checker (axe,
Lighthouse, Stark, WebAIM). **Fix:** For dark text, ensure HSL L <= 45%.
For light text on dark backgrounds, background L <= 35% and text L >= 85%.

### 4.4 No Semantic Meaning

AI assigns colors decoratively -- a success message in blue, an error in
orange, a warning in purple.

**Detect:** Check status colors match conventions (green=success, red=error,
amber=warning, blue=info). **Fix:** Override with your design system's
semantic tokens.

### 4.5 Dark Mode Failures

AI commonly uses pure black backgrounds, keeps saturated light-mode colors,
and fails to show elevation through surface lightness.

**Detect:** Base surface should be `#121212`-`#1C1C1E`, not `#000000`. Cards
must be lighter than background. Saturation should be reduced vs. light mode.
**Fix:** Apply tonal elevation scale (Section 1.6), desaturate 10-20%.

### 4.6 Missing State Variations

AI generates only the resting state, ignoring hover, focus, active, disabled,
and selected states.

**Detect:** If all states look identical, they are missing. **Fix:** Generate
a state matrix with explicit color tokens per state per component.

---

## 5. Decision Framework

### 5.1 How Many Colors to Use

#### The 3-5 Color Palette Rule

| Count | Composition                                        | Best For               |
|-------|----------------------------------------------------|------------------------|
| 3     | Primary + Neutral dark + Neutral light              | Minimal/editorial UI   |
| 4     | Primary + Secondary + Neutral dark + Neutral light  | Most applications      |
| 5     | Primary + Secondary + Tertiary + 2 Neutrals         | Complex, data-rich UI  |

Add semantic colors (success, warning, error, info) on top of the base palette.
These are functional, not decorative, and do not count toward the "palette."

#### Color Budget per Screen

- **1 dominant color** (primary): calls to action, active navigation, key
  branding. Covers ~10% of screen area.
- **1-2 supporting colors** (secondary/tertiary): secondary actions, tags,
  categories. Covers ~30% of screen area.
- **Neutral palette** (grays): text, backgrounds, borders, dividers. Covers
  ~60% of screen area.

### 5.2 Warm vs. Cool Palette Selection

| Factor                  | Warm Palette                    | Cool Palette                   |
|-------------------------|---------------------------------|--------------------------------|
| **Hue range**           | 0-60 (reds, oranges, yellows)   | 180-300 (blues, greens, purples)|
| **Psychological effect**| Energetic, urgent, personal     | Calm, trustworthy, professional |
| **Best for**            | Food, entertainment, children   | Finance, health, enterprise    |
| **Neutral pairing**     | Warm grays `hsl(30, 8%, x%)`   | Cool grays `hsl(220, 8%, x%)`  |
| **Risk**                | Can feel aggressive if over-saturated | Can feel cold/clinical      |

**Hybrid approach:** Use a cool primary (blue) with a warm accent (orange)
for contrast. This is why many enterprise products use blue + orange CTAs.

### 5.3 When to Use High vs. Low Saturation

| Context                          | Saturation Level | HSL S Value |
|----------------------------------|-----------------|-------------|
| Primary CTA buttons              | High            | 75-95%      |
| Notification badges              | High            | 80-100%     |
| Active navigation indicators     | Medium-high     | 60-80%      |
| Card backgrounds                 | Very low        | 5-15%       |
| Page backgrounds                 | Minimal         | 0-10%       |
| Disabled elements                | Very low        | 10-25%      |
| Dark mode surfaces               | Very low        | 5-15%       |
| Dark mode accent elements        | Medium          | 50-70%      |
| Data visualization (charts)      | Medium-high     | 50-80%      |
| Error/warning backgrounds        | Low             | 15-30%      |
| Error/warning icons/text         | High            | 70-90%      |

**Rule of thumb:** The smaller the element and the more important the
information it carries, the higher its saturation can be. The larger the
surface area, the lower the saturation should be.

### 5.4 Building a Color System Step by Step

1. **Choose a primary hue** based on brand and psychology. Define in HSL.
2. **Generate tonal scale** (50-900) by varying L from 95% to 10%, H fixed.
3. **Select secondary/tertiary** via color harmony: analogous (+/-30 deg),
   complementary (+180), split-complementary (+150/+210), triadic (+120/+240).
4. **Define neutral scale** using primary hue at saturation 5-15%.
5. **Assign semantics:** success (H~142), warning (H~45), error (H~0), info (H~211).
6. **Map to tokens:** name by role (`--color-primary-500`), not appearance.
7. **Create dark mode variants** by remapping tones (500->200, 100->800).
8. **Validate all pairings** against WCAG AA. Document usage guidelines.

---

## 6. Quick Reference Checklist

Use this checklist when reviewing any UI design for color quality and
accessibility compliance.

### Contrast and Accessibility

- [ ] All body text passes WCAG AA contrast (4.5:1 minimum)
- [ ] All large text (18px+ / 14px+ bold) passes 3:1 contrast
- [ ] All UI component boundaries pass 3:1 contrast against adjacent colors
- [ ] Focus indicators are visible with 3:1 contrast against surrounding content
- [ ] No information is conveyed by color alone (WCAG 1.4.1)
- [ ] Design tested with color blindness simulator (protanopia, deuteranopia)
- [ ] `forced-colors` / Windows High Contrast mode tested (web)

### Palette and Tokens

- [ ] Color palette limited to 3-5 hues plus neutrals
- [ ] Each color has a tonal scale (minimum 5 steps: 100, 300, 500, 700, 900)
- [ ] All colors defined as semantic tokens, not raw hex values in components
- [ ] Semantic status colors follow convention (green=success, red=error, amber=warning, blue=info)
- [ ] Neutral gray scale uses consistent temperature (all warm or all cool)
- [ ] 60-30-10 distribution applied (neutrals, supporting, accent)

### Dark Mode

- [ ] Dark mode uses dark gray base (`#121212`-`#1C1C1E`), not pure black
- [ ] Elevation expressed through surface lightness, not shadows
- [ ] Brand colors desaturated 10-20% for dark mode
- [ ] All dark mode text/surface pairs re-verified for contrast
- [ ] Dark mode has been designed intentionally, not auto-inverted

### Platform Compliance

- [ ] iOS: uses system semantic colors where possible (`.label`, `.systemBackground`)
- [ ] Android: provides fallback color scheme for devices without dynamic color
- [ ] Web: implements `prefers-color-scheme` media query
- [ ] Web: tested with `forced-colors: active` media query
- [ ] Color tokens are cross-platform consistent (same hex values, different APIs)

---

## References

- [WCAG 2.2 - W3C Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG22/)
- [WebAIM - Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [Material Design 3 - Color System](https://m3.material.io/styles/color/system/how-the-system-works)
- [Material Design 3 - Color Roles](https://m3.material.io/styles/color/roles)
- [Material Design 3 - Dynamic Color](https://m3.material.io/styles/color/static)
- [Apple HIG - Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple UIColor Standard Colors](https://developer.apple.com/documentation/uikit/uicolor/standard_colors)
- [Ant Design - Colors Specification](https://ant.design/docs/spec/colors/)
- [MDN - prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [MDN - forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- [Smashing Magazine - Designing for Colorblindness](https://www.smashingmagazine.com/2024/02/designing-for-colorblindness/)
- [IxDF - Color in UX Design](https://ixdf.org/literature/topics/color)
- [Josh W. Comeau - Color Formats in CSS](https://www.joshwcomeau.com/css/color-formats/)
