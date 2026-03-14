# Web CSS i18n — i18n/RTL Expertise Module

> CSS for i18n: logical properties, `dir` attribute, `:dir()` pseudo-class, and `lang` attribute. The foundation of RTL and multi-script web layouts.

> **Category:** Platform
> **Applies to:** Web
> **Key standards:** CSS Logical Properties, W3C
> **RTL impact:** Critical — CSS is the primary RTL mechanism on web

## 1. Core Concepts

### Logical Properties

| Physical | Logical |
|----------|---------|
| margin-left | margin-inline-start |
| margin-right | margin-inline-end |
| padding-left | padding-inline-start |
| padding-right | padding-inline-end |
| left | inset-inline-start |
| right | inset-inline-end |
| text-align: left | text-align: start |
| text-align: right | text-align: end |

### dir Attribute

```html
<html dir="rtl" lang="ar">
```

- `dir="ltr"` | `dir="rtl"` | `dir="auto"`
- Affects layout, text direction, logical property resolution

### :dir() Pseudo-class

```css
:dir(rtl) .sidebar {
  transform: translateX(100%);
}
```

---

## 2. Implementation

### Use Logical Properties

```css
/* Avoid */
margin-left: 16px;

/* Use */
margin-inline-start: 16px;
```

### Transform Override for RTL

```css
:root { --slide: -100%; }
:dir(rtl) { --slide: 100%; }
.drawer { transform: translateX(var(--slide)); }
```

---

## 3. Anti-Patterns

1. **Physical properties** — left, right, margin-left
2. **text-align: left** — Use start
3. **float: left** — Use inline-start or flex

---

## Quick Reference Checklist

- [ ] Logical properties for layout
- [ ] dir on html when RTL
- [ ] :dir() for override when needed

---
*Researched: 2026-03-08 | Sources: MDN logical properties, W3C*
