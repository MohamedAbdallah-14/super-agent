# Accessibility Anti-Patterns -- Design Domain

> 95.9% of the top one million homepages fail WCAG 2.2 Level A/AA conformance, averaging 51 accessibility errors per page. Over 4,000 ADA web accessibility lawsuits were filed in 2024 alone, with a 37% increase in the first half of 2025. These anti-patterns are not theoretical -- they are the direct cause of litigation, user exclusion, and reputational damage.

---

## Anti-Pattern Index

| #  | Anti-Pattern                              | Severity   | WCAG SC          | Prevalence |
|----|-------------------------------------------|------------|------------------|------------|
| 1  | Missing Alt Text on Images                | Critical   | 1.1.1            | 55.5%      |
| 2  | Div/Span Soup Instead of Semantic HTML    | Critical   | 1.3.1, 4.1.2     | Very High  |
| 3  | Keyboard Traps                            | Critical   | 2.1.2            | 12%        |
| 4  | Missing Focus Indicators                  | High       | 2.4.7, 2.4.13    | Very High  |
| 5  | Color-Only Information                    | High       | 1.4.1            | High       |
| 6  | ARIA Misuse                               | Critical   | 4.1.2            | Very High  |
| 7  | Auto-Playing Media Without Controls       | High       | 1.4.2            | Moderate   |
| 8  | Time Limits Without Extension             | High       | 2.2.1            | Moderate   |
| 9  | Missing Skip Navigation Links             | Moderate   | 2.4.1            | 83%        |
| 10 | Inaccessible Forms                        | Critical   | 1.3.1, 3.3.2     | 45%        |
| 11 | Custom Controls Without Keyboard Support  | Critical   | 2.1.1            | High       |
| 12 | Low Contrast Text                         | High       | 1.4.3            | 79.1%      |
| 13 | Non-Resizable / Tiny Text                 | High       | 1.4.4            | Moderate   |
| 14 | Mouse-Only Interactions                   | Critical   | 2.1.1, 2.5.1     | High       |
| 15 | PDF-Only Content Without HTML Alternative | Moderate   | 1.1.1, 4.1.2     | High       |
| 16 | CAPTCHAs Without Accessible Alternatives  | Critical   | 1.1.1, 3.3.8     | High       |
| 17 | Dynamic Content Without Live Regions      | High       | 4.1.3            | High       |
| 18 | Inaccessible Modals and Dialogs           | Critical   | 2.1.2, 4.1.2     | Very High  |
| 19 | Tables Without Proper Headers             | Moderate   | 1.3.1            | High       |
| 20 | Focus Order Mismatching Visual Order      | High       | 2.4.3, 1.3.2     | High       |

---

## 1. Missing Alt Text on Images

**Also known as:** Decorative-by-default, silent images, empty information.

**Description:** Images are rendered without `alt` attributes or with meaningless values like `alt="image"`, `alt="photo"`, or `alt="IMG_20240301.jpg"`. Screen readers either skip the image entirely or announce the filename, leaving blind and low-vision users without critical information.

**Why it happens:**
- Developers treat alt text as optional or low-priority
- CMS systems allow image uploads without requiring alt text
- Stock photo integrations auto-populate filenames as alt values
- Teams lack content authoring guidelines for image descriptions

**Real-world impact:**
- NFB v. Target Corp. (2006-2008): Target.com lacked alt text on images, preventing blind users from navigating or purchasing products. Settlement: $6 million in class damages plus mandatory remediation.
- Conner v. Parkwood Entertainment (2019): Beyonce.com sued for missing alt text on graphics, inaccessible drop-down menus, and lack of keyboard access.
- WebAIM Million 2025: 55.5% of homepages have images missing alt text, averaging 11 images per page without alternatives.

**What to do instead:**
```html
<!-- WRONG: Missing alt -->
<img src="sale-banner.jpg">

<!-- WRONG: Meaningless alt -->
<img src="sale-banner.jpg" alt="image">
<img src="sale-banner.jpg" alt="banner">

<!-- RIGHT: Descriptive alt -->
<img src="sale-banner.jpg" alt="Summer sale: 40% off all outdoor furniture through July 31">

<!-- RIGHT: Decorative image explicitly marked -->
<img src="decorative-border.png" alt="" role="presentation">
```

**Detection:**
- Automated: axe-core rule `image-alt`, Lighthouse audit, htmlhint
- Manual: Screen reader walkthrough (NVDA: press `G` to jump between images)
- CI gate: eslint-plugin-jsx-a11y `alt-text` rule

**WCAG:** 1.1.1 Non-text Content (Level A)

---

## 2. Div/Span Soup Instead of Semantic HTML

**Also known as:** Div-itis, unsemantic markup, reinventing native elements.

**Description:** Developers build interactive controls entirely from `<div>` and `<span>` elements, manually adding click handlers, rather than using native HTML elements like `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, or `<select>`. The result is elements that look correct visually but are invisible or broken for assistive technology.

**Why it happens:**
- CSS styling of native elements is perceived as difficult
- Component libraries abstract away HTML, producing `<div>` wrappers
- Developers lack understanding of implicit ARIA roles and native keyboard behavior
- "It works for me" testing only with a mouse in a visual browser

**Real-world impact:**
- Screen readers cannot identify interactive elements -- a `<div onclick="...">` is announced as "text" not "button"
- Keyboard users cannot Tab to `<div>` elements (they are not focusable by default)
- WebAIM 2025: Pages using excessive ARIA to compensate for non-semantic HTML averaged 57 errors, more than double pages without ARIA (implying semantic HTML)
- 67.5% of screen reader users navigate by headings; missing `<h1>`-`<h6>` hierarchy destroys their primary navigation strategy

**What to do instead:**
```html
<!-- WRONG: Fake button -->
<div class="btn" onclick="submit()">Submit</div>

<!-- RIGHT: Native button -->
<button type="submit">Submit</button>

<!-- WRONG: Fake navigation -->
<div class="nav">
  <div class="nav-item" onclick="goto('/home')">Home</div>
</div>

<!-- RIGHT: Semantic navigation -->
<nav aria-label="Main">
  <ul>
    <li><a href="/home">Home</a></li>
  </ul>
</nav>

<!-- RIGHT: Landmark regions -->
<header>...</header>
<main>...</main>
<footer>...</footer>
```

**Detection:**
- Automated: axe-core rules `button-name`, `landmark-*`, eslint `click-events-have-key-events`
- Manual: Tab through page -- can you reach and activate every control by keyboard alone?
- Audit: Run Accessibility Tree inspector in Chrome DevTools and compare against visual layout

**WCAG:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)

---

## 3. Keyboard Traps

**Also known as:** Focus jail, inescapable widgets, Tab black holes.

**Description:** Keyboard focus enters a component -- such as a modal, embedded video player, rich text editor, or third-party widget -- and the user cannot navigate away using standard keyboard commands (Tab, Shift+Tab, Escape). The user is effectively trapped.

**Why it happens:**
- Third-party embeds (video players, maps, iframes, CAPTCHA widgets) do not implement keyboard exit
- JavaScript `onBlur` / `onChange` handlers force focus back to the same element on validation failure
- Modal dialogs trap focus intentionally but fail to release it when closed
- Rich text editors and code editors capture all key events including Tab and Escape

**Real-world impact:**
- WCAG SC 2.1.2 is Level A -- the most fundamental requirement. Failure means the site cannot be considered accessible at any level.
- WebAIM analysis found keyboard traps on 12% of websites
- For keyboard-only users (motor disabilities, RSI, blindness), a trap means total inability to complete the task -- they must close and reopen the browser

**What to do instead:**
```javascript
// WRONG: Focus forced back on blur
input.addEventListener('blur', () => {
  if (!input.value) input.focus(); // TRAP!
});

// RIGHT: Show error but allow navigation
input.addEventListener('blur', () => {
  if (!input.value) showError(input, 'Required field');
  // User can still Tab away
});

// RIGHT: Modal focus trap with Escape release
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDialog();
    triggerButton.focus(); // Return focus to trigger
  }
  // Trap Tab within modal (but Escape always exits)
  if (e.key === 'Tab') trapFocusWithinDialog(e);
});
```

**Detection:**
- Manual: Tab through every interactive element; can you always Tab/Shift+Tab/Escape away?
- Automated: Lighthouse "User focus is not accidentally trapped in a region"
- Test: Navigate into embedded iframes, video players, and third-party widgets

**WCAG:** 2.1.2 No Keyboard Trap (Level A)

---

## 4. Missing Focus Indicators

**Also known as:** Invisible focus, outline:none, ghost navigation.

**Description:** The visible focus indicator (typically a browser-default outline) is removed via CSS (`outline: none` or `outline: 0`) without providing a custom replacement. Keyboard users cannot see which element is currently focused.

**Why it happens:**
- Designers find the browser default focus ring "ugly" and remove it globally
- CSS resets (normalize.css, reset.css) zero out outlines
- Teams add `:focus { outline: none }` to satisfy visual QA without understanding the accessibility consequence
- Focus styles are tested only with a mouse (where they are irrelevant)

**Real-world impact:**
- WCAG 2.2 added SC 2.4.13 Focus Appearance, requiring minimum area and contrast for focus indicators
- Keyboard-only users (estimated 7-10% of web users) cannot navigate pages where focus is invisible
- Low-contrast focus rings cause the same disorientation as missing ones

**What to do instead:**
```css
/* WRONG: Removing focus without replacement */
*:focus {
  outline: none;
}

/* RIGHT: Custom visible focus indicator */
*:focus-visible {
  outline: 3px solid #1a73e8;
  outline-offset: 2px;
  border-radius: 2px;
}

/* RIGHT: High-contrast focus for dark backgrounds */
.dark-theme *:focus-visible {
  outline: 3px solid #ffffff;
  box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.5);
}

/* RIGHT: Remove only for mouse, keep for keyboard */
*:focus:not(:focus-visible) {
  outline: none;
}
```

**Detection:**
- Automated: axe-core rule `focus-visible` (partial), CSS grep for `outline: none` or `outline: 0`
- Manual: Unplug mouse, navigate entire page with Tab key -- can you always see where you are?
- WCAG 2.2 SC 2.4.13 requires focus indicator with minimum 2px perimeter and 3:1 contrast

**WCAG:** 2.4.7 Focus Visible (Level AA), 2.4.13 Focus Appearance (Level AA, WCAG 2.2)

---

## 5. Color-Only Information

**Also known as:** Red means error, green means go, color-coded status.

**Description:** Information is conveyed solely through color -- red text for errors, green for success, color-coded charts without patterns, required fields indicated only by a red asterisk with no label. Users who are colorblind, use monochrome displays, or have low vision cannot distinguish the states.

**Why it happens:**
- Designers assume universal color perception
- "Red = error" feels culturally obvious
- Data visualization libraries default to color-only legends
- Form validation shows only red/green borders with no text

**Real-world impact:**
- 8% of males and 0.5% of females have some form of color vision deficiency (roughly 300 million people worldwide)
- Red-green colorblindness (deuteranopia/protanopia) makes error/success states indistinguishable
- Color-coded dashboards become unreadable for affected users

**What to do instead:**
```html
<!-- WRONG: Color-only error -->
<input style="border-color: red;" />

<!-- RIGHT: Color + icon + text -->
<div class="field-error">
  <input aria-invalid="true" aria-describedby="email-error" />
  <span id="email-error" role="alert">
    <svg aria-hidden="true"><!-- error icon --></svg>
    Please enter a valid email address.
  </span>
</div>

<!-- WRONG: Color-only chart legend -->
<div style="color: green;">Revenue</div>
<div style="color: blue;">Costs</div>

<!-- RIGHT: Color + pattern + label -->
<!-- Use distinct line patterns (solid, dashed, dotted) in addition to colors -->
<!-- Include direct labels on chart lines, not just a separate legend -->
```

**Detection:**
- Manual: View page in grayscale (DevTools > Rendering > Emulate vision deficiencies)
- Automated: axe-core `color-contrast` (partial -- does not catch semantic color-only issues)
- Review: Search codebase for validation that sets only `border-color` or `color` without companion text

**WCAG:** 1.4.1 Use of Color (Level A)

---

## 6. ARIA Misuse

**Also known as:** Bad ARIA, cargo-cult accessibility, role soup, "No ARIA is better than bad ARIA."

**Description:** ARIA attributes are applied incorrectly -- wrong roles, missing required children/parent roles, conflicting attributes, `aria-role` instead of `role`, or ARIA used where native HTML semantics suffice. Misused ARIA actively harms assistive technology users by announcing incorrect information.

**Why it happens:**
- Developers copy-paste ARIA from Stack Overflow without understanding the specification
- ARIA is added as an afterthought to patch non-semantic HTML rather than fixing the HTML
- Role hierarchy requirements (e.g., `tab` must be inside `tablist`) are not understood
- Testing is done visually, never with a screen reader

**Real-world impact:**
- WebAIM Million 2025: Pages with ARIA averaged 57 errors -- more than double pages without ARIA. Over 105 million ARIA attributes detected across 1 million pages (106 per page), an 18.5% increase year-over-year.
- The accessibility community maxim: "No ARIA is better than bad ARIA" -- incorrect roles cause screen readers to announce wrong element types, breaking user mental models.
- Using `role="menu"` on a navigation bar causes screen readers to expect arrow-key navigation like an OS menu, confusing users when standard Tab behavior is needed.

**What to do instead:**
```html
<!-- WRONG: ARIA on a native element that already has the role -->
<button role="button">Submit</button>

<!-- RIGHT: Native element, no ARIA needed -->
<button>Submit</button>

<!-- WRONG: Broken role hierarchy -->
<div role="tab">Settings</div>  <!-- Missing tablist parent -->

<!-- RIGHT: Correct hierarchy -->
<div role="tablist" aria-label="Settings">
  <button role="tab" aria-selected="true" aria-controls="panel-1">General</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Privacy</button>
</div>
<div role="tabpanel" id="panel-1">...</div>

<!-- WRONG: Invalid attribute name -->
<div aria-role="alert">Error!</div>

<!-- RIGHT: Correct attribute -->
<div role="alert">Error!</div>

<!-- WRONG: Redundant ARIA overriding native semantics -->
<a href="/home" role="button">Home</a>

<!-- RIGHT: Use the correct element -->
<a href="/home">Home</a>
```

**Detection:**
- Automated: axe-core rules `aria-*`, Lighthouse ARIA audits, `eslint-plugin-jsx-a11y`
- Manual: Screen reader testing (NVDA + Firefox, VoiceOver + Safari, JAWS + Chrome)
- Linting: `aria-query` and `axe-core` rule sets catch invalid roles, missing required attributes

**WCAG:** 4.1.2 Name, Role, Value (Level A)

---

## 7. Auto-Playing Media Without Controls

**Also known as:** Surprise audio, autoplay assault, sensory ambush.

**Description:** Audio or video content plays automatically when a page loads, without visible pause/stop controls, volume adjustment, or the ability to mute. This disorients screen reader users (whose audio output is overridden), triggers vestibular disorders, and overwhelms users with cognitive disabilities.

**Why it happens:**
- Marketing teams want "engaging" hero videos on landing pages
- Developers add `autoplay` attribute without considering assistive technology
- Background ambient audio is deemed "subtle enough" to not need controls
- Third-party ad embeds autoplay without site control

**Real-world impact:**
- Screen reader users cannot hear their assistive technology output over auto-playing audio
- Users with PTSD, anxiety disorders, or sensory processing conditions are startled or overwhelmed
- WCAG SC 1.4.2 requires any audio playing for more than 3 seconds to have pause/stop/mute controls

**What to do instead:**
```html
<!-- WRONG: Autoplay with sound, no controls -->
<video autoplay src="promo.mp4"></video>

<!-- RIGHT: Autoplay muted with controls visible -->
<video autoplay muted loop playsinline controls>
  <source src="promo.mp4" type="video/mp4">
  <track kind="captions" src="promo-captions.vtt" srclang="en" label="English">
</video>

<!-- RIGHT: No autoplay, user initiates -->
<video controls preload="metadata">
  <source src="promo.mp4" type="video/mp4">
  <track kind="captions" src="promo-captions.vtt" srclang="en" label="English">
</video>
```

**Detection:**
- Automated: Search codebase for `autoplay` attribute without `muted`
- Manual: Load page -- does anything play without user action?
- Audit: Check that all media players have visible, keyboard-accessible controls

**WCAG:** 1.4.2 Audio Control (Level A)

---

## 8. Time Limits Without Extension

**Also known as:** Session timeout ambush, countdown wall, timed-out mid-task.

**Description:** Users are given a fixed time to complete a task (form submission, checkout, exam) with no warning, no extension option, and no ability to save progress. When time expires, work is lost silently.

**Why it happens:**
- Security teams impose aggressive session timeouts (e.g., 2 minutes) without accessibility review
- Shopping cart / booking systems use countdown timers without extension
- Developers do not consider users who need more time (cognitive disabilities, screen reader users, motor impairments)

**Real-world impact:**
- Screen reader users take 3-10x longer to complete forms than sighted mouse users
- Users with cognitive disabilities need more time to process and respond
- Motor-impaired users using switch devices or eye tracking are significantly slower
- WCAG requires that for each time limit, users must be able to turn it off, adjust it, or extend it

**What to do instead:**
```javascript
// WRONG: Silent timeout
setTimeout(() => { window.location = '/session-expired'; }, 120000);

// RIGHT: Warning with extension option
function warnBeforeTimeout() {
  const warning = document.getElementById('timeout-warning');
  warning.removeAttribute('hidden');
  warning.focus();
  // "Your session will expire in 2 minutes.
  //  Press 'Continue' to extend by 20 minutes."
}
// Warn at least 20 seconds before expiry (WCAG SC 2.2.1)
setTimeout(warnBeforeTimeout, timeoutMs - 20000);
```

**Detection:**
- Manual: Complete all timed workflows at slow speed; does anything expire without warning?
- Code review: Search for `setTimeout`, `setInterval` paired with redirect or form clearing
- Audit: Check session timeout configuration and whether extension is available

**WCAG:** 2.2.1 Timing Adjustable (Level A)

---

## 9. Missing Skip Navigation Links

**Also known as:** Header gauntlet, navigation treadmill, 50-tabs-to-content.

**Description:** Pages lack a "Skip to main content" link, forcing keyboard and screen reader users to Tab through the entire header, navigation bar, and sidebar on every page load before reaching the primary content.

**Why it happens:**
- Developers and designers are unaware skip links exist as a pattern
- Skip links are visually hidden by default and forgotten during QA
- SPAs re-render headers on route changes without providing skip links
- Broken implementations: skip link target lacks `tabindex="-1"`, so focus does not actually move

**Real-world impact:**
- WebAIM 2025: Only 17% of the top one million homepages have skip links. Of those, one in six are broken.
- A site with 30 navigation links forces 30+ Tab presses before reaching content on every page
- Conner v. Parkwood Entertainment (2019): "Lack of navigation links" was among the cited violations

**What to do instead:**
```html
<!-- RIGHT: Skip link as first focusable element -->
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header><!-- navigation --></header>
  <main id="main-content" tabindex="-1">
    <!-- page content -->
  </main>
</body>

<style>
/* Visually hidden until focused */
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.skip-link:focus {
  position: fixed;
  top: 10px;
  left: 10px;
  width: auto;
  height: auto;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  z-index: 10000;
  font-size: 1rem;
}
</style>
```

**Detection:**
- Manual: Press Tab on page load -- does a "Skip" link appear?
- Automated: axe-core rule `skip-link`, Lighthouse bypass audit
- Verify: After activating skip link, does focus actually land on the main content?

**WCAG:** 2.4.1 Bypass Blocks (Level A)

---

## 10. Inaccessible Forms

**Also known as:** Label-less inputs, placeholder-as-label, orphan errors.

**Description:** Form fields lack programmatically associated labels, rely on placeholder text as the only label, or display error messages that are not connected to their respective fields. Screen readers cannot tell users what a field is for or what went wrong.

**Why it happens:**
- Designers prefer "clean" UIs with placeholder-only inputs (no visible labels)
- Developers use `<label>` visually but forget the `for` attribute to create programmatic association
- Error messages are generic ("Please fix errors above") rather than field-specific
- CMS/form builders generate inaccessible markup by default

**Real-world impact:**
- WebAIM Million 2025: Missing form labels appear on 45% of homepages -- the third most common error
- Placeholder text disappears on input, leaving users with cognitive disabilities unable to remember what to enter
- Generic errors force screen reader users to search the entire form for problems
- Courts have consistently ruled inaccessible forms violate the ADA (WCAG 3.3.1, 3.3.2)

**What to do instead:**
```html
<!-- WRONG: Placeholder as label -->
<input type="email" placeholder="Email address">

<!-- RIGHT: Visible label with association -->
<label for="email">Email address</label>
<input type="email" id="email" name="email"
       aria-describedby="email-hint email-error"
       aria-invalid="false">
<span id="email-hint" class="hint">We will never share your email.</span>

<!-- RIGHT: Error associated with field -->
<label for="password">Password</label>
<input type="password" id="password" aria-invalid="true"
       aria-describedby="password-error">
<span id="password-error" role="alert">
  Password must be at least 8 characters.
</span>
```

**Detection:**
- Automated: axe-core rules `label`, `form-field-multiple-labels`, eslint `label-has-associated-control`
- Manual: Click on each label text -- does it focus the corresponding input?
- Screen reader: Navigate form in JAWS/NVDA forms mode -- are all fields announced with labels?

**WCAG:** 1.3.1 Info and Relationships (Level A), 3.3.2 Labels or Instructions (Level A), 3.3.1 Error Identification (Level A)

---

## 11. Custom Controls Without Keyboard Support

**Also known as:** Mouse-only widgets, Tab-immune components, click-only interactives.

**Description:** Custom UI components (carousels, accordions, tree views, drag-and-drop interfaces, star ratings, sliders) are built without implementing keyboard event handlers. They respond only to mouse clicks and hover events.

**Why it happens:**
- Developers implement `onClick` but not `onKeyDown`
- Custom components do not use native interactive elements as their base
- "Accessible later" is deferred indefinitely
- Testing never includes keyboard-only users

**Real-world impact:**
- Robles v. Domino's Pizza (2016-2022): Blind user Guillermo Robles could not order pizza via keyboard and screen reader. The Supreme Court declined to hear Domino's appeal, establishing that the ADA applies to websites. After six years of litigation, Domino's settled.
- Any control that is mouse-only excludes keyboard users, screen reader users, switch device users, and voice control users
- WCAG SC 2.1.1 is Level A: all functionality must be operable via keyboard

**What to do instead:**
```javascript
// WRONG: Click-only accordion
div.addEventListener('click', togglePanel);

// RIGHT: Keyboard-accessible accordion
button.addEventListener('click', togglePanel);
button.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    togglePanel();
  }
});
// Better yet: use <button> which handles Enter/Space natively
// <button aria-expanded="false" aria-controls="panel-1">Section 1</button>

// WRONG: Drag-only reordering
item.addEventListener('dragstart', onDrag);

// RIGHT: Drag AND keyboard alternative
// Provide up/down buttons or use aria-grabbed + arrow keys
```

**Detection:**
- Manual: Disconnect mouse, complete every workflow using only keyboard
- Automated: eslint `click-events-have-key-events`, `interactive-supports-focus`
- Review: Search for `addEventListener('click'` without corresponding keyboard handlers

**WCAG:** 2.1.1 Keyboard (Level A)

---

## 12. Low Contrast Text

**Also known as:** Gray-on-white, whisper text, aesthetic-over-readable.

**Description:** Text color does not meet the minimum contrast ratio against its background: 4.5:1 for normal text or 3:1 for large text (18pt+ or 14pt+ bold). Users with low vision, cataracts, or those in bright ambient light cannot read the content.

**Why it happens:**
- Designers prioritize "soft" or "modern" aesthetics (light gray on white)
- Brand color palettes are chosen without contrast checking
- Placeholder text, disabled states, and footer text are left at very low contrast
- Dark mode implementations invert poorly, creating low-contrast combinations

**Real-world impact:**
- WebAIM Million 2025: Low contrast text found on 79.1% of homepages -- the single most common accessibility error for the fifth consecutive year. Average of 29.6 low-contrast instances per page.
- 253 million people worldwide have vision impairment (WHO). Low contrast text is the most widespread barrier they face online.
- Low contrast issues are cited in virtually every ADA web accessibility lawsuit

**What to do instead:**
```css
/* WRONG: 2.5:1 contrast ratio */
body { color: #999999; background: #ffffff; }

/* RIGHT: 7.4:1 contrast ratio */
body { color: #333333; background: #ffffff; }

/* WRONG: Placeholder too faint */
::placeholder { color: #cccccc; }

/* RIGHT: Placeholder meeting 4.5:1 */
::placeholder { color: #767676; }

/* Tools: Use WebAIM Contrast Checker, Chrome DevTools
   color picker, or Polypane built-in contrast overlay */
```

**Detection:**
- Automated: axe-core `color-contrast`, Lighthouse contrast audit, Polypane
- Manual: Chrome DevTools > Elements > color picker shows contrast ratio
- Design: Check all color pairs in the design system against WCAG thresholds before coding

**WCAG:** 1.4.3 Contrast Minimum (Level AA), 1.4.6 Contrast Enhanced (Level AAA)

---

## 13. Non-Resizable / Tiny Text

**Also known as:** Fixed font size, pixel-locked typography, zoom-breaking layout.

**Description:** Text is set in fixed pixel sizes (`font-size: 12px`) or the page layout breaks when text is resized to 200%. Content overflows, gets clipped by `overflow: hidden`, or overlaps other elements. Some sites use `maximum-scale=1` in the viewport meta tag, preventing pinch-to-zoom on mobile.

**Why it happens:**
- Pixel-perfect designs use fixed `px` units throughout
- `overflow: hidden` is used to "clean up" layout without testing at larger text sizes
- Viewport meta includes `user-scalable=no` or `maximum-scale=1`
- Component heights are fixed, causing text to overflow containers when resized

**What to do instead:**
```css
/* WRONG: Fixed pixel sizes */
body { font-size: 12px; }
.card { height: 200px; overflow: hidden; }

/* RIGHT: Relative units */
body { font-size: 1rem; }    /* 16px default, scales with user preference */
.card { min-height: 12rem; } /* Grows with text size */

/* WRONG: Preventing zoom */
<meta name="viewport" content="width=device-width, maximum-scale=1, user-scalable=no">

/* RIGHT: Allowing zoom */
<meta name="viewport" content="width=device-width, initial-scale=1">
```

**Detection:**
- Manual: Set browser zoom to 200% -- does all content remain visible and functional?
- Automated: axe-core `meta-viewport`, grep for `user-scalable=no` or `maximum-scale=1`
- Design review: Ensure all containers use `min-height` not `height` with `overflow: hidden`

**WCAG:** 1.4.4 Resize Text (Level AA)

---

## 14. Mouse-Only Interactions

**Also known as:** Hover-dependent UI, click-to-reveal, tooltip-only information.

**Description:** Critical functionality or content is available only through mouse-specific events: hover-triggered menus, tooltips with essential information that appear only on `mouseover`, right-click context menus, drag-and-drop as the only reordering mechanism. Keyboard, touch, and assistive technology users are excluded.

**Why it happens:**
- CSS `:hover` is used without corresponding `:focus` styles
- Dropdown menus appear on hover with no keyboard or touch equivalent
- Drag-and-drop is the sole method for reordering (no button alternative)
- Tooltips with critical info lack `focus` triggers and `aria-describedby` association

**Real-world impact:**
- Touch device users (mobile, tablet) have no hover capability
- Voice control users (Dragon NaturallySpeaking) cannot trigger hover events
- Conner v. Parkwood Entertainment (2019): "Denial of keyboard access" and "inaccessible drop-down menus" among cited violations

**What to do instead:**
```css
/* WRONG: Hover-only dropdown */
.menu-item:hover > .submenu { display: block; }

/* RIGHT: Hover AND focus */
.menu-item:hover > .submenu,
.menu-item:focus-within > .submenu {
  display: block;
}
```
```html
<!-- WRONG: Tooltip only on hover, with critical info -->
<span title="Required: must be 8+ characters">Password</span>

<!-- RIGHT: Always-visible hint + accessible tooltip -->
<label for="pw">Password</label>
<input id="pw" aria-describedby="pw-hint">
<span id="pw-hint">Must be at least 8 characters.</span>
```

**Detection:**
- Manual: Complete all workflows without a mouse; are any features missing?
- Automated: CSS grep for `:hover` without corresponding `:focus` or `:focus-within`
- Testing: Use iOS VoiceOver or Android TalkBack on mobile -- can you reach all content?

**WCAG:** 2.1.1 Keyboard (Level A), 2.5.1 Pointer Gestures (Level A), 1.4.13 Content on Hover or Focus (Level AA)

---

## 15. PDF-Only Content Without HTML Alternative

**Also known as:** PDF wall, document-format gatekeeping, scan-and-post.

**Description:** Important content (policies, forms, reports, menus, course materials) is published exclusively as PDF, often scanned images of paper documents. These PDFs lack tagged structure, reading order, alt text, and form field labels, making them partially or fully inaccessible to screen readers.

**Why it happens:**
- Organizations scan paper documents and post them as image-PDFs
- PDF is seen as the "official" format for legal/compliance documents
- PDF accessibility tagging (heading structure, reading order, form fields) requires specialized tools and knowledge
- "Just upload the PDF" is faster than creating an accessible HTML page

**Real-world impact:**
- Government agencies have been sued repeatedly over inaccessible PDF-only content (Section 508)
- Scanned-image PDFs are entirely invisible to screen readers -- they contain zero text to read
- Even tagged PDFs frequently have incorrect reading order, missing alt text, and broken form fields

**What to do instead:**
- Provide an HTML version of all PDF content as the primary format
- If PDF is required, ensure it is tagged (Adobe Acrobat Pro > Accessibility Checker)
- Never publish scanned-image PDFs without OCR and manual verification
- Include a text-based summary or equivalent HTML page alongside any PDF

**Detection:**
- Manual: Open PDFs in a screen reader -- can the full content be read in logical order?
- Automated: Adobe Acrobat Accessibility Checker, PAC 2024 (PDF Accessibility Checker)
- Policy: Require HTML alternative for every PDF published on the site

**WCAG:** 1.1.1 Non-text Content (Level A), 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)

---

## 16. CAPTCHAs Without Accessible Alternatives

**Also known as:** Bot gate that blocks humans, prove-you-can-see challenge, ability test masquerading as security.

**Description:** Visual CAPTCHAs (distorted text, image selection grids) are presented without accessible alternatives. Audio CAPTCHAs, when provided, are heavily distorted and often fail. Users with visual, auditory, cognitive, or motor disabilities are locked out of registration, login, or form submission.

**Why it happens:**
- CAPTCHA vendors prioritize bot detection over accessibility
- Developers integrate CAPTCHA without evaluating the accessible fallback
- Audio CAPTCHAs are added as a "checkbox" compliance measure but are unusable
- reCAPTCHA v2 image challenges are impossible for blind users without sighted assistance

**Real-world impact:**
- WebAIM survey (2023-2024): Screen reader users ranked CAPTCHA as the single most problematic element on the web -- worse than missing alt text, ambiguous links, or lack of keyboard access.
- W3C published "Inaccessibility of CAPTCHA" (TR/turingtest) acknowledging no fully accessible CAPTCHA exists
- FTC v. accessiBe (2025): $1 million settlement after FTC found accessiBe's overlay widget failed to make CAPTCHAs accessible despite marketing claims

**What to do instead:**
- Use invisible CAPTCHA / risk-based analysis (reCAPTCHA v3, Cloudflare Turnstile) that requires no user interaction
- Implement honeypot fields (hidden fields that bots fill out but humans do not)
- Use time-based analysis (bots submit forms faster than humans)
- If visual CAPTCHA is required, provide a genuinely usable audio alternative AND a contact/support bypass
- WCAG 2.2 SC 3.3.8 (Accessible Authentication) prohibits cognitive function tests for login

**Detection:**
- Manual: Attempt to complete all CAPTCHA-protected flows using a screen reader
- Audit: Test audio CAPTCHA alternatives -- can a real user with hearing understand them?
- Review: Check if any pathway exists for users who cannot complete the CAPTCHA

**WCAG:** 1.1.1 Non-text Content (Level A), 3.3.8 Accessible Authentication (Level AA, WCAG 2.2)

---

## 17. Dynamic Content Without Live Regions

**Also known as:** Silent updates, ghost notifications, invisible status changes.

**Description:** Content on the page updates dynamically (AJAX responses, form validation messages, chat messages, notifications, progress indicators, shopping cart counts) without using ARIA live regions. Screen reader users are unaware that anything has changed.

**Why it happens:**
- Developers update the DOM visually but do not consider screen reader announcements
- SPA frameworks (React, Angular, Vue) update components without native page reload announcements
- Teams are unaware of `aria-live`, `role="alert"`, `role="status"`, or `role="log"`
- Live regions are added dynamically after page load, which some screen readers do not detect

**What to do instead:**
```html
<!-- RIGHT: Status message with polite live region -->
<!-- IMPORTANT: The live region container must exist in the DOM at page load -->
<div aria-live="polite" id="status-message"></div>

<script>
// Inject message into the existing container
document.getElementById('status-message').textContent =
  'Your item has been added to the cart.';
</script>

<!-- RIGHT: Urgent error alert -->
<div role="alert">
  Payment failed. Please check your card details.
</div>

<!-- RIGHT: Progress indicator -->
<div role="progressbar" aria-valuenow="65" aria-valuemin="0"
     aria-valuemax="100" aria-label="Upload progress">
  65%
</div>

<!-- WRONG: Dynamically injected live region (may not be detected) -->
<script>
const div = document.createElement('div');
div.setAttribute('aria-live', 'polite');
div.textContent = 'Updated!';
document.body.appendChild(div); // Screen reader may ignore this
</script>
```

**Detection:**
- Manual: Use NVDA/JAWS while triggering dynamic updates -- are changes announced?
- Code review: Search for DOM manipulation that updates text without an `aria-live` container
- SPA audit: Verify route changes announce the new page title via a live region

**WCAG:** 4.1.3 Status Messages (Level AA)

---

## 18. Inaccessible Modals and Dialogs

**Also known as:** Ghost dialogs, focus-leaking modals, background-interactive overlays.

**Description:** Modal dialogs fail one or more of the following: focus does not move into the dialog on open; focus is not trapped within the dialog while open; background content remains interactive via keyboard; pressing Escape does not close the dialog; focus does not return to the trigger element on close; the dialog lacks `role="dialog"` and `aria-modal="true"`.

**Why it happens:**
- Developers use `<div>` with `display:block` instead of `<dialog>` or proper ARIA markup
- Focus management requires explicit JavaScript (not built into CSS show/hide)
- Third-party modal libraries have incomplete accessibility support
- Background scroll is prevented visually but not from keyboard/screen reader interaction

**Real-world impact:**
- Modals are one of the most common UI patterns and one of the most frequently broken for accessibility
- Screen readers may not announce that a dialog has appeared at all if `role="dialog"` is missing
- VoiceOver + Safari has known issues with `aria-modal="true"` making static dialog content inaccessible
- Keyboard users who can interact with background content while a modal is open lose their place entirely

**What to do instead:**
```html
<!-- RIGHT: Native dialog element (modern browsers) -->
<dialog id="confirm-dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
  <p>Are you sure you want to delete this item?</p>
  <button id="cancel-btn">Cancel</button>
  <button id="confirm-btn">Delete</button>
</dialog>

<script>
const dialog = document.getElementById('confirm-dialog');
const triggerBtn = document.getElementById('delete-trigger');

triggerBtn.addEventListener('click', () => {
  dialog.showModal(); // Native: traps focus, adds backdrop, handles Escape
});

dialog.addEventListener('close', () => {
  triggerBtn.focus(); // Return focus to trigger
});
</script>
```

**Detection:**
- Manual: Open modal with keyboard, Tab through all elements -- does focus stay inside?
- Test: Press Escape -- does the modal close? Does focus return to the trigger?
- Screen reader: Does the dialog announce its title and role on open?
- Check: Can you interact with background content while the modal is open?

**WCAG:** 2.1.2 No Keyboard Trap (Level A), 4.1.2 Name, Role, Value (Level A), 2.4.3 Focus Order (Level A)

---

## 19. Tables Without Proper Headers

**Also known as:** Layout tables, header-free data, unlabeled grids.

**Description:** Data tables lack `<th>` elements, `scope` attributes, `<caption>`, or use `<table>` for visual layout instead of data. Screen readers cannot associate data cells with their headers, making the table content incomprehensible.

**Why it happens:**
- Tables are used for layout (a practice from the 1990s that persists in email templates and legacy codebases)
- Developers use `<td>` for all cells including headers, styling them bold via CSS
- Complex tables with merged cells (`colspan`, `rowspan`) lack `headers` attribute associations
- Data grids rendered by JavaScript frameworks output flat `<div>` structures instead of proper `<table>` markup

**What to do instead:**
```html
<!-- WRONG: No headers, no caption -->
<table>
  <tr><td>Name</td><td>Role</td><td>Start Date</td></tr>
  <tr><td>Alice</td><td>Engineer</td><td>2024-01-15</td></tr>
</table>

<!-- RIGHT: Proper headers and caption -->
<table>
  <caption>Engineering team roster</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Role</th>
      <th scope="col">Start Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Alice</th>
      <td>Engineer</td>
      <td>2024-01-15</td>
    </tr>
  </tbody>
</table>

<!-- RIGHT: Complex table with headers attribute -->
<table>
  <caption>Quarterly revenue by region</caption>
  <thead>
    <tr>
      <td></td>
      <th id="q1" scope="col">Q1</th>
      <th id="q2" scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th id="na" scope="row">North America</th>
      <td headers="q1 na">$1.2M</td>
      <td headers="q2 na">$1.5M</td>
    </tr>
  </tbody>
</table>
```

**Detection:**
- Automated: axe-core rules `td-headers-attr`, `th-has-data-cells`, `table-fake-caption`
- Manual: Screen reader table navigation (JAWS: `Ctrl+Alt+Arrow` keys) -- are headers announced?
- Review: Search for `<table>` without `<th>` or `<caption>` elements

**WCAG:** 1.3.1 Info and Relationships (Level A)

---

## 20. Focus Order Mismatching Visual Order

**Also known as:** Tab chaos, positive tabindex abuse, CSS-reordered-but-DOM-unchanged.

**Description:** The keyboard Tab order does not match the visual layout of the page. This occurs when CSS (`order`, `flex-direction: row-reverse`, `position: absolute`, `float`) rearranges elements visually while the DOM order remains unchanged, or when positive `tabindex` values (1, 2, 3...) override the natural Tab sequence.

**Why it happens:**
- CSS Flexbox/Grid `order` property rearranges visual layout without changing DOM order
- Developers assign `tabindex="1"`, `tabindex="5"`, etc. to force a Tab sequence
- Absolutely positioned elements appear in one place visually but are in a different DOM location
- Mobile-first CSS moves elements to different visual positions on desktop breakpoints

**Real-world impact:**
- Keyboard users Tab to elements in an unexpected sequence, losing their place
- Screen reader users hear content in DOM order, which may contradict the visual story
- Using positive tabindex values across a page creates an unpredictable, unmaintainable Tab order

**What to do instead:**
```html
<!-- WRONG: Positive tabindex -->
<input tabindex="3" placeholder="Last name">
<input tabindex="1" placeholder="First name">
<input tabindex="2" placeholder="Email">

<!-- RIGHT: Match DOM order to visual order -->
<input placeholder="First name">
<input placeholder="Email">
<input placeholder="Last name">

<!-- WRONG: CSS order mismatches DOM -->
<div style="display:flex;">
  <div style="order:2;">Second visually, first in DOM</div>
  <div style="order:1;">First visually, second in DOM</div>
</div>

<!-- RIGHT: DOM order matches intended visual order -->
<div style="display:flex;">
  <div>First visually, first in DOM</div>
  <div>Second visually, second in DOM</div>
</div>
```

**Detection:**
- Manual: Tab through page and compare focus sequence against visual reading order
- Automated: axe-core `tabindex` rule (flags positive tabindex values)
- CSS review: Search for `order:`, `flex-direction: row-reverse`, `flex-direction: column-reverse`
- Test at multiple breakpoints: Mobile and desktop may have different visual orders

**WCAG:** 2.4.3 Focus Order (Level A), 1.3.2 Meaningful Sequence (Level A)

---

## Root Cause Analysis

The 20 anti-patterns above share a small number of systemic root causes:

### 1. Lack of Assistive Technology Testing
Teams test only with mouse and visual browser. If no one on the team uses a screen reader, keyboard-only navigation, or voice control, accessibility failures are invisible during development and QA.

### 2. "Accessibility Later" Mentality
Accessibility is treated as a post-launch polish step rather than a core requirement. By the time it is addressed, the architecture (non-semantic HTML, custom controls, inaccessible third-party dependencies) makes remediation expensive.

### 3. Aesthetic Over Function
Design decisions prioritize visual minimalism (low contrast, hidden focus indicators, placeholder-only inputs, hover-only interactions) over readability and operability for all users.

### 4. Native HTML Ignorance
Developers reach for `<div>` + JavaScript + ARIA instead of using native HTML elements (`<button>`, `<dialog>`, `<nav>`, `<label>`, `<table>`) that provide keyboard support, screen reader semantics, and focus management for free.

### 5. Third-Party Dependency Trust
Teams embed third-party widgets (video players, maps, CAPTCHAs, chat widgets, analytics overlays) without verifying their accessibility. The FTC v. accessiBe settlement ($1 million, 2025) proved that accessibility overlay widgets can create more barriers than they remove.

### 6. No Automated Enforcement
Without accessibility linting in CI/CD (axe-core, eslint-plugin-jsx-a11y, Lighthouse CI), regressions are introduced silently with every deployment.

---

## Self-Check Questions

Before shipping any feature, the team should be able to answer "yes" to every question below:

1. **Keyboard:** Can every interactive element be reached and operated with Tab, Shift+Tab, Enter, Space, Escape, and Arrow keys alone?
2. **Focus:** Is a visible focus indicator present on every focusable element, meeting WCAG 2.4.13 minimum area and contrast?
3. **Screen reader:** Have you tested with at least one screen reader (NVDA + Firefox, VoiceOver + Safari, or JAWS + Chrome)? Are all elements announced with correct names, roles, and states?
4. **Alt text:** Does every non-decorative image have a descriptive `alt` attribute? Are decorative images marked with `alt=""`?
5. **Labels:** Is every form field programmatically associated with a visible `<label>`? Are error messages associated via `aria-describedby`?
6. **Contrast:** Do all text/background color pairs meet 4.5:1 (normal text) or 3:1 (large text) contrast ratios?
7. **Zoom:** Does the page remain functional and readable at 200% browser zoom?
8. **Color independence:** Is every piece of information conveyed by color also conveyed by text, icon, or pattern?
9. **Semantic HTML:** Are you using native elements (`<button>`, `<a>`, `<nav>`, `<main>`, `<dialog>`, `<table>`) instead of ARIA-patched `<div>` elements?
10. **Dynamic content:** Are AJAX updates, notifications, and status changes announced via ARIA live regions?
11. **Time limits:** Can users extend, adjust, or disable any time-limited feature?
12. **Skip link:** Does a "Skip to main content" link appear as the first focusable element?
13. **Modals:** Do dialogs trap focus, release on Escape, and return focus to the trigger on close?
14. **Third-party widgets:** Have all embedded components (video players, maps, CAPTCHAs) been tested for keyboard and screen reader accessibility?

---

## Code Smell Quick Reference

| Smell | Likely Anti-Pattern | Fix |
|-------|---------------------|-----|
| `<div onclick="...">` | #2 Div soup, #11 No keyboard | Use `<button>` |
| `outline: none` without replacement | #4 Missing focus indicator | Use `:focus-visible` with custom outline |
| `tabindex="5"` (positive values) | #20 Focus order mismatch | Use `tabindex="0"` or restructure DOM |
| `<img>` without `alt` | #1 Missing alt text | Add descriptive `alt` or `alt=""` for decorative |
| `<input>` without `<label for="">` | #10 Inaccessible forms | Add associated `<label>` element |
| `placeholder` as only label | #10 Inaccessible forms | Add visible `<label>`, keep placeholder as hint |
| `color: #999` on `#fff` background | #12 Low contrast | Check contrast ratio, use 4.5:1 minimum |
| `user-scalable=no` in viewport | #13 Non-resizable text | Remove, allow user zoom |
| `:hover` without `:focus` | #14 Mouse-only interaction | Add `:focus` and `:focus-within` |
| `role="menu"` on site nav | #6 ARIA misuse | Remove role or use `<nav>` with `<ul>` |
| `aria-role="..."` | #6 ARIA misuse (wrong syntax) | Use `role="..."` |
| `autoplay` without `muted` | #7 Auto-playing media | Add `muted` and visible controls |
| `setTimeout` + redirect | #8 Time limits | Add warning and extension mechanism |
| `<table>` without `<th>` | #19 Headerless tables | Add `<th scope="col/row">` and `<caption>` |
| `<div class="modal">` | #18 Inaccessible modal | Use `<dialog>` or add `role="dialog"` + focus management |
| DOM update without `aria-live` | #17 Silent dynamic content | Use `aria-live="polite"` or `role="alert"` |
| No skip link in `<body>` | #9 Missing skip navigation | Add `<a href="#main">` as first child |
| `border-color: red` as only error signal | #5 Color-only information | Add text message + icon + `aria-invalid` |
| reCAPTCHA v2 without alternative | #16 Inaccessible CAPTCHA | Use reCAPTCHA v3 or Turnstile |
| Scanned PDF without OCR | #15 PDF-only content | Provide HTML alternative or tagged PDF |

---

## Key Legal Cases and Regulatory Actions

| Case / Action | Year | Outcome | Key Lesson |
|---|---|---|---|
| **NFB v. Target Corp.** | 2006-2008 | $6 million settlement; Target required to make website accessible | First precedent: commercial websites must comply with ADA |
| **Robles v. Domino's Pizza** | 2016-2022 | Supreme Court declined Domino's appeal; settled after 6 years | ADA applies to websites; screen reader access is required |
| **Conner v. Parkwood Entertainment** (Beyonce.com) | 2019 | Class action for missing alt text, no keyboard access, broken navigation | Celebrity and entertainment sites are not exempt |
| **Gil v. Winn-Dixie** | 2016-2022 | Initially won at trial; reversed on appeal; vacated as moot | Legal landscape is evolving but risk remains |
| **FTC v. accessiBe** | 2025 | $1 million FTC settlement | Accessibility overlay widgets are not a compliance solution |
| **4,000+ ADA lawsuits** | 2024 | 69% targeted eCommerce; 22.6% targeted sites with overlay widgets | Volume is accelerating; no industry is safe |
| **2,014 ADA lawsuits (H1)** | 2025 | 37% increase over 2024; fines up to $115,231 first offense | Enforcement is intensifying year over year |

---

## Testing Toolkit

**Automated (catches ~30% of WCAG issues):**
- axe-core / axe DevTools (browser extension)
- Lighthouse accessibility audit (Chrome DevTools)
- eslint-plugin-jsx-a11y (React/JSX linting)
- Pa11y CI (CI/CD integration)
- WAVE (WebAIM browser extension)

**Screen Readers (essential for the other ~70%):**
- NVDA + Firefox (Windows, free)
- JAWS + Chrome (Windows, commercial)
- VoiceOver + Safari (macOS/iOS, built-in)
- TalkBack + Chrome (Android, built-in)

**Contrast and Color:**
- WebAIM Contrast Checker
- Chrome DevTools color picker (shows ratio inline)
- Stark (Figma/Sketch plugin)

**Keyboard Testing:**
- Unplug mouse; navigate entire site with Tab, Shift+Tab, Enter, Space, Escape, Arrow keys
- Check focus visibility at every step

---

## Sources

- [WebAIM Million 2025 Report](https://webaim.org/projects/million/)
- [WebAIM: To ARIA! The Cause of, and Solution to, All Our Accessibility Problems](https://webaim.org/blog/aria-cause-solution/)
- [Deque: WAI-ARIA Top 6 Mistakes to Avoid](https://www.deque.com/blog/wai-aria-top-6-mistakes-to-avoid/)
- [W3C: Understanding WCAG 2.1 SC 2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html)
- [W3C: Inaccessibility of CAPTCHA](https://www.w3.org/TR/turingtest/)
- [BOIA: Missing Input Labels](https://www.boia.org/blog/missing-input-labels-how-to-fix-a-common-accessibility-issue)
- [BOIA: Low Contrast Text Most Common Issue](https://www.boia.org/blog/low-contrast-text-remains-the-most-common-accessibility-issue-in-2023)
- [BOIA: Skip Navigation Links](https://www.boia.org/blog/skip-navigation-links-avoiding-common-accessibility-mistakes)
- [NFB v. Target Corp. Settlement](https://nfb.org/images/nfb/publications/bm/bm08/bm0809/bm080915.htm)
- [Robles v. Domino's Pizza Settlement](https://www.boia.org/blog/the-robles-v.-dominos-settlement-and-why-it-matters)
- [Conner v. Parkwood Entertainment (Beyonce.com)](https://www.billboard.com/music/music-news/beyonce-parkwood-entertainment-sued-website-accessibility-8492195/)
- [Gil v. Winn-Dixie (11th Circuit)](https://adasoutheast.org/legal/court/gil-v-winn-dixie-2021/)
- [FTC v. accessiBe ($1M Settlement)](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites)
- [Accessibility.Works: ADA Lawsuit Trends 2024](https://www.accessibility.works/blog/ada-lawsuit-trends-statistics-2024-summary/)
- [AudioEye: Website Accessibility in 2025](https://www.audioeye.com/post/website-accessibility-in-2025/)
- [TPGi: The Current State of Modal Dialog Accessibility](https://www.tpgi.com/the-current-state-of-modal-dialog-accessibility/)
- [Smashing Magazine: Accessibility Problem with CAPTCHA](https://www.smashingmagazine.com/2025/11/accessibility-problem-authentication-methods-captcha/)
- [A11Y Collective: Keyboard Trap](https://www.a11y-collective.com/blog/keyboard-trap/)
- [MDN: ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [FT Product & Technology: An Outbreak of Accessibility Anti-Patterns](https://medium.com/ft-product-technology/an-outbreak-of-accessibility-anti-patterns-e73577242ee8)
