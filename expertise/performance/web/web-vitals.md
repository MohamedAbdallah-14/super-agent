# Web Vitals — Performance Expertise Module

> Core Web Vitals (LCP, INP, CLS) are Google's user-centric performance metrics that directly impact search rankings, user engagement, and conversion rates. They measure loading performance, interactivity, and visual stability — the three pillars of user-perceived web performance.

> **Impact:** Critical
> **Applies to:** Web
> **Key metrics:** Largest Contentful Paint (LCP), Interaction to Next Paint (INP), Cumulative Layout Shift (CLS)

---

## Why This Matters

### Search Ranking Impact

Core Web Vitals are a confirmed Google ranking signal since June 2021. Google evaluates
pages using the 75th percentile of real-user data collected via the Chrome User Experience
Report (CrUX). Pages failing CWV thresholds lose ranking eligibility for Top Stories
carousels and are disadvantaged in competitive SERPs. Sites have reported moving up 5-10
positions for competitive keywords solely by improving performance metrics.

As of 2025, only 48% of mobile websites and 56% of desktop websites pass all three Core
Web Vitals — meaning more than half the web still fails these thresholds, representing a
significant competitive opportunity.

### Real Business Case Studies

| Company | Optimization | Result |
|---------|-------------|--------|
| **Vodafone** | 31% LCP improvement | 8% more sales, 15% better lead-to-visit rate, 11% better cart-to-visit rate |
| **Swappie** | 55% LCP improvement, 91% CLS improvement | 42% jump in mobile revenue |
| **Rakuten** | Full CWV optimization | 33% higher conversion rate, 53% higher revenue per visitor |
| **T-Mobile** | Page speed overhaul | 20% fewer in-site issues, 60% increase in visit-to-order rate |
| **Google Flights** | Added `fetchpriority="high"` to hero image | 700ms LCP improvement |
| **Etsy** | Priority Hints on LCP elements | 4% LCP improvement (up to 20-30% in lab) |

**Source:** web.dev/case-studies/vodafone, web.dev/case-studies/vitals-business-impact

### The Conversion-Speed Relationship

Every 100ms improvement in page load time can boost conversion rates by up to 7%. A
healthcare provider that optimized mobile CWV scores saw a 43% increase in mobile
conversion rates. These numbers compound: for an e-commerce site doing $10M/year, a 1-second
LCP improvement could translate to $700K+ in additional revenue.

### FID to INP Transition (March 2024)

In March 2024, Google officially replaced First Input Delay (FID) with Interaction to Next
Paint (INP). This was significant because:

- **FID** only measured the delay of the *first* interaction and ignored processing time
- **INP** captures *every* interaction (clicks, taps, key presses) throughout the full page lifecycle
- **INP** reports the worst interaction at the 75th percentile, making it far harder to game
- The transition caused a ~5 percentage point drop in mobile CWV pass rates because sites
  that appeared responsive under FID had slow later interactions that INP now captures

---

## Performance Budgets & Targets

### Official Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **INP** | < 200ms | 200ms - 500ms | > 500ms |
| **CLS** | < 0.1 | 0.1 - 0.25 | > 0.25 |

### How Thresholds Are Evaluated

Google uses the **75th percentile** (p75) of page visits over a rolling 28-day window.
This means 75% of your visitors must experience a "Good" score for the page to pass. This
is more demanding than a median — the bottom quartile of visits drags your score down.

### Mobile vs Desktop Differences

Mobile consistently scores worse than desktop due to:
- **CPU:** Mobile processors take 3-5x longer to parse and execute JavaScript
- **Network:** Cellular connections add 50-300ms of latency vs broadband
- **Rendering:** Smaller viewports mean different LCP elements (often text instead of images)
- **2025 data:** 48% mobile pass rate vs 56% desktop pass rate

### Per-Metric Pass Rates (2025 Web Almanac)

| Metric | Mobile Good | Desktop Good | Mobile Poor |
|--------|------------|-------------|-------------|
| **LCP** | ~60% | ~70% | ~15% |
| **INP** | ~77% | ~85% | ~6% |
| **CLS** | ~72% | ~78% | ~11% |

INP has the highest pass rate individually, but it is the most commonly *failed* metric
when combined — 43% of sites that fail CWV fail specifically on INP.

### Setting Internal Targets

Do not target the threshold boundary. Set internal budgets at 70-80% of the "Good"
threshold to provide a safety margin for traffic spikes and edge cases:

| Metric | Recommended Internal Budget |
|--------|---------------------------|
| **LCP** | < 1.8s (28% buffer from 2.5s) |
| **INP** | < 150ms (25% buffer from 200ms) |
| **CLS** | < 0.05 (50% buffer from 0.1) |

---

## Measurement & Profiling

### Lab Tools (Synthetic / Controlled)

| Tool | What It Measures | Use Case |
|------|-----------------|----------|
| **Lighthouse** | LCP, CLS, TBT (proxy for INP) | Development-time audits, CI/CD gates |
| **Chrome DevTools Performance Panel** | LCP, CLS, INP, long tasks, layout shifts | Debugging specific interactions |
| **WebPageTest** | LCP, CLS, TBT, filmstrip, waterfall | Deep network/rendering analysis |
| **PageSpeed Insights** | Lab + Field data combined | Quick assessment with CrUX overlay |

**Important:** Lab tools cannot measure INP directly (no real user interactions). Total
Blocking Time (TBT) is used as a lab proxy — TBT correlates with INP at ~0.8 correlation.

### Field Tools (Real User Monitoring)

| Tool | Data Source | Granularity | Update Frequency |
|------|------------|------------|-----------------|
| **CrUX (Chrome UX Report)** | Real Chrome users | Origin + URL level | Daily (API), Monthly (BigQuery) |
| **Search Console CWV Report** | CrUX data | URL groups | Rolling 28-day window |
| **PageSpeed Insights** | CrUX + Lighthouse | Per-URL | On-demand |
| **RUM providers** (SpeedCurve, DebugBear, Calibre) | Your users specifically | Per-page, per-segment | Real-time |

### JavaScript API: web-vitals Library (v5)

The `web-vitals` library (maintained by Google Chrome team) is the standard way to collect
CWV data from real users. It uses the `PerformanceObserver` API with the `buffered` flag,
meaning it captures metrics even if loaded late.

#### Installation and Basic Usage

```bash
npm install web-vitals
```

```javascript
// Basic usage — collect all three Core Web Vitals
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,        // "LCP", "INP", or "CLS"
    value: metric.value,      // The metric value
    rating: metric.rating,    // "good", "needs-improvement", or "poor"
    delta: metric.delta,      // Change since last report
    id: metric.id,            // Unique ID for this metric instance
    navigationType: metric.navigationType, // "navigate", "reload", "back-forward", etc.
  });

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

#### Attribution Build (for debugging root causes)

```javascript
// Attribution build adds diagnostic data to each metric
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

onLCP((metric) => {
  console.log('LCP element:', metric.attribution.element);
  console.log('LCP resource URL:', metric.attribution.url);
  console.log('Time to first byte:', metric.attribution.timeToFirstByte);
  console.log('Resource load delay:', metric.attribution.resourceLoadDelay);
  console.log('Resource load time:', metric.attribution.resourceLoadTime);
  console.log('Element render delay:', metric.attribution.elementRenderDelay);
});

onINP((metric) => {
  console.log('INP event type:', metric.attribution.interactionType);
  console.log('INP target:', metric.attribution.interactionTarget);
  console.log('Input delay:', metric.attribution.inputDelay);
  console.log('Processing duration:', metric.attribution.processingDuration);
  console.log('Presentation delay:', metric.attribution.presentationDelay);
});

onCLS((metric) => {
  console.log('Largest shift target:', metric.attribution.largestShiftTarget);
  console.log('Largest shift value:', metric.attribution.largestShiftValue);
  console.log('Largest shift time:', metric.attribution.largestShiftTime);
});
```

#### CDN Usage (No Build Step)

```html
<script type="module">
  import { onCLS, onINP, onLCP } from 'https://unpkg.com/web-vitals@5?module';
  onCLS(console.log);
  onINP(console.log);
  onLCP(console.log);
</script>
```

**Critical rule:** Never call `onLCP()`, `onINP()`, or `onCLS()` more than once per page
load. Each call creates a `PerformanceObserver` instance and event listeners for the
lifetime of the page — calling them repeatedly causes memory leaks.

### CrUX API for Automated Monitoring

```javascript
// Query CrUX API for origin-level data
const API_KEY = 'YOUR_API_KEY';
const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`;

const response = await fetch(url, {
  method: 'POST',
  body: JSON.stringify({
    origin: 'https://example.com',
    formFactor: 'PHONE',
    metrics: [
      'largest_contentful_paint',
      'interaction_to_next_paint',
      'cumulative_layout_shift'
    ]
  })
});

const data = await response.json();
// data.record.metrics.largest_contentful_paint.percentiles.p75
// data.record.metrics.largest_contentful_paint.histogram[0].density (good %)
```

CrUX data is also available in BigQuery (`chrome-ux-report` project) for large-scale
analysis across millions of origins, updated monthly on the second Tuesday after collection.

---

## Common Bottlenecks

### LCP Bottlenecks

LCP measures when the largest content element (image, video poster, text block, or
background image) becomes visible in the viewport.

| Bottleneck | Impact | Frequency |
|-----------|--------|-----------|
| **Slow server response (high TTFB)** | Delays everything; a 1s TTFB makes 2.5s LCP nearly impossible | ~35% of poor LCP pages |
| **Render-blocking CSS/JS** | Browser cannot render until critical CSS is parsed and blocking JS executes | ~30% of poor LCP pages |
| **Slow resource load time** | Large unoptimized images, no CDN, no compression | ~25% of poor LCP pages |
| **Client-side rendering** | Content not in HTML; must download, parse, and execute JS first | ~20% of SPA pages |
| **Resource discovery delay** | LCP image referenced in CSS or loaded via JS, invisible to preload scanner | ~15% of poor LCP pages |
| **Lazy loading above-the-fold images** | `loading="lazy"` on LCP image delays its fetch until layout | Common anti-pattern |
| **No image optimization** | Serving 2MB PNG instead of 200KB WebP/AVIF | Very common |
| **Unoptimized web fonts blocking text** | Text is the LCP element but invisible during font load (FOIT) | ~10% of text-LCP pages |

### INP Bottlenecks

INP measures the latency from user input to the next visual update. It has three phases:
**input delay** (waiting for main thread), **processing time** (event handler execution),
and **presentation delay** (rendering after handler completes).

| Bottleneck | Phase Affected | Impact |
|-----------|---------------|--------|
| **Long tasks (>50ms) on main thread** | Input delay | User taps during a long task; response waits for task completion |
| **Excessive JavaScript execution** | Processing time | Event handlers do too much synchronous work |
| **Layout thrashing** | Processing time | Repeated read/write cycles force synchronous layout recalculations |
| **Large DOM size (>1500 nodes)** | Presentation delay | Browser takes longer to recalculate styles and paint after changes |
| **Heavy third-party scripts** | Input delay | Analytics, ads, chat widgets block the main thread |
| **Forced synchronous layout** | Processing time | Reading `offsetHeight` after writing to DOM triggers immediate reflow |
| **Unoptimized React re-renders** | Processing time | State changes triggering large subtree re-renders |
| **No task yielding** | Input delay | Long-running computations never yield to let interactions through |

**Key stat:** Fewer than 25% of websites keep task duration below the recommended 50ms
threshold (HTTP Archive 2025 Web Almanac).

### CLS Bottlenecks

CLS measures unexpected layout shifts during the page lifecycle, scored by impact fraction
times distance fraction.

| Bottleneck | Share of CLS Issues | Impact |
|-----------|-------------------|--------|
| **Images/videos without dimensions** | ~60% | Browser allocates 0px then reflows when media loads |
| **Web fonts causing text reflow (FOIT/FOUT)** | ~25% | Fallback font metrics differ from web font, text reflows |
| **Dynamically injected content** | ~15% | Ads, banners, cookie notices push content down |
| **Late-loading CSS** | Common | Styles apply after content renders, causing shifts |
| **Animations not using `transform`** | Moderate | Animating `top`/`left`/`width`/`height` causes layout shifts |
| **Async-loaded embeds without placeholders** | Moderate | iframes, maps, social widgets have unknown dimensions |

---

## Optimization Patterns

### LCP Optimization

#### 1. Eliminate Resource Discovery Delay

The LCP image must be discoverable in the HTML source by the browser's preload scanner.
If it is referenced only in CSS (`background-image`) or loaded via JavaScript, the browser
cannot start fetching it until those resources are parsed.

```html
<!-- BEFORE: Image only discoverable after CSS parses (adds 200-800ms) -->
<div class="hero" style="background-image: url('/hero.jpg')"></div>

<!-- AFTER: Image discoverable immediately by preload scanner -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
<img src="/hero.webp" alt="Hero" fetchpriority="high"
     width="1200" height="600" decoding="async">
```

**Measured impact:** Google Flights saw a 700ms LCP improvement from adding
`fetchpriority="high"` alone. Google's own tests improved LCP from 2.6s to 1.9s.

#### 2. Optimize Server Response Time

```nginx
# nginx: Enable gzip + brotli compression
gzip on;
gzip_types text/html text/css application/javascript image/svg+xml;

# Enable brotli (requires ngx_brotli module)
brotli on;
brotli_types text/html text/css application/javascript image/svg+xml;

# Set aggressive caching for immutable assets
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Trade-off:** Brotli compression achieves 15-25% smaller files than gzip but requires
more CPU for compression. Use brotli for static assets (pre-compressed) and gzip for
dynamic content.

#### 3. Responsive Images with Modern Formats

```html
<!-- BEFORE: Single 2MB PNG for all devices -->
<img src="/hero.png" alt="Hero">

<!-- AFTER: Format negotiation + responsive sizing -->
<picture>
  <source srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w"
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px"
          type="image/avif">
  <source srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px"
          type="image/webp">
  <img src="/hero-800.jpg" alt="Hero" width="1200" height="600"
       fetchpriority="high" decoding="async">
</picture>
```

**Measured savings:**
- AVIF: 50-70% smaller than JPEG at equivalent quality
- WebP: 25-35% smaller than JPEG
- On a 4G mobile connection, a 200KB WebP loads in ~400ms vs 800ms for a 500KB JPEG

**Trade-off:** AVIF encoding is 10-20x slower than JPEG. Pre-generate at build time or
use an image CDN (Cloudinary, imgix, Cloudflare Images) for on-the-fly conversion.

#### 4. Inline Critical CSS, Defer the Rest

```html
<head>
  <!-- Inline only above-the-fold CSS (target: <14KB to fit in first TCP round-trip) -->
  <style>
    /* Critical CSS extracted by tools like critters or critical */
    .hero { display: flex; align-items: center; min-height: 60vh; }
    .hero img { width: 100%; height: auto; }
    nav { display: flex; gap: 1rem; padding: 1rem; }
  </style>

  <!-- Defer non-critical CSS -->
  <link rel="preload" href="/styles.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
```

**Measured impact:** Inlining critical CSS typically reduces LCP by 300-800ms on 3G
connections by eliminating a render-blocking round-trip.

**Trade-off:** Inlined CSS is not cached separately. If critical CSS exceeds ~14KB, it
no longer fits in the initial TCP congestion window and loses its advantage. Use tools
like `critters` (Webpack/Vite plugin) to automate extraction.

### INP Optimization

#### 1. Break Up Long Tasks with `scheduler.yield()`

```javascript
// BEFORE: Single long task blocks main thread for 300ms+
function processLargeDataset(items) {
  for (const item of items) {
    heavyComputation(item);  // 5ms per item, 1000 items = 5000ms blocked
    updateDOM(item);
  }
}

// AFTER: Yield to main thread, allowing interactions to process
async function processLargeDataset(items) {
  const BATCH_SIZE = 50; // ~250ms per batch, then yield
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      heavyComputation(item);
      updateDOM(item);
    }
    // Yield to main thread — interactions can now be processed
    await scheduler.yield();
  }
}
```

**Key advantage of `scheduler.yield()` over `setTimeout(0)`:** `scheduler.yield()`
schedules the continuation at the *front* of the task queue, not the back. This means
your remaining work runs immediately after pending user interactions, rather than after
all other queued tasks. Result: same INP improvement with less total processing delay.

**Browser support:** Chrome 129+ (September 2024). For older browsers, use a polyfill:

```javascript
// Polyfill for browsers without scheduler.yield
async function yieldToMain() {
  if ('scheduler' in globalThis && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

#### 2. Debounce and Throttle Expensive Handlers

```javascript
// BEFORE: Scroll handler fires 60+ times/second, each triggering layout
window.addEventListener('scroll', () => {
  const rect = element.getBoundingClientRect(); // forces layout
  element.style.transform = `translateY(${rect.top}px)`; // triggers paint
});

// AFTER: Use requestAnimationFrame to batch to paint cycle
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      element.style.transform = `translateY(${rect.top}px)`;
      ticking = false;
    });
    ticking = true;
  }
});
```

**Measured impact:** Reducing scroll handler frequency from 60/s to 1/frame typically
cuts INP for scroll-triggered interactions by 40-70%.

#### 3. Use `content-visibility` for Off-Screen Content

```css
/* Browser skips rendering for off-screen sections entirely */
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* estimated height to prevent CLS */
}
```

**Measured impact:** Chrome team reported rendering time reductions of 50-70% for pages
with many off-screen sections. The `contain-intrinsic-size` prevents CLS by reserving
space.

**Trade-off:** `content-visibility: auto` can cause `find-in-page` (Ctrl+F) to miss
content in some edge cases. Also, any element with `content-visibility: auto` that becomes
visible will trigger a rendering cost at that moment.

#### 4. Move Heavy Computation to Web Workers

```javascript
// BEFORE: JSON parsing blocks main thread for 200ms+
const data = JSON.parse(hugeJsonString); // blocks INP

// AFTER: Offload to Web Worker
// worker.js
self.onmessage = (e) => {
  const data = JSON.parse(e.data);
  self.postMessage(data);
};

// main.js
const worker = new Worker('/worker.js');
worker.postMessage(hugeJsonString);
worker.onmessage = (e) => {
  renderData(e.data); // Only DOM update on main thread
};
```

**Trade-off:** Web Workers have no DOM access and data transfer via `postMessage` has
serialization cost. Use `Transferable` objects (ArrayBuffer) for large binary data to
avoid the copy overhead. Structured clone for objects typically adds 1-5ms per MB.

### CLS Optimization

#### 1. Always Set Explicit Dimensions on Media

```html
<!-- BEFORE: No dimensions — browser allocates 0px, then shifts -->
<img src="/photo.jpg" alt="Product">

<!-- AFTER: Explicit width/height lets browser reserve space -->
<img src="/photo.jpg" alt="Product" width="800" height="600"
     loading="lazy" decoding="async">

<!-- AFTER (modern CSS approach): aspect-ratio for responsive images -->
<style>
  .responsive-img {
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 3; /* Browser reserves correct space before load */
  }
</style>
<img class="responsive-img" src="/photo.jpg" alt="Product"
     loading="lazy" decoding="async">
```

**Measured impact:** Adding `width`/`height` attributes to images eliminates ~60% of all
CLS issues across the web.

#### 2. Optimize Font Loading to Prevent Text Reflow

```css
/* Option A: font-display: swap (shows text immediately with fallback) */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  /* Risk: fallback → custom font swap causes CLS if metrics differ */
}

/* Option B: font-display: optional (best for CLS, may not show custom font) */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional;
  /* Font only used if already cached; zero CLS guaranteed */
}

/* Option C: Size-adjust fallback (best of both worlds) */
@font-face {
  font-family: 'CustomFont Fallback';
  src: local('Arial');
  size-adjust: 105.2%;     /* Match custom font metrics */
  ascent-override: 95%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'CustomFont', 'CustomFont Fallback', sans-serif;
}
```

**Preload critical fonts:**
```html
<link rel="preload" href="/fonts/custom.woff2" as="font" type="font/woff2" crossorigin>
```

**Trade-offs:**
- `font-display: swap` — zero FOIT but may cause CLS on text reflow (~0.02-0.08 CLS)
- `font-display: optional` — zero CLS but first-time visitors may not see custom font
- `size-adjust` fallback — near-zero CLS with custom font display, but requires per-font metric tuning

#### 3. Reserve Space for Dynamic Content

```html
<!-- BEFORE: Ad loads and pushes content down -->
<div class="content">
  <p>Article text here...</p>
  <div id="ad-slot"></div> <!-- 0px until ad loads -->
  <p>More content...</p>
</div>

<!-- AFTER: Reserve space with min-height -->
<div class="content">
  <p>Article text here...</p>
  <div id="ad-slot" style="min-height: 250px; background: #f0f0f0;">
    <!-- 250px reserved for standard IAB medium rectangle ad -->
  </div>
  <p>More content...</p>
</div>
```

**For cookie banners and notification bars:**
```css
/* Reserve space at top/bottom for banners that push content */
.cookie-banner-placeholder {
  min-height: 80px; /* match your banner height */
}

/* OR: Use overlay positioning (no layout shift) */
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  /* Fixed positioning does NOT cause layout shifts */
}
```

#### 4. Use CSS `transform` for Animations

```css
/* BEFORE: Animating layout properties causes CLS */
.slide-in {
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { margin-left: -100%; }  /* triggers layout shift */
  to { margin-left: 0; }
}

/* AFTER: transform animations do not cause layout shifts */
.slide-in {
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { transform: translateX(-100%); }  /* compositor-only, no CLS */
  to { transform: translateX(0); }
}
```

**Rule:** Only `transform` and `opacity` animations are compositor-only and CLS-free.
Animating `top`, `left`, `width`, `height`, `margin`, or `padding` triggers layout and
contributes to CLS.

---

## Anti-Patterns

### 1. Lazy Loading the LCP Image
Adding `loading="lazy"` to the largest above-the-fold image delays its fetch until the
browser determines it is near the viewport — after layout. This adds 200-1000ms to LCP.
**Fix:** Never lazy-load above-the-fold images. Use `fetchpriority="high"` instead.

### 2. Preloading Everything
Excessive `<link rel="preload">` tags cause bandwidth contention, delaying the resources
that actually matter. Chrome limits effective preloads to ~6 concurrent connections per
origin. **Fix:** Preload only the LCP image and critical font (1-2 preloads max).

### 3. Third-Party Script Tags in `<head>`
Synchronous third-party scripts (analytics, tag managers, chat widgets) block rendering.
A single 100KB synchronous script on 3G adds 500ms+ to LCP.
**Fix:** Load all third-party scripts with `async` or `defer`. Use `requestIdleCallback`
or `setTimeout` for non-critical scripts.

### 4. Using `display: none` Instead of `content-visibility`
`display: none` still parses and constructs the DOM for hidden elements. For large
off-screen sections, this wastes CPU during interactions.
**Fix:** Use `content-visibility: auto` for sections below the fold.

### 5. Placeholder Spinners That Cause Layout Shift
Replacing a spinner (50px tall) with actual content (300px tall) causes a 250px shift.
**Fix:** Use skeleton screens that match the final content dimensions.

### 6. Importing Entire Libraries for Small Features
`import _ from 'lodash'` pulls in ~72KB minified for functions like `debounce` (0.3KB).
**Fix:** Use `import debounce from 'lodash-es/debounce'` or native alternatives.

### 7. Unoptimized `useEffect` in React Causing INP Issues
```javascript
// ANTI-PATTERN: useEffect with missing dependency causes re-render storms
useEffect(() => {
  setData(transform(rawData)); // triggers re-render every time rawData ref changes
}); // missing dependency array = runs every render
```
**Fix:** Use `useMemo` for expensive transforms, add correct dependency arrays.

### 8. Client-Side Rendering for Content-Heavy Pages
SPAs that fetch data after hydration add 1-3 seconds to LCP because the browser must:
download JS bundle > parse > execute > fetch data > render. Each step is sequential.
**Fix:** Use SSR/SSG for content-heavy pages, CSR only for authenticated dashboards.

### 9. Not Setting `decoding="async"` on Non-LCP Images
Without `decoding="async"`, image decoding can block the main thread for 10-50ms per
large image, accumulating into INP-impacting long tasks.
**Fix:** Add `decoding="async"` to all images except the LCP image.

### 10. Using `@import` in CSS Files
CSS `@import` creates sequential request chains. Each `@import` adds a full round-trip:
```css
/* style.css — ANTI-PATTERN */
@import url('reset.css');   /* fetch 1: 200ms */
@import url('layout.css');  /* fetch 2: waits for fetch 1, +200ms */
@import url('theme.css');   /* fetch 3: waits for fetch 2, +200ms */
/* Total: 600ms of sequential fetching */
```
**Fix:** Use `<link>` tags in HTML (fetched in parallel) or a CSS bundler.

### 11. Not Using a CDN for Static Assets
Serving images from a single origin server adds 50-300ms of latency for distant users.
A CDN reduces this to 5-20ms by serving from edge nodes.
**Fix:** Use a CDN for all static assets. Cost: ~$0.01-0.08/GB, trivial for most sites.

### 12. Dynamic `import()` on the Critical Path
```javascript
// ANTI-PATTERN: Dynamic import delays the hero component render
const HeroSection = lazy(() => import('./HeroSection'));
// This adds a network round-trip to LCP
```
**Fix:** Statically import above-the-fold components. Use dynamic `import()` only for
below-the-fold or interaction-triggered components.

---

## Architecture-Level Decisions

### Rendering Strategy Impact on LCP

| Strategy | Typical LCP | Pros | Cons |
|----------|------------|------|------|
| **SSR** | 1.0-2.0s | Content in first HTML response; best LCP | Server CPU cost; TTFB depends on server speed |
| **SSG** | 0.5-1.5s | Pre-built HTML; fastest TTFB from CDN | Not suitable for dynamic/personalized content |
| **CSR (SPA)** | 2.5-5.0s | Rich interactivity; simpler deployment | Worst LCP; requires JS to render any content |
| **Streaming SSR** | 0.8-1.8s | Progressive HTML delivery; good LCP + INP | Complexity; requires framework support |
| **Islands Architecture** | 0.6-1.5s | Minimal JS; near-SSG LCP with targeted interactivity | Newer pattern; limited framework support |
| **RSC (React Server Components)** | 0.8-1.8s | Zero client JS for server components; streaming | React ecosystem only; learning curve |

**Key finding:** Switching from CSR to SSR/SSG typically cuts LCP by 40-60% (web.dev).

### Streaming HTML

Streaming SSR sends HTML chunks as they are generated, rather than waiting for the entire
page to render on the server. This improves both TTFB and LCP:

```
Traditional SSR:  [Server renders 2s] → [Send HTML] → [Browser paints at 2.5s]
Streaming SSR:    [Server starts] → [Send <head> at 100ms] → [Send hero at 300ms] → [Browser paints at 800ms]
```

**Framework support:**
- Next.js: Built-in with App Router (`loading.js` for streaming boundaries)
- Remix: Native streaming with `defer()` loaders
- SvelteKit: Streaming by default in SSR mode
- Astro: Streaming SSR via adapter configuration

### Islands Architecture (Astro, Fresh, Marko)

Islands isolate interactive components into "islands" of JavaScript within a sea of
static HTML. The browser only downloads and hydrates JavaScript for interactive components.

```
Traditional SPA:    [Download 500KB JS] → [Parse] → [Hydrate entire page] → [Interactive]
Islands:            [Static HTML paints immediately] → [Download 50KB JS for 2 islands] → [Hydrate only islands]
```

**Impact on CWV:**
- **LCP:** Near-SSG performance because HTML is static
- **INP:** Better because less JavaScript means fewer long tasks during hydration
- **CLS:** Better because static HTML has stable layout from first paint

**Trade-off:** Islands architecture requires decomposing your UI into static vs interactive
parts at the component level, which adds architectural complexity. Not all UI patterns map
cleanly to this model (e.g., highly interactive dashboards).

### Progressive Enhancement for INP

Build core functionality in HTML/CSS, enhance with JavaScript. If a form works without
JS (via standard `<form>` submission), then JS failures or slow loads do not block
interactions. This architectural choice guarantees zero INP for core flows before JS loads.

---

## Testing & Regression Prevention

### Lighthouse CI Setup

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install & Build
        run: npm ci && npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

### Lighthouse CI Configuration with Budgets

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/products",
        "http://localhost:3000/checkout"
      ],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start"
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "interactive": ["warn", { "maxNumericValue": 3500 }],
        "categories:performance": ["error", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Performance Budget File

```json
// budget.json (for Lighthouse --budget-path)
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "total-blocking-time", "budget": 300 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "stylesheet", "budget": 100 },
      { "resourceType": "total", "budget": 1000 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 },
      { "resourceType": "script", "budget": 15 }
    ]
  }
]
```

### CrUX API Monitoring Script

```javascript
// scripts/check-cwv.mjs — Run daily in CI or cron
const API_KEY = process.env.CRUX_API_KEY;
const ORIGIN = 'https://yoursite.com';

async function checkCWV() {
  const res = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({ origin: ORIGIN, formFactor: 'PHONE' }),
    }
  );
  const data = await res.json();
  const metrics = data.record.metrics;

  const checks = [
    { name: 'LCP', value: metrics.largest_contentful_paint.percentiles.p75, threshold: 2500 },
    { name: 'INP', value: metrics.interaction_to_next_paint.percentiles.p75, threshold: 200 },
    { name: 'CLS', value: metrics.cumulative_layout_shift.percentiles.p75, threshold: 0.1 },
  ];

  let failed = false;
  for (const check of checks) {
    const status = check.value <= check.threshold ? 'PASS' : 'FAIL';
    console.log(`${check.name}: ${check.value} (threshold: ${check.threshold}) [${status}]`);
    if (status === 'FAIL') failed = true;
  }

  if (failed) {
    // Send alert via Slack/PagerDuty/email
    console.error('Core Web Vitals regression detected!');
    process.exit(1);
  }
}

checkCWV();
```

### Automated Regression Alerts

Set up monitoring at three levels:
1. **CI/CD (Lab):** Lighthouse CI on every PR — catches regressions before merge
2. **Daily CrUX check (Field):** Script above — catches real-user regressions within 28 days
3. **Real-time RUM (Field):** web-vitals library sending to your analytics — catches regressions within minutes

**Alert thresholds recommendation:**
- Warn when p75 exceeds 80% of the "Good" threshold (LCP > 2.0s, INP > 160ms, CLS > 0.08)
- Alert/block when p75 exceeds the "Good" threshold (LCP > 2.5s, INP > 200ms, CLS > 0.1)

---

## Decision Trees

### "My LCP is Slow" Decision Tree

```
LCP > 2.5s?
├── Check TTFB first (DevTools → Network → document request)
│   ├── TTFB > 800ms → Server-side issue
│   │   ├── Slow database queries → Add caching layer (Redis/CDN)
│   │   ├── No CDN → Add CDN (reduces TTFB by 100-500ms)
│   │   └── Dynamic page on every request → Switch to SSG or ISR
│   └── TTFB < 800ms → Client-side issue
│       ├── What is the LCP element? (DevTools → Performance → LCP marker)
│       │   ├── Image
│       │   │   ├── Is it lazy-loaded? → Remove loading="lazy"
│       │   │   ├── Is it in CSS background-image? → Move to <img> tag + preload
│       │   │   ├── Is fetchpriority="high" set? → Add it
│       │   │   ├── Is image > 200KB? → Convert to WebP/AVIF, resize
│       │   │   └── Is image preloaded? → Add <link rel="preload">
│       │   ├── Text block
│       │   │   ├── Font blocking render? → Add font-display: optional
│       │   │   ├── CSS render-blocking? → Inline critical CSS
│       │   │   └── JS rendering content? → Switch to SSR
│       │   └── Video
│       │       ├── Add poster attribute with optimized image
│       │       └── Preload poster image
│       └── Check render-blocking resources (Lighthouse audit)
│           ├── Blocking CSS > 50KB → Extract + inline critical CSS
│           ├── Blocking JS in <head> → Add defer attribute
│           └── Third-party scripts blocking → Load async or defer to after LCP
```

### "I Have Layout Shifts" Decision Tree

```
CLS > 0.1?
├── Identify shifting elements (DevTools → Performance → Layout Shift clusters)
│   ├── Images/videos shifting?
│   │   ├── Missing width/height attributes → Add explicit dimensions
│   │   ├── Responsive but no aspect-ratio → Add CSS aspect-ratio
│   │   └── Container resizing → Set min-height on container
│   ├── Text shifting (font swap)?
│   │   ├── Large CLS from font → Use font-display: optional
│   │   ├── Moderate CLS from font → Use size-adjust on fallback
│   │   └── Slow font load → Preload critical font files
│   ├── Ad/embed shifting?
│   │   ├── No reserved space → Add min-height to ad container
│   │   ├── Ad sizes vary → Use the most common ad size as min-height
│   │   └── Consider sticky/overlay ad formats (no layout shift)
│   ├── Dynamically injected content?
│   │   ├── Cookie banner → Use position: fixed (no CLS)
│   │   ├── Notification bar → Reserve space with min-height
│   │   └── Lazy-loaded components → Use skeleton with matching dimensions
│   └── CSS animations?
│       ├── Using top/left/margin → Switch to transform: translate()
│       └── Using width/height → Switch to transform: scale()
```

### "INP is High" Decision Tree

```
INP > 200ms?
├── Which phase is slow? (web-vitals attribution build)
│   ├── Input Delay > 100ms (waiting for main thread)
│   │   ├── Long tasks visible? (DevTools → Performance → Long Tasks)
│   │   │   ├── Third-party scripts → Defer to after interaction, use Partytown
│   │   │   ├── Heavy initialization → Use requestIdleCallback or lazy init
│   │   │   └── Large JS bundle → Code-split, tree-shake, reduce bundle
│   │   └── Frequent timer/interval callbacks → Reduce frequency, use rAF
│   ├── Processing Duration > 100ms (event handler too slow)
│   │   ├── Layout thrashing? → Batch DOM reads before writes
│   │   ├── Expensive computation? → Move to Web Worker
│   │   ├── Large React re-render? → Use memo/useMemo, virtualize lists
│   │   └── Synchronous API calls? → Should never block event handler
│   └── Presentation Delay > 100ms (rendering after handler)
│       ├── Large DOM (>1500 nodes) → Reduce DOM size, virtualize
│       ├── Complex CSS selectors → Simplify, use BEM/utility classes
│       └── Many style recalculations → Use CSS containment (contain: layout)
├── Is it a specific interaction type?
│   ├── Click handlers → Check for synchronous work in handler
│   ├── Key press handlers → Check for synchronous search/filter
│   └── Scroll-triggered → Use passive listeners, throttle with rAF
```

---

## Code Examples

### 1. Complete Web Vitals Monitoring Setup

```javascript
// lib/vitals.js — Production-ready CWV monitoring
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

const ANALYTICS_ENDPOINT = '/api/vitals';
const queue = [];
let flushTimer = null;

function enqueue(metric) {
  queue.push({
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    page: window.location.pathname,
    navigationType: metric.navigationType,
    // Attribution data for debugging
    ...(metric.attribution && {
      debug: getDebugInfo(metric),
    }),
  });

  // Batch send: flush after 5 seconds or 10 metrics
  clearTimeout(flushTimer);
  if (queue.length >= 10) {
    flush();
  } else {
    flushTimer = setTimeout(flush, 5000);
  }
}

function getDebugInfo(metric) {
  if (metric.name === 'LCP') {
    return {
      element: metric.attribution.element,
      url: metric.attribution.url,
      ttfb: metric.attribution.timeToFirstByte,
      loadDelay: metric.attribution.resourceLoadDelay,
      loadTime: metric.attribution.resourceLoadTime,
      renderDelay: metric.attribution.elementRenderDelay,
    };
  }
  if (metric.name === 'INP') {
    return {
      eventType: metric.attribution.interactionType,
      target: metric.attribution.interactionTarget,
      inputDelay: metric.attribution.inputDelay,
      processingTime: metric.attribution.processingDuration,
      presentationDelay: metric.attribution.presentationDelay,
    };
  }
  if (metric.name === 'CLS') {
    return {
      largestTarget: metric.attribution.largestShiftTarget,
      largestValue: metric.attribution.largestShiftValue,
    };
  }
}

function flush() {
  if (queue.length === 0) return;
  const body = JSON.stringify(queue.splice(0));
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, body);
  } else {
    fetch(ANALYTICS_ENDPOINT, { body, method: 'POST', keepalive: true });
  }
}

// Register listeners — call ONCE per page load
onLCP(enqueue);
onINP(enqueue);
onCLS(enqueue);

// Ensure final flush on page hide
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
```

### 2. LCP Preload with Dynamic Detection

```javascript
// Detect and preload the LCP image dynamically based on viewport
// Place in <head> as inline script for earliest execution
(function() {
  const mq = window.matchMedia('(max-width: 768px)');
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.fetchPriority = 'high';

  if (mq.matches) {
    link.href = '/images/hero-mobile.webp';
    link.type = 'image/webp';
  } else {
    link.href = '/images/hero-desktop.webp';
    link.type = 'image/webp';
  }

  document.head.appendChild(link);
})();
```

### 3. Skeleton Screen That Prevents CLS

```html
<!-- Skeleton matches final content dimensions exactly -->
<div class="product-card" style="width: 300px; min-height: 420px;">
  <div class="skeleton-image" style="aspect-ratio: 4/3; background: #e0e0e0;"></div>
  <div class="skeleton-text" style="height: 24px; margin: 12px 0; background: #e0e0e0; border-radius: 4px;"></div>
  <div class="skeleton-text" style="height: 16px; width: 60%; background: #e0e0e0; border-radius: 4px;"></div>
  <div class="skeleton-price" style="height: 28px; width: 40%; margin-top: 8px; background: #e0e0e0; border-radius: 4px;"></div>
</div>

<style>
  .product-card [class^="skeleton-"] {
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
```

### 4. Yielding Pattern with Time-Slicing for INP

```javascript
// Time-based yielding — more adaptive than fixed batch sizes
async function processItems(items, processItem, maxBlockTime = 50) {
  let deadline = performance.now() + maxBlockTime;

  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    if (performance.now() >= deadline) {
      // Yield to main thread for pending interactions
      await scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0));
      deadline = performance.now() + maxBlockTime;
    }
  }
}

// Usage
await processItems(
  thousandProducts,
  (product) => renderProductCard(product),
  50 // yield every 50ms to stay under long-task threshold
);
```

### 5. Responsive Image Component (React)

```jsx
// components/OptimizedImage.jsx
function OptimizedImage({
  src,
  alt,
  width,
  height,
  isLCP = false,
  sizes = '100vw',
}) {
  // Generate srcset for multiple widths
  const widths = [400, 800, 1200, 1600];
  const avifSrcSet = widths.map(w => `${src}?format=avif&w=${w} ${w}w`).join(', ');
  const webpSrcSet = widths.map(w => `${src}?format=webp&w=${w} ${w}w`).join(', ');

  return (
    <picture>
      <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" />
      <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />
      <img
        src={`${src}?format=webp&w=800`}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={isLCP ? 'eager' : 'lazy'}
        decoding={isLCP ? 'sync' : 'async'}
        fetchPriority={isLCP ? 'high' : 'auto'}
        style={{ width: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
      />
    </picture>
  );
}

// Usage
<OptimizedImage
  src="/api/images/hero"
  alt="Product showcase"
  width={1200}
  height={600}
  isLCP={true}
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

### 6. Third-Party Script Loading Strategy

```html
<!-- Priority 1: Critical (inline in <head>) -->
<!-- Only truly critical CSS and no JS in head -->

<!-- Priority 2: High (async, in <head>) — needed for page functionality -->
<script async src="/js/app.bundle.js"></script>

<!-- Priority 3: Medium (defer) — needed but not for initial render -->
<script defer src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>

<!-- Priority 4: Low — load after page is interactive -->
<script>
  // Load non-critical third-party scripts after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Chat widget
      const chat = document.createElement('script');
      chat.src = 'https://widget.chat-service.com/loader.js';
      chat.async = true;
      document.body.appendChild(chat);

      // Social sharing buttons
      const social = document.createElement('script');
      social.src = 'https://platform.twitter.com/widgets.js';
      social.async = true;
      document.body.appendChild(social);
    }, 3000); // 3 second delay after load
  });
</script>
```

### 7. Next.js App Router Configuration for Optimal CWV

```tsx
// app/layout.tsx — Root layout with CWV optimizations
import { Inter } from 'next/font/google';

// Next.js automatically optimizes Google Fonts:
// - Self-hosts the font files (no external request)
// - Generates size-adjust CSS for zero-CLS font loading
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',        // Show text immediately
  preload: true,           // Preload font files
  fallback: ['system-ui'], // Fallback while loading
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://cdn.yoursite.com" />
        <link rel="dns-prefetch" href="https://analytics.yoursite.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}

// app/page.tsx — Page with optimized LCP
import Image from 'next/image';

export default function HomePage() {
  return (
    <main>
      {/* Next.js Image component handles:
          - Automatic WebP/AVIF format negotiation
          - Responsive srcset generation
          - Lazy loading (except when priority=true)
          - Width/height for CLS prevention */}
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1200}
        height={600}
        priority           // Sets fetchpriority="high" + no lazy loading
        sizes="100vw"
        quality={80}
      />
    </main>
  );
}
```

### 8. Layout Shift Debugging Overlay

```javascript
// Debug tool: Visualize layout shifts in real-time during development
if (process.env.NODE_ENV === 'development') {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) { // Only unexpected shifts
        for (const source of entry.sources || []) {
          const el = source.node;
          if (el) {
            // Highlight shifting element with red border
            el.style.outline = '3px solid red';
            el.setAttribute('data-cls-value', entry.value.toFixed(4));
            console.warn('Layout shift detected:', {
              element: el,
              value: entry.value.toFixed(4),
              previousRect: source.previousRect,
              currentRect: source.currentRect,
            });
            // Remove highlight after 2 seconds
            setTimeout(() => { el.style.outline = ''; }, 2000);
          }
        }
      }
    }
  });
  observer.observe({ type: 'layout-shift', buffered: true });
}
```

---

## Quick Reference

### Metric Thresholds

| Metric | Good | Acceptable | Needs Work | Percentile Used |
|--------|------|------------|------------|----------------|
| **LCP** | < 2.5s | 2.5s - 4.0s | > 4.0s | 75th (p75) |
| **INP** | < 200ms | 200ms - 500ms | > 500ms | 75th (p75) |
| **CLS** | < 0.1 | 0.1 - 0.25 | > 0.25 | 75th (p75) |

### Top 3 Fixes Per Metric

| Metric | Fix #1 | Fix #2 | Fix #3 |
|--------|--------|--------|--------|
| **LCP** | Add `fetchpriority="high"` to LCP image (~700ms gain) | Use WebP/AVIF images (50-70% size reduction) | Inline critical CSS (300-800ms gain on 3G) |
| **INP** | Break long tasks with `scheduler.yield()` | Move computation to Web Workers | Use `content-visibility: auto` for off-screen DOM |
| **CLS** | Add `width`/`height` to all images (fixes ~60% of CLS) | Use `font-display: optional` or `size-adjust` | Reserve space for ads with `min-height` |

### Measurement Cheat Sheet

| Need | Tool | Command / URL |
|------|------|--------------|
| Quick check | PageSpeed Insights | pagespeed.web.dev |
| Lab audit | Lighthouse CLI | `npx lighthouse https://url --output html` |
| Field data (per-URL) | CrUX API | `POST chromeuxreport.googleapis.com/v1/records:queryRecord` |
| Field data (bulk) | BigQuery | `SELECT * FROM chrome-ux-report.all.YYYYMM` |
| CI/CD gate | Lighthouse CI | `npx @lhci/cli autorun --config=lighthouserc.json` |
| Real-time RUM | web-vitals library | `npm install web-vitals` |
| Debug shifts | DevTools | Performance tab > "Layout Shifts" track |
| Debug INP | DevTools | Performance tab > "Interactions" track |

### Resource Size Budgets

| Resource Type | Recommended Budget | Why |
|--------------|-------------------|-----|
| Total page weight | < 1MB (mobile), < 2MB (desktop) | 1MB on 3G takes ~5s to download |
| JavaScript (total) | < 300KB compressed | JS is byte-for-byte the most expensive resource |
| CSS (total) | < 100KB compressed | Render-blocking; affects LCP directly |
| LCP image | < 200KB | Must load within the 2.5s budget |
| Fonts | < 100KB total | Each font file adds a blocking request |
| Third-party scripts | < 10 scripts, < 200KB total | Each script competes for main thread |

---

*Researched: 2026-03-08 | Sources: [web.dev/articles/lcp](https://web.dev/articles/lcp), [web.dev/articles/inp](https://web.dev/articles/inp), [web.dev/articles/cls](https://web.dev/articles/cls), [web.dev/articles/optimize-lcp](https://web.dev/articles/optimize-lcp), [web.dev/case-studies/vodafone](https://web.dev/case-studies/vodafone), [web.dev/case-studies/vitals-business-impact](https://web.dev/case-studies/vitals-business-impact), [web.dev/articles/fetch-priority](https://web.dev/articles/fetch-priority), [web.dev/articles/optimize-long-tasks](https://web.dev/articles/optimize-long-tasks), [developer.chrome.com/docs/crux](https://developer.chrome.com/docs/crux/guides/crux-api), [github.com/GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals), [addyosmani.com/blog/fetch-priority](https://addyosmani.com/blog/fetch-priority/), [developer.mozilla.org/en-US/blog/fix-image-lcp](https://developer.mozilla.org/en-US/blog/fix-image-lcp/), [nitropack.io/blog/interaction-to-next-paint-inp](https://nitropack.io/blog/interaction-to-next-paint-inp/), [developer.chrome.com/blog/use-scheduler-yield](https://developer.chrome.com/blog/use-scheduler-yield), [HTTP Archive 2025 Web Almanac](https://almanac.httparchive.org)*
