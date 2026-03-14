# Iconography in UI/UX Design

> **Module Type:** Foundation
> **Domain:** Design Systems, Visual Design, Interaction Design
> **Last Updated:** 2026-03-07

---

## Overview

Icons are the shorthand of user interfaces. They compress meaning into small visual
symbols that guide users through navigation, communicate status, trigger actions, and
reinforce brand identity. When used well, icons reduce cognitive load and accelerate
task completion. When used poorly, they introduce ambiguity, slow users down, and
erode trust.

This module covers the principles, sizing conventions, platform-specific systems,
accessibility requirements, and decision frameworks that govern effective iconography
in modern product design.

---

## 1. Core Principles

### 1.1 Icon Purposes

Every icon in a UI serves one of four functional roles. Mixing these roles within
a single icon creates confusion.

| Role | Purpose | Examples |
|------|---------|----------|
| **Wayfinding** | Guide the user to a destination or section | Home, back arrow, tab bar icons |
| **Action** | Trigger a specific operation | Delete, share, edit, send |
| **Status** | Communicate system or object state | Success checkmark, error warning, loading spinner |
| **Decoration** | Add visual interest without conveying meaning | Background patterns, section dividers |

**Key rule:** Decorative icons must never look interactive. If a decorative icon
resembles a button, users will try to click it. Apply `aria-hidden="true"` and
ensure decorative icons have no hover or focus states.

### 1.2 Icon Styles

Three dominant rendering styles exist. Each has distinct use cases.

**Outlined (Stroke/Line) Icons**
- Best for: inactive states, navigation bars, secondary actions
- Characteristics: lighter visual weight, airy, modern feel
- Stroke width must be consistent across the entire set (1.5px or 2px are standard)
- Material Design specifies 2dp stroke width for all stroke instances, including
  curves, angles, and both interior and exterior strokes

**Filled (Solid) Icons**
- Best for: active/selected states, primary actions, small sizes where detail is lost
- Characteristics: heavier visual weight, higher contrast, better legibility at small sizes
- Common pattern: outlined when inactive, filled when selected (iOS tab bars)
- At 16px and below, filled icons are more legible than outlined icons

**Two-Tone / Duotone Icons**
- Best for: illustrations, feature highlights, onboarding screens
- Characteristics: primary shape in full opacity, secondary detail at reduced opacity
- Phosphor Icons offers a dedicated duotone weight across its entire 9,000+ icon set
- Avoid using two-tone icons in dense, functional UI; they compete for attention

**Style selection rule:** Pick one style for your entire product and stick with it.
The only acceptable exception is outlined-to-filled state transitions (e.g., a
heart icon that fills when "liked"). Mixing outlined and filled icons arbitrarily
is the single most common iconography mistake in production UIs.

### 1.3 Icon Sizing Conventions

Standard icon sizes follow an 8px-based scale. Most UI icons use 24px as the
baseline.

| Size | Use Case | Touch Target |
|------|----------|-------------|
| **12px** | Inline indicators only (status dots, chevrons in dense lists) | Not interactive |
| **16px** | Inline with body text, compact toolbars, breadcrumbs | Requires padding to 24px minimum |
| **20px** | Form field icons, small buttons, secondary navigation | Requires padding to 44px minimum |
| **24px** | Standard UI icons: toolbars, action bars, list items | 48px touch target (with 12px padding) |
| **32px** | Feature icons, card headers, empty state illustrations | 48px touch target (with 8px padding) |
| **40px** | Section headers, onboarding, marketing pages | Typically not interactive |
| **48px** | Hero illustrations, large touch targets, accessibility modes | Meets 48dp target natively |

**Critical accessibility requirement:** Regardless of visual icon size, the
interactive touch target must be at least 48x48dp (Android/Material Design) or
44x44pt (iOS/WCAG 2.2 Level AAA). WCAG 2.2 Level AA (Success Criterion 2.5.8)
requires a minimum of 24x24 CSS pixels. Use padding to bridge the gap between
visual icon size and touch target.

### 1.4 Optical Alignment

Icons need visual centering, not mathematical centering. Different shapes have
different optical weight, and the human eye perceives geometric center differently
from mathematical center.

**Common cases requiring optical adjustment:**

- **Play buttons (triangles):** A triangle mathematically centered in a circle
  appears to lean left. Shift it 1-2px to the right to appear visually centered.
  The Spotify play button uses this exact adjustment.
- **Asymmetric icons:** Icons with more visual weight on one side (e.g., a
  megaphone, a pointing hand) need compensation in the opposite direction.
- **Icons with descenders:** Icons that extend below the baseline (e.g., a pin
  with a point) should be optically lifted so the main body aligns with
  neighboring icons.
- **Icons in circular containers:** The icon's optical center should align with
  the circle's center, which often means the icon's mathematical bounding box
  is off-center.

**Rule of thumb:** If it looks centered, it is centered. Trust your eyes over
your coordinate system. Icon grids provide starting points, not final positions.

### 1.5 Icon + Text Pairing

The spatial relationship between icon and text affects how users parse the
combination.

**Icon left of text (horizontal layout)**
- Use for: action buttons, menu items, list items
- Spacing: 8px gap between icon and text label
- The icon acts as a visual anchor; the text provides clarity
- Example: [trash icon] Delete, [pencil icon] Edit

**Icon above text (vertical layout)**
- Use for: bottom navigation bars, tab bars, dashboard tiles
- Spacing: 4px gap between icon and text label
- The icon serves as the primary identifier; the text is secondary
- Example: iOS and Android bottom navigation tabs

**Icon right of text**
- Use sparingly: external link indicators, dropdown chevrons, forward arrows
- Signals "this goes somewhere" or "this opens something"
- Example: "Learn more [arrow icon]", "Select [chevron icon]"

**Icon after text in input fields**
- Use for: clear buttons, password visibility toggles, validation indicators
- The icon is a secondary action within the primary input context

### 1.6 Icon-Only Buttons

Icon-only buttons (no visible text label) are acceptable ONLY when the icon
is universally recognized. Research from Nielsen Norman Group confirms that
very few icons enjoy universal recognition.

**Universally recognized icons (safe for icon-only use):**
- Close / dismiss (X)
- Search (magnifying glass)
- Back / forward (arrows)
- Menu / hamburger (three horizontal lines)
- Share (platform-specific: iOS share sheet, Android share)
- Home (house)
- Settings / gear
- Play / pause (media controls)
- Plus / add

**Icons that REQUIRE text labels:**
- Any domain-specific action (archive, bookmark, flag)
- Any icon that has multiple common meanings (heart = like OR favorite OR health)
- Any icon unique to your product
- Filter, sort, download, upload (frequently confused with each other)

**Mandatory rule:** Every icon-only button MUST have:
1. A `title` attribute or tooltip on hover (desktop)
2. An `aria-label` describing the action (accessibility)
3. A long-press or contextual hint (mobile)

Research data: Adding the label "Menu" below a hamburger icon increased click
activity by 42.09% in one documented A/B test. Labels work.

### 1.7 Icon Grid and Keyline Systems

Icon grids provide a standardized canvas for drawing icons with consistent
proportions. They are guides, not hard rules.

**Material Design Icon Grid (24dp):**
- Total canvas: 24 x 24dp
- Live area (content zone): 20 x 20dp (2dp padding on each side)
- Keyshapes: circle (20dp diameter), square (18 x 18dp), portrait rectangle
  (16 x 20dp), landscape rectangle (20 x 16dp)
- Stroke weight: 2dp consistent across all icons
- Corner radius: 2dp for exterior corners
- All icons optically balanced within keyshapes, not forced to fill them

**Keyline components:**
- **Keyshapes:** Template shapes (circle, square, portrait rectangle, landscape
  rectangle) that establish consistent optical weight across different icon forms
- **Orthogonals:** Lines that intersect the center point, typically at 90-degree
  and 45-degree angles, with 15-degree and 5-degree increments for finer alignment
- **Grid subdivisions:** Typically divide the canvas into equal segments for
  consistent interior detail alignment

**Important:** Keyline grids ensure optical balance (visual weight) between icons.
A square icon filling its keyshape and a circular icon filling its keyshape will
appear the same visual size, even though the circle is technically smaller in area.

### 1.8 Custom Icons vs. Icon Libraries

**Default position: use an established icon library.** Consistency trumps creativity
in functional UI. Custom icons introduce risk:

- Users have learned what standard icons look like across thousands of apps
- Custom metaphors require user education and testing
- Maintaining a custom icon set is expensive (every new feature needs new icons)
- Accessibility audits are easier with well-documented library icons

**When custom icons are justified:**
- Brand-critical moments (app icon, onboarding illustrations, marketing)
- Domain-specific concepts with no standard representation (industry jargon)
- The existing library lacks the exact concept needed AND text alone is insufficient
- Product differentiation is a strategic priority (e.g., Notion's custom icon style)

**When custom icons are NOT justified:**
- Standard actions (edit, delete, save, share, search)
- Navigation (home, back, settings, profile)
- Status indicators (success, error, warning, info)
- Any icon that already has a well-known visual convention

---

## 2. Do's and Don'ts

### 2.1 Do's

1. **Do use a single icon library per product.** Mixing Material Symbols with
   Lucide with Font Awesome creates visual inconsistency that users notice even
   if they cannot articulate it. Pick one library and commit.

2. **Do maintain consistent stroke width.** If your icon set uses 1.5px strokes,
   every icon must use 1.5px strokes. A single 2px-stroke icon among 1.5px icons
   looks heavier and draws unwarranted attention. Atlassian standardized on 1.5px
   stroke on a 16px canvas across their entire system.

3. **Do size icons to the 24px baseline for standard UI.** The 24px size is the
   industry standard for toolbar, action bar, and list item icons across Material
   Design, Apple HIG, and all major design systems.

4. **Do pad icon-only buttons to at least 48x48dp touch targets.** A 24px icon
   needs 12px padding on each side to reach 48px. This meets Material Design
   accessibility requirements and WCAG 2.2 Level AA (24x24 CSS px minimum).

5. **Do use filled variants for selected/active states.** The outlined-to-filled
   transition provides clear visual feedback. Instagram, Twitter/X, and iOS tab
   bars all use this pattern. Users have learned this convention.

6. **Do provide text labels alongside icons in primary navigation.** Nielsen
   Norman Group research consistently shows that icon+label combinations outperform
   icon-only interfaces in task completion time, error rate, and user satisfaction.

7. **Do test icon recognition with real users.** Use 5-second tests: show the icon
   for 5 seconds, ask what action it represents. If fewer than 85% of participants
   identify it correctly, add a text label or choose a different metaphor.

8. **Do use SVG format for web icons.** SVGs scale without quality loss, support
   multi-color rendering, enable CSS styling, allow tree-shaking in build tools,
   and provide better accessibility than icon fonts. SVGs do not suffer from the
   Flash of Invisible Text (FOIT) problem that icon fonts have during page load.

9. **Do apply `aria-hidden="true"` to decorative icons.** Icons that do not convey
   information should be hidden from screen readers. Conversely, interactive icons
   need `aria-label` on the parent button element, not on the icon itself.

10. **Do ensure 3:1 minimum contrast ratio for meaningful icons.** WCAG 2.1
    Success Criterion 1.4.11 (Non-text Contrast) requires graphical objects that
    convey information to have at least 3:1 contrast against adjacent colors.
    Decorative icons have no contrast requirement.

11. **Do use optical size adjustments for variable icon fonts.** Material Symbols
    supports optical sizes from 20dp to 48dp. The optical size axis automatically
    adjusts stroke weight for optimal legibility at each display size. Set
    `'OPSZ' 24` for standard UI and `'OPSZ' 20` for compact layouts.

12. **Do align icons to the pixel grid.** Icons that fall between pixels appear
    blurry on non-retina displays. Ensure anchor points snap to full or half
    pixel values. This is less critical on modern high-DPI displays but still
    matters for 1x screens.

13. **Do limit your active icon set to under 50 unique icons per product.**
    Beyond 50, users struggle to learn and recall icon meanings. Each additional
    icon adds cognitive load. If you need more than 50, some should be replaced
    with text labels.

14. **Do use consistent corner radius across all icons.** If your icons use 2px
    rounded corners, all icons in the set must use 2px rounded corners. Sharp
    corners mixed with rounded corners breaks visual cohesion.

15. **Do document your icon usage guidelines.** Create an icon inventory that maps
    each icon to its meaning, acceptable contexts, and prohibited uses. This
    prevents the same icon from being used for different actions across your product.

### 2.2 Don'ts

1. **Don't mix outlined and filled icons in the same context.** Using a filled
   home icon next to an outlined settings icon implies the home is selected and
   settings is not. Users read style differences as state differences.

2. **Don't use icons smaller than 16px for interactive elements.** Below 16px,
   icons lose detail and become difficult to distinguish. At 12px, an edit icon
   and a settings icon can look identical.

3. **Don't rely on color alone to convey icon meaning.** Approximately 8% of men
   and 0.5% of women have color vision deficiency. A red trash icon and a green
   checkmark icon must be distinguishable by shape alone, not just by color.

4. **Don't use metaphors that require cultural context.** A mailbox icon means
   something different in the US (standalone box at the curb) than in the UK
   (slot in the door) than in Japan (wall-mounted box). Use universal shapes
   like an envelope for email.

5. **Don't animate icons in primary navigation.** Animated icons in nav bars
   distract from content and slow task completion. Reserve animation for
   micro-interactions (like/favorite), loading states, and onboarding moments.

6. **Don't use more than one icon per button.** A button with both a plus icon
   and a document icon to mean "create document" is ambiguous. Use a single
   icon plus a text label instead.

7. **Don't assume the hamburger menu icon is universally understood.** While
   recognition has improved significantly since 2014, adding the word "Menu"
   beneath the icon still increases engagement measurably. The hamburger icon
   tested at roughly 72% recognition in NNGroup studies, below the 85% threshold
   for icon-only use.

8. **Don't use icon fonts for new projects.** Icon fonts have multiple
   disadvantages: they are monochrome only, subject to anti-aliasing artifacts,
   affected by font-loading failures (FOIT), cannot be styled per-path, are
   harder to make accessible, and cannot be tree-shaken effectively. Use inline
   SVGs or an SVG sprite system instead.

9. **Don't place icons after text labels in left-to-right action buttons.**
   Users scan left to right; the icon should be the first element scanned so it
   primes the user for the text label. Exception: trailing chevrons and external
   link indicators, which signal destination rather than action.

10. **Don't use obsolete metaphors without testing.** While 83% of users
    still recognize the floppy disk as "save" according to NNGroup research,
    this recognition comes from software familiarity, not real-world knowledge.
    In contexts targeting younger or less tech-savvy users, consider a
    downward arrow into a tray, or simply the word "Save." Auto-save patterns
    are making the explicit save action itself increasingly rare.

11. **Don't scale icons by arbitrary percentages.** Scaling a 24px icon to 22px
    or 26px misaligns it with the pixel grid and produces sub-pixel rendering
    artifacts. Always use standard sizes: 16, 20, 24, 32, 40, 48.

12. **Don't use platform-specific icons cross-platform.** The iOS share icon
    (square with upward arrow) means nothing on Android, where the share icon
    is three dots connected by lines. Use platform-native icons or a neutral
    alternative.

13. **Don't put interactive icons inside other interactive elements without
    clear boundaries.** An icon button inside a card that is itself clickable
    creates a nested interaction that confuses users and fails accessibility
    audits. Separate interactive zones clearly.

14. **Don't use identical icons for different actions.** If a pencil icon means
    "edit" in one place and "compose" in another, users will be confused. One
    icon, one meaning, across the entire product.

15. **Don't use thin (1px or below) strokes at sizes under 20px.** Thin strokes
    disappear at small sizes, especially on low-DPI displays. At 16px, use at
    least 1.5px stroke width. At 24px, 2px is standard.

---

## 3. Platform Variations

### 3.1 iOS: SF Symbols

**Overview:**
SF Symbols is Apple's icon system, tightly integrated with San Francisco (the
system font). As of SF Symbols 6 (iOS 18 / 2024), the library contains over
6,900 symbols.

**Key characteristics:**

- **9 weights:** Ultralight, Thin, Light, Regular, Medium, Semibold, Bold, Heavy,
  Black. Each weight corresponds to a weight of the San Francisco system font,
  ensuring text and icons match visually.

- **3 scales:** Small, Medium (default), Large. Scale adjusts the icon's emphasis
  relative to adjacent text without breaking weight matching.

- **4 rendering modes:**

  | Mode | Behavior | Use Case |
  |------|----------|----------|
  | **Monochrome** | One color applied to all paths | Standard UI, single-tint interfaces |
  | **Hierarchical** | One color, varying opacity per layer | Depth emphasis, subtle visual hierarchy |
  | **Palette** | Two or more explicit colors, one per layer | Brand-colored icons, multi-state indicators |
  | **Multicolor** | Intrinsic colors reflecting real-world objects | Weather, accessibility, maps |

- **Variable color:** Introduced in SF Symbols 4, variable color lets you
  modulate opacity across layers to represent values (e.g., Wi-Fi signal strength).

- **Symbol animations:** SF Symbols 5+ added built-in animation effects
  (bounce, scale, pulse, variable color animation, replace).

**Design guidelines for SF Symbols:**
- Always match symbol weight to adjacent text weight
- Use the `.symbolRenderingMode()` modifier to control rendering
- Prefer system-provided symbols over custom ones for native feel
- Custom symbols must conform to the SF Symbols template (available in the
  SF Symbols app) to ensure proper weight matching and alignment
- Test custom symbols at all 9 weights and 3 scales

**SF Symbols 7 (announced WWDC 2025):**
- New animation techniques and advanced rendering capabilities
- Enhanced support for custom symbol creation
- Expanded symbol library

### 3.2 Android: Material Symbols

**Overview:**
Material Symbols is Google's current icon system, built on variable font
technology. It supersedes the older Material Icons (static) set.

**Key characteristics:**

- **Variable font with 4 axes:**

  | Axis | Range | Default | Effect |
  |------|-------|---------|--------|
  | **Fill** | 0 - 1 | 0 | Transitions from outlined (0) to filled (1) |
  | **Weight** | 100 - 700 | 400 | Stroke thickness, thin to bold |
  | **Grade** | -25 to 200 | 0 | Fine-tuned thickness without affecting size |
  | **Optical Size** | 20 - 48 | 24 | Adjusts detail for display size |

- **3 style families:** Outlined, Rounded, Sharp. Each family shares the same
  icon set but with different corner treatments.

- **Over 3,000 icons** covering actions, navigation, content, communication,
  device, and more.

**Design guidelines for Material Symbols:**
- Use the default 24dp optical size for standard UI icons
- Set fill to 1 for active/selected states, 0 for inactive
- Use grade for dark-on-light vs. light-on-dark adjustments: positive grade
  for light backgrounds (thicker strokes for visibility), negative grade for
  dark backgrounds (thinner strokes to reduce glare)
- The icon's visual size is 24dp but the touch target must be 48dp (12dp padding)
- Stick to one style family (Outlined, Rounded, or Sharp) per product

**Implementation:**
```css
/* CSS variable font syntax for Material Symbols */
.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

/* Active state */
.material-symbols-outlined.active {
  font-variation-settings:
    'FILL' 1,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
```

### 3.3 Web: Icon Delivery Methods

**SVG (Recommended)**

Advantages:
- Scalable without quality loss
- Stylable via CSS (color, stroke, fill, transforms)
- Accessible (supports `<title>`, `<desc>`, `role`, `aria-label`)
- Tree-shakable (only bundle icons you use; Lucide and Phosphor both support this)
- Multi-color capable
- No font-loading dependency (immune to FOIT)
- Can be animated with CSS or JavaScript

Delivery options:
- **Inline SVG:** Best for interactive icons, allows per-path styling
- **SVG sprite sheet:** Best for performance with many icons, single HTTP request
- **SVG as `<img>`:** Best for static, decorative icons (no CSS styling)
- **SVG in CSS background:** Limited accessibility, use only for decoration

**Icon Fonts (Legacy)**

Disadvantages:
- Monochrome only
- Subject to anti-aliasing (blurry at certain sizes)
- Flash of Invisible Text (FOIT) during font loading
- Cannot be tree-shaken (entire font file loads even if you use 3 icons)
- Poor accessibility (characters may be read by screen readers as gibberish)
- Cannot be styled per-path
- Blocked by some ad blockers and content security policies

**Verdict:** Use SVGs for all new projects. Icon fonts are a legacy approach
retained only for backward compatibility.

### 3.4 Major Icon Libraries Compared

| Library | Icon Count | Styles | Stroke Width | License | Best For |
|---------|-----------|--------|-------------|---------|----------|
| **Material Symbols** | 3,000+ | Outlined, Rounded, Sharp | Variable (100-700) | Apache 2.0 | Android, Material Design apps |
| **SF Symbols** | 6,900+ | 9 weights, 3 scales | Matches SF font | Apple only | iOS, macOS, Apple ecosystem |
| **Lucide** | 1,600+ | Outlined | Customizable (default 2px) | ISC | Lightweight web apps, React/Vue |
| **Phosphor** | 9,000+ | Thin, Light, Regular, Bold, Fill, Duotone | Variable per weight | MIT | Projects needing multiple weights |
| **Heroicons** | 300+ | Outlined (24px), Solid (24px), Mini (20px) | 1.5px | MIT | Tailwind CSS projects |
| **Feather** | 280+ | Outlined | 2px | MIT | Minimalist projects (unmaintained) |
| **Font Awesome** | 2,000+ (free) | Solid, Regular, Light, Thin, Duotone | Fixed per style | Mixed | Legacy projects, CMS themes |
| **Tabler Icons** | 5,700+ | Outlined | 2px | MIT | Feature-rich web apps |

**Selection guidance:**
- **Apple ecosystem only:** SF Symbols (mandatory for native feel)
- **Android/Material:** Material Symbols
- **Cross-platform web, minimal:** Lucide (lightweight, well-maintained fork of Feather)
- **Cross-platform web, comprehensive:** Phosphor (most weight options, largest set)
- **Tailwind projects:** Heroicons (made by Tailwind Labs, designed to match)

---

## 4. Common Mistakes in AI-Generated Designs

AI design tools (Figma Make, Galileo AI, Uizard, and similar) produce layouts
quickly but consistently make iconography errors that human designers must catch
and correct.

### 4.1 Inconsistent Icon Styles

**The problem:** AI generators pull from multiple visual references, producing
screens where some icons are outlined, others are filled, and others use
completely different design languages. A screen might have a Material-style
outlined settings gear next to a Feather-style outlined user icon next to a
completely custom-styled notification bell.

**How to detect:**
- Audit all icons on a single screen: do they share the same stroke width?
- Check corner treatments: are all corners rounded OR all sharp, not mixed?
- Compare visual weight: do all icons appear the same "boldness"?

**How to fix:**
- Replace all icons with a single library (Lucide, Phosphor, or Material Symbols)
- Apply consistent stroke width, corner radius, and sizing
- Use a design system plugin (e.g., Figma's icon library components) to enforce consistency

### 4.2 Wrong Icon Sizes

**The problem:** AI tools frequently generate icons at non-standard sizes (19px,
23px, 27px) that misalign with pixel grids and look blurry. They also use
inconsistent sizes within the same context (a 20px icon next to a 28px icon in
the same toolbar).

**How to detect:**
- Inspect icon dimensions in the design tool
- Check if icons align to the 8px grid (16, 24, 32, 40, 48)
- Compare icon sizes within the same toolbar, nav bar, or list

**How to fix:**
- Resize all icons to the nearest standard size (usually 24px for UI)
- Ensure all icons in the same context use the same size
- Add proper padding to maintain touch targets

### 4.3 Missing Text Labels

**The problem:** AI generators tend to produce icon-only navigation and toolbars,
omitting text labels. This looks "cleaner" but hurts usability.

**How to detect:**
- Check bottom navigation: are icons labeled?
- Check toolbar buttons: do ambiguous icons have labels?
- Check settings screens: are all options text-labeled?

**How to fix:**
- Add text labels below navigation icons
- Add text labels beside action icons in toolbars
- Reserve icon-only treatment for universally recognized icons only

### 4.4 Poor Icon Metaphors

**The problem:** AI may select icons based on visual similarity rather than
semantic meaning. A common error is using a "document" icon for "notes" or a
"bell" icon for "messages."

**How to detect:**
- For each icon, ask: "If I showed this icon to 10 users without context, would
  8+ correctly identify the action?"
- Check for metaphors that are culturally specific or outdated
- Verify that each icon maps to exactly one action in the interface

**How to fix:**
- Replace ambiguous icons with standard alternatives from your chosen library
- Add text labels where the metaphor is not immediately clear
- Run a quick guerrilla test: show 5 people the icon and ask what they think it does

### 4.5 Accessibility Omissions

**The problem:** AI-generated designs rarely include proper ARIA attributes,
sufficient color contrast for icons, or adequate touch target sizing.

**How to detect:**
- Check if icon buttons have `aria-label` attributes
- Measure icon contrast against background (need 3:1 minimum for meaningful icons)
- Measure touch target sizes (need 48x48dp minimum for mobile)
- Verify that decorative icons have `aria-hidden="true"`

**How to fix:**
- Add `aria-label` to all interactive icon containers (on the `<button>`, not the `<svg>`)
- Adjust icon color to meet 3:1 contrast ratio against the background
- Add padding to reach minimum touch target dimensions
- Mark decorative icons as `aria-hidden="true"`

### 4.6 Inconsistent Icon Padding and Alignment

**The problem:** AI places icons with irregular spacing relative to text and
other UI elements. Icons may be vertically misaligned with adjacent text or
have inconsistent margins.

**How to detect:**
- Check vertical alignment: icon center should align with text baseline or
  x-height center (depending on the design system)
- Measure spacing between icons and text labels (should be consistent: 8px
  for horizontal, 4px for vertical)
- Verify icons within lists have equal indentation

**How to fix:**
- Use flexbox alignment with `align-items: center` for horizontal icon+text pairs
- Standardize icon-to-text spacing as design tokens
- Apply optical adjustments where mathematical centering looks wrong

---

## 5. Decision Framework

### 5.1 When to Use Icons vs. Text vs. Both

```
START
  |
  v
Is the action universally recognized?
(close, search, back, play, share, menu, home)
  |
  +-- YES --> Icon-only is acceptable (still add aria-label + tooltip)
  |
  +-- NO --> Continue
       |
       v
     Is space severely constrained?
     (mobile toolbar, dense data table, compact sidebar)
       |
       +-- YES --> Can you use a standardized icon?
       |            |
       |            +-- YES --> Icon-only with tooltip + aria-label
       |            |
       |            +-- NO --> Text-only (abbreviated if needed)
       |
       +-- NO --> Use BOTH icon + text label
                  (best discoverability, best accessibility)
```

**Research-backed guidance:**
- Icon + text performs best in usability studies across all metrics (time, errors,
  satisfaction)
- Icon-only performs worst in first-use scenarios but can match icon+text for
  expert users with learned interfaces
- Text-only performs better than icon-only for ambiguous actions
- The NNGroup recommendation: "To help overcome the ambiguity that almost all
  icons face, a text label must be present alongside an icon to clarify its meaning"

### 5.2 Which Icon Library to Choose

**Decision matrix:**

| If your project is... | Choose... | Because... |
|-----------------------|-----------|------------|
| iOS/macOS native app | SF Symbols | Required for native look and feel; matches system font |
| Android native app | Material Symbols | Native to the platform; variable font flexibility |
| Web app with Tailwind | Heroicons | Designed by Tailwind Labs, consistent with Tailwind aesthetic |
| Web app, needs many icons | Phosphor | 9,000+ icons, 6 weights, MIT license |
| Web app, needs minimal bundle | Lucide | Lightweight, tree-shakable, clean consistent style |
| Cross-platform (Flutter/RN) | Material Symbols or Phosphor | Both available on all platforms |
| CMS / WordPress | Font Awesome (legacy) or Phosphor | Wide ecosystem support |
| Design system from scratch | Phosphor or Material Symbols | Most customization options |

### 5.3 Custom Icons: When and How

**When to create custom icons:**
1. Your domain has concepts with no standard visual representation
2. Brand differentiation is a strategic requirement (not just preference)
3. You need icons that convey proprietary features unique to your product
4. Your user research shows standard icons are being misinterpreted in your
   specific context

**How to create custom icons well:**
1. Start with your chosen library's grid and keyline system
2. Match stroke width, corner radius, and visual weight of your library icons
3. Design at 24px first, then test at 16px and 32px for legibility
4. Test with 10+ users for recognition (target: 85%+ correct identification)
5. Provide both outlined and filled variants for state transitions
6. Export as SVG with clean paths (no unnecessary groups, no inline styles)
7. Document the icon's meaning, approved contexts, and prohibited uses
8. Include the custom icon in your design system component library

**Custom icon red flags (stop and reconsider):**
- You are creating custom versions of universally understood icons (no)
- The custom icon requires a legend or onboarding tooltip to explain (too complex)
- The icon looks fine at 24px but is unrecognizable at 16px (too detailed)
- Your team cannot agree on what the icon represents (ambiguous metaphor)

---

## 6. Accessibility Reference

### 6.1 ARIA Patterns by Icon Type

| Icon Type | Pattern | Key Rule |
|-----------|---------|----------|
| **Interactive (button/link)** | `aria-label` on the `<button>`, `aria-hidden="true"` on the `<svg>` | Label goes on the interactive element, never the icon |
| **Decorative** | `aria-hidden="true"` on the icon container | Must not be announced by screen readers |
| **Informative (status)** | `role="img"` + `aria-label` on wrapper, OR adjacent visible text | If adjacent text conveys the meaning, icon can be `aria-hidden` |

Always add `focusable="false"` to SVG elements to prevent legacy Edge/IE focus issues.

### 6.2 Color Contrast Requirements

| Icon Type | WCAG Criterion | Minimum Contrast Ratio |
|-----------|---------------|----------------------|
| Meaningful icon (no adjacent text label) | 1.4.11 Non-text Contrast | 3:1 against background |
| Meaningful icon WITH adjacent text label | None (text carries meaning) | No requirement on icon |
| Icon within a button (button has text) | 1.4.11 for button boundary | 3:1 for button outline |
| Decorative icon | None | No requirement |

---

## 7. Quick Reference Checklist

Use this checklist when auditing icon usage in any design or implementation.

### Consistency
- [ ] All icons come from a single icon library
- [ ] All icons use the same stroke width (1.5px or 2px, consistent across set)
- [ ] All icons use the same corner radius treatment (rounded OR sharp, not mixed)
- [ ] All icons in the same context are the same size
- [ ] Outlined icons are used for inactive states, filled for active states (if using state transitions)
- [ ] No mixing of outlined and filled icons in the same untoggled context

### Sizing and Spacing
- [ ] Standard sizes used: 16px, 20px, 24px, 32px, 40px, or 48px (no arbitrary sizes)
- [ ] Default UI icons are 24px
- [ ] Touch targets are at least 48x48dp (Android) or 44x44pt (iOS)
- [ ] Icon-to-text spacing is consistent: 8px horizontal, 4px vertical
- [ ] Icons are optically centered, not just mathematically centered

### Labels and Clarity
- [ ] All non-universal icons have visible text labels
- [ ] Icon-only buttons have tooltips (desktop) or long-press hints (mobile)
- [ ] Each icon maps to exactly one action across the entire product
- [ ] No obsolete or culturally specific metaphors without user testing
- [ ] Icon metaphors tested with target users (85%+ recognition rate)

### Accessibility
- [ ] Interactive icons: `aria-label` on the button/link element, not the SVG
- [ ] Decorative icons: `aria-hidden="true"` on the icon element
- [ ] Meaningful icons without text labels meet 3:1 contrast ratio (WCAG 1.4.11)
- [ ] SVG icons include `focusable="false"` to prevent IE/Edge focus issues
- [ ] Color is not the sole differentiator between icon states

### Platform Compliance
- [ ] iOS apps use SF Symbols with weight matching to San Francisco font
- [ ] Android apps use Material Symbols with appropriate optical size setting
- [ ] Web apps use inline SVG or SVG sprites, not icon fonts
- [ ] Platform-specific icons are not used cross-platform (e.g., iOS share icon on Android)

---

## Sources

- [Icon Usability - Nielsen Norman Group](https://www.nngroup.com/articles/icon-usability/)
- [The Floppy Disk Icon as "Save": Still Appropriate Today? - NNGroup](https://www.nngroup.com/articles/floppy-disk-icon-understandability/)
- [Bad Icons: How to Identify and Improve Them - NNGroup](https://www.nngroup.com/articles/bad-icons/)
- [SF Symbols - Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)
- [Material Symbols Guide - Google Developers](https://developers.google.com/fonts/docs/material_symbols)
- [Introducing Material Symbols - Material Design 3](https://m3.material.io/blog/introducing-symbols/)
- [Icon Grids & Keylines Demystified - Helena Zhang](https://minoraxis.medium.com/icon-grids-keylines-demystified-5a228fe08cfd)
- [A Complete Guide to Iconography - Design Systems](https://www.designsystems.com/iconography-guide/)
- [WCAG 2.1 Success Criterion 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- [WCAG 2.2 Success Criterion 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [Accessible SVGs: Perfect Patterns for Screen Reader Users - Smashing Magazine](https://www.smashingmagazine.com/2021/05/accessible-svg-patterns-comparison/)
- [SVG, Icon Fonts, and Accessibility: A Case Study - 24 Accessibility](https://www.24a11y.com/2017/svg-icon-fonts-accessibility-case-study/)
- [Practical Guide to Icon Design - UX Planet](https://uxplanet.org/practical-guide-to-icon-design-794baf5624c8)
- [The Importance of Iconography in UI Design - UX Design Institute](https://www.uxdesigninstitute.com/blog/iconography-in-ui-design/)
- [How to Use Icons in Design: UX and UI Best Practices - Noun Project](https://blog.thenounproject.com/how-to-use-icons-in-ui-and-ux-design-best-practices/)
- [Behind the Screens: Building Atlassian's New Icon System - Atlassian](https://www.atlassian.com/blog/design/behind-the-screens-building-atlassians-new-icon-system)
- [Which Icons to NOT Use in 2025 - LogRocket](https://blog.logrocket.com/ux-design/iconography-ux-2025/)
- [Accessible Target Sizes Cheatsheet - Smashing Magazine](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [Lucide Icons](https://lucide.dev/)
- [Phosphor Icons](https://phosphoricons.com/)
- [What's New in SF Symbols 7 - WWDC25](https://developer.apple.com/videos/play/wwdc2025/337/)
