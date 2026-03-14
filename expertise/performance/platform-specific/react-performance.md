# React Performance -- Performance Expertise Module

> React's virtual DOM diffing provides good default performance, but poorly structured components can cause cascading re-renders that bring apps to a crawl. Understanding React's rendering model -- when components re-render, how reconciliation works, and when to memoize -- is the key to building fast React apps.

> **Impact:** Critical
> **Applies to:** Web (React, Next.js, Remix)
> **Key metrics:** Component render time, Re-render frequency, Bundle size, Time to Interactive (TTI), Interaction to Next Paint (INP)

---

## 1. Why This Matters

### Re-render Cascades

React's rendering pipeline has three phases: trigger (state/prop change), render (calling component functions), and commit (applying changes to the DOM). Most performance problems occur in the render phase, where components execute unnecessarily.

A single state change at the top of a component tree can trigger re-renders in every descendant. In a tree of 500 components, a poorly placed `useState` at the root can cause all 500 components to re-execute their render functions on every keystroke. At 2ms per component, that is 1 second of blocked main thread per interaction -- well beyond the 200ms INP threshold Google requires for "good" Core Web Vitals.

### Bundle Bloat

The average React SPA ships 200-400 KB of gzipped JavaScript. Every additional KB increases parse time by approximately 1ms on a mid-range mobile device. A 400 KB bundle takes ~400ms just to parse before any rendering begins. Combined with hydration costs, this pushes Time to Interactive (TTI) to 4-6 seconds on 4G connections.

Research from Google shows that 53% of mobile users abandon sites that take longer than 3 seconds to load. Bundle bloat is the primary contributor to slow React app load times.

### Hydration Costs

Server-side rendered React apps must "hydrate" on the client -- the browser downloads all JavaScript bundles, then reconnects static HTML to the React tree and attaches event listeners. The average React SSR app has a TTI of 4.2 seconds on mobile devices. Hydration blocks interactivity: users see content but cannot interact with it until hydration completes.

Wix Engineering reported that selective hydration reduced their interaction delays by 40%. Deferring hydration of non-critical page sections (e.g., a large footer) can reduce Total Blocking Time (TBT) by 40% and initial hydration cost by approximately 45% (128ms down to 70ms with idle-until-urgent patterns).

---

## 2. Performance Budgets & Targets

| Metric | Target | Rationale |
|---|---|---|
| Component render time | < 16ms (single), < 5ms (frequent) | 60fps = 16.67ms per frame budget |
| Re-renders per interaction | < 3 component tree traversals | Each traversal consumes frame budget |
| Total JS bundle (gzipped) | < 200 KB initial, < 350 KB total | Parse cost ~1ms/KB on mobile |
| Largest Contentful Paint (LCP) | < 2.5s | Google Core Web Vital threshold |
| Interaction to Next Paint (INP) | < 200ms | Google Core Web Vital threshold (replaced FID March 2024) |
| Time to Interactive (TTI) | < 3.5s on 4G | User abandonment threshold |
| First Contentful Paint (FCP) | < 1.8s | Perceived load speed |
| Cumulative Layout Shift (CLS) | < 0.1 | Visual stability |
| Hydration time | < 100ms | Blocks interactivity |
| React Profiler commit time | < 16ms total | Full tree render within frame budget |

**Bundle budget breakdown for a typical SPA:**

| Chunk | Budget (gzipped) |
|---|---|
| React + ReactDOM | ~45 KB |
| Router | ~15 KB |
| State management | ~5-15 KB |
| UI component library | ~30-50 KB |
| Application code (initial route) | ~50-80 KB |
| **Total initial load** | **< 200 KB** |

---

## 3. Measurement & Profiling

### React DevTools Profiler

The React DevTools Profiler is the primary tool for identifying render performance issues.

**Flame chart reading:**
- Each bar represents a component; width indicates render duration including children.
- Grey bars indicate components that did not re-render (good).
- Color gradient from green (fast) to yellow (slow) indicates relative render cost.
- Enable "Record why each component rendered while profiling" to see render triggers.
- Use the commit filter to hide commits faster than a threshold (e.g., 5ms) to focus on slow renders.

**Key workflow:**
1. Open React DevTools Profiler tab.
2. Click Record, perform the interaction you want to measure.
3. Stop recording. Examine the flame chart for the slowest commits.
4. Look for wide yellow bars -- these are your bottleneck components.
5. Check "Why did this render?" for each slow component.
6. Target components that rendered but produced identical output (wasted renders).

### React Performance Tracks (React 19+)

React 19 introduced browser-native performance tracks visible in Chrome DevTools Performance tab. The Components track visualizes render durations as a flamegraph directly in the browser's performance timeline, eliminating the need to switch between tools.

### why-did-you-render

The `@welldone-software/why-did-you-render` library monkey-patches React to detect and report avoidable re-renders with human-readable explanations.

```javascript
// wdyr.js -- import as FIRST import in your app (development only)
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: true,
  });
}
```

**Warning:** Never include in production builds. It adds overhead and can cause edge-case breakage.

### Chrome Performance Tab

For lower-level analysis beyond React-specific tooling:
1. Record a performance trace during the slow interaction.
2. Look for long tasks (> 50ms, marked with red triangles).
3. Drill into the call tree to find React's `commitRoot` and `renderRootSync` calls.
4. Measure the total scripting time during interactions against the 200ms INP budget.

### React Profiler API (Programmatic)

```jsx
import { Profiler } from 'react';

function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  // Send to analytics if actualDuration exceeds threshold
  if (actualDuration > 16) {
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(1)}ms (phase: ${phase})`);
    analytics.track('slow_render', { id, actualDuration, baseDuration });
  }
}

<Profiler id="Dashboard" onRender={onRender}>
  <Dashboard />
</Profiler>
```

---

## 4. Common Bottlenecks

### 4.1 Unnecessary Re-renders from Parent State Changes

**Problem:** A parent component's state change re-renders all children, even those that receive unchanged props.

```jsx
// BAD: Every keystroke re-renders ExpensiveChart
function Dashboard() {
  const [search, setSearch] = useState('');
  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <ExpensiveChart data={chartData} /> {/* Re-renders on every keystroke */}
    </div>
  );
}
```

**Impact:** In a dashboard with 20 chart components at 8ms each, typing triggers 160ms of rendering per keystroke.

### 4.2 Prop Drilling Causing Cascade Re-renders

**Problem:** Passing state through multiple intermediate components forces each layer to re-render.

**Impact:** A 5-level deep prop drill means 5 components re-render when only the leaf needs the value. At scale, this multiplies across every branch.

### 4.3 Missing React.memo on Expensive Pure Components

**Problem:** Components that receive the same props still re-render because React does not shallow-compare props by default.

**Impact:** A list of 100 items where each item component takes 3ms to render wastes 300ms on every parent re-render.

### 4.4 Context Over-use

**Problem:** When any value in a Context changes, every consumer of that Context re-renders, even if they only use a portion of the context value.

**Impact:** A global context with user data, theme, and cart state causes every consumer to re-render when any single value changes. Measured at 4-10x more re-renders than necessary in typical apps.

### 4.5 Large Component Trees Without Boundaries

**Problem:** Monolithic component trees lack memoization boundaries, so renders cascade unchecked.

**Impact:** A 1,000-node component tree at 1ms per node = 1 second blocked render.

### 4.6 Inline Functions in JSX

**Problem:** Arrow functions in JSX (`onClick={() => handleClick(id)}`) create new function references every render, breaking shallow comparison in `React.memo`.

```jsx
// BAD: New function reference every render
<Button onClick={() => handleClick(item.id)} />

// GOOD: Stable reference with useCallback
const handleItemClick = useCallback(() => handleClick(item.id), [item.id]);
<Button onClick={handleItemClick} />
```

### 4.7 Inline Object/Array Literals as Props

**Problem:** `style={{ color: 'red' }}` or `data={[1,2,3]}` creates a new object/array reference every render.

```jsx
// BAD: New object every render -- breaks memo
<Chart style={{ width: 300, height: 200 }} config={{ animate: true }} />

// GOOD: Stable references
const chartStyle = useMemo(() => ({ width: 300, height: 200 }), []);
const chartConfig = useMemo(() => ({ animate: true }), []);
<Chart style={chartStyle} config={chartConfig} />

// BEST: Constants outside component (if truly static)
const CHART_STYLE = { width: 300, height: 200 };
const CHART_CONFIG = { animate: true };
```

### 4.8 Expensive Computations in Render

**Problem:** Filtering, sorting, or transforming large datasets on every render without memoization.

**Impact:** Sorting 10,000 items takes ~5-15ms. If the parent re-renders 10 times during an interaction, that is 50-150ms wasted on identical sorts.

### 4.9 Unvirtualized Long Lists

**Problem:** Rendering 10,000+ DOM nodes for a scrollable list when only 20-30 are visible.

**Impact:** Initial render of 10,000 list items can take 2-5 seconds. DOM node count above 1,500 degrades INP significantly.

### 4.10 Uncontrolled Bundle Growth

**Problem:** Importing entire libraries (`import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`) or lacking code splitting.

**Impact:** Lodash full import = 71 KB gzipped vs. single function = 1-2 KB. Moment.js = 67 KB gzipped vs. date-fns individual function = 1-3 KB.

### 4.11 Synchronous Expensive Updates Blocking Input

**Problem:** CPU-intensive operations (filtering large datasets, complex calculations) run synchronously, blocking the main thread during user input.

**Impact:** Typing in a search field that synchronously filters 50,000 items causes 200-500ms input lag per keystroke.

### 4.12 Excessive useEffect Chains

**Problem:** Multiple `useEffect` hooks that trigger state updates, causing cascading re-renders across multiple commit cycles.

**Impact:** Each `useEffect` that calls `setState` triggers a new render cycle. Three chained effects = three extra renders after the initial one.

### 4.13 Unoptimized Images and Media

**Problem:** Loading full-resolution images without lazy loading, proper sizing, or modern formats.

**Impact:** A single unoptimized hero image can add 500 KB-2 MB to page weight, dominating LCP.

### 4.14 Third-party Script Bloat

**Problem:** Analytics, chat widgets, A/B testing tools adding 100-300 KB of additional JavaScript.

**Impact:** Third-party scripts compete for main thread time during hydration. Google recommends a 50 KB budget for third-party scripts.

### 4.15 Layout Thrashing from DOM Reads/Writes

**Problem:** Measuring DOM elements (getBoundingClientRect) interleaved with mutations forces synchronous layout recalculation.

**Impact:** A loop that reads and writes 100 element positions can take 50-200ms instead of < 5ms when batched.

---

## 5. Optimization Patterns

### 5.1 React.memo -- Prevent Unnecessary Re-renders

Use `React.memo` to skip re-rendering when props have not changed (shallow comparison).

```jsx
// BEFORE: ProductCard re-renders every time parent re-renders (~8ms each)
function ProductCard({ product, onAddToCart }) {
  return (
    <div>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
}

// AFTER: Only re-renders when product or onAddToCart reference changes (~0ms when skipped)
const ProductCard = React.memo(function ProductCard({ product, onAddToCart }) {
  return (
    <div>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
});
// Measured improvement: List of 100 products, parent re-render drops from 300ms to <1ms
```

**When to use:** Components that render the same output for the same props, especially in lists, data grids, and chart components. Not useful for components that almost always receive different props.

### 5.2 useMemo -- Cache Expensive Computations

```jsx
// BEFORE: Sorts 10,000 items on every render (~12ms per render)
function ProductList({ products, sortBy }) {
  const sorted = products.sort((a, b) => a[sortBy] - b[sortBy]); // Mutates + recalculates
  return sorted.map(p => <ProductCard key={p.id} product={p} />);
}

// AFTER: Only re-sorts when products or sortBy changes (~0ms on unchanged renders)
function ProductList({ products, sortBy }) {
  const sorted = useMemo(
    () => [...products].sort((a, b) => a[sortBy] - b[sortBy]),
    [products, sortBy]
  );
  return sorted.map(p => <ProductCard key={p.id} product={p} />);
}
// Measured improvement: 10 parent re-renders save ~120ms total
```

**When to use:** Computations that are measurably slow (> 2ms), where dependencies change infrequently. Do not wrap trivial operations -- the hook itself has overhead (~0.1ms).

### 5.3 useCallback -- Stabilize Function References

```jsx
// BEFORE: New function reference every render breaks React.memo on children
function ProductList({ products }) {
  const [cart, setCart] = useState([]);

  // This function is recreated every render
  const handleAddToCart = (id) => {
    setCart(prev => [...prev, id]);
  };

  return products.map(p => (
    <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
  ));
}

// AFTER: Stable reference lets React.memo work on ProductCard
function ProductList({ products }) {
  const [cart, setCart] = useState([]);

  const handleAddToCart = useCallback((id) => {
    setCart(prev => [...prev, id]);
  }, []); // Empty deps because we use functional updater

  return products.map(p => (
    <MemoizedProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
  ));
}
// Measured improvement: 200 product list re-render drops from 400ms to <5ms
```

**Critical rule:** `useCallback` is useless without `React.memo` on the child component. Always memoize the child first, then stabilize the callback.

### 5.4 Code Splitting with React.lazy and Suspense

```jsx
// BEFORE: All routes loaded upfront (2.3 MB bundle)
import Dashboard from './Dashboard';
import Settings from './Settings';
import Analytics from './Analytics';

// AFTER: Routes loaded on demand (875 KB initial bundle -- 62% reduction)
const Dashboard = React.lazy(() => import('./Dashboard'));
const Settings = React.lazy(() => import('./Settings'));
const Analytics = React.lazy(() => import('./Analytics'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
// Measured improvement: TTI from 5.2s to 2.7s (48% improvement)
// FCP from 1.8s to 1.2s (33% improvement)
```

**Best practice:** Split at route boundaries first, then at heavy component boundaries (modals, drawers, complex forms). Use webpack magic comments for named chunks: `import(/* webpackChunkName: "analytics" */ './Analytics')`.

### 5.5 List Virtualization

Only render items visible in the viewport. For lists of 1,000+ items, virtualization is essential.

```jsx
// BEFORE: Renders all 10,000 rows (~3 seconds initial render)
function UserList({ users }) {
  return (
    <div style={{ height: '600px', overflow: 'auto' }}>
      {users.map(user => <UserRow key={user.id} user={user} />)}
    </div>
  );
}

// AFTER: Renders only ~15 visible rows (~15ms initial render)
import { FixedSizeList } from 'react-window';

function UserList({ users }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <UserRow user={users[index]} />
    </div>
  );
  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
// Measured improvement: 10,000 items render time from ~3000ms to ~15ms (200x faster)
```

**Library comparison:**

| Library | Size (gzipped) | Best for |
|---|---|---|
| react-window | ~6 KB | Fixed or variable size lists/grids (lighter) |
| react-virtualized | ~27 KB | Complex tables, multi-column grids |
| @tanstack/react-virtual | ~4 KB | Headless, framework-agnostic virtualization |
| react-virtuoso | ~15 KB | Variable height items with smooth scrolling |

Use `FixedSizeList` when all items have the same height -- it is the most performant option because position calculation is O(1) instead of O(n).

### 5.6 React Server Components (RSC)

Server Components execute only on the server. Their code never ships to the client, reducing bundle size and moving data fetching closer to the data source.

```jsx
// Server Component (default in Next.js App Router) -- zero client JS
async function ProductPage({ params }) {
  const product = await db.products.findById(params.id); // Direct DB access
  const reviews = await db.reviews.findByProduct(params.id);

  return (
    <div>
      <ProductDetails product={product} />   {/* Server Component */}
      <ReviewList reviews={reviews} />        {/* Server Component */}
      <AddToCartButton productId={product.id} /> {/* Client Component */}
    </div>
  );
}

// Client Component -- only interactive parts ship JS
'use client';
function AddToCartButton({ productId }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => { addToCart(productId); setAdded(true); }}>
      {added ? 'Added' : 'Add to Cart'}
    </button>
  );
}
```

**Measured benefits:**
- Bundle size reduction: 40-60% for data-heavy pages
- LCP improvement: up to 67% (server renders closer to data source)
- TTI improvement: up to 63% (less JavaScript to parse and execute)

**When to use RSC:**
- Components that fetch and display data without interactivity
- Components using heavy libraries (markdown parsers, syntax highlighters, date formatters)
- Layout components, navigation, footers

**When to use Client Components:**
- Components with `useState`, `useEffect`, event handlers
- Components using browser APIs (localStorage, geolocation)
- Components requiring real-time updates

### 5.7 useTransition -- Non-blocking State Updates

Mark expensive updates as transitions so they do not block user input.

```jsx
// BEFORE: Filtering 50,000 items blocks input (~300ms per keystroke)
function SearchProducts({ products }) {
  const [query, setQuery] = useState('');
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ProductGrid products={filtered} />
    </>
  );
}

// AFTER: Input stays responsive, list updates in background
function SearchProducts({ products }) {
  const [query, setQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value);            // Urgent: update input immediately
    startTransition(() => {
      setDeferredQuery(e.target.value);  // Non-urgent: update list in background
    });
  };

  const filtered = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [products, deferredQuery]
  );

  return (
    <>
      <input value={query} onChange={handleChange} />
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        <ProductGrid products={filtered} />
      </div>
    </>
  );
}
// Measured improvement: Input latency drops from 300ms to <50ms
```

**Important caveat:** `useTransition` causes double re-renders. Only use it when the deferred work is genuinely expensive (> 100ms). Never use it for all state updates.

### 5.8 useDeferredValue -- Defer Expensive Derived Renders

```jsx
// AFTER: Defer the value itself rather than the update
function SearchProducts({ products }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const filtered = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [products, deferredQuery]
  );

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <ProductGrid products={filtered} />
      </div>
    </>
  );
}
```

**When to prefer `useDeferredValue` over `useTransition`:** When you do not control the state-setting code (e.g., value comes as a prop or from an external API).

### 5.9 State Colocation -- Move State Down

```jsx
// BEFORE: Search state at root re-renders entire dashboard
function Dashboard() {
  const [search, setSearch] = useState('');
  return (
    <div>
      <Header />
      <SearchBar value={search} onChange={setSearch} />
      <Charts /> {/* Expensive: 50ms render, re-renders on every keystroke */}
      <DataTable />
    </div>
  );
}

// AFTER: Search state colocated -- Charts never re-renders during typing
function Dashboard() {
  return (
    <div>
      <Header />
      <SearchSection /> {/* Contains its own search state */}
      <Charts />
      <DataTable />
    </div>
  );
}

function SearchSection() {
  const [search, setSearch] = useState('');
  return <SearchBar value={search} onChange={setSearch} />;
}
// Measured improvement: Eliminates 50ms Charts re-render on every keystroke
```

### 5.10 Streaming SSR with Suspense

```jsx
// Server component with streaming
async function ProductPage({ params }) {
  return (
    <div>
      <ProductHeader productId={params.id} />  {/* Streams immediately */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={params.id} />      {/* Streams when ready */}
      </Suspense>
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={params.id} /> {/* Streams when ready */}
      </Suspense>
    </div>
  );
}
```

**Measured improvement:** TTFB drops from 350-550ms to 40-90ms with progressive streaming architecture.

---

## 6. Anti-Patterns

### 6.1 Premature Memoization

**Anti-pattern:** Wrapping every component in `React.memo` and every value in `useMemo` "just in case."

**Why it hurts:** Memoization has overhead (~0.1ms per hook call). For cheap components (< 1ms render), the cost of comparing props can exceed the cost of re-rendering. React Compiler (v1.0, stable October 2025) makes manual memoization largely unnecessary by automatically adding it during compilation.

**Rule:** Profile first, memoize second. Only memoize components where the Profiler shows wasted renders > 2ms.

### 6.2 React.memo on Components That Always Receive New Props

**Anti-pattern:** Wrapping a component in `React.memo` while passing inline objects, arrays, or unstable callbacks as props.

```jsx
// USELESS: memo is defeated by new object every render
const Chart = React.memo(function Chart({ config }) { /* ... */ });
<Chart config={{ type: 'bar', animate: true }} /> // New object every render
```

**Fix:** Stabilize all props with `useMemo`/`useCallback` or extract constants.

### 6.3 Inline Object Props

**Anti-pattern:** `style={{ marginTop: 20 }}` or `options={{ verbose: true }}` in JSX creates a new reference every render.

**Impact:** Breaks `React.memo`, `useEffect` dependency comparisons, and `useMemo` memoization.

### 6.4 State in the Wrong Component

**Anti-pattern:** Lifting state higher than necessary "for convenience."

**Impact:** A search input state at the app root re-renders the entire component tree. Moving it to the search component eliminates re-renders in all sibling branches.

### 6.5 Overusing useEffect for Derived State

**Anti-pattern:** Using `useState` + `useEffect` to compute values from props or other state.

```jsx
// BAD: Extra render cycle, unnecessary complexity
function FullName({ firstName, lastName }) {
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);
  return <span>{fullName}</span>;
}

// GOOD: Compute during render -- no extra cycle
function FullName({ firstName, lastName }) {
  const fullName = `${firstName} ${lastName}`;
  return <span>{fullName}</span>;
}
```

**Impact:** Each `useEffect` that calls `setState` causes an additional render cycle. Three such patterns in a component tree = 3 extra renders after the initial one.

### 6.6 useEffect as Event Handler

**Anti-pattern:** Using `useEffect` to respond to user actions instead of handling them in event callbacks.

```jsx
// BAD: Effect runs after render, causes extra cycle
const [submitted, setSubmitted] = useState(false);
useEffect(() => {
  if (submitted) {
    sendAnalytics('form_submit');
    setSubmitted(false);
  }
}, [submitted]);

// GOOD: Handle in the event itself
const handleSubmit = () => {
  submitForm(data);
  sendAnalytics('form_submit');
};
```

### 6.7 Context for High-frequency State

**Anti-pattern:** Putting frequently changing values (mouse position, scroll offset, search query) in React Context.

**Impact:** Every context consumer re-renders on every context value change. A mouse position context with 30 consumers at 60 updates/second = 1,800 component re-renders per second.

**Fix:** Use Zustand, Jotai, or signals for high-frequency state. Zustand updates only components that subscribe to the specific slice of state that changed. Jotai uses atoms to provide fine-grained subscriptions, eliminating the cascading re-render problem entirely.

### 6.8 Unnecessary key Changes

**Anti-pattern:** Using `key={Math.random()}` or changing keys unnecessarily, forcing React to unmount and remount components instead of updating them.

**Impact:** Unmount + remount is 2-10x more expensive than an update, and destroys all internal state and DOM nodes.

### 6.9 Fetching Data in useEffect Without Cleanup

**Anti-pattern:** Firing async requests in `useEffect` without cancellation, leading to race conditions and state updates on unmounted components.

```jsx
// BAD: Race condition if query changes rapidly
useEffect(() => {
  fetch(`/api/search?q=${query}`)
    .then(res => res.json())
    .then(data => setResults(data));
}, [query]);

// GOOD: Abort previous request
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setResults(data))
    .catch(err => { if (err.name !== 'AbortError') throw err; });
  return () => controller.abort();
}, [query]);
```

### 6.10 Over-splitting Components

**Anti-pattern:** Creating dozens of tiny components for "separation of concerns" when they are always rendered together and never independently memoized.

**Impact:** Each component boundary adds function call overhead and reconciliation work. 50 trivial wrapper components add ~5ms of overhead that provides no optimization benefit.

### 6.11 Synchronous Imports of Heavy Libraries

**Anti-pattern:** `import moment from 'moment'` at the top of a component file that is only sometimes needed.

**Fix:** Dynamic import: `const moment = await import('moment')` or replace with lighter alternatives (date-fns: 2-3 KB per function vs. moment: 67 KB gzipped).

### 6.12 Not Using Production Builds

**Anti-pattern:** Running development builds in production. React's development mode includes extra warnings, checks, and the Profiler that add 2-5x overhead.

**Detection:** React DevTools shows a red icon for development builds. Lighthouse flags this as "Reduce unused JavaScript."

---

## 7. Architecture-Level Decisions

### RSC vs. Client Components Strategy

The default should be Server Components (in Next.js App Router, Remix). Add `'use client'` only when a component needs interactivity, browser APIs, or React hooks that use state/effects.

**Decision matrix:**

| Characteristic | Server Component | Client Component |
|---|---|---|
| Fetches data | Direct DB/API access, zero waterfall | Client-side fetch, potential waterfall |
| Uses state/effects | No | Yes |
| Uses browser APIs | No | Yes |
| Bundle impact | Zero JS shipped | Full component JS shipped |
| Interactivity | None (static HTML) | Full (event handlers, animations) |
| Rendering location | Server only | Server (SSR) + Client (hydration) |

**Real-world rule:** In a typical e-commerce page, 70-80% of components can be Server Components (product details, descriptions, reviews, breadcrumbs, footer). Only cart buttons, search inputs, and interactive filters need to be Client Components.

### State Management Performance Impact

| Library | Bundle Size (gzipped) | Re-render Behavior | Best For |
|---|---|---|---|
| React Context | 0 KB (built-in) | All consumers re-render on any change | Theme, locale, auth (infrequent changes) |
| Zustand | ~1.5 KB | Only subscribed components re-render | General state, medium complexity |
| Jotai | ~3.5 KB | Atom-level subscriptions, minimal re-renders | Complex interdependent state |
| Redux Toolkit | ~11 KB | Selector-based, components re-render on selected slice change | Large apps, complex middleware needs |
| Recoil | ~22 KB | Atom-level subscriptions | (Deprecated, migrate to Jotai) |

**Performance recommendation:** For apps with > 20 components sharing state, Zustand or Jotai provide 4-10x fewer re-renders compared to Context. Context is appropriate only for values that change infrequently (theme, locale, authentication status).

### Islands Architecture

Render most of the page as static HTML on the server. Hydrate only interactive "islands" independently.

**Frameworks:** Astro (React islands), Next.js (partial hydration with Server Components).

**Measured benefit:** Pages with 80% static content see 60-70% reduction in client-side JavaScript and 40-50% improvement in TTI compared to full-page hydration.

### Streaming SSR Architecture

Instead of waiting for the entire page to render on the server, stream HTML progressively as data becomes available.

**Key numbers:**
- Traditional SSR TTFB: 350-550ms (must wait for all data)
- Streaming SSR TTFB: 40-90ms (streams shell immediately)
- Progressive hydration with Suspense boundaries enables selective hydration of the most critical interactive elements first

---

## 8. React Compiler (v1.0)

Released stable in October 2025, the React Compiler automatically adds memoization during build time, eliminating most manual `useMemo`, `useCallback`, and `React.memo` calls.

**Production benchmarks (Meta Quest Store):**
- Initial loads and cross-page navigations: up to 12% faster
- Certain interactions: more than 2.5x faster
- Memory usage: neutral (no increase despite added memoization)

**Typical results by app optimization state:**

| Starting Point | Re-render Reduction | Interaction Latency Improvement |
|---|---|---|
| No manual optimization | 50-80% | 40-60% |
| Some optimization | 30-60% | 20-40% |
| Already well-optimized | 10-20% | 5-15% |

**Bundle impact:** Before Compiler: 250 KB (with memoization boilerplate) -> After Compiler: 180 KB (28% reduction in one reported case). Render times dropped from 8ms to 3ms average in early adopter reports.

**Adoption recommendation:** Enable the React Compiler for new projects. For existing projects, add incrementally using the `eslint-plugin-react-compiler` to identify code that violates the Rules of React (which the compiler requires).

---

## 9. Testing & Regression Prevention

### React Profiler in CI

Use the programmatic `<Profiler>` API to capture render durations in automated tests and fail builds that exceed thresholds.

```javascript
// jest test using React Testing Library + Profiler
import { Profiler } from 'react';
import { render } from '@testing-library/react';

test('Dashboard renders within budget', () => {
  let renderTime;
  const onRender = (id, phase, actualDuration) => {
    renderTime = actualDuration;
  };

  render(
    <Profiler id="Dashboard" onRender={onRender}>
      <Dashboard data={testData} />
    </Profiler>
  );

  expect(renderTime).toBeLessThan(16); // Must render within one frame
});
```

### Bundle Size Monitoring

**Tools:**
- `@next/bundle-analyzer` -- visualize Next.js bundle composition
- `source-map-explorer` -- analyze bundle for any React app
- `bundlesize` npm package -- fail CI if bundle exceeds budget

```json
// package.json -- bundlesize configuration
{
  "bundlesize": [
    { "path": "build/static/js/main.*.js", "maxSize": "150 kB" },
    { "path": "build/static/js/vendor.*.js", "maxSize": "80 kB" },
    { "path": "build/static/css/main.*.css", "maxSize": "20 kB" }
  ]
}
```

### Lighthouse CI

Automate Lighthouse audits on every commit to prevent performance regressions.

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start",
      "url": ["http://localhost:3000", "http://localhost:3000/dashboard"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

### Performance Regression Checklist

- [ ] Run `npx react-scan` or React DevTools Profiler on all changed views
- [ ] Verify no new components render > 16ms
- [ ] Check bundle size delta with `source-map-explorer` or `@next/bundle-analyzer`
- [ ] Run Lighthouse CI with performance score assertion >= 90
- [ ] Verify no new unnecessary re-renders with why-did-you-render
- [ ] Check that new Context providers do not trigger cascading re-renders
- [ ] Validate new lists with > 100 items use virtualization

---

## 10. Decision Trees

### "My React App Is Slow" Diagnostic Flowchart

```
START: App feels slow
  |
  +--> Is it slow on INITIAL LOAD?
  |     |
  |     +--> YES: Check bundle size
  |     |     |
  |     |     +--> Bundle > 200 KB gzipped?
  |     |     |     +--> Add code splitting with React.lazy at route boundaries
  |     |     |     +--> Tree-shake imports (lodash/debounce, not lodash)
  |     |     |     +--> Analyze with source-map-explorer for large dependencies
  |     |     |
  |     |     +--> Bundle is reasonable?
  |     |           +--> Check SSR/hydration
  |     |           |     +--> Use streaming SSR with Suspense boundaries
  |     |           |     +--> Convert data-only components to Server Components
  |     |           |     +--> Implement selective/progressive hydration
  |     |           |
  |     |           +--> Check network waterfall
  |     |                 +--> Preload critical resources
  |     |                 +--> Colocate data fetching in Server Components
  |     |
  |     +--> NO: Check INTERACTION performance
  |           |
  |           +--> Open React DevTools Profiler, record the slow interaction
  |           |
  |           +--> Are many components re-rendering unnecessarily?
  |           |     +--> YES: Move state closer to where it is used
  |           |     |       +--> Add React.memo to expensive pure components
  |           |     |       +--> Stabilize callbacks with useCallback
  |           |     |       +--> Replace Context with Zustand/Jotai for frequent updates
  |           |     |
  |           |     +--> NO: Are individual components slow?
  |           |           +--> YES: Profile the component
  |           |           |     +--> Expensive computation? -> useMemo
  |           |           |     +--> Long list? -> Virtualize with react-window
  |           |           |     +--> Heavy sync work? -> useTransition
  |           |           |
  |           |           +--> NO: Check for layout thrashing or forced reflows
  |           |                 +--> Batch DOM reads, then batch DOM writes
  |           |                 +--> Use CSS containment on isolated sections
  |
  +--> Is it slow during SCROLLING?
        |
        +--> Long list without virtualization? -> Add react-window or @tanstack/react-virtual
        +--> Heavy components in scroll view? -> Simplify or lazy-render off-screen items
        +--> Layout recalculation on scroll? -> Use CSS will-change, contain, transform
```

### "Should I Use useMemo?" Decision Tree

```
Do you have a value computed from props/state?
  |
  +--> Is the computation measurably expensive (> 2ms in Profiler)?
  |     |
  |     +--> YES: Use useMemo.
  |     +--> NO: Is the result passed as a prop to a React.memo child?
  |           |
  |           +--> YES: Is it an object/array (not a primitive)?
  |           |     +--> YES: Use useMemo (referential equality matters).
  |           |     +--> NO: Skip useMemo (primitives compare by value).
  |           |
  |           +--> NO: Is the result used as a useEffect dependency?
  |                 |
  |                 +--> YES: Is it an object/array?
  |                 |     +--> YES: Use useMemo to prevent infinite loops.
  |                 |     +--> NO: Skip useMemo.
  |                 |
  |                 +--> NO: Skip useMemo. The overhead is not worth it.
  |
  +--> Are you using React Compiler (v1.0+)?
        +--> YES: Remove manual useMemo -- the compiler handles it automatically.
        +--> NO: Follow the decision tree above.
```

### "Should I Use React.memo?" Decision Tree

```
Does this component re-render frequently with the same props?
  |
  +--> YES: Does it take > 2ms to render (check React Profiler)?
  |     |
  |     +--> YES: Wrap in React.memo.
  |     |         Ensure all props are stable (no inline objects/functions).
  |     |         If passing callbacks, wrap them in useCallback.
  |     |
  |     +--> NO: Is it rendered in a list of 50+ items?
  |           +--> YES: Wrap in React.memo (aggregate savings matter).
  |           +--> NO: Probably skip. Profile to confirm.
  |
  +--> NO: Does it receive new props on almost every render?
        +--> YES: Do NOT use React.memo (comparison cost without savings).
        +--> NO: Consider using React.memo if the subtree is large.
```

---

## 11. Code Examples -- Before/After with Measurements

### Example 1: Context Splitting

```jsx
// BEFORE: Single context, all consumers re-render on any change
const AppContext = React.createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [cart, setCart] = useState([]);
  const [notifications, setNotifications] = useState([]);

  return (
    <AppContext.Provider value={{ user, theme, cart, notifications, setUser, setTheme, setCart, setNotifications }}>
      {children}
    </AppContext.Provider>
  );
}
// Problem: Adding to cart re-renders every component using theme, user, or notifications
// Measured: 847ms total re-render time for cart update (120 consumer components)

// AFTER: Split contexts by update frequency
const UserContext = React.createContext();
const ThemeContext = React.createContext();
const CartContext = React.createContext();

function AppProviders({ children }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
// Measured: Cart update re-renders only 8 cart consumers -- 23ms (96% reduction)
```

### Example 2: Debounced Search with Transition

```jsx
// BEFORE: Each keystroke filters 50,000 products synchronously
function ProductSearch({ products }) {
  const [query, setQuery] = useState('');
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ProductGrid products={filtered} />
    </>
  );
}
// Measured: 280ms input lag per keystroke, INP = 350ms

// AFTER: Immediate input response + deferred filtering
function ProductSearch({ products }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => products.filter(p =>
      p.name.toLowerCase().includes(deferredQuery.toLowerCase())
    ),
    [products, deferredQuery]
  );

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ProductGrid products={filtered} />
    </>
  );
}
// Measured: <16ms input response, list updates within 100ms, INP = 45ms
```

### Example 3: Dynamic Import for Heavy Component

```jsx
// BEFORE: Chart library loaded for all users (adds 180 KB to bundle)
import { AreaChart, BarChart, LineChart } from 'recharts';

function AnalyticsDashboard({ data, chartType }) {
  const Chart = chartType === 'bar' ? BarChart : chartType === 'line' ? LineChart : AreaChart;
  return <Chart data={data} />;
}
// Initial bundle: 420 KB gzipped, TTI: 4.8s

// AFTER: Chart library loaded only when analytics page is visited
const AnalyticsDashboard = React.lazy(() => import('./AnalyticsDashboard'));

function App() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AnalyticsDashboard data={data} chartType={chartType} />
    </Suspense>
  );
}
// Initial bundle: 240 KB gzipped (-43%), TTI: 2.6s (-46%)
```

### Example 4: Memoized List with Stable Callbacks

```jsx
// BEFORE: Every filter change re-renders all 500 rows (500 x 4ms = 2000ms)
function DataTable({ rows, onRowSelect }) {
  const [filter, setFilter] = useState('');
  const filtered = rows.filter(r => r.name.includes(filter));

  return (
    <table>
      {filtered.map(row => (
        <TableRow
          key={row.id}
          row={row}
          onSelect={() => onRowSelect(row.id)}  // New function every render
        />
      ))}
    </table>
  );
}

// AFTER: Only changed rows re-render (typically 0-5 rows = 0-20ms)
const MemoizedTableRow = React.memo(TableRow);

function DataTable({ rows, onRowSelect }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => rows.filter(r => r.name.includes(filter)),
    [rows, filter]
  );

  const handleSelect = useCallback(
    (id) => onRowSelect(id),
    [onRowSelect]
  );

  return (
    <table>
      {filtered.map(row => (
        <MemoizedTableRow
          key={row.id}
          row={row}
          onSelect={handleSelect}
        />
      ))}
    </table>
  );
}
// Measured: Filter interaction drops from 2000ms to <20ms (100x improvement)
```

### Example 5: Image Optimization with Next.js

```jsx
// BEFORE: Unoptimized images (2.4 MB total, LCP: 4.1s)
function ProductGallery({ images }) {
  return (
    <div>
      {images.map(img => (
        <img key={img.id} src={img.url} />
      ))}
    </div>
  );
}

// AFTER: Optimized with lazy loading, sizing, and modern formats (320 KB total, LCP: 1.8s)
import Image from 'next/image';

function ProductGallery({ images }) {
  return (
    <div>
      {images.map((img, index) => (
        <Image
          key={img.id}
          src={img.url}
          width={400}
          height={300}
          alt={img.alt}
          loading={index === 0 ? 'eager' : 'lazy'}
          sizes="(max-width: 768px) 100vw, 400px"
          placeholder="blur"
          blurDataURL={img.blurHash}
        />
      ))}
    </div>
  );
}
// Measured: Page weight from 2.4 MB to 320 KB (-87%), LCP from 4.1s to 1.8s (-56%)
```

### Example 6: Replacing Context with Zustand

```jsx
// BEFORE: Context causes 120 re-renders on cart update
const CartContext = React.createContext();

function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const addItem = (item) => setItems(prev => [...prev, item]);
  const total = items.reduce((sum, i) => sum + i.price, 0);
  return (
    <CartContext.Provider value={{ items, addItem, total }}>
      {children}
    </CartContext.Provider>
  );
}
// Every component using CartContext re-renders when items change

// AFTER: Only cart-display components re-render
import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  addItem: (item) => set(state => ({ items: [...state.items, item] })),
  total: () => get().items.reduce((sum, i) => sum + i.price, 0),
}));

// In components -- subscribe to only what you need
function CartCount() {
  const count = useCartStore(state => state.items.length); // Only re-renders when count changes
  return <span>{count}</span>;
}

function CartTotal() {
  const total = useCartStore(state => state.total()); // Only re-renders when total changes
  return <span>${total}</span>;
}
// Measured: Cart update re-renders drop from 120 components to 3 components (96% reduction)
```

### Example 7: Server Component Data Fetching

```jsx
// BEFORE: Client-side data fetching with loading states (TTI: 3.8s)
'use client';
function BlogPost({ postId }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${postId}`).then(r => r.json()),
      fetch(`/api/posts/${postId}/comments`).then(r => r.json()),
    ]).then(([postData, commentsData]) => {
      setPost(postData);
      setComments(commentsData);
      setLoading(false);
    });
  }, [postId]);

  if (loading) return <Skeleton />;
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      <CommentList comments={comments} />
    </article>
  );
}

// AFTER: Server Component with zero client JS for data display (TTI: 1.2s)
async function BlogPost({ postId }) {
  const [post, comments] = await Promise.all([
    db.posts.findById(postId),
    db.comments.findByPostId(postId),
  ]);

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentList comments={comments} />
      </Suspense>
      <AddCommentForm postId={postId} /> {/* 'use client' component */}
    </article>
  );
}
// Measured: JS bundle for page: -55%, TTI from 3.8s to 1.2s (-68%)
```

### Example 8: Virtualized Data Grid

```jsx
// BEFORE: Renders 5,000 rows with 10 columns = 50,000 cells (~4.5s initial render)
function DataGrid({ data, columns }) {
  return (
    <table>
      <thead>
        <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            {columns.map(col => <td key={col.key}>{row[col.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// AFTER: Only visible rows rendered (~25ms initial render)
import { useVirtualizer } from '@tanstack/react-virtual';

function DataGrid({ data, columns }) {
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <table>
        <thead>
          <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = data[virtualRow.index];
            return (
              <tr
                key={row.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {columns.map(col => <td key={col.key}>{row[col.key]}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
// Measured: Initial render from 4500ms to 25ms (180x faster), DOM nodes from 50,000 to ~300
```

---

## 12. Quick Reference

| Problem | Solution | Expected Improvement |
|---|---|---|
| Slow initial load | Code split with React.lazy at routes | 40-60% bundle reduction |
| Unnecessary child re-renders | React.memo + useCallback for callbacks | 90-99% fewer re-renders in lists |
| Expensive computation each render | useMemo with proper deps | Avoid 5-15ms per wasted render |
| Long list (1,000+ items) | Virtualize with react-window or @tanstack/react-virtual | 100-200x faster render |
| Input lag during filtering | useTransition or useDeferredValue | Input latency < 50ms |
| Context causing mass re-renders | Split contexts or switch to Zustand/Jotai | 90-96% fewer re-renders |
| Large data-display pages | React Server Components | 40-60% less client JS |
| Slow SSR TTFB | Streaming SSR with Suspense | TTFB from 350-550ms to 40-90ms |
| Heavy hydration blocking TTI | Selective/progressive hydration | 40-45% TTI improvement |
| Manual memo boilerplate | React Compiler (v1.0) | Automatic, 12% faster loads |
| Large images hurting LCP | next/image with lazy loading + sizing | 50-87% page weight reduction |
| Unoptimized bundle composition | Tree-shaking + import analysis | 20-50 KB per library saved |
| useEffect cascading state updates | Derive values during render | Eliminate 1-3 extra render cycles |
| Layout thrashing | Batch DOM reads then writes | 10-40x faster DOM operations |
| Third-party script bloat | Defer/async loading, budget < 50 KB | Unblock main thread during load |

---

## Sources

- [React Performance Optimization: 15 Best Practices for 2025](https://dev.to/alex_bobes/react-performance-optimization-15-best-practices-for-2025-17l9)
- [Understanding useMemo and useCallback -- Josh W. Comeau](https://www.joshwcomeau.com/react/usememo-and-usecallback/)
- [When to useMemo and useCallback -- Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)
- [React Server Components: Do They Really Improve Performance? -- Nadia Makarevich](https://www.developerway.com/posts/react-server-components-performance)
- [The Hidden Performance Costs of React Server Components](https://dev.to/rbobr/the-hidden-performance-costs-of-react-server-components-248f)
- [React useTransition: Performance Game Changer or...?](https://www.developerway.com/posts/use-transition)
- [React Concurrency, Explained -- 3perf](https://3perf.com/talks/react-concurrency/)
- [How React 18 Improves Application Performance -- Vercel](https://vercel.com/blog/how-react-18-improves-application-performance)
- [Virtualize Large Lists with react-window -- web.dev](https://web.dev/virtualize-long-lists-react-window/)
- [React Compiler v1.0 -- React Blog](https://react.dev/blog/2025/10/07/react-compiler-1)
- [React Compiler Deep Dive: Automatic Memoization](https://dev.to/pockit_tools/react-compiler-deep-dive-how-automatic-memoization-eliminates-90-of-performance-optimization-work-1351)
- [40% Faster Interaction: How Wix Solved React's Hydration Problem](https://www.wix.engineering/post/40-faster-interaction-how-wix-solved-react-s-hydration-problem-with-selective-hydration-and-suspen)
- [How to Measure and Monitor React Render Performance -- 3perf](https://3perf.com/blog/react-monitoring/)
- [You Might Not Need an Effect -- React Docs](https://react.dev/learn/you-might-not-need-an-effect)
- [React Server Components Streaming Performance Guide 2026](https://www.sitepoint.com/react-server-components-streaming-performance-2026/)
- [Lighthouse CI -- GoogleChrome](https://github.com/GoogleChrome/lighthouse-ci)
- [Debugging React Performance Issues with Why Did You Render -- LogRocket](https://blog.logrocket.com/debugging-react-performance-issues-with-why-did-you-render/)
- [Fixing useContext Performance Issues](https://dev.to/jherr/fixing-usecontext-performance-issues-60h)
- [Introducing React Best Practices -- Vercel](https://vercel.com/blog/introducing-react-best-practices)
- [Optimizing Bundle Sizes in React Applications -- Coditation](https://www.coditation.com/blog/optimizing-bundle-sizes-in-react-applications-a-deep-dive-into-code-splitting-and-lazy-loading)
