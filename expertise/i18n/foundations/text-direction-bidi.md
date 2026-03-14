# Text Direction and Bidirectional Text — i18n/RTL Expertise Module

> How text direction works: logical vs visual order, the Unicode BiDi algorithm, and when to use markup vs control characters. Essential for any interface that mixes Arabic, Hebrew, or other RTL scripts with LTR content.

> **Category:** Foundation
> **Applies to:** All (Mobile, Web, Backend)
> **Key standards:** Unicode UAX #9 (BiDi Algorithm), W3C HTML BiDi
> **RTL impact:** Critical — this is the foundation of all RTL support

## 1. Core Concepts

### What This Area Covers

Text direction determines how characters are laid out horizontally: left-to-right (LTR) for English, Latin, Cyrillic, etc., and right-to-left (RTL) for Arabic, Hebrew, Persian, Urdu. Bidirectional (BiDi) text mixes both in a single line—e.g., "Hello العربية world"—and requires the Unicode Bidirectional Algorithm to resolve display order.

### Logical vs Visual Order

| Concept | Definition | Example |
|---------|------------|---------|
| **Logical order** | Sequence in which text is typed, pronounced, and stored in memory | "english ARABIC text" |
| **Visual order** | Sequence in which text appears on screen | "english CIBARA text" (Arabic reversed) |

**Always use logical order in markup and data.** The BiDi algorithm converts logical → visual at display time. Storing visual order breaks copy-paste, search, and maintenance.

### Base Direction

The base direction is the default for a block of text when the BiDi algorithm runs. It affects:
- Order of neutral characters (spaces, punctuation)
- Alignment (start vs end)
- How mixed-direction runs are resolved

Set via `dir="ltr"`, `dir="rtl"`, or `dir="auto"` (first strong character wins).

---

## 2. Unicode Bidirectional Algorithm (UAX #9)

### How It Works

1. **Character classification** — Each character has a directional type: L (strong LTR), R (strong RTL), AL (Arabic letter), EN (European number), AN (Arabic number), NSM (non-spacing mark), etc.
2. **Resolving levels** — The algorithm assigns embedding levels (0 = LTR, 1 = RTL, etc.) based on base direction and character types.
3. **Reordering** — Characters are reordered for display according to their levels.

### When the Algorithm Needs Help

- **Neutral characters** — Spaces, punctuation between opposite-direction runs can be misassigned
- **Numbers** — European (0123) vs Arabic (٠١٢٣) numerals; numbers can "stick" to wrong runs
- **Spillover** — An RTL phrase followed by a number in LTR context: the number may join the RTL run incorrectly

### Directional Formatting Characters

**Prefer isolate pairs (Unicode 6.3+):** They prevent spillover.

| Character | Name | Code | Use |
|-----------|------|------|-----|
| LRI | LEFT-TO-RIGHT ISOLATE | U+2066 | Wrap LTR text in RTL context |
| RLI | RIGHT-TO-LEFT ISOLATE | U+2067 | Wrap RTL text in LTR context |
| FSI | FIRST-STRONG ISOLATE | U+2068 | `dir="auto"` equivalent |
| PDI | POP DIRECTIONAL ISOLATE | U+2069 | Closes LRI, RLI, or FSI |

**Legacy (avoid for new content):** Can cause spillover.

| Character | Name | Code | Use |
|-----------|------|------|-----|
| LRE | LEFT-TO-RIGHT EMBEDDING | U+202A | LTR embedding |
| RLE | RIGHT-TO-LEFT EMBEDDING | U+202B | RTL embedding |
| PDF | POP DIRECTIONAL FORMATTING | U+202C | Closes LRE/RLE |
| LRO | LEFT-TO-RIGHT OVERRIDE | U+202D | Force LTR display order |
| RLO | RIGHT-TO-LEFT OVERRIDE | U+202E | Force RTL display order |

**Single-character marks:**

| Character | Name | Code | Use |
|-----------|------|------|-----|
| LRM | LEFT-TO-RIGHT MARK | U+200E | Break link between number and RTL text; extend LTR run |
| RLM | RIGHT-TO-LEFT MARK | U+200F | Extend RTL run to include punctuation |

### When to Use Control Characters vs Markup

- **HTML/CSS available** — Use `dir` attribute or `<bdi>`. Prefer markup.
- **Plain text only** — Use Unicode controls (e.g., `title` attribute, WebVTT, CSV, filenames).
- **User-generated content** — `dir="auto"` or FSI when direction is unknown.

### Example: Fixing Spillover

**Problem:** "We found the phrase 'نشاط التدويل' 5 times" — the "5" incorrectly joins the Arabic.

**Solution with RLI/PDI:**
```
We find the phrase '\u2067نشاط التدويل\u2069' 5 times
```

**Solution with LRM** (if you only need to break the link):
```
We find the phrase 'نشاط التدويل'\u200E 5 times
```

---

## 3. HTML and Markup

### Document-Level Direction

```html
<html lang="ar" dir="rtl">
```

### Block-Level Direction

```html
<div dir="rtl">محتوى عربي</div>
```

### Inline Mixed Content

Wrap opposite-direction phrases tightly:

```html
<p>The title is <span dir="rtl">مدخل إلى C++</span> in Arabic.</p>
```

### `dir="auto"`

Detects direction from first strong directional character. Use for user-supplied or unknown content.

```html
<span dir="auto">{{userInput}}</span>
```

### `<bdi>` (Bidirectional Isolate)

Isolates content from surrounding BiDi context. Use when direction is unknown and you want the algorithm to determine it independently.

```html
<bdi>{{username}}</bdi> commented
```

---

## 4. Platform Implementation

### Web (HTML/CSS)

- Set `dir` on `<html>` for document; override on specific elements
- Use `dir="auto"` for dynamic content
- CSS: `direction`, `unicode-bidi` (rarely needed if markup is correct)

### Flutter

```dart
Directionality(
  textDirection: TextDirection.rtl,
  child: child,
)
// Or: Directionality.of(context)
```

### React

```tsx
<div dir="rtl" lang="ar">{content}</div>
```

### iOS

```swift
// UIView.semanticContentAttribute = .forceRightToLeft
// Or per view
```

### Android

```xml
android:layoutDirection="rtl"
```

---

## 5. Mixed Content Handling

### LTR in RTL Context

- English brand names, URLs, code snippets, email addresses
- Wrap in `dir="ltr"` or LRI/PDI when in plain text

### Numbers

- European numerals (0123) are weakly directional; they can "stick" to RTL
- Insert LRM before a number in LTR context if it incorrectly joins RTL
- Arabic numerals (٠١٢٣) are RTL; use when displaying in Arabic UI

### URLs and Email

- Always LTR; wrap in `dir="ltr"` if displayed in RTL paragraph

### Punctuation

- Punctuation at the end of an RTL phrase may be assigned to the wrong run
- Add RLM after the punctuation to extend the RTL run, or wrap in RLI/PDI

---

## 6. Anti-Patterns

1. **Storing visual order** — Store logical order; let the algorithm handle display.
2. **Using LRE/RLE instead of LRI/RLI** — Causes spillover; prefer isolates.
3. **Ignoring neutral characters** — Commas, spaces between RTL phrases can misalign.
4. **No base direction for user content** — Use `dir="auto"` or detect.
5. **Assuming `dir` is inherited** — Explicitly set on root and overrides.
6. **Mixing `direction` CSS with `dir`** — Prefer `dir` for semantics.
7. **Forgetting `lang`** — `dir` and `lang` should be set together.
8. **Not wrapping opposite-direction phrases** — Loose wrapping causes wrong display.
9. **Using override (LRO/RLO) for isolation** — Override forces display order; use isolate instead.
10. **Skipping BiDi for "English-only" apps** — User names, search results, and API data can be any script.

---

## 7. Testing Approach

- Test with real Arabic (العربية) and Hebrew (עברית) — not placeholder text
- Test mixed content: "Hello العربية 123"
- Test spillover case: RTL phrase + number
- Test lists of opposite-direction items (e.g., country names in Arabic in LTR list)
- Verify copy-paste preserves logical order
- Check `dir` and `lang` on root and key containers

---

## Quick Reference Checklist

- [ ] Store and transmit text in logical order
- [ ] Set `dir` and `lang` on document root
- [ ] Use RLI/LRI/PDI (not RLE/LRE) for plain-text BiDi
- [ ] Wrap opposite-direction phrases tightly
- [ ] Use `dir="auto"` for unknown user content
- [ ] Add LRM/RLM when needed to fix spillover
- [ ] Test with real Arabic and Hebrew strings
- [ ] Verify numbers and punctuation display correctly

---
*Researched: 2026-03-08 | Sources: Unicode UAX #9, W3C BiDi controls, W3C visual vs logical, MDN dir/bdi*
