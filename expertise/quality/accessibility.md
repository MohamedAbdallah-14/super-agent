# Accessibility (a11y) — Expertise Module

> An accessibility specialist ensures that web and mobile applications are perceivable, operable, understandable, and robust for all users, including those with visual, auditory, motor, cognitive, and neurological disabilities. The scope spans semantic markup, assistive technology compatibility, WCAG conformance, automated and manual testing, legal compliance (ADA, EAA, Section 508), and organizational accessibility culture.

---

## Core Patterns & Conventions

### WCAG 2.2 Conformance Levels

WCAG 2.2 (W3C Recommendation, October 2023) defines three conformance levels. Each higher level includes all criteria from the levels below it.

**Level A — Minimum Accessibility (30 criteria)**
Bare-minimum requirements. Failure here means many users are completely blocked.
- SC 1.1.1: Non-text content has text alternatives
- SC 1.3.1: Information and relationships are programmatically determinable
- SC 2.1.1: All functionality available from a keyboard
- SC 2.4.1: Skip repetitive blocks of content (skip links)
- SC 4.1.2: Name, role, value for all UI components

**Level AA — Standard Compliance Target (20 additional criteria)**
The legal standard referenced by ADA case law, Section 508, EAA/EN 301 549, and most organizational policies.
- SC 1.4.3: Contrast ratio at least 4.5:1 for normal text, 3:1 for large text
- SC 1.4.4: Text resizable up to 200% without loss of content
- SC 1.4.11: Non-text contrast — UI components and graphical objects at 3:1 ratio
- SC 2.4.7: Focus indicator is visible
- SC 1.4.13: Content on hover or focus is dismissible, hoverable, persistent

WCAG 2.2 added six Level AA criteria:
- SC 2.4.11: Focus Not Obscured (Minimum) — focused element not fully hidden by other content
- SC 2.4.13: Focus Appearance — visible focus indicator meets minimum area and contrast
- SC 2.5.7: Dragging Movements — single-pointer alternative for every drag operation
- SC 2.5.8: Target Size (Minimum) — interactive targets at least 24x24 CSS pixels
- SC 3.2.6: Consistent Help — help mechanisms appear in same relative order across pages
- SC 3.3.7: Redundant Entry — previously entered data auto-populated or selectable
- SC 3.3.8: Accessible Authentication (Minimum) — no cognitive function test required for login

And three Level AAA criteria:
- SC 2.4.12: Focus Not Obscured (Enhanced) — focused element fully visible
- SC 2.4.13: Focus Appearance — enhanced focus indicator requirements
- SC 3.3.9: Accessible Authentication (Enhanced) — no object or personal content recognition

**Level AAA — Enhanced Accessibility (28 additional criteria)**
Aspirational; not typically required by law. Apply selectively where feasible.
- SC 1.4.6: Enhanced contrast ratio 7:1 for normal text, 4.5:1 for large text
- SC 2.2.3: No timing — no time limits unless essential
- SC 2.5.5: Target Size (Enhanced) — targets at least 44x44 CSS pixels
- SC 1.4.8: Visual presentation preferences (line spacing, width, colors)

### Semantic HTML Patterns

Semantic HTML is the foundation of accessibility. Native elements carry implicit ARIA roles, keyboard behavior, and screen reader announcements without additional code.

**Landmark Regions:**
```html
<header>        <!-- banner landmark -->
<nav>           <!-- navigation landmark -->
<main>          <!-- main landmark (one per page) -->
<aside>         <!-- complementary landmark -->
<footer>        <!-- contentinfo landmark -->
<section>       <!-- region landmark (when labeled) -->
<form>          <!-- form landmark (when labeled) -->
```

**Heading Hierarchy:**
- Use exactly one `<h1>` per page matching the document title
- Never skip heading levels (h1 -> h3 is invalid)
- Headings create a document outline that screen reader users navigate by (JAWS: `H` key, NVDA: `H` key)
- 67.5% of screen reader users navigate by headings as their primary strategy (WebAIM Survey 2024)

**Lists:**
- Use `<ul>` for unordered lists, `<ol>` for ordered lists, `<dl>` for definition/description lists
- Screen readers announce "list, 5 items" — this count gives users orientation
- Navigation menus should use `<nav>` containing `<ul>` with `<li>` items

**Tables:**
- Use `<table>` only for tabular data, never for layout
- Always include `<caption>`, `<thead>`, `<th scope="col|row">`
- Complex tables need `headers` attribute on `<td>` elements referencing `<th>` IDs

### ARIA Patterns

**The Five Rules of ARIA (W3C):**

1. **First Rule**: If you can use a native HTML element with the semantics and behavior you need already built in, do so instead of adding ARIA. No ARIA is better than bad ARIA.
2. **Second Rule**: Do not change native semantics unless absolutely necessary. Do not add `role="heading"` to a `<h2>`.
3. **Third Rule**: All interactive ARIA controls must be operable with a keyboard.
4. **Fourth Rule**: Do not use `role="presentation"` or `aria-hidden="true"` on a focusable element.
5. **Fifth Rule**: All interactive elements must have an accessible name.

**When ARIA IS appropriate:**
- Custom widgets with no native HTML equivalent (tabs, tree views, comboboxes)
- Dynamic content updates (`aria-live` regions)
- Relationships that cannot be expressed in HTML (`aria-controls`, `aria-owns`)
- State communication (`aria-expanded`, `aria-selected`, `aria-pressed`)
- Supplementary descriptions (`aria-describedby`, `aria-description`)

**When ARIA is NOT appropriate:**
- Adding `role="button"` to a `<div>` — use `<button>` instead
- Adding `role="link"` to a `<span>` — use `<a href>` instead
- Adding `aria-label` to a `<div>` with no interactive role — non-interactive elements ignore accessible names in most screen readers
- Using `aria-label` when visible text already serves as the label

**Key statistic**: WebAIM's 2025 Million analysis found that pages WITH ARIA present averaged 41% more detected accessibility errors than those without, because ARIA is frequently misused.

### Keyboard Navigation Patterns

**Tab Order:**
- Interactive elements must follow a logical reading order via the natural DOM sequence
- Never use positive `tabindex` values (`tabindex="1"`, `tabindex="5"`) — they break the natural flow
- `tabindex="0"` adds an element to the tab order; `tabindex="-1"` makes it programmatically focusable but removes it from tab order

**Focus Management:**
- On route/page change in SPAs: move focus to the new page heading or main content area
- After opening a modal: move focus to the first focusable element or the dialog itself
- After closing a modal: return focus to the triggering element
- After deleting an item from a list: move focus to the next item or the list container
- After expanding a disclosure: keep focus on the trigger button

**Skip Links:**
- First focusable element on the page: `<a href="#main-content" class="skip-link">Skip to main content</a>`
- Should become visible on focus for sighted keyboard users
- Required by SC 2.4.1 (Level A) — bypassing blocks of repeated content

**Focus Indicators:**
- Default browser outline must NOT be removed without a visible replacement (SC 2.4.7, Level AA)
- WCAG 2.2 SC 2.4.13 requires: focus indicator area >= 2px perimeter, 3:1 contrast ratio against adjacent colors
- CSS: `outline: 2px solid #005fcc; outline-offset: 2px;` is a safe baseline

### Color Contrast Requirements

| Element Type | Minimum Ratio (AA) | Enhanced Ratio (AAA) | WCAG SC |
|---|---|---|---|
| Normal text (<18pt / <14pt bold) | 4.5:1 | 7:1 | 1.4.3 / 1.4.6 |
| Large text (>=18pt / >=14pt bold) | 3:1 | 4.5:1 | 1.4.3 / 1.4.6 |
| UI components & graphical objects | 3:1 | N/A | 1.4.11 |
| Focus indicators | 3:1 | N/A | 2.4.13 |

- Never use color alone to convey information (SC 1.4.1, Level A) — add text, patterns, or icons
- Test with browser tools: Chrome DevTools contrast checker, Firefox Accessibility Inspector
- Tools: WebAIM Contrast Checker, Polypane, Stark (Figma plugin)

### Form Accessibility

**Labels:**
- Every form input MUST have a programmatically associated label via `<label for="id">` or wrapping `<label>` element
- Use `aria-labelledby` for complex labels composed from multiple text sources
- Placeholder text is NOT a substitute for a label — it disappears on input, fails contrast in most browsers, and is not consistently announced by screen readers

**Error Messages:**
- Connect errors to inputs with `aria-describedby` pointing to the error element
- Set `aria-invalid="true"` on the invalid field
- Use `aria-live="assertive"` or `role="alert"` on error containers for immediate announcement
- Group related fields with `<fieldset>` and `<legend>` (radio buttons, checkboxes, address groups)
- On form submission errors, either move focus to the first invalid field or display an error summary at the top with links to each invalid field

**Required Fields:**
- Mark required fields with `aria-required="true"` or HTML `required` attribute
- Indicate required fields visually (asterisk with legend explaining meaning) — not color alone

### Mobile Accessibility

**Touch Target Size:**
- WCAG 2.2 SC 2.5.8 (Level AA): minimum 24x24 CSS pixels
- WCAG 2.2 SC 2.5.5 (Level AAA): minimum 44x44 CSS pixels
- Apple HIG: minimum 44x44 pt — matches AAA
- Material Design (Android): minimum 48x48 dp
- Spacing between targets counts: adequate spacing can compensate for smaller targets

**Gesture Alternatives (SC 2.5.1, Level A):**
- Every multipoint or path-based gesture (pinch, swipe, drag) must have a single-pointer alternative
- Example: swipe-to-delete must also offer a delete button
- Example: pinch-to-zoom must also offer zoom +/- buttons
- Drag-and-drop (SC 2.5.7, Level AA) must provide an alternative single-point mechanism

**Screen Reader Behavior on Mobile:**
- VoiceOver (iOS): swipe left/right to navigate elements, double-tap to activate
- TalkBack (Android): swipe left/right to navigate, double-tap to activate
- Both override standard touch gestures when enabled — custom gestures must not conflict
- Test with both screen readers on real devices, not just simulators

**Orientation:** Do not restrict content to a single orientation (SC 1.3.4, Level AA) unless essential (e.g., a piano app).

### Dynamic Content

**Live Regions:**
- `aria-live="polite"` — announces after current speech finishes (status updates, new messages)
- `aria-live="assertive"` — interrupts current speech (errors, urgent alerts)
- `role="status"` — implicit `aria-live="polite"` (search result counts, progress)
- `role="alert"` — implicit `aria-live="assertive"` (form errors, time warnings)
- Live regions must exist in the DOM before content is injected — dynamically adding `aria-live` is unreliable in many screen readers
- Keep announcements concise — screen readers read the entire live region content on each change

**SPA Route Changes:**
- Manage focus on navigation: move focus to `<h1>` or `<main>` of the new view
- Update `document.title` to reflect the current view
- Announce navigation programmatically via a visually hidden live region
- React: use `@reach/router` or React Router v6+ with focus management; or implement a custom `useAnnounce` hook
- Angular: `@angular/cdk/a11y` `LiveAnnouncer` service
- Vue: `vue-announcer` or custom composable

**Loading States:**
- Use `aria-busy="true"` on the container being updated; screen readers will wait to re-read it
- Announce loading start and completion via a live region
- Provide a loading indicator that is visible AND announced to screen readers
- Avoid removing content from the DOM during loading — keep a placeholder

### Media Accessibility

**Video:**
- Captions (SC 1.2.2, Level A) — synchronized text for speech and meaningful sounds
- Audio descriptions (SC 1.2.3, Level A for prerecorded; SC 1.2.5, Level AA) — narration of visual-only content
- Transcript (SC 1.2.1, Level A for audio-only) — full text alternative

**Audio:**
- Transcript is required for prerecorded audio (SC 1.2.1, Level A)
- Auto-playing audio that lasts >3 seconds must have a mechanism to pause/stop/mute (SC 1.4.2, Level A)

**Images:**
- Informative images: `alt` text describing content and purpose
- Decorative images: `alt=""` (empty alt) or CSS background-image
- Complex images (charts, diagrams): brief `alt` + long description via `aria-describedby` or linked page
- Images of text: avoid when possible (SC 1.4.5, Level AA) — use real text styled with CSS

---

## Anti-Patterns & Pitfalls

### 1. Missing or Inadequate Alt Text
**Problem**: Images without `alt` attributes cause screen readers to read the filename ("DSC_0042.jpg") or URL.
**Who it impacts**: Blind and low-vision users relying on screen readers.
**Fix**: Every `<img>` needs `alt`. Decorative images get `alt=""`. Informative images get concise, descriptive text.
**Prevalence**: Found on 55.5% of homepages (WebAIM Million 2025).

### 2. Low Color Contrast
**Problem**: Text that does not meet 4.5:1 (normal) or 3:1 (large) contrast ratios is unreadable in many conditions.
**Who it impacts**: Low-vision users, colorblind users, anyone in bright sunlight or on low-quality displays.
**Fix**: Test all text and UI component colors against WCAG contrast ratios.
**Prevalence**: Found on 79% of homepages — the most common WCAG failure (WebAIM Million 2025).

### 3. Missing Form Labels
**Problem**: Form inputs without programmatic labels leave screen reader users guessing what to enter.
**Who it impacts**: Blind users, voice control users (who activate fields by label name).
**Fix**: Use `<label for="id">` or wrap inputs in `<label>`. Never rely on placeholder alone.
**Prevalence**: 34.2% of form inputs lack proper labels (WebAIM Million 2025).

### 4. Empty Links and Buttons
**Problem**: Links or buttons with no text content (`<a href="..."><i class="icon-arrow"></i></a>`) have no accessible name.
**Who it impacts**: Screen reader users hear "link" or "button" with no description; voice control users cannot target them.
**Fix**: Add visually hidden text, `aria-label`, or meaningful text content inside the element.

### 5. Removing Focus Outlines Without Replacement
**Problem**: `outline: none` or `outline: 0` in CSS removes the only indicator keyboard users have to know which element is focused.
**Who it impacts**: Keyboard-only users, motor-impaired users who cannot use a mouse.
**Fix**: Replace the default outline with a custom, high-contrast focus indicator. Never use `:focus { outline: none }` without a `:focus-visible` alternative.

### 6. Div and Span Buttons
**Problem**: Using `<div onclick="...">` instead of `<button>` strips keyboard accessibility (`Enter`/`Space` activation), screen reader role announcements, and focus management.
**Who it impacts**: Keyboard users, screen reader users, voice control users.
**Fix**: Use native `<button>` or `<a href>`. If custom elements are unavoidable, add `role="button"`, `tabindex="0"`, and `keydown` handlers for `Enter` and `Space`.

### 7. Misusing ARIA (No ARIA Is Better Than Bad ARIA)
**Problem**: Adding ARIA roles, states, or properties incorrectly creates a worse experience than no ARIA at all — conflicting roles, invalid states, or missing required attributes.
**Who it impacts**: Screen reader users who receive incorrect or contradictory information.
**Fix**: Prefer native HTML. When ARIA is necessary, follow the WAI-ARIA Authoring Practices Guide (APG) patterns exactly.

### 8. Auto-Playing Media
**Problem**: Audio or video that plays automatically distracts users, interferes with screen readers, and triggers vestibular disorders.
**Who it impacts**: Screen reader users (audio overlaps speech output), users with attention disorders, vestibular disorder sufferers.
**Fix**: Never auto-play media with sound. If auto-play is essential, provide pause/stop/mute within 3 seconds (SC 1.4.2).

### 9. Missing Document Language
**Problem**: Without `<html lang="en">`, screen readers may use the wrong pronunciation engine, making content unintelligible.
**Who it impacts**: Screen reader users, especially multilingual users.
**Fix**: Always set the `lang` attribute on `<html>`. Use `lang` attribute on inline elements for foreign-language phrases.
**Prevalence**: Found on 17.1% of homepages (WebAIM Million 2025).

### 10. Keyboard Traps
**Problem**: Custom widgets (modals, date pickers, rich text editors) that capture focus and provide no keyboard escape mechanism.
**Who it impacts**: Keyboard-only users who are literally trapped and cannot interact with the rest of the page.
**Fix**: Ensure `Escape` closes overlays. Tab cycling within modals must be intentional with a clear exit. Test every custom widget with keyboard alone (SC 2.1.2, Level A).

### 11. Motion and Animation Without Reduced-Motion Support
**Problem**: Parallax scrolling, sliding transitions, and spinning animations trigger vestibular disorders (dizziness, nausea, migraine).
**Who it impacts**: Users with vestibular disorders, epilepsy, migraine, and ADHD.
**Fix**: Respect `prefers-reduced-motion: reduce` — provide static alternatives. Use fade/dissolve instead of slide/zoom.

### 12. Inaccessible CAPTCHAs
**Problem**: Image-based CAPTCHAs block blind users; audio CAPTCHAs block deaf users; puzzle CAPTCHAs block motor-impaired users; cognitive CAPTCHAs block users with learning disabilities.
**Who it impacts**: Nearly every disability category.
**Fix**: Use invisible/behavioral CAPTCHAs (Cloudflare Turnstile, proof-of-work solutions like ALTCHA), or provide multiple CAPTCHA types. SC 3.3.8 (WCAG 2.2) prohibits cognitive function tests for authentication.

### 13. Using `tabindex` Values Greater Than Zero
**Problem**: Positive `tabindex` values (`tabindex="1"`, `tabindex="99"`) override the natural DOM order, creating unpredictable tab sequences that confuse keyboard users.
**Who it impacts**: Keyboard-only users, screen reader users.
**Fix**: Use only `tabindex="0"` (add to tab order) and `tabindex="-1"` (programmatic focus only). Fix tab order by fixing DOM order.

### 14. Tooltips Without Keyboard Access
**Problem**: Tooltips that appear only on hover are invisible to keyboard users and often not announced by screen readers.
**Who it impacts**: Keyboard users, screen reader users, touch device users.
**Fix**: Show tooltips on both hover AND focus. Use `aria-describedby` to associate tooltip content. Ensure tooltips are dismissible with `Escape` and hoverable (SC 1.4.13, Level AA).

### 15. Relying Solely on Automated Testing
**Problem**: Automated tools catch only 30-40% of WCAG issues. They cannot evaluate content quality of alt text, logical reading order, or screen reader experience.
**Who it impacts**: All users with disabilities — issues that automated tools miss are often the most impactful.
**Fix**: Use automated tools as a baseline, then supplement with manual keyboard testing, screen reader testing, and testing with disabled users.

---

## Testing Strategy

### Automated Testing Tools

| Tool | Type | Coverage | Best For |
|---|---|---|---|
| axe-core (Deque) | Library | ~57 WCAG rules | CI/CD integration, component tests |
| Lighthouse | Browser tool | Subset of axe rules | Quick audits, performance + a11y |
| WAVE | Browser extension | Visual overlay | Designer/developer quick checks |
| Pa11y | CLI/CI | HTML CodeSniffer rules | CI pipeline, batch scanning |
| IBM Equal Access | Browser + CI | IBM a11y rules | Enterprise environments |
| Stark | Design plugin | Contrast, vision sim | Figma/Sketch design phase |

**Limitations**: Automated tools detect ~30-40% of WCAG violations. They excel at: missing alt text, contrast ratios, missing labels, invalid ARIA. They cannot evaluate: alt text quality, logical reading order, meaningful link text, focus management correctness, or real screen reader experience.

### Manual Testing Checklist

**Keyboard Testing (do this first, every time):**
1. Unplug the mouse or disable the trackpad
2. Tab through the entire page — is every interactive element reachable?
3. Is the focus indicator always visible?
4. Can you activate buttons with `Enter` and `Space`?
5. Can you follow links with `Enter`?
6. Can you close modals/popovers with `Escape`?
7. Does tab order match visual order?
8. Are you ever trapped without an exit?

**Zoom Testing:**
1. Zoom to 200% — is all content still visible and functional?
2. Zoom to 400% — does content reflow to a single column (no horizontal scroll)?
3. Set browser font size to "Very Large" — does the layout accommodate?

**Color and Visual Testing:**
1. Enable Windows High Contrast Mode or macOS Increase Contrast
2. View the page in grayscale — is information conveyed without color?
3. Check all text and UI components against contrast requirements

**Content and Structure:**
1. Disable CSS — is the content readable in DOM order?
2. Check heading hierarchy with a browser extension (HeadingsMap, WAVE)
3. Verify all images have appropriate alt text (not just `alt` present)
4. Check all links have descriptive text (not "click here" or "read more")

### Screen Reader Testing

**Recommended Minimum Coverage:**
1. NVDA + Firefox (Windows) — free, most popular (40.5% market share, WebAIM 2024)
2. VoiceOver + Safari (macOS/iOS) — built-in, dominant on Apple platforms
3. TalkBack + Chrome (Android) — built-in, covers mobile Android

**Comprehensive Coverage (add to minimum):**
4. JAWS + Chrome (Windows) — enterprise standard (40.1% market share)
5. Narrator + Edge (Windows) — growing usage with Windows

**What to Test With Screen Readers:**
- Navigate by headings, landmarks, links, form fields
- Verify all images have meaningful announcements
- Complete forms end-to-end, including error recovery
- Test dynamic content updates (live regions, AJAX)
- Navigate data tables (row/column headers announced correctly)
- Test custom widgets (tabs, accordions, menus, dialogs)

### CI Integration

**axe-core with Playwright (recommended):**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**jest-axe for Component Tests:**
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('form is accessible', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**CI Pipeline Strategy:**
- Run axe on every PR for critical pages (block on violations)
- Run full-site scans nightly (report, do not block)
- Generate JSON/HTML reports for tracking trends over time
- Set a violation budget: zero new violations per PR, reduce existing count by sprint

### Accessibility Auditing Methodology

1. **Automated scan** — establish baseline with axe-core or Lighthouse
2. **Keyboard walkthrough** — navigate the entire application without a mouse
3. **Screen reader walkthrough** — complete core user journeys with NVDA or VoiceOver
4. **WCAG criterion-by-criterion** — systematic check against each applicable SC
5. **Assistive technology matrix** — test with multiple AT combinations
6. **Cognitive walkthrough** — evaluate for users with cognitive disabilities (clear language, consistent navigation, error prevention)
7. **Document findings** — severity (critical/major/minor), impacted SC, impacted users, remediation guidance

### User Testing With People With Disabilities

- Recruit participants with diverse disabilities: blind, low-vision, deaf, motor-impaired, cognitive
- Use task-based testing: "Complete a purchase" rather than "Navigate the site"
- Participants use their own assistive technology and settings
- Observe without intervening — note where they struggle, not just where they fail
- Pay participants fairly for their expertise and time
- Conduct testing early and iteratively, not just before launch

---

## Performance Considerations

### Reduced Motion Preferences

```css
/* Default: include animations */
.card { transition: transform 0.3s ease; }
.card:hover { transform: scale(1.05); }

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
    transform: none;
  }
  .card:hover {
    opacity: 0.9; /* subtle non-motion alternative */
  }
}
```

**JavaScript check:**
```javascript
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  // Use instant transitions or fade-only effects
}
```

Affects: vestibular disorder sufferers, epilepsy (SC 2.3.1 — no more than 3 flashes per second), migraine, ADHD. Also benefits battery life and low-end device performance.

### Loading States for Assistive Technology

- Mark loading containers with `aria-busy="true"` — screen readers defer re-reading until `aria-busy="false"`
- Announce loading state transitions via live region: "Loading results..." -> "5 results loaded"
- Skeleton screens should be hidden from screen readers (`aria-hidden="true"`) with a live-region announcement instead
- Never remove content from the DOM during loading — screen reader users lose their place

### Large DOM and Screen Reader Performance

- Screen readers build a virtual buffer/accessibility tree of the entire page — very large DOMs (>10,000 nodes) cause significant lag
- Virtualized lists (react-window, TanStack Virtual) improve performance but MUST maintain accessibility: `aria-setsize`, `aria-posinset` for each item, and `role="listbox"` or `role="grid"` on the container
- Lazy-loaded content must announce its arrival via live regions
- Infinite scroll must provide an alternative mechanism (pagination, "Load more" button) — keyboard users and screen reader users cannot reliably reach footer content with infinite scroll

### Performance vs Accessibility Tradeoffs

- Image lazy loading (`loading="lazy"`) is accessible — screen readers read the `alt` text regardless
- Code splitting does not inherently harm accessibility — but focus must be managed when new content renders
- Web fonts with `font-display: swap` can cause layout shift affecting screen magnifier users — use `font-display: optional` when possible
- Heavy client-side rendering delays screen reader access — use SSR/SSG for critical content

---

## Security Considerations

### CAPTCHAs and Accessibility

Traditional CAPTCHAs create an inherent conflict: making them machine-readable for assistive technology also makes them vulnerable to bots. WCAG 2.2 SC 3.3.8 (Accessible Authentication) prohibits cognitive function tests for authentication unless an alternative is provided.

**Accessible alternatives:**
- Cloudflare Turnstile — invisible behavioral analysis, no user interaction
- ALTCHA — proof-of-work, WCAG 2.2 AA compliant
- Honeypot fields — invisible to users, visible to bots
- Rate limiting + behavioral analysis — server-side bot detection
- Passkeys/WebAuthn — biometric authentication, inherently accessible

### Authentication Accessibility

- Login forms must have proper labels and be keyboard-accessible
- Multi-factor authentication must not rely solely on one sensory channel (e.g., visual-only QR codes need a text alternative)
- Password requirements must be clearly stated before submission, not just on error
- "Show password" toggle aids cognitive disability users — announce state change to screen readers
- Magic links and passkeys are more accessible than password + CAPTCHA flows

### Session Timeouts

- SC 2.2.1 (Level A): Users must be warned before timeout and given the option to extend
- Warning must appear at least 20 seconds before expiration
- User must be able to extend the session at least 10 times
- Save form data so it is not lost on timeout
- Exception: timeouts shorter than 20 hours for security are permissible if the user is warned

### Error Message Security vs Accessibility

- Tension: security best practice says "don't reveal whether an account exists" but accessibility says "be specific about errors"
- Balance: "The email or password is incorrect" is both secure and understandable
- Avoid: "Error 403" or "Invalid credentials" (too vague for cognitive disability users)
- Error messages must be programmatically associated with the relevant form field via `aria-describedby`
- Error messages must not disappear automatically — users with cognitive disabilities need time to read them

---

## Integration Patterns

### Component Library Accessibility

**Radix UI (React):**
- Unstyled primitives with full ARIA support, keyboard navigation, and focus management built in
- 28+ components (Dialog, Popover, Tabs, Select, etc.) following WAI-ARIA APG patterns
- Composable architecture — bring your own styles without breaking accessibility
- Used as the foundation for shadcn/ui

**React Aria (Adobe):**
- Behavior hooks that handle ARIA attributes, keyboard interactions, focus management, and internationalization
- Hooks-based architecture: `useButton`, `useDialog`, `useComboBox`, `useTable`
- Most comprehensive accessibility coverage of any component library
- Best choice when accessibility is the top priority

**Headless UI (Tailwind Labs):**
- React and Vue support with Tailwind CSS integration
- Fewer components than Radix but high-quality implementations
- Menu, Listbox, Combobox, Switch, Tabs, Dialog, Disclosure, Popover, Radio Group, Transition

**Selection guidance**: If you need a component that exists in these libraries, use it rather than building a custom one. The accessibility engineering in these libraries represents thousands of hours of testing.

### Design System Accessibility Tokens

Design systems should encode accessibility requirements in tokens:
```css
:root {
  /* Contrast-safe color pairs */
  --color-text-primary: #1a1a2e;      /* 15.4:1 on white */
  --color-text-secondary: #4a4a6a;    /* 7.2:1 on white */
  --color-text-on-primary: #ffffff;   /* 4.6:1 on brand blue */

  /* Focus indicators */
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-color: #005fcc;

  /* Touch targets */
  --target-size-minimum: 24px;  /* WCAG AA */
  --target-size-comfortable: 44px;  /* WCAG AAA / Apple HIG */
  --target-size-android: 48px;  /* Material Design */

  /* Spacing for target separation */
  --target-spacing-minimum: 8px;

  /* Typography minimums */
  --font-size-minimum: 16px;  /* prevents iOS zoom on focus */
}
```

### CMS Accessibility Requirements

- WYSIWYG editors must produce semantic HTML (headings, lists, tables — not just styled divs)
- Image upload must require alt text (make it mandatory in the CMS)
- Link creation must prompt for descriptive link text
- Content preview should include accessibility warnings (missing alt, heading skips)
- Provide accessibility guidance inline for content editors

### PDF Accessibility

- Start from an accessible source document (Word, InDesign) with proper heading structure
- Tag the PDF with correct reading order, headings, lists, tables, and alt text
- Set the document title and language in PDF metadata
- Ensure form fields are labeled and tab order is correct
- Conform to PDF/UA (ISO 14289-1) standard
- Test with PAC (PDF Accessibility Checker) and screen readers

### Email Accessibility

- Use semantic HTML tables for layout (email clients have limited CSS support)
- Include `role="presentation"` on layout tables
- Use `alt` text on all images — many email clients block images by default
- Set `lang` attribute on the `<html>` element
- Use sufficient contrast (4.5:1 for text)
- Keep subject lines clear and descriptive
- Provide a plain-text alternative for every HTML email
- Test with Litmus or Email on Acid accessibility features

---

## DevOps & Deployment

### Accessibility CI/CD Gates

```yaml
# GitHub Actions example
accessibility-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run build && npm run start &
    - name: Run accessibility tests
      run: npx playwright test --project=accessibility
    - name: Upload a11y report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: accessibility-report
        path: test-results/accessibility/
```

**Gate strategy:**
- PR gate: zero new axe violations on changed pages (block merge)
- Nightly gate: full-site scan with trend tracking (alert on regression)
- Release gate: manual screen reader audit sign-off for major releases

### Automated Accessibility Reporting

- Generate axe-core JSON reports and convert to HTML dashboards
- Track violation counts per page, per category, per severity over time
- Integrate with project management (create Jira/Linear tickets for violations)
- Use Pa11y Dashboard or Accessibility Insights for ongoing monitoring

### Accessibility Monitoring in Production

- Synthetic monitoring: scheduled axe scans against production URLs
- Real User Monitoring (RUM): track keyboard usage patterns, zoom levels, reduced-motion preferences, screen reader detection (with user consent)
- Error tracking: monitor for JavaScript errors that could break AT compatibility
- Performance monitoring: track Time to Interactive — slow pages disproportionately affect AT users

### Legal Compliance Tracking

| Law | Jurisdiction | Standard | Deadline | Penalty |
|---|---|---|---|---|
| ADA Title III | USA (private) | WCAG 2.1 AA (case law) | Ongoing | Lawsuits, settlements ($10K-$500K+) |
| ADA Title II | USA (government) | WCAG 2.1 AA | 2026 | Federal enforcement |
| Section 508 | USA (federal) | WCAG 2.0 AA (EN 301 549) | Ongoing | Contract loss, complaints |
| EAA | EU | EN 301 549 (WCAG 2.1 AA) | June 2025 | Up to 500K EUR per member state |
| AODA | Ontario, Canada | WCAG 2.0 AA | Ongoing | Up to $100K CAD/day |
| DDA | UK | WCAG 2.1 AA (guidance) | Ongoing | Litigation, enforcement |

Track compliance status per product/property. Maintain a VPAT (Voluntary Product Accessibility Template) or ACR (Accessibility Conformance Report) for enterprise sales.

---

## Decision Trees

### Which WCAG Level to Target?

```
Is your product used by a government agency?
|-- Yes --> Target AA minimum (Section 508 / EAA mandate)
|           Consider AAA for specific criteria (target size, contrast)
|-- No
    |-- Do you sell to enterprise / government?
    |   |-- Yes --> Target AA (required for procurement)
    |   |-- No
    |       |-- Do you operate in the EU or have EU customers?
    |       |   |-- Yes --> Target AA (EAA compliance, June 2025)
    |       |   |-- No
    |       |       |-- Is accessibility part of your brand values?
    |       |       |   |-- Yes --> Target AA, adopt select AAA criteria
    |       |       |   |-- No --> Target AA anyway
    |       |       |         (ADA litigation risk + it is the right thing)

Bottom line: Target WCAG 2.2 AA. Always.
```

### Custom Component vs Native HTML Element?

```
Does a native HTML element exist for this pattern?
|-- Yes (button, a, input, select, details, dialog)
|   |-- Does the native element meet your UX requirements?
|   |   |-- Yes --> Use the native element. Style it with CSS.
|   |   |-- No
|   |       |-- Can you enhance the native element with CSS/JS?
|   |       |   |-- Yes --> Enhance the native element
|   |       |   |-- No --> Use an accessible component library
|   |       |         (Radix UI, React Aria, Headless UI)
|-- No (tabs, combobox, tree view, date picker)
    |-- Does an accessible component library have this pattern?
    |   |-- Yes --> Use the library component
    |   |-- No --> Build custom following WAI-ARIA APG exactly
    |         - Implement all keyboard interactions from the APG
    |         - Test with 3+ screen readers
    |         - Test with keyboard only
    |         - Get review from accessibility specialist
```

### When to Use ARIA vs Semantic HTML?

```
Can a native HTML element convey the semantics you need?
|-- Yes --> Use the native element. Do NOT add ARIA.
|           Example: <button> not <div role="button">
|-- No
    |-- Are you building a custom interactive widget?
    |   |-- Yes --> ARIA is required
    |   |   - Add role (e.g., role="tablist", role="tab")
    |   |   - Add states (aria-selected, aria-expanded)
    |   |   - Add properties (aria-controls, aria-labelledby)
    |   |   - Implement ALL keyboard interactions from APG
    |   |-- No
    |       |-- Do you need to communicate dynamic state?
    |       |   |-- Yes --> Use ARIA states/properties
    |       |   |   - aria-live for dynamic announcements
    |       |   |   - aria-expanded for disclosure state
    |       |   |   - aria-busy for loading state
    |       |   |-- No
    |       |       |-- Do you need to add a label or description?
    |       |       |   |-- Yes --> Use aria-label or aria-describedby
    |       |       |   |   (only on elements with interactive roles)
    |       |       |   |-- No --> You probably do not need ARIA

Remember: ARIA changes what screen readers announce.
It does NOT change behavior. You must still implement
keyboard interaction and focus management yourself.
```

---

## Code Examples

### 1. Accessible Skip Link

```html
<!-- First element in <body> -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header><!-- site header, navigation --></header>

<main id="main-content" tabindex="-1">
  <h1>Page Title</h1>
  <!-- page content -->
</main>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #005fcc;
  color: #ffffff;
  font-weight: bold;
  z-index: 1000;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}

@media (prefers-reduced-motion: reduce) {
  .skip-link { transition: none; }
}
</style>
```

### 2. Accessible Form With Error Handling

```html
<form novalidate aria-labelledby="form-title">
  <h2 id="form-title">Create Account</h2>

  <!-- Error summary (appears on submit) -->
  <div role="alert" id="error-summary" hidden>
    <h3>Please fix the following errors:</h3>
    <ul>
      <li><a href="#email">Email address is required</a></li>
      <li><a href="#password">Password must be at least 8 characters</a></li>
    </ul>
  </div>

  <div>
    <label for="email">
      Email address <span aria-hidden="true">*</span>
      <span class="visually-hidden">(required)</span>
    </label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-required="true"
      aria-invalid="false"
      aria-describedby="email-error"
      autocomplete="email"
    />
    <span id="email-error" class="error" hidden>
      Enter a valid email address
    </span>
  </div>

  <div>
    <label for="password">
      Password <span aria-hidden="true">*</span>
      <span class="visually-hidden">(required)</span>
    </label>
    <input
      type="password"
      id="password"
      name="password"
      required
      aria-required="true"
      aria-invalid="false"
      aria-describedby="password-hint password-error"
      autocomplete="new-password"
    />
    <span id="password-hint" class="hint">
      Must be at least 8 characters with one number
    </span>
    <span id="password-error" class="error" hidden>
      Password must be at least 8 characters
    </span>
  </div>

  <button type="submit">Create Account</button>
</form>
```

### 3. Accessible Modal Dialog

```html
<dialog id="confirm-dialog" aria-labelledby="dialog-title"
        aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm Deletion</h2>
  <p id="dialog-desc">
    Are you sure you want to delete this item?
    This action cannot be undone.
  </p>
  <div class="dialog-actions">
    <button id="cancel-btn" type="button">Cancel</button>
    <button id="confirm-btn" type="button" class="destructive">
      Delete
    </button>
  </div>
</dialog>

<button id="open-dialog" type="button">Delete Item</button>

<script>
const dialog = document.getElementById('confirm-dialog');
const openBtn = document.getElementById('open-dialog');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');

// Native <dialog> with showModal(): traps focus, handles Escape
openBtn.addEventListener('click', () => {
  dialog.showModal();
  cancelBtn.focus(); // Focus the safe action first
});

cancelBtn.addEventListener('click', () => {
  dialog.close();
  openBtn.focus(); // Return focus to trigger
});

confirmBtn.addEventListener('click', () => {
  performDeletion();
  dialog.close();
  openBtn.focus(); // Return focus to trigger
});
</script>
```

### 4. Live Region for Dynamic Content

```html
<!-- Live region container: must exist in DOM before content changes -->
<div id="search-status" role="status" aria-live="polite"
     class="visually-hidden"></div>

<input type="search" aria-label="Search products"
       aria-describedby="search-status" />

<div id="results" aria-busy="false">
  <!-- Search results rendered here -->
</div>

<script>
async function handleSearch(query) {
  const resultsEl = document.getElementById('results');
  const statusEl = document.getElementById('search-status');

  // Announce loading state
  resultsEl.setAttribute('aria-busy', 'true');
  statusEl.textContent = 'Searching...';

  const data = await fetchResults(query);

  // Render results using safe DOM methods (not innerHTML)
  resultsEl.replaceChildren();
  data.forEach(item => {
    const el = document.createElement('article');
    el.textContent = item.title;
    resultsEl.appendChild(el);
  });

  resultsEl.setAttribute('aria-busy', 'false');

  // Announce result count
  statusEl.textContent =
    data.length + ' results found for "' + query + '"';
}
</script>
```

### 5. Accessible Navigation With Current Page

```html
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<!-- Mobile menu toggle -->
<button aria-expanded="false" aria-controls="mobile-menu"
        aria-label="Menu">
  <svg aria-hidden="true" focusable="false">
    <!-- hamburger icon -->
  </svg>
</button>

<nav id="mobile-menu" aria-label="Main navigation" hidden>
  <!-- Same links as above -->
</nav>

<script>
const menuBtn = document.querySelector('[aria-controls="mobile-menu"]');
const mobileMenu = document.getElementById('mobile-menu');

menuBtn.addEventListener('click', () => {
  const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
  menuBtn.setAttribute('aria-expanded', String(!isOpen));
  mobileMenu.hidden = isOpen;

  if (!isOpen) {
    mobileMenu.querySelector('a').focus();
  }
});
</script>

<!-- Visually hidden utility class -->
<style>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
```

---

*Researched: 2026-03-07 | Sources: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/), [W3C What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [WebAIM Million 2025](https://webaim.org/projects/million/), [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA), [web.dev ARIA and HTML](https://web.dev/learn/accessibility/aria-html), [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing), [Deque axe-core](https://www.deque.com/axe/axe-core/), [Level Access Section 508 Guide](https://www.levelaccess.com/compliance-overview/section-508-compliance/), [Level Access EAA Guide](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/), [Smashing Magazine CAPTCHA Accessibility](https://www.smashingmagazine.com/2025/11/accessibility-problem-authentication-methods-captcha/), [LogRocket Headless UI Alternatives](https://blog.logrocket.com/headless-ui-alternatives/), [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [W3C Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)*
