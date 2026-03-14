# Date, Time, and Calendars — i18n/RTL Expertise Module

> Never hardcode date formats. Use `Intl.DateTimeFormat` or equivalent. Calendars vary: Gregorian, Hijri, Hebrew, Persian, Buddhist, Japanese Imperial. Locale determines default format and calendar.

> **Category:** Foundation
> **Applies to:** All
> **Key standards:** CLDR, Intl API
> **RTL impact:** Low — dates are locale-specific, not direction-specific

## 1. Core Concepts

### Calendars in Use

| Calendar | Locales | Use |
|----------|---------|-----|
| **Gregorian** | Most | Default for en, fr, de, etc. |
| **Hijri (Islamic)** | ar-SA, religious | Saudi civil, Muslim religious |
| **Hebrew** | he-IL | Jewish holidays, traditional |
| **Persian (Solar Hijri)** | fa-IR | Iran |
| **Buddhist** | th-TH | Thailand |
| **Japanese Imperial** | ja-JP | Japan (optional) |

### Intl.DateTimeFormat

```javascript
new Intl.DateTimeFormat('ar-SA', {
  calendar: 'islamic',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(new Date());

new Intl.DateTimeFormat('he-IL', {
  calendar: 'hebrew',
  year: 'numeric',
  month: 'long'
}).format(new Date());
```

### Format by Locale

- **en-US:** MM/DD/YYYY
- **en-GB:** DD/MM/YYYY
- **de-DE:** DD.MM.YYYY
- **ja-JP:** YYYY年M月D日
- **ar-SA:** Often Hijri; format varies

---

## 2. Anti-Patterns

1. **Hardcoded MM/DD/YYYY** — Wrong for 96% of world
2. **Assuming Gregorian** — Offer Hijri for ar-SA, Hebrew for he-IL
3. **No timezone** — Use `timeZone` option or store UTC, display local
4. **12h vs 24h** — Locale-dependent; use `hour12` from locale or user pref

---

## Quick Reference Checklist

- [ ] Use Intl.DateTimeFormat (or platform equivalent)
- [ ] Pass locale explicitly
- [ ] Support non-Gregorian calendars where relevant
- [ ] Handle timezone

---
*Researched: 2026-03-08 | Sources: MDN Intl.DateTimeFormat, CLDR calendars*
