# Unicode and Encoding — i18n/RTL Expertise Module

> Character encoding is the foundation: UTF-8 everywhere, normalization for comparison, and understanding code points vs grapheme clusters. Wrong encoding causes mojibake, broken emoji, and lost characters.

> **Category:** Foundation
> **Applies to:** All
> **Key standards:** Unicode, UTF-8 (RFC 3629)
> **RTL impact:** Low — encoding enables all scripts; RTL is layout

## 1. Core Concepts

### UTF-8 as Standard

- **99% of web** uses UTF-8
- Variable-width: 1–4 bytes per character
- ASCII-compatible (bytes 0–127 identical)
- Supports all 1.1M+ Unicode code points

### Code Points vs Characters

- **Code point:** U+0000 to U+10FFFF (e.g., U+0041 = 'A')
- **Grapheme cluster:** What users perceive as one character (e.g., "é" = e + combining acute, or precomposed U+00E9)
- **Surrogate pairs:** UTF-16 uses two 16-bit units for code points > U+FFFF; common bug source in JS (string length, indexing)

### Unicode Normalization

- **NFC** (Canonical Composition): Preferred for web; precomposed where possible
- **NFD** (Canonical Decomposition): Decomposed; used in some systems
- **NFKC/NFKD:** Compatibility forms; use for search/collation, not display
- Use NFC for storage and comparison to avoid duplicate representations

---

## 2. Declaration and Configuration

| Layer | How to Set UTF-8 |
|-------|------------------|
| HTML5 | `<meta charset="UTF-8">` |
| HTTP | `Content-Type: text/html; charset=UTF-8` |
| JSON API | `Content-Type: application/json; charset=UTF-8` |
| MySQL | `utf8mb4` (not `utf8` — that's 3-byte only; emoji need 4) |
| PostgreSQL | `UTF8` encoding |
| Node/JS | Default UTF-8 in modern runtimes |
| Python | `# -*- coding: utf-8 -*-` or default in Python 3 |

---

## 3. Locale Variations

- **Arabic:** Requires UTF-8; no special encoding
- **Hebrew:** Same
- **CJK:** Multi-byte sequences; ensure no truncation at byte boundaries
- **Emoji:** 4-byte sequences in UTF-8; `utf8mb4` in MySQL

---

## 4. Anti-Patterns

1. **Assuming 1 byte = 1 character** — UTF-8 is variable-width
2. **Truncating by byte count** — Can split multi-byte sequences; truncate by grapheme or code point
3. **Using `utf8` in MySQL** — Use `utf8mb4` for full Unicode
4. **No charset in HTTP/HTML** — Browsers guess; can cause mojibake
5. **Double-encoding** — Encoding already-UTF-8 bytes again
6. **String length for limits** — `"é".length` is 2 in JS (UTF-16); use grapheme segmentation for display limits
7. **Case conversion without locale** — Turkish dotted i; use `toLocaleLowerCase('tr-TR')`

---

## 5. Testing

- Test with: العربية, 日本語, emoji (👋), combining characters (é)
- Verify no mojibake when submitting forms
- Check DB storage and retrieval

---

## Quick Reference Checklist

- [ ] UTF-8 declared in HTML, HTTP, DB
- [ ] MySQL: `utf8mb4`
- [ ] NFC normalization for comparison
- [ ] No byte-based truncation of strings
- [ ] Test with Arabic, CJK, emoji

---
*Researched: 2026-03-08 | Sources: Unicode FAQ, W3C forms UTF-8, Better i18n encoding*
