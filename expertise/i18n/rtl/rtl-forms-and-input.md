# RTL Forms and Input — i18n/RTL Expertise Module

> Form layout, label placement, input alignment, and validation messages in RTL. Labels at start of input, text alignment follows direction, placeholders and icons positioned correctly.

> **Category:** RTL
> **Applies to:** Mobile, Web
> **Key standards:** W3C, Material Design
> **RTL impact:** Critical — forms are high-frequency touchpoints

## 1. The Rules

### Label Placement

| Layout | LTR | RTL |
|--------|-----|-----|
| **Inline (label + input)** | Label left of input | Label right of input |
| **Top-aligned** | Label above input | Same (no mirror) |
| **Floating label** | Label at start of input | Label at start (right in RTL) |

**Rule:** Label is always at the **start** of the input (inline axis). In RTL, start = right.

### Input Text Alignment

- **LTR:** `text-align: start` → left
- **RTL:** `text-align: start` → right
- **Numbers in input:** May stay LTR (e.g., phone, credit card); use `dir="ltr"` on input if needed
- **Mixed content:** Use `dir="auto"` for user-generated text

### Input Icons

| Icon position | LTR | RTL |
|---------------|-----|-----|
| **Leading (search icon)** | Left of input | Right of input |
| **Trailing (clear, visibility)** | Right of input | Left of input |
| **Inside input** | `padding-inline-start` for leading icon space | Same (logical) |

---

## 2. Platform Implementation

### Web (CSS)

```css
.form-group {
  display: flex;
  flex-direction: row;  /* or column for top-aligned */
  gap: 0.5rem;
}

label {
  flex-shrink: 0;
  /* Inline: label at start; flex order handles it when dir=rtl */
}

input, textarea {
  text-align: start;
  padding-inline-start: 1rem;
  padding-inline-end: 1rem;
}

/* Leading icon */
.input-with-icon {
  padding-inline-start: 2.5rem;
}
.input-with-icon[dir="rtl"] {
  padding-inline-end: 2.5rem;
  padding-inline-start: 1rem;
}
/* Or use logical: padding-inline-start with icon positioned at start */
```

### Flutter

```dart
TextField(
  textDirection: TextDirection.rtl,  // or from Directionality
  textAlign: TextAlign.start,
  decoration: InputDecoration(
    labelText: '...',
    // Flutter handles RTL for icon placement when Directionality is set
    prefixIcon: Icon(Icons.search),  // At start
    suffixIcon: Icon(Icons.clear),   // At end
  ),
)
```

### Android

```xml
<EditText
  android:layoutDirection="locale"
  android:textAlignment="viewStart"
  android:gravity="start"
  ... />
```

### iOS

- Use leading/trailing constraints for label and input
- `NSTextAlignment.natural` for text alignment
- `semanticContentAttribute` for RTL

---

## 3. Special Cases

### Number Inputs

- Phone numbers, credit cards: often LTR
- Use `dir="ltr"` on the input or `inputmode` + `inputmode="numeric"`
- Or let `dir="auto"` resolve from first character

### Search Input

- Magnifier icon at start (right in RTL)
- Clear button at end (left in RTL)

### Validation Messages

- Position at start of input (below or inline)
- Use logical properties for placement

### Placeholder Text

- `text-align: start` so placeholder aligns with input
- Placeholder direction follows input `dir`

---

## 4. Anti-Patterns

1. **Label on wrong side** — Using `float: left` or `margin-left`; use logical
2. **Input text-align: left** — Use `text-align: start`
3. **Icon padding physical** — `padding-left` for leading icon; use `padding-inline-start`
4. **Fixed width for label** — Labels vary in length; use flex or min-width
5. **Validation message position** — Using `left`; use `inline-start`

---

## 5. QA Checklist

- [ ] Labels at start of input
- [ ] Input text aligns to start
- [ ] Leading/trailing icons in correct positions
- [ ] Placeholder aligns with input
- [ ] Number inputs (phone, etc.) handled (LTR or as needed)
- [ ] Validation messages at start
- [ ] Focus ring/outline uses logical inset

---

## Quick Reference Checklist

- [ ] Label at start (right in RTL for inline layout)
- [ ] `text-align: start` on inputs
- [ ] Icon padding uses `padding-inline-*`
- [ ] Test with long labels (e.g., German)
- [ ] Test number and mixed-content inputs

---
*Researched: 2026-03-08 | Sources: CSS-Tricks forms, Bootstrap RTL, Stack Overflow RTL forms*
