# Testing i18n — i18n/RTL Expertise Module

> Pseudo-localization, missing key detection, locale switching tests, and RTL visual regression. Automate what you can.

> **Category:** Advanced
> **Applies to:** All
> **RTL impact:** Critical — RTL needs dedicated tests

## 1. Pseudo-Localization

- Expand/accent strings to find truncation
- RTL pseudo (ar-XB) for layout
- Bracket keys to find untranslated

## 2. Automated Checks

- Lint for physical CSS properties
- CI: run with RTL locale
- Snapshot/visual regression for RTL

## 3. Manual

- Real Arabic/Hebrew
- Forms, navigation, mixed content
- Screen reader with RTL

---
*Researched: 2026-03-08 | Sources: Android pseudolocales, testing guides*
