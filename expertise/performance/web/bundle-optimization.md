# Bundle Optimization

> Performance expertise module for JavaScript bundle optimization.
> Covers analysis, splitting, tree shaking, compression, and anti-patterns
> with measured data and real-world benchmarks.

---

## Table of Contents

1. [Bundle Size Budgets](#1-bundle-size-budgets)
2. [Bundle Analysis Tools](#2-bundle-analysis-tools)
3. [Code Splitting Strategies](#3-code-splitting-strategies)
4. [Tree Shaking and Dead Code Elimination](#4-tree-shaking-and-dead-code-elimination)
5. [Dynamic Imports and Lazy Loading](#5-dynamic-imports-and-lazy-loading)
6. [Modern vs Legacy Bundles](#6-modern-vs-legacy-bundles)
7. [Compression: Gzip vs Brotli](#7-compression-gzip-vs-brotli)
8. [ESM vs CommonJS and Bundle Size](#8-esm-vs-commonjs-and-bundle-size)
9. [Module Federation for Micro-Frontends](#9-module-federation-for-micro-frontends)
10. [Common Bottlenecks and Heavy Dependencies](#10-common-bottlenecks-and-heavy-dependencies)
11. [Anti-Patterns](#11-anti-patterns)
12. [Before/After Case Studies](#12-beforeafter-case-studies)
13. [Decision Tree: My Bundle Is Too Large](#13-decision-tree-my-bundle-is-too-large)
14. [Sources](#14-sources)

---

## 1. Bundle Size Budgets

### The 170 KB Rule

The widely referenced performance budget from web.dev and Google's Addy Osmani recommends
delivering **under 170 KB of compressed (gzip/brotli) critical-path JavaScript** for the
initial page load. Research places the optimal budget between **130 KB and 170 KB compressed**
for worst-case network scenarios (slow 3G, mid-range mobile devices).

Source: [web.dev - Incorporate performance budgets into your build process](https://web.dev/articles/incorporate-performance-budgets-into-your-build-tools)

### Why 170 KB?

The budget is derived from a Time-to-Interactive (TTI) target of **under 5 seconds on a
mid-range mobile device over a slow 3G connection**. JavaScript is uniquely expensive because
the browser must download, parse, compile, and execute it. A 170 KB compressed JS bundle
decompresses to roughly 500-700 KB of raw JavaScript, which takes approximately 3-4 seconds
to parse and execute on a median mobile device.

### Budget Tiers

| Tier          | Compressed JS (initial) | Typical Use Case                     |
|---------------|------------------------|--------------------------------------|
| Aggressive    | < 70 KB                | Landing pages, static sites          |
| Recommended   | < 170 KB               | SPAs, e-commerce, content sites      |
| Maximum       | < 250 KB               | Complex dashboards, enterprise apps  |
| Over budget   | > 350 KB               | Requires immediate investigation     |

### Enforcing Budgets in CI

**bundlesize (npm package):** Tests asset sizes against a configured threshold. Tinder.com
uses bundlesize to enforce a main bundle budget of 170 KB and a CSS budget of 20 KB, checked
on every PR commit.

Source: [Addy Osmani - Start Performance Budgeting](https://addyosmani.com/blog/performance-budgets/)

**webpack performance hints:** Webpack natively supports size limits in its configuration:

```js
// webpack.config.js
module.exports = {
  performance: {
    maxAssetSize: 170 * 1024,      // 170 KB per asset
    maxEntrypointSize: 250 * 1024, // 250 KB per entrypoint
    hints: 'error'                 // fail the build if exceeded
  }
};
```

**Angular CLI defaults:** Angular warns when the main bundle exceeds 170 KB and fails the
build at 250 KB, enforcing these budgets out of the box.

Source: [web.dev - Performance budgets with the Angular CLI](https://web.dev/articles/performance-budgets-with-the-angular-cli)

**Vite/Rollup:** Use `rollup-plugin-visualizer` combined with a CI script that parses the
stats output and fails if any chunk exceeds the threshold.

### Budget Tracking in Practice

```jsonc
// bundlesize configuration in package.json
{
  "bundlesize": [
    { "path": "dist/main.*.js", "maxSize": "170 kB", "compression": "gzip" },
    { "path": "dist/vendor.*.js", "maxSize": "120 kB", "compression": "gzip" },
    { "path": "dist/*.css", "maxSize": "20 kB", "compression": "gzip" }
  ]
}
```

---

## 2. Bundle Analysis Tools

Before optimizing, you must measure. Three tools form the standard analysis toolkit.

### webpack-bundle-analyzer

The most widely used visualization tool. Generates an interactive, zoomable treemap of your
bundle contents showing stat size, parsed size, and gzip/brotli size for every module.

**What it reveals:**
- Oversized third-party dependencies
- Duplicate modules bundled multiple times
- Modules that should be lazy-loaded but are in the initial chunk
- Ineffective tree shaking (full library included when only one function is used)

Source: [webpack-bundle-analyzer on npm](https://www.npmjs.com/package/webpack-bundle-analyzer)

```bash
# Installation and usage
npm install --save-dev webpack-bundle-analyzer

# Add to webpack config
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
module.exports = {
  plugins: [new BundleAnalyzerPlugin()]
};

# Or analyze an existing stats file
npx webpack --profile --json > stats.json
npx webpack-bundle-analyzer stats.json
```

### source-map-explorer

Uses source maps to compute a precise byte-by-byte attribution of your bundle to the
original source files. Produces a treemap visualization similar to webpack-bundle-analyzer
but works with any bundler that generates source maps.

```bash
npx source-map-explorer dist/main.js
# or for multiple bundles
npx source-map-explorer dist/*.js
```

Source: [DigitalOcean - How To Analyze Angular App Bundle Sizes](https://www.digitalocean.com/community/tutorials/angular-bundle-size)

### BundlePhobia

A web-based tool (bundlephobia.com) that shows the install size, bundle size (minified),
and bundle size (minified + gzipped) of any npm package before you add it to your project.
Also estimates download time and shows the composition of transitive dependencies.

**Key metrics per package:**
- Minified size
- Minified + gzipped size
- Download time on slow 3G
- Composition breakdown (dependency tree contribution)
- Whether the package is tree-shakeable

### rollup-plugin-visualizer (for Vite)

The equivalent of webpack-bundle-analyzer for Vite/Rollup projects. Generates sunburst,
treemap, or network visualizations of the production bundle.

```js
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ]
};
```

### Analysis Workflow

1. Build production bundle with stats output enabled
2. Open the treemap visualization
3. Identify the largest chunks and modules
4. For each large module, determine: Is it tree-shakeable? Is there a lighter alternative? Can it be lazy-loaded?
5. Make changes, rebuild, compare sizes
6. Add CI enforcement to prevent regression

---

## 3. Code Splitting Strategies

Code splitting breaks a monolithic bundle into smaller chunks loaded on demand. Combined
with lazy loading, this technique can reduce initial load times by **40-60%**.

Source: [Smashing Magazine - Improving JavaScript Bundle Performance With Code-Splitting](https://www.smashingmagazine.com/2022/02/javascript-bundle-performance-code-splitting/)

### Route-Based Splitting

The highest-impact strategy. Each route (page) gets its own chunk, loaded only when the
user navigates to that route. This is almost always the best place to start code splitting
and where you achieve the maximum reduction in initial bundle size.

```js
// React with React.lazy and React Router
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Typical impact:** If an application has 10 routes averaging 80 KB each, the initial
bundle drops from 800 KB to ~80-120 KB (the active route plus shared vendor code).

### Component-Based Splitting

Split heavy components that are not visible on initial render: modals, tabs not initially
active, charts, rich text editors, and below-the-fold content.

```js
// Heavy chart component loaded only when rendered
const AnalyticsChart = lazy(() => import('./components/AnalyticsChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <AnalyticsChart />
        </Suspense>
      )}
    </div>
  );
}
```

### Vendor Splitting

Separate third-party libraries from application code. Vendor code changes less frequently,
allowing browsers to cache it independently. Webpack's `SplitChunksPlugin` handles this
automatically:

```js
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 10
        },
        // Separate large libraries into their own chunks
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|d3)[\\/]/,
          name: 'charts-vendor',
          chunks: 'all',
          priority: 20
        }
      }
    }
  }
};
```

### Splitting Granularity Tradeoffs

| Strategy              | Initial Load Impact | Cache Efficiency | Complexity |
|-----------------------|--------------------|------------------|------------|
| No splitting          | Poor (everything loaded) | Poor (any change invalidates all) | None |
| Route-based only      | Good (40-60% reduction) | Good | Low |
| Route + vendor        | Better (50-70% reduction) | Better (vendor cached separately) | Medium |
| Route + vendor + component | Best (60-80% reduction) | Best | Higher |
| Over-splitting        | Degraded (too many HTTP requests) | Mixed | High |

**Warning:** Over-splitting creates too many small chunks. Each chunk incurs HTTP request
overhead (even with HTTP/2 multiplexing). A good heuristic: no chunk smaller than 20 KB
compressed, no more than 20-25 parallel chunk requests for a single route.

---

## 4. Tree Shaking and Dead Code Elimination

### How Tree Shaking Works

Tree shaking is a form of dead code elimination that relies on the **static structure of
ES module (ESM) syntax**. Because `import` and `export` statements are statically analyzable
(resolved at compile time, not runtime), bundlers can determine which exports from a module
are actually used and eliminate the rest.

Source: [webpack - Tree Shaking guide](https://webpack.js.org/guides/tree-shaking/)

The process works in two phases:
1. **Mark phase:** The bundler walks the dependency graph, marking each export as "used" or "unused"
2. **Sweep phase:** A minifier (Terser, esbuild, SWC) removes the code paths marked as unused

### What Prevents Tree Shaking

**1. CommonJS (`require()`):** CJS is dynamic -- `require()` can appear inside conditionals,
be computed at runtime, and use string concatenation for module paths. Bundlers cannot
statically analyze this, so they include the entire module.

```js
// CANNOT be tree-shaken -- dynamic require
const lib = require('lodash');
const fn = lib[someVariable];

// CAN be tree-shaken -- static ESM import
import { debounce } from 'lodash-es';
```

**2. Side Effects:** Some modules execute code on import (modify globals, register polyfills,
attach event listeners). Bundlers must preserve these modules even if no exports are used.

```js
// This has a side effect (modifies Array.prototype)
import './polyfills';

// This has no side effect (pure function export)
import { formatDate } from './utils';
```

**3. Default Exports:** Default exports can complicate static analysis because the bundler
cannot as easily determine which properties of the default-exported object are used.

```js
// Harder to tree-shake
export default { formatDate, parseDate, addDays };

// Easier to tree-shake
export { formatDate, parseDate, addDays };
```

**4. Class-Based Code:** Classes are harder to tree-shake because methods on a class
prototype are not individually removable -- the entire class is either included or excluded.

### The `sideEffects` Flag

The `sideEffects` field in `package.json` is the single most important enabler of effective
tree shaking for library authors. It tells the bundler which files are safe to skip entirely
if none of their exports are used.

Source: [webpack - Tree Shaking guide (sideEffects)](https://webpack.js.org/guides/tree-shaking/)

```jsonc
// package.json -- mark entire package as side-effect free
{
  "name": "my-library",
  "sideEffects": false
}

// package.json -- mark specific files as having side effects
{
  "name": "my-library",
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

**Critical warning:** Setting `"sideEffects": false` when your code does have side effects
(e.g., CSS imports, polyfills, global registrations) will cause those side effects to be
silently dropped from the production bundle. CSS imports via css-loader are a common casualty.

### Measuring Tree Shaking Effectiveness

```bash
# Compare bundle sizes with and without tree shaking
# 1. Build with tree shaking (default in production mode)
npx webpack --mode production --json > stats-prod.json

# 2. Build without tree shaking
npx webpack --mode development --json > stats-dev.json

# 3. Compare with webpack-bundle-analyzer
npx webpack-bundle-analyzer stats-prod.json
```

### Tree Shaking Effectiveness by Library

| Library         | sideEffects Flag | ESM Support | Tree-Shakeable | Notes                                      |
|----------------|-----------------|-------------|----------------|---------------------------------------------|
| lodash          | No              | No (CJS)    | No             | Use lodash-es or individual imports          |
| lodash-es       | Yes (false)     | Yes         | Yes            | 70% smaller when importing few functions     |
| date-fns        | Yes (false)     | Yes         | Yes            | Individual function imports, ~2 KB per fn    |
| moment.js       | No              | No          | No             | 232 KB min + 160 KB locales, not shakeable   |
| rxjs            | Yes (false)     | Yes         | Yes            | v6+ fully tree-shakeable                     |
| @mui/material   | Yes (array)     | Yes         | Partial        | Use direct imports for best results          |
| three.js        | Yes (false)     | Yes         | Yes            | Since r108                                   |
| chart.js        | Partial         | Yes         | Partial        | Register only needed components               |

---

## 5. Dynamic Imports and Lazy Loading

### How Dynamic Imports Work

The `import()` expression returns a Promise that resolves to the module. Bundlers (webpack,
Vite, Rollup) detect `import()` calls at build time and automatically create separate chunks.

```js
// Static import -- included in main bundle
import { heavyCalculation } from './math';

// Dynamic import -- separate chunk, loaded on demand
const mathModule = await import('./math');
mathModule.heavyCalculation();
```

### Performance Impact

Real-world measurements from multiple case studies show consistent improvements:

| Metric                  | Before Splitting | After Splitting | Improvement |
|------------------------|-----------------|-----------------|-------------|
| Initial bundle size     | 2.3 MB          | 875 KB          | 62%         |
| Time to Interactive     | 5.2 s           | 2.7 s           | 48%         |
| First Contentful Paint  | 1.8 s           | 1.2 s           | 33%         |

Source: [Coditation - Optimizing Bundle Sizes in React Applications](https://www.coditation.com/blog/optimizing-bundle-sizes-in-react-applications-a-deep-dive-into-code-splitting-and-lazy-loading)

### Lazy Loading Timing Strategies

**1. On Interaction (most common):** Load the chunk when the user performs an action
(click, hover, scroll) that will need the code.

```js
button.addEventListener('click', async () => {
  const { openEditor } = await import('./editor');
  openEditor();
});
```

**2. On Visibility (Intersection Observer):** Load when a component scrolls into or near
the viewport. Ideal for below-the-fold content.

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      import('./heavy-component').then(module => {
        module.render(entry.target);
      });
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '200px' }); // start loading 200px before visible
```

**3. On Idle (requestIdleCallback):** Prefetch chunks during browser idle periods. The
user does not experience loading delay when they eventually need the module.

```js
// Prefetch during idle time
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    import('./likely-needed-soon');
  });
}
```

**4. Prefetch Hints (webpack magic comments):**

```js
// webpackPrefetch: downloads during idle time (low priority)
const Settings = lazy(() => import(/* webpackPrefetch: true */ './Settings'));

// webpackPreload: downloads immediately (high priority, parallel with parent)
const CriticalComponent = lazy(() => import(/* webpackPreload: true */ './Critical'));
```

Prefetch uses `<link rel="prefetch">` (fetched during idle), while preload uses
`<link rel="preload">` (fetched immediately with higher priority).

### Framework-Specific Patterns

**React:**
```js
const LazyComponent = React.lazy(() => import('./Component'));
// Wrap in Suspense with a fallback
<Suspense fallback={<Skeleton />}><LazyComponent /></Suspense>
```

**Vue:**
```js
const LazyComponent = defineAsyncComponent(() => import('./Component.vue'));
```

**Angular:**
```typescript
// In routing module
{ path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }
```

---

## 6. Modern vs Legacy Bundles (Differential Serving)

### The Module/Nomodule Pattern

Differential serving produces two bundles: a modern bundle (ES2017+) for current browsers
and a legacy bundle (ES5) for older browsers. The HTML uses the module/nomodule pattern
to serve the correct one:

```html
<!-- Modern browsers execute this (smaller, no polyfills) -->
<script type="module" src="/js/app.modern.js"></script>

<!-- Legacy browsers execute this (transpiled, polyfilled) -->
<script nomodule src="/js/app.legacy.js"></script>
```

Modern browsers understand `type="module"` and ignore `nomodule`. Legacy browsers ignore
`type="module"` and execute `nomodule`.

### Size Savings

The savings from differential serving vary by application:

| Measurement Source | Modern Bundle Size | Legacy Bundle Size | Savings  |
|-------------------|-------------------|-------------------|----------|
| Angular CLI tests | 1.85 MB           | 2.03 MB           | ~9%      |
| General range     | varies            | varies            | 10-50%   |
| Typical SPA       | varies            | varies            | 7-20%    |

Source: [Alex MacArthur - Should We All Start Implementing Differential Serving?](https://macarthur.me/posts/should-we-implement-differential-serving/)

The savings come from:
- No transpilation of arrow functions, async/await, destructuring, template literals, classes
- No regenerator-runtime (~6 KB minified)
- Fewer or no core-js polyfills (can save 30-90 KB compressed depending on polyfill set)
- Shorter variable names and optimized output from native ES module syntax

### Polyfill Budget Impact

Targeting only modern browsers (Chrome 80+, Firefox 80+, Safari 14+, Edge 80+) vs
supporting IE 11 can reduce the polyfill footprint by **50 KB compressed** or more.
With `@babel/preset-env` and `useBuiltIns: 'usage'`, the polyfill count drops from ~293
to ~87 when targeting only modern browsers.

Source: [DebugBear - How Does Browser Support Impact JavaScript Bundle Size?](https://www.debugbear.com/blog/how-does-browser-support-impact-bundle-size)

### Current Relevance (2025)

With IE 11 reaching end of life in 2022 and global `type="module"` browser support above
95%, the legacy bundle is increasingly unnecessary. Many teams now ship only ESM bundles,
using a browserslist configuration like:

```
# .browserslistrc
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
last 2 Edge versions
not dead
```

This eliminates the legacy bundle entirely, saving build time and complexity.

---

## 7. Compression: Gzip vs Brotli

### Compression Ratio Comparison

| Metric                   | Gzip           | Brotli          |
|-------------------------|----------------|-----------------|
| Average file reduction   | ~65%           | ~70%            |
| JS-specific improvement  | baseline       | 14% smaller than gzip |
| General text improvement | baseline       | 15-25% smaller than gzip |
| Browser support          | ~99%           | ~96%            |
| Compression speed        | Faster         | Slower (2-5x at high levels) |
| Decompression speed      | Similar        | Similar to slightly slower |

Source: [DebugBear - Brotli vs. GZIP: Improve Page Speed With HTTP Compression](https://www.debugbear.com/blog/http-compression-gzip-brotli)

### Real-World Numbers

For a typical JavaScript bundle:

| Bundle (uncompressed) | Gzip Size | Brotli Size | Brotli Savings vs Gzip |
|----------------------|-----------|-------------|----------------------|
| 500 KB               | ~175 KB   | ~150 KB     | ~14%                 |
| 1 MB                 | ~350 KB   | ~300 KB     | ~14%                 |
| 200 KB               | ~70 KB    | ~60 KB      | ~14%                 |

### Usage Trends

Based on HTTP Archive data from January 2024, **Brotli is used more than gzip for
JavaScript and CSS** across the web. This represents a tipping point where Brotli has
become the default compression for static assets.

Source: [Paul Calvano - Choosing Between gzip, Brotli and zStandard Compression](https://paulcalvano.com/2024-03-19-choosing-between-gzip-brotli-and-zstandard-compression/)

### Implementation Strategy

**Static compression (build time):** Pre-compress assets during the build and serve
the pre-compressed files. This allows using the highest Brotli compression level (11)
without impacting server response time.

```bash
# Generate .br files alongside your bundles
brotli -q 11 dist/main.js -o dist/main.js.br
gzip -9 -k dist/main.js
```

**Dynamic compression (server-side):** The server compresses on the fly. Use lower
compression levels (Brotli 4-6) to balance compression ratio against CPU cost.

**Recommended approach:** Use static Brotli (level 11) for all production assets, with
gzip as a fallback for the ~4% of browsers that do not support Brotli. Most CDNs
(Cloudflare, AWS CloudFront, Fastly) support both and negotiate via `Accept-Encoding`.

### Nginx Configuration Example

```nginx
# Enable both Brotli and gzip
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json;

gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/javascript application/json;

# Prefer pre-compressed static files
brotli_static on;
gzip_static on;
```

---

## 8. ESM vs CommonJS and Bundle Size

### Why ESM Produces Smaller Bundles

ES Modules use static `import`/`export` declarations that are resolved at compile time.
This allows bundlers to:

1. **Tree-shake unused exports** -- only the imported bindings are included
2. **Scope-hoist (concatenate) modules** -- reduce per-module wrapper overhead
3. **Statically analyze the entire dependency graph** -- no dynamic resolution needed

CommonJS uses `require()` which is a runtime function call. The module specifier can be
computed dynamically, conditionally loaded, or monkey-patched. Bundlers must include the
entire module because they cannot prove which parts are unused.

### Measured Differences

In benchmarks comparing bundler output sizes across eight libraries, **Rollup and Vite
(ESM-based) produced output 19.5% smaller** than the largest bundler outputs. This
difference is directly attributable to more effective tree shaking on ESM code.

Source: [Strapi - Best Webpack Alternatives: Modern JS Bundlers 2025](https://strapi.io/blog/modern-javascript-bundlers-comparison-2025)

### The Dual-Package Hazard

When a dependency ships both ESM and CJS versions, the bundler may include both if
different parts of the dependency graph import the package in different formats. This
causes the library to appear twice in the bundle, doubling its size contribution and
potentially breaking shared state.

Source: [codejam.info - Duplicated ESM and CJS package in bundle](https://www.codejam.info/2024/02/esm-cjs-dupe.html)

**Detection:** Use webpack-bundle-analyzer and search for duplicate package names
appearing in different chunks or with different paths.

**Fix:** Force resolution to a single format using the bundler's `resolve.alias`
configuration or the package manager's resolution overrides.

```js
// webpack.config.js -- force ESM version
module.exports = {
  resolve: {
    alias: {
      'problematic-package': 'problematic-package/esm/index.js'
    }
  }
};
```

### Migration Path

For library authors, the recommended approach is to publish ESM as the primary format with
CJS as a compatibility fallback using the package.json `exports` field:

```jsonc
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "type": "module",
  "sideEffects": false
}
```

---

## 9. Module Federation for Micro-Frontends

### What Module Federation Solves

Module Federation (introduced in Webpack 5) allows separately compiled and deployed
applications to share code at **runtime** rather than build time. Each micro-frontend
exposes specific modules, and consumers load them dynamically without rebuilding.

Source: [webpack - Module Federation](https://webpack.js.org/concepts/module-federation/)

### Architecture

```
Host Application
  |
  +-- Remote A (Team 1): exposes <Header />, <Footer />
  |     shared: react@18, react-dom@18
  |
  +-- Remote B (Team 2): exposes <ProductList />, <Cart />
  |     shared: react@18, react-dom@18, lodash-es
  |
  +-- Remote C (Team 3): exposes <AdminPanel />
        shared: react@18, react-dom@18
```

Shared dependencies (like React) are loaded once and reused across all remotes, preventing
duplication. Each remote is its own deployment unit with independent CI/CD.

### Configuration Example

```js
// Host webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        teamA: 'teamA@https://team-a.example.com/remoteEntry.js',
        teamB: 'teamB@https://team-b.example.com/remoteEntry.js'
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' }
      }
    })
  ]
};

// Remote (Team A) webpack.config.js
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'teamA',
      filename: 'remoteEntry.js',
      exposes: {
        './Header': './src/components/Header',
        './Footer': './src/components/Footer'
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' }
      }
    })
  ]
};
```

### Bundle Size Impact

Module Federation's effect on bundle size is nuanced:

**Positive:** Shared dependencies are loaded once. Without federation, each micro-frontend
might bundle its own copy of React (128 KB minified), resulting in 3x duplication for 3
micro-frontends. With federation, React is loaded once.

**Negative:** The `remoteEntry.js` manifest files add overhead (~5-15 KB each), and runtime
negotiation of shared dependencies adds initialization cost. For smaller applications, this
overhead may exceed the savings.

**Enterprise adoption:** 85%+ of enterprise organizations with micro-frontend architectures
use Module Federation or similar runtime-sharing patterns as of 2025.

Source: [Zalando Engineering - Building a Modular Portal with Webpack Module Federation](https://engineering.zalando.com/posts/2024/10/building-modular-portal-with-webpack-module-federation.html)

### When to Use Module Federation

- Multiple teams own different parts of the application
- Independent deployment cycles are required
- The application is large enough that shared dependencies (React, design system) would
  otherwise be duplicated across separately deployed bundles
- Build times are a bottleneck because the entire application must rebuild for any change

### When NOT to Use Module Federation

- Single-team applications
- Applications under 500 KB total bundle size
- When build-time code sharing (npm packages, monorepo) is sufficient
- When the runtime overhead (~50-100ms initialization) is unacceptable

---

## 10. Common Bottlenecks and Heavy Dependencies

### The Usual Suspects

| Library           | Minified Size | Gzipped Size | Problem                                        | Alternative                     | Alternative Size (gzipped) |
|-------------------|--------------|-------------|------------------------------------------------|--------------------------------|---------------------------|
| moment.js         | 232 KB       | 66 KB       | Not tree-shakeable + 160 KB locales            | date-fns                       | 2-10 KB (per function)    |
| moment.js + locales | 392 KB    | 98 KB       | All locales bundled by default                 | dayjs (2 KB) or Temporal API   | 2-7 KB                    |
| lodash (full)     | 531 KB       | 72 KB       | Entire library imported for a few functions    | lodash-es (tree-shake) or native | 1-5 KB (per function)  |
| chart.js (full)   | 200 KB       | 65 KB       | All chart types registered                     | Register only needed types     | 30-50 KB                  |
| core-js (full)    | 250+ KB      | 75+ KB      | All polyfills regardless of browser target     | Targeted via browserslist      | 10-30 KB                  |
| @fortawesome (all)| 1.5+ MB      | 400+ KB     | All icon packs imported                        | Import individual icons        | 5-20 KB                   |

Source: [Medium - Reduce JavaScript Bundle Size by Replacing MomentJS with Date-fns](https://thefiend.medium.com/replacing-momentjs-with-date-fns-for-a-smaller-package-size-3365f358db4d)

### moment.js: The Classic Offender

Moment.js is officially in maintenance mode. The Moment team has stated they **discourage
Moment from being used in new projects**. The main issues:

1. The entire library (232 KB min) is loaded even if you use one function
2. All locale files (160 KB min) are bundled by default in webpack
3. The object-oriented API prevents tree shaking

**Webpack mitigation (if migration is not possible):**
```js
// webpack.config.js -- exclude all locales
const webpack = require('webpack');
module.exports = {
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    })
  ]
};
// Saves ~160 KB minified, ~40 KB gzipped
```

Source: [GitHub - You-Dont-Need-Momentjs](https://github.com/you-dont-need/You-Dont-Need-Momentjs)

### lodash: Import Discipline

```js
// BAD: imports all 531 KB
import _ from 'lodash';
_.debounce(fn, 300);

// BETTER: cherry-pick (works with CJS lodash)
import debounce from 'lodash/debounce';

// BEST: use lodash-es for tree shaking
import { debounce } from 'lodash-es';
```

Using individual imports or lodash-es typically results in only **1-5 KB per function**
included in the bundle, compared to 72 KB gzipped for the full library.

### Duplicate Dependencies

Duplicate dependencies occur when multiple versions of the same package exist in the
dependency tree because transitive dependencies request incompatible semver ranges.

**Detection:**
```bash
# Check for duplicates in yarn
yarn dedupe --check

# Check for duplicates in npm
npm ls lodash  # shows all versions in the tree

# Use webpack-bundle-analyzer and search for duplicate module names
```

**Impact:** Atlassian's Jira team found that their webpack-deduplication-plugin reduced
JavaScript bundle size by approximately **10%** just by eliminating duplicate packages.

Source: [Atlassian Engineering - Performance in Jira front-end: solving bundle duplicates](https://www.atlassian.com/blog/atlassian-engineering/performance-in-jira-front-end-solving-bundle-duplicates-with-webpack-and-yarn)

**Fix:**
```jsonc
// package.json -- force a single version (yarn)
{
  "resolutions": {
    "lodash": "^4.17.21"
  }
}

// package.json -- force a single version (npm)
{
  "overrides": {
    "lodash": "^4.17.21"
  }
}
```

---

## 11. Anti-Patterns

### Anti-Pattern 1: Importing Entire Libraries

```js
// ANTI-PATTERN: pulls in all 500+ lodash functions
import _ from 'lodash';
const result = _.get(obj, 'a.b.c');

// FIX: import only what you use
import get from 'lodash/get';
const result = get(obj, 'a.b.c');

// BETTER FIX: use native optional chaining (0 KB)
const result = obj?.a?.b?.c;
```

**Impact:** Importing all of lodash adds ~72 KB gzipped to your bundle. Using a single
function via direct import adds ~1-2 KB. Using native JavaScript features adds 0 KB.

### Anti-Pattern 2: Barrel File Re-Exports

Barrel files (`index.ts` that re-export from many modules) defeat tree shaking in many
bundler configurations.

```typescript
// components/index.ts -- BARREL FILE (anti-pattern at scale)
export { Button } from './Button';
export { Modal } from './Modal';
export { DataGrid } from './DataGrid';     // 150 KB
export { RichTextEditor } from './Editor'; // 200 KB
export { Chart } from './Chart';           // 180 KB

// Consumer only needs Button, but may pull in everything
import { Button } from './components';
// Result: 255 KB first-load JS for a button component
```

Source: [DEV Community - The Barrel Trap](https://dev.to/elmay/the-barrel-trap-how-i-learned-to-stop-re-exporting-and-love-explicit-imports-3872)

**Fix:** Use direct imports to the specific module file:

```typescript
// Direct import -- only Button code is included
import { Button } from './components/Button';
```

**Next.js mitigation:** Next.js provides `optimizePackageImports` that rewrites barrel
imports to direct imports automatically at build time.

```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material']
  }
};
```

### Anti-Pattern 3: Not Analyzing Your Bundle

A surprisingly common anti-pattern is never running bundle analysis. Teams add dependencies
throughout the project lifecycle without checking their size impact. By the time performance
degrades, the bundle is a tangled mess of oversized and duplicate dependencies.

**Rule:** Run `webpack-bundle-analyzer` or `rollup-plugin-visualizer` at least once per
sprint and before every major release. Add bundle size checks to CI.

### Anti-Pattern 4: Missing `sideEffects` in Library Code

Library authors who omit the `sideEffects` field from `package.json` prevent their
consumers' bundlers from effectively tree-shaking the library. Even fully ESM libraries
will not tree-shake optimally without this flag because the bundler cannot prove that
skipped modules have no side effects.

### Anti-Pattern 5: Excessive Polyfilling

Including `core-js/stable` or `import 'core-js'` at the application entry point pulls
in **all** polyfills regardless of the browserslist target or actual feature usage. This
can add 75+ KB gzipped of polyfill code that modern browsers do not need.

**Fix:** Use `useBuiltIns: 'usage'` in `@babel/preset-env`:

```json
{
  "presets": [
    ["@babel/preset-env", {
      "useBuiltIns": "usage",
      "corejs": 3
    }]
  ]
}
```

This injects only the polyfills that are actually used in your source code, for only the
browsers that need them (per your browserslist config). The reduction from ~293 polyfills
to ~87 (or fewer) is common.

### Anti-Pattern 6: Shipping Source Maps to Production

Source maps do not affect runtime performance (browsers only download them when DevTools
are open), but they increase deployment artifact sizes and expose source code. If you
must ship source maps, use `hidden-source-map` to prevent the browser from requesting
them automatically.

---

## 12. Before/After Case Studies

### Case Study 1: Replacing moment.js with date-fns

A React application replaced moment.js with date-fns for date formatting and manipulation.

| Metric            | moment.js     | date-fns      | Savings     |
|-------------------|--------------|---------------|-------------|
| Stat size         | 1.19 MB      | 1.09 MB       | 100 KB      |
| Parsed size       | 398.78 KB    | 354.23 KB     | 44.55 KB    |
| Gzipped size      | 121.71 KB    | 107.27 KB     | 14.44 KB    |

Source: [Medium - Replacing MomentJS with Date-fns for a Smaller Package Size](https://thefiend.medium.com/replacing-momentjs-with-date-fns-for-a-smaller-package-size-3365f358db4d)

Additionally, after removing the moment.js locale IgnorePlugin workaround (which was
previously hiding 160 KB of locale data), the date-fns version included only the 3 locales
actually used by the application.

### Case Study 2: Route-Based Code Splitting in a React SPA

A mid-size e-commerce application with 10 routes applied route-based code splitting.

| Metric                    | Before       | After        | Improvement  |
|--------------------------|-------------|-------------|--------------|
| Initial JS bundle         | 2.3 MB      | 875 KB      | 62%          |
| Time to Interactive       | 5.2 s       | 2.7 s       | 48%          |
| First Contentful Paint    | 1.8 s       | 1.2 s       | 33%          |
| Largest Contentful Paint  | 3.4 s       | 2.1 s       | 38%          |

Source: [Coditation - Optimizing Bundle Sizes in React Applications](https://www.coditation.com/blog/optimizing-bundle-sizes-in-react-applications-a-deep-dive-into-code-splitting-and-lazy-loading)

### Case Study 3: Jira Front-End Deduplication

Atlassian's Jira front-end team identified and eliminated duplicate dependencies across
their webpack bundle using yarn deduplication and a custom webpack plugin.

| Metric           | Before          | After           | Improvement |
|------------------|----------------|----------------|-------------|
| JS bundle size   | baseline       | -10%           | 10%         |
| Build warnings   | 200+ duplicate | 12 remaining   | 94% fewer   |

Source: [Atlassian Engineering - Performance in Jira front-end](https://www.atlassian.com/blog/atlassian-engineering/performance-in-jira-front-end-solving-bundle-duplicates-with-webpack-and-yarn)

### Case Study 4: Barrel File Elimination

A Next.js application with a shared component library barrel file that re-exported 50+
components migrated to direct imports.

| Metric               | Barrel Import   | Direct Import   | Improvement |
|----------------------|----------------|----------------|-------------|
| First-load JS (page) | 255 KB         | 42 KB          | 84%         |
| Shared chunk size    | 380 KB         | 95 KB          | 75%         |

Source: [joshuakgoldberg.com - Speeding Up Centered Part 3: Barrel Exports](https://www.joshuakgoldberg.com/blog/speeding-up-centered-part-3-barrel-exports/)

### Case Study 5: Switching from Gzip to Brotli

A content-heavy web application switched its CDN from gzip-only to Brotli (level 11,
static compression) for all JavaScript and CSS assets.

| Asset Type     | Gzip Size   | Brotli Size | Savings |
|---------------|------------|-------------|---------|
| Main JS bundle | 175 KB     | 150 KB      | 14%     |
| Vendor JS      | 120 KB     | 103 KB      | 14%     |
| CSS bundle     | 45 KB      | 38 KB       | 16%     |
| Total          | 340 KB     | 291 KB      | 14.4%   |

---

## 13. Decision Tree: My Bundle Is Too Large

Follow this diagnostic flowchart when your bundle exceeds its size budget.

```
START: Bundle exceeds size budget
  |
  v
Step 1: MEASURE
  Run webpack-bundle-analyzer / rollup-plugin-visualizer
  |
  v
What does the treemap show?
  |
  +---> One or two HUGE third-party libraries?
  |       |
  |       v
  |     Are they tree-shakeable?
  |       |
  |       +---> YES: Check import style
  |       |       - Using barrel import? --> Switch to direct import
  |       |       - Missing sideEffects flag? --> Add to package.json
  |       |       - Using default import? --> Switch to named imports
  |       |
  |       +---> NO: Can you replace them?
  |               |
  |               +---> moment.js --> date-fns or dayjs (save ~50-60 KB gzipped)
  |               +---> lodash --> lodash-es or native (save ~60-70 KB gzipped)
  |               +---> Full icon libraries --> individual icon imports
  |               +---> No replacement --> lazy-load if not needed on initial render
  |
  +---> DUPLICATE packages in the treemap?
  |       |
  |       v
  |     Run: npm ls <package> or yarn why <package>
  |     Fix: Add resolutions/overrides to force a single version
  |     Impact: typically 5-10% reduction
  |
  +---> POLYFILL code taking significant space?
  |       |
  |       v
  |     Check browserslist config --> are you targeting dead browsers?
  |     Switch to useBuiltIns: 'usage' in @babel/preset-env
  |     Remove manual core-js/stable import
  |     Impact: can save 30-75 KB gzipped
  |
  +---> EVERYTHING is in ONE chunk (no splitting)?
  |       |
  |       v
  |     Implement route-based code splitting (Step 1)
  |     Add vendor splitting via SplitChunksPlugin
  |     Lazy-load heavy components (modals, charts, editors)
  |     Impact: 40-62% initial bundle reduction
  |
  +---> Multiple SMALL issues across many modules?
          |
          v
        Audit ALL dependencies:
          - npm ls --all | wc -l  (count total packages)
          - Remove unused dependencies
          - Replace heavy packages with lighter alternatives
          - Check for packages that should be devDependencies
          - Run npx depcheck to find unused dependencies
          |
          v
        Still over budget?
          |
          v
        Apply compression improvements:
          - Switch from gzip to Brotli (save ~14%)
          - Enable static pre-compression at build time
          - Verify CDN serves compressed assets correctly
          |
          v
        Still over budget?
          |
          v
        Consider architecture changes:
          - Module Federation to share deps across micro-frontends
          - Server-side rendering to reduce client-side JS
          - Partial hydration / islands architecture
          - Move computation to Web Workers or server
```

### Quick Wins Ranked by Impact

| Action                                     | Typical Savings (gzipped) | Effort  |
|-------------------------------------------|--------------------------|---------|
| Route-based code splitting                 | 40-60% of initial load   | Medium  |
| Replace moment.js with date-fns/dayjs      | 50-60 KB                 | Low     |
| Direct imports instead of barrel files      | 20-80% per affected page | Low     |
| Eliminate duplicate dependencies            | 5-10% total              | Low     |
| Tree-shake lodash (lodash-es or direct)     | 60-70 KB                 | Low     |
| Switch to Brotli compression               | 14% of total compressed  | Low     |
| Remove unnecessary polyfills               | 30-75 KB                 | Medium  |
| Lazy-load heavy components                 | Varies (per component)   | Medium  |
| Differential serving (drop legacy bundle)   | 7-20% per modern bundle  | High    |
| Module Federation                          | Prevents N-way duplication| High    |

### Continuous Monitoring

After fixing issues, prevent regression:

1. Add `bundlesize` or equivalent to CI -- fail PRs that exceed the budget
2. Run bundle analysis on every release candidate
3. Review new dependencies before installation (check BundlePhobia first)
4. Track bundle size trends over time with tools like Calibre or SpeedCurve
5. Set webpack `performance.hints: 'error'` to catch regressions during development

---

## 14. Sources

- [web.dev - Incorporate performance budgets into your build process](https://web.dev/articles/incorporate-performance-budgets-into-your-build-tools)
- [web.dev - Setting performance budgets with webpack](https://web.dev/articles/codelab-setting-performance-budgets-with-webpack)
- [web.dev - Performance budgets with the Angular CLI](https://web.dev/articles/performance-budgets-with-the-angular-cli)
- [Addy Osmani - Start Performance Budgeting](https://addyosmani.com/blog/performance-budgets/)
- [Addy Osmani - The Cost of JavaScript in 2018](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4)
- [webpack - Tree Shaking guide](https://webpack.js.org/guides/tree-shaking/)
- [webpack - Module Federation](https://webpack.js.org/concepts/module-federation/)
- [webpack-bundle-analyzer on npm](https://www.npmjs.com/package/webpack-bundle-analyzer)
- [Smashing Magazine - Improving JavaScript Bundle Performance With Code-Splitting](https://www.smashingmagazine.com/2022/02/javascript-bundle-performance-code-splitting/)
- [Smashing Magazine - Tree-Shaking: A Reference Guide](https://www.smashingmagazine.com/2021/05/tree-shaking-reference-guide/)
- [DebugBear - Brotli vs. GZIP](https://www.debugbear.com/blog/http-compression-gzip-brotli)
- [DebugBear - How Does Browser Support Impact JavaScript Bundle Size?](https://www.debugbear.com/blog/how-does-browser-support-impact-bundle-size)
- [Paul Calvano - Choosing Between gzip, Brotli and zStandard Compression](https://paulcalvano.com/2024-03-19-choosing-between-gzip-brotli-and-zstandard-compression/)
- [Atlassian Engineering - Solving bundle duplicates with Webpack and yarn](https://www.atlassian.com/blog/atlassian-engineering/performance-in-jira-front-end-solving-bundle-duplicates-with-webpack-and-yarn)
- [Zalando Engineering - Building a Modular Portal with Webpack Module Federation](https://engineering.zalando.com/posts/2024/10/building-modular-portal-with-webpack-module-federation.html)
- [Coditation - Optimizing Bundle Sizes in React Applications](https://www.coditation.com/blog/optimizing-bundle-sizes-in-react-applications-a-deep-dive-into-code-splitting-and-lazy-loading)
- [Strapi - Best Webpack Alternatives: Modern JS Bundlers 2025](https://strapi.io/blog/modern-javascript-bundlers-comparison-2025)
- [codejam.info - Duplicated ESM and CJS package in bundle](https://www.codejam.info/2024/02/esm-cjs-dupe.html)
- [DEV Community - The Barrel Trap](https://dev.to/elmay/the-barrel-trap-how-i-learned-to-stop-re-exporting-and-love-explicit-imports-3872)
- [joshuakgoldberg.com - Speeding Up Centered Part 3: Barrel Exports](https://www.joshuakgoldberg.com/blog/speeding-up-centered-part-3-barrel-exports/)
- [Medium - Replacing MomentJS with Date-fns](https://thefiend.medium.com/replacing-momentjs-with-date-fns-for-a-smaller-package-size-3365f358db4d)
- [GitHub - You-Dont-Need-Momentjs](https://github.com/you-dont-need/You-Dont-Need-Momentjs)
- [Alex MacArthur - Should We All Start Implementing Differential Serving?](https://macarthur.me/posts/should-we-implement-differential-serving/)
- [Calibre - Small Bundles, Fast Pages](https://calibreapp.com/blog/bundle-size-optimization)
- [developerway.com - Bundle Size Investigation](https://www.developerway.com/posts/bundle-size-investigation)
- [developerway.com - Webpack and yarn magic against duplicates](https://www.developerway.com/posts/webpack-and-yarn-magic-against-duplicates-in-bundles)
- [MDN - Tree shaking glossary](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)
- [3perf.com - Polyfills guide](https://3perf.com/blog/polyfills/)
- [DigitalOcean - How To Analyze Angular App Bundle Sizes](https://www.digitalocean.com/community/tutorials/angular-bundle-size)
