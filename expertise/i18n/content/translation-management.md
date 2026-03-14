# Translation Management — i18n/RTL Expertise Module

> Translation workflow: TMS (Crowdin, Lokalise, Phrase), key naming, context for translators, and continuous localization. Integrate early; avoid batch-at-end.

> **Category:** Content
> **Applies to:** All
> **Key standards:** XLIFF, TMS APIs
> **RTL impact:** Medium — TMS must handle RTL preview

## 1. Workflow

- Extract strings → Push to TMS → Translate → Pull to repo
- Continuous: sync on commit; batch: before release
- Key naming: semantic, hierarchical

## 2. Tools

- Crowdin, Lokalise, Phrase, Transifex
- Integrate via API or CLI
- Provide context: screenshots, descriptions, max length

## 3. Quality

- Glossary, style guide
- Review workflow
- QA for RTL, truncation

---
*Researched: 2026-03-08 | Sources: TMS vendors*
