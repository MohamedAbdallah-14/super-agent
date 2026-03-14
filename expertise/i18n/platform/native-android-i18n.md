# Native Android i18n — i18n/RTL Expertise Module

> Android i18n: strings.xml, plurals, getString(), and RTL via layoutDirection, start/end attributes, and AutoMirrored drawables.

> **Category:** Platform
> **Applies to:** Mobile (Android)
> **Key standards:** Android Resources
> **RTL impact:** High — layoutDirection, start/end

## 1. Platform i18n System

- **Strings:** res/values/strings.xml, res/values-ar/strings.xml
- **Plurals:** plurals resource with quantity
- **API:** getString(R.string.key), getQuantityString()
- **RTL:** android:layoutDirection="locale", layout_marginStart/End

## 2. Setup

- Create values-ar, values-he for RTL
- Use start/end in XML (not left/right)
- Icons.AutoMirrored for directional icons

## 3. RTL

- layoutDirection="rtl" or "locale"
- layout_marginStart, paddingStart
- getLayoutDirectionFromLocale()

## 4. Anti-Patterns

- layout_marginLeft/Right
- Hardcoded strings
- No RTL resource directories

---
*Researched: 2026-03-08 | Sources: Android docs*
