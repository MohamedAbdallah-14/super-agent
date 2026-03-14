# Directory Purpose

The `data` security directory establishes rules for protecting sensitive information, complying with privacy laws, and securing storage layers.

# Key Concepts

- Data anonymization and masking
- Managing Personally Identifiable Information (PII)
- Applying cryptographic standards

# File Map

- `data-encryption.md` — AES, RSA, key rotation, and encryption at rest
- `data-privacy-gdpr.md` — consent, right to be forgotten, and privacy by design
- `database-security.md` — row-level security, least privilege roles, and audits
- `pii-handling.md` — tokenization, masking, and safe logging of user data

# Reading Guide

If designing a schema containing user data → read `pii-handling.md`
If storing passwords or tokens → read `data-encryption.md`
If configuring database access → read `database-security.md`