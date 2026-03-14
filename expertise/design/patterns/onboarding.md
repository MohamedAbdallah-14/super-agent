# Onboarding Patterns

> **Module Type:** Pattern
> **Domain:** UX Design / User Onboarding
> **Last Updated:** 2026-03-07
> **Confidence:** High -- based on NNG research, Appcues data, UX Collective analysis, and cross-industry teardowns

---

## Quick Reference Checklist

Before shipping any onboarding flow, verify against this list:

- [ ] Users reach their first value moment within 60 seconds
- [ ] Account creation is deferred until after demonstrating value
- [ ] Every permission request includes a clear, benefit-framed rationale
- [ ] A skip option is visible on every non-essential screen
- [ ] Progress indication is present throughout multi-step flows
- [ ] The flow adapts based on user role, intent, or prior context
- [ ] Empty states guide users toward their first meaningful action
- [ ] Contextual help is available at the point of need, not upfront
- [ ] Celebration micro-interactions reinforce completion of key milestones
- [ ] The entire flow is keyboard-navigable and screen-reader accessible
- [ ] Reduced-motion alternatives exist for all animations
- [ ] Returning users are not forced to repeat completed onboarding
- [ ] Re-onboarding exists for major feature releases
- [ ] The flow has been tested on iOS, Android, and web with platform-appropriate patterns
- [ ] Abandonment recovery paths exist (deep links, email nudges, resume state)

---

## 1. Pattern Anatomy

Onboarding is the bridge between a user's first encounter with a product and their
realization of its core value. It is not a single pattern but a family of related
patterns, each suited to different contexts, complexity levels, and user needs.

### 1.1 App Intro / Welcome Screens

**What it is:** 2-4 screens on first launch communicating the app's value proposition
via illustration + headline + subtitle.

**When to use:** App purpose is not obvious from name/icon; brand storytelling is
central (e.g., Headspace); expectations need setting before interaction.

**When to avoid:** App function is self-evident (calculator, weather); users arrive
with strong intent; value already communicated via app store screenshots.

**Guidance:** Limit to 3 screens max -- NNG research shows tutorials are "quickly
forgotten." Focus on benefits, not features. Always include skip. Appcues found
49% of trial users want to explore on their own. Use pagination dots for scope.

### 1.2 Feature Tours / Product Tours

**What it is:** Guided walkthrough highlighting specific UI elements via tooltips,
coach marks, or spotlight overlays anchored to interface components.

**When to use:** Non-obvious interaction patterns; key features hidden behind menus
or gestures; collaborative products where users need workflow understanding.

**When to avoid:** UI follows platform conventions; better UI design could eliminate
the need (the best onboarding is no onboarding); returning users.

**Guidance:** Anchor to actual UI elements, not abstract illustrations. Limit to
3-5 steps -- longer tours see exponential drop-off. Make tours interactive: require
the user to perform the action, not just read. Offer "remind me later" alongside skip.

### 1.3 Progressive Disclosure

**What it is:** Revealing features incrementally as the user advances, rather than
presenting everything upfront.

**When to use:** High-complexity products (design tools, project management, IDEs);
different user segments need different feature sets; overwhelming learning curve.

**When to avoid:** Power users needing immediate advanced access; simple products
where progressive disclosure adds unnecessary friction.

**Guidance:** Tie feature reveals to user actions, not arbitrary timelines. Use
behavioral triggers: show the export tutorial after the first document creation,
not on day 3. Jakob Nielsen introduced progressive disclosure in 1995 to reduce
errors in complex applications. Notion exemplifies this: basic blocks first,
databases revealed as users build more complex pages.

### 1.4 Contextual Tooltips

**What it is:** Targeted help messages appearing at the moment a user encounters
a feature or interaction point for the first time.

**When to use:** Non-standard UI patterns needing inline explanation; just-in-time
help without workflow interruption; organically discovered features.

**When to avoid:** Tooltip would obscure the element; information exceeds 1-2
sentences; multiple tooltips would appear simultaneously.

**Guidance:** NNG distinguishes "push" (proactive) from "pull" (user-triggered)
contextual help. Prefer pull patterns for non-critical info. Position consistently,
never occluding the target. Dismiss on interaction with the target element. Track
shown tooltips and never re-show dismissed ones.

### 1.5 Interactive Tutorials

**What it is:** Learn-by-doing experiences where users complete real tasks within a
guided sandbox or with guardrails on the live product.

**When to use:** Procedural knowledge required (design tools, code editors); non-
technical users learning technical workflows; multi-step "aha moment."

**When to avoid:** Users experienced with the category; tutorial cannot use real
data; time-to-value must be under 30 seconds.

**Guidance:** Duolingo is the gold standard: users complete a real translation
exercise before creating an account. Use user's actual data when possible. Allow
exit and resume. Celebrate completion with clear feedback.

### 1.6 Empty State Onboarding

**What it is:** Using blank screens as onboarding surfaces guiding users toward
their first meaningful action.

**When to use:** Value only visible after user-generated content; new accounts
start blank (project management, CRM); "cold start" anxiety reduction.

**Guidance:** Replace every empty state with a clear CTA: "Create your first
project" not "No projects yet." Include cloneable templates. Show what the
populated state looks like through previews. Notion and Linear both use this
effectively with CTAs, templates, and success previews.

### 1.7 Checklist-Driven Onboarding

**What it is:** A visible task list guiding users through setup, tracking completion
and providing progress feedback.

**When to use:** Multi-step setup (profile, integrations, team, preferences); users
benefit from knowing full scope upfront; gamification fits the tone.

**When to avoid:** More than 7 items (overwhelm); strict-order steps (use wizard);
casual products where checklists feel formal.

**Guidance:** Show progress persistently. Pre-check auto-completed steps. Allow
any-order completion. Appcues research shows checklists exploit the Zeigarnik
effect: incomplete tasks create psychological tension motivating completion.

### 1.8 Pattern Selection Matrix

| Pattern | Best For | Complexity | User Effort | Time to Value |
|---------|----------|------------|-------------|---------------|
| Welcome Screens | Brand-led products | Low | Passive | Slow |
| Feature Tours | Feature-rich UIs | Medium | Passive | Medium |
| Progressive Disclosure | Complex tools | High | Active | Gradual |
| Contextual Tooltips | Standard UIs with nuances | Low | Active | Fast |
| Interactive Tutorials | Skill-based products | High | Active | Medium |
| Empty States | Content-creation tools | Low | Active | Fast |
| Checklists | Multi-step setup products | Medium | Active | Medium |

---

## 2. Best-in-Class Examples

### 2.1 Duolingo -- Value Before Commitment

**Pattern:** Interactive tutorial + deferred signup + personalization

Users select a language and complete a real translation exercise before account
creation. A 7-step personalization flow segments by proficiency, goals, and daily
time. Progress bars are omnipresent. Gamification is woven into onboarding itself:
XP for the first exercise, streak counter initialized. Sign-up is framed as "save
your progress" rather than "create an account."

**Key metric:** "First lesson completed" activation event.

### 2.2 Notion -- Role-Based Personalization

**Pattern:** Personalization survey + empty state + template suggestions

Asks user role (student, designer, engineer, manager) and team size upfront,
driving template and feature selection. Minimal visual distraction with one input
per step. Empty states throughout serve as ongoing onboarding surfaces. Progressive
disclosure: basic blocks first, databases/relations introduced as usage deepens.

**Key metric:** "First page created with real content."

### 2.3 Slack -- Collaborative Activation

**Pattern:** Workspace setup checklist + interactive tutorial + team invite

Onboarding is framed as workspace creation, not personal setup. Slackbot serves
as an interactive guide through actual messaging. Conversational, emoji-rich
microcopy reduces anxiety. Team invite positioned early: "Slack works best with
your team." Invited (Nth) users get a distinct streamlined flow skipping workspace
setup, focusing on preferences and channel discovery.

**Key metric:** "First real message sent to a teammate."

### 2.4 Figma -- Action-First Design

**Pattern:** Minimal setup + collaborative prompt + learning by doing

Users reach the editor within 3 clicks -- fastest time-to-canvas of any design
tool. Onboarding happens inside the actual product with contextual hints as tools
are discovered. Collaboration introduced immediately. Community templates serve as
both onboarding and inspiration.

**Key metric:** "First shape drawn on canvas."

### 2.5 Linear -- Focused Elegance

**Pattern:** Single-input-per-step wizard + workspace setup + feature hints

Each screen contains exactly one input or decision. Dark, polished UI matches the
product perfectly -- no jarring transition. Keyboard shortcuts subtly introduced
alongside mouse interactions. The killer feature (cycles/sprints) is hinted at
during setup, creating anticipation.

**Key metric:** "First issue created in a project."

### 2.6 Headspace -- Emotional Onboarding

**Pattern:** Welcome animation + personalization + immediate guided experience

A calming breathing exercise begins within seconds, delivering core value before
any setup. Personalization frames questions as caring ("What brings you to
Headspace?"). Notification permission tied to benefit. Originally had 38% drop-off;
reduced by making intro screens easily exitable.

**Key metric:** "First meditation completed" (week-two users 5x more likely to convert).

### 2.7 TikTok -- Zero-Friction Content Consumption

**Pattern:** Content-first + deferred everything + behavioral learning

The most radical approach: no traditional onboarding. Users see full-screen video
immediately. No profile upload, no required interest selection, no follows needed.
The algorithm learns preferences through watch behavior. Contextual education
embedded in consumption: "double-tap to like" appears subtly over playing video.

**Key metric:** "First 5 videos watched to completion."

### 2.8 Comparative Analysis

| App | Steps to Value | Signup Required? | Personalization | Primary Pattern |
|-----|---------------|-----------------|-----------------|-----------------|
| Duolingo | 1 exercise | After value | Deep (7 steps) | Interactive tutorial |
| Notion | Template clone | Yes, upfront | Role-based | Empty state |
| Slack | Send message | Yes (workspace) | Team-based | Checklist + bot |
| Figma | Draw on canvas | Yes, minimal | Light | Action-first |
| Linear | Create issue | Yes (workspace) | Workspace config | Wizard |
| Headspace | Breathing exercise | After value | Goal-based | Emotional + guided |
| TikTok | 0 (immediate) | No | Behavioral | Content-first |

---

## 3. User Flow Mapping

### 3.1 Primary Flow: First Launch to First Value

```
App Launch --> Splash (0.5-2s) --> Value Proposition (1-3 screens, skippable)
    --> Permission Requests (only what is needed NOW)
    --> Account Creation (defer if possible; social auth, skip/guest)
    --> Personalization (2-5 questions, each visibly changes experience)
    --> FIRST VALUE MOMENT (the goal)
    --> Celebration + Next Steps --> Ongoing Progressive Onboarding
```

### 3.2 Permission Request Timing

Request permissions with context, at the moment of relevance:
- **Camera:** when user taps "Take Photo"
- **Location:** when user opens map or taps "Find nearby"
- **Notifications:** after value experienced, framed as benefit
- **Contacts:** when user explicitly initiates "invite friends"

**Pre-permission priming pattern:** Show a custom dialog explaining WHY before the
system dialog. "To send meditation reminders at your preferred time, we need
notification access." Offer [Allow] and [Not Now]. If denied, explain how to
enable in Settings. Never re-prompt aggressively.

### 3.3 Skip and Resume Architecture

**Skip rules:** Every non-essential step needs a visible skip mechanism.
- Welcome screens: "Skip" to product
- Personalization: "Use defaults"
- Tutorial: "I already know this"
- Team invite: "I'll do this later" (with reminder)

**Resume after abandonment:**
- Persist state server-side, not just locally
- On next launch: "Pick up where you left off?" -- never restart from beginning
- If 7+ days passed, offer fresh start alongside resume
- Email/push nudges at 24h, 72h, 7d with deep links to abandonment point

### 3.4 Edge Cases

**Returning users after long absence:**
Show "Welcome back -- here's what's new" with 2-3 changelog highlights. Restore
previous context (last document, last search). Never re-show original onboarding.

**Account migration:**
Pre-migration email explaining changes. Migration wizard mapping old concepts to
new. Preserve all data/settings. Provide accessible "what changed" reference.
Allow temporary old-version access during transition.

**Team invites (Nth user onboarding):**
Skip product value props -- teammates already explained. Focus on workspace context.
Pre-populate team info and show who invited them. Tailored checklist: complete
profile, join channels/projects, first action. Appcues shows Nth-user flows should
have 40-60% fewer steps than first-user onboarding.

**Re-onboarding for new features:**
Use in-app modals/banners, not full flow restarts. Target by segment (role, plan,
usage). Provide "what's new" section on demand. Contextual tooltips on new UI.
Optional interactive walkthrough. Respect "don't show again" persistently.

---

## 4. Micro-Interactions

Micro-interactions transform onboarding from a chore into an experience. Each has
four components: trigger, rule, feedback, and loop/mode.

### 4.1 Page Transitions

- Horizontal slide for linear sequences (mental model of "moving forward")
- Crossfade for non-sequential transitions (skip, settings)
- Duration: 250-350ms. Use `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard)
- Shared-element transitions when elements persist across screens (progress bar)
- Avoid zoom/3D transitions -- they distract from content

### 4.2 Progress Indicators

| Type | Use When | Example |
|------|----------|---------|
| Step dots | 3-5 discrete screens | Welcome carousel |
| Progress bar | Linear multi-step flow | Account setup wizard |
| Checklist | Non-linear tasks | Workspace configuration |
| Fraction (2/5) | Exact position needed | Survey questions |
| Ring/circle | Single metric | Profile completeness |

Always show progress -- it reduces abandonment. Animate progress fill for momentum.
Pre-fill for auto-completed steps to create endowed progress effect (starting at
2/10 completes more than 0/8 with same work remaining).

### 4.3 Skip Button Design

- **Placement:** Top-right corner (close/dismiss convention)
- **Style:** Text link, muted color -- visible but not competing with primary CTA
- **Copy:** "Skip" / "I already know this" / "Use defaults" / "Not now" / "Later"
- **Behavior:** Advance to next meaningful state, not blank screen. Track skip
  rates per screen -- high rate signals low-value step.

### 4.4 Celebration Animations

**Celebrate:** First value moment, checklist completion, profile setup, first invite.

**Guidelines:**
- Duration: 1-2 seconds (registers without blocking)
- Match product visual language: confetti, checkmarks, character animations
- Pair with encouraging copy: "You're all set!" / "Great start!"
- Haptic feedback on mobile (UIImpactFeedbackGenerator / HapticFeedbackConstants)
- Use Lottie/Rive for complex animations; degrade to static for reduced motion
- Never auto-play sound
- Iconic examples: Asana's flying unicorn, Mailchimp's high-five

### 4.5 Tooltip Pointing and Highlighting

**Spotlight/coach mark pattern:**
- Dim background to 60-70% opacity overlay
- Cut out target element so it appears highlighted
- Pulse animation on target draws attention without aggression
- Arrow must touch/nearly touch the target; tooltip must not occlude it
- Click highlighted element: perform normal action AND advance tour
- Provide next/back/skip-all navigation with step count (2 of 4)

### 4.6 Loading States During Onboarding

Use branded skeleton screens with incremental progress messages ("Creating your
channels... Importing preferences... Almost there..."). Never show blank screen
or generic spinner during onboarding -- every moment is a branding opportunity.

---

## 5. Anti-Patterns

### 5.1 Mandatory Multi-Screen Carousel

5+ screen carousel with no skip. NNG: "deck-of-cards tutorials make the interface
appear more complicated than it is and strain user's memory." Users retain nothing.
**Fix:** 1-2 value screens with skip, or contextual help within the product.

### 5.2 Account Wall Before Value

Requiring signup before any product experience. Users have zero investment.
Appcues: "if your app requires signup before exploration, you'll shed customers."
**Fix:** Duolingo model -- experience value first, frame signup as "save progress."

### 5.3 Feature-Dump Onboarding

Listing every feature during onboarding. Information overload causes cognitive
shutdown. Feature lists are perceived as marketing, not help.
**Fix:** Introduce only 1-2 features for the first value moment. Reveal the rest
progressively.

### 5.4 No Skip Option

Forcing every step on all users. Experienced and returning users trapped in flows
designed for the lowest common denominator.
**Fix:** Every non-essential screen gets a visible skip mechanism.

### 5.5 Re-Showing Completed Onboarding

Same flow on every launch or update. Signals the app does not know the user.
**Fix:** Persist completion state with versioned flag (onboarding_v3_completed).

### 5.6 Teaching UI Instead of Value

"Tap here to open the menu" -- mechanics without purpose. Users forget instructions
disconnected from goals within seconds.
**Fix:** Frame as outcomes: "Find projects your team is working on."

### 5.7 Permission Requests Without Context

Batch-requesting camera, location, notifications, contacts on first launch with
no explanation. Feels invasive. Denied permissions are hard to recover on iOS.
**Fix:** Pre-permission priming with benefit explanation. Request at relevance.

### 5.8 Onboarding That Does Not Match the Product

Different colors, typography, illustration style from the actual product. Creates
jarring transition and subconscious deception.
**Fix:** Design onboarding as part of the product, same design system. Linear
exemplifies this -- onboarding is indistinguishable from the product.

### 5.9 Tooltip Overload

8-15 tooltips on a single screen with "1 of 12" counter. Users click Next
reflexively without reading. NNG: tutorials "don't necessarily improve performance."
**Fix:** Max 3-5 per tour. Break longer tours across sessions. Replace most
tooltips with self-evident UI.

### 5.10 Asking Too Many Questions

10+ question survey before any product use. Users do not trust the product enough
for this investment yet.
**Fix:** 2-4 high-impact questions max. Derive the rest from behavior (TikTok's
approach: ask nothing, learn everything from usage).

### 5.11 Dark Patterns in Onboarding

Tricking users into notifications, contact sharing, or paid trials. Short-term
metric gains destroyed by trust damage, negative reviews, regulatory risk.
**Fix:** Transparent communication. "Start free trial" clearly distinct from
"Continue."

### 5.12 No Ongoing Onboarding

Treating onboarding as a one-time first-session event. Users discover new needs
as they grow; advanced features need their own onboarding moments.
**Fix:** Build continuous onboarding: tooltips for new features, progressive
unlocking, contextual help at usage milestones.

### 5.13 Ignoring the Empty State

After onboarding, dropping users on a blank screen with no guidance.
**Fix:** Every empty state needs a primary CTA, optional templates, and an
illustration showing what the populated state looks like.

---

## 6. Accessibility

Accessible onboarding is not optional. Users with disabilities encounter your
product for the first time too.

### 6.1 Screen Reader Support for Carousels and Tours

**WCAG requirements:** 1.3.1 Info and Relationships (semantic structure); 4.1.2
Name, Role, Value (accessible names on all interactive elements).

**Carousel implementation:**
```html
<div role="region" aria-label="Welcome tour" aria-roledescription="carousel">
  <div role="group" aria-roledescription="slide" aria-label="1 of 3">
    <h2>Welcome to AppName</h2>
    <p>Description of first value proposition</p>
  </div>
  <button aria-label="Previous slide">...</button>
  <button aria-label="Next slide">...</button>
  <div aria-live="polite">Slide 1 of 3</div>
</div>
```

**Tour/tooltip requirements:** Move focus to tooltip programmatically. Announce
via aria-live. Ensure spotlight overlay does not trap focus. Return focus to
highlighted element after dismissal.

### 6.2 Keyboard Navigation

WCAG 2.1.1 (Level A): every interaction operable via keyboard alone.
- Tab order follows visual order: content, then controls
- Arrow keys for carousel slides (left/right)
- Enter/Space for buttons; Escape to dismiss tooltips/modals/overlays
- Focus moves to step heading on navigation; no focus trapping behind overlays
- Skip button must be in tab order; progress indicators keyboard-accessible

### 6.3 Reduced Motion Alternatives

Respect `prefers-reduced-motion` at OS level:
```css
@media (prefers-reduced-motion: reduce) {
  .onboarding-step { transition: opacity 200ms ease; }
  .confetti, .particle-effect { display: none; }
  .carousel { animation: none; }
}
```

**Replace, do not remove:** Animated confetti becomes static checkmark with text.
Slide transitions become instant switch or fade. Bouncing tooltips become static
with visible border. Progress bar animation becomes instant fill.

### 6.4 Progress and Timing

- Announce progress to screen readers: "Step 2 of 5: Choose your interests"
- Use `aria-valuenow/min/max` on progress bars
- Announce completion: "Onboarding complete"
- WCAG 2.2.1 Timing Adjustable: auto-advancing must be pausable/extendable
- WCAG 2.2.2 Pause, Stop, Hide: auto-playing carousels need pause controls
- Prefer user-initiated navigation only; no auto-advance
- Minimum 3-4 seconds per sentence for reading time

### 6.5 Color, Contrast, and Touch Targets

- Progress indicators must not rely solely on color (add labels/patterns)
- Tooltip text: 4.5:1 contrast ratio (WCAG AA); large text: 3:1
- All buttons/interactive elements: minimum 44x44 CSS pixels (WCAG 2.5.8)
- Carousel dots: make tappable at 44x44 or provide separate next/prev buttons

---

## 7. Cross-Platform Adaptation

### 7.1 iOS

**Permissions:** One-shot model -- denial requires manual Settings navigation.
Pre-permission priming screens are essential. Request only what is needed now.

**App Tracking Transparency (ATT):** Required since iOS 14.5 for cross-app
tracking. Must appear before any tracking. Timing strategies:
- **Early (first launch):** Largest reach, low opt-in (~15-25%)
- **Mid-funnel (after value):** Higher opt-in (~30-40%)
- **Best practice:** Show after first value moment with custom pre-permission
  screen. Never use dark patterns -- Apple reviews for this.

**Design conventions:** System-standard permission UI. Support Dynamic Type.
Test on iPhone SE (small screen). Support orientation modes.

### 7.2 Android

**Permissions:** Runtime since Android 6.0+. Android 12+ added approximate vs.
precise location. Android 13+ requires explicit notification permission. "Don't
ask again" appears after two denials -- cannot re-prompt, must direct to Settings.

**Design conventions:** Material Design 3. Edge-to-edge display (Android 15+).
Predictive back gestures. Test on diverse screen sizes including foldables.
Ensure animations do not jank on budget hardware. Privacy disclosure for Play Store.

### 7.3 Web

**Progressive onboarding:** No "first launch" moment. Users arrive from search,
social, direct links, email invites. Detect first-time visitors via cookies/
localStorage. Support deep-linking: contextual onboarding for specific features.

**No app store screenshots:** Landing page and in-app flow carry full burden.
Consider product tour video on landing page.

**Browser permissions:** Custom pre-permission screens critical since browser
prompts are easily dismissed and hard to re-trigger. Camera/mic requested inline.

**Responsive:** Same flow must work 320px to 2560px. Mobile: full-screen steps,
bottom CTAs. Tablet: centered card. Desktop: side panel or modal.

**Session persistence:** Persist state server-side for logged-in users, localStorage
for anonymous. Handle cleared storage and browser switches.

### 7.4 Cross-Platform Consistency

- **Consistent value narrative:** Same "why" everywhere
- **Synced personalization:** Mobile prefs reflected on web
- **Platform-native interactions:** Swipe on mobile, click on web
- **Feature parity awareness:** Do not onboard platform-exclusive features elsewhere
- **Synced state:** Complete mobile onboarding, skip on web (via account sync)

---

## 8. Decision Tree: How Much Onboarding?

### 8.1 Scoring Factors (1-10 each)

| Factor | 1 (Low) | 10 (High) |
|--------|---------|-----------|
| Product Complexity | Single-purpose utility | Expert system (CAD, DAW) |
| Audience Tech Gap (inverted) | Pro developers | Tech-averse users |
| Interaction Novelty | Standard platform patterns | New paradigm (AR, voice) |
| Setup Requirements | Works immediately | Config + migration + team |
| Error Consequence | Trivially reversible | Irreversible (medical, legal) |

### 8.2 Strategy by Total Score

**5-15 -- Minimal:** Zero/one welcome screen. Self-evident UI. Contextual tooltips
for non-obvious features only. (Calculator, Weather, Flashlight)

**16-25 -- Light:** 1-2 skippable value screens. Brief personalization (1-2 Qs).
Empty states with CTAs. Optional feature highlights. (News app, Simple to-do, Social)

**26-35 -- Standard:** 2-3 value screens or short tour. 3-5 personalization
questions. Guided first action. Checklist for setup. Contextual tooltips.
(Slack, Notion, Headspace)

**36-45 -- Comprehensive:** Full interactive tutorial with sandbox. Extensive
config. Video walkthroughs. Progressive disclosure system. In-app help center.
14+ day onboarding email sequence. (Figma, Adobe CC, Salesforce)

**46-50 -- White-Glove:** All above plus dedicated human specialist. Custom
implementation and data migration. Training sessions. Phased rollout with
check-ins. (Enterprise ERP, Medical systems, Industrial software)

### 8.3 Decision Flowchart

```
Is the core action self-evident?
  |
  YES --> Value reachable in <30 seconds?
  |         YES --> MINIMAL (tooltips only)
  |         NO  --> LIGHT (guided first action)
  |
  NO --> Setup required before use?
          YES --> Team/collaborative product?
          |       YES --> STANDARD+ (checklist + team setup)
          |       NO  --> STANDARD (personalization + tutorial)
          NO --> Novel interaction model?
                  YES --> COMPREHENSIVE (interactive tutorial)
                  NO  --> LIGHT (contextual help)
```

### 8.4 Measuring Effectiveness

**Primary metrics:**
- Activation rate (% reaching defined activation event)
- Time to first value (seconds from launch to value moment)
- Completion rate (% finishing full onboarding)
- Per-step drop-off (identifies problem steps)

**Secondary metrics:**
- Day 1 / Day 7 retention
- Feature adoption rate for onboarded features
- Support ticket volume (fewer = better onboarding)
- Skip rate per step (high = low-value step)

**Optimization:** A/B test variants. Instrument every step. Interview abandoners
and early churners. Review session recordings. Iterate continuously --
onboarding is never "done."

---

## References

### Research and Frameworks
- NNG. "Onboarding Tutorials vs. Contextual Help." https://www.nngroup.com/articles/onboarding-tutorials/
- NNG. "Mobile-App Onboarding: Components and Techniques." https://www.nngroup.com/articles/mobile-app-onboarding/
- NNG. "3 Types of Onboarding New Users." https://www.nngroup.com/videos/onboarding-new-users/
- UXmatters. "Framework for Choosing Onboarding Experiences." https://www.uxmatters.com/mt/archives/2024/07/a-framework-for-choosing-types-of-onboarding-experiences.php

### Industry Analysis
- Appcues. "User Onboarding Best Practices." https://www.appcues.com/blog/user-onboarding-best-practices
- Appcues. "Essential Guide to Mobile Onboarding UI/UX Patterns." https://www.appcues.com/blog/essential-guide-mobile-user-onboarding-ui-ux
- Appcues. "Onboarding Strategies for Invited Users." https://www.appcues.com/blog/user-onboarding-strategies-invited-users

### Product Teardowns
- Appcues. "Duolingo's Onboarding Experience." https://goodux.appcues.com/blog/duolingo-user-onboarding
- Appcues. "TikTok's Activation-Focused Onboarding." https://goodux.appcues.com/blog/tiktok-user-onboarding
- UserGuiding. "Slack Onboarding Teardown." https://userguiding.com/blog/slack-user-onboarding-teardown
- Growth.Design. "Headspace Onboarding Case Study." https://growth.design/case-studies/headspace-user-onboarding
- fmerian. "Linear FTUX." https://fmerian.medium.com/delightful-onboarding-experience-the-linear-ftux-cf56f3bc318c
- UX Collective. "Duolingo's Onboarding Testing." https://uxdesign.cc/duolingos-onboarding-2-years-on-3cbccad139f7

### Accessibility
- W3C WAI. "Carousels Tutorial." https://www.w3.org/WAI/tutorials/carousels/
- Smashing Magazine. "Guide to Accessible Carousels." https://www.smashingmagazine.com/2023/02/guide-building-accessible-carousels/
- WebAIM. "Animation and Carousels." https://webaim.org/techniques/carousels/

### Anti-Patterns
- Usetiful. "Common Mobile Onboarding Mistakes." https://blog.usetiful.com/2025/08/how-to-fix-mobile-onboarding-mistakes.html
- DesignerUp. "200 Onboarding Flows Study." https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/

### Micro-Interactions
- UXPin. "Designing Onboarding Microinteractions." https://www.uxpin.com/studio/blog/designing-onboarding-microinteractions-guide/
- UserGuiding. "15 Onboarding Micro-Interactions." https://userguiding.com/blog/onboarding-microinteractions

### Platform Guidelines
- Apple. "App Tracking Transparency." https://developer.apple.com/documentation/apptrackingtransparency
