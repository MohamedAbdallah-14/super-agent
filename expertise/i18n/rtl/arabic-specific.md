# Arabic-Specific i18n/RTL — Expertise Module

> Arabic is not "Hebrew with different letters." It has connected cursive script, two numeral systems, the Hijri calendar, six plural forms, and distinct typographic conventions. This module covers what makes Arabic unique.

> **Category:** RTL
> **Applies to:** Mobile, Web, Backend
> **Key standards:** Unicode Arabic, CLDR ar-* locales, Islamic calendar
> **RTL impact:** Critical — Arabic is the largest RTL language by speakers

## 1. Script and Typography

### Connected Cursive

Arabic uses a connected script. Each of the 28 letters has up to 4 contextual forms:
- **Isolated** — Standalone
- **Initial** — At start of word
- **Medial** — In middle
- **Final** — At end of word

Fonts must support **OpenType shaping** (e.g., HarfBuzz). Without it, letters appear disconnected or wrong.

### Diacritics (Harakat)

- **Short vowels:** fatḥa (َ), kasra (ِ), ḍamma (ُ)
- **Shadda** (ّ) — Gemination
- **Sukūn** (ْ) — No vowel
- **Tanwīn** — Nunation

Often omitted in modern UI; when present, require sufficient line height.

### Font Recommendations

- **UI body:** Noto Sans Arabic, Tahoma, Arial
- **Headlines:** Amiri, Noto Kufi Arabic
- **Avoid:** Latin-only fonts; decorative fonts for body text

---

## 2. Numeral Systems

### Western Arabic (0123456789)

- Used in: Morocco, Algeria, Tunisia, and often in tech/finance
- Same glyphs as "European" digits
- Locale: `ar-MA`, `ar-DZ` often use Western

### Eastern Arabic (٠١٢٣٤٥٦٧٨٩)

- Used in: Saudi Arabia, Egypt, Syria, Iraq, Gulf, Levant
- Locale: `ar-SA`, `ar-EG` typically use Eastern
- **Important:** Let the user or locale choose; some apps offer a setting

### Implementation

```javascript
// Intl.NumberFormat uses locale's default digits
new Intl.NumberFormat('ar-SA').format(123);  // ١٢٣
new Intl.NumberFormat('ar-EG').format(123); // ١٢٣
new Intl.NumberFormat('ar-MA').format(123); // 123 (Western)
```

---

## 3. Calendar: Hijri (Islamic)

### Overview

- Lunar calendar; ~354 days/year
- Used as civil calendar in Saudi Arabia, and religiously worldwide
- Starts from Hijra (622 CE)

### Variants

- **islamic** — Civil (fixed algorithm)
- **islamic-umalqura** — Saudi Arabia (crescent sighting)
- **islamic-tbla** — Astronomical

### Implementation

```javascript
new Intl.DateTimeFormat('ar-SA', {
  calendar: 'islamic',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(new Date());
// e.g., ١٥ رجب ١٤٤٧
```

---

## 4. Pluralization

Arabic has **6 plural forms** (CLDR categories: zero, one, two, few, many, other).

### ICU MessageFormat Example

```
{count, plural,
  zero {لا رسائل}
  one {رسالة واحدة}
  two {رسالتان}
  few {# رسائل}
  many {# رسالة}
  other {# رسالة}
}
```

### Rules (Simplified)

- zero: count === 0
- one: count === 1
- two: count === 2
- few: 3–10
- many: 11–99 (with exceptions)
- other: default

---

## 5. Locale Variants

| Locale | Region | Numerals | Notes |
|--------|--------|----------|-------|
| ar-SA | Saudi Arabia | Eastern | Hijri default |
| ar-EG | Egypt | Eastern | Large market |
| ar-AE | UAE | Eastern | Gulf |
| ar-MA | Morocco | Western | Maghreb |
| ar-DZ | Algeria | Western | Maghreb |

---

## 6. Cultural and Content Notes

### Formal vs Informal

- Formal (الفصحى): News, official content
- Informal (العامية): Dialects vary by region (Egyptian, Levantine, Gulf)
- UI often uses Modern Standard Arabic (MSA) for consistency

### Text Length

- Arabic can be shorter or longer than English depending on register
- Design for expansion; avoid fixed-width text containers

### Mixed Content

- English brand names, URLs, code: keep LTR
- Numbers: follow locale (Eastern or Western)

---

## 7. Anti-Patterns

1. **Assuming one numeral system** — Support both; use locale or user preference
2. **Gregorian-only dates** — Offer Hijri for ar-SA and religious contexts
3. **English plural rule** — Arabic needs 6 forms
4. **Latin font for Arabic** — Use Arabic-capable font
5. **Letter-spacing on Arabic** — Breaks connections
6. **Treating Arabic like Hebrew** — Different script, numerals, calendar
7. **No RTL layout** — Arabic is RTL; layout must mirror

---

## Quick Reference Checklist

- [ ] Font supports Arabic (OpenType shaping)
- [ ] Numerals: Eastern vs Western per locale
- [ ] Hijri calendar for ar-SA and religious contexts
- [ ] 6 plural forms in ICU MessageFormat
- [ ] RTL layout with logical properties
- [ ] Test with real Arabic: مرحباً، كيف حالك؟
- [ ] Line height for diacritics if used

---
*Researched: 2026-03-08 | Sources: Unicode Arabic, CLDR, Wikipedia Eastern/Western numerals, Intl API, ICU Islamic calendar*
