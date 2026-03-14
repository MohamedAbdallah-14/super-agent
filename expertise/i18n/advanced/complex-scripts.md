# Complex Scripts — i18n/RTL Expertise Module

> Arabic shaping, Hebrew final forms, Indic conjuncts, and CJK: OpenType, HarfBuzz, and rendering requirements. Font and engine support matter.

> **Category:** Advanced
> **Applies to:** All
> **Key standards:** OpenType, Unicode
> **RTL impact:** High — Arabic, Hebrew are complex scripts

## 1. Script Requirements

- **Arabic:** Contextual forms, ligatures, shaping
- **Hebrew:** Final forms, niqqud
- **Indic:** Conjuncts, reordering
- **CJK:** Ideographs, line breaking

## 2. Implementation

- Use fonts with OpenType support
- HarfBuzz (or platform shaper) for shaping
- Test with real text

## 3. Anti-Patterns

- Font without script support
- Truncation that splits grapheme clusters
- Assuming 1 char = 1 glyph

---
*Researched: 2026-03-08 | Sources: OpenType, Unicode*
