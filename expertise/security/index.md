# Directory Purpose

The `security` directory acts as the central hub for defensive coding practices, vulnerability mitigation, and ensuring systems are secure by design.

# Key Concepts

- Adhering to the principle of least privilege
- Protecting sensitive data at rest and in transit
- Hardening applications against common attack vectors
- Implementing secure development lifecycles

# File Map

- `PROGRESS.md` — tracks completion of security content
- `index.md` — semantic map of the security directory

# Subdirectories

- `/data` — encryption, privacy (GDPR), and PII handling
- `/foundations` — OWASP, IAM, SDLC, and supply chain
- `/infrastructure` — cloud, container, network, and logging
- `/mobile` — binary protection, secure storage, and OS specifics
- `/testing` — threat modeling, pentesting, and scanning
- `/web` — XSS, CSRF, CORS, injection, and API security

# Reading Guide

If designing a new feature → read `/testing/threat-modeling.md`
If building a web API → read `/web`
If configuring a database → read `/data`
If deploying to the cloud → read `/infrastructure`