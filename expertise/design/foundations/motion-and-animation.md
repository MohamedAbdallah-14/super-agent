# Motion and Animation -- Design Foundation Module

> Motion in UI exists to orient, focus, express, and inform -- never to decorate.
> Every animation must answer the question: "What does this help the user understand?"
> If the answer is "nothing," remove it. Motion that lacks purpose is motion that steals attention.

---

## 1. Core Principles

### 1.1 The Four Purposes of Motion

Motion in user interfaces serves exactly four functions. If an animation does not fulfill at least one, it should not exist.

| Purpose | Description | Example |
|---------|-------------|---------|
| **Orient** | Show spatial relationships, where things come from and go to | A panel sliding in from the right tells the user they can swipe right to dismiss it |
| **Focus** | Direct attention to what matters right now | A subtle pulse on a newly appeared notification badge |
| **Express** | Convey brand personality and emotional tone | A playful bounce on a successful action in a consumer app |
| **Inform** | Communicate status, feedback, or state changes | A progress bar filling, a skeleton screen shimmer indicating loading |

Anti-pattern: Animation used purely for visual flair (spinning logos, gratuitous parallax, decorative particle effects) adds cognitive load without informational value.

### 1.2 Disney's 12 Principles Adapted for UI

The 12 principles of animation, codified by Ollie Johnston and Frank Thomas in *The Illusion of Life* (1981), translate to digital interfaces as follows:

| # | Principle | UI Adaptation |
|---|-----------|---------------|
| 1 | **Squash & Stretch** | Subtle scale changes on button press (scale 0.95 on press, 1.0 on release) convey tactility. Never exceed 5-10% deformation in UI -- this is not a cartoon. |
| 2 | **Anticipation** | A brief pull-back before a card flies off screen. A button slightly depressing before an action fires. Prepares the user for what comes next. |
| 3 | **Staging** | Draw focus to the primary action. Dim or blur background content when a modal appears. Use motion to establish visual hierarchy. |
| 4 | **Straight Ahead / Pose to Pose** | In UI, "pose to pose" dominates: define start and end states clearly, let easing handle the in-between. Straight-ahead (frame-by-frame) is reserved for complex illustration animations. |
| 5 | **Follow Through & Overlapping Action** | When a list scrolls to a stop, items slightly overshoot then settle. A dismissed card's shadow trails behind the card itself. Creates natural feel. |
| 6 | **Slow In, Slow Out** | The foundation of easing curves. Elements accelerate from rest and decelerate into their final position. Linear motion feels robotic. |
| 7 | **Arc** | Natural motion follows curved paths. A FAB (floating action button) morphing into a sheet should trace an arc, not teleport linearly. |
| 8 | **Secondary Action** | A checkmark appearing inside a button after a successful submit, while the button itself changes color. Supports the primary action without competing. |
| 9 | **Timing** | The single most critical principle for UI. See Section 1.3 for exact values. Wrong timing makes interfaces feel sluggish or jarring. |
| 10 | **Exaggeration** | Used sparingly: an error shake animation slightly exceeds realistic displacement to ensure visibility. In UI, subtlety almost always wins. |
| 11 | **Solid Drawing** | Maintain consistent perspective and spatial relationships during transitions. A card expanding should not break the spatial model of the interface. |
| 12 | **Appeal** | The overall aesthetic quality of motion. Smooth, confident, purposeful motion increases perceived quality and trust. Jittery, inconsistent motion destroys it. |

### 1.3 Timing: The Numbers That Matter

Research from Nielsen Norman Group establishes these perceptual thresholds:

| Duration | User Perception | Typical Use |
|----------|----------------|-------------|
| < 100ms | Instantaneous -- user perceives no delay | System feedback (ripple effects, state toggles) |
| 100-200ms | Fast and responsive | Micro-interactions: button presses, toggles, checkboxes, icon morphs |
| 200-300ms | Smooth and natural | Small element transitions: tooltips appearing, dropdown menus, tabs switching |
| 300-500ms | Deliberate and noticeable | Complex transitions: page transitions, modal open/close, expanding cards |
| 500-1000ms | Slow -- use only for dramatic emphasis | Large-surface transitions: full-screen overlays, onboarding sequences |
| > 1000ms | Feels broken -- user becomes impatient | Almost never appropriate for UI transitions |

Critical rules:
- **Exit animations should be 20-30% faster than entrance animations.** Users should not wait for things to leave. A modal that takes 300ms to appear should take 200-250ms to dismiss.
- **Frequent animations must be shorter.** A hover effect seen 50 times per session at 500ms will infuriate users. Keep repeating animations under 200ms.
- **Mobile animations should be 20-30% shorter than desktop equivalents.** Smaller screens mean shorter travel distances.

### 1.4 Easing Curves

Linear motion (`cubic-bezier(0, 0, 1, 1)`) feels mechanical and unnatural. Always apply easing.

| Easing Type | When to Use | CSS cubic-bezier |
|-------------|-------------|------------------|
| **Ease-out (decelerate)** | Elements entering the screen -- they arrive quickly and settle into place | `cubic-bezier(0, 0, 0.2, 1)` |
| **Ease-in (accelerate)** | Elements leaving the screen -- they start slowly and accelerate away | `cubic-bezier(0.4, 0, 1, 1)` |
| **Ease-in-out (standard)** | Elements moving between two on-screen positions | `cubic-bezier(0.4, 0, 0.2, 1)` |
| **Emphasized decelerate** | Important entrances that need to feel weighty | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| **Emphasized accelerate** | Important exits that need finality | `cubic-bezier(0.3, 0, 0.8, 0.15)` |

Rule of thumb: **Ease-out is your default.** Most UI motion involves something appearing or arriving, which calls for deceleration.

### 1.5 Material Design 3 Motion Tokens

Material Design 3 defines a systematic token-based motion system. These are the canonical values from the `material-tokens` specification (source: `material-foundation/material-tokens` on GitHub):

**Duration tokens:**

| Token | Value | Typical Use |
|-------|-------|-------------|
| `md.sys.motion.duration.short1` | 50ms | Instant feedback, ripples |
| `md.sys.motion.duration.short2` | 100ms | Small icon changes, state indicators |
| `md.sys.motion.duration.short3` | 150ms | Button press feedback, checkbox toggle |
| `md.sys.motion.duration.short4` | 200ms | Micro-interactions, small reveals |
| `md.sys.motion.duration.medium1` | 250ms | Dropdown menus, tooltips |
| `md.sys.motion.duration.medium2` | 300ms | Bottom sheets, navigation rail expansion |
| `md.sys.motion.duration.medium3` | 350ms | Card expansion, tab transitions |
| `md.sys.motion.duration.medium4` | 400ms | Dialog open, navigation drawer |
| `md.sys.motion.duration.long1` | 450ms | Page transitions |
| `md.sys.motion.duration.long2` | 500ms | Large surface changes |
| `md.sys.motion.duration.long3` | 550ms | Complex coordinated transitions |
| `md.sys.motion.duration.long4` | 600ms | Full-screen transitions |
| `md.sys.motion.duration.extra-long1` | 700ms | Dramatic emphasis transitions |
| `md.sys.motion.duration.extra-long2` | 800ms | Onboarding sequences |
| `md.sys.motion.duration.extra-long3` | 900ms | Complex choreographed motion |
| `md.sys.motion.duration.extra-long4` | 1000ms | Reserved for exceptional cases |

**Easing tokens:**

| Token | Type | Value (cubic-bezier) |
|-------|------|----------------------|
| `md.sys.motion.easing.linear` | Linear | `(0, 0, 1, 1)` |
| `md.sys.motion.easing.standard` | Standard | `(0.2, 0, 0, 1)` |
| `md.sys.motion.easing.standard.accelerate` | Standard accelerate | `(0.3, 0, 1, 1)` |
| `md.sys.motion.easing.standard.decelerate` | Standard decelerate | `(0, 0, 0, 1)` |
| `md.sys.motion.easing.emphasized.accelerate` | Emphasized accelerate | `(0.3, 0, 0.8, 0.15)` |
| `md.sys.motion.easing.emphasized.decelerate` | Emphasized decelerate | `(0.05, 0.7, 0.1, 1)` |
| `md.sys.motion.easing.legacy` | Legacy (M2 compat) | `(0.4, 0, 0.2, 1)` |

Note: M3 Expressive (2025+) introduces a physics-based motion system that replaces fixed easing curves with spring dynamics for more natural, responsive motion. The easing tokens above remain available for non-spring contexts.

### 1.6 Spring-Based Animations

Spring physics produce more natural-feeling motion than cubic-bezier curves because they model real-world inertia. Springs respond to velocity, meaning an interrupted animation continues naturally rather than restarting.

**Core spring parameters:**

| Parameter | Description | Effect of Higher Values |
|-----------|-------------|------------------------|
| **Stiffness** (tension) | How forcefully the spring pulls toward its target | More sudden, snappy movement |
| **Damping** (friction) | How quickly oscillation dies out | Less bouncing, faster settling |
| **Mass** | Weight of the animated object | More lethargic, heavier-feeling movement |

**Common spring presets (Framer Motion / React Spring):**

```
// Snappy -- button feedback, toggles
{ type: "spring", stiffness: 500, damping: 30, mass: 1 }

// Gentle -- cards, panels sliding
{ type: "spring", stiffness: 200, damping: 20, mass: 1 }

// Bouncy -- playful consumer apps, success states
{ type: "spring", stiffness: 300, damping: 10, mass: 1 }

// Heavy -- large surfaces, page transitions
{ type: "spring", stiffness: 100, damping: 20, mass: 2 }

// SwiftUI default equivalent
{ type: "spring", stiffness: ~170, damping: ~26, mass: 1 }
// (response: 0.55, dampingFraction: 0.825)
```

**Duration-based springs** (Framer Motion alternative syntax):

```
// Easier to reason about when you need predictable timing
{ type: "spring", duration: 0.3, bounce: 0 }    // No bounce, 300ms
{ type: "spring", duration: 0.4, bounce: 0.25 }  // Subtle bounce, 400ms
{ type: "spring", duration: 0.6, bounce: 0.5 }   // Playful bounce, 600ms
```

When to use springs vs. curves:
- **Springs**: Gesture-driven animations (drag, swipe), interruptible transitions, anything that should feel physical
- **Curves**: Simple state changes (color, opacity fades), CSS-only implementations, animations that must have exact duration

### 1.7 Reduced Motion: Non-Negotiable Accessibility

Vestibular disorders affect roughly 35% of adults over 40. Motion sensitivity can cause nausea, dizziness, and disorientation. Supporting `prefers-reduced-motion` is not optional.

**Implementation strategy:**

```css
/* Approach 1: Opt-in motion (recommended) */
/* Default: no motion */
* {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* Add motion only when user is OK with it */
@media (prefers-reduced-motion: no-preference) {
  * {
    animation-duration: revert;
    transition-duration: revert;
  }
}

/* Approach 2: Opt-out motion (more common) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Reduced motion does NOT mean no motion.** Replace:
- Sliding transitions with crossfades (opacity changes)
- Parallax scrolling with static positioning
- Bouncing/springing with instant state changes
- Auto-playing animations with static states or user-triggered playback
- Spinning loaders with pulsing opacity loaders

**JavaScript detection:**

```js
const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Framer Motion
<motion.div
  animate={{ x: 100 }}
  transition={prefersReduced
    ? { duration: 0 }
    : { type: "spring", stiffness: 300, damping: 20 }
  }
/>
```

### 1.8 The 60fps Imperative

Animations must run at 60 frames per second (16.67ms per frame). Dropping below this threshold produces visible stutter ("jank") that degrades perceived quality.

Rules:
- **Animate only compositor-friendly properties:** `transform` (translate, scale, rotate) and `opacity`. These skip layout and paint, running entirely on the GPU.
- **Never animate:** `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `border-width`, `font-size`. These trigger layout recalculation on every frame.
- **Use `will-change` sparingly:** `will-change: transform, opacity` promotes an element to its own compositor layer. Apply only to elements that will actually animate, and remove after animation completes.
- **If an animation cannot hit 60fps, simplify it.** Drop shadow animations, filter animations, and clip-path animations are expensive. Replace with pre-rendered alternatives or simpler motion.

---

## 2. Do's and Don'ts

### Do's

1. **Do use 100-200ms for micro-interactions** (toggles, checkboxes, icon morphs). These happen frequently and must feel instantaneous. Material's `short2`-`short4` tokens (100-200ms) are ideal.

2. **Do use ease-out (decelerate) for entrances.** Elements arriving on screen should decelerate into their resting position: `cubic-bezier(0, 0, 0.2, 1)` or `md.sys.motion.easing.standard.decelerate`.

3. **Do make exits 20-30% faster than entrances.** A tooltip appearing at 250ms should disappear at 175-200ms. Users should not wait for departing elements.

4. **Do stagger list item animations at 30-50ms intervals.** This creates a cascading "waterfall" effect that reads as a cohesive group. Cap total stagger at ~15 items -- beyond that, use a wave or group fade.

5. **Do animate `transform` and `opacity` exclusively whenever possible.** These are GPU-composited and will not trigger layout or paint. A "slide in" uses `translateX`, not `left`.

6. **Do use spring animations for gesture-driven interactions.** Drag-to-dismiss, pull-to-refresh, and swipe actions feel natural with springs because springs incorporate velocity from the gesture.

7. **Do provide visual continuity between states.** When navigating from a list item to a detail view, use a shared element / container transform transition (300-400ms) so the user understands the spatial relationship.

8. **Do use consistent timing across your product.** Define a motion scale (like Material's duration tokens) and reference it everywhere. Inconsistent timing feels amateurish.

9. **Do pair animation with haptic feedback on mobile.** A 100ms button press animation paired with a light haptic tap (`UIImpactFeedbackGenerator.style.light` on iOS) multiplies the perceived responsiveness.

10. **Do test animations at 0.5x speed in development.** Slowing animations reveals timing issues, easing problems, and z-order conflicts invisible at full speed. Chrome DevTools and Xcode both support this.

11. **Do use opacity fades (150-200ms) as a safe fallback.** When in doubt about which transition to use, a simple crossfade is unobtrusive, performant, and accessible.

12. **Do animate state changes that would otherwise be invisible.** A counter incrementing should briefly highlight or scale; a price changing should flash. Without motion, users miss updates.

13. **Do respect the content density / motion complexity inverse rule.** Dense data dashboards should use minimal, fast motion (100-200ms fades). Sparse consumer apps can use more expressive motion (300-500ms springs).

14. **Do use `will-change` before animation starts and remove it after completion.** This prevents unnecessary GPU memory consumption from permanent layer promotion.

### Don'ts

1. **Don't animate for longer than 500ms for standard transitions.** NNGroup research confirms that beyond 500ms, animations feel like a drag and users perceive the interface as slow. Reserve 500ms+ for truly exceptional moments.

2. **Don't use linear easing for UI transitions.** Linear motion `(0, 0, 1, 1)` has no acceleration or deceleration and feels mechanical. The only valid use is looping progress indicators (spinners).

3. **Don't animate layout-triggering properties.** Animating `width`, `height`, `top`, `left`, `margin`, or `padding` causes the browser to recalculate layout on every frame, causing jank. Use `transform: scale()` and `transform: translate()` instead.

4. **Don't auto-play looping animations without a pause mechanism.** WCAG 2.2 Success Criterion 2.2.2 requires that any animation lasting longer than 5 seconds must be pausable, stoppable, or hideable.

5. **Don't use bounce or elastic easing on critical UI elements.** A "bouncing" save button looks playful but undermines confidence in a banking app. Match motion personality to the product's trust level.

6. **Don't stagger more than 15 items individually.** A list of 50 items staggering in at 50ms each takes 2.5 seconds to fully render. Group items or use a single wave animation instead.

7. **Don't animate on scroll without throttling.** Scroll-linked animations must use `requestAnimationFrame`, Intersection Observer, or CSS `scroll-timeline`. Raw scroll event listeners firing at 120Hz will freeze the main thread.

8. **Don't ignore `prefers-reduced-motion`.** Failing to respect this user setting is both an accessibility violation (WCAG 2.3.3) and a potential trigger for vestibular disorders. Every shipped animation needs a reduced-motion alternative.

9. **Don't use different easing curves for enter and exit of the same element.** If a dialog enters with `ease-out`, it should exit with `ease-in` -- the logical inverse. Mismatched curves create cognitive dissonance.

10. **Don't block user interaction during animations.** Users should be able to tap, click, or navigate even while a transition is in progress. Disable `pointer-events: none` as briefly as possible, or better, make transitions interruptible.

11. **Don't chain more than 3 sequential animations.** Serial A-then-B-then-C-then-D animations force users to wait. Use parallel or staggered motion instead, keeping total choreography under 600ms.

12. **Don't use motion to hide slow performance.** A fancy loading animation does not excuse a 3-second data fetch. Fix the performance problem; don't distract from it.

13. **Don't apply the same animation to every element on the page.** When everything moves, nothing stands out. Motion should create hierarchy: primary actions get the most expressive motion; secondary elements get subtle or no motion.

14. **Don't forget to test on low-end devices.** An animation that runs at 60fps on an M3 MacBook may stutter at 20fps on a budget Android phone. Test on real hardware or throttle CPU 4x in DevTools.

---

## 3. Platform Variations

### 3.1 iOS (UIKit / SwiftUI)

**Default animation model:** Spring-based. Since iOS 17 and SwiftUI's evolution, springs are the default animation type. Calling `withAnimation { }` in SwiftUI uses a spring with `response: 0.55` and `dampingFraction: 0.825`.

**Key parameters for SwiftUI springs:**
- `response`: How quickly the animation reaches its target (seconds). Lower = faster. Default: 0.55.
- `dampingFraction`: How much oscillation occurs. 0 = infinite bounce, 1 = no bounce (critically damped). Default: 0.825.
- `blendDuration`: How long to blend with a previous animation. Default: 0.

**Common SwiftUI animation patterns:**

```swift
// Default spring (most common)
withAnimation(.spring()) { isExpanded.toggle() }

// Snappy interaction feedback
withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) { ... }

// Bouncy success animation
withAnimation(.spring(response: 0.5, dampingFraction: 0.5)) { ... }

// Quick non-bouncing transition
withAnimation(.spring(response: 0.25, dampingFraction: 1.0)) { ... }

// Matched geometry for shared element transitions
.matchedGeometryEffect(id: item.id, in: namespace)
```

**Haptic feedback pairing:**
- `UIImpactFeedbackGenerator`: `.light`, `.medium`, `.heavy`, `.rigid`, `.soft` -- use for button taps, toggles, collisions.
- `UISelectionFeedbackGenerator`: Use for picker wheels, segmented controls, selection changes.
- `UINotificationFeedbackGenerator`: `.success`, `.warning`, `.error` -- use for form submission outcomes.
- Always call `.prepare()` before triggering to prime the Taptic Engine and eliminate latency.

**iOS-specific guidelines:**
- Navigation pushes/pops use a 350ms interactive spring by default. Do not override unless you have a strong reason.
- Sheet presentations (`.sheet`, `.fullScreenCover`) use system-provided springs. Customize via `presentationDetents` rather than reimplementing.
- Respect `UIAccessibility.isReduceMotionEnabled` -- replace slides with crossfades.
- iOS 26 introduces "Liquid Glass" design language with fluid, translucent motion. Embrace system transitions that leverage this.

### 3.2 Android (Material Motion)

**Material Motion transition patterns:**

| Pattern | Use Case | Duration |
|---------|----------|----------|
| **Container Transform** | List item to detail, FAB to full screen | 300-450ms |
| **Shared Axis** | Navigation between sibling views (tabs, stepper) | 300ms |
| **Fade Through** | Unrelated view transitions (bottom nav switches) | 300ms |
| **Fade** | Overlays, dialogs, menus appearing/disappearing | 150-250ms |

**Container Transform** is the flagship M3 transition. It creates a visible connection between two UI elements by morphing one container into another, maintaining spatial continuity. Implementation uses `MaterialContainerTransform` with configurable `fadeMode`:
- `FADE_MODE_IN`: Incoming view fades in over outgoing (default)
- `FADE_MODE_OUT`: Outgoing fades out before incoming appears
- `FADE_MODE_THROUGH`: Sequential fade-out then fade-in (minimizes overlap)
- `FADE_MODE_CROSS`: Both fade simultaneously

**Shared Element Transitions** in Android use `ActivityOptionsCompat.makeSceneTransitionAnimation()` or Jetpack Navigation's `FragmentNavigator.Extras`. Always provide a transition name on both source and destination views.

**Android-specific guidelines:**
- Use `MotionLayout` for complex constraint-based animations that respond to scroll or swipe.
- Jetpack Compose animations use `animateContentSize()`, `AnimatedVisibility`, and `animateXAsState()` as the primary APIs.
- Compose springs: `spring(dampingRatio = 0.75f, stiffness = 300f)` -- note parameter naming differs from SwiftUI.
- Material You / M3 Expressive: embrace the new physics-based motion system for components that opt into it.

### 3.3 Web (CSS / JavaScript / WAAPI)

**Three animation technologies, one performance model:**

| Technology | Best For | Complexity | Performance |
|------------|----------|------------|-------------|
| **CSS Transitions** | Simple A-to-B state changes (hover, focus, active) | Low | GPU-composited for transform/opacity |
| **CSS Animations** | Multi-step keyframe sequences, looping animations | Medium | GPU-composited for transform/opacity |
| **Web Animations API (WAAPI)** | Dynamic, JS-controlled animations, complex choreography | High | Same engine as CSS -- identical perf |

They all run on the same browser compositor. Performance is determined by *which properties* you animate, not which API you use.

**CSS Transitions (use by default):**

```css
.card {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1),
              opacity 200ms cubic-bezier(0, 0, 0.2, 1);
}
.card:hover {
  transform: translateY(-4px);
  opacity: 0.95;
}
```

**CSS Animations (for keyframes):**

```css
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.panel-enter {
  animation: slide-in 300ms cubic-bezier(0, 0, 0.2, 1) forwards;
}
```

**Web Animations API (for JS control):**

```js
element.animate(
  [
    { transform: 'translateX(100%)', opacity: 0 },
    { transform: 'translateX(0)',    opacity: 1 }
  ],
  { duration: 300, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'forwards' }
);
```

**CSS `scroll-timeline` and `view-timeline` (2025+):**
Modern browsers support scroll-driven animations without JavaScript. Use for parallax, progress indicators, and reveal-on-scroll effects -- far more performant than Intersection Observer + JS animation.

**`will-change` optimization:**

```css
/* Apply BEFORE animation starts */
.about-to-animate { will-change: transform, opacity; }

/* Remove AFTER animation ends -- do not leave permanently */
.done-animating { will-change: auto; }
```

Permanent `will-change` on many elements wastes GPU memory and can actually degrade performance. Apply it programmatically, not in base styles.

### 3.4 Performance: The Property Tier List

Not all CSS properties are equal for animation performance:

| Tier | Properties | Cost | Notes |
|------|-----------|------|-------|
| **S -- Composite only** | `transform`, `opacity` | Cheapest | GPU-composited, no layout or paint. Always prefer these. |
| **A -- Paint only** | `background-color`, `color`, `box-shadow`, `border-color` | Moderate | Skip layout but trigger repaint. Acceptable for infrequent animations. |
| **B -- Layout + Paint** | `width`, `height`, `padding`, `margin`, `border-width` | Expensive | Trigger full layout recalculation. Avoid animating. Use `transform: scale()` instead. |
| **F -- Never animate** | `top`, `left`, `right`, `bottom` (on positioned elements) | Very expensive | Use `transform: translate()` instead. |

**Framer Motion / Motion One performance patterns:**

```jsx
// GOOD: GPU-composited properties only
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
/>

// BAD: Animating height triggers layout
<motion.div
  initial={{ height: 0 }}
  animate={{ height: "auto" }}
/>

// GOOD alternative: use layout animation
<motion.div layout>
  <AnimatePresence>
    {isOpen && <motion.div exit={{ opacity: 0 }} />}
  </AnimatePresence>
</motion.div>
```

---

## 4. Common Mistakes in AI-Generated Designs

AI code generation tools (Copilot, Claude, GPT, v0, Bolt) frequently produce animation code with the following defects. Review and correct every AI-generated animation against this list.

### 4.1 Over-Animation

**Problem:** AI tends to add animation to every element because it "looks polished." Result: everything moves, nothing stands out, and the interface feels chaotic.

**Detection:** Count the number of simultaneously animating elements on any given screen. If more than 3-4 elements are moving at once, the design is over-animated.

**Fix:** Apply the hierarchy rule: only the primary action or content change should get expressive motion. Secondary elements get subtle fades or no animation. Background elements stay static.

### 4.2 Wrong Timing Values

**Problem:** AI commonly generates 500ms or 1000ms durations for simple transitions, making the interface feel sluggish. It also tends to apply the same duration to all animations regardless of context.

**Detection:** Open DevTools, slow animations to 0.25x, and watch for any animation that feels like "waiting." If you are conscious of waiting for an animation to finish, it is too slow.

**Fix:** Apply the timing scale from Section 1.3. Micro-interactions: 100-200ms. Transitions: 200-300ms. Complex: 300-500ms. Nothing over 500ms unless exceptional.

### 4.3 Missing Reduced Motion Support

**Problem:** AI-generated code almost never includes `prefers-reduced-motion` handling. This is both an accessibility failure and a potential legal liability under ADA/EAA.

**Detection:** Search the codebase for `prefers-reduced-motion`. If it appears zero times and animations exist, this is a defect.

**Fix:** Add the global reduced-motion media query (Section 1.7) and test with the OS setting enabled. Every animation library call should check `prefersReducedMotion`.

### 4.4 Animating Layout Properties

**Problem:** AI generates `animate={{ width: "100%" }}` or `transition: height 300ms` without understanding the performance cost. This triggers layout recalculation on every frame.

**Detection:** Open Chrome DevTools Performance panel, record the animation, and check for long "Layout" blocks in the flame chart. Or enable "Rendering > Layout Shift Regions" to see layout thrashing visually.

**Fix:** Replace `width`/`height` animations with `transform: scale()`. Replace `top`/`left` with `transform: translate()`. Use Framer Motion's `layout` prop for true size animations that need to look like width/height changes.

### 4.5 Linear Easing Everywhere

**Problem:** AI defaults to `transition: all 300ms` which uses `ease` (better than linear but still generic), or explicitly sets `linear` easing. Both produce robotic-feeling motion.

**Detection:** Watch animations closely. If elements move at constant speed with no acceleration/deceleration, the easing is wrong.

**Fix:** Apply the easing rules from Section 1.4. Entrances: ease-out. Exits: ease-in. Between states: ease-in-out. Use Material's easing tokens for consistency.

### 4.6 Jank from Too Many Simultaneous Animations

**Problem:** AI generates staggered lists of 50+ items each with individual animations, scroll-linked animations without throttling, or animations on elements outside the viewport.

**Detection:** Monitor frame rate during the animation. Chrome DevTools FPS meter or `performance.now()` frame timing. Any frame taking > 16.67ms is a dropped frame.

**Fix:**
- Only animate elements visible in the viewport (use Intersection Observer).
- Batch staggered animations (animate groups of 3-5 items, not individuals).
- Use CSS `content-visibility: auto` to skip rendering off-screen elements entirely.
- Throttle scroll-driven animations to `requestAnimationFrame` cadence.

### 4.7 No Exit Animations

**Problem:** AI adds entrance animations but forgets exit animations. Elements pop in gracefully but disappear instantly, creating asymmetric transitions.

**Detection:** Remove an element or navigate away and observe. If the outgoing state has no transition, this is a defect.

**Fix:** Always define both enter and exit states. In Framer Motion, use `<AnimatePresence>` with `exit` props. In CSS, apply transitions to both the adding and removing class.

---

## 5. Decision Framework

### 5.1 When to Animate vs. When to Snap

Use this decision tree for every UI state change:

```
Is the state change visible to the user?
  No  --> Snap (no animation needed)
  Yes --> Does animation help the user understand what changed?
    No  --> Snap (animation would be decorative)
    Yes --> Is the change small (color, icon, badge)?
      Yes --> Micro-interaction: 100-200ms, ease-out
      No  --> Is the change spatial (something moved)?
        Yes --> Transition: 200-350ms, spring or ease-out
        No  --> Is the change structural (layout reflow)?
          Yes --> Layout animation: 250-400ms, spring
          No  --> Crossfade: 150-250ms, ease-in-out
```

**Always snap (no animation):**
- Typing feedback in text fields
- Instant data updates (stock prices, live scores) -- highlight with color instead
- Menu items appearing after intentional click (the click IS the feedback)
- Error messages appearing (urgency trumps aesthetics)
- Any change behind a loading state that the user is waiting for

**Always animate:**
- Navigation between views (spatial continuity)
- Elements entering or leaving the screen (orient the user)
- State toggles (on/off, expand/collapse) -- confirm the action happened
- Drag-and-drop reordering (maintain object identity)
- Skeleton-to-content transitions (smooth perceived loading)

### 5.2 Subtle vs. Expressive Motion

The expressiveness of motion should be calibrated to three factors:

| Factor | Subtle Motion | Expressive Motion |
|--------|---------------|-------------------|
| **Frequency** | High (hover effects, toggles, seen 100x/session) | Low (success confirmation, onboarding, seen 1-3x) |
| **Content density** | High (dashboards, data tables, admin panels) | Low (landing pages, consumer apps, marketing) |
| **Trust level** | High-trust (banking, healthcare, legal) | Casual (social, gaming, creative tools) |
| **User expertise** | Expert users (speed over polish) | Novice users (guidance over speed) |

Spectrum with values:

```
No Motion          Subtle              Moderate           Expressive
|-- snap --|-- 100-150ms --|-- 200-300ms --|-- 300-500ms+ --|
   Typing     Hover state     Tab switch     Onboarding
   Errors     Toggle          Modal open     Achievement
   Live data  Tooltip         Navigation     First-time use
```

### 5.3 Performance Budgets

Define animation performance budgets per platform:

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Frame rate | >= 55fps sustained (60fps target) | DevTools Performance panel, `PerformanceObserver` |
| Frame budget | <= 16.67ms per frame | Long frame detection |
| Simultaneous animations | <= 5 elements | Code review |
| Total animation time per interaction | <= 600ms | Stopwatch / slow-motion review |
| GPU memory for promoted layers | <= 50MB | Chrome DevTools Layers panel |
| Main thread work per frame | <= 4ms for animation logic | Performance profiling |

If any budget is exceeded, simplify:
1. Reduce the number of animating elements
2. Switch from spring to simple ease curve (less computation)
3. Remove secondary animations, keep only the primary
4. Replace complex transitions with crossfades
5. Pre-render complex animations as video/Lottie

---

## Quick Reference Checklist

Use this checklist before shipping any screen or component with motion:

- [ ] **Purpose**: Every animation answers "what does this help the user understand?"
- [ ] **Timing micro**: Micro-interactions are 100-200ms (Material `short2`-`short4`)
- [ ] **Timing transitions**: View transitions are 200-400ms (Material `short4`-`medium4`)
- [ ] **Timing exits**: Exit animations are 20-30% faster than entrance animations
- [ ] **Easing entrances**: Elements entering use ease-out / decelerate
- [ ] **Easing exits**: Elements leaving use ease-in / accelerate
- [ ] **Easing between**: On-screen repositioning uses ease-in-out / standard
- [ ] **No linear**: No UI transition uses linear easing (spinners excepted)
- [ ] **GPU properties only**: Animations use only `transform` and `opacity` (or spring-based layout engines)
- [ ] **Reduced motion**: `prefers-reduced-motion: reduce` is handled; tested with OS setting enabled
- [ ] **60fps verified**: Animation runs at >= 55fps on target low-end device
- [ ] **Interruptible**: User can interact during/after animation without waiting
- [ ] **Exit animations exist**: Elements that animate in also animate out
- [ ] **Stagger cap**: No more than 15 individually staggered items; groups used beyond that
- [ ] **No over-animation**: Maximum 3-4 elements animate simultaneously per interaction
- [ ] **Consistency**: Timing and easing tokens are reused from a defined motion scale, not ad-hoc values
- [ ] **Mobile haptics**: Touch interactions pair animation with appropriate haptic feedback
- [ ] **Low-end tested**: Animations verified on budget hardware or with 4x CPU throttling
- [ ] **WCAG 2.2.2**: Any animation > 5 seconds can be paused, stopped, or hidden
- [ ] **Spatial logic**: Motion direction matches the spatial model (left-to-right for forward, right-to-left for back)

---

## Sources

- [Material Design 3: Easing and Duration Tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) -- Official M3 motion token specifications
- [Material Design 3: Motion Overview](https://m3.material.io/styles/motion/overview/how-it-works) -- How M3 motion system works
- [Material Design 3: Transitions](https://m3.material.io/styles/motion/transitions) -- Container transform, shared axis, fade through patterns
- [Material Foundation Motion Tokens (GitHub)](https://github.com/material-foundation/material-tokens/blob/json/json/motion.json) -- Canonical JSON token values
- [Material Components Android: Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) -- Android implementation guide
- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) -- Apple motion design guidelines
- [Apple: Reduced Motion Evaluation Criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/) -- App Store accessibility requirements
- [Apple: SwiftUI Spring Animation](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:)) -- Spring parameter documentation
- [WWDC23: Animate with Springs](https://developer.apple.com/videos/play/wwdc2023/10158/) -- Apple's spring animation guidance
- [Nielsen Norman Group: Animation Duration](https://www.nngroup.com/articles/animation-duration/) -- Research-backed timing guidelines
- [Nielsen Norman Group: Powers of 10 Time Scales](https://www.nngroup.com/articles/powers-of-10-time-scales-in-ux/) -- Perceptual thresholds
- [Motion.dev (Framer Motion)](https://motion.dev/) -- React animation library documentation
- [Framer Motion: Transition Configuration](https://www.framer.com/motion/transition/) -- Spring and tween configuration
- [Motion Magazine: Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list) -- Property-by-property performance analysis
- [MDN: CSS vs JavaScript Animation Performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance) -- Browser rendering pipeline
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) -- Reduced motion media query
- [W3C WCAG 2.1: C39 prefers-reduced-motion](https://www.w3.org/WAI/WCAG21/Techniques/css/C39) -- Accessibility technique
- [CSS-Tricks: CSS Animations vs Web Animations API](https://css-tricks.com/css-animations-vs-web-animations-api/) -- Technology comparison
- [IxDF: Disney's 12 Principles Applied to UI](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design) -- Principle adaptation for digital
- [UX Collective: Disney's 12 Principles in UX](https://uxdesign.cc/disneys-12-principles-of-animation-exemplified-in-ux-design-5cc7e3dc3f75) -- Practical UX examples
- [M3 Expressive: New Motion System](https://m3.material.io/blog/m3-expressive-motion-theming) -- Physics-based motion evolution
- [PatternFly: Motion with Purpose](https://medium.com/patternfly/motion-with-purpose-7ac3bd08efba) -- Building purposeful motion systems
