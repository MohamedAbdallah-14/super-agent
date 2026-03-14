# Feedback and States Patterns

> **Module Type:** Pattern
> **Domain:** UI/UX Design -- System Feedback & State Communication
> **Authoritative Sources:** Material Design 3, Apple HIG, Nielsen Norman Group, WCAG 2.2, Carbon Design System

---

## Quick Reference Checklist

1. Every user action produces visible feedback within 100ms
2. Loading states appear after 300ms delay (avoid flash for fast loads)
3. Skeleton screens used for content-heavy pages loading under 10s
4. Progress bars used for operations exceeding 10s
5. Spinners reserved for 2-10s indeterminate waits only
6. Every empty state has a clear headline, explanation, and CTA
7. Toast/snackbar duration is 3-5s for text under 20 words
8. Toasts with actions use indefinite or extended duration
9. Error messages include what went wrong AND how to fix it
10. Inline validation triggers on blur (not on focus or first keystroke)
11. Only one snackbar displayed at a time; queue subsequent ones
12. ARIA live regions present before dynamic content injection
13. role="alert" for urgent errors; role="status" for non-urgent feedback
14. Focus moves to first error field on form submission failure
15. Optimistic updates include rollback logic for server failures
16. Offline state shows cached data age and available actions
17. Animations respect prefers-reduced-motion media query
18. Banner notifications persist until user dismisses or issue resolves
19. No feedback mechanism blocks the user unless truly critical
20. Every loading state has a timeout fallback with retry action

---

## 1. Pattern Anatomy

Feedback and states patterns are how an interface communicates system status, action
outcomes, and available next steps. They are the conversational layer of a UI -- "I
heard you," "I'm working on it," "here's what happened," "here's what you can do next."

### 1.1 Loading States

#### Skeleton Screens

Low-fidelity wireframe placeholders (gray rectangles for text, circles for avatars)
shown before content loads. Best for predictable layouts loading under 10 seconds.

**Specifications:**
- Placeholder color: #E0E0E0 (light), #2A2A2A (dark)
- Shimmer: left-to-right gradient sweep, 1.5-2s cycle, linear easing
- Use CSS `transform` (not `background-position`) for GPU-accelerated shimmer
- Match skeleton shapes to actual content dimensions to prevent layout shift (CLS)
- Skip skeleton if content loads under 300ms
- NNG: Skeleton screens reduce perceived load time by letting users build a mental
  model of the page structure before content arrives

#### Spinners (Activity Indicators)

Rotating circular animation for indeterminate progress. Use for 2-10s waits where
content structure is unpredictable or the loading area is too small for a skeleton.

- Size: 16-24px inline, 32-48px standalone
- Rotation: 0.8-1.2s per cycle, linear easing
- Always pair with descriptive text for accessibility ("Loading payments...")
- M3 Expressive: new looping shape-morph indicator (7 shapes) for waits under 5s

#### Progress Bars (Determinate)

Horizontal fill bar showing percentage completion. Use for operations over 10 seconds
where progress is measurable (uploads, exports, installations).

- Height: 4-8px; M3 Expressive supports thicker wavy variants with rounded ends
- Include percentage text for operations over 30 seconds
- Never let the bar appear stuck; use eased interpolation between updates
- NNG: Waits with visible feedback feel 11-15% faster than identical waits without

#### Shimmer / Pulse Effects

- **Shimmer:** Diagonal/horizontal light gradient sweep, 1.5-2.5s, linear, infinite
- **Pulse:** Opacity oscillation (0.4 to 1.0), 1.5-2s, ease-in-out
- Performance: use `transform: translateX()` with `will-change: transform`

### 1.2 Empty States

| Type | Components | Key Principle |
|------|-----------|---------------|
| **First-use** | Illustration + headline + value description + primary CTA | Invoke action; this is an onboarding moment |
| **No-results** | Echo query + suggestions + related content fallback | Never leave truly empty; present alternatives |
| **Error** | Error icon + plain-language explanation + recovery CTA | Include what happened and how to fix it |
| **Cleared** | Celebratory illustration + positive message | "All caught up!" -- optionally offer next action |

### 1.3 Success / Error / Warning / Info Feedback

| Level   | Color  | Icon             | Urgency | Typical Use                    |
|---------|--------|------------------|---------|--------------------------------|
| Success | Green  | Checkmark circle | Low     | Action completed successfully  |
| Error   | Red    | X circle / alert | High    | Action failed, needs attention |
| Warning | Yellow | Triangle alert   | Medium  | Potential issue, proceed carefully |
| Info    | Blue   | Info circle      | Low     | Neutral system information     |

Apple HIG: "Feedback helps people know what's happening, discover what they can do
next, understand the results of actions, and avoid mistakes."

### 1.4 Toast / Snackbar

Lightweight, temporary notifications at the edge of the screen that auto-dismiss.

**M3 Snackbar specs:** Bottom-positioned. SHORT (2s), LONG (3.5s), INDEFINITE. Max one
visible; queue subsequent. May contain one text action (never "Cancel"/"Dismiss").

**Duration guidelines:**
- Under 20 words: 3s | 20-35 words: 5s | Over 35 words: do not auto-dismiss
- Toasts with actions: 8-10s or indefinite
- Formula: 1 character per 100ms + 1000ms buffer
- Entry: slide up + fade in, 200-300ms, decelerate easing
- Exit: slide down + fade out, 150-200ms, accelerate easing

### 1.5 Inline Messages

Contextual feedback adjacent to the trigger element. Positioned below or beside the
relevant field -- never above it and never far from the trigger.

**Inline validation timing (Smashing Magazine / Baymard):**
- Validate on blur (when user leaves field), not on focus or first keystroke
- For complex inputs (passwords): validate on each keystroke after first blur
- Remove error message the instant input becomes valid
- Never validate empty fields until form submission

### 1.6 Banners

Persistent, full-width bars at the top of the page for system-wide announcements,
persistent warnings, or non-blocking important messages.

- Full width, 40-56px height, semantic background color
- Include dismiss action unless the condition must be resolved
- Stay visible across navigation until dismissed or resolved
- Do not stack more than 2 banners; prioritize by severity

---

## 2. Best-in-Class Examples

### 2.1 Stripe

**Loading:** Delays UI display at launch, preferring to show a complete screen. Falls
back to UI frame with localized spinners if network is slow. Dashboard uses pulse-
animated skeleton screens for section-level loading.

**Empty states:** Minimal and action-oriented -- line illustration, one-sentence
explanation, primary CTA button. Stripe Apps design system provides explicit loading
components.

**Errors:** Inline form errors are precise and actionable ("Your card was declined.
Try a different payment method."). API errors map to human-readable dashboard messages.

### 2.2 Linear

**Optimistic updates:** Gold standard. Issue status, assignments, priorities, and labels
update instantly before server confirmation. On server rejection, the UI quietly reverts
with a subtle error toast. Keyboard shortcuts produce immediate visual feedback -- brief
highlight flash on affected items.

**Loading:** Skeleton screens precisely match list/board layout. View transitions use
smooth crossfades rather than full-page loading states.

### 2.3 Slack

**Empty states:** First-use experience uses conversational empty states ("This is the
very beginning of the #general channel"). Search no-results echoes the query and
suggests alternatives.

**Connectivity:** Reconnection after network loss shows inline banner ("Connecting...")
transitioning to success ("You're back online"). Message send is optimistic -- clock
icon while sending, checkmark on delivery, red warning with "Retry" on failure.

### 2.4 Notion

**Loading:** Page-level: minimal centered spinner. Block-level: inline skeleton
placeholders matching expected dimensions. Syncing shows "Saving..." in the top bar,
transitioning to "Saved" with subtle fade-out. Offline: "Offline" with cloud-slash
icon; queues changes for sync.

**Empty states:** Blank pages show faint prompt ("Press '/' for commands"). Database
views with no entries show "No results" with inline "+ New" button.

### 2.5 Figma

**Loading:** Progressive canvas rendering -- UI chrome first, then layers incrementally
(text/shapes before images). Determinate progress bar for large files.

**Multiplayer feedback:** Real-time cursors, selection highlights, presence avatars.
Network disconnection triggers persistent yellow banner ("Having trouble connecting.
Changes will be saved locally."). Reconnection auto-syncs with conflict resolution.

### 2.6 GitHub

**Loading:** Skeleton screens for repo file listings, PR pages, and activity feeds.
Check suite results load incrementally -- summary first, details on expansion.

**Empty states:** Repo empty states include step-by-step setup with copy-paste CLI
commands. Issue/PR empty states suggest broadening search criteria.

### 2.7 Shopify (Polaris)

**Loading:** Documented loading patterns -- skeleton pages for initial load, skeleton
body for section refreshes, inline spinners for actions with explicit usage criteria.

**Toast system:** Bottom center, 5s auto-dismiss, single action link, fixed queue.
Error separation: page-level banners (API failures), section-level inline messages
(data conflicts), field-level validation (form errors).

### 2.8 Vercel

**Deployment feedback:** Multi-phase progress with named stages (Building, Deploying,
Assigning domains). Each stage spinner converts to checkmark on completion. Build
failures highlight the specific failed step with log excerpt and "Redeploy" action.

---

## 3. User Flow Mapping

### 3.1 Happy Path

```
[Idle] -> User Action -> [Optimistic Update / Loading State]
                                  |
                        Server responds (success)
                                  |
                        [Success Feedback] -> [Updated Idle]
```

1. **Idle:** UI is interactive, data is current
2. **User triggers action** (click, submit, drag, shortcut)
3. **Immediate feedback (0-100ms):** Button enters loading state
4. **Optimistic update:** UI reflects expected result immediately
5. **Loading (100ms-10s):** Appropriate indicator based on duration
6. **Success (200-500ms):** Checkmark animation, toast, or inline update
7. **Return to idle:** UI settles with updated data

### 3.2 Error Recovery Flows

**Error severity tiers and responses:**
1. **Field-level:** Red border + inline message, focus moves to field
2. **Form-level:** Error summary banner at top + individual field markers
3. **Section-level:** Inline error panel with retry button
4. **Page-level:** Full error state with illustration and recovery CTA
5. **App-level:** Persistent banner or modal for critical failures

**Principles:** Always explain what went wrong in plain language. Always provide a
recovery action. Preserve user input so they can correct it. For persistent failures,
offer alternative actions or support contact.

### 3.3 Timeout Handling

| Duration  | Action |
|-----------|--------|
| 0-300ms   | No indicator (perceived instant) |
| 300ms-2s  | Spinner or subtle indicator |
| 2s-10s    | Skeleton screen or spinner with label |
| 10s-30s   | Progress bar with cancel option |
| 30s-60s   | Progress + "taking longer than expected" |
| 60s+      | Warning with cancel, retry, or continue options |

**Never leave a spinner running indefinitely.** Start a timer on request. At 15s show
"Taking longer than expected." At 30-60s, stop animation and show error with retry.

### 3.4 Offline States

1. **Banner:** Show persistent "You're offline" when connectivity is lost
2. **Available actions:** Indicate what works offline vs. requires connectivity
3. **Queued actions:** "Saved locally, will sync when online" confirmations
4. **Stale data:** Show when content was last refreshed ("Last updated 2 hours ago")
5. **Reconnection:** Brief "Back online" success banner, auto-sync queued changes

Google (web.dev): "When a network failure occurs, tell the user both the application's
state and the actions they can still take."

### 3.5 Partial Data Loading

- Load application shell (nav, layout chrome) immediately
- Load critical content first, secondary content asynchronously
- If secondary content fails, show section-level error with retry
- Never blank the entire page because one API call failed
- Provide section-level refresh, not just page-level

### 3.6 Optimistic Updates

**When to use:** High success rate actions (>99%), non-destructive operations, real-
time collaborative environments. Examples: likes, toggles, status changes, messages.

**When NOT to use:** Destructive actions (delete, payment), complex server validation,
operations where server generates critical data the UI needs immediately.

**Pattern:** Update local UI immediately -> send request to server -> on success do
nothing (UI is correct) -> on failure revert UI + show error toast with retry option.

---

## 4. Micro-Interactions

### 4.1 Timing Reference

| Animation Type              | Duration  | Easing        | Notes                       |
|-----------------------------|-----------|---------------|-----------------------------|
| Immediate feedback (hover)  | 50-100ms  | Ease          | Button color, cursor swap   |
| Micro-interaction           | 150-300ms | Ease-out      | Toggle, checkbox, like      |
| Standard transition         | 200-400ms | Ease-in-out   | Panel slide, dropdown       |
| Success checkmark draw      | 350-500ms | Ease-out      | Circle + stroke sequence    |
| Error shake                 | 300-400ms | Ease-in-out   | 3-4 horizontal oscillations |
| Toast entry/exit            | 200-300ms | Decelerate    | Slide + fade                |
| Skeleton shimmer cycle      | 1500-2500ms | Linear      | Full sweep pass             |
| Spinner rotation            | 800-1200ms | Linear       | Per full cycle              |

### 4.2 Skeleton Shimmer (CSS)

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.skeleton {
  position: relative;
  overflow: hidden;
  background-color: #e0e0e0;
  border-radius: 4px;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 1.8s linear infinite;
  will-change: transform;
}
@media (prefers-color-scheme: dark) {
  .skeleton { background-color: #2a2a2a; }
  .skeleton::after {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}
```

### 4.3 Success Checkmark Animation

1. Circle draws clockwise from top (0-200ms, ease-out)
2. Brief pause (50ms)
3. Checkmark stroke draws bottom-left to top-right (150-250ms, ease-out)
4. Optional: subtle scale bounce (1.0 -> 1.1 -> 1.0) over 100ms
5. Total: 350-500ms. Hold completed state 500ms before transitioning.

### 4.4 Error Shake Animation

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.field-error {
  animation: shake 0.35s ease-in-out;
  border-color: var(--color-error);
}
```

3-4 rapid horizontal translations, 6-10px displacement per direction, 300-400ms total.
Accompanied by red border and error message fade-in below field.

---

## 5. Anti-Patterns

### 5.1 Blank Loading Screens
Showing empty/white screen while loading. Users cannot distinguish "loading" from
"broken." **Fix:** Always show skeleton, spinner with text, or application shell.

### 5.2 Spinner Without Timeout
Indefinitely spinning indicator with no fallback or escape. **Fix:** At 15s show
"Taking longer than expected." At 30s show error with retry and cancel.

### 5.3 Error Messages Without Recovery Action
"Something went wrong." with no explanation or next step. **Fix:** Every error includes
what happened, why (if knowable), and at least one actionable step.

### 5.4 Success Messages That Block
Modal success dialogs requiring "OK" for routine confirmations. **Fix:** Use auto-
dismissing toasts. Reserve modals for critical consequences.

### 5.5 Alert Fatigue
Over-using notifications for low-importance info. Users desensitize and miss critical
alerts. Research: alert overload causes 40% productivity loss from task switching.
**Fix:** Severity tiers, passive indicators for low-priority, user-configurable prefs.

### 5.6 No Empty State Design
Blank areas or raw "null"/"No data" when content is absent. **Fix:** Design intentional
empty states with visual treatment, explanation, and CTA for every content area.

### 5.7 Premature Inline Validation
Errors while user is still typing ("Invalid email" after typing "j"). **Fix:** Validate
on blur. For real-time fields, start after first blur. Remove errors instantly on valid.

### 5.8 Inconsistent Feedback Positioning
Toasts appearing sometimes top-right, sometimes bottom. Users don't know where to look.
**Fix:** Single consistent position per feedback type, documented in design system.

### 5.9 Loading States That Lose Context
Full-page loading when only one section updates. User loses scroll position, selection,
and mental context. **Fix:** Scope loading to smallest relevant area. Preserve state.

### 5.10 Optimistic Updates Without Rollback
UI updates instantly but never reverts on server failure, leaving incorrect state.
**Fix:** Always implement rollback. Show error toast explaining what happened.

### 5.11 Stacking Multiple Notifications
Multiple toasts piled on screen, covering content. **Fix:** Queue and display one at a
time. Consolidate simultaneous messages ("3 items saved" vs. three toasts).

### 5.12 Using Modals for Non-Critical Feedback
Modal dialogs for routine confirmations ("Item added to cart!" + OK). **Fix:** Toasts
for non-critical, inline for validation, modals only for destructive confirmations.

### 5.13 Ignoring Motion Sensitivity
Aggressive animations with no opt-out. Users with vestibular disorders experience
discomfort. **Fix:** Respect `prefers-reduced-motion`. Replace with instant changes or
gentle fades. Never rely on animation as sole feedback mechanism.

### 5.14 Silent Failures
Server failure with no UI indication. User believes action succeeded. **Fix:** Every
server interaction has explicit success and failure handlers with user-visible feedback.

---

## 6. Accessibility

### 6.1 ARIA Live Regions

Live region containers must exist in the DOM before content is injected. Adding
`aria-live` simultaneously with content will not trigger announcements.

- `aria-live="polite"`: Announce when user is idle (non-urgent updates)
- `aria-live="assertive"`: Announce immediately, interrupting speech (urgent alerts)
- `aria-atomic="true"`: Announce entire region on any change

```html
<!-- Container exists on page load, empty -->
<div aria-live="polite" id="status-region"></div>
<!-- JS injects later: screen reader announces the text -->
```

### 6.2 Role Assignments

| Feedback Type      | ARIA Role          | Live Behavior | Use Case                     |
|--------------------|--------------------|---------------|------------------------------|
| Error alerts       | `role="alert"`     | Assertive     | Form errors, system failures |
| Success messages   | `role="status"`    | Polite        | Save confirmations           |
| Loading indicators | `role="status"`    | Polite        | "Loading...", progress       |
| Toast notifications| `role="status"`    | Polite        | Non-critical confirmations   |
| Critical alerts    | `role="alertdialog"` | Assertive   | Requires acknowledgment      |
| Progress updates   | `role="progressbar"` | N/A         | Use aria-valuenow/min/max    |

`role="alert"` = `aria-live="assertive"` + `aria-atomic="true"`.
`role="status"` = `aria-live="polite"` + `aria-atomic="true"`.
Never use `role="alert"` for routine success -- it interrupts the user.

### 6.3 Focus Management After State Changes

| State Change             | Focus Action                                        |
|--------------------------|-----------------------------------------------------|
| Modal opens              | Move to first focusable element inside modal        |
| Modal closes             | Return to element that triggered the modal          |
| Inline error on submit   | Move to first field with an error                   |
| Toast appears            | Do NOT move focus (announced via live region)        |
| Content finishes loading | Move to loaded content (if user-initiated)          |
| Section removed          | Move to next logical element                        |

WCAG 2.2 SC 2.4.11: Focused element must not be fully hidden behind sticky headers or
overlays. Do not move focus to loading indicators -- use live regions to announce
"Loading..." and move focus to result only after completion.

### 6.4 Screen Reader Patterns

```html
<!-- Form validation errors -->
<input id="email" aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Please enter a valid email address.</span>

<!-- Progress bar -->
<div role="progressbar" aria-valuenow="65" aria-valuemin="0"
     aria-valuemax="100" aria-label="Uploading: 65% complete"></div>
```

### 6.5 Additional Requirements

- Never use color alone to convey status; pair with icons and text
- Error text: 4.5:1 contrast minimum (WCAG SC 1.4.3)
- Auto-dismissing toasts must be pausable on hover/focus (WCAG SC 2.2.1)
- Minimum 5s display for screen reader announcement before auto-dismiss
- Use `aria-invalid="true"` on error fields alongside visual treatment

---

## 7. Cross-Platform Adaptation

### 7.1 iOS (Apple HIG)

| Component | Platform API | Notes |
|-----------|-------------|-------|
| Spinner | `UIActivityIndicatorView` | `.medium` (20pt), `.large` (36pt) |
| Progress | `ProgressView` | Determinate (bar) and indeterminate |
| Pull-to-refresh | `UIRefreshControl` | System-standard in scroll views |
| Alert | `UIAlertController` | `.alert` (centered), `.actionSheet` (bottom) |
| Haptics | `UIImpactFeedbackGenerator` | .success, .error, .warning feedback types |
| Banner | Custom implementation | No system component; position below nav bar |

Apple: "Use alerts sparingly. Match the importance of information to the interruption
level." Prefer determinate progress so users can estimate remaining wait time.

### 7.2 Android (Material Design)

| Component | Platform API | Notes |
|-----------|-------------|-------|
| Circular progress | `CircularProgressIndicator` | Determinate + indeterminate, M3 themed |
| Linear progress | `LinearProgressIndicator` | M3 Expressive: wavy, rounded, gap support |
| New loader | `LoadingIndicator` (M3E) | Shape-morph for <5s waits |
| Pull-to-refresh | `SwipeRefreshLayout` | Circular progress animation |
| Snackbar | `Snackbar` | SHORT 2s, LONG 3.5s, INDEFINITE; one action |
| Toast | `Toast` | Text-only, no action, prefer Snackbar |
| Alert | `AlertDialog` | Up to 3 buttons (positive, negative, neutral) |

### 7.3 Web

| Pattern | Implementation | Libraries |
|---------|---------------|-----------|
| Skeleton | CSS (see Section 4.2) | `react-loading-skeleton`, Shadcn Skeleton |
| Toast | Custom + ARIA | `react-hot-toast`, `sonner`, `vue-toastification` |
| Progress | `<progress>` or `role="progressbar"` | NProgress (YouTube/GitHub style) |
| Banner | `<div role="alert/status">` | Carbon Design System notification |

### 7.4 Cross-Platform Frameworks

**React Native:** `ActivityIndicator` (maps to native), `react-native-toast-message`,
`react-native-skeleton-placeholder`.

**Flutter:** `CircularProgressIndicator`/`LinearProgressIndicator` (M3), `Shimmer`
package, `SnackBar` via `ScaffoldMessenger`, `AlertDialog`/`CupertinoAlertDialog`.
Flutter architecture guide documents optimistic state pattern with `Result` types.

---

## 8. Decision Tree

### 8.1 Choosing a Loading Indicator

```
Is the operation duration known?
+-- YES (determinate)
|   +-- < 10s --> Small progress bar or determinate spinner
|   +-- > 10s --> Full progress bar + percentage + time estimate
+-- NO (indeterminate)
    +-- Likely < 2s --> No indicator (perceived instant)
    +-- Likely 2-5s --> Spinner or M3 Expressive loading indicator
    +-- Likely 5-10s --> Skeleton screen (predictable layout) or labeled spinner
    +-- Likely > 10s --> Indeterminate progress bar + timeout at 15s/30s
```

### 8.2 Choosing a Feedback Mechanism

```
Does the user need to take action?
+-- YES
|   +-- Critical / destructive? --> Modal dialog (confirmation required)
|   +-- Non-critical? --> Snackbar with action ("Undo")
|   +-- Tied to specific element? --> Inline message adjacent to it
+-- NO (informational)
    +-- Urgent? --> role="alert", banner or assertive toast
    +-- System-wide? --> Persistent top-of-page banner
    +-- Routine success? --> Auto-dismiss toast (3-5s)
    +-- Other info? --> Inline status indicator or section notification
```

### 8.3 Choosing an Empty State

```
Why is content empty?
+-- First-time use --> Illustration + value prop + CTA to create
+-- No search results --> Echo query + modify suggestions + related content
+-- User cleared all --> Celebratory illustration + "All caught up"
+-- Error prevented load --> Error illustration + explanation + retry CTA
+-- Feature unavailable --> Prerequisite explanation + upgrade/enable CTA
```

### 8.4 Comparison Matrix

| Criterion            | Inline Message | Toast/Snackbar | Banner        | Modal Dialog  |
|----------------------|----------------|----------------|---------------|---------------|
| Urgency              | Medium         | Low            | Medium-High   | Critical      |
| Persistence          | Until resolved | Auto-dismiss   | Until dismissed| Until dismissed|
| Blocks interaction   | No             | No             | No            | Yes           |
| Tied to element      | Yes            | No             | No            | No            |
| User action required | Sometimes      | Optional       | Sometimes     | Yes           |
| Scope                | Field/section  | Page           | Page/app      | App           |
| Example              | Field error    | "Saved"        | "Trial expires"| "Delete?"    |

---

## References

### Design System Guidelines
- [Material Design 3 -- Progress Indicators](https://m3.material.io/components/progress-indicators/guidelines)
- [Material Design 3 -- Loading Indicator](https://m3.material.io/components/loading-indicator/guidelines)
- [Material Design 3 -- Snackbar](https://m3.material.io/components/snackbar/guidelines)
- [Apple HIG -- Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Apple HIG -- Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- [Apple HIG -- Progress Indicators](https://developers.apple.com/design/human-interface-guidelines/components/status/progress-indicators/)
- [Carbon Design System -- Loading Pattern](https://carbondesignsystem.com/patterns/loading-pattern/)
- [Carbon Design System -- Notification Pattern](https://carbondesignsystem.com/patterns/notification-pattern/)

### Research
- [NNG -- Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- [NNG -- Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- [NNG -- Errors in Forms Design Guidelines](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [Smashing Magazine -- Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [Baymard -- Inline Form Validation](https://baymard.com/blog/inline-form-validation)
- [web.dev -- Offline UX Design Guidelines](https://web.dev/articles/offline-ux-design-guidelines)
- [LogRocket -- Toast Notification Best Practices](https://blog.logrocket.com/ux-design/toast-notifications/)

### Accessibility
- [MDN -- ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [MDN -- ARIA alert role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role)
- [MDN -- ARIA status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)
- [Sara Soueidan -- Accessible Notifications with ARIA Live Regions](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/)
- [W3C -- Understanding SC 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- [VA.gov Design System -- Focus Management](https://design.va.gov/accessibility/focus-management)

### Design Patterns
- [Toptal -- Empty States UX](https://www.toptal.com/designers/ux/empty-state-ux-design)
- [MagicBell -- Alert Fatigue](https://www.magicbell.com/blog/alert-fatigue)
- [Stripe -- Design Patterns for Apps](https://docs.stripe.com/stripe-apps/patterns)
- [Adam Silver -- The Problem with Toast Messages](https://adamsilver.io/blog/the-problem-with-toast-messages-and-what-to-do-instead/)
