# Web Testing — Expertise Module

> A web testing specialist designs, implements, and maintains automated test suites that verify web application correctness, accessibility, performance, and security across browsers and devices. The scope spans unit/component tests through end-to-end flows, visual regression, accessibility audits, and security scanning — ensuring every code change ships with confidence while keeping feedback loops fast.

---

## Core Patterns & Conventions

### Testing Trophy (Not Pyramid) for Web Applications

The traditional testing pyramid (many unit tests, fewer integration, fewest E2E) has been replaced in modern web development by Kent C. Dodds' **Testing Trophy**, which reorders priorities:

```
          E2E          (~10%)  — Playwright / Cypress
       Integration     (~50%)  — RTL + Vitest / Jest
         Unit          (~20%)  — Vitest / Jest (pure logic)
        Static         (~20%)  — TypeScript + ESLint
```

**Key principle**: "The more your tests resemble the way your software is used, the more confidence they can give you." Integration tests are king because modern UIs rely on composed components and backend services — testing them in isolation misses the real failure modes.

**Practical allocation** (Vitest 3.x+ with browser mode):
- ~70% integration tests (fast and reliable in browser mode)
- ~20% composable unit tests for pure logic
- ~10% accessibility + visual regression + E2E

### Component Testing Patterns

**React Testing Library (RTL) 16.x+ with Vitest 3.x+:**
- Query by role first (`getByRole`), then by label, then by text — never by test ID unless no accessible alternative exists
- Test user behavior, not implementation details — never assert on internal state or prop values
- Use `userEvent` (not `fireEvent`) for realistic interaction simulation
- Use `waitFor` for async state changes; avoid arbitrary `setTimeout`
- Mock child components for unit-level isolation; render full trees for integration
- Do not test single-use custom hooks in isolation — test the component that uses them

**Vue Test Utils 2.x with Vitest:**
- Mount with `mount()` for integration tests, `shallowMount()` for unit isolation
- Use `wrapper.find('[data-testid="..."]')` only as a last resort; prefer accessible selectors
- Await `nextTick()` after state mutations before asserting

### E2E Testing Patterns (Playwright 1.x)

**Locator strategy priority** (per Playwright team recommendation):
1. `getByRole()` — mirrors assistive technology perception
2. `getByLabel()` — form elements
3. `getByText()` — visible text content
4. `getByTestId()` — last resort for elements without accessible names

**Web-first assertions**: Always use `await expect(locator).toBeVisible()` instead of manual waits. Playwright auto-waits and retries until the condition is met or timeout expires.

**Test isolation**: Each test gets its own browser context with isolated storage, cookies, and session. Never share state between tests. Use `test.describe.configure({ mode: 'serial' })` only when absolutely necessary (e.g., multi-step purchase flow).

**Trace-based debugging**: In CI, enable traces on first retry (`trace: 'on-first-retry'`). The Playwright Trace Viewer provides timeline, DOM snapshots, network requests, and console logs — far superior to screenshots or video for debugging failures.

### Visual Regression Testing

**Three tiers of visual testing:**

| Tier | Tool | Best For |
|------|------|----------|
| Free / small teams | Playwright `toHaveScreenshot()` | Pixel-level diffing via pixelmatch, baselines in Git |
| Component-focused | Chromatic 3.x | Storybook-based, catches component-level regressions |
| Full-page / cross-browser | Percy (BrowserStack) | AI-powered diffing, filters rendering noise, cross-browser |

**Best practice**: Start with Playwright's built-in `toHaveScreenshot()` — it covers 80% of use cases at zero cost. When you outgrow it (cross-browser rendering, team review workflows, smart diffing), add Percy or Chromatic.

**Handling dynamic content**: Mask timestamps, avatars, and ads with CSS or `mask` option. Pin viewport sizes. Wait for fonts and images to load before capture. Percy's AI Review Agent (launched late 2025) draws bounding boxes around meaningful changes and filters ~40% of rendering noise.

### Accessibility Testing

**Automated accessibility testing catches only 30-40% of issues** — it is necessary but not sufficient.

**Integration with Playwright (axe-core 4.x):**
```typescript
import AxeBuilder from '@axe-core/playwright';

test('page meets WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/dashboard');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**Tool roles:**
- **axe-core**: Gold standard rule engine. 70+ rules, covers WCAG 2.0/2.1/2.2 at A/AA/AAA levels. Minimal false positives.
- **Lighthouse**: Quick overview during development (uses axe-core under the hood but runs fewer rules). Best for CI score gates.
- **Manual testing**: Screen reader walkthroughs (VoiceOver, NVDA), keyboard-only navigation, color contrast checks with real users.

**Legal context (2026)**: ADA Title II deadline hit April 2026. EU European Accessibility Act enforcement began June 2025. WCAG 2.1 AA compliance is now a legal requirement for most public-facing web applications.

### Cross-Browser Testing Strategies

**Playwright's advantage**: Single API covers Chromium, Firefox, and WebKit (Safari engine). No extra tooling needed.

**Strategy**:
1. Run full suite against Chromium on every PR (fast feedback)
2. Run full suite against Firefox + WebKit on nightly builds or pre-release
3. Run critical user journeys across all three browsers on every deploy
4. Use `browserName` fixture to conditionally skip browser-specific tests

### Test Data Management

**Factories vs. Fixtures:**
- **Factories**: Functions that generate data on demand — flexible, unique, self-contained. Use for test-specific records.
- **Fixtures**: Predefined data loaded before tests. Use for shared reference data (countries, roles, feature flags).

**Best practices:**
- Keep factory files in the test directory, not in application source
- Clean up between tests: truncate tables or roll back transactions in `beforeEach`
- Combine both: fixtures for reference data stability, factories for test-specific flexibility
- Never share mutable test data between tests — leaked data is the most common source of flakiness

### Page Object Model vs. Component Object Pattern

**Page Object Model (POM):**
- Encapsulates locators and actions for a full page in a class
- When a locator changes, update in one place; test scripts read like user workflows
- Best for E2E tests with Playwright/Cypress

**Component Object Pattern:**
- Models reusable UI components (e.g., `DatePicker`, `DataTable`) as objects
- Nest component objects inside page objects for complex pages
- Better fit for component-heavy SPAs built with React/Vue/Angular

**Emerging alternative — Screenplay Pattern:**
- Models tests as "actors performing tasks" rather than "pages containing elements"
- Reduces coupling between tests and UI structure
- Overkill for most teams; consider when POM maintenance becomes burdensome

### Test Naming Conventions

Use the **Arrange-Act-Assert** structure reflected in the test name:

```
// Pattern: [unit] [action/scenario] [expected result]
test('LoginForm displays error when credentials are invalid')
test('CartTotal recalculates when item quantity changes')
test('SearchResults shows empty state when no matches found')

// For Playwright E2E:
test('user can complete checkout with saved payment method')
test('admin can bulk-delete users from management page')
```

Avoid generic names like `test('it works')` or `test('should render')`. The name should tell you what broke without reading the test body.

---

## Anti-Patterns & Pitfalls

### 1. Testing Implementation Instead of Behavior
**Problem**: Tests coupled to internal state, CSS classes, or component structure break on every refactor even when user-facing behavior is unchanged. Maintenance cost skyrockets.
**Fix**: Query by role/label/text. Assert on what the user sees, not how the code works.

### 2. Over-Reliance on E2E Tests (Ice Cream Cone)
**Problem**: UI tests are 10-100x slower than unit tests, fragile against layout changes, and expensive to maintain. A suite of 500 E2E tests creates a 2-hour feedback loop.
**Fix**: Follow the Testing Trophy. Push validation down to integration and unit levels. Reserve E2E for critical user journeys only.

### 3. Using `sleep()` / `waitForTimeout()` Instead of Explicit Waits
**Problem**: Hard-coded delays are either too short (flaky) or too long (slow). They compound across hundreds of tests.
**Fix**: Use web-first assertions (`expect(locator).toBeVisible()`) and auto-waiting locators. Never use `page.waitForTimeout()` in production test code.

### 4. Shared Mutable State Between Tests
**Problem**: Test A creates data that Test B depends on. When Test A changes or runs out of order, Test B fails mysteriously. Parallelization becomes impossible.
**Fix**: Each test sets up its own data and tears it down. Use `beforeEach` for setup, never rely on test execution order.

### 5. Testing Third-Party Libraries
**Problem**: Writing tests that verify React Router navigates correctly or that axios sends HTTP requests wastes time and creates false confidence.
**Fix**: Test YOUR code's behavior, not the library's. Mock external boundaries; trust well-tested dependencies.

### 6. Snapshot Testing as a Primary Strategy
**Problem**: Large snapshots are never actually reviewed during code review. Developers reflexively run `--updateSnapshot` when they fail. They catch nothing and waste CI time.
**Fix**: Use snapshots sparingly for small, stable outputs (serialized config, error messages). For UI, use visual regression testing instead.

### 7. Ignoring Flaky Tests
**Problem**: Each flaky test erodes team trust in the suite. Engineers start ignoring failures, re-running CI "until it passes." Studies show 58% of CI failures come from flakiness, not real defects. Teams lose 6-8 hours/week to flaky test investigation.
**Fix**: Quarantine flaky tests immediately. Track flakiness rate. Fix root causes (timing, shared state, network dependencies). Never accept retries as a permanent solution.

### 8. Testing Too Late in Development
**Problem**: Defects found in a staging E2E run are 10-100x more expensive to fix than defects caught by a unit test during development.
**Fix**: Shift left. Write tests alongside feature code. Run fast tests locally before pushing. Gate PRs on test passage.

### 9. DRY Obsession in Test Code (Over-Abstraction)
**Problem**: Extracting every repeated value into shared helpers makes tests unreadable. A failing test requires navigating 5 files of helpers to understand what it does.
**Fix**: Tests should be DAMP (Descriptive And Meaningful Phrases), not DRY. Inline setup values. Repeat yourself if it makes the test self-documenting.

### 10. No Test Isolation in E2E (Reusing Browser Sessions)
**Problem**: Login once, run 50 tests in the same session. Cookie expiry, accumulated local storage, and DOM leaks cause random failures that are impossible to reproduce locally.
**Fix**: Use Playwright's `storageState` to save auth state, then load it in a fresh context per test. Each test gets a clean browser context.

### 11. Asserting on Element Counts or Exact Text
**Problem**: `expect(items).toHaveLength(5)` breaks whenever seed data changes. `expect(heading).toHaveText('Welcome, John!')` breaks for every locale.
**Fix**: Assert on presence/absence and patterns: `expect(items.first()).toBeVisible()`, `expect(heading).toContainText('Welcome')`.

### 12. No Accessibility Testing
**Problem**: Accessibility lawsuits are increasing. Automated tests can catch 30-40% of issues for near-zero effort, yet most teams skip them entirely.
**Fix**: Add `@axe-core/playwright` to your E2E suite. Run on every page navigation. Gate PRs on zero critical violations.

### 13. Mocking Too Much (or Too Little)
**Problem**: Over-mocking creates tests that pass even when the real integration is broken. Under-mocking creates tests that fail because an external API is down.
**Fix**: Mock at network boundaries (MSW for HTTP, Playwright route interception for E2E). Never mock the module under test. Never mock two layers deep.

### 14. Ignoring Test Performance
**Problem**: A 45-minute test suite means developers stop running tests. PRs queue up. Merge conflicts multiply.
**Fix**: Track suite execution time as a metric. Shard when serial time exceeds 10 minutes. Profile slow tests. Parallelize aggressively.

---

## Testing Strategy

### Unit vs. Integration vs. E2E Balance

| Level | What to Test | Tools | Speed | Confidence |
|-------|-------------|-------|-------|------------|
| Static | Type errors, lint rules | TypeScript 5.x, ESLint 9.x | Instant | Low |
| Unit | Pure functions, utils, reducers, hooks with no side effects | Vitest 3.x+ | <1ms/test | Medium |
| Integration | Component trees, form flows, data fetching, state management | RTL + Vitest (or Vitest Browser Mode) | 5-50ms/test | High |
| E2E | Critical user journeys, cross-page flows, auth, payments | Playwright 1.x | 1-10s/test | Very High |

### What to Automate vs. What to Test Manually

**Automate:**
- Regression tests for existing functionality
- Smoke tests for critical user journeys
- Accessibility rule checks (axe-core)
- Visual regression baselines
- API contract validation
- Cross-browser critical paths

**Keep manual:**
- Exploratory testing for new features
- Usability evaluation
- Screen reader walkthroughs
- Complex multi-device workflows
- Edge cases discovered during exploratory sessions (automate after discovery)

### Flaky Test Prevention and Management

**Prevention:**
1. Use web-first assertions with auto-waiting (never `sleep`)
2. Isolate test data (no shared mutable state)
3. Mock external services at the network level (MSW / route interception)
4. Pin browser versions in CI (never use `latest` Docker tag)
5. Use deterministic clocks (`page.clock`) for time-dependent tests
6. Avoid CSS-selector-based locators (use role/label/text)

**Management:**
1. Track flakiness rate per test (most CI platforms report this)
2. Quarantine tests exceeding 5% flake rate
3. Set a team SLA: flaky tests must be fixed or deleted within 1 sprint
4. Run quarantined tests in a separate non-blocking pipeline
5. Review flakiness trends weekly in engineering standup

### Test Parallelization Strategies

**Playwright parallelization has two dimensions:**

1. **Workers** (single machine): Multiple OS processes, each with its own browser instance. Default: half of CPU cores. Increase to match available cores.
2. **Sharding** (multiple machines): Split suite across CI agents with `--shard=x/y`. Each shard gets an even distribution of tests when `fullyParallel: true`.

**Rule of thumb**: Use workers until a single machine is saturated (~6-8 workers). When suite still takes >10-15 minutes, add sharding across 2-4 CI agents. A suite that takes 20 minutes with 8 workers on one machine can drop to ~5 minutes with 4 shards.

**Advanced**: Orchestration services (Currents, Sorry Cypress) replace static sharding with a dynamic task queue — CI runners pull tests in real time, optimally balancing load across machines.

### CI/CD Integration Patterns

```yaml
# GitHub Actions — Playwright sharded across 4 machines
jobs:
  test:
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-results-${{ matrix.shard }}
          path: test-results/
```

**Pipeline stages:**
1. **Lint + Type Check** (30s) — gate on zero errors
2. **Unit + Integration** (1-3min) — Vitest with coverage
3. **E2E Smoke** (2-5min) — critical journeys only, on every PR
4. **E2E Full Suite** (sharded, 5-10min) — on merge to main
5. **Visual Regression** (2-5min) — Chromatic/Percy on every PR
6. **Accessibility Audit** (1-2min) — axe-core on key pages

### Coverage Metrics and What They Actually Mean

**Types of coverage:**
- **Statement (C1)**: Which lines executed. Easy to game — a function can run without meaningful assertions.
- **Branch (C2)**: Which decision paths executed. More meaningful — exposes untested `if/else`, `switch`, and ternary branches.
- **Function**: Which functions were called. Coarsest metric.

**What coverage does NOT tell you:**
- Whether assertions are meaningful (a test with no `expect()` still generates coverage)
- Whether edge cases are handled
- Whether the UI looks correct

**Recommended targets** (Google's internal guidance):
- 60% = acceptable minimum
- 75% = commendable
- 90% = exemplary (diminishing returns beyond this)

**Practical approach**: Enforce 80% branch coverage as a PR gate. Focus coverage efforts on business logic, not UI glue code. Use coverage reports to find *untested areas*, not as a quality score.

---

## Performance Considerations

### Test Suite Execution Speed Optimization

1. **Use Vitest over Jest** for unit/integration tests — 2-10x faster due to native ESM, Vite's transform pipeline, and instant watch mode
2. **Enable `fullyParallel: true`** in Playwright config — distributes individual tests across workers, not just files
3. **Reuse authentication state** via `storageState` instead of logging in per test (saves 2-5s per test)
4. **Minimize `beforeEach` overhead** — setup only what the current test needs
5. **Use `test.describe.configure({ mode: 'parallel' })** for independent test groups within a file
6. **Profile slow tests**: Playwright's `--reporter=json` output includes duration per test; sort and optimize the top 10%

### Parallel Test Execution

| Approach | When to Use | Speedup |
|----------|-------------|---------|
| Vitest thread pool | Unit/integration tests | 3-8x vs. serial |
| Playwright workers (single machine) | E2E on dev/CI machine | 2-6x (depends on cores) |
| Playwright sharding (multi-machine) | Large E2E suites in CI | Linear with shard count |
| Orchestrated sharding (Currents) | Very large suites (500+) | Optimal load distribution |

### Test Environment Management

- **Local dev**: Use Vitest in watch mode for unit/integration. Run targeted Playwright tests with `--grep`.
- **CI**: Use Playwright Docker image (`mcr.microsoft.com/playwright:v1.49.0-noble`) — all browsers + deps pre-installed. Pin to specific version tag.
- **Preview deployments**: Run E2E against Vercel/Netlify preview URLs. Pass URL as environment variable.
- **Staging**: Run full suite + security scans before production deploy.

### Browser Resource Consumption

- Each Playwright worker spawns a browser process (~150-300MB RAM per Chromium instance)
- Limit workers to available RAM: `workers: Math.min(os.cpus().length, Math.floor(totalRAM / 400))`
- In CI with 8GB RAM, cap at 4-6 workers for Chromium
- WebKit and Firefox are generally lighter than Chromium

### CI Pipeline Optimization

1. **Cache `node_modules` and Playwright browsers** — browser downloads are 200-400MB
2. **Use the Docker image** to skip `playwright install` entirely
3. **Run unit tests and E2E in parallel jobs** (not sequentially)
4. **Upload artifacts only on failure** (`if: failure()`) to save storage
5. **Use `--retries=1`** in CI to tolerate transient infrastructure issues, but track retry rate
6. **Merge shard results** with `npx playwright merge-reports` for a unified HTML report

---

## Security Considerations

### Security Testing in Web Applications

**OWASP ZAP integration approach:**

| Scan Type | Trigger | Duration | Scope |
|-----------|---------|----------|-------|
| Baseline scan | Every PR | 2-5 min | Common vulnerabilities (XSS, headers, cookies) |
| Full active scan | Nightly / pre-release | 30-60 min | Full OWASP Top 10 probing |
| API scan | On API changes | 5-15 min | REST/GraphQL endpoint security |

**CI integration**: Use the official Docker image (`ghcr.io/zaproxy/zaproxy:stable`). Run baseline scan in PR pipeline; reserve active scan for nightly builds. Teams using ZAP baseline scans on every PR reduced penetration test findings by ~35% per quarter.

**Playwright-native security checks:**
- Verify Content-Security-Policy headers on every page load
- Test that authentication-required pages redirect when unauthenticated
- Verify CORS headers on API responses
- Test rate limiting on login/signup endpoints

### Authentication in Test Environments

- Use `storageState` files to persist authenticated sessions — never hard-code credentials in test files
- Create dedicated test user accounts with known credentials
- Rotate test credentials on a schedule (treat them like any other secret)
- For OAuth/SSO: mock the identity provider in test environments or use a test-only bypass endpoint (never in production)

### Test Data Privacy

- Never use real production data in tests — synthesize realistic data with factories (Faker.js, @faker-js/faker 9.x)
- Mask PII in test reports and CI logs
- Ensure test databases are ephemeral — create and destroy per CI run
- GDPR/CCPA apply to test data if it contains real user information

### Secrets in Test Configurations

- Store test credentials in CI secrets (GitHub Actions secrets, GitLab CI variables), never in `.env` files committed to Git
- Use `.env.test.local` (gitignored) for local development
- Audit `playwright.config.ts` and test fixtures for accidentally committed tokens
- Rotate secrets after any suspected exposure

---

## Integration Patterns

### API Mocking

**MSW (Mock Service Worker) 2.x** — industry standard for unit/integration tests:

```typescript
// handlers.ts — shared across unit, integration, and E2E
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test User',
      email: 'test@example.com',
    });
  }),
  http.post('/api/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'order-123', ...body }, { status: 201 });
  }),
];
```

**Key MSW patterns:**
- Share handlers across unit, integration, and E2E tests — single source of truth for API behavior
- Split handlers into feature-specific files for large applications (avoid a single 1000-line handlers file)
- Use `server.use()` in individual tests to override handlers for error/edge cases
- Three-step lifecycle: `server.listen()` before all, `server.resetHandlers()` between tests, `server.close()` after all

**Playwright route interception** — for E2E tests:

```typescript
await page.route('**/api/users/*', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: '1', name: 'Mocked User' }),
  })
);
```

Best for: intercepting slow/flaky external APIs in E2E without modifying application code.

### Database Seeding for Tests

- Use transaction rollback between tests (wrap each test in a transaction, roll back in `afterEach`)
- Seed reference data once before suite; create test-specific records with factories
- For Playwright E2E: expose a `/test/seed` endpoint (test environments only, guarded by env variable) or use API calls in `beforeEach`
- Never rely on database auto-increment IDs in assertions — use unique identifiers from factories

### Test Reporting

**Playwright built-in reporters:**
- `html` — default, self-contained HTML report with filter/search
- `json` — machine-readable, good for custom dashboards
- `blob` — for merging sharded results: generate blobs per shard, merge with `npx playwright merge-reports`

**Allure Report** — richest open-source option:
- Interactive dashboards, test timelines, trend analysis, categorization by severity
- Integrates with GitHub Actions (publish to GitHub Pages) and Azure DevOps
- Install: `npm i -D allure-playwright`; configure: `reporter: [['allure-playwright']]`

**Monitoring test health metrics:**
- Track: total test count, pass rate, flake rate, suite duration, coverage delta per PR
- Alert on: flake rate >5%, suite duration increase >20%, coverage drop >2%
- Dashboard: Grafana + Prometheus, Datadog CI Visibility, or Currents dashboard

---

## DevOps & Deployment

### Test Infrastructure

**Playwright in Docker:**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
```

Pin to a specific version tag — never use `latest`. The official image ships with all browsers and system dependencies.

**Selenium Grid** (legacy/cross-org):
- Use only when you need to test on real browser versions not supported by Playwright (e.g., IE11 legacy support, specific mobile browsers)
- For modern web apps, Playwright has replaced Selenium Grid for most teams

### CI Configuration Examples

**GitHub Actions (recommended for most teams):**
```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.49.0-noble
    strategy:
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright test --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: results-${{ strategy.job-index }}
          path: |
            test-results/
            playwright-report/
```

**GitLab CI:**
```yaml
e2e:
  image: mcr.microsoft.com/playwright:v1.49.0-noble
  parallel: 3
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths: [test-results/, playwright-report/]
    expire_in: 7 days
```

### Test Artifact Management

| Artifact | When to Capture | Retention |
|----------|----------------|-----------|
| Screenshots | On failure | 7-30 days |
| Videos | On failure (or first retry) | 7 days |
| Traces | On first retry | 7 days |
| HTML report | Always | 30 days |
| Coverage report | Always | 90 days |
| Allure results | Always | 30 days |

**Best practice**: Capture traces on first retry (`trace: 'on-first-retry'`) — they contain DOM snapshots, network logs, and console output. Far more useful than screenshots alone.

### Pre-Deployment Test Gates

```
PR Merge Gate:
  - Lint + Type Check      → must pass
  - Unit + Integration     → must pass, coverage >= 80%
  - E2E Smoke (5 tests)   → must pass
  - Accessibility (axe)   → zero critical violations
  - Visual Regression      → approved or no changes

Pre-Production Gate:
  - Full E2E suite         → must pass
  - Security baseline scan → zero high-severity findings
  - Performance budget     → LCP < 2.5s, CLS < 0.1
```

### Production Monitoring vs. Testing

Testing verifies behavior *before* deployment. Production monitoring catches issues *after* deployment.

**Complement tests with:**
- Synthetic monitoring (Datadog Synthetic, Checkly) — run critical E2E flows against production on a schedule
- Real User Monitoring (RUM) — track Core Web Vitals, JS errors, API failures from real users
- Error tracking (Sentry, Datadog) — capture and triage runtime exceptions

**Key difference**: A passing test suite guarantees the *tested code paths* work in *test conditions*. Production monitoring catches environment-specific failures, third-party outages, and untested edge cases.

---

## Decision Trees

### Decision Tree 1: Playwright vs. Cypress vs. WebdriverIO

```
Need to test in WebKit (Safari engine)?
├── Yes → Playwright (only framework with native WebKit support)
└── No
    ├── Need multi-tab or multi-origin testing?
    │   ├── Yes → Playwright (Cypress cannot handle multi-tab)
    │   └── No
    │       ├── Need native mobile testing (Appium)?
    │       │   ├── Yes → WebdriverIO (best Appium integration)
    │       │   └── No
    │       │       ├── Team prefers simplest DX, small-medium project?
    │       │       │   ├── Yes → Cypress (best time-travel debugger, easiest setup)
    │       │       │   └── No
    │       │       │       ├── Need maximum CI speed + parallelization?
    │       │       │       │   ├── Yes → Playwright (native sharding, ~23% faster than Cypress)
    │       │       │       │   └── No → Either Playwright or Cypress; choose by team familiarity
    │       │       └──
    │       └──
    └──
```

**2026 consensus**: Playwright is the default choice for new projects. Cypress remains excellent for teams already invested in it. WebdriverIO fills the mobile testing niche.

### Decision Tree 2: Unit vs. Integration vs. E2E

```
Is it pure logic with no UI or I/O?
├── Yes → Unit test (Vitest)
│   Examples: utility functions, reducers, validators, formatters
└── No
    ├── Does it involve a single component or small component tree?
    │   ├── Yes → Integration test (RTL + Vitest)
    │   │   Examples: form validation, component interaction, data display
    │   └── No
    │       ├── Does it cross page boundaries or involve navigation?
    │       │   ├── Yes → E2E test (Playwright)
    │       │   │   Examples: checkout flow, auth flow, multi-page wizard
    │       │   └── No
    │       │       ├── Does it involve multiple services or real network?
    │       │       │   ├── Yes → E2E test (Playwright)
    │       │       │   └── No → Integration test (RTL + Vitest with MSW)
    │       │       └──
    │       └──
    └──
```

### Decision Tree 3: Visual Regression — Screenshot-Based vs. DOM-Based

```
Using Storybook for component development?
├── Yes → Chromatic (DOM-aware, Storybook-native, component-level diffs)
└── No
    ├── Need cross-browser visual comparison?
    │   ├── Yes → Percy (renders in multiple browsers, AI-powered diff)
    │   └── No
    │       ├── Team size < 10 and budget-constrained?
    │       │   ├── Yes → Playwright toHaveScreenshot() (free, pixel-level, baselines in Git)
    │       │   └── No
    │       │       ├── High volume of visual changes needing review?
    │       │       │   ├── Yes → Percy (AI filters noise, team review workflow)
    │       │       │   └── No → Playwright toHaveScreenshot() (sufficient for most teams)
    │       │       └──
    │       └──
    └──
```

---

## Code Examples

### Example 1: Playwright E2E Test with Auth State Reuse

```typescript
// auth.setup.ts — runs once, saves state for all tests
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: '.auth/user.json' });
});

// dashboard.spec.ts — uses saved auth state
import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/user.json' });

test('user sees recent activity on dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  const activity = page.getByRole('list', { name: 'Recent activity' });
  await expect(activity.getByRole('listitem')).toHaveCount({ minimum: 1 });
  await expect(activity.getByRole('listitem').first()).toContainText(/ago$/);
});
```

### Example 2: React Testing Library Integration Test with MSW

```typescript
// OrderForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { OrderForm } from './OrderForm';

const server = setupServer(
  http.post('/api/orders', () =>
    HttpResponse.json({ id: 'order-456', status: 'confirmed' }, { status: 201 })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('OrderForm submits and displays confirmation', async () => {
  const user = userEvent.setup();
  render(<OrderForm />);

  await user.type(screen.getByLabelText('Item name'), 'Widget Pro');
  await user.type(screen.getByLabelText('Quantity'), '3');
  await user.click(screen.getByRole('button', { name: 'Place Order' }));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Order confirmed');
  });
  expect(screen.getByText('order-456')).toBeInTheDocument();
});

test('OrderForm displays error on server failure', async () => {
  server.use(
    http.post('/api/orders', () => HttpResponse.json({ error: 'Out of stock' }, { status: 422 }))
  );

  const user = userEvent.setup();
  render(<OrderForm />);

  await user.type(screen.getByLabelText('Item name'), 'Widget Pro');
  await user.click(screen.getByRole('button', { name: 'Place Order' }));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Out of stock');
  });
});
```

### Example 3: Visual Regression Test with Playwright

```typescript
// visual.spec.ts
import { test, expect } from '@playwright/test';

test('homepage matches visual baseline', async ({ page }) => {
  await page.goto('/');
  // Wait for dynamic content to stabilize
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,    // Allow 1% pixel diff (anti-aliasing tolerance)
    mask: [page.locator('.timestamp'), page.locator('.avatar')],  // Mask dynamic elements
    fullPage: true,
  });
});

test('dark mode matches visual baseline', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage-dark.png', {
    maxDiffPixelRatio: 0.01,
  });
});
```

### Example 4: Accessibility Test with axe-core + Playwright

```typescript
// accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const criticalPages = ['/', '/login', '/dashboard', '/settings', '/checkout'];

for (const path of criticalPages) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .exclude('.third-party-widget')  // Exclude elements you don't control
      .analyze();

    // Detailed failure output
    const violations = results.violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
    }));

    expect(violations, `Accessibility violations on ${path}`).toEqual([]);
  });
}
```

### Example 5: Vitest Component Test with Browser Mode

```typescript
// SearchBar.test.tsx — Vitest 3.x+ Browser Mode
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('calls onSearch with debounced input value', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} debounceMs={100} />);

    const input = screen.getByRole('searchbox', { name: 'Search' });
    await user.type(input, 'playwright');

    // Wait for debounce
    await vi.waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('playwright');
    });
    // Should not fire for every keystroke
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={vi.fn()} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test query');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(input).toHaveValue('');
  });
});
```

---

*Researched: 2026-03-07 | Sources: [Playwright Best Practices](https://playwright.dev/docs/best-practices), [BrowserStack Playwright Guide](https://www.browserstack.com/guide/playwright-best-practices), [Kent C. Dodds — Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications), [Kent C. Dodds — Write Tests](https://kentcdodds.com/blog/write-tests), [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/), [Vitest 4.0 Browser Mode (InfoQ)](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/), [Codepipes — Software Testing Anti-patterns](https://blog.codepipes.com/testing/software-testing-antipatterns.html), [TestDevLab — Anti-patterns](https://www.testdevlab.com/blog/5-test-automation-anti-patterns-and-how-to-avoid-them), [Playwright vs Cypress vs Selenium (TestDino)](https://testdino.com/blog/selenium-vs-cypress-vs-playwright/), [Percy AI Review Agent (Bug0)](https://bug0.com/knowledge-base/percy-visual-regression-testing), [Chromatic Visual Testing](https://www.chromatic.com/blog/how-to-visual-test-ui-using-playwright/), [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing), [Deque axe-core](https://www.deque.com/axe/axe-core/), [MSW Docs](https://mswjs.io/docs/), [Playwright CI Setup](https://playwright.dev/docs/ci), [Allure Playwright](https://allurereport.org/docs/playwright/), [OWASP ZAP Integration (MoldStud)](https://moldstud.com/articles/p-enhance-automated-qa-testing-for-web-applications-with-owasp-zap), [Playwright Sharding](https://playwright.dev/docs/test-sharding), [Currents — Sharding vs Workers](https://currents.dev/posts/optimizing-test-runtime-playwright-sharding-vs-workers), [Google Coverage Guidelines (Qt)](https://www.qt.io/quality-assurance/blog/is-70-80-90-or-100-code-coverage-good-enough), [ACCELQ — Flaky Tests 2026](https://www.accelq.com/blog/flaky-tests/), [web.dev — Testing Strategies](https://web.dev/articles/ta-strategies), [Gorilla Logic — POM vs Component Object](https://gorillalogic.com/test-automation-frameworks-page-object-model-vs-page-component-object-model/), [Code With Seb — Accessibility 2026](https://www.codewithseb.com/blog/web-accessibility-2026-eaa-ada-wcag-guide)*
