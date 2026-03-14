# SSR & Hydration: Performance Expertise Module

> **Scope**: Server-side rendering strategies, hydration cost analysis, streaming architectures,
> and modern rendering patterns for optimal web performance.
>
> **Last updated**: 2026-03-08

---

## Table of Contents

1. [Rendering Strategies Compared](#1-rendering-strategies-compared)
2. [The Hydration Cost Problem](#2-the-hydration-cost-problem)
3. [Streaming SSR](#3-streaming-ssr)
4. [React Server Components](#4-react-server-components)
5. [Islands Architecture](#5-islands-architecture)
6. [Progressive and Lazy Hydration](#6-progressive-and-lazy-hydration)
7. [Resumability: The Post-Hydration Paradigm](#7-resumability-the-post-hydration-paradigm)
8. [Edge Rendering](#8-edge-rendering)
9. [Common Bottlenecks](#9-common-bottlenecks)
10. [Anti-Patterns](#10-anti-patterns)
11. [Before/After Case Studies](#11-beforeafter-case-studies)
12. [Decision Tree: Should I Use SSR?](#12-decision-tree-should-i-use-ssr)
13. [Implementation Checklist](#13-implementation-checklist)
14. [Sources](#14-sources)

---

## 1. Rendering Strategies Compared

### 1.1 Overview Matrix

| Strategy | TTFB | FCP | LCP | TTI | SEO | Dynamic Data | Build Cost |
|----------|------|-----|-----|-----|-----|-------------|------------|
| **CSR** | 50-100ms | 1.5-3.5s | 2.5-5.0s | 3.5-7.0s | Poor | Excellent | Low |
| **SSR** | 200-600ms | 0.8-1.5s | 1.2-2.5s | 2.0-4.5s | Excellent | Excellent | Medium |
| **SSG** | 20-50ms | 0.4-0.8s | 0.6-1.2s | 0.6-1.5s | Excellent | None | High at scale |
| **ISR** | 20-50ms* | 0.4-0.8s | 0.6-1.2s | 0.6-1.5s | Excellent | Periodic | Medium |
| **Streaming SSR** | 40-150ms | 0.5-1.0s | 1.0-2.0s | 1.5-3.5s | Excellent | Excellent | Medium |

*ISR serves from CDN cache after first generation; subsequent requests match SSG performance.

### 1.2 Client-Side Rendering (CSR)

CSR downloads a minimal HTML shell and renders everything via JavaScript in the browser.

**Performance profile**:
- TTFB is fast (50-100ms) because the server sends a near-empty HTML document
- FCP is delayed (1.5-3.5s) because the browser must download, parse, and execute the JS bundle
  before any meaningful content appears
- LCP suffers further (2.5-5.0s) because data fetching only begins after JS execution
- TTI can reach 3.5-7.0s on mobile devices due to the full JS parse-and-execute cycle

**When CSR wins**: Internal dashboards, authenticated apps where SEO is irrelevant, and
applications with heavy real-time interactivity (collaborative editors, trading platforms).

### 1.3 Server-Side Rendering (SSR)

SSR generates full HTML on the server for every request.

**Performance profile**:
- TTFB is slower (200-600ms) because the server must fetch data and render HTML before responding
- FCP is significantly faster (0.8-1.5s) because the browser receives ready-to-paint HTML
- LCP improves (1.2-2.5s) since the image/element is present in the HTML source, not injected by JS
- TTI can lag behind FCP by 1-3 seconds due to hydration cost

Per web.dev guidelines, SSR is preferred over CSR for LCP because the full page markup, including
images, is present in the HTML source. CSR solutions require JavaScript to run before the image
can be discovered, which delays LCP.

**Database I/O is the real bottleneck**: If a database is 50ms away from the app server and a page
makes 3 sequential queries, that is 150ms for data alone. Add 50-100ms for SSR rendering, yielding
a 200-250ms baseline TTFB before any cold-start overhead.

### 1.4 Static Site Generation (SSG)

SSG pre-renders pages at build time, serving them as static HTML from a CDN.

**Performance profile**:
- TTFB is minimal (20-50ms) since pages are pre-built and served from edge CDN
- All loading metrics are near-optimal because no server computation occurs at request time
- Build times grow linearly with page count (problematic at 10K+ pages)

### 1.5 Incremental Static Regeneration (ISR)

ISR combines SSG speed with SSR freshness. Pages are served from cache and regenerated in the
background at configurable intervals.

**Performance profile**:
- First request after expiry may see SSR-like TTFB (200-600ms)
- All subsequent requests within the revalidation window get SSG-like performance (20-50ms)
- Using `stale-while-revalidate`, every request after the first becomes a <50ms CDN hit
  while fresh content is fetched in the background

ISR is optimal for e-commerce catalog pages, news sites, and any content that updates hourly
or daily rather than per-request.

---

## 2. The Hydration Cost Problem

### 2.1 What Is Hydration?

Hydration is the process of attaching JavaScript event listeners and component state to
server-rendered HTML, making the static markup interactive. The browser must:

1. Download the JavaScript bundle (network cost)
2. Parse the JavaScript (CPU cost)
3. Execute component initialization code (CPU cost)
4. Reconcile the server-rendered DOM with React's virtual DOM (CPU cost)
5. Attach event listeners (minimal cost)

### 2.2 The "Uncanny Valley" of Web Performance

The period between First Contentful Paint and Time to Interactive is the "uncanny valley" --
users see a fully rendered page but clicks, taps, and scrolls produce no response. This creates
a worse user experience than a loading spinner because it violates user expectations.

**Measured impact**:
- A typical React application with 200KB of JS (gzipped) takes 1-3 seconds to hydrate on a
  mid-range mobile device (Moto G Power class)
- During hydration, the main thread is blocked, meaning user interactions are queued
- INP (Interaction to Next Paint) violations are common: pages must achieve INP under 200ms to
  pass Core Web Vitals, but hydration-blocked interactions can exceed 500ms
- Only 47% of sites met all Core Web Vitals thresholds in 2025, with LCP being the hardest
  metric to pass (only 62% of mobile pages achieve a "good" LCP score)

### 2.3 Quantifying Hydration Cost

Hydration cost scales with:

| Factor | Impact |
|--------|--------|
| Number of components | Linear: each component runs its initialization logic |
| Component tree depth | Sub-linear but adds reconciliation overhead |
| Event listeners | Minimal per-listener, but thousands add up |
| State initialization | Proportional to computation in `useState`/`useEffect` |
| Third-party libraries | Often the largest contributor (analytics, A/B testing, ads) |

**Rule of thumb**: Every 100KB of JavaScript adds approximately 300-500ms of hydration time on
a median mobile device. A 500KB bundle (common in e-commerce) can produce 1.5-2.5 seconds of
main-thread blocking during hydration.

### 2.4 Double Rendering Problem

Traditional SSR performs rendering twice:
1. Server renders the component tree to HTML (server cost)
2. Client re-renders the entire component tree during hydration (client cost)

This means the CPU work of rendering is duplicated. The server's rendering work is "thrown away"
on the client as React reconciles from scratch. This is the fundamental inefficiency that
streaming SSR, partial hydration, and resumability each attempt to solve.

---

## 3. Streaming SSR

### 3.1 How Streaming SSR Works

Instead of waiting for the entire HTML document to be generated, streaming SSR sends HTML to the
browser incrementally as it is produced. The server begins flushing the `<head>` and initial
content immediately, while slower data-dependent sections are streamed later.

```
Traditional SSR timeline:
  Server: [--fetch data--][--render HTML--][--send response--]
  Browser:                                 [--parse--][--paint--][--hydrate--]
  TTFB: ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|

Streaming SSR timeline:
  Server: [--send shell--][--fetch data--][--stream chunks--]
  Browser: [--parse shell--][--paint shell--]  [--parse chunks--][--hydrate--]
  TTFB: ~~~~~~~~~~~~~~|
```

### 3.2 Performance Benefits

**TTFB reduction**: Streaming SSR reduces TTFB from 350-550ms (traditional SSR) to 40-90ms
in production benchmarks. The static shell ships immediately while data-dependent content
streams in afterward.

**Perceived load time**: Streaming SSR reduces perceived load times by up to 40% compared to
traditional SSR because users see content progressively rather than staring at a blank page.

**Real-world benchmark** (data-heavy dashboard):
- Unoptimized RSC: TTFB 350-550ms depending on backend latency
- With progressive streaming: first bytes in 40-90ms, full page painted under 400ms
- Net improvement: 75-85% reduction in TTFB

### 3.3 React 18+ Streaming Architecture

React 18 introduced `renderToPipeableStream` (Node.js) and `renderToReadableStream` (Web
Streams API) to replace the blocking `renderToString`.

Key mechanisms:
- **Suspense boundaries**: Each `<Suspense>` boundary can stream independently. Content inside
  a Suspense boundary is replaced with a fallback until the server finishes rendering it, then
  the completed HTML is streamed with an inline `<script>` that swaps it in.
- **Selective hydration**: React 18 can prioritize hydrating components the user is trying to
  interact with, even if other parts of the page are still streaming.
- **Out-of-order streaming**: Sections can complete and stream in any order; the browser
  inserts them into the correct DOM location regardless of arrival sequence.

### 3.4 Framework Support

| Framework | Streaming Support | Implementation |
|-----------|------------------|----------------|
| **Next.js App Router** | Built-in | Automatic with `loading.tsx` and Suspense |
| **Remix / React Router v7** | Built-in | `defer()` + `<Await>` components |
| **Nuxt 3** | Built-in | Automatic with `<Suspense>` |
| **SvelteKit** | Built-in | Streaming by default since 2.0 |
| **Astro** | Built-in | Server islands stream independently |
| **Angular** | Experimental | Available since Angular 17 |

---

## 4. React Server Components

### 4.1 The RSC Performance Model

React Server Components (RSC) execute exclusively on the server and send a serialized
representation (the "RSC payload" or "Flight payload") to the client. Unlike traditional SSR,
RSC components never ship their JavaScript to the browser.

**Key performance characteristics**:
- Server Components contribute zero bytes to the client JavaScript bundle
- Only components marked with `"use client"` ship JS to the browser
- Data fetching happens on the server, close to the database, avoiding client-server waterfalls
- The RSC payload is a compact serialized format, typically smaller than equivalent HTML

### 4.2 Bundle Size Impact

Real-world measurements show:
- Up to 62% reduction in JavaScript bundle size when migrating to RSC
- Initial RSC bundle: 40-50KB (framework runtime + client component code)
- Compare to traditional React SPA: 150-400KB typical, 500KB+ for large apps

**Case study**: An e-commerce company migrating product listing pages to RSC reported a 40%
improvement in load times and a 15% increase in conversion rates within the first quarter.

### 4.3 RSC Payload and Serialization Cost

Crossing a Server-to-Client boundary incurs serialization costs. All props passed from Server
Components to Client Components must be serialized into the Flight payload.

**Optimization strategies**:
- Pass only the data you need: filter unused properties before passing to client components
- Pass Server Components as `children` props: the RSC payload includes pre-rendered output,
  which is smaller than raw data objects
- Avoid serializing large objects: a 50KB JSON blob serialized as RSC props adds ~50KB to
  the Flight payload on every navigation

**Server rendering overhead**: Benchmarks show that React rendering on the server adds only a
small percentage of overhead compared to database + business logic. The true bottleneck at
scale is almost always database I/O, not React rendering.

### 4.4 When RSC Helps vs. When It Does Not

RSC delivers measurable performance gains when:
- The page has significant static content mixed with interactive elements
- Data fetching is involved (server-side fetching eliminates client waterfalls)
- Large dependencies (date libraries, markdown parsers) can stay server-only

RSC does NOT help when:
- The app is almost entirely interactive (most components need `"use client"`)
- Bundle size is already small
- No data fetching occurs (static content is better served by SSG)

**Critical insight**: Performance benefits from Server Components only appear when they
actually reduce the client bundle or eliminate data-fetching waterfalls. If an app is a mix
of Client and Server Components and the bundle size reduction is negligible, streaming and
Suspense are what deliver the real performance improvement, not RSC alone.

### 4.5 Hidden Costs

- **RSC payload duplication**: On client-side navigations, the RSC payload is fetched for
  each route, adding network requests that did not exist in a traditional SPA
- **Waterfall risk**: Nested Server Components can create sequential data-fetching waterfalls
  on the server if not parallelized with `Promise.all` or similar patterns
- **Cold starts**: Serverless SSR functions face cold-start penalties of 200-1500ms depending
  on runtime and bundle size

---

## 5. Islands Architecture

### 5.1 Concept

Islands Architecture treats a page as a sea of static HTML with discrete "islands" of
interactive JavaScript. Only the islands are hydrated; the rest remains inert HTML that
never loads or executes JavaScript.

```
+------------------------------------------------------------------+
|  Static HTML (no JS)                                             |
|                                                                  |
|  +------------------+                    +-------------------+   |
|  | Interactive      |                    | Interactive       |   |
|  | Island (React)   |                    | Island (Svelte)   |   |
|  | ~15KB JS         |                    | ~8KB JS           |   |
|  +------------------+                    +-------------------+   |
|                                                                  |
|  Static HTML (no JS)                                             |
|                                                                  |
|  +------------------------------------------+                   |
|  | Interactive Island (Vue) ~12KB JS         |                   |
|  +------------------------------------------+                   |
|                                                                  |
|  Static HTML (no JS)                                             |
+------------------------------------------------------------------+
Total JS: ~35KB (vs. 200-400KB for full-page hydration)
```

### 5.2 Framework Implementations

**Astro**:
- Achieves the highest Lighthouse scores among tested frameworks: 99.2 in the Enterspeed
  benchmark study
- Delivers 83% reduction in JavaScript compared to equivalent Next.js/Nuxt.js documentation
  sites
- Supports mixing React, Vue, Svelte, and Solid components as independent islands
- Server Islands (Astro 5+): add virtually zero JavaScript (a few hundred bytes of serialized
  props) while streaming independently

**Fresh (Deno)**:
- Zero JS shipped by default; only island components include JavaScript
- Built on Preact (3KB runtime) for minimal overhead
- Optimal for content-heavy sites needing selective interactivity

**Marko**:
- Automatic partial hydration: the compiler analyzes which components need client-side JS
- No manual `client:` directives required

### 5.3 Island JS Budget

| Island Runtime | Approximate Size (min+gzip) |
|---------------|---------------------------|
| Preact island | 3-5KB |
| Svelte island | 2-4KB (no runtime) |
| Solid island | 4-7KB |
| React island | 30-45KB (runtime included) |
| Vue island | 20-30KB |

For content sites with 2-3 small islands, total JS can stay under 20KB -- an order of
magnitude less than a typical SPA.

### 5.4 When Islands Win

Islands architecture is optimal for:
- Content-heavy sites (blogs, documentation, marketing pages)
- Sites with isolated interactive widgets (search bars, comment sections, image carousels)
- Performance-critical pages where every KB of JS matters

Islands are NOT optimal for:
- Highly interactive applications (dashboards, collaborative tools)
- Apps where most of the page requires JavaScript
- Cases requiring shared state across many components (though solutions exist)

---

## 6. Progressive and Lazy Hydration

### 6.1 Progressive Hydration

Progressive hydration delays component hydration until specific triggers fire, rather than
hydrating the entire page at once on load.

**Trigger strategies**:
- **Viewport entry**: Hydrate when the component scrolls into view (IntersectionObserver)
- **Idle callback**: Hydrate during browser idle time (`requestIdleCallback`)
- **Interaction**: Hydrate on first user interaction (click, hover, focus)
- **Media query**: Hydrate only on specific screen sizes

**Measured impact**: Real-world testing shows TTI drops of 500-800ms on mobile after replacing
full hydration with progressive hydration. One e-commerce site reduced landing page hydration
time by 80% using partial hydration techniques.

### 6.2 React 18 Selective Hydration

React 18 implements selective hydration automatically when using Suspense boundaries:
- Components wrapped in `<Suspense>` are hydrated independently
- If a user clicks on a not-yet-hydrated Suspense boundary, React prioritizes hydrating
  that section immediately
- Other sections continue hydrating in the background during idle time

This effectively implements progressive hydration at the framework level, making hydration
more granular and responsive to user input without manual configuration.

### 6.3 Lazy Hydration Patterns

```
// Conceptual pattern: hydrate on interaction
function LazyHydrate({ children, on = "idle" }) {
  // Component renders server HTML immediately
  // JavaScript loads and hydrates only on trigger:
  //   "idle"    -> requestIdleCallback
  //   "visible" -> IntersectionObserver
  //   "click"   -> first interaction
  //   "media"   -> matchMedia query
}
```

**Framework support**:
- **Astro**: `client:idle`, `client:visible`, `client:media`, `client:only` directives
- **Next.js**: `dynamic()` with `ssr: false` for client-only, Suspense for selective hydration
- **Nuxt 3**: `<LazyComponent>` prefix for automatic lazy loading
- **Angular**: `@defer` blocks with `on viewport`, `on idle`, `on interaction` triggers

### 6.4 Cost/Benefit Analysis

| Strategy | TTI Improvement | Complexity | Trade-off |
|----------|----------------|------------|-----------|
| Full hydration | Baseline | None | All JS executes upfront |
| Progressive (idle) | 200-400ms | Low | Slight delay for below-fold interactions |
| Progressive (visible) | 400-800ms | Low | Components not interactive until visible |
| Progressive (interaction) | 500-1500ms | Medium | First interaction has ~100ms delay |
| No hydration (static) | Maximum | None | No interactivity |

---

## 7. Resumability: The Post-Hydration Paradigm

### 7.1 How Resumability Differs from Hydration

Traditional hydration re-executes component code on the client to rebuild state and attach
listeners. Resumability serializes the application state, component boundaries, and listener
locations into HTML, allowing the client to "resume" exactly where the server left off with
zero re-execution.

```
Hydration:
  Server: render -> serialize HTML
  Client: download JS -> parse JS -> execute JS -> reconcile DOM -> attach listeners
  Cost: O(page_complexity)

Resumability:
  Server: render -> serialize HTML + state + listener locations
  Client: (nothing on load) -> on interaction: download handler -> execute handler
  Cost: O(interaction_count), amortized per-interaction
```

### 7.2 Qwik Performance Benchmarks

Qwik, the primary framework implementing resumability:
- **50-80% faster than React on first load and first interaction**
- Initial bundle: 15-20KB (vs. React's 40-50KB with RSC, or 150-400KB traditional)
- 25-40% faster metrics across the board compared to React Server Components
- The performance gap widens on mobile devices and slower connections
- Near-instant TTI because there is no hydration step -- the page is interactive immediately

### 7.3 Trade-offs

- **Ecosystem maturity**: Qwik's ecosystem is significantly smaller than React's
- **Developer experience**: Requires learning new patterns (`$()` functions, serialization
  constraints)
- **Per-interaction cost**: Each first interaction incurs a small lazy-load delay (~50-100ms)
  as the specific handler is downloaded
- **Serialization constraints**: Not all JavaScript values can be serialized (closures over
  non-serializable state require workarounds)

---

## 8. Edge Rendering

### 8.1 Edge SSR Performance

Edge rendering executes SSR logic at CDN edge locations (300+ global PoPs), eliminating
the round-trip to a centralized origin server.

**TTFB benchmarks by deployment model**:

| Deployment Model | TTFB (warm) | TTFB (cold) | Global P95 |
|-----------------|-------------|-------------|------------|
| SSG + Edge Cache | 20-50ms | 20-50ms | <100ms |
| Edge Functions (warm) | 37-60ms | 100-300ms | <150ms |
| Regional Serverless (warm) | 103-154ms | 300-1500ms | <500ms |
| Traditional SSR (origin) | 200-600ms | 200-600ms | 300-800ms |

Edge computing reduces TTFB by 60-80% for global users by eliminating the round-trip to
a centralized origin server.

### 8.2 Platform Comparison

**Cloudflare Workers**:
- V8 isolate model: lightweight isolates instead of full containers
- Sub-millisecond cold starts for small workers
- ~25% performance improvement from V8 garbage collection optimizations (2025)
- Limitation: no Node.js API compatibility (must use Web APIs or `node_compat` flag)
- CPU time limit: 10-50ms on free plan, up to 30 seconds on paid plans

**Vercel Edge Runtime**:
- Built on V8 isolates (similar to Cloudflare Workers)
- Fluid Compute: bytecode caching and predictive instance warming reduce cold starts to
  near-imperceptible levels
- Tight integration with Next.js App Router and Partial Prerendering
- Benchmarks show Vercel is 1.2x to 5x faster than Cloudflare for server rendering
  (according to Vercel's own testing; independent verification varies)

**Deno Deploy**:
- V8 isolate model with native TypeScript support
- Built-in support for Fresh framework's islands architecture
- Global deployment across 35+ regions

### 8.3 Edge Rendering Constraints

Edge functions face real limitations:
- **Limited compute budget**: Complex rendering or data transformation may exceed CPU limits
- **No persistent connections**: Cannot maintain database connection pools (must use HTTP-based
  database proxies or edge-compatible databases like PlanetScale, Neon, Turso)
- **Bundle size limits**: Cloudflare Workers: 10MB (paid), Vercel Edge: 4MB
- **No filesystem access**: Cannot read files from disk at runtime
- **Cold starts still exist**: Though much shorter (50-300ms) than traditional serverless
  (300-1500ms)

### 8.4 Partial Prerendering (PPR)

Next.js Partial Prerendering combines edge-cached static shells with streaming dynamic content:

1. Static shell is pre-rendered at build time and cached at the edge
2. Dynamic "holes" in the shell are filled by streaming SSR at request time
3. TTFB reflects CDN latency (20-50ms) rather than server processing time
4. Dynamic content streams in after the shell is painted

**Benchmark**: PPR moved TTFB from 350-550ms (all data fetched before response) to 40-90ms
(static shell from edge, data streamed after).

---

## 9. Common Bottlenecks

### 9.1 Full-Page Hydration Cost

**Problem**: The entire component tree is hydrated on load, even for components that are
never interacted with (footers, static content sections, decorative elements).

**Impact**: On a page with 500 components, hydration may take 1.5-3 seconds on a median
mobile device, during which the page appears frozen.

**Solution**: Progressive hydration, islands architecture, or RSC to limit hydration scope.

### 9.2 Serialization Overhead

**Problem**: SSR requires serializing the rendered output (HTML) and, with RSC, the Flight
payload. Large data objects passed as props are serialized redundantly.

**Impact**: A product listing page passing 200 product objects (each 2KB) adds ~400KB of
serialized data to the response, increasing transfer time by 200-800ms on 3G connections.

**Solution**: Paginate data, filter to only necessary fields, use server-side pagination
with streaming.

### 9.3 TTFB in Traditional SSR

**Problem**: Traditional SSR blocks the response until all data is fetched and the full page
is rendered. Sequential data-fetching waterfalls compound the delay.

**Impact**: A page with 3 sequential API calls (each 100ms) + rendering (100ms) = 400ms TTFB
minimum before the browser receives any bytes.

**Solution**: Streaming SSR, parallel data fetching, or Partial Prerendering.

### 9.4 Layout Thrashing During Hydration

**Problem**: Hydration can cause layout shifts if the client-rendered output differs from
the server-rendered output (hydration mismatches).

**Impact**: CLS (Cumulative Layout Shift) violations. Google's threshold is CLS < 0.1;
hydration mismatches can cause CLS > 0.25.

**Solution**: Ensure server and client render identical output. Use `suppressHydrationWarning`
only as a last resort for intentional differences (timestamps, user-agent-specific content).

### 9.5 Third-Party Script Blocking

**Problem**: Third-party scripts (analytics, ads, A/B testing) compete with hydration for
main-thread time.

**Impact**: A single analytics SDK can add 200-500ms to TTI. Multiple third-party scripts
can push TTI beyond 5 seconds on mobile.

**Solution**: Load third-party scripts with `defer` or `async`, use `requestIdleCallback`
for non-critical initialization, consider server-side analytics (Plausible, Fathom), or
use Partytown to offload scripts to a web worker.

---

## 10. Anti-Patterns

### 10.1 Hydrating Everything

**Pattern**: Using SSR/SSG but then hydrating the entire page, including static content
that never changes or responds to user interaction.

**Cost**: A documentation page with a single search widget hydrates 200+ static components
just to make the search interactive. This can waste 1-2 seconds of main-thread time.

**Fix**: Use islands architecture (Astro) or extract the interactive part into a
`"use client"` island while keeping the rest as Server Components.

### 10.2 SSR Without Streaming

**Pattern**: Using `renderToString` (React) or equivalent blocking SSR methods.

**Cost**: TTFB increases linearly with page complexity. A data-heavy page may not send
its first byte for 500ms+ while the server renders everything.

**Fix**: Migrate to `renderToPipeableStream` (React 18+) or equivalent streaming APIs.
Wrap data-dependent sections in Suspense boundaries.

### 10.3 Blocking Data Fetching in SSR

**Pattern**: Sequential `await` calls in server-side data fetching, creating waterfalls.

```
// Anti-pattern: sequential fetches
const user = await getUser(id);         // 100ms
const posts = await getPosts(user.id);  // 150ms
const comments = await getComments();   // 100ms
// Total: 350ms before rendering starts

// Fix: parallel fetches where possible
const [user, comments] = await Promise.all([
  getUser(id),        // 100ms
  getComments(),      // 100ms
]);                    // Total: 100ms
const posts = await getPosts(user.id);  // 150ms (depends on user)
// Total: 250ms -- 29% faster
```

### 10.4 Over-Serializing Props

**Pattern**: Passing entire database objects through Server-to-Client component boundaries.

**Cost**: A 50KB user object serialized as props adds 50KB to every RSC payload. On pages
with multiple such objects, payload sizes balloon.

**Fix**: Extract only the fields the client component needs:
```
// Anti-pattern
<ClientComponent user={fullUserObject} />  // 50KB serialized

// Fix
<ClientComponent name={user.name} avatar={user.avatarUrl} />  // ~100 bytes
```

### 10.5 Not Caching SSR Output

**Pattern**: Re-rendering identical pages on every request without any caching layer.

**Cost**: A product page that changes once per hour is rendered 10,000 times between
updates, wasting server CPU and keeping TTFB at 200-600ms for all users.

**Fix**: Use ISR with appropriate revalidation intervals, CDN caching with
`stale-while-revalidate`, or full-page caching with cache invalidation webhooks.

### 10.6 Importing Heavy Libraries in Client Components

**Pattern**: Importing large libraries (moment.js: 72KB, lodash full: 72KB) in client
components when only a few functions are needed.

**Cost**: Every KB of client JavaScript adds hydration time. These libraries are parsed
and executed during hydration even if they are only used for a single function.

**Fix**: Use tree-shakable alternatives (date-fns: 2-5KB per function, lodash-es with
specific imports), or move the computation to a Server Component.

---

## 11. Before/After Case Studies

### 11.1 E-Commerce Product Listing (RSC Migration)

| Metric | Before (CSR) | After (RSC + Streaming) | Improvement |
|--------|-------------|------------------------|-------------|
| JS Bundle | 380KB | 145KB | -62% |
| TTFB | 450ms | 120ms | -73% |
| LCP | 2.9s | 1.8s | -38% |
| TTI | 4.2s | 2.1s | -50% |
| Conversion Rate | Baseline | +15% | +15% |

Source: Production migration case study, e-commerce platform (2024).

### 11.2 Data Dashboard (Streaming SSR Optimization)

| Metric | Before (Traditional SSR) | After (Streaming SSR + PPR) | Improvement |
|--------|-------------------------|---------------------------|-------------|
| TTFB | 350-550ms | 40-90ms | -80% |
| Full Page Paint | 1.2s | 400ms | -67% |
| Perceived Load Time | 1.2s | 400ms | -67% |

Source: Internal benchmark on data-heavy dashboard application.

### 11.3 Documentation Site (Islands Migration)

| Metric | Before (Next.js SPA) | After (Astro Islands) | Improvement |
|--------|---------------------|----------------------|-------------|
| JS Shipped | 185KB | 32KB | -83% |
| Lighthouse Score | 72 | 99 | +38% |
| TTI | 3.1s | 0.8s | -74% |
| LCP | 1.8s | 0.6s | -67% |

Source: Astro framework benchmarks and Enterspeed comparative study.

### 11.4 Next.js TTFB Optimization (Catch Metrics)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| TTFB | 800ms | <100ms | -87% |
| Server Render Time | 600ms | 50ms | -92% |

Techniques applied: streaming SSR, edge caching, database query optimization,
`stale-while-revalidate` caching strategy.

### 11.5 Mobile Performance (Progressive Hydration)

| Metric | Before (Full Hydration) | After (Progressive) | Improvement |
|--------|------------------------|---------------------|-------------|
| TTI (mobile) | 4.5s | 3.7-4.0s | 500-800ms faster |
| TBT | 1200ms | 400ms | -67% |
| Hydration Time | 2.0s | 0.4s | -80% |

Source: Real-world testing data from progressive hydration implementations.

---

## 12. Decision Tree: Should I Use SSR?

```
START: What type of application are you building?
|
+---> Content site (blog, docs, marketing)?
|     |
|     +---> Content changes rarely (daily or less)?
|     |     |
|     |     YES --> Use SSG
|     |             (Best: Astro, Next.js static export, Hugo)
|     |             Expected: TTFB <50ms, LCP <1s, Lighthouse 95+
|     |
|     +---> Content changes frequently but not per-user?
|     |     |
|     |     YES --> Use ISR (revalidate every N seconds)
|     |             (Best: Next.js ISR, Nuxt ISR)
|     |             Expected: TTFB <50ms (cached), LCP <1.2s
|     |
|     +---> Needs some interactivity (search, comments)?
|           |
|           YES --> Use Islands Architecture
|                   (Best: Astro, Fresh)
|                   Expected: JS <30KB, TTI <1s
|
+---> E-commerce / product pages?
|     |
|     +---> Catalog pages (many products, infrequent updates)?
|     |     |
|     |     YES --> Use ISR + Edge caching
|     |             Expected: TTFB <50ms, LCP <1.5s
|     |
|     +---> Product detail pages (personalized pricing, inventory)?
|     |     |
|     |     YES --> Use Streaming SSR or PPR
|     |             (Best: Next.js App Router, Remix)
|     |             Expected: TTFB <100ms (shell), LCP <2s
|     |
|     +---> Cart / checkout (highly interactive)?
|           |
|           YES --> Use SSR for initial load + client-side for interactions
|                   Expected: LCP <2s, TTI <3s
|
+---> Dashboard / SaaS application?
|     |
|     +---> Behind authentication (SEO irrelevant)?
|     |     |
|     |     YES --> Consider CSR (SPA)
|     |             (Best: Vite + React/Vue, or Next.js with client components)
|     |             Expected: Fast transitions after initial load
|     |
|     +---> Needs fast initial load + real-time data?
|     |     |
|     |     YES --> Use Streaming SSR
|     |             (Best: Next.js App Router, Remix)
|     |             Expected: TTFB <100ms (shell), full data <500ms
|     |
|     +---> Data-heavy with many widgets?
|           |
|           YES --> Use Streaming SSR + Progressive Hydration
|                   Expected: TTFB <90ms, widgets load progressively
|
+---> Real-time / collaborative app?
|     |
|     YES --> Use CSR with WebSocket/SSE
|             SSR adds complexity with minimal benefit for real-time UIs
|             (Best: Vite + React/Vue/Solid)
|
+---> Mobile-first / performance-critical?
      |
      +---> Target audience on slow devices/networks?
      |     |
      |     YES --> Minimize JS at all costs
      |             Use Islands (Astro) or Resumability (Qwik)
      |             Expected: TTI <2s on 3G, JS <50KB
      |
      +---> Need framework ecosystem (React)?
            |
            YES --> Use RSC + Streaming SSR + Progressive Hydration
                    Expected: LCP <2.5s, TTI <3.5s on mobile
```

### Quick Decision Heuristic

| If your priority is... | Choose... | Because... |
|------------------------|-----------|------------|
| Maximum performance, minimal JS | Astro Islands | 83% less JS, Lighthouse 99+ |
| SEO + dynamic content | Streaming SSR (Next.js/Remix) | Fast TTFB + crawlable HTML |
| Static content at scale | SSG or ISR | CDN-speed delivery, zero server cost |
| React ecosystem + performance | RSC + Streaming | 62% bundle reduction, streaming TTFB |
| Absolute fastest TTI | Qwik (resumability) | 50-80% faster first load than React |
| Global audience, low latency | Edge SSR + PPR | 60-80% TTFB reduction for global users |
| Internal tool, SEO irrelevant | CSR (Vite SPA) | Simplest architecture, fast dev cycle |

---

## 13. Implementation Checklist

### SSR Performance Audit

- [ ] **Measure baseline**: Record TTFB, FCP, LCP, TTI, TBT, INP, CLS for current implementation
- [ ] **Profile hydration**: Use React DevTools Profiler or Chrome Performance tab to measure
      hydration duration and identify slow components
- [ ] **Audit JS bundle**: Use `next/bundle-analyzer`, `webpack-bundle-analyzer`, or `source-map-explorer`
      to identify oversized dependencies
- [ ] **Check for sequential data fetching**: Grep for sequential `await` calls in server-side
      data fetching; parallelize with `Promise.all` where possible
- [ ] **Verify streaming**: Confirm the application uses streaming SSR (`renderToPipeableStream`)
      rather than blocking `renderToString`

### Quick Wins (Each saves 100-500ms)

- [ ] **Add Suspense boundaries**: Wrap data-dependent sections to enable streaming and selective
      hydration
- [ ] **Lazy-load below-fold components**: Use `dynamic()` (Next.js) or `React.lazy()` with
      Suspense for components not visible on initial viewport
- [ ] **Move heavy libraries server-side**: Libraries used only for rendering (markdown, date
      formatting, syntax highlighting) belong in Server Components
- [ ] **Optimize images**: Use `<Image>` component (Next.js) or `<picture>` with `srcset` for
      responsive images; this alone can improve LCP by 200-500ms
- [ ] **Defer third-party scripts**: Use `next/script` with `strategy="lazyOnload"` or manual
      `defer`/`async` attributes

### Advanced Optimizations

- [ ] **Implement PPR**: Use Next.js Partial Prerendering to serve static shells from edge cache
      while streaming dynamic content
- [ ] **Edge deployment**: Deploy to Cloudflare Workers, Vercel Edge, or Deno Deploy for
      60-80% TTFB reduction for global users
- [ ] **ISR for semi-static pages**: Configure revalidation intervals for pages that change
      infrequently (product catalogs, blog posts)
- [ ] **Database proximity**: Ensure the database is in the same region as the SSR server;
      50ms of network latency per query compounds rapidly
- [ ] **Connection pooling**: Use connection poolers (PgBouncer, PlanetScale connection pooling)
      to avoid cold-connection overhead on serverless

### Monitoring

- [ ] **Set up Real User Monitoring (RUM)**: Track Core Web Vitals in production with
      `web-vitals` library, Vercel Analytics, or DebugBear
- [ ] **Alert on regressions**: Set thresholds for TTFB (<800ms), LCP (<2.5s), INP (<200ms)
- [ ] **Track hydration time**: Custom performance marks around hydration to monitor drift
- [ ] **Monitor RSC payload size**: Track Flight payload size per route to catch prop bloat early

---

## 14. Sources

### Performance Data and Benchmarks
- [Edge vs SSR vs SSG: 2025 Performance Benchmarks & TTFB Data](https://medium.com/better-dev-nextjs-react/edge-vs-ssr-vs-ssg-2025-performance-benchmarks-ttfb-data-meta-description-7b508c572b5f) - Melvin Prince, Better Dev
- [React Server Components: Do They Really Improve Performance?](https://www.developerway.com/posts/react-server-components-performance) - Nadia Makarevich, Developer Way
- [Intro to Performance of React Server Components](https://calendar.perfplanet.com/2025/intro-to-performance-of-react-server-components/) - Web Performance Calendar, 2025
- [The Hidden Performance Costs of React Server Components](https://dev.to/rbobr/the-hidden-performance-costs-of-react-server-components-248f) - DEV Community
- [Unpacking Cloudflare Workers CPU Performance Benchmarks](https://blog.cloudflare.com/unpacking-cloudflare-workers-cpu-performance-benchmarks/) - Cloudflare Blog

### SSR and Streaming
- [Modern SSR 2025: Ultrafast Web Performance](https://blog.madrigan.com/en/blog/202603061451/) - Madrigan Blog
- [SSR 2025: Selective Hydration, Streaming, and Edge](https://blog.madrigan.com/en/blog/202512041544/) - Madrigan Blog
- [Revisiting HTML Streaming for Modern Web Performance](https://calendar.perfplanet.com/2025/revisiting-html-streaming-for-modern-web-performance/) - Web Performance Calendar
- [Server-Side Rendering Evolved: Unlocking Faster TTFB and TTI with Streaming SSR](https://medium.com/cstech/server-side-rendering-evolved-unlocking-faster-ttfb-and-tti-with-streaming-ssr-800735e37bad) - CSTech
- [The Ultimate Guide to Improving Next.js TTFB Slowness](https://www.catchmetrics.io/blog/the-ultimate-guide-to-improving-nextjs-ttfb-slowness-from-800ms-to-less100ms) - Catch Metrics
- [Optimizing Nuxt SSR Performance](https://www.debugbear.com/blog/nuxt-ssr-performance) - DebugBear

### Hydration and Islands
- [Improving Front-end Performance through Modular Rendering and Adaptive Hydration](https://arxiv.org/html/2504.03884v1) - arXiv (academic paper)
- [Progressive Hydration Explained](https://devtechinsights.com/progressive-hydration-web-performance-2025/) - Dev Tech Insights
- [Progressive Hydration Pattern](https://www.patterns.dev/react/progressive-hydration/) - Patterns.dev
- [Islands Architecture Pattern](https://www.patterns.dev/vanilla/islands-architecture/) - Patterns.dev
- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/) - Astro Docs
- [Why Islands Architecture Is the Future](https://dev.to/siva_upadhyayula_f2e09ded/why-islands-architecture-is-the-future-of-high-performance-frontend-apps-3cf5) - DEV Community

### Framework Comparisons
- [Qwik vs React vs SolidJS: The Future of Web Performance](https://www.javacodegeeks.com/2025/06/qwik-vs-react-vs-solidjs-the-future-of-web-performance.html) - Java Code Geeks
- [Next.js vs Qwik: Who Wins the Performance Race in 2025?](https://dev.to/hamzakhan/nextjs-vs-qwik-who-wins-the-performance-race-in-2025-21m9) - DEV Community
- [Angular vs Qwik vs SolidJS in 2025](https://metadesignsolutions.com/angular-vs-qwik-vs-solidjs-in-2025-the-speed-dx-comparison-resumability-ssr-hydration-techniques/) - Meta Design Solutions
- [CSR vs SSR vs SSG vs ISR Comparison](https://hashbyt.com/blog/csr-vs-ssr-vs-ssg-vs-isr) - Hashbyt
- [How to Choose the Best Rendering Strategy](https://vercel.com/blog/how-to-choose-the-best-rendering-strategy-for-your-app) - Vercel Blog

### Core Web Vitals
- [Core Web Vitals](https://web.dev/articles/vitals) - web.dev
- [Optimize TTFB](https://web.dev/articles/optimize-ttfb) - web.dev
- [The Most Effective Ways to Improve Core Web Vitals](https://web.dev/articles/top-cwv) - web.dev
- [Why React Server Components Matter: Production Performance Insights](https://blogs.perficient.com/2025/12/10/why-react-server-components-matter-production-performance-insights/) - Perficient

### RSC Optimization
- [How to Optimize RSC Payload Size](https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size) - Vercel Knowledge Base
- [The Forensics of React Server Components](https://www.smashingmagazine.com/2024/05/forensics-react-server-components/) - Smashing Magazine
- [Optimizing Next.js Performance: LCP, Render Delay & Hydration](https://www.iamtk.co/optimizing-nextjs-performance-lcp-render-delay-hydration) - TK

### Edge and Platform
- [Cloudflare vs Vercel vs Netlify: Edge Performance 2026](https://dev.to/dataformathub/cloudflare-vs-vercel-vs-netlify-the-truth-about-edge-performance-2026-50h0) - DEV Community
- [Vercel vs Cloudflare: Edge Deployment Deep Dive](https://sparkco.ai/blog/vercel-vs-cloudflare-edge-deployment-deep-dive) - SparkCo
- [Are You Measuring What Matters? A Fresh Look at TTFB](https://blog.cloudflare.com/ttfb-is-not-what-it-used-to-be/) - Cloudflare Blog
