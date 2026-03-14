# Pluralization and Gender — i18n/RTL Expertise Module

> Languages have different plural rules (English: 2 forms; Arabic: 6; Japanese: 1) and gender agreement. ICU MessageFormat handles both via `plural` and `select`. Never use `count === 1 ? 'item' : 'items'`.

> **Category:** Foundation
> **Applies to:** All
> **Key standards:** CLDR plural rules, ICU MessageFormat
> **RTL impact:** Low — plural/gender are language rules

## 1. Core Concepts

### CLDR Plural Categories

- **zero** — Some languages (e.g., Arabic) have explicit zero form
- **one** — Singular (n=1 in English; varies by language)
- **two** — Dual (Arabic, Welsh, etc.)
- **few** — Small quantity (e.g., 2–4 in Russian)
- **many** — Large quantity (e.g., Polish)
- **other** — Default; required in every plural rule

No language uses all six. English uses one + other. Arabic uses all six.

### ICU MessageFormat: plural

```
{count, plural,
  zero {لا رسائل}
  one {رسالة واحدة}
  two {رسالتان}
  few {# رسائل}
  many {# رسالة}
  other {# رسالة}
}
```

`#` = formatted number.

### ICU MessageFormat: select (gender)

```
{gender, select,
  male {He}
  female {She}
  other {They}
} liked this.
```

### Locale Examples

| Language | Forms | Example |
|----------|-------|---------|
| English | one, other | 1 item / 2 items |
| Arabic | zero, one, two, few, many, other | 6 forms |
| Hebrew | one, two, other | 3 forms |
| Russian | one, few, many, other | 4 forms |
| Japanese | other | 1 form |
| Polish | one, few, many, other | 4 forms |

---

## 2. Implementation

### JavaScript (formatjs/react-intl)

```tsx
<FormattedMessage
  id="itemCount"
  defaultMessage="{count, plural, one {# item} other {# items}}"
  values={{ count: 5 }}
/>
```

### Dart (Flutter)

```dart
AppLocalizations.of(context)!.itemCount(5)
// From ARB: "{count, plural, one {# item} other {# items}}"
```

### Nested: plural + select

```
{count, plural,
  one {{gender, select, male {He has} female {She has} other {They have}} one.}
  other {{gender, select, male {He has} female {She has} other {They have}} #.}
}
```

---

## 3. Anti-Patterns

1. **`count === 1 ? 'item' : 'items'`** — Fails for Arabic, Russian, etc.
2. **Missing `other`** — Required in ICU
3. **Concatenating** — "You have " + count + " items"; use full message
4. **No gender** — French, German, etc. need gender agreement
5. **Ordinal as cardinal** — Use `selectordinal` for "1st", "2nd"

---

## Quick Reference Checklist

- [ ] Use ICU MessageFormat for plurals
- [ ] Include `other` in every plural
- [ ] Use `select` for gender when needed
- [ ] Never concatenate for plurals

---
*Researched: 2026-03-08 | Sources: CLDR plurals, ICU MessageFormat, IntlPull guide*
