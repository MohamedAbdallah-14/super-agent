# Typography -- Design Foundation Module

> **Category:** Design Foundation
> **Applies to:** All platforms -- Web, iOS, Android, Desktop
> **Last updated:** 2026-03-07
> **Sources:** Material Design 3, Apple HIG, Ant Design, WCAG 2.2, Butterick's Practical Typography, Smashing Magazine, Baymard Institute, Nielsen Norman Group

Typography is the single most impactful design decision in any interface. Text constitutes
80-90% of most UI surfaces. Getting it right creates hierarchy, guides attention, and
builds trust before the user consciously registers anything.

---

## 1. Core Principles

### 1.1 Type Scales and Modular Scales

A modular type scale is a series of font sizes where each step increases by a consistent ratio,
creating mathematically harmonious relationships between sizes. The ratio you choose determines
the contrast between hierarchy levels.

**Common Ratios:**

| Ratio Name      | Value | Use Case                                       |
|-----------------|-------|-------------------------------------------------|
| Minor Second    | 1.067 | Dense data UIs, dashboards (minimal contrast)   |
| Major Second    | 1.125 | Compact apps, admin panels                       |
| Minor Third     | 1.200 | General-purpose apps, balanced hierarchy         |
| Major Third     | 1.250 | Content-heavy sites, editorial, marketing        |
| Perfect Fourth  | 1.333 | Landing pages, bold hierarchy                    |
| Augmented Fourth| 1.414 | High-impact marketing, hero-driven layouts       |
| Perfect Fifth   | 1.500 | Presentations, very dramatic contrast            |
| Golden Ratio    | 1.618 | Editorial, artistic layouts (often too extreme)  |

**Choosing a ratio:**
- **Dashboards and data-dense UIs:** Minor Second (1.067) or Major Second (1.125). You need
  many levels of text but small jumps between them.
- **General product UIs (SaaS, mobile apps):** Minor Third (1.200) or Major Third (1.250).
  Provides clear hierarchy without wasting vertical space.
- **Marketing and landing pages:** Perfect Fourth (1.333) or higher. Dramatic contrast between
  headings and body drives scanning and conversion.

**Example -- Major Third (1.250) scale from 16px base:**

```
Base:   16px   (Body)
Step 1: 20px   (Large Body / Subtitle)
Step 2: 25px   (H3)
Step 3: 31px   (H2)
Step 4: 39px   (H1)
Step 5: 49px   (Display)
Step 6: 61px   (Hero)
```

**Real-world design system scales:**

Material Design 3 type scale (15 tokens, Roboto, Regular/Medium weights):

| Role           | Size  | Line Height | Weight  | Tracking |
|----------------|-------|-------------|---------|----------|
| Display Large  | 57px  | 64px        | 400     | -0.25px  |
| Display Medium | 45px  | 52px        | 400     | 0        |
| Display Small  | 36px  | 44px        | 400     | 0        |
| Headline Large | 32px  | 40px        | 400     | 0        |
| Headline Medium| 28px  | 36px        | 400     | 0        |
| Headline Small | 24px  | 32px        | 400     | 0        |
| Title Large    | 22px  | 28px        | 400     | 0        |
| Title Medium   | 16px  | 24px        | 500     | 0.15px   |
| Title Small    | 14px  | 20px        | 500     | 0.1px    |
| Body Large     | 16px  | 24px        | 400     | 0.5px    |
| Body Medium    | 14px  | 20px        | 400     | 0.25px   |
| Body Small     | 12px  | 16px        | 400     | 0.4px    |
| Label Large    | 14px  | 20px        | 500     | 0.1px    |
| Label Medium   | 12px  | 16px        | 500     | 0.5px    |
| Label Small    | 11px  | 16px        | 500     | 0.5px    |

Ant Design font scale (base 14px, natural logarithm progression):

```
fontSizeSM:    12px
fontSize:      14px  (base)
fontSizeLG:    16px
fontSizeXL:    20px
fontSizeHeading5: 16px
fontSizeHeading4: 20px
fontSizeHeading3: 24px
fontSizeHeading2: 30px
fontSizeHeading1: 38px
```

The Ant Design scale uses a natural logarithm curve rather than a strict modular ratio,
resulting in sizes that feel slightly more compressed at the top end. Their base of 14px
(with 22px line height) reflects data-dense enterprise UI conventions.

### 1.2 Font Selection Criteria

**Readability factors:**
- **x-height:** Fonts with a tall x-height (the height of lowercase letters relative to
  capitals) are more legible at small sizes. Inter, Roboto, and SF Pro all have generous
  x-heights.
- **Open counters:** Letters like `a`, `e`, `g`, `s` should have clearly open interior
  spaces. Closed or narrow counters reduce legibility, especially at 12-14px.
- **Distinct letterforms:** Check for clear differentiation between `I` (capital i),
  `l` (lowercase L), and `1` (number one). Also check `0` vs `O`, `rn` vs `m`.
- **Character set coverage:** Verify the font covers all needed languages and includes
  tabular (monospaced) figures for data-heavy UIs.

**Personality and brand alignment:**

| Classification     | Examples                        | Personality                       | Best For                     |
|--------------------|---------------------------------|-----------------------------------|------------------------------|
| Geometric sans     | Futura, Poppins, Montserrat     | Modern, clean, slightly cold      | Tech products, portfolios    |
| Humanist sans      | Inter, Open Sans, Noto Sans     | Warm, readable, approachable      | General product UI           |
| Neo-grotesque      | Helvetica, Roboto, SF Pro       | Neutral, professional             | Platform defaults, corporate |
| Serif              | Georgia, Merriweather, Source Serif | Authority, tradition, editorial | Long-form, news, finance     |
| Monospace          | JetBrains Mono, Fira Code, SF Mono | Technical, precise             | Code, terminal, tabular data |

**Technical considerations:**
- **Variable fonts** are now best practice (2025-2026). A single variable font file replaces
  multiple static weight files, reducing payload by up to 80%. Inter Variable, for example,
  covers weights 100-900 and italic in one ~300KB WOFF2 file vs ~1.2MB for equivalent
  static files.
- **Optical sizing:** Some variable fonts (e.g., SF Pro, Roboto Flex) include an optical
  size axis that adjusts stroke contrast and spacing for different point sizes. This matters:
  SF Pro Text is optimized for below 20pt, SF Pro Display for 20pt and above.
- **WOFF2 format:** Always serve WOFF2. It offers 30% better compression than WOFF and is
  supported by 97%+ of browsers (Chrome 36+, Firefox 39+, Safari 12+, Edge 14+).

### 1.3 Line Height (Leading)

Line height controls vertical rhythm and directly impacts readability. The rules differ
for body text versus headings.

**Body text:** 1.4 to 1.6 times the font size.
- 16px body text should have 22-26px line height (1.375-1.625).
- The sweet spot for most sans-serif body text at 14-18px is **1.5** (150%).
- Longer line lengths demand more line height. At 75+ characters per line, push toward 1.6.
- Shorter line lengths (mobile, narrow columns) can use 1.4.

**Headings:** 1.1 to 1.3 times the font size.
- Large display text (36px+) should use tight line heights: 1.1 to 1.2.
- Medium headings (24-32px): 1.2 to 1.25.
- Small headings (18-22px): 1.25 to 1.3.
- Headings rarely wrap, so tight line height maintains visual density.

**Captions, labels, and small text (11-12px):** 1.3 to 1.5.
- Small text paradoxically needs proportionally more leading because the eye struggles
  to track back to the next line at small sizes.

**WCAG 2.2 requirement (SC 1.4.12, Level AA):** Content must remain readable and functional
when line height is set to at least 1.5 times the font size. Your default should meet or
exceed this.

### 1.4 Line Length (Measure)

**Optimal range:** 45-75 characters per line, with **66 characters** as the typographic
ideal for sustained reading (Bringhurst, Elements of Typographic Style).

- **Below 45 characters:** Too many line breaks. The eye constantly jumps to the next
  line, disrupting reading flow. Common on overly narrow mobile layouts.
- **Above 75 characters:** The eye loses its place when scanning back to the start of
  the next line. Baymard Institute research found that product descriptions wider than
  80 characters per line were skipped 41% more often than those in the 60-70 range.
- **Mobile screens:** 35-50 characters is acceptable given physical constraints. Use
  generous line height (1.5+) to compensate.

**Implementation:** Use `max-width: 65ch` (the `ch` unit equals the width of "0") on
text containers. For mobile-first: `max-width: min(65ch, 100% - 2rem)`.

### 1.5 Letter Spacing (Tracking)

Letter spacing adjusts the uniform space between all characters in a block of text.
Use em-based values so spacing scales with font size.

**Guidelines:**
- **Body text (14-18px):** Leave at default (0) or use minimal tracking (0 to 0.02em).
  Most well-designed body fonts have optimal built-in spacing. Adding tracking to body
  text typically reduces readability.
- **Headings (24px+):** Slightly negative tracking (-0.01em to -0.02em) tightens large
  text for visual cohesion. Material Design 3 uses -0.25px on Display Large (57px).
- **ALL CAPS text:** Always add 5-12% tracking (0.05em to 0.12em). Uppercase letters
  are designed to begin words, not sit adjacent to other capitals. Without extra spacing,
  all-caps text becomes a dense, illegible block.
- **Small caps:** Similar to all-caps, add 0.05em to 0.1em tracking.
- **Label and caption text (11-12px):** Slight positive tracking (0.02em to 0.05em)
  improves legibility at small sizes. M3 uses 0.5px tracking on its 11-12px labels.

**WCAG 2.2 (SC 1.4.12):** Content must remain usable when letter spacing is increased to
at least 0.12em. Design with this tolerance in mind -- do not use fixed-width containers
that overflow when spacing increases.

### 1.6 Word Spacing

Less commonly adjusted than letter spacing, but important for accessibility:
- Default word spacing works for most cases.
- For all-caps text or wide-tracked text, increase word spacing proportionally (0.05em
  to 0.16em) so words remain distinguishable.
- **WCAG 2.2 (SC 1.4.12):** Content must function when word spacing is set to 0.16em.

### 1.7 Font Weight Hierarchy

Use weight to create emphasis hierarchy. Limit yourself to 2-3 weights per typeface
in a single interface.

| Weight  | CSS Value | Typical Use                              |
|---------|-----------|------------------------------------------|
| Thin    | 100       | Decorative display text only (40px+)     |
| Light   | 300       | Large display headings, stylistic choice |
| Regular | 400       | Body text, descriptions, default         |
| Medium  | 500       | Subheadings, emphasized body, nav items  |
| Semibold| 600       | Section headings, buttons, key labels    |
| Bold    | 700       | Primary headings, strong emphasis        |
| Black   | 900       | Hero text, display sizes only (36px+)    |

**Rules:**
- Never use Thin (100) or Light (300) below 20px. Thin strokes disappear on low-DPI
  screens and are unreadable for users with low vision.
- The minimum recommended contrast between weight levels is 200 units (e.g., 400 vs 600).
  A jump from Regular (400) to Medium (500) is often too subtle to create clear hierarchy.
- **Ant Design's recommendation:** Regular (400) and Medium (500) are sufficient for most
  UIs; Semibold (600) for English bold text. This restraint prevents visual noise.

### 1.8 Web Font Loading Strategies

Custom fonts create a performance tension: beautiful typography vs fast rendering.
Three phenomena to understand:

- **FOIT (Flash of Invisible Text):** Browser hides text until the custom font loads.
  Text is invisible for up to 3 seconds on slow connections. Terrible for usability.
- **FOUT (Flash of Unstyled Text):** Browser shows fallback font immediately, then swaps
  to custom font when loaded. Causes a visible text reflow but text is always readable.
- **FOFT (Flash of Faux Text):** Load a minimal subset (Roman/Regular) first, then load
  additional weights/styles. Most advanced strategy.

**The `font-display` CSS property:**

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately, swap when loaded */
}
```

| Value      | Behavior                                | When to Use                        |
|------------|----------------------------------------|-------------------------------------|
| `auto`     | Browser decides (usually FOIT)         | Never use explicitly                |
| `block`    | Invisible for ~3s, then fallback       | Icon fonts only                     |
| `swap`     | Fallback immediately, swap when ready  | Most text fonts (default choice)    |
| `fallback` | 100ms invisible, then fallback stays   | Body text where layout shift is bad |
| `optional` | Instant fallback; font used only if    | Performance-critical pages          |
|            | already cached                         |                                     |

**Best practice stack (2025-2026):**
1. Use `font-display: swap` or `font-display: fallback` for body fonts.
2. Preload the critical font file: `<link rel="preload" href="/fonts/inter-var.woff2"
   as="font" type="font/woff2" crossorigin>`.
3. Combine `rel="preload"` with `font-display: optional` to eliminate layout shifts entirely
   (supported since Chrome 83).
4. Subset fonts to include only needed character ranges (Latin, Latin Extended) to reduce
   file size by 50-70%.
5. Self-host fonts instead of using Google Fonts CDN -- avoids third-party DNS lookup,
   connection overhead, and privacy issues (GDPR).

### 1.9 System Font Stacks vs Custom Fonts

**System font stacks** use fonts already installed on the user's OS:

```css
/* Modern system font stack */
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji';
/* Neo-Grotesque (includes Inter if installed) */
font-family: Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif;
```

**When to use system fonts:** Performance-critical apps, dashboards, admin panels,
internal tools, anything that should feel native. Zero network requests, no FOUT/FOIT.

**When to use custom fonts:** Consumer-facing products where brand identity matters,
marketing sites, editorial content, or when specific typographic features are needed.

**Hybrid approach (recommended):** System font stack for body text (performance) plus
a single custom font for headings/display only (brand expression with minimal cost).

---

## 2. Do's and Don'ts

### Do's

1. **Do use 16px (1rem) as your minimum body text size on all platforms.** The browser
   default is 16px for a reason. Research consistently shows that 16px is the threshold
   below which reading speed decreases measurably. On mobile, 16px also prevents iOS
   Safari from auto-zooming on input focus (which occurs below 16px).

2. **Do limit your type scale to 5-7 distinct sizes.** Ant Design recommends 3-5 sizes
   for most interfaces. Material Design 3 uses 15 tokens but groups them into 5 roles.
   More sizes means more decisions, more inconsistency, and more cognitive load.

3. **Do set line height in unitless values, not px.** Use `line-height: 1.5` not
   `line-height: 24px`. Unitless values scale proportionally when font size changes
   (via user preferences or responsive scaling).

4. **Do use `rem` for font sizes and `em` for letter/word spacing.** `rem` respects
   user browser settings. `em` scales spacing relative to the current font size. Avoid
   `px` for font sizes -- it overrides user accessibility preferences.

5. **Do constrain text containers to 65ch max-width.** The `ch` unit maps to the width
   of the "0" character. `65ch` yields approximately 65-70 characters per line -- within
   the optimal readability range.

6. **Do test typography at 200% zoom.** WCAG 2.2 SC 1.4.4 (Level AA) requires content
   to be readable and functional at 200% zoom. If your layout breaks or text overflows
   at 2x, your typography system is fragile.

7. **Do add 5-12% letter spacing to all-caps text.** Set `letter-spacing: 0.05em` to
   `0.12em` on any `text-transform: uppercase` element. Without it, uppercase text
   becomes a dense, illegible wall.

8. **Do pair fonts with contrasting characteristics.** If combining two typefaces, pair
   a serif heading font with a sans-serif body font (or vice versa). Two fonts from the
   same classification (e.g., two geometric sans-serifs) look like a mistake, not a choice.

9. **Do use variable fonts for any font loaded over the network.** A single variable
   font file replaces 4-8 static files, reducing payload by 50-80% and HTTP requests.
   Inter Variable, Roboto Flex, and Source Sans 3 VF are excellent free options.

10. **Do implement fluid typography with `clamp()` for responsive headings.**
    ```css
    h1 { font-size: clamp(2rem, 5vw + 1rem, 3.5rem); }
    h2 { font-size: clamp(1.5rem, 3vw + 0.75rem, 2.5rem); }
    ```
    This creates smooth scaling between a minimum and maximum size, eliminating abrupt
    breakpoint jumps.

11. **Do define a vertical rhythm unit and stick to it.** If your base line height is
    24px (16px * 1.5), all spacing (margins, padding) should be multiples of that 24px
    unit (or 4px/8px subdivisions). This creates a consistent visual cadence.

12. **Do preload your primary font file.** Add `<link rel="preload">` for the single
    most critical font file (usually the body Regular weight). This shaves 100-300ms
    off font load time.

13. **Do support Dynamic Type on iOS and scalable `sp` units on Android.** Hard-coded
    pixel sizes break accessibility settings. Users who increase their system font size
    are doing so because they need to -- respect that preference.

14. **Do test with real content, not lorem ipsum.** Lorem ipsum hides line-length
    problems, orphan/widow issues, and awkward hyphenation. Use representative text in
    the target language.

### Don'ts

1. **Don't use body text smaller than 14px on desktop or 16px on mobile.** Below 14px,
   readability drops approximately 40% for users over 40 (age-related presbyopia).
   Material Design's smallest body token (Body Small) is 12px but is intended for
   captions and supplementary text, not sustained reading.

2. **Don't use more than 2 typeface families in a single interface.** One for headings,
   one for body. A third (monospace) is acceptable for code. More than two custom
   families creates visual chaos and doubles font loading costs.

3. **Don't use Thin (100) or Light (300) weights below 20px.** At small sizes, thin
   strokes disappear on non-retina screens and become unreadable for low-vision users.
   Light weights below 16px fail WCAG contrast requirements in many color combinations.

4. **Don't set line height in fixed pixel values on text that can scale.** `line-height:
   24px` on text that grows to 20px at larger breakpoints produces cramped, overlapping
   lines. Always use unitless multipliers.

5. **Don't center-align paragraphs longer than 3 lines.** Centered text creates ragged
   left edges that the eye cannot track consistently. Center alignment is acceptable
   for short headings, pull quotes, and single-line captions only.

6. **Don't justify text on the web without hyphenation.** `text-align: justify` without
   `hyphens: auto` creates ugly, irregular word spacing (rivers of white space). Even
   with hyphenation, justified text is problematic on narrow mobile columns.

7. **Don't use color alone to convey typographic hierarchy.** A gray label vs a black
   heading looks identical to someone with low contrast sensitivity. Combine color
   differences with size and/or weight differences.

8. **Don't load more than 3 font files (weights/styles) without a performance budget.**
   Each additional font file adds 20-50KB (WOFF2) and a network request. Total custom
   font budget should stay under 150KB for performance-sensitive applications.

9. **Don't use `px` for font sizes in CSS.** Pixel values override user browser font-size
   preferences, breaking accessibility. A user who sets their browser default to 20px
   (for low vision) gets 16px anyway if you hard-code `font-size: 16px`. Use `rem`.

10. **Don't apply letter-spacing to body text unless the font specifically requires it.**
    Most professional body fonts have carefully tuned default spacing. Adding tracking
    to body text at 14-18px typically reduces reading speed by 5-10%.

11. **Don't use decorative or display fonts for body text.** Display fonts (Playfair
    Display, Lobster, Pacifico) are designed for large sizes (36px+). At body sizes,
    their stylistic flourishes become noise that impedes reading.

12. **Don't ignore font fallback matching.** When your custom font loads after a system
    fallback, mismatched metrics (x-height, character width) cause layout shift.
    Use `size-adjust`, `ascent-override`, and `descent-override` in `@font-face` to
    match fallback metrics:
    ```css
    @font-face {
      font-family: 'Inter Fallback';
      src: local('Arial');
      size-adjust: 107%;
      ascent-override: 90%;
      descent-override: 22%;
    }
    ```

13. **Don't use line lengths above 80 characters on any viewport.** Even on wide desktop
    screens, unconstrained text width destroys readability. Always set `max-width` on
    text containers.

14. **Don't mix font-size specification methods.** If your design system uses `rem`,
    use `rem` everywhere. Mixing `px`, `rem`, `em`, and `vw` for font sizes creates
    unpredictable scaling behavior and maintenance nightmares.

---

## 3. Platform Variations

### 3.1 iOS

**System font:** SF Pro (variable font with weight, width, optical size, and grade axes).
- SF Pro Text: Optimized for sizes below 20pt (more open spacing, slightly wider).
- SF Pro Display: Optimized for 20pt and above (tighter spacing, refined details).
- SF Pro Rounded: Alternative with rounded terminals for friendly UIs.

**Minimum size:** 11pt. Apple considers this the absolute floor for legible text. In
practice, use 13pt as the effective minimum for non-caption text.

**Default body size:** 17pt. This is the standard `body` text style in UIKit and SwiftUI.

**Dynamic Type:** Mandatory for App Store approval in spirit, strongly recommended in
practice. Dynamic Type defines text sizes across 12 levels:
- Standard sizes: xSmall through xxxLarge (7 levels)
- Accessibility sizes: AX1 through AX5 (5 levels, for users with significant vision needs)

Implementation requires using Apple's text styles (`UIFont.TextStyle`): `.largeTitle`,
`.title1`, `.title2`, `.title3`, `.headline`, `.subheadline`, `.body`, `.callout`,
`.footnote`, `.caption1`, `.caption2`.

**Key iOS-specific rules:**
- Never hard-code point sizes. Use text styles that respond to the user's Dynamic Type
  setting.
- Test at the largest accessibility size (AX5). Layouts must scroll, not truncate.
- SF Pro automatically applies optical sizing -- you do not need to manually switch
  between Text and Display variants in code.

### 3.2 Android

**System font:** Roboto (Regular and Medium weights in M3 baseline).
- Material Design 3 uses Roboto as the default for all 15 type scale tokens.
- Variable font version (Roboto Flex) available with weight, width, and optical size axes.

**Minimum size:** 12sp. The `sp` (scale-independent pixel) unit respects user accessibility
font-size settings. Never use `dp` for text -- it does not scale with user preferences.

**Material Design 3 type scale roles:**
- **Display:** Hero and feature text (57/45/36sp). Used sparingly.
- **Headline:** Section and screen titles (32/28/24sp).
- **Title:** Subsection headers and emphasized navigation (22/16/14sp).
- **Body:** Paragraphs and general content (16/14/12sp).
- **Label:** Buttons, tabs, navigation, chips (14/12/11sp).

**Key Android-specific rules:**
- Use `sp` units for all text sizes.
- Support font scaling up to 200% (Android 14+ allows non-linear font scaling where
  large text scales less aggressively than small text).
- Test on devices with 120dpi (ldpi) through 640dpi (xxxhdpi).
- Use `MaterialTheme.typography` tokens in Jetpack Compose rather than raw sp values.

### 3.3 Web

**System font stack (zero network cost):**
```css
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
    sans-serif;
}
```

This renders SF Pro on macOS/iOS, Segoe UI on Windows, and Roboto on Android/ChromeOS.

**Responsive typography with `clamp()`:**
```css
/* Fluid type scale -- no media queries needed */
:root {
  --text-xs:    clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);   /* 12-14px */
  --text-sm:    clamp(0.875rem, 0.8rem + 0.35vw, 1rem);       /* 14-16px */
  --text-base:  clamp(1rem, 0.9rem + 0.5vw, 1.125rem);        /* 16-18px */
  --text-lg:    clamp(1.125rem, 1rem + 0.6vw, 1.25rem);       /* 18-20px */
  --text-xl:    clamp(1.25rem, 1rem + 1.2vw, 1.75rem);        /* 20-28px */
  --text-2xl:   clamp(1.5rem, 1rem + 2vw, 2.25rem);           /* 24-36px */
  --text-3xl:   clamp(1.875rem, 1rem + 3.5vw, 3rem);          /* 30-48px */
  --text-4xl:   clamp(2.25rem, 1rem + 5vw, 3.75rem);          /* 36-60px */
}

body {
  font-size: var(--text-base);
  line-height: 1.5;
}

h1 { font-size: var(--text-4xl); line-height: 1.1; }
h2 { font-size: var(--text-3xl); line-height: 1.15; }
h3 { font-size: var(--text-2xl); line-height: 1.2; }
h4 { font-size: var(--text-xl);  line-height: 1.25; }
```

**USWDS (U.S. Web Design System) approach:** Defines a 10-step normalized scale (3xs
through 3xl) mapped to specific rem values, with responsive overrides per breakpoint.

**Key web-specific rules:**
- Always set `font-size` on `<html>` as a percentage (e.g., `font-size: 100%`) not
  pixels, to respect user browser defaults.
- Use `rem` for all font sizes. Reserve `em` for spacing properties (margins, padding)
  that should scale relative to their local font size.
- Test at browser zoom levels of 100%, 150%, and 200%.
- Test with browser minimum font size set to 16px and 24px.
- Use `@media (prefers-reduced-motion)` to disable any typographic animations.

### 3.4 Desktop (Native)

**Windows:** Segoe UI Variable (Windows 11+), Segoe UI (Windows 10). Default body size
is 14px (9pt at 96 DPI). Minimum recommended: 12px.

**macOS:** SF Pro via system API. Default body size is 13pt. The macOS typography scale
uses different defaults than iOS due to typical viewing distance (arm's length vs
handheld).

**Linux:** Varies by distribution. Noto Sans, DejaVu Sans, and Ubuntu are common. Design
for fallback robustness.

**Key desktop rules:**
- Desktop users sit further from the screen than mobile users. Slightly smaller body
  text (14px vs 16px) is acceptable because viewing distance compensates.
- High-DPI (Retina, 4K) displays render thin font weights better than standard DPI.
  Account for both in your weight choices.
- Honor system-level font size and scaling preferences. Both Windows and macOS allow
  users to increase system text size.

---

## 4. Common Mistakes in AI-Generated Designs

AI design tools (Midjourney, DALL-E, Figma AI, and code-generating LLMs) produce
typography that looks plausible in mockups but fails in implementation. Here are the
most common errors and how to detect and fix them.

### 4.1 Too Many Font Sizes

**The problem:** AI tools generate unique font sizes for every text element, producing
8-15 distinct sizes in a single screen. This prevents systematic implementation and
creates visual noise.

**How to detect:** Export the design and list all unique font sizes. If there are more
than 6-7 distinct values, the scale is inconsistent.

**How to fix:** Map every AI-generated size to the nearest step in your type scale.
Round 15px to 14px, 19px to 20px, 27px to 28px. If a size doesn't fit the scale, it
shouldn't exist.

### 4.2 Inconsistent Line Heights

**The problem:** AI generates different line-height ratios for text at the same size.
One 16px paragraph has 24px line height (1.5) while another has 20px (1.25). Or worse,
large headings have more proportional line height than body text (inverted hierarchy).

**How to detect:** Calculate the line-height ratio for every text block. Body text ratios
should be 1.4-1.6, heading ratios should be 1.1-1.3. Flag any body text below 1.4 or
headings above 1.35.

**How to fix:** Define line-height tokens paired to each font-size token in your design
system. Every font size gets exactly one line height.

### 4.3 Wrong Font Weight Usage

**The problem:** AI often uses Regular (400) and Bold (700) exclusively, missing the
middle weights (Medium 500, Semibold 600) that create nuanced hierarchy. Or it uses
Light (300) for body text, which is illegible on non-retina screens.

**How to detect:** Audit all font weights used. If only 400 and 700 appear, the hierarchy
is too blunt. If 100-300 appears below 20px, it's unreadable.

**How to fix:** Introduce Medium (500) for subheadings and navigation, Semibold (600)
for section headings. Reserve Bold (700) for primary headings only.

### 4.4 Variable Font Axis Violations

**The problem:** AI tools sometimes generate weight values outside a font's supported
range, or use arbitrary values like weight 450 on a font that only has 400 and 700.
Some tools misinterpret "medium" as weight 500 when the font's optical medium is
420-460.

**How to detect:** Check the font's axis ranges (available in the font file metadata
or on Google Fonts). Flag any weight values outside the font's min/max.

**How to fix:** Map generated values to the font's actual supported weight stops. Test
at extremes (especially width below 60% and weight above 900) to catch glyph collapse.

### 4.5 Missing Responsive Considerations

**The problem:** AI designs a single viewport (usually desktop at 1440px) and the type
scale doesn't adapt to mobile. 48px headings that work on desktop are absurdly large
on a 375px phone.

**How to detect:** Preview the design at 375px width. If headings wrap to 3+ lines or
text overflows, the typography is not responsive.

**How to fix:** Define minimum and maximum sizes for each token. Implement with
`clamp()` on web, Dynamic Type on iOS, or sp-based scaling on Android.

### 4.6 Decorative Choices Over Readability

**The problem:** AI loves stylistic choices: ultra-thin weights, all-caps body text,
extreme letter spacing, decorative fonts for UI labels.

**How to detect:** Read 200 words of the body text at actual size. If you have to
squint or slow down, it's too stylized.

**How to fix:** Reserve decorative treatment for display text (hero headings, marketing
callouts). All functional text (body, labels, navigation, forms) should use a neutral,
highly legible typeface at Regular or Medium weight.

---

## 5. Decision Framework

### 5.1 Serif vs Sans-Serif vs Monospace

| Factor             | Serif                          | Sans-Serif                     | Monospace               |
|--------------------|--------------------------------|--------------------------------|-------------------------|
| **Readability**    | Equal on HD screens;           | Slightly better on             | Poor for prose;         |
|                    | better for long-form print     | low-res screens                | good for code           |
| **Personality**    | Authority, tradition,          | Modern, clean,                 | Technical,              |
|                    | editorial, luxury              | approachable                   | precise, raw            |
| **Best for**       | News, editorial, legal,        | Product UI, SaaS,              | Code, data tables,      |
|                    | finance, publishing            | mobile apps, dashboards        | terminal output         |
| **Avoid for**      | Dense data UIs at small        | Long-form editorial            | Any body text           |
|                    | sizes on low-DPI screens       | (can feel sterile)             | (too wide, too uniform) |
| **Screen quality** | Needs high-res to render       | Works on any screen            | Works on any screen     |
|                    | serifs crisply                 | quality                        |                         |

**Decision rule:** If the primary content is long-form reading (articles, documentation),
consider a serif. For everything else, default to sans-serif. Use monospace exclusively
for code and fixed-width data.

Nielsen Norman Group's research (2024) confirms that on modern high-resolution screens,
the readability difference between serif and sans-serif is negligible. Context, spacing,
and contrast matter more than serif presence.

### 5.2 System Fonts vs Custom Fonts

| Factor             | System Fonts                   | Custom Fonts                   |
|--------------------|--------------------------------|--------------------------------|
| **Performance**    | Zero load time, no CLS         | 20-150KB payload, FOUT/CLS     |
| **Brand**          | Generic, platform-native feel  | Unique brand identity          |
| **Maintenance**    | Zero -- OS handles updates     | Must manage licensing, hosting  |
| **Consistency**    | Different on each OS           | Identical cross-platform        |
| **Cost**           | Free                           | Licensing fees (or free via GF) |
| **Accessibility**  | Respected by OS settings       | May fight OS font preferences   |

**Decision rule:** Start with system fonts. Move to a custom font only when brand
identity is a primary product requirement AND you have a performance budget for it.
A single variable font file (WOFF2, subset to Latin) typically adds 30-80KB -- acceptable
for most products.

### 5.3 Trade-offs Matrix

| Priority          | Optimize for                           | Sacrifice                         |
|-------------------|----------------------------------------|-----------------------------------|
| **Performance**   | System fonts, font-display: optional   | Brand uniqueness                  |
| **Brand**         | Custom variable font, distinctive scale| 30-80KB payload, potential CLS    |
| **Readability**   | 16px+ body, 1.5 line height, 65ch max  | Compact layouts, information density|
| **Density**       | 13-14px body, 1.35 line height         | Readability for older/impaired users|
| **Accessibility** | rem units, Dynamic Type, 200% zoom     | Pixel-perfect control             |

---

## 6. Quick Reference Checklist

Use this checklist to audit typography in any design or implementation. Every item should
be verified before shipping.

### Scale and Sizing
- [ ] **Type scale uses 5-7 distinct sizes maximum** (not counting responsive variants)
- [ ] **Base body text is at least 16px (1rem) on mobile, at least 14px on desktop**
- [ ] **Font sizes use `rem` (web), `sp` (Android), or text styles with Dynamic Type (iOS)**
- [ ] **Display/hero text does not exceed 7 distinct sizes in the full scale**
- [ ] **Heading sizes decrease in a consistent ratio (no arbitrary jumps)**

### Line Height and Spacing
- [ ] **Body text line height is 1.4-1.6 (unitless)**
- [ ] **Heading line height is 1.1-1.3 (unitless)**
- [ ] **Line length is 45-75 characters (use `max-width: 65ch` on text containers)**
- [ ] **All-caps text has letter-spacing of 0.05em-0.12em**
- [ ] **Vertical spacing follows a consistent rhythm (multiples of base line height)**

### Font Loading and Performance
- [ ] **Total custom font payload is under 150KB (WOFF2)**
- [ ] **Primary font is preloaded via `<link rel="preload">`**
- [ ] **`font-display: swap` or `fallback` is set on all `@font-face` rules**
- [ ] **Fallback font metrics are matched with `size-adjust` to minimize CLS**
- [ ] **Variable fonts are used instead of multiple static weight files**

### Accessibility
- [ ] **No text below 11px/11pt on any platform**
- [ ] **Layout survives 200% browser zoom without overflow or truncation**
- [ ] **Layout survives WCAG 1.4.12 text spacing overrides (1.5x line height, 0.12em letter spacing, 0.16em word spacing, 2x paragraph spacing)**
- [ ] **Font weight of body text is Regular (400) or Medium (500) -- never Thin/Light for functional text below 20px**
- [ ] **Color is not the only differentiator in the type hierarchy (size or weight also differs)**

### Platform Compliance
- [ ] **iOS: Dynamic Type is implemented; text styles used instead of hard-coded sizes**
- [ ] **Android: sp units used for all text; tested with system font scaling at 200%**
- [ ] **Web: `<html>` font-size is percentage-based (not px); tested at multiple zoom levels**
- [ ] **Cross-platform: typography tokens are defined in a shared design system, not ad hoc per screen**

---

## Appendix: Reference Values at a Glance

### Minimum Font Sizes by Platform

| Platform       | Absolute Minimum | Recommended Body Minimum |
|----------------|------------------|--------------------------|
| iOS            | 11pt             | 17pt (system default)    |
| Android        | 12sp             | 14sp (M3 Body Medium)    |
| Web (mobile)   | 12px             | 16px (1rem)              |
| Web (desktop)  | 12px             | 14px (0.875rem)          |
| macOS          | 10pt             | 13pt (system default)    |
| Windows        | 9pt              | 14px (Segoe UI default)  |

### WCAG 2.2 Text Spacing Requirements (SC 1.4.12, Level AA)

| Property           | Minimum Value               |
|--------------------|-----------------------------|
| Line height        | 1.5x font size              |
| Paragraph spacing  | 2x font size                |
| Letter spacing     | 0.12x font size (0.12em)    |
| Word spacing       | 0.16x font size (0.16em)    |

Content must remain readable and functional when users apply these overrides.
Do not use fixed-height containers or `overflow: hidden` on text blocks.

### Recommended Font Pairings

| Heading Font            | Body Font                | Style                    |
|-------------------------|--------------------------|--------------------------|
| SF Pro Display          | SF Pro Text              | Native iOS/macOS         |
| Roboto                  | Roboto                   | Native Android / M3      |
| Inter (600-700)         | Inter (400)              | Modern product UI        |
| Source Serif 4           | Source Sans 3            | Editorial / documentation|
| Playfair Display        | Lato                     | Luxury / lifestyle       |
| Space Grotesk           | Inter                    | Tech / developer tools   |
| Fraunces                | Commissioner             | Warm editorial           |

### CSS Fluid Typography Starter

```css
:root { font-size: clamp(100%, 90% + 0.5vw, 112.5%); }
body  {
  font-family: system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, sans-serif;
  font-size: 1rem; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
h1 { font-size: clamp(2rem, 1rem + 4vw, 3.5rem); line-height: 1.1; letter-spacing: -0.02em; font-weight: 700; }
h2 { font-size: clamp(1.5rem, 0.75rem + 3vw, 2.5rem); line-height: 1.15; font-weight: 700; }
h3 { font-size: clamp(1.25rem, 0.75rem + 2vw, 1.75rem); line-height: 1.2; font-weight: 600; }
p, li, dd { max-width: 65ch; line-height: 1.5; }
small, .caption { font-size: 0.875rem; line-height: 1.4; }
.all-caps { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
code, pre { font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace; font-size: 0.875em; }
```

---

**Sources:**

- [Material Design 3 -- Typography Type Scale Tokens](https://m3.material.io/styles/typography/type-scale-tokens)
- [Apple Human Interface Guidelines -- Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Ant Design -- Font Specification](https://ant.design/docs/spec/font/)
- [WCAG 2.2 -- Understanding SC 1.4.12: Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
- [Smashing Magazine -- Modern Fluid Typography Using CSS Clamp](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)
- [Baymard Institute -- Line Length Readability](https://baymard.com/blog/line-length-readability)
- [Nielsen Norman Group -- Serif vs Sans-Serif Fonts for HD Screens](https://www.nngroup.com/articles/serif-vs-sans-serif-fonts-hd-screens/)
- [Butterick's Practical Typography -- Line Length](https://practicaltypography.com/line-length.html)
- [CSS-Tricks -- Keeping Track of Letter-Spacing Guidelines](https://css-tricks.com/keeping-track-letter-spacing-guidelines/)
- [Modern Font Stacks](https://modernfontstacks.com)
- [Zachleat -- Comprehensive Guide to Font Loading Strategies](https://www.zachleat.com/web/comprehensive-webfonts)
- [web.dev -- Responsive and Fluid Typography with Baseline CSS Features](https://web.dev/articles/baseline-in-action-fluid-type)
- [Material Web -- Typography Theming](https://material-web.dev/theming/typography/)
- [Learn UI Design -- iOS Font Size Guidelines](https://www.learnui.design/blog/ios-font-size-guidelines.html)
- [Learn UI Design -- Android/Material Design Font Size Guidelines](https://www.learnui.design/blog/android-material-design-font-size-guidelines.html)
