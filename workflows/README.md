# workflows/

This directory holds canonical phase entrypoints and workflow contracts.

Allowed:

- phase workflows
- approval gate instructions
- canonical sequencing rules

Not allowed:

- host-specific command wrappers
- persisted orchestration state

Rules:

- Keep workflows semantically host-neutral.
- Export host-native wrappers from canonical workflow content.
