# State Management Anti-Patterns

> Domain: Code | Applies to: All frameworks and languages with stateful logic
> Severity range: Medium to Critical | Module version: 1.0.0

State management is the single largest source of bugs in modern applications. Every
user-visible glitch -- a stale form, a phantom spinner, a lost edit -- traces back to
state that was duplicated, desynchronized, mutated behind someone's back, or simply
never modeled correctly. This module catalogs 20 recurring anti-patterns, drawn from
production incidents, framework issue trackers, and community post-mortems across
React, Angular, Vue, Flutter, SwiftUI, and backend systems in Java, Python, and Go.

---

## Anti-Pattern 1: Global Mutable Singleton

**Also known as:** God Object State, Ambient State, Service Locator State

**Frequency:** Very High | **Severity:** High | **Detection difficulty:** Medium

### What it looks like

A singleton class or module-level variable holds mutable application state accessible
from anywhere. In Java, a `SessionManager.getInstance().currentUser` mutated by
multiple threads. In Python, a module-level dictionary imported across files. In
JavaScript, a plain object on `window` or a module-scope `let` that multiple
components read and write.

### Why developers do it

It is the shortest path from "I need this data everywhere" to working code. Frameworks
historically encouraged it (e.g., AngularJS services, Android Application subclass).
Junior developers copy patterns from tutorials that skip dependency injection setup.

### What goes wrong

- **Concurrency bugs.** Two threads or two async callbacks mutate the same field; the
  last writer wins silently. An IEEE study (2020) found classes utilizing mutable
  global state are measurably more defect-prone.
- **Test pollution.** Test A mutates the singleton; test B reads stale values. Tests
  pass individually, fail when run together. Ordering-dependent test suites follow.
- **Hidden coupling.** Any file can import and mutate the singleton, creating invisible
  dependency graphs that resist refactoring.
- **Name collisions.** Third-party libraries using the same global key overwrite your
  state silently.

### The fix

Use dependency injection to pass state explicitly. In frontend apps, use scoped state
management (React Context, provider trees, Zustand stores). In backend systems, pass
state through function parameters or request-scoped containers. If a singleton is
truly needed, make it immutable and expose mutation only through controlled methods
with synchronization.

### Detection rule

```
Grep for module-level `let`/`var` assignments that are reassigned in multiple files.
Flag singleton classes with public mutable fields. In Java, flag `static` non-final
fields. In Python, flag module-scope mutable assignments imported by >2 modules.
```

---

## Anti-Pattern 2: State Duplication

**Also known as:** Denormalized State, Copy-Paste State, Dual Source of Truth

**Frequency:** Very High | **Severity:** High | **Detection difficulty:** Medium

### What it looks like

The same business entity exists in two or more places in the state tree. A user's
name lives in `authStore.user.name` and also in `profileStore.displayName`. An order
total is stored both on the order object and in a summary widget's local state. When
one copy updates, the other does not.

### Why developers do it

Different features are built by different teams or at different times. Each feature
grabs a snapshot of the data it needs. "I'll just copy it here so I don't have to
prop-drill." Denormalization feels like a performance optimization.

### What goes wrong

- **Drift.** User updates their name in settings; the header still shows the old name
  until full page reload.
- **Conflicting writes.** Two components update their local copy; the last write to
  the server wins, but the UI shows a mix of old and new data.
- **Reducer complexity explodes.** Every action that changes a shared entity must now
  update N locations, or you need cross-slice synchronization logic.

### The fix

Establish a single source of truth for each entity. Reference entities by ID and look
them up from a single normalized store. Use selectors or computed properties to derive
views. If denormalization is needed for performance, treat it as a read-only cache with
explicit invalidation.

### Detection rule

```
In Redux/Zustand: flag identical entity types stored under multiple top-level keys.
In any codebase: search for the same API response being spread into multiple state
locations without a shared reference.
```

---

## Anti-Pattern 3: Derived State Stored Separately

**Also known as:** Computed State in Store, The Synchronization Tax, Stale Derivation

**Frequency:** Very High | **Severity:** Medium | **Detection difficulty:** Low

### What it looks like

A value that can be computed from existing state is instead stored as its own state
variable. Example: storing both `items` (an array) and `itemCount` (a number). Storing
both `cart` and `cartTotal`. Using `useEffect` to update `fullName` whenever
`firstName` or `lastName` changes.

### Why developers do it

It feels like an optimization -- "why recompute every render?" Developers coming from
imperative backgrounds think in terms of cache variables. React's `useEffect` makes it
easy to set up "sync" logic that stores derived values.

### What goes wrong

- **Synchronization bugs.** The derived value lags the source by one render cycle, or
  the `useEffect` dependency array is incomplete, so it never updates.
- **Double renders.** Setting state inside `useEffect` triggers an extra render cycle
  that is completely unnecessary.
- **Bug surface area.** Every stored derivation is another variable that can fall out
  of sync, creating "impossible" UI states.

### The fix

Compute derived values inline during render. For expensive computations, use
memoization (`useMemo`, `computed()` in Vue/MobX, `createSelector` in Redux). The
principle: "Don't sync state -- derive it." Store the minimal canonical state and
compute everything else.

### Detection rule

```
Flag useEffect calls where the body contains only a setState call derived from other
state/props. Flag state variables whose names are prefixes/suffixes of other state
(e.g., items/itemCount, cart/cartTotal).
```

---

## Anti-Pattern 4: Mutable State Updates

**Also known as:** Direct Mutation, Reference Stomping, Shallow Copy Bypass

**Frequency:** High | **Severity:** High | **Detection difficulty:** Medium

### What it looks like

State is mutated in place instead of creating new references. Pushing to an array
with `state.items.push(newItem)` instead of `[...state.items, newItem]`. Assigning
`state.user.name = 'new'` directly. In Flutter, mutating a list and calling
`setState` without creating a new list instance.

### Why developers do it

Immutable updates are verbose. Developers from imperative backgrounds (Java, Python,
C++) think mutation is normal. The code "works" in simple cases because the component
happens to re-render for other reasons.

### What goes wrong

- **Silent render skips.** React, Flutter, and SwiftUI use reference equality checks.
  Mutating in place means the reference does not change, so the framework skips the
  re-render and the UI shows stale data.
- **Time-travel debugging breaks.** Redux DevTools and similar tools depend on
  immutable snapshots. Mutation makes every snapshot point to the same (current) object.
- **Undo/redo is impossible.** Without distinct state snapshots, there is no previous
  state to restore.

### The fix

Use immutable update patterns: spread operators, `Object.assign`, or libraries like
Immer that let you write mutation syntax while producing immutable updates under the
hood. In Dart/Flutter, use `copyWith` patterns. Enable linting rules that catch direct
mutations on state objects.

### Detection rule

```
ESLint: no-param-reassign on reducer parameters. In Redux Toolkit, Immer is built in.
Flag .push(), .splice(), .sort() on state arrays. Flag direct property assignment on
state objects outside of Immer produce() blocks.
```

---

## Anti-Pattern 5: Scattered State

**Also known as:** State Spaghetti, FrankenState, Orphaned State

**Frequency:** High | **Severity:** Medium | **Detection difficulty:** Hard

### What it looks like

Application state is spread across local component state, multiple context providers,
a Redux store, URL query parameters, localStorage, cookies, and in-memory caches --
with no clear ownership boundaries. A developer must check five different locations to
understand what data a screen is actually displaying.

### Why developers do it

Organic growth. The first feature used useState. The second needed sharing, so Context
was added. The third needed persistence, so localStorage was added. The fourth needed
server sync, so React Query appeared. Nobody drew a boundary diagram.

### What goes wrong

- **Contradictory state.** The URL says page 2 but the store says page 1. The cache
  says the item exists but localStorage says it was deleted.
- **Onboarding cost.** New developers cannot predict where to find or update a given
  piece of state without reading the entire codebase.
- **Refactoring paralysis.** Moving state from one location to another requires
  touching every consumer, so nobody does it.

### The fix

Categorize state into layers with clear ownership: (1) UI state stays local (open/close,
hover, focus), (2) Client state goes in a single client store (auth, preferences,
feature flags), (3) Server state is managed by a server-cache library (React Query,
SWR, Apollo), (4) URL state lives in the router. Document the boundary and enforce
it in code review.

### Detection rule

```
Audit: count distinct state management mechanisms in use. If >3, review whether
boundaries are documented. Flag components that read from both a global store and
local storage for the same entity.
```

---

## Anti-Pattern 6: Over-Centralized State

**Also known as:** Everything Store, God Store, Redux Maximalism

**Frequency:** High | **Severity:** Medium | **Detection difficulty:** Low

### What it looks like

Every piece of state -- including form input values, modal open/close flags, tooltip
visibility, and scroll position -- is stored in the global Redux/Vuex/NgRx store.
The store has hundreds of keys. Every keystroke dispatches an action through middleware.

### Why developers do it

"Single source of truth" is misunderstood as "single location for all state." Teams
adopt a rule like "all state in Redux" for consistency without evaluating what belongs
there. Tutorials demonstrate forms wired to Redux, and teams generalize.

### What goes wrong

- **Performance death.** Each dispatched action runs through every reducer. Broad
  selectors cause unrelated components to re-render on every keystroke.
- **Boilerplate explosion.** Action types, action creators, and reducer cases for
  opening a tooltip. Developer velocity drops.
- **Tight coupling.** Deleting a modal component requires also deleting its slice,
  actions, and selectors from a shared store, making components non-portable.

### The fix

Reserve global state for data that genuinely crosses component boundaries (auth tokens,
feature flags, entities shared by multiple routes). Keep ephemeral UI state local to
the component. Use server-cache libraries for API data instead of manually putting
fetch results into the store.

### Detection rule

```
Flag store keys that are read by exactly one component. Flag actions dispatched only
from the component that also reduces them. Measure store key count: >50 keys warrants
a review.
```

---

## Anti-Pattern 7: Missing Loading and Error States

**Also known as:** Happy Path Only, Optimistic Amnesia, Partial State Modeling

**Frequency:** Very High | **Severity:** Medium | **Detection difficulty:** Low

### What it looks like

An async operation has a state like `{ data: User | null }` with no representation
for loading or error. Or it has `isLoading` and `isError` as separate booleans that
can be true simultaneously, creating impossible combinations. The UI shows a blank
screen or stale data while a request is in flight.

### Why developers do it

The happy path is the first thing built and demoed. Loading and error states are "I'll
add those later" items that never get addressed. Separate booleans are the obvious
(but wrong) modeling choice.

### What goes wrong

- **Blank screens.** Data is null during loading; the component renders nothing or
  crashes on `.map()` of null.
- **Phantom spinners.** `isLoading` is set to true but never set to false on error,
  so the spinner runs forever.
- **Impossible states.** `isLoading: true, isError: true, data: staleData` -- the UI
  cannot decide what to render.

### The fix

Model async state as a discriminated union / tagged enum: `idle | loading | success
| error`. Each variant carries only the data relevant to that state. In TypeScript:
`type State = { status: 'idle' } | { status: 'loading' } | { status: 'success';
data: T } | { status: 'error'; error: Error }`. Use server-cache libraries that
model this correctly by default (React Query, SWR).

### Detection rule

```
Flag state objects with separate isLoading/isError/isSuccess booleans. Flag async
functions that set isLoading = true but have no finally/catch that resets it.
```

---

## Anti-Pattern 8: Stale Closure over State

**Also known as:** Zombie Callback, Captured State, Closure Time Warp

**Frequency:** High | **Severity:** High | **Detection difficulty:** Hard

### What it looks like

A callback or effect captures a state variable at creation time and continues to
reference that stale value after state updates. Classic example: a `setInterval`
inside `useEffect` that always logs `count` as 0 because it closed over the initial
render's value. An event listener registered once that reads state from its creation
scope.

### Why developers do it

Closures are a fundamental JavaScript mechanism and are invisible. Developers expect
the variable to "just have the latest value." The mental model of state as a box that
updates in place conflicts with React's model of state as a snapshot per render.

### What goes wrong

- **Silent data loss.** A save handler captures stale form data and overwrites the
  server with old values.
- **Infinite loops.** A stale dependency causes an effect to re-run when it should not,
  or never run when it should.
- **Intermittent bugs.** The bug only manifests when state changes between callback
  creation and callback execution -- timing-dependent and hard to reproduce.

### The fix

Use functional state updates: `setCount(prev => prev + 1)` instead of
`setCount(count + 1)`. Use refs for values that need to be read by callbacks without
triggering re-renders (`useRef` + `useEffect` to keep ref in sync). Use the
`eslint-plugin-react-hooks` exhaustive-deps rule. In newer React, `useEffectEvent`
(experimental) solves this by design.

### Detection rule

```
ESLint react-hooks/exhaustive-deps will flag most cases. Additionally flag
setInterval/setTimeout callbacks that reference state variables without using
functional updates.
```

---

## Anti-Pattern 9: Async State Race Conditions

**Also known as:** Last-Write-Wins, Stale Response, Out-of-Order Updates

**Frequency:** High | **Severity:** Critical | **Detection difficulty:** Hard

### What it looks like

User types in a search box. Requests for "a", "ab", "abc" fire in sequence. The
response for "a" arrives last (network jitter) and overwrites the correct result for
"abc." A rapid click on "Save" sends two requests; the second completes first, then
the first overwrites it. A component unmounts before its fetch completes and the
callback calls setState on an unmounted component.

### Why developers do it

Developers write `fetch(url).then(data => setState(data))` without considering that
multiple calls can be in flight simultaneously. The single-threaded mental model of
JavaScript obscures the fact that multiple promises can resolve in any order.

### What goes wrong

- **Wrong data displayed.** The UI shows results for a query the user has already
  moved past.
- **Data corruption.** An older mutation response overwrites a newer one on the server
  or in the client cache.
- **Memory leaks and warnings.** Setting state on unmounted components.

### The fix

Use an abort controller: `const controller = new AbortController()` passed to fetch,
and abort in the cleanup function. Or use a boolean ignore flag:
`useEffect(() => { let ignore = false; fetch().then(d => { if (!ignore) setData(d) });
return () => { ignore = true } })`. Prefer libraries like React Query / SWR / Apollo
that handle cancellation and deduplication automatically.

### Detection rule

```
Flag useEffect with async fetch calls that do not return a cleanup function. Flag
setState calls inside .then() without a guard. ESLint plugin eslint-plugin-react-hooks
flags missing cleanup in some cases.
```

---

## Anti-Pattern 10: Optimistic UI without Rollback

**Also known as:** Fire-and-Forget Optimism, Hope-Driven UI

**Frequency:** Medium | **Severity:** High | **Detection difficulty:** Medium

### What it looks like

The UI immediately reflects a user action (like deleting an item) without waiting for
the server response, but has no mechanism to revert the change if the server returns
an error. The item disappears from the list, the server rejects the delete (403), and
the item is gone from the UI but still exists on the server. A refresh brings it back,
confusing the user.

### Why developers do it

Optimistic UI is presented as a UX best practice -- "make the app feel instant." The
happy path is implemented first; rollback is deferred and forgotten. Rolling back is
genuinely hard when multiple optimistic mutations are queued.

### What goes wrong

- **Phantom state.** The UI and server disagree on reality. Users take further actions
  based on the phantom state, compounding the inconsistency.
- **Lost edits.** Optimistic create succeeds in UI, server rejects, user adds data to
  the phantom entity, all of which is lost on refresh.
- **Cascading failures.** Multiple optimistic updates build on each other; rolling back
  one requires rolling back all dependents.

### The fix

Always pair optimistic updates with a rollback path. Cache the previous state before
applying the optimistic change. On server error, restore the cached state and show a
user-facing error. Use libraries with built-in optimistic mutation support (React
Query's `onMutate` / `onError` / `onSettled`, Apollo's `optimisticResponse`). Avoid
optimistic UI for operations with high failure rates or irreversible consequences.

### Detection rule

```
Flag mutation functions that call setState before awaiting the server response but
have no catch/error handler that restores previous state. Review optimistic update
implementations for the presence of rollback logic.
```

---

## Anti-Pattern 11: State Management Library Overkill

**Also known as:** Redux for a Counter, Ceremony-Driven Development, Premature Architecture

**Frequency:** High | **Severity:** Low | **Detection difficulty:** Low

### What it looks like

A small application with 3-5 pieces of shared state uses Redux (or NgRx, or Vuex)
with full action/reducer/middleware/selector ceremony. A simple form has action types
like `SET_FIRST_NAME`, `SET_LAST_NAME`, `SET_EMAIL`. The boilerplate exceeds the
business logic by 5:1.

### Why developers do it

"We might scale later." Blog posts and conference talks showcase Redux for large apps,
and teams cargo-cult the same setup for a to-do app. Hiring managers list Redux as a
requirement, so developers use it everywhere to stay practiced.

### What goes wrong

- **Velocity death.** Adding a feature requires creating a slice, actions, selectors,
  and possibly sagas -- for something `useState` handles in one line.
- **Cognitive overhead.** New developers are overwhelmed by indirection before they
  even see the business logic.
- **Abandoned migration.** The team later wants to remove Redux but it is wired into
  everything, so it stays as legacy weight.

### The fix

Start with the simplest state mechanism (`useState`, `useReducer`, Context). Add a
state library only when you observe a concrete problem: prop drilling through 4+
levels, frequent cross-component state sharing, or need for time-travel debugging.
For server data, use a server-cache library instead of manually putting API data into
Redux.

### Detection rule

```
Count actions and reducers vs. components. If the ratio of actions to components
exceeds 3:1 and the app has fewer than 20 routes, evaluate whether the library is
justified.
```

---

## Anti-Pattern 12: Implicit State Machines (Boolean Soup)

**Also known as:** Boolean Flag Hell, Impossible States, Ad-Hoc State Modeling

**Frequency:** Very High | **Severity:** High | **Detection difficulty:** Low

### What it looks like

A component manages its state with multiple independent booleans: `isLoading`,
`isError`, `isSuccess`, `isRetrying`, `isOpen`, `isAnimating`. With 6 booleans
there are 64 possible combinations, but only 5-8 are valid. Nothing in the code
prevents the other 56+ impossible combinations.

### Why developers do it

Each boolean is added incrementally as new requirements emerge. "We need a loading
state" -- add a boolean. "Now we need error handling" -- add another boolean. The
cognitive load of each addition is small, but the combinatorial explosion is not
visible until bugs appear.

### What goes wrong

- **Impossible states.** `isLoading: true` AND `isError: true` simultaneously. The UI
  shows a spinner overlaid on an error message.
- **Missing transitions.** The code forgets to set `isLoading = false` in the error
  path. The spinner runs forever.
- **Untestable.** Testing 64 combinations is impractical, so edge cases go uncovered.
  Kent C. Dodds: "Stop using isLoading booleans."

### The fix

Replace boolean flags with a single status field modeled as a discriminated union or
enum: `type Status = 'idle' | 'loading' | 'success' | 'error'`. For complex flows,
use a state machine library (XState, Robot) that makes transitions explicit and
impossible states unreachable by construction.

### Detection rule

```
Flag components with 3+ boolean state variables whose names start with is/has/should.
Flag setState calls that set multiple booleans simultaneously. Static analysis: count
boolean state variables per component.
```

---

## Anti-Pattern 13: Zombie Child Problem

**Also known as:** Stale Props, Ghost Subscriber, Undead Component

**Frequency:** Medium | **Severity:** High | **Detection difficulty:** Hard

### What it looks like

A parent component renders a list of children connected to a global store. An action
deletes an entity from the store. The child component's subscription fires before the
parent re-renders and removes the child. The child tries to read the deleted entity
from the store, gets `undefined`, and throws. This was a well-documented issue in
React-Redux v5-v7 and remains possible with hooks-based store subscriptions.

### Why developers do it

External store subscriptions (Zustand, Redux with `useSelector`, custom pub-sub) do
not follow React's top-down rendering order. Child subscriptions can fire before
parent subscriptions, creating a window where the child exists but its data does not.

### What goes wrong

- **Runtime crashes.** `Cannot read property 'name' of undefined` on a component that
  is about to unmount but has not yet.
- **Inconsistent UI.** For a brief moment (often a single frame), the child renders
  with missing or default data before being unmounted.
- **Hard to reproduce.** Depends on subscription ordering and timing; may not appear
  in development but crashes in production under load.

### The fix

Defensive selectors: always guard against missing data (`const item = useSelector(s =>
s.items[id] ?? EMPTY_ITEM)`). React-Redux's `useSelector` catches errors thrown during
store-update-triggered selector execution and forces a re-render. When building custom
subscription hooks, implement stale-check guards. Libraries like Zustand handle this
via `useSyncExternalStore`.

### Detection rule

```
Flag selectors that access store properties via dynamic IDs without null/undefined
guards. Flag connected child components in lists that do not handle the case where
their entity has been deleted.
```

---

## Anti-Pattern 14: Props as Initial State

**Also known as:** Snapshot State, Stale Initialization, One-Time Copy

**Frequency:** High | **Severity:** Medium | **Detection difficulty:** Low

### What it looks like

A child component receives a prop and copies it into local state in the constructor
or `useState` initializer: `const [name, setName] = useState(props.name)`. When the
parent updates `props.name`, the child continues to display the old value because
`useState` only uses the initial value on mount.

### Why developers do it

The component needs to allow local edits (e.g., a form pre-filled from props). The
developer reaches for `useState` because they know the child needs its own mutable
copy. In class components, `getInitialState` from props was a common tutorial pattern.

### What goes wrong

- **Stale display.** Parent updates the entity; child shows outdated data until
  remounted.
- **Data loss.** User edits the child form, parent re-renders (but does not remount
  the child), user's edits are preserved but the prop change is lost. Or worse, a key
  change remounts the child and wipes user edits.
- **Source of truth confusion.** Is the parent or the child authoritative? Neither
  developer nor user can tell.

### The fix

If the child should always reflect the parent's data, do not use state -- use the prop
directly. If the child needs an editable copy, use a `key` prop tied to the entity ID
so React remounts on entity change: `<Editor key={user.id} user={user} />`. Name
initial-value props clearly: `initialValue` or `defaultValue` to signal intent. Use
controlled components where the parent owns both the value and the change handler.

### Detection rule

```
Flag useState calls where the initializer is a prop that is not named initial* or
default*. Flag components that both receive a prop and have state of the same name.
```

---

## Anti-Pattern 15: Two-Way Data Binding Chaos

**Also known as:** Bidirectional Mutation, Digest Cycle Storms, Ping-Pong State

**Frequency:** Medium | **Severity:** High | **Detection difficulty:** Medium

### What it looks like

Two or more components are bound bidirectionally to the same data source. Changing
component A updates the model, which triggers component B to update, which triggers
a watcher that updates the model again. In AngularJS, this manifested as infinite
digest cycles. In modern frameworks, it appears as circular `useEffect` chains or
Vue watchers that trigger each other.

### Why developers do it

Two-way binding is convenient for forms and feels natural: "the input and the model
should always agree." AngularJS made it the default. Vue's `v-model` encourages it.
Developers extend the pattern beyond simple inputs to complex cross-component
synchronization.

### What goes wrong

- **Infinite loops.** A changes B, B changes A, repeat. AngularJS had a hard limit of
  10 digest cycles before throwing. Modern frameworks may produce infinite re-render
  loops that freeze the browser.
- **Performance degradation.** Every binding creates watchers. Hundreds of bindings
  cause page lag on every keystroke.
- **Unpredictable data flow.** With bidirectional flows, data can arrive at a component
  from multiple directions, making debugging which source caused a change very
  difficult.

### The fix

Prefer unidirectional data flow: parent passes data down, child emits events up. Use
two-way binding only for leaf-level form inputs. For complex forms, use a form library
that manages the binding lifecycle (React Hook Form, Formik, Angular Reactive Forms).
Never create circular watcher/effect dependencies.

### Detection rule

```
Flag circular dependencies between useEffect hooks (effect A sets state that is a
dependency of effect B, and vice versa). Flag Vue watchers that modify the same data
they observe. In AngularJS, flag $watch callbacks that trigger $apply/$digest.
```

---

## Anti-Pattern 16: State Stored in DOM

**Also known as:** DOM as Database, jQuery State Management, Data Attribute Abuse

**Frequency:** Medium (declining) | **Severity:** Medium | **Detection difficulty:** Low

### What it looks like

Application state is stored in DOM elements: data attributes, hidden input fields,
CSS class names toggled to represent state, or jQuery's `$.data()` cache. A "selected"
state is tracked by the presence of a `.selected` CSS class rather than a JavaScript
variable. Form data is read from the DOM instead of maintained in a model.

### Why developers do it

This was the dominant pattern in the jQuery era. Developers new to frameworks sometimes
carry the habit forward. It is the path of least resistance when there is no state
management layer. Server-rendered pages with progressive enhancement sometimes start
this way.

### What goes wrong

- **Performance.** Reading state from the DOM requires DOM queries, which are orders of
  magnitude slower than reading a JavaScript variable.
- **Fragility.** A CSS refactor removes the `.selected` class, and the state mechanism
  silently breaks. DOM structure changes break querySelector-based state lookups.
- **No reactivity.** DOM mutations do not trigger framework-level re-renders. The UI
  and the "state" can diverge without any error.
- **Testability.** Testing requires a full DOM environment (JSDOM or a browser), making
  unit tests slow and brittle.

### The fix

Separate state from presentation. Store state in JavaScript variables, and let the
framework render the DOM from that state. If progressive enhancement is needed, read
initial state from DOM/data attributes once at startup and then manage it in JavaScript.

### Detection rule

```
Flag jQuery $.data() usage in codebases using React/Vue/Angular. Flag
document.querySelector used for reading state. Flag CSS class checks used in
conditional logic (classList.contains in business logic).
```

---

## Anti-Pattern 17: Storing Computed Values in State

**Also known as:** Redundant State, Memoization Confusion, Cache-in-State

**Frequency:** High | **Severity:** Low | **Detection difficulty:** Low

### What it looks like

State contains values that are purely derived from other state: `fullName` stored
alongside `firstName` and `lastName`. `filteredItems` stored alongside `items` and
`filterQuery`. `isValid` stored alongside the form fields it validates. These values
are updated via effects or event handlers that "sync" them with their sources.

### Why developers do it

It feels like caching. Developers worry about re-computing on every render. In class
components, there was no `useMemo` equivalent, so storing computed values was the norm.
Some developers confuse memoization with state management.

### What goes wrong

- **Sync bugs.** The computed value is updated in one code path but not another.
  `fullName` reflects a name change from the form but not from a server push.
- **Extra renders.** Setting state inside `useEffect` to "sync" triggers a second
  render cycle per update.
- **Increased state surface.** More state means more reducer cases, more tests, and
  more potential for inconsistency.

### The fix

Compute values inline: `const fullName = \`\${firstName} \${lastName}\``. For expensive
computations, use `useMemo` (React), `computed` (Vue/MobX), or `createSelector`
(Redux). These are memoization, not state, and they have no sync bugs because they
derive from the source directly.

### Detection rule

```
Flag state variables whose setter is only ever called inside useEffect with
dependencies that are other state variables. Flag state variables that are never set
by user actions, only by other state changes.
```

---

## Anti-Pattern 18: Not Normalizing Relational Data

**Also known as:** Nested State Tree, Deep Copy Hell, Entity Spaghetti

**Frequency:** High | **Severity:** Medium | **Detection difficulty:** Medium

### What it looks like

API responses are stored in state exactly as received: deeply nested objects with
embedded related entities. A `Post` object contains an array of `Comment` objects,
each containing a `User` object. Updating a user's avatar requires finding every post,
then every comment by that user, and updating each nested copy.

### Why developers do it

The API response shape is convenient -- it matches the UI hierarchy. Normalizing feels
like premature optimization. The initial code is simpler: just `setState(apiResponse)`.

### What goes wrong

- **Update complexity.** Changing one entity requires deep traversal and immutable
  updates at every nesting level. Reducers become deeply nested spread operations.
- **Inconsistency.** The same user appears in 15 comments with 15 copies of their
  avatar URL. Updating one and missing the others creates visual inconsistency.
- **Performance.** Deeply nested equality checks are expensive. Any change to any
  comment causes the entire post tree to be treated as changed.

### The fix

Normalize data into flat lookup tables: `{ users: { byId: {}, allIds: [] }, posts:
{ byId: {}, allIds: [] }, comments: { byId: {}, allIds: [] } }`. Use libraries like
`normalizr` to automate the transformation from API responses. Reference related
entities by ID. Use selectors to denormalize for display.

### Detection rule

```
Flag state objects nested more than 3 levels deep. Flag reducer spread operations
with more than 2 levels of nesting. Flag API responses stored directly in state
without transformation.
```

---

## Anti-Pattern 19: Exposing Internal State Implementation

**Also known as:** Leaky State Abstraction, Public Internals, State Coupling

**Frequency:** Medium | **Severity:** Medium | **Detection difficulty:** Medium

### What it looks like

A component or module exposes its internal state structure to consumers. A store's
shape becomes a public API contract: consumers directly access `store.state.ui.
modals.confirmDialog.isOpen` instead of calling `store.isConfirmDialogOpen()`. A class
exposes a mutable collection via a getter, allowing external code to modify internal
state without going through methods.

### Why developers do it

Direct property access is faster to write than defining a selector or method.
Encapsulation feels like over-engineering for "simple" state. In Redux, the state
shape is inherently visible to all selectors, making it easy to couple deeply.

### What goes wrong

- **Refactoring paralysis.** Renaming a state key or restructuring the state tree
  breaks every consumer that accessed it directly. What should be an internal change
  becomes a cross-codebase migration.
- **Invariant violations.** External code modifies internal state without going through
  validation logic, putting the module into an inconsistent state.
- **Brittle tests.** Tests assert against internal state shape instead of observable
  behavior, breaking on every internal refactor.

### The fix

Expose state through selectors, computed properties, or accessor methods. In Redux,
co-locate selectors with the slice and export only selectors, not the state shape.
In OOP, return defensive copies of collections, not references. In classes, make state
fields private and expose behavior through methods.

### Detection rule

```
Flag external files importing and accessing store state paths deeper than 2 levels.
Flag public mutable fields on state-holding classes. Flag tests that assert against
internal state structure rather than observable behavior.
```

---

## Anti-Pattern 20: Cache as Source of Truth

**Also known as:** Cache Statization, Client Mirror, Optimistic Cache

**Frequency:** Medium | **Severity:** High | **Detection difficulty:** Medium

### What it looks like

The application treats its client-side cache (Redux store, Apollo cache, React Query
cache) as the authoritative source of data rather than the server. Components read
from the cache and never re-fetch, even after mutations. Cache entries are manually
updated to avoid re-fetching, creating a parallel "database" in the browser. The
server and client gradually diverge.

### Why developers do it

Re-fetching feels wasteful. Cache updates are faster than round-trips. The app "works"
in demo environments where the user is the only client. Developers conflate "cache for
performance" with "cache as state."

### What goes wrong

- **Stale data.** Another user (or another tab) modifies the data on the server. The
  client never learns about it because it trusts its cache.
- **Cache invalidation bugs.** Manually updating cache entries after mutations is
  error-prone. Miss one cache key and the UI shows contradictory data.
- **Offline divergence.** The cache and server diverge during offline periods. Merging
  them back is a distributed systems problem that most apps are not equipped to solve.
- **FrankenState.** Half the data is managed as "state" in Redux, half as "cache" in
  React Query. Boundaries blur and data is duplicated across both.

### The fix

Treat the server as the source of truth and the client as a cache. Use server-cache
libraries (React Query, SWR, Apollo) with proper cache invalidation strategies:
refetch on mount, refetch on window focus, invalidate after mutations. Set appropriate
stale times. For truly offline-first apps, use dedicated offline sync solutions (e.g.,
WatermelonDB, PouchDB) rather than ad-hoc cache management.

### Detection rule

```
Flag manual cache.writeQuery / queryClient.setQueryData calls that are not
accompanied by an invalidation or refetch. Flag applications where server data is
only fetched once (on mount) and never refreshed. Flag store data that is >5 minutes
old with no TTL mechanism.
```

---

## Root Cause Analysis

Most state management anti-patterns trace back to five root causes:

### 1. No Ownership Model

When nobody defines which layer owns each piece of state, state proliferates across
layers and duplicates. Every team or feature creates its own state silo. The fix is
to create a state ownership diagram early and enforce it in code review.

### 2. Imperative Mental Model

Developers with imperative backgrounds think of state as mutable boxes. Frameworks
like React, Flutter, and SwiftUI are declarative and use value semantics for change
detection. The clash produces mutation bugs, stale closures, and missed re-renders.

### 3. Premature Abstraction

Adopting a state management library (Redux, MobX, Vuex) before understanding the
problem leads to over-engineering. The library's patterns become the architecture
instead of serving it. Start simple, add complexity when concrete problems arise.

### 4. Ignoring Async Complexity

Synchronous state management is straightforward. Most bugs live at the boundary
between sync and async: race conditions, stale closures, optimistic updates, and
cache invalidation. Developers underestimate this complexity because the happy path
works in development.

### 5. Missing State Modeling

State is treated as a bag of variables instead of a model with defined states and
transitions. Boolean flags replace finite state machines. Loading/error/success is
an afterthought. The fix is to model state as a type system with discriminated unions
or state machines before writing any UI code.

---

## Self-Check Questions

Use these questions during code review or architecture discussions:

1. **Can I point to exactly one location in the codebase that owns this data?**
   If you find 2+ locations, you have state duplication (Anti-Pattern 2).

2. **If I delete this state variable, can I recompute it from other state?**
   If yes, it is derived state and should not be stored (Anti-Patterns 3, 17).

3. **What happens if two async operations complete out of order?**
   If the answer is "the wrong data displays," you have a race condition
   (Anti-Pattern 9).

4. **Can this component be in a state that should be impossible?**
   List all boolean state variables. If 2^N exceeds your valid states by more than
   2x, you need a state machine (Anti-Pattern 12).

5. **What happens when the server says no to our optimistic update?**
   If there is no rollback path, you have Anti-Pattern 10.

6. **Is this state management library earning its keep?**
   If more than 60% of actions are consumed by a single component, the library is
   overkill (Anti-Pattern 11).

7. **How many state management mechanisms are in this app?**
   If the answer is >3 (e.g., Redux + Context + localStorage + URL params + React
   Query), review boundaries (Anti-Pattern 5).

8. **Would a new developer know where to find the state for this feature?**
   If it takes more than 30 seconds to locate, state is too scattered (Anti-Pattern 5)
   or too coupled to internals (Anti-Pattern 19).

9. **If I refactor the internal state shape, how many files break?**
   If more than the module itself, you are exposing internal state (Anti-Pattern 19).

10. **When was this cached data last validated against the server?**
    If the answer is "only on initial load," you may be treating cache as source of
    truth (Anti-Pattern 20).

---

## Code Smell Quick Reference

| Smell | Anti-Pattern | Severity |
|---|---|---|
| Module-scope `let` imported by multiple files | #1 Global Mutable Singleton | High |
| Same entity type in 2+ store slices | #2 State Duplication | High |
| `useEffect` that only calls `setState` | #3 Derived State Stored | Medium |
| `.push()` / `.splice()` on state array | #4 Mutable State Updates | High |
| 3+ state mechanisms (Redux + Context + localStorage) | #5 Scattered State | Medium |
| Store key read by exactly 1 component | #6 Over-Centralized State | Medium |
| `data: null` with no `loading`/`error` status | #7 Missing Loading/Error | Medium |
| `setInterval` referencing state without functional update | #8 Stale Closure | High |
| `.then(setData)` without abort/ignore guard | #9 Async Race Condition | Critical |
| Optimistic setState with no catch/rollback | #10 Optimistic without Rollback | High |
| Action-to-component ratio > 3:1 in small app | #11 Library Overkill | Low |
| 3+ boolean `is*` state variables in one component | #12 Boolean Soup | High |
| Selector accessing `store[id]` without null guard | #13 Zombie Child | High |
| `useState(props.x)` where prop is not named `initial*` | #14 Props as Initial State | Medium |
| Circular `useEffect` / watcher dependencies | #15 Two-Way Binding Chaos | High |
| `document.querySelector` in React conditional logic | #16 State in DOM | Medium |
| State variable only set inside `useEffect` | #17 Computed Values in State | Low |
| State objects nested 3+ levels deep | #18 Non-Normalized Data | Medium |
| External file accessing `store.state.a.b.c.d` | #19 Exposed Internal State | Medium |
| Server data fetched once, never refreshed | #20 Cache as Source of Truth | High |

---

## Sources

- [Redux Anti-Patterns - State Management (Minko Gechev)](https://blog.mgechev.com/2017/12/07/redux-anti-patterns-race-conditions-state-management-duplication/)
- [State Management Anti Patterns (Source Allies)](https://www.sourceallies.com/2020/11/state-management-anti-patterns/)
- [Global Mutable State (Eric Normand)](https://ericnormand.me/article/global-mutable-state)
- [Impact of Mutable Global State on Defect Proneness (IEEE Xplore)](https://ieeexplore.ieee.org/document/9118816)
- [Stop Using isLoading Booleans (Kent C. Dodds)](https://kentcdodds.com/blog/stop-using-isloading-booleans)
- [Make Impossible States Impossible (Kent C. Dodds)](https://kentcdodds.com/blog/make-impossible-states-impossible)
- [Don't Sync State. Derive It! (Kent C. Dodds)](https://kentcdodds.com/blog/dont-sync-state-derive-it)
- [You Probably Don't Need Derived State (React Blog)](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)
- [Be Aware of Stale Closures when Using React Hooks (Dmitri Pavlutin)](https://dmitripavlutin.com/react-hooks-stale-closures/)
- [5 Mistakes to Avoid When Using React Hooks (Dmitri Pavlutin)](https://dmitripavlutin.com/react-hooks-mistakes-to-avoid/)
- [Stale Props and Zombie Children in Redux (Kai Hao)](https://kaihao.dev/posts/Stale-props-and-zombie-children-in-Redux)
- [React-Redux Roadmap: Context, Subscriptions, and Hooks (GitHub Issue #1177)](https://github.com/reduxjs/react-redux/issues/1177)
- [Normalizing State Shape (Redux Docs)](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- [Props in Initial State is an Anti-pattern (React Patterns)](https://reactpatterns.js.org/docs/props-in-initial-state-is-an-anti-pattern/)
- [Avoiding Mutable Global State in Browser JS (Josh Wulf)](https://www.joshwulf.com/blog/2020/02/avoid-global-state/)
- [Why Singleton Design Pattern is Considered an Anti-pattern (GeeksforGeeks)](https://www.geeksforgeeks.org/why-is-singleton-design-pattern-is-considered-an-anti-pattern/)
- [Hooks, Dependencies and Stale Closures (TkDodo)](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures)
- [Optimistic Updates (TanStack Query)](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates)
- [useState Race Conditions and Gotchas in React (Leonardo)](https://leo88.medium.com/usestate-race-conditions-gotchas-in-react-and-how-to-fix-them-48f0cddb9702)
- [Why Most React Bugs Come From State Inconsistency, Async Updates, and Race Conditions](https://medium.com/@rahulkengale1110/why-inconsistent-state-async-updates-and-race-conditions-cause-most-react-and-frontend-bugs-3bd141602e0a)
- [React State Management in 2025 (Nadia Makarevich)](https://www.developerway.com/posts/react-state-management-2025)
- [Global Variables and States: Why So Much Hate? (The Valuable Dev)](https://thevaluable.dev/global-variable-explained/)
- [The Consequences of Using State over Cache (Arthur.place)](https://arthur.place/implications-of-cache-or-state)
- [React useEffectEvent: Goodbye to Stale Closure Headaches (LogRocket)](https://blog.logrocket.com/react-useeffectevent/)
- [Stop Using useEffect for Derived State (DreamerKumar)](https://medium.com/@dreamerkumar/stop-using-useeffect-for-derived-state-a-react-anti-pattern-thats-killing-your-app-s-performance-8dcb83b48805)
