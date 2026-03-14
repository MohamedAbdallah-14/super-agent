# Directory Purpose

The `foundations` security directory details the core principles, frameworks, and processes required to establish a strong security posture.

# Key Concepts

- Shift-left security practices
- Robust identity and access management
- Securing the software supply chain

# File Map

- `authentication.md` — MFA, password hashing, and OAuth
- `authorization.md` — RBAC, ABAC, and zero-trust
- `cryptography.md` — hashes, salts, signatures, and modern standards
- `owasp-top-10.md` — mitigation strategies for the most critical web risks
- `secrets-management.md` — Vault, AWS Secrets Manager, avoiding hardcoded keys
- `secure-sdlc.md` — integrating security into CI/CD and planning
- `supply-chain-security.md` — dependency scanning, SBOMs, and signing commits

# Reading Guide

If designing a login system → read `authentication.md` and `authorization.md`
If setting up a new repository → read `supply-chain-security.md` and `secrets-management.md`
If unfamiliar with general app security → read `owasp-top-10.md`