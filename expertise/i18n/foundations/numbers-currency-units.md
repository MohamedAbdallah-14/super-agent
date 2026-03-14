# Numbers, Currency, and Units — i18n/RTL Expertise Module

> Number formatting varies: decimal separator (`.` vs `,`), grouping, currency symbol position, and numeral system (Western vs Eastern Arabic). Use `Intl.NumberFormat`; never hardcode.

> **Category:** Foundation
> **Applies to:** All
> **Key standards:** CLDR, Intl API
> **RTL impact:** Medium — Eastern Arabic numerals (٠١٢٣) in some locales

## 1. Core Concepts

### Decimal and Grouping

| Locale | Decimal | Thousands |
|--------|---------|-----------|
| en-US | . | , |
| de-DE | , | . |
| ar-SA | ٫ (Arabic decimal) | ٬ (Arabic thousands) |
| fr-FR | , | space |

### Numeral Systems

- **Western (0123):** en, de, fr, he-IL
- **Eastern Arabic (٠١٢٣):** ar-SA, ar-EG, fa-IR
- **Locale-dependent:** Use `Intl.NumberFormat(locale)` — it picks the right one

### Currency

```javascript
new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR'
}).format(1234.56);
// "١٬٢٣٤٫٥٦ ر.س"
```

### Units

- **Intl.NumberFormat** with `style: 'unit'` for lengths, etc.
- Or use `Intl` + custom unit strings

---

## 2. Anti-Patterns

1. **Hardcoded decimal separator** — Use Intl
2. **Assuming Western numerals** — ar-SA uses Eastern
3. **Currency symbol position** — Locale-dependent (before/after, spacing)
4. **No currency code** — Use ISO 4217 (USD, EUR, SAR)

---

## Quick Reference Checklist

- [ ] Use Intl.NumberFormat
- [ ] Pass locale and currency
- [ ] No hardcoded separators
- [ ] Test with ar-SA (Eastern numerals)

---
*Researched: 2026-03-08 | Sources: MDN Intl.NumberFormat, CLDR*
