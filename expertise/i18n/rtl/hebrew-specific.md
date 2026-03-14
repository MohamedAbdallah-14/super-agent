# Hebrew-Specific i18n/RTL — Expertise Module

> Hebrew differs from Arabic: discrete letters with final forms, Western numerals in everyday use, the Jewish/Hebrew calendar, and three plural forms. Never conflate Hebrew with Arabic—they are distinct RTL languages.

> **Category:** RTL
> **Applies to:** Mobile, Web, Backend
> **Key standards:** Unicode Hebrew, CLDR he/iw locales, Hebrew calendar
> **RTL impact:** Critical — Hebrew is the primary language of Israel

## 1. Script and Typography

### Discrete Letters with Final Forms

Hebrew is an abjad (consonants only; vowels optional). Unlike Arabic's connected cursive, Hebrew letters are mostly discrete. Five letters have **final forms** when they appear at the end of a word:

| Letter | Final form | Use |
|--------|------------|-----|
| Kaf (כ) | Final Kaf (ך) | End of word |
| Mem (מ) | Final Mem (ם) | End of word |
| Nun (נ) | Final Nun (ן) | End of word |
| Pe (פ) | Final Pe (ף) | End of word |
| Tsade (צ) | Final Tsade (ץ) | End of word |

Fonts must support OpenType shaping for correct final-form substitution.

### Niqqud (Vowel Points)

- 11 vowel diacritics; rarely used in modern UI
- Used in: religious texts, education, disambiguation
- When present: require line height headroom (like Arabic harakat)

### Font Recommendations

- **Body:** Heebo, Noto Sans Hebrew, Arial
- **Religious/formal:** Noto Rashi Hebrew, Frank Ruhl Libre
- **Display:** Heebo, Rubik

---

## 2. Numerals

### Everyday Use: Western Arabic (0123456789)

In Israel, **Western Arabic numerals** are used for:
- Money, age, dates
- Most UI and commercial content

Hebrew numerals (letters as numbers) are used only for:
- Hebrew calendar dates
- Religious texts
- List numbering (like a, b, c)

**Implementation:** Use `Intl.NumberFormat('he-IL')` — it outputs Western digits by default. No Eastern Arabic numerals.

---

## 3. Calendar: Hebrew (Jewish)

### Overview

- Lunisolar calendar
- Used for religious holidays and traditional dates in Israel
- Months: Tishri, Heshvan, Kislev, Tevet, Shevat, Adar, Adar II (leap), Nisan, Iyar, Sivan, Tamuz, Av, Elul

### Implementation

```javascript
new Intl.DateTimeFormat('he-IL', {
  calendar: 'hebrew',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(new Date());
// e.g., 15 באדר ב' 5786
```

Locale `he-IL` or `iw-IL` (iw is legacy for Hebrew). Calendar option: `hebrew`.

---

## 4. Pluralization

Hebrew has **3 cardinal plural forms** (CLDR: one, two, other).

### ICU MessageFormat Example

```
{count, plural,
  one {יום אחד}
  two {יומיים}
  other {# ימים}
}
```

### Rules

- **one:** n=1 (integer), or fractional 0.0–0.9, 0.00–0.05
- **two:** n=2 (integer only)
- **other:** 0, 3–17, 100, etc., and fractional 1.0–2.5, 10.0, etc.

### Ordinal

Hebrew ordinals use **other** only — no one/two/few/many distinction for ordinals.

---

## 5. Locale Variants

| Locale | Region | Notes |
|--------|--------|-------|
| he-IL | Israel | Primary; iw-IL is legacy |
| he | Hebrew (no region) | Fallback |

---

## 6. Arabic vs Hebrew: Summary

| Aspect | Arabic | Hebrew |
|--------|--------|--------|
| Script | Connected cursive | Discrete, some final forms |
| Numerals (everyday) | Eastern or Western by region | Western only |
| Calendar | Hijri (Islamic) | Hebrew (Jewish) |
| Plural forms | 6 | 3 |
| Diacritics | Harakat (common in religious) | Niqqud (rare in UI) |

---

## 7. Anti-Patterns

1. **Treating Hebrew like Arabic** — Different script, numerals, calendar, plurals
2. **Using Eastern Arabic numerals** — Hebrew uses Western
3. **Hijri calendar for Hebrew** — Use Hebrew calendar
4. **6 plural forms** — Hebrew has 3
5. **Latin font for Hebrew** — Use Hebrew-capable font
6. **No RTL layout** — Hebrew is RTL; layout must mirror

---

## Quick Reference Checklist

- [ ] Font supports Hebrew (final forms, OpenType shaping)
- [ ] Western numerals (0123) for everyday content
- [ ] Hebrew calendar for dates when relevant
- [ ] 3 plural forms: one, two, other
- [ ] RTL layout with logical properties
- [ ] Test with real Hebrew: שלום, עברית

---
*Researched: 2026-03-08 | Sources: Unicode Hebrew, CLDR plurals, Intl API, Wikipedia Hebrew numerals*
