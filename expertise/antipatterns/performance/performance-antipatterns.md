# Performance Anti-Patterns

> Performance anti-patterns are coding and architectural mistakes that degrade application speed, responsiveness, and resource efficiency. Unlike functional bugs that produce wrong results, performance anti-patterns produce correct results slowly -- often undetectably slow in development but catastrophically slow in production under real data volumes and traffic. These anti-patterns are uniquely dangerous because they compound: two individually tolerable inefficiencies can combine to make a system unusable.

> **Domain:** Performance
> **Anti-patterns covered:** 21
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: The N+1 Query

**Also known as:** Select N+1, Lazy Loading Landmine, Query Explosion
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
Code fetches a list of parent records with one query, then issues a separate query for each parent to fetch related child records. In ORM-based code, this often hides behind lazy-loaded relationships that fire transparently:

```python
# BAD: 1 query for posts + N queries for authors
posts = Post.objects.all()
for post in posts:
    print(post.author.name)  # triggers a query per post
```

**Why developers do it:**
ORMs make lazy loading the default because it simplifies the API surface. In development with 10 rows, the 11 queries complete in under 50ms and nobody notices. The code reads cleanly and "just works." Developers trust the ORM to be efficient.

**What goes wrong:**
With 10,000 records, a single page load fires 10,001 queries. Each individual query is fast (2-5ms), so none appears in slow-query logs -- but the aggregate wall time exceeds 20 seconds. PlanetScale and Sentry have documented this as the single most common performance issue in web applications. Production databases get hammered with thousands of near-identical queries, exhausting connection pools and degrading performance for all users. A 50x slowdown compared to eager loading is typical: 101 queries at 10ms each = 1,010ms vs. 2 queries at 10ms each = 20ms.

**The fix:**
Use eager loading (JOIN or prefetch) to retrieve related data in bulk:

```python
# GOOD: 2 queries total regardless of N
posts = Post.objects.select_related('author').all()
for post in posts:
    print(post.author.name)  # no additional query
```

In GraphQL, use DataLoader to batch and deduplicate. In raw SQL, use JOINs or IN clauses. Set up N+1 detection in your test suite (e.g., django-query-count, bullet gem for Rails).

**Detection rule:**
If a database query executes inside a loop that iterates over the results of another query, this is AP-01. Also suspect if page load fires >50 queries and most share the same structure with different IDs.

---

### AP-02: Missing Database Indexes

**Also known as:** Full Table Scan, Sequential Scan Syndrome
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Queries filter, join, or sort on columns that have no index. The database must scan every row in the table to find matches:

```sql
-- No index on users.email
SELECT * FROM users WHERE email = 'user@example.com';
-- Full table scan: O(n) instead of O(log n)
```

**Why developers do it:**
With small development datasets (hundreds of rows), full table scans are instantaneous. Developers focus on correctness, not query plans. ORM-generated migrations often only create indexes for primary keys and explicit unique constraints. Developers assume the database "figures it out."

**What goes wrong:**
A query that takes 50ms against 1,000 rows takes 3+ seconds against 2 million production rows. Sentry's engineering blog documented this as the most common cause of slow queries in production: developers ship code that works perfectly locally, then alerts fire in production as full table scans consume CPU and I/O. Write performance also degrades as the database locks rows during long scans. A single missing index on a high-traffic endpoint can cascade into connection pool exhaustion and full application downtime.

**The fix:**
Run `EXPLAIN ANALYZE` on every query that touches tables with >10k rows. Add indexes on columns used in WHERE, JOIN ON, and ORDER BY clauses:

```sql
CREATE INDEX idx_users_email ON users(email);
-- Verify: EXPLAIN shows Index Scan instead of Seq Scan
```

Use composite indexes for multi-column filters. Review slow query logs weekly. Add index linting to CI (e.g., `pg_stat_user_tables` for tables with high sequential scan ratios).

**Detection rule:**
If a query plan shows "Seq Scan" or "Full Table Scan" on a table with more than a few thousand rows, this is AP-02. Also suspect if query execution time grows linearly with table size.

---

### AP-03: Memory Leaks

**Also known as:** Slow Bleed, Creeping OOM, The Weekend Crash
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**
Objects are allocated but never released because references persist beyond their useful lifetime. Common patterns:
- Event listeners registered but never removed
- Closures capturing large scopes
- Growing caches without eviction policies
- Timers/intervals never cleared
- Circular references preventing garbage collection

```javascript
// BAD: listener never removed, element reference held forever
class Component {
  mount() {
    this.handler = (e) => this.handleScroll(e);
    window.addEventListener('scroll', this.handler);
  }
  // No unmount/cleanup method
}
```

**Why developers do it:**
Garbage-collected languages create a false sense of safety -- "the runtime handles memory." Memory leaks in GC'd languages are subtle: the objects are reachable (so the GC correctly keeps them) but no longer needed. The application works fine for hours or days before memory pressure builds.

**What goes wrong:**
Cloudflare's "Cloudbleed" incident (2017) stemmed from a buffer overrun where their edge servers ran past the end of a buffer and returned memory containing private data -- HTTP cookies, authentication tokens, and POST bodies from other users. A .NET order processing service on Kubernetes exhibited a rising memory slope over weeks, eventually triggering OOM restarts; it took six weeks to find the cause -- a lambda capturing a reference to a large object graph. RavenDB documented a production cluster where instances would periodically crash from OOM due to memory fragmentation with `posix_memalign`. The Logstash file input plugin held growing file tracking state that was never released, exhausting host memory on Windows.

**The fix:**
Always pair resource acquisition with cleanup. In JavaScript, remove event listeners in component teardown. In React, return cleanup functions from useEffect. In server code, use bounded caches (LRU) with max-size policies. Monitor memory in production with alerting on growth trends, not just absolute thresholds.

```javascript
// GOOD: cleanup on unmount
useEffect(() => {
  const handler = (e) => handleScroll(e);
  window.addEventListener('scroll', handler);
  return () => window.removeEventListener('scroll', handler);
}, []);
```

**Detection rule:**
If code adds event listeners, timers, subscriptions, or cache entries without a corresponding removal/cleanup path, this is AP-03. If memory usage grows monotonically under steady load, suspect AP-03.

---

### AP-04: Blocking the Main Thread

**Also known as:** UI Freeze, ANR (Application Not Responding), Event Loop Starvation
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Synchronous, long-running operations execute on the main/UI thread, preventing the application from responding to user input or processing other events:

```javascript
// BAD: synchronous file read blocks the Node.js event loop
const data = fs.readFileSync('/large-file.csv');
processData(data);

// BAD: CPU-intensive work on the main thread
function findPrimes(limit) {
  // blocks everything for seconds
  for (let i = 2; i < limit; i++) { /* ... */ }
}
```

**Why developers do it:**
Synchronous code is simpler to write and reason about. Async patterns (callbacks, promises, async/await) add complexity. In development, the file is small and the computation fast, so blocking is imperceptible. Mobile developers may not realize that all UI work must happen on the main thread, but I/O must not.

**What goes wrong:**
On Android, if the main thread is blocked for more than 5 seconds, the system shows an "Application Not Responding" (ANR) dialog, and the user can force-close the app. In Node.js, Trigger.dev documented event loop lag causing servers to handle as few as 5 requests per second with event loop delays exceeding one minute. Ashby Engineering documented how a single blocking operation in their Node.js backend caused cascading latency for all concurrent users because the event loop couldn't process any other requests while blocked. In browsers, blocking the main thread prevents rendering, making the page appear frozen.

**The fix:**
Move I/O and heavy computation off the main thread. Use async I/O, Web Workers (browser), worker_threads (Node.js), or background threads (mobile):

```javascript
// GOOD: async I/O
const data = await fs.promises.readFile('/large-file.csv');
// GOOD: offload CPU work
const worker = new Worker('./prime-worker.js');
```

On mobile, use coroutines (Kotlin), GCD (Swift), or Isolates (Dart/Flutter) for background work. Enable StrictMode in Android development to catch main-thread I/O.

**Detection rule:**
If synchronous I/O functions (readFileSync, synchronous HTTP requests) appear in server or UI code, this is AP-04. If CPU-intensive loops execute without yielding, suspect AP-04. Monitor event loop lag in Node.js; anything above 100ms indicates blocking.

---

### AP-05: Layout Thrashing

**Also known as:** Forced Synchronous Reflow, Read-Write-Read Storm
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
JavaScript code alternates between reading and writing layout properties in a tight loop, forcing the browser to recalculate layout on every read:

```javascript
// BAD: read-write cycle forces reflow on every iteration
const elements = document.querySelectorAll('.item');
elements.forEach(el => {
  const height = el.offsetHeight;    // READ - forces layout
  el.style.height = height + 10 + 'px'; // WRITE - invalidates layout
});
```

**Why developers do it:**
The DOM API makes reading and writing properties look equally cheap. Developers treat `offsetHeight` like reading a variable, not realizing it triggers a full layout recalculation when the layout is dirty. The code is logically correct and works on small DOMs.

**What goes wrong:**
Paul Irish (Google Chrome team) documented a comprehensive list of properties and methods that force layout/reflow. When these are interleaved with writes in a loop, the browser cannot batch layout operations and must perform a full reflow on every read. With hundreds of elements, this drops frame rates from 60fps to single digits. The browser's "Recalculate style" events pile up in the performance timeline as cascading purple blocks. Google's web.dev documentation specifically warns that layout thrashing is one of the most common causes of janky animations and scroll performance.

**The fix:**
Batch all reads first, then all writes. Use `requestAnimationFrame` for DOM writes. Use the FastDOM library for automated read/write batching:

```javascript
// GOOD: batch reads, then writes
const heights = Array.from(elements).map(el => el.offsetHeight);
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';
});
```

**Detection rule:**
If code reads a layout property (offsetHeight, clientWidth, getBoundingClientRect) and writes a style property (style.height, style.width, className) inside the same loop iteration, this is AP-05.

---

### AP-06: Unoptimized Images

**Also known as:** 5MB Hero Image, The LCP Killer
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Images served in uncompressed formats (BMP, unoptimized PNG), at original camera resolution (4000x3000 for a 400x300 display slot), without responsive sizing, lazy loading, or modern format conversion:

```html
<!-- BAD: 5MB original DSLR photo for a thumbnail -->
<img src="photo-original.png" />
```

**Why developers do it:**
Developers upload the image from the designer or camera and it "looks right." Image optimization is perceived as a build-step concern, not a code concern. Nobody checks the network tab during development because images load instantly from localhost.

**What goes wrong:**
73% of mobile pages use an image as their Largest Contentful Paint (LCP) element. An unoptimized hero image is the single most common cause of LCP failure. MDN and Google's web.dev document that every 1-second delay in LCP can reduce conversion rates by 12%. Only 59% of mobile pages meet the "Good" LCP threshold of 2.5 seconds. A 5MB image that should be 200KB wastes bandwidth, drains mobile data plans, and makes the page feel broken on slow connections.

**The fix:**
Use modern formats (WebP, AVIF), responsive images with `srcset`, proper sizing, compression, and lazy loading for below-the-fold images:

```html
<!-- GOOD: optimized, responsive, lazy-loaded -->
<img
  src="photo-400w.webp"
  srcset="photo-400w.webp 400w, photo-800w.webp 800w"
  sizes="(max-width: 600px) 400px, 800px"
  loading="lazy"
  alt="Description"
/>
```

Use build-time image optimization (sharp, imagemin) or image CDNs (Cloudinary, imgix) for on-the-fly transformation.

**Detection rule:**
If image files exceed 500KB, lack `loading="lazy"` for below-fold images, use PNG/JPEG when WebP/AVIF is viable, or have no `srcset`/`sizes` attributes, this is AP-06.

---

### AP-07: No Pagination or Virtual Scrolling

**Also known as:** Rendering 10,000 DOM Nodes, The Infinite Scroll of Death
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Code fetches and renders an entire dataset into the DOM at once, regardless of how many records exist:

```javascript
// BAD: renders all 50,000 items into the DOM
const items = await fetchAllItems();
items.forEach(item => {
  const div = document.createElement('div');
  div.textContent = item.name;
  container.appendChild(div);
});
```

**Why developers do it:**
With 20 test records, rendering everything is the simplest approach. Pagination adds UI complexity (page controls, state management). Virtual scrolling requires a library. "It works in dev" syndrome prevails.

**What goes wrong:**
Browsers struggle with more than a few thousand DOM nodes. At 10,000+ nodes, scrolling becomes janky, memory usage balloons, and initial render can take seconds. Mobile devices are hit hardest due to limited memory. The browser must layout, paint, and composite all nodes even if only 20 are visible. React applications rendering large lists without virtualization can consume hundreds of megabytes of memory just for the virtual DOM representation.

**The fix:**
For finite datasets, use pagination (server-side preferred). For scrollable lists, use virtual scrolling libraries that render only visible items plus a small buffer:

```javascript
// GOOD: react-window renders only visible items
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={50000} itemSize={35}>
  {({ index, style }) => <div style={style}>{items[index].name}</div>}
</FixedSizeList>
```

Libraries: react-window, react-virtualized, @angular/cdk virtual-scroll, vue-virtual-scroller.

**Detection rule:**
If code renders a list without a limit/offset mechanism and the data source can grow unboundedly, this is AP-07. If the DOM contains >1,000 sibling elements from a single data source, suspect AP-07.

---

### AP-08: Unnecessary Re-renders

**Also known as:** Render Storm, Prop Drilling Cascade, State Thrashing
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
UI components re-render when their inputs have not meaningfully changed, because of new object/array references, state lifted too high, or missing memoization:

```jsx
// BAD: new object reference on every parent render
function Parent() {
  const [count, setCount] = useState(0);
  // This object is recreated every render, causing Child to re-render
  const config = { theme: 'dark' };
  return <Child config={config} onClick={() => setCount(c => c + 1)} />;
}
```

**Why developers do it:**
Inline objects and arrow functions are the most readable pattern. React's mental model suggests "rendering is cheap" -- and for simple components it is. Developers don't realize that new references defeat `React.memo` and `shouldComponentUpdate`. In development with React DevTools, the extra renders are invisible without profiling.

**What goes wrong:**
When re-renders happen on heavy components (charts, tables, forms with validation), the UI becomes visibly laggy. DebugBear and Kent C. Dodds have documented how unnecessary re-renders degrade Interaction to Next Paint (INP) scores, making applications feel unresponsive. In extreme cases, a single state change at the root can trigger hundreds of component re-renders cascading through the tree, each performing diffing, effect evaluation, and DOM reconciliation. The development build of React is also slower, masking that production will be somewhat better -- but not enough if the fundamental re-render count is excessive.

**The fix:**
Stabilize references with `useMemo` and `useCallback`. Use `React.memo` for expensive components. Move state as close to where it's used as possible. Use context selectors or state management libraries with fine-grained subscriptions:

```jsx
// GOOD: stable references prevent unnecessary re-renders
function Parent() {
  const [count, setCount] = useState(0);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const handleClick = useCallback(() => setCount(c => c + 1), []);
  return <Child config={config} onClick={handleClick} />;
}
const Child = React.memo(function Child({ config, onClick }) { /* ... */ });
```

**Detection rule:**
If a component receives non-primitive props (objects, arrays, functions) created inline in the parent's render, this is AP-08. Use React DevTools Profiler "Highlight updates" to visualize unnecessary re-renders.

---

### AP-09: Large Bundle Sizes

**Also known as:** Ship Everything Upfront, The 2MB JavaScript Bundle
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The entire application is shipped as a single JavaScript bundle with no code splitting. Every page loads every route, every library, and every feature:

```javascript
// BAD: single entry point imports everything
import { AdminDashboard } from './admin';
import { UserProfile } from './profile';
import { Analytics } from './analytics';
import { moment } from 'moment'; // 300KB for date formatting
```

**Why developers do it:**
Code splitting adds configuration complexity (dynamic imports, chunk naming, loading states). Single-bundle builds are the default in many setups. Developers don't monitor bundle size as a metric. Adding a dependency feels free -- `npm install` is easy, but nobody checks that `moment.js` adds 300KB.

**What goes wrong:**
Smashing Magazine and web.dev have documented that large JavaScript bundles delay initial page load because the browser must download, parse, and execute all code before the page becomes interactive. A 2MB bundle on a 3G connection takes 8+ seconds just to download, then additional seconds to parse and execute. This directly impacts Time to Interactive (TTI) and First Input Delay (FID). Users on mobile networks experience blank screens or frozen interfaces. Google's Core Web Vitals penalize these pages in search rankings.

**The fix:**
Use dynamic imports for route-based code splitting. Analyze bundle composition with webpack-bundle-analyzer or source-map-explorer. Replace heavy libraries with lighter alternatives (date-fns instead of moment, preact instead of react for simple use cases):

```javascript
// GOOD: route-based code splitting with dynamic imports
const AdminDashboard = React.lazy(() => import('./admin'));
const UserProfile = React.lazy(() => import('./profile'));

// GOOD: tree-shakeable imports
import { format } from 'date-fns'; // only imports what you use
```

Set bundle size budgets in CI. Fail builds that exceed thresholds.

**Detection rule:**
If the main JavaScript bundle exceeds 200KB gzipped, this is likely AP-09. If `import` statements pull in entire libraries when only one function is needed, suspect AP-09.

---

### AP-10: Not Using Connection Pooling

**Also known as:** Connect-Per-Request, Connection Churn, Socket Exhaustion
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Every database or HTTP request creates a new connection, uses it once, and closes it:

```python
# BAD: new connection per request
def get_user(user_id):
    conn = psycopg2.connect(host='db', dbname='app')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result
```

**Why developers do it:**
Creating a connection per request is the simplest pattern and avoids complexity around connection lifecycle management, pool sizing, and stale connection handling. Tutorial code almost always shows single-connection examples. Connection leaks (forgetting to return connections to the pool) are harder to debug than connection-per-request.

**What goes wrong:**
A mobile backend documented by Microsoft experienced authentication failures during peak hours because thousands of short-lived HttpClient instances saturated all available sockets, with the root cause being the overhead of TCP handshake + TLS negotiation (50-200ms) on every request. A .NET application on GitHub Issues (#18089) documented complete database connection pool exhaustion causing 500 errors across the entire application. Each new database connection requires TCP handshake, authentication, and protocol negotiation -- under load, this overhead dominates actual query time. Connection exhaustion cascades: when the database hits max_connections, every service querying that database fails simultaneously.

**The fix:**
Use connection pools for all database and HTTP connections. Configure pool sizes based on load testing. Always return connections to the pool (use context managers / try-finally):

```python
# GOOD: connection pool
from psycopg2 import pool

db_pool = pool.ThreadedConnectionPool(5, 20, host='db', dbname='app')

def get_user(user_id):
    conn = db_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()
    finally:
        db_pool.putconn(conn)
```

For HTTP, reuse clients (Python `requests.Session`, Node.js `http.Agent` with `keepAlive: true`, .NET `HttpClientFactory`).

**Detection rule:**
If database or HTTP connection constructors are called inside request handlers or loop bodies, this is AP-10. If "connection refused" or "pool exhausted" errors appear under load, suspect AP-10.

---

### AP-11: Excessive Network Requests

**Also known as:** Chatty API, Request Waterfall, No Batching
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The client makes many small, sequential network requests when a single batched request would suffice. Each request carries HTTP overhead (headers, TLS, round-trip latency):

```javascript
// BAD: 100 individual requests
const userIds = [1, 2, 3, /* ... 100 ids */];
const users = await Promise.all(
  userIds.map(id => fetch(`/api/users/${id}`))
);
```

**Why developers do it:**
RESTful API design often maps one resource to one endpoint, making individual fetches the natural pattern. Developers build features incrementally -- first one fetch, then another, then another -- without stepping back to see the aggregate. Batching requires server-side changes that frontend developers may not control.

**What goes wrong:**
Each HTTP request has a minimum overhead of 100-300ms on mobile networks (DNS + TCP + TLS + server processing). 100 sequential requests take 10-30 seconds even if each payload is tiny. Browser connection limits (6 per domain in HTTP/1.1) create queuing. Mobile devices waste battery on radio wake-ups for each request. Server-side, thousands of small requests consume more resources than fewer batched requests due to per-request overhead (authentication, logging, connection handling).

**The fix:**
Batch requests on the client or server. Use GraphQL for flexible data fetching. Implement batch endpoints. Cache aggressively (HTTP cache headers, service workers, in-memory caches):

```javascript
// GOOD: single batched request
const users = await fetch('/api/users?ids=1,2,3,...100');

// GOOD: GraphQL fetches exactly what's needed in one request
const { data } = await graphqlClient.query({
  query: gql`{ users(ids: [1,2,3]) { id, name, email } }`
});
```

**Detection rule:**
If the network tab shows >20 requests to the same API domain during a single user interaction, this is AP-11. If sequential fetches share the same base URL with different IDs, suspect AP-11.

---

### AP-12: Logging in Hot Paths

**Also known as:** Verbose Production Logging, Console.log-Driven Development
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Debug-level logging statements remain in performance-critical code paths that execute thousands of times per second:

```java
// BAD: logging inside a hot loop
for (Order order : orders) {
  logger.debug("Processing order: " + order.toJson()); // serialization + I/O on every iteration
  processOrder(order);
}
```

**Why developers do it:**
Logging is added during debugging and never removed. Developers assume "debug level won't run in production" but misconfigure log levels. Even when log level checks prevent output, string concatenation and object serialization may still execute before the level check.

**What goes wrong:**
Benchmarks show stdout-based logging makes hot code paths approximately 5,000x slower, file-based logging approximately 1,500x slower, and buffered file logging approximately 57x slower. Alibaba Cloud engineering documented significant throughput degradation from logging in high-frequency code paths. The overhead comes from three sources: string serialization (converting objects to strings), I/O operations (writing to disk or network), and synchronization (log frameworks often use locks for thread safety). An ASP.NET Core application was documented as feeling fast locally but slow in production specifically due to excessive logging volume.

**The fix:**
Remove logging from hot paths entirely, or use lazy evaluation with level guards:

```java
// GOOD: guard prevents serialization if debug is disabled
if (logger.isDebugEnabled()) {
  logger.debug("Processing order: {}", order.getId());
}
// GOOD: use parameterized messages (no concatenation until needed)
logger.debug("Processing order: {}", order::getId);
```

Use asynchronous logging frameworks (Log4j2 AsyncAppender, Serilog async sink). Set production log level to INFO or WARN. Never log request/response bodies in production hot paths.

**Detection rule:**
If logging statements (console.log, logger.debug, print) appear inside loops or methods called >100 times/second, this is AP-12. If log output includes serialized objects (toJson, toString) in hot paths, suspect AP-12.

---

### AP-13: Over-Fetching Data

**Also known as:** SELECT *, Return Everything, Kitchen Sink Response
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
APIs and queries return far more data than the client needs. The classic example is `SELECT *` when only two columns are needed, or REST endpoints that return full object graphs when the client needs only a name:

```sql
-- BAD: fetches 50 columns when 2 are needed
SELECT * FROM users WHERE active = true;
```

```json
// API returns 4KB per user when client only needs name
{ "id": 1, "name": "Alice", "email": "...", "address": {...},
  "preferences": {...}, "history": [...], "metadata": {...} }
```

**Why developers do it:**
`SELECT *` is easier to write and doesn't break when columns are added. REST API design often returns the full resource representation for consistency. Developers think "better to have data and not need it than need it and not have it." The cost of over-fetching is invisible in development with fast local networks.

**What goes wrong:**
Nordic APIs and multiple engineering blogs document how over-fetching wastes bandwidth on mobile networks, increases response times (serialization, network transfer, deserialization), and forces clients to process and discard unused data. On low-bandwidth or high-latency networks, the extra data causes measurably longer response times. `SELECT *` also prevents covering index optimizations -- the database must read full rows from disk instead of answering from the index alone. At scale, over-fetching multiplies: 100 bytes of unnecessary data per response x 1 million requests/day = 100GB of wasted bandwidth daily.

**The fix:**
Select only needed columns. Design API responses for specific use cases, or use GraphQL for client-specified field selection. Support sparse fieldsets in REST (`?fields=id,name`):

```sql
-- GOOD: fetch only what's needed
SELECT id, name FROM users WHERE active = true;
```

```javascript
// GOOD: GraphQL - client specifies exactly what it needs
query { users(active: true) { id, name } }
```

**Detection rule:**
If queries use `SELECT *` or API responses consistently contain fields the consuming client never reads, this is AP-13. Compare API response size to the data actually rendered on screen.

---

### AP-14: Polling When Push Is Available

**Also known as:** Are We There Yet?, Busy Waiting, Poll Storm
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The client repeatedly asks the server for updates at fixed intervals, even when server-initiated push mechanisms (WebSockets, SSE, webhooks) are available:

```javascript
// BAD: polling every 2 seconds
setInterval(async () => {
  const status = await fetch('/api/order/status');
  updateUI(status);
}, 2000);
```

**Why developers do it:**
Polling is the simplest real-time pattern -- it requires no special server infrastructure, works with standard REST APIs, and has no connection management complexity. WebSockets require different server architecture, load balancer configuration, and reconnection logic. HTTP/2 and SSE are less well understood.

**What goes wrong:**
Ably and RxDB have benchmarked the overhead: each poll carries full HTTP header overhead (500+ bytes), TCP setup cost, and server processing -- even when there's no new data (which is the majority of polls). At scale, polling at 2-second intervals means 1,800 requests/hour per client. With 10,000 concurrent users, that's 18 million requests/hour of mostly wasted work. Long polling improves this but still creates strain under scale with rapid message streams. WebSockets handle this with a single persistent connection and push semantics: the server sends data only when something changes, with message frames as small as 2-6 bytes of overhead.

**The fix:**
Use WebSockets for bidirectional real-time communication. Use Server-Sent Events (SSE) for unidirectional server-to-client updates. Use webhooks for server-to-server notifications. Reserve polling for environments where push is truly unavailable:

```javascript
// GOOD: WebSocket - server pushes updates
const ws = new WebSocket('wss://api.example.com/orders');
ws.onmessage = (event) => updateUI(JSON.parse(event.data));

// GOOD: SSE - simple server push
const source = new EventSource('/api/order/stream');
source.onmessage = (event) => updateUI(JSON.parse(event.data));
```

**Detection rule:**
If `setInterval` or `setTimeout` calls a fetch/HTTP endpoint repeatedly, and the data changes are event-driven on the server, this is AP-14.

---

### AP-15: Not Using a CDN for Static Assets

**Also known as:** Origin-Only Serving, Single Point of Latency
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
All static assets (JavaScript bundles, CSS, images, fonts) are served directly from the application's origin server, regardless of where the user is located geographically:

```
User in Tokyo → Origin server in Virginia → 200ms round trip per asset
```

**Why developers do it:**
Serving from the origin "just works" with no additional infrastructure. CDN configuration adds complexity (cache invalidation, CORS, SSL). Developers in the same region as the origin server don't experience the latency. Small teams may see CDN costs as unnecessary.

**What goes wrong:**
Cloudflare and DigitalOcean document that CDNs can reduce load times by up to 50% by serving content from edge servers closer to users. Without a CDN, a user 200ms round-trip from the origin server pays that 200ms for every single asset. A page loading 30 static assets sequentially adds 6 seconds of pure network latency. The origin server also bears the full traffic load, making it a single point of failure. DoorDash and Spotify are documented as using CDN infrastructure (Fastly, Cloudflare) specifically because geographic latency at scale directly impacts user engagement.

**The fix:**
Put all static assets behind a CDN. Use cache-busting filenames (content hashes) for aggressive caching. Set long Cache-Control headers for immutable assets:

```
# Nginx: cache static assets with content-hash filenames
location /static/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

Use CDN providers (Cloudflare, Fastly, CloudFront, Akamai). Enable Brotli compression at the CDN edge. Use `preconnect` hints for third-party CDN domains.

**Detection rule:**
If static assets (JS, CSS, images, fonts) are served from the same domain as the API with no CDN proxy, this is AP-15. Check response headers for CDN indicators (e.g., `cf-cache-status`, `x-cache`).

---

### AP-16: Quadratic Algorithms Where Linear Exists

**Also known as:** Accidental O(n^2), Hidden Nested Loop, The Scaling Cliff
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Code uses nested loops, repeated array searches, or naive algorithms that scale quadratically when linear or log-linear alternatives exist:

```javascript
// BAD: O(n^2) - includes() is O(n), called n times
function removeDuplicates(arr) {
  const result = [];
  for (const item of arr) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
```

**Why developers do it:**
The naive solution is the first one that comes to mind and is the easiest to write. With small inputs during development (n=100), O(n^2) completes in microseconds. Developers may not recognize that array methods like `includes`, `indexOf`, and `filter` are O(n) operations that create quadratic behavior when called inside loops.

**What goes wrong:**
A University of Chicago research paper on performance diagnosis for inefficient loops documented that such performance bugs "widely exist in deployed software" and waste energy during production runs. With n=1,000, O(n^2) performs 1,000,000 operations -- noticeable but tolerable. With n=100,000 (common in production), O(n^2) performs 10 billion operations, taking minutes instead of milliseconds. The jump from "works fine" to "completely broken" happens abruptly as data grows, with no gradual warning.

**The fix:**
Use hash-based data structures (Set, Map, dictionary) for O(1) lookups. Know your standard library's time complexities. Use sorting + binary search when hash maps aren't suitable:

```javascript
// GOOD: O(n) using Set
function removeDuplicates(arr) {
  return [...new Set(arr)];
}

// GOOD: O(n) using Map for lookups in loops
const lookup = new Map(items.map(item => [item.id, item]));
for (const ref of references) {
  const item = lookup.get(ref.itemId); // O(1) instead of O(n)
}
```

**Detection rule:**
If an array search method (includes, indexOf, find, filter) is called inside a loop iterating over a collection of similar size, this is AP-16. If execution time grows noticeably when input doubles, profile for quadratic behavior.

---

### AP-17: Synchronous Serialization/Deserialization

**Also known as:** JSON.parse Everything, Blocking Serialization, Payload Processing Bottleneck
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Large payloads are serialized or deserialized synchronously on the main thread, or data is repeatedly serialized/deserialized unnecessarily:

```javascript
// BAD: parsing a 10MB JSON response on the main thread
const data = JSON.parse(hugeJsonString); // blocks for 200ms+

// BAD: unnecessary round-trip through JSON for deep cloning
const copy = JSON.parse(JSON.stringify(complexObject));
```

**Why developers do it:**
`JSON.parse` and `JSON.stringify` are the simplest way to work with JSON data and create deep copies. They appear in every tutorial. The performance cost is invisible with small payloads. `JSON.parse(JSON.stringify(obj))` is the most commonly recommended deep clone technique despite being extremely slow.

**What goes wrong:**
For large payloads (1MB+), JSON.parse can block the main thread for hundreds of milliseconds, causing visible UI freezes in browsers or event loop lag in Node.js. The JSON.parse/stringify deep clone pattern is particularly expensive: it serializes to string (allocating memory for the string representation), then parses back (allocating all new objects) -- performing double the work of a proper deep clone. With deeply nested objects, this can take 10-100x longer than structural cloning. When used in loops or hot paths, the compound effect is devastating.

**The fix:**
Use `structuredClone()` (available in modern runtimes) for deep cloning. Use streaming JSON parsers for large payloads. Move heavy parsing to Web Workers or worker threads. Avoid unnecessary serialization round-trips:

```javascript
// GOOD: native structured clone (3-10x faster than JSON round-trip)
const copy = structuredClone(complexObject);

// GOOD: streaming parser for large JSON
const stream = new ReadableStream(/* ... */);
const data = await parseJsonStream(stream);
```

**Detection rule:**
If `JSON.parse(JSON.stringify(obj))` appears anywhere, this is AP-17. If JSON.parse is called on payloads that could exceed 100KB, suspect AP-17 on the main thread.

---

### AP-18: Unnecessary Deep Copies

**Also known as:** Clone Everything, Defensive Copying Overkill, Immutability Tax
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Code deep-clones entire object graphs when only a shallow copy or no copy is needed:

```javascript
// BAD: deep clone just to change one field
const updated = JSON.parse(JSON.stringify(user));
updated.name = 'New Name';

// BAD: deep clone on every state update in a loop
items.forEach(item => {
  const state = cloneDeep(entireAppState);
  state.items[item.id] = item;
  setState(state);
});
```

**Why developers do it:**
Immutability is a best practice in React and Redux ecosystems. Developers internalize "never mutate state" and apply deep cloning as a blanket solution. `lodash.cloneDeep` and the JSON round-trip are easy to reach for. The performance cost is invisible with small state objects.

**What goes wrong:**
Deep cloning creates entirely new copies of all nested objects, consuming time proportional to the full object graph size. With large state trees (common in data-heavy applications), deep cloning on every update can consume 50%+ of the JavaScript frame budget. In memory-constrained mobile environments, the duplicate objects double memory pressure and trigger garbage collection pauses. When done in loops, the cost multiplies per iteration.

**The fix:**
Use shallow copies with spread syntax for top-level changes. Use structural sharing (Immer, Immutable.js) for nested updates. Only clone the path that changes:

```javascript
// GOOD: shallow copy + targeted update
const updated = { ...user, name: 'New Name' };

// GOOD: Immer - structural sharing, only changed paths are cloned
import produce from 'immer';
const nextState = produce(state, draft => {
  draft.items[itemId] = newItem;
});
```

**Detection rule:**
If `cloneDeep`, `structuredClone`, or `JSON.parse(JSON.stringify())` is called on objects where only 1-2 fields are changing, this is AP-18. If deep cloning appears inside loops or event handlers that fire frequently, suspect AP-18.

---

### AP-19: Excessive DOM Manipulation

**Also known as:** Death by a Thousand Appends, Direct DOM Surgery
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Code makes many individual DOM modifications instead of batching them, triggering repeated reflows and repaints:

```javascript
// BAD: 1000 individual DOM mutations
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  list.appendChild(li); // triggers layout on each append
}
```

**Why developers do it:**
DOM manipulation APIs are imperative and work one element at a time. The pattern of "create element, append to parent" is taught in every beginner tutorial. Without framework abstractions (React's virtual DOM, Vue's reactivity), developers default to direct manipulation.

**What goes wrong:**
Each `appendChild` can trigger a reflow if the parent is in the document. With 1,000 appends, the browser potentially recalculates layout 1,000 times. Google's web.dev documentation shows this causes dropped frames, visual jank during list rendering, and unnecessarily high CPU usage. On mobile devices, this directly impacts battery life due to GPU and CPU wake-ups for each paint cycle.

**The fix:**
Use `DocumentFragment` for batch DOM insertions. Use `innerHTML` for large HTML blocks. Better yet, use a framework's virtual DOM:

```javascript
// GOOD: batch with DocumentFragment
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li);
}
list.appendChild(fragment); // single reflow
```

**Detection rule:**
If DOM insertion methods (appendChild, insertBefore, innerHTML assignment) appear inside a loop with >10 iterations on elements already in the document, this is AP-19.

---

### AP-20: String Concatenation in Loops

**Also known as:** The Quadratic String, StringBuilder Ignorance
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Building a string by concatenating with `+` or `+=` inside a loop, creating a new string object on each iteration:

```java
// BAD: O(n^2) time - new string allocated each iteration
String result = "";
for (String item : items) {
    result += item + ","; // copies entire string on each iteration
}
```

**Why developers do it:**
String concatenation with `+` is the most intuitive string building pattern. It's taught first in every language tutorial. With small inputs, performance is indistinguishable from StringBuilder. Developers may not understand that strings are immutable in Java, C#, Python, and Go.

**What goes wrong:**
JetBrains IntelliJ explicitly flags this pattern. Because strings are immutable, each `+=` allocates a new string and copies all previous content. Concatenating n strings of equal length takes O(n^2) time. Redfin Engineering benchmarked Java string building: concatenating 100,000 strings with `+` takes 4,970ms vs. 1.5ms with StringBuilder -- a 3,300x difference. The compiler may optimize single-statement concatenation, but inside loops, a new StringBuilder is created per iteration, negating the optimization.

**The fix:**
Use language-specific builders for loop-based string construction:

```java
// GOOD: O(n) time
StringBuilder sb = new StringBuilder();
for (String item : items) {
    sb.append(item).append(",");
}
String result = sb.toString();
```

```python
# GOOD: join is O(n)
result = ",".join(items)
```

```javascript
// GOOD: array join in JavaScript
const result = items.join(",");
```

Note: In JavaScript, modern engines optimize string concatenation well, so this is primarily a concern in Java, C#, Python, and Go.

**Detection rule:**
If string concatenation (`+=` or `+`) appears inside a loop body in Java, C#, Python, or Go, this is AP-20. Less critical in JavaScript/Ruby due to engine optimizations.

---

### AP-21: Loading Everything Upfront

**Also known as:** No Lazy Loading, Eager Everything, The Blank Screen
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The application loads all resources, data, and components at startup regardless of whether the user will need them:

```javascript
// BAD: load all translations, all feature modules, all data at startup
import allTranslations from './i18n/all-languages';
import adminModule from './modules/admin';
import analyticsModule from './modules/analytics';
const allData = await fetch('/api/everything');
```

**Why developers do it:**
Loading everything at startup makes the application simpler: no loading states, no error handling for lazy loads, no code splitting boundaries to design. The experience feels snappy after the initial load. "Preloading" sounds like an optimization. Developers test on fast connections where the upfront cost is negligible.

**What goes wrong:**
The initial page load becomes the bottleneck. Users see a blank screen or loading spinner for seconds while the application downloads resources they may never use. On mobile networks (average 1.6 Mbps for 3G), loading 5MB of JavaScript + 2MB of images means 30+ seconds before anything is interactive. Google's web.dev recommends code splitting specifically because most users only interact with 10-20% of an application's features per session. Loading the admin dashboard for non-admin users wastes bandwidth and delays time-to-interactive for everyone.

**The fix:**
Use lazy loading for routes, images, and heavy components. Load data on demand. Use `IntersectionObserver` for lazy-loading below-fold content:

```javascript
// GOOD: lazy-load routes
const Admin = React.lazy(() => import('./modules/admin'));
const Analytics = React.lazy(() => import('./modules/analytics'));

// GOOD: lazy-load images below the fold
<img src="hero.webp" loading="lazy" />

// GOOD: fetch data when needed
useEffect(() => { if (activeTab === 'analytics') loadAnalytics(); }, [activeTab]);
```

**Detection rule:**
If all routes/features are statically imported at the entry point, this is AP-21. If API calls at startup fetch data for features not visible on the initial screen, suspect AP-21.

---

## Root Cause Analysis

| Anti-Pattern | Root Cause | Prevention |
|-------------|------------|------------|
| AP-01: N+1 Query | **Ignorance** -- ORM hides query generation | Enable query logging in development; use N+1 detection tools (bullet, django-query-count) |
| AP-02: Missing Indexes | **Ignorance** -- small dev data masks the problem | Mandate EXPLAIN ANALYZE in code review for new queries; monitor slow query logs |
| AP-03: Memory Leaks | **Ignorance** -- GC creates false safety | Pair every resource acquisition with cleanup; monitor production memory trends |
| AP-04: Blocking Main Thread | **Laziness** -- sync code is simpler to write | Use StrictMode (Android), lint rules for sync I/O, event loop lag monitoring |
| AP-05: Layout Thrashing | **Ignorance** -- DOM reads look cheap | Batch reads before writes; use FastDOM; profile with Chrome DevTools |
| AP-06: Unoptimized Images | **Laziness** -- optimization is a "later" task | Add image optimization to build pipeline; set size budgets in CI |
| AP-07: No Pagination | **Laziness** -- rendering everything is simpler | Design for production data volumes from the start; require limit/offset on all list endpoints |
| AP-08: Unnecessary Re-renders | **Ignorance** -- new references defeat memoization | Use React DevTools Profiler; stabilize references with useMemo/useCallback |
| AP-09: Large Bundles | **Cargo culting** -- adding dependencies without checking size | Set bundle size budgets; require size impact review for new dependencies |
| AP-10: No Connection Pooling | **Copy-paste from tutorials** -- examples show single connections | Use framework-provided pool management; never instantiate connections in handlers |
| AP-11: Excessive Network Requests | **Ignorance** -- individual requests feel simple | Monitor request count per page load; batch by default |
| AP-12: Logging in Hot Paths | **Laziness** -- debug logs not removed after debugging | Lint for log statements in loops; set production log level to INFO minimum |
| AP-13: Over-Fetching | **Laziness** -- SELECT * is easier to write | Ban SELECT *; require explicit field lists in queries and API designs |
| AP-14: Polling vs Push | **Laziness** -- polling requires no server changes | Evaluate update frequency requirements early; use SSE for simple push |
| AP-15: No CDN | **Ignorance** -- latency invisible to co-located developers | Add CDN as a standard infrastructure component; test from multiple geographies |
| AP-16: Quadratic Algorithms | **Ignorance** -- O(n) methods hidden inside O(n) loops | Know time complexity of standard library methods; profile with scaled inputs |
| AP-17: Sync Serialization | **Cargo culting** -- JSON.parse/stringify is the default copy pattern | Use structuredClone; stream large payloads; move parsing off main thread |
| AP-18: Unnecessary Deep Copies | **Cargo culting** -- "immutability" applied without understanding | Use shallow copies for top-level changes; adopt Immer for nested updates |
| AP-19: Excessive DOM Manipulation | **Ignorance** -- DOM APIs are imperative by nature | Use DocumentFragment; prefer frameworks with virtual DOM |
| AP-20: String Concat in Loops | **Ignorance** -- string immutability not understood | Use StringBuilder (Java/C#), join() (Python/JS); linters flag this pattern |
| AP-21: Loading Everything Upfront | **Laziness** -- no lazy loading means no loading states to handle | Make lazy loading the default; audit initial bundle with coverage tools |

## Self-Check Questions

1. How many database queries does this page/endpoint execute? Could any of them be combined or eliminated?
2. Have I run EXPLAIN ANALYZE on this query with production-scale data volumes?
3. Does this component/handler clean up every resource it acquires (listeners, timers, connections, subscriptions)?
4. Is there any I/O (network, disk, database) happening synchronously on the main/UI thread?
5. Am I reading and writing DOM layout properties in the same loop iteration?
6. Are my images optimized for the web (format, compression, responsive sizing, lazy loading)?
7. How many items could this list contain in production? Do I need pagination or virtual scrolling?
8. Will this component re-render unnecessarily because I'm creating new object/function references inline?
9. What is the total size of my JavaScript bundle? Have I code-split by route?
10. Am I creating a new database/HTTP connection for every request instead of using a pool?
11. How many network requests does this user interaction trigger? Can any be batched or cached?
12. Is there logging inside this loop or hot path that will run thousands of times per second?
13. Am I fetching more data than I actually use from this query or API call?
14. Am I polling for data that the server could push to me?
15. What is the time complexity of this algorithm? Does it contain hidden quadratic behavior (O(n) methods inside O(n) loops)?

## Code Smell Quick Reference

| If you see... | Suspect... | Verify... |
|---------------|-----------|-----------|
| Database query inside a `for`/`forEach` loop | AP-01: N+1 Query | Check if the loop iterates over results of another query |
| `SELECT *` in SQL or ORM equivalent | AP-02/AP-13: Missing Index / Over-Fetching | Run EXPLAIN; check if all columns are used |
| `addEventListener` without corresponding `removeEventListener` | AP-03: Memory Leak | Check component cleanup/unmount lifecycle |
| `readFileSync`, synchronous HTTP, or heavy computation on main thread | AP-04: Blocking Main Thread | Profile event loop lag or UI responsiveness |
| `el.offsetHeight` followed by `el.style.height =` in a loop | AP-05: Layout Thrashing | Separate reads and writes into distinct passes |
| Image files >500KB or `<img>` without `loading="lazy"` | AP-06: Unoptimized Images | Check format, compression, and responsive sizing |
| `.map()` rendering list with no `limit` and data source can grow | AP-07: No Pagination | Check maximum possible list size in production |
| Inline `() =>` or `{{ }}` object literals in JSX props | AP-08: Unnecessary Re-renders | Check if child component uses React.memo |
| `import` of full library when one function is needed | AP-09: Large Bundle | Run bundle analyzer; check tree-shaking |
| `new Connection()` or `createConnection()` in a request handler | AP-10: No Connection Pooling | Check if a pool is configured and connections are returned |
| Multiple `fetch()` calls to same API with different IDs | AP-11: Excessive Requests | Check if a batch endpoint exists or could be created |
| `console.log` or `logger.debug` inside a loop | AP-12: Logging in Hot Paths | Check if this code runs >100x/second in production |
| API response JSON significantly larger than data rendered | AP-13: Over-Fetching | Compare response payload to fields actually used |
| `setInterval` + `fetch` | AP-14: Polling | Check if the server supports WebSocket or SSE |
| Static files served from same origin as API, no cache headers | AP-15: No CDN | Check response headers for CDN indicators |
| `array.includes()` or `array.find()` inside a loop | AP-16: Quadratic Algorithm | Convert to Set or Map for O(1) lookups |
| `JSON.parse(JSON.stringify(obj))` | AP-17/AP-18: Sync Serialization / Unnecessary Clone | Use structuredClone or shallow copy if sufficient |
| `cloneDeep()` when only 1-2 fields change | AP-18: Unnecessary Deep Copy | Use spread operator or Immer |
| `appendChild()` inside a loop on a live DOM node | AP-19: Excessive DOM Manipulation | Use DocumentFragment or virtual DOM |
| `string += value` inside a loop (Java, C#, Python) | AP-20: String Concatenation | Use StringBuilder or join() |
| All route components imported statically at entry point | AP-21: No Lazy Loading | Use dynamic imports / React.lazy |

---

*Researched: 2026-03-08 | Sources: [PlanetScale: N+1 Query Problem](https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it), [Sentry: N+1 Queries](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-queries/), [Sentry: Missing Indexes](https://blog.sentry.io/missing-indexes-are-slowing-down-your-database-heres-how-to-find-and-fix/), [Cloudflare: Cloudbleed Incident Report](https://blog.cloudflare.com/incident-report-on-memory-leak-caused-by-cloudflare-parser-bug/), [Elastic: Memory Leak Post-Mortem](https://www.elastic.co/blog/postmortem-memory-leak-hunting-windows), [Ayende: RavenDB Memory Leak](https://ayende.com/blog/195681-B/production-postmortem-the-memory-leak-that-only-happened-on-linux), [Node.js: Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop), [Trigger.dev: Event Loop Lag](https://trigger.dev/blog/event-loop-lag), [Ashby: Detecting Event Loop Blockers](https://www.ashbyhq.com/blog/engineering/detecting-event-loop-blockers), [Paul Irish: What Forces Layout](https://gist.github.com/paulirish/5d52fb081b3570c81e3a), [Google web.dev: Layout Thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing), [MDN: Fix Image LCP](https://developer.mozilla.org/en-US/blog/fix-image-lcp/), [Google web.dev: Code Splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting), [Smashing Magazine: Bundle Performance](https://www.smashingmagazine.com/2022/02/javascript-bundle-performance-code-splitting/), [DebugBear: React Rerenders](https://www.debugbear.com/blog/react-rerenders), [Stack Overflow: Connection Pooling](https://stackoverflow.blog/2020/10/14/improve-database-performance-with-connection-pooling/), [dotnet/aspnetcore#18089: Connection Pool Exhaustion](https://github.com/dotnet/aspnetcore/issues/18089), [Ably: WebSockets vs Long Polling](https://ably.com/blog/websockets-vs-long-polling), [Cloudflare: CDN Performance](https://www.cloudflare.com/learning/cdn/performance/), [Sivachandran: Logging in Hot Paths](https://www.sivachandran.in/2021/03/logging-overhead-in-hot-code-path.html), [Redfin: Java String Concatenation](https://redfin.engineering/java-string-concatenation-which-way-is-best-8f590a7d22a8), [JetBrains: String Concatenation in Loop](https://www.jetbrains.com/help/inspectopedia/StringContatenationInLoop.html), [Nordic APIs: Overfetching](https://nordicapis.com/how-to-avoid-overfetching-and-underfetching/), [ACM Queue: Performance Anti-Patterns](https://queue.acm.org/detail.cfm?id=1117403), [Microsoft Azure: Performance Antipatterns](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/), [Android Developers: ANRs](https://developer.android.com/topic/performance/vitals/anr), [UChicago: Performance Diagnosis for Inefficient Loops](https://people.cs.uchicago.edu/~shanlu/paper/ICSE-TR-105.pdf)*
