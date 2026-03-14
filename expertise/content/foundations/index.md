# Directory Purpose

The `foundations` directory establishes the core content principles required to write clear, consistent, and localizable user-facing text.

# Key Concepts

- UX writing craft and microcopy patterns
- Dynamic string architecture for localization
- Editorial voice, grammar, and style governance
- Terminology management and glossary lifecycle

# File Map

- `microcopy.md` -- UX writing principles: button labels, error messages, tooltips, empty states, CTAs, placeholders, confirmation dialogs, and platform constraints
- `content-modeling.md` -- Dynamic string architecture: ICU MessageFormat authoring, pluralization, gender-aware strings, variable interpolation, truncation strategies, and conditional content
- `editorial-standards.md` -- Editorial governance: casing conventions, reading level, banned terms, number formatting, active voice, and inclusive language
- `terminology-governance.md` -- Glossary management: term disambiguation, canonical terms, cross-locale alignment, conflict resolution, and term lifecycle

# Reading Guide

If writing any UI text for the first time -> start with `microcopy.md`
If strings contain variables, counts, or conditional logic -> read `content-modeling.md`
If establishing style rules or auditing existing copy -> read `editorial-standards.md`
If resolving terminology conflicts or building a glossary -> read `terminology-governance.md`
