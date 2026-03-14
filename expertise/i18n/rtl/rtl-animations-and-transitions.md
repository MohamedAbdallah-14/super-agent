# RTL Animations and Transitions — i18n/RTL Expertise Module

> Animations that represent direction (slide-in, drawer, carousel) must follow reading direction. A drawer that slides in from the left in LTR should slide in from the right in RTL. Time-based animations (progress, fade) typically don't change.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** Material Design, Apple HIG
> **RTL impact:** High — wrong animation direction feels broken

## 1. The Rules

### Animations That MIRROR (Directional)

| Animation | LTR | RTL |
|-----------|-----|-----|
| **Drawer/sidebar open** | Slides in from left | Slides in from right |
| **Modal/dialog enter** | Often center; if slide, from bottom | Same (center/bottom) |
| **Page transition (push)** | New page slides in from right | New page slides in from left |
| **Page transition (pop/back)** | Current page slides out to right | Current page slides out to left |
| **Carousel next** | Content slides left (new from right) | Content slides right (new from left) |
| **Swipe to dismiss** | Swipe right to dismiss | Swipe left to dismiss |
| **Expand/collapse** | Chevron rotates; content expands | Same (no direction) |

### Animations That Do NOT Mirror

| Animation | Reason |
|-----------|--------|
| **Fade** | No direction |
| **Scale** | No direction |
| **Progress bar fill** | Represents progress; direction follows layout (start→end) |
| **Spinner/loading** | No direction |
| **Pulse** | No direction |

---

## 2. Implementation

### Web (CSS)

```css
/* Drawer: use logical properties for transform origin */
.drawer {
  transform: translateX(-100%);
  transform-origin: left center;
}

[dir="rtl"] .drawer {
  transform: translateX(100%);
  transform-origin: right center;
}

/* Or use CSS variable */
:root {
  --drawer-translate: -100%;
}
[dir="rtl"] {
  --drawer-translate: 100%;
}
.drawer {
  transform: translateX(var(--drawer-translate));
}
```

### Flutter

```dart
// SlideTransition: use direction from TextDirection
SlideTransition(
  position: Tween<Offset>(
    begin: Offset(Directionality.of(context) == TextDirection.rtl ? 1 : -1, 0),
    end: Offset.zero,
  ).animate(animation),
  child: child,
)
```

### React / React Native

- Use `I18nManager.isRTL` or `useLayoutDirection()` to flip slide direction
- Pass `from`/`to` or `direction` to animation library based on RTL

---

## 3. Common RTL Animation Bugs

1. **Drawer slides from wrong side** — Always from start edge
2. **Page push/pop wrong direction** — New page from end, back slides to end
3. **Carousel slides wrong way** — "Next" should move content in reading direction
4. **Transform origin wrong** — `transform-origin: left` doesn't flip; override for RTL
5. **translateX not inverted** — Use direction multiplier

---

## 4. QA Checklist

- [ ] Drawer/sidebar slides from start edge
- [ ] Page transitions follow navigation direction
- [ ] Carousel direction correct
- [ ] No jarring "wrong way" animations

---

## Quick Reference Checklist

- [ ] Directional slides use RTL-aware transform/origin
- [ ] Drawer from start edge
- [ ] Page push/pop direction correct
- [ ] Fade/scale unchanged

---
*Researched: 2026-03-08 | Sources: Kendo slide direction, React Slick RTL, animation direction patterns*
