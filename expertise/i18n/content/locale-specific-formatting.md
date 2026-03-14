# Locale-Specific Formatting — i18n/RTL Expertise Module

> Date, number, currency, list, and unit formatting vary by locale. Use CLDR/Intl; document locale-specific expectations.

> **Category:** Content
> **Applies to:** All
> **RTL impact:** Medium — numeral system, date format

## 1. Formatting by Locale

- **Date:** Gregorian, Hijri, Hebrew, etc.
- **Number:** Decimal (.,), grouping, numerals
- **Currency:** Symbol position, spacing
- **List:** And/or/conjunction rules

## 2. Implementation

- Intl.DateTimeFormat, Intl.NumberFormat
- Pass locale explicitly
- Never hardcode formats

---
*Researched: 2026-03-08 | Sources: CLDR*
