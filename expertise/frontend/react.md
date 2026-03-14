# React -- Expertise Module

> A React specialist designs, builds, and maintains interactive user interfaces using React 19+ and its ecosystem.
> Scope spans component architecture, state management, server/client rendering strategies, performance optimization,
> testing, security, and deployment across SPAs, SSR frameworks (Next.js, Remix), and React Native.

---

## Core Patterns & Conventions

### Project Structure

Use **feature-based co-location** over type-based folders. Group by domain, not by file type.

```
src/
  features/
    auth/
      components/        # LoginForm.tsx, AuthGuard.tsx
      hooks/             # useAuth.ts
      api/               # auth.queries.ts (TanStack Query)
      schemas/           # auth.schema.ts (Zod)
      __tests__/         # LoginForm.test.tsx
      index.ts           # public barrel export
    dashboard/
      components/
      hooks/
      api/
      index.ts
  shared/
    components/          # Button.tsx, Modal.tsx (design system primitives)
    hooks/               # useDebounce.ts, useMediaQuery.ts
    lib/                 # utils, constants, type helpers
    providers/           # ThemeProvider, QueryProvider
  app/                   # entry point, routing, global layout
```

Rules:
- Maximum 2-3 levels of folder nesting. Deep hierarchies create unwieldy import paths.
- Use **barrel exports** (`index.ts`) per feature to define the public API.
- Co-locate tests, styles, and stories with the component they belong to.
- Use `kebab-case` for file/folder names (avoids OS case-sensitivity bugs); `PascalCase` for component names in code.

### Naming Conventions & Code Style

| Item | Convention | Example |
|---|---|---|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase, `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase, no `I` prefix | `type UserProfile = {...}` |
| Files/folders | kebab-case | `user-profile/` |

Tooling baseline:
- **ESLint** with `eslint-plugin-react-hooks` (enforce Rules of Hooks) + `eslint-plugin-jsx-a11y`.
- **Prettier** for formatting (single config, no debates).
- **TypeScript** in strict mode (`"strict": true`). No `any` -- use `unknown` + type narrowing.
- **Biome** (v1.9+) as an alternative all-in-one linter/formatter replacing ESLint + Prettier.

### Architecture Patterns

**Component Composition** -- prefer composition over prop drilling:
```tsx
<Card>
  <Card.Header title="Dashboard" />
  <Card.Body>{children}</Card.Body>
  <Card.Footer actions={<Button>Save</Button>} />
</Card>
```

**Compound Components** -- share implicit state via Context between related components (e.g., `<Tabs>`, `<Tab>`, `<TabPanel>`).

**Render Props & Headless Components** -- separate logic from presentation. Libraries like Radix UI, Headless UI, and TanStack Table use this pattern. Prefer custom hooks over render props for new code.

**Container/Presentational split** -- in React 19+, Server Components naturally become "containers" (data fetching, auth) while Client Components handle interactivity.

### State Management

**Decision hierarchy** (start simple, escalate only when needed):

1. **Local state** -- `useState` / `useReducer` for single-component state.
2. **Lifted state** -- share between siblings by lifting to nearest common parent.
3. **Server state** -- **TanStack Query v5** (or SWR) for all API data. Handles caching, background refetch, optimistic updates, pagination. Covers ~80% of "global state" needs.
4. **URL state** -- search params, filters, pagination belong in the URL via `useSearchParams` or TanStack Router's type-safe search params.
5. **Client global state** -- only when you have truly global, synchronous, client-only state (theme, sidebar open, user preferences):
   - **Zustand** (v5) -- minimal API, ~1KB, works outside React. Best default choice.
   - **Jotai** (v2) -- atomic model, fine-grained reactivity. Best for complex derived state.
   - **Redux Toolkit** -- only for large teams already invested in Redux. Avoid for new projects unless mandated.
6. **React Context** -- fine for low-frequency updates (theme, locale). Avoid for high-frequency state (causes full subtree re-renders).

### Routing (2025-2026)

| Router | Best For | Key Feature |
|---|---|---|
| **Next.js App Router** (v15+) | Full-stack apps, SSR/SSG/ISR | File-based routing, Server Components, server actions |
| **React Router v7** | SPAs or framework mode (Remix successor) | Loaders/actions, nested routes, framework mode for SSR |
| **TanStack Router** (v1) | Type-safe SPAs, Vite-based apps | 100% type-safe routes + search params, built-in data loading |

React Router v7 in **framework mode** is effectively Remix v3. In library mode, it remains a traditional SPA router. TanStack Router leads in TypeScript type safety -- routes, params, and search params are fully inferred.

### Data Flow: Server Components, Server Actions, Suspense

**React Server Components (RSC)** -- components that run only on the server. They can directly access databases, read files, call internal services. They ship zero JavaScript to the client.

- Default in Next.js App Router: every component is a Server Component unless marked `"use client"`.
- Use `"use client"` only for interactive components (event handlers, hooks, browser APIs).
- Server Components can render Client Components (not vice versa -- pass Client Components as `children` or props).

**Server Actions** -- async functions marked with `"use server"` that run on the server but are callable from client forms/events. Replace API routes for mutations.

**Suspense** -- wrap async components in `<Suspense fallback={<Skeleton />}>` to show loading states declaratively. Nest Suspense boundaries for granular loading (don't wrap the entire page in one boundary).

### Error Handling

**Error Boundaries** -- class components (or `react-error-boundary` library) that catch render-time errors in their subtree and display fallback UI.

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary
  fallback={<ErrorFallback />}
  onReset={() => queryClient.invalidateQueries()}
>
  <Dashboard />
</ErrorBoundary>
```

Strategy:
- Place Error Boundaries at **layout boundaries** (page, section, widget level) -- not around every component.
- Error Boundaries do NOT catch: event handler errors, async errors (setTimeout, Promises outside Suspense), or server-side errors.
- In Server Components (Next.js): use `error.tsx` files for route-level error handling. Use try/catch in server actions.
- For event handlers: use try/catch and report to error tracking (Sentry).
- For async operations with `use()`: errors propagate to the nearest Error Boundary automatically.

### Logging & Observability

- **Client-side**: Sentry (error tracking + performance), LogRocket or FullStory (session replay).
- **Server-side** (RSC / server actions): structured logging with `pino` or `winston`. Correlate with request IDs.
- **Core Web Vitals**: use `web-vitals` library or Next.js built-in analytics. Track LCP, INP, CLS.
- **Custom metrics**: track key user flows (time to interactive form, checkout completion rate).

---

## Anti-Patterns & Pitfalls

### 1. Derived State in useEffect
**Problem**: Storing a value in state that can be computed from existing props or state, then "syncing" it with useEffect. Causes unnecessary re-renders, sync bugs, and stale data.
**Fix**: Compute derived values inline during render: `const fullName = firstName + ' ' + lastName;`

### 2. Using useEffect for User Events
**Problem**: Firing side effects from user actions (button clicks, form submissions) inside useEffect by toggling a flag state. This is convoluted and error-prone.
**Fix**: Call the side effect directly in the event handler. useEffect is for synchronizing with external systems, not responding to user interactions.

### 3. Props in State (Stale Closure)
**Problem**: Copying props into useState (`const [value, setValue] = useState(props.value)`). The state never updates when props change, creating stale data.
**Fix**: Use the prop directly, or if you need a local draft, use a `key` prop to reset the component: `<Editor key={item.id} initialValue={item.value} />`.

### 4. Overusing Context for High-Frequency State
**Problem**: Putting rapidly changing state (mouse position, input text, animation frames) in React Context. Every consumer re-renders on every change.
**Fix**: Use Zustand, Jotai, or `useSyncExternalStore` for high-frequency state. Reserve Context for low-frequency values (theme, locale, auth).

### 5. Array Index as Key
**Problem**: Using `index` as the `key` prop in lists. When items are reordered, inserted, or deleted, React reuses the wrong DOM nodes, causing state bugs and visual glitches.
**Fix**: Use a stable, unique identifier from your data (`item.id`).

### 6. Giant Monolith Components
**Problem**: Components exceeding 200-300 lines that handle data fetching, business logic, and rendering. Hard to test, reuse, or understand.
**Fix**: Extract custom hooks for logic, break UI into smaller composed components. One component = one responsibility.

### 7. Premature Optimization (Manual Memoization)
**Problem**: Wrapping everything in `useMemo`, `useCallback`, and `React.memo` without measuring. Adds complexity and memory overhead.
**Fix**: With React 19 Compiler (stable since October 2025), memoization is automatic. Remove manual `useMemo`/`useCallback` in Compiler-enabled projects. Without the Compiler, profile first with React DevTools before memoizing.

### 8. Fetching Data in useEffect
**Problem**: Using `useEffect` + `useState` for data fetching leads to waterfalls, race conditions, no caching, no deduplication, and missing loading/error states.
**Fix**: Use TanStack Query, SWR, or server-side data fetching (RSC, loaders). These handle caching, deduplication, background refresh, and error/loading states.

### 9. Prop Drilling Through Many Layers
**Problem**: Passing props through 4+ intermediate components that don't use them, creating tight coupling and maintenance burden.
**Fix**: Use component composition (`children` pattern), Context for truly global data, or Zustand for shared client state.

### 10. Direct DOM Mutation
**Problem**: Directly modifying the DOM via refs or document selectors. Bypasses React's virtual DOM and can cause XSS, stale UI, or crashes.
**Fix**: Let React own the DOM. Use state to drive rendering. Only use refs for measuring, focusing, or integrating non-React libraries.

### 11. Not Handling Loading and Error States
**Problem**: Showing nothing (blank screen) or crashing when data is loading or an API call fails.
**Fix**: Always handle loading, error, and empty states. Use Suspense + Error Boundaries for declarative handling.

### 12. Ignoring Accessibility
**Problem**: Using `<div onClick>` instead of `<button>`, missing labels, no keyboard navigation. Excludes users and fails audits.
**Fix**: Use semantic HTML elements. Add `aria-*` attributes. Test with axe-core and keyboard navigation. Use `eslint-plugin-jsx-a11y`.

### 13. Leaking Secrets to the Client Bundle
**Problem**: Using server secrets (API keys, database URLs) in client components. They end up in the JavaScript bundle, visible to anyone.
**Fix**: Only use `NEXT_PUBLIC_` / `VITE_` prefixed vars on the client. Keep secrets in server-only code (Server Components, API routes, server actions).

### 14. Unnecessary "use client" Directives
**Problem**: Marking entire pages as Client Components when only a small interactive part needs it. Ships unnecessary JavaScript.
**Fix**: Push `"use client"` to the smallest leaf component that needs interactivity. Keep data fetching and layout in Server Components.

---

## Testing Strategy

### Testing Pyramid for React

```
        /  E2E (Playwright)  \        3-5 critical user journeys
       / Integration Tests     \       Component interactions, API integration
      /  Component Tests (RTL)   \     User-facing behavior
     /  Unit Tests (Vitest)        \   Pure functions, hooks, utilities
```

### Component Testing -- React Testing Library + Vitest

React Testing Library (RTL) is the standard. It enforces testing **user behavior**, not implementation details.

```tsx
// UserGreeting.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserGreeting } from "./UserGreeting";

test("displays greeting after user enters name", async () => {
  const user = userEvent.setup();
  render(<UserGreeting />);

  await user.type(screen.getByRole("textbox", { name: /name/i }), "Alice");
  await user.click(screen.getByRole("button", { name: /greet/i }));

  expect(screen.getByText(/hello, alice/i)).toBeInTheDocument();
});
```

**What to test**: user-visible behavior, accessibility (roles, labels), error states, loading states.
**What NOT to test**: internal state values, implementation details (number of re-renders, hook calls), CSS class names.

### Test Runner: Vitest (v2+)

Vitest is the modern default for React projects using Vite. 10-20x faster than Jest on large codebases. Native ESM, TypeScript, and JSX support.

For Jest-based codebases: Jest 30 (mid-2025) improved performance and TypeScript 5.4+ support. Migration is optional but recommended for new projects.

### E2E Testing -- Playwright

Playwright is the recommended E2E framework. Run 3-5 critical user journeys (signup, checkout, core workflow).

```ts
// checkout.spec.ts
test("user can complete checkout", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.getByRole("link", { name: "Cart" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

### Mocking Patterns

- **API mocking**: Use **MSW (Mock Service Worker)** v2 to intercept network requests at the service worker level. Works in both tests and browser dev. Avoids mocking fetch/axios internals.
- **Module mocking**: Use `vi.mock()` (Vitest) sparingly -- prefer dependency injection or MSW.
- **Time/Date mocking**: `vi.useFakeTimers()` for timer-dependent logic.

### Visual Regression

Use **Chromatic** (Storybook) or **Playwright visual comparisons** for catching unintended UI changes. Especially valuable for design system components.

---

## Performance Considerations

### React 19 Compiler (Stable since October 2025)

The React Compiler analyzes your code at build time and automatically applies memoization where safe. This eliminates the need for manual `useMemo`, `useCallback`, and `React.memo` in most cases.

- Enable in Next.js 15+: `reactCompiler: true` in `next.config.ts`.
- Enable in Vite: via `babel-plugin-react-compiler`.
- The Compiler does NOT fix logic errors (derived state in useEffect, props in state). It only optimizes re-renders.

### Code Splitting & Lazy Loading

```tsx
import { lazy, Suspense } from "react";

const AdminPanel = lazy(() => import("./features/admin/AdminPanel"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminPanel />
    </Suspense>
  );
}
```

- Split by **route** (automatic in Next.js and React Router).
- Split heavy components (charts, editors, maps) that aren't needed on initial load.
- Use `React.lazy` + `Suspense` for client-side code splitting.
- For Next.js: use `next/dynamic` with `{ ssr: false }` for client-only heavy components.

### Virtualization for Large Lists

For lists with 1000+ items, use **TanStack Virtual** (formerly react-virtual) or `react-window`. Only renders visible items in the viewport.

### Bundle Size Optimization

- Analyze with `npx vite-bundle-visualizer` or `@next/bundle-analyzer`.
- Tree-shake: use ES modules, avoid barrel files that import everything.
- Replace heavy libraries: `date-fns` over `moment`, `clsx` over `classnames`.
- Set target budget: <200KB JavaScript (compressed) for initial load.

### Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5-4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | < 200ms | 200-500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | < 1.8s | 1.8-3.0s | > 3.0s |

Strategies: prioritize Server Components (zero JS), optimize images (`next/image`, AVIF/WebP), preload critical fonts, minimize layout shifts with explicit dimensions.

---

## Security Considerations

### XSS Prevention

React auto-escapes JSX expressions by default. The primary XSS risk vectors are:

- **Rendering unsanitized HTML**: Always sanitize user-provided HTML with `DOMPurify` before injecting raw HTML content into the page.
- **URL injection**: Validate URLs before rendering in `href`/`src` -- reject `javascript:` protocol schemes.
- **DOM manipulation via refs**: Avoid setting raw HTML content through DOM references; let React manage the DOM.
- **Content Security Policy**: Use a strict CSP header to prevent inline script execution.

### CSRF Protection

- Use anti-CSRF tokens for all state-changing requests (server actions handle this automatically in Next.js).
- Set `SameSite=Strict` or `SameSite=Lax` on cookies.
- Validate `Origin` and `Referer` headers on the server.

### Authentication Patterns

| Solution | Type | Best For |
|---|---|---|
| **Auth.js v5** (NextAuth) | Open source, self-hosted | Full control, no vendor lock-in, custom DB |
| **Clerk** | Managed service | Fast setup (5 min), pre-built UI, MFA out of box |
| **Better Auth** | Open source, self-hosted | TypeScript-first, modern API, growing ecosystem |
| **Supabase Auth** | Managed (with DB) | Already using Supabase for backend |

Best practices:
- Store tokens in `httpOnly` cookies, not localStorage.
- Implement RBAC (role-based access control) on the server, not just the client.
- Use short-lived access tokens + refresh token rotation.

### Environment Variables & Secrets

- Client-exposed vars: `NEXT_PUBLIC_*` (Next.js) or `VITE_*` (Vite). These are embedded in the bundle.
- Server-only secrets: no prefix. Access only in Server Components, API routes, server actions.
- Never commit `.env` files. Use `.env.example` as a template.
- In CI/CD: use platform secrets (Vercel Environment Variables, GitHub Secrets).

---

## Integration Patterns

### API Integration

**TanStack Query v5** is the standard for server state:

```tsx
// features/users/api/users.queries.ts
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

export const usersQueryOptions = queryOptions({
  queryKey: ["users"],
  queryFn: () => fetch("/api/users").then((r) => r.json()),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// features/users/components/UserList.tsx
export function UserList() {
  const { data: users } = useSuspenseQuery(usersQueryOptions);
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

For Next.js App Router: prefer **server-side data fetching** in Server Components with `fetch()` (automatic request deduplication and caching). Use TanStack Query only for client-side interactivity (polling, optimistic updates, infinite scroll).

**Server Actions** for mutations:
```tsx
// app/actions/user.ts
"use server";
import { revalidatePath } from "next/cache";

export async function updateUser(formData: FormData) {
  const name = formData.get("name") as string;
  await db.user.update({ where: { id: userId }, data: { name } });
  revalidatePath("/profile");
}
```

### Form Handling

**React Hook Form + Zod** is the dominant combination:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((data) => loginAction(data))}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}
      <button type="submit">Log in</button>
    </form>
  );
}
```

For server-first forms (Next.js): **Conform** integrates natively with server actions and provides progressive enhancement (forms work without JavaScript).

### CMS & Headless Integration

Use headless CMS (Sanity, Contentful, Strapi) with:
- Server Components for fetching CMS data at the server level (no client JS).
- ISR or on-demand revalidation (`revalidateTag`) for content updates without full rebuilds.
- Draft mode / preview for content editors.

### Real-Time Patterns

- **WebSockets**: use `socket.io-client` or native WebSocket API. Wrap in a custom hook, manage connection lifecycle.
- **Server-Sent Events (SSE)**: simpler than WebSockets for one-way server-to-client streams (notifications, live feeds).
- **TanStack Query `refetchInterval`**: polling as a simpler alternative for near-real-time needs.
- For Next.js: consider Vercel's `ai` SDK for streaming LLM responses via RSC.

---

## DevOps & Deployment

### Build Tools

| Tool | Use Case | Notes |
|---|---|---|
| **Vite 6+** | SPAs, library development | Fast HMR, Rollup-based production builds |
| **Next.js 15+** | Full-stack apps | Turbopack (stable dev, beta prod in 15.5), built-in SSR/SSG |
| **React Router v7** (framework mode) | Full-stack, Shopify ecosystem | Vite-powered, progressive enhancement |

### Docker Pattern (Multi-Stage Build)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

For Next.js: use the official `output: "standalone"` option in `next.config.ts` for a minimal Docker image without nginx.

### CI/CD & Preview Deployments

- **Vercel / Netlify**: zero-config deployments with automatic preview URLs per PR.
- **GitHub Actions** baseline:
  1. `npm ci` -- install dependencies (cached).
  2. `npm run lint` -- ESLint + TypeScript check.
  3. `npm run test` -- Vitest unit/integration tests.
  4. `npm run build` -- verify production build succeeds.
  5. `npx playwright test` -- E2E tests (on preview deployment URL).
- Run Lighthouse CI in CI/CD to catch Core Web Vitals regressions.

### Environment Configuration

- Use `.env.local` (gitignored) for local development.
- Platform-level secrets for staging/production (Vercel Environment Variables, AWS SSM, Doppler).
- Validate env vars at build time with `@t3-oss/env-nextjs` or Zod schema.

### Monitoring

| Tool | Purpose |
|---|---|
| **Sentry** | Error tracking, performance monitoring, session replay |
| **LogRocket** | Session replay, state inspection |
| **Vercel Analytics** | Core Web Vitals, real user monitoring |
| **Checkly** | Synthetic monitoring (Playwright-based) |
| **Grafana / Datadog** | Infrastructure + application metrics |

Sentry integration: install `@sentry/nextjs` or `@sentry/react`, configure source maps upload in CI, set up release tracking.

---

## Decision Trees

### 1. Which Meta-Framework?

```
Need SSR, SSG, or SEO?
  |
  +-- Yes --> Do you need a full-stack framework?
  |             |
  |             +-- Yes --> Is your team already on Shopify/Remix?
  |             |            |
  |             |            +-- Yes --> React Router v7 (framework mode)
  |             |            +-- No  --> Next.js 15+ (default choice)
  |             |
  |             +-- No --> Static site? --> Astro (with React islands)
  |
  +-- No --> Building an SPA (dashboard, admin, internal tool)?
              |
              +-- Yes --> Need strong type-safe routing?
              |            |
              |            +-- Yes --> Vite + TanStack Router
              |            +-- No  --> Vite + React Router v7 (library mode)
              |
              +-- No --> Evaluate if React is the right tool
```

### 2. Which State Management?

```
What kind of state?
  |
  +-- Server data (API responses, DB queries)
  |     --> TanStack Query v5 (always)
  |
  +-- URL state (filters, pagination, search)
  |     --> useSearchParams / TanStack Router search params
  |
  +-- Form state (inputs, validation)
  |     --> React Hook Form + Zod
  |
  +-- Client global state (theme, sidebar, user prefs)
  |     |
  |     +-- Simple (2-3 values, low frequency)
  |     |     --> React Context
  |     |
  |     +-- Medium complexity
  |     |     --> Zustand (default choice)
  |     |
  |     +-- Complex derived/atomic state
  |     |     --> Jotai
  |     |
  |     +-- Large team, existing Redux codebase
  |           --> Redux Toolkit (maintain, don't start new)
  |
  +-- Local component state
        --> useState / useReducer
```

### 3. SSR vs CSR vs SSG?

```
Does the page need SEO?
  |
  +-- No --> Is it highly interactive (real-time, SPA)?
  |           |
  |           +-- Yes --> CSR (Vite SPA)
  |           +-- No  --> SSG (prerender at build time)
  |
  +-- Yes --> Does content change per request (user-specific)?
              |
              +-- Yes --> Does it change every request?
              |            |
              |            +-- Yes --> SSR (streaming with Suspense)
              |            +-- No  --> ISR (revalidate on interval or on-demand)
              |
              +-- No --> Is content updated frequently?
                          |
                          +-- Yes --> ISR (revalidate every N seconds)
                          +-- No  --> SSG (build-time generation)

Modern default: Use Server Components (Next.js App Router). Components are
server-rendered by default. Add "use client" only for interactive leaves.
Most apps combine multiple strategies per route using component-level decisions.
```

---

## Code Examples

### 1. Data Fetching with use() and Suspense (React 19)

```tsx
// Server Component -- fetches data, no client JS
import { Suspense } from "react";

async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export default async function UserPage({ params }: { params: { id: string } }) {
  const userPromise = getUser(params.id);

  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// Client Component -- reads the promise with use()
"use client";
import { use } from "react";

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### 2. Form with useActionState and Server Action (React 19)

```tsx
// app/actions/signup.ts
"use server";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signup(prevState: any, formData: FormData) {
  const result = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }
  await db.user.create({ data: result.data });
  return { success: true };
}

// app/signup/page.tsx
"use client";
import { useActionState } from "react";
import { signup } from "../actions/signup";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      {state?.error?.email && <p>{state.error.email}</p>}

      <input name="password" type="password" required />
      {state?.error?.password && <p>{state.error.password}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? "Signing up..." : "Sign Up"}
      </button>
      {state?.success && <p>Account created.</p>}
    </form>
  );
}
```

### 3. Zustand Store with TanStack Query (Client State + Server State)

```tsx
// stores/ui.store.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// features/projects/api/projects.queries.ts
import { queryOptions } from "@tanstack/react-query";

export const projectsQueryOptions = (teamId: string) =>
  queryOptions({
    queryKey: ["projects", teamId],
    queryFn: () =>
      fetch(`/api/teams/${teamId}/projects`).then((r) => r.json()),
    staleTime: 10 * 60 * 1000,
  });

// features/projects/components/ProjectList.tsx
"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { projectsQueryOptions } from "../api/projects.queries";
import { useUIStore } from "@/stores/ui.store";

export function ProjectList({ teamId }: { teamId: string }) {
  const { data: projects } = useSuspenseQuery(projectsQueryOptions(teamId));
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className={sidebarOpen ? "ml-64" : "ml-0"}>
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
```

### 4. Type-Safe Routing with TanStack Router

```tsx
// routes/users.$userId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const userSearchSchema = z.object({
  tab: z.enum(["profile", "settings", "activity"]).optional().default("profile"),
  page: z.number().optional().default(1),
});

export const Route = createFileRoute("/users/$userId")({
  validateSearch: userSearchSchema,
  loader: ({ params }) => fetchUser(params.userId), // fully typed
  component: UserPage,
});

function UserPage() {
  const { userId } = Route.useParams();    // typed: string
  const { tab, page } = Route.useSearch(); // typed: { tab, page }
  const user = Route.useLoaderData();      // typed: User

  return <UserDetail user={user} activeTab={tab} page={page} />;
}
```

### 5. Error Boundary with Recovery

```tsx
"use client";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryClient } from "@tanstack/react-query";

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export function DashboardErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

*Researched: 2026-03-07 | Sources: [React v19 Blog](https://react.dev/blog/2024/12/05/react-19), [React 19.2 Release](https://react.dev/blog/2025/10/01/react-19-2), [React Folder Structure -- Robin Wieruch](https://www.robinwieruch.de/react-folder-structure/), [React State Management 2025 -- developerway.com](https://www.developerway.com/posts/react-state-management-2025), [React Stack Patterns 2026 -- patterns.dev](https://www.patterns.dev/react/react-2026/), [TanStack Router vs React Router -- ekino](https://medium.com/ekino-france/tanstack-router-vs-react-router-v7-32dddc4fcd58), [Vite vs Next.js 2026 -- designrevision.com](https://designrevision.com/blog/vite-vs-nextjs), [Next.js vs Remix 2025 -- strapi.io](https://strapi.io/blog/next-js-vs-remix-2025-developer-framework-comparison-guide), [React Security Best Practices -- Corgea](https://corgea.com/Learn/react-security-best-practices-2025), [React Security 2026 -- glorywebs.com](https://www.glorywebs.com/blog/react-security-practices), [Testing in 2026 -- nucamp.co](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies), [React Performance Best Practices -- alexbobes.com](https://alexbobes.com/programming/best-practices-for-optimizing-your-react-application/), [React Compiler 2025 -- Medium](https://medium.com/@ankushchavan0411/react-compiler-in-2025-how-it-will-change-performance-optimization-9bc08b8c05e5), [15 React Anti-Patterns -- jsdev.space](https://jsdev.space/react-anti-patterns-2025/), [CSR vs SSR vs SSG vs ISR 2026 -- hashbyt.com](https://hashbyt.com/blog/csr-vs-ssr-vs-ssg-vs-isr), [NextAuth vs Clerk vs Auth.js -- Medium](https://chhimpashubham.medium.com/nextauth-js-vs-clerk-vs-auth-js-which-is-best-for-your-next-js-app-in-2025-fc715c2ccbfd), [React Hook Form + Zod -- freecodecamp.org](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/), [Docker Multi-Stage React Build -- docker.com](https://www.docker.com/blog/how-to-dockerize-react-app/), [Sentry Vercel Integration](https://docs.sentry.io/organization/integrations/deployment/vercel/)*
