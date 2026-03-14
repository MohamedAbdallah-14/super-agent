# RTL Typography — i18n/RTL Expertise Module

> Typography for RTL scripts: font selection, line height, letter spacing, and script-specific considerations. Arabic and Hebrew have different requirements—connected cursive vs discrete letters, diacritics, and rendering complexity.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** OpenType, W3C typography
> **RTL impact:** Critical — poor typography makes RTL content unreadable

## 1. The Rules

### Arabic vs Hebrew: Key Differences

| Aspect | Arabic | Hebrew |
|--------|--------|--------|
| **Script type** | Cursive (connected) | Mostly discrete (some connections) |
| **Letter forms** | Initial, medial, final, isolated | Positional variants, final forms |
| **Ligatures** | Many; words can act as single units | Fewer |
| **Diacritics** | Harakat (short vowels), dots | Niqqud, cantillation |
| **Font requirements** | OpenType shaping, contextual alternates | OpenType shaping |
| **Baseline** | Varies with letter height | More uniform |

### Font Size and Line Height

- **Arabic body text:** 14–18px minimum; many sites use 12–16px (below ideal)
- **Line height:** 1.5–1.75 for body; Arabic's ascenders/descenders need room
- **Hebrew:** Similar range; ensure diacritics (niqqud) don't collide with adjacent lines

### Logical Properties for Typography

- `text-align: start` — Not `left`
- `text-indent` — Use `text-indent: 2em` (block direction) or logical equivalent
- `letter-spacing` — Use sparingly; Arabic/Hebrew have different norms than Latin

---

## 2. Arabic-Specific Typography

### Connected Script

Arabic letters connect within words. Each letter has up to 4 forms: isolated, initial, medial, final. The font must support **OpenType contextual alternates** and **shaping** (e.g., HarfBuzz, Uniscribe).

### Diacritical Marks (Harakat)

- Short vowels (fatḥa, kasra, ḍamma) and other marks sit above/below letters
- Require sufficient line height to avoid clipping
- Some fonts render them better than others

### Font Recommendations

- **Body:** Tahoma, Arial (system), Noto Sans Arabic, IBM Plex Sans Arabic
- **Headlines:** Amiri, Lateef, Noto Kufi Arabic, Droid Arabic Kufi
- **Display:** Avoid overly decorative fonts for UI; reserve for marketing

### Common Pitfalls

1. **Font without Arabic support** — Fallback to system font; ensure `font-family` includes Arabic-capable fonts
2. **Insufficient line height** — Diacritics get clipped
3. **Letter-spacing** — Arabic typically uses minimal or no letter-spacing; adding it can break connections
4. **Small font size** — Below 14px, connected letters blur; diacritics become illegible

---

## 3. Hebrew-Specific Typography

### Script Characteristics

- 22 consonants; optional vowel points (niqqud)
- Final forms for 5 letters (kaf, mem, nun, pe, tsadi)
- Rashi script for religious commentary (different glyph set)

### Font Recommendations

- **Body:** Heebo, Noto Sans Hebrew, Arial (system)
- **Religious/formal:** Noto Rashi Hebrew, Frank Ruhl Libre
- **Display:** Heebo, Rubik

### Niqqud (Vowel Points)

- Placed above/below letters; need line height headroom
- Optional in modern Hebrew; often omitted in UI

---

## 4. Platform Implementation

### Web: Font Stack

```css
:root {
  --font-arabic: 'Noto Sans Arabic', 'Tahoma', 'Arial', sans-serif;
  --font-hebrew: 'Heebo', 'Noto Sans Hebrew', 'Arial', sans-serif;
}

[lang="ar"] {
  font-family: var(--font-arabic);
  line-height: 1.6;
  font-size: 1rem; /* 16px minimum for body */
}
```

### Web: Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
```

### Flutter

```dart
// In theme or TextStyle
TextStyle(
  fontFamily: 'NotoSansArabic',
  fontSize: 16,
  height: 1.6,
)
```

### iOS / Android

- Use system fonts that support Arabic/Hebrew (San Francisco, Roboto)
- Or bundle Noto Sans Arabic / Heebo

---

## 5. Mixed Script Typography

When mixing Arabic/Hebrew with Latin (e.g., brand names, technical terms):

- Ensure both scripts have compatible x-height and weight
- Noto family provides matching Latin + Arabic + Hebrew
- Avoid font switching mid-sentence when possible

---

## 6. Anti-Patterns

1. **Letter-spacing on Arabic** — Breaks cursive connections
2. **Font size below 14px for body** — Illegible diacritics
3. **Line height < 1.5** — Diacritics collide
4. **Font without OpenType shaping** — Wrong letter forms
5. **Using Latin font for Arabic** — Missing glyphs, replacement characters
6. **text-transform: uppercase** — Arabic has no case; can break
7. **word-spacing** — Arabic uses different word-boundary rules

---

## Quick Reference Checklist

- [ ] Font supports Arabic/Hebrew (OpenType shaping)
- [ ] Body font size ≥ 14px (16px preferred)
- [ ] Line height 1.5–1.75 for body
- [ ] No letter-spacing on Arabic
- [ ] text-align: start
- [ ] Test with real text: العربية، עברית
- [ ] Diacritics not clipped

---
*Researched: 2026-03-08 | Sources: Code Guru Arabic fonts, HackerNoon Arabic design, Noto fonts, OpenType shaping*
