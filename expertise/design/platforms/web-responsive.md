# Responsive Web Design -- Platform Expertise Module

> Responsive web design ensures that web content adapts fluidly across all screen sizes and input
> modalities -- from 320px mobile screens to 4K desktop monitors. This module covers mobile-first
> strategy, modern CSS layout, component adaptation, fluid typography, responsive media,
> performance, and accessibility. The goal is universal access through progressive enhancement.

---

## 1. Platform Design Language

### Web Design Philosophy

**Universal Access.** The web is the most accessible platform ever created. A responsive site
must work for everyone -- users on slow 3G with budget phones, power users with ultrawide
monitors, screen reader users, keyboard-only navigators, and users with motor impairments.

**Progressive Enhancement.** Start with the most basic technology layer and enhance upward:
1. **Content layer** -- semantic HTML that works without CSS or JS
2. **Presentation layer** -- CSS that adapts layout, typography, and spacing
3. **Interaction layer** -- JavaScript that adds interactivity for capable browsers

Never gate critical content behind JavaScript. Forms should submit via native `<form>`.
Navigation should use `<a>` tags. Content should be readable with stylesheets disabled.

> Source: [Progressive Enhancement -- MDN](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)

### Mobile-First Approach

**Mobile-first is the standard.** Design and code for the smallest viewport first, then
enhance for larger screens using `min-width` media queries:

- Forces content prioritization -- if it does not fit on 320px, question whether it is needed
- Results in smaller CSS payloads for mobile (base styles are mobile, enhancements are additive)
- Aligns with traffic reality -- mobile accounts for over 60% of global web traffic
- Produces cleaner CSS -- adding complexity is easier than removing it

```css
/* Base styles are for small screens */
.container { display: flex; flex-direction: column; padding: 1rem; }

@media (min-width: 768px) {
  .container { flex-direction: row; padding: 2rem; }
}
@media (min-width: 1024px) {
  .container { max-width: 1200px; margin-inline: auto; }
}
```

**Desktop-first (`max-width`) is an anti-pattern** for new projects -- it produces bloated
CSS and frequent breakage on small screens.

> Source: [Responsive Web Design Basics -- web.dev](https://web.dev/articles/responsive-web-design-basics)

### Content-First Breakpoints

Do not define breakpoints based on specific devices. Let content dictate breakpoints:
1. Start at 320px
2. Slowly expand the viewport
3. When the layout looks awkward, add a breakpoint
4. Repeat until you reach the widest layout

> Source: [Logical Breakpoints -- Smashing Magazine](https://www.smashingmagazine.com/2013/03/logical-breakpoints-responsive-design/)

### Modern CSS Capabilities

**Container Queries (`@container`)** -- the most significant responsive advancement since
media queries. Style elements based on container size, not viewport:

```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: 200px 1fr; }
}
@container (max-width: 399px) {
  .card { display: flex; flex-direction: column; }
}
```

Use `@container` for component-level adaptation and `@media` for page-level layout.

> Source: [Container Queries: Netflix Case Study -- web.dev](https://web.dev/case-studies/netflix-cq),
> [CSS Container Queries -- CSS-Tricks](https://css-tricks.com/css-container-queries/)

**`:has()` Selector** -- parent-aware and content-aware styling without JavaScript:

```css
.card:has(img) { display: grid; grid-template-columns: 250px 1fr; }
figure:has(figcaption) img { margin-bottom: 0.5rem; }
.grid:has(:nth-child(4)) { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
```

> Source: [New Front-End Features 2025 -- Smashing Magazine](https://www.smashingmagazine.com/2024/12/new-front-end-features-for-designers-in-2025/)

**CSS Subgrid** -- nested grid items participate in parent grid tracks, solving card alignment:

```css
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
.card { display: grid; grid-template-rows: subgrid; grid-row: span 3; }
```

> Source: [Subgrid -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid)

**`clamp()`, `min()`, `max()`** -- fluid values without media queries:

```css
.element { width: clamp(300px, 50%, 800px); font-size: clamp(1rem, 2.5vw, 2rem); }
```

> Source: [CSS min(), max(), and clamp() -- web.dev](https://web.dev/articles/min-max-clamp)

---

## 2. Layout & Navigation Patterns

### Responsive Breakpoints

| Token | Width | Target |
|---|---|---|
| `xs` | 320px | Small phones (iPhone SE) |
| `sm` | 480px | Large phones / landscape small phones |
| `md` | 768px | Tablets (portrait iPad) |
| `lg` | 1024px | Landscape tablets, small laptops |
| `xl` | 1280px | Standard desktop / laptop |
| `2xl` | 1440px | Large desktop monitors |
| `3xl` | 1920px | Full HD and ultrawide |

Use `em` units for breakpoints (e.g., `48em` = 768px) to respect user font-size preferences:

```css
@media (min-width: 48em)  { /* tablet   */ }
@media (min-width: 64em)  { /* desktop  */ }
@media (min-width: 80em)  { /* large    */ }
```

> Source: [CSS Media Queries Guide -- CSS-Tricks](https://css-tricks.com/a-complete-guide-to-css-media-queries/)

### Navigation Patterns

**Mobile (< 768px):**
- **Hamburger menu** -- standard off-canvas slide-in for primary navigation
- **Bottom tab bar** -- preferred for high-frequency navigation (max 5 items). Research shows
  bottom nav increases user sessions vs hamburger. Aligns with thumb-zone ergonomics
- **Priority+ pattern** -- show as many items as fit, overflow into "More" menu

**Tablet (768--1024px):**
- Horizontal top navigation with abbreviated labels or icons
- Collapsible sidebar that toggles open/closed

**Desktop (> 1024px):**
- Horizontal top navigation with full text labels
- Persistent sidebar for complex apps (dashboards, admin panels)
- Mega menus for content-rich sites with deep IA

> Source: [Bottom Navigation on Mobile Web -- Smashing Magazine](https://www.smashingmagazine.com/2019/08/bottom-navigation-pattern-mobile-web-pages/),
> [Mobile Navigation Patterns -- Smashing Magazine](https://www.smashingmagazine.com/2017/05/basic-patterns-mobile-navigation/)

### Max Content Width & Grid Systems

```css
.content-wrapper {
  width: 100%;
  max-width: 1200px;                          /* 1200-1440px standard */
  margin-inline: auto;
  padding-inline: clamp(1rem, 5vw, 3rem);
}
.prose { max-width: 65ch; margin-inline: auto; } /* 45-75 chars for readability */
```

**Auto-responsive grid** (no media queries -- the RAM pattern):

```css
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: 1.5rem;
}
```

The `min(250px, 100%)` inside `minmax()` prevents overflow on narrow viewports.

> Source: [RAM Layout Pattern -- web.dev](https://web.dev/patterns/layout/repeat-auto-minmax),
> [Complete Guide to CSS Grid -- CSS-Tricks](https://css-tricks.com/snippets/css/complete-guide-grid/)

### Sticky Headers

```css
.site-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--surface); backdrop-filter: blur(8px);
}

@media (max-width: 47.99em) {
  .bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    padding-bottom: env(safe-area-inset-bottom);
  }
  body { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
}
```

Keep sticky headers compact (60-80px max). Account for `env(safe-area-inset-*)` on
notched/Dynamic Island devices. Consider auto-hide on scroll-down, show on scroll-up.

> Source: [Sticky Menus UX Guidelines -- Smashing Magazine](https://www.smashingmagazine.com/2023/05/sticky-menus-ux-guidelines/)

### Responsive Images

**Resolution switching** (same image, different sizes):
```html
<img src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w, hero-1600.jpg 1600w"
  sizes="(min-width: 1200px) 1200px, (min-width: 768px) 90vw, 100vw"
  alt="Descriptive alt text" loading="lazy" decoding="async" width="1600" height="900">
```

**Art direction** (different crops per breakpoint):
```html
<picture>
  <source media="(min-width: 1024px)" srcset="hero-wide.jpg">
  <source media="(min-width: 768px)"  srcset="hero-medium.jpg">
  <img src="hero-mobile.jpg" alt="Descriptive alt text">
</picture>
```

Rules:
- Global default: `img { max-width: 100%; height: auto; }`
- Use `loading="lazy"` on all images except the LCP (above-the-fold) image
- Use `fetchpriority="high"` on the LCP image
- Always provide `width` and `height` attributes to prevent CLS
- Prefer AVIF > WebP > JPEG for photos; SVG for icons and illustrations

> Source: [Responsive Images -- MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images),
> [Responsive Images Done Right -- Smashing Magazine](https://www.smashingmagazine.com/2014/05/responsive-images-done-right-guide-picture-srcset/)

---

## 3. Component Conventions

### Responsive Tables

**Horizontal scroll** (comparison data, many columns):
```css
.table-wrapper {
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  /* Add role="region" tabindex="0" aria-labelledby in HTML for accessibility */
}
```

**Card/stacked layout** (record-based data on mobile):
```css
@media (max-width: 47.99em) {
  table, thead, tbody, th, td, tr { display: block; }
  thead { display: none; }
  td::before { content: attr(data-label); font-weight: 600; display: block; }
}
```

**Priority columns** (show critical columns only on mobile, reveal more at wider breakpoints):
```css
.col-priority-2 { display: none; }
@media (min-width: 48em) { .col-priority-2 { display: table-cell; } }
@media (min-width: 64em) { .col-priority-3 { display: table-cell; } }
```

> Source: [Responsive Tables -- Smashing Magazine](https://www.smashingmagazine.com/2022/12/accessible-front-end-patterns-responsive-tables-part1/),
> [Responsive Data Tables -- CSS-Tricks](https://css-tricks.com/responsive-data-tables/)

### Responsive Forms

- **Mobile:** single-column always. Full-width inputs, min 48px height, stack labels above inputs
- **Desktop:** two-column for related short fields (First Name / Last Name)
- Set `font-size >= 1rem` on inputs to prevent iOS Safari auto-zoom on focus
- Use appropriate `inputmode` attributes (`numeric`, `email`, `tel`, `url`)

```css
.form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media (min-width: 48em) { .form-grid { grid-template-columns: 1fr 1fr; } }
.form-grid .full-width { grid-column: 1 / -1; }
.form-input { min-height: 48px; font-size: 1rem; padding: 0.75rem 1rem; width: 100%; }
```

### Responsive Modals & Dialogs

Use native `<dialog>` with `.showModal()`. Mobile: bottom-sheet. Desktop: centered overlay.

```css
dialog { border: none; border-radius: 1rem; padding: 0; max-width: min(90vw, 560px); }
dialog::backdrop { background: rgb(0 0 0 / 0.5); }

@media (max-width: 47.99em) {
  dialog { margin: auto 0 0 0; max-width: 100%; width: 100%;
           border-radius: 1rem 1rem 0 0; max-height: 85dvh; }
}
@media (min-width: 48em) { dialog { margin: auto; } }
```

> Source: [Building a Dialog Component -- web.dev](https://web.dev/articles/building/a-dialog-component)

### Touch vs Mouse/Keyboard

Use CSS interaction media features -- do not assume input modality from screen size:

```css
@media (pointer: coarse) { .btn { min-height: 48px; min-width: 48px; } }
@media (pointer: fine)   { .btn { min-height: 32px; } }

@media (hover: hover) { .btn:hover { background: var(--primary-hover); } }
@media (hover: none)  { .btn:active { background: var(--primary-active); } }
```

Key rules:
- **Never rely on hover for critical information.** Tooltips on hover are inaccessible on touch
- **Touch targets: min 48x48px** (Google recommendation). WCAG 2.5.8 AA: 24x24px; AAA: 44x44px
- **Spacing between targets: min 8px** to prevent accidental taps
- **Sticky hover:** on touch, `:hover` persists after tap. Wrap in `@media (hover: hover)`
- Support both touch and keyboard: every element must be focusable and operable via keyboard

> Source: [Interaction -- web.dev](https://web.dev/learn/design/interaction),
> [Hover and Pointer Media Queries -- Smashing Magazine](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/),
> [Accessible Tap Targets -- web.dev](https://web.dev/articles/accessible-tap-targets)

---

## 4. Typography & Spacing System

### Fluid Typography

Use `clamp()` for font sizes that scale smoothly without breakpoint jumps:

```css
:root {
  --text-sm:   clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem,     0.925rem + 0.4vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem + 0.6vw,     1.375rem);
  --text-xl:   clamp(1.25rem,  1.1rem + 0.75vw,  1.625rem);
  --text-2xl:  clamp(1.5rem,   1.25rem + 1.25vw, 2.25rem);
  --text-3xl:  clamp(1.875rem, 1.5rem + 1.875vw, 3rem);
  --text-4xl:  clamp(2.25rem,  1.75rem + 2.5vw,  4rem);
}
```

**Accessibility:** use `rem`/`em` bounds (not `px`) so user font-size preferences are respected.
`clamp()` with fixed `px` bounds can fail WCAG 1.4.4 (Resize Text) if users cannot scale to 200%.

> Source: [Modern Fluid Typography -- Smashing Magazine](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/),
> [Fluid Typography with Baseline CSS -- web.dev](https://web.dev/articles/baseline-in-action-fluid-type)

### Responsive Spacing Scale

```css
:root {
  --space-xs:  clamp(0.5rem,   0.425rem + 0.375vw, 0.75rem);
  --space-sm:  clamp(0.75rem,  0.65rem + 0.5vw,    1rem);
  --space-md:  clamp(1rem,     0.875rem + 0.625vw,  1.5rem);
  --space-lg:  clamp(1.5rem,   1.25rem + 1.25vw,   2.5rem);
  --space-xl:  clamp(2rem,     1.625rem + 1.875vw,  3.5rem);
  --space-2xl: clamp(3rem,     2.5rem + 2.5vw,     5rem);
}
```

> Source: [Fluidly Scaling Type and Spacing -- CSS-Tricks](https://css-tricks.com/consistent-fluidly-scaling-type-and-spacing/)

### Content Readability

- Optimal line length: **45-75 characters** (~65ch ideal) for body text
- Body line-height: **1.5-1.8** (WCAG 1.4.12 requires at least 1.5)
- Heading line-height: **1.1-1.3** (tighter for large text)

---

## 5. Viewport Units & User Preferences

### Modern Viewport Units

Mobile browsers have dynamic toolbars that change viewport height. Use new units:

| Unit | Meaning | Use Case |
|---|---|---|
| `svh` | Small viewport height (toolbars visible) | Safe for fixed hero sections |
| `lvh` | Large viewport height (toolbars hidden) | Use with caution |
| `dvh` | Dynamic (updates as toolbars show/hide) | Dynamic layouts, modal max-height |

> Source: [Viewport Units -- web.dev](https://web.dev/blog/viewport-units)

### User Preference Queries

```css
@media (prefers-color-scheme: dark)      { /* dark mode colors */ }
@media (prefers-reduced-motion: reduce)  { *, *::before, *::after {
  animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
@media (prefers-contrast: more)          { /* increase borders, outlines */ }
```

> Source: [prefers-reduced-motion -- web.dev](https://web.dev/articles/prefers-reduced-motion),
> [prefers-color-scheme -- web.dev](https://web.dev/articles/prefers-color-scheme)

---

## 6. Performance for Responsive Sites

### Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5--4.0s | > 4.0s |
| INP (Interaction to Next Paint) | < 200ms | 200--500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1--0.25 | > 0.25 |

### Responsive Performance Rules

1. **Serve sized images.** Use `srcset`/`sizes` so mobile downloads smaller files
2. **Set explicit dimensions.** `width`/`height` on images and video, or `aspect-ratio` in CSS
3. **Prioritize LCP image.** `fetchpriority="high"`, URL discoverable in HTML (not data-src)
4. **Lazy-load below fold.** `loading="lazy"` on all images except the LCP element
5. **Font strategy.** `font-display: swap`, preload critical fonts, prefer variable fonts
6. **Animate safely.** Use `transform` and `opacity` -- never animate width/height/margin

> Source: [Web Vitals -- web.dev](https://web.dev/articles/vitals),
> [Optimize LCP -- web.dev](https://web.dev/articles/optimize-lcp)

---

## 7. Strategy: Combining @media, @container, and :has()

| Concern | Tool | Example |
|---|---|---|
| Page layout | `@media` | 1-column to sidebar at 1024px |
| Component layout | `@container` | Card vertical/horizontal based on container width |
| User preferences | `@media` | Dark mode, reduced motion |
| Input modality | `@media` | Touch targets for `pointer: coarse` |
| Content-aware style | `:has()` | Layout changes when card contains an image |
| Fluid values | `clamp()` | Font/spacing scales without breakpoints |

> Source: [The New Responsive -- web.dev](https://web.dev/new-responsive)

---

## 8. Common Mistakes

### 8.1 Desktop-First Design That Breaks on Mobile
Design for 1440px then squeeze to 375px. **Fix:** Start with mobile wireframes, use
`min-width` queries, test at 320px first.

### 8.2 Fixed Pixel Values Instead of Relative Units
`width: 800px`, `font-size: 24px`. **Fix:** Use `%`, `rem`, `em`, `ch`, `vw`, `fr`,
`clamp()`. Reserve `px` for borders and hairlines only.

### 8.3 Not Testing on Real Devices
Chrome DevTools does not replicate real touch, iOS Safari quirks, or slow 3G. **Fix:** Test
on low-end Android, iPhone (Safari), tablet, and real slow networks.

### 8.4 Horizontal Scroll on Mobile
Common culprits: images without `max-width: 100%`, fixed-width elements, flex without
`flex-wrap: wrap`, grid without `min()` in `minmax()`, `100vw` including scrollbar width,
absolute positioning. **Debug:** `* { outline: 1px solid red; }`

> Source: [Overflow Issues -- Smashing Magazine](https://www.smashingmagazine.com/2021/04/css-overflow-issues/)

### 8.5 Tiny Touch Targets on Mobile Web
24px buttons on touch devices. **Fix:** Min 48x48px touch area with 8px spacing.

### 8.6 Hover-Dependent Information
Tooltips or content visible only on `:hover`. **Fix:** Make content accessible via `:focus`
or visible by default. Wrap hover enhancements in `@media (hover: hover)`.

### 8.7 Missing Viewport Meta Tag
Omitting it causes mobile browsers to render at desktop width. **Fix:** Always include:
`<meta name="viewport" content="width=device-width, initial-scale=1">`.
Never use `user-scalable=no` -- it disables pinch-to-zoom (WCAG 1.4.4 violation).

### 8.8 Ignoring Landscape Orientation
Phone landscape is ~667px wide but only ~375px tall. **Fix:** Use `min-height` not
`height: 100vh` for hero sections.

### 8.9 Loading Desktop Assets on Mobile
2MB hero images on 3G. **Fix:** `srcset`/`sizes`, subset fonts, code-split JS.

### 8.10 Forgetting Safe Area Insets
Content hidden behind notch/Dynamic Island. **Fix:**
`padding-bottom: env(safe-area-inset-bottom)` on fixed elements.

---

## 9. Responsive Web Design Checklist

### Foundation
- [ ] Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] CSS is mobile-first (`min-width` media queries)
- [ ] Base font size >= 16px (`1rem`) to prevent iOS auto-zoom
- [ ] Global `img { max-width: 100%; height: auto; }`
- [ ] No horizontal scroll at any width from 320px to 1920px

### Layout
- [ ] Content within max-width (1200-1440px) with centered container
- [ ] Grids use `repeat(auto-fit, minmax(min(X, 100%), 1fr))` pattern
- [ ] Navigation adapts per breakpoint (hamburger/bottom bar, horizontal, sidebar)
- [ ] Prose constrained to 45-75 characters per line
- [ ] Sticky headers compact (60-80px) with safe area insets

### Media
- [ ] Responsive images with `srcset` and `sizes`
- [ ] Art direction uses `<picture>` for different crops
- [ ] LCP image has `fetchpriority="high"` and is not lazy-loaded
- [ ] All media has explicit dimensions or `aspect-ratio` (prevents CLS)

### Interaction & Accessibility
- [ ] Touch targets >= 48x48px with >= 8px spacing
- [ ] Hover effects wrapped in `@media (hover: hover)`
- [ ] `prefers-reduced-motion` respected
- [ ] Pinch-to-zoom not disabled
- [ ] All interactive elements keyboard-accessible

### Components
- [ ] Tables use scroll, card layout, or priority columns on mobile
- [ ] Forms single-column on mobile, inputs >= 48px tall, `font-size >= 1rem`
- [ ] Modals are bottom-sheet (mobile) / centered overlay (desktop)
- [ ] Typography uses fluid `clamp()` values

### Performance
- [ ] Core Web Vitals pass: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Tested on real devices (low-end Android, iPhone, tablet)
- [ ] Tested on slow network (3G throttle minimum)

---

## References

- [Responsive Web Design Basics -- web.dev](https://web.dev/articles/responsive-web-design-basics)
- [The New Responsive -- web.dev](https://web.dev/new-responsive)
- [Responsive Web Design -- MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [Container Queries: Netflix Case Study -- web.dev](https://web.dev/case-studies/netflix-cq)
- [CSS Container Queries -- CSS-Tricks](https://css-tricks.com/css-container-queries/)
- [Container Queries Primer -- Smashing Magazine](https://www.smashingmagazine.com/2021/05/complete-guide-css-container-queries/)
- [Complete Guide to CSS Grid -- CSS-Tricks](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Modern Fluid Typography -- Smashing Magazine](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)
- [CSS min(), max(), clamp() -- web.dev](https://web.dev/articles/min-max-clamp)
- [Accessible Tap Targets -- web.dev](https://web.dev/articles/accessible-tap-targets)
- [Hover and Pointer Media Queries -- Smashing Magazine](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/)
- [Responsive Images -- MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [Bottom Navigation Pattern -- Smashing Magazine](https://www.smashingmagazine.com/2019/08/bottom-navigation-pattern-mobile-web-pages/)
- [Responsive Tables -- Smashing Magazine](https://www.smashingmagazine.com/2022/12/accessible-front-end-patterns-responsive-tables-part1/)
- [Overflow Issues in CSS -- Smashing Magazine](https://www.smashingmagazine.com/2021/04/css-overflow-issues/)
- [Web Vitals -- web.dev](https://web.dev/articles/vitals)
- [New Front-End Features 2025 -- Smashing Magazine](https://www.smashingmagazine.com/2024/12/new-front-end-features-for-designers-in-2025/)
- [Viewport Units -- web.dev](https://web.dev/blog/viewport-units)
- [Subgrid -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid)
- [Accessible Responsive Design -- web.dev](https://web.dev/articles/accessible-responsive-design)
- [WCAG Target Sizes -- Smashing Magazine](https://www.smashingmagazine.com/2024/07/getting-bottom-minimum-wcag-conformant-interactive-element-size/)
