# State Copy Patterns

> **Module Type:** Pattern
> **Domain:** Content -- UI State Communication
> **Authoritative Sources:** Material Design 3, Apple HIG, Nielsen Norman Group, Shopify Polaris, Atlassian Design System, Google Developer Documentation Style Guide

---

## Quick Reference Checklist

1. Every state has a headline, explanation, and next action
2. Error messages explain what went wrong AND how to fix it
3. Never use technical jargon in user-facing copy (no "500", "null", "exception")
4. Loading copy sets expectations: what is loading and roughly how long
5. Empty states distinguish first-time from no-results from error-empty
6. Success messages confirm what happened, not just "Success!"
7. Destructive confirmations name the action and consequences explicitly
8. Permission denied copy explains why AND how to get access
9. Offline copy tells users what they can still do
10. Timeout/retry copy offers an alternative path, not just "Try again"
11. All state copy is concise: headlines under 8 words, body under 30 words
12. Tone matches severity: neutral for info, warm for success, direct for errors
13. Never blame the user; use passive voice for errors when appropriate
14. Include the object name in confirmations ("Project 'Atlas' was deleted")
15. First-run copy focuses on value, not features

---

## 1. Loading States

Loading copy bridges the gap between action and result. It reassures users that the system is working and sets expectations for wait time.

### 1.1 Skeleton / Shimmer States

Skeleton screens typically need no copy -- the visual placeholder communicates "content is coming." However, when a skeleton persists beyond 3 seconds, supplement with a status message.

| Scenario | Copy |
|----------|------|
| Initial page load | (No copy -- skeleton alone is sufficient under 3s) |
| Skeleton persists 3-5s | "Loading your dashboard..." |
| Skeleton persists 5-10s | "Still loading. This might take a moment." |
| Section-level skeleton | "Loading recent activity..." |

### 1.2 Progress Indicators

For determinate operations where percentage is known.

| Scenario | Copy |
|----------|------|
| File upload | "Uploading 'quarterly-report.pdf'... 45%" |
| Data export | "Exporting 1,247 records... 72%" |
| Installation | "Installing updates... 3 of 5 complete" |
| Migration | "Migrating your data. This may take a few minutes." |

### 1.3 Spinner / Indeterminate States

| Scenario | Copy |
|----------|------|
| Saving | "Saving changes..." |
| Searching | "Searching..." |
| Processing payment | "Processing your payment. Please don't close this page." |
| Generating report | "Generating your report. This usually takes 10-20 seconds." |
| Connecting | "Connecting to server..." |

**Pattern:** "[Verb]ing [object]..." -- use the present participle of the actual operation, not generic "Loading."

### 1.4 Background Processing

When the user can continue working while something processes.

| Scenario | Copy |
|----------|------|
| File processing | "Your file is being processed. We'll notify you when it's ready." |
| Import | "Import in progress. You can keep working -- we'll send an email when it's done." |
| Build/deploy | "Deploying to production. You'll see the status update in your activity feed." |

---

## 2. Empty States

Empty states are opportunities -- they explain absence and guide users toward action. Never show a blank screen or raw "No data."

### 2.1 First-Time / First-Use

The user has never created content in this area. Focus on value proposition and a clear call to action.

| Context | Headline | Body | CTA |
|---------|----------|------|-----|
| Projects list | "Start your first project" | "Projects help you organize work and track progress across your team." | "Create project" |
| Contacts | "Add your first contact" | "Keep track of the people you work with. Import from a file or add them one by one." | "Add contact" / "Import" |
| Dashboard widgets | "Customize your dashboard" | "Add widgets to see the information that matters most to you." | "Add widget" |
| API keys | "Create an API key" | "API keys let you connect external services to your account." | "Generate key" |
| Notifications | "No notifications yet" | "When something needs your attention, it will appear here." | (None -- passive) |

### 2.2 No-Results (Search / Filter)

The user searched or filtered and nothing matched. Echo their query and suggest alternatives.

| Context | Copy |
|---------|------|
| Search | **"No results for '[query]'"** / "Check your spelling or try a broader search term." |
| Filter combination | **"No items match these filters"** / "Try removing some filters or adjusting the date range." |
| Category browse | **"Nothing in [category] yet"** / "Be the first to add something, or explore other categories." |
| Advanced search | **"No matches found"** / "Try fewer search criteria. You can also search all fields instead of specific ones." |

**Pattern:** Echo the query or filter state so the user knows the system understood their intent. Offer 2-3 concrete alternative actions.

### 2.3 Error-Empty

Content should exist but failed to load.

| Context | Copy |
|---------|------|
| Feed failed to load | **"Couldn't load your feed"** / "Something went wrong on our end. Try refreshing the page." / CTA: "Refresh" |
| List fetch error | **"Unable to load [items]"** / "Check your connection and try again." / CTA: "Try again" |
| Widget data error | **"This widget couldn't load"** / "The data source may be temporarily unavailable." / CTA: "Retry" / "Remove widget" |

### 2.4 Cleared / All-Done

The user has completed or cleared all items. Celebrate the achievement.

| Context | Copy |
|---------|------|
| Inbox zero | **"You're all caught up"** / "No new messages. Enjoy the calm." |
| Task list complete | **"All tasks done"** / "Nice work. Take a break or plan your next sprint." |
| Review queue empty | **"No items to review"** / "Everything has been reviewed. Check back later." |

---

## 3. Error States

Error copy must answer three questions: What happened? Why? What can the user do?

### 3.1 Network Errors

| Scenario | Headline | Body | CTA |
|----------|----------|------|-----|
| No connection | "You're offline" | "Check your internet connection and try again." | "Try again" |
| Connection lost mid-action | "Connection lost" | "Your changes haven't been saved. We'll try again when you're back online." | "Retry" |
| Slow connection | "Taking longer than expected" | "Your connection seems slow. You can wait or try again later." | "Keep waiting" / "Cancel" |
| Server unreachable | "Can't reach the server" | "This is usually temporary. Try again in a few moments." | "Try again" |

### 3.2 Validation Errors

Validation errors appear inline, adjacent to the field. They should state the requirement, not just the violation.

| Field | Bad | Good |
|-------|-----|------|
| Email | "Invalid email" | "Enter an email address like name@example.com" |
| Password | "Password too short" | "Password must be at least 8 characters" |
| Phone | "Invalid phone number" | "Enter a phone number with country code, like +1 555 123 4567" |
| Date | "Invalid date" | "Enter a date in the format MM/DD/YYYY" |
| Required field | "This field is required" | "Enter your [field name] to continue" |
| Number range | "Out of range" | "Enter a number between 1 and 100" |
| File size | "File too large" | "Choose a file under 10 MB. Your file is 24 MB." |
| File type | "Wrong file type" | "Upload a PNG, JPG, or SVG file" |
| Character limit | "Too many characters" | "Keep your bio under 160 characters (currently 203)" |

### 3.3 Permission Errors

| Scenario | Headline | Body | CTA |
|----------|----------|------|-----|
| Role insufficient | "You don't have access" | "This page is available to admins. Ask your workspace owner to update your role." | "Request access" |
| Feature gated | "Upgrade to unlock" | "This feature is available on the Pro plan and above." | "View plans" |
| Resource not shared | "This [item] hasn't been shared with you" | "Ask the owner to share it, or check that you're signed in to the right account." | "Request access" |
| Expired access | "Your access has expired" | "Your invitation to [workspace] expired on [date]. Ask for a new invitation." | "Request new invite" |

### 3.4 Not-Found Errors

| Scenario | Headline | Body | CTA |
|----------|----------|------|-----|
| Page not found | "Page not found" | "The page you're looking for doesn't exist or has been moved." | "Go to homepage" |
| Deleted resource | "[Item] was deleted" | "This [item] was removed by [owner] on [date]." | "Go back" |
| Broken link | "This link is broken" | "The link you followed may be outdated. Try searching instead." | "Search" / "Go home" |
| Invalid ID | "We couldn't find that" | "Double-check the URL or search for what you need." | "Search" |

### 3.5 Server Errors

| Scenario | Headline | Body | CTA |
|----------|----------|------|-----|
| 500 / Generic | "Something went wrong" | "We're looking into it. Try again in a few minutes." | "Try again" |
| Maintenance | "We're doing some maintenance" | "We'll be back shortly. Check our status page for updates." | "View status" |
| Rate limited | "Too many requests" | "You've made a lot of requests recently. Wait a moment and try again." | "Try again in [N]s" |
| Service degraded | "Some features are unavailable" | "We're experiencing issues with [feature]. Other parts of the app are working normally." | "View status" |

---

## 4. Success States

Success copy confirms what happened and, when relevant, suggests a next action.

### 4.1 Creation Success

| Action | Copy |
|--------|------|
| Item created | "Project '[name]' created" |
| Account created | "Welcome! Your account is ready." |
| Invitation sent | "Invitation sent to [email]" |
| File uploaded | "'[filename]' uploaded successfully" |
| Import complete | "24 contacts imported. 3 duplicates skipped." |

### 4.2 Update Success

| Action | Copy |
|--------|------|
| Settings saved | "Settings saved" |
| Profile updated | "Your profile has been updated" |
| Password changed | "Password updated. You'll stay signed in on this device." |
| Bulk update | "12 items updated" |
| Auto-save | "Saved" (minimal, inline indicator) |

### 4.3 Deletion Success

| Action | Copy |
|--------|------|
| Item deleted | "'[name]' deleted" + "Undo" action (available for 5-10s) |
| Bulk delete | "8 items deleted" + "Undo" |
| Account deletion initiated | "Your account will be deleted in 30 days. You can cancel this from Settings." |
| Permanent delete | "'[name]' permanently deleted. This can't be undone." |

**Pattern:** Include the item name in deletion confirmations so the user can verify the right thing was removed. Offer "Undo" for soft deletes.

---

## 5. Destructive Confirmation

Before irreversible actions, confirm with the user. Name the action, the object, and the consequences.

### 5.1 Confirmation Dialog Copy

**Structure:**
- **Headline:** "[Verb] [object]?" -- direct question naming the action
- **Body:** What will happen, stated plainly. Include consequences and what cannot be undone.
- **Primary action:** Repeat the verb from the headline (not "OK" or "Yes")
- **Secondary action:** "Cancel"

| Action | Headline | Body | Confirm | Cancel |
|--------|----------|------|---------|--------|
| Delete project | "Delete 'Atlas'?" | "This will permanently delete the project and all its tasks. Team members will lose access." | "Delete project" | "Cancel" |
| Remove member | "Remove [name]?" | "[Name] will lose access to this workspace immediately. Their work will remain." | "Remove" | "Cancel" |
| Discard changes | "Discard unsaved changes?" | "You have unsaved changes that will be lost." | "Discard" | "Keep editing" |
| Revoke API key | "Revoke this API key?" | "Any integrations using this key will stop working immediately." | "Revoke key" | "Cancel" |
| Cancel subscription | "Cancel subscription?" | "You'll have access until [date]. After that, your team will be moved to the free plan." | "Cancel subscription" | "Keep subscription" |
| Reset data | "Reset all data?" | "This removes all records from [section]. This action can't be undone." | "Reset data" | "Cancel" |

### 5.2 Anti-Patterns in Confirmations

- Never use "Yes" / "No" -- users don't read the question, they scan for buttons
- Never use "OK" -- it's ambiguous for destructive actions
- Never use double negatives ("Cancel the cancellation?")
- Never make the destructive action the default/primary-styled button
- Never skip confirmation for permanent deletions, even if "power user mode" is on

---

## 6. Permission Denied

When a user tries to access or perform something they're not authorized for.

### 6.1 Copy Structure

**Headline:** State what they can't do
**Body:** Explain why (role, plan, ownership) and who can help
**CTA:** The most helpful next step (request access, upgrade, contact admin)

| Scenario | Copy |
|---------|------|
| Admin-only feature | **"Admin access required"** / "Only workspace admins can manage billing. Contact [admin name] to make changes." / CTA: "Contact admin" |
| Plan limitation | **"Available on Pro plan"** / "Your current plan doesn't include [feature]. Upgrade to unlock it." / CTA: "Compare plans" |
| Ownership | **"Only the owner can do this"** / "[Owner name] owns this [item]. Ask them to make this change." / CTA: "Contact owner" |

---

## 7. Offline States

Offline copy must tell users three things: you're offline, what still works, and what will happen when you reconnect.

### 7.1 Offline Transition

| Scenario | Copy |
|---------|------|
| Connection lost | Banner: "You're offline. Changes will sync when you reconnect." |
| Reconnecting | Banner: "Reconnecting..." |
| Reconnected | Banner (temporary, 3s): "You're back online. Changes synced." |

### 7.2 Offline Capabilities

| Scenario | Copy |
|---------|------|
| Read-only mode | "You're offline. You can view cached content, but changes won't be saved until you reconnect." |
| Queued changes | "You're offline. Your changes are saved locally and will sync automatically." |
| Action unavailable | "[Action] requires an internet connection." (Inline, next to disabled button) |
| Stale data | "Last updated [time ago]. Connect to the internet to refresh." |

---

## 8. First-Run and Onboarding

First-run copy introduces the product or feature. Focus on what the user can achieve, not what the feature does.

### 8.1 Feature Introduction

| Context | Headline | Body |
|---------|----------|------|
| New feature | "Introducing [feature]" | "[One sentence: what it helps you do]. Try it out." |
| Feature tour step | "Track time on tasks" | "Start a timer from any task to see where your time goes." |
| Post-signup | "Welcome to [Product]" | "Let's get your workspace set up. This takes about 2 minutes." |
| Empty first screen | "This is your [area]" | "[What will appear here once they start using it]." |

### 8.2 Progressive Disclosure

Reveal features as the user needs them, not all at once.

| Trigger | Copy |
|---------|------|
| First time using feature | Tooltip: "[Brief instruction]. Dismiss" |
| After completing setup | "You're all set! Here are a few things to try next: [2-3 actions]" |
| Reaching a milestone | "You've completed 10 tasks! Did you know you can create recurring tasks?" |

---

## 9. Timeout and Retry

When an operation takes too long or fails intermittently.

### 9.1 Timeout Progression

| Duration | Copy |
|----------|------|
| 5-10s over expected | "This is taking longer than usual..." |
| 15-30s over expected | "Still working on it. You can keep waiting or try again." / CTA: "Keep waiting" / "Try again" |
| 30-60s over expected | "This is taking much longer than expected. There may be an issue." / CTA: "Try again" / "Cancel" |
| Hard timeout | "The request timed out. This could be a temporary issue." / CTA: "Try again" / "Go back" |

### 9.2 Retry Copy

| Scenario | Copy |
|---------|------|
| First retry prompt | "Something went wrong. Try again?" / CTA: "Try again" |
| Second retry | "Still not working. Check your connection or try again in a few minutes." / CTA: "Try again" |
| After multiple failures | "We're having trouble completing this request. Please try again later or contact support." / CTA: "Contact support" / "Try later" |
| Auto-retry with countdown | "Retrying in [N] seconds..." / CTA: "Retry now" / "Cancel" |

---

## 10. Anti-Patterns

### 10.1 Generic Messages

"An error occurred." -- tells the user nothing. Always specify what failed and what to do.

### 10.2 Technical Jargon

"Error 500: Internal Server Error" or "NullPointerException" -- translate to human language. The user doesn't need the error code.

### 10.3 Blame-the-User Tone

"You entered an invalid email" -- use "Enter a valid email address" instead. Frame errors as requirements, not accusations.

### 10.4 Missing Next Step

"Your session expired." with no action. Always provide a CTA: "Sign in again."

### 10.5 Wall of Text

Multi-paragraph error explanations. Keep headlines under 8 words, body under 30 words. Link to docs if more detail is needed.

### 10.6 Crying Wolf

Using error styling (red, alert icons) for informational messages. Reserve red for actual errors. Use blue for info, yellow for warnings.

### 10.7 Disappearing Errors

Error toast that auto-dismisses before the user reads it. Error messages should persist until dismissed or resolved. Use inline messages for validation errors, not toasts.

### 10.8 Ambiguous Confirmations

"Are you sure?" with "OK" / "Cancel" buttons. The user can't tell which button does what without re-reading the question. Use specific verb labels.

---

## 11. Decision Tree

### 11.1 Choosing State Copy Tone

```
What is the severity?
+-- Critical error / data loss risk
|   --> Direct, urgent tone. Short sentences. Specific consequences.
|      "Unsaved changes will be lost."
+-- Recoverable error
|   --> Calm, helpful tone. State problem + solution.
|      "Couldn't save. Check your connection and try again."
+-- Warning / potential issue
|   --> Advisory tone. State risk + recommendation.
|      "This API key expires in 3 days. Generate a new one."
+-- Neutral info / success
|   --> Brief, warm tone. Confirm action + optional next step.
|      "Team created. Invite your first member."
+-- Empty / first-use
    --> Encouraging tone. Value prop + CTA.
       "Track your team's progress. Create your first project."
```

### 11.2 Choosing Feedback Mechanism for State Copy

```
Is this a form validation issue?
+-- YES --> Inline message adjacent to the field. Persist until fixed.

Is this a confirmation of a completed action?
+-- YES, routine --> Toast/snackbar, auto-dismiss 3-5s
+-- YES, with undo option --> Toast with "Undo" action, 8-10s

Is this an error requiring attention?
+-- YES, field-level --> Inline, persist
+-- YES, page-level --> Banner at top, persist until resolved
+-- YES, system-level --> Modal or persistent banner

Is this a destructive confirmation?
+-- YES --> Modal dialog with specific verb labels

Is this a state transition (online/offline)?
+-- YES --> Persistent banner until state changes back
```

---

## References

- [NNG: Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [NNG: Instructive vs Assertive Tone](https://www.nngroup.com/articles/tone-voice-users/)
- [Material Design 3 - Communication](https://m3.material.io/foundations/content-design/overview)
- [Apple HIG - Writing Inclusively](https://developer.apple.com/design/human-interface-guidelines/writing-inclusively)
- [Shopify Polaris - Error Messages](https://polaris.shopify.com/content/error-messages)
- [Shopify Polaris - Empty States](https://polaris.shopify.com/design/empty-states)
- [Atlassian Design System - Empty States](https://atlassian.design/patterns/empty-states)
- [Google Developer Docs Style Guide - Error Messages](https://developers.google.com/style/error-messages)
- [Microsoft Writing Style Guide - Error Messages](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/error-messages)
