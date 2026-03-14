# Locale and Language Tags — i18n/RTL Expertise Module

> BCP 47 (RFC 5646) defines language tags: `en-US`, `ar-SA`, `zh-Hans-CN`. Structure, lookup, fallback chain, and locale resolution for i18n.

> **Category:** Foundation
> **Applies to:** All
> **Key standards:** BCP 47 (RFC 5646), RFC 4647 (matching)
> **RTL impact:** Low — locale selects RTL; tags don't encode direction

## 1. Core Concepts

### BCP 47 Structure

```
language ["-" script] ["-" region] ["-" variant] ["-" extension]
```

| Subtag | Source | Example |
|--------|--------|---------|
| language | ISO 639 | en, ar, zh |
| script | ISO 15924 | Hans, Hant, Latn |
| region | ISO 3166-1 / UN M.49 | US, SA, 419 |
| variant | Registered | |
| extension | u-, t- | u-ca-hebrew |

### Examples

- `en` — English
- `en-US` — American English
- `ar-SA` — Arabic (Saudi Arabia)
- `zh-Hans-CN` — Chinese Simplified (China)
- `sr-Cyrl` — Serbian (Cyrillic script)
- `en-u-ca-hebrew` — English with Hebrew calendar extension

### Legacy: `iw` = `he`

- `iw` was deprecated for Hebrew; use `he`

---

## 2. Fallback Chain

When `ar-SA` is requested but a translation is missing:

1. `ar-SA`
2. `ar`
3. Default (e.g., `en`)

Implement via RFC 4647 lookup or framework fallback.

---

## 3. Locale Resolution

- **User preference:** `Accept-Language` header, OS locale, app setting
- **Explicit:** Pass locale to API/component
- **Default:** Project default when no match

---

## 4. Anti-Patterns

1. **Hardcoding locale** — Use user preference or explicit param
2. **No fallback** — Always have a default
3. **Using `iw`** — Use `he` for Hebrew
4. **Ignoring script** — `zh-Hans` vs `zh-Hant` matter
5. **Wrong region** — `es-ES` vs `es-419` (Latin America)

---

## Quick Reference Checklist

- [ ] Use BCP 47 tags
- [ ] Implement fallback chain
- [ ] Resolve from user preference
- [ ] Use `he` not `iw`

---
*Researched: 2026-03-08 | Sources: RFC 5646, W3C BCP 47, IANA registry*
