# Directory Purpose

The `security` antipatterns directory focuses on common vulnerabilities, dangerous security assumptions, and mismanagement of sensitive data.

# Key Concepts

- Genuine security vs Security theater
- Handling sensitive credentials
- Identifying common attack vectors

# File Map

- `secrets-antipatterns.md` — hardcoded keys, unencrypted configs
- `security-theater.md` — arbitrary password rules, hiding errors instead of fixing
- `vulnerability-patterns.md` — common implementation flaws leading to XSS/SQLi

# Reading Guide

If reviewing configuration → read `secrets-antipatterns.md`
If performing a security audit → read `vulnerability-patterns.md`