# Evidence-Based Verification — Expertise Module

> A verification specialist validates every quality claim with concrete, reproducible evidence before signing off. The scope spans visual proof collection via Playwright screenshots and traces, cross-device viewport testing, skeptical checklist-driven review, and integration with the 40-point QA scoring system — ensuring that no claim passes without proof and no issue escapes undetected.

---

## Core Philosophy

**Default to finding 3-5 issues minimum.** Software is written by humans (and agents acting on their behalf). Every implementation has rough edges — missed edge cases, viewport inconsistencies, accessibility gaps, performance regressions, or subtle logic errors. A verification pass that finds zero issues is not thorough; it is negligent.

Every quality claim must be backed by concrete evidence. The burden of proof lies with the claimant: if you assert that something works, you must show the output, the screenshot, or the log that proves it. Assertions without evidence are rejected, not downgraded.

**Automatic fail triggers on:**
- "Zero issues found" claims on any first-pass review
- Perfect first-pass scores (40/40 or 10/10 on any dimension)
- Claims presented without proof artifacts

This philosophy exists because the most dangerous verification failure is not finding a bug — it is certifying quality that does not exist. A false "all clear" signal sends defective work downstream where the cost of discovery and repair compounds exponentially.

---

## Evidence Hierarchy

Not all evidence carries equal weight. The following hierarchy ranks evidence types by their ability to conclusively prove a claim.

| Tier | Evidence Type | Strength | When Required | Example |
|------|-------------|----------|---------------|---------|
| **1** | Playwright screenshot / video recording | Strongest | Visual claims, layout assertions, responsive design | `evidence/dashboard-mobile-375x812.png` |
| **1** | Playwright trace archive (`.zip`) | Strongest | Interaction flows, network timing, state transitions | `test-results/checkout-flow/trace.zip` |
| **2** | Command output with timestamps | Strong | Test results, build output, lint results | `vitest run --reporter=verbose` stdout with pass/fail counts |
| **2** | Log excerpt with timestamps | Strong | Runtime behavior, error handling, async flows | Server log showing 404 handler returning correct status |
| **2** | Benchmark numbers with methodology | Strong | Performance claims, load test results | k6 output: `p95=142ms, p99=287ms` at 200 VUs for 5 min |
| **3** | Code reference with `file:line_number` | Moderate | Implementation claims, pattern compliance | `src/services/auth.ts:47` — null check before token decode |
| **3** | axe-core JSON output | Moderate | Accessibility claims | `{ violations: [], passes: 84 }` from `@axe-core/playwright` |
| **4** | Assertion without evidence | **Rejected** | Never acceptable | "Works correctly" / "All tests pass" / "Looks good" |

**Rule:** A claim backed only by Tier 4 evidence is treated as unverified. The verification report must either upgrade the evidence or mark the claim as UNVERIFIED.

---

## Auto-Fail Triggers

The following claims automatically fail verification regardless of context. Each represents a pattern that correlates strongly with rubber-stamping or confirmation bias.

### 1. "Zero issues found" on first review

No implementation is perfect on the first pass. Finding zero issues means the reviewer did not look hard enough. Minimum expectation: 3 issues of any severity (including nits, suggestions, and observations).

### 2. "All tests pass" without showing test output

The claim is meaningless without the command that was run and its stdout. Required evidence:

```bash
# Bad — assertion without proof
"All 47 tests pass."

# Good — command + output
$ npx vitest run --reporter=verbose
 ✓ src/services/auth.test.ts (12 tests) 45ms
 ✓ src/services/order.test.ts (8 tests) 23ms
 ✓ src/components/Dashboard.test.tsx (15 tests) 892ms
 ✓ src/utils/format.test.ts (12 tests) 8ms

 Test Files  4 passed (4)
      Tests  47 passed (47)
   Start at  14:32:07
   Duration  1.24s
```

### 3. "Works perfectly" without screenshots or logs

"Works" is not a testable claim. What works? Under what conditions? At what viewport? With what data? Replace with specific, evidence-backed assertions.

### 4. Perfect scores on first implementation attempt

A 10/10 on any scoring dimension for a first implementation signals that the scorer is not looking critically. First implementations always have room for improvement in error handling, edge cases, naming, or documentation.

### 5. Performance claims without benchmark numbers

```bash
# Bad — subjective claim
"The page loads fast."

# Bad — number without methodology
"Load time is 1.2 seconds."

# Good — number + methodology + environment
"LCP measured at 1.18s (p75) via Lighthouse CI on staging (us-east-1),
 Chrome 124, simulated 4G throttling, 3 runs averaged.
 Budget: < 2.5s. PASS."
```

### 6. Accessibility claims without axe-core output

```bash
# Bad — unverifiable
"The page is accessible."

# Good — tool output with scope
$ npx playwright test accessibility.spec.ts
  ✓ /dashboard has no WCAG 2.2 AA violations (axe-core 4.10.2)
    Rules checked: 94 | Passes: 87 | Incomplete: 7 | Violations: 0
    Excluded: .third-party-chat-widget (not under our control)
```

### 7. Cross-browser claims without specifying browsers tested

"Works in all browsers" is not evidence. Specify: Chromium 124, Firefox 126, WebKit 17.5 — and provide the test run output for each.

### 8. Responsive design claims without viewport evidence

A single desktop screenshot does not prove responsive behavior. Required: at minimum, screenshots at 1920x1080 (desktop), 768x1024 (tablet portrait), and 375x812 (mobile portrait).

---

## Visual Verification Protocol

### Screenshot Collection Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Evidence Collection', () => {
  test('capture full-page evidence at multiple viewports', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Full page screenshot — desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'evidence/dashboard-desktop-1920x1080.png', fullPage: true });

    // Component-specific capture — isolate the element under verification
    const header = page.locator('[data-testid="dashboard-header"]');
    await header.screenshot({ path: 'evidence/dashboard-header.png' });

    // Tablet portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'evidence/dashboard-tablet-768x1024.png', fullPage: true });

    // Mobile portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'evidence/dashboard-mobile-375x812.png', fullPage: true });
  });

  test('capture error and empty states', async ({ page }) => {
    // Empty state — no data loaded
    await page.route('**/api/dashboard/stats', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ items: [] }) })
    );
    await page.goto('/dashboard');
    await expect(page.getByText('No data available')).toBeVisible();
    await page.screenshot({ path: 'evidence/dashboard-empty-state.png' });

    // Error state — API failure
    await page.route('**/api/dashboard/stats', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
    await page.goto('/dashboard');
    await expect(page.getByRole('alert')).toBeVisible();
    await page.screenshot({ path: 'evidence/dashboard-error-state.png' });
  });
});
```

### Video Recording Pattern

```typescript
import { test, expect } from '@playwright/test';

// Enable video recording in playwright.config.ts or per-test
test.use({
  video: {
    mode: 'on',             // Record every test run for evidence
    size: { width: 1280, height: 720 },
  },
});

test('record checkout flow for verification', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add to Cart' }).first().click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();

  // Fill shipping details
  await page.getByLabel('Address').fill('123 Test Street');
  await page.getByLabel('City').fill('Testville');
  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  // Video saved automatically to test-results/ with timestamp
});
```

### Trace Capture Pattern

```typescript
import { test, expect } from '@playwright/test';

// Enable tracing for detailed debugging evidence
test.use({
  trace: 'on',  // Captures DOM snapshots, network, console at each action
});

test('trace-enabled form submission', async ({ page }) => {
  await page.goto('/settings/profile');
  await page.getByLabel('Display Name').fill('Updated Name');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Profile updated')).toBeVisible();

  // Trace archive at: test-results/trace-enabled-form-submission/trace.zip
  // Open with: npx playwright show-trace trace.zip
  // Contains: DOM snapshot per action, network waterfall, console logs, timing
});
```

**Trace viewer provides:**
- Timeline of every action with millisecond precision
- DOM snapshot before and after each interaction
- Network request/response pairs with headers and bodies
- Console log entries correlated to actions
- Screenshot film strip across the entire test

---

## Cross-Device Verification Matrix

Every visual or responsive claim must be verified against the following device matrix.

| Device | Viewport | Orientation | Priority | Notes |
|--------|----------|-------------|----------|-------|
| Desktop (1080p) | 1920x1080 | Landscape | **Required** | Most common desktop resolution globally |
| Desktop (laptop) | 1440x900 | Landscape | **Required** | Common MacBook / business laptop |
| Tablet (iPad) | 768x1024 | Portrait | **Required** | iPad Mini / standard iPad |
| Tablet (iPad) | 1024x768 | Landscape | Recommended | Tablet landscape — catches horizontal overflow |
| Mobile (iPhone) | 375x812 | Portrait | **Required** | iPhone 12/13/14 standard |
| Mobile (Android) | 360x800 | Portrait | **Required** | Samsung Galaxy S21-S24, Pixel 6-8 |
| Mobile (small) | 320x568 | Portrait | Recommended | iPhone SE — minimum viable viewport |
| Desktop (ultrawide) | 2560x1440 | Landscape | Recommended | QHD monitors — catches max-width issues |

### Automated viewport sweep

```typescript
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop-1080p', width: 1920, height: 1080 },
  { name: 'desktop-laptop', width: 1440, height: 900 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'mobile-iphone', width: 375, height: 812 },
  { name: 'mobile-android', width: 360, height: 800 },
] as const;

for (const vp of viewports) {
  test(`visual check at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `evidence/dashboard-${vp.name}.png`,
      fullPage: true,
    });

    // Verify no horizontal overflow at this viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth, `Horizontal overflow at ${vp.name}`).toBeLessThanOrEqual(vp.width);
  });
}
```

---

## Skeptical Verification Checklist

Before signing off on any verification, work through this checklist. Mark each item PASS, FAIL, or N/A with evidence reference.

### Functional Verification (6 items)

1. **Did I reproduce the claimed behavior myself?** — Never trust a description; run the code.
2. **Did I test with invalid input?** — Empty strings, null, undefined, negative numbers, SQL injection strings, XSS payloads.
3. **Did I test with boundary values?** — Maximum-length strings, zero, MAX_INT, empty arrays, single-item arrays.
4. **Did I test error states?** — Network failure, API 500, timeout, malformed response, missing permissions.
5. **Did I test the undo/cancel/back path?** — Form cancel discards changes, browser back preserves state correctly.
6. **Did I verify data persistence?** — Refresh the page after save. Does the data survive? Is it correctly stored in the database?

### Visual Verification (5 items)

7. **Is there screenshot evidence for every visual claim?** — No visual claim accepted without a screenshot at the relevant viewport.
8. **Did I verify across at least 3 viewport sizes?** — Desktop (1920x1080), tablet portrait (768x1024), mobile portrait (375x812) at minimum.
9. **Did I check empty states and loading states?** — What does the component look like with zero data? During a slow API call?
10. **Did I check dark mode (if applicable)?** — Theme switching must not break layout or make text unreadable.
11. **Did I check with long content?** — Names with 50+ characters, descriptions with 500+ words, deeply nested data.

### Performance Verification (3 items)

12. **Are performance claims backed by benchmark numbers?** — Tool name, methodology, sample size, environment, and specific metric values.
13. **Did I check for N+1 queries?** — Inspect network tab or database logs during list page loads.
14. **Did I verify bundle size impact?** — Run `npx vite-bundle-visualizer` or equivalent before and after the change.

### Accessibility Verification (3 items)

15. **Did I run axe-core and include the output?** — `@axe-core/playwright` with WCAG 2.2 AA tags.
16. **Can I navigate the feature using only the keyboard?** — Tab order is logical, focus indicators are visible, no keyboard traps.
17. **Do all images have meaningful alt text and all form inputs have labels?** — Inspect the DOM, not just the visual output.

### Edge Case Verification (3 items)

18. **Did I test with JavaScript disabled (if applicable)?** — Server-rendered content should remain accessible.
19. **Did I test concurrent operations?** — Two tabs submitting the same form, rapid double-clicks, race conditions.
20. **Did I test the feature after a fresh install / empty database?** — First-run experience often has different code paths.

---

## Integration with QA Scoring

The 40-point QA scoring system spans four dimensions: Completeness, Correctness, Implementation Quality, and UX/Polish (10 points each). Evidence quality directly impacts scoring as follows.

### Evidence Impact on Correctness (0-10)

| Evidence Level | Maximum Correctness Score | Rationale |
|---------------|--------------------------|-----------|
| Tier 1 evidence for all claims | 10/10 | Full proof chain — every claim verified with screenshots, traces, or recordings |
| Tier 2 evidence for all claims | 8/10 | Strong proof — command output and logs demonstrate behavior |
| Mix of Tier 2 and Tier 3 | 6/10 | Moderate proof — code references supplement but do not replace runtime evidence |
| Any claim with only Tier 4 evidence | **Capped at 6/10** | Unverified claims cap the dimension regardless of other evidence |
| Multiple claims with only Tier 4 | **Capped at 4/10** | Systematic lack of evidence indicates insufficient verification |

### Evidence Requirements by Score Target

| Target Score | Minimum Evidence Requirements |
|-------------|------------------------------|
| 9-10/10 | Tier 1 evidence for visual components + Tier 2 for all behavioral claims + axe-core output for accessibility |
| 7-8/10 | Tier 2 evidence for all major claims + at least 2 viewport screenshots for visual work |
| 5-6/10 | Tier 2 or Tier 3 evidence for core functionality claims |
| Below 5/10 | Insufficient evidence or failed verification checks |

### Mandatory Evidence for Score Thresholds

- **Scores above 8/10 on any dimension:** Screenshot evidence for every visual component is mandatory. No exceptions.
- **Scores above 7/10 on Correctness:** Test output showing pass counts and coverage percentage is required.
- **Scores above 6/10 on Completeness:** Evidence that every acceptance criterion was individually tested (not batch-claimed).
- **Perfect 10/10 on any dimension:** Requires Tier 1 evidence AND a documented edge case that was found and addressed during verification.

---

## Verification Report Template

Use this template for every verification report. Every section must contain content or an explicit `N/A — [reason]`.

```markdown
# Verification Report — Task [N]: [Title]

## Summary
- **Verdict:** PASS / FAIL / PARTIAL
- **Issues found:** [count] ([critical], [major], [minor], [nit])
- **Evidence artifacts:** [count] screenshots, [count] trace archives, [count] command outputs
- **Verification date:** YYYY-MM-DD HH:MM UTC
- **Environment:** [OS, browser versions, Node version, deployment target]

## Evidence Collected

| # | Claim | Evidence Type (Tier) | Artifact | Verdict |
|---|-------|---------------------|----------|---------|
| 1 | Dashboard renders correctly on mobile | Tier 1 — Screenshot | `evidence/dashboard-mobile-375x812.png` | PASS |
| 2 | Form validates email format | Tier 2 — Test output | `vitest run` stdout, 12/12 pass | PASS |
| 3 | Page meets WCAG 2.2 AA | Tier 2 — axe-core output | 0 violations, 87 passes | PASS |
| 4 | API responds under 200ms | Tier 2 — k6 output | p95=142ms at 200 VUs | PASS |
| 5 | Error state displays correctly | Tier 1 — Screenshot | `evidence/dashboard-error-state.png` | FAIL — see Issue #2 |

## Issues Found

| # | Severity | Description | Evidence | Recommendation |
|---|----------|-------------|----------|----------------|
| 1 | Major | Form submit button is not keyboard-accessible | Tab order skips from email field to footer | Add `tabindex="0"` or use `<button>` instead of `<div>` |
| 2 | Major | Error state shows raw JSON instead of user-friendly message | `evidence/dashboard-error-state.png` | Catch API errors in `useDashboardData` hook, display localized message |
| 3 | Minor | Text truncation on mobile at 375px width clips last character of username | `evidence/dashboard-mobile-375x812.png` | Add `text-overflow: ellipsis` to `.username` class |
| 4 | Nit | Console warning: "Each child in a list should have a unique key prop" | Browser console during test run | Add `key={item.id}` to `StatsCard` map in `Dashboard.tsx:42` |
| 5 | Nit | Loading skeleton height does not match rendered content height, causing 4px layout shift | Trace timeline shows CLS event | Set skeleton `min-height` to match `StatsCard` rendered height |

## Viewport Testing

| Viewport | Screenshot | Layout | Overflow | Notes |
|----------|-----------|--------|----------|-------|
| 1920x1080 Desktop | `evidence/dashboard-desktop-1920x1080.png` | PASS | None | Grid displays 4 columns as designed |
| 1440x900 Laptop | `evidence/dashboard-laptop-1440x900.png` | PASS | None | Grid displays 3 columns |
| 768x1024 Tablet | `evidence/dashboard-tablet-768x1024.png` | PASS | None | Grid displays 2 columns |
| 375x812 Mobile | `evidence/dashboard-mobile-375x812.png` | PARTIAL | None | Single column — username truncation (Issue #3) |
| 360x800 Android | `evidence/dashboard-android-360x800.png` | PASS | None | Single column — renders correctly |

## Accessibility

- **Tool:** @axe-core/playwright 4.10.2 with WCAG 2.2 AA tags
- **Violations:** 0 automated violations detected
- **Keyboard navigation:** FAIL — submit button not in tab order (Issue #1)
- **Screen reader:** Not tested (manual test required)
- **Color contrast:** PASS — all text meets 4.5:1 minimum ratio

## Performance

- **Lighthouse score:** 94 (Performance), 91 (Accessibility), 100 (Best Practices), 100 (SEO)
- **LCP:** 1.18s (budget: < 2.5s) — PASS
- **INP:** 89ms (budget: < 200ms) — PASS
- **CLS:** 0.04 (budget: < 0.1) — PASS (but see Issue #5 re: skeleton height)
- **Bundle size delta:** +2.3 KB gzipped (within 50 KB budget)

## Recommendations

1. **Must fix before merge:** Issues #1 and #2 (keyboard accessibility, error state display)
2. **Should fix before release:** Issue #3 (text truncation on mobile)
3. **Nice to have:** Issues #4 and #5 (console warning, skeleton height)

## Checklist Summary

| # | Check | Status | Evidence Ref |
|---|-------|--------|-------------|
| 1 | Reproduced claimed behavior | PASS | Test output + screenshots |
| 2 | Tested with invalid input | PASS | Test output — 5 validation tests |
| 3 | Tested boundary values | PASS | Test output — max length, empty, zero |
| 4 | Tested error states | FAIL | Issue #2 |
| 5 | Verified data persistence | PASS | Page refresh after save — data persists |
| 6 | Screenshots at 3+ viewports | PASS | 5 viewport screenshots collected |
| 7 | axe-core audit | PASS | 0 violations |
| 8 | Keyboard navigation | FAIL | Issue #1 |
```

---

## Anti-Patterns

### 1. Rubber Stamping

**What it looks like:** Approving without actually running the code, executing the tests, or inspecting the output. The verification report is written from reading the PR description, not from hands-on testing.

**Why it is dangerous:** Every rubber-stamped approval is a defect that was knowingly allowed through the gate. It erodes the entire verification system — downstream roles trust the "PASS" verdict and skip their own checks.

**How to detect:** Verification reports with no evidence artifacts, timestamps that precede the implementation commit, or generic language copied from the task spec.

### 2. Confirmation Bias (Happy Path Only)

**What it looks like:** Testing only the exact scenario described in the task spec. The form works when you fill in valid data. The API returns 200 when given correct parameters. The dashboard renders with the seed data.

**Why it is dangerous:** Production users do not follow the happy path. They submit empty forms, click buttons twice, navigate backward, use screen readers, and have slow connections. Happy-path-only testing misses the failures that matter most.

**How to detect:** Evidence that only shows successful states. No screenshots of error states, empty states, or loading states. No tests with invalid input.

### 3. Scope-Limited Testing

**What it looks like:** Testing only the files that were explicitly changed in the PR. The new API endpoint works, but the existing list page that consumes it was never checked for regressions.

**Why it is dangerous:** Changes propagate. A modified database schema affects every query that touches those tables. A changed API response shape breaks every consumer. A CSS change in a shared component affects every page that uses it.

**How to detect:** Evidence limited to the exact components listed in the task spec. No regression testing of adjacent features or consuming components.

### 4. Screenshot Theater

**What it looks like:** Screenshots that do not actually prove the claim they accompany. A screenshot of the login page captioned "authentication works correctly." A mobile screenshot taken at 1024px wide (not actually mobile). Screenshots with data pre-filled by the developer rather than entered through the UI.

**Why it is dangerous:** It creates the appearance of evidence without the substance. Reviewers see screenshots and assume verification happened, when the screenshots prove nothing about the claimed behavior.

**How to detect:** Screenshots that do not match the viewport sizes in the Cross-Device Matrix. Screenshots that show initial state but not the result of the interaction. Screenshots without filenames that encode viewport dimensions.

### 5. "Works on My Machine" (Single Environment Testing)

**What it looks like:** All verification performed in a single browser on a single OS at a single viewport. "I tested in Chrome on my MacBook and it works."

**Why it is dangerous:** Cross-browser rendering differences, OS-specific font rendering, touch vs. mouse interactions, and screen density differences all produce bugs invisible in a single environment. Safari's WebKit engine handles flexbox, date inputs, and scroll behavior differently from Chromium.

**How to detect:** Evidence artifacts from only one browser engine. No mention of Firefox or WebKit in the verification report. All screenshots at the same viewport size.

### 6. Timestamp-Free Claims (Unanchored Evidence)

**What it looks like:** Evidence presented without dates, version numbers, or commit references. "Tests pass" — but which commit? "Screenshot attached" — but from which deployment? "Performance is good" — but measured when, against what baseline?

**Why it is dangerous:** Unanchored evidence cannot be reproduced or audited. It may refer to a prior version, a different branch, or a different environment. Without timestamps and version anchors, evidence decays from "proof" to "anecdote."

**How to detect:** Evidence artifacts without date/time metadata. Test output without Git commit SHA. Performance numbers without environment specification. Screenshots without viewport dimensions in the filename.

### 7. Deferred Verification

**What it looks like:** "I'll verify the accessibility / performance / mobile layout in a follow-up." The verification report marks items as PASS with a note that deeper testing will happen later.

**Why it is dangerous:** Follow-up verification rarely happens. Once a task is marked PASS, it moves downstream and attention shifts to the next task. Deferred verification is functionally equivalent to skipped verification.

**How to detect:** Verification reports with "TODO" items, "will verify later" notes, or N/A markers on dimensions that clearly apply to the task.

### 8. Copy-Paste Verification Reports

**What it looks like:** Verification reports that reuse the same language, the same evidence structure, and the same issue count across unrelated tasks. The report reads like a template that was filled in mechanically rather than a genuine investigation.

**Why it is dangerous:** Each task has unique risks, unique edge cases, and unique failure modes. A formulaic report indicates the verifier is going through the motions rather than thinking critically about what could go wrong with this specific implementation.

**How to detect:** Multiple verification reports with identical phrasing in the Issues Found section. Evidence artifacts with sequential filenames that suggest batch generation rather than targeted investigation.

---

*Researched: 2026-03-12 | Sources: [Playwright Best Practices](https://playwright.dev/docs/best-practices), [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer), [Playwright Screenshots](https://playwright.dev/docs/screenshots), [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md), [Google Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/), [StatCounter Global Stats — Screen Resolution](https://gs.statcounter.com/screen-resolution-stats), [k6 Documentation](https://grafana.com/docs/k6/latest/), [Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)*
