# Accessibility in UI/UX Design -- Foundation Module

> Accessibility is a foundational design discipline that ensures digital products are perceivable,
> operable, understandable, and robust for all users -- including those with permanent, temporary,
> and situational disabilities. The scope spans visual design, interaction design, content strategy,
> and cross-platform implementation across web (WCAG 2.2), iOS (Apple HIG), and Android (Material
> Design 3). Accessibility is not a feature to retrofit; it is a quality that must be designed in
> from the first wireframe.

---

## 1. Core Principles

### 1.1 WCAG 2.2 POUR Principles

WCAG 2.2 (W3C Recommendation, October 2023) organizes all success criteria under four principles.
Every design decision must satisfy all four.

**Perceivable -- Users must be able to perceive the information presented.**
- All non-text content has text alternatives (SC 1.1.1).
- Content is adaptable to different presentations without losing meaning (SC 1.3.1-1.3.6).
- Content is distinguishable -- sufficient contrast, resizable text, no information conveyed by
  color alone (SC 1.4.1-1.4.13).

**Operable -- Users must be able to operate the interface.**
- All functionality is available from a keyboard (SC 2.1.1).
- Users have enough time to read and use content (SC 2.2.1-2.2.6).
- Content does not cause seizures or physical reactions (SC 2.3.1-2.3.3).
- Users can navigate, find content, and determine where they are (SC 2.4.1-2.4.13).
- Users can operate through input modalities beyond keyboard (SC 2.5.1-2.5.8).

**Understandable -- Users must be able to understand the information and UI operation.**
- Text content is readable and understandable (SC 3.1.1-3.1.6).
- Pages appear and operate in predictable ways (SC 3.2.1-3.2.6).
- Users are helped to avoid and correct mistakes (SC 3.3.1-3.3.9).

**Robust -- Content must be robust enough for reliable interpretation by assistive technologies.**
- Content is compatible with current and future user agents, including assistive technologies
  (SC 4.1.2-4.1.3). Note: SC 4.1.1 Parsing was removed in WCAG 2.2 as obsolete.

### 1.2 WCAG 2.2 New Success Criteria

WCAG 2.2 added nine new success criteria that directly affect design decisions:

| SC Number | Name | Level | Design Impact |
|-----------|------|-------|---------------|
| 2.4.11 | Focus Not Obscured (Minimum) | AA | Focused element must not be fully hidden by sticky headers, modals, or overlays |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA | Focused element must be fully visible, not partially covered |
| 2.4.13 | Focus Appearance | AAA | Focus indicator must have minimum 2px solid outline with 3:1 contrast between focused and unfocused states |
| 2.5.7 | Dragging Movements | AA | Every drag operation must have a single-pointer alternative (tap, click) |
| 2.5.8 | Target Size (Minimum) | AA | Interactive targets at least 24x24 CSS pixels (with spacing exceptions) |
| 3.2.6 | Consistent Help | A | Help mechanisms (chat, phone, FAQ) appear in same relative position across pages |
| 3.3.7 | Redundant Entry | A | Previously entered data auto-populated or selectable in multi-step flows |
| 3.3.8 | Accessible Authentication (Minimum) | AA | No cognitive function test required for login (memory, transcription, calculation) |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA | No object recognition or personal content identification for login |

### 1.3 Designing for Screen Readers from the Start

Screen reader users navigate interfaces through an auditory document model. Design decisions made
in wireframes directly determine screen reader experience.

**Design-time screen reader considerations:**
- Define heading hierarchy (h1-h6) in wireframes, not just visual size. 67.5% of screen reader
  users navigate by headings as their primary strategy (WebAIM Survey #10, 2024).
- Specify landmark regions in wireframes: header/banner, nav, main, complementary, contentinfo.
- Write alt text intent in design specs -- describe purpose, not appearance. A search icon button
  should read "Search" not "magnifying glass icon."
- Annotate reading order explicitly when visual layout differs from DOM order (e.g., cards with
  prices visually above titles but logically after them).
- Design for announcement patterns: specify what screen readers should say on state changes
  (loading, error, success).
- Label every form field in the design -- floating labels alone are insufficient if they disappear
  on focus.

**Screen reader market share (WebAIM Survey #10, 2024, n=1539):**
- JAWS: 41% primary usage (dominant in North America at 55.5%)
- NVDA: 38% primary usage (dominant in Europe, Asia, Africa)
- VoiceOver (iOS): used by 72.4% of mobile respondents
- TalkBack (Android): used by 27% of mobile respondents
- 72% of respondents use more than one screen reader

### 1.4 Touch Target Sizes

Minimum touch/click target sizes differ by platform but share the principle: large enough to tap
without error, with sufficient spacing to prevent accidental activation.

| Platform | Minimum Size | Recommended Size | Spacing | Source |
|----------|-------------|-----------------|---------|--------|
| iOS | 44x44 pt | 44x44 pt | 8pt between targets | Apple HIG |
| Android | 48x48 dp | 48x48 dp | 8dp between targets | Material Design 3 |
| Web (WCAG AA) | 24x24 CSS px | 44x44 CSS px | Inline targets exempt if text-spaced | WCAG 2.2 SC 2.5.8 |
| Web (WCAG AAA) | 44x44 CSS px | 44x44 CSS px | No spacing exceptions | WCAG 2.2 SC 2.5.5 |

**Design rules:**
- Visual size can be smaller than touch target -- a 24x24dp icon can have 48x48dp tap area via
  padding. Design the tap area, not just the visible element.
- Inline text links are exempt from minimum size requirements under SC 2.5.8 (24x24) as long as
  they are within a sentence or paragraph.
- Close buttons, dismiss icons, and action buttons on notifications must meet minimum target size --
  these are frequently too small in practice.
- Navigation items in bottom tab bars must meet platform minimums without exception.

### 1.5 Color Contrast Ratios

Color contrast is measured as a luminance ratio between foreground and background colors.

| Content Type | Level AA Ratio | Level AAA Ratio | WCAG SC |
|-------------|---------------|----------------|---------|
| Normal text (<18pt / <14pt bold) | 4.5:1 | 7:1 | 1.4.3 / 1.4.6 |
| Large text (>=18pt / >=14pt bold) | 3:1 | 4.5:1 | 1.4.3 / 1.4.6 |
| UI components & graphical objects | 3:1 | N/A | 1.4.11 |
| Focus indicators | 3:1 against adjacent colors | N/A | 2.4.13 |
| Inactive components | Exempt | Exempt | 1.4.3 Note |
| Logos and decorative text | Exempt | Exempt | 1.4.3 Note |

**Design implications:**
- A 4.499:1 ratio does NOT meet the 4.5:1 threshold -- ratios must not be rounded.
- Light gray placeholder text (#999 on #FFF = 2.85:1) fails AA. Use #767676 minimum for white
  backgrounds (4.54:1).
- Brand colors often fail contrast requirements. Establish accessible brand palettes early --
  adjust tints/shades rather than abandoning brand identity.
- Dark mode requires separate contrast verification. White text on dark gray is not automatically
  sufficient.
- Charts, graphs, and data visualizations must meet 3:1 non-text contrast (SC 1.4.11) for
  meaningful graphical objects.

### 1.6 Never Rely on Color Alone

Color must never be the sole means of conveying information, indicating an action, prompting a
response, or distinguishing a visual element (SC 1.4.1).

**Redundant coding strategies:**
- Form errors: red color + error icon + descriptive text ("Password must be at least 8 characters")
- Required fields: red asterisk + "(required)" label text
- Status indicators: colored dot + text label ("Active", "Paused", "Error")
- Charts/graphs: color + pattern fills (hatching, dots, stripes) + direct labels
- Links in text: color + underline (or other non-color distinction like font weight)
- Success/failure states: color + icon (checkmark/X) + text message
- Toggle states: color + position + label ("On"/"Off")

**Who is affected when color is the sole indicator:**
- 8% of males and 0.5% of females have color vision deficiency (approximately 300 million people
  worldwide).
- Monochromacy (total color blindness) affects 1 in 33,000 people.
- Situational: screen glare, night mode, low-brightness settings, printed in grayscale.

### 1.7 Focus Management and Keyboard Navigation

All interactive elements must be reachable and operable with a keyboard alone (SC 2.1.1). Focus
must be visible and logically ordered.

**Design requirements for focus states:**
- Focus indicators must be visible (SC 2.4.7, Level AA).
- Focus indicators should have a minimum 2px solid outline with 3:1 contrast ratio between
  focused and unfocused states (SC 2.4.13, Level AAA -- recommended for all projects).
- Focus order must match visual reading order: left-to-right, top-to-bottom for LTR layouts
  (SC 2.4.3).
- Focused elements must not be fully obscured by sticky headers, cookie banners, or floating
  action buttons (SC 2.4.11, Level AA).

**Design patterns for focus management:**

| Pattern | Focus Behavior | Keyboard Interaction |
|---------|---------------|---------------------|
| Skip link | First focusable element on page; visually hidden until focused | Enter activates, jumps to main content |
| Modal dialog | Focus trapped inside modal; Tab/Shift+Tab cycles through focusable elements | Esc closes modal; focus returns to trigger element |
| Dropdown menu | Focus moves into menu on open; arrow keys navigate items | Esc closes menu; focus returns to trigger |
| Tab panel | One tab in tab order; arrow keys switch between tabs | Tab moves to panel content; arrow keys switch tabs |
| Accordion | Each header is focusable; Enter/Space toggles panel | Focus remains on header after toggle |
| Toast/notification | Not auto-focused (disruptive); announced via aria-live | Dismissible via keyboard if persistent |
| Autocomplete | Input retains focus; arrow keys navigate suggestions | Enter selects; Esc closes list |

**Roving tabindex pattern:**
For composite widgets (tab bars, toolbars, radio groups), only one child element is in the tab
order at a time. Arrow keys move focus between children. This prevents tab-key bloat when a
toolbar has 20 items.

### 1.8 Motion Sensitivity

Animations and motion can cause vestibular disorders, motion sickness, nausea, and seizures.

**WCAG requirements:**
- SC 2.3.1 (Level A): No content flashes more than 3 times per second.
- SC 2.3.3 (Level AAA): Motion animation triggered by interaction can be disabled.
- SC 2.2.2 (Level A): Moving, blinking, or scrolling content that starts automatically and lasts
  more than 5 seconds must have a pause, stop, or hide mechanism.

**Design with prefers-reduced-motion:**
- Default: design with full animations.
- Reduced motion: replace movement-based animations (slide, scale, rotate, parallax) with
  non-movement alternatives (opacity fade, crossfade, color transition).
- Never simply remove all animation when reduced motion is preferred -- transitions that aid
  comprehension (opacity changes, subtle fades) should remain.
- Auto-playing carousels, parallax scrolling, and background video must respect this preference.
- Provide an on-page animation toggle control as a fallback for users who have not set OS-level
  motion preferences.

**Motion alternatives:**

| Full Motion | Reduced Motion Alternative |
|------------|--------------------------|
| Slide-in panel | Opacity fade-in |
| Parallax scrolling | Static background |
| Scale/zoom transition | Crossfade |
| Spinning loader | Pulsing opacity or static progress bar |
| Page transition slide | Instant cut or opacity crossfade |
| Bouncing attention animation | Subtle color highlight |

### 1.9 Cognitive Accessibility

Cognitive accessibility ensures that people with learning disabilities, attention disorders,
memory impairments, and neurodivergent conditions can understand and operate interfaces.

**Plain language principles (W3C Cognitive Accessibility Design Patterns):**
- Use the most common 1500 words of the language where possible.
- Write at a reading level appropriate to the audience (aim for grade 7-8 / age 12-14 for
  general consumer products).
- Use short sentences (15-20 words maximum) and short paragraphs (3-4 sentences).
- Active voice over passive voice: "Enter your email" not "Your email should be entered."
- Literal language over figurative: "Save your work" not "Don't let your progress slip away."

**Consistent patterns:**
- Navigation, help, and search must appear in the same location on every page (SC 3.2.3, 3.2.4,
  3.2.6).
- Interactive elements that look the same must behave the same throughout the product.
- Do not change context on focus or on input without warning (SC 3.2.1, 3.2.2).

**Error prevention and recovery:**
- Identify errors clearly with specific, actionable messages: "Email must include @ symbol" not
  "Invalid input" (SC 3.3.1, 3.3.3).
- Provide error suggestions that tell users how to fix the problem (SC 3.3.3).
- For legal, financial, or data-submission actions: provide confirmation, review, or undo
  capability (SC 3.3.4, 3.3.6).
- Do not require users to re-enter information they already provided in the same process
  (SC 3.3.7, new in WCAG 2.2).

**Memory and attention support:**
- Display password requirements before the input field, not only after an error.
- Show progress indicators in multi-step processes.
- Allow users to save progress and return later.
- Avoid time limits; when unavoidable, provide at least 20 seconds warning and a way to extend
  (SC 2.2.1).

### 1.10 Inclusive Design vs Accessibility

Inclusive design and accessibility are related but distinct concepts.

**Accessibility** focuses on conformance to standards (WCAG, platform guidelines) and ensuring
people with disabilities can use a product. It often addresses specific technical requirements.

**Inclusive design** is a broader methodology that considers the full range of human diversity from
the start of the design process. Microsoft's Inclusive Design Toolkit defines the Persona Spectrum:

| Disability Type | Permanent | Temporary | Situational |
|----------------|-----------|-----------|-------------|
| Visual | Blind, low vision | Eye infection, dilated pupils | Bright sunlight glare |
| Motor | Limb difference, paralysis | Broken arm, RSI | Holding a baby, carrying bags |
| Auditory | Deaf, hard of hearing | Ear infection | Loud environment (concert, factory) |
| Cognitive | Learning disability, autism | Concussion, medication side effects | Sleep deprivation, stress, distraction |
| Speech | Nonverbal | Laryngitis | Heavy accent in foreign context |

**Design implications of the Persona Spectrum:**
- A solution designed for someone with one arm (permanent) also helps someone holding a child
  (situational) -- both benefit from one-handed operation.
- Captions designed for deaf users help someone in a noisy airport (situational).
- High contrast designed for low vision helps someone using a phone in bright sunlight.
- When you design for the extremes of human ability, you create solutions that work better for
  everyone in the middle.

**Important caveat:** Temporary and situational limitations create empathy bridges for understanding
permanent disability, but they do not fully represent the lived experience. Always involve people
with disabilities in design research and testing.

---

## 2. Do's and Don'ts

### 2.1 Do's (Measurable Criteria)

1. **Do meet 4.5:1 contrast ratio for all body text** (SC 1.4.3). Verify with tools such as
   Stark, WebAIM Contrast Checker, or built-in Figma/Sketch plugins against both light and dark
   mode palettes.

2. **Do design focus indicators with minimum 2px solid outline and 3:1 contrast** (SC 2.4.7,
   2.4.13). Specify focus styles explicitly in design system tokens -- never rely on browser
   defaults, which vary across browsers and are often invisible on dark backgrounds.

3. **Do size all interactive targets at minimum 44x44pt (iOS) / 48x48dp (Android) / 24x24px web
   AA / 44x44px web AAA** (SC 2.5.5, 2.5.8). Measure from the tappable/clickable area, not the
   visible icon or text bounds.

4. **Do write alt text for every meaningful image in design specs** (SC 1.1.1). Describe the
   purpose, not the appearance. Mark decorative images explicitly as decorative (alt="").

5. **Do annotate heading levels (h1-h6) in every wireframe and mockup** (SC 1.3.1). Ensure one
   h1 per page, no skipped levels, and heading text that describes the section content.

6. **Do provide text labels alongside icons for primary actions** (SC 1.3.3, 1.4.1). Icons alone
   are ambiguous -- a hamburger menu icon means nothing to someone who has never seen one. At
   minimum, provide a tooltip and an aria-label.

7. **Do design error states with color + icon + descriptive text** (SC 1.4.1, 3.3.1, 3.3.3).
   Error messages must identify the field, explain the error, and suggest a fix: "Email address:
   must include @ and a domain (e.g., name@example.com)."

8. **Do define a logical tab order in prototypes** (SC 2.4.3). Tab order must match visual reading
   order. Document the intended focus sequence for all interactive components.

9. **Do support text resizing up to 200% without content loss or horizontal scrolling** (SC 1.4.4).
   Use relative units (rem, em) in design tokens. Test designs at 200% zoom.

10. **Do design for single-pointer alternatives to all drag interactions** (SC 2.5.7). A sortable
    list must have up/down buttons or a reorder menu as an alternative to drag-and-drop.

11. **Do provide visible labels for all form inputs** (SC 1.3.1, 3.3.2). Placeholder text is NOT
    a label -- it disappears on input and fails contrast requirements in most implementations.

12. **Do specify aria-live regions for dynamic content updates** (loading states, notifications,
    real-time data). Design specs should note "announce to screen readers: 'Results loaded, 24
    items found.'"

13. **Do design skip links as the first focusable element on every page** (SC 2.4.1). Visually
    hidden until focused, then visible. "Skip to main content" is the standard text.

14. **Do support both prefers-reduced-motion and an on-page animation toggle** (SC 2.3.3). Document
    reduced-motion alternatives for every animation in the design system.

15. **Do place help mechanisms (chat, phone, FAQ link) in the same relative position on every
    page** (SC 3.2.6). Design the help component as a global layout element, not a per-page
    placement decision.

### 2.2 Don'ts (With Impact)

1. **Don't use color as the sole means of conveying information** (SC 1.4.1). Impacts: 300 million
   people with color vision deficiency, plus anyone viewing in bright sunlight or grayscale mode.

2. **Don't remove or hide focus indicators** -- never apply `outline: none` without a visible
   replacement (SC 2.4.7). Impacts: all keyboard users, power users who tab through forms, users
   with motor disabilities who rely on switch access.

3. **Don't use placeholder text as the only label for form fields** (SC 1.3.1, 3.3.2). Impacts:
   users with cognitive disabilities (placeholder disappears on input), screen reader users
   (placeholder is not reliably announced as a label), users with low vision (placeholder text
   typically has insufficient contrast).

4. **Don't create keyboard traps** -- ensure users can Tab into and out of every component
   (SC 2.1.2). Exception: modal dialogs intentionally trap focus but must provide Esc to exit.
   Impacts: all keyboard-only users, switch access users, screen reader users.

5. **Don't auto-play audio or video with sound** (SC 1.4.2). Impacts: screen reader users (audio
   overlaps with screen reader speech), users in quiet environments, users with auditory
   processing disorders.

6. **Don't use fixed font sizes (px) for text in web designs** (SC 1.4.4). Impacts: users with
   low vision who need to resize text, users of browser zoom, users with dyslexia who prefer
   larger text.

7. **Don't convey information only through spatial position** ("click the button on the right")
   or sensory characteristics ("the red warning") (SC 1.3.3). Impacts: screen reader users who
   have no spatial context, users with color vision deficiency.

8. **Don't use CAPTCHA as the sole authentication method** (SC 3.3.8). Impacts: users with visual
   disabilities (image CAPTCHA), users with cognitive disabilities (puzzle CAPTCHA), users with
   motor disabilities (drag-and-drop CAPTCHA). Provide alternatives: email/SMS codes, passkeys,
   biometrics.

9. **Don't design interactions that require precise pointer gestures (dragging, multi-point
   touch) without alternatives** (SC 2.5.1, 2.5.7). Impacts: users with motor disabilities,
   users with tremors, users using mouth sticks or head pointers.

10. **Don't use flashing or strobing content exceeding 3 flashes per second** (SC 2.3.1). Impacts:
    users with photosensitive epilepsy (can trigger seizures -- this is a safety issue, not just
    a usability concern).

11. **Don't change context automatically on focus or on input** without prior warning (SC 3.2.1,
    3.2.2). Impacts: screen reader users (unexpected navigation is disorienting), users with
    cognitive disabilities (unexpected changes cause confusion), keyboard users (unintentional
    form submissions).

12. **Don't use vague link text like "click here" or "read more"** (SC 2.4.4). Impacts: screen
    reader users who navigate by links hear a list of "click here, click here, click here."
    Write descriptive link text: "Read the accessibility audit report."

13. **Don't layer content over focused elements** -- sticky headers, cookie banners, and floating
    buttons must not obscure the focused element (SC 2.4.11). Impacts: keyboard users who cannot
    see where their focus is, leading to disorientation and errors.

14. **Don't require users to re-enter information already provided in the same session** (SC 3.3.7).
    Impacts: users with cognitive disabilities (memory burden), users with motor disabilities
    (repeated typing is physically taxing), all users (frustrating UX).

15. **Don't rely solely on hover states to reveal critical information or actions** (SC 1.4.13).
    Impacts: touch screen users (no hover on mobile), keyboard users (hover is mouse-only),
    screen magnification users (hover content may appear outside magnified viewport).

---

## 3. Platform Variations

### 3.1 iOS (Apple Human Interface Guidelines)

**VoiceOver:**
- VoiceOver is the built-in screen reader on all Apple devices. It reads accessibility labels,
  traits, hints, and values.
- Every interactive element must have an `accessibilityLabel` (what it is), appropriate
  `accessibilityTraits` (button, link, header, image), and optionally an `accessibilityHint`
  (what will happen).
- VoiceOver navigation gestures: swipe right/left to move between elements, double-tap to
  activate, two-finger swipe up to read all from top.
- Group related elements using `shouldGroupAccessibilityChildren` to prevent VoiceOver from
  reading each element individually when they form a logical unit (e.g., a card with title,
  subtitle, and action).

**Dynamic Type:**
- iOS Dynamic Type allows users to set preferred text size across all apps. Sizes range from
  xSmall to AX5 (accessibility extra-extra-extra-extra-extra large).
- Design with `UIFont.preferredFont(forTextStyle:)` text styles, not fixed point sizes.
- Set `adjustsFontForContentSizeCategory = true` on all text elements.
- Test designs at the largest Dynamic Type sizes -- layouts must reflow (stacking horizontal
  elements vertically) rather than truncating or overlapping.
- Critical text must never be clipped. Use scrollable containers if necessary at large sizes.

**Reduce Motion:**
- iOS provides a system-wide "Reduce Motion" toggle in Settings > Accessibility > Motion.
- When enabled, apps should replace slide transitions with crossfades, disable parallax effects,
  and stop auto-playing animations.
- Check `UIAccessibility.isReduceMotionEnabled` and observe
  `UIAccessibility.reduceMotionStatusDidChangeNotification`.

**Bold Text:**
- iOS "Bold Text" setting increases font weight system-wide.
- Use system fonts or fonts that include bold weights to automatically respect this preference.

**Design specs for iOS accessibility:**
- Minimum touch target: 44x44 pt (Apple's explicit requirement).
- Contrast: follow WCAG 4.5:1 for normal text, 3:1 for large text.
- Color: never rely on color alone; Apple specifically calls out using shape, text, and position
  alongside color.
- Haptics: provide haptic feedback for confirmations and errors as a non-visual cue.

### 3.2 Android (Material Design 3)

**TalkBack:**
- TalkBack is the primary screen reader on Android. It reads `contentDescription`, role
  descriptions, and state descriptions.
- Every informational icon and interactive element needs a `contentDescription`.
- Decorative images should set `importantForAccessibility="no"`.
- TalkBack navigation: swipe right/left to move between elements, double-tap to activate,
  swipe up then right for local context menu.
- Use `android:accessibilityLiveRegion` for dynamic content updates (equivalent to aria-live).

**Font Scaling:**
- Android allows users to scale fonts from the system settings. Text sizes should use `sp`
  (scale-independent pixels), not `dp`, to respect user preference.
- Test at maximum font scale (typically 200%).
- Layouts should accommodate larger text without truncation or overlap.

**Touch Exploration:**
- TalkBack's touch exploration mode allows users to drag a finger across the screen to hear
  element descriptions. Elements must have clear boundaries and labels.
- Touch target minimum: 48x48 dp with 8dp spacing between targets.
- Visual icon can be smaller (e.g., 24x24dp) as long as the tappable area extends to 48x48dp
  through padding.

**Material Design 3 accessibility specifics:**
- Use Material's built-in accessibility support: M3 components have correct semantics, roles,
  and keyboard support out of the box.
- Color system: M3 dynamic color must still meet contrast ratios when custom theme colors are
  applied. Test all tonal palette combinations.
- Elevation and shadows: do not rely solely on shadow/elevation to distinguish layers -- ensure
  border or color contrast between overlapping surfaces.

### 3.3 Web

**Screen Reader Modes:**
- Screen readers operate in different modes on the web. JAWS and NVDA have "Browse mode"
  (virtual cursor, reads the page) and "Focus/Forms mode" (direct keyboard interaction with
  form controls).
- Mode switching is automatic when focus enters a form field or ARIA widget. Designers must
  ensure that instructions and labels are perceivable in both modes.
- Custom widgets with `role="application"` override browse mode entirely -- use this role only
  when absolutely necessary, as it removes screen reader navigation shortcuts.

**Keyboard Navigation:**
- Tab key moves between focusable elements (links, buttons, inputs, elements with tabindex="0").
- Arrow keys navigate within composite widgets (tabs, menus, radio groups, tree views).
- Enter/Space activate buttons and links. Space scrolls in browse mode -- this causes issues
  when developers use Space as the only activation key for custom buttons.
- Escape closes modals, dropdowns, and tooltips, returning focus to the trigger element.
- Skip links must be the first focusable element, visible on focus.

**:focus-visible:**
- The CSS `:focus-visible` pseudo-class shows focus indicators for keyboard navigation but hides
  them for mouse clicks, solving the aesthetic objection to focus rings.
- Design two focus states: one for `:focus-visible` (keyboard users see it) and one for
  `:focus:not(:focus-visible)` (mouse users do not).
- Minimum recommendation: 2px solid outline with offset, using a color that provides 3:1
  contrast against the adjacent background.

**Semantic HTML priority:**
- Use native HTML elements before ARIA. A `<button>` has built-in keyboard support, role, and
  click handling. A `<div role="button">` requires manual keyboard event handling, tabindex, and
  ARIA states.
- Landmark elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) create the page
  outline screen readers use for navigation.
- Form controls (`<input>`, `<select>`, `<textarea>`) with associated `<label>` elements provide
  accessible names automatically.

### 3.4 Cross-Platform Requirements (Must Be the Same Everywhere)

Regardless of platform, these accessibility behaviors must be consistent:

- **Contrast ratios**: 4.5:1 for normal text, 3:1 for large text and UI components.
- **Text alternatives**: every meaningful image has alt text; every icon button has a label.
- **Keyboard/switch operability**: all functionality reachable without a pointer device.
- **Focus management**: logical focus order, visible focus indicators, no focus traps.
- **Error handling**: specific, actionable error messages with suggestions.
- **Motion respect**: honor OS-level reduced motion preferences.
- **Text scaling**: support at least 200% text enlargement without content loss.
- **Color independence**: never convey information through color alone.
- **Reading order**: programmatic reading order matches logical content order.
- **Consistent navigation**: same navigation structure across the entire product.

---

## 4. Common Mistakes in AI-Generated Designs

AI design tools (Figma AI, Galileo AI, Uizard, v0, and LLM-generated code) consistently produce
interfaces with accessibility deficiencies. Automated testing catches only about 30% of
accessibility issues (Deque research). The remaining 70% require design-level and manual review.

### 4.1 Missing or Inadequate Alt Text

**The problem:** AI either omits alt text entirely, generates purely visual descriptions ("a blue
rectangle with rounded corners"), or produces contextually inaccurate descriptions that confuse
rather than inform.

**How to detect:**
- Automated: axe-core, WAVE, or Lighthouse flag missing alt attributes.
- Manual: review every image in the design spec. Ask "If I could not see this image, what would
  I need to know?" If the answer is "nothing" -- mark as decorative. If the answer describes a
  purpose -- write that purpose as the alt text.

**How to fix:**
- Write alt text that describes purpose, not appearance: "Sales dashboard showing Q3 revenue
  up 12%" not "bar chart with blue and green bars."
- Mark decorative images explicitly (alt="" in HTML, isAccessibilityElement = false on iOS).
- Complex images (charts, diagrams) need both short alt text and a longer text description or
  data table alternative.

### 4.2 Insufficient Color Contrast

**The problem:** AI tools frequently generate aesthetically pleasing but low-contrast color
combinations -- especially light gray text on white backgrounds, pastel palettes, and thin-weight
fonts on colored backgrounds.

**How to detect:**
- Plugin: Stark (Figma/Sketch) scans entire frames for contrast violations.
- Automated: Lighthouse, axe-core, WAVE flag contrast failures against WCAG thresholds.
- Manual: check every text/background combination, including hover states, disabled states,
  error states, and dark mode variants.

**How to fix:**
- Adjust text color to meet 4.5:1 (or 7:1 for AAA).
- Increase font weight -- a heavier weight at the same color can pass where a lighter weight
  fails (large text threshold: 14pt bold / 18pt regular).
- Adjust background color rather than text color to preserve brand palette.
- Verify contrast in all states: default, hover, focus, active, disabled, error, dark mode.

### 4.3 No Keyboard Navigation Support

**The problem:** AI-generated interfaces use `<div>` and `<span>` for interactive elements, omit
tabindex, and provide no keyboard event handlers. Custom components lack focus management.

**How to detect:**
- Manual: unplug your mouse and Tab through the entire interface. Every interactive element must
  be reachable, visually indicated when focused, and activatable with Enter or Space.
- Automated: axe-core detects some issues (missing roles, missing tabindex) but cannot verify
  keyboard operability of custom widgets.

**How to fix:**
- Replace `<div onclick>` with `<button>` or `<a href>` elements.
- Add tabindex="0" to custom interactive elements that must be focusable.
- Implement keyboard event handlers: Enter and Space for activation, Arrow keys for navigation
  within composite widgets, Esc to dismiss.
- Define visible focus styles for every interactive component.

### 4.4 Focus Traps and Missing Focus Management

**The problem:** AI-generated modals, drawers, and popovers do not trap focus (allowing Tab to
reach background content), do not return focus to the trigger element on close, and do not
support Esc to dismiss.

**How to detect:**
- Manual: open the modal, Tab through all elements. Focus should cycle within the modal. Press
  Esc -- the modal should close and focus should return to the button that opened it.
- Check that background content has `inert` attribute or `aria-hidden="true"` when modal is open.

**How to fix:**
- Implement focus trapping: on modal open, move focus to the first focusable element inside the
  modal. On Tab past the last element, cycle to the first. On Shift+Tab past the first, cycle
  to the last.
- On modal close, restore focus to the trigger element.
- Apply `inert` attribute to all background content when modal is open (modern browsers support
  this natively).
- Add Esc key handler to close the modal.

### 4.5 Missing Semantic Structure

**The problem:** AI-generated HTML uses `<div>` soup -- no landmarks, no heading hierarchy, no
list semantics, no form labels. This renders the page meaningless to screen readers.

**How to detect:**
- Browser extension: HeadingsMap shows heading hierarchy. Gaps or wrong levels are immediately
  visible.
- Screen reader: navigate by landmarks (JAWS: semicolon key; NVDA: D key). If no landmarks
  exist, the page has no structure.
- Automated: axe-core flags missing landmarks, skipped heading levels, and unlabeled form
  controls.

**How to fix:**
- Add landmark elements: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
- Establish heading hierarchy: one `<h1>` per page, no skipped levels.
- Use `<ul>`/`<ol>` for lists, `<table>` for tabular data, `<form>` with `<label>` for inputs.
- Label landmarks when there are multiples of the same type: `<nav aria-label="Primary">` and
  `<nav aria-label="Footer">`.

### 4.6 Missing ARIA States and Properties

**The problem:** AI-generated custom widgets (accordions, tabs, menus) lack ARIA roles, states,
and properties. An accordion built from `<div>` elements without `role="button"`,
`aria-expanded`, and `aria-controls` is unusable for screen reader users.

**How to detect:**
- Manual: use a screen reader to interact with every custom widget. If the screen reader does
  not announce the widget type (tab, menu, accordion) and its state (expanded, selected,
  checked), ARIA is missing.
- Automated: axe-core detects missing ARIA roles and properties on some widget patterns.

**How to fix:**
- Follow WAI-ARIA Authoring Practices Guide (APG) patterns for every custom widget.
- Add required roles: `role="tablist"`, `role="tab"`, `role="tabpanel"` for tabs.
- Add required states: `aria-expanded="true|false"` for accordions, `aria-selected="true|false"`
  for tabs, `aria-checked="true|false"` for custom checkboxes.
- Add required properties: `aria-controls`, `aria-labelledby`, `aria-describedby` as needed.

---

## 5. Decision Framework

### 5.1 When AA vs AAA Compliance

| Factor | Target AA | Target AAA |
|--------|----------|-----------|
| Legal requirement | AA is the legal standard (ADA, EAA, Section 508, EN 301 549) | AAA is not legally required but may be contractually required |
| User base | General consumer products | Government services, healthcare, education, accessibility-focused products |
| Budget/timeline | AA is achievable within standard development cycles | AAA adds 15-25% additional design and development effort |
| Contrast | 4.5:1 normal text, 3:1 large text is achievable with most brand palettes | 7:1 normal text may require brand palette adjustments |
| Target size | 24x24px is achievable for most designs | 44x44px may require layout changes for dense UIs |
| Recommended approach | **Always meet AA as a minimum baseline** | Apply AAA selectively: enhanced contrast for body text, enhanced target size for primary actions, focus appearance for all components |

**Practical recommendation:** Design to AA as the non-negotiable baseline. Apply AAA criteria
where the cost is low and the benefit is high -- enhanced contrast (SC 1.4.6), focus appearance
(SC 2.4.13), and enhanced target size (SC 2.5.5) are the highest-value AAA criteria.

### 5.2 When to Add ARIA vs Rely on Semantic HTML

**The first rule of ARIA: if you can use a native HTML element with the semantics and behavior
you need, do so. No ARIA is better than bad ARIA.**

WebAIM's analysis of one million home pages found that pages with ARIA present averaged 41% more
detected accessibility errors than those without ARIA. This is not because ARIA is bad -- it is
because ARIA is frequently misused.

| Scenario | Use Semantic HTML | Use ARIA |
|----------|------------------|---------|
| Button | `<button>` | Only if you cannot use `<button>` (extremely rare) |
| Link | `<a href="...">` | Only for SPA router links that use `<button>` for navigation |
| Navigation | `<nav>` | `<div role="navigation">` only if `<nav>` is not available (never on modern web) |
| Form label | `<label for="id">` | `aria-label` or `aria-labelledby` only when visible label is not possible |
| Dynamic updates | Not applicable | `aria-live="polite"` or `aria-live="assertive"` for content that changes without user action |
| Tab interface | No native element | `role="tablist"`, `role="tab"`, `role="tabpanel"` -- ARIA is required |
| Tree view | No native element | `role="tree"`, `role="treeitem"` -- ARIA is required |
| Combobox/autocomplete | `<input>` + `<datalist>` for simple cases | `role="combobox"` for complex cases with custom dropdowns |
| Modal dialog | `<dialog>` (modern) | `role="dialog"` + `aria-modal="true"` if `<dialog>` cannot be used |
| Expanded/collapsed state | No native attribute | `aria-expanded="true|false"` -- ARIA is required for state |
| Current page in nav | No native attribute | `aria-current="page"` -- ARIA is required |

**Decision heuristic:**
1. Can a native HTML element do this? Use it.
2. Does the native element need additional state information? Add ARIA state attributes.
3. Is there no native element for this pattern? Build a custom widget following WAI-ARIA APG
   patterns with full ARIA roles, states, properties, and keyboard support.
4. Are you adding `role` to override a native element's semantics? Stop -- you are probably
   doing it wrong.

### 5.3 Trade-offs: Visual Aesthetics vs Accessibility

Accessibility and aesthetics are not inherently in conflict. The perception of conflict typically
arises from three sources:

**1. Focus indicators "look ugly"**
- Solution: design custom focus indicators that are both visible (2px, 3:1 contrast) and
  aesthetically integrated. Use `:focus-visible` to show focus rings only for keyboard users.
- Use branded focus colors, offset outlines, or combined outline+box-shadow treatments.
- This is a solved problem -- Stripe, Linear, Vercel, and other design-forward products have
  accessible, attractive focus indicators.

**2. High contrast "limits my palette"**
- Solution: adjust tints and shades, not hues. Most brand colors can achieve 4.5:1 on white
  with a 10-20% darkness adjustment.
- Dark mode often makes high contrast easier, not harder -- light text on dark backgrounds
  naturally provides high ratios.
- Tools: Stark Auto-Contrast, Leonardo (Adobe), Reasonable Colors all generate accessible
  palettes from brand colors.

**3. Larger touch targets "waste space"**
- Solution: touch target size is independent of visual size. An icon can be 24px visually with
  48px of tappable padding. The spacing also improves visual clarity and reduces cognitive load.
- Dense data tables can use 24px (AA minimum) for inline controls while keeping primary actions
  at 44px.

**The business case for accessibility:**
- 1.3 billion people (16% of world population) experience significant disability (WHO, 2023).
- ADA digital accessibility lawsuits increased 37% in 2025.
- The European Accessibility Act (EAA) came into force June 28, 2025, applying to all digital
  products and services sold in the EU.
- Accessible design correlates with improved SEO, better mobile usability, and reduced
  development rework.

---

## Quick Reference Checklist

Use this checklist during design review. Each item references the relevant WCAG 2.2 success
criterion.

### Perceivable

- [ ] All meaningful images have descriptive alt text (SC 1.1.1)
- [ ] Heading hierarchy is defined (h1-h6) with no skipped levels (SC 1.3.1)
- [ ] Information is not conveyed by color alone -- redundant coding used (SC 1.4.1)
- [ ] Text contrast meets 4.5:1 for normal text, 3:1 for large text (SC 1.4.3)
- [ ] UI component and graphical object contrast meets 3:1 (SC 1.4.11)
- [ ] Text is resizable to 200% without loss of content or functionality (SC 1.4.4)
- [ ] Content reflows at 320px viewport width without horizontal scrolling (SC 1.4.10)
- [ ] Hover/focus-triggered content is dismissible, hoverable, and persistent (SC 1.4.13)

### Operable

- [ ] All functionality is operable with keyboard alone (SC 2.1.1)
- [ ] No keyboard traps -- users can navigate away from all components (SC 2.1.2)
- [ ] Skip link is provided as first focusable element (SC 2.4.1)
- [ ] Focus order matches visual layout order (SC 2.4.3)
- [ ] Focus indicator is visible on all interactive elements (SC 2.4.7)
- [ ] Focused elements are not obscured by overlays or sticky elements (SC 2.4.11)
- [ ] Touch targets are at least 24x24 CSS px on web / 44x44pt iOS / 48x48dp Android (SC 2.5.8)
- [ ] Drag operations have single-pointer alternatives (SC 2.5.7)
- [ ] No content flashes more than 3 times per second (SC 2.3.1)
- [ ] Reduced motion preference is honored (SC 2.3.3)

### Understandable

- [ ] Page language is declared (SC 3.1.1)
- [ ] Navigation is consistent across pages (SC 3.2.3)
- [ ] Help mechanisms appear in consistent positions (SC 3.2.6)
- [ ] Error messages identify the field, explain the error, and suggest a fix (SC 3.3.1, 3.3.3)
- [ ] Previously entered data is auto-populated in multi-step flows (SC 3.3.7)
- [ ] Authentication does not require cognitive function tests (SC 3.3.8)

### Robust

- [ ] Custom widgets use appropriate ARIA roles, states, and properties (SC 4.1.2)
- [ ] Dynamic content updates use aria-live regions (SC 4.1.3)

---

## Sources and References

- [WCAG 2.2 W3C Recommendation](https://www.w3.org/TR/WCAG22/)
- [What's New in WCAG 2.2 (W3C WAI)](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Material Design 3: Accessible Design](https://m3.material.io/foundations/accessible-design/overview)
- [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [WAI-ARIA 1.2 Specification](https://www.w3.org/TR/wai-aria-1.2/)
- [Using ARIA (W3C)](https://www.w3.org/TR/using-aria/)
- [WebAIM Screen Reader User Survey #10 (2024)](https://webaim.org/projects/screenreadersurvey10/)
- [WebAIM Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [W3C Cognitive Accessibility Design Patterns](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p01-clear-words/)
- [Microsoft Inclusive Design Toolkit](https://inclusive.microsoft.design/)
- [Understanding SC 1.4.3 Contrast Minimum (W3C)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [CSS prefers-reduced-motion (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- [Principles of Inclusive App Design (WWDC 2025)](https://developer.apple.com/videos/play/wwdc2025/316/)
- [WCAG 2.2 Compliance Checklist (Level Access)](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)
- [AI-Generated UX and Accessibility Debt](https://medium.com/design-bootcamp/ai-generated-ux-and-the-growing-accessibility-debt-how-to-fix-it-8109fda7d9d5)
- [Deque University WCAG 2.2 Updates](https://dequeuniversity.com/resources/wcag-2.2/)
