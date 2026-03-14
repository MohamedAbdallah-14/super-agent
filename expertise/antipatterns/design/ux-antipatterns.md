# UX Anti-Patterns

> User experience anti-patterns are design decisions that actively harm usability, erode user trust, and drive abandonment. Unlike visual bugs, UX anti-patterns are often invisible in screenshots -- they reveal themselves only when a real human tries to accomplish a real task. These patterns are especially dangerous because they frequently survive design reviews ("it looks fine") while silently destroying conversion rates, accessibility, and user satisfaction.

> **Domain:** Design
> **Anti-patterns covered:** 21
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: Mystery Meat Navigation

**Also known as:** Unlabeled icons, icon-only navigation, "guess what this does" UI
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Navigation elements that rely entirely on abstract icons, unlabeled graphics, or hover-dependent labels. Users must mouse over every element to discover what it does. Common manifestations include icon-only toolbars with no tooltips, navigation items that only reveal their purpose on hover, and creative but ambiguous iconography that prioritizes aesthetics over clarity.

**Why developers do it:**
Designers pursue visual minimalism and assume icons are universally understood. The hamburger menu icon took years of mainstream adoption before recognition rates climbed above 50%. Teams often test with internal users who already know what every icon means, creating a false sense of clarity. "Clean" interfaces win design awards; labeled interfaces do not.

**What goes wrong:**
Users click randomly hoping to find the right function, a behavior known as "pogo-sticking." Web Pages That Suck documented hundreds of real-world mystery meat navigation examples where users could not identify clickable elements without hovering over every pixel. Interaction Design Foundation research shows that unclear navigation increases time-on-task by 2-3x and dramatically raises bounce rates. Users who cannot find a feature within 10-15 seconds assume it does not exist.

**The fix:**
- Always pair icons with text labels, especially in primary navigation.
- Use tooltips as a supplement, never as the only label.
- Test with five users who have never seen the interface -- if any hesitate on navigation, add labels.
- Follow the "5-second test": show the screen for 5 seconds, then ask users to identify the primary actions.

**Detection rule:**
If a navigation component renders icons without adjacent text labels and has no `aria-label` or visible text within the interactive element, suspect AP-01.

---

### AP-02: Infinite Scroll Without Position Memory

**Also known as:** Scroll amnesia, bottomless pit, scroll purgatory
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Content loads endlessly as the user scrolls down, but the interface provides no way to bookmark a position, return to a previous spot, or understand how much content remains. Clicking an item and pressing "Back" returns the user to the top of the feed, losing all scroll progress. The footer is unreachable. The scrollbar thumb shrinks to a pixel.

**Why developers do it:**
Infinite scroll increases engagement metrics (time on page, content views) and is technically simpler than pagination. Product managers see social media apps using it and assume it works universally. It avoids the "dead end" of reaching the last page. The American Psychological Association has flagged infinite scroll as "particularly risky" for younger users because it exploits psychological patterns around variable-ratio reinforcement.

**What goes wrong:**
Smashing Magazine's 2022 research documented that infinite scroll causes disorientation when users lose their position, especially on content-heavy or e-commerce sites. Users cannot share a specific position with others. The browser back button resets to the top, which Nielsen Norman Group identifies as a severe usability violation. Memory usage grows unbounded -- on low-end mobile devices, pages with 500+ dynamically loaded items cause crashes and severe jank. Keyboard-only users and screen reader users face extreme difficulty navigating, as they must tab through every single loaded item.

**The fix:**
- Implement scroll position restoration on back-navigation (use `history.scrollRestoration` or cache scroll offsets).
- Show a "You were here" marker when users return.
- Display a progress indicator (e.g., "Showing items 1-50 of ~2,400").
- Virtualize the DOM -- only render items in and near the viewport.
- Provide a "Back to top" button and consider hybrid pagination ("Load more" button instead of auto-loading).
- Ensure the footer remains accessible via a persistent link.

**Detection rule:**
If a scrollable list dynamically appends content on scroll but does not persist scroll position across navigation events or store position in the URL/history state, suspect AP-02.

---

### AP-03: Modal Overload

**Also known as:** Dialog fatigue, interruptive modals, pop-up hell
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Modal dialogs used for non-critical information: newsletter sign-up prompts on first visit, cookie consent overlays stacked with notification permission requests, "rate our app" modals triggered mid-task, or informational messages that could be inline banners. Users face a cascade of modals before they can interact with any content.

**Why developers do it:**
Modals guarantee visibility -- unlike banners, users cannot scroll past them. Marketing teams push for email capture modals because they do capture some percentage of emails (typically 2-5%). Product teams use modals for announcements because inline notices get ignored. The ease of implementing modal libraries (a single component call) lowers the barrier to overuse.

**What goes wrong:**
Research published on Medium ("The High Cost of Interruption") documents that each modal interruption forces a context switch that costs 15-25 seconds of recovery time. Nielsen Norman Group's guidelines on modal and nonmodal dialogs show that repeated interruptions train users to dismiss all modals reflexively -- including critical ones like unsaved-changes warnings. UX research firm Baymard found that aggressive modal usage on e-commerce sites correlates with higher abandonment rates. When a modal obscures background content, users lose the context they need to make the decision the modal is asking about, increasing cognitive load.

**The fix:**
- Reserve modals exclusively for: (1) confirming destructive/irreversible actions, (2) critical blocking errors, (3) essential input that cannot proceed without.
- Use inline banners, toast notifications, or collapsible sections for everything else.
- Never show a modal before the user has interacted with the page.
- Limit to one modal per user session for non-critical prompts.
- Always provide a clear, visible close/dismiss mechanism (X button, click-outside, Escape key).

**Detection rule:**
If a modal is triggered by a page load event, a timer, or a scroll threshold rather than by an explicit user action, suspect AP-03.

---

### AP-04: Registration Wall Before Value

**Also known as:** Forced registration, sign-up gate, premature commitment
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
Users are required to create an account before they can see any content, use any features, or evaluate whether the product is worth their time. The first screen is a login/registration form with no preview of what lies behind it. Common in SaaS tools, news sites, and apps that gate even their landing page content.

**Why developers do it:**
Product teams want user data for analytics, marketing, and engagement tracking. There is pressure to show "registered user" growth as a metric. Developers assume that if users found the site, they are already committed enough to register. Gating content creates a sense of exclusivity.

**What goes wrong:**
Baymard Institute's checkout research found that requiring account creation increases abandonment by 35%. The Interaction Design Foundation defines forced registration as a well-documented anti-pattern that turns potential users into bounced visitors. On mobile, the friction is amplified -- filling out multi-field registration forms on a smartphone keyboard is a high-friction activity that most users will abandon. Search engines see increased bounce rates from registration walls, which can lower search rankings and reduce organic traffic over time, crippling growth.

**The fix:**
- Follow the "Lazy Registration" pattern: let users experience value first, then prompt registration when they try to save, share, or access premium features.
- Offer guest checkout for e-commerce (Baymard data shows a 35% conversion improvement).
- Show a preview of content or features before requiring sign-up.
- If registration is required, minimize fields to email + password only and defer profile completion.
- Offer social sign-in (OAuth) to reduce form friction.

**Detection rule:**
If the first routed view a new user sees is a registration or login form with no skip/preview/guest option, suspect AP-04.

---

### AP-05: Breaking the Back Button

**Also known as:** History hijacking, navigation trap, back button sabotage
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Pressing the browser back button does not return the user to their previous page. Instead, it reloads the current page, traps the user in a redirect loop, returns them to a completely unexpected location, or resets multi-step form progress. Single-page applications that manipulate `history.pushState` incorrectly are frequent offenders.

**Why developers do it:**
SPAs manage their own routing and often fail to synchronize with browser history. Some sites deliberately hijack the back button to keep users on the page (especially ad-heavy sites). Multi-step flows use client-side state that is not reflected in the URL, so the browser has no meaningful "previous state" to restore. Developers test with forward navigation and forget to test backward.

**What goes wrong:**
Baymard Institute's 2022 research found that 59% of e-commerce sites have at least one checkout flow that violates back-button expectations, with four distinct design patterns that break user expectations. Google Chrome engineers worked on blocking back-button hijacking after documenting widespread abuse where malicious sites pushed fake history entries to trap users. In multi-step forms (checkout, applications), a broken back button means lost data -- users who have filled out three pages of a form and cannot go back will abandon the entire process.

**The fix:**
- Every distinct view state should have a unique URL (use `pushState` or framework routing correctly).
- Test the back button at every step of every flow -- this should be a standard QA checklist item.
- Never push duplicate or fake history entries.
- In multi-step flows, persist form data so that navigating back restores the previous step with data intact.
- Use `beforeunload` or route guards to warn users before losing unsaved state, not to trap them.

**Detection rule:**
If `history.pushState` or `history.replaceState` is called without a corresponding URL change that reflects a meaningful state transition, or if the same URL is pushed multiple times, suspect AP-05.

---

### AP-06: Autoplay Audio and Video

**Also known as:** Surprise media, unwanted playback, bandwidth theft
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Audio or video begins playing automatically when a page loads or when the user scrolls past an element, without the user requesting playback. Particularly egregious when the media plays with sound, but even muted autoplay videos consume bandwidth, CPU, and battery.

**Why developers do it:**
Autoplay increases video view counts and "engagement" metrics. Advertisers pay more for auto-played video ads. Marketing teams believe that if users see the video, they will be convinced by the content. Sticky video players (videos that follow the user as they scroll) maximize view duration metrics.

**What goes wrong:**
User backlash against autoplay was so severe that all major browsers implemented autoplay blocking. Chrome 66 (2018) was the first major browser to block video autoplay based on Media Engagement Index scores. Mozilla's Bugzilla tracker (Bug #1420389) documents extensive UX specification work for autoplay policies driven by user complaints. Foliovision's 2023 analysis of sticky video UX found that auto-playing sticky videos that follow users as they scroll are "extremely annoying" and violate the principle that site behavior must be predictable. Silent autoplay videos still consume bandwidth -- on metered mobile connections, this costs users real money.

**The fix:**
- Never autoplay with sound. Period.
- For muted autoplay, only use it when the video IS the content (e.g., a background hero video) and keep it short.
- Always show play/pause controls prominently.
- Respect the `prefers-reduced-motion` media query.
- Use `loading="lazy"` for video elements below the fold.
- Let the user initiate playback -- a thumbnail with a play button converts better than forced autoplay for actual engagement.

**Detection rule:**
If a `<video>` or `<audio>` element has the `autoplay` attribute, or if JavaScript calls `.play()` without a preceding user gesture event, suspect AP-06.

---

### AP-07: Scroll Hijacking

**Also known as:** Scrolljacking, scroll override, parallax abuse
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The website overrides the browser's native scroll behavior -- changing scroll speed, direction, snapping to sections, or triggering animations that prevent smooth scrolling. Parallax effects that decouple content movement from scroll input. Horizontal scrolling triggered by vertical scroll gestures. Scroll-locked sections that require clicking "next" to advance.

**Why developers do it:**
Scroll hijacking creates dramatic visual effects that win design awards and impress stakeholders in demo meetings. Agencies use it to differentiate portfolio sites. Product teams believe it creates a more "immersive" experience. The availability of libraries like fullPage.js makes implementation trivial.

**What goes wrong:**
Nielsen Norman Group's "Scrolljacking 101" analysis found that scroll hijacking "significantly threatens user control and freedom, discoverability, attention, efficiency, and task success." Apple's Mac Pro site was widely criticized for scroll hijacking that forced users to browse at a predetermined speed regardless of their scroll input. The Atlantic Theater website was documented as having an opening transition that "jumps abruptly and prevents scrolling." Oatly's site was noted for "scroll locking until clicking next, limiting consumption of content." Users with trackpads, mouse wheels, touch screens, and keyboard navigation all experience scroll hijacking differently, making consistent behavior nearly impossible. Accessibility is severely impacted -- screen readers and keyboard navigation depend on predictable scroll behavior.

**The fix:**
- Do not override native scroll behavior. The browser's scroll is the result of decades of platform-specific optimization.
- If animations must respond to scroll position, use `IntersectionObserver` to trigger them without altering scroll mechanics.
- If section-snapping is needed, use CSS `scroll-snap-type` which respects native scroll physics.
- Test with trackpad, mouse wheel, touch, and keyboard. If any feel wrong, remove the override.
- The one documented success case: BBC's interactive storytelling used scroll-driven content reveal to aid comprehension -- but the scroll itself behaved normally.

**Detection rule:**
If JavaScript attaches a listener to the `wheel`, `scroll`, or `touchmove` event and calls `preventDefault()`, or if `overflow: hidden` is set on `<body>` while custom scroll logic handles movement, suspect AP-07.

---

### AP-08: Cryptic Error Messages

**Also known as:** "Something went wrong," error message theater, unhelpful errors
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Error messages that say "Something went wrong," "An error occurred," "Error: 500," "Invalid input," or "Please try again later" without explaining what failed, why it failed, or what the user can do about it. Technical jargon shown to non-technical users ("ECONNREFUSED," "null reference," "403 Forbidden").

**Why developers do it:**
Developers write error handling for the happy path and treat errors as edge cases. Generic catch-all messages are faster to implement than context-specific ones. Security concerns lead teams to hide all error details (a valid concern for server internals, but not for user-facing guidance). Backend developers write error responses; frontend developers display them verbatim without translating them into user language.

**What goes wrong:**
Smashing Magazine's 2022 guide on error message UX design documents that users abandon tasks and shopping carts due to confusing, vague, or meaningless error messages. Wix's UX team published research showing that when users encounter "Something went wrong" with no guidance, they assume the entire system is broken rather than that they made a specific, fixable mistake. Password validation is a particularly painful example: users submit a password, get "Invalid password," and must guess which of 5-8 unstated requirements they violated. Form validation errors that appear only after submission (rather than inline, in real time) force users to hunt for the problem field.

**The fix:**
- Every error message must answer three questions: (1) What happened? (2) Why? (3) What can the user do about it?
- Use plain language. "We couldn't save your changes because the file is too large (max 10MB). Try compressing the image or choosing a smaller file." is correct. "Error: PAYLOAD_TOO_LARGE" is not.
- Show form validation requirements BEFORE the user types, not after they fail.
- For password fields, display all requirements upfront and check them in real time with visual indicators.
- Log technical details server-side; show human-readable guidance client-side.

**Detection rule:**
If an error message string contains only a generic phrase ("Something went wrong," "An error occurred," "Please try again") without a specific cause or actionable next step, suspect AP-08.

---

### AP-09: No Loading Indicators

**Also known as:** Silent loading, frozen UI, dead screen
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The user performs an action (clicks a button, submits a form, navigates to a page) and nothing visibly happens for several seconds. No spinner, no skeleton screen, no progress bar, no disabled-state on the button. The user assumes the click did not register and clicks again, potentially triggering duplicate submissions. Or they assume the app is broken and leave.

**Why developers do it:**
Loading states add implementation overhead to every async operation. Developers on fast local networks never experience the delays that real users on 3G or congested Wi-Fi face. Loading indicators are often deprioritized as "polish" work that gets cut from sprints. The optimistic assumption that APIs will respond quickly makes loading states seem unnecessary during development.

**What goes wrong:**
Nielsen Norman Group research on response time thresholds establishes that users perceive delays over 1 second as a system problem if there is no feedback. Without loading indicators, users double-click buttons (creating duplicate orders, duplicate API calls, duplicate database entries). Carbon Design System's loading pattern documentation notes that skeleton screens improve perceived performance by up to 30% compared to blank screens, even when actual load time is identical. Users on slow connections interpret a blank screen as a crash and abandon the task entirely.

**The fix:**
- Show a spinner or skeleton screen for any operation that may take more than 300ms.
- Disable interactive elements (buttons, forms) during submission to prevent double-clicks.
- For operations over 3 seconds, show a progress bar or status message.
- For operations over 10 seconds, explain what is happening and provide a way to cancel.
- Use skeleton screens instead of spinners for page-level content loading -- they set correct expectations about layout.
- Implement optimistic UI updates where safe (e.g., show the message as "sent" immediately while confirming in the background).

**Detection rule:**
If an async operation (fetch, form submit, navigation) does not set a loading/pending state variable that triggers a visual indicator in the UI, suspect AP-09.

---

### AP-10: Hidden Password Requirements

**Also known as:** Guess-the-rules, post-hoc validation, password frustration loop
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The user creates a password, clicks submit, and only then learns that the password must contain an uppercase letter, a number, a special character, be between 8-64 characters, and cannot contain their username. Each requirement is revealed one at a time with each failed submission. The requirements are never shown together upfront.

**Why developers do it:**
Password validation is handled server-side, and the server returns a single error at a time. Developers display whatever the backend returns without adding client-side pre-validation. Showing all requirements upfront is perceived as "cluttering" the form. Password policies evolve over time, and the frontend is not updated to reflect new rules.

**What goes wrong:**
CXL's research on password UX found that hidden requirements are one of the top sources of form abandonment. RunSignUp's 2025 UX case study on password reset redesign documented that users cycle through 3-5 submission attempts when requirements are hidden, with each failure increasing frustration and abandonment likelihood. Users who are forced to create complex passwords they did not plan for resort to predictable patterns ("Password1!") that technically meet requirements but provide minimal security. The frustration of repeatedly failing validation leads users to abandon registration entirely or use password managers to generate and forget credentials, reducing engagement.

**The fix:**
- Display all password requirements visibly next to the password field before the user types anything.
- Validate each requirement in real time as the user types, with visual checkmarks or color changes.
- Show a password strength meter that updates live.
- Allow password visibility toggle (show/hide).
- If requirements change, update both backend and frontend simultaneously.

**Detection rule:**
If a password input field does not have adjacent, always-visible requirement text, and validation only occurs on form submission rather than on input change, suspect AP-10.

---

### AP-11: Hamburger Menu for Primary Actions

**Also known as:** Hidden navigation, buried features, the three-line graveyard
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
All navigation -- including the most important, most-used actions -- is hidden behind a hamburger menu icon on both mobile and desktop. Users must tap the icon, scan the revealed list, and tap again to reach any destination. Primary call-to-action items like "Create," "Search," or "Dashboard" are buried alongside "Settings," "Help," and "Legal."

**Why developers do it:**
Hamburger menus are a convention that "solves" responsive design -- one pattern works on all screen sizes. They create a visually clean header. Designers see apps like Facebook and Gmail using hamburger menus and assume it works for all contexts. Adding visible navigation items requires making layout decisions about prioritization, which is harder than hiding everything.

**What goes wrong:**
Nielsen Norman Group's research found that hiding navigation behind a hamburger menu decreases content discoverability by more than 20% and increases perceived task difficulty by 21% compared to visible navigation. CXL's revenue impact analysis found that hamburger menus reduce engagement by nearly half. When primary actions are hidden, new users cannot discover core features, power users cannot access frequent actions quickly, and conversion-critical paths (sign up, purchase, create) suffer reduced traffic. The hamburger icon's recognition rate, while improved from early years, still does not approach 100% -- a significant minority of users do not know what it means.

**The fix:**
- Show the top 4-5 navigation items visibly. Use a hamburger menu only for secondary/tertiary items.
- On mobile, use a bottom tab bar for primary navigation (the pattern used by the most successful mobile apps).
- On desktop, there is no reason to hide primary navigation -- use a standard horizontal nav bar.
- Prioritize ruthlessly: if everything is in the hamburger menu, nothing is discoverable.
- A/B test visible vs. hidden navigation and measure task completion rates, not just aesthetics.

**Detection rule:**
If the primary navigation component on desktop renders all items behind a toggle/hamburger and no persistent visible navigation items exist, suspect AP-11.

---

### AP-12: Checkout/Signup Flow Bloat

**Also known as:** Form marathon, death by a thousand fields, over-collecting
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
A checkout, registration, or onboarding flow that requires too many steps, too many form fields, or collects information the system does not actually need to complete the transaction. Mandatory fields for phone number, company name, "How did you hear about us?", secondary email, and demographics during a simple purchase. Multi-page flows that could be a single page.

**Why developers do it:**
Marketing wants data for segmentation. Analytics wants attribution. Legal wants terms acceptance on a separate page. Each team adds "just one more field" without seeing the cumulative impact. The checkout process averages 5.1 steps from cart to order review according to Baymard Institute -- unchanged since 2012 because organizations add steps but never remove them.

**What goes wrong:**
The global average cart abandonment rate is 70.22%. Baymard's research shows that 17% of shoppers abandon specifically because the checkout process is too long or complicated, and 21% leave when the checkout experience is too lengthy. Each additional form field reduces conversion rate. Baymard found that the ideal checkout has 7-8 form fields (12-14 form elements), and most sites can achieve a 20-60% reduction in form elements. Their data shows that a 35% conversion improvement is achievable through checkout design changes alone. Requiring account creation before purchase increases abandonment by 35%.

**The fix:**
- Audit every field: if the transaction can complete without it, make it optional or remove it.
- Target 7-8 form fields maximum for checkout.
- Offer guest checkout -- do not require account creation to purchase.
- Combine related fields (full name instead of first + middle + last).
- Use address autocomplete to reduce fields.
- Show progress indicators so users know how many steps remain.
- Request optional data (surveys, preferences) after the transaction is complete, not during.

**Detection rule:**
If a checkout or signup flow has more than 8 required form fields or more than 3 page transitions, suspect AP-12.

---

### AP-13: No Undo for Destructive Actions

**Also known as:** Permanent delete without safety net, one-click catastrophe, irreversible action
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Destructive actions (delete, archive, send, publish, overwrite) execute immediately on a single click with no confirmation dialog, no undo period, and no recovery mechanism. The user accidentally clicks "Delete" on a project with 6 months of work, and it is gone instantly.

**Why developers do it:**
Confirmation dialogs add friction, and teams want the UI to feel "fast" and "responsive." Implementing soft-delete with a recovery window requires additional backend work (flagging records, scheduling cleanup, building an undo UI). Developers reason that "users will be careful" -- but accidental clicks, touchscreen mis-taps, and keyboard shortcuts happen constantly. Some teams believe that a confirmation dialog ("Are you sure?") is sufficient, but dialog fatigue means users click "Yes" reflexively.

**What goes wrong:**
Nielsen Norman Group's usability heuristic #3 (User Control and Freedom) explicitly requires an "emergency exit" for mistaken actions. GitLab's 2017 incident, where a database was accidentally deleted, illustrates the catastrophic consequences of irreversible actions at scale. At the individual user level, accidental deletion of files, emails, messages, or creative work causes disproportionate emotional distress and loss of trust in the platform. Users who have experienced data loss become anxious about using the product, reducing engagement.

**The fix:**
- Implement soft-delete with a recovery window (Gmail's "Undo Send" 30-second window is the gold standard).
- Show a toast notification with an "Undo" button after destructive actions, rather than a pre-action confirmation dialog.
- For high-stakes actions (deleting an account, removing a team member), require deliberate confirmation: type the item name to confirm, or require re-authentication.
- Maintain a "Trash" or "Recently Deleted" section with a 30-day retention period.
- Distinguish severity: quick undo for low-stakes (archive email), deliberate confirmation for high-stakes (delete account).

**Detection rule:**
If a delete/remove/destroy action handler directly mutates state or calls an API without first setting a pending/undo state or showing a confirmation mechanism, suspect AP-13.

---

### AP-14: Inconsistent Interaction Patterns

**Also known as:** Frankenstein UI, mixed metaphors, unpredictable behavior
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
The same action behaves differently in different parts of the application. Swiping deletes in one list but archives in another. Some forms save on blur, others require a "Save" button. Some buttons navigate, others open modals, others submit forms -- all styled identically. Confirmation works via dialog in one flow and inline in another. Date pickers use different formats across screens.

**Why developers do it:**
Different developers or teams build different sections of the app, each making independent design decisions. Features are added incrementally over months or years without a central design system. Third-party components are mixed with custom components, each bringing their own interaction conventions. Rapid iteration and A/B testing leave behind a patchwork of behaviors.

**What goes wrong:**
Inconsistency breaks users' mental models, which increases cognitive load on every interaction. Users cannot transfer knowledge from one part of the app to another, making the learning curve perpetual. Versions.com's research on visual consistency and cognitive flow documents that inconsistent patterns force users to "re-learn" the interface repeatedly. The cumulative effect is that users feel the app is unreliable and unprofessional. Error rates increase because users apply the wrong mental model (e.g., expecting swipe-to-delete but triggering swipe-to-archive).

**The fix:**
- Establish and enforce a design system with documented interaction patterns.
- Create a component library where each component has one defined behavior.
- Conduct a consistency audit: catalog every instance of common interactions (save, delete, navigate, confirm) and align them.
- Define and document platform conventions (Material Design, HIG) and follow them consistently.
- When adding new interactions, check existing patterns first -- never invent a new pattern for an already-solved interaction.

**Detection rule:**
If the same semantic action (e.g., "delete") is implemented with different UI patterns (dialog vs. inline vs. swipe) across different screens in the same application, suspect AP-14.

---

### AP-15: Information Overload

**Also known as:** Choice paralysis, option overwhelm, the paradox of choice, kitchen-sink UI
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
A screen that presents too many options, too much data, or too many possible actions simultaneously. Navigation with 15+ top-level items. Dashboards with 30 widgets. Settings pages with 50+ options on a single screen. Product listing pages showing 150 items without filtering or categorization.

**Why developers do it:**
Every feature team wants their feature visible. Removing options feels like removing value. Data-oriented teams believe more data equals more transparency. Product managers equate feature count with product quality. The fear of hiding something important leads to showing everything, which hides everything equally.

**What goes wrong:**
Sheena Iyengar's famous "jam study" demonstrated that while a display of 24 jam varieties attracted more browsers than a display of 6, purchase rates were 6x higher from the smaller display (30% vs. 3%). This "paradox of choice" is well-documented in UX research. Netflix struggles with "Netflix paralysis" where users spend more time scrolling than watching. Project management tools with 50+ customization settings create daunting onboarding experiences. Nielsen Norman Group's research on choice overload shows that excessive options reduce decision quality, increase anxiety, and decrease satisfaction with the final selection.

**The fix:**
- Limit primary navigation to 5-7 items (Miller's Law: 7 plus or minus 2).
- Use progressive disclosure: show essential options first, reveal advanced options on demand.
- Implement smart defaults so users only need to change what matters to them.
- Provide filtering, search, and categorization for large datasets rather than displaying everything.
- Use recommendations or "most popular" to guide users toward good choices.
- Amazon shows 4-7 recommended options despite having millions of products -- follow their model.

**Detection rule:**
If a single view presents more than 7 primary navigation items, more than 10 actionable buttons/links, or more than 20 data points without filtering/pagination, suspect AP-15.

---

### AP-16: Empty State Neglect

**Also known as:** Blank screen, zero-data state, ghost town UI
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
When a user first opens a section with no data (empty inbox, new project with no tasks, search with no results, filtered list with no matches), the screen is completely blank or shows only a container with no content. No guidance, no call to action, no explanation of why it is empty or what to do next.

**Why developers do it:**
Developers build features for the populated state and never test with zero data. Sample data in development environments masks the empty state. Empty states are considered an edge case that "users will only see once," so they are deprioritized. The assumption is that users will figure out they need to add content.

**What goes wrong:**
Pencil & Paper's research on empty state UX patterns documents that empty states are often the first impression a new user has of a feature -- and a blank screen communicates "broken" or "useless." Eleken's analysis of empty state UX examples shows that treating empty states as dead ends causes users to leave rather than engage. First-time users who encounter blank screens during onboarding may never return. "No results found" with no suggestions for broadening the search creates a dead end. Empty states in collaborative tools suggest that the tool has no activity, which can discourage adoption.

**The fix:**
- Design every empty state intentionally. It should include: (1) an explanation of what this area is for, (2) a clear call-to-action to add content, and (3) optional illustration or example to set expectations.
- For "no results" states, suggest alternative searches, show popular items, or offer to broaden filters.
- For first-time states, provide onboarding guidance or sample data.
- For error states, explain what went wrong and how to fix it.
- Test every feature with zero data as part of QA.

**Detection rule:**
If a list, grid, or content area renders an empty container (no children, no placeholder text) when the data array has length 0, suspect AP-16.

---

### AP-17: Forced Updates Interrupting Work

**Also known as:** Mandatory restart, update hijacking, work-destroying updates
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**
The application or operating system forces an update that interrupts the user's current work. Updates install and restart without explicit user consent. Modal dialogs demand immediate restart with only "Restart Now" and "Restart in 15 Minutes" as options. Updates that cannot be deferred block the user from continuing their task.

**Why developers do it:**
Security teams need patches deployed quickly to close vulnerabilities. Maintaining multiple versions is expensive. Forced updates reduce the support burden of old versions. Product teams want users on the latest version to access new features. The assumption is that a brief interruption is acceptable for long-term benefit.

**What goes wrong:**
Microsoft's forced Windows Update restarts are among the most documented UX failures in software history. Microsoft Q&A forums contain thousands of reports of users losing work: one user reported losing 16 hours of work to a forced reboot with no warning. Another reported losing a 23-page master's degree paper when a forced overnight update placed them in a temporary account, making their files inaccessible. A TenForums thread documents a user who was "typing in Word" when a forced update restarted their machine and lost everything. Major updates have caused boot loops, blue screens, and BitLocker recovery prompts. The pattern teaches users to distrust the platform and resist ALL updates, including critical security patches, which paradoxically makes the system less secure.

**The fix:**
- Never force-restart without explicit, informed user consent.
- Offer "Update on next restart" as a persistent option.
- Save application state before any forced operation and restore it afterward.
- Use background updates that apply on the next natural restart (Chrome's model).
- For critical security updates, use prominent but non-blocking notifications that explain the urgency.
- Auto-save user work continuously so that forced restarts do not cause data loss.

**Detection rule:**
If an update mechanism triggers a restart, process termination, or blocking modal without checking for unsaved user work and without offering an indefinite deferral option, suspect AP-17.

---

### AP-18: Form State Amnesia

**Also known as:** Lost form data, navigation data loss, the vanishing form
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The user fills out a multi-field form, navigates away (accidentally or to check information), returns, and finds the form completely reset. All entered data is gone. This happens with back-navigation, accidental link clicks, tab switching in mobile browsers, or session timeouts. Multi-step forms that lose all data when the user navigates back one step.

**Why developers do it:**
Form state is stored only in component state (React `useState`, Vue reactive data) which is destroyed on unmount. Developers do not persist form data to `sessionStorage`, `localStorage`, or URL parameters. Multi-step forms use independent component instances per step without a shared state store. Session timeouts reset state without warning. The assumption that users will complete forms in a single, uninterrupted session does not match real-world behavior.

**What goes wrong:**
Smashing Magazine's research on back button UX design documents that users are "often afraid of losing their data" when navigating, and this fear is frequently justified. In multi-step checkout flows, navigating back often "brings users to the very start of the process rather than to the previous page, with all data evaporated." On mobile, context switches (answering a call, checking a message, switching apps) can cause the browser to unload the page, destroying form state. Users who lose 10+ minutes of form input data will not re-enter it -- they will abandon the task permanently.

**The fix:**
- Persist form data to `sessionStorage` on every input change for single-page forms.
- For multi-step forms, store accumulated data in a shared state store or `sessionStorage` that survives navigation between steps.
- Implement `beforeunload` warnings when forms have unsaved changes.
- Use the `autocomplete` attribute so browsers can help restore data.
- On mobile, use the Page Lifecycle API to save state when the page is hidden.
- For long forms, implement periodic auto-save with a visible "Draft saved" indicator.

**Detection rule:**
If a form component stores input data only in local component state without writing to `sessionStorage`, a state store, or the URL, and the form has more than 3 fields, suspect AP-18.

---

### AP-19: Ignoring Mobile Context

**Also known as:** Desktop-first tunnel vision, responsive afterthought, mobile neglect
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
A desktop interface shrunk to fit a mobile screen. Tiny tap targets that require precision clicking. Hover-dependent interactions that have no touch equivalent. Forms optimized for keyboard + mouse but painful on touchscreen keyboards. Content that requires horizontal scrolling on mobile. Pop-ups and modals that overflow the mobile viewport. Features that assume a continuous, stable internet connection.

**Why developers do it:**
Developers work on desktop machines with large monitors, mice, and fast connections. Responsive design is often treated as "make it not break on small screens" rather than "design for mobile context." Testing on real mobile devices is slower and more cumbersome than resizing a browser window (which misses touch, network, and performance differences). Desktop designs are approved by stakeholders viewing presentations on desktop screens.

**What goes wrong:**
Mobile traffic exceeds desktop traffic for most consumer applications, making desktop-first design a decision to optimize for the minority. BayTech Consulting documented real cases where business websites look fine on desktop but have tiny text, hard-to-tap buttons, and require zooming on mobile. WordPress theme failures are common: hero images overlap headlines, navigation menus fail to open, and submit buttons are partially hidden on certain phones. Contact forms that work on desktop but fail on mobile due to viewport issues result in "lost leads." The core problem identified by Web Designer Depot is that responsive design assumes content and functionality should be identical across devices, which is not true -- mobile users have different tasks, contexts, and constraints.

**The fix:**
- Adopt mobile-first design: design for mobile constraints first, then enhance for larger screens.
- Minimum tap target size: 44x44 CSS pixels (Apple HIG) or 48x48dp (Material Design).
- Replace hover interactions with tap-accessible alternatives.
- Use appropriate mobile input types (`type="tel"`, `type="email"`, `inputmode="numeric"`).
- Test on real devices, not just browser DevTools -- touch behavior, keyboard appearance, and performance differ.
- Consider mobile-specific context: intermittent connectivity, one-handed use, interruptions, sunlight glare.

**Detection rule:**
If interactive elements have dimensions below 44x44px, if `:hover` pseudo-classes are used for essential functionality without corresponding touch handlers, or if the viewport meta tag is missing, suspect AP-19.

---

### AP-20: Silent Action Feedback

**Also known as:** Did it work?, ghost actions, no confirmation
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The user performs an action (saves a document, adds an item to cart, sends a message, changes a setting) and receives no visual, auditory, or haptic confirmation that the action succeeded. The button does not change state. No toast or notification appears. The user is left wondering: did it work? Should I click again?

**Why developers do it:**
Developers see the network request succeed in DevTools and assume the user knows too. Feedback mechanisms (toasts, animations, state changes) are treated as polish and deprioritized. The assumption is that the absence of an error message implies success. Rapid development cycles focus on functionality, not communication.

**What goes wrong:**
Without feedback, users repeat actions (double-ordering, duplicate-sending, re-saving). Nielsen Norman Group's heuristic #1 (Visibility of System Status) states that the system should always keep users informed about what is going on through appropriate feedback within a reasonable time. Users who are unsure whether their action succeeded develop anxiety about using the system and resort to workarounds (refreshing the page, checking via another channel). In e-commerce, silent "add to cart" leads to users checking the cart after every addition, adding friction. In messaging apps, no sent confirmation creates uncertainty about whether the message was delivered.

**The fix:**
- Every user action must produce visible feedback within 100ms.
- Use appropriate feedback for the action: toast notifications for saves, button state changes for toggles, inline confirmations for form submissions, animation for additions/removals.
- Follow the feedback hierarchy: subtle (button state change) for frequent low-stakes actions, moderate (toast) for important confirmations, prominent (page change, modal) for major completions.
- Include state in interactive elements: buttons should have default, hover, active, loading, success, and error states.
- Provide status for async operations: "Saving...", "Saved", "Failed to save -- retry?"

**Detection rule:**
If a click/submit handler fires an async operation and does not update any UI state (loading indicator, disabled state, toast, or confirmation message) upon resolution, suspect AP-20.

---

### AP-21: Forced Linear Wizard for Non-Linear Tasks

**Also known as:** Wizard anti-pattern, rigid step flow, unnecessary sequencing
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
A multi-step wizard that forces users through a rigid, linear sequence for a task that is not inherently sequential. Users cannot skip optional steps, cannot complete steps in their preferred order, cannot see an overview of all required information, and cannot jump directly to the step they need to edit. Editing a previous step requires navigating back through all intermediate steps.

**Why developers do it:**
Wizards are a well-established UI pattern that simplifies complex tasks by breaking them into smaller pieces. Developers apply the pattern universally without evaluating whether the task is truly linear. Wizard components in UI libraries make implementation easy. The step-by-step approach "feels" helpful and structured. Product managers request wizards because they can track step-by-step completion funnels.

**What goes wrong:**
Eleken's research on wizard UI patterns found that "a fully linear flow can sometimes frustrate users who may want to skip certain steps, or complete the process in an order that better suits their needs." Nielsen Norman Group's wizard design recommendations warn that "because the process is presented one step at a time, there is danger that users will miss the context, get confused, or not realize how long the progression will be." Users who need to change one field in step 2 of a 6-step wizard must navigate through steps 1 and 2, make the change, then navigate forward through steps 3-6 again (or worse, lose steps 3-6 data). Profile setup wizards that force users through interests, avatar, bio, and notification settings when the user just wants to start using the product create abandonment at each unnecessary step.

**The fix:**
- Use wizards only for tasks that are genuinely sequential (e.g., payment flow where shipping address must come before shipping method).
- For non-linear tasks, use a single scrollable form, tabbed sections, or a checklist/dashboard pattern.
- If a wizard is appropriate, allow direct navigation to any step (clickable step indicators).
- Show a summary/overview of all steps so users know what is coming.
- Preserve all entered data when navigating between steps.
- Allow optional steps to be skipped with a clear "Skip" action.

**Detection rule:**
If a multi-step form enforces `step > currentStep` navigation (preventing forward jumps) and the steps have no data dependency on each other, suspect AP-21.

---

## Root Cause Analysis

| Anti-Pattern | Root Cause | Prevention |
|---|---|---|
| AP-01: Mystery Meat Navigation | Prioritizing aesthetics over usability | Always pair icons with text labels; run 5-second tests |
| AP-02: Infinite Scroll Without Position | Chasing engagement metrics without considering usability | Implement scroll restoration and progress indicators |
| AP-03: Modal Overload | Marketing pressure overriding UX principles | Reserve modals for destructive/critical actions only |
| AP-04: Registration Wall | Metric-driven design (registration counts) | Deliver value before asking for commitment |
| AP-05: Breaking Back Button | SPA routing ignorance; insufficient testing | Map every view state to a unique URL; test backward nav |
| AP-06: Autoplay Audio/Video | Chasing view count metrics | Respect user-initiated playback; never autoplay with sound |
| AP-07: Scroll Hijacking | Award-chasing design; agency showcase mindset | Never override native scroll behavior |
| AP-08: Cryptic Error Messages | Developer convenience; security overcorrection | Answer: what happened, why, what can the user do |
| AP-09: No Loading Indicators | Fast dev networks mask real-world latency | Show feedback for any operation over 300ms |
| AP-10: Hidden Password Requirements | Backend-driven validation without frontend sync | Display all requirements upfront with real-time checking |
| AP-11: Hamburger Menu Abuse | Avoiding prioritization decisions | Show top 4-5 items visibly; hamburger for secondary only |
| AP-12: Checkout Flow Bloat | Every team adds fields, nobody removes them | Audit and minimize to 7-8 fields; offer guest checkout |
| AP-13: No Undo for Destructive Actions | Premature optimization of flow speed | Implement soft-delete with recovery window |
| AP-14: Inconsistent Patterns | Multiple teams, no design system | Establish and enforce a design system |
| AP-15: Information Overload | Feature-count-as-value thinking | Progressive disclosure; limit primary options to 5-7 |
| AP-16: Empty State Neglect | Testing only with populated data | Design every empty state with guidance and CTAs |
| AP-17: Forced Updates | Security/support pressure to unify versions | Background updates; never restart without consent |
| AP-18: Form State Amnesia | Storing state only in component memory | Persist form data to sessionStorage or shared state |
| AP-19: Ignoring Mobile Context | Developing on desktop; responsive as afterthought | Mobile-first design; test on real devices |
| AP-20: Silent Action Feedback | Assuming success is self-evident | Every action must produce visible feedback within 100ms |
| AP-21: Forced Linear Wizard | Misapplying sequential pattern to non-sequential tasks | Use wizards only for genuinely sequential tasks |

## Self-Check Questions

1. Can a first-time user identify every navigation element without hovering or guessing?
2. If I press the back button at any point in this flow, will I return to a sensible previous state with my data intact?
3. Am I showing this modal because the user needs to see it RIGHT NOW, or because I want them to see it?
4. Can a user get value from this product before I ask them to register?
5. If this operation takes 5 seconds on a 3G connection, what will the user see?
6. Does every error message tell the user (a) what happened, (b) why, and (c) what to do?
7. If the user accidentally triggers a destructive action, can they recover within 30 seconds?
8. Would this interaction work identically if I used a touchscreen with one hand on a moving bus?
9. Have I tested this screen with zero data? What does a new user see?
10. If I squint at this screen, can I identify the 2-3 most important actions, or does everything compete equally for attention?
11. Are all password/validation requirements visible BEFORE the user attempts to submit?
12. Is this wizard genuinely sequential, or could the user reasonably complete these steps in any order?
13. Does every button click produce visible feedback, even for operations that will take zero perceived time?
14. If the user switches apps on their phone and comes back to this form, will their data still be there?
15. Am I hiding this navigation to make the design cleaner, or because the user genuinely does not need it?

## Code Smell Quick Reference

| If you see... | Suspect... | Verify... |
|---|---|---|
| Icon-only navigation with no `aria-label` or adjacent text | AP-01: Mystery Meat Navigation | Hover/tap each element -- can you tell what it does without hovering? |
| Scroll event listener appending content with no history/URL state update | AP-02: Infinite Scroll Without Position | Press back after scrolling 50 items -- do you return to your position? |
| Modal triggered on page load, timer, or scroll event | AP-03: Modal Overload | Is this modal for a critical/destructive action? If not, use a banner |
| Login/register route as the app's default/index route | AP-04: Registration Wall | Can a new visitor see ANY value before authenticating? |
| `history.pushState` without corresponding URL change | AP-05: Breaking Back Button | Test back button on every screen in the flow |
| `<video autoplay>` or `.play()` without user gesture | AP-06: Autoplay Media | Does the user explicitly choose to play? |
| `wheel`/`scroll` event with `preventDefault()` | AP-07: Scroll Hijacking | Does scrolling feel native? Test trackpad, mouse, touch, keyboard |
| Error string containing only "Something went wrong" or "Error occurred" | AP-08: Cryptic Errors | Does the message explain what, why, and how to fix? |
| Async operation with no loading state variable | AP-09: No Loading Indicators | Throttle network to 3G and retry the action |
| Password field with no adjacent requirement text | AP-10: Hidden Password Rules | Submit an empty password -- are requirements shown before or after? |
| All nav items inside a hamburger toggle on desktop | AP-11: Hamburger Abuse | Are the top 4-5 items visible without clicking? |
| Checkout form with >8 required fields | AP-12: Flow Bloat | Can the transaction complete without each field? |
| Delete handler calling API directly with no undo/confirm | AP-13: No Undo | Click delete -- can you recover within 30 seconds? |
| Same action (delete/save) implemented differently across screens | AP-14: Inconsistent Patterns | Catalog all delete interactions -- are they the same? |
| Single view with >10 action buttons or >7 nav items | AP-15: Information Overload | Can a new user identify the primary action in 3 seconds? |
| Empty array rendering empty `<div>` or `<ul>` | AP-16: Empty State Neglect | View with zero data -- is guidance shown? |
| Update mechanism with `process.exit()` or forced restart | AP-17: Forced Updates | Can the user defer indefinitely? Is work auto-saved? |
| Form data stored only in `useState`/reactive state | AP-18: Form Amnesia | Navigate away and back -- is data preserved? |
| Interactive elements with `width`/`height` < 44px | AP-19: Mobile Neglect | Tap on a real phone -- can you hit every target? |
| Click handler with no UI state change on success | AP-20: Silent Feedback | Perform the action -- how do you know it worked? |
| Multi-step form with `step === n` guard preventing forward navigation | AP-21: Wizard Anti-Pattern | Can you jump to step 4 from step 1 if steps are independent? |

---

*Researched: 2026-03-08 | Sources: [Nielsen Norman Group - Hamburger Menus](https://www.nngroup.com/articles/hamburger-menus/), [Nielsen Norman Group - Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/), [Nielsen Norman Group - Modal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/), [Nielsen Norman Group - Infinite Scrolling Tips](https://www.nngroup.com/articles/infinite-scrolling-tips/), [Baymard Institute - Cart Abandonment Statistics](https://baymard.com/lists/cart-abandonment-rate), [Baymard Institute - Back Button UX](https://baymard.com/blog/back-button-expectations), [Smashing Magazine - Error Messages UX](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/), [Smashing Magazine - Back Button UX](https://www.smashingmagazine.com/2022/08/back-button-ux-design/), [Smashing Magazine - Infinite Scroll](https://www.smashingmagazine.com/2022/03/designing-better-infinite-scroll/), [Interaction Design Foundation - Forced Registration](https://ixdf.org/literature/topics/forced-registration), [CXL - Password UX](https://cxl.com/blog/password-ux/), [CXL - Hamburger Icon Revenue](https://cxl.com/blog/testing-hamburger-icon-revenue/), [Snapchat Redesign Backlash - TechCrunch](https://techcrunch.com/2018/02/21/snapchat-responds-to-the-change-org-petition-complaining-about-the-apps-redesign/), [Snapchat Petition - CNBC](https://www.cnbc.com/2018/02/15/snapchat-redesign-petition-to-scrap-update-hits-1-million-votes.html), [Microsoft Forced Updates - MS Q&A](https://learn.microsoft.com/en-us/answers/questions/4370448/furious-about-forced-windows-update-reboot-critica), [Windows Update Lost Work - TenForums](https://www.tenforums.com/microsoft-office-365/172492-forced-windows-update-while-typing-word-lost-everything.html), [Foliovision - Sticky Video UX](https://foliovision.com/2023/03/sticky-video-ux), [Chrome Autoplay Policy - Bugzilla](https://bugzilla.mozilla.org/show_bug.cgi?id=1420389), [Eleken - Dark Patterns](https://www.eleken.co/blog-posts/dark-patterns-examples), [Eleken - Empty State UX](https://www.eleken.co/blog-posts/empty-state-ux), [Eleken - Wizard UI](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained), [Pencil & Paper - Empty States](https://www.pencilandpaper.io/articles/empty-states), [Wix UX - Error Messages](https://wix-ux.com/when-life-gives-you-lemons-write-better-error-messages-46c5223e1a2f), [RunSignUp - Password UX Case Study](https://info.runsignup.com/2025/05/05/ux-case-study-redesigning-the-reset-password-experience/), [Medium - Modal Interruption Cost](https://medium.com/@adamshriki/the-high-cost-of-interruption-re-evaluating-the-modal-dialog-in-modern-ux-e448fb7559ff), [Dark Patterns Hall of Shame](https://hallofshame.design/), [ICS - UX Anti-Patterns](https://www.ics.com/blog/anti-patterns-user-experience-design)*
