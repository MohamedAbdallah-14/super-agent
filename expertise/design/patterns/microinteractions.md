# Microinteractions & Delight -- Expertise Module

> Microinteractions are the small, contained moments of feedback that make a product feel
> alive and responsive. This module covers taxonomy, implementation, choreography, and
> performance constraints for designing delight that serves usability rather than undermining it.

---

## 1. Authority & Foundations

Dan Saffer's *Microinteractions: Designing with Details* (2013) defines the canonical
structure: **Trigger, Rules, Feedback, Loops & Modes.** A user action (or system event)
triggers a rule, the rule produces feedback, and the interaction may loop or change modes.

**Industry benchmarks referenced throughout:**

| Source | Contribution |
|--------|-------------|
| **Dan Saffer** -- *Microinteractions* (2013) | Trigger-Rules-Feedback-Loops framework; "the difference between a product you love and a product you tolerate" |
| **Stripe checkout animation** | Industry benchmark for payment UX -- progress shimmer, card flip, success checkmark. Proves microinteractions build trust in high-stakes flows |
| **Duolingo gamification** | Owl celebrations, streak animations, XP counters. Demonstrates that layered micro-feedback drives 3x daily return rates |
| **Apple HIG animation principles** | Purpose-driven motion: orient, focus, express, inform. Spring-based defaults since iOS 17 |
| **Google Material Motion** | Container transforms, shared axis, fade-through. Token-based duration/easing system |
| **Lottie (Airbnb Engineering)** | JSON-based animation format enabling designer-to-developer handoff without frame loss. Adopted by Stripe, Duolingo, Google, Uber |

---

## 2. Delight Taxonomy

Not all delight is equal. Categorize by intent to avoid deploying the wrong type at
the wrong moment.

| Type | Purpose | Example | When to Use |
|------|---------|---------|-------------|
| **Subtle** | Reduce cognitive load | Button hover state, focus ring, input highlight | Always -- these are baseline expectations |
| **Interactive** | Provide immediate feedback | Pull-to-refresh spring, swipe-to-dismiss, toggle snap | User-initiated actions requiring confirmation |
| **Discovery** | Reward exploration | Hidden keyboard shortcuts revealed via tooltip, long-press menus | Power users; never gate core functionality |
| **Contextual** | Celebrate milestones | Confetti on task completion, level-up burst, streak badge | Key moments only -- overuse destroys impact |
| **Informational** | Show system state | Skeleton loading pulse, progress ring fill, upload percentage | Data fetching, async operations, background tasks |

**Selection rule:** Subtle + Informational are mandatory baselines. Add Interactive
for state-changing actions. Reserve Discovery and Contextual for engagement-driven
products.

---

## 3. CSS Micro-Interactions

Production-ready patterns. All animations use only `transform` and `opacity` for
GPU-composited 60fps performance.

### 3.1 Shimmer Button on Hover

```css
/* Shimmer button on hover */
.btn-shimmer {
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease;
}
.btn-shimmer:hover { transform: translateY(-1px); }
.btn-shimmer::after {
  content: '';
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255,255,255,0.08) 50%,
    transparent 100%
  );
  transform: rotate(30deg);
  animation: shimmer 3s ease-in-out infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(30deg); }
  100% { transform: translateX(100%) rotate(30deg); }
}
```

### 3.2 Success Validation Sparkle

```css
/* Success validation sparkle */
.input-valid {
  animation: sparkle 0.6s ease-out;
  border-color: var(--color-success);
}
@keyframes sparkle {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  100% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
}
```

### 3.3 Skeleton Loading Pulse

```css
/* Skeleton loading pulse */
.skeleton {
  background: linear-gradient(90deg,
    var(--color-surface) 25%,
    var(--color-surface-raised) 50%,
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 3.4 Bounce Loading Dots

```css
/* Bounce loading dots */
.loading-dot {
  animation: bounce 1.4s ease-in-out infinite both;
}
.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
```

---

## 4. Transition Choreography

Choreography governs how multiple elements animate together to maintain spatial
clarity -- the user always understands where content came from and where it went.

### 4.1 Staggered List Animations

Stagger at 50ms per item, capped at 300ms total (6 items). Beyond 6, batch-fade.

```css
/* Staggered list animation */
.list-item {
  opacity: 0;
  transform: translateY(8px);
  animation: list-enter 0.3s ease-out forwards;
}
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
.list-item:nth-child(4) { animation-delay: 150ms; }
.list-item:nth-child(5) { animation-delay: 200ms; }
.list-item:nth-child(6) { animation-delay: 250ms; }
@keyframes list-enter {
  to { opacity: 1; transform: translateY(0); }
}
```

### 4.2 Skeleton to Content Fade-In

Skeleton fades out (150ms ease-in) while content fades in (250ms ease-out) with
a 4px upward translate. Overlap the two by starting content-in 100ms after
skeleton-out begins.

```css
.skeleton-exit {
  animation: skeleton-out 0.15s ease-in forwards;
}
@keyframes skeleton-out { to { opacity: 0; } }

.content-enter {
  opacity: 0;
  transform: translateY(4px);
  animation: content-in 0.25s ease-out 0.1s forwards;
}
@keyframes content-in { to { opacity: 1; transform: translateY(0); } }
```

### 4.3 Modal Enter/Exit

Enter: scale-up + opacity (300ms ease-out). Exit: scale-down + opacity (200ms
ease-in). Exits are 30% faster than entrances.

```css
.modal-enter {
  animation: modal-in 0.3s cubic-bezier(0, 0, 0.2, 1) forwards;
}
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.modal-exit {
  animation: modal-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}
@keyframes modal-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
```

### 4.4 Page Transitions (Shared Element)

Morph a list item into its detail view (300-400ms) using CSS View Transitions API.

```css
.card-thumbnail { view-transition-name: hero-image; }
::view-transition-old(hero-image),
::view-transition-new(hero-image) {
  animation-duration: 0.35s;
  animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
}
```

---

## 5. Playful Microcopy Library

Microcopy is a microinteraction of language. The right words at the right moment
create delight equal to the right animation.

| Context | Generic | Playful | When to Use Playful |
|---------|---------|---------|---------------------|
| Loading | "Loading..." | "Brewing your results..." | Consumer apps |
| Error 404 | "Page not found" | "This page went on vacation" | Marketing sites |
| Empty state | "No items" | "Nothing here yet. Let's fix that!" | Productivity apps |
| Success | "Saved" | "Nailed it! All saved." | Casual apps |
| Offline | "No connection" | "Looks like you're off the grid" | Mobile apps |
| Slow connection | "Loading slowly" | "Your internet is taking a nap" | Consumer apps |
| First use | "Welcome" | "Ready to make something awesome?" | Onboarding |

**Playful copy is NOT appropriate for:**
- Financial transactions (payment confirmations, balance displays)
- Error states with data loss risk (unsaved work, failed writes)
- Accessibility-critical messages (screen reader announcements)
- Legal/compliance text (terms, privacy notices, consent forms)
- Healthcare, emergency, or safety-critical contexts

**Rule:** When in doubt, use generic. Playful copy that falls flat is worse than
professional copy that feels safe.

---

## 6. Easter Egg Patterns

Easter eggs reward exploration and build emotional connection (Discovery delight,
Section 2). They must follow strict guardrails.

### 6.1 Trigger Patterns

| Trigger | Implementation | Example |
|---------|---------------|---------|
| Konami code | Keydown sequence: Up Up Down Down Left Right Left Right B A | Dev tools panel, hidden theme |
| Click sequence | Logo click x5 within 3 seconds | Version info, debug panel |
| Hidden shortcuts | Undocumented keyboard combos | Power-user features, quick actions |
| Seasonal themes | Date-based CSS class injection | Holiday decorations, anniversary badges |
| Achievement badges | Behavioral tracking milestones | "Power User" after 100 actions |

### 6.2 Implementation (TypeScript)

```typescript
function createKonamiListener(callback: () => void): () => void {
  const sequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA',
  ];
  let position = 0;
  const handler = (e: KeyboardEvent): void => {
    position = e.code === sequence[position] ? position + 1 : 0;
    if (position === sequence.length) { position = 0; callback(); }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
```

### 6.3 Guardrails

- Easter eggs must NOT affect core functionality or user data
- Easter eggs must NOT break accessibility (screen readers, keyboard navigation)
- Easter eggs must NOT confuse users who trigger them accidentally
- Easter eggs must be dismissible immediately (Escape key, tap outside)
- Easter eggs must respect `prefers-reduced-motion` if they involve animation
- Easter eggs must NOT appear in error flows, payment flows, or critical paths

---

## 7. Performance Budget for Animations

Every animation is a contract with the user's hardware. Violating the frame budget
destroys the delight you intended.

### 7.1 Core Rules

| Rule | Constraint | Reason |
|------|-----------|--------|
| GPU-only properties | Animate ONLY `transform` and `opacity` | No layout/paint recalculation per frame |
| 60fps budget | 16.67ms per frame maximum | Below this threshold, visible jank occurs |
| `will-change` discipline | Apply only to elements about to animate; remove after | Permanent `will-change` wastes GPU memory |
| CSS over JS for simple motion | Use CSS transitions/animations when possible | Lower overhead, compositor-thread execution |
| `requestAnimationFrame` for JS | Never use `setTimeout`/`setInterval` for animation | rAF syncs to display refresh rate |
| Simultaneous limit | Max 3-4 elements animating at once | More elements = frame budget competition |

### 7.2 Mandatory Reduced Motion Support

`prefers-reduced-motion` is a WCAG 2.3.3 requirement and ADA/EAA legal obligation.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Reduced motion does NOT mean no feedback.** Replace with instant opacity snaps,
color changes, static icons, and `aria-live` announcements.

### 7.3 Lottie Animation Budget

| Constraint | Target | Reason |
|-----------|--------|--------|
| File size (gzipped) | < 30KB | Prevents layout shift from late-loading assets |
| Author frame rate | 30fps | Halves file size; imperceptible vs 60fps |
| Layer count | 3-4 max | Masks and mattes are render-expensive |
| Renderer | `svg` (quality) or `canvas` (perf) | Match to use case |
| Reduced motion | Static fallback frame required | Accessibility compliance |

---

## 8. Anti-Patterns

### 8.1 Delight That Distracts
Animations competing with the primary task (bouncing badge during form entry).
**Fix:** Defer non-critical delight to natural pause points.

### 8.2 Non-Skippable Animations (>500ms)
Blocking interaction behind a celebratory animation. NNG: beyond 500ms, animations
feel like delays. **Fix:** All celebrations must be dismissible (tap/click/Escape).

### 8.3 Forced Whimsy
Confetti in a banking app. Bouncing icons on a medical portal. Tone-context mismatch
erodes trust. **Fix:** Match delight intensity to product gravity.

### 8.4 Missing `prefers-reduced-motion`
Shipping animations without reduced-motion support. 35% of adults over 40 experience
vestibular disorders. **Fix:** Add the global query from Section 7.2 first.

### 8.5 Sound Effects Without Mute
Audio that cannot be silenced forces users to mute their entire device. **Fix:**
Independent mute toggle, default to muted on first use.

### 8.6 Animations Blocking Content on Page Load
Staggered fade-in delays content visibility. **Fix:** Above-the-fold content appears
within 300ms. Stagger only below-the-fold content entering via scroll.

### 8.7 Over-Animating (Everything Moves)
When everything animates, nothing stands out. **Fix:** Motion hierarchy -- primary
actions get expressive motion, secondary get subtle transitions, background stays static.

### 8.8 Inconsistent Animation Curves
Mixing ease-in and ease-out randomly across components. **Fix:** Define a motion token
system. Entrances: ease-out. Exits: ease-in. Repositioning: ease-in-out. No exceptions.

### 8.9 Gratuitous Loading Animations
Complex animations masking slow performance. **Fix:** Optimize performance first.
Use skeletons. Reserve Lottie for truly indeterminate waits.

### 8.10 Animating Off-Screen Elements
Running animations outside the viewport wastes CPU/GPU. **Fix:** Use Intersection
Observer to start on viewport entry and pause on exit.

---

## 9. Accessibility Checklist for Microinteractions

Every microinteraction must pass all items before shipping:

- [ ] `prefers-reduced-motion: reduce` handled -- tested with OS setting enabled
- [ ] No animation relies on motion alone to convey information (pair with color,
      icon, or text)
- [ ] Interactive animations are keyboard-operable (not touch/mouse-only)
- [ ] Celebratory overlays (confetti, modals) are dismissible via Escape key
- [ ] Focus management: overlays trap focus; dismissal returns focus to trigger
- [ ] `aria-live` regions announce state changes that animations convey visually
- [ ] Sound effects have independent mute control and visual equivalents
- [ ] Animations do not exceed 5 seconds without pause/stop control (WCAG 2.2.2)
- [ ] Color is never the sole indicator of animation state (WCAG 1.4.1)
- [ ] Animated content meets 4.5:1 contrast ratio at every frame (WCAG 1.4.3)

---

## 10. Decision Tree: When to Add Microinteractions

```
Is the user performing an action that changes state?
  No  --> Is the system communicating status?
    No  --> No microinteraction needed. Stop.
    Yes --> Use Informational type (skeleton, progress ring, pulse).
  Yes --> Does the action need immediate confirmation?
    No  --> Subtle hover/focus feedback only.
    Yes --> Is this a milestone or completion moment?
      No  --> Interactive type (toggle snap, swipe spring, button press).
      Yes --> Is the product tone casual or playful?
        No  --> Subtle success (checkmark draw, green border sparkle).
        Yes --> Contextual celebration (confetti, badge unlock, XP burst).
              BUT: must be dismissible, under 500ms, reduced-motion safe.
```

---

## 11. Quick Reference: Timing Cheat Sheet

| Interaction | Duration | Easing | Properties |
|-------------|----------|--------|------------|
| Button hover lift | 150ms | ease | transform (translateY) |
| Toggle/checkbox snap | 100-200ms | ease-out | transform (scale), opacity |
| Input focus ring | 150ms | ease-out | box-shadow (repaint OK, infrequent) |
| Validation sparkle | 600ms | ease-out | box-shadow |
| Skeleton shimmer cycle | 1500ms | ease-in-out | background-position |
| List item stagger | 300ms + 50ms/item | ease-out | transform (translateY), opacity |
| Modal enter | 300ms | ease-out (decelerate) | transform (scale), opacity |
| Modal exit | 200ms | ease-in (accelerate) | transform (scale), opacity |
| Toast enter | 200ms | ease-out | transform (translateY), opacity |
| Toast exit | 150ms | ease-in | transform (translateY), opacity |
| Page cross-fade | 250ms | ease-in-out | opacity |
| Confetti burst | 800ms | ease-out | transform, opacity |
| Success checkmark draw | 350-500ms | ease-out | stroke-dashoffset |

---

## References

- Dan Saffer, *Microinteractions: Designing with Details* (O'Reilly, 2013)
- [Stripe Checkout UX](https://stripe.com/payments/checkout) -- Payment animation benchmark
- [Duolingo Gamification Case Study](https://trophy.so/blog/duolingo-gamification-case-study) -- Layered micro-feedback
- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) -- Purpose-driven animation
- [Material Design 3: Motion](https://m3.material.io/styles/motion/overview/how-it-works) -- Token-based motion system
- [Lottie by Airbnb](https://airbnb.design/lottie/) -- JSON animation format and tooling
- [NNG: Animation Duration](https://www.nngroup.com/articles/animation-duration/) -- Research-backed timing
- [NNG: Microinteractions in UX](https://www.nngroup.com/articles/microinteractions/) -- Taxonomy and guidelines
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) -- Accessibility media query
- [WCAG 2.2.2: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html) -- Animation accessibility requirement
- [WCAG 2.3.3: Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) -- Motion sensitivity
- [web.dev: Animations and Performance](https://web.dev/articles/animations-and-performance) -- GPU-composited properties
