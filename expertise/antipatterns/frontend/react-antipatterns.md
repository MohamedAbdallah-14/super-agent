# React Anti-Patterns
> **Domain:** Frontend
> **Anti-patterns covered:** 20
> **Highest severity:** High

React's component model and hooks API are expressive but present a wide surface area for misuse. Many of these patterns feel correct in isolation — they compile, they run, they even pass shallow tests — yet they silently degrade performance, correctness, or maintainability. This module catalogs the 20 most consequential React anti-patterns observed in production codebases, sourced from real-world audits, community post-mortems, and the official React documentation's own "you might not need an effect" guidance.

Each entry is classified by how often it appears, how badly it hurts, and how hard it is to catch without tooling.

---

## Anti-Pattern Entries

---

### AP-01: Prop Drilling Through Many Layers

**Also known as:** Threading props, Christmas-tree props, prop tunneling
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```jsx
// App passes `user` through 4 layers that don't use it
function App() {
  const user = useCurrentUser();
  return <Layout user={user} />;
}
function Layout({ user }) {
  return <Sidebar user={user} />;
}
function Sidebar({ user }) {
  return <NavMenu user={user} />;
}
function NavMenu({ user }) {
  return <Avatar name={user.name} />;  // Only this component needs it
}
```

**Why developers do it:**
It works, and when a codebase starts small it is the most obvious path. Developers reach for it by default because it requires no new abstractions.

**What goes wrong:**
- Every intermediate component takes on a prop it does not use, coupling unrelated layers
- Refactoring the prop type (e.g., renaming `user.name` to `user.displayName`) requires touching every intermediate component
- Adding a second consumer at a different level requires reopening multiple files
- Tests for intermediate components must supply the prop even though it is irrelevant to their behaviour

**The fix:**
```jsx
// Before: 4-layer thread
// After: Context at the appropriate boundary

const UserContext = React.createContext(null);

function App() {
  const user = useCurrentUser();
  return (
    <UserContext.Provider value={user}>
      <Layout />
    </UserContext.Provider>
  );
}

function Avatar() {
  const user = useContext(UserContext);
  return <img src={user.avatarUrl} alt={user.name} />;
}
```
Alternatively, use component composition (slot pattern) to pass `<Avatar />` directly without threading props.

**Detection rule:**
Flag any prop that appears in a component's props signature but is never read by that component's JSX or logic — only forwarded to a child.

---

### AP-02: Using useEffect for Derived State

**Also known as:** Effect-driven derivation, useState + useEffect sync pattern
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```jsx
function ProductList({ products, filter }) {
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    setFiltered(products.filter(p => p.category === filter));
  }, [products, filter]);

  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

**Why developers do it:**
Developers treat `useEffect` as "run code when things change", which sounds like the right tool for deriving a new value from props.

**What goes wrong:**
- Causes a guaranteed double render: first render uses stale `filtered`, effect fires, second render uses fresh value
- Introduces a state variable that exists solely to hold a value calculable inline
- Can trigger cascading effect chains when the derived state is itself a dependency elsewhere
- React's documentation explicitly names this as one of the most common misuses of `useEffect`

**The fix:**
```jsx
// Before: effect + state
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(products.filter(p => p.category === filter));
}, [products, filter]);

// After: plain derivation during render
const filtered = products.filter(p => p.category === filter);
// Wrap in useMemo only if the computation is measurably expensive
const filtered = useMemo(
  () => products.filter(p => p.category === filter),
  [products, filter]
);
```

**Detection rule:**
Flag any `useEffect` whose sole body is a `setState` call where the new value is a pure transformation of the effect's dependencies.

---

### AP-03: Index as List Key

**Also known as:** Array index key, positional key
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />  // index as key
      ))}
    </ul>
  );
}
```

**Why developers do it:**
`index` is always available when mapping, so it is the path of least resistance. ESLint's `react/jsx-key` rule only checks that a key exists — not that it is stable.

**What goes wrong:**
- When items are reordered, added to the middle, or removed, React reconciles by position rather than identity, causing wrong components to be updated, wrong animations to fire, and uncontrolled inputs to show stale values
- Component state (form inputs, scroll position, focus) migrates to the wrong item silently
- Particularly destructive in drag-and-drop lists and paginated tables

**The fix:**
```jsx
// Before: index key
todos.map((todo, index) => <TodoItem key={index} todo={todo} />)

// After: stable unique key
todos.map(todo => <TodoItem key={todo.id} todo={todo} />)

// If items have no ID, derive a stable key from a unique field combination
todos.map(todo => <TodoItem key={`${todo.userId}-${todo.createdAt}`} todo={todo} />)
```

**Detection rule:**
Flag any `key={index}` or `key={i}` where the variable name matches the second argument of a `.map()` callback.

---

### AP-04: Mutating State Directly

**Also known as:** Direct state mutation, in-place array/object mutation
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```jsx
function Cart() {
  const [items, setItems] = useState([]);

  function addItem(item) {
    items.push(item);      // mutation
    setItems(items);       // same reference — React bails out
  }

  function updateQty(id, qty) {
    const item = items.find(i => i.id === id);
    item.qty = qty;        // nested mutation
    setItems([...items]);  // spread creates new array but objects are still mutated
  }
}
```

**Why developers do it:**
JavaScript arrays and objects are mutable by default. Developers coming from non-React backgrounds (or from class components with `this.state`) expect mutation to be the normal model.

**What goes wrong:**
- `setItems(items)` after mutation passes the same reference; React's `Object.is` check short-circuits and skips the re-render
- Mutated objects break `React.memo`, `useMemo`, and `useCallback` because their dependencies appear unchanged
- Mutations bypass Redux DevTools time-travel and React DevTools state snapshots
- Concurrently rendered trees can read inconsistent intermediate states

**The fix:**
```jsx
// Before: mutation
items.push(item);
setItems(items);

// After: new reference
setItems(prev => [...prev, item]);

// Before: nested mutation
item.qty = qty;
setItems([...items]);

// After: immutable update
setItems(prev =>
  prev.map(i => i.id === id ? { ...i, qty } : i)
);
```

**Detection rule:**
Flag calls to `.push()`, `.pop()`, `.splice()`, `.sort()`, `.reverse()`, or direct property assignment (`obj.key = value`) on variables that are the first argument of a `useState` destructure or `useReducer` state binding.

---

### AP-05: Creating Components Inside Render

**Also known as:** Inline component definition, component factory inside JSX, nested component declaration
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```jsx
function ParentList({ items }) {
  // New function reference every render
  const Item = ({ text }) => <li className="item">{text}</li>;

  return (
    <ul>
      {items.map(item => <Item key={item.id} text={item.label} />)}
    </ul>
  );
}
```

**Why developers do it:**
It keeps related code co-located and avoids creating a separate named component for something that feels "small". It also gives the inner component easy access to the parent's scope.

**What goes wrong:**
- Every render of `ParentList` creates a new `Item` function reference
- React sees a new component type at the same tree position and unmounts + remounts every `<Item />` — destroying DOM nodes, focus state, and any component-local state
- Negates any memoisation on the inner component entirely
- Creates invisible performance cliffs that only appear under load

**The fix:**
```jsx
// Before: defined inside render
function ParentList({ items }) {
  const Item = ({ text }) => <li>{text}</li>;
  return <ul>{items.map(item => <Item key={item.id} text={item.label} />)}</ul>;
}

// After: defined at module scope (or in its own file)
function Item({ text }) {
  return <li className="item">{text}</li>;
}

function ParentList({ items }) {
  return <ul>{items.map(item => <Item key={item.id} text={item.label} />)}</ul>;
}
```

**Detection rule:**
Flag any function or arrow-function declaration that (a) returns JSX, (b) begins with an uppercase letter, and (c) is declared inside the body of another React component function.

---

### AP-06: useEffect as onChange Handler

**Also known as:** Reactive effect for synchronous events, watching state with effects
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Treating useEffect like an onChange watcher
  useEffect(() => {
    if (query) {
      const filtered = allItems.filter(i => i.name.includes(query));
      setResults(filtered);
    }
  }, [query]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**Why developers do it:**
The mental model of "do X whenever Y changes" maps naturally to `useEffect`. It mimics Vue's watchers and MobX reactions.

**What goes wrong:**
- The state update in the effect schedules a second render; synchronous derived logic can run inline
- Creates temporal coupling: the user sees the old `results` for one render cycle before the effect fires
- Harder to trace the data flow — `results` appears to update magically rather than at the call site
- Opens the door for accidental infinite loops when the derived state is also a dependency

**The fix:**
```jsx
// Before: effect watcher
useEffect(() => {
  setResults(allItems.filter(i => i.name.includes(query)));
}, [query]);

// After: inline derivation (synchronous, zero extra renders)
const results = query
  ? allItems.filter(i => i.name.includes(query))
  : [];
// Move setQuery+derivation into the event handler if side effects are also needed
function handleChange(e) {
  const q = e.target.value;
  setQuery(q);
  // fire async fetch here if needed, not in an effect watching query
}
```

**Detection rule:**
Flag any `useEffect` that watches a single state variable and whose only body is a `setState` call producing a derived value from that variable.

---

### AP-07: Not Cleaning Up Effects

**Also known as:** Leaking effects, missing cleanup, unmounted component state updates
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => setUser(data));  // setState after potential unmount
  }, [userId]);
}
```

**Why developers do it:**
The happy path works. Most developers learn the two-argument form of `useEffect` but are not taught that the callback's return value is a cleanup function.

**What goes wrong:**
- If the component unmounts before the fetch resolves, `setUser` runs on an unmounted component, producing a React warning and, in some cases, subtle state corruption if the component remounts
- Race conditions: rapid `userId` changes queue multiple fetches; a slow earlier response can overwrite a fast later one
- Subscriptions (WebSockets, event listeners, timers) run indefinitely after the component is gone, leaking memory and producing phantom state updates

**The fix:**
```jsx
useEffect(() => {
  let cancelled = false;
  const controller = new AbortController();

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => {
      if (!cancelled) setUser(data);
    })
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => {
    cancelled = true;
    controller.abort();
  };
}, [userId]);
```

**Detection rule:**
Flag any `useEffect` that contains a `fetch()` call, a `setTimeout`/`setInterval`, or an `.addEventListener()` call and whose callback does not return a cleanup function.

---

### AP-08: Unnecessary useMemo / useCallback

**Also known as:** Premature memoisation, defensive wrapping, cargo-cult hooks
**Frequency:** Very Common
**Severity:** Low
**Detection difficulty:** Hard

**What it looks like:**
```jsx
function Greeting({ name }) {
  // Memoising a trivial string concatenation
  const greeting = useMemo(() => `Hello, ${name}!`, [name]);

  // Memoising a handler on a non-memoised child
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <button onClick={handleClick}>{greeting}</button>;
}
```

**Why developers do it:**
Developers cargo-cult patterns from performance-critical code, "just to be safe". Code reviews sometimes reward defensive memoisation without verifying that the memoised boundary is actually a performance bottleneck.

**What goes wrong:**
- `useMemo` and `useCallback` add overhead on every render (dependency comparison, closure allocation) — they make the initial render measurably slower
- The memoised value is only useful if the consumer is wrapped in `React.memo`; without that, the parent re-render forces child re-renders regardless
- Adds cognitive noise, making it harder to distinguish meaningful memoisation from boilerplate
- With the React Compiler (stable as of late 2025), manual memoisation is largely redundant and can conflict with compiler optimisations

**The fix:**
Remove the hooks. Add them back only after profiling shows a specific render as a bottleneck, and only when the memoised value is consumed by a `React.memo`-wrapped child or is a referentially stable dependency of another hook.

**Detection rule:**
Flag `useMemo` calls whose computation is a simple expression (string template, arithmetic, property access) or `useCallback` calls whose dependencies array is `[]` and the callback is not passed to a `React.memo`-wrapped component.

---

### AP-09: Missing useMemo / useCallback Causing Re-renders

**Also known as:** New reference on every render, unstable prop identity, memoisation gap
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
```jsx
function Dashboard({ userId }) {
  // New object reference every render
  const config = { userId, theme: 'dark' };

  // New function reference every render
  const fetchData = () => fetch(`/api/data?user=${userId}`);

  return <ExpensiveChart config={config} onRefresh={fetchData} />;
}

// ExpensiveChart is wrapped in React.memo — but memo is useless here
const ExpensiveChart = React.memo(({ config, onRefresh }) => { ... });
```

**Why developers do it:**
The broken memoisation chain is invisible. `React.memo` looks correct in isolation, but the parent silently destroys its effectiveness by producing new references every render.

**What goes wrong:**
- `React.memo` performs a shallow comparison; new object/function references always fail the comparison, triggering a re-render regardless of whether the data changed
- Expensive computations re-run on every parent re-render
- Can cause cascading re-renders through a subtree

**The fix:**
```jsx
function Dashboard({ userId }) {
  const config = useMemo(() => ({ userId, theme: 'dark' }), [userId]);
  const fetchData = useCallback(() => fetch(`/api/data?user=${userId}`), [userId]);

  return <ExpensiveChart config={config} onRefresh={fetchData} />;
}
```

**Detection rule:**
Flag object literals (`{}`) and function expressions/arrow functions created inline as JSX props on components that are wrapped in `React.memo`.

---

### AP-10: God Component (500+ Line Components)

**Also known as:** Monolithic component, kitchen-sink component, do-everything component
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```jsx
// UserDashboard.jsx — 800 lines
function UserDashboard() {
  // 15+ useState hooks
  // 8+ useEffect hooks
  // Inline form handling, API fetching, data transformation,
  // role-based rendering, modal management, CSV export logic...
  return (
    <div>
      {/* 300 lines of deeply nested JSX */}
    </div>
  );
}
```

**Why developers do it:**
Features accrete incrementally. A 100-line component becomes 200 lines, then 400, each addition feeling like a small change. The cost is invisible until the component becomes unmaintainable.

**What goes wrong:**
- A single change requires reading and reasoning about hundreds of lines of unrelated logic
- Testing requires mocking every concern the component touches
- Re-renders are expensive because a single state change invalidates a massive render tree
- Impossible to reuse sub-behaviours in other contexts
- New developers on the team avoid touching the component, causing further feature drift

**The fix:**
Extract by concern:
- Split data-fetching into a custom hook (`useUserDashboardData`)
- Extract each logical section into its own component (`UserProfile`, `ActivityFeed`, `ExportPanel`)
- Move business logic out of JSX into pure functions

Target: no component should exceed ~150 lines; no component should contain more than 3–4 `useEffect` hooks.

**Detection rule:**
Flag any component function whose source length exceeds 200 lines or contains more than 5 `useState` calls.

---

### AP-11: Using Context for Frequently Changing Values

**Also known as:** God context, context performance trap, high-frequency context updates
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
```jsx
const AppContext = React.createContext();

function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  // Mouse position changes 60 times/second — all consumers re-render
  return (
    <AppContext.Provider value={{ mousePos, user, theme, setTheme }}>
      <Router />
    </AppContext.Provider>
  );
}
```

**Why developers do it:**
Context is introduced to solve prop drilling, then values are added to it progressively. It starts with `user` and `theme`, then gains `mousePos`, `notifications`, cart counts, and more.

**What goes wrong:**
- Every consumer of the context re-renders whenever **any** value in the context object changes
- Frequently updating values (mouse position, animation frame counters, live websocket data) will cause every consumer to re-render at that frequency
- React has no built-in mechanism to subscribe to a subset of context values

**The fix:**
```jsx
// Split contexts by change frequency
const UserContext = React.createContext(null);       // static after login
const ThemeContext = React.createContext('light');    // rare changes
const MouseContext = React.createContext({ x: 0, y: 0 }); // frequent — move to Zustand/Jotai or pass directly

function App() {
  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <Router />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```
For high-frequency values, prefer a fine-grained state library (Zustand, Jotai) or a subscription-based pattern.

**Detection rule:**
Flag context `value` props that are object literals containing more than 4 keys, or that include values derived from `requestAnimationFrame`, scroll, or mouse event handlers.

---

### AP-12: Fetching in useEffect Without Abort / Cleanup

**Also known as:** Unguarded fetch, race-condition fetch, fire-and-forget effect
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```jsx
function ArticleView({ articleId }) {
  const [article, setArticle] = useState(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then(r => r.json())
      .then(setArticle);
    // No cleanup, no abort, no race-condition guard
  }, [articleId]);
}
```

**Why developers do it:**
The basic `fetch` + `useEffect` pattern is taught in introductory React courses without the cleanup addendum. The bug only manifests under fast navigation or slow networks.

**What goes wrong:**
- Navigating between articles quickly can cause an older, slower request to resolve after a newer one, displaying stale content
- React's StrictMode double-invokes effects, immediately triggering a second fetch that the first cannot cancel
- Memory leaks in long-running SPAs as references pile up
- "Can't perform a React state update on an unmounted component" warnings in production logs

**The fix:**
```jsx
useEffect(() => {
  const controller = new AbortController();
  setLoading(true);

  fetch(`/api/articles/${articleId}`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => {
      setArticle(data);
      setLoading(false);
    })
    .catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    });

  return () => controller.abort();
}, [articleId]);
```
Better still: use a data-fetching library (React Query, SWR) that handles all of this by default.

**Detection rule:**
Flag any `useEffect` containing a `fetch()` call that does not return a cleanup function calling `AbortController.abort()` or equivalent.

---

### AP-13: Not Handling Loading / Error / Empty States

**Also known as:** Happy-path-only UI, missing state branches, undefined UI
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```jsx
function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  // What shows during load? What if fetch fails? What if users is []?
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

**Why developers do it:**
Initial development focuses on the data-available path. Empty and error states are treated as edge cases to add "later" — and later often never arrives.

**What goes wrong:**
- Users see a blank screen during fetch with no indication that anything is happening
- A failed request is silent; users do not know whether to wait or retry
- An empty response looks identical to a loading state or an error state
- Production incidents are harder to debug because the UI gives no indication of which branch was hit

**The fix:**
```jsx
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { /* ... with cleanup ... */ }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (users.length === 0) return <EmptyState message="No users found." />;

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**Detection rule:**
Flag any component that renders a list derived from an async source but does not contain branches for at least two of: loading state, error state, empty-array state.

---

### AP-14: Using dangerouslySetInnerHTML

**Also known as:** Raw HTML injection, innerHTML prop, XSS gateway
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```jsx
function BlogPost({ post }) {
  return (
    <article
      dangerouslySetInnerHTML={{ __html: post.content }}
    />
  );
}
```

**Why developers do it:**
CMS content, rich-text editors, and Markdown renderers produce HTML strings. `dangerouslySetInnerHTML` is the only built-in way to inject raw HTML into the DOM, and its name is sometimes read as a warning rather than a stop sign.

**What goes wrong:**
- If `post.content` contains any user-controlled data (comments, user profile fields, URL parameters) an attacker can inject `<script>` tags or event handler attributes, achieving stored or reflected XSS
- React's automatic HTML escaping is completely bypassed
- Content Security Policy headers may not fully mitigate DOM-based injection
- Search engine crawlers may not index dynamically injected HTML reliably

**The fix:**
```jsx
import DOMPurify from 'dompurify';

// Option A: sanitise before injecting
function BlogPost({ post }) {
  const clean = DOMPurify.sanitize(post.content);
  return <article dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Option B (preferred): use a Markdown/rich-text renderer that produces React elements
import ReactMarkdown from 'react-markdown';
function BlogPost({ post }) {
  return <article><ReactMarkdown>{post.markdownContent}</ReactMarkdown></article>;
}
```

**Detection rule:**
Flag every occurrence of `dangerouslySetInnerHTML` as requiring a security review comment; flag any occurrence where the `__html` value is not the return value of a recognised sanitisation function (`DOMPurify.sanitize`, `sanitizeHtml`, etc.).

---

### AP-15: Not Using Error Boundaries

**Also known as:** Missing error boundary, unguarded render tree, uncaught render error
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
```jsx
// Root renders everything with no error boundary
function App() {
  return (
    <Router>
      <UserProfile />      {/* Any render error here... */}
      <ActivityFeed />     {/* ...or here... */}
      <RecommendedPosts /> {/* ...or here unmounts the entire app */}
    </Router>
  );
}
```

**Why developers do it:**
React's Error Boundary API requires a class component, which feels out of place in a hooks-based codebase. Developers either don't know the API or delay adding it.

**What goes wrong:**
- An unhandled JavaScript error during render, in a lifecycle method, or in a constructor propagates up and unmounts the **entire React tree** — users see a blank white screen
- No user-facing recovery path; the only option is a full page reload
- Errors in third-party components (analytics widgets, ad scripts embedded in React trees) can bring down the whole application

**The fix:**
```jsx
// Use react-error-boundary (de-facto standard utility)
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary fallback={<AppCrashPage />}>
      <Router>
        <ErrorBoundary fallback={<WidgetError />}>
          <UserProfile />
        </ErrorBoundary>
        <ActivityFeed />
      </Router>
    </ErrorBoundary>
  );
}
```
Add error boundaries at: (1) the app root, (2) each major route, (3) each independently-loaded widget or panel.

**Detection rule:**
Flag any `ReactDOM.render` or `createRoot().render()` call where the root component is not wrapped in, or does not itself contain, at least one `ErrorBoundary` (class or `react-error-boundary`).

---

### AP-16: Mixing Controlled and Uncontrolled Components

**Also known as:** Hybrid input, value/defaultValue conflict, controlled-to-uncontrolled switch
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```jsx
function ProfileForm({ initialName }) {
  const [name, setName] = useState(initialName); // may be undefined initially

  return (
    <input
      value={name}              // controlled when name is defined
      onChange={e => setName(e.target.value)}
    />
    // If initialName is undefined, value={undefined} makes React treat this
    // as uncontrolled; when state later becomes a string, React emits a warning
    // and behaviour is undefined
  );
}
```

**Why developers do it:**
The bug is triggered by an undefined or null initial value, which is easy to miss in development when data is always present but manifests in production during loading states.

**What goes wrong:**
- React warns: "A component is changing an uncontrolled input to be controlled"
- The input's internal DOM value and React's state value diverge, causing the input to display stale data
- Form submission may read the wrong value depending on which controller wins
- Hydration mismatches in SSR applications

**The fix:**
```jsx
// Always initialise state with a defined value
const [name, setName] = useState(initialName ?? '');

// Or choose uncontrolled deliberately with a ref
const nameRef = useRef(null);
<input ref={nameRef} defaultValue={initialName ?? ''} />
```
Never mix `value` and `defaultValue` on the same input. Never let a controlled input's `value` become `undefined` or `null`.

**Detection rule:**
Flag inputs that use `value={someVar}` where `someVar` could be `undefined` or `null` based on its type annotation or initial `useState` value.

---

### AP-17: useState for Everything (Not Lifting State)

**Also known as:** State isolation, duplicate state, out-of-sync sibling state
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
```jsx
function App() {
  return (
    <>
      <FilterPanel />   {/* owns selectedCategory state */}
      <ProductList />   {/* needs selectedCategory but can't access it */}
    </>
  );
}

function FilterPanel() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  // ProductList can never know about this
}
```

**Why developers do it:**
Co-locating state with the component that first needs it is correct practice — until a sibling component also needs it. Developers often add a second `useState` in the sibling and try to keep them in sync with effects.

**What goes wrong:**
- Two copies of the same truth must be kept in sync manually (usually with effects — see AP-02 and AP-06)
- Sync logic is fragile; any event path that updates one copy but not the other causes stale UI
- The data flow becomes implicit and hard to trace
- Tests must simulate both state machines

**The fix:**
```jsx
// Lift to the lowest common ancestor
function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  return (
    <>
      <FilterPanel category={selectedCategory} onCategoryChange={setSelectedCategory} />
      <ProductList category={selectedCategory} />
    </>
  );
}
```

**Detection rule:**
Flag sibling components that declare `useState` with names that appear semantically equivalent (e.g., `selectedId`/`activeId`, `filter`/`currentFilter`), or that contain `useEffect` hooks whose only purpose is to mirror another component's prop or state.

---

### AP-18: Too Many useState Variables (Should be useReducer)

**Also known as:** useState explosion, fragmented state, scattered state variables
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
```jsx
function CheckoutForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  // ...6 more
}
```

**Why developers do it:**
`useState` is simpler to learn and reach for. The explosion happens gradually — each addition feels like adding one variable.

**What goes wrong:**
- Coordinated state transitions become error-prone: when submitting, you must remember to set `loading = true`, `error = null`, and clear fields simultaneously — miss one and the UI is inconsistent
- Invalid intermediate states become representable (e.g., `loading = true` and `error = 'Network timeout'` simultaneously)
- Reset logic must enumerate every variable individually
- Test setup for the component requires constructing many independent initial values

**The fix:**
```jsx
const initialState = {
  fields: { name: '', email: '', address: '', cardNumber: '', cvv: '' },
  ui: { loading: false, error: null, step: 1 },
  promo: { code: '', discount: 0 },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SUBMIT_START':
      return { ...state, ui: { ...state.ui, loading: true, error: null } };
    case 'SUBMIT_SUCCESS':
      return { ...state, ui: { loading: false, error: null, step: state.ui.step + 1 } };
    case 'SUBMIT_ERROR':
      return { ...state, ui: { ...state.ui, loading: false, error: action.payload } };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, initialState);
```

**Detection rule:**
Flag any component containing more than 5 `useState` declarations where the state variables share a logical domain (form fields, async status, wizard steps).

---

### AP-19: Stale Closures Over State

**Also known as:** Stale closure bug, captured stale value, hook dependency omission
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1);  // captures count=0 from mount closure
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // empty deps — count is never refreshed
}
```

**Why developers do it:**
Developers add `[]` to `useEffect` to mean "run once on mount", correctly for setup — but when the effect's callback references state, the closure freezes the value at the time of creation. This is a non-obvious consequence of how JavaScript closures work.

**What goes wrong:**
- `count` is always `0` inside the interval callback; the counter increments from 0 to 1 and then freezes
- Similar bugs appear in `useCallback` with stale `props`, in `setTimeout` handlers, and in event listeners registered once
- The bug is invisible in tests that don't advance time and in development under StrictMode if intervals are manually re-registered

**The fix:**
```jsx
// Option A: use the functional updater form (avoids reading state in closure)
useEffect(() => {
  const interval = setInterval(() => {
    setCount(prev => prev + 1);  // reads current state, not closed-over value
  }, 1000);
  return () => clearInterval(interval);
}, []);

// Option B: add count to deps (re-registers interval on every change)
useEffect(() => {
  const interval = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(interval);
}, [count]);

// Option C: use useRef to hold a mutable callback (advanced)
const savedCallback = useRef();
useEffect(() => { savedCallback.current = () => setCount(c => c + 1); });
useEffect(() => {
  const tick = () => savedCallback.current();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

**Detection rule:**
The `eslint-plugin-react-hooks` `exhaustive-deps` rule catches this automatically — flag any suppression comment (`// eslint-disable-next-line`) on a `useEffect`, `useCallback`, or `useMemo` dependency array.

---

### AP-20: Ignoring React.StrictMode Warnings

**Also known as:** StrictMode suppression, double-invoke blind spot, silenced dev warnings
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
```jsx
// Common "fix": remove StrictMode to silence the double-invoke noise
// Root file:
root.render(
  // <React.StrictMode>   <-- removed because "it caused bugs"
    <App />
  // </React.StrictMode>
);
```

**Why developers do it:**
`React.StrictMode` double-invokes render functions and effects in development to expose impure renders and missing cleanups. When this surfaces bugs, developers often interpret the double-invoke as the cause rather than the revealer and remove `StrictMode`.

**What goes wrong:**
- `StrictMode` removal hides real bugs that will manifest in React 18+ Concurrent Mode features (Suspense, transitions, deferred rendering), which legitimately re-invoke renders and effects
- The underlying bugs (impure renders, missing cleanup, mutated state) persist and surface in production under real concurrent rendering conditions
- Future upgrades to React become vastly more painful

**Common warnings and their root causes:**

| Warning | Root Cause |
|---|---|
| "Cannot update a component while rendering" | State update triggered during another component's render |
| "Each child in a list should have a unique key" | AP-03 |
| "Can't perform state update on unmounted component" | AP-07 or AP-12 |
| "A component is changing uncontrolled to controlled" | AP-16 |
| Double network requests in dev | Missing cleanup in AP-07 / AP-12 |

**The fix:**
Keep `<React.StrictMode>` enabled at all times during development. Treat every warning it surfaces as a bug to fix, not noise to suppress. Fix missing cleanups (AP-07), impure renders (AP-04), and unguarded effects (AP-12) rather than disabling the detector.

**Detection rule:**
Flag any `createRoot().render()` or `ReactDOM.render()` call that does not wrap the root in `<React.StrictMode>`. Flag any git commit that removes `StrictMode` without a documented architectural reason.

---

## Root Cause Analysis

The 20 anti-patterns above cluster into six underlying causes:

| Root Cause | Anti-Patterns | Core Problem |
|---|---|---|
| Mental model mismatch | AP-02, AP-06, AP-19 | Treating React's render model as a reactive event system or imperative loop |
| JavaScript primitive behaviour | AP-03, AP-04, AP-09 | Reference equality, array mutability, and closure capture are not React-specific |
| Incremental growth | AP-10, AP-17, AP-18 | Patterns that are correct at small scale become anti-patterns at scale |
| Missing lifecycle knowledge | AP-07, AP-12, AP-20 | Incomplete understanding of effect cleanup and StrictMode's purpose |
| Security / safety omission | AP-14, AP-15 | Features that require explicit opt-in to be safe |
| Performance misapplication | AP-08, AP-09, AP-11 | Memoisation and context tools used without understanding their cost model |

---

## Self-Check Questions

Use these during code review or self-review to catch the anti-patterns above before they reach production.

1. Does any component receive a prop it never reads — only passes to a child? *(AP-01)*
2. Is there a `useState` + `useEffect` pair where the only thing the effect does is call `setState` with a value derived from the dependencies? *(AP-02, AP-06)*
3. Are all list keys stable unique identifiers from the data domain, not array indices? *(AP-03)*
4. Are `.push()`, `.splice()`, or direct property assignments ever called on values from `useState`? *(AP-04)*
5. Are any components (starting with an uppercase letter, returning JSX) declared inside the body of another component function? *(AP-05)*
6. Does every `useEffect` that opens a subscription, sets a timer, or starts a fetch return a cleanup function? *(AP-07, AP-12)*
7. Is every `useMemo` and `useCallback` accompanied by a measurable reason and consumed by a `React.memo`-wrapped component or a hook dependency? *(AP-08, AP-09)*
8. Does any component exceed 150–200 lines or contain more than 5 `useState` hooks? *(AP-10, AP-18)*
9. Is context split by change frequency — fast-changing values isolated from slow-changing ones? *(AP-11)*
10. Do all data-fetching components render distinct UI for loading, error, and empty states? *(AP-13)*
11. Is every use of `dangerouslySetInnerHTML` sanitised with DOMPurify or an equivalent library? *(AP-14)*
12. Is there at least one `ErrorBoundary` at the app root and around each independently deployable UI section? *(AP-15)*
13. Can any controlled input's `value` prop evaluate to `undefined` or `null`? *(AP-16)*
14. Do sibling components manage state that they need to share — requiring an effect to keep them in sync? *(AP-17)*
15. Is `React.StrictMode` enabled in all development builds, and are its warnings treated as bugs? *(AP-20)*

---

## Code Smell Quick Reference

| Smell | Likely Anti-Pattern | Severity |
|---|---|---|
| `key={index}` in a `.map()` | AP-03 | High |
| `useState` + `useEffect` that only calls `setState` | AP-02, AP-06 | High |
| `useEffect` with no return value, contains `fetch()` | AP-07, AP-12 | High |
| `const Component = () =>` inside a component body | AP-05 | High |
| `dangerouslySetInnerHTML` without sanitisation call | AP-14 | High |
| `items.push(...)` followed by `setItems(items)` | AP-04 | High |
| Object literal `{}` or arrow function as prop on `React.memo` component | AP-09 | High |
| No `ErrorBoundary` wrapping route or root | AP-15 | High |
| 6+ `useState` declarations in one component | AP-10, AP-18 | Medium |
| Props passed through 3+ layers that an intermediate component ignores | AP-01 | Medium |
| `<React.StrictMode>` absent or commented out | AP-20 | Medium |
| `useMemo` on a simple expression (string, number, single property) | AP-08 | Low |
| Context provider whose `value` is an inline object `{{ a, b, c, d, e }}` | AP-11 | High |
| `value={someVar}` input with no fallback for `undefined` | AP-16 | Medium |
| No loading/error/empty branch in a component that fetches | AP-13 | Medium |
| `setInterval`/`setTimeout` in `useEffect` with `[]` deps and state read inside callback | AP-19 | High |

---

*Researched: 2026-03-08 | Sources: [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), [Kent C. Dodds — Prop Drilling](https://kentcdodds.com/blog/prop-drilling), [Kent C. Dodds — When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback), [Dmitri Pavlutin — Stale Closures in React Hooks](https://dmitripavlutin.com/react-hooks-stale-closures/), [LogRocket — 15 common useEffect mistakes](https://blog.logrocket.com/15-common-useeffect-mistakes-react/), [Nadia Makarevich — How to useMemo and useCallback: you can remove most of them](https://www.developerway.com/posts/how-to-use-memo-use-callback), [React Hooks Anti-Patterns — Tech Insights](https://techinsights.manisuec.com/reactjs/react-hooks-antipatterns/), [React 19 Compiler and memoisation](https://isitdev.com/react-19-compiler-usememo-usecallback-2025/), [React XSS and dangerouslySetInnerHTML — StackHawk](https://www.stackhawk.com/blog/react-xss-guide-examples-and-prevention/), [15 React Anti-Patterns — jsdev.space](https://jsdev.space/react-anti-patterns-2025/), [6 Common React Anti-Patterns — ITNEXT](https://itnext.io/6-common-react-anti-patterns-that-are-hurting-your-code-quality-904b9c32e933)]*
