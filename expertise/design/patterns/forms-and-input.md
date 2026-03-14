# Forms and Input Patterns — Expertise Module (Pattern)

> Forms are the primary mechanism through which users provide data to digital products. A well-designed form reduces cognitive load, minimizes errors, and accelerates task completion. This module covers form anatomy, validation strategies, micro-interactions, accessibility requirements, cross-platform adaptation, and common anti-patterns, synthesizing research from Baymard Institute, Nielsen Norman Group, Material Design 3, and industry leaders like Stripe, Typeform, and Linear.

---

## 1. Pattern Anatomy

### Form Types

Forms exist on a spectrum from simple single-field inputs to complex multi-page wizards. Choosing the correct type depends on data complexity, user context, and task criticality.

**Single-Page Forms**
All fields are visible on one scrollable page. The user fills in data top-to-bottom, then submits.

- Best for: login, sign-up (3-7 fields), contact forms, feedback, search filters
- Advantages: full context visible, no navigation overhead, simple mental model
- Risks: long forms cause scroll fatigue; more than 12-15 fields warrant restructuring
- Key metric: Baymard Institute found the average checkout contains 11.3 form fields; 22% of users abandon due to perceived complexity

**Multi-Step / Wizard Forms**
Data collection is split across sequential steps, each containing a logical group of 3-7 fields. A progress indicator shows the user's position.

- Best for: checkout flows, onboarding, account setup, applications, surveys
- Advantages: reduces perceived complexity, enables per-step validation, supports save-and-resume
- Risks: users lose context of overall form length; back-navigation can lose data if not designed carefully
- Guidelines: each step should contain a maximum of 5-9 fields; logically group related questions; always show a progress bar or step indicator; auto-save data on each step transition

**Inline Editing**
Users click on displayed content to switch it into an editable state, make changes, and save — all within the same view context.

- Best for: profile pages, settings, data tables, CMS content, list views
- Advantages: eliminates navigation to separate edit pages; feels fast and direct
- Risks: discoverability is low if edit affordances are invisible; accidental edits can occur without confirmation
- Guidelines: provide clear hover/focus affordances (pencil icon, underline, background highlight); always offer cancel and confirm actions; use role-based permissions to control who sees edit affordances

**Conversational / One-at-a-Time Forms**
A single question is presented per screen with smooth transitions between questions. Typeform pioneered this approach.

- Best for: surveys, lead generation, onboarding quizzes, applications where engagement matters more than speed
- Advantages: reduces visual overwhelm; feels personal and conversational; higher engagement for non-urgent tasks
- Risks: slower for power users who want to scan all fields; poor for reference-heavy data entry where users need to see multiple fields simultaneously
- Guidelines: limit to fewer than 10 questions for best completion rates (Typeform research shows 6 as the sweet spot); use conditional logic to skip irrelevant questions

### When to Use Each Variant

| Criteria | Single-Page | Multi-Step | Inline Edit | Conversational |
|---|---|---|---|---|
| Number of fields | 1-12 | 8-40+ | 1-5 per item | 1-15 |
| Task frequency | Any | Infrequent | Frequent | Infrequent |
| Data relationships | Independent | Grouped by topic | Isolated values | Sequential |
| User expertise | Any | Novice-friendly | Intermediate+ | Any |
| Mobile suitability | Good | Excellent | Moderate | Excellent |
| Save/resume needed | Rarely | Often | Not applicable | Sometimes |

### Form Structure

Every form field consists of up to six visual components. Consistent placement of these components across all fields in a form is essential.

```
┌─────────────────────────────────────────┐
│  Label Text *                            │  ← Label (above or beside input)
│  ┌─────────────────────────────────────┐ │
│  │  Placeholder text                   │ │  ← Input container
│  └─────────────────────────────────────┘ │
│  Helper text or character count (0/100)  │  ← Helper / counter
│  ✕ Error message when validation fails   │  ← Error message
│                                          │
│  [ Cancel ]  [ Submit ]                  │  ← Action buttons
└─────────────────────────────────────────┘
```

**Labels**
- Place labels above the input field (preferred for mobile and scanning speed) or to the left for dense desktop forms
- NNG research: forms with top-aligned labels completed significantly faster than left-aligned labels
- Never use placeholder text as the sole label — it disappears on input and fails WCAG 3.3.2
- Use sentence case for labels; avoid ALL CAPS (harder to read, feels aggressive)
- Keep labels concise: "Email address" not "Please enter your email address below"

**Inputs**
- Match input type to data: text, email, tel, number, url, password, date, time, search
- Size the input to hint at expected data length (zip code field shorter than street address)
- Provide visible borders/outlines — low-contrast or borderless inputs reduce discoverability

**Helpers**
- Place helper text below the input field in a smaller, muted typeface
- Use helpers for formatting hints ("MM/DD/YYYY"), constraints ("Must be 8+ characters"), or context ("We'll never share your email")
- Helper text must persist while the user types (unlike placeholders)

**Errors**
- Display inline below the field with a red/error-color indicator and an icon
- Be specific: "Email must include @ and a domain" not "Invalid input"
- Baymard found 99% of sites fail to provide adaptive error messages that explain the specific problem

**Actions**
- Primary action (Submit, Continue, Save) should be visually prominent
- Secondary action (Cancel, Back) should be visually subordinate but accessible
- Place action buttons at the bottom-left of the form, aligned with field edges
- Never use a "Reset" / "Clear form" button — NNG has warned against this for over 15 years

---

## 2. Best-in-Class Examples

### Stripe Checkout
**Why it excels:** Stripe's checkout is the gold standard for payment forms. It uses a single vertical column, auto-detects card brand from the first digits (displaying the card logo), auto-formats the card number into 4-digit groups, runs Luhn validation while typing, and auto-advances the cursor when a field is complete. Error messages are inline and specific. The form adapts between embedded, overlay, and redirect modes. Mobile abandonment data drove their design — they observed 79% mobile abandonment rates industrywide and optimized aggressively against that.

**Key takeaways:** Auto-format and auto-advance for structured data; detect and display context (card brand); real-time validation for payment fields; guest checkout by default.

### Linear
**Why it excels:** Linear uses inline editing throughout its issue tracker. Click any field (title, description, status, assignee, priority) to edit it in place. Changes save automatically with optimistic UI updates. The keyboard-first design allows rapid issue creation with minimal mouse interaction. Forms use command palette patterns (Cmd+K) for assignment and labeling rather than traditional dropdowns.

**Key takeaways:** Inline editing for frequent-edit interfaces; auto-save with optimistic updates; keyboard-first interaction; command palettes as form input alternatives.

### Typeform
**Why it excels:** Typeform pioneered the one-question-at-a-time conversational form. Each question occupies the full viewport with elegant typography and smooth transitions. Conditional logic personalizes the path. The design philosophy centers on "human experience" over utilitarian data collection.

**Key takeaways:** Full-screen single questions reduce overwhelm; smooth transitions maintain flow; conditional logic eliminates irrelevant fields; design for engagement when completion rate is the primary metric.

### Apple (Account Creation & Apple ID)
**Why it excels:** Apple's sign-up forms are minimal and security-focused. Password fields include inline strength meters with real-time requirement checklists. Two-factor verification is integrated seamlessly. The forms use native iOS pickers for date and country selection. Labels are always visible above fields. Error states are clear and specific.

**Key takeaways:** Security-focused forms benefit from real-time requirement feedback; native platform controls for selection inputs; minimal field count with progressive disclosure for optional information.

### Google (Account Sign-Up)
**Why it excels:** Google's Gmail sign-up follows Hick's Law with minimal design, generous white space, and zero distracting elements. The multi-step flow breaks creation into logical chunks (name, email choice, password, phone verification, profile). Each step contains 2-4 fields maximum. The neutral, concise copy sets a relaxed tone.

**Key takeaways:** Multi-step with minimal fields per step; neutral copy tone; social proof through ecosystem branding; progressive disclosure across steps.

### Shopify (Merchant Onboarding)
**Why it excels:** Shopify's merchant onboarding uses a wizard pattern that adapts based on business type. Smart defaults pre-fill currency, language, and tax settings based on location. Address fields use Google Places autocomplete. The progress indicator shows percentage complete and estimated time remaining.

**Key takeaways:** Smart defaults from context (location, business type); address autocomplete integration; time-remaining estimates in multi-step forms; adaptive paths based on user input.

### Notion
**Why it excels:** Notion uses inline editing as its core interaction model. Every block of content is directly editable. Database properties use type-specific inputs (date pickers, select menus, relation lookups) that appear inline. The slash-command system (/) serves as a form of structured input that eliminates traditional form UI entirely.

**Key takeaways:** Content-as-form paradigm; type-specific inline editors; slash-command structured input; direct manipulation over modal editing.

### gov.uk (Government Digital Service)
**Why it excels:** The UK Government Digital Service sets the accessibility standard for forms. Every form follows a "one thing per page" pattern. Labels are large and above fields. Error summaries appear at the top of the page with anchor links to each problem field. The design system is fully WCAG 2.2 AA compliant and extensively user-tested with assistive technology users.

**Key takeaways:** One thing per page for complex government forms; error summary with anchor links; large, clear labels; extensive assistive technology testing; open-source design system.

---

## 3. User Flow Mapping

### Happy Path

```
[Form loads] → [User focuses first field] → [Types data] →
[Moves to next field (Tab/click)] → [Real-time validation confirms ✓] →
[Completes all fields] → [Clicks submit] → [Loading state] →
[Success confirmation] → [Redirect or next step]
```

Key design requirements for the happy path:
- Auto-focus the first input on form load (unless the form is below the fold)
- Show positive validation feedback (green checkmark) as fields are completed correctly
- Disable the submit button during submission to prevent double-submit
- Show a loading/spinner state on the submit button during processing
- Display a clear success message or redirect on completion

### Validation Errors

```
[User submits form] → [Client-side validation catches errors] →
[Scroll to first error] → [Focus first error field] →
[Display inline error messages] → [Error summary at top (optional)] →
[User corrects field] → [Error clears immediately on valid input] →
[User re-submits] → [Success]
```

**Reward Early, Punish Late Pattern (recommended):**
This is the most effective validation timing strategy, validated by Smashing Magazine and Baymard research:

- If a field is in a valid state and the user is editing it, wait until blur (leaving the field) to validate — "punish late"
- If a field is in an invalid/error state and the user is correcting it, validate on every keystroke so the error clears immediately when fixed — "reward early"
- Never validate empty fields while the user is still typing (premature validation)
- Validate empty required fields only on form submission

Research shows that the "validate on blur" method results in forms completed 7-10 seconds faster than "validate while typing" methods, with better satisfaction ratings.

### Server Errors

```
[User submits valid form] → [Request sent to server] →
[Server returns error (409 conflict, 422 validation, 500 error)] →
[Re-enable submit button] → [Show server error message] →
[Preserve all user input] → [Map server field errors to inline messages] →
[User corrects and re-submits]
```

Design requirements:
- Never clear form data on server error — this is a critical anti-pattern
- Map server-side field errors to the specific inline field when possible
- For general server errors (500), display a banner/toast with a retry option
- For conflict errors (e.g., "email already exists"), show inline on the specific field
- Log detailed error information for debugging but show user-friendly messages

### Timeout

```
[User submits form] → [Request takes too long] →
[Show timeout message after threshold (e.g., 30 seconds)] →
[Offer retry button] → [Preserve all form data] →
[Optionally show "Check status" link if submission may have succeeded]
```

### Multi-Step Form Progress and Back Navigation

```
Step 1: [Contact Info] → validates → saves to state/server →
Step 2: [Shipping Address] → validates → saves →
Step 3: [Payment] → validates → saves →
Step 4: [Review & Confirm] → submit

Back navigation at any step:
[Step 3] ← Back ← [Step 2 with preserved data] ← Back ← [Step 1 with preserved data]
```

Design requirements:
- Auto-save all data on step transitions — do not require the user to click "Save"
- Back button must restore all previously entered data exactly as left
- Browser back button should navigate to the previous form step, not leave the form entirely
- Show a confirmation dialog if the user tries to leave the form with unsaved data
- On the review step, allow editing any section by clicking on it (jump to that step)
- Progress indicator should show completed steps as clickable links for random access

### Edge Cases

**Session Expiry During Form**
- Auto-save form data to localStorage/sessionStorage periodically (every 30 seconds or on field blur)
- On session expiry, show a modal: "Your session has expired. Your progress has been saved. Please log in to continue."
- After re-authentication, restore the form state from saved data
- Never silently lose form data due to session timeout

**Network Loss**
- Detect offline state and show a non-blocking banner: "You're offline. Your changes will be saved when you reconnect."
- Queue form submissions and retry when connectivity returns
- Use optimistic UI: show the form as submitted with a pending indicator
- For critical forms (payments), explicitly warn that submission requires connectivity

**Duplicate Submission**
- Disable the submit button immediately on first click and show a loading state
- Use idempotency tokens: generate a unique token on form load, send with submission, reject duplicates server-side
- If a second submission is detected, show: "This form has already been submitted" with a link to the result
- Never process duplicate payment transactions — use idempotency keys (Stripe pattern)

---

## 4. Micro-Interactions

### Input Focus Animation

When a user taps or clicks into a field, the transition should provide clear visual feedback without being distracting.

**Recommended implementations:**
- Border color transitions from neutral gray to brand/primary color (150-200ms ease)
- Material Design 3: animated underline that expands from center outward for filled variant; border color change for outlined variant
- Floating label animates upward and scales down (transform: translateY + scale) when field receives focus or contains value
- Subtle background color shift (e.g., white to light blue tint) for filled text field variants
- Focus ring for keyboard users: 2px solid outline with 2px offset, high-contrast color

```css
/* Example focus transition */
.input-field {
  border: 1.5px solid #79747E;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input-field:focus {
  border-color: #6750A4;
  box-shadow: 0 0 0 1px #6750A4;
}
/* Keyboard-only focus ring */
.input-field:focus-visible {
  outline: 2px solid #6750A4;
  outline-offset: 2px;
}
```

### Error Shake

When a user submits a form with errors or enters invalid data, a subtle horizontal shake draws attention without causing anxiety.

- Use a short animation: 3-4 oscillations over 300-400ms
- Amplitude: 4-6px horizontal displacement maximum
- Combine with color change (border turns red) and error message appearance
- Apply to the specific field with the error, not the entire form
- Never shake on every keystroke — only on blur validation failure or submit

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
.input-error {
  animation: shake 0.3s ease-in-out;
  border-color: #B3261E;
}
```

### Success Checkmark

When a field passes validation, a green checkmark provides positive reinforcement and a sense of progress.

- Animate the checkmark drawing itself (SVG stroke-dashoffset animation) over 200-300ms
- Place the checkmark inside the field on the trailing edge, or immediately after the field
- Use green (#1B7D3A or similar) that passes 3:1 contrast ratio against the background
- Combine with a subtle border color change to green
- Do not show checkmarks prematurely — wait until the field is fully valid (e.g., complete email format)

### Real-Time Validation Timing

**When to validate:**

| Scenario | Trigger | Rationale |
|---|---|---|
| Required field, first visit | On blur (leaving field) | Don't interrupt typing |
| Required field, previously invalid | On keystroke (onChange) | Reward early — clear error ASAP |
| Email format | On blur | User may not have finished typing |
| Password strength | On keystroke | User needs real-time feedback to meet requirements |
| Username availability | On blur + debounce (300ms) | Requires server call; avoid excessive requests |
| Credit card number | On blur + Luhn check | Validate complete number, not partial |
| Phone number | On blur | User may be entering with different formats |
| Empty required fields | On form submit only | Don't flag fields the user hasn't reached yet |

### Character Counters

- Show remaining characters, not total typed: "47 / 280" or "233 remaining"
- Position below the input field, right-aligned
- Change color to warning (amber) at 80% capacity
- Change color to error (red) at 100% — prevent further input or show overflow indicator
- For text areas, update the counter on every keystroke
- Announce counter updates to screen readers using aria-live="polite" (debounced)

### Password Strength Meters

- Display a horizontal bar below the password field that fills proportionally with strength
- Use a 4-level scale: Weak (red), Fair (orange), Good (yellow-green), Strong (green)
- Update on every keystroke as the user types
- Show requirement checklist below the meter: 8+ characters, uppercase, number, symbol
- Check each requirement off with a green checkmark as it is met
- Use aria-describedby to associate the strength indicator with the password field
- Provide text label alongside color: "Strong" not just a green bar (for color-blind users)

### Auto-Formatting

Auto-formatting transforms raw user input into a readable, structured format as the user types.

**Credit Card Numbers:**
- Insert spaces every 4 digits: `4242 4242 4242 4242`
- Auto-detect card brand from first digits and display logo (Visa: 4xxx, Mastercard: 5xxx, Amex: 3xxx)
- Amex uses 4-6-5 grouping: `3782 822463 10005`
- Auto-advance cursor to next field (expiry) when card number is complete

**Phone Numbers:**
- Format based on detected country: US `(555) 123-4567`, UK `+44 7911 123456`
- Accept input in any format and normalize
- Use `type="tel"` to trigger numeric keyboard on mobile

**Dates:**
- Auto-insert separators: typing `03072026` becomes `03/07/2026`
- Prefer native date pickers on mobile; formatted text input on desktop
- Accept multiple formats and normalize (MM/DD/YYYY, DD/MM/YYYY based on locale)

**Currency:**
- Add currency symbol and thousand separators as user types
- Right-align currency values in input fields
- Auto-add decimal places on blur: `42` becomes `$42.00`

---

## 5. Anti-Patterns

### 1. Placeholder Text as Labels
**Problem:** Labels placed inside the input field as placeholder text disappear when the user starts typing. Users forget what data the field requires, especially in longer forms, when switching between fields, or when using autofill. Screen readers may not announce placeholders consistently.
**Fix:** Always use a visible, persistent label above or beside the field. Placeholders may supplement labels with example data but must never replace them. NNG has explicitly stated: "Placeholders in form fields are harmful."

### 2. Validation Only on Submit
**Problem:** Users fill out an entire form, click submit, and only then discover multiple errors. They must scroll to find and fix each error with no guidance on which fields failed. This is especially punishing on long forms.
**Fix:** Use the "reward early, punish late" pattern: validate on blur for first-visit fields, validate on keystroke for fields with existing errors. Combine inline validation with an error summary at the top of the form on submit.

### 3. Clearing Form Data on Error
**Problem:** When a form submission fails (client-side or server-side), all entered data is erased, forcing the user to re-enter everything from scratch. This is one of the most rage-inducing form experiences.
**Fix:** Always preserve user input on error. Store form state in component state or sessionStorage. Repopulate all fields after failed submission. Only clear sensitive fields (passwords) if required by security policy.

### 4. Unnecessary Required Fields
**Problem:** Marking fields as required when the data is not genuinely needed (e.g., phone number for a newsletter signup, company name for an individual account). Each required field adds friction and potential abandonment.
**Fix:** Apply the NNG EAS framework: Eliminate unnecessary fields first. Mark only genuinely required fields. Clearly label optional fields. Default to collecting minimal data and request additional information progressively.

### 5. CAPTCHA Overuse
**Problem:** CAPTCHAs (especially distorted text or image grid challenges) add significant friction, delay form completion, and are inaccessible to many users with visual or cognitive disabilities. Aggressive CAPTCHAs can block legitimate users.
**Fix:** Use invisible reCAPTCHA v3 or Cloudflare Turnstile (no user interaction required). Reserve visible CAPTCHAs for high-risk actions only (account creation, payment). Never use CAPTCHAs on login forms for returning users. Provide audio alternatives when visual CAPTCHAs are necessary.

### 6. Disabled Submit Buttons Without Explanation
**Problem:** The submit button is grayed out and unclickable, but the user cannot determine why. They scan the form for errors but find no error messages or indicators of what is incomplete.
**Fix:** Either keep the submit button always enabled and show errors on click, or if disabling it, show a tooltip/message explaining what is needed: "Complete all required fields to continue." Highlight incomplete required fields with a visual indicator.

### 7. Multi-Column Form Layouts
**Problem:** Forms laid out in multiple columns disrupt the natural top-to-bottom reading flow. Users may miss fields in the right column or fill fields in the wrong order. Baymard found 16% of e-commerce sites make this mistake.
**Fix:** Use single-column layout for all forms. The only exceptions are short, logically related field pairs (City + State, First Name + Last Name, Expiry + CVV) where the relationship is obvious and the fields fit naturally on one line.

### 8. Vague or Generic Error Messages
**Problem:** Messages like "Invalid input," "Error," or "Please fix the errors below" without specifying which field has what problem. 99% of sites do not adapt error messages to the specific issue (Baymard Institute).
**Fix:** Write error messages that (1) identify which field has the problem, (2) explain what went wrong specifically, and (3) tell the user how to fix it. Example: "Email must include an @ symbol and a domain (e.g., name@example.com)."

### 9. Auto-Advancing Focus Prematurely
**Problem:** Automatically moving focus to the next field when the current field reaches its maximum length. This breaks users who need to correct input, interferes with screen readers, and confuses users who did not expect the jump.
**Fix:** Auto-advance only for highly structured, universally understood sequences (credit card number to expiry, OTP code fields). Never auto-advance for general text inputs. Always allow the user to manually return to the previous field.

### 10. Using Dropdowns for Short Lists
**Problem:** A dropdown/select menu for 2-5 options requires two clicks (open menu, select option) and hides the options until clicked. For short lists, this adds unnecessary interaction cost.
**Fix:** Use radio buttons for 2-5 options (all visible at once, single click to select). Use segmented controls for 2-4 options on mobile. Reserve dropdowns for 6+ options. Use a searchable combobox/autocomplete for 15+ options.

### 11. Forcing Account Creation Before Checkout
**Problem:** Requiring users to create an account before they can complete a purchase. Stripe research shows forced account creation is "one of the fastest ways to lose a sale."
**Fix:** Always offer guest checkout. Offer account creation after order completion when friction cost is zero. Social login options (Google, Apple) reduce registration friction for users who want accounts.

### 12. Reset / Clear Form Buttons
**Problem:** A "Reset" or "Clear" button positioned next to the submit button. Users accidentally click it and lose all their entered data. NNG has warned against this pattern for over 15 years.
**Fix:** Remove reset buttons entirely. If a clear function is genuinely needed (rare), place it far from the submit button and require confirmation: "Are you sure you want to clear all fields?"

---

## 6. Accessibility Requirements

### Label Association

Every form input must have a programmatically associated label. This is the single most important form accessibility requirement.

```html
<!-- Explicit association (preferred) -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" />

<!-- Implicit association (wrapping) -->
<label>
  Email address
  <input type="email" name="email" />
</label>

<!-- For inputs without visible labels (e.g., search) -->
<input type="search" aria-label="Search products" />
```

- Use the `for`/`id` pattern (explicit association) as the primary method — it is the most robustly supported across all assistive technologies
- Never rely solely on `placeholder`, `title`, or `aria-describedby` as the accessible name
- Screen readers announce: "[Label text], [input type], [state]" — e.g., "Email address, edit text, required"
- Test with screen readers: VoiceOver (macOS/iOS), NVDA (Windows), TalkBack (Android)

### Error Announcement

Errors must be announced to assistive technology users, not just displayed visually.

```html
<label for="email">Email address *</label>
<input
  type="email"
  id="email"
  aria-required="true"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">
  Please enter a valid email address
</span>
```

- Use `aria-invalid="true"` on the input when validation fails
- Use `aria-describedby` to link the error message element to the input
- Use `role="alert"` or `aria-live="assertive"` on the error message container so screen readers announce the error immediately when it appears
- For error summaries at the top of the form, move focus to the summary on submit and include anchor links to each error field
- Remove `aria-invalid` and the error message when the user corrects the input

### Focus Management

```
[Form submission fails] →
[Focus moves to error summary or first error field] →
[User corrects error] →
[Focus remains in corrected field] →
[User tabs to next field naturally]
```

- On form submission with errors, move focus to either the error summary (if present) or the first field with an error
- On multi-step forms, move focus to the first field of the new step when advancing
- On modal/dialog forms, trap focus within the modal (no Tab escape to background content)
- On form completion, move focus to the success message or the next logical element
- Never remove focus from the current field during typing (no focus-stealing)

### Keyboard Navigation

- All form fields must be reachable and operable via keyboard alone
- Tab order must follow the visual order (use logical DOM order, not `tabindex` hacks)
- `Tab` moves forward through fields; `Shift+Tab` moves backward
- `Enter` should submit the form when focus is on a text input (native HTML behavior)
- `Space` toggles checkboxes and activates buttons
- `Arrow keys` navigate radio button groups, select options, and date pickers
- Custom components (date pickers, comboboxes, tag inputs) must implement ARIA widget patterns with full keyboard support
- Avoid `tabindex` values greater than 0 — they break natural tab order

### Form Instructions

```html
<!-- Required field indication -->
<label for="name">
  Full name <span aria-hidden="true">*</span>
  <span class="sr-only">(required)</span>
</label>
<input type="text" id="name" aria-required="true" />

<!-- Field with format instructions -->
<label for="phone">Phone number</label>
<input
  type="tel"
  id="phone"
  aria-describedby="phone-hint"
/>
<span id="phone-hint">Format: (555) 123-4567</span>

<!-- Group of related fields -->
<fieldset>
  <legend>Shipping address</legend>
  <label for="street">Street</label>
  <input type="text" id="street" autocomplete="street-address" />
  <!-- ... more address fields ... -->
</fieldset>
```

- Use `aria-required="true"` on required fields (supplements the visual asterisk)
- Use `<fieldset>` and `<legend>` to group related fields (address, payment details, radio groups)
- Use `aria-describedby` to link helper text and format hints to their input
- Provide form-level instructions before the form if the form has special requirements
- Mark both required and optional fields explicitly — Baymard testing found 32% of participants missed required fields when only optional fields were marked

### Color and Contrast

- Error states must not rely on color alone — use icons (warning triangle, X mark) alongside red borders/text
- Error text must meet 4.5:1 contrast ratio against the background (WCAG 1.4.3)
- Form field borders must meet 3:1 contrast ratio against adjacent colors (WCAG 1.4.11)
- Focus indicators must meet 3:1 contrast ratio and have sufficient size (WCAG 2.4.13)
- Success and error states should use icons and text labels, not just green/red colors (support for color-blind users)

---

## 7. Cross-Platform Adaptation

### iOS

**Native Pickers:**
- Use `UIDatePicker` with `.compact` style for date fields in space-constrained layouts — it opens a modal calendar view on tap
- Use `.inline` style for date pickers in settings or filters where the calendar should be always visible
- Use `.wheels` style only when it matches the mental model (time selection, slot pickers)
- Use `UIMenu` (pull-down buttons) for lists of 2-7 items instead of picker wheels
- For long lists (countries, currencies), use a searchable table view, not a picker wheel

**Keyboard Types:**
- `.emailAddress` — includes `@` and `.` prominently
- `.phonePad` — numeric-only with `+`, `*`, `#`
- `.numberPad` — 0-9 only (no decimal, no negative)
- `.decimalPad` — 0-9 with decimal point
- `.URL` — includes `/`, `.`, `.com` button
- `.asciiCapable` — prevents emoji keyboard
- Set `textContentType` for autofill: `.emailAddress`, `.password`, `.newPassword`, `.oneTimeCode`, `.fullName`, `.streetAddressLine1`, etc.

**Input Accessories:**
- Add a toolbar above the keyboard with "Previous" / "Next" / "Done" buttons for multi-field forms
- "Done" button dismisses the keyboard (critical for `.numberPad` which lacks a return key)
- Use `inputAccessoryView` for contextual actions (paste, scan, clear)
- Support password autofill with `textContentType: .password` and associated domains

**Platform Conventions:**
- Minimum touch target: 44x44 points (Apple HIG)
- Use `UITextField` and `UITextView` for standard text entry
- Support Dynamic Type: form labels and inputs must scale with the user's preferred text size
- Support Smart Invert and Dark Mode for all form components

### Android

**Material Text Fields:**
- **Filled variant:** Has a solid background fill and bottom-line indicator. Better for high-density forms and settings. Visually heavier, stands out on white backgrounds.
- **Outlined variant:** Has a border stroke around the field. Better for minimal designs and forms where fields need clear boundaries. Lighter visual weight.
- Both variants support floating labels that animate from placeholder to top-label on focus
- Both support leading/trailing icons, prefix/suffix text, helper text, error text, and character counter
- Use `TextInputLayout` wrapping `TextInputEditText` for proper Material theming

**Keyboard Types:**
- `inputType="textEmailAddress"` — email keyboard with `@`
- `inputType="phone"` — phone dialer layout
- `inputType="number"` — numeric keyboard
- `inputType="numberDecimal"` — numeric with decimal
- `inputType="textPassword"` — obscured input with visibility toggle
- `inputType="textUri"` — URL keyboard with `/` and `.com`
- Set `android:autofillHints` for autofill: `emailAddress`, `password`, `postalCode`, `creditCardNumber`, etc.

**Platform Conventions:**
- Minimum touch target: 48x48 dp (Material Design)
- Use `TextInputLayout` for consistent label animation, error display, and helper text
- Support edge-to-edge layouts — form fields should not be obscured by system bars
- Handle `windowSoftInputMode` to ensure fields are visible when the keyboard appears (`adjustResize` or `adjustPan`)

### Web

**HTML5 Input Types:**
```html
<input type="email" />      <!-- Email keyboard on mobile, built-in validation -->
<input type="tel" />        <!-- Phone keyboard on mobile -->
<input type="url" />        <!-- URL keyboard on mobile -->
<input type="number" />     <!-- Numeric keyboard, spinner controls -->
<input type="search" />     <!-- Search keyboard with "Go" button, clear icon -->
<input type="date" />       <!-- Native date picker on mobile/modern browsers -->
<input type="time" />       <!-- Native time picker -->
<input type="password" />   <!-- Obscured input, password manager integration -->
<input type="range" />      <!-- Slider control -->
<input type="color" />      <!-- Color picker -->
```

**Autocomplete Attributes:**
```html
<!-- Identity -->
<input autocomplete="name" />                <!-- Full name -->
<input autocomplete="given-name" />          <!-- First name -->
<input autocomplete="family-name" />         <!-- Last name -->
<input autocomplete="email" />               <!-- Email address -->
<input autocomplete="tel" />                 <!-- Phone number -->
<input autocomplete="bday" />                <!-- Birthday -->

<!-- Address -->
<input autocomplete="street-address" />      <!-- Street line -->
<input autocomplete="address-level2" />      <!-- City -->
<input autocomplete="address-level1" />      <!-- State/Province -->
<input autocomplete="postal-code" />         <!-- Zip/Postal code -->
<input autocomplete="country" />             <!-- Country -->

<!-- Payment -->
<input autocomplete="cc-name" />             <!-- Cardholder name -->
<input autocomplete="cc-number" />           <!-- Card number -->
<input autocomplete="cc-exp" />              <!-- Expiry (MM/YY) -->
<input autocomplete="cc-csc" />              <!-- CVV/CVC -->

<!-- Authentication -->
<input autocomplete="username" />            <!-- Username -->
<input autocomplete="current-password" />    <!-- Existing password -->
<input autocomplete="new-password" />        <!-- New password (signup/change) -->
<input autocomplete="one-time-code" />       <!-- OTP/2FA code -->
```

Proper `autocomplete` attributes enable browser autofill and password managers, dramatically reducing form completion time. They also fulfill WCAG 2.1 SC 1.3.5 (Identify Input Purpose), which is required for AA conformance.

**Autofill Best Practices:**
- Always use standard `autocomplete` values — they map to browser and OS autofill systems
- Use `autocomplete="off"` only for truly sensitive fields where autofill is a security risk (not for login forms — browsers override this for password fields)
- Group address fields in a single `<fieldset>` so autofill can populate them as a unit
- Test autofill in Chrome, Safari, Firefox, and Edge — each has different autofill behaviors
- Use `autocomplete="new-password"` on password creation fields so browsers offer to generate and save passwords

**Responsive Form Design:**
- Single-column layout on all screen widths below 768px
- Labels above fields on mobile; labels may be inline on wide desktop layouts
- Touch targets: minimum 44x44 CSS pixels (WCAG 2.5.8 specifies 24x24 minimum, but 44px is the best practice per Apple and Google guidelines)
- Full-width inputs on mobile; constrained width (max 500-600px) on desktop
- Ensure the keyboard does not obscure the active input (use `scrollIntoView` or CSS `scroll-margin`)

---

## 8. Decision Tree

### Single Page vs. Multi-Step

```
How many fields does the form have?
├── 1-8 fields
│   └── Use single-page form
├── 9-15 fields
│   ├── Can fields be logically grouped into 2-3 sections?
│   │   ├── Yes → Use multi-step form (2-3 steps)
│   │   └── No  → Use single-page with section dividers
│   └── Is the form on mobile?
│       ├── Yes → Prefer multi-step (reduces scroll)
│       └── No  → Single-page with sections is acceptable
├── 16-30 fields
│   └── Use multi-step form (3-5 steps, 5-7 fields each)
└── 30+ fields
    └── Use multi-step form with save-and-resume capability
        └── Consider breaking into multiple separate forms/sessions
```

### When to Auto-Save

```
What type of data is being edited?
├── Content creation (documents, posts, notes)
│   └── Auto-save (user expects it, data loss is costly)
├── Settings / preferences / toggles
│   └── Auto-save per control (imperative controls)
├── Profile information
│   ├── Non-sensitive fields (name, bio, avatar)
│   │   └── Auto-save is acceptable
│   └── Sensitive fields (email, password, payment)
│       └── Explicit save with confirmation
├── Financial transactions (orders, payments, transfers)
│   └── Always explicit save/submit with confirmation
├── Multi-step wizards
│   └── Auto-save on step transition; explicit submit on final step
├── Forms with validation dependencies
│   └── Explicit save (auto-save may persist invalid states)
└── Collaborative editing (multiple users)
    └── Auto-save with conflict resolution (CRDT/OT)
```

**Rule of thumb:** If the change has financial, security, or privacy implications, require explicit save. If the change is recoverable and low-risk, auto-save. Never mix auto-save and explicit save patterns within the same form.

### Inline vs. Modal Editing

```
Where does the edit happen?
├── User is viewing a list/table of items
│   ├── Editing 1-3 fields per item → Inline editing
│   └── Editing 4+ fields per item → Modal or detail page
├── User is viewing a detail/profile page
│   ├── Fields are independent (each can be saved alone)
│   │   └── Inline editing (click to edit, auto-save)
│   └── Fields are interdependent (must be saved together)
│       └── Modal or edit mode with explicit save
├── Edit is destructive or irreversible
│   └── Modal with confirmation dialog
├── Edit requires context not visible inline
│   └── Modal or slide-over panel
└── User is on mobile
    ├── Simple field edit → Inline with full-width input
    └── Complex edit → Full-screen modal (not overlay)
```

### Input Type Selection

```
What data type is being collected?
├── Free text (name, comment, description)
│   ├── Short (< 100 chars) → <input type="text">
│   └── Long (100+ chars) → <textarea> with auto-resize
├── Email → <input type="email">
├── Phone → <input type="tel"> with auto-formatting
├── URL → <input type="url">
├── Number
│   ├── Precise value needed → <input type="text" inputmode="numeric">
│   │   (type="number" has UX issues with spinners and scroll hijacking)
│   └── Approximate value → <input type="range"> (slider)
├── Date
│   ├── Mobile → Native date picker (<input type="date">)
│   └── Desktop → Custom date picker or formatted text input
├── Password → <input type="password"> with visibility toggle
├── Selection from options
│   ├── 2-5 options → Radio buttons (single) or checkboxes (multi)
│   ├── 6-15 options → Dropdown select or combobox
│   └── 15+ options → Searchable combobox / autocomplete
├── Boolean → Checkbox (forms) or toggle switch (settings)
├── File → <input type="file"> with drag-and-drop zone
└── Color → <input type="color"> or custom color picker
```

---

## Quick Reference Checklist

Use this checklist when designing or reviewing any form:

### Structure and Layout
- [ ] Single-column layout (no multi-column field arrangements)
- [ ] Labels positioned above fields (not inside as placeholders)
- [ ] Logical field grouping with fieldsets and visual section breaks
- [ ] Field width hints at expected input length
- [ ] Action buttons at bottom-left, primary action visually prominent

### Fields and Inputs
- [ ] Only genuinely required fields are marked required; optional fields are labeled
- [ ] Correct HTML5 input types used (email, tel, url, number, date)
- [ ] Autocomplete attributes set for all identity, address, and payment fields
- [ ] Appropriate keyboard type triggers on mobile (numeric pad for phone, email keyboard for email)
- [ ] Dropdowns replaced with radio buttons for 2-5 options

### Validation and Errors
- [ ] "Reward early, punish late" validation pattern implemented
- [ ] Error messages are specific, actionable, and positioned inline below the field
- [ ] Form data is never cleared on validation error
- [ ] Empty required fields validated on submit only (not prematurely on blur)
- [ ] Server errors display user-friendly messages and preserve all input

### Accessibility
- [ ] Every input has a programmatic label (for/id association or aria-label)
- [ ] Error messages linked via aria-describedby; inputs marked aria-invalid on error
- [ ] Focus moves to first error field or error summary on failed submission
- [ ] Full keyboard operability (Tab, Shift+Tab, Enter, Space, Arrow keys)
- [ ] Color is not the sole indicator of state (icons and text supplement color)
- [ ] Touch targets are minimum 44x44px (48x48dp on Android)

### Multi-Step Forms
- [ ] Progress indicator visible (step count, progress bar, or percentage)
- [ ] Data auto-saved on each step transition
- [ ] Back navigation preserves all previously entered data
- [ ] Browser back button navigates to previous step (not away from form)

---

## Sources and References

Research and guidelines referenced in this module:

- Baymard Institute — Checkout UX research, inline form validation studies, form field benchmarks (baymard.com)
- Nielsen Norman Group — Top 10 form design recommendations, EAS framework, placeholder text research, required fields guidelines (nngroup.com)
- Material Design 3 — Text field components, filled vs outlined variants, input interaction guidelines (m3.material.io)
- Smashing Magazine — Complete guide to inline validation UX, "reward early, punish late" pattern (smashingmagazine.com)
- Apple Human Interface Guidelines — Pickers, inputs, keyboard types, touch target sizing (developer.apple.com)
- W3C WAI — WCAG 2.2 form accessibility, multi-page form tutorials, ARIA techniques (w3.org)
- Stripe — Checkout UI design strategies, payment form optimization, mobile checkout best practices (stripe.com)
- UK Government Digital Service — GOV.UK Design System form patterns (design-system.service.gov.uk)
- Smart Interface Design Patterns — Inline validation UX analysis (smart-interface-design-patterns.com)
