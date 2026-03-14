# React Native — Expertise Module

> A React Native specialist builds cross-platform iOS and Android applications using TypeScript
> and the React Native framework (currently React Native 0.79, shipped in Expo SDK 53). The scope
> covers Expo-managed workflows, TypeScript architecture, state management (TanStack Query v5 +
> Zustand v5), navigation (Expo Router v4), native module boundaries, performance tuning (Hermes,
> New Architecture, FlashList v2, Reanimated 4), testing (Jest + React Native Testing Library,
> Maestro/Detox), CI/CD (EAS Build + EAS Update + EAS Submit), and delivery to iOS App Store
> and Google Play.

---

## Core Patterns & Conventions

### Project Structure

Use **feature-first** organization for apps beyond a single feature. Each feature owns its routes,
components, hooks, and store slices. Shared code lives in `components/`, `hooks/`, `services/`,
and `stores/`.

```
app/                       # Expo Router v4 file-based routes
  (auth)/                  # Guarded Group — unauthenticated routes
    login.tsx
    register.tsx
  (app)/                   # Guarded Group — authenticated routes
    _layout.tsx
    index.tsx
    profile.tsx
  _layout.tsx              # Root layout: providers + auth guard
components/
  ui/                      # Reusable presentational components
  forms/
features/
  auth/
    hooks/
    stores/
  feed/
    hooks/
    stores/
hooks/                     # Shared cross-feature hooks
services/                  # API clients, native wrappers
stores/                    # Zustand store slices
constants/                 # SCREAMING_SNAKE values, theme tokens
.maestro/                  # Maestro E2E flows
```

Import `SafeAreaProvider` and `react-native-edge-to-edge` setup in the root `app/_layout.tsx`.
Wire `react-native-safe-area-context` for all inset-aware padding.

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `kebab-case` | `user-profile.tsx` |
| Components | `PascalCase` | `UserProfileCard` |
| Custom hooks | `use` prefix | `useAuthStore`, `useUserProfile` |
| Stores | camelCase + `Store` suffix | `authStore`, `feedStore` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Types / Interfaces | `PascalCase` | `UserProfile`, `ApiResponse<T>` |
| Route files | `kebab-case` | `user-settings.tsx` |
| Test files | `*.test.tsx` | `user-profile.test.tsx` |

### Architecture Patterns

Follow a **feature-slice** architecture:
- **Screens** own composition only — no inline business logic.
- **Custom hooks** own data fetching (via TanStack Query) and derived state.
- **Zustand store slices** own persistent client state (auth tokens in memory, preferences, UI flags).
- **Services** own network calls and native module interactions.
- No God components. No prop drilling beyond two levels — pass a callback or use a store.

The three-tier state split is mandatory:
1. **Server state** — TanStack Query v5 (caching, sync, pagination, background refetch).
2. **App/client state** — Zustand v5 (auth session, user settings, cross-screen flags).
3. **Component-local state** — `useState` / `useReducer` (form fields, toggles, modal visibility).

### State Management

**TanStack Query v5** for all server-derived state:
- Unified object API: `useQuery({ queryKey: ['user', id], queryFn: fetchUser })`.
- **`onlineManager` wiring is required** — TanStack Query does not use `navigator.onLine` on React Native:

```ts
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// Wire once at app startup (before QueryClientProvider renders)
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
);
```

- **`focusManager` wiring** for AppState foreground refetch:

```ts
import { AppState, AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

AppState.addEventListener('change', (status: AppStateStatus) =>
  focusManager.setFocused(status === 'active')
);
```

**Zustand v5** for client/app state:
- **`useShallow` is mandatory for object selectors** — v5 crashes (not just re-renders) without it:

```ts
import { useShallow } from 'zustand/react/shallow';

// WRONG in v5 — crashes with "Maximum update depth exceeded"
const { user, token } = useAuthStore((s) => ({ user: s.user, token: s.token }));

// CORRECT
const { user, token } = useAuthStore(useShallow((s) => ({ user: s.user, token: s.token })));
```

- Outside-React access via `store.getState()` — use in navigation guards, request interceptors, app init.
- Keep store state flat — avoid deeply nested objects for frequently-updated data.

### Routing & Navigation

**Expo Router v4** (bundled with Expo SDK 53) is the default. File-based routing with typed routes
generated automatically by Expo CLI.

- Use **Guarded Groups** for auth flows — the canonical pattern in v4. A `guard` function on the
  group checks state synchronously and redirects to an anchor route. Never use `useEffect` + manual
  `router.replace()` for auth redirects.
- Guards call `useAuthStore.getState()` (not hooks) because the guard function runs outside the
  React render cycle.
- Use `<Link prefetch />` or the imperative prefetch API for performance-sensitive transitions.
- Use typed `href` values from `expo-router` — the compiler catches broken routes.

**React Navigation v7** is the escape hatch for legacy projects or when Expo Router's file-based
model cannot express the required navigation structure.

### Data Flow

Unidirectional data flow only:

```
API → TanStack Query cache → screen hook → component props
        ↑                                        |
        └──────── mutations (invalidateQueries) ─┘

Cross-screen shared state: API → TanStack Query → Zustand action → component
```

No circular data flows. Screens never call services directly — they call hooks that call services.

### Error Handling

Define typed error states at every boundary:

```ts
// Narrow unknown errors to a displayable message
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

// TanStack Query exposes typed error state
const { data, error, isError } = useQuery({
  queryKey: ['profile'],
  queryFn: fetchProfile,
});
if (isError) return <ErrorScreen message={toErrorMessage(error)} />;
```

- Mount an `ErrorBoundary` at screen level to catch render errors.
- Use Zod to validate API response shapes at the boundary — parse, don't trust.
- Never let raw network errors surface to users without transformation.

### Logging & Observability

- **Sentry** (`@sentry/react-native`) for crash reporting and performance traces. Wire
  `Sentry.init()` before `<App />` renders. Use `@sentry/expo` for Expo projects — it provides
  automatic source map upload.
- **Firebase Crashlytics** as alternative for Firebase-first projects.
- Development: **Reactotron** for state/API inspection, or React Native Debugger.
- Never ship `console.log()` in production. Use a leveled logger that is a no-op in release builds.

---

## Anti-Patterns & Pitfalls

### 1. Treating Server State as Client State

**Why it's a problem:** Fetching data from an API and storing it in Zustand or `useState` manually
means you own all the complexity TanStack Query already handles — caching, background refetch,
deduplication, stale-while-revalidate, error retries, and loading states. Duplication leads to
stale data, extra network calls, and cache inconsistency.
**Instead:** Use TanStack Query v5 for all server-derived state. Only put in Zustand what the API
does not own: session data, user preferences, UI state, transient cross-screen flags.

### 2. Overusing Context for High-Frequency State

**Why it's a problem:** React Context triggers a re-render of every consumer on every value change.
Using Context for state that changes frequently (auth token, theme, cart contents) causes
full-subtree re-renders, degrading performance on lower-end Android devices where frame budget is
already tight.
**Instead:** Use Zustand with granular selectors for shared high-frequency state. Context is
appropriate for static or rarely-changing values (locale, color scheme). For everything dynamic,
prefer Zustand + `useShallow`.

### 3. Blocking the JS Thread with Synchronous Work

**Why it's a problem:** React Native's JS thread is single-threaded. Heavy synchronous operations
(JSON parsing of large payloads, cryptographic operations, string processing loops) block the JS
thread and cause dropped frames. New Architecture JSI enables synchronous JS↔native calls —
but synchronous JS work still blocks the JS thread regardless.
**Instead:** Offload heavy computation to a Web Worker equivalent via `react-native-workers`, or
batch processing using `InteractionManager.runAfterInteractions()` to yield the thread after
animation frames complete. Use streaming JSON parsers for large payloads.

### 4. Using ScrollView for Large or Infinite Collections

**Why it's a problem:** `ScrollView` renders all children eagerly, regardless of visibility.
For lists with more than ~20 items, this causes slow initial render, high memory usage, and janky
scrolling. The problem scales directly with list size.
**Instead:** Use **FlashList v2** (requires New Architecture — React Native 0.76+ / Expo SDK 53+).
FlashList v2 is a pure-JS implementation that uses New Architecture's synchronous layout
measurement for pixel-perfect cell recycling with no `estimatedItemSize` required. For projects
still on Legacy Architecture, use **FlashList v1**. Never use `FlatList` for performance-sensitive
lists — FlashList is a drop-in replacement with significantly better throughput.

### 5. Ignoring Safe Areas, Insets, and Keyboard Avoidance

**Why it's a problem:** Ignoring safe areas causes content to appear behind notches, home
indicators, status bars, and the soft keyboard. Expo SDK 53 enables `react-native-edge-to-edge`
by default for new Android projects, making edge-to-edge the default layout model. Android 16
(API 36) makes edge-to-edge mandatory for all apps — opting out will not be possible.
**Instead:** Wrap the app root with `SafeAreaProvider` from `react-native-safe-area-context`.
Use `SafeAreaView` or `useSafeAreaInsets()` in layouts that need inset-aware padding. Install
`react-native-edge-to-edge` for correct edge-to-edge Android behavior. Use `KeyboardAvoidingView`
or `react-native-keyboard-controller` for forms.

### 6. Sprinkling Platform Checks Throughout UI

**Why it's a problem:** `Platform.OS === 'ios'` scattered through components creates invisible
platform-specific code paths, makes components harder to test, and accumulates into unmaintainable
conditionals over time.
**Instead:** Extract platform differences into dedicated abstraction layers. Use `Platform.select()`
for concise conditional values. Create platform-specific file variants (`Component.ios.tsx`,
`Component.android.tsx`) when the component differs substantially between platforms. Keep
components themselves platform-agnostic.

### 7. Storing Secrets in AsyncStorage

**Why it's a problem:** `AsyncStorage` is unencrypted plain text stored on the device filesystem.
Auth tokens, API keys, and session credentials stored there are trivially extractable via file
system access on rooted/jailbroken devices or via ADB on non-production builds.
**Instead:** Use `expo-secure-store` for Expo managed projects (backed by iOS Keychain Services
and Android Keystore AES encryption, 2048-byte limit per value on iOS). Use
`react-native-keychain` for bare React Native projects when biometric auth is needed. Store a
pointer — not the data itself — if the payload exceeds the size limit.

### 8. Leaking AppState, Navigation, and Native Event Subscriptions

**Why it's a problem:** Event listeners and subscriptions registered in `useEffect` without a
cleanup function leak memory across screen unmounts. On long user sessions, leaked subscriptions
cause duplicate callbacks, background battery drain, and eventual OOM on low-memory devices.
**Instead:** Always return a cleanup function from every `useEffect` that registers a subscription.
For AppState, `NetInfo`, and `Keyboard` listeners, call the returned `remove()` function or
`subscription.remove()` in the cleanup. For navigation event listeners, call `navigation.addListener`
and return the returned unsubscribe function.

### 9. Re-rendering Heavy Screens Without Memo Boundaries

**Why it's a problem:** A parent state change (e.g., scroll position, timer tick) propagates
through the component tree and re-renders every child that lacks a memo boundary. On screens with
complex lists, charts, or media, this causes frame drops.
**Instead:** Wrap expensive child components in `React.memo()`. Stabilize callback props with
`useCallback`. Stabilize object props with `useMemo`. Verify with React Native DevTools component
profiler before applying memos — over-memoization is also a performance cost.

### 10. Running Complex Animations on the JS Thread

**Why it's a problem:** `Animated` API (Legacy Architecture) runs animations through a JS→bridge
→native round-trip per frame. At 60fps this is 16ms — any JS jank drops the animation. Even with
`useNativeDriver: true`, the animation definition still originates on the JS thread.
**Instead:** Use **Reanimated 4** (requires New Architecture). Worklets declared with `'worklet'`
directive run entirely on the UI thread with no JS involvement per frame. Reanimated 4 also adds
CSS-style animations and transitions as a first-class API. For projects on Legacy Architecture,
use **Reanimated 3.x** — which supports worklets but requires the bridge for initial setup.

### 11. Mixing Expo-Managed and Bare-Native Assumptions

**Why it's a problem:** Expo-managed workflow hides `ios/` and `android/` directories. Bare
React Native exposes them. Packages that modify native files (e.g., add `AppDelegate.swift`
entries, modify `AndroidManifest.xml`) require either an Expo Config Plugin (managed) or manual
native edit (bare). Conflating the two leads to broken builds that work locally but fail on CI.
**Instead:** FlashList v2 and Reanimated 4 both require New Architecture — verify before adopting.
In Expo managed, use `app.config.js` plugins only. Run `npx expo prebuild` deliberately when
switching to bare. Never manually edit `ios/` and `android/` in a managed project.

### 12. Weak Offline, Loading, and Error State Design

**Why it's a problem:** Rendering nothing (blank screen) during loading, crashing on API errors,
and ignoring offline state are the most common RN UX failures. Mobile networks are unreliable;
offline is not an edge case.
**Instead:** Always handle three explicit states: `isLoading` → skeleton/shimmer, `isError` →
error screen with retry action, `isSuccess` → data. Wire TanStack Query's `onlineManager` so
queries automatically pause when offline and refetch on reconnect. Consider
`architecture/mobile-architecture/offline-first.md` for apps requiring local-first data.

### 13. Fragile Deep Linking and Push Navigation Wiring

**Why it's a problem:** Manually wiring deep links via `Linking.getInitialURL()` + AppState
listeners is error-prone, misses cold-start edge cases, and breaks when the app is killed.
Push notifications that navigate to content can land on wrong screens or fail silently.
**Instead:** Use Expo Router v4's built-in universal links support — file-based routes map
directly to URLs with zero configuration. For push notification navigation, use
`expo-notifications` `addNotificationResponseReceivedListener` and resolve the route before the
app finishes loading to avoid navigation timing bugs.

### 14. Profiling Only in Debug or Remote-Dev Mode

**Why it's a problem:** Debug builds with remote JS debugging enabled run JavaScript on the host
machine VM, not Hermes. Performance characteristics are completely different. Startup times,
memory usage, and animation smoothness in debug mode do not represent production behaviour.
**Instead:** Profile on a Release build using Hermes. Use the Hermes profiler for JS startup
traces. Use Xcode Instruments (iOS) and Android Studio Profiler (Android) for native-layer
profiling. Use React Native DevTools component profiler on a development build (not debug). Only
data from release-mode profiles is actionable.

---

## Testing Strategy

### Testing Pyramid

| Layer | Framework | Speed | Quantity | Purpose |
|-------|-----------|-------|----------|---------|
| Unit | Jest | ~ms | Many | Hooks, store actions, utilities, validators |
| Component | React Native Testing Library | ~100ms | Moderate | UI rendering, interactions, state transitions |
| Integration | Jest + MSW | ~seconds | Few | API integration, navigation flows, form submit |
| E2E | Maestro (default) / Detox | ~minutes | Critical paths only | Full user flows on real devices |

### Frameworks & Tools

- **Jest** — default test runner. Use `jest-expo` preset for Expo projects.
- **React Native Testing Library (RNTL)** — component tests. Prefer `getByRole` and `getByText`
  queries over `testID` — they test behaviour, not implementation.
- **MSW (Mock Service Worker)** — intercept API calls in integration tests without mocking `fetch`.
  Use `msw/node` server adapter for Jest.
- **Maestro** — recommended default for E2E. YAML-based, black-box, no app code changes required.
  Test files live in `.maestro/` at project root. New projects, startups, and QA-driven teams
  should default to Maestro.
- **Detox** — gray-box alternative. Communicates with the app process directly, enabling internal
  state access. Use when you need to assert on React Native internals or your team already has
  significant Detox investment.

### What to Test

**Always test:**
- Custom hooks (business logic, data transformations, derived state).
- Zustand store actions and selectors.
- Utility functions and validators (pure functions — trivially testable).
- Form validation schemas (Zod schemas, `@hookform/resolvers` integration).
- Navigation guards and auth redirect logic.
- Error boundary fallback rendering.

**Skip or deprioritize:**
- Rendering of third-party library components (e.g., testing that a `Button` renders text).
- Implementation details (internal state, private functions).
- Snapshot tests — they break on trivial UI changes and provide no behavioural signal.
- Platform-level rendering — covered by the React Native engine tests.

### Mocking Patterns

```ts
// jest.setup.ts — mock native modules that have no JS implementation in Jest
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

Use MSW `http` handlers for API-level integration test mocking — avoids coupling tests to
`fetch` implementation details.

### Test File Organization

```
features/
  auth/
    hooks/
      __tests__/
        use-auth.test.ts
    stores/
      __tests__/
        auth-store.test.ts
    components/
      __tests__/
        login-form.test.tsx
.maestro/
  login_flow.yaml
  checkout_flow.yaml
jest.config.ts
jest.setup.ts
```

Co-locate `__tests__/` directories next to source files. E2E flows in `.maestro/` at project root.

### Coverage Expectations

- **Business logic** (hooks, stores, utilities): 80%+ statement coverage.
- **UI-only components** (no logic): no coverage target — component tests at this layer test
  rendering, not coverage.
- Enforce thresholds in `jest.config.ts`:

```ts
// jest.config.ts
export default {
  preset: 'jest-expo',
  coverageThreshold: {
    './features/**/*.ts': { statements: 80 },
  },
};
```

---

## Performance Considerations

### Common Bottlenecks

1. **JS thread blocking** — synchronous heavy computation, large JSON parsing on the main thread.
2. **Large list rendering** — using `ScrollView` or `FlatList` for lists of 50+ items; no cell
   recycling; re-rendering all rows on parent state change.
3. **Missing memo boundaries** — heavy screen children re-rendering on unrelated state changes.
4. **Unoptimized images** — full-resolution downloads without caching; no decode-size hints.
5. **Heavy synchronous module imports** — large dependencies imported at the top-level slow Hermes
   startup; use `require()` inside functions for lazy loading.
6. **Bridge churn (Legacy Architecture only)** — high-frequency JS↔native data transfer across
   the async bridge. Eliminated by JSI in New Architecture.

### Profiling Tools

| Tool | What It Measures | When to Use |
|------|-----------------|-------------|
| React Native DevTools (component profiler) | Component render count and timing | Find unnecessary re-renders |
| Flipper | Network requests, layout hierarchy, crashes | General inspection during development |
| Reactotron | State changes, API calls, async storage | Development-time state/API debugging |
| Hermes profiler | JS startup trace, function execution time | Slow cold start investigation |
| Xcode Instruments | CPU, memory, energy impact (iOS) | Native-layer profiling on iOS |
| Android Studio Profiler | CPU, memory, network, battery (Android) | Native-layer profiling on Android |

**Always profile on a Release build.** Debug builds with JS remote debugging run on the host VM,
not Hermes. Startup times and animation smoothness differ dramatically.

### Optimization Patterns

- **Hermes AOT compilation** — default since React Native 0.70+. Pre-compiles JS to bytecode at
  build time, reducing startup time and memory usage.
- **New Architecture JSI** — eliminates bridge JSON serialization for JS↔native calls. Enables
  synchronous native calls. Default in React Native 0.76+ and Expo SDK 53+.
- **FlashList v2** — cell recycling + adaptive buffer (adjusts based on scroll velocity).
  Requires New Architecture. No `estimatedItemSize` needed. Drop-in `FlatList` replacement with
  significantly lower per-frame render cost for complex items.
- **Reanimated 4 worklets** — animations run entirely on the UI thread. Declare animation logic
  with `'worklet'` directive; it never touches the JS thread per frame.
- **`React.memo` + `useCallback`** — wrap list row components in `React.memo`; stabilize callbacks
  passed to rows with `useCallback` to prevent unnecessary row re-renders.
- **Lazy-load heavy screens** — use `React.lazy()` + `Suspense` or route-level lazy loading in
  Expo Router to defer loading large screen bundles.
- **`metro.config.js` bundle splitting** — use `createDevServerMiddleware` and `unstable_enablePackageExports`
  for tree-shaking; consider `@expo/metro-config` async bundles for tab-based apps.
- **Edge-to-edge** — Expo SDK 53 enables `react-native-edge-to-edge` by default for new Android
  projects. Use `react-native-safe-area-context` for inset-aware layouts. Android 16 (API 36)
  makes edge-to-edge mandatory.

### Metrics & Thresholds

| Metric | Target |
|--------|--------|
| TTI — cold start (mid-range device) | < 2 seconds |
| List scroll frame drops | < 2 per 100 frames |
| JS bundle size | < 1 MB (warn above 2 MB) |
| Crash-free sessions | > 99.5% |
| Memory (idle, mid-range device) | < 200 MB |

---

## Security Considerations

### Secure Storage

Never store secrets, tokens, or credentials in `AsyncStorage` — it is unencrypted plain text on
the device filesystem.

| Library | Workflow | Backing | Limit | Biometric |
|---------|---------|---------|-------|-----------|
| `expo-secure-store` | Expo managed | iOS Keychain + Android Keystore AES | 2048 bytes per value (iOS) | Limited |
| `react-native-keychain` | Bare RN | iOS Keychain + Android CipherStorage | No fixed limit | Full (Face ID, Touch ID, biometric prompt) |

- Use **`expo-secure-store`** for Expo managed projects — zero config, maintained by Expo team.
- Use **`react-native-keychain`** for bare React Native or when biometric-gated keychain access
  is required.
- The `expo-secure-store` 2048-byte iOS limit is sufficient for JWT access tokens. For larger
  payloads (e.g., encrypted blobs), store a pointer/reference to encrypted file storage instead.
- For encrypted key-value stores with no size limit, `react-native-mmkv` with encryption enabled
  is an alternative for non-credential data.

### Network Security

- **HTTPS only** in production. Never disable certificate validation (`rejectUnauthorized: false`
  must not appear in production code).
- **Certificate pinning** via `react-native-ssl-pinning` or a custom fetch interceptor that
  validates server certificates against embedded public keys.
- Always validate server certificate chains; implement a pin rotation strategy with backup pins
  to avoid bricking deployed apps during certificate renewal.

### OTA Updates & Code Integrity

- **EAS Update** delivers JS bundle and asset changes OTA in minutes.
- **Runtime versions** define the JS↔native boundary — bump when any native code changes.
  Deploying a JS bundle to a build with a mismatched runtime version causes crashes.
- Use EAS Update channels (`production` / `staging`) for staged rollouts. Use
  `--rollout-percentage` for gradual deploys. Use `eas update:edit` to adjust or roll back.
- **CodePush** is the bare React Native alternative to EAS Update.

### Secrets & Environment Configuration

- Never embed API keys in the JS bundle — they are extractable from any Hermes bytecode with
  standard tools.
- Use `app.config.js` for non-sensitive build-time config.
- Use EAS environment variables (set via `eas secret:create`) for secrets — they are injected
  at build time, not stored in the repo.
- Proxy sensitive API calls through a backend API. `expo-constants` surfaces EAS env vars at
  runtime for non-secret config values.

### Code Obfuscation

- Hermes bytecode compiles JS to binary format — not human-readable source, but reversible with
  tooling. Not a substitute for not embedding secrets.
- For stronger protection: enable `metro-minify-terser` with identifier mangling enabled.
- `react-native-obfuscate` applies source-level obfuscation before the Metro bundler runs.
- Upload source maps to Sentry for symbolicated crash reports despite obfuscation.

### Input Validation

- Use **Zod** at every API response boundary — parse the shape before using the data.
- Validate deep link params before acting on them — they arrive from outside the app.
- Use React Hook Form + Zod at form boundaries — never trust unvalidated form data.
- Use parameterized queries for local SQLite — never concatenate user input into SQL strings.

---

## Integration Patterns

### REST API Integration

Use `fetch` (built-in) or `axios` as the HTTP client. Wrap all async server state in
TanStack Query v5.

**Critical: wire `onlineManager` at app startup** (see State Management section). Without this,
TanStack Query will not respond to network connectivity changes on React Native because it cannot
detect `navigator.onLine`.

```ts
// services/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: true, // works via focusManager wiring
    },
  },
});
```

For paginated lists, use `useInfiniteQuery` with `maxPages` to cap memory usage on mobile:

```ts
useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => fetchFeed(pageParam),
  getNextPageParam: (last) => last.nextCursor,
  maxPages: 5, // keep at most 5 pages in memory
  initialPageParam: null,
});
```

### Forms & Validation

**React Hook Form v7** + **Zod v3** + **`@hookform/resolvers/zod`** is the standard stack.
Use `Controller` for all React Native inputs — RN inputs are uncontrolled by default and require
the `Controller` bridge to integrate with RHF's ref-based model.

```ts
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});
```

Trigger validation `onBlur` for forms with many fields to avoid re-render storms on every
keystroke. Use `mode: 'onChange'` only when immediate feedback is required (e.g., password
strength indicator).

### Native Modules & Expo Modules API

Use the **Expo Modules API** (`expo-modules-core`) to create custom native modules. Define the
module using the `ExpoModule` class in Swift (iOS) and Kotlin (Android). Prefer Expo packages
over community packages when an equivalent exists — they are guaranteed to support New Architecture.

Check `reactnative.directory` for the `new-arch: true` badge before adopting any community
package. A package without New Architecture support will block your upgrade path.

### Local Persistence

| Library | Backing | Use Case | Encrypted | Notes |
|---------|---------|----------|-----------|-------|
| `expo-sqlite` v15 | SQLite | Relational data, complex queries | Yes (via extension) | Use `SQLiteProvider` + `useSQLiteContext`; WAL mode default; do NOT use `openDatabase` |
| `react-native-mmkv` | Key-value (memory-mapped) | Fast reads, store persistence | Yes | Optimal for Zustand persist middleware |
| `AsyncStorage` | Key-value (filesystem) | Non-sensitive only | No | Not for secrets or tokens |

`expo-sqlite` v15 API — always use `SQLiteProvider` and `useSQLiteContext`, not the deprecated
`openDatabase`:

```tsx
// Correct v15 usage
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

export function App() {
  return (
    <SQLiteProvider databaseName="app.db">
      <FeedScreen />
    </SQLiteProvider>
  );
}

function FeedScreen() {
  const db = useSQLiteContext();
  // db is now available synchronously — WAL mode enabled by default
}
```

### Push Notifications, Deep Links & Background Work

- **Push notifications** — `expo-notifications` for token registration, receiving, and display.
  Register the push token with your backend after user permission is granted.
- **Deep links** — Expo Router v4 handles universal links and custom scheme deep links natively
  via file-based routing. No additional `Linking` wiring required for in-app routes.
- **Background work** — `expo-background-fetch` + `expo-task-manager` for periodic background
  tasks (data sync, cache refresh). Background time is OS-limited; design tasks to complete in
  under 30 seconds.

---

## DevOps & Deployment

### Environments & Configuration

```js
// app.config.js — environment-aware build config
const IS_PROD = process.env.APP_VARIANT === 'production';

export default {
  name: IS_PROD ? 'MyApp' : 'MyApp (Dev)',
  ios: { bundleIdentifier: IS_PROD ? 'com.example.myapp' : 'com.example.myapp.dev' },
  android: { package: IS_PROD ? 'com.example.myapp' : 'com.example.myapp.dev' },
};
```

```json
// eas.json — build profiles
{
  "build": {
    "production": {
      "channel": "production",
      "env": { "APP_VARIANT": "production" }
    },
    "preview": {
      "channel": "preview",
      "distribution": "internal",
      "env": { "APP_VARIANT": "preview" }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

Set secrets via `eas secret:create --scope project --name API_SECRET --value "..."`. Access at
runtime via `expo-constants` `expoConfig.extra`.

### CI/CD with EAS

EAS Workflows (YAML in `.eas/workflows/`) orchestrate the full pipeline:

```yaml
# .eas/workflows/production.yml
on:
  push:
    branches: [main]
jobs:
  build-ios:
    type: build
    params:
      platform: ios
      profile: production
  build-android:
    type: build
    params:
      platform: android
      profile: production
  submit:
    type: submit
    needs: [build-ios, build-android]
    params:
      profile: production
```

- **EAS Build** — cloud builds, manages signing credentials, produces `.ipa` and `.apk/.aab`.
- **EAS Submit** — uploads to App Store Connect and Google Play. Use `--auto-submit` flag on
  `eas build` to trigger submit automatically post-build.
- **EAS Update** — OTA JS + asset updates. Propagates to users in minutes. Run
  `eas update --channel production --message "Fix login crash"` for emergency patches.
- Parallel iOS + Android build jobs cut wall-clock CI time roughly in half.

### Expo Prebuild / Bare React Native Escape Hatch

Run `npx expo prebuild` to generate `ios/` and `android/` directories from the managed project.
Use prebuild when:
- A required native library has no Expo Config Plugin.
- CI requires native build customization beyond what Config Plugins support.
- Migrating to bare workflow deliberately.

**Warning:** prebuild output is not checked into git — regenerate on every native dependency
change. Committing `ios/` and `android/` is valid only in fully bare projects.

### Crash Reporting & Observability

- **Sentry** (`@sentry/react-native` + `@sentry/expo`) — crash reporting, performance traces,
  symbolicated stack traces via source maps. Wire `Sentry.init()` as the first statement before
  `registerRootComponent()`.
- **Firebase Crashlytics** — alternative for Firebase-first stacks.
- Wire `Sentry.setUser()` after auth to correlate crashes with user accounts.

### Store Release Flow

- **iOS:** EAS Build → TestFlight (internal test) → External Testing → App Store Review → Release.
- **Android:** EAS Build → Internal Testing track → Closed Testing → Open Testing → Production.
- **EAS Submit** automates upload to both stores.
- Use `autoIncrement: true` in `eas.json` to auto-bump build numbers on each build.
- OTA updates via EAS Update bypass App Store review for JS-only changes.

---

## Decision Trees

### Expo Managed vs Expo Prebuild vs Bare React Native

```
START: Does the app require a native library without an Expo Config Plugin?
  |
  +-- Yes
  |     |
  |     +-- Is the library available as a bare-only package?
  |     |     --> Expo Prebuild (npx expo prebuild — generates ios/ + android/,
  |     |                         use Config Plugins for everything else)
  |     |
  |     +-- Can you write an Expo Config Plugin or use a community one?
  |           --> Stay Expo Managed with the Config Plugin
  |
  +-- No: Does the app need full native project control (custom Podfile, Gradle scripts,
  |        CI native customization, proprietary SDKs with no RN wrapper)?
  |     |
  |     +-- Yes --> Bare React Native (eject fully — own ios/ and android/)
  |     |
  |     +-- No  --> Expo Managed Workflow (default — least maintenance overhead,
  |                   EAS Build + EAS Update, no native directories to maintain)
```

### Which Navigation Approach?

```
START: Is the project on Expo SDK 52+ (Expo Router v4 available)?
  |
  +-- Yes
  |     |
  |     +-- Is file-based routing acceptable for the app's navigation structure?
  |     |     |
  |     |     +-- Yes --> Expo Router v4 (typed routes, Guarded Groups, universal links built-in)
  |     |     |
  |     |     +-- No (e.g., programmatic dynamic routes, complex nested stacks not
  |     |               expressible as files)
  |     |           --> React Navigation v7 (imperative, maximum flexibility)
  |     |
  |     +-- Does the project already use React Navigation with heavy investment?
  |           --> React Navigation v7 (migration cost not justified)
  |
  +-- No (legacy project, bare RN, older SDK)
        --> React Navigation v7
```

### Which State Management Tier?

```
START: Where does the data originate?
  |
  +-- From a server / API (fetched async, needs caching, background sync)
  |     --> TanStack Query v5
  |           useQuery for reads, useMutation for writes
  |           Invalidate query cache on successful mutations
  |
  +-- Client-only: shared across multiple screens or persisted across sessions
  |     --> Zustand v5
  |           useShallow for all object selectors (mandatory in v5)
  |           Persist slice with zustand/middleware persist + react-native-mmkv
  |
  +-- Component-local: ephemeral, not shared beyond this component
        --> useState / useReducer
              No store, no context, no query — keep it local
```

### Which Storage Layer?

```
START: Is the data a secret, token, or credential?
  |
  +-- Yes
  |     |
  |     +-- Expo managed project   --> expo-secure-store (Keychain/Keystore, 2048-byte iOS limit)
  |     +-- Bare RN / need biometric --> react-native-keychain
  |
  +-- No: Is the data relational or requires complex queries / joins?
  |     |
  |     +-- Yes --> expo-sqlite v15 (SQLiteProvider + useSQLiteContext, WAL mode default)
  |     |            Do NOT use openDatabase API
  |     |
  |     +-- No: High-frequency key-value reads / writes (e.g., store persistence, settings)?
  |           |
  |           +-- Yes --> react-native-mmkv (memory-mapped, synchronous, encrypted option)
  |           |
  |           +-- No (infrequent, non-sensitive key-value)
  |                 --> AsyncStorage (not for secrets — plain text on filesystem)
```

---

## Code Examples

### 1. Expo Router App Shell with Guarded Groups

The root layout wires all providers and uses Expo Router v4 Guarded Groups for auth — no
`useEffect` redirects needed.

```tsx
// app/_layout.tsx
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, focusManager } from '@tanstack/react-query';
import { queryClient } from '@/services/query-client';

// Wire onlineManager once — TanStack Query cannot use navigator.onLine on RN
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
);

// Wire focusManager for foreground refetch
AppState.addEventListener('change', (status: AppStateStatus) =>
  focusManager.setFocused(status === 'active')
);

export default function RootLayout() {
  return (
    // GestureHandlerRootView must be outermost — it owns the gesture responder context
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

```tsx
// app/(app)/_layout.tsx — Guarded Group: authenticated routes only
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export const unstable_settings = {
  // Anchor route: unauthenticated users land here
  anchor: '/(auth)/login',
};

export function guard(): boolean {
  // guard() runs outside render — use getState(), not a hook
  return useAuthStore.getState().isAuthenticated;
}

export default function AppLayout() {
  return <Stack />;
}
```

### 2. TanStack Query + Zustand Screen Pattern

A screen demonstrating all three state tiers in one component.

```tsx
// features/profile/screens/profile-screen.tsx
import { View, Text, Modal, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/auth-store';
import { fetchUserProfile } from '@/services/user-service';
import type { UserProfile } from '@/types/user';

export function ProfileScreen() {
  // Tier 1 — server state via TanStack Query v5
  // Query key includes userId so cache is scoped per user
  const { userId, token } = useAuthStore(
    useShallow((s) => ({ userId: s.userId, token: s.token })) // useShallow mandatory in v5
  );

  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId, token),
    enabled: !!userId, // don't run without a user
  });

  // Tier 3 — component-local ephemeral state
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  if (isLoading) return <Text>Loading…</Text>;
  if (isError || !profile) return <Text>Failed to load profile.</Text>;

  return (
    <View>
      <Text>{profile.displayName}</Text>
      <Pressable onPress={() => setEditModalVisible(true)}>
        <Text>Edit</Text>
      </Pressable>
      <Modal visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        {/* Edit form here */}
      </Modal>
    </View>
  );
}
```

### 3. React Hook Form + Zod Native Form

`Controller` is required for React Native inputs — RN inputs are uncontrolled and must be
bridged via `Controller` for RHF's ref model.

```tsx
// features/auth/components/login-form.tsx
import { View, TextInput, Text, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // validate on blur — avoids re-render storm on every keystroke
  });

  return (
    <View>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
          />
        )}
      />
      {errors.email && <Text>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            secureTextEntry
            placeholder="Password"
          />
        )}
      />
      {errors.password && <Text>{errors.password.message}</Text>}

      <Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        <Text>{isSubmitting ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>
    </View>
  );
}
```

### 4. FlashList Memoized Row Pattern

FlashList v2 requires New Architecture (React Native 0.76+ / Expo SDK 53+). No
`estimatedItemSize` in v2 — removed entirely. Use FlashList v1 on Legacy Architecture.

```tsx
// features/feed/components/feed-list.tsx
import { useCallback, memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';

interface FeedItem {
  id: string;
  title: string;
  type: 'post' | 'ad'; // heterogeneous list types
}

interface RowProps {
  item: FeedItem;
  onPress: (id: string) => void;
}

// Memoize the row: prevents re-render when parent state changes but item is unchanged
const FeedRow = memo(function FeedRow({ item, onPress }: RowProps) {
  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Text>{item.title}</Text>
    </Pressable>
  );
});

interface FeedListProps {
  items: FeedItem[];
  onItemPress: (id: string) => void;
}

export function FeedList({ items, onItemPress }: FeedListProps) {
  // Stabilize callback — prevents FeedRow memo from being defeated on parent render
  const handlePress = useCallback((id: string) => onItemPress(id), [onItemPress]);

  // Typed renderItem — ListRenderItem<FeedItem> ensures item type safety
  const renderItem: ListRenderItem<FeedItem> = useCallback(
    ({ item }) => <FeedRow item={item} onPress={handlePress} />,
    [handlePress]
  );

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      // getItemType enables per-type recycling pools — items with different types
      // never share a recycled cell, preventing layout corruption
      getItemType={(item) => item.type}
      // v2: estimatedItemSize is gone — no estimates needed
      // Cell recycling is pixel-perfect via New Architecture synchronous layout
      keyExtractor={(item) => item.id}
    />
  );
}
```

### 5. Secure Token Storage Wrapper

Abstracts `expo-secure-store` with typed functions. Never use `AsyncStorage` for tokens.
The 2048-byte iOS Keychain limit is sufficient for JWT access tokens; store a reference
pointer for larger payloads.

```ts
// services/secure-storage.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// expo-secure-store: iOS Keychain + Android Keystore AES — encrypted at rest
// Limit: 2048 bytes per value on iOS (JWT access tokens fit well within this)
// For bare RN projects requiring biometric auth, swap to react-native-keychain

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  // Validate before storing — never persist a malformed token
  if (!token || token.length === 0) {
    throw new Error('Cannot store empty token');
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (!token || token.length === 0) {
    throw new Error('Cannot store empty refresh token');
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearAllTokens(): Promise<void> {
  // Clear both tokens atomically on logout
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
```

---

*Researched: 2026-03-12 | Sources: [React Native docs](https://reactnative.dev/docs/getting-started), [RN New Architecture](https://reactnative.dev/architecture/landing-page), [RN 0.79 release blog](https://reactnative.dev/blog/2025/04/08/react-native-0.79), [Expo SDK 53 changelog](https://expo.dev/changelog/sdk-53), [Expo Router docs](https://docs.expo.dev/router/introduction/), [Expo Router typed routes](https://docs.expo.dev/router/reference/typed-routes/), [TanStack Query v5 React Native](https://tanstack.com/query/v5/docs/framework/react/react-native), [TanStack Query v5 migration](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5), [Zustand GitHub](https://github.com/pmndrs/zustand), [FlashList v2 Shopify blog](https://shopify.engineering/flashlist-v2), [FlashList docs](https://shopify.github.io/flash-list/), [Reanimated 4 migration guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/), [Reanimated 4 stable release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713), [EAS Build docs](https://docs.expo.dev/build/introduction/), [EAS Update docs](https://docs.expo.dev/eas-update/introduction/), [EAS runtime versions](https://docs.expo.dev/eas-update/runtime-versions/), [EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/), [EAS OTA playbook](https://expo.dev/blog/the-production-playbook-for-ota-updates), [Maestro best RN testing frameworks](https://maestro.dev/insights/best-react-native-testing-frameworks), [Detox vs Maestro](https://www.getpanto.ai/blog/detox-vs-maestro), [QA Wolf 2025 E2E frameworks](https://www.qawolf.com/blog/the-best-mobile-e2e-testing-frameworks-in-2025-strengths-tradeoffs-and-use-cases), [AddJam Maestro experience 2026](https://addjam.com/blog/2026-02-18/our-experience-adding-e2e-testing-react-native-maestro/), [expo-secure-store docs](https://docs.expo.dev/versions/latest/sdk/securestore/), [RN security docs](https://reactnative.dev/docs/security), [React Native Testing Library](https://callstack.github.io/react-native-testing-library/), See also: [mobile-app-architecture.md](../architecture/mobile-architecture/mobile-app-architecture.md), [mobile-antipatterns.md](../antipatterns/frontend/mobile-antipatterns.md), [testing-mobile.md](../quality/testing-mobile.md), [security/mobile/](../security/mobile/)*
