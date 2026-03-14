# RTL Layout Mirroring — i18n/RTL Expertise Module

> The mechanics of layout mirroring: CSS logical properties, Flexbox/Grid behavior, transforms, and platform-specific APIs. Physical vs logical is the central concept—every layout decision must use the correct model.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** CSS Logical Properties (MDN), W3C BiDi
> **RTL impact:** Critical — layout mirroring is the bulk of RTL implementation work

## 1. The Rules

### Physical vs Logical Mapping

| Physical (avoid for layout) | Logical (use) | LTR resolves to | RTL resolves to |
|-----------------------------|---------------|-----------------|-----------------|
| `left` | `inset-inline-start` | `left` | `right` |
| `right` | `inset-inline-end` | `right` | `left` |
| `margin-left` | `margin-inline-start` | `margin-left` | `margin-right` |
| `margin-right` | `margin-inline-end` | `margin-right` | `margin-left` |
| `padding-left` | `padding-inline-start` | `padding-left` | `padding-right` |
| `padding-right` | `padding-inline-end` | `padding-right` | `padding-left` |
| `border-left` | `border-inline-start` | `border-left` | `border-right` |
| `border-right` | `border-inline-end` | `border-right` | `border-left` |
| `text-align: left` | `text-align: start` | left | right |
| `text-align: right` | `text-align: end` | right | left |

### Block vs Inline

- **Inline axis** — Direction of text flow (horizontal in LTR/RTL; can be vertical in CJK)
- **Block axis** — Perpendicular to inline (vertical in horizontal writing modes)

**Logical properties:**
- `inline-start`, `inline-end` — start/end of inline axis
- `block-start`, `block-end` — start/end of block axis

### What Does NOT Auto-Mirror

- **`transform: translateX(10px)`** — Physical; does not flip. Use direction multiplier: `translateX(calc(10px * var(--dir, 1)))` with `--dir: -1` for RTL.
- **`box-shadow`** — Horizontal offset is physical. Use `inset-inline-start` for inset shadows or duplicate rules for RTL.
- **`background-position`** — `left`, `right` are physical. Use `right` in RTL override or `inline-start`/`inline-end` where supported.
- **`float`** — `float: left` is physical. Prefer Flexbox/Grid; if using float, override for RTL.

---

## 2. Platform Implementation

### Web: CSS Logical Properties

```css
/* Margins and padding */
.container {
  margin-inline-start: 16px;
  margin-inline-end: 8px;
  padding-inline-start: 24px;
  padding-inline-end: 12px;
}

/* Borders */
.card {
  border-inline-start: 2px solid var(--accent);
  border-inline-end: none;
}

/* Position */
.overlay {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  width: 100%;
}

/* Text alignment */
.text {
  text-align: start;
}
```

### Web: Transform (Manual RTL)

```css
:root {
  --slide-offset: -100%;
}

[dir="rtl"] {
  --slide-offset: 100%;
}

.sidebar {
  transform: translateX(var(--slide-offset));
}
```

Or with a direction variable:
```css
[dir="rtl"] {
  --dir: -1;
}

.element {
  transform: translateX(calc(20px * var(--dir, 1)));
}
```

### Web: Flexbox

Flexbox is **logical by default** when `dir` is set on a parent:
- `flex-direction: row` — Main axis follows writing direction (LTR: left→right; RTL: right→left)
- `justify-content: flex-start` — Start of main axis
- `align-items: flex-start` — Start of cross axis

**Do NOT use `row-reverse` for RTL.** The `dir` attribute handles it. Use `flex-start`/`flex-end`, not `left`/`right`.

### Web: CSS Grid

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  /* Columns flow inline; RTL flips column order automatically when dir="rtl" */
}

/* Use logical values for placement */
.item {
  grid-column: 1 / 2; /* Still numeric; column order flips with dir */
}
```

For `grid-column-start`/`end`, use `inline-start`/`inline-end` where supported, or rely on `dir` to flip the grid.

### Flutter: Directional Classes

```dart
// Padding
Padding(
  padding: EdgeInsetsDirectional.only(start: 16, end: 8, top: 12, bottom: 12),
  child: child,
)

// Alignment
Align(
  alignment: AlignmentDirectional.centerStart,
  child: child,
)

// EdgeInsets for symmetric
EdgeInsetsDirectional.symmetric(horizontal: 16)

// Positioned (in Stack)
Positioned.directional(
  textDirection: Directionality.of(context),
  start: 0,
  end: 0,
  top: 0,
  child: child,
)
```

**Avoid:** `EdgeInsets.only(left: 16)`, `Alignment.centerLeft` — use directional equivalents.

### Flutter: Row and ListView

`Row` and `ListView` (horizontal) automatically reverse child order when `Directionality` is RTL. No extra code if you use `MainAxisAlignment.start` and directional padding.

### iOS: Auto Layout

- Use **leading** and **trailing** constraints, never left/right for layout
- `NSLayoutConstraint` with `leadingAnchor`/`trailingAnchor`
- `UIView.semanticContentAttribute = .forceRightToLeft` for RTL

### Android: Layout XML

```xml
<LinearLayout
  android:layoutDirection="locale"
  ...>
  <TextView
    android:layout_marginStart="16dp"
    android:layout_marginEnd="8dp"
    ... />
</LinearLayout>
```

Use `layout_marginStart`/`End`, `paddingStart`/`End`, `layout_gravity="start"`/`"end"`.

---

## 3. Visual Examples (Described in Detail)

### Sidebar Drawer

- **LTR:** Drawer slides in from the left. `transform: translateX(-100%)` when closed.
- **RTL:** Drawer slides in from the right. `transform: translateX(100%)` when closed. The drawer is on the "start" side; in RTL, start is right.

### Card with Leading Icon

- **LTR:** `[Icon] Title` — icon at inline-start.
- **RTL:** `Title [Icon]` — icon still at inline-start (now right). Use `margin-inline-start` on the title so spacing is correct.

### List Item with Trailing Chevron

- **LTR:** `Item text                    [>]` — chevron at end.
- **RTL:** `[<]                    Item text` — chevron at end (now left). Chevron may need to mirror (point left in RTL = "more" in reading direction).

### Progress Bar

- **LTR:** Fills from left. `width: 60%` or `transform: scaleX(0.6)` with `transform-origin: left`.
- **RTL:** Fills from right. `transform-origin: right` in RTL, or use logical: `inset-inline-start: 0` and `width` from start.

---

## 4. Common RTL Layout Bugs

1. **Transform not mirroring** — `translateX` is physical. Use direction multiplier or separate RTL rule.
2. **Shadow offset** — `box-shadow: 4px 0 8px` — 4px is to the right in LTR; in RTL it should be to the left. Override or use logical equivalent.
3. **Gradient direction** — `linear-gradient(to right, ...)` — "right" is physical. Use `to inline-end` or `to left` in RTL override.
4. **Absolute positioning** — `left: 0`; use `inset-inline-start: 0`.
5. **Border radius** — `border-top-left-radius`; use `border-start-start-radius` for asymmetric corners.
6. **Flexbox with `margin-left: auto`** — Physical. Use `margin-inline-start: auto`.
7. **Float** — `float: left`; use `float: inline-start` or Flexbox.
8. **Scrollbar position** — Horizontal scroll in RTL: scrollbar may be on the right; ensure overflow and scroll behavior are correct.
9. **Fixed/sticky elements** — `position: fixed; left: 0`; use `inset-inline-start: 0`.

---

## 5. QA Checklist

- [ ] All margins/padding use logical properties
- [ ] Transforms use direction multiplier or RTL override
- [ ] Flexbox uses flex-start/flex-end, not left/right
- [ ] Absolute/fixed positioning uses inset-inline-*
- [ ] Borders and border-radius use logical where asymmetric
- [ ] Shadows and gradients checked in RTL
- [ ] Sidebar/drawer slides from correct edge
- [ ] Progress bar fills from start
- [ ] List items and cards lay out correctly

---

## Quick Reference Checklist

- [ ] Replace `left`/`right` with `inline-start`/`inline-end`
- [ ] Replace `margin-left`/`margin-right` with `margin-inline-*`
- [ ] Replace `padding-left`/`padding-right` with `padding-inline-*`
- [ ] Use `EdgeInsetsDirectional` in Flutter
- [ ] Use leading/trailing in iOS Auto Layout
- [ ] Use start/end in Android XML
- [ ] Handle `translateX` manually for RTL
- [ ] Verify shadows, gradients, and transforms in RTL

---
*Researched: 2026-03-08 | Sources: MDN logical properties, CSS-Tricks multi-directional layouts, Flutter Directionality docs, Firefox RTL guidelines*
