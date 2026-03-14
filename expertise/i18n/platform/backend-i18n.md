# Backend i18n — i18n/RTL Expertise Module

> Backend i18n: Accept-Language, locale parameter, message catalogs, and formatting. APIs return locale-aware content; never assume server locale.

> **Category:** Platform
> **Applies to:** Backend
> **Key standards:** HTTP Accept-Language, BCP 47
> **RTL impact:** Low — backend returns data; client handles layout

## 1. Core Concepts

- **Locale resolution:** Accept-Language header or ?locale= query param
- **Message catalogs:** gettext, ICU, or JSON per locale
- **Formatting:** Use ICU/Intl for dates, numbers, currency server-side
- **Storage:** Store user locale preference; pass to formatting

## 2. Implementation

- Parse Accept-Language; resolve to supported locale
- Load message catalog for locale
- Format dates/numbers with locale
- Return Content-Language in response

## 3. Anti-Patterns

- Assuming server locale
- Hardcoded formats
- No locale in API

---
*Researched: 2026-03-08 | Sources: HTTP i18n*
