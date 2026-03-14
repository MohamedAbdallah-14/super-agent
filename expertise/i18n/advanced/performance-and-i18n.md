# Performance and i18n — i18n/RTL Expertise Module

> Lazy load locale data; avoid bundling all languages. Split by locale or namespace. Measure bundle size impact.

> **Category:** Advanced
> **Applies to:** All
> **RTL impact:** Low

## 1. Lazy Loading

- Load translation files on demand
- Dynamic import per locale
- Don't bundle ar, he, zh if user only needs en

## 2. Bundle Size

- Each locale adds KB
- Split by namespace (auth, dashboard, etc.)
- Tree-shake unused keys if supported

## 3. Caching

- Cache loaded locale data
- CDN for static locale JSON

---
*Researched: 2026-03-08*
