# SPA Anti-Patterns

> **Domain:** Frontend
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

Single Page Applications promised desktop-class responsiveness in the browser. Delivered carelessly, they produce the opposite: bloated bundles, broken navigation, invisible content, inaccessible transitions, and memory that grows until the tab crashes. The core tension is that SPAs must reimplement behaviors the browser provides for free -- history, scroll restoration, focus management, resource loading, error pages -- and every reimplementation is a surface for failure.

This module catalogs the 20 most damaging SPA anti-patterns drawn from production incidents, framework issue trackers, and empirical research across 500+ repositories. Each entry is classified by frequency, severity, and detection difficulty.

---

## Anti-Pattern Entries

---

### AP-01: SPA for Content / SEO-Dependent Sites

**Also known as:** Hammer looking for a nail, SPA-everything, client-render-all
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

A marketing site, blog, or e-commerce catalog is built as a pure client-rendered SPA. The server delivers a near-empty HTML shell with a single `<div id="root"></div>` and a large JavaScript bundle. Search engine crawlers see no content.

```html
<!-- What Googlebot receives -->
<!DOCTYPE html>
<html>
<head><title>My Store</title></head>
<body>
  <div id="root"></div>
  <script src="/bundle.js" defer></script>  <!-- 1.8 MB -->
</body>
</html>
```

**Why developers do it:**

The team knows React/Vue/Angular and applies it uniformly. SPA frameworks are the default starting point in tutorials and bootcamps, and nobody asks "does this page need client-side rendering?" before scaffolding. Management sees a competitor's interactive dashboard and wants the same technology for their content site.

**What goes wrong:**

Google can render JavaScript but queues it in a "second wave" of indexing that can take days to weeks. Other search engines (Bing, Baidu, Yandex) have limited or no JS rendering. A pure SPA serving an empty shell can see zero pages indexed for weeks after launch. Even when eventually indexed, Core Web Vitals suffer: Largest Contentful Paint balloons to 4-8 seconds on mobile, causing ranking penalties. Social media link previews (Open Graph, Twitter Cards) show blank content because preview crawlers never execute JavaScript.

**The fix:**

Use SSR, SSG, or a hybrid framework (Next.js, Nuxt, SvelteKit, Remix) for content-heavy pages. Reserve pure client-side SPA architecture for authenticated dashboard-style applications where SEO is irrelevant.

```
Content/SEO pages  -->  SSR or SSG (server-rendered HTML)
Authenticated app  -->  SPA with client-side rendering (fine)
Hybrid             -->  Framework with per-route rendering strategy
```

**Detection rule:**

Flag any project where `robots.txt` allows crawling but the index HTML contains fewer than 50 characters of visible text content outside of `<script>` tags.

---

### AP-02: No Code Splitting

**Also known as:** Monolithic bundle, one-big-chunk, webpack-ball
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

The entire application -- every route, every feature, every library -- is compiled into a single JavaScript bundle. Users downloading the login page also download the admin dashboard, the report generator, and the PDF viewer.

```javascript
// webpack.config.js -- no dynamic imports, no splitChunks
module.exports = {
  entry: './src/index.js',
  output: { filename: 'bundle.js' }
  // splitChunks: absent
};
```

**Why developers do it:**

Code splitting adds configuration complexity. Dynamic `import()` introduces asynchronous boundaries that complicate component loading. Teams with small apps never notice the problem until the bundle silently crosses 1 MB, then 2 MB, then 5 MB.

**What goes wrong:**

Research from Google shows that 53% of mobile users abandon sites that take longer than 3 seconds to load. A 2 MB JavaScript bundle takes approximately 6 seconds to download on a 3G connection and another 2-4 seconds to parse and execute. Every user pays the cost for every feature, even features they will never use in that session. Cache invalidation becomes all-or-nothing: any code change busts the entire bundle cache.

**The fix:**

```javascript
// Route-based code splitting with React.lazy
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings  = React.lazy(() => import('./pages/Settings'));
const Reports   = React.lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/reports"   element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

Configure `splitChunks` for vendor separation. Use `webpack-bundle-analyzer` or `source-map-explorer` to visualize what ships.

**Detection rule:**

Flag when a single JS bundle exceeds 250 KB gzipped, or when `import()` / `React.lazy` / `defineAsyncComponent` appear zero times in a project with more than 5 routes.

---

### AP-03: Loading All Routes Upfront

**Also known as:** Eager route loading, route pre-registration bloat
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

All route components are statically imported at the top of the router file, forcing the bundler to include every route in the initial chunk even when code splitting is nominally configured elsewhere.

```javascript
// All routes eagerly imported -- defeats code splitting
import Home       from './pages/Home';
import Dashboard  from './pages/Dashboard';
import Analytics  from './pages/Analytics';
import Admin      from './pages/Admin';
import UserProfile from './pages/UserProfile';
import Settings   from './pages/Settings';
// ... 20 more imports

const routes = [
  { path: '/', component: Home },
  { path: '/dashboard', component: Dashboard },
  // ...
];
```

**Why developers do it:**

Static imports are simpler and avoid the async boundary complexity of lazy loading. IDE autocomplete and type checking work better with static imports. Developers copy route configuration patterns from tutorials that use small demo apps where the distinction is irrelevant.

**What goes wrong:**

Initial load includes JavaScript for every route in the application. An admin panel that 2% of users ever visit adds its weight to every single page load. As the application grows, initial Time to Interactive regresses linearly with route count. Build analysis shows all page code in a single chunk despite having a router.

**The fix:**

```javascript
// Vue Router with lazy loading
const routes = [
  { path: '/',          component: () => import('./pages/Home.vue') },
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue') },
  { path: '/admin',     component: () => import('./pages/Admin.vue') },
];

// Angular with loadChildren
const routes: Routes = [
  { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }
];
```

**Detection rule:**

In the router configuration file, count static `import` statements for page/view components. Flag if more than 3 route components are statically imported.

---

### AP-04: No Server Fallback Routing

**Also known as:** 404 on refresh, direct-link death, missing catch-all
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

A user navigates to `/dashboard/settings` within the SPA, bookmarks it, and later opens the bookmark directly. The server returns a 404 because no physical file exists at that path. The SPA router never gets a chance to handle it.

```
User requests: GET /dashboard/settings
Server looks for: /dashboard/settings/index.html  --> does not exist
Server returns: 404 Not Found
```

**Why developers do it:**

Development servers (Vite, webpack-dev-server) automatically fall back to `index.html` for all routes, masking the problem entirely. Developers never encounter it until the first production deployment, and sometimes not until a user reports it.

**What goes wrong:**

Every deep link, bookmark, and shared URL returns a 404 in production. Browser refresh on any non-root route fails. Search engine crawlers get 404s for every interior URL they discover. The application appears to work perfectly in development and breaks immediately in production.

**The fix:**

Configure the server to serve `index.html` for all routes that do not match a static asset:

```nginx
# Nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

```apache
# Apache .htaccess
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

```javascript
// Express
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
```

**Detection rule:**

After deployment, request any known SPA route directly via `curl`. Flag if the HTTP status code is anything other than 200.

---

### AP-05: SPA Memory Leaks

**Also known as:** Heap creep, tab-killer, navigation leak
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

Memory usage grows with every route navigation and never reclaims. After 20-30 navigations, the browser tab becomes sluggish. After 100+, it crashes. A study across 500 repositories found 22,384 instances of `setTimeout` inside component code without a corresponding `clearTimeout` on unmount, and 10,616 instances of `addEventListener` without `removeEventListener`.

```javascript
// React component that leaks on every mount
function LiveDashboard() {
  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/stream');
    const interval = setInterval(fetchMetrics, 5000);
    window.addEventListener('resize', handleResize);

    // NO cleanup function returned -- all three leak on unmount
  }, []);
}
```

**Why developers do it:**

The component works perfectly on first render. Developers test by loading the page once, verifying it works, and moving on. Memory leaks are invisible until cumulative, and most testing workflows never navigate back and forth enough to trigger symptoms. The cleanup return in `useEffect` feels optional because omitting it produces no error or warning.

**What goes wrong:**

Each route change mounts and unmounts components. Without cleanup, every mount adds event listeners, timers, WebSocket connections, and closure-captured DOM references that persist after unmount. Facebook's engineering team built MemLab specifically to detect this pattern after finding it pervasive in their own SPA. Heap grows linearly with user navigation. In long-lived sessions (dashboards, internal tools), this degrades to tab crashes within hours.

**The fix:**

```javascript
function LiveDashboard() {
  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/stream');
    const interval = setInterval(fetchMetrics, 5000);
    window.addEventListener('resize', handleResize);

    return () => {  // Cleanup: runs on unmount
      ws.close();
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}
```

Use Chrome DevTools Memory tab to take heap snapshots before and after navigation cycles. Automate with MemLab for CI.

**Detection rule:**

In component lifecycle code, flag every `addEventListener`, `setInterval`, `setTimeout`, `new WebSocket`, `new EventSource`, or `.subscribe()` that lacks a corresponding cleanup in the same scope. ESLint rule: `react-hooks/exhaustive-deps` catches some cases; custom rules or MemLab catch the rest.

---

### AP-06: Breaking the Back Button

**Also known as:** History hijacking, navigation trap, phantom history entries
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

The user clicks the browser back button and nothing happens -- or worse, the app navigates to an unexpected state. Common variants: modals that push history entries (back closes modal instead of navigating), multi-step wizards that do not push entries (back skips multiple steps), and `history.replaceState` used where `pushState` is appropriate.

```javascript
// Modal pushes a history entry -- back button closes modal instead of navigating
function openModal() {
  setModalOpen(true);
  window.history.pushState({ modal: true }, '');  // Pollutes history
}

// Wizard steps don't push entries -- back button skips entire wizard
function goToStep(n) {
  setCurrentStep(n);  // No history.pushState -- browser knows nothing about steps
}
```

**Why developers do it:**

The History API is subtle. `pushState` vs. `replaceState`, when to add entries, what constitutes a "navigation" vs. a "state change" -- these are UX design decisions that often fall to developers with no UX guidance. Mobile web adds complexity because the back button is a hardware/OS control that users reach for reflexively.

**What goes wrong:**

Users become trapped in modal loops, unable to navigate backward. Or they lose multi-step form progress because back skips past the wizard entirely. On mobile, where the back button is the primary navigation affordance, broken back-button behavior drives 15-20% higher bounce rates according to UX research by the Baymard Institute.

**The fix:**

Establish a clear policy: any state change that the user perceives as "I went somewhere" should push a history entry. Modal opens and tab switches generally should not. Multi-step flows should push one entry per meaningful step.

```javascript
// Wizard: push state for each step
function goToStep(n) {
  setCurrentStep(n);
  window.history.pushState({ step: n }, '', `?step=${n}`);
}

window.addEventListener('popstate', (e) => {
  if (e.state?.step != null) setCurrentStep(e.state.step);
});
```

**Detection rule:**

Audit all calls to `pushState` and `replaceState`. Flag modals and dialogs that call `pushState`. Flag multi-step flows that never call `pushState`.

---

### AP-07: Deep Linking Failures

**Also known as:** State-not-in-URL, un-shareable state, ephemeral views
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Application state that a user would want to share or bookmark is stored only in component state or a global store, not reflected in the URL. Filters, search queries, pagination, tab selections, and modal contents are invisible to the URL bar.

```javascript
// Filters exist only in React state -- URL is always just /products
function ProductList() {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('price-asc');
  const [page, setPage] = useState(1);
  // URL never changes: always /products
  // Sharing the link shares the default state, not the user's view
}
```

**Why developers do it:**

URL synchronization adds complexity: encoding/decoding query params, handling invalid values, maintaining two-way binding between URL and state. Component state is simpler and faster to implement. The developer tests by clicking through the UI and never tries sharing a link.

**What goes wrong:**

Users cannot share filtered views with colleagues. Bookmarking captures only the base URL. Browser refresh loses all applied filters, selections, and pagination. Customer support cannot reproduce user-reported issues because the state cannot be communicated via URL. Analytics cannot distinguish between different filtered views.

**The fix:**

```javascript
// Sync meaningful UI state to URL search params
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const sort     = searchParams.get('sort') || 'price-asc';
  const page     = Number(searchParams.get('page')) || 1;

  function updateFilters(updates) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => next.set(k, v));
      return next;
    });
  }
}
// URL: /products?category=shoes&sort=price-asc&page=3  -- shareable, bookmarkable
```

**Detection rule:**

Identify filter/search/pagination state in components. Flag when this state uses `useState` or a store but no corresponding URL parameter synchronization exists.

---

### AP-08: No Scroll Position Preservation

**Also known as:** Scroll amnesia, scroll-to-top-on-back, lost position
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

A user scrolls down a long list, clicks an item to view details, then presses back. Instead of returning to their scroll position in the list, the page resets to the top. The user must scroll through the entire list again to find where they were.

**Why developers do it:**

Multi-page websites get scroll restoration from the browser for free via the `bfcache`. SPAs bypass this mechanism entirely by using `history.pushState` for navigation. The browser does not know the page "changed" in a way that warrants scroll storage. Most SPA routers default to scroll-to-top on navigation (which is correct for forward navigation) but do not differentiate between forward and back navigation.

**What goes wrong:**

Users on long lists (search results, feeds, catalogs) lose their place on every back navigation. This is especially punishing on mobile where scrolling is the primary interaction. Users learn to open links in new tabs as a workaround, defeating the SPA's navigation model entirely. Next.js had a long-standing issue (#3303) about scroll restoration firing before content rendered, causing incorrect positions.

**The fix:**

```javascript
// Manual scroll restoration
const scrollPositions = useRef({});

useEffect(() => {
  // Save scroll position before leaving
  const saveScroll = () => {
    scrollPositions.current[location.key] = window.scrollY;
  };
  window.addEventListener('beforeunload', saveScroll);

  // Restore on popstate (back/forward)
  const restoreScroll = () => {
    const saved = scrollPositions.current[location.key];
    if (saved != null) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    }
  };

  return () => window.removeEventListener('beforeunload', saveScroll);
}, [location.key]);

// Or use router-level support:
// React Router: <ScrollRestoration />
// Vue Router: scrollBehavior option
// Next.js: experimental.scrollRestoration: true
```

**Detection rule:**

Navigate to a scrollable list, scroll down, click a detail link, press back. If scroll position resets to top, the anti-pattern is present.

---

### AP-09: Client-Side Overload

**Also known as:** Browser-as-server, client-does-everything, fat client
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Business logic that belongs on the server -- data aggregation, complex filtering, sorting large datasets, PDF generation, image processing -- runs in the browser. The client fetches raw data and processes it locally.

```javascript
// Fetching ALL products to filter and sort on the client
async function getFilteredProducts(category, sortBy) {
  const response = await fetch('/api/products');     // Returns 50,000 products
  const allProducts = await response.json();         // 12 MB JSON payload
  const filtered = allProducts.filter(p => p.category === category);
  const sorted   = filtered.sort((a, b) => a[sortBy] - b[sortBy]);
  return sorted.slice(0, 20);                        // User sees 20 items
}
```

**Why developers do it:**

It is faster to write a client-side filter than to add a query parameter to an API endpoint. In early development, datasets are small and everything is fast. The API might be owned by another team with a long lead time for changes.

**What goes wrong:**

Mobile devices with limited memory and CPU struggle with large datasets. A 12 MB JSON response on 3G takes 40+ seconds to download. Parsing and processing blocks the main thread, freezing the UI. Battery drain accelerates. Users on lower-end devices experience crashes. The server sends far more data than needed, wasting bandwidth and increasing costs.

**The fix:**

Move filtering, sorting, and pagination to the server. The client sends parameters; the server returns only the matching page.

```javascript
async function getFilteredProducts(category, sortBy, page = 1) {
  const params = new URLSearchParams({ category, sortBy, page, limit: 20 });
  const response = await fetch(`/api/products?${params}`);
  return response.json();  // Returns only the 20 items needed
}
```

**Detection rule:**

Flag API calls that return collections without pagination parameters. Flag client-side `.filter()` or `.sort()` on arrays that originate from API responses and exceed 100 items.

---

### AP-10: Not Using SSR When You Should

**Also known as:** CSR-only, missing server render, blank-page-until-JS
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Pages that need to be fast, crawlable, or accessible on slow devices are rendered entirely on the client. The user sees a blank white screen (or a spinner) until the JavaScript bundle downloads, parses, and executes.

**Why developers do it:**

SSR adds architectural complexity: server runtime, hydration mismatches, state serialization, deployment constraints. Pure client-side rendering is simpler to deploy (static file hosting). Teams that started with Create React App or vanilla Vite setups have no SSR infrastructure and adding it later is a significant migration.

**What goes wrong:**

First Contentful Paint on a CSR-only page is gated by bundle download + parse + execute. On a median mobile device over 4G, this can be 3-5 seconds of blank screen. Users on slow connections see nothing for 8-15 seconds. Search engines may not index content. Accessibility tools that rely on initial HTML structure find nothing to parse. Social media previews show blank cards.

**The fix:**

Adopt a framework with built-in SSR/SSG capabilities. Apply SSR selectively to routes that need it:

```
Public pages (landing, blog, product)  --> SSR or SSG
Authenticated dashboard                --> CSR (fine)
Marketing pages                        --> SSG with revalidation
```

Use streaming SSR (React 18 `renderToPipeableStream`, Nuxt `renderToStream`) to send HTML progressively and reduce Time to First Byte.

**Detection rule:**

Fetch any public-facing page with JavaScript disabled (`curl` or browser with JS off). If the page is blank or shows only a loading indicator, SSR is missing where it is likely needed.

---

### AP-11: Auth State Only in Memory

**Also known as:** Volatile auth, refresh-kills-session, RAM-only tokens
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Authentication tokens (JWT, session ID) are stored only in JavaScript variables or React/Vue state. A page refresh clears the token, logging the user out. Opening a new tab starts an unauthenticated session.

```javascript
// Token lives only in React state -- refresh kills it
function AuthProvider({ children }) {
  const [token, setToken] = useState(null);  // Gone on refresh

  async function login(credentials) {
    const { accessToken } = await api.login(credentials);
    setToken(accessToken);  // Stored in RAM only
  }
}
```

**Why developers do it:**

Storing tokens in memory is the simplest approach and avoids the security considerations of `localStorage` (XSS-accessible) and cookies (CSRF, configuration complexity). Blog posts warning about `localStorage` XSS risks push developers toward memory-only storage without explaining the UX consequences.

**What goes wrong:**

Every page refresh requires re-authentication. Opening the app in a new tab requires re-login. Users lose in-progress work when they accidentally refresh. Redirects during OAuth flows clear the token. If the token is also used for WebSocket connections, those break on any page lifecycle event.

**The fix:**

Use HTTP-only, Secure, SameSite cookies for session tokens (immune to XSS, persist across refreshes). For SPAs that must use JWTs, implement the Token Handler Pattern: a lightweight backend-for-frontend (BFF) proxy that stores tokens in secure cookies and relays them to APIs.

```javascript
// BFF pattern: cookie holds the session, BFF forwards to API
// Browser <-> BFF (cookie-based session) <-> API (Bearer token)

// If cookies are not possible, use sessionStorage as a middle ground:
function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));

  function login(credentials) {
    const { accessToken } = await api.login(credentials);
    sessionStorage.setItem('token', accessToken);
    setToken(accessToken);
  }
}
// sessionStorage: survives refresh, scoped to tab, cleared on tab close
```

**Detection rule:**

Search for auth token storage. Flag tokens stored only in `useState`, `useRef`, module-level variables, or Redux/Vuex/Pinia state without persistence to `sessionStorage`, `localStorage`, or cookies.

---

### AP-12: No Offline Handling

**Also known as:** Online-only SPA, network-or-nothing, airplane mode crash
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

The application makes no provision for network loss. API calls fail silently or show uncaught promise rejection errors. The UI freezes, shows a white screen, or displays cryptic error messages. Previously loaded content disappears.

```javascript
// No error handling, no offline detection, no caching
async function loadDashboard() {
  const data = await fetch('/api/dashboard');  // Throws on network failure
  return data.json();                          // Uncaught if fetch throws
}
```

**Why developers do it:**

Developers work on stable office/home networks and rarely test with network toggled off. Offline handling is seen as a progressive enhancement, not a baseline requirement. Service Worker configuration is complex and error-prone.

**What goes wrong:**

Mobile users lose connectivity constantly: elevators, tunnels, spotty cell coverage. A commuter using the app on a train sees the app break repeatedly. Form data entered during an offline moment is lost. Previously displayed content vanishes when a re-fetch fails, even though the data was already in memory. Users have no indication whether the app is offline or the server is down.

**The fix:**

```javascript
// 1. Detect network status and show indicator
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return isOnline;
}

// 2. Cache API responses (SWR, React Query, or Service Worker)
// 3. Queue mutations during offline (IndexedDB + background sync)
// 4. Show stale data with "offline" badge rather than blank screen
```

**Detection rule:**

Toggle network off in DevTools. If the application shows an unhandled error, blank screen, or loses previously displayed content, offline handling is absent.

---

### AP-13: Huge Initial Bundles

**Also known as:** Kitchen-sink bundle, dependency bloat, node_modules-in-browser
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

The application ships massive dependencies that dwarf the application code itself. `moment.js` (300 KB) imported for a single date format. `lodash` (70 KB) imported for one utility function. Full icon libraries imported for 5 icons. Multiple charting libraries included when one suffices.

```javascript
import moment from 'moment';         // 300 KB for format()
import _ from 'lodash';              // 70 KB for _.debounce
import * as Icons from 'heroicons';  // All 800 icons for 5 used
import Chart from 'chart.js/auto';   // Full Chart.js for one bar chart
```

**Why developers do it:**

Default imports are the simplest syntax. Tree-shakeable imports require knowing the library's module structure. Package.json dependencies accumulate over time as features are added but bundles are never audited. Nobody is assigned ownership of bundle size.

**What goes wrong:**

A study of production SPAs found that JavaScript bundles averaging 2 MB+ are common, with some exceeding 5 MB. On mobile 3G, each additional 100 KB of JavaScript adds roughly 350ms of load time. Parse and compile time on low-end devices is even worse: V8 on a budget Android phone processes JavaScript at roughly 1 MB/second. Users on emerging-market devices wait 5-10 seconds staring at a blank screen.

**The fix:**

```javascript
// Tree-shakeable imports
import { format } from 'date-fns';              // 2 KB vs 300 KB
import debounce from 'lodash/debounce';          // 1 KB vs 70 KB
import { ArrowLeft } from '@heroicons/react/24/outline';  // Single icon
import { Bar } from 'react-chartjs-2';           // Just bar chart

// Add bundle analysis to CI
// package.json
{
  "scripts": {
    "analyze": "webpack-bundle-analyzer dist/stats.json"
  },
  "bundlesize": [
    { "path": "dist/*.js", "maxSize": "250 kB" }
  ]
}
```

**Detection rule:**

Run `npx webpack-bundle-analyzer` or `npx source-map-explorer`. Flag any single dependency exceeding 50 KB gzipped, or total initial JS exceeding 250 KB gzipped.

---

### AP-14: No 404 / Error Route Handling

**Also known as:** Silent navigation failure, blank unknown routes, catch-all void
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

A user navigates to a URL that does not match any defined route. Instead of seeing a helpful 404 page, they see a blank screen, the home page (confusingly), or the app crashes.

```javascript
// No catch-all route
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/settings" element={<Settings />} />
  {/* /typo-in-url renders... nothing */}
</Routes>
```

**Why developers do it:**

404 pages are not part of feature specs. They are invisible during normal development because developers navigate via the UI, not by typing URLs. The router silently renders nothing for unmatched routes instead of throwing an error, so nobody notices.

**What goes wrong:**

Users who mistype a URL or follow a stale link see a blank screen with no guidance. They assume the app is broken. Search engine crawlers encountering dead internal links get no 404 signal, polluting the crawl budget. Support teams cannot distinguish between "page doesn't exist" and "app crashed" reports.

**The fix:**

```javascript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="*" element={<NotFound />} />  {/* Catch-all */}
</Routes>

function NotFound() {
  return (
    <div role="alert">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <a href="/">Return to home</a>
    </div>
  );
}
```

For SSR apps, also set the HTTP status code to 404 so crawlers handle it correctly.

**Detection rule:**

Search router configuration for a catch-all/wildcard route (`path="*"` or `path: '*'`). Flag if absent. Manually test by navigating to a random URL path.

---

### AP-15: Everything in Client-Side Global State

**Also known as:** Global state dumping ground, Redux-for-everything, store bloat
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Every piece of data -- server cache, form inputs, UI toggles, modal visibility, hover states -- lives in a global store (Redux, Vuex, MobX). The store has hundreds of keys. Every component connects to the store even for ephemeral local concerns.

```javascript
// Redux store shaped like this:
{
  user: { ... },
  products: { items: [...], loading: true },
  ui: {
    sidebarOpen: true,
    modalVisible: false,
    tooltipTarget: null,
    dropdownExpanded: 'nav-menu',
    hoverItem: 42,
    formDirty: true,
  },
  forms: {
    loginForm: { email: '', password: '' },
    searchQuery: 'shoes',
    checkoutStep: 2,
  }
}
```

**Why developers do it:**

Early Redux tutorials taught "put everything in the store." Teams establish the pattern with a few legitimate use cases and then extend it by inertia. Developers find it easier to `dispatch` than to lift state or use local state because the plumbing already exists.

**What goes wrong:**

Every state change triggers the entire subscription diffing machinery. Components re-render for state changes they do not care about. Debugging becomes difficult: a "why did this re-render?" investigation requires tracing through unrelated store slices. Boilerplate explodes: actions, reducers, selectors, and types for a boolean toggle. The store becomes a second database with its own stale-data problems.

**The fix:**

Apply the state placement hierarchy: local state first, then context, then global store as a last resort. Use server-cache libraries (TanStack Query, SWR, Apollo) for API data. Reserve the global store for genuinely cross-cutting concerns (auth, theme, feature flags).

```
Ephemeral UI state (hover, focus, toggle)  --> useState / local state
Form state                                  --> Form library or useState
Server data                                 --> TanStack Query / SWR
Cross-cutting app state                     --> Global store (Redux, Zustand)
```

**Detection rule:**

Count keys in the root state shape. Flag if more than 15 top-level keys exist, or if UI-only concerns (modal visibility, hover targets, dropdown states) appear in the global store.

---

### AP-16: No Prefetch or Preload

**Also known as:** Lazy-everything, fetch-on-render waterfall, no anticipation
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Every resource -- code chunks, data, images -- is fetched only when the user explicitly navigates. Hovering over a link does nothing. Idle time is wasted. Every navigation feels slow because the fetch starts at click time.

```javascript
// Navigation flow:
// 1. User clicks link              (0ms)
// 2. Route chunk download begins   (0ms)
// 3. Route chunk arrives           (800ms)
// 4. Component mounts, data fetch  (800ms)
// 5. Data arrives                  (1600ms)
// 6. Content renders               (1650ms)
// Total: 1650ms of staring at a spinner
```

**Why developers do it:**

Prefetching is seen as premature optimization. It adds complexity: which routes to prefetch, when to trigger it, how to avoid wasting bandwidth. Code splitting tutorials show lazy loading but rarely cover the complementary prefetch step.

**What goes wrong:**

Every navigation incurs the full serial waterfall: chunk download, then data fetch, then render. On slow connections, transitions feel sluggish. Users perceive the SPA as slower than a traditional multi-page site because the browser's built-in prefetch heuristics do not apply to client-side navigations.

**The fix:**

```javascript
// Prefetch route chunk on hover/focus
function NavLink({ to, children }) {
  const prefetch = () => {
    // Trigger dynamic import to preload the chunk
    if (to === '/dashboard') import('./pages/Dashboard');
    if (to === '/reports')   import('./pages/Reports');
  };

  return (
    <Link
      to={to}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      {children}
    </Link>
  );
}

// Use Speculation Rules API for modern browsers
<script type="speculationrules">
{
  "prerender": [
    { "where": { "href_matches": "/dashboard/*" }, "eagerness": "moderate" }
  ]
}
</script>

// Prefetch data alongside route chunk (parallel, not serial)
// TanStack Router, Remix, and SvelteKit support loader-based prefetching natively
```

**Detection rule:**

Inspect network tab during hover over navigation links. If no requests fire until click, prefetching is absent. Measure time from click to content-rendered for key navigations; flag if consistently above 500ms on fast connections.

---

### AP-17: Analytics Tracking Failures

**Also known as:** Missing pageviews, SPA tracking gap, single-pageview analytics
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Google Analytics (or any analytics tool) records only the initial page load. All subsequent SPA navigations are invisible. The analytics dashboard shows 100% of sessions viewing a single page with 100% bounce rate -- despite users actively navigating the application.

```javascript
// GA4 snippet in index.html -- fires once on initial load
// All subsequent route changes are untracked
gtag('config', 'G-XXXXXX');

// Missing: no route change listener
// router.afterEach() / useEffect on location / history.listen -- absent
```

**Why developers do it:**

Standard analytics snippets are designed for multi-page sites. The default setup fires on page load, which in an SPA happens only once. Framework-specific analytics integration is a separate task that often falls through the cracks. Developers verify "analytics is installed" by checking the initial page load and stop there.

**What goes wrong:**

Product decisions are made on fundamentally wrong data. A feature that 80% of users engage with shows as 0% in analytics. Conversion funnels are blind past the landing page. Marketing cannot attribute traffic to interior pages. A/B test results are invalid because only the variant shown on initial load is tracked.

**The fix:**

```javascript
// React: track route changes
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location]);

  return null;
}

// Vue Router
router.afterEach((to) => {
  gtag('event', 'page_view', {
    page_path: to.fullPath,
    page_title: to.meta.title || document.title,
  });
});
```

Verify in GA4 Real-Time view by navigating through multiple pages and confirming each appears.

**Detection rule:**

Open the application, navigate through 5+ routes, then check the analytics Real-Time report. If only 1 pageview appears, SPA tracking is broken.

---

### AP-18: Form State Lost on Navigation

**Also known as:** Disappearing forms, navigation data loss, unguarded routes
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

A user fills out a long form (profile, application, order), accidentally clicks a navigation link or presses back, and all entered data is gone. There is no confirmation prompt, no draft saving, no recovery mechanism.

```javascript
// User fills 15 fields over 5 minutes, clicks "Products" in nav
// Component unmounts, useState resets, data is gone forever
function ApplicationForm() {
  const [formData, setFormData] = useState({});
  // No beforeunload listener
  // No navigation guard
  // No draft persistence
}
```

**Why developers do it:**

Navigation guards add complexity and interrupt the "everything is a smooth transition" SPA mental model. Saving drafts requires choosing a persistence mechanism (localStorage, server, IndexedDB) and handling serialization edge cases. It is an easy feature to defer and a hard one to prioritize because it only matters when something goes wrong.

**What goes wrong:**

Users lose minutes of work. In contexts where the form data is difficult to reproduce (job applications, insurance claims, detailed orders), this causes real harm and abandonment. Users become anxious and stop trusting the application. Completion rates for multi-field forms drop significantly without draft protection.

**The fix:**

```javascript
function ApplicationForm() {
  // 1. Persist draft to localStorage
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('application-draft');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('application-draft', JSON.stringify(formData));
  }, [formData]);

  // 2. Warn on navigation away
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // 3. Warn on browser close/refresh
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
```

**Detection rule:**

Fill a form partially, then click a navigation link. If no confirmation dialog appears and data is lost on returning, the anti-pattern is present.

---

### AP-19: No Loading Skeletons / Transition Feedback

**Also known as:** Blank flash, spinner-only, layout shift on load
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

Route transitions show either nothing (blank white space) or a generic centered spinner while content loads. When content arrives, the entire layout shifts as elements pop into existence. There is no visual hint of what the page will look like.

```javascript
// The entire page is either a spinner or the full content -- nothing in between
function Dashboard() {
  const { data, isLoading } = useQuery('dashboard', fetchDashboard);

  if (isLoading) return <Spinner />;  // Blank page with centered spinner

  return <DashboardContent data={data} />;
}
```

**Why developers do it:**

A spinner is the simplest loading indicator to implement -- one component, one conditional. Skeleton screens require designing placeholder layouts that match the actual content structure. It feels like building the UI twice.

**What goes wrong:**

Perceived performance degrades sharply. Research shows that skeleton screens make users perceive load times as 15-30% shorter than spinners for the same actual duration. Without skeletons, every navigation feels like a full page load. Cumulative Layout Shift (CLS) spikes when content suddenly appears, hurting Core Web Vitals scores. Users are uncertain whether the app is working or stuck.

**The fix:**

```javascript
function Dashboard() {
  const { data, isLoading } = useQuery('dashboard', fetchDashboard);

  if (isLoading) return <DashboardSkeleton />;

  return <DashboardContent data={data} />;
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-layout">
      <div className="skeleton-header" aria-busy="true" />
      <div className="skeleton-chart" />
      <div className="skeleton-table">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton-row" />
        ))}
      </div>
    </div>
  );
}
// Skeleton matches the layout of DashboardContent -- no layout shift
```

**Detection rule:**

Throttle network to Slow 3G in DevTools and navigate between routes. If any route shows a blank screen or generic spinner lasting more than 200ms without a skeleton that matches the final layout, the anti-pattern is present.

---

### AP-20: Ignoring Accessibility in Route Transitions

**Also known as:** Silent navigation, screen-reader blindspot, focus void
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

A screen reader user clicks a navigation link. The URL changes, the DOM updates, but the screen reader announces nothing. Focus remains on the now-stale navigation link. The user has no idea that content changed. There is no page title update, no ARIA live region announcement, and no focus management.

```javascript
// Router changes content but does nothing for assistive technology
<Route path="/dashboard" element={<Dashboard />} />
// Screen reader user experience:
// 1. Clicks "Dashboard" link
// 2. Hears: nothing
// 3. Focus: still on "Dashboard" link (which is now the active page)
// 4. User presses Tab: lands on... who knows?
```

**Why developers do it:**

Accessibility testing is not part of the default development workflow. Most developers do not use screen readers and cannot observe the problem. SPA frameworks do not handle focus management or announcements out of the box -- unlike the browser, which announces the new page title on every full page load. The WCAG requirements for SPAs are not well understood.

**What goes wrong:**

Screen reader users -- approximately 8 million in the US alone -- cannot use the application. They hear nothing on navigation, lose track of their position in the page, and must manually explore from the top of the DOM to find new content. Tab order becomes nonsensical after a route change. This violates WCAG 2.1 Success Criteria 2.4.3 (Focus Order), 4.1.3 (Status Messages), and arguably 1.3.1 (Info and Relationships). Legal liability under ADA and equivalent laws.

**The fix:**

```javascript
// 1. Update document.title on every route change
useEffect(() => {
  document.title = `${pageTitle} | MyApp`;
}, [pageTitle]);

// 2. Announce navigation via ARIA live region
function RouteAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  const location = useLocation();

  useEffect(() => {
    setAnnouncement(`Navigated to ${document.title}`);
  }, [location]);

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// 3. Move focus to main content heading after navigation
useEffect(() => {
  const heading = document.querySelector('main h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
}, [location]);
```

**Detection rule:**

Enable a screen reader (VoiceOver, NVDA, JAWS). Navigate between routes. If the screen reader does not announce the new page or content area, the anti-pattern is present. Automated: check that `document.title` changes on route change and that an element with `aria-live` exists in the DOM.

---

## Root Cause Analysis

Most SPA anti-patterns trace back to a small set of root causes. Understanding these causes helps teams prevent entire categories of mistakes rather than chasing individual symptoms.

| Root Cause | Anti-Patterns It Produces | Prevention Strategy |
|---|---|---|
| **Browser reimplementation blindness** -- Not recognizing that SPAs must reimplement browser-native features | AP-04, AP-06, AP-08, AP-14, AP-20 | Maintain a checklist of browser behaviors that SPAs bypass: history, scroll, focus, error pages, page title, loading indicators |
| **Dev-server masking** -- Development tools hide production problems | AP-04, AP-07, AP-12, AP-14 | Test against production builds weekly; run `curl` and Lighthouse against staging |
| **Incremental bundle growth** -- No one monitors bundle size as features accumulate | AP-02, AP-03, AP-13 | Enforce bundle budgets in CI; fail the build if thresholds are exceeded |
| **Single-device testing** -- Developers test only on fast machines with fast networks | AP-02, AP-09, AP-12, AP-13, AP-19 | Mandate testing on throttled networks and low-end device emulation |
| **Architecture cargo-culting** -- Using SPA architecture because it is familiar, not because it fits | AP-01, AP-10, AP-15 | Require a rendering strategy decision document per project before scaffolding |
| **Cleanup amnesia** -- Setup code written without corresponding teardown | AP-05 | Lint rules requiring cleanup returns in useEffect; MemLab in CI |
| **URL-as-afterthought** -- Treating the URL bar as decoration rather than application state | AP-06, AP-07, AP-08, AP-17 | Design URL schema before building features; treat URL as the canonical source of navigation state |
| **Accessibility as bolt-on** -- Treating a11y as a final polish step rather than a structural requirement | AP-20, AP-19 | Include screen reader testing in the definition of done; use axe-core in CI |
| **Security shortcut** -- Choosing simplest auth implementation without considering persistence | AP-11 | Require threat model review for auth flow; use BFF pattern by default |
| **Missing observability** -- No monitoring of real user behavior | AP-17, AP-05, AP-12 | Verify analytics captures all routes; add RUM (Real User Monitoring); set memory alerts |

---

## Self-Check Questions

Before shipping an SPA, walk through these questions. A "no" to any item flags a likely anti-pattern.

1. **Does this project genuinely need to be a SPA?** Could SSR, SSG, or a multi-page architecture serve users better? (AP-01)
2. **Is every route lazy-loaded?** Does the initial bundle contain only the code for the landing route? (AP-02, AP-03)
3. **Does a direct URL request to any interior route return 200 with the app shell?** Have you tested this on the production server, not just the dev server? (AP-04)
4. **Do all `useEffect` / `onMounted` / `ngOnInit` hooks with subscriptions, timers, or event listeners have corresponding cleanup?** (AP-05)
5. **Does the back button behave as a user would expect from every screen in the app?** Have you tested modals, wizards, and tab views? (AP-06)
6. **Can a user share a URL that reproduces their current view, including filters, search, pagination, and selected tabs?** (AP-07)
7. **Does pressing back after scrolling a long list restore the scroll position?** (AP-08)
8. **Is the JavaScript bundle under 250 KB gzipped for the initial route?** Have you run a bundle analyzer in the last month? (AP-13)
9. **Does navigating to a nonexistent URL show a helpful 404 page?** (AP-14)
10. **Are authentication tokens persisted across page refresh without requiring re-login?** (AP-11)
11. **Does the app degrade gracefully when the network drops?** Does it show cached content and an offline indicator? (AP-12)
12. **Does your analytics tool record a pageview for every SPA route change?** Have you verified in the Real-Time report? (AP-17)
13. **If a user partially fills a long form and accidentally navigates away, is there a confirmation prompt and/or draft recovery?** (AP-18)
14. **Do route transitions show skeleton screens that match the final layout, rather than generic spinners or blank screens?** (AP-19)
15. **Can a screen reader user navigate between routes and hear announcements of the new page content?** (AP-20)

---

## Code Smell Quick Reference

| Code Smell | Likely Anti-Pattern | Severity | One-Line Detection |
|---|---|---|---|
| `<div id="root"></div>` is the only HTML content in `index.html` | AP-01: SPA for SEO sites | Critical | `grep -c '<div id="root">' index.html` and check for no other content |
| Zero `import()` calls in a project with 5+ routes | AP-02: No code splitting | High | `grep -r 'import(' src/ --include='*.js' --include='*.ts' \| wc -l` returns 0 |
| All route components are static imports in the router file | AP-03: All routes upfront | High | Count `import ... from './pages'` in router file |
| No `try_files` or catch-all in server config | AP-04: No server fallback | Critical | `curl -o /dev/null -s -w '%{http_code}' https://app.com/any/deep/route` returns 404 |
| `addEventListener` without `removeEventListener` in component | AP-05: Memory leak | Critical | Lint for unpaired `addEventListener` in component lifecycle code |
| `history.pushState` inside modal/dialog open handler | AP-06: Back button broken | High | Search for `pushState` near `modal` or `dialog` |
| Filter/sort/page state in `useState` but not in URL params | AP-07: Deep linking failure | High | Check if `useSearchParams` or equivalent is used alongside filter state |
| No `scrollRestoration` or manual scroll save/restore logic | AP-08: Scroll amnesia | Medium | `grep -r 'scrollRestoration\|scrollTo\|scrollPositions' src/` |
| `fetch('/api/items')` returning unbounded collections filtered client-side | AP-09: Client overload | High | Flag `.filter()` or `.sort()` on API response data > 100 items |
| Public pages return blank HTML when fetched without JS | AP-10: Missing SSR | High | `curl -s https://app.com/ \| grep -c '<h1>'` returns 0 |
| Auth token stored only in `useState` or module variable | AP-11: Volatile auth | Critical | Search for token assignment to `useState` or `let token =` |
| No `navigator.onLine` check or `offline`/`online` event listeners | AP-12: No offline handling | Medium | `grep -r 'navigator.onLine\|offline\|online' src/` returns 0 |
| `import moment from 'moment'` or `import _ from 'lodash'` (full imports) | AP-13: Huge bundles | High | `grep -r "from 'moment'\|from 'lodash'" src/` |
| No `path="*"` or wildcard route in router config | AP-14: No 404 handling | Medium | Search router file for `*` or `404` route |
| Redux/Vuex store has keys like `modalOpen`, `hoverItem`, `tooltipTarget` | AP-15: Store bloat | Medium | Inspect root state shape for UI-only keys |
| No `onMouseEnter` prefetch or `<link rel="prefetch">` for routes | AP-16: No prefetch | Medium | `grep -r 'prefetch\|preload\|speculationrules' src/ public/` |
| `gtag` or analytics call only in `index.html`, no route-change listener | AP-17: Analytics gap | High | Search for `page_view` event dispatch on `location` change |
| Long forms with no `beforeunload` listener or `useBlocker` | AP-18: Form state loss | High | `grep -r 'beforeunload\|useBlocker\|Prompt' src/` near form components |
| `if (isLoading) return <Spinner />` with no skeleton alternative | AP-19: No skeletons | Medium | `grep -r 'Spinner\|Loading...' src/` without corresponding `Skeleton` |
| No `aria-live` region and no `document.title` update on route change | AP-20: Silent navigation | Critical | `grep -r 'aria-live\|document.title' src/` in route-change handlers |

---

*Researched: 2026-03-08 | Sources: Nolan Lawson (SPA accessibility & memory leaks), Facebook MemLab research, StackInsight 500-repository memory leak study, Google Web Fundamentals (code splitting & Core Web Vitals), Deque Systems (SPA accessibility), Prerender.io (SPA SEO challenges), Auth0 (JavaScript memory leaks), Baymard Institute (UX research), WICG Navigation API (focus management), Curity (SPA OAuth best practices), DebugBear (SPA performance monitoring), Google Cloud Blog (SPA security vulnerabilities), WeWeb (SPA SEO 2026 guide), Adam Silver (problems with SPAs)*
