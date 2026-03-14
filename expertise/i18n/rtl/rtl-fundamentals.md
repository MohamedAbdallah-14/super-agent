# RTL Fundamentals — i18n/RTL Expertise Module

> The core rules of right-to-left layout: what mirrors, what doesn't, and why "just flip the layout" is wrong. RTL is a fundamental change in reading direction, interaction patterns, and visual hierarchy—not a CSS transform.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** W3C BiDi, Material Design RTL, Apple HIG RTL
> **RTL impact:** Critical — this is the entry point for all RTL work

## 1. The Rules

### What Mirrors (Layout and Directional Elements)

| Element | LTR | RTL | Why |
|---------|-----|-----|-----|
| **Layout flow** | Content starts left, flows right | Content starts right, flows left | Reading direction |
| **Navigation** | Items ordered left→right | Items ordered right→left | Reading order |
| **Back arrow** | ← (points left) | → (points right) | "Back" = toward start |
| **Forward arrow** | → (points right) | ← (points left) | "Forward" = toward end |
| **Sidebar** | Left side | Right side | Start edge |
| **Padding/margins** | `padding-left` = start | `padding-inline-start` = start | Logical = auto-mirror |
| **Text alignment** | `text-align: left` | `text-align: start` | Start = reading start |
| **Progress bar fill** | Fills left→right | Fills right→left | Direction of progress |
| **Tabs** | First tab on left | First tab on right | Start edge |
| **Form labels** | Label left of input | Label right of input | Start-before-end |
| **Icons with direction** | Back, forward, chevron | Mirrored | Convey direction |

### What Does NOT Mirror

| Element | Reason |
|---------|--------|
| **Checkmark (✓)** | No inherent direction; same in all locales |
| **Play button (▶)** | Represents play action, not reading direction |
| **Media timeline** | Time flows left→right universally |
| **Charts and graphs** | X-axis = time/quantity; convention is LTR |
| **Maps** | Geographic; north is up, east is right |
| **Clocks** | 12 at top is universal |
| **Numbers** | 123 stays 123 (Western Arabic numerals) |
| **Phone numbers** | Always LTR |
| **URLs, email** | Always LTR |
| **Brand logos** | Do not mirror |
| **Music notation** | Universal convention |
| **Video playhead** | Represents time; moves left→right |

### The #1 Rule: Physical vs Logical

**Physical:** `left`, `right`, `margin-left`, `padding-right` — fixed in space.

**Logical:** `start`, `end`, `inline-start`, `inline-end`, `margin-inline-start` — follow reading direction.

Using logical properties prevents ~60% of RTL bugs. Every layout decision should ask: "Is this physical or logical?"

---

## 2. Visual Examples (Described in Detail)

### Back Arrow

- **LTR:** Back arrow points left (←). User taps to go "back" = toward the start of the navigation stack.
- **RTL:** Back arrow points right (→). "Back" still means toward the start—but in RTL, start is on the right. The arrow mirrors so it points toward the right edge, where the user "came from."

### Progress Bar

- **LTR:** Bar fills from left to right. Empty on the left, full on the right.
- **RTL:** Bar fills from right to left. Empty on the right, full on the left. Progress direction follows reading direction.

### Media Playhead

- **LTR and RTL:** Playhead moves left→right. Time is universal; 0:00 is left, end is right. Do NOT mirror.

### List with Leading Icon

- **LTR:** Icon on left, text on right. `[icon] Item text`
- **RTL:** Icon on right, text on left. `Item text [icon]` — icon stays at the start (which is now right).

### Form: Label + Input

- **LTR:** Label to the left of the input. `Name: [________]`
- **RTL:** Label to the right of the input. `[________] :Name` — label at start, input at end.

### Mixed Content: "Hello العربية"

- **LTR paragraph:** "Hello" LTR, "العربية" RTL (reversed visually), both in one line.
- **RTL paragraph:** "العربية" RTL, "Hello" LTR (embedded), order depends on BiDi algorithm.

---

## 3. Platform Implementation

### Web (CSS Logical Properties)

```css
/* Physical (avoid for layout) */
margin-left: 16px;
padding-right: 8px;
text-align: left;

/* Logical (RTL-safe) */
margin-inline-start: 16px;
padding-inline-end: 8px;
text-align: start;
```

**Transform that does NOT auto-mirror:**
```css
/* BAD: translateX is physical */
transform: translateX(10px);

/* GOOD: use direction multiplier or logical equivalent */
transform: translateX(calc(10px * var(--dir, 1))); /* dir = -1 for RTL */
```

### Flutter

```dart
// Use Directionality
Directionality(
  textDirection: TextDirection.rtl,
  child: Row(
    children: [...],
  ),
)

// Use EdgeInsetsDirectional, not EdgeInsets
EdgeInsetsDirectional.only(start: 16, end: 8)

// Icons: Icon with semanticLabel; use RTL-aware icons
Icon(Icons.arrow_back) // Flutter mirrors automatically when Directionality is RTL
```

### iOS (Auto Layout)

- Use `leading` and `trailing` constraints, not `left` and `right`
- `UIView.semanticContentAttribute = .forceRightToLeft` for RTL
- SF Symbols: many auto-mirror; use `symbolConfiguration` for custom behavior

### Android

- `android:layoutDirection="rtl"` on root or `View`
- `start`/`end` in XML layouts instead of `left`/`right`
- `getLayoutDirectionFromLocale()` for system locale

---

## 4. Mixed Content Handling

### LTR Inside RTL

- English brand names, URLs, code: wrap in `dir="ltr"` or equivalent
- Numbers (Western): often LTR; may need LRM in edge cases

### RTL Inside LTR

- Arabic/Hebrew names in English UI: wrap in `dir="rtl"` or `dir="auto"`
- Use `<bdi>` when direction is unknown

### Phone Numbers, Email, URLs

- Always LTR; do not mirror

---

## 5. Common RTL Bugs

1. **Shadows and gradients** — `box-shadow` with `left` offset doesn't mirror; use `inset-inline-start` or direction-aware values.
2. **Swipe gestures** — Swipe-to-go-back: in RTL, "back" swipe should be from the right edge.
3. **Text alignment** — `text-align: left` on mixed content; use `text-align: start`.
4. **Padding/margin** — Using `padding-left`; use `padding-inline-start`.
5. **Icons that should mirror** — Back, forward, chevrons; ensure they flip.
6. **Icons that shouldn't** — Checkmark, play, share; do not mirror.
7. **Progress bar** — Filling wrong direction; should fill start→end.
8. **Transform** — `translateX(10px)` doesn't mirror; use logical or direction multiplier.
9. **Absolute positioning** — `left: 0`; use `inset-inline-start: 0`.
10. **Border radius** — `border-top-left-radius`; consider `border-start-start-radius` if asymmetric.
11. **Flexbox** — `flex-direction: row` is logical; `row-reverse` for RTL is usually wrong—prefer logical props.
12. **Scroll position** — Horizontal scroll may start from right in RTL.
13. **Tab order** — Focus order should follow visual order in RTL.
14. **Truncation** — `text-overflow: ellipsis`; ellipsis should appear at end (inline-end).
15. **Z-index and overlay** — Overlays from "start" side; in RTL, start is right.

---

## 6. QA Checklist

- [ ] Layout mirrors: navigation, sidebars, tabs
- [ ] Back/forward arrows mirror
- [ ] Progress bars fill correct direction
- [ ] Media timeline and playhead do NOT mirror
- [ ] Forms: labels at start of input
- [ ] No physical properties (left/right) for layout
- [ ] Shadows/gradients correct in RTL
- [ ] Swipe gestures match direction
- [ ] Mixed content (Arabic in English, etc.) displays correctly
- [ ] Phone numbers, URLs, email stay LTR
- [ ] Focus order follows visual order
- [ ] Truncation and ellipsis at correct edge

---

## Quick Reference Checklist

- [ ] Use logical properties (start/end, inline-start/end)
- [ ] Mirror directional icons (back, forward, chevrons)
- [ ] Do NOT mirror: play, checkmark, media timeline, maps, numbers
- [ ] Progress bar fills start→end
- [ ] Test with real Arabic (العربية) and Hebrew (עברית)
- [ ] Verify shadows, transforms, and absolute positioning
- [ ] Swipe gestures match RTL expectations

---
*Researched: 2026-03-08 | Sources: W3C BiDi, Material Design RTL, Apple HIG RTL, MDN logical properties, RTL guidelines (GitHub)*
