# RTL Navigation and Gestures — i18n/RTL Expertise Module

> Navigation and gestures must follow reading direction: swipe-back from the right edge in RTL, tab order from right to left, carousels and steppers reversed. Wrong gesture direction is disorienting.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** Material Design, Apple HIG
> **RTL impact:** Critical — navigation is core to UX

## 1. The Rules

### Swipe-Back Gesture

| Context | LTR | RTL |
|---------|-----|-----|
| **Back navigation** | Swipe from left edge → right | Swipe from right edge → left |
| **Rationale** | "Back" = toward start (left) | "Back" = toward start (right) |

In RTL, the user "came from" the right. Swiping right-to-left dismisses the current screen and returns to the previous one.

### Carousel / Horizontal Scroll

| Context | LTR | RTL |
|---------|-----|-----|
| **Scroll direction** | Swipe left to see "next" | Swipe right to see "next" |
| **Initial position** | Content starts at left | Content starts at right |
| **"More" content** | To the right | To the left |

### Tab Bar / Bottom Navigation

- **LTR:** First tab on left
- **RTL:** First tab on right
- Tab order follows visual order (start → end)

### Focus Order

- **LTR:** Tab order left → right, top → bottom
- **RTL:** Tab order right → left, top → bottom
- Ensure focus follows visual layout

---

## 2. Platform Implementation

### iOS

- **Swipe-back:** iOS automatically inverts when `userInterfaceLayoutDirection` is RTL
- **Edge swipe:** From the leading edge (right in RTL)
- **UINavigationController:** Handles RTL by default with base internationalization

### Android

- **Back gesture:** From the start edge (right in RTL)
- **Navigation component:** Uses `layoutDirection`; gestures follow
- **ViewPager:** Set `layoutDirection` or use `ViewPager2` with RTL support

### Flutter

- **CupertinoPageRoute:** Swipe-back direction follows `Directionality`
- **PageView:** Horizontal scroll direction flips with `TextDirection.rtl`
- **TabBar:** Tab order reverses automatically

### React Navigation

- RTL swipe-back fixed in later versions; ensure `gestureDirection` is not overridden incorrectly
- Use `gestureDirection: 'inverted'` only when framework doesn't auto-detect RTL

### Web (Carousel / Swiper)

- Set `dir="rtl"` on container; many libraries (Swiper, etc.) respect it
- If not: `rtl: true` or equivalent option
- Verify "next" swipe goes the correct direction

---

## 3. Common RTL Navigation Bugs

1. **Swipe-back from wrong edge** — User swipes left (LTR habit) but nothing happens; back is from right in RTL
2. **Carousel "next" goes wrong way** — Swiping "forward" feels backward
3. **Tab order wrong** — Focus jumps left when it should go right
4. **Horizontal scroll starts wrong** — Content appears to start from wrong side
5. **Stepper/wizard arrows wrong** — Progress direction doesn't match layout
6. **Drawer opens from wrong side** — Should open from start (right in RTL)

---

## 4. QA Checklist

- [ ] Swipe-back from correct edge (right in RTL)
- [ ] Carousel/horizontal scroll direction correct
- [ ] Tab bar order follows visual order
- [ ] Focus order follows visual order
- [ ] Drawer/sidebar opens from start edge
- [ ] "Next" and "Previous" buttons in correct positions

---

## Quick Reference Checklist

- [ ] Back gesture from start edge (right in RTL)
- [ ] Carousel next/previous follow reading direction
- [ ] Tab order = visual order
- [ ] Focus order = visual order
- [ ] Test swipe gestures in RTL

---
*Researched: 2026-03-08 | Sources: React Navigation RTL, iOS/Flutter RTL, Material Design*
