# Directory Purpose

The `testing` security directory outlines methodologies for identifying and validating vulnerabilities before and after deployment.

# Key Concepts

- Identifying architectural flaws early
- Automating vulnerability detection
- Conducting manual security audits

# File Map

- `penetration-testing.md` — red teaming, bug bounties, and external audits
- `security-code-review.md` — SAST, identifying logic flaws, and taint analysis
- `threat-modeling.md` — STRIDE, DREAD, and attack surface mapping
- `vulnerability-scanning.md` — DAST, dependency checks, and continuous scanning

# Reading Guide

If starting a new major feature → read `threat-modeling.md`
If reviewing a pull request → read `security-code-review.md`
If configuring a CI pipeline → read `vulnerability-scanning.md`