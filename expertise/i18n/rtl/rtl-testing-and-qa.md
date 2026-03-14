# RTL Testing and QA — i18n/RTL Expertise Module

> How to verify RTL correctness: pseudo-localization, manual checklists, automated checks, and real-locale testing. Catch layout, icon, gesture, and BiDi bugs before release.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** W3C, Material Design
> **RTL impact:** Critical — RTL bugs ship without dedicated QA

## 1. Pseudo-Localization for RTL

### Purpose

- Simulate RTL without translators
- Expose layout, truncation, and hardcoded-string issues early

### Android Pseudolocales

- **en-XA** — Accented Latin, text expansion
- **ar-XB** — Reversed text direction (RTL simulation)

### Web / General

- Use `dir="rtl"` with pseudo-translated content
- Wrap strings with Unicode RLI/PDI or use `dir="rtl"` on test locale
- Tools: pseudo-l10n npm package, custom scripts

### What to Look For

- Layout mirroring (or lack of it)
- Truncated text
- Overlapping elements
- Icons that should mirror but don't
- Hardcoded strings (remain in source language)

---

## 2. Manual QA Checklist (20–30 Items)

### Layout

- [ ] Navigation/tabs ordered start→end (right→left in RTL)
- [ ] Sidebar/drawer on start side (right in RTL)
- [ ] Content flows from start
- [ ] No horizontal overflow or clipping
- [ ] Margins/padding correct (logical properties)

### Text

- [ ] Text aligns to start
- [ ] Mixed content (Arabic + English) displays correctly
- [ ] Numbers, URLs, email in correct direction
- [ ] Truncation/ellipsis at inline-end
- [ ] Line breaks and wrapping correct

### Icons and Images

- [ ] Back/forward arrows mirror
- [ ] Chevrons mirror where directional
- [ ] Checkmark, play, settings do NOT mirror
- [ ] Logos and photos do NOT mirror
- [ ] Icon position uses start/end

### Navigation and Gestures

- [ ] Swipe-back from correct edge (right in RTL)
- [ ] Carousel/horizontal scroll direction correct
- [ ] Tab order follows visual order
- [ ] Focus order correct

### Forms

- [ ] Labels at start of input
- [ ] Input text aligns to start
- [ ] Leading/trailing icons in correct positions
- [ ] Validation messages positioned correctly

### Animations

- [ ] Drawer slides from start edge
- [ ] Page transitions follow direction
- [ ] No "wrong way" slide animations

### Edge Cases

- [ ] Empty states
- [ ] Long text (e.g., German)
- [ ] Mixed LTR/RTL in same view
- [ ] Dynamic content (user names, search results)

---

## 3. Real Locale Testing

### Arabic (ar-SA, ar-EG)

- Real text: مرحباً، كيف حالك؟
- Eastern Arabic numerals (٠١٢٣) where applicable
- Hijri calendar if used

### Hebrew (he-IL)

- Real text: שלום, עברית
- Western numerals
- Hebrew calendar if used

### Why Real Text

- BiDi algorithm behaves differently with real script
- Font rendering, line breaks, and shaping differ from pseudo

---

## 4. Automated Checks

- **Lint:** Flag `margin-left`, `padding-right`, `text-align: left` in styles
- **CI:** Run with `dir="rtl"` or RTL locale; snapshot or visual regression
- **Accessibility:** Screen reader with RTL; focus order
- **Unit tests:** Direction-dependent logic (e.g., transform, layout direction)

---

## 5. Common RTL Bugs to Catch

1. Physical properties instead of logical
2. Icons that should mirror but don't (or vice versa)
3. Swipe-back from wrong edge
4. Drawer from wrong side
5. Transform/translate not inverted
6. Form labels on wrong side
7. Mixed content BiDi spillover
8. Truncation at wrong edge
9. Shadow/gradient not mirrored where needed
10. Tab/focus order wrong

---

## Quick Reference Checklist

- [ ] Pseudo-localization (ar-XB or dir=rtl) in CI
- [ ] Manual checklist for layout, text, icons, navigation, forms
- [ ] Test with real Arabic and Hebrew
- [ ] Automated lint for physical properties
- [ ] Verify swipe gestures and animations

---
*Researched: 2026-03-08 | Sources: Android pseudolocales, L10n pseudo-localization, Ubertesters RTL testing*
