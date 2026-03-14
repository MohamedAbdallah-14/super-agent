# Microcopy -- Content Foundation Module

> **Category:** Content Foundation
> **Applies to:** All platforms -- Web, iOS, Android, Desktop
> **Last updated:** 2026-03-14
> **Sources:** Nielsen Norman Group, Google Material Writing Guidelines, Apple HIG, Microsoft Writing Style Guide, GOV.UK Content Design Manual, Torrey Podmajersky (Strategic Writing for UX)

Microcopy is the small text that guides users through an interface: button labels,
error messages, tooltips, empty states, confirmation dialogs, and placeholder text.
It is the most read and least reviewed writing in any product. Bad microcopy creates
support tickets. Good microcopy prevents them.

---

## 1. Button Labels

### 1.1 Verb-First Pattern

Every button label starts with a verb that describes exactly what happens when the
user clicks. The user should be able to predict the outcome from the label alone.

**Pattern:** `[Verb]` or `[Verb] + [Object]`

| Do                     | Don't               | Why                                          |
|------------------------|----------------------|----------------------------------------------|
| Save changes           | OK                   | "OK" says nothing about the action           |
| Delete account         | Yes                  | "Yes" requires reading the question above    |
| Send invitation        | Submit               | "Submit" is vague -- submit what?            |
| Export as CSV           | Go                   | "Go" is meaningless without context          |
| Add to cart            | Continue             | "Continue" doesn't say where                 |
| Create project         | Done                 | "Done" implies completion, not creation      |
| Sign in                | Log in               | Either is fine -- pick one and be consistent |

**Rules:**

1. **Use specific verbs over generic ones.** "Save," "Send," "Create," "Delete,"
   "Export" are specific. "Submit," "Process," "Execute," "OK" are generic.
2. **Include the object when the action is destructive or ambiguous.** "Delete" alone
   is ambiguous. "Delete account" is unambiguous.
3. **Match the verb to the user's mental model.** If the user thinks they are
   "publishing," the button says "Publish" -- not "Save" or "Submit."
4. **Limit to 1-3 words.** If you need more than 3 words, the action is probably too
   complex for a single button.

### 1.2 Primary vs Secondary Actions

| Position   | Purpose                    | Label pattern              | Example                    |
|------------|----------------------------|----------------------------|----------------------------|
| Primary    | The action the user came for | Verb + Object             | Save changes               |
| Secondary  | Alternative or escape      | Verb (often "Cancel")      | Cancel, Go back, Skip      |
| Tertiary   | Less common action         | Text link or subtle button | Learn more, Reset defaults |

**Rules:**

1. **The primary action label must never be "OK" or "Yes."** These words carry no
   information without the surrounding context, which users don't always read.
2. **Pair destructive primaries with safe secondaries.** "Delete account" paired with
   "Keep account" -- not "Delete account" paired with "Cancel."
3. **Avoid double-negative pairs.** "Don't save / Cancel" forces the user to parse
   two negatives. Use "Discard / Keep editing" instead.

### 1.3 Platform Conventions

| Platform | Typical casing       | Primary position | Notes                         |
|----------|----------------------|------------------|-------------------------------|
| iOS      | Title Case           | Right side       | Apple uses noun-style in some |
| Android  | UPPERCASE or Sentence| Right side       | M3 uses all-caps by default   |
| Web      | Sentence case        | Right side       | GOV.UK and most SaaS products|
| macOS    | Title Case           | Right side       | "Save" not "SAVE"            |
| Windows  | Sentence case        | Right side       | Microsoft style guide (2023+) |

---

## 2. Error Messages

### 2.1 The What / Why / How Framework

Every error message answers three questions:

1. **What** happened? (State the problem.)
2. **Why** did it happen? (Explain the cause -- if the user can understand it.)
3. **How** do they fix it? (Give a concrete next step.)

**Examples:**

```
BAD:  "Error 422"
GOOD: "Email address is already in use. Try signing in instead, or use a different email."

BAD:  "Invalid input"
GOOD: "Phone number must be 10 digits. You entered 8."

BAD:  "Something went wrong"
GOOD: "We couldn't save your changes because the connection was lost. Check your internet and try again."

BAD:  "Operation failed"
GOOD: "This file is too large to upload. The maximum size is 25 MB. Your file is 38 MB."
```

### 2.2 Error Message Rules

1. **Never show raw error codes or stack traces to end users.** Log them. Show a
   human sentence.
2. **Never blame the user.** Say "Password must be at least 8 characters" -- not
   "You entered an invalid password."
3. **Use the field name, not "this field."** Say "Email address is required" -- not
   "This field is required."
4. **Be specific about constraints.** Say "Username must be 3-20 characters,
   letters and numbers only" -- not "Invalid username."
5. **Offer a recovery path.** If the user can fix it, say how. If they cannot,
   say who to contact.
6. **Place inline errors next to the field, not in a banner.** Banners at the top
   of the form force the user to scroll up, find the error, scroll back down, and
   fix it.
7. **Persist the error until the user fixes it.** Do not auto-dismiss error messages
   on a timer. The user may not have read it yet.

### 2.3 Tone Calibration by Severity

| Severity    | Tone               | Example                                                  |
|-------------|---------------------|----------------------------------------------------------|
| Validation  | Neutral, helpful    | "Enter a valid email address, like name@example.com."    |
| System error| Calm, empathetic    | "Something went wrong on our end. Try again in a moment."|
| Data loss   | Direct, urgent      | "Your draft was not saved. Copy your text before leaving."|
| Security    | Serious, no humor   | "Your session has expired. Sign in again to continue."   |

**Never use humor in error messages.** The user is frustrated. A joke makes it worse.
("Oops! Looks like our hamsters stopped running!" is not funny when the user just
lost 30 minutes of work.)

---

## 3. Tooltips

### 3.1 When to Use Tooltips

| Use a tooltip when...                          | Don't use a tooltip when...                    |
|------------------------------------------------|------------------------------------------------|
| An icon has no visible label                   | The information is essential to complete a task |
| A feature needs brief clarification            | The content requires more than 1-2 sentences   |
| The label is intentionally brief               | The user needs to interact with the content     |
| A truncated value needs its full form shown    | Touch devices are the primary platform          |

### 3.2 Tooltip Writing Rules

1. **Maximum 150 characters.** If you need more, use an inline hint or a help panel.
2. **No period at the end of single-sentence tooltips.** Tooltips are labels, not
   paragraphs.
3. **Start with a verb or noun, not "This is..." or "Click here to..."**
   - Do: "Duplicate this project and all its settings"
   - Don't: "This button lets you duplicate the project"
4. **Never put critical information only in a tooltip.** Tooltips are invisible on
   touch devices and require precise hover targeting.
5. **Avoid nesting actions inside tooltips.** If the tooltip says "Click here to learn
   more," the link should be visible in the interface itself.

---

## 4. Empty States

### 4.1 Empty State Formula

Every empty state has three elements:

1. **Illustration or icon** (visual) -- optional but recommended.
2. **Explanation** (what this area will contain when populated).
3. **Action** (what the user should do to populate it).

**Examples:**

```
WEAK:  "No results found."
STRONG: "No projects yet. Create your first project to get started."
        [Create project]

WEAK:  "Nothing here."
STRONG: "No notifications. When teammates mention you or update your tasks,
         you'll see them here."

WEAK:  "0 items"
STRONG: "Your cart is empty. Browse our collection to find something you'll love."
        [Start shopping]
```

### 4.2 Empty State Types

| Type              | Cause                        | Copy tone                    | Action                     |
|-------------------|------------------------------|------------------------------|----------------------------|
| First-use empty   | User hasn't added anything   | Encouraging, instructive     | CTA to create first item   |
| No results        | Search/filter returned 0     | Helpful, suggestive          | Suggest broadening filters |
| Cleared state     | User deleted everything      | Neutral, confirming          | CTA to add new items       |
| Error empty       | Data failed to load          | Empathetic, recovery-focused | Retry button               |
| Permission empty  | User lacks access            | Clear, non-blaming           | Request access or contact  |

### 4.3 Rules

1. **Never show a blank screen.** Every empty state needs at least a text explanation.
2. **Use the empty state to teach.** First-use empties are onboarding opportunities.
3. **Distinguish "no results" from "error."** "We found nothing" is different from
   "We couldn't search right now."
4. **Match the illustration to the product's visual language.** A whimsical cartoon
   in a banking app undermines trust.

---

## 5. Calls to Action (CTAs)

### 5.1 CTA Hierarchy

| Level    | Visual treatment       | Usage                                  | Example              |
|----------|------------------------|----------------------------------------|----------------------|
| Primary  | Filled button, bold    | One per screen or section              | Start free trial     |
| Secondary| Outlined or ghost      | Supporting alternative                 | View pricing         |
| Tertiary | Text link              | Low-priority or navigational           | Learn more           |

### 5.2 Writing Rules

1. **Lead with the benefit, not the mechanism.** "Start free trial" beats "Click here
   to register for a trial."
2. **Create urgency without lying.** "Get 20% off today" is fine if the offer is real.
   "Last chance!" on a permanent page is dishonest.
3. **One primary CTA per viewport.** Multiple competing primaries dilute attention.
   Research (CXL Institute) shows that reducing a page from 3 CTAs to 1 increased
   conversion by 28%.
4. **Avoid "Click here" and "Learn more" as standalone CTAs.** They fail accessibility
   (screen readers list links out of context) and fail clarity (learn more about what?).
   Use "Read the migration guide" or "View pricing details."

---

## 6. Placeholder Text

### 6.1 Input Placeholders

Placeholder text sits inside a form field and disappears when the user types.

**Rules:**

1. **Never use placeholder text as the only label.** When the user starts typing, the
   label vanishes and they forget what the field is for. Always pair with a visible
   label above the field.
2. **Use placeholders to show format, not purpose.** The label says "Phone number."
   The placeholder shows "(555) 123-4567."
3. **Keep placeholders short.** They are constrained by field width. On mobile, a
   placeholder longer than 20 characters may be truncated.
4. **Ensure sufficient contrast.** WCAG requires placeholder text to meet 4.5:1
   contrast ratio against the background. Many default placeholder styles fail this.
   Use at least #767676 on white (#ffffff).

**Pattern:**

| Field label        | Placeholder              | Why                                     |
|--------------------|--------------------------|-----------------------------------------|
| Email address      | name@example.com         | Shows expected format                   |
| Phone number       | (555) 123-4567           | Shows expected format with area code    |
| Search             | Search by name or ID     | Clarifies what's searchable             |
| Password           | (no placeholder)         | Format hints go below the field         |
| Description        | (no placeholder)         | Textarea placeholders are rarely read   |

---

## 7. Confirmation Dialogs

### 7.1 When to Confirm

Use a confirmation dialog only for:

1. **Destructive actions** that cannot be undone (delete account, remove collaborator).
2. **Significant actions** that change state in ways users may not intend (publish to
   production, send to 10,000 recipients).
3. **Actions with external consequences** (charge a credit card, send an email).

**Do not confirm:** saving, navigation, closing non-dirty forms, toggling settings
that can be toggled back.

### 7.2 Confirmation Dialog Formula

```
Title:   [Verb] [object]?
Body:    [Consequence of this action, in plain language.]
Primary: [Same verb as title]
Secondary: Cancel
```

**Examples:**

```
Title:   Delete this project?
Body:    All files, comments, and history will be permanently removed.
         This cannot be undone.
Primary: Delete project
Secondary: Cancel

Title:   Publish to production?
Body:    This version will replace the current live site immediately.
         2,340 users will see the changes.
Primary: Publish
Secondary: Keep as draft

Title:   Remove Alex from the team?
Body:    Alex will lose access to all projects. Their existing work will remain.
Primary: Remove Alex
Secondary: Cancel
```

### 7.3 Rules

1. **The title must state the action, not ask a generic question.** "Delete this
   project?" -- not "Are you sure?"
2. **The body must state the consequence.** Users need to understand what will happen,
   not just confirm that they clicked a button.
3. **The primary button must match the title verb.** If the title says "Delete," the
   button says "Delete" -- not "OK" or "Yes."
4. **Add a friction step for irreversible high-stakes actions.** Require typing the
   project name to confirm deletion. This prevents accidental confirms.
5. **Never auto-focus the destructive button.** Focus the safe option (Cancel) so
   keyboard users don't accidentally confirm.

---

## 8. Platform-Specific Constraints

### 8.1 Character Limits

| Element                | iOS         | Android (M3)| Web           | Notes                    |
|------------------------|-------------|-------------|---------------|--------------------------|
| Push notification title| 50 chars    | 65 chars    | 50 chars (PWA)| Truncated with ellipsis  |
| Push notification body | 178 chars   | 240 chars   | 120 chars     | Varies by device/OS      |
| Button label           | No hard cap | No hard cap | No hard cap   | Aim for 1-3 words        |
| Toast / snackbar       | 2 lines max | 2 lines max | 1-2 lines     | Auto-dismiss after 4-10s |
| Tab bar label (iOS)    | ~10 chars   | ~12 chars   | N/A           | Single word preferred    |
| Page title (browser)   | N/A         | N/A         | ~55-60 chars  | After that, truncated    |
| Meta description       | N/A         | N/A         | ~155 chars    | Google truncates beyond  |
| Alt text               | No limit    | No limit    | No limit      | Aim for 1-2 sentences   |

### 8.2 Truncation Strategies

When text exceeds available space, choose a strategy based on information priority:

| Strategy            | Implementation              | When to use                         |
|---------------------|-----------------------------|-------------------------------------|
| Ellipsis (end)      | `text-overflow: ellipsis`   | Names, titles, single-line labels   |
| Ellipsis (middle)   | Custom logic needed         | File paths, URLs, email addresses   |
| Line clamp          | `-webkit-line-clamp: 2`     | Descriptions, previews, card text   |
| Fade out            | Gradient overlay            | Content teasers, expandable areas   |
| "Show more" toggle  | Expand/collapse             | Long descriptions, bios             |
| Abbreviation        | Content-level shortening    | "3 min" vs "3 minutes"             |

**Rules:**

1. **Always provide access to the full text.** Tooltip on hover, "Show more" on click,
   or a detail view.
2. **Never truncate in the middle of a word.** Truncate at word boundaries.
3. **Account for locale length variance.** German text is typically 30% longer than
   English. A label that fits in English may truncate in German. Design with 40%
   padding for translated strings.

---

## 9. Common Mistakes in AI-Generated Microcopy

### 9.1 Overly Verbose Labels

**The problem:** AI tends to generate complete sentences where a 2-word label suffices.
"Click this button to save your current changes" instead of "Save changes."

**How to fix:** Strip to verb + object. Read the label aloud. If it sounds like a
sentence, it's too long for a button.

### 9.2 Generic Error Messages

**The problem:** AI defaults to "Something went wrong" or "An error occurred" without
specifics. These messages provide zero diagnostic value to the user.

**How to fix:** Apply the What/Why/How framework. If the AI doesn't know the specific
error, template it: "We couldn't [action] because [reason]. [Recovery step]."

### 9.3 Inconsistent Terminology

**The problem:** AI uses "sign in," "log in," "sign on," and "authenticate" in the same
interface. Each variation makes users wonder if they mean different things.

**How to fix:** Maintain a term list (see `terminology-governance.md`). Choose one term
per concept and enforce it in prompts, linting rules, and review checklists.

### 9.4 Placeholder-as-Label Antipattern

**The problem:** AI generates forms with placeholder text but no visible labels. When the
user clicks a field, the placeholder vanishes and they lose context.

**How to fix:** Always pair placeholders with persistent visible labels. Use floating
labels (the label animates above the field on focus) if vertical space is tight.

### 9.5 Tone Mismatches

**The problem:** AI applies a cheerful, casual tone uniformly -- including error states
and destructive actions. "Oops! We deleted your account!" is inappropriate.

**How to fix:** Calibrate tone to severity. Validation errors are neutral. System errors
are calm. Destructive actions are serious.

---

## 10. Quick Reference Checklist

### Buttons
- [ ] **Label starts with a verb** (Save, Delete, Send, Create)
- [ ] **Label is 1-3 words**
- [ ] **Destructive buttons include the object** (Delete account, not just Delete)
- [ ] **Primary action is never "OK" or "Yes"**
- [ ] **No double-negative button pairs** (Don't save / Cancel)

### Error Messages
- [ ] **Answers What / Why / How**
- [ ] **Names the specific field** (not "this field")
- [ ] **States the constraint** (not just "invalid")
- [ ] **Placed inline next to the field**
- [ ] **Persists until fixed** (no auto-dismiss)
- [ ] **No raw error codes or stack traces**

### Empty States
- [ ] **Explains what will appear here when populated**
- [ ] **Includes a CTA to populate it** (for first-use empties)
- [ ] **Distinguishes "no results" from "error"**
- [ ] **Never shows a blank screen**

### Tooltips
- [ ] **150 characters maximum**
- [ ] **No critical information tooltip-only** (fails on touch)
- [ ] **Starts with a verb or noun** (not "This is...")

### Confirmation Dialogs
- [ ] **Title states the action** (not "Are you sure?")
- [ ] **Body states the consequence**
- [ ] **Primary button matches the title verb**
- [ ] **Focus defaults to the safe option**

### Placeholders
- [ ] **Visible label is always present above the field**
- [ ] **Shows format example, not purpose**
- [ ] **Meets 4.5:1 contrast ratio**

---

**Sources:**

- [Nielsen Norman Group -- Error Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [Nielsen Norman Group -- Placeholders in Form Fields Are Harmful](https://www.nngroup.com/articles/form-design-placeholders/)
- [Nielsen Norman Group -- Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/)
- [Material Design 3 -- Writing](https://m3.material.io/foundations/content-design/style-guide)
- [Apple HIG -- Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [GOV.UK Content Design Manual](https://www.gov.uk/guidance/content-design)
- [Torrey Podmajersky -- Strategic Writing for UX (O'Reilly)](https://www.oreilly.com/library/view/strategic-writing-for/9781492049395/)
- [CXL Institute -- CTA Research](https://cxl.com/blog/call-to-action/)
