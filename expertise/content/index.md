# Directory Purpose

The `content` directory provides expertise for writing, structuring, and governing user-facing text in software products. It covers microcopy, dynamic string architecture, editorial standards, and terminology management -- the craft of content that ships inside interfaces.

# Key Concepts

- UX writing and microcopy patterns
- Dynamic and localizable string design
- Editorial voice, tone, and governance
- Terminology lifecycle and glossary management

# File Map

- `index.md` -- semantic map of the content directory

# Subdirectories

- `/foundations` -- microcopy, content modeling, editorial standards, and terminology governance
- `/patterns` -- reusable content patterns for UI states, notifications, accessibility copy, and sample data

# Reading Guide

If writing UI copy (buttons, errors, tooltips) -> read `/foundations/microcopy.md`
If designing strings that include variables, plurals, or conditionals -> read `/foundations/content-modeling.md`
If establishing or auditing editorial rules -> read `/foundations/editorial-standards.md`
If managing a product glossary or resolving term conflicts -> read `/foundations/terminology-governance.md`
If writing error, empty, or loading state copy -> read `/patterns/state-copy.md`
If structuring push notifications or emails -> read `/patterns/notification-content.md`
If improving screen reader text or cognitive accessibility -> read `/patterns/accessibility-copy.md`

# Relationship to Other Domains

- **i18n** -- The `i18n` domain covers the technical plumbing of localization (ICU MessageFormat syntax, CLDR rules, string externalization file formats). This `content` domain covers the writing decisions that feed into that plumbing: what the strings say, how they are structured for translation, and what editorial rules govern them.
- **design** -- The `design` domain covers visual hierarchy and layout. This `content` domain covers the text that lives inside those layouts: button labels, error messages, empty states, and tooltips.
