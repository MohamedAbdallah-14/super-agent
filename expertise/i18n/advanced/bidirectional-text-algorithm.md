# Bidirectional Text Algorithm — i18n/RTL Expertise Module

> Unicode UAX #9: how the BiDi algorithm resolves display order from logical order. Character types, embedding levels, and when to use overrides (LRI, RLI, PDI, LRM, RLM).

> **Category:** Advanced
> **Applies to:** All
> **Key standards:** Unicode UAX #9
> **RTL impact:** Critical — foundation of BiDi

## 1. Algorithm Overview

1. **Classify** characters (L, R, AL, EN, AN, NSM, etc.)
2. **Resolve** embedding levels from base direction
3. **Reorder** for display

## 2. Character Types

- **L (strong LTR):** Latin, digits in LTR context
- **R (strong RTL):** Hebrew
- **AL (Arabic letter):** Arabic
- **EN (European number):** 0-9
- **AN (Arabic number):** ٠-٩
- **NSM:** Combining marks

## 3. When Algorithm Fails

- Neutral characters between runs
- Spillover (number after RTL phrase)
- Use RLI/PDI (isolate) or LRM/RLM (mark)

## 4. Control Characters

- LRI, RLI, FSI, PDI — isolate (prefer)
- LRE, RLE, PDF — embed (legacy, spillover risk)
- LRM, RLM — single-character marks

---
*Researched: 2026-03-08 | Sources: Unicode UAX #9, W3C BiDi*
