# Installation

SuperAgent installation is package-oriented.

## Core repo setup

1. Install dependencies:
   - `npm install`
2. Validate canonical sources:
   - `superagent validate manifest`
   - `superagent validate hooks`
   - `superagent validate docs`
3. Build host packages:
   - `superagent export build`
4. Check drift before release or commit:
   - `superagent export --check`

## Optional state-root overrides

When testing indexing, recall, or status flows, you can keep state outside the default location:

- `superagent index build --state-root <path>`
- `superagent index refresh --state-root <path>`
- `superagent recall file ... --state-root <path>`
- `superagent status --run <id> --state-root <path>`

## Runtime model

The host environment is the execution container. SuperAgent provides the operating model, guardrails, exports, and tooling. There are no background processes or services to manage.
