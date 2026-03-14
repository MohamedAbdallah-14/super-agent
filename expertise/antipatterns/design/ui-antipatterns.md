# UI Design Anti-Patterns

> UI anti-patterns are recurring visual and interaction design mistakes that degrade
> usability, accessibility, and user trust. They are especially dangerous because
> they often look acceptable in static mockups and only reveal their damage when
> real users interact with real content on real devices. A single poor contrast
> ratio can exclude millions of users; a single ambiguous form field cost Expedia
> $12 million per year in lost revenue.

> **Domain:** Design
> **Anti-patterns covered:** 22
> **Highest severity:** Critical

---

## Anti-Patterns

### AP-01: Ghost Labels (Placeholder Text as the Only Label)

**Also known as:** Disappearing labels, placeholder-only inputs, vanishing hints
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Form inputs use placeholder text inside the field as the sole label. When users
click or tab into the field, the label disappears. There is no persistent visible
label outside the input. The user must remember what each field was asking for
while typing.

```html
<!-- Anti-pattern: placeholder as only label -->
<input type="text" placeholder="Email address" />
<input type="password" placeholder="Password" />

<!-- Correct: visible label + optional placeholder hint -->
<label for="email">Email address</label>
<input type="email" id="email" placeholder="you@example.com" />
```

**Why developers do it:**
It looks clean and minimalist. It saves vertical space. Designers see the empty
state in mockups and think "the user will know what to do." The placeholder
appears to serve double duty, and removing the label feels like an elegant
simplification.

**What goes wrong:**
- Users with short-term memory issues, cognitive disabilities, ADHD, or traumatic
  brain injuries lose track of what the field requires the moment they start typing.
- On long forms (5+ fields), even users without disabilities frequently tab back
  to check what a field was asking -- they must delete their entry and click away
  to see the placeholder again.
- Screen readers may not announce placeholder text at all -- the field is
  effectively unlabeled for blind users, violating WCAG 1.3.1 (Info and
  Relationships) and 3.3.2 (Labels or Instructions).
- Placeholder text defaults to light gray (#999 on white), which fails WCAG
  contrast minimums (2.85:1 vs. the required 4.5:1).
- Nielsen Norman Group research explicitly warns: "Placeholder text in form fields
  is harmful." Their studies found increased error rates and completion times
  across all tested demographics.

**The fix:**
Always use a visible `<label>` element associated via `for`/`id` with the input.
Place the label above or to the left of the field. If you want the compact
aesthetic, use the floating label pattern (label starts inside, animates above on
focus) -- but ensure the label remains visible at all times once the field has
focus or content. Reserve placeholder text for supplementary hints like format
examples ("MM/DD/YYYY").

**Detection rule:**
If you see an `<input>` or `<textarea>` with a `placeholder` attribute but no
associated `<label>` element (or `aria-label` / `aria-labelledby`), this is AP-01.

---

### AP-02: The Invisible Wall (Poor Contrast Ratios)

**Also known as:** Low-contrast text, gray-on-gray, whisper text
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
Text is rendered in a color too similar to its background. Common offenders:
light gray body text on white (#999 on #FFF = 2.85:1), white text on pastel
backgrounds, dark gray on black (#666 on #000 = 2.5:1), or text overlaid on
photographs without a scrim.

**Why developers do it:**
Designers pursue a "clean" or "modern" aesthetic. Light gray text looks
sophisticated in Figma on a calibrated 5K monitor. Stakeholders request "less
visual noise." Nobody checks the contrast ratio with a tool.

**What goes wrong:**
- WCAG 2.1 SC 1.4.3 requires a minimum contrast ratio of 4.5:1 for normal text
  and 3:1 for large text (18px+ or 14px+ bold). Failing this is a Level AA
  violation, making the product legally non-compliant in jurisdictions with
  accessibility mandates (ADA, EAA, Section 508).
- An estimated 300 million people worldwide have color vision deficiency. Low
  contrast compounds the problem, making text effectively invisible.
- Even users with perfect vision struggle in suboptimal conditions: bright
  sunlight on a phone, aging laptop screens, low-brightness battery-saver modes.
- WebAIM's Million Home Page analysis (2024) found that 83.6% of home pages had
  detectable WCAG 2 contrast failures -- the single most common accessibility
  error on the web, year after year.

**The fix:**
Use a contrast checker (WebAIM Contrast Checker, Stark plugin, Chrome DevTools
audit) during design, not after. Set minimum contrast ratios as design tokens:
`--color-text-primary` must pass 4.5:1 against `--color-bg-primary`. For text on
images, use a semi-transparent overlay (scrim) behind the text. Test on a
low-brightness phone screen and in direct sunlight.

**Detection rule:**
If any text element has a computed contrast ratio below 4.5:1 against its
background (or below 3:1 for large text), this is AP-02. Automated tools like
axe-core and Lighthouse flag this reliably.

---

### AP-03: Thumbs Down (Tiny Touch Targets on Mobile)

**Also known as:** Needle-eye taps, micro buttons, fat-finger traps
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Interactive elements (buttons, links, checkboxes, icon buttons) render smaller
than 44x44 CSS pixels on touch devices. Close/dismiss buttons are 16x16px icons.
Table rows have inline "edit" links at 12px font size with no padding. Radio
buttons use the browser default 13x13px hit area.

**Why developers do it:**
The design was created desktop-first and nobody re-evaluated touch targets.
Developers test with a mouse pointer (1px precision) rather than a fingertip
(~7mm imprecision). Dense information layouts are prioritized over touch
ergonomics.

**What goes wrong:**
- WCAG 2.5.8 (Target Size Minimum, Level AA) requires 24x24 CSS pixels minimum.
  WCAG 2.5.5 (Target Size Enhanced, Level AAA) requires 44x44 CSS pixels.
  Apple HIG recommends 44pt minimum; Material Design recommends 48dp.
- Users with motor impairments, hand tremors, or limited dexterity physically
  cannot hit small targets. This is not an edge case -- it includes users with
  arthritis, Parkinson's disease, and temporary injuries.
- "Rage taps" (Smashing Magazine research) -- users tapping repeatedly on a
  small target they keep missing -- are a leading indicator of frustration and
  session abandonment on mobile.
- Adjacent tiny targets cause mis-taps: the user hits "delete" when they meant
  "edit" because the two 20px icons are 4px apart.

**The fix:**
Set a minimum interactive size of 44x44 CSS pixels via padding, min-width, and
min-height -- even if the visual element (icon, text) is smaller. Maintain at
least 8px spacing between adjacent touch targets. Use CSS `touch-action` and
`pointer` media queries to adjust sizing for touch devices. Test with a real
finger on a real phone.

```css
/* Minimum touch target */
.btn-icon {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

**Detection rule:**
If any clickable element (button, link, input, interactive icon) has a rendered
size below 44x44 CSS pixels on viewports <= 1024px wide, this is AP-03. Check
both the element dimensions and the spacing to its nearest interactive neighbor.

---

### AP-04: The Monochrome Signal (Using Color Alone to Convey Information)

**Also known as:** Color-only encoding, red-means-error, traffic-light UI
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Form validation shows errors only by turning the input border red -- no icon, no
text message. A dashboard chart distinguishes five data series solely by color.
A calendar marks holidays with a green background and deadlines with red, with no
text or icon difference. Status badges use green/yellow/red dots with no labels.

**Why developers do it:**
Color is the fastest visual differentiator and requires the least screen space.
Traffic light metaphors (red/yellow/green) feel universally understood. Adding
icons or text to every status indicator feels redundant and clutters the layout.

**What goes wrong:**
- WCAG 1.4.1 (Use of Color, Level A) -- the most fundamental accessibility
  level -- explicitly prohibits using color as the only visual means of conveying
  information. This is a baseline legal requirement, not a nice-to-have.
- Approximately 8% of men and 0.5% of women have color vision deficiency
  (roughly 350 million people worldwide). Red-green color blindness is the most
  common form, which directly undermines the ubiquitous red/green
  success/error pattern.
- Monochrome displays, high-contrast modes, print-to-PDF, and screen readers
  all strip color information entirely.
- Real-world consequence: medical software that used only color to distinguish
  patient alert severity levels caused clinicians to miss critical alerts, leading
  to documented adverse events (ECRI Institute reports on EHR usability).

**The fix:**
Always pair color with at least one additional visual cue: an icon (checkmark for
success, X for error), a text label ("Error", "Warning"), a pattern or shape
change, or a border/underline style. For charts, use patterns (dashed, dotted,
solid) alongside colors, and provide a text data table as an alternative.

```html
<!-- Anti-pattern: color only -->
<span style="color: red;">Username</span>

<!-- Correct: color + icon + text -->
<span style="color: red;">
  <svg aria-hidden="true"><!-- error icon --></svg>
  Username — This field is required
</span>
```

**Detection rule:**
If any UI element communicates state (error, success, warning, active, disabled)
or differentiates data series using only a color change -- with no icon, text,
pattern, or shape difference -- this is AP-04.

---

### AP-05: The Text Avalanche (Walls of Text Without Visual Hierarchy)

**Also known as:** The gray wall, content dump, undifferentiated text block
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
A page or section presents large blocks of body text with no headings, no
subheadings, no bullet lists, no bold key phrases, no images or diagrams to break
the flow. Everything is the same font size, weight, and color. Paragraphs run 8+
lines without a break. Settings pages list 30 options in a single unstructured
column.

**Why developers do it:**
Content was pasted from a requirements document or CMS without design review.
The developer focused on functionality ("the information is there") rather than
scannability. Time pressure eliminated the design pass. There is no design system
enforcing heading levels.

**What goes wrong:**
- Nielsen Norman Group eye-tracking research shows users scan rather than read
  web content. Without hierarchy, users enter "scan failure" mode: their eyes
  bounce across the page without landing on key information, and they give up.
- The F-pattern and layer-cake scanning patterns both depend on visually distinct
  headings. Without them, users default to reading the first few words of the
  first paragraph and abandoning the page.
- Conversion rates drop measurably. Marketing research consistently shows that
  structured content with clear headers outperforms wall-of-text layouts by
  47-58% in comprehension and task completion.
- Accessibility: screen reader users navigate by headings (the H key in NVDA/JAWS).
  A page with no heading structure forces them to listen linearly to all content.

**The fix:**
Apply a typographic hierarchy: H1 for page title, H2 for sections, H3 for
subsections. Use bullet/numbered lists for sequences or options. Bold key terms
at the start of paragraphs. Keep paragraphs under 4 lines. Add whitespace
between sections. If a text block exceeds 150 words, look for an opportunity to
extract a summary, a table, or a diagram.

**Detection rule:**
If a content area contains more than 200 words with no heading elements
(`<h2>` through `<h6>`), no list elements, and no visual differentiation (bold,
size change, color accent), this is AP-05.

---

### AP-06: The Pixel-Perfect Mirage (Designs That Break With Real Content)

**Also known as:** Lorem Ipsum syndrome, mockup-only design, static-content assumption
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
A card layout looks perfect with the designer's curated 12-word title and 2-line
description. In production, a user enters a 60-word title and the layout
explodes: text overflows, overlaps adjacent elements, or gets clipped without
indication. A profile component assumes all names are "John Smith" length and
breaks with "Wolfeschlegelsteinhausenbergerdorff." A price display has room for
"$9.99" but not "$12,349.99."

**Why developers do it:**
Designers work in tools like Figma where content is controlled and static. The
handoff specifies exact pixel dimensions. Developers implement what they see in
the mockup using fixed heights and widths. Nobody tests with edge-case content
(empty strings, maximum-length inputs, RTL text, special characters).

**What goes wrong:**
- Layouts overflow, clip, or overlap -- creating both visual bugs and functional
  failures (buttons hidden behind overflowing text, truncated phone numbers).
- Localization multiplies the problem: German text averages 30% longer than
  English; Arabic and Hebrew require RTL layout; CJK characters have different
  line-breaking rules.
- The myth of pixel perfection is harmful in modern development: there are
  thousands of viewport sizes, and a layout that cannot flex is a layout that
  will break. Josh Comeau notes: "In a strict sense, pixel perfection is not
  actually possible. The HTML and CSS we write will run on a dizzying array of
  devices."

**The fix:**
Design with content extremes from day one. Create mockups with: empty content,
single-word content, maximum-length content, and translated content (German for
length, Arabic for RTL). Use CSS that accommodates variability: `min-height`
instead of `height`, `overflow-wrap: break-word`, text truncation with ellipsis
and tooltips for bounded containers. Define a content contract: what is the
minimum, maximum, and typical length for every text field?

**Detection rule:**
If a container uses fixed `height` or `width` on a text-bearing element without
`overflow` handling, or if mockups contain exclusively "perfect length" lorem
ipsum content with no stress-test variants, this is AP-06.

---

### AP-07: The Mystery Icon (Icons Without Labels)

**Also known as:** Mystery meat navigation, hieroglyphic UI, icon roulette
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
A toolbar presents a row of unlabeled icons: a gear, a pencil, a cloud, an arrow,
three dots, a bell, a person silhouette. The user must hover over each one
(desktop) or tap experimentally (mobile) to discover what it does. Navigation
relies entirely on icon recognition.

**Why developers do it:**
Icons save horizontal space. Designers assume commonly used icons (hamburger,
gear, magnifying glass) are universally understood. Adding text labels makes the
toolbar look "cluttered." The designer's familiarity with the interface creates a
false consensus effect -- "if I know what it means, everyone does."

**What goes wrong:**
- Nielsen Norman Group icon usability research found that icons-only navigation
  decreased findability by nearly 50% compared to labeled alternatives. Task
  completion times increased by up to 18%.
- The same icon means different things in different contexts. NNGroup's testing
  showed that users predicted wildly different functionalities for the same icon:
  a storefront icon was interpreted as "homepage," "store locations," "in-store
  deals," and "related retailers" by different users.
- Tooltips on hover fail on touch devices entirely. There is no hover state on
  a phone or tablet.
- Material Design's icon-heavy approach has been specifically criticized for
  creating mystery meat navigation -- a term from early web design that returned
  with modern minimalism.

**The fix:**
Always pair icons with visible text labels. The label should be visible at all
times, not revealed on hover. For space-constrained toolbars, use an icon +
label on larger viewports and icon + tooltip + `aria-label` on smaller viewports
(accepting the discoverability trade-off). The only icons that can arguably stand
alone are: close (X), search (magnifying glass), and play/pause -- and even
these benefit from labels.

**Detection rule:**
If a clickable icon has no adjacent visible text label AND no `aria-label` or
`aria-labelledby`, this is AP-07. Even with aria attributes, if there is no
visible label, flag it as a discoverability concern.

---

### AP-08: The Infinite Truncation (Truncated Text Without Escape Hatch)

**Also known as:** Clipped content, ellipsis trap, hidden information
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
A table cell, card title, or list item shows text ending in "..." with no way
to see the full content. Hovering does nothing. There is no tooltip, no expand
option, no detail view. The user sees "Payment to Acme Corp for Q3 ser..." and
has no way to determine whether it says "services" or "server maintenance."

**Why developers do it:**
CSS `text-overflow: ellipsis` is a one-line fix for overflow problems. The
developer added it to prevent layout breakage and moved on. Nobody implemented
the companion interaction (tooltip, expand, or link to detail view) because it
was not in the ticket.

**What goes wrong:**
- Users lose access to critical information. In financial applications, truncated
  transaction descriptions prevent users from identifying charges. In project
  management tools, truncated task names cause confusion and duplication.
- Truncation is often applied uniformly regardless of content importance -- a
  user's full name is truncated the same as a decorative subtitle.
- On data tables, truncation compounds with column resizing -- users cannot
  see data AND cannot make columns wider to reveal it.

**The fix:**
Every truncated element needs an escape hatch. The minimum is a `title` attribute
for native browser tooltips. Better: a custom tooltip component that appears on
hover/focus (and on long-press for mobile). Best: a click/tap to expand, a detail
panel, or a resizable column. Also consider whether truncation is appropriate at
all -- if the content is critical, allocate more space for it.

```css
.truncated {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Pair with a title attribute or tooltip component */
```

**Detection rule:**
If an element has `text-overflow: ellipsis` or is programmatically truncated
without a corresponding `title` attribute, tooltip component, or expand
interaction, this is AP-08.

---

### AP-09: The Rigid Grid (Fixed-Width Layouts That Don't Respond)

**Also known as:** Desktop-only layout, breakpoint blindness, 960px forever
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The layout uses fixed pixel widths (`width: 1200px`, `max-width: 960px`) with no
responsive breakpoints. On mobile, the page either requires horizontal scrolling
or is scaled down to illegibly small text. Elements overlap or fall off-screen at
intermediate viewport sizes.

**Why developers do it:**
The design was created for a single desktop resolution. Fixed layouts are faster
to implement -- no media queries, no flexible grids, no testing across devices.
Internal tools are built "for desktop only" even though stakeholders increasingly
access them on tablets and phones.

**What goes wrong:**
- As of 2025, mobile devices account for approximately 60% of global web traffic
  (Statcounter). A desktop-only layout excludes the majority of users.
- Horizontal scrolling on a vertical-scroll page is a severe usability violation.
  Users expect to scroll vertically; horizontal scroll is neither discovered nor
  tolerated (NNGroup research: horizontal scrolling is the #2 most-hated web
  interaction after pop-ups).
- WCAG 1.4.10 (Reflow, Level AA) requires that content reflows at 320 CSS
  pixels wide without horizontal scrolling (except for content that requires
  two-dimensional layout, like data tables).
- Fixed layouts break when users zoom (Ctrl/Cmd +), another accessibility
  requirement (WCAG 1.4.4 Resize Text).

**The fix:**
Use relative units (%, rem, em, vw) instead of fixed pixels for container widths.
Implement a responsive grid system (CSS Grid or Flexbox) with breakpoints at
common thresholds (320px, 768px, 1024px, 1440px). Test at every breakpoint and
at intermediate widths. Use `min-width` and `max-width` rather than `width` for
containers.

**Detection rule:**
If a layout container has a fixed `width` in pixels without responsive
breakpoints (media queries), or if the page requires horizontal scrolling at
any viewport width >= 320px, this is AP-09.

---

### AP-10: The Z-Index Arms Race (Stacking Context Wars)

**Also known as:** z-index: 99999, stacking context chaos, layer wars
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
The codebase contains escalating z-index values: modals at 9999, dropdowns at
10000, tooltips at 99999, and a "critical" notification at 999999. A new feature
adds z-index: 10000000. Elements still appear behind other elements unexpectedly.
Developers "fix" layering issues by incrementing z-index rather than
understanding stacking contexts.

```css
/* The arms race in action */
.dropdown { z-index: 100; }     /* seemed enough at first */
.modal { z-index: 1000; }       /* needed to be above dropdown */
.tooltip { z-index: 10000; }    /* needed to be above modal */
.notification { z-index: 99999; } /* "this MUST be on top" */
.cookie-banner { z-index: 2147483647; } /* the nuclear option */
```

**Why developers do it:**
Z-index feels intuitive: higher number = more on top. When something appears
behind another element, the instinctive fix is to increase the number. The
actual mechanism -- stacking contexts created by properties like `opacity`,
`transform`, `will-change`, and `position` -- is poorly understood. As Philip
Walton documented: "What no one told you about z-index" is that z-index values
only compete within the same stacking context.

**What goes wrong:**
- A modal with z-index: 99999 inside a parent with `transform: translateZ(0)`
  creates a new stacking context. The modal can never appear above siblings of
  that parent, regardless of its z-index value.
- The codebase becomes unmaintainable: developers cannot predict layering without
  reading every z-index in the project. New features routinely break existing
  layering.
- Third-party widgets (chat bubbles, cookie banners, analytics overlays) inject
  their own extreme z-index values, creating conflicts that are nearly impossible
  to resolve.

**The fix:**
Define a z-index scale in design tokens with named layers:

```css
:root {
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-notification: 500;
  --z-tooltip: 600;
}
```

Use the `isolation: isolate` property to create intentional stacking contexts
without arbitrary z-index values. Audit the codebase for unintentional stacking
context creation (`transform`, `opacity < 1`, `filter`, `will-change`).
Document the layer hierarchy. Never use a z-index value that is not from the
defined scale.

**Detection rule:**
If the codebase contains z-index values above 1000, or if more than 3 different
z-index values are used without a defined scale/token system, or if z-index bugs
are recurring, this is AP-10.

---

### AP-11: The Font Carnival (Too Many Fonts and Colors)

**Also known as:** Visual cacophony, design-by-committee, style soup
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
A single page uses 4+ different typefaces, 6+ font sizes with no consistent
scale, and 10+ colors with no discernible palette. Headings alternate between
serif and sans-serif. Body text varies between 13px, 14px, 15px, and 16px
across different sections. Accent colors change from blue to teal to purple
with no pattern.

**Why developers do it:**
Multiple designers contributed without a shared design system. Developers
chose fonts ad hoc when building individual components. Over time, each new
feature introduced "just one more" color or typeface. Nobody audited the
accumulated visual debt.

**What goes wrong:**
- Cognitive load increases: the brain attempts to assign meaning to each visual
  variation (different font = different category?), consuming processing power
  that should go toward understanding content.
- The interface looks unprofessional and undermines user trust. Research from
  the Stanford Web Credibility Project found that visual design is the #1
  factor users cite when evaluating a website's credibility.
- Maintenance becomes expensive: every new component must choose from the
  existing chaos or add to it. Design reviews become style arguments.
- Performance: each additional font family adds 50-200KB of network payload
  and a render-blocking resource.

**The fix:**
Limit to 2 typefaces maximum (one for headings, one for body -- or a single
versatile family). Define a type scale (e.g., 12/14/16/20/24/32/48px) using a
modular ratio. Limit the color palette to: 1 primary, 1 secondary, 1 accent,
plus neutral grays and semantic colors (error red, warning amber, success green,
info blue). Codify these as design tokens. Lint for non-token values.

**Detection rule:**
If a project uses more than 3 font families, more than 7 distinct font sizes
without a systematic scale, or more than 8 non-semantic colors, this is AP-11.

---

### AP-12: The Inconsistent Button Bar (Mismatched Button Styles and Placement)

**Also known as:** Button roulette, CTA confusion, action ambiguity
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Primary actions use filled buttons on some pages and outlined buttons on others.
"Save" is on the right in one form and on the left in another. Destructive
actions (Delete) use the same styling as primary actions (Save). Some buttons
have icons, some do not. Button sizes vary: 32px height here, 40px there, 48px
elsewhere.

**Why developers do it:**
Different developers or teams built different pages. There is no button component
library, or it exists but is not enforced. Each developer implemented buttons to
match the nearest screenshot. Design inconsistency in the mockups propagated into
inconsistency in the product.

**What goes wrong:**
- Users cannot build muscle memory. When "Save" moves from the right side to the
  left side between pages, users hit "Cancel" by reflex. When destructive and
  constructive actions look identical, users delete data by accident.
- Jakob's Law (Nielsen): users spend most of their time on other sites. They
  expect your site to work like the ones they already know. Inconsistency within
  your own product violates even this internal consistency expectation.
- Conversion rate suffers when users hesitate because they cannot identify the
  primary action. If three buttons look equally prominent, none of them is
  prominent.

**The fix:**
Define a button hierarchy in the design system: Primary (filled, high contrast),
Secondary (outlined or toned), Tertiary (text-only), Destructive (red or
clearly differentiated). Standardize placement: primary action on the trailing
side (right in LTR, left in RTL), cancel/secondary on the leading side.
Standardize size at one or two heights (36px compact, 44px default). Enforce
via shared components, not guidelines documents that nobody reads.

**Detection rule:**
If the same logical action (Save, Submit, Confirm) uses different button styles,
sizes, or positions across different screens in the same product, this is AP-12.

---

### AP-13: The Spacing Lottery (Inconsistent Spacing and Alignment)

**Also known as:** Random whitespace, alignment drift, the eyeball grid
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Spacing between elements varies arbitrarily: 8px gap here, 12px there, 17px
elsewhere. Form labels are 4px above their inputs in one section and 10px in
another. Cards in a grid have uneven gutters. Text is sometimes left-aligned,
sometimes centered, within the same content type. Margins and padding use
inconsistent values that follow no scale.

**Why developers do it:**
Developers adjust spacing by visual approximation ("that looks about right")
rather than using a defined spacing scale. Different components are implemented
at different times with slightly different values. The design mockup specified
exact values, but they were transcribed inconsistently.

**What goes wrong:**
- Inconsistent spacing breaks Gestalt grouping principles: users perceive
  elements as related or unrelated based on proximity. Random spacing sends
  false signals about information relationships.
- The interface looks "off" -- users cannot articulate why, but they perceive
  the lack of precision as lower quality. Trust and credibility decrease.
- Maintenance multiplies: every new component requires ad-hoc spacing decisions
  rather than drawing from a system.

**The fix:**
Define a spacing scale based on a base unit (typically 4px or 8px): 0, 4, 8, 12,
16, 24, 32, 48, 64. Use only values from this scale. Implement as CSS custom
properties or utility classes. Align all elements to a consistent baseline grid.
Use Flexbox/Grid gap properties rather than individual margins.

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
}
```

**Detection rule:**
If spacing values in a project include more than 2 values not on a defined scale
(e.g., 13px, 17px, 22px when the scale is multiples of 4), or if the same
component type has different spacing in different instances, this is AP-13.

---

### AP-14: The Silent Sentinel (Disabled Buttons Without Explanation)

**Also known as:** Grayed-out mystery, the mute button, unexplained disabled state
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
A "Submit" button is grayed out and unclickable. The user has filled in what they
believe is all required information, but the button remains disabled. There is no
message explaining what is missing or what condition must be met. The user stares
at the form, trying to guess what is wrong.

**Why developers do it:**
It feels like the "safe" UX choice -- preventing invalid submissions is good,
right? The developer disables the button until validation passes and assumes the
user will figure out what to fix. The validation logic is in JavaScript but the
feedback is not surfaced to the UI.

**What goes wrong:**
- Smashing Magazine's research on disabled buttons found they are one of the most
  frustrating design patterns on the web. Users describe the experience as
  "the system is playing a puzzle game -- something is wrong, but it won't tell
  you what."
- Disabled buttons in HTML cannot receive focus by default, making them invisible
  to screen reader users. A blind user may never know the button exists.
- Users abandon forms rather than guess. This directly reduces conversion rates.
- The problem worsens on mobile where the disabled button may be off-screen at
  the bottom of the page, and the unfilled required field is scrolled out of
  view above.

**The fix:**
Keep the button enabled. When the user clicks it with incomplete/invalid data,
show clear inline error messages next to each problem field. If you must disable
the button, add a visible message below or beside it explaining why ("Please fill
in all required fields" or, better, specifically: "Email address is required").
Use `aria-disabled="true"` instead of the `disabled` attribute so the button
remains focusable and screen readers can announce it along with the explanation.

**Detection rule:**
If a `<button>` has the `disabled` attribute and there is no visible adjacent
text explaining the disabled state, this is AP-14.

---

### AP-15: The Notification Avalanche (Notification and Alert Overload)

**Also known as:** Alert fatigue, notification blindness, cry-wolf syndrome
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The application fires multiple toast notifications, banners, badges, and modal
alerts for routine events. A user logs in and sees: a cookie consent banner, a
"what's new" modal, a promotional banner, 3 badge counts, and a toast about
a background sync completing. SOC dashboards show 3,800+ alerts per day.
Every state change produces a notification.

**Why developers do it:**
Each notification was added by a different team or in a different sprint. Each
one seemed important in isolation. There is no centralized notification strategy
or priority system. Product managers want to "keep users informed" and marketing
wants to "drive engagement."

**What goes wrong:**
- Alert fatigue is a documented phenomenon: when users receive too many
  notifications, they become desensitized and ignore all of them -- including
  critical ones. Industry data shows 25-30% of alerts go uninvestigated due to
  overload.
- Research shows frequent notifications increase cognitive load by 37% and reduce
  task completion efficiency by 28%.
- The "cry wolf" effect means that when a genuinely important alert fires, users
  dismiss it reflexively along with the noise.
- In healthcare IT, alert fatigue is a patient safety concern: clinicians override
  90-96% of drug interaction alerts because the system generates too many
  low-severity warnings (ECRI Institute, Joint Commission reports).
- In engineering, alert fatigue contributed to employee turnover for 62% of
  participants in industry surveys.

**The fix:**
Implement a notification priority system: Critical (requires immediate action),
Warning (should see soon), Info (nice to know), Silent (log only). Limit
simultaneous visible notifications to 1-2. Queue non-critical notifications.
Consolidate related alerts ("3 new comments" instead of 3 separate toasts).
Allow users to configure notification preferences. Never show marketing/promo
content in the same channel as system alerts.

**Detection rule:**
If a user action or page load triggers more than 2 simultaneous visible
notifications, or if the application has no notification priority/severity
system, this is AP-15.

---

### AP-16: The Kitchen Sink Dashboard (Cluttered Information Displays)

**Also known as:** Dashboard maximalism, chart overload, metrics dumping ground
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
A dashboard crams 15+ charts, tables, KPIs, and widgets onto a single screen.
Every metric the system tracks is visible simultaneously. There is no visual
hierarchy -- a trivial "total page views" counter gets the same prominence as
a critical "server error rate" alert. Colors are used inconsistently across
charts. The user must scroll extensively or scan frantically to find the one
number they need.

**Why developers do it:**
Stakeholders request "just add this metric too" iteratively. Nobody curates
or removes metrics. The dashboard evolves by accretion: each sprint adds a
widget, none are removed. Designers think more data equals more value.

**What goes wrong:**
- Cognitive overload: Miller's Law suggests working memory holds 7 +/- 2 items.
  A dashboard with 20 charts exceeds this, causing users to miss critical signals.
- Inconsistent color usage across charts causes misinterpretation. If "revenue"
  is blue in one chart and green in another, users draw false connections.
- Performance degrades: rendering 15+ charts with live data creates noticeable
  lag, especially on lower-powered devices.
- Databox research on dashboard design mistakes found that overcrowding with
  too many visuals, inconsistent color usage, and unclear labeling are the top
  three design errors in analytics dashboards.

**The fix:**
Follow the "5-9 visualizations per dashboard" rule. Create a hierarchy: the
most critical 2-3 KPIs get prominent placement at the top. Secondary metrics
go in a scrollable section below. Tertiary data is available via drill-down
or separate pages. Use consistent color encoding across all charts (if
"revenue" is blue, it is always blue). Provide filters and date ranges
rather than showing everything at once. Run a "red route" analysis: what are
the 3 things users check first? Those go at the top.

**Detection rule:**
If a single dashboard view contains more than 9 distinct data visualizations
without tabs/filters to segment them, or if the same metric uses different
colors across different charts, this is AP-16.

---

### AP-17: The Format Babel (Inconsistent Date, Time, and Number Formats)

**Also known as:** Locale chaos, format roulette, DD/MM vs MM/DD
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
The same application displays dates as "03/07/2026" in one view, "2026-03-07" in
another, "March 7, 2026" in a third, and "7 Mar" in a fourth. Times appear as
"3:00 PM" on some screens and "15:00" on others. Numbers show as "1,234.56" in
one column and "1.234,56" in the next. Currency appears as "$100", "100 USD",
and "100.00" within the same transaction list.

**Why developers do it:**
Different developers format dates and numbers inline using different approaches.
No shared formatting utility exists. Backend APIs return ISO 8601 timestamps
and the frontend formats them inconsistently. When localization is added later,
it is applied to some surfaces but not others.

**What goes wrong:**
- Ambiguous dates cause real errors: "03/07/2026" is March 7 in the US but
  July 3 in Europe. In financial and medical applications, date
  misinterpretation has caused documented incidents.
- LibreOffice Bug #161361 demonstrated that clicking "Apply" multiple times on
  a date field toggled between July 10 and October 7 due to format
  inconsistency.
- Users lose trust when the same number appears different in two places -- it
  suggests the data itself may be unreliable.
- Omitting currency or units is dangerous: "$100" vs "100" vs "100 EUR" creates
  ambiguity that, in financial applications, can mean real monetary losses.

**The fix:**
Create a single formatting utility (e.g., `formatDate()`, `formatCurrency()`,
`formatNumber()`) that every surface uses. Respect the user's locale (from
browser or profile settings). Use the `Intl` API in JavaScript:

```javascript
// One utility, used everywhere
const formatDate = (iso) =>
  new Intl.DateTimeFormat(userLocale, {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(new Date(iso));

const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat(userLocale, {
    style: 'currency', currency
  }).format(amount);
```

Always display currency codes or symbols. Always display units. Store dates in
ISO 8601 internally and format only at the display layer.

**Detection rule:**
If the same type of data (dates, numbers, currency) is formatted differently
across different views or components in the same application, or if raw ISO
timestamps or unformatted numbers appear in the UI, this is AP-17.

---

### AP-18: The Spreadsheet Table (Poor Data Table Design)

**Also known as:** The horizontal scroll nightmare, the unreadable grid, data dump table
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
A data table has 15+ columns, requiring horizontal scrolling on all but the
widest monitors. Column headers scroll out of view. Row data is not aligned
to its header. There is no sticky first column for row identification. On mobile,
the table is either horizontally scrollable (with no indication that more columns
exist) or shrunk to illegibility.

**Why developers do it:**
The backend returns 15 fields, so the frontend displays 15 columns. The
developer used a basic HTML `<table>` or a data grid library with defaults.
Nobody designed the table for the actual viewport sizes users would encounter.
"It works on my 27-inch monitor" is the implicit assumption.

**What goes wrong:**
- Users lose context: when scrolling horizontally, they can no longer see which
  row they are reading (the identifier column scrolled off-screen) or which
  column a value belongs to (the header scrolled off-screen).
- Simultaneous horizontal and vertical scrolling (common on large datasets in
  small viewports) is a severe usability failure.
- NNGroup research on mobile tables found that forcing horizontal scrolling on
  mobile causes users to miss data or give up exploring the table entirely.
- Zebra striping, a common readability aid, is frequently omitted or inconsistent,
  making it hard to track rows across wide tables.

**The fix:**
For wide tables: freeze the first column (row identifier) and allow horizontal
scroll on remaining columns with a visual indicator (gradient, arrow) showing
more content exists. Hide non-essential columns by default; let users choose
which to show. For mobile: transform rows into card views (stack label-value
pairs vertically) or use a responsive pattern that prioritizes the most important
2-3 columns. Always use sticky headers. Add zebra striping for readability.

**Detection rule:**
If a table requires horizontal scrolling at the application's primary viewport
width, or if column headers do not remain visible during vertical scroll, or
if no mobile-specific table rendering exists, this is AP-18.

---

### AP-19: The Unit Phantom (Missing Units, Currency, and Context)

**Also known as:** Naked numbers, ambiguous values, unitless data
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
A dashboard shows "Revenue: 1,234,567" -- is that dollars, euros, yen, cents?
A settings panel shows "Timeout: 30" -- seconds? minutes? milliseconds? A
product listing shows "Weight: 2.5" -- kg? lbs? A form asks for "Amount" with
no currency indicator.

**Why developers do it:**
The developer knows the unit because they wrote the code. The unit is "obvious"
within the engineering context. Adding units to every label feels redundant.
The database stores raw numbers and the UI displays what it receives.

**What goes wrong:**
- The Mars Climate Orbiter was lost in 1999 because one team used metric units
  and another used imperial, and the interface between them did not label units.
  Cost: $327.6 million. Unit ambiguity at the UI level creates the same class
  of misinterpretation at the human level.
- In financial applications, missing currency symbols cause users to transact in
  the wrong currency. In e-commerce, missing weight or dimension units cause
  incorrect purchase decisions and returns.
- In configuration panels, unitless timeouts and thresholds lead to
  misconfiguration: a developer sets "30" thinking seconds, but the system
  interprets milliseconds -- resulting in a 30ms timeout that fails every
  request.

**The fix:**
Always display the unit alongside the number. For currency, use the currency
symbol or ISO 4217 code. For measurements, use the unit abbreviation. For
configuration fields, include the unit in the input's suffix or helper text.
If the unit might be ambiguous, spell it out.

```html
<!-- Anti-pattern -->
<span>Timeout: 30</span>
<span>Revenue: 1,234,567</span>

<!-- Correct -->
<span>Timeout: 30 seconds</span>
<span>Revenue: $1,234,567 USD</span>
```

**Detection rule:**
If a numeric value is displayed without an accompanying unit, currency symbol,
or contextual label that makes the unit unambiguous, this is AP-19.

---

### AP-20: The Superfluous Field (Unnecessary Form Fields)

**Also known as:** Over-collection, the Expedia problem, form bloat
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
A checkout form asks for "Company Name" (optional), "Fax Number," "Middle Name,"
and "How did you hear about us?" before the user can complete a purchase. A
registration form has 12 fields when only email and password are needed. An
optional field is present that no downstream process actually uses.

**Why developers do it:**
"We might need this data later." Product managers request fields "for analytics."
The form was copied from a paper form. Nobody questioned whether each field
actually affects the transaction. Optional fields seem harmless because they
are optional.

**What goes wrong:**
- Expedia discovered that a single optional "Company" field was costing them
  $12 million per year. Users confused "Company" with their bank name, entered
  their bank's address instead of their home address, and credit card
  verification failed. Some users abandoned checkout entirely due to the
  confusion. Removing the field immediately recovered the revenue.
- Baymard Institute research found that the average checkout has 14.88 form
  fields, but the optimal count is 6-8. Every additional field increases
  abandonment by approximately 2%.
- GDPR, CCPA, and similar regulations penalize collection of unnecessary
  personal data. Fields you do not need become compliance liabilities.

**The fix:**
Audit every form field against two criteria: (1) Is this data required to
complete the current transaction? (2) Is there a documented downstream consumer
for this data? If both answers are no, remove the field. If the data is
genuinely optional and useful, move it to a post-completion profile step. Label
remaining optional fields clearly with "(optional)" -- do not use asterisks
for required fields, as this forces users to scan for asterisks on every field.

**Detection rule:**
If a form contains fields marked "optional" with no documented consumer, or if
a form has more than 8 fields for a single transaction (checkout, registration,
contact), this is AP-20.

---

### AP-21: The Content-Length Assumption (Not Designing for Variable Content)

**Also known as:** Happy-path-only layout, best-case design, single-locale layout
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
A card grid looks perfect when every card has a 3-word title and a 2-line
description. But one card has a 15-word title and the grid misaligns -- card
heights differ, text overflows, and the layout looks broken. A navigation
menu works with 5 items but breaks visually when a sixth is added. An empty
state shows a blank white area with no guidance.

**Why developers do it:**
Testing uses representative content, not extreme content. Designers create
mockups with ideal-length strings. Nobody tests: What if this list has 0 items?
1 item? 1,000 items? What if the title is 3 characters? 300 characters? What
if the user's locale is German (text 30% longer) or Chinese (characters that
don't word-wrap the same way)?

**What goes wrong:**
- Zero-item states (empty states) show confusing blank areas instead of helpful
  messages ("No results yet. Create your first project.").
- Single-item states break grid layouts designed for 3+ items.
- Maximum-content states cause overflow, misalignment, and sometimes data loss
  (text clipped without truncation indicator).
- Localization amplifies every content-length bug: German translations are 30%
  longer, Finnish compound words can be extremely long, and Arabic text reflows
  right-to-left.

**The fix:**
Design and test for four content states: empty (0 items), minimal (1 item or
shortest possible content), typical (average content), and extreme (maximum
content, longest translations). Use CSS that handles variability: `min-height`
instead of `height`, `flex-wrap: wrap` for grids, explicit empty states with
illustration and guidance text. Create a content stress-test checklist and
run it before every release.

**Detection rule:**
If a component has no defined empty state, or if testing has only been performed
with "average" content lengths, or if localized builds have not been tested for
layout integrity, this is AP-21.

---

### AP-22: The Ambiguous Form Field (Unclear Labels and Missing Context)

**Also known as:** Guess-what-I-mean inputs, context-free fields, the Expedia label
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
A form field is labeled "Address" without specifying home, billing, or shipping.
A field labeled "Name" does not clarify whether it wants full name, first name,
or username. A date field provides no format hint (MM/DD/YYYY vs DD/MM/YYYY).
An "Amount" field has no currency context. A "Phone" field gives no guidance on
whether to include country code.

**Why developers do it:**
The developer knows what the field means in the context of the backend model.
Labels are pulled from database column names. The brevity of single-word labels
feels clean and space-efficient. Helping text is seen as clutter.

**What goes wrong:**
- The Expedia incident was fundamentally a labeling problem: "Company" was
  ambiguous enough for users to enter their bank name. "Address" was ambiguous
  enough for users to enter their bank's address. Clearer labels ("Your Home
  Address," "Your Company Name (optional)") would have prevented $12 million in
  annual losses.
- In international contexts, "Phone" without format guidance generates a mix of
  formats that break validation and downstream processing.
- Ambiguous date fields cause systematic data errors: half of international users
  enter DD/MM/YYYY when the system expects MM/DD/YYYY, resulting in corrupted
  date data that surfaces months later.

**The fix:**
Use specific, descriptive labels: "Home address," "Billing address," "First
name," "Last name." Add helper text below the field for format or context
guidance: "Enter your home address as it appears on your credit card statement."
For date fields, either use a date picker or show the expected format explicitly.
For international inputs, show the expected format and provide input masking.

**Detection rule:**
If a form label is a single generic word ("Address," "Name," "Phone," "Amount,"
"Date") without qualifying context, helper text, or input formatting, this
is AP-22.

---

## Root Cause Analysis

| Anti-Pattern | Root Cause | Prevention |
|-------------|------------|------------|
| AP-01: Ghost Labels | Aesthetic prioritization over usability | Accessibility audit checklist; WCAG 3.3.2 compliance check |
| AP-02: Invisible Wall | Uncalibrated design environments | Contrast checker in design pipeline; automated a11y testing |
| AP-03: Thumbs Down | Desktop-first development mindset | Mobile-first design; real-device testing protocol |
| AP-04: Monochrome Signal | Over-reliance on color as visual shortcut | WCAG 1.4.1 compliance check; color-blind simulation testing |
| AP-05: Text Avalanche | No content design process | Heading structure requirements; content design review |
| AP-06: Pixel-Perfect Mirage | Static mockup culture | Content stress-test protocol; responsive design tokens |
| AP-07: Mystery Icon | Designer familiarity bias | Icon usability testing; mandatory label policy |
| AP-08: Infinite Truncation | CSS-only overflow fix | Truncation component with built-in tooltip/expand |
| AP-09: Rigid Grid | Desktop-only requirements | Responsive-first implementation; WCAG 1.4.10 compliance |
| AP-10: Z-Index Arms Race | Misunderstanding of stacking contexts | Z-index token scale; CSS architecture guidelines |
| AP-11: Font Carnival | No design system enforcement | Design token linting; limited font/color palette |
| AP-12: Inconsistent Buttons | Decentralized component ownership | Shared button component library; design system |
| AP-13: Spacing Lottery | Ad-hoc spacing decisions | Spacing scale tokens; automated spacing audit |
| AP-14: Silent Sentinel | Misapplied progressive disclosure | Active buttons with inline validation errors |
| AP-15: Notification Avalanche | Feature-team silos adding alerts independently | Centralized notification priority system |
| AP-16: Kitchen Sink Dashboard | Accretion without curation | Dashboard review cadence; information hierarchy |
| AP-17: Format Babel | No shared formatting utility | Centralized Intl-based formatting functions |
| AP-18: Spreadsheet Table | Backend-schema-driven UI | Responsive table component; column prioritization |
| AP-19: Unit Phantom | Developer context assumption | "Always show units" rule; display layer formatting |
| AP-20: Superfluous Field | "Might need it" data hoarding | Field audit against downstream consumers; GDPR review |
| AP-21: Content-Length Assumption | Happy-path-only testing | Four-state content testing (empty/min/typical/max) |
| AP-22: Ambiguous Form Field | Backend model names as UI labels | Descriptive label policy; user-tested field labels |

---

## Self-Check Questions

1. Does every form input have a visible, persistent label that remains when the field has focus and content?
2. Have I checked the contrast ratio of all text against its background using an automated tool -- including text on images, colored backgrounds, and disabled states?
3. Is every interactive element at least 44x44 CSS pixels on touch devices, with at least 8px spacing from adjacent targets?
4. If I remove all color from this screen (convert to grayscale), can a user still understand every status, category, and action?
5. Does this content block have headings, lists, or other visual structure -- or is it an undifferentiated wall of text?
6. What happens to this layout when the content is empty? One word? One hundred words? Translated to German?
7. Can a user identify every icon's function without hovering, tapping, or guessing?
8. If text is truncated anywhere, can the user access the full text through a tooltip, expand action, or detail view?
9. Does this layout work at 320px wide, 768px wide, and 1440px wide? Does it work when the user zooms to 200%?
10. Am I using a defined z-index scale, or am I adding an arbitrary number "to make it appear on top"?
11. Am I using more than 2 font families or more than 8 colors on this page?
12. Is the primary action button visually distinct from secondary and destructive actions, and is it in the same position as on every other page?
13. Does every disabled element explain why it is disabled and what the user must do to enable it?
14. How many notifications does a user see on first load? Is each one necessary and prioritized?
15. Does every numeric value on screen include its unit, currency, or measurement context?

---

## Code Smell Quick Reference

| If you see... | Suspect... | Verify... |
|---------------|-----------|-----------|
| `<input placeholder="...">` with no `<label>` | AP-01: Ghost Labels | Check for `aria-label` or `aria-labelledby`; if absent, fix with visible label |
| Text color close to background color (gray on white, etc.) | AP-02: Invisible Wall | Run contrast checker; must be >= 4.5:1 for normal text |
| Interactive element smaller than 44x44px | AP-03: Thumbs Down | Measure rendered size on mobile viewport; check touch target spacing |
| Status shown only via color (red border, green dot) | AP-04: Monochrome Signal | Verify a second visual cue exists (icon, text, shape) |
| 200+ word block with no `<h2>`-`<h6>`, no lists | AP-05: Text Avalanche | Add heading hierarchy; break into scannable sections |
| Fixed `height`/`width` on text containers | AP-06: Pixel-Perfect Mirage | Test with empty, short, long, and translated content |
| Icon button with no visible text label | AP-07: Mystery Icon | Add visible label; at minimum add `aria-label` |
| `text-overflow: ellipsis` with no `title` or tooltip | AP-08: Infinite Truncation | Add tooltip, expand action, or detail view link |
| `width: 960px` or similar fixed container | AP-09: Rigid Grid | Replace with responsive units (%, vw, max-width) and media queries |
| `z-index` value > 1000 or escalating values | AP-10: Z-Index Arms Race | Implement z-index token scale; check for unintended stacking contexts |
| 3+ `font-family` declarations or 8+ distinct colors | AP-11: Font Carnival | Audit against design tokens; reduce to systematic palette |
| Same action styled differently across pages | AP-12: Inconsistent Buttons | Extract shared button component; standardize hierarchy |
| Spacing values like 13px, 17px, 22px (off-scale) | AP-13: Spacing Lottery | Replace with spacing scale tokens (multiples of 4 or 8) |
| `<button disabled>` with no adjacent explanation | AP-14: Silent Sentinel | Add visible helper text or switch to active button with validation |
| Multiple toast/banner/modal on single user action | AP-15: Notification Avalanche | Implement notification priority queue; limit concurrent alerts |
| Dashboard with 10+ charts on single view | AP-16: Kitchen Sink Dashboard | Prioritize top 5-7 metrics; move rest to drill-down views |
| Same date shown as MM/DD and DD/MM in same app | AP-17: Format Babel | Centralize formatting through shared Intl utility |
| Table with 10+ columns and horizontal scroll | AP-18: Spreadsheet Table | Add frozen columns, responsive card view, column visibility controls |
| Numeric value displayed without unit or currency | AP-19: Unit Phantom | Add unit label, currency symbol, or contextual indicator |
| Form with 10+ fields or unused "optional" fields | AP-20: Superfluous Field | Audit each field for downstream consumer; remove unused fields |
| Component tested only with ideal-length content | AP-21: Content-Length Assumption | Test with empty, min, typical, max, and localized content |
| Field labeled with single generic word ("Address") | AP-22: Ambiguous Form Field | Make label specific ("Home Address"); add helper text |

---

*Researched: 2026-03-08 | Sources: [Nielsen Norman Group - Placeholders in Form Fields Are Harmful](https://www.nngroup.com/articles/form-design-placeholders/), [Nielsen Norman Group - Icon Usability](https://www.nngroup.com/articles/icon-usability/), [Nielsen Norman Group - Hamburger Menus and Hidden Navigation](https://www.nngroup.com/articles/hamburger-menus/), [Smashing Magazine - Frustrating Design Patterns: Disabled Buttons](https://www.smashingmagazine.com/2021/08/frustrating-design-patterns-disabled-buttons/), [Smashing Magazine - Accessible Target Sizes Cheatsheet](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/), [W3C WCAG 2.1 - Understanding SC 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html), [W3C WCAG 2.1 - Understanding SC 1.4.3 Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [W3C WCAG 2.2 - Understanding SC 2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C WCAG 2.1 - Understanding SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html), [WebAIM - Contrast and Color Accessibility](https://webaim.org/articles/contrast/), [Deque - Accessible Forms: The Problem with Placeholders](https://www.deque.com/blog/accessible-forms-the-problem-with-placeholders/), [Philip Walton - What No One Told You About Z-Index](https://philipwalton.com/articles/what-no-one-told-you-about-z-index/), [Josh Comeau - What The Heck, Z-Index](https://www.joshwcomeau.com/css/stacking-contexts/), [Josh Comeau - Chasing the Pixel-Perfect Dream](https://www.joshwcomeau.com/css/pixel-perfection/), [UX Movement - The $12 Million Optional Form Field (Expedia)](https://uxmovement.com/thinking/the-12-million-optional-form-field/), [Databox - Bad Dashboard Examples: 10 Common Mistakes](https://databox.com/bad-dashboard-examples), [IxDF - 7 Bad UI Design Examples](https://ixdf.org/literature/article/bad-ui-design-examples), [CareerFoundry - 10 Examples of Bad UI Design](https://careerfoundry.com/en/blog/ui-design/common-ui-design-mistakes/), [Cursor - Avoiding Anti-Patterns in Forms](https://cursor.co.uk/blog/avoiding-anti-patterns-in-forms), [MagicBell - Alert Fatigue](https://www.magicbell.com/blog/alert-fatigue), [Natalia Cackowska - Cures to Horizontal Scrolling Tables](https://nataliacackowska.com/blog/cures-to-horizontal-scrolling-tables), [ICS - Anti-Patterns of User Experience Design](https://www.ics.com/blog/anti-patterns-user-experience-design), [UI-Patterns - User Interface Anti-Patterns](https://ui-patterns.com/blog/User-Interface-AntiPatterns)*
