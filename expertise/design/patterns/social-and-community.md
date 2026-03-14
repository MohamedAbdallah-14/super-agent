# Social and Community Patterns — Design Expertise Module

> A social and community design specialist architects the interaction systems that connect people: profiles, feeds, messaging, reactions, groups, and moderation. The scope spans real-time and asynchronous communication, identity and privacy, content creation and consumption, community governance, and the ethical responsibilities that accompany platforms designed to capture human attention. This module codifies patterns drawn from the best (and worst) practices across Discord, Slack, Reddit, Instagram, LinkedIn, and Mastodon.

---

## 1. Pattern Anatomy

### 1.1 Profiles

The profile is the atomic unit of social identity. Every interaction in a community traces back to a profile.

**Core components:**
- **Avatar / photo** — circular crop (40-64 px in lists, 96-128 px on profile page), with a fallback to initials or a generated identicon.
- **Display name** — the human-readable label; distinct from the unique handle/username.
- **Handle / username** — unique, immutable or change-limited identifier (e.g., `@username`). Used for mentions and deep links.
- **Bio / about** — 160-300 character limit is standard (Twitter: 160, Instagram: 150, LinkedIn: 2600). Keep the input a textarea, not a single-line field.
- **Status indicator** — online/offline/away/DND (Discord, Slack). Use color plus icon, never color alone (WCAG 1.4.1).
- **Metadata row** — follower/following counts, join date, location, links. NNG advises against over-emphasizing vanity metrics; show them but do not make them the visual focal point.
- **Activity feed / content tab** — posts, comments, or contributions authored by the user.
- **Action buttons** — Follow, Message, Block, Report. Primary action (Follow/Connect) uses a filled button; destructive actions (Block/Report) sit behind a "more" overflow menu.

**Profile privacy tiers:**
| Tier | Visibility | Use case |
|------|-----------|----------|
| Public | Anyone can view full profile | Open communities, creator platforms |
| Semi-private | Bio visible; content requires follow approval | Instagram private accounts |
| Private | Visible only to approved connections | LinkedIn connection-gated profiles |
| Anonymous | Pseudonymous handle, no real identity required | Reddit, Mastodon |

### 1.2 Feeds

The feed is the central content consumption surface. Its design directly shapes engagement, time-on-platform, and user well-being.

**Feed architectures:**
- **Reverse-chronological** — newest first. Predictable, transparent, user-controlled. Used by Mastodon, early Twitter, and as a toggle in Instagram. NNG recommends offering this as a default or prominent option because users report higher trust when they understand ordering.
- **Algorithmic / ranked** — scored by engagement signals, relationship strength, content type. Used by Instagram Explore, LinkedIn, TikTok For You. Higher engagement but lower user agency.
- **Hybrid** — algorithmic with a "Latest" toggle or "Following" tab (Instagram 2023+, X/Twitter).

**Feed item anatomy:**
```
┌─────────────────────────────────────────┐
│ [Avatar] Display Name · @handle · 2h    │  ← Author row
│                                         │
│ Post body text or media content         │  ← Content area
│ [Image / Video / Link Preview / Poll]   │
│                                         │
│ 💬 12   🔁 4   ❤️ 89   📤 Share         │  ← Action bar
│─────────────────────────────────────────│
│ Top comment preview (collapsed)         │  ← Engagement hook
└─────────────────────────────────────────┘
```

**Feed performance rules:**
- Initial load: 10-20 items. Lazy-load subsequent batches on scroll or via a "Load more" button.
- Skeleton screens during load (not spinners) — NNG research shows skeleton screens reduce perceived wait time.
- Virtualized rendering for lists exceeding 100 items (react-window, RecyclerView, UICollectionView).
- New content indicator: "X new posts" pill at top; never auto-inject content and shift the user's scroll position.

### 1.3 Comments and Threads

**Threading models:**
- **Flat** — all comments at the same level, sorted by time or votes (early YouTube, simple forums).
- **Nested / threaded** — replies indent under parent comments (Reddit, Hacker News). Limit nesting depth to 4-6 levels on mobile to prevent horizontal overflow.
- **Linear with quotes** — flat list but replies quote the parent (Discord, Slack threads). Preserves chronological flow while maintaining context.

**Implementation guidance:**
- Show reply count and a "View replies" expander for collapsed threads.
- Provide a "Jump to parent" link when viewing deeply nested replies.
- Render a vertical connector line between parent and children for visual continuity.
- Limit initial comment display to 3-5 top-level comments; use "View all N comments" to expand.
- Support rich text (bold, italic, links, code blocks) but sanitize all HTML to prevent XSS.

### 1.4 Reactions and Likes

**Reaction spectrum:**
| Type | Example | Pros | Cons |
|------|---------|------|------|
| Binary like | Instagram heart, Twitter/X like | Simple, low friction | No nuance |
| Emoji reactions | Slack, Discord, Facebook | Expressive, lightweight | Can clutter |
| Upvote/downvote | Reddit, Stack Overflow | Community curation | Downvote discourages participation |
| Custom reactions | Discord server emojis | Community identity | Moderation complexity |

**Design rules:**
- The tap target for reaction buttons must be at least 44x44 CSS pixels (WCAG 2.5.5 AAA) or minimum 24x24 (WCAG 2.5.8 AA).
- Show aggregate count next to each reaction. Group identical reactions: "👍 12 ❤️ 5" rather than listing each individually.
- Animate the transition from un-reacted to reacted state (see Micro-Interactions, Section 5).
- Allow users to see who reacted (member list on hover/tap) unless the community is anonymous.
- Never auto-react or pre-select a reaction on behalf of the user.

### 1.5 Messaging and Chat

**Messaging paradigms:** DMs (1:1), Group DMs (2-10 participants, ad hoc), Channels/rooms (persistent, topic-based — Slack, Discord), and Threads within channels (branched side conversations).

**Chat UI essentials:**
- Message input anchored to bottom. Auto-grow textarea up to 4-6 lines, then scroll internally.
- Timestamp grouping with date separators; collapse timestamps for messages within 5 minutes.
- Sender grouping: consecutive same-sender messages collapse avatar/name.
- Unread divider line at first unread message.
- Message actions on hover (web) or long-press (mobile): Reply, React, Edit, Delete, Pin, Copy Link.

### 1.6 Groups and Channels

**Hierarchy:** Community/Server > Category (grouping label) > Channel (text, voice, forum, announcement, stage). Discord exemplifies this with categories grouping channels, voice channels for real-time audio, and forum channels for structured async discussion.

**Channel types:** Text (persistent, searchable), Voice (real-time audio/video/screenshare), Forum (threaded topics with titles — Discord Forum, Discourse), Announcement (admin-only posting, thread-based discussion), Stage (structured audio events with speakers/audience).

**Group governance:**
- Role-based access control (RBAC): Owner > Admin > Moderator > Member > Guest.
- Channel-level permission overrides for restricting posting to specific roles.
- Membership models: invite-only, open join, or approval-required.

### 1.7 Follow and Friend

**Relationship models:** Asymmetric follow (Twitter, Instagram, Mastodon — low friction, no reciprocation needed), Symmetric friend (Facebook, LinkedIn — mutual required, higher trust), Hybrid (LinkedIn follow vs. connect — asymmetric follow plus symmetric connection).

**UX rules:**
- Follow button provides immediate visual feedback (filled state, label change to "Following").
- Unfollow requires confirmation or toggle, not a destructive one-tap action.
- Offer "Mute" to hide content while preserving the follow relationship (less socially costly than unfollowing).

### 1.8 Mentions and Tagging

**Mention types:** User (`@username` — triggers notification, autocomplete after 1-2 chars), Channel (`#channel-name` — clickable link), Group/role (`@everyone`, `@moderators` — permission-gated to prevent spam), Hashtags (`#topic` — categorization/discovery), Photo tags (user profile linked to image region — requires consent settings).

**Autocomplete requirements:** Fuzzy matching on display name and username, avatar thumbnail for disambiguation, keyboard navigable (arrow keys + Enter), limited to 5-8 suggestions.

### 1.9 Content Creation and Posting

**Content composer anatomy:**
```
┌─────────────────────────────────────────┐
│ [Avatar] What's on your mind?           │  ← Prompt / placeholder
│                                         │
│ [Rich text area with formatting toolbar]│
│                                         │
│ [Attached media preview strip]          │
│                                         │
│ ┌────┬────┬────┬────┬─────────┬──────┐  │
│ │ 📷 │ 🎥 │ 📎 │ 📊 │ Audience│ Post │  │  ← Attachment + audience + submit
│ └────┴────┴────┴────┴─────────┴──────┘  │
└─────────────────────────────────────────┘
```

**Content types:** Text (rich formatting), Images (single or carousel), Video (upload/embed with auto-captions), Link previews (Open Graph), Polls (2-4 options, configurable duration), Stories (24-hour ephemeral, full-screen vertical).

**Creation flow best practices:**
- Auto-save drafts every 30 seconds or on blur.
- Character count visible at 80% of limit. Alt text prompt for attached images (W3C ATAG requirement).
- Audience selector defaults to user's last-used setting.
- Preview mode before publishing. Edit window: 5-15 min or indefinitely with visible history (Mastodon, Slack).

### 1.10 Moderation

**Moderation layers (defense in depth):**
1. **Automated pre-moderation** — content scanned before publishing (spam filters, NSFW detection, keyword blocklists).
2. **Community reporting** — users flag content via a structured report flow (see User Flow Mapping, Section 4).
3. **Human moderator review** — queued reports triaged by severity; moderators see context (post, reporter, history).
4. **Appeals process** — users can contest moderation decisions through a clear, discoverable flow.

**Moderation actions (tiered consequences):**
| Severity | Action | Example trigger |
|----------|--------|----------------|
| Low | Warning / content label | Borderline language |
| Medium | Content removal + notice | Policy violation |
| High | Temporary mute/ban (1-30 days) | Repeated violations |
| Critical | Permanent ban + content purge | Hate speech, threats, illegal content |

**Moderation UX principles:** Guidelines in plain language shown during onboarding (Arena, 2025). Report flows under 4 taps. Reporter feedback on outcomes. Moderator dashboards with full context (flagged content, conversation, user history). Transparency reports for community trust.

---

## 2. Best-in-Class Examples

### 2.1 Discord

**Strengths:** Server/channel hierarchy with fine-grained RBAC per channel. Colored roles as both access control and visual identity. Always-on voice channels lower the barrier to real-time conversation. Forum channels bridge chat and threaded discussion. Custom emoji per server foster community identity. Server-level onboarding with rules acceptance, role selection, and channel opt-in.

**Weaknesses:** Limited server discoverability (no federated search). Threading in text channels is bolted-on vs. first-class. Accessibility gaps in voice controls and screen reader navigation.

### 2.2 Slack

**Strengths:** First-class threaded conversations keep main channel clean. Best-in-class search with filters (`from:`, `in:`, `has:`, `before:`). Rich integration/bot ecosystem with interactive message blocks. Huddles bridge sync and async communication. Channel topics and bookmarks for persistent orientation.

**Weaknesses:** Information architecture degrades at scale (hundreds of channels cause discovery paralysis). Free tier limits message history. No built-in community moderation tools (designed for workplaces).

### 2.3 Reddit

**Strengths:** Definitive nested comment threading with expand/collapse. Upvote/downvote for community-driven content curation. Subreddit autonomy (own rules, flair, theme). Post and user flair system for categorization and identity. Multiple interface paradigms (Old/New Reddit) prove value of separating content architecture from presentation.

**Weaknesses:** Downvote routinely misused for disagreement vs. quality. Inconsistent moderator tooling; volunteer burden. Anonymous culture enables toxicity in poorly moderated subreddits.

### 2.4 Instagram

**Strengths:** Visual-first feed with full-bleed images/video. Stories format (ephemeral, interactive stickers) pioneered low-stakes sharing. Carousel posts for multi-image narratives. Close Friends for audience segmentation. Seamless shopping integration via product tags.

**Weaknesses:** Algorithmic feed opacity frustrates creators. Optional like-count hiding is inconsistently implemented. Flat-only comments limit discussion depth. Heavy reliance on dark patterns for engagement (see Section 6).

### 2.5 LinkedIn

**Strengths:** Profiles as structured resumes (experience, education, skills, endorsements). Network distance transparency ("2nd degree"). Unified feed, job listings, and messaging. Written recommendations as social proof.

**Weaknesses:** Feed algorithm rewards engagement bait over substance. InMail spam from recruiters. Complex, scattered privacy controls. Extreme notification overload from aggressive defaults.

### 2.6 Mastodon

**Strengths:** Federated/decentralized via ActivityPub — users choose value-aligned instances. Antiviral design: no quote-tweets, no algorithmic amplification, no engagement metrics in feeds (UX Collective). First-class content warnings (CW) with click-to-reveal. Edit with public history for accountability. Chronological Home/Local/Federated timelines. Per-post privacy (Public, Unlisted, Followers-only, Direct).

**Weaknesses:** High-friction onboarding (instance selection confuses newcomers). Cross-instance discovery limited by design. UI polish lags behind commercial platforms.

---

## 3. User Flow Mapping

### 3.1 Sign Up to First Value

```
Landing Page → Sign Up (Email/OAuth) → Email Verification (code/magic link)
  → Profile Setup (avatar, display name, bio, interests)
  → Discovery (suggested people, communities, trending content)
  → First Follow/Join (3-5 accounts, 1-2 communities)
  → Populated Feed → First Engagement (like → comment → create post)
```

**Key metrics:** Time to first value (TTFV) under 3 minutes. Activation rate: % performing one engagement within 24h. NNG recommends progressive disclosure: minimal upfront info, contextual profile completion prompts.

### 3.2 Content Creation and Editing

```
Compose Trigger (FAB mobile / prompt web / Cmd+N desktop)
  → Composer (text + formatting, media buttons, audience selector, auto-save)
  → Authoring (char count at 80%, alt text on images, @mention/#hashtag autocomplete, link preview)
  → Pre-publish Review (preview, confirm audience, optional schedule)
  → Publish (optimistic UI: appears immediately)
  → Post-publish (edit within window, delete with confirmation, view metrics)
```

### 3.3 Moderation Flow — Reporting

```
Kebab menu (⋯) → "Report" → Choose reason (Spam, Harassment, Hate speech,
  Misinformation, Nudity, Violence, IP violation, Other)
  → Optional context (free-text) → Submit → Confirmation message
  → Offer self-help ("Block/Mute this user?")
  → [Internal] Moderation queue (auto-categorized, AI pre-scored, human review)
  → Action taken → Reporter notified
```

### 3.4 Blocking and Muting

**Block flow:** Profile overflow menu > "Block @username" > Confirmation dialog explaining consequences ("They won't see your profile or message you. You won't see their content. They won't be notified.") > Blocked state: content mutually hidden, DM history hidden (not deleted), managed in Settings > Privacy > Blocked accounts.

**Mute flow:** Profile overflow menu > "Mute @username" > Mute options (posts, stories, notifications) with duration selector (24h / 7 days / indefinite) > Muted state: follow relationship preserved, content silently hidden, user NOT notified.

---

## 4. Micro-Interactions

### 4.1 Like / Reaction Animation

The like animation is the most-replicated micro-interaction in social design. Its purpose is to provide satisfying feedback that reinforces engagement.

**Implementation pattern:**
1. **Trigger** — tap/click the heart/like icon.
2. **State change** — icon fills with color (gray outline to red filled heart). Transition: 200-300ms ease-out scale transform (1.0 -> 1.3 -> 1.0).
3. **Particle effect** (optional) — small burst of particles or confetti radiating from the icon. Keep duration under 400ms.
4. **Count increment** — number beside the icon increments. Use a vertical slide animation for the digit change.
5. **Haptic feedback** (mobile) — light haptic tap on iOS (UIImpactFeedbackGenerator.light), short vibration on Android.

**Double-tap to like (Instagram pattern):**
- Large heart icon animates at the center of the image (scale 0 -> 1.2 -> 1.0, opacity 0 -> 1 -> 0 over 800ms).
- Must not be the only way to like; the icon button must also work (accessibility requirement).

### 4.2 Typing Indicator

**Design:**
- Three animated dots ("...") in a speech bubble, displayed in the chat area at the position where the next message will appear.
- Animation: dots pulse or bounce sequentially (150ms stagger between each dot, 600ms total cycle).
- Show the typing user's avatar or name alongside the indicator in group chats.
- Debounce: start showing after 500ms of continuous typing; hide after 3-5 seconds of inactivity.

**Privacy consideration:** Some users find typing indicators anxiety-inducing. Offer a toggle in settings to disable sending (not receiving) typing status. Mastodon does not implement typing indicators by design.

### 4.3 Read Receipts

**Implementation patterns:**
- **Check marks** (WhatsApp model): single check = sent, double check = delivered, blue double check = read.
- **Avatar stack** (Discord model): small avatars of users who have read the message appear below the message.
- **"Seen by" label** (Facebook Messenger): "Seen at 2:34 PM" below the last message.

**Critical UX rules:**
- Always provide a setting to disable read receipts (sending them). This is a privacy expectation.
- In group chats, show aggregate read status ("Seen by 4 of 6") rather than individual timestamps.
- Never use read receipts to create social pressure (e.g., highlighting "unread" messages to recipients).

### 4.4 Reaction Picker

**Interaction flow:**
1. **Trigger** — long-press (mobile) or hover + click the smiley icon (web) on a message.
2. **Picker appearance** — floating panel appears above or below the message with a row of 6-8 frequently used reactions.
3. **Expanded picker** — a "+" icon opens the full emoji picker with search and categories.
4. **Selection** — tap an emoji; the picker dismisses and the reaction appears beneath the message with a scale-in animation (0 -> 1.0 over 150ms).
5. **De-selection** — tapping the same reaction again removes it (toggle behavior).

**Design details:**
- The quick-reaction row should be customizable by the user (let them pick their 6 most-used emoji).
- Show a subtle bounce or pop animation on the selected emoji before it moves to the message.
- On web, support keyboard navigation within the picker (arrow keys, Enter to select, Escape to dismiss).

### 4.5 Comment Threading Expansion

**Interaction flow:**
1. **Collapsed state** — "View 12 replies" link below a parent comment with a vertical thread line.
2. **Tap to expand** — replies slide in with a staggered fade-in animation (50ms delay between each reply, max 5 visible initially).
3. **Load more** — if more than 5 replies exist, show "Load N more replies" at the bottom of the thread.
4. **Collapse** — tapping the thread line or a "Collapse" button slides replies out and returns to the collapsed state.
5. **Scroll anchor** — when expanding, the parent comment must remain visible; do not scroll the parent off-screen.

### 4.6 Message Send Animation

**Sequence:**
1. **Input submission** — message text clears from the input field.
2. **Optimistic render** — message bubble appears in the chat list immediately, styled with reduced opacity or a "sending" indicator.
3. **Confirmation** — when server confirms delivery, the bubble transitions to full opacity and the "sending" indicator is replaced by a timestamp or delivery check.
4. **Failure state** — if delivery fails, show a red exclamation mark with a "Retry" tap target. Never silently swallow send failures.

---

## 5. Anti-Patterns

### 5.1 Vanity Metrics Obsession

**Problem:** Platforms that make follower counts, like counts, and view counts the most prominent profile elements encourage performative behavior over genuine connection. Users optimize for metrics rather than meaningful engagement.

**Harm:** Anxiety, self-worth tied to numbers, content homogenization toward what "performs well."

**Solution:** De-emphasize counts (Instagram's optional like hiding), show them only to the content creator, or replace with qualitative signals ("Your post sparked a conversation" instead of "47 likes"). NNG advises designing for meaningful engagement metrics (comments, saves, shares) rather than passive ones (views, likes).

### 5.2 Infinite Scroll Without Boundaries

**Problem:** Feeds that load content endlessly with no natural stopping point exploit the human tendency to continue an activity that has no clear endpoint (Zeigarnik effect).

**Harm:** Users report losing track of time, spending more time than intended, and feeling worse after extended scrolling sessions.

**Solution:** Insert natural break points ("You're all caught up" — Instagram), daily usage dashboards, configurable time reminders ("You've been scrolling for 30 minutes"), or pagination with explicit "Load more" actions.

### 5.3 Notification Overload

**Problem:** Default notification settings that enable all notification types across email, push, and in-app simultaneously. Every like, follow, comment, and algorithmic suggestion triggers a notification.

**Harm:** Notification fatigue leads to users either disabling all notifications (losing important ones) or being constantly interrupted.

**Solution:** Conservative defaults (only DMs and mentions as push notifications). Batch non-urgent notifications into a daily digest. Provide granular notification settings grouped by category (interactions, follows, system, marketing). LinkedIn is a notable offender; Mastodon's minimal-by-default approach is exemplary.

### 5.4 Dark Patterns for Engagement

**Problem:** Deliberate design manipulation — pull-to-refresh mimicking slot machines, red badges creating clearing compulsion, "Someone viewed your profile" lure-back notifications, autoplay video inflating view counts, streak mechanics (Snapchat) punishing disengagement.

**Regulatory context:** EU Digital Services Act (2024) and EDPB explicitly name dark patterns as violations. California CPRA similarly restricts deceptive design.

### 5.5 Unclear Privacy Controls

**Problem:** Settings buried in deep hierarchies, using jargon, with defaults maximizing data exposure. Most users never change defaults.

**Solution:** Privacy settings one tap from profile. Plain-language descriptions. Quarterly privacy audit prompts. Default to most restrictive, let users opt into broader sharing.

### 5.6 No Content Moderation Infrastructure

**Problem:** Launching without moderation tooling. Toxic content drives away positive contributors ("evaporative cooling" effect) — a small number of bad actors destroy community culture.

**Solution:** Build moderation tooling before launch: automated pre-screening, moderator dashboards, clear guidelines, structured report/appeal flows (Section 3.3).

### 5.7 Algorithmic Filter Bubble

**Problem:** Engagement-optimized algorithms create echo chambers. Users are unaware their feed is curated, mistaking it for a representative view. Leads to polarization and reduced exposure to diverse perspectives.

**Solution:** Algorithmic transparency ("Why am I seeing this?"), chronological feed options, intentionally surface diverse perspectives, allow users to control and reset algorithmic preferences.

### 5.8 Forced Public Defaults

**Problem:** New posts, profiles, or activity default to "Public" visibility when a more restrictive default would better serve user interests.

**Harm:** Users accidentally share content with unintended audiences. Especially harmful for younger users or those in vulnerable situations.

**Solution:** Default to the most recently used privacy setting, or to "Followers Only" for new users. Show a clear privacy indicator on the compose screen. Require explicit confirmation when posting publicly for the first time.

### 5.9 Engagement Bait Amplification

**Problem:** Algorithms that reward posts with high engagement amplify controversial, outrageous, or emotionally manipulative content because it generates more reactions and comments.

**Harm:** Degrades content quality, rewards bad-faith participation, and creates a race to the bottom.

**Solution:** Weight engagement quality (comments, saves, shares) over quantity (likes, views). Penalize content flagged as "rage bait" or clickbait. Reddit's upvote/downvote plus time-decay algorithm is a reasonable (though imperfect) model.

### 5.10 Irreversible Actions Without Confirmation

**Problem:** Destructive actions (delete post, leave group, block user, send message) that execute immediately without confirmation or undo capability.

**Harm:** Accidental deletions, premature sends, unintended blocks.

**Solution:** Implement undo windows for soft-destructive actions (Gmail's "Undo Send" pattern — 5-10 second window). For hard-destructive actions (delete account, purge content), require re-authentication and a cooling-off period.

### 5.11 Hostile Onboarding

**Problem:** Excessive required information, contacts access, or engagement commitments before showing value. Users who grant contacts access regret it when the platform spams contacts.

**Solution:** Minimal required fields (email/OAuth + display name). Optional contacts import with clear data usage explanation. Content preview before requiring account creation (Reddit's lurker-friendly model).

### 5.12 Zombie Notifications

**Problem:** Notifications for non-events to re-engage lapsed users ("You haven't posted in a while!", "A post you might like"). Users perceive these as spam, eroding trust in all platform notifications.

**Solution:** Only notify about events the user expressed interest in. Never fabricate urgency. Respect frequency caps. One re-engagement email after 30 days is acceptable; daily push is not.

---

## 6. Accessibility

### 6.1 Alt Text for User-Generated Content

W3C ATAG requires authoring tools (including social media platforms) to assist users in providing accessible content.

**Requirements:**
- Inline alt text prompt when uploading images (not buried in settings).
- AI-generated alt text suggestions as starting point, user-editable (Instagram, X do this).
- "ALT" badge indicator on images with descriptions.
- Option to mark decorative images (empty alt attribute).
- Alt text stored as structured metadata, updatable independently of the image.

**WCAG:** SC 1.1.1 (Non-text Content, Level A).

### 6.2 Keyboard Navigation in Feeds

**Requirements:**
- Feed items reachable via Tab/arrow keys (`role="feed"` + `role="article"` — WAI-ARIA 1.2).
- Action buttons (like, comment, share) focusable and operable with Enter/Space.
- Page Down/Up triggers lazy loading. Skip link bypasses navigation/sidebar.
- New content loading must not move focus or disrupt scroll position.

**WCAG:** SC 2.1.1 (Keyboard, A), SC 2.4.1 (Bypass Blocks, A), SC 2.4.3 (Focus Order, A).

### 6.3 Screen Reader Support for Reactions

**Requirements:**
- Accessible labels on reaction buttons: `aria-label="Like, 47 likes"`.
- State changes announced via `aria-live="polite"` or `role="status"`.
- Reaction summaries as text: "Reactions: thumbs up 12, heart 5" — not raw emoji.
- Custom emoji (Discord, Slack) must include text name as accessible label.
- Reaction picker navigable by screen reader with named emoji, announced categories, and search.

**WCAG:** SC 4.1.2 (Name, Role, Value, A), SC 1.1.1 (Non-text Content, A).

### 6.4 Accessible Chat and Messaging

**Requirements:**
- New messages announced via `aria-live="polite"` (not "assertive" — avoids interrupting user).
- Message input labeled: `aria-label="Message #channel-name"`.
- Timestamps, sender, and content programmatically associated ("Jane Doe, 2:34 PM: Hello everyone").
- Typing indicators conveyed via `aria-live="polite"`: "Jane is typing."
- Custom emoji need `aria-label` (native Unicode handled by most screen readers).
- File attachments and media require accessible descriptions. Voice/video calls need captions.

**WCAG:** SC 1.3.1 (Info and Relationships, A), SC 4.1.3 (Status Messages, AA).

### 6.5 Accessible Forms in Social Features

- Visible labels on all inputs (not placeholder-only — SC 3.3.2). Error messages via `aria-describedby`.
- Multi-step flows indicate progress ("Step 2 of 4") visually and programmatically.
- Autocomplete dropdowns use `role="listbox"` + `role="option"` with `aria-activedescendant`.
- Touch targets minimum 24x24 px (SC 2.5.8, AA).

### 6.6 Cognitive Accessibility

- Clear, simple language for all UI text. Consistent navigation/layout across screens (SC 3.2.3, 3.2.4).
- Warn 60s before session timeout, allow extension (SC 2.2.1). Text resizable to 200% (SC 1.4.4).
- No autoplay media without immediately accessible pause/stop control.

---

## 7. Cross-Platform Adaptation

### 7.1 Mobile (iOS and Android)

**Navigation:** Bottom tab bar (max 5: Feed, Search, Create, Notifications, Profile). Swipe gestures for tab/content navigation. Pull-to-refresh for feeds.

**Content creation:** FAB for post creation (Android Material Design). Camera integration for Stories. Full-screen composer with auto-grow text area.

**Chat:** Message input anchored above keyboard. Swipe-to-reply on messages. Haptic feedback on send, reactions, long-press.

**Platform-specific:** iOS — SF Symbols, Dynamic Type, VoiceOver. Android — Material Design 3, TalkBack, edge-to-edge layout with system bar insets.

### 7.2 Web (Desktop and Responsive)

**Layout:** Three-column (left nav, center feed/chat, right details). Keyboard shortcuts via "?" modal (`J`/`K` navigate, `L` like, `R` reply, `N` new post).

**Responsive breakpoints:**
| Breakpoint | Layout | Sidebar behavior |
|-----------|--------|-----------------|
| > 1280px | 3-column | Both sidebars visible |
| 1024-1280px | 2-column | Right sidebar collapsed |
| 768-1024px | 2-column | Left sidebar collapsed to icons |
| < 768px | 1-column | Bottom tab navigation |

**Web-specific:** Drag-and-drop file upload. Multi-window/tab support (pop-out conversations). Browser Notification API for push. URL-driven state: every profile, post, channel, thread has a shareable permalink.

### 7.3 Desktop Apps (Electron / Native)

**Advantages over web:** System tray/menu bar for background notifications. Global keyboard shortcuts (Cmd+Shift+M to mute in Discord). Deeper OS integration (Finder/Explorer drag-and-drop, screen sharing, audio routing). Offline support with sync-on-reconnect.

### 7.4 Cross-Platform Consistency Principles

- **Core interactions identical** across platforms (like, comment, follow, message, create).
- **Adapt to platform conventions** (bottom tabs mobile, sidebar desktop; swipe mobile, hover desktop).
- **Synchronized state** in real time — dismissed notifications, read status, drafts, settings.
- **Shared design tokens** — colors, typography, spacing, radii defined in cross-platform design system.
- **Feature parity as goal, not rule** — camera stories on mobile, keyboard shortcuts on desktop are acceptable divergences.

---

## 8. Decision Tree

### 8.1 Real-Time vs. Asynchronous Communication

```
What is the primary use case?
│
├── Urgent coordination, live events, casual social hangout
│   └── REAL-TIME (chat, voice, video)
│       ├── Channels with live message flow (Discord, Slack)
│       ├── Voice channels / huddles
│       ├── Typing indicators and presence (online/offline)
│       └── Expectation: responses within minutes
│
├── Thoughtful discussion, knowledge sharing, documentation
│   └── ASYNCHRONOUS (forums, threads, posts)
│       ├── Threaded discussions with nested replies (Reddit, Discourse)
│       ├── Long-form posts with rich formatting
│       ├── No typing indicators or presence
│       └── Expectation: responses within hours or days
│
└── Both needed
    └── HYBRID
        ├── Chat channels + thread branching (Slack model)
        ├── Feed posts + real-time comments (Instagram Live)
        ├── Forum channels within a chat server (Discord Forum)
        └── Key: clearly separate sync and async spaces in the UI
```

**Design implications:**
- Real-time: invest in presence indicators, typing state, read receipts, push notifications, low-latency infrastructure (WebSockets).
- Async: invest in rich text editing, search, threading depth, email notification digests, content permanence.

### 8.2 Anonymous vs. Identified

```
What identity model serves your community?
│
├── Full real identity (legal name, photo, credentials)
│   └── IDENTIFIED
│       ├── Use case: professional networking, healthcare, finance
│       ├── Benefits: accountability, trust, professional credibility
│       ├── Risks: chilling effect on honest feedback, privacy concerns
│       ├── Examples: LinkedIn, workplace Slack
│       └── Design: verification badges, real-name policy, profile validation
│
├── Pseudonymous (consistent handle, no real identity required)
│   └── PSEUDONYMOUS
│       ├── Use case: most online communities, hobbyist forums, social media
│       ├── Benefits: creative freedom, reputation building without personal exposure
│       ├── Risks: sockpuppets, ban evasion, reduced accountability
│       ├── Examples: Reddit, Discord, Mastodon, most forums
│       └── Design: persistent identity, reputation systems, karma/trust levels
│
├── Fully anonymous (no persistent identity)
│   └── ANONYMOUS
│       ├── Use case: whistleblowing, sensitive support groups, confessions
│       ├── Benefits: maximum freedom of expression, safety for vulnerable users
│       ├── Risks: trolling, no accountability, difficult to moderate
│       ├── Examples: 4chan, anonymous feedback tools, some support forums
│       └── Design: strong moderation, rate limiting, IP-based restrictions
│
└── Layered (verified to platform, pseudonymous to community)
    └── HYBRID IDENTITY
        ├── Platform knows real identity; community sees pseudonym
        ├── Benefits: accountability (can be banned) + privacy (community doesn't know who you are)
        ├── Examples: some gaming platforms, verified-but-pseudonymous services
        └── Design: verification at sign-up, display name/handle system, reveal-on-mod-request
```

### 8.3 Open vs. Closed Community

```
Who should be able to join and participate?
│
├── Anyone can join, anyone can post
│   └── OPEN
│       ├── Use case: public forums, social media, open-source communities
│       ├── Benefits: maximum growth, diverse perspectives, low friction
│       ├── Risks: spam, trolling, low signal-to-noise ratio
│       ├── Moderation need: HIGH (automated + human)
│       ├── Examples: Reddit (public subreddits), Twitter/X, Mastodon (public instances)
│       └── Design: robust moderation tools, spam filters, community voting
│
├── Anyone can view, membership required to post
│   └── SEMI-OPEN
│       ├── Use case: knowledge communities, Q&A sites, news comment sections
│       ├── Benefits: lurkers can learn; contributors are accountable
│       ├── Risks: barrier may discourage participation
│       ├── Moderation need: MEDIUM
│       ├── Examples: Stack Overflow, GitHub Discussions
│       └── Design: clear "Join to participate" CTA, guest-viewable content
│
├── Approval required to join; content visible only to members
│   └── CLOSED
│       ├── Use case: private groups, paid communities, internal teams
│       ├── Benefits: high trust, curated membership, safe spaces
│       ├── Risks: echo chamber, slower growth, exclusionary dynamics
│       ├── Moderation need: LOW to MEDIUM
│       ├── Examples: Private Facebook Groups, paid Discord servers, Slack workspaces
│       └── Design: application/invite flow, member directory, onboarding rules acceptance
│
└── Invitation only, no public visibility
    └── PRIVATE
        ├── Use case: executive teams, sensitive working groups, family groups
        ├── Benefits: maximum privacy and trust
        ├── Risks: very limited growth, potential for insular thinking
        ├── Moderation need: LOW
        ├── Examples: Private Slack channels, WhatsApp groups, Signal groups
        └── Design: invite link management, member limit, end-to-end encryption
```

---

## 9. Quick Reference Checklist

Use this checklist when designing or auditing a social/community feature.

### Profiles
- [ ] Avatar with fallback (initials or identicon)
- [ ] Display name and unique handle/username
- [ ] Bio with character limit and clear affordance
- [ ] Privacy tiers (public/semi-private/private)
- [ ] Status indicator uses color + icon, not color alone
- [ ] Follow/Connect button with clear state change
- [ ] Block and Report accessible from profile (via overflow menu)

### Feeds
- [ ] Chronological option available (not solely algorithmic)
- [ ] Skeleton loading states (not spinners)
- [ ] "You're all caught up" boundary or natural stopping point
- [ ] New content indicator without auto-scrolling ("3 new posts" pill)
- [ ] Feed items are keyboard navigable (`role="feed"` + `role="article"`)
- [ ] Virtualized rendering for long lists

### Comments and Threading
- [ ] Reply threading with visual connector lines
- [ ] Collapse/expand for nested threads
- [ ] "View N replies" lazy loading
- [ ] Rich text support with HTML sanitization
- [ ] Jump-to-parent link for deep threads

### Reactions
- [ ] Tap targets meet WCAG 2.5.8 minimum (24x24 px)
- [ ] Accessible labels on reaction buttons (`aria-label`)
- [ ] Reaction state change announced to screen readers
- [ ] Aggregate count displayed; who-reacted list available
- [ ] Animation duration under 400ms

### Messaging
- [ ] Unread message indicator with divider line
- [ ] Timestamp grouping and sender collapsing
- [ ] New messages announced via `aria-live="polite"`
- [ ] Typing indicator with privacy toggle
- [ ] Read receipts with opt-out setting
- [ ] Retry mechanism for failed sends with visible error state

### Content Creation
- [ ] Auto-save drafts
- [ ] Alt text prompt for attached images (ATAG compliance)
- [ ] Audience/visibility selector with clear labels
- [ ] Character count at 80% threshold
- [ ] Preview before publish
- [ ] Edit capability (with history or time-limited window)

### Moderation
- [ ] Community guidelines visible during onboarding and always accessible
- [ ] Report flow completable in fewer than 4 taps
- [ ] Structured report reasons (not just free-text)
- [ ] Reporter receives outcome notification
- [ ] Moderator dashboard with context (post, conversation, user history)
- [ ] Appeals process discoverable from moderation notice
- [ ] Tiered consequences documented and applied consistently

### Notifications
- [ ] Conservative defaults (DMs and mentions only for push)
- [ ] Granular settings by notification type
- [ ] Batch/digest option for non-urgent notifications
- [ ] No zombie notifications or fabricated urgency
- [ ] Synchronized dismissal across platforms

### Privacy
- [ ] Privacy settings reachable within 2 taps from profile
- [ ] Plain-language descriptions for all settings
- [ ] Default to most restrictive sharing option
- [ ] Periodic privacy audit prompt
- [ ] Transparent algorithmic feed controls ("Why am I seeing this?")

### Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] Skip links for bypassing navigation
- [ ] Screen reader labels on all icons, buttons, and custom controls
- [ ] Alt text prompts for user-uploaded images
- [ ] Support for text resizing up to 200%
- [ ] Touch targets minimum 24x24 px (44x44 px recommended)
- [ ] No autoplay media without pause/stop control
- [ ] Color is never the sole indicator of state

### Cross-Platform
- [ ] Core interactions identical across platforms
- [ ] Platform-specific navigation conventions respected
- [ ] State synchronized in real time (read status, notifications, drafts)
- [ ] Design tokens shared via cross-platform design system
- [ ] Every view has a shareable permalink (web)

---

## References and Sources

- [Nielsen Norman Group — Social Media UX: User-Centered Social Strategies](https://www.nngroup.com/reports/social-media-user-experience/)
- [Nielsen Norman Group — Design Patterns Topic](https://www.nngroup.com/topic/design-patterns/)
- [Nielsen Norman Group — State of UX 2026](https://www.nngroup.com/articles/state-of-ux-2026/)
- [W3C WAI — Guidelines to Make Your Social Media Platform Accessible (ATAG)](https://www.w3.org/WAI/standards-guidelines/atag/social-media/)
- [W3C WAI — Authoring Tool Accessibility Guidelines (ATAG) Overview](https://www.w3.org/WAI/standards-guidelines/atag/)
- [W3C WAI — WCAG 2.2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Ethics of UX Design in Social Media — USC Viterbi](https://vce.usc.edu/semester/fall-2025/ethics-of-ux-design-in-social-media/)
- [Dark Patterns in 2025 — commonUX](https://www.commonux.org/ux-ethics/dark-patterns-in-2025-manipulation-by-design-or-design-for-manipulation/)
- [Algorithmic Addiction by Design — arXiv (2025)](https://arxiv.org/abs/2505.00054)
- [Content Moderation Best Practices for 2025 — Arena](https://arena.im/uncategorized/content-moderation-best-practices-for-2025/)
- [Content Moderation and Community Standards: Policy vs. User Experiences — Wiley (2025)](https://onlinelibrary.wiley.com/doi/abs/10.1002/poi3.70006)
- [Mastodon Antiviral Design — UX Collective](https://uxdesign.cc/mastodon-is-antiviral-design-42f090ab8d51)
- [Social Media Accessibility Best Practices — AccessibilityChecker.org](https://www.accessibilitychecker.org/blog/social-media-accessibility/)
- [Digital Accessibility in 2025: A Screen Reader User's Honest Take — UsableNet](https://blog.usablenet.com/a-screen-reader-users-honest-take)
- [Micro-interactions in UX — Interaction Design Foundation](https://ixdf.org/literature/article/micro-interactions-ux)
- [Profile Page Design Examples — Eleken](https://www.eleken.co/blog-posts/profile-page-design)
- [Breaking Down the UX of Social Media Platforms — Niamh O'Shea (2025)](https://niamh-oshea.medium.com/breaking-down-the-ux-of-social-media-platforms-1a966408dc4b)
- [Cross-Platform Design: Creating Seamless Experiences — TMDesign](https://medium.com/theymakedesign/cross-platform-design-creating-seamless-experiences-cadd77dba317)
- [Apple Human Interface Guidelines — Design for iOS](https://developer.apple.com/design/human-interface-guidelines/)
- [Google Material Design 3](https://m3.material.io/)
