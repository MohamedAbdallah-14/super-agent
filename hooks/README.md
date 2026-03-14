# hooks/

This directory holds canonical hook definitions and hook-related documentation.

Allowed:

- canonical hook definitions
- hook guard rules
- capture and observability behavior

Not allowed:

- host-only ad hoc scripts without canonical definitions

Rules:

- Canonical hook definitions validate against the hook schema.
- Host exports map from this layer to native hooks or wrapper fallbacks.
