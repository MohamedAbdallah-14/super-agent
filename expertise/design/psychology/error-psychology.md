# Error Psychology — Design Expertise Module

> Error psychology studies why humans make errors, how errors affect emotional and cognitive states, and how interface design can prevent, tolerate, and recover from errors gracefully. This module spans cognitive error taxonomy (Don Norman), systemic failure models (James Reason), emotional consequences of repeated failure (Seligman, Dollard), manufacturing-derived mistake-proofing (Shingo), and their concrete application to UI/UX design across platforms.

---

## 1. The Science of Human Error

### 1.1 Slips vs. Mistakes — Don Norman's Error Taxonomy

Don Norman, in *The Design of Everyday Things* (1988, revised 2013), established the foundational distinction between two classes of human error based on where in the cognitive cycle the breakdown occurs.

**Slips — Correct intention, wrong execution.**
The user has the right goal but performs the wrong action. Slips occur at lower cognitive levels (execution, perception, interpretation) and are subconscious, automatic-behavior failures.

| Slip Type | Mechanism | Example |
|-----------|-----------|---------|
| **Capture slip** | A frequently performed action "captures" the intended one | Opening email out of habit when you meant to open the calendar |
| **Description-similarity** | Wrong action on an object resembling the target | Dragging a file to the wrong folder because two icons look alike |
| **Mode error** | System is in a different mode than the user assumes | Typing text in a spreadsheet cell that is in formula-edit mode |
| **Memory-lapse slip** | Forgetting to complete a step in a sequence | Sending an email without the attachment |

**Mistakes — Wrong intention, correct execution.**
The user forms an incorrect goal or plan but executes it properly. Mistakes occur at higher cognitive levels (goal formation, planning, evaluation) and are conscious, deliberate-reasoning failures.

| Mistake Type | Mechanism | Example |
|--------------|-----------|---------|
| **Rule-based** | Correct diagnosis, wrong action plan | Choosing "Reply All" when a private reply was appropriate |
| **Knowledge-based** | Incorrect or incomplete mental model | Believing deleting a shared Google Doc removes only your copy |
| **Memory-lapse** | Forgetting a goal or evaluation step | Starting a wizard, forgetting the purpose, selecting wrong options |

**Design implication:** Slips require better constraints, affordances, and forcing functions. Mistakes require better feedback, conceptual models, and information architecture.

### 1.2 The Swiss Cheese Model — James Reason

James Reason introduced the Swiss Cheese Model in *Human Error* (1990). Originally developed for aviation and healthcare safety, it provides a powerful framework for understanding how errors propagate through systems.

**Core concept:** Every defensive layer in a system (training, UI design, validation, confirmation dialogs, server-side checks) has gaps — like holes in slices of Swiss cheese. A catastrophic error occurs only when holes in multiple layers momentarily align, allowing a "trajectory of accident opportunity" to pass through all defenses.

**Four levels of failure in Reason's model:**

```
Level 1: Organizational influences
    (Company decides to skip usability testing to meet deadline)
        |
Level 2: Unsafe supervision / process gaps
    (No design review for destructive actions)
        |
Level 3: Preconditions for unsafe acts
    (User is fatigued, rushing, on mobile with poor connectivity)
        |
Level 4: Unsafe acts — the user's slip or mistake
    (User taps "Delete All" instead of "Delete Selected")
```

**Application to UI design — multiple independent defense layers:**

1. **Constraint layer** — Make the dangerous action harder to reach (progressive disclosure, spatial separation)
2. **Warning layer** — Confirmation dialog with specific consequences stated
3. **Recovery layer** — Undo functionality, soft-delete with retention period
4. **Audit layer** — Server-side logging enabling manual recovery

A single defense (e.g., a confirmation dialog) is insufficient. When any single layer fails (user clicks "Confirm" out of habit, undo window expires), the remaining layers still protect against permanent damage.

### 1.3 Error Prevention vs. Error Recovery

Two complementary strategies exist for handling errors, and mature design systems employ both.

**Error Prevention** — Eliminate error-prone conditions before they arise.
- Constraints that make invalid states unrepresentable (date pickers instead of free text)
- Defaults that guide toward correct choices
- Disabling actions until prerequisites are met
- Progressive disclosure that hides complexity until needed

**Error Recovery** — Minimize damage and effort when errors inevitably occur.
- Undo/redo stacks that let users reverse actions
- Auto-save and draft preservation
- Clear error messages with actionable fix instructions
- Forgiving input parsing (accepting "212-555-1234" or "2125551234" or "(212) 555-1234")

**The critical insight:** Prevention is always preferable, but recovery is always necessary. No prevention system is perfect — the Swiss Cheese Model guarantees gaps. Systems that invest only in prevention leave users stranded when errors slip through. Systems that invest only in recovery create a frustrating, error-heavy experience. NNG's Heuristic #5 (Error Prevention) and Heuristic #9 (Help Users Recognize, Diagnose, and Recover from Errors) encode this dual strategy directly.

### 1.4 The Frustration-Aggression Hypothesis

Proposed by Dollard, Doob, Miller, Mowrer, and Sears at Yale (1939): frustration — the blocking of goal-directed behavior — produces an instigation to aggression. Revised by Miller (1941): frustration creates readiness to respond aggressively, but aggression is one possible outcome among several.

**Manifestations in digital interfaces:**

| Response | Behavioral Signal | Example |
|----------|-------------------|---------|
| **Aggression** | Rage clicks (3+ clicks on same element in 2 seconds) | Button appears clickable but does nothing |
| **Fixation** | Repeating the same failed action | Resubmitting a form returning the same vague error |
| **Withdrawal** | Abandoning the task entirely | Closing the tab after the third failed login |
| **Regression** | Reverting to simpler strategies | Calling phone support instead of using self-service |

**Design implication:** Every error state is a frustration event. Cumulative errors compound non-linearly. One error with easy recovery keeps users engaged. Three errors in succession drives abandonment — not because any single error was catastrophic, but because accumulated frustration exceeded tolerance.

### 1.5 Learned Helplessness from Repeated Errors

Martin Seligman's learned helplessness theory (1967): organisms exposed to repeated, uncontrollable negative events stop trying to improve their situation — even when escape becomes possible.

**In user interfaces:** When users repeatedly encounter errors they cannot resolve (vague messages, incomprehensible validation, forms that clear on failure), they develop digital learned helplessness:

- **Low self-efficacy:** "I'm not good with computers"
- **Premature abandonment:** Giving up at the first difficulty on future tasks
- **Support dependency:** Calling support for tasks they could handle independently
- **Platform avoidance:** Switching to competitors entirely

**The vicious cycle:** Vague error -> user cannot fix -> tries random changes -> more errors -> frustration compounds -> user concludes "this is too hard for me" -> helplessness established -> avoids similar tasks in future.

**Design antidote:** Ensure every error state provides a clear, achievable path forward. Consistent success at recovery builds **learned mastery** — the opposite of helplessness.

### 1.6 Error Tolerance

Error tolerance means designing systems that absorb errors gracefully rather than punishing users for inevitable mistakes.

**Three dimensions:**
1. **Input tolerance** — Accept varied formats, ignore harmless deviations (phone: `(212) 555-1234` or `2125551234`)
2. **State tolerance** — Preserve user progress despite errors (auto-save, retaining form values on validation failure)
3. **Action tolerance** — Allow reversal of unintended actions (multi-level undo, soft delete with recovery period)

**Key principle:** The cost of an error to the user should be proportional to the ease of making that error. Easy-to-make errors must be easy to reverse.

### 1.7 Poka-Yoke — Mistake-Proofing from Manufacturing

Poka-yoke ("mistake-proofing") was developed by Shigeo Shingo at Toyota in the 1960s. Instead of training workers to avoid mistakes, redesign the system so mistakes become impossible or immediately detectable.

**Two types:**

| Type | Manufacturing Example | UI Example |
|------|----------------------|------------|
| **Prevention** (makes errors impossible) | USB-C fits only one way | Disabled submit until required fields valid |
| **Detection** (makes errors visible) | Dashboard warning light | Red border on email field missing "@" |

**Six poka-yoke strategies for UI:**
1. **Elimination** — Remove error opportunity (auto-fill address from ZIP lookup)
2. **Replacement** — Constrained inputs replace free-text (dropdowns, pickers, sliders)
3. **Prevention** — Make errors logically impossible (`maxlength`, `type="email"`, grayed-out buttons)
4. **Facilitation** — Make correct action easier than incorrect (smart defaults, autocomplete)
5. **Detection** — Catch errors immediately (real-time password strength, address verification)
6. **Mitigation** — Reduce consequences (soft-delete, "undo send" window, auto-save)

---

## 2. Design Implications — 15 Rules for Error-Resilient Interfaces

### Rule 1: Prevent Errors with Constraints

**Principle:** The most effective error message never appears. Use constraints to make errors structurally impossible.

**Rule:** For every input, ask: "Can I constrain this to eliminate invalid states?" Use pickers, dropdowns, toggles instead of free-text when the valid set is known.

```
BAD:  Free text "Date of Birth" -> Users type "March 7th", "3/7/26", "07-03-2026"
GOOD: Three dropdowns [Month v] [Day v] [Year v] or a date picker
      -> Invalid dates not selectable, zero parsing errors
```

### Rule 2: Use Confirmation for Destructive Actions Only

**Principle:** Confirmation dialogs interrupt flow to ensure intent before high-consequence actions, but lose effectiveness when overused.

**Rule:** Reserve confirmation exclusively for irreversible actions. State the specific consequence — never use generic "Are you sure?"

```
BAD:  "Are you sure?" [Cancel] [OK]
GOOD: "Permanently delete 847 customer records? This cannot be undone."
      [Cancel] [Delete 847 Records]
      -> Consequence quantified, button names the exact action
```

**NNG finding:** Confirmation effectiveness depends on rarity. Frequent dialogs train users to click "Confirm" without reading — a capture slip.

### Rule 3: Provide Undo Instead of Confirmation

**Principle:** Undo respects agency, is less disruptive, and does not suffer from habituation.

**Rule:** For reversible actions, prefer undo over confirmation. Show a toast with undo action after the operation completes.

```
CONFIRMATION (inferior):  Dialog -> user reads -> clicks Archive -> done
UNDO (superior):  Archive immediately -> toast "Archived. [Undo]" for 8 sec
                   -> User continues uninterrupted, clicks Undo only if mistaken
```

**When undo is NOT sufficient:** Sending to 10,000 recipients, permanent data purge, financial transactions, external API triggers.

### Rule 4: Error Messages Must Explain + Suggest Fix

**Principle:** An error message must: (1) state what happened, (2) explain why, (3) tell how to fix it.

**Rule:** Every error must contain a plain-language description and at least one actionable suggestion. Never blame the user. Keep under 14 words (90% comprehension) or 8 words (100% comprehension).

```
TERRIBLE:  "Error 0x80070005"
BAD:       "Invalid input"
MEDIOCRE:  "Please enter a valid email address"
GOOD:      "This email is missing an '@'. Example: name@company.com"
EXCELLENT: "No account for alex@gmial.com. Did you mean alex@gmail.com?"
```

**Baymard finding:** For complex fields (card number, phone, password), prepare 4-7 specific messages per field. Generic "invalid" messages increase recovery time by up to 5x.

### Rule 5: Inline Validation — Timed Correctly

**Rule:** Validate on blur (when user leaves the field), never while still typing. Remove error indicators immediately when corrected.

```
BAD:  User types "a" in email -> immediately shows "invalid email" (premature)
GOOD: User types "alex@gmial", tabs away -> shows "Did you mean gmail.com?"
BEST: First interaction: validate on blur. After error shown: validate on
      keyup (green check the moment input becomes valid — positive reinforcement)
```

**Research (Wroblewski):** Proper inline validation: 22% fewer errors, 42% faster completion, 31% higher satisfaction.

### Rule 6: Never Clear Form Fields on Error

**Rule:** Always preserve all user input when displaying validation errors. Highlight only fields needing correction. Never reset the form.

```
DESTRUCTIVE: 12-field form -> submit -> "Username taken" -> ALL fields cleared
PRESERVING:  12-field form -> submit -> username highlighted red
             "The username 'alex_dev' is taken. Available: alex_dev1, alexdev_"
             All other fields retain values
```

**Baymard finding:** 34% of e-commerce sites clear credit card details on validation error — a leading cause of checkout abandonment.

### Rule 7: Auto-Save to Prevent Data Loss

**Principle:** Users should never lose work because of a browser crash, accidental navigation, network interruption, or session timeout.

**Rule:** Implement auto-save for any form or content creation flow where data entry takes more than 30 seconds. Provide clear "Saved" / "Saving..." status indicators. Warn users before navigating away from unsaved changes. Maintain drafts as recoverable objects.

```
AUTO-SAVE IMPLEMENTATION:

1. Trigger: Save on blur (field exit) + every 30 seconds during
   active typing + on beforeunload event

2. Feedback:
   - During save: "Saving..." (subtle spinner)
   - After save:  "Saved just now" or "Saved 2 min ago"
   - On failure:  "Changes not saved — check your connection"
                  [Retry] [Save locally]

3. Recovery:
   - On return after crash: "We found a draft from March 7
     at 2:34 PM. [Resume draft] [Discard]"
   - Draft management: Drafts visible in a dedicated section
     (as in Gmail, Twitter/X, Notion)

4. Navigation guard:
   - Browser beforeunload: "You have unsaved changes.
     Leave anyway?"
```

**Caution:** Auto-save should be used cautiously for data with financial, security, or privacy implications. A user editing their bank account number should not have partial edits auto-saved mid-change. In these cases, explicit save with confirmation is more appropriate.

### Rule 8: Every Error State Must Offer a Forward Path

**Principle:** When errors occur, the system should minimize damage, preserve context, and provide a clear path to recovery. The user should never reach a dead end.

**Rule:** Every error state must offer at least one forward path. Provide retry options, alternative actions, and help resources. Never show an error without an actionable next step.

```
DEAD END (no recovery path):
  "Something went wrong."
  [OK]
  -> User clicks OK and is returned to... where? What now?

RECOVERABLE (clear forward paths):
  "We couldn't process your payment. Your card was not charged."

  What you can do:
  - [Try again] — retry the same payment
  - [Use a different card] — switch payment method
  - [Save cart for later] — preserve selections without paying
  - [Contact support] — get human help (est. wait: 2 min)

  Error reference: PAY-4092 (if you contact support)
```

**Network error pattern:**
```
MOBILE NETWORK LOSS:
  "You're offline. Your changes are saved on this device
   and will sync when you're back online."
  [View saved changes] [Continue editing offline]
  -> No data loss, no panic, clear expectation setting
```

### Rule 9: Progressive Disclosure Reduces Error Opportunity

**Rule:** Break complex flows into sequential steps. Show advanced options only when requested.

```
HIGH ERROR SURFACE: Single page, 25 fields -> cognitive overload, scattered errors
LOW ERROR SURFACE:  Step 1: Address (5 fields) -> Step 2: Shipping (1 choice)
                    -> Step 3: Payment (4 fields) -> Step 4: Review -> Place Order
                    Each step validated before proceeding
```

**NNG:** Progressive disclosure improves learnability, efficiency, and error rate.

### Rule 10: Separate Destructive from Routine Actions

**Rule:** Place destructive actions in physically and visually distinct locations. Require different interaction patterns.

```
DANGEROUS: [Save] [Delete Account]    <- adjacent, same size, one-click
SAFE:      [Save Changes]             <- primary position
           ─── Danger Zone ───
           [Delete Account]           <- separated, red, requires typing "DELETE"
```

### Rule 11: Forgiving Input Parsing

**Rule:** Accept all reasonable format variations. Parse and normalize on the backend. Show normalized format for confirmation.

```
RIGID:     Phone rejects "(212) 555-1234", demands "212-555-1234" only
FORGIVING: Accepts any format -> strips non-digits -> validates -> displays "(212) 555-1234"
```

### Rule 12: Contextual Help at Error-Prone Points

**Rule:** Add helper text, tooltips, and examples to fields with high error rates. Place help adjacent to the input.

```
WITHOUT: CVV: [___]                -> 18% error rate
WITH:    CVV: [___] (?) "3 digits on back of card" [card image] -> significantly lower
```

### Rule 13: Show System Status During Long Operations

**Rule:** For operations >1 second, show progress. For >4 seconds, show estimated time. Never leave the screen unchanged.

```
NO STATUS:   "Submit Payment" -> screen frozen 8 sec -> user clicks again -> double charge
WITH STATUS: "Submit Payment" -> "Processing..." (button disabled) -> "Verifying..." -> "Confirmed!"
```

### Rule 14: Design Error States as First-Class UI States

**Principle:** Error states are not edge cases — they are regular states that every user will encounter. They deserve the same design attention as success states.

**Rule:** Design every screen's error state intentionally during the design phase, not as an afterthought during development. Create specific empty states, error states, and partial-failure states in your design system.

```
STATES EVERY SCREEN NEEDS:

1. Loading state     -> Skeleton screen or spinner
2. Empty state       -> Helpful prompt to add content
3. Populated state   -> Normal view with data
4. Error state       -> Clear message + recovery action
5. Partial state     -> Some data loaded, some failed
6. Offline state     -> What's available without network
7. Permission state  -> What to do if access is denied

PARTIAL FAILURE EXAMPLE:
  Dashboard with 4 widgets:
  - Widget 1: Data loaded successfully
  - Widget 2: Data loaded successfully
  - Widget 3: "Couldn't load sales data. [Retry]"
  - Widget 4: Data loaded successfully
  -> Don't blank the entire page because one API call failed
  -> Show what you can, fail gracefully where you can't
```

### Rule 15: Smart Defaults Reduce Decision Errors

**Rule:** Pre-select the statistically most common choice. Allow easy override. Never use defaults that serve the business at the user's expense (dark pattern territory).

```
NO DEFAULT:  Shipping: ( ) Standard  ( ) Express  ( ) Overnight
SMART:       Shipping: ( ) Standard  (*) Express  ( ) Overnight
             "Most customers choose Express (2-3 days, $5.99)"
```

---

## 3. Measurement — Quantifying Error Impact

### 3.1 Error Rate Metrics

**Task Error Rate:** Percentage of task attempts that include at least one error.
```
Task Error Rate = (Tasks with errors / Total task attempts) x 100

Benchmarks:
- Simple tasks (login, search):     < 5% error rate
- Moderate tasks (checkout, forms):  < 15% error rate
- Complex tasks (multi-step config): < 25% error rate
```

**Error Frequency:** Average number of errors per task completion.
```
Error Frequency = Total errors observed / Total tasks completed

Interpretation:
- 0.0 - 0.3: Excellent — errors are rare
- 0.3 - 1.0: Acceptable — occasional errors, manageable
- 1.0 - 2.0: Concerning — users struggle regularly
- 2.0+:      Critical — interface is fundamentally broken
```

**Error Severity Classification:**

| Severity | Definition | Example |
|----------|-----------|---------|
| **Cosmetic** | No functional impact | Typo in label |
| **Minor** | Brief confusion, self-corrects in seconds | Misleading icon |
| **Major** | Significant effort to recover | Form cleared on submit |
| **Critical** | Data loss or task abandonment | Payment double-charged |
| **Catastrophic** | Irreversible real-world consequences | Wrong medical record updated |

### 3.2 Recovery Metrics

**Error Recovery Rate:** Percentage of errors from which users successfully recover without external help.
```
Recovery Rate = (Self-recovered errors / Total errors) x 100

Target: > 85% self-recovery rate
Below 70%: Error messages and recovery paths need redesign
```

**Mean Time to Recovery (MTTR):** Average time from error occurrence to successful task resumption.
```
MTTR = Sum of all recovery times / Number of recovered errors

Benchmarks:
- < 10 seconds:   Good — user barely notices the error
- 10-30 seconds:  Acceptable — noticeable but not frustrating
- 30-120 seconds: Poor — significant workflow disruption
- > 120 seconds:  Critical — users are likely to abandon
```

**Error-to-Abandonment Rate:** Percentage of error encounters that result in task abandonment.
```
Abandonment = (Tasks abandoned after error / Total tasks with errors) x 100

Benchmarks:
- < 5%:   Errors are well-handled, recovery paths work
- 5-15%:  Some error paths need improvement
- 15-30%: Significant usability problem
- > 30%:  Critical — errors are driving users away
```

### 3.3 User Frustration Signals

| Signal | Detection | Threshold |
|--------|-----------|-----------|
| Rage clicks | 3+ clicks on same element in 2 sec | Any occurrence |
| Dead clicks | Clicks on non-interactive elements | >5% of total clicks |
| Form abandonment | Started but not submitted | >40% |
| Error page bounces | Leaves immediately after error | >60% |
| Backtracking | Returns to same step repeatedly | >2 returns |
| Session rage quit | Session ends within 30 sec of error | Correlate with error events |

**Attitudinal indicators:** SUS <68, NPS drop after error-heavy flows, CES >5/7, qualitative feedback with "frustrating," "broken," "gave up."

### 3.4 Error Message Effectiveness Testing

**A/B testing error messages:**
```
Methodology:
1. Identify the 10 most frequently triggered error messages
2. For each, create 2-3 variant messages:
   - Variant A: Current message
   - Variant B: Rewritten with specific problem + suggested fix
   - Variant C: Rewritten with specific problem + auto-fix option
3. Measure per variant:
   - Recovery rate (% who fix the error and continue)
   - Recovery time (seconds from error to correction)
   - Abandonment rate (% who leave after the error)
   - Repeat error rate (% who trigger the same error again)
4. Run for 2-4 weeks until statistical significance
5. Deploy the best-performing variant
```

**Usability testing error scenarios:**
```
Protocol:
1. Give participants tasks that naturally trigger errors
2. Observe and record:
   - Does the user notice the error message?
   - Does the user understand what went wrong?
   - Does the user know how to fix it?
   - How long does recovery take?
   - What is the user's emotional state? (think-aloud)
3. Post-task: "On a scale of 1-7, how easy was it to
   recover from the error?"
4. Iterate on messages scoring below 5
```

**Field-level error analytics:**
```
Track per field:
- Error trigger rate (% of users who trigger validation)
- Most common error type per field
- Field-level abandonment (users who leave at this field)
- Correction success rate (% who fix error and continue)
- Average attempts to resolve (1 = first try, higher = struggling)

Fields with > 20% error rate need redesign, not just
better error messages.
```

---

## 4. Dark Patterns Warning — Weaponized Error States

Error states can be deliberately designed to manipulate users against their interests. These deceptive patterns weaponize error psychology to prevent users from taking actions the business wants to block (like canceling subscriptions).

### 4.1 Fake Error Messages to Prevent Cancellation

**Pattern:** When a user attempts to cancel a subscription or delete an account, the system displays a fake or exaggerated error message to block the action.

```
DARK PATTERN:
  User clicks "Cancel Subscription"
  -> "An error occurred. Please try again later."
  -> User tries again -> same "error"
  -> User gives up, remains subscribed
  -> No actual error occurred — the system faked it

ETHICAL ALTERNATIVE:
  User clicks "Cancel Subscription"
  -> "Your subscription will end on March 31, 2026.
     You'll keep access until then."
  -> [Keep Subscription] [Confirm Cancellation]
  -> Clean, honest, respectful process
```

### 4.2 Hidden Unsubscribe Errors

**Pattern:** Unsubscribe links in emails lead to pages that display errors, require login, or claim the action "couldn't be completed."

```
DARK PATTERN:
  User clicks "Unsubscribe" in email footer
  -> "We're sorry, something went wrong. Please try again
     or contact support."
  -> No actual error — the unsubscribe was simply blocked

ETHICAL ALTERNATIVE:
  User clicks "Unsubscribe"
  -> "You've been unsubscribed from marketing emails.
     You'll still receive transactional emails (receipts,
     security alerts)."
  -> [Resubscribe] if they change their mind
  -> Immediate, one-click, no barriers
```

### 4.3 Confirmshaming via Error-Adjacent Language

**Pattern:** The option to decline is phrased to make the user feel guilty, using the visual language of error states (red text, warning icons) on legitimate choices.

```
DARK PATTERN:
  "Upgrade to Premium for $9.99/month?"
  [Yes, upgrade me!]
  [No, I don't want to save money] <- styled like an error/warning

ETHICAL ALTERNATIVE:
  "Upgrade to Premium for $9.99/month?"
  [Upgrade] [No thanks]
  -> Neutral language, equal visual weight
```

### 4.4 Obstruction via False Complexity (Roach Motel)

**Pattern:** Making cancellation deliberately complex with multiple steps, each appearing to fail or requiring information the user must search for.

```
ROACH MOTEL:
  Sign up: 1 click, 2 fields, 30 seconds
  Cancel:  5 pages, a phone call, a "retention specialist,"
           a fake error on the final confirmation page

  Amazon Prime cancellation (pre-lawsuit):
  -> 6 clicks through multiple screens with manipulative copy
  -> Each screen designed to look like an error or dead end
  -> FTC lawsuit resulted in $25 million fine
```

### 4.5 Legal and Regulatory Context

Manipulative error patterns are increasingly illegal:

- **GDPR (EU):** Requires "freely given" consent; dark patterns invalidate consent
- **Digital Services Act (EU):** Explicitly bans manipulative interface designs
- **FTC (US):** Has prosecuted Amazon, ABCmouse, Epic Games for deceptive flows
- **CCPA (California):** Prohibits dark-pattern approaches to opt-out requests
- **Consumer protection laws worldwide** are increasingly classifying fake errors as fraud

---

## 5. Platform-Specific Error Considerations

### 5.1 Mobile-Specific Error Patterns

**Fat Finger Errors:**
Touch targets on mobile are inherently imprecise. The average adult fingertip covers approximately 10mm (~40px), but many mobile interfaces use targets smaller than this.

```
MITIGATION STRATEGIES:
- Minimum touch target: 48x48dp (Android Material), 44x44pt (Apple HIG)
- Minimum spacing between destructive and safe actions: 16dp
- Increase tap target size for destructive actions beyond minimums
- Use swipe-to-delete with undo instead of tap-to-delete
- Add haptic feedback on destructive action activation
```

**Network Loss and Intermittent Connectivity:**
Mobile users frequently move between network states. Forms and actions must handle transitions gracefully.

```
OFFLINE STRATEGY:
1. Queue actions when offline (optimistic UI)
2. Show clear offline indicator (not an error — a state)
3. Sync automatically when connection returns
4. Resolve conflicts with clear user prompts:
   "You edited this offline, but someone else also made changes.
    [Keep yours] [Keep theirs] [Merge]"

TIMEOUT HANDLING:
- Don't show "Error" for slow connections
- Show: "This is taking longer than usual.
  [Keep waiting] [Try again] [Save and try later]"
- Never silently fail — always inform the user of the outcome
```

**Small Screen Form Errors:**
Error messages compete for precious screen real estate on mobile.

```
MOBILE FORM ERROR PATTERNS:
- Inline errors below the field (not a banner at the top
  that requires scrolling up)
- Auto-scroll to the first error field after submission
- Red border + icon + text (triple redundancy)
- Collapse resolved errors to recover screen space
- Never use modals for form errors on mobile — they obscure
  the form and prevent correction
```

**Gesture Errors:**
Mobile introduces gesture-based errors that desktop does not have: accidental swipe-to-delete (always provide undo toast), accidental pull-to-refresh mid-form (preserve form state), accidental back-swipe on iOS (warn if unsaved changes), accidental long-press (never trigger destructive actions on long-press alone).

### 5.2 Desktop-Specific Error Patterns

**Complex Form Errors:**
Desktop forms tend to be longer and more complex due to available screen space.

```
DESKTOP FORM STRATEGIES:
- Error summary at top with anchor links to each error field:

  "Please fix 3 errors:
   1. Email address -> missing @ symbol
   2. Phone number -> too few digits
   3. ZIP code -> doesn't match selected state"

  Each item links to its field for quick navigation
- Multi-column forms need clear error-to-field association
  (arrow indicators, not just color)
- Tab-key navigation must reach error messages
- Error messages must be announced by screen readers
```

**Keyboard Shortcut Errors:**
Desktop users rely on shortcuts, creating unique slip opportunities.
- Ctrl+Z (undo) must work consistently across all interactions
- Ctrl+W (close tab) while editing must trigger beforeunload warning
- Accidental Ctrl+A then typing replaces all text — undo must restore fully
- Ctrl+S (save) must never trigger unintended side effects

### 5.3 Cross-Platform Undo Patterns

| Platform | Undo Mechanism | Discoverability |
|----------|---------------|-----------------|
| Desktop web | Ctrl/Cmd+Z | High |
| iOS | Shake to undo | <10% of users discover it |
| Android | No system gesture | App must provide explicit undo |

**Cross-platform rule:** Always provide an explicit, visible undo mechanism (toast/snackbar with [Undo] action). Never rely solely on platform gestures. Display undo for 8-10 seconds (5 is too short for delayed realization).

### 5.4 Accessibility and Error States

- Never use color alone for errors (WCAG 1.4.1) — use color + icon + text
- Error text must meet 4.5:1 contrast (WCAG 1.4.3)
- Use `role="alert"` or `aria-live="assertive"` for screen reader announcement
- Associate errors with fields via `aria-describedby`
- Set `aria-invalid="true"` on error fields
- Move focus to first error field on submission
- Use plain language, provide input examples, avoid time-limited error displays

---

## 6. Quick Reference Checklist

### Prevention
```
[ ] Constrained inputs (pickers/dropdowns) where valid set is known
[ ] Smart defaults for common choices
[ ] Disabled states for impossible actions
[ ] Progressive disclosure — only relevant fields visible
[ ] Forgiving input parsing — accept varied formats
[ ] Destructive actions spatially separated from routine ones
[ ] Contextual help (tooltips/examples) on error-prone fields
[ ] Progress indicators for operations >1 second
[ ] Double-submit prevention (disable button after click)
[ ] Autocomplete for known-good values
```

### Recovery
```
[ ] Undo via toast for reversible actions
[ ] Form fields preserved on validation error
[ ] Auto-save for flows >30 seconds
[ ] Error messages explain problem + suggest fix
[ ] Inline validation on blur, not while typing
[ ] Error indicators removed on correction
[ ] Every error state offers at least one forward action
[ ] Partial failure shown (not full-page blank)
[ ] Navigation guard for unsaved changes
[ ] Drafts, deleted items, and versions recoverable
```

### Error Message Quality
```
[ ] States what went wrong (specific)
[ ] Suggests how to fix (actionable)
[ ] Plain language (no jargon or codes as headline)
[ ] Does not blame user
[ ] Concise (<14 words primary)
[ ] Inline next to field
[ ] Triple-redundant (color + icon + text)
[ ] Accessible (screen reader, keyboard)
[ ] Tested with real users
```

### Dark Pattern Audit
```
[ ] Cancel/unsubscribe same effort as signup
[ ] All error messages genuine (no fake errors)
[ ] Decline options phrased neutrally
[ ] Unsubscribe link functional and immediate
[ ] Compliant with GDPR/DSA/FTC rules
```

### Measurement
```
[ ] Task error rate tracked per flow
[ ] Recovery rate >85%
[ ] MTTR <30 seconds
[ ] Abandonment after error <15%
[ ] Rage click detection enabled
[ ] Field error rates tracked (redesign at >20%)
[ ] Error messages A/B tested quarterly
```

---

## Key References

- **Norman, D.** (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books.
- **Reason, J.** (1990). *Human Error*. Cambridge University Press.
- **Seligman, M.** (1975). *Helplessness: On Depression, Development, and Death*. W.H. Freeman.
- **Shingo, S.** (1986). *Zero Quality Control: Source Inspection and the Poka-Yoke System*. Productivity Press.
- **Dollard, J., et al.** (1939). *Frustration and Aggression*. Yale University Press.
- **Nielsen Norman Group.** [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [Error Prevention](https://www.nngroup.com/articles/slips/), [Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/), [Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/), [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- **Baymard Institute.** [Inline Form Validation](https://baymard.com/blog/inline-form-validation), [Adaptive Validation Errors](https://baymard.com/blog/adaptive-validation-error-messages), [Retain Data on Error](https://baymard.com/blog/preserve-card-details-on-error)
- **Wroblewski, L.** Inline Validation in Web Forms (22% fewer errors, 42% faster, 31% higher satisfaction).
- **MeasuringU.** [Measuring Errors in UX](https://measuringu.com/errors-ux/)
