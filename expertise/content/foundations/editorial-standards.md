# Editorial Standards -- Content Foundation Module

> **Category:** Content Foundation
> **Applies to:** All platforms -- Web, iOS, Android, Desktop
> **Last updated:** 2026-03-14
> **Sources:** AP Stylebook, Chicago Manual of Style, Microsoft Writing Style Guide, Google Developer Documentation Style Guide, GOV.UK Style Guide, Mailchimp Content Style Guide, Readability Formulas (Flesch, Gunning), W3C WCAG 2.2, Conscious Style Guide

Editorial standards govern how text is written across a product: casing, grammar,
voice, tone, number formatting, date rendering, and inclusive language. Without
explicit standards, a product drifts toward inconsistency -- "Sign In" on one screen,
"Log in" on another, "LOGIN" on a third. Standards eliminate ambiguity.

---

## 1. Casing Conventions

### 1.1 Sentence Case vs Title Case

| Convention     | Rule                                       | Example              |
|----------------|--------------------------------------------|-----------------------|
| Sentence case  | Capitalize only the first word and proper nouns | "Create new project" |
| Title Case     | Capitalize every major word                | "Create New Project"  |
| ALL CAPS       | Every letter capitalized                   | "SAVE CHANGES"        |
| lowercase      | Every letter lowercase                     | "save changes"        |

### 1.2 When to Use Each

| Element              | Recommended casing | Rationale                                  |
|----------------------|--------------------|--------------------------------------------|
| Page titles          | Sentence case      | Friendlier, easier to read, less ambiguous |
| Section headings     | Sentence case      | Consistent with page titles                |
| Button labels        | Sentence case      | GOV.UK, Microsoft, most SaaS standard     |
| Menu items           | Sentence case      | Matches button convention                  |
| Tab labels           | Sentence case      | Consistent with navigation                 |
| Table column headers | Sentence case      | Easier to scan in data-dense views         |
| Form field labels    | Sentence case      | "Email address" not "Email Address"        |
| Error messages       | Sentence case      | Natural language, not a heading            |
| Toast / snackbar     | Sentence case      | Brief messages, not titles                 |
| Legal / brand names  | As trademarked     | "GitHub" not "Github" or "GITHUB"          |

**Exceptions:**
- **iOS and macOS** traditionally use Title Case for buttons and menu items (Apple HIG).
  If building a native Apple app, match the platform convention.
- **Material Design 3** defaults to ALL CAPS for buttons but allows sentence case.
  Many Android apps now prefer sentence case for readability.

### 1.3 Title Case Rules (When Required)

When title case is required (iOS, formal headings), follow these capitalization rules:

**Always capitalize:** First and last word, nouns, verbs, adjectives, adverbs, pronouns.

**Never capitalize:** Articles (a, an, the), coordinating conjunctions (and, but, or,
nor, for, yet, so), short prepositions (in, on, at, to, by, of, up) -- unless they
are the first or last word.

| Do                          | Don't                       |
|-----------------------------|-----------------------------|
| "Sign In to Your Account"  | "Sign in to your account"   |
| "Save as Draft"             | "Save As Draft"             |
| "Turn On Notifications"    | "Turn on Notifications"     |

---

## 2. Voice and Tone

### 2.1 Active Voice

Active voice puts the subject before the action. It is shorter, clearer, and more
direct.

| Passive (avoid)                            | Active (prefer)                       |
|--------------------------------------------|---------------------------------------|
| "Your password has been changed."          | "You changed your password."          |
| "The file was uploaded successfully."      | "File uploaded."                       |
| "An error was encountered."               | "We encountered an error."             |
| "The form must be completed."             | "Complete the form."                   |
| "Payment will be processed."              | "We'll process your payment."          |

**When passive is acceptable:**
- When the actor is unknown or irrelevant: "Your account was created on March 1."
- When the object is more important: "All data will be encrypted."
- When active voice would blame the user: "Your file was too large" (passive) vs
  "You uploaded a file that was too large" (active, blame-y).

### 2.2 Second Person ("You")

Address the user as "you." Address the product as "we."

| Do                                    | Don't                                 |
|---------------------------------------|---------------------------------------|
| "You can export your data."           | "Users can export their data."        |
| "We'll send you a confirmation."      | "A confirmation will be sent."        |
| "Your changes were saved."            | "The user's changes were saved."      |

**Exception:** Legal text, privacy policies, and terms of service use third person
("the user," "the customer") for legal precision.

### 2.3 Tone Spectrum

Tone is not uniform. It shifts based on context.

| Context                | Tone                        | Example                                |
|------------------------|-----------------------------|-----------------------------------------|
| Onboarding             | Warm, encouraging           | "Great start! Let's set up your team." |
| Normal workflow        | Neutral, clear              | "Project created."                     |
| Success                | Positive, brief             | "Changes saved."                       |
| Warning                | Measured, specific          | "This action affects 12 team members." |
| Error                  | Calm, solution-oriented     | "File too large. Maximum size: 25 MB." |
| Destructive action     | Serious, consequence-focused| "This will permanently delete all data."|
| Security               | Direct, no casualness       | "Session expired. Sign in again."      |

**Never use exclamation marks in error or warning messages.** Reserve them for genuine
celebration: "You're all set!" is fine after onboarding. "Upload failed!" is hostile.

---

## 3. Reading Level

### 3.1 Flesch-Kincaid Grade Level

The Flesch-Kincaid Grade Level formula estimates the US school grade needed to
understand a text. Lower is better for UI copy.

**Target:** Grade 6-8 (ages 11-13). This is the reading level of most successful
consumer products (Gmail, Slack, Stripe docs).

| Grade level | Equivalent                    | Example products                     |
|-------------|-------------------------------|--------------------------------------|
| 5-6         | Elementary, very accessible   | GOV.UK, NHS digital services         |
| 7-8         | General audience              | Slack, Gmail, Stripe, Shopify        |
| 9-10        | Above average                 | Developer documentation              |
| 11-12       | College level                 | Legal documents, academic papers     |
| 13+         | Post-graduate                 | Patent filings, regulatory text      |

### 3.2 How to Write at Grade 6-8

1. **Short sentences.** Average 15-20 words per sentence. Mix short (8 words) and
   medium (25 words). Never exceed 30 words.
2. **Short paragraphs.** 2-4 sentences per paragraph. One idea per paragraph.
3. **Common words.** "Use" not "utilize." "Start" not "initiate." "Show" not
   "display." "End" not "terminate."
4. **One clause per sentence.** Avoid stacking subordinate clauses.
   - Bad: "When you have completed the form, which will be validated automatically,
     click submit, unless you have previously saved a draft."
   - Good: "Complete the form. It validates automatically. Then click Submit."
5. **Front-load meaning.** Put the most important information at the start of the
   sentence. Users scan; they don't read linearly.

### 3.3 Readability Testing

**Tools:**
- [Hemingway Editor](https://hemingwayapp.com) -- Grades text and highlights complex sentences
- [Readable.com](https://readable.com) -- Multiple readability scores
- `textstat` Python library -- Automated grade-level scoring in CI
- Flesch-Kincaid formula: `0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59`

**Integrate into CI:** Run readability checks on user-facing string files. Flag any
string above grade 10.

---

## 4. Banned and Restricted Terms

### 4.1 Universally Banned

These terms are vague, jargon-heavy, or condescending. Replace them.

| Banned term       | Replacement                  | Why banned                                |
|-------------------|------------------------------|-------------------------------------------|
| Click here        | [Describe the destination]   | Meaningless out of context, fails a11y    |
| Please            | (remove)                     | Filler word; commands don't need it       |
| Simply / just     | (remove)                     | Condescending; implies simplicity         |
| Easy / easily     | (remove)                     | What's easy for you isn't easy for others |
| Obviously         | (remove)                     | If it were obvious, you wouldn't write it |
| Note that         | (remove or restructure)      | Filler; lead with the information         |
| In order to       | "To"                         | Three words where one works               |
| Utilize           | "Use"                        | Pretentious; same meaning                 |
| Leverage          | "Use"                        | Business jargon                           |
| Functionality     | "Feature"                    | Unnecessarily long                        |
| Terminate         | "End" or "Stop"              | Overly formal                             |
| Invalid           | [State the constraint]       | Tells the user nothing specific           |
| Oops / Whoops     | (restructure)                | Humor in errors is inappropriate          |

### 4.2 Context-Restricted Terms

| Term              | Allowed in                   | Not allowed in                           |
|-------------------|------------------------------|------------------------------------------|
| Abort             | Developer tools, CLI output  | Consumer UI                              |
| Execute           | Code execution contexts      | General UI ("Run" instead)               |
| Kill / terminate  | Process management, DevOps   | Consumer-facing actions                  |
| Deprecated        | Developer documentation      | End-user messaging                       |
| Payload           | API documentation            | End-user messaging                       |
| Whitelist/blacklist| (never -- use allowlist/blocklist) | All contexts                     |
| Master/slave      | (never -- use primary/replica)     | All contexts                     |
| Sanity check      | (never -- use confidence check)    | All contexts                     |
| Grandfathered     | (never -- use legacy)              | All contexts                     |
| Dummy             | (never -- use placeholder/sample)  | All contexts                     |

---

## 5. Abbreviations and Acronyms

### 5.1 Rules

1. **Spell out on first use, then abbreviate.** "Content Management System (CMS)"
   on first mention, then "CMS" throughout. Exception: universally known acronyms
   (URL, PDF, API) don't need expansion.
2. **Never abbreviate in error messages.** Errors are stressful; don't add cognitive
   load. "Application Programming Interface error" is wrong too -- say "We couldn't
   connect to the service."
3. **Use abbreviations consistently.** If you abbreviate "minutes" as "min" in one
   place, never write "mins" or "minutes" in the same context.

### 5.2 Common Abbreviation Table

| Full form          | Abbreviation | When to abbreviate                        |
|--------------------|--------------|-------------------------------------------|
| minutes            | min          | Timestamps, durations, compact UI         |
| seconds            | sec or s     | Timers, performance metrics               |
| hours              | hr           | Durations, scheduling UI                  |
| megabytes          | MB           | Always (universally understood)           |
| gigabytes          | GB           | Always                                    |
| approximately      | (don't abbr)| Write "about" instead                     |
| information        | (don't abbr)| Write "info" only in very tight space     |
| application        | app          | Consumer context; "application" in formal |
| configuration      | config       | Developer context only                    |
| authentication     | auth         | Developer/internal context only           |
| administrator      | admin        | Only after establishing the full form     |

---

## 6. Number Formatting

### 6.1 Rules

1. **Spell out zero through nine. Use numerals for 10 and above.** "You have three
   tasks" but "You have 12 tasks." Exception: always use numerals in data-dense UI
   (tables, dashboards, metrics).
2. **Use numerals with units.** "5 MB" not "five MB." "3 minutes" not "three minutes"
   (in compact UI) but "three minutes ago" is fine in conversational copy.
3. **Use locale-aware separators.** US: 1,234.56. Germany: 1.234,56. India: 1,23,456.
   Never hardcode separators -- use `Intl.NumberFormat` or equivalent.
4. **Use compact notation for large numbers.** "1.2K followers" not "1,200 followers"
   in compact UI. "1,200 followers" in detailed views.
5. **Percentages:** Use the numeral with "%" and no space in English: "25%" not
   "25 %" or "twenty-five percent." Some locales require a space before %; delegate
   to the locale formatter.
6. **Currency:** Always use locale-aware formatting. Never hardcode "$" or position.
   "$5.00" in en-US, "5,00 $" in fr-FR, "5,00 EUR" in de-DE.

### 6.2 Ordinals

| Language | Pattern         | Example          | Notes                           |
|----------|-----------------|------------------|---------------------------------|
| English  | 1st, 2nd, 3rd   | "Your 3rd attempt"| Use sparingly in UI            |
| French   | 1er, 2e, 3e     | Locale-formatted | Different rules for masculine   |
| German   | 1., 2., 3.      | "3. Versuch"     | Period after numeral            |

Do not hardcode ordinal suffixes. Use `Intl.PluralRules` with `type: 'ordinal'` or
equivalent locale-aware formatting.

---

## 7. Date and Time in Copy

### 7.1 Relative vs Absolute

| Time distance   | Use relative               | Use absolute                   |
|-----------------|----------------------------|--------------------------------|
| < 1 minute ago  | "Just now"                 | Never (too precise)            |
| 1-59 minutes    | "5 min ago"                | Rarely                         |
| 1-24 hours      | "3 hours ago"              | When precision matters         |
| 1-6 days        | "Yesterday" or "3 days ago"| Calendar view, scheduling      |
| 7+ days         | Rarely                     | "Mar 7, 2026" (absolute)      |

### 7.2 Format Rules

1. **Abbreviate months in compact UI.** "Jan," "Feb," "Mar" -- not "January." Full
   month names in long-form text.
2. **Never use ambiguous date formats.** "03/07/2026" means March 7 in the US and
   July 3 in Europe. Use "Mar 7, 2026" or locale-aware formatting.
3. **Use 12-hour format in US English, 24-hour elsewhere.** "3:30 PM" (en-US) vs
   "15:30" (most of Europe). Locale-aware formatters handle this.
4. **Time zones:** Display time zones when the audience spans zones. Use the user's
   local time by default. "3:30 PM EST" for cross-timezone communication.
5. **Duration:** Use "3 hr 45 min" in compact UI. "3 hours and 45 minutes" in
   conversational copy. Never "3:45:00" unless it's a technical timestamp.

### 7.3 Common Patterns

```
"Last edited 5 min ago"
"Created Mar 7, 2026"
"Due tomorrow at 3:00 PM"
"Updated yesterday"
"Renews on Apr 1, 2026"
"Event starts in 2 days"
```

---

## 8. Inclusive Language

### 8.1 Principles

Inclusive language ensures that no user feels excluded, othered, or diminished by the
product's text. It is not political correctness -- it is precision. Exclusive language
is imprecise language.

### 8.2 Gender

1. **Default to "they/them" for unknown individuals.** "When a user signs in, they
   see their dashboard."
2. **Use role titles, not gendered titles.** "Chairperson" not "chairman."
   "Salesperson" not "salesman." "Flight attendant" not "stewardess."
3. **Avoid "guys" as a universal address.** Use "everyone," "team," "folks," or
   "all."
4. **Do not assume binary gender.** If collecting gender, include "Non-binary,"
   "Prefer not to say," or a free-text option.

### 8.3 Ability

1. **Don't use disability as metaphor.** "Blind to the issues," "crippled the system,"
   "deaf to feedback" -- replace with specific language: "unaware of the issues,"
   "severely limited the system," "ignored feedback."
2. **Don't describe tasks as "easy."** What is easy for one user may be impossible for
   another due to ability, context, or familiarity.
3. **Use person-first or identity-first language as the community prefers.** "Person
   with a disability" (person-first) or "disabled person" (identity-first) -- follow
   the preference of the community you're addressing.

### 8.4 Culture and Geography

1. **Don't assume US-centric conventions.** Date formats, measurement units, holiday
   references, and examples should be localizable. "Thanksgiving" is meaningless in
   most of the world.
2. **Avoid idioms that don't translate.** "Hit a home run," "knock it out of the park,"
   "ballpark figure" -- these are culturally specific. Use "succeed," "exceed
   expectations," "rough estimate."
3. **Don't use "foreign" to mean "international."** "Foreign" implies otherness.

### 8.5 Banned Metaphors (Engineering Context)

These terms have been widely replaced in the industry:

| Old term         | Replacement            | Rationale                             |
|------------------|------------------------|---------------------------------------|
| Whitelist        | Allowlist              | Avoid racial connotation              |
| Blacklist        | Blocklist / Denylist   | Avoid racial connotation              |
| Master / Slave   | Primary / Replica      | Avoid slavery reference               |
| Master branch    | Main branch            | Industry standard since 2020          |
| Sanity check     | Confidence check       | Avoid ableist connotation             |
| Dummy value      | Placeholder / Sample   | Avoid ableist connotation             |
| Grandfathered    | Legacy / Exempt        | Avoid reference to discriminatory laws|
| Native feature   | Built-in feature       | Avoid colonial connotation            |
| Man-in-the-middle| On-path attack         | Gender-neutral                        |

---

## 9. Common Mistakes in AI-Generated Editorial Content

### 9.1 Inconsistent Casing

**The problem:** AI generates "Sign In" in one component, "sign in" in another, and
"SIGN IN" in a third. Without a casing rule, every generation is a coin flip.

**How to fix:** Define casing rules per element type (see Section 1.2). Enforce via
linting rules on string files.

### 9.2 Passive Voice Overuse

**The problem:** AI defaults to passive constructions: "Your file has been uploaded,"
"The action was completed," "An error was encountered." These are longer and less
direct than active equivalents.

**How to fix:** Prompt for active voice. Review every "was," "has been," "will be"
construction. Rewrite: "File uploaded," "Action complete," "We hit an error."

### 9.3 Reading Level Inflation

**The problem:** AI generates text at grade 11-14 reading level: "The authentication
mechanism has been configured to facilitate seamless integration with your
organizational identity provider."

**How to fix:** Run readability scoring. Rewrite: "Sign-in is set up to work with your
company's identity provider."

### 9.4 Filler Words

**The problem:** AI pads text with "please note that," "it is important to," "in order
to," "simply," "just." These add length without meaning.

**How to fix:** Delete every "please," "simply," "just," "in order to," "note that"
and read the sentence again. If the meaning is preserved, the word was filler.

---

## 10. Quick Reference Checklist

### Casing
- [ ] **Sentence case for all UI elements** (unless platform requires Title Case)
- [ ] **No ALL CAPS except Material Design buttons** (if following M3 defaults)
- [ ] **Proper nouns and brand names match official casing**

### Voice
- [ ] **Active voice by default** (passive only when actor is unknown or blame is an issue)
- [ ] **Second person for addressing the user** ("You" not "the user")
- [ ] **"We" for the product** ("We'll send you a confirmation")

### Reading Level
- [ ] **Target grade 6-8 Flesch-Kincaid**
- [ ] **Average sentence length 15-20 words**
- [ ] **No sentences longer than 30 words**
- [ ] **Common words** ("use" not "utilize")

### Formatting
- [ ] **Spell out 0-9, numerals for 10+** (exception: data-dense UI uses all numerals)
- [ ] **Locale-aware number, date, and currency formatting**
- [ ] **No ambiguous date formats** ("Mar 7" not "03/07")
- [ ] **Relative time for recent events** ("5 min ago")

### Inclusivity
- [ ] **"They/them" for unknown individuals**
- [ ] **No disability metaphors**
- [ ] **No culturally-specific idioms in translatable text**
- [ ] **Allowlist/blocklist, primary/replica** (no legacy exclusionary terms)

### Terms
- [ ] **Banned terms eliminated** (see Section 4)
- [ ] **Abbreviations spelled out on first use**
- [ ] **No jargon in consumer-facing copy**
- [ ] **Consistent term usage across the product** (one term per concept)

---

**Sources:**

- [AP Stylebook](https://www.apstylebook.com)
- [Chicago Manual of Style](https://www.chicagomanualofstyle.org)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [GOV.UK Content Design -- Style Guide](https://www.gov.uk/guidance/style-guide)
- [Mailchimp Content Style Guide](https://styleguide.mailchimp.com)
- [Conscious Style Guide](https://consciousstyleguide.com)
- [Hemingway Editor](https://hemingwayapp.com)
- [Readability Formulas -- Flesch-Kincaid](https://readabilityformulas.com/flesch-grade-level-readability-formula/)
- [IETF -- Terminology, Power, and Exclusionary Language](https://www.rfc-editor.org/rfc/rfc8718)
- [Google -- Writing Inclusive Documentation](https://developers.google.com/style/inclusive-documentation)
