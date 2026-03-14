# Angular — Expertise Module

> An Angular specialist designs, builds, and maintains web applications using Angular (v17+),
> leveraging standalone components, signal-based reactivity, and the modern Angular toolchain.
> Scope spans component architecture, state management, performance optimization, SSR, security, and DevOps.

---

## Core Patterns & Conventions

### Project Structure

**Standalone-first (Angular 19+ default):**

```
src/
  app/
    app.component.ts          # Root standalone component
    app.config.ts              # provideRouter, provideHttpClient, etc.
    app.routes.ts              # Top-level route config
    core/                      # Singletons: auth, error handler, interceptors
      interceptors/
      guards/
      services/
    shared/                    # Reusable pipes, directives, UI primitives
      components/
      directives/
      pipes/
    features/
      dashboard/
        dashboard.component.ts
        dashboard.routes.ts
        components/            # Dumb/presentational components
        services/              # Feature-scoped services
        models/
      users/
        ...
    layouts/                   # Shell components (sidebar, header)
  environments/
    environment.ts
    environment.prod.ts
```

**Nx Monorepo (enterprise):**

```
apps/
  web-app/
  admin-app/
libs/
  shared/ui/                  # Reusable UI components
  shared/data-access/         # HTTP services, stores
  shared/util/                # Pure utility functions
  feature-dashboard/          # Feature library
  feature-auth/
```

Nx enforces module boundaries via `@nx/enforce-module-boundaries` lint rule. Library categories: `feature`, `data-access`, `ui`, `util`, `shell`.

### Naming Conventions (Angular Style Guide)

| Artifact          | Pattern                            | Example                        |
|-------------------|------------------------------------|--------------------------------|
| Component         | `feature-name.component.ts`        | `user-list.component.ts`       |
| Service           | `feature-name.service.ts`          | `auth.service.ts`              |
| Directive         | `feature-name.directive.ts`        | `highlight.directive.ts`       |
| Pipe              | `feature-name.pipe.ts`             | `truncate.pipe.ts`             |
| Guard             | `feature-name.guard.ts`            | `auth.guard.ts`                |
| Interceptor       | `feature-name.interceptor.ts`      | `error.interceptor.ts`         |
| Interface/Model   | `feature-name.model.ts`            | `user.model.ts`                |
| Route config      | `feature-name.routes.ts`           | `dashboard.routes.ts`          |

- Use `kebab-case` for file names, `PascalCase` for classes, `camelCase` for methods/properties.
- Prefix selectors: `app-` for app components, `shared-` for shared library components.
- One class per file. Max 400 lines per component file — split if larger.

### Architecture Patterns

**Smart (Container) vs Dumb (Presentational) Components:**

- **Smart components**: inject services, manage state, dispatch actions, handle routing. Located in `features/<name>/`.
- **Dumb components**: receive data via `input()`, emit events via `output()`. Located in `features/<name>/components/` or `shared/components/`.
- Dumb components must have zero service dependencies and `changeDetection: ChangeDetectionStrategy.OnPush`.

**Feature-based architecture**: group all related code (components, services, routes, models) inside a single feature directory. Each feature owns its own routes file and lazy-loads independently.

### Signal-Based Reactivity (Angular 17+)

Signals are Angular's synchronous, fine-grained reactivity primitive. As of Angular 19-20, signals, `computed()`, `effect()`, `linkedSignal()`, `input()`, `output()`, `viewChild()`, and `contentChild()` are all stable.

```typescript
// Signal basics
count = signal(0);
doubleCount = computed(() => this.count() * 2);

// Signal inputs (replacing @Input)
name = input<string>();               // optional
name = input.required<string>();      // required
name = input('default');              // with default

// Signal outputs (replacing @Output)
clicked = output<MouseEvent>();

// Model inputs (two-way binding)
value = model<string>('');            // parent binds with [(value)]

// Signal queries (replacing @ViewChild/@ContentChild)
myRef = viewChild<ElementRef>('myRef');
items = contentChildren(ItemComponent);
```

**`effect()`** runs side effects when signals change. Use sparingly — prefer `computed()` for derived state:

```typescript
effect(() => {
  console.log(`Count changed: ${this.count()}`);
});
```

**`linkedSignal()`** (Angular 19+): a writable signal that resets when a source changes:

```typescript
selectedIndex = linkedSignal({
  source: this.items,
  computation: () => 0  // reset to 0 when items change
});
```

**`resource()` / `rxResource()`** (Angular 19+): declarative async data fetching tied to signals:

```typescript
userData = rxResource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) => this.http.get<User>(`/api/users/${request.id}`)
});
// userData.value(), userData.isLoading(), userData.error()
```

### State Management

**Tier 1 — Local component state**: plain `signal()` + `computed()`. Sufficient for most components.

**Tier 2 — Shared feature state**: injectable service with signals:

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() =>
    this._items().reduce((sum, i) => sum + i.price * i.qty, 0)
  );

  addItem(item: CartItem) {
    this._items.update(items => [...items, item]);
  }
}
```

**Tier 3 — NgRx SignalStore** (for complex shared state with plugins):

```typescript
export const ProductStore = signalStore(
  { providedIn: 'root' },
  withState({ products: [] as Product[], loading: false }),
  withComputed(({ products }) => ({
    count: computed(() => products().length),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    loadProducts: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => http.get<Product[]>('/api/products')),
        tap(products => patchState(store, { products, loading: false }))
      )
    ),
  }))
);
```

**Tier 4 — NgRx Store** (global Redux pattern): use only when you need DevTools time-travel, action logging across the entire app, or complex action orchestration with Effects. High boilerplate cost (actions, reducers, selectors, effects).

### Routing

**Standalone route config (Angular 17+):**

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes')
      .then(m => m.ADMIN_ROUTES),
    canActivate: [authGuard],
  },
];
```

**Functional guards (Angular 15+):**

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
```

- Prefer `loadComponent` for single-component routes and `loadChildren` for feature route groups.
- Use `resolve` for route data pre-fetching. Use `canMatch` to conditionally load different components for the same route path.

### Data Flow Patterns

- **Template binding**: prefer signals over observables. Convert observables with `toSignal()` before template binding.
- **Service-to-component**: return signals from services; use `computed()` for derived state.
- **Component-to-component**: use `input()` / `output()` for parent-child; use a shared signal service for sibling communication.
- **RxJS operators** remain essential for: `debounceTime`, `switchMap`, `retry`, `combineLatest`, `merge`, `takeUntilDestroyed`.

### Error Handling

**Global ErrorHandler:**

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    // Log to Sentry / external service
    console.error('Unhandled error:', error);
  }
}

// Provide in app.config.ts
{ provide: ErrorHandler, useClass: GlobalErrorHandler }
```

**HTTP error interceptor (functional):**

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({ count: 2, delay: 1000 }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) inject(Router).navigate(['/login']);
      return throwError(() => error);
    })
  );
```

### Logging and Observability

- Use a centralized `LoggerService` that wraps `console.*` and can route to external providers (Sentry, Datadog, Application Insights).
- Instrument HTTP calls via interceptor: log request/response timings, status codes, error rates.
- Use Angular's `ErrorHandler` to funnel all unhandled errors to the logging service.
- In production, integrate Sentry Angular SDK (`@sentry/angular`) for error tracking with source maps.

---

## Anti-Patterns & Pitfalls

### 1. Not using `OnPush` change detection
**Why**: Default change detection checks the entire component subtree on every event. This causes thousands of unnecessary re-renders in large apps, degrading performance. With signals and standalone components, always pair with `OnPush`.

### 2. Calling methods in templates
**Why**: Angular re-evaluates template expressions on every change detection cycle. A method call like `{{ getTotal() }}` runs repeatedly, even when inputs have not changed. Use `computed()` signals or pure pipes instead.

### 3. Forgetting to unsubscribe from observables
**Why**: Leaked subscriptions cause memory leaks, stale callbacks, and erratic behavior. Use `takeUntilDestroyed()` (Angular 16+), `DestroyRef`, or convert to signals with `toSignal()` (which auto-unsubscribes).

### 4. Nested subscriptions (subscribe-inside-subscribe)
**Why**: Creates tightly coupled, hard-to-test code. Misses error propagation and cancellation semantics. Use `switchMap`, `mergeMap`, or `concatMap` instead.

### 5. "God components" with too many responsibilities
**Why**: Components exceeding 300+ lines with mixed template logic, HTTP calls, and business rules are untestable and unmaintainable. Extract business logic to services and split into smart/dumb component pairs.

### 6. Overusing `any` type
**Why**: Defeats TypeScript's compile-time safety. Bugs slip to runtime that the compiler would catch. Use strict typing; enable `strict: true` in `tsconfig.json`. Use `unknown` if the type is truly uncertain.

### 7. Direct DOM manipulation (ElementRef.nativeElement, document.querySelector)
**Why**: Bypasses Angular's sanitization (XSS risk), breaks SSR compatibility, and fights the framework's rendering pipeline. Use `Renderer2`, template variables, or signal-based `viewChild()`.

### 8. Putting everything in a single shared module
**Why**: Shared modules that re-export dozens of components become import-everything bundles, killing tree-shaking. With standalone components, import only what each component needs directly.

### 9. Storing sensitive tokens in localStorage
**Why**: localStorage is accessible to any script on the page, making it vulnerable to XSS exfiltration. Store tokens in HttpOnly cookies set by the server.

### 10. Importing entire RxJS or lodash
**Why**: `import * as rxjs from 'rxjs'` or `import _ from 'lodash'` prevents tree-shaking, inflating bundle size by 50-200 KB. Import specific operators: `import { map } from 'rxjs/operators'` or use `lodash-es` with named imports.

### 11. Using `async` pipe AND `toSignal()` for the same stream
**Why**: Double subscription causes duplicate HTTP calls and inconsistent state. Choose one: `toSignal()` for signal-based templates, `async` pipe for legacy observable templates.

### 12. Mutating signal values in place
**Why**: `this.items().push(newItem)` mutates the array without notifying the signal. Signals detect changes by reference. Always use `update()` with a new reference: `this.items.update(arr => [...arr, newItem])`.

### 13. Overusing `effect()` for state derivation
**Why**: `effect()` is for side effects (logging, localStorage sync), not computed state. Using `effect()` to set other signals creates hidden dependencies and glitch potential. Use `computed()` for derived state.

### 14. Not lazy-loading feature routes
**Why**: Eager loading all features means users download the entire app upfront. Route-level lazy loading with `loadComponent` / `loadChildren` can cut initial bundle size by 40-70%.

### 15. Ignoring `trackBy` in `@for` loops
**Why**: Without `track`, Angular destroys and recreates all DOM nodes on every change. The `track` expression (required in `@for`) tells Angular which items are the same across renders, enabling efficient DOM recycling.

---

## Testing Strategy

### Component Testing (TestBed)

```typescript
describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],     // standalone components go in imports
      providers: [
        { provide: UserService, useValue: { getUsers: () => signal([]) } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should render user names', () => {
    fixture.componentRef.setInput('users', [{ name: 'Alice' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });
});
```

**Component Harnesses** (Angular CDK): provide a stable, abstraction-layer API for interacting with Angular Material components in tests, decoupling test code from DOM structure.

### Service Testing

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should login and store token', () => {
    service.login('user', 'pass').subscribe(res => {
      expect(res.token).toBe('abc');
    });
    httpMock.expectOne('/api/login').flush({ token: 'abc' });
  });
});
```

### E2E Testing (Playwright)

Playwright has fully replaced Protractor (deprecated since Angular 15). Use `@ngx-playwright/test` or Playwright directly.

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('should display dashboard after login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'admin@test.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="submit"]');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toHaveText('Dashboard');
});
```

- Use `data-testid` attributes for stable selectors.
- Run in CI with `--reporter=html` for visual reports.

### Signal Testing Patterns

Test signals by reading their current value after triggering changes:

```typescript
it('should compute doubled count', () => {
  const component = TestBed.createComponent(CounterComponent).componentInstance;
  component.count.set(5);
  expect(component.doubleCount()).toBe(10);
});
```

For `effect()`, use `TestBed.flushEffects()` (Angular 18+) to synchronously flush pending effects in tests.

### Marble Testing (RxJS)

Use `TestScheduler` from `rxjs/testing` for deterministic observable testing:

```typescript
it('should debounce search input', () => {
  const scheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

  scheduler.run(({ cold, expectObservable }) => {
    const input$ = cold('--a--b----c|');
    const expected =     '--------b-------c|';
    expectObservable(input$.pipe(debounceTime(5, scheduler))).toBe(expected);
  });
});
```

### Angular 21+ Testing Revolution

- **Vitest** is becoming the default unit test runner (replacing Karma/Jest).
- **Testronaut** provides Playwright-based component testing that uses the Angular CLI build pipeline natively.

---

## Performance Considerations

### Change Detection

**OnPush + Signals = Optimal**: OnPush components only re-render when their inputs change or signals they read are updated. Signals provide fine-grained tracking so Angular knows exactly which components to check.

**Zoneless Angular (v18+ experimental, v20.2+ stable, v21+ default):**

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),  // v18-19
    // provideZonelessChangeDetection(),            // v20.2+ stable
  ],
};
```

Benefits: ~30-50 KB bundle reduction, 40-50% LCP improvement, cleaner stack traces, no Zone.js monkey-patching of async APIs.

**Requirements for zoneless**: all components must use `OnPush` or signals. No reliance on Zone.js-triggered change detection.

### Lazy Loading and Deferred Views

**Route-level lazy loading**: `loadComponent` / `loadChildren` in route config.

**`@defer` blocks (Angular 17+):**

```html
@defer (on viewport) {
  <app-heavy-chart [data]="chartData()" />
} @placeholder {
  <div class="skeleton-chart"></div>
} @loading (minimum 300ms) {
  <app-spinner />
} @error {
  <p>Failed to load chart</p>
}
```

Triggers: `on idle`, `on viewport`, `on interaction`, `on hover`, `on timer(ms)`, `when condition`.

`@defer` reduces initial bundle size by code-splitting deferred components and their dependencies into separate chunks automatically.

### SSR (Angular SSR, formerly Angular Universal)

- Built-in since Angular 17 via `@angular/ssr` package (replaces `@nguniversal/*`).
- **Hydration** (stable v17+): server-rendered HTML is reused by the client, avoiding DOM destruction/recreation.
- **Incremental Hydration** (v19.2+): combines `@defer` with SSR — server renders placeholder HTML, client hydrates deferred blocks only when triggered, loading less JavaScript upfront.
- **Hybrid Rendering** (v19+): per-route SSR/SSG/CSR configuration in `server.ts`.

```typescript
// server.ts — route-level rendering mode
serverRoutes: [
  { path: '', renderMode: RenderMode.Prerender },           // SSG
  { path: 'dashboard', renderMode: RenderMode.Server },     // SSR
  { path: 'admin/**', renderMode: RenderMode.Client },      // CSR
]
```

### Bundle Size Optimization

- **Standalone components** enable better tree-shaking — no NgModule barrel imports.
- Use `@defer` for below-the-fold components and heavy third-party libraries (chart libraries, rich text editors).
- Analyze bundles with `npx ng build --stats-json` + `webpack-bundle-analyzer` or `source-map-explorer`.
- Enable production optimizations: `ng build --configuration production` applies minification, tree-shaking, and dead-code elimination.

### Image Optimization (NgOptimizedImage)

```html
<img ngSrc="hero.jpg" width="1200" height="600" priority />
<img ngSrc="thumb.jpg" width="200" height="200" />
```

- `priority` attribute sets `fetchpriority="high"` and `loading="eager"` for LCP images.
- Non-priority images automatically get `loading="lazy"`.
- Requires explicit `width` and `height` to prevent layout shift, or use `fill` for fluid images.
- Connect an image CDN loader (Cloudinary, Imgix, etc.) for automatic `srcset` generation.

---

## Security Considerations

### Built-in XSS Protection

Angular treats all template-bound values as untrusted by default and sanitizes them. This covers:
- HTML interpolation (`{{ }}` and `[innerHTML]`)
- URL bindings (`[href]`, `[src]`)
- Style bindings

**Do NOT bypass with**: `bypassSecurityTrustHtml()` unless absolutely necessary and the content is verified safe. Document every usage with a security justification comment.

**Avoid**: `ElementRef.nativeElement.innerHTML`, `document.createElement`, and dynamic code execution — these bypass Angular's sanitizer entirely.

### CSRF Protection

```typescript
// app.config.ts
provideHttpClient(
  withXsrfConfiguration({
    cookieName: 'XSRF-TOKEN',     // cookie name from server
    headerName: 'X-XSRF-TOKEN',   // header sent with requests
  })
)
```

Server must set the XSRF cookie and validate the header. Angular's `HttpClient` reads the cookie and attaches the header automatically on mutating requests (POST, PUT, DELETE).

### Content Security Policy (CSP)

Minimum CSP for Angular apps:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}';
  style-src 'self' 'nonce-{RANDOM}';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
```

- Angular 17+ supports `nonce` for inline styles via `ngCspNonce` attribute or `CSP_NONCE` injection token.
- Avoid `unsafe-inline` for scripts. Use nonces or hashes.

### Authentication

- Use `angular-auth-oidc-client` for OpenID Connect / OAuth 2.0 flows.
- Store tokens in HttpOnly, Secure, SameSite cookies — never in `localStorage` or `sessionStorage`.
- Implement token refresh via HTTP interceptor before expiry.
- Use route guards (`canActivate`, `canMatch`) to protect routes client-side; always enforce authorization server-side.

---

## Integration Patterns

### HTTP (HttpClient)

**Functional interceptors (Angular 15+, recommended):**

```typescript
// app.config.ts
provideHttpClient(
  withInterceptors([authInterceptor, loggingInterceptor, retryInterceptor])
)
```

**Retry with exponential backoff:**

```typescript
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        if (error.status >= 400 && error.status < 500) return throwError(() => error);
        return timer(Math.pow(2, retryCount) * 1000);  // 2s, 4s, 8s
      },
    })
  );
```

**Request context tokens** for per-request configuration:

```typescript
const CACHE_ENABLED = new HttpContextToken<boolean>(() => false);

// In service
this.http.get('/api/data', {
  context: new HttpContext().set(CACHE_ENABLED, true),
});

// In interceptor
if (req.context.get(CACHE_ENABLED)) { /* serve from cache */ }
```

### Forms (Reactive, Typed)

**Typed FormGroup (Angular 14+):**

```typescript
export class ProfileFormComponent {
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    address: this.fb.group({
      street: [''],
      city: [''],
      zip: ['', Validators.pattern(/^\d{5}$/)],
    }),
  });

  onSubmit() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();  // fully typed
    // value.name is string, value.address.zip is string
  }
}
```

- Use `NonNullableFormBuilder` so `.reset()` returns to initial values, not null.
- Access controls via `this.form.controls.name` (typed) rather than `this.form.get('name')` (untyped).
- For dynamic forms, use `FormArray` with typed element types.

### Angular Material / CDK

- Import only needed components: `import { MatButtonModule } from '@angular/material/button'`.
- Use CDK primitives (`Overlay`, `DragDrop`, `A11y`, `Clipboard`) for custom UI without Material styling.
- Use component harnesses in tests: `const button = await loader.getHarness(MatButtonHarness)`.

### Real-time (WebSocket, SSE)

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket$ = webSocket<Message>('wss://api.example.com/ws');

  messages$ = this.socket$.pipe(
    retry({ delay: 3000 }),             // auto-reconnect
    share(),                            // share among subscribers
  );

  send(msg: Message) {
    this.socket$.next(msg);
  }
}
```

For SSE (Server-Sent Events), use native `EventSource` API wrapped in an Observable or signal via `rxResource`.

---

## DevOps & Deployment

### Angular CLI and Build System

**esbuild + Vite (Angular 17+ default):**

- Production builds via esbuild: `ng build` — ~56% faster than Webpack (8 min to 3.5 min in large projects).
- Dev server via Vite: `ng serve` — cold start ~12s (down from ~45s with Webpack).
- Output is ESM (`.mjs` files) by default. Ensure Node.js 20+ in CI and Docker.

```json
// angular.json
{
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "outputPath": "dist/my-app",
        "index": "src/index.html",
        "browser": "src/main.ts",
        "server": "src/main.server.ts"
      }
    }
  }
}
```

### Docker Patterns

**Multi-stage Dockerfile:**

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Production stage (static SPA)
FROM nginx:alpine
COPY --from=build /app/dist/my-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Production stage (SSR)
FROM node:20-alpine AS ssr
WORKDIR /app
COPY --from=build /app/dist/my-app .
EXPOSE 4000
CMD ["node", "server/server.mjs"]
```

**nginx.conf for SPA routing:**

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### CI/CD

```yaml
# GitHub Actions example
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx ng lint
      - run: npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
      - run: npx ng build --configuration production
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

- Cache `node_modules` and `.angular/cache` for faster CI.
- Run lint, unit tests, build, and E2E in parallel where possible.
- Use `--affected` with Nx to only build/test changed projects.

### Environment Files

```typescript
// environments/environment.ts (dev)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.example.com',
};
```

For runtime configuration (Docker/K8s), load config from `/assets/config.json` at app startup via `APP_INITIALIZER` — avoids rebuilding for each environment.

### Monitoring (Sentry)

```typescript
// app.config.ts
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: environment.sentryDsn,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
});

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    { provide: Sentry.TraceService, deps: [Router] },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
  ],
};
```

Upload source maps in CI: `npx sentry-cli sourcemaps upload dist/`.

---

## Decision Trees

### Signals vs RxJS

```
Need to manage UI state or component state?
  -> YES: Use signal() + computed()
Need derived/computed values from existing state?
  -> YES: Use computed()
Need to react to user events with debounce, throttle, switchMap?
  -> YES: Use RxJS operators
Need to combine multiple async streams (merge, combineLatest, race)?
  -> YES: Use RxJS
Working with HttpClient responses?
  -> Simple request: Use rxResource() or toSignal(this.http.get(...))
  -> Complex retry/polling/cancellation: Use RxJS pipe
Need to bridge signal <-> observable?
  -> Observable to Signal: toSignal()
  -> Signal to Observable: toObservable()
```

**Rule of thumb**: Signals for state (synchronous, value-based), RxJS for events and streams (asynchronous, time-based).

### NgRx vs Service-Based State

```
Is state local to one component or feature?
  -> YES: signal() in component or feature service
Is state shared across multiple features?
  -> Simple (2-5 properties): Injectable service with signals
  -> Medium complexity: NgRx SignalStore
  -> Complex (many entities, optimistic updates, undo/redo): NgRx Store
Do you need Redux DevTools time-travel debugging?
  -> YES: NgRx Store
Do you need action logging / audit trail?
  -> YES: NgRx Store
Is the team unfamiliar with Redux concepts?
  -> YES: Start with services + signals, adopt NgRx SignalStore if needed
```

### Standalone vs Module-Based Architecture

```
Starting a new project (Angular 17+)?
  -> YES: Standalone components (default since Angular 19)
Existing project with NgModules?
  -> Small/medium: Migrate to standalone incrementally
  -> Large enterprise: Migrate feature-by-feature; use importProvidersFrom() for legacy module compat
Using third-party libraries that require NgModules?
  -> Wrap with importProvidersFrom() in providers array
Need to share declarations across many components?
  -> Create barrel export file or shared component library
  -> Do NOT create a giant SharedModule
```

**Angular team guidance**: Standalone is the future. NgModules are in maintenance mode. All new Angular APIs are standalone-first.

---

## Code Examples

### 1. Standalone Component with Signals and OnPush

```typescript
// user-card.component.ts
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h3>{{ user().name }}</h3>
      <p>{{ user().email }}</p>
      <p>Joined: {{ user().joinedAt | date:'mediumDate' }}</p>
      <button (click)="selected.emit(user())">Select</button>
    </div>
  `,
})
export class UserCardComponent {
  user = input.required<User>();
  selected = output<User>();
}
```

### 2. Data Fetching with rxResource and Signals

```typescript
// product-list.component.ts
import { Component, signal, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input [(ngModel)]="searchTerm" placeholder="Search..." />

    @if (products.isLoading()) {
      <app-spinner />
    }

    @if (products.error()) {
      <p class="error">Failed to load products</p>
    }

    @for (product of products.value(); track product.id) {
      <app-product-card [product]="product" />
    } @empty {
      <p>No products found</p>
    }
  `,
})
export class ProductListComponent {
  private http = inject(HttpClient);
  searchTerm = signal('');

  products = rxResource({
    request: () => ({ q: this.searchTerm() }),
    loader: ({ request }) =>
      this.http.get<Product[]>('/api/products', { params: { q: request.q } }),
  });
}
```

### 3. Functional Interceptor Chain

```typescript
// interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).accessToken();
  if (!token) return next(req);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};

// interceptors/logging.interceptor.ts
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const start = performance.now();
  return next(req).pipe(
    tap({
      next: () => {
        const duration = Math.round(performance.now() - start);
        console.log(`[HTTP] ${req.method} ${req.url} -- ${duration}ms`);
      },
      error: (err) => {
        console.error(`[HTTP ERROR] ${req.method} ${req.url}`, err.status);
      },
    })
  );
};

// app.config.ts
provideHttpClient(
  withInterceptors([authInterceptor, loggingInterceptor, retryInterceptor]),
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
)
```

### 4. NgRx SignalStore with Entities

```typescript
// stores/todo.store.ts
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { withEntities, setAllEntities, addEntity, removeEntity } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withEntities<Todo>(),
  withState({ loading: false, filter: 'all' as 'all' | 'active' | 'done' }),
  withComputed(({ entities, filter }) => ({
    filteredTodos: computed(() => {
      const f = filter();
      if (f === 'all') return entities();
      return entities().filter(t => (f === 'done') === t.completed);
    }),
    remaining: computed(() => entities().filter(t => !t.completed).length),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    loadTodos: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => http.get<Todo[]>('/api/todos')),
        tap(todos => {
          patchState(store, setAllEntities(todos));
          patchState(store, { loading: false });
        })
      )
    ),
    addTodo(title: string) {
      const todo: Todo = { id: crypto.randomUUID(), title, completed: false };
      patchState(store, addEntity(todo));
    },
    removeTodo(id: string) {
      patchState(store, removeEntity(id));
    },
    setFilter(filter: 'all' | 'active' | 'done') {
      patchState(store, { filter });
    },
  }))
);
```

### 5. Deferred Loading with @defer

```typescript
@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [HeroSectionComponent],
  template: `
    <app-hero-section [title]="pageTitle()" />

    @defer (on viewport) {
      <app-heavy-chart [data]="chartData()" />
    } @placeholder {
      <div class="chart-skeleton" style="height: 400px"></div>
    } @loading (minimum 200ms) {
      <app-spinner />
    }

    @defer (on idle) {
      <app-recommendations [userId]="userId()" />
    } @placeholder {
      <p>Loading recommendations...</p>
    }

    @defer (on interaction(loadComments)) {
      <app-comments [postId]="postId()" />
    } @placeholder {
      <button #loadComments>Load Comments</button>
    }
  `,
})
export class AnalyticsPageComponent {
  pageTitle = input.required<string>();
  chartData = input.required<ChartData[]>();
  userId = input.required<string>();
  postId = input.required<string>();
}
```

---

*Researched: 2026-03-07 | Sources: [Angular Official Docs](https://angular.dev), [Angular Blog 2025 Strategy](https://blog.angular.dev/angular-2025-strategy-9ca333dfc334), [Angular Signals Guide](https://angular.dev/guide/signals), [RxJS Interop](https://angular.dev/ecosystem/rxjs-interop), [Nx Angular Architecture Guide](https://nx.dev/blog/architecting-angular-applications), [Nx State Management 2025](https://nx.dev/blog/angular-state-management-2025), [Angular Security](https://angular.dev/best-practices/security), [NgRx SignalStore](https://ngrx.io/guide/signals), [Angular SSR Guide](https://angular.dev/guide/ssr), [Angular Zoneless](https://angular.dev/guide/zoneless), [NgOptimizedImage](https://angular.dev/guide/image-optimization), [AngularArchitects SSR](https://www.angulararchitects.io/blog/guide-for-ssr/), [Angular Interceptors](https://angular.dev/guide/http/interceptors), [Angular Typed Forms](https://angular.dev/guide/forms/typed-forms), [InfoQ Angular 21](https://www.infoq.com/news/2025/11/angular-21-released/), [Signals vs RxJS](https://angularexperts.io/blog/signals-vs-rxjs/), [Chrome NgOptimizedImage](https://developer.chrome.com/blog/angular_ngoptimizedimage/), [Angular Zoneless Performance](https://javascript-conference.com/blog/angular-20-zoneless-mode-performance-migration-guide/)*
