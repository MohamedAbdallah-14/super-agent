# Vue.js — Expertise Module

> A Vue.js specialist designs, builds, and maintains reactive web applications using Vue 3's
> Composition API, Nuxt 3 for SSR/SSG, and the modern Vue ecosystem (Pinia, Vite, Vitest).
> Scope spans component architecture, state management, performance optimization, testing, and deployment.

---

## 1. Core Patterns & Conventions

### 1.1 Project Structure

**Standalone Vue 3 + Vite (feature-based):**

```
src/
  features/
    auth/
      components/         # Feature-scoped components
      composables/        # Feature-scoped composables
      stores/             # Feature-scoped Pinia stores
      types/              # Feature-scoped TypeScript types
      views/              # Route-level pages
      index.ts            # Public API barrel
    dashboard/
      ...
  shared/
    components/           # Cross-feature reusable components
    composables/          # Cross-feature composables (useDebounce, useFetch)
    utils/                # Pure utility functions
    types/                # Shared TypeScript types
  layouts/
  router/
    index.ts
  stores/                 # Global stores (user session, app config)
  App.vue
  main.ts
```

**Nuxt 3 (convention-based):**

```
app/
  components/             # Auto-imported components
  composables/            # Auto-imported composables
  layouts/                # Application layouts (default.vue, admin.vue)
  middleware/             # Route middleware (auth, guest)
  pages/                  # File-based routing
  plugins/                # Nuxt plugins (runs on app init)
  utils/                  # Auto-imported utility functions
server/
  api/                    # Server API routes (Nitro)
  middleware/             # Server middleware
  utils/                  # Server-side utilities
stores/                   # Pinia stores
layers/                   # Nuxt layers for code sharing
public/                   # Static assets (served at /)
nuxt.config.ts
```

Key Nuxt 3 conventions: directories like `components/`, `composables/`, and `utils/` are
auto-imported. The `layers/` directory enables sharing code, components, and config across
projects. The `server/` directory uses Nitro for API routes and server middleware.

### 1.2 Naming Conventions & Code Style

| Element                 | Convention                          | Example                        |
|-------------------------|-------------------------------------|--------------------------------|
| Components              | PascalCase, multi-word              | `UserProfileCard.vue`          |
| Composables             | camelCase, `use` prefix             | `useAuthSession.ts`            |
| Pinia stores            | camelCase, `use...Store` suffix     | `useCartStore.ts`              |
| Props                   | camelCase in script, kebab in template | `userName` / `user-name`    |
| Events                  | camelCase with verb                 | `@update:modelValue`           |
| Route files (Nuxt)      | kebab-case                          | `user-profile.vue`             |
| CSS classes             | BEM or utility-first (Tailwind)     | `.user-card__avatar`           |
| Constants               | UPPER_SNAKE_CASE                    | `MAX_RETRY_COUNT`              |
| TypeScript interfaces   | PascalCase, no `I` prefix           | `UserProfile`, not `IUserProfile` |

**eslint-plugin-vue (v9.x+):** Use the `flat/recommended` preset as baseline. Key rules:

- `vue/multi-word-component-names` — enforces multi-word names to avoid HTML element collisions
- `vue/component-api-style` — enforce `<script setup>` usage
- `vue/define-macros-order` — consistent ordering of defineProps, defineEmits, defineModel
- `vue/block-order` — enforce `<script>`, `<template>`, `<style>` ordering
- `vue/no-v-html` — warn on v-html usage (security)
- `vue/require-typed-ref` — require typed ref declarations with TypeScript

### 1.3 Composition API Patterns

**`<script setup>` is the standard for Vue 3.4+.** It reduces boilerplate and provides
better TypeScript inference. All new components should use this syntax.

**Composables** encapsulate reusable stateful logic:

```typescript
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const doubled = computed(() => count.value * 2)

  function increment() { count.value++ }
  function reset() { count.value = initial }

  return { count, doubled, increment, reset }
}
```

Rules for composables:
- Always return refs (not raw values) so destructuring preserves reactivity
- Prefix with `use` — this is enforced by eslint-plugin-vue
- Accept refs or plain values as arguments; use `toValue()` (Vue 3.3+) to normalize
- Clean up side effects (watchers, event listeners) — Vue auto-disposes when the
  component hosting the composable unmounts, but manual cleanup is needed for
  non-Vue event listeners

**Provide/Inject** for subtree-scoped state (avoids prop drilling):

```typescript
// Parent
import { provide, ref } from 'vue'
const theme = ref<'light' | 'dark'>('light')
provide('theme', theme)            // Use InjectionKey<T> for type safety

// Child (any depth)
import { inject } from 'vue'
const theme = inject('theme', ref('light'))  // default fallback
```

Use `InjectionKey<T>` from Vue for type-safe provide/inject in TypeScript projects.

### 1.4 State Management (Pinia 2.x)

Pinia is the official Vue state management library, replacing Vuex.

**Setup Store syntax (recommended for complex stores):**

```typescript
// stores/useCartStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])

  // Getters
  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.qty, 0)
  )

  // Actions
  async function addItem(product: Product) {
    const existing = items.value.find(i => i.id === product.id)
    if (existing) existing.qty++
    else items.value.push({ ...product, qty: 1 })
  }

  function clear() { items.value = [] }

  return { items, totalPrice, addItem, clear }
})
```

**When to use Pinia vs composables vs provide/inject:**

| Criterion                        | Composable            | Provide/Inject       | Pinia               |
|----------------------------------|-----------------------|----------------------|---------------------|
| State scope                      | Per-consumer instance | Component subtree    | Global singleton    |
| DevTools support                 | No                    | No                   | Yes (time-travel)   |
| SSR hydration safety             | Manual                | Manual               | Built-in            |
| Best for                         | Reusable logic        | Subtree coordination | Global app state    |
| Performance (ref changes)        | Fastest (~20x Pinia)  | Fast                 | Baseline            |

### 1.5 Routing

**Vue Router 4 (standalone Vue):** Declare routes in `router/index.ts`. Use lazy loading
via `() => import('./views/Dashboard.vue')` for code splitting.

**Nuxt 3 auto-routing:** File-based routing from `pages/` directory:

- `pages/index.vue` -> `/`
- `pages/users/[id].vue` -> `/users/:id`
- `pages/posts/[...slug].vue` -> `/posts/*` (catch-all)
- `pages/admin.vue` + `pages/admin/settings.vue` -> nested routes

Route middleware in Nuxt:
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo('/login')
})
```

### 1.6 Data Flow Patterns

- **Props down, events up** — the fundamental Vue data flow pattern
- **v-model / defineModel** (Vue 3.4+) — two-way binding macro for parent-child sync
- **Provide/Inject** — skip intermediate components in deep trees
- **Pinia** — cross-tree or cross-route state sharing
- **Event bus** — AVOID in Vue 3; use Pinia or provide/inject instead

`defineModel` (stable in Vue 3.4+) simplifies v-model support:

```vue
<script setup lang="ts">
const modelValue = defineModel<string>({ required: true })
</script>
```

### 1.7 Error Handling

**onErrorCaptured** — lifecycle hook that catches errors from descendant components:

```typescript
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err: Error) => {
  error.value = err
  return false  // Prevents error from propagating further
})
```

**Error boundary component pattern:**

```vue
<!-- ErrorBoundary.vue -->
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
const error = ref<Error | null>(null)
const reset = () => { error.value = null }
onErrorCaptured((err: Error) => {
  error.value = err
  return false
})
</script>
<template>
  <slot v-if="!error" />
  <slot v-else name="fallback" :error="error" :reset="reset" />
</template>
```

Limitations: `onErrorCaptured` only catches errors during Vue lifecycle (render, setup,
watchers). Errors in `@click` handlers or setTimeout callbacks require explicit try/catch.

**Global error handler:**
```typescript
app.config.errorHandler = (err, instance, info) => {
  reportToSentry(err, { component: instance?.$options.name, info })
}
```

### 1.8 Logging & Observability

- Use `app.config.errorHandler` to funnel all uncaught Vue errors to an observability
  service (Sentry, DataDog, LogRocket)
- `app.config.warnHandler` captures Vue warnings in development
- For Nuxt 3, use the `useError()` composable and `error.vue` page for application-level
  error display
- Instrument API calls in composables (log request/response/timing)
- Use `performance.mark()` and `performance.measure()` for custom timing in critical paths

---

## 2. Anti-Patterns & Pitfalls

### 2.1 Mutating Props Directly

**Problem:** Props are one-way data flow. Mutating them causes silent overwrites on parent
re-render and makes data flow unpredictable. Vue emits a runtime warning.
**Fix:** Emit an event to the parent or use `defineModel` for two-way binding.

### 2.2 Using `reactive()` for Primitives

**Problem:** `reactive()` only works with objects. Wrapping a primitive loses reactivity
silently. Reassigning the entire reactive object also breaks reactivity.
**Fix:** Use `ref()` for primitives and single values. Prefer `ref()` as the default
unless you have a complex nested object with no reassignment.

### 2.3 Destructuring Reactive Objects

**Problem:** `const { name, age } = reactive(user)` produces plain (non-reactive) values.
Changes to `name` do not trigger re-renders.
**Fix:** Use `toRefs()`: `const { name, age } = toRefs(reactiveUser)` or use `ref()`.
In Vue 3.5+, `defineProps` supports reactive destructuring natively.

### 2.4 Combining `v-if` and `v-for` on the Same Element

**Problem:** In Vue 3, `v-if` has higher precedence than `v-for`, so the `v-if` condition
cannot access the `v-for` iteration variable. Even when it works, it re-evaluates the
condition on every render for every item.
**Fix:** Use a computed property to pre-filter the list, or wrap with a `<template v-for>`.

### 2.5 Using `v-html` with Untrusted Content

**Problem:** `v-html` renders raw HTML, bypassing Vue's automatic XSS escaping. User input
rendered via `v-html` is a direct XSS vector.
**Fix:** Sanitize with DOMPurify before rendering, or avoid `v-html` entirely for user content.

### 2.6 Overusing `$refs` / Template Refs for Data Flow

**Problem:** Reaching into child components via refs to read/write state bypasses Vue's
reactive data flow, making components tightly coupled and hard to test.
**Fix:** Use props/events or provide/inject. Reserve refs for imperative DOM operations
(focus, scroll, third-party library integration).

### 2.7 Forgetting to Clean Up Side Effects

**Problem:** Event listeners, timers, or subscriptions created in `onMounted` without
cleanup in `onUnmounted` cause memory leaks, especially in SPA navigation.
**Fix:** Always pair setup with teardown. Vue auto-cleans watchers and computed, but
manual listeners (window.addEventListener, WebSocket, setInterval) need explicit cleanup.

### 2.8 Making Computed Properties with Side Effects

**Problem:** Computed properties should be pure derivations. Mutating state, making API
calls, or triggering DOM changes inside computed breaks caching assumptions and causes
unpredictable behavior.
**Fix:** Use `watch` or `watchEffect` for side effects. Keep computed pure.

### 2.9 Deeply Nested Component Trees without Keys

**Problem:** Vue reuses DOM elements by default during list rendering. Without `:key`,
component state leaks between items during reorder/insert/delete operations.
**Fix:** Always use `:key` with `v-for`, binding to a unique stable identifier (not array index).

### 2.10 Using Array Index as `:key`

**Problem:** Array indices change when items are added, removed, or reordered. This causes
Vue to incorrectly reuse component instances, leading to stale state and visual glitches.
**Fix:** Use a unique business identifier (id, slug, UUID) as the key.

### 2.11 Giant Monolithic Components (>300 lines)

**Problem:** Components that handle fetching, state, logic, and presentation become
untestable and hard to maintain. Changes in one concern risk breaking others.
**Fix:** Extract logic into composables, split into container/presentational components,
and keep each component focused on a single responsibility.

### 2.12 Prop Drilling Through 3+ Levels

**Problem:** Passing props through intermediate components that don't use them creates
maintenance burden and tight coupling across the tree.
**Fix:** Use `provide/inject` for subtree data, or Pinia for cross-tree state.

### 2.13 Watchers That Trigger Themselves

**Problem:** A watcher that modifies the same reactive source it watches creates an
infinite loop (Vue has a recursion guard, but the logic is still wrong).
**Fix:** Use `computed` for derived state. If a watcher must write, ensure it writes to a
*different* source or use a guard condition.

### 2.14 Not Using `shallowRef` for Large Non-Reactive Data

**Problem:** `ref()` deeply proxies its value. For large datasets (10K+ items) that are
replaced wholesale but never deeply mutated, deep reactivity wastes memory and CPU.
**Fix:** Use `shallowRef()` and trigger updates via reassignment: `data.value = newData`.

---

## 3. Testing Strategy

### 3.1 Component Testing (Vitest + Vue Test Utils / @testing-library/vue)

Vitest is the recommended test runner for Vue 3 + Vite projects. It shares Vite's config
and transform pipeline, ensuring consistency between dev and test environments.

```typescript
// UserCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserCard from './UserCard.vue'

describe('UserCard', () => {
  it('renders user name', () => {
    const wrapper = mount(UserCard, {
      props: { name: 'Ada Lovelace', role: 'Engineer' }
    })
    expect(wrapper.text()).toContain('Ada Lovelace')
  })

  it('emits select event on click', async () => {
    const wrapper = mount(UserCard, {
      props: { name: 'Ada', role: 'Engineer' }
    })
    await wrapper.find('[data-testid="select-btn"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
```

**@testing-library/vue** — tests from the user's perspective (queries by role, text, label):

```typescript
import { render, screen, fireEvent } from '@testing-library/vue'

it('shows greeting after button click', async () => {
  render(GreetingButton, { props: { name: 'Ada' } })
  await fireEvent.click(screen.getByRole('button', { name: /greet/i }))
  expect(screen.getByText('Hello, Ada!')).toBeInTheDocument()
})
```

### 3.2 Composable Testing

Test composables by mounting them inside a minimal host component:

```typescript
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useCounter } from './useCounter'

function withSetup<T>(composable: () => T) {
  let result: T
  const comp = defineComponent({
    setup() {
      result = composable()
      return {}
    },
    render: () => null
  })
  const wrapper = mount(comp)
  return { result: result!, wrapper }
}

it('increments count', () => {
  const { result } = withSetup(() => useCounter(5))
  expect(result.count.value).toBe(5)
  result.increment()
  expect(result.count.value).toBe(6)
})
```

For composables that do not depend on lifecycle hooks or provide/inject, test them
as plain functions without a host component.

### 3.3 Pinia Store Testing

Use `@pinia/testing` with `createTestingPinia`:

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './useCartStore'

describe('CartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calculates total price', () => {
    const cart = useCartStore()
    cart.items = [
      { id: '1', name: 'Widget', price: 10, qty: 2 },
      { id: '2', name: 'Gadget', price: 25, qty: 1 }
    ]
    expect(cart.totalPrice).toBe(45)
  })
})
```

For component tests that need Pinia, use `createTestingPinia({ createSpy: vi.fn })` as a
plugin. Actions are auto-stubbed with `vi.fn`, allowing assertion without side effects.

### 3.4 E2E Testing (Playwright / Cypress)

**Playwright (recommended for new projects in 2025+):**

```typescript
import { test, expect } from '@playwright/test'

test('user can log in and see dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('secret')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
```

**Recommended testing distribution (inverted pyramid):**
- ~70% — Integration tests (Vitest browser mode, component + composable together)
- ~20% — Unit tests for pure logic (composables, utils, store getters)
- ~10% — E2E tests for critical user flows (login, checkout, onboarding)

### 3.5 Snapshot Testing

Use sparingly. Snapshots are useful for catching unintended template changes in stable,
presentational components. Avoid for components with dynamic data (timestamps, IDs).

```typescript
it('matches snapshot', () => {
  const wrapper = mount(AppFooter)
  expect(wrapper.html()).toMatchSnapshot()
})
```

---

## 4. Performance Considerations

### 4.1 Virtual DOM Optimization

- **`v-once`** — renders an element/component once, skips all future re-renders. Use for
  truly static content (legal text, copyright notices).
- **`v-memo`** (Vue 3.2+) — conditionally memoizes a subtree. Re-renders only when
  specified dependencies change. Especially impactful in large `v-for` lists:

```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  <ExpensiveComponent :item="item" />
</div>
```

- **`shallowRef` / `shallowReactive`** — avoids deep proxy overhead for large data that is
  replaced wholesale rather than mutated in place.
- **Stable `:key` values** — prevent unnecessary component destruction/recreation.

### 4.2 Code Splitting

**`defineAsyncComponent`** for lazy-loading heavy components:

```typescript
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  loadingComponent: ChartSkeleton,
  delay: 200,         // Show loading after 200ms
  timeout: 10000      // Fail after 10s
})
```

**Route-level splitting** — Vue Router and Nuxt both support lazy route imports by default.
In Nuxt, every page is automatically code-split.

### 4.3 SSR / SSG with Nuxt 3

Nuxt 3 supports hybrid rendering via `routeRules` in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  routeRules: {
    '/':              { prerender: true },           // SSG at build time
    '/dashboard/**':  { ssr: false },                // SPA (client-only)
    '/blog/**':       { isr: 3600 },                 // ISR, revalidate every hour
    '/api/**':        { cors: true, headers: { 'cache-control': 's-maxage=600' } }
  }
})
```

Rendering modes:
| Mode | When HTML is Generated         | Best For                          |
|------|--------------------------------|-----------------------------------|
| SSR  | Every request (server)         | Dynamic, personalized pages       |
| SSG  | Build time                     | Marketing, docs, blogs            |
| ISR  | First request, then cached     | Content that changes periodically |
| SPA  | Client-side only               | Admin panels, authenticated apps  |

### 4.4 Bundle Size Optimization

- **Tree shaking** — Vue 3 and Pinia are fully tree-shakable. Import only what you use.
- **Analyze bundles** with `npx vite-bundle-visualizer` or `nuxt analyze`
- **Externalize large deps** — move heavy libraries (chart.js, monaco) to async components
- **Image optimization** — use `<NuxtImage>` or `<NuxtPicture>` for automatic format
  conversion (WebP/AVIF), resizing, and lazy loading
- **Font optimization** — use `@nuxtjs/fontaine` to reduce CLS from web fonts

### 4.5 Core Web Vitals

| Metric | Target   | Vue-Specific Strategy                                    |
|--------|----------|----------------------------------------------------------|
| LCP    | < 2.5s   | SSR/SSG, preload hero images, font-display: swap         |
| INP    | < 200ms  | Avoid long synchronous scripts in event handlers         |
| CLS    | < 0.1    | Set explicit dimensions on images/embeds, fontaine       |
| FCP    | < 1.8s   | SSR, inline critical CSS, reduce JS bundle               |
| TTFB   | < 800ms  | Edge deployment (Cloudflare Workers, Vercel Edge)        |

---

## 5. Security Considerations

### 5.1 XSS Prevention

- Vue automatically escapes all interpolated content (`{{ }}`) — this is the primary defense
- **`v-html` bypasses escaping entirely.** Never use with user-supplied content unless
  sanitized with DOMPurify:

```typescript
import DOMPurify from 'dompurify'
const safeHtml = computed(() => DOMPurify.sanitize(rawHtml.value))
```

- Avoid dynamically constructing `href` with `javascript:` protocol — Vue warns but does
  not block this
- Do not use user input in `<component :is="userInput">` — this allows arbitrary component
  instantiation

### 5.2 CSRF Protection

- Backend should issue CSRF tokens; Vue apps should send them via headers or hidden fields
- Nuxt's `useFetch` / `$fetch` (built on ofetch) can be configured to include credentials
  and CSRF tokens automatically
- Use `SameSite=Lax` or `Strict` on session cookies
- For token-based auth (JWT), store tokens in `httpOnly` cookies (not localStorage)

### 5.3 Authentication Patterns in Nuxt

**Recommended modules (2025):**

- **nuxt-auth-utils** — minimalist, uses sealed cookies, supports OAuth providers (Google,
  GitHub, etc.) and WebAuthn/passkeys
- **@sidebase/nuxt-auth** — full-featured, supports Auth.js/NextAuth providers and
  credential-based local auth
- **Custom middleware** — for simple JWT flows, write route middleware that checks token
  validity and redirects to login

Pattern: protect routes with named middleware:

```vue
<!-- pages/admin.vue -->
<script setup>
definePageMeta({ middleware: 'auth' })
</script>
```

### 5.4 Content Security Policy (CSP)

- Configure CSP headers in Nuxt via `nitro.routeRules` or server middleware
- Vue's runtime does not require `unsafe-eval` (unlike some older frameworks)
- If using Nuxt's inline styles, you may need `style-src 'unsafe-inline'` or use nonces
- Use `helmet` middleware in Nitro for comprehensive security headers

```typescript
// server/middleware/security.ts
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  })
})
```

---

## 6. Integration Patterns

### 6.1 API Integration

**Nuxt 3 — `useFetch` / `useAsyncData`:**

```vue
<script setup>
const { data: posts, pending, error, refresh } = await useFetch('/api/posts', {
  query: { page: currentPage },
  transform: (raw) => raw.map(normalizePost)
})
</script>
```

`useFetch` is SSR-safe (deduplicates requests between server and client), handles loading
and error states, and is auto-imported.

**ofetch (standalone Vue or Nuxt server routes):**

```typescript
import { ofetch } from 'ofetch'

const api = ofetch.create({
  baseURL: '/api',
  onRequest({ options }) {
    options.headers.set('Authorization', `Bearer ${token.value}`)
  },
  onResponseError({ response }) {
    if (response.status === 401) navigateTo('/login')
  }
})
```

**TanStack Query (@tanstack/vue-query v5):**

Use when you need advanced caching, background refetching, optimistic updates, or
infinite scroll. Do NOT mix with Nuxt's `useFetch` — choose one data-fetching strategy.

```typescript
import { useQuery } from '@tanstack/vue-query'

const { data, isLoading, error } = useQuery({
  queryKey: ['posts', page],
  queryFn: () => $fetch(`/api/posts?page=${page.value}`),
  staleTime: 5 * 60 * 1000  // 5 minutes
})
```

### 6.2 Form Handling

**VeeValidate 4 + Yup/Zod** — validation-first approach:

```vue
<script setup>
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

const schema = yup.object({
  email: yup.string().required().email(),
  password: yup.string().required().min(8)
})

const { handleSubmit, errors } = useForm({ validationSchema: schema })
const { value: email } = useField('email')
const { value: password } = useField('password')

const onSubmit = handleSubmit(async (values) => {
  await loginUser(values)
})
</script>
```

**FormKit** — form-building framework with built-in validation, schema-driven forms,
accessibility, and theming. Preferred for complex forms (wizards, repeating groups).

### 6.3 CMS Integration

- **Nuxt Content** — file-based CMS using Markdown/YAML/JSON in `content/` directory
- **Strapi / Directus / Sanity** — headless CMS with Nuxt modules for data fetching
- Use `useFetch` or TanStack Query for API-driven CMS content
- Leverage ISR (`routeRules: { '/blog/**': { isr: 3600 } }`) for CMS-driven pages

### 6.4 Real-Time Communication

**Socket.io:**

```typescript
// composables/useSocket.ts
import { io, Socket } from 'socket.io-client'
import { ref, onUnmounted } from 'vue'

export function useSocket(url: string) {
  const socket: Socket = io(url)
  const connected = ref(false)

  socket.on('connect', () => { connected.value = true })
  socket.on('disconnect', () => { connected.value = false })

  onUnmounted(() => { socket.disconnect() })

  return { socket, connected }
}
```

**Server-Sent Events (SSE):** Lighter alternative for one-way server-to-client streaming.
Use native `EventSource` API wrapped in a composable with reconnection logic.

---

## 7. DevOps & Deployment

### 7.1 Build Tools

- **Vite 6.x** — default build tool for Vue 3 and Nuxt 3. HMR in <50ms for most projects.
- **Nuxt 3 + Nitro** — Nitro compiles server code for multiple deployment targets
  (Node.js, Cloudflare Workers, Vercel Edge, Deno, AWS Lambda)
- Use `vite-bundle-visualizer` or `nuxt analyze` to audit bundle composition

### 7.2 Docker Patterns

**Vue 3 SPA (multi-stage build):**

```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Nuxt 3 SSR:**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nuxt build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.output /app/.output
ENV NITRO_PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### 7.3 CI/CD & Preview Deployments

- Run `vitest run` and `vue-tsc --noEmit` in CI before build
- Use `npx playwright test` for E2E in CI (with `playwright install --with-deps` in setup)
- **Preview deployments:** Vercel, Netlify, and Cloudflare Pages auto-deploy PRs
- For self-hosted: use Docker + GitHub Actions to deploy per-PR containers

**GitHub Actions example (lint + test + build):**

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit -- --run
      - run: npm run build
```

### 7.4 Environment Configuration

- **Vite:** `VITE_` prefixed env vars are exposed to client code via `import.meta.env`
- **Nuxt 3:** Use `runtimeConfig` in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    secretApiKey: '',           // Server-only (from NUXT_SECRET_API_KEY)
    public: {
      apiBase: '/api'           // Client-exposed (from NUXT_PUBLIC_API_BASE)
    }
  }
})
```

Access in components: `useRuntimeConfig().public.apiBase`
Access in server routes: `useRuntimeConfig().secretApiKey`

### 7.5 Monitoring

- **Sentry** — `@sentry/vue` for error tracking; `@sentry/nuxt` for Nuxt integration
  (includes server-side error capture via Nitro)
- **Vercel Analytics / Speed Insights** — Core Web Vitals monitoring for Vercel-deployed apps
- Use `reportWebVitals()` from `web-vitals` library for custom CWV reporting
- Nuxt DevTools (in development) provides component inspector, route visualization,
  payload analysis, and server API testing

---

## 8. Decision Trees

### 8.1 Vue SPA vs Nuxt?

```
Need SSR, SSG, or SEO?
  YES -> Nuxt 3
  NO  -> Do you need file-based routing, auto-imports, or server API routes?
           YES -> Nuxt 3 (even as SPA via `ssr: false`)
           NO  -> Do you need maximum control over build config?
                    YES -> Vue 3 + Vite (standalone)
                    NO  -> Nuxt 3 (convention > configuration saves time)
```

**Rule of thumb:** Default to Nuxt 3 unless you have a specific reason not to (e.g.,
embedding Vue in a non-Vue application, micro-frontend, or library development).

### 8.2 Pinia vs Composable-Based State?

```
Is the state shared across unrelated components or routes?
  YES -> Pinia (global singleton, DevTools, SSR-safe)
  NO  -> Is the state scoped to a component subtree?
           YES -> provide/inject or composable with shared ref
           NO  -> Is the state local to one component?
                    YES -> Component-local ref/reactive
                    NO  -> Does the state need DevTools debugging or time-travel?
                             YES -> Pinia
                             NO  -> Composable with module-level ref (singleton pattern)
```

### 8.3 Options API vs Composition API?

```
Is this a new project or new component?
  YES -> Composition API with <script setup> (Vue 3 standard)
  NO  -> Is the existing codebase Options API?
           YES -> Is there a migration plan?
                    YES -> Migrate incrementally (both APIs work in same app)
                    NO  -> Continue Options API for consistency, but write new
                           composables in Composition API
           NO  -> Composition API

Note: Options API is NOT deprecated, but Composition API is the recommended
default for Vue 3.4+ projects. It offers better TypeScript support, better
logic reuse via composables, and more flexible code organization.
```

---

## 9. Code Examples

### 9.1 Composable with Async Data and Cleanup

```typescript
// composables/usePolling.ts
import { ref, onUnmounted } from 'vue'

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 5000) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isPolling = ref(false)
  let timerId: ReturnType<typeof setInterval> | null = null

  async function poll() {
    try {
      data.value = await fetcher()
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    }
  }

  function start() {
    if (isPolling.value) return
    isPolling.value = true
    poll() // Immediate first fetch
    timerId = setInterval(poll, intervalMs)
  }

  function stop() {
    if (timerId) clearInterval(timerId)
    timerId = null
    isPolling.value = false
  }

  onUnmounted(stop)

  return { data, error, isPolling, start, stop }
}
```

### 9.2 Pinia Setup Store with Async Action

```typescript
// stores/useUserStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User { id: string; name: string; email: string; role: string }

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isAuthenticated = computed(() => user.value !== null)

  async function fetchUser() {
    loading.value = true
    try {
      user.value = await $fetch<User>('/api/me')
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    navigateTo('/login')
  }

  return { user, loading, isAdmin, isAuthenticated, fetchUser, logout }
})
```

### 9.3 Component with defineModel (Vue 3.4+)

```vue
<!-- components/SearchInput.vue -->
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const query = defineModel<string>('query', { default: '' })
const inputRef = useTemplateRef('search-input')

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="search-input">
    <input
      ref="search-input"
      v-model="query"
      type="search"
      placeholder="Search..."
      aria-label="Search"
    />
    <button v-if="query" @click="query = ''" aria-label="Clear search">
      Clear
    </button>
  </div>
</template>
```

Usage: `<SearchInput v-model:query="searchTerm" />`

### 9.4 Nuxt Page with useFetch and Error Handling

```vue
<!-- pages/posts/[id].vue -->
<script setup lang="ts">
const route = useRoute()

const { data: post, error } = await useFetch(`/api/posts/${route.params.id}`, {
  transform: (raw) => ({
    ...raw,
    publishedAt: new Date(raw.publishedAt)
  })
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Post not found'
  })
}

useHead({
  title: () => post.value?.title ?? 'Loading...',
  meta: [{ name: 'description', content: () => post.value?.excerpt ?? '' }]
})
</script>

<template>
  <article v-if="post">
    <h1>{{ post.title }}</h1>
    <time :datetime="post.publishedAt.toISOString()">
      {{ post.publishedAt.toLocaleDateString() }}
    </time>
    <div v-html="post.sanitizedContent" />
  </article>
</template>
```

### 9.5 Error Boundary Usage

```vue
<!-- pages/dashboard.vue -->
<script setup lang="ts">
import ErrorBoundary from '~/components/ErrorBoundary.vue'
</script>

<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <ErrorBoundary>
      <RiskyWidget />
      <template #fallback="{ error, reset }">
        <div class="error-card" role="alert">
          <p>Widget failed: {{ error.message }}</p>
          <button @click="reset">Retry</button>
        </div>
      </template>
    </ErrorBoundary>
    <StableWidget />  <!-- Unaffected by RiskyWidget errors -->
  </div>
</template>
```

---

*Researched: 2026-03-07 | Sources: [Vue.js Official Docs](https://vuejs.org/guide/best-practices/performance), [Vue 3.5 Announcement](https://blog.vuejs.org/posts/vue-3-5), [Vue 3.4 Announcement](https://blog.vuejs.org/posts/vue-3-4), [Pinia Official Docs](https://pinia.vuejs.org/core-concepts/), [Nuxt 3 Directory Structure](https://nuxt.com/docs/3.x/directory-structure), [eslint-plugin-vue Rules](https://eslint.vuejs.org/rules/), [Vue Security Guide](https://vuejs.org/guide/best-practices/security), [Vue Test Utils](https://test-utils.vuejs.org/guide/), [Nuxt Hybrid Rendering (Vue School)](https://vueschool.io/articles/vuejs-tutorials/hybrid-rendering-in-nuxt-js-3/), [Composables vs Pinia vs Provide/Inject](https://vueschool.io/articles/vuejs-tutorials/composables-vs-provide-inject-vs-pinia-when-to-use-what/), [TanStack Vue Query](https://tanstack.com/query/v5/docs/framework/vue/examples/nuxt3), [VeeValidate 4](https://vee-validate.logaretm.com/v4/), [FormKit](https://formkit.com/), [Sidebase Nuxt Auth](https://nuxt.com/modules/sidebase-auth), [Nuxt Auth Utils](https://nuxt.com/modules/auth-utils), [Vue Error Boundary (Vue School)](https://vueschool.io/articles/vuejs-tutorials/what-is-a-vue-js-error-boundary-component/), [Pinia Testing Docs](https://pinia.vuejs.org/cookbook/testing.html), [Vue 3 Docker Deployment](https://marcusn.dev/articles/2025-01/setup-vue-docker-nginx), [Nuxt 3 Docker](https://markus.oberlehner.net/blog/running-nuxt-3-in-a-docker-container)*
