# RTL Icons and Images — i18n/RTL Expertise Module

> Which icons and images mirror in RTL, and which don't. Directional elements (arrows, chevrons, progress) flip; content (photos, logos, checkmarks) stays. Platform APIs and implementation patterns.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** Material Design RTL, Apple HIG
> **RTL impact:** Critical — wrong icon direction confuses users

## 1. The Rules

### Icons That MIRROR (Directional)

| Icon | LTR | RTL | Why |
|------|-----|-----|-----|
| Back/previous | ← | → | "Back" = toward start; start is right in RTL |
| Forward/next | → | ← | "Forward" = toward end |
| Chevron (expand/collapse) | > | < | Points to content; content moves |
| Caret (dropdown) | ▼ or > | Same or mirrored | Depends on placement |
| Text alignment left | ∟ | Mirrored | Aligns with "start" |
| Text alignment right | ⊣ | Mirrored | Aligns with "end" |
| Indent/outdent | Directional | Mirrored | Text flow direction |
| List bullet/arrow | → | ← | Indicates flow |
| Progress/stepper arrow | → | ← | Direction of progress |
| Sidebar expand | > | < | Expand toward content |

### Icons That Do NOT Mirror

| Icon | Reason |
|------|--------|
| Checkmark (✓) | No inherent direction |
| Play (▶) | Universal "play" symbol |
| Pause (⏸) | No direction |
| Stop (⏹) | No direction |
| Camera | No direction |
| Settings (gear) | No direction |
| Search (magnifier) | No direction |
| Heart, star, bookmark | No direction |
| Share | No direction (unless arrow indicates target) |
| Trash/delete | No direction |
| Edit (pencil) | No direction |
| Lock, key | No direction |

### Images: Mirror or Not?

| Type | Mirror? | Examples |
|------|---------|----------|
| **Photos** | No | User avatars, product images |
| **Logos** | No | Brand identity |
| **Maps** | No | Geographic |
| **Charts/graphs** | No | Data visualization |
| **Illustrations with direction** | Yes | Person pointing, arrow in illustration |
| **UI controls (custom)** | Depends | If directional, mirror |

---

## 2. Platform Implementation

### Web (CSS)

```css
/* Manual mirror for directional icons */
[dir="rtl"] .icon-back {
  transform: scaleX(-1);
}

/* Or use dir attribute on icon container */
.icon-back {
  transform: scaleX(var(--dir, 1));
}
[dir="rtl"] {
  --dir: -1;
}
```

### Flutter

```dart
// Flutter mirrors many directional icons automatically when Directionality is RTL
Icon(Icons.arrow_back)  // Auto-mirrors

// Manual mirror when needed
Transform(
  alignment: Alignment.center,
  transform: Matrix4.identity()..scale(-1.0, 1.0),
  child: Icon(Icons.arrow_forward),
)
```

### Android (Jetpack Compose)

```kotlin
// AutoMirrored icons flip automatically
Icon(Icons.AutoMirrored.Filled.ArrowBack)

// Manual for custom drawables
Icon(
  painter = painterResource(R.drawable.arrow_back),
  contentDescription = "...",
  modifier = Modifier.graphicsLayer {
    scaleX = if (LocalLayoutDirection.current == LayoutDirection.Rtl) -1f else 1f
  }
)
```

### Android (XML)

```xml
<ImageView
  android:autoMirrored="true"
  android:src="@drawable/ic_arrow_back" />
```

### iOS

```swift
// SF Symbols: many auto-mirror with semanticContentAttribute
imageView.image = UIImage(systemName: "chevron.left")
imageView.semanticContentAttribute = .forceRightToLeftLayoutDirection

// Or: imageFlippedForRightToLeftLayoutDirection()
```

---

## 3. Visual Examples (Described in Detail)

### Back Button

- **LTR:** Arrow points left (←). User taps to go "back" = toward the start of the navigation stack (left).
- **RTL:** Arrow points right (→). "Back" = toward start, which is now on the right. Icon mirrors.

### Chevron in List Item

- **LTR:** Chevron (>) on the right indicates "more content to the right."
- **RTL:** Chevron (<) on the left indicates "more content to the left." Icon mirrors.

### Play Button in Media Player

- **LTR and RTL:** Play (▶) does NOT mirror. "Play" is a universal action; the triangle direction is not reading-direction-dependent.

### Progress Stepper

- **LTR:** Steps flow left → right. Arrow between steps points right.
- **RTL:** Steps flow right → left. Arrow between steps points left. Arrows mirror.

---

## 4. Common RTL Icon Bugs

1. **Back arrow doesn't mirror** — User expects it to point toward "back" (start)
2. **Chevron doesn't mirror** — Points wrong way for "more" or "expand"
3. **Checkmark mirrored** — Wrong; checkmark has no direction
4. **Play button mirrored** — Wrong; play is universal
5. **Share icon mirrored** — Usually wrong unless it's an arrow indicating direction
6. **Custom SVG not mirroring** — Add `transform: scaleX(-1)` for directional icons in RTL
7. **Icon in wrong position** — Use logical properties for placement; icon asset may still need mirror

---

## 5. QA Checklist

- [ ] Back/forward arrows mirror
- [ ] Chevrons mirror where they indicate direction
- [ ] Checkmark, play, settings do NOT mirror
- [ ] Logos and photos do NOT mirror
- [ ] Custom directional icons have RTL variant or transform
- [ ] Icon position uses start/end, not left/right

---

## Quick Reference Checklist

- [ ] Mirror: back, forward, chevrons, alignment icons, progress arrows
- [ ] Do NOT mirror: checkmark, play, pause, camera, settings, logos, photos
- [ ] Use platform auto-mirror APIs when available (Flutter, Compose AutoMirrored)
- [ ] Manual `scaleX(-1)` or equivalent for custom directional icons
- [ ] Test all icon types in RTL

---
*Researched: 2026-03-08 | Sources: Material Design bidirectionality, Android AutoMirrored, Qt RTL docs*
