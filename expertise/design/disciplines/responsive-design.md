# Responsive Design — Expertise Module

> A responsive design specialist ensures that web interfaces adapt fluidly across the full spectrum of devices, viewport sizes, and user contexts. The scope spans fluid grids, flexible media, media queries, container queries, mobile-first strategy, responsive typography, breakpoint architecture, performance optimization, and cross-device testing. The discipline was formalized by Ethan Marcotte in his seminal 2010 A List Apart article and has since evolved from viewport-centric layouts to component-driven responsive systems.

---

## 1. What This Discipline Covers

### 1.1 Definition and Origins

Responsive web design (RWD) is an approach to building interfaces that adapt to browsers, viewport dimensions, devices, and user preferences. Ethan Marcotte coined the term in his May 25, 2010 article on A List Apart, identifying three foundational ingredients: **fluid grids** (relative units instead of fixed pixels), **flexible images** (media that scale within containers), and **media queries** (CSS conditionals based on device characteristics). The concept drew on John Allsopp's 2000 "A Dao of Web Design," which argued the web's inherent flexibility should be embraced.

(Source: [Responsive Web Design — A List Apart](https://alistapart.com/article/responsive-web-design/))
(Source: [Ethan Marcotte — Responsive Design at 10](https://ethanmarcotte.com/wrote/responsive-design-at-10/))

### 1.2 Fluid Grids

Marcotte's foundational formula: `target / context = result`. A 300px element inside a 960px container becomes 31.25%. Modern CSS evolves this with `fr` units in CSS Grid, `flex-grow`/`flex-shrink` in Flexbox, and viewport-relative units (`vw`, `vh`, `dvh`, `svh`, `lvh`).

### 1.3 Flexible Images and Media

```css
img, video, embed, object, iframe {
  max-width: 100%;
  height: auto;
}
```

Modern additions: `aspect-ratio: 16/9` prevents layout shifts, `object-fit: cover | contain` controls replaced content fill, and explicit `width`/`height` HTML attributes enable browser aspect-ratio calculation before CSS loads (preventing CLS).

(Source: [web.dev — Responsive Images](https://web.dev/learn/design/responsive-images))

### 1.4 Media Queries

```css
/* Viewport-based */
@media (min-width: 768px) { ... }
@media (768px <= width <= 1024px) { ... }  /* Modern range syntax */

/* Feature-based */
@media (hover: hover) { ... }
@media (pointer: fine) { ... }

/* User preference-based */
@media (prefers-color-scheme: dark) { ... }
@media (prefers-reduced-motion: reduce) { ... }
@media (prefers-contrast: more) { ... }
```

(Source: [MDN — CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries))

### 1.5 Container Queries

The most significant evolution since Marcotte's original formulation. Styles apply based on parent container size rather than viewport, enabling component-level responsiveness.

```css
.card-container {
  container: card / inline-size;
}

@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

Production-ready in all major browsers (Chrome 105+, Firefox 110+, Safari 16+). Use **media queries** for macro layout (page columns, sidebar visibility) and **container queries** for component adaptation (cards, widgets, navbars).

(Source: [MDN — CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries))
(Source: [web.dev — The New Responsive](https://web.dev/articles/new-responsive))

### 1.6 Mobile-First Strategy

Base styles target smallest screens; complexity is added via `min-width` queries. This aligns with progressive enhancement: deliver essentials first, enhance for larger contexts.

```css
/* Base: mobile */
.grid { display: flex; flex-direction: column; gap: 1rem; }

/* Tablet+ */
@media (min-width: 768px) {
  .grid { flex-direction: row; flex-wrap: wrap; }
  .grid > * { flex: 1 1 calc(50% - 0.5rem); }
}

/* Desktop+ */
@media (min-width: 1200px) {
  .grid > * { flex: 1 1 calc(33.333% - 0.667rem); }
}
```

**Why it matters:** smaller devices load only what they need, forces content prioritization, aligns with progressive enhancement, and matches market reality (~60% mobile traffic globally).

(Source: [BrowserStack — Mobile-First Design](https://www.browserstack.com/guide/how-to-implement-mobile-first-design))

---

## 2. Core Methods & Frameworks

### 2.1 Breakpoint Systems

| Tier | Range | Typical Devices |
|------|-------|-----------------|
| XS | < 576px | Small phones (portrait) |
| SM | 576-767px | Large phones, small tablets |
| MD | 768-991px | Tablets (portrait) |
| LG | 992-1199px | Tablets (landscape), small laptops |
| XL | 1200-1399px | Desktops, laptops |
| 2XL | >= 1400px | Large monitors |

**Content-based breakpoints** (recommended over device-based): set where the layout visually breaks, regardless of device widths. More resilient because it responds to content needs. **Component-level breakpoints** via container queries let individual components define their own thresholds. Best practices: centralize breakpoint values (CSS custom properties or SCSS variables), limit to 4-6 major breakpoints, name for intent not device.

(Source: [NN/g — Breakpoints in Responsive Design](https://www.nngroup.com/articles/breakpoints-in-responsive-design/))

### 2.2 Responsive Layout Patterns

**Mostly Fluid:** Fluid grid with `max-width` on large screens, single column on small. Simplest pattern for content-heavy pages.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
```

**Column Drop:** Multi-column layouts that progressively drop columns as viewport narrows. Content stacks vertically at smallest breakpoint.

**Layout Shifter:** Content fundamentally rearranges at breakpoints (not just reflow). Uses `grid-template-areas` for readable layout definitions. Most flexible but requires more CSS.

```css
.layout { grid-template-areas: "header" "main" "sidebar" "footer"; }

@media (min-width: 768px) {
  .layout {
    grid-template-columns: 1fr 2fr;
    grid-template-areas: "header header" "sidebar main" "footer footer";
  }
}
```

**Off-Canvas:** Content pushed off-screen until triggered. Common for mobile navigation, filters, settings panels.

**Tiny Tweaks:** Minor CSS adjustments (font size, padding) without structural changes. For simple single-column layouts.

(Source: [UXPin — 5 Timeless Responsive Design Layouts](https://www.uxpin.com/studio/blog/5-useful-responsive-design-layouts-to-consider/))

### 2.3 Responsive Images with srcset and picture

**Resolution switching:**

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w, hero-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="Description" width="2000" height="1000" loading="lazy" decoding="async">
```

- `srcset` provides image sources with intrinsic widths; `sizes` tells the browser expected display width at each breakpoint
- Browser chooses optimal source considering viewport, DPR, and network conditions

**Art direction with picture:**

```html
<picture>
  <source media="(min-width: 1200px)" srcset="hero-desktop.avif" type="image/avif">
  <source media="(min-width: 600px)" srcset="hero-tablet.webp" type="image/webp">
  <source srcset="hero-mobile.webp" type="image/webp">
  <img src="hero-fallback.jpg" alt="Description" width="2000" height="1000">
</picture>
```

Use `<picture>` for serving different compositions per viewport (art direction) or format negotiation (AVIF > WebP > JPEG). Format recommendations: AVIF for high-detail photos (~50% smaller than JPEG, ~95% browser support), WebP for general purpose (~25-34% smaller, ~96% support), SVG for vectors.

(Source: [web.dev — The Picture Element](https://web.dev/learn/design/picture-element))
(Source: [MDN — Responsive Images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images))

### 2.4 Responsive Typography with clamp()

```css
h1 { font-size: clamp(2rem, 5vw + 1rem, 4.5rem); }
h2 { font-size: clamp(1.5rem, 3vw + 0.75rem, 3rem); }
body {
  font-size: clamp(1rem, 0.5vw + 0.875rem, 1.25rem);
  line-height: clamp(1.4, 0.2vw + 1.3, 1.6);
}
```

The three values: minimum (floor), preferred (target combining `vw` + `rem`), maximum (ceiling). **Critical rules:** always combine `vw` with `rem` in preferred value (using `vw` alone ignores user font-size preferences and breaks zoom), use `rem` for min/max to respect user settings, keep viewport coefficient consistent across heading levels for proportional scaling. Test at 200% zoom (WCAG SC 1.4.4).

**Fluid spacing:**

```css
:root {
  --space-sm: clamp(0.75rem, 1vw + 0.5rem, 1.25rem);
  --space-md: clamp(1rem, 2vw + 0.5rem, 2rem);
  --space-lg: clamp(1.5rem, 3vw + 0.75rem, 3.5rem);
}
```

(Source: [Smashing Magazine — Modern Fluid Typography Using CSS Clamp](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/))
(Source: [web.dev — Responsive and Fluid Typography](https://web.dev/articles/baseline-in-action-fluid-type))

### 2.5 Container Queries in Practice

**Container query units:** `cqw` (1% container width), `cqh` (1% container height), `cqi`/`cqb` (inline/block size), `cqmin`/`cqmax`.

```css
.card-container { container: card / inline-size; }

.card { display: flex; flex-direction: column; }
.card__image { aspect-ratio: 16 / 9; width: 100%; }

@container card (min-width: 450px) {
  .card { flex-direction: row; }
  .card__image { width: 40%; aspect-ratio: 1; }
}

@container card (min-width: 700px) {
  .card__body { display: grid; grid-template-columns: 1fr auto; }
}
```

Performance: avoid excessive nesting of queried containers. Use `@supports (container-type: inline-size)` for progressive enhancement.

(Source: [Josh W. Comeau — Container Queries Unleashed](https://www.joshwcomeau.com/css/container-queries-unleashed/))

---

## 3. Deliverables

### 3.1 Responsive Wireframes

Produce at three to five key viewport widths showing structural changes:

| Viewport | Width | Focus |
|----------|-------|-------|
| Mobile (portrait) | 375px | Single column, stacked content, mobile nav |
| Tablet (portrait) | 768px | Two-column grids, expanded nav, sidebar |
| Desktop | 1280px | Full layout, multi-column, persistent nav |

Optional: mobile landscape (667px), large desktop (1920px), ultra-wide (2560px). Must communicate: which elements stack/reflow/hide, navigation mode changes, content priority shifts, touch target sizing, interaction model changes.

### 3.2 Breakpoint Documentation

The contract between design and development:

```
## Global Breakpoints
| Token   | Value   | CSS Property  | Usage                      |
|---------|---------|---------------|----------------------------|
| mobile  | 0-599px | --bp-mobile   | Base styles, single column |
| tablet  | 600px   | --bp-tablet   | Two-column layouts         |
| desktop | 1024px  | --bp-desktop  | Full nav, three columns    |
| wide    | 1440px  | --bp-wide     | Max-width, density         |

## Component Breakpoints
| Component     | Container Break | Behavior Change          |
|---------------|-----------------|--------------------------|
| ProductCard   | 400px           | Vertical -> horizontal   |
| NavigationBar | 768px           | Hamburger -> persistent  |
| DataTable     | 600px           | Card view -> table view  |
```

### 3.3 Responsive Component Specs

Each design system component documents: layout behavior per breakpoint, content rules (truncation, line clamping), interaction model (hover vs. tap), container query thresholds, spacing tokens, and accessibility annotations (focus order changes, screen reader differences).

---

## 4. Tools & Techniques

### 4.1 Browser DevTools Responsive Mode

- **Chrome:** `Cmd+Shift+M` — device presets, DPR simulation, network throttling, touch sim, media query bar, CSS Grid/Flexbox overlays
- **Firefox:** `Cmd+Opt+M` — touch sim, DPR, screenshot capture, throttling
- **Safari:** Develop > Enter Responsive Design Mode — Apple device presets

Key technique: use free-form resizing (not fixed presets) — drag viewport edge slowly to find natural breakpoints. Enable "Show media queries" to visualize active breakpoints.

### 4.2 BrowserStack and Cross-Device Testing

3,000+ real device/browser combinations. Testing strategy: prioritize from analytics, cover Chrome/Android + Safari/iOS + Chrome/Windows + Safari/macOS + Edge (~85-90% of users), include at least one low-end Android device, test landscape on tablets, verify touch interactions on physical devices.

(Source: [BrowserStack — Responsive Testing](https://www.browserstack.com/responsive))

### 4.3 Figma Auto-Layout and Breakpoints

Auto-layout mirrors CSS Flexbox: "Fill container" = `flex: 1`, "Hug contents" = `width: fit-content`. Use min/max width constraints to simulate `clamp()`. Create separate frames at each breakpoint width, use component variants for responsive states. Annotate breakpoint behavior directly on frames, export design tokens mapping to CSS custom properties.

(Source: [Figma — Responsive Website Design](https://www.figma.com/resource-library/responsive-website-design/))
(Source: [UX Collective — Working with Breakpoints in Figma](https://uxdesign.cc/working-with-breakpoints-in-figma-testing-and-documenting-responsive-designs-db1c27237c0f))

### 4.4 Additional Tools

| Tool | Purpose |
|------|---------|
| Responsively App | Multiple viewports simultaneously (open-source) |
| Polypane | Multi-pane responsive, accessibility, performance testing |
| Chrome Lighthouse | Automated responsive + performance auditing |
| Sizzy | Multi-viewport browser with synchronized scrolling |

---

## 5. Common Failures

### 5.1 Desktop-First Design

Starting with full desktop layout and squeezing into mobile produces subtractive design — hiding content and degrading experience. **Fix:** adopt mobile-first CSS, write base styles for 375px, use `min-width` queries exclusively.

### 5.2 Fixed Widths

Elements set to fixed pixels (`width: 960px`) overflow on smaller viewports. Common sources: legacy frameworks, third-party embeds, images without `max-width`, wide tables. **Fix:** relative units (`%`, `vw`, `fr`, `rem`), `max-width: 100%` globally, `overflow-x: auto` on tables.

### 5.3 Horizontal Scroll

The most visible responsive failure. Causes: fixed widths, missing `box-sizing: border-box`, `100vw` including scrollbar width (use `100%` instead), third-party scripts, long unbroken text.

**Diagnostic:**
```javascript
document.querySelectorAll('*').forEach(el => {
  if (el.scrollWidth > document.documentElement.clientWidth) console.log('Overflow:', el);
});
```

**Fix:**
```css
*, *::before, *::after { box-sizing: border-box; }
.content { overflow-wrap: break-word; word-break: break-word; }
pre, code { overflow-x: auto; max-width: 100%; }
```

(Source: [OneNine — Common Responsive Design Failures and Fixes](https://onenine.com/common-responsive-design-failures-and-fixes/))

### 5.4 Unreadable Text on Mobile

**Rules:** min body text 16px (1rem) to prevent iOS Safari auto-zoom, max line length ~65 characters (`max-width: 65ch`), min line-height 1.5, min contrast 4.5:1 normal text / 3:1 large text (WCAG SC 1.4.3).

### 5.5 Unusable Forms on Mobile

Inputs below 44px height, labels beside (not above) inputs, overridden native pickers, missing `inputmode` attributes. **Fix:** `font-size: 1rem` (prevents iOS zoom), `min-height: 48px`, stack fields on mobile, use appropriate `type` and `inputmode`:

```html
<input type="email" inputmode="email" autocomplete="email">
<input type="tel" inputmode="tel" autocomplete="tel">
<input type="number" inputmode="numeric" pattern="[0-9]*">
```

### 5.6 Image Bloat

Images account for >60% of page weight. Single source for all viewports wastes bandwidth and degrades LCP. **Fix:** `srcset`/`sizes` on all content images, `<picture>` for art direction, `loading="lazy"` below fold only, AVIF/WebP with JPEG fallback, generate sizes at build (300w, 600w, 900w, 1200w, 1800w).

(Source: [web.dev — Serve Responsive Images](https://web.dev/articles/serve-responsive-images))

---

## 6. Integration with Development

### 6.1 CSS Grid for Responsive Layouts

```css
/* Auto-responsive grid — no media queries needed */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}
```

Key features: `auto-fit`/`auto-fill` with `minmax()` for intrinsic responsiveness, `fr` units for proportional distribution, `min()` inside `minmax()` prevents overflow, `grid-template-areas` for readable layout shifts, `subgrid` for child alignment with parent tracks.

### 6.2 Flexbox for Responsive Components

Best for one-dimensional flows. Use `flex-wrap: wrap` for natural reflow, `margin-top: auto` to push elements to bottom regardless of content height, `gap` for consistent spacing.

**Grid vs. Flexbox decision:**

| Concern | CSS Grid | Flexbox |
|---------|----------|---------|
| Dimension | Two-dimensional | One-dimensional |
| Driven by | Layout-first | Content-first |
| Best for | Page layouts, card grids | Navigation, component internals |

Use Grid for page structure, Flexbox for component internals.

### 6.3 Container Queries in Component Libraries

```jsx
// React — wrapper provides containment context
function Card({ title, image, children }) {
  return (
    <div className="card-wrapper"> {/* container: card / inline-size */}
      <article className="card">
        <img className="card__image" src={image} alt="" />
        <div className="card__body"><h3>{title}</h3>{children}</div>
      </article>
    </div>
  );
}
```

Components respond to their wrapper's dimensions, making them portable across sidebar, main column, or full-width contexts.

### 6.4 Tailwind CSS Responsive Utilities

Mobile-first prefix system: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px), `2xl:` (1536px).

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div class="p-4 sm:p-6">
    <h2 class="text-lg md:text-xl lg:text-2xl">Title</h2>
    <p class="text-sm md:text-base line-clamp-2 md:line-clamp-3">Content</p>
  </div>
</div>

<!-- Responsive visibility -->
<nav class="hidden md:flex">Desktop nav</nav>
<button class="md:hidden">Menu</button>
```

Container queries (Tailwind v3.4+): `@container` with `@md:`, `@lg:` prefixes.

(Source: [Tailwind CSS — Responsive Design](https://tailwindcss.com/docs/responsive-design))

### 6.5 Testing Across Devices

**Testing pyramid:**
1. **Unit tests** — test container query breakpoint logic
2. **Automated visual regression** — Percy, Chromatic at 3+ viewports
3. **Browser DevTools** — primary development workflow
4. **Cloud device farm** — BrowserStack, LambdaTest for breadth
5. **Real devices** — final validation, touch/gesture accuracy

**Automated example (Playwright):**

```javascript
const viewports = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1280, height: 800, name: 'desktop' },
];

for (const vp of viewports) {
  test(`homepage at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page).toHaveScreenshot(`homepage-${vp.name}.png`);
  });
}
```

CI/CD: run visual regression on every PR, Lighthouse CI per viewport, flag horizontal overflow as failures.

(Source: [BrowserStack — Responsive vs Cross Browser Testing](https://www.browserstack.com/guide/responsive-design-testing-vs-cross-browser-testing))

---

## 7. Viewport Meta Tag

A hard requirement. Without it, mobile browsers render at virtual desktop width (~980px) and scale down.

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Never set `user-scalable=no` or `maximum-scale=1` — disables pinch-zoom and violates WCAG SC 1.4.4.

(Source: [MDN — Viewport meta tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag))

---

## 8. Quick Reference Checklist

### Critical
- [ ] Viewport meta tag present: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] No horizontal scroll at any width from 320px to 2560px
- [ ] No fixed-width containers — all use relative units
- [ ] `box-sizing: border-box` set globally
- [ ] Images have `max-width: 100%`
- [ ] Body text >= 16px (1rem) on all viewports
- [ ] Touch targets >= 44x44px (48x48px preferred)
- [ ] Forms usable on mobile — labels above inputs, correct `inputmode`
- [ ] User can zoom — no `user-scalable=no` or `maximum-scale=1`

### Layout & Navigation
- [ ] Mobile-first CSS — `min-width` queries add complexity
- [ ] Navigation adapts (persistent desktop, hamburger/bottom mobile)
- [ ] Content stacks logically without information loss
- [ ] Grid uses `auto-fit`/`auto-fill` with `minmax()`
- [ ] Container queries for multi-context components

### Typography & Spacing
- [ ] `clamp()` with `rem` + `vw` (not `vw` alone)
- [ ] Line length <= 75 characters (`max-width: 65ch`)
- [ ] Line height >= 1.5 for body text
- [ ] Spacing scales via fluid values or responsive tokens

### Images & Media
- [ ] `srcset` and `sizes` on content images
- [ ] `<picture>` for art direction
- [ ] AVIF/WebP with JPEG fallback
- [ ] Explicit `width`/`height` on `<img>` tags (CLS prevention)
- [ ] `loading="lazy"` below fold only (not on LCP image)
- [ ] Video/iframe embeds are responsive

### Performance
- [ ] LCP image sized per viewport, not lazy-loaded
- [ ] CLS < 0.1 during responsive reflow
- [ ] `font-display: swap` or `optional`
- [ ] Third-party embeds wrapped in responsive containers

### Accessibility
- [ ] Focus indicators visible at all viewport sizes
- [ ] Focus order logical across layout shifts
- [ ] `prefers-reduced-motion` respected
- [ ] 200% zoom causes no content loss or horizontal scroll (WCAG SC 1.4.4)

### Testing
- [ ] Tested on real iOS Safari and real Android Chrome
- [ ] Both portrait and landscape on mobile/tablet
- [ ] Browser text size at maximum
- [ ] Visual regression at 3+ viewport widths
- [ ] Lighthouse mobile: Performance > 90, Accessibility > 90

---

## 9. Canonical References

### Foundational Texts
- Ethan Marcotte, ["Responsive Web Design"](https://alistapart.com/article/responsive-web-design/), A List Apart, May 2010
- Ethan Marcotte, [*Responsive Web Design*](https://ethanmarcotte.com/books/responsive-web-design/) (A Book Apart, 2011)
- Ethan Marcotte, [*Responsive Design: Patterns & Principles*](https://ethanmarcotte.com/books/responsive-design-patterns-and-principles/) (A Book Apart, 2015)

### Web Platform Documentation
- [web.dev — Learn Responsive Design](https://web.dev/learn/design)
- [web.dev — Responsive Web Design Basics](https://web.dev/articles/responsive-web-design-basics)
- [web.dev — The New Responsive](https://web.dev/articles/new-responsive)
- [web.dev — Responsive and Fluid Typography](https://web.dev/articles/baseline-in-action-fluid-type)
- [MDN — Responsive Web Design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN — CSS Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries)
- [MDN — CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [MDN — Responsive Images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [MDN — Viewport Meta Tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)

### Tools, Frameworks & Patterns
- [Tailwind CSS — Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [BrowserStack — Responsive Testing](https://www.browserstack.com/responsive)
- [Figma — Responsive Website Design](https://www.figma.com/resource-library/responsive-website-design/)
- [NN/g — Breakpoints in Responsive Design](https://www.nngroup.com/articles/breakpoints-in-responsive-design/)
- [Smashing Magazine — Modern Fluid Typography Using CSS Clamp](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)
- [Josh W. Comeau — Container Queries Unleashed](https://www.joshwcomeau.com/css/container-queries-unleashed/)
- Brad Frost, [This Is Responsive](https://bradfrost.github.io/this-is-responsive/patterns.html)
