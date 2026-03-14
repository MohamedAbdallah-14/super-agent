# i18n Architecture — i18n/RTL Expertise Module

> The foundational architecture for internationalization: separation of concerns, standards alignment, and design decisions that prevent technical debt. Getting this wrong means every subsequent i18n effort is fighting the codebase.

> **Category:** Foundation
> **Applies to:** All (Mobile, Web, Backend)
> **Key standards:** Unicode, CLDR, BCP 47 (RFC 5646), ICU, W3C i18n
> **RTL impact:** High — architecture must accommodate bidirectional layout from day one

## 1. Core Concepts

### What This Area Covers and Why It Matters

Internationalization (i18n) is the design and development of software so it can be adapted for users from any culture, region, or language without engineering changes. Localization (L10n) is the actual adaptation of content and formats for a specific locale. Architecture determines whether i18n is a first-class concern or an expensive retrofit.

**Why architecture matters:**
- Retrofitting i18n costs **3–5× more** than building it in from the start
- Every hardcoded string, format assumption, and layout direction creates debt
- Poor architecture forces translators to work around code instead of with it

### Fundamental Rules and Standards

| Standard | Purpose |
|----------|---------|
| **Unicode** | Character encoding; every character has a code point; UTF-8 is the default encoding |
| **CLDR** (Common Locale Data Repository) | Locale-specific data: plural rules, date/number formats, currency, collation |
| **BCP 47** (RFC 5646) | Language tags: `en-US`, `ar-SA`, `zh-Hans-CN` — structure and lookup |
| **ICU** (International Components for Unicode) | MessageFormat for plurals/gender/select; formatting APIs |
| **W3C i18n** | Web-specific guidelines: HTML `lang`/`dir`, CSS logical properties, BiDi |

### Common Misconceptions

1. **"i18n is just translating strings"** — False. i18n encompasses text direction, number/date/currency formats, pluralization, gender agreement, collation, input methods, fonts, and layout. String translation is one slice.

2. **"We'll add i18n later"** — The most expensive approach. Strings are embedded in components, formats are hardcoded, layouts assume LTR. Later = hunt-and-replace across the codebase.

3. **"UTF-8 is enough"** — UTF-8 handles encoding. It does not handle RTL, pluralization, locale-specific formatting, or mixed-script text.

4. **"One translation file per language"** — Flat files don't scale. Namespacing, lazy loading, and key organization matter.

5. **"Machine translation will fix it"** — MT helps with volume; it does not fix architectural mistakes (concatenation, missing context, wrong plural forms).

---

## 2. Implementation Patterns

### Separation of Concerns

**Rule:** All locale-specific elements live outside application logic.

| Element | Locale-Specific | Where It Lives |
|---------|-----------------|----------------|
| User-facing strings | Yes | Translation files (ARB, JSON, XLIFF, PO) |
| Date formats | Yes | CLDR / `Intl.DateTimeFormat` |
| Number/currency formats | Yes | CLDR / `Intl.NumberFormat` |
| Plural rules | Yes | CLDR / ICU MessageFormat |
| Layout direction | Yes | `dir` attribute, logical CSS, `Directionality` widget |
| Collation (sort order) | Yes | `Intl.Collator` |
| Font selection | Yes | Per-script font stacks |

### Key Organization

**Semantic naming, not positional:**

```
❌ button_1, screen_3_title, modal_close
✅ auth.login.submit, dashboard.welcome.title, common.close
```

Keys are a three-party contract: systems, translators, and developers. Structure by feature domain:

```
locales/
  en/
    auth.json      → auth.login, auth.register, auth.forgotPassword
    dashboard.json → dashboard.welcome, dashboard.stats
    common.json    → common.save, common.cancel, common.loading
  ar/
    auth.json
    ...
```

### Data Structures and Formats

**ICU MessageFormat** — For complex messages (plurals, gender, select):

```
// Plural (Arabic has 6 forms)
{count, plural, zero {لا رسائل} one {رسالة واحدة} two {رسالتان} few {# رسائل} many {# رسالة} other {# رسالة}}

// Select (gender)
{gender, select, male {قام بزيارة} female {قامت بزيارة} other {زار}} {place}
```

**Simple interpolation** — For straightforward strings:

```
"Hello, {{name}}!"
"{{count}} items in cart"
```

**Never concatenate:**

```
❌ "You have " + count + " new messages"
✅ t('messages.count', { count })  // "You have {count} new messages"
```

### Framework-Agnostic Patterns

1. **Locale as explicit parameter** — Never infer locale from global state when formatting; pass it explicitly for testability.
2. **Fallback chain** — `ar-SA` → `ar` → `en` (or project default).
3. **Missing key policy** — Return key, return default, throw, or log — decide once and enforce.
4. **Lazy loading** — Load locale data on demand; don't bundle all languages in the initial payload.

### Code Examples

**Dart (Flutter):**
```dart
// ARB file: app_en.arb
"welcomeMessage": "Hello, {name}!",
"@welcomeMessage": { "placeholders": { "name": {} } }

"itemCount": "{count, plural, =0{No items} one{1 item} other{# items}}",
"@itemCount": { "placeholders": { "count": {} } }

// Usage
Text(AppLocalizations.of(context)!.welcomeMessage('أحمد'))
Text(AppLocalizations.of(context)!.itemCount(5))
```

**TypeScript (react-intl):**
```tsx
<FormattedMessage
  id="welcomeMessage"
  defaultMessage="Hello, {name}!"
  values={{ name: 'أحمد' }}
/>
<FormattedMessage
  id="itemCount"
  defaultMessage="{count, plural, =0{No items} one{1 item} other{# items}}"
  values={{ count: 5 }}
/>
```

**Swift (iOS):**
```swift
String(format: NSLocalizedString("welcome_message", comment: ""), "أحمد")
String(format: NSLocalizedString("item_count", comment: ""), count)
// Use .stringsdict for plurals
```

**Kotlin (Android):**
```kotlin
getString(R.string.welcome_message, "أحمد")
resources.getQuantityString(R.plurals.item_count, count, count)
```

---

## 3. Locale Variations

### Arabic
- **Script:** Right-to-left, connected (cursive)
- **Numerals:** Western Arabic (0123) and Eastern Arabic (٠١٢٣) — user or region choice
- **Plurals:** 6 forms (zero, one, two, few, many, other)
- **Calendar:** Gregorian and Hijri (Islamic)
- **Example:** `ar-SA`, `ar-EG`, `ar-AE`

### German
- **Compound words:** Long (e.g., "Schlittschuhlaufen" vs "skating") — layout must accommodate 30%+ expansion
- **Decimal:** Comma as separator (1.234,56)
- **Date:** DD.MM.YYYY
- **Example:** `de-DE`, `de-AT`, `de-CH`

### Japanese / Chinese
- **No spaces:** Word boundaries differ; line breaking is script-specific
- **Vertical text:** Optional for Japanese
- **Multiple scripts:** Japanese mixes Hiragana, Katakana, Kanji
- **Example:** `ja-JP`, `zh-Hans-CN`, `zh-Hant-TW`

### Hindi
- **Complex conjuncts:** Devanagari script; conjunct formation affects rendering
- **Counting:** Different number words (e.g., lakh, crore)
- **Example:** `hi-IN`

### Turkish
- **Dotted vs dotless i:** `İ`/`i` vs `I`/`ı` — case conversion is locale-specific; `toUpperCase('i')` in Turkish yields `İ`, not `I`. Classic i18n bug.
- **Example:** `tr-TR`

---

## 4. Anti-Patterns

1. **String concatenation for sentences** — Breaks in every language with different word order. Use parameterized strings.

2. **Hardcoded date formats** — `MM/DD/YYYY` is wrong for 96% of the world. Use `Intl.DateTimeFormat` or equivalent.

3. **Assuming text length** — German ~30% longer, Chinese ~50% shorter. Design for expansion; avoid fixed-width containers.

4. **Assuming left-to-right** — Arabic, Hebrew, Persian, Urdu are RTL. Use logical properties from day one.

5. **Assuming single script** — Mixed content (e.g., English brand names in Arabic UI) requires BiDi handling.

6. **English plural rule** — `count === 1 ? 'item' : 'items'` fails for Arabic (6 forms), Russian (3 forms), etc. Use ICU plural.

7. **No locale in URLs/APIs** — Backend must know locale for formatting. Pass `Accept-Language` or explicit `locale` param.

8. **Keys as English text** — `"Welcome back"` as key ties you to English. Use semantic keys: `auth.welcomeBack`.

9. **Translating in the UI layer only** — Error messages, validation, API responses, logs shown to users must also be externalized.

10. **Ignoring RTL in layout** — `margin-left`, `padding-right`, `text-align: left` break in RTL. Use `margin-inline-start`, `padding-inline-end`, `text-align: start`.

11. **Single locale in backend** — User preference, not server default. Store and respect per-user locale.

12. **No fallback for missing translations** — Show key or default locale; never blank or crash.

13. **Synchronous loading of all locales** — Bundle size and memory. Lazy load by locale.

14. **Concatenating format strings** — `"Date: " + format(date)` — the format itself may need reordering. Use complete messages.

15. **Assuming ASCII for sorting** — Use `Intl.Collator` for locale-aware collation.

---

## 5. Testing Approach

### Pseudo-Localization

- Replace strings with expanded/accented versions to detect truncation and layout bugs
- Example: `Hello` → `Ĥéļļö` or `[Héllo]` with brackets to detect untranslated strings

### Character Coverage

- Test with real Arabic (العربية), Hebrew (עברית), and CJK text
- BiDi algorithm behaves differently with real text than with placeholders

### Edge Case Locales

- `ar-SA` (RTL, Arabic numerals, Hijri)
- `de-DE` (long compound words)
- `ja-JP` (no spaces, vertical text)
- `tr-TR` (dotted i)
- `hi-IN` (complex script)

### Verification Checklist

- [ ] All user-facing strings externalized
- [ ] No concatenation for building sentences
- [ ] Date/number/currency use locale APIs
- [ ] Pluralization uses ICU/CLDR
- [ ] RTL layout uses logical properties
- [ ] Missing keys have defined fallback

---

## Quick Reference Checklist

- [ ] Strings extracted from day one; no hardcoded user-facing text
- [ ] Keys are semantic; structure by feature domain
- [ ] ICU MessageFormat for plurals, gender, select
- [ ] No string concatenation for sentences
- [ ] Date/number/currency via `Intl` or platform equivalent
- [ ] Layout uses logical properties (start/end, not left/right)
- [ ] Locale passed explicitly; fallback chain defined
- [ ] Missing keys handled; no blank or crash
- [ ] Lazy load locale data
- [ ] Test with real Arabic/Hebrew and pseudo-localization

---
*Researched: 2026-03-08 | Sources: W3C i18n (w3.org/International), CLDR/ICU, BCP 47 (RFC 5646), IntlPull ICU MessageFormat guide, Locize/EzGlobe i18n anti-patterns*
