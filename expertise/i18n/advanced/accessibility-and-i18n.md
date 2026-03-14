# Accessibility and i18n — i18n/RTL Expertise Module

> lang and dir attributes aid screen readers; RTL affects reading order. Ensure accessible labels, focus order, and semantic structure in all locales.

> **Category:** Advanced
> **Applies to:** All
> **Key standards:** WCAG, W3C
> **RTL impact:** High — focus order, reading order

## 1. lang and dir

- `lang` on html and elements with language change
- `dir` for base direction
- Screen readers use both for pronunciation and order

## 2. Focus Order

- Tab order should follow visual order
- In RTL, that means right-to-left
- Ensure focusable elements in correct sequence

## 3. Labels and ARIA

- Accessible names in correct language
- Don't mix languages in single label without lang attribute

---
*Researched: 2026-03-08 | Sources: WCAG, W3C*
