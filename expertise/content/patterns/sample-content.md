# Sample Content Patterns

> **Module Type:** Pattern
> **Domain:** Content -- Test Data, Fixtures, and Placeholder Content
> **Authoritative Sources:** NIST Test Data Guidelines, Unicode CLDR, ICU Project, OWASP Testing Guide, Inclusive Design Principles, W3C Internationalization Best Practices

---

## Quick Reference Checklist

1. Never use real user data (names, emails, addresses) in test fixtures
2. Sample names represent diverse cultural backgrounds and naming conventions
3. Every text field has edge case fixtures: empty, single char, max length, Unicode, RTL, emoji
4. Sample data uses realistic domain values (not "test123" or "foo bar")
5. Numeric fixtures include zero, negative, boundary values, and locale-specific formatting
6. Date fixtures span time zones, DST transitions, leap years, and locale formats
7. Currency fixtures include multiple currencies with correct symbols and decimal rules
8. Address fixtures cover international formats (not just US-centric)
9. Fixture files are deterministic and version-controlled (never random in CI)
10. Placeholder text in UI previews uses realistic content, not Lorem Ipsum
11. Avatar/profile image fixtures include diverse representation
12. Sample content avoids stereotypes tied to names, genders, or ethnicities
13. Email fixtures test domain validation edge cases (subdomains, new TLDs, IDN)
14. Phone fixtures include international formats with country codes
15. Fixture data sets include both typical values and boundary stress cases

---

## 1. Realistic Name Generation

Names in sample data should reflect the global diversity of users. Using only English-language names biases testing and creates blind spots for internationalization.

### 1.1 Name Fixtures by Region

| Region | Given Name | Family Name | Notes |
|--------|-----------|-------------|-------|
| English (US/UK) | James, Maria, Aisha | Thompson, Patel, Kim | Common cross-cultural names in English-speaking countries |
| Spanish (Latin America) | Carlos, Valentina, Luis | Garcia Rodriguez, Fernandez | Compound surnames (paternal + maternal) |
| Chinese (Simplified) | Wei (given) | Zhang (family) | Family name FIRST: Zhang Wei. Given names are 1-2 characters |
| Chinese (Traditional) | Mei-Ling (given) | Chen (family) | Hyphenated given names common in Taiwanese naming |
| Japanese | Yuki (given) | Tanaka (family) | Family name first in Japanese context; reversed in Western context |
| Korean | Jisoo (given) | Park (family) | Family name first: Park Jisoo. Romanization varies |
| Arabic | Fatima (given) | Al-Rashid (family) | "Al-" prefix common. Some names have patronymic chains |
| Hindi | Priya (given) | Sharma (family) | Some South Asian names have no family name, using a single name |
| Russian | Alexei (given) | Petrov (family) | Patronymic middle name: Alexei Ivanovich Petrov |
| Nigerian (Yoruba) | Adunni (given) | Okafor (family) | Many Nigerian names carry meaning; varied ethnic naming conventions |
| German | Lukas, Anna | Muller, Schmidt | Umlauts: Muller or Mueller both valid romanizations |
| Thai | Somchai (given) | Charoenphon (family) | Very long family names are common; nicknames used daily |
| Brazilian | Joao, Beatriz | Silva, Santos | Maternal + paternal surname: Joao Silva Santos |

### 1.2 Naming Convention Edge Cases

| Edge Case | Example | Why It Matters |
|-----------|---------|---------------|
| Single name (mononym) | "Sukarno" | Some cultures use one name. Fields that require "first + last" will break |
| Very long names | "Wolfeschlegelsteinhausenbergerdorff" | 35+ char surnames exist. Test field truncation and display |
| Hyphenated names | "Mary-Jane Watson-Parker" | Both given and family names can be hyphenated |
| Prefixes and particles | "Ludwig van Beethoven", "Fatima bint Ahmed" | "van", "de", "al-", "bin/bint" are name particles, not middle names |
| Suffixes | "James Smith Jr.", "Robert Brown III" | Jr., Sr., III, IV are part of the legal name |
| Diacritics | "Renee", "Bjork", "Nuno" | Accented characters must be stored and displayed correctly |
| Non-Latin scripts | "Sato Yuki", "Zhang Wei", "Ahmed" | UI must render CJK, Arabic, Cyrillic, Devanagari correctly |
| Preferred/chosen name | Legal: "Robert"; preferred: "Bobby" | Systems should support display name separate from legal name |
| Title/honorific | "Dr.", "Prof.", "Mx." | Gender-neutral honorifics (Mx.) must be supported |

### 1.3 Name Generation Rules

1. **Never pair names with stereotypical roles.** Don't make "Maria" always the assistant and "James" always the CEO.
2. **Rotate names across roles** in fixture data. If generating a team, vary the cultural backgrounds in every role.
3. **Include gender-neutral names.** Alex, Sam, Jordan, Taylor, Avery work across genders.
4. **Test sorting.** Names with particles ("van Gogh") sort differently across locales. "Al-Rashid" may sort under "A" or "R".
5. **Avoid famous names.** "John Smith" is acceptable; "Elon Musk" or "Taylor Swift" is not -- it creates confusion about whether real data leaked.

---

## 2. Domain-Appropriate Data

Sample data should be realistic for the domain. Generic "test" values don't reveal real-world issues.

### 2.1 Common Domain Fixtures

**E-commerce:**

| Field | Realistic Values |
|-------|-----------------|
| Product name | "Merino Wool Crew Sock, 3-Pack" / "USB-C to Lightning Cable, 2m" |
| Price | $0.99, $29.99, $1,249.00, $9,999.99 |
| SKU | "MWS-BLK-L-3PK" / "USBC-LTN-2M-WHT" |
| Description | 150-300 word product description with specs and features |
| Category | "Clothing > Socks > Wool" (nested hierarchy) |

**SaaS / Project Management:**

| Field | Realistic Values |
|-------|-----------------|
| Project name | "Q3 Marketing Campaign" / "Mobile App Redesign" |
| Task title | "Update error handling in payment flow" / "Review accessibility audit" |
| Status | "To Do" / "In Progress" / "In Review" / "Done" |
| Priority | "Critical" / "High" / "Medium" / "Low" |
| Comment | "Looks good overall, but the loading state needs a skeleton screen." |

**Healthcare (anonymized):**

| Field | Realistic Values |
|-------|-----------------|
| Patient ID | "P-2024-00847" (never real identifiers) |
| Condition | "Type 2 Diabetes Mellitus" / "Seasonal Allergic Rhinitis" |
| Medication | "Metformin 500mg, twice daily" |
| Appointment | "Follow-up: Dr. Patel, March 20, 2025, 2:30 PM" |

**Finance:**

| Field | Realistic Values |
|-------|-----------------|
| Transaction | "Wire Transfer - Invoice #INV-2024-0312" |
| Amount | "$4,287.50" / "-$150.00" / "$0.01" (minimum) |
| Account | "****4832" (masked, last 4 digits) |
| Currency | "USD", "EUR", "GBP", "JPY" (no decimals), "BHD" (3 decimals) |

### 2.2 Avoid Placeholder Syndrome

| Bad (lazy placeholders) | Good (realistic content) |
|------------------------|-------------------------|
| "Test Project" | "Website Redesign Sprint 4" |
| "Lorem ipsum dolor sit amet" | "Track team progress with real-time dashboards." |
| "user@test.com" | "priya.sharma@acmedesign.co" |
| "123 Main St" | "42 Rue de Rivoli, 75001 Paris, France" |
| "John Doe" | "Yuki Tanaka" |
| "$100.00" | "$2,847.50" |

Lazy placeholders hide real issues: layout breaks with longer strings, encoding issues with special characters, and formatting problems with realistic numeric values.

---

## 3. Edge Cases

Every text input, numeric field, and data display must be tested against edge cases. These are the values that break production systems.

### 3.1 String Edge Cases

| Category | Test Value | What It Catches |
|----------|-----------|----------------|
| Empty | `""` | Missing null/empty checks, blank renders |
| Single character | `"A"` | Layout issues with very short content |
| Max length | 255 chars, 1000 chars, 65535 chars | Truncation, overflow, DB column limits |
| Max display | String longer than container width | CSS overflow handling |
| Special chars | `"O'Brien"`, `"Smith & Jones"`, `"<script>alert(1)</script>"` | SQL injection, XSS, HTML entity encoding |
| Unicode | `"Renee Muller"` (accented), `"Sato Yuki"` (CJK) | Character encoding, font rendering |
| RTL text | Arabic text, Hebrew text | Bidirectional text layout, alignment |
| Mixed direction | `"Hello Arabic Text world"` (embedded RTL in LTR) | BiDi algorithm handling |
| Emoji | `"Project Rocket Launch"` | Rendering, string length calculation (emoji = 2+ code points) |
| Zero-width chars | `"test\u200Bvalue"` (zero-width space) | Invisible characters in user input |
| Whitespace | `"  leading"`, `"trailing  "`, `"multiple   spaces"` | Trim handling, display |
| Newlines | `"line1\nline2"` | Single-line fields accepting multiline input |
| SQL/NoSQL injection | `"'; DROP TABLE users;--"` | Query parameterization |
| Path traversal | `"../../etc/passwd"` | File path handling |
| Null bytes | `"test\x00value"` | C-string termination in some languages |

### 3.2 Numeric Edge Cases

| Category | Test Value | What It Catches |
|----------|-----------|----------------|
| Zero | `0` | Division by zero, "falsy" checks, display of "$0.00" |
| Negative | `-1`, `-0.01` | Unexpected negatives in quantity, price, balance |
| Very large | `999999999`, `Number.MAX_SAFE_INTEGER` | Overflow, display formatting |
| Very small | `0.001`, `0.0001` | Decimal precision, rounding |
| Decimal edge | `0.1 + 0.2` (= 0.30000000000000004) | Floating point arithmetic |
| NaN | `NaN`, `parseInt("abc")` | Not-a-number propagation |
| Infinity | `1/0` | Infinity in calculations |
| Locale-specific | `1.234,56` (German) vs `1,234.56` (US) | Decimal/thousands separators |

### 3.3 Date and Time Edge Cases

| Category | Test Value | What It Catches |
|----------|-----------|----------------|
| Midnight | `00:00:00` | Off-by-one in date boundaries |
| End of day | `23:59:59` | Same |
| Leap year | `2024-02-29` | February 29 handling |
| Non-leap year | `2025-02-29` (invalid) | Validation of impossible dates |
| DST spring forward | `2025-03-09 02:30 America/New_York` | Missing hour |
| DST fall back | `2025-11-02 01:30 America/New_York` | Ambiguous hour |
| Year boundary | `2024-12-31` to `2025-01-01` | Year rollover in calculations |
| Far future | `2099-12-31` | Date range validation |
| Epoch | `1970-01-01T00:00:00Z` | Timestamp zero handling |
| Pre-epoch | `1969-12-31` | Negative timestamps |
| Time zones | `+14:00` (Line Islands) to `-12:00` (Baker Island) | Full UTC offset range |
| ISO 8601 | `2025-03-14T10:30:00+05:30` | IST (India, UTC+5:30, half-hour offset) |

### 3.4 File and Media Edge Cases

| Category | Test Value | What It Catches |
|----------|-----------|----------------|
| Zero-byte file | Empty file | Upload validation, processing |
| Very large file | 2GB+ | Upload limits, memory handling |
| Long filename | 255 characters | OS path limits, display truncation |
| Special chars in name | `"file (1) [final].pdf"` | URL encoding, filesystem safety |
| Double extension | `"image.jpg.exe"` | Security: executable masquerading |
| No extension | `"Makefile"` | MIME type detection without extension |
| Unicode filename | `"Bericht.pdf"` | Filesystem encoding |
| Corrupt file | Valid extension, corrupt content | Error handling during processing |

---

## 4. Fixture Strategy

Fixtures are pre-defined data sets used consistently across tests, demos, and development environments.

### 4.1 Fixture Tiers

| Tier | Purpose | Data Volume | Content Quality |
|------|---------|-------------|----------------|
| **Unit test** | Test individual functions | Minimal (1-5 records) | Edge cases and boundaries |
| **Integration test** | Test system interactions | Moderate (20-100 records) | Realistic variety |
| **Staging/demo** | Show to stakeholders, QA | Full (500-5000 records) | Production-like realism |
| **Performance test** | Load and stress testing | Large (10K-1M records) | Varied but can be generated |
| **E2E test** | User journey testing | Moderate (50-200 records) | Matches real user patterns |

### 4.2 Fixture Principles

1. **Deterministic.** Fixtures produce the same data every time. No `Math.random()` or `Date.now()` in CI fixtures. Use seeded random generators for variety.
2. **Version-controlled.** Fixture files live in the repository alongside tests. Changes are tracked.
3. **Self-contained.** Fixtures don't depend on external services, databases, or APIs.
4. **Documented.** Each fixture file has a header comment explaining its purpose and the scenarios it covers.
5. **Minimal.** Each fixture contains the minimum data needed for its test scenario. Don't reuse a 500-record fixture for a unit test.
6. **Realistic.** Use real-world patterns (not "test1," "test2"). Realistic data reveals real-world bugs.

### 4.3 Fixture File Patterns

**JSON fixtures:**
```json
{
  "_description": "Team members with diverse naming conventions",
  "members": [
    {
      "id": "usr_001",
      "name": "Priya Sharma",
      "email": "priya.sharma@acmedesign.co",
      "role": "admin",
      "locale": "en-IN"
    },
    {
      "id": "usr_002",
      "name": "Zhang Wei",
      "email": "zhang.wei@acmedesign.co",
      "role": "member",
      "locale": "zh-CN"
    },
    {
      "id": "usr_003",
      "name": "Bjork Sigurdsson",
      "email": "bjork.s@acmedesign.co",
      "role": "member",
      "locale": "is-IS"
    }
  ]
}
```

**Factory pattern (code):**
```
createUser({ name: "Fatima Al-Rashid", locale: "ar-SA" })
createUser({ name: "Carlos Garcia Rodriguez", locale: "es-MX" })
createUser({ name: "Tanaka Yuki", locale: "ja-JP" })
```

### 4.4 Seeded Random Generation

For performance tests and large data sets, use seeded pseudo-random generators.

```
seed = 42
random = new SeededRandom(seed)  // Same sequence every time

// Produces the same "random" data on every run
name = random.pick(namePool)
email = random.pick(domainPool)
date = random.dateInRange(start, end)
```

**Rule:** Never use unseeded randomness in CI. Flaky tests caused by random data waste engineering time and erode trust in the test suite.

---

## 5. Bias Avoidance

Sample data carries implicit messages about who uses the product. Biased sample data normalizes exclusion and can cause real harm by hiding bugs that affect underrepresented users.

### 5.1 Common Biases in Sample Data

| Bias | Example | Fix |
|------|---------|-----|
| **Name homogeneity** | All names are English-language | Include names from at least 5 cultural backgrounds |
| **Gender binary** | Only "Male" / "Female" options | Include non-binary, prefer-not-to-say, custom |
| **Western-centric addresses** | All addresses are US format | Include international formats (no state, postal code varies) |
| **Role stereotyping** | Female names always in junior roles | Randomly distribute names across all roles |
| **Age assumptions** | All birthdates suggest ages 25-40 | Include ages 18-80+ |
| **Ability assumptions** | No accessibility-related scenarios | Include screen reader users, mobility-impaired users |
| **Currency bias** | All amounts in USD | Include EUR, JPY (no decimals), BHD (3 decimals) |
| **Calendar bias** | Only Gregorian calendar | Test Islamic, Hebrew, Japanese calendar formats |
| **Working hours bias** | All times between 9-5 in one timezone | Include global time zones and non-standard schedules |

### 5.2 Representation Guidelines

1. **Minimum 5 cultural backgrounds** in any fixture set with 10+ names.
2. **No gendered assumptions** about roles. Rotate names across all role types.
3. **Include RTL names** (Arabic, Hebrew) in every fixture set to catch layout issues.
4. **Include names with diacritics** to catch encoding issues early.
5. **Include mononyms** (single names) to catch required-field assumptions.
6. **Avoid stereotypical pairings.** Don't always pair Japanese names with "Tokyo" addresses or Arabic names with "Dubai."
7. **Review fixtures during code review** -- biased data is a bug, just like biased code.

### 5.3 Inclusive Fixture Checklist

- [ ] Names from 5+ cultural backgrounds
- [ ] At least one mononym (single name)
- [ ] At least one name with diacritics or non-Latin characters
- [ ] At least one RTL name
- [ ] Gender-neutral names included
- [ ] Roles and seniority levels randomly distributed across names
- [ ] Addresses from 3+ countries with different formats
- [ ] Dates in multiple locale formats tested
- [ ] Currencies beyond USD included
- [ ] Age range spans 18-80+

---

## 6. Cultural Sensitivity

Sample data must avoid cultural offense, stereotypes, and insensitivity. What seems neutral in one culture may be offensive in another.

### 6.1 Rules

1. **No religious content** in sample data. Avoid religious texts, symbols, or holidays as default fixture values.
2. **No political content.** Avoid political figures, parties, or controversial events.
3. **No profanity or suggestive content,** even as "test" values. These show up in demos and screenshots.
4. **Avoid culture-specific humor.** Jokes, puns, and wordplay don't translate and can offend.
5. **Neutral imagery.** Stock photos and avatars should represent diverse ethnicities, ages, abilities, and body types without tokenism.
6. **Number sensitivity.** 4 is unlucky in East Asian cultures; 13 in Western cultures. Avoid these as default quantities in demos.
7. **Color sensitivity.** Red means danger in Western cultures but luck in Chinese culture; white means purity in Western but mourning in some East Asian cultures. Don't use culturally loaded colors in sample data visualization without context.
8. **Name meaning awareness.** Some names carry strong cultural or religious meaning. Avoid pairing meaningful names with trivial or inappropriate contexts.

### 6.2 Content Review Checklist

- [ ] No real personal data (names, emails, phone numbers of actual people)
- [ ] No content that could be mistaken for real data in screenshots or demos
- [ ] No stereotypical associations between names and roles/locations
- [ ] No cultural, religious, or political references
- [ ] No profanity, even in "hidden" test values or comments
- [ ] Placeholder images use inclusive, diverse representation
- [ ] Content reviewed by someone from a different cultural background

---

## 7. Internationalization Test Data

Sample data must test i18n edge cases that break applications in non-English locales.

### 7.1 Text Direction

| Direction | Languages | Test String |
|-----------|----------|-------------|
| LTR | English, French, German, etc. | "Hello, world" |
| RTL | Arabic, Hebrew, Urdu, Persian | Arabic text or Hebrew text |
| Mixed (BiDi) | Arabic + English | "Order #12345 Arabic text" |
| Vertical | Traditional Chinese, Japanese (rare in UI) | Typically handled by CSS `writing-mode` |

### 7.2 Number and Currency Formatting

| Locale | Number | Currency |
|--------|--------|----------|
| en-US | 1,234.56 | $1,234.56 |
| de-DE | 1.234,56 | 1.234,56 EUR |
| fr-FR | 1 234,56 | 1 234,56 EUR (narrow no-break space) |
| ja-JP | 1,234 | 1,234 JPY (no decimals) |
| ar-SA | Arabic numerals 1,234.56 | 1,234.56 SAR |
| hi-IN | 1,23,456.78 | INR 1,23,456.78 (lakh/crore grouping) |
| en-BH | 1,234.567 | BHD 1,234.567 (3 decimal places) |

### 7.3 Date and Time Formatting

| Locale | Date Format | Example |
|--------|------------|---------|
| en-US | MM/DD/YYYY | 03/14/2025 |
| en-GB | DD/MM/YYYY | 14/03/2025 |
| de-DE | DD.MM.YYYY | 14.03.2025 |
| ja-JP | YYYY/MM/DD | 2025/03/14 |
| zh-CN | YYYY year MM month DD day | 2025 year 3 month 14 day |
| ar-SA | DD/MM/YYYY (Hijri calendar) | Different year numbering |
| ISO 8601 | YYYY-MM-DD | 2025-03-14 |

### 7.4 Address Formats

| Country | Format |
|---------|--------|
| US | 123 Main Street, Apt 4B / San Francisco, CA 94102 |
| UK | 42 Baker Street / London W1U 8ED |
| Japan | postal code 100-0001 / Tokyo-to, Chiyoda-ku, specific address |
| Germany | Musterstr. 42 / 10115 Berlin |
| Brazil | Rua Example, 123, Apt 456 / Sao Paulo - SP / 01310-100 |
| South Korea | Specific district/street format / Seoul |
| No postal code | Some countries have no postal code system |
| No state/province | Many countries have only city + postal code |

---

## 8. Anti-Patterns

### 8.1 Lorem Ipsum in Production

Lorem Ipsum hides real content issues: line wrapping, truncation, and readability. **Fix:** Use realistic content that matches actual usage length and vocabulary.

### 8.2 "test123" Values

Generic test values don't reveal real bugs. "test@test.com" won't catch domain validation issues. **Fix:** Use realistic, varied email domains including subdomains and new TLDs.

### 8.3 Same Name Everywhere

Using "John Doe" for every fixture person. Doesn't test name length variations, character encoding, or cultural formats. **Fix:** Diverse fixture name pool (see Section 1).

### 8.4 US-Only Addresses

Only testing US address formats hides international format issues. **Fix:** Include addresses from 5+ countries with different postal code and state/province conventions.

### 8.5 Random Data in CI

Using `Math.random()` or `faker` without a seed. Tests pass sometimes and fail sometimes. **Fix:** Seed every random generator. Same seed = same data = reproducible tests.

### 8.6 Real User Data in Fixtures

Copying production data into test fixtures. Privacy violation, potential legal liability. **Fix:** Generate synthetic data. Never export production PII into version-controlled fixture files.

### 8.7 Missing Edge Cases

Only testing the happy path with "normal" data. Production users will enter empty strings, 500-character names, and emoji. **Fix:** Every fixture set includes edge cases from Section 3.

### 8.8 Hardcoded English

Fixture data assumes English. Buttons say "Submit," dates say "March 14," and currency uses "$." **Fix:** Include locale-specific fixtures. Test with at least one RTL and one CJK locale.

---

## 9. Decision Tree

### 9.1 Choosing Fixture Strategy

```
What level of test is this for?
+-- Unit test
|   --> Minimal inline fixtures. 1-3 records. Focus on edge cases.
+-- Integration test
|   --> JSON/YAML fixture files. 20-100 records. Realistic variety.
+-- E2E test
|   --> Seeded database. 50-200 records. Matches real user patterns.
+-- Performance test
|   --> Generated via seeded factory. 10K-1M records.
+-- Demo / staging
    --> Curated data set. 500-5000 records. Production-like quality.
```

### 9.2 Choosing Sample Names

```
How many names do you need?
+-- 1-3 --> Pick from different cultural backgrounds
+-- 4-10 --> Include at least 3 cultural backgrounds + 1 edge case (mononym, diacritics)
+-- 10+ --> Include 5+ backgrounds, RTL, diacritics, mononyms, compound surnames
|
Is this user-facing (demo, screenshot)?
+-- YES --> Extra care: no stereotypes, diverse roles, neutral content
+-- NO (test only) --> Still diverse, but edge cases take priority
```

---

## References

- [Unicode CLDR - Common Locale Data Repository](https://cldr.unicode.org/)
- [ICU - International Components for Unicode](https://icu.unicode.org/)
- [W3C - Internationalization Best Practices](https://www.w3.org/International/)
- [OWASP - Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [NIST - Test Data Management](https://www.nist.gov/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.info/)
- [Microsoft - Inclusive Design](https://inclusive.microsoft.design/)
- [Faker.js Documentation](https://fakerjs.dev/)
- [British Dyslexia Association - Style Guide](https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide)
- [Unicode BiDi Algorithm](https://unicode.org/reports/tr9/)
- [GDPR - Data Protection](https://gdpr.eu/)
