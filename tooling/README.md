# tooling/

This directory holds the minimal local glue that supports the host-native SuperAgent kit.

Allowed:

- export compiler
- validators
- capture/status/doctor commands
- index and recall tooling

Not allowed:

- long-running servers
- dashboards
- runtime control planes

Rules:

- Tooling must stay small, auditable, and justified by the operating model.
