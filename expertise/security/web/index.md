# Directory Purpose

The `web` security directory provides specific mitigation strategies for attacks targeting browsers and HTTP APIs.

# Key Concepts

- Validating and sanitizing input
- Securing the browser context
- Managing HTTP state safely

# File Map

- `api-security.md` — rate limiting, IDOR prevention, and input validation
- `cors-and-headers.md` — Content-Security-Policy, HSTS, and origin checks
- `csrf.md` — SameSite cookies, anti-CSRF tokens, and state mutation
- `file-upload.md` — malware scanning, size limits, and safe storage
- `injection.md` — preventing SQL, NoSQL, and Command injection
- `session-management.md` — JWTs vs Cookies, expiration, and revocation
- `xss.md` — context-aware encoding, DOMpurify, and avoiding innerHTML

# Reading Guide

If handling user input → read `xss.md` and `injection.md`
If configuring a web server → read `cors-and-headers.md`
If building user login/state → read `session-management.md` and `csrf.md`