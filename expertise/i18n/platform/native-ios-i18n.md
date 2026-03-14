# Native iOS i18n — i18n/RTL Expertise Module

> iOS i18n: Localizable.strings, .stringsdict for plurals, NSLocalizedString, and RTL via leading/trailing constraints and semanticContentAttribute.

> **Category:** Platform
> **Applies to:** Mobile (iOS)
> **Key standards:** Apple Localization
> **RTL impact:** High — leading/trailing, semanticContentAttribute

## 1. Platform i18n System

- **Strings:** Localizable.strings (`"key" = "value";`)
- **Plurals:** .stringsdict
- **API:** NSLocalizedString, String(localized:)
- **RTL:** leading/trailing in Auto Layout; UIView.semanticContentAttribute

## 2. Setup

- Add languages in Project → Info → Localizations
- Create Localizable.strings per locale
- Use NSLocalizedString("key", comment: "")

## 3. RTL

- Use leadingAnchor, trailingAnchor (not left/right)
- semanticContentAttribute = .forceRightToLeft for RTL
- SF Symbols auto-mirror many directional icons

## 4. Anti-Patterns

- left/right constraints
- Hardcoded strings
- No RTL testing

---
*Researched: 2026-03-08 | Sources: Apple HIG, Developer docs*
