# React i18n — i18n/RTL Expertise Module

> React i18n options: react-intl (ICU, FormatJS) vs react-i18next. Both support RTL via `dir` and `lang` on document root. Choose based on ICU compliance vs plugin ecosystem.

> **Category:** Platform
> **Applies to:** Web (React)
> **Key standards:** ICU MessageFormat, BCP 47
> **RTL impact:** High — dir attribute, logical CSS

## 1. Platform i18n System

### react-intl (FormatJS)

- ICU MessageFormat
- `FormattedMessage`, `FormattedNumber`, `FormattedDate`
- Built-in plural, select, rich text

### react-i18next

- JSON/ICU resources
- `useTranslation` hook, `t()` function
- `{{variable}}` interpolation; ICU via plugin

### RTL

- Set `dir="rtl"` and `lang="ar"` on `<html>` or root when locale is RTL
- Use CSS logical properties

---

## 2. Setup Guide

### react-intl

```tsx
import { IntlProvider, FormattedMessage } from 'react-intl';

<IntlProvider locale="ar" messages={messages}>
  <FormattedMessage id="greeting" defaultMessage="Hello!" />
</IntlProvider>
```

### react-i18next

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<h1>{t('greeting')}</h1>
```

### RTL Document Update

```tsx
useEffect(() => {
  document.documentElement.dir = dir;
  document.documentElement.lang = locale;
}, [locale, dir]);
```

---

## 3. Key APIs

### react-intl

- `FormattedMessage` — id, defaultMessage, values
- `useIntl()` — formatMessage, formatNumber, formatDate
- ICU: `{count, plural, one {# item} other {# items}}`

### react-i18next

- `t('key', { count })` — plural
- `t('key', { returnObjects: true })` — nested
- `i18n.changeLanguage('ar')`

---

## 4. RTL Support

- `dir` and `lang` on root
- Logical CSS (margin-inline-start, etc.)
- No physical properties in layout

---

## 5. Anti-Patterns

1. **Forgetting dir on root** — RTL layout breaks
2. **Physical CSS** — layout-left, margin-right
3. **Hardcoded strings** — Use FormattedMessage or t()

---

## Quick Reference Checklist

- [ ] IntlProvider or i18next provider
- [ ] dir and lang on document when RTL
- [ ] Logical CSS
- [ ] ICU for plurals (react-intl) or i18next plural

---
*Researched: 2026-03-08 | Sources: react-intl, react-i18next docs*
