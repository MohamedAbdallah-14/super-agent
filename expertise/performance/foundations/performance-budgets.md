# Performance Budgets -- Performance Expertise Module

> Performance budgets are predefined limits on metrics that affect user experience -- page weight, load time, time to interactive, API response time. They transform performance from a subjective "feels fast" into a measurable engineering constraint that can be enforced in CI, tracked over time, and tied directly to business outcomes.

> **Impact:** Critical
> **Applies to:** All (Web, Mobile, Backend, Infrastructure)
> **Key metrics:** Largest Contentful Paint (LCP), Interaction to Next Paint (INP), Cumulative Layout Shift (CLS), Total Bundle Size, API p95 Latency, Database Query p95

---

## Why This Matters

Performance is not a nice-to-have. It is a revenue lever, a retention mechanism, and an SEO ranking signal. Every millisecond of delay has a measurable cost.

### Business Impact -- Real Numbers

| Company | Finding | Source |
|---------|---------|--------|
| Amazon | Every 100ms of added latency cost 1% in sales | Conductor / Greg Linden (2006) |
| Google | 500ms additional load time caused a 20% drop in traffic | Google research |
| Walmart | Accelerating page load by 100ms increased incremental revenue measurably | Walmart Labs engineering |
| Vodafone Italy | Improving LCP by 31% drove 8% more sales | web.dev case study |
| Rakuten 24 | Improved Core Web Vitals led to 53.4% increase in revenue per visitor, 33.1% increase in conversion rate, 15.2% increase in average order value | web.dev case study |
| Cdiscount | Improving all 3 Core Web Vitals contributed to 6% revenue uplift during Black Friday | web.dev case study |
| The Telegraph | An 8-second load delay caused a 17.52% decrease in pageviews | WPO Stats |
| Pinterest | Reducing perceived wait time by 40% increased search engine traffic by 15% and sign-ups by 15% | WPO Stats |

### Human Perception Thresholds

Understanding how humans perceive delay is essential to setting meaningful budgets:

| Delay | Perception |
|-------|------------|
| 0-100ms | Feels instantaneous. Users perceive direct manipulation. |
| 100-300ms | Slight delay noticed, but flow of thought is unbroken. |
| 300-1000ms | Noticeable lag. Users sense the system is working. |
| 1000-3000ms | Users lose focus. They may switch tabs. |
| 3000-5000ms | Frustration sets in. Significant abandonment begins. |
| >5000ms | Task abandonment. 53% of mobile users leave if load exceeds 3s (Google). |

### SEO and Ranking Signal

Google uses Core Web Vitals as a ranking factor. As of 2025, only 48% of mobile pages and 56% of desktop pages pass all three Core Web Vitals (LCP, INP, CLS). Pages that pass get preferential treatment in search rankings. Performance budgets are the mechanism that ensures your pages stay in the passing zone.

---

## Performance Budgets and Targets

### Core Web Vitals Thresholds (2025)

Google evaluates Core Web Vitals at the 75th percentile (p75) of real user data. This means 75% of page visits must have a "good" experience for the page to pass.

| Metric | Good | Needs Improvement | Poor |
|--------|------|--------------------|------|
| LCP (Largest Contentful Paint) | <=2.5s | 2.5s-4.0s | >4.0s |
| INP (Interaction to Next Paint) | <=200ms | 200ms-500ms | >500ms |
| CLS (Cumulative Layout Shift) | <=0.1 | 0.1-0.25 | >0.25 |

Note: INP replaced First Input Delay (FID) as a Core Web Vital in March 2024. INP measures responsiveness across the entire page lifecycle, not just the first interaction.

### Frontend Resource Budgets

| Resource | Consumer App (Good) | Consumer App (Acceptable) | Enterprise/Internal (Acceptable) |
|----------|---------------------|---------------------------|----------------------------------|
| Total page weight (compressed) | <500 KB | <1 MB | <2 MB |
| JavaScript (compressed) | <170 KB | <400 KB | <800 KB |
| CSS (compressed) | <50 KB | <100 KB | <200 KB |
| Images (total per page) | <500 KB | <1 MB | <2 MB |
| Fonts (all files) | <100 KB | <200 KB | <300 KB |
| Third-party scripts | <100 KB | <250 KB | <400 KB |
| Document (HTML) | <18 KB | <50 KB | <100 KB |

### Timing Budgets by Application Type

| Metric | Consumer Mobile | Consumer Desktop | Enterprise SPA | Internal Tool |
|--------|----------------|-----------------|----------------|---------------|
| LCP | <2.0s | <2.5s | <3.0s | <4.0s |
| INP | <150ms | <200ms | <300ms | <500ms |
| CLS | <0.05 | <0.1 | <0.1 | <0.25 |
| Time to First Byte (TTFB) | <600ms | <800ms | <1.0s | <1.5s |
| First Contentful Paint (FCP) | <1.5s | <1.8s | <2.5s | <3.0s |
| Total Blocking Time (TBT) | <200ms | <300ms | <500ms | <800ms |

E-commerce sites should use the strictest thresholds -- lower LCP (2.0s vs 2.5s), tighter INP (150ms vs 200ms), and stricter CLS (0.05 vs 0.1) because conversion-critical pages must feel instant.

### Backend and API Budgets

| Metric | Good | Acceptable | Needs Work |
|--------|------|------------|------------|
| API response p50 | <100ms | <200ms | >500ms |
| API response p95 | <300ms | <800ms | >1500ms |
| API response p99 | <1000ms | <2000ms | >5000ms |
| Database query p50 | <10ms | <50ms | >100ms |
| Database query p95 | <50ms | <200ms | >500ms |
| Database query p99 | <200ms | <500ms | >1000ms |
| Slow query log threshold | 200ms | 500ms | 1000ms |

Best-in-class API response times are 100-300ms. Responses under 100ms are perceived as instantaneous by users. The 100-300ms range causes no disruption to flow of thought.

Structure latency SLOs as: "95% of checkout requests complete under 300ms over 30 days" -- the 5% overage serves as your latency error budget.

### Mobile-Specific Considerations

Mobile devices have 4-8x less processing power than desktop. A JavaScript bundle that parses in 200ms on a MacBook Pro can take 2-4 seconds on a mid-range Android phone. Budget accordingly:

- Target devices: Moto G Power (or equivalent ~$200 Android phone)
- Network: Regular 4G (9 Mbps down, 1.5 Mbps up, 170ms RTT)
- JS budget for mobile: <130-170 KB compressed critical-path JavaScript
- Total critical resource budget depends on composition -- the more JS, the smaller other resources must be

---

## Measurement and Profiling

### Lab vs Field Data

| Aspect | Lab (Synthetic) | Field (RUM) |
|--------|----------------|-------------|
| Tool examples | Lighthouse, WebPageTest | CrUX, SpeedCurve, DebugBear |
| Controls | Consistent network, CPU | Real user conditions |
| Use case | CI enforcement, debugging | Understanding real user experience |
| Weakness | Does not reflect real diversity | Noisy, harder to action |
| When to use | Every PR/deploy | Continuous monitoring |

Start with field data (RUM) to identify weaknesses, then use lab tools (Lighthouse) to diagnose and fix. Most teams do this backwards.

### Lighthouse CI Setup -- Step by Step

1. Install Lighthouse CI:

```bash
npm install -g @lhci/cli
# or as a dev dependency
npm install --save-dev @lhci/cli
```

2. Create `budget.json` at project root:

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "document", "budget": 18 },
      { "resourceType": "script", "budget": 170 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "font", "budget": 100 },
      { "resourceType": "third-party", "budget": 100 },
      { "resourceType": "total", "budget": 500 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 15 },
      { "resourceType": "third-party", "budget": 5 },
      { "resourceType": "total", "budget": 50 }
    ],
    "timings": [
      { "metric": "interactive", "budget": 3000 },
      { "metric": "first-contentful-paint", "budget": 1500 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "total-blocking-time", "budget": 300 }
    ]
  },
  {
    "path": "/checkout/*",
    "timings": [
      { "metric": "interactive", "budget": 2000 },
      { "metric": "largest-contentful-paint", "budget": 2000 }
    ]
  }
]
```

Note: `resourceSizes` budgets are in KB (kilobytes). Timing budgets are in milliseconds.

3. Create `.lighthouserc.js`:

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/checkout',
      ],
      numberOfRuns: 3,
      settings: {
        budgetPath: './budget.json',
      },
    },
    assert: {
      assertions: {
        'performance-budget': 'error',
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

4. Create GitHub Actions workflow (`.github/workflows/lighthouse.yml`):

```yaml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Start server
        run: npm run start &

      - name: Audit URLs using Lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/products
          budgetPath: ./budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Bundle Size Monitoring with bundlesize

```json
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/main.*.js",
      "maxSize": "170 kB",
      "compression": "gzip"
    },
    {
      "path": "./dist/vendor.*.js",
      "maxSize": "250 kB",
      "compression": "gzip"
    },
    {
      "path": "./dist/*.css",
      "maxSize": "50 kB",
      "compression": "gzip"
    }
  ]
}
```

Run in CI: `npx bundlesize`

### webpack-bundle-analyzer

Three size metrics to monitor:

| Metric | Meaning | Typical ratio |
|--------|---------|---------------|
| Stat size | Raw source before processing | Baseline (e.g., 556 KB) |
| Parsed size | After minification | ~43% of stat (e.g., 242 KB) |
| Gzipped size | After compression | ~14% of stat (e.g., 80 KB) |

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',      // generates HTML report
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,          // do not auto-open in CI
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    }),
  ],
};
```

---

## Common Bottlenecks

The following are the most frequent causes of budget violations, ranked by how often they occur in real codebases.

### 1. Unoptimized Images (frequency: very high)

- **Cause:** Serving JPEG/PNG when WebP/AVIF would be 30-50% smaller. No responsive sizing.
- **Detection:** Lighthouse "Serve images in next-gen formats" audit. Check total image weight in DevTools Network tab.
- **Fix:** Convert to WebP (30% smaller than JPEG) or AVIF (50% smaller than JPEG). Use `<picture>` with `srcset`. Lazy-load below-fold images. Example: a 337 KB JPEG becomes 122 KB as WebP -- instant 64% reduction.
- **Trade-off:** AVIF encoding is slower (2-5x vs WebP). AVIF browser support is ~93% vs WebP at ~97%.

### 2. Oversized JavaScript Bundles (frequency: very high)

- **Cause:** No code splitting. Importing entire libraries (e.g., all of lodash for one function). No tree shaking.
- **Detection:** webpack-bundle-analyzer treemap. `import-cost` VS Code extension. Bundlesize CI check.
- **Fix:** Dynamic imports, tree-shakeable imports, lighter alternatives. See Optimization Patterns below.
- **Trade-off:** Code splitting adds complexity and waterfall requests. Balance chunk count vs chunk size.

### 3. Render-Blocking Resources (frequency: high)

- **Cause:** Large CSS files in `<head>` without `media` attributes. Synchronous `<script>` tags without `defer` or `async`.
- **Detection:** Lighthouse "Eliminate render-blocking resources" audit. FCP and LCP correlation.
- **Fix:** Inline critical CSS (<14 KB). Load non-critical CSS asynchronously. Add `defer` to scripts.
- **Trade-off:** Inlining CSS increases HTML size and loses caching benefits.

### 4. Too Many Third-Party Scripts (frequency: high)

- **Cause:** Analytics, tag managers, chat widgets, A/B testing tools. Each adds 20-100 KB and often blocks main thread.
- **Detection:** Lighthouse "Reduce the impact of third-party code" audit. Chrome DevTools Third-Party Web.
- **Fix:** Audit necessity. Load non-critical scripts after `load` event. Use `async` or `defer`. Set a dedicated third-party budget of <100 KB.
- **Trade-off:** Removing analytics may reduce business visibility. Negotiate with stakeholders.

### 5. Uncompressed Font Files (frequency: high)

- **Cause:** Using TTF/OTF instead of WOFF2. Loading full character sets for single-language sites.
- **Detection:** Check font file sizes in Network tab. Lighthouse "Ensure text remains visible during webfont load."
- **Fix:** Convert to WOFF2 (30% smaller than WOFF via Brotli compression). Subset fonts (70-79% reduction for single-language sites). A 173 KB WOFF font becomes 99 KB as WOFF2, then 21 KB after subsetting -- 88% total reduction.
- **Trade-off:** Subsetting removes characters needed if you add language support later.

### 6. Unnecessary Polyfills (frequency: medium-high)

- **Cause:** Libraries shipping polyfills for features supported since IE9. One project reduced 97 dependencies to 15 -- 82 were unnecessary polyfills.
- **Detection:** Bundle analyzer showing `core-js`, `es6-promise`, `object-assign` in modern builds. Research shows 50.6% of npm dependencies are bloated.
- **Fix:** Set `browserslist` to target only supported browsers. Use `useBuiltIns: 'usage'` in Babel. Remove polyfills for features in your browser matrix.
- **Trade-off:** Dropping old browser support may exclude a small user segment. Check your analytics.

### 7. Large Monolithic CSS (frequency: medium)

- **Cause:** Single CSS file with every style for every page. No purging of unused rules.
- **Detection:** Chrome DevTools Coverage tab. Lighthouse "Reduce unused CSS."
- **Fix:** PurgeCSS or Tailwind's built-in purge. CSS code splitting per route. Typical reduction: 50-90% of CSS eliminated.
- **Trade-off:** Aggressive purging can remove dynamically-applied classes. Requires safelisting.

### 8. Unoptimized Database Queries (frequency: medium)

- **Cause:** N+1 queries. Missing indexes. Full table scans on large tables.
- **Detection:** Slow query log (PostgreSQL `log_min_duration_statement = 200`). APM tools showing p95 > 200ms.
- **Fix:** Add indexes. Use eager loading. Enable query plan caching. Start slow query threshold at 1000ms, fix top offenders, lower to 500ms, repeat.
- **Trade-off:** Indexes speed reads but slow writes and consume storage.

### 9. No CDN or Poor Caching (frequency: medium)

- **Cause:** Serving static assets from origin server. Short or missing `Cache-Control` headers.
- **Detection:** TTFB > 600ms. Repeat visit performance same as first visit. Check response headers.
- **Fix:** CDN for static assets. `Cache-Control: public, max-age=31536000, immutable` for hashed assets. Short TTL for HTML.
- **Trade-off:** Cache invalidation complexity. Stale content risk for non-hashed assets.

### 10. Layout Thrashing and Forced Reflows (frequency: medium)

- **Cause:** Reading layout properties (offsetHeight) then writing (style changes) in a loop. Missing `width`/`height` on images and iframes.
- **Detection:** Chrome DevTools Performance tab showing long "Layout" tasks. CLS > 0.1.
- **Fix:** Batch DOM reads before writes. Always set explicit dimensions on media elements. Use `aspect-ratio` CSS.
- **Trade-off:** Setting explicit dimensions requires knowing sizes upfront; responsive designs need additional CSS.

### 11. Synchronous API Waterfalls (frequency: medium)

- **Cause:** Sequential API calls where parallel requests would work. Component tree causing request chains.
- **Detection:** DevTools Network tab showing staircase pattern. Time between TTFB and LCP > 1s.
- **Fix:** `Promise.all()` for independent requests. Server-side data aggregation. GraphQL to reduce round trips.
- **Trade-off:** Parallel requests increase peak server load. Error handling becomes more complex.

### 12. Memory Leaks Causing Jank (frequency: low-medium)

- **Cause:** Event listeners not removed on unmount. Detached DOM nodes. Growing closures.
- **Detection:** Chrome DevTools Memory tab. Increasing heap size over session. INP degradation over time.
- **Fix:** Proper cleanup in `useEffect` return. WeakRef for caches. Regular heap snapshot comparison.
- **Trade-off:** Aggressive garbage collection can cause brief pauses.

---

## Optimization Patterns

### 1. Code Splitting and Lazy Loading

**Before:**
```javascript
// Imports everything upfront -- 556 KB stat / 242 KB parsed / 80 KB gzip
import { Dashboard } from './Dashboard';
import { Settings } from './Settings';
import { Analytics } from './Analytics';
import { AdminPanel } from './AdminPanel';
```

**After:**
```javascript
// Route-based splitting -- initial bundle drops to 72 KB gzip
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const Analytics = lazy(() => import('./Analytics'));
const AdminPanel = lazy(() => import('./AdminPanel'));

// Usage
<Suspense fallback={<Skeleton />}>
  <Dashboard />
</Suspense>
```

**Measured impact:** Initial bundle reduced from 80 KB to 72 KB gzipped. Each route loaded on demand. Total JS downloaded for typical user session reduced by 40-60% since most users never visit all routes.

**Trade-off:** Additional HTTP requests per route. First render of lazy component includes network delay. Mitigate with `<link rel="prefetch">` for likely-next routes.

### 2. Tree-Shakeable Imports

**Before:**
```javascript
// Imports entire lodash -- adds ~70 KB gzipped
import _ from 'lodash';
const result = _.debounce(fn, 300);
```

**After:**
```javascript
// Named import with tree shaking -- adds ~1 KB gzipped
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// Or use a lighter alternative -- adds ~0.3 KB gzipped
import { debounce } from 'lodash-es';
```

**Measured impact:** 70 KB reduced to 1 KB or less. MomentJS (64.8% of one team's total bundle) replaced by date-fns (tree-shakeable, use only what you import -- typical savings: 50-65 KB).

**Trade-off:** Named imports are more verbose. Some libraries (moment, jQuery) are not tree-shakeable and require replacement.

### 3. Image Optimization Pipeline

**Before:**
```html
<!-- Unoptimized: 337 KB JPEG, no responsive sizing -->
<img src="/hero.jpg" alt="Hero image">
```

**After:**
```html
<!-- Optimized: AVIF/WebP with fallback, responsive, lazy -->
<picture>
  <source
    type="image/avif"
    srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <source
    type="image/webp"
    srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <img
    src="/hero-800.jpg"
    alt="Hero image"
    width="1200"
    height="600"
    loading="lazy"
    decoding="async"
  >
</picture>
```

**Measured impact:** 337 KB JPEG becomes 122 KB WebP (64% reduction) or ~100 KB AVIF (70% reduction). Responsive sizing means mobile users load 400w variant (~40 KB) instead of 1200w.

**Trade-off:** Build pipeline complexity. AVIF encoding is 2-5x slower than WebP. AVIF browser support at ~93% (as of 2025) vs WebP at ~97%.

### 4. Font Optimization

**Before:**
```css
/* Full Latin + Cyrillic + Greek: 173 KB per weight */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff') format('woff');
  font-weight: 400;
}
```

**After:**
```css
/* Subsetted Latin-only WOFF2: 21 KB per weight */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-latin.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}
```

**Measured impact:** 173 KB WOFF becomes 99 KB WOFF2 (43% reduction from Brotli compression), then 21 KB after subsetting (88% total reduction). `font-display: swap` ensures text is visible within 100ms even before font loads.

**Trade-off:** Subsetting removes characters. If you later need Cyrillic support, you must re-generate. `swap` causes a flash of unstyled text (FOUT), which some designs find unacceptable.

### 5. Critical CSS Inlining

**Before:**
```html
<head>
  <!-- 150 KB CSS blocks rendering -->
  <link rel="stylesheet" href="/styles.css">
</head>
```

**After:**
```html
<head>
  <!-- 8 KB critical CSS inlined, rest loaded async -->
  <style>
    /* Critical above-fold styles only */
    body { margin: 0; font-family: system-ui; }
    .header { background: #fff; height: 64px; }
    .hero { min-height: 400px; }
    /* ... above-fold styles ... */
  </style>
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
```

**Measured impact:** FCP improves by 0.5-1.5s depending on connection speed. Critical CSS should be <14 KB (fits in first TCP round trip after TLS handshake).

**Trade-off:** Inlined CSS cannot be cached separately. Must be regenerated when styles change. Tools like `critical` npm package automate extraction.

### 6. API Response Optimization

**Before:**
```javascript
// Returns 250 KB JSON with nested relations
app.get('/api/products', async (req, res) => {
  const products = await Product.findAll({
    include: [Category, Reviews, Seller, RelatedProducts],
  });
  res.json(products);  // p95: 1200ms
});
```

**After:**
```javascript
// Sparse fields, pagination, compression -- 15 KB response
app.get('/api/products', async (req, res) => {
  const { page = 1, limit = 20, fields } = req.query;
  const products = await Product.findAll({
    attributes: fields ? fields.split(',') : ['id', 'name', 'price', 'thumbnail'],
    limit: Math.min(limit, 100),
    offset: (page - 1) * limit,
  });
  res.json({ data: products, meta: { page, limit, total: await Product.count() } });
  // p95: 45ms
});
```

**Measured impact:** Response size from 250 KB to 15 KB (94% reduction). p95 latency from 1200ms to 45ms (96% reduction). Key technique: only return fields the client needs.

**Trade-off:** Clients must specify fields or accept defaults. Pagination adds complexity for "load all" use cases. Consider GraphQL if field selection needs are highly variable.

---

## Anti-Patterns

### 1. Measuring Only Averages

**Why it seems helpful:** Average latency looks good at 150ms.
**Why it hurts:** The p95 is 2000ms, meaning 5% of users (often your most engaged) have a terrible experience. Always measure p50, p95, and p99.

### 2. Testing Only on Fast Devices and Networks

**Why it seems helpful:** "Works fine on my MacBook with fiber."
**Why it hurts:** Your median user is on a $200 Android phone with 4G. A 170 KB JS bundle parses in 200ms on a MacBook but 2-4 seconds on a Moto G. Test on representative hardware.

### 3. Over-Polyfilling

**Why it seems helpful:** "We support all browsers."
**Why it hurts:** 50.6% of npm dependencies are bloated. One team found 82 of their 97 dependencies were unnecessary polyfills for features supported since IE9. Ship modern code with differential serving (`type="module"` / `nomodule`).

### 4. Adding Dependencies Without Budget Check

**Why it seems helpful:** "This library saves us 2 hours of development."
**Why it hurts:** A single `npm install` can add 50-200 KB to your bundle. MomentJS alone was 64.8% of one team's bundle. Always check `bundlephobia.com` before adding a dependency.

### 5. Premature Optimization Without Measurement

**Why it seems helpful:** "I memoized everything for performance."
**Why it hurts:** `useMemo` and `React.memo` have overhead. If the computation is cheap or the component rarely re-renders, memoization adds complexity and memory usage for zero benefit. Measure first with React DevTools Profiler.

### 6. Caching Everything Aggressively

**Why it seems helpful:** "Cache all API responses for 1 hour."
**Why it hurts:** Stale data causes bugs that are worse than slow data. Cache static assets aggressively (1 year with immutable). Cache API responses carefully with appropriate TTLs and invalidation strategies.

### 7. Lazy Loading Above-the-Fold Content

**Why it seems helpful:** "Lazy load all images for performance."
**Why it hurts:** Lazy loading the hero image or LCP element delays the most important visual. The LCP image should be eagerly loaded with `fetchpriority="high"`. Only lazy-load below-fold content.

### 8. Inlining Everything

**Why it seems helpful:** "Zero HTTP requests means faster loading."
**Why it hurts:** Inlined resources cannot be cached. If your HTML is 500 KB because you inlined all CSS, JS, and SVGs, every page navigation downloads it all again. Inline only critical CSS (<14 KB). Cache the rest.

### 9. Using a CDN Without Measuring

**Why it seems helpful:** "We put it on CloudFront so it is fast."
**Why it hurts:** CDN misconfiguration is common. Wrong cache headers, origin shield not configured, or CDN edge not serving your target geography. Verify with real user monitoring that TTFB actually improved.

### 10. Optimizing Build Size But Ignoring Runtime

**Why it seems helpful:** "Our bundle is only 120 KB gzipped."
**Why it hurts:** A 120 KB bundle that spawns 50ms main-thread tasks every 100ms will still have terrible INP. Bundle size is necessary but not sufficient. Monitor runtime performance (long tasks, layout thrashing, forced reflows).

### 11. Splitting Into Too Many Chunks

**Why it seems helpful:** "Maximum code splitting for minimum initial load."
**Why it hurts:** HTTP/2 multiplexing helps, but each chunk still has overhead (DNS, TLS, headers). 50 tiny chunks create waterfall delays and scheduling overhead. Target 5-15 chunks for typical SPAs.

### 12. Ignoring Third-Party Script Growth

**Why it seems helpful:** "Marketing just needs one more tracking pixel."
**Why it hurts:** Third-party scripts are the leading cause of performance regression. Each analytics/chat/A/B tool adds 20-100 KB and main-thread work. Set a hard third-party budget and enforce it.

---

## Architecture-Level Decisions

The rendering strategy you choose at the start of a project determines your performance ceiling. Changing later is expensive.

### Rendering Strategy Comparison

| Strategy | TTFB | FCP | LCP | TTI | JS Bundle | Monthly Cost (mid-size) |
|----------|------|-----|-----|-----|-----------|------------------------|
| SSG (Static) | Excellent (<100ms) | Excellent | Excellent | Excellent (minimal JS) | Minimal | <$100 |
| ISR (Incremental Static) | Excellent (cached) | Excellent | Excellent | Good | Moderate | <$500 |
| SSR (Server-Side) | Good (200-500ms) | Good | Good | Moderate (hydration) | Large | >$5,000 |
| CSR (Client-Side) | Excellent (static shell) | Poor (blank until JS) | Poor | Poor (all JS upfront) | Largest | <$100 |

**Decision guidance:**

- **Content sites, blogs, docs:** SSG. Near-zero JS budget is trivially achievable.
- **E-commerce, news:** ISR or SSR. Fresh data with good performance. ISR is 10x cheaper than full SSR.
- **Dashboards, admin panels:** CSR acceptable if behind auth (no SEO need). Strict JS budget still matters for productivity.
- **Hybrid apps:** Use SSR/SSG for marketing pages, CSR for authenticated app shell. Different budgets per section.

### Hydration Cost

SSR pages look ready but are not interactive until JavaScript downloads and hydrates. This creates a "uncanny valley" where users click buttons that do not respond. Mitigation strategies:

- **Partial hydration / Islands (Astro):** Only hydrate interactive components. Reduces JS by 50-90%.
- **React Server Components:** Move data fetching to server. Ship less JS to browser. Hydrate only interactive parts.
- **Progressive hydration:** Hydrate visible components first, defer off-screen. Reduces TBT.

### API Design for Latency Budgets

| Pattern | Latency Impact | When to Use |
|---------|---------------|-------------|
| REST with sparse fields | Low (single request, minimal data) | Most CRUD operations |
| GraphQL | Low-medium (flexible queries, single request) | Complex data requirements with varying field needs |
| BFF (Backend for Frontend) | Low (optimized per client) | Mobile vs desktop need different data shapes |
| gRPC | Very low (binary, multiplexed) | Service-to-service communication |
| REST without field selection | High (over-fetching) | Avoid in latency-sensitive paths |

### Monolith vs Micro-Frontends

| Aspect | Monolith | Micro-Frontends |
|--------|----------|-----------------|
| Initial bundle | Single optimized bundle | Multiple bundles with shared runtime overhead |
| Shared dependencies | Natural deduplication | Risk of duplicate React/framework copies (adds 40-100 KB each) |
| Deployment | All-or-nothing, simpler caching | Independent deploys, complex caching |
| Budget enforcement | Single budget for entire app | Per-team budgets (easier ownership, harder total control) |
| Recommendation | Default choice for teams < 50 engineers | Consider only if organizational scaling demands it |

---

## Testing and Regression Prevention

### CI Pipeline Integration

A complete performance testing pipeline has three layers:

**Layer 1 -- Build-time checks (every commit)**
```json
// package.json
{
  "scripts": {
    "build": "webpack --mode production",
    "postbuild": "bundlesize",
    "perf:budget": "lighthouse-ci autorun"
  },
  "bundlesize": [
    { "path": "./dist/main.*.js", "maxSize": "170 kB", "compression": "gzip" },
    { "path": "./dist/vendor.*.js", "maxSize": "250 kB", "compression": "gzip" },
    { "path": "./dist/*.css", "maxSize": "50 kB", "compression": "gzip" }
  ]
}
```

**Layer 2 -- Lighthouse CI assertions (every PR)**
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/products'],
      numberOfRuns: 3,   // median of 3 runs reduces noise
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'performance-budget': 'error',
        // Warn but don't fail for these
        'uses-responsive-images': 'warn',
        'unused-javascript': 'warn',
      },
    },
  },
};
```

**Layer 3 -- Real User Monitoring (continuous)**

```javascript
// Report Core Web Vitals to your analytics
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics({ name, delta, id, rating }) {
  // rating is 'good', 'needs-improvement', or 'poor'
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, delta, id, rating, url: location.href }),
    headers: { 'Content-Type': 'application/json' },
  });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

### Automated Alerts

Set up alerts when budgets are exceeded in production:

| Metric | Warning Threshold | Critical Threshold | Alert Channel |
|--------|-------------------|--------------------| --------------|
| LCP p75 | >2.5s | >4.0s | Slack + PagerDuty |
| INP p75 | >200ms | >500ms | Slack |
| CLS p75 | >0.1 | >0.25 | Slack |
| JS bundle size | >150 KB gzip | >170 KB gzip | PR comment |
| API p95 | >300ms | >800ms | Slack + PagerDuty |
| API p99 | >1000ms | >2000ms | PagerDuty |
| Error rate | >1% | >5% | PagerDuty |

### webpack Performance Hints

```javascript
// webpack.config.js
module.exports = {
  performance: {
    hints: 'error',          // fail build if exceeded
    maxAssetSize: 250000,    // 250 KB per asset
    maxEntrypointSize: 500000, // 500 KB total entry
    assetFilter: (assetFilename) => {
      return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
    },
  },
};
```

### Budget Review Cadence

- **Weekly:** Review RUM dashboard. Check p75 trends for LCP, INP, CLS.
- **Every 2-4 weeks:** Revisit budget thresholds. Tighten if consistently passing. Investigate if consistently failing.
- **Quarterly:** Full performance audit. Run WebPageTest on top 10 pages. Compare against competitors. Adjust budgets based on industry shifts.

---

## Decision Trees

### Decision Tree 1: "My Bundle Is Over Budget"

```
Bundle exceeds budget
|
+-- Is it first-party code or third-party?
    |
    +-- THIRD-PARTY
    |   |
    |   +-- Is the library essential?
    |       |
    |       +-- NO --> Remove it. Check bundlephobia.com for lighter alternatives.
    |       +-- YES --> Can you lazy-load it?
    |           |
    |           +-- YES --> Dynamic import: import('lib').then(...)
    |           +-- NO --> Can you use a lighter alternative?
    |               |
    |               +-- moment (330KB) --> date-fns (tree-shakeable, ~3KB per function)
    |               +-- lodash (70KB) --> lodash-es or native JS methods
    |               +-- chart.js (200KB) --> lightweight-charts or canvas API
    |               +-- NO lighter alternative --> Accept and budget elsewhere
    |
    +-- FIRST-PARTY
        |
        +-- Run webpack-bundle-analyzer. Identify largest modules.
        |
        +-- Is code route-specific?
        |   |
        |   +-- YES --> Code split by route with React.lazy or dynamic import()
        |   +-- NO --> Is it feature-specific?
        |       |
        |       +-- YES --> Feature-flag gated lazy loading
        |       +-- NO --> Review for dead code. Check Coverage tab in DevTools.
        |
        +-- After splitting, still over budget?
            |
            +-- Check for duplicate dependencies (npm ls --all | grep <pkg>)
            +-- Enable tree shaking (sideEffects: false in package.json)
            +-- Review tsconfig: ensure "module": "esnext" for tree shaking
            +-- Consider moving logic to server (API route, Server Component)
```

### Decision Tree 2: "Should I Add This Dependency?"

```
Proposed new dependency
|
+-- Check bundlephobia.com for size
    |
    +-- Size > 50 KB gzipped?
    |   |
    |   +-- STOP. Do you really need it?
    |   +-- Can you implement the needed feature in < 200 lines?
    |   |   +-- YES --> Write it yourself. Less risk, smaller bundle.
    |   |   +-- NO --> Is there a lighter alternative?
    |   |       +-- YES --> Use the lighter alternative.
    |   |       +-- NO --> Continue evaluation below.
    |   |
    |   +-- Can it be lazy-loaded (not needed at startup)?
    |       +-- YES --> Add with dynamic import. Document the budget impact.
    |       +-- NO --> Will it push total bundle over budget?
    |           +-- YES --> Find something else to cut first, or reject.
    |           +-- NO --> Add with monitoring. Set bundlesize check.
    |
    +-- Size < 50 KB gzipped?
    |   |
    |   +-- Is it tree-shakeable?
    |   |   +-- YES --> Safe to add. Monitor with bundlesize.
    |   |   +-- NO --> Will you use > 50% of its API?
    |   |       +-- YES --> Acceptable. Add with monitoring.
    |   |       +-- NO --> Find a tree-shakeable alternative.
    |   |
    |   +-- How many transitive dependencies?
    |       +-- > 20 --> High risk of bloat. Check for alternatives.
    |       +-- < 20 --> Acceptable. Proceed.
    |
    +-- Size < 5 KB gzipped?
        +-- Low risk. Add with standard review.
```

### Decision Tree 3: "Which Rendering Strategy for My Page?"

```
New page or feature
|
+-- Does the content change frequently?
    |
    +-- RARELY (docs, blog, marketing)
    |   --> SSG (Static Site Generation)
    |   Budget: <50 KB JS, LCP < 1.5s
    |
    +-- PERIODICALLY (product pages, news)
    |   |
    |   +-- Can stale data be shown for 60-3600s?
    |       +-- YES --> ISR (Incremental Static Regeneration)
    |       |   Budget: <100 KB JS, LCP < 2.0s
    |       +-- NO --> SSR (Server-Side Rendering)
    |           Budget: <200 KB JS, LCP < 2.5s
    |           Watch: hydration cost on mobile
    |
    +-- REAL-TIME (dashboards, chat, live data)
        |
        +-- Is SEO required?
            +-- YES --> SSR + client hydration + WebSocket
            |   Budget: <200 KB JS initial, LCP < 2.5s
            +-- NO --> CSR (Client-Side Rendering)
                Budget: <300 KB JS, TTI < 3.0s on mobile
                Acceptable for authenticated apps
```

---

## Code Examples

### Example 1: Lighthouse CI budget.json -- Complete Configuration

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "document", "budget": 18 },
      { "resourceType": "script", "budget": 170 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "font", "budget": 100 },
      { "resourceType": "third-party", "budget": 100 },
      { "resourceType": "total", "budget": 500 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 15 },
      { "resourceType": "stylesheet", "budget": 5 },
      { "resourceType": "image", "budget": 25 },
      { "resourceType": "font", "budget": 4 },
      { "resourceType": "third-party", "budget": 5 },
      { "resourceType": "total", "budget": 50 }
    ],
    "timings": [
      { "metric": "first-contentful-paint", "budget": 1500 },
      { "metric": "interactive", "budget": 3000 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "total-blocking-time", "budget": 300 }
    ]
  },
  {
    "path": "/checkout/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 120 },
      { "resourceType": "total", "budget": 300 }
    ],
    "timings": [
      { "metric": "interactive", "budget": 2000 },
      { "metric": "largest-contentful-paint", "budget": 2000 },
      { "metric": "total-blocking-time", "budget": 200 }
    ]
  }
]
```

### Example 2: webpack Code Splitting Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 10,
      minSize: 20000,       // 20 KB minimum chunk size
      maxSize: 244000,      // 244 KB max -- triggers further splitting
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Create separate chunks for large vendors
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            )[1];
            return `vendor.${packageName.replace('@', '')}`;
          },
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
  },
  performance: {
    hints: 'error',
    maxAssetSize: 250000,
    maxEntrypointSize: 500000,
  },
};
```

### Example 3: Next.js Bundle Analysis Script

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lodash-es',
      '@mui/material',
      '@mui/icons-material',
      'date-fns',
      'react-icons',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 31536000,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

```bash
# Run analysis
ANALYZE=true npm run build
# Opens interactive treemap showing all chunks and their sizes
```

### Example 4: GitHub Actions -- Complete Performance CI

```yaml
name: Performance Budget CI
on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Check bundle sizes
        run: npx bundlesize
      - name: Comment bundle size on PR
        uses: preactjs/compressed-size-action@v2
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          build-script: 'build'
          pattern: './dist/**/*.{js,css}'

  lighthouse:
    runs-on: ubuntu-latest
    needs: bundle-size
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci && npm run build
      - name: Start server
        run: npm run start &
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/products
            http://localhost:3000/checkout
          budgetPath: ./budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Example 5: Backend API Latency Budget Monitoring

```javascript
// middleware/latency-budget.js
const BUDGETS = {
  '/api/products':  { p50: 50,  p95: 200,  p99: 500  },
  '/api/checkout':  { p50: 100, p95: 300,  p99: 1000 },
  '/api/search':    { p50: 100, p95: 500,  p99: 1500 },
  '/api/user':      { p50: 30,  p95: 100,  p99: 300  },
};

// In-memory percentile tracker (use proper APM in production)
const latencies = {};

function trackLatency(route, durationMs) {
  if (!latencies[route]) latencies[route] = [];
  latencies[route].push(durationMs);

  // Keep last 1000 measurements
  if (latencies[route].length > 1000) {
    latencies[route] = latencies[route].slice(-1000);
  }
}

function getPercentile(route, percentile) {
  const sorted = [...(latencies[route] || [])].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Express middleware
function latencyBudgetMiddleware(req, res, next) {
  const start = performance.now();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = performance.now() - start;
    trackLatency(route, duration);

    const budget = BUDGETS[route];
    if (budget) {
      const p95 = getPercentile(route, 95);
      if (p95 > budget.p95) {
        console.warn(
          `BUDGET EXCEEDED: ${route} p95=${p95.toFixed(0)}ms (budget: ${budget.p95}ms)`
        );
        // Send alert to monitoring system
      }
    }
  });

  next();
}
```

### Example 6: Database Query Budget with PostgreSQL

```sql
-- Enable slow query logging at 200ms threshold
ALTER SYSTEM SET log_min_duration_statement = 200;
SELECT pg_reload_conf();

-- Find top slow queries using pg_stat_statements
SELECT
  query,
  calls,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round(max_exec_time::numeric, 2) AS max_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 50   -- queries averaging over 50ms
ORDER BY total_exec_time DESC
LIMIT 20;

-- Calculate p95 for a specific query pattern
SELECT
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration) AS p95_ms
FROM query_log
WHERE query_pattern = 'SELECT * FROM products WHERE ...'
  AND logged_at > now() - interval '1 hour';
```

### Example 7: Import Cost Awareness -- Before and After

```javascript
// BEFORE: Common import mistakes and their costs
import moment from 'moment';              // +330 KB (67 KB gzip)
import _ from 'lodash';                   // +71 KB (25 KB gzip)
import { Chart } from 'chart.js';         // +200 KB (65 KB gzip)
import * as Icons from '@mui/icons-material'; // +5 MB (1.2 MB gzip)
// Total: ~5.6 MB stat, ~1.36 MB gzip

// AFTER: Right-sized imports
import { format, parseISO } from 'date-fns';     // +3 KB gzip (per function)
import debounce from 'lodash-es/debounce';        // +1 KB gzip
import { Line } from 'react-chartjs-2/lazy';      // lazy-loaded
import SearchIcon from '@mui/icons-material/Search'; // +1 KB gzip (single icon)
// Total: ~10 KB gzip initial, chart lazy-loaded on demand
```

### Example 8: Responsive Image Generation Script

```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const glob = require('glob');
const path = require('path');
const fs = require('fs');

const WIDTHS = [400, 800, 1200, 1920];
const FORMATS = ['avif', 'webp'];
const QUALITY = { avif: 50, webp: 75 };  // AVIF achieves same visual quality at lower setting

async function optimizeImages(inputDir, outputDir) {
  const images = glob.sync(`${inputDir}/**/*.{jpg,jpeg,png}`);
  let totalSaved = 0;

  for (const imagePath of images) {
    const basename = path.basename(imagePath, path.extname(imagePath));
    const originalSize = fs.statSync(imagePath).size;

    for (const width of WIDTHS) {
      for (const format of FORMATS) {
        const outputPath = path.join(outputDir, `${basename}-${width}.${format}`);
        await sharp(imagePath)
          .resize(width, null, { withoutEnlargement: true })
          .toFormat(format, { quality: QUALITY[format] })
          .toFile(outputPath);

        const newSize = fs.statSync(outputPath).size;
        const saving = ((1 - newSize / originalSize) * 100).toFixed(1);
        totalSaved += originalSize - newSize;
        console.log(`${basename}-${width}.${format}: ${saving}% smaller`);
      }
    }
  }

  console.log(`\nTotal saved: ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);
}

optimizeImages('./src/images', './public/images');
// Typical output: hero-400.avif: 89% smaller, hero-800.webp: 72% smaller
```

---

## Quick Reference

### Frontend Budgets

| Metric | Good | Acceptable | Needs Work |
|--------|------|------------|------------|
| LCP (p75) | <=2.0s | <=2.5s | >2.5s |
| INP (p75) | <=150ms | <=200ms | >200ms |
| CLS (p75) | <=0.05 | <=0.1 | >0.1 |
| FCP | <=1.5s | <=2.0s | >2.0s |
| TTFB | <=600ms | <=800ms | >1.0s |
| TBT | <=200ms | <=300ms | >500ms |
| JS bundle (gzip) | <=130 KB | <=170 KB | >400 KB |
| CSS (gzip) | <=30 KB | <=50 KB | >100 KB |
| Total page weight (gzip) | <=500 KB | <=1 MB | >2 MB |
| Image weight (per page) | <=300 KB | <=500 KB | >1 MB |
| Font files (total) | <=50 KB | <=100 KB | >200 KB |
| Third-party JS (gzip) | <=50 KB | <=100 KB | >250 KB |
| HTTP requests | <=30 | <=50 | >80 |

### Backend Budgets

| Metric | Good | Acceptable | Needs Work |
|--------|------|------------|------------|
| API p50 latency | <=50ms | <=100ms | >200ms |
| API p95 latency | <=200ms | <=300ms | >800ms |
| API p99 latency | <=500ms | <=1000ms | >2000ms |
| DB query p50 | <=5ms | <=10ms | >50ms |
| DB query p95 | <=50ms | <=100ms | >200ms |
| Slow query threshold | 200ms | 500ms | 1000ms |
| Error rate | <0.1% | <1% | >5% |
| Availability | >99.9% | >99.5% | <99% |

### Optimization Quick Wins (by impact)

| Optimization | Effort | Typical Impact | Risk |
|--------------|--------|----------------|------|
| Serve images as WebP/AVIF | Low | 30-70% image size reduction | Low |
| Add `loading="lazy"` to below-fold images | Low | 20-40% reduction in initial page weight | Low |
| Font subsetting + WOFF2 | Low | 70-88% font size reduction | Low |
| Enable text compression (Brotli/gzip) | Low | 60-80% text resource reduction | Low |
| Tree-shake imports | Medium | 20-65 KB per large library | Low |
| Route-based code splitting | Medium | 40-60% initial JS reduction | Medium |
| Critical CSS inlining | Medium | 0.5-1.5s FCP improvement | Medium |
| Remove unused CSS (PurgeCSS) | Medium | 50-90% CSS reduction | Medium |
| API response field selection | Medium | 50-94% response size reduction | Low |
| Switch rendering strategy (CSR to SSR/ISR) | High | 1-3s LCP improvement | High |

### Tools Reference

| Tool | Purpose | Integration |
|------|---------|-------------|
| Lighthouse CI | Automated performance auditing with budgets | GitHub Actions, GitLab CI |
| bundlesize | JS/CSS bundle size enforcement | CI, GitHub status check |
| webpack-bundle-analyzer | Visual bundle composition analysis | Build step |
| compressed-size-action | PR comment with size delta | GitHub Actions |
| SpeedCurve | Continuous RUM + synthetic monitoring | Dashboard, Slack alerts |
| DebugBear | Performance monitoring with budget tracking | Dashboard, CI |
| Calibre | Performance monitoring and budgets | Dashboard, Slack, CI |
| web-vitals (npm) | Report Core Web Vitals from real users | Client-side JS |
| Chrome DevTools Coverage | Find unused JS/CSS | Manual profiling |
| bundlephobia.com | Check npm package size before installing | Manual pre-install check |
| WebPageTest | Deep synthetic testing with filmstrip | Manual, API |
| CrUX Dashboard | Google's real user experience data | Looker Studio |

---

*Researched: 2026-03-08 | Sources: [web.dev Core Web Vitals](https://web.dev/articles/defining-core-web-vitals-thresholds), [web.dev Vitals Business Impact](https://web.dev/case-studies/vitals-business-impact), [Google Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci), [MDN Performance Budgets](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Performance_budgets), [SpeedCurve Performance Budgets Guide](https://www.speedcurve.com/blog/performance-budgets/), [Addy Osmani - Start Performance Budgeting](https://addyosmani.com/blog/performance-budgets/), [Alex Russell - Can You Afford It?](https://infrequently.org/2017/10/can-you-afford-it-real-world-web-performance-budgets/), [Smashing Magazine - Code Splitting](https://www.smashingmagazine.com/2022/02/javascript-bundle-performance-code-splitting/), [Smashing Magazine - AVIF and WebP](https://www.smashingmagazine.com/2021/09/modern-image-formats-avif-webp/), [WPO Stats](https://wpostats.com/), [Conductor Page Speed Studies](https://www.conductor.com/academy/page-speed-resources/), [Sia Karamalegos - 14 Web Perf Tips 2025](https://sia.codes/posts/web-perf-tips-2025/), [DebugBear - Working With Performance Budgets](https://www.debugbear.com/blog/working-with-performance-budgets), [Calibre - Bundle Size Optimization](https://calibreapp.com/blog/bundle-size-optimization), [web.dev - Optimize Web Fonts](https://web.dev/learn/performance/optimize-web-fonts), [Marvin Hagemeister - Polyfills Gone Rogue](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-6/)*
