# CSS & Layout Anti-Patterns

> CSS anti-patterns are styling decisions that appear to solve a visual problem but create compounding maintenance debt, cross-browser regressions, and accessibility failures. They rarely trigger errors -- the page renders, the feature ships -- but they erode the UI layer until every small design change becomes a high-risk deployment.

> **Domain:** Frontend
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: !important Overuse

**Also known as:** Specificity Sledgehammer, Nuclear Option
**Frequency:** Very Common | **Severity:** Critical | **Detection difficulty:** Easy

**What it looks like:**

```css
.sidebar .nav .link        { color: blue !important; }
.sidebar .nav .link.active { color: red !important; }  /* override the override */
body .sidebar .nav .link.active.highlighted {
  color: green !important;  /* override the override's override */
}
```

**Why developers do it:** A style is not applying due to higher specificity elsewhere. `!important` is the fastest way to "win." Third-party CSS (Bootstrap, Material UI) with high specificity makes it feel like the only escape.

**What goes wrong:** Each `!important` raises the floor for every future override, creating an arms race. The cascade -- CSS's core mechanism -- is effectively disabled. NexterWP documented that heavy `!important` usage correlated with 3-4x longer debugging sessions.

**The fix:**

```css
/* BEFORE */
.sidebar .nav .link { color: blue !important; }

/* AFTER: cascade layers */
@layer base, components, overrides;
@layer components { .nav-link { color: blue; } }
@layer overrides  { .nav-link.active { color: red; } }
```

**Detection rule:** Stylelint `declaration-no-important`. Flag files with more than 3 `!important` declarations.

---

### AP-02: Specificity Wars

**Also known as:** Specificity Creep, Selector Arms Race
**Frequency:** Very Common | **Severity:** Critical | **Detection difficulty:** Moderate

**What it looks like:**

```css
.card .header .title                       { font-size: 18px; }
.page .content .card .header .title        { font-size: 16px; }
div.page div.content div.card div.header h2.title { font-size: 20px; }
#main-page .card .header .title            { font-size: 14px; }
```

**Why developers do it:** Each developer sees their style "not working" and responds by outweighing the existing selector. Without an agreed specificity strategy, the stylesheet becomes a competition.

**What goes wrong:** Specificity is a one-way ratchet: it only goes up. Eventually the only options are `!important` or inline styles. Refactoring is perilous because removing a high-specificity selector lets other rules "win" unexpectedly. Rendering performance degrades as the browser evaluates increasingly complex selectors.

**The fix:**

```css
/* BEFORE */ .page .content .card .header .title { font-size: 16px; }
/* AFTER: flat, single-class selectors */
@layer components {
  .card-title        { font-size: 1rem; }
  .card-title--large { font-size: 1.25rem; }
}
```

**Detection rule:** Stylelint `selector-max-specificity: "0,3,0"`. Flag selectors with more than 3 combinators.

---

### AP-03: IDs for Styling

**Also known as:** ID Selector Abuse, Overpowered Selectors
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Easy

**What it looks like:**

```css
#header     { background: navy; }
#header #nav { display: flex; }
#sidebar    { width: 300px; }
```

**Why developers do it:** IDs are already in the HTML for JS hooks or anchor links. Using them in CSS feels natural.

**What goes wrong:** One ID selector (`[1,0,0]`) outweighs 10 class selectors (`[0,10,0]`). Component reuse is impossible -- IDs are unique per page. Wikimedia adopted `selector-max-id: 0` after ID-based styles blocked theming across their skin system.

**The fix:**

```css
/* BEFORE */ #header { background: navy; }
/* AFTER  */ .site-header { background: navy; }
```

**Detection rule:** Stylelint `selector-max-id: 0`.

---

### AP-04: Magic Numbers

**Also known as:** Unexplained Constants, Brute-forced Positioning
**Frequency:** Very Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```css
.dropdown { top: 37px; left: -4px; width: 218px; }
.modal-overlay { padding-top: 147px; margin-left: -3px; }
```

**Why developers do it:** Pixel-nudging in DevTools produces numbers that "look right." Under time pressure the value gets committed without a comment or calculation. CSS-Tricks described magic numbers as values "used because it just works."

**What goes wrong:** Magic numbers are brittle to any context change (different font, browser, viewport). CSS Wizardry identified them as a primary indicator of "brute-forced" CSS where the developer forced a layout rather than understanding the box model.

**The fix:**

```css
/* BEFORE */ .dropdown { top: 37px; }
/* AFTER  */ .dropdown { top: calc(var(--header-height) + var(--spacing-xs)); }
```

**Detection rule:** Flag px values above 10 that are not multiples of 4 or 8 and not in a CSS variable. Flag negative margins.

---

### AP-05: No CSS Custom Properties

**Also known as:** Hardcoded Tokens, Copy-paste Values
**Frequency:** Very Common | **Severity:** High | **Detection difficulty:** Easy

**What it looks like:**

```css
.header  { background: #1a73e8; }
.button  { background: #1a73e8; }
.link    { color: #1a73e8; }
/* Brand color change? Find-and-replace across 47 files. */
```

**Why developers do it:** Legacy codebases predate custom property support (~2017). Developers copy hex codes from the design file directly. Without a design system, there is no single source of truth.

**What goes wrong:** Theming and dark mode become impossible without variables. Penpot's developer guide documented that design tokens eliminated theme-switching bugs caused by scattered raw values. Subtle inconsistencies creep in when developers use slightly different shades.

**The fix:**

```css
/* BEFORE */ .header { background: #1a73e8; }
/* AFTER  */
:root { --color-primary: #1a73e8; }
.header { background: var(--color-primary); }
```

**Detection rule:** Flag any hex/rgb/hsl literal appearing more than twice. Stylelint plugin `stylelint-declaration-strict-value`.

---

### AP-06: Hardcoded Pixel Values for Layout

**Also known as:** Pixel Rigidity, Non-responsive Sizing
**Frequency:** Very Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```css
.container { width: 960px; }
.heading   { font-size: 24px; line-height: 32px; }
```

**Why developers do it:** Pixels map 1:1 to the design file. Relative units (`rem`, `em`, `%`) require understanding cascading font sizes, adding cognitive load.

**What goes wrong:** MDN warns that fixed heights cause content overflow. Users who increase browser font size get no benefit because `px` does not scale. WCAG 1.4.4 requires text resizable to 200% without content loss, which pixel-locked layouts break.

**The fix:**

```css
/* BEFORE */ .container { width: 960px; }
/* AFTER  */ .container { width: min(90vw, 60rem); }
/* BEFORE */ .heading { font-size: 24px; }
/* AFTER  */ .heading { font-size: 1.5rem; }
```

**Detection rule:** Flag `font-size` using `px`. Flag `width`/`max-width` on layout containers using `px` values over 100.

---

### AP-07: Z-index Wars

**Also known as:** Z-index Inflation, Stacking Context Chaos
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```css
.dropdown { z-index: 100; }
.modal    { z-index: 9999; }
.toast    { z-index: 99999; }
.tooltip  { z-index: 999999; }
```

**Why developers do it:** A new element appears behind something else; the developer picks a higher number. Josh Comeau documented how `transform` and `opacity` create new stacking contexts, making z-index comparisons meaningless across contexts.

**What goes wrong:** Smashing Magazine found that teams without a z-index scale averaged 15+ distinct values, with dropdowns above modals, tooltips behind overlays, and accessibility-critical focus traps hidden.

**The fix:**

```css
/* BEFORE */ .modal { z-index: 9999; }
/* AFTER  */
:root { --z-dropdown: 10; --z-overlay: 30; --z-modal: 40; --z-toast: 50; }
.modal { z-index: var(--z-modal); }
```

**Detection rule:** Flag any raw `z-index` value greater than 100. Require z-index values to reference CSS variables.

---

### AP-08: Inline Styles

**Also known as:** Style Attribute Abuse, HTML-embedded CSS
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Easy

**What it looks like:**

```html
<div style="margin-top: 20px; padding: 15px; background: #f0f0f0;
            border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  <h2 style="font-size: 18px; color: #333;">Title</h2>
</div>
```

**Why developers do it:** Inline styles always "work" (highest specificity). React's `style={{ }}` encourages the pattern. Quick fixes during QA produce inline patches that never get refactored.

**What goes wrong:** Inline styles cannot use media queries, pseudo-classes, or cascade layers. CSP headers may block them. Salesforce's LWC documentation explicitly categorizes them as an anti-pattern preventing style encapsulation.

**The fix:**

```css
/* Move to stylesheet */
.card {
  margin-block-start: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--surface-secondary);
}
```

**Detection rule:** Flag `style=` attributes in HTML/JSX. ESLint plugin `react/no-inline-styles`. Allow only for dynamic values (e.g., `style="--progress: 72%"`).

---

### AP-09: Global CSS Without Scoping

**Also known as:** Namespace Pollution, Style Leakage
**Frequency:** Very Common | **Severity:** Critical | **Detection difficulty:** Moderate

**What it looks like:**

```css
h2 { font-size: 24px; margin: 0; }
a { color: blue; text-decoration: none; }
input { border: 1px solid #ccc; padding: 8px; }
.title { font-weight: bold; }     /* which title? */
.container { max-width: 1200px; } /* whose container? */
```

**Why developers do it:** Global resets are legitimate, but the boundary between "base" and "component" is blurry. Adding styles to the global sheet is the path of least resistance.

**What goes wrong:** QuirksBlog's analysis noted global styles are the primary source of "mysterious" regressions where adding a component in one area breaks styling in another.

**The fix:**

```css
/* BEFORE */ .title { font-weight: bold; }
/* AFTER: @scope */
@scope (.card) { .title { font-weight: bold; } }
/* Or CSS Modules: .title compiles to .card_title_x7f2a */
```

**Detection rule:** Flag bare element selectors outside reset/base layers. Flag short class names (< 5 chars) in global stylesheets.

---

### AP-10: Deeply Nested Selectors

**Also known as:** Selector Inception, Over-qualified Selectors
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Easy

**What it looks like:**

```scss
.page { .main { .content { .article { .body {
  .link { color: blue; &:hover { color: darkblue; } }
} } } } }
/* Compiles to: .page .main .content .article .body .link */
```

**Why developers do it:** SCSS nesting makes it easy to mirror the DOM tree. It feels like scoping. The gitea project filed an issue to ban deeply nested selectors after maintainability collapsed.

**What goes wrong:** The compiled selector is fragile to DOM restructuring. Browser selector matching runs right-to-left, so deep nesting forces traversal up the DOM tree per candidate element. Generated CSS is physically larger.

**The fix:**

```css
/* BEFORE */ .page .main .content .article .body .link { color: blue; }
/* AFTER  */ .article-link { color: blue; }
```

**Detection rule:** Stylelint `selector-max-compound-selectors: 3`. Enforce max SCSS nesting depth of 3.

---

### AP-11: No Spacing System

**Also known as:** Ad-hoc Spacing, Margin Roulette
**Frequency:** Very Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```css
.card    { padding: 17px; margin-bottom: 23px; }
.sidebar { padding: 12px 19px; }
.header  { margin: 11px 0 14px; }
```

**Why developers do it:** Each developer eyeballs spacing to match a design comp, producing values that differ by 1-3px.

**What goes wrong:** USWDS standardized on 8px spacing because ad-hoc spacing produced visual inconsistency across 200+ government websites. The GC Design System documented that spacing tokens eliminated design-to-code discrepancies.

**The fix:**

```css
/* BEFORE */ .card { padding: 17px; margin-bottom: 23px; }
/* AFTER  */
:root { --sp-sm: 0.5rem; --sp-md: 1rem; --sp-lg: 1.5rem; --sp-xl: 2rem; }
.card { padding: var(--sp-md); margin-block-end: var(--sp-lg); }
```

**Detection rule:** Flag `padding`/`margin` values not referencing a CSS variable or not multiples of 4.

---

### AP-12: Fixed Heights on Content Containers

**Also known as:** Height Lock, Content Overflow Trap
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```css
.card-body { height: 200px; }
.nav-item  { height: 44px; overflow: hidden; } /* hides the problem */
```

**Why developers do it:** The design comp shows a card at 200px tall. Fixed heights make grids look uniform. Developers do not test with longer text or different languages.

**What goes wrong:** MDN warns: "A set height can cause content to overflow." German translations average 30% longer than English. `overflow: hidden` merely hides clipped content. WCAG requires text to remain visible at 200% zoom.

**The fix:**

```css
/* BEFORE */ .card-body { height: 200px; }
/* AFTER  */ .card-body { min-height: 12.5rem; }
```

**Detection rule:** Flag `height` on text-containing elements. Flag `height` paired with `overflow: hidden`.

---

### AP-13: No Logical Properties

**Also known as:** Physical-direction Lock, LTR-only CSS
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Easy

**What it looks like:**

```css
.sidebar { margin-left: 20px; padding-right: 16px; border-left: 2px solid #ccc; text-align: left; }
```

**Why developers do it:** Physical properties have been the default for 25+ years. If the team only targets LTR languages, the problem is invisible.

**What goes wrong:** Smashing Magazine documented that teams adding RTL support faced weeks of manually replacing every `left` with `right`. Logical properties (`inline-start`/`inline-end`) flip automatically based on `dir` and `writing-mode`.

**The fix:**

```css
/* BEFORE */ .sidebar { margin-left: 20px; text-align: left; }
/* AFTER  */ .sidebar { margin-inline-start: 1.25rem; text-align: start; }
```

**Detection rule:** Stylelint `liberty/use-logical-spec`. Flag `margin-left/right`, `padding-left/right`, `text-align: left/right`.

---

### AP-14: Duplicated Style Blocks

**Also known as:** Copy-paste CSS, Style Clones
**Frequency:** Very Common | **Severity:** Medium | **Detection difficulty:** Moderate

**What it looks like:**

```css
.card     { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 16px; }
.modal    { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 16px; }
.dropdown { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 16px; }
```

**Why developers do it:** Each component was built independently. Without a shared utility or mixin, duplication is faster.

**What goes wrong:** Updating the shadow requires finding every copy. Missed copies drift and produce visual inconsistency. The CSS bundle inflates with redundant bytes.

**The fix:**

```css
/* BEFORE: 3 identical blocks */
/* AFTER: shared composition */
.surface-elevated {
  background: var(--surface-primary); border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm); padding: var(--spacing-md);
}
/* HTML: <div class="card surface-elevated"> */
```

**Detection rule:** Flag rule blocks with 3+ identical property-value pairs appearing in 2+ selectors. Tool: `csscss`.

---

### AP-15: Media Query Chaos

**Also known as:** Breakpoint Sprawl, Query Spaghetti
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```css
/* header.css */ @media (max-width: 768px)  { .header { ... } }
/* nav.css    */ @media (max-width: 767px)  { .nav { ... } }    /* off-by-1! */
/* card.css   */ @media (max-width: 800px)  { .card { ... } }   /* different bp */
/* sidebar.css*/ @media (max-width: 375px)  { ... }             /* device-specific */
```

**Why developers do it:** Each developer picks breakpoints based on when "it looks broken." `768px` vs `767px` seems equivalent but creates a 1px dead zone.

**What goes wrong:** Inconsistent breakpoints create gaps where no query applies, causing layout glitches. Debugging requires mentally combining queries from dozens of files. Device-specific breakpoints chase individual devices rather than content needs.

**The fix:**

```css
/* BEFORE: scattered breakpoints */
/* AFTER: centralized, mobile-first */
.card { flex-direction: column; }
@media (min-width: 48rem) { .card { flex-direction: row; } }
```

**Detection rule:** Extract all breakpoint values; flag more than 5 distinct values. Flag `max-width`/`min-width` pairs differing by 1px.

---

### AP-16: JavaScript for CSS-solvable Layout

**Also known as:** JS-driven Layout, Script-dependent Styling
**Frequency:** Occasional | **Severity:** High | **Detection difficulty:** Moderate

**What it looks like:**

```javascript
// Equalizing card heights with JS
const cards = document.querySelectorAll('.card');
let max = 0;
cards.forEach(c => { max = Math.max(max, c.offsetHeight); });
cards.forEach(c => { c.style.height = max + 'px'; });

// Viewport detection
window.addEventListener('resize', () => {
  sidebar.classList.toggle('collapsed', window.innerWidth < 768);
});
```

**Why developers do it:** Before Grid/Flexbox/container queries, JS was the only way. Developers trained pre-2015 still reach for it.

**What goes wrong:** JS layout runs after paint, causing visible layout shifts (CLS). Resize listeners fire dozens of times per second without throttling. Layout breaks entirely when JS fails. CSS solutions are declarative and hardware-accelerated.

**The fix:**

```css
/* BEFORE: JS equal heights */
/* AFTER: CSS Grid (equal heights by default) */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
```

**Detection rule:** Flag JS that reads `offsetHeight`/`offsetWidth` and writes `style.height`/`style.width` in the same function. Flag `resize` listeners toggling classes.

---

### AP-17: Text Overflow Ignored

**Also known as:** Clipped Content, Invisible Text
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Hard

**What it looks like:**

```css
.username      { width: 120px; /* no overflow handling */ }
.product-title { /* overflows container on mobile */ }
```

**Why developers do it:** Testing with "John Doe" and "Product A." Real data includes 60-character names, 200-char URLs, and German compound words.

**What goes wrong:** Unhandled overflow causes horizontal scrollbars on mobile, overlapping elements, broken grids, and invisible content. Screen readers announce text that is visually clipped.

**The fix:**

```css
/* BEFORE */ .username { width: 120px; }
/* AFTER  */
.username {
  max-width: 120px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
/* Long unbreakable strings */
.url-display { overflow-wrap: break-word; word-break: break-all; }
```

**Detection rule:** Flag elements with fixed `width` but no `overflow` or `text-overflow`. Test with 100+ character strings.

---

### AP-18: Floats for Page Layout

**Also known as:** Float-based Grid, Clearfix Architecture
**Frequency:** Occasional (legacy) | **Severity:** High | **Detection difficulty:** Easy

**What it looks like:**

```css
.col-left  { float: left; width: 33.33%; }
.col-right { float: left; width: 66.66%; }
.row::after { content: ""; display: table; clear: both; }
```

**Why developers do it:** Pre-Flexbox (2012) and pre-Grid (2017), floats were the only cross-browser method. Bootstrap 3 (still in use) uses float grids.

**What goes wrong:** Floats were designed for text wrapping, not layout. They require clearfix hacks, cannot achieve equal-height columns, and break when content exceeds expected width.

**The fix:**

```css
/* BEFORE: float grid */
/* AFTER: CSS Grid */
.row { display: grid; grid-template-columns: 1fr 2fr; gap: var(--spacing-md); }
```

**Detection rule:** Flag `float: left/right` paired with percentage `width`. Flag `.clearfix` or `clear: both`.

---

### AP-19: Mixing Layout and Component Concerns

**Also known as:** Self-placing Components, Margin Ownership Ambiguity
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Hard

**What it looks like:**

```css
.card {
  background: white; border-radius: 8px; padding: 16px;   /* component (fine) */
  margin-bottom: 24px; margin-left: 16px; width: 350px;   /* layout (problem) */
}
```

**Why developers do it:** Adding `margin-bottom` to the card is faster than creating a layout wrapper. The developer does not anticipate reuse in a different context.

**What goes wrong:** The component cannot be placed in a different layout without overriding self-imposed margins and width. Spacing becomes unpredictable when margins collapse. The "last child trailing margin" creates edge bugs.

**The fix:**

```css
/* BEFORE: component owns positioning */
.card { padding: 16px; margin-bottom: 24px; width: 350px; }
/* AFTER: separate concerns */
.card { padding: var(--spacing-md); }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg); }
```

**Detection rule:** Flag components declaring `margin` (except `margin: 0`), fixed `width`, or `float`. Only layout containers should define child spacing.

---

### AP-20: Not Testing Across Viewports

**Also known as:** Desktop-only Development, Viewport Blindness
**Frequency:** Very Common | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**

```css
/* Works on 1440px MacBook Pro */
.dashboard { display: grid; grid-template-columns: 240px 1fr 320px; }
.hero-text { font-size: 3.5rem; }
/* Untested: 320px mobile, 768px tablet, 2560px ultra-wide */
```

**Why developers do it:** Developers work on a single monitor (1280-1440px). DevTools device emulation requires deliberate effort. CI pipelines rarely include visual regression tests.

**What goes wrong:** Mobile accounts for 50-60% of web traffic. Untested viewports produce overlapping elements, horizontal scrollbars, unreadable text, and touch targets below WCAG's 44x44px minimum.

**The fix:**

```css
/* BEFORE: single viewport */
.dashboard { grid-template-columns: 240px 1fr 320px; }
/* AFTER: responsive */
.dashboard { grid-template-columns: 1fr; }
@media (min-width: 48rem) { .dashboard { grid-template-columns: 240px 1fr; } }
@media (min-width: 75rem) { .dashboard { grid-template-columns: 240px 1fr 320px; } }
```

**Detection rule:** Run visual regression tests (Playwright, Percy) at 320px, 768px, 1440px in CI. Flag components with grid/flex but zero media queries.

---

## Root Cause Analysis

| Root Cause | Contributing Anti-patterns | Systemic Fix |
|---|---|---|
| **No design tokens / style guide** | AP-04, AP-05, AP-06, AP-11 (magic numbers, no variables, hardcoded px, no spacing) | Adopt CSS custom properties with spacing/color/typography scales |
| **Specificity ignorance** | AP-01, AP-02, AP-03, AP-10 (!important, wars, IDs, nesting) | Teach cascade layers (`@layer`), enforce flat selectors, adopt BEM or CSS Modules |
| **Legacy CSS knowledge** | AP-18, AP-06, AP-13, AP-16 (floats, px, no logical props, JS layout) | Team training on modern CSS: Grid, Flexbox, `clamp()`, container queries |
| **Component isolation failure** | AP-09, AP-19, AP-14 (global CSS, mixed concerns, duplicated styles) | CSS Modules, `@scope`, or strict BEM naming with lint enforcement |
| **Single-viewport development** | AP-20, AP-06, AP-12 (no testing, hardcoded px, fixed heights) | Visual regression testing in CI across 3+ viewports; mobile-first workflow |
| **No linting or CI enforcement** | All anti-patterns | Stylelint with project-specific rules; block merges on violations |
| **Time pressure / quick fixes** | AP-01, AP-08, AP-04, AP-14 (!important, inline, magic numbers, duplication) | CSS refactoring budget per sprint; CSS-specific review checklist |
| **Copy-paste from StackOverflow** | AP-04, AP-07, AP-18 (magic numbers, z-index, floats) | Code review requirement for CSS; up-to-date internal style guide |
| **Missing i18n planning** | AP-13, AP-12, AP-17 (no logical props, fixed heights, text overflow) | Logical properties by default; test with long/RTL strings from sprint 1 |
| **No CSS architecture strategy** | AP-02, AP-09, AP-15 (specificity, global CSS, media query chaos) | Adopt ITCSS, Cube CSS, or cascade layers; document in ADR |

## Self-Check Questions

1. Search your codebase for `!important`. Is the count under 10? Can you justify each instance?
2. What is the highest specificity selector in your stylesheet? Is it above `[0, 3, 0]`?
3. Pick any hex color in your CSS -- does it come from a variable? Pick any spacing value -- does it come from a scale?
4. List every `z-index` value. Do they follow a documented scale? Are any over 100?
5. Resize your app to 320px wide. Is there a horizontal scrollbar? Are touch targets at least 44px?
6. Replace a username with 60 characters and a product title with 200 characters. Does the layout survive?
7. Add `dir="rtl"` to `<html>`. Do sidebars and margins mirror correctly?
8. Search for `float: left` with percentage widths. Can those layouts be Grid or Flexbox?
9. Take your `.card` component and place it in a different layout context. Does it work without overrides?
10. Extract every breakpoint value from all media queries. How many distinct values? Do any differ by 1px?
11. What is the longest compiled selector? More than 3 levels deep?
12. Search for `height:` on text-containing elements. Could any be `min-height` instead?
13. How many `style=` attributes exist in your HTML/JSX? Are any static styles that belong in a stylesheet?
14. Does your JS read element dimensions and set dimensions? Could CSS `clamp()`, Grid, or container queries replace it?
15. How many bare element selectors (`h1`, `p`, `a`) exist outside your CSS reset?

## Code Smell Quick Reference

| Smell | AKA | Severity | Frequency | Key Signal | First Action |
|---|---|---|---|---|---|
| !important Overuse | Specificity Sledgehammer | Critical | Very Common | `!important` count > 10 | Introduce cascade layers |
| Specificity Wars | Selector Arms Race | Critical | Very Common | 4+ combinator selectors | Flatten to single-class BEM |
| IDs for Styling | Overpowered Selectors | High | Common | `#id` in stylesheets | Replace with class selectors |
| Magic Numbers | Unexplained Constants | High | Very Common | Non-standard px values | Extract to CSS variables |
| No CSS Variables | Hardcoded Tokens | High | Very Common | Same hex in 3+ places | Centralize to `:root` vars |
| Hardcoded Pixels | Pixel Rigidity | High | Very Common | `font-size` in px | Convert to rem/clamp() |
| Z-index Wars | Z-index Inflation | High | Common | `z-index: 9999` | Create named z-index scale |
| Inline Styles | Style Attribute Abuse | High | Common | `style=` in HTML/JSX | Move to stylesheet classes |
| Global CSS | Namespace Pollution | Critical | Very Common | Bare element selectors | Add @scope or CSS Modules |
| Deep Nesting | Selector Inception | High | Common | 4+ levels SCSS nesting | Flatten with BEM classes |
| No Spacing System | Margin Roulette | High | Very Common | Inconsistent px margins | Adopt spacing scale tokens |
| Fixed Heights | Content Overflow Trap | High | Common | `height` on text containers | Change to `min-height` |
| No Logical Props | LTR-only CSS | Medium | Common | `margin-left`/`right` | Use inline-start/end |
| Duplicated Styles | Copy-paste CSS | Medium | Very Common | Identical rule blocks | Extract shared class |
| Media Query Chaos | Breakpoint Sprawl | High | Common | 5+ distinct breakpoints | Centralize breakpoint tokens |
| JS for Layout | Script-dependent Styling | High | Occasional | JS reading/writing dims | Replace with CSS Grid |
| Text Overflow Ignored | Clipped Content | Medium | Common | Fixed width, no overflow | Add text-overflow |
| Floats for Layout | Clearfix Architecture | High | Occasional | `float` + % width | Convert to CSS Grid |
| Mixed Concerns | Self-placing Components | Medium | Common | Components with margin | Separate layout/component |
| No Viewport Testing | Desktop-only Dev | Critical | Very Common | Zero visual regression tests | Add CI viewport tests |

---
*Researched: 2026-03-08 | Sources: [CSS-Tricks: Magic Numbers in CSS](https://css-tricks.com/magic-numbers-in-css/), [CSS Wizardry: Code Smells in CSS](https://csswizardry.com/2012/11/code-smells-in-css/), [Smashing Magazine: Managing Z-Index in Large Projects](https://www.smashingmagazine.com/2021/02/css-z-index-large-projects/), [Josh Comeau: What The Heck z-index](https://www.joshwcomeau.com/css/stacking-contexts/), [Stylelint: declaration-no-important](https://stylelint.io/user-guide/rules/declaration-no-important/), [Stylelint: selector-max-specificity](https://stylelint.io/user-guide/rules/selector-max-specificity/), [Stylelint: selector-max-id](https://stylelint.io/user-guide/rules/selector-max-id/), [MDN: Sizing Items in CSS](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Sizing_items_in_CSS), [Smashing Magazine: Deploying CSS Logical Properties](https://www.smashingmagazine.com/2022/12/deploying-css-logical-properties-on-web-apps/), [USWDS: Spacing Units](https://designsystem.digital.gov/design-tokens/spacing-units/), [Penpot: Design Tokens Guide](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/), [Salesforce LWC: CSS Anti-Patterns](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-antipatterns.html), [NexterWP: Why Avoid !important](https://nexterwp.com/blog/why-you-should-avoid-using-important-in-css/), [DEV: CSS Specificity Guide](https://dev.to/satyam_gupta_0d1ff2152dcc/css-specificity-explained-a-developers-guide-to-winning-style-wars-182n), [Nick Paolini: Modern CSS Toolkit 2026](https://www.nickpaolini.com/blog/modern-css-toolkit-2026), [QuirksBlog: Scope in CSS](https://www.quirksmode.org/blog/archives/2019/03/scope_in_css.html), [web.dev: CSS Nesting](https://web.dev/learn/css/nesting), [gitea: Disallow deeply nested selectors](https://github.com/go-gitea/gitea/issues/30485)*
