# RTL (Right-to-Left) Design -- Design Expertise Module

> A comprehensive foundation for designing applications that correctly support right-to-left (RTL) languages including Arabic, Hebrew, Farsi (Persian), and Urdu. RTL design extends far beyond mirroring a layout -- it requires understanding bidirectional text algorithms, typographic conventions unique to each script, icon directionality semantics, CSS logical properties, and platform-specific APIs. Over 500 million native speakers use RTL scripts as their primary language, making RTL support a fundamental requirement for any globally distributed product.

> **Category:** Foundation
> **Applies to:** All platforms (Web, iOS, Android, Flutter, Desktop)
> **Key sources:** Material Design RTL/BiDi guidelines, Apple HIG Internationalization, W3C Internationalization Best Practices, MDN CSS Logical Properties

---

## 1. Core Principles

### 1.1 RTL Mirroring -- What Mirrors and What Does Not

An RTL layout is the mirror image of an LTR layout. However, mirroring is not universal -- certain elements must remain unmirrored to preserve meaning.

**Elements that MUST mirror:**

| Element | LTR | RTL |
|---|---|---|
| Navigation flow | Left to right | Right to left |
| Sidebar/drawer | Opens from left | Opens from right |
| Back/forward buttons | Back=left, Forward=right | Back=right, Forward=left |
| List item leading icons | Icon on left of text | Icon on right of text |
| Progress bars / Sliders | Fill/min on left | Fill/min on right |
| Toggle switches | Off=left, On=right | Off=right, On=left |
| Tab order | First tab on left | First tab on right |
| Form layouts | Label left, input right | Label right, input left |
| Pagination | Previous left, next right | Previous right, next left |
| Carousels | Swipe left for next | Swipe right for next |
| Vertical scrollbar | Right side | Left side |
| Rating stars (partial fill) | Fill left to right | Fill right to left |
| Timelines | Past left, future right | Past right, future left |
| Breadcrumbs | Flow left to right | Flow right to left |

**Elements that must NOT mirror:**

| Element | Reason |
|---|---|
| Media playback controls (play, pause, skip) | Represent tape direction, not reading direction |
| Clocks and circular progress indicators | Clocks turn clockwise universally |
| Checkmarks and X marks | Universal symbols, no directional meaning |
| Brand logos | Identity elements must remain consistent |
| Numeric keypads | Layout is standardized globally |
| Graphs/charts (x-axis) | Mathematical convention, not linguistic |
| Images and photographs | Content is not directional |
| Circular refresh indicators | Clockwise rotation is universal |
| Code editors/snippets | Programming languages are always LTR |

### 1.2 Bidirectional (BiDi) Text Handling

Bidirectional text occurs when RTL and LTR content coexist in the same string -- extremely common since Arabic text routinely contains English brand names, URLs, and numbers. The Unicode Bidirectional Algorithm (UBA, UAX #9) handles most cases automatically, but edge cases require manual intervention.

**When the algorithm needs help:**
- Weak characters (punctuation, spaces) at RTL/LTR boundaries can attach to the wrong direction
- Paths with mixed scripts: `"/users/محمد/documents"` may render incorrectly
- Phone numbers with country codes: the plus sign is a weak character

**HTML solutions:**

```html
<html dir="rtl" lang="ar">                          <!-- Base direction -->
<p>المستخدم <bdi>@john_doe</bdi> أضاف تعليقا</p>   <!-- Isolate embedded LTR -->
<code dir="ltr">npm install package</code>           <!-- Force LTR for code -->
<textarea dir="auto"></textarea>                      <!-- Auto-detect for UGC -->
```

**Key Unicode control characters:**

| Character | Code Point | Usage |
|---|---|---|
| LRM (Left-to-Right Mark) | U+200E | Force LTR ordering at ambiguous boundaries |
| RLM (Right-to-Left Mark) | U+200F | Force RTL ordering at ambiguous boundaries |
| LRI (Left-to-Right Isolate) | U+2066 | Isolate LTR content without affecting surroundings |
| RLI (Right-to-Left Isolate) | U+2067 | Isolate RTL content without affecting surroundings |
| FSI (First Strong Isolate) | U+2068 | Auto-detect direction and isolate |
| PDI (Pop Directional Isolate) | U+2069 | End isolation |

### 1.3 CSS Logical Properties

CSS logical properties replace physical directional values with flow-relative values. When `dir="rtl"` is set, they automatically flip without additional CSS rules.

**Property mapping (horizontal writing mode):**

| Physical Property | Logical Property | LTR = | RTL = |
|---|---|---|---|
| `margin-left` | `margin-inline-start` | margin-left | margin-right |
| `margin-right` | `margin-inline-end` | margin-right | margin-left |
| `padding-left` | `padding-inline-start` | padding-left | padding-right |
| `padding-right` | `padding-inline-end` | padding-right | padding-left |
| `border-left` | `border-inline-start` | border-left | border-right |
| `left` | `inset-inline-start` | left | right |
| `right` | `inset-inline-end` | right | left |
| `text-align: left` | `text-align: start` | left | right |
| `text-align: right` | `text-align: end` | right | left |
| `float: left` | `float: inline-start` | left | right |
| `border-top-left-radius` | `border-start-start-radius` | top-left | top-right |

**Shorthand usage:**

```css
.element {
  margin-block: 10px;           /* top and bottom */
  margin-inline: 30px 20px;    /* start and end */
  padding-inline: 24px 16px;
  border-inline-start: 2px solid blue;
}
```

Browser support: Chrome 87+, Firefox 66+, Safari 15+, Edge 87+. Production-ready.

### 1.4 Flexbox and Grid RTL Behavior

Flexbox and CSS Grid automatically respond to document direction. `flex-direction: row` lays items right-to-left when `dir="rtl"` is set. CSS Grid column definitions also reverse. Named grid areas reverse physical placement. No code changes needed -- just avoid hardcoding `left`/`right` on flex/grid children.

### 1.5 Text Alignment

Always use `start`/`end` instead of `left`/`right`. Center alignment works identically in both directions. Most UI frameworks default to "natural" alignment that matches reading direction automatically.

### 1.6 Number Handling

Numbers in RTL languages are always read left to right. The digit sequence `123` is never displayed as `321`. However, numeral glyphs vary by locale.

| Language/Region | Glyphs | Unicode Range |
|---|---|---|
| Arabic (Gulf states) | ٠١٢٣٤٥٦٧٨٩ | U+0660-U+0669 |
| Persian / Urdu | ۰۱۲۳۴۵۶۷۸۹ | U+06F0-U+06F9 |
| Hebrew / Maghreb Arabic | 0123456789 | U+0030-U+0039 |

**Key rules:**
- Digit sequences are always LTR in visual order
- Currency/percentage symbols follow locale conventions (Arabic: `%25` reads visually as "25%")
- Phone numbers are always LTR
- Use `Intl.NumberFormat` / locale-aware APIs -- never manually construct number strings

```javascript
new Intl.NumberFormat('ar-EG').format(1234567.89)  // "١٬٢٣٤٬٥٦٧٫٨٩"
new Intl.NumberFormat('ar-MA').format(1234567.89)  // "1.234.567,89" (Western numerals)
```

### 1.7 Typography Considerations

**Arabic script specifics:**
- **Connected letters (cursive joining):** Arabic is always cursive. Each letter has up to four forms: isolated, initial, medial, final. The rendering engine must perform contextual shaping.
- **No uppercase/lowercase:** Use bold weight, color, or size for emphasis instead of capitalization.
- **Larger font sizes needed:** Increase Arabic font size by 20-25% relative to Latin for equivalent readability. Minimum readable body size: 16-18px (vs. 14-16px for Latin).
- **Line height:** Arabic body text needs line-height of 1.8-2.0 (vs. 1.4-1.6 for Latin) due to connected script and diacritical marks above/below letters.
- **No italics:** Arabic has no italic tradition. CSS `font-style: italic` produces ugly results or no effect. Never use italics for Arabic.
- **Bold with caution:** Heavy bold reduces legibility. Prefer medium or semi-bold weights.
- **Kashida (elongation):** Arabic justification elongates connecting strokes rather than adding inter-word space. CSS kashida support is limited; prefer right-aligned text over justified.

**Hebrew script:** Disconnected letters (simpler than Arabic), no case distinction, font size increase of 5-10% sufficient, visual sizing closer to Latin.

**Font recommendations:**

| Font | Script | Best For |
|---|---|---|
| Noto Sans Arabic | Arabic | Broad coverage, Google ecosystem |
| Cairo | Arabic | Modern geometric UIs, headings |
| IBM Plex Sans Arabic | Arabic | Enterprise, dev platforms |
| Tajawal / Almarai | Arabic | Clean mobile UIs, body text |
| Heebo | Hebrew | Modern web UIs |
| IBM Plex Sans Hebrew | Hebrew | Enterprise applications |
| Vazirmatn | Farsi | Persian/Farsi UIs |
| Noto Nastaliq Urdu | Urdu | Urdu content (Nastaliq style) |

**CSS font stack example:**

```css
:root[dir="rtl"][lang="ar"] {
  --font-family: 'Noto Sans Arabic', 'Cairo', 'Tahoma', sans-serif;
  --font-size-base: 1.1rem;   /* ~20% larger than LTR base */
  --line-height-base: 1.8;
}
:root[dir="rtl"][lang="he"] {
  --font-family: 'Heebo', 'Noto Sans Hebrew', 'Arial Hebrew', sans-serif;
  --font-size-base: 1.05rem;
  --line-height-base: 1.6;
}
```

### 1.8 Icon Mirroring Rules

Mirror icons that communicate direction relative to reading flow. Do not mirror icons representing real-world objects or universal symbols.

**Icons that MUST mirror:** Back/forward arrows, undo/redo, reply/reply-all, list bullets (indented), sort arrows, send button, text indent/outdent, open-in-new-window, chevrons in lists/accordions, exit/logout with arrow, volume slider icon, assignment/share icons with arrows.

**Icons that must NOT mirror:** Search (magnifying glass), checkmark, X/close, plus/minus, media controls (play, pause, stop, skip), clock, refresh (circular), download/upload (vertical), star/heart/bookmark, settings gear, trash/delete, camera/photo, lock/unlock, Wi-Fi/Bluetooth/signal strength.

**Special case:** Question mark icon mirrors in Arabic/Farsi (the glyph `؟` is mirrored) but does NOT mirror in Hebrew.

---

## 2. Do's and Don'ts

### Do's

1. **Use CSS logical properties everywhere.** Replace every `margin-left`, `padding-right`, `left`, `right` with logical equivalents. This is the single most impactful change.
2. **Test with real Arabic/Hebrew text.** Never use Lorem Ipsum. Arabic has different word lengths, connection behaviors, and vertical extents.
3. **Use `dir="auto"` for user-generated content.** Let the browser detect direction from the first strong directional character.
4. **Increase font size for Arabic by 20-25%.** Arabic glyphs at the same px as Latin are visually much smaller.
5. **Set both `dir` and `lang` on `<html>`.** `dir` controls layout; `lang` enables font selection, hyphenation, and screen reader pronunciation.
6. **Use `<bdi>` to isolate bidirectional text.** Wrap usernames, URLs, file paths, code within RTL text.
7. **Use `text-align: start/end` not `left/right`.** Logical alignment auto-flips with direction.
8. **Mirror navigation patterns.** Hamburger menus open from right, sidebars on right, swipe-back from right edge.
9. **Use `:dir(rtl)` for direction-specific styles.** It evaluates computed direction (not just attribute), unlike `[dir="rtl"]`.
10. **Use locale-aware APIs** (`Intl.NumberFormat`, `Intl.DateTimeFormat`) for all formatted output.
11. **Increase touch targets for Arabic.** Arabic characters are wider; buttons need more horizontal padding.
12. **Provide separate mirrored icon assets** when CSS `transform: scaleX(-1)` produces poor results on asymmetric icons.
13. **Test with both short and long Arabic strings.** Arabic translations can be 20-30% longer or shorter than English.
14. **Handle mixed-direction form validation.** Error messages referencing field names in another script need bidi isolation.

### Don'ts

1. **Don't mirror brand logos.** Logos are identity marks that must remain consistent.
2. **Don't mirror universal icons.** Checkmarks, stars, media controls, clocks, and real-world object icons have no directional meaning.
3. **Don't use text in images.** Raster text cannot be mirrored or translated automatically.
4. **Don't hardcode `left`/`right` in CSS.** Every hardcoded directional property is a bug in RTL.
5. **Don't assume all RTL users read the same way.** Arabic, Hebrew, Farsi, and Urdu have different typographic conventions and cultural expectations.
6. **Don't use CSS `direction: rtl` as sole mechanism.** Use the HTML `dir` attribute. W3C recommends markup over CSS because CSS can be disabled and does not convey structural information.
7. **Don't use italics for Arabic/Hebrew.** Arabic has no italic tradition; it produces ugly or no results.
8. **Don't justify Arabic body text.** Standard CSS justify adds inter-word spacing, which looks unnatural. Arabic justification uses kashida (stroke elongation). Prefer right-aligned.
9. **Don't forget to mirror animations.** Slide-in, page transitions, and horizontal loading indicators must reverse for RTL.
10. **Don't neglect scrollbar position.** Vertical scrollbars should appear on the left in RTL. Browsers handle this with `dir="rtl"`, but custom implementations may not.
11. **Don't use directional Unicode characters as UI indicators.** `>`, `-->`, `>>>` will not mirror. Use proper icons or CSS-generated content.
12. **Don't neglect bidirectional URL/email/path testing.** Without `<bdi>` isolation, they render in garbled order inside RTL text.
13. **Don't assume number inputs work automatically.** Numeric inputs may need `dir="ltr"` while labels remain RTL.
14. **Don't rely on automatic mirroring for complex layouts.** Dashboards, marketing pages, and asymmetric designs may need dedicated RTL layout variants.

---

## 3. Platform Variations

### 3.1 Web (HTML/CSS/JavaScript)

**Setting document direction:**

```html
<html dir="rtl" lang="ar">
```

**Core implementation pattern:**

```css
/* Use logical properties for all spacing and positioning */
.card {
  margin-inline-start: 16px;
  padding-inline-end: 24px;
  border-inline-start: 4px solid var(--accent);
  text-align: start;
}

/* Direction-specific overrides when logical properties are insufficient */
.icon-arrow:dir(rtl) {
  transform: scaleX(-1);
}

/* :dir() evaluates computed direction (including inherited),
   unlike [dir="rtl"] which only matches the attribute */
```

**Flexbox and Grid** auto-reverse with `dir="rtl"` -- `flex-direction: row` becomes right-to-left, grid column definitions reverse. No CSS changes needed.

**Bidirectional content isolation:**

```html
<p>المستخدم <bdi>@john_doe</bdi> أضاف تعليقا</p>  <!-- Isolate username -->
<code dir="ltr">npm install package</code>           <!-- Force LTR for code -->
<textarea dir="auto"></textarea>                      <!-- Auto-detect for UGC -->
<input type="email" dir="ltr">                        <!-- Email always LTR -->
```

**Framework support:**
- **Bootstrap 5+:** Built-in RTL via `bootstrap.rtl.css`. Set `dir="rtl"` and swap stylesheet.
- **Tailwind CSS:** RTL via `rtl:` variant modifier (`rtl:mr-4`). Enable with `dir="rtl"` on element.
- **Material UI (MUI):** Set `direction: 'rtl'` in theme, wrap with `<CacheProvider>` using `stylis-plugin-rtl`.
- **Next.js / React:** Set `dir` and `lang` on `<html>` via `app/layout.tsx`. Use `next-intl` or `react-i18next` for locale routing.

### 3.2 iOS (UIKit / SwiftUI)

**UISemanticContentAttribute** controls whether a view's content flips in RTL. Set on any UIView:

```swift
// Default: mirror in RTL (layout elements, navigation)
view.semanticContentAttribute = .unspecified

// Never mirror (media playback controls)
view.semanticContentAttribute = .playback

// Never mirror (spatial/physical representations, brand logos)
view.semanticContentAttribute = .spatial
view.semanticContentAttribute = .forceLeftToRight

// Force RTL regardless of system locale (for testing)
view.semanticContentAttribute = .forceRightToLeft
```

**Auto Layout:** Always use `leadingAnchor`/`trailingAnchor` (not `leftAnchor`/`rightAnchor`):

```swift
// Correct: auto-adapts to RTL
label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16)
label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16)

// Incorrect: hardcoded, breaks in RTL
label.leftAnchor.constraint(equalTo: view.leftAnchor, constant: 16)
```

**Detecting layout direction:**

```swift
let isRTL = UIView.userInterfaceLayoutDirection(
    for: view.semanticContentAttribute
) == .rightToLeft
```

**UIView.appearance for global overrides:**

```swift
UISwitch.appearance().semanticContentAttribute = .forceLeftToRight  // All switches stay LTR
```

**SwiftUI:** Respects system locale automatically. Test with `.environment(\.layoutDirection, .rightToLeft)`. Mirror images with `.flipsForRightToLeftLayoutDirection(true)`.

**Text alignment:** UIKit defaults to `.natural` which auto-aligns by language. Do not override with `.left`.

### 3.3 Android

**Enabling RTL support:**

```xml
<!-- AndroidManifest.xml -->
<application android:supportsRtl="true" ... >
```

**Layout XML -- use `start`/`end` instead of `left`/`right`:**

```xml
<!-- Correct: adapts to RTL -->
<TextView
    android:layout_marginStart="16dp"
    android:layout_marginEnd="8dp"
    android:paddingStart="12dp"
    android:textAlignment="viewStart"
    android:drawableStart="@drawable/ic_arrow" />

<!-- Incorrect: hardcoded direction -->
<TextView
    android:layout_marginLeft="16dp"
    android:paddingLeft="12dp"
    android:drawableLeft="@drawable/ic_arrow" />
```

For API < 17 backward compat, provide both: `marginLeft` + `marginStart`, `marginRight` + `marginEnd`.

**Drawable auto-mirroring (API 19+):** Set `android:autoMirrored="true"` on vector drawables for directional icons (arrows, chevrons). Non-directional icons should not use this flag.

**Programmatic direction control:**

```kotlin
view.layoutDirection = View.LAYOUT_DIRECTION_RTL
val isRTL = view.layoutDirection == View.LAYOUT_DIRECTION_RTL

// React to direction changes
override fun onRtlPropertiesChanged(layoutDirection: Int) {
    super.onRtlPropertiesChanged(layoutDirection)
}
```

**Jetpack Compose:** Respects system locale automatically. Test with:

```kotlin
CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
    MyScreen()
}
```

### 3.4 Flutter

Flutter provides comprehensive RTL support through `Directionality` and `TextDirection`. `MaterialApp` sets direction from device locale automatically.

**Locale-based automatic RTL:**

```dart
MaterialApp(
  locale: Locale('ar'),  // Arabic locale -> automatic RTL
  supportedLocales: [Locale('en'), Locale('ar'), Locale('he')],
)
```

**Explicit direction control:**

```dart
Directionality(
  textDirection: TextDirection.rtl,
  child: MyWidget(),
)
```

**Use directional variants (critical for RTL correctness):**

```dart
// Correct: adapts to direction
EdgeInsetsDirectional.only(start: 16, end: 8)
AlignmentDirectional.centerStart
BorderRadiusDirectional.only(topStart: Radius.circular(8))

// Incorrect: hardcoded, breaks in RTL
EdgeInsets.only(left: 16, right: 8)
Alignment.centerLeft
```

`Row` auto-reverses children when `TextDirection.rtl` is ambient. No code changes needed.

**Direction detection:**

```dart
bool isRTL = Directionality.of(context) == TextDirection.rtl;
// Content-based detection (intl package):
bool isRTL = Bidi.detectRtlDirectionality(userText);
```

---

## 4. Common Mistakes in AI-Generated Designs

### 4.1 LTR-Only Mockups with "Just Mirror It" Assumptions
AI generates LTR-only layouts assuming mechanical mirroring works. It does not: asymmetric designs, shadow directions, gradient angles, and complex dashboard layouts require deliberate RTL redesign.

### 4.2 Testing with Fake Arabic Text
AI tools generate Arabic-looking placeholder text with incorrect letter joining, wrong word lengths, and missing diacritical marks. Always test with real content from native speakers.

### 4.3 Hardcoded Directional Values
AI-generated CSS consistently uses physical properties instead of logical equivalents. Every instance is an RTL bug.

```css
/* AI-generated (broken for RTL) */
.sidebar { margin-left: 20px; float: left; }
.drawer { left: 0; transform: translateX(-100%); }

/* Correct */
.sidebar { margin-inline-start: 20px; float: inline-start; }
.drawer { inset-inline-start: 0; transform: translateX(-100%); }
/* Note: translateX may still need :dir(rtl) override */
```

### 4.4 Ignoring Bidirectional Text Scenarios
AI rarely handles: chat mixing Arabic and English, search results with Arabic descriptions and English brands, forms with Arabic labels but LTR inputs (email, URL), error messages referencing field names in a different script.

### 4.5 Arabic Text at Latin Font Sizes
AI applies the same `font-size: 14px` to both Latin and Arabic. Arabic at 14px is significantly less legible. Minimum readable Arabic body size on screens: 16-18px.

### 4.6 Wrong Font Fallback Chains
AI specifies only Latin fonts without Arabic-capable alternatives in the stack.

```css
/* Broken for Arabic */
font-family: 'Roboto', 'Helvetica', sans-serif;

/* Correct: includes Arabic-capable fonts */
font-family: 'Roboto', 'Noto Sans Arabic', 'Tahoma', sans-serif;
```

Without explicit Arabic fonts, the browser falls back to system fonts with poor glyph quality or wrong weight matching.

### 4.7 Forgetting to Mirror Animations
Slide-in drawers, toasts, progress animations, and page transitions that move left-to-right are almost never reversed for RTL in AI-generated code.

### 4.8 Symmetric-Looking Designs That Are Asymmetric
Cards with image-left/text-right look symmetric but are structurally asymmetric. AI generates them with hardcoded `flex-direction: row` and physical margins, making them impossible to mirror correctly without refactoring to logical properties.

---

## 5. Decision Framework

### 5.1 Mirror or Not -- Decision Tree

```
Is it a brand element (logo, brand icon)?           -> Do NOT mirror
Is it a real-world physical object (camera, trash)?  -> Do NOT mirror
Does it indicate horizontal direction (arrow, chevron)? -> MIRROR
Does it represent media playback or tape direction?  -> Do NOT mirror
Does it represent circular motion (clock, refresh)?  -> Do NOT mirror
Does it contain text or numbers?                     -> Do NOT mirror (text self-directs)
Is it a layout/navigation element (sidebar, tabs)?   -> MIRROR
Ambiguous?                                           -> Do NOT mirror (safe default)
```

### 5.2 Handling Mixed LTR/RTL Content

1. **Set base direction to match primary language.** Arabic page = `dir="rtl"`. Embedded English handled by Unicode bidi algorithm.
2. **Isolate embedded opposite-direction content.** `<bdi>` for inline, `dir="ltr"` on block containers.
3. **Use `dir="auto"` for unknown content.** User-generated text, API responses, dynamic strings.
4. **Explicit direction for form inputs.** Email, URL, code inputs = `dir="ltr"`. Number inputs = `dir="ltr"`.
5. **Handle concatenated strings carefully.** When building "Welcome, USERNAME" programmatically, wrap the variable with bidi isolation.

### 5.3 Font Selection Guidance

| Criterion | Recommendation |
|---|---|
| Broad coverage / Google ecosystem | Noto Sans Arabic, Noto Sans Hebrew |
| Modern geometric UI | Cairo (Arabic), Heebo (Hebrew) |
| Enterprise / IBM design language | IBM Plex Sans Arabic/Hebrew |
| Variable font needed | Noto Sans Arabic (variable), Vazirmatn (Farsi) |
| Nastaliq style (Urdu) | Noto Nastaliq Urdu |
| System fonts (no loading) | Tahoma (Win), Geeza Pro (macOS), Droid Arabic Naskh (Android) |

### 5.4 Automatic Mirroring vs. Dedicated RTL Layout

**Automatic mirroring is sufficient when:** layout is structurally symmetric, CSS logical properties used consistently, design system supports RTL natively, content is simple (lists, forms, text-heavy pages).

**Dedicated RTL layout variants needed when:** heavily asymmetric designs, complex dashboards, marketing/landing pages with directional visual flow, layouts with diagonal/angled elements, onboarding with directional illustrations.

### 5.5 Cross-Platform Property Quick Reference

| Concept | Web (CSS) | iOS (UIKit) | Android (XML) | Flutter |
|---|---|---|---|---|
| Start margin | `margin-inline-start` | `leadingAnchor` | `marginStart` | `EdgeInsetsDirectional.start` |
| End margin | `margin-inline-end` | `trailingAnchor` | `marginEnd` | `EdgeInsetsDirectional.end` |
| Text align start | `text-align: start` | `.natural` | `textAlignment="viewStart"` | `TextAlign.start` |
| Direction attr | `dir="rtl"` | `semanticContentAttribute` | `layoutDirection` | `TextDirection.rtl` |
| Auto-mirror icon | `transform: scaleX(-1)` | `.flipsForRightToLeftLayoutDirection` | `autoMirrored="true"` | `matchTextDirection: true` |
| Detect RTL | `:dir(rtl)` pseudo-class | `effectiveUserInterfaceLayoutDirection` | `view.layoutDirection` | `Directionality.of(context)` |

---

## 6. Quick Reference Checklist

### Document and Markup
- [ ] `<html>` has `dir="rtl"` and appropriate `lang` attribute
- [ ] User-generated content containers use `dir="auto"`
- [ ] Email, URL, and code inputs have explicit `dir="ltr"`
- [ ] Embedded opposite-direction text wrapped in `<bdi>`
- [ ] Phone numbers and numeric sequences isolated with `dir="ltr"`

### CSS and Layout
- [ ] Zero instances of physical `margin-left/right`, `padding-left/right` (use logical equivalents)
- [ ] Zero instances of `float: left/right` (use `inline-start`/`inline-end`)
- [ ] Zero instances of `text-align: left/right` (use `start`/`end`)
- [ ] Absolute/fixed positioning uses `inset-inline-start/end` not `left`/`right`
- [ ] Border-radius uses logical properties
- [ ] Flexbox/Grid layouts verified in RTL

### Typography
- [ ] Arabic font specified in font-family stack
- [ ] Arabic font size increased 20-25% relative to Latin
- [ ] Arabic line-height set to 1.8-2.0
- [ ] No italic styling on Arabic text
- [ ] Bold limited to medium/semi-bold for Arabic
- [ ] Hebrew font specified if supporting Hebrew

### Icons and Images
- [ ] Directional icons (arrows, chevrons, reply, undo) mirrored in RTL
- [ ] Non-directional icons (search, close, star, media controls) NOT mirrored
- [ ] Brand logos NOT mirrored
- [ ] No text embedded in raster images

### Navigation and Interaction
- [ ] Sidebar/drawer opens from the right
- [ ] Back button on right, forward on left
- [ ] Tab order reversed (first tab on right)
- [ ] Swipe gestures reversed
- [ ] Pagination controls mirrored

### Numbers and Data
- [ ] Numbers formatted via locale-aware APIs
- [ ] Correct numeral glyphs for target locale
- [ ] Currency/percentage symbols positioned per locale
- [ ] Date formats follow locale conventions

### Animation and Transitions
- [ ] Horizontal slide animations reversed for RTL
- [ ] Progress bar fill direction reversed
- [ ] Circular indicators (spinners, clocks) NOT reversed

### Testing
- [ ] Tested with real Arabic/Hebrew content (not Lorem Ipsum)
- [ ] Tested with long strings (overflow/truncation)
- [ ] Tested with mixed LTR+RTL content in same view
- [ ] Validated by native speakers
- [ ] Tested on devices with RTL system locale

---

*Researched: 2026-03-07 | Sources: [Material Design Bidirectionality (M2)](https://m2.material.io/design/usability/bidirectionality.html), [Material Design 3 Bidirectionality](https://m3.material.io/foundations/layout/understanding-layout/bidirectionality-rtl), [Apple HIG Right to Left](https://developer.apple.com/design/human-interface-guidelines/right-to-left), [W3C Internationalization BiDi Best Practices](https://www.w3.org/International/geo/html-tech/tech-bidi.html), [W3C Arabic Layout Requirements](https://www.w3.org/TR/alreq/), [MDN CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values), [MDN :dir() pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:dir), [Flutter Directionality class](https://api.flutter.dev/flutter/widgets/Directionality-class.html), [Android RTL Support](https://developer.android.com/training/basics/supporting-devices/languages), [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling/), [Bootstrap RTL](https://getbootstrap.com/docs/5.3/getting-started/rtl/)*
