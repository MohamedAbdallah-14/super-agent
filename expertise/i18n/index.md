# i18n/RTL Expertise — Knowledge Base

Comprehensive internationalization, localization, and RTL expertise for AI agents. Used during **Clarifier** (architecture) and **Dev** (implementation) to bake i18n in from day one.

## Directory Structure

```
expertise/i18n/
  foundations/     — Core concepts, standards, patterns
  rtl/             — RTL-specific rules, Arabic, Hebrew
  platform/        — Flutter, React, iOS, Android, Web, Backend
  content/         — Translation, MT, adaptation
  advanced/        — BiDi algorithm, complex scripts, a11y, performance
  PROGRESS.md      — Research status
```

## Quick Navigation

| Need | Read |
|------|------|
| Architecture decisions | foundations/i18n-architecture.md |
| String extraction | foundations/string-externalization.md |
| RTL layout rules | rtl/rtl-fundamentals.md, rtl/rtl-layout-mirroring.md |
| Arabic specifics | rtl/arabic-specific.md |
| Hebrew specifics | rtl/hebrew-specific.md |
| Flutter i18n | platform/flutter-i18n.md |
| React i18n | platform/react-i18n.md |
| Web CSS RTL | platform/web-css-i18n.md |
| BiDi text | foundations/text-direction-bidi.md |
| Testing RTL | rtl/rtl-testing-and-qa.md |

## Key Principles

1. **Physical vs logical** — Use start/end, inline-start/end; never left/right for layout
2. **Arabic ≠ Hebrew** — Different script, numerals, calendar, plurals
3. **ICU for plurals** — Never `count === 1 ? 'item' : 'items'`
4. **Intl for formats** — Never hardcode date/number formats
5. **Real text for testing** — العربية، עברית — not placeholder
