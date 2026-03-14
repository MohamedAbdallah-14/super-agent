# Terminology Governance -- Content Foundation Module

> **Category:** Content Foundation
> **Applies to:** All platforms -- Web, iOS, Android, Desktop
> **Last updated:** 2026-03-14
> **Sources:** ISO 704 (Terminology Work -- Principles and Methods), LISA Best Practices, Translation Memory Exchange (TMX), TBX (TermBase eXchange), OASIS, SAE J2450, Phrase TMS, Memsource, memoQ, SDL MultiTerm

Terminology governance is the practice of deciding what words a product uses, keeping
those decisions consistent across screens, locales, and teams, and managing how terms
evolve over time. Without governance, "workspace" in one screen becomes "project" in
another and "environment" in a third -- each referring to the same concept.

---

## 1. Why Terminology Governance Matters

### 1.1 The Cost of Inconsistency

- **Support tickets.** Users search help docs for "workspace" but the docs say
  "project." They file a ticket because they can't find the answer.
- **Translation cost.** If the source language uses 3 terms for the same concept,
  translators create 3 translations. At 40 locales, that's 120 strings instead of 40.
- **Onboarding friction.** New users learn one term in a tutorial, encounter a
  different term in the product, and wonder if they mean different things.
- **Legal exposure.** In regulated industries (healthcare, finance), term ambiguity
  in user agreements can create compliance risk.

### 1.2 What a Glossary Solves

A product glossary (also called a termbase) is a controlled vocabulary that maps each
concept to exactly one canonical term. It answers:

- What is the **approved term** for this concept? ("workspace" -- not "project" or
  "environment")
- What terms are **deprecated**? ("project" was used in v1 but replaced by
  "workspace" in v2)
- What is the **definition**? (A workspace is a top-level container for collections,
  members, and settings.)
- What are the **translations**? (fr: "espace de travail", de: "Arbeitsbereich",
  ar: "area_al_amal")
- What is the **context**? (Used in navigation, settings, and billing.)

---

## 2. Term Anatomy

### 2.1 Term Record Structure

Every term in the glossary should capture these fields:

| Field              | Purpose                                        | Example                         |
|--------------------|------------------------------------------------|---------------------------------|
| Canonical term     | The approved word                              | Workspace                       |
| Definition         | What it means in this product                  | Top-level container for...      |
| Part of speech     | Noun, verb, adjective                          | Noun                            |
| Context            | Where it appears in the product                | Nav, settings, billing, API     |
| Synonyms (banned)  | Terms that mean the same but must not be used  | Project, environment, space     |
| Related terms      | Terms that are related but distinct             | Collection, team, organization  |
| Status             | Active, deprecated, proposed                   | Active                          |
| Introduced in      | Version or date the term entered the product   | v2.0 (2025-06-01)              |
| Deprecated in      | Version or date (if deprecated)                | --                              |
| Notes              | Usage guidance, edge cases                     | Always lowercase in UI copy     |
| Locale variants    | Approved translations per locale               | fr: espace de travail           |

### 2.2 Term Types

| Type                | Description                                    | Example                         |
|---------------------|------------------------------------------------|---------------------------------|
| Product term        | Concept specific to your product               | Workspace, Flow, Sprint         |
| Domain term         | Industry-standard concept                      | Invoice, API key, webhook       |
| UI term             | Standard interface element name                | Button, modal, dropdown         |
| Action term         | Verb used for user actions                     | Create, delete, archive, export |
| Status term         | State of an object                             | Active, paused, draft, failed   |

---

## 3. Canonical vs Colloquial Terms

### 3.1 The Disambiguation Problem

Users and stakeholders use informal terms that may not match the product's canonical
vocabulary. Governance must bridge this gap without forcing unnatural language.

| Canonical (in product) | Colloquial (users say)      | Guidance                         |
|------------------------|-----------------------------|----------------------------------|
| Workspace              | Project, space, environment | Product uses "workspace" only    |
| Organization           | Company, team, org          | "org" acceptable in compact UI   |
| Collection             | Folder, group, bucket       | Never use "folder" (implies FS)  |
| Deploy                 | Push, ship, release         | Use "deploy" in all contexts     |
| Webhook                | Callback, hook, notification| "Webhook" is the standard        |
| API key                | Token, secret, credentials  | "API key" specifically; "token"  |
|                        |                             | is a different concept           |

### 3.2 Rules for Choosing Canonical Terms

1. **Use the term your users already use.** If 80% of users say "project" and your
   product says "workspace," you are fighting your users. Either adopt "project" or
   have a very good reason (like "project" is a sub-concept of "workspace").
2. **Use the industry-standard term when one exists.** "Webhook" not "push
   notification endpoint." "OAuth" not "third-party sign-in protocol."
3. **Prefer shorter terms.** "Team" over "team organization unit." "Deploy" over
   "deployment operation."
4. **Prefer concrete terms over abstract ones.** "Dashboard" (specific) over "home
   screen" (vague). "Invoice" (concrete) over "billing document" (abstract).
5. **Never use internal jargon in user-facing copy.** If the engineering team calls it
   a "reconciliation job," the user sees "sync" or "update."

---

## 4. Cross-Locale Alignment

### 4.1 The Translation Challenge

A canonical English term must map to exactly one term per locale. Without governance,
translators make independent choices, producing inconsistency:

```
English: "Workspace"
French translator A: "Espace de travail"
French translator B: "Espace projet"
French translator C: "Zone de travail"
```

All three are valid French, but the product now has three translations for one concept.

### 4.2 Termbase-Driven Translation

1. **Create the termbase before starting translation.** Translators receive the
   termbase alongside the strings. The termbase is the authority.
2. **Lock approved translations.** In the Translation Management System (TMS), mark
   approved term translations as locked. The TMS warns translators if they deviate.
3. **Provide context in the termbase.** "Workspace" in a code editor means something
   different from "workspace" in a project management tool. Include a product-specific
   definition and screenshot.
4. **Review new terms with in-locale reviewers.** Native speakers in each target
   locale should validate that the chosen translation is natural and unambiguous in
   their market.
5. **Handle untranslatable terms explicitly.** Some terms (brand names, technical
   terms like "API") stay in English across all locales. Mark these as "do not
   translate" (DNT) in the termbase.

### 4.3 Do-Not-Translate (DNT) List

| Term category          | Examples                     | Guidance                         |
|------------------------|------------------------------|----------------------------------|
| Brand names            | GitHub, Stripe, Kubernetes   | Never translate                  |
| Protocol names         | OAuth, HTTPS, WebSocket      | Never translate                  |
| Programming terms      | API, SDK, JSON, YAML         | Never translate                  |
| Product features (branded) | "Flows" (if branded)    | Never translate; explain locally |
| Proper nouns           | John Doe (in examples)       | Adapt to locale-appropriate names|
| UI labels (sometimes)  | OK, Cancel                   | Usually translate; check locale  |

---

## 5. Conflict Resolution

### 5.1 When Conflicts Arise

Term conflicts occur when:

- Two teams use different terms for the same concept
- A new feature introduces a term that collides with an existing one
- A translation contradicts an established locale term
- Users complain that the product's term doesn't match their expectations

### 5.2 Resolution Process

```
1. IDENTIFY  -- Document the conflict: what terms, what concepts, where used
2. RESEARCH  -- Check user research, support tickets, competitor products,
                industry standards, and locale implications
3. PROPOSE   -- Draft 2-3 options with pros/cons for each
4. DECIDE    -- Content owner (or designated terminology steward) makes the call
5. UPDATE    -- Update the termbase, string files, docs, and UI simultaneously
6. ANNOUNCE  -- Notify engineering, design, support, and translation teams
7. DEPRECATE -- Mark the old term as deprecated with a pointer to the replacement
```

### 5.3 Decision Criteria

When evaluating competing terms, score each on:

| Criterion             | Weight | Question                                      |
|-----------------------|--------|-----------------------------------------------|
| User familiarity      | High   | Do users already use this term?               |
| Industry alignment    | High   | Is this the standard industry term?           |
| Brevity               | Medium | Is it short enough for buttons and tabs?      |
| Translatability       | Medium | Can it be cleanly translated to target locales?|
| Uniqueness            | Medium | Does it collide with other product terms?     |
| Searchability         | Low    | Can users find it in search/help?             |
| Trademark risk        | Low    | Is it trademarked by a competitor?            |

### 5.4 Example Conflict Resolution

**Conflict:** The billing team calls it "subscription." The product team calls it
"plan." The API calls it "license." Users search for "pricing."

**Research:**
- Support tickets: 60% say "plan," 30% say "subscription," 10% say "pricing."
- Competitors (Slack, GitHub, Notion): all use "plan" for the tier and "subscription"
  for the recurring payment relationship.

**Decision:** "Plan" = the tier (Free, Pro, Enterprise). "Subscription" = the billing
relationship (active, canceled, past due). "Pricing" = the public page listing plans.
"License" deprecated in user-facing contexts.

**Termbase update:**
| Term         | Definition                          | Status     | Banned synonyms   |
|--------------|-------------------------------------|------------|-------------------|
| Plan         | A tier of features and limits       | Active     | License, package  |
| Subscription | The billing relationship to a plan  | Active     | Membership        |
| Pricing      | The public page listing plans       | Active     | Rates, fees       |
| License      | (deprecated -- use "plan")          | Deprecated | --                |

---

## 6. Domain Research

### 6.1 When to Research

Research terms when:

- Entering a new industry vertical (healthcare, finance, education)
- Adding a feature that uses domain-specific concepts
- Users report confusion about existing terms
- Expanding to a new locale where industry terms may differ

### 6.2 Research Sources

| Source                  | What it provides                              | When to use                   |
|-------------------------|-----------------------------------------------|-------------------------------|
| User interviews         | Terms users actually say                      | Always                        |
| Support ticket analysis | Terms users search for and fail to find       | Before renaming anything      |
| Competitor products     | Industry conventions                          | When entering a new vertical  |
| Industry standards      | Regulated or standardized terminology         | Healthcare, finance, legal    |
| ISO / W3C / IETF docs   | Formal definitions                            | Technical standards           |
| In-locale reviewers     | Cultural and linguistic validation            | Before launching in new locale|
| Analytics (search logs) | What users type when looking for a concept    | Post-launch optimization      |

### 6.3 Research Deliverable

A term research document should contain:

```
Term: [the concept being named]
Context: [where it appears in the product]

Candidate terms:
  1. [term A] -- used by [competitors/standards/users]. Pros: ... Cons: ...
  2. [term B] -- used by [competitors/standards/users]. Pros: ... Cons: ...
  3. [term C] -- used by [competitors/standards/users]. Pros: ... Cons: ...

User evidence:
  - [N]% of support tickets use term [X]
  - [N] out of [M] interviewees used term [Y]

Recommendation: [term] because [rationale]
Locale implications: [any translation concerns]
```

---

## 7. Term Lifecycle

### 7.1 Lifecycle Stages

```
PROPOSED -> APPROVED -> ACTIVE -> DEPRECATED -> REMOVED

  PROPOSED:   Suggested by any team member. Under review.
  APPROVED:   Accepted by the terminology steward. Not yet in the product.
  ACTIVE:     In the product, in the termbase, in translations.
  DEPRECATED: Replaced by a new term. Old term still appears in legacy contexts.
              Product shows the new term; docs mention the old term for migration.
  REMOVED:    Old term no longer appears anywhere in the product.
```

### 7.2 Deprecation Protocol

When a term is deprecated:

1. **Add a termbase entry** marking it as deprecated with a pointer to the replacement.
2. **Update all string files** to use the new term. Run a project-wide search to catch
   every occurrence.
3. **Update documentation, help center, and API docs.** Add a note: "Formerly known
   as [old term]."
4. **Add a redirect** if the old term appeared in URLs.
5. **Keep the old term in search indexes** for 2 major versions. Users who learned the
   old term need to find the new one by searching the old one.
6. **Notify translators** that the old locale variants are deprecated and the new term
   needs translation.

### 7.3 Version Tracking

| Term       | v1.0     | v2.0        | v3.0     | Notes                     |
|------------|----------|-------------|----------|---------------------------|
| Project    | Active   | Deprecated  | Removed  | Replaced by "Workspace"   |
| Workspace  | --       | Active      | Active   | Replaced "Project"        |
| Flow       | --       | --          | Active   | New concept in v3.0       |
| Pipeline   | Active   | Active      | Deprecated| Replaced by "Flow" in v3 |

---

## 8. Glossary File Formats

### 8.1 Simple Format (Markdown)

For small teams and products with fewer than 100 terms:

```markdown
# Product Glossary

## Workspace
**Definition:** A top-level container for collections, members, and settings.
**Part of speech:** Noun
**Status:** Active (v2.0)
**Banned synonyms:** Project, environment, space
**Translations:** fr: espace de travail | de: Arbeitsbereich | ja: waaku supeesu
**Notes:** Always lowercase in UI copy unless at the start of a sentence.

## Collection
**Definition:** A group of related items within a workspace.
**Part of speech:** Noun
**Status:** Active (v1.0)
**Banned synonyms:** Folder, group, bucket
**Translations:** fr: collection | de: Sammlung | ja: korekushon
**Notes:** Never use "folder" -- it implies a filesystem metaphor.
```

### 8.2 Machine-Readable Format (TBX)

For integration with Translation Management Systems:

```xml
<termEntry id="workspace">
  <descrip type="definition">A top-level container for collections, members,
    and settings.</descrip>
  <descrip type="context">Navigation, settings, billing, API</descrip>
  <langSet xml:lang="en">
    <tig>
      <term>workspace</term>
      <termNote type="termType">canonical</termNote>
      <termNote type="administrativeStatus">preferredTerm-admn-sts</termNote>
    </tig>
    <tig>
      <term>project</term>
      <termNote type="termType">synonym</termNote>
      <termNote type="administrativeStatus">deprecatedTerm-admn-sts</termNote>
    </tig>
  </langSet>
  <langSet xml:lang="fr">
    <tig>
      <term>espace de travail</term>
      <termNote type="administrativeStatus">preferredTerm-admn-sts</termNote>
    </tig>
  </langSet>
</termEntry>
```

### 8.3 JSON Format

For integration with CI/CD and linting tools:

```json
{
  "workspace": {
    "definition": "A top-level container for collections, members, and settings.",
    "partOfSpeech": "noun",
    "status": "active",
    "since": "v2.0",
    "bannedSynonyms": ["project", "environment", "space"],
    "relatedTerms": ["collection", "team", "organization"],
    "translations": {
      "fr": "espace de travail",
      "de": "Arbeitsbereich",
      "ja": "waaku supeesu"
    },
    "notes": "Always lowercase in UI copy unless at start of sentence."
  }
}
```

---

## 9. Enforcement

### 9.1 Automated Enforcement

| Method                  | What it catches                             | When to run            |
|-------------------------|---------------------------------------------|------------------------|
| String file linter      | Banned synonyms in translation source files | CI on every PR         |
| Spell-check dictionary  | Unapproved terms in docs and UI             | CI on every PR         |
| TMS term check          | Translator deviation from approved terms    | During translation     |
| Search log analysis     | User confusion signals (search, no result)  | Monthly review         |
| PR review checklist     | New terms introduced without termbase entry | Code review            |

### 9.2 Linting Rule Example

A custom lint rule that flags banned synonyms in string files:

```javascript
// .glossary-lint.config.js
module.exports = {
  rules: [
    {
      term: "workspace",
      bannedSynonyms: ["project", "environment", "space"],
      message: "Use 'workspace' instead. See glossary: /docs/glossary.md#workspace"
    },
    {
      term: "deploy",
      bannedSynonyms: ["push", "ship", "release"],
      message: "Use 'deploy' for this action. See glossary: /docs/glossary.md#deploy"
    }
  ]
};
```

### 9.3 Human Enforcement

1. **Terminology steward.** Designate one person (usually a content designer or
   technical writer) as the owner of the glossary. They approve new terms, resolve
   conflicts, and coordinate with translation.
2. **PR review gate.** Any PR that introduces a new user-facing string gets reviewed
   for terminology compliance.
3. **Quarterly audit.** Review the glossary against the live product. Flag terms that
   have drifted or are no longer used.

---

## 10. Common Mistakes in AI-Generated Terminology

### 10.1 Synonym Drift

**The problem:** AI generates "workspace" in one component and "project space" in
another. Each generation draws from its training distribution without a canonical
glossary constraint.

**How to fix:** Include the glossary in the AI prompt context. Explicitly list
"canonical term: workspace. Banned synonyms: project, space, environment."

### 10.2 Inventing Branded Terms

**The problem:** AI creates novel branded terminology ("Acme SmartSync", "DataBridge
Pro") for features that should use generic, descriptive names.

**How to fix:** Unless the product strategy explicitly calls for branded feature names,
use descriptive terms. "Automatic sync" not "SmartSync."

### 10.3 Inconsistent Verb Tense

**The problem:** AI uses "Created" (past), "Creating" (present progressive), and
"Create" (imperative) for the same action across different screens.

**How to fix:** Define canonical verbs in the glossary with approved tense:
- Button: "Create" (imperative)
- Status: "Creating" (progressive) or "Created" (completed)
- Confirmation: "Created" (past)

### 10.4 Technical Leakage

**The problem:** AI surfaces internal terminology in user-facing copy: "The
reconciliation job failed" or "Null reference in user entity."

**How to fix:** Maintain a list of internal-only terms that must never appear in
user-facing strings. Add a lint rule to flag them.

---

## 11. Quick Reference Checklist

### Glossary Setup
- [ ] **Every product concept has exactly one canonical term**
- [ ] **Every term has a definition, status, and context**
- [ ] **Banned synonyms are listed for every canonical term**
- [ ] **Do-not-translate terms are explicitly marked**
- [ ] **Glossary is versioned alongside the product**

### Cross-Locale
- [ ] **Termbase provided to translators before translation starts**
- [ ] **Approved translations locked in the TMS**
- [ ] **In-locale reviewers validated the translations**
- [ ] **Untranslatable terms marked as DNT**

### Enforcement
- [ ] **String file linter checks for banned synonyms in CI**
- [ ] **PR review includes terminology check**
- [ ] **Quarterly audit scheduled**
- [ ] **Terminology steward designated**

### Lifecycle
- [ ] **New terms go through PROPOSED -> APPROVED -> ACTIVE**
- [ ] **Deprecated terms have a pointer to the replacement**
- [ ] **Old terms remain searchable for 2 major versions**
- [ ] **Docs and help center updated when terms change**

---

**Sources:**

- [ISO 704 -- Terminology Work: Principles and Methods](https://www.iso.org/standard/79077.html)
- [TBX (TermBase eXchange) -- ISO 30042](https://www.tbxinfo.net)
- [LISA -- Globalization Industry Best Practices](https://www.lisa.org)
- [Phrase -- Terminology Management](https://phrase.com/blog/posts/terminology-management/)
- [SDL MultiTerm -- Terminology Management](https://www.trados.com/products/multiterm/)
- [memoQ -- Terminology Guide](https://docs.memoq.com/current/en/Places/term-bases.html)
- [Google Developer Documentation Style Guide -- Word List](https://developers.google.com/style/word-list)
- [Microsoft Terminology -- Microsoft Style Guide](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/)
- [W3C -- Internationalization Best Practices for Terminology](https://www.w3.org/International/techniques/)
