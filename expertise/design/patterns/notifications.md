# Notification Patterns — Design Expertise Module

> **Module type:** Pattern
> **Last updated:** 2026-03-07
> **Sources:** Apple HIG, Material Design 3, Nielsen Norman Group, WCAG 2.2, Carbon Design System

---

## Quick Reference Checklist

- [ ] Every notification has a clear source (app/feature/sender)
- [ ] Urgency levels classified (critical, important, informational)
- [ ] Users control preferences per channel and type
- [ ] Push permission requested only after demonstrated value
- [ ] Toasts auto-dismiss for informational; persist for actionable
- [ ] All notifications deep-link to relevant content
- [ ] Badge counts are accurate and update in real time
- [ ] Grouped notifications expand to show individual items
- [ ] Notification center includes mark-all-read and bulk actions
- [ ] Screen readers announce status messages via aria-live regions
- [ ] Notification sounds have visual/haptic alternatives
- [ ] Cross-platform behavior is consistent but platform-adapted
- [ ] Batching strategy prevents notification fatigue
- [ ] Expired notifications are pruned automatically
- [ ] Offline notifications queued and delivered on reconnection

---

## 1. Pattern Anatomy

### 1.1 Delivery Channels

#### Push Notifications (Mobile)

Remote messages delivered via APNs (Apple Push Notification service) or FCM
(Firebase Cloud Messaging) to the device's system notification tray.

**Anatomy:**
- App icon — identifies the source application
- Title — bold, concise headline (40-50 characters max)
- Body text — supporting detail (90-120 characters visible before truncation)
- Timestamp — relative ("2m ago") or absolute ("3:42 PM")
- Media attachment — optional image, video thumbnail, or map preview
- Action buttons — up to 4 quick actions (iOS) or 3 (Android)
- Collapse key / thread ID — groups related notifications

**Key constraints:** Users must explicitly opt in. Delivery is best-effort, not
guaranteed. Background processing limits affect timing on iOS. Android notification
channels (API 26+) give users per-channel control over behavior.

#### In-App Notifications (Bell Icon / Notification Center)

Persistent in-app inbox accessed via a bell icon in the top navigation bar.

**Anatomy:**
- Bell icon — entry point; displays badge indicator (dot or count)
- Notification list — reverse-chronological feed
- Read/unread state — visual differentiation (bold text, background color)
- Notification item — avatar/icon + title + description + timestamp + action
- Filter tabs — segment by type (mentions, updates, assignments)
- Bulk actions — mark all read, clear all, settings link
- Empty state — friendly message when no notifications exist

**Interaction model:** Click bell to open dropdown/panel/drawer. Click individual
notification to deep-link to source. Hover to reveal secondary actions (dismiss,
snooze, mute). Scroll to load older notifications.

#### Toast / Snackbar

Transient, non-modal messages that appear briefly to confirm an action or
relay status information.

**Anatomy:**
- Container — compact bar, typically 48-64px height
- Status icon — success/checkmark, error/X, warning/triangle, info/i
- Message text — single line, concise (under 60 characters)
- Action button — optional single action ("Undo", "View", "Retry")
- Dismiss control — close button or auto-dismiss timer

**Placement conventions:**
- Material Design 3: bottom-center, above FAB if present
- Apple HIG: top-center (macOS) or system banner position (iOS)
- Web convention: top-right corner is most common
- Stacking: multiple toasts stack vertically with 8px spacing

**Timing guidelines (per MD3 and accessibility research):**
- Minimum display: 4-5 seconds (WCAG accessibility minimum)
- Default display: 5-8 seconds for informational
- Extended display: 10+ seconds or persistent for actionable toasts
- Auto-pause timer on hover/focus (accessibility requirement)

#### Email Notifications

Updates delivered to the user's email inbox, extending the notification system
beyond the app boundary.

**Best practices:**
- One-click unsubscribe (CAN-SPAM / GDPR requirement)
- Clear sender identification (app name, not "noreply")
- Deep-link back to the specific content in the app
- Batch digest emails (daily/weekly) for non-urgent updates
- Respect user email frequency preferences
- Subject lines under 50 characters for mobile preview

#### Badges (Dot and Count)

Small visual indicators overlaid on icons, tabs, or list items to signal
unread content or pending actions.

**Variants:**
- Dot badge — binary indicator (has/has-not unread); 6-10px diameter
- Count badge — numeric with "99+" max; 16dp minimum height (MD3)
- Icon badge — small icon overlay (e.g., alert triangle on settings icon)

**Placement:** Top-right corner of parent element, offset by ~25-50% of badge
diameter. Error color (red) for urgent, primary color for standard. Never
obscure the parent icon's core meaning.

#### Banners

Persistent, full-width messages at the top of a screen for system-wide
announcements or required actions. Remain visible until the user acts or
dismisses. Not appropriate for transient feedback (use toasts instead).

**Urgency mapping:**
- Critical (error): red/destructive color, blocking action required
- Warning: yellow/amber, attention needed but not blocking
- Informational: blue/neutral, contextual awareness
- Success: green, confirms completion of a significant action

#### Notification Preferences / Settings

Granular user controls that determine what, how, and when notifications arrive.

**Essential preference categories:**
- By channel: push, email, in-app, SMS (toggle each independently)
- By type: mentions, replies, assignments, updates, marketing
- By urgency: critical only, important + critical, all
- By schedule: quiet hours, notification summary times
- By source: per-project, per-channel, per-person muting
- By frequency: immediate, batched (hourly/daily), digest only

### 1.2 Urgency Levels

| Level | Delivery | Visual | Sound | DND | Examples |
|-------|----------|--------|-------|-----|----------|
| **Critical** | Push + in-app + email | Red/destructive, persistent | Alert + haptic | Bypasses | Security breach, payment failure |
| **Important** | Push + in-app | Accent color, badge count | Standard | Respects | DMs, @mentions, assignments |
| **Informational** | In-app only | Neutral, dot badge | None | Respects | Status updates, activity feed |

---

## 2. Best-in-Class Examples

### 2.1 Slack
- **Granular preferences:** Per-channel overrides (all messages, mentions only, nothing), keyword-based alerts
- **Badge differentiation:** Red dot for general unread; numeric badge for DMs/mentions — two-tier hierarchy reducing anxiety while maintaining awareness
- **DND/snooze:** Bell icon snooze with preset durations, clearly communicated to teammates
- **Cross-platform sync:** Read state syncs across desktop, mobile, web; reading on one device clears others

### 2.2 Linear
- **Inbox-first approach:** Dedicated inbox view with clean design emphasizing teammate avatars and action descriptions
- **Subscription model:** Only subscribed issues/projects/teams generate notifications
- **Keyboard triage:** `e` to archive, `Enter` to open, shift for bulk select — power-user efficiency
- **Contextual grouping:** Same-issue notifications grouped with latest update + related count

### 2.3 GitHub
- **Filter queries:** Custom filters (e.g., `repo:org/repo reason:review-requested`) for precise triage
- **Reason metadata:** Each notification tagged with why you received it (assigned, review-requested, mentioned, subscribed) — reduces "why am I seeing this?" friction
- **Triage actions:** Mark as done, save for later, unsubscribe from thread
- **Watching granularity:** Per-repo watch levels (participating, all activity, ignore, custom)

### 2.4 Discord
- **Cascading hierarchy:** Server > category > channel notification settings, each overridable — most granular consumer notification system
- **Mention controls:** Separate toggles for @everyone, @here, @role, and @user mentions
- **Visual badge tiers:** White dot for unread, red badge with count for mentions; muted channels show nothing

### 2.5 Notion
- **Cross-device escalation:** Desktop notification fires after 10s; mobile push fires only if desktop unacknowledged for 5 minutes — prevents duplicate interruptions
- **Follow model:** Users "follow" pages to receive updates; unfollowing stops notifications without affecting visibility
- **Inline context:** Notification shows the specific changed block, not just "page updated"

### 2.6 iOS System Notifications
- **Notification Summary:** On-device ML sorts batched notifications by relevance at user-scheduled times
- **Focus modes:** Activity-based filtering (Work, Personal, Sleep, custom) with per-mode allowed apps/people
- **Four interruption levels:** passive, active, timeSensitive, critical — gold standard for urgency classification
- **Live Activities:** Real-time glanceable updates on lock screen for ongoing events

### 2.7 Gmail
- **Priority inbox:** ML separates important from unimportant; only important emails trigger push
- **Category bundling:** Marketing, social, promotional emails auto-categorized, suppressing notifications
- **Snooze:** Snooze to reappear at a chosen time — well-understood deferred-action pattern

### 2.8 Figma
- **Contextual in-app notifications:** Bell icon notifications for comments, file shares, and project updates with direct navigation to the exact comment location on canvas
- **Email digest control:** Separate toggles for immediate email vs. daily digest for different notification types
- **@-mention precision:** Notifications trigger only for direct @-mentions in comments, reducing noise from general file activity
- **Resolved state:** Comment thread resolution clears related notifications, keeping the inbox relevant

---

## 3. User Flow Mapping

### 3.1 Core Delivery Flow

```
Event occurs (server-side)
    |
    v
Classify urgency (critical / important / informational)
    |
    v
Check user preferences
    |--- Channel allowed? (push / email / in-app / SMS)
    |--- Type enabled? (mentions / updates / marketing)
    |--- Schedule permits? (outside quiet hours?)
    |--- Frequency cap reached? (max N per hour?)
    |
    v
Route to delivery channels
    |--- Push: APNs/FCM --> device notification tray
    |--- Email: SMTP --> user inbox (immediate or digest queue)
    |--- In-app: WebSocket/SSE --> notification center + badge update
    |--- SMS: Twilio/etc --> phone (critical only)
    |
    v
Track delivery status
    |--- Delivered / Failed / Pending
    |--- Opened / Dismissed / Expired
```

### 3.2 User Interaction Flow

```
Notification arrives
    |
    +-- User sees it (lock screen / banner / badge / toast)
    |
    +-- User Action:
    |    |
    |    +-- Open ---------> Deep-link to source content
    |    |                   Mark as read, remove from tray
    |    |
    |    +-- Quick Action --> Execute without opening app
    |    |                   (reply, approve, snooze, archive)
    |    |
    |    +-- Dismiss ------> Remove from view
    |    |                   Remains unread in notification center
    |    |
    |    +-- Ignore -------> Remains until auto-dismiss or manual clear
    |
    +-- Post-Action:
         |--- Update badge count
         |--- Sync read state across devices
         |--- Log engagement analytics
```

### 3.3 Batch Notifications

- **Time-window:** Collect for fixed interval (e.g., 30 min), deliver as summary (LinkedIn, Google Workspace)
- **Activity-based:** Group by entity — "Patrick and 3 others commented" instead of 4 separate notifications
- **Scheduled digest:** Daily/weekly email summaries (GitHub, Notion)
- **Batch anatomy:** Summary line + 2-3 top items + "View all" expand + category breakdown

### 3.4 Notification Grouping

Grouping collapses related notifications in the notification center or system tray.

**Grouping strategies:**
- By source — all notifications from the same app grouped together
- By thread/conversation — messages in the same thread collapsed
- By entity — all activity on the same issue/document/task grouped
- By type — all mentions together, all assignments together
- By time — "Earlier today," "Yesterday," "This week" sections

**Grouped notification interaction:**
- Collapsed view shows count + most recent item
- Tap/click to expand and see all items in group
- Bulk actions available on the group level (mark all read, dismiss group)
- Individual items remain actionable within expanded group

### 3.5 Notification History

The notification center serves as the persistent record of all notifications.

**Design requirements:**
- Retention period: define how long notifications persist (30-90 days typical)
- Search: allow users to search history by keyword or filter
- Pagination: infinite scroll or "Load more" for large histories
- State preservation: read/unread state persists across sessions
- Archive vs. delete: "Mark as done" removes from active view but keeps in
  history; "Delete" permanently removes
- Filtered views: ability to view only unread, only mentions, only a specific
  project or source

### 3.6 Edge Cases

#### Offline Delivery
- Queue notifications on the server when user is offline
- Deliver queued notifications on reconnection, ordered chronologically
- Collapse duplicate/superseded notifications before delivery (e.g., if user
  was mentioned 5 times in the same thread while offline, deliver one grouped
  notification, not five)
- Show "offline" indicator in notification center when connection is lost
- Avoid overwhelming users with a burst of notifications on reconnection

#### Expired Notifications
- Notifications with time-bound relevance (e.g., "Meeting starts in 5 min")
  should not be delivered after expiry
- Set TTL (time-to-live) on push notifications via APNs/FCM
- Show "Event has passed" for time-bound items rather than original CTA
- Auto-archive stale notifications in notification center

#### Notification Overflow
- Cap display at "99+" (universal convention)
- Prioritize newer and higher-urgency in visible list
- Rate-limit notification generation server-side
- After N notifications per hour from a single source, batch remainder
  into a summary notification
- Provide "Clear all" but require confirmation for large batches

---

## 4. Micro-Interactions

### 4.1 Badge Animation
- **Appear:** Scale-in from 0 to 1.0 with overshoot (1.15) and settle. 280ms, ease-out-back.
- **Count update:** Pulse to 1.1 scale and back. 150-200ms.
- **Disappear:** Scale-out to 0 with fade. 180ms, ease-in.

```css
@keyframes badge-appear {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  80%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
```

### 4.2 Toast Slide-In
- **Entry:** Slide from edge (bottom-up or top-down) with fade. 250-350ms, ease-out.
- **Exit:** Reverse slide + fade. 200ms, ease-in.
- **Stacking:** New toast pushes existing with smooth translateY. 200ms. Max 3-4 visible.
- **Progress bar:** Thin indicator showing remaining auto-dismiss time; pauses on hover/focus.

### 4.3 Bell Shake
- Rotational wiggle: 15deg to -12deg to 8deg to -5deg to 0deg. 3-4 oscillations over 500ms.
- Triggered once on new notification arrival, not continuously.

```css
@keyframes bell-shake {
  0%   { transform: rotate(0deg); }
  15%  { transform: rotate(15deg); }
  30%  { transform: rotate(-12deg); }
  45%  { transform: rotate(8deg); }
  60%  { transform: rotate(-5deg); }
  100% { transform: rotate(0deg); }
}
```

### 4.4 Swipe Interactions (Mobile)

**Swipe-to-dismiss:**
- Horizontal swipe (left or right) to dismiss notification
- Threshold: 30-40% of notification width triggers dismiss
- Below threshold: spring back to original position (300ms, spring easing)
- Above threshold: accelerate off-screen + fade out
- Background color reveals underneath during swipe (red for delete)

**Swipe actions (asymmetric):**
- Swipe right: primary action (mark read) — blue/green background
- Swipe left: secondary action (snooze/archive) — orange/gray background
- Partial swipe reveals action icon and label
- Full swipe executes the action immediately
- Haptic feedback at the action threshold point

### 4.5 Grouped Expand/Collapse

**Expand animation:**
- Collapsed state shows summary card with count
- Tap to expand: child notifications fan out below with staggered slide-in
- Each child slides down with 30-50ms stagger delay
- Total expand duration: 200-400ms depending on count
- Parent card remains as header with collapse affordance

**Collapse animation:**
- Reverse of expand with slight acceleration
- Duration: 250ms total
- Final child disappearing triggers summary count update

### 4.6 Mark-as-Read Transition
- Background color transitions from unread highlight to read state (300ms, ease-in-out)
- Bold text weight transitions to regular weight simultaneously
- Badge dot fades out over 200ms
- If last unread item, trigger badge disappear animation on bell icon

### 4.7 Pull-to-Refresh (Notification Center)
- Standard pull-to-refresh with custom icon animation
- Notification bell rotates during refresh (180-degree loop)
- New notifications slide in from top with staggered animation
- "Up to date" state shows subtle checkmark confirmation

### 4.8 Reduced Motion

Respect `prefers-reduced-motion` by disabling all notification animations.
Replace with instant state changes (opacity swap, no transform).

```css
@media (prefers-reduced-motion: reduce) {
  .toast-enter, .badge-appear, .bell-shake,
  .notification-expand, .swipe-action { animation: none; }
  .toast { opacity: 1; transform: none; }
  .badge { transform: scale(1); opacity: 1; }
}
```

### 4.9 Animation Timing Reference

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Badge appear | 280ms | ease-out-back (cubic-bezier 0.34, 1.56, 0.64, 1) |
| Badge count pulse | 150-200ms | ease-in-out |
| Badge disappear | 180ms | ease-in |
| Toast enter | 250-350ms | ease-out |
| Toast exit | 200ms | ease-in |
| Bell shake | 500ms | linear (keyframed) |
| Swipe spring-back | 300ms | spring (underdamped) |
| Group expand | 200-400ms | ease-out (staggered) |
| Group collapse | 250ms | ease-in |
| Mark-as-read bg | 300ms | ease-in-out |

---

## 5. Anti-Patterns

**1. Notification overload** — Too many pushes cause opt-out. Research: 1 push/week leads to 10% disabling, 6% uninstalling. Fix: notification budgets, urgency throttling, intelligent batching.

**2. No notification preferences** — Binary on/off forces all-or-nothing choice. Fix: granular per-type, per-channel, per-source preferences. Discord's cascading hierarchy is the gold standard.

**3. Permission request on first launch** — Requesting push permission before users understand value yields low opt-in. Fix: delay to 4th-6th session (Localytics). Use pre-permission screen explaining value.

**4. Notifications without actions** — Informing without providing a way to act forces unnecessary app launches. Fix: every notification should deep-link to relevant content and support quick actions.

**5. Unclear notification source** — Users cannot determine which app/feature/person generated it. Fix: always display source. GitHub's "reason" metadata is exemplary.

**6. No mark-all-read** — Hundreds of unread items with no bulk action creates anxiety-inducing badge counts. Fix: "Mark all as read" at top, per-category bulk actions, "Clear all" with confirmation.

**7. Breaking deep links** — Tapping notification opens home screen instead of referenced content. Fix: robust deep-linking with fallback. Handle deleted/inaccessible content with explanatory message.

**8. Notification spam causing opt-out** — Aggressive re-engagement ("You haven't visited in 3 days!") or marketing disguised as transactional erodes trust. Fix: separate transactional from marketing. Respect engagement patterns.

**9. No snooze/remind-later** — Can only act now or dismiss permanently. Fix: snooze with preset times (1h, 3h, tomorrow). Gmail's pattern is well-understood.

**10. Stale notifications** — Expired/irrelevant/already-actioned items cluttering history. Fix: implement TTL, auto-archive completed events, show "Event has passed" for time-bound items.

**11. Toasts blocking content** — Overlaying navigation, submit buttons, or critical content. Fix: position where they don't overlap interactive elements. Ensure always dismissible.

**12. Identical cross-channel delivery** — Same notification via push + email + in-app simultaneously. Fix: channel escalation (Notion pattern: desktop first, mobile after 5min inactivity).

**13. Ignoring platform conventions** — Custom notification UIs that violate OS patterns. Fix: follow Apple HIG and Material Design 3 for structure and interaction. Customize content, not mechanics.

---

## 6. Accessibility

### 6.1 Screen Reader Announcements (WCAG 4.1.3)

Status messages must be programmatically determinable via ARIA roles/properties without requiring focus change.

```html
<!-- Non-urgent status (toast confirmations, updates) -->
<div role="status" aria-live="polite" aria-atomic="true">
  <!-- Inject notification text dynamically -->
</div>

<!-- Urgent alerts (errors, critical warnings) -->
<div role="alert" aria-live="assertive" aria-atomic="true">
  <!-- Inject alert text dynamically -->
</div>

<!-- Notification log (activity feed) -->
<div role="log" aria-live="polite" aria-relevant="additions">
  <!-- Append new notifications -->
</div>
```

**Rules:** Live region container must exist in DOM before content injection. Use `aria-atomic="true"` so full text is read. `role="status"` (polite) for non-urgent; `role="alert"` (assertive) for urgent — use sparingly. Never set `aria-live` on the notification itself; set it on the container.

### 6.2 Focus Management
- Toasts must NOT steal focus. Use `aria-live` for announcement, not `focus()`.
- Opening notification center moves focus to list/heading.
- Each notification is focusable (link/button/listitem).
- Arrow keys for list navigation. Escape closes panel, returns focus to bell icon.
- Announce count on open: "Notifications, 5 unread."

### 6.3 Sound Alternatives
- **Visual:** Screen flash, persistent badge, animated icon (bell shake), LED indicator
- **Haptic:** Distinct vibration patterns per type (long for critical, double-tap for important, single for informational)
- **System integration:** Respect iOS "LED Flash for Alerts", hearing aid protocols

### 6.4 Visual Design
- Never use color alone for urgency (WCAG 1.4.1) — pair with icon + text label
- Badge colors: 3:1 minimum contrast against background (WCAG 1.4.11)
- Notification text: 4.5:1 contrast (WCAG 1.4.3)
- Unread state: use font-weight differentiation, not just color
- Touch targets: 44x44px (iOS) or 48x48dp (Android) minimum

### 6.5 Cognitive Accessibility
- Allow disabling non-essential notification categories
- Provide "notification quiet mode" for batching all non-critical
- Use plain language, no jargon or anxiety-inducing phrasing ("URGENT," "ACT NOW")
- Include enough context to understand without opening app (who, what, where)
- Avoid ever-growing badge counts for non-actionable items
- Show "You're all caught up" when notification center is empty

### 6.6 Motion Accessibility
Respect `prefers-reduced-motion`: disable bell shake, badge bounce, toast slide-in, expand/collapse animations. Replace with instant state changes (opacity swap, no transform). Ensure auto-dismiss timing is not the only interaction path.

---

## 7. Cross-Platform Adaptation

### 7.1 iOS
- **Notification groups:** Custom grouping via `threadIdentifier`. Users expand/collapse.
- **Notification Summary:** Scheduled delivery of non-urgent notifications. On-device ML ranks by relevance.
- **Focus modes:** Per-activity filters. Apps declare interruption levels to participate.
- **Interruption levels:** `.passive` (silent), `.active` (default), `.timeSensitive` (breaks Focus), `.critical` (breaks everything, entitlement required).
- **Live Activities:** Real-time lock screen updates for ongoing events.
- **Rich notifications:** Custom UI via Notification Content Extensions.

### 7.2 Android
- **Notification channels:** Required on API 26+. Per-channel name, importance, sound, vibration. Users customize/disable individually. Importance cannot be changed programmatically after first notification.
- **Importance levels:** MAX (heads-up + peek), HIGH (heads-up), DEFAULT (sound), LOW (silent), MIN (no status bar), NONE (disabled).
- **Styles:** BigTextStyle, BigPictureStyle, InboxStyle, MediaStyle, MessagingStyle (enables bubbles + smart replies).
- **Direct reply:** Inline text input in notification shade.
- **Bubbles:** Chat-head floating notifications for ongoing conversations.

### 7.3 Web
- **Notification API:** Browser-native notifications requiring explicit permission. States: `default`, `granted`, `denied`. Once denied, user must change in browser settings.
- **Permission UX:** Never request on page load. Two-step pattern: custom in-app prompt explaining value, then browser dialog on user click. HTTPS required.
- **Push API:** Server-initiated via Service Worker, works when browser/tab closed.
- **Tab indicators:** `document.title` manipulation for unread count ("(3) App Name"). Badge API for favicon (limited support).

### 7.4 In-App Notification Center Layouts

**Dropdown panel:** 350-450px wide, max 60vh height. Opens below bell icon.
Best for web apps with moderate notification volume. Closes on outside click.

**Slide-in drawer:** Full-height panel from right edge, 320-400px wide.
Best for apps with rich notification content and filter/search capabilities.

**Full-page view:** Dedicated notification page or screen. Best for mobile
apps and high-volume systems (GitHub, Linear). Allows deep filtering and search.

**Split view:** Notification list on left, detail on right. Best for desktop
apps with complex notification content requiring preview without navigation.

**Responsive adaptation:**
- Desktop: dropdown panel or side drawer
- Tablet: full-width drawer or half-sheet modal
- Mobile: full-screen view with back navigation

**Essential features for all layouts:**
- Unread count in header
- Filter/segment tabs (All, Unread, Mentions, etc.)
- Mark all as read button
- Individual notification actions (archive, mute, snooze)
- Settings shortcut (gear icon linking to notification preferences)
- Empty state with clear messaging ("You're all caught up")
- Loading state for async notification fetch
- Error state with retry action

---

## 8. Decision Tree

### 8.1 Push vs. In-App vs. Email

```
User active in app? --> YES --> In-app (toast for feedback, badge for awareness)
                    --> NO  --> Time-sensitive?
                                --> YES --> Critical? --> Push + email + SMS
                                                     --> Push only (respect DND)
                                --> NO  --> Digest? --> Email summary
                                                   --> Queue for next session (in-app only)
```

### 8.2 Urgency Classification

```
Data loss / security / financial risk? --> CRITICAL (bypass DND, persistent, action required)
Personally addressed + direct mention? --> IMPORTANT (push + in-app, badge count)
Subscribed thread activity?            --> INFORMATIONAL (in-app only, dot badge)
General system/product update?         --> INFORMATIONAL (banner or digest)
None of the above?                     --> Do not notify (use activity log instead)
```

### 8.3 When to Batch

| Type | Batch Strategy |
|------|---------------|
| Transactional (orders, security) | Never batch. Deliver immediately. |
| Direct communication (DMs, mentions) | Batch only during quiet hours. |
| Activity updates (likes, follows) | Batch aggressively. "5 people liked your post." |
| System updates (changelog) | Periodic digests. Weekly email or in-app banner. |
| Marketing (promotions) | Batch and cap. Max 1-2 per week. |

### 8.4 Toast vs. Banner vs. Modal

```
Response to user action?
  --> Simple confirmation? --> TOAST ("File saved", auto-dismiss 5-8s)
  --> Requires decision?   --> MODAL DIALOG ("Delete? Cannot be undone.")
  --> Undoable action?     --> TOAST + action ("Deleted. [Undo]", 8-10s)
System-wide announcement?  --> BANNER (persistent, dismissible, top of viewport)
Real-time update?          --> IN-APP NOTIFICATION (badge + notification center)
None of the above?         --> Do not notify. Update passive indicators.
```

---

## Platform Quick Reference

### iOS Interruption Levels

| Level | Sound | Banner | Focus | Use For |
|-------|-------|--------|-------|---------|
| `.passive` | No | No | Respects | FYI, activity feed |
| `.active` | Yes | Yes | Respects | DMs, mentions |
| `.timeSensitive` | Yes | Yes | Breaks through | Expiring invites, reminders |
| `.critical` | Yes | Yes | Breaks through | Health/security (entitlement required) |

### Android Importance Levels

| Level | Sound | Heads-up | Status Bar | Use For |
|-------|-------|----------|------------|---------|
| MAX (5) | Yes | Yes (peek) | Yes | Calls, alarms |
| HIGH (4) | Yes | Yes | Yes | Messages, mentions |
| DEFAULT (3) | Yes | No | Yes | Updates, reminders |
| LOW (2) | No | No | No | Recommendations |
| MIN (1) | No | No | No | Background info |

---

## Implementation Checklist

### Server-Side

- [ ] Event-driven notification generation (pub/sub or message queue)
- [ ] User preference service with per-channel, per-type granularity
- [ ] Notification template engine with localization support
- [ ] Rate limiting and notification budget enforcement
- [ ] Delivery tracking (sent, delivered, opened, dismissed)
- [ ] Batch/digest aggregation engine with configurable windows
- [ ] TTL management for time-bound notifications
- [ ] Offline queue with deduplication on delivery
- [ ] Channel escalation logic (e.g., in-app first, push after delay)

### Client-Side

- [ ] Real-time notification transport (WebSocket / SSE / long polling)
- [ ] Local notification state management (read/unread, dismissed)
- [ ] Badge count synchronization across tabs and devices
- [ ] Deep-link routing for every notification type
- [ ] Notification permission state management and pre-prompt UX
- [ ] Offline notification queue with reconnection handling
- [ ] Accessibility: aria-live regions for all dynamic notifications
- [ ] Animation system with `prefers-reduced-motion` support
- [ ] Notification center with filter, search, and bulk actions

### Testing

- [ ] Push delivery verified on iOS, Android, and web
- [ ] Deep-link navigation tested for every notification type
- [ ] Preferences correctly suppress and allow notifications
- [ ] Badge counts update accurately across all state changes
- [ ] Toast auto-dismiss meets 5-second accessibility minimum
- [ ] Screen reader announces toast/snackbar/banner content
- [ ] Keyboard navigation works throughout notification center
- [ ] Focus management correct on open/close of notification panel
- [ ] Notification behavior correct during DND / Focus modes
- [ ] Offline-to-online delivery and deduplication verified
- [ ] Expired notification handling (TTL) tested
- [ ] Notification overflow behavior at 99+ items
- [ ] `prefers-reduced-motion` disables all notification animations
- [ ] Cross-device read-state synchronization
- [ ] Email unsubscribe link functions correctly

---

## Key Sources

- Apple HIG — Notifications (developer.apple.com/design/human-interface-guidelines/notifications)
- Apple HIG — Managing Notifications (developer.apple.com/design/human-interface-guidelines/managing-notifications)
- Material Design 3 — Notifications (m3.material.io/foundations/content-design/notifications)
- Material Design 3 — Badges (m3.material.io/components/badges/guidelines)
- NNG — Five Mistakes in Push Notifications (nngroup.com/articles/push-notification/)
- NNG — Indicators, Validations, Notifications (nngroup.com/articles/indicators-validations-notifications/)
- WCAG 2.2 SC 4.1.3 — Status Messages (w3.org/WAI/WCAG22/Understanding/status-messages.html)
- W3C — Cognitive Accessibility (w3.org/TR/coga-usable/)
- Sara Soueidan — Accessible Notifications with ARIA Live Regions (sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/)
- Smashing Magazine — Design Guidelines for Better Notifications UX (smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)
- Carbon Design System — Notification Pattern (carbondesignsystem.com/patterns/notification-pattern/)
- Android Developers — Notification Channels (developer.android.com/develop/ui/views/notifications/channels)
- web.dev — Permission UX (web.dev/articles/push-notifications-permissions-ux)
