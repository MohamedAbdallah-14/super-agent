# Accessibility Copy Patterns

> **Module Type:** Pattern
> **Domain:** Content -- Accessible Text and Screen Reader Communication
> **Authoritative Sources:** WCAG 2.2, WAI-ARIA Authoring Practices, Apple Accessibility Guidelines, Material Design Accessibility, NNG, WebAIM, Plain Language Action and Information Network (PLAIN)

---

## Quick Reference Checklist

1. Every informative image has alt text describing its purpose, not its appearance
2. Decorative images use `alt=""` (empty alt), never omit the attribute
3. ARIA labels supplement visual meaning -- never replace visible text
4. `aria-live="polite"` for non-urgent updates; `aria-live="assertive"` for critical alerts only
5. Live region containers exist in the DOM before content is injected
6. Focus management: move focus to the relevant element after state changes
7. Body text targets Flesch-Kincaid grade level 8 or lower
8. Sentences under 25 words; paragraphs under 5 sentences
9. Avoid idioms, metaphors, and culturally specific references in UI copy
10. Button and link text is unique and descriptive out of context ("View report" not "Click here")
11. Error messages are associated with their fields via `aria-describedby`
12. Form labels are visible and persistent -- never placeholder-only
13. Instructions don't rely solely on color, shape, or position ("the red button," "on the right")
14. Abbreviations are spelled out on first use; avoid acronyms in UI copy
15. Reading order matches visual order (DOM order = visual order)

---

## 1. Alt Text Guidelines

Alt text provides a text equivalent for non-text content. It is the single most impactful accessibility improvement for image-heavy interfaces (WebAIM Survey, 2024: missing alt text is the #1 accessibility issue users report).

### 1.1 Informative Images

Images that convey content or meaning. Alt text should describe the purpose and information the image communicates, not its visual appearance.

**Formula:** What information does this image add that isn't in the surrounding text?

| Image Type | Bad Alt | Good Alt | Why |
|-----------|---------|----------|-----|
| Product photo | "image1.jpg" | "Black leather messenger bag with brass buckle, front view" | Describes the product a shopper needs to evaluate |
| Chart | "chart" | "Bar chart showing revenue growth from $2M in Q1 to $4.8M in Q4 2024" | Conveys the data, not just the format |
| User avatar | "avatar" | "Sarah Chen" (or `alt=""` if name is shown adjacent) | Identifies the person |
| Screenshot | "screenshot" | "Settings page showing the notification preferences panel with email toggled on" | Describes what the user needs to see |
| Icon with text | "icon" | `alt=""` (decorative -- the adjacent text conveys meaning) | Icon reinforces text; alt would be redundant |
| Logo | "logo" | "[Company] logo" or "[Company] -- go to homepage" (if linked) | Identifies the brand; linked logos need destination context |
| Infographic | "infographic" | Brief summary + detailed description via `aria-describedby` or long description link | Complex images need both summary and detail |

### 1.2 Decorative Images

Images that serve purely aesthetic purposes -- backgrounds, spacers, visual flourishes.

**Rule:** Set `alt=""` (empty string). This tells screen readers to skip the image entirely. Never omit the `alt` attribute -- screen readers will read the filename instead.

```html
<!-- Correct: decorative image -->
<img src="divider-wave.svg" alt="" />

<!-- Wrong: screen reader says "divider dash wave dot svg" -->
<img src="divider-wave.svg" />

<!-- Wrong: redundant information -->
<img src="divider-wave.svg" alt="decorative wave divider" />
```

**Common decorative images:**
- Background textures and patterns
- Visual separators and dividers
- Purely aesthetic illustrations with no informational content
- Icons that duplicate adjacent text labels

### 1.3 Complex Images

Charts, diagrams, maps, and infographics require structured descriptions.

**Pattern:** Short alt text summarizing the key takeaway + detailed description elsewhere.

```html
<figure>
  <img src="revenue-chart.png"
       alt="Revenue doubled in 2024, from $2M in Q1 to $4.8M in Q4"
       aria-describedby="chart-detail" />
  <figcaption id="chart-detail">
    Quarterly revenue: Q1 $2.0M, Q2 $2.4M, Q3 $3.1M, Q4 $4.8M.
    Growth accelerated in Q3 after the enterprise plan launch.
  </figcaption>
</figure>
```

### 1.4 Image Alt Text Decision Tree

```
Does the image convey information not available in surrounding text?
+-- YES
|   +-- Is it a simple image? --> Write alt text (under 125 chars)
|   +-- Is it complex (chart, diagram)? --> Short alt + long description
|   +-- Is it a functional image (button, link)? --> Alt describes the action
+-- NO
    +-- Is it purely decorative? --> alt=""
    +-- Does it duplicate adjacent text? --> alt=""
    +-- Is it a spacer or layout element? --> alt="" (or use CSS instead)
```

---

## 2. ARIA Label Conventions

ARIA labels provide accessible names and descriptions for elements that lack visible text or whose visible text is insufficient for screen reader context.

### 2.1 When to Use ARIA Labels

| Scenario | ARIA Attribute | Example |
|----------|---------------|---------|
| Icon-only button | `aria-label` | `<button aria-label="Close dialog"><svg>...</svg></button>` |
| Redundant visible links | `aria-label` | `<a aria-label="View Q3 report details" href="...">View details</a>` |
| Navigation landmarks | `aria-label` | `<nav aria-label="Primary">` / `<nav aria-label="Breadcrumb">` |
| Search input | `aria-label` | `<input type="search" aria-label="Search projects" />` |
| Group of related controls | `aria-labelledby` | Group label references a visible heading |
| Field with extra instructions | `aria-describedby` | Links field to hint text or error message |

### 2.2 Rules for ARIA Labels

1. **Visible text first.** If a visible `<label>` or button text works, don't add ARIA. ARIA is a supplement, not a replacement for proper HTML semantics.
2. **Be concise.** ARIA labels are read aloud -- keep them short. "Close" not "Click this button to close the dialog window."
3. **Be specific.** "Delete project" not "Delete" when multiple delete buttons exist on the page.
4. **Match visual labels.** If the button says "Save," the `aria-label` (if needed) should contain "Save" -- users who dictate commands say what they see.
5. **Don't duplicate.** If `<button>Save</button>` is clear, adding `aria-label="Save"` is redundant and creates maintenance risk.
6. **Landmark labels must be unique.** Two `<nav>` elements need different `aria-label` values so screen readers can distinguish them.

### 2.3 Common ARIA Label Patterns

```html
<!-- Icon-only buttons -->
<button aria-label="Search">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Disambiguating repeated actions -->
<button aria-label="Delete 'Homepage Redesign' project">Delete</button>
<button aria-label="Delete 'API Migration' project">Delete</button>

<!-- Navigation landmarks -->
<nav aria-label="Primary navigation">...</nav>
<nav aria-label="Breadcrumb">
  <ol>...</ol>
</nav>

<!-- Complementary regions -->
<aside aria-label="Related articles">...</aside>

<!-- Table with complex header -->
<table aria-label="Team members and their roles">...</table>
```

---

## 3. Screen Reader Announcements

Dynamic content changes must be announced to screen reader users who cannot see visual updates.

### 3.1 Live Regions

Live regions are containers in the DOM that screen readers monitor for changes. When content changes inside a live region, the screen reader announces the update.

**Critical rule:** The live region container must exist in the DOM before content is injected. Adding `aria-live` simultaneously with content will NOT trigger an announcement.

```html
<!-- Correct: container exists on page load, empty -->
<div aria-live="polite" id="status"></div>
<!-- Later, JS injects: "3 results found" -- screen reader announces it -->

<!-- Wrong: container and content added simultaneously -->
<!-- Screen reader may not announce this -->
```

### 3.2 Politeness Settings

| Setting | Behavior | Use For |
|---------|----------|---------|
| `aria-live="polite"` | Announces when user is idle (after current speech) | Search results count, save confirmation, loading complete |
| `aria-live="assertive"` | Announces immediately, interrupting current speech | Form validation errors, session timeout warnings, critical alerts |
| `aria-live="off"` | Region is not monitored (default) | Content that changes frequently but doesn't need announcement |

**Rule:** Default to `polite`. Use `assertive` only for truly urgent information. Overusing `assertive` creates a noisy, frustrating experience.

### 3.3 Announcement Patterns

| Event | Announcement Text | Live Setting |
|-------|-------------------|-------------|
| Search results loaded | "[N] results found" or "No results found for '[query]'" | polite |
| Form saved | "Changes saved" | polite |
| Item deleted | "[Item name] deleted" | polite |
| Validation error | "[Field label]: [error message]" | assertive |
| Session expiring | "Your session expires in 2 minutes. Save your work." | assertive |
| New notification | "New notification: [summary]" | polite |
| Loading started | "Loading [content]..." | polite |
| Loading complete | "[Content] loaded" | polite |
| Filter applied | "Showing [N] results filtered by [criteria]" | polite |
| Sort changed | "Sorted by [field], [direction]" | polite |
| Page navigation | (Handled by browser -- ensure `<title>` updates) | N/A |
| Toast notification | (Use role="status" on the toast container) | polite |
| Error alert | (Use role="alert" -- implies assertive + atomic) | assertive |

### 3.4 Visually Hidden Announcements

For announcements that should be heard but not seen, use a visually hidden element.

```css
.sr-only {
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
```

```html
<div aria-live="polite" class="sr-only" id="search-status"></div>
```

---

## 4. Focus Management

When UI state changes, keyboard focus must move to the appropriate element so users don't get lost.

### 4.1 Focus Rules by State Change

| State Change | Focus Target | Why |
|-------------|-------------|-----|
| Modal opens | First focusable element inside modal | User needs to interact with modal content |
| Modal closes | Element that triggered the modal | User returns to their previous context |
| Inline error on submit | First field with an error | User needs to fix the error |
| Toast appears | Do NOT move focus | Toast is informational; moving focus is disorienting |
| Content loads (user-initiated) | First element of loaded content | User wanted this content |
| Content loads (auto) | Do NOT move focus | Unexpected focus change is disorienting |
| Item deleted from list | Next item in the list (or previous if last) | User's position should remain stable |
| Tab panel switches | First element in the new panel | User expects to interact with new panel content |
| Accordion expands | First element in expanded content | Content is now available for interaction |
| Drawer/sidebar opens | First focusable element in drawer | User needs to interact with drawer content |
| Drawer/sidebar closes | Element that triggered it | User returns to previous context |
| Page/route changes | Main content heading (`<h1>`) or skip-link target | User needs orientation on the new page |

### 4.2 Focus Trapping

Modals, dialogs, and overlays must trap focus inside them -- Tab and Shift+Tab should cycle within the modal, never escape to the page behind.

```
Tab from last focusable element --> loops to first focusable element
Shift+Tab from first focusable element --> loops to last focusable element
Escape key --> closes modal, returns focus to trigger
```

### 4.3 Skip Links

Provide a "Skip to main content" link as the first focusable element on every page. It should be visually hidden until focused.

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<!-- ...navigation... -->
<main id="main-content" tabindex="-1">...</main>
```

---

## 5. Cognitive Accessibility

Cognitive accessibility ensures content is understandable by users with learning disabilities, attention disorders, low literacy, or who are reading in a non-native language. It benefits all users under stress, multitasking, or time pressure.

### 5.1 Plain Language

**Flesch-Kincaid targets:**
- UI copy (buttons, labels, headings): Grade 6 or lower
- Help text and instructions: Grade 8 or lower
- Technical documentation: Grade 10 or lower (with glossary for terms)
- Legal/compliance copy: Grade 10 or lower (simplified version required alongside legal text)

**Plain language rules:**

| Rule | Bad | Good |
|------|-----|------|
| Use common words | "Utilize the configuration interface" | "Use the settings page" |
| Use short sentences | "In order to save your changes, you will need to click the save button that is located at the bottom of the form, and then wait for the confirmation." | "Click Save at the bottom of the form. You'll see a confirmation when it's done." |
| Use active voice | "Your password has been updated by the system" | "We updated your password" |
| One idea per sentence | "Enter your email and we'll send you a link to reset your password and you can set a new one." | "Enter your email. We'll send you a link to create a new password." |
| Front-load important info | "Due to maintenance activities scheduled for March 20, some features may be temporarily unavailable." | "Some features may be unavailable on March 20 during maintenance." |
| Avoid double negatives | "Don't forget to not leave fields blank" | "Fill in all fields" |
| Be specific | "An error occurred" | "We couldn't save your changes" |
| Avoid jargon | "Authenticate via SSO" | "Sign in with your company account" |

### 5.2 Chunking

Break content into scannable pieces. Users read UI text in an F-pattern -- they scan headings, first words of lines, and highlighted content.

| Technique | Application |
|-----------|------------|
| Short paragraphs | Maximum 3-4 sentences per paragraph in UI copy |
| Bullet lists | Use for 3+ parallel items instead of comma-separated lists |
| Headings | Every section of content gets a descriptive heading |
| White space | Generous spacing between sections (1.5-2em) |
| Progressive disclosure | Show summary first; detail on demand ("Show more") |
| Numbered steps | Use for sequential instructions (1, 2, 3) |

### 5.3 Consistent Terminology

Use one term for one concept throughout the entire interface.

| Inconsistent | Consistent |
|-------------|-----------|
| "Sign in" / "Log in" / "Login" on different pages | "Sign in" everywhere |
| "Remove" / "Delete" / "Erase" for the same action | "Delete" everywhere |
| "Workspace" / "Organization" / "Team" for the same concept | "Workspace" everywhere |
| "Preferences" / "Settings" / "Options" | "Settings" everywhere |

### 5.4 Reading Level Measurement

**Flesch-Kincaid Grade Level formula:**
```
0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
```

**Practical approach:** Use automated tools (Hemingway Editor, readability-score npm package, Microsoft Word readability statistics) to check critical UI text. Test with users who have low literacy or cognitive disabilities.

### 5.5 Dyslexia-Friendly Patterns

An estimated 15-20% of the population has some degree of dyslexia. These patterns improve readability for dyslexic users and benefit all users.

| Pattern | Guideline |
|---------|-----------|
| Font choice | Sans-serif fonts (Inter, Open Sans, Atkinson Hyperlegible). Avoid fonts where b/d, p/q, or I/l/1 are mirrors. |
| Font size | Minimum 16px body text; ideally 18-20px |
| Letter spacing | Slightly wider than default (0.05-0.12em); `letter-spacing: 0.05em` |
| Word spacing | Slightly wider (0.16em); `word-spacing: 0.16em` |
| Line height | 1.5 minimum, 1.8 ideal |
| Line length | 50-70 characters per line (45-75 acceptable range) |
| Alignment | Left-aligned, never justified (uneven word spacing impedes reading) |
| Background | Off-white or tinted backgrounds reduce glare (#FAFAFA, cream, light blue) |
| Text styling | Avoid all-caps for body text; use for short labels only (<3 words) |
| Paragraphs | Short, with clear visual spacing between them |

---

## 6. Instructions That Don't Rely on Sensory Characteristics

WCAG 1.3.3 requires that instructions do not depend solely on shape, color, size, position, or sound.

### 6.1 Anti-Patterns and Fixes

| Bad (relies on sensory) | Good (includes text reference) |
|------------------------|-------------------------------|
| "Click the green button" | "Click Save" (the button also happens to be green) |
| "The option on the right" | "The Export option" |
| "See the red error above" | "See the error message next to the email field" |
| "Press the round icon" | "Press the Search button" |
| "The section highlighted in yellow" | "The Billing section" |
| "You'll hear a beep when done" | "You'll see and hear a confirmation when done" |

---

## 7. Form Accessibility Copy

Forms are where accessibility copy matters most. Every field needs a label. Every error needs explanation. Every constraint needs disclosure.

### 7.1 Labels

| Rule | Example |
|------|---------|
| Visible label above or beside every field | `<label for="email">Email address</label>` |
| Never use placeholder as the only label | Placeholder disappears on input -- the label doesn't |
| Required fields marked consistently | "Email address (required)" or asterisk with legend |
| Group related fields | `<fieldset><legend>Shipping address</legend>...</fieldset>` |

### 7.2 Help Text

```html
<label for="password">Password</label>
<input id="password" type="password" aria-describedby="password-help" />
<span id="password-help">At least 8 characters with one number and one symbol.</span>
```

Show constraints before the user encounters them, not after they fail validation.

### 7.3 Error Association

```html
<label for="email">Email address</label>
<input id="email" type="email" aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Enter an email address like name@example.com</span>
```

**Rules:**
- Link error to field via `aria-describedby`
- Set `aria-invalid="true"` on the field
- Use `role="alert"` on the error message for immediate announcement
- Remove error and `aria-invalid` as soon as input becomes valid

---

## 8. Anti-Patterns

### 8.1 Missing Alt Text

The #1 reported accessibility issue (WebAIM Million, 2024). Screen readers say the filename, which is meaningless. **Fix:** Alt text on every informative image; `alt=""` on decorative images.

### 8.2 "Click Here" Links

"Click here" and "Read more" are meaningless out of context. Screen reader users navigate by link list -- they hear all links on the page listed. **Fix:** "View the accessibility guidelines" or "Read the Q3 report."

### 8.3 Overusing ARIA

Adding ARIA to elements that already have semantic meaning. `<button aria-label="Submit" role="button">Submit</button>` -- the ARIA is redundant and could conflict. **Fix:** Use proper HTML semantics first. Add ARIA only to fill gaps.

### 8.4 Assertive Abuse

Using `aria-live="assertive"` for routine updates. Interrupts the user's reading flow constantly. **Fix:** Default to `polite`. Reserve `assertive` for errors and time-critical alerts.

### 8.5 Placeholder-Only Labels

Using `placeholder` as the field label. It disappears on input, leaving the user unable to verify what the field is for. Placeholder text has insufficient contrast in most browsers. **Fix:** Always use a visible `<label>`.

### 8.6 Ambiguous Button Text

Multiple buttons labeled "Delete" or "Edit" on the same page with no distinguishing context. Screen readers read "Delete. Delete. Delete." **Fix:** Use `aria-label` to add context: "Delete 'Project Atlas'."

### 8.7 Focus Trap Without Escape

Trapping focus in a modal but not implementing Escape key to close. The user is stuck. **Fix:** Always bind Escape to close modals and return focus to the trigger.

### 8.8 Color-Only Indicators

Using only red/green to indicate error/success states. Users with color blindness cannot distinguish them. **Fix:** Pair color with icons and text labels.

### 8.9 Auto-Playing Media

Content that speaks or plays sound immediately, interfering with screen reader audio. **Fix:** Never auto-play with sound. Provide clear play controls.

### 8.10 Moving or Blinking Content

Content that moves, blinks, or auto-scrolls without user control. Causes issues for users with vestibular disorders, attention disorders, and seizure conditions. **Fix:** Respect `prefers-reduced-motion`. Provide pause/stop controls. Never flash more than 3 times per second.

---

## 9. Testing Accessibility Copy

### 9.1 Automated Checks

| Tool | What It Catches |
|------|----------------|
| axe-core | Missing alt text, missing labels, ARIA misuse, contrast |
| Lighthouse | Alt text, ARIA, heading hierarchy, link text |
| eslint-plugin-jsx-a11y | Missing alt, missing labels in JSX at build time |
| pa11y | Automated accessibility audit on rendered pages |
| Flesch-Kincaid tools | Reading level of UI copy |

### 9.2 Manual Checks

| Check | How |
|-------|-----|
| Screen reader walkthrough | Use VoiceOver (macOS/iOS), NVDA (Windows), TalkBack (Android) to navigate every screen |
| Keyboard-only navigation | Unplug the mouse. Tab through every interactive element. Can you reach everything? |
| Link list test | Open the screen reader's link list. Are all links descriptive out of context? |
| Heading hierarchy | Open the screen reader's heading list. Does the hierarchy make sense? |
| Zoom to 200% | Does all content remain visible and usable at 200% browser zoom? |
| Color contrast | Check all text and interactive elements against WCAG AA (4.5:1 body, 3:1 large/UI) |

---

## 10. Decision Tree

### 10.1 Choosing the Right ARIA Approach

```
Does the element have visible text that describes its purpose?
+-- YES
|   +-- Is the text unique on the page? --> No ARIA needed
|   +-- Is the text repeated (multiple "Edit" buttons)? --> Add aria-label with context
+-- NO
    +-- Is it an icon-only control? --> aria-label with the action name
    +-- Is it a landmark? --> aria-label to distinguish from other landmarks
    +-- Is it a live-updating region? --> aria-live with appropriate politeness
    +-- Is it a complex widget? --> Follow WAI-ARIA Authoring Practices for that pattern
```

### 10.2 Choosing Alt Text Strategy

```
What type of image is it?
+-- Purely decorative --> alt=""
+-- Icon next to text label --> alt="" (text provides the meaning)
+-- Informative photo --> Describe the content and purpose (under 125 chars)
+-- Complex chart/diagram --> Short alt summary + aria-describedby for details
+-- Linked image (logo, thumbnail) --> Alt describes the link destination
+-- Image of text --> Alt contains the text in the image
+-- User-uploaded content --> Prompt users to add alt text; use AI-generated as fallback
```

---

## References

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices 1.2](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Million - Annual Accessibility Analysis](https://webaim.org/projects/million/)
- [WebAIM - Alternative Text](https://webaim.org/techniques/alttext/)
- [Apple - Accessibility](https://developer.apple.com/accessibility/)
- [Material Design - Accessibility](https://m3.material.io/foundations/accessible-design/overview)
- [NNG - Accessibility Guidelines](https://www.nngroup.com/topic/accessibility/)
- [NNG - Plain Language](https://www.nngroup.com/articles/plain-language-experts/)
- [W3C - ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [PLAIN - Federal Plain Language Guidelines](https://www.plainlanguage.gov/guidelines/)
- [Hemingway Editor](https://hemingwayapp.com/)
- [British Dyslexia Association - Dyslexia Friendly Style Guide](https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide)
- [Atkinson Hyperlegible Font](https://brailleinstitute.org/freefont)
