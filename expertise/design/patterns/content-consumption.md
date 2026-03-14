# Content Consumption Patterns

> Design expertise module for feeds, articles, media players, and all content-consumption surfaces.
> Covers anatomy, best-in-class examples, user flows, micro-interactions, anti-patterns,
> accessibility, cross-platform adaptation, and decision frameworks.

---

## 1. Pattern Anatomy

### 1.1 Feeds

A feed is a reverse-chronological or algorithmically-ranked stream of content cards
that updates continuously. Feeds are the dominant content discovery surface on the
modern web and in mobile applications.

**Structural elements:**

- **Feed item / card** -- the atomic unit containing headline, media thumbnail,
  metadata (author, timestamp, engagement counts), and action affordances (like,
  share, save). Card anatomy varies by content type but should remain internally
  consistent within a single feed.
- **Feed header** -- houses filter tabs (For You | Following | Topics), search
  entry point, and optionally a story tray or featured content slot.
- **Interstitial slots** -- ads, suggested follows, or topic prompts injected
  between organic items at predictable intervals (every 5-8 items is common).
  Interstitials must be visually distinct from organic content to avoid deceptive
  patterns.
- **Loading boundary** -- the trigger point for fetching the next batch; can be a
  skeleton screen, shimmer placeholder, or "Load More" button depending on the
  scroll strategy.
- **Empty state** -- shown when the feed has no content (new user, filtered to
  zero results). Must guide the user toward action: "Follow topics to fill your
  feed" or "No results -- try different filters."

**Key principles (NNG):**

- Show 1.5-2.5 cards in the initial viewport to signal scrollability.
- Maintain consistent card height/aspect ratio to prevent layout shift.
- Preserve scroll position on back-navigation; losing position is a top user complaint.
- Provide clear visual separation between items (whitespace, dividers, or card edges).
- New content should appear via a non-intrusive banner ("5 new posts") rather than
  auto-inserting at the top, which causes disorienting layout shift.
- Feed items should communicate content type at a glance (video icon overlay, podcast
  waveform indicator, article read time badge).

### 1.2 Articles / Long-Form Reading

Article layouts prioritize sustained reading. The goal is to minimize distractions and
maximize typographic clarity so users can enter and maintain a flow state.

**Structural elements:**

- **Hero area** -- headline, byline, publish date, estimated read time, hero image or
  illustration. The hero sets the emotional tone and establishes content credibility.
- **Body content** -- structured with subheadings (H2/H3), pull quotes, inline images,
  embedded media, and code blocks where relevant. Well-structured body text enables
  both deep reading and scanning.
- **Progress indicator** -- a thin bar at the top of the viewport showing scroll
  percentage through the article (Medium's signature pattern).
- **Sticky utilities** -- floating actions for sharing, bookmarking, or adjusting
  reading preferences (font size, theme). These persist without obscuring content.
- **Table of contents** -- for articles exceeding 2,000 words, a sticky or collapsible
  TOC aids navigation. Can highlight the current section during scroll.
- **Related content** -- recommended articles at the article's end or in a sidebar
  on wider viewports. Surfaced based on topic, author, or reading history.
- **Comments / reactions** -- engagement section placed below the article body,
  never interrupting the reading flow.

**Typography (NNG, web.dev):**

- Body text: 16-20px, line-height 1.5-1.7, measure (line length) of 50-75 characters.
- Serif or humanist sans-serif fonts improve long-form readability.
- Adequate paragraph spacing (1em-1.5em between paragraphs).
- Dark-on-light as default; provide a dark mode toggle for low-light reading.
- Heading hierarchy must be visually distinct: size, weight, and spacing should
  clearly differentiate H1 from H2 from H3.

### 1.3 Media Players

**Video:** playback controls (play/pause, seek with preview thumbnails, volume, fullscreen,
speed, quality), overlay controls that auto-hide after 3-5s, captions toggle (default on),
Picture-in-Picture, theater/cinema mode.

**Audio:** persistent mini-player (bottom bar across navigation), queue management with
drag-to-reorder, playback controls (play/pause, skip, shuffle, repeat, seek), now-playing
view with album art and lyrics.

**Performance:** adaptive bitrate streaming (HLS/DASH), preload metadata only until user
initiates playback, reserve exact player dimensions to prevent CLS (web.dev target: < 0.1).

### 1.4 Carousels

NNG research shows users exhibit banner blindness toward carousels. Click-through rates
drop sharply after slide 1. Auto-forwarding carousels frustrate users by interrupting interaction.

**When carousels work:** homogeneous items of equal importance, gallery browsing, touch
devices where horizontal swipe is natural.

**Guidelines:** show partial next item to signal scrollability, provide visible controls
(arrows + dots), auto-forward at 1s per 3 words (NNG), pause on hover/focus, never
auto-forward on mobile, limit to 5-7 items.

### 1.5 Stories

Full-screen, ephemeral content consumed via tap-to-advance. Pioneered by Snapchat.

**Elements:** story tray (horizontal avatar row with unseen indicator rings), full-screen
viewer with tap zones (left=back, right=forward, hold=pause, swipe-down=dismiss),
segmented progress bars, interactive overlays (polls, stickers, links).

**Principles:** mobile-first, minimal chrome, auto-advance 5-7s for images, full duration
for video, haptic feedback on interactions.

### 1.6 Reader Mode

Strips navigation, ads, and chrome to present article text in an optimized layout.

**Approaches:** browser-native (Safari Reader, Firefox Reader View), app-native (Medium,
Pocket, Apple News), site-provided focus toggle. Features include adjustable font/size/spacing,
theme options (light/dark/sepia), text-to-speech, read time display, progress persistence.

**Implementation:** use semantic HTML (`<article>`, `<main>`, `<h1>`-`<h6>`) so browser
reader modes extract content correctly.

### 1.7 Infinite Scroll

**NNG guidance:** use when content is homogeneous and users browse without a specific goal
(social, news, galleries). Avoid for goal-oriented tasks, when footer access matters, or
for users with accessibility/bandwidth constraints.

**Requirements:** skeleton loading states, scroll position preservation on back-nav, URL
reflecting approximate position, "Back to top" button, progress indicator ("Showing 40 of ~200").

**Alternatives:** "Load More" button, hybrid pagination, traditional pages.

### 1.8 Pagination

**Advantages:** clear position/total awareness, bookmarkable pages, predictable performance,
footer access, better SEO (web.dev).

**Guidelines:** show current page + first/last + 2-3 adjacent, include Prev/Next with
keyboard shortcuts, persist state in URL, show result range ("21-40 of 312"), on mobile
consider "Load More" hybrid.

---

## 2. Best-in-Class Examples

### 2.1 Medium

**What they do well:**
- Clean, typographically focused reading with 680px content width and serif body text
  (Charter font), creating a book-like reading environment.
- Estimated read time displayed on every article card and at the article top, setting
  clear expectations before the user commits.
- Green scroll progress bar at the top of the viewport provides continuous feedback.
- Nuanced clap interaction (up to 50 claps per reader) allows graduated appreciation
  beyond a binary like/dislike.
- Series and publications provide content organization beyond individual posts.
- Highlighted text can be shared or commented on directly (inline annotation).

**Lessons:** read time estimates reduce bounce; progress indicators maintain reading
momentum; constrained content width improves readability; inline annotations encourage
deeper engagement.

### 2.2 YouTube

**What they do well:**
- Thumbnail-driven discovery with hover-to-preview (3-second silent GIF on desktop),
  reducing the cost of evaluating whether to watch.
- Video chapters with labeled timestamps in the seek bar and description dramatically
  improve navigation within long-form content.
- Picture-in-Picture and mini-player persist playback across page navigation.
- Shorts (vertical short-form) integrated alongside traditional long-form content using
  TikTok-style vertical swipe interface.
- Playback speed control (0.25x-2x) and comprehensive caption/subtitle support.
- Watch Later queue and playlist management for deferred consumption.
- Theater and fullscreen modes provide graduated levels of immersion.

**Lessons:** chapters improve long-content navigation; hover previews reduce evaluation
cost; persistent mini-player respects user investment in ongoing media; offering both
short-form and long-form on the same platform serves different consumption modes.

### 2.3 Twitter / X

**What they do well:**
- Dual-timeline model: "For You" (algorithmic) and "Following" (chronological) gives
  users agency over their consumption mode.
- "Show N new posts" banner prevents layout shift rather than auto-inserting content
  at the top, preserving the user's reading position.
- Bookmarks for private saving, distinct from public "likes," serving different intents.
- Lists for curated sub-feeds organized by topic, interest, or social circle.
- Threaded conversations with visible reply chains and quote retweets for commentary.
- Media previews inline (images, videos, link cards) with consistent aspect ratios.
- Real-time update model aligned with the platform's breaking-news identity.

**Lessons:** offering both algorithmic and chronological views respects diverse user needs;
private bookmarks vs. public likes serve fundamentally different intents; non-intrusive
new-content banners prevent disorienting layout shifts.

### 2.4 Spotify

**What they do well:**
- Persistent bottom mini-player with album art, track info, and core controls visible
  across every screen in the app.
- "Now Playing" full-screen view with lyrics synced to playback in real time.
- Discover Weekly and Daily Mix playlists demonstrate personalized algorithmic curation
  that users actively anticipate (habitual engagement).
- Offline download for premium users with clear download status indicators
  (downloading, downloaded, error).
- Spotify Connect enables seamless cross-device handoff between phone, desktop, speaker,
  car, and smart TV.
- TikTok-inspired vertical scroll feed for music and podcast discovery.
- Queue management with drag-to-reorder provides granular playback control.

**Lessons:** persistent players must never block primary content navigation; cross-device
continuity is a premium differentiator; download/offline status should be immediately
visible without opening a detail view.

### 2.5 Apple News

**What they do well:**
- Editorially curated "Top Stories" combined with algorithmic "Trending" and personalized
  "For You" sections, blending human judgment with machine learning.
- Magazine-quality layout with large hero images, typographic hierarchy, and sectioned
  browsing by topic (Apple News Format supports parallax headers, mosaics, pull quotes).
- Dynamic Type support for system-level font scaling, ensuring accessibility compliance
  across all content.
- Offline reading: articles are cached automatically for consumption without connectivity.
- "Save" functionality with a dedicated "Saved" tab in the primary navigation.
- Publisher branding preserved within a consistent reading chrome.

**Lessons:** editorial curation combined with personalization builds trust and discovery;
Dynamic Type is essential for inclusive design on Apple platforms; offline caching should
be seamless (automatic), not a manual download action.

### 2.6 Substack

**What they do well:**
- Newsletter-first design: email delivery as primary consumption channel, web as
  secondary. This inverts the typical web-first model and provides reliable delivery
  directly to the user's inbox.
- Minimal, distraction-free reading layout with wide text measure and generous line
  height -- no sidebar clutter, no ad placements.
- Threaded discussion section below articles encourages community engagement.
- Podcast and audio integration within the same publication interface.
- "Restacks" (similar to retweets) enable cross-publication discovery in the Substack
  app's Notes feed.
- Clear paywall demarcation: free preview content ends with an explicit boundary
  before subscriber-only sections begin.

**Lessons:** email as a consumption channel provides reliable content delivery outside
algorithmic gatekeeping; clean layouts without sidebars improve reading retention;
clear paywall boundaries prevent user frustration and build subscription trust.

### 2.7 TikTok

**What they do well:**
- Full-screen vertical video as the sole content unit provides maximum immersion with
  zero chrome distraction.
- Single-swipe navigation: swipe up = next video. Eliminates choice paralysis by
  removing browsing decisions entirely. Each swipe is a natural punctuation mark.
- Algorithmic "For You Page" eliminates the need for a social graph to discover
  content -- the algorithm finds content for the user based on engagement signals.
- Engagement controls positioned on the right edge (like, comment, share, save, sound)
  within easy thumb reach.
- Sound-on by default, aligned with the immersive full-screen paradigm (but captions
  are essential for accessibility and sound-off contexts).
- Creator tools integrated directly into the consumption flow, lowering the barrier
  between consuming and creating.

**Lessons:** removing navigation decisions increases engagement but raises ethical
questions about attention capture and compulsive use; full-screen video demands
sound-aware design (always provide captions); algorithmic discovery can outperform
social-graph-based discovery for content-first platforms.

---

## 3. User Flow Mapping

### 3.1 Core Flow
```
[Discovery]          [Evaluation]         [Consumption]        [Post-Consumption]
     |                    |                    |                      |
     v                    v                    v                      v
Browse Feed  --->  Preview/Scan  --->  Read/Watch/Listen  --->  React/Save/Share
     |                    |                    |                      |
     |-- Search           |-- Read headline    |-- Scroll/seek        |-- Like/clap
     |-- Explore          |-- View thumbnail   |-- Adjust settings    |-- Bookmark/save
     |-- Notifications    |-- Check read time  |-- Pause/resume       |-- Share
     |-- Recommendations  |-- Scan first para  |-- Take notes         |-- Comment
     |-- Deep links       |-- Check source     |-- Highlight          |-- Add to list
```

**Entry points into consumption:**

1. **Feed scroll** -- user opens app/site, begins scrolling the default feed.
2. **Search** -- user has intent, types a query, evaluates results.
3. **Notification** -- push or in-app alert draws user to specific content.
4. **Deep link** -- shared URL opens directly to content.
5. **Recommendation** -- algorithmic suggestion (email digest, "You might like").

**Transition to consumption:** the tap/click on a feed card is the critical conversion
point. Reduce friction with fast page load (< 2.5s LCP per web.dev), smooth animation
into the content view, and immediate content visibility. On mobile, shared-element
transitions (thumbnail expanding into hero image) provide spatial continuity.

### 3.2 Saving and Bookmarking

**User intents for saving:**

- "Read later" -- deferring consumption to a more convenient time or context.
- "Reference" -- saving content for future re-consultation or citation.
- "Curate" -- collecting content into themed collections, lists, or boards.
- "Share later" -- saving to forward to others at an appropriate time.

**Design requirements:**

- One-tap save with clear visual confirmation (icon state change + toast).
- Organization into folders, collections, or tags for retrieval.
- A dedicated "Saved" or "Library" section accessible from primary navigation.
- Cross-device sync so saved content appears on all logged-in surfaces.
- Offline availability for saved content, especially on mobile.
- Bulk management: select multiple, move to folder, delete, export.

### 3.3 Sharing

```
Tap Share --> Share Sheet --> Select Channel --> Confirm/Send
                 |
                 |-- Copy link (most used; always place first)
                 |-- Native share sheet (iOS/Android)
                 |-- Direct message within app
                 |-- Social platforms (quick-share icons)
                 |-- Email
                 |-- Embed code (for publishers/bloggers)
```

**Design considerations:** pre-populate share text with title and URL. Support deep
links that open to specific content position (timestamp for video, paragraph for
articles). Track share attribution for analytics without exposing user data. Provide
"Copied!" confirmation with haptic feedback when copying link.

### 3.4 Offline Reading

**Implementation patterns:**

- **Automatic caching** -- cache recently viewed and saved articles via Service Worker
  using a cache-first or stale-while-revalidate strategy. Users should not need to
  explicitly "download" content they have already viewed.
- **Explicit download** -- user taps a download icon; content is stored for offline
  access with clear status indicators (downloading, downloaded, error, update available).
- **Graceful degradation** -- when offline, show cached content with a subtle banner:
  "You're offline. Showing saved content." Hide actions that require connectivity
  (commenting, sharing) or show them disabled with a tooltip.
- **Sync on reconnect** -- queue actions taken offline (likes, bookmarks, progress
  updates) and sync when connectivity returns via Background Sync API.

**Technical approach (PWA):** Service Worker intercepts fetch requests and serves cached
responses. IndexedDB stores structured content (article text, metadata). Cache API stores
media assets. Background Sync API queues mutations for later execution.

### 3.5 Progress Tracking

**Types of progress:**

- **Scroll progress** -- percentage of article read, shown as a progress bar or
  percentage indicator. The primary metric for text content.
- **Media progress** -- timestamp position within audio/video content. Enables
  resume-where-you-left-off across sessions and devices.
- **Series progress** -- which episodes, chapters, or installments have been completed
  in a multi-part series. Shows both individual and overall completion.
- **Course progress** -- completion status across modules and lessons with milestones.

**Implementation:** store progress server-side for authenticated users, localStorage for
anonymous. Update on scroll events (debounced, every 5-10% increment to avoid excessive
writes). Display on feed cards: "45% read" or a subtle progress bar on the card thumbnail.
Allow users to mark content as "finished" or reset to "unread."

### 3.6 Read Position Memory

NNG research on spatial memory demonstrates that users build mental models of where they
are within content. Losing position forces re-orientation, increasing cognitive load and
causing frustration.

**Implementation approaches:**

- **Scroll position restoration** -- on back-navigation or app relaunch, restore the
  exact scroll position within an article or feed.
- **Last-read marker** -- a subtle visual indicator showing where the user previously
  stopped reading (Kindle's "furthest page read" model).
- **Feed position** -- when returning to a feed, show the last-seen position rather than
  jumping to the top with new content. Store the ID of the last-seen item rather than
  pixel offset (more resilient to content changes).
- **Cross-device sync** -- sync read position across devices so users can pick up where
  they left off (essential for long-form and serial content).

**Technical considerations:** store element anchor (more resilient to layout changes than
pixel offset) via Intersection Observer. Debounce position updates to avoid excessive
writes. For feeds, store the last-seen item ID rather than scroll offset.

---

## 4. Micro-Interactions

### 4.1 Pull-to-Refresh
User pulls down from scroll top. Resistance increases with distance (rubber-band physics).
Spinner or branded animation appears (threshold: 60-80px). Content refreshes; "Updated just
now" or "3 new posts" confirms. On web, use `overscroll-behavior: contain` to prevent
browser-native conflicts.

### 4.2 Scroll Progress Indicator

**Variants:**

- **Top bar** -- thin horizontal bar filling left-to-right as the user scrolls
  (Medium's signature pattern). Most common and least intrusive.
- **Side rail** -- vertical progress track on the right side with section markers,
  useful for long articles with distinct sections.
- **Floating indicator** -- small circle or badge showing percentage or minutes
  remaining. Less common but useful for minimal UIs.
- **Chapter dots** -- for sectioned content, dots indicating major content divisions
  with the current section highlighted.

**Technical implementation:**

```
progress = scrollTop / (scrollHeight - clientHeight)
```

Update on `requestAnimationFrame` for smooth rendering. Animate via `transform: scaleX()`
(GPU-composited) rather than `width` to avoid layout repaints. Use `will-change: transform`
on the progress element for GPU acceleration.

### 4.3 Bookmark Animation
Icon fills/changes color on tap (outline to solid). Brief scale-up animation (100ms to 1.2x,
ease back). Haptic feedback (light impact on iOS, click on Android). Confirmation toast:
"Saved to Reading List" with Undo action (available for 5+ seconds).

### 4.4 Share Sheet
Slides up from bottom with spring animation (300-400ms). Dim background overlay. Close on
tap outside, swipe down, or close button. Hybrid approach: custom sheet with top targets
(Copy Link, Messages, Twitter, Email) + "More..." for native sheet. "Copied!" with
checkmark animation for link copy.

### 4.5 Read Time Estimate
Formula: `Math.ceil(wordCount / 200)` (200-250 WPM average). Add 12s per image, media
duration for embeds. Display as "X min read" on cards and article headers. Can update
dynamically: "3 min left" based on scroll position.

### 4.6 Like / Reaction Animations

**Patterns across platforms:**

- **Twitter/X heart** -- outline to filled red with a brief particle burst animation.
- **Facebook reactions** -- long-press reveals emoji picker with float-up animation;
  selected reaction scales up with a bounce.
- **Medium clap** -- cumulative counter with bounce animation per clap; confetti at
  milestones.
- **TikTok heart** -- floating hearts rise from the tap point with physics-based drift.

**Guidelines:** keep animations under 300ms for tap-triggered interactions. Provide both
visual and haptic feedback. Support undo (un-like) with a reverse animation. Use CSS
animations or GPU-composited layers to avoid blocking the UI thread.

### 4.7 Content Loading States

**Skeleton screens:** render gray placeholder blocks matching the shape and layout of
incoming content. Use a shimmer animation (subtle left-to-right gradient sweep) to
indicate active loading. Skeleton screens reduce perceived load time by ~31% compared
to spinners (Bill Chung, 2020).

**Progressive image loading:** load a tiny blurred placeholder (LQIP -- Low Quality Image
Placeholder) and cross-fade to the full-resolution image on load. Use `loading="lazy"`
for off-screen images (web.dev). Set explicit `width` and `height` attributes on all
images to prevent CLS during load.

---

## 5. Anti-Patterns

### 5.1 Autoplay with Sound
Video/audio playing with sound on load without user initiation. Startles users, causes page
abandonment, violates accessibility guidelines. Browsers block it by default. **Fix:** autoplay
muted with visible toggle and captions; respect `prefers-reduced-motion`.

### 5.2 Content Shift During Scroll
Elements resize or ads load without reserved space, causing content to jump. Users lose
reading position; mis-taps on mobile. CLS > 0.25 is poor (web.dev). **Fix:** explicit
dimensions for all media, fixed-size ad containers, `content-visibility: auto` with
`contain-intrinsic-size`.

### 5.3 Infinite Scroll Without Progress
Endless scroll with no position/volume indication. Loss of orientation, contributes to
doomscrolling and regret. NNG warns against this specifically. **Fix:** show item count,
"Back to Top" button, URL position, hybrid pagination.

### 5.4 No Save/Bookmark Functionality
Content cannot be saved for later. Users resort to screenshots or self-messaging. Content
is less likely to be revisited or shared. **Fix:** one-tap save with collections, cross-device
sync, offline access.

### 5.5 Clickbait Titles
Headlines promise what the content does not deliver. Erodes trust, increases bounce, damages
platform credibility. **Fix:** editorial guidelines requiring specificity; honest headlines
often outperform clickbait in long-term retention.

### 5.6 Interstitials Blocking Content
Full-screen overlays (email capture, app-install, cookie mega-banners) before engagement.
Google penalizes intrusive interstitials. Users close reflexively. **Fix:** inline banners,
bottom sheets, delayed prompts (after 30s or 50% scroll), Smart App Banners.

### 5.7 Auto-Forwarding Carousels
Carousels rotating at designer-determined pace. Interrupts reading, inaccessible for motor
impairments. NNG confirms user frustration. **Fix:** pause on hover/focus, slow timing
(1s/3 words), clear manual controls.

### 5.8 Pagination Without State Preservation
Page state not in URL; refresh/back resets to page 1. Position loss, pages unshareable.
**Fix:** reflect page/filters in URL via `replaceState`.

### 5.9 Aggressive Push Notification Prompts
Permission request on first visit before user has experienced value. High dismissal; denied
permissions are permanent (browser limitation). **Fix:** prompt after meaningful engagement;
custom pre-prompt explaining value before browser dialog.

### 5.10 Disabling Text Selection
CSS `user-select: none` or JS event prevention. Prevents quoting, blocks assistive tech,
frustrates power users, does not prevent content theft. **Fix:** allow selection; append
attribution to copied text if needed.

### 5.11 Infinite Feeds Without Stop Mechanism
No natural stopping point, encouraging compulsive consumption. Exploits variable-ratio
reinforcement. Under regulatory scrutiny (EU DSA, US KIDS Act). Research: 24.8% increase
in mindless viewing from autoplay. **Fix:** time reminders, "You're all caught up" markers
(Instagram), chronological feeds with natural end.

### 5.12 Hidden or Broken Dark Mode
No dark mode, or dark mode with illegible content (images without backgrounds). Eye strain
in low-light, broken system-level inversion. **Fix:** robust dark mode via `prefers-color-scheme`,
test all content types in both themes, use semantic color tokens.

---

## 6. Accessibility

### 6.1 Alternative Text (WCAG 1.1.1)
Every informative image needs descriptive alt text conveying purpose. Decorative images:
`alt=""`. Complex images (charts): alt text + `aria-describedby`. Feed thumbnails: describe
the content, not "thumbnail." Prompt user-uploaded image authors for alt text.

### 6.2 Captions (WCAG 1.2.2, 1.2.4)
All pre-recorded video with audio requires synchronized captions. Live content needs real-time
captions where feasible. Include speaker ID, sound effects, musical cues. Support WebVTT.
Provide caption customization (size, color, background, position). Auto-generated captions
(ASR) have 10-15% error rates; review before publishing.

### 6.3 Transcripts (WCAG 1.2.1, 1.2.3)
Audio-only content (podcasts) must have text transcripts. Video should offer transcripts as
caption alternative. Place on same page, collapsible. Include timestamps. Make searchable.

### 6.4 Reader Mode
Removes clutter for cognitive disabilities. Provides predictable layout. Enables per-user
customization. Implement with semantic HTML so browser reader modes extract content correctly.

### 6.5 Adjustable Text Size (WCAG 1.4.4)
Text resizable to 200% without content loss. Use relative units (rem, em, %). iOS: support
Dynamic Type via system text styles. Android: use `sp` units. Web: test at 200% zoom.

### 6.6 Reduced Motion (WCAG 2.3.1, web.dev)
No flashing > 3x/second. Controls to pause/stop auto-playing animation. Respect
`prefers-reduced-motion`: replace animations with instant state changes or opacity fades,
show static poster for auto-playing background video, provide explicit Play button.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 6.7 Keyboard and Screen Reader
All interactions keyboard accessible (WCAG 2.1.1). Media: Space=play/pause, Arrows=seek,
M=mute, F=fullscreen. Feed items focusable via Tab. Carousels: Arrow key navigation.
Focus management: move focus to article heading on open, return to feed item on close.
`aria-live` for dynamic updates. Progress bars: `aria-valuenow/min/max`. Carousel: announce
"Slide N of M." Infinite scroll: announce new content loads.

---

## 7. Cross-Platform Adaptation

### 7.1 Mobile (< 640px)

**Layout:** single-column feed with full-width cards. Bottom navigation bar with content
categories (Feed, Search, Library, Profile). Full-screen media consumption (stories, videos,
articles). Swipe gestures for primary navigation (swipe to dismiss, swipe between items).

**Content adaptations:**
- Truncate article previews to 2-3 lines in feed cards.
- Use a bottom sheet for share/save actions instead of modal dialogs.
- Collapse secondary metadata (read time, category) into expandable rows.
- Prioritize thumb-zone placement for primary actions (like, share, save) --
  bottom 40% of screen is the comfortable reach zone.

**Performance:** aggressive lazy loading for off-screen images. Reduced image quality with
high-DPI displays (use `srcset` and `sizes`). Limit initial feed load to 10-15 items.
Use skeleton screens exclusively (never spinners on mobile).

### 7.2 Tablet (640-1024px)

**Layout:** two-column feed (masonry or grid) to leverage horizontal space. Split-view
for feed + article side-by-side (iPad multitasking model). Sidebar navigation (collapsible)
replacing bottom tab bar. Landscape mode may show article + comments side-by-side.

**Content adaptations:** show more metadata per card (full description, larger thumbnails).
Reader mode can use wider margins and larger font for a book-like reading experience.
Video players can use theater mode without fullscreen. Touch targets remain minimum 44x44pt
(Apple HIG) / 48x48dp (Material Design).

### 7.3 Desktop (> 1024px)

**Layout:** multi-column layout: sidebar navigation + feed + detail panel. Maximum content
width constraint (680-720px for articles, ~1200px for feeds) with centered alignment.
Persistent sidebar for navigation, bookmarks, and trending content.

**Content adaptations:**
- Hover states for preview (video thumbnails, article summaries).
- Keyboard shortcuts for power users (J/K=next/prev, S=save, L=like, B=bookmark).
- Inline expansion: click a feed card to expand the article in-place rather than
  navigating to a new page.
- Multi-panel reading: article in center, table of contents on left, related on right.
- Picture-in-Picture for video while browsing other content.

### 7.4 Cross-Platform Continuity

**State synchronization:**
- Read position synced across devices (open article on phone, continue on tablet).
- Playback position for audio/video maintained across sessions and devices.
- Save/bookmark state immediately reflected across all logged-in surfaces.
- Notification state (read/unread) synchronized to prevent duplicate alerting.

**Technical approach:** real-time sync via WebSocket or Server-Sent Events for active
sessions. Periodic sync via REST API for background state. Conflict resolution:
last-write-wins for position data; union merge for collections (bookmarks, read history).
Offline queue with reconciliation on reconnect.

### 7.5 Emerging Form Factors

**Smartwatch:** headlines only with "Send to Phone" for full reading. Audio content
playback with basic controls. Notification-driven content consumption.

**TV / Large screen (10-foot UI):** large text (minimum 24px effective), focus-based
navigation with clear focus indicators. Media player with remote-friendly controls.
D-pad navigation with spatial focus model.

**Foldable devices:** adapt layout on fold state change (folded = single column,
unfolded = split view with feed + article). Use CSS fold APIs and Android Jetpack
WindowManager for fold detection and hinge awareness.

---

## 8. Decision Tree

### 8.1 Feed vs. Timeline vs. Paginated
```
User intent = Browse/Discover?
  Homogeneous + unbounded --> ALGORITHMIC FEED (TikTok, YouTube Home)
  Homogeneous + bounded   --> CURATED GRID (Netflix categories, Spotify playlists)
  Mixed content types     --> CHRONOLOGICAL TIMELINE (Twitter Following, Mastodon)

User intent = Search/Find?
  --> PAGINATED RESULTS (Google, e-commerce)

User intent = Sequential consumption?
  --> LINEAR NAVIGATION (chapters, courses, podcast episodes)
```

### 8.2 Infinite Scroll vs. Pagination
```
Entertainment/social, casual browsing --> INFINITE SCROLL
  + progress indicator, back-to-top, position memory, "all caught up" stop

Search results or catalog --> PAGINATION
  + generous page size 20-50, keyboard nav, URL state, result count

Mix of browsing and goal-oriented --> LOAD MORE BUTTON
  Initial set + "Load 20 More" for user control without pagination friction

Editorial/news --> INFINITE SCROLL + SECTION BREAKS
  Section headers ("Earlier Today") + optional "Load More" between sections

Footer content needed --> PAGINATION or LOAD MORE
  Infinite scroll makes footers unreachable (NNG)
```

### 8.3 Content Layout
```
Long-form text     --> Single-column 680-720px, serif font, progress bar
Short text + media  --> Card-based feed with thumbnails
Short-form video    --> Full-screen vertical (TikTok model)
Long-form video     --> Theater/cinema mode (YouTube model)
Audio-first         --> Persistent mini-player + browse UI (Spotify model)
Image-first         --> Grid/masonry with tap-to-expand (Pinterest model)
```

---

## 9. Quick Reference Checklist

### Content Structure
- [ ] Clear hierarchy (headline > subhead > body > metadata)
- [ ] Read time / media duration displayed
- [ ] Semantic HTML (article, h1-h6, main)
- [ ] Explicit image dimensions to prevent CLS
- [ ] Content width constrained for readability (50-75 char measure)

### Navigation and Discovery
- [ ] Feed browse AND search available
- [ ] Clear visual separation between feed items
- [ ] Content type immediately identifiable
- [ ] Algorithmic and chronological options both available
- [ ] New content indicator without layout shift

### Consumption Experience
- [ ] Scroll/playback progress visually indicated
- [ ] Position remembered across sessions and devices
- [ ] Reader mode / distraction-free view for long-form
- [ ] Adjustable font size, line height, theme
- [ ] Full media controls (play, pause, seek, speed, volume, captions)
- [ ] PiP or mini-player persists during navigation

### Saving and Sharing
- [ ] One-tap save with visual + haptic confirmation
- [ ] Collections/folders for saved content
- [ ] Offline availability for saved content
- [ ] Copy link as first/most prominent share option
- [ ] Deep links to specific content position

### Performance (web.dev)
- [ ] LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] Lazy loading for off-screen images
- [ ] Skeleton screens for loading states
- [ ] Adaptive media quality by network

### Accessibility (WCAG 2.1 AA)
- [ ] Alt text on all informative images
- [ ] Captions on all video, transcripts for audio
- [ ] Text resizable to 200%
- [ ] Color contrast 4.5:1 for body text
- [ ] `prefers-reduced-motion` respected
- [ ] All interactions keyboard accessible
- [ ] Focus management on content transitions
- [ ] `aria-live` for dynamic content updates

### Anti-Pattern Avoidance
- [ ] No autoplay with sound
- [ ] No layout shift during scroll
- [ ] No infinite scroll without progress
- [ ] No interstitials blocking first-visit content
- [ ] No auto-forward carousels without pause
- [ ] No disabled text selection
- [ ] No missing save/bookmark
- [ ] No pagination without URL state

---

## Sources

- [NNG: Infinite Scrolling: When to Use It, When to Avoid It](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [NNG: Carousel Usability: Designing an Effective UI](https://www.nngroup.com/articles/designing-effective-carousels/)
- [NNG: Microinteractions in User Experience](https://www.nngroup.com/articles/microinteractions/)
- [NNG: Spatial Memory: Why It Matters for UX Design](https://www.nngroup.com/articles/spatial-memory/)
- [NNG: Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)
- [NNG: Auto-Forwarding Carousels Annoy Users](https://www.nngroup.com/articles/auto-forwarding/)
- [web.dev: Cumulative Layout Shift (CLS)](https://web.dev/articles/cls)
- [web.dev: Optimize CLS](https://web.dev/articles/optimize-cls)
- [web.dev: Browser-level Image Lazy Loading](https://web.dev/articles/browser-level-image-lazy-loading)
- [web.dev: prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- [W3C: WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [W3C WAI: Transcripts](https://www.w3.org/WAI/media/av/transcripts/)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN: Responsive Web Design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [UX Collective: Interaction Design of Instagram Stories](https://uxdesign.cc/the-powerful-interaction-design-of-instagram-stories-47cdeb30e5b6)
- [Deceptive Patterns: Exploiting Addiction](https://www.deceptive.design/book/contents/chapter-11)
