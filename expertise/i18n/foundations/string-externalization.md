# String Externalization — i18n/RTL Expertise Module

> Extracting all user-facing strings from code into external resource files so they can be translated without touching source. The foundation of every localization workflow—get this wrong and translators work against the codebase.

> **Category:** Foundation
> **Applies to:** All (Mobile, Web, Backend)
> **Key standards:** ICU MessageFormat, XLIFF (ISO 21720), gettext PO, ARB
> **RTL impact:** Medium — externalized strings enable RTL; keys and placeholders must not assume LTR

## 1. Core Concepts

### What This Area Covers

String externalization is the practice of moving every user-facing string out of source code into separate resource files. This enables:
- Translation without code changes
- Consistent key management across languages
- Context for translators (descriptions, placeholders, screenshots)
- Automated extraction and validation

### Why It Matters

- **Retrofitting costs 3–5×** — Hunting for hardcoded strings across components, templates, and API responses is expensive
- **Keys are a contract** — Between developers, translators, and translation management systems
- **Poor key naming** — Causes 2–3× more time on translation management, reuse errors, and maintenance brittleness

### Common Misconceptions

1. **"We can grep for strings later"** — Strings appear in JSX, templates, error constructors, validation messages, logs. Grep misses many.
2. **"Keys can be the English text"** — Ties you to English; renames break translation history.
3. **"One big file per language"** — Doesn't scale; no code-splitting, merge conflicts, slow loads.
4. **"Translators don't need context"** — "Save" can mean "persist" or "rescue"; "Close" can mean "shut" or "near."

---

## 2. Implementation Patterns

### Key Naming Convention

**Hierarchical, feature-based, semantic:**

```
{namespace}.{component}.{element}.{modifier}
```

**Examples:**
- `auth.login.submitButton` — not `loginSubmitButton`
- `checkout.cart.emptyState.title` — not `emptyCart`
- `common.errors.networkError` — not `error1`

**Rules:**
- Use consistent casing (camelCase or snake_case project-wide)
- Keep keys under ~50 characters
- Avoid positional names (`sidebar.firstItem`, `modal.button1`)
- No special characters or spaces; alphanumeric + dots/underscores only

### File Formats

| Format | Used By | Structure | Plurals |
|--------|---------|-----------|---------|
| **ARB** | Flutter/Dart | JSON, `@` metadata | ICU MessageFormat |
| **JSON** | React, Vue, Node | Key-value, nested or flat | ICU or `_one`/`_other` suffix |
| **XLIFF** | Enterprise, CAT tools | XML, source+target pairs | Embedded in `<trans-unit>` |
| **PO** | gettext, Linux, PHP | `msgid`/`msgstr`, `msgid_plural` | `Plural-Forms` header |
| **strings.xml** | Android | XML, `string`/`plurals` | `quantity` attributes |
| **Localizable.strings** | iOS | `"key" = "value";` | `.stringsdict` |

### ARB (Flutter) Example

```json
{
  "@@locale": "en",
  "welcomeMessage": "Hello, {name}!",
  "@welcomeMessage": {
    "description": "Greeting on dashboard",
    "placeholders": {
      "name": {
        "type": "String"
      }
    }
  },
  "itemCount": "{count, plural, =0{No items} one{1 item} other{# items}}",
  "@itemCount": {
    "description": "Cart item count",
    "placeholders": {
      "count": {
        "type": "int"
      }
    }
  }
}
```

### JSON (React/i18next) Example

```json
{
  "auth": {
    "login": {
      "title": "Sign in",
      "submit": "Log in",
      "forgotPassword": "Forgot password?"
    }
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

### PO (gettext) Example

```
#: src/components/Login.tsx:42
msgid "Sign in"
msgstr ""

#: src/components/Cart.tsx:15
msgid "One item in cart"
msgid_plural "%d items in cart"
msgstr[0] ""
msgstr[1] ""
```

### XLIFF 2.0 Snippet

```xml
<trans-unit id="auth.login.title">
  <source>Sign in</source>
  <target>تسجيل الدخول</target>
  <note>Login screen heading</note>
</trans-unit>
```

### Folder Structure

Organize by feature/namespace, not by page or file location:

```
locales/
  en/
    auth.json
    dashboard.json
    checkout.json
    common.json
  ar/
    auth.json
    dashboard.json
    ...
```

Enables code-splitting, clear ownership, and lazy loading per namespace.

### Placeholder and Interpolation Rules

1. **Never concatenate** — Use `{name}` or `{{name}}`; let translators control word order.
2. **Document placeholders** — Type, purpose, example in metadata.
3. **Escape carefully** — Some formats use `{count}` (ICU) vs `{{count}}` (i18next); know your framework.

---

## 3. Locale Variations

### Arabic
- Long strings for formal register; short for informal. Provide both if needed.
- Placeholders may need to appear in different positions: "مرحباً {{name}}" vs "Welcome, {{name}}"
- RTL affects placeholder placement in mixed content.

### German
- ~30% longer; design for expansion. Keys should not imply length.
- Compound words: "E-Mail-Adresse" — ensure UI doesn't truncate.

### Japanese / Chinese
- Often shorter; avoid fixed-width layouts that assume long text.
- No spaces; line breaks differ. Provide max length hints for translators.

### Hebrew
- Similar to Arabic for RTL; different typography. Keys and structure are shared; values differ.

---

## 4. Anti-Patterns

1. **Hardcoded strings in components** — Every visible string must be externalized.
2. **Keys as English text** — `"Welcome back"` as key; use `auth.welcomeBack`.
3. **String concatenation** — `"Hello, " + name`; use `t('greeting', { name })`.
4. **No context for translators** — Add descriptions, screenshots, max length.
5. **Flat key namespace** — `button1`, `title2`; use hierarchical semantic keys.
6. **Inconsistent casing** — Mix of camelCase and snake_case; pick one.
7. **Positional keys** — `sidebar.firstItem`; use `navigation.sidebar.dashboard`.
8. **Translating in UI only** — API errors, validation, logs shown to users must be externalized.
9. **Missing placeholder metadata** — Translators need type and purpose.
10. **One giant file** — Split by feature for maintainability and lazy loading.
11. **No fallback for missing keys** — Define policy: show key, default locale, or throw.
12. **Keys that change** — Renaming breaks translation memory; use stable semantic keys.
13. **Embedding HTML in strings** — Prefer structured messages (e.g., rich text components).
14. **Translating developer-only strings** — Log messages, debug text—exclude from extraction.
15. **No extraction automation** — Manual copy-paste leads to drift; use extraction tools.

---

## 5. Testing Approach

### Extraction Validation
- Run extraction; ensure no new hardcoded strings
- CI check: fail if strings appear in code without extraction

### Missing Key Detection
- Test with a locale that has incomplete translations
- Verify fallback behavior (key vs default locale)

### Placeholder Coverage
- Ensure all placeholders documented
- Test with long/short/empty values, RTL text (e.g., العربية)

### Pseudo-Localization
- Replace values with expanded/accented text to find truncation
- Use bracketed placeholders `[KeyName]` to find untranslated keys

---

## Quick Reference Checklist

- [ ] All user-facing strings in resource files
- [ ] Keys are semantic, hierarchical, consistent casing
- [ ] Placeholders documented (type, purpose)
- [ ] No string concatenation for sentences
- [ ] Files organized by feature/namespace
- [ ] Extraction automated in CI
- [ ] Missing key policy defined and enforced
- [ ] Context (descriptions, screenshots) for translators
- [ ] API/validation/error messages externalized
- [ ] Test with pseudo-localization and incomplete locales

---
*Researched: 2026-03-08 | Sources: Locize key naming guide, IntlPull translation keys, Flutter ARB docs, XLIFF spec, gettext PO manual*
