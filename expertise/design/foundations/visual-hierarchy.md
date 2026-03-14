# Visual Hierarchy -- Design Expertise Module

> Visual hierarchy is the deliberate arrangement of design elements so that users
> instantly perceive their relative importance, navigate content effortlessly, and
> take the intended actions. It is the single most consequential skill in interface
> design because every layout decision either clarifies or confuses the user's path.

> **Category:** Foundation
> **Applies to:** All (Web, iOS, Android, Desktop, Responsive)
> **Key sources:** Material Design 3 (m3.material.io), Apple Human Interface Guidelines (developer.apple.com/design/human-interface-guidelines), Ant Design (ant.design/docs/spec), Nielsen Norman Group eye-tracking research (nngroup.com), WCAG 2.1 (w3.org/WAI/WCAG21)

---

## 1. Core Principles

### 1.1 What Visual Hierarchy Is

Visual hierarchy is the principle of arranging elements so that people instantly
recognize their order of importance on a screen or page. It governs what the eye
sees first, second, and last. A strong hierarchy means users can scan a page in
under 3 seconds and understand both what it contains and what they should do next.

Every element on a screen competes for attention. Hierarchy is how you referee
that competition.

### 1.2 The Science Behind Hierarchy

#### Gestalt Principles

The Gestalt laws of perception, established in early 20th-century psychology and
validated repeatedly in modern UX research, explain how humans group visual
information:

| Principle | Definition | Hierarchy Application |
|-----------|-----------|----------------------|
| **Proximity** | Elements near each other are perceived as a group | Group related controls; separate unrelated sections with whitespace |
| **Similarity** | Elements sharing visual traits (color, shape, size) are perceived as related | Use consistent styling for elements at the same hierarchy level |
| **Continuity** | The eye follows smooth lines and curves | Align elements along clear axes to guide scanning |
| **Closure** | The brain completes incomplete shapes | Cards and containers do not need full borders |
| **Figure/Ground** | The eye separates foreground from background | Elevated surfaces (shadows, overlays) create depth hierarchy |
| **Common Region** | Elements inside a boundary are perceived as grouped | Cards, sections, and panels create logical clusters |
| **Focal Point** | An element that stands out visually captures attention first | The primary CTA should be the strongest focal point |

#### Eye-Tracking Patterns

Nielsen Norman Group's landmark eye-tracking study (232 users, thousands of web
pages) identified consistent scanning behaviors:

**F-Pattern (text-heavy pages):**
Users read the first horizontal line across the top, drop down and read a shorter
second line, then scan vertically down the left edge. This is the dominant
pattern for content pages, articles, and search results. Implications: place the
most critical information in the first two lines; use clear headings as anchors
along the left edge; front-load key words in every line.

**Z-Pattern (sparse, visual pages):**
On pages with minimal text (landing pages, hero sections), the eye moves from
top-left to top-right, diagonally to bottom-left, then across to bottom-right.
Implications: place your logo/brand top-left, primary value proposition top-right
or center, and primary CTA at the terminal point (bottom-right of the Z).

**Layer-Cake Pattern (structured content):**
When headings are visually distinct, users scan only the headings, skipping body
text until a heading matches their intent. Implications: headings must be
self-sufficient summaries, not decorative labels.

**Spotted Pattern (scanning for a specific target):**
Users skip large blocks and fixate on distinctive elements -- links, bold text,
numbers, icons. Implications: make interactive elements visually distinct from
static content.

#### Visual Weight

Visual weight is the perceived "heaviness" of an element -- how much it pulls
the eye. Elements with high visual weight are seen first. The primary levers:

1. **Size** -- Larger elements have more weight. A 32px headline pulls more than 14px body text.
2. **Color saturation and warmth** -- Saturated, warm colors (red, orange) carry more weight than desaturated, cool colors (gray, light blue).
3. **Contrast** -- High-contrast elements (dark on light, or vice versa) dominate low-contrast neighbors.
4. **Density/complexity** -- A detailed illustration has more weight than a flat icon.
5. **Position** -- Elements above the fold and toward the top-left (in LTR languages) are scanned first.
6. **Isolation** -- An element surrounded by whitespace carries disproportionate weight (the "hero" effect).
7. **Motion** -- Animated elements capture attention before static ones (use sparingly).

### 1.3 The Six Tools of Hierarchy

#### Size

The most direct hierarchy signal. Larger elements are more important. Design
systems formalize this into type scales:

**Material Design 3 Type Scale (complete values):**

| Role | Size | Weight | Typical Use |
|------|------|--------|-------------|
| Display Large | 57px/sp | Regular (400) | Hero headlines, splash screens |
| Display Medium | 45px/sp | Regular (400) | Section heroes |
| Display Small | 36px/sp | Regular (400) | Feature callouts |
| Headline Large | 32px/sp | Regular (400) | Page titles |
| Headline Medium | 28px/sp | Regular (400) | Section titles |
| Headline Small | 24px/sp | Regular (400) | Card titles, dialogs |
| Title Large | 22px/sp | Regular (400) | App bar titles |
| Title Medium | 16px/sp | Medium (500) | Subheadings |
| Title Small | 14px/sp | Medium (500) | Tab labels |
| Body Large | 16px/sp | Regular (400) | Primary body text |
| Body Medium | 14px/sp | Regular (400) | Default body text |
| Body Small | 12px/sp | Regular (400) | Captions, metadata |
| Label Large | 14px/sp | Medium (500) | Button labels |
| Label Medium | 12px/sp | Medium (500) | Form labels, chips |
| Label Small | 11px/sp | Medium (500) | Timestamps, badges |

**Ratio guidance:** Adjacent hierarchy levels should differ by at least 20-30%
in size. The M3 scale uses roughly a 1.2x-1.25x ratio between adjacent levels
(e.g., 14 -> 16 -> 22 -> 24 -> 28 -> 32). If two text elements are within 2px
of each other, they read as the same level.

**Ant Design Type Scale:**
Ant Design uses a 14px base with a scale derived from natural logarithms and the
pentatonic musical scale: 12, 14, 16, 20, 24, 30, 38, 46, 56, 68px. The system
recommends limiting any single screen to 3-5 font sizes to maintain restraint.

#### Color

Color establishes hierarchy through three mechanisms:

1. **Brand/primary color** signals the most important interactive element (primary CTA).
2. **Semantic color** conveys meaning (red = destructive, green = success, yellow = warning).
3. **Neutral scale** (grays) creates layers: darker text = more important, lighter text = secondary.

**Color hierarchy ladder (light theme):**
- Level 1 (primary text): #1A1A1A or equivalent, ~87% opacity black -- headings, primary labels
- Level 2 (secondary text): #616161 or ~60% opacity black -- body text, descriptions
- Level 3 (tertiary text): #9E9E9E or ~38% opacity black -- placeholders, timestamps, metadata
- Level 4 (disabled): #BDBDBD or ~26% opacity black -- disabled states

**Color hierarchy ladder (dark theme):**
- Level 1: #FFFFFF or ~87% opacity white
- Level 2: #B3B3B3 or ~60% opacity white
- Level 3: #808080 or ~38% opacity white
- Level 4: #666666 or ~26% opacity white

#### Contrast

WCAG 2.1 defines minimum contrast ratios:

| Standard | Normal Text (<18pt / <14pt bold) | Large Text (>=18pt / >=14pt bold) | UI Components |
|----------|----------------------------------|----------------------------------|---------------|
| AA (minimum) | 4.5:1 | 3:1 | 3:1 |
| AAA (enhanced) | 7:1 | 4.5:1 | N/A |

Contrast is a hierarchy amplifier: the highest-contrast element on the page is
seen first. A primary button with 8:1 contrast will dominate a secondary button
at 4.5:1 contrast. Use contrast differentials deliberately -- the primary action
should have the highest contrast on the page, secondary actions lower, and
tertiary actions lower still.

#### Spacing

Spacing controls grouping (proximity) and emphasis (isolation). The standard
approach is a spacing scale based on a 4px baseline grid:

**Recommended spacing scale (4px base):**

| Token | Value | Use |
|-------|-------|-----|
| space-xs | 4px | Inline icon gap, tight padding |
| space-sm | 8px | Related element gap, compact padding |
| space-md | 16px | Default padding, form field gap |
| space-lg | 24px | Section separation, card padding |
| space-xl | 32px | Major section gap |
| space-2xl | 48px | Page section separation |
| space-3xl | 64px | Hero section padding, page margins |
| space-4xl | 96px | Landing page section breaks |

**Key rule:** Internal spacing (padding within an element) should always be less
than or equal to external spacing (margin between elements). This ensures
elements read as cohesive units. If a card has 16px internal padding, the gap
between cards should be >= 16px.

**Material Design 3** uses a 4dp baseline grid for fine adjustments and common
increments of 8, 12, 16, 24, and 32dp for component spacing.

**Ant Design** uses three primary spacing values: 8px (small), 16px (medium),
24px (large), all on an 8px grid baseline.

#### Alignment

Alignment creates invisible lines that the eye follows (Gestalt continuity).
Strong alignment reduces visual noise and creates orderly scanning paths.

- Left-align body text in LTR languages (ragged right is easier to read than justified)
- Align form labels and inputs on a consistent vertical axis
- Use a column grid (4-column mobile, 8-column tablet, 12-column desktop) to create alignment guides
- Center-align only hero text and short headings; never center-align body paragraphs

#### Repetition

Repetition establishes patterns. Once users learn that "blue underlined text =
link" or "bold 24px text = section heading," they can scan efficiently because
the pattern is predictable. Breaking repetition signals a hierarchy shift
(intentional or accidental).

- Consistent styling for same-level elements reduces cognitive load
- Every style variation implies a hierarchy difference; unintentional variation creates confusion
- Limit the total number of distinct text styles per page to 4-6

### 1.4 How Hierarchy Differs Across Platforms

On mobile, vertical scrolling dominates and screen real estate is scarce, so
hierarchy is expressed primarily through vertical ordering and size contrast.
On desktop, wider viewports allow multi-column layouts where hierarchy uses both
horizontal position (left = primary in LTR) and vertical position (top = primary).

| Factor | Mobile | Web (Desktop) | Desktop App |
|--------|--------|--------------|-------------|
| Primary axis | Vertical scroll | Both axes | Both axes |
| Navigation | Tab bar (bottom) / hamburger | Top nav / sidebar | Menu bar + sidebar |
| Content density | Low-medium | Medium-high | High |
| Touch targets | 48dp / 44pt minimum | 24-32px clickable | 24-32px clickable |
| Type scale range | Narrower (12-28px typical) | Wider (11-57px) | Wider (11-48px) |
| Whitespace | Generous margins | Variable | Compact |
| Hierarchy layers | 2-3 levels | 3-5 levels | 3-5 levels |

---

## 2. Do's and Don'ts

### Do's

**D1. Use a constrained type scale with minimum 20% size jumps between levels.**
Adjacent hierarchy levels should be immediately distinguishable. If your heading
is 18px and your body is 16px, they read as the same level. Use at least a 1.2x
ratio: 14px body -> 18px subhead -> 22px heading -> 28px page title. Material
Design 3 uses jumps like 14 -> 16 -> 22 -> 24 -> 28 -> 32px.

**D2. Make the primary CTA 20-30% larger than secondary actions and use a filled style.**
A primary button at 48px height with a solid brand-color fill will dominate a
secondary 40px outlined button. The size and fill difference makes the action
hierarchy immediately clear without reading labels. Material Design 3 recommends
filled buttons for primary, outlined for secondary, and text buttons for tertiary.

**D3. Use whitespace to create hierarchy through isolation.**
An element surrounded by 48-64px of whitespace commands more attention than the
same element in a dense cluster. Apple's HIG specifically recommends "generous,
consistent whitespace to visually group related elements and separate distinct
sections." The hero CTA in a landing page should have at least 32px of breathing
room on all sides.

**D4. Limit each screen to 3-5 distinct font sizes.**
Ant Design explicitly recommends this constraint. More than 5 sizes creates
visual noise and makes it impossible for users to distinguish hierarchy levels.
A typical screen needs: heading, subheading, body, caption -- four sizes.

**D5. Front-load critical information in the first 40-60 characters of any text element.**
Eye-tracking confirms that users read the beginning of lines more carefully than
the middle or end (F-pattern). Place keywords, numbers, and action verbs at the
start of headings, list items, and button labels.

**D6. Maintain a 60-80 character line length for body text.**
Lines shorter than 40 characters cause excessive line-breaking and choppy reading.
Lines longer than 90 characters cause the eye to lose its place when returning
to the next line. At 16px with a standard font, this translates to approximately
480-640px content width.

**D7. Use the color hierarchy ladder consistently (87% / 60% / 38% opacity).**
Primary text at ~87% opacity (or #1A1A1A on white), secondary at ~60%
(or #616161), and tertiary at ~38% (or #9E9E9E). This creates three clear
typographic levels that users learn to interpret automatically.

**D8. Place the most important action at the terminal point of the scanning pattern.**
For Z-pattern layouts (landing pages), place the CTA at the bottom-right of the
Z. For F-pattern layouts (content pages), place the CTA below the first content
block or in a sticky element. The terminal point is where attention naturally
rests after scanning.

**D9. Use 44pt (iOS) or 48dp (Android) minimum touch targets, even if the visual element is smaller.**
The clickable/tappable area should meet platform minimums regardless of the
visual size of the icon or text. A 24x24px icon button should have 48x48dp of
tappable padding. This is both an accessibility requirement (WCAG 2.1 SC 2.5.5)
and a hierarchy signal -- interactive elements need sufficient presence.

**D10. Create depth hierarchy with consistent elevation levels.**
Material Design 3 uses elevation (0dp, 1dp, 3dp, 6dp, 8dp, 12dp) to layer
surfaces. Higher elements are "closer" to the user and more important. Use:
0dp for background, 1dp for cards, 3dp for app bars, 6dp for FABs, 8dp for
bottom sheets, 12dp for dialogs. Shadows should be consistent in direction and
softness.

**D11. Use a maximum of 2 typefaces per project (1 for headings, 1 for body).**
Each additional typeface introduces a new visual pattern the user must learn.
Most design systems use a single family: Material Design uses Roboto, Apple uses
San Francisco, Ant Design uses system fonts. If using two families, ensure they
have contrasting characteristics (serif + sans-serif, or display + text).

**D12. Align interactive elements on a clear vertical axis in forms and settings.**
Labels, inputs, and buttons should share a left edge (or label edge + input edge
in side-by-side layouts). Misaligned form elements slow scanning by 20-40%
because the eye must search for each field independently rather than following
a straight line.

**D13. Use icons as hierarchy accelerators, not decorators.**
An icon next to a label should reinforce the label's meaning and provide a
faster recognition path (spotted scanning pattern). Icons should be a consistent
size within each hierarchy level: 24px for primary actions, 20px for secondary,
16px for inline/metadata. Decorative icons that do not add meaning create noise.

### Don'ts

**X1. Do not create more than 3 competing focal points on a single screen.**
If everything is bold, nothing is bold. A screen with 3+ elements all demanding
primary attention causes "visual shouting" -- the user cannot determine where to
look first and experiences decision paralysis. Identify one primary, one
secondary, and let everything else recede.

**X2. Do not use pure black (#000000) text on pure white (#FFFFFF) backgrounds.**
The extreme contrast (21:1) causes halation -- the text appears to vibrate and
causes eye strain on screens. Use #1A1A1A to #212121 on #FFFFFF (approximately
17:1-18:1 contrast) or #FAFAFA backgrounds. Apple's HIG and Material Design
both avoid pure black on pure white in their default themes.

**X3. Do not center-align body text or any text block longer than 2 lines.**
Center-aligned text creates a ragged left edge, destroying the scanning anchor
that makes reading efficient. The eye must re-find the start of each line. Center
alignment is acceptable only for: single-line headings, short hero statements
(under 8-10 words), and modal titles.

**X4. Do not rely on color alone to communicate hierarchy.**
Approximately 8% of men and 0.5% of women have color vision deficiency.
Hierarchy that depends solely on color differences (e.g., red vs. green status
labels with no other visual distinction) fails for these users. Always pair
color with at least one other signal: size, weight, iconography, or position.

**X5. Do not use more than 3-4 font weights on a single page.**
Regular (400), Medium (500), and Bold (700) provide sufficient hierarchy range.
Adding Light (300) and Black (900) on the same page creates ambiguity -- users
cannot reliably distinguish 5 weight levels. Stick to 2-3 weights for clarity.

**X6. Do not place two same-size, same-style CTAs side by side without visual differentiation.**
Two identical buttons create a 50/50 split in attention and force the user to
read both labels to choose. Always differentiate: primary (filled) vs. secondary
(outlined), or primary (larger, colored) vs. secondary (smaller, neutral).

**X7. Do not use justified text in digital interfaces.**
Justified text creates uneven word spacing ("rivers of white") that disrupts
reading flow and is especially problematic on narrow mobile screens. Use
left-aligned (LTR) or right-aligned (RTL) body text exclusively.

**X8. Do not make interactive and non-interactive elements visually identical.**
If a clickable text link looks the same as surrounding body text (same color,
same weight, no underline), users will not discover it. Interactive elements
must differ from static text by at least two visual properties (e.g., color +
underline, or color + weight).

**X9. Do not use spacing smaller than 8px between distinct interactive elements.**
Elements closer than 8px risk accidental taps (especially on mobile) and read as
a single group (Gestalt proximity). Between distinct tap targets, maintain at
least 8px visual separation. Between distinct sections, use at least 24px.

**X10. Do not use more than 2 accent colors for interactive elements.**
One primary brand color for primary CTAs and one secondary color for secondary
actions. Adding a third interactive color creates ambiguity about which color
means "most important." Semantic colors (red, green, yellow) are exceptions
but should not compete with the primary CTA color.

**X11. Do not ignore the fold -- keep primary actions visible without scrolling.**
"Above the fold" still matters: Nielsen Norman Group research consistently shows
that content above the fold receives 57% more viewing time than content below.
The primary CTA and key value proposition must be visible in the initial
viewport.

**X12. Do not use low-contrast placeholder text as the only label for form fields.**
Placeholder text at 38-40% opacity disappears when the user starts typing,
removing the field's label. Always use a persistent label (above or beside the
field) with at least secondary-level contrast (60% opacity / 4.5:1 minimum).

**X13. Do not mix alignment systems within the same section.**
If a card uses left-aligned text, do not center-align the button within it. If a
form uses top-aligned labels, do not switch to side-aligned labels for one field.
Mixed alignment creates micro-friction that accumulates into a "messy" perception.

---

## 3. Platform Variations

### 3.1 iOS (Apple Human Interface Guidelines)

**Typography:**
- System font: San Francisco (SF Pro Display >= 20pt, SF Pro Text < 20pt)
- SF Pro Text uses wider letter spacing and heavier strokes for small sizes
- Dynamic Type ranges: xSmall through xxxLarge, plus AX1-AX5 accessibility sizes
- Minimum readable size: 11pt (Caption 2 built-in minimum)
- Body default: 17pt
- Large Title: 34pt
- Title 1: 28pt, Title 2: 22pt, Title 3: 20pt
- Headline: 17pt semibold
- Subhead: 15pt
- Footnote: 13pt, Caption 1: 12pt, Caption 2: 11pt

**Touch targets:** 44 x 44pt minimum (approximately 7mm physical)

**Spacing and layout:**
- Standard horizontal margins: 16pt (compact), 20pt (regular)
- Navigation bar height: 44pt (standard), 96pt (large title)
- Tab bar height: 49pt
- Default content padding: 16pt
- Section spacing in grouped tables: 35pt header, 8pt between sections

**Hierarchy approach:**
- Relies heavily on typography weight and size rather than color fills
- Uses translucency and blur (vibrancy) for depth hierarchy
- Liquid Glass design language (2025+) uses backdrop blur and semi-transparency
- Left-aligned, bold typography for alerts and critical text
- Minimal use of borders; prefers whitespace and grouping for separation

### 3.2 Android (Material Design 3)

**Typography:**
- System font: Roboto (default), customizable via Material Theme Builder
- Full 15-token type scale (see Section 1.3 table above)
- Base body size: 14sp (Body Medium)
- Minimum recommended: 11sp (Label Small)

**Touch targets:** 48 x 48dp minimum (approximately 9mm physical)

**Spacing and layout:**
- 4dp baseline grid
- Common spacing increments: 4, 8, 12, 16, 24, 32dp
- Standard horizontal margins: 16dp (compact), 24dp (medium), 24dp (expanded)
- App bar height: 64dp (standard), 152dp (large)
- Navigation bar (bottom): 80dp
- FAB: 56dp (standard), 96dp (large)
- Grid gutter: 8dp minimum

**Hierarchy approach:**
- Elevation (shadow) as primary depth hierarchy signal
- Color roles: primary, secondary, tertiary surfaces with tonal mapping
- Tonal elevation (surface tint color at varying opacities) in M3
- M3 Expressive (2025) introduces more expressive typography and bolder color
- Container shapes (rounded corners) differentiate hierarchy levels

### 3.3 Web (Responsive)

**Typography:**
- Base body: 16px (browser default, do not go smaller for body text)
- Heading scale (common): 14, 16, 20, 24, 32, 40, 48, 64px
- Minimum readable: 12px (absolute minimum; 14px preferred)
- Line height: 1.4-1.6x font size for body text (e.g., 16px / 24px line height)
- Paragraph max-width: 65-75 characters (approximately 600-700px at 16px)

**Touch/click targets:**
- WCAG 2.1 SC 2.5.5: 44 x 44px minimum for touch
- Desktop click targets: 24px minimum height, 32px preferred
- Link text: minimum 16px font size, underlined or distinguishable

**Spacing and layout:**
- 12-column grid (desktop), 8-column (tablet), 4-column (mobile)
- Gutter width: 16-24px (mobile), 24-32px (desktop)
- Page max-width: 1200-1440px typical
- Horizontal page margin: 16px (mobile), 24-64px (tablet), 64-120px (desktop)
- Section vertical spacing: 48-96px (desktop), 32-48px (mobile)

**Hierarchy approach:**
- Z-pattern for landing/marketing pages
- F-pattern for content/text-heavy pages
- Sticky headers and floating CTAs for persistent hierarchy anchors
- Responsive breakpoints: 320, 768, 1024, 1440px (common)
- Progressive disclosure: show primary content first, details on interaction

### 3.4 Desktop Applications

**Typography:**
- Denser than web; base body: 13-14px typical (macOS system: 13pt, Windows: 14px Segoe UI)
- Smaller minimum sizes acceptable due to closer viewing distance
- Menu text: 13px, toolbar labels: 11-12px

**Interaction targets:**
- Menu items: 20-24px height minimum
- Toolbar buttons: 24-32px
- Tree view items: 20-24px row height

**Hierarchy approach:**
- Menu bar provides top-level navigation hierarchy
- Sidebars/panels create spatial hierarchy (left = navigation, center = content, right = properties)
- Density is higher; users expect more information per screen
- Keyboard shortcuts provide alternative hierarchy navigation

---

## 4. Common Mistakes in AI-Generated Designs

AI design tools and AI-assisted layout generators have specific recurring
failure patterns related to visual hierarchy. These mistakes stem from the
models' tendency to optimize for visual balance and aesthetic appeal without
understanding the user's task flow.

### 4.1 Flat Hierarchy (Equal Weight Everywhere)

**The problem:** AI-generated layouts frequently give all elements near-equal
visual weight. Every text block is the same size, every button looks the same,
every card is identically styled. The result is a layout with no entry point --
the user's eye bounces randomly across the page.

**How to detect:** Squint at the layout (or blur it to 5px Gaussian blur). If no
element clearly stands out, the hierarchy is flat. You should see 1 dominant
element, 2-3 supporting elements, and everything else receding.

**How to fix:** Identify the single most important element (primary CTA or key
headline). Increase its size by 40-60% relative to everything else. Add
whitespace around it. Then establish 2-3 supporting elements at 70-80% of the
primary's visual weight.

### 4.2 Over-Decoration

**The problem:** AI tends to add visual embellishment -- gradients, shadows,
borders, background colors, icons -- to every element. This creates visual noise
that competes with actual content hierarchy. A card with a gradient background, a
drop shadow, a border, an icon, bold text, AND a colored badge has too many
signals fighting for attention.

**How to detect:** Count the number of distinct visual treatments on a single
component. More than 3 (e.g., color fill + shadow + icon) is usually excessive.

**How to fix:** Apply the "one signal per level" rule. Primary elements get the
strongest single signal (size OR color OR position). Remove redundant treatments.
A button does not need both a shadow AND a gradient AND a border.

### 4.3 Inconsistent Spacing

**The problem:** AI-generated layouts often use arbitrary spacing values
(13px here, 17px there, 22px elsewhere) rather than adhering to a spacing scale.
This creates subtle visual disorder that users feel but cannot articulate.

**How to detect:** Measure the spacing between elements. If values are not
multiples of 4px (or your chosen base unit), the spacing is inconsistent.

**How to fix:** Snap all spacing to a 4px or 8px grid. Use the spacing scale
from Section 1.3. Every margin, padding, and gap should be a token value.

### 4.4 Poor Button Hierarchy

**The problem:** AI frequently generates pages with multiple same-styled buttons
("Learn More," "Get Started," "Sign Up," "Contact Us") all as filled/primary
buttons. When every button is primary, none is primary.

**How to detect:** Count the filled/primary buttons on the screen. If more than
1-2 are visible simultaneously, the button hierarchy is broken.

**How to fix:** Designate exactly 1 primary (filled) button per viewport. Use
outlined style for secondary actions and text-only style for tertiary. In forms,
the submit action is primary; cancel is tertiary.

### 4.5 Text Hierarchy Compression

**The problem:** AI-generated designs often compress the type scale -- using 14px,
15px, 16px, and 17px all on the same page. These sizes are too close to create
perceptible hierarchy levels.

**How to detect:** List all font sizes used on the page. If any two adjacent
levels differ by less than 20% (e.g., 14px and 16px = 14% difference), the
hierarchy is compressed.

**How to fix:** Use a minimum 1.25x ratio between adjacent sizes. If body is
14px, the next level up should be at least 18px, then 22px, then 28px.

### 4.6 Ignoring Reading Patterns

**The problem:** AI layouts may place the most important element in a position
that contradicts natural scanning patterns -- e.g., the primary CTA in the
middle-left of a landing page (a dead zone in the Z-pattern), or critical
information at the bottom-right of a text-heavy page (ignored in F-pattern
scanning).

**How to detect:** Overlay the appropriate scanning pattern (Z or F) on the
layout. The primary CTA should land on the pattern's natural fixation points.

**How to fix:** Move the primary CTA to a scanning pattern hotspot. For Z-pattern
pages: top-right or bottom-right. For F-pattern pages: beginning of the first
or second horizontal bar, or inline with the left vertical scan line.

### 4.7 Aesthetic Balance Over Functional Hierarchy

**The problem:** AI models are often trained on visually "beautiful" designs and
may prioritize symmetry and balance over functional hierarchy. A perfectly
symmetric layout where the CTA is visually balanced by a decorative image has
weak hierarchy -- the CTA does not dominate.

**How to detect:** Ask: "Can I identify the primary action in under 2 seconds
without reading any text?" If not, aesthetic balance is overriding functional
hierarchy.

**How to fix:** Intentionally break symmetry in favor of the primary element.
The primary CTA should be visually heavier than its surroundings. Asymmetry
creates hierarchy; perfect symmetry creates equivalence.

### 4.8 Missing Content Grouping

**The problem:** AI-generated designs sometimes present all content as a flat list
without logical grouping. A settings page with 20 options all at the same level,
without sections or categories, is overwhelming.

**How to detect:** If a page has more than 7 items (Miller's law) at the same
visual level without grouping, it needs sections.

**How to fix:** Group related items using section headings, card containers, or
increased spacing between groups. Use the Gestalt principles of proximity and
common region.

### 4.9 Self-Verification Checklist for AI-Generated Designs

Before finalizing any AI-generated layout, verify:

- [ ] Can you identify the single most important element within 2 seconds?
- [ ] Does the primary CTA have the highest visual weight on the page?
- [ ] Are there 3 or fewer competing focal points visible at once?
- [ ] Do all spacing values align to a 4px or 8px grid?
- [ ] Are font sizes limited to 3-5 distinct values?
- [ ] Is there at least a 1.2x ratio between adjacent type levels?
- [ ] Does button styling differentiate primary, secondary, and tertiary actions?
- [ ] Is body text left-aligned (not center-aligned)?
- [ ] Do touch targets meet platform minimums (44pt iOS, 48dp Android)?
- [ ] Does text contrast meet WCAG AA (4.5:1 normal, 3:1 large)?
- [ ] Are interactive elements visually distinct from static content?
- [ ] Does the layout follow a natural scanning pattern (F or Z)?
- [ ] Is whitespace used consistently and from a defined spacing scale?

---

## 5. Decision Framework

### 5.1 When to Break Hierarchy Rules

Hierarchy rules are guidelines for common cases, not immutable laws. There are
legitimate reasons to break them:

**Break: Equal-weight CTAs (violating single-primary-action rule)**
When to break: A/B comparison screens, product comparison pages, or "Choose
your plan" layouts where the user genuinely needs to evaluate two equal options.
Dual-primary buttons are acceptable when the design intent is parity, not
priority.

**Break: Small touch targets (below 44pt / 48dp)**
When to break: Dense data tables, code editors, or professional tools where
users accept density trade-offs for efficiency. The target audience is desktop
users with a mouse. Always provide an accessible alternative (keyboard nav).

**Break: Center-aligned body text**
When to break: Poetry, quotes, or ceremonial/formal content where centered
alignment is a cultural convention. Keep it to 2-3 lines maximum.

**Break: More than 5 type sizes on a page**
When to break: Dashboard or analytics pages with multiple data visualization
levels (chart titles, axis labels, data values, annotations, legends). The
data complexity justifies additional levels, but each level must serve a clear
purpose.

**Break: Pure black text (#000000)**
When to break: High-contrast accessibility mode, where users have explicitly
opted in to maximum contrast. Respect user preferences over aesthetic guidelines.

**Break: Using motion for hierarchy**
When to break: Onboarding flows, empty states, or notification badges where a
subtle animation (pulse, fade-in) guides the user to an element they might
otherwise miss. Motion should be < 300ms and non-repeating after initial view.

### 5.2 Trade-Off Matrices

#### Density vs. Clarity

| Scenario | Lean Toward Density | Lean Toward Clarity |
|----------|-------------------|-------------------|
| Professional/expert tool | Yes | -- |
| Consumer mobile app | -- | Yes |
| Data-entry form (daily use) | Yes | -- |
| Onboarding/first-time experience | -- | Yes |
| E-commerce product listing | Balanced | Balanced |
| Dashboard (monitoring) | Yes | -- |
| Marketing landing page | -- | Yes |
| Settings/preferences | Balanced | -- |

**Density indicators:** Smaller type (13-14px base), tighter spacing (4-8px gaps),
more items per viewport, smaller touch targets, multi-column layouts.

**Clarity indicators:** Larger type (16-18px base), generous spacing (16-24px gaps),
fewer items per viewport, large touch targets, single-column or wide-column layouts.

#### Aesthetics vs. Usability

| When they conflict... | Choose usability when... | Choose aesthetics when... |
|----------------------|--------------------------|--------------------------|
| CTA prominence | Users need to complete a task (checkout, signup) | Brand perception is the primary goal (portfolio, brand site) |
| Whitespace usage | Content comprehension is critical | Visual impact and emotional response matter more |
| Color palette | Accessibility requirements must be met (always) | Never -- accessibility is non-negotiable |
| Typography expressiveness | Readability of body text is at stake | Display/headline text where expressiveness enhances communication |
| Animation/motion | Performance or accessibility is impacted | Delight and engagement are primary metrics |

**Non-negotiable:** Accessibility (contrast ratios, touch targets, screen reader
support) should never be sacrificed for aesthetics. A beautiful design that
excludes 8-15% of users is a failed design.

#### Consistency vs. Emphasis

| Situation | Maintain Consistency | Break for Emphasis |
|-----------|--------------------|--------------------|
| Normal page content | Yes | -- |
| Error or critical alert | -- | Yes (color, size, position) |
| Primary CTA among many actions | -- | Yes (filled vs. outlined) |
| Navigation items | Yes (same weight, size) | -- |
| New feature callout | -- | Yes (badge, animation) |
| Status messages | Yes (consistent semantic colors) | -- |

### 5.3 The Hierarchy Stress Test

Apply this three-step test to any layout:

**Step 1 -- The Blur Test:**
Apply a 5-8px Gaussian blur to the entire layout (or squint). The visual
hierarchy should still be readable: one dominant element, 2-3 supporting
elements, and a background of receding content. If the blurred layout looks
like uniform gray noise, the hierarchy has failed.

**Step 2 -- The 5-Second Test:**
Show the layout to someone for 5 seconds, then hide it. Ask: "What was this
page about? What were you supposed to do?" If they cannot answer both questions,
the hierarchy is not communicating intent.

**Step 3 -- The Grayscale Test:**
Convert the layout to grayscale. The hierarchy should still function through
size, weight, spacing, and position alone. If removing color destroys the
hierarchy, it was too dependent on color (violating accessibility principles).

---

## Quick Reference Checklist

Use this checklist to evaluate any interface layout for visual hierarchy quality.
Each item is pass/fail.

- [ ] **Single focal point:** One element clearly dominates the viewport (blur test passes)
- [ ] **Type scale discipline:** 3-5 font sizes maximum per screen, minimum 1.2x ratio between levels
- [ ] **Primary CTA prominence:** Primary action is filled/solid, 20-30% larger than secondary actions
- [ ] **Button hierarchy:** Max 1-2 filled buttons visible; secondary = outlined, tertiary = text-only
- [ ] **Contrast compliance:** All text meets WCAG AA (4.5:1 normal, 3:1 large text)
- [ ] **Color hierarchy:** Text uses 3 opacity levels (87%, 60%, 38%) or equivalent hex values
- [ ] **Spacing consistency:** All spacing values are multiples of 4px (or chosen base unit)
- [ ] **Internal <= external:** Padding within components is less than or equal to margins between them
- [ ] **Touch targets:** Interactive elements meet 44pt (iOS) or 48dp (Android) minimums
- [ ] **Alignment:** All elements align to a column grid; no orphaned alignments
- [ ] **Reading pattern:** Layout follows F-pattern (content) or Z-pattern (marketing) appropriately
- [ ] **Scanning anchors:** Headings are visually distinct and self-sufficient (layer-cake scannable)
- [ ] **Line length:** Body text is 60-80 characters per line (480-640px at 16px)
- [ ] **No visual shouting:** No more than 3 competing focal points per viewport
- [ ] **Text alignment:** Body text is left-aligned (LTR); center-alignment limited to short headings
- [ ] **Interactive distinction:** Links/buttons differ from static text by 2+ visual properties
- [ ] **Whitespace isolation:** Primary element has meaningful whitespace separation from neighbors
- [ ] **Grayscale test:** Hierarchy survives removal of color (size/weight/spacing carry it)
- [ ] **Platform compliance:** Typography and spacing follow platform-specific guidelines (M3 / HIG / Web)
- [ ] **Depth consistency:** Elevation/shadow levels are used consistently and in correct stacking order

---

*Researched: 2026-03-07 | Sources: Material Design 3 (m3.material.io/styles/typography, m3.material.io/foundations/layout), Apple Human Interface Guidelines (developer.apple.com/design/human-interface-guidelines/typography), Ant Design (ant.design/docs/spec/font, ant.design/docs/spec/proximity), Nielsen Norman Group (nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered, nngroup.com/articles/text-scanning-patterns-eyetracking, nngroup.com/articles/principles-visual-design), WCAG 2.1 (w3.org/WAI/WCAG21/Understanding/contrast-minimum, w3.org/WAI/WCAG21/Understanding/non-text-contrast), Interaction Design Foundation (ixdf.org/literature/topics/visual-hierarchy, ixdf.org/literature/topics/gestalt-principles), Smashing Magazine (smashingmagazine.com/2014/12/design-principles-visual-weight-direction)*
