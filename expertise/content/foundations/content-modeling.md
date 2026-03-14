# Content Modeling -- Content Foundation Module

> **Category:** Content Foundation
> **Applies to:** All platforms -- Web, iOS, Android, Desktop
> **Last updated:** 2026-03-14
> **Sources:** ICU Project, Unicode CLDR, W3C Internationalization, Mozilla Pontoon, Phrase (Memsource), Apple WWDR Localization Guide

Content modeling is the discipline of designing user-facing strings so they can accept
dynamic data, adapt to plural forms and grammatical gender, handle locale-specific
length variance, and degrade gracefully when truncated. This module covers the
**authoring** decisions -- what to put in a message, how to structure variables, and
when to use conditional content. For the technical file formats and extraction tooling,
see `i18n/foundations/string-externalization.md` and `i18n/foundations/pluralization-and-gender.md`.

---

## 1. ICU MessageFormat Authoring

### 1.1 When to Use ICU MessageFormat

Use ICU MessageFormat when a string contains any of:

- A **variable** (user name, count, date, file name)
- A **plural** form (1 item vs 3 items)
- A **gender** reference (he/she/they completed the task)
- A **selection** (different text for different enum values)

If the string is fully static ("Cancel", "Save changes"), plain strings are fine.

### 1.2 Variable Interpolation

**Pattern:** `{variableName}` -- curly braces, camelCase, descriptive name.

```
Welcome back, {userName}.
You have {unreadCount} unread messages.
Last updated {lastUpdatedDate}.
```

**Naming rules:**

| Do                        | Don't                  | Why                                      |
|---------------------------|------------------------|------------------------------------------|
| `{userName}`              | `{0}` or `{name}`     | Named args are self-documenting          |
| `{fileSize}`              | `{size}`               | "size" is ambiguous (count? dimension?)  |
| `{recipientCount}`        | `{count}`              | Distinguishes from other counts          |
| `{expirationDate}`        | `{date}`               | Multiple dates may exist in context      |

**Rules:**

1. **Never concatenate strings around variables.** "Hello, " + name + "!" forces
   word order, which varies across languages. Use `"Hello, {name}!"` as a single
   translatable unit.
2. **Never embed UI elements (links, buttons) by splitting strings.** "Click {here}
   to continue" makes "here" a separate translation unit. Use full-sentence messages
   with markup: `"Click <link>here</link> to continue."` or restructure to avoid
   embedded actions.
3. **Provide translator context for every variable.** A comment like
   `{fileSize} -- formatted file size, e.g. "2.5 MB"` helps translators understand
   what value will fill the placeholder.

### 1.3 Plural Messages

**Pattern:** `{count, plural, one {# item} other {# items}}`

`#` is replaced with the formatted number. `one` and `other` are CLDR plural
categories.

**Authoring rules:**

1. **Always include the `other` category.** It is required by every language.
2. **Write the `other` form as the general case.** Many languages map most numbers
   to `other`.
3. **Use `#` for the number, not the variable name.** `#` renders the number with
   locale-appropriate formatting (commas, separators).
4. **Never hardcode English plural logic.** `count === 1 ? "item" : "items"` breaks
   in Arabic (6 forms), Russian (3 forms), and Japanese (1 form).

**Complete example with context:**

```
# English source
{taskCount, plural,
  one {# task remaining}
  other {# tasks remaining}
}

# Arabic (translator fills all 6 categories)
{taskCount, plural,
  zero {لا مهام متبقية}
  one {مهمة واحدة متبقية}
  two {مهمتان متبقيتان}
  few {# مهام متبقية}
  many {# مهمة متبقية}
  other {# مهمة متبقية}
}
```

### 1.4 Gender-Aware Strings

**Pattern:** `{gender, select, male {He} female {She} other {They}} completed the task.`

**Authoring rules:**

1. **Always include `other`.** It is the fallback for unknown or non-binary gender.
2. **Avoid gender when possible.** "Alex completed the task" is better than pronoun
   selection. Use gender only when the grammar requires it (many Romance and Semitic
   languages do).
3. **Combine gender and plural when needed:**

```
{recipientGender, select,
  male {{recipientCount, plural,
    one {He has # new message}
    other {He has # new messages}
  }}
  female {{recipientCount, plural,
    one {She has # new message}
    other {She has # new messages}
  }}
  other {{recipientCount, plural,
    one {They have # new message}
    other {They have # new messages}
  }}
}
```

This produces a combinatorial explosion. Consider restructuring the UI to avoid it.

### 1.5 Select (Enum-Based Content)

**Pattern:** `{status, select, active {Your account is active.} suspended {Your account is suspended. Contact support.} other {Account status unknown.}}`

Use `select` for any enum or categorical variable. Always include `other` as fallback
for future values the code may add.

---

## 2. Locale Length Variance

### 2.1 Expansion Ratios

Translated text is almost always longer than English. Plan for it.

| Source language | Target language | Typical expansion | Notes                         |
|-----------------|-----------------|-------------------|-------------------------------|
| English         | German          | +30%              | Compound nouns, longer verbs  |
| English         | French          | +15-20%           | Articles, gendered adjectives |
| English         | Finnish         | +30-40%           | Agglutinative morphology      |
| English         | Japanese        | -30%              | Denser script                 |
| English         | Chinese (Simp.) | -50%              | Logographic, very compact     |
| English         | Arabic          | +25%              | Prefixed articles, verb forms |
| English         | Portuguese (BR) | +20-30%           | Longer prepositions           |

### 2.2 Design Rules for Expansion

1. **Allow 40% horizontal expansion for any text element.** This covers the worst
   common case (Finnish, German). If the element cannot expand, it must truncate
   gracefully.
2. **Use flexible layouts, not fixed widths.** A button that fits "Save" in English
   may not fit "Speichern" in German or "Sauvegarder" in French.
3. **Test with pseudolocalization.** Generate strings that simulate expansion:
   `"Save" -> "[Saaaavvvee]"`. This reveals layout breakage before real translation.
4. **Avoid horizontal space constraints for sentences.** A 200px-wide toast that fits
   "File saved" will truncate "Arquivo salvo com sucesso" (Portuguese).

### 2.3 Pseudolocalization

Pseudolocalization transforms source strings to simulate translation challenges without
actual translation. It catches layout, truncation, and encoding issues early.

**Types:**

| Type         | What it does                              | Example                        |
|--------------|-------------------------------------------|--------------------------------|
| Accented     | Replaces ASCII with accented equivalents  | "Save" -> "[Savve]"          |
| Expanded     | Pads strings to simulate 30-40% expansion | "Save" -> "[Saaaaave]"       |
| Mirrored     | Reverses string for pseudo-RTL            | "Save" -> "[evaS]"           |
| Bracketed    | Wraps strings in markers to detect concat | "Save" -> "[Save]"           |

Run pseudolocalization in CI to catch regressions automatically.

---

## 3. Truncation Strategies for Dynamic Content

### 3.1 Decision Matrix

| Content type       | Truncation method         | Fallback                          |
|--------------------|---------------------------|-----------------------------------|
| User name          | Ellipsis after N chars    | Full name in tooltip or detail    |
| File path          | Middle ellipsis           | Full path in tooltip              |
| Description        | Line clamp (2-3 lines)   | "Show more" toggle                |
| Notification       | End ellipsis at container | Tap to expand                     |
| Number             | Never truncate            | Use compact notation (1.2K)       |
| Date/time          | Abbreviate format         | "Mar 14" vs "March 14, 2026"     |

### 3.2 Rules

1. **Never truncate in the middle of a word.** Break at word boundaries or use
   hyphenation.
2. **Never truncate a number.** "1,23..." could be 1,230 or 1,234,567. Use compact
   number formatting instead: 1.2K, 3.4M.
3. **Never truncate a URL path segment.** "/users/setti..." is useless. Use middle
   ellipsis: "/users/.../profile".
4. **Preserve meaning under truncation.** "You have 3 new..." is acceptable because
   the key information (3 new) is at the start. "In order to complete your..." is
   not acceptable because the meaning is at the end.
5. **Front-load the important information.** Write strings so the first N characters
   carry the most meaning: "3 tasks due today -- review the dashboard" truncates
   better than "Review the dashboard to see 3 tasks due today."

---

## 4. Placeholder Decisions

### 4.1 When to Use a Variable vs Hardcoding

| Scenario                              | Use variable?  | Rationale                        |
|---------------------------------------|----------------|----------------------------------|
| User's name                           | Yes            | Always dynamic                   |
| Count of items                        | Yes            | Needs plural handling            |
| Product name (your own product)       | Maybe          | Only if rebranding is likely     |
| Date or time                          | Yes            | Needs locale formatting          |
| Currency amount                       | Yes            | Needs locale formatting          |
| Units ("MB", "kg")                    | Yes            | Varies by locale/measurement     |
| "Email" (as a concept)               | No             | Stable term, not a variable      |
| Error code                            | Yes            | Varies per error                 |

### 4.2 Formatting Variables

Never format variables inside the string template. Use ICU format specifiers or
delegate to the runtime:

```
BAD:  "File size: {fileSize}MB"    -- unit hardcoded, no space in some locales
GOOD: "File size: {fileSize}"      -- runtime formats as "2.5 MB" per locale

BAD:  "{month}/{day}/{year}"       -- date order varies by locale
GOOD: "{date}"                     -- runtime formats per locale's date pattern

BAD:  "${amount}"                  -- currency symbol position varies
GOOD: "{amount}"                   -- runtime formats as "$5.00" or "5,00 $"
```

---

## 5. Conditional Content

### 5.1 When to Conditionally Vary Copy

| Condition                | Example                                        | Approach                       |
|--------------------------|------------------------------------------------|--------------------------------|
| Zero vs nonzero          | "No messages" vs "3 messages"                  | ICU plural with `=0`          |
| First-time vs returning  | "Welcome!" vs "Welcome back, {name}"           | Separate string keys           |
| Permission level         | "View" vs "Edit" button label                  | Separate keys or `select`     |
| Feature flag             | "Try beta" vs hidden                           | Code-level condition, not copy |
| Locale                   | "Color" (en-US) vs "Colour" (en-GB)            | Separate locale files          |
| Platform                 | "Tap" (mobile) vs "Click" (desktop)            | Separate keys per platform     |

### 5.2 Rules for Conditional Content

1. **Never branch on locale inside a string template.** Use separate locale files.
   The template `{locale === 'en-GB' ? 'colour' : 'color'}` is unmaintainable.
2. **Prefer separate string keys over complex conditionals.** Two simple strings are
   easier to translate than one string with nested `select` and `plural`.
3. **Use ICU `=0` for zero-specific messages.** `{count, plural, =0 {No items} one {# item} other {# items}}`
   -- the `=0` is an exact value match, distinct from the `zero` plural category
   (which is language-specific).
4. **Document every condition in translator comments.** Translators see string files,
   not code. If a string appears only for admins, say so in the comment.

---

## 6. Common Mistakes in AI-Generated Content Models

### 6.1 String Concatenation

**The problem:** AI generates code like `"Hello, " + name + "! You have " + count + " items."` instead of a single ICU template.

**Why it breaks:** Word order changes across languages. Japanese puts the greeting
after the name. Arabic puts the count before the noun. Concatenation locks the word
order to English.

**How to fix:** Use a single translatable string: `"Hello, {name}! You have {count, plural, one {# item} other {# items}}."`

### 6.2 Hardcoded Plurals

**The problem:** AI writes `count === 1 ? "item" : "items"` -- English-only plural
logic embedded in code.

**Why it breaks:** Arabic has 6 plural forms. Russian has 3. Japanese has 1. English
logic produces grammatically wrong output in most languages.

**How to fix:** Use ICU `plural` with at least `one` and `other` categories. Let the
CLDR rules handle each locale.

### 6.3 Embedded Markup Without Boundaries

**The problem:** AI splits a sentence around HTML: `"Click " + "<a>here</a>" + " to continue"`. This creates three translation units ("Click ", "here", " to continue") that translators cannot reorder.

**Why it breaks:** In German, "here" might need to be at the end: "Klicken Sie
<a>hier</a>, um fortzufahren." Translators need the whole sentence.

**How to fix:** Keep the entire sentence as one translation unit with inline markup
tags: `"Click <link>here</link> to continue."` The translation system preserves
tag positions while allowing reordering.

### 6.4 Ignoring Locale-Specific Formatting

**The problem:** AI hardcodes date formats ("MM/DD/YYYY"), number formats ("1,234.56"),
or currency symbols ("$").

**Why it breaks:** Germany uses "DD.MM.YYYY" and "1.234,56". Japan uses "YYYY/MM/DD".
The UK puts the currency symbol before the amount; some locales put it after.

**How to fix:** Pass raw values (timestamps, numbers) to locale-aware formatters.
Never format inside the string template.

---

## 7. Decision Framework

### 7.1 Simple String vs ICU Template

| If the string...                           | Use                   |
|--------------------------------------------|-----------------------|
| Contains no variables                      | Plain string          |
| Contains 1 variable, no plurals            | Simple interpolation  |
| Contains a count                           | ICU `plural`          |
| References a person's gender               | ICU `select`          |
| Has both count and gender                  | Nested ICU            |
| Varies by 3+ enum values                   | ICU `select`          |
| Has more than 2 nesting levels             | Split into multiple keys |

### 7.2 When to Split vs Nest

**Split** when:
- Nesting exceeds 2 levels (readability collapses)
- Different branches produce fundamentally different sentences
- The conditions are independent (permission + count + gender = 8+ combinations)

**Nest** when:
- The sentence structure remains the same across branches
- Only a word or phrase changes
- The nesting stays at 1-2 levels

### 7.3 Translator Readability Rule

If a translator cannot understand the string in their translation tool without reading
the source code, the string is too complex. Simplify or split.

---

## 8. Quick Reference Checklist

### Variables
- [ ] **All variables use named arguments** (`{userName}` not `{0}`)
- [ ] **No string concatenation** -- single translatable unit per message
- [ ] **Translator context comments on every variable**
- [ ] **No hardcoded formatting** (dates, numbers, currencies use runtime formatters)

### Plurals
- [ ] **`other` category always present**
- [ ] **`#` used for the number** (not the variable name)
- [ ] **No code-level plural logic** (`=== 1` ternaries)
- [ ] **`=0` used for zero-specific messages** (distinct from `zero` category)

### Gender
- [ ] **`other` always present as fallback**
- [ ] **Gender avoided when not grammatically necessary**
- [ ] **Combined gender+plural kept to 2 nesting levels max**

### Length Variance
- [ ] **40% expansion space in UI elements**
- [ ] **Pseudolocalization runs in CI**
- [ ] **Flexible layouts, no fixed-width text containers**

### Truncation
- [ ] **Important information front-loaded**
- [ ] **Numbers never truncated** (use compact formatting)
- [ ] **Full text accessible via tooltip or expand**
- [ ] **Truncation at word boundaries, not mid-word**

---

**Sources:**

- [ICU MessageFormat -- Formatting Messages](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Unicode CLDR -- Plural Rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)
- [W3C -- Internationalization Techniques: Authoring HTML & CSS](https://www.w3.org/International/techniques/authoring-html)
- [Mozilla Pontoon -- Fluent Syntax Guide](https://mozilla-l10n.github.io/localizer-documentation/tools/pontoon/)
- [Phrase -- ICU Message Format Guide](https://support.phrase.com/hc/en-us/articles/5822519545756-ICU-MessageFormat)
- [Apple -- Localization Best Practices](https://developer.apple.com/documentation/xcode/localization)
- [Google -- Pseudolocalization](https://developer.android.com/guide/topics/resources/pseudolocales)
