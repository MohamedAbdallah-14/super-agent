# Notification Content Patterns

> **Module Type:** Pattern
> **Domain:** Content -- Multi-Channel Notification Systems
> **Authoritative Sources:** Apple Push Notification Guidelines, Firebase Cloud Messaging, Material Design 3, Mailchimp Content Style Guide, NNG, CAN-SPAM Act, GDPR

---

## Quick Reference Checklist

1. Push titles under 50 characters; body under 100 characters
2. Email subject lines under 50 characters; preheader under 100 characters
3. Every notification answers: what happened, why it matters, what to do
4. Toast/snackbar auto-dismiss 3-5s for text under 20 words
5. One CTA per notification -- never present competing actions
6. Urgency level matches the notification channel (push = urgent, digest = low)
7. Variable data ({name}, {count}) has fallback values for null/missing
8. In-app banners persist until dismissed or resolved
9. System messages use neutral tone -- no marketing language
10. Email CTA button text is a specific verb phrase, not "Click here"
11. Notifications that require action include a deep link to the relevant screen
12. Batch related notifications ("3 new comments") instead of sending individually
13. Every notification type has an opt-out mechanism
14. Time-sensitive notifications include the relevant timestamp
15. Never send notifications for the user's own actions

---

## 1. Push Notifications

Push notifications interrupt the user outside the app. They must justify the interruption by being timely, relevant, and actionable.

### 1.1 Structure

| Element | Constraints | Purpose |
|---------|------------|---------|
| **Title** | 50 chars max (iOS truncates at ~50, Android at ~65) | Who or what: the source of the notification |
| **Body** | 100 chars max (iOS shows ~4 lines expanded, ~2 collapsed) | What happened + why it matters |
| **Action** | Deep link to specific screen | Where to go to respond |
| **Category** | Maps to notification settings | Allows user to mute by type |
| **Media** | Rich notification: image, video thumbnail | Visual context (optional) |

### 1.2 Examples by Type

**Direct messages:**

| Element | Copy |
|---------|------|
| Title | "Sarah Chen" |
| Body | "Can you review the Q3 report before tomorrow's meeting?" |
| Action | Open conversation with Sarah |

**Mentions and assignments:**

| Element | Copy |
|---------|------|
| Title | "You were mentioned in #design" |
| Body | "Alex: @you What do you think about the new navigation?" |
| Action | Open channel at mention |

**Status changes:**

| Element | Copy |
|---------|------|
| Title | "Build succeeded" |
| Body | "main branch deployed to production" |
| Action | Open deployment details |

**Reminders:**

| Element | Copy |
|---------|------|
| Title | "Reminder: Team standup" |
| Body | "Starts in 15 minutes. 6 attendees confirmed." |
| Action | Open calendar event |

**Alerts:**

| Element | Copy |
|---------|------|
| Title | "Payment failed" |
| Body | "Your subscription payment couldn't be processed. Update your billing info." |
| Action | Open billing settings |

### 1.3 Character Limit Reference

| Platform | Title | Body (collapsed) | Body (expanded) |
|----------|-------|-------------------|-----------------|
| iOS | ~50 chars | ~80 chars (2 lines) | ~200 chars (4 lines) |
| Android | ~65 chars | ~40 chars (1 line) | ~450 chars (big text style) |
| Web (Chrome) | ~50 chars | ~120 chars (2 lines) | N/A |
| macOS | ~50 chars | ~100 chars (2 lines) | ~200 chars (expanded) |
| watchOS | ~30 chars | ~60 chars | N/A |

**Rule of thumb:** Write for the smallest display. If the collapsed body must convey the full message, keep it under 80 characters.

### 1.4 Urgency Levels

| Level | Use For | Frequency | Sound/Vibrate |
|-------|---------|-----------|--------------|
| **Critical** | Security alerts, payment failures, service outages | Rare (<1/week) | Yes, override DND if allowed |
| **High** | Direct messages, mentions, assigned tasks | As they happen | Yes |
| **Medium** | Status changes, approvals needed, updates | Batched (hourly) | Default |
| **Low** | Tips, recommendations, social activity | Daily digest or in-app only | Silent |

---

## 2. Email Templates

Email is the workhorse notification channel. It handles everything push cannot: long-form content, receipts, digests, and communications requiring a paper trail.

### 2.1 Structure

| Element | Constraints | Purpose |
|---------|------------|---------|
| **From name** | Recognizable sender (product name or person + product) | Trust and open rate |
| **Subject line** | Under 50 chars; front-load the key information | Why to open this email |
| **Preheader** | Under 100 chars; complements subject, not repeats it | Preview text in inbox list |
| **Body** | Scannable; 1-3 short paragraphs max for transactional | What happened, context, next step |
| **CTA button** | Specific verb phrase; one primary CTA per email | What to do next |
| **Footer** | Unsubscribe link (legally required), company info | Compliance and opt-out |

### 2.2 Subject Line and Preheader Pairs

**Transactional:**

| Subject | Preheader |
|---------|-----------|
| "Your invoice for March 2025" | "Amount due: $49.00. Payment is due by April 1." |
| "Password reset requested" | "Use the link below to set a new password. Expires in 1 hour." |
| "Your export is ready" | "Download your data export (247 records, CSV format)." |
| "Welcome to [Product]" | "Your account is set up. Here's how to get started." |
| "[Name] invited you to [Workspace]" | "Join [Name]'s workspace to start collaborating." |

**Notifications:**

| Subject | Preheader |
|---------|-----------|
| "[Name] commented on your task" | "'Looks great, just one small change on the header.'" |
| "3 tasks due tomorrow" | "Design review, API docs update, and sprint planning." |
| "Your weekly summary" | "12 tasks completed, 3 new issues, 98% uptime." |
| "New sign-in from Chrome on Windows" | "If this wasn't you, secure your account now." |

**Digest:**

| Subject | Preheader |
|---------|-----------|
| "This week in [Workspace]" | "14 tasks completed, 2 milestones reached, 5 new discussions." |
| "Your monthly report for [Project]" | "Key metrics: 94% on-time delivery, 23 resolved issues." |

### 2.3 CTA Button Copy

| Bad | Good | Why |
|-----|------|-----|
| "Click here" | "View invoice" | Specific action, accessible (screen readers read button text) |
| "Learn more" | "See what changed" | Tells user what they'll find |
| "Submit" | "Confirm your email" | Names the action and object |
| "Go" | "Open your dashboard" | Clear destination |
| "OK" | "Accept invitation" | Specific verb + object |

**Rule:** CTA text should complete the sentence "I want to ___."

### 2.4 Email Body Patterns

**Transactional email body formula:**
1. One sentence stating what happened
2. Relevant details (amount, date, item name)
3. One CTA button
4. One sentence for fallback ("If you didn't request this, you can ignore this email.")

**Notification email body formula:**
1. Who did what ("[Name] commented on [item]")
2. Preview of the content (quoted comment text, task details)
3. One CTA button to view in-app
4. Notification preference link

---

## 3. In-App Notifications

In-app notifications appear within the application interface. They range from ephemeral toasts to persistent banners.

### 3.1 Toast / Snackbar

Lightweight, temporary feedback for completed actions.

| Scenario | Copy | Duration |
|----------|------|----------|
| Item saved | "Changes saved" | 3s |
| Item deleted | "Task deleted" + "Undo" | 8s |
| Copied to clipboard | "Link copied" | 3s |
| Settings updated | "Notification preferences saved" | 3s |
| Bulk action | "12 items archived" + "Undo" | 8s |
| Error (recoverable) | "Couldn't save changes. Try again." + "Retry" | 10s |

**Rules:**
- One toast visible at a time; queue additional ones
- Auto-dismiss 3-5s for informational, 8-10s if action button present
- Position: bottom-center (M3) or bottom-left (common web pattern)
- Never use toasts for errors that require user attention -- use inline messages

### 3.2 Banner

Persistent, full-width messages for system-wide or section-wide states.

| Type | Copy | Dismiss |
|------|------|---------|
| Trial expiring | "Your free trial ends in 3 days. Upgrade to keep your data." + CTA: "View plans" | Dismissible |
| Maintenance scheduled | "Scheduled maintenance on March 20, 2-4 AM UTC. Some features may be unavailable." | Dismissible |
| Account issue | "Your payment method was declined. Update it to avoid service interruption." + CTA: "Update billing" | Not dismissible until resolved |
| New feature | "Introducing automations. Set up rules to save time on repetitive tasks." + CTA: "Learn more" | Dismissible, don't show again |
| Security notice | "We've updated our privacy policy. Review the changes." + CTA: "Review" | Dismissible |

### 3.3 Modal Notifications

Modals interrupt the workflow. Reserve for critical information requiring acknowledgment.

| Scenario | Headline | Body | Actions |
|----------|----------|------|---------|
| Breaking change | "Action required: Update your integration" | "The v1 API will be retired on April 30. Update your integration to v2 to avoid disruption." | "View migration guide" / "Remind me later" |
| Terms update | "Updated terms of service" | "We've made changes to our terms effective March 1. Please review and accept to continue." | "Review terms" / "Sign out" |
| Session expired | "Session expired" | "You've been signed out due to inactivity." | "Sign in again" |

### 3.4 Notification Center / Inbox

The in-app notification list. Each entry follows a consistent structure.

**Entry structure:**
- **Icon/avatar:** Source of the notification (user avatar, system icon)
- **Primary text:** "[Actor] [action] [object]" -- e.g., "Sarah commented on 'Homepage redesign'"
- **Timestamp:** Relative ("2h ago") for recent, absolute ("Mar 12") for older
- **Read/unread indicator:** Bold or dot for unread
- **Deep link:** Tapping opens the relevant context

**Grouping:**
- Batch related notifications: "Alex and 4 others reacted to your post"
- Show expanded list on tap: individual reactions with timestamps

---

## 4. System Messages

System messages are generated by the application itself, not triggered by another user's action. They include automated alerts, scheduled reports, and operational notifications.

### 4.1 Automated Alerts

| Trigger | Copy |
|---------|------|
| Approaching quota | "You've used 80% of your storage (4.0 GB of 5.0 GB). Upgrade for more space." |
| Certificate expiring | "Your SSL certificate expires in 14 days. Renew it to avoid site downtime." |
| Unused feature | "You haven't set up backups yet. Enable automatic backups to protect your data." |
| Anomaly detected | "Unusual login activity detected from [location]. Was this you?" + "Yes, it was me" / "Secure my account" |

### 4.2 Scheduled Reports

| Type | Subject / Title | Content |
|------|----------------|---------|
| Daily digest | "Your daily summary for [date]" | Key metrics, action items, trending items |
| Weekly recap | "Week of [date range]: Your highlights" | Completed items, upcoming deadlines, team activity |
| Monthly report | "[Month] report for [Project]" | Aggregated metrics, trends, recommendations |

### 4.3 Lifecycle Messages

| Stage | Channel | Copy |
|-------|---------|------|
| Welcome | Email | "Welcome to [Product]. Here are 3 things to try first." |
| Activation prompt | Push + Email | "You haven't created your first [item] yet. It only takes a minute." |
| Re-engagement | Email | "It's been a while! Here's what's new since your last visit." |
| Churn risk | Email | "We noticed you haven't logged in recently. Is there anything we can help with?" |
| Cancellation followup | Email | "We're sorry to see you go. Your data will be available for 30 days if you change your mind." |

---

## 5. Variable Handling

Notifications contain dynamic data. Every variable must have a fallback for when the data is null, missing, or too long.

### 5.1 Common Variables and Fallbacks

| Variable | Example Value | Fallback | Truncation |
|----------|--------------|----------|------------|
| `{user_name}` | "Sarah Chen" | "Someone" | First name only if space is tight |
| `{item_name}` | "Q3 Marketing Plan" | "an item" | Truncate at 30 chars + "..." |
| `{count}` | "5" | "several" | N/A |
| `{date}` | "March 15, 2025" | "recently" | Short format: "Mar 15" |
| `{workspace}` | "Acme Design Team" | "your workspace" | Truncate at 25 chars + "..." |
| `{email}` | "sarah@acme.com" | "your email address" | Mask: "s***@acme.com" |

### 5.2 Pluralization

| Count | Copy |
|-------|------|
| 0 | "No new messages" |
| 1 | "1 new message" |
| 2-4 | "[N] new messages" |
| 5+ | "[N] new messages" |
| 100+ | "99+ new messages" |

**Rule:** Always handle 0, 1, and many. Some languages have additional plural forms (Russian has 3, Arabic has 6) -- use ICU MessageFormat for i18n.

### 5.3 Relative Timestamps

| Duration | Display |
|----------|---------|
| < 1 minute | "Just now" |
| 1-59 minutes | "[N]m ago" |
| 1-23 hours | "[N]h ago" |
| 1-6 days | "[N]d ago" |
| 7+ days | "Mar 12" (absolute date) |
| Different year | "Mar 12, 2024" (include year) |

---

## 6. Channel Constraints

### 6.1 Platform-Specific Limits

| Constraint | iOS | Android | Web Push | Email |
|-----------|-----|---------|----------|-------|
| Title length | ~50 chars | ~65 chars | ~50 chars | ~50 chars (subject) |
| Body length | ~200 chars (expanded) | ~450 chars (big text) | ~120 chars | No hard limit |
| Rich media | Images, video thumbnails | Images, big picture | Images (limited) | Images, HTML |
| Actions | Up to 4 category actions | Up to 3 action buttons | Up to 2 actions | CTA buttons in body |
| Sound | Custom sound file, up to 30s | Custom sound or channel default | Browser default | N/A |
| Grouping | Thread ID | Channel + group key | Tag | N/A |
| Rate limits | Throttled by system | Channel importance levels | Browser-managed | ISP reputation |

### 6.2 Deliverability Considerations

**Push:**
- iOS: Users must grant permission; prompt after demonstrating value
- Android 13+: POST_NOTIFICATIONS permission required at runtime
- Web: Browser permission dialog; use custom pre-prompt first

**Email:**
- Include text/plain alternative for every HTML email
- CAN-SPAM: physical address required, unsubscribe within 10 days
- GDPR: explicit consent for marketing; transactional exempt from consent
- SPF, DKIM, DMARC configured for sender domain
- Avoid spam trigger words in subject lines ("FREE," "Act Now," all caps)

---

## 7. Anti-Patterns

### 7.1 Notification Spam

Sending a push for every minor event. Users disable all notifications. **Fix:** Default to in-app or digest for low-priority events. Let users configure per-type preferences.

### 7.2 Duplicate Channels

Sending the same notification via push AND email AND in-app simultaneously. **Fix:** Use channel hierarchy: push for urgent, in-app for standard, email for digest. Never duplicate the same message across channels at the same time.

### 7.3 Missing Deep Links

"You have a new comment" that opens the app's home screen. **Fix:** Every notification deep links to the specific context (the comment, the task, the conversation).

### 7.4 No Opt-Out

Users cannot control which notifications they receive. **Fix:** Granular notification settings by type and channel. "Mute this conversation" for thread-level control.

### 7.5 Generic Subject Lines

"Notification from [Product]" or "[Product] Update" as the email subject. **Fix:** Lead with the specific content: "[Name] commented on your task."

### 7.6 Expired Action Links

Notification links that expire before the user acts on them. **Fix:** Links should remain valid for at least 30 days. If expired, redirect to a helpful page explaining what happened.

### 7.7 Self-Notifications

Notifying users about their own actions ("You created a task"). **Fix:** Never notify users about actions they just performed. Only notify about others' actions or system events.

### 7.8 Unsubscribe Friction

Requiring login, multiple clicks, or a "reason" form to unsubscribe from email. **Fix:** One-click unsubscribe (RFC 8058 List-Unsubscribe-Post header). No login required. No guilt trip.

---

## 8. Decision Tree

### 8.1 Choosing the Right Channel

```
How urgent is this notification?
+-- Critical (security, payment, outage)
|   --> Push (even if DND, if platform allows) + Email
+-- High (direct message, mention, assignment)
|   --> Push + In-app
+-- Medium (status change, approval needed)
|   --> In-app + Include in next digest email
+-- Low (recommendation, tip, social)
    --> In-app only, or daily/weekly digest email
```

### 8.2 Choosing the Right In-App Format

```
Is the user currently in the app?
+-- YES
|   +-- Was it their action? --> Toast (success/error feedback)
|   +-- Was it someone else's action? --> Notification badge + inbox entry
|   +-- Is it system-wide? --> Banner
|   +-- Does it require acknowledgment? --> Modal
+-- NO
    +-- Is it urgent? --> Push notification
    +-- Can it wait? --> In-app inbox entry + badge
    +-- Is it a digest? --> Email
```

### 8.3 Batching vs. Individual

```
Will there be more of the same event within 5 minutes?
+-- YES --> Batch: "[Name] and [N] others [action]"
+-- NO --> Individual notification
+-- UNKNOWN --> Wait 30s for debounce, then decide
```

---

## References

- [Apple - Push Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [Material Design 3 - Notifications](https://m3.material.io/foundations/content-design/notifications)
- [Firebase - Send Messages](https://firebase.google.com/docs/cloud-messaging/concept-options)
- [NNG - Push Notification Design](https://www.nngroup.com/articles/push-notification/)
- [Mailchimp - Email Design Guide](https://mailchimp.com/email-design-guide/)
- [Mailchimp - Writing Email Subject Lines](https://mailchimp.com/resources/email-subject-lines/)
- [CAN-SPAM Act Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [RFC 8058 - One-Click Unsubscribe](https://www.rfc-editor.org/rfc/rfc8058)
- [Intercom - Notification Best Practices](https://www.intercom.com/blog/notification-best-practices/)
- [Shopify Polaris - Toast](https://polaris.shopify.com/components/feedback-indicators/toast)
