# Flutter i18n — i18n/RTL Expertise Module

> Flutter's built-in i18n: ARB files, `flutter gen-l10n`, `AppLocalizations`, and RTL via `Directionality`. The `intl` package and `flutter_localizations` provide the foundation.

> **Category:** Platform
> **Applies to:** Mobile (Flutter)
> **Key standards:** ARB, ICU MessageFormat
> **RTL impact:** High — Directionality, EdgeInsetsDirectional, AlignmentDirectional

## 1. Platform i18n System

### Built-in Framework

- **ARB** (Application Resource Bundle): JSON-based locale files
- **Code generation:** `flutter gen-l10n` produces `AppLocalizations`
- **Delegates:** `AppLocalizations.localizationsDelegates`
- **Supported locales:** `AppLocalizations.supportedLocales`

### RTL at System Level

- `Directionality` widget; `TextDirection.rtl` for RTL
- `MaterialApp` uses `locale` to set `Directionality` when supported locale is RTL (ar, he, etc.)
- `EdgeInsetsDirectional`, `AlignmentDirectional`, `AlignmentDirectional` for layout

### Locale Resolution

- `MaterialApp.locale` or `supportedLocales` with `localeResolutionCallback`
- Fallback: first `supportedLocales` when no match

---

## 2. Setup Guide

### pubspec.yaml

```yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0

flutter:
  generate: true
```

### l10n.yaml

```yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
```

### Folder Structure

```
lib/
  l10n/
    app_en.arb
    app_ar.arb
    app_he.arb
```

### MaterialApp

```dart
MaterialApp(
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Home(),
)
```

---

## 3. Key APIs and Patterns

### String Localization

```dart
AppLocalizations.of(context)!.greeting('أحمد')
```

### ARB with Placeholders

```json
{
  "greeting": "Hello, {name}!",
  "@greeting": {
    "placeholders": { "name": { "type": "String" } }
  }
}
```

### Plural (ICU)

```json
{
  "itemCount": "{count, plural, =0{No items} one{1 item} other{# items}}",
  "@itemCount": { "placeholders": { "count": { "type": "int" } } }
}
```

### Date/Number Formatting

```dart
DateFormat.yMd(locale).format(date)
intl.NumberFormat.decimalPattern(locale).format(number)
```

### RTL

```dart
Directionality.of(context) == TextDirection.rtl
EdgeInsetsDirectional.only(start: 16, end: 8)
AlignmentDirectional.centerStart
```

---

## 4. RTL Support

- Add `ar`, `he`, `fa`, `ur` to `supportedLocales`
- Use `EdgeInsetsDirectional`, `AlignmentDirectional`, `Positioned.directional`
- Icons: many auto-mirror; use `Transform` for custom
- `TextDirection.rtl` for RTL text

---

## 5. Anti-Patterns

1. **EdgeInsets.only(left: 16)** — Use `EdgeInsetsDirectional.only(start: 16)`
2. **Alignment.centerLeft** — Use `AlignmentDirectional.centerStart`
3. **Missing RTL locales** — Add ar, he to supportedLocales
4. **Hardcoded strings** — Always use AppLocalizations

---

## Quick Reference Checklist

- [ ] flutter_localizations + intl
- [ ] l10n.yaml + ARB files
- [ ] supportedLocales includes ar, he
- [ ] EdgeInsetsDirectional, AlignmentDirectional
- [ ] Run flutter gen-l10n

---
*Researched: 2026-03-08 | Sources: Flutter docs, IntlPull Flutter guide*
